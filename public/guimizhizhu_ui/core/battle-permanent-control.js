(() => {
  'use strict';
  const KEY = 'cryptLord.battlePermanentControl';
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
  const specs = [
    { subtype: '秘偶化', can: 'canMarionette', pool: 'marionetteTargets', group: 'marionetteTries', used: 'marionetteDone' },
    { subtype: '征服', can: 'canConquest', pool: 'conquestTargets', group: 'conquestTries', used: 'conquestUsed' },
    { subtype: '「心灵」权柄', can: 'canMind', pool: 'mindTargets', group: 'mindTries', used: 'mindUsed' },
    { subtype: '奴役', can: 'canEnslave', pool: 'enslaveTargets', group: 'enslaveTries', used: 'enslaveUsed' },
    { subtype: '驯化', can: 'canTame', pool: 'tameTargets', group: 'tameTries', used: 'tameUsed' },
  ];
  function initialize(battle, pathways) {
    hard.initialize(battle, pathways);
    battle.permanentControlMeta ||= { version: 1, config: reference.controlConfig() };
    battle.enemyControl ||= { processes: [] };
    for (const row of specs) battle.enemyControl[row.used] ||= [];
    battle.enemyControl.damaged ||= [];
  }
  const statOf = (m, hero, subtype) => subtype === '「心灵」权柄' ? '人性'
    : subtype === '驯化' ? m.tameStatKey(hero) : '灵性';
  const penaltyOf = (rt, hero, target, subtype) => subtype === '秘偶化'
    ? rt.enemyControl.marionettePenalty(rt.bm, hero, target)
    : subtype === '奴役' ? rt.enemyControl.enslavePenalty(hero, target)
      : rt.bm.controlConfig.CONTROL_PENALTY;
  function describe(rt, hero, spec) {
    const m = rt.enemyControl, state = m.ensure(rt.bm), current = m.processOf(rt.bm, hero.heroId);
    const stat = statOf(m, hero, spec.subtype), cost = rt.bm.controlCost(hero.sequenceRank, stat);
    const balance = hero.additionalStats[`当前${stat}`];
    const continuation = spec.subtype === '秘偶化' && current;
    const check = continuation ? m.checkContinue(rt.bm, current) : null;
    const targets = m[spec.pool](rt.bm, hero);
    if (continuation && check.ok && present(check.target.unit) &&
      !targets.some(target => target.heroId === check.target.heroId)) targets.push(check.target);
    return { subtype: spec.subtype, stat, cost, balance, after: Math.max(0, balance - cost),
      current: current ? copy(current) : null, remaining: state[spec.used].has(hero.heroId) ? 0 : 1,
      range: spec.subtype === '秘偶化' && hero.sequenceRank > rt.bm.controlConfig.MARIONETTE_FREE_RANK ? 1 : null,
      targets: targets.map(target => ({ id: target.heroId, name: target.name,
        defense: m.bestStat(target), penalty: penaltyOf(rt, hero, target, spec.subtype) })),
      reason: state[spec.used].has(hero.heroId) ? '本场名额已用完。'
        : balance <= 0 ? `当前${stat}为 0，无法发起。`
          : !targets.length ? continuation ? '当前秘偶过程已不可续控，选择其它战术将解除过程。'
            : '没有理论上可以赢得拼点的合法敌人。' : '' };
  }
  function options(battle, actor, data) {
    if (!battle?.permanentControlMeta || !present(actor) || hard.occupied(battle, actor)) return [];
    return use(copy(battle), data, undefined, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id);
      const eligibility = rt.enemyControl.resolveEligibility(hero.sequenceString);
      return specs.filter(spec => eligibility[spec.subtype]).map(spec => describe(rt, hero, spec));
    });
  }
  function attempt(rt, hero, target, spec) {
    const m = rt.enemyControl, subtype = spec.subtype, stat = statOf(m, hero, subtype);
    const penalty = penaltyOf(rt, hero, target, subtype);
    const state = m.ensure(rt.bm);
    if (subtype !== '秘偶化') state[spec.used].add(hero.heroId);
    const cost = subtype === '「心灵」权柄' ? m.spendHumanity(hero)
      : subtype === '驯化' ? m.spendTame(hero).cost : m.spendSpirit(hero);
    const roll = m.contest(hero, target, penalty, hero.additionalStats[`当前${stat}`]);
    if (subtype === '秘偶化') m.consumePenalty(rt.bm, hero, target);
    return { actor: hero.heroId, target: target.heroId, subtype, stat, cost, penalty, roll };
  }
  // Maintaining a process occupies the tactic before any optional NPC ability is considered.
  function maintain(battle, data, random, excluded = [], request = null) {
    if (!battle.permanentControlMeta) return [];
    return use(battle, data, random, rt => {
      const m = rt.enemyControl, rows = [], summary = [];
      for (const p of m.ensure(rt.bm).processes.slice()) {
        const hero = m.findHero(rt.bm, p.casterId);
        const primary = hero?.dataSource === 'player';
        const keeping = primary ? request?.subtype === '秘偶化' && request.target === p.targetId
          : hero?.controller !== 'player';
        const check = m.checkContinue(rt.bm, p);
        if (!check.ok || !present(hero?.unit) || !present(check.target?.unit)) {
          m.endProcess(rt.bm, p, check.reason || 'invalid', summary);
        } else if (!keeping || hard.occupied(battle, hero.unit) || excluded.includes(hero.heroId)) {
          m.endProcess(rt.bm, p, 'skip', summary);
        } else rows.push(attempt(rt, hero, check.target, specs[0]));
      }
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return rows;
    });
  }
  function prepare(battle, data, random, excluded = [], request = null) {
    if (!battle.permanentControlMeta) return [];
    return use(battle, data, random, rt => {
      const rows = [], m = rt.enemyControl;
      const append = (hero, spec, id) => {
        const choice = describe(rt, hero, spec);
        if (choice.reason || !choice.targets.some(target => target.id === id)) return;
        rows.push(attempt(rt, hero, m.findHero(rt.bm, id), spec));
      };
      if (request) {
        const hero = rt.heroes.find(row => row.dataSource === 'player');
        const spec = specs.find(row => row.subtype === request.subtype);
        if (spec && present(hero?.unit) && !hard.occupied(battle, hero.unit) &&
          !excluded.includes(hero.heroId) && m[spec.can](rt.bm, hero))
          append(hero, spec, request.target);
      }
      for (const hero of rt.heroes) {
        if (!present(hero.unit) || hero.controller === 'player' ||
          hard.occupied(battle, hero.unit) || excluded.includes(hero.heroId)) continue;
        const hits = specs.filter(spec => m[spec.can](rt.bm, hero) && !describe(rt, hero, spec).reason &&
          rt.dice() * 100 < battle.permanentControlMeta.config.CONTROL_NPC_CHANCE);
        if (!hits.length) continue;
        const spec = hits[Math.floor(rt.dice() * hits.length)];
        const pool = describe(rt, hero, spec).targets;
        append(hero, spec, pool[Math.floor(rt.dice() * pool.length)].id);
      }
      return rows;
    });
  }
  function apply(battle, data, random, prepared) {
    if (!prepared?.length) return [];
    return use(battle, data, random, rt => {
      const groups = Object.fromEntries(specs.map(spec => [spec.group, []]));
      const attempts = prepared.map(row => ({ ...row,
        caster: rt.heroes.find(hero => hero.heroId === row.actor),
        target: rt.heroes.find(hero => hero.heroId === row.target),
      })).filter(row => row.caster && row.target);
      for (const row of attempts) groups[specs.find(spec => spec.subtype === row.subtype).group].push(row);
      const summary = [], results = [];
      rt.enemyControl.arbitrate(rt.bm, groups, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      return attempts.map(row => ({ actor: row.actor, target: row.target.heroId,
        subtype: row.subtype, stat: row.stat, cost: row.cost, penalty: row.penalty, roll: row.roll,
        outcome: results.some(result => result.actor === row.caster.name &&
          result.target === row.target.name) ? 'applied' : row.roll.win ? 'superseded' : 'resisted',
        summary: summary.filter(line => line.startsWith(`✓ ${row.caster.name} `) ||
          line.startsWith(`✗ ${row.caster.name} `)) }));
    });
  }
  function sweep(battle) {
    if (!battle.permanentControlMeta) return;
    use(battle, undefined, undefined, rt => {
      const summary = [];
      for (const p of rt.enemyControl.ensure(rt.bm).processes.slice()) {
        const caster = rt.enemyControl.findHero(rt.bm, p.casterId);
        const target = rt.enemyControl.findHero(rt.bm, p.targetId);
        if (!present(caster?.unit) || !present(target?.unit) ||
          !rt.enemyControl.isEnemyOf(caster, target))
          rt.enemyControl.endProcess(rt.bm, p, 'invalid', summary);
      }
      summary.forEach(line => rt.bm.battleLogger.log(line));
    });
  }
  function markDamaged(battle, actor, amount) {
    if (battle.permanentControlMeta && amount > 0) use(battle, undefined, undefined, rt =>
      rt.enemyControl.markDamaged(rt.bm, rt.heroes.find(hero => hero.heroId === actor.id)));
  }
  function finish(battle) {
    if (!battle.permanentControlMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const p of rt.enemyControl.ensure(rt.bm).processes.slice())
        rt.enemyControl.endProcess(rt.bm, p, null, null);
    });
  }
  function statusLines(battle, actor) {
    if (!battle.permanentControlMeta) return [];
    const lines = [];
    for (const p of battle.enemyControl.processes) {
      if (p.casterId === actor.id) lines.push(`秘偶化 · ${battle.units.find(unit => unit.id === p.targetId)?.name || p.targetId} · ${p.stacks}/3 层 · 下轮必须续控`);
      if (p.targetId === actor.id) lines.push(`被秘偶化 · ${p.stacks}/3 层 · 攻防速与移动 -${battle.permanentControlMeta.config.MARIONETTE_PCT[p.stacks]}%`);
    }
    for (const spec of specs) if (battle.enemyControl[spec.used].includes(actor.id))
      lines.push(`${spec.subtype} · 本场名额已使用`);
    return lines;
  }
  const api = { initialize, options, maintain, prepare, apply, sweep, markDamaged, finish, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
