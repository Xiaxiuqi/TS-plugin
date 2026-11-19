(() => {
  'use strict';
  const KEY = 'cryptLord.battleMindDeprive';
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
    battle.mindDepriveMeta ||= { version: 1, config: reference.mindConfig() };
    battle.tempAllegiance ||= { processes: [] };
  }
  function options(battle, actor, data) {
    if (!battle?.mindDepriveMeta || !present(actor) || hard.occupied(battle, actor)) return null;
    return use(copy(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id), m = rt.mindDeprive;
      if (!m.canUse(rt.bm, hero)) return null;
      const targets = m.targetsInRange(rt.bm, hero).map(target => ({
        id: target.heroId, name: target.name, defense: m.targetStatOf(target),
      }));
      return { cost: m.costOf(hero), humanity: actor.humanity, after: m.statAfterCost(hero),
        radius: battle.mindDepriveMeta.config.MIND_DEPRIVE_RADIUS,
        tremblePct: battle.mindDepriveMeta.config.MIND_DEPRIVE_TREMBLE_PCT, targets,
        odds: copy(battle.mindDepriveMeta.config.MIND_DEPRIVE_OUTCOMES),
        reason: !m.hasStat(hero) ? '当前人性为 0，无法发起。'
          : !targets.length ? '范围内没有理论上可以赢得拼点的在场敌人。' : '' };
    });
  }
  // Snapshot per-target contests before other tactics; arbitrate after their conversions and movement.
  function prepare(battle, data, random, excluded = [], playerRequest = false) {
    if (!battle.mindDepriveMeta) return [];
    return use(battle, data, random, rt => {
      const m = rt.mindDeprive, rows = [];
      for (const hero of rt.heroes) {
        const player = hero.dataSource === 'player';
        if (!present(hero.unit) || hard.occupied(battle, hero.unit) ||
          !m.canUse(rt.bm, hero) || !m.hasStat(hero) ||
          (player ? !playerRequest : hero.controller === 'player' || excluded.includes(hero.heroId))) continue;
        const pool = m.targetsInRange(rt.bm, hero);
        if (!pool.length || !player &&
          rt.dice() * 100 >= battle.mindDepriveMeta.config.MIND_DEPRIVE_NPC_CHANCE) continue;
        const spent = m.spend(hero), stat = hero.additionalStats[m.fieldOf(m.statKeyOf())];
        rows.push({ actor: hero.heroId, spent, attempts: pool.map(target => ({
          target: target.heroId, roll: m.contest(hero, target, stat),
        })) });
      }
      return rows;
    });
  }
  function apply(battle, data, random, prepared) {
    if (!prepared?.length) return [];
    return use(battle, data, random, rt => {
      const attempts = prepared.flatMap(row => row.attempts.map(hit => ({
        ...hit, caster: rt.heroes.find(hero => hero.heroId === row.actor),
        target: rt.heroes.find(hero => hero.heroId === hit.target),
      }))).filter(row => row.caster && row.target);
      const summary = [], results = [];
      rt.mindDeprive.arbitrate(rt.bm, attempts, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return prepared.map(row => {
        const caster = rt.heroes.find(hero => hero.heroId === row.actor);
        return { actor: row.actor, outcome: 'mind-deprive', cost: row.spent.cost,
          summary: summary.filter(line => line.startsWith(`✓ ${caster.name} `) ||
            line.startsWith(`✗ ${caster.name} `)),
          hits: attempts.filter(hit => hit.caster === caster).map(hit => {
            const result = results.find(result => result.actor === caster.name && result.target === hit.target.name);
            return { target: hit.target.heroId, roll: hit.roll,
              outcome: result?.kind === 'temp-allegiance' ? '狂热追随'
                : result?.outcome || (hit.roll.win ? 'invalid' : 'resisted'),
              downgraded: Boolean(hit.downgraded) };
          }) };
      });
    });
  }
  function sweep(battle) {
    if (battle.mindDepriveMeta) use(battle, undefined, undefined, rt => rt.mindDeprive.sweep(rt.bm));
  }
  function endRound(battle) {
    if (!battle.mindDepriveMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const row of rt.tempAllegiance.tick(rt.bm))
        rt.bm.battleLogger.log(`${row.actor} 对 ${row.target} 的「${row.subtype}」结束，目标恢复原阵营。`);
    });
  }
  function finish(battle) {
    if (!battle.mindDepriveMeta) return;
    use(battle, undefined, undefined, rt => rt.tempAllegiance.releaseAll(rt.bm));
    for (const actor of battle.units) {
      actor.effects = (actor.effects || []).filter(effect => !effect.mindDeprive);
      actor.mindDepriveMovePct = 0; actor.mindDepriveMoveUntil = 0;
    }
  }
  const originSide = (battle, actor) => battle.tempAllegiance?.processes
    .find(row => row.targetId === actor.id)?.originTeamType || actor.side;
  function statusLines(battle, actor) {
    if (!battle.mindDepriveMeta) return [];
    const lines = [];
    const tremble = actor.effects?.find(effect => effect.mindDeprive);
    if (tremble) lines.push(`颤栗 · 攻防 -${tremble.power}% · 至第 ${tremble.mindDepriveUntil} 回合`);
    if (actor.mindDepriveMovePct) lines.push(`瘫软 · 无法移动 · 至第 ${actor.mindDepriveMoveUntil} 回合`);
    const follow = battle.tempAllegiance?.processes.find(row =>
      row.targetId === actor.id && row.subtype === '心智剥夺');
    if (follow) lines.push(`狂热追随 · 第 ${follow.expireRound} 回合结束恢复原阵营`);
    return lines;
  }
  const api = { initialize, options, prepare, apply, sweep, endRound, finish, originSide, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
