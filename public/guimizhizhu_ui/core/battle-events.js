(() => {
  'use strict';
  const KEY = 'cryptLord.battleEvents';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const defaults = reference.create({}).battleEvent.SUBTYPES;
  const copy = value => structuredClone(value);
  const safe = value => Object.assign(Object.create(null), value || {});
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.battleEventMeta ||= { version: 1, npcChance: 30 };
    battle.battleEvent ||= { processes: [], used: {} };
    battle.battleEvent.used = safe(battle.battleEvent.used);
    for (const id of Object.keys(battle.battleEvent.used))
      battle.battleEvent.used[id] = safe(battle.battleEvent.used[id]);
  }
  function use(battle, data, random, fn) {
    initialize(battle);
    return fields.withRuntime(battle, data, random, fn);
  }
  function options(battle, actor, data) {
    if (!battle?.battleEventMeta || !actor || actor.hp <= 0 ||
      actor.offField || actor.exiled || actor.activeLeaving || actor.possessedHidden) return [];
    return use(copy(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), m = rt.battleEvent;
      const eligibility = m.eligibility(hero);
      return m.subtypes().filter(key => eligibility[key]?.ok).map(subtype => {
        const cfg = m.cfgOf(subtype), power = m.powerOf(hero, subtype);
        return { subtype, name: m.displayName(hero, subtype), cost: m.costOf(hero, subtype),
          power, rounds: m.roundsOf(subtype), remaining: m.quotaLeft(rt.bm, hero, subtype),
          reason: m.blockedReason(rt.bm, hero, subtype), intro: cfg.ui.intro,
          rules: cfg.ui.rules(power), tail: cfg.ui.tail };
      });
    });
  }
  function attempt(battle, actor, subtype, data, random) {
    if (!Object.hasOwn(defaults, subtype)) return { ok: false, error: '未知的战场事件。' };
    const choice = options(battle, actor, data).find(row => row.subtype === subtype);
    if (!choice || choice.reason) return { ok: false, error: choice?.reason || '战场事件资格或在场状态已变化。' };
    return use(battle, data, random, rt => {
      const summary = [], results = [], hero = rt.heroes.find(row => row.heroId === actor.id);
      rt.battleEvent.attempt(rt.bm, hero, subtype, summary, results);
      rt.bm.battleLogger.log(summary[0]);
      return { ok: true, actor: actor.id, subtype, summary, results };
    });
  }
  function npc(battle, data, excluded = [], random) {
    if (!battle.battleEventMeta) return [];
    return use(battle, data, random, rt => {
      const outcomes = [];
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || excluded.includes(hero.heroId) ||
          !rt.battleEvent.onField(hero) || hero.unit.turnSkip || hero.unit.stunned ||
          hero.unit.skipTurn || !rt.battleEvent.npcShouldTry(rt.bm, hero) ||
          rt.dice() * 100 >= battle.battleEventMeta.npcChance) continue;
        const plan = rt.battleEvent.npcPlan(rt.bm, hero);
        if (!plan) continue;
        const summary = [], results = [];
        rt.battleEvent.attempt(rt.bm, hero, plan.subtype, summary, results);
        rt.bm.battleLogger.log(summary[0]);
        outcomes.push({ actor: hero.heroId, subtype: plan.subtype, summary, results });
      }
      return outcomes;
    });
  }
  function tick(battle, random) {
    if (!battle.battleEventMeta) return [];
    return use(battle, undefined, random, rt => rt.battleEvent.tick(rt.bm));
  }
  function finish(battle) {
    if (battle.battleEvent) battle.battleEvent.processes = [];
  }
  function statusLines(battle) {
    return (battle.battleEvent?.processes || []).map(row =>
      `${row.casterName} · ${row.shownAs} · 每次 ${row.power} 点活力 · 剩余 ${row.leftRounds} 回合`);
  }
  const api = { initialize, options, attempt, npc, tick, finish, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
