(() => {
  'use strict';

  const KEY = 'cryptLord.domainState';
  const INDUSTRY_KEY = 'cryptLord.industryState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const industryState = modules[INDUSTRY_KEY];
  if (!industryState) throw new Error(`[${KEY}] core/industry-state.js 尚未加载`);

  const SLOT_KEYS = Object.freeze(['格1', '格2', '格3', '格4', '格5', '格6', '格7', '格8']);
  const BRANCHES = Object.freeze(['陆军', '海军', '空军']);
  const GOODS_TYPES = Object.freeze(['农产品', '工业品', '服务']);
  const TIER_EQUIV = Object.freeze([1, 5, 10, 50, 100]);
  const MAX_DOMAIN_LEVEL = 8;
  const MAX_CORE_LEVEL = 3;
  const ROOM0_KEY = '房0';
  const ROOM0_DEFAULT_NAME = '主卧';
  const HOUSING_AFFINITY_PER_WEEK = 5;
  const STEWARD_COST = Object.freeze([0, 1, 2, 4]);
  const STEWARD_MULT = Object.freeze([1, 1.025, 1.05, 1.07, 1.09, 1.11, 1.13, 1.15, 1.175, 1.2, 1.22, 1.24, 1.25]);
  const FLOOR = 10;
  const STORE_KEYS = Object.freeze([
    '1级农产品', '2级农产品', '3级农产品', '4级农产品', '5级农产品',
    '1级工业品', '2级工业品', '3级工业品', '4级工业品', '5级工业品',
    '1级服务', '2级服务', '3级服务', '4级服务', '5级服务',
  ]);
  const FALLBACK_DEMANDS = Object.freeze({
    农产品: Object.freeze({
      '1级': { c1: 2, c2: 2, c3: 5, c4: 0, c5: 0 },
      '2级': { c1: 0.2, c2: 0.5, c3: 4, c4: 8, c5: 0 },
      '3级': { c1: 0, c2: 0, c3: 1, c4: 5, c5: 20 },
      '4级': { c1: 0, c2: 0, c3: 0, c4: 2, c5: 10 },
      '5级': { c1: 0, c2: 0, c3: 0, c4: 0, c5: 3 },
    }),
    工业品: Object.freeze({
      '1级': { c1: 1, c2: 2, c3: 10, c4: 0, c5: 0 },
      '2级': { c1: 0.2, c2: 1, c3: 10, c4: 30, c5: 50 },
      '3级': { c1: 0, c2: 0, c3: 2, c4: 5, c5: 20 },
      '4级': { c1: 0, c2: 0, c3: 0, c4: 1, c5: 5 },
      '5级': { c1: 0, c2: 0, c3: 0, c4: 0, c5: 5 },
    }),
    服务: Object.freeze({
      '1级': { c1: 1, c2: 2, c3: 3, c4: 0, c5: 0 },
      '2级': { c1: 0.4, c2: 1, c3: 3, c4: 2, c5: 0 },
      '3级': { c1: 0, c2: 0, c3: 1, c4: 10, c5: 20 },
      '4级': { c1: 0, c2: 0, c3: 0, c4: 2, c5: 10 },
      '5级': { c1: 0, c2: 0, c3: 0, c4: 0, c5: 10 },
    }),
  });
  const FALLBACK_BUILDINGS = Object.freeze([
    { id: 'field', 主产出: '农产品', 配方: [{ '1级农产品': 15, '2级农产品': 1 }, { '1级农产品': 18, '2级农产品': 2 }, { '1级农产品': 21, '2级农产品': 3 }] },
    { id: 'orchard', 主产出: '农产品', 配方: [{ '1级农产品': 10, '1级服务': 10 }, { '1级农产品': 14, '1级服务': 14 }, { '1级农产品': 18, '1级服务': 18 }] },
    { id: 'hunt', 主产出: '农产品', 配方: [{ '1级农产品': 5, '2级农产品': 3 }, { '1级农产品': 8, '2级农产品': 4 }, { '1级农产品': 6, '2级农产品': 6 }] },
    { id: 'workshop', 主产出: '工业品', 配方: [{ '1级工业品': 15, '2级工业品': 1 }, { '1级工业品': 18, '2级工业品': 2 }, { '1级工业品': 21, '2级工业品': 3 }] },
    { id: 'smithy', 主产出: '工业品', 配方: [{ '1级工业品': 10, '1级农产品': 10 }, { '1级工业品': 14, '1级农产品': 14 }, { '1级工业品': 18, '1级农产品': 18 }] },
    { id: 'mill', 主产出: '工业品', 配方: [{ '1级工业品': 5, '2级工业品': 2, '1级农产品': 5 }, { '1级工业品': 8, '2级工业品': 3, '1级农产品': 5 }, { '1级工业品': 11, '2级工业品': 3, '1级农产品': 10 }] },
    { id: 'market', 主产出: '服务', 配方: [{ '1级服务': 15, '2级服务': 1 }, { '1级服务': 18, '2级服务': 2 }, { '1级服务': 21, '2级服务': 3 }] },
    { id: 'inn', 主产出: '服务', 配方: [{ '1级服务': 10, '1级农产品': 10 }, { '1级服务': 14, '1级农产品': 14 }, { '1级服务': 18, '1级农产品': 18 }] },
    { id: 'clinic', 主产出: '服务', 配方: [{ '1级服务': 5, '2级服务': 2, '1级工业品': 5 }, { '1级服务': 8, '2级服务': 3, '1级工业品': 5 }, { '1级服务': 11, '2级服务': 3, '1级工业品': 10 }] },
    { id: 'depot', 主产出: '服务', 配方: [{ '1级服务': 10, '1级工业品': 10 }, { '1级服务': 14, '1级工业品': 14 }, { '1级服务': 18, '1级工业品': 18 }] },
  ]);

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) {
    if (value === undefined) return undefined;
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }
  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function db() { return window.GameDBManager?.DB || {}; }
  function domainConfig() {
    const configured = db().domainConfig;
    return configured?.stages?.[1] ? configured : modules['cryptLord.domainDefaults']?.config || configured || {};
  }
  function demands() { return db().factionConfig?.productivityDemands || FALLBACK_DEMANDS; }
  function domainOf(data) { return data?.stat_data?.领地; }
  function storeOf(domain) {
    if (!record(domain.物资库)) domain.物资库 = {};
    return domain.物资库;
  }
  function ledgerOf(domain) {
    if (!Array.isArray(domain.$流水)) domain.$流水 = [];
    return domain.$流水;
  }
  function pushLedger(domain, text, kind = '自动') {
    const content = String(text || '').trim();
    if (!content) return;
    ledgerOf(domain).push({ 回合: 0, 日期: '', 类别: kind, 事项: content });
    if (ledgerOf(domain).length > 200) domain.$流水.splice(0, ledgerOf(domain).length - 200);
  }
  function emptySlot() {
    return { 建筑: '', 等级: 0, 开工: false, 施工动作: '', 完工时刻: 0, 总管: '' };
  }
  function emptyWar() {
    return {
      我方布阵: [], 敌方布阵: [], 敌方来源: '',
      最近战报: { 时间: '', 结果: '', 摘要: '' },
    };
  }
  function coreLevelOf(domain) {
    return clamp(Math.floor(number(domain?.核心?.等级, 1)), 1, MAX_CORE_LEVEL);
  }
  function roomCount(domain) {
    const domainLevel = clamp(Math.floor(number(domain?.等级, 1)), 1, MAX_DOMAIN_LEVEL);
    return 2 * domainLevel + coreLevelOf(domain) - 1;
  }
  function roomsOf(domain) {
    if (!record(domain?.核心)) return {};
    if (!record(domain.核心.房间)) domain.核心.房间 = {};
    return domain.核心.房间;
  }
  function ensureRooms(domain) {
    if (!record(domain?.核心)) return domain;
    const core = domain.核心;
    core.等级 = coreLevelOf(domain);
    if (core.施工动作 !== '1→2' && core.施工动作 !== '2→3') core.施工动作 = '';
    core.完工时刻 = Math.max(0, number(core.完工时刻));
    const rooms = roomsOf(domain);
    if (!record(rooms[ROOM0_KEY])) rooms[ROOM0_KEY] = { 名称: ROOM0_DEFAULT_NAME, 住客: '', 常住: true };
    if (!String(rooms[ROOM0_KEY].名称 || '').trim()) rooms[ROOM0_KEY].名称 = ROOM0_DEFAULT_NAME;
    if (rooms[ROOM0_KEY].住客 == null) rooms[ROOM0_KEY].住客 = '';
    rooms[ROOM0_KEY].常住 = true;
    let maxExisting = 0;
    Object.keys(rooms).forEach(key => {
      const match = /^房(\d+)$/.exec(key);
      if (match) maxExisting = Math.max(maxExisting, Number(match[1]) || 0);
    });
    const target = Math.max(roomCount(domain), maxExisting);
    for (let index = 1; index <= target; index += 1) {
      const key = `房${index}`;
      if (!record(rooms[key])) rooms[key] = { 名称: key, 住客: '', 常住: true };
      if (!String(rooms[key].名称 || '').trim()) rooms[key].名称 = key;
      if (rooms[key].住客 == null) rooms[key].住客 = '';
      if (typeof rooms[key].常住 !== 'boolean') rooms[key].常住 = true;
    }
    return domain;
  }
  function ensureDomain(domain) {
    if (!record(domain)) return null;
    if (typeof domain.已建立 !== 'boolean') domain.已建立 = Boolean(domain.已建立);
    if (domain.领地名 == null) domain.领地名 = '';
    if (domain.地点 == null) domain.地点 = '';
    domain.线路 = domain.线路 === '市内' ? '市内' : '乡村';
    domain.等级 = clamp(Math.floor(number(domain.等级, 1)), 1, MAX_DOMAIN_LEVEL);
    if (domain.人口 == null || domain.人口 === '') domain.人口 = 0;
    if (!record(domain.待建目标)) domain.待建目标 = { 地点: '', 线路: '乡村' };
    if (domain.待建目标.地点 == null) domain.待建目标.地点 = '';
    domain.待建目标.线路 = domain.待建目标.线路 === '市内' ? '市内' : '乡村';
    if (!record(domain.核心)) domain.核心 = { 名称: '', 等级: 0, 施工动作: '', 完工时刻: 0, 房间: {} };
    if (domain.核心.名称 == null) domain.核心.名称 = '';
    if (domain.核心.等级 == null || domain.核心.等级 === '') domain.核心.等级 = domain.已建立 ? 1 : 0;
    if (domain.核心.施工动作 == null) domain.核心.施工动作 = '';
    if (domain.核心.完工时刻 == null || domain.核心.完工时刻 === '') domain.核心.完工时刻 = 0;
    if (!record(domain.格子)) domain.格子 = {};
    SLOT_KEYS.forEach(key => {
      if (!record(domain.格子[key])) domain.格子[key] = emptySlot();
      const slot = domain.格子[key];
      slot.等级 = Math.max(0, Math.floor(number(slot.等级)));
      slot.开工 = Boolean(slot.开工);
      if (slot.建筑 == null) slot.建筑 = '';
      if (slot.施工动作 == null) slot.施工动作 = '';
      if (slot.完工时刻 == null || slot.完工时刻 === '') slot.完工时刻 = 0;
      if (slot.总管 == null || !slot.建筑) slot.总管 = '';
    });
    if (!record(domain.驻军)) domain.驻军 = {};
    if (!Array.isArray(domain.驻军.散兵)) domain.驻军.散兵 = [];
    if (!Array.isArray(domain.驻军.军队)) domain.驻军.军队 = [];
    if (!Array.isArray(domain.训练队列)) domain.训练队列 = [];
    if (!Array.isArray(domain.出战名单)) domain.出战名单 = [];
    if (!Array.isArray(domain.归零精锐)) domain.归零精锐 = [];
    if (!record(domain.战争)) domain.战争 = emptyWar();
    if (!Array.isArray(domain.战争.我方布阵)) domain.战争.我方布阵 = [];
    if (!Array.isArray(domain.战争.敌方布阵)) domain.战争.敌方布阵 = [];
    if (!record(domain.战争.最近战报)) domain.战争.最近战报 = { 时间: '', 结果: '', 摘要: '' };
    if (!Array.isArray(domain.同级对手)) domain.同级对手 = [];
    if (!record(domain.事务)) domain.事务 = { 上次评定回合: 0, 上次评定时刻: 0, 评定次数: 0, 待办: [] };
    if (!Array.isArray(domain.事务.待办)) domain.事务.待办 = [];
    if (!Array.isArray(domain.$流水)) domain.$流水 = [];
    const store = storeOf(domain);
    STORE_KEYS.forEach(key => { if (store[key] == null) store[key] = 0; });
    if (domain.已建立) {
      const coreName = coreNameOf(domain.线路, domain.等级);
      if (coreName) domain.核心.名称 = coreName;
      ensureRooms(domain);
      ensurePeers(domain);
    }
    return domain;
  }
  function stageConfig(level) {
    return domainConfig().stages?.[Number(level)] || null;
  }
  function coreNameOf(line, level) {
    const table = domainConfig().core || {};
    const normalized = line === '市内' ? '市内' : '乡村';
    if (record(table.合一) && table.合一[Number(level)]) return table.合一[Number(level)];
    const current = table[normalized] ?? table.合一;
    if (typeof current === 'string') return current;
    if (record(current)) return current[Number(level)] || current[String(Number(level))] || '';
    return '';
  }
  function buildingDefs(domain) {
    const config = domainConfig();
    const level = Number(domain?.等级) || 1;
    const line = domain?.线路 === '市内' ? '市内' : '乡村';
    const stage = config.buildingsByStage?.[level];
    if (Array.isArray(stage?.合一)) return stage.合一;
    if (Array.isArray(stage?.[line])) return stage[line];
    return Array.isArray(config.buildings) && config.buildings.length ? config.buildings : FALLBACK_BUILDINGS;
  }
  function buildingLabel(item, line) {
    if (typeof item?.名称 === 'string') return item.名称;
    return item?.名称?.[line === '市内' ? '市内' : '乡村'] || item?.名称?.乡村 || item?.id || '';
  }
  function ladderName(line, level) {
    return domainConfig().ladder?.[line === '市内' ? '市内' : '乡村']?.[Number(level) - 1] || '';
  }
  function buildingOf(domain, id) {
    const current = buildingDefs(domain).find(item => item?.id === id);
    if (current) return current;
    return FALLBACK_BUILDINGS.find(item => item.id === id) || null;
  }
  function recipeOf(domain, slot) {
    const level = Math.floor(number(slot?.等级));
    const building = buildingOf(domain, slot?.建筑);
    return level > 0 && Array.isArray(building?.配方) ? (building.配方[level - 1] || {}) : {};
  }
  function actionIndex(action) {
    return ['新建', '1→2', '2→3'].indexOf(action);
  }
  function actionForSlot(slot) {
    const level = Math.floor(number(slot?.等级));
    if (level <= 0) return '新建';
    if (level === 1) return '1→2';
    if (level === 2) return '2→3';
    return '';
  }
  function slotLabor(slot, domainLevel) {
    const labor = stageConfig(domainLevel)?.用工;
    const level = Math.floor(number(slot?.等级));
    return Array.isArray(labor) && level > 0 ? number(labor[level - 1]) : 0;
  }
  function population(domain) { return Math.max(0, Math.floor(number(domain?.人口))); }
  function usedLabor(domain, skipKey = '') {
    return SLOT_KEYS.reduce((sum, key) => {
      if (key === skipKey) return sum;
      const slot = domain?.格子?.[key];
      return sum + (slot?.开工 ? slotLabor(slot, domain?.等级) : 0);
    }, 0);
  }
  function reconcileSlot(domain, slotKey) {
    const slot = domain?.格子?.[slotKey];
    if (!slot) return;
    if (usedLabor(domain, slotKey) + slotLabor(slot, domain.等级) > population(domain)) slot.开工 = false;
  }
  function goldCost(domainLevel, index) {
    const values = stageConfig(domainLevel)?.金镑;
    return Array.isArray(values) ? number(values[index]) : number(values?.[['新建', '1→2', '2→3'][index]]);
  }
  function durationOf(domainLevel, index) {
    const values = stageConfig(domainLevel)?.工期;
    return Array.isArray(values) ? number(values[index]) : number(values?.[['新建', '1→2', '2→3'][index]]);
  }
  function goodsCost(domainLevel, index, mainType) {
    const table = stageConfig(domainLevel)?.扣货;
    const row = (Array.isArray(table) ? table : table?.[mainType])?.[index];
    if (!record(row) || !GOODS_TYPES.includes(mainType)) return {};
    return Object.fromEntries(Object.entries(row).map(([tier, amount]) => [`${tier}级${mainType}`, number(amount)]));
  }
  function lacksGoods(domain, cost) {
    const store = storeOf(domain);
    return Object.fromEntries(Object.entries(cost || {})
      .map(([key, amount]) => [key, number(amount) - number(store[key])])
      .filter(([, gap]) => gap > 0));
  }
  function applyGoods(domain, goods, sign = 1) {
    const store = storeOf(domain);
    Object.entries(goods || {}).forEach(([key, amount]) => {
      store[key] = number(store[key]) + number(amount) * sign;
    });
    return store;
  }
  function costOf(domain, slot, buildingId = '', opts = {}) {
    const action = actionForSlot(slot);
    const index = actionIndex(action);
    const building = buildingOf(domain, buildingId || slot?.建筑);
    const mainType = building?.主产出 || '农产品';
    const fastBuild = domainConfig().fastBuild || {};
    const multiplier = number(fastBuild.goldMult, 3);
    const fastDuration = number(fastBuild.durationMin, 1440);
    return {
      action,
      index,
      金镑: goldCost(domain?.等级, index) * (opts.fast ? (multiplier > 0 ? multiplier : 3) : 1),
      工期: opts.fast ? (fastDuration > 0 ? fastDuration : 1440) : durationOf(domain?.等级, index),
      扣货: goodsCost(domain?.等级, index, mainType),
    };
  }
  function startConstruction(domain, slotKey, buildingId, nowMin, opts = {}) {
    ensureDomain(domain);
    const slot = domain?.格子?.[slotKey];
    if (!slot) return { ok: false, reason: '地块不存在' };
    if (slot.施工动作) return { ok: false, reason: '该地块正在施工' };
    const id = String(buildingId || slot.建筑 || '').trim();
    const building = buildingOf(domain, id);
    if (!building) return { ok: false, reason: '建筑不存在' };
    if (number(slot.等级) > 0 && slot.建筑 !== id) return { ok: false, reason: '升级不能更换建筑类型' };
    const action = actionForSlot(slot);
    const index = actionIndex(action);
    if (index < 0) return { ok: false, reason: '该建筑已达当前上限' };
    const cost = costOf(domain, slot, id, opts);
    const lack = lacksGoods(domain, cost.扣货);
    if (Object.keys(lack).length) return { ok: false, reason: '物资不足', lack, cost };
    if (usedLabor(domain, slotKey) + slotLabor({ ...slot, 等级: action === '新建' ? 1 : number(slot.等级) }, domain.等级) > population(domain)) {
      return { ok: false, reason: '人口不足，无法投入用工', cost };
    }
    slot.建筑 = id;
    slot.施工动作 = action;
    slot.完工时刻 = number(nowMin) + number(cost.工期);
    if (action === '新建') slot.等级 = 0;
    applyGoods(domain, cost.扣货, -1);
    return { ok: true, slotKey, building: id, ...cost };
  }
  function walletFor(data, cost) {
    const wallet = data?.stat_data?.货币?.鲁恩王国;
    const balance = Number(wallet?.金镑);
    if (!record(wallet) || !Number.isFinite(balance) || balance < 0 || !Number.isFinite(cost) || cost < 0)
      return { ok: false, reason: '金镑钱包或价格无效' };
    if (balance < cost) return { ok: false, reason: `金镑不足，还差 ${cost - balance}` };
    return { ok: true, wallet, balance };
  }
  function beginConstruction(domain, data, slotKey, buildingId, nowMin, opts = {}) {
    if (!domain?.已建立) return { ok: false, reason: '尚未建立领地' };
    const slot = domain.格子?.[slotKey];
    if (!slot || slot.施工动作) return { ok: false, reason: '地块不存在或正在施工' };
    const id = buildingId || slot.建筑;
    if (!buildingDefs(domain).some(item => item.id === id) ||
      (slot.等级 > 0 && slot.建筑 !== id) || !actionForSlot(slot))
      return { ok: false, reason: '建筑或升级目标无效' };
    const cost = costOf(domain, slot, id, opts);
    const funds = walletFor(data, cost.金镑);
    if (!funds.ok) return funds;
    const result = startConstruction(domain, slotKey, id, nowMin, opts);
    if (!result.ok) return result;
    funds.wallet.金镑 = funds.balance - cost.金镑;
    pushLedger(domain, `${result.action === '新建' ? '新建' : '升级'}${buildingLabel(buildingOf(domain, id), domain.线路)}${opts.fast ? '（超凡施工）' : ''}，耗 ${cost.金镑} 金镑、${Math.max(1, Math.round(cost.工期 / 1440))} 天`);
    return result;
  }
  function demolishBuilding(domain, slotKey) {
    const slot = domain?.格子?.[slotKey];
    if (!slot?.建筑 || slot.施工动作) return { ok: false, reason: '空地或施工中不能拆除' };
    pushLedger(domain, `拆除${buildingLabel(buildingOf(domain, slot.建筑), domain.线路) || slot.建筑}（Lv${slot.等级}）`);
    domain.格子[slotKey] = emptySlot();
    return { ok: true };
  }
  function toggleBuilding(domain, slotKey) {
    const slot = domain?.格子?.[slotKey];
    if (!slot?.建筑 || number(slot.等级) < 1) return { ok: false, reason: '建筑尚未建成' };
    if (!slot.开工 && usedLabor(domain, slotKey) + slotLabor(slot, domain.等级) > population(domain))
      return { ok: false, reason: '人口不足，无法复工' };
    slot.开工 = !slot.开工;
    pushLedger(domain, `${buildingLabel(buildingOf(domain, slot.建筑), domain.线路) || slot.建筑}${slot.开工 ? '复工' : '停工'}`);
    return { ok: true, active: slot.开工 };
  }
  function cancelConstruction(domain, slotKey) {
    const slot = domain?.格子?.[slotKey];
    if (!slot?.施工动作) return { ok: false, reason: '没有进行中的施工' };
    slot.施工动作 = '';
    slot.完工时刻 = 0;
    if (slot.等级 <= 0) Object.assign(slot, emptySlot());
    return { ok: true };
  }
  function sweepConstruction(domain, nowMin) {
    if (!domain?.已建立) return 0;
    let completed = 0;
    SLOT_KEYS.forEach(key => {
      const slot = domain.格子[key];
      if (!slot?.施工动作 || number(slot.完工时刻) > number(nowMin)) return;
      const action = slot.施工动作;
      slot.等级 = action === '新建' ? 1 : Math.min(3, number(slot.等级) + 1);
      slot.施工动作 = '';
      slot.完工时刻 = 0;
      reconcileSlot(domain, key);
      completed += 1;
    });
    return completed;
  }
  function stewardCost(level) { return STEWARD_COST[Math.min(3, Math.max(0, Math.floor(number(level))))] || 0; }
  function stewardMultiplier(domain, slot, data, pathways) {
    const name = String(slot?.总管 || '').trim();
    if (!name) return { multiplier: 1, valid: false, name: '' };
    const npc = data?.npc_data?.[name];
    const relation = data?.stat_data?.人物关系列表?.[name];
    if (!record(npc) || !record(relation)) return { multiplier: 1, valid: false, name };
    const building = buildingOf(domain, slot.建筑);
    const typeMap = { 农产品: '第一产业', 工业品: '第二产业', 服务: '第三产业' };
    const principal = industryState.principal({
      类型: typeMap[building?.主产出] || '第一产业',
      负责人: name,
      当前投入资本总额: '50000 金镑',
    }, data, pathways || {});
    const affinity = clamp(number(relation.好感度), -200, 200);
    const full = STEWARD_MULT[Math.max(0, Math.min(12, Math.floor(number(principal.tier, 1))))] || 1;
    if (affinity <= -1) return { multiplier: .75, valid: true, name, affinity };
    if (affinity < 30) return { multiplier: .9, valid: true, name, affinity };
    return { multiplier: 1 + (full - 1) * clamp((affinity - 30) / 100, 0, 1), valid: true, name, affinity };
  }
  function weeklyProduce(domain, cycles, data, pathways) {
    const store = storeOf(domain);
    const count = Math.max(1, Math.floor(number(cycles, 1)));
    let buildings = 0;
    const stewardNames = new Set();
    SLOT_KEYS.forEach(key => {
      const slot = domain.格子[key];
      if (!slot?.建筑 || !slot.开工 || number(slot.等级) < 1) return;
      const view = stewardMultiplier(domain, slot, data, pathways);
      if (view.valid && view.name) stewardNames.add(view.name);
      Object.entries(recipeOf(domain, slot)).forEach(([goods, amount]) => {
        const produced = Math.floor(number(amount) * view.multiplier * count);
        if (produced > 0) store[goods] = number(store[goods]) + produced;
      });
      buildings += 1;
    });
    return { buildings, stewardNames };
  }
  function eliteCounts(domain) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const add = stack => {
      if (!record(stack) || stack.来源 === '势力' || stack.势力键) return;
      const elite = Math.floor(number(stack.精锐等级, 1));
      if (elite >= 1 && elite <= 5) counts[elite] += Math.max(0, number(stack.数量));
    };
    domain.驻军.散兵.forEach(add);
    domain.驻军.军队.forEach(army => (Array.isArray(army?.编成) ? army.编成 : []).forEach(add));
    return counts;
  }
  function upkeep(domain, cycles) {
    const result = {};
    const count = eliteCounts(domain);
    const rules = demands();
    const n = Math.max(1, Math.floor(number(cycles, 1)));
    GOODS_TYPES.forEach(type => {
      for (let tier = 1; tier <= 5; tier += 1) {
        const row = rules[type]?.[`${tier}级`];
        if (!record(row)) continue;
        const amount = Math.round(Object.keys(count).reduce((sum, elite) => sum + count[elite] * number(row[`c${elite}`]), 0)) * n;
        if (amount > 0) result[`${tier}级${type}`] = amount;
      }
    });
    const store = storeOf(domain);
    Object.entries(result).forEach(([goods, amount]) => { store[goods] = number(store[goods]) - amount; });
    return result;
  }
  function refreshZeroed(domain) {
    const result = new Set();
    Object.entries(storeOf(domain)).forEach(([goods, amount]) => {
      const match = String(goods).match(/^([1-5])级(.+)$/);
      if (match && number(amount) < 0) {
        const row = demands()[match[2]]?.[`${match[1]}级`] || {};
        for (let elite = 1; elite <= 5; elite += 1) if (number(row[`c${elite}`]) > 0) result.add(elite);
      }
    });
    domain.归零精锐 = [...result].sort((a, b) => a - b);
    return domain.归零精锐;
  }
  function stewardAffinity(domain, data, cycles) {
    const relation = data?.stat_data?.人物关系列表 || {};
    const npc = data?.npc_data || {};
    const intents = new Map();
    SLOT_KEYS.forEach(key => {
      const slot = domain.格子[key];
      const name = String(slot?.总管 || '').trim();
      const cost = stewardCost(slot?.等级) * Math.max(1, Math.floor(number(cycles, 1)));
      if (name && cost > 0) intents.set(name, number(intents.get(name)) + cost);
    });
    let changed = 0;
    intents.forEach((intent, name) => {
      if (!record(npc[name]) || !record(relation[name])) return;
      const before = number(relation[name].好感度);
      if (before <= FLOOR) return;
      const after = Math.max(FLOOR, before - intent);
      if (after !== before) { relation[name].好感度 = after; changed += 1; }
    });
    return changed;
  }
  function assignSteward(domain, slotKey, npcName) {
    const slot = domain?.格子?.[slotKey];
    if (!slot) return { ok: false, reason: '地块不存在' };
    if (!slot.建筑 || number(slot.等级) < 1) return { ok: false, reason: '空地或未建成，不能派总管' };
    const name = String(npcName || '').trim();
    if (!name) return { ok: false, reason: '未选择人物' };
    slot.总管 = name;
    return { ok: true, name };
  }
  function clearSteward(domain, slotKey) {
    const slot = domain?.格子?.[slotKey];
    if (!slot) return { ok: false, reason: '地块不存在' };
    const name = String(slot.总管 || '');
    slot.总管 = '';
    return { ok: true, name };
  }
  function recruitConfig() { return domainConfig().recruit || {}; }
  function troopDefs() { return Array.isArray(recruitConfig().troops) ? recruitConfig().troops : []; }
  function findTroop(id) { return troopDefs().find(item => item?.id === id) || null; }
  function troopsOfBranch(branch) { return troopDefs().filter(item => item?.军种 === branch); }
  function eliteScale(elite) {
    const values = recruitConfig().eliteScale || [1, 3, 25, 150, 1000];
    return number(values[Math.max(0, Math.min(4, Math.floor(number(elite, 1)) - 1))], 1);
  }
  function trainMinutes(elite) {
    const values = recruitConfig().trainMinutes || [];
    const index = Math.max(0, Math.floor(number(elite, 1)) - 1);
    return number(values[index], Math.pow(index + 1, 2) * 1440);
  }
  function recruitGold(elite, quantity) {
    const price = Number(recruitConfig().goldPerUnit?.[Math.floor(Number(elite)) - 1]);
    const count = Number(quantity);
    return Number.isFinite(price) && price >= 0 && Number.isSafeInteger(count) && count > 0
      ? price * count : NaN;
  }
  function recruit(domain, data, troopId, quantity, nowMin) {
    if (!domain?.已建立) return { ok: false, reason: '尚未建立领地' };
    const troop = findTroop(troopId);
    const count = Number(quantity);
    const elite = Number(troop?.精锐);
    const cost = recruitGold(elite, count);
    const wallet = data?.stat_data?.货币?.鲁恩王国;
    const balance = Number(wallet?.金镑);
    if (!troop || !BRANCHES.includes(troop.军种) || !Number.isSafeInteger(count) || count <= 0 ||
      !Number.isSafeInteger(cost) || !record(wallet) || !Number.isFinite(balance) || balance < 0)
      return { ok: false, reason: '兵种、数量、价格或钱包无效' };
    if (balance < cost) return { ok: false, reason: `金镑不足，还差 ${cost - balance}` };
    const order = enqueueTraining(domain, troop.军种, troop.id, elite, count, nowMin);
    if (!order) return { ok: false, reason: '训练队列创建失败' };
    wallet.金镑 = balance - cost;
    pushLedger(domain, `募${troop.名称 || troop.id} ${count} 人（精锐 ${elite} 级），出饷 ${cost} 金镑，${Math.max(1, Math.round(trainMinutes(elite) / 1440))} 天后成军`);
    return { ok: true, order, cost };
  }
  function maxDeploy() { return Math.max(1, Math.floor(number(recruitConfig().maxDeploy, number(db().warConfig?.maxPiecesPerSide, 8)))); }
  function fieldsOfBranch(branch) {
    return recruitConfig().战场?.[branch] || (branch === '空军' ? ['陆战', '海战'] : branch === '海军' ? ['海战'] : ['陆战']);
  }
  function branchCanFight(branch, field) { return fieldsOfBranch(branch).includes(field); }
  function garrisonOf(domain) {
    if (!record(domain?.驻军)) domain.驻军 = {};
    if (!Array.isArray(domain.驻军.散兵)) domain.驻军.散兵 = [];
    if (!Array.isArray(domain.驻军.军队)) domain.驻军.军队 = [];
    return domain.驻军;
  }
  function trainingOf(domain) {
    if (!Array.isArray(domain.训练队列)) domain.训练队列 = [];
    return domain.训练队列;
  }
  function deployListOf(domain) {
    if (!Array.isArray(domain.出战名单)) domain.出战名单 = [];
    return domain.出战名单;
  }
  function zeroedOf(domain) {
    if (!Array.isArray(domain.归零精锐)) domain.归零精锐 = [];
    return domain.归零精锐;
  }
  function isFactionStack(stack) { return Boolean(stack?.来源 === '势力' || stack?.势力键); }
  function stackKey(stack) {
    return `${stack?.军种 || '陆军'}|${stack?.兵种 || ''}|${Math.floor(number(stack?.精锐等级, 1))}`;
  }
  function looseKey(stack) {
    if (isFactionStack(stack)) return `势力|${stack.势力键 || ''}|${stack.分支 || stack.军种 || ''}|${stack.部队键 || ''}`;
    return `本地|${stack?.军种 || ''}|${stack?.兵种 || ''}|${Math.floor(number(stack?.精锐等级, 1))}`;
  }
  function stackDisplayName(stack) { return stack?.显示名 || findTroop(stack?.兵种)?.名称 || stack?.兵种 || ''; }
  function getFactionUnit(data, factionKey, branch, unitKey) {
    return data?.stat_data?.势力?.[factionKey]?.世俗军队?.[branch]?.[unitKey] || null;
  }
  function listFactionLoose(data, domain) {
    const output = [];
    const factions = data?.stat_data?.势力;
    if (!record(factions)) return output;
    const ownName = domain?.已建立 ? String(domain.领地名 || '').trim() : '';
    Object.entries(factions).forEach(([factionKey, faction]) => {
      if (factionKey === '$meta' || !record(faction) || faction.$投影) return;
      if (ownName && (factionKey === ownName || String(faction.势力名 || '').trim() === ownName)) return;
      BRANCHES.forEach(branch => {
        const bag = faction.世俗军队?.[branch];
        if (!record(bag)) return;
        Object.entries(bag).forEach(([unitKey, unit]) => {
          const quantity = Math.max(0, Math.floor(number(unit?.部队数量)));
          if (unitKey === '$meta' || !record(unit) || quantity <= 0) return;
          const elite = clamp(parseInt(String(unit.部队精锐等级 || '1').replace(/[^0-9]/g, ''), 10) || 1, 1, 5);
          const candidates = troopsOfBranch(branch).filter(item => number(item.精锐, 1) === elite);
          const troop = candidates[0];
          if (!troop) return;
          output.push({
            军种: branch, 兵种: troop.id, 精锐等级: elite, 数量: quantity,
            来源: '势力', 显示名: unit.部队名 || troop.名称 || troop.id,
            势力键: factionKey, 分支: branch, 部队键: unitKey, 势力名: faction.势力名 || factionKey,
          });
        });
      });
    });
    return output;
  }
  function listLocalLoose(domain) {
    return garrisonOf(domain).散兵.map(stack => ({
      ...stack, 来源: stack.来源 || '本地', 显示名: stack.显示名 || '',
    }));
  }
  function listAvailableLoose(domain, data, branch) {
    const result = listLocalLoose(domain).concat(domain?.已建立 ? listFactionLoose(data, domain) : []);
    return branch ? result.filter(stack => stack.军种 === branch) : result;
  }
  function findAvailableLoose(domain, data, key) {
    return listAvailableLoose(domain, data).find(stack => looseKey(stack) === key) || null;
  }
  function adjustFactionQuantity(data, stack, delta) {
    const unit = getFactionUnit(data, stack?.势力键, stack?.分支 || stack?.军种, stack?.部队键);
    if (!unit) return 0;
    const before = Math.max(0, Math.floor(number(unit.部队数量)));
    unit.部队数量 = Math.max(0, before + Math.floor(number(delta)));
    return unit.部队数量 - before;
  }
  function addLoose(domain, branch, troopId, elite, quantity, data, meta) {
    const count = Math.max(0, Math.floor(number(quantity)));
    if (!count) return;
    if (isFactionStack(meta) && data) { adjustFactionQuantity(data, meta, count); return; }
    const desired = { 军种: branch, 兵种: troopId, 精锐等级: Math.floor(number(elite, 1)), 来源: '本地' };
    const hit = garrisonOf(domain).散兵.find(stack => !isFactionStack(stack) && stackKey(stack) === stackKey(desired));
    if (hit) hit.数量 = number(hit.数量) + count;
    else garrisonOf(domain).散兵.push({ ...desired, 数量: count, 显示名: '' });
  }
  function takeLoose(domain, branch, troopId, elite, quantity, data, meta) {
    const count = Math.max(0, Math.floor(number(quantity)));
    if (!count) return 0;
    if (isFactionStack(meta) && data) {
      const unit = getFactionUnit(data, meta.势力键, meta.分支 || branch, meta.部队键);
      const available = Math.max(0, Math.floor(number(unit?.部队数量)));
      const taken = Math.min(count, available);
      if (unit) unit.部队数量 = available - taken;
      return taken;
    }
    const desired = { 军种: branch, 兵种: troopId, 精锐等级: Math.floor(number(elite, 1)) };
    const hit = garrisonOf(domain).散兵.find(stack => !isFactionStack(stack) && stackKey(stack) === stackKey(desired));
    if (!hit) return 0;
    const taken = Math.min(count, Math.max(0, Math.floor(number(hit.数量))));
    hit.数量 -= taken;
    if (hit.数量 <= 0) garrisonOf(domain).散兵 = garrisonOf(domain).散兵.filter(item => item !== hit);
    return taken;
  }
  function takeLooseByKey(domain, data, key, quantity) {
    const stack = findAvailableLoose(domain, data, key);
    return stack ? takeLoose(domain, stack.军种, stack.兵种, stack.精锐等级, quantity, data, isFactionStack(stack) ? stack : null) : 0;
  }
  function dischargeLoose(domain, data, key, quantity) {
    const source = findAvailableLoose(domain, data, key);
    const count = Number(quantity);
    if (!source || !Number.isSafeInteger(count) || count <= 0 || count > Number(source.数量))
      return { ok: false, reason: '遣散人数超过可用数量或数据已变化' };
    const taken = takeLooseByKey(domain, data, key, count);
    if (taken !== count) return { ok: false, reason: '遣散人数与库存不符' };
    pushLedger(domain, `遣散${stackDisplayName(source)} ${taken} 人`);
    return { ok: true, count: taken };
  }
  function looseCount(domain, branch, troopId, elite, data, meta) {
    if (isFactionStack(meta) && data) return Math.max(0, Math.floor(number(getFactionUnit(data, meta.势力键, meta.分支 || branch, meta.部队键)?.部队数量)));
    const hit = garrisonOf(domain).散兵.find(stack => !isFactionStack(stack)
      && stackKey(stack) === stackKey({ 军种: branch, 兵种: troopId, 精锐等级: elite }));
    return Math.max(0, Math.floor(number(hit?.数量)));
  }
  function enqueueTraining(domain, branch, troopId, elite, quantity, nowMin) {
    const count = Math.max(0, Math.floor(number(quantity)));
    if (!count || !findTroop(troopId)) return null;
    const list = trainingOf(domain);
    let index = 1;
    while (list.some(order => order.id === `t${index}`)) index += 1;
    const order = {
      id: `t${index}`, 军种: branch, 兵种: troopId, 精锐等级: Math.floor(number(elite, 1)),
      数量: count, 完工时刻: number(nowMin) + trainMinutes(elite),
    };
    list.push(order);
    return order;
  }
  function sweepTraining(domain, nowMin) {
    if (!domain?.已建立) return 0;
    const pending = [];
    let completed = 0;
    trainingOf(domain).forEach(order => {
      if (number(order.完工时刻) > number(nowMin)) pending.push(order);
      else {
        addLoose(domain, order.军种, order.兵种, order.精锐等级, order.数量);
        pushLedger(domain, `${stackDisplayName(order)} ${order.数量} 人训练完成，已进入散兵池`, '自动');
        completed += 1;
      }
    });
    domain.训练队列 = pending;
    return completed;
  }
  function cancelTraining(domain, orderId) {
    const before = trainingOf(domain).length;
    domain.训练队列 = trainingOf(domain).filter(order => order.id !== orderId);
    return domain.训练队列.length !== before;
  }
  function upkeepFromCounts(counts) {
    const result = {};
    const rules = demands();
    GOODS_TYPES.forEach(type => {
      for (let tier = 1; tier <= 5; tier += 1) {
        const row = rules[type]?.[`${tier}级`];
        if (!record(row)) continue;
        const total = Object.keys(counts || {}).reduce((sum, level) => sum + number(counts[level]) * number(row[`c${level}`]), 0);
        if (Math.round(total) > 0) result[`${tier}级${type}`] = Math.round(total);
      }
    });
    return result;
  }
  function upkeepGoods(domain) { return upkeepFromCounts(eliteCounts(domain)); }
  function totalTroops(domain) {
    return Object.values(eliteCounts(domain)).reduce((sum, count) => sum + count, 0);
  }
  function unitUpkeep(elite) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    counts[clamp(Math.floor(number(elite, 1)), 1, 5)] = 1;
    return upkeepFromCounts(counts);
  }
  function goodsEquiv(goods) {
    return Object.entries(goods || {}).reduce((sum, [key, quantity]) => {
      const match = /^([1-5])级/.exec(key);
      return sum + number(quantity) * (TIER_EQUIV[(Number(match?.[1]) || 1) - 1] || 1);
    }, 0);
  }
  function shortageKeys(domain) {
    return Object.keys(storeOf(domain)).filter(key => /^([1-5])级/.test(key) && number(domain.物资库[key]) < 0);
  }
  function elitesNeeding(goodsKey) {
    const match = /^([1-5])级(.+)$/.exec(String(goodsKey || ''));
    const row = match && demands()[match[2]]?.[`${match[1]}级`];
    return row ? [1, 2, 3, 4, 5].filter(level => number(row[`c${level}`]) > 0) : [];
  }
  function zeroedElites(domain) {
    return [...new Set(shortageKeys(domain).flatMap(elitesNeeding))].sort((a, b) => a - b);
  }
  function isEliteZeroed(domain, elite) { return zeroedOf(domain).includes(Math.floor(number(elite, 1))); }
  function armyStacks(army) { return Array.isArray(army?.编成) ? army.编成 : []; }
  function stackHp(stack) {
    const troop = findTroop(stack?.兵种);
    return number(troop?.生命) * eliteScale(stack?.精锐等级) * number(stack?.数量);
  }
  function stackAttack(stack) {
    const troop = findTroop(stack?.兵种);
    return number(troop?.攻击) * eliteScale(stack?.精锐等级) * number(stack?.数量);
  }
  function armyHp(army) { return Math.max(1, Math.round(armyStacks(army).reduce((sum, stack) => sum + stackHp(stack), 0))); }
  function armyAtk(army) { return Math.round(armyStacks(army).reduce((sum, stack) => sum + stackAttack(stack), 0)); }
  function armyShield(army) {
    return Math.round(armyStacks(army).reduce((sum, stack) =>
      sum + number(findTroop(stack.兵种)?.护盾) * eliteScale(stack.精锐等级) * number(stack.数量), 0));
  }
  function armyCount(army) { return armyStacks(army).reduce((sum, stack) => sum + number(stack.数量), 0); }
  function armyElite(army) { return armyStacks(army).reduce((max, stack) => Math.max(max, Math.floor(number(stack.精锐等级, 1))), 1); }
  function armyQuality(army) {
    const troop = findTroop(army?.主兵种);
    const defaults = db().warConfig?.defaults || {};
    return {
      射程: number(troop?.射程) || number(defaults.range) || 1,
      防御: number(troop?.防御) || number(defaults.def),
      特防: number(troop?.特防) || number(defaults.speDef),
      速度: number(troop?.速度) || number(defaults.speed) || 50,
      暴击率: number(troop?.暴击率) || number(defaults.critChance),
      暴击倍率: number(troop?.暴击倍率) || number(defaults.critPower) || 2,
      闪避: number(troop?.闪避) || number(defaults.dodge),
      maxPP: number(troop?.maxPP) || number(defaults.maxPP) || 100,
      技能: troop?.技能 || defaults.ability || 'HEAVY_STRIKE',
      taunt: Boolean(troop?.taunt),
      merciless: Boolean(troop?.merciless),
    };
  }
  function mainTypeRatio(army) {
    const total = armyStacks(army).reduce((sum, stack) => sum + stackHp(stack), 0);
    if (total <= 0) return 0;
    return armyStacks(army).filter(stack => stack.兵种 === army?.主兵种)
      .reduce((sum, stack) => sum + stackHp(stack), 0) / total;
  }
  function validateArmy(army) {
    const stacks = armyStacks(army);
    if (!stacks.length) return { ok: false, reason: '编成为空' };
    if (!army.主兵种) return { ok: false, reason: '未指定主兵种' };
    if (new Set(stacks.map(stack => stack.军种)).size > 1) return { ok: false, reason: '不可跨军种混编' };
    if (!stacks.some(stack => stack.兵种 === army.主兵种)) return { ok: false, reason: '主兵种不在编成内' };
    const ratio = mainTypeRatio(army);
    const required = number(recruitConfig().mainTypeHpRatio, 0.7);
    return ratio < required
      ? { ok: false, reason: `主兵种生命占比 ${(ratio * 100).toFixed(1)}%，需 ≥ ${(required * 100).toFixed(0)}%` }
      : { ok: true, reason: '' };
  }
  function armyZeroedElites(domain, army) {
    return [...new Set(armyStacks(army)
      .filter(stack => !isFactionStack(stack) && isEliteZeroed(domain, stack.精锐等级))
      .map(stack => Math.floor(number(stack.精锐等级, 1))))].sort((a, b) => a - b);
  }
  function canDeploy(domain, army, field) {
    if (!army) return { ok: false, reason: '军队不存在' };
    const valid = validateArmy(army);
    if (!valid.ok) return valid;
    if (field && !branchCanFight(army.军种, field)) return { ok: false, reason: `${army.军种}不能上${field}` };
    const zeroed = armyZeroedElites(domain, army);
    return zeroed.length ? { ok: false, reason: `缺补给：精锐 ${zeroed.join('/')} 级已归零` } : { ok: true, reason: '' };
  }
  function nextArmyId(domain) {
    let index = 1;
    while (garrisonOf(domain).军队.some(army => army.id === `army${index}`)) index += 1;
    return `army${index}`;
  }
  function formArmy(domain, name, branch, mainTroop, picks, data) {
    if (!domain?.已建立 || !BRANCHES.includes(branch) || !Array.isArray(picks) || !picks.length)
      return { ok: false, reason: '军种或编成无效', army: null };
    const keys = new Set();
    const proposed = [];
    for (const pick of picks) {
      const count = Number(pick?.数量);
      const source = pick?.looseKey
        ? findAvailableLoose(domain, data, pick.looseKey)
        : listAvailableLoose(domain, data, branch).find(stack =>
          !isFactionStack(stack) && stack.兵种 === pick?.兵种 &&
          Number(stack.精锐等级) === Number(pick?.精锐等级));
      const key = source && looseKey(source);
      if (!source || keys.has(key) || source.军种 !== branch ||
        !Number.isSafeInteger(count) || count <= 0 || count > Number(source.数量))
        return { ok: false, reason: '编成选兵无效或可用数量不足', army: null };
      keys.add(key);
      proposed.push({ ...source, 数量: count });
    }
    const preflight = validateArmy({ 军种: branch, 主兵种: mainTroop, 编成: proposed });
    if (!preflight.ok) return { ...preflight, army: null };
    const army = { id: nextArmyId(domain), 名称: name || '', 军种: branch, 主兵种: mainTroop, 图标: '', x: 0, y: 0, 编成: [] };
    (picks || []).forEach(pick => {
      const want = Math.max(0, Math.floor(number(pick.数量)));
      if (!want) return;
      const source = pick.looseKey ? findAvailableLoose(domain, data, pick.looseKey) : pick;
      const meta = isFactionStack(source) ? source : null;
      const troopId = source?.兵种 || pick.兵种;
      const elite = source?.精锐等级 || pick.精锐等级;
      const got = pick.looseKey
        ? takeLooseByKey(domain, data, pick.looseKey, want)
        : takeLoose(domain, branch, troopId, elite, want, data, meta);
      if (!got) return;
      army.编成.push({
        军种: branch, 兵种: troopId, 精锐等级: Math.floor(number(elite, 1)), 数量: got,
        来源: meta ? '势力' : '本地', 显示名: source?.显示名 || pick.显示名 || '',
        势力键: meta?.势力键 || '', 分支: meta?.分支 || '', 部队键: meta?.部队键 || '',
        势力名: meta?.势力名 || '',
      });
    });
    const valid = validateArmy(army);
    if (!valid.ok) {
      army.编成.forEach(stack => addLoose(domain, stack.军种, stack.兵种, stack.精锐等级, stack.数量, data, isFactionStack(stack) ? stack : null));
      return { ok: false, reason: valid.reason, army: null };
    }
    garrisonOf(domain).军队.push(army);
    return { ok: true, reason: '', army };
  }
  function findArmy(domain, id) { return garrisonOf(domain).军队.find(army => army.id === id) || null; }
  function disbandArmy(domain, id, data) {
    const army = findArmy(domain, id);
    if (!army) return false;
    armyStacks(army).forEach(stack => addLoose(domain, stack.军种, stack.兵种, stack.精锐等级, stack.数量, data, isFactionStack(stack) ? stack : null));
    garrisonOf(domain).军队 = garrisonOf(domain).军队.filter(item => item.id !== id);
    domain.出战名单 = deployListOf(domain).filter(item => item !== id);
    return true;
  }
  function dischargeArmy(domain, id) {
    const army = findArmy(domain, id);
    if (!army) return false;
    garrisonOf(domain).军队 = garrisonOf(domain).军队.filter(item => item.id !== id);
    domain.出战名单 = deployListOf(domain).filter(item => item !== id);
    pushLedger(domain, `遣散「${army.名称 || army.id}」，${armyCount(army)} 名士卒离队`);
    return true;
  }
  function deployableArmies(domain, field) { return garrisonOf(domain).军队.filter(army => canDeploy(domain, army, field).ok); }
  function toggleDeploy(domain, id, field) {
    const list = deployListOf(domain);
    const index = list.indexOf(id);
    if (index >= 0) { list.splice(index, 1); return { ok: true, reason: '已移出出战名单' }; }
    const check = canDeploy(domain, findArmy(domain, id), field);
    if (!check.ok) return check;
    if (list.length >= maxDeploy()) return { ok: false, reason: `出战名单最多 ${maxDeploy()} 支` };
    list.push(id);
    return { ok: true, reason: '已加入出战名单' };
  }
  function deployPieces(domain, field) {
    return deployListOf(domain).map(id => findArmy(domain, id)).filter(army => canDeploy(domain, army, field).ok)
      .map((army, index) => ({
        id: army.id, troopId: army.主兵种, name: army.名称 || stackDisplayName(armyStacks(army)[0]) || army.id,
        eliteLevel: armyElite(army), count: armyCount(army), x: number(army.x, index), y: number(army.y),
        hp: armyHp(army), atk: armyAtk(army),
      }));
  }
  function pruneDeploy(domain, field) {
    const before = deployListOf(domain).length;
    domain.出战名单 = deployListOf(domain).filter(id => canDeploy(domain, findArmy(domain, id), field).ok);
    return before - domain.出战名单.length;
  }
  function listGuestRoomKeys(domain) {
    ensureRooms(domain);
    return Object.keys(roomsOf(domain)).filter(key => key !== ROOM0_KEY && /^房\d+$/.test(key))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  }
  function findRoomByGuest(domain, npcName) {
    const name = String(npcName || '').trim();
    return listGuestRoomKeys(domain).find(key => String(roomsOf(domain)[key]?.住客 || '').trim() === name) || null;
  }
  function renameRoom(domain, roomKey, newName) {
    ensureRooms(domain);
    if (!roomsOf(domain)[roomKey]) return { ok: false, reason: '房间不存在' };
    const name = String(newName || '').trim();
    if (!name) return { ok: false, reason: '名称不能为空' };
    roomsOf(domain)[roomKey].名称 = name;
    return { ok: true };
  }
  function assignRoom(domain, roomKey, npcName, relationList) {
    ensureRooms(domain);
    if (roomKey === ROOM0_KEY) return { ok: false, reason: '领主房不可分配' };
    if (!roomsOf(domain)[roomKey]) return { ok: false, reason: '房间不存在' };
    const name = String(npcName || '').trim();
    if (!name) return { ok: false, reason: '请选择住客' };
    if (name === '$meta' || !record(relationList?.[name])) return { ok: false, reason: '该角色不在人物关系列表' };
    const occupied = findRoomByGuest(domain, name);
    if (occupied && occupied !== roomKey) return { ok: false, reason: `${name} 已住在其他房间` };
    roomsOf(domain)[roomKey].住客 = name;
    roomsOf(domain)[roomKey].常住 = true;
    return { ok: true };
  }
  function clearRoom(domain, roomKey) {
    ensureRooms(domain);
    if (roomKey === ROOM0_KEY) return { ok: false, reason: '领主房不可清空' };
    if (!roomsOf(domain)[roomKey]) return { ok: false, reason: '房间不存在' };
    roomsOf(domain)[roomKey].住客 = '';
    roomsOf(domain)[roomKey].常住 = true;
    return { ok: true };
  }
  function toggleRoomResident(domain, roomKey) {
    ensureRooms(domain);
    if (roomKey === ROOM0_KEY) return { ok: false, reason: '领主房无常住标记' };
    const room = roomsOf(domain)[roomKey];
    if (!room) return { ok: false, reason: '房间不存在' };
    if (!String(room.住客 || '').trim()) return { ok: false, reason: '空房无需标记' };
    room.常住 = !room.常住;
    return { ok: true, 常住: room.常住 };
  }
  function coreUpgradeCost(domain, opts = {}) {
    const level = coreLevelOf(domain);
    if (level >= MAX_CORE_LEVEL) return { ok: false, reason: '核心已是最高等级', 金镑: 0, 工期: 0 };
    const action = level === 1 ? '1→2' : '2→3';
    const index = actionIndex(action);
    const fast = Boolean(opts.fast);
    const fastBuild = domainConfig().fastBuild || {};
    const gold = goldCost(domain?.等级, index) * 2 * (fast ? number(fastBuild.goldMult, 3) : 1);
    const duration = fast ? number(fastBuild.durationMin, 1440) : durationOf(domain?.等级, index);
    return { ok: true, action, idx: index, 金镑: gold, 工期: duration };
  }
  function startCoreUpgrade(domain, nowMin, opts = {}) {
    ensureRooms(domain);
    if (domain?.核心?.施工动作) return { ok: false, reason: '核心正在施工' };
    const cost = coreUpgradeCost(domain, opts);
    if (!cost.ok) return cost;
    domain.核心.施工动作 = cost.action;
    domain.核心.完工时刻 = number(nowMin) + cost.工期;
    return { ok: true, ...cost };
  }
  function beginCoreUpgrade(domain, data, nowMin, opts = {}) {
    if (!domain?.已建立) return { ok: false, reason: '尚未建立领地' };
    if (domain.核心?.施工动作) return { ok: false, reason: '核心正在施工' };
    const cost = coreUpgradeCost(domain, opts);
    if (!cost.ok) return cost;
    const funds = walletFor(data, cost.金镑);
    if (!funds.ok) return funds;
    const result = startCoreUpgrade(domain, nowMin, opts);
    if (!result.ok) return result;
    funds.wallet.金镑 = funds.balance - cost.金镑;
    pushLedger(domain, `核心${opts.fast ? '超凡' : ''}扩建 ${cost.action}，耗 ${cost.金镑} 金镑`);
    return result;
  }
  function cancelCoreUpgrade(domain) {
    if (!domain?.核心?.施工动作) return { ok: false, reason: '没有进行中的施工' };
    domain.核心.施工动作 = '';
    domain.核心.完工时刻 = 0;
    return { ok: true };
  }
  function sweepCoreConstruction(domain, nowMin) {
    if (!domain?.已建立 || !domain.核心?.施工动作 || number(domain.核心.完工时刻) > number(nowMin)) return 0;
    domain.核心.等级 = domain.核心.施工动作 === '1→2' ? 2 : 3;
    domain.核心.施工动作 = '';
    domain.核心.完工时刻 = 0;
    ensureRooms(domain);
    return 1;
  }
  function tickCoreHousingAffinity(domain, data, cycles) {
    if (!domain?.已建立) return 0;
    ensureRooms(domain);
    const relations = data?.stat_data?.人物关系列表 || {};
    const npcs = data?.npc_data || {};
    const delta = HOUSING_AFFINITY_PER_WEEK * Math.max(1, Math.floor(number(cycles, 1)));
    let touched = 0;
    listGuestRoomKeys(domain).forEach(key => {
      const name = String(roomsOf(domain)[key]?.住客 || '').trim();
      if (!name || !record(npcs[name]) || !record(relations[name])) return;
      const next = clamp(number(relations[name].好感度) + delta, -200, 200);
      if (next !== number(relations[name].好感度)) {
        relations[name].好感度 = next;
        touched += 1;
      }
    });
    return touched;
  }
  function buildCoreHousingOverview(domain) {
    if (!domain?.已建立) return '';
    ensureRooms(domain);
    const core = String(domain.核心?.名称 || '核心').trim() || '核心';
    const room0 = String(roomsOf(domain)[ROOM0_KEY]?.名称 || ROOM0_DEFAULT_NAME).trim() || ROOM0_DEFAULT_NAME;
    const rooms = listGuestRoomKeys(domain).map(key => {
      const room = roomsOf(domain)[key];
      const guest = String(room?.住客 || '').trim();
      return `「${room?.名称 || key}」：${guest ? `${guest}，${room?.常住 ? '常住' : '不常住'}` : '空置'}`;
    });
    return `【${core}】\n「${room0}」：<User>\n${rooms.join('；') || '客房：尚无'}`;
  }
  function peerRoster(level) {
    const index = Number(level) || 1;
    const list = window.DOMAIN_PEER_ROSTER?.[index] ?? modules['cryptLord.domainDefaults']?.roster?.[index];
    return Array.isArray(list) ? list : [];
  }
  function peersOf(domain) {
    if (!Array.isArray(domain.同级对手)) domain.同级对手 = [];
    return domain.同级对手;
  }
  function ensurePeers(domain) {
    if (!domain?.已建立) return peersOf(domain);
    const roster = peerRoster(domain.等级);
    if (!roster.length) return peersOf(domain);
    const current = peersOf(domain);
    const byId = Object.fromEntries(current.filter(peer => peer?.id).map(peer => [peer.id, peer]));
    domain.同级对手 = roster.map(peer => {
      const old = byId[peer.id];
      return {
        ...clone(peer),
        状态: old?.状态 === '已吞并' ? '已吞并' : '存续',
        完成方式: old?.状态 === '已吞并' ? String(old.完成方式 || '') : String(peer.完成方式 || ''),
        认定理由: old?.状态 === '已吞并' ? String(old.认定理由 || '') : String(peer.认定理由 || ''),
      };
    });
    return domain.同级对手;
  }
  function findPeer(domain, id) { return peersOf(domain).find(peer => peer.id === id) || null; }
  function peerPieces(domain, id) {
    const peer = findPeer(domain, id);
    return (peer?.军队 || []).map((army, index) => ({
      id: `peer-${peer.id}-${index}`, troopId: army.主兵种, name: army.名称 || army.id,
      eliteLevel: armyElite(army), count: armyCount(army), x: index % 8, y: Math.floor(index / 8),
      hp: armyHp(army), atk: armyAtk(army),
    }));
  }
  function annexPopGain(domain) { return Math.round(1.5 * number(stageConfig(domain?.等级)?.用工?.[2])); }
  function oldWeeklyYield(domain) {
    const yields = stageConfig(domain?.等级)?.周产 || [];
    return SLOT_KEYS.reduce((sum, key) => {
      const level = Math.floor(number(domain?.格子?.[key]?.等级));
      return sum + (level > 0 ? number(yields[level - 1]) : 0);
    }, 0);
  }
  function promoteGiftCount(domain) {
    const level3 = number(stageConfig(domain?.等级)?.周产?.[2]);
    return level3 > 0 ? clamp(Math.floor(oldWeeklyYield(domain) / level3), 3, 8) : 3;
  }
  function canPromote(domain) {
    return Boolean(domain?.已建立 && Number(domain.等级) < MAX_DOMAIN_LEVEL && stageConfig(Number(domain.等级) + 1)
      && peerRoster(Number(domain.等级) + 1).length
      && peersOf(domain).length && peersOf(domain).every(peer => peer.状态 === '已吞并'));
  }
  function foundationLevels() {
    return Array.from({ length: MAX_DOMAIN_LEVEL }, (_, index) => index + 1)
      .filter(level => stageConfig(level) && peerRoster(level).length);
  }
  function missedFoundationSpoils(level) {
    const names = [];
    for (let current = 1; current < Number(level); current += 1) {
      peerRoster(current).forEach(peer => {
        if (peer?.战利品?.名称) names.push(peer.战利品.名称);
      });
    }
    return names;
  }
  function setFoundationTarget(domain, place, line) {
    if (domain?.已建立) return { ok: false, reason: '领地已经建立' };
    const location = String(place || '').trim();
    if (!location) return { ok: false, reason: '请填写目标地点' };
    if (line !== '乡村' && line !== '市内') return { ok: false, reason: '领地线路无效' };
    domain.待建目标 = { 地点: location, 线路: line };
    return { ok: true };
  }
  function foundDomain(domain, proposal) {
    if (!domain || domain.已建立) return { ok: false, reason: '领地已经建立或数据无效' };
    const target = domain.待建目标 || {};
    const level = Number(proposal?.等级);
    const name = String(proposal?.名称 || '').trim();
    const ids = proposal?.建筑;
    if (!target.地点 || !['乡村', '市内'].includes(target.线路))
      return { ok: false, reason: '请先保存待建领地目标' };
    if (!name) return { ok: false, reason: '请给领地命名' };
    if (!Number.isInteger(level) || !foundationLevels().includes(level))
      return { ok: false, reason: '无效的开局等级或邻境名单' };
    if (!Array.isArray(ids) || ids.length !== 3)
      return { ok: false, reason: '请为农、工、服各选一栋建筑' };
    const defs = buildingDefs({ ...domain, 等级: level });
    const chosen = ids.map(id => defs.find(item => item.id === id));
    if (chosen.some(item => !item) ||
      ['农产品', '工业品', '服务'].some((type, index) => chosen[index].主产出 !== type))
      return { ok: false, reason: '建筑必须分别属于当前等级的农、工、服' };
    const location = target.地点;
    const line = target.线路;
    domain.已建立 = true;
    domain.领地名 = name;
    domain.地点 = location;
    domain.线路 = line;
    domain.等级 = level;
    domain.人口 = number(stageConfig(level)?.开局人口);
    domain.待建目标 = { 地点: '', 线路: line };
    domain.核心 = { 名称: coreNameOf(line, level), 等级: 1, 施工动作: '', 完工时刻: 0, 房间: {} };
    domain.物资库 = {};
    domain.格子 = {};
    SLOT_KEYS.forEach(key => { domain.格子[key] = emptySlot(); });
    ids.forEach((id, index) => {
      domain.格子[SLOT_KEYS[index]] = { 建筑: id, 等级: 1, 开工: true, 施工动作: '', 完工时刻: 0, 总管: '' };
    });
    domain.同级对手 = [];
    ensureDomain(domain);
    SLOT_KEYS.forEach(key => reconcileSlot(domain, key));
    pushLedger(domain, `在${location}建立领地「${name}」（${ladderName(line, level)}），人口 ${domain.人口}，获赠${chosen.map(item => buildingLabel(item, line)).join('、')}`);
    return { ok: true, level, name, location };
  }
  function promote(domain, buildingIds) {
    if (!canPromote(domain)) return { ok: false, reason: '尚未满足晋升条件' };
    const ids = Array.isArray(buildingIds) ? buildingIds.filter(Boolean) : [];
    const count = promoteGiftCount(domain);
    if (ids.length !== count) return { ok: false, reason: `须选择 ${count} 栋初始建筑` };
    const nextLevel = Number(domain.等级) + 1;
    const nextDefs = buildingDefs({ ...domain, 等级: nextLevel });
    const buildings = ids.map(id => nextDefs.find(item => item.id === id));
    if (buildings.some(item => !item)) return { ok: false, reason: '存在无效建筑' };
    if (['农产品', '工业品', '服务'].some(type => !buildings.some(item => item.主产出 === type)))
      return { ok: false, reason: '须覆盖农、工、服各至少一栋' };
    const previousRooms = clone(roomsOf(domain));
    domain.等级 = nextLevel;
    domain.人口 = number(stageConfig(nextLevel)?.开局人口);
    domain.核心 = { 名称: coreNameOf(domain.线路, nextLevel), 等级: 1, 施工动作: '', 完工时刻: 0, 房间: previousRooms };
    ensureRooms(domain);
    SLOT_KEYS.forEach(key => { domain.格子[key] = emptySlot(); });
    ids.forEach((id, index) => { if (SLOT_KEYS[index]) domain.格子[SLOT_KEYS[index]] = { 建筑: id, 等级: 1, 开工: true, 施工动作: '', 完工时刻: 0, 总管: '' }; });
    SLOT_KEYS.forEach(key => reconcileSlot(domain, key));
    domain.同级对手 = [];
    ensurePeers(domain);
    const promotedName = domain.核心.名称 || `第${nextLevel}级领地`;
    pushLedger(domain, `晋升为「${promotedName}」，新起 ${count} 处建筑`);
    return { ok: true, level: nextLevel, giftCount: count, population: domain.人口 };
  }
  function settlePeerRecognition(domain, npcId, mode, reason) {
    if (!domain?.已建立) return { ok: false, reason: '尚未建立领地' };
    if (mode !== '正文结盟' && mode !== '正文吞并') return { ok: false, reason: '无效的认定类型' };
    const peer = findPeer(domain, npcId);
    if (!peer) return { ok: false, reason: '找不到该对手' };
    if (peer.状态 === '已吞并') return { ok: false, reason: '该邻居已经完成，不能重复结算' };
    const gain = annexPopGain(domain);
    peer.状态 = '已吞并';
    peer.完成方式 = mode;
    peer.认定理由 = String(reason || '').trim();
    domain.人口 = population(domain) + gain;
    pushLedger(domain, `${mode === '正文结盟' ? '与' : '吞并'}邻境业主${peer.名称 || peer.id}，丁口增 ${gain} 人`);
    return { ok: true, mode, peerName: peer.名称 || peer.id, popGain: gain, canPromote: canPromote(domain) };
  }
  function applyBattleCasualties(domain, result) {
    const summary = [];
    const deployed = new Set(deployListOf(domain));
    (result?.units || []).filter(unit => unit?.team === 'A' && deployed.has(unit.id)).forEach(unit => {
      const army = findArmy(domain, unit.id);
      if (!army) return;
      const initial = Math.max(1, number(unit.initialHp, armyHp(army)));
      const damage = Math.max(0, initial - number(unit.hp));
      if (!damage) return;
      let lost = 0;
      army.编成 = armyStacks(army).map(stack => {
        const unitHp = Math.max(1, number(findTroop(stack.兵种)?.生命) * eliteScale(stack.精锐等级));
        const quantity = Math.max(0, Math.floor(number(stack.数量)));
        const share = damage * ((unitHp * quantity) / initial);
        const dead = share < unitHp * 0.8 ? 0 : Math.min(quantity, Math.round(share / unitHp));
        lost += dead;
        return dead >= quantity ? null : { ...stack, 数量: quantity - dead };
      }).filter(Boolean);
      if (!army.编成.length) {
        dischargeArmy(domain, army.id);
        summary.push(`${army.名称 || army.id}全灭`);
      } else if (lost) summary.push(`${army.名称 || army.id}-${lost}`);
    });
    return summary;
  }
  function settlePeerBattle(domain, npcId, result) {
    const casualties = applyBattleCasualties(domain, result);
    const peer = findPeer(domain, npcId);
    let annexed = false;
    let popGain = 0;
    if (peer && result?.winner === 'A' && peer.状态 !== '已吞并') {
      peer.状态 = '已吞并';
      peer.完成方式 = '战争吞并';
      popGain = annexPopGain(domain);
      domain.人口 = population(domain) + popGain;
      annexed = true;
    }
    const outcome = result?.winner === 'A' ? '得胜' : result?.winner === 'B' ? '战败' : '未分胜负';
    pushLedger(domain, `出兵讨伐${peer?.名称 || npcId || '邻境'}，${outcome}。${casualties.length ? `折损：${casualties.join('、')}。` : ''}${annexed ? `丁口增 ${popGain} 人。` : ''}`);
    const spoils = annexed && peer?.战利品?.名称 ? clone(peer.战利品) : null;
    return { winner: result?.winner || 'draw', casualties, annexed, popGain, canPromote: canPromote(domain), spoils };
  }
  function buildRegionOverview(domain) {
    if (!domain?.已建立) return '';
    const names = [];
    SLOT_KEYS.forEach(key => {
      const slot = domain.格子[key];
      if (!slot?.建筑 || (!slot.施工动作 && number(slot.等级) < 1)) return;
      const building = buildingOf(domain, slot.建筑);
      names.push(`${building?.名称 || slot.建筑}${slot.施工动作 ? '（施工中）' : ''}`);
    });
    const core = domain.核心?.名称 ? `${domain.核心.名称} Lv${coreLevelOf(domain)}` : '';
    return [core, names.length ? `现有：${names.join('、')}` : ''].filter(Boolean).join('；');
  }
  function buildPeerOverview(domain) {
    const peers = peersOf(domain);
    if (!peers.length) return '';
    const names = peers.map(peer => peer.状态 === '已吞并'
      ? `${peer.名称 || peer.id}（${peer.完成方式 || '已完成'}）`
      : `${peer.名称 || peer.id}（存续）`);
    return `【邻境】周围有${peers.length}个同级领地，领主分别是${names.join('、')}`;
  }
  function buildFactionOverview(domain) {
    return [buildPeerOverview(domain), buildCoreHousingOverview(domain)].filter(Boolean).join('\n');
  }
  function localTroops(domain) {
    const rows = [];
    const push = stack => {
      if (!record(stack) || stack.来源 === '势力' || stack.势力键 || number(stack.数量) <= 0 || !stack.兵种) return;
      rows.push({
        军种: stack.军种 || '陆军',
        兵种: stack.兵种,
        精锐等级: Math.max(1, Math.min(5, Math.floor(number(stack.精锐等级, 1)))),
        数量: Math.floor(number(stack.数量)),
      });
    };
    domain.驻军.散兵.forEach(push);
    domain.驻军.军队.forEach(army => (Array.isArray(army?.编成) ? army.编成 : []).forEach(push));
    return rows;
  }
  function syncProjection(data) {
    const domain = domainOf(data);
    const factions = data?.stat_data?.势力;
    if (!record(domain) || !record(factions)) return false;
    const name = String(domain.领地名 || '').trim();
    Object.keys(factions).forEach(key => {
      if (key !== '$meta' && factions[key]?.$投影 && key !== name) delete factions[key];
    });
    if (!domain.已建立 || !name) return false;
    const previous = record(factions[name]) ? factions[name] : {};
    const projected = {
      ...previous,
      $投影: true,
      势力名: name,
      势力类型: '世俗领地',
      '<User>的职位': '领主',
      势力概述: buildFactionOverview(domain),
      人口数量: Math.max(0, Math.floor(number(domain.人口))),
      锚的供给量: Math.max(0, Math.floor(number(domain.人口))),
      实控区域: {
        [name]: {
          区域名: name,
          区域类型: '世俗领地',
          区域核心: String(domain.地点 || ''),
          区域人口: Math.max(0, Math.floor(number(domain.人口))),
          区域面积: number(domainConfig().areaKm2?.[domain.线路]?.[Math.max(0, Math.floor(number(domain.等级, 1)) - 1)]),
        },
      },
      世俗军队: { 陆军: {}, 海军: {}, 空军: {} },
    };
    localTroops(domain).forEach((row, index) => {
      projected.世俗军队[row.军种][`${row.兵种}-${index + 1}`] = {
        部队名: row.兵种,
        部队类型: row.军种,
        部队精锐等级: `${row.精锐等级}级`,
        部队数量: row.数量,
      };
    });
    projected.实控区域.总面积 = projected.实控区域[name].区域面积;
    projected.实控区域.实控区域汇总名单 = name;
    factions[name] = projected;
    return true;
  }
  function weeklySettle(data, cycles, pathways = {}) {
    const domain = ensureDomain(domainOf(data));
    if (!domain || !domain.已建立) return Object.freeze({ settled: false, buildings: 0, upkeep: {}, zeroed: [], housed: 0, stewards: 0, projected: false });
    const output = weeklyProduce(domain, cycles, data, pathways);
    const cost = upkeep(domain, cycles);
    const zeroed = refreshZeroed(domain);
    const housed = tickCoreHousingAffinity(domain, data, cycles);
    const stewards = stewardAffinity(domain, data, cycles);
    const projected = syncProjection(data);
    return Object.freeze({ settled: true, buildings: output.buildings, upkeep: Object.freeze(cost), zeroed: Object.freeze([...zeroed]), housed, stewards, projected });
  }

  function clearLedger(domain) {
    if (domain) domain["$流水"] = [];
  }

  function nowMinutes(mvuState) {
    const era = mvuState?.world_data?.当前时间纪元;
    if (!era) return 0;
    if (typeof window !== "undefined" && window.TimePassageEngine?._parseEra) {
      const parsed = window.TimePassageEngine._parseEra(era);
      return window.TimePassageEngine._toMinutes(parsed) || 0;
    }
    const m = String(era).match(/(\d+)年\s*(\d+)月\s*(\d+)日(?:\s*(\d+):(\d+))?/);
    if (m) {
      const year = Number(m[1]) || 1349;
      const month = Number(m[2]) || 1;
      const day = Number(m[3]) || 1;
      const hour = Number(m[4]) || 0;
      const minute = Number(m[5]) || 0;
      return (((year * 365 + month * 30 + day) * 24 + hour) * 60) + minute;
    }
    return 0;
  }

  function getWarSim() {
    if (typeof window !== "undefined") {
      if (window.cryptLord?.warSim) return window.cryptLord.warSim;
      if (window.WarSim) return { simulate: window.WarSim.simulate, settlement: window.WarReport?.settlement };
    }
    return null;
  }

  function runDrill(domain, armyIds) {
    const warEngine = getWarSim();
    const lv = clamp(Math.floor(number(domain?.等级, 1)), 1, MAX_DOMAIN_LEVEL);
    let deployedArmies = [];
    if (Array.isArray(armyIds) && armyIds.length) {
      deployedArmies = armyIds.map(id => findArmy(domain, id)).filter(Boolean);
    } else {
      deployedArmies = deployListOf(domain).map(id => findArmy(domain, id)).filter(Boolean);
    }
    if (!deployedArmies.length) {
      deployedArmies = (domain?.驻军?.军队 || []).slice(0, 4);
    }
    const teamA = deployedArmies.map((army, idx) => ({
      id: army.id,
      name: army.名称 || ("第" + (idx + 1) + "联队"),
      troopId: army.主兵种,
      x: idx % 8,
      y: 4 + Math.floor(idx / 8),
      hp: Math.max(100, armyHp(army)),
      atk: Math.max(10, armyAtk(army)),
      range: Number(findTroop(army.主兵种)?.射程) || 1,
    }));
    if (!teamA.length) {
      teamA.push({ id: "guard-a1", name: "守备卫队", x: 2, y: 4, hp: 1500, atk: 150, range: 1 });
    }
    const teamB = [
      { id: "drill-b1", name: "假想敌先锋", x: 2, y: 1, hp: 1400 * lv, atk: 140 * lv, range: 1 },
      { id: "drill-b2", name: "假想敌重步兵", x: 3, y: 1, hp: 1700 * lv, atk: 130 * lv, range: 1 },
      { id: "drill-b3", name: "假想敌弓弩手", x: 2, y: 0, hp: 1000 * lv, atk: 190 * lv, range: 3 },
      { id: "drill-b4", name: "假想敌游击队", x: 4, y: 0, hp: 1100 * lv, atk: 150 * lv, range: 2 },
    ];
    const simResult = warEngine?.simulate
      ? warEngine.simulate({ seed: Date.now(), teams: { A: teamA, B: teamB } })
      : { winner: "A", reason: "wipeout", ticks: 40, units: [...teamA, ...teamB] };
    const report = warEngine?.settlement ? warEngine.settlement(simResult) : { winner: simResult.winner, units: simResult.units };
    const winMsg = simResult.winner === "A" ? "我军获胜" : simResult.winner === "B" ? "假想敌获胜" : "双方战平";
    pushLedger(domain, "举行沙盘军演，" + winMsg + "。", "决策");
    return {
      isDrill: true,
      winner: simResult.winner,
      result: simResult,
      settlement: report,
      summary: "沙盘军演演练完毕：" + (simResult.winner === "A" ? "红方（我军）战胜" : "蓝方（假想敌）取胜"),
    };
  }

  function runPeerBattle(domain, peerId, armyIds, mvuState, formation = {}) {
    const warEngine = getWarSim();
    const peer = findPeer(domain, peerId);
    if (!peer) return { ok: false, reason: "未找到指定邻境领地" };
    if (peer.状态 === "已吞并") return { ok: false, reason: "该邻境已被吞并" };
    let deployedArmies = [];
    if (Array.isArray(armyIds) && armyIds.length) {
      deployedArmies = armyIds.map(id => findArmy(domain, id)).filter(Boolean);
    } else {
      deployedArmies = deployListOf(domain).map(id => findArmy(domain, id)).filter(Boolean);
    }
    if (!deployedArmies.length) {
      deployedArmies = (domain?.驻军?.军队 || []).slice(0, 4);
    }
    if (!deployedArmies.length) {
      return { ok: false, reason: "领地尚未编成出战部队" };
    }
    const teamA = deployedArmies.map((army, idx) => ({
      id: army.id,
      name: army.名称 || ("第" + (idx + 1) + "联队"),
      troopId: army.主兵种,
      x: Number.isInteger(formation[army.id]?.x) ? formation[army.id].x : idx % 8,
      y: Number.isInteger(formation[army.id]?.y) ? formation[army.id].y : 4 + Math.floor(idx / 8),
      hp: Math.max(100, armyHp(army)),
      atk: Math.max(10, armyAtk(army)),
      range: Number(findTroop(army.主兵种)?.射程) || 1,
    }));
    const piecesB = peerPieces(domain, peerId);
    const teamB = piecesB.length ? piecesB.map((p, idx) => ({
      id: p.id,
      name: p.name,
      troopId: p.troopId,
      x: p.x,
      y: p.y,
      hp: p.hp,
      atk: p.atk,
      range: Number(findTroop(p.troopId)?.射程) || 1,
    })) : [{ id: "peer-" + peer.id + "-1", name: peer.名称 + "护卫队", x: 2, y: 1, hp: 1600, atk: 150, range: 1 }];
    const simResult = warEngine?.simulate
      ? warEngine.simulate({ seed: Date.now(), teams: { A: teamA, B: teamB } })
      : { winner: "A", reason: "wipeout", ticks: 45, units: [...teamA, ...teamB] };
    const report = warEngine?.settlement ? warEngine.settlement(simResult) : { winner: simResult.winner, units: simResult.units };
    const battleSettlement = settlePeerBattle(domain, peerId, simResult);
    return { ok: true, isDrill: false, peer, winner: simResult.winner, result: simResult, settlement: report, battleSettlement };
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        handlers: Object.freeze([
          'domain-building-production', 'domain-construction', 'domain-core-rooms',
          'domain-recruit-training', 'domain-garrison-formation', 'domain-peer-promotion',
          'domain-garrison-upkeep', 'domain-zeroed-elites', 'domain-housing-affinity',
          'domain-steward-affinity', 'domain-faction-projection',
        ]),
        configSource: window.GameDBManager?.DB?.domainConfig?.stages?.[1] ? 'GameDBManager'
          : modules['cryptLord.domainDefaults'] ? 'original-defaults' : 'compat-defaults',
      });
    },
    SLOT_KEYS,
    ensureDomain,
    stageConfig,
    buildingDefs,
    buildingLabel,
    ladderName,
    foundationLevels,
    missedFoundationSpoils,
    setFoundationTarget,
    foundDomain,
    buildingOf,
    recipeOf,
    actionIndex,
    actionForSlot,
    slotLabor,
    usedLabor,
    population,
    reconcileSlot,
    nowMinutes,
    clearLedger,
    goldCost,
    durationOf,
    goodsCost,
    costOf,
    lacksGoods,
    applyGoods,
    startConstruction,
    beginConstruction,
    cancelConstruction,
    demolishBuilding,
    toggleBuilding,
    sweepConstruction,
    coreLevelOf,
    roomCount,
    roomsOf,
    ensureRooms,
    listGuestRoomKeys,
    findRoomByGuest,
    renameRoom,
    assignRoom,
    clearRoom,
    toggleRoomResident,
    coreUpgradeCost,
    startCoreUpgrade,
    beginCoreUpgrade,
    cancelCoreUpgrade,
    sweepCoreConstruction,
    tickCoreHousingAffinity,
    buildCoreHousingOverview,
    assignSteward,
    clearSteward,
    BRANCHES,
    recruitConfig,
    troopDefs,
    findTroop,
    troopsOfBranch,
    eliteScale,
    trainMinutes,
    recruitGold,
    recruit,
    maxDeploy,
    fieldsOfBranch,
    branchCanFight,
    garrisonOf,
    trainingOf,
    deployListOf,
    zeroedOf,
    isFactionStack,
    stackKey,
    looseKey,
    stackDisplayName,
    listFactionLoose,
    listLocalLoose,
    listAvailableLoose,
    findAvailableLoose,
    addLoose,
    takeLoose,
    takeLooseByKey,
    dischargeLoose,
    looseCount,
    enqueueTraining,
    sweepTraining,
    cancelTraining,
    eliteCounts,
    totalTroops,
    upkeepFromCounts,
    upkeepGoods,
    unitUpkeep,
    goodsEquiv,
    shortageKeys,
    elitesNeeding,
    zeroedElites,
    isEliteZeroed,
    armyStacks,
    armyHp,
    armyAtk,
    armyShield,
    armyCount,
    armyElite,
    armyQuality,
    mainTypeRatio,
    validateArmy,
    armyZeroedElites,
    canDeploy,
    formArmy,
    findArmy,
    disbandArmy,
    dischargeArmy,
    deployableArmies,
    toggleDeploy,
    deployPieces,
    pruneDeploy,
    peersOf,
    ensurePeers,
    findPeer,
    peerPieces,
    annexPopGain,
    oldWeeklyYield,
    promoteGiftCount,
    canPromote,
    promote,
    settlePeerRecognition,
    applyBattleCasualties,
    settlePeerBattle,
    runDrill,
    runPeerBattle,
    buildRegionOverview,
    buildPeerOverview,
    buildFactionOverview,
    weeklySettle,
    refreshZeroed,
    syncProjection,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
