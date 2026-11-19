(() => {
  'use strict';
  const KEY = 'cryptLord.battleActiveLeave';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const clone = value => structuredClone(value);
  const use = (battle, data, random, fn) => fields.withRuntime(battle, data, random, fn);
  const heroOf = (rt, id) => rt.heroes.find(hero => hero.heroId === id);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.activeLeaveMeta ||= { version: 1, config: reference.activeLeaveConfig() };
    battle.activeLeave ||= { processes: [] };
  }
  function options(battle, actor, data) {
    if (!battle?.activeLeaveMeta || !actor || actor.hp <= 0) return null;
    return use(clone(battle), data, undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.activeLeave;
      const process = manager.processOf(rt.bm, hero), cost = manager.upkeepCost(hero);
      if (process) return { away: true, subtype: process.subtype,
        enteredRound: process.enteredRound, spirit: actor.spirit, cost,
        canStay: actor.spirit >= cost, choices: [] };
      if (!manager.canUse(rt.bm, hero)) return null;
      return { away: false, spirit: actor.spirit, cost,
        choices: manager.availableSubtypes(hero).map(subtype => ({
          subtype, description: manager.cfgOf(subtype).desc,
          rivals: manager.rivals(rt.bm, hero, subtype).map(rival =>
            ({ id: rival.heroId, name: rival.name, spirit: rival.additionalStats.当前灵性 })),
          possible: manager.canPossiblyWinAll(rt.bm, hero, subtype),
        })) };
    });
  }
  function write(battle, summary, results) {
    for (const message of summary) {
      battle.log.push({ round: battle.round, at: Date.now(), activeLeave: true, message });
      if (battle.log.length > 160) battle.log.shift();
    }
    return results.map(row => ({ ...row, actorName: row.actor,
      actor: battle.units.find(unit => unit.name === row.actor)?.id }));
  }
  // Maintenance runs before every tactic pipeline, including the ordinary skip entry.
  function prepare(battle, data, random, request = null) {
    if (!battle.activeLeaveMeta) return [];
    return use(battle, data, random, rt => {
      const summary = [], results = [], manager = rt.activeLeave;
      const handled = manager.maintainNpcs(rt.bm, summary, results);
      const maintained = [...handled];
      results.filter(row => row.kind === 'active-leave').forEach((row, index) => {
        row.actorId = maintained[index];
      });
      const player = rt.heroes.find(hero => hero.dataSource === 'player');
      const beforePlayer = results.length;
      if (player && manager.processOf(rt.bm, player)) {
        manager.maintainPlayer(rt.bm, player, request?.mode || 'stay', summary, results);
        handled.add(player.heroId);
      } else if (player && request?.subtype) {
        manager.attempt(rt.bm, player, request.subtype, summary, results);
        handled.add(player.heroId);
      }
      for (const row of results.slice(beforePlayer)) row.actorId = player.heroId;
      return write(battle, summary, results).map(row => ({ ...row, actor: row.actorId || row.actor }));
    });
  }
  function npc(battle, data, excluded = [], random) {
    if (!battle.activeLeaveMeta) return [];
    return use(battle, data, random, rt => {
      const summary = [], results = [], manager = rt.activeLeave;
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || excluded.includes(hero.heroId) ||
          hero.unit.turnSkip || hero.unit.stunned || hero.unit.skipTurn ||
          !manager.canNpcInitiate(rt.bm, hero) ||
          rt.dice() * 100 >= battle.activeLeaveMeta.config.ACTIVE_LEAVE_NPC_CHANCE) continue;
        const kinds = manager.npcSubtypes(rt.bm, hero);
        const before = results.length;
        manager.attempt(rt.bm, hero, kinds[Math.floor(rt.dice() * kinds.length)], summary, results);
        for (const result of results.slice(before)) result.actorId = hero.heroId;
      }
      return write(battle, summary, results).map(row => ({ ...row, actor: row.actorId || row.actor }));
    });
  }
  function checkDead(battle) {
    if (!battle.activeLeaveMeta) return;
    use(battle, undefined, undefined, rt =>
      write(battle, rt.activeLeave.checkDead(rt.bm), []));
  }
  function finish(battle) {
    if (!battle.activeLeaveMeta) return;
    use(battle, undefined, undefined, rt => rt.activeLeave.releaseAll(rt.bm));
  }
  function statusLines(battle, actor) {
    const process = battle.activeLeave?.processes.find(row => row.heroId === actor.id);
    return process ? [`主动离场 · ${process.subtype} · 每轮维持消耗灵性`] : [];
  }
  const api = { initialize, options, prepare, npc, checkDead, finish, statusLines,
    defaults: () => reference.activeLeaveConfig(), status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
