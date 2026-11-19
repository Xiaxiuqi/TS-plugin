(() => {
  'use strict';
  const KEY = 'cryptLord.battleTempControl';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const hard = modules['cryptLord.battleHardControl'];
  const copy = value => structuredClone(value);
  const present = actor => actor && actor.hp > 0 && !actor.offField && !actor.activeLeaving && !actor.exiled && !actor.possessedHidden;
  const use = (battle, data, random, fn) => fields.withRuntime(battle, data, random, fn);
  function initialize(battle, pathways) {
    hard.initialize(battle, pathways);
    battle.tempControlMeta ||= { version: 1, config: reference.tempConfig() };
    battle.tempAllegiance ||= { processes: [] };
  }
  function options(battle, actor, data) {
    if (!battle?.tempControlMeta || !present(actor) || hard.occupied(battle, actor)) return [];
    return use(copy(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), m = rt.tempAllegiance;
      const eligibility = m.resolveEligibility(hero.sequenceString);
      return m.subtypes().filter(key => eligibility[key]).map(subtype => {
        const targets = m.tempTargets(rt.bm, hero, subtype).map(target => ({
          id: target.heroId, name: target.name, defense: m.targetStatOf(target),
        }));
        const stat = m.statKeyOf(hero, subtype);
        const current = m.processOf(rt.bm, hero.heroId);
        return { subtype, stat, balance: hero.additionalStats[m.fieldOf(stat)],
          cost: m.costOf(hero, subtype), after: m.statAfterCost(hero, subtype), targets,
          current: current ? copy(current) : null,
          reason: current ? '当前已维持一名临时友军，等待下一战斗回合结束后才能再次发动。'
            : !m.hasStat(hero, subtype) ? `当前${stat}为 0，无法发起。`
              : !targets.length ? '没有理论上可以赢得拼点的在场敌人。' : '' };
      });
    });
  }
  // Preserve the pre-arbitration payment and contest even when another tactic converts the target.
  function prepare(battle, data, random, excluded = [], request = null) {
    if (!battle.tempControlMeta) return [];
    return use(battle, data, random, rt => {
      const m = rt.tempAllegiance, rows = [];
      const append = (hero, subtype, target) => {
        const spent = m.spend(hero, subtype);
        rows.push({ actor: hero.heroId, target: target.heroId, subtype, spent,
          roll: m.contest(hero, target, hero.additionalStats[spent.field]) });
      };
      if (request) {
        const hero = rt.heroes.find(row => row.dataSource === 'player');
        const target = present(hero?.unit) && !hard.occupied(battle, hero.unit) &&
          m.canUse(rt.bm, hero, request.subtype) && m.hasStat(hero, request.subtype)
          ? m.tempTargets(rt.bm, hero, request.subtype).find(row => row.heroId === request.target) : null;
        if (target) append(hero, request.subtype, target);
      }
      for (const hero of rt.heroes) {
        if (hero.controller === 'player' || !present(hero.unit) ||
          hard.occupied(battle, hero.unit) || excluded.includes(hero.heroId)) continue;
        const hits = m.subtypes().filter(subtype =>
          m.canUse(rt.bm, hero, subtype) && m.hasStat(hero, subtype) &&
          m.tempTargets(rt.bm, hero, subtype).length &&
          rt.dice() * 100 < battle.tempControlMeta.config.TEMP_NPC_CHANCE);
        if (!hits.length) continue;
        const subtype = hits[Math.floor(rt.dice() * hits.length)];
        const pool = m.tempTargets(rt.bm, hero, subtype);
        append(hero, subtype, pool[Math.floor(rt.dice() * pool.length)]);
      }
      return rows;
    });
  }
  function apply(battle, data, random, prepared) {
    if (!prepared?.length) return [];
    return use(battle, data, random, rt => {
      const attempts = prepared.map(row => ({ ...row,
        caster: rt.heroes.find(hero => hero.heroId === row.actor),
        target: rt.heroes.find(hero => hero.heroId === row.target),
      })).filter(row => row.caster && row.target);
      const summary = [], results = [];
      rt.tempAllegiance.arbitrate(rt.bm, attempts, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return attempts.map(row => ({ actor: row.actor, target: row.target.heroId,
        subtype: row.subtype, stat: row.spent.key, cost: row.spent.cost, roll: row.roll,
        outcome: results.some(result => result.actor === row.caster.name &&
          result.target === row.target.name && result.subtype === row.subtype) ? 'applied'
          : row.roll.win ? 'superseded' : 'resisted',
        summary: summary.filter(line => line.startsWith(`✓ ${row.caster.name} `) ||
          line.startsWith(`✗ ${row.caster.name} `)) }));
    });
  }
  function endRound(battle) {
    if (!battle.tempControlMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const row of rt.tempAllegiance.tick(rt.bm))
        rt.bm.battleLogger.log(`${row.actor} 对 ${row.target} 的「${row.subtype}」结束，目标恢复原阵营。`);
    });
  }
  function finish(battle) {
    if (battle.tempControlMeta) use(battle, undefined, undefined, rt => rt.tempAllegiance.releaseAll(rt.bm));
  }
  const originSide = (battle, actor) => battle.tempAllegiance?.processes
    .find(row => row.targetId === actor.id)?.originTeamType || actor.side;
  function statusLines(battle, actor) {
    if (!battle.tempControlMeta) return [];
    const lines = [];
    for (const row of battle.tempAllegiance?.processes || []) {
      if (row.subtype === '心智剥夺') continue;
      if (row.targetId === actor.id)
        lines.push(`${row.subtype} · 临时友军 · 第 ${row.expireRound} 回合结束恢复原阵营`);
      if (row.casterId === actor.id)
        lines.push(`${row.subtype} · 维持 ${battle.units.find(unit => unit.id === row.targetId)?.name || row.targetId}`);
    }
    return lines;
  }
  const api = { initialize, options, prepare, apply, endRound, finish, originSide, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
