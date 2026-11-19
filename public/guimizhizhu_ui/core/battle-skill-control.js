(() => {
  'use strict';
  const KEY = 'cryptLord.battleSkillControl';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!reference?.createSkillControlResolver) throw Error('技能干涉缺少原版结算器。');
  const copy = value => structuredClone(value);
  const engine = () => modules['cryptLord.teamBattleState'];
  function initialize(battle, pathways) {
    const fields = modules['cryptLord.battleFieldEffects'];
    if (!fields) throw Error('技能干涉缺少原版拼点运行期。');
    fields.initialize(battle, pathways);
    battle.skillControlMeta ||= { version: 1 };
    for (const unit of battle.units) unit.skillControl ||= { banned: [], granted: [] };
  }
  function moves(data, unit) {
    const battle = copy(data.cryptLord.teamBattle);
    Object.assign(battle, { phase: 'action', status: 'active', queue: [unit.id], index: 0 });
    return engine().options({ ...data, cryptLord: { ...data.cryptLord, teamBattle: battle } }, true, true)
      .filter(choice => choice.id !== 'basic')
      .map(choice => ({ ...engine().calculationSkill(choice), name: choice.name,
        isPassive: false, remainingUses: choice.quantity, nativeChoice: copy(choice) }));
  }
  // Rebuild original move identities for one operation; persist only JSON-compatible snapshots.
  function withHeroes(battle, data, random, operation) {
    return modules['cryptLord.battleFieldEffects'].withRuntime(battle, data, random, rt => {
      const heroes = rt.heroes.map(base => {
        const hero = Object.create(base), unit = base.unit;
        const available = data.cryptLord ? moves(data, unit) : [];
        const state = unit.skillControl || { banned: [], granted: [] };
        const granted = (state.granted || []).map((row, index) => {
          const move = available.find(item => item.nativeChoice.id === `granted:${index}`) ||
            { name: row.name, nativeChoice: row.choice };
          return { move, until: row.until, fromName: row.fromName || row.from,
            ability: row.controlAbility || row.mode, native: row };
        });
        Object.defineProperties(hero, {
          moveSet: { value: available, writable: true },
          skillControl: { value: { banned: copy(state.banned || []), granted }, writable: true },
        });
        return hero;
      });
      const seededMath = Object.create(Math);
      seededMath.random = random || (() => modules['cryptLord.battleFormulas'].draw(battle));
      const resolver = reference.createSkillControlResolver({ Math: seededMath,
        SkillControlManager: rt.skillControl, TacticCatalog: {
        ...rt.tacticCatalog, SKILL_CONTROL_DURATION: 2, LAST_SKILL_MULT: 3,
      }, ContestAdvantage: rt.advantage });
      const result = operation({ ...rt, heroes, resolver });
      for (const hero of heroes) {
        hero.unit.skillControl = { banned: hero.skillControl.banned,
          granted: hero.skillControl.granted.map(row => {
            const choice = copy(row.move.nativeChoice || row.native?.choice);
            if (choice) {
              for (const key of ['range', 'radius'])
                if (choice[key] === Infinity) choice[key] = 'global';
              delete choice.targets;
            }
            return { ...row.native, name: row.move.name, until: row.until,
              fromName: row.fromName, controlAbility: row.ability,
              choice, ability: copy(row.native?.ability || row.move.nativeChoice?.skill || {}),
            };
          }),
        };
      }
      return result;
    });
  }
  function eligibility(data, unit) {
    const battle = copy(data.cryptLord.teamBattle);
    return modules['cryptLord.battleFieldEffects'].withRuntime(battle, data, () => .5, rt => {
      const hero = rt.heroes.find(row => row.heroId === unit.id);
      return Object.fromEntries(Object.entries(rt.skillControl.resolveEligibility(hero.sequenceString))
        .filter(([, value]) => value));
    });
  }
  function skills(data, unit) {
    return moves(data, unit).filter(move => move.remainingUses == null || move.remainingUses > 0)
      .map(move => ({ name: move.name, ability: copy(move.nativeChoice.skill || {}),
        choice: copy(move.nativeChoice), banned: Boolean(unit.skillControl?.banned
          ?.some(row => row.name === move.name)) }));
  }
  function apply(data, battle, actor, target, mode, skill) {
    if (!['禁止', '偷窃', '复制'].includes(mode)) return { applied: false, reason: '技能干涉模式无效。' };
    return withHeroes(battle, data, () => .5, rt => rt.resolver.applySkillControl(rt.bm,
      rt.heroes.find(row => row.heroId === actor.id),
      rt.heroes.find(row => row.heroId === target.id), mode, skill));
  }
  function contest(caster, target, mode, last, random, advantage) {
    const math = Object.create(Math); math.random = random;
    return reference.createSkillControlResolver({ Math: math,
      SkillControlManager: null, TacticCatalog: { LAST_SKILL_MULT: 3 },
      ContestAdvantage: advantage }).skillControlContest(caster, target, mode, last);
  }
  function attempt(data, battle, actor, target, mode, skill, ability, random, rank) {
    return withHeroes(battle, data, random, rt => {
      const caster = rt.heroes.find(row => row.heroId === actor.id);
      const defender = rt.heroes.find(row => row.heroId === target.id);
      const cost = rt.tacticCatalog.spiritCost(rank ?? actor.rank);
      actor.spirit = Math.max(0, actor.spirit - cost);
      const last = rt.skillControl.isLastSkill(defender, skill);
      const roll = rt.resolver.skillControlContest(caster, defender, mode, last);
      const applied = roll.win && rt.resolver.applySkillControl(rt.bm, caster, defender, mode, skill);
      const outcome = applied?.applied ? 'applied' : 'resisted';
      const result = { actor: actor.id, target: target.id, mode, skill, ability, cost,
        last: last && mode !== '复制', scores: { caster: roll.casterScore, defender: roll.targetScore }, outcome };
      const message = `${actor.name} 对 ${target.name} 的「${skill}」${mode}${
        outcome === 'applied' ? '成功' : '失败'}（拼点 ${roll.casterScore}:${roll.targetScore}）。`;
      battle.log.push({ at: Date.now(), round: battle.round, message });
      if (battle.log.length > 160) battle.log.shift();
      return result;
    });
  }
  function tick(battle) {
    withHeroes(battle, {}, () => .5, rt => {
      for (const hero of rt.heroes)
        for (const message of rt.skillControl.tick(hero, battle.round)) {
          battle.log.push({ at: Date.now(), round: battle.round, message });
          if (battle.log.length > 160) battle.log.shift();
        }
    });
  }
  function finish(battle) {
    for (const unit of battle.units) unit.skillControl = { banned: [], granted: [] };
  }
  function statusLines(battle, unit) {
    return [...(unit.skillControl?.banned || []).map(row =>
      `封锁 · ${row.name} · 到第 ${row.until} 回合解除`),
    ...(unit.skillControl?.granted || []).map(row =>
      `${row.controlAbility || '临时能力'} · ${row.name} · ${row.fromName || row.from || '未知来源'} · 到第 ${
        row.until} 回合失效`)];
  }
  const api = { initialize, eligibility, moves, skills, apply, contest, attempt, tick, finish, statusLines,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
