(() => {
  'use strict';
  const KEY = 'cryptLord.battlePossession';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const permanent = modules['cryptLord.battlePermanentControl'];
  const hard = modules['cryptLord.battleHardControl'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const copy = value => structuredClone(value);
  const present = actor => actor?.hp > 0 && !actor.offField && !actor.exiled &&
    !actor.activeLeaving && !actor.possessedHidden;
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  function initialize(battle, pathways) {
    permanent.initialize(battle, pathways);
    battle.possessionMeta ||= { version: 1, config: reference.possessionConfig() };
    battle.possession ||= { processes: [] };
  }
  function details(rt, hero, subtype) {
    const m = rt.possession, stat = m.statKeyOf(hero, subtype);
    const balance = hero.additionalStats[`当前${stat}`], cost = m.costOf(hero, subtype);
    return { subtype, stat, balance, cost, after: Math.max(0, balance - cost) };
  }
  function options(battle, actor, data) {
    if (!battle?.possessionMeta || !actor || actor.hp <= 0) return null;
    return use(copy(battle), data, undefined, rt => {
      const m = rt.possession, hero = m.findHero(rt.bm, actor.id);
      const p = m.processOf(rt.bm, actor.id);
      if (p) {
        const check = m.canContinue(rt.bm, p), occupied = hard.occupied(battle, actor);
        return { active: true, ...details(rt, hero, p.subtype), target: p.targetId,
          name: check.target?.name || p.targetId,
          defense: check.target ? m.targetStatOf(check.target, p.subtype) : 0,
          canContinue: check.ok && !occupied,
          reason: occupied ? '本轮受到硬控，只能解除附身。' : check.ok ? '' :
            m.RELEASE_TEXT[check.reason] || '无法继续附身。', choices: [] };
      }
      if (!present(actor) || hard.occupied(battle, actor)) return null;
      const eligibility = m.resolveEligibility(hero.sequenceString);
      return { active: false, choices: m.subtypes().filter(subtype => eligibility[subtype])
        .map(subtype => {
          const targets = m.possessTargets(rt.bm, hero, subtype)
            .filter(target => present(target.unit))
            .map(target => ({ id: target.heroId, name: target.name, defense: m.targetStatOf(target, subtype) }));
          return { ...details(rt, hero, subtype), targets,
            reason: !m.hasStat(hero, subtype) ? '当前出手属性为0，无法附身。' :
              !targets.length ? '没有理论上可以赢得拼点的在场敌人。' : '' };
        }) };
    });
  }
  // Maintenance is mandatory and consumes the tactic even when it fails or releases the host.
  function maintain(battle, data, random, excluded = [], request = null) {
    if (!battle.possessionMeta) return [];
    return use(battle, data, random, rt => {
      const m = rt.possession, rows = [];
      for (const p of m.ensure(rt.bm).processes.slice()) {
        const hero = m.findHero(rt.bm, p.casterId);
        const primary = hero?.dataSource === 'player';
        const check = m.canContinue(rt.bm, p), summary = [], results = [];
        let outcome = 'released', cost = 0, stat = null;
        const interrupted = hard.occupied(battle, hero?.unit) || excluded.includes(p.casterId);
        if (primary && request?.mode !== 'continue')
          m.release(rt.bm, p, request?.mode === 'release' ? 'manual' : 'skip', summary, results);
        else if (!check.ok || interrupted)
          m.release(rt.bm, p, interrupted ? 'skip' : check.reason, summary, results);
        else {
          ({ cost, stat } = details(rt, hero, p.subtype));
          outcome = m.upkeep(rt.bm, p, summary, results) ? 'maintained' : 'released';
        }
        // Original successful upkeep belongs to the tactic result, not the accumulating battle log.
        if (outcome !== 'maintained') summary.forEach(line => rt.bm.battleLogger.log(line));
        rows.push({ actor: p.casterId, target: p.targetId, subtype: p.subtype,
          outcome, cost, stat, summary, results });
      }
      return rows;
    });
  }
  function prepare(battle, data, random, excluded = [], request = null) {
    if (!battle.possessionMeta) return [];
    return use(battle, data, random, rt => {
      const m = rt.possession, rows = [];
      const append = (hero, subtype, target) => {
        const spent = m.spend(hero, subtype);
        const roll = m.contest(hero, target, subtype, hero.additionalStats[spent.field]);
        rows.push({ actor: hero.heroId, target: target.heroId, subtype, stat: spent.key,
          cost: spent.cost, roll });
      };
      for (const hero of rt.heroes) {
        if (!present(hero.unit) || hard.occupied(battle, hero.unit) ||
          excluded.includes(hero.heroId) || m.processOf(rt.bm, hero.heroId)) continue;
        const primary = hero.dataSource === 'player';
        if (hero.controller === 'player' && !primary) continue;
        const hits = m.subtypes().filter(subtype =>
          m.canPossess(rt.bm, hero, subtype) && m.hasStat(hero, subtype) &&
          m.possessTargets(rt.bm, hero, subtype).some(target => present(target.unit)) &&
          (primary ? request?.subtype === subtype :
            rt.dice() * 100 < battle.possessionMeta.config.POSSESS_NPC_CHANCE));
        if (!hits.length) continue;
        const subtype = primary ? hits[0] : hits[Math.floor(rt.dice() * hits.length)];
        const pool = m.possessTargets(rt.bm, hero, subtype).filter(target => present(target.unit));
        const target = primary ? pool.find(target => target.heroId === request?.target) :
          pool[Math.floor(rt.dice() * pool.length)];
        if (target) append(hero, subtype, target);
      }
      return rows;
    });
  }
  function apply(battle, data, random, prepared) {
    if (!prepared?.length) return [];
    return use(battle, data, random, rt => {
      const attempts = prepared.map(row => ({ ...row,
        caster: rt.possession.findHero(rt.bm, row.actor),
        target: rt.possession.findHero(rt.bm, row.target),
      })).filter(row => row.caster && row.target);
      const summary = [], results = [];
      rt.possession.arbitrate(rt.bm, attempts, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return attempts.map(row => ({ actor: row.actor, target: row.target.heroId,
        subtype: row.subtype, cost: row.cost, stat: row.stat, roll: row.roll,
        outcome: results.some(result => result.actor === row.caster.name &&
          result.target === row.target.name) ? 'applied' : row.roll.win ? 'superseded' : 'resisted',
        summary: summary.filter(line => line.startsWith(`✓ ${row.caster.name} `) ||
          line.startsWith(`✗ ${row.caster.name} `)) }));
    });
  }
  function sweep(battle) {
    if (!battle.possessionMeta) return;
    use(battle, undefined, undefined, rt =>
      rt.possession.checkRelease(rt.bm).forEach(line => rt.bm.battleLogger.log(line)));
  }
  function finish(battle) {
    if (!battle.possessionMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const p of rt.possession.ensure(rt.bm).processes.slice())
        rt.possession.release(rt.bm, p, 'invalid', null, null);
    });
  }
  function statusLines(battle, actor) {
    if (!battle.possessionMeta) return [];
    return battle.possession.processes.flatMap(p => {
      if (p.casterId === actor.id) return [`${p.subtype} · 本体离场 · 正在操控 ${
        battle.units.find(unit => unit.id === p.targetId)?.name || p.targetId} · 下轮须维持`];
      if (p.targetId === actor.id) return [`${p.subtype} · 被 ${
        battle.units.find(unit => unit.id === p.casterId)?.name || p.casterId} 附身 · 解除后恢复原阵营`];
      return [];
    });
  }
  const api = { initialize, options, maintain, prepare, apply, sweep, finish, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
