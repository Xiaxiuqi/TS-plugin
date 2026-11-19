(() => {
  'use strict';
  const KEY = 'cryptLord.battleResourceStatus';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!reference?.createStatus) throw Error('五维状态模块缺少原版状态管理器。');
  const stats = {
    vitality: ['活力', 'hp', 'maxHp'], agility: ['敏捷', 'agility', 'maxAgility'],
    spirit: ['灵性', 'spirit', 'maxSpirit'], sanity: ['理智', 'sanity', 'maxSanity'],
    humanity: ['人性', 'humanity', 'maxHumanity'],
  };
  const labels = { attack: '攻击', defense: '防御', speed: '速度',
    damageTakenIncrease: '受到伤害增加', damageTakenDecrease: '受到伤害减少',
    damageDealtIncrease: '造成伤害增加', damageDealtDecrease: '造成伤害减少' };
  const clone = value => structuredClone(value);
  function valid(config) {
    try { return reference.createStatus().validateConfig(config); }
    catch { return false; }
  }
  function manager(battle) {
    const original = reference.createStatus();
    const config = battle?.resourceStatusMeta?.config;
    if (config != null && !original.loadConfig(clone(config)))
      throw Error('本场五维状态配置无效，未进行结算。');
    return original;
  }
  function initialize(battle, config) {
    if (battle.resourceStatusMeta) {
      manager(battle);
      return;
    }
    if (config != null && !valid(config)) throw Error('五维状态配置无效，未开始战斗。');
    battle.resourceStatusMeta = { version: 1,
      config: clone(config ?? reference.createStatus().defaultConfig) };
  }
  function configure(battle, config) {
    if (!valid(config)) return { ok: false, error: '五维状态配置无效，已保留原配置。' };
    initialize(battle);
    battle.resourceStatusMeta.config = clone(config);
    return { ok: true };
  }
  function turnStart(battle, actor) {
    if (!actor || actor.resourceStatusStartedRound === battle.round) return [];
    const slot = modules['cryptLord.battleExtraAction']?.currentSlot(battle);
    if (slot?.extra && (slot.cfg?.skipTurnStart || slot.cfg?.freezeDurations)) return [];
    initialize(battle);
    const additionalStats = {};
    for (const [label, current, maximum] of Object.values(stats)) {
      additionalStats[label] = actor[maximum];
      additionalStats[`当前${label}`] = actor[current];
    }
    actor.effects ||= [];
    const added = manager(battle).checkAndApplyEffects({
      name: actor.name, additionalStats, effects: actor.effects,
    });
    for (const effect of added) {
      Object.assign(effect, { resourceStatus: true, skillEffect: true,
        triggerTiming: 'turn_start', priority: 0 });
      battle.log.push({ at: Date.now(), round: battle.round, resourceStatus: true,
        message: `${actor.name} 受到状态效果：${effect.name}。` });
      if (battle.log.length > 160) battle.log.shift();
    }
    actor.resourceStatusStartedRound = battle.round;
    modules['cryptLord.teamBattleState']?.recalculateAttributes(actor);
    return added;
  }
  function agilityThresholds(battle) {
    const original = manager(battle);
    const rows = (original.config || original.defaultConfig).agility;
    if (!Array.isArray(rows) || rows.length < 4) return [];
    return rows.map(row => Number(row.threshold)).filter(Number.isFinite).sort((a, b) => a - b);
  }
  function statusLines(battle, actor) {
    if (!battle?.resourceStatusMeta || !actor) return [];
    return (actor.effects || []).filter(effect => effect.resourceStatus && effect.duration > 0)
      .map(effect => `${effect.name} · ${labels[effect.stat] || effect.stat} ${
        ['attack', 'defense', 'speed'].includes(effect.stat)
          ? effect.type === 'buff' ? '+' : '-' : ''}${effect.power}${
        effect.valueType === 'percentage' ? '%' : ' 点'}`);
  }
  function finish(battle) {
    for (const actor of battle.units) {
      actor.effects = (actor.effects || []).filter(effect => !effect.resourceStatus);
      delete actor.resourceStatusStartedRound;
      modules['cryptLord.teamBattleState']?.recalculateAttributes(actor);
    }
  }
  const api = { initialize, configure, manager, turnStart, agilityThresholds, statusLines, finish,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
