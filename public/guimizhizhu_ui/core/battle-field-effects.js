(() => {
  'use strict';
  const KEY = 'cryptLord.battleFieldEffects';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!reference) throw new Error(`[${KEY}] original field-effect rules unavailable`);
  const original = reference.create({});
  const defaults = original.field.SUBTYPES;
  const pathwayNames = new Set([...Object.values(defaults).map(row => row.pathway),
    ...Object.keys(modules['cryptLord.battleLifeSave']?.defaults || {}),
    '阅读者', '观众', '战士', '收尸人', '药师', '恶棍', '囚犯', '罪犯']);
  const clone = value => structuredClone(value);
  const own = (map, key) => map && Object.hasOwn(map, key) ? map[key] : undefined;
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const currentKeys = { 当前活力: 'hp', 当前敏捷: 'agility', 当前灵性: 'spirit',
    当前理智: 'sanity', 当前人性: 'humanity', 运气: 'luck' };
  const maxKeys = { 当前活力: 'maxHp', 当前敏捷: 'maxAgility', 当前灵性: 'maxSpirit',
    当前理智: 'maxSanity', 当前人性: 'maxHumanity' };
  const alive = unit => Boolean(unit && unit.hp > 0);
  const off = unit => unit.offField === true || Boolean(unit.activeLeaving);
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const log = (battle, message) => {
    battle.log.push({ round: battle.round, message, at: Date.now(), fieldEffect: true });
    if (battle.log.length > 160) battle.log.shift();
  };
  // Original managers index by hero id; restore own-property maps after JSON round trips.
  const safeMap = source => Object.assign(Object.create(null), source || {});
  function initialize(battle, pathways) {
    if (!battle.fieldEffect) battle.fieldEffect = { seq: 0, used: {}, nextAttack: {} };
    if (!battle.fieldEffectMeta) battle.fieldEffectMeta = {
      version: 1, rules: JSON.parse(JSON.stringify(defaults)),
      pathways: clone(pathways || battle.formulas?.pathways || window.GameDBManager?.DB?.godPathways || {}),
      averages: clone(window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank ||
        reference.averages()), seed: 0x6d2b79f5,
    };
    battle.fieldEffect.used = safeMap(battle.fieldEffect.used);
    for (const id of Object.keys(battle.fieldEffect.used))
      battle.fieldEffect.used[id] = safeMap(battle.fieldEffect.used[id]);
    battle.fieldEffect.nextAttack = safeMap(battle.fieldEffect.nextAttack);
    battle.targetInterference ||= {};
    for (const key of ['misrecognition', 'chaos'])
      battle.targetInterference[key] = safeMap(battle.targetInterference[key]);
  }
  function draw(battle) {
    const formulas = modules['cryptLord.battleFormulas'];
    if (battle.formulas && formulas) return formulas.draw(battle);
    let x = battle.fieldEffectMeta.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    battle.fieldEffectMeta.seed = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  function runtime(battle, data = {}, random) {
    initialize(battle);
    const dice = () => Math.max(0, Math.min(.999999999, number(random ? random() : draw(battle))));
    const math = Object.create(Math);
    math.random = dice;
    const pure = text => String(text || '').replace(/^序列\s*[：:]?\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
    const fragments = text => String(text || '').split(/[/|，,;；与和及以及\s+&、]/u).filter(Boolean);
    const explicit = new Map();
    for (const actor of battle.units) {
      const parts = fragments(actor.sequence);
      if (parts.length !== 1 || !pure(parts[0]) || !actor.pathway) continue;
      const key = pure(parts[0]), value = actor.pathway.replace(/途径$/u, '');
      explicit.set(key, explicit.has(key) && explicit.get(key) !== value ? null : value);
    }
    const resolve = text => {
      const match = String(text).match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
      if (!match || /普通人/u.test(text)) return null;
      const found = Object.entries(battle.fieldEffectMeta.pathways)
        .find(([, rows]) => Array.isArray(rows) && rows.some(row => pure(row) === pure(text)));
      // Explicit pathway names remain useful when the optional original name library is absent.
      const pathway = found?.[0] || explicit.get(pure(text)) ||
        (pathwayNames.has(pure(text))
        ? pure(text) : '');
      return pathway ? { pathwayShort: pathway.replace(/途径$/u, ''), rank: Number(match[1]) } : null;
    };
    class Hero {
      constructor(unit) {
        this.unit = unit;
        this.heroId = unit.id;
        this.name = unit.name;
        this.sequenceString = unit.sequence;
        const ranks = fragments(unit.sequence).flatMap(text => {
          const match = text.match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
          return match ? [Number(match[1])] : [];
        });
        for (const cfg of [...Object.values(defaults), ...Object.values(original.transfer.SUBTYPES),
          ...Object.values(original.bribery.SUBTYPES)])
          if (cfg.title && String(unit.sequence).includes(cfg.title)) ranks.push(cfg.titleRank);
        this.sequenceRank = ranks.length ? Math.min(...ranks) : unit.rank;
        this.dataSource = unit.source;
        this.originalData = unit.source === 'player' ? data.stat_data : own(data.npc_data, unit.id);
        this.isSummon = unit.isSummon;
        this.playSource = unit.playSource;
        this.additionalStats = {};
        for (const [key, field] of Object.entries(currentKeys))
          Object.defineProperty(this.additionalStats, key, {
            get: () => number(unit[field]), set: value => { unit[field] = Math.max(0, number(value)); },
          });
        for (const [key, field] of [['effects', 'effects'], ['teamType', 'side'], ['x', 'x'], ['y', 'y'],
          ['bribery', 'bribery'], ['controller', 'controller']])
          Object.defineProperty(this, key, {
            get: () => key === 'controller' ? unit[field] || unit.source : unit[field],
            set: value => { unit[field] = value; },
          });
      }
    }
    const heroes = battle.units.map(unit => new Hero(unit));
    for (const hero of heroes) {
      if (battle.briberyMeta) hero.unit.bribery ||= {};
      if (hero.unit.bribery) {
        for (const subtype of Object.keys(original.bribery.SUBTYPES))
          hero.unit.bribery[subtype] = safeMap(hero.unit.bribery[subtype]);
      }
    }
    const bm = { teamManager: { getAllHeroes: () => heroes },
      allyTeam: heroes.filter(hero => hero.teamType === 'ally'),
      enemyTeam: heroes.filter(hero => hero.teamType === 'enemy'),
      getEnemyTeam: hero => heroes.filter(row => row.teamType !== hero.teamType),
      battleLogger: { log: message => log(battle, message) } };
    for (const [key, field] of [['currentRound', 'round'], ['fieldEffect', 'fieldEffect'],
      ['effectTransfer', 'effectTransfer'],
      ['tempAllegiance', 'tempAllegiance'], ['briberyFinishedRound', 'briberyFinishedRound'],
      ['targetInterference', 'targetInterference']])
      Object.defineProperty(bm, key, {
        get: () => battle[field], set: value => { battle[field] = value; },
      });
    let managers;
    // The getters are non-enumerable, matching the existing six-resource contest explicitly.
    const bestStat = hero => Math.max(...Object.keys(currentKeys).map(key => number(hero.additionalStats[key])));
    const score = (hero, foe, base, factor) => base * factor * managers.advantage.tacticMultiplier(hero, foe);
    const blocked = unit => Boolean(unit.turnSkip || unit.stunned || unit.skipTurn);
    const deps = {
      Math: math, Hero,
      LifeSaveManager: { splitSequenceFragments: fragments, resolveFragment: resolve,
        tryAbsorb: (hero, amount) => modules['cryptLord.battleLifeSave']?.absorb(hero.unit, amount) ||
          { damage: amount, triggered: false } },
      AttributeCalculator: {
        recalculateAllSixDimStats: hero => {
          const recalculate = modules['cryptLord.teamBattleState']?.recalculateAttributes;
          if (!recalculate) throw new Error('六维重算模块不可用。');
          recalculate(hero.unit);
        },
      },
      PossessionManager: { processOnTarget: () => null },
      TacticBorrowReport: { meta: () => ({}) },
      TacticCatalog: { FIELD_EFFECT_ACTION: '施加效果', FIELD_EFFECT_TIMING: 'field_effect',
        spiritCost: rank => Math.max(1, Math.round((own(battle.fieldEffectMeta.averages, String(rank)) ||
          own(battle.fieldEffectMeta.averages, '10') || reference.averages()['10']).灵性 * .05)) },
      EnemyControlManager: {
        findHero: (_, id) => heroes.find(hero => hero.heroId === id),
        bestStat,
        contest(caster, target, penalty, a, b) {
          const left = score(caster, target, a ?? caster.additionalStats.当前灵性, penalty);
          const right = score(target, caster, b ?? bestStat(target), 1);
          const casterScore = left * (.8 + dice() * .4), targetScore = right * (.8 + dice() * .4);
          return { win: casterScore > targetScore, casterScore: Math.round(casterScore),
            targetScore: Math.round(targetScore) };
        },
        canPossiblyWin: (caster, target, penalty, a, b) =>
          score(caster, target, a, penalty) * 1.2 > score(target, caster, b ?? bestStat(target), 1) * .8,
        contestTail: row => `（拼点 ${row.casterScore} : ${row.targetScore}）`,
        markDamaged: (_, hero) => { hero.unit.lastDamagedRound = battle.round; },
        convertTeam(_, target, caster) {
          managers.tempAllegiance.releaseOnTarget(bm, target);
          const from = target.teamType === 'ally' ? bm.allyTeam : bm.enemyTeam;
          const to = caster.teamType === 'ally' ? bm.allyTeam : bm.enemyTeam;
          const index = from.indexOf(target);
          if (index >= 0) from.splice(index, 1);
          if (!to.includes(target)) to.push(target);
          target.teamType = caster.teamType;
          target.controller = caster.controller;
        },
      },
      ConsumableMoveBuilder: { getAvgAttrs: rank => own(battle.fieldEffectMeta.averages, String(rank)) ||
        own(battle.fieldEffectMeta.averages, '10') || reference.averages()['10'] },
      TacticResolver: { alive: hero => alive(hero?.unit),
        shuffle: list => {
          const out = list.slice();
          for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(dice() * (i + 1)); [out[i], out[j]] = [out[j], out[i]];
          }
          return out;
        },
        writeReport: (_, results) => results.forEach(row => log(battle,
          `${row.actor} 的「${row.shownAs}」与 ${row.target} 的关系结束（${row.stage}）。`)),
      },
      OffFieldManager: { isOff: hero => off(hero.unit) },
      BattleBoard: { distanceBetween: distance },
      TurnSkipManager: { pending: hero => blocked(hero.unit) },
      MysteryReenactmentCanonAccess: { canUseTactic(hero, id) {
        const ledger = hero.originalData?.$专属玩法?.窥秘人途径?.神秘再现玩法?.法术解锁账本;
        const gate = hero.sequenceString.includes('知识之妖') || fragments(hero.sequenceString)
          .some(text => { const row = resolve(text); return row?.pathwayShort === '窥秘人' && row.rank <= 4; });
        return hero.dataSource === 'player' && !hero.isSummon && !hero.playSource &&
          Boolean(ledger && Object.hasOwn(ledger, id)) && gate;
      } },
      SkillRange: {
        isSelfType: type => type === 'self',
        isAllyType: type => ['ally', 'allAlly', 'allAllies'].includes(type),
        isAllType: type => ['all', 'allEnemies', 'allAlly', 'allAllies'].includes(type),
        isSelfCentered: skill => skill.selfCentered === true,
        resolveAoeRadius: skill => skill.aoeRadius ?? 2,
        unitsInCircle: (x, y, radius, pool) => pool.filter(hero => distance({ x, y }, hero) <= radius),
        inRange: (actor, target, skill) => {
          const d = distance(actor, target);
          return d >= (skill.minRange ?? 1) && d <= skill.range;
        },
      },
      TargetSelector: { requiresManualPick: skill =>
        skill.targetType !== 'self' && !skill.selfCentered },
    };
    managers = reference.create(deps);
    if (battle.briberyMeta?.rules) managers.bribery.SUBTYPES =
      Object.fromEntries(Object.entries(battle.briberyMeta.rules)
        .filter(([key]) => Object.hasOwn(original.bribery.SUBTYPES, key)));
    if (battle.effectTransfer) {
      battle.effectTransfer.relations = safeMap(battle.effectTransfer.relations);
      if (battle.effectTransferMeta?.rules)
        managers.transfer.SUBTYPES = Object.fromEntries(Object.entries(battle.effectTransferMeta.rules)
          .filter(([key]) => Object.hasOwn(original.transfer.SUBTYPES, key)));
    }
    bm.effectManager = managers.resolvedEffects;
    bm.battleLogger.logTransferredDamage = (caster, recipient, amount, message) => {
      if (caster) caster.unit.damage = number(caster.unit.damage) + amount;
      log(battle, message);
      Object.assign(battle.log.at(-1), { actor: caster?.heroId, target: recipient.heroId,
        damage: amount, transferred: true });
    };
    managers.field.SUBTYPES = Object.fromEntries(Object.entries(battle.fieldEffectMeta.rules)
      .filter(([key]) => Object.hasOwn(defaults, key))
      .map(([key, cfg]) => [key, { ...cfg, report: defaults[key].report }]));
    return { ...managers, bm, heroes, dice };
  }
  const withRuntime = (battle, data, random, operation) => operation(runtime(battle, data, random));
  function options(battle, actor, data) {
    if (!actor || !alive(actor) || off(actor)) return [];
    const copy = clone(battle), rt = runtime(copy, data);
    const hero = rt.heroes.find(row => row.heroId === actor.id);
    return rt.field.availableSubtypes(rt.bm, hero).map(subtype => {
      const cfg = rt.field.cfgOf(subtype);
      return { subtype, name: rt.field.displayName(hero, subtype),
        action: cfg.action || '施加效果', description: cfg.desc,
        hint: cfg.contestHint || '', cost: rt.field.costOf(hero, subtype),
        resource: rt.field.statKeyOf(subtype), remaining: rt.field.quotaLeft(rt.bm, hero, subtype),
        reason: rt.field.blockedReason(rt.bm, hero, subtype),
        needsPick: rt.field.needsPick(subtype),
        targets: rt.field.pickPool(rt.bm, hero, subtype).map(target =>
          ({ id: target.heroId, name: target.name, side: target.teamType })) };
    });
  }
  function preview(battle, actor, subtype, targetId, data) {
    if (!Object.hasOwn(defaults, subtype)) return [];
    const rt = runtime(clone(battle), data);
    const hero = rt.heroes.find(row => row.heroId === actor.id);
    const target = rt.heroes.find(row => row.heroId === targetId);
    if (!hero || !rt.field.eligibility(hero)[subtype]?.ok) return [];
    return rt.field.previewFor(rt.bm, hero, subtype, target).map(row => ({
      target: row.hero.heroId, name: row.hero.name, power: row.power,
      blocked: row.blocked, detail: rt.field.detailOf(row.spec, row.power, hero),
    }));
  }
  function tacticMultiplier(battle, actor, target) {
    if (!battle.fieldEffectMeta) return 1;
    const rt = runtime(battle);
    const source = rt.heroes.find(row => row.heroId === actor.id);
    const foe = rt.heroes.find(row => row.heroId === target.id);
    return rt.advantage.tacticMultiplier(source, foe);
  }
  function attempt(battle, actor, subtype, targetId, data, random) {
    if (!Object.hasOwn(defaults, subtype)) return { ok: false, error: '未知的施加效果能力。' };
    const rt = runtime(battle, data, random), hero = rt.heroes.find(row => row.heroId === actor?.id);
    if (!hero || !alive(actor) || off(actor) || !rt.field.eligibility(hero)[subtype]?.ok)
      return { ok: false, error: '施加效果资格或在场状态已变化。' };
    const reason = rt.field.blockedReason(rt.bm, hero, subtype);
    if (reason) return { ok: false, error: reason };
    const picked = rt.heroes.find(row => row.heroId === targetId) || null;
    if (rt.field.needsPick(subtype) && !rt.field.pickPool(rt.bm, hero, subtype).includes(picked))
      return { ok: false, error: '目标已不在可选范围内。' };
    const summary = [], results = [];
    rt.field.attempt(rt.bm, hero, subtype, picked, summary, results);
    summary.forEach(message => log(battle, message));
    return { ok: true, actor: actor.id, subtype, results, summary };
  }
  function npc(battle, data, excluded = [], random) {
    const rt = runtime(battle, data, random), outcomes = [];
      for (const hero of rt.heroes.filter(row => row.controller !== 'player' &&
      alive(row.unit) && !off(row.unit) && !excluded.includes(row.heroId))) {
      if (!rt.field.npcShouldTry(rt.bm, hero) || rt.dice() >= .3) continue;
      const plan = rt.field.npcPlan(rt.bm, hero);
      if (!plan) continue;
      const summary = [], results = [];
      rt.field.attempt(rt.bm, hero, plan.subtype, plan.target, summary, results);
      summary.forEach(message => log(battle, message));
      outcomes.push({ actor: hero.heroId, subtype: plan.subtype, results, summary });
    }
    return outcomes;
  }
  function sweep(battle) {
    if (!battle.fieldEffectMeta) return;
    const rt = runtime(battle);
    rt.field.sweep(rt.bm);
    for (const hero of rt.heroes) if (!alive(hero.unit)) rt.interference.clear(rt.bm, hero);
  }
  function endRound(battle) {
    if (!battle.fieldEffectMeta) return;
    const rt = runtime(battle);
    rt.interference.expireRound(rt.bm);
  }
  function finish(battle) {
    if (!battle.fieldEffectMeta) return;
    battle.fieldEffect.nextAttack = {};
    battle.targetInterference = { misrecognition: {}, chaos: {} };
  }
  function turnStart(battle, actor) {
    if (!battle.fieldEffectMeta || off(actor)) return;
    for (const effect of actor.effects || []) {
      if (!alive(actor)) break;
      if (!effect.fieldEffect || effect.triggerTiming !== 'turn_start' ||
        !['poison', 'regen'].includes(effect.type) || effect.duration <= 0) continue;
      const key = currentKeys[effect.stat], max = maxKeys[effect.stat];
      if (!key || !max) continue;
      const amount = Math.max(0, effect.valueType === 'fixed' ? effect.power :
        Math.floor(actor[max] * effect.power / 100));
      const loss = effect.type === 'poison'
        ? modules['cryptLord.battleEffectTransfer']?.loss(battle, actor, effect.stat, amount, {
          derived: effect.effectTransferResolved === true, sourceLabel: effect.name,
          sourceKind: '持续伤害',
        }) : null;
      const delta = effect.type === 'poison' ? -(loss?.actualDamage ?? Math.min(actor[key], amount)) :
        Math.min(actor[max] - actor[key], amount);
      if (!loss) actor[key] += delta;
      effect.duration--;
      log(battle, `${actor.name} 的「${effect.name}」${delta < 0 ? '损失' : '恢复'} ${Math.abs(delta)} 点${effect.stat.slice(2)}，剩余 ${effect.duration} 次行动。`);
    }
    actor.effects = (actor.effects || []).filter(effect => !effect.fieldEffect ||
      effect.triggerTiming !== 'turn_start' || effect.duration > 0);
    if (!alive(actor)) sweep(battle);
  }
  function redirect(battle, actor, target, choice, data, random) {
    if (!battle.fieldEffectMeta) return null;
    const rt = runtime(battle, data, random);
    const skill = { name: choice.name, power: choice.power, isHeal: choice.heal > 0,
      isPassive: false, targetType: choice.targetType, range: choice.range,
      minRange: choice.range === 0 ? 0 : 1,
      selfCentered: choice.targetType !== 'self' && choice.range === 0 };
    const result = rt.interference.resolve(rt.bm, rt.heroes.find(row => row.heroId === actor.id),
      [rt.heroes.find(row => row.heroId === target.id)], skill);
    return result ? { targets: result.targets.map(hero => hero.unit),
      forceSide: result.forceSide, excludeSelf: result.excludeSelf, mode: result.mode } : null;
  }
  const pending = (battle, actor) => own(battle.fieldEffect?.nextAttack, actor.id);
  function consume(battle, actor) {
    const value = pending(battle, actor);
    if (value) {
      delete battle.fieldEffect.nextAttack[actor.id];
      log(battle, `${actor.name} 的「${value.subtype}」已由本次攻击消费。`);
    }
    return value;
  }
  function statusLines(battle, actor) {
    const out = [];
    const state = battle.targetInterference;
    if (own(state?.misrecognition, actor.id)) out.push('扭曲：目标错认 · 下一次攻击或治疗将认错目标');
    if (own(state?.chaos, actor.id)) out.push('混乱：目标失序 · 本回合攻击或治疗将认错目标');
    if (pending(battle, actor)) out.push('灵肉之刃 · 下一次伤害攻击忽略防御增益');
    for (const effect of (actor.effects || []).filter(row => row.fieldEffect))
      out.push(`${effect.name} · ${effect.power}${effect.valueType === 'fixed' ? '点' : '%'} · ${
        effect.fieldEffectUntil == null ? `剩余 ${effect.duration} 次行动`
          : `剩余 ${Math.max(0, effect.fieldEffectUntil - battle.round + 1)} 回合`}`);
    return out;
  }
  const api = { initialize, draw, withRuntime, options, preview, tacticMultiplier, attempt, npc,
    sweep, endRound, finish, turnStart,
    redirect, pending, consume, statusLines,
    defaults: () => JSON.parse(JSON.stringify(defaults)),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
