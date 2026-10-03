(() => {
  'use strict';
  const KEY = 'cryptLord.savantEnhancement';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract || !modules['cryptLord.savantMaterial']) throw new Error('装备强化依赖材料加工模块');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const material = modules['cryptLord.savantMaterial'];
  const RARITIES = Object.freeze(['普通', '精良', '稀有', '史诗', '传说', '神话']);
  const MULT = Object.freeze([1, 1.2, 1.5, 1.9, 2.4, 3]);
  const WEIGHTS = Object.freeze({
    普通: [90, 10, 0, 0, 0, 0], 序列9: [75, 23, 2, 0, 0, 0],
    序列8: [60, 32, 8, 0, 0, 0], 序列7: [45, 38, 15, 2, 0, 0],
    序列6: [32, 38, 24, 6, 0, 0], 序列5: [20, 32, 32, 14, 2, 0],
    序列4: [12, 25, 36, 22, 5, 0], 序列3: [6, 18, 32, 30, 12, 2],
    序列2: [3, 10, 27, 34, 21, 5], 序列1: [1, 5, 19, 34, 31, 10],
    序列0: [0, 2, 12, 28, 38, 20], 旧日: [0, 0, 5, 18, 42, 35],
    支柱: [0, 0, 2, 8, 35, 55],
  });
  const ROLES = ['', '主质增幅', '副质增幅', '辅质增幅', '双相增幅', '均衡矩阵',
    '极化核心', '偏置回路', '超载框架'];
  const MIN_RARITY = ['', '普通', '普通', '普通', '精良', '精良', '稀有',
    '稀有', '史诗', '稀有', '史诗', '传说', '神话'];
  const STATS = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];
  const EQUIPMENT = ['武器列表', '衣物列表', '饰品列表', '封印物列表'];
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => structuredClone(value);
  const round = value => Number(Number(value).toFixed(6));
  const weapon = (name, ratios, up, down, extraordinary) => ({
    name, ratios, mundane: { up, down }, extraordinary,
  });
  const production = (name, ratios, type, value) => ({ name, ratios, type, value });
  const META = Object.freeze({
    金属: { slug: 'metal', prefix: '锻钢', stats: ['活力', '敏捷', '灵性', '人性'],
      weapons: [
        weapon('精密膛线', { 活力: 6, 敏捷: 4 }, { 精度: 1 }, {}, { attackBase: '物理攻击' }),
        weapon('增压击锤', { 敏捷: 6, 灵性: 4 }, { 威力量级: 1 }, {}, { extra: '攻击BUFF' })],
      productions: [
        production('标准化工装', { 活力: 6, 灵性: 4 }, 'craftDiscount', .08),
        production('耐久修复架', { 敏捷: 6, 灵性: 4 }, 'repairBonus', .12)] },
    木质: { slug: 'wood', prefix: '年轮', stats: ['活力', '人性', '敏捷', '理智'],
      weapons: [
        weapon('弹性校准架', { 活力: 6, 人性: 4 }, { 精度: 1 }, {}, { extra: '速度BUFF' }),
        weapon('延伸导轨', { 人性: 6, 敏捷: 4 }, { 射程: 1 }, {}, { scope: '全体' })],
      productions: [
        production('回收导槽', { 活力: 6, 敏捷: 4 }, 'yieldBonus', .1),
        production('自愈工台', { 人性: 6, 敏捷: 4 }, 'repairBonus', .12)] },
    岩石: { slug: 'rock', prefix: '磐岩', stats: ['活力', '理智', '人性', '敏捷'],
      weapons: [
        weapon('重压配重', { 活力: 6, 理智: 4 }, { 威力量级: 1 }, {}, { attackBase: '物理攻击' }),
        weapon('震波扩散器', { 理智: 6, 人性: 4 }, { AOE: 1 }, { 精度: 1 },
          { scope: '全体', extra: '防御DEBUFF' })],
      productions: [
        production('定量砧座', { 活力: 6, 人性: 4 }, 'craftDiscount', .08),
        production('稳固维修座', { 理智: 6, 人性: 4 }, 'repairBonus', .12)] },
    晶体: { slug: 'crystal', prefix: '棱晶', stats: ['灵性', '理智', '运气', '活力'],
      weapons: [
        weapon('术式折射镜', { 灵性: 6, 理智: 4 }, { 精度: 1 }, {}, { attackBase: '法术攻击' }),
        weapon('命运分光器', { 理智: 6, 运气: 4 }, { 射程: 1 }, {}, { attackBase: '命运攻击' })],
      productions: [
        production('误差校准阵', { 灵性: 6, 运气: 4 }, 'successBonus', 4),
        production('纯化折射阵', { 理智: 6, 运气: 4 }, 'yieldBonus', .1)] },
    纤维: { slug: 'fiber', prefix: '灵织', stats: ['敏捷', '活力', '运气', '灵性'],
      weapons: [
        weapon('稳定束带', { 敏捷: 6, 活力: 4 }, { 精度: 1 }, {}, { extra: '速度BUFF' }),
        weapon('远距导索', { 活力: 6, 运气: 4 }, { 射程: 1 }, { 威力量级: 1 },
          { scope: '全体', extra: '速度DEBUFF' })],
      productions: [
        production('无损包覆层', { 敏捷: 6, 运气: 4 }, 'craftDiscount', .08),
        production('精细过滤网', { 活力: 6, 运气: 4 }, 'yieldBonus', .1)] },
    生物: { slug: 'bio', prefix: '活体', stats: ['活力', '敏捷', '人性', '理智'],
      weapons: [
        weapon('神经瞄具', { 活力: 6, 敏捷: 4 }, { 精度: 1 }, {}, { extra: '速度BUFF' }),
        weapon('再生导管', { 敏捷: 6, 人性: 4 }, { 威力量级: 1 }, {},
          { healBase: '活力恢复', extra: '防御BUFF' })],
      productions: [
        production('再生修复腔', { 活力: 6, 人性: 4 }, 'repairBonus', .12),
        production('增殖培养囊', { 敏捷: 6, 人性: 4 }, 'yieldBonus', .1)] },
    化学: { slug: 'chemical', prefix: '炼剂', stats: ['敏捷', '灵性', '活力', '人性'],
      weapons: [
        weapon('爆压药室', { 敏捷: 6, 灵性: 4 }, { 威力量级: 1 }, { 精度: 1 },
          { attackBase: '物理攻击', extra: '攻击BUFF' }),
        weapon('扩散喷口', { 灵性: 6, 活力: 4 }, { AOE: 1 }, {},
          { scope: '全体', extra: '攻击DEBUFF' })],
      productions: [
        production('催化控制阀', { 敏捷: 6, 活力: 4 }, 'successBonus', 4),
        production('高效萃取槽', { 灵性: 6, 活力: 4 }, 'yieldBonus', .1)] },
    灵性: { slug: 'spiritual', prefix: '魂印', stats: ['灵性', '人性', '运气', '理智'],
      weapons: [
        weapon('心智转频器', { 灵性: 6, 人性: 4 }, { 精度: 1 }, {}, { attackBase: '精神攻击' }),
        weapon('命运刻写器', { 人性: 6, 运气: 4 }, { 射程: 1 }, {},
          { attackBase: '命运攻击', extra: '攻击DEBUFF' })],
      productions: [
        production('稳定仪轨', { 灵性: 6, 运气: 4 }, 'successBonus', 4),
        production('低耗刻写阵', { 人性: 6, 运气: 4 }, 'craftDiscount', .08)] },
  });
  function generic(stats, role) {
    const [a, b, c, cost] = stats;
    return ({
      1: { [a]: 12 }, 2: { [b]: 12 }, 3: { [c]: 12 },
      4: { [a]: 8, [b]: 8 }, 5: { [a]: 7, [b]: 7, [c]: 7 },
      6: { [a]: 16, [cost]: -5 }, 7: { [a]: 12, [b]: 10, [cost]: -6 },
      8: { [a]: 18, [b]: 8, [c]: 6, [cost]: -10 },
    })[role] || {};
  }
  const CONFIG = Object.freeze(Object.fromEntries(Object.entries(META).map(([family, meta]) => [
    family, Object.freeze(Array.from({ length: 12 }, (_, i) => {
      const role = i + 1;
      const spec = role === 9 || role === 10 ? meta.weapons[role - 9]
        : role >= 11 ? meta.productions[role - 11] : null;
      return Object.freeze({
        id: `${meta.slug}-${role}`, family,
        name: `${meta.prefix}·${spec?.name || ROLES[role]}`,
        minRarity: MIN_RARITY[role], ratios: spec?.ratios || generic(meta.stats, role),
        weapon: role === 9 || role === 10
          ? { mundane: spec.mundane, extraordinary: spec.extraordinary } : null,
        production: role >= 11 ? { type: spec.type, value: spec.value } : null,
      });
    })),
  ])));
  function store(data, create = false) {
    const stat = data?.stat_data;
    if (!record(stat)) return null;
    if (create) {
      stat.$专属玩法 ||= {};
      stat.$专属玩法.通识者途径 ||= {};
      stat.$专属玩法.通识者途径.装备强化玩法 ||= {
        版本: 1, 模块仓库: {}, 抽取统计: { 周期抽数: 0, 周期材料总分: 0, 总抽数: 0 },
      };
    }
    return stat.$专属玩法?.通识者途径?.装备强化玩法 || null;
  }
  function bag(data) { return store(data)?.模块仓库 || {}; }
  function modulesOf(data) {
    return Object.entries(bag(data)).filter(([id, value]) => id !== '$meta' && record(value))
      .map(([id, value]) => ({ id, ...value }));
  }
  function equipment(data) {
    return EQUIPMENT.flatMap(listKey => Object.entries(data?.stat_data?.[listKey] || {})
      .filter(([key, item]) => key !== '$meta' && record(item))
      .map(([itemKey, item]) => ({ listKey, itemKey, item,
        name: String(item.名称 || item.name || itemKey) })));
  }
  function itemAt(data, listKey, itemKey) {
    if (!EQUIPMENT.includes(listKey) || itemKey === '$meta') return null;
    const item = data?.stat_data?.[listKey]?.[itemKey];
    return record(item) ? item : null;
  }
  function gradeScore(grade) {
    const rank = material.rankOf(grade);
    return rank === null ? 0 : rank === -2 ? 12 : rank === -1 ? 11 : Math.max(0, 10 - rank);
  }
  function pityFloor(score) {
    return score >= 10 ? 5 : score >= 7 ? 4 : score >= 5 ? 3 : score >= 2 ? 2 : 1;
  }
  function randomUnit() {
    const values = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(values);
      return values[0] / 4294967296;
    }
    return Math.random();
  }
  function guard(data) {
    if (data?.cryptLord?.personalBattle?.status === 'active')
      throw new Error('战斗中不能抽取、安装或卸下强化模块');
    if (!material.gate(data?.stat_data).unlocked) throw new Error('当前没有装备强化资格');
  }
  function draw(data, signature, qty, random = randomUnit, ids = []) {
    guard(data);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new Error('抽取数量须为1至100');
    const next = clone(data);
    const group = material.groups(next).find(row => row.signature === signature);
    if (!group || !CONFIG[group.family] || Math.floor(group.qty + 1e-6) < qty)
      throw new Error('加工材料已变化或数量不足');
    const play = store(next, true);
    play.模块仓库 ||= {};
    play.抽取统计 ||= { 周期抽数: 0, 周期材料总分: 0, 总抽数: 0 };
    const pity = play.抽取统计;
    const results = [];
    for (let i = 0; i < qty; i++) {
      const id = ids[i] || `enhance-${Date.now().toString(36)}-${Math.floor(random() * 0xFFFFFFFF).toString(36)}-${i}`;
      if (Object.hasOwn(play.模块仓库, id)) throw new Error('模块 ID 冲突');
      pity.周期抽数 = Math.max(0, Math.floor(Number(pity.周期抽数) || 0)) + 1;
      pity.周期材料总分 = (Number(pity.周期材料总分) || 0) + gradeScore(group.grade);
      pity.总抽数 = Math.max(0, Math.floor(Number(pity.总抽数) || 0)) + 1;
      const guaranteed = pity.周期抽数 >= 20;
      const floor = guaranteed ? pityFloor(pity.周期材料总分 / pity.周期抽数) : 0;
      const weights = (WEIGHTS[group.grade] || WEIGHTS.普通).map((value, index) => index >= floor ? value : 0);
      let roll = random() * weights.reduce((sum, value) => sum + value, 0);
      let rarityIndex = weights.findIndex(value => (roll -= value) < 0);
      if (rarityIndex < 0) rarityIndex = floor;
      const candidates = CONFIG[group.family].filter(spec =>
        RARITIES.indexOf(spec.minRarity) <= rarityIndex);
      const spec = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
      const multiplier = MULT[rarityIndex];
      const rec = {
        名称: spec.name, 模板ID: spec.id, 品质: RARITIES[rarityIndex],
        材质族: group.family, 来源材料: group.material, 材料等级: group.grade,
        六维比例: Object.fromEntries(Object.entries(spec.ratios).map(([key, value]) =>
          [key, round(value * multiplier)])),
        武器效果: spec.weapon ? clone(spec.weapon) : null,
        生产增益: spec.production ? { type: spec.production.type,
          value: round(spec.production.value * multiplier) } : null,
        卸下次数: 0, 安装位置: null, $抽取时间: new Date().toISOString(), $保底抽取: guaranteed,
      };
      play.模块仓库[id] = rec;
      results.push({ id, ...rec });
      if (guaranteed) { pity.周期抽数 = 0; pity.周期材料总分 = 0; }
    }
    material.consume(next, signature, qty);
    return { data: next, results };
  }
  function install(data, id, listKey, itemKey) {
    guard(data);
    const next = clone(data);
    const rec = bag(next)[id];
    const item = itemAt(next, listKey, itemKey);
    if (!record(rec) || rec.安装位置 || !item || item.$强化模块安装?.模块ID)
      throw new Error('模块或目标装备状态已变化');
    const deltas = {};
    for (const key of STATS) {
      const base = Number(item[key]) || 0;
      const ratio = Number(rec.六维比例?.[key]) || 0;
      const amount = base && ratio ? Math.max(1, Math.round(Math.abs(base * ratio) / 100)) : 0;
      deltas[key] = Math.sign(ratio) * amount;
      if (deltas[key]) item[key] = base + deltas[key];
    }
    item.$强化模块安装 = { 模块ID: id, 属性增量: deltas };
    rec.安装位置 = { 列表键: listKey, 物品键: itemKey,
      装备名称: String(item.名称 || item.name || itemKey) };
    return next;
  }
  function detachRisk(count) {
    return count <= 3 ? 0 : Math.min(95, 20 + (count - 4) * 15);
  }
  function detach(data, id, random = randomUnit) {
    guard(data);
    const next = clone(data);
    const rec = bag(next)[id];
    if (!record(rec?.安装位置)) throw new Error('模块未安装');
    const item = itemAt(next, rec.安装位置.列表键, rec.安装位置.物品键);
    if (!item || item.$强化模块安装?.模块ID !== id) throw new Error('宿主与模块关系已变化');
    const count = Math.max(0, Math.floor(Number(rec.卸下次数) || 0)) + 1;
    for (const key of STATS) {
      const delta = Number(item.$强化模块安装.属性增量?.[key]) || 0;
      if (delta) item[key] = (Number(item[key]) || 0) - delta;
    }
    delete item.$强化模块安装;
    const broken = random() * 100 < detachRisk(count);
    if (broken) delete bag(next)[id];
    else { rec.卸下次数 = count; rec.安装位置 = null; }
    return { data: next, broken, risk: detachRisk(count) };
  }
  function reconcile(data) {
    const next = clone(data);
    const records = bag(next);
    let changed = false;
    for (const [id, rec] of Object.entries(records)) {
      if (id === '$meta' || !record(rec?.安装位置)) continue;
      const item = itemAt(next, rec.安装位置.列表键, rec.安装位置.物品键);
      if (item?.$强化模块安装?.模块ID !== id) { delete records[id]; changed = true; }
    }
    for (const row of equipment(next)) {
      const install = row.item.$强化模块安装;
      if (!install?.模块ID) continue;
      const pos = records[install.模块ID]?.安装位置;
      if (pos?.列表键 === row.listKey && pos?.物品键 === row.itemKey) continue;
      for (const key of STATS) {
        const delta = Number(install.属性增量?.[key]) || 0;
        if (delta) row.item[key] = (Number(row.item[key]) || 0) - delta;
      }
      delete row.item.$强化模块安装;
      changed = true;
    }
    return { data: next, changed };
  }
  function productionBonuses(data) {
    const best = { successBonus: 0, yieldBonus: 0, craftDiscount: 0, repairBonus: 0 };
    for (const row of equipment(data)) {
      if (row.listKey === '武器列表' || row.item.isEquipped !== true) continue;
      const id = row.item.$强化模块安装?.模块ID;
      const rec = id && bag(data)[id];
      if (!rec || rec.安装位置?.列表键 !== row.listKey ||
        rec.安装位置?.物品键 !== row.itemKey) continue;
      const bonus = rec.生产增益;
      if (bonus && Object.hasOwn(best, bonus.type))
        best[bonus.type] = Math.max(best[bonus.type], Number(bonus.value) || 0);
    }
    best.successBonus = Math.min(12, best.successBonus);
    best.yieldBonus = Math.min(.3, best.yieldBonus);
    best.craftDiscount = Math.min(.24, best.craftDiscount);
    best.repairBonus = Math.min(.36, best.repairBonus);
    return best;
  }
  function resolveWeapon(item, data, listKey, itemKey) {
    const id = item?.$强化模块安装?.模块ID;
    const rec = id && bag(data)[id];
    if (!rec?.武器效果 || rec.安装位置?.列表键 !== listKey ||
      rec.安装位置?.物品键 !== itemKey || listKey !== '武器列表') return item;
    const out = clone(item);
    const battle = out.战斗效果;
    const spec = rec.武器效果.extraordinary;
    const attacks = ['物理攻击', '法术攻击', '精神攻击', '命运攻击'];
    const heals = ['活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复'];
    if (record(battle) && (attacks.includes(battle.基础效果) || heals.includes(battle.基础效果))) {
      if (spec.attackBase && attacks.includes(battle.基础效果)) battle.基础效果 = spec.attackBase;
      if (spec.healBase && heals.includes(battle.基础效果)) battle.基础效果 = spec.healBase;
      if (spec.extra) battle.额外效果 = spec.extra;
      if (spec.scope) battle.范围 = spec.scope;
      return out;
    }
    const vocabulary = {
      威力量级: ['棍棒级', '砍刀级', '手枪级', '重型手枪级', '步枪级', '狙击枪级', '炸弹级'],
      精度: ['近战无精度', '霰弹枪级', '手枪级', '步枪级', '狙击枪级'],
      射程: ['近战', '中距离', '远程', '极远'],
      AOE: ['无AOE', '霰弹枪级', '手雷级'],
    };
    const classification = out.$战斗分类;
    if (record(classification) && Object.entries(vocabulary).every(([key, values]) =>
      values.includes(classification[key]))) {
      const positive = RARITIES.indexOf(rec.品质) >= 4 ? 2
        : RARITIES.indexOf(rec.品质) >= 2 ? 1 : 0;
      for (const [direction, changes] of [[positive, rec.武器效果.mundane?.up],
        [-1, rec.武器效果.mundane?.down]]) {
        for (const [key, raw] of Object.entries(changes || {})) {
          if (key === '精度' && classification.精度 === '近战无精度') continue;
          const values = vocabulary[key];
          if (!values) continue;
          const index = values.indexOf(classification[key]);
          const offset = direction > 0 ? direction * Math.max(1, Math.floor(Number(raw) || 1))
            : direction * Math.max(1, Math.floor(Number(raw) || 1));
          classification[key] = values[Math.max(0, Math.min(values.length - 1, index + offset))];
        }
      }
    }
    return out;
  }
  const api = Object.freeze({
    status: () => ({ ready: true, key: KEY }),
    RARITIES, WEIGHTS, CONFIG, store, modulesOf, equipment, gradeScore, pityFloor,
    draw, install, detach, detachRisk, reconcile, productionBonuses, resolveWeapon,
    discountedQty(data, qty) {
      const raw = Math.max(0, Number(qty) || 0);
      return raw ? Math.max(1, Math.round(raw * (1 - productionBonuses(data).craftDiscount))) : 0;
    },
    repairMultiplier(data) { return 1 + productionBonuses(data).repairBonus; },
    dispose() { contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
