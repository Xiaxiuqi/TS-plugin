(() => {
  'use strict';
  const KEY = 'cryptLord.battleExile';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const clone = value => structuredClone(value);
  const onField = unit => unit?.hp > 0 && !unit.exiled && !unit.offField && !unit.activeLeaving && !unit.possessedHidden;
  const heroOf = (rt, id) => rt.heroes.find(hero => hero.heroId === id);
  const use = (battle, data, random, fn) => fields.withRuntime(battle, data, random, fn);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.exileMeta ||= { version: 1, config: reference.exileConfig() };
    battle.exile ||= { processes: [] };
  }
  function options(battle, actor, data) {
    if (!battle?.exileMeta || !onField(actor)) return [];
    return use(clone(battle), data, undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.exile;
      const targets = manager.targets(rt.bm, hero).map(target =>
        ({ id: target.heroId, name: target.name }));
      return manager.availableSubtypes(rt.bm, hero).map(subtype => {
        const cfg = manager.SUBTYPES[subtype];
        return { subtype, rounds: manager.roundsOf(subtype), cost: manager.costOf(hero),
          poison: cfg.poison ? manager.poisonPowerOf(hero) : 0,
          returnAt: cfg.returnAt, targets,
          reason: !manager.hasStat(hero) ? '当前灵性为零。'
            : !targets.length ? '没有在场且理论上可放逐的敌人。' : '' };
      });
    });
  }
  function write(battle, message, extra = {}) {
    battle.log.push({ round: battle.round, at: Date.now(), exile: true, message, ...extra });
    if (battle.log.length > 160) battle.log.shift();
  }
  // Player and NPC attempts share original arbitration, so contested targets resolve once.
  function resolve(battle, data, random, request = null, excluded = []) {
    if (!battle.exileMeta) return request ? { ok: false, error: '本场放逐模块不可用。' } : [];
    if (request) {
      const choice = options(battle, battle.units.find(unit => unit.id === request.actor), data)
        .find(row => row.subtype === request.subtype);
      if (!choice || choice.reason || !choice.targets.some(row => row.id === request.target))
        return { ok: false, error: choice?.reason || '放逐资格或目标已变化。' };
    }
    return use(battle, data, random, rt => {
      const attempts = [], outcomes = [], summary = [], results = [];
      const add = (caster, target, subtype) => {
        const spent = rt.exile.spend(caster);
        attempts.push({ caster, target, subtype,
          roll: rt.exile.contest(caster, target, caster.additionalStats[spent.field]) });
        outcomes.push({ actor: caster.heroId, target: target.heroId, subtype, cost: spent.cost });
      };
      if (request) add(heroOf(rt, request.actor), heroOf(rt, request.target), request.subtype);
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || !onField(hero.unit) ||
          excluded.includes(hero.heroId) || hero.unit.turnSkip || hero.unit.stunned ||
          hero.unit.skipTurn || !rt.exile.hasStat(hero)) continue;
        const kinds = rt.exile.availableSubtypes(rt.bm, hero), pool = rt.exile.targets(rt.bm, hero);
        if (!kinds.length || !pool.length ||
          rt.dice() * 100 >= battle.exileMeta.config.EXILE_NPC_CHANCE) continue;
        add(hero, pool[Math.floor(rt.dice() * pool.length)], kinds[Math.floor(rt.dice() * kinds.length)]);
      }
      rt.exile.arbitrate(rt.bm, attempts, summary, results);
      summary.forEach(message => write(battle, message));
      for (const row of outcomes) row.applied = battle.exile?.processes.some(process =>
        process.casterId === row.actor && process.targetId === row.target);
      return request ? { ok: true, outcomes, summary, results } : outcomes;
    });
  }
  function checkDead(battle) {
    if (!battle.exileMeta) return;
    use(battle, undefined, undefined, rt =>
      rt.exile.checkDead(rt.bm).forEach(message => write(battle, message)));
  }
  function endRound(battle) {
    if (!battle.exileMeta) return;
    checkDead(battle);
    use(battle, undefined, undefined, rt => {
      for (const result of rt.exile.tick(rt.bm)) {
        const cfg = rt.exile.SUBTYPES[result.subtype];
        write(battle, `${result.target} ${cfg.report.returnFrom}${result.nearCaster
          && cfg.returnAt === 'caster' ? '，出现在放逐者身边' : ''}。`, { result });
      }
    });
    checkDead(battle);
  }
  function finish(battle) {
    if (!battle.exileMeta) return;
    use(battle, undefined, undefined, rt => rt.exile.releaseAll(rt.bm));
    for (const actor of battle.units) actor.effects =
      (actor.effects || []).filter(effect => !effect.exilePoison);
  }
  function statusLines(battle, actor) {
    const process = battle.exile?.processes.find(row => row.targetId === actor.id);
    return process ? [`${process.subtype}中 · 第 ${process.returnRound} 回合末回场`] : [];
  }
  const api = { initialize, options, resolve, checkDead, endRound, finish, statusLines,
    defaults: () => reference.exileConfig(),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
