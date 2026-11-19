(() => {
  'use strict';
  const KEY = 'cryptLord.battleHardControl';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const present = actor => actor && actor.hp > 0 && !actor.offField && !actor.activeLeaving && !actor.exiled && !actor.possessedHidden;
  const occupied = (battle, actor) => Boolean(actor?.stunned || actor?.skipTurn ||
    actor?.turnSkip?.skipRound === battle.round);
  const use = (battle, data, random, fn) => fields.withRuntime(battle, data, random, fn);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.hardControlMeta ||= { version: 1, config: reference.hardConfig() };
  }
  function options(battle, actor, data) {
    if (!battle?.hardControlMeta || !present(actor) || occupied(battle, actor)) return [];
    return use(structuredClone(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), m = rt.hardControl;
      return m.subtypes().filter(key => m.canUse(rt.bm, hero, key)).map(subtype => ({
        subtype, name: subtype, cost: m.costOf(hero, subtype),
        spirit: actor.spirit, after: m.statAfterCost(hero, subtype),
        range: Number.isFinite(m.rangeOf(subtype)) ? m.rangeOf(subtype) : null,
        reason: m.blockedReason(rt.bm, hero, subtype),
        targets: m.targets(rt.bm, hero, subtype).map(target => ({
          id: target.heroId, name: target.name, defense: m.targetStatOf(target, subtype),
        })),
      }));
    });
  }
  function resolve(battle, data, random, excluded = [], request = null) {
    if (!battle.hardControlMeta) return [];
    return use(battle, data, random, rt => {
      const attempts = [], m = rt.hardControl, outcomes = [];
      const append = (hero, subtype, target) => {
        const attempt = m.attempt(hero, target, subtype);
        if (!attempt) return;
        attempts.push(attempt);
        outcomes.push({ actor: hero.heroId, target: target.heroId, subtype,
          roll: { ...attempt.roll, caster: attempt.roll.casterScore, defender: attempt.roll.targetScore },
          outcome: attempt.roll.win ? 'applied' : 'resisted', summary: [] });
      };
      if (request) {
        const hero = rt.heroes.find(row => row.dataSource === 'player');
        const target = m.targets(rt.bm, hero, request.subtype)
          .find(row => row.heroId === request.target);
        if (target && present(hero.unit) && !occupied(battle, hero.unit) &&
          m.hasStat(hero, request.subtype)) append(hero, request.subtype, target);
      }
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || !present(hero.unit) ||
          occupied(battle, hero.unit) || excluded.includes(hero.heroId)) continue;
        for (const subtype of m.npcSubtypes()) {
          if (!m.npcShouldTry(rt.bm, hero, subtype)) continue;
          const pool = m.targets(rt.bm, hero, subtype);
          append(hero, subtype, pool[Math.floor(rt.dice() * pool.length)]);
          break;
        }
      }
      const summary = [], results = [];
      m.arbitrate(rt.bm, attempts, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      for (const row of outcomes) {
        const actor = rt.heroes.find(hero => hero.heroId === row.actor);
        row.outcome = results.some(result => result.actor === actor.name &&
          result.target === rt.heroes.find(hero => hero.heroId === row.target).name &&
          result.kind === m.cfgOf(row.subtype).resultKind) ? 'applied'
          : row.roll.win ? 'superseded' : 'resisted';
        row.summary = summary.filter(line => line.startsWith(`✓ ${actor.name} `) ||
          line.startsWith(`✗ ${actor.name} `));
      }
      return outcomes;
    });
  }
  function sweep(battle) {
    if (battle.hardControlMeta) use(battle, undefined, undefined, rt => rt.turnSkip.sweep(rt.bm));
  }
  function shouldSkip(battle, actor) {
    if (!battle.hardControlMeta || !actor?.turnSkip) return false;
    return use(battle, undefined, undefined, rt =>
      rt.turnSkip.shouldSkip(rt.bm, rt.heroes.find(hero => hero.heroId === actor.id)));
  }
  function consume(battle, actor) {
    return use(battle, undefined, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id);
      const meta = rt.turnSkip.consume(rt.bm, hero);
      if (meta) rt.bm.battleLogger.log(meta.turnText(hero.name));
      return meta?.label || '';
    });
  }
  function statusLines(battle, actor) {
    const state = actor?.turnSkip;
    if (!battle.hardControlMeta || !state) return [];
    return [`${state.reason} · 第 ${state.skipRound} 回合行动及战术受限${state.consumed ? ' · 已跳过行动' : ''}`];
  }
  function finish(battle) {
    if (battle.hardControlMeta) for (const actor of battle.units) actor.turnSkip = null;
  }
  const api = { initialize, options, resolve, occupied, shouldSkip, consume, sweep, finish, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
