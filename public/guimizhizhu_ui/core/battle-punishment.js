(() => {
  'use strict';
  const KEY = 'cryptLord.battlePunishment';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!fields?.withRuntime || !reference) throw Error(`[${KEY}] battle runtime unavailable`);
  const original = reference.create({}).punishment;
  const clone = value => structuredClone(value);
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  const heroOf = (rt, id) => rt.heroes.find(hero => hero.heroId === id);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.punishmentMeta ||= { version: 1, config: clone(original.CONFIG),
      multiplier: original.DAMAGE_MULTIPLIER };
  }
  function options(battle, actor, data) {
    if (!battle?.punishmentMeta || !actor || actor.hp <= 0 ||
      actor.offField || actor.activeLeaving || actor.exiled || actor.possessedHidden) return null;
    return use(clone(battle), data, undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.punishment;
      const eligibility = manager.eligibility(hero);
      if (!eligibility.ok) return null;
      const current = manager.currentTarget(rt.bm, hero);
      return { name: manager.displayName(hero), rank: eligibility.rank,
        cost: manager.costOf(hero), spirit: hero.additionalStats.当前灵性,
        multiplier: manager.DAMAGE_MULTIPLIER,
        current: current ? { id: current.heroId, name: current.name } : null,
        reason: manager.blockedReason(rt.bm, hero),
        targets: manager.candidateTargets(rt.bm, hero).map(target =>
          ({ id: target.heroId, name: target.name })) };
    });
  }
  function preview(battle, actor, target, data) {
    const choices = options(battle, actor, data);
    if (!choices) return null;
    const selected = choices.targets.find(row => row.id === target);
    return { ...choices, target: selected || null,
      mode: choices.current ? 'switch' : 'start',
      afterSpirit: Math.max(0, choices.spirit - choices.cost),
      reason: choices.reason || (!selected ? '请选择其它在场存活敌人作为惩戒对象。' : '') };
  }
  function attempt(battle, actor, target, data, random) {
    const value = preview(battle, actor, target, data);
    if (!value || value.reason)
      return { ok: false, error: value?.reason || '当前没有可用的惩戒资格。' };
    return use(battle, data, random, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.punishment;
      const result = manager.activate(rt.bm, hero, heroOf(rt, target));
      if (!result.applied) return { ok: false, error: result.reason };
      const message = `${hero.name}${result.switched ? '将惩戒对象切换为' : '惩戒'}${result.target.name}` +
        `（灵性 ${result.spent.oldValue}→${result.spent.newValue}，定向伤害 ×${manager.DAMAGE_MULTIPLIER}）。`;
      battle.log.push({ round: battle.round, at: Date.now(), punishment: true,
        actor: actor.id, target, message });
      if (battle.log.length > 160) battle.log.shift();
      return { ok: true, actor: actor.id, target, applied: true, switched: result.switched,
        cost: result.spent.cost, spent: clone(result.spent), summary: [message] };
    });
  }
  function multiplier(battle, actor, target) {
    if (!battle?.punishmentMeta || !actor || !target) return 1;
    return use(clone(battle), undefined, undefined, rt =>
      rt.punishment.directDamageMultiplier(heroOf(rt, actor.id), heroOf(rt, target.id)));
  }
  function priorityTarget(battle, actor) {
    if (!battle?.punishmentMeta || !actor) return null;
    return use(clone(battle), undefined, undefined, rt => {
      const target = rt.punishment.currentTarget(rt.bm, heroOf(rt, actor.id));
      return target && !target.unit.offField && !target.unit.activeLeaving && !target.unit.exiled && !target.unit.possessedHidden ? target.heroId : null;
    });
  }
  function npc(battle, data, random, excluded = []) {
    if (!battle?.punishmentMeta) return [];
    return use(battle, data, random, rt => rt.heroes.filter(hero =>
      hero.controller !== 'player' && hero.unit.hp > 0 &&
      !hero.unit.offField && !hero.unit.activeLeaving && !hero.unit.exiled && !hero.unit.possessedHidden && !hero.unit.turnSkip &&
      !hero.unit.stunned && !hero.unit.skipTurn && !excluded.includes(hero.heroId)).flatMap(hero => {
        if (!rt.punishment.eligible(hero) || !rt.punishment.hasStat(hero) ||
          rt.punishment.currentTarget(rt.bm, hero)) return [];
        const target = rt.punishment.npcTarget(rt.bm, hero);
        if (!target) return [];
        const result = attempt(battle, hero.unit, target.heroId, data, random);
        return result.ok ? [result] : [];
      }));
  }
  function sweep(battle) {
    if (!battle?.punishmentMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const hero of rt.heroes) {
        const old = hero.punishment;
        if (!old) continue;
        if (hero.unit.hp <= 0) hero.punishment = null;
        else rt.punishment.currentTarget(rt.bm, hero);
        if (!hero.punishment) {
          battle.log.push({ round: battle.round, at: Date.now(), punishment: true,
            message: `${hero.name} 对 ${old.targetName || old.targetId} 的惩戒解除。` });
          if (battle.log.length > 160) battle.log.shift();
        }
      }
    });
  }
  function finish(battle) {
    for (const unit of battle.units || []) unit.punishment = null;
  }
  function statusLines(battle, actor) {
    const target = battle?.punishmentMeta && actor?.punishment &&
      battle.units.find(unit => unit.id === actor.punishment.targetId && unit.hp > 0 &&
        unit.side !== actor.side);
    return target ? [`惩戒对象：${target.name} · 定向伤害 ×${battle.punishmentMeta.multiplier}`] : [];
  }
  const api = { initialize, options, preview, attempt, multiplier, priorityTarget, npc,
    sweep, finish, statusLines,
    defaults: () => ({ config: clone(original.CONFIG), multiplier: original.DAMAGE_MULTIPLIER }),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
