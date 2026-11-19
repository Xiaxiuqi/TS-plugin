(() => {
  'use strict';
  const KEY = 'cryptLord.battleBalance';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!fields?.withRuntime || !reference) throw Error(`[${KEY}] battle runtime unavailable`);
  const original = reference.create({}).balance;
  const clone = value => structuredClone(value);
  const use = (battle, data, operation) => fields.withRuntime(battle, data, undefined, operation);
  const heroOf = (rt, id) => rt.heroes.find(hero => hero.heroId === id);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.balanceMeta ||= { version: 1, config: clone(original.CONFIG), maxPoints: original.MAX_POINTS };
    battle.balanceAuthority ||= { spent: {}, relations: {} };
    for (const key of ['spent', 'relations'])
      battle.balanceAuthority[key] = Object.assign(Object.create(null), battle.balanceAuthority[key]);
  }
  function options(battle, actor, data) {
    if (!battle?.balanceMeta || !battle.formulas || !actor || actor.hp <= 0 ||
      actor.exiled || actor.offField || actor.activeLeaving || actor.possessedHidden) return null;
    return use(clone(battle), data, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.balance;
      const eligibility = manager.eligibility(hero);
      if (!eligibility.ok) return null;
      const relation = manager.outgoingOf(rt.bm, hero);
      return { name: eligibility.name, rank: eligibility.rank,
        pointsLeft: manager.pointsLeft(rt.bm, hero), maxPoints: manager.MAX_POINTS,
        current: relation ? clone(relation) : null,
        targets: manager.playerTargets(rt.bm, hero).map(target => ({
          id: target.heroId, name: target.name, cost: manager.costOf(hero, target),
          duration: manager.durationOf(hero, target),
        })) };
    });
  }
  function preview(battle, actor, target, data) {
    const choices = options(battle, actor, data);
    if (!choices) return null;
    const selected = choices.targets.find(row => row.id === target);
    return { ...choices, target: selected || null, mode: choices.current
      ? choices.current.targetId === target ? 'refresh' : 'switch' : 'start',
      activeFromRound: battle.round + 1,
      expireAfterRound: selected ? battle.round + selected.duration : null,
      reason: !selected ? '请选择原阵营敌方的存活目标。'
        : selected.cost > choices.pointsLeft ? '本场剩余平衡点数不足。' : '' };
  }
  function attempt(battle, actor, target, data) {
    const value = preview(battle, actor, target, data);
    if (!value || value.reason) return { ok: false, error: value?.reason || '没有可用的平衡资格或原版公式。' };
    return use(battle, data, rt => {
      const hero = heroOf(rt, actor.id);
      const result = rt.balance.activate(rt.bm, hero, heroOf(rt, target));
      if (!result.applied) return { ok: false, error: '平衡目标、资格或点数已变化。' };
      const message = rt.balance.activationSummary(hero, result);
      battle.log.push({ round: battle.round, at: Date.now(), balance: true, message });
      if (battle.log.length > 160) battle.log.shift();
      return { ok: true, applied: true, actor: actor.id, target,
        mode: result.mode, cost: result.cost, duration: result.duration,
        pointsLeft: result.pointsLeft, relation: clone(result.relation),
        summary: [message], results: [rt.balance.resultOf(hero, result)] };
    });
  }
  function pair(battle, actor, target) {
    if (!battle.balanceMeta || !actor || !target) return null;
    return use(clone(battle), undefined, rt => {
      const relation = rt.balance.pairRelation(rt.bm, heroOf(rt, actor.id), heroOf(rt, target.id));
      return relation ? clone(relation) : null;
    });
  }
  function priorityTarget(battle, actor) {
    if (!battle.balanceMeta || !actor) return null;
    return use(clone(battle), undefined, rt => {
      const target = rt.balance.currentTarget(rt.bm, heroOf(rt, actor.id));
      return target && target.teamType !== actor.side ? target.heroId : null;
    });
  }
  function npc(battle, data, excluded = [], random = () => fields.draw(battle)) {
    if (!battle.balanceMeta) return [];
    const choices = use(clone(battle), data, rt => rt.heroes.filter(hero =>
      hero.controller !== 'player' && hero.unit.hp > 0 && !hero.unit.offField &&
      !hero.unit.activeLeaving && !hero.unit.exiled && !hero.unit.possessedHidden && !excluded.includes(hero.heroId)).flatMap(hero => {
        const target = rt.balance.npcTarget(rt.bm, hero);
        return target ? [{ actor: hero.heroId, target: target.heroId }] : [];
      }));
    const outcomes = [];
    for (const choice of choices) {
      if (random() >= .3) continue;
      const actor = battle.units.find(unit => unit.id === choice.actor);
      const result = attempt(battle, actor, choice.target, data);
      if (result.ok) outcomes.push(result);
    }
    return outcomes;
  }
  function sweep(battle, endRound = false) {
    if (!battle.balanceMeta) return;
    use(battle, undefined, rt => {
      const results = endRound ? rt.balance.tick(rt.bm) : rt.balance.sweepInvalid(rt.bm);
      const reasons = { expired: '到期', 'caster-dead': '发动者倒下',
        'target-dead': '目标倒下', allied: '原阵营不再敌对' };
      for (const row of results) {
        battle.log.push({ round: battle.round, at: Date.now(), balance: true,
          message: `${row.actor} 与 ${row.target} 的平衡解除（${reasons[row.stage] || row.stage}）。` });
        if (battle.log.length > 160) battle.log.shift();
      }
    });
  }
  function finish(battle) {
    if (battle.balanceAuthority) battle.balanceAuthority.relations = {};
  }
  function statusLines(battle, actor) {
    if (!battle.balanceMeta || !actor) return [];
    return use(clone(battle), undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.balance;
      const lines = [];
      if (manager.eligible(hero)) lines.push(`平衡点数 ${manager.pointsLeft(rt.bm, hero)}/${manager.MAX_POINTS}`);
      for (const relation of [manager.outgoingOf(rt.bm, hero), ...manager.incomingOf(rt.bm, hero)].filter(Boolean)) {
        const caster = heroOf(rt, relation.casterId), target = heroOf(rt, relation.targetId);
        lines.push(`平衡：${caster.name} → ${target.name} · ${
          manager.relationActive(rt.bm, relation) ? `剩余${manager.remainingRounds(rt.bm, relation)}回合`
            : `第${relation.activeFromRound}回合起生效`}`);
      }
      return lines;
    });
  }
  const api = { initialize, options, preview, attempt, pair, priorityTarget, npc, sweep, finish,
    statusLines, defaults: () => ({ config: clone(original.CONFIG), maxPoints: original.MAX_POINTS }),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
