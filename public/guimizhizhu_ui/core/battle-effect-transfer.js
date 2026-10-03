(() => {
  'use strict';
  const KEY = 'cryptLord.battleEffectTransfer';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!fields?.withRuntime || !reference) throw new Error(`[${KEY}] original battle runtime unavailable`);
  const defaults = reference.create({}).transfer.SUBTYPES;
  const clone = value => structuredClone(value);
  const alive = unit => Boolean(unit && unit.hp > 0);
  const onField = unit => alive(unit) && !unit.offField && !unit.activeLeaving;
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  const log = (battle, message) => {
    battle.log.push({ round: battle.round, message, at: Date.now(), effectTransfer: true });
    if (battle.log.length > 160) battle.log.shift();
  };
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.effectTransfer ||= { serial: 0, relations: {} };
    battle.effectTransferMeta ||= { version: 1, rules: clone(defaults), duration: 3 };
    battle.effectTransfer.relations = Object.assign(Object.create(null), battle.effectTransfer.relations);
  }
  function options(battle, actor, data) {
    if (!onField(actor)) return [];
    return use(clone(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), manager = rt.transfer;
      return manager.availableSubtypes(hero).map(subtype => ({
        subtype, name: manager.displayName(hero, subtype), description: manager.SUBTYPES[subtype].desc,
        cost: manager.costOf(hero), gift: manager.isGiftSubtype(subtype),
        direction: manager.directionLabel({ subtype,
          direction: manager.directionOf(subtype, manager.matchedRank(hero, subtype)) }),
        targets: manager.targets(rt.bm, hero, subtype).map(target =>
          ({ id: target.heroId, name: target.name })),
        gifts: manager.giftableEffects(rt.bm, hero).map(effect => ({
          name: effect.name, stat: effect.stat, power: effect.power,
          duration: effect.duration, valueType: effect.valueType,
        })),
      }));
    });
  }
  function preview(battle, actor, subtype, target, data) {
    if (!actor || !Object.hasOwn(defaults, subtype)) return null;
    return use(clone(battle), data, undefined, rt => {
      const caster = rt.heroes.find(row => row.heroId === actor.id);
      const recipient = rt.heroes.find(row => row.heroId === target);
      const relation = rt.transfer.outgoingOf(rt.bm, caster);
      return {
        reason: rt.transfer.blockedReason(rt.bm, caster, subtype, recipient),
        cost: rt.transfer.costOf(caster),
        casterValue: rt.transfer.casterStatAfterCost(caster, subtype),
        targetValue: recipient ? rt.transfer.targetStat(recipient) : null,
        current: relation ? {
          name: relation.shownAs, target: rt.transfer.findHero(rt.bm, relation.targetId)?.name,
          rounds: rt.transfer.remainingRounds(rt.bm, relation),
        } : null,
      };
    });
  }
  function attempt(battle, actor, subtype, target, data, random) {
    if (!Object.hasOwn(defaults, subtype)) return { ok: false, error: '未知的效果传递能力。' };
    initialize(battle);
    return use(battle, data, random, rt => {
      const caster = rt.heroes.find(row => row.heroId === actor?.id);
      const recipient = rt.heroes.find(row => row.heroId === target);
      const reason = rt.transfer.blockedReason(rt.bm, caster, subtype, recipient);
      if (reason) return { ok: false, error: reason };
      const summary = [], results = [];
      const applied = rt.transfer.attempt(rt.bm, caster, recipient, subtype, summary, results);
      summary.forEach(message => log(battle, message));
      return { ok: true, applied, actor: actor.id, target, subtype, summary, results };
    });
  }
  function npc(battle, data, excluded = [], random) {
    if (!battle.effectTransferMeta) return [];
    return use(battle, data, random, rt => {
      const outcomes = [];
      for (const hero of rt.heroes.filter(row => row.controller !== 'player' &&
        onField(row.unit) && !excluded.includes(row.heroId))) {
        if (!rt.transfer.npcShouldTry(rt.bm, hero) || rt.dice() >= .3) continue;
        const plan = rt.transfer.npcPlan(rt.bm, hero);
        if (!plan) continue;
        const summary = [], results = [];
        const applied = rt.transfer.attempt(rt.bm, hero, plan.target, plan.subtype, summary, results);
        summary.forEach(message => log(battle, message));
        outcomes.push({ actor: hero.heroId, subtype: plan.subtype, applied, results });
      }
      return outcomes;
    });
  }
  function loss(battle, actor, stat, amount, context = {}) {
    if (!battle.effectTransferMeta) return null;
    return use(battle, undefined, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id);
      const result = rt.transfer.applyResolvedLoss(rt.bm, hero, stat, amount, context);
      return { actualDamage: result.actualDamage, oldValue: result.oldValue, newValue: result.newValue,
        transfers: result.transfers.map(row => ({
          target: row.recipient.heroId, stat: row.stat, damage: row.dealt,
          relation: row.relation.id, lifeSave: row.lifeSave,
        })) };
    });
  }
  function routeEffect(battle, actor, effect, context, store) {
    if (!battle.effectTransferMeta) return Boolean(store(actor, effect));
    return use(battle, undefined, undefined, rt => {
      const victim = rt.heroes.find(row => row.heroId === actor.id);
      const deliveries = rt.transfer.planEffectDeliveries(rt.bm, victim, effect, context);
      let applied = false;
      for (const delivery of deliveries) {
        const result = store(delivery.hero.unit, delivery.effect);
        const resolved = typeof result === 'boolean' ? { applied: result } : result;
        applied ||= Boolean(resolved?.applied || resolved?.replaced || resolved?.refreshed);
        rt.transfer.noteEffectDelivery(rt.bm, victim, delivery, resolved, context);
      }
      return applied;
    });
  }
  function sweep(battle, endRound = false) {
    if (!battle.effectTransferMeta) return;
    use(battle, undefined, undefined, rt => {
      const results = endRound ? rt.transfer.tick(rt.bm) : rt.transfer.sweepDead(rt.bm);
      for (const row of results) log(battle,
        `${row.actor} 的「${row.shownAs}」与 ${row.target} 的关系${
          row.stage === 'expired' ? '到期' : '因角色倒下结束'}。`);
    });
  }
  function statusLines(battle, actor) {
    if (!battle.effectTransferMeta) return [];
    return use(clone(battle), undefined, undefined, rt =>
      rt.transfer.statusLines(rt.bm, rt.heroes.find(row => row.heroId === actor.id)));
  }
  function finish(battle) {
    if (battle.effectTransferMeta) battle.effectTransfer.relations = {};
  }
  const api = { initialize, options, preview, attempt, npc, loss, routeEffect, sweep, finish, statusLines,
    defaults: () => clone(defaults), status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
