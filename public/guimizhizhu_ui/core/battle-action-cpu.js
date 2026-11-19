(() => {
  'use strict';
  const KEY = 'cryptLord.battleActionCpu';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const copy = value => structuredClone(value);
  const engine = () => modules['cryptLord.teamBattleState'];
  const fields = () => modules['cryptLord.battleFieldEffects'];
  function initialize(battle, data) {
    for (const name of ['battleFieldEffects', 'battleTacticCpu', 'battleFormulas', 'battleTerrainPresets'])
      if (!modules[`cryptLord.${name}`]) throw Error(`原版行动 CPU 缺少 ${name}，未进行结算。`);
    modules['cryptLord.battleTacticCpu'].initialize(battle, data);
    battle.actionCpuMeta ||= { version: 1 };
  }
  function boardFor(battle, rt) {
    const board = Object.assign(new rt.cpuBoardSearch(), battle.board);
    board.idx = (x, y) => y * board.cols + x;
    board.inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y) &&
      x >= 0 && y >= 0 && x < board.cols && y < board.rows;
    board.cells = new Array(board.cols * board.rows);
    for (const hero of rt.heroes)
      if (hero.unit.hp > 0 && !hero.dismissed &&
        !hero.unit.offField && !hero.unit.exiled && !hero.unit.activeLeaving &&
        !hero.unit.possessedHidden && board.inBounds(hero.x, hero.y))
        board.cells[board.idx(hero.x, hero.y)] = hero;
    const tileAt = (x, y) => battle.terrain?.find(tile => tile.x === x && tile.y === y);
    board.hazardAt = (x, y) => {
      const tile = tileAt(x, y);
      return tile?.id ? { ...tile, 种类: 'hazard' } : null;
    };
    board.moveCostAt = (x, y) => {
      if (!board.inBounds(x, y)) return Infinity;
      const tile = tileAt(x, y);
      const tier = Math.max(0, Number(tile?.tier ?? board.base?.tier) || 0);
      if (tile?.blocked || tier >= 3) return Infinity;
      return 1 + tier;
    };
    board.isFree = (x, y) => board.inBounds(x, y) &&
      Number.isFinite(board.moveCostAt(x, y)) && !board.cells[board.idx(x, y)];
    return board;
  }
  function withBoard(battle, data, random, operation) {
    return fields().withRuntime(battle, data, random, rt => {
      rt.bm.board = boardFor(battle, rt);
      return operation(rt);
    });
  }
  function reachable(battle, data, actor) {
    return withBoard(battle, data, () => .5, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id);
      return rt.bm.board.getReachableCells(hero, actor.moveRemaining)
        .filter(cell => cell.cost > 0);
    });
  }
  function decide(data, random, { autoPilot = false } = {}) {
    const battle = data.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'action') return null;
    const actor = engine().current(battle);
    if (!actor || engine().playerControlled(actor) && !(autoPilot &&
      modules['cryptLord.battleAutoPilot']?.drives(battle, actor))) return null;
    initialize(battle, data);
    return withBoard(battle, data, random, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id);
      if (actor.picturePersonImmobile || actor.mindDepriveMovePct >= 100) hero.move = 0;
      const formulas = modules['cryptLord.battleFormulas'];
      const skills = engine().options(data, true).map(choice => {
        const calculation = engine().calculationSkill(choice);
        return { ...calculation, id: choice.id, name: choice.name, calculation,
          minRange: choice.minRange ?? (choice.range === 0 ? 0 : 1),
          targetType: choice.targetType || 'single', selfCentered: choice.range === 0,
          aoeRadius: choice.radius, isConsumable: Boolean(choice.consumable),
          remainingUses: choice.quantity,
          canUse: () => ({ canAfford: actor[choice.costKey || 'spirit'] >= choice.cost }),
          getPower: () => choice.power,
          calculateHealing: (caster, target) =>
            formulas.healing(battle, caster.unit, target.unit, calculation, () => .5),
        };
      });
      const originalBlock = rt.bribery.attackBlockReason;
      rt.bribery.attackBlockReason = function (host, caster, skill, target, cell) {
        const blocked = originalBlock.call(this, host, caster, skill, target, cell);
        if (blocked) return blocked;
        const conditions = modules['cryptLord.battleTeamConditions'];
        if (!(skill.conditionalParams || skill.条件参数集)?.length) return '';
        if (!conditions) return '条件参数模块不可用。';
        const probe = copy(battle), unit = probe.units.find(row => row.id === caster.heroId);
        Object.assign(unit, { x: cell.x, y: cell.y });
        const choice = engine().options({ ...data,
          cryptLord: { ...data.cryptLord, teamBattle: probe } }, true)
          .find(row => row.id === skill.id);
        const center = probe.units.find(row => row.id === (skill.selfCentered ? caster.heroId : target.heroId));
        const session = conditions.session(probe, unit, choice, () => .5);
        return conditions.blockReason(probe, unit, choice, center, session);
      };
      const cpu = new rt.punishmentCpu('easy', rt.bm);
      const resolve = cpu.resolveApproach;
      cpu.resolveApproach = function (caster, target, skill) {
        const cell = resolve.call(this, caster, target, skill);
        return cell && !rt.bribery.attackBlockReason(rt.bm, caster, skill, target, cell)
          ? cell : null;
      };
      const moves = autoPilot && modules['cryptLord.battleAutoPilot']?.drives(battle, actor)
        ? modules['cryptLord.battleAutoPilot'].skillsFor(skills)
        : skills;
      const selected = cpu.selectAction(hero, moves, rt.bm.allyTeam, rt.bm.enemyTeam);
      return { actor: actor.id, round: battle.round, index: battle.index,
        intent: selected?.intent || 'wait',
        id: selected?.skill?.id || null,
        target: selected?.skill?.selfCentered ? actor.id : selected?.targets?.[0]?.heroId || null,
        moveTo: selected?.moveTo ? { ...selected.moveTo } : null };
    });
  }
  function preview(data, options) {
    return decide(copy(data), undefined, options);
  }
  function step(data, random, options) {
    let next = copy(data);
    let plan;
    try { plan = decide(next, random, options); }
    catch (error) { return { ok: false, error: error.message }; }
    if (!plan) return { ok: true, data: next, battle: engine().get(next), stopped: true };
    next.cryptLord.teamBattle.actionCpuMeta.last = copy(plan);
    const perform = move => {
      const outcome = engine().action(next, move, random, options);
      if (outcome.ok) next = outcome.data;
      return outcome;
    };
    if (plan.moveTo?.cost > 0) {
      const moved = perform({ type: 'move', x: plan.moveTo.x, y: plan.moveTo.y });
      if (!moved.ok) return moved;
      const battle = next.cryptLord.teamBattle;
      // Terrain entry may kill or remove the mover. Never act using the next unit's slot.
      if (battle.status !== 'active' || battle.phase !== 'action' ||
        battle.round !== plan.round || battle.index !== plan.index ||
        engine().current(battle)?.id !== plan.actor)
        return { ok: true, data: next, battle: engine().get(next) };
    }
    return perform(plan.id ? { id: plan.id, target: plan.target } : { type: 'wait' });
  }
  const api = { initialize, reachable, preview, step,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
