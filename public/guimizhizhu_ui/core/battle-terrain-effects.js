(() => {
  'use strict';
  const KEY = 'cryptLord.battleTerrainEffects';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = () => modules['cryptLord.battleFieldEffects'];
  const transfer = () => modules['cryptLord.battleEffectTransfer'];
  const alive = actor => actor?.hp > 0;
  const present = actor => alive(actor) && !actor.offField && !actor.exiled &&
    !actor.activeLeaving && !actor.possessedHidden && !actor.dismissed;
  function initialize(battle) {
    for (const key of ['battleFieldEffects', 'battleEffectTransfer', 'battleTerrainPresets'])
      if (!modules[`cryptLord.${key}`]) throw Error(`危险地形结算缺少 ${key}，未进行结算。`);
    fields().initialize(battle);
    transfer().initialize(battle);
    battle.terrainEffectMeta ||= { version: 1 };
  }
  function use(battle, actor, operation) {
    initialize(battle);
    return fields().withRuntime(battle, {}, () => .5, rt => {
      const hero = rt.heroes.find(row => row.heroId === actor.id);
      const hazardAt = (x, y) => {
        const tile = battle.terrain?.find(row => row.x === x && row.y === y && row.id);
        return tile ? { ...tile, 种类: 'hazard', 名称: tile.name ||
          modules['cryptLord.battleTerrainPresets'].option(tile.id)?.name || tile.id } : null;
      };
      rt.bm.board = { ...rt.bm.board, hazardAt };
      rt.bm.effectManager = { applyEffect(target, raw, _caster, _skill, context) {
        const instance = { ...raw, terrainEffect: true, skillEffect: true,
          terrainField: context?.sourceKind !== '地形沾染',
          triggerTiming: raw.triggerTiming || 'turn_start', priority: 0 };
        const store = (recipient, effect) => {
          if (modules['cryptLord.battleEffects'])
            return modules['cryptLord.battleEffects'].store(battle, target.unit, recipient, effect);
          recipient.effects ||= [];
          const previous = recipient.effects.find(row => row.name === effect.name && row.duration > 0);
          if (previous && (previous.power > effect.power ||
            previous.power === effect.power && previous.duration >= effect.duration)) return false;
          if (previous) recipient.effects.splice(recipient.effects.indexOf(previous), 1, effect);
          else recipient.effects.push(effect);
          modules['cryptLord.teamBattleState']?.recalculateAttributes(recipient);
          return true;
        };
        const applied = context ? transfer().routeEffect(battle, target.unit, instance,
          context, store) : store(target.unit, instance);
        return { applied };
      } };
      const slot = modules['cryptLord.battleExtraAction']?.currentSlot(battle) || {};
      const manager = new rt.terrainTurn(rt.bm, slot);
      return operation(manager, hero, hazardAt);
    });
  }
  function entry(battle, actor) {
    if (!present(actor)) return;
    use(battle, actor, (manager, hero, hazardAt) =>
      manager.attachTerrainResidue(hero, hazardAt(actor.x, actor.y)));
  }
  function turnStart(battle, actor) {
    if (!present(actor)) return [];
    if (actor.terrainStartedRound === battle.round) return [];
    const slot = modules['cryptLord.battleExtraAction']?.currentSlot(battle);
    if (slot?.extra && slot.cfg?.skipTurnStart) return [];
    actor.terrainStartedRound = battle.round;
    return use(battle, actor, (manager, hero) => manager.processTerrainEffects(hero));
  }
  function endRound(battle) {
    initialize(battle);
    if (battle.terrainEffectMeta.lastTickRound === battle.round) return;
    battle.terrainEffectMeta.lastTickRound = battle.round;
    const gone = new Set();
    battle.terrain = (battle.terrain || []).flatMap(tile => {
      if (!(Number(tile.duration) > 0)) return [tile];
      const remaining = Number(tile.duration) - 1;
      if (remaining > 0) return [{ ...tile, duration: remaining }];
      gone.add(tile.name || tile.id || '地形');
      return [];
    });
    for (const name of gone) {
      battle.log.push({ at: Date.now(), round: battle.round, terrainEffect: true,
        message: `${name} 消散了。` });
      if (battle.log.length > 160) battle.log.shift();
    }
  }
  function finish(battle) {
    for (const unit of battle.units) {
      unit.effects = (unit.effects || []).filter(row => !row.terrainEffect);
      delete unit.terrainStandingOn;
      delete unit.terrainStartedRound;
      modules['cryptLord.teamBattleState']?.recalculateAttributes(unit);
    }
  }
  function describe(battle, actor, x = actor?.x, y = actor?.y) {
    const tile = battle?.terrain?.find(row => row.x === x && row.y === y && row.id);
    if (!tile) return [];
    const presets = modules['cryptLord.battleTerrainPresets'];
    const duration = Number(tile.duration) > 0 ? `${tile.duration} 回合` : '永久';
    const lines = [`${tile.name || presets.option(tile.id)?.name || tile.id} · ${duration}`];
    if (actor) {
      const view = { ...actor, tags: (actor.tags || []).map(tag =>
        typeof tag === 'string' ? tag : tag.name) };
      for (const hit of presets.hits(tile.id, view, tile.rank)) lines.push(
        `${hit.tier} · ${hit.stat} ${hit.value > 0 ? '+' : ''}${hit.value} · ${
          hit.channel === 'residue' ? `沾染 ${hit.rounds} 回合` : '回合开始结算'}`);
    }
    return lines;
  }
  const api = { initialize, entry, turnStart, endRound, finish, describe,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
