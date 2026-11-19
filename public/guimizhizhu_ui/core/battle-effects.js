(() => {
  'use strict';
  const KEY = 'cryptLord.battleEffects';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleEffectReference'];
  if (!reference) throw Error('持续效果缺少原版效果管理器。');
  const attributes = reference.create().attributes;
  const currents = { 当前活力: 'hp', 当前敏捷: 'agility', 当前灵性: 'spirit',
    当前理智: 'sanity', 当前人性: 'humanity' };
  const maxima = { 活力: 'maxHp', 敏捷: 'maxAgility', 灵性: 'maxSpirit',
    理智: 'maxSanity', 人性: 'maxHumanity', 运气: 'maxLuck' };
  const modifiers = ['attack', 'defense', 'speed', 'movement', 'damageDealtIncrease',
    'damageDealtDecrease', 'damageTakenIncrease', 'damageTakenDecrease'];
  const timings = ['turn_start', 'turn_end', 'round_end'];
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const managed = effect => effect.skillEffect || effect.exilePoison ||
    effect.fieldEffect && ['poison', 'regen'].includes(effect.type);
  function initialize(battle) {
    if (battle.effectLifecycle?.version !== undefined && battle.effectLifecycle.version !== 1)
      throw Error('持续效果存档版本不可识别。');
    battle.effectLifecycle ||= { version: 1, turns: {} };
    battle.effectLifecycle.turns = Object.assign(Object.create(null), battle.effectLifecycle.turns);
  }
  function hero(actor, selected = false) {
    const baseStats = actor.baseAttributes || Object.fromEntries(Object.entries(maxima)
      .map(([name, field]) => [name, actor[field] ?? (name === '运气' ? actor.luck ?? 0 : 0)]));
    const additionalStats = {};
    for (const [name, field] of Object.entries({ ...currents, ...maxima }))
      Object.defineProperty(additionalStats, name, { enumerable: true,
        get: () => actor[field] ?? 0, set: value => {
          actor[field] = value;
          if (name === '运气') actor.luck = value;
        } });
    let selectedEffects = selected ? (actor.effects || []).filter(managed) : null;
    const out = { unit: actor, name: actor.name, heroId: actor.id,
      sequenceRank: actor.rank, additionalStats, baseStats };
    Object.defineProperty(out, 'effects', {
      get: () => selected ? selectedEffects : actor.effects || (actor.effects = []),
      set: value => {
        if (selected) {
          const previous = new Set(selectedEffects);
          actor.effects = (actor.effects || []).filter(effect => !previous.has(effect)).concat(value);
          selectedEffects = value;
        } else actor.effects = value;
      },
    });
    for (const key of ['health', 'currentHealth'])
      Object.defineProperty(out, key, { get: () => actor.hp, set: value => { actor.hp = value; } });
    return out;
  }
  function recalculate(actor) {
    actor.baseAttributes ||= hero(actor).baseStats;
    attributes.recalculateAllSixDimStats(hero(actor));
  }
  function logger(battle, message, details = {}) {
    battle.log ||= [];
    battle.log.push({ at: Date.now(), round: battle.round, effectEvent: true,
      message: String(message), ...details });
    if (battle.log.length > 160) battle.log.shift();
  }
  function runtime(battle) {
    const errors = [];
    const tags = modules['cryptLord.battleTags'];
    const tagManager = tags && {
      calculateTagDamageModifier: (a, b, skill) => tags.analyze(a.unit, b.unit, skill,
        battle.tagRules?.damage || {}).modifier,
      calculateTagHealingModifier: (a, b, skill) => tags.analyze(a.unit, b.unit, skill,
        battle.tagRules?.healing || {}, 'healing').modifier,
    };
    const rules = reference.create({ window: { tagManager },
      console: { log() {}, warn() {}, error: (...items) => errors.push(items.map(item =>
        item instanceof Error ? item.message : String(item)).join(' ')) },
      attributes: { recalculateAllSixDimStats: view => recalculate(view.unit) },
      control: { markDamaged: (_bm, view) =>
        modules['cryptLord.battlePermanentControl']?.markDamaged(battle, view.unit, 1) },
      transfer: {
        isTransferableEffect: () => false,
        applyResolvedLoss: (_bm, view, stat, amount, context) =>
          modules['cryptLord.battleEffectTransfer']?.loss(battle, view.unit, stat, amount, context),
      },
    });
    rules.manager.battleManager = battle;
    rules.errors = errors;
    rules.turn.battleManager = { effectManager: rules.manager,
      battleLogger: { log: message => logger(battle, message,
        { reportHandled: Boolean(battle.reportState) }) },
      battleReporter: battle.reportState ? {
        logEffectTrigger: (view, name, message) =>
          modules['cryptLord.battleReport']?.trigger(battle, view.unit, name, message),
      } : null };
    const slot = modules['cryptLord.battleExtraAction']?.currentSlot(battle);
    rules.turn.isExtraSlot = () => slot?.extra === true;
    rules.turn.currentSlotCfg = () => slot?.cfg || {};
    return rules;
  }
  function valid(raw, actor) {
    if (!record(raw) || typeof raw.name !== 'string' || !raw.name.trim() ||
      !['buff', 'debuff', 'poison', 'regen'].includes(raw.type)) return false;
    const stat = raw.stat ?? (['poison', 'regen'].includes(raw.type) ? '当前活力' : null);
    if (['poison', 'regen'].includes(raw.type) ? !Object.hasOwn(currents, stat)
      : !Object.hasOwn(maxima, stat) && !modifiers.includes(stat)) return false;
    if (raw.duration !== undefined && (!finite(raw.duration) || raw.duration < 1 || raw.duration > 99) ||
      raw.priority !== undefined && !finite(raw.priority) ||
      raw.modifier !== undefined && !finite(raw.modifier)) return false;
    const power = record(raw.power) ? raw.power[actor?.rank] ?? raw.power.default ?? raw.power['9'] ?? 0
      : raw.power ?? (raw.modifier ?? 0) * 100;
    return finite(power) && power >= 0;
  }
  function apply(battle, actor, target, raw, skill = {}, passive = false) {
    initialize(battle);
    if (!actor || !target || !valid(raw, actor)) return false;
    const rules = runtime(battle);
    // Resolve on a detached hero once; redistribution must not reapply caster tag modifiers.
    const detached = structuredClone(target);
    detached.effects = [];
    const source = hero(actor), probe = hero(detached);
    const result = rules.manager.applyEffect(probe, { ...raw,
      stat: raw.stat ?? (['poison', 'regen'].includes(raw.type) ? '当前活力' : null) }, source, skill);
    if (!result.applied) return false;
    if (rules.errors.length) throw Error(`效果施加失败：${rules.errors.join('；')}`);
    const instance = probe.effects[0];
    Object.assign(instance, { skillEffect: true, passive });
    if (passive && (skill.$放牧来源 || skill.$空想来源 || skill.$秘术投影 || skill.$神秘再现投影))
      instance.pathwayProjectionPassive = true;
    const store = (recipient, effect) => {
      const outcome = rules.manager.storeResolvedEffect(hero(recipient), effect);
      if (outcome.applied || outcome.replaced || outcome.refreshed)
        modules['cryptLord.battleReport']?.effect(battle, actor, recipient, effect);
      return outcome;
    };
    const transfer = modules['cryptLord.battleEffectTransfer'];
    if (battle.effectTransferMeta && !transfer) throw Error('持续效果缺少效果传递模块。');
    if (transfer && battle.effectTransferMeta) return transfer.routeEffect(battle, target, instance, {
      transferableExternal: !passive, sourceLabel: `${actor.name}的「${skill.名称 || skill.name || ''}」`,
      sourceKind: '技能负效',
    }, store);
    const outcome = store(target, instance);
    return Boolean(outcome.applied || outcome.replaced || outcome.refreshed);
  }
  function store(battle, actor, target, instance) {
    initialize(battle);
    if (!target || !valid(instance, actor) || !finite(instance.power)) return false;
    const result = runtime(battle).manager.storeResolvedEffect(hero(target), instance);
    const changed = Boolean(result.applied || result.replaced || result.refreshed);
    if (changed) modules['cryptLord.battleReport']?.effect(battle, actor, target, instance);
    return changed;
  }
  function process(battle, actor, timing = 'turn_start') {
    initialize(battle);
    if (!actor || !timings.includes(timing)) return [];
    const slot = modules['cryptLord.battleExtraAction']?.currentSlot(battle);
    if (slot?.extra && slot.cfg?.freezeDurations) return [];
    const marks = battle.effectLifecycle.turns;
    const stamp = Object.hasOwn(marks, actor.id) ? marks[actor.id] : (marks[actor.id] = {});
    if (stamp[timing] === battle.round) return [];
    const effects = (actor.effects || []).filter(managed);
    for (const effect of effects) if (!finite(effect.power) || !finite(effect.duration) ||
      effect.priority !== undefined && !finite(effect.priority))
      throw Error(`持续效果「${effect.name || '未知'}」含无效数值，未进行结算。`);
    if (battle.effectTransferMeta && !modules['cryptLord.battleEffectTransfer'])
      throw Error('持续效果缺少效果传递模块。');
    const view = hero(actor, true);
    const rules = runtime(battle);
    const result = rules.turn.processCharacterEffects(view, timing);
    if (rules.errors.length) throw Error(`持续效果结算失败：${rules.errors.join('；')}`);
    for (const effect of effects) if (!view.effects.includes(effect))
      modules['cryptLord.battleReport']?.effect(battle, actor, actor, effect, 'expired');
    recalculate(actor);
    stamp[timing] = battle.round;
    return result.map(row => ({ hero: row.hero, effect: row.effect,
      result: { type: row.result.type, amount: row.result.amount, message: row.result.message } }));
  }
  function describe(actor) {
    return (actor.effects || []).filter(managed).map(effect =>
      `${effect.name} · ${effect.power}${effect.valueType === 'percentage' ? '%' : ' 点'} · ${
        effect.battlePersistent ? '整场' : `${effect.duration} 回合`} · ${
        { turn_start: '行动开始', turn_end: '行动结束', round_end: '全局回合结束' }[effect.triggerTiming || 'turn_start'] ||
        '专用期限'}`);
  }
  const api = { initialize, apply, store, process, recalculate, describe,
    status: () => ({ ready: true }), dispose() { contract.releaseGlobal(KEY); delete modules[KEY]; } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
