// Generated from the complete original equipment enhancement mode, catalog and weapon resolver.
(() => {
  'use strict';
  const KEY = 'cryptLord.enhancementReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps = {}) {
    const window = deps.window || {};
    const document = window.document;
    const SavantMaterialMode = deps.material || { cloneValue: value => structuredClone(value),
      rankOfGrade: value => modules['cryptLord.savantMaterial'].rankOf(value) };
    const classifier = modules['cryptLord.weaponClassifier'];
    const WEAPON_CLASS_VOCAB = classifier.vocab;
    const isWeaponClassValid = value => classifier.valid(value);
    const parseItemSequenceRank = value => classifier.rankOf(value);
    const ConsumableMoveBuilder = {
      isAttackEffect: value => ['物理攻击', '法术攻击', '精神攻击', '命运攻击'].includes(value),
      isHealEffect: value => ['活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复'].includes(value),
    };
    class SkillLoader {
      static ACCURACY_RANK_MIN = 7;
      static WEAPON_CLASS_FIELD = '$战斗分类';
static weaponAccuracyClass(item) {
        if (!item || typeof item !== 'object') return null;
        const rank = parseItemSequenceRank(item.序列);
        if (!Number.isFinite(rank) || rank < SkillLoader.ACCURACY_RANK_MIN) return null;
        const cls = item[SkillLoader.WEAPON_CLASS_FIELD];
        return isWeaponClassValid(cls) ? cls : null;
    }
static hasLegacyWeaponEffect(item) {
        const base = item && item.战斗效果 && item.战斗效果.基础效果;
        return ConsumableMoveBuilder.isAttackEffect(base) || ConsumableMoveBuilder.isHealEffect(base);
    }
static playerWeaponBuildMode(item) {
        if (!item || typeof item !== 'object') return null;
        const rank = parseItemSequenceRank(item.序列);
        const cls = SkillLoader.weaponAccuracyClass(item);
        const hasLegacy = SkillLoader.hasLegacyWeaponEffect(item);

        if (Number.isFinite(rank) && rank < SkillLoader.ACCURACY_RANK_MIN) {
            return hasLegacy ? 'legacy' : null;
        }
        if (Number.isFinite(rank) && rank <= 9 && cls && cls.射程 === '近战' && hasLegacy) {
            return 'legacy';
        }
        if (cls) return 'accuracy';
        return hasLegacy ? 'legacy' : null;
    }
    }
const SAVANT_MODULE_RARITIES = Object.freeze(['普通', '精良', '稀有', '史诗', '传说', '神话']);
const SAVANT_MODULE_RARITY_MULT = Object.freeze({ 普通: 1, 精良: 1.2, 稀有: 1.5, 史诗: 1.9, 传说: 2.4, 神话: 3 });
const SAVANT_MODULE_PROBABILITIES = Object.freeze({
  普通: [90, 10, 0, 0, 0, 0],
  序列9: [75, 23, 2, 0, 0, 0],
  序列8: [60, 32, 8, 0, 0, 0],
  序列7: [45, 38, 15, 2, 0, 0],
  序列6: [32, 38, 24, 6, 0, 0],
  序列5: [20, 32, 32, 14, 2, 0],
  序列4: [12, 25, 36, 22, 5, 0],
  序列3: [6, 18, 32, 30, 12, 2],
  序列2: [3, 10, 27, 34, 21, 5],
  序列1: [1, 5, 19, 34, 31, 10],
  序列0: [0, 2, 12, 28, 38, 20],
  旧日: [0, 0, 5, 18, 42, 35],
  支柱: [0, 0, 2, 8, 35, 55],
});
const SAVANT_MODULE_ROLE_NAMES = Object.freeze([
  '', '主质增幅', '副质增幅', '辅质增幅', '双相增幅', '均衡矩阵',
  '极化核心', '偏置回路', '超载框架',
]);
const SAVANT_MODULE_ROLE_MIN_RARITY = Object.freeze([
  '', '普通', '普通', '普通', '精良', '精良', '稀有', '稀有', '史诗', '稀有', '史诗', '传说', '神话',
]);
const SAVANT_MODULE_FAMILY_META = Object.freeze({
  金属: {
    slug: 'metal', prefix: '锻钢', stats: ['活力', '敏捷', '灵性', '人性'],
    weapons: [
      { name: '精密膛线', ratios: { 活力: 6, 敏捷: 4 }, mundane: { up: { 精度: 1 } }, extraordinary: { attackBase: '物理攻击' } },
      { name: '增压击锤', ratios: { 敏捷: 6, 灵性: 4 }, mundane: { up: { 威力量级: 1 } }, extraordinary: { extra: '攻击BUFF' } },
    ],
    productions: [
      { name: '标准化工装', ratios: { 活力: 6, 灵性: 4 }, type: 'craftDiscount', value: 0.08 },
      { name: '耐久修复架', ratios: { 敏捷: 6, 灵性: 4 }, type: 'repairBonus', value: 0.12 },
    ],
  },
  木质: {
    slug: 'wood', prefix: '年轮', stats: ['活力', '人性', '敏捷', '理智'],
    weapons: [
      { name: '弹性校准架', ratios: { 活力: 6, 人性: 4 }, mundane: { up: { 精度: 1 } }, extraordinary: { extra: '速度BUFF' } },
      { name: '延伸导轨', ratios: { 人性: 6, 敏捷: 4 }, mundane: { up: { 射程: 1 } }, extraordinary: { scope: '全体' } },
    ],
    productions: [
      { name: '回收导槽', ratios: { 活力: 6, 敏捷: 4 }, type: 'yieldBonus', value: 0.10 },
      { name: '自愈工台', ratios: { 人性: 6, 敏捷: 4 }, type: 'repairBonus', value: 0.12 },
    ],
  },
  岩石: {
    slug: 'rock', prefix: '磐岩', stats: ['活力', '理智', '人性', '敏捷'],
    weapons: [
      { name: '重压配重', ratios: { 活力: 6, 理智: 4 }, mundane: { up: { 威力量级: 1 } }, extraordinary: { attackBase: '物理攻击' } },
      { name: '震波扩散器', ratios: { 理智: 6, 人性: 4 }, mundane: { up: { AOE: 1 }, down: { 精度: 1 } }, extraordinary: { scope: '全体', extra: '防御DEBUFF' } },
    ],
    productions: [
      { name: '定量砧座', ratios: { 活力: 6, 人性: 4 }, type: 'craftDiscount', value: 0.08 },
      { name: '稳固维修座', ratios: { 理智: 6, 人性: 4 }, type: 'repairBonus', value: 0.12 },
    ],
  },
  晶体: {
    slug: 'crystal', prefix: '棱晶', stats: ['灵性', '理智', '运气', '活力'],
    weapons: [
      { name: '术式折射镜', ratios: { 灵性: 6, 理智: 4 }, mundane: { up: { 精度: 1 } }, extraordinary: { attackBase: '法术攻击' } },
      { name: '命运分光器', ratios: { 理智: 6, 运气: 4 }, mundane: { up: { 射程: 1 } }, extraordinary: { attackBase: '命运攻击' } },
    ],
    productions: [
      { name: '误差校准阵', ratios: { 灵性: 6, 运气: 4 }, type: 'successBonus', value: 4 },
      { name: '纯化折射阵', ratios: { 理智: 6, 运气: 4 }, type: 'yieldBonus', value: 0.10 },
    ],
  },
  纤维: {
    slug: 'fiber', prefix: '灵织', stats: ['敏捷', '活力', '运气', '灵性'],
    weapons: [
      { name: '稳定束带', ratios: { 敏捷: 6, 活力: 4 }, mundane: { up: { 精度: 1 } }, extraordinary: { extra: '速度BUFF' } },
      { name: '远距导索', ratios: { 活力: 6, 运气: 4 }, mundane: { up: { 射程: 1 }, down: { 威力量级: 1 } }, extraordinary: { scope: '全体', extra: '速度DEBUFF' } },
    ],
    productions: [
      { name: '无损包覆层', ratios: { 敏捷: 6, 运气: 4 }, type: 'craftDiscount', value: 0.08 },
      { name: '精细过滤网', ratios: { 活力: 6, 运气: 4 }, type: 'yieldBonus', value: 0.10 },
    ],
  },
  生物: {
    slug: 'bio', prefix: '活体', stats: ['活力', '敏捷', '人性', '理智'],
    weapons: [
      { name: '神经瞄具', ratios: { 活力: 6, 敏捷: 4 }, mundane: { up: { 精度: 1 } }, extraordinary: { extra: '速度BUFF' } },
      { name: '再生导管', ratios: { 敏捷: 6, 人性: 4 }, mundane: { up: { 威力量级: 1 } }, extraordinary: { healBase: '活力恢复', extra: '防御BUFF' } },
    ],
    productions: [
      { name: '再生修复腔', ratios: { 活力: 6, 人性: 4 }, type: 'repairBonus', value: 0.12 },
      { name: '增殖培养囊', ratios: { 敏捷: 6, 人性: 4 }, type: 'yieldBonus', value: 0.10 },
    ],
  },
  化学: {
    slug: 'chemical', prefix: '炼剂', stats: ['敏捷', '灵性', '活力', '人性'],
    weapons: [
      { name: '爆压药室', ratios: { 敏捷: 6, 灵性: 4 }, mundane: { up: { 威力量级: 1 }, down: { 精度: 1 } }, extraordinary: { attackBase: '物理攻击', extra: '攻击BUFF' } },
      { name: '扩散喷口', ratios: { 灵性: 6, 活力: 4 }, mundane: { up: { AOE: 1 } }, extraordinary: { scope: '全体', extra: '攻击DEBUFF' } },
    ],
    productions: [
      { name: '催化控制阀', ratios: { 敏捷: 6, 活力: 4 }, type: 'successBonus', value: 4 },
      { name: '高效萃取槽', ratios: { 灵性: 6, 活力: 4 }, type: 'yieldBonus', value: 0.10 },
    ],
  },
  灵性: {
    slug: 'spiritual', prefix: '魂印', stats: ['灵性', '人性', '运气', '理智'],
    weapons: [
      { name: '心智转频器', ratios: { 灵性: 6, 人性: 4 }, mundane: { up: { 精度: 1 } }, extraordinary: { attackBase: '精神攻击' } },
      { name: '命运刻写器', ratios: { 人性: 6, 运气: 4 }, mundane: { up: { 射程: 1 } }, extraordinary: { attackBase: '命运攻击', extra: '攻击DEBUFF' } },
    ],
    productions: [
      { name: '稳定仪轨', ratios: { 灵性: 6, 运气: 4 }, type: 'successBonus', value: 4 },
      { name: '低耗刻写阵', ratios: { 人性: 6, 运气: 4 }, type: 'craftDiscount', value: 0.08 },
    ],
  },
});
function savantModuleGenericRatios(meta, role) {
  const [primary, secondary, tertiary, cost] = meta.stats;
  if (role === 1) return { [primary]: 12 };
  if (role === 2) return { [secondary]: 12 };
  if (role === 3) return { [tertiary]: 12 };
  if (role === 4) return { [primary]: 8, [secondary]: 8 };
  if (role === 5) return { [primary]: 7, [secondary]: 7, [tertiary]: 7 };
  if (role === 6) return { [primary]: 16, [cost]: -5 };
  if (role === 7) return { [primary]: 12, [secondary]: 10, [cost]: -6 };
  if (role === 8) return { [primary]: 18, [secondary]: 8, [tertiary]: 6, [cost]: -10 };
  return {};
}
const SAVANT_EQUIPMENT_MODULE_CONFIG = Object.freeze(Object.fromEntries(
  Object.entries(SAVANT_MODULE_FAMILY_META).map(([family, meta]) => {
    const rows = [];
    for (let role = 1; role <= 12; role++) {
      let name = `${meta.prefix}·${SAVANT_MODULE_ROLE_NAMES[role] || ''}`;
      let ratios = savantModuleGenericRatios(meta, role);
      let weapon = null;
      let production = null;
      if (role === 9 || role === 10) {
        const spec = meta.weapons[role - 9];
        name = `${meta.prefix}·${spec.name}`;
        ratios = spec.ratios;
        weapon = { mundane: spec.mundane || null, extraordinary: spec.extraordinary || null };
      } else if (role === 11 || role === 12) {
        const spec = meta.productions[role - 11];
        name = `${meta.prefix}·${spec.name}`;
        ratios = spec.ratios;
        production = { type: spec.type, value: spec.value };
      }
      rows.push(Object.freeze({
        id: `${meta.slug}-${role}`, family, name, role,
        minRarity: SAVANT_MODULE_ROLE_MIN_RARITY[role], ratios: Object.freeze({ ...ratios }),
        weapon: weapon ? Object.freeze(weapon) : null,
        production: production ? Object.freeze(production) : null,
      }));
    }
    return [family, Object.freeze(rows)];
  })
));
const EquipmentModuleWeaponResolver = {
  ATTACKS: Object.freeze(['物理攻击', '法术攻击', '精神攻击', '命运攻击']),
  HEALS: Object.freeze(['活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复']),
  EXTRAS: Object.freeze(['攻击BUFF', '防御BUFF', '速度BUFF', '攻击DEBUFF', '防御DEBUFF', '速度DEBUFF']),

  clone(value) {
    try {
      if (typeof _ !== 'undefined' && _ && typeof _.cloneDeep === 'function') return _.cloneDeep(value);
      return JSON.parse(JSON.stringify(value));
    } catch (_) { return value; }
  },

  statData(context) {
    if (!context || typeof context !== 'object') return null;
    return context.stat_data && typeof context.stat_data === 'object' ? context.stat_data : context;
  },

  moduleBag(context) {
    const sd = this.statData(context);
    const play = sd && sd['$专属玩法'] && sd['$专属玩法']['通识者途径']
      && sd['$专属玩法']['通识者途径']['装备强化玩法'];
    const bag = play && play.模块仓库;
    return bag && typeof bag === 'object' && !Array.isArray(bag) ? bag : null;
  },

  installedRecord(item, context, location = null) {
    const install = item && item['$强化模块安装'];
    const id = install && install.模块ID;
    const bag = id && this.moduleBag(context);
    const rec = bag && bag[id];
    if (!rec || typeof rec !== 'object' || !rec.安装位置) return null;
    if (location && (rec.安装位置.列表键 !== location.列表键 || rec.安装位置.物品键 !== location.物品键)) {
      return null;
    }
    return rec;
  },

  positiveSteps(rarity) {
    const index = SAVANT_MODULE_RARITIES.indexOf(String(rarity || ''));
    if (index < 2) return 0;
    return index >= 4 ? 2 : 1;
  },

  shift(value, vocabulary, delta) {
    const index = vocabulary.indexOf(value);
    if (index < 0) return value;
    return vocabulary[Math.max(0, Math.min(vocabulary.length - 1, index + delta))];
  },

  applyMundane(classification, spec, rarity) {
    const out = this.clone(classification);
    const positive = this.positiveSteps(rarity);
    const apply = (changes, direction) => Object.entries(changes || {}).forEach(([field, raw]) => {
      const vocabulary = WEAPON_CLASS_VOCAB[field];
      if (!Array.isArray(vocabulary)) return;
      if (field === '精度' && out[field] === '近战无精度') return;
      const requested = Math.max(1, Math.floor(Number(raw) || 1));
      const delta = direction > 0 ? positive * requested : -requested;
      if (delta) out[field] = this.shift(out[field], vocabulary, delta);
    });
    apply(spec && spec.up, 1);
    apply(spec && spec.down, -1);
    return isWeaponClassValid(out) ? out : classification;
  },

  applyExtraordinary(battle, spec) {
    const out = this.clone(battle);
    const base = String(out.基础效果 || '');
    if (!this.ATTACKS.includes(base) && !this.HEALS.includes(base)) return battle;
    if (spec && spec.attackBase && this.ATTACKS.includes(base) && this.ATTACKS.includes(spec.attackBase)) {
      out.基础效果 = spec.attackBase;
    }
    if (spec && spec.healBase && this.HEALS.includes(base) && this.HEALS.includes(spec.healBase)) {
      out.基础效果 = spec.healBase;
    }
    if (spec && this.EXTRAS.includes(spec.extra)) out.额外效果 = spec.extra;
    if (spec && ['单体', '全体'].includes(spec.scope)) out.范围 = spec.scope;
    return out;
  },

  resolve(item, context, location = null) {
    if (!item || typeof item !== 'object') return item;
    const rec = this.installedRecord(item, context, location);
    const weapon = rec && rec.武器效果;
    if (!weapon || typeof weapon !== 'object') return item;
    const out = this.clone(item);
    const mode = SkillLoader.playerWeaponBuildMode(out);
    if (mode === 'legacy') {
      const battle = out.战斗效果;
      if (!battle || typeof battle !== 'object') return out;
      const base = String(battle.基础效果 || '');
      if (!this.ATTACKS.includes(base) && !this.HEALS.includes(base)) return out;
      out.战斗效果 = this.applyExtraordinary(battle, weapon.extraordinary);
      return out;
    }
    const classification = out['$战斗分类'];
    if (!isWeaponClassValid(classification)) return out;
    out['$战斗分类'] = this.applyMundane(classification, weapon.mundane, rec.品质);
    return out;
  },

  status(item, context) {
    const rec = this.installedRecord(item, context);
    if (!rec || !rec.武器效果) return { active: false, text: '无武器参数效果' };
    return SkillLoader.playerWeaponBuildMode(item)
      ? { active: true, text: '武器效果已生效' }
      : { active: false, text: '休眠：等待有效战斗参数' };
  },
};
const SavantEquipmentEnhancementMode = {
  id: 'savant-equipment-enhancement',
  途径: '通识者',
  途径全名: '通识者途径',
  名称: '装备强化模块',
  图标: '🧩',
  GATE: 6,
  TITLE: '知识之妖',
  STORE_PLAY: '装备强化玩法',
  STORE_BAG: '模块仓库',
  STORE_PITY: '抽取统计',
  STAT_KEYS: Object.freeze(['活力', '灵性', '理智', '人性', '敏捷', '运气']),
  EQUIPMENT_CATS: Object.freeze([
    { title: '武器', key: '武器列表' },
    { title: '衣物', key: '衣物列表' },
    { title: '饰品', key: '饰品列表' },
    { title: '封印物', key: '封印物列表' },
  ]),

  resolve(sequenceString) { return SavantMaterialMode.resolve(sequenceString); },
  gate(win) { return this.resolve(SavantMaterialMode.effectiveSequence(win)); },
  clone(value) { return SavantMaterialMode.cloneValue(value); },

  random() {
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] / 4294967296;
    }
    return Math.random();
  },

  store(mvuState, create) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return null;
    let root = sd['$专属玩法'];
    if (!root || typeof root !== 'object' || Array.isArray(root)) {
      if (!create) return null;
      root = sd['$专属玩法'] = {};
    }
    let pathway = root[this.途径全名];
    if (!pathway || typeof pathway !== 'object' || Array.isArray(pathway)) {
      if (!create) return null;
      pathway = root[this.途径全名] = {};
    }
    let play = pathway[this.STORE_PLAY];
    if (!play || typeof play !== 'object' || Array.isArray(play)) {
      if (!create) return null;
      play = pathway[this.STORE_PLAY] = {
        版本: 1,
        [this.STORE_BAG]: {},
        [this.STORE_PITY]: { 周期抽数: 0, 周期材料总分: 0, 总抽数: 0 },
      };
    }
    let bag = play[this.STORE_BAG];
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
      if (create) bag = play[this.STORE_BAG] = {};
      else bag = null;
    }
    let pity = play[this.STORE_PITY];
    if (!pity || typeof pity !== 'object' || Array.isArray(pity)) {
      if (create) pity = play[this.STORE_PITY] = { 周期抽数: 0, 周期材料总分: 0, 总抽数: 0 };
      else pity = null;
    }
    return { play, bag, pity };
  },

  state(win) {
    if (!win._modeState) win._modeState = {};
    if (!win._modeState[this.id]) {
      win._modeState[this.id] = {
        view: 'main', materialSignature: '', moduleId: '', drawResults: [],
      };
    }
    return win._modeState[this.id];
  },

  scope() {
    return document.querySelector(`#ppw-body [data-ppw-mode="${this.id}"]`);
  },

  modules(mvuState) {
    const store = this.store(mvuState, false);
    const bag = store && store.bag;
    if (!bag) return [];
    return Object.keys(bag)
      .filter(id => id !== '$meta' && bag[id] && typeof bag[id] === 'object')
      .map(id => ({ id, data: bag[id] }));
  },

  moduleOf(mvuState, id) {
    const store = this.store(mvuState, false);
    const rec = store && store.bag && store.bag[id];
    return rec && typeof rec === 'object' ? rec : null;
  },

  equipmentRows(mvuState) {
    const sd = mvuState && mvuState.stat_data;
    const rows = [];
    if (!sd) return rows;
    this.EQUIPMENT_CATS.forEach(category => {
      const list = sd[category.key];
      if (!list || typeof list !== 'object' || Array.isArray(list)) return;
      Object.keys(list).forEach(itemKey => {
        if (itemKey === '$meta') return;
        const item = list[itemKey];
        if (!item || typeof item !== 'object') return;
        rows.push({
          category: category.title, listKey: category.key, itemKey, item,
          name: String(item.名称 || item.name || itemKey),
        });
      });
    });
    return rows;
  },

  findEquipment(mvuState, listKey, itemKey) {
    const sd = mvuState && mvuState.stat_data;
    const item = sd && sd[listKey] && sd[listKey][itemKey];
    return item && typeof item === 'object' ? item : null;
  },

  hasInstalledModule(item) {
    return !!(item && item['$强化模块安装'] && item['$强化模块安装'].模块ID);
  },

  refreshEquipment(win) {
    const game = win && win.game;
    const state = game && game.currentMvuState;
    if (!game || !state || !state.stat_data) return;
    try {
      if (typeof game.syncEquippedItemsFromBooleans === 'function') game.syncEquippedItemsFromBooleans(state.stat_data);
      if (typeof game.refreshEquipmentSlots === 'function') game.refreshEquipmentSlots();
      if (typeof game.updateDisplayedAttributes === 'function') game.updateDisplayedAttributes();
    } catch (error) {
      console.warn('[装备强化] 装备刷新失败', error);
    }
  },

  async persistAndRefresh(win) {
    this.refreshEquipment(win);
    win.persist();
    await win.persistZero();
  },

  reconcile(mvuState) {
    const store = this.store(mvuState, false);
    const bag = (store && store.bag) || {};
    const rows = this.equipmentRows(mvuState);
    let changed = false;

    // 宿主被外部变量修改器删除时，模块随宿主永久丢失，不能绕过卸下风险免费回收。
    Object.keys(bag).forEach(id => {
      if (id === '$meta') return;
      const rec = bag[id];
      const pos = rec && rec.安装位置;
      if (!pos) return;
      const item = this.findEquipment(mvuState, pos.列表键, pos.物品键);
      if (!item || !item['$强化模块安装'] || item['$强化模块安装'].模块ID !== id) {
        delete bag[id];
        changed = true;
      }
    });

    // 装备上的孤立引用不能继续提供属性；按保存的精确增量撤销。
    rows.forEach(row => {
      const install = row.item['$强化模块安装'];
      if (!install || !install.模块ID) return;
      const rec = bag[install.模块ID];
      const pos = rec && rec.安装位置;
      if (pos && pos.列表键 === row.listKey && pos.物品键 === row.itemKey) return;
      this.STAT_KEYS.forEach(key => {
        row.item[key] = (Number(row.item[key]) || 0)
          - (Number(install.属性增量 && install.属性增量[key]) || 0);
      });
      delete row.item['$强化模块安装'];
      changed = true;
    });
    return changed;
  },

  moduleId() {
    return `enhance-${Date.now().toString(36)}-${Math.floor(this.random() * 0xFFFFFFFF).toString(36)}`;
  },
};
Object.assign(SavantEquipmentEnhancementMode, {
  gradeScore(grade) {
    const rank = SavantMaterialMode.rankOfGrade(String(grade || '普通'));
    if (rank === null) return 0;
    if (rank === -2) return 12;
    if (rank === -1) return 11;
    return Math.max(0, 10 - rank);
  },

  probabilities(grade) {
    return (SAVANT_MODULE_PROBABILITIES[String(grade || '')]
      || SAVANT_MODULE_PROBABILITIES.普通).slice();
  },

  pityFloor(averageScore) {
    const score = Number(averageScore) || 0;
    if (score >= 10) return 5;
    if (score >= 7) return 4;
    if (score >= 5) return 3;
    if (score >= 2) return 2;
    return 1;
  },

  rollRarity(weights, floor = 0) {
    const usable = weights.map((weight, index) => index >= floor ? Math.max(0, Number(weight) || 0) : 0);
    const total = usable.reduce((sum, weight) => sum + weight, 0);
    if (!(total > 0)) return Math.max(0, Math.min(SAVANT_MODULE_RARITIES.length - 1, floor));
    let roll = this.random() * total;
    for (let index = 0; index < usable.length; index++) {
      roll -= usable[index];
      if (roll < 0) return index;
    }
    return usable.length - 1;
  },

  finalRatios(config, rarity) {
    const multiplier = SAVANT_MODULE_RARITY_MULT[rarity] || 1;
    return Object.fromEntries(Object.entries(config.ratios || {}).map(([key, value]) => [
      key, Number((Number(value) * multiplier).toFixed(2)),
    ]));
  },

  finalProduction(config, rarity) {
    if (!config.production) return null;
    const multiplier = SAVANT_MODULE_RARITY_MULT[rarity] || 1;
    return {
      type: config.production.type,
      value: Number((Number(config.production.value) * multiplier).toFixed(6)),
    };
  },

  rollModule(group, pity) {
    pity.周期抽数 = Math.max(0, Math.floor(Number(pity.周期抽数) || 0)) + 1;
    pity.周期材料总分 = Number(pity.周期材料总分 || 0) + this.gradeScore(group.grade);
    pity.总抽数 = Math.max(0, Math.floor(Number(pity.总抽数) || 0)) + 1;
    const isPity = pity.周期抽数 >= 20;
    const average = pity.周期材料总分 / pity.周期抽数;
    const rarityIndex = this.rollRarity(
      this.probabilities(group.grade),
      isPity ? this.pityFloor(average) : 0,
    );
    const rarity = SAVANT_MODULE_RARITIES[rarityIndex];
    const candidates = (SAVANT_EQUIPMENT_MODULE_CONFIG[group.family] || [])
      .filter(config => SAVANT_MODULE_RARITIES.indexOf(config.minRarity) <= rarityIndex);
    if (!candidates.length) throw new Error('当前材质族没有可抽取模块');
    const config = candidates[Math.floor(this.random() * candidates.length)];
    let id = this.moduleId();
    const rec = {
      名称: config.name,
      模板ID: config.id,
      品质: rarity,
      材质族: group.family,
      来源材料: group.material,
      材料等级: group.grade,
      六维比例: this.finalRatios(config, rarity),
      武器效果: config.weapon ? this.clone(config.weapon) : null,
      生产增益: this.finalProduction(config, rarity),
      卸下次数: 0,
      安装位置: null,
      '$抽取时间': new Date().toISOString(),
      '$保底抽取': isPity,
    };
    if (isPity) {
      pity.周期抽数 = 0;
      pity.周期材料总分 = 0;
    }
    return { id, rec };
  },

  async draw(win) {
    const state = win.game && win.game.currentMvuState;
    const ui = this.state(win);
    const group = SavantMaterialMode.materialGroup(state, ui.materialSignature);
    const input = this.scope()?.querySelector('[data-enhance-draw-qty]');
    const quantity = Math.max(1, Math.floor(Number(input && input.value) || 1));
    if (!group || !SAVANT_EQUIPMENT_MODULE_CONFIG[group.family]) {
      win.msg('请选择有效的加工材料。');
      return;
    }
    if (quantity > Math.floor(group.qty + 1e-6)) {
      win.msg('材料数量不足。');
      return;
    }
    if (!window.confirm(`确定消耗${quantity}份“${group.material}”进行${quantity}次模块抽取吗？`)) return;

    const materialStore = SavantMaterialMode.playStore(state, false);
    const materialBackup = materialStore && materialStore.bag ? this.clone(materialStore.bag) : null;
    const enhancement = this.store(state, true);
    const enhancementBackup = this.clone(enhancement.play);
    try {
      const results = [];
      for (let index = 0; index < quantity; index++) {
        const result = this.rollModule(group, enhancement.pity);
        while (enhancement.bag[result.id]) result.id = this.moduleId();
        results.push(result);
      }
      SavantMaterialMode.consumeMaterialPlans(state, [{ signature: group.signature, qty: quantity }]);
      results.forEach(result => { enhancement.bag[result.id] = result.rec; });
      ui.drawResults = results;
      await this.persistAndRefresh(win);
      win.msg(`抽取完成，获得${results.length}个强化模块。`, 3500);
      win.render();
    } catch (error) {
      SavantMaterialMode.restoreMaterialStore(materialStore, materialBackup);
      Object.keys(enhancement.play).forEach(key => delete enhancement.play[key]);
      Object.assign(enhancement.play, enhancementBackup);
      win.persist();
      win.msg('抽取失败，材料未消耗：' + (error.message || error), 4500);
      win.render();
    }
  },
});
Object.assign(SavantEquipmentEnhancementMode, {
  async install(win) {
    const state = win.game && win.game.currentMvuState;
    const ui = this.state(win);
    const rec = this.moduleOf(state, ui.moduleId);
    const raw = String(this.scope()?.querySelector('[data-enhance-host]')?.value || '');
    let location = [];
    try { location = JSON.parse(decodeURIComponent(raw)); } catch (_) { location = []; }
    const item = location.length === 2 ? this.findEquipment(state, location[0], location[1]) : null;
    if (!rec || rec.安装位置) { win.msg('模块状态无效。'); return; }
    if (!item) { win.msg('请选择目标装备。'); return; }
    if (this.hasInstalledModule(item)) { win.msg('该装备已有强化模块，请先卸下。'); return; }

    const itemBackup = this.clone(item);
    const positionBackup = this.clone(rec.安装位置);
    const deltas = {};
    this.STAT_KEYS.forEach(key => {
      const base = Number(item[key]) || 0;
      const ratio = Number(rec.六维比例 && rec.六维比例[key]) || 0;
      if (!base || !ratio) { deltas[key] = 0; return; }
      let amount = Math.round(Math.abs(base) * Math.abs(ratio) / 100);
      if (amount < 1) amount = 1;
      deltas[key] = ratio > 0 ? amount : -amount;
      item[key] = base + deltas[key];
    });
    item['$强化模块安装'] = { 模块ID: ui.moduleId, 属性增量: deltas };
    const row = this.equipmentRows(state)
      .find(entry => entry.listKey === location[0] && entry.itemKey === location[1]);
    rec.安装位置 = {
      列表键: location[0],
      物品键: location[1],
      装备名称: row ? row.name : String(item.名称 || location[1]),
    };
    try {
      await this.persistAndRefresh(win);
      win.msg(`“${rec.名称}”已安装。`);
    } catch (error) {
      Object.keys(item).forEach(key => delete item[key]);
      Object.assign(item, itemBackup);
      rec.安装位置 = positionBackup;
      this.refreshEquipment(win);
      win.persist();
      win.msg('安装未能落盘，装备与模块已恢复：' + (error.message || error), 4500);
    }
    win.render();
  },

  detachRisk(nextCount) {
    const count = Math.max(1, Math.floor(Number(nextCount) || 1));
    return count <= 3 ? 0 : Math.min(95, 20 + (count - 4) * 15);
  },

  async detach(win) {
    const state = win.game && win.game.currentMvuState;
    const ui = this.state(win);
    const store = this.store(state, false);
    const rec = store && store.bag && store.bag[ui.moduleId];
    if (!rec || !rec.安装位置) { win.msg('模块未安装。'); return; }
    const item = this.findEquipment(state, rec.安装位置.列表键, rec.安装位置.物品键);
    const install = item && item['$强化模块安装'];
    if (!item || !install || install.模块ID !== ui.moduleId) {
      win.msg('模块与宿主关系已损坏，无法安全卸下。', 4500);
      return;
    }
    const nextCount = Math.max(0, Math.floor(Number(rec.卸下次数) || 0)) + 1;
    const risk = this.detachRisk(nextCount);
    const riskText = risk ? `\n本次有${risk}%概率永久损坏。` : '\n本次必定安全。';
    if (!window.confirm(`确定卸下“${rec.名称}”吗？${riskText}`)) return;

    const itemBackup = this.clone(item);
    const recordBackup = this.clone(rec);
    this.STAT_KEYS.forEach(key => {
      item[key] = (Number(item[key]) || 0)
        - (Number(install.属性增量 && install.属性增量[key]) || 0);
    });
    delete item['$强化模块安装'];
    const broken = risk > 0 && this.random() * 100 < risk;
    if (broken) delete store.bag[ui.moduleId];
    else {
      rec.卸下次数 = nextCount;
      rec.安装位置 = null;
    }
    try {
      await this.persistAndRefresh(win);
    } catch (error) {
      Object.keys(item).forEach(key => delete item[key]);
      Object.assign(item, itemBackup);
      store.bag[ui.moduleId] = recordBackup;
      this.refreshEquipment(win);
      win.persist();
      win.msg('卸下未能落盘，装备与模块已恢复：' + (error.message || error), 4500);
      win.render();
      return;
    }
    if (broken) {
      ui.view = 'main';
      ui.moduleId = '';
      win.msg('卸下时模块损坏，已永久销毁。', 4500);
    } else win.msg('模块已安全卸下。');
    win.render();
  },

  productionBonuses(mvuState) {
    const best = { successBonus: 0, yieldBonus: 0, craftDiscount: 0, repairBonus: 0 };
    const store = this.store(mvuState, false);
    if (!store || !store.bag) return best;
    this.equipmentRows(mvuState).forEach(row => {
      if (row.listKey === '武器列表' || row.item.isEquipped !== true) return;
      const install = row.item['$强化模块安装'];
      const rec = install && store.bag[install.模块ID];
      const pos = rec && rec.安装位置;
      if (!pos || pos.列表键 !== row.listKey || pos.物品键 !== row.itemKey) return;
      const production = rec.生产增益;
      if (!production || !Object.prototype.hasOwnProperty.call(best, production.type)) return;
      best[production.type] = Math.max(best[production.type], Number(production.value) || 0);
    });
    best.successBonus = Math.min(12, best.successBonus);
    best.yieldBonus = Math.min(0.30, best.yieldBonus);
    best.craftDiscount = Math.min(0.24, best.craftDiscount);
    best.repairBonus = Math.min(0.36, best.repairBonus);
    return best;
  },

  discountedQty(mvuState, quantity) {
    const raw = Math.max(0, Number(quantity) || 0);
    if (!(raw > 0)) return 0;
    const discount = this.productionBonuses(mvuState).craftDiscount;
    return Math.max(1, Math.round(raw * (1 - discount)));
  },

  repairMultiplier(mvuState) {
    return 1 + this.productionBonuses(mvuState).repairBonus;
  },
});
Object.assign(SavantEquipmentEnhancementMode, {
  ratioText(ratios) {
    return Object.entries(ratios || {})
      .map(([key, value]) => `${key}${Number(value) >= 0 ? '+' : ''}${value}%`)
      .join('、') || '无六维变化';
  },

  productionText(production) {
    if (!production) return '';
    if (production.type === 'successBonus') return `加工成功率+${production.value}个百分点`;
    if (production.type === 'yieldBonus') return `加工产量+${Math.round(production.value * 100)}%`;
    if (production.type === 'craftDiscount') return `制造/改装耗材-${Math.round(production.value * 100)}%`;
    if (production.type === 'repairBonus') return `维修量+${Math.round(production.value * 100)}%`;
    return '';
  },

  weaponText(weapon) {
    if (!weapon) return '';
    const parts = [];
    const mundane = weapon.mundane || {};
    Object.keys(mundane.up || {}).forEach(key => parts.push(`世俗${key}升档`));
    Object.keys(mundane.down || {}).forEach(key => parts.push(`世俗${key}降1档`));
    const extraordinary = weapon.extraordinary || {};
    if (extraordinary.attackBase) parts.push(`非凡攻击→${extraordinary.attackBase}`);
    if (extraordinary.healBase) parts.push(`非凡恢复→${extraordinary.healBase}`);
    if (extraordinary.extra) parts.push(`非凡附加${extraordinary.extra}`);
    if (extraordinary.scope) parts.push(`非凡范围→${extraordinary.scope}`);
    return parts.join('、');
  },

  rarityClass(rarity) {
    return `ppw-module-rarity-${Math.max(0, SAVANT_MODULE_RARITIES.indexOf(rarity))}`;
  },

  materialLabel(group) {
    return `${group.material}·${group.family}·${group.grade}·${group.qty}份`;
  },

  moduleCard(win, id, rec) {
    const location = rec.安装位置 ? `已安装：${rec.安装位置.装备名称}` : '未安装';
    const extras = [this.weaponText(rec.武器效果), this.productionText(rec.生产增益)].filter(Boolean).join('；');
    return `<div class="ppw-material-batch"><div class="ppw-row" style="justify-content:space-between;"><b class="${this.rarityClass(rec.品质)}">${win.esc(rec.品质)}·${win.esc(rec.名称)}</b><button type="button" class="ppw-btn ghost" data-ppw="enhance-open" data-arg="${win.esc(id)}">查看</button></div><div>${win.esc(this.ratioText(rec.六维比例))}</div>${extras ? `<div class="ppw-hint">${win.esc(extras)}</div>` : ''}<div class="ppw-hint">${win.esc(location)}·已卸下${Number(rec.卸下次数) || 0}次</div></div>`;
  },

  pityHtml(win, pity, selected) {
    const count = Math.max(0, Math.floor(Number(pity && pity.周期抽数) || 0));
    const sum = Number(pity && pity.周期材料总分) || 0;
    const average = count ? sum / count : 0;
    const floor = SAVANT_MODULE_RARITIES[this.pityFloor(average)];
    const probabilities = selected ? this.probabilities(selected.grade) : [0, 0, 0, 0, 0, 0];
    return `<div class="ppw-hint">周期保底：${count}/20抽·平均材料分${average.toFixed(2)}·预计保底${floor}</div><div class="ppw-hint">当前概率：${SAVANT_MODULE_RARITIES.map((rarity, index) => `${rarity}${probabilities[index]}%`).join('·')}</div>`;
  },

  renderMain(win) {
    const state = win.game && win.game.currentMvuState;
    const ui = this.state(win);
    const store = this.store(state, false);
    const groups = SavantMaterialMode.materialGroups(state)
      .filter(group => Math.floor(group.qty + 1e-6) >= 1 && SAVANT_EQUIPMENT_MODULE_CONFIG[group.family]);
    if (!groups.some(group => group.signature === ui.materialSignature)) {
      ui.materialSignature = groups[0] ? groups[0].signature : '';
    }
    const selected = groups.find(group => group.signature === ui.materialSignature) || null;
    const modules = this.modules(state);
    const recent = ui.drawResults.length
      ? `<div class="ppw-card"><b>最近抽取</b>${ui.drawResults.map(result => this.moduleCard(win, result.id, result.rec)).join('')}</div>`
      : '';
    return `<div class="ppw-card"><b>模块抽取</b><p class="ppw-hint">1份已加工材料等于1抽；材质族决定模块池，材料等级决定品质概率。</p><label class="ppw-field"><span>材料</span><select data-ppw-change="enhance-material">${groups.map(group => `<option value="${win.esc(group.signature)}"${group.signature === ui.materialSignature ? ' selected' : ''}>${win.esc(this.materialLabel(group))}</option>`).join('')}</select></label><label class="ppw-field"><span>抽取数量</span><input type="number" data-enhance-draw-qty min="1" max="${selected ? Math.floor(selected.qty) : 1}" step="1" value="1"></label>${this.pityHtml(win, store && store.pity, selected)}<div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="enhance-draw"${selected ? '' : ' disabled'}>抽取强化模块</button></div></div>${recent}<div class="ppw-card"><b>模块仓库（${modules.length}）</b>${modules.length ? modules.map(row => this.moduleCard(win, row.id, row.data)).join('') : '<p class="ppw-hint">尚无强化模块。</p>'}</div>`;
  },

  renderDetail(win) {
    const state = win.game && win.game.currentMvuState;
    const ui = this.state(win);
    const rec = this.moduleOf(state, ui.moduleId);
    if (!rec) { ui.view = 'main'; return this.renderMain(win); }
    const extras = [this.weaponText(rec.武器效果), this.productionText(rec.生产增益)].filter(Boolean).join('；') || '无附加效果';
    if (rec.安装位置) {
      const item = this.findEquipment(state, rec.安装位置.列表键, rec.安装位置.物品键);
      const nextCount = (Number(rec.卸下次数) || 0) + 1;
      const risk = this.detachRisk(nextCount);
      const weaponStatus = rec.武器效果 && rec.安装位置.列表键 === '武器列表'
        ? EquipmentModuleWeaponResolver.status(item, state) : null;
      let productionStatus = '';
      if (rec.生产增益) {
        const active = rec.安装位置.列表键 !== '武器列表' && item && item.isEquipped === true;
        productionStatus = `<p class="${active ? 'ppw-hint' : 'ppw-warn'}">${active ? '生产效果已生效' : '生产效果休眠：宿主需为已装备的衣物、饰品或封印物'}</p>`;
      }
      return `<div class="ppw-card"><div class="ppw-row" style="justify-content:space-between;"><b class="${this.rarityClass(rec.品质)}">${win.esc(rec.品质)}·${win.esc(rec.名称)}</b><button type="button" class="ppw-btn ghost" data-ppw="enhance-back">返回</button></div><p>${win.esc(this.ratioText(rec.六维比例))}</p><p class="ppw-hint">${win.esc(extras)}</p><p>当前宿主：${win.esc(rec.安装位置.装备名称)}</p>${weaponStatus ? `<p class="${weaponStatus.active ? 'ppw-hint' : 'ppw-warn'}">${win.esc(weaponStatus.text)}</p>` : ''}${productionStatus}<p class="${risk ? 'ppw-warn' : 'ppw-hint'}">第${nextCount}次卸下：${risk ? `${risk}%概率模块永久损坏` : '必定安全'}</p><div class="ppw-actions"><button type="button" class="ppw-btn warn-btn" data-ppw="enhance-detach">卸下模块</button></div></div>`;
    }
    const equipment = this.equipmentRows(state);
    return `<div class="ppw-card"><div class="ppw-row" style="justify-content:space-between;"><b class="${this.rarityClass(rec.品质)}">${win.esc(rec.品质)}·${win.esc(rec.名称)}</b><button type="button" class="ppw-btn ghost" data-ppw="enhance-back">返回</button></div><p>${win.esc(this.ratioText(rec.六维比例))}</p><p class="ppw-hint">${win.esc(extras)}</p><label class="ppw-field"><span>目标装备</span><select data-enhance-host><option value="">——选择装备——</option>${equipment.map(row => `<option value="${win.esc(encodeURIComponent(JSON.stringify([row.listKey, row.itemKey])))}"${this.hasInstalledModule(row.item) ? ' disabled' : ''}>${win.esc(row.category + '·' + row.name + (this.hasInstalledModule(row.item) ? '（已有模块）' : ''))}</option>`).join('')}</select></label><div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="enhance-install">安装模块</button></div></div>`;
  },

  render(win, gate) {
    if (!gate.unlocked) return '<p class="ppw-hint">装备强化在通识者序列6解锁。</p>';
    const state = win.game && win.game.currentMvuState;
    if (this.reconcile(state)) {
      this.refreshEquipment(win);
      win.persist();
      Promise.resolve(win.persistZero()).catch(error => console.warn('[装备强化] 异常引用修复落盘失败', error));
    }
    return this.state(win).view === 'detail' ? this.renderDetail(win) : this.renderMain(win);
  },

  onChange(win, kind, element) {
    if (kind !== 'enhance-material') return;
    this.state(win).materialSignature = String(element && element.value || '');
    win.render();
  },

  async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    const mutations = ['enhance-draw', 'enhance-install', 'enhance-detach'];
    if (mutations.includes(String(act)) && !this.gate(win).unlocked) {
      win.msg('当前没有通识者序列6装备强化资格。', 4000);
      return;
    }
    const ui = this.state(win);
    if (act === 'enhance-draw') return this.draw(win);
    if (act === 'enhance-open') {
      if (!this.moduleOf(win.game && win.game.currentMvuState, arg)) return;
      ui.moduleId = String(arg);
      ui.view = 'detail';
      win.render();
      return;
    }
    if (act === 'enhance-back') { ui.view = 'main'; ui.moduleId = ''; win.render(); return; }
    if (act === 'enhance-install') return this.install(win);
    if (act === 'enhance-detach') return this.detach(win);
  },
});
    if (deps.random) SavantEquipmentEnhancementMode.random = deps.random;
    if (deps.scope) SavantEquipmentEnhancementMode.scope = deps.scope;
    return { mode: SavantEquipmentEnhancementMode, weapon: EquipmentModuleWeaponResolver,
      buildMode: item => SkillLoader.playerWeaponBuildMode(item),
      rarities: SAVANT_MODULE_RARITIES, probabilities: SAVANT_MODULE_PROBABILITIES,
      config: SAVANT_EQUIPMENT_MODULE_CONFIG };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
