(() => {
  'use strict';
  const KEY = 'cryptLord.battleFundamental';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const copy = value => structuredClone(value);
  const present = actor => actor && actor.hp > 0 && !actor.offField && !actor.activeLeaving &&
    !actor.exiled && !actor.possessedHidden;
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  function initialize(battle, pathways) {
    if (!battle.formulas) return;
    fields.initialize(battle, pathways);
    battle.fundamentalMeta ||= { version: 1 };
    use(battle, undefined, undefined, rt => rt.formulaEngine.ensure(rt.bm));
  }
  function gate(battle, actor) {
    return !present(actor) ? '施法者不在场上。'
      : modules['cryptLord.battleHardControl']?.occupied(battle, actor) ? '本轮受到硬控。' : '';
  }
  function options(battle, actor, data) {
    if (!battle?.fundamentalMeta || gate(battle, actor)) return [];
    return use(copy(battle), data, undefined, rt => {
      const m = rt.fundamental, hero = rt.heroes.find(row => row.heroId === actor.id);
      return m.availableSubtypes(hero).map(subtype => ({
        subtype, name: m.displayName(hero, subtype), description: m.description(hero, subtype),
        maxAtoms: m.maxAtoms(hero, subtype), stat: m.costStatOf(subtype),
        atoms: m.allowedAtoms(subtype).map(def => ({ ...copy(def),
          familyLabel: rt.formulaEngine.FAMILY_LABELS[def.family],
          current: rt.formulaEngine.value(rt.bm, def.id) })),
      }));
    });
  }
  function inspect(rt, battle, actor, request) {
    const reason = gate(battle, actor);
    if (reason) return { ok: false, reason };
    const m = rt.fundamental, hero = rt.heroes.find(row => row.heroId === actor.id);
    const subtype = request?.subtype;
    const checked = m.sanitizeMutations(hero, subtype, request?.mutations);
    if (!checked.ok) return { ok: false, reason: checked.error };
    const count = checked.mutations.length, cost = m.costOf(hero, subtype, count);
    const stat = m.costStatOf(subtype), balance = hero.additionalStats[m.costFieldOf(subtype)];
    const validation = m.validateProspective(rt.bm, hero, subtype, checked.mutations);
    const blocked = !validation.ok ? validation.error : balance < cost
      ? `当前${stat}不足，需要 ${cost}。`
      : !m.canPossiblyWinAll(rt.bm, hero, subtype, count) ? '场上有无论如何也压不过的规则对抗者。' : '';
    const old = m.activeLawOf(rt.bm, hero);
    return { ok: !blocked, valid: validation.ok, reason: blocked, count, cost, stat, balance,
      after: Math.max(0, balance - cost), duration: m.durationOf(hero, subtype, count),
      casterScore: m.casterStatAfterCost(hero, subtype, count),
      old: old ? { name: old.displayName, endRound: old.endRound } : null,
      rivals: m.rivals(rt.bm, hero).map(row => ({ id: row.heroId, name: row.name,
        score: rt.enemyControl.bestStat(row) })),
      mutations: checked.mutations.map(row => ({ ...row,
        label: rt.formulaEngine.definition(row.atomId).label,
        family: rt.formulaEngine.FAMILY_LABELS[rt.formulaEngine.definition(row.atomId).family],
        current: rt.formulaEngine.formatValue(row.atomId, rt.formulaEngine.value(rt.bm, row.atomId)),
        next: rt.formulaEngine.formatValue(row.atomId, row.value) })),
    };
  }
  function preview(battle, actor, request, data) {
    if (!battle?.fundamentalMeta) return { ok: false, reason: '本场底层规则模块未启用。' };
    return use(copy(battle), data, undefined, rt => inspect(rt, battle, actor, request));
  }
  function apply(battle, actor, request, data, random) {
    if (!battle?.fundamentalMeta) return { ok: false, error: '本场底层规则模块未启用。' };
    return use(battle, data, random, rt => {
      const check = inspect(rt, battle, actor, request);
      if (!check.ok) return { ok: false, error: check.reason };
      const summary = [], results = [], m = rt.fundamental;
      const result = m.attempt(rt.bm, rt.heroes.find(row => row.heroId === actor.id),
        request.subtype, request.mutations, request.reportText, summary, results);
      if (!result.ok) return result;
      summary.forEach(line => rt.bm.battleLogger.log(line));
      for (const row of results.filter(row => row.stage === 'start'))
        rt.bm.battleLogger.log(m.reportLine(row.actor, row.displayName, row.supplement));
      return { ok: true, actor: actor.id, subtype: request.subtype, cost: result.cost,
        declaration: { subtype: request.subtype,
          mutations: check.mutations.map(({ atomId, value }) => ({ atomId, value })),
          reportText: m.sanitizeReportText(request.reportText) },
        stat: check.stat, outcome: result.applied ? 'applied' : 'resisted',
        lawId: result.law?.id, results: copy(results),
        contest: { win: result.contest.win, rolls: result.contest.rolls.map(row =>
          ({ rival: row.rival.heroId, roll: copy(row.roll) })) } };
    });
  }
  function sweep(battle, endRound = false) {
    if (!battle?.fundamentalMeta) return;
    use(battle, undefined, undefined, rt => {
      const summary = [], results = [];
      rt.fundamental.sweepDead(rt.bm, summary, results);
      if (endRound) rt.fundamental.tick(rt.bm, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
    });
  }
  function finish(battle) {
    if (!battle?.fundamentalMeta) return;
    use(battle, undefined, undefined, rt => {
      const summary = [];
      for (const law of rt.formulaEngine.ensure(rt.bm).laws)
        rt.fundamental.removeLaw(rt.bm, law, 'finished', summary);
      summary.forEach(line => rt.bm.battleLogger.log(line));
    });
  }
  function rows(battle) {
    if (!battle?.fundamentalMeta) return [];
    return use(copy(battle), undefined, undefined, rt => {
      rt.fundamental.sweepDead(rt.bm);
      return rt.fundamental.currentRows(rt.bm).map(row => ({
        id: row.law.id, source: row.law.sourceName, name: row.law.displayName,
        atomId: row.atomId, family: rt.formulaEngine.FAMILY_LABELS[rt.formulaEngine.definition(row.atomId).family],
        label: row.label, value: rt.formulaEngine.formatValue(row.atomId, row.value),
        effective: row.effective, pending: row.pending, suppressed: row.suppressed,
        remaining: row.remaining,
      }));
    });
  }
  function resolve(battle, id) {
    // Resolver's original ensure may normalize a legacy state; a read must not save that normalization.
    return use(copy(battle), undefined, undefined, rt => {
      const row = rt.formulaEngine.resolve(rt.bm, id);
      return { value: row.value, lawId: row.law?.id || null,
        suppressed: row.suppressed.map(item => ({ atomId: item.atomId, lawId: item.layer.law?.id })) };
    });
  }
  const api = { initialize, options, preview, apply, sweep, finish, rows, resolve,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
