// Generated from the original regex managers. Run extract-field-effect-reference.mjs to regenerate.
(() => {
  'use strict';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const KEY = 'cryptLord.battleFieldEffectReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const averages = {
        '-2':  { 活力: 925000,  敏捷: 1125000, 灵性: 1075000, 理智: 700000,  人性: 675000,  运气: 500000 },
        '-1':  { 活力: 555000,  敏捷: 675000,  灵性: 645000,  理智: 420000,  人性: 405000,  运气: 300000 },
        '0':   { 活力: 222000,  敏捷: 270000,  灵性: 258000,  理智: 168000,  人性: 162000,  运气: 120000 },
        '0.1': { 活力: 166500,  敏捷: 202500,  灵性: 193500,  理智: 126000,  人性: 121500,  运气: 90000 },
        '0.3': { 活力: 111000,  敏捷: 135000,  灵性: 129000,  理智: 84000,   人性: 81000,   运气: 60000 },
        '0.4': { 活力: 101750,  敏捷: 123750,  灵性: 118250,  理智: 77000,   人性: 74250,   运气: 55000 },
        '0.5': { 活力: 92500,   敏捷: 112500,  灵性: 107500,  理智: 70000,   人性: 67500,   运气: 50000 },
        '0.8': { 活力: 74000,   敏捷: 90000,   灵性: 86000,   理智: 56000,   人性: 54000,   运气: 40000 },
        '0.9': { 活力: 64750,   敏捷: 78750,   灵性: 75250,   理智: 49000,   人性: 47250,   运气: 35000 },
        '1':   { 活力: 55500,   敏捷: 67500,   灵性: 64500,   理智: 42000,   人性: 40500,   运气: 30000 },
        '2':   { 活力: 22200,   敏捷: 27000,   灵性: 25800,   理智: 16800,   人性: 16200,   运气: 12000 },
        '3':   { 活力: 7400,    敏捷: 9000,    灵性: 8600,    理智: 5600,    人性: 5400,    运气: 4000 },
        '4':   { 活力: 2775,    敏捷: 3375,    灵性: 3225,    理智: 2100,    人性: 2025,    运气: 1500 },
        '5':   { 活力: 1110,    敏捷: 1350,    灵性: 1290,    理智: 840,     人性: 810,     运气: 600 },
        '6':   { 活力: 462,     敏捷: 562,     灵性: 537,     理智: 350,     人性: 337,     运气: 250 },
        '7':   { 活力: 185,     敏捷: 225,     灵性: 215,     理智: 140,     人性: 135,     运气: 100 },
        '8':   { 活力: 83,      敏捷: 101,     灵性: 96,      理智: 63,      人性: 60,      运气: 45 },
        '9':   { 活力: 55,      敏捷: 67,      灵性: 64,      理智: 42,      人性: 40,      运气: 30 },
        '10':  { 活力: 37,      敏捷: 45,      灵性: 43,      理智: 28,      人性: 27,      运气: 20 }
      };
  function create(deps) {
    const { Math, Hero, LifeSaveManager, TacticCatalog, EnemyControlManager,
      ConsumableMoveBuilder, TacticResolver, OffFieldManager, BattleBoard,
      AttributeCalculator, TurnSkipManager, MysteryReenactmentCanonAccess, SkillRange,
      TargetSelector, PossessionManager, TacticBorrowReport, SkillCostManager, Move } = deps;
const ReaderContestAdvantage = {
    PATHWAY: '阅读者',
    TITLE: '上帝',

    /** 多途径只取阅读者片段中最强的一条；“上帝”直接按支柱 -2。 */
    rankOf(hero) {
        const sequenceString = String((hero && hero.sequenceString) || '').trim();
        if (!sequenceString) return null;
        if (sequenceString.includes(this.TITLE)) return -2;

        let best = null;
        LifeSaveManager.splitSequenceFragments(sequenceString).forEach(fragment => {
            const resolved = LifeSaveManager.resolveFragment(fragment);
            if (!resolved || resolved.pathwayShort !== this.PATHWAY) return;
            const rank = Number(resolved.rank);
            if (!Number.isFinite(rank)) return;
            if (best === null || rank < best) best = rank;
        });
        return best;
    },

    /** 序列6起可无视同大类能力资格，进入敌方的整发级拼点位。 */
    qualifiesForRivalPool(hero) {
        const rank = this.rankOf(hero);
        return rank !== null && Number.isFinite(Number(rank)) && Number(rank) <= 6;
    },

    multiplierForRank(rank) {
        if (rank === null || rank === undefined || rank === '') return 1;
        const r = Number(rank);
        if (!Number.isFinite(r) || r > 6) return 1;
        if (r <= 0) return 1.20;
        if (r < 3) return 1.15; // 序列2、1与所有 0.x
        if (r <= 4) return 1.10;
        return 1.05;            // 序列6、5
    },

    multiplierOf(hero) {
        return this.multiplierForRank(this.rankOf(hero));
    },
};


// ==========================================
// 2.9b-0s SavantContestAdvantage（通识者 · 战术拼点优势）
// ==========================================
// 与阅读者共用“通用知识优势”分组，只取两者中的最高倍率。通识者不会凭此额外
// 进入规则修改、改变环境或施加效果的阻止名单，只在原本有资格参加的拼点中生效。
const SavantContestAdvantage = {
    PATHWAY: '通识者',
    TITLE: '知识之妖',

    /** 多途径只取通识者片段中最强的一条；“知识之妖”直接按旧日 -1。 */
    rankOf(hero) {
        const sequenceString = String((hero && hero.sequenceString) || '').trim();
        if (!sequenceString) return null;
        if (sequenceString.includes(this.TITLE)) return -1;

        let best = null;
        LifeSaveManager.splitSequenceFragments(sequenceString).forEach(fragment => {
            const resolved = LifeSaveManager.resolveFragment(fragment);
            if (!resolved || resolved.pathwayShort !== this.PATHWAY) return;
            const rank = Number(resolved.rank);
            if (!Number.isFinite(rank)) return;
            if (best === null || rank < best) best = rank;
        });
        return best;
    },

    multiplierForRank(rank) {
        if (rank === null || rank === undefined || rank === '') return 1;
        const r = Number(rank);
        if (!Number.isFinite(r) || r > 2) return 1;
        if (r <= 0) return 1.10;
        return 1.05; // 序列2、1与所有 0.x
    },

    multiplierOf(hero) {
        return this.multiplierForRank(this.rankOf(hero));
    },
};


// ==========================================
// 2.9b-0a ContestCounterpartCatalog（歌颂者 / 战士 · 共用克制目标）
// ==========================================
// 秘祈人只有序列 7～2 仍受克制：到序列1及更高位阶后免疫；支柱「上帝」也不再
// 作为受克制称号。其余目标口径由歌颂者与战士共用，避免两份名单日后漂移。
const ContestCounterpartCatalog = {
    TITLES: ['永恒之暗', '堕落母神', '恶魔之父'],

    /** maxRank / minRank 都含边界；为空表示该方向不设限。 */
    hasPathway(hero, pathway, maxRank = null, minRank = null) {
        const sequenceString = String((hero && hero.sequenceString) || '').trim();
        if (!sequenceString) return false;
        return LifeSaveManager.splitSequenceFragments(sequenceString).some(fragment => {
            const resolved = LifeSaveManager.resolveFragment(fragment);
            if (!resolved || resolved.pathwayShort !== pathway) return false;
            const rank = Number(resolved.rank);
            if (!Number.isFinite(rank)) return false;
            return (maxRank === null || rank <= maxRank)
                && (minRank === null || rank >= minRank);
        });
    },

    /** 对手只要命中其中一条就算，多个途径不会重复叠乘。 */
    matches(hero) {
        const s = String((hero && hero.sequenceString) || '');
        if (this.TITLES.some(title => s.includes(title))) return true;
        return this.hasPathway(hero, '秘祈人', 7, 2)
            || this.hasPathway(hero, '收尸人')
            || this.hasPathway(hero, '药师', 7)
            || this.hasPathway(hero, '恶棍', 7)
            || this.hasPathway(hero, '囚犯', 7)
            || this.hasPathway(hero, '罪犯', 6);
    },
};


// ==========================================
// 2.9b-0b SingerContestAdvantage（歌颂者 · 战术拼点克制）
// ==========================================
// 只在双方都是已经进入战斗的 Hero 时生效。历史投影召唤时拿来拼点的原始
// npc_data 不是 Hero，因此不会触发这份 1.3；投影真正入场后则与普通角色一致。
// 判定读取 sequenceString，空想与放牧投影出来的运行期途径会即时参与计算。
const SingerContestAdvantage = {
    PATHWAY: '歌颂者',
    TITLE: '上帝',
    MULTIPLIER: 1.30,

    isBattleHero(hero) {
        return hero instanceof Hero;
    },

    hasPathway(hero, pathway, maxRank = null, minRank = null) {
        return ContestCounterpartCatalog.hasPathway(hero, pathway, maxRank, minRank);
    },

    isSinger(hero) {
        const s = String((hero && hero.sequenceString) || '');
        return s.includes(this.TITLE) || this.hasPathway(hero, this.PATHWAY);
    },

    isCounterpart(hero) {
        return ContestCounterpartCatalog.matches(hero);
    },

    multiplierOf(self, opponent) {
        if (!this.isBattleHero(self) || !this.isBattleHero(opponent)) return 1;
        return this.isSinger(self) && this.isCounterpart(opponent) ? this.MULTIPLIER : 1;
    },
};


// ==========================================
// 2.9b-0c WarriorContestAdvantage（战士 · 战术拼点克制）
// ==========================================
const WarriorContestAdvantage = {
    PATHWAY: '战士',
    TITLE: '永恒之暗',
    GATE: 6,
    MULTIPLIER: 1.15,

    isBattleHero(hero) {
        return hero instanceof Hero;
    },

    isWarrior(hero) {
        const s = String((hero && hero.sequenceString) || '');
        return s.includes(this.TITLE)
            || ContestCounterpartCatalog.hasPathway(hero, this.PATHWAY, this.GATE);
    },

    multiplierOf(self, opponent) {
        if (!this.isBattleHero(self) || !this.isBattleHero(opponent)) return 1;
        return this.isWarrior(self) && ContestCounterpartCatalog.matches(opponent)
            ? this.MULTIPLIER : 1;
    },
};


/** 阅读者与通识者同属知识优势组；歌颂者与战士同属克制组。两组各自取最高后相乘。 */
const ContestAdvantage = {
    tacticMultiplier(self, opponent) {
        // 能力借用的 Hero 视图只替换能力身份；战术拼点优势必须仍按真正施法者/对手
        // 的途径与身上效果计算，不能把能力来源的途径优势一并借走。
        self = (self && self.$tacticActualCaster) || self;
        opponent = (opponent && opponent.$tacticActualCaster) || opponent;
        // “扭曲：阻碍行动”只影响战术拼点。独立乘在受术者自己这一侧，
        // 不覆盖控制系 penalty、途径优势、贿赂关联或双方随机因子。
        return this.multiplierOf(self, opponent)
            * BriberyManager.linkMultiplier(self, opponent)
            * this.hindranceMultiplierOf(self);
    },
    hindranceMultiplierOf(hero) {
        const powers = (Array.isArray(hero?.effects) ? hero.effects : [])
            .filter(effect => effect
                && effect.fieldEffect === true
                && effect.type === 'debuff'
                && effect.stat === 'tacticContest'
                && Number(effect.duration) > 0)
            .map(effect => Number(effect.power) || 0);
        const pct = Math.max(0, Math.min(100, powers.length ? Math.max(...powers) : 0));
        return Math.max(0, 1 - pct / 100);
    },
    multiplierOf(self, opponent) {
        const knowledgeMultiplier = Math.max(
            ReaderContestAdvantage.multiplierOf(self),
            SavantContestAdvantage.multiplierOf(self)
        );
        const counterMultiplier = Math.max(
            SingerContestAdvantage.multiplierOf(self, opponent),
            WarriorContestAdvantage.multiplierOf(self, opponent)
        );
        return knowledgeMultiplier * counterMultiplier;
    },
};


// ==========================================
// 2.9b-1 AbilityAlias (通用 · 按序列改名的别名阶梯)
//   同一个功能在不同序列有不同的叫法：占卜家序列 2 叫「实现愿望」，到序列 1 改叫
//   「嫁接」。原著里那是两样东西，机制上是同一件事，所以代码只做一份，只换名字。
//   拆成独立工具而不是塞进某个 Manager：任何大类的子类都可能要分档改名。
//
//   两条硬约束：
//   1. 显示名永远不能当身份键。子类的 key 是内部键，改名只改这里返回的字符串，
//      栏位记录、NPC 的 hits、UI 的 dataset 一律走内部键。
//   2. 判档用的是**匹配到的那条途径片段的 rank**，不是 hero.sequenceRank。
//      「序列1-偷盗者 / 序列2-占卜家」的角色整体 rank 是 1，但他的占卜家履历
//      才到序列 2，那条子类仍该叫「实现愿望」。
// ==========================================
const AbilityAlias = {
    /**
     * 从别名阶梯里挑这个 rank 该看到的名字。
     * 规则一句话：筛出所有 rank ≤ gate 的档，取 gate 最小的那个（也就是最强档）。
     * 于是序列 1 只会看到「嫁接」，「实现愿望」自动消失，不必另写排他逻辑。
     * @param {Array<{gate:number, name:string}>} names
     * @returns {string} 一档都不满足时返回空串
     */
    pick(names, rank) {
        const r = Number(rank);
        if (!Array.isArray(names) || !Number.isFinite(r)) return '';
        let best = null;
        names.forEach(n => {
            if (!n || !n.name) return;
            const gate = Number(n.gate);
            if (!Number.isFinite(gate) || r > gate) return;
            if (!best || gate < Number(best.gate)) best = n;
        });
        return best ? String(best.name) : '';
    },

    /**
     * 子类的总门槛：别名阶梯里最宽的那一档。
     * 兼容只写 gate 的老式单档配置（SummonManager / RewindManager 现在就是那样），
     * 这样它们日后想加别名只要补一个 names 数组，解析这边一行都不用动。
     */
    gateOf(cfg) {
        if (cfg && Array.isArray(cfg.names) && cfg.names.length) {
            return Math.max(...cfg.names.map(n => Number(n.gate)).filter(Number.isFinite));
        }
        return Number(cfg && cfg.gate);
    },

    /** 称号兜底命中时按哪个 rank 记档。配置没写就落到最强档，与「称号即顶格」的直觉一致 */
    titleRankOf(cfg) {
        const t = Number(cfg && cfg.titleRank);
        if (Number.isFinite(t)) return t;
        if (cfg && Array.isArray(cfg.names) && cfg.names.length) {
            return Math.min(...cfg.names.map(n => Number(n.gate)).filter(Number.isFinite));
        }
        return Number(cfg && cfg.gate);
    },

    /** 没有别名阶梯的单档配置，显示名就退化成子类的内部键 */
    nameOf(cfg, key, rank) {
        if (cfg && Array.isArray(cfg.names) && cfg.names.length) {
            return this.pick(cfg.names, rank);
        }
        return String(key);
    },

    /**
     * 逐子类解析资格。与各 Manager 现有的 resolveEligibility 同构，区别只有一条：
     * **把匹配到的 rank 一起带出来**，别名要靠它分档。
     * 同一途径命中多个片段时取最低 rank（最强的那一段）。
     * @returns {Object} { [子类内部键]: { ok, rank, name } }
     */
    resolve(sequenceString, SUBTYPES) {
        const s = String(sequenceString || '');
        const subtypes = SUBTYPES || {};
        const result = {};
        Object.keys(subtypes).forEach(key => {
            result[key] = { ok: false, rank: null, name: '' };
        });

        // 同一子类被多次命中时只保留 rank 最低的那次：序列数字越小越强，
        // 而别名阶梯要按最强的那一段判，否则混途径角色会拿到偏弱的名字
        const hit = (key, rank) => {
            const cfg = subtypes[key];
            const gate = this.gateOf(cfg);
            const r = Number(rank);
            if (!Number.isFinite(gate) || !Number.isFinite(r) || r > gate) return;
            const cur = result[key];
            if (cur.ok && Number(cur.rank) <= r) return;
            result[key] = { ok: true, rank: r, name: this.nameOf(cfg, key, r) };
        };

        Object.entries(subtypes).forEach(([key, cfg]) => {
            if (cfg && cfg.title && s.includes(cfg.title)) hit(key, this.titleRankOf(cfg));
        });

        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            Object.entries(subtypes).forEach(([key, cfg]) => {
                if (!cfg || r.pathwayShort !== cfg.pathway) return;
                hit(key, Number(r.rank));
            });
        });

        return result;
    },
};

const BriberyManager = {
    ACTION: '贿赂',
    WEAKEN: '贿赂：削弱',
    CHARM: '贿赂：魅惑',
    LINK: '贿赂：关联',
    SUBTYPES: {
        '贿赂：削弱': { pathway: '律师', title: '失序者', titleRank: -1, names: [{ gate: 7, name: '贿赂：削弱' }], rounds: 3 },
        '贿赂：魅惑': { pathway: '律师', title: '失序者', titleRank: -1, names: [{ gate: 7, name: '贿赂：魅惑' }], rounds: 1 },
        '贿赂：关联': { pathway: '律师', title: '失序者', titleRank: -1, names: [{ gate: 7, name: '贿赂：关联' }], rounds: 3 },
    },
    subtypes() { return Object.keys(this.SUBTYPES); },
    alive(hero) { return !!hero && (hero.additionalStats?.当前活力 ?? 0) > 0; },
    eligibility(hero) { return AbilityAlias.resolve(hero?.sequenceString || '', this.SUBTYPES); },
    eligible(hero, subtype = null) {
        const e = this.eligibility(hero);
        return subtype ? !!e[subtype]?.ok : this.subtypes().some(k => e[k]?.ok);
    },
    ensure(hero) {
        if (!hero.bribery) hero.bribery = {};
        this.subtypes().forEach(k => { if (!hero.bribery[k]) hero.bribery[k] = {}; });
        return hero.bribery;
    },
    relation(source, target, subtype) {
        if (!this.alive(source) || !this.alive(target)) return null;
        return source.bribery?.[subtype]?.[target.heroId] || null;
    },
    costOf(hero) { return TacticCatalog.spiritCost(hero?.sequenceRank); },
    casterStat(hero, afterCost = false) {
        const s = hero?.additionalStats || {};
        return Math.max(Math.max(0, (Number(s.当前灵性) || 0) - (afterCost ? this.costOf(hero) : 0)), Number(s.当前人性) || 0);
    },
    targetStat(hero) {
        const s = hero?.additionalStats || {};
        return Math.max(Number(s.当前灵性) || 0, Number(s.当前理智) || 0, Number(s.当前人性) || 0);
    },
    weakenPower(source, target) {
        return Math.max(0, Math.min(40, Math.round(20 + 5 * (Number(target.sequenceRank) - Number(source.sequenceRank)))));
    },
    linkMultiplier(self, opponent) { return this.relation(self, opponent, this.LINK) ? 1.2 : 1; },
    combatContext(attacker, defender, context = {}) {
        return { ...context, actualAttacker: context.actualAttacker || attacker, actualDefender: defender };
    },
    weakenPercent(context, stat) {
        const a = context.actualAttacker, d = context.actualDefender;
        if (stat === 'attack') return Number(this.relation(d, a, this.WEAKEN)?.power) || 0;
        if (stat === 'defense') return Number(this.relation(a, d, this.WEAKEN)?.power) || 0;
        return 0;
    },
    isProtected(attacker, target) {
        return !!this.relation(target, attacker, this.CHARM);
    },
    attackBlockReason(bm, attacker, skill, center, position = null) {
        if (!skill || skill.isHeal || SkillRange.isSelfType(skill.targetType) || SkillRange.isAllyType(skill.targetType)) return '';
        if (TargetSelector.requiresManualPick(skill)) {
            return this.isProtected(attacker, center)
                ? `${attacker.name}受到${center.name}的贿赂魅惑，不能直接攻击对方或将其选为范围攻击中心。` : '';
        }
        if (!bm || !SkillRange.isSelfCentered(skill) || !SkillRange.isAllType(skill.targetType)) return '';
        const p = position || attacker;
        const pool = bm.getEnemyTeam(attacker).filter(h => this.alive(h) && !OffFieldManager.isOff(h));
        const victims = SkillRange.unitsInCircle(p.x, p.y, SkillRange.resolveAoeRadius(skill), pool);
        if (victims.some(h => this.isProtected(attacker, h)) && !victims.some(h => !this.isProtected(attacker, h))) {
            return `${attacker.name}不能仅用自身中心范围攻击绕过贿赂魅惑，请治疗、移动或不出手。`;
        }
        return '';
    },
    attackBlockBeforeCost(turnManager, attacker, skill, targets) {
        const bm = turnManager.battleManager;
        const selfCentered = SkillRange.isSelfCentered(skill) || SkillRange.isSelfType(skill.targetType);
        const center = selfCentered ? attacker : (targets[0] || attacker);
        const selector = bm?.parameterSelector;
        const hasCharm = bm?.teamManager.getAllHeroes().some(h => this.isProtected(attacker, h));
        if (!hasCharm || !selector || !skill.conditionalParams?.length) {
            return this.attackBlockReason(bm, attacker, skill, center);
        }
        // 条件参数原本在扣费后求值。用扣费后的临时副本预判，复用本次随机缓存，
        // 不动真实属性或消耗品数量，也不让条件半径绕过魅惑的攻击限制。
        const proxy = Object.assign(Object.create(Object.getPrototypeOf(attacker)), attacker,
            { additionalStats: { ...attacker.additionalStats } });
        SkillCostManager.deductCost(proxy, skill);
        const preview = new Move(selector.selectParameters(skill, proxy, center));
        preview.range = skill.range;
        preview.targetType = skill.targetType;
        if (selfCentered && SkillRange.isAllType(skill.targetType)) {
            const hits = turnManager.resolveHitList(attacker, center, skill,
                { x: center.x, y: center.y, radius: SkillRange.resolveAoeRadius(preview) });
            const attacked = hits.filter(target => !selector.selectParameters(skill, proxy, target).isHeal);
            if (attacked.some(h => this.isProtected(attacker, h)) && !attacked.some(h => !this.isProtected(attacker, h))) {
                return attacker.name + '的条件范围攻击只能伤及贿赂魅惑的发动者，请选择其他行动。';
            }
            return '';
        }
        return this.attackBlockReason(bm, attacker, preview, center);
    },
    selectable(bm, source, target) {
        return !!bm && this.alive(source) && this.alive(target) && source !== target
            && source.teamType !== target.teamType && !OffFieldManager.isOff(source) && !OffFieldManager.isOff(target);
    },
    canPossiblyWin(source, target) {
        return EnemyControlManager.canPossiblyWin(source, target, 1, this.casterStat(source, true), this.targetStat(target));
    },
    targets(bm, source, subtype, npc = false) {
        if (!this.eligible(source, subtype) || !this.SUBTYPES[subtype]) return [];
        return bm.teamManager.getAllHeroes().filter(target => {
            if (!this.selectable(bm, source, target) || !this.canPossiblyWin(source, target)) return false;
            if (!npc) return true;
            if (this.relation(source, target, subtype)) return false;
            if (subtype === this.WEAKEN && this.weakenPower(source, target) <= 0) return false;
            return true;
        });
    },
    blockedReason(bm, source, subtype, target = null) {
        if (!this.alive(source) || OffFieldManager.isOff(source)) return '当前没有在场且存活的发动者。';
        if (!this.eligible(source, subtype)) return '需要律师途径序列7及以上的贿赂资格。';
        if (!this.SUBTYPES[subtype]) return '请先选择一种贿赂能力。';
        if ((source.additionalStats.当前灵性 ?? 0) <= 0) return '当前灵性为0，无法发动贿赂。';
        if (!target) return '请选择一个在场敌人。';
        if (!this.selectable(bm, source, target)) return '贿赂只能选择存活、未离场的敌人。';
        if (!this.canPossiblyWin(source, target)) return '扣费后的灵性与人性不足，没有可能赢得这次拼点。';
        return '';
    },
    npcTarget(bm, source, subtype) {
        if ((source.additionalStats?.当前灵性 ?? 0) <= 0) return null;
        const pool = this.targets(bm, source, subtype, true);
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    },
    attempt(bm, source, target, subtype, summary, results) {
        const reason = this.blockedReason(bm, source, subtype, target);
        if (reason) { summary.push(`✗ ${subtype}未发动：${reason}`); return false; }
        const cost = this.costOf(source);
        const before = Number(source.additionalStats.当前灵性) || 0;
        source.additionalStats.当前灵性 = Math.max(0, before - cost);
        const roll = EnemyControlManager.contest(source, target, 1, this.casterStat(source), this.targetStat(target));
        const detail = `（灵性消耗${before - source.additionalStats.当前灵性}/${cost}，拼点 ${roll.casterScore}:${roll.targetScore}）`;
        if (!roll.win) {
            const line = `${source.name}对${target.name}的「${subtype}」未能生效。`;
            summary.push(`✗ ${line}${detail}`);
            bm.battleLogger?.log(`${line}${detail}`, 'info');
            results.push({ kind: 'bribery', actor: source.name, subtype, line, success: false });
            return false;
        }
        const bag = this.ensure(source)[subtype];
        if (subtype === this.CHARM && Math.random() < 0.05) {
            delete bag[target.heroId];
            TempAllegianceManager.begin(bm, source, target, subtype, roll, summary, results);
            const line = `${source.name}的「${subtype}」触发倒戈分支，${target.name}临时转为友军1回合${detail}`;
            summary.push(`✓ ${line}`);
            bm.battleLogger?.log(line, 'effect');
            return true;
        }
        const power = subtype === this.WEAKEN ? this.weakenPower(source, target) : subtype === this.LINK ? 1.2 : 0;
        const rounds = this.SUBTYPES[subtype].rounds;
        bag[target.heroId] = { targetId: target.heroId, targetName: target.name, power,
            appliedRound: bm.currentRound, until: bm.currentRound + rounds };
        const effect = subtype === this.WEAKEN
            ? `针对${source.name}的攻击及防御各降低${power}%`
            : subtype === this.CHARM ? `不能直接选${source.name}为攻击目标或范围攻击中心`
            : `${source.name}与其战术拼点时自身分数额外乘1.2`;
        const line = `${source.name}对${target.name}使用「${subtype}」，${effect}，持续${rounds}回合。`;
        summary.push(`✓ ${line}${detail}`);
        bm.battleLogger?.log(`${line}${detail}`, 'effect');
        results.push({ kind: 'bribery', actor: source.name, subtype, line, success: true });
        return true;
    },
    sweep(bm, expire = false) {
        if (!bm?.teamManager) return [];
        const heroes = bm.teamManager.getAllHeroes(), byId = new Map(heroes.map(h => [h.heroId, h]));
        const results = [];
        heroes.forEach(source => {
            if (!source.bribery) return;
            this.subtypes().forEach(subtype => {
                const bag = source.bribery[subtype] || {};
                Object.entries(bag).forEach(([id, entry]) => {
                    const target = byId.get(id);
                    if (this.alive(source) && this.alive(target) && !(expire && bm.currentRound >= entry.until)) return;
                    delete bag[id];
                    results.push({ kind: 'bribery', line: `${source.name}与${entry.targetName}之间的「${subtype}」已经解除。` });
                });
            });
        });
        // 贿赂倒戈复用短控归还；本能力的发动者死亡时也须归还。
        (bm.tempAllegiance?.processes || []).slice().forEach(p => {
            if (p.subtype !== this.CHARM) return;
            if (!this.alive(byId.get(p.casterId)) || !this.alive(byId.get(p.targetId))) {
                TempAllegianceManager.revert(bm, p, null, results);
            }
        });
        return results;
    },
    clear(bm) { bm.teamManager.getAllHeroes().forEach(h => { delete h.bribery; }); },
    statusLines(bm, hero) {
        if (!this.alive(hero)) return [];
        const lines = [], all = bm.teamManager.getAllHeroes();
        all.forEach(source => this.subtypes().forEach(subtype => {
            Object.values(source.bribery?.[subtype] || {}).forEach(entry => {
                const target = all.find(h => h.heroId === entry.targetId);
                if ((source !== hero && target !== hero) || !this.relation(source, target, subtype)) return;
                const currentStillRuns = bm.briberyFinishedRound !== bm.currentRound;
                const remaining = Math.max(0, entry.until - bm.currentRound + (currentStillRuns ? 1 : 0));
                const duration = Math.min(this.SUBTYPES[subtype].rounds, remaining);
                const effect = subtype === this.WEAKEN ? `仅针对${source.name}攻防-${entry.power}%`
                    : subtype === this.CHARM ? `不能直接攻击${source.name}` : `仅${source.name}的双方战术拼点×1.2`;
                lines.push(`${subtype}：${source.name} → ${target.name}，${effect}（剩余${duration}回合）`);
            });
        }));
        (bm.tempAllegiance?.processes || []).filter(p => p.subtype === this.CHARM).forEach(p => {
            if (p.casterId !== hero.heroId && p.targetId !== hero.heroId) return;
            const source = all.find(h => h.heroId === p.casterId), target = all.find(h => h.heroId === p.targetId);
            if (source && target) lines.push(`贿赂：魅惑：${source.name} → ${target.name}，临时倒戈（剩余1回合）`);
        });
        return lines;
    },
};

const EffectTransferManager = {
    ACTION: '效果传递',
    DISTORT: '扭曲：扭曲目标',
    GIFT_NEGATIVE: '赠予负面效果',
    CURSE_SOURCE: '诅咒之源',
    DURATION: 3,
    TRANSFERABLE_STATS: new Set(['当前活力', '当前敏捷', '当前灵性', '当前理智', '当前人性']),
    SUBTYPES: {
        '扭曲：扭曲目标': {
            pathway: '律师', title: '失序者', titleRank: -1,
            names: [{ gate: 5, name: '扭曲：扭曲目标' }],
            casterStats: ['灵性', '人性'],
            desc: '仅自身受害时，扭曲双方承担受害的概念，使伤害与外来负效各自减半。',
        },
        '赠予负面效果': {
            pathway: '律师', title: '失序者', titleRank: -1,
            names: [{ gate: 4, name: '赠予负面效果' }],
            casterStats: ['灵性', '人性'],
            mode: 'instant-gift',
            desc: '在战术阶段将自身全部可赠予的负面效果一次性“赠予”目标，成功后自身清除这些效果。',
        },
        '诅咒之源': {
            pathway: '囚犯', title: '恶魔之父', titleRank: -1,
            names: [{ gate: 4, name: '诅咒之源' }],
            casterStats: ['灵性'],
            desc: '序列4双向复制伤害与外来负效；序列3起只把自身受到的内容复制给目标。',
        },
    },

    subtypes() { return Object.keys(this.SUBTYPES); },
    ensure(bm) {
        if (!bm.effectTransfer) bm.effectTransfer = { serial: 0, relations: {} };
        if (!bm.effectTransfer.relations) bm.effectTransfer.relations = {};
        if (!Number.isFinite(Number(bm.effectTransfer.serial))) bm.effectTransfer.serial = 0;
        return bm.effectTransfer;
    },
    findHero(bm, heroId) {
        if (!bm || !heroId || !bm.teamManager) return null;
        return bm.teamManager.getAllHeroes().find(h => h && h.heroId === heroId) || null;
    },
    alive(hero) { return !!hero && (Number(hero.additionalStats?.当前活力) || 0) > 0; },
    onField(hero) { return this.alive(hero) && !OffFieldManager.isOff(hero); },
    eligibility(hero) { return AbilityAlias.resolve(hero?.sequenceString || '', this.SUBTYPES); },
    availableSubtypes(hero) {
        const e = this.eligibility(hero);
        return this.subtypes().filter(k => e[k] && e[k].ok);
    },
    eligible(hero) { return this.availableSubtypes(hero).length > 0; },
    matchedRank(hero, subtype) {
        const row = this.eligibility(hero)[subtype];
        if (row && row.ok && Number.isFinite(Number(row.rank))) return Number(row.rank);
        if (subtype === this.CURSE_SOURCE && String(hero?.sequenceString || '').includes('恶魔之父')) return -1;
        return Number(hero?.sequenceRank);
    },
    displayName(hero, subtype) {
        const row = this.eligibility(hero)[subtype];
        return (row && row.ok && row.name) || subtype;
    },
    isGiftSubtype(subtype) {
        return subtype === this.GIFT_NEGATIVE
            || this.SUBTYPES[subtype]?.mode === 'instant-gift';
    },
    systemOwnedEffect(effect) {
        if (!effect) return false;
        return !!(
            effect.statusDerived
            || effect.battlePersistent
            || effect.auraEffect
            || effect.ruleChange
            || effect.environment
            || effect.fieldEffect
            || effect.enemyControl
            || effect.exilePoison
            || effect.terrainSource
            || effect.effectTransferDerived
            || effect.effectTransferResolved
            || effect.mythicForm
            || effect.canonMythicForm
            || effect.$grazingPassiveSource
            || effect.$pathwayProjectionPassive
        );
    },
    statusDerivedNames(bm) {
        const manager = bm?.statusEffectManager;
        const names = new Set();
        [manager?.config, manager?.defaultConfig].forEach(config => {
            if (!config || typeof config !== 'object') return;
            Object.values(config).forEach(rows => {
                if (!Array.isArray(rows)) return;
                rows.forEach(row => {
                    const name = row?.effect?.name;
                    if (name) names.add(String(name));
                });
            });
        });
        return names;
    },
    isGiftableEffect(bm, effect) {
        if (!effect || !['debuff', 'poison'].includes(effect.type)) return false;
        if (!(Number(effect.duration) > 0) || this.systemOwnedEffect(effect)) return false;
        return !this.statusDerivedNames(bm).has(String(effect.name || ''));
    },
    giftableEffects(bm, hero) {
        return (Array.isArray(hero?.effects) ? hero.effects : [])
            .filter(effect => this.isGiftableEffect(bm, effect));
    },
    directionOf(subtype, rank) {
        if (this.isGiftSubtype(subtype)) return 'instant-gift';
        if (subtype === this.DISTORT) return 'caster-to-target';
        return Number(rank) <= 3 ? 'caster-to-target' : 'bidirectional';
    },
    directionLabel(relation) {
        if (!relation) return '';
        if (this.isGiftSubtype(relation.subtype)) return '立即将自身全部可赠予负效转移给目标';
        if (relation.subtype === this.DISTORT) return '自身受害时双方均摊';
        return relation.direction === 'bidirectional' ? '双方受害时互相复制' : '自身受害时复制给目标';
    },
    costOf(hero) { return TacticCatalog.spiritCost(hero?.sequenceRank); },
    casterStatKeysOf(subtype) {
        const keys = this.SUBTYPES[subtype]?.casterStats;
        return Array.isArray(keys) && keys.length ? keys : ['灵性'];
    },
    casterStatAfterCost(hero, subtype) {
        const s = hero?.additionalStats || {};
        const cost = this.costOf(hero);
        return Math.max(...this.casterStatKeysOf(subtype).map(key => {
            const field = key === '运气' ? '运气' : `当前${key}`;
            const value = Number(s[field]) || 0;
            return key === '灵性' ? Math.max(0, value - cost) : value;
        }));
    },
    casterStat(hero, subtype) {
        const s = hero?.additionalStats || {};
        return Math.max(...this.casterStatKeysOf(subtype).map(key => {
            const field = key === '运气' ? '运气' : `当前${key}`;
            return Number(s[field]) || 0;
        }));
    },
    targetStat(hero) { return EnemyControlManager.bestStat(hero); },
    canPossiblyWin(caster, target, subtype) {
        return EnemyControlManager.canPossiblyWin(
            caster, target, 1, this.casterStatAfterCost(caster, subtype), this.targetStat(target));
    },
    selectable(caster, target) {
        return !!caster && !!target && caster !== target
            && this.onField(caster) && this.onField(target)
            && caster.teamType !== target.teamType;
    },
    targets(bm, caster, subtype) {
        if (!bm || !this.availableSubtypes(caster).includes(subtype)) return [];
        if (this.isGiftSubtype(subtype) && this.giftableEffects(bm, caster).length === 0) return [];
        return bm.teamManager.getAllHeroes().filter(target =>
            this.selectable(caster, target) && this.canPossiblyWin(caster, target, subtype));
    },
    blockedReason(bm, caster, subtype, target = null) {
        if (!this.onField(caster)) return '当前没有在场且存活的发动者。';
        if (!subtype || !this.availableSubtypes(caster).includes(subtype)) return '请先选择一种可用的效果传递能力。';
        if ((caster.additionalStats?.当前灵性 ?? 0) <= 0) return '当前灵性为0，无法建立效果传递关系。';
        if (this.isGiftSubtype(subtype) && this.giftableEffects(bm, caster).length === 0) {
            return '当前没有可赠予的负面效果。';
        }
        if (!target) return '请选择一个在场敌人。';
        if (!this.selectable(caster, target)) return '效果传递只能选择存活、未离场的当前敌方。';
        if (!this.canPossiblyWin(caster, target, subtype)) return '扣费后的出手属性不足，理论上无法赢得这次拼点。';
        return '';
    },
    spend(hero) {
        const before = Number(hero?.additionalStats?.当前灵性) || 0;
        const cost = this.costOf(hero);
        hero.additionalStats.当前灵性 = Math.max(0, before - cost);
        return { before, cost, actual: before - hero.additionalStats.当前灵性 };
    },
    contest(caster, target, subtype) {
        return EnemyControlManager.contest(caster, target, 1, this.casterStat(caster, subtype), this.targetStat(target));
    },

    relationValid(bm, relation) {
        if (!bm || !relation) return false;
        const caster = this.findHero(bm, relation.casterId);
        const target = this.findHero(bm, relation.targetId);
        if (!this.alive(caster) || !this.alive(target)) return false;
        return (Number(bm.currentRound) || 0) <= Number(relation.expireAfterRound);
    },
    relationActive(bm, relation) {
        if (!this.relationValid(bm, relation)) return false;
        const round = Number(bm.currentRound) || 0;
        return round >= Number(relation.activeFromRound) && round <= Number(relation.expireAfterRound);
    },
    outgoingOf(bm, caster, activeOnly = false) {
        if (!bm || !caster) return null;
        const relation = this.ensure(bm).relations[caster.heroId] || null;
        const ok = activeOnly ? this.relationActive(bm, relation) : this.relationValid(bm, relation);
        return ok ? relation : null;
    },
    incomingOf(bm, target, activeOnly = false) {
        if (!bm || !target) return [];
        return Object.values(this.ensure(bm).relations).filter(relation =>
            relation && relation.targetId === target.heroId
            && (activeOnly ? this.relationActive(bm, relation) : this.relationValid(bm, relation)));
    },
    remainingRounds(bm, relation) {
        if (!this.relationValid(bm, relation)) return 0;
        const round = Number(bm.currentRound) || 0;
        if (round < Number(relation.activeFromRound)) return Number(relation.duration) || this.DURATION;
        return Math.max(0, Number(relation.expireAfterRound) - round + 1);
    },
    attemptGift(bm, caster, target, subtype, summary, results) {
        // blockedReason 已在 attempt 入口跑过；这里重新拍快照，保证实际搬运的是提交瞬间仍有效的负效。
        const snapshot = this.giftableEffects(bm, caster).slice();
        if (!snapshot.length) {
            summary.push(`✗ ${this.ACTION}未发动：当前没有可赠予的负面效果。`);
            return false;
        }
        const spent = this.spend(caster);
        const roll = this.contest(caster, target, subtype);
        const shownAs = this.displayName(caster, subtype);
        const detail = `（灵性消耗${spent.actual}/${spent.cost}，拼点 ${roll.casterScore}:${roll.targetScore}）`;
        if (!roll.win) {
            summary.push(`✗ ${caster.name}对${target.name}的「${shownAs}」未能生效${detail}，负面效果仍留在自身`);
            return false;
        }

        const accepted = [];
        const dissipated = [];
        target.effects = Array.isArray(target.effects) ? target.effects : [];
        snapshot.forEach(effect => {
            const copy = this._effectCopy(effect);
            copy.appliedAt = Date.now();
            const existing = target.effects.find(row =>
                row && row.name === copy.name && Number(row.duration) > 0);
            let applied;
            if (existing && this.systemOwnedEffect(existing)) {
                applied = { rejected: true, reason: 'system_owned' };
            } else {
                applied = bm.effectManager.storeResolvedEffect(target, copy);
            }
            if (applied && (applied.applied || applied.replaced || applied.refreshed)) {
                accepted.push(copy.name);
            } else {
                dissipated.push(copy.name);
            }
        });

        // 成功后无论目标是否接收同名条目，赠出的原效果都从发动者身上消失。
        const moved = new Set(snapshot);
        caster.effects = (caster.effects || []).filter(effect => !moved.has(effect));
        const removedSixDim = snapshot.some(effect =>
            effect.type === 'debuff' && bm.effectManager.isSixDimStat(effect.stat));
        if (removedSixDim) AttributeCalculator.recalculateAllSixDimStats(caster);

        const names = snapshot.map(effect => effect.name);
        const receiveTail = dissipated.length
            ? `；目标接收${accepted.length}项，另有${dissipated.length}项因同名冲突消散`
            : `；目标接收全部${accepted.length}项`;
        summary.push(`✓ ${caster.name}以「${shownAs}」将${names.join('、')}赠予${target.name}${receiveTail}${detail}`);
        results.push({
            kind: 'effect-transfer', stage: 'gift',
            actor: caster.name, target: target.name,
            subtype, shownAs,
            effects: names,
            accepted: accepted.slice(),
            dissipated: dissipated.slice(),
        });
        return true;
    },
    attempt(bm, caster, target, subtype, summary, results) {
        const reason = this.blockedReason(bm, caster, subtype, target);
        if (reason) {
            summary.push(`✗ ${this.ACTION}未发动：${reason}`);
            return false;
        }
        if (this.isGiftSubtype(subtype)) {
            return this.attemptGift(bm, caster, target, subtype, summary, results);
        }
        const old = this.outgoingOf(bm, caster);
        const spent = this.spend(caster);
        const roll = this.contest(caster, target, subtype);
        const shownAs = this.displayName(caster, subtype);
        const detail = `（灵性消耗${spent.actual}/${spent.cost}，拼点 ${roll.casterScore}:${roll.targetScore}）`;
        if (!roll.win) {
            summary.push(`✗ ${caster.name}对${target.name}的「${shownAs}」未能生效${detail}${old ? '，原关系保持不变' : ''}`);
            return false;
        }
        const state = this.ensure(bm);
        const appliedRound = Number(bm.currentRound) || 0;
        const rank = this.matchedRank(caster, subtype);
        const stage = old
            ? (old.targetId === target.heroId && old.subtype === subtype ? 'refresh' : 'switch')
            : 'start';
        const relation = {
            id: `et-${++state.serial}`,
            casterId: caster.heroId,
            targetId: target.heroId,
            subtype,
            shownAs,
            matchedRank: rank,
            direction: this.directionOf(subtype, rank),
            appliedRound,
            activeFromRound: appliedRound + 1,
            expireAfterRound: appliedRound + this.DURATION,
            duration: this.DURATION,
        };
        state.relations[caster.heroId] = relation;
        const relationText = stage === 'refresh'
            ? `刷新了与${target.name}的关系`
            : stage === 'switch'
                ? `将效果传递对象切换为${target.name}`
                : `与${target.name}建立了效果传递关系`;
        summary.push(`✓ ${caster.name}${relationText}：「${shownAs}」，下回合起持续${this.DURATION}回合${detail}`);
        results.push({
            kind: 'effect-transfer', stage,
            actor: caster.name, target: target.name,
            oldTarget: old ? this.findHero(bm, old.targetId)?.name || '' : '',
            subtype, shownAs, direction: relation.direction,
        });
        return true;
    },
    npcPlan(bm, caster, forcedSubtype = '') {
        if (!bm || !caster) return null;
        const outgoing = this.outgoingOf(bm, caster);
        const kinds = TacticResolver.shuffle(this.availableSubtypes(caster)
            .filter(subtype => !forcedSubtype || subtype === forcedSubtype));
        for (const subtype of kinds) {
            // 持续关系已经存在时不刷新或换人；即时赠予与它相互独立，仍可使用。
            if (outgoing && !this.isGiftSubtype(subtype)) continue;
            if (this.isGiftSubtype(subtype) && this.giftableEffects(bm, caster).length === 0) continue;
            const pool = TacticResolver.shuffle(this.targets(bm, caster, subtype));
            if (pool.length) return { subtype, target: pool[0] };
        }
        return null;
    },
    npcShouldTry(bm, caster) {
        return !!caster && (caster.additionalStats?.当前灵性 ?? 0) > 0
            && !!this.npcPlan(bm, caster);
    },
    linksForVictim(bm, victim) {
        if (!bm || !victim) return [];
        return Object.values(this.ensure(bm).relations).filter(relation => {
            if (!this.relationActive(bm, relation)) return false;
            if (relation.subtype === this.DISTORT) return relation.casterId === victim.heroId;
            if (relation.casterId === victim.heroId) return true;
            return relation.direction === 'bidirectional' && relation.targetId === victim.heroId;
        });
    },
    counterpartOf(bm, relation, victim) {
        if (!relation || !victim) return null;
        const id = relation.casterId === victim.heroId ? relation.targetId : relation.casterId;
        return this.findHero(bm, id);
    },

    _writeStat(hero, stat, amount, allowLifeSave) {
        const before = Math.max(0, Number(hero?.additionalStats?.[stat]) || 0);
        let requested = Math.max(0, Math.round(Number(amount) || 0));
        let lifeSave = null;
        if (allowLifeSave && stat === '当前活力' && requested > 0) {
            lifeSave = LifeSaveManager.tryAbsorb(hero, requested);
            requested = Math.max(0, Math.round(Number(lifeSave.damage) || 0));
        }
        const dealt = Math.min(before, requested);
        const after = before - dealt;
        hero.additionalStats[stat] = after;
        if (stat === '当前活力') {
            hero.health = after;
            hero.currentHealth = after;
        }
        return { hero, stat, before, after, dealt, requested, lifeSave };
    },
    _logLossTransfer(bm, relation, victim, recipient, result, base, context) {
        if (!result || result.dealt <= 0) return;
        const caster = this.findHero(bm, relation.casterId);
        const source = String(context?.sourceLabel || context?.sourceHero?.name || context?.sourceKind || '一次伤害');
        const stat = String(result.stat || '').replace('当前', '');
        const shield = result.lifeSave?.triggered
            ? `；${recipient.name}的「${result.lifeSave.skillName}」介入后实扣${result.dealt}` : '';
        const message = `🔗 ${caster?.name || relation.shownAs}的「${relation.shownAs}」因${source}触发：`
            + `${victim.name}的${stat}损失基数${base}，${recipient.name}承受${result.dealt}${shield}`;
        if (bm.battleLogger?.logTransferredDamage) {
            bm.battleLogger.logTransferredDamage(caster, recipient, result.dealt, message);
        } else {
            if (caster && bm.battleLogger?.damageStats?.[caster.teamType] !== undefined) {
                bm.battleLogger.damageStats[caster.teamType] += result.dealt;
            }
            bm.battleLogger?.log(message, 'damage');
        }
        bm.battleReporter?.logSimple?.(
            `${caster?.name || relation.shownAs}借助「${relation.shownAs}」，使${recipient.name}一同承受了由${source}引发的伤害。`
        );
    },
    applyResolvedLoss(bm, victim, stat, amount, context = {}) {
        const before = Math.max(0, Number(victim?.additionalStats?.[stat]) || 0);
        const base = Math.min(before, Math.max(0, Math.round(Number(amount) || 0)));
        if (!victim || !this.TRANSFERABLE_STATS.has(stat) || base <= 0 || context.derived || !bm) {
            const primary = victim ? this._writeStat(victim, stat, base, false) : null;
            return primary
                ? { ...primary, oldValue: primary.before, newValue: primary.after, actualDamage: primary.dealt, transfers: [] }
                : { oldValue: before, newValue: before, actualDamage: 0, transfers: [] };
        }

        // 先冻结关系快照。致死一击也要把本次已经成立的所有传递完整结算。
        const links = this.linksForVictim(bm, victim).slice();
        const distortion = links.find(r => r.subtype === this.DISTORT && r.casterId === victim.heroId) || null;
        const primaryAmount = distortion ? Math.ceil(base / 2) : base;
        const primary = this._writeStat(victim, stat, primaryAmount, false);
        const transfers = [];
        links.forEach(relation => {
            const recipient = this.counterpartOf(bm, relation, victim);
            if (!this.alive(recipient)) return;
            // 每条关系都以未被其他关系改写的原始 base 独立计算。
            const share = relation.subtype === this.DISTORT ? Math.ceil(base / 2) : base;
            const applied = this._writeStat(recipient, stat, share, true);
            transfers.push({ relation, recipient, ...applied });
            if (applied.dealt > 0) {
                EnemyControlManager.markDamaged(bm, recipient);
                this._logLossTransfer(bm, relation, victim, recipient, applied, base, context);
            }
        });
        if (primary.dealt > 0) EnemyControlManager.markDamaged(bm, victim);
        if (typeof bm.syncBoardOccupancy === 'function') bm.syncBoardOccupancy();
        const ended = this.sweepDead(bm);
        if (ended.length && typeof TacticResolver !== 'undefined') TacticResolver.writeReport(bm, ended, null);
        return { ...primary, oldValue: primary.before, newValue: primary.after, actualDamage: primary.dealt, transfers };
    },

    isTransferableEffect(effect, context = {}) {
        return !!effect && context.transferableExternal === true && context.derived !== true
            && (effect.type === 'debuff' || effect.type === 'poison');
    },
    _effectCopy(effect) {
        const copy = { ...effect };
        // 传递副本并不身处相同地形或放逐过程，不能继承会被原模块刷新/替换的来源戳。
        delete copy.terrainSource;
        delete copy.terrainResidueTurns;
        delete copy.exilePoison;
        delete copy.fieldEffectId;
        return copy;
    },
    _scaledEffect(effect, ratio, bm) {
        const out = this._effectCopy(effect);
        out.power = Math.ceil(Math.max(0, Number(effect.power) || 0) * ratio);
        out.duration = Math.max(1, Math.ceil(Math.max(1, Number(effect.duration) || 1) * ratio));
        if (Number.isFinite(Number(out.fieldEffectUntil))) {
            out.fieldEffectUntil = (Number(bm?.currentRound) || 0) + out.duration;
        }
        return out;
    },
    planEffectDeliveries(bm, victim, effect, context = {}) {
        if (!victim || !bm || !this.isTransferableEffect(effect, context)) {
            return [{ hero: victim, effect: { ...effect }, primary: true, relation: null }];
        }
        const links = this.linksForVictim(bm, victim).slice();
        if (!links.length) return [{ hero: victim, effect: { ...effect }, primary: true, relation: null }];
        const distortion = links.find(r => r.subtype === this.DISTORT && r.casterId === victim.heroId) || null;
        const original = distortion ? this._scaledEffect(effect, 0.5, bm) : { ...effect };
        // poison 已经在“挂效果”这一层完成分配，之后每跳不得再次触发关系。
        if (effect.type === 'poison') original.effectTransferResolved = true;
        const deliveries = [{ hero: victim, effect: original, primary: true, relation: distortion }];
        links.forEach(relation => {
            const recipient = this.counterpartOf(bm, relation, victim);
            if (!this.alive(recipient)) return;
            const copy = relation.subtype === this.DISTORT
                ? this._scaledEffect(effect, 0.5, bm)
                : this._scaledEffect(effect, 1, bm);
            copy.effectTransferDerived = true;
            copy.effectTransferRelationId = relation.id;
            copy.effectTransferSourceId = victim.heroId;
            if (effect.type === 'poison') copy.effectTransferResolved = true;
            deliveries.push({ hero: recipient, effect: copy, primary: false, relation });
        });
        return deliveries;
    },
    noteEffectDelivery(bm, victim, delivery, result, context = {}) {
        if (!delivery || delivery.primary || !delivery.relation) return;
        if (!result || !(result.applied || result.replaced || result.refreshed)) return;
        const relation = delivery.relation;
        const caster = this.findHero(bm, relation.casterId);
        const source = String(context.sourceLabel || context.sourceHero?.name || context.sourceKind || '外来负面效果');
        const line = `🔗 ${caster?.name || relation.shownAs}的「${relation.shownAs}」因${source}触发：`
            + `${delivery.hero.name}承受“${delivery.effect.name}”（强度${delivery.effect.power}，${delivery.effect.duration}回合）`;
        bm.battleLogger?.log(line, 'effect');
        bm.battleReporter?.logSimple?.(
            `${caster?.name || relation.shownAs}借助「${relation.shownAs}」，使${delivery.hero.name}一同承受了“${delivery.effect.name}”。`
        );
    },
    sweepDead(bm) {
        if (!bm) return [];
        const state = this.ensure(bm);
        const out = [];
        Object.entries(state.relations).forEach(([casterId, relation]) => {
            const caster = this.findHero(bm, relation.casterId);
            const target = this.findHero(bm, relation.targetId);
            let stage = '';
            if (!this.alive(caster)) stage = 'caster-dead';
            else if (!this.alive(target)) stage = 'target-dead';
            if (!stage) return;
            delete state.relations[casterId];
            out.push({
                kind: 'effect-transfer', stage,
                actor: caster?.name || relation.shownAs,
                target: target?.name || '', subtype: relation.subtype, shownAs: relation.shownAs,
            });
        });
        return out;
    },
    tick(bm) {
        if (!bm) return [];
        const out = this.sweepDead(bm);
        const state = this.ensure(bm);
        const round = Number(bm.currentRound) || 0;
        Object.entries(state.relations).forEach(([casterId, relation]) => {
            if (round < Number(relation.expireAfterRound)) return;
            delete state.relations[casterId];
            out.push({
                kind: 'effect-transfer', stage: 'expired',
                actor: this.findHero(bm, relation.casterId)?.name || relation.shownAs,
                target: this.findHero(bm, relation.targetId)?.name || '',
                subtype: relation.subtype, shownAs: relation.shownAs,
            });
        });
        return out;
    },
    statusLines(bm, hero) {
        if (!bm || !hero || !this.alive(hero)) return [];
        const lines = [];
        const outgoing = this.outgoingOf(bm, hero);
        if (outgoing) {
            const target = this.findHero(bm, outgoing.targetId);
            const pending = (Number(bm.currentRound) || 0) < Number(outgoing.activeFromRound) ? '，下回合生效' : '';
            lines.push(`效果传递：${outgoing.shownAs} → ${target?.name || '未知'}（${this.directionLabel(outgoing)}，剩余${this.remainingRounds(bm, outgoing)}回合${pending}）`);
        }
        this.incomingOf(bm, hero).forEach(relation => {
            const caster = this.findHero(bm, relation.casterId);
            const pending = (Number(bm.currentRound) || 0) < Number(relation.activeFromRound) ? '，下回合生效' : '';
            lines.push(`被效果传递：${caster?.name || '未知'}的${relation.shownAs}（${this.directionLabel(relation)}，剩余${this.remainingRounds(bm, relation)}回合${pending}）`);
        });
        return lines;
    },
};


const TempAllegianceManager = {

    // ---------- 运行期状态 ----------

    ensure(bm) {
        if (!bm.tempAllegiance) {
            bm.tempAllegiance = {
                // [{ casterId, targetId, subtype, originTeamType, originController, expireRound }]
                // 同一 casterId 至多一条：一个战术回合只有一个动作位。
                processes: [],
            };
        }
        return bm.tempAllegiance;
    },

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    subtypes() {
        return [
            TacticCatalog.TEMP_HIERARCHY,
            TacticCatalog.TEMP_CHARM,
            TacticCatalog.TEMP_FEAR,
            TacticCatalog.TEMP_LOVE,
            TacticCatalog.TEMP_PROFANE_FALL,
        ];
    },

    // ---------- 资格 ----------

    /**
     * 与 EnemyControlManager.resolveEligibility 同构：称号走 includes，
     * 途径片段走 pathwayShort + 序列门槛，多途径按段合并。
     * 毁灭天灾 / 第四支柱 同时也开征服，两者次数互不占用，这是有意的。
     */
    resolveEligibility(sequenceString) {
        const result = {
            [TacticCatalog.TEMP_HIERARCHY]: false,
            [TacticCatalog.TEMP_CHARM]: false,
            [TacticCatalog.TEMP_FEAR]: false,
            [TacticCatalog.TEMP_LOVE]: false,
            [TacticCatalog.TEMP_PROFANE_FALL]: false,
        };
        const s = String(sequenceString || '');
        if (s.includes('失序者')) result[TacticCatalog.TEMP_HIERARCHY] = true;
        if (s.includes('毁灭天灾') || s.includes('第四支柱')) result[TacticCatalog.TEMP_CHARM] = true;
        if (s.includes('上帝')) result[TacticCatalog.TEMP_FEAR] = true;
        if (s.includes(TacticCatalog.TEMP_PROFANE_FALL_TITLE)) {
            result[TacticCatalog.TEMP_PROFANE_FALL] = true;
        }
        if (s.includes('欲望母树')) result[TacticCatalog.TEMP_LOVE] = true;

        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            const rank = Number(r.rank);
            if (r.pathwayShort === '律师' && rank <= TacticCatalog.TEMP_HIERARCHY_RANK_GATE) {
                result[TacticCatalog.TEMP_HIERARCHY] = true;
            }
            if (r.pathwayShort === '刺客' && rank <= TacticCatalog.TEMP_CHARM_RANK_GATE) {
                result[TacticCatalog.TEMP_CHARM] = true;
            }
            if (r.pathwayShort === '水手' && rank <= TacticCatalog.TEMP_FEAR_RANK_GATE) {
                result[TacticCatalog.TEMP_FEAR] = true;
            }
            if (r.pathwayShort === '吝啬鬼' && rank <= TacticCatalog.TEMP_LOVE_RANK_GATE) {
                result[TacticCatalog.TEMP_LOVE] = true;
            }
            if (r.pathwayShort === '秘祈人' && rank <= TacticCatalog.TEMP_PROFANE_FALL_RANK_GATE) {
                result[TacticCatalog.TEMP_PROFANE_FALL] = true;
            }
        });
        return result;
    },

    /** 有资格，且当前没有在短控别人（一次最多 1 个目标）。无次数上限 */
    canUse(bm, hero, subtype) {
        if (!hero) return false;
        if (this.processOf(bm, hero.heroId)) return false;
        return !!this.resolveEligibility(hero.sequenceString)[subtype];
    },

    /** 所有短控资格里至少有一项——决定「操控敌人」下要不要出这批按钮 */
    hasAny(bm, hero) {
        return this.subtypes().some(t => this.canUse(bm, hero, t));
    },

    // ---------- 拼点与消耗口径 ----------

    /** 秽语·堕落固定灵性；旧短控仍取当前人性与当前灵性较大者，相等取灵性。 */
    statKeyOf(hero, subtype = '') {
        if (subtype === TacticCatalog.TEMP_PROFANE_FALL) return '灵性';
        const s = (hero && hero.additionalStats) || {};
        return (s.当前人性 ?? 0) > (s.当前灵性 ?? 0) ? '人性' : '灵性';
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costOf(hero, subtype = '') {
        return TacticCatalog.tempAllegianceCost(hero.sequenceRank, this.statKeyOf(hero, subtype));
    },

    /** 先扣再拼，成败都扣。与操控四条同口径 */
    spend(hero, subtype = '') {
        const key = this.statKeyOf(hero, subtype);
        const field = this.fieldOf(key);
        const cost = TacticCatalog.tempAllegianceCost(hero.sequenceRank, key);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    statAfterCost(hero, subtype = '') {
        const key = this.statKeyOf(hero, subtype);
        const cost = TacticCatalog.tempAllegianceCost(hero.sequenceRank, key);
        return Math.max(0, (hero.additionalStats?.[this.fieldOf(key)] ?? 0) - cost);
    },

    /** 要用的那一项当前值大于 0 才能发起 */
    hasStat(hero, subtype = '') {
        return (hero?.additionalStats?.[this.fieldOf(this.statKeyOf(hero, subtype))] ?? 0) > 0;
    },

    /** 目标方点数：只比当前灵性 / 人性 / 理智三项，与夺舍与附身同口径 */
    targetStatOf(target) {
        const s = (target && target.additionalStats) || {};
        return Math.max(...TacticCatalog.TEMP_TARGET_STATS.map(k => s[`当前${k}`] ?? 0));
    },

    /** 短控没有劣势修正：不吃 CONTROL_PENALTY，也不吃秘偶那套「上一轮受过伤」 */
    canPossiblyWin(caster, target, subtype = '') {
        return EnemyControlManager.canPossiblyWin(
            caster, target, 1,
            this.statAfterCost(caster, subtype),
            this.targetStatOf(target),
        );
    },

    contest(caster, target, casterStat) {
        return EnemyControlManager.contest(
            caster, target, 1,
            casterStat,
            this.targetStatOf(target),
        );
    },

    // ---------- 目标池 ----------

    /**
     * 可短控的目标：存活敌方、不是别人离场的本体、且理论上打得赢。
     * 身上挂着别人的秘偶或附身的**照选不误**——代价是那些过程会被 convertTeam 拆掉，
     * 结果页里会各写一行提醒。
     */
    tempTargets(bm, caster, subtype = '') {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            EnemyControlManager.isEnemyOf(caster, t)
            && !OffFieldManager.isOff(t)
            && this.canPossiblyWin(caster, t, subtype));
    },

    processOf(bm, casterId) {
        if (!bm || !bm.tempAllegiance) return null;
        return bm.tempAllegiance.processes.find(p => p.casterId === casterId) || null;
    },

    processOnTarget(bm, targetId) {
        if (!bm || !bm.tempAllegiance) return null;
        return bm.tempAllegiance.processes.find(p => p.targetId === targetId) || null;
    },

    // ---------- 穿透快照 ----------

    /**
     * 目标「把所有**临时**控制拆掉之后」该在的阵营与操纵者。
     *
     * 不能直接记 target.teamType：他此刻的阵营可能是别人借来的。典型是
     * 「敌方附身了我方 C，C 现在算敌人」——convertTeam 马上会以 converted 拆掉
     * 那条附身且**不还原阵营**，若按 enemy 记快照，到期就把自己人还给了敌方。
     *
     * 永久转化（征服 / 奴役 / 驯化 / 秘偶满层）不穿透：那个阵营已经是他真正的
     * 阵营，短控到期本来就该还回去。
     */
    resolveOrigin(bm, target) {
        const possess = PossessionManager.processOnTarget(bm, target.heroId);
        if (possess) {
            return {
                teamType: possess.originTeamType,
                controller: possess.originController,
            };
        }
        const temp = this.processOnTarget(bm, target.heroId);
        if (temp) {
            return {
                teamType: temp.originTeamType,
                controller: temp.originController,
            };
        }
        return { teamType: target.teamType, controller: target.controller };
    },

    // ---------- 发起 ----------

    /**
     * 短控成功。顺序与 PossessionManager.begin 同理，不能颠倒：
     *   1) 先读 origin —— convertTeam 马上要改写 teamType 与 controller，
     *      而且它会拆掉目标身上的附身，穿透所依赖的那条过程届时已经没了；
     *   2) 再 convertTeam；
     *   3) 最后 push 过程 —— 排在 convertTeam 之后，否则会被它内部的
     *      releaseOnTarget 当场作废掉刚建的这条。
     */
    begin(bm, caster, target, subtype, roll, summary, results) {
        const origin = this.resolveOrigin(bm, target);

        EnemyControlManager.convertTeam(bm, target, caster, summary);

        this.ensure(bm).processes.push({
            casterId: caster.heroId,
            targetId: target.heroId,
            subtype,
            originTeamType: origin.teamType,
            originController: origin.controller,
            // 战术回合排在 beginNextRound 之前，所以这里的 currentRound 还是本回合。
            // +1 即「陪打完下一个战斗回合，在那一轮的 finishRound 里还原」
            expireRound: (Number(bm.currentRound) || 0) + 1,
        });

        summary.push(`✓ ${caster.name} 以${subtype}使 ${target.name} 暂时转为友军`
            + EnemyControlManager.contestTail(roll));
        results.push({ ...TacticBorrowReport.meta(caster),
            kind: 'temp-allegiance', stage: 'start',
            actor: caster.name, target: target.name, subtype,
        });
    },

    // ---------- 还原 ----------

    /**
     * 把目标挪回快照记下的阵营。**写回快照，不做取反**。
     * @param {Array} [summary] 传 null 表示调用方不需要结果页文案
     */
    revert(bm, process, summary, results) {
        const state = this.ensure(bm);
        const i = state.processes.indexOf(process);
        if (i >= 0) state.processes.splice(i, 1);

        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);
        if (!target) return;

        const toAlly = process.originTeamType === 'ally';
        const back = toAlly ? bm.allyTeam : bm.enemyTeam;
        const other = toAlly ? bm.enemyTeam : bm.allyTeam;

        const j = other.indexOf(target);
        if (j >= 0) other.splice(j, 1);
        if (!back.includes(target)) back.push(target);

        target.teamType = process.originTeamType;
        target.controller = process.originController || target.dataSource || 'npc';

        if (summary && caster) {
            summary.push(`✗ ${caster.name} 对 ${target.name} 使用的${process.subtype}结束，`
                + `${target.name} 恢复原阵营`);
        }
        if (results && caster) {
            results.push({
                kind: 'temp-allegiance', stage: 'end',
                actor: caster.name, target: target.name, subtype: process.subtype,
            });
        }
    },

    /**
     * 到期回收。挂在 finishRound 上而不是战术回合里：玩家跳过战术回合、
     * 甚至直接输出战报，到期的短控也必须还原。
     *
     * 只产出战报条目，不产出结果页文案：这一刻战术面板还没开，
     * 那些行没有地方可显示，而 writeReport 本身就会往战斗日志写一份。
     * @returns {Array} 战报条目，交给 TacticResolver.writeReport
     */
    tick(bm) {
        const results = [];
        if (!bm || !bm.tempAllegiance) return results;
        const round = Number(bm.currentRound) || 0;
        bm.tempAllegiance.processes.slice().forEach(p => {
            if (round < p.expireRound) return;
            this.revert(bm, p, null, results);
        });
        return results;
    },

    /**
     * 战斗结束时无条件拆光。战报的队伍名单与胜负都要按原阵营写，
     * 不能让人停在「还被魅惑着」的状态上进结果页。
     */
    releaseAll(bm) {
        if (!bm || !bm.tempAllegiance) return;
        bm.tempAllegiance.processes.slice().forEach(p => this.revert(bm, p, null, null));
    },

    /** 给 convertTeam 的钩子用：目标被别人（永久地）转走时，本条一并作废 */
    releaseOnTarget(bm, target) {
        if (!bm || !target || !bm.tempAllegiance) return;
        const p = this.processOnTarget(bm, target.heroId);
        if (!p) return;
        const state = this.ensure(bm);
        const i = state.processes.indexOf(p);
        if (i >= 0) state.processes.splice(i, 1);
    },

    // ---------- 胜负口径 ----------

    /**
     * 算胜负时这个人归哪边。被短控走的仍按原阵营计，否则「魅惑掉最后一个敌人」
     * 会当场判胜，而人下一轮就变回去了。
     */
    originTeamOf(bm, hero) {
        if (!hero) return null;
        const p = bm && bm.tempAllegiance
            ? this.processOnTarget(bm, hero.heroId)
            : null;
        return p ? p.originTeamType : hero.teamType;
    },

    // ---------- 仲裁 ----------

    /**
     * 短控发起仲裁。排在附身**之后**，也就是整条流水线的最末：
     * 短控只持续一回合，被永久转化甚至被附身顶掉都比反过来更合理。
     */
    arbitrate(bm, attempts, summary, results) {
        if (!attempts || attempts.length === 0) return;

        attempts.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 使用的${a.subtype}未生效`
                + EnemyControlManager.contestTail(a.roll));
        });

        EnemyControlManager.groupByTarget(attempts.filter(a => a.roll.win)).forEach(list => {
            const champ = EnemyControlManager.pickWinner(list);
            list.forEach(a => {
                const stillFoe = EnemyControlManager.isEnemyOf(a.caster, a.target);
                const casterOk = TacticResolver.alive(a.caster)
                    && !OffFieldManager.isOff(a.caster);
                if (a === champ && stillFoe && casterOk) {
                    this.begin(bm, a.caster, a.target, a.subtype, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功对 ${a.target.name} 使用${a.subtype}前，`
                        + `目标已被别人抢先转化${EnemyControlManager.contestTail(a.roll)}`);
                }
            });
        });
    },
};

const TargetInterferenceManager = {
    MISRECOGNITION: '扭曲：目标错认',
    CHAOS: '混乱：目标失序',
    ensure(bm) {
        if (!bm.targetInterference) bm.targetInterference = { misrecognition: {}, chaos: {} };
        return bm.targetInterference;
    },
    stateOf(bm, hero) {
        const st = this.ensure(bm);
        return {
            misrecognition: st.misrecognition[hero?.heroId] || null,
            chaos: st.chaos[hero?.heroId] || null,
        };
    },
    clear(bm, hero) {
        if (!bm || !hero) return;
        const st = this.ensure(bm);
        delete st.misrecognition[hero.heroId];
        delete st.chaos[hero.heroId];
    },
    expireRound(bm) {
        if (!bm?.teamManager) return;
        const st = this.ensure(bm), round = Number(bm.currentRound) || 0;
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (!TacticResolver.alive(hero)) return this.clear(bm, hero);
            const row = st.chaos[hero.heroId];
            if (row && round >= row.untilRound) delete st.chaos[hero.heroId];
        });
    },
    clearAll(bm) {
        if (bm) bm.targetInterference = { misrecognition: {}, chaos: {} };
    },
    validAction(skill, caster, center) {
        if (!skill || skill.isPassive || SkillRange.isSelfType(skill.targetType)) return false;
        return skill.isHeal === true || skill.customDamageCalculator
            || (skill.getPower ? skill.getPower(caster) > 0 : Number(skill.power) > 0)
            || (skill.isAccuracyWeapon && Number(skill.fixedDamage) > 0);
    },
    candidatePool(bm, attacker, original, skill, isHeal, mode) {
        return bm.teamManager.getAllHeroes().filter(hero => {
            if (!hero || hero === attacker || hero === original) return false;
            if (!TacticResolver.alive(hero) || OffFieldManager.isOff(hero)) return false;
            if (!SkillRange.inRange(attacker, hero, skill)) return false;
            const selected = bm.parameterSelector?.selectParameters
                ? bm.parameterSelector.selectParameters(skill, attacker, hero) : skill;
            if ((selected.isHeal === true) !== isHeal) return false;
            if (mode === this.MISRECOGNITION) {
                const wantAlly = !isHeal;
                if ((hero.teamType === attacker.teamType) !== wantAlly) return false;
            }
            return !BriberyManager.attackBlockReason(bm, attacker, skill, hero);
        });
    },
    resolve(bm, attacker, targets, skill) {
        const original = (Array.isArray(targets) ? targets[0] : targets) || attacker;
        const states = this.stateOf(bm, attacker);
        const mode = states.misrecognition ? this.MISRECOGNITION : (states.chaos ? this.CHAOS : '');
        const originalSkill = bm.parameterSelector?.selectParameters
            ? bm.parameterSelector.selectParameters(skill, attacker, original) : skill;
        if (!mode || !this.validAction(originalSkill, attacker, original)) return null;
        const selfCentered = SkillRange.isSelfCentered(skill);
        const isHeal = originalSkill.isHeal === true;
        if (mode === this.MISRECOGNITION) delete this.ensure(bm).misrecognition[attacker.heroId];
        if (selfCentered) {
            const line = `${attacker.name}受到“${mode}”影响，${skill.name}仍以自身为中心，但作用阵营发生反转。`;
            bm.battleLogger?.log(line, 'effect');
            bm.battleReporter?.logSimple?.(line);
            return { mode, original, targets: [attacker], forceSide: isHeal ? 'enemy' : 'ally', excludeSelf: true };
        }
        const pool = this.candidatePool(bm, attacker, original, skill, isHeal, mode);
        const picked = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        const line = picked
            ? `${attacker.name}受到“${mode}”影响，${skill.name}的目标从${original.name}错认成${picked.name}。`
            : `${attacker.name}受到“${mode}”影响，${skill.name}找不到可错认的目标，本次行动落空。`;
        bm.battleLogger?.log(line, 'effect');
        bm.battleReporter?.logSimple?.(line);
        return {
            mode, original, targets: picked ? [picked] : [], actualCenter: picked,
            forceSide: picked ? (picked.teamType === attacker.teamType ? 'ally' : 'enemy') : null,
            excludeSelf: true,
        };
    },
    attempt(bm, caster, subtype, picked, summary, results) {
        const cfg = FieldEffectManager.cfgOf(subtype);
        FieldEffectManager.spend(caster, subtype);
        const candidates = subtype === this.CHAOS
            ? FieldEffectManager.scopeCandidates(bm, caster, { ringTarget: 2 }, picked)
                .filter(h => h.teamType !== caster.teamType)
            : [picked].filter(Boolean);
        const applied = [];
        candidates.forEach(target => {
            if (!TacticResolver.alive(target) || OffFieldManager.isOff(target)) return;
            const roll = FieldEffectManager.contestTarget(caster, target, cfg.contest);
            if (!roll.win) return summary.push(`✗ ${caster.name}没能对${target.name}施加“${subtype}”${EnemyControlManager.contestTail(roll)}`);
            const st = this.ensure(bm), bag = subtype === this.CHAOS ? st.chaos : st.misrecognition;
            if (bag[target.heroId]) return;
            bag[target.heroId] = subtype === this.CHAOS
                ? { sourceId: caster.heroId, untilRound: (Number(bm.currentRound) || 0) + 1 }
                : { sourceId: caster.heroId };
            applied.push(target.name);
        });
        if (!applied.length) return;
        summary.push(`✓ ${caster.name}对${applied.join('、')}施加了“${subtype}”`);
        results.push({ kind: 'target-interference', actor: caster.name, subtype, targets: applied });
    },
    npcWorthwhile(bm, caster, subtype, picked) {
        if (!picked) return false;
        const cfg = FieldEffectManager.cfgOf(subtype);
        return FieldEffectManager.canPossiblyWinTarget(caster, picked, subtype)
            && !(subtype === this.MISRECOGNITION
                ? this.ensure(bm).misrecognition[picked.heroId]
                : this.ensure(bm).chaos[picked.heroId]);
    },
    statusLines(bm, hero) {
        const s = this.stateOf(bm, hero), out = [];
        if (s.misrecognition) out.push('扭曲：目标错认：下一次攻击或治疗将认错目标');
        if (s.chaos) out.push('混乱：目标失序：本回合每次攻击或治疗都会认错目标');
        return out;
    },
};

const FieldEffectManager = {
    /**
     * 子类配置。
     *
     * 资格四件（pathway / title / titleRank / names）交给 AbilityAlias.resolve，
     * 与 EnvironmentManager.SUBTYPES 逐字同构。
     *
     * rankAtLeast 序列区间的**下界**，可省。AbilityAlias 只给上界（rank <= gate），
     *        配上这一项才能表达「只在序列 9 与 8」这种 band。语义与 selector 里的
     *        同名项一致：数字**不小于**，也就是更弱的那一头。判定在 eligibility 里，
     *        刻意不下沉到 AbilityAlias——别的大类根本不走那个工具。
     * pick   玩家要不要点目标，以及能点谁：'none' | 'ally' | 'enemy' | 'any'。
     *        它只管**输入**；效果真正落到谁身上由每条 effects[].selector 说了算。
     *        pick 为 'none' 的子类不能用 scope:'target'，那样解析不出落点。
     * cost   { stat, ratio }：按 ConsumableMoveBuilder.getAvgAttrs(rank)[stat] × ratio
     *        扣当前值，**成败都扣**。
     * contest 三选一：
     *        { mode: 'none' }    必成，不拼点；
     *        { mode: 'rivals' }  对场上所有对抗者各拼一次，全赢才成立；序列6以上阅读者
     *                            无需拥有同大类能力也会进入对抗者名单，
     *                            整发作废或整发通过（同 EnvironmentManager.contest）；
     *        { mode: 'target', penalty, casterStat, casterStats, targetStats }
     *                            逐目标各拼一次；可选 casterStats 多项取高，优先于 casterStat。
     *                            实际拼点与 NPC 扣费后预判使用同一取值规则。
     * maxUses 省略 = 无次数上限。
     * report  六件措辞，逐条可省，省掉的回落 FALLBACK_REPORT：
     *        summary / blocked / zero      结果页的成功、被顶、归零三行
     *        contestLost / suppressed      结果页的逐目标拼点输、整发被压
     *        tactic                        战报那一句
     *        除 contestLost 外，名字参数都是**已经拼好的一串**（同幅度、同原因合并）。
     *
     * effects[] 每条：
     *   selector  { scope, match }，见 resolveTargets
     *   channel   'buff' | 'debuff' | 'poison' | 'regen'
     *   stat      buff/debuff 用 'attack' / 'defense' / 'speed' / 'movement' / 'tacticContest'；
     *             poison/regen 用 '当前活力' 这类六维字段名
     *   valueType 'percentage' | 'fixed'（poison/regen 建议 fixed）
     *   power     见 powerOf 的五种 mode
     *   rounds    固定持续回合数；可选 roundsByRank 按本体位阶取分档，未命中回落 rounds。
     *   changeText 可选幅度方向文案，如“降低”；不改变增益/减益通道。
     *   label     效果名后缀，效果名拼成 `${能力名}·${label}`
     *   refreshOnExpiry 可选。为 true 时，fieldEffectUntil 已到本轮的同组条目不会挡住
     *                   重施；新拼点成功就续上，失败则旧条目在下一轮开始时正常清除。
     *   refreshAlways 可选。为 true 时同强度也允许随时重施，并把结束轮次重置为当前+rounds。
     * nextAttack 可选。声明后不写 hero.effects，而是在本场运行态登记一条由下一次
     *            伤害型攻击消费的效果；当前支持 ignoreDefenseBuff。
     */
    SUBTYPES: {
        '扭曲：目标错认': {
            action: '目标干涉', pathway: '律师', title: '失序者', titleRank: -1,
            names: [{ gate: 6, name: '扭曲：目标错认' }], pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'] },
            desc: '扭曲指定敌人下一次攻击或治疗的目标认知', targetInterference: true, effects: [],
        },
        '混乱：目标失序': {
            action: '目标干涉', pathway: '律师', title: '失序者', titleRank: -1,
            names: [{ gate: 5, name: '混乱：目标失序' }], pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'] },
            desc: '使指定敌人周围半径2内的敌人在下一完整回合持续认错目标', targetInterference: true, effects: [],
        },
        '混乱：距离紊乱': {
            pathway: '律师', title: '失序者', titleRank: -1,
            names: [{ gate: 5, name: '混乱：距离紊乱' }], pick: 'any',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'], enemiesOnly: true },
            desc: '提高指定人物周围半径2内友军的移动力，并降低其中敌军的移动力',
            effects: [
                { selector: { scope: { ringTarget: 2 }, match: { side: 'ally' } }, channel: 'buff', stat: 'movement', valueType: 'percentage', power: { mode: 'casterRankSeqDiff', baseRank: 6, base: 20, baseStep: 5, step: 5, min: 0, maxBonus: 20 }, rounds: 1, label: '移动力', refreshOnExpiry: true },
                { selector: { scope: { ringTarget: 2 }, match: { side: 'enemy' } }, channel: 'debuff', stat: 'movement', valueType: 'percentage', power: { mode: 'casterRankSeqDiff', baseRank: 6, base: 20, baseStep: 5, step: 5, min: 0, maxBonus: 20 }, rounds: 1, label: '移动力', changeText: '降低', refreshOnExpiry: true },
            ],
        },
        '扭曲：攻势偏离': {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 6, name: '扭曲：攻势偏离' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1,
                casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'],
            },
            contestHint: '用扣费后的当前灵性、当前人性中的最高值，对目标当前灵性、当前理智、当前人性中的最高值拼点；成功后才施加效果。',
            desc: '扭曲目标有效打击的含义，使其攻击偏离要害，降低造成的伤害',
            report: {
                tactic: (actor, _shown, names) =>
                    `${actor}扭曲了${names}的攻势，使其有效打击偏离要害。`,
            },
            effects: [{
                selector: { scope: 'target', match: { side: 'enemy' } },
                channel: 'debuff', stat: 'damageDealtDecrease', valueType: 'percentage',
                power: { mode: 'casterRankSeqDiff', baseRank: 6, base: 20, baseStep: 5, step: 5, min: 0, maxBonus: 20 },
                rounds: 1,
                roundsByRank: [
                    { maxRank: -1, rounds: 5 }, { maxRank: 0, rounds: 4 },
                    { maxRank: 2, rounds: 3 }, { maxRank: 4, rounds: 2 },
                ],
                label: '造成伤害', changeText: '降低',
            }],
        },
        '扭曲：防守漏洞': {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 6, name: '扭曲：防守漏洞' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1,
                casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'],
            },
            contestHint: '用扣费后的当前灵性、当前人性中的最高值，对目标当前灵性、当前理智、当前人性中的最高值拼点；成功后才施加效果。',
            desc: '扭曲目标保护自身的意图，使其防错方向并暴露防守漏洞',
            report: {
                tactic: (actor, _shown, names) =>
                    `${actor}扭曲了${names}保护自身的意图，使其防错方向、暴露破绽。`,
            },
            effects: [{
                selector: { scope: 'target', match: { side: 'enemy' } },
                channel: 'debuff', stat: 'defense', valueType: 'percentage',
                power: { mode: 'casterRankSeqDiff', baseRank: 6, base: 20, baseStep: 5, step: 5, min: 0, maxBonus: 20 },
                rounds: 1,
                roundsByRank: [
                    { maxRank: -1, rounds: 5 }, { maxRank: 0, rounds: 4 },
                    { maxRank: 2, rounds: 3 }, { maxRank: 4, rounds: 2 },
                ],
                label: '防御力', changeText: '降低',
            }],
        },
        '扭曲：阻碍行动': {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 4, name: '扭曲：阻碍行动' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1,
                casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'],
            },
            contestHint: '用扣费后的当前灵性、当前人性中的最高值，对目标当前灵性、当前理智、当前人性中的最高值拼点；成功后才施加阻碍。',
            desc: '通过扭曲对方的行动，为对方制造困难，使其之后的战术拼点受到固定劣势。',
            report: {
                tactic: (actor, _shown, names) =>
                    `${actor}扭曲了${names}的行动，对${names}造成了阻碍。`,
            },
            effects: [{
                // 使用现有单体目标范围；不存在 targetbots 这一范围类型。
                selector: { scope: 'target', match: { side: 'enemy' } },
                channel: 'debuff', stat: 'tacticContest', valueType: 'percentage',
                power: {
                    mode: 'abilityRankTier',
                    subtype: '扭曲：阻碍行动',
                    tiers: [
                        { maxRank: -1, value: 50 },
                        { maxRank: 0, value: 35 },
                        { maxRank: 2, value: 25 },
                        { maxRank: 4, value: 15 },
                    ],
                    fallback: 15,
                },
                rounds: 2,
                label: '战术拼点分数', changeText: '降低',
                refreshAlways: true,
            }],
        },
        '扭曲：步伐错乱': {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 6, name: '扭曲：步伐错乱' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1,
                casterStats: ['灵性', '人性'], targetStats: ['灵性', '理智', '人性'],
            },
            contestHint: '用扣费后的当前灵性、当前人性中的最高值，对目标当前灵性、当前理智、当前人性中的最高值拼点；成功后才施加效果。',
            desc: '扭曲目标移动的意图，使步伐不能有效抵达原本位置，减少主动移动距离',
            report: {
                tactic: (actor, _shown, names) =>
                    `${actor}扭曲了${names}的移动意图，使其步伐错乱、难以抵达原本的位置。`,
            },
            effects: [{
                selector: { scope: 'target', match: { side: 'enemy' } },
                channel: 'debuff', stat: 'movement', valueType: 'percentage',
                power: { mode: 'casterRankSeqDiff', baseRank: 6, base: 20, baseStep: 5, step: 5, min: 0, maxBonus: 20 },
                rounds: 1,
                roundsByRank: [
                    { maxRank: -1, rounds: 5 }, { maxRank: 0, rounds: 4 },
                    { maxRank: 2, rounds: 3 }, { maxRank: 4, rounds: 2 },
                ],
                label: '移动力', changeText: '降低',
            }],
        },
        '扭曲：伤害减轻': {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 6, name: '扭曲：伤害减轻' }],
            pick: 'ally',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            contestHint: '无需拼点，可对自身或一名友军施加减伤。',
            desc: '将落到自身或一名友军身上的重创扭曲为较轻的损伤；这是主动战术减伤，与弱保命“扭曲”分别生效',
            report: {
                tactic: (actor, _shown, names) =>
                    `${actor}将落到${names}身上的重创扭曲为较轻的损伤。`,
            },
            effects: [{
                selector: { scope: 'target', match: { side: 'ally' } },
                channel: 'buff', stat: 'damageTakenDecrease', valueType: 'percentage',
                power: { mode: 'casterRankSeqDiff', baseRank: 6, base: 20, baseStep: 5, step: 5, min: 0, maxBonus: 20 },
                rounds: 1,
                roundsByRank: [
                    { maxRank: -1, rounds: 5 }, { maxRank: 0, rounds: 4 },
                    { maxRank: 2, rounds: 3 }, { maxRank: 4, rounds: 2 },
                ],
                label: '受到伤害', changeText: '降低',
            }],
        },
        灵肉之刃: {
            pathway: '秘祈人',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 4, name: '灵肉之刃' }],
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            desc: '手臂长的锋利刀刃，可腐蚀血肉、泯灭灵魂、斩破屏障',
            nextAttack: { ignoreDefenseBuff: true },
            report: {
                summary: actor =>
                    `✓ ${actor}发动了“灵肉之刃”，下一次攻击将忽略目标的防御力BUFF`,
                tactic: actor =>
                    `${actor}的手臂延伸出锋利刀刃，为下一次攻击蓄势。`,
            },
            effects: [],
        },
        秽语自我强化: {
            pathway: '秘祈人',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 2, name: '秽语·自我强化' }],
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            desc: '每一个指向自身的词语都在抬升力量，短暂强化自身',
            report: {
                summary: (actor, shown, _names, detail) =>
                    `✓ ${actor} 使用「${shown}」，自身的${detail}`,
                blocked: (actor, shown, names, label) =>
                    `✗ ${names}的${label}已有不弱于「${shown}」的同类效果，本次未替换`,
                tactic: actor =>
                    `${actor}吐出指向自身的秽语，话语抬升了自身的力量。`,
            },
            effects: [
                {
                    selector: { scope: 'self' },
                    channel: 'buff', stat: 'attack', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 1, label: '攻击力',
                },
                {
                    selector: { scope: 'self' },
                    channel: 'buff', stat: 'defense', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 1, label: '防御力',
                },
                {
                    selector: { scope: 'self' },
                    channel: 'buff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 1, label: '速度',
                },
            ],
        },
        秽语囚禁: {
            pathway: '秘祈人',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 2, name: '秽语·囚禁' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '灵性',
                targetStats: ['灵性', '人性', '理智'],
            },
            contestHint: '用扣费后的当前灵性，对目标当前灵性、当前人性、当前理智中的最高一项拼点；一次拼点同时决定防御与速度减益是否生效。',
            desc: '截取并扩大话语中的歧义，以言灵束缚目标，使其难以防御和行动',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                blocked: (actor, shown, names, label) =>
                    `✗ ${names}的${label}已有不弱于「${shown}」的同类效果，本次未替换`,
                tactic: (actor, shown, names) =>
                    `${actor}以「${shown}」束缚了${names}，污秽的言灵压住了其防御与行动。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'defense', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 1, label: '防御力',
                },
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 1, label: '速度',
                },
            ],
        },
        秽语诅咒: {
            pathway: '秘祈人',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 2, name: '秽语·诅咒' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '灵性',
                targetStats: ['灵性', '人性', '理智'],
            },
            contestHint: '用扣费后的当前灵性，对目标当前灵性、当前人性、当前理智中的最高一项拼点；成功后诅咒才会生效。',
            desc: '直接以语言施放污秽诅咒，持续侵蚀目标的人性',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 以「${shown}」诅咒 ${names}，${detail}`,
                blocked: (actor, shown, names, label) =>
                    `✗ ${names}的${label}已有不弱于「${shown}」的同类效果，本次未替换`,
                tactic: (actor, shown, names) =>
                    `${actor}向${names}吐出污秽的诅咒之语，诅咒开始侵蚀其人性。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'poison', stat: '当前人性', valueType: 'fixed',
                    power: { mode: 'avgStat', stat: '人性', ratio: 0.10 },
                    rounds: 2, label: '人性',
                },
            ],
        },
        公证有效: {
            pathway: '歌颂者',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 6, name: '公证有效' }],
            pick: 'ally',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            desc: '为同伴的行动背书，使其攻势为战场所承认',
            report: {
                summary: (actor, shown, name, detail) =>
                    `✓ ${actor} 以「${shown}」为 ${name} 背书，${detail}`,
                tactic: (actor, shown, names) =>
                    `${actor}以「${shown}」为${names}的攻势作出公证，${names}的攻击被短暂强化。`,
            },
            effects: [
                {
                    // 只作用于玩家点的那一个友军。含施法者自己——口径与
                    // RuleChangeManager 的「友军全体含施法者自己」一致
                    selector: { scope: 'target', match: { side: 'ally' } },
                    channel: 'buff',
                    stat: 'attack',
                    valueType: 'percentage',
                    // 同序列 20%，目标每弱一个序列多 5%、每强一个序列少 5%，
                    // 上限 40%（恰好落在「目标比你弱 4 阶」）、下限 0（不挂）
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 1,
                    label: '攻击力',
                },
            ],
        },
        // 🆕 仲裁人序列 6 的范围软控。玩家点一名敌人作为中心，施放瞬间快照
        // 切比雪夫半径 2 内的当前敌人；逐人拼点，成功者下一回合不能主动移动。
        // 目标仍可攻击、施法与进行战术行动，强制位移也不读取 hero.move，照常生效。
        囚禁: {
            pathway: '仲裁人',
            title: '失序者',
            titleRank: -2,
            names: [{ gate: 6, name: '囚禁' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '灵性',
                targetStats: ['活力', '敏捷', '灵性'],
            },
            contestHint: '用扣费后的当前灵性，分别对半径2内每名敌人的当前活力、当前敏捷、当前灵性中的最高一项拼点；成功者下一回合的主动移动力降低100%，但仍可正常行动。',
            desc: '制造流淌着的粘稠到极点的透明液体，将目标凝固在原地',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，极度粘稠的透明液体将${names}凝固在原地，${detail}`,
                blocked: (actor, shown, names) =>
                    `✗ ${names}身上的移动力束缚尚未进入到期窗口，「${shown}」未能替换它`,
                contestLost: (actor, shown, name, tail) =>
                    `✗ ${actor}的「${shown}」没能将${name}凝固在原地${tail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}制造出流淌着的、粘稠到极点的透明液体，将${names}凝固在原地。`,
            },
            effects: [
                {
                    selector: { scope: { ringTarget: 2 }, match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'movement', valueType: 'percentage',
                    power: { mode: 'flat', value: 100 },
                    rounds: 1, label: '移动力', refreshOnExpiry: true,
                },
            ],
        },
        // 🆕 窥秘人序列 5 的单体软控。仍属于“施加效果”而非“操控敌人”：
        // 目标保留攻击、施法与战术行动，只在 MovementCalculator 的通用 movement
        // 修正层里吃 -100%。强制位移不读 hero.move，所以推拉、传送与换位照常发生。
        星光囚笼: {
            pathway: '窥秘人',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 5, name: '星光囚笼' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '灵性',
                targetStats: ['活力', '敏捷', '灵性'],
            },
            contestHint: '用扣费后的当前灵性，对目标当前活力、当前敏捷、当前灵性中的最高一项拼点；成功后目标下一回合的主动移动力降低100%，但仍可正常行动。',
            desc: '念咒后星光变成透明琥珀，将目标全部包裹囚禁；目标仍可行动，但主动移动力降低100%',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names}被透明琥珀包裹，${detail}`,
                blocked: (actor, shown, names) =>
                    `✗ ${names}身上的移动力束缚尚未进入到期窗口，「${shown}」未能替换它`,
                contestLost: (actor, shown, name, tail) =>
                    `✗ ${actor}的「${shown}」没能封住${name}${tail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}念诵咒文，星光凝成透明琥珀，将${names}整个包裹囚禁。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'movement', valueType: 'percentage',
                    power: { mode: 'flat', value: 100 },
                    rounds: 1, label: '移动力', refreshOnExpiry: true,
                },
            ],
        },
        // 🆕 窥秘人序列 2 的单体理智攻击。两种施法表现共用同一个效果：
        // 知识被具象化后追上被注视的目标，再被强行灌入其意识。
        知识逐人与强行灌注: {
            pathway: '窥秘人',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 2, name: '知识逐人与强行灌注' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '理智',
                targetStats: ['理智'],
            },
            contestHint: '用当前理智与目标当前理智拼点；成功后，理智伤害会在目标下一次行动开始时结算一次。',
            desc: '能向被注视目标灌输知识，或把知识具象化追逐攻击敌人。',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，具象化的知识追上${names}并被强行灌入其意识，${detail}`,
                blocked: (actor, shown, names) =>
                    `✗ ${names}身上已有不弱于「${shown}」的理智伤害，本次未替换`,
                contestLost: (actor, shown, name, tail) =>
                    `✗ ${actor}的「${shown}」未能突破${name}的理智${tail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}凝视着${names}，庞杂的知识随即具象化并追上目标，被强行灌入其意识。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'poison', stat: '当前理智', valueType: 'fixed',
                    power: { mode: 'avgStat', stat: '理智', ratio: 0.10 },
                    rounds: 1, label: '理智',
                },
            ],
        },
        // 🆕 通识者序列 5 的星光能力。四条全部只使用本大类现有的选择器、
        // seqDiff / avgStat、单体拼点与 buff / debuff / poison 通道，不另建重力或随机结果机制。
        星之祝福: {
            pathway: '通识者',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 5, name: '星之祝福' }],
            pick: 'ally',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            contestHint: '必定成功。',
            desc: '引来星光，改变目标周围区域所受的重力，强化友军的攻击与行动速度',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names}的${detail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}引来星光，改变了${names}周围的重力，强化了他们的攻势与行动速度。`,
            },
            effects: [
                {
                    selector: { scope: { ringTarget: 2 }, match: { side: 'ally' } },
                    channel: 'buff', stat: 'attack', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 10, step: 5, min: 0, max: 30 },
                    rounds: 1, label: '攻击力',
                },
                {
                    selector: { scope: { ringTarget: 2 }, match: { side: 'ally' } },
                    channel: 'buff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 10, step: 5, min: 0, max: 30 },
                    rounds: 1, label: '速度',
                },
            ],
        },
        星之诅咒衰弱: {
            pathway: '通识者',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 5, name: '星之诅咒·衰弱' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStat: '灵性' },
            contestHint: '用扣费后的当前灵性，对目标全部当前属性中的最高值拼点；一次拼点同时决定攻击力、防御力与速度减益是否生效。',
            desc: '发射星光凝聚的射线，使目标陷入全面衰弱',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor}以「${shown}」的星光射线命中${names}，其${detail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}发射出衰弱星光，射线命中${names}，使其攻势、防御与行动同时衰退。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'attack', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 10, step: 5, min: 0, max: 30 },
                    rounds: 1, label: '攻击力',
                },
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'defense', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 10, step: 5, min: 0, max: 30 },
                    rounds: 1, label: '防御力',
                },
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 10, step: 5, min: 0, max: 30 },
                    rounds: 1, label: '速度',
                },
            ],
        },
        星之诅咒变异: {
            pathway: '通识者',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 5, name: '星之诅咒·变异' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStat: '灵性' },
            contestHint: '用扣费后的当前灵性，对目标全部当前属性中的最高值拼点；成功后变异才会生效。',
            desc: '发射畸变星光，诱发目标的血肉与灵性变异；每次侵蚀量为自身位阶平均人性的5%',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor}以「${shown}」命中${names}，${detail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}发射出畸变星光，射线命中${names}，其血肉与灵性开始发生异常变异。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'poison', stat: '当前人性', valueType: 'fixed',
                    power: { mode: 'avgStat', stat: '人性', ratio: 0.05 },
                    rounds: 2, label: '人性',
                },
            ],
        },
        星之诅咒创伤: {
            pathway: '通识者',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 5, name: '星之诅咒·创伤' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStat: '灵性' },
            contestHint: '用扣费后的当前灵性，对目标全部当前属性中的最高值拼点；成功后创伤才会生效。',
            desc: '发射锐利星光，在目标体内留下持续恶化的创伤；每次伤害为自身位阶平均活力的5%',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor}以「${shown}」命中${names}，${detail}`,
                tactic: (actor, _shown, names) =>
                    `${actor}发射出锐利星光，射线命中${names}，在其体内留下持续恶化的创伤。`,
            },
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'poison', stat: '当前活力', valueType: 'fixed',
                    power: { mode: 'avgStat', stat: '活力', ratio: 0.05 },
                    rounds: 2, label: '活力',
                },
            ],
        },
        太阳歌颂: {
            pathway: '歌颂者',
            // 刻意不写 title：支柱「上帝」不解锁这条。称号那一路只在 cfg.title
            // 存在时才触发，不写就天然不通，不需要额外的排他判据。
            // rankAtLeast 8 配上 gate 9，把区间锁死成序列 9 与 8 两级：
            // 走到序列 7 它就消失，换成太阳光环
            rankAtLeast: 8,
            names: [{ gate: 9, name: '太阳歌颂' }],
            // 落点以自身为心算出来，没有要玩家点的目标
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            desc: '以太阳之名为周身三格内的同伴齐声颂唱，使他们的攻势为战场所承认',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                tactic: (actor, shown, names) =>
                    `${actor}使用「${shown}」，附近的${names}的攻击被短暂强化。`,
                // blocked / zero 不配，回落 FALLBACK_REPORT——那两句正合此处语气
            },
            effects: [
                {
                    // 以自己为心、切比雪夫半径 3 的实心圆，圈内友军。
                    // 施法者到自己的距离是 0，且 matchesSide 的 'ally' 判据是
                    // teamType 相等，所以自己天然含在内，不必另开一条 self 效果
                    selector: { scope: { ringSelf: 3 }, match: { side: 'ally' } },
                    channel: 'buff',
                    stat: 'attack',
                    valueType: 'percentage',
                    // 与公证有效同一条公式：同序列 20%，目标每弱一个序列多 5%、
                    // 每强一个序列少 5%，上限 40%、下限 0（不挂）
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 1,
                    label: '攻击力',
                },
            ],
        },
        太阳光环: {
            pathway: '歌颂者',
            // 同太阳歌颂：不写 title，支柱「上帝」不解锁。
            // rankAtLeast 4 配上 gate 7，锁死成序列 7～4。
            // 序列 6～4 同时保有公证有效，是有意重叠：面板出两个子类按钮，
            // NPC 的 npcPlan 在够格的子类里洗牌，谁先抽到「真能落到实处」的就用谁
            rankAtLeast: 4,
            names: [{ gate: 7, name: '太阳光环' }],
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            // 空串：参数区不要再跟一句「必定成功，场上没有人能阻挠」
            contestHint: '',
            desc: '以自身为圆心散发出阳光，覆盖并加强队友',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                tactic: (actor, shown, names) =>
                    `${actor}使用「${shown}」，附近的${names}的攻击被短暂强化。`,
            },
            effects: [
                {
                    // 与太阳歌颂同一套选择器，只把半径从 3 放到 4
                    selector: { scope: { ringSelf: 4 }, match: { side: 'ally' } },
                    channel: 'buff',
                    stat: 'attack',
                    valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 1,
                    label: '攻击力',
                },
            ],
        },
        正义光环: {
            pathway: '歌颂者',
            // 写 title：支柱「上帝」按 titleRank -2 命中，与公证有效同一条称号路。
            // 不配 rankAtLeast——gate 3 就是下界，序列 3 及更强（数字更小）全部开放
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 3, name: '正义光环' }],
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            contestHint: '',
            desc: '范围内符合自身正义准则的行为会大幅增强，违背者会被严重削弱甚至能力失效',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                // 第四、五参是友军 / 敌军命中名单。缺一列就省略半句。
                // 第三参 names 仍传入（兼容兜底签名），这里不用
                tactic: (actor, shown, _names, buffs, debuffs) => {
                    const bits = [];
                    if (buffs) bits.push(`附近的${buffs}的攻击被短暂强化`);
                    if (debuffs) bits.push(`${debuffs}的攻击被短暂削弱`);
                    return `${actor}使用「${shown}」，${bits.join('，')}。`;
                },
            },
            effects: [
                {
                    // 与太阳光环同一套选择器与公式，只把上限从 40 放到 60
                    selector: { scope: { ringSelf: 4 }, match: { side: 'ally' } },
                    channel: 'buff',
                    stat: 'attack',
                    valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 60 },
                    rounds: 1,
                    label: '攻击力',
                },
                {
                    // 镜像：同一圈、同一条 seqDiff，落在敌军身上就是攻击力 debuff
                    selector: { scope: { ringSelf: 4 }, match: { side: 'enemy' } },
                    channel: 'debuff',
                    stat: 'attack',
                    valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 60 },
                    rounds: 1,
                    label: '攻击力',
                },
            ],
        },
        // 🆕 萨满序列 5 的画中世界。以发动瞬间的自身位置为圆心完成一次圈选：
        // 自身获得三项强化，半径 2 内的当前敌人获得镜像削弱。效果落地后附着在
        // 当时命中的角色身上，后续走位不重算范围；每人每场只能发动一次。
        画中世界降临: {
            pathway: '萨满',
            title: '高维俯视者',
            titleRank: -1,
            names: [{ gate: 5, name: '画中世界降临' }],
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            contestHint: '',
            maxUses: 1,
            desc: '令画中世界以自身为中心降临：自身攻防与速度提高，周围敌人的攻防与速度降低，持续三个回合',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                tactic: (actor, shown, _names, buffs, debuffs) => {
                    const bits = [];
                    if (buffs) bits.push(`${buffs}被画中世界强化`);
                    if (debuffs) bits.push(`${debuffs}受到画中世界压制`);
                    return `${actor}令「${shown}」以自身为中心降临，${bits.join('，')}。`;
                },
            },
            effects: [
                {
                    selector: { scope: 'self' },
                    channel: 'buff', stat: 'attack', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 3, label: '攻击力',
                },
                {
                    selector: { scope: 'self' },
                    channel: 'buff', stat: 'defense', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 3, label: '防御力',
                },
                {
                    selector: { scope: 'self' },
                    channel: 'buff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 3, label: '速度',
                },
                {
                    selector: { scope: { ringSelf: 2 }, match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'attack', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 3, label: '攻击力',
                },
                {
                    selector: { scope: { ringSelf: 2 }, match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'defense', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 3, label: '防御力',
                },
                {
                    selector: { scope: { ringSelf: 2 }, match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'seqDiff', base: 20, step: 5, min: 0, max: 40 },
                    rounds: 3, label: '速度',
                },
            ],
        },
        // 🆕 水手「用歌声影响目标」的三条。第四条（恍惚之歌）是硬控，不在本大类的
        // 四通道里，走 HardControlManager 的恍惚之歌子类挂在「操控敌人」下。
        // 三条都写 title: '上帝'：那是多途径共有的支柱条目，所以观众侧的上帝也会
        // 开出这三首，与公证有效被水手上帝开出来是同一件事、同一个既定约定。
        // 幅度刻意用 flat 而不是 seqDiff：歌声的效力取决于唱的人，不取决于听的人
        // 与自己差几个序列——这是与歌颂者那四条最大的差别。
        海洋之歌: {
            pathway: '水手',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 5, name: '海洋之歌' }],
            // 落点恒为自己，没有要玩家点的目标；NPC 侧同理（npcPlan 对 pick 为 none
            // 的子类只问 worthwhile(..., null)，落点仍是它自己）
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'none' },
            desc: '以海洋之歌鼓动自身，短暂提高爆发',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，自身的${detail}`,
                tactic: (actor, shown) =>
                    `${actor}使用「${shown}」，自身的攻击被短暂强化。`,
            },
            effects: [
                {
                    selector: { scope: 'self' },
                    channel: 'buff',
                    stat: 'attack',
                    valueType: 'percentage',
                    power: { mode: 'flat', value: 20 },
                    rounds: 1,
                    label: '攻击力',
                },
            ],
        },
        雷鸣之歌: {
            pathway: '水手',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 5, name: '雷鸣之歌' }],
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.05 },
            // 逐目标各拼一次：圈里输掉的那个不吃这条 debuff，但灵性整发只扣一次。
            // 出手项固定当前灵性；不写 targetStats，于是目标走 bestStat
            //（六项当前值加运气里最高的一项），与技能干涉、操控系同口径。
            // penalty 1 = 没有任何劣势修正
            contest: { mode: 'target', penalty: 1, casterStat: '灵性' },
            desc: '模拟雷鸣震慑周围敌人，削弱其防御',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                tactic: (actor, shown, names) =>
                    `${actor}使用「${shown}」，${names}的防御被短暂削弱。`,
            },
            effects: [
                {
                    // 以自己为心、切比雪夫半径 2 的实心圆，圈内**当前**敌军。
                    // matchesSide 的 'enemy' 判据是 teamType 不等，所以自己与友军
                    // 天然不在内，短控倒戈过来的人这一轮也不挨打
                    selector: { scope: { ringSelf: 2 }, match: { side: 'enemy' } },
                    channel: 'debuff',
                    stat: 'defense',
                    valueType: 'percentage',
                    power: { mode: 'flat', value: 20 },
                    rounds: 1,
                    label: '防御力',
                },
            ],
        },
        喧闹之歌: {
            pathway: '水手',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 5, name: '喧闹之歌' }],
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.05 },
            contest: { mode: 'target', penalty: 1, casterStat: '灵性' },
            desc: '以杂乱歌声搅扰敌人神智',
            report: {
                summary: (actor, shown, names, detail) =>
                    `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
                tactic: (actor, shown, names) =>
                    `${actor}使用「${shown}」，${names}的神智被歌声搅乱。`,
            },
            effects: [
                {
                    // 只作用于玩家点的那一个敌人
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'poison',
                    // 打当前理智而不是当前活力：不同步 hero.health，也不进保命
                    //（LifeSaveManager 只拦打「当前活力」的技能伤）
                    stat: '当前理智',
                    valueType: 'fixed',
                    // 强度取决于施术者：按施法者序列的平均理智 10% 算死
                    power: { mode: 'avgStat', stat: '理智', ratio: 0.10 },
                    // poison 走引擎的 'turn_start'，所以这个 1 是「目标下一次行动
                    // 结算一次」，不是绝对回合，见本模块顶部第 2 条
                    rounds: 1,
                    label: '理智',
                },
            ],
        },
        '神秘再现·卖火柴的小女孩': {
            catalogId: 'little_match_girl',
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.08 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '灵性',
                targetStats: ['灵性', '理智', '人性'],
            },
            desc: '凝聚燃烧的火柴，使目标沉入温暖而虚假的幻觉。',
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'damageDealtDecrease', valueType: 'percentage',
                    power: { mode: 'flat', value: 50 }, rounds: 1, label: '造成伤害',
                },
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 1, label: '速度',
                },
            ],
        },
        '神秘再现·背叛之宴': {
            catalogId: 'feast_of_betrayal',
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.10 },
            // 不写 targetStats：contestTarget 会走 bestStat，正确包含运气。
            contest: { mode: 'target', penalty: 1, casterStat: '灵性' },
            desc: '唤起背叛与分食的画面，短暂动摇目标持有力量的忠诚。',
            effects: [{
                selector: { scope: 'target', match: { side: 'enemy' } },
                channel: 'debuff', stat: 'damageDealtDecrease', valueType: 'percentage',
                power: { mode: 'flat', value: 50 }, rounds: 1, label: '造成伤害',
            }],
        },
        '神秘再现·皇帝的新衣': {
            catalogId: 'emperors_new_clothes',
            pick: 'none',
            cost: { stat: '灵性', ratio: 0.15 },
            contest: { mode: 'none' },
            desc: '让自身仿佛成为根本不存在的事物，从而大幅减轻受到的伤害。',
            effects: [{
                selector: { scope: 'self' },
                channel: 'buff', stat: 'damageTakenDecrease', valueType: 'percentage',
                power: { mode: 'flat', value: 90 }, rounds: 1, label: '受到伤害',
            }],
        },
        '神秘再现·岁月的棋局': {
            catalogId: 'chess_game_of_time',
            pick: 'enemy',
            cost: { stat: '灵性', ratio: 0.10 },
            contest: {
                mode: 'target', penalty: 1, casterStat: '灵性',
                targetStats: ['敏捷', '灵性'],
            },
            desc: '把目标拖入时间流速迥异的棋局，使其行动与移动同时放缓。',
            effects: [
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'speed', valueType: 'percentage',
                    power: { mode: 'flat', value: 30 }, rounds: 2, label: '速度',
                },
                {
                    selector: { scope: 'target', match: { side: 'enemy' } },
                    channel: 'debuff', stat: 'movement', valueType: 'percentage',
                    power: { mode: 'flat', value: 50 }, rounds: 2, label: '移动力',
                },
            ],
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    cfgOf(subtype) {
        return this.SUBTYPES[subtype] || null;
    },

    // ---------- 运行期状态 ----------

    /**
     * seq 给 fieldEffectId 递增用，不用时间戳：同一毫秒里可能落好几条。
     * used 只有配了 maxUses 的子类才会用到，按 { [heroId]: { [subtype]: n } } 记。
     */
    ensure(bm) {
        if (!bm.fieldEffect) {
            bm.fieldEffect = { seq: 0, used: {}, nextAttack: {} };
        }
        if (!bm.fieldEffect.used) bm.fieldEffect.used = {};
        if (!bm.fieldEffect.nextAttack) bm.fieldEffect.nextAttack = {};
        return bm.fieldEffect;
    },

    nextAttackOf(bm, hero) {
        if (!bm || !hero) return null;
        return this.ensure(bm).nextAttack[hero.heroId] || null;
    },

    hasNextAttack(bm, hero, subtype = '') {
        const pending = this.nextAttackOf(bm, hero);
        return !!pending && (!subtype || pending.subtype === subtype);
    },

    armNextAttack(bm, hero, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!bm || !hero || !cfg || !cfg.nextAttack || this.hasNextAttack(bm, hero)) return false;
        this.ensure(bm).nextAttack[hero.heroId] = {
            subtype,
            armedRound: Number(bm.currentRound) || 0,
        };
        return true;
    },

    consumeNextAttack(bm, hero) {
        const pending = this.nextAttackOf(bm, hero);
        if (!pending) return null;
        delete this.ensure(bm).nextAttack[hero.heroId];
        return pending;
    },

    clearNextAttack(bm, hero) {
        if (!bm || !hero) return;
        delete this.ensure(bm).nextAttack[hero.heroId];
    },

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    /** 在场：活着且没有因附身 / 放逐离场。口径同 RuleChangeManager.targetsOf */
    onField(hero) {
        return !!hero && TacticResolver.alive(hero) && !OffFieldManager.isOff(hero);
    },

    // ---------- 资格与显示名 ----------

    /**
     * 逐子类资格。在 AbilityAlias.resolve 的结果上再收一刀区间下界。
     *
     * AbilityAlias 只有上界（rank <= gate），表达不了「只在序列 9 与 8」这种 band。
     * 刻意只收在本大类内部而不是去改 AbilityAlias：其余十个大类各自手写
     * resolveEligibility，压根不经过那个工具，改共用工具它们一条都收不到，
     * 徒然多一个没人用的参数。
     *
     * rankAtLeast 与本模块 matchesPathway 里的同名项同义——数字**不小于**，
     * 也就是更弱的那一头。没配这一项的子类逐字不变。
     */
    eligibility(hero) {
        const raw = AbilityAlias.resolve(hero && hero.sequenceString, this.SUBTYPES);
        Object.keys(raw).forEach(k => {
            const cfg = this.cfgOf(k);
            if (cfg && cfg.catalogId
                && MysteryReenactmentCanonAccess.canUseTactic(hero, cfg.catalogId)) {
                raw[k] = { ok: true, rank: Number(hero && hero.sequenceRank), name: k };
            }
            const floor = Number(cfg && cfg.rankAtLeast);
            if (!Number.isFinite(floor)) return;
            if (raw[k].ok && Number(raw[k].rank) < floor) {
                raw[k] = { ok: false, rank: null, name: '' };
            }
        });
        return raw;
    },

    eligible(hero) {
        const e = this.eligibility(hero);
        return this.subtypes().some(k => e[k] && e[k].ok);
    },

    /** 够格**且**名额未用完的子类，返回内部键。名额没配就只看资格 */
    availableSubtypes(bm, hero, action = null) {
        const e = this.eligibility(hero);
        return this.subtypes().filter(k => e[k] && e[k].ok && this.quotaLeft(bm, hero, k) > 0
            && (!action || (this.cfgOf(k).action || TacticCatalog.FIELD_EFFECT_ACTION) === action));
    },

    /**
     * 内部键 → 这个人该看到的能力名。解析不出来时退回该子类最强档的名字，
     * 不暴露内部键。与 EnvironmentManager.displayName 逐字同构。
     */
    displayName(hero, subtype) {
        const e = this.eligibility(hero)[subtype];
        if (e && e.ok && e.name) return e.name;
        const cfg = this.cfgOf(subtype);
        if (!cfg) return String(subtype);
        return AbilityAlias.nameOf(cfg, subtype, AbilityAlias.titleRankOf(cfg)) || String(subtype);
    },

    canUse(bm, hero) {
        return !!hero && this.availableSubtypes(bm, hero).length > 0;
    },

    // ---------- 消耗 ----------

    statKeyOf(subtype) {
        const cfg = this.cfgOf(subtype);
        return (cfg && cfg.cost && cfg.cost.stat) || '灵性';
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costOf(hero, subtype) {
        const cfg = this.cfgOf(subtype);
        const c = (cfg && cfg.cost) || {};
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero && hero.sequenceRank);
        return Math.max(1, Math.round((attrs[c.stat] ?? 0) * (Number(c.ratio) || 0)));
    },

    /** 先扣再判，成败都扣。一次发动只扣一次，与命中几个人无关 */
    spend(hero, subtype) {
        const key = this.statKeyOf(subtype);
        const field = this.fieldOf(key);
        const cost = this.costOf(hero, subtype);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    hasStat(hero, subtype) {
        return (hero?.additionalStats?.[this.fieldOf(this.statKeyOf(subtype))] ?? 0) > 0;
    },

    // ---------- 次数 ----------

    quotaLeft(bm, hero, subtype) {
        const cfg = this.cfgOf(subtype);
        const max = Number(cfg && cfg.maxUses);
        if (!Number.isFinite(max)) return Infinity;
        const st = this.ensure(bm);
        const used = (st.used[hero && hero.heroId] || {})[subtype] || 0;
        return Math.max(0, max - used);
    },

    markUsed(bm, hero, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!Number.isFinite(Number(cfg && cfg.maxUses))) return;
        const st = this.ensure(bm);
        const key = hero.heroId;
        if (!st.used[key]) st.used[key] = {};
        st.used[key][subtype] = (st.used[key][subtype] || 0) + 1;
    },

    // ---------- 数值 ----------

    /**
     * 五种算法，原有配置继续使用固定基础值；本体成长由独立 mode 启用。
     *   flat     固定值，不看序列差
     *   seqDiff  clamp(base + step × (目标 rank − 施法者 rank), min, max)。
     *            序列数字越小越强，所以目标比自己弱时差值为正、幅度放大。
     *            公式同 EnvironmentManager.powerOf，钳制形状同 RuleChangeManager.powerOf。
     *            min 省略取 0，max 省略即无上限。
     *   casterRankSeqDiff 先按本体 sequenceRank 提升基础值，上限为基础值 + maxBonus，
     *                     再加双方序列差修正；不使用获得能力时的附加途径位阶。
     *   avgStat  按施法者序列的平均属性算固定值，给 poison / regen 用——
     *            强度取决于施术者而不是受术者，同 EXILE_POISON_RATIO 那条。
     *   abilityRankTier 按指定子类实际命中的途径片段位阶读取离散表；
     *                   不会被角色其它途径的更高整体位阶越权强化。
     */
    powerProfile(caster, spec) {
        const p = (spec && spec.power) || {};
        let base = Number(p.base) || 0;
        const min = Number.isFinite(Number(p.min)) ? Number(p.min) : 0;
        let max = Number.isFinite(Number(p.max)) ? Number(p.max) : Infinity;
        if (p.mode === 'casterRankSeqDiff') {
            const baseRank = Number(p.baseRank) || 0;
            const rawRank = Number(caster && caster.sequenceRank);
            const rank = Number.isFinite(rawRank) ? rawRank : baseRank;
            base = Math.round(base + (Number(p.baseStep) || 0) * (baseRank - rank));
            max = base + (Number(p.maxBonus) || 0);
        }
        return { base, min, max };
    },

    roundsOf(caster, spec) {
        const fallback = Math.max(1, Math.floor(Number(spec && spec.rounds) || 1));
        const rank = Number(caster && caster.sequenceRank);
        if (!Number.isFinite(rank) || !Array.isArray(spec && spec.roundsByRank)) return fallback;
        const tier = spec.roundsByRank
            .filter(t => t && Number.isFinite(Number(t.maxRank)) && rank <= Number(t.maxRank))
            .sort((a, b) => Number(a.maxRank) - Number(b.maxRank))[0];
        return tier ? Math.max(1, Math.floor(Number(tier.rounds) || fallback)) : fallback;
    },

    powerOf(caster, target, spec) {
        const p = (spec && spec.power) || {};
        if (p.mode === 'flat') {
            return Math.max(0, Math.round(Number(p.value) || 0));
        }
        if (p.mode === 'avgStat') {
            const attrs = ConsumableMoveBuilder.getAvgAttrs(caster && caster.sequenceRank);
            return Math.max(1, Math.round((attrs[p.stat] ?? 0) * (Number(p.ratio) || 0)));
        }
        if (p.mode === 'abilityRankTier') {
            const fallback = Math.max(0, Math.round(Number(p.fallback) || 0));
            const subtype = String(p.subtype || '');
            const matched = subtype ? this.eligibility(caster)[subtype] : null;
            const rank = Number(matched && matched.rank);
            if (!matched || !matched.ok || !Number.isFinite(rank) || !Array.isArray(p.tiers)) {
                return fallback;
            }
            const tier = p.tiers
                .filter(row => row && Number.isFinite(Number(row.maxRank)) && rank <= Number(row.maxRank))
                .sort((a, b) => Number(a.maxRank) - Number(b.maxRank))[0];
            return tier ? Math.max(0, Math.round(Number(tier.value) || fallback)) : fallback;
        }
        const a = Number(caster && caster.sequenceRank);
        const b = Number(target && target.sequenceRank);
        const diff = (Number.isFinite(a) && Number.isFinite(b)) ? (b - a) : 0;
        const { base, min, max } = this.powerProfile(caster, spec);
        const raw = base + (Number(p.step) || 0) * diff;
        return Math.max(min, Math.min(max, Math.round(raw)));
    },

    // ---------- 目标解析 ----------

    /** 这条子类要不要玩家点目标 */
    needsPick(subtype) {
        const cfg = this.cfgOf(subtype);
        const pick = (cfg && cfg.pick) || 'none';
        return pick !== 'none';
    },

    /**
     * 玩家能点谁。**只管输入**，与效果真正落到谁身上是两回事。
     * 棋盘高亮与提交校验共用它，避免「亮着的点不了」这类两处判据不一致的问题。
     */
    pickPool(bm, caster, subtype) {
        const cfg = this.cfgOf(subtype);
        const pick = (cfg && cfg.pick) || 'none';
        if (pick === 'none' || !bm || !caster) return [];
        const all = bm.teamManager.getAllHeroes().filter(h => this.onField(h));
        if (pick === 'any') return all;
        if (pick === 'enemy') return all.filter(h => h.teamType !== caster.teamType);
        // 'ally'：同阵营，**含施法者自己**
        return all.filter(h => h.teamType === caster.teamType);
    },

    /**
     * 第一段过滤：几何。
     * 距离一律切比雪夫，与心智剥夺的半径、秘偶射程、强制位移全部同口径。
     * hollow 为真时只取恰好第 r 圈（环形而非实心圆）。
     */
    scopeCandidates(bm, caster, scope, picked) {
        const all = bm.teamManager.getAllHeroes().filter(h => this.onField(h));
        if (!scope || scope === 'all') return all;
        if (scope === 'self') return this.onField(caster) ? [caster] : [];
        // 没点目标就落空，**不报警**：参数区在玩家点人之前就会调 previewFor 预览，
        // 那时 picked 本来就是 null，是正常状态而不是配置错误
        if (scope === 'target') {
            return (picked && this.onField(picked)) ? [picked] : [];
        }
        if (typeof scope === 'object') {
            const selfR = Number(scope.ringSelf);
            const targetR = Number(scope.ringTarget);
            const useSelf = Number.isFinite(selfR);
            const r = useSelf ? selfR : targetR;
            const origin = useSelf ? caster : picked;
            if (!origin || !Number.isFinite(r)) return [];
            return all.filter(h => {
                const d = BattleBoard.distanceBetween(origin, h);
                return scope.hollow ? d === r : d <= r;
            });
        }
        return all;
    },

    /** 阵营匹配。读**当前** teamType：短控倒戈过来的人这一轮就算友军 */
    matchesSide(caster, hero, side) {
        if (!side || side === 'both') return true;
        if (side === 'self') return hero === caster;
        if (side === 'enemy') return hero.teamType !== caster.teamType;
        return hero.teamType === caster.teamType;
    },

    /**
     * 途径 / 序列区间匹配。判定复用 LifeSaveManager 那两个函数，与
     * AbilityAlias.resolve 同一套：混途径角色**任一片段**命中即算命中。
     *
     * 刻意不写「序列高于 / 低于」——序列数字越小越强，那种说法必然被读错。
     * rankAtMost 是「数字不大于」（也就是更强的那一头），rankAtLeast 反之。
     * 词库拿不到时 resolveFragment 返回 null，该片段判为不命中，静默跳过。
     */
    matchesPathway(hero, match) {
        const wantPathway = match.pathway;
        const atMost = Number(match.rankAtMost);
        const atLeast = Number(match.rankAtLeast);
        const hasRank = Number.isFinite(atMost) || Number.isFinite(atLeast);
        if (!wantPathway && !hasRank) return true;

        return LifeSaveManager.splitSequenceFragments(hero && hero.sequenceString)
            .some(frag => {
                const r = LifeSaveManager.resolveFragment(frag);
                if (!r) return false;
                if (wantPathway && r.pathwayShort !== wantPathway) return false;
                const rank = Number(r.rank);
                if (!Number.isFinite(rank)) return false;
                if (Number.isFinite(atMost) && rank > atMost) return false;
                if (Number.isFinite(atLeast) && rank < atLeast) return false;
                return true;
            });
    },

    /** 第二段过滤：身份。各项取交集，全不填就是候选池里所有人 */
    matchesIdentity(caster, hero, match) {
        if (!match) return true;
        if (!this.matchesSide(caster, hero, match.side)) return false;
        if (match.title && !String(hero.sequenceString || '').includes(match.title)) return false;
        if (!this.matchesPathway(hero, match)) return false;
        return true;
    },

    /**
     * 一条效果落到谁身上。先几何后身份，两段都过才算命中。
     * 「在场」的闸门统一在 scopeCandidates 里做，子类不用管。
     */
    resolveTargets(bm, caster, spec, picked) {
        if (!bm || !caster || !spec) return [];
        const sel = spec.selector || {};
        return this.scopeCandidates(bm, caster, sel.scope, picked)
            .filter(h => this.matchesIdentity(caster, h, sel.match));
    },

    // ---------- 内部去重 ----------

    /**
     * 目标身上同组的那一条本大类条目。分组键是 stat × type × valueType——
     * valueType 必须在里面，跨量纲比大小没有意义（5% 与 400 点）。
     */
    sameEntryOn(target, spec) {
        return (target && Array.isArray(target.effects) ? target.effects : [])
            .find(e => e
                && e.fieldEffect
                && e.stat === spec.stat
                && e.type === spec.channel
                && e.valueType === (spec.valueType || 'percentage')) || null;
    },

    /**
     * 这一发会不会被目标身上已有的同组条目挡住。软闸门与参数区预览共用。
     * refreshAlways 放行同强度重施，成功后无论剩余多久都把结束轮次重置为当前+rounds。
     * refreshOnExpiry 只放行「本轮结束后就该清掉」的旧条目：战术阶段发生在
     * beginNextRound 之前，此时 fieldEffectUntil === currentRound 的效果仍挂在身上，
     * 不开这扇窄门就会被同强度查重挡住，下一回合必然出现一轮空档。
     */
    blockedBy(target, spec, power, bm = null) {
        const same = this.sameEntryOn(target, spec);
        const samePowerRefresh = !!(same && spec && spec.refreshAlways
            && Number(same.power) === Number(power));
        const expiring = !!(same && spec && spec.refreshOnExpiry && bm
            && Number.isFinite(Number(same.fieldEffectUntil))
            && Number(same.fieldEffectUntil) <= Number(bm.currentRound));
        if (samePowerRefresh || expiring) return null;
        return (same && (same.power ?? 0) >= power) ? same : null;
    },

    // ---------- 落地 ----------

    /**
     * 挂一条。
     * 内部取最高：判据逐字镜像 TacticResolver.applyTacticEffect——更强替换、
     * **不弱于就拒绝**（>= 而不是 >），于是同强度重复施加不会白白换一条新的。
     * 不区分施法者：两个人给同一个人加同一项，只有强的那条算数。
     * @returns {{ok: boolean, power: number, reason?: string}}
     */
    applyOne(bm, caster, target, spec, shownAs) {
        const power = this.powerOf(caster, target, spec);
        if (power <= 0) return { ok: false, power: 0, reason: 'zero' };
        const isDot = spec.channel === 'poison' || spec.channel === 'regen';
        const rounds = this.roundsOf(caster, spec);
        const st = this.ensure(bm);
        const eff = {
            name: `${shownAs}·${spec.label || spec.stat}`,
            type: spec.channel,
            stat: spec.stat,
            valueType: spec.valueType || 'percentage',
            power,
            // buff / debuff 的 duration 只作面板展示，引擎匹配不到 timing 不会动它；
            // poison / regen 的 duration 是真会被 processCharacterEffects 递减的那一份
            duration: rounds,
            triggerTiming: isDot ? 'turn_start' : TacticCatalog.FIELD_EFFECT_TIMING,
            priority: 0,
            fieldEffect: true,
        };
        // 只有 buff / debuff 记绝对回合。poison / regen 不记——sweep 会因为拿不到
        // 这个字段而跳过它们，让引擎自己按 duration 收，两种口径各行其道
        if (!isDot) {
            eff.fieldEffectUntil = (Number(bm.currentRound) || 0) + rounds;
        }
        const context = {
            battleManager: bm,
            transferableExternal: spec.channel === 'debuff' || spec.channel === 'poison',
            sourceHero: caster,
            sourceLabel: `${caster.name}的「${shownAs}」`,
            sourceKind: '施加效果',
        };
        const deliveries = EffectTransferManager.planEffectDeliveries(bm, target, eff, context);
        let primary = null;
        let anyApplied = false;
        deliveries.forEach(delivery => {
            const localSpec = {
                ...spec,
                channel: delivery.effect.type,
                stat: delivery.effect.stat,
                valueType: delivery.effect.valueType,
            };
            const localPower = Number(delivery.effect.power) || 0;
            const blocker = this.blockedBy(delivery.hero, localSpec, localPower, bm);
            let result;
            if (localPower <= 0) {
                result = { ok: false, power: 0, reason: 'zero' };
            } else if (blocker) {
                result = { ok: false, power: localPower, reason: 'blocked' };
            } else {
                const same = this.sameEntryOn(delivery.hero, localSpec);
                if (same) delivery.hero.effects = delivery.hero.effects.filter(e => e !== same);
                st.seq += 1;
                delivery.effect.fieldEffect = true;
                delivery.effect.fieldEffectId = `fe-${st.seq}`;
                delivery.hero.effects = delivery.hero.effects || [];
                delivery.hero.effects.push(delivery.effect);
                result = { ok: true, applied: true, power: localPower };
                anyApplied = true;
            }
            if (delivery.primary) primary = result;
            EffectTransferManager.noteEffectDelivery(bm, target, delivery, result, context);
        });
        return anyApplied ? { ...(primary || {}), ok: true, power } : (primary || { ok: false, power, reason: 'blocked' });
    },

    /**
     * 到期清理。与 TurnSkipManager.sweep / MindDepriveManager.sweep 同一条规则、
     * 同一个调用点：**必须在 currentRound 自增之后**，判据是 until < currentRound。
     *
     * 显式要求 fieldEffectUntil 是有限数——没有这个字段的是 poison / regen，
     * 它们由引擎按 duration 递减收走，这里一条都不能碰。
     */
    sweep(bm) {
        if (!bm || !bm.teamManager) return;
        const round = Number(bm.currentRound) || 0;
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (!TacticResolver.alive(hero)) this.clearNextAttack(bm, hero);
            if (Array.isArray(hero.effects)) {
                hero.effects = hero.effects.filter(e =>
                    !(e && e.fieldEffect
                        && Number.isFinite(Number(e.fieldEffectUntil))
                        && Number(e.fieldEffectUntil) < round));
            }
        });
    },

    // ---------- 拼点 ----------

    /**
     * 会来阻挠的人：有**同大类**能力，或阅读者达到序列6的存活敌人。
     * 昏迷 / 呆滞的排除掉；
     * 因附身离场的不排除。与 EnvironmentManager.rivals 逐字同构。
     * 只有 contest.mode === 'rivals' 的子类会用到。
     */
    rivals(bm, caster) {
        if (!bm || !caster) return [];
        return bm.teamManager.getAllHeroes().filter(h =>
            h !== caster
            && TacticResolver.alive(h)
            && h.teamType !== caster.teamType
            && !TurnSkipManager.pending(h)
            && (this.eligible(h) || ReaderContestAdvantage.qualifiesForRivalPool(h)));
    },

    contestTail(rolls) {
        if (!rolls || !rolls.length) return '（场上没有对抗者）';
        return '（拼点 ' + rolls
            .map(r => `${r.rival.name} ${r.roll.casterScore}:${r.roll.targetScore}`)
            .join('；') + '）';
    },

    /**
     * 整发级拼点。'none' 直接成立；'rivals' 要赢过每一个对抗者。
     * 出手点数取扣费之后的当前值——spend 已经先跑过，所以这里读到的就是扣完的。
     * 'target' 不在这里判，它是逐目标的，见 contestTarget。
     */
    contestAll(bm, caster, cfg) {
        const mode = (cfg.contest && cfg.contest.mode) || 'none';
        if (mode !== 'rivals') return { ok: true, tail: '' };
        const rolls = this.rivals(bm, caster).map(rival => ({
            rival,
            roll: EnemyControlManager.contest(
                caster, rival, 1,
                EnemyControlManager.bestStat(caster),
                EnemyControlManager.bestStat(rival),
            ),
        }));
        return { ok: rolls.every(r => r.roll.win), tail: this.contestTail(rolls) };
    },

    /** 多项取高共用入口：readStat 传入时读取预计扣费后的属性，否则读取当前值。 */
    contestCasterValue(hero, contest, readStat = null) {
        const keys = Array.isArray(contest.casterStats) && contest.casterStats.length
            ? contest.casterStats
            : (contest.casterStat ? [contest.casterStat] : null);
        if (!keys && !readStat) return EnemyControlManager.bestStat(hero);
        const read = readStat || (key =>
            Number(hero?.additionalStats?.[key === '运气' ? key : this.fieldOf(key)]) || 0);
        return Math.max(...(keys || ['活力', '敏捷', '灵性', '理智', '人性', '运气']).map(read));
    },

    /** 逐目标拼点。只有 contest.mode === 'target' 的子类会用到 */
    contestTarget(caster, target, contest) {
        const casterVal = this.contestCasterValue(caster, contest);
        const stats = Array.isArray(contest.targetStats) ? contest.targetStats : null;
        const targetVal = stats
            ? Math.max(...stats.map(k => target.additionalStats?.[this.fieldOf(k)] ?? 0))
            : EnemyControlManager.bestStat(target);
        return EnemyControlManager.contest(
            caster, target, Number(contest.penalty) || 1, casterVal, targetVal,
        );
    },

    // ---------- 发起 ----------

    /** 结果页那一行里「加了多少、持续多久」的那半句 */
    detailOf(spec, power, caster = null) {
        const isDot = spec.channel === 'poison' || spec.channel === 'regen';
        const sign = spec.changeText || ((spec.channel === 'debuff' || spec.channel === 'poison') ? '−' : '+');
        const isPercentage = (spec.valueType || 'percentage') === 'percentage';
        const unit = isPercentage ? '%' : (spec.stat === 'movement' ? ' 格' : ' 点');
        const rounds = this.roundsOf(caster, spec);
        // 两种时效口径的措辞必须分开写，否则玩家会以为 poison 也按绝对回合走
        const dur = isDot
            ? `，目标接下来 ${rounds} 次行动各结算一次`
            : `，持续 ${rounds} 个回合`;
        return `${spec.label || spec.stat} ${sign}${power}${unit}${dur}`;
    },

    /**
     * 出文兜底。六件措辞**全部跟着子类走**（写在 SUBTYPES[...].report 里），
     * 这张表只在子类漏配某一键时顶上，每条子类都写全的话它一次都不会被读到。
     * 它的存在只是为了不让漏配一个键变成整条战术管线抛异常。
     *
     * summary / blocked / zero / tactic 拿到的名字参数都是**已经拼好的一串**：
     * 同幅度的成功、同原因的失败各并成一行，一发 AoE 不该刷屏。
     * contestLost 是唯一的例外，一人一行——它的 tail 是那一次掷骰的点数，
     * 并行合并会把点数丢掉。
     */
    FALLBACK_REPORT: {
        summary: (actor, shown, names, detail) =>
            `✓ ${actor} 使用「${shown}」，${names} 的${detail}`,
        blocked: (actor, shown, names) =>
            `✗ ${names} 身上已有更强的同类效果，「${shown}」未生效`,
        zero: (actor, shown, names) =>
            `✗ ${actor} 的「${shown}」对 ${names} 没有生效：序列差过大，幅度归零`,
        contestLost: (actor, shown, name, tail) =>
            `✗ ${actor} 的「${shown}」没能作用于 ${name}${tail}`,
        suppressed: (actor, shown, tail) =>
            `✗ ${actor} 的「${shown}」被压了下去${tail}`,
        tactic: (actor, shown, names) =>
            `${actor}使用「${shown}」，${names}的效果生效了。`,
    },

    /**
     * 取一条措辞：子类配了就用子类的，没配才回落到 FALLBACK_REPORT。
     * **所有出文都必须走这里**，别处不要再写第二份三元兜底——写散了就会漂移成
     * 「这一句认子类配置、那一句不认」。
     */
    line(cfg, key, ...args) {
        const fn = (cfg && cfg.report && typeof cfg.report[key] === 'function')
            ? cfg.report[key]
            : this.FALLBACK_REPORT[key];
        return fn(...args);
    },

    /**
     * 发起一次。先扣再判、成败都扣；就地结算，**不进仲裁**——目标可能是自己人，
     * 也不存在多人抢同一目标的独占问题，与召唤 / 技能干涉同一处理。
     * @param {Object|null} picked 玩家（或 NPC）点的那个目标，pick 为 none 时传 null
     */
    attempt(bm, caster, subtype, picked, summary, results) {
        const cfg = this.cfgOf(subtype);
        if (!cfg) return;
        if (cfg.targetInterference) return TargetInterferenceManager.attempt(bm, caster, subtype, picked, summary, results);
        const shownAs = this.displayName(caster, subtype);

        // 下一击类效果先挡重复，再扣费。它不写入 hero.effects，也不走数值效果预览。
        if (cfg.nextAttack) {
            if (this.hasNextAttack(bm, caster)) return;
            this.spend(caster, subtype);
            this.markUsed(bm, caster, subtype);
            if (!this.armNextAttack(bm, caster, subtype)) return;
            summary.push(this.line(cfg, 'summary', caster.name, shownAs));
            results.push({
                kind: 'field-effect',
                actor: caster.name,
                subtype,
                shownAs,
                targets: [caster.name],
                buffNames: [caster.name],
                debuffNames: [],
                nextAttack: true,
            });
            return;
        }

        this.spend(caster, subtype);
        this.markUsed(bm, caster, subtype);

        const gate = this.contestAll(bm, caster, cfg);
        if (!gate.ok) {
            summary.push(this.line(cfg, 'suppressed', caster.name, shownAs, gate.tail));
            return;
        }

        const hitNames = [];
        const buffNames = [];
        const debuffNames = [];
        // target 模式按「一次能力 × 一个目标」只拼一次。多效果子类共用该结果，
        // 避免防御与速度各掷一遍而只落下一半；失败提示也只写一次。
        const targetContestRolls = new Map();
        const targetContestLossReported = new Set();
        (cfg.effects || []).forEach(spec => {
            // 合并出文要求先跑完整条 spec 再写：成功按幅度分组（一发 AoE 里同序列的
            // 人拿到的幅度必然相同，逐个报会刷屏），归零与被顶各并成一行。
            // 拼点输的不并——tail 是那一次掷骰的点数，合并就丢了。
            // 代价是同一条 spec 内部的行序从「按目标解析顺序」变成
            // 「成功（幅度降序）→ 拼点输 → 归零 → 被顶」，这是有意接受的
            const byPower = new Map();   // power -> [name]
            const zeroed = [];           // [name]
            const blocked = [];          // [name]
            const lost = [];             // [已成文的整行]

            this.resolveTargets(bm, caster, spec, picked).forEach(target => {
                if (cfg.contest && cfg.contest.mode === 'target'
                    && !(cfg.contest.enemiesOnly && target.teamType === caster.teamType)) {
                    let roll = targetContestRolls.get(target.heroId);
                    if (!roll) {
                        roll = this.contestTarget(caster, target, cfg.contest);
                        targetContestRolls.set(target.heroId, roll);
                    }
                    if (!roll.win) {
                        if (!targetContestLossReported.has(target.heroId)) {
                            targetContestLossReported.add(target.heroId);
                            lost.push(this.line(cfg, 'contestLost', caster.name, shownAs,
                                target.name, EnemyControlManager.contestTail(roll)));
                        }
                        return;
                    }
                }
                const res = this.applyOne(bm, caster, target, spec, shownAs);
                if (res.ok) {
                    if (!byPower.has(res.power)) byPower.set(res.power, []);
                    byPower.get(res.power).push(target.name);
                    if (!hitNames.includes(target.name)) hitNames.push(target.name);
                    // 战报要把强化 / 削弱拆开写。poison 跟 debuff 走，regen 跟 buff 走
                    const sink = (spec.channel === 'debuff' || spec.channel === 'poison')
                        ? debuffNames : buffNames;
                    if (!sink.includes(target.name)) sink.push(target.name);
                } else if (res.reason === 'zero') {
                    zeroed.push(target.name);
                } else {
                    blocked.push(target.name);
                }
            });

            // 幅度从高到低：最强的那一档先映入眼帘
            [...byPower.entries()]
                .sort((a, b) => b[0] - a[0])
                .forEach(([power, names]) => {
                    summary.push(this.line(cfg, 'summary', caster.name, shownAs,
                        names.join('、'), this.detailOf(spec, power, caster)));
                });
            lost.forEach(l => summary.push(l));
            if (zeroed.length) {
                summary.push(this.line(cfg, 'zero', caster.name, shownAs, zeroed.join('、'),
                    spec.label || spec.stat));
            }
            if (blocked.length) {
                summary.push(this.line(cfg, 'blocked', caster.name, shownAs, blocked.join('、'),
                    spec.label || spec.stat));
            }
        });

        // 一个人都没吃到就不进战报：那一次发动在叙事上什么都没发生
        if (hitNames.length) {
            results.push({
                kind: 'field-effect',
                actor: caster.name,
                subtype,
                shownAs,
                targets: hitNames.slice(),
                buffNames: buffNames.slice(),
                debuffNames: debuffNames.slice(),
            });
        }
    },

    // ---------- 玩家侧 ----------

    /** 按钮为什么点不了。返回空串表示可用。不传 subtype 时只查大类级资格 */
    blockedReason(bm, hero, subtype) {
        if (!hero) return '场上没有你可操作的角色。';
        if (!this.eligible(hero)) return `你没有可用的${TacticCatalog.FIELD_EFFECT_ACTION}能力。`;
        if (!subtype) return '';
        if (this.quotaLeft(bm, hero, subtype) <= 0) {
            return '你本场已经用完了这条能力的次数。';
        }
        if (this.cfgOf(subtype)?.nextAttack && this.hasNextAttack(bm, hero)) {
            return '灵肉之刃已经蓄势，必须在下一次攻击消费后才能再次发动。';
        }
        if (!this.hasStat(hero, subtype)) {
            return subtype === '灵肉之刃'
                ? '当前灵性为0，无法发动“灵肉之刃”。'
                : `当前${this.statKeyOf(subtype)}为 0，无法${TacticCatalog.FIELD_EFFECT_ACTION}。`;
        }
        if (this.needsPick(subtype) && !this.pickPool(bm, hero, subtype).length) {
            return '场上没有可以指定的目标。';
        }
        return '';
    },

    /**
     * 逐人预览：这一发落地后每个人会吃到什么。参数区与 NPC 软闸门共用，只算不写。
     * blocked 为真表示会被目标身上已有的同组条目挡住——参数区据此标注
     * 「本次不会生效」，软闸门据此跳过这个目标。
     * @returns {Array<{hero, spec, power, blocked, blockedBy}>}
     */
    previewFor(bm, caster, subtype, picked) {
        const cfg = this.cfgOf(subtype);
        if (!bm || !caster || !cfg) return [];
        const out = [];
        (cfg.effects || []).forEach(spec => {
            this.resolveTargets(bm, caster, spec, picked).forEach(hero => {
                const power = this.powerOf(caster, hero, spec);
                const blockedBy = this.blockedBy(hero, spec, power, bm);
                out.push({ hero, spec, power, blocked: !!blockedBy, blockedBy });
            });
        });
        return out;
    },

    /** 这一发有没有意义：至少一个人能吃到非零幅度、且没被更强的同组条目挡住 */
    worthwhile(bm, caster, subtype, picked) {
        const cfg = this.cfgOf(subtype);
        if (cfg && cfg.nextAttack) return !this.hasNextAttack(bm, caster);
        return this.previewFor(bm, caster, subtype, picked)
            .some(p => p.power > 0 && !p.blocked);
    },

    // ---------- NPC 拼点可行性预判 ----------
    // 只过滤数学上必败的方案，不估算真实胜率。所有数值必须镜像「先扣费、再拼点」：
    // 扣费项与出手项相同才从出手值里减；不同则不能误伤另一项。
    statAfterPlannedCost(hero, subtype, key) {
        const field = key === '运气' ? '运气' : this.fieldOf(key);
        const raw = Number(hero?.additionalStats?.[field]) || 0;
        if (key !== this.statKeyOf(subtype)) return raw;
        return Math.max(0, raw - this.costOf(hero, subtype));
    },

    bestStatAfterPlannedCost(hero, subtype) {
        return Math.max(
            ...['活力', '敏捷', '灵性', '理智', '人性', '运气']
                .map(key => this.statAfterPlannedCost(hero, subtype, key)),
        );
    },

    contestCasterStatAfterCost(hero, subtype) {
        const contest = this.cfgOf(subtype)?.contest || {};
        return this.contestCasterValue(hero, contest,
            key => this.statAfterPlannedCost(hero, subtype, key));
    },

    contestTargetStat(target, contest) {
        const keys = Array.isArray(contest?.targetStats) ? contest.targetStats : null;
        if (!keys) return EnemyControlManager.bestStat(target);
        const value = Math.max(...keys.map(key =>
            Number(target?.additionalStats?.[this.fieldOf(key)]) || 0));
        return Number.isFinite(value) ? value : EnemyControlManager.bestStat(target);
    },

    canPossiblyWinTarget(caster, target, subtype) {
        const contest = this.cfgOf(subtype)?.contest || {};
        if (contest.mode !== 'target') return true;
        if (contest.enemiesOnly && target.teamType === caster.teamType) return true;
        return EnemyControlManager.canPossiblyWin(
            caster, target, Number(contest.penalty) || 1,
            this.contestCasterStatAfterCost(caster, subtype),
            this.contestTargetStat(target, contest),
        );
    },

    canPossiblyWinAllRivals(bm, caster, subtype) {
        const contest = this.cfgOf(subtype)?.contest || {};
        if (contest.mode !== 'rivals') return true;
        const after = this.bestStatAfterPlannedCost(caster, subtype);
        return this.rivals(bm, caster).every(rival =>
            EnemyControlManager.canPossiblyWin(
                caster, rival, 1, after, EnemyControlManager.bestStat(rival),
            ));
    },

    /**
     * NPC 这一发在实际收益结构下是否还有赢面：target 模式逐目标独立落地，
     * 至少一名「有效果且可能赢」即可；rivals 模式整发要求全胜，必须人人可赢。
     */
    npcContestWorthwhile(bm, caster, subtype, picked) {
        const mode = this.cfgOf(subtype)?.contest?.mode || 'none';
        if (mode === 'none') return true;
        if (mode === 'rivals') return this.canPossiblyWinAllRivals(bm, caster, subtype);

        const targets = new Map();
        this.previewFor(bm, caster, subtype, picked)
            .filter(row => row.power > 0 && !row.blocked)
            .forEach(row => targets.set(row.hero.heroId, row.hero));
        return [...targets.values()].some(target =>
            this.canPossiblyWinTarget(caster, target, subtype));
    },

    npcWorthwhile(bm, caster, subtype, picked) {
        if (this.cfgOf(subtype)?.targetInterference) {
            return TargetInterferenceManager.npcWorthwhile(bm, caster, subtype, picked);
        }
        return this.worthwhile(bm, caster, subtype, picked)
            && this.npcContestWorthwhile(bm, caster, subtype, picked);
    },

    // ---------- NPC ----------

    /**
     * 随机挑一发。**软闸门就在这里**：只挑「真的能落到实处」的子类与目标，
     * 全场都已有不弱于它的同组条目时返回 null，那一轮就当没有这个选项——
     * 免得 NPC 白烧一个动作位和一份灵性。
     * @returns {{subtype: string, target: Object|null}|null}
     */
    npcPlan(bm, hero, forcedSubtype = '') {
        const subs = this.availableSubtypes(bm, hero)
            .filter(s => (!forcedSubtype || s === forcedSubtype) && this.hasStat(hero, s));
        for (const sub of TacticResolver.shuffle(subs)) {
            if (!this.needsPick(sub)) {
                if (this.npcWorthwhile(bm, hero, sub, null)) return { subtype: sub, target: null };
                continue;
            }
            const pool = TacticResolver.shuffle(this.pickPool(bm, hero, sub))
                .filter(t => this.npcWorthwhile(bm, hero, sub, t));
            if (pool.length) return { subtype: sub, target: pool[0] };
        }
        return null;
    },

    /**
     * 这一轮要不要掷骰。闸门与 npcPlan 共用同一套判据——能不能挑出一发有意义的，
     * 就是「值不值得掷」。多算一遍换掉「掷中了却挑不出方案、白过一轮」，
     * 取舍与 EnvironmentManager.npcShouldTry 一致。
     */
    npcShouldTry(bm, hero) {
        if (!this.canUse(bm, hero)) return false;
        return !!this.npcPlan(bm, hero);
    },
};
    const resolvedEffects = {
      isSixDimStat: stat => ['活力', '敏捷', '灵性', '理智', '人性', '运气'].includes(stat),
      storeResolvedEffect(hero, effectInstance) {
        if (!hero.effects) hero.effects = [];
        const existingEffectIndex = hero.effects.findIndex(
            e => e.name === effectInstance.name && e.duration > 0
        );
        if (existingEffectIndex !== -1) {
            const existingEffect = hero.effects[existingEffectIndex];
            const newPower = effectInstance.power ?? 0;
            const oldPower = existingEffect.power ?? 0;
            const newDuration = effectInstance.duration;
            const oldDuration = existingEffect.duration;
            if (newPower > oldPower) {
                hero.effects[existingEffectIndex] = effectInstance;
                if (this.isSixDimStat(effectInstance.stat)) AttributeCalculator.recalculateAllSixDimStats(hero);
                return { replaced: true, reason: 'stronger' };
            }
            if (newPower === oldPower && newDuration > oldDuration) {
                existingEffect.duration = newDuration;
                // poison 合并后无法再区分每一跳的来源；只要这一份已经在施加期完成过
                // 效果传递，就统一标记为已分配，避免后续跳伤重复传播。
                if (effectInstance.effectTransferResolved) existingEffect.effectTransferResolved = true;
                return { refreshed: true, reason: 'duration_refresh' };
            }
            return { rejected: true, reason: 'weaker' };
        }
        hero.effects.push(effectInstance);
        if (this.isSixDimStat(effectInstance.stat)) AttributeCalculator.recalculateAllSixDimStats(hero);
        return { applied: true };
    }

    /**
     * 应用效果到角色
     * @param {Hero} hero - 目标角色
     * @param {Object} effect - 效果对象
     */
    };
    return { field: FieldEffectManager, interference: TargetInterferenceManager,
      transfer: EffectTransferManager, bribery: BriberyManager,
      tempAllegiance: TempAllegianceManager, resolvedEffects,
      advantage: ContestAdvantage, reader: ReaderContestAdvantage };
  }
  const api = { create, averages: () => structuredClone(averages),
    status: () => ({ mounted: true }), dispose() { root.contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  root.contract.initializeGlobal(KEY, api);
})();
