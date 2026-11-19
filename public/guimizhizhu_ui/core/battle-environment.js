(() => {
  'use strict';
  const KEY = 'cryptLord.battleEnvironment';
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
  const occupied = (battle, actor) => modules['cryptLord.battleHardControl']?.occupied(battle, actor);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    if (battle.environmentMeta) return;
    battle.environmentMeta = { version: 1, config: reference.environmentConfig() };
    use(battle, undefined, undefined, rt => {
      battle.naturalEnv = rt.environmentCatalog.parseNatural(battle.naturalEnv);
      rt.bm.board.naturalEnv = battle.naturalEnv;
      rt.environment.initSlots(rt.bm);
    });
  }
  const slotRows = rt => reference.environmentConfig().ENV_KINDS.map(kind => {
    const slot = rt.environment.slotStateOf(rt.bm, kind);
    return { kind, state: slot.state, name: slot.name,
      actor: slot.entry?.casterName || '',
      side: slot.entry ? rt.environment.ownerSideOf(rt.bm, slot.entry) : null,
      natural: rt.environment.naturalValueOf(rt.bm, kind) || '' };
  });
  function options(battle, actor, data) {
    if (!battle?.environmentMeta || !present(actor) || occupied(battle, actor)) return [];
    return use(copy(battle), data, undefined, rt => {
      const m = rt.environment, hero = rt.heroes.find(row => row.heroId === actor.id);
      return m.availableSubtypes(hero).map(subtype => {
        const cfg = m.SUBTYPES[subtype], stat = m.statKeyOf(subtype), cost = m.costOf(hero, subtype);
        return { subtype, name: m.displayName(hero, subtype), description: cfg.desc,
          stat, cost, balance: hero.additionalStats[`当前${stat}`],
          after: Math.max(0, hero.additionalStats[`当前${stat}`] - cost),
          casterScore: m.casterStatAfterCost(hero, subtype),
          reason: m.blockedReason(rt.bm, hero, subtype),
          note: cfg.effectNote?.({ bm: rt.bm, hero, subtype, cfg }) || '',
          slots: m.writesOf(subtype).map(kind => ({ kind,
            next: m.envNameFor(subtype, kind), ...m.slotStateOf(rt.bm, kind), entry: undefined })),
          rivals: m.rivals(rt.bm, hero).map(row =>
            ({ id: row.heroId, name: row.name, score: rt.enemyControl.bestStat(row) })) };
      });
    });
  }
  // Preview the actual prospective layer, including self-rank weather and movement.
  function preview(battle, actor, subtype, data) {
    if (!battle?.environmentMeta || !present(actor) || occupied(battle, actor))
      return { ok: false, reason: '当前不能改变环境。', rows: [] };
    return use(copy(battle), data, undefined, rt => {
      const m = rt.environment, hero = rt.heroes.find(row => row.heroId === actor.id);
      if (!m.availableSubtypes(hero).includes(subtype))
        return { ok: false, reason: '没有这项改变环境能力。', rows: [] };
      const reason = m.blockedReason(rt.bm, hero, subtype);
      if (reason) return { ok: false, reason, rows: [] };
      for (const kind of m.writesOf(subtype)) m.admit(rt.bm, m.buildEntry(rt.bm, hero, subtype, kind));
      const layers = m.writesOf(subtype).map(kind => m.layerOf(rt.bm, kind));
      const rows = [];
      for (const target of rt.heroes.filter(row => present(row.unit))) {
        m.removeFrom(target);
        target.envMoveBonus = 0;
        for (const layer of layers) m.applyTo(rt.bm, target, layer);
        rows.push({ id: target.heroId, name: target.name, side: target.teamType,
          effects: target.effects.filter(row => row.environment).map(row =>
            ({ name: row.name, stat: row.stat, type: row.type, power: row.power })),
          move: target.envMoveBonus || 0 });
      }
      return { ok: true, reason: '', rows };
    });
  }
  function pack(attempt, stat, cost) {
    return { actor: attempt.caster.heroId, subtype: attempt.subtype,
      shownAs: attempt.shownAs, stat, cost,
      contest: { win: attempt.contest.win, rolls: attempt.contest.rolls.map(row =>
        ({ rival: row.rival.heroId, roll: copy(row.roll) })) } };
  }
  function prepare(battle, data, random, excluded = [], request = null) {
    if (!battle.environmentMeta) return [];
    return use(battle, data, random, rt => {
      const rows = [], m = rt.environment;
      m.sweep(rt.bm);
      const add = (hero, subtype) => rows.push(pack(m.attempt(rt.bm, hero, { subtype }),
        m.statKeyOf(subtype), m.costOf(hero, subtype)));
      const available = hero => present(hero.unit) && !occupied(battle, hero.unit) &&
        !excluded.includes(hero.heroId);
      if (request) {
        const hero = rt.heroes.find(row => row.dataSource === 'player');
        if (hero && available(hero) && m.availableSubtypes(hero).includes(request.subtype) &&
          !m.blockedReason(rt.bm, hero, request.subtype)) add(hero, request.subtype);
      }
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || !available(hero) || !m.npcShouldTry(rt.bm, hero) ||
          rt.dice() * 100 >= battle.environmentMeta.config.ENV_NPC_CHANCE) continue;
        const plan = m.npcPlan(rt.bm, hero);
        if (plan) add(hero, plan.subtype);
      }
      return rows;
    });
  }
  function report(rt, results) {
    for (const result of results) {
      const custom = rt.environment.SUBTYPES[result.subtype]?.report?.[result.stage];
      const line = typeof custom === 'function' ? custom(result)
        : result.stage === 'start' ? `${result.actor}以「${result.shownAs}」将${result.slotKind}改为${result.envName}。`
          : result.stage === 'replaced' ? `原本的「${result.replaced}」被「${result.envName}」顶替。`
            : `${result.actor}的「${result.envName}」消散，${result.slotKind}回落为${result.fallback || '空'}。`;
      rt.bm.battleLogger.log(line);
    }
  }
  function apply(battle, data, random, prepared) {
    if (!battle.environmentMeta) return [];
    return use(battle, data, random, rt => {
      const find = id => rt.heroes.find(row => row.heroId === id), m = rt.environment;
      const attempts = (prepared || []).map(row => ({ ...row, caster: find(row.actor),
        contest: { win: row.contest.win,
          rolls: row.contest.rolls.map(roll => ({ ...roll, rival: find(roll.rival) })).filter(row => row.rival) },
      })).filter(row => row.caster);
      const summary = m.drainLines(rt.bm), results = m.drainResults(rt.bm);
      m.arbitrate(rt.bm, attempts, summary, results);
      m.resync(rt.bm);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      report(rt, results);
      return attempts.map(row => ({ actor: row.actor, subtype: row.subtype, stat: row.stat, cost: row.cost,
        contest: copy(prepared.find(item => item.actor === row.actor).contest),
        results: copy(results.filter(result => result.actor === row.caster.name)),
        outcome: results.some(result => result.stage === 'start' && result.actor === row.caster.name)
          ? 'applied' : row.contest.win ? 'superseded' : 'resisted' }));
    });
  }
  function sync(battle) {
    if (!battle.environmentMeta) return;
    use(battle, undefined, undefined, rt => {
      rt.environment.sweep(rt.bm);
      rt.environment.resync(rt.bm);
      rt.environment.drainLines(rt.bm).forEach(line => rt.bm.battleLogger.log(line));
      report(rt, rt.environment.drainResults(rt.bm));
    });
  }
  function finish(battle) {
    if (!battle.environmentMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const entry of Object.values(rt.environment.slotsOf(rt.bm)).filter(Boolean))
        rt.environment.evict(rt.bm, entry);
      for (const hero of rt.heroes) { rt.environment.removeFrom(hero); hero.envMoveBonus = 0; }
      rt.environment.drainLines(rt.bm);
      rt.environment.drainResults(rt.bm);
    });
  }
  function slots(battle) {
    if (!battle?.environmentMeta) return [];
    return use(copy(battle), undefined, undefined, rt => {
      rt.environment.sweep(rt.bm);
      return slotRows(rt);
    });
  }
  function statusLines(battle, actor) {
    if (!battle?.environmentMeta) return [];
    const rows = (actor.effects || []).filter(row => row.environment).map(row => {
      const sign = row.stat === 'damageTakenDecrease' ? '-' : row.type === 'debuff' ? '-' : '+';
      return `${row.name} · ${sign}${row.power}% · 环境持续`;
    });
    if (actor.envMoveBonus > 0) rows.push(`环境移动力 +${actor.envMoveBonus} 格`);
    return rows;
  }
  const api = { initialize, options, preview, prepare, apply, sync, finish, slots, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
