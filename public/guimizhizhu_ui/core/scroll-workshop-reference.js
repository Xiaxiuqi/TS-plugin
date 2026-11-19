// Generated from the complete original scroll editor, manufacturing mode and effect rules.
(() => {
  'use strict';
  const KEY = 'cryptLord.scrollWorkshopReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const PlayerProjectionResolver = window.PlayerProjectionResolver;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways,
      consumableConfig: { avgAttrByRank: deps.averages ||
        deps.pool.pictureConfig?.consumableConfig?.avgAttrByRank ||
        modules['cryptLord.battleFieldEffectReference']?.averages() || {} } } };
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
    const SkillRange = {
isAllType(targetType) {
        return targetType === 'all' || targetType === 'allEnemies'
            || targetType === 'allAlly' || targetType === 'allAllies';
    }
    };
    class Move { constructor(config) { Object.assign(this, config); } }
class ConsumableMoveBuilder {
    static getAvgAttrs(rank) {
        const table = (typeof GameDBManager !== 'undefined' && GameDBManager.DB?.consumableConfig?.avgAttrByRank) || {};
        const key = String(rank);
        return table[key] || table['10'] || { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27, 运气: 20 };
    }

    static isAttackEffect(baseEffect) {
        return ['物理攻击', '法术攻击', '精神攻击', '命运攻击'].includes(baseEffect);
    }

    static isHealEffect(baseEffect) {
        return ['活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复'].includes(baseEffect);
    }

    static resolveConsumablePower(item, scope) {
        const rank = parseSequenceRank(item.序列);
        const attrs = this.getAvgAttrs(rank);
        const ratio = scope === '全体' ? 0.10 : 0.20;
        return Math.round(attrs.活力 * ratio);
    }

    static resolveConsumableHealAmt(item, baseEffect, scope) {
        const rank = parseSequenceRank(item.序列);
        const attrs = this.getAvgAttrs(rank);
        const statMap = {
            '活力恢复': '活力',
            '敏捷恢复': '敏捷',
            '灵性恢复': '灵性',
            '人性恢复': '人性',
            '理智恢复': '理智'
        };
        const stat = statMap[baseEffect] || '活力';
        const ratio = scope === '全体' ? 0.20 : 0.40;
        return Math.round((attrs[stat] ?? 0) * ratio);
    }

    static resolveConsumableBuffPower(item) {
        const rank = parseSequenceRank(item.序列);
        if (rank <= -1) return 30;
        if (rank >= 0 && rank <= 0.9) return 25;
        if (rank >= 1 && rank <= 2) return 20;
        if (rank >= 3 && rank <= 4) return 15;
        if (rank >= 5 && rank <= 6) return 10;
        return 5;
    }

    static resolveConsumableCost(item) {
        const rank = parseSequenceRank(item.序列);
        const attrs = this.getAvgAttrs(rank);
        const mdStandard = Math.round(attrs.灵性 * 0.10);
        const amount = Math.round(mdStandard * 0.25);
        return { type: 'currentSpirit', amount };
    }

    static mapDamageType(baseEffect) {
        const map = {
            '物理攻击': 'physical',
            '法术攻击': 'mystical',
            '精神攻击': 'mental',
            '命运攻击': 'mixed'
        };
        return map[baseEffect] || 'physical';
    }

    static mapHealType(baseEffect) {
        const map = {
            '活力恢复': '活力',
            '敏捷恢复': '敏捷',
            '灵性恢复': '灵性',
            '人性恢复': '人性',
            '理智恢复': '理智'
        };
        return map[baseEffect] || '活力';
    }

    static resolveEffectTarget(baseEffect, scope, extraEffect) {
        if (!extraEffect) return null;

        const isAttack = this.isAttackEffect(baseEffect);
        const isHeal = this.isHealEffect(baseEffect);
        const isSingle = scope !== '全体';
        // 必须先判 DEBUFF：'攻击DEBUFF'.endsWith('BUFF') 也为 true
        const isDebuff = extraEffect.endsWith('DEBUFF');
        const isBuff = !isDebuff && extraEffect.endsWith('BUFF');

        if (isAttack) {
            if (isBuff) return isSingle ? 'self' : 'allAlly';
            if (isDebuff) return isSingle ? 'target' : 'all';
        }
        if (isHeal) {
            if (isDebuff && isSingle) return null;
            if (isBuff) return isSingle ? 'target' : 'allAlly';
            if (isDebuff) return 'all';
        }
        return null;
    }

    static buildEffect(extraEffect, item, baseEffect, scope) {
        if (!extraEffect) return null;

        const effectTarget = this.resolveEffectTarget(baseEffect, scope, extraEffect);
        if (effectTarget === null) return null;

        // 必须先判 DEBUFF：'攻击DEBUFF'.endsWith('BUFF') 也为 true
        const isDebuff = extraEffect.endsWith('DEBUFF');
        const isBuff = !isDebuff && extraEffect.endsWith('BUFF');
        return {
            name: extraEffect,
            type: isBuff ? 'buff' : 'debuff',
            stat: this.mapExtraStat(extraEffect),
            valueType: 'percentage',
            power: this.resolveConsumableBuffPower(item),
            duration: 3,
            effectTarget: effectTarget
        };
    }

    static mapExtraStat(extraEffect) {
        const map = {
            '攻击BUFF': 'attack',
            '防御BUFF': 'defense',
            '速度BUFF': 'speed',
            '攻击DEBUFF': 'attack',
            '防御DEBUFF': 'defense',
            '速度DEBUFF': 'speed'
        };
        return map[extraEffect] || 'attack';
    }

    // 卷轴制造只把“增强档位”藏在 $ 对象里；最终数值必须在开战读卡时，
    // 先按当前使用者走完普通消耗品公式，再由这里覆盖。这样晋升与交易后都会重算，
    // 同时正文 AI 看不到、也改不到真正决定战斗数值的档位。
    static scrollTier(raw) {
        const tier = Math.floor(Number(raw));
        return tier >= 1 && tier <= 3 ? tier : 0;
    }

    static scrollMultiplier(tier) {
        return ({ 1: 1.25, 2: 1.5, 3: 2 })[this.scrollTier(tier)] || 1;
    }

    static applyScrollEnhancement(config, item) {
        const enhanced = item && item['$卷轴增强'];
        if (!enhanced || typeof enhanced !== 'object' || Array.isArray(enhanced)) return config;

        const powerTier = this.scrollTier(enhanced.威力);
        const healTier = this.scrollTier(enhanced.恢复量);
        const effectTier = this.scrollTier(enhanced.附加效果幅度);
        const durationTier = this.scrollTier(enhanced.持续回合);
        const costTier = this.scrollTier(enhanced.使用灵性消耗);
        const rangeTier = this.scrollTier(enhanced.射程);
        const radiusTier = this.scrollTier(enhanced.全体半径);

        if (powerTier && !config.isHeal && Number.isFinite(Number(config.power))) {
            config.power = Math.round(Number(config.power) * this.scrollMultiplier(powerTier));
        }
        if (healTier && config.isHeal && Number.isFinite(Number(config.healAmt))) {
            config.healAmt = Math.round(Number(config.healAmt) * this.scrollMultiplier(healTier));
        }
        if (Array.isArray(config.effects) && config.effects[0]) {
            if (effectTier && Number.isFinite(Number(config.effects[0].power))) {
                config.effects[0].power = Math.round(Number(config.effects[0].power) * this.scrollMultiplier(effectTier));
            }
            if (durationTier) config.effects[0].duration = ({ 1: 4, 2: 5, 3: 6 })[durationTier];
        }
        if (costTier && config.cost && Number.isFinite(Number(config.cost.amount))) {
            const ratio = ({ 1: 0.75, 2: 0.5, 3: 0.25 })[costTier];
            config.cost.amount = Math.round(Number(config.cost.amount) * ratio);
        }
        if (rangeTier) config.range = ({ 1: 4, 2: 5, 3: 6 })[rangeTier];
        if (radiusTier && SkillRange.isAllType(config.targetType)) {
            config.aoeRadius = ({ 1: 3, 2: 4, 3: 5 })[radiusTier];
        }
        return config;
    }

    /**
     * 相对玩家序列的 power 倍率（兼容小数序列）
     * gap = playerRank - itemRank；正数表示消耗品更高阶
     * >=2 →×50，>=1 且 <2 →×10，否则 ×1
     */
    static resolvePowerMultiplier(playerSequenceRank, item) {
        const playerRank = Number(playerSequenceRank);
        const itemRank = parseSequenceRank(item?.序列);
        if (Number.isNaN(playerRank) || Number.isNaN(itemRank)) return 1;
        const gap = playerRank - itemRank;
        if (gap >= 2) return 50;
        if (gap >= 1) return 10;
        return 1;
    }

    static build(item, itemKey, playerSequenceRank = null) {
        const battle = item.战斗效果;
        if (!battle || typeof battle !== 'object') return null;

        const baseEffect = battle.基础效果;
        const extraEffect = battle.额外效果;
        const scope = battle.范围 || '单体'; // 仅运行时兜底，不写回存档

        if (!baseEffect) return null;

        const baseCost = this.resolveConsumableCost(item);
        const config = {
            name: item.名称 || itemKey || '未命名消耗品',
            priority: 0,
            isPassive: false,
            // 消耗品消耗在原有基础上再下调 50%（辅助能力不走此 build，不受影响）
            cost: {
                type: baseCost.type,
                amount: Math.round((baseCost.amount ?? 0) * 0.5)
            },
            isConsumable: true,
            remainingUses: item.数量 ?? 0,
            consumableItemKey: itemKey,
            description: item.描述 || ''
        };

        if (this.isAttackEffect(baseEffect)) {
            config.damageType = this.mapDamageType(baseEffect);
            const basePower = this.resolveConsumablePower(item, scope);
            const mult = this.resolvePowerMultiplier(playerSequenceRank, item);
            config.power = Math.round(basePower * mult);
            config.targetType = scope === '全体' ? 'all' : 'single';
            config.isHeal = false;
        } else if (this.isHealEffect(baseEffect)) {
            config.isHeal = true;
            config.healAmt = this.resolveConsumableHealAmt(item, baseEffect, scope);
            config.healType = this.mapHealType(baseEffect);
            config.healValueType = 'fixed';
            config.targetType = scope === '全体' ? 'allAlly' : 'ally';
        } else {
            console.warn(`[ConsumableMoveBuilder] 未知基础效果: ${baseEffect}`);
            return null;
        }

        const effect = this.buildEffect(extraEffect, item, baseEffect, scope);
        config.effects = effect ? [effect] : [];

        this.applyScrollEnhancement(config, item);

        return new Move(config);
    }
}
const MysteryPryerScrollMode = {
  id: 'mystery-pryer-scroll-crafting',
  途径: '窥秘人',
  途径全名: '窥秘人途径',
  名称: '卷轴制造',
  图标: '📜',
  GATE: 6,
  TITLE: '知识之妖',
  STORE_PLAY: '卷轴制造玩法',
  STORE_TEMPLATES: '卷轴样式',
  MATERIAL_YIELD: Object.freeze({ 灵性材料: 1, 魔药辅助材料: 2, 魔药主材料: 10, 非凡特性: 20 }),
  BASE_EFFECTS: Object.freeze(['物理攻击', '法术攻击', '精神攻击', '命运攻击', '活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复']),
  EXTRA_EFFECTS: Object.freeze(['攻击BUFF', '防御BUFF', '速度BUFF', '攻击DEBUFF', '防御DEBUFF', '速度DEBUFF']),
  RANKS: Object.freeze([-2, -1, 0, 0.1, 0.3, 0.4, 0.5, 0.8, 0.9, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
  ENHANCE_KEYS: Object.freeze(['威力', '恢复量', '附加效果幅度', '持续回合', '使用灵性消耗', '射程', '全体半径']),
  ENHANCE_LABELS: Object.freeze({
    威力: '威力', 恢复量: '恢复量', 附加效果幅度: '附加效果幅度', 持续回合: '持续回合',
    使用灵性消耗: '使用灵性消耗', 射程: '射程', 全体半径: '全体半径',
  }),
  TIER_ROMAN: Object.freeze({ 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ' }),

  clone(value) {
    try {
      if (typeof _ !== 'undefined' && _ && typeof _.cloneDeep === 'function') return _.cloneDeep(value);
      return JSON.parse(JSON.stringify(value));
    } catch (_) { return value; }
  },

  resolve(sequenceString) {
    const text = String(sequenceString || '');
    if (text.includes(this.TITLE)) return { inPathway: true, unlocked: true, rank: -1, viaTitle: true };
    let best = null;
    LifeSaveManager.splitSequenceFragments(text).forEach(frag => {
      const row = LifeSaveManager.resolveFragment(frag);
      if (!row || row.pathwayShort !== this.途径) return;
      const rank = Number(row.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, unlocked: false, rank: null, viaTitle: false };
    return { inPathway: true, unlocked: best <= this.GATE, rank: best, viaTitle: false };
  },

  effectiveSequence(win) {
    const state = win.game && win.game.currentMvuState;
    return state && window.PlayerProjectionResolver
      ? PlayerProjectionResolver.resolve(state).effectiveSequence
      : win.playerSequence();
  },

  gate(win) { return this.resolve(this.effectiveSequence(win)); },

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
      play = pathway[this.STORE_PLAY] = { 版本: 1, [this.STORE_TEMPLATES]: {} };
    }
    let templates = play[this.STORE_TEMPLATES];
    if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
      if (!create) return { play, templates: null };
      templates = play[this.STORE_TEMPLATES] = {};
    }
    return { play, templates };
  },

  templates(win) {
    const store = this.store(win.game && win.game.currentMvuState, false);
    const bag = (store && store.templates) || {};
    return Object.keys(bag).filter(id => id !== '$meta' && bag[id] && typeof bag[id] === 'object')
      .map(id => ({ id, data: bag[id] }))
      .sort((a, b) => String(a.data.名称 || '').localeCompare(String(b.data.名称 || ''), 'zh-CN'));
  },

  template(win, id) {
    const store = this.store(win.game && win.game.currentMvuState, false);
    const row = store && store.templates && store.templates[id];
    return row && typeof row === 'object' ? row : null;
  },

  rankText(rank) {
    const n = Number(rank);
    if (n === -2) return '支柱';
    if (n === -1) return '旧日';
    return `序列${n}`;
  },

  templateRank(template) {
    const hidden = Number(template && template['$目标位阶']);
    return Number.isFinite(hidden) ? hidden : parseSequenceRank(String((template && template.序列) || ''));
  },

  selectableRanks(makerRank) {
    const maker = Number(makerRank);
    if (!Number.isFinite(maker)) return [];
    const rows = Array.from(new Set(this.RANKS.concat([maker]))).sort((a, b) => a - b);
    return rows.filter(rank => rank >= maker - 1e-9 && rank <= 9);
  },

  tier(raw) {
    const n = Math.floor(Number(raw));
    return n >= 1 && n <= 3 ? n : 0;
  },

  isAttack(baseEffect) { return ConsumableMoveBuilder.isAttackEffect(baseEffect); },
  isHeal(baseEffect) { return ConsumableMoveBuilder.isHealEffect(baseEffect); },

  validExtra(baseEffect, scope, extraEffect) {
    if (!extraEffect) return true;
    return ConsumableMoveBuilder.resolveEffectTarget(baseEffect, scope, extraEffect) !== null;
  },

  validExtras(baseEffect, scope) {
    return this.EXTRA_EFFECTS.filter(extra => this.validExtra(baseEffect, scope, extra));
  },

  applicableEnhancements(draft) {
    const out = [];
    if (this.isAttack(draft.baseEffect)) out.push('威力');
    if (this.isHeal(draft.baseEffect)) out.push('恢复量');
    if (draft.extraEffect) out.push('附加效果幅度', '持续回合');
    out.push('使用灵性消耗', '射程');
    if (draft.scope === '全体') out.push('全体半径');
    return out;
  },

  enhancementText(enhancements) {
    const parts = this.ENHANCE_KEYS.filter(key => this.tier(enhancements && enhancements[key]))
      .map(key => `${this.ENHANCE_LABELS[key]}${this.TIER_ROMAN[this.tier(enhancements[key])]}`);
    return parts.join('、');
  },

  enhancementCount(enhancements) {
    return this.ENHANCE_KEYS.reduce((sum, key) => sum + (this.tier(enhancements && enhancements[key]) ? 1 : 0), 0);
  },

  templateSignature(template) {
    return JSON.stringify({
      名称: String((template && template.名称) || ''),
      序列: String((template && template.序列) || ''),
      描述: String((template && template.描述) || ''),
      战斗效果: (template && template.战斗效果) || {},
      增强档位: (template && template.增强档位) || {},
    });
  },

  newId() {
    const rnd = (window.crypto && typeof window.crypto.getRandomValues === 'function')
      ? (() => { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0].toString(36); })()
      : Math.random().toString(36).slice(2, 10);
    return `scroll-${Date.now().toString(36)}-${rnd}`;
  },

  defaultDraft(gate) {
    const ranks = this.selectableRanks(gate.rank);
    return {
      name: '', rank: ranks[0] ?? 9, description: '', baseEffect: '物理攻击',
      extraEffect: '', scope: '单体', enhancements: {},
    };
  },

  draftFromTemplate(template) {
    return {
      name: String(template.名称 || ''),
      rank: this.templateRank(template),
      description: String(template.描述 || ''),
      baseEffect: String(template.战斗效果?.基础效果 || '物理攻击'),
      extraEffect: String(template.战斗效果?.额外效果 || ''),
      scope: String(template.战斗效果?.范围 || '单体'),
      enhancements: this.clone(template.增强档位 || {}),
    };
  },

  recordFromDraft(draft, id, version) {
    const applicable = new Set(this.applicableEnhancements(draft));
    const enhanced = {};
    this.ENHANCE_KEYS.forEach(key => {
      const tier = applicable.has(key) ? this.tier(draft.enhancements && draft.enhancements[key]) : 0;
      if (tier) enhanced[key] = tier;
    });
    const battle = { 基础效果: draft.baseEffect, 范围: draft.scope };
    if (draft.extraEffect) battle.额外效果 = draft.extraEffect;
    return {
      ID: id,
      名称: String(draft.name || '').trim(),
      序列: this.rankText(draft.rank),
      描述: String(draft.description || '').trim(),
      战斗效果: battle,
      增强档位: enhanced,
      版本: Math.max(1, Math.floor(Number(version) || 1)),
      '$目标位阶': Number(draft.rank),
    };
  },

  hasProduced(win, templateId) {
    const list = win.sd()?.消耗品列表 || {};
    return Object.keys(list).some(key => key !== '$meta' && list[key]
      && String(list[key]['$卷轴样式ID'] || '') === String(templateId));
  },

  nameCollision(win, name, editingId, oldName) {
    const normal = String(name || '').trim();
    const strong = `强化${normal}`;
    for (const { id, data } of this.templates(win)) {
      if (id === editingId) continue;
      const other = String(data.名称 || '').trim();
      if ([other, `强化${other}`].includes(normal) || [other, `强化${other}`].includes(strong)) return '名称与其它卷轴样式冲突';
    }
    const list = win.sd()?.消耗品列表 || {};
    for (const key of Object.keys(list)) {
      if (key === '$meta' || !list[key] || typeof list[key] !== 'object') continue;
      const item = list[key];
      const itemName = String(item.名称 || key).trim();
      const ownOldOutput = editingId && String(item['$卷轴样式ID'] || '') === String(editingId)
        && String(name) === String(oldName) && [String(oldName), `强化${oldName}`].includes(itemName);
      if (!ownOldOutput && (itemName === normal || itemName === strong)) return `名称与现有消耗品“${itemName}”冲突`;
    }
    return '';
  },

  validateDraft(win, draft, editingId) {
    const gate = this.gate(win);
    const errors = [];
    const name = String(draft.name || '').trim();
    const rank = Number(draft.rank);
    const old = editingId ? this.template(win, editingId) : null;
    if (!gate.unlocked) errors.push('当前没有卷轴制造资格');
    if (!name) errors.push('卷轴样式名称不能为空');
    if (!this.BASE_EFFECTS.includes(draft.baseEffect)) errors.push('基础效果无效');
    if (!['单体', '全体'].includes(draft.scope)) errors.push('范围无效');
    if (!this.validExtra(draft.baseEffect, draft.scope, draft.extraEffect)) errors.push('该基础效果、范围与额外效果组合无效');
    if (!this.selectableRanks(gate.rank).some(x => Math.abs(x - rank) < 1e-9)) errors.push('目标位阶不能高于制造者且最低只能到序列9');
    const collision = name && this.nameCollision(win, name, editingId, old && old.名称);
    if (collision) errors.push(collision);
    if (old && this.hasProduced(win, editingId) && name === String(old.名称 || '').trim()) {
      const proposed = this.recordFromDraft(draft, editingId, old.版本);
      if (this.templateSignature(proposed) !== this.templateSignature(old)) errors.push('该样式已有库存成品；修改后必须使用一个新名称');
    }
    return { valid: errors.length === 0, errors };
  },

  state(win) {
    if (!win._modeState) win._modeState = {};
    if (!win._modeState[this.id]) {
      win._modeState[this.id] = {
        view: 'main', editId: '', draft: null, materialKey: '', materialQty: 1,
        allocations: {}, lastResult: null,
      };
    }
    return win._modeState[this.id];
  },

  scope() { return document.querySelector(`#ppw-body [data-ppw-mode="${this.id}"]`); },

  materials(win) {
    const list = win.sd()?.其他列表 || {};
    return Object.keys(list).filter(key => key !== '$meta').map(key => ({ key, item: list[key] }))
      .filter(row => row.item && typeof row.item === 'object'
        && Object.prototype.hasOwnProperty.call(this.MATERIAL_YIELD, String(row.item.类型 || ''))
        && Math.floor(Number(row.item.数量) || 0) > 0)
      .map(row => ({
        ...row,
        name: String(row.item.名称 || row.key),
        type: String(row.item.类型 || ''),
        rank: parseSequenceRank(String(row.item.序列 || '普通')),
        available: Math.floor(Number(row.item.数量) || 0),
        perUnit: this.MATERIAL_YIELD[String(row.item.类型 || '')],
      }));
  },

  material(win, key) { return this.materials(win).find(row => row.key === key) || null; },

  materialRequirementRank(targetRank) {
    const rank = Number(targetRank);
    return rank > 0 && rank < 1 ? 1 : rank;
  },

  materialCanMake(material, template) {
    if (!material || !template) return false;
    return material.rank <= this.materialRequirementRank(this.templateRank(template)) + 1e-9;
  },

  chanceFor(win, template) {
    const gate = this.gate(win);
    const sd = win.sd() || {};
    const current = Math.max(0, Number(sd.当前灵性) || 0);
    const max = Math.max(0, Number(sd.灵性) || 0);
    const spiritRatio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    const enhancements = template.增强档位 || {};
    const tiers = this.ENHANCE_KEYS.map(key => this.tier(enhancements[key])).filter(Boolean);
    if (!tiers.length) return 100;
    const penalty = tiers.reduce((sum, tier) => sum + ({ 1: 4, 2: 7, 3: 10 })[tier], 0);
    const countPenalty = Math.max(0, tiers.length - 2) * 5;
    const gap = Math.max(0, this.templateRank(template) - Number(gate.rank));
    const chance = 80 + spiritRatio * 20 + Math.min(30, gap * 5) - penalty - countPenalty;
    return Math.max(5, Math.min(95, chance));
  },

  rollD100() {
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return 1 + (a[0] % 100);
    }
    return 1 + Math.floor(Math.random() * 100);
  },

  tierSelect(win, key, value) {
    const labels = {
      威力: ['×1.25', '×1.5', '×2'], 恢复量: ['×1.25', '×1.5', '×2'],
      附加效果幅度: ['×1.25', '×1.5', '×2'], 持续回合: ['4回合', '5回合', '6回合'],
      使用灵性消耗: ['75%', '50%', '25%'], 射程: ['4格', '5格', '6格'], 全体半径: ['3格', '4格', '5格'],
    };
    return `<label class="ppw-field"><span>${win.esc(this.ENHANCE_LABELS[key])}</span><select data-ppw-change="scroll-form" data-scroll-enhance="${win.esc(key)}"><option value="0">不增强</option>${[1, 2, 3].map(tier => `<option value="${tier}"${this.tier(value) === tier ? ' selected' : ''}>${this.TIER_ROMAN[tier]} · ${labels[key][tier - 1]}</option>`).join('')}</select></label>`;
  },

  renderMain(win, gate) {
    const rows = this.templates(win);
    const locked = win.battleOngoing();
    const cards = rows.length ? rows.map(({ id, data }) => {
      const enhance = this.enhancementText(data.增强档位) || '基础款（无增强）';
      const battle = data.战斗效果 || {};
      return `<div class="ppw-material-batch"><div class="ppw-row" style="justify-content:space-between"><b>${win.esc(data.名称 || '未命名卷轴')}</b><span class="ppw-actions"><button type="button" class="ppw-btn ghost" data-ppw="scroll-edit" data-arg="${win.esc(id)}"${locked ? ' disabled' : ''}>编辑</button><button type="button" class="ppw-btn warn" data-ppw="scroll-delete" data-arg="${win.esc(id)}"${locked ? ' disabled' : ''}>删除</button></span></div><div class="ppw-mat-meta">${win.esc(data.序列)} · ${win.esc(battle.基础效果 || '')}${battle.额外效果 ? ` · ${win.esc(battle.额外效果)}` : ''} · ${win.esc(battle.范围 || '单体')}</div><div class="ppw-hint">${win.esc(enhance)}</div></div>`;
    }).join('') : '<p class="ppw-hint">尚未保存卷轴样式。先建立样式，制造时只需分配数量。</p>';
    return `<div class="ppw-card"><div class="ppw-row" style="justify-content:space-between"><b>卷轴样式库</b><span class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="scroll-new"${locked ? ' disabled' : ''}>新建样式</button><button type="button" class="ppw-btn" data-ppw="scroll-manufacture"${locked || !rows.length ? ' disabled' : ''}>批量制造</button></span></div><p class="ppw-hint">当前制造位阶：${gate.viaTitle ? '旧日·知识之妖' : win.esc(this.rankText(gate.rank))}。样式不消耗材料，制造时再选择材料并逐张检定。</p>${locked ? '<p class="ppw-warn">战斗进行中只能查看样式。</p>' : ''}${cards}</div>`;
  },

  renderForm(win) {
    const st = this.state(win);
    const gate = this.gate(win);
    const draft = st.draft || this.defaultDraft(gate);
    const ranks = this.selectableRanks(gate.rank);
    const extras = this.validExtras(draft.baseEffect, draft.scope);
    if (draft.extraEffect && !extras.includes(draft.extraEffect)) draft.extraEffect = '';
    const applicable = this.applicableEnhancements(draft);
    const check = this.validateDraft(win, draft, st.editId);
    return `<div class="ppw-card"><div class="ppw-row" style="justify-content:space-between"><b>${st.editId ? '编辑' : '新建'}卷轴样式</b><button type="button" class="ppw-btn ghost" data-ppw="scroll-cancel">返回</button></div><div class="ppw-form"><label class="ppw-field"><span>唯一名称</span><input data-ppw-change="scroll-form" data-scroll-field="name" value="${win.esc(draft.name)}" /></label><label class="ppw-field"><span>目标位阶</span><select data-ppw-change="scroll-form" data-scroll-field="rank">${ranks.map(rank => `<option value="${rank}"${Math.abs(Number(draft.rank) - rank) < 1e-9 ? ' selected' : ''}>${win.esc(this.rankText(rank))}</option>`).join('')}</select></label><label class="ppw-field"><span>基础效果</span><select data-ppw-change="scroll-form" data-scroll-field="baseEffect">${this.BASE_EFFECTS.map(value => `<option value="${value}"${draft.baseEffect === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><label class="ppw-field"><span>范围</span><select data-ppw-change="scroll-form" data-scroll-field="scope"><option value="单体"${draft.scope === '单体' ? ' selected' : ''}>单体</option><option value="全体"${draft.scope === '全体' ? ' selected' : ''}>全体</option></select></label><label class="ppw-field"><span>额外效果（可选）</span><select data-ppw-change="scroll-form" data-scroll-field="extraEffect"><option value="">无</option>${extras.map(value => `<option value="${value}"${draft.extraEffect === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><label class="ppw-field"><span>基础描述</span><textarea rows="3" data-ppw-change="scroll-form" data-scroll-field="description">${win.esc(draft.description)}</textarea></label><div><div class="ppw-sect-label">强化档位（只显示当前效果实际使用的参数）</div><div class="ppw-mystic-grid">${applicable.map(key => this.tierSelect(win, key, draft.enhancements[key])).join('')}</div></div></div>${check.valid ? '<p class="ppw-hint">样式有效，可以保存。</p>' : `<p class="ppw-warn">${win.esc(check.errors.join('；'))}</p>`}<div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="scroll-save">保存样式</button></div></div>`;
  },

  renderManufacture(win) {
    const st = this.state(win);
    const materials = this.materials(win);
    if (!st.materialKey || !materials.some(row => row.key === st.materialKey)) st.materialKey = materials[0]?.key || '';
    const material = materials.find(row => row.key === st.materialKey) || null;
    st.materialQty = material ? Math.max(1, Math.min(material.available, Math.floor(Number(st.materialQty) || 1))) : 1;
    const capacity = material ? st.materialQty * material.perUnit : 0;
    const rows = this.templates(win);
    const allocated = rows.reduce((sum, row) => sum + Math.max(0, Math.floor(Number(st.allocations[row.id]) || 0)), 0);
    const allocationHtml = rows.map(({ id, data }) => {
      const eligible = !!material && this.materialCanMake(material, data);
      const chance = this.chanceFor(win, data);
      const enhance = this.enhancementText(data.增强档位) || '无增强，直接制造';
      return `<div class="ppw-material-batch"><div class="ppw-row"><div style="flex:1"><b>${win.esc(data.名称)}</b><div class="ppw-mat-meta">${win.esc(data.序列)} · ${win.esc(enhance)}${this.enhancementCount(data.增强档位) ? ` · 单张成功率 ${chance.toFixed(1)}%` : ''}</div>${eligible ? '' : '<div class="ppw-warn">所选材料位阶不足</div>'}</div><input class="ppw-mat-n" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(st.allocations[id]) || 0))}" data-ppw-change="scroll-allocation" data-scroll-allocation="${win.esc(id)}"${eligible ? '' : ' disabled'} /></div></div>`;
    }).join('');
    const materialOptions = materials.map(row => `<option value="${win.esc(row.key)}"${row.key === st.materialKey ? ' selected' : ''}>${win.esc(row.name)} · ${win.esc(row.type)} · ${win.esc(row.item.序列 || '普通')} · ${row.available}${win.esc(row.item.单位 || '份')}</option>`).join('');
    const canCraft = !!material && capacity > 0 && allocated === capacity;
    return `<div class="ppw-card"><div class="ppw-row" style="justify-content:space-between"><b>批量制造</b><button type="button" class="ppw-btn ghost" data-ppw="scroll-back">返回</button></div>${materials.length ? `<label class="ppw-field"><span>材料</span><select data-ppw-change="scroll-material" data-scroll-material>${materialOptions}</select></label><label class="ppw-field"><span>消耗数量（整数）</span><input type="number" min="1" max="${material ? material.available : 1}" step="1" value="${st.materialQty}" data-ppw-change="scroll-material-qty" data-scroll-material-qty /></label><div class="ppw-material-risk">${material ? `将消耗 ${st.materialQty}${win.esc(material.item.单位 || '份')}“${win.esc(material.name)}”，必须分配满 ${capacity} 张卷轴。${material.type === '灵性材料' ? '已使用最廉价的灵性材料。' : `${win.esc(material.type)}每个折算${material.perUnit}张；若不需要如此大的产量，优先使用灵性材料。`}` : ''}</div><div class="ppw-sect-label">样式分配 · 已分配 ${allocated}/${capacity}</div>${allocationHtml}<p class="${canCraft ? 'ppw-hint' : 'ppw-warn'}">${canCraft ? '分配完整，可以开始逐张制造。' : `还需调整 ${Math.abs(capacity - allocated)} 张；分配总数必须恰好等于产量。`}</p><div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="scroll-craft"${canCraft ? '' : ' disabled'}>确认消耗材料并制造</button></div>` : '<p class="ppw-hint">“其他列表”中没有可用的灵性材料、魔药材料或非凡特性。</p>'}</div>`;
  },

  renderResult(win) {
    const result = this.state(win).lastResult;
    if (!result) return this.renderMain(win, this.gate(win));
    const rows = result.rows.map(row => `<div class="ppw-material-batch"><b>${win.esc(row.name)}</b><div class="ppw-mat-meta">分配 ${row.total} 张${row.enhanced != null ? ` · 强化成功 ${row.enhanced} 张 · 普通 ${row.normal} 张 · 单张成功率 ${row.chance.toFixed(1)}%` : ' · 基础款直接完成'}</div></div>`).join('');
    return `<div class="ppw-card"><div class="ppw-row" style="justify-content:space-between"><b>制造完成</b><button type="button" class="ppw-btn" data-ppw="scroll-result-back">返回样式库</button></div><p class="ppw-hint">材料已全部消耗；每张增强卷轴均独立完成检定。</p>${rows}</div>`;
  },

  render(win, gate) {
    const view = this.state(win).view;
    if (view === 'form') return this.renderForm(win);
    if (view === 'manufacture') return this.renderManufacture(win);
    if (view === 'result') return this.renderResult(win);
    return this.renderMain(win, gate);
  },

  captureDraft(win) {
    const st = this.state(win);
    const root = this.scope();
    if (!root || !st.draft) return;
    const get = key => root.querySelector(`[data-scroll-field="${key}"]`)?.value;
    st.draft.name = String(get('name') ?? st.draft.name);
    st.draft.rank = Number(get('rank') ?? st.draft.rank);
    st.draft.description = String(get('description') ?? st.draft.description);
    st.draft.baseEffect = String(get('baseEffect') ?? st.draft.baseEffect);
    st.draft.scope = String(get('scope') ?? st.draft.scope);
    st.draft.extraEffect = String(get('extraEffect') ?? st.draft.extraEffect);
    root.querySelectorAll('[data-scroll-enhance]').forEach(el => {
      const tier = this.tier(el.value);
      if (tier) st.draft.enhancements[el.dataset.scrollEnhance] = tier;
      else delete st.draft.enhancements[el.dataset.scrollEnhance];
    });
    if (!this.validExtra(st.draft.baseEffect, st.draft.scope, st.draft.extraEffect)) st.draft.extraEffect = '';
    const applicable = new Set(this.applicableEnhancements(st.draft));
    Object.keys(st.draft.enhancements).forEach(key => { if (!applicable.has(key)) delete st.draft.enhancements[key]; });
  },

  captureManufacture(win) {
    const st = this.state(win);
    const root = this.scope();
    if (!root) return;
    const material = root.querySelector('[data-scroll-material]');
    const qty = root.querySelector('[data-scroll-material-qty]');
    if (material) st.materialKey = String(material.value || '');
    if (qty) st.materialQty = Math.max(1, Math.floor(Number(qty.value) || 1));
    root.querySelectorAll('[data-scroll-allocation]').forEach(el => {
      st.allocations[el.dataset.scrollAllocation] = Math.max(0, Math.floor(Number(el.value) || 0));
    });
  },

  async saveTemplate(win) {
    const st = this.state(win);
    this.captureDraft(win);
    const check = this.validateDraft(win, st.draft, st.editId);
    if (!check.valid) { win.msg(check.errors.join('；'), 4500); win.render(); return; }
    const store = this.store(win.game && win.game.currentMvuState, true);
    const old = st.editId && store.templates[st.editId];
    const id = st.editId || this.newId();
    const oldVersion = old ? Math.max(1, Math.floor(Number(old.版本) || 1)) : 0;
    const preview = this.recordFromDraft(st.draft, id, oldVersion || 1);
    // 只打开编辑页再原样保存不能凭空制造一个同名新版本，否则下一批会和
    // 库存旧批次拆成两张同名技能卡。参数快照确实变化时才递增版本。
    const version = old && this.templateSignature(preview) === this.templateSignature(old)
      ? oldVersion : (oldVersion + 1 || 1);
    store.templates[id] = this.recordFromDraft(st.draft, id, version);
    win.persist();
    await win.persistZero();
    st.view = 'main'; st.editId = ''; st.draft = null;
    win.msg(old ? '卷轴样式已更新。' : '卷轴样式已保存。');
    win.render();
  },

  async deleteTemplate(win, id) {
    const store = this.store(win.game && win.game.currentMvuState, false);
    const row = store && store.templates && store.templates[id];
    if (!row) return;
    if (!window.confirm(`确定删除卷轴样式“${row.名称}”吗？\n\n已经制造的卷轴不会改变。`)) return;
    delete store.templates[id];
    win.persist();
    await win.persistZero();
    win.msg('卷轴样式已删除。');
    win.render();
  },

  productRecord(template, enhanced, quantity) {
    const battle = this.clone(template.战斗效果 || {});
    const isHeal = this.isHeal(battle.基础效果);
    const baseDescription = String(template.描述 || '').trim();
    const enhanceText = this.enhancementText(template.增强档位 || {});
    const record = {
      名称: enhanced ? `强化${template.名称}` : String(template.名称 || ''),
      序列: String(template.序列 || '序列9'),
      类型: '卷轴',
      效果: isHeal ? '恢复' : '杀伤',
      作用属性: isHeal ? String(battle.基础效果 || '').replace(/恢复$/, '') : '活力',
      战斗效果: battle,
      描述: enhanced && enhanceText
        ? `${baseDescription}${baseDescription ? '\n' : ''}此卷轴已增加${enhanceText}能力。`
        : baseDescription,
      数量: Math.max(0, Math.floor(Number(quantity) || 0)),
      单位: '张',
      '$卷轴样式ID': String(template.ID || ''),
      '$卷轴样式版本': Math.max(1, Math.floor(Number(template.版本) || 1)),
      '$卷轴快照': this.templateSignature(template),
      '$卷轴制造': true,
    };
    if (enhanced && enhanceText) record['$卷轴增强'] = this.clone(template.增强档位 || {});
    return record;
  },

  addProduct(list, template, enhanced, quantity) {
    const qty = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!qty) return;
    const baseKey = `#卷轴:${template.ID}:v${Math.max(1, Math.floor(Number(template.版本) || 1))}:${enhanced ? '强化' : '普通'}`;
    const fresh = this.productRecord(template, enhanced, qty);
    let key = baseKey;
    let index = 2;
    while (list[key] && String(list[key]['$卷轴快照'] || '') !== String(fresh['$卷轴快照'] || '')) key = `${baseKey}:${index++}`;
    if (list[key] && typeof list[key] === 'object') list[key].数量 = Math.max(0, Math.floor(Number(list[key].数量) || 0)) + qty;
    else list[key] = fresh;
  },

  async craft(win) {
    const st = this.state(win);
    this.captureManufacture(win);
    const gate = this.gate(win);
    if (!gate.unlocked) { win.msg('当前没有卷轴制造资格。', 3500); return; }
    const material = this.material(win, st.materialKey);
    if (!material) { win.msg('所选材料已经不存在。', 3500); win.render(); return; }
    const materialQty = Math.max(1, Math.floor(Number(st.materialQty) || 1));
    if (materialQty > material.available) { win.msg('材料数量不足。', 3500); win.render(); return; }
    const capacity = materialQty * material.perUnit;
    const allocations = [];
    let allocationError = '';
    let total = 0;
    this.templates(win).forEach(({ id, data }) => {
      const qty = Math.max(0, Math.floor(Number(st.allocations[id]) || 0));
      if (!qty) return;
      if (!this.materialCanMake(material, data)) { allocationError = `材料位阶不足，不能制造“${data.名称}”`; return; }
      const targetRank = this.templateRank(data);
      if (targetRank < Number(gate.rank) - 1e-9 || targetRank > 9) { allocationError = `当前位阶不能制造“${data.名称}”`; return; }
      const collision = this.nameCollision(win, data.名称, id, data.名称);
      if (collision) { allocationError = `“${data.名称}”当前无法制造：${collision}`; return; }
      allocations.push({ id, template: this.clone(data), qty, signature: this.templateSignature(data), chance: this.chanceFor(win, data) });
      total += qty;
    });
    if (allocationError) { win.msg(allocationError, 4000); win.render(); return; }
    if (total !== capacity) { win.msg(`必须恰好分配${capacity}张，当前为${total}张。`, 4000); win.render(); return; }
    if (!window.confirm(`确定消耗 ${materialQty}${material.item.单位 || '份'}“${material.name}”，制造 ${capacity} 张卷轴吗？\n\n材料确认后必定消耗，强化失败的卷轴会降为普通品。`)) return;

    const liveMaterial = this.material(win, st.materialKey);
    if (!liveMaterial || liveMaterial.available < materialQty
      || liveMaterial.type !== material.type || liveMaterial.rank !== material.rank || liveMaterial.perUnit !== material.perUnit) {
      win.msg('确认前材料已经变化，本次没有消耗。', 4500); win.render(); return;
    }
    for (const row of allocations) {
      const live = this.template(win, row.id);
      if (!live || this.templateSignature(live) !== row.signature) {
        win.msg('确认前卷轴样式已经变化，本次没有消耗。', 4500); win.render(); return;
      }
    }

    const sd = win.sd();
    const otherBackup = this.clone(sd.其他列表 || {});
    const consumableBackup = this.clone(sd.消耗品列表 || {});
    try {
      const source = sd.其他列表 && sd.其他列表[st.materialKey];
      if (!source || Math.floor(Number(source.数量) || 0) < materialQty) throw new Error('材料数量不足');
      const left = Number(source.数量) - materialQty;
      if (left <= 0.05) delete sd.其他列表[st.materialKey];
      else source.数量 = left;
      if (!sd.消耗品列表 || typeof sd.消耗品列表 !== 'object' || Array.isArray(sd.消耗品列表)) {
        sd.消耗品列表 = { $meta: { extensible: true } };
      } else if (!sd.消耗品列表.$meta) sd.消耗品列表.$meta = { extensible: true };

      const results = [];
      allocations.forEach(row => {
        const enhancedCount = this.enhancementCount(row.template.增强档位);
        if (!enhancedCount) {
          this.addProduct(sd.消耗品列表, row.template, false, row.qty);
          results.push({ name: row.template.名称, total: row.qty, enhanced: null, normal: row.qty, chance: 100 });
          return;
        }
        let successes = 0;
        for (let i = 0; i < row.qty; i++) if (this.rollD100() <= row.chance) successes++;
        const failures = row.qty - successes;
        this.addProduct(sd.消耗品列表, row.template, true, successes);
        this.addProduct(sd.消耗品列表, row.template, false, failures);
        results.push({ name: row.template.名称, total: row.qty, enhanced: successes, normal: failures, chance: row.chance });
      });
      win.persist();
      await win.persistZero();
      st.lastResult = { rows: results };
      st.view = 'result'; st.allocations = {}; st.materialKey = ''; st.materialQty = 1;
      win.msg(`卷轴制造完成，共产出${capacity}张。`, 3500);
      win.render();
    } catch (error) {
      sd.其他列表 = otherBackup;
      sd.消耗品列表 = consumableBackup;
      win.persist();
      try { await win.persistZero(); } catch (_) {}
      win.msg('制造失败，材料与成品已恢复：' + (error.message || error), 5000);
      win.render();
    }
  },

  onChange(win, kind, element) {
    const st = this.state(win);
    if (kind === 'scroll-form') {
      this.captureDraft(win);
      const field = String(element && element.dataset.scrollField || '');
      // 只有会改变“哪些增强项可用”的三处联动需要重绘。名称、描述、位阶和
      // 档位只更新草稿，避免 change 重绘吃掉紧随其后的“保存”点击。
      if (field === 'baseEffect' || field === 'scope' || field === 'extraEffect') win.render();
      return;
    }
    if (kind === 'scroll-material') {
      st.materialKey = String(element && element.value || '');
      st.materialQty = 1; st.allocations = {};
      win.render();
      return;
    }
    if (kind === 'scroll-material-qty') {
      st.materialQty = Math.max(1, Math.floor(Number(element && element.value) || 1));
      win.render();
      return;
    }
    if (kind === 'scroll-allocation') {
      st.allocations[String(element && element.dataset.scrollAllocation || '')] = Math.max(0, Math.floor(Number(element && element.value) || 0));
      win.render();
    }
  },

  async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    const st = this.state(win);
    if (act === 'scroll-new') {
      st.editId = ''; st.draft = this.defaultDraft(this.gate(win)); st.view = 'form'; win.render(); return;
    }
    if (act === 'scroll-edit') {
      const row = this.template(win, arg);
      if (!row) return;
      st.editId = String(arg); st.draft = this.draftFromTemplate(row); st.view = 'form'; win.render(); return;
    }
    if (act === 'scroll-save') return this.saveTemplate(win);
    if (act === 'scroll-delete') return this.deleteTemplate(win, String(arg));
    if (act === 'scroll-cancel' || act === 'scroll-back' || act === 'scroll-result-back') {
      st.view = 'main'; st.editId = ''; st.draft = null; st.lastResult = null; win.render(); return;
    }
    if (act === 'scroll-manufacture') {
      st.view = 'manufacture'; st.materialKey = ''; st.materialQty = 1; st.allocations = {}; win.render(); return;
    }
    if (act === 'scroll-craft') return this.craft(win);
  },
};
    MysteryPryerScrollMode.buildMove = (item, key, rank) => ConsumableMoveBuilder.build(item, key, rank);
    return MysteryPryerScrollMode;
  }
  const api = { create,
    build: (item, key, rank, averages) => create({ pool: { pathways: {} }, averages }).buildMove(item, key, rank),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
