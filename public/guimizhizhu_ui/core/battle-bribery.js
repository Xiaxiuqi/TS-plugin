(() => {
  'use strict';
  const KEY = 'cryptLord.battleBribery';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!fields?.withRuntime || !reference) throw new Error(`[${KEY}] battle runtime unavailable`);
  const defaults = reference.create({}).bribery.SUBTYPES;
  const clone = value => structuredClone(value);
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  const heroOf = (rt, id) => rt.heroes.find(hero => hero.heroId === id);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.briberyMeta ||= { version: 1, rules: clone(defaults) };
    battle.tempAllegiance ||= { processes: [] };
  }
  function options(battle, actor, data) {
    if (!actor) return [];
    return use(clone(battle), data, undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.bribery;
      return manager.subtypes().filter(subtype => manager.eligible(hero, subtype)).map(subtype => ({
        subtype, name: subtype, cost: manager.costOf(hero), rounds: manager.SUBTYPES[subtype].rounds,
        targets: manager.targets(rt.bm, hero, subtype).map(target =>
          ({ id: target.heroId, name: target.name })),
      }));
    });
  }
  function preview(battle, actor, subtype, target, data) {
    if (!actor || !Object.hasOwn(defaults, subtype)) return null;
    return use(clone(battle), data, undefined, rt => {
      const hero = heroOf(rt, actor.id), recipient = heroOf(rt, target), manager = rt.bribery;
      const existing = manager.relation(hero, recipient, subtype);
      return { reason: manager.blockedReason(rt.bm, hero, subtype, recipient),
        cost: manager.costOf(hero), casterValue: manager.casterStat(hero, true),
        targetValue: recipient ? manager.targetStat(recipient) : null,
        power: recipient ? manager.weakenPower(hero, recipient) : 0,
        rounds: manager.SUBTYPES[subtype].rounds,
        current: existing ? { target: existing.targetName, until: existing.until } : null };
    });
  }
  function attempt(battle, actor, subtype, target, data, random) {
    if (!Object.hasOwn(defaults, subtype)) return { ok: false, error: '未知贿赂能力。' };
    initialize(battle);
    return use(battle, data, random, rt => {
      const caster = heroOf(rt, actor?.id), recipient = heroOf(rt, target);
      const reason = rt.bribery.blockedReason(rt.bm, caster, subtype, recipient);
      if (reason) return { ok: false, error: reason };
      const summary = [], results = [];
      const applied = rt.bribery.attempt(rt.bm, caster, recipient, subtype, summary, results);
      return { ok: true, applied, actor: actor.id, subtype, target, summary, results };
    });
  }
  function npc(battle, data, excluded = [], random) {
    if (!battle.briberyMeta) return [];
    return use(battle, data, random, rt => {
      const outcomes = [];
      for (const hero of rt.heroes.filter(row => row.controller !== 'player' &&
        row.unit.hp > 0 && !row.unit.offField && !row.unit.activeLeaving &&
        !excluded.includes(row.heroId))) {
        const choices = rt.bribery.subtypes().filter(subtype =>
          rt.bribery.targets(rt.bm, hero, subtype, true).length);
        if (!choices.length || rt.dice() >= .3) continue;
        const subtype = choices[Math.floor(rt.dice() * choices.length)];
        const target = rt.bribery.npcTarget(rt.bm, hero, subtype);
        if (!target) continue;
        const summary = [], results = [];
        const applied = rt.bribery.attempt(rt.bm, hero, target, subtype, summary, results);
        outcomes.push({ actor: hero.heroId, subtype, applied, summary, results });
      }
      return outcomes;
    });
  }
  function blockReason(battle, actor, choice, target, position) {
    if (!battle.briberyMeta || !actor || !target) return '';
    return use(clone(battle), undefined, undefined, rt => {
      const caster = heroOf(rt, actor.id), center = heroOf(rt, target.id);
      const skill = { isHeal: choice.heal > 0, targetType: choice.targetType || 'single',
        selfCentered: choice.targetType === 'self' || choice.range === 0,
        aoeRadius: choice.radius ?? 2 };
      return rt.bribery.attackBlockReason(rt.bm, caster, skill, center, position);
    });
  }
  function weakenPercent(battle, actor, target, stat) {
    if (!battle.briberyMeta) return 0;
    return use(battle, undefined, undefined, rt => rt.bribery.weakenPercent({
      actualAttacker: heroOf(rt, actor.id), actualDefender: heroOf(rt, target.id),
    }, stat));
  }
  function originSide(battle, actor) {
    return battle.tempAllegiance?.processes.find(row => row.targetId === actor.id)?.originTeamType ||
      actor.side;
  }
  function sweep(battle, endRound = false) {
    if (!battle.briberyMeta) return;
    use(battle, undefined, undefined, rt => {
      if (endRound) rt.bm.briberyFinishedRound = battle.round;
      const results = rt.bribery.sweep(rt.bm, endRound);
      if (endRound) results.push(...rt.tempAllegiance.tick(rt.bm));
      for (const row of results) {
        battle.log.push({ round: battle.round, at: Date.now(), bribery: true,
          message: row.line || `${row.actor} 对 ${row.target} 的「${row.subtype}」结束，目标恢复原阵营。` });
        if (battle.log.length > 160) battle.log.shift();
      }
    });
  }
  function finish(battle) {
    if (!battle.briberyMeta) return;
    use(battle, undefined, undefined, rt => rt.tempAllegiance.releaseAll(rt.bm));
    for (const unit of battle.units) delete unit.bribery;
  }
  const statusLines = (battle, actor) => !battle.briberyMeta ? []
    : use(clone(battle), undefined, undefined, rt =>
      rt.bribery.statusLines(rt.bm, heroOf(rt, actor.id)));
  const api = { initialize, options, preview, attempt, npc, blockReason, weakenPercent,
    originSide, sweep, finish, statusLines, defaults: () => clone(defaults),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
