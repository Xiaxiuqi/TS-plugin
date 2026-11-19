(() => {
  'use strict';

  const KEY = 'cryptLord.teamBattleState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] contract unavailable`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const experience = modules['cryptLord.battleExperience'];
  if (!experience) throw new Error(`[${KEY}] battleExperience unavailable`);
  const terrainPresets = modules['cryptLord.battleTerrainPresets'];
  const painter = modules['cryptLord.battlefieldPainter'];
  const environment = modules['cryptLord.naturalEnvironment'];
  const lifeSave = modules['cryptLord.battleLifeSave'];
  const battleTags = modules['cryptLord.battleTags'];
  const effectsFor = () => modules['cryptLord.battleEffects'];
  const COLS = 12;
  const ROWS = 10;
  const MAX_LOG = 160;
  const clone = value => {
    const copied = typeof structuredClone === 'function'
      ? structuredClone(value) : JSON.parse(JSON.stringify(value));
    const battle = copied?.cryptLord?.teamBattle;
    if (battle && (!battle.reportState || battle.reportState.version === 1))
      modules['cryptLord.battleReport']?.initialize(battle, copied);
    return copied;
  };
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const cap = (value, max) => Math.max(0, Math.min(max, num(value)));
  const name = value => String(value ?? '').trim();
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const alive = unit => unit.hp > 0;
  const onField = unit => alive(unit) && !unit.exiled && !unit.offField && !unit.activeLeaving && !unit.possessedHidden;
  const formulasFor = battle => battle?.formulas?.version === 1
    ? modules['cryptLord.battleFormulas'] : null;
  const rollFor = battle => formulasFor(battle)
    ? () => formulasFor(battle).draw(battle)
    : battle?.fieldEffectMeta && modules['cryptLord.battleFieldEffects']
      ? () => modules['cryptLord.battleFieldEffects'].draw(battle) : Math.random;
  const aurasFor = battle => battle?.auraState?.version === 1
    ? modules['cryptLord.battleAuras'] : null;
  const fieldsFor = battle => battle?.fieldEffectMeta?.version === 1
    ? modules['cryptLord.battleFieldEffects'] : null;
  const transferFor = battle => battle?.effectTransferMeta?.version === 1
    ? modules['cryptLord.battleEffectTransfer'] : null;
  const terrainFor = () => modules['cryptLord.battleTerrainEffects'];
  const resourceFor = () => modules['cryptLord.battleResourceStatus'];
  const autoPilotFor = () => modules['cryptLord.battleAutoPilot'];
  const skillControlFor = () => modules['cryptLord.battleSkillControl'];
  const prepareSkillControl = battle => {
    if (skillControlFor() && !battle.skillControlMeta)
      skillControlFor().initialize(battle, battle.fieldEffectMeta?.pathways);
  };
  const briberyFor = battle => battle?.briberyMeta?.version === 1
    ? modules['cryptLord.battleBribery'] : null;
  const conditionsFor = () => modules['cryptLord.battleTeamConditions'];
  const balanceFor = battle => battle?.balanceMeta?.version === 1
    ? modules['cryptLord.battleBalance'] : null;
  const punishmentFor = battle => battle?.punishmentMeta?.version === 1
    ? modules['cryptLord.battlePunishment'] : null;
  const mythicFor = battle => battle?.mythicMeta?.version === 1
    ? modules['cryptLord.battleMythicForm'] : null;
  const exileFor = battle => battle?.exileMeta?.version === 1
    ? modules['cryptLord.battleExile'] : null;
  const activeLeaveFor = battle => battle?.activeLeaveMeta?.version === 1
    ? modules['cryptLord.battleActiveLeave'] : null;
  const eventsFor = battle => battle?.battleEventMeta?.version === 1
    ? modules['cryptLord.battleEvents'] : null;
  const rewindFor = battle => battle?.rewindMeta?.version === 1
    ? modules['cryptLord.battleRewind'] : null;
  const extraFor = battle => battle?.extraActionMeta?.version === 1
    ? modules['cryptLord.battleExtraAction'] : null;
  const hardFor = battle => battle?.hardControlMeta?.version === 1
    ? modules['cryptLord.battleHardControl'] : null;
  const mindFor = battle => battle?.mindDepriveMeta?.version === 1
    ? modules['cryptLord.battleMindDeprive'] : null;
  const tempFor = battle => battle?.tempControlMeta?.version === 1
    ? modules['cryptLord.battleTempControl'] : null;
  const permanentFor = battle => battle?.permanentControlMeta?.version === 1
    ? modules['cryptLord.battlePermanentControl'] : null;
  const possessionFor = battle => battle?.possessionMeta?.version === 1
    ? modules['cryptLord.battlePossession'] : null;
  const rulesFor = battle => battle?.ruleChangeMeta?.version === 1
    ? modules['cryptLord.battleRuleChange'] : null;
  const environmentFor = battle => battle?.environmentMeta?.version === 1
    ? modules['cryptLord.battleEnvironment'] : null;
  const fundamentalFor = battle => battle?.fundamentalMeta?.version === 1
    ? modules['cryptLord.battleFundamental'] : null;
  const summonFor = battle => battle?.summonMeta?.version === 1
    ? modules['cryptLord.battleSummon'] : null;
  const cardFor = (data, actor) => actor.summonCard || actor.playCard ||
    (actor.source === 'player' ? data.stat_data :
      modules['cryptLord.audienceImaginationState']?.cardFor(data, actor) || data.npc_data?.[actor.id]);
  const finalize = data => {
    modules['cryptLord.battleSummon']?.flush(data);
    if (data.cryptLord?.teamBattle)
      modules['cryptLord.battleReport']?.capture(data.cryptLord.teamBattle);
    return data;
  };
  function sweepAuthorities(battle, endRound = false) {
    balanceFor(battle)?.sweep(battle, endRound);
    punishmentFor(battle)?.sweep(battle);
    exileFor(battle)?.checkDead(battle);
    activeLeaveFor(battle)?.checkDead(battle);
    possessionFor(battle)?.sweep(battle);
    permanentFor(battle)?.sweep(battle);
    rulesFor(battle)?.sweep(battle);
    environmentFor(battle)?.sync(battle);
    fundamentalFor(battle)?.sweep(battle, endRound);
    summonFor(battle)?.sweep(battle, endRound);
  }
  function finishAuthorities(battle) {
    if (battle.skillControlMeta) skillControlFor()?.finish(battle);
    autoPilotFor()?.finish(battle);
    resourceFor()?.finish(battle);
    terrainFor()?.finish(battle);
    summonFor(battle)?.finish(battle);
    balanceFor(battle)?.finish(battle);
    punishmentFor(battle)?.finish(battle);
    mythicFor(battle)?.finish(battle);
    exileFor(battle)?.finish(battle);
    activeLeaveFor(battle)?.finish(battle);
    eventsFor(battle)?.finish(battle);
    extraFor(battle)?.finish(battle);
    hardFor(battle)?.finish(battle);
    mindFor(battle)?.finish(battle);
    tempFor(battle)?.finish(battle);
    permanentFor(battle)?.finish(battle);
    possessionFor(battle)?.finish(battle);
    rulesFor(battle)?.finish(battle);
    environmentFor(battle)?.finish(battle);
    fundamentalFor(battle)?.finish(battle);
  }
  const hasConditions = skill => Boolean((skill?.conditionalParams || skill?.条件参数集)?.length);
  const affordable = (actor, choice) => actor[choice.costKey || 'spirit'] >= choice.cost;
  const playerControlled = actor => (actor?.controller || actor?.source) === 'player';
  const moduleError = (battle, allowSkipped = false) => battle.formulas && !formulasFor(battle)
    ? '本场原版公式模块不可用，请重启本项目脚本。'
    : battle.effectLifecycle && (!effectsFor() || battle.effectLifecycle.version !== 1)
      ? '本场持续效果模块或存档版本不可用，请重启本项目脚本。'
    : battle.auraState && !aurasFor(battle) ? '本场光环模块不可用，请重启本项目脚本。'
    : battle.fieldEffectMeta && !fieldsFor(battle) ? '本场施加效果模块不可用，请重启本项目脚本。'
    : battle.effectTransferMeta && !transferFor(battle) ? '本场效果传递模块不可用，请重启本项目脚本。'
    : battle.briberyMeta && !briberyFor(battle) ? '本场贿赂模块不可用，请重启本项目脚本。'
    : battle.conditionMeta && !conditionsFor() ? '本场条件参数模块不可用，请重启本项目脚本。'
    : battle.balanceMeta && (!balanceFor(battle) || !formulasFor(battle))
      ? '本场平衡权柄或原版公式模块不可用，请重启本项目脚本。'
    : battle.punishmentMeta && !punishmentFor(battle)
      ? '本场惩戒模块不可用，请重启本项目脚本。'
    : battle.mythicMeta && !mythicFor(battle)
      ? '本场神话形态模块不可用，请重启本项目脚本。'
    : battle.exileMeta && !exileFor(battle)
      ? '本场放逐模块不可用，请重启本项目脚本。'
    : battle.activeLeaveMeta && !activeLeaveFor(battle)
      ? '本场主动离场模块不可用，请重启本项目脚本。'
    : battle.battleEventMeta && !eventsFor(battle)
      ? '本场战场事件模块不可用，请重启本项目脚本。'
    : battle.rewindMeta && !rewindFor(battle)
      ? '本场回溯模块不可用，请重启本项目脚本。'
    : battle.extraActionMeta && !extraFor(battle)
      ? '本场额外行动模块不可用，请重启本项目脚本。'
    : battle.hardControlMeta && !hardFor(battle)
      ? '本场硬控模块不可用，请重启本项目脚本。'
    : battle.mindDepriveMeta && !mindFor(battle)
      ? '本场心智剥夺模块不可用，请重启本项目脚本。'
    : battle.tempControlMeta && !tempFor(battle)
      ? '本场阵营短控模块不可用，请重启本项目脚本。'
    : battle.permanentControlMeta && !permanentFor(battle)
      ? '本场永久控制模块不可用，请重启本项目脚本。'
    : battle.possessionMeta && !possessionFor(battle)
      ? '本场附身模块不可用，请重启本项目脚本。'
    : battle.ruleChangeMeta && !rulesFor(battle)
      ? '本场规则修改模块不可用，请重启本项目脚本。'
    : battle.environmentMeta && !environmentFor(battle)
      ? '本场改变环境模块不可用，请重启本项目脚本。'
    : battle.fundamentalMeta && !fundamentalFor(battle)
      ? '本场底层规则模块不可用，请重启本项目脚本。'
    : battle.summonMeta && !summonFor(battle)
      ? '本场召唤模块不可用，请重启本项目脚本。'
    : battle.borrowMeta && !modules['cryptLord.battleAbilityBorrow']
      ? '本场能力借用模块不可用，请重启本项目脚本。'
    : battle.tacticCpuMeta && !modules['cryptLord.battleTacticCpu']
      ? '本场统一战术模块不可用，请重启本项目脚本。'
    : battle.actionCpuMeta && !modules['cryptLord.battleActionCpu']
      ? '本场原版行动 CPU 不可用，请重启本项目脚本。'
    : battle.terrainEffectMeta && !terrainFor()
      ? '本场危险地形持续结算模块不可用，请重启本项目脚本。'
    : battle.resourceStatusMeta && !resourceFor()
      ? '本场五维资源状态模块不可用，请重启本项目脚本。'
    : battle.autoPilotMeta && !autoPilotFor()
      ? '本场多人托管模块不可用，请重启本项目脚本。'
    : battle.skillControlMeta && !skillControlFor()
      ? '本场技能干涉模块不可用，请重启本项目脚本。'
    : battle.reportState && (!modules['cryptLord.battleReport'] || battle.reportState.version !== 1)
      ? '本场战斗报告模块或版本不可用，请重启本项目脚本。'
    : battle.territoryMeta && (!modules['cryptLord.shamanTerritoryBattle'] || battle.territoryMeta.version !== 1)
      ? '本场领地图腾模块或版本不可用，请重启本项目脚本。'
    : battle.jurisdictionMeta && (!modules['cryptLord.arbiterJurisdictionBattle'] || battle.jurisdictionMeta.version !== 1)
      ? '本场仲裁人辖区模块或版本不可用，请重启本项目脚本。'
    : battle.imaginationMeta && (!modules['cryptLord.audienceImaginationState'] || battle.imaginationMeta.version !== 1)
      ? '本场空想投影模块或版本不可用，请重启本项目脚本。'
    : battle.units.some(unit => unit.playRecord) &&
      (!modules['cryptLord.battlePlayUnits'] || battle.playUnitMeta?.version !== 1)
      ? '本场专属玩法单位模块或版本不可用，请重启本项目脚本。'
    : !allowSkipped && battle.phase === 'tactic' && autoPilotFor()?.isOn(battle)
      ? '当前由托管执行，请先关闭托管再操作。'
    : !allowSkipped && battle.phase === 'tactic' &&
      battle.units.find(unit => unit.source === 'player')?.possessedHidden
      ? '附身期间只能继续或解除附身。'
    : !allowSkipped && battle.phase === 'tactic' &&
      hardFor(battle)?.occupied(battle, battle.units.find(unit => unit.source === 'player'))
      ? '当前受硬控，本轮只能跳过战术阶段。' : '';
  const inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x < COLS && y < ROWS;
  function prepareLifeSave(battle, data, table) {
    if (!lifeSave) return;
    if (!object(battle.lifeSaveTable)) battle.lifeSaveTable =
      clone(object(table) ? table : lifeSave.defaults);
    for (const actor of battle.units) {
      if (actor.lifeSave) continue;
      const card = cardFor(data, actor);
      lifeSave.initialize(actor, actor.sequence,
        actor.pathway ?? card?.当前途径 ?? card?.途径 ?? card?.pathway ?? card?.所属途径,
        battle.lifeSaveTable, actor.source === 'player'
          ? data?.cryptLord?.lifeSaveStrategy || null : null,
        battle.lifeSavePathways || battle.fieldEffectMeta?.pathways || battle.formulas?.pathways);
    }
  }
  function syncEnvironment(battle) {
    if (battle.environmentMeta) {
      environmentFor(battle)?.sync(battle);
      return;
    }
    if (!environment) return;
    battle.naturalEnv = environment.parse(battle.naturalEnv);
    for (const actor of battle.units) {
      const resolved = environment.resolve({ sequenceString: actor.sequence },
        battle.naturalEnv);
      actor.effects = (actor.effects || []).filter(effect => !effect.environment)
        .concat(resolved.effects);
      actor.envMoveBonus = resolved.move;
    }
  }
  function connectedTerrain(battle, tiles) {
    const blocked = new Set([...tiles.values()].filter(tile => tile.blocked)
      .map(tile => `${tile.x},${tile.y}`));
    const start = battle.units[0];
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length) {
      const cell = queue.shift();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = cell.x + dx, y = cell.y + dy, key = `${x},${y}`;
        if (!inBounds(x, y) || seen.has(key) || blocked.has(key)) continue;
        seen.add(key); queue.push({ x, y });
      }
    }
    return battle.units.every(unit => seen.has(`${unit.x},${unit.y}`));
  }
  function deployOpening(battle, raw) {
    if (!Array.isArray(raw) || raw.length < battle.units.length) return false;
    const positions = new Map();
    const occupied = new Set();
    for (const unit of battle.units) {
      const matches = raw.filter(row => name(row?.编号) === unit.id);
      if (matches.length !== 1) return false;
      const x = Number(matches[0].x), y = Number(matches[0].y);
      const key = `${x},${y}`;
      const tile = battle.terrain.find(row => row.x === x && row.y === y);
      if (!inBounds(x, y) || occupied.has(key) || tile?.id || tile?.blocked ||
        num(tile?.tier) >= 3) return false;
      positions.set(unit.id, { x, y }); occupied.add(key);
    }
    const saved = battle.units.map(unit => ({ x: unit.x, y: unit.y }));
    battle.units.forEach(unit => Object.assign(unit, positions.get(unit.id)));
    if (connectedTerrain(battle, new Map(battle.terrain.map(tile =>
      [`${tile.x},${tile.y}`, tile])))) return true;
    battle.units.forEach((unit, i) => Object.assign(unit, saved[i]));
    return false;
  }
  function paintOpening(battle, plan) {
    if (!object(plan) || !painter || !environment) return;
    battle.scene = name(plan.场景).slice(0, 300);
    const baseTier = Math.min(1, Math.max(0, Math.round(num(plan.基底?.分级))));
    battle.board.base = { name: name(plan.基底?.名称).slice(0, 60) || '平地',
      tier: baseTier };
    battle.naturalEnv = environment.parse(plan.自然环境);
    battle.props = parseProps(plan.可互动物品);
    const tiles = new Map();
    const kinds = new Set();
    let strokes = 0;
    for (const brush of (Array.isArray(plan.笔刷) ? plan.笔刷 : []).slice(0, 100)) {
      if (!object(brush)) continue;
      const preset = brush.地形 ? terrainPresets?.option(name(brush.地形)) : null;
      if (brush.地形 && !preset) continue;
      const tier = preset ? preset.tier :
        Math.min(4, Math.max(0, Math.round(num(brush.分级))));
      if (preset && (!kinds.has(preset.id) && kinds.size >= 3 ||
        brush.形状 === 'circle' && num(brush.r) > 1)) continue;
      const raw = Number(brush.存在回合);
      if (preset && brush.存在回合 != null &&
        (!Number.isInteger(raw) || raw < 0 || raw > 99)) continue;
      // Spawn rows allow only passable ground, and occupied cells never become hazardous or blocked.
      const safe = painter.rasterize(brush, COLS, ROWS).filter(({ x, y }) =>
        (y !== 0 && y !== ROWS - 1 || !preset && tier < 3) &&
        !((preset || tier >= 3) && battle.units.some(unit => unit.x === x && unit.y === y)));
      if (!safe.length) continue;
      const count = [...tiles.values()].filter(tile => tile.id).length;
      const replaced = safe.filter(({ x, y }) => tiles.get(`${x},${y}`)?.id).length;
      if (preset && (safe.length > 6 || count - replaced + safe.length >
        Math.floor(COLS * ROWS * .15))) continue;
      const tile = { id: preset?.id || null,
        name: preset?.name || name(brush.名称).slice(0, 60) || '通行地形',
        tier, blocked: preset ? preset.blocked : tier >= 3,
        rank: preset?.id ? terrainPresets.get(preset.id)?.rank : null,
        duration: preset && (brush.存在回合 == null ? preset.rounds : raw) > 0
          ? brush.存在回合 == null ? preset.rounds : raw : null,
        creator: null };
      const candidate = new Map(tiles);
      for (const { x, y } of safe) candidate.set(`${x},${y}`, { ...tile, x, y });
      if (!connectedTerrain(battle, candidate)) continue;
      tiles.clear();
      for (const [key, value] of candidate) tiles.set(key, value);
      if (preset) kinds.add(preset.id);
      strokes++;
    }
    battle.terrain = [...tiles.values()];
    deployOpening(battle, plan.初始站位);
    syncEnvironment(battle);
    log(battle, `战场绘制完成：${strokes} 笔，${battle.props.length} 种现场物件。`);
  }
  const CATEGORIES = Object.freeze({
    攻击力加强: ['buff', 'attack', 20], 攻击力削弱: ['debuff', 'attack', 20],
    防御力加强: ['buff', 'defense', 20], 防御力削弱: ['debuff', 'defense', 20],
    速度加强: ['buff', 'speed', 20], 速度削弱: ['debuff', 'speed', 20],
    持续伤害: ['poison', null, 4], 持续恢复: ['regen', null, 4],
    一次性伤害: ['poison', null, 7], 一次性恢复: ['regen', null, 7],
  });
  const EFFECT_STATS = ['当前活力', '当前灵性', '当前人性', '当前理智', '当前敏捷'];
  const TIERS = ['克制目标', '无明显克制关系', '被目标反向克制',
    '相性良好', '无特殊相性关系', '相性不佳'];
  const SKILL_CONTROL = Object.freeze({
    仲裁人: { 禁止: [6, '禁止'] }, 歌颂者: { 禁止: [6, '公证无效'] },
    囚犯: { 禁止: [3, '变形诅咒'] }, 病患: { 禁止: [3, '能力衰败'] },
    入门者: { 禁止: [4, '哲学具象化：规则修改'] },
    流浪汉: { 禁止: [5, '临时能力剥夺'], 偷窃: [5, '能力吞噬'] },
    阅读者: { 禁止: [1, '星界导师权柄'], 复制: [6, '模仿'] },
    战士: { 禁止: [0, '「战斗」权柄'] },
    偷盗者: { 偷窃: [6, '窃取非凡能力'] },
    学徒: { 复制: [6, '记录'] },
  });
  function parseProps(raw) {
    const props = [];
    const seen = new Set();
    for (const row of Array.isArray(raw) ? raw : []) {
      if (props.length >= 24) break;
      if (!object(row)) continue;
      const title = name(row.名称).slice(0, 60);
      const count = Number(row.数量);
      if (!title || seen.has(title) || !Number.isFinite(count) || Math.floor(count) <= 0) continue;
      seen.add(title);
      props.push({ 名称: title, 描述: name(row.描述).slice(0, 40),
        数量: Math.floor(count), 初始数量: Math.floor(count) });
    }
    return props.filter(row => row.数量 > 0);
  }
  function normalizePropCost(raw, battle) {
    const seen = new Set();
    return (Array.isArray(raw) ? raw : []).flatMap(row => {
      const title = name(row?.名称);
      const quantity = Number(row?.数量);
      if (!title || seen.has(title) || !battle.props?.some(prop =>
        prop.名称 === title && prop.数量 > 0) ||
        !Number.isFinite(quantity) || Math.floor(quantity) < 1) return [];
      seen.add(title);
      return [{ 名称: title, 数量: Math.floor(quantity) }];
    });
  }
  function consumeProps(battle, cost) {
    const spent = [];
    for (const row of cost) {
      const prop = battle.props.find(item => item.名称 === row.名称);
      const amount = Math.min(prop.数量, row.数量);
      if (amount <= 0) continue;
      prop.数量 -= amount;
      spent.push(`${row.名称} ×${amount}`);
    }
    return spent;
  }
  const LIMITS = { 当前活力: 'maxHp', 当前灵性: 'maxSpirit',
    当前理智: 'maxSanity', 当前敏捷: 'maxAgility', 当前人性: 'maxHumanity' };
  const CURRENT = { 当前活力: 'hp', 当前灵性: 'spirit',
    当前理智: 'sanity', 当前敏捷: 'agility', 当前人性: 'humanity' };
  const ATTRIBUTES = { 活力: ['hp', 'maxHp'], 灵性: ['spirit', 'maxSpirit'],
    敏捷: ['agility', 'maxAgility'], 理智: ['sanity', 'maxSanity'],
    人性: ['humanity', 'maxHumanity'], 运气: ['luck', 'maxLuck'] };
  const EFFECT_MODIFIERS = ['attack', 'defense', 'speed', 'movement',
    'damageDealtIncrease', 'damageDealtDecrease', 'damageTakenIncrease', 'damageTakenDecrease'];
  function effectiveValue(actor, stat, base) {
    let fixed = 0, percentage = 0;
    for (const effect of actor.effects || []) {
      if (effect.stat !== stat || !['buff', 'debuff'].includes(effect.type)) continue;
      const signed = effect.power * (effect.type === 'buff' ? 1 : -1);
      if (effect.valueType === 'fixed') fixed += signed;
      else percentage += signed;
    }
    return Math.max(0, base * (1 + percentage / 100) + fixed);
  }
  function recalculateAttributes(actor) {
    if (effectsFor()) return effectsFor().recalculate(actor);
    actor.baseAttributes ||= Object.fromEntries(Object.entries(ATTRIBUTES)
      .map(([stat, [, max]]) => [stat, num(actor[max], actor.luck)]));
    for (const [stat, [key, max]] of Object.entries(ATTRIBUTES)) {
      const value = Math.floor(effectiveValue(actor, stat, actor.baseAttributes[stat]));
      actor[max] = value;
      actor[key] = stat === '运气' ? value : cap(actor[key], value);
    }
  }
  function storeSkillEffect(battle, actor, target, raw, skill, passive = false) {
    if (effectsFor()) return effectsFor().apply(battle, actor, target, raw, skill, passive);
    if (!object(raw) || !name(raw.name) ||
      !['buff', 'debuff', 'poison', 'regen'].includes(raw.type)) return false;
    const stat = raw.stat ?? (['poison', 'regen'].includes(raw.type) ? '当前活力' : null);
    if (['buff', 'debuff'].includes(raw.type)
      ? !EFFECT_MODIFIERS.includes(stat) && !ATTRIBUTES[stat] : !CURRENT[stat]) return false;
    const valueType = raw.modifier != null && raw.power == null ? 'percentage'
      : raw.valueType ?? 'fixed';
    if (!['fixed', 'percentage'].includes(valueType) ||
      stat.startsWith('damage') && valueType !== 'percentage') return false;
    const duration = raw.duration ?? 3;
    if (!Number.isInteger(duration) || duration < 1 || duration > 99) return false;
    const sourcePower = raw.power ?? (num(raw.modifier) * 100);
    let power = object(sourcePower)
      ? num(sourcePower[actor.rank] ?? sourcePower.default ?? sourcePower['9'])
      : num(sourcePower);
    if (power < 0) return false;
    if (['poison', 'regen'].includes(raw.type)) power = Math.max(0, Math.floor(power *
      (1 + (battleTags?.modifier(actor, target, skill, raw.type === 'poison'
        ? battle.tagRules.damage : battle.tagRules.healing) || 0))));
    const effect = { name: name(raw.name), stat, type: raw.type, power, duration,
      valueType, battlePersistent: raw.battlePersistent === true,
      triggerTiming: ['turn_start', 'turn_end', 'round_end'].includes(raw.triggerTiming)
        ? raw.triggerTiming : 'turn_start',
      priority: num(raw.priority),
      skillEffect: true, passive, sourceHeroId: actor.id };
    if (passive && (skill.$放牧来源 || skill.$空想来源 || skill.$秘术投影 || skill.$神秘再现投影))
      effect.pathwayProjectionPassive = true;
    const store = (recipient, instance) => {
      recipient.effects ||= [];
      const existing = recipient.effects.find(row => row.name === instance.name &&
        (row.duration > 0 || row.battlePersistent));
      if (existing) {
        if (existing.power > instance.power || existing.power === instance.power &&
          existing.duration >= instance.duration) return false;
        if (existing.power === instance.power) {
          existing.duration = instance.duration;
          if (instance.effectTransferResolved) existing.effectTransferResolved = true;
        } else recipient.effects[recipient.effects.indexOf(existing)] = instance;
      } else recipient.effects.push(instance);
      recalculateAttributes(recipient);
      modules['cryptLord.battleReport']?.effect(battle, actor, recipient, instance);
      return true;
    };
    const transfer = transferFor(battle);
    return transfer ? transfer.routeEffect(battle, target, effect, {
      transferableExternal: !passive, sourceLabel: `${actor.name}的「${name(skill.名称 || skill.name)}」`,
      sourceKind: '技能负效',
    }, store) : store(target, effect);
  }
  function prepareTagsAndPassives(battle, data, rules) {
    battle.tagRules ||= clone(object(rules) ? rules : { mapping: {}, damage: {}, healing: {} });
    for (const actor of battle.units) {
      if (actor.tagsAndPassivesInitialized) continue;
      const card = cardFor(data, actor);
      actor.tags = Array.isArray(actor.tags) ? actor.tags : [];
      for (const row of Array.isArray(card?.tags ?? card?.标签) ? card.tags ?? card.标签 : []) {
        if (typeof row === 'string') battleTags?.add(actor, row, 99, 1, 99, 'applied', battle);
        else if (object(row)) battleTags?.add(actor, row.name ?? row.名称,
          row.duration ?? 99, row.stacks, row.maxStacks, 'applied', battle);
      }
      battleTags?.sync(actor, actor.sequence, battle.tagRules.mapping, battle);
      for (const skill of rawAbilities(card).filter(row =>
        row.isPassive === true || /被动/.test(name(row.类型)))) {
        let applied = 0;
        for (const effect of Array.isArray(skill.effects) ? skill.effects : [])
          if (storeSkillEffect(battle, actor, actor, effect, skill, true)) applied++;
        if (applied) log(battle, `${actor.name} 的被动「${name(skill.名称 || skill.name)}」生效。`);
      }
      actor.tagsAndPassivesInitialized = true;
    }
  }
  function effectTargets(battle, actor, center, choice, scope = 'target', excludeSelf = false) {
    if (scope === 'self') return [actor];
    const ally = ['allAlly', 'allAllies'].includes(scope);
    if (!['all', 'allEnemies', 'allAlly', 'allAllies'].includes(scope)) return [center];
    return battle.units.filter(row => onField(row) &&
      (!excludeSelf || row !== actor) &&
      (ally ? row.side === actor.side : row.side !== actor.side) &&
      distance(row, center) <= choice.radius);
  }
  function damageAdjustment(actor, victim) {
    const sum = (unit, stat) => (unit.effects || []).filter(effect => effect.stat === stat)
      .reduce((total, effect) => total + effect.power / 100, 0);
    return sum(actor, 'damageDealtIncrease') - sum(actor, 'damageDealtDecrease') +
      sum(victim, 'damageTakenIncrease') - sum(victim, 'damageTakenDecrease');
  }
  function processSkillEffects(battle, actor, timing) {
    if (effectsFor()) return effectsFor().process(battle, actor, timing);
    const active = (actor.effects || []).filter(effect => (effect.skillEffect || effect.exilePoison) &&
      effect.triggerTiming === timing && (effect.battlePersistent || effect.duration > 0))
      .sort((a, b) => a.priority - b.priority);
    for (const effect of active) {
      if (['poison', 'regen'].includes(effect.type) && alive(actor)) {
        const key = CURRENT[effect.stat], max = actor[LIMITS[effect.stat]];
        const amount = effect.valueType === 'percentage'
          ? Math.floor(max * effect.power / 100) : effect.power;
        const loss = effect.type === 'poison' ? transferFor(battle)?.loss(battle, actor,
          effect.stat, amount, { derived: effect.effectTransferResolved === true,
            sourceKind: '持续伤害', sourceLabel: effect.name }) : null;
        const delta = effect.type === 'poison' ? -(loss?.actualDamage ?? Math.min(actor[key], amount))
          : Math.min(max - actor[key], amount);
        if (!loss) {
          actor[key] += delta;
          permanentFor(battle)?.markDamaged(battle, actor, -delta);
        }
        log(battle, `${actor.name} 的「${effect.name}」${delta < 0 ? '损失' : '恢复'} ${Math.abs(delta)} 点${effect.stat.slice(2)}。`);
      }
      if (!effect.battlePersistent) effect.duration--;
    }
    for (const effect of actor.effects || []) if (!effect.battlePersistent && effect.duration <= 0)
      modules['cryptLord.battleReport']?.effect(battle, actor, actor, effect, 'expired');
    actor.effects = (actor.effects || []).filter(effect => effect.battlePersistent ||
      effect.duration > 0);
    recalculateAttributes(actor);
  }
  function enterTurn(battle) {
    while (battle.index < battle.queue.length) {
      const actor = current(battle);
      const extra = extraFor(battle), slot = extra?.currentSlot(battle);
      if (slot?.voided || slot?.extra && extra.check(battle, actor)) {
        battle.index++; continue;
      }
      if (alive(actor) && !slot?.cfg?.skipTurnStart && actor.turnStartedRound !== battle.round) {
        actor.turnStartedRound = battle.round;
        if (!effectsFor()) fieldsFor(battle)?.turnStart(battle, actor);
        processSkillEffects(battle, actor, 'turn_start');
        resourceFor()?.turnStart(battle, actor);
        terrainFor()?.turnStart(battle, actor);
        briberyFor(battle)?.sweep(battle);
        sweepAuthorities(battle);
        if (formulasFor(battle)) {
          actor.movement = formulasFor(battle).movement(battle, actor);
          actor.moveRemaining = actor.movement;
        }
      }
      if (onField(actor)) {
        if (hardFor(battle)?.shouldSkip(battle, actor)) {
          hardFor(battle).consume(battle, actor);
          extra?.check(battle, actor);
          processSkillEffects(battle, actor, 'turn_end');
          battle.index++; continue;
        }
        extra?.enter(battle, actor);
        return;
      }
      extra?.check(battle, actor);
      if (alive(actor)) {
        processSkillEffects(battle, actor, 'turn_end');
        log(battle, `${actor.name} 在场外，本次不能行动。`);
      }
      battle.index++;
    }
  }
  function normalizeCells(raw) {
    if (!Array.isArray(raw)) return null;
    const cells = [];
    const seen = new Set();
    for (const cell of raw) {
      const x = Array.isArray(cell) ? cell[0] : cell?.x;
      const y = Array.isArray(cell) ? cell[1] : cell?.y;
      if (!inBounds(x, y)) return null;
      const key = `${x},${y}`;
      if (!seen.has(key)) { seen.add(key); cells.push([x, y]); }
    }
    if (!cells.length || cells.length > 9 ||
      Math.max(...cells.map(cell => cell[0])) - Math.min(...cells.map(cell => cell[0])) > 2 ||
      Math.max(...cells.map(cell => cell[1])) - Math.min(...cells.map(cell => cell[1])) > 2)
      return null;
    return cells;
  }
  function terrainBrush(brush, battle, actor, audit = null) {
    const cells = normalizeCells(brush?.格子);
    if (brush?.形状 !== 'cells' || !cells) return null;
    if (Array.isArray(brush.清除)) {
      const names = brush.清除.map(name).filter(Boolean);
      if (!names.length || !cells.some(([x, y]) => battle.terrain?.some(tile =>
        tile.x === x && tile.y === y && names.includes(tile.name)))) return null;
      return { cells, clear: names };
    }
    const preset = brush.地形 ? terrainPresets?.option(brush.地形) : null;
    if (brush.地形 && !preset) return null;
    if (!preset && !name(brush.名称)) return null;
    const rawTier = audit ? (audit.通行地形?.分级 ?? 2) : brush.分级;
    const tier = preset ? preset.tier : Number(rawTier);
    if (!preset && (!Number.isInteger(tier) || tier < 0 || tier > 2)) return null;
    const rawDuration = audit ? audit.存在回合 : brush.存在回合;
    const duration = preset ? Math.max(1, Math.min(3, Math.round(num(rawDuration, 3)))) : null;
    return { cells, terrain: {
      id: preset?.id || null, name: preset?.name || name(brush.名称),
      tier, blocked: Boolean(preset?.blocked), rank: actor.rank,
      duration, creator: actor.id,
    } };
  }
  function terrainWinners(entries) {
    const winners = new Set();
    const tiers = [...new Set(entries.filter(entry => entry.unit.sanity > 0)
      .map(entry => Math.ceil(entry.unit.rank)))].sort((a, b) => a - b);
    const carry = { ally: 0, enemy: 0 };
    for (const tier of tiers) {
      const at = side => entries.filter(entry => entry.unit.sanity > 0 &&
        Math.ceil(entry.unit.rank) === tier && entry.unit.side === side);
      const strength = side => carry[side] + at(side).reduce((sum, entry) =>
        sum + (entry.actionType === '待命' ? 1 : .25), 0);
      const diff = strength('ally') - strength('enemy');
      carry.ally = 0; carry.enemy = 0;
      if (!diff) continue;
      const side = diff > 0 ? 'ally' : 'enemy';
      const slots = Math.ceil(Math.abs(diff));
      const wants = at(side).filter(entry =>
        entry.actionType === '改变地形' && !entry.infeasible);
      wants.sort((a, b) => Number(b.player) - Number(a.player));
      wants.slice(0, slots).forEach(entry => winners.add(entry));
      carry[side] = Math.max(0, slots - wants.length);
    }
    return winners;
  }
  const log = (battle, message, details = null) => {
    const slot = extraFor(battle)?.currentSlot(battle);
    const actor = current(battle);
    if (slot?.extra && actor && message.startsWith(`${actor.name} `))
      message = `${slot.alias} ${message.slice(actor.name.length + 1)}`;
    battle.log.push({ round: battle.round, message, at: Date.now(), ...(details || {}) });
    if (battle.log.length > MAX_LOG) battle.log.shift();
  };

  function roster(data, pool) {
    const npcs = object(data?.npc_data) ? data.npc_data : {};
    return Object.entries(npcs).filter(([key, card]) => key !== '$meta' && object(card) &&
      name(key) && num(card.当前活力) > 0 && num(card.活力, card.当前活力) > 0)
      .map(([key, card]) => ({
        key, name: name(card.名称) || key, hp: num(card.当前活力),
        rank: experience.rank(card.当前序列),
      })).concat(modules['cryptLord.battlePlayUnits']?.roster(data, pool) || []);
  }

  function unit(card, id, side, source, x, y, original = false) {
    if (original) {
      card = { ...card };
      for (const [stat, fallback] of Object.entries({
        活力: 100, 灵性: 50, 理智: 100, 人性: 100, 敏捷: 50, 运气: 50,
      })) {
        card[stat] ??= fallback;
        if (stat !== '运气') card[`当前${stat}`] ??= card[stat];
      }
    }
    const maxHp = Math.max(1, num(card.活力, card.当前活力), num(card.当前活力));
    const hp = cap(card.当前活力 ?? maxHp, maxHp);
    const maxSpirit = Math.max(0, num(card.灵性, card.当前灵性));
    return {
      id, side, source, name: source === 'player' ? name(card.名称 || card.姓名) || '<User>' : id,
      x, y, hp, maxHp, startingHp: hp, spirit: cap(card.当前灵性 ?? maxSpirit, maxSpirit),
      maxSpirit, startingSpirit: cap(card.当前灵性 ?? maxSpirit, maxSpirit),
      agility: Math.max(0, num(card.当前敏捷, card.敏捷)),
      maxAgility: Math.max(0, num(card.敏捷, card.当前敏捷)),
      startingAgility: Math.max(0, num(card.当前敏捷, card.敏捷)),
      sanity: Math.max(0, num(card.当前理智, card.理智)),
      maxSanity: Math.max(0, num(card.理智, card.当前理智)),
      startingSanity: Math.max(0, num(card.当前理智, card.理智)),
      humanity: Math.max(0, num(card.当前人性, card.人性)),
      maxHumanity: Math.max(0, num(card.人性, card.当前人性)),
      startingHumanity: Math.max(0, num(card.当前人性, card.人性)),
      luck: Math.max(0, num(card.当前运气, card.运气)),
      maxLuck: Math.max(0, num(card.运气, card.当前运气)),
      divinity: Math.max(0, num(card.神性, 1)),
      power: Math.max(1, Math.round(num(card.攻击, card.当前敏捷 ?? card.敏捷) * .3)),
      rank: experience.rank(card.当前序列), sequence: name(card.当前序列),
      pathway: name(card.当前途径 ?? card.途径 ?? card.pathway ?? card.所属途径),
      effects: [], damage: 0, healing: 0, kills: 0, moves: 0,
    };
  }

  function queue(battle) {
    if (formulasFor(battle)) return formulasFor(battle).initiative(battle);
    return battle.units.filter(alive).sort((a, b) =>
      effectiveValue(b, 'speed', b.agility) - effectiveValue(a, 'speed', a.agility) ||
      a.id.localeCompare(b.id)).map(unit => unit.id);
  }
  function createSummonUnit(battle, card, displayName, side) {
    const id = `summon_${++battle.summonMeta.serial}`;
    return { ...unit(card, id, side, 'npc', -1, -1), name: displayName,
      summonCard: clone(card), isSummon: true };
  }
  function prepareSummon(battle, actor, data) {
    const probe = { ...battle, units: [actor] };
    prepareLifeSave(probe, data);
    prepareTagsAndPassives(probe, data);
  }
  function refreshProjectionPassives(battle, actor, card) {
    actor.effects = (actor.effects || []).filter(row => !row.pathwayProjectionPassive);
    recalculateAttributes(actor);
    battleTags?.sync(actor, actor.sequence, battle.tagRules?.mapping || {}, battle);
    if (lifeSave && actor.lifeSave) {
      lifeSave.reconcile(actor, actor.sequence, actor.pathway, battle.lifeSaveTable,
        battle.lifeSavePathways || battle.fieldEffectMeta?.pathways || battle.formulas?.pathways);
    }
    for (const skill of rawAbilities(card).filter(row =>
      (row.$放牧来源 || row.$空想来源 || row.$秘术投影 || row.$神秘再现投影) &&
      (row.isPassive === true || /被动/.test(name(row.类型)))))
      for (const effect of Array.isArray(skill.effects) ? skill.effects : [])
        storeSkillEffect(battle, actor, actor, effect, skill, true);
  }
  function modifier(unit, stat) {
    return (unit.effects || []).reduce((sum, effect) =>
      effect.stat === stat && ['buff', 'debuff'].includes(effect.type)
        ? sum + effect.power * (effect.valueType === 'fixed'
          ? 100 / Math.max(1, unit.power) : 1) *
          (effect.type === 'buff' ? 1 : -1) : sum, 0);
  }
  function current(battle) {
    return battle.units.find(unit => unit.id === battle.queue[battle.index]) || null;
  }
  function occupied(battle, x, y) {
    return battle.units.find(unit => alive(unit) && unit.x === x && unit.y === y);
  }
  function result(battle) {
    const side = unit => tempFor(battle)?.originSide(battle, unit) ||
      mindFor(battle)?.originSide(battle, unit) ||
      briberyFor(battle)?.originSide(battle, unit) || unit.side;
    const allies = battle.units.some(unit => !unit.isSummon && side(unit) === 'ally' && alive(unit));
    const enemies = battle.units.some(unit => !unit.isSummon && side(unit) === 'enemy' && alive(unit));
    if (allies && enemies) return null;
    return allies ? 'victory' : enemies ? 'defeat' : 'draw';
  }
  function terrainEntry(battle, actor) {
    if (!onField(actor)) return;
    if (terrainFor()) return terrainFor().entry(battle, actor);
    const { x, y } = actor;
    for (const tile of battle.terrain || []) {
      if (tile.x !== x || tile.y !== y || !tile.id || !terrainPresets) continue;
      const terrainActor = { ...actor,
        tags: (actor.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name) };
      for (const hit of terrainPresets.hits(tile.id, terrainActor, tile.rank)) {
        if (hit.kind === 'damage') {
          if (hit.value >= 0) {
            const recovered = Math.max(0, Math.min(hit.value, actor.maxHp - actor.hp));
            actor.hp += recovered;
            if (recovered) log(battle, `${actor.name} 在「${tile.name}」恢复 ${recovered} 点活力。`);
            continue;
          }
          const loss = transferFor(battle)?.loss(battle, actor, '当前活力', Math.abs(hit.value),
            { sourceKind: '地形伤害', sourceLabel: tile.name });
          const damage = loss?.actualDamage ?? Math.min(actor.hp, Math.abs(hit.value));
          if (!loss) {
            actor.hp -= damage;
            permanentFor(battle)?.markDamaged(battle, actor, damage);
          }
          log(battle, `${actor.name} 受到「${tile.name}」${damage} 点伤害。`);
        } else if (hit.kind === 'status' && alive(actor)) {
          applyTacticEffect(actor, { name: tile.name, type: hit.value < 0 ? 'debuff' : 'buff', stat: hit.stat,
            power: Math.min(90, Math.abs(hit.value)), duration: 1, terrainSource: `${x},${y}` }, battle, actor);
          log(battle, `${actor.name} 受到「${tile.name}」状态影响。`);
        }
      }
    }
  }
  function finishRound(battle) {
    for (const unit of battle.units) processSkillEffects(battle, unit, 'round_end');
    battleTags?.tick(battle.units, battle);
    fieldsFor(battle)?.endRound(battle);
    transferFor(battle)?.sweep(battle, true);
    briberyFor(battle)?.sweep(battle, true);
    mindFor(battle)?.endRound(battle);
    tempFor(battle)?.endRound(battle);
    sweepAuthorities(battle, true);
    mythicFor(battle)?.tick(battle);
    exileFor(battle)?.endRound(battle);
    terrainFor()?.endRound(battle);
    if (battle.skillControlMeta) skillControlFor().tick(battle);
  }
  function advance(battle) {
    const actor = current(battle);
    const slot = extraFor(battle)?.currentSlot(battle);
    if (actor && !slot?.cfg?.freezeDurations) processSkillEffects(battle, actor, 'turn_end');
    if (actor) extraFor(battle)?.check(battle, actor);
    battle.index++;
    enterTurn(battle);
    if (battle.index >= battle.queue.length) {
      finishRound(battle);
    }
    aurasFor(battle)?.sweepDead(battle);
    fieldsFor(battle)?.sweep(battle);
    transferFor(battle)?.sweep(battle);
    briberyFor(battle)?.sweep(battle);
    sweepAuthorities(battle);
    const outcome = result(battle);
    if (outcome) {
      battle.status = 'finished';
      battle.result = outcome;
      battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
      finishAuthorities(battle);
      log(battle, `战斗结束：${({ victory: '胜利', defeat: '失败', draw: '平局' })[outcome]}。`);
      return;
    }
    if (battle.index >= battle.queue.length) {
      battle.phase = 'tactic';
      log(battle, `第 ${battle.round} 回合行动结束，进入战术阶段。`);
    }
  }
  function nextRound(battle) {
    battle.round++;
    hardFor(battle)?.sweep(battle);
    mindFor(battle)?.sweep(battle);
    fieldsFor(battle)?.sweep(battle);
    eventsFor(battle)?.tick(battle);
    for (const unit of battle.skillControlMeta ? [] : battle.units) {
      if (!unit.skillControl) continue;
      const expired = [];
      for (const kind of ['banned', 'granted']) {
        unit.skillControl[kind] = (unit.skillControl[kind] || []).filter(row => {
          if (battle.round <= row.until) return true;
          expired.push(row.name); return false;
        });
      }
      if (expired.length) log(battle, `${unit.name} 的技能干涉到期：${[...new Set(expired)].join('、')}。`);
    }
    for (const unit of battle.units) {
      for (const effect of unit.effects || []) {
        if (!alive(unit)) break;
        if (effect.skillEffect || effect.fieldEffect || effect.exilePoison) continue;
        if (!['poison', 'regen'].includes(effect.type)) continue;
        const key = CURRENT[effect.stat], max = unit[LIMITS[effect.stat]];
        if (!key || !Number.isFinite(max)) continue;
        const amount = Math.max(0, effect.valueType === 'fixed'
          ? effect.power : Math.floor(max * effect.power / 100));
        const loss = effect.type === 'poison' ? transferFor(battle)?.loss(battle, unit,
          effect.stat, amount, { derived: effect.effectTransferResolved === true,
            sourceKind: '持续伤害', sourceLabel: effect.name }) : null;
        const delta = effect.type === 'poison' ? -(loss?.actualDamage ?? Math.min(unit[key], amount))
          : Math.min(max - unit[key], amount);
        if (!loss) {
          unit[key] += delta;
          permanentFor(battle)?.markDamaged(battle, unit, -delta);
        }
        log(battle, `${unit.name} 的「${effect.name}」${delta < 0 ? '损失' : '恢复'} ${Math.abs(delta)} 点${effect.stat.slice(2)}。`);
      }
      unit.effects = (unit.effects || []).map(effect => effect.battlePersistent || effect.skillEffect || effect.fieldEffect || effect.exilePoison || effect.mindDeprive || effect.enemyControl ||
        effect.mythicForm || effect.canonMythicForm || effect.ruleChange || effect.environment
        ? effect : { ...effect, duration: effect.duration - 1 });
      for (const effect of unit.effects) if (!effect.battlePersistent && effect.duration <= 0)
        modules['cryptLord.battleReport']?.effect(battle, unit, unit, effect, 'expired');
      unit.effects = unit.effects.filter(effect => effect.battlePersistent || effect.duration > 0);
      recalculateAttributes(unit);
    }
    if (!terrainFor()) battle.terrain = (battle.terrain || []).map(tile =>
      tile.duration == null ? tile : { ...tile, duration: tile.duration - 1 })
      .filter(tile => tile.duration == null || tile.duration > 0);
    syncEnvironment(battle);
    aurasFor(battle)?.sweepDead(battle);
    briberyFor(battle)?.sweep(battle);
    sweepAuthorities(battle);
    const outcome = result(battle);
    if (outcome) {
      battle.status = 'finished'; battle.result = outcome; battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
      finishAuthorities(battle);
      log(battle, `战斗结束：${({ victory: '胜利', defeat: '失败', draw: '平局' })[outcome]}。`);
      return;
    }
    aurasFor(battle)?.tick(battle);
    const initiative = queue(battle);
    battle.queue = extraFor(battle)?.expand(battle, initiative) || initiative;
    battle.index = 0;
    battle.phase = 'action';
    battle.units.forEach(unit => { unit.moves = 0; });
    rewindFor(battle)?.snapshot(battle);
    enterTurn(battle);
    if (battle.index >= battle.queue.length) finishRound(battle);
    const effectOutcome = result(battle);
    if (effectOutcome) {
      battle.status = 'finished'; battle.result = effectOutcome; battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
      finishAuthorities(battle);
    } else if (battle.index >= battle.queue.length) battle.phase = 'tactic';
    log(battle, `第 ${battle.round} 回合开始。`);
    modules['cryptLord.battleReport']?.roundStart(battle);
  }
  function start(data, options = {}) {
    if (!object(data)) return { ok: false, error: '当前楼层变量不可用。' };
    if (data.cryptLord?.teamBattle?.status === 'active')
      return { ok: false, error: '请先完成当前多人战斗。' };
    if (data.cryptLord?.teamBattle?.status === 'finished' &&
      !data.cryptLord.teamBattle.settled)
      return { ok: false, error: '请先确认或放弃上一场战报。' };
    if (data.cryptLord?.personalBattle?.status === 'active')
      return { ok: false, error: '请先完成当前个人战斗。' };
    const legacy = data.cryptLord?.personalBattle;
    if (legacy?.status === 'finished' && legacy.result === 'victory' &&
      legacy.enemy?.npcKey && !legacy.experienceClaimed)
      return { ok: false, error: '请先领取或放弃旧个人战斗经验。' };
    const allies = Array.isArray(options.allies) ? options.allies : [];
    const enemies = Array.isArray(options.enemies) ? options.enemies : [];
    const practice = options.mode === 'practice';
    if (options.mode != null && !['team', 'duel', 'practice'].includes(options.mode))
      return { ok: false, error: '战斗模式无效。' };
    if (options.mode === 'duel' && (allies.length || enemies.length !== 1) ||
      practice && (allies.length || enemies.length !== 1 || enemies[0] !== '$practice' ||
        !object(options.practiceCard)))
      return { ok: false, error: '个人对局只能选择一名对手。' };
    const unique = [...allies, ...enemies];
    if (!enemies.length || allies.length > 59 || enemies.length > 60 ||
      unique.length !== new Set(unique).size ||
      unique.some(key => !name(key) || key === '$meta' || key === 'player'))
      return { ok: false, error: '双方编队不能为空、重复或超过单方棋盘容量。' };
    const next = clone(data);
    const npc = object(next.npc_data) ? next.npc_data : {};
    const playUnits = modules['cryptLord.battlePlayUnits'];
    const candidates = playUnits?.roster(next, options.summonPool || options.pathways) || [];
    const bagKeys = unique.filter(key => candidates.some(row => row.key === key));
    if (bagKeys.some(key => Object.hasOwn(npc, key)))
      return { ok: false, error: 'NPC 编号与专属单位编号冲突，请更换 NPC 名称。' };
    if (practice && Object.hasOwn(npc, '$practice'))
      return { ok: false, error: 'NPC 编号与训练目标冲突，请更换 NPC 编号。' };
    if (unique.some(key => !(practice && key === '$practice') && !bagKeys.includes(key) &&
      (!object(npc[key]) || num(npc[key].当前活力) <= 0)))
      return { ok: false, error: '参战 NPC 已变化或没有可用活力。' };
    const player = next.stat_data;
    if (!object(player) || num(player.当前活力) <= 0)
      return { ok: false, error: '玩家没有可用活力。' };
    const formulas = modules['cryptLord.battleFormulas'];
    const units = [unit(player, 'player', 'ally', 'player', 0, ROWS - 1, Boolean(formulas))];
    let records;
    try { records = playUnits?.prepare(next, bagKeys, options.summonPool || options.pathways) || []; }
    catch (error) { return { ok: false, error: error.message }; }
    const make = (key, side, x, y) => {
      const play = records.find(row => row.key === key);
      const training = practice && key === '$practice';
      const card = training ? options.practiceCard : play?.card || npc[key];
      const actor = unit(card, key, side, training ? 'practice' : 'npc', x, y, Boolean(formulas));
      if (training) {
        actor.name = name(card.名称) || '训练假人';
        actor.playCard = clone(card);
        actor.playSource = 'practice';
      }
      if (play) {
        actor.name = play.name;
        actor.playSource = play.playSource;
        actor.playCard = clone(play.card);
        actor.playRecord = { source: play.source, name: play.name, original: clone(play.original) };
      }
      if (side === 'ally' && (play || card.$秘偶 === true)) actor.controller = 'player';
      return actor;
    };
    allies.forEach((key, i) => units.push(make(key, 'ally',
      (i + 1) % COLS, ROWS - 1 - Math.floor((i + 1) / COLS))));
    enemies.forEach((key, i) => units.push(make(key, 'enemy',
      i % COLS, Math.floor(i / COLS))));
    const battle = {
      version: 1, id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mode: options.mode || 'team',
      status: 'active', phase: 'action', result: null, round: 1,
      units, queue: [], index: 0, log: [], terrain: [],
      props: parseProps(options.props), settled: false,
      board: { cols: COLS, rows: ROWS }, startedAt: Date.now(),
      ...(lifeSave ? { lifeSavePathways: clone(options.pathways || options.summonPool?.pathways || {}) } : {}),
    };
    effectsFor()?.initialize(battle);
    if (records.length) battle.playUnitMeta = { version: 1,
      pathways: clone(options.summonPool?.pathways || options.pathways || {}) };
    modules['cryptLord.battleReport']?.initialize(battle, next);
    if (formulas) {
      try {
        battle.formulas = formulas.initialize(options.seed ??
          Math.floor(Math.random() * 4294967296), options.formulaValues);
        if (object(options.pathways) && Object.keys(options.pathways).length)
          battle.formulas.pathways = clone(options.pathways);
      } catch (error) { return { ok: false, error: error.message }; }
    }
    try { resourceFor()?.initialize(battle, options.statusEffects); }
    catch (error) { return { ok: false, error: error.message }; }
    modules['cryptLord.audienceImaginationState']?.initializeTeam(next, battle,
      options.summonPool, formulas ? rollFor(battle) : undefined, options.imaginationCache);
    prepareLifeSave(battle, next, options.lifeSaveTable);
    prepareTagsAndPassives(battle, next, options.tagRules);
    log(battle, `战斗开始：我方 ${allies.length + 1} 人，敌方 ${enemies.length} 人。`);
    paintOpening(battle, options.opening);
    modules['cryptLord.battleAuras']?.initialize(battle,
      formulasFor(battle) ? rollFor(battle) : undefined);
    modules['cryptLord.battleFieldEffects']?.initialize(battle, options.pathways,
      options.averages || options.summonPool?.pictureConfig?.consumableConfig?.avgAttrByRank);
    modules['cryptLord.battleEffectTransfer']?.initialize(battle, options.pathways);
    modules['cryptLord.battleBribery']?.initialize(battle, options.pathways);
    if (conditionsFor()) battle.conditionMeta = { version: 1 };
    if (formulas) modules['cryptLord.battleBalance']?.initialize(battle, options.pathways);
    modules['cryptLord.battlePunishment']?.initialize(battle, options.pathways);
    modules['cryptLord.battleMythicForm']?.initialize(battle, options.pathways);
    modules['cryptLord.battleExile']?.initialize(battle, options.pathways);
    modules['cryptLord.battleActiveLeave']?.initialize(battle, options.pathways);
    modules['cryptLord.battleEvents']?.initialize(battle, options.pathways);
    modules['cryptLord.battleRewind']?.initialize(battle, options.pathways);
    modules['cryptLord.battleExtraAction']?.initialize(battle, options.pathways);
    modules['cryptLord.battleHardControl']?.initialize(battle, options.pathways);
    modules['cryptLord.battleMindDeprive']?.initialize(battle, options.pathways);
    modules['cryptLord.battleTempControl']?.initialize(battle, options.pathways);
    modules['cryptLord.battlePermanentControl']?.initialize(battle, options.pathways);
    modules['cryptLord.battlePossession']?.initialize(battle, options.pathways);
    modules['cryptLord.battleRuleChange']?.initialize(battle, options.pathways);
    modules['cryptLord.battleEnvironment']?.initialize(battle, options.pathways);
    modules['cryptLord.battleFundamental']?.initialize(battle, options.pathways);
    modules['cryptLord.battleSummon']?.initialize(battle, next, options.summonPool);
    if (modules['cryptLord.shamanTerritoryBattle'])
      modules['cryptLord.shamanTerritoryBattle'].applyTeam(next, battle,
        options.summonPool || { pathways: options.pathways || {} }, options.opening);
    modules['cryptLord.arbiterJurisdictionBattle']?.applyTeam(next, battle,
      options.summonPool || { pathways: options.pathways || {} }, options.opening);
    modules['cryptLord.battleAbilityBorrow']?.initialize(battle);
    modules['cryptLord.battleTacticCpu']?.initialize(battle);
    modules['cryptLord.battleActionCpu']?.initialize(battle, next);
    skillControlFor()?.initialize(battle, options.pathways);
    autoPilotFor()?.initialize(battle);
    if (terrainFor()) {
      terrainFor().initialize(battle);
      for (const actor of battle.units) terrainEntry(battle, actor);
    }
    if (formulas) for (const actor of battle.units) {
      actor.movement = formulas.movement(battle, actor);
      actor.moveRemaining = actor.movement;
    }
    const initiative = queue(battle);
    battle.queue = extraFor(battle)?.expand(battle, initiative) || initiative;
    modules['cryptLord.battleReport']?.roundStart(battle);
    rewindFor(battle)?.snapshot(battle);
    enterTurn(battle);
    const openingOutcome = result(battle);
    if (openingOutcome) {
      battle.status = 'finished'; battle.result = openingOutcome; battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
      finishAuthorities(battle);
    } else if (battle.index >= battle.queue.length) battle.phase = 'tactic';
    next.cryptLord = object(next.cryptLord) ? next.cryptLord : {};
    next.cryptLord.teamBattle = battle;
    const classifier = modules['cryptLord.weaponClassifier'];
    const classified = classifier ? classifier.apply(next, classifier.collect(next),
      classifier.parse(options.opening?.武器分类)) : { data: next };
    const assigner = modules['cryptLord.npcWeaponAssigner'];
    const assigned = assigner ? assigner.applyTeam(classified.data,
      assigner.collectTeam(classified.data), assigner.parse(options.opening?.NPC武器))
      : { data: classified.data };
    return { ok: true, data: assigned.data, battle: get(assigned.data) };
  }
  function startDuel(data, options = {}) {
    const npcKey = name(options.npcKey);
    if (npcKey) return start(data, { ...options, mode: 'duel', allies: [], enemies: [npcKey] });
    const hp = Number(options.enemyHp ?? 30), agility = Number(options.enemyAgility ?? 8);
    if (!Number.isFinite(hp) || hp < 1 || hp > 1e9 ||
      !Number.isFinite(agility) || agility < 0 || agility > 1e9)
      return { ok: false, error: '训练活力或敏捷数值无效。' };
    const card = { 名称: name(options.enemyName) || '训练假人', 当前序列: '普通人',
      活力: Math.floor(hp), 敏捷: agility, 灵性: 0, 理智: 100, 人性: 100, 运气: 0,
      能力清单: [] };
    for (const stat of ['活力', '敏捷', '灵性', '理智', '人性']) card[`当前${stat}`] = card[stat];
    return start(data, { ...options, mode: 'practice', allies: [], enemies: ['$practice'],
      practiceCard: card });
  }
  function get(data) {
    const battle = data?.cryptLord?.teamBattle;
    if (!object(battle) || battle.version !== 1) return null;
    const restored = clone(battle);
    prepareLifeSave(restored, data);
    prepareTagsAndPassives(restored, data);
    return restored;
  }
  function options(data, raw = false, includeBanned = false) {
    const battle = get(data);
    const actor = battle?.status === 'active' && battle.phase === 'action' ? current(battle) : null;
    if (!actor) return [];
    if (!onField(actor)) return [];
    const enemy = battle.units.filter(unit => unit.side !== actor.side && onField(unit));
    const friends = battle.units.filter(unit => unit.side === actor.side && onField(unit));
    const card = cardFor(data, actor);
    const banned = new Set((actor.skillControl?.banned || []).map(row => row.name));
    const original = formulasFor(battle);
    const skillRange = skill => {
      const raw = skill.range ?? skill.射程;
      if (raw === 'global' || raw === '全图' || raw === '无限')
        return { min: 0, max: Infinity };
      if (object(raw)) {
        const min = Math.max(0, Math.floor(num(raw.min ?? raw.最小, 1)));
        return { min, max: Math.max(min, Math.floor(num(raw.max ?? raw.最大, 3))) };
      }
      if (raw === 0) return { min: 0, max: 0 };
      return { min: 1, max: Math.max(1, Math.floor(num(raw, 3))) };
    };
    const skillOption = (skill, id) => {
      if (!object(skill) || skill.isPassive || !name(skill.名称 || skill.name) ||
        /被动/.test(name(skill.类型))) return null;
      const costConfig = skill.cost || skill.消耗;
      const costType = costConfig?.type ?? costConfig?.类型;
      const costKey = ({ currentVitality: 'hp', 活力: 'hp', currentAgility: 'agility', 敏捷: 'agility',
        currentSpirit: 'spirit', 灵性: 'spirit', currentSanity: 'sanity', 理智: 'sanity',
        currentHumanity: 'humanity', 人性: 'humanity' })[costType] ||
        (skill.灵性消耗 == null && object(costConfig) && costType == null && costConfig.spirit == null &&
          costConfig.灵性 == null ? 'hp' : 'spirit');
      if (costType && !['currentVitality', '活力', 'currentAgility', '敏捷', 'currentSpirit',
        '灵性', 'currentSanity', '理智', 'currentHumanity', '人性'].includes(costType)) return null;
      const cost = Math.max(0, num(skill.灵性消耗 ?? costConfig?.amount ?? costConfig?.数量 ??
        costConfig?.spirit ?? costConfig?.灵性));
      const resolve = (raw, fallback = 0) => original ? original.strength(raw, actor, fallback) : num(raw);
      const heal = Math.max(0, resolve(skill.healAmt ?? skill.治疗量));
      const rawPower = skill.power ?? skill.威力 ?? skill.伤害;
      const power = Math.max(0, resolve(rawPower, object(rawPower) ? 1 : 0));
      if (!power && !object(rawPower) && !heal && !skill.effects?.length &&
        !skill.applyTags?.length && !skill.removeTags?.length && !hasConditions(skill)) return null;
      const type = name(skill.targetType);
      const ally = ['ally', 'allAlly', 'allAllies', 'self'].includes(type) || (!type && heal > 0);
      const pool = ally ? friends : enemy;
      const range = skillRange(skill);
      const selfCentered = type === 'self' || range.max === 0;
      const targets = selfCentered ? [actor.id]
        : pool.filter(target => distance(actor, target) >= range.min &&
          distance(actor, target) <= range.max).map(target => target.id);
      return { id, name: name(skill.名称 || skill.name), cost, costKey, power, heal,
        healStat: name(skill.healType) || '活力',
        healValueType: original ? skill.healValueType ?? skill.治疗数值类型 ?? 'percentage' : 'fixed',
        damageType: skill.damageType ?? skill.伤害类型 ?? 'physical',
        skill: clone(skill),
        range: range.max, minRange: range.min, targetType: type || (ally ? 'ally' : 'single'),
        radius: Math.max(0, Math.floor(num(skill.aoeRadius, 2))), targets };
    };
    const groups = object(card?.序列能力列表) ? card.序列能力列表 : {};
    const skills = Object.entries(groups).flatMap(([group, entries]) => Array.isArray(entries)
      ? entries.flatMap((skill, index) => {
        const option = skillOption(skill, `skill:${group}:${index}`);
        return option ? [option] : [];
      }) : []);
    if (Array.isArray(card?.能力清单)) {
      card.能力清单.forEach((skill, index) => {
        const option = skillOption(skill, `npc-skill:${index}`);
        if (option) skills.push(option);
      });
    }
    const weaponEngine = modules['cryptLord.personalBattleState'];
    const averages = battle.fieldEffectMeta?.averages;
    const itemDamageType = raw => ({
      物理攻击: 'physical', 法术攻击: 'mystical', 精神攻击: 'mental', 命运攻击: 'mixed',
    })[raw?.战斗效果?.基础效果] || 'physical';
    const auxiliaryOption = (move, id) => ({
      id, name: move.name, cost: move.cost, power: move.damage,
      heal: move.healing, healStat: move.healStat, auxiliary: move,
      healValueType: 'fixed', damageType: itemDamageType(card?.辅助能力列表?.[move.key]),
      range: 3, radius: 2, targetType: move.area
        ? move.healing ? 'allAllies' : 'allEnemies'
        : move.healing ? 'ally' : 'single',
      targets: (move.healing ? friends : enemy).filter(target =>
        distance(actor, target) >= 1 && distance(actor, target) <= 3)
        .map(target => target.id),
    });
    const auxiliary = actor.source === 'player' || actor.cardSource === 'player'
      ? (weaponEngine?.auxiliaryMoves({ stat_data: card }, averages) || []).map(move =>
        auxiliaryOption(move, `auxiliary:${move.key}`)) : [];
    const granted = (actor.skillControl?.granted || []).flatMap((row, index) => {
      if (row.choice) {
        const option = clone(row.choice);
        option.id = `granted:${index}`;
        option.grantedIndex = index;
        if (option.range === 'global') option.range = Infinity;
        if (option.radius === 'global') option.radius = Infinity;
        if (option.quantity != null && option.quantity < 1) return [];
        const ally = ['ally', 'allAlly', 'allAllies', 'self'].includes(option.targetType);
        option.targets = option.targetType === 'self' || option.range === 0 ? [actor.id]
          : (ally ? friends : enemy).filter(target =>
            distance(actor, target) >= (option.minRange ?? 0) &&
            distance(actor, target) <= option.range).map(target => target.id);
        return [option];
      }
      const aux = row.ability?.战斗效果 && weaponEngine?.auxiliaryMoves({
        stat_data: { 辅助能力列表: { borrowed: row.ability } },
      }, averages)[0];
      const option = aux ? auxiliaryOption(aux, `granted:${index}`)
        : skillOption(row.ability, `granted:${index}`);
      if (option && aux) option.damageType = itemDamageType(row.ability);
      return option ? [option] : [];
    });
    const weaponData = actor.source === 'player' ? data : {
      stat_data: { ...card, 武器列表: actor.fallbackWeapon ? {
        临时: { 名称: actor.fallbackWeapon.显示名, 序列: '普通',
          isEquipped: true, $战斗分类: actor.fallbackWeapon },
      } : card?.武器列表 },
    };
    const weapons = (weaponEngine?.weaponMoves(weaponData, averages) || []).map(move => ({
      id: `weapon:${move.key}`, name: move.name, cost: move.cost,
      power: move.damage, heal: move.healing, healStat: move.healStat,
      healValueType: 'fixed', damageType: itemDamageType(weaponData.stat_data?.武器列表?.[move.key]),
      range: move.range, targetType: move.area
        ? move.healing ? 'allAllies' : 'allEnemies' : move.healing ? 'ally' : 'single',
      radius: move.radius ?? 2, weapon: move,
      targets: (move.healing ? friends : enemy)
        .filter(target => distance(actor, target) <= move.range).map(target => target.id),
    }));
    const consumables = actor.source === 'player' || actor.cardSource === 'player'
      ? (weaponEngine?.consumableMoves({ stat_data: card }, averages) || []).map(move => ({
        id: `${move.isScroll ? 'scroll' : 'consumable'}:${move.key}`,
        name: move.name, cost: move.cost, power: move.healing ? 0 : move.power,
        heal: move.healAmt, healStat: move.statName, quantity: move.quantity,
        healValueType: 'fixed', damageType: itemDamageType(card?.消耗品列表?.[move.key]),
        range: move.range, targetType: move.area
          ? move.healing ? 'allAllies' : 'allEnemies'
          : move.healing ? 'ally' : 'single',
        radius: move.area ? move.radius ?? Infinity : 0, consumable: move,
        targets: (move.healing ? friends : enemy)
          .filter(target => move.healing && !move.originalScroll || distance(actor, target) <= move.range)
          .map(target => target.id),
      })) : [];
    return [
      { id: 'basic', name: '普通攻击', cost: 0,
        power: original ? 1 : actor.power, damageType: 'physical',
        heal: 0,
        range: 1, targets: enemy.filter(target => distance(actor, target) <= 1).map(target => target.id) },
      ...skills, ...granted, ...weapons, ...consumables, ...auxiliary,
    ].filter(option => includeBanned || !banned.has(option.name)).map(option => {
      if (raw) return option;
      const conditional = hasConditions(option.skill);
      return { ...option, conditional, targets: option.targets.filter(id => {
        const target = battle.units.find(unit => unit.id === id);
        if (!conditional) return !briberyFor(battle)?.blockReason(battle, actor, option, target);
        if (!conditionsFor()) return false;
        const probe = clone(battle);
        const caster = probe.units.find(unit => unit.id === actor.id);
        const center = probe.units.find(unit => unit.id === id);
        const session = conditionsFor().session(probe, caster, option, rollFor(probe));
        return !conditionsFor().blockReason(probe, caster, option, center, session);
      }) };
    });
  }
  function actionPreview(data, id, targetId) {
    const battle = get(data), actor = battle?.phase === 'action' ? current(battle) : null;
    const choice = actor && options(data, true).find(row => row.id === id);
    const target = battle?.units.find(row => row.id === targetId);
    if (!choice || !target || !hasConditions(choice.skill) || !conditionsFor()) return null;
    // Run the same transaction on a copy so hit/damage draws stay interleaved with conditions.
    const simulated = action(data, { id, target: targetId });
    const details = simulated.ok ? simulated.battle.lastConditionalAction : null;
    return { name: choice.name, cost: choice.cost, costKey: choice.costKey || 'spirit',
      radius: details?.radius ?? choice.radius, reason: simulated.error || '',
      center: details?.center || targetId, effects: details?.effects || [],
      targets: details?.details || [] };
  }
  function calculationSkill(choice) {
    const rawPower = choice.skill?.power ?? choice.skill?.威力 ?? choice.skill?.伤害;
    return { ...(choice.skill || {}), power: object(rawPower) ? rawPower : choice.power,
      damageType: choice.damageType || 'physical',
      healAmt: choice.heal, healType: choice.healStat || '活力',
      healValueType: choice.healValueType || 'fixed',
      isHeal: choice.isHeal ?? choice.heal > 0,
      isAccuracyWeapon: choice.weapon ? choice.weapon.mode === 'accuracy' : choice.skill?.isAccuracyWeapon,
      accuracyTier: choice.weapon?.accuracyTier ?? choice.skill?.accuracyTier,
      fixedDamage: choice.weapon?.damage ?? choice.skill?.fixedDamage,
      range: choice.range };
  }
  function reachable(data) {
    const battle = get(data);
    if (battle && current(battle)?.picturePersonImmobile) return [];
    const actor = battle?.phase === 'action' ? current(battle) : null;
    if (!actor || !onField(actor) || actor.mindDepriveMovePct >= 100 || (formulasFor(battle)
      ? actor.moveRemaining <= 0 : actor.moves >= 1)) return [];
    const allowance = formulasFor(battle) ? actor.moveRemaining
      : effectiveValue(actor, 'movement', 3 + Math.max(0, actor.envMoveBonus || 0));
    if (battle.formulas && modules['cryptLord.battleActionCpu']) {
      modules['cryptLord.battleActionCpu'].initialize(battle, data);
      return modules['cryptLord.battleActionCpu'].reachable(battle, data, actor);
    }
    const frontier = [{ x: actor.x, y: actor.y, cost: 0 }];
    const costs = new Map([[`${actor.x},${actor.y}`, 0]]);
    const directions = [-1, 0, 1].flatMap(dx => [-1, 0, 1]
      .filter(dy => dx || dy).map(dy => [dx, dy]));
    while (frontier.length) {
      frontier.sort((a, b) => a.cost - b.cost);
      const point = frontier.shift();
      if (point.cost !== costs.get(`${point.x},${point.y}`)) continue;
      for (const [dx, dy] of directions) {
        const x = point.x + dx, y = point.y + dy;
        if (!inBounds(x, y)) continue;
        if (formulasFor(battle) && occupied(battle, x, y)) continue;
        const tile = battle.terrain?.find(row => row.x === x && row.y === y);
        if (tile?.blocked) continue;
        const cost = point.cost + 1 + Math.max(0, num(tile?.tier ?? battle.board?.base?.tier));
        const key = `${x},${y}`;
        if (cost > allowance ||
          cost >= (costs.get(key) ?? Infinity)) continue;
        costs.set(key, cost);
        frontier.push({ x, y, cost });
      }
    }
    costs.delete(`${actor.x},${actor.y}`);
    return [...costs.keys()].map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y, ...(formulasFor(battle) ? { cost: costs.get(key) } : {}) };
    }).filter(cell => !occupied(battle, cell.x, cell.y));
  }
  function action(data, move = {}, random, { autoPilot = false } = {}) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!object(battle) || battle.status !== 'active' || battle.phase !== 'action')
      return { ok: false, error: '当前不在行动阶段。' };
    prepareSkillControl(battle);
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    if (!autoPilot && autoPilotFor()?.drives(battle, current(battle)))
      return { ok: false, error: '当前由托管执行，请先关闭托管再操作。' };
    if (modules['cryptLord.battleActionCpu'])
      modules['cryptLord.battleActionCpu'].initialize(battle, next);
    random ||= rollFor(battle);
    const actor = current(battle);
    if (!actor || !onField(actor)) return { ok: false, error: '行动单位已变化或不在场上。' };
    prepareLifeSave(battle, next);
    prepareTagsAndPassives(battle, next);
    if (move.type === 'move') {
      const x = Number(move.x);
      const y = Number(move.y);
      const landing = reachable(next).find(cell => cell.x === x && cell.y === y);
      if (!landing)
        return { ok: false, error: '目标格不可达或已被占用。' };
      actor.x = x; actor.y = y; actor.moves++;
      if (formulasFor(battle)) actor.moveRemaining = Math.max(0, actor.moveRemaining - landing.cost);
      log(battle, `${actor.name} 移动到 (${x}, ${y})。`, { reportQuiet: true });
      terrainEntry(battle, actor);
      aurasFor(battle)?.sweepDead(battle);
      transferFor(battle)?.sweep(battle);
      briberyFor(battle)?.sweep(battle);
      sweepAuthorities(battle);
      const outcome = result(battle);
      if (outcome) {
        battle.status = 'finished'; battle.result = outcome; battle.endedAt = Date.now();
        fieldsFor(battle)?.finish(battle);
        transferFor(battle)?.finish(battle);
        briberyFor(battle)?.finish(battle);
        finishAuthorities(battle);
      }
      if (!outcome && !onField(actor)) advance(battle);
    } else if (move.type === 'wait') {
      log(battle, `${actor.name} 待命。`);
      advance(battle);
    } else {
      const choice = options(next, true).find(item => item.id === move.id);
      let target = battle.units.find(unit => unit.id === move.target);
      if (!choice || !target || !choice.targets.includes(target.id) ||
        !affordable(actor, choice))
        return { ok: false, error: '技能、目标、射程或资源已变化。' };
      if (hasConditions(choice.skill) && !conditionsFor())
        return { ok: false, error: '条件参数模块不可用，未扣费。' };
      const session = hasConditions(choice.skill)
        ? conditionsFor().session(battle, actor, choice, random) : null;
      const blocked = session
        ? conditionsFor().blockReason(battle, actor, choice, target, session)
        : briberyFor(battle)?.blockReason(battle, actor, choice, target);
      if (blocked) return { ok: false, error: blocked };
      if (choice.consumable && choice.grantedIndex != null) {
        const granted = actor.skillControl.granted[choice.grantedIndex];
        if (granted.choice.quantity !== choice.quantity || choice.quantity < 1)
          return { ok: false, error: '临时消耗品数量已变化。' };
        granted.choice.quantity--;
      } else if (choice.consumable) {
        const list = cardFor(next, actor)?.消耗品列表;
        const item = list?.[choice.consumable.key];
        if (!item || Number(item.数量) !== choice.quantity || choice.quantity < 1)
          return { ok: false, error: '消耗品数量已变化。' };
        if (choice.quantity === 1) {
          if (Array.isArray(list)) list.splice(Number(choice.consumable.key), 1);
          else delete list[choice.consumable.key];
        } else item.数量 = choice.quantity - 1;
      }
      const report = modules['cryptLord.battleReport'];
      const oldCost = actor[choice.costKey || 'spirit'];
      actor[choice.costKey || 'spirit'] -= choice.cost;
      report?.cost(battle, actor, choice, oldCost, actor[choice.costKey || 'spirit']);
      const fireDistance = distance(actor, target);
      session?.bind(actor);
      const fields = fieldsFor(battle);
      const interference = fields?.redirect(battle, actor, target, choice, next, random);
      if (interference?.targets.length) target = interference.targets[0];
      if (session && (choice.range === 0 || choice.targetType === 'self')) target = actor;
      const circle = interference && !interference.targets.length ? choice
        : session?.select(target) || choice;
      const isArea = ['all', 'allEnemies', 'allAlly', 'allAllies'].includes(choice.targetType);
      const ally = ['ally', 'allAlly', 'allAllies', 'self'].includes(choice.targetType);
      const victimSide = interference?.forceSide
        ? interference.forceSide === 'ally' ? actor.side : actor.side === 'ally' ? 'enemy' : 'ally'
        : ally ? actor.side : actor.side === 'ally' ? 'enemy' : 'ally';
      const victims = session ? conditionsFor().recipients(battle, actor, target, circle, interference)
        : interference && !interference.targets.length ? []
        : isArea ? battle.units.filter(unit => onField(unit) &&
        unit.side === victimSide && (!interference?.excludeSelf || unit !== actor) &&
        (choice.weapon ? Math.abs(unit.x - target.x) + Math.abs(unit.y - target.y)
          : distance(unit, target)) <= choice.radius) : [target];
      const pendingAttack = fields?.pending(battle, actor);
      const conditionalDetails = [];
      let usedAttack = false;
      for (const victim of victims) {
        const resolved = session?.select(victim) || choice;
        const weapon = resolved.weapon;
        const formulas = formulasFor(battle);
        const skill = calculationSkill(resolved);
        const balanced = balanceFor(battle)?.pair(battle, actor, victim);
        const parameterActor = balanced ? victim : actor;
        const isHealing = resolved.isHeal ?? resolved.heal > 0;
        const isDamage = !isHealing && (session ||
          (skill.isAccuracyWeapon ? skill.fixedDamage > 0 :
            formulas ? formulas.strength(skill.power, parameterActor) > 0 : resolved.power > 0));
        if (session) conditionalDetails.push({ id: victim.id, name: victim.name, side: victim.side,
          power: skill.isAccuracyWeapon ? skill.fixedDamage :
            formulas ? formulas.strength(skill.power, parameterActor) : resolved.power, isHeal: isHealing,
          heal: resolved.heal, healStat: resolved.healStat, damageType: resolved.damageType,
          healValueType: resolved.healValueType });
        if (session ? !isHealing : isDamage) usedAttack = true;
        const attackContext = pendingAttack && isDamage
          ? { ignoreDefenseBuff: true } : {};
        const chance = isHealing ? 1 : formulas ? formulas.accuracy(battle, actor, victim, skill, attackContext)
          : weapon?.mode === 'accuracy'
          ? modules['cryptLord.personalBattleState'].weaponHitChance(
            weapon, actor, victim, weapon.range) : 1;
        if (chance < 1 && random() >= chance) {
          report?.miss(battle, actor, victim, resolved, fireDistance);
          log(battle, `${actor.name} 使用「${choice.name}」${balanced ? '（平衡：借用目标参数）' : ''}未命中 ${victim.name}（${Math.round(chance * 100)}%）。`,
            { reportHandled: Boolean(report), ...(balanced ? { actor: actor.id, target: victim.id,
              balanceTriggered: true, parameterAttacker: victim.id } : {}) });
          continue;
        }
        if (isHealing) {
          const stat = resolved.healStat || '活力';
          const key = CURRENT[`当前${stat}`] || 'hp';
          const max = LIMITS[`当前${stat}`] || 'maxHp';
          const tags = battleTags?.analyze(actor, victim, resolved.skill, battle.tagRules.healing, 'healing');
          const tagModifier = tags?.modifier || 0;
          const calculation = formulas?.healing(battle, actor, victim, skill, random);
          const healed = calculation ? calculation.amount :
            Math.max(0, Math.min(victim[max] - victim[key],
              Math.round(resolved.heal * (1 + tagModifier))));
          const oldValue = victim[key];
          victim[key] += healed; actor.healing += healed;
          report?.hit(battle, actor, victim, resolved, calculation || tags || {}, oldValue,
            victim[key], victim[max], fireDistance, true);
          log(battle, `${actor.name} 使用「${choice.name}」为 ${victim.name} 恢复 ${healed} 点${stat}。`,
            { reportHandled: Boolean(report), ...(calculation ? { actor: actor.id, target: victim.id,
              healing: healed, calculation: { ...calculation, kind: 'healing' } } : {}) });
        } else if (isDamage) {
          const scale = weapon?.mode === 'accuracy' || resolved.power <= 0 ? 1 :
            Math.max(0, effectiveValue(actor, 'attack', resolved.power) -
              resolved.power * (briberyFor(battle)?.weakenPercent(battle, actor, victim, 'attack') || 0) / 100) / resolved.power *
            Math.max(.1, 1 - (modifier(attackContext.ignoreDefenseBuff
              ? { ...victim, effects: victim.effects.filter(effect =>
                !(effect.type === 'buff' && effect.stat === 'defense')) } : victim, 'defense') -
              (briberyFor(battle)?.weakenPercent(battle, actor, victim, 'defense') || 0)) / 100);
          const tags = battleTags?.analyze(actor, victim, resolved.skill, battle.tagRules.damage);
          const tagModifier = tags?.modifier || 0;
          const calculation = formulas?.damage(battle, actor, victim, skill, random, attackContext);
          const punishment = punishmentFor(battle)?.multiplier(battle, actor, victim) || 1;
          const incoming = calculation ? calculation.amount :
            Math.max(0, Math.round(resolved.power * scale *
              Math.max(0, 1 + tagModifier + damageAdjustment(actor, victim)) * punishment));
          const damageKey = calculation?.attribute || 'hp';
          const saved = (damageKey === 'hp' ? lifeSave?.absorb(victim, incoming) : null) ||
            { damage: incoming, triggered: false, incoming, absorbed: 0 };
          const oldValue = victim[damageKey];
          const routed = transferFor(battle)?.loss(battle, victim,
            damageKey === 'sanity' ? '当前理智' : '当前活力', saved.damage,
            { sourceLabel: `${actor.name}的「${choice.name}」`, sourceKind: '直接伤害' });
          const dealt = routed?.actualDamage ?? Math.min(victim[damageKey], Math.max(0, Math.round(saved.damage)));
          if (!routed) {
            victim[damageKey] -= dealt;
            permanentFor(battle)?.markDamaged(battle, victim, dealt);
          }
          actor.damage += dealt;
          report?.hit(battle, actor, victim, resolved, { ...tags, ...calculation, incoming,
            attribute: damageKey, lifeSaveMeta: saved,
            punishmentTriggered: calculation?.punishmentTriggered ?? punishment > 1 },
          oldValue, victim[damageKey], victim[damageKey === 'sanity' ? 'maxSanity' : 'maxHp'],
          fireDistance);
          if (damageKey === 'hp' && !alive(victim)) actor.kills++;
          if (saved.triggered) log(battle,
            `${victim.name} 的「${saved.skillName}」吸收 ${saved.absorbed} 点伤害（${saved.absorbPct}%），实扣 ${dealt}。`,
            { reportHandled: Boolean(report) });
          log(battle, `${actor.name} 使用「${choice.name}」${balanced ? '（平衡：借用目标参数）' : ''}${(calculation?.punishmentTriggered ?? punishment > 1) ? '（惩戒加成）' : ''}命中 ${victim.name}，造成 ${dealt} 点${damageKey === 'sanity' ? '理智伤害' : '伤害'}。`,
            { reportHandled: Boolean(report), actor: actor.id, target: victim.id, damage: dealt,
              incoming, lifeSaveMeta: { ...saved }, ...(routed ? { transfers: routed.transfers } : {}),
              ...(calculation ? { calculation: { ...calculation, chance, kind: 'damage' } } : {}) });
        }
        for (const effect of [...(weapon?.effects || []),
          ...(choice.consumable?.originalScroll ? [] : choice.consumable?.effects || [])]) {
          if (choice.consumable?.healing && effect.effectTarget === 'target') continue;
          if (effect.effectTarget === 'self' && victim !== victims[0]) continue;
          const recipient = effect.effectTarget === 'self' ? actor : victim;
          applyTacticEffect(recipient, { ...effect }, battle, actor, skill);
        }
      }
      if (pendingAttack && usedAttack) fields.consume(battle, actor);
      if (session) {
        battle.lastConditionalAction = { actor: actor.id, action: choice.id, round: battle.round,
          center: target.id, radius: circle.radius, targets: victims.map(unit => unit.id),
          rolls: session.rolls(), details: conditionalDetails,
          effects: victims.length ? (circle.skill.effects || []).map(row => row.name || row.名称) : [] };
      }
      if (choice.skill && victims.length) {
        const skill = circle.skill;
        const effects = Array.isArray(skill.effects) ? skill.effects : [];
        const tagTargets = effects.length
          ? effectTargets(battle, actor, target, circle, effects[0].effectTarget,
            interference?.excludeSelf) : victims;
        // Tag/effect scopes are selected once per action, never once per AOE hit.
        battleTags?.applySkill(actor, target, skill, true, { targets: tagTargets, battle });
        for (const effect of effects) for (const recipient of
          effectTargets(battle, actor, target, circle, effect.effectTarget,
            interference?.excludeSelf)) {
          if (storeSkillEffect(battle, actor, recipient, effect, skill)) {
            log(battle, `${actor.name} 对 ${recipient.name} 施加「${effect.name}」。`,
              { reportHandled: Boolean(report) });
          }
        }
      }
      if (choice.consumable?.originalScroll && victims.length) {
        for (const effect of choice.consumable.effects || []) {
          for (const recipient of effectTargets(battle, actor, target, circle,
            effect.effectTarget, interference?.excludeSelf)) {
            if (alive(recipient)) applyTacticEffect(recipient, { ...effect }, battle, actor, circle.skill || {});
          }
        }
      }
      if (choice.consumable?.healing && !choice.consumable.originalScroll && victims.length) {
        for (const effect of choice.consumable.effects || []) {
          if (effect.effectTarget !== 'target') continue;
          for (const enemy of battle.units.filter(unit => onField(unit) && unit.side !== actor.side))
            applyTacticEffect(enemy, { ...effect }, battle, actor, circle.skill || {});
        }
      }
      for (const effect of victims.length ? choice.auxiliary?.effects || [] : []) {
        const side = effect.effectTarget === 'allAlly' ? actor.side
          : actor.side === 'ally' ? 'enemy' : 'ally';
        const recipients = effect.effectTarget === 'self' ? [actor]
          : effect.effectTarget === 'target' ? [target]
            : battle.units.filter(unit => onField(unit) && unit.side === side &&
              (!interference?.excludeSelf || unit !== actor) &&
              distance(unit, target) <= choice.radius);
        for (const recipient of recipients)
          if (alive(recipient)) applyTacticEffect(recipient, { ...effect }, battle, actor, circle.skill || {});
      }
      advance(battle);
    }
    next.stat_data.当前活力 = battle.units[0].hp;
    next.stat_data.当前灵性 = battle.units[0].spirit;
    next.stat_data.当前理智 = battle.units[0].sanity;
    next.stat_data.当前人性 = battle.units[0].humanity;
    next.stat_data.当前敏捷 = battle.units[0].agility;
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function rawAbilities(card) {
    return [
      ...Object.values(object(card?.序列能力列表) ? card.序列能力列表 : {})
        .flatMap(entries => Array.isArray(entries) ? entries : []),
      ...(Array.isArray(card?.能力清单) ? card.能力清单 : []),
    ].filter(entry => object(entry) && name(entry.名称 || entry.name));
  }
  function abilityList(card) {
    return rawAbilities(card).map(entry => ({ name: name(entry.名称 || entry.name),
      description: name(entry.描述 || entry.description || entry.效果) }));
  }
  function skillControlEligibility(card) {
    const result = {};
    const pathway = name(card?.当前途径 || card?.途径 || card?.pathway || card?.所属途径);
    const sequence = name(card?.当前序列);
    if (!sequence || sequence.includes('普通人')) return result;
    const fragments = sequence.split(/[/|，,;；与和及以及\s+&、]/u).filter(Boolean);
    const pathways = window.GameDBManager?.DB?.godPathways;
    const sources = fragments.map(fragment => {
      const rank = Number(fragment.match(/序列[：:\s]*(\d+(?:\.\d+)?)/u)?.[1]);
      const pure = fragment.replace(/^序列\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
      const matched = Object.entries(object(pathways) ? pathways : {})
        .find(([, names]) => Array.isArray(names) && names.some(item =>
          name(item).replace(/^序列\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim() === pure));
      const explicit = Object.keys(SKILL_CONTROL).find(key => pure.includes(key));
      return { rank, pathway: matched?.[0]?.replace(/途径$/u, '') ||
        explicit || pathway.replace(/途径$/u, '') };
    });
    for (const { rank, pathway: key } of sources) {
      if (!Number.isFinite(rank)) continue;
      for (const [mode, [gate, skill]] of Object.entries(SKILL_CONTROL[key] || {}))
        if (rank <= gate && !result[mode]) result[mode] = skill;
    }
    return result;
  }
  function interferableSkills(data, unit) {
    if (data.cryptLord?.teamBattle?.skillControlMeta)
      return skillControlFor().skills(data, unit);
    const card = cardFor(data, unit);
    const abilities = [
      ...Object.values(object(card?.序列能力列表) ? card.序列能力列表 : {})
        .flatMap(entries => Array.isArray(entries) ? entries : []),
      ...(Array.isArray(card?.能力清单) ? card.能力清单 : []),
      ...(unit.source === 'player' ? (modules['cryptLord.personalBattleState']
        ?.auxiliaryMoves({ stat_data: card }, data.cryptLord?.teamBattle?.fieldEffectMeta?.averages) || [])
        .map(move => ({ ...card.辅助能力列表[move.key], 名称: move.name })) : []),
      ...(unit.skillControl?.granted || []).map(row => row.ability),
    ].filter(entry => object(entry) && name(entry.名称) &&
      entry.isPassive !== true && !/被动/.test(name(entry.类型)));
    const seen = new Set();
    return abilities.filter(entry => {
      const key = name(entry.名称);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).map(entry => ({ name: name(entry.名称), ability: clone(entry),
      banned: Boolean(unit.skillControl?.banned?.some(row => row.name === name(entry.名称))) }));
  }
  function skillControlOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    const player = battle.units.find(unit => unit.id === 'player');
    if (!onField(player)) return null;
    const modes = battle.skillControlMeta ? skillControlFor().eligibility(data, player)
      : skillControlEligibility(data.stat_data);
    const targets = battle.units.filter(unit => unit.id !== 'player' && onField(unit))
      .map(unit => ({ id: unit.id, name: unit.name,
        skills: interferableSkills(data, unit).map(skill => ({
          name: skill.name, banned: skill.banned,
          last: interferableSkills(data, unit).filter(row => !row.banned).length === 1 && !skill.banned,
        })) })).filter(row => row.skills.length);
    return { modes, targets, cost: controlCost(player, battle), spirit: player.spirit };
  }
  function controlCost(unit, battle) {
    if (battle?.skillControlMeta)
      return Math.max(1, Math.round((battle.fieldEffectMeta.averages[String(unit.rank)] ||
        battle.fieldEffectMeta.averages['10'] ||
        modules['cryptLord.battleFieldEffectReference'].averages()['10']).灵性 * .05));
    const average = num(window.GameDBManager?.DB?.consumableConfig
      ?.avgAttrByRank?.[String(unit.rank)]?.灵性, unit.maxSpirit);
    return Math.max(1, Math.round(average * .05));
  }
  function resolveSkillControl(data, battle, actor, target, mode, chosen, ability, random, borrowRank) {
    if (battle.skillControlMeta)
      return skillControlFor().attempt(data, battle, actor, target, mode, chosen.name,
        ability, random, borrowRank);
    const cost = borrowRank == null ? controlCost(actor) : Math.max(1, Math.round(
      (battle.fieldEffectMeta.averages[String(borrowRank)] ||
        battle.fieldEffectMeta.averages['10'] ||
        modules['cryptLord.battleFieldEffectReference'].averages()['10']).灵性 * .05));
    actor.spirit = Math.max(0, actor.spirit - cost);
    const live = interferableSkills(data, target).filter(row => !row.banned);
    const last = mode !== '复制' && live.length === 1 && live[0].name === chosen.name;
    const best = Math.max(target.hp, target.agility, target.spirit,
      target.sanity, target.humanity, target.luck || 0);
    const roll = () => .8 + Math.max(0, Math.min(1, num(random()))) * .4;
    const fields = fieldsFor(battle);
    const scores = { caster: Math.round(actor.spirit *
      (fields?.tacticMultiplier(battle, actor, target) ?? 1) * roll()),
      defender: Math.round(best * (last ? 3 : 1) *
        (fields?.tacticMultiplier(battle, target, actor) ?? 1) * roll()) };
    const outcome = scores.caster > scores.defender ? 'applied' : 'resisted';
    if (outcome === 'applied') {
      const until = battle.round + 2;
      if (mode !== '复制') {
        target.skillControl ||= { banned: [], granted: [] };
        const existing = target.skillControl.banned.find(row => row.name === chosen.name);
        if (existing) existing.until = Math.max(existing.until, until);
        else target.skillControl.banned.push({ name: chosen.name, until });
      }
      if (mode !== '禁止') {
        actor.skillControl ||= { banned: [], granted: [] };
        const existing = actor.skillControl.granted.find(row => row.name === chosen.name);
        if (existing) existing.until = Math.max(existing.until, until);
        else actor.skillControl.granted.push({
          name: chosen.name, ability: chosen.ability, from: target.id, until,
        });
      }
    }
    const result = { actor: actor.id, target: target.id, mode, skill: chosen.name,
      ability, cost, last, scores, outcome };
    log(battle, `${actor.name} 对 ${target.name} 的「${chosen.name}」${mode}${outcome === 'applied' ? '成功' : '失败'}（拼点 ${scores.caster}:${scores.defender}）。`);
    return result;
  }
  function npcSkillControl(data, battle, random, excluded = []) {
    const outcomes = [];
    for (const actor of battle.units.filter(unit => !playerControlled(unit) && onField(unit) &&
      !excluded.includes(unit.id))) {
      const card = cardFor(data, actor);
      const modes = skillControlEligibility(card);
      if (actor.spirit < controlCost(actor)) continue;
      for (const mode of ['禁止', '偷窃']) {
        if (!modes[mode]) continue;
        const candidates = battle.units.filter(unit => onField(unit) && unit.side !== actor.side)
          .flatMap(target => interferableSkills(data, target)
            .filter(chosen => !chosen.banned).map(chosen => ({ target, chosen })))
          .filter(({ target, chosen }) => {
            const live = interferableSkills(data, target).filter(row => !row.banned);
            const last = live.length === 1 && live[0].name === chosen.name;
            const best = Math.max(target.hp, target.agility, target.spirit,
              target.sanity, target.humanity, target.luck || 0) * (last ? 3 : 1);
            const fields = fieldsFor(battle);
            return (actor.spirit - controlCost(actor)) * 1.2 *
              (fields?.tacticMultiplier(battle, actor, target) ?? 1) >
              best * .8 * (fields?.tacticMultiplier(battle, target, actor) ?? 1);
          });
        if (!candidates.length || random() >= .3) continue;
        const pair = candidates[Math.floor(Math.max(0, Math.min(.999999, num(random()))) *
          candidates.length)];
        outcomes.push(resolveSkillControl(data, battle, actor, pair.target,
          mode, pair.chosen, modes[mode], random));
        break;
      }
    }
    return outcomes;
  }
  function npcTactics(data, battle, random, mythicCount = mythicFor(battle)?.activeCount(battle) || 0, exileRequest = null, leaveRequest = null, hardRequest = null, mindRequest = false, tempRequest = null, permanentRequest = null, possessionRequest = null, ruleRequest = null, environmentRequest = null) {
    if (modules['cryptLord.battleTacticCpu'])
      return modules['cryptLord.battleTacticCpu'].run(battle, data, {
        mythicCount, exile: exileRequest, leave: leaveRequest, hard: hardRequest,
        mind: mindRequest, temp: tempRequest, permanent: permanentRequest,
        possession: possessionRequest, rule: ruleRequest, environment: environmentRequest,
      }, random);
    const possessed = possessionFor(battle)?.maintain(battle, data, random, [], possessionRequest) || [];
    const maintenance = [...possessed, ...(activeLeaveFor(battle)?.prepare(battle, data, random, leaveRequest) || [])];
    const rewinds = rewindFor(battle)?.npc(battle, data, maintenance.map(row => row.actor)) || [];
    const maintained = permanentFor(battle)?.maintain(battle, data, random,
      [...maintenance, ...rewinds].map(row => row.actor), permanentRequest) || [];
    const maintaining = maintained.map(row => ({ actor: row.actor, outcome: 'permanent-pending' }));
    const borrowings = modules['cryptLord.battleAbilityBorrow']?.npc(battle, data,
      [...maintenance, ...rewinds, ...maintaining].map(row => row.actor), random) || [];
    const extras = extraFor(battle)?.npc(battle, data,
      [...maintenance, ...rewinds, ...maintaining, ...borrowings].map(row => row.actor)) || [];
    const punishments = punishmentFor(battle)?.npc(battle, data, random,
      [...maintenance, ...rewinds, ...maintaining, ...borrowings, ...extras].map(row => row.actor)) || [];
    const prioritySummons = summonFor(battle)?.npc(battle, data,
      [...maintenance, ...rewinds, ...maintaining, ...borrowings, ...extras, ...punishments].map(row => row.actor),
      random, true) || [];
    const first = [...maintenance, ...rewinds, ...maintaining, ...borrowings, ...extras, ...punishments, ...prioritySummons];
    const freshPermanent = permanentFor(battle)?.prepare(battle, data, random,
      first.map(row => row.actor), permanentRequest) || [];
    first.push(...freshPermanent.map(row => ({ actor: row.actor, outcome: 'permanent-pending' })));
    const possessionPrepared = possessionFor(battle)?.prepare(battle, data, random,
      first.map(row => row.actor), possessionRequest) || [];
    first.push(...possessionPrepared.map(row => ({ actor: row.actor, outcome: 'possession-pending' })));
    const skipped = battle.units.filter(unit => hardFor(battle)?.occupied(battle, unit))
      .map(unit => ({ actor: unit.id, outcome: 'skipped' }));
    const hard = hardFor(battle)?.resolve(battle, data, random,
      [...first, ...skipped].map(row => row.actor), hardRequest) || [];
    first.push(...skipped, ...hard);
    const tempPrepared = tempFor(battle)?.prepare(battle, data, random,
      first.map(row => row.actor), tempRequest) || [];
    first.push(...tempPrepared.map(row => ({ actor: row.actor, outcome: 'temp-pending' })));
    const mindPrepared = mindFor(battle)?.prepare(battle, data, random,
      first.map(row => row.actor), mindRequest) || [];
    first.push(...mindPrepared.map(row => ({ actor: row.actor, outcome: 'mind-pending' })));
    const rulePrepared = rulesFor(battle)?.prepare(battle, data, random,
      first.map(row => row.actor), ruleRequest) || [];
    first.push(...rulePrepared.map(row => ({ actor: row.actor, outcome: 'rule-pending' })));
    const environmentPrepared = environmentFor(battle)?.prepare(battle, data, random,
      first.map(row => row.actor), environmentRequest) || [];
    first.push(...environmentPrepared.map(row => ({ actor: row.actor, outcome: 'environment-pending' })));
    const excluded = first.map(row => row.actor);
    const summons = summonFor(battle)?.npc(battle, data, excluded, random) || [];
    first.push(...summons);
    excluded.push(...summons.map(row => row.actor));
    const controls = npcSkillControl(data, battle, random, [...excluded, ...summons.map(row => row.actor)]);
    const fieldOutcomes = fieldsFor(battle)?.npc(battle, data,
      [...excluded, ...controls.map(row => row.actor)], random) || [];
    const transfers = transferFor(battle)?.npc(battle, data,
      [...first, ...controls, ...fieldOutcomes].map(row => row.actor), random) || [];
    const bribes = briberyFor(battle)?.npc(battle, data,
      [...first, ...controls, ...fieldOutcomes, ...transfers].map(row => row.actor), random) || [];
    const balances = balanceFor(battle)?.npc(battle, data,
      [...first, ...controls, ...fieldOutcomes, ...transfers, ...bribes].map(row => row.actor), random) || [];
    const leaves = activeLeaveFor(battle)?.npc(battle, data,
      [...first, ...controls, ...fieldOutcomes, ...transfers, ...bribes, ...balances]
        .map(row => row.actor), random) || [];
    const forms = mythicFor(battle)?.npc(battle, data,
      [...first, ...controls, ...fieldOutcomes, ...transfers, ...bribes, ...balances, ...leaves]
        .map(row => row.actor), random, mythicCount) || [];
    const previous = [...first, ...controls, ...fieldOutcomes, ...transfers, ...bribes, ...balances, ...leaves, ...forms];
    const permanent = permanentFor(battle)?.apply(battle, data, random, [...maintained, ...freshPermanent]) || [];
    const possessions = possessionFor(battle)?.apply(battle, data, random, possessionPrepared) || [];
    const exileResult = exileFor(battle)?.resolve(battle, data, random, exileRequest, previous.map(row => row.actor));
    const exiles = exileRequest ? exileResult?.outcomes || [] : exileResult || [];
    const events = eventsFor(battle)?.npc(battle, data,
      [...previous, ...exiles].map(row => row.actor), random) || [];
    const temps = tempFor(battle)?.apply(battle, data, random, tempPrepared) || [];
    const minds = mindFor(battle)?.apply(battle, data, random, mindPrepared) || [];
    const rules = rulesFor(battle)?.apply(battle, data, random, rulePrepared) || [];
    const environments = environmentFor(battle)?.apply(battle, data, random, environmentPrepared) || [];
    const switches = battle.grazingSwitchFinal ? [clone(battle.grazingSwitchFinal)] : [];
    delete battle.grazingSwitchFinal;
    return [...previous.filter(row => !['mind-pending', 'temp-pending', 'permanent-pending', 'possession-pending', 'rule-pending', 'environment-pending'].includes(row.outcome)),
      ...permanent, ...possessions, ...exiles, ...events, ...temps, ...minds, ...rules, ...environments, ...switches];
  }
  function skillControl(data, request, random) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!object(battle) || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '当前不在战术阶段。' };
    prepareSkillControl(battle);
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    random ||= rollFor(battle);
    const player = battle.units.find(unit => unit.id === 'player');
    const target = battle.units.find(unit => unit.id === request?.target);
    const mode = name(request?.mode), skillName = name(request?.skill);
    const ability = (battle.skillControlMeta ? skillControlFor().eligibility(next, player)
      : skillControlEligibility(next.stat_data))[mode];
    const choices = target && interferableSkills(next, target);
    const chosen = choices?.find(row => row.name === skillName);
    if (!ability || !playerControlled(player) || !onField(player) || !target || target === player || !onField(target) ||
      !chosen) return { ok: false, error: '技能干涉资格、目标或技能已变化。' };
    const cost = controlCost(player, battle);
    if (player.spirit < cost) return { ok: false, error: '当前灵性不足。' };
    const result = resolveSkillControl(next, battle, player, target, mode, chosen, ability, random);
    const npcOutcomes = npcTactics(next, battle, random);
    battle.lastTactic = { round: battle.round,
      declaration: { action: '技能干涉', mode, target: target.id, skill: skillName },
      audit: null, abilityReview: [], actions: [], outcomes: [result, ...npcOutcomes] };
    nextRound(battle);
    next.stat_data.当前活力 = player.hp;
    next.stat_data.当前灵性 = player.spirit;
    next.stat_data.当前理智 = player.sanity;
    next.stat_data.当前人性 = player.humanity;
    next.stat_data.当前敏捷 = player.agility;
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function tacticPrompt(data, declaration = {}) {
    const battle = get(data);
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      throw new Error('当前不在战术阶段。');
    const summary = battle.units.filter(onField).map(unit => ({
      id: unit.id, name: unit.name, side: unit.side, sequence: unit.sequence,
      x: unit.x, y: unit.y, hp: unit.hp, sanity: unit.sanity,
      tacticOccupied: Boolean(hardFor(battle)?.occupied(battle, unit)),
      turnSkip: unit.turnSkip || null,
      abilities: abilityList(cardFor(data, unit)),
    }));
    const rules = [
      '你是诡秘之主战斗战术裁决员。只依据下列角色能力描述和战况，不臆造能力。',
      '先盘点每人的能力。审计玩家申报时，必须指出具体能力和描述是否覆盖作用、位置与目标；不成立写明理由。',
      '为每个活着的 NPC 安排一次改变地形、对角色使用战术或待命；理智低于上限一半则待命。',
      'tacticOccupied 为 true 的 NPC 已被硬控占位，不必安排战术，禁止替其移动、施加效果或使用物品。',
      `效果类别仅能用：${Object.keys(CATEGORIES).join('、')}。`,
      `相性档位仅能用：${TIERS.join('、')}。`,
      `持续/一次性伤害与恢复的目标属性仅能用：${EFFECT_STATS.join('、')}。`,
      '改变地形的笔刷每组只用 cells，格子最多 9 个并限于 3×3，坐标不可超出 12×10。',
      `危险地形 id 仅能用：${terrainPresets?.options().map(row => row.id).join('、') || '无'}；存在回合 1 至 3。`,
      '不输出任何效果强度，数值由系统计算。只输出 JSON，不要代码块。',
      '格式：{"能力盘点":[{"角色":"id","能力":["名称"],"能做":"...","不能做":"..."}],',
      '"玩家审计":{"可行":true,"依据能力":"名称","理由":"...","战术方案":{"目标":"id","类别":"持续伤害","档位":"克制目标","目标属性":"当前活力","效果名":"名称"}},',
      '"NPC行动":[{"角色":"id","行动":"待命","依据能力":"无","手段描述":"...","笔刷":null,"战术方案":null}]}',
      '玩家的格子、添加/移除、危险地形 id、通行地形名称及清除名称已经确定，不得更改。',
      '玩家改地形时，审计只补 存在回合（危险地形）或 通行地形.分级（0-2）。不要返回玩家笔刷。',
      'NPC 笔刷添加时填 地形/id/存在回合，或 名称/分级；移除时填 清除 名称数组。',
      '可互动物品只来自场上现存清单，不能臆造。玩家审计和每个 NPC 行动均填写 物品消耗 数组，格式 [{"名称":"...","数量":1}]；只用地形或未使用现场物件就填 []。这只是预估，只有战术实际生效才会扣除。',
      '若玩家待命，玩家审计写 null。',
    ].join('\n');
    return { rules, situation: JSON.stringify({
      round: battle.round, scene: battle.scene, board: battle.board,
      naturalEnv: battle.naturalEnv, units: summary, terrain: battle.terrain || [],
      可互动物品: (battle.props || []).filter(prop => prop.数量 > 0),
      declaration, playerInventory: Object.fromEntries(
        ['辅助能力列表', '武器列表', '消耗品列表', '其他列表']
          .filter(key => object(data.stat_data?.[key]))
          .map(key => [key, Object.entries(data.stat_data[key]).filter(([id]) => id !== '$meta')
            .map(([id, item]) => ({ id, name: item?.名称, description: item?.描述, quantity: item?.数量 }))])),
    }) };
  }
  function parsePlan(raw) {
    const text = typeof raw === 'string' ? raw : name(raw?.content);
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    try {
      const plan = JSON.parse(candidate);
      return object(plan) && Array.isArray(plan.NPC行动) ? plan : null;
    } catch { return null; }
  }
  function effectFromPlan(plan, side) {
    const meta = CATEGORIES[name(plan?.类别)];
    const tier = TIERS.indexOf(name(plan?.档位));
    if (!meta || tier < 0 || (side === 'enemy' ? tier > 2 : tier < 3)) return null;
    const stat = meta[1] || name(plan.目标属性);
    if (!meta[1] && !EFFECT_STATS.includes(stat)) return null;
    const oneShot = name(plan.类别).startsWith('一次性');
    return { name: name(plan.效果名).slice(0, 20) || name(plan.类别),
      type: meta[0], stat, power: oneShot ? [7, 6, 5][tier % 3]
        : meta[1] ? [20, 15, 10][tier % 3] : [4, 3, 2][tier % 3],
      duration: oneShot ? 1 : 3, valueType: 'percentage' };
  }
  function applyTacticEffect(target, effect, battle, actor, skill = {}) {
    if (battle && effectsFor())
      return effectsFor().apply(battle, actor || target, target, effect, skill);
    const transfer = transferFor(battle);
    if (transfer) return transfer.routeEffect(battle, target, effect, {
      transferableExternal: true, sourceLabel: `${actor?.name || '未知'}的战术`,
      sourceKind: '普通战术',
    }, (recipient, instance) => {
      const applied = applyTacticEffect(recipient, instance);
      if (applied) modules['cryptLord.battleReport']?.effect(battle, actor, recipient, instance);
      return applied;
    });
    target.effects ||= [];
    const same = target.effects.filter(row => row.stat === effect.stat &&
      row.type === effect.type && !row.ruleChange && !row.environment && !row.fieldEffect &&
      !row.skillEffect);
    if (same.some(row => row.power >= effect.power)) return false;
    target.effects = target.effects.filter(row => !same.includes(row));
    target.effects.push(effect);
    if (battle) modules['cryptLord.battleReport']?.effect(battle, actor, target, effect);
    return true;
  }
  function contestTactic(actor, target, tier, random, battle) {
    const casterAdvantage = tier === 0 ? 1.2 : 1;
    const targetAdvantage = tier === 2 ? 1.2 : 1;
    const roll = () => .8 + Math.max(0, Math.min(1, Number(random()) || 0)) * .4;
    const fields = fieldsFor(battle);
    const caster = Math.round(actor.sanity * casterAdvantage *
      (fields?.tacticMultiplier(battle, actor, target) ?? 1) * roll());
    const defender = Math.round(target.sanity * targetAdvantage *
      (fields?.tacticMultiplier(battle, target, actor) ?? 1) * roll());
    return { win: caster > defender, caster, defender };
  }
  function tactic(data, command = 'skip', random, { autoPilot = false } = {}) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!object(battle) || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '当前不在战术阶段。' };
    prepareSkillControl(battle);
    if (moduleError(battle, command === 'skip')) return { ok: false, error: moduleError(battle, command === 'skip') };
    if (autoPilotFor()?.isOn(battle) && !autoPilot)
      return { ok: false, error: '当前由托管执行，请先关闭托管再操作。' };
    random ||= rollFor(battle);
    prepareTagsAndPassives(battle, next);
    if (command !== 'skip') {
      if (battle.units.find(unit => unit.source === 'player')?.activeLeaving)
        return { ok: false, error: '主动离场期间只能维持或返场。' };
      const declaration = command?.declaration || { action: '待命' };
      const plan = command?.plan;
      if (!object(plan) || !Array.isArray(plan.NPC行动))
        return { ok: false, error: '战术计划缺少 NPC 行动。' };
      const npcs = battle.units.filter(unit => onField(unit) && unit.id !== 'player' &&
        !hardFor(battle)?.occupied(battle, unit));
      const entries = npcs.map(unit => plan.NPC行动.find(row =>
        name(row?.角色) === unit.id || name(row?.角色) === unit.name));
      if (entries.some(row => !object(row)) || new Set(entries).size !== npcs.length)
        return { ok: false, error: '战术计划未覆盖所有存活 NPC。' };
      const player = battle.units[0];
      const acts = [{ unit: player, row: {
        行动: name(declaration.action) || '待命',
        战术方案: plan.玩家审计?.战术方案 || declaration.plan,
        笔刷: declaration.brush,
      }, player: true }, ...npcs.map((unit, i) => ({ unit, row: entries[i], player: false }))];
      const normalized = [];
      for (const entry of acts) {
        const { unit, row } = entry;
        if (!onField(unit)) continue;
        let actionType = name(row.行动);
        const infeasible = entry.player && actionType !== '待命' &&
          plan.玩家审计?.可行 !== true;
        if (unit.sanity <= 0) actionType = '待命';
        if (!entry.player && unit.maxSanity > 0 && unit.sanity < unit.maxSanity * .5)
          actionType = '待命';
        if (!entry.player && actionType === '改变地形' &&
          (battle.terrain || []).filter(tile => tile.id).length / (COLS * ROWS) > .3 &&
          (Array.isArray(row.笔刷) ? row.笔刷 : [row.笔刷]).some(brush => !brush?.清除))
          actionType = '待命';
        if (!['待命', '对角色使用战术', '改变地形'].includes(actionType))
          return { ok: false, error: `${unit.name} 的战术类型无效。` };
        if (!entry.player && actionType !== '待命') {
          const abilities = abilityList(cardFor(next, unit));
          if (!abilities.some(ability => ability.name === name(row.依据能力)))
            return { ok: false, error: `${unit.name} 的战术没有可核对的依据能力。` };
        }
        if (entry.player && actionType !== '待命' && !infeasible &&
          !abilityList(next.stat_data).some(ability =>
            ability.name === name(plan.玩家审计?.依据能力)))
          return { ok: false, error: '玩家战术没有可核对的依据能力。' };
        const targetId = name(row.战术方案?.目标);
        const target = battle.units.find(other => onField(other) &&
          (other.id === targetId || other.name === targetId));
        if (entry.player && actionType === '对角色使用战术' && !infeasible &&
          name(declaration.target) && target?.id !== name(declaration.target))
          return { ok: false, error: '战术裁决目标与玩家选择不一致。' };
        const effectPlan = row.战术方案;
        const effect = actionType === '对角色使用战术' && target
          ? effectFromPlan(row.战术方案, target.side === unit.side ? 'ally' : 'enemy') : null;
        if (actionType === '对角色使用战术' && !infeasible && !effect)
          return { ok: false, error: `${unit.name} 的目标或效果计划无效。` };
        const rawBrush = actionType === '改变地形' ? row.笔刷 : null;
        const brushes = Array.isArray(rawBrush) ? rawBrush : rawBrush ? [rawBrush] : [];
        const terrainOps = [];
        for (const brush of brushes) {
          const normalized = terrainBrush(brush, battle, unit,
            entry.player ? plan.玩家审计 : null);
          if (!normalized) return { ok: false, error: `${unit.name} 的地形笔刷无效。` };
          terrainOps.push(normalized);
        }
        if (actionType === '改变地形' && !infeasible && !terrainOps.length)
          return { ok: false, error: `${unit.name} 的地形计划为空。` };
        normalized.push({ unit, actionType, target, effect,
          effectTier: TIERS.indexOf(name(effectPlan?.档位)) % 3, terrainOps,
          propCost: normalizePropCost(entry.player ? plan.玩家审计?.物品消耗 :
            row.物品消耗, battle), player: entry.player, infeasible });
      }
      const npcOutcomes = npcTactics(next, battle, random);
      const controlled = new Set(npcOutcomes.filter(row => row.stage !== 'switch-final')
        .map(row => row.actor));
      for (const entry of normalized) if (controlled.has(entry.unit.id))
        entry.actionType = '待命';
      const winners = terrainWinners(normalized);
      const outcomes = [...npcOutcomes];
      for (const entry of normalized) {
        const { unit, actionType, target, effect, terrainOps } = entry;
        if (!onField(unit) || (actionType === '对角色使用战术' && !onField(target))) {
          log(battle, `${unit.name} 的战术因发动者或目标离场而取消。`);
          continue;
        }
        if (actionType === '待命') {
          if (!controlled.has(unit.id)) log(battle, `${unit.name} 战术待命。`);
          continue;
        }
        const averageSanity = battle.fieldEffectMeta
          ? (battle.fieldEffectMeta.averages[String(unit.rank)] || battle.fieldEffectMeta.averages['10'] ||
            modules['cryptLord.battleFieldEffectReference'].averages()['10']).理智
          : num(window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.[String(unit.rank)]?.理智, unit.maxSanity);
        const cost = Math.max(1, Math.round(averageSanity * .05));
        unit.sanity = Math.max(0, unit.sanity - cost);
        if (entry.infeasible) {
          const reason = name(plan.玩家审计?.理由) || '没有可核对的依据';
          log(battle, `${unit.name} 的战术申报不可行：${reason}。`);
          outcomes.push({ actor: unit.id, outcome: 'infeasible', reason });
          continue;
        }
        if (effect) {
          const hostile = target.side !== unit.side;
          const roll = hostile ? contestTactic(unit, target, entry.effectTier, random, battle) : null;
          if (roll && !roll.win) {
            log(battle, `${unit.name} 对 ${target.name} 的「${effect.name}」拼点失败（${roll.caster}:${roll.defender}）。`);
            outcomes.push({ actor: unit.id, target: target.id, outcome: 'resisted', roll });
          } else if (!applyTacticEffect(target, effect, battle, unit)) {
            log(battle, `${target.name} 已有同类更强或等强的效果，「${effect.name}」未生效。`);
            outcomes.push({ actor: unit.id, target: target.id, outcome: 'weaker', roll });
          } else {
            log(battle, `${unit.name} 对 ${target.name} 施加「${effect.name}」，持续 ${effect.duration} 回合${roll ? `（拼点 ${roll.caster}:${roll.defender}）` : ''}。`);
            const spent = consumeProps(battle, entry.propCost);
            if (spent.length) log(battle, `${unit.name} 消耗现场物件：${spent.join('、')}。`);
            outcomes.push({ actor: unit.id, target: target.id, outcome: 'applied',
              effect: { ...effect }, roll, spent });
          }
        } else if (terrainOps.length) {
          if (!winners.has(entry)) {
            log(battle, `${unit.name} 的地形改动被对方阻止。`);
            continue;
          }
          let changed = 0;
          for (const operation of terrainOps) for (const [x, y] of operation.cells) {
            const before = (battle.terrain || []).find(tile => tile.x === x && tile.y === y);
            if (operation.clear) {
              if (!before || !operation.clear.includes(before.name)) continue;
              battle.terrain = battle.terrain.filter(tile => tile !== before);
            } else {
              battle.terrain = (battle.terrain || []).filter(tile => tile.x !== x || tile.y !== y);
              battle.terrain.push({ ...operation.terrain, x, y });
            }
            changed++;
          }
          log(battle, changed ? `${unit.name} 改变了 ${changed} 格地形。` :
            `${unit.name} 的地形改动没有落到实处。`);
          if (changed) {
            const spent = consumeProps(battle, entry.propCost);
            if (spent.length) log(battle, `${unit.name} 消耗现场物件：${spent.join('、')}。`);
            outcomes.push({ actor: unit.id, outcome: 'terrain', spent });
          }
        } else log(battle, `${unit.name} 的战术未形成效果。`);
      }
      battle.lastTactic = { round: battle.round, declaration: clone(declaration),
        audit: plan.玩家审计 || null, abilityReview: plan.能力盘点 || [],
        actions: clone(plan.NPC行动), outcomes };
    } else {
      log(battle, '本轮战术阶段跳过。');
      let outcomes;
      if (autoPilot) {
        const player = battle.units.find(row => row.source === 'player' && !row.isSummon);
        const leave = battle.activeLeave?.processes.find(row => row.heroId === player?.id);
        if (!leave) autoPilotFor()?.autoAuras(battle, random);
        outcomes = modules['cryptLord.battleTacticCpu'].run(battle, next, {
          asNpc: !leave, leave: leave ? { mode: 'stay' } : null,
        }, random);
      } else outcomes = npcTactics(next, battle, random);
      battle.lastTactic = { round: battle.round, declaration: { action: '待命' },
        audit: null, abilityReview: [], actions: [], outcomes };
    }
    nextRound(battle);
    next.stat_data.当前活力 = battle.units[0].hp;
    next.stat_data.当前灵性 = battle.units[0].spirit;
    next.stat_data.当前理智 = battle.units[0].sanity;
    next.stat_data.当前人性 = battle.units[0].humanity;
    next.stat_data.当前敏捷 = battle.units[0].agility;
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function auraOptions(data) {
    const battle = get(data);
    if (!battle || battle.status !== 'active') return [];
    const auras = modules['cryptLord.battleAuras'];
    return auras?.options(battle, battle.units.find(actor => actor.source === 'player')) || [];
  }
  function fieldEffectOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return modules['cryptLord.battleFieldEffects']?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function effectTransferOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return modules['cryptLord.battleEffectTransfer']?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function briberyOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return modules['cryptLord.battleBribery']?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function balanceOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return balanceFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || null;
  }
  function punishmentOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return punishmentFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || null;
  }
  function mythicOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return mythicFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function exileOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return exileFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function activeLeaveOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return activeLeaveFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || null;
  }
  function battleEventOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return eventsFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function rewindOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return rewindFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || null;
  }
  function extraActionOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return extraFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function hardControlOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return hardFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function mindDepriveOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return mindFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || null;
  }
  function tempControlOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return tempFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function permanentControlOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return permanentFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function environmentOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return environmentFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function fundamentalOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return fundamentalFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function summonOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return summonFor(battle)?.options(battle, battle.units.find(row => row.source === 'player'), data) || [];
  }
  function abilityBorrowOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return modules['cryptLord.battleAbilityBorrow']?.options(battle,
      battle.units.find(row => row.source === 'player'), data) || [];
  }
  function abilityBorrow(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'abilityBorrow', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (battle?.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '能力借用只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const actor = battle.units.find(row => row.source === 'player');
    random ||= rollFor(battle);
    const outcome = modules['cryptLord.battleAbilityBorrow']?.apply(battle, actor, request, next, random);
    if (!outcome?.ok) return outcome || { ok: false, error: '能力借用模块不可用。' };
    battle.lastTactic = { round: battle.round,
      declaration: { action: '能力借用', ...request }, audit: null, actions: [],
      outcomes: [outcome, ...npcTactics(next, battle, random)] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function borrowedSkillControl(data, actor, request, random) {
    const battle = data.cryptLord.teamBattle, scope = battle.borrowScope;
    const target = battle.units.find(row => row.id === request?.target);
    const chosen = target && interferableSkills(data, target).find(row => row.name === request?.skill);
    if (!scope || !target || target === actor || !onField(target) || !chosen)
      return { ok: false, error: '技能干涉目标或技能已变化。' };
    const result = resolveSkillControl(data, battle, actor, target, request.mode, chosen,
      scope.descriptor.label, random, scope.descriptor.abilityRank);
    return { ok: true, ...result };
  }
  function applyBorrowedSkill(data, battle, actor, target, mode, skillName) {
    if (battle.skillControlMeta)
      return skillControlFor().apply(data, battle, actor, target, mode, skillName);
    const chosen = interferableSkills(data, target).find(row => row.name === skillName);
    if (!chosen) return { applied: false, reason: '技能不存在。' };
    const until = battle.round + 2;
    if (mode !== '复制') {
      target.skillControl ||= { banned: [], granted: [] };
      const old = target.skillControl.banned.find(row => row.name === skillName);
      if (old) old.until = Math.max(old.until, until);
      else target.skillControl.banned.push({ name: skillName, until });
    }
    if (mode !== '禁止') {
      actor.skillControl ||= { banned: [], granted: [] };
      const old = actor.skillControl.granted.find(row => row.name === skillName);
      if (old) old.until = Math.max(old.until, until);
      else actor.skillControl.granted.push({ name: skillName, ability: chosen.ability, from: target.id, until });
    }
    return { applied: true };
  }
  function summonPreview(data, request) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, reason: '当前不在战术阶段。' };
    return summonFor(battle)?.preview(battle,
      battle.units.find(row => row.source === 'player'), request, data) ||
      { ok: false, reason: '召唤模块不可用。' };
  }
  function summon(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'summon', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '召唤只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const actor = battle.units.find(row => row.source === 'player');
    const outcome = summonFor(battle)?.apply(battle, actor, request, next, random || rollFor(battle));
    if (!outcome?.ok) return outcome || { ok: false, error: '召唤模块不可用。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '召唤', ...request },
      audit: null, actions: [], outcomes: [outcome, ...npcTactics(next, battle, random || rollFor(battle))] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function fundamentalPreview(data, request) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, reason: '当前不在战术阶段。' };
    return fundamentalFor(battle)?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), request, data) ||
      { ok: false, reason: '底层规则模块不可用。' };
  }
  function fundamentalRule(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'fundamentalRule', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '底层规则只能在战术阶段修改。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcome = fundamentalFor(battle)?.apply(battle, actor, request, next, random || rollFor(battle));
    if (!outcome?.ok) return outcome || { ok: false, error: '底层规则模块不可用。' };
    // Original player-native laws are registered before the ordinary NPC arbitration pipeline.
    const outcomes = [outcome, ...npcTactics(next, battle, random || rollFor(battle))];
    battle.lastTactic = { round: battle.round, declaration: { action: '底层规则修改',
      ...outcome.declaration },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function environmentPreview(data, subtype) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, reason: '当前不在战术阶段。', rows: [] };
    return environmentFor(battle)?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, data) ||
      { ok: false, reason: '改变环境模块不可用。', rows: [] };
  }
  function changeEnvironment(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '改变环境只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const check = environmentPreview(next, request?.subtype);
    if (!check.ok) return { ok: false, error: check.reason };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle),
      undefined, null, null, null, false, null, null, null, null, request);
    if (!outcomes.some(row => row.actor === actor.id && row.subtype === request.subtype))
      return { ok: false, error: '本次改变环境未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '改变环境', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function ruleChangeOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return [];
    return rulesFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || [];
  }
  function ruleChangePreview(data, request) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, reason: '当前不在战术阶段。', parts: [] };
    return rulesFor(battle)?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), request, data) ||
      { ok: false, reason: '规则修改模块不可用。', parts: [] };
  }
  function ruleChange(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '规则修改只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const check = ruleChangePreview(next, request);
    if (!check.ok) return { ok: false, error: check.reason };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle),
      undefined, null, null, null, false, null, null, null, request);
    if (!outcomes.some(row => row.actor === actor.id && row.subtype === request.subtype))
      return { ok: false, error: '本次规则修改未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '规则修改', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function possessionOptions(data) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return possessionFor(battle)?.options(battle,
      battle.units.find(unit => unit.source === 'player'), data) || null;
  }
  function possession(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '附身只能在战术阶段发动或维持。' };
    if (moduleError(battle, true)) return { ok: false, error: moduleError(battle, true) };
    const option = possessionOptions(next);
    if (option?.active) {
      if (!['continue', 'release'].includes(request?.mode))
        return { ok: false, error: '请选择继续或解除附身。' };
      if (request.mode === 'continue' && !option.canContinue)
        return { ok: false, error: option.reason || '无法继续附身。' };
    } else {
      const choice = option?.choices.find(row => row.subtype === request?.subtype);
      if (!choice || choice.reason || !choice.targets.some(row => row.id === request?.target))
        return { ok: false, error: choice?.reason || '附身资格或目标已变化。' };
    }
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle),
      undefined, null, null, null, false, null, null, request);
    if (!outcomes.some(row => row.actor === actor.id && (option.active || row.subtype === request.subtype)))
      return { ok: false, error: '本次附身未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '附身', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function permanentControl(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '永久控制只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const choice = permanentControlOptions(next).find(row => row.subtype === request?.subtype);
    if (!choice || choice.reason || !choice.targets.some(row => row.id === request?.target))
      return { ok: false, error: choice?.reason || '永久控制资格或目标已变化。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle),
      undefined, null, null, null, false, null, request);
    if (!outcomes.some(row => row.actor === actor.id && row.subtype === request.subtype))
      return { ok: false, error: '本次永久控制未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '永久控制', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function tempControl(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '阵营短控只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const choice = tempControlOptions(next).find(row => row.subtype === request?.subtype);
    if (!choice || choice.reason || !choice.targets.some(row => row.id === request?.target))
      return { ok: false, error: choice?.reason || '阵营短控资格或目标已变化。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle),
      undefined, null, null, null, false, request);
    if (!outcomes.some(row => row.actor === actor.id && row.subtype === request.subtype))
      return { ok: false, error: '本次阵营短控未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '阵营短控', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function mindDeprive(data, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '心智剥夺只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const choice = mindDepriveOptions(next);
    if (!choice || choice.reason) return { ok: false, error: choice?.reason || '当前没有心智剥夺资格。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle), undefined, null, null, null, true);
    if (!outcomes.some(row => row.actor === actor.id && row.outcome === 'mind-deprive'))
      return { ok: false, error: '本次心智剥夺未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '心智剥夺' },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function hardControl(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '硬控只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const choice = hardControlOptions(next).find(row => row.subtype === request?.subtype);
    if (!choice || choice.reason || !choice.targets.some(row => row.id === request?.target))
      return { ok: false, error: choice?.reason || '硬控资格或目标已变化。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle), undefined, null, null, request);
    if (!outcomes.some(row => row.actor === actor.id && row.subtype === request.subtype))
      return { ok: false, error: '本次硬控未能发动，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '硬控', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function extraAction(data, subtype, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'extraAction', subtype, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '额外行动只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const actor = battle.units.find(unit => unit.source === 'player'), manager = extraFor(battle);
    if (!manager) return { ok: false, error: '本场额外行动模块不可用。' };
    const outcome = manager.grant(battle, actor, subtype, next);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random || rollFor(battle));
    battle.lastTactic = { round: battle.round, declaration: { action: '额外行动', subtype },
      audit: null, abilityReview: [], actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function rewind(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'rewind', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '回溯只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const manager = rewindFor(battle), actor = battle.units.find(unit => unit.source === 'player');
    if (!manager) return { ok: false, error: '本场回溯模块不可用。' };
    const outcome = manager.apply(battle, actor, request?.subtype, request?.round, next);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random || rollFor(battle));
    battle.lastTactic = { round: battle.round, declaration: { action: '回溯', ...request },
      audit: null, abilityReview: [], actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function battleEvent(data, subtype, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'battleEvent', subtype, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '战场事件只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const actor = battle.units.find(unit => unit.source === 'player');
    const manager = eventsFor(battle);
    if (!manager) return { ok: false, error: '本场战场事件模块不可用。' };
    const outcome = manager.attempt(battle, actor, subtype, next, random);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random || rollFor(battle));
    battle.lastTactic = { round: battle.round, declaration: { action: '制造战场事件', subtype },
      audit: null, abilityReview: [], actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function activeLeave(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '主动离场只能在战术阶段操作。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const choice = activeLeaveOptions(next);
    if (!choice || (choice.away ? !['stay', 'return'].includes(request?.mode)
      : !choice.choices.some(row => row.subtype === request?.subtype)))
      return { ok: false, error: '主动离场资格或请求已变化。' };
    const outcomes = npcTactics(next, battle, random || rollFor(battle), undefined, null, request);
    const actor = battle.units.find(unit => unit.source === 'player');
    battle.lastTactic = { round: battle.round, declaration: { action: '主动离场', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function exile(data, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '放逐只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const choice = exileOptions(next).find(row => row.subtype === request?.subtype);
    if (!choice || choice.reason || !choice.targets.some(row => row.id === request?.target))
      return { ok: false, error: choice?.reason || '放逐资格或目标已变化。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcomes = npcTactics(next, battle, random || rollFor(battle), undefined,
      { actor: actor.id, subtype: request.subtype, target: request.target });
    if (!outcomes.some(row => row.actor === actor.id))
      return { ok: false, error: '战术结算时放逐资格或目标已变化，未保存楼层。' };
    battle.lastTactic = { round: battle.round, declaration: { action: '放逐', ...request },
      audit: null, abilityReview: [], actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function mythicForm(data, kind, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '神话形态只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const manager = mythicFor(battle);
    if (!manager) return { ok: false, error: '本场没有可用的神话形态模块。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const count = manager.activeCount(battle);
    const outcome = manager.attempt(battle, actor, kind, next);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random || rollFor(battle), count);
    battle.lastTactic = { round: battle.round, declaration: { action: '神话形态', kind },
      audit: null, abilityReview: [], actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function punishmentPreview(data, target) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return punishmentFor(battle)?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), target, data) || null;
  }
  function punishment(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'punishment', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '惩戒只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const manager = punishmentFor(battle);
    if (!manager) return { ok: false, error: '本场没有可用的惩戒模块。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcome = manager.attempt(battle, actor, request?.target, next);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random || rollFor(battle));
    battle.lastTactic = { round: battle.round, declaration: { action: '惩戒',
      target: request.target }, audit: null, abilityReview: [], actions: [],
      outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function balancePreview(data, target) {
    const battle = get(data);
    if (battle?.status !== 'active' || battle.phase !== 'tactic') return null;
    return balanceFor(battle)?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), target, data) || null;
  }
  function balance(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'balance', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '平衡只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const manager = balanceFor(battle);
    if (!manager) return { ok: false, error: '本场没有可用的平衡模块。' };
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcome = manager.attempt(battle, actor, request?.target, next);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random || rollFor(battle));
    battle.lastTactic = { round: battle.round, declaration: { action: '平衡',
      target: request.target }, audit: null, abilityReview: [], actions: [],
      outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function briberyPreview(data, subtype, target) {
    const battle = get(data);
    if (!battle || battle.phase !== 'tactic') return null;
    return modules['cryptLord.battleBribery']?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, target, data) || null;
  }
  function bribery(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'bribery', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '贿赂只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const manager = modules['cryptLord.battleBribery'];
    if (!manager) return { ok: false, error: '贿赂模块不可用。' };
    random ||= rollFor(battle);
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcome = manager.attempt(battle, actor, request?.subtype, request?.target, next, random);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random);
    battle.lastTactic = { round: battle.round, declaration: { action: '贿赂',
      subtype: request.subtype, target: request.target }, audit: null, abilityReview: [],
      actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function effectTransferPreview(data, subtype, target) {
    const battle = get(data);
    if (!battle || battle.phase !== 'tactic') return null;
    return modules['cryptLord.battleEffectTransfer']?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, target, data) || null;
  }
  function effectTransfer(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'effectTransfer', request, random);
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '效果传递只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const transfer = modules['cryptLord.battleEffectTransfer'];
    if (!transfer) return { ok: false, error: '效果传递模块不可用。' };
    random ||= rollFor(battle);
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcome = transfer.attempt(battle, actor, request?.subtype, request?.target, next, random);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random);
    battle.lastTactic = { round: battle.round, declaration: { action: '效果传递',
      subtype: request.subtype, target: request.target }, audit: null, abilityReview: [],
      actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function fieldEffectPreview(data, subtype, target) {
    const battle = get(data);
    if (!battle || battle.phase !== 'tactic') return [];
    return modules['cryptLord.battleFieldEffects']?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, target, data) || [];
  }
  function fieldEffect(data, request, random) {
    if (modules['cryptLord.battleTacticCpu'])
      return unifiedNativeTactic(data, 'fieldEffect', request, random);
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '施加效果只能在战术阶段发动。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const fields = modules['cryptLord.battleFieldEffects'];
    if (!fields) return { ok: false, error: '施加效果模块不可用。' };
    random ||= rollFor(battle);
    const actor = battle.units.find(unit => unit.source === 'player');
    const outcome = fields.attempt(battle, actor, request?.subtype, request?.target, next, random);
    if (!outcome.ok) return outcome;
    const outcomes = npcTactics(next, battle, random);
    battle.lastTactic = { round: battle.round, declaration: {
      action: '施加效果', subtype: request.subtype, target: request.target || null,
    }, audit: null, abilityReview: [], actions: [], outcomes: [outcome, ...outcomes] };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function aura(data, subtype, enabled) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '光环开关只能在战术阶段操作。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    const auras = modules['cryptLord.battleAuras'];
    const actor = battle.units.find(unit => unit.source === 'player');
    if (!auras || typeof enabled !== 'boolean' ||
      !auras.eligibility(battle, actor, subtype) || !onField(actor))
      return { ok: false, error: '当前光环资格或操作已变化。' };
    const initialized = Boolean(battle.auraState);
    auras.initialize(battle, formulasFor(battle) ? rollFor(battle) : undefined);
    const result = enabled ? auras.activate(battle, actor, subtype)
      : auras.deactivate(battle, actor, subtype);
    return result.ok ? { ...result, changed: result.changed || !initialized,
      data: finalize(next), battle: clone(battle) } : result;
  }
  function autoAction(data) {
    if (modules['cryptLord.battleActionCpu']) {
      const plan = modules['cryptLord.battleActionCpu'].preview(data);
      if (!plan) return null;
      return plan.moveTo?.cost > 0
        ? { ...plan, type: 'move', x: plan.moveTo.x, y: plan.moveTo.y }
        : plan.id ? plan : { ...plan, type: 'wait' };
    }
    const battle = get(data);
    const actor = battle?.status === 'active' && battle.phase === 'action' ? current(battle) : null;
    if (!actor || playerControlled(actor)) return null;
    const available = options(data).filter(choice => affordable(actor, choice));
    const candidates = available.flatMap(choice => choice.targets.map(id => ({
      choice, id, preview: hasConditions(choice.skill) ? actionPreview(data, choice.id, id) : null,
    })));
    const recovery = candidates.flatMap(({ choice, id, preview }) => {
      const recipients = preview ? preview.targets : [{
        id, isHeal: choice.heal > 0, heal: choice.heal, healStat: choice.healStat,
      }];
      const amount = recipients.reduce((sum, row) => {
        if (!row.isHeal) return sum;
        const target = battle.units.find(unit => unit.id === row.id);
        const key = CURRENT[`当前${row.healStat || '活力'}`];
        const max = LIMITS[`当前${row.healStat || '活力'}`];
        if (!target || target.side !== actor.side || !key || !max ||
          target[key] >= target[max] * .5) return sum;
        const formulas = formulasFor(battle);
        const healing = { ...choice, ...row };
        const restored = formulas
          ? formulas.healing(battle, actor, target, calculationSkill(healing), () => .5).amount
          : Math.min(row.heal, target[max] - target[key]);
        const net = target === actor && key === (choice.costKey || 'spirit')
          ? restored - choice.cost : restored;
        return sum + Math.max(0, net);
      }, 0);
      return amount > 0 ? [{ id: choice.id, target: id, amount }] : [];
    }).sort((a, b) => b.amount - a.amount);
    if (recovery.length) return { id: recovery[0].id, target: recovery[0].target };
    const balancePriority = balanceFor(battle)?.priorityTarget(battle, actor);
    const punishmentPriority = punishmentFor(battle)?.priorityTarget(battle, actor);
    const priorityRank = id => id === balancePriority ? 2 : id === punishmentPriority ? 1 : 0;
    const choices = candidates.map(({ choice, id, preview }) => ({
      id: choice.id, target: id, power: preview ? preview.targets.reduce((sum, row) =>
        sum + (!row.isHeal ? row.power * (row.side === actor.side ? -1 : 1) : 0), 0)
        : choice.heal ? -1 : choice.power,
      support: preview ? preview.effects.length > 0 && preview.targets.some(row => !row.isHeal)
        : !choice.heal,
    })).filter(row => row.power > 0 || row.support).sort((a, b) =>
      priorityRank(b.target) - priorityRank(a.target) || b.power - a.power);
    if (choices.length) return { id: choices[0].id, target: choices[0].target };
    const targets = battle.units.filter(unit => onField(unit) && unit.side !== actor.side)
      .sort((a, b) => priorityRank(b.id) - priorityRank(a.id) ||
        distance(actor, a) - distance(actor, b));
    if (!targets.length) return { type: 'wait' };
    const cells = reachable(data).sort((a, b) =>
      distance(a, targets[0]) - distance(b, targets[0]));
    return cells.length && distance(cells[0], targets[0]) < distance(actor, targets[0])
      ? { type: 'move', x: cells[0].x, y: cells[0].y } : { type: 'wait' };
  }
  function advanceAuto(data) {
    let next = clone(data || {});
    for (let step = 0; step < 240; step++) {
      const battle = next.cryptLord?.teamBattle;
      if (battle && moduleError(battle)) return { ok: false, error: moduleError(battle) };
      if (modules['cryptLord.battleActionCpu']) {
        const outcome = modules['cryptLord.battleActionCpu'].step(next);
        if (!outcome.ok || outcome.stopped) return outcome;
        next = outcome.data;
        continue;
      }
      const choice = autoAction(next);
      if (!choice) return { ok: true, data: next, battle: get(next) };
      const outcome = action(next, choice);
      if (!outcome.ok) return outcome;
      next = outcome.data;
    }
    return { ok: false, error: 'AI 连续行动超出上限，未写入楼层。' };
  }
  function report(data) {
    const battle = get(data);
    if (!battle || battle.status !== 'finished') return null;
    const heroes = battle.units.filter(unit => !unit.isSummon).map(unit => ({
      name: unit.name, teamType: unit.side, dataSource: unit.source,
      isSummon: unit.isSummon, playSource: unit.playSource,
      sequenceRank: unit.rank, additionalStats: { 当前活力: unit.hp, 活力: unit.maxHp },
    }));
    return { battle, experience: experience.compute(heroes, data) };
  }
  function end(data, id) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.id !== id || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '只能在本轮全部行动结束后结束当前战斗。' };
    if (moduleError(battle, true)) return { ok: false, error: moduleError(battle, true) };
    battle.status = 'finished';
    battle.endedAt = Date.now();
    fieldsFor(battle)?.finish(battle);
    transferFor(battle)?.finish(battle);
    briberyFor(battle)?.finish(battle);
    finishAuthorities(battle);
    battle.result = result(battle) || 'draw';
    log(battle, `手动结束战斗：${({ victory: '胜利', defeat: '失败', draw: '平局' })[battle.result]}。`);
    const player = battle.units.find(actor => actor.source === 'player');
    if (player) Object.assign(next.stat_data, { 当前活力: player.hp, 当前灵性: player.spirit,
      当前理智: player.sanity, 当前人性: player.humanity, 当前敏捷: player.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function settle(data, id, accept) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!battle || battle.id !== id || battle.status !== 'finished' || battle.settled)
      return { ok: false, error: '战报不存在或已经结算。' };
    if (battle.jurisdictionMeta && (!modules['cryptLord.arbiterJurisdictionBattle'] ||
      battle.jurisdictionMeta.version !== 1))
      return { ok: false, error: '仲裁人辖区模块或版本不可用，不能结算临时属性。' };
    const settledUnits = battle.units.map(actor => {
      const resolved = clone(actor);
      modules['cryptLord.shamanTerritoryBattle']?.strip(resolved);
      modules['cryptLord.arbiterJurisdictionBattle']?.strip(resolved);
      resolved.effects = [];
      recalculateAttributes(resolved);
      return resolved;
    });
    if (accept) {
      if (battle.units.some(unit => unit.playRecord)) {
        const playUnits = modules['cryptLord.battlePlayUnits'];
        if (!playUnits) return { ok: false, error: '专属玩法结算模块不可用。' };
        try { battle.playSettlement = playUnits.settle(next, battle, settledUnits); }
        catch (error) { return { ok: false, error: error.message }; }
      }
      for (const unit of battle.units.filter(unit => unit.source === 'npc' && !unit.isSummon && !unit.playSource)) {
        const card = next.npc_data?.[unit.id];
        if (!object(card) || num(card.当前活力) !== unit.startingHp ||
          num(card.当前灵性, unit.startingSpirit) !== unit.startingSpirit ||
          num(card.当前理智, unit.startingSanity) !== unit.startingSanity ||
          num(card.当前人性, unit.startingHumanity) !== unit.startingHumanity ||
          num(card.当前敏捷, unit.startingAgility) !== unit.startingAgility ||
          experience.rank(card.当前序列) !== unit.rank)
          return { ok: false, error: `NPC ${unit.name} 的数据已变化，请重新核对。` };
      }
      const computed = report(next)?.experience;
      settledUnits.filter(unit => unit.source === 'npc' && !unit.isSummon && !unit.playSource).forEach(unit => {
        Object.assign(next.npc_data[unit.id], {
          当前活力: unit.hp, 当前灵性: unit.spirit,
          当前理智: unit.sanity, 当前人性: unit.humanity, 当前敏捷: unit.agility,
        });
      });
      if (battle.result === 'victory') experience.commit(computed, next);
      for (const loss of battle.picturePersonLosses || [])
        modules['cryptLord.shamanPicture']?.removeLoss(next, loss.id);
    }
    const player = settledUnits.find(unit => unit.source === 'player');
    if (player) Object.assign(next.stat_data, {
      当前活力: player.hp, 当前灵性: player.spirit, 当前理智: player.sanity,
      当前人性: player.humanity, 当前敏捷: player.agility,
    });
    battle.settled = true;
    battle.accepted = Boolean(accept);
    log(battle, accept ? '战报与经验已经提交。' : '战报已放弃，不改写 NPC 属性。');
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function unifiedNativeTactic(data, method, request, random) {
    const next = clone(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '当前不在战术阶段。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    modules['cryptLord.battleTacticCpu'].initialize(battle, next);
    const actor = battle.units.find(unit => unit.source === 'player');
    const manager = modules['cryptLord.battleAbilityBorrow'];
    const probe = clone(next), probeBattle = probe.cryptLord.teamBattle;
    const probeActor = probeBattle.units.find(unit => unit.source === 'player');
    const validation = method === 'abilityBorrow'
      ? manager.validateRequest(probeBattle, probeActor, request, probe)
      : manager.validateNative(probeBattle, probeActor, method, request, probe);
    if (!validation?.ok) return validation || { ok: false, error: '战术参数无效。' };
    const outcomes = modules['cryptLord.battleTacticCpu'].run(battle, next,
      method === 'abilityBorrow' ? { borrow: request } : { method, value: request },
      random || rollFor(battle));
    const labels = { abilityBorrow: '能力借用', summon: '召唤', fundamentalRule: '底层规则修改',
      extraAction: '额外行动', rewind: '回溯', battleEvent: '制造战场事件', punishment: '惩戒',
      balance: '平衡', bribery: '贿赂', effectTransfer: '效果传递', fieldEffect: '施加效果' };
    battle.lastTactic = { round: battle.round,
      declaration: { action: labels[method], ...(typeof request === 'string'
        ? { subtype: request } : clone(request)) },
      audit: null, actions: [], outcomes };
    nextRound(battle);
    Object.assign(next.stat_data, { 当前活力: actor.hp, 当前灵性: actor.spirit,
      当前理智: actor.sanity, 当前人性: actor.humanity, 当前敏捷: actor.agility });
    return { ok: true, data: finalize(next), battle: clone(battle) };
  }
  function grazingSwitchOptions(data) {
    return modules['cryptLord.battleSummon']?.switchOptions(get(data), data) || null;
  }
  function switchGrazing(data, names, { locked = false } = {}) {
    const next = clone(data);
    const battle = next?.cryptLord?.teamBattle;
    const manager = modules['cryptLord.battleSummon'];
    if (!manager) return { ok: false, error: '放牧战斗模块未加载。' };
    const result = manager.switchPlayer(battle, next, names, locked);
    if (!result.ok) return result;
    return { ...result, data: result.changed === false ? data : finalize(next),
      battle: result.changed === false ? get(data) : clone(battle) };
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    roster, get, start, startDuel, options, actionPreview, reachable, action, tactic, tacticPrompt, parsePlan,
    current, playerControlled, calculationSkill,
    parseProps,
    skillControlEligibility, skillControlOptions, skillControl, recalculateAttributes,
    auraOptions, aura, fieldEffectOptions, fieldEffectPreview, fieldEffect,
    effectTransferOptions, effectTransferPreview, effectTransfer,
    briberyOptions, briberyPreview, bribery,
    balanceOptions, balancePreview, balance,
    punishmentOptions, punishmentPreview, punishment,
    mythicOptions, mythicForm,
    exileOptions, exile, terrainEntry,
    activeLeaveOptions, activeLeave,
    battleEventOptions, battleEvent,
    rewindOptions, rewind,
    extraActionOptions, extraAction,
    hardControlOptions, hardControl,
    mindDepriveOptions, mindDeprive,
    tempControlOptions, tempControl,
    permanentControlOptions, permanentControl,
    possessionOptions, possession,
    ruleChangeOptions, ruleChangePreview, ruleChange,
    environmentOptions, environmentPreview, changeEnvironment,
    fundamentalOptions, fundamentalPreview, fundamentalRule,
    summonOptions, summonPreview, summon, createSummonUnit, prepareSummon, refreshProjectionPassives,
    grazingSwitchOptions, switchGrazing,
    abilityBorrowOptions, abilityBorrow, borrowedSkillControl, applyBorrowedSkill,
    cardAbilities: rawAbilities,
    autoAction, advanceAuto, report, end, settle,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
