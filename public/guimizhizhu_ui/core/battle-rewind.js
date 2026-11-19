(() => {
  'use strict';
  const KEY = 'cryptLord.battleRewind';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const copy = value => structuredClone(value);
  const safe = value => Object.assign(Object.create(null), value || {});
  const onField = actor => actor && actor.hp > 0 && !actor.isSummon &&
    !actor.offField && !actor.exiled && !actor.activeLeaving && !actor.possessedHidden;
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.rewindMeta ||= { version: 1, config: reference.rewindConfig() };
    battle.rewind ||= { snapshots: {}, used: {} };
    for (const key of ['snapshots', 'used']) {
      battle.rewind[key] = safe(battle.rewind[key]);
      for (const id of Object.keys(battle.rewind[key])) battle.rewind[key][id] = safe(battle.rewind[key][id]);
    }
  }
  function use(battle, data, fn) {
    initialize(battle);
    return fields.withRuntime(battle, data, undefined, fn);
  }
  function snapshot(battle) {
    if (!battle.rewindMeta || battle.status !== 'active') return;
    use(battle, undefined, rt => rt.rewind.snapshotAll(rt.bm));
  }
  function options(battle, actor, data) {
    if (!battle?.rewindMeta || !onField(actor)) return null;
    return use(copy(battle), data, rt => {
      const m = rt.rewind, hero = rt.heroes.find(row => row.heroId === actor.id);
      const eligibility = m.resolveEligibility(hero.sequenceString);
      const choices = m.subtypes().filter(key => eligibility[key]).map(subtype => ({
        subtype, description: m.SUBTYPES[subtype].desc,
        remaining: m.quotaLeft(rt.bm, hero, subtype),
      }));
      if (!choices.length) return null;
      return { choices, rounds: m.availableRounds(rt.bm, hero),
        current: Object.fromEntries(m.PREVIEW_KEYS.map(key => [key, hero.additionalStats[key]])),
        reason: m.blockedReason(rt.bm, hero) };
    });
  }
  function apply(battle, actor, subtype, round, data) {
    const choice = options(battle, actor, data);
    if (!choice || choice.reason || !choice.choices.some(row => row.subtype === subtype && row.remaining > 0) ||
      !Number.isInteger(round) || round > battle.round ||
      !choice.rounds.some(row => row.round === round && row.differs))
      return { ok: false, error: choice?.reason || '回溯能力、次数或所选回合已变化。' };
    return use(battle, data, rt => {
      const summary = [], results = [], hero = rt.heroes.find(row => row.heroId === actor.id);
      if (!rt.rewind.apply(rt.bm, hero, subtype, round, summary, results))
        return { ok: false, error: '所选回合的快照不可用。' };
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return { ok: true, actor: actor.id, subtype, round, summary, results };
    });
  }
  function npc(battle, data, excluded = []) {
    if (!battle.rewindMeta) return [];
    return use(battle, data, rt => {
      const outcomes = [], m = rt.rewind;
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || excluded.includes(hero.heroId) ||
          !onField(hero.unit) || hero.unit.turnSkip || hero.unit.stunned || hero.unit.skipTurn ||
          !m.npcShouldRewind(rt.bm, hero)) continue;
        const subtype = m.npcSubtypeOf(rt.bm, hero), best = m.bestVitalityRound(rt.bm, hero);
        if (!subtype || !best) continue;
        const summary = [], results = [];
        if (!m.apply(rt.bm, hero, subtype, best.round, summary, results)) continue;
        summary.forEach(line => rt.bm.battleLogger.log(line));
        outcomes.push({ actor: hero.heroId, subtype, round: best.round, summary, results });
      }
      return outcomes;
    });
  }
  function statusLines(battle, actor) {
    if (!battle.rewindMeta) return [];
    const used = Object.hasOwn(battle.rewind?.used || {}, actor.id) ? battle.rewind.used[actor.id] : {};
    return Object.entries(used || {}).filter(([, count]) => count > 0)
      .map(([subtype, count]) => `${subtype} · 本场已用 ${count} 次`);
  }
  const api = { initialize, snapshot, options, apply, npc, statusLines,
    defaults: () => reference.rewindConfig(), status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
