(() => {
  'use strict';
  const KEY = 'cryptLord.battleReport';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!reference?.createReporter) throw Error('战斗报告缺少原版 BattleReporter。');
  const copy = value => structuredClone(value);
  const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const attributes = { 当前活力: ['hp', 'maxHp'], 当前敏捷: ['agility', 'maxAgility'],
    当前灵性: ['spirit', 'maxSpirit'], 当前理智: ['sanity', 'maxSanity'],
    当前人性: ['humanity', 'maxHumanity'] };
  function reporter(battle) {
    const out = reference.createReporter();
    const state = battle.reportState;
    out.simpleBattleLog = state.simple;
    out.detailedLog = state.detailed;
    out.roundActions = state.actions;
    out.currentRound = battle.round;
    out.terrainScene = battle.scene || '';
    return out;
  }
  function remember(battle, row) {
    if (row.reportCaptured) return;
    row.reportCaptured = true;
    if (!row.reportHandled && !row.reportQuiet && row.message) {
      battle.reportState.simple.push(String(row.message));
      battle.reportState.detailed.push({ type: 'native_log', round: row.round,
        message: String(row.message), timestamp: row.at });
    }
  }
  function initialize(battle, data) {
    battle.reportState ||= { version: 1, legacy: battle.log.length > 0,
      simple: [], detailed: [], actions: [], snapshots: {} };
    if (data?.stat_data && !battle.reportState.initialConsumables)
      battle.reportState.initialConsumables = (modules['cryptLord.personalBattleState']
        ?.consumableMoves(data) || []).map(move => move.name);
    for (const row of battle.log) remember(battle, row);
    // This method belongs only to this transaction's array. JSON/structuredClone strip it.
    Object.defineProperty(battle.log, 'push', { configurable: true, enumerable: false,
      value(...rows) {
        for (const row of rows) remember(battle, row);
        return Array.prototype.push.apply(this, rows);
      },
    });
  }
  function capture(battle) {
    if (!battle.reportState) return;
    for (const row of battle.log) remember(battle, row);
  }
  function hero(unit, data) {
    const card = unit.playCard || (unit.source === 'player' ? data?.stat_data : data?.npc_data?.[unit.id]);
    const summary = { sequenceString: unit.sequence };
    const stats = {};
    for (const [name, [field, maximum]] of Object.entries(attributes)) {
      stats[name] = numeric(unit[field]); stats[name.slice(2)] = numeric(unit[maximum]);
    }
    Object.assign(summary, {
      currentVitality: stats.当前活力, maxVitality: stats.活力,
      currentAgility: stats.当前敏捷, maxAgility: stats.敏捷,
      currentSpirit: stats.当前灵性, maxSpirit: stats.灵性,
      currentSanity: stats.当前理智, maxSanity: stats.理智,
      currentHumanity: stats.当前人性, maxHumanity: stats.人性,
    });
    return { name: unit.name, dataSource: unit.source, teamType: unit.side,
      isSummon: unit.isSummon, playSource: unit.playSource,
      baseSequenceString: card?.当前序列 || unit.sequence, additionalStats: stats,
      effects: unit.effects || [], isAlive: () => stats.当前活力 > 0,
      getStatusSummary: () => summary, moveSet: [] };
  }
  function roundStart(battle) {
    if (!battle.reportState) return;
    battle.reportState.snapshots[String(battle.round)] ||= copy(battle.units);
  }
  function run(battle, actor, operation) {
    if (!battle.reportState) return;
    const out = reporter(battle), caster = hero(actor);
    const slot = modules['cryptLord.battleExtraAction']?.currentSlot(battle);
    if (slot?.heroId === actor.id && slot.alias) out.setActorAlias(caster, slot.alias);
    operation(out, caster);
  }
  function cost(battle, actor, choice, oldValue, newValue) {
    if (oldValue === newValue) return;
    run(battle, actor, (out, caster) => out.logCostDeduction(caster,
      { name: choice.name, cost: { type: Object.entries(attributes)
        .find(([, [field]]) => field === (choice.costKey || 'spirit'))?.[0] || '当前灵性' } },
      { oldValue, newValue }));
  }
  function hit(battle, actor, target, choice, result, oldValue, newValue, maximum, fireDistance, healing = false) {
    run(battle, actor, (out, caster) => {
      const victim = hero(target);
      const skill = { ...choice.skill, name: choice.name,
        isAccuracyWeapon: choice.weapon?.mode === 'accuracy' || choice.skill?.isAccuracyWeapon };
      const attribute = result.attribute === 'sanity' ? '当前理智'
        : healing ? `当前${choice.healStat || '活力'}` : '当前活力';
      const changes = { [attribute]: { oldValue, newValue, maxValue: maximum } };
      if (healing) out.recordHeal(caster, victim, skill, newValue - oldValue, changes, fireDistance);
      else {
        out.recordAttack(caster, victim, skill, result, changes, result.matchedRelations,
          fireDistance, result.lifeSaveMeta);
        out.logDetailedDamageCalculation(caster, victim, skill, {
          baseDamage: result.power ?? choice.power ?? result.incoming, attackPower: result.attack,
          defensePower: result.defense, finalDamage: oldValue - newValue,
          isCritical: result.isCritical });
      }
      out.logAttributeChange(victim, attribute, oldValue, newValue, choice.name);
    });
  }
  function miss(battle, actor, target, choice, fireDistance) {
    run(battle, actor, (out, caster) => out.recordMiss(caster, hero(target),
      { name: choice.name }, fireDistance));
  }
  function effect(battle, caster, target, value, action = 'applied') {
    run(battle, caster || target, (out, actor) => {
      const recipient = hero(target);
      out.logEffectApplication(recipient, value, action);
      if (action === 'applied') out._recordEffectApplied(actor, recipient, value.name);
      else out._recordEffectExpired(recipient, value.name);
    });
  }
  function trigger(battle, actor, name, message) {
    run(battle, actor, (out, caster) => out.logEffectTrigger(caster, name, message));
  }
  function mercyChoices(battle) {
    return battle.units.filter(unit => unit.side === 'enemy' && unit.hp <= 0 &&
      !unit.isSummon && !unit.playSource && unit.source === 'npc')
      .map(unit => ({ id: unit.id, name: unit.name }));
  }
  function build(data, spared = [], detailed = false) {
    const battle = copy(data?.cryptLord?.teamBattle);
    if (!battle || battle.status !== 'finished') return { ok: false, error: '战斗尚未结束。' };
    if (battle.reportState && battle.reportState.version !== 1)
      return { ok: false, error: '战报版本不可识别。' };
    const choices = mercyChoices(battle);
    if (!Array.isArray(spared) || spared.some(id => !choices.some(row => row.id === id)))
      return { ok: false, error: '手下留情的目标已变化。' };
    initialize(battle, data);
    const out = reporter(battle);
    out.setSparedEnemies(choices.filter(row => spared.includes(row.id)).map(row => row.name));
    const heroes = battle.units.map(unit => {
      const plain = copy(unit); plain.effects = [];
      modules['cryptLord.teamBattleState'].recalculateAttributes(plain);
      return hero(plain, data);
    });
    const player = heroes.find(row => row.dataSource === 'player' && !row.isSummon);
    if (player) {
      const current = modules['cryptLord.personalBattleState']?.consumableMoves(data) || [];
      player.moveSet = [...new Set([...(battle.reportState.initialConsumables || []),
        ...current.map(row => row.name)])].map(name => ({ name, isConsumable: true,
        remainingUses: current.filter(row => row.name === name)
          .reduce((sum, row) => sum + numeric(row.quantity), 0) }));
    }
    const format = out.formatRoundBreakdown.bind(out);
    out.formatRoundBreakdown = (round, logs, fallback) => format(round, logs,
      battle.reportState.snapshots[String(round)]?.map(unit => hero(unit, data)) || fallback);
    const formatAction = out.formatActionDetails.bind(out);
    out.formatActionDetails = row => row.type === 'native_log'
      ? `  ${row.message}\n` : formatAction(row);
    const text = detailed ? out.generateDetailedReport(heroes) : out.generateBattleReport(heroes);
    return { ok: true, text: text.replace(/(?:NaN|Infinity)%/g, '未定义'),
      legacy: battle.reportState.legacy, choices };
  }
  const api = { initialize, capture, roundStart, cost, hit, miss, effect, trigger, mercyChoices, build,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
