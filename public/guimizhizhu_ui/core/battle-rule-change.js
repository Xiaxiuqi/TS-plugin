(() => {
  'use strict';
  const KEY = 'cryptLord.battleRuleChange';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const copy = value => structuredClone(value);
  const present = actor => actor && actor.hp > 0 && !actor.offField && !actor.activeLeaving &&
    !actor.exiled && !actor.possessedHidden;
  const use = (battle, data, random, fn) => fields.withRuntime(battle, data, random, fn);
  const occupied = (battle, hero) => modules['cryptLord.battleHardControl']?.occupied(battle, hero.unit);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    if (battle.ruleChangeMeta) return;
    battle.ruleChangeMeta = { version: 1, config: JSON.parse(JSON.stringify(reference.ruleConfig())) };
    use(battle, undefined, undefined, rt => rt.ruleChange.initCap(rt.bm));
  }
  function resolvePlan(rt, hero, request, npc = false) {
    const m = rt.ruleChange, cfg = battleConfig(rt);
    const subs = npc ? m.availableNpcSubtypes(hero) : m.availableSubtypes(hero);
    if (!subs.includes(request?.subtype)) return null;
    const target = rt.heroes.find(row => row.heroId === request.target);
    if (m.isPresetSubtype(request.subtype))
      return m.buildPresetPlan(rt.bm, hero, request.subtype, request.presetKey, target);
    if (!cfg.RULE_CHANGE_SCOPES.includes(request.scope) ||
      !cfg.ruleChangeParams(m.dirOf(request.scope)).includes(request.param)) return null;
    const targets = m.targetsOf(rt.bm, hero, request.scope, target);
    return targets.length ? { subtype: request.subtype, scope: request.scope,
      param: request.param, targets } : null;
  }
  const battleConfig = rt => ({ ...reference.ruleConfig(), ...rt.bm.ruleConfig });
  function options(battle, actor, data) {
    if (!battle?.ruleChangeMeta || !present(actor) || occupied(battle, { unit: actor })) return [];
    return use(copy(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), m = rt.ruleChange;
      const cfg = battleConfig(rt);
      return m.availableSubtypes(hero).map(subtype => ({
        subtype, name: m.displayName(hero, subtype), description: m.cfgOf(subtype).desc,
        reason: m.blockedReason(rt.bm, hero), cost: m.costOf(hero),
        balance: hero.additionalStats.当前灵性,
        after: Math.max(0, hero.additionalStats.当前灵性 - m.costOf(hero)),
        casterScore: m.casterStatAfterCost(hero),
        scopes: cfg.RULE_CHANGE_SCOPES.slice(),
        params: Object.entries(cfg.RULE_CHANGE_PARAMS).map(([key, row]) =>
          ({ key, label: row.label, dir: row.dir })),
        presets: m.presetsOf(subtype).map(row => ({ key: row.key, label: row.label })),
        targets: m.foeTargets(rt.bm, hero).filter(row => row.health > 0)
          .map(row => ({ id: row.heroId, name: row.name })),
        rivals: m.rivals(rt.bm, hero).map(row => ({ id: row.heroId, name: row.name,
          score: rt.enemyControl.bestStat(row) })),
      }));
    });
  }
  function preview(battle, actor, request, data) {
    if (!battle?.ruleChangeMeta || !present(actor) || occupied(battle, { unit: actor }))
      return { ok: false, reason: '当前不能改写规则。', parts: [] };
    return use(copy(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), m = rt.ruleChange;
      const reason = m.blockedReason(rt.bm, hero), plan = resolvePlan(rt, hero, request);
      if (reason || !plan) return { ok: false, reason: reason || '请选择合法的规则参数和目标。', parts: [] };
      const parts = plan.parts || [{ ...plan, power: m.powerOf(hero, plan.targets[0], plan.scope) }];
      return { ok: true, reason: '', parts: parts.map(part => ({
        scope: part.scope, param: part.param, power: part.power,
        label: reference.ruleConfig().ruleChangeParamLabel(part.param),
        sign: reference.ruleConfig().ruleChangeParamSign(part.param),
        targets: part.targets.map(row => ({ id: row.heroId, name: row.name })),
      })) };
    });
  }
  // Plans cross separate runtimes using IDs only; fees and rolls are committed before arbitration.
  function pack(attempt, cost) {
    return { actor: attempt.caster.heroId, subtype: attempt.subtype, shownAs: attempt.shownAs,
      scope: attempt.scope, param: attempt.param, cost,
      targets: attempt.targets.map(row => row.heroId), presetKey: attempt.presetKey,
      presetLabel: attempt.presetLabel, ownerMode: attempt.ownerMode,
      parts: attempt.parts?.map(part => ({ ...part, targets: part.targets.map(row => row.heroId) })) || null,
      contest: { win: attempt.contest.win, rolls: attempt.contest.rolls.map(row =>
        ({ rival: row.rival.heroId, roll: copy(row.roll) })) } };
  }
  function prepare(battle, data, random, excluded = [], request = null) {
    if (!battle.ruleChangeMeta) return [];
    return use(battle, data, random, rt => {
      const rows = [], m = rt.ruleChange;
      m.sweep(rt.bm);
      const eligible = hero => present(hero.unit) && !occupied(battle, hero) &&
        !excluded.includes(hero.heroId);
      const add = (hero, plan) => {
        if (plan) rows.push(pack(m.attempt(rt.bm, hero, plan), m.costOf(hero)));
      };
      if (request) {
        const hero = rt.heroes.find(row => row.dataSource === 'player');
        if (hero && eligible(hero) && !m.blockedReason(rt.bm, hero))
          add(hero, resolvePlan(rt, hero, request));
      }
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || !eligible(hero) || !m.npcShouldTry(rt.bm, hero) ||
          rt.dice() * 100 >= battle.ruleChangeMeta.config.RULE_CHANGE_NPC_CHANCE) continue;
        add(hero, m.npcPlan(rt.bm, hero));
      }
      return rows;
    });
  }
  function apply(battle, data, random, prepared) {
    if (!battle.ruleChangeMeta) return [];
    return use(battle, data, random, rt => {
      const find = id => rt.heroes.find(row => row.heroId === id);
      const unpackTargets = ids => ids.map(find).filter(Boolean);
      const attempts = (prepared || []).map(row => ({ ...row, caster: find(row.actor),
        targets: unpackTargets(row.targets),
        parts: row.parts?.map(part => ({ ...part, targets: unpackTargets(part.targets) })) || null,
        contest: { win: row.contest.win,
          rolls: row.contest.rolls.map(roll => ({ ...roll, rival: find(roll.rival) })).filter(roll => roll.rival) },
      })).filter(row => row.caster);
      const summary = rt.ruleChange.drainLines(rt.bm), results = [];
      rt.ruleChange.arbitrate(rt.bm, attempts, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return attempts.map(row => ({ actor: row.actor, subtype: row.subtype, cost: row.cost,
        contest: copy(prepared.find(item => item.actor === row.actor).contest),
        results: copy(results.filter(result => result.actor === row.caster.name)),
        outcome: results.some(result => result.actor === row.caster.name) ? 'applied'
          : row.contest.win ? 'superseded' : 'resisted' }));
    });
  }
  function sweep(battle) {
    if (!battle.ruleChangeMeta) return;
    use(battle, undefined, undefined, rt => {
      rt.ruleChange.sweep(rt.bm);
      rt.ruleChange.drainLines(rt.bm).forEach(line => rt.bm.battleLogger.log(line));
    });
  }
  function finish(battle) {
    if (!battle.ruleChangeMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const entry of rt.ruleChange.slotsOf(rt.bm).slice()) rt.ruleChange.evict(rt.bm, entry);
      rt.ruleChange.drainLines(rt.bm).forEach(line => rt.bm.battleLogger.log(line));
    });
  }
  function slots(battle) {
    if (!battle?.ruleChangeMeta) return { cap: 0, entries: [] };
    return use(copy(battle), undefined, undefined, rt => {
      rt.ruleChange.sweep(rt.bm);
      return { cap: rt.ruleChange.capOf(rt.bm), entries: rt.ruleChange.slotsOf(rt.bm)
        .map(entry => ({ id: entry.id, side: rt.ruleChange.sideOf(rt.bm, entry),
          description: rt.ruleChange.describe(rt.bm, entry) })) };
    });
  }
  function statusLines(battle, actor) {
    const params = reference.ruleConfig().RULE_CHANGE_PARAMS;
    return (actor.effects || []).filter(row => row.ruleChange)
      .map(row => {
        const meta = Object.values(params).find(param => param.stat === row.stat && param.type === row.type);
        return `${row.name} · ${meta?.sign || '+'}${row.power}% · 战斗内持续`;
      });
  }
  const api = { initialize, options, preview, prepare, apply, sweep, finish, slots, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
