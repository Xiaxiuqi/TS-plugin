(() => {
  'use strict';
  const KEY = 'cryptLord.battleAuras';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] contract unavailable`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => structuredClone(value);
  const own = (map, key) => map && Object.hasOwn(map, key) ? map[key] : undefined;
  const put = (map, key, value) => {
    Object.defineProperty(map, key, { value, writable: true, enumerable: true, configurable: true });
    return value;
  };
  const alive = unit => Boolean(unit && unit.hp > 0);
  const onField = unit => alive(unit) && unit.offField !== true && !unit.activeLeaving;
  const channels = [
    ['attack', 'attack', '攻击力'], ['defense', 'defense', '防御力'],
    ['speed', 'speed', '速度'], ['movement', 'movement', '移动力'],
    ['damageDealt', 'damageDealtIncrease', '造成伤害'],
    ['damageTaken', 'damageTakenDecrease', '受到伤害'],
  ];
  const defaults = {
    混乱权柄: {
      pathway: '律师', title: '失序者', titleRank: -1,
      names: [{ gate: 3, name: '“混乱”权柄' }],
      desc: '自身能力出现有益的随机变化，范围内敌人的能力受到不利扰动，影响随战斗持续加深。',
      radius: { mode: 'abilityRankTier', tiers: [
        { maxRank: -1, value: 5 }, { maxRank: 0, value: 4 },
        { maxRank: 2, value: 3 }, { maxRank: 3, value: 2 },
      ], fallback: 2 },
      activation: { cost: null, consumesAction: false, playerCanDeactivate: true,
        npcAutoActivate: 'battle_start', npcDeactivate: 'never' },
      stacking: { initial: 1, inRangeDelta: 1, outOfRangeDelta: -1, inactiveDelta: -1,
        maxStacks: null, popMode: 'last', perStackPower: 5 },
      selfPool: channels.map(([key, stat, label]) =>
        ({ key, stat, label, weight: 1, channel: 'buff' })),
      enemyPool: channels.map(([key, stat, label]) => ({ key, label, weight: 1,
        stat: key === 'damageDealt' ? 'damageDealtDecrease'
          : key === 'damageTaken' ? 'damageTakenIncrease' : stat, channel: 'debuff' })),
    },
  };
  const find = (battle, id) => battle.units.find(unit => unit.id === id);
  const emit = (battle, message) => {
    battle.log.push({ round: battle.round, message, at: Date.now(), aura: true });
    if (battle.log.length > 160) battle.log.shift();
  };
  function initialize(battle, random) {
    if (battle.auraState) return;
    battle.auraState = { version: 1, serial: 0, instances: {},
      rules: clone(defaults), pathways: clone(battle.formulas?.pathways ||
        (record(window.GameDBManager?.DB?.godPathways) ? window.GameDBManager.DB.godPathways : {})),
      seed: (Math.floor((random ? random() : Math.random()) * 4294967296) >>> 0) || 0x6d2b79f5 };
    autoActivate(battle, random);
  }
  const rules = battle => battle.auraState?.rules || defaults;
  function eligibility(battle, actor, subtype) {
    const cfg = own(rules(battle), subtype);
    if (!cfg || !actor) return null;
    const sequence = String(actor.sequence || '');
    let rank = cfg.title && sequence.includes(cfg.title) ? cfg.titleRank : Infinity;
    const pure = value => String(value || '').replace(
      /^序列\s*[：:]?\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
    if (!sequence.includes('普通人')) {
      for (const fragment of sequence.split(/[/|，,;；与和及以及\s+&、]/u)) {
        const match = fragment.match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
        if (!match) continue;
        const library = Object.entries(battle.auraState?.pathways || battle.formulas?.pathways || {})
          .find(([, rows]) => Array.isArray(rows) && rows.some(row => pure(row) === pure(fragment)));
        const pathway = library?.[0]?.replace(/途径$/u, '').trim() ||
          String(actor.pathway || '').replace(/途径$/u, '').trim() || pure(fragment);
        if (pathway === cfg.pathway) rank = Math.min(rank, Number(match[1]));
      }
    }
    const alias = cfg.names.filter(row => rank <= row.gate).sort((a, b) => a.gate - b.gate)[0];
    if (!alias) return null;
    const tier = cfg.radius.tiers.filter(row => rank <= row.maxRank)
      .sort((a, b) => a.maxRank - b.maxRank)[0];
    return { subtype, name: alias.name, rank, radius: tier?.value ?? cfg.radius.fallback,
      description: cfg.desc };
  }
  const instances = battle => Object.values(battle.auraState?.instances || {})
    .flatMap(bucket => Object.values(bucket));
  const instanceOf = (battle, actor, subtype) =>
    own(own(battle.auraState?.instances, actor.id), subtype);
  function draw(battle) {
    const formulas = modules['cryptLord.battleFormulas'];
    if (battle.formulas && formulas) return formulas.draw(battle);
    let x = battle.auraState.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    battle.auraState.seed = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  function add(battle, instance, actor, role, count, random) {
    const cfg = rules(battle)[instance.subtype];
    const pool = (role === 'self' ? cfg.selfPool : cfg.enemyPool).filter(row => row.weight > 0);
    const total = pool.reduce((sum, row) => sum + row.weight, 0);
    const row = own(instance.records, actor.id) ||
      put(instance.records, actor.id, { heroId: actor.id, role, history: [] });
    row.role = role;
    const keys = [];
    const cap = cfg.stacking.maxStacks == null ? Infinity : cfg.stacking.maxStacks;
    for (let i = 0; i < count && row.history.length < cap && total > 0; i++) {
      let cursor = (random ? random() : draw(battle)) * total;
      const picked = pool.find(item => (cursor -= item.weight) < 0) || pool.at(-1);
      row.history.push(picked.key); keys.push(picked.key);
    }
    return keys;
  }
  function sync(battle, instance) {
    const cfg = rules(battle)[instance.subtype];
    for (const actor of battle.units) {
      actor.effects = (actor.effects || []).filter(effect =>
        !(effect.auraEffect && effect.auraId === instance.id));
      const row = own(instance.records, actor.id);
      if (!alive(actor) || !row?.history.length) continue;
      const counts = {};
      for (const key of row.history) counts[key] = (counts[key] || 0) + 1;
      const pool = row.role === 'self' ? cfg.selfPool : cfg.enemyPool;
      for (const [key, count] of Object.entries(counts)) {
        const channel = pool.find(entry => entry.key === key);
        if (!channel) continue;
        actor.effects.push({
          name: `${instance.shownAs}·${instance.casterName}·${channel.label}`,
          type: channel.channel, stat: channel.stat, valueType: 'percentage',
          power: count * cfg.stacking.perStackPower, duration: 9999,
          triggerTiming: 'aura', battlePersistent: true, auraEffect: true,
          auraId: instance.id, auraSubtype: instance.subtype, auraSourceId: instance.casterId,
          auraRole: row.role, auraChannelStacks: count, auraTotalStacks: row.history.length,
        });
      }
    }
  }
  const inRange = (a, b, radius) => onField(a) && onField(b) &&
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= radius;
  function changeLine(instance, cfg, actor, role, keys, sign) {
    const pool = role === 'self' ? cfg.selfPool : cfg.enemyPool;
    const detail = keys.map(key => pool.find(row => row.key === key)?.label || key).join('、');
    const total = own(instance.records, actor.id)?.history.length || 0;
    return `${actor.name}${sign}${keys.length}层（${detail}）→${total}层`;
  }
  function activate(battle, actor, subtype, random) {
    const eligible = eligibility(battle, actor, subtype);
    if (!eligible) return { ok: false, error: '当前不具备这项光环能力。' };
    if (!onField(actor)) return { ok: false, error: '发动者当前不在战场上。' };
    const state = battle.auraState;
    const bucket = own(state.instances, actor.id) || put(state.instances, actor.id, {});
    const instance = own(bucket, subtype) || put(bucket, subtype, {
      id: `aura-${++state.serial}`, casterId: actor.id, casterName: actor.name,
      subtype, shownAs: eligible.name, active: false, everActivated: false,
      manualOff: false, lastGrowthRound: null, emittingLastTick: false, records: {},
    });
    if (instance.active) return { ok: true, changed: false };
    const first = !instance.everActivated;
    Object.assign(instance, { active: true, everActivated: true, manualOff: false,
      lastGrowthRound: battle.round, emittingLastTick: true });
    if (first) {
      const cfg = rules(battle)[subtype];
      add(battle, instance, actor, 'self', cfg.stacking.initial, random);
      for (const target of battle.units) if (target.side !== actor.side &&
        inRange(actor, target, eligible.radius))
        add(battle, instance, target, 'enemy', cfg.stacking.initial, random);
    }
    sync(battle, instance);
    emit(battle, `${actor.name}开启了${eligible.name}，自身能力开始出现有益的随机变化，范围内敌人的能力受到不利扰动。`);
    return { ok: true, changed: true, first };
  }
  function deactivate(battle, actor, subtype, manual = true) {
    const instance = instanceOf(battle, actor, subtype);
    if (!instance?.active) return { ok: true, changed: false };
    if (manual && !rules(battle)[subtype].activation.playerCanDeactivate)
      return { ok: false, error: '这项光环不能主动关闭。' };
    Object.assign(instance, { active: false, manualOff: manual, emittingLastTick: false });
    emit(battle, manual ? `${instance.casterName}关闭了${instance.shownAs}，残留影响开始逐层消退。`
      : `${instance.casterName}失去战斗能力，其${instance.shownAs}停止扩张，残留影响开始逐层消退。`);
    return { ok: true, changed: true };
  }
  function sweepDead(battle) {
    for (const instance of instances(battle)) if (instance.active && !alive(find(battle, instance.casterId)))
      deactivate(battle, { id: instance.casterId }, instance.subtype, false);
  }
  function autoActivate(battle, random) {
    for (const actor of battle.units) if (actor.source !== 'player' && onField(actor)) {
      for (const [subtype, cfg] of Object.entries(rules(battle)))
        if (cfg.activation.npcAutoActivate === 'battle_start' && eligibility(battle, actor, subtype))
          activate(battle, actor, subtype, random);
    }
  }
  function tick(battle, random) {
    if (!battle.auraState) return;
    sweepDead(battle);
    autoActivate(battle, random);
    for (const instance of instances(battle)) {
      if (instance.lastGrowthRound === battle.round) continue;
      const cfg = rules(battle)[instance.subtype];
      const caster = find(battle, instance.casterId);
      const emitting = instance.active && onField(caster);
      if (instance.active && emitting !== instance.emittingLastTick)
        emit(battle, emitting ? `${instance.casterName}返回战场，${instance.shownAs}恢复扩张。`
          : `${instance.casterName}暂时离场，${instance.shownAs}暂停，现有层数开始衰减。`);
      instance.emittingLastTick = Boolean(emitting);
      const protectedIds = new Set(), changes = [];
      if (emitting) for (const actor of battle.units) {
        const self = actor === caster;
        if (!self && (actor.side === caster.side ||
          !inRange(caster, actor, eligibility(battle, caster, instance.subtype)?.radius ?? cfg.radius.fallback))) continue;
        protectedIds.add(actor.id);
        const keys = add(battle, instance, actor, self ? 'self' : 'enemy',
          cfg.stacking.inRangeDelta, random);
        if (keys.length) changes.push(changeLine(instance, cfg, actor, self ? 'self' : 'enemy', keys, '+'));
      }
      for (const [id, row] of Object.entries(instance.records)) {
        const actor = find(battle, id);
        if (!actor || !alive(actor) && id !== instance.casterId) { delete instance.records[id]; continue; }
        if (protectedIds.has(id)) continue;
        const count = Math.abs(emitting ? cfg.stacking.outOfRangeDelta : cfg.stacking.inactiveDelta);
        const removed = row.history.splice(Math.max(0, row.history.length - count));
        if (removed.length) changes.push(changeLine(instance, cfg, actor, row.role, removed, '-'));
        if (!row.history.length) delete instance.records[id];
      }
      instance.lastGrowthRound = battle.round;
      sync(battle, instance);
      if (changes.length) emit(battle, `${instance.casterName}的${instance.shownAs}：${changes.join('；')}。`);
    }
  }
  function options(battle, actor) {
    return Object.keys(rules(battle)).flatMap(subtype => {
      const eligible = eligibility(battle, actor, subtype);
      if (!eligible) return [];
      const instance = instanceOf(battle, actor, subtype);
      return [{ ...eligible, active: Boolean(instance?.active),
        everActivated: Boolean(instance?.everActivated),
        stacks: own(instance?.records, actor.id)?.history.length || 0 }];
    });
  }
  function statusLines(battle, actor) {
    return instances(battle).flatMap(instance => {
      const row = own(instance.records, actor.id);
      if (!row?.history.length) return [];
      const cfg = rules(battle)[instance.subtype], counts = {};
      for (const key of row.history) counts[key] = (counts[key] || 0) + 1;
      const pool = row.role === 'self' ? cfg.selfPool : cfg.enemyPool;
      const detail = Object.entries(counts).map(([key, count]) =>
        `${pool.find(item => item.key === key)?.label || key}${count}层（${row.role === 'self' ? '+' : '-'}${count * cfg.stacking.perStackPower}%）`).join('、');
      const state = instance.active ? onField(find(battle, instance.casterId)) ? '开启' : '暂停' : '衰减中';
      return [`${instance.shownAs}·${instance.casterName}：${row.history.length}层 · ${detail} · ${state}`];
    });
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: true }), defaults: () => clone(defaults),
    initialize, eligibility, activate, deactivate, sweepDead, tick, options, statusLines,
    dispose() { contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
