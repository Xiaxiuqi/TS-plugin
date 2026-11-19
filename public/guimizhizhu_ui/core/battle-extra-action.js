(() => {
  'use strict';
  const KEY = 'cryptLord.battleExtraAction';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const copy = value => structuredClone(value);
  const safe = value => Object.assign(Object.create(null), value || {});
  const blocked = actor => Boolean(actor.turnSkip || actor.stunned || actor.skipTurn);
  const present = actor => actor && actor.hp > 0 && !actor.offField && !actor.exiled && !actor.activeLeaving && !actor.possessedHidden;
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.extraActionMeta ||= { version: 1, config: reference.extraConfig() };
    battle.extraAction ||= { used: {}, pending: {} };
    battle.extraAction.used = safe(battle.extraAction.used);
    battle.extraAction.pending = safe(battle.extraAction.pending);
    for (const id of Object.keys(battle.extraAction.used))
      battle.extraAction.used[id] = safe(battle.extraAction.used[id]);
  }
  function use(battle, data, fn) {
    initialize(battle);
    return fields.withRuntime(battle, data, undefined, fn);
  }
  function options(battle, actor, data) {
    if (!battle?.extraActionMeta || !present(actor) || blocked(actor)) return [];
    return use(copy(battle), data, rt => {
      const m = rt.extraAction, hero = rt.heroes.find(row => row.heroId === actor.id);
      if (m.forbidden(hero)) return [];
      const eligibility = m.resolveEligibility(hero.sequenceString);
      return m.subtypes().filter(key => eligibility[key]?.ok).map(subtype => ({
        subtype, name: m.displayName(hero, subtype), cost: m.costOf(hero, subtype),
        count: m.countOf(hero, subtype), uses: m.usesOf(hero, subtype),
        remaining: m.quotaLeft(rt.bm, hero, subtype),
        reason: m.blockedReason(rt.bm, hero), description: m.cfgOf(subtype).desc,
      }));
    });
  }
  function grant(battle, actor, subtype, data) {
    const choice = options(battle, actor, data).find(row => row.subtype === subtype);
    if (!choice || choice.reason || choice.remaining <= 0)
      return { ok: false, error: choice?.reason || '额外行动资格或名额已变化。' };
    return use(battle, data, rt => {
      const summary = [], results = [], hero = rt.heroes.find(row => row.heroId === actor.id);
      if (!rt.extraAction.grant(rt.bm, hero, subtype, summary, results))
        return { ok: false, error: '本次额外行动未能发动。' };
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return { ok: true, actor: actor.id, subtype, summary, results };
    });
  }
  function npc(battle, data, excluded = []) {
    if (!battle.extraActionMeta) return [];
    return use(battle, data, rt => {
      const outcomes = [], m = rt.extraAction;
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || excluded.includes(hero.heroId) ||
          !present(hero.unit) || blocked(hero.unit) || !m.npcShouldUse(rt.bm, hero)) continue;
        const subtype = m.npcSubtypeOf(rt.bm, hero), summary = [], results = [];
        if (!m.grant(rt.bm, hero, subtype, summary, results)) continue;
        summary.forEach(line => rt.bm.battleLogger.log(line));
        outcomes.push({ actor: hero.heroId, subtype, summary, results });
      }
      return outcomes;
    });
  }
  function expand(battle, baseQueue) {
    if (!battle.extraActionMeta) return baseQueue;
    return use(battle, undefined, rt => {
      const expanded = rt.extraAction.expand(rt.bm, baseQueue.map(id =>
        rt.heroes.find(hero => hero.heroId === id)).filter(Boolean));
      battle.turnSlots = expanded.slots.map(({ hero, ...slot }) => ({ ...slot, heroId: hero.heroId }));
      return expanded.queue.map(hero => hero.heroId);
    });
  }
  const currentSlot = battle => battle?.turnSlots?.[battle.index] || null;
  function voidSlots(battle, actor) {
    let count = 0, naming = null;
    for (let i = battle.index; i < (battle.turnSlots?.length || 0); i++) {
      const slot = battle.turnSlots[i];
      if (slot.heroId !== actor.id || !slot.extra || slot.voided) continue;
      slot.voided = true; count++;
      naming ||= slot.naming;
    }
    return { count, naming };
  }
  function check(battle, actor) {
    if (!actor) return true;
    if (present(actor) && !blocked(actor)) return false;
    if (!battle.extraActionMeta) return true;
    use(battle, undefined, rt => {
      rt.bm.turnManager = { voidSlotsOf: hero => voidSlots(battle, hero.unit) };
      rt.extraAction.voidFor(rt.bm, rt.heroes.find(hero => hero.heroId === actor.id));
    });
    return true;
  }
  function enter(battle, actor) {
    const slot = currentSlot(battle);
    if (!slot?.extra || slot.entered || slot.voided) return;
    slot.entered = true;
    actor.moves = 0; actor.movedThisTurn = false;
    if (slot.cfg.refreshMove) {
      const formulas = modules['cryptLord.battleFormulas'];
      if (battle.formulas && formulas) actor.movement = formulas.movement(battle, actor);
      actor.moveRemaining = actor.movement;
    }
    use(battle, undefined, rt => {
      rt.bm.battleLogger.log(rt.extraAction.enterLine({ ...slot,
        hero: rt.heroes.find(hero => hero.heroId === actor.id) }));
    });
  }
  function finish(battle) {
    if (!battle.extraActionMeta) return;
    battle.extraAction.pending = {};
    for (const slot of battle.turnSlots || []) if (slot.extra) slot.voided = true;
  }
  function statusLines(battle, actor) {
    if (!battle.extraActionMeta) return [];
    const used = Object.hasOwn(battle.extraAction.used, actor.id) ? battle.extraAction.used[actor.id] : {};
    return Object.entries(used || {}).map(([key, value]) => `${key} · 本场已用 ${value} 次`);
  }
  const api = { initialize, options, grant, npc, expand, currentSlot, check, enter, finish, statusLines,
    defaults: () => reference.extraConfig(), status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
