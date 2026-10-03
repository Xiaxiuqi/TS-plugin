(() => {
  'use strict';

  const KEY = 'cryptLord.personalBattleState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const battleExp = modules['cryptLord.battleExperience'];
  if (!battleExp) throw new Error(`[${KEY}] core/battle-experience.js 尚未加载`);
  const reenactment = modules['cryptLord.mysteryReenactment'];
  const terrainPresets = modules['cryptLord.battleTerrainPresets'];
  const naturalEnvironment = modules['cryptLord.naturalEnvironment'];
  const battleTags = modules['cryptLord.battleTags'];
  const conditionalParams = modules['cryptLord.battleConditionalParams'];
  const lifeSave = modules['cryptLord.battleLifeSave'];

  const MAX_LOGS = 120;
  const BOARD_COLS = 12;
  const BOARD_ROWS = 10;
  const MODIFIER_STATS = Object.freeze([
    'attack', 'defense', 'speed', 'movement', 'damageDealtIncrease', 'damageDealtDecrease',
    'damageTakenIncrease', 'damageTakenDecrease',
  ]);
  const CANON_TACTICS = Object.freeze([
    { id: 'little_match_girl', cost: .08, stats: ['spirit', 'sanity', 'humanity'],
      effects: [['damageDealtDecrease', 50, 1], ['speed', 30, 1]] },
    { id: 'feast_of_betrayal', cost: .10, effects: [['damageDealtDecrease', 50, 1]] },
    { id: 'emperors_new_clothes', cost: .15, automatic: true, self: true,
      effects: [['damageTakenDecrease', 90, 1]] },
    { id: 'chess_game_of_time', cost: .10, stats: ['agility', 'spirit'],
      effects: [['speed', 30, 2], ['movement', 50, 2]] },
    { id: 'sleeping_beauty', cost: .10, stats: ['spirit', 'sanity', 'humanity'] },
    { id: 'peach_blossom_source', cost: .10 },
    { id: 'ugly_duckling', cost: 0, automatic: true, self: true,
      effects: [['damageDealtIncrease', 50, 1], ['damageTakenDecrease', 50, 1]] },
    { id: 'avalon_utopia', cost: .10, automatic: true, self: true },
  ]);
  const TERRAIN = Object.freeze({
    plain: Object.freeze({ id: 'plain', name: '平地', symbol: '', moveCost: 1, damage: 0, blocked: false }),
    rubble: Object.freeze({ id: 'rubble', name: '瓦砾', symbol: '△', moveCost: 2, damage: 0, blocked: false }),
    mire: Object.freeze({ id: 'mire', name: '泥泞', symbol: '≈', moveCost: 3, damage: 0, blocked: false }),
    fire: Object.freeze({ id: 'fire', name: '火焰', symbol: '✦', moveCost: 2, damage: 2, blocked: false, channel: 'field' }),
    poison: Object.freeze({ id: 'poison', name: '毒液', symbol: '☣', moveCost: 2, damage: 2, blocked: false, channel: 'residue' }),
    barrier: Object.freeze({ id: 'barrier', name: '障碍', symbol: '■', moveCost: Infinity, damage: 0, blocked: true }),
  });

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function copy(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  function integer(value, fallback = 0) { return Math.max(0, Math.floor(number(value, fallback))); }
  function text(value, fallback = '') { const valueText = String(value ?? '').trim(); return valueText || fallback; }

  function statOf(data) {
    return record(data?.stat_data) ? data.stat_data : {};
  }

  function resource(stat, current, maximum, fallback) {
    const max = Math.max(1, integer(stat[maximum], fallback), integer(fallback));
    return Math.max(0, Math.min(max, integer(stat[current], max)));
  }

  function flattenAbilities(data) {
    const groups = statOf(data).序列能力列表;
    if (!record(groups)) return [];
    return Object.entries(groups).flatMap(([group, entries]) => Array.isArray(entries)
      ? entries.map((ability, index) => ({ group, index, ability })).filter(entry =>
        record(entry.ability) && text(entry.ability.名称) && entry.ability.isPassive !== true && !/被动/.test(text(entry.ability.类型)),
      )
      : []);
  }

  function costOf(ability) {
    const raw = ability?.cost ?? ability?.消耗 ?? ability?.资源消耗 ?? {};
    const cost = { spirit: 0, sanity: 0, humanity: 0, hp: 0, agility: 0 };
    if (typeof raw === 'number' || typeof raw === 'string') cost.spirit = integer(raw);
    if (record(raw)) {
      cost.spirit = integer(raw.spirit ?? raw.灵性 ?? raw.灵性消耗 ?? raw.mp ?? raw.MP, cost.spirit);
      cost.sanity = integer(raw.sanity ?? raw.理智 ?? raw.理智消耗, 0);
      cost.humanity = integer(raw.humanity ?? raw.人性 ?? raw.人性消耗, 0);
      const typed = ({ currentVitality: 'hp', currentAgility: 'agility',
        currentSpirit: 'spirit', currentSanity: 'sanity',
        currentHumanity: 'humanity' })[raw.type];
      if (typed) cost[typed] = integer(raw.amount);
    }
    cost.spirit = integer(ability?.灵性消耗 ?? ability?.spiritCost, cost.spirit);
    cost.sanity = integer(ability?.理智消耗 ?? ability?.sanityCost, cost.sanity);
    cost.humanity = integer(ability?.人性消耗 ?? ability?.humanityCost, cost.humanity);
    return cost;
  }

  function powerOf(ability) {
    return Math.max(0, number(ability?.power ?? ability?.威力 ?? ability?.伤害 ?? ability?.damage ?? ability?.伤害倍率, 0));
  }

  function healingOf(ability) {
    if (!ability?.isHeal && !/治疗|恢复/.test(text(ability?.类型))) return 0;
    return Math.max(1, number(ability?.healAmt ?? ability?.healValue ?? ability?.治疗量 ?? ability?.治疗数值 ?? ability?.power, 1));
  }

  function abilityEffects(ability) {
    if (!Array.isArray(ability?.effects)) return [];
    return ability.effects.flatMap(effect => {
      if (!record(effect) || !['poison', 'regen', 'buff', 'debuff'].includes(effect.type)) return [];
      const modifier = effect.type === 'buff' || effect.type === 'debuff';
      if (modifier ? !MODIFIER_STATS.includes(effect.stat)
        : effect.stat && !['当前活力', '当前敏捷', '当前灵性', '当前理智', '当前人性'].includes(effect.stat)) return [];
      if (!modifier && effect.triggerTiming && effect.triggerTiming !== 'turn_start') return [];
      const valueType = effect.valueType
        || (modifier && effect.power == null && effect.modifier != null ? 'percentage' : 'fixed');
      if (!['fixed', 'percentage'].includes(valueType)
        || (modifier && !['attack', 'defense'].includes(effect.stat) && valueType !== 'percentage')) return [];
      const power = Number(effect.power ?? (modifier && effect.modifier != null ? Number(effect.modifier) * 100 : NaN));
      const duration = Number(effect.duration ?? 3);
      if (!Number.isFinite(power) || power <= 0 || !Number.isInteger(duration) || duration < 1 || duration > 99) return [];
      return [{
        name: text(effect.name, effect.type === 'poison' ? '持续伤害'
          : effect.type === 'regen' ? '持续恢复' : '攻防修正'),
        type: effect.type, power, duration,
        stat: modifier ? effect.stat : text(effect.stat, '当前活力'), valueType,
        effectTarget: text(effect.effectTarget, 'target'),
      }];
    });
  }

  function consumableMoves(data) {
    const list = statOf(data).消耗品列表;
    if (!record(list) && !Array.isArray(list)) return [];
    return Object.entries(list).filter(([key, item]) => key !== '$meta' && record(item) &&
      record(item.战斗效果) && Number.isInteger(Number(item.数量)) && Number(item.数量) > 0)
      .map(([key, item]) => {
        const battle = item.战斗效果;
        const healing = ['活力恢复', '敏捷恢复', '灵性恢复', '理智恢复', '人性恢复'].includes(battle.基础效果);
        const attack = ['物理攻击', '法术攻击', '精神攻击', '命运攻击'].includes(battle.基础效果);
        if (!healing && !attack) return null;
        const isScroll = item.$卷轴制造 === true;
        const rank = modules['cryptLord.scrollCrafting']?.rankOf(item.序列) ?? battleExp.rank(item.序列);
        const attrs = window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.[String(rank)] ||
          window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.['10'] ||
          { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27 };
        const scope = battle.范围 === '全体' ? '全体' : '单体';
        const statName = healing ? battle.基础效果.replace(/恢复$/, '') : '活力';
        const userRank = modules['cryptLord.scrollCrafting']?.gate(statOf(data)).rank ??
          battleExp.rank(statOf(data).当前序列);
        const gap = userRank - rank;
        const multiplier = gap >= 2 ? 50 : gap >= 1 ? 10 : 1;
        const enhanced = isScroll && record(item.$卷轴增强) ? item.$卷轴增强 : {};
        const bonus = value => ({ 1: 1.25, 2: 1.5, 3: 2 })[integer(value)] || 1;
        const power = Math.round(Math.round(number(attrs.活力, 37) * (scope === '全体' ? .1 : .2)) *
          multiplier * bonus(enhanced.威力));
        const healAmt = healing ? Math.round(Math.round(number(attrs[statName], 0) *
          (scope === '全体' ? .2 : .4)) * bonus(enhanced.恢复量)) : 0;
        const standard = Math.round(number(attrs.灵性, 43) * .1);
        const baseCost = Math.round(Math.round(standard * .25) * .5);
        const cost = Math.round(baseCost * (({ 1: .75, 2: .5, 3: .25 })[integer(enhanced.使用灵性消耗)] || 1));
        const extra = ['攻击BUFF', '防御BUFF', '速度BUFF',
          '攻击DEBUFF', '防御DEBUFF', '速度DEBUFF'].includes(battle.额外效果)
          ? battle.额外效果 : '';
        const debuff = extra.endsWith('DEBUFF');
        const effectTarget = attack ? (debuff ? 'target' : 'self')
          : debuff && scope === '单体' ? null : debuff ? 'target' : 'self';
        const buffPower = rank <= -1 ? 30 : rank <= .9 ? 25 : rank <= 2 ? 20 : rank <= 4 ? 15 : rank <= 6 ? 10 : 5;
        const effects = extra && effectTarget ? [{
          name: extra, type: debuff ? 'debuff' : 'buff',
          stat: extra.startsWith('速度') ? 'speed' : extra.startsWith('防御') ? 'defense' : 'attack',
          valueType: 'percentage',
          power: Math.round(buffPower * bonus(enhanced.附加效果幅度)),
          duration: ({ 1: 4, 2: 5, 3: 6 })[integer(enhanced.持续回合)] || 3,
          effectTarget,
        }] : [];
        return { key, name: text(item.名称, key), description: text(item.描述), isScroll,
          quantity: integer(item.数量), healing, area: scope === '全体',
          statName, power, healAmt, cost,
          range: ({ 1: 4, 2: 5, 3: 6 })[integer(enhanced.射程)] || 10,
          effects };
      }).filter(Boolean);
  }
  function scrollMoves(data) { return consumableMoves(data).filter(row => row.isScroll); }

  const WEAPON_CLASS = Object.freeze({
    威力量级: ['棍棒级', '砍刀级', '手枪级', '重型手枪级', '步枪级', '狙击枪级', '炸弹级'],
    精度: ['近战无精度', '霰弹枪级', '手枪级', '步枪级', '狙击枪级'],
    射程: ['近战', '中距离', '远程', '极远'],
    AOE: ['无AOE', '霰弹枪级', '手雷级'],
  });
  const WEAPON_DAMAGE = Object.freeze([5, 10, 50, 100, 150, 300, 500]);
  const WEAPON_RANGE = Object.freeze({ 近战: 1, 中距离: 3, 远程: 5, 极远: 7 });
  const WEAPON_ACCURACY = Object.freeze({ 霰弹枪级: 1.2, 手枪级: 1.6, 步枪级: 2, 狙击枪级: 2.4 });
  const WEAPON_ATTACKS = ['物理攻击', '法术攻击', '精神攻击', '命运攻击'];
  const WEAPON_HEALS = ['活力恢复', '敏捷恢复', '灵性恢复', '理智恢复', '人性恢复'];
  function weaponMoves(data) {
    const list = statOf(data).武器列表;
    if (!record(list) && !Array.isArray(list)) return [];
    return Object.entries(list).flatMap(([key, raw]) => {
      if (key === '$meta' || !record(raw) || raw.isEquipped !== true) return [];
      const item = modules['cryptLord.savantEnhancement']?.resolveWeapon(raw, data, '武器列表', key) || raw;
      const cls = item.$战斗分类;
      const valid = record(cls) && Object.entries(WEAPON_CLASS).every(([field, values]) => values.includes(cls[field]));
      const rank = battleExp.rank(item.序列);
      const base = item.战斗效果?.基础效果;
      const legacy = WEAPON_ATTACKS.includes(base) || WEAPON_HEALS.includes(base);
      const mode = rank < 7 ? (legacy ? 'legacy' : null)
        : rank <= 9 && valid && cls.射程 === '近战' && legacy ? 'legacy'
          : valid ? 'accuracy' : legacy ? 'legacy' : null;
      if (!mode) return [];
      const name = text(item.名称, key);
      if (mode === 'accuracy') {
        const steps = Math.max(0, 10 - rank);
        const melee = cls.射程 === '近战' && rank < 10;
        const multiplier = melee ? 1 + .5 * steps + (rank <= 7 ? .5 : 0) : 1 + .2 * steps;
        return [{ key, name, description: text(item.描述), mode,
          range: WEAPON_RANGE[cls.射程], accuracyTier: cls.精度,
          area: cls.AOE !== '无AOE', radius: ({ 无AOE: 0, 霰弹枪级: 1, 手雷级: 2 })[cls.AOE],
          damage: Math.max(1, Math.round(WEAPON_DAMAGE[WEAPON_CLASS.威力量级.indexOf(cls.威力量级)] * multiplier)),
          cost: 0, healing: 0, effects: [] }];
      }
      const scope = item.战斗效果.范围 === '全体' ? '全体' : '单体';
      const attrs = window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.[String(rank)] ||
        window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.['10'] ||
        { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27 };
      const healing = WEAPON_HEALS.includes(base);
      const healStat = healing ? base.replace(/恢复$/, '') : '活力';
      const extra = text(item.战斗效果.额外效果);
      const debuff = extra.endsWith('DEBUFF');
      const buff = !debuff && extra.endsWith('BUFF');
      const effectTarget = healing ? (debuff && scope === '单体' ? null : debuff ? 'enemy' : 'self')
        : debuff ? 'enemy' : 'self';
      const buffPower = rank <= -1 ? 30 : rank <= 0 ? 25 : rank <= 2 ? 20 : rank <= 4 ? 15 : rank <= 6 ? 10 : 5;
      const effects = (buff || debuff) && effectTarget ? [{
        name: extra, type: debuff ? 'debuff' : 'buff',
        stat: extra.startsWith('速度') ? 'speed' : extra.startsWith('防御') ? 'defense' : 'attack',
        valueType: 'percentage', power: buffPower, duration: 3,
        effectTarget: effectTarget === 'self' ? 'self' : 'target',
      }] : [];
      return [{ key, name, description: text(item.描述), mode, range: healing ? Infinity : 1,
        area: scope === '全体', healing: healing ? Math.round(number(attrs[healStat]) * (scope === '全体' ? .2 : .4)) : 0,
        healStat, damage: healing ? 0 : Math.round(number(attrs.活力, 37) * (scope === '全体' ? .15 : .3)),
        cost: Math.round(Math.round(number(attrs.灵性, 43) * .1) * .25), effects }];
    });
  }

  function auxiliaryMoves(data) {
    const list = statOf(data).辅助能力列表;
    if (!record(list) && !Array.isArray(list)) return [];
    return Object.entries(list).flatMap(([key, item]) => {
      if (key === '$meta' || !record(item) || !record(item.战斗效果)) return [];
      const base = item.战斗效果.基础效果;
      const attack = WEAPON_ATTACKS.includes(base);
      const heal = WEAPON_HEALS.includes(base);
      if (!attack && !heal) return [];
      const rank = battleExp.rank(item.序列);
      const attrs = window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.[String(rank)] ||
        window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank?.['10'] ||
        { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27 };
      const all = item.战斗效果.范围 === '全体';
      const healStat = heal ? base.replace(/恢复$/, '') : '活力';
      const extra = text(item.战斗效果.额外效果);
      const debuff = ['攻击DEBUFF', '防御DEBUFF', '速度DEBUFF'].includes(extra);
      const buff = ['攻击BUFF', '防御BUFF', '速度BUFF'].includes(extra);
      const target = attack ? (debuff ? all ? 'all' : 'target' : all ? 'allAlly' : 'self')
        : debuff && all ? 'all' : buff ? all ? 'allAlly' : 'target' : null;
      const buffPower = rank <= -1 ? 30 : rank <= 0 ? 25 : rank <= 2 ? 20 : rank <= 4 ? 15 : rank <= 6 ? 10 : 5;
      return [{ key, name: text(item.名称, key), description: text(item.描述),
        mode: 'auxiliary', area: all, range: heal ? Infinity : 3,
        damage: attack ? Math.round(number(attrs.活力, 37) * (all ? .1 : .2)) : 0,
        healing: heal ? Math.round(number(attrs[healStat]) * (all ? .2 : .4)) : 0,
        healStat, cost: Math.round(Math.round(number(attrs.灵性, 43) * .1) * .25),
        effects: target ? [{
          name: extra, type: debuff ? 'debuff' : 'buff',
          stat: extra.startsWith('速度') ? 'speed' : extra.startsWith('防御') ? 'defense' : 'attack',
          valueType: 'percentage', power: buffPower, duration: 3, effectTarget: target,
        }] : [] }];
    });
  }

  function weaponHitChance(weapon, player, enemy, range) {
    const coef = WEAPON_ACCURACY[weapon.accuracyTier];
    if (!coef) return 1;
    const attack = Math.max(0, number(player.agility));
    const defense = Math.max(0, number(enemy.hp), number(enemy.spirit), number(enemy.sanity),
      number(enemy.humanity), number(enemy.agility), number(enemy.luck),
      number(enemy.highestOtherCurrent));
    const base = attack + defense > 0 ? attack / (attack + defense) : 1;
    const decay = range > 1 ? 1 - .4 * (Math.max(1, distance(player, enemy)) - 1) / (range - 1) : 1;
    return Math.min(.95, Math.max(.05, base * coef * decay));
  }

  function seeded(seed) {
    let value = Number(seed) >>> 0;
    value = (value * 1664525 + 1013904223) >>> 0;
    return { seed: value, unit: value / 0x100000000 };
  }

  function pushLog(battle, actor, message, damage = 0) {
    battle.log.push({ round: battle.round, actor, message, damage: integer(damage), at: Date.now() });
    if (battle.log.length > MAX_LOGS) battle.log.splice(0, battle.log.length - MAX_LOGS);
  }
  function directHit(battle, target, damage) {
    const actor = battle[target];
    const saved = lifeSave?.absorb(actor, damage) || { damage, triggered: false };
    const dealt = Math.max(0, Math.round(saved.damage));
    actor.hp = Math.max(0, actor.hp - dealt);
    if (saved.triggered) pushLog(battle, 'system',
      `${actor.name} 的「${saved.skillName}」吸收 ${Math.round(saved.absorbed)} 点伤害（${saved.absorbPct}%），实扣 ${dealt}。`);
    return dealt;
  }

  function updateStatFromPlayer(data, player) {
    const stat = data.stat_data || (data.stat_data = {});
    const restore = (value, maximum) => {
      const baseline = player.territory?.baseline;
      if (!baseline || !Number.isFinite(baseline[maximum]) || !Number.isFinite(player[maximum])) return value;
      if (value <= 0) return 0;
      return Math.max(0, Math.min(baseline[maximum], Math.round(value * baseline[maximum] / player[maximum])));
    };
    stat.当前活力 = restore(player.hp, 'maxHp');
    stat.当前灵性 = restore(player.spirit, 'maxSpirit');
    stat.当前理智 = restore(player.sanity, 'maxSanity');
    stat.当前人性 = restore(player.humanity, 'maxHumanity');
    stat.当前敏捷 = Math.max(0, Math.round(player.agility / (player.territory?.multiplier || 1)));
  }

  function playerFrom(data) {
    const stat = statOf(data);
    const maxHp = Math.max(1, integer(stat.活力 ?? stat.基础活力, 30), integer(stat.当前活力));
    const maxSpirit = Math.max(1, integer(stat.灵性 ?? stat.基础灵性, 30), integer(stat.当前灵性));
    const maxSanity = Math.max(1, integer(stat.理智 ?? stat.基础理智, 30), integer(stat.当前理智));
    const maxHumanity = Math.max(1, integer(stat.人性 ?? stat.基础人性, 30), integer(stat.当前人性));
    const maxAgility = Math.max(1, integer(stat.敏捷 ?? stat.基础敏捷, 10), integer(stat.当前敏捷));
    return {
      name: text(stat.名称 ?? stat.姓名 ?? '<User>', '<User>'),
      hp: resource(stat, '当前活力', '活力', maxHp), maxHp,
      spirit: resource(stat, '当前灵性', '灵性', maxSpirit), maxSpirit,
      sanity: resource(stat, '当前理智', '理智', maxSanity), maxSanity,
      humanity: resource(stat, '当前人性', '人性', maxHumanity), maxHumanity,
      agility: Math.max(0, number(stat.当前敏捷 ?? stat.敏捷 ?? stat.基础敏捷, 10)), maxAgility,
      luck: Math.max(0, number(stat.当前运气 ?? stat.运气 ?? stat.基础运气, 0)),
      rank: battleExp.rank(stat.当前序列),
      sequenceString: text(stat.当前序列),
      tags: tagsOf(stat),
    };
  }

  function tagsOf(source) {
    const raw = source?.战斗标签 ?? source?.标签 ?? [];
    return Array.isArray(raw) ? raw.map(value => text(typeof value === 'string' ? value : value?.name)).filter(Boolean) : [];
  }

  function movementOf(actor) {
    const effects = (actor?.effects || []).filter(effect => effect.stat === 'speed' || effect.stat === 'movement');
    const speed = effects.filter(effect => effect.valueType === 'percentage').reduce((sum, effect) =>
      sum + (effect.type === 'buff' ? 1 : -1) * number(effect.power) / 100, 0);
    const fixed = effects.filter(effect => effect.stat === 'speed' && effect.valueType === 'fixed')
      .reduce((sum, effect) => sum + (effect.type === 'buff' ? 1 : -1) * number(effect.power), 0);
    return Math.max(1, Math.min(30, Math.round(
      (3 + Math.floor(Math.max(0, number(actor?.agility, 10) + fixed) / 15)) * Math.max(.1, 1 + speed)) +
      integer(actor?.envMoveBonus)));
  }

  function distance(a, b) {
    if (!a || !b) return Infinity;
    return Math.max(Math.abs(integer(a.x) - integer(b.x)), Math.abs(integer(a.y) - integer(b.y)));
  }

  function inBounds(board, x, y) {
    const cellX = Number(x);
    const cellY = Number(y);
    return Number.isInteger(cellX) && Number.isInteger(cellY)
      && cellX >= 0 && cellY >= 0
      && cellX < integer(board?.cols, BOARD_COLS) && cellY < integer(board?.rows, BOARD_ROWS);
  }

  function terrainKey(x, y) { return `${x},${y}`; }

  function terrainOf(battle, x, y) {
    const cell = terrainKey(x, y);
    const id = battle?.board?.terrain?.[cell];
    const preset = terrainPresets?.option(id);
    const terrain = id === 'scene' && record(battle?.board?.terrainSpec?.[cell]) ? battle.board.terrainSpec[cell]
      : TERRAIN[id] || preset || battle?.board?.baseTerrain || TERRAIN.plain;
    return { ...terrain, rounds: integer(battle?.board?.terrainDuration?.[cell]),
      id: id || terrain?.id || 'plain',
      ...(Number.isFinite(battle?.board?.terrainStrength?.[cell])
        ? { strength: battle.board.terrainStrength[cell] } : {}) };
  }

  function terrainCost(battle, x, y) {
    const terrain = terrainOf(battle, x, y);
    return terrain.blocked ? Infinity : terrain.moveCost;
  }

  function occupiedBy(battle, x, y, except = '') {
    return ['player', 'enemy', 'picture'].find(key => key !== except && battle?.[key]?.hp > 0 &&
      battle[key].x === x && battle[key].y === y) || '';
  }

  function reachableCells(battle, key, move = null) {
    const actor = battle?.[key];
    const budget = Math.max(0, integer(move == null ? actor?.moveRemaining : move, actor?.moveRemaining));
    if (!actor || !inBounds(battle?.board, actor.x, actor.y)) return [];
    const best = new Map([[terrainKey(actor.x, actor.y), 0]]);
    const pending = [{ x: actor.x, y: actor.y, cost: 0 }];
    const cells = [];
    while (pending.length) {
      pending.sort((left, right) => left.cost - right.cost);
      const current = pending.shift();
      if (current.cost !== best.get(terrainKey(current.x, current.y))) continue;
      if (!occupiedBy(battle, current.x, current.y, key)) cells.push({ ...current });
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const x = current.x + dx;
          const y = current.y + dy;
          if (!inBounds(battle.board, x, y)) continue;
          const step = terrainCost(battle, x, y);
          if (!Number.isFinite(step)) continue;
          const cost = current.cost + step;
          const cellKey = terrainKey(x, y);
          if (cost > budget || cost >= (best.get(cellKey) ?? Infinity)) continue;
          best.set(cellKey, cost);
          pending.push({ x, y, cost });
        }
      }
    }
    return cells.sort((left, right) => left.cost - right.cost || left.y - right.y || left.x - right.x);
  }

  function applyTerrainEntry(battle, key) {
    const actor = battle?.[key];
    const terrain = terrainOf(battle, actor?.x, actor?.y);
    if (actor && (terrain.channel === 'residue' ||
      terrainPresets?.hits(terrain.id, actor, terrain.strength).some(hit => hit.channel === 'residue'))) attachResidue(battle, key, terrain);
    return { terrain, damage: 0 };
  }

  function attachResidue(battle, key, terrain) {
    const actor = battle[key];
    const hits = terrainPresets?.get(terrain.id)
      ? terrainPresets.hits(terrain.id, actor, terrain.strength).filter(hit => hit.channel === 'residue')
      : [{ value: -terrain.damage, stat: '当前活力', rounds: 2 }];
    for (const hit of hits) {
      const base = `${terrain.name}·沾染`;
      const used = new Set(actor.effects.map(effect => effect.name));
      let name = base;
      for (let index = 2; used.has(name); index += 1) name = `${base}${index}`;
      actor.effects.push({
        name, type: hit.value > 0 ? 'regen' : 'poison', stat: hit.stat,
        power: Math.abs(hit.value), duration: hit.rounds,
        terrainSource: terrain.id, terrainResidueTurns: hit.rounds,
      });
      pushLog(battle, key, `${actor.name} 沾上${terrain.name}，之后 ${hit.rounds} 次行动开始各${hit.value > 0 ? '恢复' : '损失'} ${Math.abs(hit.value)} 点活力。`);
    }
  }

  function storeEffect(battle, target, effect) {
    const effects = battle[target].effects;
    const index = effects.findIndex(entry => entry.name === effect.name);
    if (index >= 0) {
      const previous = effects[index];
      if (effect.power > previous.power) effects[index] = effect;
      else if (effect.power === previous.power && effect.duration > previous.duration) {
        previous.duration = effect.duration;
        if (effect.appliedAtTurn != null) previous.appliedAtTurn = effect.appliedAtTurn;
      }
      else return false;
    } else effects.push(effect);
    const description = ['buff', 'debuff'].includes(effect.type)
      ? `${effect.stat} ${['attack', 'defense'].includes(effect.stat) ? (effect.type === 'buff' ? '+' : '-') : ''}${effect.power}${effect.valueType === 'percentage' ? '%' : ' 点'}`
      : `每次行动开始 ${effect.power} 点`;
    pushLog(battle, 'system', `${battle[target].name} 获得「${effect.name}」：${description}，剩余 ${effect.duration} 次。`);
    return true;
  }

  function modifiedAttack(actor, base) {
    const modifiers = actor.effects.filter(effect => effect.stat === 'attack');
    if (!modifiers.length) return base;
    let percent = 0;
    let fixed = 0;
    modifiers.forEach(effect => {
      const signed = effect.type === 'buff' ? effect.power : -effect.power;
      if (effect.valueType === 'percentage') percent += signed / 100;
      else fixed += signed;
    });
    return Math.max(0, base * (1 + percent) + fixed);
  }

  function damageModifier(actor, increase, decrease) {
    return actor.effects.reduce((total, effect) => {
      if (effect.valueType !== 'percentage') return total;
      if (effect.stat === increase) return total + effect.power / 100;
      if (effect.stat === decrease) return total - effect.power / 100;
      return total;
    }, 0);
  }

  function defenseRatio(defender) {
    const effects = defender.effects.filter(effect => effect.stat === 'defense');
    if (!effects.length) return 1;
    const base = Math.max(1, 3 + defender.agility * 0.18);
    let percent = 0;
    let fixed = 0;
    effects.forEach(effect => {
      const signed = effect.type === 'buff' ? effect.power : -effect.power;
      if (effect.valueType === 'percentage') percent += signed / 100;
      else fixed += signed;
    });
    return base / Math.max(1, base * Math.max(0, 1 + percent) + fixed);
  }

  function modifiedDamage(attacker, defender, base, rules = {}, skill = null) {
    const dealt = damageModifier(attacker, 'damageDealtIncrease', 'damageDealtDecrease');
    const taken = damageModifier(defender, 'damageTakenIncrease', 'damageTakenDecrease');
    const tags = battleTags?.modifier(attacker, defender, skill, rules?.damage) || 0;
    return Math.max(1, Math.round(base * defenseRatio(defender) * Math.max(0, 1 + dealt + taken + tags)));
  }

  function tickModifiers(battle, key) {
    const actor = battle[key];
    actor.effects = actor.effects.filter(effect => {
      if (effect.environment || !['buff', 'debuff'].includes(effect.type)
        || (key === 'player' && effect.appliedAtTurn === battle.turns)) return true;
      effect.duration -= 1;
      if (effect.duration > 0) return true;
      pushLog(battle, key, `${actor.name}的「${effect.name}」结束。`);
      return false;
    });
  }

  function moveActor(battle, key, x, y) {
    const actor = battle?.[key];
    if (!actor || !inBounds(battle.board, x, y)) return { ok: false, error: '目标坐标不在棋盘内。' };
    if (occupiedBy(battle, x, y, key)) return { ok: false, error: '目标格已有单位。' };
    const target = reachableCells(battle, key).find(cell => cell.x === x && cell.y === y);
    if (!target) return { ok: false, error: '目标格不可达，请检查移动点与地形。' };
    const cost = target.cost;
    actor.x = integer(x);
    actor.y = integer(y);
    actor.moveRemaining = Math.max(0, integer(actor.moveRemaining) - cost);
    const entry = cost > 0 ? applyTerrainEntry(battle, key) : { terrain: terrainOf(battle, x, y), damage: 0 };
    return { ok: true, cost, terrain: entry.terrain, damage: entry.damage };
  }

  function refreshTurn(battle, key) {
    const actor = battle[key];
    actor.moveMax = movementOf(actor);
    actor.moveRemaining = actor.moveMax;
    battle.currentTurn = key;
    battle.turnIndex = key === 'player' ? 0 : 1;
  }

  function processTurnEffects(battle, key) {
    const actor = battle[key];
    const remaining = [];
    for (const effect of actor.effects) {
      if (effect.type === 'buff' || effect.type === 'debuff') {
        remaining.push(effect);
        continue;
      }
      if (actor.hp <= 0) break;
      const resourceKey = ({ 当前活力: 'hp', 当前敏捷: 'agility', 当前灵性: 'spirit',
        当前理智: 'sanity', 当前人性: 'humanity' })[effect.stat] || 'hp';
      const maxKey = ({ hp: 'maxHp', spirit: 'maxSpirit', sanity: 'maxSanity',
        humanity: 'maxHumanity' })[resourceKey];
      const current = number(actor[resourceKey]);
      const maximum = maxKey ? number(actor[maxKey], current) : Infinity;
      const amount = Math.max(0, Math.min(effect.type === 'poison' ? current : maximum - current, effect.power));
      actor[resourceKey] = current + (effect.type === 'poison' ? -amount : amount);
      pushLog(battle, key, `${actor.name}的「${effect.name}」生效，${effect.type === 'poison' ? '损失' : '恢复'} ${amount} 点${effect.stat?.replace(/^当前/, '') || '活力'}。`, effect.type === 'poison' ? amount : 0);
      effect.duration -= 1;
      if (effect.duration > 0) remaining.push(effect);
    }
    actor.effects = remaining;
  }

  function processStandingTerrain(battle, key) {
    const actor = battle[key];
    if (actor.hp <= 0) return;
    const terrain = terrainOf(battle, actor.x, actor.y);
    const hits = terrainPresets?.hits(terrain.id, actor, terrain.strength) || [];
    for (const hit of hits) {
      if (hit.channel === 'residue') {
        const live = actor.effects.filter(effect => effect.terrainSource === terrain.id && effect.stat === hit.stat);
        if (!live.length) attachResidue(battle, key, terrain);
        else live.forEach(effect => { effect.duration = Math.max(effect.duration, effect.terrainResidueTurns); });
      } else if (hit.kind === 'damage') {
        const before = actor.hp;
        actor.hp = Math.max(0, Math.min(actor.maxHp, actor.hp + hit.value));
        pushLog(battle, key, `${actor.name} 身处${terrain.name}（${hit.tier}），${hit.value > 0 ? '恢复' : '损失'} ${Math.abs(actor.hp - before)} 点活力。`);
      } else {
        const name = `${terrain.name}·${hit.stat}`;
        const existing = actor.effects.find(effect => effect.name === name);
        if (existing) { existing.duration = 1; continue; }
        actor.effects.push({ name, type: hit.value > 0 ? 'buff' : 'debuff',
          power: Math.abs(hit.value), stat: hit.stat, valueType: 'fixed',
          duration: 1, terrainSource: terrain.id });
        pushLog(battle, key, `${actor.name} 身处${terrain.name}（${hit.tier}），${hit.stat}${hit.value > 0 ? '+' : '-'}${Math.abs(hit.value)}。`);
      }
    }
    if (terrain.channel === 'field') {
      const damage = Math.min(actor.hp, terrain.damage);
      actor.hp -= damage;
      pushLog(battle, key, `${actor.name} 身处${terrain.name}，损失 ${damage} 点活力。`, damage);
    } else if (terrain.channel === 'residue') {
      const live = actor.effects.filter(effect => effect.terrainSource === terrain.id);
      if (!live.length) attachResidue(battle, key, terrain);
      else live.forEach(effect => { effect.duration = Math.max(effect.duration, effect.terrainResidueTurns); });
    }
  }

  function tickTerrain(battle) {
    Object.entries(battle.board.terrainDuration).forEach(([key, rounds]) => {
      if (!battle.board.terrain[key]) { delete battle.board.terrainDuration[key]; return; }
      if (rounds > 1) battle.board.terrainDuration[key] = rounds - 1;
      else {
        pushLog(battle, 'system', `${(TERRAIN[battle.board.terrain[key]] || terrainPresets?.get(battle.board.terrain[key]))?.name || '地形'} (${key}) 消散了。`);
        delete battle.board.terrain[key];
        delete battle.board.terrainDuration[key];
        delete battle.board.terrainStrength[key];
        delete battle.board.terrainSpec[key];
      }
    });
  }

  function ensureBoardState(battle) {
    if (!record(battle)) return battle;
    battle.board = record(battle.board) ? battle.board : { cols: BOARD_COLS, rows: BOARD_ROWS };
    battle.board.cols = Math.max(4, integer(battle.board.cols, BOARD_COLS));
    battle.board.rows = Math.max(4, integer(battle.board.rows, BOARD_ROWS));
    battle.board.terrain = record(battle.board.terrain) ? battle.board.terrain : {};
    battle.board.terrainDuration = record(battle.board.terrainDuration) ? battle.board.terrainDuration : {};
    battle.board.terrainStrength = record(battle.board.terrainStrength) ? battle.board.terrainStrength : {};
    battle.board.terrainSpec = record(battle.board.terrainSpec) ? battle.board.terrainSpec : {};
    Object.keys(battle.board.terrain).forEach(key => {
      const [x, y] = key.split(',').map(Number);
      if (!inBounds(battle.board, x, y) || !(battle.board.terrain[key] === 'scene' &&
        record(battle.board.terrainSpec[key]) || TERRAIN[battle.board.terrain[key]] ||
        terrainPresets?.get(battle.board.terrain[key])) || battle.board.terrain[key] === 'plain') delete battle.board.terrain[key];
    });
    Object.keys(battle.board.terrainDuration).forEach(key => {
      if (!battle.board.terrain[key] || integer(battle.board.terrainDuration[key]) < 1) delete battle.board.terrainDuration[key];
      else battle.board.terrainDuration[key] = integer(battle.board.terrainDuration[key]);
    });
    Object.keys(battle.board.terrainStrength).forEach(key => {
      if (!terrainPresets?.get(battle.board.terrain[key]) ||
        !Number.isFinite(battle.board.terrainStrength[key])) delete battle.board.terrainStrength[key];
    });
    Object.keys(battle.board.terrainSpec).forEach(key => {
      if (battle.board.terrain[key] !== 'scene') delete battle.board.terrainSpec[key];
    });
    if (!record(battle.player)) battle.player = {};
    if (!record(battle.enemy)) battle.enemy = {};
    battle.canon = record(battle.canon) ? battle.canon : {};
    battle.canon.unlocked = Array.isArray(battle.canon.unlocked)
      ? battle.canon.unlocked.filter(id => CANON_TACTICS.some(row => row.id === id)) : [];
    battle.canon.exile = integer(battle.canon.exile);
    battle.canon.sleep = integer(battle.canon.sleep);
    if (battle.canon.environment !== 'avalon_utopia') delete battle.canon.environment;
    const startPlayer = { x: 2, y: Math.floor(battle.board.rows / 2) };
    const startEnemy = { x: Math.max(3, battle.board.cols - 3), y: Math.floor(battle.board.rows / 2) };
    if (!inBounds(battle.board, battle.player.x, battle.player.y)) Object.assign(battle.player, startPlayer);
    if (!inBounds(battle.board, battle.enemy.x, battle.enemy.y)
      || (battle.enemy.x === battle.player.x && battle.enemy.y === battle.player.y)) Object.assign(battle.enemy, startEnemy);
    battle.player.moveMax = movementOf(battle.player);
    battle.enemy.moveMax = movementOf(battle.enemy);
    battle.player.moveRemaining = Math.max(0, Math.min(battle.player.moveMax, integer(battle.player.moveRemaining, battle.player.moveMax)));
    battle.enemy.moveRemaining = Math.max(0, Math.min(battle.enemy.moveMax, integer(battle.enemy.moveRemaining, battle.enemy.moveMax)));
    if (record(battle.picture) && battle.picture.hp > 0) {
      battle.picture.moveMax = 0;
      battle.picture.moveRemaining = 0;
    } else delete battle.picture;
    for (const key of ['player', 'enemy', ...(battle.picture ? ['picture'] : [])]) {
      if (battleTags) battle[key].tags = (Array.isArray(battle[key].tags) ? battle[key].tags : [])
        .map(tag => typeof tag === 'string'
          ? { name: tag, duration: 99, stacks: 1, maxStacks: 99, source: 'inherent',
            $inherentStacks: 0 } : tag)
        .filter(tag => record(tag) && text(tag.name) && integer(tag.duration) > 0 &&
          integer(tag.stacks) > 0);
      battle[key].effects = (Array.isArray(battle[key].effects) ? battle[key].effects : [])
        .filter(effect => record(effect) && ['poison', 'regen', 'buff', 'debuff'].includes(effect.type)
          && integer(effect.duration) > 0 && number(effect.power) > 0
          && (['buff', 'debuff'].includes(effect.type)
            ? (MODIFIER_STATS.includes(effect.stat) || effect.stat === 'speed')
              && (['attack', 'defense'].includes(effect.stat) || effect.valueType === 'percentage'
                || (effect.valueType === 'fixed' && Boolean(terrainPresets?.get(effect.terrainSource))))
            : !effect.stat || effect.stat === '当前活力'))
        .map(effect => ({
          type: effect.type, name: text(effect.name, effect.type === 'poison' ? '持续伤害'
            : effect.type === 'regen' ? '持续恢复' : '攻防修正'),
          power: number(effect.power), duration: integer(effect.duration),
          ...(['buff', 'debuff'].includes(effect.type)
            ? { stat: effect.stat, valueType: effect.valueType === 'percentage' ? 'percentage' : 'fixed',
              appliedAtTurn: integer(effect.appliedAtTurn, 0),
              ...(effect.environment ? { environment: true } : {}) }
            : {}),
          ...((TERRAIN[effect.terrainSource]?.channel === 'residue' ||
            terrainPresets?.get(effect.terrainSource))
            ? { terrainSource: effect.terrainSource, terrainResidueTurns: integer(effect.terrainResidueTurns, 2) }
            : {}),
        }));
    }
    naturalEnvironment?.sync(battle);
    for (const key of ['player', 'enemy', ...(battle.picture ? ['picture'] : [])]) {
      battle[key].moveMax = key === 'picture' ? 0 : movementOf(battle[key]);
      battle[key].moveRemaining = Math.max(0, Math.min(battle[key].moveMax,
        integer(battle[key].moveRemaining, battle[key].moveMax)));
    }
    battle.turnOrder = ['player', 'enemy'];
    battle.turnIndex = battle.currentTurn === 'enemy' ? 1 : 0;
    battle.currentTurn = battle.currentTurn === 'enemy' ? 'enemy' : 'player';
    battle.version = Math.max(5, integer(battle.version, 2));
    return battle;
  }

  function withEnvironment(battle, attacker, defender, base, skill = null) {
    const dealt = damageModifier(attacker, 'damageDealtIncrease', 'damageDealtDecrease');
    const taken = damageModifier(defender, 'damageTakenIncrease', 'damageTakenDecrease')
      - (battle.canon.environment === 'avalon_utopia' && defender !== battle.enemy ? .5 : 0);
    const tags = battleTags?.modifier(attacker, defender, skill, battle.tagRules?.damage) || 0;
    return Math.max(1, Math.round(base * defenseRatio(defender) * Math.max(0, 1 + dealt + taken + tags)));
  }

  function stepToward(battle, key, targetKey) {
    const actor = battle[key];
    const target = battle[targetKey];
    const origin = { x: actor.x, y: actor.y };
    const currentDistance = distance(actor, target);
    const candidates = reachableCells(battle, key)
      .filter(cell => cell.cost > 0 && distance(cell, target) < currentDistance)
      .sort((left, right) => distance(left, target) - distance(right, target) || left.cost - right.cost);
    if (!candidates.length) return { moved: 0, damage: 0 };
    const result = moveActor(battle, key, candidates[0].x, candidates[0].y);
    if (!result.ok) return { moved: 0, damage: 0 };
    return { moved: distance(origin, actor), damage: result.damage };
  }

  function beginNextPlayerRound(battle) {
    tickTerrain(battle);
    battleTags?.tick([battle.player, battle.enemy, ...(battle.picture ? [battle.picture] : [])]);
    battle.round += 1;
    refreshTurn(battle, 'player');
    pushLog(battle, 'system', `第 ${battle.round} 回合开始。`);
    processTurnEffects(battle, 'player');
    processStandingTerrain(battle, 'player');
    if (battle.player.hp <= 0) finish(battle, 'defeat', `${battle.player.name} 因持续效果或地形失去战斗能力。`);
  }

  function resolveEnemyTurn(battle) {
    refreshTurn(battle, 'enemy');
    if (battle.canon.exile > 0) {
      battle.canon.exile -= 1;
      pushLog(battle, 'system', battle.canon.exile
        ? `${battle.enemy.name} 仍被隔绝在桃花源，剩余 ${battle.canon.exile} 回合。`
        : `${battle.enemy.name} 从桃花源返回原位。`);
      tickModifiers(battle, 'player');
      beginNextPlayerRound(battle);
      return;
    }
    processTurnEffects(battle, 'enemy');
    processStandingTerrain(battle, 'enemy');
    if (battle.enemy.hp <= 0) {
      finish(battle, 'victory', `${battle.enemy.name} 因持续效果失去战斗能力。`);
      return;
    }
    if (battle.canon.sleep > 0) {
      battle.canon.sleep -= 1;
      pushLog(battle, 'enemy', `${battle.enemy.name} 陷入沉睡，跳过本次行动。`);
      tickModifiers(battle, 'enemy');
      tickModifiers(battle, 'player');
      beginNextPlayerRound(battle);
      return;
    }
    const targetKey = battle.picture?.hp > 0 &&
      distance(battle.enemy, battle.picture) <= distance(battle.enemy, battle.player) ? 'picture' : 'player';
    const projected = (battle.enemy.imagination?.abilities || []).filter(ability =>
      record(ability) && !ability.isPassive && powerOf(ability) > 0 &&
      !ability.isHeal && !['self', 'ally', 'allAlly'].includes(text(ability.targetType)) &&
      distance(battle.enemy, battle[targetKey]) <=
        Math.max(1, integer(ability.range ?? ability.射程, 10)));
    const skill = projected.length ? projected[battle.seed % projected.length] : null;
    if (skill) {
      const roll = seeded(battle.seed);
      battle.seed = roll.seed;
      const damage = withEnvironment(battle, battle.enemy, battle[targetKey],
        modifiedAttack(battle.enemy, battle.enemy.power + powerOf(skill) + roll.unit * 2), skill);
      const dealt = directHit(battle, targetKey, damage);
      battleTags?.applySkill(battle.enemy, battle[targetKey], skill, true);
      pushLog(battle, 'enemy', `${battle.enemy.name} 施展「${text(skill.名称 || skill.name)}」，对${battle[targetKey].name}造成 ${dealt} 点伤害。`, dealt);
      if (targetKey === 'picture' && battle.picture.hp <= 0) {
        battle.pictureLosses ||= [];
        battle.pictureLosses.push({ id: battle.picture.id, name: battle.picture.name });
        delete battle.picture;
      }
      if (battle.player.hp <= 0) {
        finish(battle, 'defeat', `${battle.player.name} 失去战斗能力。`);
        return;
      }
    } else {
      const weapon = battle.enemy.fallbackWeapon;
      const reach = weapon ? WEAPON_RANGE[weapon.射程] || 1 : 1;
      const moved = distance(battle.enemy, battle[targetKey]) > reach
        ? stepToward(battle, 'enemy', targetKey) : { moved: 0 };
      if (moved.moved) pushLog(battle, 'enemy', `${battle.enemy.name} 向 ${battle.player.name} 逼近 ${moved.moved} 格。`);
      if (battle.enemy.hp <= 0) {
        finish(battle, 'victory', `${battle.enemy.name} 倒在危险地形中。`);
        return;
      }
      if (distance(battle.enemy, battle[targetKey]) <= reach) {
        const roll = seeded(battle.seed);
        battle.seed = roll.seed;
        const tier = weapon && WEAPON_CLASS.威力量级.indexOf(weapon.威力量级);
        const chance = weapon ? weaponHitChance({
          accuracyTier: weapon.精度, range: reach,
        }, battle.enemy, battle[targetKey], reach) : 1;
        const hit = chance >= 1 || roll.unit < chance;
        const enemyBase = weapon && tier >= 0 ? WEAPON_DAMAGE[tier]
          : modifiedAttack(battle.enemy, battle.enemy.power + battle.enemy.agility * 0.08
            - battle[targetKey].agility * 0.05);
        const enemyDamage = hit ? withEnvironment(battle, battle.enemy, battle[targetKey],
          enemyBase + (weapon ? 0 : roll.unit * 2)) : 0;
        const dealt = hit ? directHit(battle, targetKey, enemyDamage) : 0;
        pushLog(battle, 'enemy', weapon
          ? `${battle.enemy.name} 使用「${weapon.显示名 || weapon.名称}」${hit ? `，对${battle[targetKey].name}造成 ${dealt} 点伤害。` : '，未命中。'}`
          : `${battle.enemy.name} 反击 ${battle[targetKey].name}，造成 ${dealt} 点伤害。`, dealt);
        if (targetKey === 'picture' && battle.picture.hp <= 0) {
          battle.pictureLosses ||= [];
          battle.pictureLosses.push({ id: battle.picture.id, name: battle.picture.name });
          pushLog(battle, 'system', `${battle.picture.name} 战死，成品永久损毁。`);
          delete battle.picture;
        }
        if (battle.player.hp <= 0) {
          finish(battle, 'defeat', `${battle.player.name} 失去战斗能力。`);
          return;
        }
      } else {
        pushLog(battle, 'enemy', `${battle.enemy.name} 尚未进入攻击距离。`);
      }
    }
    tickModifiers(battle, 'enemy');
    tickModifiers(battle, 'player');
    if (battle.picture) {
      processTurnEffects(battle, 'picture');
      processStandingTerrain(battle, 'picture');
      if (battle.picture.hp <= 0) {
        battle.pictureLosses ||= [];
        battle.pictureLosses.push({ id: battle.picture.id, name: battle.picture.name });
        pushLog(battle, 'system', `${battle.picture.name} 战死，成品永久损毁。`);
        delete battle.picture;
      } else {
        const roll = seeded(battle.seed);
        battle.seed = roll.seed;
        const damage = modifiedDamage(battle.picture, battle.enemy,
          modifiedAttack(battle.picture, battle.picture.power + roll.unit * 2), battle.tagRules);
        const dealt = directHit(battle, 'enemy', damage);
        pushLog(battle, 'picture', `画中人 ${battle.picture.name} 攻击，造成 ${dealt} 点伤害。`, dealt);
        tickModifiers(battle, 'picture');
        if (battle.enemy.hp <= 0) {
          finish(battle, 'victory', `${battle.enemy.name} 被画中人击败。`);
          return;
        }
      }
    }
    beginNextPlayerRound(battle);
  }

  function get(data) {
    const battle = data?.cryptLord?.personalBattle;
    return record(battle) ? ensureBoardState(copy(battle)) : null;
  }

  function start(data, options = {}) {
    if (!record(data)) throw new Error('当前 assistant 楼层没有可写入的数据对象。');
    if (data.cryptLord?.personalBattle?.status === 'active') throw new Error('请先结束当前战斗。');
    if (data.cryptLord?.personalBattle?.status === 'finished' &&
      data.cryptLord.personalBattle.result === 'victory' &&
      data.cryptLord.personalBattle.enemy?.npcKey &&
      !data.cryptLord.personalBattle.experienceClaimed) throw new Error('请先领取或放弃上一场战斗经验。');
    const next = copy(data);
    const imagination = modules['cryptLord.audienceImagination'];
    const playerProjection = imagination && options.imaginationPool
      ? imagination.resolve(options.imaginationPool, next) : null;
    if (imagination && options.imaginationPool) {
      imagination.sync(next, options.imaginationPool, next.stat_data?.序列能力锁定 === true);
      modules['cryptLord.readerMystic']?.sync(next, options.imaginationPool);
      modules['cryptLord.mysteryReenactment']?.sync(next, options.imaginationPool);
    }
    const player = playerFrom(next);
    if (playerProjection?.imagined.length || playerProjection?.grazed.length) {
      player.imagination = {
        baseSequence: playerProjection.real,
        effectiveSequence: playerProjection.effectiveSequence,
        imagined: playerProjection.imagined,
        grazed: playerProjection.grazed.map(({ name, sequence }) => ({ name, sequence })),
      };
      player.sequenceString = playerProjection.effectiveSequence || player.sequenceString;
    }
    const npcKey = text(options.npcKey);
    const npc = npcKey && npcKey !== '$meta' && record(next.npc_data) &&
      Object.hasOwn(next.npc_data, npcKey) && record(next.npc_data[npcKey]) ? next.npc_data[npcKey] : null;
    if (npcKey && !npc) throw new Error('目标 NPC 已变化，请重新打开战斗系统。');
    const npcHp = Number(npc?.当前活力);
    if (npc && (!Number.isFinite(npcHp) || npcHp < 1)) throw new Error('目标 NPC 没有可用活力，不能开始战斗。');
    const enemyHp = npc ? Math.floor(npcHp)
      : Math.max(1, integer(options.enemyHp, Math.max(20, Math.round(player.maxHp * 0.85))));
    const enemy = {
      name: npcKey || text(options.enemyName, '训练假人'),
      hp: enemyHp,
      maxHp: npc ? Math.max(enemyHp, integer(npc.活力, enemyHp)) : enemyHp,
      power: npc ? Math.max(1, number(npc.攻击 ?? npc.当前敏捷 ?? npc.敏捷, 4) * .3)
        : Math.max(1, number(options.enemyPower, Math.max(2, Math.round(player.maxHp * 0.12)))),
      agility: Math.max(0, number(npc?.当前敏捷 ?? npc?.敏捷 ?? options.enemyAgility, 8)),
      spirit: Math.max(0, number(npc?.当前灵性 ?? npc?.灵性, enemyHp * .1)),
      sanity: Math.max(0, number(npc?.当前理智 ?? npc?.理智, enemyHp * .1)),
      humanity: Math.max(0, number(npc?.当前人性 ?? npc?.人性, enemyHp * .1)),
      luck: Math.max(0, number(npc?.当前运气 ?? npc?.运气, 0)),
      rank: npc ? battleExp.rank(npc.当前序列) : battleExp.rank(next.stat_data?.当前序列),
      sequenceString: text(npc?.当前序列 ?? options.enemySequence),
      tags: tagsOf(npc),
      highestOtherCurrent: npc ? Math.max(...['当前灵性', '当前理智',
        '当前人性', '运气'].map(key => Math.max(0, number(npc[key])))) : undefined,
      ...(npc ? { npcKey, startingHp: npcHp, rank: battleExp.rank(npc.当前序列) } : {}),
    };
    const projection = npc && imagination && options.imaginationPool
      ? imagination.npcProjection(options.imaginationPool, npc.当前序列) : null;
    if (projection) {
      enemy.imagination = { effectiveSequence: projection.effectiveSequence,
        imagined: projection.imagined, abilities: projection.abilities };
      enemy.sequenceString = projection.effectiveSequence || enemy.sequenceString;
    }
    const tagRules = options.tagRules || {};
    if (battleTags) {
      for (const actor of [player, enemy]) {
        actor.tags = (actor.tags || []).map(tag => typeof tag === 'string'
          ? { name: tag, duration: 99, stacks: 1, maxStacks: 99, source: 'inherent',
            $inherentStacks: 0 } : tag);
        battleTags.sync(actor, actor.sequenceString || actor.name, tagRules.mapping);
      }
    }
    const assigner = modules['cryptLord.npcWeaponAssigner'];
    if (npc && assigner?.eligible(npc) && !enemy.imagination?.abilities?.some(ability =>
      record(ability) && !ability.isPassive && powerOf(ability) > 0)) {
      enemy.fallbackWeapon = { ...assigner.fallback(npc) };
      enemy.pendingLlmWeapon = true;
    }
    const battle = {
      version: 5,
      id: `personal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'active',
      autoPilot: { on: false },
      result: null,
      round: 1,
      turns: 0,
      seed: (Date.now() ^ Math.floor(player.maxHp * 31)) >>> 0,
      player,
      enemy,
      ...(lifeSave ? { lifeSaveTable: options.lifeSaveTable || lifeSave.defaults } : {}),
      tagRules,
      canon: { sequence: text(next.stat_data?.当前序列),
        unlocked: options.imaginationPool && reenactment?.gate(next, options.imaginationPool).unlocked
        ? CANON_TACTICS.filter(row => Object.hasOwn(reenactment.ledger(next), row.id)).map(row => row.id) : [],
        exile: 0, sleep: 0 },
      board: { cols: BOARD_COLS, rows: BOARD_ROWS, terrain: {}, terrainDuration: {} },
      turnOrder: ['player', 'enemy'],
      turnIndex: 0,
      currentTurn: 'player',
      log: [],
      startedAt: Date.now(),
      endedAt: null,
    };
    ensureBoardState(battle);
    if (lifeSave) {
      lifeSave.initialize(battle.player, battle.player.sequenceString,
        next.stat_data?.当前途径, options.lifeSaveTable, lifeSave.storedStrategy(next));
      lifeSave.initialize(battle.enemy, battle.enemy.sequenceString,
        npc?.当前途径, options.lifeSaveTable);
    }
    modules['cryptLord.shamanTerritory']?.applyBattle?.(battle, options.shamanJudgment);
    modules['cryptLord.arbiterJurisdiction']?.applyBattle?.(battle, options.arbiterJudgment);
    battle.player.maxAgility = Math.max(battle.player.maxAgility, battle.player.agility);
    battle.enemy.maxAgility = Math.max(battle.enemy.maxAgility || 0, battle.enemy.agility);
    battle.player.moveMax = movementOf(battle.player);
    battle.player.moveRemaining = battle.player.moveMax;
    battle.enemy.moveMax = movementOf(battle.enemy);
    battle.enemy.moveRemaining = battle.enemy.moveMax;
    pushLog(battle, 'system', `战斗开始：${player.name} 对阵 ${enemy.name}。`);
    next.cryptLord = record(next.cryptLord) ? next.cryptLord : {};
    next.cryptLord.personalBattle = battle;
    updateStatFromPlayer(next, player);
    return { ok: true, data: next, battle: copy(battle) };
  }

  function finish(battle, result, reason) {
    battle.status = 'finished';
    battle.result = result;
    battle.endedAt = Date.now();
    const label = result === 'victory' ? '胜利' : result === 'defeat' ? '失败' : '撤离';
    pushLog(battle, 'system', `战斗${label}：${reason}`);
    if (battle.picture) delete battle.picture;
    battle.canon.environment = '';
  }

  function gameDay(era) {
    const match = text(era).replace(/\s+/g, '').match(/第([一二三四五六七八九十\d]+)纪(\d+)年(\d+)月(\d+)日/);
    if (!match) return null;
    const eraNo = ({ 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 })[match[1]] ?? Number(match[1]);
    return Number.isFinite(eraNo) ? `${eraNo}:${Number(match[2])}:${Number(match[3])}:${Number(match[4])}` : null;
  }

  function canonOptions(data) {
    const current = data?.cryptLord?.personalBattle;
    if (!record(current) || current.status !== 'active') return [];
    const battle = ensureBoardState(copy(current));
    if (!battle.canon.sequence || battle.canon.sequence !== text(data?.stat_data?.当前序列)) return [];
    const ledger = reenactment?.ledger(data) || {};
    const rankMatch = text(data?.stat_data?.当前序列).match(/序列\s*(\d+(?:\.\d+)?)/);
    const rank = rankMatch ? Number(rankMatch[1]) : battleExp.rank(data?.stat_data?.当前序列);
    let average;
    try { average = modules['cryptLord.readerMystic']?.average(rank); }
    catch { average = null; }
    return CANON_TACTICS.filter(row => battle.canon.unlocked.includes(row.id) && Object.hasOwn(ledger, row.id))
      .map(row => {
        const spirit = number(average?.灵性, battle.player.maxSpirit);
        const cost = Math.max(0, Math.round(spirit * row.cost));
        const now = text(data?.world_data?.当前时间纪元);
        const last = text(data?.stat_data?.$专属玩法?.窥秘人途径?.神秘再现玩法
          ?.法术运行状态?.ugly_duckling?.上次使用时间);
        const cooldown = row.id === 'ugly_duckling' && gameDay(now) && gameDay(now) === gameDay(last);
        const occupied = battle.canon.exile > 0 && !row.self ||
          row.id === 'sleeping_beauty' && battle.canon.sleep > 0 ||
          row.id === 'peach_blossom_source' && battle.canon.exile > 0 ||
          row.id === 'avalon_utopia' && battle.canon.environment === 'avalon_utopia';
        return { id: row.id, name: reenactment.catalog.find(item => item.id === row.id)?.battleName || row.id,
          cost, ready: !cooldown && !occupied && battle.player.spirit >= cost,
          reason: cooldown ? '本游戏日已经发动' : occupied ? '当前效果已在持续' :
            battle.player.spirit < cost ? '灵性不足' : '' };
      });
  }

  function useCanon(data, id) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active' || battle.currentTurn !== 'player')
      return { ok: false, error: '当前不是玩家战术回合。', data: next };
    ensureBoardState(battle);
    const row = CANON_TACTICS.find(item => item.id === id);
    const option = canonOptions(next).find(item => item.id === id);
    if (!row || !option) return { ok: false, error: '目录未解锁或战斗资格已失效。', data: next };
    if (!option.ready) return { ok: false, error: option.reason, data: next };
    const player = battle.player;
    player.spirit -= option.cost;
    battle.turns += 1;
    let won = true;
    if (!row.automatic) {
      const target = battle.enemy;
      const targetValue = Math.max(...(row.stats || ['hp', 'agility', 'spirit', 'sanity', 'humanity', 'luck'])
        .map(key => number(target[key])));
      const casterValue = player.spirit;
      const first = seeded(battle.seed);
      const second = seeded(first.seed);
      battle.seed = second.seed;
      const casterScore = Math.round(casterValue * (.8 + first.unit * .4));
      const targetScore = Math.round(targetValue * (.8 + second.unit * .4));
      won = casterScore > targetScore;
      pushLog(battle, 'player', `${option.name} 消耗 ${option.cost} 点灵性，拼点 ${casterScore}:${targetScore}，${won ? '成功' : '失败'}。`);
    } else pushLog(battle, 'player', `${player.name} 发动「${option.name}」，消耗 ${option.cost} 点灵性。`);
    if (won) {
      if (row.id === 'sleeping_beauty') battle.canon.sleep = 1;
      else if (row.id === 'peach_blossom_source') battle.canon.exile = 2;
      else if (row.id === 'avalon_utopia') battle.canon.environment = row.id;
      else for (const [stat, power, duration] of row.effects) {
        const target = row.self ? 'player' : 'enemy';
        storeEffect(battle, target, {
          name: `${option.name}·${stat}`, type: row.self ? 'buff' : 'debuff',
          stat, power, duration: row.self ? duration + 1 : duration,
          valueType: 'percentage', appliedAtTurn: battle.turns,
        });
      }
      if (row.id === 'ugly_duckling') {
        const play = next.stat_data.$专属玩法.窥秘人途径.神秘再现玩法;
        play.法术运行状态 = record(play.法术运行状态) ? play.法术运行状态 : {};
        play.法术运行状态.ugly_duckling = { 上次使用时间: text(next.world_data?.当前时间纪元) };
      }
    }
    resolveEnemyTurn(battle);
    updateStatFromPlayer(next, player);
    return { ok: true, data: next, battle: copy(battle) };
  }

  function summonPicture(data, id) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active' || battle.currentTurn !== 'player') {
      return { ok: false, error: '当前不是可召唤的战斗回合。', data: next };
    }
    ensureBoardState(battle);
    if (battle.picture) return { ok: false, error: '场上已有一名画中人。', data: next };
    const picture = modules['cryptLord.shamanPicture'];
    if (!picture?.gate(next.stat_data).unlocked) return { ok: false, error: '当前没有画中人召唤资格。', data: next };
    const row = picture.records(next).find(item => item.id === id &&
      !battle.pictureLosses?.some(loss => loss.id === id));
    if (!row) return { ok: false, error: '画中人成品已不存在。', data: next };
    const cost = picture.summonCost(modules['cryptLord.scrollCrafting']?.rankOf(next.stat_data?.当前序列));
    if (battle.player.spirit < cost) return { ok: false, error: `召唤需要 ${cost} 点灵性。`, data: next };
    const cell = [];
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const x = battle.player.x + dx;
      const y = battle.player.y + dy;
      if ((dx || dy) && inBounds(battle.board, x, y) &&
        !occupiedBy(battle, x, y) && !terrainOf(battle, x, y).blocked) cell.push({ x, y });
    }
    if (!cell.length) return { ok: false, error: '玩家近旁没有画中人的落脚之地。', data: next };
    const card = row.card;
    if (!ATTR_CARD.every(key => Number.isFinite(Number(card[key])) && Number(card[key]) > 0)) {
      return { ok: false, error: '画中人角色卡六维不完整。', data: next };
    }
    battle.player.spirit -= cost;
    battle.picture = { id, name: row.name, x: cell[0].x, y: cell[0].y,
      hp: integer(card.当前活力, integer(card.活力)), maxHp: integer(card.活力),
      agility: number(card.敏捷), power: Math.max(1, number(card.敏捷) * .3),
      effects: [], moveMax: 0, moveRemaining: 0, card: copy(card),
      sequenceString: text(card.当前序列) };
    lifeSave?.initialize(battle.picture, battle.picture.sequenceString,
      card.当前途径 ?? card.途径, battle.lifeSaveTable);
    naturalEnvironment?.sync(battle);
    battle.turns += 1;
    pushLog(battle, 'player', `${battle.player.name} 消耗 ${cost} 点灵性，召唤 ${row.name}（实力100%，移动力0）。`);
    resolveEnemyTurn(battle);
    for (const loss of battle.pictureLosses || []) picture.removeLoss(next, loss.id);
    updateStatFromPlayer(next, battle.player);
    return { ok: true, data: next, battle: copy(battle) };
  }
  const ATTR_CARD = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];

  function experiencePreview(data) {
    const battle = data?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'finished' || battle.result !== 'victory' ||
      !battle.enemy?.npcKey || battle.experienceClaimed) return null;
    const results = battleExp.compute([
      { teamType: 'enemy', name: battle.enemy.name, sequenceRank: battle.enemy.rank,
        additionalStats: { 当前活力: battle.enemy.hp, 活力: battle.enemy.maxHp } },
      { teamType: 'ally', name: battle.player.name,
        sequenceRank: battleExp.rank(data.stat_data?.当前序列), dataSource: 'player' },
    ], data);
    return {
      battleId: battle.id, npcKey: battle.enemy.npcKey,
      enemy: { name: battle.enemy.name, rank: battle.enemy.rank, hp: battle.enemy.hp },
      player: results.recipients[0].sim,
    };
  }

  function settleExperience(data, battleId, accept) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!battle || battle.id !== battleId || !experiencePreview(next)) {
      return { ok: false, error: '战报已变化或经验已经领取。', data: next };
    }
    if (accept) {
      const npc = next.npc_data?.[battle.enemy.npcKey];
      if (!record(npc)) return { ok: false, error: '目标 NPC 已不存在，请放弃经验后重新开始。', data: next };
      if (Number(npc.当前活力) !== battle.enemy.startingHp ||
        battleExp.rank(npc.当前序列) !== battle.enemy.rank) {
        return { ok: false, error: 'NPC 活力或序列已变化，请先核对变量。', data: next };
      }
      npc.当前活力 = 0;
      const results = battleExp.compute([
        { teamType: 'enemy', name: battle.enemy.name, sequenceRank: battle.enemy.rank,
          additionalStats: { 当前活力: battle.enemy.hp, 活力: battle.enemy.maxHp } },
        { teamType: 'ally', name: battle.player.name,
          sequenceRank: battleExp.rank(next.stat_data?.当前序列), dataSource: 'player' },
      ], next);
      if (!battleExp.commit(results, next)) return { ok: false, error: '当前角色数据缺失，无法结算经验。', data: copy(data) };
    }
    battle.experienceClaimed = true;
    battle.experienceAccepted = Boolean(accept);
    pushLog(battle, 'system', accept ? '战斗经验已结算至角色属性。' : '已放弃战斗经验；NPC 数据未改动。');
    return { ok: true, data: next, battle: copy(battle) };
  }

  function act(data, action = {}) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active') return { ok: false, error: '当前没有进行中的个人战斗。', data: next };
    if (!record(battle.player) || !record(battle.enemy)) return { ok: false, error: '战斗状态不完整，请重新开始。', data: next };
    ensureBoardState(battle);
    if (action.type === 'retreat') {
      finish(battle, 'retreat', `${battle.player.name} 主动撤离战斗。`);
      updateStatFromPlayer(next, battle.player);
      return { ok: true, data: next, battle: copy(battle) };
    }
    if (battle.currentTurn !== 'player') return { ok: false, error: '当前不是玩家行动回合。', data: next };
    if (action.type === 'canon') return useCanon(data, action.id);
    if (action.type === 'wait') {
      battle.turns += 1;
      pushLog(battle, 'player', `${battle.player.name} 等待。`);
      resolveEnemyTurn(battle);
      updateStatFromPlayer(next, battle.player);
      return { ok: true, data: next, battle: copy(battle) };
    }
    if (battle.canon.exile > 0) return { ok: false, error: '敌人尚在桃花源中，不能攻击。', data: next };

    let ability = null;
    let label = '普通攻击';
    let scroll = null;
    let itemMove = null;
    if (action.type === 'ability') {
      const item = flattenAbilities(next).find(entry => entry.group === action.group && entry.index === Number(action.index));
      if (!item) return { ok: false, error: '该能力已变化，请重新打开战斗系统。', data: next };
      ability = item.ability;
      label = text(ability.名称, label);
    } else if (action.type === 'scroll') {
      scroll = scrollMoves(next).find(row => row.key === action.key);
      if (!scroll) return { ok: false, error: '卷轴已经用尽或发生变化。', data: next };
      label = scroll.name;
    } else if (action.type === 'consumable') {
      scroll = consumableMoves(next).find(row => !row.isScroll && row.key === action.key);
      if (!scroll) return { ok: false, error: '消耗品已经用尽或发生变化。', data: next };
      label = scroll.name;
    } else if (action.type === 'weapon') {
      itemMove = weaponMoves(next).find(row => row.key === String(action.key));
      if (!itemMove) return { ok: false, error: '武器已卸下或参数已变化，请重新打开战斗系统。', data: next };
      label = itemMove.name;
    } else if (action.type === 'auxiliary') {
      itemMove = auxiliaryMoves(next).find(row => row.key === String(action.key));
      if (!itemMove) return { ok: false, error: '辅助能力已变化，请重新打开战斗系统。', data: next };
      label = itemMove.name;
    } else if (action.type !== 'basic') {
      return { ok: false, error: '未知战斗动作。', data: next };
    }
    const cost = costOf(ability);
    if (scroll) cost.spirit = scroll.cost;
    if (itemMove) cost.spirit = itemMove.cost;
    const player = battle.player;
    if (player.spirit < cost.spirit || player.sanity < cost.sanity || player.humanity < cost.humanity ||
      player.hp <= cost.hp || player.agility < cost.agility) {
      return { ok: false, error: `资源不足，${label}需要活力${cost.hp}、敏捷${cost.agility}、灵性${cost.spirit}、理智${cost.sanity}、人性${cost.humanity}。`, data: next };
    }
    if (ability && conditionalParams) {
      const projected = {
        ...player, hp: player.hp - cost.hp, agility: player.agility - cost.agility,
        spirit: player.spirit - cost.spirit, sanity: player.sanity - cost.sanity,
        humanity: player.humanity - cost.humanity,
      };
      const target = ['self', 'ally', 'allAlly'].includes(text(ability.targetType))
        ? projected : battle.enemy;
      ability = conditionalParams.select(ability, projected, target, seeded(battle.seed).unit);
    }
    const healing = itemMove ? itemMove.healing : scroll ? scroll.healAmt : healingOf(ability);
    const effects = itemMove ? itemMove.effects : scroll ? scroll.effects : abilityEffects(ability);
    const selfTarget = itemMove ? Boolean(healing) : scroll ? scroll.healing : ['self', 'ally', 'allAlly'].includes(text(ability?.targetType));
    const support = selfTarget && !healing && effects.length > 0;
    if (!healing && !selfTarget) {
      const rawRange = itemMove?.range ?? scroll?.range ?? ability?.range ?? ability?.射程 ?? ability?.攻击距离;
      const range = rawRange === 'global' ? Infinity : Math.max(1, integer(rawRange, ability || scroll || itemMove ? 10 : 1));
      if (distance(player, battle.enemy) > range) {
        return { ok: false, error: `${label}射程不足，请先移动至 ${range} 格内。`, data: next };
      }
    }
    player.spirit -= cost.spirit;
    player.sanity -= cost.sanity;
    player.humanity -= cost.humanity;
    player.hp -= cost.hp;
    player.agility -= cost.agility;
    if (cost.agility) next.stat_data.当前敏捷 = Math.max(0, number(next.stat_data.当前敏捷 ?? next.stat_data.敏捷) - cost.agility);
    if (scroll) {
      const list = next.stat_data.消耗品列表;
      if (Number(list[scroll.key].数量) === 1) {
        if (Array.isArray(list)) list.splice(Number(scroll.key), 1);
        else delete list[scroll.key];
      } else list[scroll.key].数量 = Number(list[scroll.key].数量) - 1;
    }
    battle.turns += 1;
    const roll = seeded(battle.seed);
    battle.seed = roll.seed;
    const hitChance = itemMove?.mode === 'accuracy'
      ? weaponHitChance(itemMove, player, battle.enemy, itemMove.range) : 1;
    const hit = !itemMove || hitChance >= 1 || roll.unit < hitChance;
    const playerBase = modifiedAttack(player, itemMove ? itemMove.damage : scroll ? scroll.power :
      3 + player.agility * 0.18 + powerOf(ability));
    const skill = ability || itemMove || scroll;
    const tagDamage = battleTags?.modifier(player, battle.enemy, skill, battle.tagRules?.damage) || 0;
    const playerDamage = healing || support || !hit ? 0 : itemMove?.mode === 'accuracy'
      ? Math.max(1, Math.round(itemMove.damage * Math.max(0, 1 + tagDamage +
        damageModifier(player, 'damageDealtIncrease', 'damageDealtDecrease') +
        damageModifier(battle.enemy, 'damageTakenIncrease', 'damageTakenDecrease'))))
      : modifiedDamage(player, battle.enemy, playerBase + (itemMove ? 0 : roll.unit * 3),
        battle.tagRules, skill);
    const costLabel = cost.spirit || cost.sanity || cost.humanity || cost.hp || cost.agility
      ? `（活${cost.hp}/敏${cost.agility}/灵${cost.spirit}/理${cost.sanity}/人${cost.humanity}）`
      : '';
    if (healing) {
      const tagHealing = battleTags?.modifier(player, player, skill, battle.tagRules?.healing) || 0;
      const healed = Math.max(0, Math.round(healing * (1 + tagHealing)));
      const healStat = itemMove?.healStat || scroll?.statName || ability?.healType || '活力';
      const key = ({ 活力: 'hp', 灵性: 'spirit', 理智: 'sanity', 人性: 'humanity' })[healStat] || 'hp';
      const maximum = ({ hp: 'maxHp', spirit: 'maxSpirit', sanity: 'maxSanity',
        humanity: 'maxHumanity' })[key];
      if (healStat === '敏捷') {
        player.agility += healed;
        next.stat_data.当前敏捷 = Math.max(0, Math.round(player.agility / (player.territory?.multiplier || 1)));
        pushLog(battle, 'player', `${player.name} 使用「${label}」${costLabel}，恢复 ${healed} 点敏捷。`);
      } else {
        const before = player[key];
        player[key] = Math.min(player[maximum], player[key] + healed);
        pushLog(battle, 'player', `${player.name} 使用「${label}」${costLabel}，恢复 ${player[key] - before} 点${healStat}。`);
      }
    } else if (support) {
      pushLog(battle, 'player', `${player.name} 施展「${label}」${costLabel}。`);
    } else if (!hit) {
      pushLog(battle, 'player', `${player.name} 使用「${label}」${costLabel}，未命中（${Math.round(hitChance * 100)}%）。`);
    } else {
      const dealt = directHit(battle, 'enemy', playerDamage);
      pushLog(battle, 'player', `${player.name} 使用「${label}」${costLabel}，造成 ${dealt} 点伤害。`, dealt);
    }
    (hit ? effects : []).forEach(effect => {
      const target = effect.effectTarget === 'self' || effect.effectTarget === 'allAlly' ? 'player'
        : effect.effectTarget === 'all' ? 'enemy'
          : effect.effectTarget === 'target' ? (selfTarget || healing ? 'player' : 'enemy')
          : selfTarget || healing ? 'player' : 'enemy';
      const modifier = effect.type === 'buff' || effect.type === 'debuff';
      const rawPower = !modifier && effect.valueType === 'percentage'
        ? Math.floor(battle[target].maxHp * effect.power / 100) : effect.power;
      const power = Math.max(0, Math.round(rawPower));
      if (power > 0) storeEffect(battle, target, {
        name: effect.name, type: effect.type, power, duration: effect.duration,
        ...(!modifier ? { stat: effect.stat } : {}),
        ...(modifier
          ? { stat: effect.stat, valueType: effect.valueType, appliedAtTurn: battle.turns } : {}),
      });
    });
    battleTags?.applySkill(player, selfTarget || healing ? player : battle.enemy, skill, hit);
    player.moveMax = movementOf(player);
    battle.enemy.moveMax = movementOf(battle.enemy);
    if (battle.enemy.hp <= 0) {
      finish(battle, 'victory', `${battle.enemy.name} 失去战斗能力。`);
      updateStatFromPlayer(next, player);
      return { ok: true, data: next, battle: copy(battle) };
    }

    resolveEnemyTurn(battle);
    for (const loss of battle.pictureLosses || []) modules['cryptLord.shamanPicture']?.removeLoss(next, loss.id);
    updateStatFromPlayer(next, player);
    return { ok: true, data: next, battle: copy(battle) };
  }

  function move(data, x, y) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active') return { ok: false, error: '当前没有进行中的个人战斗。', data: next };
    ensureBoardState(battle);
    if (battle.currentTurn !== 'player') return { ok: false, error: '当前不是玩家行动回合。', data: next };
    const result = moveActor(battle, 'player', Number(x), Number(y));
    if (!result.ok) return { ok: false, error: result.error, data: next };
    if (result.cost > 0) pushLog(battle, 'player', `${battle.player.name} 移动至 (${battle.player.x}, ${battle.player.y})，消耗 ${result.cost} 点移动。`);
    if (battle.player.hp <= 0) finish(battle, 'defeat', `${battle.player.name} 倒在危险地形中。`);
    updateStatFromPlayer(next, battle.player);
    return { ok: true, data: next, battle: copy(battle) };
  }

  function paintTerrain(data, x, y, terrainId, rounds) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active') return { ok: false, error: '当前没有进行中的个人战斗。', data: next };
    ensureBoardState(battle);
    if (!inBounds(battle.board, x, y)) return { ok: false, error: '目标坐标不在棋盘内。', data: next };
    const preset = terrainPresets?.option(terrainId);
    if (!TERRAIN[terrainId] && !preset) return { ok: false, error: '未知地形类型。', data: next };
    if (preset?.tier > 2) return { ok: false, error: '此地形不可人工铺设。', data: next };
    const key = terrainKey(x, y);
    if (terrainId === 'plain') {
      delete battle.board.terrain[key];
      delete battle.board.terrainDuration[key];
      delete battle.board.terrainStrength[key];
      delete battle.board.terrainSpec[key];
    } else {
      const duration = rounds == null ? (preset ? 3 : terrainId === 'fire' ? 3 : 0) : Number(rounds);
      if (!Number.isInteger(duration) || duration < 0 || duration > (preset ? 3 : 9))
        return { ok: false, error: preset ? '危险地形人工铺设限 0 至 3 回合。' : '地形存在回合须为 0 至 9 的整数（0 为永久）。', data: next };
      battle.board.terrain[key] = terrainId;
      if (duration) battle.board.terrainDuration[key] = duration;
      else delete battle.board.terrainDuration[key];
      if (preset) battle.board.terrainStrength[key] = battle.player.rank;
      else delete battle.board.terrainStrength[key];
      delete battle.board.terrainSpec[key];
    }
    pushLog(battle, 'system', `${terrainId === 'plain' ? '清除了' : `铺设了${(TERRAIN[terrainId] || preset).name}`}坐标 (${x}, ${y}) 的地形。`);
    return { ok: true, data: next, battle: copy(battle) };
  }

  function applyEffect(data, target, type, power, duration, stat = 'attack', valueType = 'fixed') {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active') return { ok: false, error: '当前没有进行中的个人战斗。', data: next };
    const modifier = type === 'buff' || type === 'debuff';
    if (!['player', 'enemy', ...(battle.picture ? ['picture'] : [])].includes(target) ||
      !['poison', 'regen', 'buff', 'debuff'].includes(type)
      || !Number.isInteger(Number(power)) || Number(power) < 1 || Number(power) > 100
      || !Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 9
      || (modifier && (!MODIFIER_STATS.includes(stat)
        || !['fixed', 'percentage'].includes(valueType)
        || (!['attack', 'defense'].includes(stat) && valueType !== 'percentage')))) {
      return { ok: false, error: '效果目标、类型或数值无效。', data: next };
    }
    ensureBoardState(battle);
    const name = type === 'poison' ? '持续伤害' : type === 'regen' ? '持续恢复'
      : `${type === 'buff' ? '增益' : '减益'}·${stat}`;
    storeEffect(battle, target, {
      type, name, power: Number(power), duration: Number(duration),
      ...(modifier ? { stat, valueType, appliedAtTurn: battle.turns } : {}),
    });
    return { ok: true, data: next, battle: copy(battle) };
  }

  function removeEffect(data, target, name) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active' ||
      !['player', 'enemy', ...(battle.picture ? ['picture'] : [])].includes(target)) {
      return { ok: false, error: '当前没有可操作的战斗效果。', data: next };
    }
    ensureBoardState(battle);
    const index = battle[target].effects.findIndex(effect => effect.name === name);
    if (index < 0) return { ok: false, error: '效果已变化，请重新打开战斗系统。', data: next };
    if (battle[target].effects[index].environment) return { ok: false, error: '自然环境效果只能随环境变化，不可单独移除。', data: next };
    const [effect] = battle[target].effects.splice(index, 1);
    pushLog(battle, 'system', `${battle[target].name} 的「${effect.name}」已被移除。`);
    return { ok: true, data: next, battle: copy(battle) };
  }

  function abilities(data) {
    return flattenAbilities(data).map(({ group, index, ability }) => ({
      group,
      index,
      name: text(ability.名称),
      description: text(ability.描述),
      type: text(ability.类型, '非凡能力'),
      power: powerOf(ability),
      healing: healingOf(ability),
      healStat: text(ability.healType, '活力'),
      range: ability.range ?? ability.射程 ?? ability.攻击距离 ?? 10,
      selfTarget: ['self', 'ally', 'allAlly'].includes(text(ability.targetType)),
      cost: costOf(ability),
      effects: abilityEffects(ability).map(effect => ({ ...effect })),
    }));
  }

  function setAutoPilot(data, on) {
    const next = copy(data || {});
    const battle = next?.cryptLord?.personalBattle;
    if (!record(battle) || battle.status !== 'active')
      return { ok: false, error: '当前没有进行中的个人战斗。', data: next };
    battle.autoPilot = { on: Boolean(on) };
    pushLog(battle, 'system', on ? '个人战斗托管已开启。' : '个人战斗托管已关闭。');
    return { ok: true, data: next, battle: copy(battle) };
  }

  function autoPilotAction(data) {
    const battle = get(data);
    if (!battle || battle.status !== 'active' || !battle.autoPilot?.on ||
      battle.currentTurn !== 'player') return null;
    if (battle.canon?.exile) return { type: 'wait' };
    const player = battle.player;
    const distanceToEnemy = Math.max(Math.abs(player.x - battle.enemy.x), Math.abs(player.y - battle.enemy.y));
    const affordable = cost => player.spirit >= (cost?.spirit || 0) &&
      player.sanity >= (cost?.sanity || 0) && player.humanity >= (cost?.humanity || 0) &&
      player.hp > (cost?.hp || 0) && player.agility >= (cost?.agility || 0);
    const missing = player.maxHp - player.hp;
    const healing = [
      ...abilities(data).filter(row => row.healing > 0 && row.healStat === '活力')
        .map(row => ({ action: { type: 'ability', group: row.group, index: row.index },
          value: row.healing, cost: row.cost })),
      ...weaponMoves(data).filter(row => row.healing > 0 && row.healStat === '活力')
        .map(row => ({ action: { type: 'weapon', key: row.key }, value: row.healing,
          cost: { spirit: row.cost } })),
      ...auxiliaryMoves(data).filter(row => row.healing > 0 && row.healStat === '活力')
        .map(row => ({ action: { type: 'auxiliary', key: row.key }, value: row.healing,
          cost: { spirit: row.cost } })),
      ...scrollMoves(data).filter(row => row.healing && row.statName === '活力')
        .map(row => ({ action: { type: 'scroll', key: row.key }, value: row.healAmt,
          cost: { spirit: row.cost } })),
      ...consumableMoves(data).filter(row => !row.isScroll && row.healing && row.statName === '活力')
        .map(row => ({ action: { type: 'consumable', key: row.key }, value: row.healAmt,
          cost: { spirit: row.cost } })),
    ].filter(row => affordable(row.cost)).sort((a, b) => b.value - a.value);
    if (player.hp <= player.maxHp * .4 && missing > 0 && healing.length)
      return healing[0].action;
    const attacks = [
      { action: { type: 'basic' }, value: 3 + player.agility * .18, range: 1 },
      ...abilities(data).filter(row => !row.healing && !row.selfTarget && row.power > 0)
        .map(row => ({ action: { type: 'ability', group: row.group, index: row.index },
          value: row.power, range: row.range, cost: row.cost })),
      ...weaponMoves(data).filter(row => !row.healing)
        .map(row => ({ action: { type: 'weapon', key: row.key }, value: row.damage,
          range: row.range, cost: { spirit: row.cost } })),
      ...auxiliaryMoves(data).filter(row => !row.healing)
        .map(row => ({ action: { type: 'auxiliary', key: row.key }, value: row.damage,
          range: row.range, cost: { spirit: row.cost } })),
      ...scrollMoves(data).filter(row => !row.healing)
        .map(row => ({ action: { type: 'scroll', key: row.key }, value: row.power,
          range: row.range, cost: { spirit: row.cost } })),
      ...consumableMoves(data).filter(row => !row.isScroll && !row.healing)
        .map(row => ({ action: { type: 'consumable', key: row.key }, value: row.power,
          range: row.range, cost: { spirit: row.cost } })),
    ].filter(row => affordable(row.cost) && row.value > 0);
    const inRange = attacks.filter(row => distanceToEnemy <=
      (row.range === 'global' ? Infinity : Math.max(1, integer(row.range, 10))))
      .sort((a, b) => b.value - a.value);
    if (inRange.length) return inRange[0].action;
    const cells = api.reachable(data).filter(cell => cell.cost > 0 &&
      !(cell.x === player.x && cell.y === player.y) &&
      Math.max(Math.abs(cell.x - battle.enemy.x), Math.abs(cell.y - battle.enemy.y)) < distanceToEnemy &&
      !terrainOf(battle, cell.x, cell.y).blocked);
    const safe = cells.filter(cell => !terrainOf(battle, cell.x, cell.y).damage);
    const destinations = safe.length ? safe : cells;
    destinations.sort((a, b) =>
      Math.max(Math.abs(a.x - battle.enemy.x), Math.abs(a.y - battle.enemy.y)) -
        Math.max(Math.abs(b.x - battle.enemy.x), Math.abs(b.y - battle.enemy.y)) ||
      a.cost - b.cost);
    return destinations.length ? { type: 'move', x: destinations[0].x, y: destinations[0].y }
      : { type: 'wait' };
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, model: 'native-assistant-floor-data' }); },
    get,
    start,
    experiencePreview,
    settleExperience,
    act,
    setAutoPilot,
    autoPilotAction,
    canonOptions,
    useCanon,
    summonPicture,
    move,
    reachable(data) {
      const battle = get(data);
      return battle?.status === 'active' ? reachableCells(battle, 'player').map(cell => ({ ...cell })) : [];
    },
    terrainAt(data, x, y) {
      const battle = get(data);
      return { ...terrainOf(battle, Number(x), Number(y)) };
    },
    terrainOptions() { return [...Object.values(TERRAIN).map(terrain => ({ ...terrain })),
      ...(terrainPresets?.options() || []).filter(terrain => terrain.tier <= 2)]; },
    paintTerrain,
    applyEffect,
    removeEffect,
    abilities,
    scrollMoves,
    consumableMoves,
    weaponMoves,
    weaponHitChance,
    auxiliaryMoves,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
