// Generated from the complete original ReaderMysticCore and ReaderMysticMode.
(() => {
  'use strict';
  const KEY = 'cryptLord.readerReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window, document = window.document;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const LifeSaveManager = {
splitSequenceFragments(sequenceString) {
        const raw = String(sequenceString || '').trim();
        if (!raw || raw.includes('普通人')) return [];
        return raw.split(/[/|，,;；与和及以及\s\+&、]/).map(f => f.trim()).filter(Boolean);
    },
resolveFragment(frag) {
        const pathways = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
            ? GameDBManager.DB.godPathways
            : null;
        if (!pathways || typeof pathways !== 'object') return null;

        const pureName = (typeof getPureName === 'function')
            ? getPureName(frag)
            : String(frag || '').replace(/^(序列\d+(\.\d+)?)[-—\s]?/, '').trim();
        if (!pureName) return null;

        for (const [pathwayFullName, sequences] of Object.entries(pathways)) {
            if (!Array.isArray(sequences)) continue;
            const foundIndex = sequences.findIndex((libSeq) => {
                const libPure = (typeof getPureName === 'function')
                    ? getPureName(libSeq)
                    : String(libSeq || '').replace(/^(序列\d+(\.\d+)?)[-—\s]?/, '').trim();
                return libPure === pureName;
            });
            if (foundIndex === -1) continue;

            const pathwayShort = String(pathwayFullName).replace(/途径$/, '').trim();
            const rank = (typeof parseSequenceRank === 'function')
                ? parseSequenceRank(frag)
                : 10;
            return { pathwayShort, rank, frag };
        }
        return null;
    }
    };
    const ConsumableMoveBuilder = { getAvgAttrs: rank => deps.averages[String(rank)] ||
      deps.averages['10'] || { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27, 运气: 20 } };
const ReaderMysticCore = {
  ID: 'reader-mystic',
  PATHWAY: '阅读者',
  PATHWAY_FULL: '阅读者途径',
  TITLE: '上帝',
  GATE: 5,
  STORE_PLAY: '秘术强化',
  STORE_SLOTS: '秘术栏位',
  STORE_LEARNING: '解析和学习',
  STORE_TARGETS: '目标栏位',
  ABILITY_GROUP: '#秘术强化',
  MAX_LEARNING_SLOTS: 11,

  STRENGTH_COSTS: [0, 2, 4, 6, 8],
  ATTACK_SINGLE_RATIOS: [0.20, 0.25, 0.30, 0.40, 0.50],
  HEAL_SINGLE_RATIOS: [0.30, 0.40, 0.45, 0.50, 0.60],
  COST_RATIOS: [0.15, 0.10, 0.05, 0],
  COST_POINT_COSTS: [0, 1, 3, 6],
  RANGE_POINT_COSTS: { '1': 0, '3': 1, '5': 2, '7': 3, global: 5 },
  RADIUS_POINT_COSTS: { '1': 2, '2': 4, '3': 6 },
  EFFECT_DURATION_COSTS: { '1': 0, '2': 1, '3': 3 },
  EFFECT_STRENGTH_COSTS: [0, 2, 4],
  EFFECT_PERCENT_POWERS: [10, 20, 30],
  EFFECT_FIXED_RATIOS: [0.03, 0.05, 0.08],
  RESOURCE_KEYS: ['活力', '敏捷', '灵性', '理智', '人性'],
  DAMAGE_TYPES: ['physical', 'mystical', 'mental', 'mixed'],
  EFFECT_TYPES: ['buff', 'debuff', 'poison', 'regen'],
  EFFECT_STATS: ['attack', 'defense', 'speed'],
  COST_TYPE_MAP: {
    活力: 'currentVitality',
    敏捷: 'currentAgility',
    灵性: 'currentSpirit',
    理智: 'currentSanity',
    人性: 'currentHumanity',
  },

  clone(v) {
    try {
      if (typeof _ !== 'undefined' && _ && typeof _.cloneDeep === 'function') return _.cloneDeep(v);
      return JSON.parse(JSON.stringify(v));
    } catch (_) {
      return v;
    }
  },

  clampIndex(raw, max) {
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
  },

  enumValue(raw, allowed, fallback) {
    const value = String(raw == null ? '' : raw);
    return allowed.includes(value) ? value : fallback;
  },

  resolve(sequenceString, mvuState) {
    const s = String(sequenceString || '').trim();
    if (!s) return { inPathway: false, unlocked: false, rank: null, basePoints: 0, learningPoints: 0, points: 0, slots: 0, learningSlots: 0, viaTitle: false };
    if (s.includes(this.TITLE)) {
      const learningSlots = this.learningSlotsForRank(-2);
      const learningPoints = this.learningBonusPoints(mvuState, learningSlots);
      return { inPathway: true, unlocked: true, rank: -2, basePoints: 20, learningPoints, points: 20 + learningPoints, slots: 4, learningSlots, viaTitle: true };
    }
    let best = null;
    LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
      const resolved = LifeSaveManager.resolveFragment(frag);
      if (!resolved || resolved.pathwayShort !== this.PATHWAY) return;
      const rank = Number(resolved.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, unlocked: false, rank: null, basePoints: 0, learningPoints: 0, points: 0, slots: 0, learningSlots: 0, viaTitle: false };
    const unlocked = best <= this.GATE;
    const basePoints = unlocked ? this.pointsForRank(best) : 0;
    const learningSlots = unlocked ? this.learningSlotsForRank(best) : 0;
    const learningPoints = unlocked ? this.learningBonusPoints(mvuState, learningSlots) : 0;
    return {
      inPathway: true,
      unlocked,
      rank: best,
      basePoints,
      learningPoints,
      points: basePoints + learningPoints,
      slots: unlocked ? this.slotsForRank(best) : 0,
      learningSlots,
      viaTitle: false,
    };
  },

  pointsForRank(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r) || r > 5) return 0;
    if (r <= -2) return 20;
    if (r <= -1) return 18;
    if (r === 0) return 16;
    if (r > 0 && r < 1) return 14;
    if (r <= 1) return 14;
    if (r <= 2) return 12;
    if (r <= 3) return 10;
    if (r <= 4) return 8;
    return 6;
  },

  slotsForRank(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r) || r > 5) return 0;
    if (r <= -2) return 4;
    if (r <= 1) return 3;
    if (r <= 3) return 2;
    return 1;
  },

  learningSlotsForRank(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r) || r > 5) return 0;
    if (r <= -2) return 11;
    if (r <= -1) return 10;
    if (r <= 0) return 9;
    if (r < 2) return 8; // 序列1与所有 0.x
    return Math.max(4, Math.min(7, 9 - Math.floor(r)));
  },

  learningRewardForRank(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r) || r > 5) return 0;
    if (r <= 0) return 4;
    if (r < 2) return 3; // 序列1与所有 0.x
    if (r <= 3) return 2;
    return 1;
  },

  effectiveSequence(mvuState) {
    if (window.AudienceImaginationCore) return window.AudienceImaginationCore.effectivePlayerSequence(mvuState);
    return String((mvuState && mvuState.stat_data && mvuState.stat_data.当前序列) || '').trim();
  },

  playerStore(mvuState, create) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return null;
    let root = sd['$专属玩法'];
    if (!root || typeof root !== 'object' || Array.isArray(root)) {
      if (!create) return null;
      root = sd['$专属玩法'] = {};
    }
    let pathway = root[this.PATHWAY_FULL];
    if (!pathway || typeof pathway !== 'object' || Array.isArray(pathway)) {
      if (!create) return null;
      pathway = root[this.PATHWAY_FULL] = {};
    }
    let play = pathway[this.STORE_PLAY];
    if (!play || typeof play !== 'object' || Array.isArray(play)) {
      if (!create) return null;
      play = pathway[this.STORE_PLAY] = { 版本: 2, [this.STORE_SLOTS]: {} };
    }
    let slots = play[this.STORE_SLOTS];
    if (!slots || typeof slots !== 'object' || Array.isArray(slots)) {
      if (!create) return null;
      slots = play[this.STORE_SLOTS] = {};
    }
    return { play, slots };
  },

  learningStore(mvuState, create) {
    const store = this.playerStore(mvuState, create);
    if (!store) return null;
    let learning = store.play[this.STORE_LEARNING];
    if (!learning || typeof learning !== 'object' || Array.isArray(learning)) {
      if (!create) return null;
      learning = store.play[this.STORE_LEARNING] = { 版本: 1, [this.STORE_TARGETS]: {} };
    }
    let targets = learning[this.STORE_TARGETS];
    if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
      if (!create) return null;
      targets = learning[this.STORE_TARGETS] = {};
    }
    return { play: store.play, learning, targets };
  },

  normalizeLearningRecord(raw, pending) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
    if (!source) return null;
    const rank = Number(source.序列等级);
    const record = {
      目标: String(source.目标 || '').trim(),
      当前序列: String(source.当前序列 || '').trim(),
      学习序列: String(source.学习序列 || '').trim(),
      途径: String(source.途径 || '').trim(),
      序列等级: Number.isFinite(rank) ? rank : null,
    };
    if (!record.目标 || !record.当前序列 || !record.学习序列 || !record.途径 || record.序列等级 === null) return null;
    if (pending) record.上次失败原因 = String(source.上次失败原因 || '').trim();
    else {
      record.奖励点数 = this.learningRewardForRank(record.序列等级);
      record.认定理由 = String(source.认定理由 || '').trim();
    }
    return record;
  },

  learningEntries(mvuState) {
    const store = this.learningStore(mvuState, false);
    const out = {};
    if (!store) return out;
    for (let i = 1; i <= this.MAX_LEARNING_SLOTS; i++) {
      const raw = store.targets[`栏位${i}`];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const recognized = this.normalizeLearningRecord(raw.已认定, false);
      const pending = this.normalizeLearningRecord(raw.进行中, true);
      if (recognized || pending) out[i] = { 已认定: recognized, 进行中: pending };
    }
    return out;
  },

  learningBonusPoints(mvuState, activeSlots) {
    const limit = Math.max(0, Math.min(this.MAX_LEARNING_SLOTS, Math.floor(Number(activeSlots) || 0)));
    const entries = this.learningEntries(mvuState);
    let total = 0;
    for (let i = 1; i <= limit; i++) {
      const record = entries[i] && entries[i].已认定;
      if (record) total += this.learningRewardForRank(record.序列等级);
    }
    return total;
  },

  writeLearningSlot(mvuState, slot, recognized, pending) {
    const store = this.learningStore(mvuState, true);
    if (!store) return false;
    const index = Math.max(1, Math.min(this.MAX_LEARNING_SLOTS, Math.floor(Number(slot) || 1)));
    const value = {};
    const done = this.normalizeLearningRecord(recognized, false);
    const doing = this.normalizeLearningRecord(pending, true);
    if (done) value.已认定 = done;
    if (doing) value.进行中 = doing;
    store.play.版本 = 2;
    store.learning.版本 = 1;
    if (done || doing) store.targets[`栏位${index}`] = value;
    else delete store.targets[`栏位${index}`];
    return true;
  },

  learningFragments(sequenceString) {
    const bestByPathway = new Map();
    LifeSaveManager.splitSequenceFragments(sequenceString).forEach(raw => {
      const fragment = String(raw || '').trim();
      const resolved = LifeSaveManager.resolveFragment(fragment);
      if (!fragment || !resolved || resolved.pathwayShort === this.PATHWAY) return;
      const rank = Number(resolved.rank);
      if (!Number.isFinite(rank)) return;
      const old = bestByPathway.get(resolved.pathwayShort);
      if (!old || rank < old.序列等级) {
        bestByPathway.set(resolved.pathwayShort, {
          学习序列: fragment,
          途径: resolved.pathwayShort,
          序列等级: rank,
        });
      }
    });
    return Array.from(bestByPathway.values()).sort((a, b) => a.序列等级 - b.序列等级 || a.途径.localeCompare(b.途径, 'zh-CN'));
  },

  learningFragmentForPathway(sequenceString, pathway) {
    return this.learningFragments(sequenceString).find(x => x.途径 === pathway) || null;
  },

  learningConflict(mvuState, slot, record) {
    const index = Number(slot);
    const entries = this.learningEntries(mvuState);
    for (const [key, entry] of Object.entries(entries)) {
      if (Number(key) === index) continue;
      for (const other of [entry.已认定, entry.进行中]) {
        if (!other) continue;
        if (other.目标 === record.目标) return '该人物已被其他学习栏位占用';
        if (other.当前序列 === record.当前序列) return '其他学习栏位已记录完全相同的当前序列';
        if (other.学习序列 === record.学习序列) return '其他学习栏位已学习完全相同的序列片段';
      }
    }
    return '';
  },

  validateLearningTarget(mvuState, slot, record, gate) {
    const index = Math.floor(Number(slot));
    if (!gate || !gate.unlocked || !Number.isInteger(index) || index < 1 || index > gate.learningSlots) {
      return '当前学习栏位不可用';
    }
    const normalized = this.normalizeLearningRecord(record, true);
    if (!normalized) return '目标序列资料不完整';
    if (normalized.途径 === this.PATHWAY) return '不能解析和学习阅读者途径';
    if (normalized.序列等级 > gate.rank) return '目标序列低于你当前的阅读者序列';
    const old = this.learningEntries(mvuState)[index]?.已认定;
    if (old && normalized.序列等级 >= old.序列等级) return '新目标序列必须严格高于该栏位原有目标';
    return this.learningConflict(mvuState, index, normalized);
  },

  learningCandidates(mvuState, gate, slot) {
    const sd = mvuState && mvuState.stat_data;
    const rel = sd && sd.人物关系列表;
    const npc = mvuState && mvuState.npc_data;
    if (!gate || !gate.unlocked || !rel || typeof rel !== 'object' || Array.isArray(rel)
      || !npc || typeof npc !== 'object' || Array.isArray(npc)) return [];
    const out = [];
    Object.keys(rel).forEach(name => {
      if (name === '$meta') return;
      const subjective = rel[name];
      const objective = npc[name];
      const affinity = Number(subjective && subjective.好感度);
      if (!subjective || typeof subjective !== 'object' || !Number.isFinite(affinity) || affinity <= 80) return;
      if (!objective || typeof objective !== 'object' || Array.isArray(objective)) return;
      const fullSequence = String(objective.当前序列 || '').trim();
      if (!fullSequence) return;
      this.learningFragments(fullSequence).forEach(fragment => {
        const record = {
          目标: name,
          当前序列: fullSequence,
          学习序列: fragment.学习序列,
          途径: fragment.途径,
          序列等级: fragment.序列等级,
          上次失败原因: '',
        };
        if (this.validateLearningTarget(mvuState, slot, record, gate)) return;
        out.push({
          ...record,
          好感度: affinity,
          关系: String(subjective.关系 || '').trim() || '-',
          地点: String(objective.所处地点 || subjective.所处地点 || '').trim() || '-',
        });
      });
    });
    out.sort((a, b) => a.序列等级 - b.序列等级 || a.目标.localeCompare(b.目标, 'zh-CN') || a.途径.localeCompare(b.途径, 'zh-CN'));
    out.forEach((row, i) => { row.idx = i; });
    return out;
  },

  refreshPendingLearning(mvuState, slot, gate) {
    const index = Math.floor(Number(slot));
    const entry = this.learningEntries(mvuState)[index];
    const pending = entry && entry.进行中;
    if (!pending) return { ok: false, error: '该栏位没有进行中的解析和学习任务' };
    const npc = mvuState && mvuState.npc_data && mvuState.npc_data[pending.目标];
    if (!npc || typeof npc !== 'object' || Array.isArray(npc)) return { ok: false, error: '客观人物记录中已找不到目标' };
    const fullSequence = String(npc.当前序列 || '').trim();
    const fragment = this.learningFragmentForPathway(fullSequence, pending.途径);
    if (!fragment) return { ok: false, error: '目标最新序列中已没有原先选择的途径，请重新选择' };
    const latest = {
      目标: pending.目标,
      当前序列: fullSequence,
      学习序列: fragment.学习序列,
      途径: fragment.途径,
      序列等级: fragment.序列等级,
      上次失败原因: pending.上次失败原因 || '',
    };
    const error = this.validateLearningTarget(mvuState, index, latest, gate);
    if (error) return { ok: false, error, record: latest, npc };
    return { ok: true, record: latest, npc };
  },

  defaultEffect() {
    return { 类型: '', 属性: 'attack', 资源属性: '活力', 目标: 'hit', 持续: 1, 强度档: 0 };
  },

  defaultConfig(slot) {
    return {
      名称: `秘术${slot}`,
      描述: '',
      流派: 'damage',
      目标模式: 'single',
      施法中心: 'target',
      伤害类型: 'mystical',
      治疗属性: '活力',
      消耗属性: '灵性',
      强度档: 0,
      消耗档: 0,
      射程: '1',
      范围半径: 1,
      状态效果: [this.defaultEffect(), this.defaultEffect()],
    };
  },

  normalizeEffect(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const type = this.enumValue(source.类型, [''].concat(this.EFFECT_TYPES), '');
    return {
      类型: type,
      属性: this.enumValue(source.属性, this.EFFECT_STATS, 'attack'),
      资源属性: this.enumValue(source.资源属性, this.RESOURCE_KEYS, '活力'),
      目标: this.enumValue(source.目标, ['self', 'hit'], 'hit'),
      持续: Math.max(1, Math.min(3, Math.floor(Number(source.持续) || 1))),
      强度档: this.clampIndex(source.强度档, 2),
    };
  },

  normalizeConfig(raw, slot) {
    const base = this.defaultConfig(slot);
    const source = raw && typeof raw === 'object' ? raw : {};
    const cfg = {
      名称: String(source.名称 == null ? base.名称 : source.名称).trim().slice(0, 30),
      描述: String(source.描述 == null ? '' : source.描述).trim().slice(0, 120),
      流派: this.enumValue(source.流派, ['damage', 'heal'], base.流派),
      目标模式: this.enumValue(source.目标模式, ['single', 'group'], base.目标模式),
      施法中心: this.enumValue(source.施法中心, ['target', 'self'], base.施法中心),
      伤害类型: this.enumValue(source.伤害类型, this.DAMAGE_TYPES, base.伤害类型),
      治疗属性: this.enumValue(source.治疗属性, this.RESOURCE_KEYS, base.治疗属性),
      消耗属性: this.enumValue(source.消耗属性, this.RESOURCE_KEYS, base.消耗属性),
      强度档: this.clampIndex(source.强度档, 4),
      消耗档: this.clampIndex(source.消耗档, 3),
      射程: this.enumValue(source.射程, ['1', '3', '5', '7', 'global'], base.射程),
      范围半径: Math.max(1, Math.min(3, Math.floor(Number(source.范围半径) || 1))),
      状态效果: [],
    };
    const effects = Array.isArray(source.状态效果) ? source.状态效果 : base.状态效果;
    cfg.状态效果 = [0, 1].map(i => this.normalizeEffect(effects[i]));
    if (cfg.流派 === 'damage' && cfg.目标模式 === 'single') cfg.施法中心 = 'target';
    return cfg;
  },

  configs(mvuState) {
    const store = this.playerStore(mvuState, false);
    const slots = store ? store.slots : {};
    const out = {};
    [1, 2, 3, 4].forEach(i => {
      const raw = slots[`栏位${i}`];
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) out[i] = this.normalizeConfig(raw, i);
    });
    return out;
  },

  saveConfig(mvuState, slot, config) {
    const store = this.playerStore(mvuState, true);
    if (!store) return false;
    const index = Math.max(1, Math.min(4, Math.floor(Number(slot) || 1)));
    store.play.版本 = 2;
    store.slots[`栏位${index}`] = this.normalizeConfig(config, index);
    return true;
  },

  deleteConfig(mvuState, slot) {
    const store = this.playerStore(mvuState, false);
    if (!store) return false;
    const key = `栏位${Math.max(1, Math.min(4, Math.floor(Number(slot) || 1)))}`;
    if (!Object.prototype.hasOwnProperty.call(store.slots, key)) return false;
    delete store.slots[key];
    return true;
  },

  pointsOf(raw, slot) {
    const cfg = this.normalizeConfig(raw, slot);
    let total = this.STRENGTH_COSTS[cfg.强度档] + this.COST_POINT_COSTS[cfg.消耗档];
    if (cfg.施法中心 !== 'self') total += this.RANGE_POINT_COSTS[cfg.射程] || 0;
    if (cfg.目标模式 === 'group') total += this.RADIUS_POINT_COSTS[String(cfg.范围半径)] || 0;
    cfg.状态效果.forEach(effect => {
      if (!effect.类型) return;
      total += 2;
      total += this.EFFECT_DURATION_COSTS[String(effect.持续)] || 0;
      total += this.EFFECT_STRENGTH_COSTS[effect.强度档] || 0;
    });
    return total;
  },

  validateConfig(raw, slot, gate) {
    const cfg = this.normalizeConfig(raw, slot);
    const errors = [];
    if (!cfg.名称) errors.push('技能名称不能为空');
    if (cfg.目标模式 === 'group' && ![1, 2, 3].includes(cfg.范围半径)) errors.push('群体技能必须选择范围半径');
    if (cfg.流派 === 'damage' && cfg.目标模式 === 'single' && cfg.施法中心 === 'self') errors.push('单体伤害不能以自身为目标');
    const points = this.pointsOf(cfg, slot);
    if (gate && points > gate.points) errors.push(`需要${points}点，当前额度只有${gate.points}点`);
    return { valid: errors.length === 0, errors, points, config: cfg };
  },

  avgAttrs(rank) {
    return ConsumableMoveBuilder.getAvgAttrs(rank);
  },

  fixedFromAvg(attrs, stat, ratio, allowZero) {
    const value = Math.round((Number(attrs && attrs[stat]) || 0) * ratio);
    return allowZero ? Math.max(0, value) : Math.max(1, value);
  },

  effectTargetOf(cfg, effect) {
    if (effect.目标 === 'self') return 'self';
    if (cfg.目标模式 === 'single') return 'target';
    return cfg.流派 === 'heal' ? 'allAlly' : 'all';
  },

  buildEffect(cfg, effect, index, attrs) {
    if (!effect.类型) return null;
    const target = this.effectTargetOf(cfg, effect);
    const common = {
      name: `${cfg.名称}·效果${index}`,
      type: effect.类型,
      duration: effect.持续,
      triggerTiming: 'turn_start',
      effectTarget: target,
    };
    if (effect.类型 === 'buff' || effect.类型 === 'debuff') {
      return {
        ...common,
        stat: effect.属性,
        power: this.EFFECT_PERCENT_POWERS[effect.强度档],
        valueType: 'percentage',
      };
    }
    return {
      ...common,
      stat: `当前${effect.资源属性}`,
      power: this.fixedFromAvg(attrs, effect.资源属性, this.EFFECT_FIXED_RATIOS[effect.强度档], false),
      valueType: 'fixed',
    };
  },

  buildAbility(raw, slot, rank) {
    const cfg = this.normalizeConfig(raw, slot);
    const attrs = this.avgAttrs(rank);
    const isGroup = cfg.目标模式 === 'group';
    const isSelf = cfg.施法中心 === 'self';
    const ratioScale = isGroup ? 0.5 : 1;
    const ability = {
      名称: cfg.名称,
      描述: cfg.描述 || '自定义秘术',
      类型: '非凡能力',
      cost: {
        type: this.COST_TYPE_MAP[cfg.消耗属性],
        amount: this.fixedFromAvg(attrs, cfg.消耗属性, this.COST_RATIOS[cfg.消耗档], true),
      },
      targetType: cfg.流派 === 'heal'
        ? (isGroup ? 'allAlly' : (isSelf ? 'self' : 'ally'))
        : (isGroup ? 'all' : 'single'),
      range: isSelf ? 0 : (cfg.射程 === 'global' ? 'global' : Number(cfg.射程)),
      aoeRadius: isGroup ? cfg.范围半径 : 0,
      effects: cfg.状态效果
        .map((effect, index) => this.buildEffect(cfg, effect, index + 1, attrs))
        .filter(Boolean),
    };
    if (cfg.流派 === 'heal') {
      ability.isHeal = true;
      ability.healAmt = this.fixedFromAvg(
        attrs,
        cfg.治疗属性,
        this.HEAL_SINGLE_RATIOS[cfg.强度档] * ratioScale,
        false
      );
      ability.healType = cfg.治疗属性;
      ability.healValueType = 'fixed';
    } else {
      ability.damageType = cfg.伤害类型;
      ability.power = this.fixedFromAvg(
        attrs,
        '活力',
        this.ATTACK_SINGLE_RATIOS[cfg.强度档] * ratioScale,
        false
      );
    }
    return ability;
  },

  namesOutsideProjection(mvuState) {
    const sd = mvuState && mvuState.stat_data;
    const record = sd && sd.序列能力列表;
    const names = new Set();
    if (!record || typeof record !== 'object' || Array.isArray(record)) return names;
    Object.entries(record).forEach(([key, list]) => {
      if (key === this.ABILITY_GROUP
        || (window.MysteryReenactmentCore && key === window.MysteryReenactmentCore.ABILITY_GROUP)
        || !Array.isArray(list)) return;
      list.forEach(ab => {
        const name = String((ab && (ab.名称 || ab.name)) || '').trim();
        if (name) names.add(name);
      });
    });
    return names;
  },

  syncPlayerProjection(mvuState, snapshot = null) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return false;
    let record = sd.序列能力列表;
    if (!record || typeof record !== 'object' || Array.isArray(record)) record = {};
    delete record[this.ABILITY_GROUP];

    const effectiveSequence = snapshot && snapshot.effectiveSequence
      ? snapshot.effectiveSequence
      : this.effectiveSequence(mvuState);
    const gate = this.resolve(effectiveSequence, mvuState);
    if (gate.unlocked) {
      const configs = this.configs(mvuState);
      const externalNames = this.namesOutsideProjection(mvuState);
      const projectedNames = new Set();
      const abilities = [];
      for (let slot = 1; slot <= gate.slots; slot++) {
        const cfg = configs[slot];
        if (!cfg) continue;
        const check = this.validateConfig(cfg, slot, gate);
        const name = check.config.名称;
        if (!check.valid || externalNames.has(name) || projectedNames.has(name)) continue;
        projectedNames.add(name);
        const ability = this.buildAbility(check.config, slot, gate.rank);
        ability['$秘术投影'] = '秘术强化';
        abilities.push(ability);
      }
      if (abilities.length) record[this.ABILITY_GROUP] = abilities;
    }
    sd.序列能力列表 = record;
    return true;
  },
};
const ReaderMysticMode = {
  id: ReaderMysticCore.ID,
  途径: ReaderMysticCore.PATHWAY,
  途径全名: ReaderMysticCore.PATHWAY_FULL,
  名称: '秘术强化',
  图标: '📖',
  GATE: ReaderMysticCore.GATE,
  TITLE: ReaderMysticCore.TITLE,

  resolve(sequenceString) {
    return ReaderMysticCore.resolve(sequenceString);
  },

  scope() {
    return document.querySelector(`#ppw-body [data-ppw-mode="${this.id}"]`);
  },

  state(win) {
    if (!win._modeState) win._modeState = {};
    if (!win._modeState[this.id]) {
      win._modeState[this.id] = { view: 'main', learningSlot: 1 };
    }
    return win._modeState[this.id];
  },

  gate(win) {
    const state = win.game && win.game.currentMvuState;
    return ReaderMysticCore.resolve(win.playerSequence(), state);
  },

  learningOverviewHtml(win, gate) {
    const state = win.game && win.game.currentMvuState;
    const entries = ReaderMysticCore.learningEntries(state);
    const rows = [];
    for (let slot = 1; slot <= gate.learningSlots; slot++) {
      const entry = entries[slot] || {};
      const done = entry.已认定;
      const doing = entry.进行中;
      const doneHtml = done
        ? `<div class="ppw-mat-main"><span class="ppw-mat-name">已认定 · ${win.esc(done.目标)} · +${ReaderMysticCore.learningRewardForRank(done.序列等级)}点</span><span class="ppw-mat-meta">${win.esc(done.学习序列)} · 完整记录：${win.esc(done.当前序列)}</span>${done.认定理由 ? `<span class="ppw-mat-meta">认定：${win.esc(done.认定理由)}</span>` : ''}</div>`
        : '<span class="ppw-hint">尚未认定目标</span>';
      const doingHtml = doing
        ? `<div class="ppw-mat-main"><span class="ppw-mat-name">进行中 · ${win.esc(doing.目标)}</span><span class="ppw-mat-meta">计划学习：${win.esc(doing.学习序列)}</span>${doing.上次失败原因 ? `<span class="ppw-warn">上次失败：${win.esc(doing.上次失败原因)}</span>` : ''}</div>`
        : '';
      rows.push(`<details class="ppw-group"${doing ? ' open' : ''}>
  <summary>学习目标栏位${slot}${done ? ` · ${win.esc(done.目标)}` : ' · 空'}</summary>
  <div class="ppw-card" style="padding-top:8px;">
    ${doneHtml}
    ${doingHtml}
    <div class="ppw-actions">
      <button type="button" class="ppw-btn ghost" data-ppw="to-learning-select" data-arg="${slot}"${win.isBusy ? ' disabled' : ''}>${done ? '选择更高序列替换目标' : (doing ? '重新选择目标' : '选择学习目标')}</button>
      ${doing ? `<button type="button" class="ppw-btn" data-ppw="recognize-learning" data-arg="${slot}"${win.isBusy ? ' disabled' : ''}>${win.isBusy ? '认定中…' : '认定'}</button><button type="button" class="ppw-btn warn" data-ppw="cancel-learning" data-arg="${slot}"${win.isBusy ? ' disabled' : ''}>取消进行中任务</button>` : ''}
    </div>
  </div>
</details>`);
    }
    const hidden = Object.keys(entries).filter(k => Number(k) > gate.learningSlots && (entries[k].已认定 || entries[k].进行中)).length;
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;"><b>解析和学习</b><span class="ppw-hint">有效栏位 ${gate.learningSlots} 个 · 已获得 ${gate.learningPoints} 点</span></div>
  <p class="ppw-hint">从人物关系列表中选择好感度高于80、序列与你同级或更强的非阅读者途径。开始后请到正文明确完成解析或学习，再回来认定；失败可以继续重试。</p>
  ${hidden ? `<p class="ppw-warn">另有 ${hidden} 个高阶学习栏记录因当前序列不足而保留但不计点。</p>` : ''}
  ${rows.join('')}
</div>`;
  },

  renderLearningSelect(win, gate, slot) {
    const state = win.game && win.game.currentMvuState;
    const candidates = ReaderMysticCore.learningCandidates(state, gate, slot);
    const rows = candidates.map(c => `<label class="ppw-mat ppw-mat-hit" data-rm-learning-row="${c.idx}">
  <input type="radio" name="rm-learning-target" class="rm-learning-target" />
  <span class="ppw-mat-main"><span class="ppw-mat-name">${win.esc(c.目标)} · ${win.esc(c.学习序列)} · +${ReaderMysticCore.learningRewardForRank(c.序列等级)}点</span><span class="ppw-mat-meta">完整当前序列：${win.esc(c.当前序列)} · 好感 ${c.好感度} · ${win.esc(c.关系)} · ${win.esc(c.地点)}</span></span>
</label>`).join('');
    const old = ReaderMysticCore.learningEntries(state)[slot]?.已认定;
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;"><b>为学习目标栏位${slot}选择目标</b><button type="button" class="ppw-btn ghost" data-ppw="learning-back">返回</button></div>
  ${old ? `<p class="ppw-hint">当前记录为 ${win.esc(old.目标)} · ${win.esc(old.学习序列)}；新目标必须严格高于序列${old.序列等级}。</p>` : ''}
  ${rows || '<p class="ppw-hint">人物关系列表中没有满足好感、序列、途径、升级和唯一性规则的目标。</p>'}
  <div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="start-learning" data-arg="${slot}"${rows ? '' : ' disabled'}>开始解析和学习</button></div>
</div>`;
  },

  options(win, rows, value) {
    return rows.map(row => {
      const selected = String(row[0]) === String(value) ? ' selected' : '';
      return `<option value="${win.esc(row[0])}"${selected}>${win.esc(row[1])}</option>`;
    }).join('');
  },

  effectHtml(win, effect, index) {
    const type = effect.类型;
    const combatDisplay = type === 'buff' || type === 'debuff' ? '' : 'display:none;';
    const resourceDisplay = type === 'poison' || type === 'regen' ? '' : 'display:none;';
    return `<div class="ppw-mystic-effect" data-rm-effect="${index}">
  <div class="ppw-row"><strong>状态${index}</strong><span class="ppw-hint">启用基础花费2点</span></div>
  <div class="ppw-mystic-grid">
    <label class="ppw-field"><span>类型</span><select data-rm-effect-field="type" data-ppw-change="mystic-effect">${this.options(win, [
      ['', '不启用'], ['buff', '增益'], ['debuff', '减益'], ['poison', '中毒'], ['regen', '再生']
    ], type)}</select></label>
    <label class="ppw-field" data-rm-show="effect-combat-${index}" style="${combatDisplay}"><span>作用参数</span><select data-rm-effect-field="stat" data-ppw-change="mystic-effect">${this.options(win, [
      ['attack', '攻击'], ['defense', '防御'], ['speed', '速度']
    ], effect.属性)}</select></label>
    <label class="ppw-field" data-rm-show="effect-resource-${index}" style="${resourceDisplay}"><span>作用资源</span><select data-rm-effect-field="resource" data-ppw-change="mystic-effect">${this.options(win, ReaderMysticCore.RESOURCE_KEYS.map(x => [x, x]), effect.资源属性)}</select></label>
    <label class="ppw-field"><span>状态目标</span><select data-rm-effect-field="target" data-ppw-change="mystic-effect">${this.options(win, [['hit', '技能命中者'], ['self', '施法者自身']], effect.目标)}</select></label>
    <label class="ppw-field"><span>持续时间</span><select data-rm-effect-field="duration" data-ppw-change="mystic-effect">${this.options(win, [['1', '1回合（0点）'], ['2', '2回合（1点）'], ['3', '3回合（3点）']], effect.持续)}</select></label>
    <label class="ppw-field"><span>状态强度</span><select data-rm-effect-field="strength" data-ppw-change="mystic-effect">${this.options(win, [['0', '低档（0点）'], ['1', '中档（2点）'], ['2', '高档（4点）']], effect.强度档)}</select></label>
  </div>
</div>`;
  },

  editorHtml(win, slot, saved, gate) {
    const cfg = ReaderMysticCore.normalizeConfig(saved || ReaderMysticCore.defaultConfig(slot), slot);
    const check = ReaderMysticCore.validateConfig(cfg, slot, gate);
    const isDamage = cfg.流派 === 'damage';
    const isGroup = cfg.目标模式 === 'group';
    const isSelf = cfg.施法中心 === 'self';
    const built = ReaderMysticCore.buildAbility(cfg, slot, gate.rank);
    const valueText = isDamage ? `固定 power：${built.power}` : `固定治疗量：${built.healAmt}`;
    return `<details class="ppw-group ppw-mystic-slot" data-mystic-slot="${slot}"${saved ? '' : ' open'}>
  <summary>秘术栏位${slot}${saved ? ` · ${win.esc(cfg.名称)}` : ' · 尚未保存'}</summary>
  <div class="ppw-card" style="padding-top:8px;">
    <div class="ppw-mystic-grid">
      <label class="ppw-field"><span>技能名称</span><input maxlength="30" data-rm-field="name" data-ppw-change="mystic" value="${win.esc(cfg.名称)}"></label>
      <label class="ppw-field"><span>技能流派</span><select data-rm-field="kind" data-ppw-change="mystic">${this.options(win, [['damage', '伤害'], ['heal', '治疗']], cfg.流派)}</select></label>
      <label class="ppw-field"><span>目标类型</span><select data-rm-field="scope" data-ppw-change="mystic">${this.options(win, [['single', '单体'], ['group', '群体']], cfg.目标模式)}</select></label>
      <label class="ppw-field"><span>施法中心</span><select data-rm-field="center" data-ppw-change="mystic">${this.options(win, [['target', '点选目标'], ['self', '施法者自身']], cfg.施法中心)}</select></label>
      <label class="ppw-field" data-rm-show="damage" style="${isDamage ? '' : 'display:none;'}"><span>伤害类型</span><select data-rm-field="damage-type" data-ppw-change="mystic">${this.options(win, [['physical', '物理'], ['mystical', '神秘'], ['mental', '精神'], ['mixed', '混合']], cfg.伤害类型)}</select></label>
      <label class="ppw-field" data-rm-show="heal" style="${isDamage ? 'display:none;' : ''}"><span>治疗属性</span><select data-rm-field="heal-type" data-ppw-change="mystic">${this.options(win, ReaderMysticCore.RESOURCE_KEYS.map(x => [x, x]), cfg.治疗属性)}</select></label>
      <label class="ppw-field"><span>核心强度</span><select data-rm-field="strength" data-ppw-change="mystic">${this.options(win, [['0', '第一档（0点）'], ['1', '第二档（2点）'], ['2', '第三档（4点）'], ['3', '第四档（6点）'], ['4', '第五档（8点）']], cfg.强度档)}</select></label>
      <label class="ppw-field"><span>消耗资源</span><select data-rm-field="cost-stat" data-ppw-change="mystic">${this.options(win, ReaderMysticCore.RESOURCE_KEYS.map(x => [x, x]), cfg.消耗属性)}</select></label>
      <label class="ppw-field"><span>施放消耗</span><select data-rm-field="cost-tier" data-ppw-change="mystic">${this.options(win, [['0', '平均值15%（0点）'], ['1', '平均值10%（1点）'], ['2', '平均值5%（3点）'], ['3', '无消耗（6点）']], cfg.消耗档)}</select></label>
      <label class="ppw-field" data-rm-show="target-range" style="${isSelf ? 'display:none;' : ''}"><span>射程</span><select data-rm-field="range" data-ppw-change="mystic">${this.options(win, [['1', '1格（0点）'], ['3', '3格（1点）'], ['5', '5格（2点）'], ['7', '7格（3点）'], ['global', '全图（5点）']], cfg.射程)}</select></label>
      <label class="ppw-field" data-rm-show="group" style="${isGroup ? '' : 'display:none;'}"><span>范围半径</span><select data-rm-field="radius" data-ppw-change="mystic">${this.options(win, [['1', '半径1（2点）'], ['2', '半径2（4点）'], ['3', '半径3（6点）']], cfg.范围半径)}</select></label>
    </div>
    <label class="ppw-field"><span>技能描述</span><textarea maxlength="120" rows="2" data-rm-field="description" data-ppw-change="mystic">${win.esc(cfg.描述)}</textarea></label>
    ${this.effectHtml(win, cfg.状态效果[0], 1)}
    ${this.effectHtml(win, cfg.状态效果[1], 2)}
    <p class="ppw-hint" data-rm-preview>${valueText}；固定消耗：${built.cost.amount}${cfg.消耗属性}</p>
    <p class="${check.valid ? 'ppw-hint' : 'ppw-warn'}" data-rm-points>秘术点：${check.points}/${gate.points}${check.errors.length ? `；${win.esc(check.errors.join('；'))}` : ''}</p>
    <div class="ppw-actions">
      <button type="button" class="ppw-btn" data-ppw="save-mystic" data-arg="${slot}"${check.valid ? '' : ' disabled'}>保存并同步</button>
      <button type="button" class="ppw-btn warn" data-ppw="delete-mystic" data-arg="${slot}"${saved ? '' : ' disabled'}>删除秘术</button>
    </div>
  </div>
</details>`;
  },

  readConfig(root, slot) {
    const field = name => root.querySelector(`[data-rm-field="${name}"]`);
    const effects = [1, 2].map(index => {
      const box = root.querySelector(`[data-rm-effect="${index}"]`);
      const ef = name => box && box.querySelector(`[data-rm-effect-field="${name}"]`);
      return {
        类型: ef('type')?.value || '',
        属性: ef('stat')?.value || 'attack',
        资源属性: ef('resource')?.value || '活力',
        目标: ef('target')?.value || 'hit',
        持续: Number(ef('duration')?.value || 1),
        强度档: Number(ef('strength')?.value || 0),
      };
    });
    return ReaderMysticCore.normalizeConfig({
      名称: field('name')?.value || '',
      描述: field('description')?.value || '',
      流派: field('kind')?.value || 'damage',
      目标模式: field('scope')?.value || 'single',
      施法中心: field('center')?.value || 'target',
      伤害类型: field('damage-type')?.value || 'mystical',
      治疗属性: field('heal-type')?.value || '活力',
      消耗属性: field('cost-stat')?.value || '灵性',
      强度档: Number(field('strength')?.value || 0),
      消耗档: Number(field('cost-tier')?.value || 0),
      射程: field('range')?.value || '1',
      范围半径: Number(field('radius')?.value || 1),
      状态效果: effects,
    }, slot);
  },

  refreshSlot(win, root, slot) {
    if (!root) return;
    const cfg = this.readConfig(root, slot);
    const gate = this.gate(win);
    const check = ReaderMysticCore.validateConfig(cfg, slot, gate);
    const isDamage = cfg.流派 === 'damage';
    const isGroup = cfg.目标模式 === 'group';
    const isSelf = cfg.施法中心 === 'self';
    const centerSelect = root.querySelector('[data-rm-field="center"]');
    if (centerSelect && isDamage && !isGroup && centerSelect.value === 'self') centerSelect.value = 'target';
    root.querySelectorAll('[data-rm-show="damage"]').forEach(el => { el.style.display = isDamage ? '' : 'none'; });
    root.querySelectorAll('[data-rm-show="heal"]').forEach(el => { el.style.display = isDamage ? 'none' : ''; });
    root.querySelectorAll('[data-rm-show="group"]').forEach(el => { el.style.display = isGroup ? '' : 'none'; });
    root.querySelectorAll('[data-rm-show="target-range"]').forEach(el => { el.style.display = isSelf ? 'none' : ''; });
    [1, 2].forEach(index => {
      const effect = cfg.状态效果[index - 1];
      const combat = effect.类型 === 'buff' || effect.类型 === 'debuff';
      const resource = effect.类型 === 'poison' || effect.类型 === 'regen';
      root.querySelectorAll(`[data-rm-show="effect-combat-${index}"]`).forEach(el => { el.style.display = combat ? '' : 'none'; });
      root.querySelectorAll(`[data-rm-show="effect-resource-${index}"]`).forEach(el => { el.style.display = resource ? '' : 'none'; });
    });
    const built = ReaderMysticCore.buildAbility(cfg, slot, gate.rank);
    const preview = root.querySelector('[data-rm-preview]');
    if (preview) preview.textContent = `${isDamage ? `固定 power：${built.power}` : `固定治疗量：${built.healAmt}`}；固定消耗：${built.cost.amount}${cfg.消耗属性}`;
    const points = root.querySelector('[data-rm-points]');
    if (points) {
      points.textContent = `秘术点：${check.points}/${gate.points}${check.errors.length ? `；${check.errors.join('；')}` : ''}`;
      points.className = check.valid ? 'ppw-hint' : 'ppw-warn';
    }
    const save = root.querySelector('[data-ppw="save-mystic"]');
    if (save) save.disabled = !check.valid;
  },

  render(win, gate) {
    const state = win.game && win.game.currentMvuState;
    gate = ReaderMysticCore.resolve(win.playerSequence(), state);
    const modeState = this.state(win);
    if (modeState.view === 'learning-select') {
      return this.renderLearningSelect(win, gate, modeState.learningSlot);
    }
    const configs = ReaderMysticCore.configs(state);
    const hidden = [1, 2, 3, 4].filter(i => i > gate.slots && configs[i]).length;
    const rows = [];
    for (let slot = 1; slot <= gate.slots; slot++) rows.push(this.editorHtml(win, slot, configs[slot], gate));
    return `${this.learningOverviewHtml(win, gate)}<div class="ppw-card">
  <p class="ppw-hint">当前有效阅读者档位：${gate.viaTitle ? '上帝' : `序列${gate.rank}`}；基础 ${gate.basePoints} 点 + 学习 ${gate.learningPoints} 点；每个秘术独享 ${gate.points} 点总额度；可用秘术栏位 ${gate.slots} 个。</p>
  <p class="ppw-hint">保存后会重建 <code>${ReaderMysticCore.ABILITY_GROUP}</code>，其中只写标准序列能力字段，战斗过程不走任何专用逻辑。</p>
  ${hidden ? `<p class="ppw-warn">另有 ${hidden} 个高阶栏位配置因当前序列不足而保留但不生效。</p>` : ''}
  ${rows.join('')}
</div>`;
  },

  onChange(win, kind, element) {
    if (kind !== 'mystic' && kind !== 'mystic-effect') return;
    const root = element.closest('[data-mystic-slot]');
    if (!root) return;
    this.refreshSlot(win, root, Number(root.dataset.mysticSlot));
  },

  duplicateError(state, slot, name) {
    const configs = ReaderMysticCore.configs(state);
    for (const [otherSlot, cfg] of Object.entries(configs)) {
      if (Number(otherSlot) !== Number(slot) && cfg.名称 === name) return '其他秘术栏位已使用该名称。';
    }
    if (ReaderMysticCore.namesOutsideProjection(state).has(name)) return '序列能力列表中已存在同名能力。';
    return '';
  },

  async save(win, slot) {
    const state = win.game && win.game.currentMvuState;
    const gate = this.gate(win);
    const root = this.scope()?.querySelector(`[data-mystic-slot="${slot}"]`);
    if (!state || !gate.unlocked || !root || slot > gate.slots) { win.msg('当前栏位不可用。', 3500); return; }
    const cfg = this.readConfig(root, slot);
    const check = ReaderMysticCore.validateConfig(cfg, slot, gate);
    if (!check.valid) { win.msg(check.errors.join('；'), 4000); return; }
    const duplicate = this.duplicateError(state, slot, check.config.名称);
    if (duplicate) { win.msg(duplicate, 4000); return; }
    ReaderMysticCore.saveConfig(state, slot, check.config);
    ReaderMysticCore.syncPlayerProjection(state);
    win.persist();
    await win.persistZero();
    win.msg(`秘术“${check.config.名称}”已保存并同步到序列能力列表。`, 3500);
    win.render();
  },

  async remove(win, slot) {
    const state = win.game && win.game.currentMvuState;
    if (!state || !ReaderMysticCore.configs(state)[slot]) return;
    if (!window.confirm(`确定删除秘术栏位${slot}的配置吗？`)) return;
    ReaderMysticCore.deleteConfig(state, slot);
    ReaderMysticCore.syncPlayerProjection(state);
    win.persist();
    await win.persistZero();
    win.msg(`秘术栏位${slot}已删除。`);
    win.render();
  },

  collectLearningPick(win, slot) {
    const state = win.game && win.game.currentMvuState;
    const gate = this.gate(win);
    const candidates = ReaderMysticCore.learningCandidates(state, gate, slot);
    let picked = null;
    this.scope()?.querySelectorAll('[data-rm-learning-row]').forEach(row => {
      const radio = row.querySelector('.rm-learning-target');
      if (!radio || !radio.checked) return;
      picked = candidates[Number(row.dataset.rmLearningRow)] || null;
    });
    return picked;
  },

  async startLearning(win, slot) {
    const state = win.game && win.game.currentMvuState;
    const gate = this.gate(win);
    if (!state || !gate.unlocked || slot > gate.learningSlots) { win.msg('当前学习栏位不可用。', 3500); return; }
    const picked = this.collectLearningPick(win, slot);
    if (!picked) { win.msg('请先选择一名人物及要学习的非阅读者途径。', 3500); return; }
    const error = ReaderMysticCore.validateLearningTarget(state, slot, picked, gate);
    if (error) { win.msg(error, 4000); win.render(); return; }
    const ok = window.confirm(`确定以“${picked.目标}”的“${picked.学习序列}”作为解析和学习目标吗？\n\n请前往正文，明确完成对该人物该途径非凡能力的解析、掌握或学习。仅观察、交手、请教或尝试不会通过认定。`);
    if (!ok) return;
    const old = ReaderMysticCore.learningEntries(state)[slot]?.已认定 || null;
    ReaderMysticCore.writeLearningSlot(state, slot, old, { ...picked, 上次失败原因: '' });
    win.persist();
    await win.persistZero();
    const st = this.state(win);
    st.view = 'main';
    win.msg(`学习目标栏位${slot}已开始，请完成正文剧情后回来认定。`, 4000);
    win.render();
  },

  async cancelLearning(win, slot) {
    const state = win.game && win.game.currentMvuState;
    const entry = state && ReaderMysticCore.learningEntries(state)[slot];
    if (!entry || !entry.进行中) return;
    if (!window.confirm(`确定取消学习目标栏位${slot}正在进行的任务吗？已认定记录不会受影响。`)) return;
    ReaderMysticCore.writeLearningSlot(state, slot, entry.已认定, null);
    win.persist();
    await win.persistZero();
    win.msg(`学习目标栏位${slot}的进行中任务已取消。`);
    win.render();
  },

  learningPrompt(win, latest) {
    const npc = latest.npc || {};
    let abilities = '';
    try { abilities = JSON.stringify(npc.能力清单 || npc.序列能力列表 || []); } catch (_) { abilities = ''; }
    if (abilities.length > 5000) abilities = abilities.slice(0, 5000) + '…';
    return `你是“阅读者途径 · 秘术强化 · 解析和学习”的认定官。

玩家【${win.playerName()}】正在以【${latest.record.目标}】为学习对象，指定学习其【${latest.record.学习序列}】所代表的【${latest.record.途径}】途径能力。
目标最新完整当前序列：【${latest.record.当前序列}】
目标变量中的能力记录：${abilities || '（未记录）'}

请只依据系统提供的 <历史事件>、<近期事件> 与最新正文判断。必须有明确剧情证据证明玩家已经从该目标、针对所选途径，成功解析、掌握或学会了至少一种非凡能力。

以下情况一律不通过：仅仅观察能力、与目标交手、提出请教、开始尝试、进行研究、听到说明、目标只做了展示，或剧情只写“准备学习”“尝试理解”而没有明确写成已经成功掌握。
解析与正式传授都可以通过，但成功主体必须是玩家，来源必须能对应所选目标和所选途径。不得用其他人物、其他途径或模糊的知识积累代替。材料不充分或拿不准时必须判不通过。

只输出一个 <裁定> 块，不要输出其他内容：
<裁定>
通过|一句话理由
</裁定>
或
<裁定>
不通过|一句话失败原因
</裁定>
理由不得包含竖线或换行。`;
  },

  parseLearningVerdict(raw) {
    const block = String(raw || '').match(/<裁定>([\s\S]*?)<\/裁定>/);
    if (!block) return null;
    const line = block[1].split(/\r?\n/).map(x => x.trim()).find(Boolean);
    if (!line) return null;
    const parts = line.split('|');
    const verdict = String(parts[0] || '').trim();
    const rejected = /不通过|未通过/.test(verdict);
    const passed = /通过/.test(verdict) && !rejected;
    if (!passed && !rejected) return null;
    return { ok: passed, reason: String(parts.slice(1).join('|') || '').trim() || '（模型未给出理由）' };
  },

  async saveLearningFailure(win, slot, reason, refreshed) {
    const state = win.game && win.game.currentMvuState;
    const entry = state && ReaderMysticCore.learningEntries(state)[slot];
    if (!entry || !entry.进行中) return;
    const pending = { ...(refreshed || entry.进行中), 上次失败原因: String(reason || '认定失败') };
    ReaderMysticCore.writeLearningSlot(state, slot, entry.已认定, pending);
    win.persist();
    await win.persistZero();
  },

  async recognizeLearning(win, slot) {
    if (win.isBusy) return;
    const state = win.game && win.game.currentMvuState;
    const gate = this.gate(win);
    if (!state || !gate.unlocked || slot > gate.learningSlots) { win.msg('当前学习栏位不可用。', 3500); return; }
    const latest = ReaderMysticCore.refreshPendingLearning(state, slot, gate);
    if (!latest.ok) {
      await this.saveLearningFailure(win, slot, latest.error, latest.record);
      win.msg(`${latest.error}。请重新选择目标。`, 4500);
      win.render();
      return;
    }
    if (!win.ensureApiReady()) return;

    win.isBusy = true;
    if (win.game) win.game.isBackgroundProcessing = true;
    win.render();
    try {
      const raw = await win.callRaw(this.learningPrompt(win, latest), '请认定我是否已经成功完成这次解析和学习。');
      const verdict = this.parseLearningVerdict(raw);
      if (!verdict) {
        await this.saveLearningFailure(win, slot, '模型回复格式无法解析，本次未通过，可直接重试', latest.record);
        win.msg('模型回复格式无法解析，本次未通过，可直接重试。', 4500);
      } else if (!verdict.ok) {
        await this.saveLearningFailure(win, slot, verdict.reason, latest.record);
        win.msg(`认定不通过：${verdict.reason}`, 4500);
      } else {
        const entry = ReaderMysticCore.learningEntries(state)[slot] || {};
        const oldReward = entry.已认定 ? ReaderMysticCore.learningRewardForRank(entry.已认定.序列等级) : 0;
        const newReward = ReaderMysticCore.learningRewardForRank(latest.record.序列等级);
        ReaderMysticCore.writeLearningSlot(state, slot, {
          ...latest.record,
          奖励点数: newReward,
          认定理由: verdict.reason,
        }, null);
        ReaderMysticCore.syncPlayerProjection(state);
        win.persist();
        await win.persistZero();
        const now = this.gate(win);
        const rewardChange = newReward > oldReward ? `总额度增加 ${newReward - oldReward} 点` : '同奖励档替换，总额度不变';
        win.msg(`认定通过：学习目标栏位${slot}奖励为 ${newReward} 点，${rewardChange}；当前每个秘术额度 ${now.points} 点。`, 5000);
      }
    } catch (e) {
      console.error('[秘术强化] 解析和学习认定失败', e);
      await this.saveLearningFailure(win, slot, `调用失败：${e.message || e}`, latest.record);
      win.msg(`认定调用失败：${e.message || e}，可直接重试。`, 4500);
    } finally {
      if (win.game) win.game.isBackgroundProcessing = false;
      win.isBusy = false;
      win.render();
    }
  },

  async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    const mysticSlot = Math.max(1, Math.min(4, Math.floor(Number(arg) || 1)));
    const learningSlot = Math.max(1, Math.min(ReaderMysticCore.MAX_LEARNING_SLOTS, Math.floor(Number(arg) || 1)));
    const st = this.state(win);
    if (act === 'save-mystic') return this.save(win, mysticSlot);
    if (act === 'delete-mystic') return this.remove(win, mysticSlot);
    if (act === 'to-learning-select') { st.view = 'learning-select'; st.learningSlot = learningSlot; win.render(); return; }
    if (act === 'learning-back') { st.view = 'main'; win.render(); return; }
    if (act === 'start-learning') return this.startLearning(win, learningSlot);
    if (act === 'cancel-learning') return this.cancelLearning(win, learningSlot);
    if (act === 'recognize-learning') return this.recognizeLearning(win, learningSlot);
  },
};
    ReaderMysticMode.scope = deps.scope;
    return { core: ReaderMysticCore, mode: ReaderMysticMode };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
