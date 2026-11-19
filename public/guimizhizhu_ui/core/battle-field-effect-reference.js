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
const mythicConfig = { MYTHIC_RANK_GATE: 4,       // 高于序列 5（rank ≤ 4）才有这个按钮
    MYTHIC_HIGH_RANK: 2,       // 序列 2 及以上走高档
    MYTHIC_TIERS: {
        low: { rounds: 2, pct: 50, corruption: 25 },
        high: { rounds: 4, pct: 75, corruption: 10 },
    },
    MYTHIC_CD_DAYS: 10,        // 玩家侧冷却，只看天不看时分
    MYTHIC_NPC_BASE: 1,        // NPC 开启概率 = BASE + STEP × X，封顶 CAP
    MYTHIC_NPC_STEP: 30,
    MYTHIC_NPC_CAP: 100, };
  const exileConfig = { EXILE_ACTION: '放逐',
    EXILE_APPRENTICE: '放逐',          // 子类显示名，与大类同名：战报写「以「放逐」将…」
    EXILE_APPRENTICE_RANK_GATE: 4,    // 学徒：rank ≤ 4 解锁
    EXILE_APPRENTICE_TITLE: '诡秘之主', // 称号兜底，与秘偶化 / 召唤 / 回溯 / 偷窃想法认的是同一个字串
    EXILE_APPRENTICE_ROUNDS: 2,       // 离场回合数
    EXILE_ARBITER: '宣判：放逐',
    EXILE_ARBITER_RANK_GATE: 4,       // 仲裁人：rank ≤ 4 解锁
    EXILE_ARBITER_TITLE: '失序者',    // 称号兜底
    EXILE_ARBITER_ROUNDS: 2,
    EXILE_ARBITER_POISON_NAME: '虚空侵蚀',
    EXILE_NPC_CHANCE: 30,             // NPC 每个战术阶段发起放逐的独立骰
    // 又单开一份比例：操控四条 10%、短控与技能干涉 5%、心智剥夺与偷窃想法 8%、规则修改 8%。
    // 放逐与操控四条同为 10%，但仍不复用那个常量——调一个不该改坏另一个
    EXILE_RATIO: 0.10,
    EXILE_CASTER_STAT: '灵性',
    // 放逐子类的附带 poison。伤害按**放逐者**序列的平均活力算固定值，与目标上限无关；
    // 学徒的时空乱流与仲裁人的虚空侵蚀共用这一数值口径
    EXILE_POISON_NAME: '处于时空乱流中',
    EXILE_POISON_RATIO: 0.02, };
  const activeLeaveConfig = { ACTIVE_LEAVE_ACTION: '主动离场',
    ACTIVE_LEAVE_DIMENSION: '维度穿越',
    ACTIVE_LEAVE_HISTORY: '藏入历史迷雾',
    ACTIVE_LEAVE_NPC_CHANCE: 50,
    ACTIVE_LEAVE_UPKEEP_RATIO: 0.01, };
  const rewindConfig = {
REWIND_ACTION: '回溯',
    REWIND_BORROW: '借取过去的力量',
    // 与召唤的历史投影同源于占卜家序列 3 的「历史投影」，但门槛单开一份：
    // 共用 SUMMON_PROJECTION_RANK_GATE 会在调其中一个时改坏另一个
    REWIND_BORROW_RANK_GATE: 3,
    REWIND_BORROW_TITLE: '诡秘之主',  // 称号兜底，与秘偶化、召唤认的是同一个字串
    REWIND_BORROW_MAX_PER_CASTER: 1, // 每个施法者本场一次。必成，所以没有「失败不占名额」之说
    REWIND_TIME: '时间权柄',
    // 偷盗者序列 1。门槛单开一份，不复用 REWIND_BORROW_RANK_GATE
    REWIND_TIME_RANK_GATE: 1,
    REWIND_TIME_TITLE: '诡秘之主',  // 与占卜家那条同名：支柱两边都开，次数分账
    REWIND_TIME_MAX_PER_CASTER: 1,
    REWIND_NPC_HP_RATIO: 0.3,        // NPC 触发线：当前活力 / 活力 低于它就必然回溯
  };
  const extraConfig = {
EXTRA_ACTION_ACTION: '额外行动',
    EXTRA_BLINK: '闪现（虚影分身）',
    EXTRA_BLINK_RANK_GATE: 4,           // 学徒：rank ≤ 4 解锁
    EXTRA_BLINK_TITLE: '诡秘之主',       // 称号兜底，与秘偶化 / 召唤 / 回溯 / 偷窃想法 / 放逐认的是同一个字串
    // 又单开一份比例：操控四条与放逐 10%、短控与技能干涉 5%、心智剥夺 / 偷窃想法 / 规则修改 8%。
    // 与放逐同为 10%，但仍不复用 EXILE_RATIO——调一个不该改坏另一个
    EXTRA_ACTION_RATIO: 0.10,
    EXTRA_ACTION_CASTER_STAT: '灵性',
  };
  const hardConfig = {
STEAL_THOUGHT: '偷窃想法',
    STEAL_THOUGHT_RANK_GATE: 5,          // 偷盗者：rank ≤ 5 解锁
    STEAL_THOUGHT_TITLE: '诡秘之主',
    STEAL_THOUGHT_NPC_CHANCE: 30,        // NPC 每个战术阶段发起偷窃想法的独立骰
    // 单开一份比例：操控四条 10%、短控与技能干涉 5%、心智剥夺 8%。
    // 单体拼赢即硬控，消耗对齐心智剥夺，但不复用那个常量——调其中一个不该改坏另一个
    STEAL_THOUGHT_RATIO: 0.08,
    STEAL_THOUGHT_CASTER_STAT: '灵性',
    STEAL_THOUGHT_TARGET_STATS: ['灵性', '人性', '理智'],
    STEAL_THOUGHT_STUN_REASON: '呆滞',

    // ---------- 恍惚之歌（单体硬控） ----------
    // 同属 HardControlManager，结构与偷窃想法逐字同构：单体点人、
    // 不限距离、无劣势、拼赢即硬控、无次数上限。硬控本身复用 TurnSkipManager，
    // 理由单独开「恍惚」，不复用「昏迷」「呆滞」——三者窗口相同但语义不同。
    // 称号兜底是「上帝」：它是多途径共有的支柱条目，命中后与恐惧之音、观众那几条
    // 同时开，次数互不占用，口径与现有「上帝同时开观众与水手」一致。
    // 下面四项（比例 / 出手项 / 目标三项 / 独立骰）现在与偷窃想法的数字完全相同，
    // 但**单开一份**：调其中一个不该改坏另一个，纪律同「偷窃想法不复用
    // MIND_DEPRIVE_RATIO」那条。
    TRANCE_SONG: '恍惚之歌',
    TRANCE_SONG_RANK_GATE: 5,            // 水手：rank ≤ 5 解锁
    TRANCE_SONG_TITLE: '上帝',
    TRANCE_SONG_NPC_CHANCE: 30,          // NPC 每个战术阶段发起恍惚之歌的独立骰
    TRANCE_SONG_RATIO: 0.08,
    TRANCE_SONG_CASTER_STAT: '灵性',
    TRANCE_SONG_TARGET_STATS: ['灵性', '人性', '理智'],
    TRANCE_SONG_STUN_REASON: '恍惚',
    CANON_SLEEP: '神秘再现·睡美人',
    CANON_SLEEP_RATIO: 0.10,
    CANON_SLEEP_CASTER_STAT: '灵性',
    CANON_SLEEP_TARGET_STATS: ['灵性', '理智', '人性'],
    CANON_SLEEP_STUN_REASON: '沉睡',

    // ---------- 精神刺穿（仲裁人序列 7～5 · 两格单体硬控） ----------
    // 仍走 HardControlManager 的标准模板：先扣费、公平拼点、成功后跳过下一次行动。
    // 唯一新增的结构差异是两格射程；格数沿用棋盘统一的切比雪夫距离，斜角算一步。
    MENTAL_PIERCE: '精神刺穿',
    MENTAL_PIERCE_RANK_GATE: 7,
    MENTAL_PIERCE_RANK_AT_LEAST: 5,
    MENTAL_PIERCE_RANGE: 2,
    MENTAL_PIERCE_NPC_CHANCE: 30,
    MENTAL_PIERCE_RATIO: 0.08,
    MENTAL_PIERCE_CASTER_STAT: '灵性',
    MENTAL_PIERCE_TARGET_STATS: ['灵性', '人性', '理智'],
    MENTAL_PIERCE_STUN_REASON: '精神剧痛',

    // ---------- 威压震慑（仲裁人序列 4 起 · 无限距离单体硬控） ----------
    INTIMIDATION_STUN: '威压震慑',
    INTIMIDATION_STUN_RANK_GATE: 4,
    INTIMIDATION_STUN_TITLE: '失序者',
    INTIMIDATION_STUN_NPC_CHANCE: 30,
    INTIMIDATION_STUN_RATIO: 0.08,
    INTIMIDATION_STUN_COST_STAT: '灵性',
    INTIMIDATION_STUN_CASTER_STATS: ['灵性', '人性'],
    INTIMIDATION_STUN_TARGET_STATS: ['灵性', '人性', '理智'],
    INTIMIDATION_STUN_REASON: '震慑',
  };
  const mindConfig = {
MIND_DEPRIVE: '心智剥夺',
    MIND_DEPRIVE_RANK_GATE: 4,     // 观众：rank ≤ 4 解锁
    MIND_DEPRIVE_RADIUS: 2,        // 以施法者为心的切比雪夫半径
    MIND_DEPRIVE_NPC_CHANCE: 30,   // NPC 每个战术阶段发起心智剥夺的独立骰
    // 又单开一份比例：操控四条 10%、短控与技能干涉 5%，这里 8%。
    // 范围命中只扣一次、不按目标数叠加——否则卷进四个人就是 32%，实际不可用
    MIND_DEPRIVE_RATIO: 0.08,
    // 出手项固定当前人性：与同途径的「心灵」权柄同口径（那条走 spendHumanity）
    MIND_DEPRIVE_CASTER_STAT: '人性',
    // 目标方点数只比这三项，与短控 / 夺舍与附身同口径
    MIND_DEPRIVE_TARGET_STATS: ['灵性', '人性', '理智'],
    MIND_DEPRIVE_TREMBLE_PCT: 20,   // 颤栗档的攻 / 防削弱幅度
    MIND_DEPRIVE_FLEE_KIND: '逃离', // 奔逃档走 ForcedMoveManager 的哪一类
    MIND_DEPRIVE_STUN_REASON: '昏迷', // 昏迷档走 TurnSkipManager 的哪一类
    /**
     * 五档结果与权重，顺序抄自描述原文「颤栗、奔逃、瘫软、昏迷或狂热追随」的强度递增。
     * weight 合计必须是 100：rollOutcome 用一次 Math.random() * 100 落区间，
     * 刻意不做归一化，这样「某档几个点」直接可读。加档要连带调别的 weight。
     */
    MIND_DEPRIVE_OUTCOMES: [
        { key: '颤栗', weight: 30 },
        { key: '奔逃', weight: 25 },
        { key: '瘫软', weight: 20 },
        { key: '昏迷', weight: 15 },
        { key: '狂热追随', weight: 10 },
    ],
    // 狂热追随撞车时降到哪一档。一次范围命中最多只能有一个人真倒戈：
    // TempAllegianceManager 的不变式是同一 casterId 至多一条过程
    MIND_DEPRIVE_FALLBACK: '瘫软',
  };
  const tempConfig = {
TEMP_HIERARCHY: '「阶层」权柄',
    TEMP_CHARM: '魅力权柄',
    TEMP_FEAR: '恐惧之音',
    TEMP_LOVE: '单向爱恋诱导',
    TEMP_PROFANE_FALL: '秽语·堕落',
    TEMP_HIERARCHY_RANK_GATE: 3,   // 律师：rank ≤ 3 解锁
    TEMP_CHARM_RANK_GATE: 0,       // 刺客：rank ≤ 0 解锁
    TEMP_FEAR_RANK_GATE: 2,        // 水手：rank ≤ 2 解锁
    TEMP_LOVE_RANK_GATE: 2,        // 吝啬鬼：rank ≤ 2 解锁
    TEMP_PROFANE_FALL_RANK_GATE: 2, // 秘祈人：rank ≤ 2 解锁
    TEMP_PROFANE_FALL_TITLE: '上帝',
    TEMP_NPC_CHANCE: 30,           // NPC 每个战术阶段发起短控的独立骰，各子类各掷一次
    // 单开一份比例：干涉的 COST_RATIO 也是 5% 但走的是另一套语义，
    // 操控四条是 10%。共用任何一个常量都会在调参时改坏别人
    TEMP_ALLEGIANCE_RATIO: 0.05,
    // 短控出手项的候选：当前人性与当前灵性较大者，相等取灵性（与驯化同约定）
    TEMP_CASTER_STATS: ['灵性', '人性'],
    // 目标方点数只比这三项，与夺舍与附身同口径
    TEMP_TARGET_STATS: ['灵性', '人性', '理智'],
  };
  const controlConfig = {
    MARIONETTE: '秘偶化', CONQUEST: '征服', MIND: '「心灵」权柄', ENSLAVE: '奴役', TAME: '驯化',
    CONTEST_ROLL_MIN: 0.8, CONTEST_ROLL_MAX: 1.2,
CONTROL_SPIRIT_RATIO: 0.10,
    CONTROL_NPC_CHANCE: 30,    // NPC 每个战术阶段发起秘偶化 / 征服 / 「心灵」权柄 / 奴役 / 驯化的独立骰
    MARIONETTE_RANK_GATE: 5,   // 占卜家：rank ≤ 5 解锁
    MARIONETTE_FREE_RANK: 4,   // rank ≤ 4 起无距离限制，之上只能打身边一格
    CONQUEST_RANK_GATE: 1,     // 猎人：rank ≤ 1 解锁
    MIND_RANK_GATE: 1,         // 观众：rank ≤ 1 解锁（部分心灵权柄起）
    ENSLAVE_RANK_GATE: 1,      // 收尸人：rank ≤ 1 解锁（含序列 0 死神）
    TAME_RANK_GATE: 1,         // 药师：rank ≤ 1 解锁
    CONTROL_PENALTY: 0.5,      // 征服/「心灵」权柄/驯化恒定劣势；奴役默认同值，同途径下位可豁免；秘偶方或目标上一轮受过伤也吃这个
    MARIONETTE_MAX_STACKS: 3,  // 第 3 次成功即转化完成
    MARIONETTE_PCT: [0, 40, 80],   // 目标按层数吃的攻/防/速/移动力减益
    MARIONETTE_CASTER_PCT: 20,     // 施法者的防/速减益，不随层数叠加
  };
  const possessionConfig = { POSSESS_PRISONER: '怨魂附身',
    POSSESS_APPRENTICE: '夺舍与附身',
    // 附身期间的两个动作。都占动作位，所以附身中的人本轮不会进阻止名单
    POSSESS_CONTINUE: '继续附身',
    POSSESS_RELEASE: '解除附身',
    POSSESS_PRISONER_RANK_GATE: 5,    // 囚犯：rank ≤ 5 解锁（怨魂附身）
    POSSESS_APPRENTICE_RANK_GATE: 2,  // 入门者：rank ≤ 2 解锁（夺舍与附身）
    POSSESS_NPC_CHANCE: 30,    // NPC 每个战术阶段发起附身的独立骰，两子类各掷一次
    // 夺舍与附身的候选项。顺序无关，取当前值最大的一项；相等时按本数组靠前者
    POSSESS_APPRENTICE_STATS: ['灵性', '人性', '理智'], };
  const ruleConfig = { RULE_CHANGE_ACTION: '规则修改',
    RULE_CHANGE_SLOT_RATIO: 0.1,     // 栏位上限 = 开场总人数 × 它，向下取整
    RULE_CHANGE_SLOT_MIN: 1,         // 保底。4v4 这种常规规模全靠它兜出唯一的那个栏位
    RULE_CHANGE_SINGLE_BASE: 40,     // 单体：BASE − STEP × (施法者 rank − 目标 rank)
    RULE_CHANGE_SINGLE_STEP: 15,
    RULE_CHANGE_GROUP_PCT: 20,       // 全体：不看序列差，恒定值
    // 钳制两端。下限挡的是「序列差把值压到 0 以下反号成增益」；上限挡的是
    // 「打远低于自己的人时算出 145%」——攻防速超过 100% 只会归零，
    // 伤害通道超过 100% 则等于永久锁死对方的输出，都不该是一发战术的效果
    RULE_CHANGE_MIN_PCT: 5,
    RULE_CHANGE_MAX_PCT: 100,
    // 又单开一份比例：操控四条 10%、短控与技能干涉 5%、心智剥夺与偷窃想法 8%。
    // 与偷窃想法同为偷盗者系，比例对齐，但仍不复用那个常量——调一个不该改坏另一个
    RULE_CHANGE_RATIO: 0.08,
    RULE_CHANGE_CASTER_STAT: '灵性',
    RULE_CHANGE_NPC_CHANCE: 30,      // NPC 每个战术阶段发起规则修改的独立骰
    // 四类作用范围。自己与敌军单体走单体档，两个「全体」一律 GROUP_PCT
    RULE_CHANGE_SELF: '自己',
    RULE_CHANGE_ALLIES: '友军全体',
    RULE_CHANGE_FOE: '敌军单体',
    RULE_CHANGE_FOES: '敌军全体',
    RULE_CHANGE_SCOPES: ['自己', '友军全体', '敌军单体', '敌军全体'],
    /**
     * 七个可选参数 → 效果通道。dir 是这一项**天然的方向**，good 给友方、bad 给敌方。
     * 攻击 / 防御 / 速度三项的正负由 type 决定，所以正反各出一条；
     * 四条伤害通道的正负只看 stat 名里的 Increase / Decrease，type 完全不参与数值
     *（见 DamageCalculator.calculateDamageModifier：increase 无论 buff 还是 debuff 都是加），
     * 填 type 只为各处 UI 上色，所以它们各自只有一个方向——不存在「负面的造成伤害加」。
     * 键保留为内部身份，label / sign / report 只服务用户可见文案。
     */
    RULE_CHANGE_PARAMS: {
        攻击提升: { stat: 'attack', type: 'buff', dir: 'good', label: '攻击提升', sign: '+', report: who => `${who}的攻击得到提升` },
        防御提升: { stat: 'defense', type: 'buff', dir: 'good', label: '防御提升', sign: '+', report: who => `${who}的防御得到提升` },
        速度提升: { stat: 'speed', type: 'buff', dir: 'good', label: '速度提升', sign: '+', report: who => `${who}的速度得到提升` },
        造成伤害加: { stat: 'damageDealtIncrease', type: 'buff', dir: 'good', label: '造成伤害提升', sign: '+', report: who => `${who}造成的伤害得到提升` },
        受到伤害减: { stat: 'damageTakenDecrease', type: 'buff', dir: 'good', label: '受到伤害降低', sign: '−', report: who => `${who}受到的伤害降低` },
        攻击削弱: { stat: 'attack', type: 'debuff', dir: 'bad', label: '攻击削弱', sign: '−', report: who => `${who}的攻击遭到削弱` },
        防御削弱: { stat: 'defense', type: 'debuff', dir: 'bad', label: '防御削弱', sign: '−', report: who => `${who}的防御遭到削弱` },
        速度削弱: { stat: 'speed', type: 'debuff', dir: 'bad', label: '速度削弱', sign: '−', report: who => `${who}的速度遭到削弱` },
        造成伤害减: { stat: 'damageDealtDecrease', type: 'debuff', dir: 'bad', label: '造成伤害降低', sign: '−', report: who => `${who}造成的伤害降低` },
        受到伤害加: { stat: 'damageTakenIncrease', type: 'debuff', dir: 'bad', label: '受到伤害提升', sign: '+', report: who => `${who}受到的伤害增加` },
    },

    /** 按方向取可选参数名。good 给自己与友军，bad 给敌人 */
    ruleChangeParams(dir) {
        return Object.keys(this.RULE_CHANGE_PARAMS)
            .filter(k => this.RULE_CHANGE_PARAMS[k].dir === dir);
    },

    ruleChangeParamLabel(param) {
        return this.RULE_CHANGE_PARAMS[param]?.label || String(param || '');
    },

    ruleChangeParamSign(param) {
        const meta = this.RULE_CHANGE_PARAMS[param];
        return meta?.sign || (meta?.dir === 'bad' ? '−' : '+');
    },

    ruleChangeReportText(who, param) {
        const meta = this.RULE_CHANGE_PARAMS[param];
        return typeof meta?.report === 'function'
            ? meta.report(who)
            : `${who}的${this.ruleChangeParamLabel(param)}`;
    }, };
  const environmentConfig = { ENV_ACTION: '改变环境',
    // 幅度 = clamp0(BASE + (目标 rank − 制造者 rank) × STEP)，单位 %。
    // 序列数字越小越强，所以打比自己弱的人差值为正、效果放大；打更强的人衰减到 0。
    // **刻意不设 MAX**：现有子类的极限是支柱（−2）打序列 9，20 + 55 = 75%，
    // 天然撞不到 100，不必为一个到不了的边界引一个常量。日后加 BASE 更高的子类要重估。
    // 注意这三个常量与「天然撞不到 100」那句结论**只覆盖人工环境**（EnvironmentManager
    // .powerOf 那条路）。自然环境走的是另一套 selfRank 公式，单栏就能给到 120%，
    // 而且四栏相加同样不封顶——那边的口径见 ENV_SELF_ZERO_RANK
    ENV_BASE: 20,
    ENV_STEP: 5,
    ENV_MIN_PCT: 0,
    // 自然环境的幅度 = clamp0((ENV_SELF_ZERO_RANK − 本人 rank) × per)，
    // 移动力 = floor((ENV_SELF_ZERO_RANK − 本人 rank) / div)，都只看**吃效果的人自己**。
    // 这个 10 不是随手取的：它正是 parseSequenceRank 给「普通人」的那个数，
    // 于是普通人一律算出 0，不必再为「凡人不该吃到非凡加成」另设一道闸门。
    // 支柱 −2 与旧日 −1 由此天然拿到最高档（12 与 11 倍 per）
    ENV_SELF_ZERO_RANK: 10,
    // 又单开一份比例：操控四条 10%、短控与技能干涉 5%、心智剥夺与偷窃想法 8%、
    // 规则修改 8%。这一套是 5%，与技能干涉同档但仍不复用 spiritCost——
    // 调其中一个不该改坏另一个
    // 比例三条子类通用；扣**哪一项**才是子类的自由度，见 SUBTYPES 的 cost
    ENV_RATIO: 0.05,
    // 缺省消耗项。子类没写 cost 时回落到它（无暗领域、改变天气）；
    // 梦境迷宫写了 cost: { stat: '人性' }，走不到这里
    ENV_CASTER_STAT: '灵性',
    ENV_NPC_CHANCE: 30,      // NPC 每个战术阶段发起改变环境的独立骰
    // 四个栏位。每类只有一栏，固定不增不减
    ENV_KIND_MYSTIC: '神秘学环境',
    ENV_KIND_LAND: '地貌',
    ENV_KIND_WEATHER: '天气',
    ENV_KIND_TIME: '时间',
    ENV_KINDS: ['神秘学环境', '地貌', '天气', '时间'], };
  const summonConfig = { SUMMON_ACTION: '召唤',
    SUMMON_PROJECTION: '历史投影',
    SUMMON_PROJECTION_RANK_GATE: 3,       // 占卜家：rank ≤ 3 解锁
    SUMMON_PROJECTION_TITLE: '诡秘之主',  // 称号兜底，与秘偶化认的是同一个字串
    // 好感度门槛与归一化跨度。好感度 schema 钳在 ±200，所以 120→200 正好是正区间顶部四成
    SUMMON_MIN_AFFINITY: 120,             // 严格大于
    SUMMON_AFFINITY_SPAN: 80,
    SUMMON_MAX_PER_CASTER: 3,             // 每个施法者本场累计成功上限。失败不占名额，消散后可再召同一人
    // 下面三条曲线共用 t = clamp((好感度 - MIN) / SPAN, 0, 1)
    // 亲密系数乘在施法者点数上，于是「好感度越高越召得动高位格的人」
    SUMMON_BOND_BASE: 0.60,
    SUMMON_BOND_SPAN: 0.60,
    // 强度比乘在本体六项上限上。BASE + SPAN = 0.95 < 1，所以投影永远弱于本体一截
    SUMMON_POWER_BASE: 0.55,
    SUMMON_POWER_SPAN: 0.40,
    // 维持回合 = BASE + round(SPAN × t)，阈值自然落在好感度 140 与 180
    SUMMON_ROUNDS_BASE: 2,
    SUMMON_ROUNDS_SPAN: 2,
    // 目标点数与强度缩放共用这一份。取的是**上限**六项而不是当前值：
    // 召唤的是历史上的他，跟本体现在伤没伤无关。用当前值会出现
    // 「趁本体虚弱更好召」这种叙事上说不通的结果
    SUMMON_STAT_KEYS: ['活力', '敏捷', '灵性', '理智', '人性', '运气'],
    // 消耗刻意不单开比例：与技能干涉同为平均灵性 5%，直接复用 spiritCost

    // NPC 侧的目标池不是人物关系列表，而是「随机序列名 + 现有属性构建算法」现造的候选。
    // 好感度区间刻意复用上面那两条常量：每个候选各自随机一个 (MIN, MIN+SPAN] 的好感度，
    // 于是三条曲线一行都不用改，梯度也还在。
    SUMMON_NPC_CHANCE: 30,        // NPC 每个战术阶段发起召唤的独立骰
    SUMMON_NPC_PER_TIER: 3,       // 同阶与低阶各现造几个候选

    // ---------- 召唤 · 快速炼成（通识者序列 4） ----------
    // 制造没有对抗目标，所以不拼点、必定成功；仍沿用召唤大类的平均灵性 5% 消耗。
    // 成品六维统一取同位阶完整 NPC 的 50%，能力仍按该途径与位阶生成。
    SUMMON_ALCHEMY: '快速炼成',
    SUMMON_ALCHEMY_RANK_GATE: 4,
    SUMMON_ALCHEMY_TITLE: '知识之妖',
    SUMMON_ALCHEMY_TITLE_RANK: -1,
    SUMMON_ALCHEMY_RATIO: 0.50,
    SUMMON_ALCHEMY_MAX_PER_CASTER: 3,

    // ---------- 召唤 · 幻想之身（萨满序列 1） ----------
    // 复制施法者满状态角色卡，自动成功、完整实力、无期限；消耗沿用召唤默认灵性 5%。
    // 每场累计成功 1 次。NPC 不进普通召唤骰，作为必成召唤的第一优先级直接发动。
    SUMMON_FANTASY_BODY: '幻想之身',
    SUMMON_FANTASY_BODY_RANK_GATE: 1,
    SUMMON_FANTASY_BODY_TITLE: '高维俯视者',
    SUMMON_FANTASY_BODY_TITLE_RANK: -1,
    SUMMON_FANTASY_BODY_MAX_PER_CASTER: 1,

    // ---------- 召唤 · 画中人（萨满序列 5） ----------
    // 玩家先在途径专属玩法中制造并长期保存成品；战斗里只负责把选中的成品投放进场。
    // NPC 没有制造仓库，每个战术阶段单独掷 30% 骰，命中后随机现造同位阶任意途径成品。
    // 两侧都只允许一个在场，死亡或正常离场即返还这个“在场名额”；持续时间无限、实力完整。
    SUMMON_PICTURE_PERSON: '召唤画中人',
    SUMMON_PICTURE_PERSON_RANK_GATE: 5,
    SUMMON_PICTURE_PERSON_TITLE: '高维俯视者',
    SUMMON_PICTURE_PERSON_TITLE_RANK: -1,
    SUMMON_PICTURE_PERSON_RATIO: 1,
    SUMMON_PICTURE_PERSON_MAX_LIVE: 1,
    SUMMON_PICTURE_PERSON_NPC_CHANCE: 30,

    // ---------- 召唤 · 真实幻象 ----------
    // 与历史投影同属召唤大类，但四处都不一样，所以常量整段单开、一条都不复用：
    //   一、目标是**施法者自己**，没有好感度这一维，于是三条曲线（bond/power/rounds）
    //       全都用不上；实力由拼点败场数决定，见 POWER_STEP / FAIL_LOSSES。
    //   二、消耗走**人性**、比例 10%，直接复用操控那条 controlStatCost，
    //       不是历史投影的 spiritCost（灵性 5%）。
    //   三、名额按序列分两档，且与历史投影**各记各的**——共用
    //       SUMMON_MAX_PER_CASTER 会让不同子类互相吃名额。
    //   四、没有维持回合数，召出来就一直在，直到被打死或召唤者死亡。
    SUMMON_ILLUSION: '真实幻象',
    SUMMON_ILLUSION_RANK_GATE: 3,          // 观众：rank ≤ 3 解锁
    SUMMON_ILLUSION_TITLE: '上帝',         // 称号兜底。「上帝」跨多条途径（观众/太阳/水手…），
                                           // 与 MythicFormManager.isSpectator 认的是同一个字串
    SUMMON_ILLUSION_TITLE_RANK: -2,        // 称号命中按支柱档记，于是天然落在高名额档
    SUMMON_ILLUSION_QUOTA_HIGH_RANK: 1,    // rank ≤ 1（含序列 0 / 旧日 / 支柱）用高档
    SUMMON_ILLUSION_QUOTA_LOW: 1,          // 序列 3、2：每场 1 次
    SUMMON_ILLUSION_QUOTA_HIGH: 2,         // 序列 1 起：每场 2 次
    // 拼点：与每个在场敌人各掷一次当前人性，每输一次幻象实力降一档，输满即整次失败
    SUMMON_ILLUSION_POWER_STEP: 0.10,
    SUMMON_ILLUSION_FAIL_LOSSES: 10,

    // ---------- 召唤 · 外放灵魂（秘祈人放牧专属） ----------
    SUMMON_GRAZING: '外放灵魂',
    SUMMON_GRAZING_RANK_GATE: 4,
    SUMMON_GRAZING_TITLE: '上帝',
    GRAZING_SWITCH_RATE: 0.02,
    GRAZING_UPKEEP_RATE: 0.05,
    GRAZING_NPC_CHANCE: 30, };
  const summonDefaults = { sequenceBase: {
        "-2": 5000000, "-1": 3000000, "0": 1200000, "1": 300000,
        "2": 120000, "3": 40000, "4": 15000, "5": 6000,
        "6": 2500, "7": 1000, "8": 450, "9": 300
    },
npcTemplateConfig: {
      multipliers: { "首领": 3.0, "头目": 2.0, "精英": 1.4, "普通": 1.0 },
      rankRules: [
        { minRank: -2, maxRank: 2, minM: 3.0, maxM: 3.0, defaultName: "首领" },
        { minRank: 3, maxRank: 4, minM: 2.0, maxM: 3.0, defaultName: "头目" },
        { minRank: 5, maxRank: 7, minM: 1.4, maxM: 2.0, defaultName: "精英" }
      ],
      defaultRule: { minM: 1.0, maxM: 1.4, defaultName: "普通" } // 序列 8,9 及普通人的兜底
    },
    // 2. 神性配置：数组形式方便按范围遍历查找
    divinityConfig: [
      { min: -2, max: 0, val: 2 },
      { min: 1, max: 2, val: 1.5 },
      { min: 3, max: 4, val: 1.3 }
    ], // 找不到就默认给 1
abilitySystemConfig: {
      systems: {
        '物理突击系': { 活力: 0.35, 敏捷: 0.20, 灵性: 0.20, 理智: 0.10, 人性: 0.10, 运气: 0.05 },
        '高敏游击系': { 活力: 0.20, 敏捷: 0.40, 灵性: 0.10, 理智: 0.15, 人性: 0.10, 运气: 0.05 },
        '神秘法术系': { 活力: 0.10, 敏捷: 0.20, 灵性: 0.35, 理智: 0.20, 人性: 0.10, 运气: 0.05 },
        '精神控制系': { 活力: 0.10, 敏捷: 0.15, 灵性: 0.20, 理智: 0.20, 人性: 0.30, 运气: 0.05 },
        '命运特殊系': { 活力: 0.15, 敏捷: 0.20, 灵性: 0.20, 理智: 0.05, 人性: 0.10, 运气: 0.30 },
        '诡异综合系': { 活力: 0.20, 敏捷: 0.20, 灵性: 0.25, 理智: 0.15, 人性: 0.10, 运气: 0.10 }
      },
      aliases: {},
      defaultSystem: '物理突击系'
    }, };
  const borrowConfig = { ABILITY_BORROW_ACTION: '能力借用',
    BORROW_DEFINE: '“定义”权柄',
    BORROW_STEAL: '“窃取”权柄',
    BORROW_COST_RATIO: 0.08,
    BORROW_NPC_CHANCE: 30,
    // ---------- 顶层战术动作元数据 ----------
    // 新增顶层动作时必须在这里登记一次。缺项不允许静默回落成 local 或 llm，
    // 否则 UI、提示词与提交路由会再次各自长出一份互相漂移的白名单。
    ACTION_META: Object.freeze({
        '改变地形': { resolution: 'llm' },
        '对角色使用战术': { resolution: 'llm' },
        '待命': { resolution: 'local', showInLocalMode: false },
        '技能干涉': { resolution: 'local' },
        '贿赂': { resolution: 'local' },
        '神话生物形态': { resolution: 'local' },
        '神秘再现·丑小鸭': { resolution: 'local' },
        '操控敌人': { resolution: 'local' },
        '惩戒': { resolution: 'local' },
        '「平衡」权柄': { resolution: 'local' },
        '底层规则修改': { resolution: 'local' },
        '召唤': { resolution: 'local' },
        '回溯': { resolution: 'local' },
        '规则修改': { resolution: 'local' },
        '改变环境': { resolution: 'local' },
        '放逐': { resolution: 'local' },
        '主动离场': { resolution: 'local' },
        '额外行动': { resolution: 'local' },
        '施加效果': { resolution: 'local' },
        '目标干涉': { resolution: 'local' },
        '制造战场事件': { resolution: 'local' },
        '效果传递': { resolution: 'local' },
        '光环效果': { resolution: 'local', auxiliary: true },
        '能力借用': { resolution: 'local' },
    }), };
  const skillControlConfig = { SKILL_CONTROL_NPC_CHANCE: 30,
    SKILL_CONTROL_NPC_MODES: ['禁止', '偷窃'], };
  function createAutoPilot(SkillLoader) {
const AutoPilotManager = {
    ensure(bm) {
        if (!bm.autoPilot) {
            bm.autoPilot = {
                on: false,
            };
        }
        return bm.autoPilot;
    },

    isOn(bm) {
        return !!(bm && this.ensure(bm).on);
    },

    /** @returns {boolean} 切换后的状态 */
    toggle(bm) {
        const st = this.ensure(bm);
        st.on = !st.on;
        return st.on;
    },

    /**
     * 这一具身体现在是否由托管的 AI 代打。
     * 判据里的 controller 不是冗余：托管只接管**此刻仍属于玩家**的单位。
     *   - 玩家本人、玩家的召唤物、玩家征服 / 秘偶 / 奴役 / 驯化抢来的身体，全在内；
     *   - 玩家自己被敌方控走的那段时间 controller 已经是 npc，本函数返回假，
     *     旗标自动静默（那时本来就是敌方 AI 在打，不该记在托管账上），
     *     释放回来后又自动接着托管，不需要任何存档与恢复。
     */
    drives(bm, hero) {
        if (!hero || !this.isOn(bm)) return false;
        return hero.controller === 'player';
    },

    /**
     * 托管时喂给 CPUManager 的技能表。
     * 与玩家手动时的 renderSkillSelection 同源：优先 hero.moveSet——它保留着
     * 战斗中递减的 remainingUses，也含战术阶段偷来 / 复制来的技能。
     * executeAITurn 原本每回合从 originalData 重建（那是 NPC 侧有意接受的取舍，
     * 见 SkillControlManager.npcAttempt 的注释），但玩家的消耗性技能次数与
     * 战术阶段的战果不能就这么凭空复原，所以托管走这一条。
     */
    skillsFor(hero) {
        if (hero && hero.moveSet && hero.moveSet.length > 0) return hero.moveSet;
        return SkillLoader.loadSkillsFromCharacter(
            hero.originalData,
            hero.dataSource,
            hero.sequenceRank,
            hero,
        );
    },
};
    return AutoPilotManager;
  }
  function createStatus() {
    const console = { log() {}, warn() {}, error() {} };
class StatusEffectManager {
    constructor() {
        this.config = null;
        this.defaultConfig = this.getDefaultConfig();

        console.log('[StatusEffectManager] 状态效果管理器已初始化');
    }

    /**
     * 获取默认配置
     * @returns {Object} 默认配置对象
     */
    getDefaultConfig() {
        return {
            vitality: [
                { threshold: 0.0, effect: { name: "死亡", type: "debuff", stat: "defense", valueType: "percentage", power: 80, duration: 1 } },
                { threshold: 0.29, effect: { name: "重伤", type: "debuff", stat: "defense", valueType: "percentage", power: 50, duration: 1 } },
                { threshold: 0.49, effect: { name: "中等受伤", type: "debuff", stat: "defense", valueType: "percentage", power: 30, duration: 1 } },
                { threshold: 0.79, effect: { name: "轻伤", type: "debuff", stat: "defense", valueType: "percentage", power: 15, duration: 1 } }
            ],
            agility: [
                { threshold: 0.0, effect: { name: "完全瘫痪", type: "debuff", stat: "damageTakenIncrease", valueType: "percentage", power: 100, duration: 1 } },
                { threshold: 0.29, effect: { name: "几乎无法移动", type: "debuff", stat: "damageTakenIncrease", valueType: "percentage", power: 60, duration: 1 } },
                { threshold: 0.49, effect: { name: "行动迟缓", type: "debuff", stat: "damageTakenIncrease", valueType: "percentage", power: 35, duration: 1 } },
                { threshold: 0.79, effect: { name: "行动略微受阻", type: "debuff", stat: "damageTakenIncrease", valueType: "percentage", power: 18, duration: 1 } }
            ],
            spirit: [
                { threshold: 0.0, effect: { name: "灵性耗尽", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 70, duration: 1 } },
                { threshold: 0.29, effect: { name: "灵性干涸", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 45, duration: 1 } },
                { threshold: 0.49, effect: { name: "灵性余量紧张", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 25, duration: 1 } },
                { threshold: 0.79, effect: { name: "灵性微耗", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 12, duration: 1 } }
            ],
            sanity: [
                { threshold: 0.0, effect: { name: "彻底失去理智，陷入疯狂", type: "debuff", stat: "attack", valueType: "percentage", power: 75, duration: 1 } },
                { threshold: 0.29, effect: { name: "理智濒临崩溃", type: "debuff", stat: "attack", valueType: "percentage", power: 55, duration: 1 } },
                { threshold: 0.49, effect: { name: "理智动摇", type: "debuff", stat: "attack", valueType: "percentage", power: 35, duration: 1 } },
                { threshold: 0.79, effect: { name: "理智受冲击", type: "debuff", stat: "attack", valueType: "percentage", power: 18, duration: 1 } }
            ],
            humanity: [
                { threshold: 0.0, effect: { name: "彻底失去人性，非人化", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 55, duration: 1 } },
                { threshold: 0.29, effect: { name: "人性泯灭", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 35, duration: 1 } },
                { threshold: 0.49, effect: { name: "人性扭曲", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 20, duration: 1 } },
                { threshold: 0.79, effect: { name: "人性动摇", type: "debuff", stat: "damageDealtDecrease", valueType: "percentage", power: 10, duration: 1 } }
            ]
        };
    }

    /**
     * 加载配置文件
     * @param {Object} config - 配置对象
     * @returns {boolean} 是否加载成功
     */
    loadConfig(config) {
        try {
            if (this.validateConfig(config)) {
                this.config = config;
                console.log('[StatusEffectManager] 配置加载成功');
                return true;
            } else {
                console.error('[StatusEffectManager] 配置验证失败，使用默认配置');
                this.config = this.defaultConfig;
                return false;
            }
        } catch (error) {
            console.error('[StatusEffectManager] 配置加载失败:', error);
            this.config = this.defaultConfig;
            return false;
        }
    }

    /**
     * 验证配置格式
     * @param {Object} config - 配置对象
     * @returns {boolean} 是否有效
     */
    validateConfig(config) {
        const attributes = ['vitality', 'agility', 'spirit', 'sanity', 'humanity'];

        for (const attr of attributes) {
            if (!config[attr] || !Array.isArray(config[attr])) {
                console.error(`[StatusEffectManager] 缺少属性配置: ${attr}`);
                return false;
            }

            for (const item of config[attr]) {
                if (typeof item.threshold !== 'number' ||
                    item.threshold < 0 ||
                    item.threshold > 1) {
                    console.error(`[StatusEffectManager] 无效的阈值: ${item.threshold}`);
                    return false;
                }

                if (!item.effect || !item.effect.name || !item.effect.type) {
                    console.error(`[StatusEffectManager] 无效的效果配置`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 检查并应用状态效果
     * @param {Hero} hero - 角色对象
     * @returns {Array} 应用的状态效果列表
     */
    checkAndApplyEffects(hero) {
        const appliedEffects = [];
        const config = this.config || this.defaultConfig;

        // 计算五种属性的百分比
        const percentages = {
            vitality: hero.additionalStats.当前活力 / hero.additionalStats.活力,
            agility: hero.additionalStats.当前敏捷 / hero.additionalStats.敏捷,
            spirit: hero.additionalStats.当前灵性 / hero.additionalStats.灵性,
            sanity: hero.additionalStats.当前理智 / hero.additionalStats.理智,
            humanity: hero.additionalStats.当前人性 / hero.additionalStats.人性
        };

        // 对每种属性检查状态效果
        for (const [attrName, percentage] of Object.entries(percentages)) {
            const attrConfig = config[attrName];
            if (!attrConfig) continue;

            // 找到所有满足条件的阈值
            const matchingThresholds = attrConfig.filter(item => percentage <= item.threshold);

            // 如果有多个满足条件，选择百分比最低的（即阈值最小的）
            if (matchingThresholds.length > 0) {
                // 按阈值升序排序，取第一个
                matchingThresholds.sort((a, b) => a.threshold - b.threshold);
                const selectedEffect = matchingThresholds[0].effect;

                // 检查是否已经有相同效果
                const hasEffect = hero.effects.some(e => e.name === selectedEffect.name);

                if (!hasEffect) {
                    // 应用效果
                    const effectInstance = {
                        name: selectedEffect.name,
                        type: selectedEffect.type,
                        stat: selectedEffect.stat,
                        valueType: selectedEffect.valueType,
                        power: selectedEffect.power,
                        duration: selectedEffect.duration,
                        // 属性阈值会在每次 turn_start 重新检测；这类派生状态不能被“赠予负面效果”搬走。
                        statusDerived: true,
                        appliedAt: Date.now()
                    };

                    hero.effects.push(effectInstance);
                    appliedEffects.push(effectInstance);

                    console.log(`[StatusEffectManager] 应用状态效果: ${selectedEffect.name} 到 ${hero.name} (${attrName}: ${(percentage * 100).toFixed(1)}%)`);
                }
            }
        }

        return appliedEffects;
    }

    /**
     * 热重载配置
     * @param {Object} newConfig - 新配置对象
     * @returns {boolean} 是否重载成功
     */
    reloadConfig(newConfig) {
        console.log('[StatusEffectManager] 开始热重载配置');

        // 保存当前配置作为备份
        const backup = this.config;

        try {
            if (this.validateConfig(newConfig)) {
                this.config = newConfig;
                console.log('[StatusEffectManager] 配置热重载成功');
                return true;
            } else {
                // 恢复备份
                this.config = backup;
                console.error('[StatusEffectManager] 新配置无效，已恢复备份');
                return false;
            }
        } catch (error) {
            // 恢复备份
            this.config = backup;
            console.error('[StatusEffectManager] 配置热重载失败:', error);
            return false;
        }
    }
}
    return new StatusEffectManager();
  }
  function createReporter() {
    const console = { log() {}, warn() {}, error() {} };
    const LifeSaveManager = {
finalEffectVerdict(finalDamage, maxHp) {
        if (!maxHp || maxHp <= 0 || finalDamage <= 0) return '无效果';
        const percentage = (finalDamage / maxHp) * 100;
        if (percentage <= 1) return '几乎无效果';
        if (percentage <= 10) return '效果微弱';
        if (percentage <= 20) return '效果一般';
        if (percentage <= 30) return '效果良好';
        return '效果显著';
    }
    };
class BattleReporter {
    /**
     * 构造函数
     */
    constructor() {
        this.simpleBattleLog = [];
        this.detailedLog = [];
        this.participatingCharacters = new Set();
        this.currentRound = 1;
        this.roundActions = []; // 记录每回合的行动
        this.sparedEnemyNames = new Set();
        // 🆕 行动主体别名。额外行动大类的从动格要把战报里的行动者写成
        // 「克莱恩的第一个虚影」，而**绝不能**去改 hero.name——那是身份键，
        // 饶恕名单、战后属性一览、findHero、LLM 计划回声匹配全靠它对人
        this._aliasHero = null;
        this._alias = '';

        console.log('[BattleReporter] 战斗报告生成器已初始化');
    }

    /**
     * 🆕 设定行动主体别名。hero 与字符串**成对存**：只有正在行动的那个对象会被改名，
     * 别名不可能漏到别人身上。传 null 即清除，本体格每次都会来清一次。
     * @param {Hero|null} hero
     * @param {string} alias
     */
    setActorAlias(hero, alias) {
        this._aliasHero = (hero && alias) ? hero : null;
        this._alias = (hero && alias) ? String(alias) : '';
    }

    /**
     * 🆕 战报里该怎么称呼这个行动者。除了从动格，其余一切场合都返回本名。
     * 只用于**行动主体**，受击者、目标一律仍写 target.name——挨打的是本体那具身体。
     */
    actorNameOf(hero) {
        if (!hero) return '';
        return (hero === this._aliasHero && this._alias) ? this._alias : hero.name;
    }

    /**
     * 手下留情名单：只影响最终写入输入框的文本，不改战斗内数据。
     * @param {Array<string>} names
     */
    setSparedEnemies(names) {
        this.sparedEnemyNames = new Set((names || []).filter(Boolean));
    }

    _escapeRegExp(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _isSparedDead(hero, status) {
        const name = (hero && hero.name) || (status && status.name);
        const cur = Number(status && status.currentVitality);
        return !!(name && this.sparedEnemyNames.has(name) && Number.isFinite(cur) && cur <= 0);
    }

    /**
     * 出文时改写副本：死亡 → 彻底失去战斗能力，活力 0 → 1。
     * 不改 simpleBattleLog 原文。
     */
    _rewriteSparedLogLine(line) {
        if (!line || !this.sparedEnemyNames || this.sparedEnemyNames.size === 0) return line;
        let out = line;
        this.sparedEnemyNames.forEach(name => {
            if (!name) return;
            const n = this._escapeRegExp(name);
            out = out.replace(new RegExp(`，${n}进入【死亡】状态`, 'g'), `，${name}进入【彻底失去战斗能力】状态`);
            out = out.replace(new RegExp(`，${n}从【([^】]+)】恶化为【死亡】`, 'g'), `，${name}从【$1】恶化为【彻底失去战斗能力】`);
            out = out.replace(new RegExp(`${n}当前活力：(-?\\d+(?:\\.\\d+)?)→0(?!\\d)`, 'g'), `${name}当前活力：$1→1`);
        });
        return out;
    }

    /**
     * 记录简化战报
     * @param {string} message - 简化消息
     */
    logSimple(message) {
        this.simpleBattleLog.push(message);
    }

    /**
     * 记录效果触发
     * @param {Object} hero - 角色Hero对象
     * @param {string} effectName - 效果名称
     * @param {string} description - 效果描述
     */
    logEffectTrigger(hero, effectName, description) {
        this.participatingCharacters.add(hero.name);

        const message = `${hero.name}触发${effectName}：${description}`;
        this.logSimple(message);
    }

    /**
     * 生成战后属性一览
     * @param {Array} allHeroes - 所有参战角色数组
     * @returns {string} 战后属性一览文本
     */
    generatePostBattleAttributes(allHeroes) {
        let report = '\n【战后属性一览】\n';

        allHeroes.forEach(hero => {
            // 🆕 召唤物不进这一栏。它是战斗内凭空造出来的临时单位，stat_data 与
            // npc_data 里都没有对应实体；写进去，正文 LLM 抄录之后外部系统就可能
            // 拿这份缩放过的属性去改本体的 npc_data。
            // 守卫写在这里而不是过滤调用点：上游有两处各自在拼 allHeroes
            // 🆕 途径专属玩法的袋内单位（分身 / 秘偶）同理：它的记录在
            // stat_data.$专属玩法 里，npc_data 中并无此人，抄进正文只会诱使外部
            // 系统凭空造出一条同名的 NPC 记录。已入册的秘偶不在此列，它是真 NPC
            if (hero.isSummon || hero.playSource) return;
            const status = hero.getStatusSummary();
            const sparedDead = this._isSparedDead(hero, status);

            // 计算百分比
            const vitalityPercent = sparedDead
                ? Math.max(1, status.maxVitality > 0 ? (1 / status.maxVitality) * 100 : 1)
                : (status.currentVitality / status.maxVitality) * 100;
            const agilityPercent = (status.currentAgility / status.maxAgility) * 100;
            const spiritPercent = (status.currentSpirit / status.maxSpirit) * 100;
            const sanityPercent = (status.currentSanity / status.maxSanity) * 100;
            const humanityPercent = (status.currentHumanity / status.maxHumanity) * 100;

            // 获取状态标签
            const vitalityLabel = sparedDead
                ? ' - 彻底失去战斗能力'
                : this.getAttributeLabel('vitality', vitalityPercent);
            const agilityLabel = this.getAttributeLabel('agility', agilityPercent);
            const spiritLabel = this.getAttributeLabel('spirit', spiritPercent);
            const sanityLabel = this.getAttributeLabel('sanity', sanityPercent);
            const humanityLabel = this.getAttributeLabel('humanity', humanityPercent);
            const shownVitality = sparedDead ? 1 : status.currentVitality;

            report += `\n${hero.name}（${hero.baseSequenceString || status.sequenceString}）：\n`;
            report += `  活力：${shownVitality}/${status.maxVitality}（${vitalityPercent.toFixed(0)}%）${vitalityLabel}\n`;
            report += `  敏捷：${status.currentAgility}/${status.maxAgility}（${agilityPercent.toFixed(0)}%）${agilityLabel}\n`;
            report += `  灵性：${status.currentSpirit}/${status.maxSpirit}（${spiritPercent.toFixed(0)}%）${spiritLabel}\n`;
            report += `  理智：${status.currentSanity}/${status.maxSanity}（${sanityPercent.toFixed(0)}%）${sanityLabel}\n`;
            report += `  人性：${status.currentHumanity}/${status.maxHumanity}（${humanityPercent.toFixed(0)}%）${humanityLabel}\n`;
        });

        const playerHero = allHeroes.find(h => h.dataSource === 'player');
        if (playerHero && Array.isArray(playerHero.moveSet)) {
            const consumables = playerHero.moveSet
                .filter(m => m.isConsumable)
                .map(m => ({ 名称: m.name, 剩余数量: m.remainingUses ?? 0 }));
            if (consumables.length > 0) {
                report += `\n【${playerHero.name}的消耗品剩余数量】\n`;
                consumables.forEach(c => { report += `  ${c.名称}：${c.剩余数量}\n`; });
            }
        }

        return report;
    }

    /**
     * 获取属性状态标签
     * @param {string} attributeType - 属性类型
     * @param {number} percent - 百分比（0-100）
     * @returns {string} 状态标签
     */
    getAttributeLabel(attributeType, percent) {
        if (percent >= 80) {
            return ''; // 80-100% 不返回标签
        }

        const labels = {
            vitality: ['死亡', '重伤', '中等受伤', '轻伤'],
            agility: ['完全瘫痪', '几乎无法移动', '行动迟缓', '行动略微受阻'],
            spirit: ['灵性耗尽', '灵性干涸', '灵性余量紧张', '灵性微耗'],
            sanity: ['彻底失去理智', '理智濒临崩溃', '理智动摇', '理智受冲击'],
            humanity: ['彻底失去人性', '人性泯灭', '人性扭曲', '人性动摇']
        };

        const attributeLabels = labels[attributeType] || [];

        if (percent === 0) {
            return ` - ${attributeLabels[0] || '极度危险'}`;
        } else if (percent < 30) {
            return ` - ${attributeLabels[1] || '严重'}`;
        } else if (percent < 50) {
            return ` - ${attributeLabels[2] || '中度'}`;
        } else if (percent < 80) {
            return ` - ${attributeLabels[3] || '轻度'}`;
        }

        return '';
    }

    /**
     * 🆕 命中率武器专用的效果评价。
     *
     * 分档口径与 _calculateEffectEvaluation 相同（伤害占目标该属性上限的比例），
     * 但用词必须另起一套。原因：命中率武器是**固定伤害**，同一枪打序列10 是要害、
     * 打序列5 就成了「仅擦边」——而「擦边」在中文里暗示的是**打偏了**，
     * 实际情况却是结结实实打中、对方扛住了。这两件事在战报里必须分得开，
     * 否则正文 LLM 会把「打中没打动」写成「子弹擦着肩膀飞过」。
     *
     * @param {number} changeAmount - 实际扣减量
     * @param {number} maxValue - 该属性上限
     * @private
     */
    _calculateAccuracyWeaponEvaluation(changeAmount, maxValue) {
        if (maxValue === 0 || changeAmount === 0) {
            return '命中|未能造成伤害';
        }

        const percentage = (Math.abs(changeAmount) / maxValue) * 100;

        if (percentage <= 1) {
            return '命中|对方几乎无损';
        } else if (percentage <= 10) {
            return '命中|造成轻伤';
        } else if (percentage <= 20) {
            return '命中|造成可观创伤';
        } else if (percentage <= 30) {
            return '命中要害|重创';
        } else {
            return '命中要害|致命一击';
        }
    }

    /**
     * 计算效果评价等级
     * @param {number} changeAmount - 属性变化量（绝对值）
     * @param {number} maxValue - 属性最大值
     * @returns {string} 效果评价文本
     * @private
     */
    _calculateEffectEvaluation(changeAmount, maxValue) {
        // 边界检查
        if (maxValue === 0 || changeAmount === 0) {
            return '未中|无效果';
        }

        // 计算百分比
        const percentage = (Math.abs(changeAmount) / maxValue) * 100;

        // 分级判断
        if (percentage <= 1) {
            return '仅擦边|几乎无效果';
        } else if (percentage <= 10) {
            return '命中边缘|效果微弱';
        } else if (percentage <= 20) {
            return '命中非核心区|效果一般';
        } else if (percentage <= 30) {
            return '命中核心但非要害|效果良好';
        } else {
            return '命中要害|效果显著';
        }
    }

    /**
     * 获取标签所有者名称
     * @param {Object} tag - 标签对象（包含 name 和 source 字段）
     * @param {string} skillName - 技能名称
     * @param {string} characterName - 角色名称
     * @returns {string} 标签所有者名称
     * @private
     */
    _getTagOwnerName(tag, skillName, characterName) {
        if (tag.source === 'skill') {
            return skillName;
        } else {
            // source === 'inherent' 或 'applied'
            return characterName;
        }
    }

    /**
     * 获取状态等级
     * @param {number} percent - 百分比（0-100）
     * @returns {number} 状态等级（0-4）
     * @private
     */
    _getStateLevel(percent) {
        if (percent === 0) return 0;      // CRITICAL
        if (percent < 30) return 1;       // SEVERE
        if (percent < 50) return 2;       // MODERATE
        if (percent < 80) return 3;       // MILD
        return 4;                         // NORMAL
    }

    /**
     * 获取属性类型（用于 getAttributeLabel）
     * @param {string} attributeName - 属性名称（如 '当前活力'）
     * @returns {string} 属性类型（如 'vitality'）
     * @private
     */
    _getAttributeType(attributeName) {
        const typeMap = {
            '当前活力': 'vitality',
            '当前敏捷': 'agility',
            '当前灵性': 'spirit',
            '当前理智': 'sanity',
            '当前人性': 'humanity'
        };
        return typeMap[attributeName] || 'vitality';
    }

    /**
     * 从 getAttributeLabel 返回值中提取纯状态标签
     * @param {string} labelText - getAttributeLabel 返回的文本（如 ' - 重伤' 或 ''）
     * @returns {string} 纯状态标签（如 '重伤' 或 ''）
     * @private
     */
    _extractStateLabel(labelText) {
        if (!labelText) return '';
        return labelText.replace(/^\s*-\s*/, '').trim();
    }

    /**
     * 生成标签克制/抵抗标记
     * @param {Hero} attacker - 攻击者对象
     * @param {Hero} defender - 防御者对象
     * @param {Move} skill - 技能对象
     * @param {Array} matchedRelations - 匹配的克制关系数组
     * @returns {string} 克制/抵抗标记文本（如果没有则返回空字符串）
     * @private
     */
    _generateTagRestraintMarker(attacker, defender, skill, matchedRelations) {
        // 边界检查
        if (!matchedRelations || matchedRelations.length === 0) {
            return '';
        }

        // 分离克制和抵抗关系
        const restraints = [];  // 克制关系（modifier > 0）
        const resistances = []; // 抵抗关系（modifier < 0）

        matchedRelations.forEach(relation => {
            if (relation.modifier > 0) {
                // 克制关系
                const attackerOwner = this._getTagOwnerName(
                    relation.attackerTag,
                    skill.name,
                    attacker.name
                );
                const defenderOwner = this._getTagOwnerName(
                    relation.defenderTag,
                    skill.name,
                    defender.name
                );

                restraints.push(
                    `${attackerOwner}的【${relation.attackerTag.name}】克制${defenderOwner}的【${relation.defenderTag.name}】`
                );
            } else if (relation.modifier < 0) {
                // 抵抗关系
                const attackerOwner = this._getTagOwnerName(
                    relation.attackerTag,
                    skill.name,
                    attacker.name
                );
                const defenderOwner = this._getTagOwnerName(
                    relation.defenderTag,
                    skill.name,
                    defender.name
                );

                resistances.push(
                    `${defenderOwner}的【${relation.defenderTag.name}】抵抗${attackerOwner}的【${relation.attackerTag.name}】`
                );
            }
        });

        // 构建最终标记
        const parts = [];

        if (restraints.length > 0) {
            parts.push(`克制：${restraints.join('、')}`);
        }

        if (resistances.length > 0) {
            parts.push(`抵抗：${resistances.join('、')}`);
        }

        if (parts.length === 0) {
            return '';
        }

        return `【${parts.join('，')}】`;
    }

    /**
     * 检测属性状态变化
     * @param {Hero} target - 目标对象
     * @param {string} attributeName - 属性名称（如 '当前活力'）
     * @param {number} oldValue - 旧值
     * @param {number} newValue - 新值
     * @param {number} maxValue - 最大值
     * @returns {Object} 状态变化检测结果
     * @private
     */
    _detectAttributeStateChange(target, attributeName, oldValue, newValue, maxValue) {
        // 边界检查
        if (maxValue === 0) {
            return { hasChange: false, changeType: 'none' };
        }

        // 计算百分比
        const oldPercent = (oldValue / maxValue) * 100;
        const newPercent = (newValue / maxValue) * 100;

        // 获取状态等级
        const oldLevel = this._getStateLevel(oldPercent);
        const newLevel = this._getStateLevel(newPercent);

        // 如果等级没有变化，返回无变化
        if (oldLevel === newLevel) {
            return { hasChange: false, changeType: 'none' };
        }

        // 获取属性类型（用于调用 getAttributeLabel）
        const attributeType = this._getAttributeType(attributeName);

        // 获取状态标签
        const oldStateLabel = this._extractStateLabel(
            this.getAttributeLabel(attributeType, oldPercent)
        );
        const newStateLabel = this._extractStateLabel(
            this.getAttributeLabel(attributeType, newPercent)
        );

        // 判断变化类型
        const NORMAL_LEVEL = 4;
        let changeType;

        if (oldLevel === NORMAL_LEVEL && newLevel < NORMAL_LEVEL) {
            changeType = 'enter';  // 进入异常状态
        } else if (oldLevel < NORMAL_LEVEL && newLevel === NORMAL_LEVEL) {
            changeType = 'exit';   // 脱离异常状态
        } else if (oldLevel < NORMAL_LEVEL && newLevel < NORMAL_LEVEL) {
            if (newLevel < oldLevel) {
                changeType = 'worsen';  // 状态恶化
            } else {
                changeType = 'improve'; // 状态好转
            }
        } else {
            changeType = 'none';
        }

        return {
            hasChange: true,
            changeType: changeType,
            oldState: oldStateLabel,
            newState: newStateLabel,
            oldLevel: oldLevel,
            newLevel: newLevel
        };
    }

    /**
     * 生成状态变化标记
     * @param {Hero} target - 目标对象
     * @param {string} changeType - 变化类型（'enter' | 'exit' | 'worsen' | 'improve' | 'none'）
     * @param {string} oldState - 旧状态标签
     * @param {string} newState - 新状态标签
     * @param {string} attributeName - 属性名称（用于显示，如 '当前活力'）
     * @returns {string} 状态变化标记文本（如果没有变化则返回空字符串）
     * @private
     */
    _generateStateChangeMarker(target, changeType, oldState, newState, attributeName) {
        // 如果没有变化，返回空字符串
        if (changeType === 'none') {
            return '';
        }

        const targetName = target.name;

        switch (changeType) {
            case 'enter':
                // 进入异常状态
                return `，${targetName}进入【${newState}】状态`;

            case 'exit':
                // 脱离异常状态
                return `，${targetName}脱离【${oldState}】状态`;

            case 'worsen':
                // 状态恶化
                return `，${targetName}从【${oldState}】恶化为【${newState}】`;

            case 'improve':
                // 状态好转
                return `，${targetName}从【${oldState}】好转为【${newState}】`;

            default:
                return '';
        }
    }

    /**
     * 记录效果施加
     * @param {Hero} caster - 施法者对象
     * @param {Hero} target - 目标对象
     * @param {string} effectName - 效果名称
     * @private
     */
    _recordEffectApplied(caster, target, effectName) {
        // 边界检查
        if (!caster || !target || !effectName) {
            console.warn('[BattleReporter] 效果施加记录参数不完整');
            return;
        }

        // 生成消息
        const message = `${this.actorNameOf(caster)}对${target.name}施加了【${effectName}】`;

        // 记录到简化战报
        this.logSimple(message);
    }

    /**
     * 记录效果过期
     * @param {Hero} target - 目标对象
     * @param {string} effectName - 效果名称
     * @private
     */
    _recordEffectExpired(target, effectName) {
        // 边界检查
        if (!target || !effectName) {
            console.warn('[BattleReporter] 效果过期记录参数不完整');
            return;
        }

        // 生成消息
        const message = `${target.name}的【${effectName}】效果已过期`;

        // 记录到简化战报
        this.logSimple(message);
    }

    /**
     * 记录效果移除
     * @param {Hero} target - 目标对象
     * @param {string} effectName - 效果名称
     * @private
     */
    _recordEffectRemoved(target, effectName) {
        // 边界检查
        if (!target || !effectName) {
            console.warn('[BattleReporter] 效果移除记录参数不完整');
            return;
        }

        // 生成消息
        const message = `${target.name}的【${effectName}】效果被移除`;

        // 记录到简化战报
        this.logSimple(message);
    }

    /**
     * 🆕 距离语义：0～1 格算近距离，2～3 格算中距离，4 格及以上算远距离。
     * 拿不到距离（棋盘未初始化、global 技能等）就不加修饰。
     * @param {number} distance - 切比雪夫距离
     * @returns {string} '在近距离'/'在中距离'/'在远距离'/''
     */
    static describeDistance(distance) {
        if (!Number.isFinite(distance)) return '';
        if (distance <= 1) return '在近距离';
        if (distance <= 3) return '在中距离';
        return '在远距离';
    }

    /**
     * 保命类战报评价（禁止「未中」话术）
     * @param {Hero} target
     * @param {Object} lifeSaveMeta
     * @param {number} finalDamage
     * @param {number} maxHp
     */
    _buildLifeSaveEvaluation(target, lifeSaveMeta, finalDamage, maxHp) {
        const verdict = LifeSaveManager.finalEffectVerdict(finalDamage, maxHp);
        return `${target.name}使用${lifeSaveMeta.skillName}抵消了${lifeSaveMeta.absorbPct}%的伤害，本次攻击最终${verdict}`;
    }

    /**
     * 记录攻击行动（增强版）
     * @param {Hero} attacker - 攻击者对象
     * @param {Hero} target - 目标对象
     * @param {Move} skill - 技能对象
     * @param {Object} damageResult - 伤害计算结果
     * @param {Object} attributeChanges - 属性变化对象（可选）
     * @param {Array} matchedRelations - 标签克制关系数组（可选）
     * @param {number} fireDistance - 出手瞬间施法者与圈心的切比雪夫距离（可选）
     * @param {Object|null} lifeSaveMeta - 保命吸收结果（可选）
     */
    recordAttack(attacker, target, skill, damageResult, attributeChanges = null, matchedRelations = null, fireDistance = null, lifeSaveMeta = null) {
        // 🆕 距离语义：不记逐格移动，只给 LLM 一个近 / 中 / 远距离的判断依据
        const distanceTag = BattleReporter.describeDistance(fireDistance);
        // 如果没有提供 attributeChanges，降级为仅显示活力变化
        if (!attributeChanges) {
            attributeChanges = {
                '当前活力': {
                    oldValue: damageResult.oldValue ?? 0,
                    newValue: damageResult.newValue ?? 0,
                    maxValue: target.additionalStats.活力 ?? 100
                }
            };
        }

        // 遍历每个受影响的属性
        Object.keys(attributeChanges).forEach(attributeName => {
            const change = attributeChanges[attributeName];
            const changeAmount = Math.abs(change.newValue - change.oldValue);

            // 1. 计算效果评价。三条分支的优先级不能乱：
            //    保命 > 命中率武器 > 普通技能。保命必须排最前——它那套话术是专门
            //    为了禁止冒出「未中」而写的，被别的分支抢走就前功尽弃了。
            //    未命中根本不走这个方法，它在 recordMiss 里
            const usedLifeSave = !!(lifeSaveMeta && lifeSaveMeta.triggered);
            let evaluation;
            if (usedLifeSave) {
                evaluation = this._buildLifeSaveEvaluation(target, lifeSaveMeta, changeAmount, change.maxValue);
            } else if (skill && skill.isAccuracyWeapon) {
                evaluation = this._calculateAccuracyWeaponEvaluation(changeAmount, change.maxValue);
            } else {
                evaluation = this._calculateEffectEvaluation(changeAmount, change.maxValue);
            }

            // 2. 生成克制标记（仅对第一个属性生成，避免重复）
            let restraintMarker = '';
            if (attributeName === Object.keys(attributeChanges)[0] && matchedRelations) {
                restraintMarker = this._generateTagRestraintMarker(attacker, target, skill, matchedRelations);
                if (restraintMarker) {
                    restraintMarker = '，' + restraintMarker;
                }
            }

            // 3. 检测状态变化
            const stateChange = this._detectAttributeStateChange(
                target,
                attributeName,
                change.oldValue,
                change.newValue,
                change.maxValue
            );

            // 4. 生成状态变化标记
            const stateMarker = stateChange.hasChange
                ? this._generateStateChangeMarker(
                    target,
                    stateChange.changeType,
                    stateChange.oldState,
                    stateChange.newState,
                    attributeName
                )
                : '';

            // 5. 构建完整消息。惩戒标记跟随这一名实际受击者，AoE 不会污染同圈其他人。
            const punishmentMarker = damageResult.punishmentTriggered
                ? '，【惩戒生效|最终伤害×1.5】'
                : '';
            const message = `${this.actorNameOf(attacker)}${distanceTag}使用${skill.name}攻击${target.name}，【${evaluation}】${punishmentMarker}${restraintMarker}${stateMarker}，${target.name}${attributeName}：${change.oldValue}→${change.newValue}`;

            // 6. 记录到简化战报
            this.logSimple(message);
        });
    }

    /**
     * 🆕 记录一次未命中。只有命中率武器会走到这里，序列能力与近战武器恒命中。
     *
     * 刻意**不复用 recordAttack**：那边的模板末尾一定会拼上「XX当前活力：185→185」，
     * 而属性根本没动，那截尾巴是纯噪音。评价词也不能借 _calculateEffectEvaluation
     * 的「未中|无效果」——它同时覆盖「打中了但被减伤吃干净」的情况，两件事在
     * 正文里要演绎成完全不同的画面。
     *
     * 命中率数字不进战报，它只出现在前端战斗日志里。
     *
     * @param {Hero} attacker
     * @param {Hero} target
     * @param {Move} skill
     * @param {number} fireDistance - 出手瞬间施法者与圈心的切比雪夫距离（可选）
     */
    recordMiss(attacker, target, skill, fireDistance = null) {
        const distanceTag = BattleReporter.describeDistance(fireDistance);
        const skillName = skill ? skill.name : '攻击';
        this.logSimple(`${this.actorNameOf(attacker)}${distanceTag}使用${skillName}攻击${target.name}，【未命中|攻击落空】`);
    }

    /**
     * 记录治疗行动（增强版）
     * @param {Hero} healer - 治疗者对象
     * @param {Hero} target - 目标对象
     * @param {Move} skill - 技能对象（可选，如果是普通治疗可能没有技能对象）
     * @param {number} healAmount - 治疗量
     * @param {Object} attributeChanges - 属性变化对象（可选）
     * @param {number} fireDistance - 出手瞬间施法者与圈心的切比雪夫距离（可选）
     */
    recordHeal(healer, target, skill, healAmount, attributeChanges = null, fireDistance = null) {
        const distanceTag = BattleReporter.describeDistance(fireDistance);
        // 如果没有提供 attributeChanges，降级为仅显示活力变化
        if (!attributeChanges) {
            const oldValue = target.additionalStats.当前活力 - healAmount;
            const newValue = target.additionalStats.当前活力;
            attributeChanges = {
                '当前活力': {
                    oldValue: oldValue,
                    newValue: newValue,
                    maxValue: target.additionalStats.活力 || 100
                }
            };
        }

        // 获取技能名称（如果没有技能对象，使用默认名称）
        const skillName = skill ? skill.name : '治疗';

        // 遍历每个受影响的属性
        Object.keys(attributeChanges).forEach(attributeName => {
            const change = attributeChanges[attributeName];
            const changeAmount = Math.abs(change.newValue - change.oldValue);

            // 1. 计算效果评价
            const evaluation = this._calculateEffectEvaluation(changeAmount, change.maxValue);

            // 2. 检测状态变化
            const stateChange = this._detectAttributeStateChange(
                target,
                attributeName,
                change.oldValue,
                change.newValue,
                change.maxValue
            );

            // 3. 生成状态变化标记
            const stateMarker = stateChange.hasChange
                ? this._generateStateChangeMarker(
                    target,
                    stateChange.changeType,
                    stateChange.oldState,
                    stateChange.newState,
                    attributeName
                )
                : '';

            // 4. 构建完整消息
            const message = `${this.actorNameOf(healer)}${distanceTag}使用${skillName}治疗${target.name}，【${evaluation}】${stateMarker}，${target.name}${attributeName}：${change.oldValue}→${change.newValue}`;

            // 5. 记录到简化战报
            this.logSimple(message);
        });
    }

    /**
     * 生成完整战斗简报
     * @param {Array} allHeroes - 所有参战角色数组
     * @returns {string} 完整战报文本
     */
    generateBattleReport(allHeroes) {
    let report = '[系统指令]:前端系统已演算过一场战斗,本轮你的任务是根据这份"战报简述",演绎这场战斗。并在正文最后抄录"参战人员战后属性一览"。"战报简述"如下:\n\n';
    report += '【战斗简报】\n\n';

        // 🆕 战场描述。铺图 LLM 看得到最新正文与小总结，据此设计战场并写下这句话；
        // 这句话进战报，正文 LLM 读战报时自然就看到了，链路到此闭合。
        // 没有它，正文 LLM 只知道谁打了谁，很容易出现「棋盘上铺满油污与货箱、
        // 正文却写他们在草地上交手」的割裂感。
        if (this.terrainScene) {
            report += `战场：${this.terrainScene}\n\n`;
        }

        // 拼接简化战报（手下留情只改副本，不改内存原文）
        report += this.simpleBattleLog.map(line => this._rewriteSparedLogLine(line)).join('\n');

        // 拼接战后属性一览
        report += this.generatePostBattleAttributes(allHeroes);

        return report;
    }

    /**
     * 输出战报到输入框
     * @param {Array} allHeroes - 所有参战角色数组
     */
    outputToInputBox(allHeroes) {
        const report = this.generateBattleReport(allHeroes);

        // 获取输入框元素
        const inputBox = document.getElementById('quick-send-input');
        if (inputBox) {
            inputBox.value = report;

            // 显示临时提示
            const tempMessage = document.createElement('div');
            tempMessage.textContent = '战报已生成到输入框';
            tempMessage.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--color-success);
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: var(--text-md);
                z-index: 100080;
                box-shadow: 0 4px 12px var(--overlay-dark);
            `;
            const topLayer = document.fullscreenElement
                || document.webkitFullscreenElement
                || document.mozFullScreenElement
                || document.msFullscreenElement
                || document.body;
            topLayer.appendChild(tempMessage);

            // 提示只负责告知写入成功；结算页由玩家手动点击「关闭」。
            setTimeout(() => {
                tempMessage.remove();
            }, 3000);
            return true;
        } else {
            console.error('[BattleReporter] 未找到输入框元素 #quick-send-input');
            return false;
        }
    }

    /**
     * 记录详细伤害计算
     * @param {Object} attacker - 攻击者
     * @param {Object} defender - 防御者
     * @param {Object} skill - 技能
     * @param {Object} damageResult - 伤害计算结果
     */
    logDetailedDamageCalculation(attacker, defender, skill, damageResult) {
        const entry = {
            type: 'damage_calculation',
            round: this.currentRound,
            timestamp: Date.now(),
            attacker: attacker.name,
            defender: defender.name,
            skill: skill.name,
            formula: {
                baseDamage: damageResult.baseDamage ?? 0,
                attackPower: damageResult.attackPower ?? 0,
                defensePower: damageResult.defensePower ?? 0,
                finalDamage: damageResult.finalDamage ?? 0,
                criticalHit: damageResult.isCritical ?? false,
                criticalMultiplier: damageResult.criticalMultiplier ?? 1.0
            }
        };

        this.detailedLog.push(entry);
        console.log('[BattleReporter] 记录详细伤害计算:', entry);
    }

    /**
     * 记录属性变化
     * @param {Object} hero - 角色
     * @param {string} attributeName - 属性名称
     * @param {number} oldValue - 旧值
     * @param {number} newValue - 新值
     * @param {string} reason - 变化原因
     */
    logAttributeChange(hero, attributeName, oldValue, newValue, reason) {
        const entry = {
            type: 'attribute_change',
            round: this.currentRound,
            timestamp: Date.now(),
            hero: hero.name,
            attribute: attributeName,
            oldValue: oldValue,
            newValue: newValue,
            change: newValue - oldValue,
            reason: reason
        };

        this.detailedLog.push(entry);
        console.log('[BattleReporter] 记录属性变化:', entry);
    }

    /**
     * 记录技能消耗扣除
     * @param {Object} hero - 角色
     * @param {Object} skill - 技能
     * @param {Object} costResult - 消耗结果
     */
    logCostDeduction(hero, skill, costResult) {
        const entry = {
            type: 'cost_deduction',
            round: this.currentRound,
            timestamp: Date.now(),
            // 🆕 这里的 hero 是**出手方**，所以走别名：从动格出手时记的是虚影。
            // 与之相对，logAttributeChange 的 hero 是挨打的那一方，那边不能改名
            hero: this.actorNameOf(hero),
            skill: skill.name,
            costType: skill.cost?.type || 'unknown',
            costAmount: costResult.oldValue - costResult.newValue,
            oldValue: costResult.oldValue,
            newValue: costResult.newValue
        };

        this.detailedLog.push(entry);
        console.log('[BattleReporter] 记录技能消耗:', entry);
    }

    /**
     * 记录状态效果应用
     * @param {Object} hero - 角色
     * @param {Object} effect - 效果
     * @param {string} action - 动作（'applied' 或 'removed'）
     */
    logEffectApplication(hero, effect, action) {
        const entry = {
            type: 'effect_application',
            round: this.currentRound,
            timestamp: Date.now(),
            hero: hero.name,
            effect: effect.name || effect.type,
            action: action,
            duration: effect.duration ?? 0,
            details: effect
        };

        this.detailedLog.push(entry);
        console.log('[BattleReporter] 记录状态效果:', entry);
    }

    /**
     * 开始新回合
     * @param {number} roundNumber - 回合数
     */
    startNewRound(roundNumber) {
        this.currentRound = roundNumber;
        this.roundActions = [];
        console.log(`[BattleReporter] 开始第 ${roundNumber} 回合`);
    }

    /**
     * 记录回合行动
     * @param {Object} actionData - 行动数据
     */
    logRoundAction(actionData) {
        this.roundActions.push({
            round: this.currentRound,
            timestamp: Date.now(),
            ...actionData
        });
    }

    /**
     * 生成详细战斗报告
     * @param {Array} allHeroes - 所有参战角色
     * @returns {string} 详细战报文本
     */
    generateDetailedReport(allHeroes) {
        let report = '【详细战斗报告】\n\n';

        // 按回合分组详细日志
        const logsByRound = {};
        this.detailedLog.forEach(entry => {
            const round = entry.round || 1;
            if (!logsByRound[round]) {
                logsByRound[round] = [];
            }
            logsByRound[round].push(entry);
        });

        // 生成每回合的详细报告
        Object.keys(logsByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
            report += this.formatRoundBreakdown(parseInt(round), logsByRound[round], allHeroes);
            report += '\n';
        });

        // 添加战后属性一览
        report += this.generatePostBattleAttributes(allHeroes);

        return report;
    }

    /**
     * 格式化回合分解
     * @param {number} roundNumber - 回合数
     * @param {Array} roundLogs - 该回合的日志
     * @param {Array} allHeroes - 所有角色
     * @returns {string} 格式化的回合报告
     */
    formatRoundBreakdown(roundNumber, roundLogs, allHeroes) {
        let breakdown = `=== 第 ${roundNumber} 回合 ===\n\n`;

        // 显示回合开始时的角色状态
        breakdown += '【回合开始时角色状态】\n';
        allHeroes.forEach(hero => {
            if (hero.isAlive()) {
                const vitalityPercent = ((hero.additionalStats.当前活力 / hero.additionalStats.活力) * 100).toFixed(0);
                breakdown += `  ${hero.name}: 活力 ${vitalityPercent}%`;

                // 显示当前效果
                if (hero.effects && hero.effects.length > 0) {
                    const effectNames = hero.effects.map(e => e.name || e.type).join(', ');
                    breakdown += ` [效果: ${effectNames}]`;
                }
                breakdown += '\n';
            }
        });
        breakdown += '\n';

        // 显示该回合的详细行动
        breakdown += '【回合行动详情】\n';
        roundLogs.forEach(log => {
            breakdown += this.formatActionDetails(log);
        });

        return breakdown;
    }

    /**
     * 格式化行动详情
     * @param {Object} log - 日志条目
     * @returns {string} 格式化的行动详情
     */
    formatActionDetails(log) {
        let details = '';

        switch (log.type) {
            case 'damage_calculation':
                details += `  ${log.attacker} 使用 ${log.skill} 攻击 ${log.defender}\n`;
                details += `    伤害计算: 基础伤害=${log.formula.baseDamage}, `;
                details += `攻击力=${log.formula.attackPower}, `;
                details += `防御力=${log.formula.defensePower}, `;
                details += `最终伤害=${log.formula.finalDamage}`;
                if (log.formula.criticalHit) {
                    details += ` [暴击! x${log.formula.criticalMultiplier}]`;
                }
                details += '\n';
                break;

            case 'attribute_change':
                details += `  ${log.hero} 的 ${log.attribute} 变化: ${log.oldValue} → ${log.newValue} (${log.change > 0 ? '+' : ''}${log.change})`;
                details += ` [原因: ${log.reason}]\n`;
                break;

            case 'cost_deduction':
                details += `  ${log.hero} 使用 ${log.skill} 消耗 ${log.costAmount} 点 ${log.costType}`;
                details += ` (${log.oldValue} → ${log.newValue})\n`;
                break;

            case 'effect_application':
                if (log.action === 'applied') {
                    details += `  ${log.hero} 获得效果: ${log.effect}`;
                    if (log.duration > 0) {
                        details += ` (持续 ${log.duration} 回合)`;
                    }
                } else if (log.action === 'removed') {
                    details += `  ${log.hero} 的效果 ${log.effect} 已结束`;
                }
                details += '\n';
                break;

            default:
                details += `  [未知日志类型: ${log.type}]\n`;
        }

        return details;
    }

    /**
     * 清空战报
     */
    clear() {
        this.simpleBattleLog = [];
        this.detailedLog = [];
        this.participatingCharacters.clear();
        this.currentRound = 1;
        this.roundActions = [];
        this.sparedEnemyNames = new Set();
        console.log('[BattleReporter] 战报已清空');
    }
}
    return new BattleReporter();
  }
  function createSkillControlResolver({ Math, SkillControlManager, TacticCatalog, ContestAdvantage }) {
    return {
skillControlContest(caster, target, mode, isLast) {
        const roll = () => 0.8 + Math.random() * 0.4;
        const s = target.additionalStats || {};
        const best = Math.max(
            s.当前活力 ?? 0, s.当前敏捷 ?? 0, s.当前灵性 ?? 0,
            s.当前理智 ?? 0, s.当前人性 ?? 0, s.运气 ?? 0
        );
        const mult = (isLast && mode !== '复制') ? TacticCatalog.LAST_SKILL_MULT : 1;
        const a = (caster.additionalStats.当前灵性 ?? 0)
            * ContestAdvantage.tacticMultiplier(caster, target) * roll();
        const b = best * mult * ContestAdvantage.tacticMultiplier(target, caster) * roll();
        const result = { win: a > b, casterScore: Math.round(a), targetScore: Math.round(b), mult };
        if (caster?.$tacticContext?.borrowId) caster.$tacticContext.rolls.push(result);
        return result;
    },
applySkillControl(bm, caster, target, mode, skillName) {
        const move = SkillControlManager.interferableSkills(target)
            .find(m => m.name === skillName);
        if (!move) return { applied: false, reason: '目标身上已经没有这条技能了' };

        const until = (Number(bm.currentRound) || 0) + TacticCatalog.SKILL_CONTROL_DURATION;
        if (mode === '禁止' || mode === '偷窃') SkillControlManager.ban(target, skillName, until);
        if (mode === '偷窃' || mode === '复制') {
            const ability = SkillControlManager.resolveEligibility(caster.sequenceString)[mode] || mode;
            SkillControlManager.grant(caster, move, until, { fromName: target.name, ability });
        }
        return { applied: true };
    },
    };
  }
  function create(deps) {
    const console = deps.console || globalThis.console;
    const { Math, Hero, LifeSaveManager, TacticCatalog = { ...exileConfig, ...activeLeaveConfig, ...rewindConfig, ...extraConfig, ...hardConfig, ...mindConfig, ...tempConfig, ...controlConfig, ...possessionConfig, ...ruleConfig, ...environmentConfig, ...summonConfig, ...borrowConfig }, EnemyControlManager: suppliedEnemyControl,
      ConsumableMoveBuilder, TacticResolver, OffFieldManager, BattleBoard,
      AttributeCalculator, TurnSkipManager: suppliedTurnSkip, MysteryReenactmentCanonAccess, SkillRange,
      TargetSelector, PossessionManager: suppliedPossession, SkillCostManager, Move,
      SkillControlManager: suppliedSkillControl, parseSequenceRank, terrainEffectsFor,
      DamageCalculator, WeaponAccuracy, TERRAIN_MAX_COST = 10,
      GameDBManager, resolvePathwayFromSequence, AttributeMapper, SkillLoader,
      GrazingProjectionManager, TacticSessionManager } = deps;
    const _ = { cloneDeep: value => structuredClone(value) };
    const battleExpMultiplier = level => 1 + Math.max(0, Math.floor(Number(level) || 0)) * .02;
    const window = { TimePassageEngine: deps.TimePassageEngine,
      GrazingCore: deps.GrazingCore, ShamanPictureMode: deps.ShamanPictureMode,
      PlayerProjectionResolver: deps.PlayerProjectionResolver,
      PlayerBattleProjectionRefresher: deps.PlayerBattleProjectionRefresher };
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

const SequenceTiers = {
    /**
     * 按序列差分层：差距小的在前；同差距时弱者（序列数字大）优先。
     * 一层 = 同一个 (差距, 强弱方向)。
     * @param {Object} hero
     * @param {Array<{unit:Object, side:string}>} candidates
     * @returns {Array<{key:string, members:Array}>}
     */
    build(hero, candidates) {
        const heroSeq = hero.sequenceRank;
        const withMeta = (candidates || []).map(c => ({
            unit: c.unit,
            side: c.side,
            seq: c.unit.sequenceRank,
            diff: Math.abs(c.unit.sequenceRank - heroSeq),
            isLower: c.unit.sequenceRank > heroSeq   // 数字大 = 实力弱
        }));

        withMeta.sort((a, b) => {
            if (a.diff !== b.diff) return a.diff - b.diff;
            if (a.isLower !== b.isLower) return b.isLower - a.isLower;
            return b.seq - a.seq;
        });

        const tiers = [];
        let current = null;
        withMeta.forEach(m => {
            const key = `${m.diff}|${m.isLower}`;
            if (!current || current.key !== key) {
                current = { key, members: [] };
                tiers.push(current);
            }
            current.members.push(m);
        });
        return tiers;
    },

    /**
     * 只取最靠前那一层里的一个人，层内随机。
     * 刻意不复用 CPUManager 的加权抽签：那一套带残血记票与可达退让，
     * 是索敌专用的语义，规则修改只需要「序列最接近的那一个」。
     * @param {Array} units 直接给 Hero 数组，side 在这里没有意义
     */
    nearest(hero, units) {
        if (!hero || !Array.isArray(units) || units.length === 0) return null;
        const tiers = this.build(hero, units.map(u => ({ unit: u, side: 'enemy' })));
        if (!tiers.length) return null;
        const members = tiers[0].members;
        return members[Math.floor(Math.random() * members.length)].unit;
    },
};

const PunishmentManager = {
    CONFIG: {
        pathway: '仲裁人',
        title: '失序者',
        titleRank: -1,
        names: [{ gate: 5, name: '惩戒' }],
    },
    DAMAGE_MULTIPLIER: 1.5,

    eligibility(hero) {
        if (!hero) return { ok: false, rank: null, name: '' };
        const table = { 惩戒: this.CONFIG };
        return AbilityAlias.resolve(hero.sequenceString, table).惩戒
            || { ok: false, rank: null, name: '' };
    },

    eligible(hero) {
        return !!this.eligibility(hero).ok;
    },

    displayName(hero) {
        const e = this.eligibility(hero);
        return (e && e.ok && e.name) ? e.name : TacticCatalog.PUNISHMENT_ACTION;
    },

    findHero(bm, heroId) {
        if (!bm || !heroId) return null;
        return bm.teamManager.getAllHeroes().find(h => h && h.heroId === heroId) || null;
    },

    /**
     * 已建立关系的有效性只看「仍存活且仍是当前敌方」。不检查 OffField：
     * 临时放逐 / 附身隐藏不解除惩戒，回场后会自然恢复攻击优先级与伤害加成。
     * 死亡、缺失或变成同阵营则当场清掉，后续战术阶段可以重新选人。
     */
    currentTarget(bm, caster, clearInvalid = true) {
        const state = caster && caster.punishment;
        if (!state || !state.targetId) return null;
        const target = this.findHero(bm, state.targetId);
        const valid = !!target
            && (target.additionalStats?.当前活力 ?? 0) > 0
            && target.teamType !== caster.teamType;
        if (!valid) {
            if (clearInvalid && caster) caster.punishment = null;
            return null;
        }
        return target;
    },

    /** 新选目标必须实际在场；复用技能目标池的敌我、存活与离场过滤。 */
    candidateTargets(bm, caster, excludeCurrent = true) {
        if (!bm || !caster || typeof TargetSelector === 'undefined') return [];
        const current = this.currentTarget(bm, caster);
        return TargetSelector.getFactionPool({ targetType: 'single' }, caster, bm)
            .filter(target => !excludeCurrent || !current || target.heroId !== current.heroId);
    },

    costOf(hero) {
        return TacticCatalog.spiritCost(hero && hero.sequenceRank);
    },

    hasStat(hero) {
        return (hero?.additionalStats?.当前灵性 ?? 0) > 0;
    },

    spend(hero) {
        const cost = this.costOf(hero);
        const before = hero.additionalStats.当前灵性 ?? 0;
        hero.additionalStats.当前灵性 = Math.max(0, before - cost);
        return { cost, oldValue: before, newValue: hero.additionalStats.当前灵性 };
    },

    blockedReason(bm, caster) {
        if (!this.eligible(caster)) return '当前不具备惩戒资格。';
        if (!this.hasStat(caster)) return '当前灵性为 0，无法发动惩戒。';
        if (!this.candidateTargets(bm, caster, true).length) {
            return this.currentTarget(bm, caster)
                ? '当前没有其他可切换的惩戒对象。'
                : '当前没有可选的惩戒对象。';
        }
        return '';
    },

    /**
     * NPC 选人严格复用行动索敌的三段骨架：序列分层 → 残血记票 → 加权抽签。
     * 没有射程检查——惩戒本身是全局选定；真正出手时仍由 CPUManager 处理射程与移动。
     */
    npcTarget(bm, caster) {
        const pool = this.candidateTargets(bm, caster, true);
        if (!pool.length || !bm.cpuManager) return null;
        const tiers = bm.cpuManager.buildSequenceTiers(
            caster,
            pool.map(unit => ({ unit, side: 'enemy' })),
        );
        for (const tier of tiers) {
            const ballot = bm.cpuManager.buildBallot(tier, [], caster)
                .filter(entry => entry.votes > 0);
            if (!ballot.length) continue;
            const picked = bm.cpuManager.weightedDraw(ballot);
            if (picked && picked.unit) return picked.unit;
        }
        return null;
    },

    activate(bm, caster, target) {
        if (!bm || !caster || !target) return { applied: false, reason: '目标不存在' };
        if (!this.eligible(caster)) return { applied: false, reason: '不具备惩戒资格' };
        if (!this.hasStat(caster)) return { applied: false, reason: '当前灵性为 0' };
        const candidates = this.candidateTargets(bm, caster, true);
        if (!candidates.some(h => h.heroId === target.heroId)) {
            return { applied: false, reason: '目标不是当前可选的敌人' };
        }

        const oldTarget = this.currentTarget(bm, caster);
        const spent = this.spend(caster);
        caster.punishment = {
            targetId: target.heroId,
            targetName: target.name,
            appliedRound: Number(bm.currentRound) || 0,
        };
        return {
            applied: true,
            switched: !!oldTarget,
            oldTarget,
            target,
            spent,
        };
    },

    directDamageMultiplier(attacker, defender) {
        if (!attacker || !defender || !attacker.punishment) return 1;
        if (attacker.punishment.targetId !== defender.heroId) return 1;
        if ((defender.additionalStats?.当前活力 ?? 0) <= 0) return 1;
        if (attacker.teamType === defender.teamType) return 1;
        return this.DAMAGE_MULTIPLIER;
    },
};

const MythicFormDescriptionCatalog = {
    DESCRIPTIONS: Object.freeze({
        '占卜家': '幽深晦暗的蠕虫漩涡，向外伸出无数滑腻触手，由完全透明的灵之虫聚合而成',
        '学徒': '闪烁璀璨光辉的星之虫集合体',
        '偷盗者': '时之虫集合体，半透明虫身上具有十二道透明圆环',
        '秘祈人': '黑色阴影与不断蠕动的血肉结合而成',
        '观众': '灰白色、拥有淡金竖瞳的心灵巨龙',
        '水手': '长着粗壮恐怖触手、周围环绕银白闪电的巨大章鱼状生物',
        '歌颂者': '被金色火焰包裹、仿佛光球的太阳神鸟',
        '阅读者': '由厚重书籍逐层组成、每本书都有黄铜眼睛的虚幻高塔',
        '战士': '体表青黑虬结、血肉结构违背正常感官的独眼巨人',
        '不眠者': '肋部和腰部长有额外四只黑毛手脚的魔狼',
        '收尸人': '覆盖阴绿近黑鳞片、鳞缝长出污黄羽毛的羽蛇',
        '猎人': '以铁黑金属骨架为躯体、笼罩宏伟紫焰并显现灾象符号的火焰灾难巨人',
        '刺客': '黑发如巨蟒、发梢长有黑白眼睛或吐信蛇首的蛇发女妖',
        '通识者': '由诸多文明画卷重叠构成的信息生物',
        '窥秘人': '由无数冰冷无睫眼睛组成的信息巨蛇或巨眼',
        '怪物': '体表密布命运之轮符号、能够首尾相接的巨大水银色蛇',
        '药师': '背负虚幻月亮、拥有鲜红眼睛和蝙蝠翅膀的美之人形具现',
        '耕种者': '长满孕育器官、黄金麦穗、蘑菇、藤蔓与泥土的血肉聚合体',
        '仲裁人': '写满规则的黄铜巨柱',
        '律师': '头戴幽暗皇冠、长有九条手臂的巨型黑色卷毛狒狒',
        '囚犯': '无形的诅咒集合，外显形态由晋升时选择的凭依物束缚和固定',
        '罪犯': '形态随种族、个性与欲望变化，通常具有巨大身躯、深黑皮肤、弯曲羊角与淡蓝硫磺火焰',
        '恶棍': '由层层堆叠的女性生殖器官构成、拥有羽翼的巨大女性',
        '掮客': '不确定且持续变化的雾气',
        '吝啬鬼': '覆盖混沌鳞片、遍布欲望象征并生有一男一女两颗头颅的类人巨树',
        '舞蹈家': '三具身体首尾组成圆环的银黑色三头三身六臂巨人',
        '失梦人': '左侧无眼、中间无臂、右侧无头的三具并排身体，分别纺织、汇聚和裁决命运',
        '天文爱好者': '以大量磁约束聚变团为核心、外形可以变化的聚变生命',
        '流浪汉': '露出白色牙齿、包容混沌液体的幽暗漩涡，仿佛抽象的活体胃袋',
        '萨满': '穿行于不同维度间的维度之影，呈现为处于无法触及高度的薄薄人影',
        '入门者': '没有通常肉体的纯粹意识与精神实体',
        '病患': '由无数病原体组成、青黑肿胀并流出青绿带黄脓液的高度腐烂巨躯',
    }),

    /** 规范完整片段 → 唯一途径短名；零命中或共享称号多命中都拒绝。 */
    exactPathwayOf(fragment) {
        const text = String(fragment || '').trim();
        const pathways = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
            ? GameDBManager.DB.godPathways
            : null;
        if (!text || !pathways || typeof pathways !== 'object') return '';
        const hits = [];
        Object.entries(pathways).forEach(([pathwayFullName, sequences]) => {
            if (!Array.isArray(sequences)) return;
            if (!sequences.some(sequence => String(sequence || '').trim() === text)) return;
            hits.push(String(pathwayFullName || '').replace(/途径$/, '').trim());
        });
        const unique = Array.from(new Set(hits.filter(Boolean)));
        return unique.length === 1 ? unique[0] : '';
    },

    descriptionOfSequence(sequenceString) {
        const fragments = LifeSaveManager.splitSequenceFragments(sequenceString);
        if (!fragments.length) return '';
        const pathways = new Set();
        for (const fragment of fragments) {
            const pathway = this.exactPathwayOf(fragment);
            if (!pathway || !Object.prototype.hasOwnProperty.call(this.DESCRIPTIONS, pathway)) return '';
            pathways.add(pathway);
            if (pathways.size > 1) return '';
        }
        const pathway = pathways.values().next().value;
        return pathway ? String(this.DESCRIPTIONS[pathway] || '') : '';
    },

    descriptionOfHero(hero) {
        if (!hero) return '';
        const baseSequence = String(hero.baseSequenceString || '').trim();
        const originalSequence = String((hero.originalData && hero.originalData.当前序列) || '').trim();
        return this.descriptionOfSequence(baseSequence || originalSequence);
    },
};

// ==========================================
// 2.9b-2 MythicFormManager (战术回合 · 神话生物形态)
//   一个纯机械的开关：不经 LLM 裁定，只看序列。开了就同时吃增伤与减伤两条修正。
//   计时刻意不交给 EffectManager：那套按 triggerTiming 递减，还会每回合往战斗日志
//   与战报各刷一条「效果持续中」，而这个形态要求全程只有一句话。所以两条效果挂的是
//   表里没有的 triggerTiming，引擎永远匹配不到，到期由本模块按绝对回合数自己收。
// ==========================================
const MythicFormManager = {
    /** 挂在效果上的自定义计时 timing。只要不等于 turn_start / round_end，引擎就不会碰它 */
    TIMING: 'mythic_form',
    /** 冷却时间戳落在这个字段。$ 前缀 => AI 看不见也改不了 */
    CD_FIELD: '$神话形态上次使用时间',

    tierOf(rank) {
        return TacticCatalog.mythicTier(rank);
    },

    has(hero) {
        return !!(hero && Array.isArray(hero.effects) && hero.effects.some(e => e && e.mythicForm));
    },

    hasCanon(hero) {
        return !!(hero && Array.isArray(hero.effects) && hero.effects.some(e => e && e.canonMythicForm));
    },

    hasAny(hero) {
        return this.has(hero) || this.hasCanon(hero);
    },

    /**
     * 场上还挂着形态的存活角色数，也就是 NPC 概率公式里的 X。
     * 开过但已过期的不算——tick 早把它们摘干净了。
     */
    countActive(heroes) {
        return (heroes || []).filter(h => TacticResolver.alive(h) && this.hasAny(h)).length;
    },

    /**
     * 观众途径不吃失控。旧日与支柱层面对应观众的都叫「上帝」，
     * 而 resolvePathwayFromSequence 对这两类前缀本来就不可靠（同一条目躺在五条途径里），
     * 所以先按这两个字直接认，再退回正常的途径查找。
     */
    isSpectator(sequenceString) {
        const s = String(sequenceString || '');
        if (s.includes('上帝')) return true;
        try {
            return typeof resolvePathwayFromSequence === 'function'
                && resolvePathwayFromSequence(s) === '观众';
        } catch (e) {
            return false;
        }
    },

    /**
     * 挂上两条伤害修正。不走 EffectManager.applyEffect：它按固定字段白名单重建实例，
     * mythicForm / mythicUntil 会被丢掉，同名替换逻辑对「一次挂两条」也只是干扰。
     * @returns {Object|null} 命中的档位，null 表示序列不够
     */
    apply(hero, round) {
        const tier = this.tierOf(hero && hero.sequenceRank);
        if (!tier || this.hasAny(hero)) return null;
        const until = (Number(round) || 0) + tier.rounds;
        hero.effects = hero.effects || [];
        const base = {
            type: 'buff',
            valueType: 'percentage',
            power: tier.pct,
            duration: tier.rounds,
            triggerTiming: this.TIMING,
            priority: 0,
            mythicForm: true,
            mythicUntil: until,
            appliedAt: Date.now(),
        };
        // 两条必须异名：EffectManager 与各处 UI 都按 name 认效果，同名会互相顶掉
        hero.effects.push({ ...base, name: '神话生物形态·增伤', stat: 'damageDealtIncrease' });
        hero.effects.push({ ...base, name: '神话生物形态·减伤', stat: 'damageTakenDecrease' });
        hero.mythicFormUsed = true;
        return tier;
    },

    /**
     * 到期回收。与 SkillControlManager.tick 同口径：mythicUntil 是绝对回合数，
     * 战术回合排在 finishRound 之后，所以第 N 回合开的（until = N+2）不会被同一次 tick 收走。
     * 静默摘除，不写日志——这个形态从头到尾只允许有一句话。
     */
    tick(hero, round) {
        if (!hero || !Array.isArray(hero.effects)) return;
        hero.effects = hero.effects.filter(e => {
            if (!e || (!e.mythicForm && !e.canonMythicForm)) return true;
            const until = e.canonMythicForm ? e.canonMythicUntil : e.mythicUntil;
            if (round >= until) return false;
            // duration 只用于展示（各处 BUFF 栏都读它），真正的到期判定看 mythicUntil。
            // 不减的话面板上会一直挂着初始回合数，看起来像永久 BUFF
            e.duration = Math.max(1, until - round);
            return true;
        });
    },

    canonCooldown(game, hero) {
        const ok = { ready: true, left: 0 };
        const mvu = game && game.currentMvuState;
        const state = MysteryReenactmentCanonAccess.runtimeState(hero, 'ugly_duckling', false);
        const last = state && state.上次使用时间;
        if (!mvu || !last) return ok;
        const engine = window.TimePassageEngine;
        const toDay = era => {
            if (!engine || !engine._parseEra || !engine._toMinutes) return NaN;
            const minutes = engine._toMinutes(engine._parseEra(era));
            return Number.isFinite(minutes) ? Math.floor(minutes / 1440) : NaN;
        };
        const nowDay = toDay((mvu.world_data && mvu.world_data.当前时间纪元) || '');
        const lastDay = toDay(last);
        if (!Number.isFinite(nowDay) || !Number.isFinite(lastDay)) return ok;
        const passed = nowDay - lastDay;
        if (passed < 0 || passed >= 1) return ok;
        return { ready: false, left: 1 };
    },

    canCanon(game, hero) {
        return MysteryReenactmentCanonAccess.canUseTactic(hero, 'ugly_duckling')
            && !this.hasAny(hero)
            && this.canonCooldown(game, hero).ready;
    },

    applyCanon(hero, round) {
        if (!hero || this.hasAny(hero)) return false;
        const until = (Number(round) || 0) + 1;
        hero.effects = hero.effects || [];
        const base = {
            type: 'buff', valueType: 'percentage', power: 50, duration: 1,
            triggerTiming: this.TIMING, priority: 0,
            canonMythicForm: true, canonMythicUntil: until, appliedAt: Date.now(),
        };
        hero.effects.push({ ...base, name: '神秘再现·丑小鸭·增伤', stat: 'damageDealtIncrease' });
        hero.effects.push({ ...base, name: '神秘再现·丑小鸭·减伤', stat: 'damageTakenDecrease' });
        return true;
    },

    chargeCanon(game, hero) {
        const mvu = game && game.currentMvuState;
        const state = MysteryReenactmentCanonAccess.runtimeState(hero, 'ugly_duckling', true);
        if (!mvu || !state) return;
        state.上次使用时间 = (mvu.world_data && mvu.world_data.当前时间纪元) || '';
        this.persist(game);
    },

    /**
     * NPC 掷骰：概率 = min(CAP, BASE + STEP × X)，每个够格的存活 NPC 各掷一次，互不影响。
     * 一场战斗每人最多开一次，标记打在 Hero 实例上，战斗结束随对象一起丢掉。
     * @returns {Array} 这一轮开了形态的 NPC
     */
    rollNpcs(heroes, playerHero, round, x) {
        const chance = Math.min(
            TacticCatalog.MYTHIC_NPC_CAP,
            TacticCatalog.MYTHIC_NPC_BASE + TacticCatalog.MYTHIC_NPC_STEP * (Number(x) || 0),
        );
        const opened = [];
        (heroes || []).forEach(hero => {
            if (hero === playerHero || !TacticResolver.alive(hero)) return;
            if (hero.mythicFormUsed || this.hasAny(hero)) return;
            if (!this.tierOf(hero.sequenceRank)) return;
            if (Math.random() * 100 >= chance) return;
            if (this.apply(hero, round)) opened.push(hero);
        });
        return opened;
    },

    /**
     * 玩家的 10 天冷却。只看天：两个时刻各自折成绝对天数再比，不要求满 240 小时。
     * 时间读不出来时一律放行——不能因为纪元字符串坏掉就把功能永久封死。
     * @returns {{ready: boolean, left: number}} left 是还差几天
     */
    cooldown(game) {
        const ok = { ready: true, left: 0 };
        const mvu = game && game.currentMvuState;
        const last = mvu && mvu.stat_data && mvu.stat_data[this.CD_FIELD];
        if (!last) return ok;

        const engine = window.TimePassageEngine;
        const toDay = era => {
            if (!engine || !engine._parseEra || !engine._toMinutes) return NaN;
            const m = engine._toMinutes(engine._parseEra(era));
            return Number.isFinite(m) ? Math.floor(m / 1440) : NaN;
        };
        const nowDay = toDay((mvu.world_data && mvu.world_data.当前时间纪元) || '');
        const lastDay = toDay(last);
        if (!Number.isFinite(nowDay) || !Number.isFinite(lastDay)) return ok;

        const passed = nowDay - lastDay;
        // 时间倒流（读档、时间旅行）一律当冷却已过，不留死锁
        if (passed < 0 || passed >= TacticCatalog.MYTHIC_CD_DAYS) return ok;
        return { ready: false, left: TacticCatalog.MYTHIC_CD_DAYS - passed };
    },

    /**
     * 玩家侧的代价：加失控、记冷却时间戳，并静默写回底层存档。
     * 战斗系统平时不往 stat_data 同步，这里是有意的例外——失控与冷却是跨战斗的长期后果，
     * 只活在战斗内存里等于没有代价。
     * @returns {number} 实际增加的失控进度，观众途径为 0
     */
    chargePlayer(game, hero) {
        const tier = this.tierOf(hero && hero.sequenceRank);
        const mvu = game && game.currentMvuState;
        const sd = mvu && mvu.stat_data;
        if (!tier || !sd) return 0;

        let added = 0;
        if (!this.isSpectator(hero.sequenceString)) {
            const old = Number(sd.失控进度) || 0;
            const next = Math.min(100, old + tier.corruption);
            added = next - old;
            sd.失控进度 = next;
        }
        sd[this.CD_FIELD] = (mvu.world_data && mvu.world_data.当前时间纪元) || '';

        this.persist(game);
        return added;
    },

    persist() {},
};

const BattleEventManager = {
    /**
     * 子类配置。资格四件（pathway / title / titleRank / names）交给 AbilityAlias.resolve，
     * 与 FieldEffectManager.SUBTYPES 逐字同构。
     *
     * cost    { stat, ratio }：按 ConsumableMoveBuilder.getAvgAttrs(rank)[stat] × ratio
     *         扣当前值。必成，所以不存在「成败都扣」的问题，发了就扣。
     * damage  { stat, ratio }：同一张表算出每一跳的固定伤害，发动时算死。
     * rounds  这条天灾会结算几个回合。
     * maxUses 每人每场的次数上限。
     * strike  选目标的方式：
     *         { kind: 'randomEnemy', count: n } 每跳随机 n 名敌人；
     *         { kind: 'randomCell', radius: r } 每跳随机一格，切比雪夫半径 r 内不分敌我。
     * ui      参数区文案。rules 收一个已经算好的伤害值。
     * report  出文五件，逐条可省，省掉的回落 FALLBACK_REPORT：
     *         summary       战术结果页那一行
     *         start         发动那一刻的战报行
     *         strike        每回合命中行（names 是已经拼好的一串）
     *         miss          那一跳一个人都没打到
     *         expire        到期行
     */
    SUBTYPES: {
        制造雷暴: {
            pathway: '水手',
            names: [{ gate: 4, name: '制造雷暴' }],
            cost: { stat: '灵性', ratio: 0.05 },
            damage: { stat: '活力', ratio: 0.05 },
            rounds: 3,
            maxUses: 1,
            strike: { kind: 'randomEnemy', count: 1 },
            ui: {
                intro: '在战场上空聚起翻涌的雷云，此后每个回合开始时，雷霆都会落在一名敌人头上。',
                rules: power => [
                    `雷击：每回合开始时随机命中一名当时还站在场上的敌人，造成 ${power} 点活力伤害，持续 3 个回合。`,
                    '伤害直接扣减当前活力，不受防御、暴击与标签克制影响；目标的保命技能仍会照常触发。',
                ],
                tail: '雷云一旦升起就与你无关：你阵亡之后，它仍会把剩下的回合打满。',
            },
            report: {
                summary: (actor, shown, power) =>
                    `✓ ${actor} 使用「${shown}」，战场上空聚起雷云：接下来 3 个回合，`
                    + `每回合开始时会有一名敌人遭到 ${power} 点活力的雷击`,
                start: (actor, shown) => `${actor}使用「${shown}」，战场上空迅速聚起翻涌的雷云。`,
                strike: names => `一道雷霆自雷云中落下，劈中了${names}。`,
                miss: () => '雷云在战场上空翻涌了一轮，没有找到可以落下的目标。',
                expire: () => '战场上空的雷云散去了。',
            },
        },
        制造地震: {
            pathway: '水手',
            names: [{ gate: 4, name: '制造地震' }],
            cost: { stat: '灵性', ratio: 0.10 },
            damage: { stat: '活力', ratio: 0.10 },
            rounds: 2,
            maxUses: 1,
            strike: { kind: 'randomCell', radius: 3 },
            ui: {
                intro: '撼动整片战场的地脉，此后每个回合开始时，地面都会在某一处塌陷。',
                rules: power => [
                    `塌陷：每回合开始时随机选一格，以该格为心、半径 3 格（7×7 的方块）之内的`
                    + `所有人各受 ${power} 点活力伤害，持续 2 个回合。`,
                    '不分敌我：你的同伴，以及你自己，只要站在圈里就一样会被砸到。',
                    '落点完全随机，可能罩不住任何人，那一回合就什么都不会发生。',
                    '伤害直接扣减当前活力，不受防御、暴击与标签克制影响；保命技能仍会照常触发。',
                ],
                tail: '地震一旦发动就与你无关：你阵亡之后，它仍会把剩下的回合震满。',
            },
            report: {
                summary: (actor, shown, power) =>
                    `✓ ${actor} 使用「${shown}」，地脉开始震颤：接下来 2 个回合，`
                    + `每回合开始时会有一处半径 3 格的地面塌陷，圈内不分敌我各受 ${power} 点活力伤害`,
                start: (actor, shown) => `${actor}使用「${shown}」，脚下的大地开始不安地震颤。`,
                strike: names => `大地在战场的一处剧烈塌陷，${names}被卷了进去。`,
                miss: () => '大地在战场的一处剧烈塌陷，那里空无一人。',
                expire: () => '大地的震颤平息了下来。',
            },
        },
    },

    /**
     * 出文兜底。五件措辞全部跟着子类走（写在 SUBTYPES[...].report 里），
     * 这张表只在子类漏配某一键时顶上。理由与 FieldEffectManager.FALLBACK_REPORT 相同：
     * 不让漏配一个键变成整条战术管线抛异常。
     */
    FALLBACK_REPORT: {
        summary: (actor, shown, power) =>
            `✓ ${actor} 使用「${shown}」，战场上出现了持续性的异变，每回合开始时造成 ${power} 点活力伤害`,
        start: (actor, shown) => `${actor}使用「${shown}」，战场上出现了持续性的异变。`,
        strike: names => `战场上的异变波及了${names}。`,
        miss: () => '战场上的异变这一轮没有波及任何人。',
        expire: () => '战场上的异变平息了下来。',
    },

    /** 取一条措辞：子类配了就用子类的。所有出文都必须走这里，别处不要再写第二份兜底 */
    line(cfg, key, ...args) {
        const fn = (cfg && cfg.report && typeof cfg.report[key] === 'function')
            ? cfg.report[key]
            : this.FALLBACK_REPORT[key];
        return fn(...args);
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    cfgOf(subtype) {
        return this.SUBTYPES[subtype] || null;
    },

    roundsOf(subtype) {
        const cfg = this.cfgOf(subtype);
        return Math.max(1, Math.floor(Number(cfg && cfg.rounds) || 1));
    },

    // ---------- 运行期状态 ----------

    /**
     * processes 每条 { casterId, casterName, casterTeam, subtype, shownAs, leftRounds, power }。
     * casterTeam 记的是**发动那一刻**施法者站在哪一边：天灾造出来之后就与他无关了，
     * 他自己中途被转阵营也不该让雷暴掉头去劈原来的队友。
     * used 按 { [heroId]: { [subtype]: n } } 记，与 FieldEffectManager 同构。
     */
    ensure(bm) {
        if (!bm.battleEvent) {
            bm.battleEvent = { processes: [], used: {} };
        }
        if (!bm.battleEvent.used) bm.battleEvent.used = {};
        if (!Array.isArray(bm.battleEvent.processes)) bm.battleEvent.processes = [];
        return bm.battleEvent;
    },

    /** 在场：活着且没有因附身 / 放逐离场。口径同 FieldEffectManager.onField */
    onField(hero) {
        return !!hero && TacticResolver.alive(hero) && !OffFieldManager.isOff(hero);
    },

    // ---------- 资格与显示名 ----------

    eligibility(hero) {
        return AbilityAlias.resolve(hero && hero.sequenceString, this.SUBTYPES);
    },

    eligible(hero) {
        const e = this.eligibility(hero);
        return this.subtypes().some(k => e[k] && e[k].ok);
    },

    /** 够格**且**名额未用完的子类，返回内部键 */
    availableSubtypes(bm, hero) {
        const e = this.eligibility(hero);
        return this.subtypes().filter(k =>
            e[k] && e[k].ok && this.quotaLeft(bm, hero, k) > 0);
    },

    /** 内部键 → 这个人该看到的能力名。与 FieldEffectManager.displayName 逐字同构 */
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

    // ---------- 消耗与伤害 ----------

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

    /**
     * 每一跳的伤害。按**施法者序列的平均属性表**算，与放逐乱流的 exilePoisonPower
     * 同源：强度取决于施术者，与受术者的上限无关。
     * 注意分母与保命的阈值不同源——那边看的是受术者自己的最大活力，所以同一发天灾
     * 打不同的人，触不触发保命是浮动的，这正是本大类天然的序列压制梯度。
     */
    powerOf(hero, subtype) {
        const cfg = this.cfgOf(subtype);
        const d = (cfg && cfg.damage) || {};
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero && hero.sequenceRank);
        return Math.max(1, Math.round((attrs[d.stat] ?? 0) * (Number(d.ratio) || 0)));
    },

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

    // ---------- 发起 ----------

    /**
     * 发动一次。必成，无拼点、无仲裁：登记一条过程就算完事，第一跳要等到
     * 下一个回合开始（战术回合排在 finishRound 之后、beginNextRound 之前）。
     */
    attempt(bm, caster, subtype, summary, results) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || !caster) return;
        const shownAs = this.displayName(caster, subtype);

        this.spend(caster, subtype);
        this.markUsed(bm, caster, subtype);

        const power = this.powerOf(caster, subtype);
        this.ensure(bm).processes.push({
            casterId: caster.heroId,
            casterName: caster.name,
            casterTeam: caster.teamType,
            subtype,
            shownAs,
            leftRounds: this.roundsOf(subtype),
            power,
        });

        summary.push(this.line(cfg, 'summary', caster.name, shownAs, power));
        results.push({
            kind: 'battle-event', stage: 'start',
            actor: caster.name, subtype, shownAs,
        });
    },

    // ---------- 每回合结算 ----------

    /** 这一跳会打到谁。返回 { victims, cx, cy }，cx/cy 只有格子型才有 */
    pickVictims(bm, p) {
        const cfg = this.cfgOf(p.subtype);
        const strike = (cfg && cfg.strike) || {};
        const all = bm.teamManager.getAllHeroes().filter(h => this.onField(h));

        if (strike.kind === 'randomCell') {
            const board = bm.board;
            if (!board) return { victims: [] };
            const cx = Math.floor(Math.random() * board.cols);
            const cy = Math.floor(Math.random() * board.rows);
            const r = Number(strike.radius) || 0;
            // 不分敌我：圈里站着谁就砸谁。离场的人坐标是 null，distance 拿不到有限值，
            // 天然落不进圈，不必另外挡
            const victims = all.filter(h =>
                Number.isFinite(h.x) && Number.isFinite(h.y)
                && BattleBoard.distance(cx, cy, h.x, h.y) <= r);
            return { victims, cx, cy };
        }

        // randomEnemy：阵营按**这一刻**的 teamType 读，短控倒戈过去的人这一轮就算敌人；
        // 比对的基准是发动时记下的 casterTeam，见 ensure 里那段说明
        const foes = all.filter(h => h.teamType !== p.casterTeam);
        const n = Math.max(1, Math.floor(Number(strike.count) || 1));
        return { victims: TacticResolver.shuffle(foes).slice(0, n) };
    },

    /**
     * 扣一个人的血。直接写当前活力，不经 DamageCalculator；但完整走保命。
     * @returns {{before, after, dealt, ls, dead}}
     */
    hurt(bm, hero, power, sourceLabel = '战场事件') {
        const before = Number(hero.additionalStats?.当前活力) || 0;
        const ls = LifeSaveManager.tryAbsorb(hero, power);
        const routed = EffectTransferManager.applyResolvedLoss(bm, hero, '当前活力', ls.damage, {
            sourceKind: '战场事件', sourceLabel,
        });
        const dealt = routed.actualDamage;
        const after = routed.newValue;
        // 实际扣减才算「本轮受过伤」，与 executeAttack / poison 那两处同一口径
        if (dealt > 0) EnemyControlManager.markDamaged(bm, hero);
        return { before, after, dealt, ls, dead: after <= 0 };
    },

    /**
     * 回合开始的统一结算。挂在 BattleManager.beginNextRound 里，
     * 排在 currentRound++ 之后、syncBoardOccupancy 之前——被打死的人要当场让出格子。
     *
     * **出文由本方法自己写完**：叙事主行走 TacticResolver.writeReport（战报与战斗日志
     * 各一份），数值明细行只进战斗日志。刻意不把 results 交回给调用方去写——
     * 两条天灾同时在场时，主行与明细行必须逐条交替，攒到最后一起写会串行。
     * @returns {Array} 已经写过的 results，只供调试与测试查看，调用方不要再写一遍
     */
    tick(bm) {
        const written = [];
        if (!bm || !bm.battleEvent || !bm.teamManager) return written;
        const st = this.ensure(bm);

        st.processes.slice().forEach(p => {
            const cfg = this.cfgOf(p.subtype);
            if (!cfg) {
                st.processes = st.processes.filter(x => x !== p);
                return;
            }

            const { victims, cx, cy } = this.pickVictims(bm, p);
            const hits = [];
            const detail = [];

            if (Number.isFinite(cx) && Number.isFinite(cy)) {
                const r = Number((cfg.strike || {}).radius) || 0;
                detail.push(`　└ 塌陷中心 (${cx}, ${cy})，半径 ${r} 格`);
            }

            victims.forEach(hero => {
                const res = this.hurt(bm, hero, p.power, p.shownAs || '战场事件');
                hits.push(hero.name);
                let bit = `　└ ${hero.name} `;
                if (res.ls && res.ls.triggered) {
                    bit += `用${res.ls.skillName}吸收了 ${res.ls.absorbPct}% 伤害，`;
                }
                bit += `受到 ${res.dealt} 点活力伤害（当前活力: ${res.before} → ${res.after}）`;
                if (res.dead) bit += ` - ${hero.name} 被击败！`;
                detail.push(bit);
            });

            const strikeResult = {
                kind: 'battle-event', stage: hits.length ? 'strike' : 'miss',
                subtype: p.subtype, shownAs: p.shownAs, names: hits.slice(),
            };
            TacticResolver.writeReport(bm, [strikeResult], null);
            written.push(strikeResult);
            // 明细行排在主行之后：主行说「谁被劈了」，明细说「掉了多少」
            detail.forEach(l => {
                if (bm.battleLogger) bm.battleLogger.log(l, 'damage');
            });

            p.leftRounds -= 1;
            if (p.leftRounds <= 0) {
                st.processes = st.processes.filter(x => x !== p);
                const expireResult = {
                    kind: 'battle-event', stage: 'expire',
                    subtype: p.subtype, shownAs: p.shownAs,
                };
                TacticResolver.writeReport(bm, [expireResult], null);
                written.push(expireResult);
            }
        });

        return written;
    },

    // ---------- 玩家侧 ----------

    /** 按钮为什么点不了。返回空串表示可用。不传 subtype 时只查大类级的两条 */
    blockedReason(bm, hero, subtype) {
        if (!hero) return '场上没有你可操作的角色。';
        if (!this.eligible(hero)) return `你没有可用的${TacticCatalog.BATTLE_EVENT_ACTION}能力。`;
        if (!subtype) return '';
        if (this.quotaLeft(bm, hero, subtype) <= 0) {
            return '你本场已经用完了这条能力的次数。';
        }
        if (!this.hasStat(hero, subtype)) {
            return `当前${this.statKeyOf(subtype)}为 0，无法${TacticCatalog.BATTLE_EVENT_ACTION}。`;
        }
        return '';
    },

    // ---------- NPC ----------

    /**
     * 这一发有没有意义。雷暴要求场上还有敌人——空放虽然不报错，但让 NPC 白烧一个
     * 动作位和一份灵性去劈空气没有道理。地震不分敌我，只要自己还站着就永远有意义。
     */
    worthwhile(bm, caster, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || !bm || !caster) return false;
        if ((cfg.strike || {}).kind !== 'randomEnemy') return true;
        return bm.teamManager.getAllHeroes()
            .some(h => this.onField(h) && h.teamType !== caster.teamType);
    },

    /** 随机挑一发够格、还有名额、属性够扣、且落得到实处的 */
    npcPlan(bm, hero, forcedSubtype = '') {
        const subs = this.availableSubtypes(bm, hero)
            .filter(s => (!forcedSubtype || s === forcedSubtype)
                && this.hasStat(hero, s) && this.worthwhile(bm, hero, s));
        const list = TacticResolver.shuffle(subs);
        return list.length ? { subtype: list[0] } : null;
    },

    /** 这一轮要不要掷骰。判据与 npcPlan 共用，口径同 FieldEffectManager.npcShouldTry */
    npcShouldTry(bm, hero) {
        if (!this.canUse(bm, hero)) return false;
        return !!this.npcPlan(bm, hero);
    },
};

const RewindManager = {
    /**
     * 子类配置。rewind 是**字段组白名单**，与 FIELDS 里的 group 对应；
     * title 是称号兜底，与秘偶化、召唤认「诡秘之主」是同一套写法。
     */
    SUBTYPES: {
        [TacticCatalog.REWIND_BORROW]: {
            pathway: '占卜家',
            gate: TacticCatalog.REWIND_BORROW_RANK_GATE,
            title: TacticCatalog.REWIND_BORROW_TITLE,
            maxPerCaster: TacticCatalog.REWIND_BORROW_MAX_PER_CASTER,
            // 必成、零消耗，所以既没有 contest 也没有 spend。留着这两个标记是给 UI
            // 与将来可能出现的「要拼点的回溯子类」看的
            sure: true,
            cost: null,
            // 理智见底也能用：回溯本身不吃理智，而它恰恰是把理智捞回来的手段。
            // 这个标记由 TacticRoundUI.validate 读，用来跳过那道理智闸门
            sanityExempt: true,
            rewind: ['stats', 'engineMirror'],
            desc: '从过去的自己借取力量',
        },
        [TacticCatalog.REWIND_TIME]: {
            pathway: '偷盗者',
            gate: TacticCatalog.REWIND_TIME_RANK_GATE,
            title: TacticCatalog.REWIND_TIME_TITLE,
            maxPerCaster: TacticCatalog.REWIND_TIME_MAX_PER_CASTER,
            sure: true,
            cost: null,
            sanityExempt: true,
            rewind: ['stats', 'engineMirror'],
            desc: '以时间权柄回到过去的自己',
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    // ---------- 字段登记表 ----------
    //   scope 三档，决定一个字段能不能被还原：
    //     self       纯自身，还原安全
    //     entangled  与他人纠缠，还原就等于篡改别人的投入，**任何子类都不给**
    //     resource   自身的本场配额，语义上是「已经付出的代价」，不退
    //   entangled 与 resource 登记而不是干脆不写，是为了让「这一项为什么不还原」
    //   有一个可查的地方——否则以后加子类的人会以为是漏了。

    FIELDS: [
        {
            key: 'additionalStats',
            group: 'stats',
            scope: 'self',
            get: hero => ({ ...(hero.additionalStats || {}) }),
            set: (hero, val) => { hero.additionalStats = { ...(val || {}) }; },
        },
        {
            key: 'baseStats',
            group: 'stats',
            scope: 'self',
            // buff / debuff 重算读的是这份基础值快照，必须与当前值同组还原，
            // 否则回溯后第一次重算就会拿旧基准去推新当前值
            get: hero => ({ ...(hero.baseStats || {}) }),
            set: (hero, val) => { hero.baseStats = { ...(val || {}) }; },
        },
        {
            key: 'engineMirror',
            group: 'engineMirror',
            scope: 'self',
            // battle-engine 那套标准字段。伤害公式与 AttributeCalculator 读的是它们，
            // 只还原 additionalStats 会让两边脱钩
            get: hero => ({
                health: hero.health,
                maxHealth: hero.maxHealth,
                currentHealth: hero.currentHealth,
                attack: hero.attack,
                defense: hero.defense,
                speed: hero.speed,
                level: hero.level,
            }),
            set: (hero, val) => {
                const v = val || {};
                Object.keys(v).forEach(k => {
                    if (v[k] !== undefined) hero[k] = v[k];
                });
            },
        },

        // ---------- 以下只登记，永不还原 ----------
        { key: 'effects', group: 'effects', scope: 'entangled',
          note: '别人施加的 debuff / poison 都在这里；秘偶层数的攻防速减益也在这里' },
        { key: 'tags', group: 'tags', scope: 'entangled',
          note: '标签绝大多数由他人的攻击打上' },
        { key: 'skillControl', group: 'skillControl', scope: 'entangled',
          note: '被禁的技能是敌方花灵性换来的，还回去等于抹掉他那一次成功' },
        { key: 'teamType', group: 'allegiance', scope: 'entangled',
          note: '征服 / 奴役 / 驯化 / 秘偶满层 / 短控的转阵营' },
        { key: 'controller', group: 'allegiance', scope: 'entangled', note: '同上' },
        { key: 'possessedHidden', group: 'possession', scope: 'entangled',
          note: '被附身而离场；还原它会与 PossessionManager 的过程表直接打架' },
        { key: 'possessing', group: 'possession', scope: 'entangled', note: '同上' },
        { key: 'exiled', group: 'exile', scope: 'entangled',
          note: '被放逐而离场；还原它会与 ExileManager 的过程表直接打架' },
        { key: 'turnSkip', group: 'turnSkip', scope: 'entangled',
          note: '昏迷等跳过标记，由他人打上' },
        { key: 'mindDepriveMove', group: 'mindDeprive', scope: 'entangled',
          note: '瘫软的移动力惩罚，由他人打上' },
        { key: 'position', group: 'position', scope: 'entangled',
          note: '刻意归到不可还原：坐标本身是自身状态，但还原它会和棋盘占位、'
              + '以及因附身离场的 x === null 打架。回溯只管数值，人留在原地' },

        { key: 'rewindUsed', group: 'rewindQuota', scope: 'resource',
          note: '回溯次数自己不回溯，否则一次就是无限次' },
        { key: 'summonCounts', group: 'summonQuota', scope: 'resource',
          note: '召唤名额不回溯：历史投影已经召出去的那几次是已付出的代价' },
        { key: 'controlUsed', group: 'controlQuota', scope: 'resource',
          note: '征服 / 心灵 / 奴役 / 驯化的本场一次性名额，同上' },
        { key: 'lifeSave', group: 'lifeSaveQuota', scope: 'resource',
          note: '保命次数不回溯：消耗掉它的那一下是敌人打出来的，'
              + '还回去等于抹掉敌人一次有效攻击' },
        { key: 'mythicForm', group: 'mythicQuota', scope: 'resource',
          note: '形态 BUFF、mythicFormUsed、已加的失控与 10 天冷却全部保持现状' },
    ],

    /**
     * 这个子类真正可以还原的字段。守卫在这里：白名单点到 entangled / resource 的组
     * 就是配置写错了，报错并剔掉，不静默执行——这是「回溯永不影响别人」的最后一道闸。
     */
    fieldsFor(subtype) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg) return [];
        const want = new Set(cfg.rewind || []);
        this.FIELDS.forEach(f => {
            if (!want.has(f.group) || f.scope === 'self') return;
            console.error(`[RewindManager] ${subtype} 的白名单点到了不可回溯的字段 ${f.key}`
                + `（scope=${f.scope}），已跳过：${f.note || ''}`);
        });
        return this.FIELDS.filter(f => f.scope === 'self'
            && want.has(f.group)
            && typeof f.set === 'function');
    },

    // ---------- 运行期状态 ----------

    ensure(bm) {
        if (!bm.rewind) {
            bm.rewind = {
                // { [heroId]: { [round]: snap } }。只存有资格的单位，见 needsSnapshot
                snapshots: {},
                // { [heroId]: { [subtype]: count } }。按子类分开记：将来多一条子类时
                // 两者的次数互不占用，与「观众与水手都叫上帝」那条同一处理
                used: {},
            };
        }
        return bm.rewind;
    },

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    // ---------- 资格与次数 ----------

    /**
     * 与 SummonManager.resolveEligibility 同构：称号走 includes，途径片段走
     * pathwayShort + 序列门槛，多途径按段合并。
     */
    resolveEligibility(sequenceString) {
        const s = String(sequenceString || '');
        const result = {};
        this.subtypes().forEach(k => { result[k] = false; });

        Object.entries(this.SUBTYPES).forEach(([name, cfg]) => {
            if (cfg.title && s.includes(cfg.title)) result[name] = true;
        });
        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            const rank = Number(r.rank);
            Object.entries(this.SUBTYPES).forEach(([name, cfg]) => {
                if (r.pathwayShort === cfg.pathway && rank <= cfg.gate) result[name] = true;
            });
        });
        return result;
    },

    usedOf(bm, hero, subtype) {
        if (!hero) return 0;
        const row = this.ensure(bm).used[hero.heroId];
        return Number(row && row[subtype]) || 0;
    },

    quotaLeft(bm, hero, subtype) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !hero) return 0;
        return Math.max(0, cfg.maxPerCaster - this.usedOf(bm, hero, subtype));
    },

    /** 有资格且名额未满的子类。UI 要能逐条置灰，所以给的是列表而不是布尔 */
    availableSubtypes(bm, hero) {
        if (!hero) return [];
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().filter(k => elig[k] && this.quotaLeft(bm, hero, k) > 0);
    },

    /**
     * 能不能回溯。召唤物一律不许：它自己就是从历史里捞出来的，再给它一次回溯，
     * 每一代都能刷新一次名额，理由与「召唤物不许再召唤」一致。
     */
    canUse(bm, hero) {
        if (!hero || hero.isSummon) return false;
        return this.availableSubtypes(bm, hero).length > 0;
    },

    // ---------- 快照 ----------

    /** 只给有资格的单位拍。序列在一场战斗内不变，所以这个判据是静态的 */
    needsSnapshot(hero) {
        if (!hero || hero.isSummon) return false;
        // “定义 / 窃取”可能在后续战术阶段借到回溯能力。必须从第1回合起为这类
        // 实际施法者拍自身快照；否则第一次借到回溯时历史为空，能力必然不可用。
        if (typeof AbilityBorrowManager !== 'undefined' && AbilityBorrowManager.eligible(hero)) return true;
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().some(k => elig[k]);
    },

    /**
     * 拍下「这一回合开始的瞬间」。挂在 initializeRound 之后调用。
     * 同一回合重复拍以最后一次为准——不会发生，但也不该炸。
     */
    snapshot(bm, hero, round) {
        const r = Number(round);
        if (!bm || !hero || !Number.isFinite(r) || r <= 0) return null;
        const state = this.ensure(bm);
        if (!state.snapshots[hero.heroId]) state.snapshots[hero.heroId] = {};

        const snap = {};
        this.FIELDS.forEach(f => {
            if (f.scope !== 'self' || typeof f.get !== 'function') return;
            snap[f.key] = f.get(hero);
        });
        state.snapshots[hero.heroId][r] = snap;
        return snap;
    },

    snapshotAll(bm) {
        if (!bm || !bm.teamManager) return;
        const round = Number(bm.currentRound) || 0;
        if (round <= 0) return;
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (!this.needsSnapshot(hero)) return;
            this.snapshot(bm, hero, round);
        });
    },

    /** 面板上要并排显示的几项。运气与神性不列：它们在战斗里基本不动 */
    PREVIEW_KEYS: ['当前活力', '当前灵性', '当前理智', '当前人性', '当前敏捷'],

    /**
     * 可回溯的回合，按回合号升序。每条带那一刻的六维预览与相对现状的活力差，
     * 面板直接拿去渲染。
     * @returns {Array<{round, stats, maxStats, vitality, vitalityDelta, differs}>}
     */
    availableRounds(bm, hero) {
        if (!bm || !hero) return [];
        const bag = this.ensure(bm).snapshots[hero.heroId] || {};
        const now = hero.additionalStats || {};

        return Object.keys(bag)
            .map(Number)
            .filter(r => Number.isFinite(r))
            .sort((a, b) => a - b)
            .map(round => {
                const s = (bag[round] && bag[round].additionalStats) || {};
                const stats = {};
                const maxStats = {};
                let differs = false;
                this.PREVIEW_KEYS.forEach(k => {
                    stats[k] = Number(s[k]) || 0;
                    maxStats[k] = Number(s[k.replace('当前', '')]) || 0;
                    if (stats[k] !== (Number(now[k]) || 0)) differs = true;
                });
                return {
                    round,
                    stats,
                    maxStats,
                    vitality: Number(s.当前活力) || 0,
                    vitalityDelta: (Number(s.当前活力) || 0) - (Number(now.当前活力) || 0),
                    // 与现状逐项相同的回合回溯了也没有任何变化，面板要能把它标出来
                    differs,
                };
            });
    },

    /** 有没有一个回合与现状不同。全都一样就不该让玩家白丢一个动作位 */
    hasUsefulRound(bm, hero) {
        return this.availableRounds(bm, hero).some(r => r.differs);
    },

    /**
     * 活力最高的回合。并列取更晚的那一个：更晚意味着别的属性通常也更接近现状，
     * 回溯的附带损失更小。只给 NPC 用，返回 null 表示没有任何快照。
     */
    bestVitalityRound(bm, hero) {
        const rows = this.availableRounds(bm, hero);
        if (!rows.length) return null;
        // rows 是升序，所以 >= 会让并列的后者胜出
        return rows.reduce((best, r) => (!best || r.vitality >= best.vitality ? r : best), null);
    },

    /**
     * NPC 该不该回溯。不掷骰：符合条件必然触发，优先级最高。
     * 第二条闸门挡的是「回溯了也不会更好」——那样只是白丢一个动作位。
     */
    npcShouldRewind(bm, hero) {
        if (!this.canUse(bm, hero)) return false;
        const s = hero.additionalStats || {};
        const max = Number(s.活力) || 0;
        if (max <= 0) return false;
        if ((Number(s.当前活力) || 0) / max >= TacticCatalog.REWIND_NPC_HP_RATIO) return false;
        const best = this.bestVitalityRound(bm, hero);
        return !!best && best.vitality > (Number(s.当前活力) || 0);
    },

    /** NPC 的子类选取：有资格的里取第一条。只有一条时就是它 */
    npcSubtypeOf(bm, hero) {
        return this.availableSubtypes(bm, hero)[0] || '';
    },

    // ---------- 玩家侧闸门 ----------

    /**
     * 回溯按钮为什么点不了。返回空串表示可用。
     * 与附身 / 短控 / 心智剥夺 / 召唤同一原则：办不到的事不让玩家白花一个动作位。
     * 刻意**不查理智**：回溯不吃理智，理智见底恰恰是最需要它的时候。
     */
    blockedReason(bm, hero) {
        if (!hero) return '场上没有你可操作的角色。';
        if (hero.isSummon) return '召唤物无法回溯。';
        const elig = this.resolveEligibility(hero.sequenceString);
        if (!this.subtypes().some(k => elig[k])) return '你没有可用的回溯手段。';
        if (!this.availableSubtypes(bm, hero).length) {
            return '你本场的回溯次数已经用完了。';
        }
        if (!this.availableRounds(bm, hero).length) {
            return '还没有可以回溯的回合记录。';
        }
        if (!this.hasUsefulRound(bm, hero)) {
            return '每一个回合的状态都与现在完全相同，回溯不会带来任何变化。';
        }
        return '';
    },

    // ---------- 还原 ----------

    /**
     * 六维当前值 → battle-engine 镜像字段。口径抄 SkillCostManager.setCurrentAttributeValue。
     * 排在字段还原之后兜一遍：快照里的镜像值与 additionalStats 本来就取自同一刻，
     * 这一步只是防御——将来若有子类只还原 stats 不还原 engineMirror，两边也不会脱钩。
     */
    syncMirror(hero) {
        const s = hero.additionalStats || {};
        const cur = Number(s.当前活力);
        if (Number.isFinite(cur)) {
            hero.health = cur;
            hero.currentHealth = cur;
        }
        const max = Number(s.活力);
        if (Number.isFinite(max)) hero.maxHealth = max;
        const agi = Number(s.当前敏捷);
        if (Number.isFinite(agi)) hero.speed = agi;
        const div = Number(s.神性);
        if (Number.isFinite(div)) hero.level = div;
    },

    /**
     * 执行一次回溯。必定成功——返回 false 只表示这次压根没发生（没名额、没快照），
     * 不表示「拼点输了」。
     * 只写 summary 与 results，不直接写战斗日志：writeReport 会把 results
     * 各往战报与日志里写一份，这里再写一次就是双份。
     * @returns {boolean}
     */
    apply(bm, hero, subtype, round, summary, results) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !hero) return false;
        if (this.quotaLeft(bm, hero, subtype) <= 0) return false;

        const bag = this.ensure(bm).snapshots[hero.heroId] || {};
        const snap = bag[Number(round)];
        if (!snap) return false;

        const before = Number(hero.additionalStats?.当前活力) || 0;

        this.fieldsFor(subtype).forEach(f => {
            if (!(f.key in snap)) return;
            f.set(hero, snap[f.key]);
        });
        this.syncMirror(hero);

        const state = this.ensure(bm);
        if (!state.used[hero.heroId]) state.used[hero.heroId] = {};
        state.used[hero.heroId][subtype] = (Number(state.used[hero.heroId][subtype]) || 0) + 1;

        const after = Number(hero.additionalStats?.当前活力) || 0;
        const tail = after === before ? '' : `（当前活力 ${before} → ${after}）`;
        if (Array.isArray(summary)) {
            summary.push(`⏳ ${hero.name} ${subtype}，状态回到第 ${round} 回合开始时${tail}`);
        }
        if (Array.isArray(results)) {
            results.push({ kind: 'rewind', actor: hero.name, subtype, round });
        }
        return true;
    },
};

const ExtraActionManager = {
    /**
     * 子类配置。形状与 ExileManager.SUBTYPES 同构（称号兜底 + 途径短名 + 序列门槛），
     * 另加本大类特有的四组：
     *   tiers   按序列分档给「次数 / 每次几个额外行动」，取 rank ≤ gate 里 gate 最小的一档，
     *           口径与 AbilityAlias.pick 完全一致。支柱 -2 与旧日 -1 天然落最强档；
     *           小数按「没到就取上一档」——序列 0.5 没到 0，吃序列 1 那一档。
     *   slot    从动格的行为标记，见模块顶部说明。
     *   naming  行动主体的改名规则。给 null 就不改名，战报照常写本体名——
     *           将来那种「只是多打一下、没有分身意象」的子类走这条路。
     *   report  战报与日志措辞。意象必须跟着子类走，不能写死在 writeReport 里。
     */
    SUBTYPES: {
        [TacticCatalog.EXTRA_BLINK]: {
            pathway: '学徒',
            gate: TacticCatalog.EXTRA_BLINK_RANK_GATE,
            title: TacticCatalog.EXTRA_BLINK_TITLE,
            // 称号兜底命中时按支柱级记档：「诡秘之主」本身就代表多途径，
            // 不写这一条会被 AbilityAlias.titleRankOf 落到 gate（序列 4）那一档上
            titleRank: -2,
            // 必成、无拼点。留着这个标记是给 UI 与将来「要拼点的额外行动子类」看的
            sure: true,
            cost: {
                stat: TacticCatalog.EXTRA_ACTION_CASTER_STAT,
                ratio: TacticCatalog.EXTRA_ACTION_RATIO,
            },
            // 兑现时机。现在只实现 'nextRound'；'immediate'（本回合立刻多一次）
            // 留给将来——届时只需在 expand 之外补一个往当前队列 splice 的分支，
            // 数据结构与所有调用点都不用动
            timing: 'nextRound',
            tiers: [
                { gate: 0, uses: 3, count: 2 },
                { gate: 1, uses: 2, count: 2 },
                { gate: 4, uses: 2, count: 1 },
            ],
            slot: {
                skipTurnStart: true,
                freezeDurations: true,
                refreshMove: true,
                onBoard: false,
            },
            naming: { unit: '虚影', join: '的' },
            desc: '分出虚影，抢下额外的行动机会',
            report: {
                tactic: (actor, count, shown) => `${actor}使用了${shown}，创造出${count}个虚影。`,
            },
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    cfgOf(subtype) {
        return this.SUBTYPES[subtype] || null;
    },

    // ---------- 运行期状态 ----------

    ensure(bm) {
        // 没有 bm 时给一份一次性的空壳：本模块的读接口（usedOf / quotaLeft）会被
        // UI 在各种时机调到，不该因为拿不到战斗实例就抛
        if (!bm) return { used: {}, pending: {} };
        if (!bm.extraAction) {
            bm.extraAction = {
                // { [heroId]: { [subtype]: 次数 } }。按子类分开记，将来多一条子类时
                // 两者的次数互不占用，与回溯的 used 同一处理
                used: {},
                // { [heroId]: [ { subtype, count, slot, naming, shownAs } ] }。
                // 待兑现的授权，由 expand 一次性取走。**不进 RewindManager.FIELDS**：
                // 它挂在 bm 上而不是 Hero 上，回溯压根够不着，天然符合
                // 「本场配额属于已付出的代价、不退」那条既定口径
                pending: {},
            };
        }
        return bm.extraAction;
    },

    // ---------- 序数 ----------

    CN_ORDINAL: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],

    /** 中文序数。超出表就退回阿拉伯数字，不炸 */
    ordinalText(n) {
        const i = Number(n);
        if (!Number.isFinite(i) || i < 0) return String(n);
        return this.CN_ORDINAL[i] || String(i);
    },

    /**
     * 行动主体的显示名。naming 为 null 的子类返回空串，调用方据此回落到本体名。
     * @param {Hero} hero 本体
     * @param {Object} naming 子类的 naming 配置
     * @param {number} ordinal 这是第几个额外行动格，从 1 起
     */
    aliasOf(hero, naming, ordinal) {
        if (!hero || !naming || !naming.unit) return '';
        return `${hero.name}${naming.join || '的'}第${this.ordinalText(ordinal)}个${naming.unit}`;
    },

    /**
     * 「第一个虚影」这半截，不带主人名。回合面板标题与演出横幅要的是
     * 「克莱恩 的回合（第一个虚影）」这种写法，主人名已经在前面了，不能再重复一遍。
     * 本体格与 naming 为 null 的子类返回空串。
     * @param {Object} slot TurnManager.turnSlots 里的一格
     */
    tagOf(slot) {
        if (!slot || !slot.extra || !slot.naming || !slot.naming.unit) return '';
        return `第${this.ordinalText(slot.extra)}个${slot.naming.unit}`;
    },

    // ---------- 资格与分档 ----------

    /**
     * 逐子类解析资格。**直接借 AbilityAlias.resolve**，因为分档要的正是它多带出来的
     * 那个 rank：混途径角色「序列1-偷盗者 / 序列3-学徒」整体 rank 是 1，但闪现该按
     * 学徒那一段的 3 判档，只看 hero.sequenceRank 会白送他两个虚影。
     * @returns {Object} { [子类内部键]: { ok, rank, name } }
     */
    resolveEligibility(sequenceString) {
        return AbilityAlias.resolve(sequenceString, this.SUBTYPES);
    },

    /** 显示名。没有别名阶梯时就是子类内部键 */
    displayName(hero, subtype) {
        if (!hero) return String(subtype);
        const r = this.resolveEligibility(hero.sequenceString)[subtype];
        return (r && r.name) || String(subtype);
    },

    /** rank → 档位。取 rank ≤ gate 里 gate 最小的那一档，与 AbilityAlias.pick 同口径 */
    tierOf(subtype, rank) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || !Array.isArray(cfg.tiers)) return null;
        const r = Number(rank);
        if (!Number.isFinite(r)) return null;
        let best = null;
        cfg.tiers.forEach(t => {
            const gate = Number(t && t.gate);
            if (!Number.isFinite(gate) || r > gate) return;
            if (!best || gate < Number(best.gate)) best = t;
        });
        return best;
    },

    /** 这个人在这条子类上的档位。不够格返回 null */
    tierForHero(hero, subtype) {
        if (!hero) return null;
        const r = this.resolveEligibility(hero.sequenceString)[subtype];
        if (!r || !r.ok) return null;
        return this.tierOf(subtype, r.rank);
    },

    /** 本场总次数 */
    usesOf(hero, subtype) {
        const tier = this.tierForHero(hero, subtype);
        return tier ? Math.max(0, Number(tier.uses) || 0) : 0;
    },

    /** 一次发动给几个额外行动格。将来要随局势浮动就把 count 写成函数，在这里调用 */
    countOf(hero, subtype) {
        const tier = this.tierForHero(hero, subtype);
        if (!tier) return 0;
        const c = typeof tier.count === 'function' ? tier.count(hero) : tier.count;
        return Math.max(0, Number(c) || 0);
    },

    usedOf(bm, hero, subtype) {
        if (!hero) return 0;
        const row = this.ensure(bm).used[hero.heroId];
        return Number(row && row[subtype]) || 0;
    },

    quotaLeft(bm, hero, subtype) {
        return Math.max(0, this.usesOf(hero, subtype) - this.usedOf(bm, hero, subtype));
    },

    /**
     * 谁不许用：召唤物与袋内单位（分身 / 秘偶）。
     * 召唤物的理由与回溯、召唤那两处一致——它本身就是临时造出来的，再给它额外行动，
     * 每一代都能刷新一份名额；袋内单位同理，它们是玩家口袋里的消耗品而非本人。
     */
    forbidden(hero) {
        return !!(hero && (hero.isSummon || hero.playSource));
    },

    /** 有资格、有名额的子类。UI 要能逐条置灰，所以给的是列表而不是布尔 */
    availableSubtypes(bm, hero) {
        if (!hero || this.forbidden(hero)) return [];
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().filter(k => elig[k] && elig[k].ok
            && this.quotaLeft(bm, hero, k) > 0);
    },

    canUse(bm, hero) {
        return this.availableSubtypes(bm, hero).length > 0;
    },

    // ---------- 消耗 ----------

    statKeyOf(subtype) {
        const cfg = this.cfgOf(subtype);
        return (cfg && cfg.cost && cfg.cost.stat) || TacticCatalog.EXTRA_ACTION_CASTER_STAT;
    },

    fieldOf(statKey) {
        return `当前${statKey}`;
    },

    /**
     * 一次发动的消耗。默认档（平均灵性 10%）走 TacticCatalog 那个入口，与其余十套
     * 同一张表；子类若另配比例或另换属性，就在这里按同样的算法现算。
     */
    costOf(hero, subtype) {
        const cfg = this.cfgOf(subtype);
        const c = cfg && cfg.cost;
        if (!hero || !c) return 0;
        if (c.stat === TacticCatalog.EXTRA_ACTION_CASTER_STAT
            && c.ratio === TacticCatalog.EXTRA_ACTION_RATIO) {
            return TacticCatalog.extraActionCost(hero.sequenceRank);
        }
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero.sequenceRank);
        return Math.max(1, Math.round((attrs[c.stat] ?? 0) * Number(c.ratio || 0)));
    },

    /**
     * 门槛沿用现有惯例：当前值大于 0 即可发动，扣到 0 为止。
     * 与操控 / 放逐 / 召唤完全一致，不为本大类单开一套「必须够扣」。
     */
    hasStat(hero, subtype) {
        if (!hero) return false;
        const field = this.fieldOf(this.statKeyOf(subtype));
        return (hero.additionalStats?.[field] ?? 0) > 0;
    },

    /** 扣费。必成，所以没有「先扣再拼」之说，扣完就是既成事实 */
    spend(hero, subtype) {
        const key = this.statKeyOf(subtype);
        const field = this.fieldOf(key);
        const cost = this.costOf(hero, subtype);
        const before = hero.additionalStats[field] ?? 0;
        hero.additionalStats[field] = Math.max(0, before - cost);
        return { key, field, cost };
    },

    // ---------- 玩家侧闸门 ----------

    /**
     * 按钮为什么点不了。返回空串表示可用。
     * 与召唤 / 回溯 / 放逐同一原则：办不到的事不让玩家白花一个动作位。
     */
    blockedReason(bm, hero) {
        if (!hero) return '场上没有你可操作的角色。';
        if (this.forbidden(hero)) return `召唤物无法使用${TacticCatalog.EXTRA_ACTION_ACTION}。`;
        const elig = this.resolveEligibility(hero.sequenceString);
        if (!this.subtypes().some(k => elig[k] && elig[k].ok)) {
            return `你没有可用的${TacticCatalog.EXTRA_ACTION_ACTION}手段。`;
        }
        if (!this.availableSubtypes(bm, hero).length) {
            return `你本场的${TacticCatalog.EXTRA_ACTION_ACTION}次数已经用完了。`;
        }
        const subtype = this.availableSubtypes(bm, hero)[0];
        if (!this.hasStat(hero, subtype)) {
            return `当前${this.statKeyOf(subtype)}为 0，无法发动。`;
        }
        return '';
    },

    // ---------- 发动 ----------

    /**
     * 发动一次额外行动。必定成功——返回 false 只表示这次压根没发生（没资格、没名额、
     * 属性见底），不表示「拼点输了」。
     * 只写 summary 与 results，不直接写战斗日志：writeReport 会把 results 各往战报与
     * 日志里写一份，这里再写一次就是双份。
     * @returns {boolean}
     */
    grant(bm, hero, subtype, summary, results) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || !hero || this.forbidden(hero)) return false;
        if (this.quotaLeft(bm, hero, subtype) <= 0) return false;
        if (!this.hasStat(hero, subtype)) return false;
        const count = this.countOf(hero, subtype);
        if (count <= 0) return false;

        const spent = this.spend(hero, subtype);
        const shownAs = this.displayName(hero, subtype);
        const state = this.ensure(bm);

        if (!state.used[hero.heroId]) state.used[hero.heroId] = {};
        state.used[hero.heroId][subtype] = (Number(state.used[hero.heroId][subtype]) || 0) + 1;

        // 授权里带的是**快照**而不是 cfg 引用：热重载配置时，已经发出去的这一份
        // 不该跟着变。naming 与 slot 都是浅拷贝，两者都只有基本类型字段
        if (!state.pending[hero.heroId]) state.pending[hero.heroId] = [];
        state.pending[hero.heroId].push({
            subtype,
            count,
            shownAs,
            slot: { ...(cfg.slot || {}) },
            naming: cfg.naming ? { ...cfg.naming } : null,
        });

        if (Array.isArray(summary)) {
            summary.push(`✨ ${hero.name} 使用${shownAs}，下一回合获得 ${count} 次额外行动`
                + `（消耗 ${spent.cost} 点${spent.key}）`);
        }
        if (Array.isArray(results)) {
            results.push({ kind: 'extra-action', actor: hero.name, subtype, count, shownAs });
        }
        return true;
    },

    // ---------- 兑现 ----------

    /** 取走并清空某人的待兑现授权。一次性语义，取过就没了 */
    takeGrants(bm, hero) {
        if (!bm || !hero) return [];
        const state = this.ensure(bm);
        const rows = state.pending[hero.heroId] || [];
        delete state.pending[hero.heroId];
        return rows;
    },

    /**
     * 把先攻队列展开成「本体格 + 从动格」。**只在 TurnManager.initializeRound 里调**。
     * 本体格 extra 为 0，从动格从 1 起递增，紧跟在本体后面连续排列——
     * 「不重投先攻、虚影紧跟本体打完」这条就是靠这个连续性实现的，不需要额外的排序规则。
     *
     * 队列元素仍然是 Hero（同一个 Hero 会出现多次），额外信息走平行的 slots 数组：
     * turnQueue 被六处按 Hero 读取，换元素类型要改六处并承担漏改风险。
     *
     * 收尾处把 pending 整个清空：没能进这一轮队列的人（上一轮末尾就已阵亡）手里那份
     * 授权当场作废，与「本体倒下则剩余虚影消散、次数与消耗都不退」同一条口径。
     * @returns {{queue: Array, slots: Array}}
     */
    expand(bm, baseQueue) {
        const queue = [];
        const slots = [];
        (baseQueue || []).forEach(hero => {
            queue.push(hero);
            slots.push({
                hero, extra: 0, alias: '', cfg: null,
                naming: null, subtype: '', shownAs: '', voided: false,
            });

            let ordinal = 0;
            this.takeGrants(bm, hero).forEach(g => {
                const times = Math.max(0, Number(g.count) || 0);
                for (let i = 0; i < times; i++) {
                    ordinal++;
                    queue.push(hero);
                    slots.push({
                        hero,
                        extra: ordinal,
                        alias: this.aliasOf(hero, g.naming, ordinal),
                        cfg: g.slot || {},
                        naming: g.naming || null,
                        subtype: g.subtype,
                        shownAs: g.shownAs,
                        voided: false,
                    });
                }
            });
        });

        if (bm) this.ensure(bm).pending = {};
        return { queue, slots };
    },

    // ---------- 作废 ----------

    /**
     * 本体已经走不下去了（阵亡 / 昏迷 / 被放逐 / 因附身离场），把他**尚未出手**的
     * 从动格全部作废。次数与消耗都不退——那是发动时就已经付出的代价。
     * 真正动队列的是 TurnManager.voidSlotsOf，本方法只负责措辞与写日志。
     * @returns {number} 作废掉几个
     */
    voidFor(bm, hero) {
        if (!bm || !hero || !bm.turnManager) return 0;
        const dropped = bm.turnManager.voidSlotsOf(hero);
        if (!dropped || dropped.count <= 0) return 0;
        const unit = (dropped.naming && dropped.naming.unit) || '额外行动';
        if (bm.battleLogger) {
            bm.battleLogger.log(`${hero.name}已无法行动，剩余的 ${dropped.count} 个${unit}随之消散。`, 'system');
        }
        return dropped.count;
    },

    /** 从动格开始时写进战斗日志的那一句。不进战报——战报靠行动主体改名自己说清楚 */
    enterLine(slot) {
        if (!slot || !slot.extra) return '';
        const who = slot.alias || (slot.hero ? slot.hero.name : '');
        if (!who) return '';
        return `【${TacticCatalog.EXTRA_ACTION_ACTION}】${who}开始行动。`;
    },

    // ---------- NPC ----------

    /**
     * NPC 该不该发动。**不掷骰**：有次数就必然触发，优先级仅次于那几件非做不可的事。
     * 越早用越划算，所以不做「留着后面用」的判断——真要留，也该由更强的强制逻辑
     * （续控秘偶 / 维持附身 / 回溯）把这一轮的动作位占掉，而那三条就在下面。
     */
    npcShouldUse(bm, hero) {
        if (!this.canUse(bm, hero)) return false;
        // 进行中的秘偶化与附身都是「能续就必须续」，回溯是「符合条件必然触发」，
        // 三者都会占掉这一轮的动作位，额外行动排在它们之后
        if (typeof EnemyControlManager !== 'undefined'
            && EnemyControlManager.processOf(bm, hero.heroId)) return false;
        if (typeof PossessionManager !== 'undefined'
            && PossessionManager.processOf(bm, hero.heroId)) return false;
        if (typeof RewindManager !== 'undefined'
            && RewindManager.npcShouldRewind(bm, hero)) return false;
        const subtype = this.npcSubtypeOf(bm, hero);
        return !!subtype && this.hasStat(hero, subtype);
    },

    /** NPC 的子类选取：够格的里取第一条。只有一条时就是它 */
    npcSubtypeOf(bm, hero) {
        return this.availableSubtypes(bm, hero)[0] || '';
    },
};

const containsOldDayAttendant = (s) => String(s || '').includes('旧日侍者');
const allocateAttributes = (totalQuota, systemStr) => {
  const rates = parseAbilitySystem(systemStr);
  const attrs = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
  let result = {};
  let remainders = [];
  let sumFloor = 0;

  // 第一步：全部向下取整，并记录丢弃的小数部分
  attrs.forEach(attr => {
  const exactValue = totalQuota * rates[attr];
  const floorValue = Math.floor(exactValue);
  result[attr] = floorValue;
  sumFloor += floorValue;
  remainders.push({ attr: attr, rem: exactValue - floorValue });
  });

  // 第二步：计算因为向下取整漏掉的点数
  let leftover = Math.round(totalQuota - sumFloor);

  // 第三步：按小数部分从大到小排序，依次补1，直到漏掉的点数补完
  remainders.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < leftover; i++) {
  result[remainders[i].attr] += 1;
  }

  return result;
};
const getSequenceDivinity = (sequenceRank) => {
  // 遍历配置数组寻找匹配的区间，找不到就返回兜底 1
  const config = GameDBManager.DB.divinityConfig.find(
    c => sequenceRank >= c.min && sequenceRank <= c.max
  );
  return config ? config.val : 1;
};
// 根据序列解析基准总值（普通人/序列9-0）
const getSequenceBaseValue = (rank) => {
  // 优先读取 DB 配置，若不存在则回退至硬编码默认值，最差给 200
  return GameDBManager.DB.sequenceBase[String(rank)] || 200;
};
// 解析、修正并返回 NPC 模板倍率 (Multiplier)
const getAndFixNpcTemplateMultiplier = (npc, seqRank) => {
  const config = GameDBManager.DB.npcTemplateConfig;
  let templateStr = npc.模板 || '普通';

  // 1. 查表获取当前倍率 (没有匹配则为 0)
  let currentMultiplier = 0;
  for (const [name, mult] of Object.entries(config.multipliers)) {
    if (templateStr.includes(name)) { currentMultiplier = mult; break; }
  }

  // 2. 查表匹配序列对应的规则区间
  const rule = config.rankRules.find(r => seqRank >= r.minRank && seqRank <= r.maxRank)
               || config.defaultRule;

  // 3. 校验并强制修正
  if (currentMultiplier < rule.minM || currentMultiplier > rule.maxM) {
    currentMultiplier = rule.minM;
    npc['模板'] = rule.defaultName;
  }

  return currentMultiplier;
};
// 简化后的 Range 函数：只负责数学计算，方便微调
const getNpcTemplateRange = (npc, seqRank) => {
  const baseValue = getSequenceBaseValue(seqRank);

  // 直接通过 Fix 函数拿到准确的倍率（此时 NPC 的模板字符串已经被修好了）
  const multiplier = getAndFixNpcTemplateMultiplier(npc, seqRank);

  // 如果你希望属性是一个固定值，直接 baseValue * multiplier
  // 如果你希望属性在这个模板下有波动（比如精英是1.0-1.4），则保留 min/max
  return {
  min: baseValue * (multiplier === 1.0 ? 1.0 : multiplier * 0.7), // 举例：下限
  max: baseValue * multiplier
  };
};
const parseAbilitySystem = (systemStr) => {
  const config = GameDBManager.DB.abilitySystemConfig;
  const input = (systemStr || '').trim();

  // 查别名表，查不到就用原词
  const targetKey = config.aliases[input] || input;

  // 查真实系统，查不到就返回默认系统
  return config.systems[targetKey] || config.systems[config.defaultSystem];
};
const getPureName = (nameStr) => {
  if (!nameStr) return "";
  let s = nameStr.replace(/[【】]/g, "").trim();
  // 先剥序列前缀；完整「旧日侍者」保留，避免被「旧日」前缀误伤成「侍者」
  s = s.replace(/^(序列\d+(\.\d+)?)[-—\s]?/, "").trim();
  if (containsOldDayAttendant(s)) return s;
  return s.replace(/^(旧日|支柱)[-—\s]?/, "").trim();
};
// 🆕 棋盘字段：写进变量时统一用英文键，中文别名只在读取世界书时兼容
const BOARD_FIELDS = ['range', 'aoeRadius'];
// 辅助函数：标准化组装 Key 以查询 DB
const buildAbilityKey = (pathway, rankMatch, tierPrefix) => {
  const rawKey = rankMatch ? `${pathway}-序列${rankMatch[1]}` : `${pathway}-${tierPrefix}`;
  return rawKey.replace(/序列0([0-9])/g, "序列$1");
};
/**
 * 全局核心工具：根据当前序列获取所有的能力池 (玩家和NPC共享底层解析)
 * @param {string} currentSequenceRaw 当前序列字符串
 * @param {boolean} isAbilityLocked 是否开启能力锁 (针对玩家，NPC一般传 false)
 * @returns {Array} 序列能力对象数组
 */
const fetchAvailableAbilities = (currentSequenceRaw, isAbilityLocked = false) => {
  if (!currentSequenceRaw || currentSequenceRaw.includes("普通人")) return {};

  const godPathways = GameDBManager.DB.godPathways;
  const sequenceAbilities = GameDBManager.DB.sequenceAbilities;
  if (!godPathways || Object.keys(godPathways).length === 0) return {};

  const fragments = currentSequenceRaw.split(/[/|，,;；与和及以及\s\+&、]/).map((f) => f.trim()).filter(Boolean);
  const pathwayHighestMatch = {};

  fragments.forEach((frag) => {
    const userCoreName = getPureName(frag);
    if (!userCoreName) return;
    for (const [pathwayName, sequences] of Object.entries(godPathways)) {
      const foundIndex = sequences.findIndex((libSeq) => getPureName(libSeq) === userCoreName);
      if (foundIndex !== -1) {
        if (pathwayHighestMatch[pathwayName] === undefined || foundIndex > pathwayHighestMatch[pathwayName]) {
          pathwayHighestMatch[pathwayName] = foundIndex;
        }
      }
    }
  });

  if (Object.keys(pathwayHighestMatch).length === 0) return {};

  const requiredAbilitiesRecord = {};

  Object.entries(pathwayHighestMatch).forEach(([pathway, currentIndex]) => {
    const sequencesInPathway = godPathways[pathway];
    const startIndex = isAbilityLocked ? currentIndex : 0;

    for (let i = startIndex; i <= currentIndex; i++) {
      const seqNameInLib = sequencesInPathway[i];
      const rankMatch = seqNameInLib.match(/序列(\d+(\.\d+)?)/);
      const tierPrefix = rankMatch ? null : seqNameInLib.split("-")[0];
      const abilityKey = buildAbilityKey(pathway, rankMatch, tierPrefix);
      const seqAbilities = sequenceAbilities[abilityKey];

      if (!Array.isArray(seqAbilities) || seqAbilities.length === 0) continue;

      if (!requiredAbilitiesRecord[seqNameInLib]) {
        requiredAbilitiesRecord[seqNameInLib] = [];
      }

      // 【核心修改】：在这里把数据库的英文映射成中文输出
seqAbilities.forEach(ab => {
  if (!requiredAbilitiesRecord[seqNameInLib].some(existing => existing.名称 === ab.name)) {
    // 保留完整的技能对象，包括所有战斗字段
    const fullAbility = {
      名称: ab.name,
      描述: ab.description || "",
      类型: ab.type || "非凡能力"
    };

    // 添加战斗扩展字段（如果存在）
    if (ab.damageType) fullAbility.damageType = ab.damageType;
    if (ab.power !== undefined) fullAbility.power = ab.power;
    if (ab.cost) fullAbility.cost = ab.cost;
    if (ab.targetType) fullAbility.targetType = ab.targetType;
    if (ab.priority !== undefined) fullAbility.priority = ab.priority;

    // ⭐ 新增：映射 effects 数组，确保 valueType 和 stat 字段正确传递
    if (ab.effects && Array.isArray(ab.effects)) {
      fullAbility.effects = ab.effects.map(effect => {
        const mappedEffect = { ...effect };
        // valueType 和 stat 会自动包含在展开的对象中
        // 支持中英文字段名
        if (effect.valueType !== undefined) mappedEffect.valueType = effect.valueType;
        if (effect.数值类型 !== undefined) mappedEffect.数值类型 = effect.数值类型;
        if (effect.stat !== undefined) mappedEffect.stat = effect.stat;
        if (effect.目标属性 !== undefined) mappedEffect.目标属性 = effect.目标属性;
        return mappedEffect;
      });
    }

    if (ab.customDamageCalculator) fullAbility.customDamageCalculator = ab.customDamageCalculator;
    if (ab.isHeal !== undefined) fullAbility.isHeal = ab.isHeal;
    if (ab.healAmt !== undefined) fullAbility.healAmt = ab.healAmt;
    if (ab.healType) fullAbility.healType = ab.healType;
    if (ab.healValueType !== undefined) fullAbility.healValueType = ab.healValueType;
    if (ab.治疗数值类型 !== undefined) fullAbility.治疗数值类型 = ab.治疗数值类型;
    if (ab.triggerTiming) fullAbility.triggerTiming = ab.triggerTiming;

    // 🆕 节点1：添加被动技能字段映射
    if (ab.isPassive !== undefined) fullAbility.isPassive = ab.isPassive;

    // 🆕 节点2：添加标签字段映射（支持空数组）
    if (ab.skillTags !== undefined) fullAbility.skillTags = ab.skillTags;
    if (ab.applyTags !== undefined) fullAbility.applyTags = ab.applyTags;
    if (ab.removeTags !== undefined) fullAbility.removeTags = ab.removeTags;

    // 🆕 节点1：添加 conditionalParams 字段映射
    if (ab.conditionalParams !== undefined) fullAbility.conditionalParams = ab.conditionalParams;

    // 🆕 节点1：棋盘字段映射。range 可以是 0 / "global" / {min,max}，一律不能用 || 兜底
    if (ab.range !== undefined) fullAbility.range = ab.range;
    else if (ab.射程 !== undefined) fullAbility.range = ab.射程;

    if (ab.aoeRadius !== undefined) fullAbility.aoeRadius = ab.aoeRadius;
    else if (ab.范围半径 !== undefined) fullAbility.aoeRadius = ab.范围半径;
    else if (ab.爆炸半径 !== undefined) fullAbility.aoeRadius = ab.爆炸半径;

    requiredAbilitiesRecord[seqNameInLib].push(fullAbility);
  }
});
    }
  });

  return requiredAbilitiesRecord;
};
/**
 * NPC 能力池为空时唯一的规范兜底。前端战斗通过 isNpcGeneratedFallbackAbility
 * 认这份定义，不另抄技能名；以后改名称或文案时两边会自动一起变化。
 * $ 前缀标记会跟随能力记录保存，旧存档则由下面对规范名称的动态比较兼容。
 */
const NPC_GENERATED_FALLBACK_ABILITY = Object.freeze({
    名称: "攻击手段（由你根据攻击者的人设决定具体是什么手段）",
    描述: "符合角色人设的攻击手段（具体是什么，由角色人设决定）",
    类型: "非凡能力",
    $系统兜底攻击: true,
    damageType: "physical",
    targetType: "single",
    power: {
      "-2": 185000, "-1": 111000,
      "0": 44400, "0.1": 33300, "0.3": 22200, "0.4": 20350, "0.5": 18500,
      "0.8": 14800, "0.9": 12950,
      "1": 11100, "2": 4440, "3": 1480, "4": 555, "5": 222,
      "6": 92, "7": 37, "8": 17, "9": 11,
      "default": 11
    },
    cost: { type: "currentVitality", amount: 6 }
});

function createNpcGeneratedFallbackAbility() {
  return {
    ...NPC_GENERATED_FALLBACK_ABILITY,
    power: { ...NPC_GENERATED_FALLBACK_ABILITY.power },
    cost: { ...NPC_GENERATED_FALLBACK_ABILITY.cost },
  };
}

function isNpcGeneratedFallbackAbility(ability) {
  if (!ability || typeof ability !== 'object') return false;
  return ability.$系统兜底攻击 === true
    || String(ability.名称 || ability.name || '').trim() === NPC_GENERATED_FALLBACK_ABILITY.名称;
}

/**
 * 全局核心工具：NPC 序列能力加权抽取算法 (指数级高序列优先)
 * @param {Array} abilitiesPool 可用的能力对象数组池
 * @param {number} highestSeqRank NPC当前最高序列等级
 * @returns {Array} 抽取出的能力对象数组，每个元素包含 { 名称, 描述 }
 */
const generateNpcAbilities = (abilitiesRecord, highestSeqRank) => {
  if (!abilitiesRecord || Object.keys(abilitiesRecord).length === 0) {
    return [createNpcGeneratedFallbackAbility()];
  }

  // 【修改】：将字典临时拍扁为带权重的数组以供抽取
  let abilitiesPool = [];
  Object.entries(abilitiesRecord).forEach(([seqName, abs]) => {
    const seqRank = parseSequenceRank(seqName);
    abs.forEach(ab => {
      abilitiesPool.push({...ab, seqRank});
    });
  });

  if (abilitiesPool.length === 0) return [createNpcGeneratedFallbackAbility()];

  const poolSize = abilitiesPool.length;

  // 规则 1：根据序列等级动态计算能力数量
  // 支柱(-2)和旧日(-1)：15个
  // 序列0：15个
  // 序列1：14个
  // 序列2：13个
  // ...
  // 序列9：5个
  // 普通人(10)：0个
  let maxAbilities;
  if (highestSeqRank <= 0) {
    // 支柱、旧日、序列0 都是15个
    maxAbilities = 15;
  } else if (highestSeqRank >= 9) {
    // 序列9及以下（普通人）最多5个
    maxAbilities = 5;
  } else {
    // 序列1-8：线性递减，从14到6
    // 公式：15 - highestSeqRank
    maxAbilities = 15 - highestSeqRank;
  }

  // 取池子总数的 100%，但不超过序列对应的上限
  let targetCount = Math.ceil(poolSize * 1.0);
  targetCount = Math.min(targetCount, maxAbilities);
  targetCount = Math.min(targetCount, poolSize);
  targetCount = Math.max(1, targetCount); // 至少1个能力

  // 规则 2：指数级加权随机抽取（最高序列极高概率碾压）
  const selectedAbilities = [];

  // 深拷贝并注入指数权重
  let currentPool = abilitiesPool.map(ab => {
    // 采用以 3 为底的指数算法，遇到旧日(-1)、支柱(-2)也完美兼容
    const exponent = Math.max(0, 10 - ab.seqRank);
    return {
      ...ab,
      weight: Math.pow(3, exponent)
    };
  });

  // 无放回的加权轮盘赌算法
  for (let i = 0; i < targetCount; i++) {
    if (currentPool.length === 0) break;

    const totalWeight = currentPool.reduce((sum, item) => sum + item.weight, 0);
    let randomWeight = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let j = 0; j < currentPool.length; j++) {
      randomWeight -= currentPool[j].weight;
      if (randomWeight <= 0) {
        selectedIndex = j;
        break;
      }
    }

    selectedAbilities.push(currentPool[selectedIndex]);
    currentPool.splice(selectedIndex, 1);
  }

// 整理输出：按位格从高到低（序列数从小到大）排序，返回完整的能力对象（包括战斗字段）
selectedAbilities.sort((a, b) => a.seqRank - b.seqRank);
return selectedAbilities.map(ab => {
  // 移除临时的 seqRank 和 weight 字段
  const { seqRank, weight, ...abilityData } = ab;
  return abilityData;
});
};
const getAndFixAbilitySystem = (sequenceStr, currentSystem) => {
  // 核心判定：如果原数据中已经有了有效的能力体系，直接放行，不做任何修改！
  if (currentSystem && typeof currentSystem === 'string' && currentSystem.trim() !== '') {
  return currentSystem;
  }
  // 如果没有能力体系（或者是空字符串），则使用 include 遍历超大数据库匹配
  if (sequenceStr && typeof sequenceStr === 'string') {
    for (const [seqKey, system] of Object.entries(GameDBManager.DB.abilitySystemDB)) {
      if (sequenceStr.includes(seqKey)) {
      return system;
      }
    }
  }
    // 若不在数据库中，或连序列都没填，统一给个最终兜底
  return '神秘法术系';
};

// 🌟 新增：从世界书动态读取能力体系映射的增强版函数
const getAbilitySystemFromWorldbook = (sequenceStr, currentSystem, forceUpdate = false) => {
  // 1. 如果不是强制更新，且当前已有有效的能力体系，则保持不变
  if (!forceUpdate && currentSystem && typeof currentSystem === 'string' && currentSystem.trim() !== '') {
    // 检查当前体系是否在配置中存在，如果不存在则需要重新分配
    const systemConfig = GameDBManager.DB.abilitySystemConfig;
    if (systemConfig && systemConfig.systems && systemConfig.systems[currentSystem]) {
      return currentSystem;
    }
  }

  // 2. 从世界书的能力体系映射中查找匹配的序列
  if (sequenceStr && typeof sequenceStr === 'string') {
    const abilitySystemDB = GameDBManager.DB.abilitySystemDB;
    if (abilitySystemDB && typeof abilitySystemDB === 'object') {
      // 遍历能力体系映射，查找匹配的序列
      for (const [seqKey, system] of Object.entries(abilitySystemDB)) {
        if (sequenceStr.includes(seqKey)) {
          console.log(`[能力体系更新] 序列 [${sequenceStr}] 匹配到体系: ${system}`);
          return system;
        }
      }
    }
  }

  // 3. 如果世界书中没有找到，回退到原有逻辑
  return getAndFixAbilitySystem(sequenceStr, currentSystem);
};

const OriginalGrazingProjectionManager = {
    player(bm) {
        if (!bm || !bm.teamManager) return null;
        return bm.teamManager.getAllHeroes().find(h => h && h.dataSource === 'player' && !h.isSummon) || null;
    },

    names(hero) {
        return (hero && Array.isArray(hero.grazingActiveSouls))
            ? hero.grazingActiveSouls.map(x => typeof x === 'string' ? x : x.name).filter(Boolean)
            : [];
    },

    switchCost(hero) {
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero && hero.sequenceRank);
        return Math.max(1, Math.round((Number(attrs.灵性) || 0) * TacticCatalog.GRAZING_SWITCH_RATE));
    },

    upkeepPerSoul(hero) {
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero && hero.sequenceRank);
        return Math.max(1, Math.round((Number(attrs.灵性) || 0) * TacticCatalog.GRAZING_UPKEEP_RATE));
    },

    initialize(bm, hero) {
        if (!hero || hero.dataSource !== 'player' || !window.GrazingCore) return;
        const snapshot = window.PlayerProjectionResolver
            ? window.PlayerProjectionResolver.resolve(bm.currentMvuState)
            : null;
        hero.grazingActiveSouls = window.GrazingCore.activeSelections(bm.currentMvuState, snapshot);
        hero.grazingSkillLedger = hero.grazingSkillLedger || {};
        hero.pathwayProjectionSkillLedger = hero.pathwayProjectionSkillLedger || {};
        (hero.moveSet || []).forEach(move => {
            const kind = move.pathwayProjectionSource
                || (move.grazingSoul || move.additionalStats?.$放牧来源 ? 'grazing' : '')
                || (move.additionalStats?.$空想来源 ? 'imagination' : '')
                || (move.additionalStats?.$秘术投影 ? 'reader-mystic' : '')
                || (move.additionalStats?.$神秘再现投影 ? 'mystery-reenactment' : '');
            const owner = move.pathwayProjectionOwner || move.grazingSoul
                || move.additionalStats?.$放牧来源 || move.additionalStats?.$空想来源
                || move.additionalStats?.$秘术投影 || move.additionalStats?.$神秘再现投影;
            if (!kind || !owner) return;
            move.pathwayProjectionSource = kind;
            move.pathwayProjectionOwner = owner;
            hero.pathwayProjectionSkillLedger[`${kind}\u0000${owner}\u0000${move.name}`] = move;
            hero.pathwayProjectionSkillLedger[`name\u0000${move.name}`] = move;
            if (kind === 'grazing') hero.grazingSkillLedger[`${owner}\u0000${move.name}`] = move;
        });
    },

    releasedNames(bm, hero) {
        if (!bm || !hero || !bm.summon) return [];
        return (bm.summon.projections || [])
            .filter(p => p.subtype === TacticCatalog.SUMMON_GRAZING && p.ownerId === hero.heroId && p.persistent)
            .map(p => p.origin);
    },

    buildMoves(mvuState, hero) {
        const list = mvuState?.stat_data?.序列能力列表 || {};
        const out = [];
        const groups = Object.keys(list).filter(k => String(k).startsWith('#空想:')
            || String(k).startsWith('#放牧:') || String(k) === '#秘术强化'
            || String(k) === '#神秘再现');
        groups.forEach(group => {
            const kind = String(group) === '#秘术强化'
                ? 'reader-mystic'
                : String(group) === '#神秘再现'
                  ? 'mystery-reenactment'
                  : String(group).startsWith('#放牧:') ? 'grazing' : 'imagination';
            (Array.isArray(list[group]) ? list[group] : []).forEach(ability => {
                const source = String(kind === 'reader-mystic'
                    ? (ability?.$秘术投影 || '秘术强化')
                    : kind === 'mystery-reenactment'
                      ? (ability?.$神秘再现投影 || '神秘再现')
                    : kind === 'grazing'
                      ? (ability?.$放牧来源 || String(group).split(':')[1] || '')
                      : (ability?.$空想来源 || String(group).split(':')[1] || '空想'));
            const key = `${kind}\u0000${source}\u0000${String(ability?.名称 || ability?.name || '')}`;
                const old = hero.pathwayProjectionSkillLedger[key]
                    || hero.pathwayProjectionSkillLedger[`name\u0000${String(ability?.名称 || ability?.name || '')}`];
                const move = SkillLoader.parseSkill(ability);
                if (!move) return;
                if (old && old.isConsumable && move.isConsumable
                    && old.consumableItemKey === move.consumableItemKey) {
                    move.remainingUses = old.remainingUses;
                }
                ['cooldownRemaining', 'remainingCooldown', 'currentCooldown'].forEach(field => {
                    if (old && Object.prototype.hasOwnProperty.call(old, field)) move[field] = old[field];
                });
                move.pathwayProjectionSource = kind;
                move.pathwayProjectionOwner = source;
                if (kind === 'grazing') {
                    move.grazingSoul = source;
                    move.additionalStats.$放牧来源 = source;
                    hero.grazingSkillLedger[`${source}\u0000${move.name}`] = move;
                } else if (kind === 'imagination') {
                    move.additionalStats.$空想来源 = source;
                } else if (kind === 'reader-mystic') {
                    move.additionalStats.$秘术投影 = source;
                } else {
                    move.additionalStats.$神秘再现投影 = source;
                }
                hero.pathwayProjectionSkillLedger[key] = move;
                hero.pathwayProjectionSkillLedger[`name\u0000${move.name}`] = move;
                out.push(move);
            });
        });
        return out;
    },

    removePassives(hero) {
        if (!hero || !Array.isArray(hero.effects)) return;
        hero.effects = hero.effects.filter(e => !(e && (e.$grazingPassiveSource || e.$pathwayProjectionPassive)));
        AttributeCalculator.recalculateAllSixDimStats(hero);
        hero.grazingPassiveEffects = [];
    },

    // 主动入口永远受战术会话约束；free不授予越过操作锁的权限。
    rebuild(bm, hero, names) { return this.switchPlayer(bm, hero, names); },
    switchPlayer(bm, hero, names) {
        hero = hero?.$tacticActualCaster || hero;
        const reason = TacticSessionManager.soulBlock(bm, hero, true);
        if (reason) return { ok: false, reason };
        return this._rebuild(bm, hero, names, { free: false });
    },
    syncSystem(bm, hero, names, reason) {
        if (!['soul-death', 'upkeep-failed'].includes(reason)) return { ok: false, reason: '无效的系统同步原因。' };
        return this._rebuild(bm, hero?.$tacticActualCaster || hero, names, { free: true });
    },
    _rebuild(bm, hero, names, opts = {}) {
        const core = window.GrazingCore;
        if (!bm || !hero || !core) return { ok: false, reason: '放牧运行期不可用。' };
        const state = bm.currentMvuState;
        const valid = core.soulRecords(state);
        const beforeSnapshot = window.PlayerProjectionResolver
            ? window.PlayerProjectionResolver.resolve(state)
            : null;
        const beforeGate = beforeSnapshot ? beforeSnapshot.grazingGate
            : core.resolveOwnerSequence(core.realSequence(state));
        if (!beforeGate.unlocked) return { ok: false, reason: '当前不具备放牧资格，无法切换激活灵魂。' };
        const cap = core.activeCapOf(beforeGate.rank);
        const unique = Array.from(new Set((names || []).map(String).filter(Boolean)));
        if (unique.length > cap) return { ok: false, reason: `激活数量超过当前上限 ${cap} 个。` };
        const missing = unique.find(n => !valid[n]);
        if (missing) return { ok: false, reason: `“${missing}”已经不在放牧灵魂列表中。` };
        const locked = this.releasedNames(bm, hero);
        const removedLocked = locked.find(n => !unique.includes(n));
        if (removedLocked) return { ok: false, reason: `“${removedLocked}”正在外放，不能取消激活。` };

        const old = this.names(hero);
        if (old.length === unique.length && old.every(n => unique.includes(n))) {
            return { ok: false, noop: true, reason: '激活组合没有变化，不需要切换。' };
        }
        const current = Number(hero.additionalStats?.当前灵性) || 0;
        const cost = opts.free ? 0 : this.switchCost(hero);
        if (!opts.free && current <= 0) return { ok: false, reason: '当前灵性为0，无法切换激活灵魂。' };
        const oldStored = core.storedActiveNames(state);
        const oldDormant = core.storedDormantNames(state);
        const nextSnapshot = window.PlayerProjectionResolver.resolve(state, { grazingActiveNames: unique });
        const saved = core.saveActive(state, unique, beforeSnapshot);
        if (!saved.ok) return saved;
        try {
            const refreshed = window.PlayerBattleProjectionRefresher.refresh(bm, hero, nextSnapshot);
            if (!refreshed || !refreshed.ok) throw new Error((refreshed && refreshed.reason) || '战斗投影刷新失败。');
            if (!opts.free) hero.additionalStats.当前灵性 = Math.max(0, current - cost);
            return { ok: true, cost, names: unique };
        } catch (error) {
            core.saveStoredActiveNames(state, oldStored, oldDormant);
            hero.additionalStats.当前灵性 = current;
            try { window.PlayerBattleProjectionRefresher.refresh(bm, hero, beforeSnapshot); } catch (_) {}
            return { ok: false, reason: `切换失败，已恢复原激活组合：${error.message || error}` };
        }
    },
};

const GrazingBattleManager = {
    upkeep(bm, summary, results) {
        const hero = OriginalGrazingProjectionManager.player(bm);
        if (!hero || !window.GrazingCore) return;
        const names = OriginalGrazingProjectionManager.names(hero);
        if (!names.length) return;
        const each = OriginalGrazingProjectionManager.upkeepPerSoul(hero);
        const total = each * names.length;
        const spirit = Number(hero.additionalStats?.当前灵性) || 0;
        if (spirit >= total) {
            hero.additionalStats.当前灵性 = spirit - total;
            summary.push(`◈ ${hero.name}维持了${names.length}个激活灵魂，消耗${total}点灵性`);
            results.push({ kind: 'grazing', stage: 'upkeep', actor: hero.name, count: names.length, cost: total });
            return;
        }

        hero.additionalStats.当前灵性 = 0;
        const projections = SummonManager.ensure(bm).projections.slice().filter(p =>
            p.subtype === TacticCatalog.SUMMON_GRAZING && p.ownerId === hero.heroId);
        projections.forEach(p => {
            const soul = SummonManager.findHero(bm, p.heroId);
            if (soul) {
                bm.battleLogger?.log(`${p.origin}的外放灵魂因灵性维持中断而消散。`, 'system');
                SummonManager.dismiss(bm, soul);
            }
            results.push({ kind: 'grazing', stage: 'upkeep-dismiss', actor: hero.name, origin: p.origin });
        });
        window.GrazingCore.saveActive(bm.currentMvuState, []);
        OriginalGrazingProjectionManager.syncSystem(bm, hero, [], 'upkeep-failed');
        summary.push(`✗ ${hero.name}的灵性不足以维持放牧，激活灵魂全部沉寂，已外放灵魂随之消散`);
        results.push({ kind: 'grazing', stage: 'upkeep-fail', actor: hero.name });
        bm.grazingPersistentNotice = '灵性不足，激活组合已清空；外放灵魂只是消散，放牧名册没有损失。';
    },

    cleanupBattle(bm) {
        if (!bm || !bm.summon) return [];
        const returned = [];
        SummonManager.ensure(bm).projections.slice().forEach(p => {
            if (p.subtype !== TacticCatalog.SUMMON_GRAZING) return;
            const soul = SummonManager.findHero(bm, p.heroId);
            const dead = soul && !TacticResolver.alive(soul);
            if (dead && p.persistent && window.GrazingCore) {
                window.GrazingCore.removeSoul(bm.currentMvuState, p.origin);
                bm.battleLogger?.log(`☠ ${p.origin}的外放灵魂已经消亡，这份被放牧灵魂将被永久删除`, 'system');
                bm.grazingPermanentLosses = bm.grazingPermanentLosses || [];
                bm.grazingPermanentLosses.push(p.origin);
                TacticResolver.writeReport(bm, [{ kind: 'summon', stage: 'soul-dead',
                    actor: p.ownerName, target: soul.name, origin: p.origin, subtype: p.subtype }], null);
            }
            if (soul) SummonManager.dismiss(bm, soul);
            if (p.persistent && !dead) returned.push(p.origin);
        });
        if (returned.length) {
            bm.grazingReturnNotice = `外放灵魂“${returned.join('、')}”已回归放牧空间，并保持激活状态。`;
        }
        return returned;
    },
};

const SummonManager = {
    /**
     * 子类配置。targetPool 写的是本模块里的方法名。历史投影那条只对**玩家侧**有效
     * （NPC 没有人物关系列表，改走 randomCandidates 现造）；真实幻象两侧同池，
     * 因为目标就是施法者自己，不存在「NPC 查不到本体」这个问题。
     * title 是称号兜底，与 EnemyControlManager 认「诡秘之主」是同一套写法：
     * 支柱/旧日的条目躺在多条途径里，正常的途径解析对它们本来就不可靠。
     *
     * 逐项含义（不写即历史投影那套老口径，加子类时才需要显式写）：
     *   titleRank  称号命中时按哪一档记名额，只有名额分档的子类要写
     *   costStat   扣哪一项。不写 = 平均灵性 5%；写了 = 该项 10%，走 controlStatCost
     *   contest    拼点公式。不写 = 好感三曲线那套；'illusion' = 逐个在场敌人拼当前人性
     *   alchemy    快速炼成：按所选途径现造同位阶 NPC 卡、必成，不走好感与拼点
     *   picture    画中人：玩家读制造仓库、NPC 随机现造；名额按在场数量而非累计次数
     *   autoSelf   自动成功的自身复制：直接用 selfTargets 建模，不走任何拼点
     *   maxPerCaster  本子类独立的累计成功上限；不写则走既有默认
     *   numbered   命名带序号，第一个就叫「…1」
     *   noExpire   没有维持回合数，只会被打死或随主人离场
     *   npcPriority  NPC 必成行动优先级；数字越小越先用，不写则仍走普通召唤骰
     *   npcTargetPool NPC 优先发动时使用的候选池；不写则沿用 targetPool
     */
    SUBTYPES: {
        [TacticCatalog.SUMMON_PROJECTION]: {
            pathway: '占卜家',
            gate: TacticCatalog.SUMMON_PROJECTION_RANK_GATE,
            title: TacticCatalog.SUMMON_PROJECTION_TITLE,
            targetPool: 'affinityTargets',
            suffix: '的历史投影',
        },
        [TacticCatalog.SUMMON_ALCHEMY]: {
            pathway: '通识者',
            gate: TacticCatalog.SUMMON_ALCHEMY_RANK_GATE,
            title: TacticCatalog.SUMMON_ALCHEMY_TITLE,
            titleRank: TacticCatalog.SUMMON_ALCHEMY_TITLE_RANK,
            targetPool: 'alchemyTargets',
            npcTargetPool: 'randomAlchemyCandidates',
            suffix: '临时魔偶',
            alchemy: true,
            maxPerCaster: TacticCatalog.SUMMON_ALCHEMY_MAX_PER_CASTER,
            noExpire: true,
            npcPriority: 2,
        },
        [TacticCatalog.SUMMON_FANTASY_BODY]: {
            pathway: '萨满',
            gate: TacticCatalog.SUMMON_FANTASY_BODY_RANK_GATE,
            title: TacticCatalog.SUMMON_FANTASY_BODY_TITLE,
            titleRank: TacticCatalog.SUMMON_FANTASY_BODY_TITLE_RANK,
            targetPool: 'selfTargets',
            npcTargetPool: 'selfTargets',
            suffix: '的幻想之身',
            desc: '塑造一个与自身完全相同、满状态的幻想之身，作为本方的临时友军。',
            autoSelf: true,
            maxPerCaster: TacticCatalog.SUMMON_FANTASY_BODY_MAX_PER_CASTER,
            noExpire: true,
            npcPriority: 1,
        },
        [TacticCatalog.SUMMON_PICTURE_PERSON]: {
            pathway: '萨满',
            gate: TacticCatalog.SUMMON_PICTURE_PERSON_RANK_GATE,
            title: TacticCatalog.SUMMON_PICTURE_PERSON_TITLE,
            titleRank: TacticCatalog.SUMMON_PICTURE_PERSON_TITLE_RANK,
            targetPool: 'pictureTargets',
            npcTargetPool: 'randomPictureCandidates',
            suffix: '画中人',
            picture: true,
            maxPerCaster: TacticCatalog.SUMMON_PICTURE_PERSON_MAX_LIVE,
            noExpire: true,
        },
        [TacticCatalog.SUMMON_ILLUSION]: {
            pathway: '观众',
            gate: TacticCatalog.SUMMON_ILLUSION_RANK_GATE,
            title: TacticCatalog.SUMMON_ILLUSION_TITLE,
            titleRank: TacticCatalog.SUMMON_ILLUSION_TITLE_RANK,
            targetPool: 'selfTargets',
            suffix: '的真实幻象',
            costStat: '人性',
            contest: 'illusion',
            numbered: true,
            noExpire: true,
        },
        [TacticCatalog.SUMMON_GRAZING]: {
            pathway: '秘祈人',
            gate: TacticCatalog.SUMMON_GRAZING_RANK_GATE,
            title: TacticCatalog.SUMMON_GRAZING_TITLE,
            targetPool: 'grazingTargets',
            suffix: '的外放灵魂',
            grazing: true,
            noExpire: true,
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    /** 玩家读一次授权的放牧资格串；NPC 没有持久化交叉快照，直接读本场有效序列。 */
    grazingEligibilitySequence(hero) {
        if (!hero) return '';
        return String(hero.dataSource === 'player'
            ? (hero.grazingGrantSequenceString || hero.baseSequenceString || hero.sequenceString || '')
            : (hero.sequenceString || ''));
    },

    // ---------- 运行期状态 ----------

    ensure(bm) {
        if (!bm.summon) {
            bm.summon = {
                // 只记成功次数：失败不占名额，这是与征服那几个 used 集合的区别。
                // 按 heroId 分开记，各算各的——记账维度与征服的 conquestUsed 一致，
                // 只是那边是「每人一次、成败都算」，这边是「每人 N 次、只记成功」。
                // 召唤物也会有自己的一份，但它掷不到召唤骰，所以那份永远是 0。
                // 🆕 第二层键是子类：{ [heroId]: { [subtype]: n } }。各子类的上限
                // 不同（历史投影每场 3 次，真实幻象按序列 1 或 2 次），共用一个数字
                // 会让它们互相吃名额。形状与场效的 used[heroId][subtype] 一致
                counts: {},
                // 在场的召唤物 [{ heroId, subtype, origin, until }]。
                // origin 是本体真名，用来挡住「同一个人同时在场两个投影」
                projections: [],
                // NPC 侧本轮现造的候选缓存 { [heroId]: { round, list } }。
                // 放这里而不是挂在 Hero 上：本模块的运行期状态都在这一个袋子里
                npcCandidates: {},
            };
        }
        return bm.summon;
    },

    /** 这个施法者本场用掉几个名额。不给 subtype 就是各子类之和 */
    usedOf(bm, hero, subtype) {
        if (!hero) return 0;
        if (subtype === TacticCatalog.SUMMON_GRAZING
            || subtype === TacticCatalog.SUMMON_PICTURE_PERSON) {
            return this.ensure(bm).projections.filter(p =>
                p.subtype === subtype && p.ownerId === hero.heroId).length;
        }
        const rec = this.ensure(bm).counts[hero.heroId];
        if (!rec || typeof rec !== 'object') return 0;
        if (subtype) return Number(rec[subtype]) || 0;
        return Object.values(rec).reduce((sum, n) => sum + (Number(n) || 0), 0);
    },

    /**
     * 该子类每场几个名额。
     * 真实幻象按序列分两档：rank ≤ 1（含序列 0 / 旧日 / 支柱「上帝」）2 次，
     * 序列 3、2 各 1 次。其余子类仍是大类那条每场 3 次。
     */
    maxOf(hero, subtype) {
        if (subtype === TacticCatalog.SUMMON_GRAZING) {
            const seq = this.grazingEligibilitySequence(hero);
            return window.GrazingCore ? window.GrazingCore.activeCapacity(seq) : 0;
        }
        const cfg = this.SUBTYPES[subtype];
        if (cfg && Number.isFinite(Number(cfg.maxPerCaster))) {
            return Math.max(0, Number(cfg.maxPerCaster));
        }
        if (subtype !== TacticCatalog.SUMMON_ILLUSION) {
            return TacticCatalog.SUMMON_MAX_PER_CASTER;
        }
        const rank = this.illusionRank(hero && hero.sequenceString);
        return (rank !== null && rank <= TacticCatalog.SUMMON_ILLUSION_QUOTA_HIGH_RANK)
            ? TacticCatalog.SUMMON_ILLUSION_QUOTA_HIGH
            : TacticCatalog.SUMMON_ILLUSION_QUOTA_LOW;
    },

    /**
     * 这个施法者在该子类下还剩几个名额。默认累计制，消散不返还；
     * 外放灵魂与画中人由 usedOf 改读当前在场数，离场后自然返还。
     * 不给 subtype 就取「够格的子类里剩得最多的那条」——按钮闸门问的是
     * 「还能不能召」，不是「某一条还能不能召」。
     */
    quotaLeft(bm, hero, subtype) {
        if (!hero) return 0;
        if (subtype) {
            return Math.max(0, this.maxOf(hero, subtype) - this.usedOf(bm, hero, subtype));
        }
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().reduce(
            (best, k) => (elig[k] ? Math.max(best, this.quotaLeft(bm, hero, k)) : best),
            0,
        );
    },

    /** 这个本体的召唤物是否还在场。名额是累计制，但同一人同时只能有一个 */
    hasLiveProjection(bm, originName) {
        return this.ensure(bm).projections.some(p => p.origin === originName);
    },

    // ---------- 资格 ----------

    /**
     * 与 MindDepriveManager.eligible 同构：称号走 includes，途径片段走
     * pathwayShort + 序列门槛，多途径按段合并。
     * 返回逐子类的资格表而不是布尔值——大类下将来会有多条，参数区要能分别置灰。
     */
    resolveEligibility(sequenceString) {
        const s = String(sequenceString || '');
        const result = {};
        this.subtypes().forEach(k => { result[k] = false; });

        Object.entries(this.SUBTYPES).forEach(([name, cfg]) => {
            if (cfg.title && s.includes(cfg.title)) result[name] = true;
        });
        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            const rank = Number(r.rank);
            Object.entries(this.SUBTYPES).forEach(([name, cfg]) => {
                if (r.pathwayShort === cfg.pathway && rank <= cfg.gate) result[name] = true;
            });
        });
        return result;
    },

    /**
     * 取某条召唤子类对应途径的最强有效位阶。快速炼成用它决定魔偶位阶；
     * 称号命中走子类自己的 titleRank，多途径片段取数字最小的一段。
     */
    eligibilityRank(sequenceString, subtype) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg) return null;
        const s = String(sequenceString || '');
        let best = (cfg.title && s.includes(cfg.title) && Number.isFinite(Number(cfg.titleRank)))
            ? Number(cfg.titleRank) : null;
        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r || r.pathwayShort !== cfg.pathway) return;
            const rank = Number(r.rank);
            if (!Number.isFinite(rank)) return;
            if (best === null || rank < best) best = rank;
        });
        return Number.isFinite(best) ? best : null;
    },

    /**
     * 真实幻象记名额时按哪一档算。「上帝」跨多条途径、途径解析对它本来就不可靠，
     * 所以称号命中直接记支柱档；观众片段取最强的一段（rank 数字最小）。
     * 两边都命中时取更强的那个，与 AbilityAlias「只保留最低 rank」一致。
     * 结构与 EnemyControlManager.corpseRank 同源，只多了称号兜底这一路。
     * @returns {number|null} 解析不出来就是 null，按低档处理
     */
    illusionRank(sequenceString) {
        const cfg = this.SUBTYPES[TacticCatalog.SUMMON_ILLUSION];
        if (!cfg) return null;
        const s = String(sequenceString || '');
        let best = (cfg.title && s.includes(cfg.title)) ? Number(cfg.titleRank) : null;

        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r || r.pathwayShort !== cfg.pathway) return;
            const rank = Number(r.rank);
            if (!Number.isFinite(rank)) return;
            if (best === null || rank < best) best = rank;
        });
        return Number.isFinite(best) ? best : null;
    },

    /**
     * 有资格、该子类名额未满、且付得起该子类的消耗。
     * 三个条件必须**同一条子类上都成立**：只开真实幻象、灵性为 0 的人不该被
     * 历史投影那条灵性闸门挡死，反过来也一样。
     * 召唤物自己不许再召——它的序列与本体相同，不挡的话每一代都能再开一批名额。
     */
    canUse(bm, hero) {
        if (!hero || hero.isSummon) return false;
        const elig = this.resolveEligibility(hero.sequenceString);
        elig[TacticCatalog.SUMMON_GRAZING] = this.resolveEligibility(
            this.grazingEligibilitySequence(hero))[TacticCatalog.SUMMON_GRAZING];
        return this.subtypes().some(k =>
            elig[k] && this.quotaLeft(bm, hero, k) > 0 && this.hasStat(hero, k)
            && (k !== TacticCatalog.SUMMON_GRAZING
                || hero.dataSource !== 'player'
                || this.targets(bm, hero, k).length > 0));
    },

    /** 带 npcPriority 的必成召唤，按数字从小到大排序。普通召唤不进入这张表。 */
    npcPrioritySubtypes() {
        return this.subtypes()
            .filter(k => Number.isFinite(Number(this.SUBTYPES[k]?.npcPriority)))
            .sort((a, b) => Number(this.SUBTYPES[a].npcPriority) - Number(this.SUBTYPES[b].npcPriority));
    },

    /**
     * NPC 本轮最优先的必成召唤计划。候选池也由配置分发：幻想之身取自身，
     * 快速炼成从当前有效途径池随机留一条。没有完整目标就继续看下一优先级，
     * 不会为了一个无法落地的高优先子类挡住后面的可用子类。
     */
    npcPriorityPlan(bm, hero) {
        if (!bm || !hero || hero.isSummon || !this.freeCellNear(bm.board, hero)) return null;
        const elig = this.resolveEligibility(hero.sequenceString);
        for (const subtype of this.npcPrioritySubtypes()) {
            if (!elig[subtype]) continue;
            if (this.quotaLeft(bm, hero, subtype) <= 0 || !this.hasStat(hero, subtype)) continue;
            const cfg = this.SUBTYPES[subtype];
            const fn = this[cfg.npcTargetPool || cfg.targetPool];
            if (typeof fn !== 'function') continue;
            const candidates = fn.call(this, bm, hero) || [];
            if (!candidates.length) continue;
            const entry = candidates[Math.floor(Math.random() * candidates.length)];
            entry.subtype = subtype;
            return { subtype, entry };
        }
        return null;
    },

    // ---------- 消耗 ----------
    // 历史投影与技能干涉同一条通道：平均灵性 5%，扣当前灵性，成败都扣。
    // 这几个方法的形状抄 MindDepriveManager，只换了属性项与比例。
    // 🆕 全部按子类分发：写了 costStat 的走操控那条「平均该项 10%」，
    // 与 EnemyControlManager.spendHumanity 同式。缺省仍是灵性，
    // 于是历史投影那些不传 subtype 的老调用点行为一字不变。

    statKeyOf(subtype) {
        const cfg = this.SUBTYPES[subtype];
        return (cfg && cfg.costStat) || '灵性';
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costOf(hero, subtype) {
        const cfg = this.SUBTYPES[subtype];
        const rank = hero && hero.sequenceRank;
        return (cfg && cfg.costStat)
            ? TacticCatalog.controlStatCost(rank, cfg.costStat)
            : TacticCatalog.spiritCost(rank);
    },

    /** 先扣再拼，成败都扣 */
    spend(hero, subtype) {
        const key = this.statKeyOf(subtype);
        const field = this.fieldOf(key);
        const cost = this.costOf(hero, subtype);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    statAfterCost(hero, subtype) {
        const field = this.fieldOf(this.statKeyOf(subtype));
        return Math.max(0, (hero?.additionalStats?.[field] ?? 0) - this.costOf(hero, subtype));
    },

    /** 不给 subtype 就问「够格的子类里有没有哪一条付得起」 */
    hasStat(hero, subtype) {
        if (!hero) return false;
        if (subtype === TacticCatalog.SUMMON_GRAZING) return true;
        if (subtype) {
            return (hero.additionalStats?.[this.fieldOf(this.statKeyOf(subtype))] ?? 0) > 0;
        }
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().some(k => elig[k] && this.hasStat(hero, k));
    },

    // ---------- 三条曲线 ----------

    /** 归一化亲密度。三条曲线共用；好感度不到门槛时为 0 */
    bondT(affinity) {
        const a = Number(affinity);
        if (!Number.isFinite(a)) return 0;
        const span = TacticCatalog.SUMMON_AFFINITY_SPAN || 1;
        return Math.max(0, Math.min(1, (a - TacticCatalog.SUMMON_MIN_AFFINITY) / span));
    },

    /** 乘在施法者点数上。好感度越高，越召得动位格高的人 */
    bondFactor(affinity) {
        return TacticCatalog.SUMMON_BOND_BASE
            + TacticCatalog.SUMMON_BOND_SPAN * this.bondT(affinity);
    },

    /** 投影强度比。上界 BASE + SPAN = 0.95，所以永远不会和本体一致 */
    powerRatio(affinity) {
        return TacticCatalog.SUMMON_POWER_BASE
            + TacticCatalog.SUMMON_POWER_SPAN * this.bondT(affinity);
    },

    durationOf(affinity) {
        return TacticCatalog.SUMMON_ROUNDS_BASE
            + Math.round(TacticCatalog.SUMMON_ROUNDS_SPAN * this.bondT(affinity));
    },

    // ---------- 拼点 ----------

    /**
     * 目标方点数：npc_data 六项**上限**里最高的一项。
     * 这是 EnemyControlManager.bestStat 的上限版镜像——那个读 Hero 的
     * additionalStats 当前值，这里读的是一条还没变成 Hero 的原始记录。
     * 取上限而不是当前值的理由见 TacticCatalog.SUMMON_STAT_KEYS 的注释。
     */
    originBestStat(data) {
        const d = data || {};
        return Math.max(...TacticCatalog.SUMMON_STAT_KEYS.map(k => Number(d[k]) || 0));
    },

    /** 施法者点数：扣费后的当前灵性 × 亲密系数 */
    casterScoreOf(hero, affinity) {
        return this.statAfterCost(hero) * this.bondFactor(affinity);
    },

    /**
     * 理论上还有没有赢面。必输的目标不进列表，玩家就不会白扣灵性——
     * 与 possessBlockedReason 那条同一原则。
     * target 一律传 null，见模块头注释。
     */
    canPossiblyWin(hero, data, affinity) {
        return EnemyControlManager.canPossiblyWin(
            hero, null, 1,
            this.casterScoreOf(hero, affinity),
            this.originBestStat(data),
        );
    },

    /** casterStat 由调用方在扣费之后取，与操控四条的「先扣再拼」同口径 */
    contest(hero, data, affinity, casterStat) {
        return EnemyControlManager.contest(
            hero, null, 1,
            (Number(casterStat) || 0) * this.bondFactor(affinity),
            this.originBestStat(data),
        );
    },

    /**
     * 🆕 真实幻象要拼过的那批人：getEnemyTeam（对面**当前**阵营、活着）再去掉
     * 离场的。附身进本体的、被放逐的都不在棋盘上，拦不住这个幻象；短控倒戈的人
     * teamType 已经改了，本来就不在这份名单里。对面的召唤物算敌人。
     * 拼点与参数区的「在场敌人 N 名」共用这一条，两边口径不会走偏。
     */
    illusionFoes(bm, caster) {
        if (!bm || !caster || typeof bm.getEnemyTeam !== 'function') return [];
        return bm.getEnemyTeam(caster)
            .filter(h => h && TacticResolver.alive(h) && !OffFieldManager.isOff(h));
    },

    /**
     * 🆕 真实幻象的拼点：与**每一个在场敌人**各掷一次当前人性，两边同维。
     * 这一条与上面那套好感曲线没有任何交集——目标是施法者自己，压根没有好感度，
     * 也就没有 bondFactor 可乘、没有 originBestStat 可比。
     *
     * casterStat 由调用方在 spend 之后取（先扣再拼，失败照扣）。
     * 每输一次实力降一档（POWER_STEP），输满 FAIL_LOSSES 次整次失败、不出人。
     * 一个敌人都没有时 0 败、满实力：没人可拼不该算输。
     * @returns {{ok:boolean, losses:number, foes:number, ratio:number}}
     */
    illusionContest(bm, caster, casterStat) {
        const foes = this.illusionFoes(bm, caster);
        const stat = Number(casterStat) || 0;
        let losses = 0;

        foes.forEach(foe => {
            // targetStat 是有限数，contest 不会再去读 foe 的 bestStat
            const roll = EnemyControlManager.contest(
                caster, foe, 1, stat, Number(foe.additionalStats?.当前人性) || 0,
            );
            if (!roll.win) losses++;
        });

        const step = Number(TacticCatalog.SUMMON_ILLUSION_POWER_STEP) || 0;
        const cap = Number(TacticCatalog.SUMMON_ILLUSION_FAIL_LOSSES) || 0;
        return {
            ok: losses < cap,
            losses,
            foes: foes.length,
            ratio: Math.max(0, 1 - step * losses),
        };
    },

    // ---------- 目标池 ----------

    /**
     * 历史投影的目标池：人物关系列表里好感度高过门槛的人。
     * 关系列表只提供好感度——那份是玩家的**主观认知**，属性字段既不可信也不完整；
     * 属性一律取 npc_data 的客观真实那份。
     * @returns {Array<{name, affinity, data, rank, ratio, rounds, sure}>} 按好感度降序
     */
    affinityTargets(bm, hero) {
        const mvu = bm && bm.currentMvuState;
        const rel = (mvu && mvu.stat_data && mvu.stat_data.人物关系列表) || {};
        const pool = (mvu && mvu.npc_data) || {};
        // 本体在场（敌友都算）就召不了他的过去
        const onField = new Set(bm.teamManager.getAllHeroes().map(h => h.name));
        const out = [];

        Object.keys(rel).forEach(name => {
            if (!name || name === '$meta') return;
            const subj = rel[name];
            if (!subj || typeof subj !== 'object') return;

            const affinity = Number(subj.好感度);
            if (!Number.isFinite(affinity)) return;
            if (affinity <= TacticCatalog.SUMMON_MIN_AFFINITY) return;

            const data = pool[name];
            if (!data || typeof data !== 'object') return;
            // 与开战建队同一道校验：六项必需属性缺一不可，
            // 否则 mapToHero 会造出一个属性残缺的单位
            if (!bm.validateCharacterData(data, name).valid) return;

            if (onField.has(name)) return;
            if (this.hasLiveProjection(bm, name)) return;
            if (!this.canPossiblyWin(hero, data, affinity)) return;

            const best = this.originBestStat(data);
            out.push({
                name,
                affinity,
                data,
                rank: parseSequenceRank(data.当前序列),
                ratio: this.powerRatio(affinity),
                rounds: this.durationOf(affinity),
                // 施法者的下界已经压过目标的上界，界面上这一栏写「必成」
                sure: this.casterScoreOf(hero, affinity) * TacticCatalog.CONTEST_ROLL_MIN
                    > best * TacticCatalog.CONTEST_ROLL_MAX,
            });
        });

        return out.sort((a, b) => b.affinity - a.affinity);
    },

    /**
     * 🆕 自体召唤的目标池：施法者自己，永远只有一条。玩家与 NPC 共用——
     * 目标就是本人，NPC 那条「没有关系列表只能现造」的理由在这里不成立。
     *
     * 快照取 originalData 那张**角色卡**，不是场上的当前状态：召出来的是
     * 满状态的自己，不继承战斗中吃到的 buff，也不带偷来 / 复制来的技能。
     * ratio 先按满实力 1 放着：幻想之身直接使用；真实幻象再由 illusionContest
     * 的败场数事后改写。rounds 是 Infinity：两条都没有维持回合数。
     *
     * 刻意**不**调 hasLiveProjection：那条挡的是历史投影「同一本体同时只能有
     * 一个」，而自体召唤靠各子类自己的名额上限控制数量。
     * 同理也不查 onField——本体当然在场上，那正是发起者。
     */
    selfTargets(bm, hero) {
        if (!bm || !hero) return [];
        const data = hero.originalData;
        if (!data || typeof data !== 'object') return [];
        // 与开战建队、与关系池同一道校验：六项必需属性缺一不可
        if (!bm.validateCharacterData(data, hero.name).valid) return [];

        return [{
            name: hero.name,
            // 好感度这一维不存在。留 null 而不是 0：0 会被误当成「好感度为零」
            affinity: null,
            data,
            rank: hero.sequenceRank,
            ratio: 1,
            rounds: Infinity,
            // 拼点结果是连续的实力档，不存在「必成」这个二元判断
            sure: false,
        }];
    },

    /** 快速炼成使用施术者当前有效通识者位阶；正小数按玩法既有口径向上取整。 */
    alchemyRank(hero) {
        const raw = this.eligibilityRank(
            hero && hero.sequenceString,
            TacticCatalog.SUMMON_ALCHEMY,
        );
        if (!Number.isFinite(raw)) return null;
        const effective = raw > 0 ? Math.ceil(raw) : raw;
        return this.valueRankOf(effective);
    },

    /**
     * 玩家快速炼成的途径池：每条途径只给一行，位阶由施术者锁死，玩家只选途径。
     * 能力清单刻意留空，提交成功后 resolveAlchemy 才抽，避免每次重绘为全表付开销。
     */
    alchemyTargets(bm, hero) {
        if (!bm || !hero) return [];
        const valueRank = this.alchemyRank(hero);
        if (!Number.isFinite(valueRank)) return [];
        const pathways = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
            ? GameDBManager.DB.godPathways : null;
        if (!pathways || typeof pathways !== 'object') return [];
        const nameRank = this.nameRankOf(valueRank);
        const out = [];

        Object.entries(pathways).forEach(([pathwayName, list]) => {
            if (!Array.isArray(list)) return;
            const libEntry = list.find(seq => typeof seq === 'string'
                && parseSequenceRank(seq) === nameRank);
            if (!libEntry) return;
            const seqString = this.composeSequence(valueRank, libEntry);
            let data = null;
            try {
                data = this.synthesizeRecord(seqString);
            } catch (error) {
                console.warn(`[快速炼成] 跳过无法构建的途径 ${pathwayName}`, error);
                return;
            }
            if (!data) return;
            const pathway = String(pathwayName || '').replace(/途径$/, '').trim()
                || (typeof getPureName === 'function' ? getPureName(seqString) : seqString);
            out.push({
                name: String(pathwayName),
                pathway,
                displayName: `${hero.name}炼成的${pathway}临时魔偶`,
                affinity: null,
                data,
                rank: parseSequenceRank(seqString),
                ratio: TacticCatalog.SUMMON_ALCHEMY_RATIO,
                rounds: Infinity,
                sure: true,
            });
        });
        return out.sort((a, b) => a.pathway.localeCompare(b.pathway, 'zh-CN'));
    },

    /** NPC 不展示列表，直接从与玩家相同的途径池里随机留一条给本轮缓存。 */
    randomAlchemyCandidates(bm, hero) {
        const rows = this.alchemyTargets(bm, hero);
        if (!rows.length) return [];
        return [rows[Math.floor(Math.random() * rows.length)]];
    },

    /** 画中人使用当前有效萨满位阶；正小数沿用现有合成口径向上取整。 */
    pictureRank(hero) {
        const raw = this.eligibilityRank(
            hero && hero.sequenceString,
            TacticCatalog.SUMMON_PICTURE_PERSON,
        );
        if (!Number.isFinite(raw)) return null;
        return this.valueRankOf(raw > 0 ? Math.ceil(raw) : raw);
    },

    /** NPC 的随机画中人候选池：每条途径一行，能力到真正发动时再抽。 */
    picturePathwayTargets(bm, hero) {
        if (!bm || !hero) return [];
        const valueRank = this.pictureRank(hero);
        if (!Number.isFinite(valueRank)) return [];
        const pathways = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
            ? GameDBManager.DB.godPathways : null;
        if (!pathways || typeof pathways !== 'object') return [];
        const nameRank = this.nameRankOf(valueRank);
        const out = [];
        Object.entries(pathways).forEach(([pathwayName, list]) => {
            if (!Array.isArray(list)) return;
            const libEntry = list.find(seq => typeof seq === 'string'
                && parseSequenceRank(seq) === nameRank);
            if (!libEntry) return;
            const seqString = this.composeSequence(valueRank, libEntry);
            let data;
            try { data = this.synthesizeRecord(seqString); }
            catch (error) {
                console.warn(`[画中人] 跳过无法构建的途径 ${pathwayName}`, error);
                return;
            }
            const pathway = String(pathwayName || '').replace(/途径$/, '').trim()
                || (typeof getPureName === 'function' ? getPureName(seqString) : seqString);
            const displayName = `${hero.name}召唤的${pathway}画中人`;
            out.push({
                name: String(pathwayName), originName: displayName, displayName,
                pathway, data, rank: parseSequenceRank(seqString),
                ratio: TacticCatalog.SUMMON_PICTURE_PERSON_RATIO,
                rounds: Infinity, sure: true, persistent: false, pictureId: '',
            });
        });
        return out;
    },

    randomPictureCandidates(bm, hero) {
        const rows = this.picturePathwayTargets(bm, hero);
        if (!rows.length) return [];
        return [rows[Math.floor(Math.random() * rows.length)]];
    },

    /** 玩家只从制造仓库选成品；本场已经战死待结算的记录立刻从池中排除。 */
    pictureTargets(bm, hero) {
        if (!bm || !hero || hero.dataSource !== 'player' || !window.ShamanPictureMode) return [];
        const lost = new Set((bm.picturePersonLosses || []).map(x => String(x && x.id || '')));
        return window.ShamanPictureMode.recordsOfState(bm.currentMvuState)
            .filter(row => row && row.id && !lost.has(String(row.id)))
            .map(row => ({
                name: String(row.id),
                originName: String(row.name),
                displayName: String(row.name),
                pathway: String(row.pathway || ''),
                data: _.cloneDeep(row.data),
                rank: parseSequenceRank(String(row.data && row.data.当前序列 || '')),
                ratio: TacticCatalog.SUMMON_PICTURE_PERSON_RATIO,
                rounds: Infinity,
                sure: true,
                persistent: true,
                pictureId: String(row.id),
            }));
    },

    grazingRatio(hero) {
        const seq = this.grazingEligibilitySequence(hero);
        const gate = window.GrazingCore ? window.GrazingCore.resolveOwnerSequence(seq) : null;
        const rank = gate && gate.rank;
        if (!Number.isFinite(rank) || rank > 4) return 0;
        if (rank >= 4) return 0.60;
        if (rank >= 3) return 0.70;
        if (rank >= 2) return 0.85;
        return 1;
    },

    grazingTargets(bm, hero) {
        if (!bm || !hero || !window.GrazingCore) return [];
        if (hero.dataSource !== 'player') return [];
        const released = new Set(this.ensure(bm).projections
            .filter(p => p.subtype === TacticCatalog.SUMMON_GRAZING && p.ownerId === hero.heroId)
            .map(p => p.origin));
        const ratio = this.grazingRatio(hero);
        return window.GrazingCore.activeSelections(bm.currentMvuState)
            .filter(x => !released.has(x.name))
            .map(x => ({
                name: x.name,
                displayName: `${x.name}的外放灵魂`,
                data: _.cloneDeep(x.data),
                rank: x.rank,
                ratio,
                rounds: Infinity,
                sure: true,
                persistent: true,
            }));
    },

    /** 当前子类的目标池。子类配置里写的是方法名，这里做一次分发 */
    targets(bm, hero, subtype) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !hero) return [];
        const fn = this[cfg.targetPool];
        return typeof fn === 'function' ? fn.call(this, bm, hero) : [];
    },

    /**
     * 任意子类下是否还有可召唤的目标。
     * 只看资格与目标池，不看名额与消耗——参数区的闸门要逐子类分开报原因，
     * 走的是 TacticRoundUI.summonKindBlockedReason，不是这一条。
     */
    anyTarget(bm, hero) {
        if (!hero) return false;
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().some(k => elig[k] && this.targets(bm, hero, k).length > 0);
    },

    // ---------- NPC 侧随机目标池 ----------
    //   NPC 既没有人物关系列表也没有本体记录，目标只能现造：从世界书的神之途径里
    //   随机抽一个序列名，再用 schema 那套属性构建算法把它算成一条完整记录。
    //   全程不读 npc_data、不写 MVU，造出来的记录只活在这一场战斗的内存里。
    //
    //   之所以能直接塞给 buildProjection：那个方法只读 entry 的
    //   data / ratio / name / rounds 四项，认的是形状而不是来源。
    //
    //   好感度这一维在这里是**现掷的**（每个候选各自随机一个 120~200），
    //   所以三条曲线一行都不用改，梯度也还在。

    /**
     * 「数值档 → 该档的序列名条目」索引。懒加载并缓存：godPathways 在一场战斗内
     * 不会变。缓存连着源对象的引用一起存，世界书重载时 loadConfigs 会换一个新对象，
     * 引用一变缓存自然失效，不需要另设失效机制。
     * 只收 0..9 的整数档：支柱与旧日不入池（顶端封顶到序列 0），
     * 小数档在途径表里本来就没有条目。
     */
    seqPoolByRank() {
        const pathways = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
            ? GameDBManager.DB.godPathways
            : null;
        if (this._seqPool && this._seqPoolSrc === pathways) return this._seqPool;

        const pool = {};
        if (pathways && typeof pathways === 'object') {
            Object.values(pathways).forEach(list => {
                if (!Array.isArray(list)) return;
                list.forEach(seqName => {
                    if (!seqName || typeof seqName !== 'string') return;
                    const rank = parseSequenceRank(seqName);
                    if (!Number.isInteger(rank) || rank < 0 || rank > 9) return;
                    if (!pool[rank]) pool[rank] = [];
                    pool[rank].push(seqName);
                });
            });
        }
        this._seqPoolSrc = pathways;
        this._seqPool = pool;
        return pool;
    },

    /**
     * 名字档位：整数取自身，0.X 取 1，再钳进 0..9。
     * 小数序列在神之途径里没有任何条目——0.X 是序列 1 到序列 0 的中间态，
     * 本质仍是序列 1，共用序列 1 的序列名，这样也能命中序列 1 的能力清单。
     */
    nameRankOf(rank) {
        const n = Number(rank);
        if (!Number.isFinite(n)) return 9;
        return Math.max(0, Math.min(9, Math.ceil(n)));
    },

    /** 数值档位：原值保留小数；顶端（旧日 -1 / 支柱 -2）钳到序列 0 */
    valueRankOf(rank) {
        const n = Number(rank);
        if (!Number.isFinite(n)) return 9;
        return Math.min(9, Math.max(0, n));
    },

    /**
     * 把「数值档 + 库里的原条目」组装成候选的当前序列。
     * 数值与名字同档时**原样返回库条目**：原样使用才能保证 parseSequenceRank、
     * getPureName 反查途径、能力体系 includes 三处匹配都不出偏差。
     * 只有小数档（只可能出现在同阶）才重新拼前缀。
     */
    composeSequence(valueRank, libEntry) {
        if (Number.isInteger(valueRank)) return libEntry;
        const pure = (typeof getPureName === 'function') ? getPureName(libEntry) : libEntry;
        return `序列${valueRank}-${pure}`;
    },

    /**
     * 按序列串现造一条完整的属性记录。公式逐字照 NpcObjectiveSchema 的 transform：
     *   配额 = 序列基准 × 模板倍率 × 战斗经验倍率，再按能力体系分配到六项。
     * 模板填「普通」交给 getAndFixNpcTemplateMultiplier 按位阶强制拉到该档下限，
     * 于是候选一律是该位阶的最低模板档（rank ≤2 首领 / 3-4 头目 / 5-7 精英 / 8-9 普通）。
     * 战斗经验等级给 0：现造的单位没有养成史。
     * 刻意不填「名称」：随机单位不做立绘，棋子走首字兜底。
     * 能力清单先留空，等拼点赢了再抽——那一步要遍历整个途径库，是这条链上唯一贵的操作。
     */
    synthesizeRecord(seqString) {
        const seqRank = parseSequenceRank(seqString);
        const record = {
            当前序列: seqString,
            模板: '普通',
            神性: getSequenceDivinity(seqRank),
            能力清单: [],
        };
        record.能力体系 = getAbilitySystemFromWorldbook(seqString, '', true);

        const baseValue = getSequenceBaseValue(seqRank);
        const multiplier = getAndFixNpcTemplateMultiplier(record, seqRank);
        const totalQuota = baseValue * multiplier * battleExpMultiplier(0);
        const allocated = allocateAttributes(totalQuota, record.能力体系);

        TacticCatalog.SUMMON_STAT_KEYS.forEach(key => {
            const cap = Math.max(1, Math.round(Number(allocated[key]) || 0));
            record[key] = cap;
            // 运气是唯一没有「当前」项的一维，与 buildProjection 的缩放同口径
            if (key !== '运气') record[`当前${key}`] = cap;
        });

        return record;
    },

    /** 抽一份能力清单。与 schema 首次初始化同一条通道：先取池子，再加权抽 */
    rollAbilitiesFor(seqString) {
        const seqRank = parseSequenceRank(seqString);
        const pool = fetchAvailableAbilities(seqString, false);
        return generateNpcAbilities(pool, seqRank);
    },

    /**
     * 现造 NPC 的候选目标：同阶与低阶各 SUMMON_NPC_PER_TIER 个。
     * 「低」是序列数值大，所以低一阶 = floor(rank + 1)；小数施法者的低阶一律落到序列 1，
     * 同阶则保留自己的小数、名字仍取序列 1 那一档。
     * 每个候选各自现掷一个好感度，再用现成的 canPossiblyWin 把必输的筛掉——
     * 与关系池同一道闸门，谁都不该为一个必输的拼点付灵性。
     * @returns {Array<{name, affinity, data, rank, ratio, rounds, sure, displayName}>}
     *          形状与 affinityTargets 一致，多一个 displayName 供命名用
     */
    randomCandidates(bm, caster) {
        if (!bm || !caster) return [];
        const casterRank = Number(caster.sequenceRank);
        if (!Number.isFinite(casterRank)) return [];

        const pool = this.seqPoolByRank();
        const per = Math.max(1, Number(TacticCatalog.SUMMON_NPC_PER_TIER) || 1);
        const floor = Number(TacticCatalog.SUMMON_MIN_AFFINITY) || 0;
        const span = Number(TacticCatalog.SUMMON_AFFINITY_SPAN) || 1;

        // 旧日与支柱施法者的两档会被 valueRankOf 一起钳到序列 0，于是退化成同一档
        const tiers = [
            this.valueRankOf(casterRank),
            this.valueRankOf(Math.floor(casterRank + 1)),
        ];
        const out = [];

        tiers.forEach(valueRank => {
            const names = pool[this.nameRankOf(valueRank)];
            if (!Array.isArray(names) || names.length === 0) return;

            for (let i = 0; i < per; i++) {
                const libEntry = names[Math.floor(Math.random() * names.length)];
                const seqString = this.composeSequence(valueRank, libEntry);
                const data = this.synthesizeRecord(seqString);
                const affinity = floor + Math.random() * span;
                if (!this.canPossiblyWin(caster, data, affinity)) continue;

                const pure = (typeof getPureName === 'function')
                    ? getPureName(seqString)
                    : seqString;
                const best = this.originBestStat(data);
                out.push({
                    name: pure,
                    displayName: `${caster.name}召唤的${pure}投影`,
                    affinity,
                    data,
                    rank: parseSequenceRank(seqString),
                    ratio: this.powerRatio(affinity),
                    rounds: this.durationOf(affinity),
                    sure: this.casterScoreOf(caster, affinity) * TacticCatalog.CONTEST_ROLL_MIN
                        > best * TacticCatalog.CONTEST_ROLL_MAX,
                });
            }
        });

        return out;
    },

    randomGrazingCandidates(bm, caster) {
        if (!bm || !caster) return [];
        const eligibility = window.GrazingCore
            ? window.GrazingCore.resolveOwnerSequence(this.grazingEligibilitySequence(caster))
            : null;
        const rank = Number(eligibility && eligibility.rank);
        if (!Number.isFinite(rank)) return [];
        const pool = this.seqPoolByRank();
        const tiers = [this.valueRankOf(rank), this.valueRankOf(Math.floor(rank + 1))];
        const ratio = this.grazingRatio(caster);
        const out = [];
        tiers.forEach(valueRank => {
            const names = pool[this.nameRankOf(valueRank)];
            if (!Array.isArray(names) || !names.length) return;
            const libEntry = names[Math.floor(Math.random() * names.length)];
            const seqString = this.composeSequence(valueRank, libEntry);
            const data = this.synthesizeRecord(seqString);
            data.能力清单 = this.rollAbilitiesFor(seqString);
            const pure = typeof getPureName === 'function' ? getPureName(seqString) : seqString;
            out.push({
                name: pure,
                displayName: `${pure}的外放灵魂`,
                data,
                rank: parseSequenceRank(seqString),
                ratio,
                rounds: Infinity,
                sure: true,
                persistent: false,
            });
        });
        return out;
    },

    /** 把本轮现造的候选存起来：掷骰阶段造一次，pick 阶段复用同一批 */
    cacheCandidates(bm, caster, list) {
        if (!bm || !caster) return;
        this.ensure(bm).npcCandidates[caster.heroId] = {
            round: Number(bm.currentRound) || 0,
            list: list || [],
        };
    },

    /** 取本轮缓存。回合对不上就当没有——绝不拿上一轮的候选去结算 */
    cachedCandidates(bm, caster) {
        if (!bm || !caster) return [];
        const hit = this.ensure(bm).npcCandidates[caster.heroId];
        if (!hit || hit.round !== (Number(bm.currentRound) || 0)) return [];
        return hit.list || [];
    },

    /**
     * 场上不重名。同一施法者连着召来两个同序列的投影时给后者加序号，
     * 写法与效果命名去重一致。名字是战报文案、目标列表与棋子首字共用的 key，
     * 重名会让人分不清谁是谁。
     */
    uniqueName(bm, base) {
        const heroes = (bm && bm.teamManager) ? bm.teamManager.getAllHeroes() : [];
        const used = new Set(heroes.map(h => h && h.name));
        let name = base;
        for (let i = 2; used.has(name); i++) name = `${base}${i}`;
        return name;
    },

    /**
     * 🆕 带序号的命名：「{施法者名}的真实幻象1」「…2」。
     * 不能用 uniqueName——那条是「第一个不带数字、撞了才从 2 起」，
     * 而这里第一个就要带 1，两个幻象站在一起才分得清谁是谁。
     * 上界取 used.size + 1：这么多个编号里必有一个空的。
     */
    illusionName(bm, caster, suffix) {
        const heroes = (bm && bm.teamManager) ? bm.teamManager.getAllHeroes() : [];
        const used = new Set(heroes.map(h => h && h.name));
        const base = `${caster.name}${suffix}`;
        for (let i = 1; i <= used.size + 1; i++) {
            const name = `${base}${i}`;
            if (!used.has(name)) return name;
        }
        return base;
    },

    // ---------- 落位 ----------

    /**
     * 施法者周围最近的空格，逐圈往外扩到棋盘边界，不设半径上限——
     * 只有整个棋盘塞满才会返回 null，而单方容量是 60，实际上不可能。
     * 取整圈的手法与 ForcedMoveManager.away 同源（都用 getOuterRangeCells）。
     * 同一圈里友方优先靠后（y 大），敌方优先靠前，也就是尽量落在自己这一侧。
     */
    freeCellNear(board, caster) {
        if (!board || !caster) return null;
        if (!Number.isFinite(caster.x) || !Number.isFinite(caster.y)) return null;
        const toAlly = caster.teamType === 'ally';
        const max = Math.max(board.cols, board.rows);
        for (let r = 1; r <= max; r++) {
            const cells = board.getOuterRangeCells(caster.x, caster.y, r)
                .filter(c => board.isFree(c.x, c.y))
                .sort((a, b) => (toAlly ? b.y - a.y : a.y - b.y));
            if (cells.length) return cells[0];
        }
        return null;
    },

    // ---------- 生成 ----------

    /**
     * 把一条 npc_data 记录变成一个临时友军。前六步逐字照 createTeamFromConfig：
     * 深拷缩放 → mapToHero → 定 teamType → new Hero → 装技能 → 挂保命。
     * 后两步是补 startBattle 统一做过、而中途入场就没人做的事：固有标签与被动技能。
     * 少了它们，投影会既没有克制关系也吃不到自己的被动。
     *
     * 缩放只动六项**上限**，当前值一律拉满到新上限——投影是「历史上满状态的他」，
     * 不继承本体现在的伤。
     * `名称` 字段刻意保持原值不动：棋子立绘解析的第二个 key 读它（见
     * BattleDisplayUI.pieceInnerHtml），于是投影自动长着本体的脸。
     * NPC 侧现造的候选没有本体，会带一个 displayName 走另一套命名，
     * 那种记录也刻意不填 `名称`，落到棋盘上就是首字兜底。
     */
    buildProjection(bm, caster, entry, subtype) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg) return null;

        const scaled = _.cloneDeep(entry.data);
        if (cfg.grazing) {
            try {
                const full = fetchAvailableAbilities(String(scaled.当前序列 || ''), false) || {};
                scaled.能力清单 = Object.values(full).flatMap(x => Array.isArray(x) ? _.cloneDeep(x) : []);
            } catch (e) {
                console.warn('[放牧] 外放灵魂读取完整能力失败，回退到灵魂快照能力', e);
            }
        }
        TacticCatalog.SUMMON_STAT_KEYS.forEach(key => {
            const cap = Math.max(1, Math.round((Number(scaled[key]) || 0) * entry.ratio));
            scaled[key] = cap;
            // 运气是唯一没有「当前」项的一维，其余五项当前值一律等于新上限
            if (key !== '运气') scaled[`当前${key}`] = cap;
        });

        // 关系池走「本体真名 + 子类后缀」，现造的候选自带 displayName。
        // 两条都过一遍去重：关系池那边同一本体同时只能有一个投影，撞不上，白跑一次而已。
        // 🆕 numbered 的子类（真实幻象）另走一条：第一个就叫「…1」。
        // dataSource 一律 'npc'，玩家召的也是——战术面板认的是唯一那具
        // dataSource === 'player'，多一具会让面板不知道该听谁的
        const name = cfg.numbered
            ? this.illusionName(bm, caster, cfg.suffix)
            : this.uniqueName(bm, entry.displayName || `${entry.name}${cfg.suffix}`);
        const heroConfig = AttributeMapper.mapToHero(scaled, name, 'npc');
        if (!heroConfig) return null;
        heroConfig.teamType = caster.teamType;

        const hero = new Hero(heroConfig);
        // 谁召的谁操纵：玩家召的投影由玩家在它的行动回合里点技能
        hero.controller = caster.controller || caster.dataSource || 'npc';
        // 这个标记是三条统计口径的唯一判据：战斗经验、战后属性一览、胜负统计
        hero.isSummon = true;
        hero.summonSubtype = subtype;
        hero.summonOwnerId = caster.heroId;
        hero.summonOrigin = entry.originName || entry.name;
        hero.grazingPersistent = !!(cfg.grazing && entry.persistent);
        hero.picturePersonId = cfg.picture ? String(entry.pictureId || '') : '';
        hero.picturePersonPersistent = !!(cfg.picture && entry.persistent && entry.pictureId);
        hero.picturePersonImmobile = !!cfg.picture;
        // 绝对回合数，口径与 MythicFormManager.mythicUntil 一致：战术回合排在
        // finishRound 之后，所以本轮刚召的不会被同一次 tick 收走。
        // 🆕 noExpire 的子类给 Infinity 而不是 null：tick 判的是 round < until，
        // null 会被当成 0 立刻收走，Infinity 才是「永不到期」
        hero.summonUntil = cfg.noExpire
            ? Infinity
            : (Number(bm.currentRound) || 0) + entry.rounds;

        // 空技能兜底：抽出来的能力全是纯描述时 isBattleAbility 会一条不留，
        // 而 setMoveSet 拿到空数组的单位在 AI 回合里只会被跳过，成了个木桩。
        // 按现有抽取算法这不该发生（能力池空时 generateNpcAbilities 自己会给兜底攻击），
        // 纯防御。兜底那条同样从 generateNpcAbilities 取，威力按序列查表。
        // 🆕 读卡按**这张卡本身的来源**分流，不按施法者是谁。
        // selfTargets 的子类（真实幻象）拿的就是施法者自己那张卡，所以跟着他的
        // dataSource 读：玩家卡的能力躺在 序列能力列表 / 消耗品列表 里，拿 'npc'
        // 去读会读成空表，幻象就只剩兜底武器。
        // 其余子类的卡来自 npc_data 或现造记录，一律 'npc'——按「施法者是不是玩家」
        // 分会误伤玩家召的历史投影：那张是 NPC 卡，按 'player' 读同样是空表
        const cardSource = cfg.targetPool === 'selfTargets'
            ? (caster.dataSource || 'npc')
            : 'npc';
        // 新单位自身的 dataSource 恒为 'npc'。只有两者不一致时才留这个标记，
        // 于是全场只有玩家的真实幻象带它，executeAITurn 重建时按它读卡；
        // 别的单位身上没有这个字段，那边的回落口径一字不变
        if (cardSource !== 'npc') hero.cardSource = cardSource;
        let moves = SkillLoader.loadSkillsFromCharacter(scaled, cardSource, hero.sequenceRank, hero);
        if (!moves || moves.length === 0) {
            moves = SkillLoader.loadSkillsFromCharacter(
                { 能力清单: generateNpcAbilities(null, hero.sequenceRank) },
                'npc', hero.sequenceRank, hero,
            );
        }
        hero.setMoveSet(moves);
        LifeSaveManager.initOnHero(hero);

        if (bm.tagManager && typeof bm.tagManager.applyInherentTagsTo === 'function') {
            bm.tagManager.applyInherentTagsTo(hero);
        }
        if (typeof bm.applyPassiveSkillsFor === 'function') {
            bm.applyPassiveSkillsFor(hero);
        }
        // 🆕 中途入场的单位补挂当前四栏的环境效果。管线末尾那次 resync 也会覆盖到它，
        // 但那要等到本轮结算完；召唤物在此之前就可能被读属性（落位、索敌），
        // 所以在这里先补一次。applyAllTo 是 resync 的单人版，语义完全一致
        EnvironmentManager.applyAllTo(bm, hero);

        return hero;
    },

    /**
     * 落地一次成功的召唤：入队、落位、记账。
     * 落位失败就整个回滚——宁可不召，也不能留一个不在棋盘上的单位，
     * 那种单位所有距离判定都是 Infinity，比不召更糟。
     * @returns {boolean} 是否真的站上了棋盘
     */
    place(bm, caster, hero) {
        const cell = this.freeCellNear(bm.board, caster);
        if (!cell) return false;

        // bm.allyTeam 与 bm.teamManager.allyTeam 是**同一个数组对象**，只能操作一次
        const team = caster.teamType === 'ally' ? bm.allyTeam : bm.enemyTeam;
        if (!team.includes(hero)) team.push(hero);

        if (!bm.board.place(hero, cell.x, cell.y)) {
            const i = team.indexOf(hero);
            if (i >= 0) team.splice(i, 1);
            return false;
        }

        const state = this.ensure(bm);
        // 名额按子类记：各子类的上限不同，共用一个数字会互相吃名额
        const rec = state.counts[caster.heroId] || (state.counts[caster.heroId] = {});
        const sub = hero.summonSubtype;
        rec[sub] = (Number(rec[sub]) || 0) + 1;
        state.projections.push({
            heroId: hero.heroId,
            subtype: hero.summonSubtype,
            origin: hero.summonOrigin,
            until: hero.summonUntil,
            ownerId: caster.heroId,
            ownerName: caster.name,
            persistent: !!hero.grazingPersistent,
            pictureId: hero.picturePersonId || '',
            picturePersistent: !!hero.picturePersonPersistent,
        });
        return true;
    },

    // ---------- 发起 ----------

    /**
     * 幻想之身的自动成功结算。玩家与 NPC 共用：先扣默认灵性 5%，随后以角色卡
     * 100% 满状态建模；不读取当前战斗效果，也不进入任何拼点函数。
     */
    resolveAutoSelf(bm, caster, subtype, entry, summary, results) {
        const spent = this.spend(caster, subtype);
        entry.ratio = 1;
        entry.rounds = Infinity;

        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的${subtype}未生效（自身角色卡不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name} 凝出了${subtype}，战场上却没有一寸落脚之地`);
            return false;
        }

        summary.push(`✓ ${caster.name} 以${subtype}塑造了 ${hero.name}`
            + `（实力 100%，消耗${spent.key} ${spent.cost}，`
            + `名额 ${this.usedOf(bm, caster, subtype)}/${this.maxOf(caster, subtype)}）`);
        results.push({
            kind: 'summon', stage: 'start', actor: caster.name,
            subtype, target: hero.name, origin: entry.name,
        });
        return true;
    },

    /**
     * 🆕 真实幻象的结算段。玩家侧与 NPC 侧一字不差，所以从两个入口里提出来：
     * 目标都是施法者自己，不存在「面板快照 vs 现算」的偏差，也没有
     * 「现造的记录还得补抽能力清单」这一步。
     *
     * 顺序是先扣再拼（失败照扣），与操控四条、与历史投影同口径。
     * 拼点用的是**扣费之后**的当前人性；败场数换算成实力比，写回 entry.ratio，
     * 再交给 buildProjection 缩放六维。
     * @returns {boolean} 是否成功
     */
    resolveIllusion(bm, caster, subtype, entry, summary, results) {
        const spent = this.spend(caster, subtype);
        const roll = this.illusionContest(
            bm, caster, caster.additionalStats[spent.field] ?? 0,
        );

        if (!roll.ok) {
            summary.push(`✗ ${caster.name} 的${subtype}溃散在诸多敌意之下`
                + `（对 ${roll.foes} 名敌人拼${spent.key}，输了 ${roll.losses} 次）`);
            return false;
        }

        // 满实力起步，每输一次降一档。buildProjection 只认 entry.ratio
        entry.ratio = roll.ratio;

        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的${subtype}未生效（${entry.name} 的角色卡不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name} 凝出了${subtype}，战场上却没有一寸落脚之地`);
            return false;
        }

        summary.push(`✓ ${caster.name} 以${subtype}召来了 ${hero.name}`
            + `（实力 ${Math.round(roll.ratio * 100)}%，`
            + `对 ${roll.foes} 名敌人输了 ${roll.losses} 次，`
            + `名额 ${this.usedOf(bm, caster, subtype)}/${this.maxOf(caster, subtype)}）`);
        results.push({
            kind: 'summon',
            stage: 'start',
            actor: caster.name,
            subtype,
            target: hero.name,
            origin: entry.name,
        });
        return true;
    },

    /**
     * 快速炼成的共用结算：玩家与 NPC 都先扣平均灵性 5%，不拼点，随后才为选中的
     * 途径抽能力并建模。只有 place 真正成功才会在该子类的累计额度上记一次。
     */
    resolveAlchemy(bm, caster, subtype, entry, summary, results) {
        const spent = this.spend(caster, subtype);
        try {
            entry.data.能力清单 = this.rollAbilitiesFor(entry.data.当前序列);
        } catch (error) {
            console.warn(`[快速炼成] ${caster.name} 抽取临时魔偶能力失败`, error);
            summary.push(`✗ ${caster.name} 的${subtype}未生效（所选途径的能力库不可用）`);
            return false;
        }

        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的${subtype}未生效（临时魔偶数据不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name} 完成了${subtype}，战场上却没有临时魔偶的落脚之地`);
            return false;
        }

        const count = this.usedOf(bm, caster, subtype);
        const cap = this.maxOf(caster, subtype);
        const pathway = entry.pathway || entry.name;
        summary.push(`✓ ${caster.name}以${subtype}制造了 ${hero.name}`
            + `（${pathway}，实力 ${Math.round(entry.ratio * 100)}%，`
            + `消耗${spent.key} ${spent.cost}，名额 ${count}/${cap}）`);
        results.push({
            kind: 'summon', stage: 'start', actor: caster.name,
            subtype, target: hero.name, origin: pathway,
        });
        return true;
    },

    /** 画中人必成：玩家使用已固化的制造卡，NPC 到发动时才为随机途径抽能力。 */
    resolvePicture(bm, caster, subtype, entry, summary, results, npc = false) {
        const spent = this.spend(caster, subtype);
        if (npc) {
            try {
                entry.data.能力清单 = this.rollAbilitiesFor(entry.data.当前序列);
            } catch (error) {
                console.warn(`[画中人] ${caster.name} 抽取随机画中人能力失败`, error);
                summary.push(`✗ ${caster.name} 的${subtype}未生效（随机途径的能力库不可用）`);
                return false;
            }
        }
        entry.ratio = TacticCatalog.SUMMON_PICTURE_PERSON_RATIO;
        entry.rounds = Infinity;
        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的${subtype}未生效（画中人角色卡不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name}试图${subtype}，战场上却没有画中人的落脚之地`);
            return false;
        }
        const count = this.usedOf(bm, caster, subtype);
        const cap = this.maxOf(caster, subtype);
        summary.push(`✓ ${caster.name}以${subtype}召来了 ${hero.name}`
            + `（${entry.pathway || '未知途径'}，实力100%，移动力0，`
            + `消耗${spent.key} ${spent.cost}，在场 ${count}/${cap}）`);
        results.push({
            kind: 'summon', stage: 'start', actor: caster.name,
            subtype, target: hero.name, origin: entry.originName || hero.name,
        });
        return true;
    },

    resolveGrazing(bm, caster, subtype, entry, summary, results, npc = false) {
        const cap = this.maxOf(caster, subtype);
        if (this.usedOf(bm, caster, subtype) >= cap) {
            summary.push(`✗ 外放数量已达到当前上限 ${cap} 个。`);
            return false;
        }
        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的外放灵魂未生效（${entry.name} 的数据不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name}试图外放${entry.name}的灵魂，但战场上没有落脚位置`);
            return false;
        }
        const count = this.usedOf(bm, caster, subtype);
        const percent = Math.round(entry.ratio * 100);
        summary.push(npc
            ? `✓ ${caster.name}随机外放了${entry.name}的灵魂（实力${percent}%，外放${count}/${cap}）`
            : `✓ ${caster.name}外放了${entry.name}的灵魂（实力${percent}%，外放${count}/${cap}）`);
        results.push({
            kind: 'summon', stage: 'start', actor: caster.name,
            subtype, target: hero.name, origin: entry.name,
        });
        return true;
    },

    /**
     * 玩家发起一次召唤。先扣再拼、成败都扣，与操控四条同口径。
     * 就地结算不进仲裁：目标不在棋盘上，不存在多人抢同一目标的独占问题——
     * 这一点与技能干涉相同。自体召唤的原型虽然在棋盘上（就是发起者自己），
     * 但它谁也不占用，同样没有抢目标的问题。
     * @returns {boolean} 是否成功
     */
    tryPlayerSummon(bm, caster, subtype, targetName, summary, results) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !caster || !targetName) return false;

        if (this.quotaLeft(bm, caster, subtype) <= 0) {
            summary.push(`✗ ${caster.name} 召唤${subtype}的次数已达上限。`);
            return false;
        }

        // 目标池现算，不认界面上那份快照：从打开面板到提交之间，本体可能已经
        // 被别的途径拉进场，名额也可能已经用完
        const entry = this.targets(bm, caster, subtype).find(t => t.name === targetName);
        if (!entry) {
            summary.push(`✗ ${caster.name} 的${subtype}失败：${targetName} 已不是可召唤的目标`);
            return false;
        }

        if (cfg.autoSelf) {
            return this.resolveAutoSelf(bm, caster, subtype, entry, summary, results);
        }
        if (cfg.contest === 'illusion') {
            return this.resolveIllusion(bm, caster, subtype, entry, summary, results);
        }
        if (cfg.alchemy) {
            return this.resolveAlchemy(bm, caster, subtype, entry, summary, results);
        }
        if (cfg.picture) {
            return this.resolvePicture(bm, caster, subtype, entry, summary, results, false);
        }
        if (cfg.grazing) {
            return this.resolveGrazing(bm, caster, subtype, entry, summary, results, false);
        }

        const spent = this.spend(caster, subtype);
        const roll = this.contest(
            caster, entry.data, entry.affinity,
            caster.additionalStats[spent.field] ?? 0,
        );
        const tail = EnemyControlManager.contestTail(roll);

        if (!roll.win) {
            summary.push(`✗ ${caster.name} 没能从历史孔隙中拽出 ${targetName}${tail}`);
            return false;
        }

        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的${subtype}未生效（${targetName} 的数据不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name} 召来了 ${targetName} 的投影，战场上却没有一寸落脚之地`);
            return false;
        }

        summary.push(`✓ ${caster.name} 以${subtype}召来了 ${hero.name}`
            + `（实力 ${Math.round(entry.ratio * 100)}%，维持 ${entry.rounds} 回合，`
            + `名额 ${this.usedOf(bm, caster, subtype)}/${this.maxOf(caster, subtype)}）${tail}`);
        results.push({
            kind: 'summon',
            stage: 'start',
            actor: caster.name,
            subtype,
            target: hero.name,
            origin: entry.name,
        });
        return true;
    },

    /**
     * NPC 发起一次召唤。与 tryPlayerSummon 的差别只有两处：
     *   1) 目标不按名字回查目标池。NPC 没有界面，不存在「面板快照 vs 现算」的偏差，
     *      吃的就是掷骰阶段现造并缓存的那一批候选里的一个；
     *   2) 能力清单在拼点赢了之后才抽。那一步要遍历整个途径库，输掉的那次
     *      没必要为一个不会落地的单位付这个开销。
     * 扣费口径与玩家侧一致：先扣再拼，失败照扣。
     * 「6 个候选全军覆没就当没发生」不在这里实现——那道闸门在掷骰阶段，
     * 走到这个方法说明至少有一个候选是有赢面的。
     * 🆕 上面两条差别都只对历史投影成立：真实幻象的候选是施法者自己的角色卡，
     * 能力清单本来就是全的，不需要补抽，所以直接并到共用的那一段去。
     * @returns {boolean} 是否成功
     */
    tryNpcSummon(bm, caster, subtype, entry, summary, results) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !caster || !entry || !entry.data) return false;

        if (this.quotaLeft(bm, caster, subtype) <= 0) {
            summary.push(`✗ ${caster.name} 召唤${subtype}的次数已达上限。`);
            return false;
        }

        if (cfg.autoSelf) {
            return this.resolveAutoSelf(bm, caster, subtype, entry, summary, results);
        }
        if (cfg.contest === 'illusion') {
            return this.resolveIllusion(bm, caster, subtype, entry, summary, results);
        }
        if (cfg.alchemy) {
            return this.resolveAlchemy(bm, caster, subtype, entry, summary, results);
        }
        if (cfg.picture) {
            return this.resolvePicture(bm, caster, subtype, entry, summary, results, true);
        }
        if (cfg.grazing) {
            return this.resolveGrazing(bm, caster, subtype, entry, summary, results, true);
        }

        const spent = this.spend(caster, subtype);
        const roll = this.contest(
            caster, entry.data, entry.affinity,
            caster.additionalStats[spent.field] ?? 0,
        );
        const tail = EnemyControlManager.contestTail(roll);

        if (!roll.win) {
            summary.push(`✗ ${caster.name} 没能从历史孔隙中拽出 ${entry.name}${tail}`);
            return false;
        }

        // 赢了才抽能力：现造的记录里 能力清单 一直是空的，这里补上再交给 buildProjection，
        // 那边的 loadSkillsFromCharacter 读的就是它
        entry.data.能力清单 = this.rollAbilitiesFor(entry.data.当前序列);

        const hero = this.buildProjection(bm, caster, entry, subtype);
        if (!hero) {
            summary.push(`✗ ${caster.name} 的${subtype}未生效（${entry.name} 的数据不可用）`);
            return false;
        }
        if (!this.place(bm, caster, hero)) {
            summary.push(`✗ ${caster.name} 召来了 ${entry.name} 的投影，战场上却没有一寸落脚之地`);
            return false;
        }

        summary.push(`✓ ${caster.name} 以${subtype}召来了 ${hero.name}`
            + `（实力 ${Math.round(entry.ratio * 100)}%，维持 ${entry.rounds} 回合，`
            + `名额 ${this.usedOf(bm, caster, subtype)}/${this.maxOf(caster, subtype)}）${tail}`);
        results.push({
            kind: 'summon',
            stage: 'start',
            actor: caster.name,
            subtype,
            target: hero.name,
            origin: entry.name,
        });
        return true;
    },

    // ---------- 消散 ----------

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    /**
     * 让一个召唤物离场。五步，缺一个都会留下 bug：
     *   1) 先清挂在它身上、以及由它发起的那些控制过程。**必须排在摘人之前**：
     *      那几个 release 要读目标当前所在的队伍才能把人还回原阵营。
     *      最容易漏的是这一步——敌人附身了你的投影，投影消散却不清理，
     *      那个本体就永远回不了场；
     *   2) 摘格；
     *   3) 从队伍数组里摘掉（与 teamManager 那份是同一个数组，只摘一次）；
     *   4) 活力置 0 并打标记——turnQueue 里可能还留着引用，置 0 之后它会走
     *      既有的「已无法战斗，跳过行动」分支，不需要动 TurnManager；
     *   5) 从在场登记里划掉，这样同一个本体又可以再召了。
     */
    dismiss(bm, hero) {
        if (!bm || !hero) return;

        // 挂在它身上的
        PossessionManager.releaseOnTarget(bm, hero, 'target-dead', null);
        TempAllegianceManager.releaseOnTarget(bm, hero);
        const onIt = EnemyControlManager.processOnTarget(bm, hero.heroId);
        if (onIt) EnemyControlManager.endProcess(bm, onIt, 'invalid', null);

        // 由它发起的。投影也是走 NPC 前端管线的单位，够格的话它自己也会控别人
        PossessionManager.releaseByCaster(bm, hero.heroId, 'host-dead', null, null);
        EnemyControlManager.interruptCaster(bm, hero.heroId, 'invalid', null);
        const mine = TempAllegianceManager.processOf(bm, hero.heroId);
        if (mine) TempAllegianceManager.revert(bm, mine, null, null);

        bm.board.remove(hero);

        const team = hero.teamType === 'ally' ? bm.allyTeam : bm.enemyTeam;
        const i = team.indexOf(hero);
        if (i >= 0) team.splice(i, 1);

        hero.additionalStats.当前活力 = 0;
        hero.dismissed = true;

        const state = this.ensure(bm);
        state.projections = state.projections.filter(p => p.heroId !== hero.heroId);
    },

    /** 玩家库存画中人战死：本场立即禁用，正式战报结算时再按 ID 删除并持久化。 */
    recordPictureLoss(bm, projection, hero, results) {
        if (!bm || !projection || !projection.picturePersistent || !projection.pictureId) return false;
        const list = bm.picturePersonLosses || (bm.picturePersonLosses = []);
        const id = String(projection.pictureId);
        if (list.some(row => String(row && row.id || '') === id)) return false;
        const loss = { id, name: String(projection.origin || hero && hero.name || '未命名画中人') };
        list.push(loss);
        bm.battleLogger?.log(`☠ ${loss.name}已经战死，这幅画中人将在战后永久损毁`, 'system');
        if (Array.isArray(results)) {
            results.push({
                kind: 'summon', stage: 'picture-dead', actor: projection.ownerName,
                target: hero && hero.name, origin: loss.name, subtype: projection.subtype,
            });
        }
        return true;
    },

    /** 行动结算后即时清掉战死的画中人，避免战斗当场结束时漏记永久损毁。 */
    collectPictureDeaths(bm) {
        if (!bm || !bm.summon) return [];
        const results = [];
        this.ensure(bm).projections.slice().forEach(p => {
            if (p.subtype !== TacticCatalog.SUMMON_PICTURE_PERSON) return;
            const hero = this.findHero(bm, p.heroId);
            if (!hero || TacticResolver.alive(hero)) return;
            this.recordPictureLoss(bm, p, hero, results);
            this.dismiss(bm, hero);
        });
        return results;
    },

    /**
     * 🆕 召唤者没了，它召的东西立刻离场。适用于整个召唤大类：判据挂在
     * projections + summonOwnerId 上，不看子类，将来大类下多一条也自动生效。
     * 挂在 syncBoardOccupancy 末尾（行动回合每次出手后都会走到），并由
     * renderCurrentTurn 在效果结算之后补一次，两个点与 PossessionManager.checkRelease
     * 逐字同构——否则持续伤害打死召唤者，要等到下一个人行动才收得掉。
     * tick 里还会再跑一次兜底：战术回合里发生的死亡走不到上面那两个点。
     *
     * 叙事上这不算死亡，所以单开 owner-dead 这个 stage，文案与「消散」分开写。
     * 召唤物自己也已经倒下时静默收走，理由与 tick 相同：避免战报里
     * 「先死后离场」两句重复。
     * @returns {Array} 战报条目，调用方交给 TacticResolver.writeReport
     */
    checkOwners(bm) {
        if (!bm || !bm.summon) return [];
        const results = [];

        this.ensure(bm).projections.slice().forEach(p => {
            const hero = this.findHero(bm, p.heroId);
            if (!hero) {
                const state = this.ensure(bm);
                state.projections = state.projections.filter(x => x.heroId !== p.heroId);
                return;
            }
            // 认不出主人是谁的一律留着：宁可多活一会儿，也不能凭一个空字段收人
            if (!hero.summonOwnerId) return;
            // 因附身离场的召唤者不算没了——它还活着，解除之后就会回场。
            // isHidden 的本体仍留在队伍数组里，所以这里 findHero 照样找得到
            const owner = this.findHero(bm, hero.summonOwnerId);
            if (owner && TacticResolver.alive(owner)) return;

            const dead = !TacticResolver.alive(hero);
            if (dead && p.subtype === TacticCatalog.SUMMON_GRAZING && p.persistent && window.GrazingCore) {
                window.GrazingCore.removeSoul(bm.currentMvuState, p.origin);
                bm.battleLogger?.log(`☠ ${p.origin}的外放灵魂已经消亡，这份被放牧灵魂将被永久删除`, 'system');
                bm.grazingPermanentLosses = bm.grazingPermanentLosses || [];
                bm.grazingPermanentLosses.push(p.origin);
            }
            if (dead && p.subtype === TacticCatalog.SUMMON_PICTURE_PERSON) {
                this.recordPictureLoss(bm, p, hero, results);
            }
            if (!dead && p.subtype === TacticCatalog.SUMMON_GRAZING) {
                bm.battleLogger?.log(`${p.origin}的外放灵魂因召唤者死亡而消散。`, 'system');
            }
            this.dismiss(bm, hero);
            if (dead && p.subtype === TacticCatalog.SUMMON_GRAZING && p.persistent) {
                results.push({ kind: 'summon', stage: 'soul-dead', actor: p.ownerName,
                    target: hero.name, origin: p.origin, subtype: p.subtype });
            }
            if (!dead) {
                results.push({
                    kind: 'summon',
                    stage: 'owner-dead',
                    actor: p.ownerName,
                    target: hero.name,
                    origin: p.origin,
                    subtype: p.subtype,
                });
            }
        });

        return results;
    },

    /**
     * 到期回收。挂在 finishRound 上、排在 checkBattleEnd 之前——消散可能让
     * 友方归零，那一轮就该判负。
     * 判据是绝对回合数 round >= until，与 MythicFormManager.tick 同口径：
     * 战术回合排在 finishRound 之后，所以本轮刚召的不会被同一次 tick 收走。
     * 已经被打死的不写消散文案，否则战报里会出现「先死后消散」两条重复的话。
     * 🆕 noExpire 的子类（真实幻象）until 是 Infinity，永远走不到到期这一条：
     * 它只会被打死，或者随主人一起离场（上面 checkOwners 那一步）。
     * @returns {Array} 战报条目，调用方交给 TacticResolver.writeReport
     */
    tick(bm) {
        if (!bm || !bm.summon) return [];
        const round = Number(bm.currentRound) || 0;
        // 主人已经没了的先收掉：战术回合里发生的死亡走不到那两个即时检查点。
        // 排在到期判定之前，收过的已从 projections 里划掉，下面不会再走一遍
        const results = this.checkOwners(bm);

        this.ensure(bm).projections.slice().forEach(p => {
            const hero = this.findHero(bm, p.heroId);
            if (!hero) {
                const state = this.ensure(bm);
                state.projections = state.projections.filter(x => x.heroId !== p.heroId);
                return;
            }
            const dead = !TacticResolver.alive(hero);
            // 没有期限的一律留着。Infinity 走下面那条比较也是同样结果，
            // 显式写出来是为了挡住「until 被写成 null / undefined」时被当成 0 收走
            if (!dead && !Number.isFinite(p.until)) return;
            if (!dead && round < p.until) return;

            const grazingOwner = p.ownerId ? this.findHero(bm, p.ownerId) : null;
            if (dead && p.subtype === TacticCatalog.SUMMON_GRAZING && p.persistent && window.GrazingCore) {
                window.GrazingCore.removeSoul(bm.currentMvuState, p.origin);
                bm.battleLogger?.log(`☠ ${p.origin}的外放灵魂已经消亡，这份被放牧灵魂将被永久删除`, 'system');
                bm.grazingPermanentLosses = bm.grazingPermanentLosses || [];
                bm.grazingPermanentLosses.push(p.origin);
            }
            if (dead && p.subtype === TacticCatalog.SUMMON_PICTURE_PERSON) {
                this.recordPictureLoss(bm, p, hero, results);
            }
            this.dismiss(bm, hero);
            if (dead && p.subtype === TacticCatalog.SUMMON_GRAZING && p.persistent && grazingOwner) {
                GrazingProjectionManager.syncSystem(
                    bm, grazingOwner, window.GrazingCore.activeNames(bm.currentMvuState), 'soul-death');
            }
            if (dead && p.subtype === TacticCatalog.SUMMON_GRAZING && p.persistent) {
                results.push({
                    kind: 'summon', stage: 'soul-dead', actor: p.ownerName,
                    target: hero.name, origin: p.origin, subtype: p.subtype,
                });
            }
            if (!dead) {
                results.push({
                    kind: 'summon',
                    stage: 'dismiss',
                    target: hero.name,
                    origin: p.origin,
                    subtype: p.subtype,
                });
            }
        });

        return results;
    },
};

const ExileManager = {
    /**
     * 子类配置。形状与 SummonManager.SUBTYPES 同构：称号兜底 + 途径短名 + 序列门槛。
     * report 两条只进战报（writeReport 的 exile 分支按它们拼装），不参与任何判据。
     */
    SUBTYPES: {
        [TacticCatalog.EXILE_APPRENTICE]: {
            pathway: '学徒',
            gate: TacticCatalog.EXILE_APPRENTICE_RANK_GATE,
            title: TacticCatalog.EXILE_APPRENTICE_TITLE,
            rounds: TacticCatalog.EXILE_APPRENTICE_ROUNDS,
            // 回场落点。'caster' = 放逐者身边，'origin' = 离场前那一格
            returnAt: 'caster',
            poison: {
                name: TacticCatalog.EXILE_POISON_NAME,
                rounds: TacticCatalog.EXILE_APPRENTICE_ROUNDS,
            },
            report: {
                exileTail: '被抛入时空的乱流之中',
                returnFrom: '从时空乱流中归来',
            },
        },
        [TacticCatalog.EXILE_ARBITER]: {
            pathway: '仲裁人',
            gate: TacticCatalog.EXILE_ARBITER_RANK_GATE,
            title: TacticCatalog.EXILE_ARBITER_TITLE,
            rounds: TacticCatalog.EXILE_ARBITER_ROUNDS,
            returnAt: 'origin',
            poison: {
                name: TacticCatalog.EXILE_ARBITER_POISON_NAME,
                rounds: TacticCatalog.EXILE_ARBITER_ROUNDS,
            },
            report: {
                exileTail: '被投入无垠虚空',
                returnFrom: '从虚空中返回现实',
            },
        },
        '神秘再现·桃花的源头': {
            catalogId: 'peach_blossom_source',
            rounds: 2,
            returnAt: 'origin',
            report: {
                exileTail: '被隔绝在一片难以与外界连通的桃林之后',
                returnFrom: '从隔绝的桃花源中归来',
            },
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    // ---------- 运行期状态 ----------

    ensure(bm) {
        if (!bm.exile) {
            bm.exile = {
                // [{ casterId, targetId, subtype, returnRound, originX, originY }]
                // 按 **targetId** 唯一：同一个人不可能被放逐两次——目标池排除已离场的人，
                // 第二个施法者压根选不到他。casterId 可以重复出现，这就是「不限同时数量」。
                // 不设 used 集合：无累计次数上限。
                processes: [],
            };
        }
        return bm.exile;
    },

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    /**
     * 是否因放逐而离场。**判定一律走 OffFieldManager.isOff，不要用 x === null 反推**，
     * 理由与 PossessionManager.isHidden 那段注释完全相同。
     * 这个谓词只给 OffFieldManager 与本模块内部用。
     */
    isExiled(hero) {
        return !!(hero && hero.exiled);
    },

    processOnTarget(bm, targetId) {
        if (!bm || !bm.exile) return null;
        return bm.exile.processes.find(p => p.targetId === targetId) || null;
    },

    /** 这个人当前放逐了谁们。返回**数组**——不限同时数量，与附身/短控的单条语义不同 */
    processesOf(bm, casterId) {
        if (!bm || !bm.exile) return [];
        return bm.exile.processes.filter(p => p.casterId === casterId);
    },

    // ---------- 资格 ----------

    /**
     * 与 SummonManager.resolveEligibility 同构：称号走 includes，途径片段走
     * pathwayShort + 序列门槛，多途径按段合并。
     * 「诡秘之主」是多条途径共享的支柱名，命中后与秘偶化 / 历史投影 / 回溯 / 偷窃想法
     * 同时开，次数互不占用——口径与「上帝」同时开观众与水手一致。
     */
    resolveEligibility(sequenceString) {
        const s = String(sequenceString || '');
        const result = {};
        this.subtypes().forEach(k => { result[k] = false; });

        Object.entries(this.SUBTYPES).forEach(([name, cfg]) => {
            if (cfg.title && s.includes(cfg.title)) result[name] = true;
        });
        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            const rank = Number(r.rank);
            Object.entries(this.SUBTYPES).forEach(([name, cfg]) => {
                if (r.pathwayShort === cfg.pathway && rank <= cfg.gate) result[name] = true;
            });
        });
        return result;
    },

    /** 有资格就能用，无次数上限，与短控 / 心智剥夺 / 偷窃想法同构 */
    canUse(bm, hero) {
        return this.availableSubtypes(bm, hero).length > 0;
    },

    /** 够格的子类名列表。参数区要按它出选项 */
    availableSubtypes(bm, hero) {
        if (!hero) return [];
        const elig = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().filter(k => elig[k]
            || (this.SUBTYPES[k] && this.SUBTYPES[k].catalogId
                && MysteryReenactmentCanonAccess.canUseTactic(hero, this.SUBTYPES[k].catalogId)));
    },

    // ---------- 消耗与拼点 ----------
    // 先扣再拼，成败都扣。出手项固定当前灵性；目标方点数是六项最高（bestStat），
    // 与秘偶 / 征服那几条同口径。没有任何劣势修正，不限距离。
    // 理论必败的目标不进池，避免白扣灵性。

    statKeyOf() {
        return TacticCatalog.EXILE_CASTER_STAT;
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costOf(hero) {
        return TacticCatalog.exileCost(hero && hero.sequenceRank);
    },

    spend(hero) {
        const key = this.statKeyOf();
        const field = this.fieldOf(key);
        const cost = this.costOf(hero);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    statAfterCost(hero) {
        const field = this.fieldOf(this.statKeyOf());
        return Math.max(0, (hero?.additionalStats?.[field] ?? 0) - this.costOf(hero));
    },

    hasStat(hero) {
        return (hero?.additionalStats?.[this.fieldOf(this.statKeyOf())] ?? 0) > 0;
    },

    /** 放逐没有劣势修正：penalty 恒为 1。targetStat 不传即 bestStat（目标六项最高） */
    canPossiblyWin(caster, target) {
        return EnemyControlManager.canPossiblyWin(
            caster, target, 1,
            this.statAfterCost(caster),
        );
    },

    contest(caster, target, casterStat) {
        return EnemyControlManager.contest(caster, target, 1, casterStat);
    },

    /** 这一发的 poison 每回合伤害。参数区与结果页都要报它 */
    poisonPowerOf(caster) {
        return TacticCatalog.exilePoisonPower(caster && caster.sequenceRank);
    },

    /** 子类的离场回合数。配置缺失时退回大类默认值 */
    roundsOf(subtype) {
        const cfg = this.SUBTYPES[subtype];
        return Number(cfg && cfg.rounds) || TacticCatalog.EXILE_APPRENTICE_ROUNDS;
    },

    // ---------- 目标池 ----------

    /**
     * 可放逐的目标：存活敌方、不在离场状态、且理论上打得赢。
     * 无距离限制，所以完全不看坐标——必须显式挡掉已离场的人，
     * 理由与 EnemyControlManager.selectable 那段注释相同。
     */
    targets(bm, caster) {
        if (!bm || !caster) return [];
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            EnemyControlManager.isEnemyOf(caster, t)
            && !OffFieldManager.isOff(t)
            && this.canPossiblyWin(caster, t));
    },

    // ---------- 离场与回场 ----------

    /**
     * 目标离场。逐字照 PossessionManager.hide，只把标记换成 exiled：
     * 坐标置空负责让棋盘、AoE 与地形自然失效（那几处都有 Number.isFinite 守卫），
     * 「不可被选中」靠 OffFieldManager.isOff 谓词。
     */
    hide(bm, target) {
        if (!target) return;
        if (bm.board) bm.board.remove(target);
        target.x = null;
        target.y = null;
        target.move = 0;
        target.movedThisTurn = true;
        target.exiled = true;
    },

    /**
     * 目标回场。落点三级兜底，与 PossessionManager.restore 同构，但**返回落点**：
     * 战报要靠它判断「是不是真落在放逐者身边」。
     * 死者不占格，只写坐标：棋盘靠坐标画骷髅，格子要留给活人。
     * @param {Array<{x:number,y:number}>} candidates 优先级从高到低
     * @returns {{x:number, y:number}} 最终落点
     */
    restore(bm, target, candidates) {
        if (!target) return { x: null, y: null };
        target.exiled = false;

        const board = bm && bm.board;
        const list = (candidates || []).filter(c => c && Number.isFinite(c.x) && Number.isFinite(c.y));
        const fallback = board
            ? { x: Math.floor(board.cols / 2), y: Math.floor(board.rows / 2) }
            : { x: 0, y: 0 };
        const origin = list[0] || fallback;

        const dead = (target.additionalStats?.当前活力 ?? 0) <= 0;
        if (dead || !board) {
            target.x = origin.x;
            target.y = origin.y;
            return { x: origin.x, y: origin.y };
        }

        for (const c of list) {
            if (board.isFree(c.x, c.y) && board.place(target, c.x, c.y)) return { x: c.x, y: c.y };
        }
        const maxR = Math.max(board.cols, board.rows);
        for (let r = 1; r <= maxR; r++) {
            const ring = board.getOuterRangeCells(origin.x, origin.y, r);
            for (const cell of ring) {
                if (board.isFree(cell.x, cell.y) && board.place(target, cell.x, cell.y)) {
                    return { x: cell.x, y: cell.y };
                }
            }
        }
        // 整盘无空格，理论上到不了这里；至少别让它永远离场
        target.x = origin.x;
        target.y = origin.y;
        return { x: origin.x, y: origin.y };
    },

    /**
     * 回场落点的候选清单，优先级从高到低：
     *   1) 子类要求落在放逐者身边、且放逐者还站在场上 → 他周围一圈
     *   2) 离场前自己那一格
     * 放逐者已阵亡（或也被别人放逐走了）时第一批为空，自然退到原格与环形搜索，
     * 这正是「放逐者死了就退到兜底」的既定口径。
     */
    landingCandidates(bm, process) {
        const out = [];
        const cfg = this.SUBTYPES[process.subtype] || {};
        if (cfg.returnAt === 'caster') {
            const caster = this.findHero(bm, process.casterId);
            if (caster && TacticResolver.alive(caster)
                && !OffFieldManager.isOff(caster)
                && Number.isFinite(caster.x) && Number.isFinite(caster.y)
                && bm.board) {
                bm.board.getOuterRangeCells(caster.x, caster.y, 1)
                    .forEach(c => out.push({ x: c.x, y: c.y }));
            }
        }
        if (Number.isFinite(process.originX) && Number.isFinite(process.originY)) {
            out.push({ x: process.originX, y: process.originY });
        }
        return out;
    },

    // ---------- 附带效果 ----------

    /**
     * 挂子类的附带 poison。伤害是**固定值**（valueType 默认 fixed），按放逐者序列的
     * 平均活力算，与目标上限无关。
     * triggerTiming 用 turn_start：引擎会在目标每个回合开始时结算一次并递减，
     * 于是 duration = 离场回合数 正好在场外烧完，一次都不会落到回场之后。
     * 重复命中整条换掉、不叠加（同 MindDepriveManager.setTremble 的处理）。
     */
    attachPoison(bm, caster, target, subtype) {
        const cfg = this.SUBTYPES[subtype] || {};
        const pcfg = cfg.poison;
        if (!pcfg || !target) return null;

        const power = this.poisonPowerOf(caster);
        const effect = {
            name: pcfg.name,
            type: 'poison',
            stat: '当前活力',
            valueType: 'fixed',
            power,
            duration: Number(pcfg.rounds) || this.roundsOf(subtype),
            triggerTiming: 'turn_start',
            priority: 0,
            exilePoison: true,
        };
        const context = {
            battleManager: bm,
            transferableExternal: true,
            sourceHero: caster,
            sourceLabel: `${caster.name}的「${subtype}」`,
            sourceKind: '放逐毒伤',
        };
        const deliveries = EffectTransferManager.planEffectDeliveries(bm, target, effect, context);
        let primaryEffect = effect;
        deliveries.forEach(delivery => {
            if (delivery.primary) {
                delivery.hero.effects = (delivery.hero.effects || []).filter(e => !(e && e.exilePoison));
                delivery.effect.exilePoison = true;
                primaryEffect = delivery.effect;
            }
            const result = bm.effectManager.storeResolvedEffect(delivery.hero, delivery.effect);
            EffectTransferManager.noteEffectDelivery(bm, target, delivery, result, context);
        });
        return { name: pcfg.name, power: primaryEffect.power, rounds: primaryEffect.duration };
    },

    // ---------- 发起 ----------

    /**
     * 放逐成功。顺序有讲究，不能颠倒：
     *   1) 先拆掉目标身上**别人的**附身 —— 那个附身者正拿这个目标当锚点，人被扔出
     *      战场后那条过程没有立足之处。与 convertTeam 先 releaseOnTarget 同理；
     *   2) 记离场前坐标（回场兜底要用），再让它离场；
     *   3) 中断目标**自己发起的**秘偶与附身 —— 这一步不能省：
     *      inMarionetteRange 对 rank ≤ 4 直接 return true、canContinue 压根不看坐标，
     *      缺了它被放逐者会在场外继续操纵别人。范本是回溯那一步的同一对调用；
     *   4) 最后挂附带 poison。
     */
    begin(bm, caster, target, subtype, roll, summary, results) {
        const rounds = this.roundsOf(subtype);
        const tail = EnemyControlManager.contestTail(roll);

        PossessionManager.releaseOnTarget(bm, target, 'invalid', summary);

        const originX = Number.isFinite(target.x) ? target.x : null;
        const originY = Number.isFinite(target.y) ? target.y : null;

        this.ensure(bm).processes.push({
            casterId: caster.heroId,
            targetId: target.heroId,
            subtype,
            // 战术回合排在 beginNextRound 之前，所以这里的 currentRound 还是本回合。
            // +rounds 即「缺席接下来的 rounds 个战斗回合，在最后那一轮的 finishRound 回场」，
            // 窗口口径与 TempAllegianceManager.expireRound 完全一致
            returnRound: (Number(bm.currentRound) || 0) + rounds,
            originX,
            originY,
        });

        this.hide(bm, target);

        EnemyControlManager.interruptCaster(bm, target.heroId, 'invalid', summary);
        PossessionManager.releaseByCaster(bm, target.heroId, 'invalid', summary, results);

        summary.push(`✓ ${caster.name} 以${subtype}将 ${target.name} 逐出战场，`
            + `接下来 ${rounds} 个回合无法行动${tail}`);

        const poison = this.attachPoison(bm, caster, target, subtype);
        if (poison) {
            summary.push(`　└ ${target.name} 陷入「${poison.name}」，`
                + `${poison.rounds} 个回合内每回合损失活力 ${poison.power}`);
        }

        results.push({ ...TacticBorrowReport.meta(caster),
            kind: 'exile', stage: 'start',
            actor: caster.name, target: target.name, subtype,
        });
    },

    // ---------- 到期与死亡 ----------

    /**
     * 到期回场。挂在 finishRound 上而不是战术回合里，理由与短控 / 召唤消散一致：
     * 玩家跳过战术回合、甚至直接输出战报，到期的也必须回来。
     *
     * 只产出战报条目，不产出结果页文案：这一刻战术面板还没开，那些行没有地方可显示，
     * 而 writeReport 本身就会往战斗日志写一份。
     * @returns {Array} 战报条目，交给 TacticResolver.writeReport
     */
    tick(bm) {
        const results = [];
        if (!bm || !bm.exile) return results;
        const round = Number(bm.currentRound) || 0;

        bm.exile.processes.slice().forEach(p => {
            if (round < p.returnRound) return;

            const state = this.ensure(bm);
            const i = state.processes.indexOf(p);
            if (i >= 0) state.processes.splice(i, 1);

            const target = this.findHero(bm, p.targetId);
            if (!target) return;

            const caster = this.findHero(bm, p.casterId);
            const landed = this.restore(bm, target, this.landingCandidates(bm, p));
            // 「出现在放逐者身边」只在真的落到他身边时才这么写：他可能已经阵亡，
            // 或者周围一圈被占满而退到了更外圈
            const nearCaster = !!(caster
                && TacticResolver.alive(caster)
                && !OffFieldManager.isOff(caster)
                && BattleBoard.distance(landed.x, landed.y, caster.x, caster.y) <= 1);

            results.push({
                kind: 'exile', stage: 'return',
                actor: caster ? caster.name : '', target: target.name,
                subtype: p.subtype, nearCaster,
            });
        });
        return results;
    },

    /**
     * 离场期间死亡的（poison 不走保命，所以这是会真实发生的）：摘掉过程并写回坐标。
     * 挂在 syncBoardOccupancy 里，与 PossessionManager.checkRelease 同一个调用点、
     * 同一条理由。restore 自己会判 dead 只写坐标不占格，棋盘靠坐标画骷髅。
     * 尸首落回离场前那一格，不跟着放逐者走——人已经死了，谈不上被拽到谁身边。
     * @returns {Array<string>} 文案，调用方写进战斗日志。刻意不进战报：
     *   writeReport 从不写死亡，阵亡一律由「战后属性一览」体现
     */
    checkDead(bm) {
        const lines = [];
        if (!bm || !bm.exile) return lines;

        bm.exile.processes.slice().forEach(p => {
            const target = this.findHero(bm, p.targetId);
            if (target && TacticResolver.alive(target)) return;

            const state = this.ensure(bm);
            const i = state.processes.indexOf(p);
            if (i >= 0) state.processes.splice(i, 1);
            if (!target) return;

            const back = [];
            if (Number.isFinite(p.originX) && Number.isFinite(p.originY)) {
                back.push({ x: p.originX, y: p.originY });
            }
            this.restore(bm, target, back);
            lines.push(`${target.name} 在被放逐时死亡，尸首落回战场`);
        });
        return lines;
    },

    /**
     * 战斗结束时把还挂着的全部收掉，让每个人都带着坐标进结算页。
     * 与 TempAllegianceManager.releaseAll 同一理由：不能让人停在「还在场外」的状态上。
     */
    releaseAll(bm) {
        if (!bm || !bm.exile) return;
        bm.exile.processes.slice().forEach(p => {
            const state = this.ensure(bm);
            const i = state.processes.indexOf(p);
            if (i >= 0) state.processes.splice(i, 1);
            const target = this.findHero(bm, p.targetId);
            if (target) this.restore(bm, target, this.landingCandidates(bm, p));
        });
    },

    // ---------- 仲裁 ----------

    /**
     * 放逐发起仲裁。排在附身之后、短控之前：放逐比短控重（整段离场且不可打断），
     * 但比永久转化轻（人还会回来），被永久转化或附身顶掉都比反过来更合理。
     * 目标若已被转走，会因不再是敌人而落进「抢先处置」。
     * @param {Array} attempts [{ caster, target, subtype, roll }]
     */
    arbitrate(bm, attempts, summary, results) {
        if (!attempts || attempts.length === 0) return;

        attempts.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的${a.subtype}失败`
                + EnemyControlManager.contestTail(a.roll));
        });

        EnemyControlManager.groupByTarget(attempts.filter(a => a.roll.win)).forEach(list => {
            const champ = EnemyControlManager.pickWinner(list);
            list.forEach(a => {
                const tail = EnemyControlManager.contestTail(a.roll);
                if (a !== champ) {
                    summary.push(`✗ ${a.caster.name} 成功放逐 ${a.target.name} 前，`
                        + `目标已被别人抢先逐出战场${tail}`);
                    return;
                }
                const stillFoe = EnemyControlManager.isEnemyOf(a.caster, a.target);
                const casterOk = TacticResolver.alive(a.caster) && !OffFieldManager.isOff(a.caster);
                if (!stillFoe || !casterOk || OffFieldManager.isOff(a.target)) {
                    summary.push(`✗ ${a.caster.name} 的${a.subtype}掠过 ${a.target.name} 时，`
                        + `目标已被别人抢先处置${tail}`);
                    return;
                }
                this.begin(bm, a.caster, a.target, a.subtype, a.roll, summary, results);
            });
        });
    },
};

const ActiveLeaveManager = {
    SUBTYPES: {
        [TacticCatalog.ACTIVE_LEAVE_DIMENSION]: {
            pathway: '萨满', gate: 5, title: '高维俯视者',
            desc: '进入另一个维度。',
            rivalMode: 'dimension',
            report: {
                enter: actor => `${actor}穿越维度，主动离开了当前战场。`,
                fail: actor => `${actor}尝试穿越维度，却被能够察觉维度变化的敌人阻止。`,
                return: actor => `${actor}从另一个维度返回了战场。`,
            },
        },
        [TacticCatalog.ACTIVE_LEAVE_HISTORY]: {
            pathway: '占卜家', gate: 3, title: '诡秘之主',
            desc: '藏入历史迷雾，暂时离开当前战场。',
            rivalMode: 'history',
            report: {
                enter: actor => `${actor}藏入历史迷雾，主动离开了当前战场。`,
                fail: actor => `${actor}试图藏入历史迷雾，却被能够触及历史迷雾的敌人阻止。`,
                return: actor => `${actor}从历史迷雾中返回了战场。`,
            },
        },
    },

    subtypes() { return Object.keys(this.SUBTYPES); },
    cfgOf(subtype) { return this.SUBTYPES[subtype] || null; },

    ensure(bm) {
        if (!bm.activeLeave) bm.activeLeave = { processes: [] };
        if (!Array.isArray(bm.activeLeave.processes)) bm.activeLeave.processes = [];
        return bm.activeLeave;
    },

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    processOf(bm, heroOrId) {
        if (!bm || !bm.activeLeave) return null;
        const id = typeof heroOrId === 'string' ? heroOrId : heroOrId?.heroId;
        return bm.activeLeave.processes.find(p => p.heroId === id) || null;
    },

    isAway(hero) {
        return !!(hero && hero.activeLeaving);
    },

    resolveEligibility(sequenceString) {
        const text = String(sequenceString || '');
        const out = {};
        this.subtypes().forEach(k => { out[k] = false; });
        Object.entries(this.SUBTYPES).forEach(([key, cfg]) => {
            if (cfg.title && text.includes(cfg.title)) out[key] = true;
        });
        LifeSaveManager.splitSequenceFragments(text).forEach(fragment => {
            const row = LifeSaveManager.resolveFragment(fragment);
            if (!row) return;
            Object.entries(this.SUBTYPES).forEach(([key, cfg]) => {
                if (row.pathwayShort === cfg.pathway && Number(row.rank) <= Number(cfg.gate)) out[key] = true;
            });
        });
        return out;
    },

    availableSubtypes(hero) {
        if (!hero) return [];
        const eligible = this.resolveEligibility(hero.sequenceString);
        return this.subtypes().filter(k => eligible[k]);
    },

    canUse(bm, hero) {
        return !!hero && TacticResolver.alive(hero) && !OffFieldManager.isOff(hero)
            && !this.processOf(bm, hero) && this.availableSubtypes(hero).length > 0;
    },

    blockedReason(bm, hero, subtype) {
        if (!hero) return '场上没有你可操作的角色。';
        if (OffFieldManager.isOff(hero)) return '你当前已经不在战场上。';
        const available = this.availableSubtypes(hero);
        if (!available.length) return `你没有可用的${TacticCatalog.ACTIVE_LEAVE_ACTION}能力。`;
        if (subtype && !available.includes(subtype)) return `你没有${subtype}的资格。`;
        return '';
    },

    qualifiesPathway(hero, pathway, gate, title) {
        const text = String(hero?.sequenceString || '');
        if (title && text.includes(title)) return true;
        return LifeSaveManager.splitSequenceFragments(text).some(fragment => {
            const row = LifeSaveManager.resolveFragment(fragment);
            return row && row.pathwayShort === pathway && Number(row.rank) <= gate;
        });
    },

    qualifiesRival(hero, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!hero || !cfg) return false;
        if (ReaderContestAdvantage.qualifiesForRivalPool(hero)) return true;
        if (cfg.rivalMode === 'dimension') {
            return this.qualifiesPathway(hero, '萨满', 5, '高维俯视者')
                || this.qualifiesPathway(hero, '窥秘人', 2, '知识之妖');
        }
        return this.qualifiesPathway(hero, '占卜家', 3, '诡秘之主');
    },

    rivals(bm, caster, subtype) {
        if (!bm || !caster) return [];
        return bm.teamManager.getAllHeroes().filter(hero =>
            hero !== caster
            && TacticResolver.alive(hero)
            && hero.teamType !== caster.teamType
            && !OffFieldManager.isOff(hero)
            && !TurnSkipManager.occupiesTactic(bm, hero)
            && this.qualifiesRival(hero, subtype));
    },

    contest(caster, rival) {
        return EnemyControlManager.contest(
            caster, rival, 1,
            Number(caster?.additionalStats?.当前灵性) || 0,
            Number(rival?.additionalStats?.当前灵性) || 0,
        );
    },

    contestTail(rolls) {
        if (!rolls.length) return '（场上没有符合条件的对抗者）';
        return '（拼点 ' + rolls.map(row =>
            `${row.rival.name} ${row.roll.casterScore}:${row.roll.targetScore}`).join('；') + '）';
    },

    /** 主动离场必须赢过全部对抗者；进入无消耗，所以直接按双方当前灵性估极限。 */
    canPossiblyWinAll(bm, caster, subtype) {
        const casterSpirit = Number(caster?.additionalStats?.当前灵性) || 0;
        return this.rivals(bm, caster, subtype).every(rival =>
            EnemyControlManager.canPossiblyWin(
                caster, rival, 1, casterSpirit,
                Number(rival?.additionalStats?.当前灵性) || 0,
            ));
    },

    upkeepCost(hero) {
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero?.sequenceRank);
        return Math.max(1, Math.round((Number(attrs?.灵性) || 0) * TacticCatalog.ACTIVE_LEAVE_UPKEEP_RATIO));
    },

    ownedLiveSummons(bm, owner) {
        if (!bm || !owner || !bm.summon || !Array.isArray(bm.summon.projections)) return [];
        return bm.summon.projections
            .filter(p => p.ownerId === owner.heroId)
            .map(p => this.findHero(bm, p.heroId))
            .filter(hero => hero && hero.isSummon && TacticResolver.alive(hero)
                && !OffFieldManager.isOff(hero)
                && Number.isFinite(hero.x) && Number.isFinite(hero.y));
    },

    npcSubtypes(bm, hero) {
        return this.availableSubtypes(hero).filter(subtype =>
            this.canPossiblyWinAll(bm, hero, subtype));
    },

    canNpcInitiate(bm, hero) {
        return !!hero && hero.dataSource !== 'player' && !hero.isSummon
            && this.canUse(bm, hero) && this.ownedLiveSummons(bm, hero).length > 0
            && this.npcSubtypes(bm, hero).length > 0;
    },

    hide(bm, hero) {
        if (!hero) return;
        if (bm?.board) bm.board.remove(hero);
        hero.x = null;
        hero.y = null;
        hero.move = 0;
        hero.movedThisTurn = true;
        hero.activeLeaving = true;
    },

    restore(bm, hero, process) {
        if (!hero) return { x: null, y: null };
        hero.activeLeaving = false;
        const board = bm?.board;
        const origin = Number.isFinite(process?.originX) && Number.isFinite(process?.originY)
            ? { x: process.originX, y: process.originY }
            : board ? { x: Math.floor(board.cols / 2), y: Math.floor(board.rows / 2) } : { x: 0, y: 0 };
        const dead = !TacticResolver.alive(hero);
        if (!board || dead) {
            hero.x = origin.x;
            hero.y = origin.y;
            return origin;
        }
        if (board.isFree(origin.x, origin.y) && board.place(hero, origin.x, origin.y)) return origin;
        const maxR = Math.max(board.cols, board.rows);
        for (let radius = 1; radius <= maxR; radius++) {
            const cells = board.getOuterRangeCells(origin.x, origin.y, radius);
            for (const cell of cells) {
                if (board.isFree(cell.x, cell.y) && board.place(hero, cell.x, cell.y)) {
                    return { x: cell.x, y: cell.y };
                }
            }
        }
        hero.x = origin.x;
        hero.y = origin.y;
        return origin;
    },

    interruptControls(bm, hero, summary, results) {
        PossessionManager.releaseOnTarget(bm, hero, 'invalid', summary);
        EnemyControlManager.interruptCaster(bm, hero.heroId, 'invalid', summary);
        PossessionManager.releaseByCaster(bm, hero.heroId, 'invalid', summary, results);
        const temp = TempAllegianceManager.processOf(bm, hero.heroId);
        if (temp) TempAllegianceManager.revert(bm, temp, summary, results);
    },

    begin(bm, hero, subtype, summary, results) {
        const process = {
            heroId: hero.heroId,
            subtype,
            originX: Number.isFinite(hero.x) ? hero.x : null,
            originY: Number.isFinite(hero.y) ? hero.y : null,
            enteredRound: Number(bm.currentRound) || 0,
            npc: hero.dataSource !== 'player',
        };
        this.interruptControls(bm, hero, summary, results);
        this.ensure(bm).processes.push(process);
        this.hide(bm, hero);
        const cfg = this.cfgOf(subtype);
        summary?.push(`✓ ${hero.name} 使用「${subtype}」，主动离开战场`);
        results?.push({ kind: 'active-leave', stage: 'enter', actor: hero.name, subtype });
        return cfg;
    },

    attempt(bm, hero, subtype, summary, results) {
        if (!this.canUse(bm, hero) || !this.availableSubtypes(hero).includes(subtype)) return false;
        const rolls = this.rivals(bm, hero, subtype).map(rival => ({
            rival,
            roll: this.contest(hero, rival),
        }));
        const won = rolls.every(row => row.roll.win);
        const tail = this.contestTail(rolls);
        if (!won) {
            summary?.push(`✗ ${hero.name} 的「${subtype}」被阻止${tail}`);
            results?.push({ kind: 'active-leave', stage: 'fail', actor: hero.name, subtype });
            return false;
        }
        this.begin(bm, hero, subtype, summary, results);
        if (rolls.length) summary?.push(`　└ ${tail}`);
        return true;
    },

    removeProcess(bm, process) {
        if (!bm?.activeLeave || !process) return;
        const index = bm.activeLeave.processes.indexOf(process);
        if (index >= 0) bm.activeLeave.processes.splice(index, 1);
    },

    returnProcess(bm, process, reason, summary, results) {
        if (!process) return null;
        this.removeProcess(bm, process);
        const hero = this.findHero(bm, process.heroId);
        if (!hero) return null;
        this.restore(bm, hero, process);
        const reasonText = reason === 'summons' ? '自有召唤物已经全部离场'
            : reason === 'spirit' ? '灵性不足以继续维持'
                : reason === 'battle-end' ? '战斗已经结束' : '主动选择返场';
        summary?.push(`↩ ${hero.name}${reasonText}，从「${process.subtype}」状态返场`);
        results?.push({
            kind: 'active-leave', stage: 'return', actor: hero.name,
            subtype: process.subtype, reason,
        });
        return hero;
    },

    maintainPlayer(bm, hero, mode, summary, results) {
        const process = this.processOf(bm, hero);
        if (!process) return false;
        if (mode === 'return') {
            this.returnProcess(bm, process, 'voluntary', summary, results);
            return true;
        }
        const cost = this.upkeepCost(hero);
        const spirit = Number(hero.additionalStats?.当前灵性) || 0;
        if (spirit < cost) {
            this.returnProcess(bm, process, 'spirit', summary, results);
            return true;
        }
        hero.additionalStats.当前灵性 = spirit - cost;
        summary?.push(`◈ ${hero.name}维持「${process.subtype}」，消耗${cost}点灵性`);
        results?.push({ kind: 'active-leave', stage: 'upkeep', actor: hero.name,
            subtype: process.subtype, cost });
        return true;
    },

    maintainNpcs(bm, summary, results) {
        const handled = new Set();
        if (!bm?.activeLeave) return handled;
        this.ensure(bm).processes.slice().forEach(process => {
            if (!process.npc) return;
            const hero = this.findHero(bm, process.heroId);
            if (!hero || !TacticResolver.alive(hero)) return;
            handled.add(hero.heroId);
            if (!this.ownedLiveSummons(bm, hero).length) {
                this.returnProcess(bm, process, 'summons', summary, results);
                return;
            }
            const cost = this.upkeepCost(hero);
            const spirit = Number(hero.additionalStats?.当前灵性) || 0;
            if (spirit < cost) {
                this.returnProcess(bm, process, 'spirit', summary, results);
                return;
            }
            hero.additionalStats.当前灵性 = spirit - cost;
            summary?.push(`◈ ${hero.name}维持「${process.subtype}」，消耗${cost}点灵性`);
            results?.push({ kind: 'active-leave', stage: 'upkeep', actor: hero.name,
                subtype: process.subtype, cost });
        });
        return handled;
    },

    checkDead(bm) {
        const lines = [];
        if (!bm?.activeLeave) return lines;
        this.ensure(bm).processes.slice().forEach(process => {
            const hero = this.findHero(bm, process.heroId);
            if (hero && TacticResolver.alive(hero)) return;
            this.removeProcess(bm, process);
            if (!hero) return;
            this.restore(bm, hero, process);
            lines.push(`${hero.name}在主动离场期间死亡，尸首落回战场`);
        });
        return lines;
    },

    releaseAll(bm) {
        if (!bm?.activeLeave) return;
        this.ensure(bm).processes.slice().forEach(process =>
            this.returnProcess(bm, process, 'battle-end', null, null));
    },
};

const OriginalTurnSkipManager = {
    /**
     * 理由注册表。occupyTactic 表示这一轮的战术动作位也一并被占掉——
     * 昏迷的人不该还能在战术回合里改地形，也不该算进阻止名单。
     */
    REASONS: {
        昏迷: {
            label: '昏迷',
            occupyTactic: true,
            turnText: name => `${name} 陷入昏迷，跳过这一次行动`,
            turnHint: '身上的持续效果照常结算，但本回合无法移动，也无法出手',
            tacticText: name => `${name} 正昏迷不醒，本回合无法参与战术`,
        },
        // 偷窃想法的硬控。窗口与昏迷完全相同（跳过下一战斗回合，并占掉那一轮的战术动作位），
        // 只是文案不同：这是念头被抽走后的短暂呆滞，不是失去意识。
        呆滞: {
            label: '呆滞',
            occupyTactic: true,
            turnText: name => `${name} 因想法被抽走而陷入呆滞，跳过这一次行动`,
            turnHint: '身上的持续效果照常结算，但本回合无法移动，也无法出手',
            tacticText: name => `${name} 正呆滞着，本回合无法参与战术`,
        },
        // 恍惚之歌的硬控。窗口与昏迷 / 呆滞完全相同，只是文案不同：这是灵体被歌声
        // 干扰后的失神。理由单开而不复用那两条，与 apply 的「不叠加」规则配合——
        // 三者互相之间同样不叠加，因为闸门看的是「有没有未消耗的标记」而不是理由。
        恍惚: {
            label: '恍惚',
            occupyTactic: true,
            turnText: name => `${name} 陷入恍惚，跳过这一次行动`,
            turnHint: '身上的持续效果照常结算，但本回合无法移动，也无法出手',
            tacticText: name => `${name} 正恍惚失神，本回合无法参与战术`,
        },
        沉睡: {
            label: '沉睡',
            occupyTactic: true,
            turnText: name => `${name} 被强烈的疲惫拖入沉睡，跳过这一次行动`,
            turnHint: '身上的持续效果照常结算，但本回合无法移动，也无法出手',
            tacticText: name => `${name} 正处于魔法沉睡中，本回合无法参与战术`,
        },
        // 精神刺穿的硬控。窗口与其它硬控完全相同，只单开语义与用户可见文案。
        精神剧痛: {
            label: '精神剧痛',
            occupyTactic: true,
            turnText: name => `${name} 的精神体遭受穿刺，因剧痛跳过这一次行动`,
            turnHint: '身上的持续效果照常结算，但本回合无法移动，也无法出手',
            tacticText: name => `${name} 正承受难以克制的精神剧痛，本回合无法参与战术`,
        },
        震慑: {
            label: '震慑',
            occupyTactic: true,
            turnText: name => `${name} 被威压震慑在原地，跳过这一次行动`,
            turnHint: '身上的持续效果照常结算，但本回合无法移动，也无法出手',
            tacticText: name => `${name} 仍被震慑在原地，本回合无法参与战术`,
        },
    },

    knows(reason) {
        return !!(reason && this.REASONS[reason]);
    },

    meta(reason) {
        return (reason && this.REASONS[reason]) || null;
    },

    /**
     * 打上标记。身上已有未消耗的标记时不覆盖也不刷新：重复打不该延长时长，
     * 与「硬控不叠加」同一条思路。
     * @returns {boolean} 是否真的打上了
     */
    apply(bm, hero, reason) {
        if (!hero || !this.knows(reason)) return false;
        if (hero.turnSkip && !hero.turnSkip.consumed) return false;
        hero.turnSkip = {
            reason,
            // 战术回合里 currentRound 还是本回合，+1 即「跳掉下一个战斗回合的那次行动」
            skipRound: (Number(bm && bm.currentRound) || 0) + 1,
            consumed: false,
        };
        return true;
    },

    pending(hero) {
        return (hero && hero.turnSkip) || null;
    },

    /**
     * 这一次行动要不要跳掉。
     * 刻意**不看 consumed**，让这个判据在同一回合内幂等：一个人一轮只有一次出手，
     * 队列走过他之后 getCurrentTurn 就再也不会指到他，所以不需要靠 consumed 去防重。
     * 反过来，如果这里认了 consumed，同一次行动万一被重渲染一次就会漏判成「可以行动」，
     * 那是个正确性洞，比多推进一次队列严重得多。
     */
    shouldSkip(bm, hero) {
        const s = this.pending(hero);
        if (!s) return false;
        return (Number(bm && bm.currentRound) || 0) >= s.skipRound;
    },

    /**
     * 真的跳掉了。只标 consumed 而不删记录：occupiesTactic 还要靠它，
     * 记录本身由 sweep 在下一次翻页时收走。
     * 重复调用返回同一份元数据，不返回 null——UI 靠它取文案，
     * 拿到 null 会退化成中性兜底措辞。
     * @returns {Object|null} 理由元数据
     */
    consume(bm, hero) {
        const s = this.pending(hero);
        if (!s) return null;
        s.consumed = true;
        return this.meta(s.reason);
    },

    /**
     * 这一轮的战术动作位是否已被占掉。判据是「标记正属于当前这个回合」，
     * 与有没有真的跳过行动无关——队列还没轮到他的人同样算占位。
     */
    occupiesTactic(bm, hero) {
        const s = this.pending(hero);
        if (!s) return false;
        const meta = this.meta(s.reason);
        if (!meta || !meta.occupyTactic) return false;
        return (Number(bm && bm.currentRound) || 0) === s.skipRound;
    },

    /** 战术面板要用的一句话。认不出理由时给个中性兜底 */
    tacticTextOf(hero) {
        const name = (hero && hero.name) || '他';
        const s = this.pending(hero);
        const meta = s && this.meta(s.reason);
        if (!meta || typeof meta.tacticText !== 'function') return `${name} 本回合无法参与战术`;
        return meta.tacticText(name);
    },

    /**
     * 翻页时清掉过期标记。**必须在 currentRound 自增之后调用**：判据是
     * skipRound < currentRound，自增之前调会把本轮才该生效的那条一起清掉。
     */
    sweep(bm) {
        if (!bm || !bm.teamManager) return;
        const round = Number(bm.currentRound) || 0;
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (hero.turnSkip && hero.turnSkip.skipRound < round) hero.turnSkip = null;
        });
    },
};

const TurnSkipManager = suppliedTurnSkip || OriginalTurnSkipManager;

const OriginalEnemyControlManager = {
    /** 引擎永远匹配不到的计时 timing，与 mythic_form 同一手法 */
    TIMING: 'enemy_control',

    // ---------- 运行期状态 ----------

    /**
     * 状态挂在 BattleManager 上而不是散在 Hero 里：秘偶要频繁问「谁正在控谁」，
     * 一份集中的 processes 比遍历全场角色便宜得多，也更好做独占仲裁。
     */
    ensure(bm) {
        if (!bm.enemyControl) {
            bm.enemyControl = {
                processes: [],            // [{ casterId, targetId, stacks }]，一名施法者至多一条
                marionetteDone: new Set(),// 本场已彻底转化过 1 人的施法者
                conquestUsed: new Set(),  // 本场已用掉征服的施法者（成败都算）
                mindUsed: new Set(),      // 本场已用掉「心灵」权柄的施法者（成败都算，与征服分开）
                enslaveUsed: new Set(),   // 本场已用掉奴役的施法者（成败都算）
                tameUsed: new Set(),      // 本场已用掉驯化的施法者（成败都算）
                damaged: new Set(),       // 上一轮受过实际扣减的 heroId，用于 0.5 劣势
            };
        }
        // 旧场次热重载时补上新字段，避免 mindUsed.has 炸掉
        if (!bm.enemyControl.mindUsed) bm.enemyControl.mindUsed = new Set();
        return bm.enemyControl;
    },

    findHero(bm, heroId) {
        if (!bm || !heroId) return null;
        return bm.teamManager.getAllHeroes().find(h => h.heroId === heroId) || null;
    },

    // ---------- 资格 ----------

    /**
     * 与 SkillControlManager.resolveEligibility 同构：多途径按段合并。
     * 称号字串走 includes，与 MythicFormManager.isSpectator 认「上帝」是同一套写法——
     * 支柱/旧日的条目躺在多条途径里，正常的途径解析对它们本来就不可靠。
     */
    resolveEligibility(sequenceString) {
        const result = { 秘偶化: false, 征服: false, [TacticCatalog.MIND]: false, 奴役: false, 驯化: false };
        const s = String(sequenceString || '');
        if (s.includes('诡秘之主')) result.秘偶化 = true;
        if (s.includes('毁灭天灾') || s.includes('第四支柱')) result.征服 = true;
        // 观众旧日/支柱与水手支柱都叫「上帝」，和水手恐惧之音重叠，次数互不占用
        if (s.includes('上帝')) result[TacticCatalog.MIND] = true;
        if (s.includes('永恒之暗')) result.奴役 = true;
        if (s.includes('堕落母神')) result.驯化 = true;

        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            const rank = Number(r.rank);
            if (r.pathwayShort === '占卜家' && rank <= TacticCatalog.MARIONETTE_RANK_GATE) result.秘偶化 = true;
            if (r.pathwayShort === '猎人' && rank <= TacticCatalog.CONQUEST_RANK_GATE) result.征服 = true;
            if (r.pathwayShort === '观众' && rank <= TacticCatalog.MIND_RANK_GATE) result[TacticCatalog.MIND] = true;
            if (r.pathwayShort === '收尸人' && rank <= TacticCatalog.ENSLAVE_RANK_GATE) result.奴役 = true;
            if (r.pathwayShort === '药师' && rank <= TacticCatalog.TAME_RANK_GATE) result.驯化 = true;
        });
        return result;
    },

    /** 本场还能不能再发起秘偶化：有资格，且还没彻底转化过人 */
    canMarionette(bm, hero) {
        if (!hero) return false;
        if (this.ensure(bm).marionetteDone.has(hero.heroId)) return false;
        return this.resolveEligibility(hero.sequenceString).秘偶化;
    },

    /** 征服全场一次，失败也算用掉 */
    canConquest(bm, hero) {
        if (!hero) return false;
        if (this.ensure(bm).conquestUsed.has(hero.heroId)) return false;
        return this.resolveEligibility(hero.sequenceString).征服;
    },

    /** 「心灵」权柄全场一次，失败也算用掉，与征服次数分开 */
    canMind(bm, hero) {
        if (!hero) return false;
        if (this.ensure(bm).mindUsed.has(hero.heroId)) return false;
        return this.resolveEligibility(hero.sequenceString)[TacticCatalog.MIND];
    },

    /** 奴役全场一次，失败也算用掉，与征服次数分开 */
    canEnslave(bm, hero) {
        if (!hero) return false;
        if (this.ensure(bm).enslaveUsed.has(hero.heroId)) return false;
        return this.resolveEligibility(hero.sequenceString).奴役;
    },

    /** 驯化全场一次，失败也算用掉，与征服 / 奴役次数分开 */
    canTame(bm, hero) {
        if (!hero) return false;
        if (this.ensure(bm).tameUsed.has(hero.heroId)) return false;
        return this.resolveEligibility(hero.sequenceString).驯化;
    },

    // ---------- 扣费与拼点 ----------

    /** 先扣再拼，失败也扣。灵性为 0 的人在上层就被挡住了 */
    spendSpirit(hero) {
        const cost = TacticCatalog.controlSpiritCost(hero.sequenceRank);
        hero.additionalStats.当前灵性 = Math.max(0, (hero.additionalStats.当前灵性 ?? 0) - cost);
        return cost;
    },

    /** 目标出五个当前值加运气里最高的一项，与技能干涉同口径 */
    bestStat(target) {
        const s = (target && target.additionalStats) || {};
        return Math.max(
            s.当前活力 ?? 0, s.当前敏捷 ?? 0, s.当前灵性 ?? 0,
            s.当前理智 ?? 0, s.当前人性 ?? 0, s.运气 ?? 0
        );
    },

    /** 秘偶劣势：施法者或**当前这个目标**上一轮受过实扣就 0.5，用完即清 */
    marionettePenalty(bm, caster, target) {
        const d = this.ensure(bm).damaged;
        const hit = d.has(caster.heroId) || (target && d.has(target.heroId));
        return hit ? TacticCatalog.CONTROL_PENALTY : 1;
    },

    consumePenalty(bm, caster, target) {
        const d = this.ensure(bm).damaged;
        d.delete(caster.heroId);
        if (target) d.delete(target.heroId);
    },

    markDamaged(bm, hero) {
        if (!bm || !hero || !hero.heroId) return;
        this.ensure(bm).damaged.add(hero.heroId);
    },

    /**
     * 🆕 只读查询，给 CPUManager 的索敌用：这一战斗回合里挨过实扣没有。
     * 与 marionettePenalty 共用同一份 damaged，所以口径天然一致——任意属性的
     * 实际扣减都算，0 伤与保命吸满不算。之所以能当「本回合」用：标记由战术回合的
     * consumePenalty 消费，而战术回合排在 finishRound 之后、beginNextRound 之前，
     * 所以战斗回合里读到的就是本回合加进去的那批。不要在这里删元素，那是劣势的账
     */
    wasDamaged(bm, hero) {
        if (!bm || !hero || !hero.heroId) return false;
        return this.ensure(bm).damaged.has(hero.heroId);
    },

    /**
     * 发起方点数 × 劣势 × 拼点优势 × rand，
     * 对方点数 × 拼点优势 × rand；严格大于才成功。
     * casterStat 缺省为当前灵性；targetStat 缺省为 bestStat（六项最高）。
     * targetStat 是给夺舍与附身用的：它只比目标的灵性/人性/理智三项，口径与其余能力不同。
     */
    contest(caster, target, penalty, casterStat, targetStat) {
        const span = TacticCatalog.CONTEST_ROLL_MAX - TacticCatalog.CONTEST_ROLL_MIN;
        const roll = () => TacticCatalog.CONTEST_ROLL_MIN + Math.random() * span;
        const base = Number.isFinite(casterStat)
            ? casterStat
            : (caster.additionalStats.当前灵性 ?? 0);
        const foe = Number.isFinite(targetStat) ? targetStat : this.bestStat(target);
        const a = base * penalty * ContestAdvantage.tacticMultiplier(caster, target) * roll();
        const b = foe * ContestAdvantage.tacticMultiplier(target, caster) * roll();
        const result = { win: a > b, casterScore: Math.round(a), targetScore: Math.round(b) };
        if (caster?.$tacticContext?.borrowId) caster.$tacticContext.rolls.push(result);
        return result;
    },

    /**
     * 理论上还有没有赢面。缺省用扣费后的灵性估上界；驯化传入扣费后的人性或灵性。
     * 只给 NPC 选目标与玩家点选用，避免让人去打一个必输的拼点。
     * targetStat 同 contest：不传就是 bestStat。技能干涉传的是已乘过 3 倍率的值。
     */
    canPossiblyWin(caster, target, penalty, casterStatAfterCost, targetStat) {
        const after = Number.isFinite(casterStatAfterCost)
            ? casterStatAfterCost
            : Math.max(0, (caster.additionalStats?.当前灵性 ?? 0)
                - TacticCatalog.controlSpiritCost(caster.sequenceRank));
        const casterMax = after * penalty
            * ContestAdvantage.tacticMultiplier(caster, target)
            * TacticCatalog.CONTEST_ROLL_MAX;
        const foe = Number.isFinite(targetStat) ? targetStat : this.bestStat(target);
        const targetMin = foe
            * ContestAdvantage.tacticMultiplier(target, caster)
            * TacticCatalog.CONTEST_ROLL_MIN;
        return casterMax > targetMin;
    },

    contestTail(roll) {
        return `（拼点 ${roll.casterScore} : ${roll.targetScore}）`;
    },

    // ---------- 目标合法性与独占 ----------

    isEnemyOf(caster, target) {
        return !!(caster && target && TacticResolver.alive(target) && target.teamType !== caster.teamType);
    },

    /**
     * 🆕 操控四条的目标池共用的排除项。
     * 征服 / 奴役 / 驯化无距离限制，marionetteTargets 在序列 4 及以上也直接放行，
     * 所以四条**都不看坐标**，必须显式挡掉因附身离场的本体。
     */
    selectable(caster, target) {
        return this.isEnemyOf(caster, target) && !OffFieldManager.isOff(target);
    },

    /** 序列 5 只能打身边一格（切比雪夫，含对角）；序列 4 起不限距离 */
    inMarionetteRange(caster, target) {
        const rank = Number(caster.sequenceRank);
        if (Number.isFinite(rank) && rank <= TacticCatalog.MARIONETTE_FREE_RANK) return true;
        return BattleBoard.distanceBetween(caster, target) <= 1;
    },

    processOf(bm, casterId) {
        return this.ensure(bm).processes.find(p => p.casterId === casterId) || null;
    },

    processOnTarget(bm, targetId) {
        return this.ensure(bm).processes.find(p => p.targetId === targetId) || null;
    },

    /** 独占只影响秘偶目标的选取，不影响征服，也不影响别的战术 */
    isOccupied(bm, targetId, exceptCasterId) {
        const p = this.processOnTarget(bm, targetId);
        return !!(p && p.casterId !== exceptCasterId);
    },

    /** 可选的秘偶目标：存活敌方、未被别人独占、在射程内、且理论上打得赢 */
    marionetteTargets(bm, caster) {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t => {
            if (!this.selectable(caster, t)) return false;
            if (this.isOccupied(bm, t.heroId, caster.heroId)) return false;
            if (!this.inMarionetteRange(caster, t)) return false;
            return this.canPossiblyWin(caster, t, this.marionettePenalty(bm, caster, t));
        });
    },

    /** 征服无距离限制、不受独占影响，恒定 0.5 劣势 */
    conquestTargets(bm, caster) {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            this.selectable(caster, t)
            && this.canPossiblyWin(caster, t, TacticCatalog.CONTROL_PENALTY));
    },

    /** 按序列平均人性的 10% 扣当前人性。不要走 spendSpirit，否则会扣错项 */
    spendHumanity(hero) {
        const cost = TacticCatalog.controlStatCost(hero.sequenceRank, '人性');
        hero.additionalStats.当前人性 = Math.max(0, (hero.additionalStats.当前人性 ?? 0) - cost);
        return cost;
    },

    /** 假设扣完后当前人性剩余，给 canPossiblyWin 第四参 */
    mindStatAfterCost(hero) {
        const cost = TacticCatalog.controlStatCost(hero.sequenceRank, '人性');
        return Math.max(0, (hero.additionalStats?.当前人性 ?? 0) - cost);
    },

    /** 「心灵」权柄无距离限制、不受独占影响，恒定 0.5；预估用扣费后的人性 */
    mindTargets(bm, caster) {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            this.selectable(caster, t)
            && this.canPossiblyWin(caster, t, TacticCatalog.CONTROL_PENALTY, this.mindStatAfterCost(caster)));
    },

    /**
     * 收尸人片段里最强的一段（rank 数字最小）。解析不出则 null。
     * 只给奴役豁免用，不参与资格判定。
     */
    corpseRank(sequenceString) {
        let best = null;
        LifeSaveManager.splitSequenceFragments(sequenceString).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r || r.pathwayShort !== '收尸人') return;
            const rank = Number(r.rank);
            if (!Number.isFinite(rank)) return;
            if (best === null || rank < best) best = rank;
        });
        return best;
    },

    /**
     * 奴役默认 0.5。仅当双方都能解析出收尸人片段、且目标片段序列更低时不吃修正。
     * 永恒之暗通常解析不出片段，这一侧没有可比 rank，不豁免。
     */
    enslavePenalty(caster, target) {
        const a = this.corpseRank(caster && caster.sequenceString);
        const b = this.corpseRank(target && target.sequenceString);
        if (a === null || b === null) return TacticCatalog.CONTROL_PENALTY;
        return b > a ? 1 : TacticCatalog.CONTROL_PENALTY;
    },

    /** 奴役无距离限制、不受独占影响；劣势按目标算，同途径下位可不吃 0.5 */
    enslaveTargets(bm, caster) {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            this.selectable(caster, t)
            && this.canPossiblyWin(caster, t, this.enslavePenalty(caster, t)));
    },

    /**
     * 驯化用哪一项：扣费前比较当前人性与当前灵性，较大者；相等用灵性。
     */
    tameStatKey(hero) {
        const s = (hero && hero.additionalStats) || {};
        const humanity = s.当前人性 ?? 0;
        const spirit = s.当前灵性 ?? 0;
        return humanity > spirit ? '人性' : '灵性';
    },

    /** 按 tameStatKey 扣对应当前值。不要走 spendSpirit，否则人性通道会扣错项 */
    spendTame(hero) {
        const key = this.tameStatKey(hero);
        const field = key === '人性' ? '当前人性' : '当前灵性';
        const cost = TacticCatalog.controlStatCost(hero.sequenceRank, key);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    /** 假设扣完后该项剩余，给 canPossiblyWin 第四参 */
    tameStatAfterCost(hero) {
        const key = this.tameStatKey(hero);
        const field = key === '人性' ? '当前人性' : '当前灵性';
        const cost = TacticCatalog.controlStatCost(hero.sequenceRank, key);
        return Math.max(0, (hero.additionalStats?.[field] ?? 0) - cost);
    },

    /** 驯化无距离限制、不受独占影响，恒定 0.5；预估用扣费后的人性或灵性 */
    tameTargets(bm, caster) {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            this.selectable(caster, t)
            && this.canPossiblyWin(caster, t, TacticCatalog.CONTROL_PENALTY, this.tameStatAfterCost(caster)));
    },

    // ---------- 状态效果 ----------

    /** 同一角色同一 role 同一 stat 只留一条，改层数时整条换掉而不是叠加 */
    _setDebuff(hero, name, stat, power, role) {
        hero.effects = hero.effects || [];
        hero.effects = hero.effects.filter(e => !(e && e.enemyControl === role && e.stat === stat));
        hero.effects.push({
            name,
            type: 'debuff',
            stat,
            valueType: 'percentage',
            power,
            // duration 只用于面板展示；到期与否完全由 processes 决定，
            // 引擎匹配不到 TIMING，不会碰它
            duration: 99,
            triggerTiming: this.TIMING,
            priority: 0,
            enemyControl: role,
        });
    },

    /**
     * 按当前层数刷新双方状态。
     * 目标：攻/防/速走 percentage debuff；移动力另挂字段，因为 stat:'speed' 只管先攻，
     * 而移动力必须在 MovementCalculator 钳制完 MIN/MAX 之后才乘，否则 -40% 会被抬回 3。
     */
    syncEffects(bm, process) {
        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);
        const pct = TacticCatalog.MARIONETTE_PCT[process.stacks] ?? 0;

        if (target) {
            this._setDebuff(target, '被秘偶化·攻击', 'attack', pct, 'target');
            this._setDebuff(target, '被秘偶化·防御', 'defense', pct, 'target');
            this._setDebuff(target, '被秘偶化·速度', 'speed', pct, 'target');
            target.enemyControlMovePct = pct;
        }
        if (caster) {
            const c = TacticCatalog.MARIONETTE_CASTER_PCT;
            this._setDebuff(caster, '正在秘偶化敌人·防御', 'defense', c, 'caster');
            this._setDebuff(caster, '正在秘偶化敌人·速度', 'speed', c, 'caster');
        }
    },

    clearEffects(hero, role) {
        if (!hero) return;
        if (role === 'target') hero.enemyControlMovePct = 0;
        if (!Array.isArray(hero.effects)) return;
        hero.effects = hero.effects.filter(e => !(e && e.enemyControl === role));
    },

    /** 结束一条过程并摘掉双方状态。summary 为空时静默结束（例如被征服顶掉） */
    endProcess(bm, process, reason, summary) {
        const ec = this.ensure(bm);
        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);
        this.clearEffects(caster, 'caster');
        this.clearEffects(target, 'target');
        ec.processes = ec.processes.filter(p => p !== process);

        if (!summary || !caster || !target) return;
        if (reason === 'skip') {
            summary.push(`✗ ${caster.name} 的秘偶转化因未继续而中断（目标：${target.name}）`);
        } else if (reason === 'range') {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的秘偶转化因超出距离而中断`);
        } else if (reason === 'invalid') {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的秘偶转化因目标不可用而中断`);
        } else if (reason === 'converted') {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的秘偶转化因目标被他人转化而中断`);
        }
    },

    interruptCaster(bm, casterId, reason, summary) {
        const p = this.processOf(bm, casterId);
        if (p) this.endProcess(bm, p, reason, summary);
    },

    /** 续控前的合法性检查 */
    checkContinue(bm, process) {
        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);
        if (!caster || !TacticResolver.alive(caster)) return { ok: false, reason: 'invalid' };
        if (!this.resolveEligibility(caster.sequenceString).秘偶化) return { ok: false, reason: 'invalid' };
        if (!this.isEnemyOf(caster, target)) return { ok: false, reason: 'invalid' };
        if ((caster.additionalStats.当前灵性 ?? 0) <= 0) return { ok: false, reason: 'invalid' };
        if (!this.inMarionetteRange(caster, target)) return { ok: false, reason: 'range' };
        return { ok: true, caster, target };
    },

    // ---------- 转阵营 ----------

    /**
     * bm.allyTeam 与 bm.teamManager.allyTeam 是**同一个数组对象**
     * （TeamManager 构造里直接存引用，没有复制），所以只能各操作一次。
     * bm.playerTeam 是另建的数组，构造之后全文无人读取，不要动。
     *
     * @param {Array} [summary] 有则把「附身被顶掉」写进结果页；转阵营本身不写这里
     */
    convertTeam(bm, target, caster, summary) {
        // 🆕 附身要在挪数组之前作废：release 要读目标当前所在的队伍才能还原，
        // 而这里马上就要改写 teamType。顺序反了会把目标还原到错误的阵营。
        // 场上没有任何附身时 releaseOnTarget 自己会立刻返回，不必在这里判空。
        PossessionManager.releaseOnTarget(bm, target, 'converted', summary);

        // 🆕 目标身上若挂着别人的短控，一并作废：他正在被更彻底地转走，
        // 那条一回合的控制已经没有意义。短控自己的 begin 排在本方法之后，
        // 所以不会误伤刚建的那条
        TempAllegianceManager.releaseOnTarget(bm, target);

        const toAlly = caster.teamType === 'ally';
        const from = toAlly ? bm.enemyTeam : bm.allyTeam;
        const to = toAlly ? bm.allyTeam : bm.enemyTeam;

        const i = from.indexOf(target);
        if (i >= 0) from.splice(i, 1);
        if (!to.includes(target)) to.push(target);

        target.teamType = toAlly ? 'ally' : 'enemy';
        // 谁控下的就归谁操纵：玩家控走的 NPC 由玩家在其回合操作
        target.controller = caster.controller || caster.dataSource || 'npc';

        // 目标身上若还挂着别人的秘偶过程，随转阵营一并作废。
        // 🆕 不再静默：短控可以无限次发起，拆别人层数会比以前频繁得多，
        // 被拆的那一方总得知道层数为什么没了
        const other = this.processOnTarget(bm, target.heroId);
        if (other) this.endProcess(bm, other, 'converted', summary);
    },

    // ---------- 结算一次秘偶 ----------

    applyMarionetteWin(bm, caster, target, roll, summary, results) {
        const ec = this.ensure(bm);
        const tail = this.contestTail(roll);
        let p = this.processOf(bm, caster.heroId);

        if (!p) {
            p = { casterId: caster.heroId, targetId: target.heroId, stacks: 1 };
            ec.processes.push(p);
            this.syncEffects(bm, p);
            summary.push(`✓ ${caster.name} 对 ${target.name} 的秘偶转化成功（第 1 层）${tail}`);
            results.push({ kind: 'enemy-control', stage: 'start', actor: caster.name, target: target.name });
            return;
        }

        p.stacks += 1;
        if (p.stacks >= TacticCatalog.MARIONETTE_MAX_STACKS) {
            this.endProcess(bm, p, null, null);
            ec.marionetteDone.add(caster.heroId);
            this.convertTeam(bm, target, caster, summary);
            summary.push(`✓ ${caster.name} 将 ${target.name} 彻底转化为秘偶${tail}`);
            results.push({ kind: 'enemy-control', stage: 'complete', actor: caster.name, target: target.name });
            return;
        }

        this.syncEffects(bm, p);
        summary.push(`✓ ${caster.name} 对 ${target.name} 的秘偶转化加深（第 ${p.stacks} 层）${tail}`);
        results.push({ kind: 'enemy-control', stage: 'deepen', actor: caster.name, target: target.name });
    },

    applyMarionetteFail(bm, caster, target, roll, summary) {
        const tail = this.contestTail(roll);
        const p = this.processOf(bm, caster.heroId);

        // 第一次就失败：没进过程，只是没加上，不写中断
        if (!p) {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的秘偶转化失败${tail}`);
            return;
        }

        p.stacks -= 1;
        if (p.stacks <= 0) {
            this.endProcess(bm, p, null, null);
            summary.push(`✗ ${caster.name} 对 ${target.name} 的秘偶转化失败，过程中断${tail}`);
            return;
        }
        this.syncEffects(bm, p);
        summary.push(`✗ ${caster.name} 对 ${target.name} 的秘偶转化失败，控制回落到第 ${p.stacks} 层${tail}`);
    },

    applyConquestWin(bm, caster, target, roll, summary, results) {
        this.convertTeam(bm, target, caster, summary);
        summary.push(`✓ ${caster.name} 以征服使 ${target.name} 转为友军${this.contestTail(roll)}`);
        results.push({ ...TacticBorrowReport.meta(caster), kind: 'enemy-control', stage: 'conquest', actor: caster.name, target: target.name });
    },

    applyMindWin(bm, caster, target, roll, summary, results) {
        this.convertTeam(bm, target, caster, summary);
        summary.push(`✓ ${caster.name} 以「心灵」权柄使 ${target.name} 转为友军${this.contestTail(roll)}`);
        results.push({ ...TacticBorrowReport.meta(caster), kind: 'enemy-control', stage: 'mind', actor: caster.name, target: target.name });
    },

    applyEnslaveWin(bm, caster, target, roll, summary, results) {
        this.convertTeam(bm, target, caster, summary);
        summary.push(`✓ ${caster.name} 以奴役使 ${target.name} 转为友军${this.contestTail(roll)}`);
        results.push({ ...TacticBorrowReport.meta(caster), kind: 'enemy-control', stage: 'enslave', actor: caster.name, target: target.name });
    },

    applyTameWin(bm, caster, target, roll, summary, results) {
        this.convertTeam(bm, target, caster, summary);
        summary.push(`✓ ${caster.name} 以驯化使 ${target.name} 转为友军${this.contestTail(roll)}`);
        results.push({ ...TacticBorrowReport.meta(caster), kind: 'enemy-control', stage: 'tame', actor: caster.name, target: target.name });
    },

    // ---------- 独占仲裁 ----------

    /** 先攻速度，与 buildTurnQueue 同一条通道（不含那里的随机系数） */
    speedOf(hero) {
        const base = hero.additionalStats?.当前敏捷 ?? hero.speed ?? 0;
        return AttributeCalculator.applyBuffDebuff(hero, 'speed', base);
    },

    /** 同一目标上有多人同回合成功时：玩家优先 → 速度快者 → 并列随机 */
    pickWinner(list) {
        if (!list || list.length === 0) return null;
        if (list.length === 1) return list[0];
        const player = list.find(a => a.caster.dataSource === 'player');
        if (player) return player;
        const top = Math.max(...list.map(a => this.speedOf(a.caster)));
        const tied = list.filter(a => this.speedOf(a.caster) === top);
        return tied[Math.floor(Math.random() * tied.length)];
    },

    groupByTarget(attempts) {
        const map = new Map();
        attempts.forEach(a => {
            const key = a.target.heroId;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(a);
        });
        return map;
    },
    runFrontendNpcTactics(bm, opts = {}) {
        const ec = this.ensure(bm);
        const summary = [];
        const results = [];
        const mythicNpcs = [];
        const controlNpcs = [];

        const playerHero = opts.playerHero || null;
        const playerBorrow = opts.playerBorrow || null;
        const borrowedNative = (playerBorrow && playerBorrow.native) || null;
        const playerActionHero = playerBorrow
            ? TacticExecutionContext.casterView(playerBorrow.context) : playerHero;
        const nativeOpt = key => borrowedNative ? (borrowedNative[key] || null) : (opts[key] || null);
        const runPlayerNative = fn => playerBorrow
            ? TacticBorrowReport.execute(bm, playerBorrow.context, summary, results,
                () => TacticExecutionContext.withUsageOwner(bm, playerBorrow.context, fn)) : fn();
        const playerControl = nativeOpt('playerControl');
        const playerBribery = nativeOpt('playerBribery');
        const playerSummon = nativeOpt('playerSummon');
        const playerRewind = nativeOpt('playerRewind');
        const playerRuleChange = nativeOpt('playerRuleChange');
        const playerExile = nativeOpt('playerExile');
        const playerEnvChange = nativeOpt('playerEnvChange');
        const playerExtraAction = nativeOpt('playerExtraAction');
        const playerFieldEffect = nativeOpt('playerFieldEffect');
        const playerEffectTransfer = nativeOpt('playerEffectTransfer');
        const playerBattleEvent = nativeOpt('playerBattleEvent');
        const playerPunishment = nativeOpt('playerPunishment');
        const playerBalance = nativeOpt('playerBalance');
        const playerActiveLeave = nativeOpt('playerActiveLeave');
        const playerFundamentalRule = nativeOpt('playerFundamentalRule');
        if (playerBorrow) playerBorrow.context.atomCount = playerFundamentalRule?.mutations?.length || 0;
        const mythicX = Number.isFinite(opts.mythicX)
            ? opts.mythicX
            : MythicFormManager.countActive(bm.teamManager.getAllHeroes());

        const marionetteTries = [];
        const conquestTries = [];
        const mindTries = [];
        const enslaveTries = [];
        const tameTries = [];
        const possessTries = [];
        const tempTries = [];
        const mindDepriveTries = [];
        const hardControlTries = [];
        const ruleChangeTries = [];
        const envTries = [];
        const exileTries = [];
        const npcBorrowCandidates = new Map();
        const npcBorrowRecords = [];

        const tryMarionette = (caster, target) => {
            const penalty = this.marionettePenalty(bm, caster, target);
            this.spendSpirit(caster);
            const roll = this.contest(caster, target, penalty);
            this.consumePenalty(bm, caster, target);
            marionetteTries.push({ caster, target, roll });
        };
        const tryConquest = (caster, target) => {
            ec.conquestUsed.add(caster.heroId);
            this.spendSpirit(caster);
            const roll = this.contest(caster, target, TacticCatalog.CONTROL_PENALTY);
            conquestTries.push({ ...TacticBorrowReport.meta(caster), caster, target, roll });
        };
        const tryMind = (caster, target) => {
            ec.mindUsed.add(caster.heroId);
            this.spendHumanity(caster);
            const leftover = caster.additionalStats.当前人性 ?? 0;
            const roll = this.contest(caster, target, TacticCatalog.CONTROL_PENALTY, leftover);
            mindTries.push({ ...TacticBorrowReport.meta(caster), caster, target, roll });
        };
        const tryEnslave = (caster, target) => {
            ec.enslaveUsed.add(caster.heroId);
            this.spendSpirit(caster);
            const roll = this.contest(caster, target, this.enslavePenalty(caster, target));
            enslaveTries.push({ ...TacticBorrowReport.meta(caster), caster, target, roll });
        };
        const tryTame = (caster, target) => {
            ec.tameUsed.add(caster.heroId);
            const spent = this.spendTame(caster);
            const leftover = caster.additionalStats[spent.field] ?? 0;
            const roll = this.contest(caster, target, TacticCatalog.CONTROL_PENALTY, leftover);
            tameTries.push({ ...TacticBorrowReport.meta(caster), caster, target, roll });
        };
        // 🆕 附身发起。无劣势修正，先扣再拼、成败都扣；一次成功即完全成功。
        // 不记 used 集合：附身可以无限次发起
        const tryPossess = (caster, target, subtype) => {
            const spent = PossessionManager.spend(caster, subtype);
            const roll = PossessionManager.contest(
                caster, target, subtype,
                caster.additionalStats[spent.field] ?? 0,
            );
            possessTries.push({ caster, target, subtype, roll });
        };
        // 🆕 短控发起。无劣势修正，先扣再拼、成败都扣；一次成功即完全成功。
        // 不记 used 集合：短控可以无限次发起
        const tryTemp = (caster, target, subtype) => {
            const spent = TempAllegianceManager.spend(caster, subtype);
            const roll = TempAllegianceManager.contest(
                caster, target,
                caster.additionalStats[spent.field] ?? 0,
            );
            tempTries.push({ ...TacticBorrowReport.meta(caster), caster, target, subtype, roll });
        };
        // 🆕 心智剥夺发起。与上面几条都不同：它是范围命中，**只扣一次**属性，
        // 然后范围内每个目标各拼一次点。赢下来的目标各掷一次档位，那一步在仲裁里做。
        // 目标池要在扣费之前取——canPossiblyWin 内部已经按扣费后的人性估上界
        const tryMindDeprive = (caster) => {
            const pool = MindDepriveManager.targetsInRange(bm, caster);
            if (!pool.length) return;
            const spent = MindDepriveManager.spend(caster);
            const casterStat = caster.additionalStats[spent.field] ?? 0;
            pool.forEach(target => {
                mindDepriveTries.push({
                    ...TacticBorrowReport.meta(caster),
                    caster,
                    target,
                    roll: MindDepriveManager.contest(caster, target, casterStat),
                });
            });
        };
        // 🆕 单体硬控发起。子类共用同一条「点人 → 先扣费 → 公平拼点」管线，
        // 落地顺序与同目标争夺统一交给 HardControlManager.arbitrate。
        const tryHardControl = (caster, target, subtype) => {
            const attempt = HardControlManager.attempt(caster, target, subtype);
            if (attempt) hardControlTries.push(attempt);
        };
        // 🆕 规则修改发起。先扣再拼、成败都扣。与上面几条最大的不同是拼点对手不是
        // 作用对象，而是场上所有对抗者，要全部赢过——所以这里不传 target。
        // 真正的入栏推迟到仲裁：同一轮里敌我都可能改规则，而栏位是共用的
        const tryRuleChange = (caster, plan) => {
            if (!plan || !plan.targets || !plan.targets.length) return;
            ruleChangeTries.push(RuleChangeManager.attempt(bm, caster, plan));
        };
        // 🆕 改变环境发起。与规则修改同构：拼点对手是场上所有对抗者、要全部赢过，
        // 所以这里也不传 target。比它还简单一层——作用全场，连目标池都没有，
        // 写哪几栏由子类的 envs 推导。真正的覆盖入栏推迟到仲裁
        const tryEnv = (caster, plan) => {
            if (!plan || !plan.subtype) return;
            envTries.push(EnvironmentManager.attempt(bm, caster, plan));
        };
        // 🆕 放逐发起。单体、先扣再拼、成败都扣；目标必须已经点好。
        // 不限距离、无劣势、无次数上限。落地与多人抢同一人在仲裁里做
        const tryExile = (caster, target, subtype) => {
            if (!target || !subtype) return;
            const spent = ExileManager.spend(caster);
            exileTries.push({
                ...TacticBorrowReport.meta(caster),
                caster,
                target,
                subtype,
                roll: ExileManager.contest(
                    caster, target,
                    caster.additionalStats[spent.field] ?? 0,
                ),
            });
        };
        // 🆕 施加效果发起。与上面几条都不同：它**就地结算，不进仲裁**——效果可以落在
        // 自己人身上，也不存在多人抢同一目标的独占问题，与召唤 / 技能干涉同一处理。
        // 扣费、拼点（如果子类配了）、目标解析、内部取最高全在 attempt 里做完，
        // 这里只是个转发壳，形状与那两条「就地结算」的一致
        const tryFieldEffect = (caster, subtype, target) => {
            if (!subtype) return;
            FieldEffectManager.attempt(bm, caster, subtype, target || null, summary, results);
        };
        const tryEffectTransfer = (caster, subtype, target) => {
            if (!subtype || !target) return false;
            return EffectTransferManager.attempt(bm, caster, target, subtype, summary, results);
        };
        // 🆕 制造战场事件发起。与施加效果一样就地结算、不进仲裁，但比它还简单一层：
        // 必成、无拼点、连目标都没有——发动只是在 bm 上登记一条过程，第一跳要等到
        // 下一个回合开始才由 BattleEventManager.tick 打出来
        const tryBattleEvent = (caster, subtype) => {
            if (!subtype) return;
            BattleEventManager.attempt(bm, caster, subtype, summary, results);
        };
        // 🆕 惩戒必成且就地结算。状态、扣费与切换共用 PunishmentManager，
        // 玩家提交重试时整条前端管线只跑一次，不会重复扣灵性。
        const tryPunishment = (caster, target) => {
            const applied = PunishmentManager.activate(bm, caster, target);
            if (!applied.applied) return false;
            const oldName = applied.oldTarget && applied.oldTarget.name;
            if (applied.switched) {
                summary.push(`⚖️ ${caster.name} 将惩戒对象从 ${oldName} 切换为 ${target.name}`);
            } else {
                summary.push(`⚖️ ${caster.name} 选定 ${target.name} 为惩戒对象`);
            }
            results.push({
                kind: 'punishment',
                stage: applied.switched ? 'switch' : 'start',
                actor: caster.name,
                oldTarget: oldName || '',
                target: target.name,
            });
            return true;
        };
        const tryBalance = (caster, target) => {
            const applied = BalanceManager.activate(bm, caster, target);
            if (!applied.applied) return false;
            summary.push(BalanceManager.activationSummary(caster, applied));
            results.push(BalanceManager.resultOf(caster, applied));
            return true;
        };

        const executeBorrowedNpcPlan = (plan) => {
            if (!plan || !plan.context || !plan.view) return false;
            const hero = plan.view;
            plan.context.npcFallback = plan.kind === 'rule-change';
            return TacticBorrowReport.execute(bm, plan.context, summary, results, () =>
                TacticExecutionContext.withUsageOwner(bm, plan.context, () => {
                if (plan.kind === 'skill-control') {
                    return SkillControlManager.npcAttempt(
                        bm, hero, plan.mode, plan.pair,
                        SkillControlManager.resolveEligibility(hero.sequenceString)[plan.mode] || plan.mode,
                        summary, results);
                }
                if (plan.kind === 'control') {
                    if (plan.subtype === TacticCatalog.CONQUEST) { tryConquest(hero, plan.target); return true; }
                    if (plan.subtype === TacticCatalog.MIND) { tryMind(hero, plan.target); return true; }
                    if (plan.subtype === TacticCatalog.ENSLAVE) { tryEnslave(hero, plan.target); return true; }
                    if (plan.subtype === TacticCatalog.TAME) { tryTame(hero, plan.target); return true; }
                    if (TempAllegianceManager.subtypes().includes(plan.subtype)) { tryTemp(hero, plan.target, plan.subtype); return true; }
                    if (HardControlManager.has(plan.subtype)) { tryHardControl(hero, plan.target, plan.subtype); return true; }
                }
                if (plan.kind === 'mind-deprive') { tryMindDeprive(hero); return true; }
                if (plan.kind === 'bribery') return BriberyManager.attempt(bm, hero, plan.target, plan.subtype, summary, results);
                if (plan.kind === 'punishment') return tryPunishment(hero, plan.target);
                if (plan.kind === 'balance') return tryBalance(hero, plan.target);
                if (plan.kind === 'rule-change') { tryRuleChange(hero, plan.native); return true; }
                if (plan.kind === 'environment') { tryEnv(hero, plan.native); return true; }
                if (plan.kind === 'exile') { tryExile(hero, plan.target, plan.subtype); return true; }
                if (plan.kind === 'extra') return ExtraActionManager.grant(bm, hero, plan.subtype, summary, results);
                if (plan.kind === 'field') return FieldEffectManager.attempt(bm, hero, plan.native.subtype, plan.native.target || null, summary, results);
                if (plan.kind === 'transfer') return EffectTransferManager.attempt(bm, hero, plan.native.target, plan.native.subtype, summary, results);
                if (plan.kind === 'event') return BattleEventManager.attempt(bm, hero, plan.native.subtype, summary, results);
                if (plan.kind === 'rewind') return RewindManager.apply(bm, hero, plan.subtype, plan.round, summary, results);
                if (plan.kind === 'summon') return SummonManager.tryNpcSummon(
                    bm, hero, plan.native.subtype, plan.native.entry, summary, results);
                return false;
            }));
        };

        // -1. 🆕 规则栏清理。**必须排在一切之前**：施法者阵亡或作用对象全灭的条目
        //     要先腾出栏位，本轮的新条目才不会去挤一条其实已经作废的规则。
        //     幂等，战术面板打开时也会跑一次，那次只为别让玩家看着过期的栏做决策。
        //     drain 而不是直接用返回值：面板那次的产出攒在 pendingLines 里，
        //     一并倒出来才不会漏报
        RuleChangeManager.sweep(bm);
        RuleChangeManager.drainLines(bm).forEach(line => summary.push(line));

        // -1b. 🆕 环境栏清理。理由与上面那条逐字相同：制造者阵亡的条目要先回落，
        //      本轮的新条目才不会去顶替一条其实已经作废的环境。幂等，战术面板打开时
        //      也会跑一次。它比规则修改多一路产出——回落还要写进战报（栏位重归空无 /
        //      重归某个自然值），所以 drainResults 与 drainLines 成对倒出来
        EnvironmentManager.sweep(bm);
        EnvironmentManager.drainLines(bm).forEach(line => summary.push(line));
        EnvironmentManager.drainResults(bm).forEach(r => results.push(r));

        // -1c. 已在主动离场中的角色先处理本轮维持/返场。返场本身占掉动作位，
        // 所以返回棋盘的 NPC 也必须进 handled，不能在下面第 4 步立刻再行动一次。
        const activeLeaveHandled = ActiveLeaveManager.maintainNpcs(bm, summary, results);
        activeLeaveHandled.forEach(id => {
            const hero = ActiveLeaveManager.findHero(bm, id);
            if (hero && !controlNpcs.includes(hero)) controlNpcs.push(hero);
        });
        if (playerHero && ActiveLeaveManager.processOf(bm, playerHero)
            && playerActiveLeave && playerActiveLeave.mode) {
            ActiveLeaveManager.maintainPlayer(
                bm, playerHero, playerActiveLeave.mode, summary, results,
            );
        }

        if (playerBorrow) TacticBorrowReport.begin(bm, playerBorrow.context);

        // 0. 🆕 玩家的回溯。**刻意排在整条管线最前面**：回溯必成、不拼点，语义是
        //    「这一轮开头我就已经不是那个我了」。放最前之后，后面所有拼点与
        //    canPossiblyWin 的必输过滤读到的都已经是回溯后的属性，任何一处都不用
        //    去做「这个人本轮回溯过、属性变了」的特判。
        //    回溯占掉动作位，所以它与 playerControl / playerSummon 天然互斥
        if (playerActionHero && playerRewind && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => RewindManager.apply(
                bm, playerActionHero, playerRewind.subtype, playerRewind.round,
                summary, results,
            ));
        }

        // 0a. 玩家发起主动离场。没有初始消耗，整发拼点在管理器内完成；成功后
        // 当场从棋盘摘除，后续步骤因 OffFieldManager 守卫不会再把他当作在场角色。
        if (playerActionHero && playerActiveLeave?.subtype && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => ActiveLeaveManager.attempt(
                bm, playerActionHero, playerActiveLeave.subtype, summary, results,
            ));
        }

        // 0b. 🆕 NPC 的回溯。不掷骰：符合条件必然触发，优先级高于下面全部独立骰。
        //     判据全在 RewindManager.npcShouldRewind 里（有名额、活力占比低于门槛、
        //     且存在一个活力更高的回合）。回溯掉的人要进 controlNpcs——那个标记
        //     只服务于地形对对碰的权重，不产出摘要或战报，正合此处所需：
        //     摘要与战报由 RewindManager.apply 自己写。
        //     排在玩家回溯之后、其余一切之前，理由与第 0 步一致。
        //     rewound 供第 4 步跳过：回溯就是他这一轮的行动，不能再掷一次别的骰
        const rewound = new Set();
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (hero === playerHero || !TacticResolver.alive(hero)) return;
            // 因附身离场的本体、动作位被占掉的人（昏迷等）都不回溯：
            // 与下面第 4 步的三道前置守卫同一口径
            if (OffFieldManager.isOff(hero)) return;
            if (TurnSkipManager.occupiesTactic(bm, hero)) return;
            if (!RewindManager.npcShouldRewind(bm, hero)) return;
            const subtype = RewindManager.npcSubtypeOf(bm, hero);
            if (!subtype) return;
            const best = RewindManager.bestVitalityRound(bm, hero);
            if (!best) return;
            if (!RewindManager.apply(bm, hero, subtype, best.round, summary, results)) return;
            controlNpcs.push(hero);
            rewound.add(hero.heroId);
            // 回溯占掉了他这一轮的动作位，所以进行中的秘偶与附身都维持不下去。
            // 与玩家侧完全对称：玩家改选别的行动时，第 1 步与第 1b 步做的也是这两件事。
            // 排在这里而不是等第 3 / 3b 步：那两步会从过程表现取，此刻划掉才不会
            // 让他在同一轮里既回溯又续控
            this.interruptCaster(bm, hero.heroId, 'skip', summary);
            PossessionManager.releaseByCaster(bm, hero.heroId, 'skip', summary, results);
        });

        // 0c. 🆕 玩家的额外行动。与回溯同样是必成、不拼点，所以并排放在管线最前面。
        //     它什么都不改：既不动场面也不动别人，只往 bm.extraAction.pending 里记一笔，
        //     等下一次 initializeRound 展开成从动格。因此它排在哪里其实都对，
        //     放在这里只是为了和回溯做邻居——两条「必成型」看在一起才好比对。
        //     额外行动占掉动作位，所以它与 playerControl / playerSummon / playerRewind /
        //     playerRuleChange / playerExile 天然互斥
        if (playerActionHero && playerExtraAction && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => ExtraActionManager.grant(
                bm, playerActionHero, playerExtraAction.subtype, summary, results,
            ));
        }

        // 0d. 🆕 NPC 的必成召唤。不掷骰：按子类 npcPriority 从小到大取第一条
        //     真正可落地的计划。当前顺序是幻想之身 → 快速炼成，二者都优先于额外行动。
        //     进行中的秘偶 / 附身与符合条件的回溯仍在它前面；外放灵魂没有配置
        //     npcPriority，继续留在第 4 步走原本的独立 30% 骰。
        const prioritySummoned = new Set();
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (hero === playerHero || !TacticResolver.alive(hero) || hero.isSummon) return;
            if (rewound.has(hero.heroId) || activeLeaveHandled.has(hero.heroId)) return;
            if (OffFieldManager.isOff(hero) || TurnSkipManager.occupiesTactic(bm, hero)) return;
            if (EnemyControlManager.processOf(bm, hero.heroId)) return;
            if (PossessionManager.processOf(bm, hero.heroId)) return;
            const plan = SummonManager.npcPriorityPlan(bm, hero);
            if (!plan) return;
            // 与第 4 步的随机召唤一致：真正发起后无论技术性落地是否成功，动作位都已占用。
            controlNpcs.push(hero);
            prioritySummoned.add(hero.heroId);
            SummonManager.tryNpcSummon(
                bm, hero, plan.subtype, plan.entry, summary, results,
            );
        });

        // 0e. 🆕 NPC 的额外行动。不掷骰：有次数就必然触发。
        //     优先级仅次于那三件非做不可的事——进行中的秘偶续控、进行中的附身维持、
        //     符合条件的回溯，以及上面的必成召唤。判据全在 ExtraActionManager.npcShouldUse 里。
        //     这一类越早用越划算，所以不做「留着后面用」的算计。
        //     与回溯一样进 controlNpcs（那个标记只服务于地形对对碰的权重，不产出摘要
        //     与战报——摘要与战报由 grant 自己写），并记进 extraActed 供第 4 步跳过：
        //     发动额外行动就是他这一轮的动作，不能再掷一次别的骰。
        //     **不**像回溯那样去中断秘偶与附身：npcShouldUse 已经把「手上有进行中的
        //     过程」整个排除掉了，能走到这里的人手上必然是空的
        const extraActed = new Set();
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (hero === playerHero || !TacticResolver.alive(hero)) return;
            if (rewound.has(hero.heroId)) return;
            if (prioritySummoned.has(hero.heroId)) return;
            // 与第 0b 步、第 4 步同一口径的三道前置守卫
            if (OffFieldManager.isOff(hero)) return;
            if (TurnSkipManager.occupiesTactic(bm, hero)) return;
            if (!ExtraActionManager.npcShouldUse(bm, hero)) return;
            const subtype = ExtraActionManager.npcSubtypeOf(bm, hero);
            if (!subtype) return;
            if (!ExtraActionManager.grant(bm, hero, subtype, summary, results)) return;
            controlNpcs.push(hero);
            extraActed.add(hero.heroId);
        });

        // 1. 玩家侧：没续同一目标（含跳过、改选别的战术）就中断自己的过程
        if (playerHero) {
            const mine = this.processOf(bm, playerHero.heroId);
            const keeping = playerControl
                && playerControl.type === TacticCatalog.MARIONETTE
                && playerControl.target
                && mine
                && mine.targetId === playerControl.target.heroId;
            if (mine && !keeping) this.interruptCaster(bm, playerHero.heroId, 'skip', summary);
        }

        // 1b. 🆕 玩家的附身：本轮没选「继续附身」就解除。这一条判据同时覆盖两条路——
        //     玩家主动点「解除附身」，以及玩家直接跳过整轮（playerControl 为 null）。
        //     必须排在下面所有步骤之前：解除会把目标当场变回敌人，
        //     后面的征服 / 驯化才能正确地把它当敌人看
        let playerPossessKept = false;
        if (playerHero) {
            const mine = PossessionManager.processOf(bm, playerHero.heroId);
            if (mine) {
                const wantContinue = playerControl
                    && playerControl.type === TacticCatalog.POSSESS_CONTINUE;
                if (!wantContinue) {
                    const manual = playerControl
                        && playerControl.type === TacticCatalog.POSSESS_RELEASE;
                    PossessionManager.release(bm, mine, manual ? 'manual' : 'skip', summary, results);
                } else {
                    playerPossessKept = true;
                }
            }
        }

        // 2. 玩家本轮选的操控
        if (playerActionHero && playerBribery && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => BriberyManager.attempt(bm, playerActionHero, playerBribery.target, playerBribery.subtype, summary, results));
        }

        if (playerActionHero && playerControl && TacticResolver.alive(playerActionHero)) {
            const t = playerControl.target;
            if (playerControl.type === TacticCatalog.MARIONETTE && this.isEnemyOf(playerActionHero, t)) {
                runPlayerNative(() => tryMarionette(playerActionHero, t));
            } else if (playerControl.type === TacticCatalog.CONQUEST && this.isEnemyOf(playerActionHero, t)) {
                runPlayerNative(() => tryConquest(playerActionHero, t));
            } else if (playerControl.type === TacticCatalog.MIND && this.isEnemyOf(playerActionHero, t)) {
                runPlayerNative(() => tryMind(playerActionHero, t));
            } else if (playerControl.type === TacticCatalog.ENSLAVE && this.isEnemyOf(playerActionHero, t)) {
                runPlayerNative(() => tryEnslave(playerActionHero, t));
            } else if (playerControl.type === TacticCatalog.TAME && this.isEnemyOf(playerActionHero, t)) {
                runPlayerNative(() => tryTame(playerActionHero, t));
            } else if (PossessionManager.subtypes().includes(playerControl.type)
                && this.isEnemyOf(playerActionHero, t)
                && !OffFieldManager.isOff(t)) {
                // 发起附身。走仲裁，与征服同构
                runPlayerNative(() => tryPossess(playerActionHero, t, playerControl.type));
            } else if (TempAllegianceManager.subtypes().includes(playerControl.type)
                && this.isEnemyOf(playerActionHero, t)
                && !OffFieldManager.isOff(t)) {
                // 🆕 发起短控。同样走仲裁，排在整条流水线的最末
                runPlayerNative(() => tryTemp(playerActionHero, t, playerControl.type));
            } else if (playerControl.type === TacticCatalog.MIND_DEPRIVE) {
                // 🆕 发起心智剥夺。范围命中，所以这里**不看 playerControl.target**——
                // 目标由 targetsInRange 现算，玩家在界面上也没有点人这一步
                runPlayerNative(() => tryMindDeprive(playerActionHero));
            } else if (HardControlManager.has(playerControl.type)
                && this.isEnemyOf(playerActionHero, t)
                && !OffFieldManager.isOff(t)) {
                // 🆕 发起单体硬控。目标池已统一排除已有 turnSkip 的目标。
                runPlayerNative(() => tryHardControl(playerActionHero, t, playerControl.type));
            }
        }

        // 2b. 🆕 玩家选了「继续附身」：就地做维持拼点，不进仲裁——
        //     目标已经是自己的友军，不存在多人争抢
        if (playerPossessKept && playerHero) {
            const mine = PossessionManager.processOf(bm, playerHero.heroId);
            if (mine) {
                const chk = PossessionManager.canContinue(bm, mine);
                if (!chk.ok) {
                    PossessionManager.release(bm, mine, chk.reason, summary, results);
                } else {
                    PossessionManager.upkeep(bm, mine, summary, results);
                }
            }
        }

        // 2c. 🆕 玩家本轮选的召唤：就地结算，不进仲裁——目标压根不在棋盘上，
        //     不存在多人抢同一目标的独占问题，这一点与技能干涉相同。
        //     与操控那几条并列而不是嵌在里面：召唤是另一个动作位选项，
        //     playerControl 与 playerSummon 天然互斥（一个战术回合只有一个动作位）。
        //     NPC 侧走第 4 步的独立骰。历史投影两侧的目标池不同：玩家用人物关系
        //     列表，NPC 没有那份数据，改成从神之途径里随机抽序列名现造候选；
        //     真实幻象两侧同池，目标就是发起者自己。
        if (playerActionHero && playerSummon && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => SummonManager.tryPlayerSummon(
                bm, playerActionHero,
                playerSummon.subtype, playerSummon.targetName,
                summary, results,
            ));
        }

        // 2d. 🆕 玩家本轮选的规则修改：先扣再拼，落地推迟到第 12 步仲裁——
        //     栏位是敌我共用的，同一轮里 NPC 也可能改规则，谁先入栏要统一定序。
        //     与前面几条并列的理由相同：它是另一个动作位选项，与 playerControl /
        //     playerSummon / playerRewind 天然互斥
        if (playerActionHero && playerRuleChange && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryRuleChange(playerActionHero, playerRuleChange));
        }

        // 2e. 🆕 玩家本轮选的放逐：先扣再拼，落地推迟到仲裁——同一轮里可能有好几个人
        //     想把同一个目标扔出去，谁抢到要统一定序。
        //     与前面几条并列的理由相同：它是另一个动作位选项，与 playerControl /
        //     playerSummon / playerRewind / playerRuleChange 天然互斥
        if (playerActionHero && playerExile && TacticResolver.alive(playerActionHero)) {
            const et = playerExile.target;
            if (et && this.isEnemyOf(playerActionHero, et) && !OffFieldManager.isOff(et)) {
                runPlayerNative(() => tryExile(playerActionHero, et, playerExile.subtype));
            }
        }

        // 2f. 🆕 玩家本轮选的改变环境：先扣再拼，落地推迟到第 13 步仲裁——每类环境
        //     只有一栏，同一轮里 NPC 也可能改，谁先写要统一定序。
        //     判据比前几条都短：作用全场，没有目标可校验，只要人还活着就能发
        if (playerActionHero && playerEnvChange && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryEnv(playerActionHero, playerEnvChange));
        }

        // 2g. 🆕 玩家本轮选的施加效果：就地结算，不进仲裁。目标可能是自己人，
        //     也不存在多人抢同一目标的独占问题，所以不必像操控那几条一样定序。
        //     目标合法性交给 attempt 里的 selector 现算——玩家点完之后目标死了、
        //     被转化走了、被放逐出场了，都会在那里被 onField 与 match 滤掉。
        //     与 playerControl / playerSummon / playerRewind / playerRuleChange /
        //     playerExile / playerEnvChange 天然互斥：一个战术回合只有一个动作位
        if (playerActionHero && playerFieldEffect && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryFieldEffect(playerActionHero, playerFieldEffect.subtype, playerFieldEffect.target));
        }

        // 2g-2. 玩家效果传递：纯前端单体关系，扣费与拼点都由独立管理器完成。
        if (playerActionHero && playerEffectTransfer && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryEffectTransfer(playerActionHero, playerEffectTransfer.subtype, playerEffectTransfer.target));
        }

        // 2h. 🆕 玩家本轮选的制造战场事件：就地登记，不进仲裁。判据是这一串里最短的——
        //     必成、无拼点、连目标都没有，只要人还活着就能发。与 playerControl /
        //     playerSummon / playerRewind / playerRuleChange / playerExile /
        //     playerEnvChange / playerFieldEffect 天然互斥：一个战术回合只有一个动作位
        if (playerActionHero && playerBattleEvent && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryBattleEvent(playerActionHero, playerBattleEvent.subtype));
        }

        // 2i. 玩家「平衡」权柄：纯前端必成，只扣本场独立点数。
        if (playerActionHero && playerBalance && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryBalance(playerActionHero, playerBalance.target));
        }

        // 2j. 🆕 玩家惩戒：独立本地动作，不进 LLM，不参与任何拼点或仲裁。
        if (playerActionHero && playerPunishment && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => tryPunishment(playerActionHero, playerPunishment.target));
        }

        // 2k. 底层规则修改：玩家专属自由配置；NPC与托管走普通规则修改回退。
        if (playerActionHero && playerFundamentalRule && TacticResolver.alive(playerActionHero)) {
            runPlayerNative(() => FundamentalRuleManager.attempt(
                bm, playerActionHero, playerFundamentalRule.subtype, playerFundamentalRule.mutations,
                playerFundamentalRule.reportText, summary, results,
            ));
        }

        // 3. 进行中的 NPC 过程：能续就**必须**续，不再掷骰
        const continuing = new Set();
        ec.processes.slice().forEach(p => {
            if (playerHero && p.casterId === playerHero.heroId) return;
            const chk = this.checkContinue(bm, p);
            if (!chk.ok) {
                this.endProcess(bm, p, chk.reason, summary);
                return;
            }
            // 🆕 战术动作位被占掉的人（昏迷等）本轮续不了控，按「未继续」中断。
            // 排在 checkContinue 之后：那边的失败原因更具体，优先让它写
            if (TurnSkipManager.occupiesTactic(bm, chk.caster)) {
                this.endProcess(bm, p, 'skip', summary);
                return;
            }
            continuing.add(p.casterId);
            controlNpcs.push(chk.caster);
            tryMarionette(chk.caster, chk.target);
        });

        // 3b. 🆕 进行中的 NPC 附身：默认无脑维持。只在「必输」「目标死亡」
        //     「属性见底」这些继续下去没有意义的情况下主动解除，不白扣属性。
        //     维持不进仲裁，就地结算
        PossessionManager.ensure(bm).processes.slice().forEach(p => {
            if (playerHero && p.casterId === playerHero.heroId) return;
            const chk = PossessionManager.canContinue(bm, p);
            if (!chk.ok) {
                PossessionManager.release(bm, p, chk.reason, summary, results);
                return;
            }
            // 🆕 动作位被占掉的本体维持不了附身，按「未继续」解除
            if (TurnSkipManager.occupiesTactic(bm, chk.caster)) {
                PossessionManager.release(bm, p, 'skip', summary, results);
                return;
            }
            continuing.add(p.casterId);
            controlNpcs.push(chk.caster);
            PossessionManager.upkeep(bm, p, summary, results);
        });

        // 4. 其余够格角色：秘偶 / 征服 / 「心灵」权柄 / 奴役 / 驯化 / 附身 / 技能干涉 / 化形独立骰，
        //    都中则在命中的里随机一条
        const mythicChance = Math.min(
            TacticCatalog.MYTHIC_NPC_CAP,
            TacticCatalog.MYTHIC_NPC_BASE + TacticCatalog.MYTHIC_NPC_STEP * mythicX,
        );
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (hero === playerHero || !TacticResolver.alive(hero)) return;
            if (continuing.has(hero.heroId)) return;
            // 🆕 本轮已经回溯过的人不再掷骰：回溯就是他这一轮的行动，
            // 一个战术回合只有一个动作位
            if (rewound.has(hero.heroId)) return;
            // 🆕 本轮已经发动额外行动的人同理，与上面那条完全对称
            if (extraActed.has(hero.heroId)) return;
            // 🆕 本轮已经发动必成召唤的人同样用掉了动作位，不再进入随机战术池。
            if (prioritySummoned.has(hero.heroId)) return;
            // 主动离场的维持或返场本身就是这一轮的动作，返场后也不能立刻再掷骰。
            if (activeLeaveHandled.has(hero.heroId)) return;
            // 🆕 因附身离场的本体不参与掷骰：它这一轮的行动就是维持附身，
            // 已经在 3b 结算过；能走到这里说明它的附身刚被解除，也不该立刻再动
            if (OffFieldManager.isOff(hero)) return;
            // 🆕 动作位已被占掉的人（昏迷等）整轮不掷骰
            if (TurnSkipManager.occupiesTactic(bm, hero)) return;

            // 「平衡」权柄高于惩戒：没有有效关系时，最高可负担序列档里若存在
            // 当前格可直接攻击的目标就必定发动，并占掉本阶段动作位。
            if (BalanceManager.eligible(hero) && !BalanceManager.outgoingOf(bm, hero)) {
                const balanceTarget = BalanceManager.npcTarget(bm, hero);
                if (balanceTarget && tryBalance(hero, balanceTarget)) {
                    controlNpcs.push(hero);
                    return;
                }
            }

            // 🆕 惩戒只压过下面的随机战术池。回溯、额外行动、优先召唤、离场维持
            // 等前置步骤已经在上面结算完；能走到这里且没有有效目标时，必定发动、不掷骰。
            // 已有有效目标则不重复惩戒，照常参与下面其它随机战术。
            if (PunishmentManager.eligible(hero)
                && PunishmentManager.hasStat(hero)
                && !PunishmentManager.currentTarget(bm, hero)) {
                const punishmentTarget = PunishmentManager.npcTarget(bm, hero);
                if (punishmentTarget && tryPunishment(hero, punishmentTarget)) {
                    controlNpcs.push(hero);
                    return;
                }
            }

            const hits = [];
            BriberyManager.subtypes().forEach(subtype => {
                if ((hero.additionalStats.当前灵性 ?? 0) <= 0) return;
                if (!BriberyManager.targets(bm, hero, subtype, true).length) return;
                if (Math.random() < 0.30) hits.push(subtype);
            });
            const spirit = hero.additionalStats.当前灵性 ?? 0;
            // 🆕 附身两子类各掷一次独立骰。资格里已经含「当前没在附身别人」
            const possessElig = PossessionManager.resolveEligibility(hero.sequenceString);
            const possessHits = [];
            PossessionManager.subtypes().forEach(subtype => {
                if (!possessElig[subtype]) return;
                if (PossessionManager.processOf(bm, hero.heroId)) return;
                if (!PossessionManager.hasStat(hero, subtype)) return;
                if (!PossessionManager.possessTargets(bm, hero, subtype).length) return;
                if (Math.random() * 100 >= TacticCatalog.POSSESS_NPC_CHANCE) return;
                possessHits.push(subtype);
            });
            possessHits.forEach(t => hits.push(t));
            // 🆕 短控各子类独立掷骰。秽语·堕落固定使用灵性，旧四条仍取人性/灵性
            // 较高项，所以属性与目标池必须逐子类检查，不能再共用一次预判。
            const tempElig = TempAllegianceManager.resolveEligibility(hero.sequenceString);
            if (!TempAllegianceManager.processOf(bm, hero.heroId)) {
                TempAllegianceManager.subtypes().forEach(subtype => {
                    if (!tempElig[subtype]) return;
                    if (!TempAllegianceManager.hasStat(hero, subtype)) return;
                    if (!TempAllegianceManager.tempTargets(bm, hero, subtype).length) return;
                    if (Math.random() * 100 >= TacticCatalog.TEMP_NPC_CHANCE) return;
                    hits.push(subtype);
                });
            }
            // 🆕 心智剥夺一次独立骰。它不占「同时只能控一个」的名额，
            // 因为五档里只有狂热追随会转阵营，且那一档在仲裁里另有降级兜底
            if (MindDepriveManager.canUse(bm, hero)
                && MindDepriveManager.hasStat(hero)
                && MindDepriveManager.targetsInRange(bm, hero).length
                && Math.random() * 100 < TacticCatalog.MIND_DEPRIVE_NPC_CHANCE) {
                hits.push(TacticCatalog.MIND_DEPRIVE);
            }
            // 🆕 每个开放给 NPC 的硬控子类仍各掷一次独立骰；睡美人在配置中关闭。
            // 空目标池时不掷，不占「同时只能控一个」的名额。
            HardControlManager.npcSubtypes().forEach(subtype => {
                if (HardControlManager.npcShouldTry(bm, hero, subtype)) hits.push(subtype);
            });
            // 🆕 技能干涉：只开放禁止与偷窃。复制只 grant 不 ban，而 NPC 每回合
            // 重建技能表会把 grant 丢掉，对 NPC 是纯空操作，掷它等于浪费一次行动
            const scElig = SkillControlManager.resolveEligibility(hero.sequenceString);
            const scHits = [];
            if (spirit > 0) {
                TacticCatalog.SKILL_CONTROL_NPC_MODES.forEach(mode => {
                    if (!scElig[mode]) return;
                    if (!SkillControlManager.npcTargets(bm, hero, mode).length) return;
                    if (Math.random() * 100 >= TacticCatalog.SKILL_CONTROL_NPC_CHANCE) return;
                    scHits.push(mode);
                });
            }
            scHits.forEach(m => hits.push(`${TacticCatalog.SKILL_CONTROL_ACTION}:${m}`));
            // 🆕 召唤一次独立骰。顺序刻意是「闸门 → 掷骰 → 取候选」：
            // 掷骰排在取候选之前，才不会为这一轮根本不召唤的人白造一批候选；
            // 取候选排在 hits.push 之前，才能实现「候选全军覆没就当什么都没发生」——
            // 不进 hits 就不占动作位，也不会被从 LLM 名单里摘掉。
            // 召唤物自己不许再召，否则每一代都能再开一批名额，逐代翻倍。
            // canUse 已经逐子类查过「够格 ∧ 名额未满 ∧ 付得起」，不必再单独掷 hasStat
            if (!hero.isSummon && SummonManager.freeCellNear(bm.board, hero)) {
                const summonElig = SummonManager.resolveEligibility(hero.sequenceString);
                // 抽子类前先逐条过滤：各子类的名额上限与消耗项可能不同，
                // 只按资格抽会抽中一条名额已满或付不起的，白白浪费这一轮召唤骰
                const ordinaryKinds = SummonManager.subtypes().filter(k =>
                    k !== TacticCatalog.SUMMON_GRAZING
                    && k !== TacticCatalog.SUMMON_PICTURE_PERSON
                    && !Number.isFinite(Number(SummonManager.SUBTYPES[k]?.npcPriority))
                    && summonElig[k]
                    && SummonManager.quotaLeft(bm, hero, k) > 0
                    && SummonManager.hasStat(hero, k));
                const grazingReady = summonElig[TacticCatalog.SUMMON_GRAZING]
                    && SummonManager.quotaLeft(bm, hero, TacticCatalog.SUMMON_GRAZING) > 0;
                const grazingHit = grazingReady
                    && Math.random() * 100 < TacticCatalog.GRAZING_NPC_CHANCE;
                // 画中人有自己独立的 30% 骰，不与历史投影等普通召唤随机分摊概率。
                const pictureReady = summonElig[TacticCatalog.SUMMON_PICTURE_PERSON]
                    && SummonManager.quotaLeft(bm, hero, TacticCatalog.SUMMON_PICTURE_PERSON) > 0
                    && SummonManager.hasStat(hero, TacticCatalog.SUMMON_PICTURE_PERSON);
                const pictureHit = pictureReady
                    && Math.random() * 100 < TacticCatalog.SUMMON_PICTURE_PERSON_NPC_CHANCE;
                const ordinaryHit = ordinaryKinds.length
                    && Math.random() * 100 < TacticCatalog.SUMMON_NPC_CHANCE;
                const summonKind = grazingHit
                    ? TacticCatalog.SUMMON_GRAZING
                    : pictureHit ? TacticCatalog.SUMMON_PICTURE_PERSON
                    : ordinaryHit ? ordinaryKinds[Math.floor(Math.random() * ordinaryKinds.length)] : '';
                // 目标池必须按子类分流。selfTargets 子类召的是施法者自己，炼成随机挑途径，
                // 绝不能走 randomCandidates——那条是给「NPC 没有本体记录」的历史投影
                // 现造路人用的，抽中自体复制却拿它，召出来的会是个毫不相干的人
                let summonCands = [];
                const summonCfg = SummonManager.SUBTYPES[summonKind];
                if (summonCfg?.targetPool === 'selfTargets') {
                    summonCands = SummonManager.selfTargets(bm, hero);
                } else if (summonCfg?.alchemy) {
                    summonCands = SummonManager.randomAlchemyCandidates(bm, hero);
                } else if (summonCfg?.picture) {
                    summonCands = SummonManager.randomPictureCandidates(bm, hero);
                } else if (summonKind === TacticCatalog.SUMMON_GRAZING) {
                    summonCands = SummonManager.randomGrazingCandidates(bm, hero);
                } else if (summonKind) {
                    summonCands = SummonManager.randomCandidates(bm, hero);
                }
                // 候选不带子类，在这里补上：pick 阶段从候选对象上读，
                // 将来大类下再多一条子类时那一段不用改
                summonCands.forEach(c => { c.subtype = summonKind; });
                SummonManager.cacheCandidates(bm, hero, summonCands);
                if (summonKind && summonCands.length) hits.push(TacticCatalog.SUMMON_ACTION);
            }
            // 🆕 规则修改一次独立骰。闸门里已经含「必须能赢过每一个同类能力者」
            // 与「栏满且全是自己人受益时不掷」，见 RuleChangeManager.npcShouldTry。
            // 现挑方案排在掷骰之后：抽不中就不必为他白算一遍目标池
            if (RuleChangeManager.npcShouldTry(bm, hero)
                && Math.random() * 100 < TacticCatalog.RULE_CHANGE_NPC_CHANCE) {
                hits.push(TacticCatalog.RULE_CHANGE_ACTION);
            }
            // 🆕 改变环境一次独立骰。与规则修改的顺序刻意相反：那边「现挑方案」排在
            // 掷骰之后（抽不中就不白算目标池），这边把逐子类过滤放进了 npcShouldTry，
            // 也就是**掷骰之前**。多算一遍换掉「掷中了却挑不出方案、白过一轮」，
            // 取舍与召唤的「候选全军覆没就当什么都没发生」一致
            if (EnvironmentManager.npcShouldTry(bm, hero)
                && Math.random() * 100 < TacticCatalog.ENV_NPC_CHANCE) {
                hits.push(TacticCatalog.ENV_ACTION);
            }
            // 🆕 施加效果一次独立骰。与改变环境同样把过滤放在**掷骰之前**：
            // npcShouldTry 内部就是「能不能挑出一发有意义的」，它自带软闸门——
            // 目标身上已有不弱于此的同组条目时不算有意义，免得白烧一个动作位
            // 和一份灵性去顶一条顶不动的效果
            if (FieldEffectManager.npcShouldTry(bm, hero)
                && Math.random() * 100 < TacticCatalog.FIELD_EFFECT_NPC_CHANCE) {
                hits.push(TacticCatalog.FIELD_EFFECT_ACTION);
            }
            if (EffectTransferManager.npcShouldTry(bm, hero)
                && Math.random() * 100 < TacticCatalog.EFFECT_TRANSFER_NPC_CHANCE) {
                hits.push(TacticCatalog.EFFECT_TRANSFER_ACTION);
            }
            // 🆕 制造战场事件一次独立骰。同样把过滤放在**掷骰之前**：npcShouldTry 里
            // 已经查过资格、名额、灵性与「落不落得到实处」（雷暴要求场上还有敌人），
            // 免得白烧一个动作位去劈空气
            if (BattleEventManager.npcShouldTry(bm, hero)
                && Math.random() * 100 < TacticCatalog.BATTLE_EVENT_NPC_CHANCE) {
                hits.push(TacticCatalog.BATTLE_EVENT_ACTION);
            }
            // 🆕 放逐一次独立骰。无次数上限、不占「同时只能控一个」的名额——
            // 它压根不是转阵营那一系。空池就不掷（目标池已滤掉必输与已离场的人）
            if (ExileManager.canUse(bm, hero)
                && ExileManager.hasStat(hero)
                && ExileManager.targets(bm, hero).length
                && Math.random() * 100 < TacticCatalog.EXILE_NPC_CHANCE) {
                hits.push(TacticCatalog.EXILE_ACTION);
            }
            // 主动离场只有真实 NPC 能自动发起，并要求至少一个自有召唤物仍在场。
            // 50% 是独立骰；命中后仍与其他命中项共同随机竞争唯一动作位。
            if (ActiveLeaveManager.canNpcInitiate(bm, hero)
                && Math.random() * 100 < TacticCatalog.ACTIVE_LEAVE_NPC_CHANCE) {
                hits.push(TacticCatalog.ACTIVE_LEAVE_ACTION);
            }
            if (spirit > 0
                && this.canMarionette(bm, hero)
                && this.marionetteTargets(bm, hero).length
                && Math.random() * 100 < TacticCatalog.CONTROL_NPC_CHANCE) {
                hits.push(TacticCatalog.MARIONETTE);
            }
            if (spirit > 0
                && this.canConquest(bm, hero)
                && this.conquestTargets(bm, hero).length
                && Math.random() * 100 < TacticCatalog.CONTROL_NPC_CHANCE) {
                hits.push(TacticCatalog.CONQUEST);
            }
            if ((hero.additionalStats.当前人性 ?? 0) > 0
                && this.canMind(bm, hero)
                && this.mindTargets(bm, hero).length
                && Math.random() * 100 < TacticCatalog.CONTROL_NPC_CHANCE) {
                hits.push(TacticCatalog.MIND);
            }
            if (spirit > 0
                && this.canEnslave(bm, hero)
                && this.enslaveTargets(bm, hero).length
                && Math.random() * 100 < TacticCatalog.CONTROL_NPC_CHANCE) {
                hits.push(TacticCatalog.ENSLAVE);
            }
            const tameField = this.tameStatKey(hero) === '人性' ? '当前人性' : '当前灵性';
            if ((hero.additionalStats[tameField] ?? 0) > 0
                && this.canTame(bm, hero)
                && this.tameTargets(bm, hero).length
                && Math.random() * 100 < TacticCatalog.CONTROL_NPC_CHANCE) {
                hits.push(TacticCatalog.TAME);
            }
            if (!hero.mythicFormUsed
                && !MythicFormManager.has(hero)
                && MythicFormManager.tierOf(hero.sequenceRank)
                && Math.random() * 100 < mythicChance) {
                hits.push(TacticCatalog.MYTHIC_ACTION);
            }
            // 🆕 能力借用按大类统一掷一次30%。只有至少一项权柄存在可执行来源时才入池；
            // 真正选中后再严格按“先抽来源、再抽来源能力”处理。
            const authorityKinds = AbilityBorrowManager.availableSubtypes(hero);
            if (authorityKinds.length && Math.random() * 100 < TacticCatalog.BORROW_NPC_CHANCE) {
                const borrowAuthorities = authorityKinds.map(subtype => ({ subtype,
                    sources: BorrowableTacticRegistry.npcSources(bm, hero, subtype) }))
                    .filter(row => row.sources.length > 0);
                if (borrowAuthorities.length) {
                    npcBorrowCandidates.set(hero.heroId, borrowAuthorities);
                    hits.push(TacticCatalog.ABILITY_BORROW_ACTION);
                }
            }
            if (hits.length === 0) return;

            const pick = hits[Math.floor(Math.random() * hits.length)];
            if (pick === TacticCatalog.ABILITY_BORROW_ACTION) {
                const authorities = npcBorrowCandidates.get(hero.heroId) || [];
                if (!authorities.length) return;
                const authority = authorities[Math.floor(Math.random() * authorities.length)];
                const source = authority.sources[Math.floor(Math.random() * authority.sources.length)];
                const groups = BorrowableTacticRegistry.npcGroupsForSource(bm, hero, source, authority.subtype);
                if (!groups.length) return;
                const group = groups[Math.floor(Math.random() * groups.length)];
                const plan = BorrowableTacticRegistry.planNpcGroup(bm, hero, source, authority.subtype, group);
                if (!plan) return;
                controlNpcs.push(hero);
                const borrowContext = TacticBorrowReport.begin(bm, plan.context);
                npcBorrowRecords.push(borrowContext);
                const attempt = AbilityBorrowManager.attempt(bm, hero, source, authority.subtype);
                if (!attempt.ok) {
                    summary.push(`✗ ${hero.name}的${AbilityBorrowManager.displayName(hero, authority.subtype)}未能发动：${attempt.error || '来源失效'}`);
                    return;
                }
                borrowContext.authorityWin = attempt.win;
                TacticBorrowReport.detail(bm, borrowContext, '权柄费用 ' + attempt.spent.actual + '/' + attempt.spent.cost
                    + '，当前灵性 ' + attempt.spent.before + '→' + attempt.spent.after
                    + '，拼点 ' + attempt.roll.casterScore + ':' + attempt.roll.targetScore + (attempt.win ? '，成功' : '，失败'));
                const shown = AbilityBorrowManager.displayName(hero, authority.subtype);
                const detail = `（灵性消耗${attempt.spent.actual}/${attempt.spent.cost}，拼点 ${attempt.roll.casterScore}:${attempt.roll.targetScore}）`;
                if (!attempt.win) {
                    summary.push(`✗ ${hero.name}未能以${shown}取得${source.name}的${plan.descriptor.label}${detail}`);
                    return;
                }
                summary.push(`✓ ${hero.name}以${shown}取得${source.name}的${plan.descriptor.label}${detail}`);
                // 成本和结果按本次borrowId记录，来源自身的动作位不受影响。
                executeBorrowedNpcPlan(plan);
            } else if (BriberyManager.SUBTYPES[pick]) {
                const target = BriberyManager.npcTarget(bm, hero, pick);
                if (!target) return;
                controlNpcs.push(hero);
                BriberyManager.attempt(bm, hero, target, pick, summary, results);
            } else if (pick === TacticCatalog.MARIONETTE) {
                const pool = this.marionetteTargets(bm, hero);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryMarionette(hero, pool[Math.floor(Math.random() * pool.length)]);
            } else if (pick === TacticCatalog.CONQUEST) {
                const pool = this.conquestTargets(bm, hero);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryConquest(hero, pool[Math.floor(Math.random() * pool.length)]);
            } else if (pick === TacticCatalog.MIND) {
                const pool = this.mindTargets(bm, hero);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryMind(hero, pool[Math.floor(Math.random() * pool.length)]);
            } else if (pick === TacticCatalog.ENSLAVE) {
                const pool = this.enslaveTargets(bm, hero);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryEnslave(hero, pool[Math.floor(Math.random() * pool.length)]);
            } else if (pick === TacticCatalog.TAME) {
                const pool = this.tameTargets(bm, hero);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryTame(hero, pool[Math.floor(Math.random() * pool.length)]);
            } else if (PossessionManager.subtypes().includes(pick)) {
                // 🆕 附身：目标随机取，走第 9 步仲裁
                const pool = PossessionManager.possessTargets(bm, hero, pick);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryPossess(hero, pool[Math.floor(Math.random() * pool.length)], pick);
            } else if (TempAllegianceManager.subtypes().includes(pick)) {
                // 🆕 短控：目标随机取，走第 10 步仲裁
                const pool = TempAllegianceManager.tempTargets(bm, hero, pick);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryTemp(hero, pool[Math.floor(Math.random() * pool.length)], pick);
            } else if (pick === TacticCatalog.MIND_DEPRIVE) {
                // 🆕 心智剥夺：范围命中不用挑目标，走第 11 步仲裁。
                // 空池要在进 controlNpcs 之前挡掉，与上面几条同构——
                // 否则他会被当成「这一轮行动过」而从 LLM 名单里摘掉，实际什么都没做
                if (!MindDepriveManager.targetsInRange(bm, hero).length) return;
                controlNpcs.push(hero);
                tryMindDeprive(hero);
            } else if (HardControlManager.has(pick)) {
                // 🆕 单体硬控：目标随机取，按子类顺序在心智剥夺之前仲裁。
                // 空池必须挡在 controlNpcs 之前，避免实际没行动却被摘出 LLM 名单。
                const pool = HardControlManager.targets(bm, hero, pick);
                if (!pool.length) return;
                controlNpcs.push(hero);
                tryHardControl(hero, pool[Math.floor(Math.random() * pool.length)], pick);
            } else if (String(pick).startsWith(`${TacticCatalog.SKILL_CONTROL_ACTION}:`)) {
                // 🆕 技能干涉：目标与技能都从必输过滤后的配对里随机取，就地结算不进仲裁
                const mode = String(pick).split(':')[1];
                const pool = SkillControlManager.npcTargets(bm, hero, mode);
                if (!pool.length) return;
                controlNpcs.push(hero);
                SkillControlManager.npcAttempt(
                    bm, hero, mode,
                    pool[Math.floor(Math.random() * pool.length)],
                    scElig[mode] || mode,
                    summary, results,
                );
            } else if (pick === TacticCatalog.SUMMON_ACTION) {
                // 🆕 召唤：吃掷骰阶段现造并缓存的那批候选，随机取一个，就地结算不进仲裁——
                // 目标压根不在棋盘上，不存在多人抢同一目标的独占问题。
                // 空池同样要挡在 controlNpcs 之前，理由与心智剥夺那条一致。
                // 这一档必须排在下面的化形之前：那一档是 `else if (MythicFormManager.apply(...))`，
                // 带副作用，任何认不出来的 pick 掉进去都会静默开启化形
                const summonPool = SummonManager.cachedCandidates(bm, hero);
                if (!summonPool.length) return;
                const summonEntry = summonPool[Math.floor(Math.random() * summonPool.length)];
                controlNpcs.push(hero);
                SummonManager.tryNpcSummon(
                    bm, hero, summonEntry.subtype, summonEntry, summary, results,
                );
            } else if (pick === TacticCatalog.RULE_CHANGE_ACTION) {
                // 🆕 规则修改：范围与参数现挑，落地推迟到第 12 步仲裁。
                // 挑不出方案（抽中的那一类没有落点）就整发作废，挡在 controlNpcs 之前，
                // 理由与召唤那条一致——不进 controlNpcs 才不会被当成「这一轮行动过」。
                // 这一档同样必须排在下面的化形之前：那一档带副作用
                const rulePlan = RuleChangeManager.npcPlan(bm, hero);
                if (!rulePlan) return;
                controlNpcs.push(hero);
                tryRuleChange(hero, rulePlan);
            } else if (pick === TacticCatalog.ENV_ACTION) {
                // 🆕 改变环境：子类现挑（用与闸门同一套过滤），落地推迟到第 13 步仲裁。
                // 无需挑目标——作用全场，栏位由 envs 推导。
                // 闸门已经在掷骰前确认过池非空，所以这里的 null 只是纯防御；
                // 但这道 return 必须挡在 controlNpcs.push 之前，理由与召唤 / 规则修改
                // 那两条一致——不进那个数组才不会被当成「这一轮行动过」。
                // 这一档同样必须排在下面的化形之前：那一档带副作用
                const envPlan = EnvironmentManager.npcPlan(bm, hero);
                if (!envPlan) return;
                controlNpcs.push(hero);
                tryEnv(hero, envPlan);
            } else if (pick === TacticCatalog.EXILE_ACTION) {
                // 🆕 放逐：目标与子类都随机取，落地推迟到仲裁。
                // 空池同样要挡在 controlNpcs 之前，理由与召唤 / 规则修改那两条一致。
                // 这一档同样必须排在下面的化形之前：那一档带副作用
                const exilePool = ExileManager.targets(bm, hero);
                const exileKinds = ExileManager.availableSubtypes(bm, hero);
                if (!exilePool.length || !exileKinds.length) return;
                controlNpcs.push(hero);
                tryExile(
                    hero,
                    exilePool[Math.floor(Math.random() * exilePool.length)],
                    exileKinds[Math.floor(Math.random() * exileKinds.length)],
                );
            } else if (pick === TacticCatalog.ACTIVE_LEAVE_ACTION) {
                const kinds = ActiveLeaveManager.npcSubtypes(bm, hero);
                if (!kinds.length || !ActiveLeaveManager.ownedLiveSummons(bm, hero).length) return;
                controlNpcs.push(hero);
                ActiveLeaveManager.attempt(
                    bm, hero, kinds[Math.floor(Math.random() * kinds.length)], summary, results,
                );
            } else if (pick === TacticCatalog.FIELD_EFFECT_ACTION) {
                // 🆕 施加效果：子类与目标一起现挑（npcPlan 内部带软闸门，只挑真能
                // 落到实处的那一发），就地结算不进仲裁。
                // 闸门已经在掷骰前跑过同一套判据，所以这里的 null 只是纯防御；
                // 但这道 return 必须挡在 controlNpcs.push 之前，理由与召唤 / 规则修改 /
                // 改变环境那几条一致——不进那个数组才不会被当成「这一轮行动过」。
                // 这一档同样必须排在下面的化形之前：那一档带副作用
                const fieldPlan = FieldEffectManager.npcPlan(bm, hero);
                if (!fieldPlan) return;
                controlNpcs.push(hero);
                tryFieldEffect(hero, fieldPlan.subtype, fieldPlan.target);
            } else if (pick === TacticCatalog.EFFECT_TRANSFER_ACTION) {
                const transferPlan = EffectTransferManager.npcPlan(bm, hero);
                if (!transferPlan) return;
                controlNpcs.push(hero);
                tryEffectTransfer(hero, transferPlan.subtype, transferPlan.target);
            } else if (pick === TacticCatalog.BATTLE_EVENT_ACTION) {
                // 🆕 制造战场事件：只现挑子类，没有目标可挑。那道 return 与
                // controlNpcs.push 的先后关系、以及必须排在化形之前的理由，
                // 都与上面施加效果那一档逐字相同
                const eventPlan = BattleEventManager.npcPlan(bm, hero);
                if (!eventPlan) return;
                controlNpcs.push(hero);
                tryBattleEvent(hero, eventPlan.subtype);
            } else if (MythicFormManager.apply(hero, bm.currentRound)) {
                mythicNpcs.push(hero);
                summary.push(`⚡ ${hero.name} 开启了神话生物形态`);
                results.push({
                    kind: 'mythic', actor: hero.name,
                    mythicDescription: MythicFormDescriptionCatalog.descriptionOfHero(hero),
                });
            }
        });

        // 5. 秘偶仲裁：失败的先各自结算，成功的按目标分组抢独占
        this.groupByTarget(marionetteTries).forEach(list => {
            list.filter(a => !a.roll.win)
                .forEach(a => this.applyMarionetteFail(bm, a.caster, a.target, a.roll, summary));

            const wins = list.filter(a => a.roll.win);
            if (!wins.length) return;
            const champ = this.pickWinner(wins);
            wins.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyMarionetteWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 开始秘偶化 ${a.target.name} 前，`
                        + `别人已开始对${a.target.name}的秘偶化，本次不加层${this.contestTail(a.roll)}`);
                }
            });
        });

        // 6. 征服仲裁。排在秘偶之后：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        conquestTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的征服失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(conquestTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyConquestWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功征服 ${a.target.name} 前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 6.5 「心灵」权柄仲裁。排在征服之后、奴役之前：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        mindTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的「心灵」权柄失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(mindTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyMindWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功对 ${a.target.name} 使用「心灵」权柄前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 7. 奴役仲裁。排在「心灵」权柄之后：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        enslaveTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的奴役失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(enslaveTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyEnslaveWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功奴役 ${a.target.name} 前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 8. 驯化仲裁。排在奴役之后：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        tameTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的驯化失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(tameTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyTameWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功驯化 ${a.target.name} 前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 9. 🆕 附身仲裁。刻意排在最后：附身可逆且每回合都要付维持成本，
        //    同回合被永久性的征服 / 奴役 / 驯化顶掉比反过来更合理。
        //    目标若已被转走，会在 arbitrate 里因不再是敌人而落进「抢先转化」
        PossessionManager.arbitrate(bm, possessTries, summary, results);

        // 9.5 🆕 放逐仲裁。排在附身之后、短控之前：放逐比短控重（整段离场且不可打断），
        //     但比永久转化与附身都轻（人还会回来），被那几条顶掉更合理。
        //     目标若已被转走，会在 arbitrate 里落进「抢先处置」
        ExileManager.arbitrate(bm, exileTries, summary, results);

        // 10. 🆕 短控仲裁。排在最末：它只持续一个回合，被永久转化甚至被附身
        //     顶掉都比反过来更合理。目标若已被转走，同样落进「抢先转化」
        TempAllegianceManager.arbitrate(bm, tempTries, summary, results);

        // 10.5 🆕 单体硬控仲裁。内部顺序为偷窃想法 → 恍惚之歌 → 睡美人 → 精神刺穿；
        //       整组仍排在短控之后、心智剥夺之前，继续共享 turnSkip 互斥。
        HardControlManager.arbitrate(bm, hardControlTries, summary, results);

        // 11. 🆕 心智剥夺仲裁。再排到短控之后：它的五档里只有「狂热追随」会转阵营，
        //     且同样只持续一个回合，被前面任何一条顶掉都比反过来更合理。
        //     另外它必须在短控之后才掷档——狂热追随要抢的那条短控过程，
        //     得先让真正的短控把位置占掉，才轮到这里判该不该降级
        MindDepriveManager.arbitrate(bm, mindDepriveTries, summary, results);

        // 12. 🆕 规则修改仲裁。排在最后：前面所有转阵营都已尘埃落定，
        //     「这条规则算谁的」与「敌军单体的目标是不是还是敌人」才判得准。
        //     拼点在发起时就掷完了，所以排序不影响胜负，只决定谁先入栏、谁被挤出去
        RuleChangeManager.arbitrate(bm, ruleChangeTries, summary, results);

        // 13. 🆕 改变环境仲裁。排在规则修改之后、也就是整条管线的最末：环境效果的
        //     符号取决于目标此刻属于哪一边、幅度取决于双方的序列差，前面所有转阵营
        //     （征服 / 秘偶 / 心灵 / 奴役 / 驯化 / 附身 / 短控）都尘埃落定，这两件事才判得准。
        //     arbitrate 只管覆盖入栏、不挂效果，紧随其后的 resync 才按此刻的场面
        //     统一重挂——这样「谁在哪一边」只在一个地方读，不会有半新半旧的效果
        EnvironmentManager.arbitrate(bm, envTries, summary, results);
        EnvironmentManager.resync(bm);

        // 放牧按本战术阶段最终激活组合结算；切换过程只把最终组合写入战报一次。
        if (bm.grazingSwitchFinal) {
            results.push({ kind: 'grazing', stage: 'switch-final', actor: bm.grazingSwitchFinal.actor,
                names: bm.grazingSwitchFinal.names.slice() });
            bm.grazingSwitchFinal = null;
        }
        GrazingBattleManager.upkeep(bm, summary, results);

        // 战术阶段的雷暴、地震等也可能直接击杀画中人；必须在当场判胜负前登记损毁。
        SummonManager.collectPictureDeaths(bm).forEach(row => results.push(row));

        // 转阵营可能导致一方全灭，这里统一查一次
        if (bm.battleState === 'ongoing' && bm.checkBattleEnd()) bm.endBattle();

        const borrowContexts = npcBorrowRecords.concat(playerBorrow ? [playerBorrow.context] : []);
        borrowContexts.forEach(ctx => TacticBorrowReport.finish(bm, ctx, results, summary));
        if (borrowContexts.length) {
            const normalize = text => String(text).replace(/^[✓✗↩⚡✨⏳◈\s]+/, '');
            const logged = new Set(bm.battleLogger.getLogs().map(row => normalize(row.message)));
            summary.forEach(line => {
                const key = normalize(line);
                if (!logged.has(key)) { bm.battleLogger.log(line, 'info'); logged.add(key); }
            });
        }
        const packagedResults = TacticBorrowReport.package(results, borrowContexts);

        const uniq = arr => {
            const seen = new Set();
            const out = [];
            arr.forEach(h => {
                if (!h || seen.has(h.heroId)) return;
                seen.add(h.heroId);
                out.push(h);
            });
            return out;
        };
        return { summary, results: packagedResults, mythicNpcs: uniq(mythicNpcs), controlNpcs: uniq(controlNpcs) };
    },
    arbitrate(bm, groups, summary, results) {
      const { marionetteTries, conquestTries, mindTries, enslaveTries, tameTries } = groups;
      // 5. 秘偶仲裁：失败的先各自结算，成功的按目标分组抢独占
        this.groupByTarget(marionetteTries).forEach(list => {
            list.filter(a => !a.roll.win)
                .forEach(a => this.applyMarionetteFail(bm, a.caster, a.target, a.roll, summary));

            const wins = list.filter(a => a.roll.win);
            if (!wins.length) return;
            const champ = this.pickWinner(wins);
            wins.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyMarionetteWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 开始秘偶化 ${a.target.name} 前，`
                        + `别人已开始对${a.target.name}的秘偶化，本次不加层${this.contestTail(a.roll)}`);
                }
            });
        });

        // 6. 征服仲裁。排在秘偶之后：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        conquestTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的征服失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(conquestTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyConquestWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功征服 ${a.target.name} 前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 6.5 「心灵」权柄仲裁。排在征服之后、奴役之前：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        mindTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的「心灵」权柄失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(mindTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyMindWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功对 ${a.target.name} 使用「心灵」权柄前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 7. 奴役仲裁。排在「心灵」权柄之后：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        enslaveTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的奴役失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(enslaveTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyEnslaveWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功奴役 ${a.target.name} 前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });

        // 8. 驯化仲裁。排在奴役之后：目标若刚被转化走，这里会因不再是敌人而落进「抢先转化」
        tameTries.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的驯化失败${this.contestTail(a.roll)}`);
        });
        this.groupByTarget(tameTries.filter(a => a.roll.win)).forEach(list => {
            const champ = this.pickWinner(list);
            list.forEach(a => {
                if (a === champ && this.isEnemyOf(a.caster, a.target)) {
                    this.applyTameWin(bm, a.caster, a.target, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功驯化 ${a.target.name} 前，`
                        + `目标已被别人抢先转化${this.contestTail(a.roll)}`);
                }
            });
        });
    },
  };
  const EnemyControlManager = deps.useOriginalControl ? OriginalEnemyControlManager : suppliedEnemyControl;

const OriginalPossessionManager = {

    // ---------- 运行期状态 ----------

    ensure(bm) {
        if (!bm.possession) {
            bm.possession = {
                // [{ casterId, targetId, subtype, originTeamType, originController, hostX, hostY }]
                // 同一 casterId 至多一条，这就是「一次最多附身 1 个目标」。
                // 不设 used 集合：附身可以无限次发起，解除后还能再来。
                processes: [],
            };
        }
        return bm.possession;
    },

    findHero(bm, heroId) {
        return EnemyControlManager.findHero(bm, heroId);
    },

    /**
     * 本体是否因附身而离场。**判定一律走这个谓词，不要用 x === null 反推**：
     * SkillRange.inRange 在算不出距离时返回 true，靠坐标反推会让离场的本体
     * 对所有射程的单体技能都「在射程内」，比不隐身更糟。
     */
    isHidden(hero) {
        return !!(hero && hero.possessedHidden);
    },

    subtypes() {
        return [TacticCatalog.POSSESS_PRISONER, TacticCatalog.POSSESS_APPRENTICE];
    },

    // ---------- 资格 ----------

    /**
     * 与 EnemyControlManager.resolveEligibility 同构：称号走 includes，
     * 途径片段走 pathwayShort + 序列门槛，多途径按段合并。
     */
    resolveEligibility(sequenceString) {
        const result = {
            [TacticCatalog.POSSESS_PRISONER]: false,
            [TacticCatalog.POSSESS_APPRENTICE]: false,
        };
        const s = String(sequenceString || '');
        if (s.includes('恶魔之父')) result[TacticCatalog.POSSESS_PRISONER] = true;
        if (s.includes('不熄的呓语')) result[TacticCatalog.POSSESS_APPRENTICE] = true;

        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r) return;
            const rank = Number(r.rank);
            if (r.pathwayShort === '囚犯' && rank <= TacticCatalog.POSSESS_PRISONER_RANK_GATE) {
                result[TacticCatalog.POSSESS_PRISONER] = true;
            }
            if (r.pathwayShort === '入门者' && rank <= TacticCatalog.POSSESS_APPRENTICE_RANK_GATE) {
                result[TacticCatalog.POSSESS_APPRENTICE] = true;
            }
        });
        return result;
    },

    /** 有资格，且当前没有在附身别人（一次最多 1 个目标） */
    canPossess(bm, hero, subtype) {
        if (!hero) return false;
        if (this.processOf(bm, hero.heroId)) return false;
        return !!this.resolveEligibility(hero.sequenceString)[subtype];
    },

    /** 四项资格里至少有一项，且没在附身中——决定「操控敌人」下要不要出附身按钮 */
    hasAnyPossess(bm, hero) {
        return this.subtypes().some(t => this.canPossess(bm, hero, t));
    },

    // ---------- 拼点与消耗口径 ----------

    /**
     * 本次拼点/扣费用哪一项。
     * 怨魂附身恒定灵性；夺舍与附身取当前灵性/人性/理智里最大的一项，
     * 相等时按 POSSESS_APPRENTICE_STATS 的顺序取靠前者（即灵性优先），
     * 与驯化「相等用灵性」的既有约定一致。
     * 每次维持都重算，所以夺舍与附身的扣费项会随属性被削而迁移。
     */
    statKeyOf(hero, subtype) {
        if (subtype !== TacticCatalog.POSSESS_APPRENTICE) return '灵性';
        const s = (hero && hero.additionalStats) || {};
        let bestKey = '灵性';
        let bestVal = -Infinity;
        TacticCatalog.POSSESS_APPRENTICE_STATS.forEach(key => {
            const v = s[`当前${key}`] ?? 0;
            if (v > bestVal) {
                bestVal = v;
                bestKey = key;
            }
        });
        return bestKey;
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    /**
     * 目标方点数。怨魂附身沿用 bestStat（六项最高，与其余能力同口径）；
     * 夺舍与附身只比目标的灵性/人性/理智三项——这一条与全系统其余能力不同，
     * 是刻意的：纯精神体夺舍不需要压过对方的体魄与身法。
     */
    targetStatOf(target, subtype) {
        if (subtype !== TacticCatalog.POSSESS_APPRENTICE) {
            return EnemyControlManager.bestStat(target);
        }
        const s = (target && target.additionalStats) || {};
        return Math.max(...TacticCatalog.POSSESS_APPRENTICE_STATS.map(k => s[`当前${k}`] ?? 0));
    },

    /** 查表固定值，不是当前属性的百分比 */
    costOf(hero, subtype) {
        if (subtype === TacticCatalog.SUMMON_GRAZING) return 0;
        return TacticCatalog.controlStatCost(hero.sequenceRank, this.statKeyOf(hero, subtype));
    },

    /** 先扣再拼，成败都扣。与操控四条同口径 */
    spend(hero, subtype) {
        if (subtype === TacticCatalog.SUMMON_GRAZING) return { key: '灵性', field: '当前灵性', cost: 0 };
        const key = this.statKeyOf(hero, subtype);
        const field = this.fieldOf(key);
        const cost = TacticCatalog.controlStatCost(hero.sequenceRank, key);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    statAfterCost(hero, subtype) {
        const key = this.statKeyOf(hero, subtype);
        const cost = TacticCatalog.controlStatCost(hero.sequenceRank, key);
        return Math.max(0, (hero.additionalStats?.[this.fieldOf(key)] ?? 0) - cost);
    },

    /** 要用的那一项当前值大于 0 才能发起或维持 */
    hasStat(hero, subtype) {
        return (hero?.additionalStats?.[this.fieldOf(this.statKeyOf(hero, subtype))] ?? 0) > 0;
    },

    /** 附身没有劣势修正：不吃 CONTROL_PENALTY，也不吃秘偶那套「上一轮受过伤」 */
    canPossiblyWin(caster, target, subtype) {
        return EnemyControlManager.canPossiblyWin(
            caster, target, 1,
            this.statAfterCost(caster, subtype),
            this.targetStatOf(target, subtype),
        );
    },

    contest(caster, target, subtype, casterStat) {
        return EnemyControlManager.contest(
            caster, target, 1,
            casterStat,
            this.targetStatOf(target, subtype),
        );
    },

    // ---------- 目标池 ----------

    /**
     * 可附身的目标：存活敌方、不是别人离场的本体、且理论上打得赢。
     * 无距离限制，所以必须显式排除隐身本体——这里完全不看坐标。
     */
    possessTargets(bm, caster, subtype) {
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(t =>
            EnemyControlManager.isEnemyOf(caster, t)
            && !this.isHidden(t)
            && this.canPossiblyWin(caster, t, subtype));
    },

    processOf(bm, casterId) {
        if (!bm || !bm.possession) return null;
        return bm.possession.processes.find(p => p.casterId === casterId) || null;
    },

    processOnTarget(bm, targetId) {
        if (!bm || !bm.possession) return null;
        return bm.possession.processes.find(p => p.targetId === targetId) || null;
    },

    /** 这个人正在附身别人吗（本体已离场） */
    isPossessing(bm, hero) {
        return !!(hero && this.processOf(bm, hero.heroId));
    },

    // ---------- 离场与回场 ----------

    /**
     * 本体离场。坐标置空只负责让棋盘、AoE 与地形自然失效
     * （那几处都有 Number.isFinite 守卫），「不可被选中」靠 isHidden 谓词。
     */
    hide(bm, host) {
        if (!host) return;
        if (bm.board) bm.board.remove(host);
        host.x = null;
        host.y = null;
        host.move = 0;
        host.movedThisTurn = true;
        host.possessedHidden = true;
    },

    /**
     * 本体回场。落点三级兜底：候选格 → 候选格周围一圈圈找空格 → 至少写回坐标。
     * 死者不占格，只写坐标：棋盘靠坐标画骷髅，格子要留给活人。
     * @param {Array<{x:number,y:number}>} candidates 优先级从高到低
     */
    restore(bm, host, candidates) {
        if (!host) return;
        host.possessedHidden = false;
        host.possessing = null;

        const board = bm && bm.board;
        const list = (candidates || []).filter(c => c && Number.isFinite(c.x) && Number.isFinite(c.y));
        const fallback = board
            ? { x: Math.floor(board.cols / 2), y: Math.floor(board.rows / 2) }
            : { x: 0, y: 0 };
        const origin = list[0] || fallback;

        const dead = (host.additionalStats?.当前活力 ?? 0) <= 0;
        if (dead || !board) {
            host.x = origin.x;
            host.y = origin.y;
            return;
        }

        for (const c of list) {
            if (board.isFree(c.x, c.y) && board.place(host, c.x, c.y)) return;
        }
        const maxR = Math.max(board.cols, board.rows);
        for (let r = 1; r <= maxR; r++) {
            const ring = board.getOuterRangeCells(origin.x, origin.y, r);
            for (const cell of ring) {
                if (board.isFree(cell.x, cell.y) && board.place(host, cell.x, cell.y)) return;
            }
        }
        // 整盘无空格，理论上到不了这里；至少别让它永远隐身
        host.x = origin.x;
        host.y = origin.y;
    },

    // ---------- 转阵营与还原 ----------

    /**
     * convertTeam 的镜像：把目标挪回附身发生前的阵营并还原操纵者。
     * 那四条永久转化不需要还原，所以现有代码里没有对应实现。
     */
    revertTeam(bm, target, process) {
        const toAlly = process.originTeamType === 'ally';
        const back = toAlly ? bm.allyTeam : bm.enemyTeam;
        const other = toAlly ? bm.enemyTeam : bm.allyTeam;

        const i = other.indexOf(target);
        if (i >= 0) other.splice(i, 1);
        if (!back.includes(target)) back.push(target);

        target.teamType = process.originTeamType;
        target.controller = process.originController || target.dataSource || 'npc';
    },

    // ---------- 发起 ----------

    /**
     * 附身成功。顺序有讲究，不能颠倒：
     *   1) 先读 origin —— convertTeam 马上要改写 teamType 与 controller；
     *   2) 再 convertTeam —— 它内部会作废目标身上**已有的**附身与秘偶过程，
     *      所以必须排在把本条 push 进 processes 之前，否则会把刚建的这条当场解掉；
     *      也必须排在 hide() 之前，坐标置空后距离判定全变 Infinity。
     *   3) 然后 push 过程、挂互指字段、本体离场；
     *   4) 最后中断本体自己的秘偶——它已经离场，不可能再续。
     */
    begin(bm, caster, target, subtype, roll, summary, results) {
        const originTeamType = target.teamType;
        const originController = target.controller;
        const hostX = Number.isFinite(caster.x) ? caster.x : null;
        const hostY = Number.isFinite(caster.y) ? caster.y : null;

        EnemyControlManager.convertTeam(bm, target, caster, summary);

        this.ensure(bm).processes.push({
            casterId: caster.heroId,
            targetId: target.heroId,
            subtype,
            originTeamType,
            originController,
            hostX,
            hostY,
        });

        caster.possessing = target.heroId;
        target.possessedBy = caster.heroId;
        this.hide(bm, caster);
        EnemyControlManager.interruptCaster(bm, caster.heroId, 'invalid', summary);

        summary.push(`✓ ${caster.name} 以${subtype}附身了 ${target.name}，取得其操控权`
            + EnemyControlManager.contestTail(roll));
        results.push({
            kind: 'possess', stage: 'start',
            actor: caster.name, target: target.name, subtype,
        });
    },

    // ---------- 解除 ----------

    RELEASE_TEXT: {
        upkeep: '维持失败',
        manual: '主动解除',
        skip: '未继续',
        hopeless: '已无可能维持',
        'target-dead': '目标已死亡',
        'host-dead': '本体已倒下',
        converted: '目标被他人转化',
        invalid: '条件不再成立',
    },

    /**
     * 解除一条附身：目标还原、本体回场。
     * reason 为 'converted' 时**不还原阵营**——调用方（convertTeam）正要把目标
     * 转给别人，还原一次再被覆盖是多余的，而且会让目标在数组间来回搬。
     * @param {Array} [summary] 传 null 表示调用方已经自己写过文案了
     */
    release(bm, process, reason, summary, results) {
        const state = this.ensure(bm);
        const i = state.processes.indexOf(process);
        if (i >= 0) state.processes.splice(i, 1);

        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);

        if (target) {
            target.possessedBy = null;
            if (reason !== 'converted') this.revertTeam(bm, target, process);
        }

        if (caster) {
            // 优先回到目标脱离的那一格，再退回自己离场前的格子
            const candidates = [];
            if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
                candidates.push({ x: target.x, y: target.y });
            }
            if (Number.isFinite(process.hostX) && Number.isFinite(process.hostY)) {
                candidates.push({ x: process.hostX, y: process.hostY });
            }
            this.restore(bm, caster, candidates);
        }

        const tail = this.RELEASE_TEXT[reason] || '中断';
        if (summary && caster && target) {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的${process.subtype}解除（${tail}）`);
        }
        if (results && caster && target) {
            results.push({
                kind: 'possess', stage: 'end',
                actor: caster.name, target: target.name, subtype: process.subtype,
            });
        }
    },

    /** 给 convertTeam 的钩子用：目标身上若挂着附身，随转阵营一并作废 */
    releaseOnTarget(bm, target, reason, summary) {
        if (!bm || !target || !bm.possession) return;
        const p = this.processOnTarget(bm, target.heroId);
        if (p) this.release(bm, p, reason || 'invalid', summary, null);
    },

    releaseByCaster(bm, casterId, reason, summary, results) {
        const p = this.processOf(bm, casterId);
        if (!p) return false;
        this.release(bm, p, reason, summary, results);
        return true;
    },

    // ---------- 维持 ----------

    /**
     * 还能不能继续维持。
     * hopeless 与其余原因分开：NPC 必输时主动解除而不是白扣属性，
     * 玩家侧则把「继续附身」按钮置灰、只留解除。
     */
    canContinue(bm, process) {
        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);
        if (!caster || !TacticResolver.alive(caster)) return { ok: false, reason: 'host-dead', caster, target };
        if (!target || !TacticResolver.alive(target)) return { ok: false, reason: 'target-dead', caster, target };
        if (!this.resolveEligibility(caster.sequenceString)[process.subtype]) return { ok: false, reason: 'invalid', caster, target };
        if (!this.hasStat(caster, process.subtype)) return { ok: false, reason: 'invalid', caster, target };
        if (!this.canPossiblyWin(caster, target, process.subtype)) return { ok: false, reason: 'hopeless', caster, target };
        return { ok: true, caster, target };
    },

    /**
     * 一次维持拼点。先扣再拼、成败都扣，与操控四条同口径。
     * 失败即解除——附身没有层数，不存在秘偶那样的回落。
     * 维持成功刻意**不写战报**（只进结果页）：每回合刷一行会把战报冲淡。
     * @returns {boolean} 是否维持住
     */
    upkeep(bm, process, summary, results) {
        const caster = this.findHero(bm, process.casterId);
        const target = this.findHero(bm, process.targetId);
        if (!caster || !target) {
            this.release(bm, process, 'invalid', summary, results);
            return false;
        }

        const spent = this.spend(caster, process.subtype);
        const roll = this.contest(
            caster, target, process.subtype,
            caster.additionalStats[spent.field] ?? 0,
        );
        const tail = EnemyControlManager.contestTail(roll);

        if (roll.win) {
            summary.push(`✓ ${caster.name} 维持了对 ${target.name} 的${process.subtype}`
                + `（消耗${spent.key} ${spent.cost}）${tail}`);
            return true;
        }
        summary.push(`✗ ${caster.name} 对 ${target.name} 的${process.subtype}维持失败，附身解除${tail}`);
        this.release(bm, process, 'upkeep', null, results);
        return false;
    },

    /**
     * 扫一遍进行中的附身，把目标已死或本体已死的解掉。
     * 挂在 syncBoardOccupancy 末尾（行动回合每次出手后都会走到），
     * 并由 renderCurrentTurn 在效果结算之后补一次——否则持续伤害打死目标
     * 要等到下一个人行动才回场。
     * @returns {Array<string>} 解除文案，调用方可写进战斗日志
     */
    checkRelease(bm) {
        if (!bm || !bm.possession) return [];
        const lines = [];
        bm.possession.processes.slice().forEach(p => {
            const caster = this.findHero(bm, p.casterId);
            const target = this.findHero(bm, p.targetId);
            if (!caster || !TacticResolver.alive(caster)) {
                this.release(bm, p, 'host-dead', lines, null);
                return;
            }
            if (!target || !TacticResolver.alive(target)) {
                this.release(bm, p, 'target-dead', lines, null);
            }
        });
        return lines;
    },

    // ---------- 仲裁 ----------

    /**
     * 附身发起仲裁。排在秘偶/征服/「心灵」权柄/奴役/驯化**之后**：附身可逆且有维持成本，
     * 被永久转化顶掉比反过来更合理。目标若已被转走，这里会因不再是敌人而
     * 落进「抢先转化」。
     */
    arbitrate(bm, attempts, summary, results) {
        if (!attempts || attempts.length === 0) return;

        attempts.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 对 ${a.target.name} 的${a.subtype}失败`
                + EnemyControlManager.contestTail(a.roll));
        });

        EnemyControlManager.groupByTarget(attempts.filter(a => a.roll.win)).forEach(list => {
            const champ = EnemyControlManager.pickWinner(list);
            list.forEach(a => {
                const stillFoe = EnemyControlManager.isEnemyOf(a.caster, a.target);
                // 本体已经被别人附身走的，这一轮也不能再发起
                const casterOk = TacticResolver.alive(a.caster) && !this.isHidden(a.caster);
                if (a === champ && stillFoe && casterOk) {
                    this.begin(bm, a.caster, a.target, a.subtype, a.roll, summary, results);
                } else {
                    summary.push(`✗ ${a.caster.name} 成功${a.subtype} ${a.target.name} 前，`
                        + `目标已被别人抢先转化${EnemyControlManager.contestTail(a.roll)}`);
                }
            });
        });
    },
};

const PossessionManager = deps.useOriginalPossession ? OriginalPossessionManager : suppliedPossession;

const BattleFormulaEngine = {
    MAX_FINITE: Number.MAX_SAFE_INTEGER,
    SOURCE_LABELS: Object.freeze({
        constant1: '常数 1', divinity: '神性',
        currentVitality: '当前活力', currentAgility: '当前敏捷', currentSpirit: '当前灵性',
        currentSanity: '当前理智', currentHumanity: '当前人性', luck: '运气',
        maxVitality: '活力上限', maxAgility: '敏捷上限', maxSpirit: '灵性上限',
        maxSanity: '理智上限', maxHumanity: '人性上限',
        maxCurrent: '当前六项最高值', minCurrent: '当前六项最低值', avgCurrent: '当前六项平均值',
        maxMaximum: '六项上限最高值', minMaximum: '六项上限最低值', avgMaximum: '六项上限平均值',
        physicalPair: '当前活力与敏捷平均', mentalPair: '当前理智与人性平均',
        derivedAttack: '派生攻击力', derivedDefense: '派生防御力'
    }),
    FAMILY_LABELS: Object.freeze({
        attack: '攻击计算', defense: '防御计算', modifiers: 'BUFF/DEBUFF计算',
        damage: '普通技能伤害', accuracyDamage: '命中率武器伤害', accuracy: '命中率',
        healing: '治疗', initiative: '先攻', movement: '移动力'
    }),
    atoms: {},
    constraintGroups: [
        ['damage.randomMin', 'damage.randomMax'],
        ['accuracyDamage.randomMin', 'accuracyDamage.randomMax'],
        ['accuracy.minChance', 'accuracy.maxChance'],
        ['damage.tagMin', 'damage.tagMax'],
        ['healing.tagMin', 'healing.tagMax'],
        ['healing.randomMin', 'healing.randomMax'],
        ['initiative.randomMin', 'initiative.randomMax'],
        ['movement.min', 'movement.max']
    ],

    addNumber(id, family, label, defaultValue, min, max, step = 0.05) {
        this.atoms[id] = { id, family, label, type: 'number', defaultValue, min, max, step };
    },
    addEnum(id, family, label, defaultValue, options) {
        this.atoms[id] = { id, family, label, type: 'enum', defaultValue, options: { ...options } };
    },
    addSource(id, family, label, defaultValue, allowDerived = false) {
        const options = { ...this.SOURCE_LABELS };
        if (!allowDerived) { delete options.derivedAttack; delete options.derivedDefense; }
        this.atoms[id] = { id, family, label, type: 'source', defaultValue, options };
    },
    initCatalog() {
        if (Object.keys(this.atoms).length) return;
        const sourceDefaults = { physical: 'physicalPair', mystical: 'currentSpirit', mental: 'mentalPair', mixed: 'luck' };
        ['attack', 'defense'].forEach(kind => {
            Object.entries(sourceDefaults).forEach(([damageType, source]) =>
                this.addSource(`${kind}.${damageType}Source`, kind, `${({physical:'物理',mystical:'神秘',mental:'精神',mixed:'混合'})[damageType]}专项来源`, source));
            this.addSource(`${kind}.referenceSource`, kind, '第二基准来源', 'maxCurrent');
            this.addNumber(`${kind}.specificWeight`, kind, '专项权重', 0.4, 0, 2);
            this.addNumber(`${kind}.referenceWeight`, kind, '第二基准权重', 0.6, 0, 2);
            this.addEnum(`${kind}.combine`, kind, '两项连接方式', 'add', { add: '相加', subtract: '前项减后项' });
            this.addEnum(`${kind}.rounding`, kind, '派生值取整', 'floor', { floor: '向下取整', round: '四舍五入', ceil: '向上取整' });
        });
        ['attack', 'defense', 'speed'].forEach(stat => {
            const name = { attack:'攻击', defense:'防御', speed:'速度' }[stat];
            this.addEnum(`modifiers.${stat}Percentage`, 'modifiers', `${name}百分比方向`, 'normal', { normal:'正常', reversed:'反转' });
            this.addEnum(`modifiers.${stat}Fixed`, 'modifiers', `${name}固定值方向`, 'normal', { normal:'正常', reversed:'反转' });
            this.addEnum(`modifiers.${stat}Order`, 'modifiers', `${name}修正顺序`, 'percentThenFixed', { percentThenFixed:'先百分比后固定值', fixedThenPercent:'先固定值后百分比' });
        });

        this.addSource('damage.attackSource', 'damage', '攻击操作数来源', 'derivedAttack', true);
        this.addSource('damage.defenseSource', 'damage', '防御操作数来源', 'derivedDefense', true);
        this.addEnum('damage.ratioDirection', 'damage', '攻防比方向', 'attackOverDefense', { attackOverDefense:'攻击÷防御', defenseOverAttack:'防御÷攻击' });
        this.addNumber('damage.ratioExponent', 'damage', '攻防比指数', 1, 0, 2);
        this.addEnum('damage.divinitySource', 'damage', '神性来源', 'divinity', { divinity:'攻击者神性', constant1:'常数 1' });
        this.addNumber('damage.divinityExponent', 'damage', '神性指数', 1, 0, 2);
        this.addNumber('damage.powerScale', 'damage', '技能威力系数', 1, 0, 2);
        this.addNumber('damage.powerExponent', 'damage', '技能威力指数', 1, 0, 1);
        this.addEnum('damage.randomMode', 'damage', '伤害随机模式', 'uniform', { uniform:'均匀随机', none:'取消随机' });
        this.addNumber('damage.randomMin', 'damage', '伤害随机下界', 0.9, 0, 2);
        this.addNumber('damage.randomMax', 'damage', '伤害随机上界', 1.1, 0, 2);
        this.addEnum('damage.modifierMode', 'damage', '伤害修正合并', 'additive', { additive:'加算', multiplicative:'独立乘算', maxAbs:'只取绝对值最大项' });
        this.addEnum('damage.punishmentMode', 'damage', '惩戒参与方式', 'final', { final:'独立最终乘区', merged:'并入普通修正', ignore:'忽略惩戒' });
        this.addNumber('damage.tagMin', 'damage', '标签修正下限', -0.75, -1, 0, 0.05);
        this.addNumber('damage.tagMax', 'damage', '标签修正上限', 1.5, 0, 3, 0.05);
        this.addEnum('damage.rounding', 'damage', '最终伤害取整', 'floor', { floor:'向下取整', round:'四舍五入', ceil:'向上取整' });

        this.addSource('accuracyDamage.attackSource', 'accuracyDamage', '枪械攻击操作数来源', 'derivedAttack', true);
        this.addSource('accuracyDamage.defenseSource', 'accuracyDamage', '枪械防御操作数来源', 'derivedDefense', true);
        this.addNumber('accuracyDamage.fixedScale', 'accuracyDamage', '固定伤害系数', 1, 0, 2);
        this.addEnum('accuracyDamage.ratioDirection', 'accuracyDamage', '枪械攻防比方向', 'attackOverDefense', { attackOverDefense:'攻击÷防御', defenseOverAttack:'防御÷攻击' });
        this.addNumber('accuracyDamage.ratioExponent', 'accuracyDamage', '枪械攻防比指数', 0, 0, 2);
        this.addNumber('accuracyDamage.divinityExponent', 'accuracyDamage', '枪械神性指数', 1, 0, 2);
        this.addEnum('accuracyDamage.randomMode', 'accuracyDamage', '枪械伤害随机模式', 'uniform', { uniform:'均匀随机', none:'取消随机' });
        this.addNumber('accuracyDamage.randomMin', 'accuracyDamage', '枪械随机下界', 0.9, 0, 2);
        this.addNumber('accuracyDamage.randomMax', 'accuracyDamage', '枪械随机上界', 1.1, 0, 2);
        this.addEnum('accuracyDamage.modifierMode', 'accuracyDamage', '枪械修正合并', 'additive', { additive:'加算', multiplicative:'独立乘算', maxAbs:'只取绝对值最大项' });
        this.addEnum('accuracyDamage.punishmentMode', 'accuracyDamage', '枪械惩戒参与', 'final', { final:'独立最终乘区', merged:'并入普通修正', ignore:'忽略惩戒' });
        this.addEnum('accuracyDamage.rounding', 'accuracyDamage', '枪械伤害取整', 'floor', { floor:'向下取整', round:'四舍五入', ceil:'向上取整' });

        this.addSource('accuracy.attackerSource', 'accuracy', '命中攻方来源', 'currentAgility', true);
        this.addSource('accuracy.defenderSource', 'accuracy', '命中守方来源', 'maxCurrent', true);
        this.addEnum('accuracy.direction', 'accuracy', '命中比值方向', 'attacker', { attacker:'攻方占分子', defender:'守方占分子' });
        this.addNumber('accuracy.curveExponent', 'accuracy', '命中曲线指数', 1, 0, 2);
        this.addNumber('accuracy.contestMultiplier', 'accuracy', '途径拼点优势倍率', 1.2, 0, 3);
        this.addNumber('accuracy.coefShotgun', 'accuracy', '霰弹枪精度系数', 1.2, 0, 4);
        this.addNumber('accuracy.coefPistol', 'accuracy', '手枪精度系数', 1.6, 0, 4);
        this.addNumber('accuracy.coefRifle', 'accuracy', '步枪精度系数', 2.0, 0, 4);
        this.addNumber('accuracy.coefSniper', 'accuracy', '狙击枪精度系数', 2.4, 0, 4);
        this.addNumber('accuracy.distanceDecay', 'accuracy', '距离衰减', 0.4, 0, 1);
        this.addNumber('accuracy.minChance', 'accuracy', '最低命中率', 0.05, 0, 1, 0.01);
        this.addNumber('accuracy.maxChance', 'accuracy', '最高命中率', 0.95, 0, 1, 0.01);

        this.addEnum('healing.basis', 'healing', '百分比治疗基准', 'targetMax', { targetMax:'目标属性上限', targetMissing:'目标已损失值', healerMax:'施法者属性上限', healerCurrent:'施法者当前值', targetCurrent:'目标当前值' });
        this.addEnum('healing.fixedMode', 'healing', '固定治疗解释', 'raw', { raw:'使用原固定值', scaled:'固定值乘治疗基准' });
        this.addNumber('healing.scale', 'healing', '总治疗系数', 1, 0, 2);
        this.addEnum('healing.modifierMode', 'healing', '标签治疗修正合并', 'additive', { additive:'加算', multiplicative:'独立乘算', maxAbs:'只取绝对值最大项' });
        this.addNumber('healing.tagMin', 'healing', '治疗标签下限', -0.75, -1, 0, 0.05);
        this.addNumber('healing.tagMax', 'healing', '治疗标签上限', 1.5, 0, 3, 0.05);
        this.addEnum('healing.randomMode', 'healing', '治疗随机模式', 'none', { none:'无随机', uniform:'均匀随机' });
        this.addNumber('healing.randomMin', 'healing', '治疗随机下界', 0.9, 0, 2);
        this.addNumber('healing.randomMax', 'healing', '治疗随机上界', 1.1, 0, 2);
        this.addEnum('healing.rounding', 'healing', '治疗取整', 'floor', { floor:'向下取整', round:'四舍五入', ceil:'向上取整' });

        this.addSource('initiative.source', 'initiative', '先攻基础来源', 'currentAgility', false);
        this.addEnum('initiative.useSpeedEffects', 'initiative', '读取速度效果', 'yes', { yes:'读取', no:'忽略' });
        this.addEnum('initiative.randomMode', 'initiative', '先攻随机模式', 'uniform', { uniform:'均匀随机', none:'无随机' });
        this.addNumber('initiative.randomMin', 'initiative', '先攻随机下界', 0.9, 0, 2);
        this.addNumber('initiative.randomMax', 'initiative', '先攻随机上界', 1.1, 0, 2);
        this.addEnum('initiative.direction', 'initiative', '先攻排序方向', 'highFirst', { highFirst:'高值先动', lowFirst:'低值先动' });
        this.addEnum('initiative.tie', 'initiative', '同值顺序', 'random', { random:'随机', stable:'保持原队列' });

        this.addNumber('movement.base', 'movement', '基础移动力', 4, 0, 12, 1);
        this.addNumber('movement.seqLow', 'movement', '普通人及序列9～7加成', 0, 0, 12, 1);
        this.addNumber('movement.seqMid', 'movement', '序列6～3加成', 1, 0, 12, 1);
        this.addNumber('movement.seqHigh', 'movement', '序列2及以上加成', 2, 0, 12, 1);
        this.addEnum('movement.seqDirection', 'movement', '序列加成方向', 'add', { add:'相加', subtract:'相减' });
        this.addSource('movement.relativeSource', 'movement', '相对属性来源', 'currentAgility', false);
        this.addNumber('movement.curveCoefficient', 'movement', '相对属性曲线系数', 2, 0, 4);
        this.addEnum('movement.relativeDirection', 'movement', '相对属性加成方向', 'add', { add:'相加', subtract:'相减' });
        this.addNumber('movement.min', 'movement', '最低移动力', 3, 0, 12, 1);
        this.addNumber('movement.max', 'movement', '最高移动力', 7, 0, 12, 1);
        this.addEnum('movement.rounding', 'movement', '移动力取整', 'round', { floor:'向下取整', round:'四舍五入', ceil:'向上取整' });
        this.addEnum('movement.order', 'movement', '移动修正顺序', 'default', { default:'当前顺序', preClamp:'全部修正后再做上下限', postClamp:'基础上下限后不再受上限约束' });
    },

    ensure(bm) {
        if (!bm) return { laws: [], serial: 0, pendingLines: [], pendingResults: [] };
        if (!bm.fundamentalRules) bm.fundamentalRules = { laws: [], serial: 0, pendingLines: [], pendingResults: [] };
        const st = bm.fundamentalRules;
        if (!Array.isArray(st.laws)) st.laws = [];
        if (!Array.isArray(st.pendingLines)) st.pendingLines = [];
        if (!Array.isArray(st.pendingResults)) st.pendingResults = [];
        return st;
    },
    definition(id) { this.initCatalog(); return this.atoms[id] || null; },
    finite(value, fallback = 0) {
        const n = Number(value);
        if (Number.isNaN(n)) return Number(fallback) || 0;
        if (n === Infinity) return this.MAX_FINITE;
        if (n === -Infinity) return -this.MAX_FINITE;
        return Math.max(-this.MAX_FINITE, Math.min(this.MAX_FINITE, n));
    },
    clamp(value, min, max) { return Math.max(min, Math.min(max, this.finite(value))); },
    safeDiv(a, b) { return this.finite(a) / Math.max(1, Math.abs(this.finite(b))); },
    safePow(base, exponent) {
        const out = Math.pow(Math.max(0, this.finite(base)), this.finite(exponent, 1));
        return this.finite(out, this.MAX_FINITE);
    },
    round(value, mode = 'floor') {
        const n = this.finite(value);
        return mode === 'ceil' ? Math.ceil(n) : (mode === 'round' ? Math.round(n) : Math.floor(n));
    },
    randomFactor(mode, min, max) {
        if (mode === 'none') return 1;
        const lo = this.finite(min, 1), hi = this.finite(max, 1);
        return lo + Math.random() * Math.max(0, hi - lo);
    },
    validateValue(id, value) {
        const def = this.definition(id);
        if (!def) return { ok: false, error: '未知公式原子' };
        if (def.type === 'number') {
            if (String(value ?? '').trim() === '') return { ok: false, error: '必须填写数值' };
            const n = Number(value);
            if (!Number.isFinite(n) || n < def.min || n > def.max) return { ok: false, error: `必须在 ${def.min}～${def.max} 之间` };
            const step = Number(def.step);
            if (Number.isFinite(step) && step > 0) {
                const base = Number.isFinite(Number(def.min)) ? Number(def.min) : 0;
                const units = (n - base) / step;
                const tolerance = 1e-9 * Math.max(1, Math.abs(units));
                if (Math.abs(units - Math.round(units)) > tolerance) {
                    return { ok: false, error: `必须按 ${step} 的步长填写` };
                }
            }
            return { ok: true, value: n };
        }
        if (!Object.prototype.hasOwnProperty.call(def.options || {}, String(value))) return { ok: false, error: '不在允许选项内' };
        return { ok: true, value: String(value) };
    },
    heroOf(bm, heroId) {
        return bm && bm.teamManager ? bm.teamManager.getAllHeroes().find(h => h && h.heroId === heroId) || null : null;
    },
    isLawActive(bm, law) {
        if (!law || law.removed) return false;
        const round = Number(bm && bm.currentRound) || 0;
        if (round < Number(law.startRound) || round > Number(law.endRound)) return false;
        const hero = this.heroOf(bm, law.sourceHeroId);
        return !!hero && (hero.additionalStats?.当前活力 ?? 0) > 0;
    },
    candidates(bm, id, opts = {}) {
        const def = this.definition(id);
        if (!def) return [];
        const excludeLawId = opts.excludeLawId || '';
        const extraLaw = opts.extraLaw || null;
        const laws = this.ensure(bm).laws.filter(law => law.id !== excludeLawId).slice();
        if (extraLaw) laws.push(extraLaw);
        const out = [];
        laws.forEach(law => {
            const active = extraLaw === law ? true : this.isLawActive(bm, law);
            if (!active) return;
            const mutation = (law.mutations || []).find(m => m.atomId === id);
            if (!mutation) return;
            out.push({ value: mutation.value, law, serial: Number(law.serial) || 0, default: false });
        });
        out.sort((a, b) => b.serial - a.serial);
        out.push({ value: def.defaultValue, law: null, serial: -1, default: true });
        return out;
    },
    constraintGroup(id) { return this.constraintGroups.find(g => g.includes(id)) || null; },
    resolvedGroup(bm, group, opts = {}) {
        const lists = Object.fromEntries(group.map(id => [id, this.candidates(bm, id, opts)]));
        const indexes = Object.fromEntries(group.map(id => [id, 0]));
        const suppressed = [];
        const valid = values => {
            if (group.length !== 2) return true;
            return Number(values[group[0]]) <= Number(values[group[1]]);
        };
        for (let guard = 0; guard < 64; guard++) {
            const picks = Object.fromEntries(group.map(id => [id, lists[id][indexes[id]] || lists[id][lists[id].length - 1]]));
            const values = Object.fromEntries(group.map(id => [id, picks[id].value]));
            if (valid(values)) return { picks, suppressed };
            const movable = group.map(id => ({ id, pick: picks[id] }))
                .filter(x => !x.pick.default && indexes[x.id] < lists[x.id].length - 1)
                .sort((a, b) => b.pick.serial - a.pick.serial);
            if (!movable.length) return { picks, suppressed };
            const victim = movable[0];
            suppressed.push({ atomId: victim.id, layer: victim.pick });
            indexes[victim.id]++;
        }
        return { picks: {}, suppressed };
    },
    resolve(bm, id, opts = {}) {
        const group = this.constraintGroup(id);
        if (group) {
            const resolved = this.resolvedGroup(bm, group, opts);
            const pick = resolved.picks[id] || this.candidates(bm, id, opts).slice(-1)[0];
            return { ...pick, suppressed: resolved.suppressed };
        }
        const pick = this.candidates(bm, id, opts)[0];
        return { ...pick, suppressed: [] };
    },
    value(bm, id, opts = {}) {
        const r = this.resolve(bm, id, opts);
        return r ? r.value : this.definition(id)?.defaultValue;
    },
    sourceValue(sourceId, ctx = {}) {
        if (sourceId === 'constant1') return 1;
        const hero = ctx.hero || ctx.attacker || ctx.healer || ctx.target || ctx.defender;
        const s = (hero && hero.additionalStats) || {};
        const current = [s.当前活力, s.当前敏捷, s.当前灵性, s.当前理智, s.当前人性, s.运气].map(v => this.finite(v));
        const maximum = [s.活力, s.敏捷, s.灵性, s.理智, s.人性, s.运气].map(v => this.finite(v));
        const map = {
            divinity: s.神性, currentVitality: s.当前活力, currentAgility: s.当前敏捷,
            currentSpirit: s.当前灵性, currentSanity: s.当前理智, currentHumanity: s.当前人性,
            luck: s.运气, maxVitality: s.活力, maxAgility: s.敏捷, maxSpirit: s.灵性,
            maxSanity: s.理智, maxHumanity: s.人性,
            maxCurrent: Math.max(...current), minCurrent: Math.min(...current), avgCurrent: current.reduce((a,b)=>a+b,0) / current.length,
            maxMaximum: Math.max(...maximum), minMaximum: Math.min(...maximum), avgMaximum: maximum.reduce((a,b)=>a+b,0) / maximum.length,
            physicalPair: (this.finite(s.当前活力) + this.finite(s.当前敏捷)) / 2,
            mentalPair: (this.finite(s.当前理智) + this.finite(s.当前人性)) / 2,
            derivedAttack: ctx.attack,
            derivedDefense: ctx.defense
        };
        return this.finite(map[sourceId], 0);
    },
    source(bm, atomId, ctx = {}, opts = {}) {
        return this.sourceValue(this.value(bm, atomId, opts), ctx);
    },
    modifierFactor(mode, values) {
        const nums = (values || []).map(v => this.finite(v));
        if (mode === 'multiplicative') return nums.reduce((p, v) => p * Math.max(0, 1 + v), 1);
        if (mode === 'maxAbs') {
            const chosen = nums.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0);
            return Math.max(0, 1 + chosen);
        }
        return Math.max(0, 1 + nums.reduce((a, b) => a + b, 0));
    },
    formatValue(id, value) {
        const def = this.definition(id);
        if (!def) return String(value);
        if (def.type === 'number') return String(Number(value));
        return (def.options && def.options[value]) || String(value);
    }
};
BattleFormulaEngine.initCatalog();

const FundamentalRuleManager = {
    ACTION: '底层规则修改',
    EDICT: '仲裁人律令',
    SIX_STATS: ['活力', '敏捷', '灵性', '理智', '人性', '运气'],
    SUBTYPES: {
        篡改规则: {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 4, name: '篡改规则' }],
            description: '能划出一片区域，篡改、增加或利用一定的规则',
            atomPolicy: 'all',
            profiles: [
                { gate: -1, maxAtoms: 4, durations: { 1: 20, 2: 15, 3: 10, 4: 5 } },
                { gate: 0, maxAtoms: 4, durations: { 1: 20, 2: 15, 3: 10, 4: 5 } },
                { gate: 2, maxAtoms: 3, durations: { 1: 20, 2: 15, 3: 10 } },
                { gate: 4, maxAtoms: 2, durations: { 1: 20, 2: 15 } },
            ],
            cost: { stat: '灵性', ratio: 0.07 },
            casterStats: 'all',
        },
        仲裁人律令: {
            pathway: '仲裁人', title: '失序者', titleRank: -1,
            names: [{ gate: 1, name: '“秩序”权柄' }, { gate: 4, name: '律令' }],
            description: ({ rank }) => Number(rank) <= 1
                ? '能在一定程度上修改世界的底层规则。'
                : '能制定宽泛的限制，并维持一段时间。',
            atomPolicy: 'all',
            profiles: [
                { gate: -1, maxAtoms: 4, durations: { 1: 20, 2: 15, 3: 10, 4: 5 } },
                { gate: 0, maxAtoms: 3, durations: { 1: 20, 2: 15, 3: 10 } },
                { gate: 2, maxAtoms: 2, durations: { 1: 20, 2: 15 } },
                { gate: 4, maxAtoms: 1, durations: { 1: 20 } },
            ],
            cost: { stat: '灵性', ratio: 0.05 },
            casterStats: 'all',
        },
        嫁接: {
            pathway: '占卜家', title: '诡秘之主', titleRank: -2,
            names: [{ gate: 1, name: '嫁接' }],
            description: '将许多正常情况下无法产生直接联系的实体事物或抽象概念重新组合在一起，达成不可思议的效果，就像在篡改定义、逻辑、指向或规则。',
            atomPolicy: 'all',
            profiles: [{ gate: 1, maxAtoms: 1, durations: { 1: 20 } }],
            cost: { stat: '灵性', ratio: 0.07 },
            casterStats: ['灵性'],
        },
        欺诈权柄: {
            pathway: '偷盗者', title: '诡秘之主', titleRank: -2,
            names: [{ gate: 0, name: '“欺诈”权柄' }],
            description: '欺诈规则',
            atomPolicy: 'all',
            profiles: [{ gate: 0, maxAtoms: 2, durations: { 1: 10, 2: 5 } }],
            cost: { stat: '灵性', ratio: 0.07 },
            casterStats: ['灵性'],
        },
        阅读者规律: {
            pathway: '阅读者', title: '上帝', titleRank: -2,
            names: [{ gate: 1, name: '部分“规律”权柄' }, { gate: 3, name: '撬动规律' }],
            description: '知晓规律，掌握规律，利用规律。',
            atomPolicy: 'reader-laws',
            profiles: [
                { gate: 1, maxAtoms: 2, durations: { 1: 15, 2: 8 } },
                { gate: 3, maxAtoms: 1, durations: { 1: 15 } },
            ],
            cost: { stat: '理智', ratio: 0.06 },
            casterStats: ['理智', '灵性'],
        },
        修改权柄: {
            pathway: '窥秘人', title: '知识之妖', titleRank: -1,
            names: [{ gate: 2, name: '“修改”权柄' }],
            description: '利用权柄修改规则',
            atomPolicy: 'all',
            profiles: [{ gate: 2, maxAtoms: 1, durations: { 1: 20 } }],
            cost: { stat: '灵性', ratio: 0.07 },
            casterStats: ['灵性'],
        },
        规律权柄: {
            pathway: '通识者', title: '知识之妖', titleRank: -1,
            names: [{ gate: 2, name: '“规律”权柄' }],
            description: '能对物理规律进行一定程度的改变',
            atomPolicy: 'savant-physical',
            profiles: [{ gate: 2, maxAtoms: 3, durations: { 1: 12, 2: 8, 3: 5 } }],
            cost: { stat: '灵性', ratio: 0.07 },
            casterStats: ['灵性', '理智'],
        },
        规则之弦: {
            pathway: '萨满', title: '高维俯视者', titleRank: -1,
            names: [{ gate: 3, name: '规则之弦' }],
            description: '通过掌控弦改变现实规则',
            atomPolicy: 'all',
            profiles: [{ gate: 3, maxAtoms: 1, durations: { 1: 20 } }],
            cost: { stat: '灵性', ratio: 0.07 },
            casterStats: ['灵性'],
        },
    },

    subtypes() { return Object.keys(this.SUBTYPES); },
    cfgOf(subtype) { return this.SUBTYPES[subtype] || null; },

    eligibilities(hero) {
        return AbilityAlias.resolve(hero && hero.sequenceString, this.SUBTYPES);
    },
    eligibility(hero, subtype = this.EDICT) {
        return this.eligibilities(hero)[subtype]
            || { ok: false, rank: null, name: '' };
    },
    eligible(hero) {
        return Object.values(this.eligibilities(hero)).some(entry => entry && entry.ok);
    },
    availableSubtypes(hero) {
        const entries = this.eligibilities(hero);
        return this.subtypes().filter(subtype => entries[subtype] && entries[subtype].ok);
    },
    edictEligible(hero) { return !!this.eligibility(hero, this.EDICT).ok; },
    displayName(hero, subtype = this.EDICT) {
        const e = this.eligibility(hero, subtype);
        if (e.ok && e.name) return e.name;
        const cfg = this.cfgOf(subtype);
        return cfg ? AbilityAlias.nameOf(cfg, subtype, AbilityAlias.titleRankOf(cfg)) : String(subtype || '底层规则修改');
    },
    description(hero, subtype = this.EDICT) {
        const cfg = this.cfgOf(subtype);
        const e = this.eligibility(hero, subtype);
        if (!cfg) return '';
        return typeof cfg.description === 'function'
            ? cfg.description({ hero, rank: e.rank, name: e.name })
            : String(cfg.description || '修改战场的底层规则。');
    },
    profileOf(hero, subtype = this.EDICT) {
        const cfg = this.cfgOf(subtype);
        const rank = Number(this.eligibility(hero, subtype).rank);
        if (!cfg || !Number.isFinite(rank)) return null;
        return (cfg.profiles || []).find(profile => rank <= Number(profile.gate)) || null;
    },
    maxAtoms(hero, subtype = this.EDICT) {
        return Number(this.profileOf(hero, subtype)?.maxAtoms) || 0;
    },
    durationOf(hero, subtype, count) {
        return Number(this.profileOf(hero, subtype)?.durations?.[count]) || 0;
    },
    costStatOf(subtype) { return this.cfgOf(subtype)?.cost?.stat || '灵性'; },
    costFieldOf(subtype) { return `当前${this.costStatOf(subtype)}`; },
    costOf(hero, subtype, count) {
        const cfg = this.cfgOf(subtype);
        if (!cfg) return 0;
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero && hero.sequenceRank);
        const base = Number(attrs && attrs[this.costStatOf(subtype)]) || 0;
        return Math.max(1, Math.round(base * Number(cfg.cost?.ratio || 0) * Math.max(1, Number(count) || 1)));
    },
    atomAllowed(subtype, atomOrId) {
        const def = typeof atomOrId === 'string' ? BattleFormulaEngine.definition(atomOrId) : atomOrId;
        if (!def) return false;
        const policy = this.cfgOf(subtype)?.atomPolicy || 'all';
        if (policy === 'all') return true;
        if (policy === 'reader-laws') {
            const families = ['attack', 'defense', 'modifiers', 'damage', 'accuracyDamage', 'accuracy', 'healing', 'movement'];
            return families.includes(def.family)
                && !String(def.id).includes('.random')
                && !String(def.id).endsWith('.rounding');
        }
        if (policy === 'savant-physical') {
            if (['accuracyDamage', 'accuracy', 'initiative', 'movement'].includes(def.family)) return true;
            if (def.family !== 'attack' && def.family !== 'defense') return false;
            const suffix = String(def.id).slice(String(def.id).indexOf('.') + 1);
            return ['physicalSource', 'referenceSource', 'specificWeight', 'referenceWeight', 'combine', 'rounding'].includes(suffix);
        }
        return false;
    },
    allowedAtoms(subtype) {
        return Object.values(BattleFormulaEngine.atoms).filter(atom => this.atomAllowed(subtype, atom));
    },
    activeLawOf(bm, heroOrId) {
        const id = typeof heroOrId === 'string' ? heroOrId : heroOrId && heroOrId.heroId;
        return BattleFormulaEngine.ensure(bm).laws.find(l => !l.removed && l.sourceHeroId === id) || null;
    },
    sanitizeReportText(text) {
        return Array.from(String(text || '').replace(/\s+/g, ' ').trim()).slice(0, 50).join('');
    },
    sanitizeMutations(hero, subtype, raw) {
        if (!this.eligibility(hero, subtype).ok) return { ok: false, error: '当前不具备这项底层规则修改资格。' };
        const max = this.maxAtoms(hero, subtype);
        const seen = new Set();
        const out = [];
        for (const row of (Array.isArray(raw) ? raw : [])) {
            const atomId = String(row && row.atomId || '');
            if (!atomId || seen.has(atomId)) return { ok: false, error: '同一个公式项目不能重复选择。' };
            if (!this.atomAllowed(subtype, atomId)) return { ok: false, error: '所选公式项目不属于这项能力可以修改的范围。' };
            const check = BattleFormulaEngine.validateValue(atomId, row && row.value);
            if (!check.ok) return { ok: false, error: `${BattleFormulaEngine.definition(atomId)?.label || atomId}：${check.error}` };
            seen.add(atomId);
            out.push({ atomId, value: check.value });
        }
        if (!out.length) return { ok: false, error: '至少选择一项底层规则。' };
        if (out.length > max) return { ok: false, error: `当前最多只能修改 ${max} 项底层规则。` };
        return { ok: true, mutations: out };
    },
    prospectiveLaw(bm, hero, subtype, mutations) {
        const count = mutations.length;
        const round = Number(bm.currentRound) || 0;
        return {
            id: '__prospective__', sourceHeroId: hero.heroId, sourceName: hero.name,
            subtype, displayName: this.displayName(hero, subtype), mutations,
            startRound: round, endRound: round + this.durationOf(hero, subtype, count),
            serial: Number(BattleFormulaEngine.ensure(bm).serial) + 1000000,
            removed: false
        };
    },
    validateProspective(bm, hero, subtype, mutations) {
        const old = this.activeLawOf(bm, hero);
        const mock = this.prospectiveLaw(bm, hero, subtype, mutations);
        for (const m of mutations) {
            const resolved = BattleFormulaEngine.resolve(bm, m.atomId, { excludeLawId: old && old.id, extraLaw: mock });
            if (!resolved || resolved.law !== mock) {
                return { ok: false, error: `${BattleFormulaEngine.definition(m.atomId)?.label || m.atomId} 与当前上下限约束冲突。` };
            }
        }
        return { ok: true };
    },
    casterStatKeysOf(subtype) {
        const configured = this.cfgOf(subtype)?.casterStats;
        return configured === 'all' ? this.SIX_STATS.slice()
            : (Array.isArray(configured) && configured.length ? configured.slice() : [this.costStatOf(subtype)]);
    },
    casterStatOf(hero, subtype) {
        const s = hero && hero.additionalStats || {};
        return Math.max(...this.casterStatKeysOf(subtype).map(key => Number(s[key === '运气' ? '运气' : `当前${key}`]) || 0));
    },
    casterStatAfterCost(hero, subtype, count) {
        const s = hero && hero.additionalStats || {};
        const cost = this.costOf(hero, subtype, count);
        const costStat = this.costStatOf(subtype);
        return Math.max(...this.casterStatKeysOf(subtype).map(key => {
            const value = Number(s[key === '运气' ? '运气' : `当前${key}`]) || 0;
            return key === costStat ? Math.max(0, value - cost) : value;
        }));
    },
    rivals(bm, caster) { return RuleSystemRivalPool.rivals(bm, caster); },
    canPossiblyWinAll(bm, caster, subtype, count) {
        const after = this.casterStatAfterCost(caster, subtype, count);
        return this.rivals(bm, caster).every(rival =>
            EnemyControlManager.canPossiblyWin(caster, rival, 1, after, EnemyControlManager.bestStat(rival)));
    },
    contest(bm, caster, subtype) {
        const stat = this.casterStatOf(caster, subtype); // 已在调用前扣费
        const rolls = this.rivals(bm, caster).map(rival => ({
            rival,
            roll: EnemyControlManager.contest(caster, rival, 1, stat, EnemyControlManager.bestStat(rival))
        }));
        return { win: rolls.every(x => x.roll.win), rolls };
    },
    contestTail(contest) {
        if (!contest || !contest.rolls || !contest.rolls.length) return '（无人阻止）';
        return `（${contest.rolls.map(x => `${x.rival.name} ${x.roll.casterScore}:${x.roll.targetScore}`).join('；')}）`;
    },
    reportLine(actor, displayName, supplement) {
        const skill = displayName === '律令' ? '「律令」' : displayName;
        const tail = this.sanitizeReportText(supplement);
        const base = `${actor}使用${skill}修改了战场的底层规则`;
        return `${base}${tail ? `：${tail}` : ''}${/[。！？!?]$/.test(tail) ? '' : '。'}`;
    },
    removeLaw(bm, law, reason = 'expired', summary = null, results = null) {
        if (!law || law.removed) return null;
        law.removed = true;
        const line = reason === 'death'
            ? `随着${law.sourceName}死亡，其以${law.displayName}制定的底层规则随之解除。`
            : reason === 'replaced'
                ? `${law.sourceName}重新制定了底层规则，先前的${law.displayName}随之失效。`
                : `${law.sourceName}以${law.displayName}制定的底层规则恢复了原状。`;
        if (summary) summary.push(`◈ ${line}`);
        const result = { kind: 'fundamental-rule', stage: reason, actor: law.sourceName, displayName: law.displayName, line };
        if (results) results.push(result);
        return result;
    },
    attempt(bm, caster, subtype, rawMutations, supplement, summary, results) {
        if (!bm || !caster || !this.eligibility(caster, subtype).ok) return { ok: false, error: '不具备这项底层规则修改资格。' };
        const checked = this.sanitizeMutations(caster, subtype, rawMutations);
        if (!checked.ok) return checked;
        const mutations = checked.mutations;
        const validation = this.validateProspective(bm, caster, subtype, mutations);
        if (!validation.ok) return validation;
        const count = mutations.length;
        const cost = this.costOf(caster, subtype, count);
        const costStat = this.costStatOf(subtype);
        const costField = this.costFieldOf(subtype);
        const current = Number(caster.additionalStats?.[costField]) || 0;
        if (current < cost) return { ok: false, error: `当前${costStat}不足，需要 ${cost}。` };
        if (!this.canPossiblyWinAll(bm, caster, subtype, count)) return { ok: false, error: '场上有无论如何也压不过的规则对抗者。' };

        caster.additionalStats[costField] = current - cost;
        const contest = this.contest(bm, caster, subtype);
        const tail = this.contestTail(contest);
        if (!contest.win) {
            summary.push(`✗ ${caster.name} 尝试以${this.displayName(caster, subtype)}修改底层规则，但被阻止（消耗${costStat} ${cost}）${tail}`);
            return { ok: true, applied: false, cost, contest };
        }

        const st = BattleFormulaEngine.ensure(bm);
        const old = this.activeLawOf(bm, caster);
        if (old) this.removeLaw(bm, old, 'replaced', summary, results);
        const duration = this.durationOf(caster, subtype, count);
        const round = Number(bm.currentRound) || 0;
        const law = {
            id: `fundamental-rule-${++st.serial}`, serial: st.serial,
            sourceHeroId: caster.heroId, sourceName: caster.name,
            subtype, displayName: this.displayName(caster, subtype),
            mutations: mutations.map(m => ({ ...m })),
            count, duration, startRound: round + 1, endRound: round + duration,
            supplement: this.sanitizeReportText(supplement), removed: false
        };
        st.laws.push(law);
        summary.push(`✓ ${caster.name} 以${law.displayName}修改 ${count} 项底层规则，持续 ${duration} 回合（消耗${costStat} ${cost}）${tail}`);
        mutations.forEach(m => {
            const def = BattleFormulaEngine.definition(m.atomId);
            summary.push(`　${def.label} → ${BattleFormulaEngine.formatValue(m.atomId, m.value)}`);
        });
        results.push({ kind: 'fundamental-rule', stage: 'start', actor: caster.name, subtype, displayName: law.displayName, supplement: law.supplement, lawId: law.id });
        return { ok: true, applied: true, cost, contest, law };
    },
    sweepDead(bm, summary = null, results = null) {
        const out = [];
        BattleFormulaEngine.ensure(bm).laws.forEach(law => {
            if (law.removed) return;
            const hero = BattleFormulaEngine.heroOf(bm, law.sourceHeroId);
            if (hero && (hero.additionalStats?.当前活力 ?? 0) > 0) return;
            const row = this.removeLaw(bm, law, 'death', summary, results);
            if (row) out.push(row);
        });
        return out;
    },
    tick(bm, summary = null, results = null) {
        const out = [];
        const round = Number(bm && bm.currentRound) || 0;
        BattleFormulaEngine.ensure(bm).laws.forEach(law => {
            if (law.removed || round < Number(law.endRound)) return;
            const row = this.removeLaw(bm, law, 'expired', summary, results);
            if (row) out.push(row);
        });
        return out;
    },
    currentRows(bm) {
        const rows = [];
        BattleFormulaEngine.ensure(bm).laws.filter(l => !l.removed).forEach(law => {
            (law.mutations || []).forEach(m => {
                const def = BattleFormulaEngine.definition(m.atomId);
                const resolved = BattleFormulaEngine.resolve(bm, m.atomId);
                const suppressed = (resolved.suppressed || []).some(s => s.layer && s.layer.law === law);
                const round = Number(bm.currentRound) || 0;
                const pending = round < Number(law.startRound);
                rows.push({ law, atomId: m.atomId, label: def.label, value: m.value,
                    effective: !pending && resolved.law === law, suppressed, pending,
                    remaining: pending ? Number(law.duration) : Math.max(0, Number(law.endRound) - round + 1) });
            });
        });
        return rows;
    }
};

const RuleSystemRivalPool = {
    eligible(hero) {
        const ruleEligible = typeof RuleChangeManager !== 'undefined'
            && typeof RuleChangeManager.ruleRivalEligible === 'function'
            && RuleChangeManager.ruleRivalEligible(hero);
        return !!ruleEligible || FundamentalRuleManager.eligible(hero)
            || ReaderContestAdvantage.qualifiesForRivalPool(hero);
    },
    rivals(bm, caster) {
        if (!bm || !caster) return [];
        return bm.teamManager.getAllHeroes().filter(h =>
            h !== caster && TacticResolver.alive(h) && h.teamType !== caster.teamType
            && !TurnSkipManager.pending(h) && this.eligible(h));
    }
};

const RuleChangeManager = {
    /** 引擎永远匹配不到的计时 timing，与 mythic_form / enemy_control 同一手法 */
    TIMING: 'rule_change',
    /** 展示用的持续回合。各处 BUFF 栏都读 duration，给个大数才不会显示成「还剩 0 回合」 */
    DURATION: 9999,

    /**
     * 子类配置。names 是别名阶梯，交给 AbilityAlias 按**途径片段的 rank** 分档：
     * 占卜家序列 2 看到「实现愿望」，到序列 1 自动换成「嫁接」，原来那个按钮消失。
     * 两者在原著里是两样东西，机制上是同一件事，所以只做一份、只换名字。
     * 偷盗者那条是另一条途径，所以独立成一个子类，将来要改机制不会牵连占卜家。
     *
     * 对象的 key 是**内部键**，玩家永远看不到；一切流转（栏位记录、NPC 的 hits、
     * UI 的 dataset）都走它，显示名一律现调 displayName。
     * title 是称号兜底，逐子类各配一份：不想让支柱级角色一次拿到两个功能相同的
     * 按钮时，把其中一条的 title 去掉即可，代码这边不做假设。
     */
    SUBTYPES: {
        欺瞒规则: {
            pathway: '偷盗者',
            title: '诡秘之主',
            titleRank: -2,
            names: [{ gate: 3, name: '欺瞒规则' }],
            desc: '误导敌人的判断，甚至欺诈自然规则',
        },
        占卜家规则: {
            pathway: '占卜家',
            title: '诡秘之主',
            titleRank: -2,
            names: [
                { gate: 1, name: '嫁接' },
                { gate: 2, name: '实现愿望' },
            ],
            desc: '把战场的规则改写成你要的样子',
        },
        信息虚构: {
            pathway: '窥秘人',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 2, name: '信息虚构' }],
            desc: '可制造误导他人的虚假信息，或创造虚假信息来欺骗法则，涉及粗浅的“删除”和“修改”权柄',
        },
        环境掌控者: {
            pathway: '通识者',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 3, name: '环境掌控者' }],
            desc: '提取周围环境信息，利用其增强自身并削弱目标',
            // 预设模式：一套预设可以在同一个规则栏里挂任意多段效果。
            // 以后新增预设只加配置；玩家自动出现单选，NPC 自动从可用项里随机。
            presets: [
                {
                    key: '环境攻防',
                    label: '自身攻击提升＋敌军全体防御削弱',
                    ownerMode: 'caster',
                    effects: [
                        {
                            scope: TacticCatalog.RULE_CHANGE_SELF,
                            param: '攻击提升',
                            power: { mode: 'flat', value: 10 },
                        },
                        {
                            scope: TacticCatalog.RULE_CHANGE_FOES,
                            param: '防御削弱',
                            power: { mode: 'flat', value: 10 },
                        },
                    ],
                },
            ],
            report: {
                tactic: actor =>
                    `${actor}以「环境掌控者」提取周围环境信息，强化了自身的攻击，并削弱了敌军全体的防御。`,
            },
        },
        弦之弹奏: {
            pathway: '萨满',
            title: '高维俯视者',
            titleRank: -1,
            names: [{ gate: 3, name: '弦之弹奏' }],
            desc: '掌控“弦”，通过对“弦”的弹奏，改变现实',
        },
        扭曲规则: {
            pathway: '律师',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 4, name: '扭曲规则' }],
            desc: '寻找规则的漏洞，让它们被自己利用。',
        },
        律令制定: {
            pathway: '仲裁人',
            title: '失序者',
            titleRank: -1,
            names: [{ gate: 4, name: '律令制定' }],
            desc: '通过制定律令改变规则',
        },
        嫁接底层回退: {
            pathway: '占卜家', title: '诡秘之主', titleRank: -2, npcOnly: true,
            names: [{ gate: 1, name: '嫁接' }],
            desc: 'NPC与托管状态使用的嫁接退化版本',
        },
        欺诈权柄底层回退: {
            pathway: '偷盗者', title: '诡秘之主', titleRank: -2, npcOnly: true,
            names: [{ gate: 0, name: '“欺诈”权柄' }],
            desc: 'NPC与托管状态使用的“欺诈”权柄退化版本',
        },
        阅读者规律底层回退: {
            pathway: '阅读者', title: '上帝', titleRank: -2, npcOnly: true,
            names: [{ gate: 1, name: '部分“规律”权柄' }, { gate: 3, name: '撬动规律' }],
            desc: 'NPC与托管状态使用的阅读者规律退化版本',
        },
        修改权柄底层回退: {
            pathway: '窥秘人', title: '知识之妖', titleRank: -1, npcOnly: true,
            names: [{ gate: 2, name: '“修改”权柄' }],
            desc: 'NPC与托管状态使用的“修改”权柄退化版本',
        },
        规律权柄底层回退: {
            pathway: '通识者', title: '知识之妖', titleRank: -1, npcOnly: true,
            names: [{ gate: 2, name: '“规律”权柄' }],
            desc: 'NPC与托管状态使用的“规律”权柄退化版本',
        },
        规则之弦底层回退: {
            pathway: '萨满', title: '高维俯视者', titleRank: -1, npcOnly: true,
            names: [{ gate: 3, name: '规则之弦' }],
            desc: 'NPC与托管状态使用的规则之弦退化版本',
        },
        // 真正的“篡改规则”属于 FundamentalRuleManager；这里只给 NPC 与托管降级到普通规则修改。
        篡改规则底层回退: {
            pathway: '律师', title: '失序者', titleRank: -1, npcOnly: true,
            names: [{ gate: 4, name: '篡改规则' }],
            desc: 'NPC与托管状态使用的篡改规则退化版本',
        },
        仲裁人规则回退: {
            pathway: '仲裁人', title: '失序者', titleRank: -1, npcOnly: true,
            names: [{ gate: 1, name: '“秩序”权柄' }, { gate: 4, name: '律令' }],
            desc: 'NPC与托管状态使用的普通规则修改版本',
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    cfgOf(subtype) {
        return this.SUBTYPES[subtype] || null;
    },

    /** 带 presets 的子类走多段预设模式；旧子类继续走范围 + 单项参数模式。 */
    presetsOf(subtype) {
        const list = this.cfgOf(subtype)?.presets;
        return Array.isArray(list) ? list.filter(p => p && p.key) : [];
    },

    presetOf(subtype, presetKey) {
        return this.presetsOf(subtype).find(p => p.key === presetKey) || null;
    },

    isPresetSubtype(subtype) {
        return this.presetsOf(subtype).length > 0;
    },

    presetNeedsTarget(subtype, presetKey) {
        const preset = this.presetOf(subtype, presetKey);
        return !!(preset && Array.isArray(preset.effects)
            && preset.effects.some(e => e && e.scope === TacticCatalog.RULE_CHANGE_FOE));
    },

    // ---------- 运行期状态 ----------

    /**
     * 栏位注册表挂在 BattleManager 上而不是散在 Hero 里：它是全场共享的一份东西，
     * 挤栏要按入栏先后排序，散着存没法做。slots 按 push 顺序即入栏顺序。
     */
    ensure(bm) {
        if (!bm.ruleChange) {
            bm.ruleChange = {
                cap: TacticCatalog.RULE_CHANGE_SLOT_MIN,
                slots: [],   // [{ id, casterId, casterName, subtype, shownAs, scope, param, dir, power, targetIds, targetNames, round }]
                seq: 0,      // id 用递增序号，不用时间戳：同一毫秒里可能落两条
                // sweep 攒下的待报行。战术面板打开时也会 sweep 一次（免得玩家对着
                // 一份已作废的栏做决策），那一次产出的行不能就地丢掉——攒在这里，
                // 等本轮结算时由 drainLines 一并倒进结果页
                pendingLines: [],
            };
        }
        if (!bm.ruleChange.pendingLines) bm.ruleChange.pendingLines = [];
        return bm.ruleChange;
    },

    /**
     * 开场定死栏位上限。**只以开场时的双方总人数为准**：之后进场的召唤物、
     * 投影都不改它，否则召唤流能靠不断加人把栏位刷宽。
     */
    initCap(bm) {
        const total = ((bm.allyTeam && bm.allyTeam.length) || 0)
            + ((bm.enemyTeam && bm.enemyTeam.length) || 0);
        const st = this.ensure(bm);
        st.cap = Math.max(
            TacticCatalog.RULE_CHANGE_SLOT_MIN,
            Math.floor(total * TacticCatalog.RULE_CHANGE_SLOT_RATIO),
        );
        st.slots = [];
        st.seq = 0;
        st.pendingLines = [];
        return st.cap;
    },

    capOf(bm) {
        return this.ensure(bm).cap;
    },

    slotsOf(bm) {
        return this.ensure(bm).slots;
    },

    freeOf(bm) {
        const st = this.ensure(bm);
        return Math.max(0, st.cap - st.slots.length);
    },

    findHero(bm, heroId) {
        if (!bm || !heroId) return null;
        return bm.teamManager.getAllHeroes().find(h => h.heroId === heroId) || null;
    },

    // ---------- 资格与显示名 ----------

    eligibility(hero) {
        return AbilityAlias.resolve(hero && hero.sequenceString, this.SUBTYPES);
    },

    /** 这个人解锁了哪几条子类，返回的是内部键 */
    availableSubtypes(hero) {
        const e = this.eligibility(hero);
        return this.subtypes().filter(k => !this.SUBTYPES[k]?.npcOnly && e[k] && e[k].ok);
    },

    availableNpcSubtypes(hero) {
        const e = this.eligibility(hero);
        return this.subtypes().filter(k => e[k] && e[k].ok);
    },

    eligible(hero) {
        return this.availableSubtypes(hero).length > 0;
    },

    npcEligible(hero) {
        return this.availableNpcSubtypes(hero).length > 0;
    },

    ruleRivalEligible(hero) {
        return this.availableNpcSubtypes(hero).length > 0;
    },

    /**
     * 内部键 → 这个人该看到的名字。解析不出来时（比如施法者已经离场，
     * 而栏里那条还要显示）退回该子类最强档的名字，不暴露内部键。
     */
    displayName(hero, subtype) {
        const e = this.eligibility(hero)[subtype];
        if (e && e.ok && e.name) return e.name;
        const cfg = this.SUBTYPES[subtype];
        if (!cfg) return String(subtype);
        return AbilityAlias.nameOf(cfg, subtype, AbilityAlias.titleRankOf(cfg)) || String(subtype);
    },

    canUse(bm, hero) {
        return !!hero && this.eligible(hero);
    },

    npcCanUse(bm, hero) {
        return !!hero && this.npcEligible(hero);
    },

    // ---------- 消耗 ----------
    // 与偷窃想法同一条通道：平均灵性 8%，扣当前灵性，成败都扣。
    // 这几个方法与 HardControlManager 的灵性消耗口径同构，只换了比例来源。

    statKeyOf() {
        return TacticCatalog.RULE_CHANGE_CASTER_STAT;
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costOf(hero) {
        return TacticCatalog.ruleChangeCost(hero && hero.sequenceRank);
    },

    spend(hero) {
        const key = this.statKeyOf();
        const field = this.fieldOf(key);
        const cost = this.costOf(hero);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    hasStat(hero) {
        return (hero?.additionalStats?.[this.fieldOf(this.statKeyOf())] ?? 0) > 0;
    },

    // ---------- 拼点 ----------
    // 出手项是「当前最高的一项」，与操控系的 bestStat 同口径（六项当前值加运气）。
    // 对手是场上所有还能对抗的同类能力者，逐个拼，全胜才算改动成立。

    casterStatOf(hero) {
        return EnemyControlManager.bestStat(hero);
    },

    /**
     * 扣费之后的出手点数。灵性恰好是最高项时它会跟着降，所以不能拿扣费前的值去估。
     * 这里的属性清单必须与 EnemyControlManager.bestStat 保持一致。
     */
    casterStatAfterCost(hero) {
        const s = (hero && hero.additionalStats) || {};
        const cost = this.costOf(hero);
        return Math.max(
            s.当前活力 ?? 0, s.当前敏捷 ?? 0,
            Math.max(0, (s.当前灵性 ?? 0) - cost),
            s.当前理智 ?? 0, s.当前人性 ?? 0, s.运气 ?? 0,
        );
    },

    /**
     * 会来阻挠的人：有同类能力，或阅读者达到序列6的存活敌人。
     * 昏迷 / 呆滞的排除掉——神志都不清了谈不上跟人争夺规则；
     * 因附身离场的**不**排除，他的意识还在场上活动，只是没有身体。
     */
    rivals(bm, caster) {
        return RuleSystemRivalPool.rivals(bm, caster);
    },

    /**
     * 逐个拼点，全部严格大于才成功。一个够格的敌人都没有时无人可争，直接成立。
     * @param {number} casterStat 已扣费之后的出手点数
     */
    contest(bm, caster, casterStat) {
        const rolls = this.rivals(bm, caster).map(rival => ({
            rival,
            roll: EnemyControlManager.contest(
                caster, rival, 1, casterStat, EnemyControlManager.bestStat(rival),
            ),
        }));
        return { win: rolls.every(r => r.roll.win), rolls };
    },

    /** 理论上能不能赢下**每一个**对手。有一个赢不了就别让人白扣灵性 */
    canPossiblyWinAll(bm, caster) {
        const after = this.casterStatAfterCost(caster);
        return this.rivals(bm, caster).every(rival =>
            EnemyControlManager.canPossiblyWin(
                caster, rival, 1, after, EnemyControlManager.bestStat(rival),
            ));
    },

    contestTail(rolls) {
        if (!rolls || !rolls.length) return '（场上没有对抗者）';
        return '（拼点 ' + rolls
            .map(r => `${r.rival.name} ${r.roll.casterScore}:${r.roll.targetScore}`)
            .join('；') + '）';
    },

    // ---------- 效果值与目标 ----------

    /**
     * 单体档：BASE − STEP × (施法者 rank − 目标 rank)，两端钳制。
     * 序列数字越小越强，所以打比自己强的人差值为正、效果衰减；打更弱的人差值为负、
     * 效果放大。用原始 rank 而不是 ceil 分档值，小数序列直接参与运算。
     * 两个「全体」不看序列差，一律固定值。
     */
    powerOf(caster, target, scope) {
        if (scope === TacticCatalog.RULE_CHANGE_ALLIES || scope === TacticCatalog.RULE_CHANGE_FOES) {
            return TacticCatalog.RULE_CHANGE_GROUP_PCT;
        }
        const a = Number(caster && caster.sequenceRank);
        const b = Number(target && target.sequenceRank);
        const diff = (Number.isFinite(a) && Number.isFinite(b)) ? (a - b) : 0;
        const raw = TacticCatalog.RULE_CHANGE_SINGLE_BASE
            - TacticCatalog.RULE_CHANGE_SINGLE_STEP * diff;
        return Math.max(
            TacticCatalog.RULE_CHANGE_MIN_PCT,
            Math.min(TacticCatalog.RULE_CHANGE_MAX_PCT, Math.round(raw)),
        );
    },

    /** 这一类范围该给正面参数还是负面参数 */
    dirOf(scope) {
        return (scope === TacticCatalog.RULE_CHANGE_FOE || scope === TacticCatalog.RULE_CHANGE_FOES)
            ? 'bad' : 'good';
    },

    /** 能被点名的敌人。因附身离场的不能指定：他不在场上 */
    foeTargets(bm, caster) {
        if (!bm || !caster) return [];
        return bm.teamManager.getAllHeroes().filter(h =>
            EnemyControlManager.isEnemyOf(caster, h) && !OffFieldManager.isOff(h));
    },

    /**
     * 四类范围各自的落点。友军全体含施法者自己——「自己」那一档换来的是
     * 40% 对 20% 的差价，而不是覆盖面。
     * @param {Object} [single] 敌军单体时点的那个人
     */
    targetsOf(bm, caster, scope, single) {
        if (!bm || !caster) return [];
        const onField = h => TacticResolver.alive(h) && !OffFieldManager.isOff(h);
        if (scope === TacticCatalog.RULE_CHANGE_SELF) {
            return onField(caster) ? [caster] : [];
        }
        if (scope === TacticCatalog.RULE_CHANGE_FOE) {
            return (single && onField(single) && single.teamType !== caster.teamType) ? [single] : [];
        }
        const all = bm.teamManager.getAllHeroes().filter(onField);
        return scope === TacticCatalog.RULE_CHANGE_ALLIES
            ? all.filter(h => h.teamType === caster.teamType)
            : all.filter(h => h.teamType !== caster.teamType);
    },

    /** 预设单段的幅度。flat 读固定值；ruleDefault（或省略）复用现有范围算法。 */
    presetPowerOf(caster, target, scope, powerCfg) {
        const cfg = powerCfg || { mode: 'ruleDefault' };
        if (cfg.mode === 'flat') {
            const value = Number(cfg.value);
            return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
        }
        return this.powerOf(caster, target, scope);
    },

    /**
     * 把一套声明式预设解析成可结算计划。任何一段参数无效或没有落点，整套都不可用，
     * 避免只挂上「自身强化」却漏掉「削弱敌军」这种半成品。
     */
    buildPresetPlan(bm, caster, subtype, presetKey, single = null) {
        const preset = this.presetOf(subtype, presetKey);
        if (!preset || !Array.isArray(preset.effects) || !preset.effects.length) return null;

        const parts = [];
        for (const spec of preset.effects) {
            if (!spec || !TacticCatalog.RULE_CHANGE_SCOPES.includes(spec.scope)) return null;
            const meta = TacticCatalog.RULE_CHANGE_PARAMS[spec.param];
            if (!meta) return null;
            const targets = this.targetsOf(bm, caster, spec.scope, single);
            if (!targets.length) return null;
            const power = this.presetPowerOf(caster, targets[0], spec.scope, spec.power);
            if (!Number.isFinite(power) || power <= 0) return null;
            parts.push({
                scope: spec.scope,
                param: spec.param,
                dir: meta.dir || this.dirOf(spec.scope),
                power,
                targets,
            });
        }

        const seen = new Set();
        const targets = [];
        parts.forEach(part => part.targets.forEach(hero => {
            if (!hero || seen.has(hero.heroId)) return;
            seen.add(hero.heroId);
            targets.push(hero);
        }));
        return {
            subtype,
            presetKey: preset.key,
            presetLabel: preset.label || preset.key,
            ownerMode: preset.ownerMode || 'caster',
            parts,
            targets,
        };
    },

    /** 当前场面真正可完整落地的预设计划。 */
    availablePresetPlans(bm, caster, subtype, single = null) {
        return this.presetsOf(subtype)
            .map(p => this.buildPresetPlan(bm, caster, subtype, p.key, single))
            .filter(Boolean);
    },

    // ---------- 效果落地 ----------

    /**
     * 挂一条效果。不走 EffectManager.applyEffect：它按固定字段白名单重建实例，
     * ruleChange 与 slotId 会被丢掉，而出栏时就是靠 slotId 找回来摘除的。
     */
    applyTo(hero, entry, part = null) {
        const source = part || entry;
        const meta = TacticCatalog.RULE_CHANGE_PARAMS[source.param];
        if (!hero || !meta) return;
        hero.effects = hero.effects || [];
        hero.effects.push({
            name: `${entry.shownAs}·${TacticCatalog.ruleChangeParamLabel(source.param)}`,
            type: meta.type,
            stat: meta.stat,
            valueType: 'percentage',
            power: source.power,
            duration: this.DURATION,
            triggerTiming: this.TIMING,
            priority: 0,
            ruleChange: true,
            slotId: entry.id,
            appliedAt: Date.now(),
        });
    },

    /** 旧单效果条目现场归一成一段，读取方以后只需要面对 parts。 */
    partsOf(entry) {
        if (entry && Array.isArray(entry.parts) && entry.parts.length) return entry.parts;
        if (!entry) return [];
        return [{
            scope: entry.scope,
            param: entry.param,
            dir: entry.dir,
            power: entry.power,
            targetIds: entry.targetIds || [],
            targetNames: entry.targetNames || [],
        }];
    },

    targetIdsOf(entry) {
        return [...new Set(this.partsOf(entry).flatMap(part => part.targetIds || []))];
    },

    applyEntry(bm, entry) {
        this.partsOf(entry).forEach(part => {
            (part.targetIds || []).forEach(id => {
                const hero = this.findHero(bm, id);
                if (hero) this.applyTo(hero, entry, part);
            });
        });
    },

    removeFrom(hero, slotId) {
        if (!hero || !Array.isArray(hero.effects)) return;
        hero.effects = hero.effects.filter(e => !(e && e.ruleChange && e.slotId === slotId));
    },

    // ---------- 栏位 ----------

    /**
     * 一条规则算谁的。**看受益方，不看谁施加**：BUFF 归目标当前所在的阵营，
     * DEBUFF 归目标阵营的对面。所以栏里存 targetIds 而不是阵营字串——
     * 目标中途被征服倒戈，这条的归属要跟着翻面。
     * 目标分裂到两个阵营时按存活目标的多数判，平局看第一个目标。
     * @returns {'ally'|'enemy'|null} null 表示目标已全灭，等 sweep 收走
     */
    sideOf(bm, entry) {
        if (entry && entry.ownerMode === 'caster') {
            const caster = this.findHero(bm, entry.casterId);
            return caster && TacticResolver.alive(caster)
                ? (caster.teamType === 'ally' ? 'ally' : 'enemy')
                : null;
        }
        const living = this.targetIdsOf(entry)
            .map(id => this.findHero(bm, id))
            .filter(h => h && TacticResolver.alive(h));
        if (!living.length) return null;
        const ally = living.filter(h => h.teamType === 'ally').length;
        const enemy = living.length - ally;
        let side;
        if (ally > enemy) side = 'ally';
        else if (enemy > ally) side = 'enemy';
        else side = living[0].teamType === 'ally' ? 'ally' : 'enemy';
        return entry.dir === 'bad' ? (side === 'ally' ? 'enemy' : 'ally') : side;
    },

    /**
     * 入栏。有空位直接进；满了先挤最早入栏的敌方条目，栏里全是己方条目时才挤己方的。
     * slots 按 push 顺序排列，所以「最早入栏」就是符合条件的第一条。
     * 目标已全灭（sideOf 返回 null）的条目排在敌方那一档里优先被挤，
     * 正常情况下 sweep 已经收掉它们，这只是兜底。
     * @returns {Array} 被挤掉的条目，正常最多一条
     */
    admit(bm, entry) {
        const st = this.ensure(bm);
        const evicted = [];
        while (st.slots.length >= st.cap && st.slots.length > 0) {
            const foes = st.slots.filter(s => this.sideOf(bm, s) !== entry.side);
            const victim = (foes.length ? foes : st.slots)[0];
            this.evict(bm, victim);
            evicted.push(victim);
        }
        st.slots.push(entry);
        return evicted;
    },

    /** 出栏：从注册表里摘掉，并把效果从每一个还在场的目标身上删掉 */
    evict(bm, entry) {
        const st = this.ensure(bm);
        const idx = st.slots.indexOf(entry);
        if (idx >= 0) st.slots.splice(idx, 1);
        this.targetIdsOf(entry).forEach(id => {
            const hero = this.findHero(bm, id);
            if (hero) this.removeFrom(hero, entry.id);
        });
    },

    /**
     * 清理没有依托的条目：施法者死了，或者作用对象全死了。
     * 幂等，战术面板打开时与纯前端管线开头各跑一次——前者是为了别让玩家
     * 看着一份已经作废的规则栏做决策，后者才是真正的结算点。
     * @returns {Array<string>} 结果页用的行
     */
    sweep(bm) {
        if (!bm || !bm.teamManager) return [];
        const st = this.ensure(bm);
        if (!st.slots.length) return [];
        const lines = [];
        st.slots.slice().forEach(entry => {
            const caster = this.findHero(bm, entry.casterId);
            const casterGone = !caster || !TacticResolver.alive(caster);
            const targetsGone = !this.targetIdsOf(entry).some(id => {
                const hero = this.findHero(bm, id);
                return hero && TacticResolver.alive(hero);
            });
            if (!casterGone && !targetsGone) return;
            this.evict(bm, entry);
            lines.push(`🕯️ ${entry.casterName} 的「${entry.shownAs}」失效了：`
                + (casterGone ? '施加者已阵亡' : '作用对象已全部阵亡'));
        });
        // 面板打开时那一次 sweep 的产出没有地方可写，攒起来等结算时一起报
        lines.forEach(line => st.pendingLines.push(line));
        return lines;
    },

    /** 取走并清空攒下的待报行。只有纯前端管线调它 */
    drainLines(bm) {
        const st = this.ensure(bm);
        const lines = st.pendingLines.slice();
        st.pendingLines = [];
        return lines;
    },

    /** 规则栏面板一行的文案。施法者可能已经不在了，所以全部读条目自己存的字段 */
    describe(bm, entry) {
        if (Array.isArray(entry.parts) && entry.parts.length) {
            const detail = entry.parts.map(part => {
                const sign = TacticCatalog.ruleChangeParamSign(part.param);
                const label = TacticCatalog.ruleChangeParamLabel(part.param);
                return `${(part.targetNames || []).join('、')} ${label} ${sign}${part.power}%`;
            }).join('；');
            return `${entry.casterName} 的「${entry.shownAs}」：${detail}`;
        }
        const sign = TacticCatalog.ruleChangeParamSign(entry.param);
        const label = TacticCatalog.ruleChangeParamLabel(entry.param);
        const who = {
            [TacticCatalog.RULE_CHANGE_SELF]: entry.casterName,
            [TacticCatalog.RULE_CHANGE_ALLIES]: `${entry.casterName}一方全员`,
            [TacticCatalog.RULE_CHANGE_FOES]: `${entry.casterName}的敌方全员`,
        }[entry.scope] || (entry.targetNames || []).join('、');
        return `${entry.casterName} 的「${entry.shownAs}」：${who} ${label} ${sign}${entry.power}%`;
    },

    // ---------- 发起 ----------

    /**
     * 发起一次。先扣再拼、成败都扣；拼点点数取扣费之后的值，与操控系一致。
     * 真正的入栏推迟到仲裁：同一轮里敌我都可能改规则，而栏位只有那么几个。
     */
    attempt(bm, caster, plan) {
        this.spend(caster);
        return {
            ...TacticBorrowReport.meta(caster),
            caster,
            subtype: plan.subtype,
            shownAs: this.displayName(caster, plan.subtype),
            scope: plan.scope,
            param: plan.param,
            targets: plan.targets,
            presetKey: plan.presetKey || '',
            presetLabel: plan.presetLabel || '',
            ownerMode: plan.ownerMode || '',
            parts: Array.isArray(plan.parts) ? plan.parts : null,
            contest: this.contest(bm, caster, this.casterStatOf(caster)),
        };
    },

    /** 组装待入栏记录。预设的多段共同使用同一个 id，因此永远整体进出栏。 */
    buildEntry(bm, caster, plan, resolvedParts = null) {
        const st = this.ensure(bm);
        st.seq += 1;
        const base = {
            id: `rc-${st.seq}`,
            casterId: caster.heroId,
            casterName: caster.name,
            subtype: plan.subtype,
            shownAs: this.displayName(caster, plan.subtype),
            round: Number(bm.currentRound) || 0,
        };

        const presetParts = resolvedParts || plan.parts;
        if (Array.isArray(presetParts) && presetParts.length) {
            const parts = presetParts.map(part => ({
                scope: part.scope,
                param: part.param,
                dir: part.dir,
                power: part.power,
                targetIds: part.targets.map(t => t.heroId),
                targetNames: part.targets.map(t => t.name),
            }));
            return Object.assign(base, {
                presetKey: plan.presetKey,
                presetLabel: plan.presetLabel,
                ownerMode: plan.ownerMode || 'caster',
                parts,
                targetIds: [...new Set(parts.flatMap(part => part.targetIds))],
                targetNames: [...new Set(parts.flatMap(part => part.targetNames))],
            });
        }

        const meta = TacticCatalog.RULE_CHANGE_PARAMS[plan.param] || {};
        const targets = plan.targets || [];
        return Object.assign(base, {
            scope: plan.scope,
            param: plan.param,
            dir: meta.dir || 'good',
            power: this.powerOf(caster, targets[0], plan.scope),
            targetIds: targets.map(t => t.heroId),
            targetNames: targets.map(t => t.name),
        });
    },

    // ---------- NPC ----------

    /**
     * 这一轮要不要发起。最后那条是用户点名的例外：栏已满、且里面全是自己这边
     * 受益的条目时不掷骰——再改一次只能挤掉自己人，纯亏。
     * 栏里有敌方条目、或者还有空位，就照常判定。
     */
    npcShouldTry(bm, hero) {
        if (!this.npcCanUse(bm, hero)) return false;
        if (!this.hasStat(hero)) return false;
        if (!this.canPossiblyWinAll(bm, hero)) return false;
        const st = this.ensure(bm);
        if (st.slots.length >= st.cap) {
            // 无论 BUFF 还是 DEBUFF，NPC 这一发的受益方都是他自己这边
            const mySide = hero.teamType === 'ally' ? 'ally' : 'enemy';
            if (st.slots.every(s => this.sideOf(bm, s) === mySide)) return false;
        }
        return true;
    },

    /**
     * 随机挑一发：旧子类按范围与方向挑参数；预设子类从当前能完整落地的预设中随机。
     * 两种模式里的敌军单体都按序列邻近度点人，与索敌同一套口径。
     * 抽到的范围没有落点就整发作废，不换一类重抽——与召唤「候选全军覆没
     * 就当什么都没发生」同一处理，不进 hits 就不占动作位。
     */
    npcPlan(bm, hero, forcedSubtype = '') {
        const subs = this.availableNpcSubtypes(hero)
            .filter(subtype => !forcedSubtype || subtype === forcedSubtype);
        if (!subs.length) return null;
        const subtype = subs[Math.floor(Math.random() * subs.length)];

        if (this.isPresetSubtype(subtype)) {
            const plans = this.presetsOf(subtype).map(preset => {
                let single = null;
                if (this.presetNeedsTarget(subtype, preset.key)) {
                    single = SequenceTiers.nearest(hero, this.foeTargets(bm, hero));
                    if (!single) return null;
                }
                return this.buildPresetPlan(bm, hero, subtype, preset.key, single);
            }).filter(Boolean);
            return plans.length ? plans[Math.floor(Math.random() * plans.length)] : null;
        }

        const scopes = TacticCatalog.RULE_CHANGE_SCOPES;
        const scope = scopes[Math.floor(Math.random() * scopes.length)];

        let targets;
        if (scope === TacticCatalog.RULE_CHANGE_FOE) {
            const pool = this.foeTargets(bm, hero);
            const picked = SequenceTiers.nearest(hero, pool);
            targets = picked ? [picked] : [];
        } else {
            targets = this.targetsOf(bm, hero, scope);
        }
        if (!targets.length) return null;

        const params = TacticCatalog.ruleChangeParams(this.dirOf(scope));
        const param = params[Math.floor(Math.random() * params.length)];
        return { subtype, scope, param, targets };
    },

    // ---------- 仲裁 ----------

    /**
     * 同一轮里敌我都可能改规则，栏位却只有那么几个，所以要定一个先后：
     * 与其余控制系共用 pickWinner 的口径——玩家优先，其次速度快的，并列随机。
     * 后结算的那条会把先结算的挤出去，这正是「先进栏的先被挤」的自然结果。
     */
    orderWinners(list) {
        return list.slice()
            .map(a => ({ a, tie: Math.random() }))
            .sort((x, y) => {
                const px = x.a.caster.dataSource === 'player' ? 1 : 0;
                const py = y.a.caster.dataSource === 'player' ? 1 : 0;
                if (px !== py) return py - px;
                const sx = EnemyControlManager.speedOf(x.a.caster);
                const sy = EnemyControlManager.speedOf(y.a.caster);
                if (sx !== sy) return sy - sx;
                return x.tie - y.tie;
            })
            .map(x => x.a);
    },

    /**
     * @param {Array} attempts [{ caster, subtype, shownAs, scope, param, targets, contest }]
     */
    arbitrate(bm, attempts, summary, results) {
        if (!attempts || !attempts.length) return;

        attempts.filter(a => !a.contest.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」被场上的对抗者阻止`
                + this.contestTail(a.contest.rolls));
        });

        this.orderWinners(attempts.filter(a => a.contest.win)).forEach(a => {
            const tail = this.contestTail(a.contest.rolls);

            // 预设模式：每一段都必须仍有落点，整套才会作为一个栏位落地。
            if (Array.isArray(a.parts) && a.parts.length) {
                if (!TacticResolver.alive(a.caster)) {
                    summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」未能成形：施加者已阵亡${tail}`);
                    return;
                }
                const resolvedParts = a.parts.map(part => Object.assign({}, part, {
                    targets: (part.targets || []).filter(t =>
                        TacticResolver.alive(t) && !OffFieldManager.isOff(t)),
                }));
                if (resolvedParts.some(part => !part.targets.length)) {
                    summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」落空了：作用对象已不在场上${tail}`);
                    return;
                }
                const invalidSingle = resolvedParts.find(part =>
                    part.scope === TacticCatalog.RULE_CHANGE_FOE
                    && !EnemyControlManager.isEnemyOf(a.caster, part.targets[0]));
                if (invalidSingle) {
                    summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」落到 ${invalidSingle.targets[0].name} 身上时，`
                        + `目标已被别人抢先转化${tail}`);
                    return;
                }

                const entry = this.buildEntry(bm, a.caster, a, resolvedParts);
                entry.side = this.sideOf(bm, entry);
                const evicted = this.admit(bm, entry);
                this.applyEntry(bm, entry);

                const detail = entry.parts.map(part => {
                    const sign = TacticCatalog.ruleChangeParamSign(part.param);
                    const label = TacticCatalog.ruleChangeParamLabel(part.param);
                    return `${part.targetNames.join('、')} ${label} ${sign}${part.power}%`;
                }).join('；');
                summary.push(`✓ ${a.caster.name} 以「${a.shownAs}」改写了规则：${detail}`
                    + `（规则栏 ${this.slotsOf(bm).length}/${this.capOf(bm)}）${tail}`);
                evicted.forEach(v => {
                    summary.push(`↩ 规则栏已满，${v.casterName} 的「${v.shownAs}」被挤了出去`);
                });

                results.push({ ...TacticBorrowReport.meta(a.caster),
                    kind: 'rule-change',
                    actor: a.caster.name,
                    subtype: a.subtype,
                    shownAs: a.shownAs,
                    presetKey: entry.presetKey,
                    parts: entry.parts.map(part => ({
                        scope: part.scope,
                        param: part.param,
                        power: part.power,
                        dir: part.dir,
                        targets: part.targetNames.slice(),
                    })),
                    evicted: evicted.map(v => ({ actor: v.casterName, shownAs: v.shownAs })),
                });
                return;
            }

            // 目标是拼点那一刻锁定的，这中间可能有人死了、有人被转化走了
            const living = a.targets.filter(t =>
                TacticResolver.alive(t) && !OffFieldManager.isOff(t));
            if (!living.length) {
                summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」落空了：作用对象已不在场上${tail}`);
                return;
            }
            if (a.scope === TacticCatalog.RULE_CHANGE_FOE
                && !EnemyControlManager.isEnemyOf(a.caster, living[0])) {
                summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」落到 ${living[0].name} 身上时，`
                    + `目标已被别人抢先转化${tail}`);
                return;
            }
            if (!TacticResolver.alive(a.caster)) {
                summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」未能成形：施加者已阵亡${tail}`);
                return;
            }

            const entry = this.buildEntry(bm, a.caster, Object.assign({}, a, { targets: living }));
            entry.side = this.sideOf(bm, entry);
            const evicted = this.admit(bm, entry);
            this.applyEntry(bm, entry);

            const sign = TacticCatalog.ruleChangeParamSign(entry.param);
            const label = TacticCatalog.ruleChangeParamLabel(entry.param);
            summary.push(`✓ ${a.caster.name} 以「${a.shownAs}」改写了规则：`
                + `${living.map(t => t.name).join('、')} ${label} ${sign}${entry.power}%`
                + `（规则栏 ${this.slotsOf(bm).length}/${this.capOf(bm)}）${tail}`);
            evicted.forEach(v => {
                summary.push(`↩ 规则栏已满，${v.casterName} 的「${v.shownAs}」被挤了出去`);
            });

            results.push({ ...TacticBorrowReport.meta(a.caster),
                kind: 'rule-change',
                actor: a.caster.name,
                subtype: a.subtype,
                shownAs: a.shownAs,
                scope: a.scope,
                param: entry.param,
                power: entry.power,
                dir: entry.dir,
                targets: living.map(t => t.name),
                evicted: evicted.map(v => ({ actor: v.casterName, shownAs: v.shownAs })),
            });
        });
    },

    // ---------- 玩家侧闸门 ----------

    /** 按钮为什么点不了。返回空串表示可用 */
    blockedReason(bm, hero) {
        if (!hero) return '场上没有你可操作的角色。';
        if (!this.eligible(hero)) return '你没有可用的规则修改能力。';
        if (!this.hasStat(hero)) return `当前${this.statKeyOf()}为 0，无法改写规则。`;
        if (!this.canPossiblyWinAll(bm, hero)) {
            return '场上有你无论如何也压不过的对抗者，这一发必然失败。';
        }
        return '';
    },
};

const ENV_SAILOR = { pathway: '水手', title: '上帝', titleRank: -2 };
/** 旧日走「永恒之暗」，parseSequenceRank 见到「旧日」返回 -1 */
const ENV_SLEEPLESS = { pathway: '不眠者', title: '永恒之暗', titleRank: -1 };
/** 攻防速三项同幅时用它，免得三份字符串数组抄三遍 */
const ENV_TRIPLE = ['attack', 'defense', 'speed'];

/**
 * 造一条自然环境加成。
 * @param who   {pathway, title, titleRank}。支柱 / 旧日在 parseSequenceRank 眼里
 *              没有途径可言（它见到「支柱」「旧日」就直接返回 -2 / -1，拿不到途径名），
 *              所以顶端两档只能靠称号认，titleRank 就是它该记的档。
 * @param gate  rank ≤ gate 才吃得到。称号命中时 titleRank 是负数，天然通过任何 gate。
 * @param stats 省略就是「这一条只给移动力」，不进属性通道。暴风雨正是靠这一点，
 *              把攻防（序列 9 解锁）与移动力（序列 6 解锁）拆成两条不同门槛的条目——
 *              门槛挂在**单条 effect** 上而不是挂在环境词上，就是为了这种情况。
 * @param div   省略就是「这一条不给移动力」。
 */
function makeEnvBonus(who, gate, { stats, per, div } = {}) {
    const e = {
        pathway: who.pathway, title: who.title, titleRank: who.titleRank,
        gate, type: 'buff', scaling: 'selfRank',
    };
    if (Array.isArray(stats) && stats.length) { e.stats = stats; e.per = per; }
    if (Number.isFinite(div)) e.move = { div };
    return e;
}

/** 水系地貌：水手，序列 9 起，攻防速三项同幅，另给移动力 */
const waterLand = (per, div) => makeEnvBonus(ENV_SAILOR, 9, { stats: ENV_TRIPLE, per, div });
/** 高空地貌：水手，**序列 6 起**，其余与水系逐字相同。这是与水系唯一的差别 */
const skyLand = (per, div) => makeEnvBonus(ENV_SAILOR, 6, { stats: ENV_TRIPLE, per, div });
/** 雨类天气：水手，序列 9 起，只加攻击力。div 省略就是不给移动力 */
const sailorRain = (per, div) => makeEnvBonus(ENV_SAILOR, 9, { stats: ['attack'], per, div });
/** 风类天气：水手，**序列 6 起**，只加攻击力。这是与雨类唯一的差别 */
const sailorWind = (per, div) => makeEnvBonus(ENV_SAILOR, 6, { stats: ['attack'], per, div });
/** 夜色：不眠者，序列 9 起，攻防速三项同幅，另给移动力 */
const nightTime = (per, div) => makeEnvBonus(ENV_SLEEPLESS, 9, { stats: ENV_TRIPLE, per, div });

/**
 * 🆕 暴风雨的效果。**唯一一份**，被两个来源共用：
 *   自然天气栏（铺图 LLM 挑中「暴风雨」）与人工环境「改变天气」（EnvironmentManager 的子类）。
 * 「人工的和天然的完全相同，只是来源不同」是这条子类的硬需求，所以两处必须**引用同一个数组**，
 * 而不是各写一份长得一样的字面量——手写第二份必然漂移，理由与
 * 「危险地形词表从 HAZARD_PRESETS 现场投影」逐字一致。
 *
 * 共享同一个数组对象是安全的：EnvironmentManager.applyTo 只读它，
 * 往 hero.effects 里 push 的是每次新造的对象，没有任何人原地改这几条 effect。
 *
 * 两条门槛不同，这正是「门槛挂在单条 effect 上、不挂在环境词上」的用武之地：
 * 攻防序列 9 就给，移动力要序列 6。
 */
const STORM_EFFECTS = [
    makeEnvBonus(ENV_SAILOR, 9, { stats: ['attack', 'defense'], per: 5 }),
    makeEnvBonus(ENV_SAILOR, 6, { div: 3 }),
];

const EnvironmentCatalog = {
    /**
     * 三份自然环境词表。做成 `{ 名称: 配置 }` 对象表而不是字符串数组，为的是每一项
     * 都能挂 effects。水系地貌、雨风天气、夜色三组现在**真的带数值**了（水手与
     * 不眠者各吃各的，见上面那几个工厂）；其余词条仍是空数组，只作叙事与回落底板。
     *
     * 自然环境与人工环境的两条关键差别：一、它按**吃效果那个人自己**的序列算幅度
     * （scaling: 'selfRank'），不像人工环境那样按施法者与目标的序列差；
     * 二、它按途径筛人，不分敌我——同一片海对两边的水手一样有用。
     *
     * 键序即书写序，投影进提示词时按这个顺序列。**刻意不分族**——按「地表 / 云雾 /
     * 地质」那样分组会诱导 LLM 按族均衡取样，而现实里绝大多数战场就是晴或多云。
     *
     * 三份表都不含「空」这个词：铺图失败时那一栏是 null，
     * 「空栏」与「词表里的某个值」是两种不同状态，不要混。
     */
    // 底子是中国气象局预报用的天气现象编码表（城市预报显示的就是这套字串）。
    // 删掉了不适合当状态用的两类：八条幅度区间（「小到中雨」那种，是预报在表达
    // 不确定性，不是一种确定天气）与两条泛指（「雨」「雪」）。雾并到两档、
    // 霾并到两档、沙尘只留沙尘暴，另补了预报里走风力字段的大风与风暴。
    // 「暴风雨」是**超出那张标准表**的一条有意添加：气象编码里没有这个词，
    // 它在这里表示狂风与暴雨同时发生，是唯一一条同时加攻击与防御的天气。
    //
    // 天气只服务水手途径，且**只加攻击力**（暴风雨是唯一的例外）。雨类序列 9 就解锁，
    // 风类要序列 6——大风 / 沙尘暴 / 风暴走 sailorWind 就是在表达这一条。
    WEATHER: {
        晴: { effects: [] },
        多云: { effects: [] },
        阴: { effects: [] },
        阵雨: { effects: [sailorRain(1)] },
        雷阵雨: { effects: [sailorRain(2)] },
        雷阵雨伴有冰雹: { effects: [sailorRain(2)] },
        小雨: { effects: [sailorRain(2)] },
        中雨: { effects: [sailorRain(3)] },
        大雨: { effects: [sailorRain(3)] },
        // 暴雨与大暴雨同值，是有意的：两者在气象编码里只差一个雨量区间，
        // 模型选哪个都不该让战局出现可感知的差别
        暴雨: { effects: [sailorRain(4, 5)] },
        大暴雨: { effects: [sailorRain(4, 5)] },
        特大暴雨: { effects: [sailorRain(5, 4)] },
        雨夹雪: { effects: [sailorRain(3)] },
        冻雨: { effects: [sailorRain(3)] },
        阵雪: { effects: [] },
        小雪: { effects: [] },
        中雪: { effects: [] },
        大雪: { effects: [] },
        暴雪: { effects: [] },
        雾: { effects: [] },
        大雾: { effects: [] },
        轻度霾: { effects: [] },
        重度霾: { effects: [] },
        沙尘暴: { effects: [sailorWind(5, 3)] },
        大风: { effects: [sailorWind(3, 4)] },
        风暴: { effects: [sailorWind(5, 3)] },
        // 唯一一条拆成两个条目的环境词：攻防序列 9 就给，移动力要序列 6。
        // 这也是「门槛挂在单条 effect 上、不挂在环境词上」这个设计的唯一用武之地——
        // 少了它，这两档门槛就只能各写一个环境词，而栏里只放得下一个词。
        // 也是唯一一条加防御力的天气。
        // 🆕 effects 提到了模块级的 STORM_EFFECTS：人工环境「暴风雨」（改变天气子类）
        // 与这一条共用同一份，不许在下面的 ENVS 里另抄一遍
        暴风雨: { effects: STORM_EFFECTS },
        无天气概念: { effects: [] },
    },

    // 指这块地整体覆盖着什么，与学术上的地貌分类不完全一致。逐格地形已经在表达
    // 移动难度与危险度，这一栏不再为所有人叠一层全局加成。
    // 刻意没有「无地貌」这个词：铺图失败时这一栏是 null，那是另一种状态。
    //
    // 带数值的只有水系那三档与高空，全部只服务水手途径，攻防速三项同幅。
    // 门槛不再是清一色的序列 9，所以逐档标注：
    //   深水（10%，多走 (10−X)/3 格，序列 9 起）：海洋、海上人造物
    //   淡水（8%， 多走 (10−X)/4 格，序列 9 起）：湖泊、江河、江河湖上的人造物
    //   近水（5%， 多走 (10−X)/5 格，序列 9 起）：海岸滩涂、湿地沼泽、江河湖附近与海边的人造物
    //   高空（8%， 多走 (10−X)/4 格，序列 6 起）：高空人造物。数值与淡水逐字相同，只是门槛更高
    // 「脚底是不是水」比「看得见水没有」重要：海船选海上人造物吃满档，
    // 海港灯塔只算近水，这与提示词里那八条人造词的释义是同一套划分。
    // 高空是唯一一条不看水的：脚底悬空，靠的是水手对风浪与颠簸的适应，
    // 所以门槛比水系高一档（序列 6 起），数值沿用淡水档。
    LANDFORM: {
        森林: { effects: [] },
        丛林: { effects: [] },
        草原: { effects: [] },
        农田: { effects: [] },
        荒原: { effects: [] },
        沙漠: { effects: [] },
        冰原: { effects: [] },
        湖泊: { effects: [waterLand(8, 4)] },
        江河: { effects: [waterLand(8, 4)] },
        海洋: { effects: [waterLand(10, 3)] },
        海岸滩涂: { effects: [waterLand(5, 5)] },
        湿地沼泽: { effects: [waterLand(5, 5)] },
        山地: { effects: [] },
        丘陵: { effects: [] },
        峡谷: { effects: [] },
        洞穴地下: { effects: [] },
        火山熔岩地带: { effects: [] },
        // 这八条的键**必须带引号**：全角括号不是合法的标识符字符，裸写会让整段脚本
        // 在解析期就报 SyntaxError，而且错的是整个 <script> 块、不只是这张表。
        // 词本身一个字都不能改——提示词要求「括号必须连同汉字原样抄」，
        // parseNatural 又是精确查表，改字就等于让这八个词永远命不中白名单。
        '人造建筑与载具（陆地上）': { effects: [] },
        '人造建筑与载具（江河湖上）': { effects: [waterLand(8, 4)] },
        '人造建筑与载具（江河湖附近）': { effects: [waterLand(5, 5)] },
        '人造建筑与载具（高空）': { effects: [skyLand(8, 4)] },
        '人造建筑与载具（海上）': { effects: [waterLand(10, 3)] },
        '人造建筑与载具（海边）': { effects: [waterLand(5, 5)] },
        '人造建筑与载具（宇宙中）': { effects: [] },
        '人造建筑与载具（灵界中）': { effects: [] },
        宇宙真空: { effects: [] },
        灵界: { effects: [] },
    },

    // 封闭七项，LLM 只能原样挑一个。「无时间概念」给灵界、宇宙真空、
    // 终年不见天日的地底这类没有昼夜之分的场景。
    // 带数值的只有夜色两档，且**不服务水手**——这一栏归不眠者途径，序列 9 就解锁，
    // 攻防速三项同幅。白天四档与「无时间概念」一律没有加成。
    TIME: {
        清晨: { effects: [] },
        上午: { effects: [] },
        中午: { effects: [] },
        下午: { effects: [] },
        夜晚: { effects: [nightTime(5, 4)] },
        深夜: { effects: [nightTime(7, 3)] },
        无时间概念: { effects: [] },
    },

    /**
     * 铺图 LLM 要填的那几栏，顺序即提示词里的小节顺序。
     * 神秘学环境**不在其中**：它不给 LLM，开局必空，只能由人工能力写入。
     */
    NATURAL_KINDS: ['地貌', '天气', '时间'],

    /**
     * 属性通道 → 角色卡上的显示名。一条 effect 写 stats 三项时，三条记录不能都叫
     * 同一个名字（角色卡上会出现三行「海洋·海之亲和」，看不出哪行是哪项），
     * 所以名字逐项从这里取。单项条目仍可用自己的 label 覆盖，见 applyTo。
     */
    STAT_LABELS: { attack: '攻击力', defense: '防御力', speed: '速度' },

    /** 栏位名 → 那一栏的自然环境词表。神秘学环境没有词表，返回 null */
    naturalTableOf(kind) {
        if (kind === TacticCatalog.ENV_KIND_LAND) return this.LANDFORM;
        if (kind === TacticCatalog.ENV_KIND_WEATHER) return this.WEATHER;
        if (kind === TacticCatalog.ENV_KIND_TIME) return this.TIME;
        return null;
    },

    /**
     * 人工环境表，键是**环境名**。它与 EnvironmentManager.SUBTYPES 的键（子类内部键）、
     * 以及 SUBTYPES[...].names 里的**能力名**是三样东西——无暗领域三者恰好同名，
     * 把区别整个藏住了，日后出现「以『嫁接』把天气改成暴雨」这种子类才分得开。
     * 写进栏位、进战报、当效果名前缀的一律是环境名。
     *
     * kind 是这一项**该落在哪一栏**。EnvironmentManager.writesOf 就是从这里推的，
     * SUBTYPES 那边不另写一份栏位声明——手写第二份必然漂移，理由与
     * 「危险地形词表从 HAZARD_PRESETS 现场投影」逐字一致。
     *
     * effects[] 各字段：
     * - stat / label：走哪条属性通道、在角色卡上显示成什么。效果名是
     *   `${环境名}·${label}`，与 RuleChangeManager 的 `${shownAs}·${param}` 同构
     * - base：同序列时的幅度。缺省落到 TacticCatalog.ENV_BASE
     * - scaling：枚举而不是写死公式。'seqDiff5' 是 clamp0(base + 序列差 × ENV_STEP)；
     *   'flat' 留作占位（固定值、不看序列差），当前没有任何条目使用。
     *   还有第三个值 'selfRank'（按吃效果者本人的序列算）。
     * - scope：作用对象。两个值，由 EnvironmentManager.inScope 现算，不写死在模板里：
     *   'both' 敌我双方都吃——友方记 buff、敌方记 debuff，符号由 signOf 逐目标现算；
     *   'foes' 只落在制造者**当前**的敌人头上，友方一条都不挂（梦境迷宫）。
     *   两者都随制造者倒戈而翻转，由 resync 整体重挂落实
     *
     * 🆕 本表**不再是清一色的 seqDiff5**。原先这里写着「selfRank 是自然环境专用的、
     * 本表一条都不该用」，那句话现在只对无暗领域与梦境迷宫成立：暴风雨这一条直接引用了
     * 自然天气那份 STORM_EFFECTS，走的就是 selfRank。
     * 两条路的分野是**效果与来源有没有关系**：
     * - seqDiff5（无暗领域、梦境迷宫）：有制造者，幅度看双方序列差、符号看双方当前阵营；
     * - selfRank（暴风雨）：谁造的都一样，幅度只看吃效果那个人自己、按途径筛人、敌我不分。
     *   走这条的条目用 pathway / title / titleRank / gate / per / move 那套字段，
     *   **不写 base / scope**——那两个只服务 seqDiff5。
     * EnvironmentManager.effectSpecFor 的 selfRank 分支排在 layer.artificial 判断**之前**，
     * 所以人工层挂 selfRank 效果不需要任何额外分支，这也正是「人工暴风雨与天然暴风雨
     * 完全相同」得以成立的原因。
     *
     * 🆕 另注意 `暴风雨` 这个键在本表与 WEATHER 里**同时存在**，这是有意的（同名同物、
     * 只是来源不同）。两条查表路径不交叉：人工走 envOf / kindOf，自然走
     * naturalTableOf / naturalEffectsOf，各取各的，不会互相顶到。
     *
     * 注意本表与三份自然词表的条目**不是同一套字段**（除非像暴风雨那样直接引用了自然那份）。
     * 自然那边按途径筛人，用的是 pathway / title / titleRank / gate 四个字段
     *（见 makeEnvBonus），逐条各判各的。两套在 EnvironmentManager.applyTo 里汇合，
     * 靠 scaling 分流。曾经在这里预留过一个 rules 匹配器字段，一直没有实现，
     * 现在筛人的活由自然那四个字段接了，所以把它去掉，免得误导。
     */
    ENVS: {
        无暗领域: {
            kind: '神秘学环境',
            desc: '驱散战场上的一切阴影，使光无处不达',
            effects: [
                { stat: 'attack', label: '攻击力', base: 20, scaling: 'seqDiff5', scope: 'both' },
                { stat: 'defense', label: '防御力', base: 20, scaling: 'seqDiff5', scope: 'both' },
            ],
        },
        // 🆕 虚假星空。复用无暗领域的 seqDiff5 幅度，只把作用面收窄为制造者当前的
        // 敌人，并且只走攻击力通道；友军一条效果都不挂。
        虚假星空: {
            kind: '神秘学环境',
            desc: '以虚假的星空覆盖战场，扰乱敌人对现实与进攻时机的判断',
            effects: [
                { stat: 'attack', label: '攻击力', base: 20, scaling: 'seqDiff5', scope: 'foes' },
            ],
        },
        // 🆕 梦境迷宫。与无暗领域同栏（神秘学环境只有一格，两者互顶）、同公式（seqDiff5），
        // 唯一的结构性差别是 scope：它只落在**制造者当前的敌人**头上，友方一条都不挂。
        // 这也是 'foes' 这个值的第一个使用者——在它之前 scope 字段从未被结算层读过。
        梦境迷宫: {
            kind: '神秘学环境',
            desc: '利用多个心灵拼凑迷宫',
            effects: [
                { stat: 'defense', label: '防御力', base: 20, scaling: 'seqDiff5', scope: 'foes' },
            ],
        },
        堕落之海: {
            kind: '神秘学环境',
            desc: '漆黑粘稠、满是堕落气息的海洋',
            effects: [
                { stat: 'attack', label: '攻击力', base: 20, scaling: 'seqDiff5', scope: 'foes' },
                { stat: 'defense', label: '防御力', base: 20, scaling: 'seqDiff5', scope: 'foes' },
                { stat: 'speed', label: '速度', base: 20, scaling: 'seqDiff5', scope: 'foes' },
            ],
        },
        // 🆕 人工暴风雨。effects 直接指向 WEATHER.暴风雨 用的那一份，一个字都不重写：
        // 「效果与天然的完全相同，只是来源不同」是这条子类的硬需求，抄第二份就等着漂移。
        // 于是它天然带上了自然那套语义——只服务水手与「上帝」、按各人自己的序列算、
        // 敌我不分（敌方的水手同样受益）、序列 6 及以上另给移动力。
        暴风雨: {
            kind: '天气',
            desc: '狂风与暴雨同时降临，这片战场的天气改写为暴风雨',
            effects: STORM_EFFECTS,
        },
        '神秘再现·理想乡': {
            kind: '神秘学环境',
            desc: '与普通世界隔绝、难由常规途径抵达的隐秘理想乡',
            effects: [{
                stat: 'damageTakenDecrease', label: '受到伤害', base: 50,
                scaling: 'flat', scope: 'allies',
            }],
        },
    },

    /** 环境名 → 配置。查不到返回 null，调用方自己兜 */
    envOf(name) {
        if (!name) return null;
        return Object.prototype.hasOwnProperty.call(this.ENVS, name) ? this.ENVS[name] : null;
    },

    /** 环境名 → 它该落在哪一栏。查不到返回空串 */
    kindOf(name) {
        const cfg = this.envOf(name);
        return cfg ? cfg.kind : '';
    },

    /**
     * 词表投影，供铺图提示词现场用，**不手写第二份**——手写必然漂移成
     * 「提示词里有、白名单里没有」。理由同 TerrainPainter.hazardVocab。
     */
    vocabLine(kind) {
        const table = this.naturalTableOf(kind);
        return table ? Object.keys(table).join('、') : '';
    },

    /** 四栏全空。铺图没跑、未配 API、请求失败、解析失败四条路径都落到这里 */
    emptyNatural() {
        const out = {};
        TacticCatalog.ENV_KINDS.forEach(kind => { out[kind] = null; });
        return out;
    },

    /**
     * 归一化铺图 LLM 给的自然环境。口径照 TerrainPainter.parseWeaponClasses 的
     * **纯白名单**：逐项查表、不在表里就把那一项丢成 null、绝不否决主任务。
     * 刻意**不**照 parseProps——那一条是让 LLM 自由起名、自由给数量，
     * 与自然环境「只能从清单里原样挑一个」正好相反。
     *
     * 三项各自独立：天气写错了不影响地貌与时间。
     * 神秘学环境恒为 null——它压根不给 LLM。
     *
     * 「LLM 不能配置环境的参数」是这个函数的形状保证的，不靠提示词自觉：它只读三个
     * 字段、只当字符串查表，模型就算吐 { "天气": { "名称": "暴雨", "攻击力": -20 } }，
     * 那个对象转成字符串也命不中白名单，整项落空。效果永远只从本模块的表里取。
     */
    parseNatural(raw) {
        const out = this.emptyNatural();
        if (!raw || typeof raw !== 'object') return out;
        this.NATURAL_KINDS.forEach(kind => {
            const table = this.naturalTableOf(kind);
            if (!table) return;
            const name = String(raw[kind] ?? '').trim();
            if (!name) return;
            if (!Object.prototype.hasOwnProperty.call(table, name)) {
                console.warn(`[环境] 自然环境「${kind}」不在白名单里，丢弃这一项:`, name);
                return;
            }
            out[kind] = name;
        });
        return out;
    },

    /**
     * 某一栏的自然值该挂哪些效果。水系地貌、雨风天气、夜色三组各有条目，
     * 其余词条仍是空数组。取出来的条目**不分敌我**，能不能吃到由每条自己的
     * pathway / title / gate 说了算，见 EnvironmentManager.eligibleRankFor。
     */
    naturalEffectsOf(kind, name) {
        const table = this.naturalTableOf(kind);
        if (!table || !name || !Object.prototype.hasOwnProperty.call(table, name)) return [];
        return table[name].effects || [];
    },
};

const EnvironmentManager = {
    /** 引擎永远匹配不到的计时 timing，与 mythic_form / enemy_control / rule_change 同一手法 */
    TIMING: 'environment',
    /** 展示用的持续回合。各处 BUFF 栏都读 duration，给个大数才不会显示成「还剩 0 回合」 */
    DURATION: 9999,

    /**
     * 子类配置。字段各有讲究：
     * - names 是**能力名**的别名阶梯，交给 AbilityAlias 按途径片段的 rank 分档
     * - envs 是这条子类写入的**环境名**（EnvironmentCatalog.ENVS 的键）。
     *   写哪几栏由 writesOf 从 ENVS[名].kind 推导，这里**不**另写一份栏位声明
     * - persistAfterDeath 为真时制造者阵亡也不回落。sweep 只读这一个字段，
     *   所以要做死后不消失的子类，把它改成 true 就够，sweep 那边一行都不用动
     * - 🆕 skipIfSameEnv 为真时，NPC 见到「要写的那几栏已经就是这几个环境了」就不发。
     *   **只给「效果与来源无关」的子类打开**，判据与理由见 npcSubtypePool
     * - 🆕 cost { stat, ratio }：扣哪一项、按序列平均值的几成。省略就回落大类那条
     *   老路（TacticCatalog.envChangeCost，灵性 5%），所以无暗领域与改变天气不必写。
     *   梦境迷宫靠它把消耗换成人性。形状与 FieldEffectManager 的同名字段逐字一致
     *
     * 🆕 文案三槽。定这条规矩的原因：每条子类的效果几乎都不一样，把描述效果的话
     * 写在大类里，新子类漏改就会**言之凿凿地说错**。所以划一条线——
     * **一句话只要提到了幅度、受益者或敌我方向，它就归子类，且大类没有缺省**。
     * 漏写只会少说一句，不会说错话。反过来，只讲「谁把哪一栏改成了什么、被谁顶替、
     * 回落成什么」的结构性文案对任何子类都成立，留在大类（结果页那几行与
     * writeReport 的四条模板）。
     * - effectNote(ctx) -> string：参数区的效果说明。缺省不说
     * - previewNote(ctx) -> string：参数区的逐人预览块。返回空串或缺省都不画这一块。
     *   seqDiff5 那一族共用 EnvironmentManager.seqDiffPreviewNote
     * - report[stage](r) -> string：战报覆盖，stage 为 start / replaced /
     *   expire-empty / expire-natural。缺省落到 TacticResolver.writeReport 里的
     *   结构性模板，写法与 ExtraActionManager.report.tactic 那处逐字同构
     * ctx = { bm, hero, subtype, shownAs, cfg }
     *
     * 对象的 key 是**内部键**，玩家永远看不到；一切流转（栏位记录、NPC 的 hits、
     * UI 的 dataset）都走它，能力名一律现调 displayName。
     * 无暗领域与梦境迷宫的内部键、能力名、环境名三者恰好同名，这把区别整个藏住了；
     * 🆕 改变天气是**第一条把它们拆开的子类**——内部键与能力名是「改变天气」，
     * 环境名是「暴风雨」。写进栏位与效果名的是环境名，进结果页与「以……」句式的
     * 是能力名，加新子类时别混。
     */
    SUBTYPES: {
        无暗领域: {
            pathway: '歌颂者',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 4, name: '无暗领域' }],
            envs: ['无暗领域'],
            persistAfterDeath: false,
            desc: '驱散战场上的一切阴影，使光无处不达',
            // 🆕 原本写死在参数区的那段幅度说明，搬到这里来。它讲的是 seqDiff5 的公式，
            // 只对本子类成立，留在大类会坑到下一条子类
            effectNote: () =>
                `幅度按你与目标的序列差算（同序列 ${TacticCatalog.ENV_BASE}%，`
                + `目标每弱一个序列多 ${TacticCatalog.ENV_STEP}%，`
                + `每强一个序列少 ${TacticCatalog.ENV_STEP}%，最低 ${TacticCatalog.ENV_MIN_PCT}%，无上限）。`
                + `我方受益、敌方受损。`,
            previewNote: ctx => EnvironmentManager.seqDiffPreviewNote(ctx),
        },
        // 🆕 虚假星空：通识者序列 5 起，「知识之妖」按旧日档记。
        // 与无暗领域同写神秘学环境、同走 seqDiff5 和缺省灵性 5% 消耗；差别只有
        // scope: 'foes' 且仅降低攻击力。不能开 skipIfSameEnv：敌方造的同名环境正压着
        // 我方，覆盖后取得环境归属权、把减益转向对面，本身就是有意义的行动。
        虚假星空: {
            pathway: '通识者',
            title: '知识之妖',
            titleRank: -1,
            names: [{ gate: 5, name: '虚假星空' }],
            envs: ['虚假星空'],
            persistAfterDeath: false,
            desc: '以虚假的星空覆盖战场，扰乱敌人对现实与进攻时机的判断',
            previewStatsLabel: '攻击力',
            effectNote: () =>
                `幅度按你与目标的序列差算（同序列 ${TacticCatalog.ENV_BASE}%，`
                + `目标每弱一个序列多 ${TacticCatalog.ENV_STEP}%，`
                + `每强一个序列少 ${TacticCatalog.ENV_STEP}%，最低 ${TacticCatalog.ENV_MIN_PCT}%，无上限）。`
                + `只对敌人生效，降低其攻击力。`,
            previewNote: ctx => EnvironmentManager.seqDiffPreviewNote(ctx),
        },
        // 🆕 梦境迷宫：观众序列 3 起，「上帝」按 titleRank -2 记档、任何途径的上帝都能用。
        // 与无暗领域**同写神秘学环境**，而那一栏只有一格，所以两者天然互顶——后发的
        // 顶掉先发的，这是栏位规则的自然结果，不为它另设排他。
        // 与无暗领域的两条差别：
        // 一、只降敌人的防御力（ENVS.梦境迷宫 的 scope: 'foes'），友方一条都不挂；
        // 二、消耗走**人性**而不是灵性（cost 字段，比例与无暗领域同为 5%）。
        // 拼点两边仍是 bestStat（六项当前值加运气里最高的一项），与大类其余子类一致：
        // 扣的人性若恰好是最高项，出手点数才会跟着降。
        // skipIfSameEnv 刻意**不写**，理由与无暗领域逐字相同：符号是 signOf / scope 现查
        // 制造者当前阵营算的，敌方造的那一份正压着我方，覆盖它把矛头转过去恰恰是该做的事。
        梦境迷宫: {
            pathway: '观众',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 3, name: '梦境迷宫' }],
            envs: ['梦境迷宫'],
            persistAfterDeath: false,
            // 🆕 全库第一条不走大类缺省消耗项的子类。形状照 FieldEffectManager 的
            // cost: { stat, ratio }，缺省仍回落 TacticCatalog.ENV_CASTER_STAT
            cost: { stat: '人性', ratio: TacticCatalog.ENV_RATIO },
            desc: '利用多个心灵拼凑迷宫',
            // 幅度公式与无暗领域逐字相同，只有最后一句不同：迷宫不给自己人任何好处
            effectNote: () =>
                `幅度按你与目标的序列差算（同序列 ${TacticCatalog.ENV_BASE}%，`
                + `目标每弱一个序列多 ${TacticCatalog.ENV_STEP}%，`
                + `每强一个序列少 ${TacticCatalog.ENV_STEP}%，最低 ${TacticCatalog.ENV_MIN_PCT}%，无上限）。`
                + `只对敌人生效，降低其防御力。`,
            // 同族（seqDiff5）共用那份预览。previewFor 认得 scope: 'foes'，
            // 于是名单里只会出现敌人，「我方将受益」那一行因空数组自然不画
            previewNote: ctx => EnvironmentManager.seqDiffPreviewNote(ctx),
        },
        展开堕落领域: {
            pathway: '秘祈人',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 1, name: '展开堕落领域' }],
            envs: ['堕落之海'],
            persistAfterDeath: false,
            cost: { stat: '灵性', ratio: 0.10 },
            desc: '变出漆黑粘稠、满是堕落气息的「海洋」',
            previewStatsLabel: '攻击力、防御力、速度',
            effectNote: () =>
                `幅度按你与目标的序列差算（同序列${TacticCatalog.ENV_BASE}%，`
                + `目标每弱一个序列多${TacticCatalog.ENV_STEP}%，`
                + `每强一个序列少${TacticCatalog.ENV_STEP}%，最低${TacticCatalog.ENV_MIN_PCT}%，无上限）。`
                + `只对敌人生效，降低其攻击力、防御力与速度；速度只影响行动顺序，不影响棋盘移动力。`,
            previewNote: ctx => EnvironmentManager.seqDiffPreviewNote(ctx),
            report: {
                start: r => `${r.actor}展开堕落领域，漆黑粘稠、满是堕落气息的「海洋」淹没了战场。`,
                replaced: r => `原本笼罩战场的「${r.replaced}」被堕落之海吞没。`,
                'expire-empty': r => `随着${r.actor}死亡，堕落之海退去，战场的神秘学环境重归空无。`,
                'expire-natural': r => `随着${r.actor}死亡，堕落之海退去，战场的神秘学环境重归${r.fallback}。`,
            },
        },
        // 🆕 改变天气：把天气栏改写成暴风雨。效果与天然的暴风雨**完全相同**，
        // 只是来源不同——ENVS.暴风雨 直接引用了 WEATHER.暴风雨 那份 effects。
        // 于是它整条走 selfRank：只服务水手与「上帝」、按各人自己的序列算、敌我不分。
        // 资格是水手序列 4 起；「上帝」按 titleRank -2 记档，任何途径的上帝都能用。
        改变天气: {
            pathway: '水手',
            title: '上帝',
            titleRank: -2,
            names: [{ gate: 4, name: '改变天气' }],
            envs: ['暴风雨'],
            persistAfterDeath: false,
            // 天气已经是暴风雨了就没必要再来一发：这条子类的效果与谁造的无关，
            // 覆盖只是换个「谁死了它消失」，NPC 不该为此白花一轮动作位与灵性
            skipIfSameEnv: true,
            desc: '唤来狂风与暴雨，将这片战场的天气改写成暴风雨',
            effectNote: () =>
                '效果与自然形成的暴风雨完全相同：场上的水手（以及带「上帝」称号者）'
                + '按自己的序列获得攻击力与防御力加成，序列 6 及以上另外获得移动力加成。'
                + '这场雨不分敌我，敌方的水手同样受益。',
            // 逐人预览按 seqDiff5 的公式算，对本子类是错的；这里不画那一块，
            // 只在参数区留一句「场上的天气将变成暴风雨」（由 renderEnvOptions 现拼）
            previewNote: () => '',
            report: {
                start: r => `${r.actor}抬手唤来狂风与暴雨，这片战场的天气成为暴风雨。`,
                replaced: r => `原本笼罩战场的「${r.replaced}」被这场暴风雨冲散。`,
                // 两条 expire 不写，落大类的结构性模板
            },
        },
        '神秘再现·理想乡': {
            catalogId: 'avalon_utopia',
            envs: ['神秘再现·理想乡'],
            persistAfterDeath: false,
            skipIfSameEnv: false,
            cost: { stat: '灵性', ratio: 0.10 },
            desc: '把战场的神秘学环境改写成与普通世界隔绝的理想乡。',
            previewStatsLabel: '受到伤害',
            effectNote: () => '只对当前友军生效，使其受到的伤害降低50%；制造者阵营改变时作用对象会同步改变。',
            previewNote: () => '',
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    /**
     * 这条子类会写哪几栏。从环境自己的 kind 推导，**不手写第二份**——
     * 手写必然漂移成「声明写天气栏，指向的环境却是地貌」。
     */
    writesOf(subtype) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !Array.isArray(cfg.envs)) return [];
        return cfg.envs.map(n => EnvironmentCatalog.kindOf(n)).filter(k => !!k);
    },

    /** 这条子类往某一栏写的是哪个环境。栏位与环境一一对应，所以 find 就够 */
    envNameFor(subtype, kind) {
        const cfg = this.SUBTYPES[subtype];
        if (!cfg || !Array.isArray(cfg.envs)) return '';
        return cfg.envs.find(n => EnvironmentCatalog.kindOf(n) === kind) || '';
    },

    // ---------- 运行期状态 ----------

    /**
     * 状态挂在 BattleManager 上。与规则修改用数组不同：栏位固定四个、各一格，
     * 没有入栏顺序可排，键值对更贴合。
     * natural 是开局铺图给的底板，人工环境撤掉时回落到它。
     * pendingLines / pendingResults 的理由同 RuleChangeManager：战术面板打开时也会
     * sweep 一次，那一次的产出没有地方写，攒着等本轮结算时一并倒出来。
     */
    ensure(bm) {
        if (!bm.environment) {
            bm.environment = {
                natural: EnvironmentCatalog.emptyNatural(),
                slots: {},
                seq: 0,
                pendingLines: [],
                pendingResults: [],
            };
        }
        const st = bm.environment;
        if (!st.natural) st.natural = EnvironmentCatalog.emptyNatural();
        if (!st.slots) st.slots = {};
        TacticCatalog.ENV_KINDS.forEach(kind => {
            if (st.slots[kind] === undefined) st.slots[kind] = null;
        });
        if (!st.pendingLines) st.pendingLines = [];
        if (!st.pendingResults) st.pendingResults = [];
        return st;
    },

    /**
     * 开场把 board.naturalEnv 记成四栏底板，四个人工栏清空。
     * 末尾那次 resync 不是走过场：铺图给的地貌 / 天气 / 时间只要命中带数值的那几档，
     * 场上的水手与不眠者当场就要挂上攻防速，移动力加成也在那一步写进 envMoveBonus。
     * 所以 startBattle 里它**必须排在 refreshAllMovement 之前**。
     */
    initSlots(bm) {
        const st = this.ensure(bm);
        st.natural = (bm.board && bm.board.naturalEnv) || EnvironmentCatalog.emptyNatural();
        TacticCatalog.ENV_KINDS.forEach(kind => { st.slots[kind] = null; });
        st.seq = 0;
        st.pendingLines = [];
        st.pendingResults = [];
        this.resync(bm);
        return st;
    },

    slotsOf(bm) {
        return this.ensure(bm).slots;
    },

    naturalOf(bm) {
        return this.ensure(bm).natural;
    },

    /** 某一栏的人工条目。没有人工环境时是 null（可能垫着自然底板，也可能是空栏） */
    slotEntryOf(bm, kind) {
        return this.ensure(bm).slots[kind] || null;
    },

    /** 某一栏开局的自然值。没有就是 null */
    naturalValueOf(bm, kind) {
        const n = this.ensure(bm).natural || {};
        return n[kind] || null;
    },

    /**
     * 某一栏当前是什么状态。参数区那句「当前是……」与环境栏面板的三个分支都按它取。
     * @returns {{state: 'artificial'|'natural'|'empty', name: string, entry: Object|null}}
     */
    slotStateOf(bm, kind) {
        const entry = this.slotEntryOf(bm, kind);
        if (entry) return { state: 'artificial', name: entry.envName, entry };
        const nat = this.naturalValueOf(bm, kind);
        if (nat) return { state: 'natural', name: nat, entry: null };
        return { state: 'empty', name: '', entry: null };
    },

    findHero(bm, heroId) {
        if (!bm || !heroId) return null;
        return bm.teamManager.getAllHeroes().find(h => h.heroId === heroId) || null;
    },

    // ---------- 资格与显示名 ----------

    eligibility(hero) {
        const raw = AbilityAlias.resolve(hero && hero.sequenceString, this.SUBTYPES);
        Object.keys(raw).forEach(k => {
            const cfg = this.SUBTYPES[k];
            if (cfg && cfg.catalogId
                && MysteryReenactmentCanonAccess.canUseTactic(hero, cfg.catalogId)) {
                raw[k] = { ok: true, rank: Number(hero && hero.sequenceRank), name: k };
            }
        });
        return raw;
    },

    /** 这个人解锁了哪几条子类，返回的是内部键 */
    availableSubtypes(hero) {
        const e = this.eligibility(hero);
        return this.subtypes().filter(k => e[k] && e[k].ok);
    },

    eligible(hero) {
        return this.availableSubtypes(hero).length > 0;
    },

    /**
     * 内部键 → 这个人该看到的**能力名**。解析不出来时（比如施法者已经离场，
     * 而栏里那条还要显示）退回该子类最强档的名字，不暴露内部键。
     */
    displayName(hero, subtype) {
        const e = this.eligibility(hero)[subtype];
        if (e && e.ok && e.name) return e.name;
        const cfg = this.SUBTYPES[subtype];
        if (!cfg) return String(subtype);
        return AbilityAlias.nameOf(cfg, subtype, AbilityAlias.titleRankOf(cfg)) || String(subtype);
    },

    canUse(bm, hero) {
        return !!hero && this.eligible(hero);
    },

    // ---------- 消耗 ----------
    // 比例一律 5%，扣的是哪一项**按子类走**：缺省是大类的灵性，子类写了 cost 就用它的
    //（梦境迷宫扣人性）。成败都扣。形状照 FieldEffectManager 的 cost: { stat, ratio }，
    // 那边同样是「子类各扣各的、缺省回落灵性」。
    //
    // ⚠️ 这一族方法全部**必须带 subtype**：不传就只能按大类缺省算，观众发梦境迷宫时
    // 会去查灵性，闸门、资源行、估点三处会与真正扣掉的那一项对不上。

    statKeyOf(subtype) {
        const cfg = this.SUBTYPES[subtype];
        return (cfg && cfg.cost && cfg.cost.stat) || TacticCatalog.ENV_CASTER_STAT;
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    /**
     * 一次发动一份价钱，**与写几栏无关**（同 TacticCatalog.envChangeCost 的注释）。
     * 子类写了 cost 就按它那一项的序列平均值算；没写的回落大类那条老路，
     * 于是无暗领域与改变天气的数值一个子儿都不变。
     */
    costOf(hero, subtype) {
        const cfg = this.SUBTYPES[subtype];
        const c = cfg && cfg.cost;
        if (!c || !c.stat) return TacticCatalog.envChangeCost(hero && hero.sequenceRank);
        const attrs = ConsumableMoveBuilder.getAvgAttrs(hero && hero.sequenceRank);
        return Math.max(1, Math.round((attrs[c.stat] ?? 0) * (Number(c.ratio) || 0)));
    },

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

    /** 这个人有没有**任何**一条子类是付得起的。大类级闸门与 NPC 那道总闸用它 */
    hasStatForAny(hero) {
        return this.availableSubtypes(hero).some(k => this.hasStat(hero, k));
    },

    // ---------- 拼点 ----------

    casterStatOf(hero) {
        return EnemyControlManager.bestStat(hero);
    },

    /**
     * 扣费之后的出手点数。被扣的那一项恰好是最高项时它会跟着降，所以不能拿扣费前的
     * 值去估。这里的属性清单必须与 EnemyControlManager.bestStat 保持一致。
     *
     * 🆕 减的是**这条子类真正扣的那一项**，不再写死灵性：梦境迷宫扣人性，
     * 写死灵性会让闸门按一个根本不会发生的扣减去估上界。
     */
    casterStatAfterCost(hero, subtype) {
        const s = (hero && hero.additionalStats) || {};
        const cost = this.costOf(hero, subtype);
        const field = this.fieldOf(this.statKeyOf(subtype));
        const cut = key => Math.max(0, (s[key] ?? 0) - (key === field ? cost : 0));
        return Math.max(
            cut('当前活力'), cut('当前敏捷'), cut('当前灵性'),
            cut('当前理智'), cut('当前人性'), s.运气 ?? 0,
        );
    },

    /**
     * 会来阻挠的人：有**同大类**能力，或阅读者达到序列6的存活敌人。
     * 同大类能力者仍不论他能改哪一栏。
     * 昏迷 / 呆滞的排除掉——神志都不清了谈不上跟人争夺环境；
     * 因附身离场的**不**排除，他的意识还在场上活动，只是没有身体。
     * 与 RuleChangeManager.rivals 逐字同构。
     *
     * 注意判据是**同大类、不论子类**：歌颂者的无暗领域拦得住观众的梦境迷宫，
     * 反过来也一样。三条子类的资格途径各不相同（歌颂者 / 观众 / 水手），所以
     * 绝大多数战斗里这里仍是空数组、拼点直接成立、尾巴写成「场上没有对抗者」。
     * 这个大类事实上几乎必成，是已知且接受的。
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

    /**
     * 逐个拼点，全部严格大于才成功。一个够格的敌人都没有时无人可争，直接成立。
     * @param {number} casterStat 已扣费之后的出手点数
     */
    contest(bm, caster, casterStat) {
        const rolls = this.rivals(bm, caster).map(rival => ({
            rival,
            roll: EnemyControlManager.contest(
                caster, rival, 1, casterStat, EnemyControlManager.bestStat(rival),
            ),
        }));
        return { win: rolls.every(r => r.roll.win), rolls };
    },

    /**
     * 理论上能不能赢下**每一个**对手。有一个赢不了就别让人白扣一份资源。
     * 🆕 带 subtype：估上界要按这条子类真正扣的那一项算，见 casterStatAfterCost。
     */
    canPossiblyWinAll(bm, caster, subtype) {
        const after = this.casterStatAfterCost(caster, subtype);
        return this.rivals(bm, caster).every(rival =>
            EnemyControlManager.canPossiblyWin(
                caster, rival, 1, after, EnemyControlManager.bestStat(rival),
            ));
    },

    contestTail(rolls) {
        if (!rolls || !rolls.length) return '（场上没有对抗者）';
        return '（拼点 ' + rolls
            .map(r => `${r.rival.name} ${r.roll.casterScore}:${r.roll.targetScore}`)
            .join('；') + '）';
    },

    // ---------- 幅度与符号 ----------

    /**
     * 幅度：clamp0(base + (目标 rank − 制造者 rank) × ENV_STEP)，下限 0、**无上限**。
     * 序列数字越小越强，所以打比自己弱的人差值为正、效果放大；打更强的人衰减到 0。
     * 读原始 sequenceRank 而不是 ceil 分档值，小数序列直接参与运算。
     *
     * casterRank 取条目缓存的那一份而不是现查活对象：序列数字终生不变，缓存是安全的，
     * 而且制造者死了（persistAfterDeath 的子类）也照样算得出。
     */
    powerOf(casterRank, target, base) {
        const a = Number(casterRank);
        const b = Number(target && target.sequenceRank);
        const diff = (Number.isFinite(a) && Number.isFinite(b)) ? (b - a) : 0;
        const from = Number.isFinite(Number(base)) ? Number(base) : TacticCatalog.ENV_BASE;
        return Math.max(TacticCatalog.ENV_MIN_PCT, Math.round(from + TacticCatalog.ENV_STEP * diff));
    },

    /** 幅度归零的临界序列差。参数区那句「序列高于你 N 阶以上」用它，不写死 */
    zeroDiffOf() {
        return Math.floor(TacticCatalog.ENV_BASE / (TacticCatalog.ENV_STEP || 1));
    },

    /**
     * 符号：与制造者同阵营记 buff，异阵营记 debuff。
     * **必须现查活着的制造者**——他倒戈之后整份 buff/debuff 要跟着互换（幅度不变，
     * 序列差是固定关系），读条目缓存的阵营就永远翻不过来。
     * 只有「已死 + persistAfterDeath」时没有当前阵营可读，才退回 entry.casterTeam。
     */
    signOf(bm, entry, target) {
        const caster = this.findHero(bm, entry.casterId);
        if (caster && TacticResolver.alive(caster)) {
            return EnemyControlManager.isEnemyOf(caster, target) ? 'debuff' : 'buff';
        }
        return (target && target.teamType !== entry.casterTeam) ? 'debuff' : 'buff';
    },

    /** 这一栏算谁的。制造者活着读他当前的 teamType；已死则退回条目记的那一份 */
    ownerSideOf(bm, entry) {
        if (!entry) return null;
        const caster = this.findHero(bm, entry.casterId);
        if (caster && TacticResolver.alive(caster)) {
            return caster.teamType === 'ally' ? 'ally' : 'enemy';
        }
        return entry.casterTeam === 'ally' ? 'ally' : 'enemy';
    },

    // ---------- 效果落地 ----------

    /**
     * 某一栏当前该挂什么。人工条目优先，否则自然底板，都没有就 null。
     * 返回的「层」把人工与自然两种来源抹平成同一形状，applyTo / resync 就不必分支。
     */
    layerOf(bm, kind) {
        const entry = this.slotEntryOf(bm, kind);
        if (entry) {
            const cfg = EnvironmentCatalog.envOf(entry.envName);
            return {
                artificial: true,
                slotId: entry.id,
                kind,
                envName: entry.envName,
                effects: (cfg && cfg.effects) || [],
                casterId: entry.casterId,
                casterRank: entry.casterRank,
                casterTeam: entry.casterTeam,
            };
        }
        const name = this.naturalValueOf(bm, kind);
        if (!name) return null;
        return {
            artificial: false,
            slotId: `env-nat-${kind}`,
            kind,
            envName: name,
            effects: EnvironmentCatalog.naturalEffectsOf(kind, name),
            casterId: null,
            casterRank: null,
            casterTeam: null,
        };
    },

    /**
     * 这个人在某条自然环境条目眼里算第几序列，也就是公式里的 X。查不到返回 null。
     *
     * 先查称号：支柱与旧日在 parseSequenceRank 眼里**没有途径可言**（它见到「支柱」
     * 「旧日」就直接返回 -2 / -1，片段里根本解析不出途径名），所以顶端两档只能靠
     * 称号认，titleRank 就是它该记的档。「上帝」跨五途径、「永恒之暗」兼罩战士，
     * 这是全库既有约定（见 WeaponAccuracy.TITLES 那段注释），这里照收不另设排他。
     *
     * 否则拆片段找同途径的最小 rank——序列数字越小越强，混途径角色按他最强的
     * 那一段算，口径与 AbilityAlias.resolve 逐字一致。
     *
     * 条目既不写 pathway 也不写 title 时返回 null，也就是**谁都吃不到**。
     * 刻意不退化成「不限途径、按本人序列算」：那样一条漏填 pathway 的配置会
     * 悄悄给全场每个人加成，比整条不生效难发现得多。
     */
    selfRankOf(hero, effect) {
        const s = String((hero && hero.sequenceString) || '');
        if (!s || !effect) return null;
        if (effect.title && s.includes(effect.title)) {
            const t = Number(effect.titleRank);
            return Number.isFinite(t) ? t : null;
        }
        if (!effect.pathway) return null;
        let best = null;
        LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r || r.pathwayShort !== effect.pathway) return;
            const rank = Number(r.rank);
            if (!Number.isFinite(rank)) return;
            if (best === null || rank < best) best = rank;
        });
        return best;
    },

    /**
     * 这个人吃不吃得到这一条。吃得到返回他该用的 X，够不着返回 null。
     * 门槛挂在**单条 effect** 上而不是挂在环境词上：暴风雨的攻防是序列 9 解锁、
     * 移动力是序列 6 解锁，同一个词要两条不同门槛，栏里又只放得下一个词。
     */
    eligibleRankFor(hero, effect) {
        const x = this.selfRankOf(hero, effect);
        if (x === null || !Number.isFinite(x)) return null;
        const gate = Number(effect.gate);
        if (Number.isFinite(gate) && x > gate) return null;
        return x;
    },

    /**
     * 效果名后缀。一条 effect 写了 stats 三项时**逐项取属性名**，否则角色卡上会
     * 出现三行一模一样的「海洋·海之亲和」，看不出哪行是哪项。
     * 单项条目仍可用自己的 label 覆盖——无暗领域就是那样写的。
     */
    labelFor(effect, stats, stat) {
        if (stats.length === 1 && effect.label) return effect.label;
        return EnvironmentCatalog.STAT_LABELS[stat] || effect.label || stat;
    },

    /**
     * 🆕 这条效果落不落到这个人头上。scope 从此**真的被读**（在梦境迷宫之前它是个
     * 死字段，敌我全靠 signOf 分符号）：
     *   'foes'  只落在制造者**当前**的敌人头上，友方一条都不挂（梦境迷宫）
     *   其余    敌我双方都吃（无暗领域的 'both'，以及自然层那些压根不写 scope 的条目）
     *
     * 判据与 signOf 逐字同源，也必须同源：现查活着的制造者，他倒戈之后矛头跟着转，
     * 由 resync 整体重挂落实；只有「已死 + persistAfterDeath」时没有当前阵营可读，
     * 才退回条目缓存的 casterTeam。
     *
     * 自然层没有制造者（casterId 与 casterTeam 都是 null），「谁的敌人」无从判断，
     * 所以 'foes' 条目落到自然层时一律当**谁都不落**。刻意不退化成「所有人都吃」：
     * 取舍与 selfRankOf 那句「条目既不写 pathway 也不写 title 就谁都吃不到」一致——
     * 一条配错的条目整条不生效，比悄悄给全场加成好查。
     */
    inScope(bm, layer, effect, target) {
        if (!effect || !effect.scope || effect.scope === 'both') return true;
        if (effect.scope !== 'foes' && effect.scope !== 'allies') return false;
        if (!layer || !target) return false;
        const caster = this.findHero(bm, layer.casterId);
        if (caster && TacticResolver.alive(caster)) {
            const enemy = EnemyControlManager.isEnemyOf(caster, target);
            return effect.scope === 'foes' ? enemy : !enemy;
        }
        if (!layer.casterTeam) return false;
        const enemy = target.teamType !== layer.casterTeam;
        return effect.scope === 'foes' ? enemy : !enemy;
    },

    /**
     * 算一条效果落到某个人身上的符号与幅度。三条路：
     * 人工环境：符号看双方当前阵营，幅度按施法者与目标的序列差（scaling: 'seqDiff5'）。
     * 自然环境的 selfRank：符号恒取模板自己的 type（自然环境不分敌我——同一片海
     *   对两边的水手一样有用），幅度只看**吃效果那个人自己**有多强，与谁「造」了
     *   这片海无关，因为海本来就不是谁造的。够不着门槛或不在途径上就是 0。
     * 自然环境的其余情形：固定值，留给日后不按序列缩放的词条。
     *
     * 三条路之前还有一道与算法正交的 scope 闸门（见 inScope）：不在作用范围内的人
     * 直接拿 0，连算都不算。
     * @returns {{type: string, power: number}}
     */
    effectSpecFor(bm, hero, layer, effect) {
        const flat = Math.max(0, Math.round(Number(effect.base) || 0));
        // 🆕 scope 闸门排在**所有分支之前**：不在作用范围内的人一律 0 幅度，
        // applyTo 见到 0 就不挂条目。放最前面是有意的——它与算法（seqDiff5 /
        // selfRank / flat）是两件正交的事，日后哪条子类都可能想限定作用对象
        if (!this.inScope(bm, layer, effect, hero)) return { type: 'debuff', power: 0 };
        if (effect.scaling === 'selfRank') {
            const x = this.eligibleRankFor(hero, effect);
            if (x === null) return { type: 'buff', power: 0 };
            const per = Number(effect.per) || 0;
            const power = Math.round((TacticCatalog.ENV_SELF_ZERO_RANK - x) * per);
            return {
                type: effect.type === 'debuff' ? 'debuff' : 'buff',
                power: Math.max(0, power),
            };
        }
        if (!layer.artificial) {
            return { type: effect.type === 'buff' ? 'buff' : 'debuff', power: flat };
        }
        if (effect.scaling === 'flat') {
            return { type: this.signOf(bm, layer, hero), power: flat };
        }
        return {
            type: this.signOf(bm, layer, hero),
            power: this.powerOf(layer.casterRank, hero, effect.base),
        };
    },

    /**
     * 把一层的效果挂到一个人身上。直接 push 进 hero.effects，不走
     * EffectManager.applyEffect：它按固定字段白名单重建实例，environment 与 slotId
     * 会被丢掉，而摘除时就是靠 slotId 找回来的。理由同 RuleChangeManager.applyTo。
     *
     * 一条 effect 可以同时走两条互不相干的通道：
     *   属性（stats / 老式单 stat）→ 进 hero.effects，最后由 AttributeCalculator 求和
     *   移动力（move.div）        → 只累加 hero.envMoveBonus，**不进 hero.effects**
     * 移动力必须另走一路：stat:'speed' 只管出手顺序，管不了走几格，而且
     * MovementCalculator 要在钳完 MIN/MAX 之后才加它，否则会被 MAX_MOVE 整个吃掉。
     * 所以条目可以只有 move 没有 stats（暴风雨的第二条就是），那种条目在属性通道里
     * 什么都不产出。
     *
     * 幅度算出 0 的不挂：免得往 hero.effects 里塞一堆 0% 条目。
     * 效果名前缀是**环境名**而不是能力名。
     */
    applyTo(bm, hero, layer) {
        if (!hero || !layer || !Array.isArray(layer.effects) || !layer.effects.length) return;
        hero.effects = hero.effects || [];
        layer.effects.forEach(effect => {
            if (!effect) return;
            // 🆕 作用范围闸门。属性通道由 effectSpecFor 里那一道管（算出 0 就不挂），
            // 移动力通道压根不走 effectSpecFor，所以这里必须再挡一次——两条通道
            // 各判各的门槛，但「落不落在这个人头上」对两者是同一句话。
            // 现有 'foes' 条目都不带 move，这一道是为日后「只拖慢敌人」那类条目留的
            if (!this.inScope(bm, layer, effect, hero)) return;
            // 新条目写 stats 数组，无暗领域那种老式条目写单个 stat，两者都收
            const stats = Array.isArray(effect.stats) ? effect.stats
                : (effect.stat ? [effect.stat] : []);

            // 移动力通道。与属性通道各自独立判门槛——暴风雨就靠这一点做到
            // 「序列 7 只加攻防、序列 6 才多走格子」
            if (effect.move) {
                const x = this.eligibleRankFor(hero, effect);
                const div = Number(effect.move.div);
                if (x !== null && Number.isFinite(div) && div > 0) {
                    const grid = Math.floor((TacticCatalog.ENV_SELF_ZERO_RANK - x) / div);
                    if (grid > 0) hero.envMoveBonus = (Number(hero.envMoveBonus) || 0) + grid;
                }
            }

            if (!stats.length) return;
            const spec = this.effectSpecFor(bm, hero, layer, effect);
            if (spec.power <= 0) return;
            stats.forEach(stat => {
                hero.effects.push({
                    name: `${layer.envName}·${this.labelFor(effect, stats, stat)}`,
                    type: spec.type,
                    stat,
                    valueType: 'percentage',
                    power: spec.power,
                    duration: this.DURATION,
                    triggerTiming: this.TIMING,
                    priority: 0,
                    environment: true,
                    slotId: layer.slotId,
                    appliedAt: Date.now(),
                });
            });
        });
    },

    /** 摘掉环境效果。不传 slotId 就摘这个人身上全部的 */
    removeFrom(hero, slotId) {
        if (!hero || !Array.isArray(hero.effects)) return;
        hero.effects = hero.effects.filter(e =>
            !(e && e.environment && (slotId === undefined || e.slotId === slotId)));
    },

    // ---------- 栏位 ----------

    /**
     * 入栏。目标栏已有人工条目就先 evict，再写入。**不分敌友**：栏只有一格，
     * 没有「挤谁」的选择空间，也就没有规则修改那套「优先挤敌方最早入栏的」。
     * @returns {Object|null} 被顶替的旧条目
     */
    admit(bm, entry) {
        const st = this.ensure(bm);
        const old = st.slots[entry.kind] || null;
        if (old) this.evict(bm, old);
        st.slots[entry.kind] = entry;
        return old;
    },

    /** 出栏：清空那一栏，并把它的效果从全场每个人身上摘掉 */
    evict(bm, entry) {
        if (!entry) return;
        const st = this.ensure(bm);
        if (st.slots[entry.kind] === entry) st.slots[entry.kind] = null;
        bm.teamManager.getAllHeroes().forEach(hero => this.removeFrom(hero, entry.id));
    },

    /**
     * 清理没有依托的条目：**只看制造者阵亡**，不看他在不在场——放逐与附身离场
     * 都不影响一片已经铺开的环境。子类声明 persistAfterDeath 的连阵亡也不收。
     * 幂等，战术面板打开时与纯前端管线开头各跑一次：前者只为别让玩家对着一份
     * 已经作废的环境栏做决策，后者才是真正的结算点。
     * @returns {Array<string>} 结果页用的行
     */
    sweep(bm) {
        if (!bm || !bm.teamManager) return [];
        const st = this.ensure(bm);
        const lines = [];
        TacticCatalog.ENV_KINDS.forEach(kind => {
            const entry = st.slots[kind];
            if (!entry) return;
            const cfg = this.SUBTYPES[entry.subtype] || {};
            if (cfg.persistAfterDeath === true) return;
            const caster = this.findHero(bm, entry.casterId);
            if (caster && TacticResolver.alive(caster)) return;
            this.evict(bm, entry);
            const back = this.naturalValueOf(bm, kind);
            // 🆕 回落目标与原环境同名（人工暴风雨回落成自然暴风雨）：**腾栏照做、
            // 一个字不写**。数值上本来就是无缝的——紧随其后的 resync 会把自然层
            // 那份一模一样的效果重新挂上——而「暴风雨消散，天气重归暴风雨」
            // 这种句子只会让玩家以为出了 bug。栏位归属的变化由环境栏面板体现
            if (back && back === entry.envName) return;
            lines.push(`🌍 ${entry.casterName} 的「${entry.envName}」失效了：`
                + `施加者已阵亡，${kind}回落为${back || '空'}`);
            // slotKind 而不是 kind：writeReport 的分派已经占用了 r.kind。
            // subtype 是给 writeReport 查子类 report 覆盖用的，别漏
            st.pendingResults.push({
                kind: 'environment',
                stage: back ? 'expire-natural' : 'expire-empty',
                actor: entry.casterName,
                subtype: entry.subtype,
                envName: entry.envName,
                slotKind: kind,
                fallback: back || '',
            });
        });
        lines.forEach(line => st.pendingLines.push(line));
        return lines;
    },

    /** 取走并清空攒下的结果页行。只有纯前端管线调它 */
    drainLines(bm) {
        const st = this.ensure(bm);
        const lines = st.pendingLines.slice();
        st.pendingLines = [];
        return lines;
    },

    /** 取走并清空攒下的战报条目。与 drainLines 成对 */
    drainResults(bm) {
        const st = this.ensure(bm);
        const out = st.pendingResults.slice();
        st.pendingResults = [];
        return out;
    },

    /**
     * 全场重算。先摘掉所有 environment 效果，再遍历四栏逐个重挂。
     * 幂等——比原地改 type 字段更不容易漏。
     *
     * **跳过离场的人**（OffFieldManager.isOff）：他不在战场上，不吃环境。回场后由
     * 下一次 resync 补挂，所以 finishRound 里那一次必须排在 ExileManager.tick
     * 之后，否则这一轮回场的人要空着打完一整个战斗回合。
     *
     * 按「遍历四栏、每栏取自己的 effects」组织，不假设只有人工环境才有效果。
     *
     * envMoveBonus 也在这里归零重算。它与 hero.effects 是两条并行的通道，但只有
     * resync 与 applyAllTo 这两处掌握「四栏此刻各是什么」的完整画面，所以重算只在
     * 这两处做；evict 单独摘掉某一栏时留下的陈旧值，由紧随其后的 resync 覆盖
     * （改变环境仲裁与 finishRound 末尾都是 evict/admit 之后立刻 resync）。
     */
    resync(bm) {
        if (!bm || !bm.teamManager) return;
        const heroes = bm.teamManager.getAllHeroes();
        heroes.forEach(hero => {
            this.removeFrom(hero);
            hero.envMoveBonus = 0;
        });
        const layers = TacticCatalog.ENV_KINDS
            .map(kind => this.layerOf(bm, kind))
            .filter(l => l && Array.isArray(l.effects) && l.effects.length);
        if (!layers.length) return;
        heroes.forEach(hero => {
            if (!TacticResolver.alive(hero)) return;
            if (OffFieldManager.isOff(hero)) return;
            layers.forEach(layer => this.applyTo(bm, hero, layer));
        });
    },

    /** 中途入场的单位补挂当前四栏。resync 的单人版，语义完全一致 */
    applyAllTo(bm, hero) {
        if (!hero || !TacticResolver.alive(hero) || OffFieldManager.isOff(hero)) return;
        this.removeFrom(hero);
        hero.envMoveBonus = 0;
        TacticCatalog.ENV_KINDS.forEach(kind => {
            const layer = this.layerOf(bm, kind);
            if (layer) this.applyTo(bm, hero, layer);
        });
    },

    // ---------- NPC ----------

    /** 这一栏是不是「友军造的人工环境」。自然底板与空栏都不算 */
    isFriendlySlot(bm, hero, kind) {
        const entry = this.slotEntryOf(bm, kind);
        if (!entry) return false;
        const mySide = hero.teamType === 'ally' ? 'ally' : 'enemy';
        return this.ownerSideOf(bm, entry) === mySide;
    },

    /**
     * 这个 NPC 有哪几条子类值得发。**逐子类**判：一条子类写的每一栏都是友军造的
     * 人工环境时才把它剔掉——只要有一栏是敌方 / 自然 / 空就照常发动，
     * 发动就连友军那栏一起覆盖。只看自己能影响的栏，别的栏一概不看。
     *
     * 语义与 RuleChangeManager.npcShouldTry 里那道 every 一致，但**不能照抄**：
     * 那边扫的是整个栏位注册表、且带「栏满了才判」的前置条件（它的栏是可排序数组，
     * 满了才需要挤人）；环境的四栏各一格，任何时候都只是「有值」或「空」，
     * 没有满不满这个概念，所以 every 直接落在 writesOf 推导出的那几栏上。
     *
     * 🆕 另有一道 skipIfSameEnv：要写的那几栏**已经就是这几个环境**了就不发，
     * 不分它是铺图给的自然值还是谁造出来的人工值。
     *
     * 🆕 付得起与赢不赢得了这两道也下沉到了**逐子类**：消耗项现在跟着子类走
     *（梦境迷宫扣人性），而 canPossiblyWinAll 的估上界又依赖扣的是哪一项，
     * 放在大类级只能按缺省的灵性判，会把「灵性为 0 但人性充足的观众」整个筛掉。
     */
    npcSubtypePool(bm, hero) {
        return this.availableSubtypes(hero).filter(k => {
            const kinds = this.writesOf(k);
            if (!kinds.length) return false;
            // 🆕 这条子类自己那一项付不起 / 这一发必然被压下来，就别把它放进池子
            if (!this.hasStat(hero, k)) return false;
            if (!this.canPossiblyWinAll(bm, hero, k)) return false;
            // 🆕 已经是那个环境了就别再来一发。**这个开关只给「效果与来源无关」的
            // 子类打开**（改变天气：暴风雨走 selfRank，幅度只看吃效果的人自己，
            // 谁造的都一模一样，抢过来只换了个「谁死了它消失」，不值一个动作位）。
            // 无暗领域与梦境迷宫**绝不能**打开：它们的矛头是现查施法者当前阵营算的
            //（signOf / scope: 'foes'），敌方造的那一份正压着我方，覆盖它把矛头转过去
            // 恰恰是该做的事。
            const cfg = this.SUBTYPES[k] || {};
            if (cfg.skipIfSameEnv === true
                && kinds.every(kind => this.slotStateOf(bm, kind).name === this.envNameFor(k, kind))) {
                return false;
            }
            return !kinds.every(kind => this.isFriendlySlot(bm, hero, kind));
        });
    },

    /**
     * 这一轮要不要发起。资格之外的全部判据都在逐子类过滤里（付得起、赢得了、
     * 值不值得发），所以这里只剩「池非空」。
     * 过滤刻意排在**掷骰之前**：同一份判断算两遍，换掉「掷中了却挑不出方案、
     * 白过一轮」，取舍与召唤的「候选全军覆没就当什么都没发生」一致。
     */
    npcShouldTry(bm, hero) {
        if (!this.canUse(bm, hero)) return false;
        return this.npcSubtypePool(bm, hero).length > 0;
    },

    /**
     * 随机一条子类。比规则修改简单：无需挑目标（作用全场），栏位由 envs 推导，
     * 所以只有「哪条子类」这一个自由度。用与闸门同一套过滤，池空返回 null。
     */
    npcPlan(bm, hero, forcedSubtype = '') {
        const pool = this.npcSubtypePool(bm, hero)
            .filter(subtype => !forcedSubtype || subtype === forcedSubtype);
        if (!pool.length) return null;
        return { subtype: pool[Math.floor(Math.random() * pool.length)] };
    },

    // ---------- 发起 ----------

    /**
     * 发起一次。先扣再拼、成败都扣；拼点点数取扣费之后的值，与操控系一致。
     * 真正的入栏推迟到仲裁：同一轮里敌我都可能改环境，谁先写要统一定序。
     *
     * 🆕 扣哪一项按子类走（梦境迷宫扣人性），但**出手点数仍是 bestStat**：
     * 六项当前值加运气里最高的那一项。所以扣掉的那一项若恰好是最高项，
     * 这里读到的点数才会跟着降——spend 排在 casterStatOf 之前正是为了这个。
     */
    attempt(bm, caster, plan) {
        this.spend(caster, plan.subtype);
        return {
            ...TacticBorrowReport.meta(caster),
            caster,
            subtype: plan.subtype,
            shownAs: this.displayName(caster, plan.subtype),
            contest: this.contest(bm, caster, this.casterStatOf(caster)),
        };
    },

    /**
     * 组装一条待入栏的记录。三个 caster 字段各有专职，混用会静默出错：
     * casterId 供 signOf 现查活对象算符号，casterRank 供 powerOf 算幅度，
     * casterTeam 只在「已死 + persistAfterDeath」时当符号兜底。
     */
    buildEntry(bm, caster, subtype, kind) {
        const st = this.ensure(bm);
        st.seq += 1;
        return {
            id: `env-${st.seq}`,
            casterId: caster.heroId,
            casterName: caster.name,
            casterRank: Number(caster.sequenceRank),
            casterTeam: caster.teamType,
            subtype,
            shownAs: this.displayName(caster, subtype),
            envName: this.envNameFor(subtype, kind),
            kind,
            round: Number(bm.currentRound) || 0,
        };
    },

    // ---------- 仲裁 ----------

    /**
     * 同一轮里敌我都可能改环境，而每类只有一栏，所以要定一个先后：
     * 与其余控制系共用 pickWinner 的口径——玩家优先，其次速度快的，并列随机。
     * 后结算的那条会把先结算的顶掉，这正是「后来者覆盖」的自然结果。
     */
    orderWinners(list) {
        return list.slice()
            .map(a => ({ a, tie: Math.random() }))
            .sort((x, y) => {
                const px = x.a.caster.dataSource === 'player' ? 1 : 0;
                const py = y.a.caster.dataSource === 'player' ? 1 : 0;
                if (px !== py) return py - px;
                const sx = EnemyControlManager.speedOf(x.a.caster);
                const sy = EnemyControlManager.speedOf(y.a.caster);
                if (sx !== sy) return sy - sx;
                return x.tie - y.tie;
            })
            .map(x => x.a);
    },

    /**
     * 逐条覆盖入栏。**本方法不挂效果**——符号与幅度都取决于此刻的场面，
     * 所以统一交给调用方在本方法之后跑一次 resync（见管线第 13 步）。
     *
     * 行粒度分两种：失败行是**一次发动一行**（整发都没成，与写哪几栏无关）；
     * 成功行与顶替行**按栏拆**，写 N 栏就 N 行 / N 条，文案模板永远是单栏的。
     * @param {Array} attempts [{ caster, subtype, shownAs, contest }]
     */
    arbitrate(bm, attempts, summary, results) {
        if (!attempts || !attempts.length) return;

        attempts.filter(a => !a.contest.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」被场上的对抗者阻止`
                + this.contestTail(a.contest.rolls));
        });

        this.orderWinners(attempts.filter(a => a.contest.win)).forEach(a => {
            const tail = this.contestTail(a.contest.rolls);
            if (!TacticResolver.alive(a.caster)) {
                summary.push(`✗ ${a.caster.name} 的「${a.shownAs}」未能成形：施加者已阵亡${tail}`);
                return;
            }
            this.writesOf(a.subtype).forEach(kind => {
                const entry = this.buildEntry(bm, a.caster, a.subtype, kind);
                if (!entry.envName) return;
                const old = this.admit(bm, entry);
                summary.push(`✓ ${a.caster.name} 以「${a.shownAs}」改写了战场环境：`
                    + `${kind} → ${entry.envName}${tail}`);
                // subtype 是给 writeReport 查子类 report 覆盖用的，别漏
                results.push({ ...TacticBorrowReport.meta(a.caster),
                    kind: 'environment',
                    stage: 'start',
                    actor: a.caster.name,
                    subtype: a.subtype,
                    shownAs: a.shownAs,
                    envName: entry.envName,
                    slotKind: kind,
                });
                // 🆕 顶替掉的是个同名环境（暴风雨顶暴风雨）就不写这一段：栏位确实换了
                // 主人，但「原本的暴风雨被顶替，效果当场消失」紧跟在「改写成暴风雨」
                // 后面自相矛盾。成功那一行照写——玩家确实花了灵性、赢了拼点
                if (!old || old.envName === entry.envName) return;
                summary.push(`↩ 原本的「${old.envName}」被顶替，效果当场消失`);
                results.push({ ...TacticBorrowReport.meta(a.caster),
                    kind: 'environment',
                    stage: 'replaced',
                    actor: a.caster.name,
                    subtype: a.subtype,
                    shownAs: a.shownAs,
                    envName: entry.envName,
                    slotKind: kind,
                    replaced: old.envName,
                });
            });
        });
    },

    // ---------- 玩家侧 ----------

    /**
     * 按钮为什么点不了。返回空串表示可用。
     *
     * 🆕 分两级问，形状照 FieldEffectManager.blockedReason：
     * **不传 subtype** 只查「有没有人、够不够格、有没有任何一条子类付得起」——
     * 这是大类级闸门，玩家还没选子类时用它。消耗项现在跟着子类走（梦境迷宫扣人性），
     * 在这一级按缺省的灵性去判，会把「灵性为 0 但人性充足的观众」整个挡在选子类之前。
     * **传了 subtype** 才查那一条自己的消耗项与拼点前景。
     */
    blockedReason(bm, hero, subtype) {
        if (!hero) return '场上没有你可操作的角色。';
        if (!this.eligible(hero)) return `你没有可用的${TacticCatalog.ENV_ACTION}能力。`;
        if (!subtype) {
            if (!this.hasStatForAny(hero)) {
                // 一条都付不起时报第一条够格子类的那一项，别报一个不相干的属性名
                const first = this.availableSubtypes(hero)[0];
                return `当前${this.statKeyOf(first)}为 0，无法${TacticCatalog.ENV_ACTION}。`;
            }
            return '';
        }
        if (!this.hasStat(hero, subtype)) {
            return `当前${this.statKeyOf(subtype)}为 0，无法${TacticCatalog.ENV_ACTION}。`;
        }
        if (!this.canPossiblyWinAll(bm, hero, subtype)) {
            return '场上有你无论如何也压不过的对抗者，这一发必然失败。';
        }
        return '';
    },

    /**
     * 逐人预览：这一发落地后每个人会吃到什么。参数区用，只算不写。
     * 同一发的各条效果各有自己的 base，预览取第一条作代表——seqDiff5 子类的两条 base
     * 相同，所以显示成一个数是准的；日后出现 base 不同的子类要改成逐条列。
     *
     * ⚠️ **只对 seqDiff5 子类成立，selfRank 子类不要调它。** 它取 effects[0].base 走
     * powerOf，而 selfRank 条目压根没有 base（它有 per），会静默落回 ENV_BASE 再按
     * 序列差算、按敌我分符号——方向、对象、数值三样全错。selfRank 子类（暴风雨）
     * 的参数区靠 SUBTYPES 里自己的 previewNote 说话，不经过这里。
     *
     * 🆕 认代表条目的 scope：'foes' 的子类（梦境迷宫）名单里只留敌人，
     * 否则参数区会列出一串「我方将受益」，而落地时友方一条都不会挂——
     * 预览必须与 inScope 用同一句话，不然它就是在骗人。
     * 判据刻意直接用 isEnemyOf(施法者, 目标)：预览发生在入栏之前，还没有 layer
     * 可查，而此刻的施法者就是玩家自己，与 inScope 那条「现查活着的制造者」等价。
     *
     * @returns {Array<{hero: Object, type: string, power: number}>}
     */
    previewFor(bm, caster, subtype) {
        const kinds = this.writesOf(subtype);
        if (!bm || !caster || !kinds.length) return [];
        const cfg = EnvironmentCatalog.envOf(this.envNameFor(subtype, kinds[0]));
        const first = cfg && Array.isArray(cfg.effects) ? cfg.effects[0] : null;
        const base = first ? first.base : TacticCatalog.ENV_BASE;
        const foesOnly = !!(first && first.scope === 'foes');
        const casterRank = Number(caster.sequenceRank);
        return bm.teamManager.getAllHeroes()
            .filter(h => TacticResolver.alive(h) && !OffFieldManager.isOff(h))
            .filter(h => !foesOnly || EnemyControlManager.isEnemyOf(caster, h))
            .map(hero => ({
                hero,
                type: EnemyControlManager.isEnemyOf(caster, hero) ? 'debuff' : 'buff',
                power: this.powerOf(casterRank, hero, base),
            }));
    },

    /**
     * 🆕 seqDiff5 子类的参数区预览块。从 TacticRoundUI.renderEnvOptions 原样搬来，
     * 输出逐字不变，只是换了个住处。
     *
     * 搬家的理由：参数区的文案现在**跟着子类走**（见 SUBTYPES 的 previewNote），
     * 而 seqDiff5 是一整族子类的共同算法，让每条子类各自拼一遍 HTML 必然漂移。
     * 于是这里做成公共 helper，同族子类一行 `previewNote: ctx => EnvironmentManager
     * .seqDiffPreviewNote(ctx)` 就能复用；selfRank 那族（暴风雨）压根不调它。
     *
     * @param {{bm: Object, hero: Object, subtype: string}} ctx
     * @returns {string} 拼好的 HTML；没有可预览的人时返回空串，调用方直接不画这一块
     */
    seqDiffPreviewNote(ctx) {
        const { bm, hero, subtype } = ctx || {};
        if (!bm || !hero || !subtype) return '';

        // 逐人幅度预览。幅度为 0 的单独归一类：那些人压根不会挂上效果条目
        const preview = this.previewFor(bm, hero, subtype);
        if (!preview.length) return '';
        const statsLabel = String((this.SUBTYPES[subtype] || {}).previewStatsLabel || '');
        const fmt = list => window.escapeHtml(list
            .map(p => (p.power > 0
                ? `${p.hero.name}${statsLabel ? ` ${statsLabel}` : ''} ${p.type === 'debuff' ? '−' : '+'}${p.power}%`
                : `${p.hero.name} 无效果`))
            .join('、'));
        const good = preview.filter(p => p.type === 'buff');
        const bad = preview.filter(p => p.type === 'debuff');

        return `
            <div style="color: var(--text-muted); font-size: var(--text-sm); margin-top: 10px; line-height: 1.8;">
                ${good.length ? `我方将受益：<b style="color: var(--color-success);">${fmt(good)}</b><br>` : ''}
                ${bad.length ? `敌方将受损：<b style="color: var(--color-danger);">${fmt(bad)}</b>` : ''}
                ${preview.some(p => p.power <= 0)
                    ? `<div style="font-size: var(--text-xs); margin-top: 4px;">序列比你高${statsLabel ? '' : ' '}${this.zeroDiffOf()}${statsLabel ? '' : ' '}阶以上的人不受影响。</div>`
                    : ''}
            </div>
        `;
    },
};

const ForcedMoveManager = {
    /** 位移类型注册表。steps 是最多推开几格 */
    KINDS: {
        逃离: { label: '逃离', steps: 2 },
    },

    knows(kind) {
        return !!(kind && this.KINDS[kind]);
    },

    /** 切比雪夫单位方向：从 from 指向 subject，也就是「背对 from」的那一步 */
    stepAway(subject, from) {
        return {
            dx: Math.sign((Number(subject.x) || 0) - (Number(from.x) || 0)),
            dy: Math.sign((Number(subject.y) || 0) - (Number(from.y) || 0)),
        };
    },

    /**
     * 把 subject 从 from 身边推开。
     *
     * 先沿直线逐格试：每格都必须是空格，撞墙或撞人就停在已经走到的那一格
     * （半路停下照样算位移成功，不回退）。一格都走不动时退化为环形搜索，找一个
     * 「比现在离 from 更远」的相邻空格，口径与 PossessionManager.restore 的兜底一致。
     *
     * 双方重合（方向算出来是 0,0）时随机取一个方向，否则这一档会变成空过。
     *
     * @returns {{moved: boolean, from: {x, y}, to: {x, y}, steps: number}}
     */
    away(bm, subject, from, kind) {
        const board = bm && bm.board;
        const origin = { x: subject && subject.x, y: subject && subject.y };
        const fail = { moved: false, from: origin, to: origin, steps: 0 };
        if (!board || !subject || !from || !this.knows(kind)) return fail;
        if (!Number.isFinite(subject.x) || !Number.isFinite(subject.y)) return fail;
        // 死者不占格、只保留坐标画骷髅，不要把尸体推来推去
        if ((subject.additionalStats?.当前活力 ?? 0) <= 0) return fail;

        const budget = Math.max(0, Math.floor(Number(this.KINDS[kind].steps) || 0));
        let { dx, dy } = this.stepAway(subject, from);
        if (dx === 0 && dy === 0) {
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            const pick = dirs[Math.floor(Math.random() * dirs.length)];
            dx = pick[0];
            dy = pick[1];
        }

        let cx = subject.x;
        let cy = subject.y;
        let walked = 0;
        for (let i = 0; i < budget; i++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!board.isFree(nx, ny)) break;
            if (!board.place(subject, nx, ny)) break;
            cx = nx;
            cy = ny;
            walked += 1;
        }
        if (walked > 0) return { moved: true, from: origin, to: { x: cx, y: cy }, steps: walked };

        // 直线被完全堵死：退一步求其次，挪一格到任何更远的空格上
        const cur = BattleBoard.distance(origin.x, origin.y, from.x, from.y);
        const better = board.getOuterRangeCells(origin.x, origin.y, 1)
            .filter(c => board.isFree(c.x, c.y)
                && BattleBoard.distance(c.x, c.y, from.x, from.y) > cur);
        for (const c of TacticResolver.shuffle(better)) {
            if (board.place(subject, c.x, c.y)) {
                return { moved: true, from: origin, to: { x: c.x, y: c.y }, steps: 1 };
            }
        }
        return fail;
    },
};

const MindDepriveManager = {
    /** 引擎永远匹配不到的计时 timing，与 mythic_form / enemy_control 同一手法 */
    TIMING: 'mind_deprive',
    FOLLOW: '狂热追随',

    // ---------- 资格 ----------

    /**
     * 与 TempAllegianceManager.resolveEligibility 同构：称号走 includes，
     * 途径片段走 pathwayShort + 序列门槛。
     * 观众序列 1 会同时拿到「心灵」权柄与这一条，两者次数互不占用，这是有意的；
     * 「上帝」在水手侧的重名也照现有约定一并放行，与恐惧之音那条一致。
     */
    eligible(sequenceString) {
        const s = String(sequenceString || '');
        if (s.includes('上帝')) return true;
        return LifeSaveManager.splitSequenceFragments(s).some(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r || r.pathwayShort !== '观众') return false;
            return Number(r.rank) <= TacticCatalog.MIND_DEPRIVE_RANK_GATE;
        });
    },

    /** 有资格就能用，无次数上限，与短控 / 附身同构 */
    canUse(bm, hero) {
        if (!hero) return false;
        return this.eligible(hero.sequenceString);
    },

    // ---------- 消耗与拼点 ----------

    statKeyOf() {
        return TacticCatalog.MIND_DEPRIVE_CASTER_STAT;
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costOf(hero) {
        return TacticCatalog.mindDepriveCost(hero && hero.sequenceRank);
    },

    /** 先扣再拼，成败都扣；**范围命中也只扣一次**，与卷进几个人无关 */
    spend(hero) {
        const key = this.statKeyOf();
        const field = this.fieldOf(key);
        const cost = this.costOf(hero);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    statAfterCost(hero) {
        const field = this.fieldOf(this.statKeyOf());
        return Math.max(0, (hero?.additionalStats?.[field] ?? 0) - this.costOf(hero));
    },

    hasStat(hero) {
        return (hero?.additionalStats?.[this.fieldOf(this.statKeyOf())] ?? 0) > 0;
    },

    /** 目标方点数：只比当前灵性 / 人性 / 理智三项，与短控同口径 */
    targetStatOf(target) {
        const s = (target && target.additionalStats) || {};
        return Math.max(...TacticCatalog.MIND_DEPRIVE_TARGET_STATS.map(k => s[`当前${k}`] ?? 0));
    },

    /** 没有劣势修正：强度靠档位权重压，不靠 CONTROL_PENALTY */
    canPossiblyWin(caster, target) {
        return EnemyControlManager.canPossiblyWin(
            caster, target, 1,
            this.statAfterCost(caster),
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
     * 会被卷进来的敌人：半径内、存活、不是别人离场的本体、且理论上打得赢。
     * 与单体那几条不同，这里不需要点人——范围内够格的全都各吃一次拼点。
     */
    targetsInRange(bm, caster) {
        if (!bm || !caster) return [];
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        const radius = TacticCatalog.MIND_DEPRIVE_RADIUS;
        return (foes || []).filter(t =>
            EnemyControlManager.selectable(caster, t)
            && BattleBoard.distanceBetween(caster, t) <= radius
            && this.canPossiblyWin(caster, t));
    },

    // ---------- 掷档 ----------

    /** 落区间，不做归一化；权重合计不足 100 时兜底落到最后一档 */
    rollOutcome() {
        const table = TacticCatalog.MIND_DEPRIVE_OUTCOMES;
        let roll = Math.random() * 100;
        for (const row of table) {
            roll -= row.weight;
            if (roll < 0) return row.key;
        }
        return table[table.length - 1].key;
    },

    // ---------- 自管的两档状态 ----------

    /** 颤栗：攻与防各一条。同一角色重复命中是整条换掉，不叠加 */
    setTremble(hero, pct, until) {
        hero.effects = hero.effects || [];
        [['attack', '心智剥夺·颤栗·攻击'], ['defense', '心智剥夺·颤栗·防御']].forEach(pair => {
            const stat = pair[0];
            hero.effects = hero.effects.filter(e => !(e && e.mindDeprive === stat));
            hero.effects.push({
                name: pair[1],
                type: 'debuff',
                stat,
                valueType: 'percentage',
                power: pct,
                // duration 只用于面板展示。引擎按 triggerTiming 精确过滤，匹配不到
                // TIMING 就既不结算也不递减，真正的到期判定看 mindDepriveUntil
                duration: 1,
                triggerTiming: this.TIMING,
                priority: 0,
                mindDeprive: stat,
                mindDepriveUntil: until,
            });
        });
    },

    /**
     * 瘫软：下一回合移动力归零。用独立字段而不是复用秘偶的 enemyControlMovePct——
     * 那个字段是 syncEffects 直接赋值的，共用会互相覆盖。
     */
    setLimp(hero, until) {
        hero.mindDepriveMovePct = 100;
        hero.mindDepriveMoveUntil = until;
    },

    /**
     * 翻页时清掉过期状态。与 TurnSkipManager.sweep 同一条规则、同一个调用点：
     * **必须在 currentRound 自增之后**，判据是 until < currentRound。
     */
    sweep(bm) {
        if (!bm || !bm.teamManager) return;
        const round = Number(bm.currentRound) || 0;
        bm.teamManager.getAllHeroes().forEach(hero => {
            if (Array.isArray(hero.effects)) {
                hero.effects = hero.effects.filter(e =>
                    !(e && e.mindDeprive && Number(e.mindDepriveUntil) < round));
            }
            if (hero.mindDepriveMovePct && Number(hero.mindDepriveMoveUntil) < round) {
                hero.mindDepriveMovePct = 0;
                hero.mindDepriveMoveUntil = 0;
            }
        });
    },

    // ---------- 仲裁 ----------

    /**
     * 同一施法者掷出多个狂热追随时只留一个，其余降级。
     * TempAllegianceManager 的硬不变式是「同一 casterId 至多一条过程」，硬塞第二条
     * 会让 processOf 的语义崩掉；施法者本来就已经在短控别人时，则全部降级。
     */
    dedupeFollow(bm, wins) {
        const fallback = TacticCatalog.MIND_DEPRIVE_FALLBACK;
        const byCaster = new Map();
        wins.forEach(a => {
            if (a.outcome !== this.FOLLOW) return;
            const key = a.caster.heroId;
            if (!byCaster.has(key)) byCaster.set(key, []);
            byCaster.get(key).push(a);
        });

        byCaster.forEach((list, casterId) => {
            const margin = a => a.roll.casterScore - a.roll.targetScore;
            const champ = TempAllegianceManager.processOf(bm, casterId)
                ? null
                : list.reduce((best, a) => (margin(a) > margin(best) ? a : best), list[0]);
            list.forEach(a => {
                if (a === champ) return;
                a.outcome = fallback;
                a.downgraded = true;
            });
        });
    },

    /**
     * 心智剥夺仲裁。排在整条流水线的最末（短控之后）：它的倒戈那一档只持续一个
     * 回合，被永久转化甚至被附身顶掉都更合理。目标若已被转走，同样落进「抢先转化」。
     *
     * @param {Array} attempts [{ caster, target, roll }]，**一个施法者会有多条**
     */
    arbitrate(bm, attempts, summary, results) {
        if (!attempts || attempts.length === 0) return;
        const name = TacticCatalog.MIND_DEPRIVE;

        attempts.filter(a => !a.roll.win).forEach(a => {
            summary.push(`✗ ${a.caster.name} 的${name}没能动摇 ${a.target.name}`
                + EnemyControlManager.contestTail(a.roll));
        });

        const wins = attempts.filter(a => a.roll.win);
        if (!wins.length) return;

        wins.forEach(a => { a.outcome = this.rollOutcome(); });
        this.dedupeFollow(bm, wins);

        wins.forEach(a => {
            // 同一轮里目标可能已被别人永久转走，或被附身带离了战场
            if (!EnemyControlManager.isEnemyOf(a.caster, a.target)
                || OffFieldManager.isOff(a.target)) {
                summary.push(`✗ ${a.caster.name} 的${name}掠过 ${a.target.name} 时，`
                    + `目标已被别人抢先转化${EnemyControlManager.contestTail(a.roll)}`);
                return;
            }
            this.applyOutcome(bm, a, summary, results);
        });
    },

    /**
     * 落地一档结果。狂热追随整条交给短控那套，其余四档在这里就地结算。
     * @param {Object} a { caster, target, roll, outcome, downgraded }
     */
    applyOutcome(bm, a, summary, results) {
        const caster = a.caster;
        const target = a.target;
        const name = TacticCatalog.MIND_DEPRIVE;
        const tail = EnemyControlManager.contestTail(a.roll);
        const note = a.downgraded ? '（同一次剥夺里已有人倒戈，此人退为瘫软）' : '';
        const until = (Number(bm.currentRound) || 0) + 1;

        if (a.outcome === this.FOLLOW) {
            // 不重复实现倒戈：穿透快照、convertTeam、到期还原全在短控那边。
            // 它自己会写 summary 与 temp-allegiance 战报条目，这里不再补
            TempAllegianceManager.begin(bm, caster, target, name, a.roll, summary, results);
            return;
        }

        let outcome = a.outcome;
        if (outcome === '颤栗') {
            const pct = TacticCatalog.MIND_DEPRIVE_TREMBLE_PCT;
            this.setTremble(target, pct, until);
            summary.push(`✓ ${caster.name} 的${name}使 ${target.name} 颤栗不止（攻防 −${pct}%）${tail}`);
        } else if (outcome === '奔逃') {
            const moved = ForcedMoveManager.away(bm, target, caster, TacticCatalog.MIND_DEPRIVE_FLEE_KIND);
            summary.push(moved.moved
                ? `✓ ${caster.name} 的${name}使 ${target.name} 夺路奔逃 ${moved.steps} 格${tail}`
                : `✓ ${caster.name} 的${name}使 ${target.name} 想逃却无路可退${tail}`);
        } else if (outcome === '昏迷') {
            // 身上已挂着别的跳过理由时不叠加、不刷新，退为瘫软以免这一档白过
            if (!TurnSkipManager.apply(bm, target, TacticCatalog.MIND_DEPRIVE_STUN_REASON)) {
                outcome = TacticCatalog.MIND_DEPRIVE_FALLBACK;
                this.setLimp(target, until);
                summary.push(`✓ ${caster.name} 的${name}让本已无法行动的 ${target.name} 更加瘫软${tail}`);
            } else {
                summary.push(`✓ ${caster.name} 的${name}使 ${target.name} 当场昏迷，下一回合无法行动${tail}`);
            }
        } else {
            // 瘫软，以及权重表里将来新增却还没接线的档位一律落到这里
            outcome = TacticCatalog.MIND_DEPRIVE_FALLBACK;
            this.setLimp(target, until);
            summary.push(`✓ ${caster.name} 的${name}使 ${target.name} 瘫软在地，下一回合无法移动${tail}${note}`);
        }

        results.push({ ...TacticBorrowReport.meta(caster), kind: 'mind-deprive', actor: caster.name, target: target.name, outcome });
    },
};

const HardControlManager = {
    /**
     * 插入顺序同时决定 UI 顺序与仲裁优先级。保持旧行为：
     * 偷窃想法 → 恍惚之歌 → 神秘再现·睡美人 → 精神刺穿 → 威压震慑，之后才轮到心智剥夺。
     */
    SUBTYPES: {
        [TacticCatalog.STEAL_THOUGHT]: {
            buttonLabel: '偷窃想法',
            reason: TacticCatalog.STEAL_THOUGHT_STUN_REASON,
            access: {
                titles: [TacticCatalog.STEAL_THOUGHT_TITLE],
                pathwayShort: '偷盗者',
                rankGate: TacticCatalog.STEAL_THOUGHT_RANK_GATE,
            },
            cost: {
                stat: TacticCatalog.STEAL_THOUGHT_CASTER_STAT,
                ratio: TacticCatalog.STEAL_THOUGHT_RATIO,
            },
            targetStats: TacticCatalog.STEAL_THOUGHT_TARGET_STATS,
            npc: { enabled: true, chance: TacticCatalog.STEAL_THOUGHT_NPC_CHANCE },
            resultKind: 'steal-thought',
            ui: {
                noStat: key => `当前${key}为 0，无法偷窃想法。`,
                noTarget: '场上没有你有可能偷窃想法成功的敌人。',
                pendingTarget: '他已经陷入昏迷、呆滞、恍惚、沉睡、精神剧痛或震慑，不会叠加、也不会刷新。',
                lowStatTarget: '你的灵性过低，没有可能偷窃想法成功这个目标。',
                hint: ({ targetName }) => `<div style="color: var(--text-main); font-size: var(--text-sm); line-height: 1.8;">
            在上方棋盘点一个敌人，不限距离。
            <br>当前目标：<b style="color: var(--color-primary);">${targetName}</b>
            <div style="color: var(--text-muted); margin-top: 6px;">
                抽走他正要实践的想法。用你的当前灵性，对目标当前灵性 / 人性 / 理智里最高的一项拼点，成功后他陷入呆滞：下一个战斗回合无法行动，可以无限次使用。目标身上若已有昏迷、呆滞、恍惚、沉睡、精神剧痛或震慑，不会叠加、也不会刷新。
            </div>
        </div>`,
            },
            messages: {
                fail: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}没能抽走 ${target.name} 的念头${tail}`,
                superseded: ({ caster, target, tail }) =>
                    `✗ ${caster.name} 成功抽走 ${target.name} 的念头前，目标的想法已被别人抽走${tail}`,
                invalid: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}掠过 ${target.name} 时，目标已被别人抢先转化${tail}`,
                pending: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 的${name}抽走了本已无法行动的 ${target.name} 的念头${tail}`,
                win: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 以${name}抽走了 ${target.name} 正要实践的想法，`
                    + `${target.name} 陷入呆滞，下一回合无法行动${tail}`,
                report: ({ actor, target }) =>
                    `${actor}以「${TacticCatalog.STEAL_THOUGHT}」抽走了${target}正要实践的想法，${target}陷入呆滞。`,
            },
        },
        [TacticCatalog.TRANCE_SONG]: {
            buttonLabel: '🎵 恍惚之歌',
            reason: TacticCatalog.TRANCE_SONG_STUN_REASON,
            access: {
                titles: [TacticCatalog.TRANCE_SONG_TITLE],
                pathwayShort: '水手',
                rankGate: TacticCatalog.TRANCE_SONG_RANK_GATE,
            },
            cost: {
                stat: TacticCatalog.TRANCE_SONG_CASTER_STAT,
                ratio: TacticCatalog.TRANCE_SONG_RATIO,
            },
            targetStats: TacticCatalog.TRANCE_SONG_TARGET_STATS,
            npc: { enabled: true, chance: TacticCatalog.TRANCE_SONG_NPC_CHANCE },
            resultKind: 'trance-song',
            ui: {
                noStat: key => `当前${key}为 0，无法发起。`,
                noTarget: '场上没有你有可能使其陷入恍惚的敌人。',
                pendingTarget: '他已经陷入昏迷、呆滞、恍惚、沉睡、精神剧痛或震慑，不会叠加、也不会刷新。',
                lowStatTarget: '你的灵性过低，没有可能使这个目标陷入恍惚。',
                hint: ({ targetName }) => `<div style="color: var(--text-main); font-size: var(--text-sm); line-height: 1.8;">
            在上方棋盘点一个敌人，不限距离。
            <br>当前目标：<b style="color: var(--color-primary);">${targetName}</b>
            <div style="color: var(--text-muted); margin-top: 6px;">
                用歌声干扰其灵体，使其恍惚失神。用你的当前灵性，对目标当前灵性 / 人性 / 理智里最高的一项拼点，成功后他陷入恍惚：下一个战斗回合无法行动，连战术回合的动作位也一并被占掉。可以无限次使用。目标身上若已有昏迷、呆滞、恍惚、沉睡、精神剧痛或震慑，不会叠加、也不会刷新。
            </div>
        </div>`,
            },
            messages: {
                fail: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}没能动摇 ${target.name}${tail}`,
                superseded: ({ caster, target, tail }) =>
                    `✗ ${caster.name} 成功使 ${target.name} 陷入恍惚前，目标已被别人抢先控制${tail}`,
                invalid: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}掠过 ${target.name} 时，目标已被别人抢先转化${tail}`,
                pending: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 的${name}扰动了本已无法行动的 ${target.name}${tail}`,
                win: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 以${name}使 ${target.name} 陷入恍惚，下一回合无法行动${tail}`,
                report: ({ actor, target }) =>
                    `${actor}以「${TacticCatalog.TRANCE_SONG}」使${target}陷入恍惚，一时失神。`,
            },
        },
        [TacticCatalog.CANON_SLEEP]: {
            buttonLabel: '🌙 神秘再现·睡美人',
            reason: TacticCatalog.CANON_SLEEP_STUN_REASON,
            access: {
                predicate: (bm, hero) =>
                    MysteryReenactmentCanonAccess.canUseTactic(hero, 'sleeping_beauty'),
            },
            cost: {
                stat: TacticCatalog.CANON_SLEEP_CASTER_STAT,
                ratio: TacticCatalog.CANON_SLEEP_RATIO,
            },
            targetStats: TacticCatalog.CANON_SLEEP_TARGET_STATS,
            npc: { enabled: false, chance: 0 },
            resultKind: 'canon-sleep',
            ui: {
                noStat: () => '当前灵性为 0，无法发动。',
                noTarget: '场上没有你有可能使其沉睡、且尚未被硬控的敌人。',
                pendingTarget: '他已经处于硬控状态，不会叠加、也不会刷新。',
                lowStatTarget: '你的灵性过低，没有可能使这个目标沉睡。',
                hint: ({ targetName, cost }) => `<div style="color: var(--text-main); font-size: var(--text-sm); line-height: 1.8;">
            在上方棋盘点一个敌人，不限距离。
            <br>当前目标：<b style="color: var(--color-primary);">${targetName}</b>
            <div style="color: var(--text-muted); margin-top: 6px;">
                使目标被极度疲惫拖入沉睡。用扣费后的当前灵性，对目标当前灵性 / 理智 / 人性里最高的一项拼点；成功后目标下一个战斗回合无法行动，战术动作位也会被占用。消耗灵性 ${cost}，成败都扣。已有硬控不会叠加或刷新。
            </div>
        </div>`,
            },
            messages: {
                fail: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}没能使 ${target.name} 沉睡${tail}`,
                superseded: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}落到 ${target.name} 身上前，目标已不再适用${tail}`,
                invalid: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}落到 ${target.name} 身上前，目标已不再适用${tail}`,
                pending: ({ target, name, tail }) =>
                    `✗ ${target.name} 已处于无法行动状态，${name}未能叠加${tail}`,
                win: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 以${name}使 ${target.name} 陷入沉睡，下一回合无法行动${tail}`,
                report: ({ actor, target }) =>
                    `${actor}以「${TacticCatalog.CANON_SLEEP}」使${target}陷入了深沉睡眠。`,
            },
        },
        [TacticCatalog.MENTAL_PIERCE]: {
            buttonLabel: '🗡️ 精神刺穿',
            reason: TacticCatalog.MENTAL_PIERCE_STUN_REASON,
            access: {
                pathwayShort: '仲裁人',
                rankGate: TacticCatalog.MENTAL_PIERCE_RANK_GATE,
                rankAtLeast: TacticCatalog.MENTAL_PIERCE_RANK_AT_LEAST,
            },
            range: TacticCatalog.MENTAL_PIERCE_RANGE,
            cost: {
                stat: TacticCatalog.MENTAL_PIERCE_CASTER_STAT,
                ratio: TacticCatalog.MENTAL_PIERCE_RATIO,
            },
            targetStats: TacticCatalog.MENTAL_PIERCE_TARGET_STATS,
            npc: { enabled: true, chance: TacticCatalog.MENTAL_PIERCE_NPC_CHANCE },
            resultKind: 'mental-pierce',
            ui: {
                noStat: key => `当前${key}为 0，无法发起精神刺穿。`,
                noTarget: '2格内没有你有可能精神刺穿成功、且尚未被硬控的敌人。',
                pendingTarget: '他已经处于硬控状态，不会叠加、也不会刷新。',
                outOfRangeTarget: '精神刺穿只能攻击2格内的敌人。',
                lowStatTarget: '你的灵性过低，没有可能精神刺穿成功这个目标。',
                hint: ({ targetName, cost, range }) => `<div style="color: var(--text-main); font-size: var(--text-sm); line-height: 1.8;">
            在上方棋盘点一个${range}格内的敌人（斜角同样按1格计算）。
            <br>当前目标：<b style="color: var(--color-primary);">${targetName}</b>
            <div style="color: var(--text-muted); margin-top: 6px;">
                穿刺并攻击目标的「精神体」，带来难以克制的疼痛。
                用扣费后的当前灵性，对目标当前灵性 / 人性 / 理智里最高的一项拼点；
                成功后目标陷入精神剧痛：下一个战斗回合无法行动，战术动作位也会被占用。
                消耗灵性 ${cost}，成败都扣，可以无限次使用。已有硬控不会叠加或刷新。
            </div>
        </div>`,
            },
            messages: {
                fail: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}没能贯穿 ${target.name} 的精神体${tail}`,
                superseded: ({ caster, target, tail }) =>
                    `✗ ${caster.name} 成功刺穿 ${target.name} 的精神体前，目标已被别人抢先控制${tail}`,
                invalid: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}落到 ${target.name} 身上时，目标已被别人抢先转化${tail}`,
                pending: ({ target, name, tail }) =>
                    `✗ ${target.name} 已处于无法行动状态，${name}未能叠加${tail}`,
                win: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 以${name}攻击 ${target.name} 的精神体，使其陷入难以克制的精神剧痛，`
                    + `下一回合无法行动${tail}`,
                report: ({ actor, target }) =>
                    `${actor}以「${TacticCatalog.MENTAL_PIERCE}」穿刺并攻击${target}的「精神体」，使其陷入难以克制的疼痛。`,
            },
        },
        [TacticCatalog.INTIMIDATION_STUN]: {
            buttonLabel: '⚖️ 威压震慑',
            reason: TacticCatalog.INTIMIDATION_STUN_REASON,
            access: {
                titles: [TacticCatalog.INTIMIDATION_STUN_TITLE],
                pathwayShort: '仲裁人',
                rankGate: TacticCatalog.INTIMIDATION_STUN_RANK_GATE,
            },
            cost: {
                stat: TacticCatalog.INTIMIDATION_STUN_COST_STAT,
                ratio: TacticCatalog.INTIMIDATION_STUN_RATIO,
            },
            casterStats: TacticCatalog.INTIMIDATION_STUN_CASTER_STATS,
            targetStats: TacticCatalog.INTIMIDATION_STUN_TARGET_STATS,
            npc: { enabled: true, chance: TacticCatalog.INTIMIDATION_STUN_NPC_CHANCE },
            resultKind: 'intimidation-stun',
            ui: {
                noStat: key => `当前${key}为 0，无法发起威压震慑。`,
                noTarget: '场上没有你有可能震慑成功、且尚未被硬控的敌人。',
                pendingTarget: '他已经处于硬控状态，不会叠加、也不会刷新。',
                lowStatTarget: '你的灵性与人性过低，没有可能震慑成功这个目标。',
                hint: ({ targetName, cost }) => `<div style="color: var(--text-main); font-size: var(--text-sm); line-height: 1.8;">
            在上方棋盘点一个敌人，不限距离。
            <br>当前目标：<b style="color: var(--color-primary);">${targetName}</b>
            <div style="color: var(--text-muted); margin-top: 6px;">
                释放威压将目标震慑在原地。消耗灵性 ${cost}，成败都扣；
                用扣费后的当前灵性 / 当前人性里较高的一项，对目标当前灵性 / 人性 / 理智里最高的一项拼点；
                成功后目标下一战斗回合无法移动、无法出手，战术动作位也会被占用。已有硬控不会叠加或刷新。
            </div>
        </div>`,
            },
            messages: {
                fail: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}没能震慑 ${target.name}${tail}`,
                superseded: ({ caster, target, tail }) =>
                    `✗ ${caster.name} 成功震慑 ${target.name} 前，目标已被别人抢先控制${tail}`,
                invalid: ({ caster, target, name, tail }) =>
                    `✗ ${caster.name} 的${name}落到 ${target.name} 身上时，目标已被别人抢先转化${tail}`,
                pending: ({ target, name, tail }) =>
                    `✗ ${target.name} 已处于无法行动状态，${name}未能叠加${tail}`,
                win: ({ caster, target, name, tail }) =>
                    `✓ ${caster.name} 以${name}将 ${target.name} 震慑在原地，下一回合无法行动${tail}`,
                report: ({ actor, target }) =>
                    `${actor}以「${TacticCatalog.INTIMIDATION_STUN}」释放威压，${target}被震慑在原地。`,
            },
        },
    },

    subtypes() {
        return Object.keys(this.SUBTYPES);
    },

    has(subtype) {
        return !!this.SUBTYPES[subtype];
    },

    cfgOf(subtype) {
        return this.SUBTYPES[subtype] || null;
    },

    resultCfg(kind) {
        return this.subtypes()
            .map(subtype => this.SUBTYPES[subtype])
            .find(cfg => cfg.resultKind === kind) || null;
    },

    buttonLabel(subtype) {
        return this.cfgOf(subtype)?.buttonLabel || String(subtype || '');
    },

    canUse(bm, hero, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || !hero) return false;
        const access = cfg.access || {};
        if (typeof access.predicate === 'function') return !!access.predicate(bm, hero);

        const s = String(hero.sequenceString || '');
        if ((access.titles || []).some(title => title && s.includes(title))) return true;
        return LifeSaveManager.splitSequenceFragments(s).some(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            if (!r || r.pathwayShort !== access.pathwayShort) return false;
            const rank = Number(r.rank);
            const floor = Number(access.rankAtLeast);
            return rank <= Number(access.rankGate)
                && (!Number.isFinite(floor) || rank >= floor);
        });
    },

    statKeyOf(subtype) {
        return this.cfgOf(subtype)?.cost?.stat || '灵性';
    },

    fieldOf(key) {
        return `当前${key}`;
    },

    costForRank(subtype, rank) {
        const cfg = this.cfgOf(subtype);
        if (!cfg) return 0;
        const attrs = ConsumableMoveBuilder.getAvgAttrs(rank);
        const key = this.statKeyOf(subtype);
        return Math.max(1, Math.round((Number(attrs[key]) || 0) * Number(cfg.cost.ratio || 0)));
    },

    costOf(hero, subtype) {
        return this.costForRank(subtype, hero && hero.sequenceRank);
    },

    spend(hero, subtype) {
        const key = this.statKeyOf(subtype);
        const field = this.fieldOf(key);
        const cost = this.costOf(hero, subtype);
        hero.additionalStats[field] = Math.max(0, (hero.additionalStats[field] ?? 0) - cost);
        return { key, field, cost };
    },

    casterStatKeysOf(subtype) {
        const configured = this.cfgOf(subtype)?.casterStats;
        return Array.isArray(configured) && configured.length
            ? configured
            : [this.statKeyOf(subtype)];
    },

    casterStatOf(hero, subtype) {
        const stats = (hero && hero.additionalStats) || {};
        return Math.max(...this.casterStatKeysOf(subtype)
            .map(key => stats[this.fieldOf(key)] ?? 0));
    },

    statAfterCost(hero, subtype) {
        const stats = (hero && hero.additionalStats) || {};
        const costKey = this.statKeyOf(subtype);
        const cost = this.costOf(hero, subtype);
        return Math.max(...this.casterStatKeysOf(subtype).map(key => {
            const current = stats[this.fieldOf(key)] ?? 0;
            return key === costKey ? Math.max(0, current - cost) : current;
        }));
    },

    hasStat(hero, subtype) {
        const field = this.fieldOf(this.statKeyOf(subtype));
        return (hero?.additionalStats?.[field] ?? 0) > 0;
    },

    targetStatOf(target, subtype) {
        const s = (target && target.additionalStats) || {};
        return Math.max(...(this.cfgOf(subtype)?.targetStats || [])
            .map(key => s[`当前${key}`] ?? 0));
    },

    canPossiblyWin(caster, target, subtype) {
        return EnemyControlManager.canPossiblyWin(
            caster, target, 1,
            this.statAfterCost(caster, subtype),
            this.targetStatOf(target, subtype),
        );
    },

    contest(caster, target, subtype, casterStat) {
        return EnemyControlManager.contest(
            caster, target, 1,
            casterStat,
            this.targetStatOf(target, subtype),
        );
    },

    /** 未配置 range 的旧子类保持无限距离；有限值统一按切比雪夫格数解释。 */
    rangeOf(subtype) {
        const range = Number(this.cfgOf(subtype)?.range);
        return Number.isFinite(range) && range >= 0 ? range : Infinity;
    },

    inRange(caster, target, subtype) {
        const range = this.rangeOf(subtype);
        return !Number.isFinite(range)
            || (!!caster && !!target && BattleBoard.distanceBetween(caster, target) <= range);
    },

    targets(bm, caster, subtype) {
        if (!bm || !caster || !this.canUse(bm, caster, subtype)) return [];
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        return (foes || []).filter(target =>
            EnemyControlManager.isEnemyOf(caster, target)
            && !OffFieldManager.isOff(target)
            && !TurnSkipManager.pending(target)
            && this.inRange(caster, target, subtype)
            && this.canPossiblyWin(caster, target, subtype));
    },

    blockedReason(bm, hero, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!hero) return '场上没有你可操作的角色。';
        if (!cfg) return '没有选择可用的硬控能力。';
        const key = this.statKeyOf(subtype);
        if (!this.hasStat(hero, subtype)) return cfg.ui.noStat(key);
        if (!this.targets(bm, hero, subtype).length) return cfg.ui.noTarget;
        return '';
    },

    targetHint(caster, target, subtype) {
        const cfg = this.cfgOf(subtype);
        if (!cfg) return '没有选择可用的硬控能力。';
        const off = OffFieldManager.meta(target);
        if (off) return off.pickHint;
        if (!this.inRange(caster, target, subtype)) {
            return cfg.ui.outOfRangeTarget || '目标不在这项硬控的射程内。';
        }
        if (TurnSkipManager.pending(target)) return cfg.ui.pendingTarget;
        return cfg.ui.lowStatTarget;
    },

    hintHtml(subtype, hero, target) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || typeof cfg.ui?.hint !== 'function') return '';
        return cfg.ui.hint({
            targetName: target ? window.escapeHtml(target.name) : '未选择',
            cost: hero ? this.costOf(hero, subtype) : 0,
            range: this.rangeOf(subtype),
        });
    },

    attempt(caster, target, subtype) {
        if (!target || !this.has(subtype) || !this.inRange(caster, target, subtype)) return null;
        this.spend(caster, subtype);
        return {
            ...TacticBorrowReport.meta(caster),
            caster,
            target,
            subtype,
            roll: this.contest(
                caster, target, subtype,
                this.casterStatOf(caster, subtype),
            ),
        };
    },

    npcSubtypes() {
        return this.subtypes().filter(subtype => this.SUBTYPES[subtype].npc?.enabled);
    },

    npcShouldTry(bm, hero, subtype) {
        const cfg = this.cfgOf(subtype);
        return !!cfg?.npc?.enabled
            && this.canUse(bm, hero, subtype)
            && this.hasStat(hero, subtype)
            && this.targets(bm, hero, subtype).length > 0
            && Math.random() * 100 < Number(cfg.npc.chance || 0);
    },

    arbitrateSubtype(bm, subtype, attempts, summary, results) {
        const cfg = this.cfgOf(subtype);
        if (!cfg || !attempts || !attempts.length) return;
        const name = subtype;
        const message = (kind, a) => cfg.messages[kind]({
            caster: a.caster,
            target: a.target,
            name,
            tail: EnemyControlManager.contestTail(a.roll),
        });

        attempts.filter(a => !a.roll.win).forEach(a => summary.push(message('fail', a)));

        EnemyControlManager.groupByTarget(attempts.filter(a => a.roll.win)).forEach(list => {
            const champ = EnemyControlManager.pickWinner(list);
            list.forEach(a => {
                if (a !== champ) {
                    summary.push(message('superseded', a));
                    return;
                }
                const casterOk = TacticResolver.alive(a.caster)
                    && !OffFieldManager.isOff(a.caster);
                if (!EnemyControlManager.isEnemyOf(a.caster, a.target)
                    || !casterOk
                    || OffFieldManager.isOff(a.target)) {
                    summary.push(message('invalid', a));
                    return;
                }

                const applied = TurnSkipManager.apply(bm, a.target, cfg.reason);
                if (!applied) {
                    summary.push(message('pending', a));
                    return;
                }
                summary.push(message('win', a));
                results.push({ ...TacticBorrowReport.meta(a.caster),
                    kind: cfg.resultKind,
                    actor: a.caster.name,
                    target: a.target.name,
                });
            });
        });
    },

    arbitrate(bm, attempts, summary, results) {
        this.subtypes().forEach(subtype => {
            this.arbitrateSubtype(
                bm,
                subtype,
                (attempts || []).filter(a => a.subtype === subtype),
                summary,
                results,
            );
        });
    },

    reportLine(result) {
        const cfg = result && this.resultCfg(result.kind);
        return cfg && typeof cfg.messages.report === 'function'
            ? cfg.messages.report(result)
            : '';
    },
};

class CpuBoardSearch {
    getReachableCells(hero, move) {
        const out = [];
        const budget = Math.max(0, Math.floor(Number(move) || 0));
        if (!hero || !Number.isFinite(hero.x) || !Number.isFinite(hero.y)) return out;
        if (!this.inBounds(hero.x, hero.y)) return out;

        const total = this.cols * this.rows;
        const cost = new Array(total).fill(Infinity);
        const done = new Array(total).fill(false);
        cost[this.idx(hero.x, hero.y)] = 0;

        // 棋盘只有 12×10，取最小值用线性扫比维护一个堆更省事也更快
        for (;;) {
            let cur = -1;
            let curCost = Infinity;
            for (let i = 0; i < total; i++) {
                if (!done[i] && cost[i] < curCost) { curCost = cost[i]; cur = i; }
            }
            if (cur < 0 || curCost > budget) break;
            done[cur] = true;

            const cx = cur % this.cols;
            const cy = (cur - cx) / this.cols;
            const occupant = this.cells[cur];
            if (!occupant || occupant === hero) {
                out.push({ x: cx, y: cy, steps: curCost, cost: curCost });
            }

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (!this.inBounds(nx, ny)) continue;
                    const ni = this.idx(nx, ny);
                    if (done[ni]) continue;
                    // 这里刻意不看 cells：人不挡路，只有上面那句「落脚格须空」管终点
                    const next = curCost + this.moveCostAt(nx, ny);
                    if (next < cost[ni]) cost[ni] = next;
                }
            }
        }
        return out;
    }

    /**
     * 洪泛结果的 `"x,y" → 累计消耗` 索引。同一回合要反复查可达性时先取一次，
     * 别让 findFiringCell 与 AI 的选格各跑一遍洪泛。
     * @returns {Map<string, number>}
     */
    reachableCostMap(hero, move) {
        const map = new Map();
        this.getReachableCells(hero, move).forEach(c => map.set(`${c.x},${c.y}`, c.cost));
        return map;
    }

    /**
     * 找一个「刚好能对 target 出手」的落脚格。
     *
     * 两条路：给了 `pick` 打分器（AI 侧）就把**所有**能打到目标的可达格交出去比一比；
     * 没给（玩家侧与兜底）就保持改造前的行为——已在射程内不动，否则取最近的合法圈。
     *
     * @param {Function|null} pick - 收到按消耗排序的候选格数组，返回选中的那个；
     *   返回 null 表示「这些格都不值得踏，换个目标」
     * @returns {{x:number,y:number,steps:number,cost:number}|null} 够不着时返回 null
     */
    findFiringCell(hero, target, rmin, rmax, move, reach = null, pick = null) {
        if (!hero || !target) return null;
        if (!Number.isFinite(hero.x) || !Number.isFinite(target.x)) return null;

        const maxSteps = Math.max(0, Math.floor(Number(move) || 0));
        const minR = Math.max(0, Math.floor(Number(rmin) || 0));
        const maxR = Number.isFinite(rmax) ? Math.floor(rmax) : Infinity;
        const d = BattleBoard.distance(hero.x, hero.y, target.x, target.y);

        // 合法性只认洪泛：地形铺开后「隔壁一格」也可能贵到走不过去。
        // 洪泛结果本身已经排掉了被占的格、并且包含自己脚下那格。
        const costMap = reach || this.reachableCostMap(hero, maxSteps);

        if (pick) {
            // 自己脚下那格消耗为 0，也在候选里，所以「原地已是最高分就不动」是打分的
            // 自然结果，不需要特判。**打分器返回 null 不能回落到 candidates[0]**，
            // 那会让「全是有害格时先算笔账」的检查形同虚设。
            const candidates = [];
            costMap.forEach((cost, key) => {
                const comma = key.indexOf(',');
                const x = Number(key.slice(0, comma));
                const y = Number(key.slice(comma + 1));
                const dist = BattleBoard.distance(x, y, target.x, target.y);
                if (dist >= minR && dist <= maxR) candidates.push({ x, y, steps: cost, cost });
            });
            if (candidates.length === 0) return null;
            candidates.sort((a, b) => a.cost - b.cost);
            return pick(candidates) || null;
        }

        // 已在射程内：不动
        if (d >= minR && d <= maxR) return { x: hero.x, y: hero.y, steps: 0, cost: 0 };

        // 目标圈半径：太远收到 maxR，太近推到 minR
        const wanted = d > maxR ? maxR : minR;
        if (wanted <= 0) return null;

        const candidates = this.getOuterRangeCells(target.x, target.y, wanted)
            .map(c => ({ x: c.x, y: c.y, cost: costMap.get(`${c.x},${c.y}`) }))
            .filter(c => c.cost !== undefined)
            .map(c => ({ x: c.x, y: c.y, steps: c.cost, cost: c.cost }))
            .sort((a, b) => a.cost - b.cost);

        return candidates.length > 0 ? candidates[0] : null;
    }
  }

const TERRAIN_NORM_DIVISOR = { damage: 0.12, status: 0.30 };

/**
 * 「这格对我总体有多糟」，归一化到与射程契合、滞留成本可比的刻度上，给 AI 落脚打分用。
 * **带符号：危害为负、增益为正**，直接代进 `+ W_地形 × 地形危害`，不需任何取反。
 *
 * 参考值（同级）：被克制 −1.00（residue 翻倍读作 −2.00）、无关系 −0.42、
 * 抗性 −0.17、适应 +0.33；地形比角色弱 3 级只剩 −0.05。
 */
function terrainHazardScore(hero, terrain) {
  if (!hero || !terrain || terrain.种类 !== 'hazard') return 0;
  const stats = hero.additionalStats || {};
  let sum = 0;
  terrainEffectsFor(hero, terrain).forEach(hit => {
    const isStatus = hit.风味 === 'status';
    // 第一层 · 除以属性上限。地形效果是固定整数值，若直接拿「−3 活力」打分，
    // 序列 9（55 活力）和序列 3（7400 活力）会同等害怕同一堆篝火。
    // 状态型统一按敏捷上限定价，与 T3 表 4 的基准列一致——attack / defense 是
    // 派生值且其中最高维恒为敏捷，speed 本身就是敏捷。
    const cap = isStatus
      ? Number(stats.敏捷) || 0
      : Number(stats[String(hit.属性).replace('当前', '')]) || 0;
    if (cap <= 0) return;
    // 第二层 · 除以该风味的被克制系数。只做第一层的话这一项取值只有 0.02~0.12，
    // 而射程契合是 0~1、滞留成本是 0.1~1.0，地形项会被淹没两个数量级，
    // AI 依然无视地形，等于 T7 白做。
    let v = (hit.值 / cap) / TERRAIN_NORM_DIVISOR[isStatus ? 'status' : 'damage'];
    // residue 踏进去的瞬间就承诺了至少「沾染回合」跳（挂载 + 离开后走完剩余时长），
    // 不乘的话 AI 会把毒液和火焰看成一样贵，实际前者贵一倍。
    // 站着不动的持续代价不用额外建模：刷新规则下每多站一回合恰好多吃一跳，
    // AI 每回合重新打分时自然算对。
    if (hit.通道 === 'residue') v *= Math.max(1, hit.沾染回合 || 1);
    sum += v;
  });
  return sum;
}

/**
 * 这块地形每回合削该角色多少**活力点数**（带符号，伤害为负、regen 为正）。
 *
 * 这与 terrainHazardScore 是**两套不能混用的口径**：那边要「这格对我总体有多糟」
 * （跨风味、归一化后），这边要「他还剩几成血」（必须与 attrRatio 同量纲，
 * 只取伤害型打活力的那部分）。状态型削他的 attack 不会让他离死更近，混进来就是错的。
 */
function terrainVitalityDeltaFor(hero, terrain) {
  if (!terrain || terrain.种类 !== 'hazard') return 0;
  return terrainEffectsFor(hero, terrain)
    .filter(h => h.风味 === 'damage' && h.属性 === '当前活力')
    .reduce((s, h) => s + h.值, 0);
}

/**
 * 踏进这格要付的活力代价，**正数**，0 表示不掉血。
 * residue 乘沾染回合，与落脚打分的承诺跳数同口径。只统计掉血、不统计回血。
 */
function terrainVitalityCost(hero, terrain) {
  if (!terrain || terrain.种类 !== 'hazard') return 0;
  let cost = 0;
  terrainEffectsFor(hero, terrain).forEach(h => {
    if (h.风味 !== 'damage' || h.属性 !== '当前活力' || h.值 >= 0) return;
    cost += Math.abs(h.值) * (h.通道 === 'residue' ? Math.max(1, h.沾染回合 || 1) : 1);
  });
  return cost;
}

class CPUManager {
    constructor(difficulty = 'easy', battleManager = null) {
        this.difficulty = difficulty;
        this.battleManager = battleManager;
        console.log(`[CPUManager] AI管理器已初始化，难度: ${difficulty}`);
    }

    /** 可被恢复的属性（没有「当前运气」，运气不参与） */
    static get HEALABLE_ATTRS() {
        return ['活力', '敏捷', '灵性', '理智', '人性'];
    }

    /**
     * 决策主流程：目标驱动，不是格子驱动。
     * 建池 → 严格同级分层 → 残血记票 → 加权抽签 → 可达判定 → 三级退让。
     * @returns {Object|null} { skill, targets, moveTo, intent }；skill 为 null 表示只移动不出手
     */
    selectAction(hero, skills, allyTeam, enemyTeam) {
        const activeSkills = (skills || []).filter(skill =>
            !skill.isPassive && !SkillControlManager.isBanned(hero, skill.name));

        if (activeSkills.length === 0) {
            console.warn(`[CPUManager] ${hero.name} 没有可用的主动技能`);
            return null;
        }

        const usableSkills = activeSkills.filter(skill => {
            if (skill.isConsumable && (skill.remainingUses ?? 0) <= 0) return false;
            return skill.canUse(hero).canAfford;
        });

        if (usableSkills.length === 0) {
            console.warn(`[CPUManager] ${hero.name} 没有足够资源使用任何主动技能`);
            return null;
        }

        // 第一步 · 建池：不会攻击就不看敌人，没有 isHeal 就压根看不见队友
        const attackSkills = usableSkills.filter(s => s.isHeal !== true);
        const healSkills = usableSkills.filter(s =>
            s.isHeal === true && CPUManager.HEALABLE_ATTRS.includes(s.healType || '活力'));

        const isFriendly = hero.teamType === 'ally';
        // 🆕 因附身离场的本体既不能打也不能治。这个谓词同时喂给 hostile 与 friendly
        // 两个池子；CPUManager 不走 TargetSelector.getFactionPool，所以必须在这里也挡一次
        const alive = h => (h?.additionalStats?.当前活力 ?? 0) > 0
            && !OffFieldManager.isOff(h);
        let hostile = attackSkills.length > 0
            ? (isFriendly ? enemyTeam : allyTeam).filter(h => alive(h) && !BriberyManager.isProtected(hero, h)) : [];

        // 🆕 秘偶化与召唤改写索敌。三件事：己方正在秘偶的目标不主动打（打了等于替对方解围），
        // 对面正在秘偶我方人、且本轮还没挨过实扣的施法者优先打，对面有召唤物在场的
        // 召唤者也优先打。只改目标池，不碰分层与抽签逻辑
        let priorityFoes = [];
        const priorityWhy = new Map();
        const bmRef = this.battleManager;
        let balanceFoe = null;
        if (bmRef && hostile.length > 0 && typeof BalanceManager !== 'undefined') {
            const balanced = BalanceManager.currentTarget(bmRef, hero);
            balanceFoe = balanced
                ? hostile.find(h => h.heroId === balanced.heroId) || null
                : null;
        }
        // 🆕 惩戒目标是比秘偶施法者 / 召唤者更高的一层优先池。
        // 已有关系可在目标离场时保留，但 hostile 只收在场单位，因此离场期间自然跳过。
        let punishmentFoe = null;
        if (bmRef && hostile.length > 0 && typeof PunishmentManager !== 'undefined') {
            const marked = PunishmentManager.currentTarget(bmRef, hero);
            punishmentFoe = marked
                ? hostile.find(h => h.heroId === marked.heroId) || null
                : null;
        }
        if (bmRef && hostile.length > 0) {
            const spare = new Set();
            const priority = new Set();
            const mark = (id, why) => {
                priority.add(id);
                const had = priorityWhy.get(id);
                priorityWhy.set(id, had && had !== why ? `${had}、${why}` : why);
            };
            EnemyControlManager.ensure(bmRef).processes.forEach(p => {
                const caster = EnemyControlManager.findHero(bmRef, p.casterId);
                if (!caster) return;
                if (caster.teamType === hero.teamType) { spare.add(p.targetId); return; }
                // 🆕 本轮已经挨过实扣的施法者不再被特殊针对：拼点劣势那边已经罚过他一次，
                // 再让所有人都往他身上招呼就是重复施压。他仍留在 hostile 里，该打还会打
                if (EnemyControlManager.wasDamaged(bmRef, caster)) return;
                mark(p.casterId, '秘偶转化');
            });

            if (spare.size > 0) {
                const kept = hostile.filter(h => !spare.has(h.heroId));
                // 场上只剩被秘偶的人时不能清空池子，否则这个 AI 会整轮空过
                if (kept.length > 0) hostile = kept;
            }

            // 🆕 召唤者优先：召唤物还站在场上，就先冲它的主人。
            // 只有序列不弱于主人的才接这条差事——序列数字比主人大的去打是白扔伤害，
            // 让它们按原本的分层挑够得着的。召唤物自己不进 spare：打掉它是净赚，照打
            const heroSeq = Number(hero.sequenceRank);
            if (Number.isFinite(heroSeq)) {
                (isFriendly ? enemyTeam : allyTeam).forEach(u => {
                    if (!u || !u.isSummon || !u.summonOwnerId || !alive(u)) return;
                    const owner = hostile.find(h => h.heroId === u.summonOwnerId);
                    if (!owner) return;
                    const ownerSeq = Number(owner.sequenceRank);
                    if (!Number.isFinite(ownerSeq) || heroSeq > ownerSeq) return;
                    mark(owner.heroId, '召唤物在场');
                });
            }

            priorityFoes = priority.size > 0
                ? hostile.filter(h => priority.has(h.heroId))
                : [];
        }
        const friendly = healSkills.length > 0
            ? (isFriendly ? allyTeam : enemyTeam)
                .filter(alive)
                // 自疗技能只能让 AI 看见自己；能治疗友军的技能才让对应友军入池
                .filter(target => healSkills.some(skill => this.canHealTarget(skill, hero, target)))
            : [];

        // 第二步 · 分层：sequenceRank 完全相等才算同级，自己永远在第一层
        const candidates = [
            ...hostile.map(u => ({ unit: u, side: 'enemy' })),
            ...friendly.map(u => ({ unit: u, side: 'ally' }))
        ];
        const tiers = this.buildSequenceTiers(hero, candidates);

        // 「平衡」权柄的绑定对象高于惩戒。先走完整的移动后开火判断；本回合仍
        // 够不着时继续旧索敌，不为了追一个人放弃眼前能打到的其他目标。
        if (balanceFoe) {
            const balancedTiers = this.buildSequenceTiers(
                hero,
                [{ unit: balanceFoe, side: 'enemy' }],
            );
            for (const tier of balancedTiers) {
                const action = this.resolveTierAction(hero, tier, attackSkills, healSkills);
                if (action) {
                    console.log(`[CPUManager] ${hero.name} 优先攻击平衡目标 ${balanceFoe.name}`);
                    return action;
                }
            }
        }

        // 🆕 先用现成的完整可达判定尝试惩戒目标：能原地或移动后出手就立即返回；
        // 本回合仍够不着则继续下面既有优先池与普通索敌，不强迫空走追击。
        if (punishmentFoe) {
            const markedTiers = this.buildSequenceTiers(
                hero,
                [{ unit: punishmentFoe, side: 'enemy' }],
            );
            for (const tier of markedTiers) {
                const action = this.resolveTierAction(hero, tier, attackSkills, healSkills);
                if (action) {
                    console.log(`[CPUManager] ${hero.name} 优先攻击惩戒目标 ${punishmentFoe.name}`);
                    return action;
                }
            }
        }

        // 🆕 秘偶施法者与召唤者优先：先只拿他们跑一遍完整的分层与抽签，全都够不着才退回原池子。
        // 只窄化 hostile 是不够的——那样够不着时会直接去走位，永远不打别人
        if (priorityFoes.length > 0) {
            const first = this.buildSequenceTiers(hero, priorityFoes.map(u => ({ unit: u, side: 'enemy' })));
            for (const tier of first) {
                const action = this.resolveTierAction(hero, tier, attackSkills, healSkills);
                if (action) {
                    const why = priorityWhy.get(action.targets[0].heroId) || '优先目标';
                    console.log(`[CPUManager] ${hero.name} 优先打击 ${action.targets[0].name}（${why}）`);
                    return action;
                }
            }
        }

        // 第三～六步：逐层尝试，层内抽签 + 三级退让
        for (const tier of tiers) {
            const action = this.resolveTierAction(hero, tier, attackSkills, healSkills);
            if (action) {
                console.log(`[CPUManager] ${hero.name} 决定${action.intent === 'heal' ? '治疗' : '攻击'} ${action.targets[0].name}，技能 ${action.skill.name}`);
                return action;
            }
        }

        // 所有开火方案都失败时，先向仍有效的平衡目标靠近；能直线推进就直走，
        // 受阻再用同一套反向寻路。两条都失败才回落普通目标。
        if (balanceFoe) {
            const balancedApproach = this.approachByScore(hero, balanceFoe);
            if (balancedApproach) {
                console.log(`[CPUManager] ${hero.name} 没有够得着的目标，向平衡目标 ${balanceFoe.name} 靠近`);
                return { skill: null, targets: [], moveTo: balancedApproach, intent: 'move' };
            }
            const balancedDetour = this.detourByRoute(hero, balanceFoe, attackSkills);
            if (balancedDetour) {
                console.log(`[CPUManager] ${hero.name} 直线靠近平衡目标受阻，绕路向 ${balanceFoe.name} 靠近`);
                return { skill: null, targets: [], moveTo: balancedDetour, intent: 'move' };
            }
        }

        // 全都够不着：往最想打的那个方向走，本回合不出手
        const approach = this.fallbackApproach(hero, tiers);
        if (approach) {
            console.log(`[CPUManager] ${hero.name} 没有够得着的目标，向 ${approach.towards.name} 靠近`);
            return { skill: null, targets: [], moveTo: approach.cell, intent: 'move' };
        }

        // 🆕 原直线靠近对所有目标都失败时才启用绕路。正常开火、移动后开火与
        // 能直接缩短距离的靠近全部已在上面返回，不会被这套路径规划改写。
        const detour = this.fallbackDetour(hero, tiers, attackSkills);
        if (detour) {
            console.log(`[CPUManager] ${hero.name} 直线靠近受阻，绕路向 ${detour.towards.name} 靠近`);
            return { skill: null, targets: [], moveTo: detour.cell, intent: 'move' };
        }

        console.warn(`[CPUManager] ${hero.name} 无目标可选，空过`);
        return null;
    }

    /**
     * 按序列差分层：差距小的在前；同差距时弱者（序列数字大）优先。
     * 一层 = 同一个 (差距, 强弱方向)，与旧 selectTargetBySequencePriority 的口径一致。
     * 实现已抽到 SequenceTiers 共用（规则修改挑单体目标要同一套口径），这里只做转发。
     * @returns {Array<{key:string, members:Array}>}
     */
    buildSequenceTiers(hero, candidates) {
        return SequenceTiers.build(hero, candidates);
    }

    /**
     * 单层内决策。两轮：第一轮按难度挑技能，够不着就剔人重抽；
     * 全层抽空后第二轮换「同类射程最远」的那把再来一遍；还不行返回 null 交给下一层。
     */
    resolveTierAction(hero, tier, attackSkills, healSkills) {
        for (let pass = 0; pass < 2; pass++) {
            const excluded = new Set();
            const fullBallot = this.buildBallot(tier, healSkills, hero);

            while (true) {
                const ballot = fullBallot.filter(e => e.votes > 0 && !excluded.has(e.unit.heroId));
                if (ballot.length === 0) break;

                const picked = this.weightedDraw(ballot);

                // 同类技能：治疗侧必须限定在同一条属性内，不能改去治别的
                const pool = picked.side === 'enemy'
                    ? attackSkills
                    : picked.eligibleSkills;

                if (pool.length === 0) {
                    excluded.add(picked.unit.heroId);
                    continue;
                }

                const skill = (pass === 0)
                    ? this.pickSkillByDifficulty(pool, hero)
                    : this.pickLongestRangeSkill(pool);

                const cell = this.resolveApproach(hero, picked.unit, skill);
                if (!cell) {
                    excluded.add(picked.unit.heroId);
                    continue;
                }

                return {
                    skill: skill,
                    targets: [picked.unit],
                    moveTo: cell,
                    intent: picked.side === 'enemy' ? 'attack' : 'heal'
                };
            }
        }
        return null;
    }

    /**
     * 记票：比例按「当前值 / 上限」，边界归上档。
     * 友军按每条可治属性各记一票，多病的更容易被盯上。
     */
    buildBallot(tier, healSkills, healer) {
        const out = [];
        tier.members.forEach(m => {
            if (m.side === 'enemy') {
                out.push({
                    unit: m.unit,
                    side: 'enemy',
                    // 🆕 主动用地形的另一半：陷在坏地形里的敌人比看起来更残，更值得打。
                    // 不新开票种，直接用有效比例——加权抽签自然就偏向他了。
                    votes: CPUManager.votesFor(this.effectiveVitalityRatio(m.unit), false)
                });
            } else {
                const healAttrs = [...new Set(healSkills.map(s => s.healType || '活力'))];
                healAttrs.forEach(attr => {
                    const eligibleSkills = healSkills.filter(skill =>
                        (skill.healType || '活力') === attr
                        && this.canHealTarget(skill, healer, m.unit)
                    );
                    // 没有任何技能能治疗这个目标的这条属性，就不生成无意义的票
                    if (eligibleSkills.length === 0) return;
                    out.push({
                        unit: m.unit,
                        side: 'ally',
                        attr: attr,
                        votes: CPUManager.votesFor(CPUManager.attrRatio(m.unit, attr), true),
                        eligibleSkills: eligibleSkills
                    });
                });
            }
        });
        return out;
    }

    /**
     * 治疗技能是否真的能作用于该目标。
     * self 只看施法者自己；ally / allAlly 可看同阵营单位（包括自己）。
     */
    canHealTarget(skill, healer, target) {
        if (!skill || !healer || !target || skill.isHeal !== true) return false;
        const targetType = skill.targetType || 'single';
        if (targetType === 'self') {
            return target.heroId === healer.heroId;
        }
        if (targetType === 'ally' || targetType === 'allAlly' || targetType === 'allAllies') {
            return target.teamType === healer.teamType;
        }
        return false;
    }

    static votesFor(ratio, isAlly) {
        if (ratio <= 0.30) return 7;
        if (ratio <= 0.50) return 4;
        if (ratio <= 0.70) return 2;
        return isAlly ? 0 : 1;   // 满血友军不值得治，满血敌人仍保底 1 票
    }

    static attrRatio(unit, attrName) {
        const curKey = `当前${attrName}`;
        const max = Number(unit?.additionalStats?.[attrName]) || 0;
        const cur = Number(unit?.additionalStats?.[curKey]) || 0;
        if (max <= 0) return 1;
        return cur / max;
    }

    /**
     * 加权抽签：票数即权重
     */
    weightedDraw(ballot) {
        const total = ballot.reduce((sum, e) => sum + e.votes, 0);
        let roll = Math.random() * total;
        for (const entry of ballot) {
            roll -= entry.votes;
            if (roll <= 0) return entry;
        }
        return ballot[ballot.length - 1];
    }

    /**
     * 难度只管「同类技能里挑哪把」。实际固定 easy = 随机。
     */
    pickSkillByDifficulty(pool, hero) {
        switch (this.difficulty) {
            case 'super-easy':
                return pool[0];
            case 'normal':
                return this.selectBestSkill(pool, hero);
            case 'easy':
            default:
                return pool[Math.floor(Math.random() * pool.length)];
        }
    }

    pickLongestRangeSkill(pool) {
        let best = -Infinity;
        let bucket = [];
        pool.forEach(skill => {
            const max = SkillRange.normalize(skill).max;
            if (max > best) { best = max; bucket = [skill]; }
            else if (max === best) { bucket.push(skill); }
        });
        return bucket[Math.floor(Math.random() * bucket.length)];
    }

    selectBestSkill(skills, hero) {
        return skills.reduce((best, current) => {
            return current.getPower(hero) > best.getPower(hero) ? current : best;
        }, skills[0]);
    }

    /**
     * 可达判定 + 落脚格。地形铺开之后这不再是一次加减，而是在所有合法格里按
     * PositionScore 挑一个——决策骨架不变，改动收敛在「选哪一格」这一处。
     * @returns {{x,y,steps,cost}|null} 够不着、或所有格都不值得踏时返回 null
     */
    resolveApproach(hero, target, skill) {
        const board = this.battleManager?.board;
        const stay = { x: hero.x, y: hero.y, steps: 0, cost: 0 };

        // 棋盘未就绪时一律放行，不让旧流程卡死
        if (!board || !Number.isFinite(hero.x) || !Number.isFinite(target?.x)) return stay;

        const pick = (candidates) => this.chooseFiringCell(hero, target, skill, candidates);

        // range:0 —— 以自己为圈心，要把目标卷进自己的爆炸半径里
        if (SkillRange.isSelfCentered(skill)) {
            const radius = SkillRange.isAllType(skill.targetType)
                ? SkillRange.resolveAoeRadius(skill) : 0;
            if (radius <= 0) return stay;
            return board.findFiringCell(hero, target, 0, radius, hero.move ?? 0, null, pick);
        }

        const r = SkillRange.normalize(skill);
        if (r.max === Infinity) return stay;   // global：原地开火，谈不上选格

        return board.findFiringCell(hero, target, r.min, r.max, hero.move ?? 0, null, pick);
    }

    // ---------- 落脚打分（T7） ----------

    /**
     * 三档行为权重：地形危害 / 射程契合 / 滞留成本。
     *
     * > **这九个数是占位值，不是定稿。** 结构（做哪三项、怎么归一化、怎么分档）已定，
     * > 但具体权重与免疫曲线同属「不实际打几场调不准」的那一类，落地后凭手感回来调。
     * > 三项都归一化到 0–1 之后调这几个数是安全的——改一个不会连锁破坏另外两项的量纲。
     *
     * 取值参考 XCOM 出货配置的规律：近战不该为了站位放弃贴脸（射程权重压到 1.0，
     * 地形权重也调低，它必须往前挤，容不下太多挑剔），远程反之（4.0，与 XCOM
     * Standard 档的 fDistanceWeight=4.0 同量级）；治疗位最惜命，地形权重最高。
     */
    static get POSITION_WEIGHTS() {
        return {
            melee:  { 地形: 1.5, 射程: 1.0, 滞留: 0.3 },
            ranged: { 地形: 2.0, 射程: 4.0, 滞留: 0.5 },
            heal:   { 地形: 3.0, 射程: 2.0, 滞留: 0.5 },
        };
    }

    /** 射程契合的分母，取棋盘长边。XCOM 在更大的图上取 16，比例相当。 */
    static get RANGE_DENOM() { return BattleBoard.DEFAULT_COLS; }

    /** 「视为差不多好」的容差，见 pickByScore。占位值。 */
    static get SCORE_TOLERANCE() { return 0.3; }

    /** 蹚有害地形的风险溢价：收益要大过成本这么多倍才值得。占位值。 */
    static get HAZARD_RISK_PREMIUM() { return 2; }

    /**
     * 行为档从**本次所选技能**推导，不新增任何角色字段。
     * 由技能而非角色属性决定才对：同一个角色用近战技能和用远程技能时，
     * 落位偏好本就该不同。
     */
    static profileOf(skill) {
        const W = CPUManager.POSITION_WEIGHTS;
        if (!skill) return W.melee;
        if (skill.isHeal === true) return W.heal;
        const max = SkillRange.normalize(skill).max;
        return (max <= 1) ? W.melee : W.ranged;
    }

    /**
     * 这格好不好站。三项都归一化到 0~1 量级，权重才有可比性（Game AI Pro Ch.26）。
     * 项数刻意少：能用过滤解决的别做成权重。
     */
    positionScore(hero, cell, target, skill) {
        const board = this.battleManager?.board;
        if (!board) return 0;
        const w = CPUManager.profileOf(skill);

        // 一、地形危害。带符号，危害为负、增益为正，直接加不取反。
        const 地形 = terrainHazardScore(hero, board.hazardAt(cell.x, cell.y));

        // 二、射程契合。抄 XCOM 2 XComAI.ini 的线性式。
        // 注记：候选格都已经被「能打到目标」过滤过，格间距离差最多 (max−min)/2，
        // 除以 12 后这一项在候选格之间几乎是常数——W_射程 真正起作用的场合是
        // fallback 走近时决定往哪个方向挪，调参时别指望靠它改变开火格的选择。
        let 射程 = 0;
        if (skill && target && Number.isFinite(target.x)) {
            const r = SkillRange.normalize(skill);
            if (Number.isFinite(r.max)) {
                const ideal = (r.min + r.max) / 2;
                const d = BattleBoard.distance(cell.x, cell.y, target.x, target.y);
                射程 = 1 - Math.abs(d - ideal) / CPUManager.RANGE_DENOM;
            }
        }

        // 三、滞留成本。这是**站定后**再挪窝的代价，与寻路时已经付过的路径消耗
        // 是两回事，不重复计算。
        const 滞留 = board.moveCostAt(cell.x, cell.y) / TERRAIN_MAX_COST;

        return w.地形 * 地形 + w.射程 * 射程 - w.滞留 * 滞留;
    }

    /**
     * 分数 → 权重的映射，然后交给现成的 weightedDraw。
     *
     * PositionScore 会出负分（站进熔岩），而轮盘赌要求权重为正——负票会让
     * `roll -= votes` 把随机数加回去，整个概率分布乱掉，所以分数不能直接当票数。
     *
     * 做法是「门槛内加权」：只留分数 ≥ best − ε 的格子，权重 = 分数 − (best − ε)，
     * 恒落在 (0, ε] 区间。负分因此不需要任何特殊处理——熔岩格分数远低于 best，
     * 直接进不了候选池。**相近的好格之间随机**（严格取最大会让玩家重复几场就摸透
     * 套路），**明显差的格绝不会因为运气被抽中**。
     */
    pickByScore(scored) {
        if (!scored || scored.length === 0) return null;
        if (scored.length === 1) return scored[0].cell;
        let best = -Infinity;
        scored.forEach(s => { if (s.score > best) best = s.score; });
        const floor = best - CPUManager.SCORE_TOLERANCE;
        const ballot = scored
            .filter(s => s.score >= floor)
            .map(s => ({ cell: s.cell, votes: (s.score - floor) || 1e-6 }));
        const picked = this.weightedDraw(ballot);
        return picked ? picked.cell : scored[0].cell;
    }

    /**
     * 在能打到目标的候选格里挑一个。
     * @returns {Object|null} null 表示「都不值得踏，换个目标」
     */
    chooseFiringCell(hero, target, skill, candidates) {
        const board = this.battleManager?.board;
        if (!board || !candidates || candidates.length === 0) return null;

        const allowed = candidates.filter(cell => !BriberyManager.attackBlockReason(this.battleManager, hero, skill, target, cell));
        if (!allowed.length) return null;
        const scored = allowed.map(cell => {
            const terrain = board.hazardAt(cell.x, cell.y);
            return {
                cell,
                score: this.positionScore(hero, cell, target, skill),
                危害: terrainHazardScore(hero, terrain),
                活力代价: terrainVitalityCost(hero, terrain),
            };
        });

        // 只要存在干净的开火格（地形危害 ≥ 0）就走正常打分，不用算账
        const clean = scored.filter(s => s.危害 >= 0);
        if (clean.length > 0) return this.pickByScore(clean);

        // 全都踩着有害地形：先算一笔账，值得才进去
        let cheapest = Infinity;
        scored.forEach(s => { if (s.活力代价 < cheapest) cheapest = s.活力代价; });
        if (!this.worthHazardStep(hero, target, skill, cheapest)) return null;
        return this.pickByScore(scored);
    }

    /**
     * 所有开火格都有害时，值不值得蹚进去。收益 > 风险溢价 × 成本 才算划算。
     *
     * **用点数比较，不换算成百分比**（拍板）。点数天然编码了威胁大小：序列 3 蹚一跳
     * 370 点的火去秒一个只剩 55 血的序列 9，账面 55 < 740 判不值得——这正是想要的
     * 结果，那个敌人的反击伤害还没这跳火疼，对面要打很久才构成威胁，秒他省不下什么。
     * 只有**同级敌人**的输出与自己的血量同刻度，才可能值得吃一跳高级火去斩杀。
     * 换成百分比会把这层威胁信息整个抹掉。
     *
     * 检查不通过**不等于空过**：调用方（resolveTierAction）会把这个目标排除掉
     * 重抽下一个——打 A 要蹚火、打 B 不用，那就去打 B。
     */
    worthHazardStep(hero, target, skill, hazardCost) {
        if (!(hazardCost > 0)) return true;   // 这格不掉血（比如只是个 debuff），没什么好算的
        if (!target) return true;
        try {
            if (skill && skill.isHeal === true) {
                const raw = typeof skill.calculateHealing === 'function'
                    ? skill.calculateHealing(hero, target, { battleManager: this.battleManager }) : 0;
                const amount = Number((raw && raw.amount !== undefined) ? raw.amount : raw) || 0;
                const attr = skill.healType || '活力';
                const max = Number(target.additionalStats?.[attr]) || 0;
                const cur = Number(target.additionalStats?.[`当前${attr}`]) || 0;
                // 溢出治疗不算收益：给满血队友补一口不该成为蹚火的理由
                const gain = Math.min(amount, Math.max(0, max - cur));
                return gain > CPUManager.HAZARD_RISK_PREMIUM * hazardCost;
            }
            // 🆕 命中率武器要按**期望**伤害算账：一把 8% 命中率的枪账面伤害再高，
            // 也不值得为它蹚一跳火。非命中率武器 chance 恒为 1，这一乘是恒等变换
            const balanceRelation = BalanceManager.pairRelation(this.battleManager, hero, target);
            const formulaContext = {
                battleManager: this.battleManager,
                actualAttacker: hero,
                parameterAttacker: balanceRelation ? target : hero,
                balanceTriggered: !!balanceRelation,
                balanceRelation,
            };
            const raw = Number(DamageCalculator.calculateDamageWithDivinity(hero, target, skill, formulaContext)) || 0;
            const dmg = raw * WeaponAccuracy.chance(hero, target, skill, formulaContext);
            const cur = Number(target.additionalStats?.当前活力) || 0;
            // 斩杀特判：击杀抹掉的是对方后续所有回合的输出，价值不止那点血量。
            // 只对**同级或比自己强**的目标成立——比自己弱的不享受特判，走普通算账，
            // 点数比较天然拦住「蹚重火去补刀低序列」。
            if (dmg >= cur && Number(target.sequenceRank) <= Number(hero.sequenceRank)) return true;
            const gain = Math.min(dmg, cur);   // 溢出伤害不算收益
            return gain > CPUManager.HAZARD_RISK_PREMIUM * hazardCost;
        } catch (e) {
            // 预估只是个决策辅助，算不出来就按老行为放行，绝不让它变成新的空过来源
            console.warn('[CPUManager] 预估收益失败，按值得处理', e);
            return true;
        }
    }

    /**
     * 敌人的**有效**血量比例。「他脚下的地形每回合在削他」本质上就是他比看起来更残，
     * 所以不新增票种，只在算比例时预扣一回合。
     *
     * 实得值**自带方向**：伤害为负，加上去压低比例（他离死更近、更值得打）；
     * regen 为正，抬高比例（他在回血，打他不划算）。**不要取绝对值，也不要写成减号**
     * ——取绝对值会把站在回血地形上的敌人误判成残血优先目标，写成减号则伤害为负时
     * 反而让他显得更健康，两种写法方向都是反的。
     *
     * 只看下一回合，刻意不做长远推演：地形还剩几回合、敌人下回合会不会走开都不确定，
     * 多算只会放大误差。
     */
    effectiveVitalityRatio(unit) {
        const base = CPUManager.attrRatio(unit, '活力');
        const board = this.battleManager?.board;
        if (!board) return base;
        const terrain = board.hazardAt(unit.x, unit.y);
        if (!terrain) return base;
        const max = Number(unit?.additionalStats?.活力) || 0;
        if (max <= 0) return base;
        return base + terrainVitalityDeltaFor(unit, terrain) / max;
    }

    /**
     * 一个都够不着时：朝最高优先级的那个目标走。
     *
     * 这是第一层、保持旧行为的直线靠近：只接受本回合立即缩短切比雪夫距离的格子。
     * 它对所有目标都失败后，调用方才会进入 fallbackDetour 处理横移与绕路。
     * @returns {{cell:Object, towards:Hero}|null}
     */
    fallbackApproach(hero, tiers) {
        const board = this.battleManager?.board;
        if (!board || !Number.isFinite(hero.x)) return null;

        for (const tier of tiers) {
            for (const member of tier.members) {
                const cell = this.approachByScore(hero, member.unit);
                if (cell) return { cell, towards: member.unit };
            }
        }
        return null;
    }

    /**
     * 第二层靠近：只在旧 fallbackApproach 对所有目标都返回 null 时调用。
     * 按原 tiers 顺序找第一个有真实绕行路线的敌人，不改正常索敌优先级。
     */
    fallbackDetour(hero, tiers, attackSkills) {
        const board = this.battleManager?.board;
        const move = Math.max(0, Math.floor(Number(hero?.move) || 0));
        if (!board || move <= 0 || !Number.isFinite(hero?.x)) return null;
        if (!Array.isArray(attackSkills) || attackSkills.length === 0) return null;

        for (const tier of tiers || []) {
            for (const member of tier.members || []) {
                // tiers 里还混着治疗候选；绕路开火只认敌方目标。
                if (member.side !== 'enemy') continue;
                const cell = this.detourByRoute(hero, member.unit, attackSkills);
                if (cell) return { cell, towards: member.unit };
            }
        }
        return null;
    }

    /** 某格是否能用至少一项可用攻击技能命中目标。 */
    canFireFromCell(cell, target, attackSkills) {
        if (!cell || !target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;
        const distance = BattleBoard.distance(cell.x, cell.y, target.x, target.y);
        return (attackSkills || []).some(skill => {
            if (!skill) return false;
            if (SkillRange.isSelfCentered(skill)) {
                const radius = SkillRange.isAllType(skill.targetType)
                    ? SkillRange.resolveAoeRadius(skill) : 0;
                return radius > 0 && distance <= radius;
            }
            const range = SkillRange.normalize(skill);
            return distance >= range.min && distance <= range.max;
        });
    }

    /**
     * 从目标的全部合法开火格反向跑带权 Dijkstra，得到每格到最近开火区的剩余代价。
     * 反向边 u←v 的代价等于正向从 u 踏入 v 的 moveCostAt(v)。单位仍只限制最终
     * 落脚，不阻挡中途通行；单格消耗高于本回合移动力则当前无法跨越。
     */
    buildDetourCostMap(hero, target, attackSkills) {
        const board = this.battleManager?.board;
        const result = new Map();
        const move = Math.max(0, Math.floor(Number(hero?.move) || 0));
        if (!board || move <= 0 || !Number.isFinite(target?.x)) return result;

        const total = board.cols * board.rows;
        const dist = new Array(total).fill(Infinity);
        const done = new Array(total).fill(false);
        const isOrigin = (x, y) => x === hero.x && y === hero.y;
        const enterable = (x, y) => isOrigin(x, y) || board.moveCostAt(x, y) <= move;

        // 多源终点：能站下、能踏入、且至少一项攻击技能可以从这里命中目标。
        for (let y = 0; y < board.rows; y++) {
            for (let x = 0; x < board.cols; x++) {
                if ((!board.isFree(x, y) && !isOrigin(x, y)) || !enterable(x, y)) continue;
                if (!this.canFireFromCell({ x, y }, target, attackSkills)) continue;
                dist[board.idx(x, y)] = 0;
            }
        }
        if (!dist.some(Number.isFinite)) return result;

        // 棋盘固定 12×10，线性找最小值比额外维护堆更简单，也与 getReachableCells 同构。
        for (;;) {
            let cur = -1;
            let curCost = Infinity;
            for (let i = 0; i < total; i++) {
                if (!done[i] && dist[i] < curCost) { curCost = dist[i]; cur = i; }
            }
            if (cur < 0) break;
            done[cur] = true;

            const cx = cur % board.cols;
            const cy = (cur - cx) / board.cols;
            result.set(`${cx},${cy}`, curCost);

            // 起点允许从高消耗地形离开，但不能把它当成将来可再次踏入的中转格。
            if (isOrigin(cx, cy) && board.moveCostAt(cx, cy) > move) continue;
            const reverseStepCost = board.moveCostAt(cx, cy);

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const px = cx + dx;
                    const py = cy + dy;
                    if (!board.inBounds(px, py) || !enterable(px, py)) continue;
                    const pi = board.idx(px, py);
                    if (done[pi]) continue;
                    const next = curCost + reverseStepCost;
                    if (next < dist[pi]) dist[pi] = next;
                }
            }
        }
        return result;
    }

    /**
     * 在本回合可达格里找一格，使「到最近开火区的剩余路线代价」严格下降。
     * 因而可以横移或短暂远离目标，但每回合都必须产生路径进度，不会原地横跳。
     */
    detourByRoute(hero, target, attackSkills) {
        const board = this.battleManager?.board;
        if (!board || !Number.isFinite(target?.x)) return null;
        const routeCost = this.buildDetourCostMap(hero, target, attackSkills);
        const originCost = routeCost.get(`${hero.x},${hero.y}`);
        if (!Number.isFinite(originCost)) return null;

        const candidates = board.getReachableCells(hero, hero.move ?? 0)
            .filter(cell => cell.cost > 0)
            .map(cell => ({
                cell,
                剩余: routeCost.get(`${cell.x},${cell.y}`),
                危害: terrainHazardScore(hero, board.hazardAt(cell.x, cell.y)),
            }))
            .filter(entry => Number.isFinite(entry.剩余) && entry.剩余 < originCost);
        if (candidates.length === 0) return null;

        // 与旧靠近一致：有安全落点就不主动踩危害；安全池内优先推进到剩余路线最短处。
        const clean = candidates.filter(entry => entry.危害 >= 0);
        const pool = clean.length > 0 ? clean : candidates;
        let bestRemaining = Infinity;
        pool.forEach(entry => { if (entry.剩余 < bestRemaining) bestRemaining = entry.剩余; });
        const furthestProgress = pool.filter(entry => entry.剩余 === bestRemaining);
        return this.pickByScore(furthestProgress.map(entry => ({
            cell: entry.cell,
            score: this.positionScore(hero, entry.cell, target, null),
        })));
    }

    /**
     * 走近一点。不再是「贴到最近」，而是在能拉近距离的可达格里按
     * 「地形更好 + 离目标更近」挑一个。
     *
     * 优先只在干净格里挑：走近而不出手本来就是被动局面，没必要为了少走一格去泡毒；
     * 一格干净的都没有，才在有害格里挑最不坏的——**总比杵在原地强**。
     */
    approachByScore(hero, target) {
        const board = this.battleManager.board;
        if (!Number.isFinite(target?.x)) return null;
        const here = BattleBoard.distance(hero.x, hero.y, target.x, target.y);
        const cells = board.getReachableCells(hero, hero.move ?? 0)
            .filter(c => c.cost > 0 && BattleBoard.distance(c.x, c.y, target.x, target.y) < here);
        if (cells.length === 0) return null;

        const scored = cells.map(cell => ({
            cell,
            // 这里没有「本次所选技能」，走近战档；射程项恒为 0，改用「离目标多近」
            // 顶上，量纲与射程契合一致（都除棋盘长边）。
            score: this.positionScore(hero, cell, target, null)
                - BattleBoard.distance(cell.x, cell.y, target.x, target.y) / CPUManager.RANGE_DENOM,
            危害: terrainHazardScore(hero, board.hazardAt(cell.x, cell.y)),
        }));
        const clean = scored.filter(s => s.危害 >= 0);
        return this.pickByScore(clean.length > 0 ? clean : scored);
    }

}

class TerrainTurnManager {
    constructor(battleManager, slot = {}) { this.battleManager = battleManager; this.slot = slot; }
    isExtraSlot() { return this.slot.extra === true; }
    currentSlotCfg() { return this.slot.cfg || {}; }
    processTerrainEffects(hero) {
    const results = [];
    if (!hero) return results;
    // 🆕 从动格（虚影轮）不吃地形。语义是「站着才吃」，而从动格并不是新的一回合，
    // 脚下这块地在本体那一格已经结算过一次了。必须排在 _terrainStandingOn 的
    // 记账之前返回，否则会把「这是刚站进来的第一回合吗」这条判据搅乱
    if (this.isExtraSlot() && this.currentSlotCfg().skipTurnStart) return results;
    if ((Number(hero.additionalStats?.当前活力) || 0) <= 0) return results;

    const board = this.battleManager && this.battleManager.board;
    if (!board) return results;
    const terrain = board.hazardAt(hero.x, hero.y);

    // 记住脚下是什么，用来判断「这是刚站进来的第一回合吗」——状态型每回合都要
    // 重挂一次，但没必要每回合都往日志里刷一行。
    const firstTurnHere = hero._terrainStandingOn !== (terrain ? terrain.id : null);
    hero._terrainStandingOn = terrain ? terrain.id : null;
    if (!terrain) return results;

    const hits = terrainEffectsFor(hero, terrain);
    if (hits.length === 0) return results;   // 全免疫，静默略过

    hits.forEach(hit => {
        let outcome = null;
        if (hit.风味 === 'damage' && hit.通道 === 'field') {
            outcome = this.applyTerrainDamage(hero, terrain, hit);
        } else if (hit.风味 === 'status' && hit.通道 === 'field') {
            outcome = this.applyTerrainStatus(hero, terrain, hit, firstTurnHere);
        } else if (hit.通道 === 'residue') {
            // 沾染的伤害不在这里结算——那是 processCharacterEffects 的活（效果挂在
            // 角色身上）。这里只保证「站着就一直算刚沾上」：刷新时长，
            // 一份都不剩时补挂一份。
            if (!this.refreshTerrainResidue(hero, terrain, hit)) {
                outcome = this.applyTerrainResidue(hero, terrain, hit);
            }
        }
        if (outcome) results.push(outcome);
    });

    return results;
}

/**
 * 落进 residue 格时挂一次沾染。由 board.place() 的钩子调用，是踏入的唯一入口。
 *
 * **伤害型 residue 允许叠加**，这是有意设计：每次踏入都新挂一份，在毒沼里反复
 * 挪动会叠出多份毒，比站着不动更痛——想少受罪就别在里面来回蹭。
 *
 * **状态型不叠加。** 第一版状态型只走 field 的「duration:1 + 每回合重挂」，
 * 同一时刻至多一份，天然没有叠加路径。日后若放开状态型 residue，
 * **必须在这里做同源去重**，这条现在就记死。
 */
attachTerrainResidue(hero, terrain) {
    if (!hero || !terrain) return;
    terrainEffectsFor(hero, terrain)
        .filter(h => h.通道 === 'residue')
        .forEach(hit => {
            if (hit.风味 !== 'damage') {
                console.warn('[地形] 第一版不支持状态型 residue，已跳过:', terrain.id, hit.属性);
                return;
            }
            this.applyTerrainResidue(hero, terrain, hit);
        });
}

/**
 * 挂一份沾染。伤害走 poison / 恢复走 regen（适应档会翻向），
 * 挂上之后就交给 processCharacterEffects 每回合结算，这里不管了。
 */
applyTerrainResidue(hero, terrain, hit) {
    const em = this.battleManager.effectManager;
    if (!em) return null;
    const turns = Math.max(1, hit.沾染回合 || 2);
    const magnitude = Math.abs(hit.值);
    if (magnitude <= 0) return null;

    // 名字必须唯一：applyEffect 的同名替换逻辑会把第二份当「更弱的重复」拒掉，
    // 而伤害型 residue 恰恰要叠。取第一个没被占用的序号，别让过期腾出来的
    // 名字和现存的撞上。
    const base = `${terrain.名称}·沾染`;
    const used = new Set((hero.effects || []).filter(e => e.duration > 0).map(e => e.name));
    let name = base;
    for (let i = 2; used.has(name); i++) name = `${base}${i}`;

    const res = em.applyEffect(hero, {
        name,
        type: hit.值 > 0 ? 'regen' : 'poison',
        stat: hit.属性,
        power: magnitude,
        valueType: 'fixed',
        duration: turns,
        triggerTiming: 'turn_start',
    }, null, null, {
        battleManager: this.battleManager,
        transferableExternal: hit.值 < 0,
        sourceLabel: terrain.名称,
        sourceKind: '地形沾染',
    });
    if (!res || !res.applied) return null;

    // 打上来源标记：站着期间要靠它认出该刷新哪几份
    const inst = (hero.effects || []).find(e => e.name === name && e.duration > 0);
    if (inst) {
        inst.terrainSource = terrain.id;
        inst.terrainResidueTurns = turns;
    }

    const verb = hit.值 > 0 ? '滋养' : '侵蚀';
    const display = String(hit.属性).replace('当前', '');
    const message = `${hero.name} 沾上了${terrain.名称}（${hit.档位}），此后 ${turns} 回合每回合${verb} ${display} ${magnitude} 点，离开也带着`;
    if (this.battleManager.battleLogger) {
        this.battleManager.battleLogger.log(message, 'effect');
    }
    if (this.battleManager.battleReporter && shouldReportTerrain(hero, terrain)) {
        this.battleManager.battleReporter.logEffectTrigger(hero, terrain.名称, message);
    }
    return { hero: hero.name, effect: terrain.名称, result: { message } };
}

/**
 * 站着期间把沾染时长刷回满值，**视为刚沾上**。人在毒里就一直算刚沾上，
 * 站着不动不是解药。
 *
 * 这一步排在 processCharacterEffects 之后（那里刚把时长递减过一轮），所以时长
 * 永远不会在站着时归零。少了这条会出现「站在毒液正中央、却因沾染过期而不再
 * 受伤」的荒谬结果。离开之后不再刷新，剩余时长正常走完，不回收——中的毒不因
 * 毒沼消失或人离开而提前解除。
 *
 * @returns {boolean} 是否找到了该刷新的份；false 表示一份都不剩，调用方补挂
 */
refreshTerrainResidue(hero, terrain, hit) {
    const live = (hero.effects || []).filter(e =>
        e.duration > 0 && e.terrainSource === terrain.id && e.stat === hit.属性
    );
    if (live.length === 0) return false;
    live.forEach(e => {
        const full = Number(e.terrainResidueTurns) || 0;
        if (full > e.duration) e.duration = full;
    });
    return true;
}

/**
 * 伤害型 · field 通道：不挂效果到角色身上，每回合按当前坐标现算现扣。
 * 少一套挂卸逻辑，就少一类「效果没卸干净」的 bug。
 * @returns {Object|null} 数值没变化时返回 null
 */
applyTerrainDamage(hero, terrain, hit) {
    const statName = hit.属性;                       // 当前活力 / 当前理智 / 当前人性
    const maxName = String(statName).replace('当前', '');
    const maxValue = Number(hero.additionalStats[maxName]) || 0;
    const oldValue = Number(hero.additionalStats[statName]) || 0;

    // hit.值 自带符号：负是伤害，正是恢复（适应档）。只有伤害进入传递层。
    const routed = hit.值 < 0
        ? EffectTransferManager.applyResolvedLoss(this.battleManager, hero, statName, Math.abs(hit.值), {
            sourceKind: '危险地形', sourceLabel: terrain.名称,
        })
        : null;
    let newValue = routed ? routed.newValue : oldValue + hit.值;
    newValue = Math.max(0, newValue);
    if (maxValue > 0) newValue = Math.min(maxValue, newValue);
    if (newValue === oldValue) return null;

    if (!routed) {
        hero.additionalStats[statName] = newValue;
        if (statName === '当前活力') {
            hero.health = newValue;
            hero.currentHealth = newValue;
        }
    }

    // 🆕 秘偶劣势标记：只认真的掉了值的那一档，适应档的回血不算
    if (newValue < oldValue) {
        EnemyControlManager.markDamaged(this.battleManager, hero);
    }

    const display = maxName;
    const verb = hit.值 < 0 ? '损失' : '恢复';
    const changed = routed ? routed.actualDamage : Math.abs(newValue - oldValue);
    const message = `${hero.name} 身处${terrain.名称}（${hit.档位}），${display}${verb} ${changed} 点。${display}：${oldValue}→${newValue}`;

    if (this.battleManager.battleLogger) {
        this.battleManager.battleLogger.log(message, 'effect');
    }
    // T9：只记生效的（上面 terrainEffectsFor 已筛），且只记与角色序列差距小于 2 的
    if (this.battleManager.battleReporter && shouldReportTerrain(hero, terrain)) {
        this.battleManager.battleReporter.logEffectTrigger(hero, terrain.名称, message);
    }

    return { hero: hero.name, effect: terrain.名称, result: { message } };
}

/**
 * 状态型 · field 通道：用「duration:1 + 每回合重挂」表达「站着才生效」。
 * 上一份刚在 processCharacterEffects 里被递减到 0 清掉，这里补一份新的。
 *
 * 副作用是**一回合延迟**：走出浓雾之后，眩晕要拖到下一个自己的回合开始才散。
 * 已知并接受——「刚冲出雾里眼睛还没缓过来」反而说得通。
 *
 * @param {boolean} firstTurnHere - 是否刚站进来，只有这一回合往日志里写
 * @returns {Object|null}
 */
applyTerrainStatus(hero, terrain, hit, firstTurnHere) {
    const em = this.battleManager.effectManager;
    if (!em) return null;

    // power 必须非负（validateEffect 会拒负数），方向交给 type：
    // applyBuffDebuff 按 buff / debuff 决定这份固定值是加还是减。
    const magnitude = Math.abs(hit.值);
    if (magnitude <= 0) return null;

    const res = em.applyEffect(hero, {
        // 每块地形每条属性一个稳定名字：复合地形的两条效果不会互相顶掉，
        // 同名重挂又能让 applyEffect 的替换逻辑挡住「弱效果覆盖强效果」。
        name: `${terrain.名称}·${hit.属性}`,
        type: hit.值 > 0 ? 'buff' : 'debuff',
        stat: hit.属性,          // 只可能是 attack / defense / speed
        power: magnitude,
        valueType: 'fixed',
        duration: 1,
    });
    if (!res || !res.applied) return null;
    if (!firstTurnHere) return { hero: hero.name, effect: terrain.名称, result: { message: '' } };

    const sign = hit.值 > 0 ? '+' : '−';
    const message = `${hero.name} 身处${terrain.名称}（${hit.档位}），${hit.属性} ${sign}${magnitude}（离开后一回合内消散）`;
    if (this.battleManager.battleLogger) {
        this.battleManager.battleLogger.log(message, 'effect');
    }
    if (this.battleManager.battleReporter && shouldReportTerrain(hero, terrain)) {
        this.battleManager.battleReporter.logEffectTrigger(hero, terrain.名称, message);
    }
    return { hero: hero.name, effect: terrain.名称, result: { message } };
}

/**
 * 🔥 新增：处理环境效果（战场级别的持续效果）
 * @param {Object} hero - 当前行动的角色
 * @returns {Array} 环境效果处理结果数组
 */
  }

function shouldReportTerrain(hero, terrain) {
  const rank = Number(hero && hero.sequenceRank);
  if (!Number.isFinite(rank)) return true;
  return (Number(terrain.强度) - rank) < 2;
}

const BalanceManager = {
    CONFIG: {
        pathway: '仲裁人',
        title: '失序者',
        titleRank: -1,
        names: [{ gate: 2, name: '「平衡」权柄' }],
    },
    MAX_POINTS: 10,

    ensure(bm) {
        if (!bm.balanceAuthority) bm.balanceAuthority = { spent: {}, relations: {} };
        if (!bm.balanceAuthority.spent) bm.balanceAuthority.spent = {};
        if (!bm.balanceAuthority.relations) bm.balanceAuthority.relations = {};
        return bm.balanceAuthority;
    },

    findHero(bm, heroId) {
        if (!bm || !heroId || !bm.teamManager) return null;
        return bm.teamManager.getAllHeroes().find(h => h && h.heroId === heroId) || null;
    },

    alive(hero) {
        return !!hero && (hero.additionalStats?.当前活力 ?? 0) > 0;
    },

    permanentTeamOf(bm, hero) {
        if (!hero) return null;
        if (typeof TempAllegianceManager !== 'undefined'
            && typeof TempAllegianceManager.originTeamOf === 'function') {
            return TempAllegianceManager.originTeamOf(bm, hero);
        }
        return hero.teamType;
    },

    permanentEnemies(bm, a, b) {
        const at = this.permanentTeamOf(bm, a);
        const bt = this.permanentTeamOf(bm, b);
        return !!at && !!bt && at !== bt;
    },

    eligibility(hero) {
        if (!hero) return { ok: false, rank: null, name: '' };
        const table = { [TacticCatalog.BALANCE_ACTION]: this.CONFIG };
        return AbilityAlias.resolve(hero.sequenceString, table)[TacticCatalog.BALANCE_ACTION]
            || { ok: false, rank: null, name: '' };
    },

    eligible(hero) {
        return !!this.eligibility(hero).ok;
    },

    coordinateOf(rank) {
        const r = Number(rank);
        if (!Number.isFinite(r)) return 2 - 10;
        if (r >= 2) return 2 - r;
        if (r >= 1) return 2 * (2 - r);
        if (r >= 0) return 2 + 4 * (1 - r);
        if (r >= -1) return 6 + 8 * (-r);
        return 14 + 16 * (-1 - r);
    },

    weightedGap(caster, target) {
        const cr = caster?.sequenceRank ?? parseSequenceRank(caster?.sequenceString);
        const tr = target?.sequenceRank ?? parseSequenceRank(target?.sequenceString);
        return Math.max(0, this.coordinateOf(tr) - this.coordinateOf(cr));
    },

    durationOf(caster, target) {
        const gap = this.weightedGap(caster, target);
        return Math.max(1, Math.round(20 / Math.pow(1 + gap, 1.5)));
    },

    costOf(caster, target) {
        const gap = this.weightedGap(caster, target);
        if (gap <= 0) return 1;
        if (gap <= 1) return 3;
        if (gap <= 2) return 4;
        if (gap <= 3) return 5;
        if (gap <= 4) return 6;
        if (gap <= 8) return 8;
        return 10;
    },

    spentOf(bm, caster) {
        if (!caster) return 0;
        return Math.max(0, Number(this.ensure(bm).spent[caster.heroId]) || 0);
    },

    pointsLeft(bm, caster) {
        return Math.max(0, this.MAX_POINTS - this.spentOf(bm, caster));
    },

    relationValid(bm, relation) {
        if (!bm || !relation) return false;
        const caster = this.findHero(bm, relation.casterId);
        const target = this.findHero(bm, relation.targetId);
        if (!this.alive(caster) || !this.alive(target)) return false;
        if (!this.permanentEnemies(bm, caster, target)) return false;
        return Number(bm.currentRound) <= Number(relation.expireAfterRound);
    },

    relationActive(bm, relation) {
        if (!this.relationValid(bm, relation)) return false;
        const round = Number(bm.currentRound) || 0;
        return round >= Number(relation.activeFromRound)
            && round <= Number(relation.expireAfterRound);
    },

    outgoingOf(bm, caster) {
        if (!bm || !caster) return null;
        const relation = this.ensure(bm).relations[caster.heroId] || null;
        return this.relationValid(bm, relation) ? relation : null;
    },

    incomingOf(bm, target) {
        if (!bm || !target) return [];
        return Object.values(this.ensure(bm).relations)
            .filter(relation => relation && relation.targetId === target.heroId
                && this.relationValid(bm, relation));
    },

    remainingRounds(bm, relation) {
        if (!relation || !this.relationValid(bm, relation)) return 0;
        const round = Number(bm.currentRound) || 0;
        if (round < Number(relation.activeFromRound)) return Number(relation.duration) || 0;
        return Math.max(0, Number(relation.expireAfterRound) - round + 1);
    },

    pairRelation(bm, heroA, heroB) {
        if (!bm || !heroA || !heroB) return null;
        const state = this.ensure(bm);
        const forward = state.relations[heroA.heroId];
        if (forward && forward.targetId === heroB.heroId && this.relationActive(bm, forward)) {
            return forward;
        }
        const reverse = state.relations[heroB.heroId];
        if (reverse && reverse.targetId === heroA.heroId && this.relationActive(bm, reverse)) {
            return reverse;
        }
        return null;
    },

    isPairActive(bm, heroA, heroB) {
        return !!this.pairRelation(bm, heroA, heroB);
    },

    currentTarget(bm, caster) {
        const relation = this.outgoingOf(bm, caster);
        return relation ? this.findHero(bm, relation.targetId) : null;
    },

    playerTargets(bm, caster) {
        if (!bm || !caster || !bm.teamManager) return [];
        return bm.teamManager.getAllHeroes().filter(target => target
            && target !== caster
            && this.alive(target)
            && this.permanentEnemies(bm, caster, target));
    },

    onField(hero) {
        return this.alive(hero)
            && !(typeof OffFieldManager !== 'undefined' && OffFieldManager.isOff(hero));
    },

    attackSkillsOf(hero) {
        return (Array.isArray(hero?.moveSet) ? hero.moveSet : []).filter(skill => {
            if (!skill || skill.isPassive || skill.isHeal === true) return false;
            if (SkillControlManager.isBanned(hero, skill.name)) return false;
            if (skill.isConsumable && (skill.remainingUses ?? 0) <= 0) return false;
            if (!skill.canUse(hero).canAfford) return false;
            const type = skill.targetType || 'single';
            return !SkillRange.isAllyType(type) && !SkillRange.isSelfType(type);
        });
    },

    canDirectlyAttack(bm, caster, target) {
        if (!bm || !this.onField(caster) || !this.onField(target)) return false;
        return this.attackSkillsOf(caster).some(skill => {
            const distance = BattleBoard.distanceBetween(caster, target);
            if (SkillRange.isSelfCentered(skill)) {
                if (!SkillRange.isAllType(skill.targetType)) return false;
                return distance <= SkillRange.resolveAoeRadius(skill);
            }
            return SkillRange.inRange(caster, target, skill);
        });
    },

    npcTarget(bm, caster) {
        if (!bm || !caster || !this.eligible(caster)) return null;
        const left = this.pointsLeft(bm, caster);
        const affordable = this.playerTargets(bm, caster)
            .filter(target => this.onField(target) && this.costOf(caster, target) <= left);
        if (!affordable.length) return null;

        let strongestRank = Infinity;
        affordable.forEach(target => {
            const rank = Number(target.sequenceRank);
            const normalized = Number.isFinite(rank) ? rank : 10;
            if (normalized < strongestRank) strongestRank = normalized;
        });
        const direct = affordable
            .filter(target => {
                const rank = Number(target.sequenceRank);
                return (Number.isFinite(rank) ? rank : 10) === strongestRank;
            })
            .filter(target => this.canDirectlyAttack(bm, caster, target));
        if (!direct.length) return null;

        const ratio = target => {
            const max = Number(target.additionalStats?.活力) || 0;
            const cur = Number(target.additionalStats?.当前活力) || 0;
            return max > 0 ? cur / max : 1;
        };
        return direct.map((target, index) => ({ target, index, ratio: ratio(target) }))
            .sort((a, b) => a.ratio - b.ratio || a.index - b.index)[0].target;
    },

    activate(bm, caster, target) {
        if (!bm || !caster || !target) return { applied: false, reason: 'target' };
        if (!this.eligible(caster)) return { applied: false, reason: 'eligibility' };
        if (!this.playerTargets(bm, caster).some(h => h.heroId === target.heroId)) {
            return { applied: false, reason: 'target' };
        }
        const cost = this.costOf(caster, target);
        const left = this.pointsLeft(bm, caster);
        if (left < cost) return { applied: false, reason: 'points', cost, pointsLeft: left };

        const state = this.ensure(bm);
        const oldRelation = this.outgoingOf(bm, caster);
        const oldTarget = oldRelation ? this.findHero(bm, oldRelation.targetId) : null;
        const mode = oldTarget
            ? (oldTarget.heroId === target.heroId ? 'refresh' : 'switch')
            : 'start';
        const duration = this.durationOf(caster, target);
        const appliedRound = Number(bm.currentRound) || 0;
        const relation = {
            casterId: caster.heroId,
            targetId: target.heroId,
            appliedRound,
            activeFromRound: appliedRound + 1,
            expireAfterRound: appliedRound + duration,
            duration,
            cost,
        };
        state.spent[caster.heroId] = this.spentOf(bm, caster) + cost;
        state.relations[caster.heroId] = relation;
        return {
            applied: true,
            mode,
            oldTarget,
            target,
            cost,
            duration,
            pointsLeft: this.pointsLeft(bm, caster),
            relation,
        };
    },

    activationSummary(caster, applied) {
        if (!caster || !applied?.applied) return '';
        const tail = `（消耗 ${applied.cost} 点，${applied.mode === 'refresh' ? '重新维持' : '维持'} ${applied.duration} 回合，剩余 ${applied.pointsLeft}/10）`;
        if (applied.mode === 'refresh') {
            return `✓ ${caster.name} 刷新了与 ${applied.target.name} 的平衡${tail}`;
        }
        if (applied.mode === 'switch') {
            return `✓ ${caster.name} 将平衡对象由 ${applied.oldTarget.name} 切换为 ${applied.target.name}${tail}`;
        }
        return `✓ ${caster.name} 对 ${applied.target.name} 发动「平衡」权柄${tail}`;
    },

    resultOf(caster, applied) {
        return {
            kind: 'balance',
            stage: applied.mode,
            actor: caster.name,
            oldTarget: applied.oldTarget?.name || '',
            target: applied.target.name,
        };
    },

    collectEnded(bm, includeExpired) {
        if (!bm) return [];
        const state = this.ensure(bm);
        const results = [];
        Object.entries(state.relations).forEach(([casterId, relation]) => {
            if (!relation) return;
            const caster = this.findHero(bm, relation.casterId);
            const target = this.findHero(bm, relation.targetId);
            let stage = '';
            if (!this.alive(caster)) stage = 'caster-dead';
            else if (!this.alive(target)) stage = 'target-dead';
            else if (!this.permanentEnemies(bm, caster, target)) stage = 'allied';
            else if (includeExpired
                && (Number(bm.currentRound) || 0) >= Number(relation.expireAfterRound)) stage = 'expired';
            if (!stage) return;
            delete state.relations[casterId];
            if (!caster || !target) return;
            results.push({ kind: 'balance', stage, actor: caster.name, target: target.name });
        });
        return results;
    },

    sweepInvalid(bm) {
        return this.collectEnded(bm, false);
    },

    tick(bm) {
        return this.collectEnded(bm, true);
    },

    parameterAttackerFor(bm, attacker, defender) {
        return this.isPairActive(bm, attacker, defender) ? defender : attacker;
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

const SKILL_CONTROL_TABLE = {
    仲裁人: { 禁止: { from: 6, name: '禁止' } },
    歌颂者: { 禁止: { from: 6, name: '公证无效' } },
    囚犯:   { 禁止: { from: 3, name: '变形诅咒' } },
    病患:   { 禁止: { from: 3, name: '能力衰败' } },
    入门者: { 禁止: { from: 4, name: '哲学具象化：规则修改' } },
    流浪汉: { 禁止: { from: 5, name: '临时能力剥夺' }, 偷窃: { from: 5, name: '能力吞噬' } },
    阅读者: { 禁止: { from: 1, name: '星界导师权柄' }, 复制: { from: 6, name: '模仿' } },
    战士:   { 禁止: { from: 0, name: '「战斗」权柄' } },
    偷盗者: { 偷窃: { from: 6, name: '窃取非凡能力' } },
    学徒:   { 复制: { from: 6, name: '记录' } }
};

/**
 * 技能干涉的运行期状态。这三类改的是技能条目本身而不是某条属性，
 * EffectManager 的四条通道（buff/debuff/poison/regen）表达不了，所以单开一套：
 * 状态挂在 hero.skillControl 上，由两个「这个技能能不能用」的过滤点读取。
 */
class OriginalSkillControlManager {
    static MODES = ['禁止', '偷窃', '复制'];

    /**
     * 解析三类资格。多途径按段合并，同一类取片段从左到右第一个。
     * @returns {{禁止: string, 偷窃: string, 复制: string}} 值为表内技能名，空串表示没有资格
     */
    static resolveEligibility(sequenceString) {
        const result = { 禁止: '', 偷窃: '', 复制: '' };
        const fragments = LifeSaveManager.splitSequenceFragments(sequenceString);
        if (fragments.length === 0) return result;

        for (const frag of fragments) {
            const resolved = LifeSaveManager.resolveFragment(frag);
            if (!resolved) continue;
            const entry = SKILL_CONTROL_TABLE[resolved.pathwayShort];
            if (!entry) continue;

            OriginalSkillControlManager.MODES.forEach(mode => {
                const slot = entry[mode];
                if (!slot) return;
                if (Number(resolved.rank) > Number(slot.from)) return;
                if (!result[mode]) result[mode] = slot.name;
            });
        }
        return result;
    }

    /** 三类里至少命中一类 */
    static hasAny(sequenceString) {
        const e = OriginalSkillControlManager.resolveEligibility(sequenceString);
        return !!(e.禁止 || e.偷窃 || e.复制);
    }

    static ensure(hero) {
        if (!hero.skillControl) hero.skillControl = { banned: [], granted: [] };
        return hero.skillControl;
    }

    static isBanned(hero, skillName) {
        const sc = hero && hero.skillControl;
        if (!sc || !sc.banned.length) return false;
        return sc.banned.some(b => b.name === skillName);
    }

    /** 已有同名封禁就取较晚的到期回合，不叠加 */
    static ban(hero, skillName, until) {
        const sc = OriginalSkillControlManager.ensure(hero);
        const exist = sc.banned.find(b => b.name === skillName);
        if (exist) {
            exist.until = Math.max(exist.until, until);
            return;
        }
        sc.banned.push({ name: skillName, until });
    }

    /**
     * 把一条技能授予 hero。偷窃时原主的 moveSet 里还留着同一个实例，
     * 共用会让 remainingUses 这类运行期状态串台，所以带原型浅拷贝一份。
     */
    static grant(hero, move, until, meta) {
        const sc = OriginalSkillControlManager.ensure(hero);
        const fromName = meta && meta.fromName;
        const ability = meta && meta.ability;
        const exist = sc.granted.find(g => g.move && g.move.name === move.name);
        if (exist) {
            exist.until = Math.max(exist.until, until);
            if (fromName) exist.fromName = fromName;
            if (ability) exist.ability = ability;
            return exist.move;
        }
        const copy = Object.assign(Object.create(Object.getPrototypeOf(move)), move);
        hero.moveSet = hero.moveSet || [];
        hero.moveSet.push(copy);
        sc.granted.push({ move: copy, until, fromName, ability });
        return copy;
    }

    /**
     * 到期回收。until 是绝对回合数，战术回合发生在 finishRound 之后，
     * 所以第 N 回合施加的（until = N+2）不会被同一次 tick 掉，正好活满 N+1 与 N+2。
     * @returns {Array<string>} 供战斗日志用的到期文案
     */
    static tick(hero, round) {
        const sc = hero && hero.skillControl;
        if (!sc) return [];
        const expired = [];

        sc.banned = sc.banned.filter(b => {
            if (round < b.until) return true;
            expired.push(`${hero.name}身上对「${b.name}」的封锁解除了`);
            return false;
        });

        sc.granted = sc.granted.filter(g => {
            if (round < g.until) return true;
            if (Array.isArray(hero.moveSet)) {
                const i = hero.moveSet.indexOf(g.move);
                if (i >= 0) hero.moveSet.splice(i, 1);
            }
            expired.push(`${hero.name}对${g.fromName || '对方'}的${g.ability || '能力'}失效，${hero.name}已无法使用${g.move.name}。`);
            return false;
        });

        return expired;
    }

    /** 可被干涉的技能：被动不算。已被封禁的仍在列——重复操作是刷新，不是禁止重选 */
    static interferableSkills(hero) {
        if (!hero || !Array.isArray(hero.moveSet)) return [];
        return hero.moveSet.filter(m => m && !m.isPassive);
    }

    /**
     * 目标未被封禁的主动技能只剩这一条：剥夺它会让他彻底出不了手，
     * 所以拼点时给目标额外的倍率。复制不剥夺，不吃这个判定。
     */
    static isLastSkill(hero, skillName) {
        const live = OriginalSkillControlManager.interferableSkills(hero)
            .filter(m => !OriginalSkillControlManager.isBanned(hero, m.name));
        return live.length === 1 && live[0].name === skillName;
    }

    // ---------- NPC 侧（只开放禁止与偷窃） ----------

    /**
     * 🆕 NPC 可行的干涉配对。
     *
     * 粒度必须是**（目标, 技能）配对**而不是目标：3 倍率取决于选中的是不是
     * 目标仅剩的那条技能，同一个目标身上有的技能能打、有的必输。
     *
     * 副产品：目标只剩一条主动技能时倍率恒为 3，绝大多数配对会被必输过滤掉，
     * 于是「避开对方仅剩的技能」自动涌现，不需要单独写规则——只有灵性碾压的
     * 高序列 NPC 才啃得动那条唯一技能。
     *
     * @returns {Array<{target: Hero, skillName: string}>}
     */
    static npcTargets(bm, caster, mode) {
        if (!bm || !caster) return [];
        const foes = caster.teamType === 'ally' ? bm.enemyTeam : bm.allyTeam;
        const after = Math.max(0, (caster.additionalStats?.当前灵性 ?? 0)
            - TacticCatalog.spiritCost(caster.sequenceRank));
        const out = [];

        (foes || []).forEach(target => {
            // selectable 顺带挡掉因附身离场的本体——技能干涉不看坐标
            if (!EnemyControlManager.selectable(caster, target)) return;
            OriginalSkillControlManager.interferableSkills(target).forEach(move => {
                const isLast = OriginalSkillControlManager.isLastSkill(target, move.name);
                const mult = (isLast && mode !== '复制') ? TacticCatalog.LAST_SKILL_MULT : 1;
                const foeScore = EnemyControlManager.bestStat(target) * mult;
                if (!EnemyControlManager.canPossiblyWin(caster, target, 1, after, foeScore)) return;
                out.push({ target, skillName: move.name });
            });
        });
        return out;
    }

    /**
     * 🆕 NPC 发起一次干涉：先扣灵性（成败都扣），再拼点，赢了才落实。
     * 与玩家侧共用 skillControlContest / applySkillControl，没有任何分叉——
     * 那两个函数压根不关心施法者是谁。
     *
     * 偷窃的 grant 会往 NPC 的 moveSet 里塞一份技能，而 executeAITurn 每回合
     * 从 originalData 重建技能表，所以 NPC 实际用不出偷来的技能。这是**有意接受**的：
     * 玩家能感知到的那一半（自己的技能被封两回合）完全正常，
     * 而两回合后 tick 会补一句「再也用不出」，叙事上自洽。
     *
     * @returns {boolean} 是否成功
     */
    static npcAttempt(bm, caster, mode, pair, ability, summary, results) {
        const cost = TacticCatalog.spiritCost(caster.sequenceRank);
        caster.additionalStats.当前灵性 = Math.max(0, (caster.additionalStats.当前灵性 ?? 0) - cost);

        const { target, skillName } = pair;
        const isLast = OriginalSkillControlManager.isLastSkill(target, skillName);
        const roll = TacticResolver.skillControlContest(caster, target, mode, isLast);
        const tail = `（拼点 ${roll.casterScore} : ${roll.targetScore}）`;

        if (!roll.win) {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的「${skillName}」${mode}失败${tail}`);
            return false;
        }

        const applied = TacticResolver.applySkillControl(bm, caster, target, mode, skillName);
        if (!applied.applied) {
            summary.push(`✗ ${caster.name} 对 ${target.name} 的${mode}未生效`
                + `（${applied.reason || '技能已不可干涉'}）`);
            return false;
        }

        summary.push(`✓ ${caster.name} 对 ${target.name} 的「${skillName}」${mode}成功${tail}`);
        results.push({
            kind: 'skill-control',
            actor: caster.name, ability,
            target: target.name, skill: skillName, mode,
        });
        return true;
    }
}

const SkillControlManager = deps.borrowEnabled || deps.skillControlEnabled ? OriginalSkillControlManager : suppliedSkillControl;

const TacticBorrowReport = {
    begin(bm, ctx) {
        if (ctx.borrowId) return ctx;
        ctx.borrowId = 'borrow-' + (++bm.borrowSerial || (bm.borrowSerial = 1));
        ctx.authorityName = AbilityBorrowManager.displayName(ctx.caster, ctx.authoritySubtype);
        ctx.sourceName = ctx.abilityOwner.name;
        ctx.rolls = [];
        (bm.borrowAttempts || (bm.borrowAttempts = [])).push(ctx);
        return ctx;
    },
    detail(bm, ctx, line) {
        const text = '[' + ctx.borrowId + '] ' + line;
        (ctx.details || (ctx.details = [])).push(text);
        bm.battleLogger?.log(text, 'info');
    },
    meta(caster) {
        const id = caster?.$tacticContext?.borrowId;
        return id ? { borrowId: id } : {};
    },
    quotas(bm, hero) {
        return JSON.stringify({
            control: ['conquestUsed', 'mindUsed', 'enslaveUsed', 'tameUsed'].filter(k => EnemyControlManager.ensure(bm)[k].has(hero.heroId)),
            balance: BalanceManager.ensure(bm).spent[hero.heroId], summon: SummonManager.ensure(bm).counts[hero.heroId],
            rewind: RewindManager.ensure(bm).used[hero.heroId], extra: ExtraActionManager.ensure(bm).used[hero.heroId],
            field: FieldEffectManager.ensure(bm).used[hero.heroId], event: BattleEventManager.ensure(bm).used[hero.heroId],
        });
    },
    nativeCost(ctx) {
        const h = TacticExecutionContext.casterView(ctx), d = ctx.descriptor, a = d.action, sub = d.subtype;
        let stat = '灵性', cost = 0;
        if (a === TacticCatalog.CONTROL_ACTION) {
            if (sub === TacticCatalog.MIND) { stat = '人性'; cost = TacticCatalog.controlStatCost(h.sequenceRank, stat); }
            else if (sub === TacticCatalog.TAME) { stat = EnemyControlManager.tameStatKey(h); cost = TacticCatalog.controlStatCost(h.sequenceRank, stat); }
            else if (sub === TacticCatalog.MIND_DEPRIVE) { stat = '人性'; cost = MindDepriveManager.costOf(h); }
            else if (HardControlManager.has(sub)) { stat = HardControlManager.statKeyOf(sub); cost = HardControlManager.costOf(h, sub); }
            else if (TempAllegianceManager.subtypes().includes(sub)) { stat = TempAllegianceManager.statKeyOf(h, sub); cost = TempAllegianceManager.costOf(h, sub); }
            else cost = TacticCatalog.controlSpiritCost(h.sequenceRank);
        } else if (a === TacticCatalog.BRIBERY_ACTION || a === TacticCatalog.EFFECT_TRANSFER_ACTION || a === TacticCatalog.SKILL_CONTROL_ACTION) cost = TacticCatalog.spiritCost(h.sequenceRank);
        else if (a === TacticCatalog.SUMMON_ACTION) { stat = SummonManager.statKeyOf(sub); cost = SummonManager.costOf(h, sub); }
        else if (a === TacticCatalog.RULE_CHANGE_ACTION || (a === TacticCatalog.FUNDAMENTAL_RULE_ACTION && ctx.npcFallback)) cost = RuleChangeManager.costOf(h);
        else if (a === TacticCatalog.FUNDAMENTAL_RULE_ACTION) { stat = FundamentalRuleManager.costStatOf(sub); cost = FundamentalRuleManager.costOf(h, sub, ctx.atomCount || 1); }
        else if (a === TacticCatalog.ENV_ACTION) { stat = EnvironmentManager.statKeyOf(sub); cost = EnvironmentManager.costOf(h, sub); }
        else if (a === TacticCatalog.EXILE_ACTION) cost = ExileManager.costOf(h);
        else if (a === TacticCatalog.EXTRA_ACTION_ACTION) { stat = ExtraActionManager.statKeyOf(sub); cost = ExtraActionManager.costOf(h, sub); }
        else if (a === TacticCatalog.FIELD_EFFECT_ACTION || a === TacticCatalog.TARGET_INTERFERENCE_ACTION) { stat = FieldEffectManager.statKeyOf(sub); cost = FieldEffectManager.costOf(h, sub); }
        else if (a === TacticCatalog.BATTLE_EVENT_ACTION) { stat = BattleEventManager.statKeyOf(sub); cost = BattleEventManager.costOf(h, sub); }
        else if (a === TacticCatalog.PUNISHMENT_ACTION) cost = PunishmentManager.costOf(h);
        else if (a === TacticCatalog.BALANCE_ACTION) stat = '独立平衡点数';
        return { stat, cost };
    },
    execute(bm, ctx, summary, results, fn) {
        const nativeCost = this.nativeCost(ctx);
        this.detail(bm, ctx, '原能力基准费用：' + nativeCost.stat + ' ' + nativeCost.cost);
        const start = results.length;
        const stats = { ...ctx.caster.additionalStats };
        const quota = this.quotas(bm, ctx.usageOwner);
        const value = fn();
        for (let i = start; i < results.length; i++) {
            const row = results[i];
            if (row && !row.borrowId && (!row.stage || ['start','switch','refresh','complete','deepen','gift'].includes(row.stage))) row.borrowId = ctx.borrowId;
        }
        const changes = ['当前灵性','当前理智','当前人性'].filter(k => stats[k] !== ctx.caster.additionalStats[k])
            .map(k => k + ' ' + stats[k] + '→' + ctx.caster.additionalStats[k]);
        this.detail(bm, ctx, '原能力资源结算：' + (changes.join('；') || '未扣除资源或资源未发生变化'));
        const after = this.quotas(bm, ctx.usageOwner);
        if (quota !== after) this.detail(bm, ctx, '来源额度 ' + ctx.sourceName + '：' + quota + ' → ' + after);
        return value;
    },
    package(results, contexts) {
        const byId = new Map((contexts || []).filter(c => c.borrowId).map(c => [c.borrowId, c]));
        const nested = new Map();
        results.forEach(r => {
            if (!r || !byId.has(r.borrowId) || r.kind === 'borrowed-tactic') return;
            if (!nested.has(r.borrowId)) nested.set(r.borrowId, []);
            if (r.success !== false) nested.get(r.borrowId).push(r);
        });
        const emitted = new Set();
        return results.flatMap(r => {
            const c = r && byId.get(r.borrowId);
            if (!c || r.kind === 'borrowed-tactic') return [r];
            if (emitted.has(r.borrowId)) return [];
            emitted.add(r.borrowId);
            const rows = nested.get(r.borrowId) || [];
            return rows.length ? [{ kind: 'borrowed-tactic', borrowId: r.borrowId, actor: c.caster.name,
                source: c.sourceName, authoritySubtype: c.authoritySubtype, authorityName: c.authorityName,
                borrowedAbility: c.descriptor.label, nativeResults: rows }] : [];
        });
    },
    finish(bm, ctx, results, summary) {
        if (ctx.finished) return;
        ctx.finished = true;
        (ctx.rolls || []).forEach(r => this.detail(bm, ctx, '原能力拼点：' + r.casterScore + ':' + r.targetScore + (r.win ? '，成功' : '，失败')));
        const effective = results.some(r => r.borrowId === ctx.borrowId && r.success !== false);
        this.detail(bm, ctx, ctx.authorityWin === false ? '权柄拼点失败，未执行原能力、未扣来源额度。'
            : effective ? '原能力已生效。' : '原能力未生效，原因详见本阶段结算。');
        (ctx.details || []).forEach(line => { if (!summary.includes(line)) summary.push(line); });
    },
};

const TacticExecutionContext = {
    native(caster) {
        return { caster, abilityOwner: caster, usageOwner: caster, resourceOwner: caster,
            abilityRank: Number(caster && caster.sequenceRank), borrowed: false };
    },

    borrowed(caster, abilityOwner, authoritySubtype, descriptor) {
        return {
            caster,
            abilityOwner,
            usageOwner: abilityOwner,
            resourceOwner: caster,
            authoritySubtype,
            descriptor,
            abilityRank: Number.isFinite(Number(descriptor && descriptor.abilityRank))
                ? Number(descriptor.abilityRank) : Number(abilityOwner && abilityOwner.sequenceRank),
            borrowed: true,
        };
    },

    /**
     * 给现有 Manager 一具“能力身份来自来源、所有可变状态仍落到施法者”的 Hero 视图。
     * heroId / 坐标 / 阵营 / additionalStats / effects / controller 全部来自实际施法者；
     * 只替换 sequenceString 与 sequenceRank。$tacticActualCaster 供拼点优势还原真实途径。
     */
    casterView(ctx) {
        if (!ctx || !ctx.borrowed) return ctx && ctx.caster;
        if (ctx._casterView) return ctx._casterView;
        const actual = ctx.caster;
        const source = ctx.abilityOwner;
        const rank = ctx.abilityRank;
        ctx._casterView = new Proxy(actual, {
            get(target, prop, receiver) {
                if (prop === 'sequenceString') return String(source && source.sequenceString || '');
                if (prop === 'sequenceRank') return rank;
                if (prop === '$tacticActualCaster') return actual;
                if (prop === '$tacticAbilityOwner') return source;
                if (prop === '$tacticContext') return ctx;
                if (prop === 'additionalStats') return AbilityBorrowManager.previewStats(actual) || target.additionalStats;
                return Reflect.get(target, prop, receiver);
            },
            set(target, prop, value, receiver) {
                if (prop === 'sequenceString' || prop === 'sequenceRank') return true;
                return Reflect.set(target, prop, value, target);
            },
        });
        return ctx._casterView;
    },

    cloneValue(value) {
        if (value === undefined) return undefined;
        if (typeof _ !== 'undefined' && _.cloneDeep) return _.cloneDeep(value);
        return JSON.parse(JSON.stringify(value));
    },

    /**
     * 现有次数账本全部按 heroId 写死。借用执行期间把来源账本镜像到施法者键，
     * 调用原生逻辑后把结果写回来源，再恢复施法者原账本。效果/关系/召唤仍使用
     * caster.heroId，因此不会错误归到来源身上。
     */
    withUsageOwner(bm, ctx, fn, opts = {}) {
        if (!ctx || !ctx.borrowed || !ctx.caster || !ctx.usageOwner
            || ctx.caster.heroId === ctx.usageOwner.heroId) return fn();
        const casterId = ctx.caster.heroId;
        const ownerId = ctx.usageOwner.heroId;
        const restores = [];
        const mirrors = [];

        const mirrorSet = set => {
            if (!(set instanceof Set)) return;
            const old = set.has(casterId);
            const source = set.has(ownerId);
            source ? set.add(casterId) : set.delete(casterId);
            mirrors.push(() => set.has(casterId) ? set.add(ownerId) : set.delete(ownerId));
            restores.push(() => old ? set.add(casterId) : set.delete(casterId));
        };
        const mirrorMap = map => {
            if (!map || typeof map !== 'object') return;
            const had = Object.prototype.hasOwnProperty.call(map, casterId);
            const old = this.cloneValue(map[casterId]);
            if (Object.prototype.hasOwnProperty.call(map, ownerId)) {
                map[casterId] = this.cloneValue(map[ownerId]);
            } else {
                delete map[casterId];
            }
            mirrors.push(() => {
                if (Object.prototype.hasOwnProperty.call(map, casterId)) {
                    map[ownerId] = this.cloneValue(map[casterId]);
                } else {
                    delete map[ownerId];
                }
            });
            restores.push(() => { if (had) map[casterId] = old; else delete map[casterId]; });
        };

        const ec = EnemyControlManager.ensure(bm);
        ['conquestUsed', 'mindUsed', 'enslaveUsed', 'tameUsed'].forEach(k => mirrorSet(ec[k]));
        mirrorMap(BalanceManager.ensure(bm).spent);
        mirrorMap(SummonManager.ensure(bm).counts);
        mirrorMap(RewindManager.ensure(bm).used);
        mirrorMap(ExtraActionManager.ensure(bm).used);
        mirrorMap(FieldEffectManager.ensure(bm).used);
        mirrorMap(BattleEventManager.ensure(bm).used);

        try {
            return fn();
        } finally {
            if (!opts.readOnly && !AbilityBorrowManager.isPreviewing(ctx.caster)) mirrors.forEach(apply => apply());
            restores.reverse().forEach(restore => restore());
        }
    },
};

const AbilityBorrowManager = {
    ACTION: TacticCatalog.ABILITY_BORROW_ACTION,
    DEFINE: TacticCatalog.BORROW_DEFINE,
    STEAL: TacticCatalog.BORROW_STEAL,
    SUBTYPES: {
        [TacticCatalog.BORROW_DEFINE]: {
            pathway: '律师', title: '失序者', titleRank: -1,
            names: [{ gate: 1, name: '“定义”权柄' }],
        },
        [TacticCatalog.BORROW_STEAL]: {
            pathway: '偷盗者', title: '诡秘之主', titleRank: -2,
            names: [{ gate: 2, name: '“窃取”权柄' }],
        },
    },

    eligibility(hero) {
        return AbilityAlias.resolve(hero && hero.sequenceString, this.SUBTYPES);
    },
    availableSubtypes(hero) {
        const rows = this.eligibility(hero);
        return Object.keys(this.SUBTYPES).filter(k => rows[k] && rows[k].ok);
    },
    eligible(hero) { return this.availableSubtypes(hero).length > 0; },
    displayName(hero, subtype) {
        const row = this.eligibility(hero)[subtype];
        return row && row.ok && row.name ? row.name : String(subtype || this.ACTION);
    },
    rankOf(hero, subtype) {
        const row = this.eligibility(hero)[subtype];
        return row && row.ok && Number.isFinite(Number(row.rank)) ? Number(row.rank) : null;
    },
    costOf(hero, subtype) {
        const rank = this.rankOf(hero, subtype);
        const attrs = ConsumableMoveBuilder.getAvgAttrs(rank);
        return Math.max(1, Math.round((Number(attrs.灵性) || 0) * TacticCatalog.BORROW_COST_RATIO));
    },
    spiritAfterCost(hero, subtype) {
        return Math.max(0, (Number(hero && hero.additionalStats && hero.additionalStats.当前灵性) || 0)
            - this.costOf(hero, subtype));
    },
    spend(hero, subtype) {
        const cost = this.costOf(hero, subtype);
        const before = Number(hero && hero.additionalStats && hero.additionalStats.当前灵性) || 0;
        hero.additionalStats.当前灵性 = Math.max(0, before - cost);
        return { cost, before, after: hero.additionalStats.当前灵性, actual: before - hero.additionalStats.当前灵性 };
    },
    _previews: new WeakMap(),
    previewStats(hero) { return hero && this._previews.get(hero.$tacticActualCaster || hero)?.stats || null; },
    isPreviewing(hero) { return !!this.previewStats(hero); },
    withProjectedCost(hero, subtype, fn) {
        hero = hero?.$tacticActualCaster || hero;
        if (!hero || this._previews.has(hero)) return fn();
        const stats = Object.freeze({ ...hero.additionalStats,
            当前灵性: this.spiritAfterCost(hero, subtype) });
        this._previews.set(hero, { subtype, stats });
        try { return fn(); }
        finally { this._previews.delete(hero); }
    },
    canPossiblyWin(caster, source, subtype) {
        return EnemyControlManager.canPossiblyWin(
            caster, source, 1, this.spiritAfterCost(caster, subtype), EnemyControlManager.bestStat(source));
    },
    contest(caster, source) {
        return EnemyControlManager.contest(
            caster, source, 1,
            Number(caster && caster.additionalStats && caster.additionalStats.当前灵性) || 0,
            EnemyControlManager.bestStat(source));
    },
    sourceAllowed(caster, source, npc = false) {
        if (!caster || !source || caster === source) return false;
        if (!TacticResolver.alive(source) || OffFieldManager.isOff(source)) return false;
        if (source.teamType === caster.teamType || source.isSummon || source.playSource) return false;
        if (source.dataSource === 'player') return npc && caster.dataSource !== 'player';
        return source.dataSource === 'npc';
    },
    sources(bm, caster, subtype, npc = false, requireExecutable = false) {
        if (!bm || !caster || !this.availableSubtypes(caster).includes(subtype)) return [];
        return bm.teamManager.getAllHeroes().filter(source => {
            if (!this.sourceAllowed(caster, source, npc)) return false;
            if (!this.canPossiblyWin(caster, source, subtype)) return false;
            const list = BorrowableTacticRegistry.list(bm, caster, source, { npc });
            return requireExecutable ? list.some(d => BorrowableTacticRegistry.isExecutable(bm, caster, source, d, { npc })) : list.length > 0;
        });
    },
    attempt(bm, caster, source, subtype) {
        if (!this.availableSubtypes(caster).includes(subtype)) return { ok: false, error: '不具备这项能力借用资格。' };
        if (!this.sourceAllowed(caster, source, caster.dataSource !== 'player')) return { ok: false, error: '能力来源已经无效。' };
        if (!this.canPossiblyWin(caster, source, subtype)) return { ok: false, error: '当前灵性不足以赢得这次拼点。' };
        const spent = this.spend(caster, subtype);
        const roll = this.contest(caster, source);
        return { ok: true, win: roll.win, spent, roll };
    },
};

const BorrowableTacticRegistry = {
    // 顶层策略也是显式声明；新大类不在这里、也不在denied时必须审计失败。
    topLevelAllowed: new Set([TacticCatalog.SKILL_CONTROL_ACTION, TacticCatalog.CONTROL_ACTION,
        TacticCatalog.BRIBERY_ACTION, TacticCatalog.PUNISHMENT_ACTION, TacticCatalog.BALANCE_ACTION,
        TacticCatalog.RULE_CHANGE_ACTION, TacticCatalog.FUNDAMENTAL_RULE_ACTION,
        TacticCatalog.ENV_ACTION, TacticCatalog.EXILE_ACTION, TacticCatalog.EXTRA_ACTION_ACTION,
        TacticCatalog.FIELD_EFFECT_ACTION, TacticCatalog.TARGET_INTERFERENCE_ACTION,
        TacticCatalog.EFFECT_TRANSFER_ACTION, TacticCatalog.BATTLE_EVENT_ACTION,
        TacticCatalog.REWIND_ACTION, TacticCatalog.SUMMON_ACTION]),
    policyOf(id) {
        if (this.allowed.has(id) || this.topLevelAllowed.has(id)) return {
            borrowPolicy: 'allow', denyReason: '', playerAdapter: 'native-ui', npcAdapter: 'native-ai' };
        const leaf = String(id).includes(':') ? String(id).slice(String(id).indexOf(':') + 1) : id;
        const reason = this.denied.get(id) || this.denied.get(leaf);
        return reason ? { borrowPolicy: 'deny', denyReason: reason, playerAdapter: null, npcAdapter: null } : null;
    },
    POLICY_ALLOW: 'allow',
    POLICY_DENY: 'deny',
    // 显式 allow 表：新增子类若没有在这里做决定，会被 fail-closed 并在控制台报错。
    allowed: new Set([
        'skill-control:禁止', 'skill-control:偷窃', 'skill-control:复制',
        `control:${TacticCatalog.CONQUEST}`, `control:${TacticCatalog.MIND}`,
        `control:${TacticCatalog.ENSLAVE}`, `control:${TacticCatalog.TAME}`,
        `temp:${TacticCatalog.TEMP_HIERARCHY}`, `temp:${TacticCatalog.TEMP_CHARM}`,
        `temp:${TacticCatalog.TEMP_FEAR}`, `temp:${TacticCatalog.TEMP_LOVE}`,
        `temp:${TacticCatalog.TEMP_PROFANE_FALL}`,
        'control:mind-deprive', `hard:${TacticCatalog.STEAL_THOUGHT}`,
        `hard:${TacticCatalog.TRANCE_SONG}`, `hard:${TacticCatalog.MENTAL_PIERCE}`,
        `hard:${TacticCatalog.INTIMIDATION_STUN}`,
        `bribery:${BriberyManager.WEAKEN}`, `bribery:${BriberyManager.CHARM}`,
        `bribery:${BriberyManager.LINK}`, 'punishment', 'balance',
        'rule:欺瞒规则', 'rule:占卜家规则', 'rule:信息虚构', 'rule:环境掌控者',
        'rule:弦之弹奏', 'rule:扭曲规则', 'rule:律令制定',
        'fundamental:篡改规则', 'fundamental:仲裁人律令', 'fundamental:嫁接',
        'fundamental:欺诈权柄', 'fundamental:阅读者规律', 'fundamental:修改权柄',
        'fundamental:规律权柄', 'fundamental:规则之弦',
        'environment:无暗领域', 'environment:虚假星空', 'environment:梦境迷宫',
        'environment:展开堕落领域', 'environment:改变天气',
        `exile:${TacticCatalog.EXILE_APPRENTICE}`, `exile:${TacticCatalog.EXILE_ARBITER}`,
        `extra:${TacticCatalog.EXTRA_BLINK}`,
        'field:扭曲：目标错认', 'field:混乱：目标失序', 'field:混乱：距离紊乱',
        'field:扭曲：攻势偏离', 'field:扭曲：防守漏洞', 'field:扭曲：阻碍行动',
        'field:扭曲：步伐错乱', 'field:扭曲：伤害减轻', 'field:灵肉之刃',
        'field:秽语自我强化', 'field:秽语囚禁', 'field:秽语诅咒', 'field:公证有效',
        'field:囚禁', 'field:星光囚笼', 'field:知识逐人与强行灌注',
        'field:星之祝福', 'field:星之诅咒衰弱', 'field:星之诅咒变异',
        'field:星之诅咒创伤', 'field:太阳歌颂', 'field:太阳光环',
        'field:正义光环', 'field:画中世界降临', 'field:海洋之歌',
        'field:雷鸣之歌', 'field:喧闹之歌',
        `transfer:${EffectTransferManager.DISTORT}`, `transfer:${EffectTransferManager.GIFT_NEGATIVE}`,
        `transfer:${EffectTransferManager.CURSE_SOURCE}`,
        'event:制造雷暴', 'event:制造地震',
        `rewind:${TacticCatalog.REWIND_BORROW}`, `rewind:${TacticCatalog.REWIND_TIME}`,
        `summon:${TacticCatalog.SUMMON_ALCHEMY}`, `summon:${TacticCatalog.SUMMON_FANTASY_BODY}`,
        `summon:${TacticCatalog.SUMMON_ILLUSION}`,
    ]),
    _missingPolicyWarnings: new Set(),
    // 显式拒绝表。新增目录型、外部资产型、续控型能力时必须在这里说明原因。
    denied: new Map([
        [TacticCatalog.ABILITY_BORROW_ACTION, '禁止递归借用'],
        ['改变地形', '通用API动作，不是角色专属能力'],
        ['对角色使用战术', '通用API动作，不是角色专属能力'],
        ['待命', '空动作'],
        [TacticCatalog.MARIONETTE, '需要后续战术阶段持续维持'],
        [TacticCatalog.POSSESS_PRISONER, '需要后续战术阶段持续维持'],
        [TacticCatalog.POSSESS_APPRENTICE, '需要后续战术阶段持续维持'],
        [TacticCatalog.ACTIVE_LEAVE_ACTION, '需要后续战术阶段持续维持'],
        [TacticCatalog.SUMMON_PROJECTION, '依赖人物关系与npc_data'],
        [TacticCatalog.SUMMON_PICTURE_PERSON, '依赖画中人仓库'],
        [TacticCatalog.SUMMON_GRAZING, '依赖放牧名册与激活组合'],
        [TacticCatalog.AURA_ACTION, '不占动作位且借用后没有关闭入口'],
        [TacticCatalog.MYTHIC_ACTION, '依赖失控与现实日期冷却'],
        [TacticCatalog.CANON_MYTHIC_ACTION, '依赖玩家目录与冷却'],
        [TacticCatalog.CANON_SLEEP, '依赖神秘再现目录'],
        ['神秘再现·理想乡', '依赖神秘再现目录'],
        ['神秘再现·桃花的源头', '依赖神秘再现目录'],
        ['神秘再现·卖火柴的小女孩', '依赖神秘再现目录'],
        ['神秘再现·背叛之宴', '依赖神秘再现目录'],
        ['神秘再现·皇帝的新衣', '依赖神秘再现目录'],
        ['神秘再现·岁月的棋局', '依赖神秘再现目录'],
    ]),

    TITLE_RANKS: Object.freeze({ '诡秘之主': -2, '上帝': -2, '第四支柱': -2,
        '失序者': -1, '毁灭天灾': -1, '永恒之暗': -1, '堕落母神': -1,
        '欲望母树': -1, '高维俯视者': -1, '知识之妖': -1, '恶魔之父': -1 }),
    rankFromConfig(owner, key, cfg) {
        const s = String(owner?.sequenceString || '');
        const normalized = { ...cfg };
        if (normalized.titleRank == null && normalized.title in this.TITLE_RANKS) normalized.titleRank = this.TITLE_RANKS[normalized.title];
        const row = AbilityAlias.resolve(s, { [key]: normalized })[key];
        let rank = row?.ok && row.rank != null && Number.isFinite(Number(row.rank)) ? Number(row.rank) : null;
        (cfg.titles || []).forEach(title => {
            const r = this.TITLE_RANKS[title];
            if (s.includes(title) && Number.isFinite(r) && (rank === null || r < rank)) rank = r;
        });
        return rank;
    },
    skillControlRank(owner, mode, abilityName) {
        let best = null;
        LifeSaveManager.splitSequenceFragments(String(owner && owner.sequenceString || '')).forEach(frag => {
            const r = LifeSaveManager.resolveFragment(frag);
            const cfg = r && SKILL_CONTROL_TABLE[r.pathwayShort] && SKILL_CONTROL_TABLE[r.pathwayShort][mode];
            if (!cfg || cfg.name !== abilityName || Number(r.rank) > Number(cfg.from)) return;
            const rank = Number(r.rank);
            if (best === null || rank < best) best = rank;
        });
        return best;
    },
    add(out, owner, row) {
        if (!row || !row.id || this.denied.has(row.id) || this.denied.has(row.subtype)) return;
        if (!this.allowed.has(row.id)) {
            if (!this._missingPolicyWarnings.has(row.id)) {
                this._missingPolicyWarnings.add(row.id);
                console.error(`[能力借用] 战术能力“${row.id}”缺少显式 borrowPolicy，已默认禁止。`);
            }
            return;
        }
        const rank = row.abilityRank == null ? NaN : Number(row.abilityRank);
        if (!Number.isFinite(rank)) {
            console.error('[能力借用] 能力档位无法解析，已拒绝：' + row.id);
            return;
        }
        out.push({ borrowPolicy: this.POLICY_ALLOW,
            playerAdapter: row.playerAdapter || 'native-ui',
            npcAdapter: row.npcAdapter || 'native-ai',
            ...row,
            abilityRank: rank, denyReason: '' });
    },

    list(bm, caster, owner, opts = {}) {
        const npc = !!opts.npc;
        const out = [];
        if (!owner) return out;
        const add = row => this.add(out, owner, row);

        // 技能干涉：人工三类全开；NPC维持既有逻辑，只开放禁止与偷窃。
        const sc = SkillControlManager.resolveEligibility(owner.sequenceString);
        SkillControlManager.MODES.forEach(mode => {
            if (!sc[mode] || (npc && mode === '复制')) return;
            add({ id: `skill-control:${mode}`, action: TacticCatalog.SKILL_CONTROL_ACTION,
                mode, label: `${mode} · ${sc[mode]}`, group: '技能干涉',
                abilityRank: this.skillControlRank(owner, mode, sc[mode]), resultKinds: ['skill-control'] });
        });

        // 一次成功型永久控制；秘偶化明确排除。
        const control = EnemyControlManager.resolveEligibility(owner.sequenceString);
        const controlDefs = {
            [TacticCatalog.CONQUEST]: { pathway: '猎人', gate: TacticCatalog.CONQUEST_RANK_GATE, title: '毁灭天灾', titleRank: -1, titles: ['毁灭天灾', '第四支柱'] },
            [TacticCatalog.MIND]: { pathway: '观众', gate: TacticCatalog.MIND_RANK_GATE, title: '上帝', titleRank: -2 },
            [TacticCatalog.ENSLAVE]: { pathway: '收尸人', gate: TacticCatalog.ENSLAVE_RANK_GATE, title: '永恒之暗', titleRank: -1 },
            [TacticCatalog.TAME]: { pathway: '药师', gate: TacticCatalog.TAME_RANK_GATE, title: '堕落母神', titleRank: -1 },
        };
        Object.entries(controlDefs).forEach(([subtype, cfg]) => {
            if (!control[subtype]) return;
            add({ id: `control:${subtype}`, action: TacticCatalog.CONTROL_ACTION, subtype,
                label: subtype, group: '操控敌人', abilityRank: this.rankFromConfig(owner, subtype, cfg),
                resultKinds: ['enemy-control'] });
        });

        const temp = TempAllegianceManager.resolveEligibility(owner.sequenceString);
        const tempDefs = {
            [TacticCatalog.TEMP_HIERARCHY]: { pathway: '律师', gate: TacticCatalog.TEMP_HIERARCHY_RANK_GATE, title: '失序者', titleRank: -1 },
            [TacticCatalog.TEMP_CHARM]: { pathway: '刺客', gate: TacticCatalog.TEMP_CHARM_RANK_GATE, title: '毁灭天灾', titleRank: -1 },
            [TacticCatalog.TEMP_FEAR]: { pathway: '水手', gate: TacticCatalog.TEMP_FEAR_RANK_GATE, title: '上帝', titleRank: -2 },
            [TacticCatalog.TEMP_LOVE]: { pathway: '吝啬鬼', gate: TacticCatalog.TEMP_LOVE_RANK_GATE, title: '欲望母树', titleRank: -1 },
            [TacticCatalog.TEMP_PROFANE_FALL]: { pathway: '秘祈人', gate: TacticCatalog.TEMP_PROFANE_FALL_RANK_GATE, title: TacticCatalog.TEMP_PROFANE_FALL_TITLE, titleRank: -2 },
        };
        Object.entries(tempDefs).forEach(([subtype, cfg]) => {
            if (!temp[subtype]) return;
            add({ id: `temp:${subtype}`, action: TacticCatalog.CONTROL_ACTION, subtype,
                label: subtype, group: '短期控制', abilityRank: this.rankFromConfig(owner, subtype, cfg),
                resultKinds: ['temp-allegiance'] });
        });
        if (MindDepriveManager.eligible(owner.sequenceString)) {
            add({ id: 'control:mind-deprive', action: TacticCatalog.CONTROL_ACTION,
                subtype: TacticCatalog.MIND_DEPRIVE, label: TacticCatalog.MIND_DEPRIVE,
                group: '短期控制', abilityRank: this.rankFromConfig(owner, TacticCatalog.MIND_DEPRIVE,
                    { pathway: '观众', gate: TacticCatalog.MIND_DEPRIVE_RANK_GATE, title: '上帝', titleRank: -2 }),
                resultKinds: ['mind-deprive', 'temp-allegiance'] });
        }
        HardControlManager.subtypes().forEach(subtype => {
            if (this.denied.has(subtype) || !HardControlManager.canUse(bm, owner, subtype)) return;
            const cfg = HardControlManager.cfgOf(subtype) || {};
            const access = cfg.access || {};
            const rankCfg = access.pathwayShort
                ? { pathway: access.pathwayShort, gate: access.rankGate,
                    title: (access.titles || [])[0], titleRank: access.titleRank }
                : null;
            add({ id: `hard:${subtype}`, action: TacticCatalog.CONTROL_ACTION, subtype,
                label: HardControlManager.buttonLabel(subtype), group: '单体硬控',
                abilityRank: rankCfg ? this.rankFromConfig(owner, subtype, rankCfg) : owner.sequenceRank,
                resultKinds: [cfg.resultKind] });
        });

        BriberyManager.subtypes().forEach(subtype => {
            const e = BriberyManager.eligibility(owner)[subtype];
            if (!e || !e.ok) return;
            add({ id: `bribery:${subtype}`, action: TacticCatalog.BRIBERY_ACTION, subtype,
                label: subtype, group: '贿赂', abilityRank: e.rank, resultKinds: ['bribery', 'temp-allegiance'] });
        });
        const punishment = PunishmentManager.eligibility(owner);
        if (punishment.ok) add({ id: 'punishment', action: TacticCatalog.PUNISHMENT_ACTION,
            label: PunishmentManager.displayName(owner), group: '仲裁', abilityRank: punishment.rank,
            resultKinds: ['punishment'] });
        const balance = BalanceManager.eligibility(owner);
        if (balance.ok) add({ id: 'balance', action: TacticCatalog.BALANCE_ACTION,
            label: TacticCatalog.BALANCE_ACTION, group: '仲裁', abilityRank: balance.rank,
            resultKinds: ['balance'] });

        RuleChangeManager.availableSubtypes(owner).forEach(subtype => {
            const e = RuleChangeManager.eligibility(owner)[subtype];
            add({ id: `rule:${subtype}`, action: TacticCatalog.RULE_CHANGE_ACTION, subtype,
                label: RuleChangeManager.displayName(owner, subtype), group: '规则修改',
                abilityRank: e && e.rank, resultKinds: ['rule-change'] });
        });
        FundamentalRuleManager.availableSubtypes(owner).forEach(subtype => {
            const e = FundamentalRuleManager.eligibility(owner, subtype);
            const fallback = {
                篡改规则: '篡改规则底层回退', 仲裁人律令: '仲裁人规则回退',
                嫁接: '嫁接底层回退', 欺诈权柄: '欺诈权柄底层回退',
                阅读者规律: '阅读者规律底层回退', 修改权柄: '修改权柄底层回退',
                规律权柄: '规律权柄底层回退', 规则之弦: '规则之弦底层回退',
            }[subtype] || '';
            add({ id: `fundamental:${subtype}`, action: TacticCatalog.FUNDAMENTAL_RULE_ACTION, subtype,
                label: FundamentalRuleManager.displayName(owner, subtype), group: '底层规则修改',
                abilityRank: e && e.rank, npcFallbackSubtype: npc ? fallback : '',
                resultKinds: ['fundamental-rule', 'rule-change'] });
        });
        EnvironmentManager.availableSubtypes(owner).forEach(subtype => {
            if (this.denied.has(subtype)) return;
            const e = EnvironmentManager.eligibility(owner)[subtype];
            add({ id: `environment:${subtype}`, action: TacticCatalog.ENV_ACTION, subtype,
                label: EnvironmentManager.displayName(owner, subtype), group: '改变环境',
                abilityRank: e && e.rank, resultKinds: ['environment'] });
        });
        ExileManager.subtypes().forEach(subtype => {
            if (this.denied.has(subtype) || !ExileManager.resolveEligibility(owner.sequenceString)[subtype]) return;
            const cfg = ExileManager.SUBTYPES[subtype];
            add({ id: `exile:${subtype}`, action: TacticCatalog.EXILE_ACTION, subtype,
                label: subtype, group: '放逐', abilityRank: this.rankFromConfig(owner, subtype, cfg),
                resultKinds: ['exile'] });
        });
        const extraEligibility = ExtraActionManager.resolveEligibility(owner.sequenceString);
        ExtraActionManager.subtypes().filter(subtype => extraEligibility[subtype] && extraEligibility[subtype].ok).forEach(subtype => {
            const e = extraEligibility[subtype];
            add({ id: `extra:${subtype}`, action: TacticCatalog.EXTRA_ACTION_ACTION, subtype,
                label: ExtraActionManager.displayName(owner, subtype), group: '额外行动',
                abilityRank: e && e.rank, resultKinds: ['extra-action'] });
        });
        FieldEffectManager.subtypes().forEach(subtype => {
            const cfg = FieldEffectManager.cfgOf(subtype) || {};
            if (cfg.catalogId || this.denied.has(subtype)) return;
            const e = FieldEffectManager.eligibility(owner)[subtype];
            if (!e || !e.ok) return;
            add({ id: `field:${subtype}`, action: cfg.action || TacticCatalog.FIELD_EFFECT_ACTION,
                subtype, label: FieldEffectManager.displayName(owner, subtype),
                group: cfg.action || TacticCatalog.FIELD_EFFECT_ACTION, abilityRank: e.rank,
                resultKinds: [cfg.targetInterference ? 'target-interference' : 'field-effect'] });
        });
        EffectTransferManager.availableSubtypes(owner).forEach(subtype => {
            const e = EffectTransferManager.eligibility(owner)[subtype];
            add({ id: `transfer:${subtype}`, action: TacticCatalog.EFFECT_TRANSFER_ACTION, subtype,
                label: EffectTransferManager.displayName(owner, subtype), group: '效果传递',
                abilityRank: e && e.rank, resultKinds: ['effect-transfer'] });
        });
        const eventEligibility = BattleEventManager.eligibility(owner);
        BattleEventManager.subtypes().filter(subtype => eventEligibility[subtype] && eventEligibility[subtype].ok).forEach(subtype => {
            const e = eventEligibility[subtype];
            add({ id: `event:${subtype}`, action: TacticCatalog.BATTLE_EVENT_ACTION, subtype,
                label: BattleEventManager.displayName(owner, subtype), group: '战场事件',
                abilityRank: e && e.rank, resultKinds: ['battle-event'] });
        });
        RewindManager.subtypes().filter(subtype => RewindManager.resolveEligibility(owner.sequenceString)[subtype]).forEach(subtype => {
            const cfg = RewindManager.SUBTYPES[subtype];
            add({ id: `rewind:${subtype}`, action: TacticCatalog.REWIND_ACTION, subtype,
                label: subtype, group: '回溯', abilityRank: this.rankFromConfig(owner, subtype, cfg),
                resultKinds: ['rewind'] });
        });
        [TacticCatalog.SUMMON_ALCHEMY, TacticCatalog.SUMMON_FANTASY_BODY, TacticCatalog.SUMMON_ILLUSION]
            .forEach(subtype => {
                const cfg = SummonManager.SUBTYPES[subtype];
                if (!cfg || !SummonManager.resolveEligibility(owner.sequenceString)[subtype]) return;
                add({ id: `summon:${subtype}`, action: TacticCatalog.SUMMON_ACTION, subtype,
                    label: subtype, group: '召唤', abilityRank: SummonManager.eligibilityRank(owner.sequenceString, subtype),
                    resultKinds: ['summon'] });
            });

        return out;
    },

    /** 创建代理上下文并问原生UI/Manager；UI会进一步给出精确阻止原因。 */
    context(caster, owner, authoritySubtype, descriptor) {
        return TacticExecutionContext.borrowed(caster, owner, authoritySubtype, descriptor);
    },
    isExecutable(bm, caster, owner, descriptor, opts = {}) {
        if (!descriptor) return false;
        const ctx = this.context(caster, owner, opts.authoritySubtype || '', descriptor);
        const view = TacticExecutionContext.casterView(ctx);
        return TacticExecutionContext.withUsageOwner(bm, ctx, () => {
            if (descriptor.action === TacticCatalog.SKILL_CONTROL_ACTION) {
                const targets = bm.teamManager.getAllHeroes().filter(target => target
                    && target.heroId !== view.heroId && TacticResolver.alive(target)
                    && !OffFieldManager.isOff(target)
                    && SkillControlManager.interferableSkills(target).length > 0);
                return (view.additionalStats?.当前灵性 ?? 0) > 0
                    && !!SkillControlManager.resolveEligibility(view.sequenceString)[descriptor.mode]
                    && targets.length > 0;
            }
            if (descriptor.action === TacticCatalog.CONTROL_ACTION) {
                if (descriptor.subtype === TacticCatalog.CONQUEST) return EnemyControlManager.canConquest(bm, view)
                    && EnemyControlManager.conquestTargets(bm, view).length > 0;
                if (descriptor.subtype === TacticCatalog.MIND) return EnemyControlManager.canMind(bm, view)
                    && EnemyControlManager.mindTargets(bm, view).length > 0;
                if (descriptor.subtype === TacticCatalog.ENSLAVE) return EnemyControlManager.canEnslave(bm, view)
                    && EnemyControlManager.enslaveTargets(bm, view).length > 0;
                if (descriptor.subtype === TacticCatalog.TAME) return EnemyControlManager.canTame(bm, view)
                    && EnemyControlManager.tameTargets(bm, view).length > 0;
                if (TempAllegianceManager.subtypes().includes(descriptor.subtype)) return TempAllegianceManager.canUse(bm, view, descriptor.subtype)
                    && TempAllegianceManager.hasStat(view, descriptor.subtype)
                    && TempAllegianceManager.tempTargets(bm, view, descriptor.subtype).length > 0;
                if (descriptor.subtype === TacticCatalog.MIND_DEPRIVE) return MindDepriveManager.canUse(bm, view)
                    && MindDepriveManager.hasStat(view) && MindDepriveManager.targetsInRange(bm, view).length > 0;
                return HardControlManager.canUse(bm, view, descriptor.subtype)
                    && HardControlManager.hasStat(view, descriptor.subtype)
                    && HardControlManager.targets(bm, view, descriptor.subtype).length > 0;
            }
            if (descriptor.action === TacticCatalog.BRIBERY_ACTION) return BriberyManager.eligible(view, descriptor.subtype)
                && (view.additionalStats?.当前灵性 ?? 0) > 0
                && BriberyManager.targets(bm, view, descriptor.subtype).length > 0;
            if (descriptor.action === TacticCatalog.PUNISHMENT_ACTION) return PunishmentManager.eligible(view)
                && PunishmentManager.hasStat(view) && PunishmentManager.candidateTargets(bm, view, true).length > 0;
            if (descriptor.action === TacticCatalog.BALANCE_ACTION) {
                const left = BalanceManager.pointsLeft(bm, view);
                return BalanceManager.eligible(view) && left > 0
                    && BalanceManager.playerTargets(bm, view).some(target => BalanceManager.costOf(view, target) <= left);
            }
            if (descriptor.action === TacticCatalog.RULE_CHANGE_ACTION) return RuleChangeManager.canUse(bm, view)
                && !RuleChangeManager.blockedReason(bm, view);
            if (descriptor.action === TacticCatalog.FUNDAMENTAL_RULE_ACTION) return opts.npc
                ? RuleChangeManager.npcCanUse(bm, view)
                : FundamentalRuleManager.eligibility(view, descriptor.subtype).ok
                    && (view.additionalStats?.[FundamentalRuleManager.costFieldOf(descriptor.subtype)] ?? 0) > 0;
            if (descriptor.action === TacticCatalog.ENV_ACTION) return EnvironmentManager.canUse(bm, view)
                && !EnvironmentManager.blockedReason(bm, view, descriptor.subtype);
            if (descriptor.action === TacticCatalog.EXILE_ACTION) return ExileManager.canUse(bm, view)
                && ExileManager.hasStat(view) && ExileManager.targets(bm, view).length > 0;
            if (descriptor.action === TacticCatalog.EXTRA_ACTION_ACTION) return ExtraActionManager.canUse(bm, view)
                && ExtraActionManager.hasStat(view, descriptor.subtype);
            if (descriptor.action === TacticCatalog.FIELD_EFFECT_ACTION || descriptor.action === TacticCatalog.TARGET_INTERFERENCE_ACTION) {
                return FieldEffectManager.availableSubtypes(bm, view, descriptor.action).includes(descriptor.subtype)
                    && !FieldEffectManager.blockedReason(bm, view, descriptor.subtype);
            }
            if (descriptor.action === TacticCatalog.EFFECT_TRANSFER_ACTION) return EffectTransferManager.availableSubtypes(view).includes(descriptor.subtype)
                && (view.additionalStats?.当前灵性 ?? 0) > 0
                && EffectTransferManager.targets(bm, view, descriptor.subtype).length > 0;
            if (descriptor.action === TacticCatalog.BATTLE_EVENT_ACTION) return BattleEventManager.availableSubtypes(bm, view).includes(descriptor.subtype)
                && !BattleEventManager.blockedReason(bm, view, descriptor.subtype);
            if (descriptor.action === TacticCatalog.REWIND_ACTION) return !view.isSummon && RewindManager.quotaLeft(bm, view, descriptor.subtype) > 0
                && RewindManager.availableRounds(bm, view).some(row => row.differs);
            if (descriptor.action === TacticCatalog.SUMMON_ACTION) return SummonManager.quotaLeft(bm, view, descriptor.subtype) > 0
                && SummonManager.hasStat(view, descriptor.subtype)
                && !!SummonManager.freeCellNear(bm.board, view)
                && SummonManager.targets(bm, view, descriptor.subtype).length > 0;
            return false;
        });
    },

    /**
     * 为能力借用构建“已经可以交给现有NPC执行分支”的计划。先按来源列能力，
     * 再用实际施法者的局面与资源筛可行性；规则/环境/场效/召唤仍保持原有大类粒度。
     */
    npcPlansForSource(bm, caster, owner, authoritySubtype) {
        return AbilityBorrowManager.withProjectedCost(caster, authoritySubtype,
            () => this._npcPlansForSource(bm, caster, owner, authoritySubtype));
    },

    _npcPlansForSource(bm, caster, owner, authoritySubtype, onlyDescriptor = null) {
        const descriptors = onlyDescriptor ? [onlyDescriptor] : this.list(bm, caster, owner, { npc: true });
        const plans = [];
        descriptors.forEach(descriptor => {
            const ctx = this.context(caster, owner, authoritySubtype, descriptor);
            const view = TacticExecutionContext.casterView(ctx);
            TacticExecutionContext.withUsageOwner(bm, ctx, () => {
                const add = extra => plans.push({ descriptor, context: ctx, view, ...extra });
                if (descriptor.action === TacticCatalog.SKILL_CONTROL_ACTION) {
                    const pool = SkillControlManager.npcTargets(bm, view, descriptor.mode);
                    if (pool.length && (view.additionalStats?.当前灵性 ?? 0) > 0) {
                        add({ kind: 'skill-control', mode: descriptor.mode,
                            pair: pool[Math.floor(Math.random() * pool.length)] });
                    }
                    return;
                }
                if (descriptor.action === TacticCatalog.CONTROL_ACTION) {
                    let pool = [];
                    if (descriptor.subtype === TacticCatalog.CONQUEST && EnemyControlManager.canConquest(bm, view)) pool = EnemyControlManager.conquestTargets(bm, view);
                    else if (descriptor.subtype === TacticCatalog.MIND && EnemyControlManager.canMind(bm, view)) pool = EnemyControlManager.mindTargets(bm, view);
                    else if (descriptor.subtype === TacticCatalog.ENSLAVE && EnemyControlManager.canEnslave(bm, view)) pool = EnemyControlManager.enslaveTargets(bm, view);
                    else if (descriptor.subtype === TacticCatalog.TAME && EnemyControlManager.canTame(bm, view)) pool = EnemyControlManager.tameTargets(bm, view);
                    else if (TempAllegianceManager.subtypes().includes(descriptor.subtype)
                        && TempAllegianceManager.canUse(bm, view, descriptor.subtype)) pool = TempAllegianceManager.tempTargets(bm, view, descriptor.subtype);
                    else if (descriptor.subtype === TacticCatalog.MIND_DEPRIVE
                        && MindDepriveManager.canUse(bm, view)) {
                        if (MindDepriveManager.targetsInRange(bm, view).length) add({ kind: 'mind-deprive' });
                        return;
                    } else if (HardControlManager.canUse(bm, view, descriptor.subtype)) pool = HardControlManager.targets(bm, view, descriptor.subtype);
                    if (pool.length) add({ kind: 'control', subtype: descriptor.subtype,
                        target: pool[Math.floor(Math.random() * pool.length)] });
                    return;
                }
                if (descriptor.action === TacticCatalog.BRIBERY_ACTION) {
                    const target = BriberyManager.npcTarget(bm, view, descriptor.subtype);
                    if (target) add({ kind: 'bribery', subtype: descriptor.subtype, target });
                    return;
                }
                if (descriptor.action === TacticCatalog.PUNISHMENT_ACTION) {
                    const target = PunishmentManager.npcTarget(bm, view);
                    if (target && PunishmentManager.hasStat(view)) add({ kind: 'punishment', target });
                    return;
                }
                if (descriptor.action === TacticCatalog.BALANCE_ACTION) {
                    const target = BalanceManager.npcTarget(bm, view);
                    if (target) add({ kind: 'balance', target });
                    return;
                }
                if (descriptor.action === TacticCatalog.RULE_CHANGE_ACTION
                    || descriptor.action === TacticCatalog.FUNDAMENTAL_RULE_ACTION) {
                    const forced = descriptor.action === TacticCatalog.FUNDAMENTAL_RULE_ACTION
                        ? descriptor.npcFallbackSubtype : descriptor.subtype;
                    const native = RuleChangeManager.npcPlan(bm, view, forced);
                    if (native && RuleChangeManager.npcShouldTry(bm, view)) add({ kind: 'rule-change', native });
                    return;
                }
                if (descriptor.action === TacticCatalog.ENV_ACTION) {
                    const native = EnvironmentManager.npcPlan(bm, view, descriptor.subtype);
                    if (native && EnvironmentManager.npcShouldTry(bm, view)) add({ kind: 'environment', native });
                    return;
                }
                if (descriptor.action === TacticCatalog.EXILE_ACTION) {
                    const pool = ExileManager.targets(bm, view);
                    const kinds = ExileManager.availableSubtypes(bm, view)
                        .filter(k => k === descriptor.subtype && !this.denied.has(k));
                    if (pool.length && kinds.length && ExileManager.hasStat(view)) add({ kind: 'exile',
                        subtype: descriptor.subtype,
                        target: pool[Math.floor(Math.random() * pool.length)] });
                    return;
                }
                if (descriptor.action === TacticCatalog.EXTRA_ACTION_ACTION) {
                    const subtype = ExtraActionManager.availableSubtypes(bm, view)
                        .find(k => k === descriptor.subtype);
                    if (subtype && ExtraActionManager.hasStat(view, subtype)) add({ kind: 'extra', subtype });
                    return;
                }
                if (descriptor.action === TacticCatalog.FIELD_EFFECT_ACTION
                    || descriptor.action === TacticCatalog.TARGET_INTERFERENCE_ACTION) {
                    const native = FieldEffectManager.npcPlan(bm, view, descriptor.subtype);
                    if (native && !this.denied.has(native.subtype)) add({ kind: 'field', native });
                    return;
                }
                if (descriptor.action === TacticCatalog.EFFECT_TRANSFER_ACTION) {
                    const native = EffectTransferManager.npcPlan(bm, view, descriptor.subtype);
                    if (native) add({ kind: 'transfer', native });
                    return;
                }
                if (descriptor.action === TacticCatalog.BATTLE_EVENT_ACTION) {
                    const native = BattleEventManager.npcPlan(bm, view, descriptor.subtype);
                    if (native) add({ kind: 'event', native });
                    return;
                }
                if (descriptor.action === TacticCatalog.REWIND_ACTION) {
                    const kinds = RewindManager.subtypes().filter(k => k === descriptor.subtype
                        && RewindManager.resolveEligibility(view.sequenceString)[k]
                        && RewindManager.quotaLeft(bm, view, k) > 0);
                    const best = RewindManager.bestVitalityRound(bm, view);
                    if (kinds.length && best && best.differs) add({ kind: 'rewind', subtype: kinds[0], round: best.round });
                    return;
                }
                if (descriptor.action === TacticCatalog.SUMMON_ACTION) {
                    const allowed = [descriptor.subtype];
                    const elig = SummonManager.resolveEligibility(view.sequenceString);
                    const choices = [];
                    allowed.forEach(subtype => {
                        if (!elig[subtype] || SummonManager.quotaLeft(bm, view, subtype) <= 0
                            || !SummonManager.hasStat(view, subtype)) return;
                        const cfg = SummonManager.SUBTYPES[subtype];
                        const fn = SummonManager[cfg.npcTargetPool || cfg.targetPool];
                        const rows = typeof fn === 'function' ? fn.call(SummonManager, bm, view) : [];
                        rows.forEach(entry => choices.push({ subtype, entry }));
                    });
                    if (choices.length && SummonManager.freeCellNear(bm.board, view)) {
                        const native = choices[Math.floor(Math.random() * choices.length)];
                        add({ kind: 'summon', native });
                    }
                }
            });
        });
        return plans;
    },

    // 仅查询，不抽签、不现造随机候选；大类的子类数量不增加大类抽中概率。
    npcFeasible(bm, caster, owner, descriptor, authoritySubtype) {
        const ctx = this.context(caster, owner, authoritySubtype, descriptor);
        const view = TacticExecutionContext.casterView(ctx);
        return TacticExecutionContext.withUsageOwner(bm, ctx, () => {
            const action = descriptor.action, sub = descriptor.subtype;
            if (action === TacticCatalog.SUMMON_ACTION) {
                // 特殊机制：召唤物可以借用召唤；只消耗正式来源的额度。
                if (!SummonManager.resolveEligibility(view.sequenceString)[sub]
                    || SummonManager.quotaLeft(bm, view, sub) <= 0 || !SummonManager.hasStat(view, sub)
                    || !SummonManager.freeCellNear(bm.board, view)) return false;
                if (sub === TacticCatalog.SUMMON_ALCHEMY) {
                    const rank = SummonManager.alchemyRank(view);
                    const nameRank = SummonManager.nameRankOf(rank);
                    return Number.isFinite(rank) && Object.values(GameDBManager.DB.godPathways || {}).some(rows =>
                        Array.isArray(rows) && rows.some(seq => typeof seq === 'string' && parseSequenceRank(seq) === nameRank));
                }
                return SummonManager.selfTargets(bm, view).length > 0;
            }
            if (action === TacticCatalog.REWIND_ACTION) {
                const best = RewindManager.bestVitalityRound(bm, view);
                return !view.isSummon && RewindManager.quotaLeft(bm, view, sub) > 0 && !!best?.differs;
            }
            if (action === TacticCatalog.FUNDAMENTAL_RULE_ACTION || action === TacticCatalog.RULE_CHANGE_ACTION) {
                const forced = descriptor.npcFallbackSubtype || sub;
                if (!RuleChangeManager.availableNpcSubtypes(view).includes(forced) || !RuleChangeManager.npcShouldTry(bm, view)) return false;
                if (!RuleChangeManager.isPresetSubtype(forced)) return TacticCatalog.RULE_CHANGE_SCOPES.some(scope =>
                    scope === TacticCatalog.RULE_CHANGE_FOE ? RuleChangeManager.foeTargets(bm, view).length > 0
                        : RuleChangeManager.targetsOf(bm, view, scope).length > 0);
                return RuleChangeManager.presetsOf(forced).some(preset =>
                    [null, ...RuleChangeManager.foeTargets(bm, view)].some(target => !!RuleChangeManager.buildPresetPlan(bm, view, forced, preset.key, target)));
            }
            if (!this.isExecutable(bm, caster, owner, descriptor, { npc: true, authoritySubtype })) return false;
            if (action === TacticCatalog.SKILL_CONTROL_ACTION) return SkillControlManager.npcTargets(bm, view, descriptor.mode).length > 0;
            if (action === TacticCatalog.BRIBERY_ACTION) return BriberyManager.targets(bm, view, sub, true).length > 0;
            if (action === TacticCatalog.PUNISHMENT_ACTION) {
                if (!bm.cpuManager) return false;
                const tiers = bm.cpuManager.buildSequenceTiers(view, PunishmentManager.candidateTargets(bm, view, true).map(unit => ({ unit, side: 'enemy' })));
                return tiers.some(tier => bm.cpuManager.buildBallot(tier, [], view).some(row => row.votes > 0));
            }
            if (action === TacticCatalog.BALANCE_ACTION) return !!BalanceManager.npcTarget(bm, view);
            if (action === TacticCatalog.ENV_ACTION) return EnvironmentManager.npcSubtypePool(bm, view).includes(sub);
            if (action === TacticCatalog.FIELD_EFFECT_ACTION || action === TacticCatalog.TARGET_INTERFERENCE_ACTION) {
                const targets = FieldEffectManager.needsPick(sub) ? FieldEffectManager.pickPool(bm, view, sub) : [null];
                return targets.some(t => FieldEffectManager.npcWorthwhile(bm, view, sub, t));
            }
            if (action === TacticCatalog.EFFECT_TRANSFER_ACTION) return EffectTransferManager.isGiftSubtype(sub)
                ? EffectTransferManager.giftableEffects(bm, view).length > 0 : !EffectTransferManager.outgoingOf(bm, view);
            if (action === TacticCatalog.BATTLE_EVENT_ACTION) return BattleEventManager.worthwhile(bm, view, sub);
            return true;
        }, { readOnly: true });
    },
    npcGroupsForSource(bm, caster, owner, authoritySubtype) {
        return AbilityBorrowManager.withProjectedCost(caster, authoritySubtype, () => {
            const groups = new Map();
            this.list(bm, caster, owner, { npc: true }).forEach(d => {
                if (!this.npcFeasible(bm, caster, owner, d, authoritySubtype)) return;
                const leaf = [TacticCatalog.CONTROL_ACTION, TacticCatalog.SKILL_CONTROL_ACTION, TacticCatalog.BRIBERY_ACTION].includes(d.action);
                const key = leaf ? d.id : d.action === TacticCatalog.FUNDAMENTAL_RULE_ACTION ? TacticCatalog.RULE_CHANGE_ACTION : d.action;
                if (!groups.has(key)) groups.set(key, { key, descriptors: [] });
                groups.get(key).descriptors.push(d);
            });
            return [...groups.values()];
        });
    },
    planNpcGroup(bm, caster, owner, authoritySubtype, group) {
        return AbilityBorrowManager.withProjectedCost(caster, authoritySubtype, () => {
            for (const descriptor of TacticResolver.shuffle(group.descriptors)) {
                const plans = this._npcPlansForSource(bm, caster, owner, authoritySubtype, descriptor);
                if (plans.length) return plans[0];
            }
            return null;
        });
    },
    npcSources(bm, caster, authoritySubtype) {
        return AbilityBorrowManager.sources(bm, caster, authoritySubtype, true, false)
            .filter(source => this.npcGroupsForSource(bm, caster, source, authoritySubtype).length > 0);
    },

    validateCoverage() {
        let ok = true;
        const problems = [];
        const warn = id => {
            if (this.allowed.has(id) || this.denied.has(id)) return;
            const leaf = String(id).includes(':') ? String(id).slice(String(id).indexOf(':') + 1) : id;
            if (this.denied.has(leaf)) return;
            ok = false;
            problems.push({ id, reason: '缺少显式borrowPolicy' });
            if (!this._missingPolicyWarnings.has(id)) {
                this._missingPolicyWarnings.add(id);
                console.error(`[能力借用] 战术能力“${id}”缺少显式 borrowPolicy，已默认禁止。`);
            }
        };

        // 顶层动作必须明确 allow/deny：允许项由动态 provider 列出，永不允许的在 denied。
        const knownDynamic = this.topLevelAllowed;
        Object.keys(TacticCatalog.ACTION_META).forEach(action => {
            if (action === TacticCatalog.ABILITY_BORROW_ACTION) return;
            if (!knownDynamic.has(action) && !this.denied.has(action)) warn(action);
        });

        // 叶子能力也在启动期全量审计；新增 SUBTYPES 后即使本场没人拥有，也会立刻报错。
        SkillControlManager.MODES.forEach(mode => warn(`skill-control:${mode}`));
        [TacticCatalog.MARIONETTE, TacticCatalog.CONQUEST, TacticCatalog.MIND,
            TacticCatalog.ENSLAVE, TacticCatalog.TAME,
            ...PossessionManager.subtypes()]
            .forEach(subtype => warn(`control:${subtype}`));
        TempAllegianceManager.subtypes().forEach(subtype => warn(`temp:${subtype}`));
        warn('control:mind-deprive');
        HardControlManager.subtypes().forEach(subtype => warn(`hard:${subtype}`));
        BriberyManager.subtypes().forEach(subtype => warn(`bribery:${subtype}`));
        ['punishment', 'balance'].forEach(warn);
        RuleChangeManager.subtypes().filter(subtype => !RuleChangeManager.SUBTYPES[subtype]?.npcOnly)
            .forEach(subtype => warn(`rule:${subtype}`));
        FundamentalRuleManager.subtypes().forEach(subtype => warn(`fundamental:${subtype}`));
        EnvironmentManager.subtypes().forEach(subtype => warn(`environment:${subtype}`));
        ExileManager.subtypes().forEach(subtype => warn(`exile:${subtype}`));
        ExtraActionManager.subtypes().forEach(subtype => warn(`extra:${subtype}`));
        FieldEffectManager.subtypes().forEach(subtype => warn(`field:${subtype}`));
        EffectTransferManager.subtypes().forEach(subtype => warn(`transfer:${subtype}`));
        BattleEventManager.subtypes().forEach(subtype => warn(`event:${subtype}`));
        RewindManager.subtypes().forEach(subtype => warn(`rewind:${subtype}`));
        SummonManager.subtypes().forEach(subtype => warn(`summon:${subtype}`));
        return { ok, problems };
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
      transfer: EffectTransferManager, bribery: BriberyManager, balance: BalanceManager,
      punishment: PunishmentManager, punishmentCpu: CPUManager,
      cpuBoardSearch: CpuBoardSearch, terrainHazardScore, terrainVitalityCost,
      terrainTurn: TerrainTurnManager,
      mythic: MythicFormManager, mythicDescriptions: MythicFormDescriptionCatalog,
      exile: ExileManager,
      activeLeave: ActiveLeaveManager,
      battleEvent: BattleEventManager,
      rewind: RewindManager,
      extraAction: ExtraActionManager,
      summon: SummonManager,
      grazingProjection: OriginalGrazingProjectionManager,
      grazingBattle: GrazingBattleManager,
      tacticCatalog: TacticCatalog,
      borrow: AbilityBorrowManager, borrowRegistry: BorrowableTacticRegistry,
      borrowContext: TacticExecutionContext, borrowReport: TacticBorrowReport,
      skillControl: SkillControlManager,
      hardControl: HardControlManager, turnSkip: OriginalTurnSkipManager,
      mindDeprive: MindDepriveManager, forcedMove: ForcedMoveManager,
      enemyControl: EnemyControlManager,
      possession: PossessionManager,
      ruleChange: RuleChangeManager,
      fundamental: FundamentalRuleManager, formulaEngine: BattleFormulaEngine,
      environment: EnvironmentManager, environmentCatalog: EnvironmentCatalog,
      canonAccess: MysteryReenactmentCanonAccess,
      tempAllegiance: TempAllegianceManager, resolvedEffects,
      advantage: ContestAdvantage, reader: ReaderContestAdvantage };
  }
  const api = { create, createStatus, createReporter, createAutoPilot, createSkillControlResolver, averages: () => structuredClone(averages),
    mythicConfig: () => structuredClone(mythicConfig),
    exileConfig: () => structuredClone(exileConfig),
    activeLeaveConfig: () => structuredClone(activeLeaveConfig),
    rewindConfig: () => structuredClone(rewindConfig),
    extraConfig: () => structuredClone(extraConfig),
    hardConfig: () => structuredClone(hardConfig),
    mindConfig: () => structuredClone(mindConfig),
    tempConfig: () => structuredClone(tempConfig),
    controlConfig: () => structuredClone(controlConfig),
    possessionConfig: () => structuredClone(possessionConfig),
    ruleConfig: () => ({ ...ruleConfig }),
    environmentConfig: () => structuredClone(environmentConfig),
    summonConfig: () => structuredClone(summonConfig),
    summonDefaults: () => structuredClone(summonDefaults),
    borrowConfig: () => structuredClone(borrowConfig),
    skillControlConfig: () => structuredClone(skillControlConfig),
    status: () => ({ mounted: true }), dispose() { root.contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  root.contract.initializeGlobal(KEY, api);
})();
