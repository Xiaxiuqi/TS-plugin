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
  const COLS = 12;
  const ROWS = 10;
  const MAX_LOG = 160;
  const clone = value => typeof structuredClone === 'function'
    ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const cap = (value, max) => Math.max(0, Math.min(max, num(value)));
  const name = value => String(value ?? '').trim();
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const alive = unit => unit.hp > 0;
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
  const briberyFor = battle => battle?.briberyMeta?.version === 1
    ? modules['cryptLord.battleBribery'] : null;
  const conditionsFor = () => modules['cryptLord.battleTeamConditions'];
  const hasConditions = skill => Boolean((skill?.conditionalParams || skill?.条件参数集)?.length);
  const affordable = (actor, choice) => actor[choice.costKey || 'spirit'] >= choice.cost;
  const playerControlled = actor => (actor?.controller || actor?.source) === 'player';
  const moduleError = battle => battle.formulas && !formulasFor(battle)
    ? '本场原版公式模块不可用，请重启本项目脚本。'
    : battle.auraState && !aurasFor(battle) ? '本场光环模块不可用，请重启本项目脚本。'
    : battle.fieldEffectMeta && !fieldsFor(battle) ? '本场施加效果模块不可用，请重启本项目脚本。'
    : battle.effectTransferMeta && !transferFor(battle) ? '本场效果传递模块不可用，请重启本项目脚本。'
    : battle.briberyMeta && !briberyFor(battle) ? '本场贿赂模块不可用，请重启本项目脚本。'
    : battle.conditionMeta && !conditionsFor() ? '本场条件参数模块不可用，请重启本项目脚本。' : '';
  const inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && y >= 0 && x < COLS && y < ROWS;
  function prepareLifeSave(battle, data, table) {
    if (!lifeSave) return;
    if (!object(battle.lifeSaveTable)) battle.lifeSaveTable =
      clone(object(table) ? table : lifeSave.defaults);
    for (const actor of battle.units) {
      if (actor.lifeSave) continue;
      const card = actor.source === 'player' ? data.stat_data : data.npc_data?.[actor.id];
      lifeSave.initialize(actor, actor.sequence,
        actor.pathway ?? card?.当前途径 ?? card?.途径 ?? card?.pathway ?? card?.所属途径,
        battle.lifeSaveTable, actor.source === 'player'
          ? lifeSave.storedStrategy(data) : lifeSave.defaultStrategy);
    }
  }
  function syncEnvironment(battle) {
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
    actor.baseAttributes ||= Object.fromEntries(Object.entries(ATTRIBUTES)
      .map(([stat, [, max]]) => [stat, num(actor[max], actor.luck)]));
    for (const [stat, [key, max]] of Object.entries(ATTRIBUTES)) {
      const value = Math.floor(effectiveValue(actor, stat, actor.baseAttributes[stat]));
      actor[max] = value;
      actor[key] = stat === '运气' ? value : cap(actor[key], value);
    }
  }
  function storeSkillEffect(battle, actor, target, raw, skill, passive = false) {
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
      const card = actor.source === 'player' ? data.stat_data : data.npc_data?.[actor.id];
      actor.tags = Array.isArray(actor.tags) ? actor.tags : [];
      for (const row of Array.isArray(card?.tags ?? card?.标签) ? card.tags ?? card.标签 : []) {
        if (typeof row === 'string') battleTags?.add(actor, row, 99);
        else if (object(row)) battleTags?.add(actor, row.name ?? row.名称,
          row.duration ?? 99, row.stacks, row.maxStacks);
      }
      battleTags?.sync(actor, actor.sequence, battle.tagRules.mapping);
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
    return battle.units.filter(row => alive(row) &&
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
    const active = (actor.effects || []).filter(effect => effect.skillEffect &&
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
        if (!loss) actor[key] += delta;
        log(battle, `${actor.name} 的「${effect.name}」${delta < 0 ? '损失' : '恢复'} ${Math.abs(delta)} 点${effect.stat.slice(2)}。`);
      }
      if (!effect.battlePersistent) effect.duration--;
    }
    actor.effects = (actor.effects || []).filter(effect => effect.battlePersistent ||
      effect.duration > 0);
    recalculateAttributes(actor);
  }
  function enterTurn(battle) {
    while (battle.index < battle.queue.length) {
      const actor = current(battle);
      if (alive(actor) && actor.turnStartedRound !== battle.round) {
        actor.turnStartedRound = battle.round;
        fieldsFor(battle)?.turnStart(battle, actor);
        processSkillEffects(battle, actor, 'turn_start');
        briberyFor(battle)?.sweep(battle);
        if (formulasFor(battle)) {
          actor.movement = formulasFor(battle).movement(battle, actor);
          actor.moveRemaining = actor.movement;
        }
      }
      if (alive(actor)) return;
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
    battle.log.push({ round: battle.round, message, at: Date.now(), ...(details || {}) });
    if (battle.log.length > MAX_LOG) battle.log.shift();
  };

  function roster(data) {
    const npcs = object(data?.npc_data) ? data.npc_data : {};
    return Object.entries(npcs).filter(([key, card]) => key !== '$meta' && object(card) &&
      name(key) && num(card.当前活力) > 0 && num(card.活力, card.当前活力) > 0)
      .map(([key, card]) => ({
        key, name: name(card.名称) || key, hp: num(card.当前活力),
        rank: experience.rank(card.当前序列),
      }));
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
    const side = unit => briberyFor(battle)?.originSide(battle, unit) || unit.side;
    const allies = battle.units.some(unit => side(unit) === 'ally' && alive(unit));
    const enemies = battle.units.some(unit => side(unit) === 'enemy' && alive(unit));
    if (allies && enemies) return null;
    return allies ? 'victory' : enemies ? 'defeat' : 'draw';
  }
  function advance(battle) {
    const actor = current(battle);
    if (actor) processSkillEffects(battle, actor, 'turn_end');
    battle.index++;
    enterTurn(battle);
    if (battle.index >= battle.queue.length) {
      for (const unit of battle.units) processSkillEffects(battle, unit, 'round_end');
      battleTags?.tick(battle.units);
      fieldsFor(battle)?.endRound(battle);
      transferFor(battle)?.sweep(battle, true);
      briberyFor(battle)?.sweep(battle, true);
    }
    aurasFor(battle)?.sweepDead(battle);
    fieldsFor(battle)?.sweep(battle);
    transferFor(battle)?.sweep(battle);
    briberyFor(battle)?.sweep(battle);
    const outcome = result(battle);
    if (outcome) {
      battle.status = 'finished';
      battle.result = outcome;
      battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
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
    fieldsFor(battle)?.sweep(battle);
    for (const unit of battle.units) {
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
        if (effect.skillEffect || effect.fieldEffect) continue;
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
        if (!loss) unit[key] += delta;
        log(battle, `${unit.name} 的「${effect.name}」${delta < 0 ? '损失' : '恢复'} ${Math.abs(delta)} 点${effect.stat.slice(2)}。`);
      }
      unit.effects = (unit.effects || []).map(effect => effect.battlePersistent || effect.skillEffect || effect.fieldEffect
        ? effect : { ...effect, duration: effect.duration - 1 })
        .filter(effect => effect.battlePersistent || effect.duration > 0);
      recalculateAttributes(unit);
    }
    battle.terrain = (battle.terrain || []).map(tile =>
      tile.duration == null ? tile : { ...tile, duration: tile.duration - 1 })
      .filter(tile => tile.duration == null || tile.duration > 0);
    syncEnvironment(battle);
    aurasFor(battle)?.sweepDead(battle);
    briberyFor(battle)?.sweep(battle);
    const outcome = result(battle);
    if (outcome) {
      battle.status = 'finished'; battle.result = outcome; battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
      log(battle, `战斗结束：${({ victory: '胜利', defeat: '失败', draw: '平局' })[outcome]}。`);
      return;
    }
    aurasFor(battle)?.tick(battle);
    battle.queue = queue(battle);
    battle.index = 0;
    battle.phase = 'action';
    battle.units.forEach(unit => { unit.moves = 0; });
    enterTurn(battle);
    const effectOutcome = result(battle);
    if (effectOutcome) {
      battle.status = 'finished'; battle.result = effectOutcome; battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
    } else if (battle.index >= battle.queue.length) battle.phase = 'tactic';
    log(battle, `第 ${battle.round} 回合开始。`);
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
    const allies = Array.isArray(options.allies) ? options.allies : [];
    const enemies = Array.isArray(options.enemies) ? options.enemies : [];
    const unique = [...allies, ...enemies];
    if (!enemies.length || allies.length > 59 || enemies.length > 60 ||
      unique.length !== new Set(unique).size ||
      unique.some(key => !name(key) || key === '$meta' || key === 'player'))
      return { ok: false, error: '双方编队不能为空、重复或超过单方棋盘容量。' };
    const next = clone(data);
    const npc = object(next.npc_data) ? next.npc_data : {};
    if (unique.some(key => !object(npc[key]) || num(npc[key].当前活力) <= 0))
      return { ok: false, error: '参战 NPC 已变化或没有可用活力。' };
    const player = next.stat_data;
    if (!object(player) || num(player.当前活力) <= 0)
      return { ok: false, error: '玩家没有可用活力。' };
    const formulas = modules['cryptLord.battleFormulas'];
    const units = [unit(player, 'player', 'ally', 'player', 0, ROWS - 1, Boolean(formulas))];
    allies.forEach((key, i) => units.push(unit(npc[key], key, 'ally', 'npc',
      (i + 1) % COLS, ROWS - 1 - Math.floor((i + 1) / COLS), Boolean(formulas))));
    enemies.forEach((key, i) => units.push(unit(npc[key], key, 'enemy', 'npc',
      i % COLS, Math.floor(i / COLS), Boolean(formulas))));
    const battle = {
      version: 1, id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'active', phase: 'action', result: null, round: 1,
      units, queue: [], index: 0, log: [], terrain: [],
      props: parseProps(options.props), settled: false,
      board: { cols: COLS, rows: ROWS }, startedAt: Date.now(),
    };
    if (formulas) {
      try {
        battle.formulas = formulas.initialize(options.seed ??
          Math.floor(Math.random() * 4294967296), options.formulaValues);
        if (object(options.pathways) && Object.keys(options.pathways).length)
          battle.formulas.pathways = clone(options.pathways);
      } catch (error) { return { ok: false, error: error.message }; }
    }
    prepareLifeSave(battle, next, options.lifeSaveTable);
    prepareTagsAndPassives(battle, next, options.tagRules);
    log(battle, `战斗开始：我方 ${allies.length + 1} 人，敌方 ${enemies.length} 人。`);
    paintOpening(battle, options.opening);
    modules['cryptLord.battleAuras']?.initialize(battle,
      formulasFor(battle) ? rollFor(battle) : undefined);
    modules['cryptLord.battleFieldEffects']?.initialize(battle, options.pathways);
    modules['cryptLord.battleEffectTransfer']?.initialize(battle, options.pathways);
    modules['cryptLord.battleBribery']?.initialize(battle, options.pathways);
    if (conditionsFor()) battle.conditionMeta = { version: 1 };
    if (formulas) for (const actor of battle.units) {
      actor.movement = formulas.movement(battle, actor);
      actor.moveRemaining = actor.movement;
    }
    battle.queue = queue(battle);
    enterTurn(battle);
    const openingOutcome = result(battle);
    if (openingOutcome) {
      battle.status = 'finished'; battle.result = openingOutcome; battle.endedAt = Date.now();
      fieldsFor(battle)?.finish(battle);
      transferFor(battle)?.finish(battle);
      briberyFor(battle)?.finish(battle);
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
  function get(data) {
    const battle = data?.cryptLord?.teamBattle;
    if (!object(battle) || battle.version !== 1) return null;
    const restored = clone(battle);
    prepareLifeSave(restored, data);
    prepareTagsAndPassives(restored, data);
    return restored;
  }
  function options(data, raw = false) {
    const battle = get(data);
    const actor = battle?.status === 'active' && battle.phase === 'action' ? current(battle) : null;
    if (!actor) return [];
    const enemy = battle.units.filter(unit => unit.side !== actor.side && alive(unit));
    const friends = battle.units.filter(unit => unit.side === actor.side && alive(unit));
    const card = actor.source === 'player' ? data.stat_data : data.npc_data?.[actor.id];
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
      if (!power && !heal && !skill.effects?.length &&
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
        range: range.max, targetType: type || (ally ? 'ally' : 'single'),
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
    const auxiliary = actor.source === 'player'
      ? (weaponEngine?.auxiliaryMoves(data) || []).map(move =>
        auxiliaryOption(move, `auxiliary:${move.key}`)) : [];
    const granted = (actor.skillControl?.granted || []).flatMap((row, index) => {
      const aux = row.ability?.战斗效果 && weaponEngine?.auxiliaryMoves({
        stat_data: { 辅助能力列表: { borrowed: row.ability } },
      })[0];
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
    const weapons = (weaponEngine?.weaponMoves(weaponData) || []).map(move => ({
      id: `weapon:${move.key}`, name: move.name, cost: move.cost,
      power: move.damage, heal: move.healing, healStat: move.healStat,
      healValueType: 'fixed', damageType: itemDamageType(weaponData.stat_data?.武器列表?.[move.key]),
      range: move.range, targetType: move.area
        ? move.healing ? 'allAllies' : 'allEnemies' : move.healing ? 'ally' : 'single',
      radius: move.radius ?? 2, weapon: move,
      targets: (move.healing ? friends : enemy)
        .filter(target => distance(actor, target) <= move.range).map(target => target.id),
    }));
    const consumables = actor.source === 'player'
      ? (weaponEngine?.consumableMoves(data) || []).map(move => ({
        id: `${move.isScroll ? 'scroll' : 'consumable'}:${move.key}`,
        name: move.name, cost: move.cost, power: move.healing ? 0 : move.power,
        heal: move.healAmt, healStat: move.statName, quantity: move.quantity,
        healValueType: 'fixed', damageType: itemDamageType(card?.消耗品列表?.[move.key]),
        range: move.range, targetType: move.area
          ? move.healing ? 'allAllies' : 'allEnemies'
          : move.healing ? 'ally' : 'single',
        radius: move.area ? Infinity : 0, consumable: move,
        targets: (move.healing ? friends : enemy)
          .filter(target => move.healing || distance(actor, target) <= move.range)
          .map(target => target.id),
      })) : [];
    return [
      { id: 'basic', name: '普通攻击', cost: 0,
        power: original ? 1 : actor.power, damageType: 'physical',
        heal: 0,
        range: 1, targets: enemy.filter(target => distance(actor, target) <= 1).map(target => target.id) },
      ...skills, ...granted, ...weapons, ...consumables, ...auxiliary,
    ].filter(option => !banned.has(option.name)).map(option => {
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
    return { ...(choice.skill || {}), power: choice.power,
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
    const actor = battle?.phase === 'action' ? current(battle) : null;
    if (!actor || !alive(actor) || (formulasFor(battle)
      ? actor.moveRemaining <= 0 : actor.moves >= 1)) return [];
    const allowance = formulasFor(battle) ? actor.moveRemaining
      : effectiveValue(actor, 'movement', 3 + Math.max(0, actor.envMoveBonus || 0));
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
  function action(data, move = {}, random) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!object(battle) || battle.status !== 'active' || battle.phase !== 'action')
      return { ok: false, error: '当前不在行动阶段。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    random ||= rollFor(battle);
    const actor = current(battle);
    if (!actor || !alive(actor)) return { ok: false, error: '行动单位已变化。' };
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
      log(battle, `${actor.name} 移动到 (${x}, ${y})。`);
      for (const tile of battle.terrain || []) {
        if (tile.x !== x || tile.y !== y || !tile.id || !terrainPresets) continue;
        for (const hit of terrainPresets.hits(tile.id, actor, tile.rank)) {
          if (hit.kind === 'damage') {
            const loss = transferFor(battle)?.loss(battle, actor, '当前活力', Math.abs(hit.value),
              { sourceKind: '地形伤害', sourceLabel: tile.name });
            const damage = loss?.actualDamage ?? Math.min(actor.hp, Math.abs(hit.value));
            if (!loss) actor.hp -= damage;
            log(battle, `${actor.name} 受到「${tile.name}」${damage} 点伤害。`);
          } else if (hit.kind === 'status' && alive(actor)) {
            applyTacticEffect(actor, { name: tile.name, type: 'debuff', stat: hit.stat,
              power: Math.min(90, Math.abs(hit.value)), duration: 1, terrainSource: `${x},${y}` }, battle, actor);
            log(battle, `${actor.name} 受到「${tile.name}」状态影响。`);
          }
        }
      }
      aurasFor(battle)?.sweepDead(battle);
      transferFor(battle)?.sweep(battle);
      briberyFor(battle)?.sweep(battle);
      const outcome = result(battle);
      if (outcome) {
        battle.status = 'finished'; battle.result = outcome; battle.endedAt = Date.now();
        fieldsFor(battle)?.finish(battle);
        transferFor(battle)?.finish(battle);
        briberyFor(battle)?.finish(battle);
      }
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
      if (choice.consumable) {
        const list = next.stat_data?.消耗品列表;
        const item = list?.[choice.consumable.key];
        if (!item || Number(item.数量) !== choice.quantity || choice.quantity < 1)
          return { ok: false, error: '消耗品数量已变化。' };
        if (choice.quantity === 1) {
          if (Array.isArray(list)) list.splice(Number(choice.consumable.key), 1);
          else delete list[choice.consumable.key];
        } else item.数量 = choice.quantity - 1;
      }
      actor[choice.costKey || 'spirit'] -= choice.cost;
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
        : isArea ? battle.units.filter(unit => alive(unit) &&
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
        const isHealing = resolved.isHeal ?? resolved.heal > 0;
        const isDamage = !isHealing && (session ||
          (skill.isAccuracyWeapon ? skill.fixedDamage > 0 : resolved.power > 0));
        if (session) conditionalDetails.push({ id: victim.id, name: victim.name, side: victim.side,
          power: skill.isAccuracyWeapon ? skill.fixedDamage : resolved.power, isHeal: isHealing,
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
          log(battle, `${actor.name} 使用「${choice.name}」未命中 ${victim.name}（${Math.round(chance * 100)}%）。`);
          continue;
        }
        if (isHealing) {
          const stat = resolved.healStat || '活力';
          const key = CURRENT[`当前${stat}`] || 'hp';
          const max = LIMITS[`当前${stat}`] || 'maxHp';
          const tagModifier = battleTags?.modifier(actor, victim, resolved.skill,
            battle.tagRules.healing) || 0;
          const calculation = formulas?.healing(battle, actor, victim, skill, random);
          const healed = calculation ? calculation.amount :
            Math.max(0, Math.min(victim[max] - victim[key],
              Math.round(resolved.heal * (1 + tagModifier))));
          victim[key] += healed; actor.healing += healed;
          log(battle, `${actor.name} 使用「${choice.name}」为 ${victim.name} 恢复 ${healed} 点${stat}。`,
            calculation ? { actor: actor.id, target: victim.id, healing: healed,
              calculation: { ...calculation, kind: 'healing' } } : null);
        } else if (isDamage) {
          const scale = weapon?.mode === 'accuracy' || resolved.power <= 0 ? 1 :
            Math.max(0, effectiveValue(actor, 'attack', resolved.power) -
              resolved.power * (briberyFor(battle)?.weakenPercent(battle, actor, victim, 'attack') || 0) / 100) / resolved.power *
            Math.max(.1, 1 - (modifier(attackContext.ignoreDefenseBuff
              ? { ...victim, effects: victim.effects.filter(effect =>
                !(effect.type === 'buff' && effect.stat === 'defense')) } : victim, 'defense') -
              (briberyFor(battle)?.weakenPercent(battle, actor, victim, 'defense') || 0)) / 100);
          const tagModifier = battleTags?.modifier(actor, victim, resolved.skill,
            battle.tagRules.damage) || 0;
          const calculation = formulas?.damage(battle, actor, victim, skill, random, attackContext);
          const incoming = calculation ? calculation.amount :
            Math.max(0, Math.round(resolved.power * scale *
              Math.max(0, 1 + tagModifier + damageAdjustment(actor, victim))));
          const damageKey = calculation?.attribute || 'hp';
          const saved = (damageKey === 'hp' ? lifeSave?.absorb(victim, incoming) : null) ||
            { damage: incoming, triggered: false, incoming, absorbed: 0 };
          const routed = transferFor(battle)?.loss(battle, victim,
            damageKey === 'sanity' ? '当前理智' : '当前活力', saved.damage,
            { sourceLabel: `${actor.name}的「${choice.name}」`, sourceKind: '直接伤害' });
          const dealt = routed?.actualDamage ?? Math.min(victim[damageKey], Math.max(0, Math.round(saved.damage)));
          if (!routed) victim[damageKey] -= dealt;
          actor.damage += dealt;
          if (damageKey === 'hp' && !alive(victim)) actor.kills++;
          if (saved.triggered) log(battle,
            `${victim.name} 的「${saved.skillName}」吸收 ${saved.absorbed} 点伤害（${saved.absorbPct}%），实扣 ${dealt}。`);
          log(battle, `${actor.name} 使用「${choice.name}」命中 ${victim.name}，造成 ${dealt} 点${damageKey === 'sanity' ? '理智伤害' : '伤害'}。`,
            { actor: actor.id, target: victim.id, damage: dealt,
              incoming, lifeSaveMeta: { ...saved }, ...(routed ? { transfers: routed.transfers } : {}),
              ...(calculation ? { calculation: { ...calculation, chance, kind: 'damage' } } : {}) });
        }
        for (const effect of [...(weapon?.effects || []),
          ...(choice.consumable?.effects || [])]) {
          if (choice.consumable?.healing && effect.effectTarget === 'target') continue;
          if (effect.effectTarget === 'self' && victim !== victims[0]) continue;
          const recipient = effect.effectTarget === 'self' ? actor : victim;
          applyTacticEffect(recipient, { ...effect }, battle, actor);
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
        for (const recipient of tagTargets)
          battleTags?.applySkill(actor, recipient, { ...skill, targetType: 'single' },
            true);
        for (const effect of effects) for (const recipient of
          effectTargets(battle, actor, target, circle, effect.effectTarget,
            interference?.excludeSelf)) {
          if (storeSkillEffect(battle, actor, recipient, effect, skill))
            log(battle, `${actor.name} 对 ${recipient.name} 施加「${effect.name}」。`);
        }
      }
      if (choice.consumable?.healing && victims.length) {
        for (const effect of choice.consumable.effects || []) {
          if (effect.effectTarget !== 'target') continue;
          for (const enemy of battle.units.filter(unit => alive(unit) && unit.side !== actor.side))
            applyTacticEffect(enemy, { ...effect }, battle, actor);
        }
      }
      for (const effect of victims.length ? choice.auxiliary?.effects || [] : []) {
        const side = effect.effectTarget === 'allAlly' ? actor.side
          : actor.side === 'ally' ? 'enemy' : 'ally';
        const recipients = effect.effectTarget === 'self' ? [actor]
          : effect.effectTarget === 'target' ? [target]
            : battle.units.filter(unit => alive(unit) && unit.side === side &&
              (!interference?.excludeSelf || unit !== actor) &&
              distance(unit, target) <= choice.radius);
        for (const recipient of recipients)
          if (alive(recipient)) applyTacticEffect(recipient, { ...effect }, battle, actor);
      }
      advance(battle);
    }
    next.stat_data.当前活力 = battle.units[0].hp;
    next.stat_data.当前灵性 = battle.units[0].spirit;
    next.stat_data.当前理智 = battle.units[0].sanity;
    next.stat_data.当前人性 = battle.units[0].humanity;
    next.stat_data.当前敏捷 = battle.units[0].agility;
    return { ok: true, data: next, battle: clone(battle) };
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
    const card = unit.source === 'player' ? data.stat_data : data.npc_data?.[unit.id];
    const abilities = [
      ...Object.values(object(card?.序列能力列表) ? card.序列能力列表 : {})
        .flatMap(entries => Array.isArray(entries) ? entries : []),
      ...(Array.isArray(card?.能力清单) ? card.能力清单 : []),
      ...(unit.source === 'player' ? (modules['cryptLord.personalBattleState']
        ?.auxiliaryMoves({ stat_data: card }) || [])
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
    if (!alive(player)) return null;
    const modes = skillControlEligibility(data.stat_data);
    const targets = battle.units.filter(unit => unit.id !== 'player' && alive(unit))
      .map(unit => ({ id: unit.id, name: unit.name,
        skills: interferableSkills(data, unit).map(skill => ({
          name: skill.name, banned: skill.banned,
        })) })).filter(row => row.skills.length);
    return { modes, targets };
  }
  function controlCost(unit) {
    const average = num(window.GameDBManager?.DB?.consumableConfig
      ?.avgAttrByRank?.[String(unit.rank)]?.灵性, unit.maxSpirit);
    return Math.max(1, Math.round(average * .05));
  }
  function resolveSkillControl(data, battle, actor, target, mode, chosen, ability, random) {
    const cost = controlCost(actor);
    actor.spirit -= cost;
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
  function npcSkillControl(data, battle, random) {
    const outcomes = [];
    for (const actor of battle.units.filter(unit => !playerControlled(unit) && alive(unit))) {
      const card = data.npc_data?.[actor.id];
      const modes = skillControlEligibility(card);
      if (actor.spirit < controlCost(actor)) continue;
      for (const mode of ['禁止', '偷窃']) {
        if (!modes[mode]) continue;
        const candidates = battle.units.filter(unit => alive(unit) && unit.side !== actor.side)
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
  function npcTactics(data, battle, random) {
    const controls = npcSkillControl(data, battle, random);
    const fieldOutcomes = fieldsFor(battle)?.npc(battle, data,
      controls.map(row => row.actor), random) || [];
    const transfers = transferFor(battle)?.npc(battle, data,
      [...controls, ...fieldOutcomes].map(row => row.actor), random) || [];
    const bribes = briberyFor(battle)?.npc(battle, data,
      [...controls, ...fieldOutcomes, ...transfers].map(row => row.actor), random) || [];
    return [...controls, ...fieldOutcomes, ...transfers, ...bribes];
  }
  function skillControl(data, request, random) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!object(battle) || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '当前不在战术阶段。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    random ||= rollFor(battle);
    const player = battle.units.find(unit => unit.id === 'player');
    const target = battle.units.find(unit => unit.id === request?.target);
    const mode = name(request?.mode), skillName = name(request?.skill);
    const ability = skillControlEligibility(next.stat_data)[mode];
    const choices = target && interferableSkills(next, target);
    const chosen = choices?.find(row => row.name === skillName);
    if (!ability || !alive(player) || !target || target === player || !alive(target) ||
      !chosen) return { ok: false, error: '技能干涉资格、目标或技能已变化。' };
    const cost = controlCost(player);
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
    return { ok: true, data: next, battle: clone(battle) };
  }
  function tacticPrompt(data, declaration = {}) {
    const battle = get(data);
    if (!battle || battle.status !== 'active' || battle.phase !== 'tactic')
      throw new Error('当前不在战术阶段。');
    const summary = battle.units.filter(alive).map(unit => ({
      id: unit.id, name: unit.name, side: unit.side, sequence: unit.sequence,
      x: unit.x, y: unit.y, hp: unit.hp, sanity: unit.sanity,
      abilities: abilityList(unit.source === 'player' ? data.stat_data : data.npc_data?.[unit.id]),
    }));
    const rules = [
      '你是诡秘之主战斗战术裁决员。只依据下列角色能力描述和战况，不臆造能力。',
      '先盘点每人的能力。审计玩家申报时，必须指出具体能力和描述是否覆盖作用、位置与目标；不成立写明理由。',
      '为每个活着的 NPC 安排一次改变地形、对角色使用战术或待命；理智低于上限一半则待命。',
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
  function applyTacticEffect(target, effect, battle, actor) {
    const transfer = transferFor(battle);
    if (transfer) return transfer.routeEffect(battle, target, effect, {
      transferableExternal: true, sourceLabel: `${actor?.name || '未知'}的战术`,
      sourceKind: '普通战术',
    }, (recipient, instance) => applyTacticEffect(recipient, instance));
    target.effects ||= [];
    const same = target.effects.filter(row => row.stat === effect.stat &&
      row.type === effect.type && !row.ruleChange && !row.environment && !row.fieldEffect &&
      !row.skillEffect);
    if (same.some(row => row.power >= effect.power)) return false;
    target.effects = target.effects.filter(row => !same.includes(row));
    target.effects.push(effect);
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
  function tactic(data, command = 'skip', random) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!object(battle) || battle.status !== 'active' || battle.phase !== 'tactic')
      return { ok: false, error: '当前不在战术阶段。' };
    if (moduleError(battle)) return { ok: false, error: moduleError(battle) };
    random ||= rollFor(battle);
    prepareTagsAndPassives(battle, next);
    if (command !== 'skip') {
      const declaration = command?.declaration || { action: '待命' };
      const plan = command?.plan;
      if (!object(plan) || !Array.isArray(plan.NPC行动))
        return { ok: false, error: '战术计划缺少 NPC 行动。' };
      const npcs = battle.units.filter(unit => alive(unit) && unit.id !== 'player');
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
        if (!alive(unit)) continue;
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
          const abilities = abilityList(next.npc_data?.[unit.id]);
          if (!abilities.some(ability => ability.name === name(row.依据能力)))
            return { ok: false, error: `${unit.name} 的战术没有可核对的依据能力。` };
        }
        if (entry.player && actionType !== '待命' && !infeasible &&
          !abilityList(next.stat_data).some(ability =>
            ability.name === name(plan.玩家审计?.依据能力)))
          return { ok: false, error: '玩家战术没有可核对的依据能力。' };
        const targetId = name(row.战术方案?.目标);
        const target = battle.units.find(other => alive(other) &&
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
      const controlled = new Set(npcOutcomes.map(row => row.actor));
      for (const entry of normalized) if (controlled.has(entry.unit.id))
        entry.actionType = '待命';
      const winners = terrainWinners(normalized);
      const outcomes = [...npcOutcomes];
      for (const entry of normalized) {
        const { unit, actionType, target, effect, terrainOps } = entry;
        if (actionType === '待命') {
          if (!controlled.has(unit.id)) log(battle, `${unit.name} 战术待命。`);
          continue;
        }
        const averageSanity = num(window.GameDBManager?.DB?.consumableConfig
          ?.avgAttrByRank?.[String(unit.rank)]?.理智, unit.maxSanity);
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
      const outcomes = npcTactics(next, battle, random);
      battle.lastTactic = { round: battle.round, declaration: { action: '待命' },
        audit: null, abilityReview: [], actions: [], outcomes };
    }
    nextRound(battle);
    next.stat_data.当前活力 = battle.units[0].hp;
    next.stat_data.当前灵性 = battle.units[0].spirit;
    next.stat_data.当前理智 = battle.units[0].sanity;
    next.stat_data.当前人性 = battle.units[0].humanity;
    next.stat_data.当前敏捷 = battle.units[0].agility;
    return { ok: true, data: next, battle: clone(battle) };
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
  function briberyPreview(data, subtype, target) {
    const battle = get(data);
    if (!battle || battle.phase !== 'tactic') return null;
    return modules['cryptLord.battleBribery']?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, target, data) || null;
  }
  function bribery(data, request, random) {
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
    return { ok: true, data: next, battle: clone(battle) };
  }
  function effectTransferPreview(data, subtype, target) {
    const battle = get(data);
    if (!battle || battle.phase !== 'tactic') return null;
    return modules['cryptLord.battleEffectTransfer']?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, target, data) || null;
  }
  function effectTransfer(data, request, random) {
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
    return { ok: true, data: next, battle: clone(battle) };
  }
  function fieldEffectPreview(data, subtype, target) {
    const battle = get(data);
    if (!battle || battle.phase !== 'tactic') return [];
    return modules['cryptLord.battleFieldEffects']?.preview(battle,
      battle.units.find(unit => unit.source === 'player'), subtype, target, data) || [];
  }
  function fieldEffect(data, request, random) {
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
    return { ok: true, data: next, battle: clone(battle) };
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
      !auras.eligibility(battle, actor, subtype) || !alive(actor))
      return { ok: false, error: '当前光环资格或操作已变化。' };
    const initialized = Boolean(battle.auraState);
    auras.initialize(battle, formulasFor(battle) ? rollFor(battle) : undefined);
    const result = enabled ? auras.activate(battle, actor, subtype)
      : auras.deactivate(battle, actor, subtype);
    return result.ok ? { ...result, changed: result.changed || !initialized,
      data: next, battle: clone(battle) } : result;
  }
  function autoAction(data) {
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
    const choices = candidates.map(({ choice, id, preview }) => ({
      id: choice.id, target: id, power: preview ? preview.targets.reduce((sum, row) =>
        sum + (!row.isHeal ? row.power * (row.side === actor.side ? -1 : 1) : 0), 0)
        : choice.heal ? -1 : choice.power,
      support: preview ? preview.effects.length > 0 && preview.targets.some(row => !row.isHeal)
        : !choice.heal,
    })).filter(row => row.power > 0 || row.support).sort((a, b) => b.power - a.power);
    if (choices.length) return { id: choices[0].id, target: choices[0].target };
    const targets = battle.units.filter(unit => alive(unit) && unit.side !== actor.side)
      .sort((a, b) => distance(actor, a) - distance(actor, b));
    if (!targets.length) return null;
    const cells = reachable(data).sort((a, b) =>
      distance(a, targets[0]) - distance(b, targets[0]));
    return cells.length && distance(cells[0], targets[0]) < distance(actor, targets[0])
      ? { type: 'move', x: cells[0].x, y: cells[0].y } : { type: 'wait' };
  }
  function advanceAuto(data) {
    let next = clone(data || {});
    for (let step = 0; step < 240; step++) {
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
    const heroes = battle.units.map(unit => ({
      name: unit.name, teamType: unit.side, dataSource: unit.source,
      sequenceRank: unit.rank, additionalStats: { 当前活力: unit.hp, 活力: unit.maxHp },
    }));
    return { battle, experience: experience.compute(heroes, data) };
  }
  function settle(data, id, accept) {
    const next = clone(data || {});
    const battle = next.cryptLord?.teamBattle;
    if (!battle || battle.id !== id || battle.status !== 'finished' || battle.settled)
      return { ok: false, error: '战报不存在或已经结算。' };
    const settledUnits = battle.units.map(actor => {
      const resolved = clone(actor);
      resolved.effects = [];
      recalculateAttributes(resolved);
      return resolved;
    });
    if (accept) {
      for (const unit of battle.units.filter(unit => unit.source === 'npc')) {
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
      settledUnits.filter(unit => unit.source === 'npc').forEach(unit => {
        Object.assign(next.npc_data[unit.id], {
          当前活力: unit.hp, 当前灵性: unit.spirit,
          当前理智: unit.sanity, 当前人性: unit.humanity, 当前敏捷: unit.agility,
        });
      });
      if (battle.result === 'victory') experience.commit(computed, next);
    }
    const player = settledUnits.find(unit => unit.source === 'player');
    if (player) Object.assign(next.stat_data, {
      当前活力: player.hp, 当前灵性: player.spirit, 当前理智: player.sanity,
      当前人性: player.humanity, 当前敏捷: player.agility,
    });
    battle.settled = true;
    battle.accepted = Boolean(accept);
    log(battle, accept ? '战报与经验已经提交。' : '战报已放弃，不改写 NPC 属性。');
    return { ok: true, data: next, battle: clone(battle) };
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    roster, get, start, options, actionPreview, reachable, action, tactic, tacticPrompt, parsePlan,
    parseProps,
    skillControlEligibility, skillControlOptions, skillControl, recalculateAttributes,
    auraOptions, aura, fieldEffectOptions, fieldEffectPreview, fieldEffect,
    effectTransferOptions, effectTransferPreview, effectTransfer,
    briberyOptions, briberyPreview, bribery,
    autoAction, advanceAuto, report, settle,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
