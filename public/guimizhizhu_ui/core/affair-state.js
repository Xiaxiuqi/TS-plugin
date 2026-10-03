(() => {
  'use strict';

  const KEY = 'cryptLord.affairState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error("[" + KEY + "] shared/contract.js 尚未加载");
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const AFFAIR_CONF = {
  cooldownTurns: 100,   // 两次评定至少间隔多少回合，从点「开始评定」起算
  affinityGate: 100,    // 评定成员的好感度门槛，严格大于

  // ---- 抽真 ----
  // X = 5 + ⌊等级÷2⌋ 个类型，每类 Y 条候选，从 X×Y 池里抽 Z = 3 + ⌊等级÷2⌋ 条成真
  draw: { yPerType: 3, maxPerType: 2 },

  // ---- 难度 ----
  difficulty: [
    '琐事，一个管事就能办，领主过问只是走形式。',
    '常事，要花点钱或人手，办不成也不伤筋动骨。',
    '要事，牵涉多方，办砸有实际损失。',
    '大事，动摇领地一部分根基，或牵涉远比自己强的势力。',
    '危局，处理不当会重创领地，或招来致命敌人。',
  ],

  // ---- 处理方法表：13 种，全是世俗方法 ----
  // 非凡能力是这些方法的加强版（占卜家占卜就是加强的查访取证），不另设类别。
  methods: [
    ['武力强压', '动手、镇压、亮刀子、以力服人。对方吃硬不吃软时有效。'],
    ['依法办理', '走律法、成例、正式程序：判决、立规、发照、罚没。'],
    ['谈判交涉', '讲条件、调解、各让一步、把误会说开。'],
    ['利益收买', '花钱、许好处、赎买、补偿、行贿。'],
    ['人脉疏通', '走关系、托人情、找靠山、拉线搭桥。'],
    ['威望感召', '领主亲自出面，以名望、恩义、口才折服人心。'],
    ['欺瞒设局', '撒谎、伪装、栽赃、下套、以假乱真。'],
    ['暗中动手', '暗杀、绑走、纵火、灭口，不留痕迹地清除。'],
    ['查访取证', '追查真相、搜证、跟踪、审讯。'],
    ['行政调度', '调人调物、订章程、办工程、设机构、按流程推进。'],
    ['技艺施为', '靠专门技术解决，工艺、机械、医术、农法、算账。'],
    ['舆论造势', '登报、放风、演说、煽动或安抚人心。'],
    ['宗教感召', '借教会、信仰、圣事之名行事。'],
  ],

  // ---- 事件类型的范围界定，原样喂给拟事官 ----
  typeScope: {
    '治安': '犯罪与失序：盗窃、抢劫、斗殴、帮派、走私、骚乱。需要武力或刑罚压制的。民事纠纷不算，那是诉讼裁断。',
    '民生': '百姓过得好不好：粮价物价、就业工钱、住房、贫困救济、济贫院、孤寡、慈善募捐、流民、饥荒、水火天灾。管人的处境，不管设施。',
    '医疗卫生': '疫病防治、医馆诊所、医师药师、检疫、伤患、疯人院、墓葬。',
    '生产': '东西怎么造出来：收成、作坊工厂、原料、匠人技艺、滞销、罢工。',
    '财务': '钱的进出：收租、欠债、账目、税赋、契约、亏损。',
    '市场监管': '度量衡、缺斤短两、掺假、物价管制、营业执照、行会规矩、假币。',
    '军备': '武装力量的建设与维持：招募、训练、军械、粮秣、军饷、军纪、逃兵、雇佣兵。实际作战不算。',
    '对外交涉': '与地位大致对等的外部势力往来：邻境领主、乡绅、商会、行会、地方政府、外国。谈判、结盟、摩擦、勒索。',
    '情报': '密探、监视、渗透、反间、情报买卖、刺探邻境虚实、内鬼与走漏消息。',
    '非凡事务': '非凡者出没、封印物、仪式、诡异事件、教派渗透、序列相关的麻烦或机缘。',
    '<User>的个人私事与私人社交圈': '家人、亲戚、旧友、仇人、名誉、健康、婚事、感情、私交往来、私密外泄。',
    '土地房产': '地契转让、佃户续约退租、继承遗产、地界争执、租金标准、狩猎权矿权。管权属，不管产出。',
    '仆役与修缮': '仆役雇佣与管理、器物家具修缮、围墙篱笆道路桥梁、牲畜走失、公共畜栏、水井。',
    '属下管理': '管家账房差役监工的任免考核、偷懒、贪污、结党、越权、代理人瞒着领主行事。',
    '诉讼裁断': '民事诉讼、债务官司、契约违约、遗产争夺、仲裁、判例与惯例。管谁有理，不管谁犯罪。',
    '舆论': '街谈巷议、流言、报纸、传单、公开集会、演讲、民众请愿、声望起落。',
    '教育': '学堂兴办、师资、入学与失学、学费、督学、技工培训、助学。',
    '文化': '节庆、演出、展览、藏品、图书馆美术馆、娱乐场所发照、文人赞助。',
    '选举': '推举、拉票、贿选、选区划分、恩庇交换、议席归属、政治献金。',
    '交通': '道路桥梁、码头运河、驿站、铁路、有轨电车。',
    '科技': '发明、新机械新工艺、工程技术、学会与实验、专利、技术引进。',
    '环境污染': '烟尘、污水、垃圾、水源与林地破坏、扰民作坊。',
    '市政': '供水排污、煤气电灯、公共浴场、公园、菜市场、街道清扫照明、贫民窟改造、公共建筑。',
    '教会事务': '教区、圣职任免、宗教节庆、信众动向、异端邪教、教权与俗权摩擦、宗教捐献。',
    '王室': '觐见、封爵授勋、王室差事、宫廷派系、王室成员的私人请托、失宠或被猜忌。玩家自己称王之后，这一类转为经营自己的宫廷。',
    '议会政治': '议席、法案表决、党派站队、政敌攻讦、行政任命、弹劾调查。',
  },

  // ---- 逐级类型清单：八份独立数组，改某一级只动那一行 ----
  // 数量依次为 13 / 13 / 18 / 19 / 21 / 23 / 24 / 24
  typesByLevel: {
    1: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈', '土地房产', '仆役与修缮'],
    2: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈', '土地房产', '仆役与修缮'],
    3: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈', '土地房产', '仆役与修缮',
      '属下管理', '诉讼裁断', '舆论', '教育', '文化'],
    4: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈', '土地房产',
      '属下管理', '诉讼裁断', '舆论', '教育', '文化', '选举', '交通'],
    5: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈', '土地房产',
      '属下管理', '诉讼裁断', '舆论', '教育', '文化', '选举', '交通', '科技', '环境污染'],
    6: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈',
      '属下管理', '诉讼裁断', '舆论', '教育', '文化', '选举', '交通', '科技', '环境污染',
      '市政', '教会事务', '王室'],
    7: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈',
      '属下管理', '诉讼裁断', '舆论', '教育', '文化', '选举', '交通', '科技', '环境污染',
      '市政', '教会事务', '王室', '议会政治'],
    8: ['治安', '民生', '医疗卫生', '生产', '财务', '市场监管', '军备', '对外交涉', '情报', '非凡事务',
      '<User>的个人私事与私人社交圈',
      '属下管理', '诉讼裁断', '舆论', '教育', '文化', '选举', '交通', '科技', '环境污染',
      '市政', '教会事务', '王室', '议会政治'],
  },

  // ---- 途径 → 擅长方法（键是序列 9 的称号，与 godPathways 的命名一致）----
  // 旧日与支柱不查这张表，按前缀短路视为擅长全部，见 AffairCore.methodsOf
  pathwayMethods: {
    '占卜家': ['查访取证', '欺瞒设局', '暗中动手'],
    '学徒': ['查访取证', '技艺施为', '人脉疏通'],
    '偷盗者': ['欺瞒设局', '暗中动手', '查访取证'],
    '秘祈人': ['宗教感召', '谈判交涉', '威望感召'],
    '观众': ['谈判交涉', '欺瞒设局', '查访取证'],
    '水手': ['武力强压', '行政调度', '技艺施为'],
    '歌颂者': ['威望感召', '宗教感召', '依法办理', '舆论造势'],
    '阅读者': ['查访取证', '技艺施为'],
    '战士': ['武力强压', '威望感召'],
    '不眠者': ['暗中动手', '武力强压'],
    '收尸人': ['查访取证', '暗中动手', '宗教感召'],
    '猎人': ['武力强压', '欺瞒设局', '暗中动手'],
    '刺客': ['暗中动手', '欺瞒设局', '谈判交涉'],
    '药师': ['技艺施为', '暗中动手', '威望感召'],
    '耕种者': ['技艺施为', '行政调度', '宗教感召'],
    '恶棍': ['技艺施为', '暗中动手', '武力强压'],
    '罪犯': ['暗中动手', '武力强压', '利益收买'],
    '囚犯': ['武力强压', '暗中动手'],
    '窥秘人': ['查访取证', '技艺施为', '武力强压'],
    '通识者': ['技艺施为', '查访取证', '舆论造势'],
    '仲裁人': ['依法办理', '武力强压', '查访取证'],
    '律师': ['利益收买', '依法办理', '欺瞒设局'],
    '怪物': ['查访取证', '暗中动手'],
    '舞蹈家': ['宗教感召', '谈判交涉'],
    '掮客': ['利益收买', '人脉疏通', '查访取证'],
    '吝啬鬼': ['利益收买', '欺瞒设局', '人脉疏通'],
    '失梦人': ['查访取证', '暗中动手', '舆论造势'],
    '天文爱好者': ['查访取证', '宗教感召', '技艺施为'],
    '流浪汉': ['人脉疏通', '技艺施为', '武力强压'],
    '萨满': ['查访取证', '舆论造势', '欺瞒设局'],
    '入门者': ['舆论造势', '威望感召', '谈判交涉'],
    '病患': ['行政调度', '利益收买', '暗中动手'],
  },

  // ---- 收益基数：逐级手写，锚定该级 stages 里的三条现成尺子 ----
  // 每项 [金镑, 物资当量, 人口]，下标 0–4 对应难度 1–5。
  //
  // 比例沿用 1 级那三条手工校准过的锚，逐级放大：
  //   金镑     = 该级新建金镑     × [0.08, 0.19, 0.48, 1.15, 2.7]
  //   物资当量 = 该级新建扣货当量 × [0.4, 0.8, 1.6, 3.2, 6.0]
  //   人口     = 该级吞并邻居人口 × [0.019, 0.046, 0.111, 0.231, 0.463]
  // 金镑与物资共用一条放大阶梯（新建金镑 = 周产₁×52、新建扣货当量 = 周产₁×0.5，
  // 比值恒为 104:1）；人口另用一条更陡的，因为人均周产逐级下降。
  // 于是每级都自动满足同一句校验：难度 3 ≈ 半栋楼、开局人口的 4.2%；
  // 难度 5 ≈ 2.7 栋楼、开局人口的 17.4%。
  //
  // 金镑是唯一的例外：6 级起脱离经济阶梯，8 级封在 2000 万。按阶梯 8 级难度 5
  // 该给 1.31 亿，那个量级会让评定变成主要财源。收紧后 6 级往上的价值主轴转到
  // 物资与人口——领地产的是货不是钱，钱本来就该来自产业。
  rewardBase: {
    1: [[80, 4, 2], [200, 8, 5], [500, 16, 12], [1200, 32, 25], [2800, 60, 50]],
    2: [[300, 14, 8], [750, 29, 20], [1800, 58, 47], [4500, 115, 97], [10000, 216, 195]],
    3: [[900, 43, 47], [2200, 86, 117], [5500, 173, 280], [13000, 346, 583], [30000, 648, 1170]],
    4: [[4500, 216, 235], [11000, 432, 585], [27000, 864, 1400], [65000, 1730, 2900], [150000, 3240, 5850]],
    5: [[18000, 865, 2350], [45000, 1730, 5850], [110000, 3460, 14000], [260000, 6900, 29000], [600000, 13000, 58500]],
    6: [[60000, 3600, 9700], [150000, 7200, 24300], [360000, 14400, 58300], [860000, 28800, 121000], [2000000, 54000, 243000]],
    7: [[180000, 21600, 73000], [450000, 43200, 182000], [1100000, 86400, 438000], [2600000, 173000, 910000], [6000000, 324000, 1820000]],
    8: [[600000, 187000, 632000], [1500000, 375000, 1580000], [3600000, 750000, 3790000], [8500000, 1500000, 7900000], [20000000, 2800000, 15800000]],
  },
  // 好感度不随等级放大，那是人际尺度
  affinityReward: [2, 3, 5, 8, 12],
  // 拟事官只能选这三种货种，档位由 goodsMix 决定
  goodsKinds: ['农产品', '工业品', '服务'],
  // 档位当量，与 industryConfig.productionConversion 同源
  goodsTierEquiv: [1, 5, 10, 50, 100],
  // 物资当量 → 各档份额，键是领地等级，值是 1–5 级货各占多少当量（和为 1）。
  // 份额取自该级 stages.扣货 的真实剖面，但砍掉「当阶刚解锁的那一档」：
  // 独立领地玩法.md 895 行把最高档定为干净的进度闸门，连副产都蹭不到，
  // 评定发这一档等于绕过闸门。所以 3 级货从 6 级领地起才发、4 级货从 8 级起、
  // 5 级货始终不发。取整误差一律吸收进 1 级货。
  goodsMix: {
    1: [1, 0, 0, 0, 0],          // 当量最小只有 4，摊不出 2 级货
    2: [0.72, 0.28, 0, 0, 0],
    3: [0.72, 0.28, 0, 0, 0],
    4: [0.70, 0.30, 0, 0, 0],
    5: [0.70, 0.30, 0, 0, 0],
    6: [0.70, 0.29, 0.01, 0, 0],
    7: [0.57, 0.42, 0.01, 0, 0],
    8: [0.57, 0.41, 0.012, 0.008, 0],
  },
  // 放任与搞砸的金镑扣减上限：一次结算最多扣走开扣前持有的这个比例。
  // 只管金镑，物资与人口不设这道闸。
  neglectGoldCapRate: 0.5,

  // ---- 回收率与失败率 ----
  rate: {
    baseFloor: 0.10,      // 基础 = baseFloor + baseStep × 档位
    baseStep: 0.05,
    baseCap: 0.70,
    methodMul: [1.0, 1.35, 1.7],   // 命中 0 / 1 / 2 个推荐方法
    affinitySpan: 0.15,   // 好感度 100→1.0，200→1.15
    shareDecay: 0.8,      // 同一人第 n 条 × 0.8^(n-1)，在封顶之后乘
    finalCap: 0.85,       // 封「能力」；这 15% 缺口是给玩家亲自处理留的
  },
  fail: {
    perDifficulty: 0.10,
    perTier: 0.04,
    methodMul: [1.0, 0.6, 0.3],
    cap: 0.60,
  },
  // 放任后果系数由拟事官四选一
  neglectCoefs: [0, 0.5, 1, 1.5],

  // ---- 路人：临时生成 3 名，只有姓名与职衔，不落盘 ----
  passerby: {
    count: 3,
    titles: {
      '1-2': { 乡村: ['庄园管事', '账房先生', '护院头目'], 市内: ['府中管事', '账房先生', '门房'] },
      '3-5': { 乡村: ['乡区书记', '税吏', '巡防队长'], 市内: ['街区书记员', '税吏', '巡警队长'] },
      '6-7': { 乡村: ['市政书记官', '稽核员', '警厅督察'], 市内: ['市政书记官', '稽核员', '警厅督察'] },
      '8': { 乡村: ['内阁秘书', '王室文书', '行省专员'], 市内: ['内阁秘书', '王室文书', '行省专员'] },
    },
    names: [
      '哈罗德·文特', '塞缪尔·柯比', '伊迪丝·兰姆', '奥利弗·格雷', '玛莎·惠特克',
      '阿尔弗雷德·邓恩', '克拉拉·霍兰', '西奥多·品奇', '露西·贝恩', '沃尔特·斯托克',
      '珀西瓦尔·芬奇', '艾格尼丝·穆尔', '德斯蒙德·凯利', '弗洛拉·雷德', '巴纳比·肖',
    ],
  },
};
  window.AFFAIR_CONF = AFFAIR_CONF;


  function parsePrincipalTier(sequenceStr, npcMatched = true, subjectiveExists = true) {
    if (!npcMatched || !subjectiveExists) return { tier: 0, source: "unrecognized" };
    const s = String(sequenceStr || "").trim();
    if (s.includes("普通人")) return { tier: 1, source: "normal-person" };
    const seqMatch = s.match(/^序列([0-9])-/);
    if (seqMatch) {
      const seqNum = parseInt(seqMatch[1], 10);
      return { tier: 11 - seqNum, source: "sequence-" + seqNum };
    }
    if (s.startsWith("旧日-") || s.startsWith("支柱-")) return { tier: 12, source: "pillar" };
    return { tier: 1, source: "normal-person" };
  }

  function resolvePathwayFromSequence(sequenceStr) {
    const s = String(sequenceStr || "").trim();
    if (!s || s.includes("普通人")) return "";
    const m = s.match(/-(.+)$/);
    return m ? m[1].replace(/途径$/, "").trim() : "";
  }

  if (typeof window !== "undefined" && !window.CurrencyHelper) {
    window.CurrencyHelper = {
      applyCurrencyDelta(wallet, currency, delta, label = "") {
        if (!wallet || typeof wallet !== "object") return false;
        const key = (currency || "金镑").trim();
        if (typeof wallet[key] === "number" || typeof wallet[key] === "string") {
          wallet[key] = Math.max(0, Number(wallet[key]) + delta);
          return true;
        }
        for (const [k, v] of Object.entries(wallet)) {
          if (v && typeof v === "object" && v[key] !== undefined) {
            v[key] = Math.max(0, Number(v[key]) + delta);
            return true;
          }
        }
        wallet[key] = Math.max(0, delta);
        return true;
      },
      resolveWalletPath(currency) {
        return ["常用", (currency || "金镑").trim()];
      }
    };
  }


  const AffairCore = (function () {


  function conf() {
    return (typeof window !== 'undefined' && window.AFFAIR_CONF) || {};
  }

  function core() { return (window.cryptLord && window.cryptLord.__stage1Modules && window.cryptLord.__stage1Modules['cryptLord.domainState']) || (typeof window !== 'undefined' && window.DomainCore) || null; }

  // 只剩路人职衔在用。收益基数已改成逐级查表，不再按段取
  function bandOf(level) {
    const n = Number(level) || 1;
    if (n <= 2) return '1-2';
    if (n <= 5) return '3-5';
    if (n <= 7) return '6-7';
    return '8';
  }

  function clamp(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function shuffle(arr) {
    const a = (arr || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------------- 事务壳 ----------------

  function affairsOf(domain) {
    if (!domain) return null;
    if (!domain.事务 || typeof domain.事务 !== 'object') {
      domain.事务 = { 上次评定回合: 0, 上次评定时刻: 0, 评定次数: 0, 待办: [] };
    }
    if (!Array.isArray(domain.事务.待办)) domain.事务.待办 = [];
    return domain.事务;
  }

  function todosOf(domain) {
    const af = affairsOf(domain);
    return (af && af.待办) || [];
  }

  function findTodo(domain, id) {
    return todosOf(domain).find((t) => t && t.id === id) || null;
  }

  // 玩家手上还压着的活：这些不受冷却约束，随时可申报
  function pendingOwn(domain) {
    return todosOf(domain).filter((t) => t && t.状态 === '玩家进行中');
  }

  // ---------------- 类型池与抽真 ----------------

  function typesOfLevel(level) {
    const t = conf().typesByLevel || {};
    const lv = clamp(level, 1, 8);
    return (t[lv] || t[1] || []).slice();
  }

  function scopeOf(type) {
    return (conf().typeScope || {})[type] || '';
  }

  function xOfLevel(level) { return 5 + Math.floor(clamp(level, 1, 8) / 2); }
  function zOfLevel(level) { return 3 + Math.floor(clamp(level, 1, 8) / 2); }
  function yPerType() { return Number((conf().draw || {}).yPerType) || 3; }

  // 无放回抽 X 个类型，均等权重。不避开上次抽中的，允许连着撞同一领域。
  function rollTypes(level) {
    const pool = typesOfLevel(level);
    return shuffle(pool).slice(0, Math.min(xOfLevel(level), pool.length));
  }

  // 从 X×Y 候选池抽 Z 条成真。同一类型最多 2 条——
  // 纯随机会出现三条全落治安，那样一次评定就成了单一领域的连续剧。
  function pickReal(cands, level) {
    const cap = Number((conf().draw || {}).maxPerType) || 2;
    const need = zOfLevel(level);
    const used = Object.create(null);
    const out = [];
    shuffle(cands).forEach((c) => {
      if (out.length >= need || !c) return;
      const t = c.类型 || '';
      const n = used[t] || 0;
      if (n >= cap) return;
      used[t] = n + 1;
      out.push(c);
    });
    return out;
  }

  // ---------------- 档位与途径 ----------------

  // 序列优先读客观表；缺失回退玩家主观认知（可能不准，聊胜于无）；再缺按普通人
  function sequenceOf(name, mvuState) {
    const objs = mvuState && mvuState.npc_data;
    const obj = objs && objs[name];
    const s1 = obj && obj.当前序列;
    if (s1 && String(s1).trim()) return String(s1).trim();
    const sd = mvuState && mvuState.stat_data;
    const subj = sd && sd.人物关系列表 && sd.人物关系列表[name];
    const s2 = subj && subj.当前序列;
    if (s2 && String(s2).trim() && String(s2).trim() !== '未知') return String(s2).trim();
    return '普通人';
  }

  // parsePrincipalTier 在 npc_data 查无此人时会回 0 档，
  // 而回收率表从 1 档起——0 代进公式会得到表上没有的 10%，故夹到最低 1 档。
  function tierOfSequence(seq) {
    let tier = 1;
    try {
      if (typeof parsePrincipalTier === 'function') {
        const r = parsePrincipalTier(String(seq || ''), true, true);
        tier = Number(r && r.tier) || 0;
      }
    } catch (e) { tier = 0; }
    return clamp(tier, 1, 12);
  }

  function tierOf(name, mvuState) {
    return tierOfSequence(sequenceOf(name, mvuState));
  }

  function allMethods() {
    return (conf().methods || []).map((m) => m[0]);
  }

  // 旧日与支柱按前缀短路，绝不进途径查找：
  // 「支柱-上帝」同时躺在五条途径的序列数组里，resolvePathwayFromSequence
  // 遍历到首个匹配就 return，结果取决于对象键序，等于随机。
  function methodsOf(seq) {
    const s = String(seq || '').trim();
    if (s.indexOf('旧日-') === 0 || s.indexOf('支柱-') === 0) return allMethods();
    let pathway = '';
    try {
      if (typeof resolvePathwayFromSequence === 'function') {
        pathway = resolvePathwayFromSequence(s) || '';
      }
    } catch (e) { pathway = ''; }
    return ((conf().pathwayMethods || {})[pathway] || []).slice();
  }

  function methodsOfNpc(name, mvuState) {
    return methodsOf(sequenceOf(name, mvuState));
  }

  // 命中几个推荐方法。事件只给一个推荐时上限就是 1。
  function matchCount(recommended, mastered) {
    const own = {};
    (mastered || []).forEach((m) => { own[m] = true; });
    let n = 0;
    (recommended || []).forEach((m) => { if (own[m]) n++; });
    return clamp(n, 0, 2);
  }

  // ---------------- 回收率与失败率 ----------------

  function baseRate(tier) {
    const r = conf().rate || {};
    const floor = Number(r.baseFloor) || 0.10;
    const step = Number(r.baseStep) || 0.05;
    const cap = Number(r.baseCap) || 0.70;
    return Math.min(cap, floor + step * clamp(tier, 1, 12));
  }

  function affinityMul(affinity) {
    const r = conf().rate || {};
    const span = Number(r.affinitySpan) || 0.15;
    const a = Number(affinity) || 0;
    return clamp(1 + ((a - 100) / 100) * span, 1, 1 + span);
  }

  // 运算顺序不能反：先把前三项连乘并封顶，最后才乘分摊。
  // 反了的话旧日接第二条会是 min(0.85, 0.70×1.7×0.8)=0.85，分摊完全失效。
  function recoveryRate(tier, hit, affinity, nth) {
    const r = conf().rate || {};
    const mm = (r.methodMul || [1, 1.35, 1.7])[clamp(hit, 0, 2)] || 1;
    const capped = Math.min(
      Number(r.finalCap) || 0.85,
      baseRate(tier) * mm * affinityMul(affinity),
    );
    const decay = Number(r.shareDecay) || 0.8;
    return capped * Math.pow(decay, Math.max(0, (Number(nth) || 1) - 1));
  }

  // 分摊递减不作用于失败率，只压回收率：
  // 精力分散影响的是能榨出多少油水，不是会不会翻车。
  function failRate(difficulty, tier, hit) {
    const f = conf().fail || {};
    const raw = (Number(f.perDifficulty) || 0.10) * clamp(difficulty, 1, 5)
      - (Number(f.perTier) || 0.04) * clamp(tier, 1, 12);
    const mm = (f.methodMul || [1, 0.6, 0.3])[clamp(hit, 0, 2)] || 1;
    return clamp(raw * mm, 0, Number(f.cap) || 0.60);
  }

  // ---------------- 收益与后果的数额 ----------------

  // 每个类别都按该难度该等级的基数全额给，不做均摊——
  // 选多类别本身就表示这事收益面广，均摊反而让玩家算不清拿了什么。
  function amountsOf(level, difficulty, effect) {
    const c = conf();
    const rows = (c.rewardBase || {})[clamp(level, 1, 8)] || [];
    const row = rows[clamp(difficulty, 1, 5) - 1] || [0, 0, 0];
    const cats = (effect && effect.类别) || [];
    const has = (k) => cats.indexOf(k) >= 0;
    return {
      金镑: has('金镑') ? Number(row[0]) || 0 : 0,
      物资: has('物资') ? Number(row[1]) || 0 : 0,
      人口: has('人口') ? Number(row[2]) || 0 : 0,
      好感度: has('好感度') ? Number((c.affinityReward || [])[clamp(difficulty, 1, 5) - 1]) || 0 : 0,
    };
  }

  function scaleAmounts(amounts, k) {
    const out = {};
    Object.keys(amounts || {}).forEach((key) => {
      out[key] = Math.round((Number(amounts[key]) || 0) * (Number(k) || 0));
    });
    return out;
  }

  function walletOf(mvuState) {
    const sd = mvuState && mvuState.stat_data;
    return (sd && sd.货币) || null;
  }

  function goldHeld(mvuState) {
    const w = walletOf(mvuState);
    const helper = window.CurrencyHelper;
    if (!w || !helper || typeof helper.resolveWalletPath !== 'function') return 0;
    const path = helper.resolveWalletPath('金镑');
    const grp = path && w[path[0]];
    if (!grp || typeof grp !== 'object') return 0;
    return Number(grp[path[1]]) || 0;
  }

  // 放任与搞砸的金镑扣减预算：一次结算最多扣走开扣前持有的 neglectGoldCapRate。
  // 整批共享而不是每条各自打五折——8 级一次七条全放任，各自五折会连乘成
  // 0.5⁷，等于清空钱包，那就不叫损失可控了。只管金镑，物资与人口没这道闸。
  function goldBudget(mvuState) {
    const raw = Number(conf().neglectGoldCapRate);
    const rate = Number.isFinite(raw) ? clamp(raw, 0, 1) : 0.5;
    return { left: Math.max(0, Math.floor(goldHeld(mvuState) * rate)) };
  }

  // 物资当量 → 具体货键。档位份额按领地等级查 goodsMix，高档先取整，
  // 余数全部落在 1 级货上，保证拆出来的总当量精确等于给定当量。
  function goodsBagOf(level, kind, equiv) {
    const c = conf();
    const mix = (c.goodsMix || {})[clamp(level, 1, 8)] || [1, 0, 0, 0, 0];
    const unit = c.goodsTierEquiv || [1, 5, 10, 50, 100];
    const kinds = c.goodsKinds || ['农产品', '工业品', '服务'];
    const name = kinds.indexOf(kind) >= 0 ? kind : '农产品';
    const total = Math.max(0, Math.round(Number(equiv) || 0));
    const counts = [0, 0, 0, 0, 0];
    let rest = total;
    for (let t = 5; t >= 2; t--) {
      const share = Number(mix[t - 1]) || 0;
      const per = Number(unit[t - 1]) || 1;
      if (share <= 0) continue;
      const n = Math.round((total * share) / per);
      if (n <= 0 || n * per > rest) continue;
      counts[t - 1] = n;
      rest -= n * per;
    }
    counts[0] = Math.max(0, rest);
    const bag = {};
    for (let t = 1; t <= 5; t++) {
      if (counts[t - 1] > 0) bag[`${t}级${name}`] = counts[t - 1];
    }
    return bag;
  }

  // 好感度归属：事件点名了谁就给谁，没点名给承办人，
  // 玩家自领且未点名则这一项作废，路人不加。
  // 利益关系人允许写「某个布商」「佃户」这类模糊指称与群体名——那是给拟事官的出口，
  // 免得它为了填这一栏硬从名册里拉人。凡对不上人物关系列表的，一律当没填。
  function affinityTargetOf(todo, handler, mvuState) {
    const named = String((todo && (todo.利益关系人 || todo.关联人物)) || '').trim();
    const rel = (mvuState && mvuState.stat_data && mvuState.stat_data.人物关系列表) || null;
    if (named && rel && rel[named] && typeof rel[named] === 'object') return named;
    const h = String(handler || '').trim();
    if (!h || h === '<User>' || h === '暂且搁下') return '';
    return h;
  }

  // 实际改变量。sign 为 +1 发放、-1 扣减。返回真正落账的部分。
  // budget 是本批次金镑扣减的共享余额（goldBudget 的返回值），只在 sign < 0 时
  // 起作用；发放侧传 null。扣不满预算就只扣这么多，钱包因此永远不会为负。
  function applyEffect(domain, mvuState, effect, amounts, sign, npcName, budget) {
    const s = sign < 0 ? -1 : 1;
    const got = {};
    const dc = core();

    let gold = Number(amounts && amounts.金镑) || 0;
    if (s < 0 && budget) gold = Math.min(gold, Math.max(0, Number(budget.left) || 0));
    if (gold > 0) {
      const w = walletOf(mvuState);
      if (w && window.CurrencyHelper) {
        window.CurrencyHelper.applyCurrencyDelta(w, '金镑', s * gold, '领地评定');
        got.金镑 = s * gold;
        if (s < 0 && budget) budget.left = Math.max(0, (Number(budget.left) || 0) - gold);
      }
    }

    const goods = Number(amounts && amounts.物资) || 0;
    if (goods > 0 && dc) {
      const kind = (effect && effect.货种) || '农产品';
      const bag = goodsBagOf(domain && domain.等级, kind, goods);
      dc.applyGoods(domain, bag, s);
      got.物资 = s * goods;
      got.货种 = kind;
      // 当量对玩家没有意义，回显要报出实际的货键与件数
      got.物资明细 = Object.keys(bag).map((k) => `${k} ${bag[k]}`).join(' + ');
    }

    const pop = Number(amounts && amounts.人口) || 0;
    if (pop > 0 && dc) {
      const cur = dc.population(domain);
      domain.人口 = Math.max(0, cur + s * pop);
      got.人口 = s * pop;
    }

    const aff = Number(amounts && amounts.好感度) || 0;
    if (aff > 0 && npcName) {
      const sd = mvuState && mvuState.stat_data;
      const subj = sd && sd.人物关系列表 && sd.人物关系列表[npcName];
      // 点名的人在变量里查无此人时跳过这一项，其余照发
      if (subj) {
        const cur = Number(subj.好感度) || 0;
        subj.好感度 = clamp(cur + s * aff, -200, 200);
        got.好感度 = s * aff;
        got.好感度对象 = npcName;
      }
    }

    return got;
  }

  // ---------------- 结算 ----------------

  // applyEffect 的回执里混有说明字段；落盘时拆开，实得只留数字，避免 Schema NaN
  function packSettlement(rate, failed, got) {
    const src = got || {};
    const 实得 = {};
    ['金镑', '物资', '人口', '好感度'].forEach((k) => {
      if (src[k] == null) return;
      const n = Number(src[k]);
      if (Number.isFinite(n)) 实得[k] = n;
    });
    return {
      回收率: Number(rate) || 0,
      是否失败: !!failed,
      实得,
      货种: src.货种 ? String(src.货种) : '',
      物资明细: src.物资明细 ? String(src.物资明细) : '',
      好感度对象: src.好感度对象 ? String(src.好感度对象) : '',
    };
  }

  // 承办人是路人：免除放任后果、零收益、不掷失败、不参与方法匹配与分摊
  function isPasserby(handler, roster) {
    if (!handler) return false;
    return (roster || []).some((p) => p && p.姓名 === handler && p.路人);
  }

  // 散会时批量结算。指派一次性选完、提交即锁死，所以这里一次跑完全部。
  // 幂等靠状态挡：已经不是「待指派」的条目直接跳过，
  // 刷新页面恢复 session 时重跑也不会白发一份收益。
  function settleBatch(domain, mvuState, roster) {
    const af = affairsOf(domain);
    const level = Number(domain.等级) || 1;
    const load = Object.create(null);   // 每个 NPC 已接几条，用于分摊递减
    const budget = goldBudget(mvuState); // 搞砸那半份后果，整批共享一个金镑扣减上限
    const report = [];

    (af.待办 || []).forEach((todo) => {
      if (!todo || todo.状态 !== '待指派') return;
      const handler = String(todo.处理者 || '').trim();
      const diff = clamp(todo.难度, 1, 5);

      if (!handler || handler === '暂且搁下') {
        todo.状态 = '已搁置';
        report.push({ id: todo.id, 标题: todo.标题, 归宿: '已搁置' });
        return;
      }

      if (handler === '<User>') {
        todo.状态 = '玩家进行中';
        report.push({ id: todo.id, 标题: todo.标题, 归宿: '玩家进行中' });
        return;
      }

      if (isPasserby(handler, roster)) {
        todo.状态 = '已压下';
        todo['$结算'] = packSettlement(0, false, {});
        report.push({ id: todo.id, 标题: todo.标题, 归宿: '已压下', 承办: handler });
        return;
      }

      // 属僚 NPC
      const sd = mvuState && mvuState.stat_data;
      const subj = sd && sd.人物关系列表 && sd.人物关系列表[handler];
      const affinity = Number(subj && subj.好感度) || 0;
      const tier = tierOf(handler, mvuState);
      const hit = matchCount(todo.推荐方法, methodsOfNpc(handler, mvuState));
      const nth = (load[handler] || 0) + 1;
      load[handler] = nth;

      const fr = failRate(diff, tier, hit);
      const failed = Math.random() < fr;

      if (failed) {
        // 派错人比不派略糟一点，但至少有人挡了一下：吃放任后果的一半，不发收益
        const half = scaleAmounts(
          amountsOf(level, diff, todo['$后果']),
          (Number(todo['$后果系数']) || 0) * 0.5,
        );
        const lost = applyEffect(
          domain, mvuState, todo['$后果'], half, -1,
          affinityTargetOf(todo, handler, mvuState), budget,
        );
        todo.状态 = '已搞砸';
        todo['$结算'] = packSettlement(0, true, lost);
        report.push({ id: todo.id, 标题: todo.标题, 归宿: '已搞砸', 承办: handler, 失败率: fr });
        return;
      }

      const rate = recoveryRate(tier, hit, affinity, nth);
      const paid = scaleAmounts(amountsOf(level, diff, todo['$收益']), rate);
      const got = applyEffect(
        domain, mvuState, todo['$收益'], paid, 1,
        affinityTargetOf(todo, handler, mvuState),
      );
      todo.状态 = '已办妥';
      todo['$结算'] = packSettlement(rate, false, got);
      report.push({ id: todo.id, 标题: todo.标题, 归宿: '已办妥', 承办: handler, 回收率: rate });
    });

    return report;
  }

  // 玩家申报完成且判定通过：全额，不掷失败率
  function settleOwn(domain, mvuState, todoId) {
    const todo = findTodo(domain, todoId);
    if (!todo || todo.状态 !== '玩家进行中') return null;
    const level = Number(domain.等级) || 1;
    const diff = clamp(todo.难度, 1, 5);
    const full = amountsOf(level, diff, todo['$收益']);
    const got = applyEffect(
      domain, mvuState, todo['$收益'], full, 1,
      affinityTargetOf(todo, '<User>', mvuState),
    );
    todo.状态 = '已完成';
    todo['$结算'] = packSettlement(1, false, got);
    return got;
  }

  // 下次评定点「开始评定」那一刻：结算全部未了结的旧待办
  function settleNeglect(domain, mvuState) {
    const af = affairsOf(domain);
    const level = Number(domain.等级) || 1;
    const budget = goldBudget(mvuState);  // 整批共享的金镑扣减上限
    const hit = [];
    (af.待办 || []).forEach((todo) => {
      if (!todo) return;
      if (todo.状态 !== '玩家进行中' && todo.状态 !== '已搁置' && todo.状态 !== '待指派') return;
      const diff = clamp(todo.难度, 1, 5);
      const k = Number(todo['$后果系数']);
      const coef = Number.isFinite(k) ? k : 0.5;
      if (coef > 0) {
        const amt = scaleAmounts(amountsOf(level, diff, todo['$后果']), coef);
        applyEffect(
          domain, mvuState, todo['$后果'], amt, -1,
          affinityTargetOf(todo, '', mvuState), budget,
        );
      }
      todo.状态 = '已放任';
      hit.push({ 标题: todo.标题, 系数: coef });
    });
    return hit;
  }

  // 上期回顾：散会只写领命不写成败，结果留到下次开始评定时由这段带进正文
  function buildRecap(domain) {
    const list = todosOf(domain);
    if (!list.length) return '（无）';
    const label = {
      已办妥: '办妥', 已搞砸: '搞砸', 已压下: '临时属吏压下',
      已完成: '<User> 已办成', 已放任: '无人承办被搁置',
    };
    const lines = list.map((t) => {
      if (!t) return '';
      let end = label[t.状态] || '无人承办被搁置';
      if (t.状态 === '已放任' && t.处理者 === '<User>') end = '<User> 未办成';
      const who = t.处理者 && t.处理者 !== '暂且搁下' ? t.处理者 : '无人';
      return `- ${t.标题 || '（无题）'} —— ${who} —— ${end}`;
    }).filter(Boolean);
    return lines.length ? lines.join('\n') : '（无）';
  }

  // ---------------- 冷却与开始评定 ----------------

  function cooldownTurns() { return Number(conf().cooldownTurns) || 100; }

  // 玩家会回退楼层导致序号倒退，用 max 兜底，不让回退绕过冷却
  function canStart(domain, curTurn) {
    if (!domain || !domain.已建立) return { ok: false, remain: 0, reason: '尚未建立领地' };
    const af = affairsOf(domain);
    const last = Number(af.上次评定回合) || 0;
    const now = Math.max(Number(curTurn) || 0, last);
    const need = cooldownTurns();
    if (!last) return { ok: true, remain: 0, reason: '' };
    const gone = now - last;
    if (gone >= need) return { ok: true, remain: 0, reason: '' };
    const remain = need - gone;
    return { ok: false, remain, reason: `距下次评定还差 ${remain} 回合` };
  }

  // 点「开始评定」：结算旧账 → 产出上期回顾 → 清空 → 记新水位。四件事绑死在一个动作上。
  function openAssembly(domain, mvuState, curTurn) {
    const af = affairsOf(domain);
    const dc = core();
    settleNeglect(domain, mvuState);
    const recap = buildRecap(domain);
    af.待办 = [];
    af.上次评定回合 = Math.max(Number(curTurn) || 0, Number(af.上次评定回合) || 0);
    af.上次评定时刻 = dc ? dc.nowMinutes(mvuState) : 0;
    af.评定次数 = (Number(af.评定次数) || 0) + 1;
    return recap;
  }

  // 评定完成、正文写入之后：流水清空，下一期重新攒
  function closeAssembly(domain) {
    const dc = core();
    if (dc) dc.clearLedger(domain);
  }

  // ---------------- 路人 ----------------

  // 只有姓名与职衔，不落盘、不进人物关系列表、不进 npc_data，每次评定重新生成
  function rollPasserby(level, line) {
    const p = conf().passerby || {};
    const band = bandOf(level);
    const ln = line === '市内' ? '市内' : '乡村';
    const titles = ((p.titles || {})[band] || {})[ln] || [];
    const names = shuffle(p.names || []);
    const n = Number(p.count) || 3;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        姓名: names[i] || `属吏${i + 1}`,
        职衔: titles[i] || titles[0] || '属吏',
        路人: true,
      });
    }
    return out;
  }

  // ---------------- 材料装配 ----------------

  function pickTag(text, tag) {
    const m = String(text || '').match(
      new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'),
    );
    return m ? m[1].trim() : '';
  }

  const GAIN_CATS = ['金镑', '物资', '人口', '好感度'];

  function parseCats(s) {
    return String(s || '').split(/[,，、\s]+/)
      .map((x) => x.trim())
      .filter((x) => GAIN_CATS.indexOf(x) >= 0)
      .filter((x, i, a) => a.indexOf(x) === i);
  }

  // 解析拟事官的输出。LLM 大概率不会严丝合缝吐满 X×Y 条，必须容错：
  // 能解析出几条用几条，不因缺条而重试整批；0 条才报错。
  function parseCandidates(raw, allowedTypes) {
    const text = String(raw || '');
    const blocks = text.match(/<事务>[\s\S]*?<\/事务>/gi) || [];
    const allow = allowedTypes && allowedTypes.length ? allowedTypes : null;
    const mset = allMethods();
    const goodKinds = conf().goodsKinds || ['农产品', '工业品', '服务'];
    const out = [];

    blocks.forEach((b, i) => {
      const type = pickTag(b, '类型');
      // 类型缺失或不在本级清单内 → 丢弃该条
      if (!type || (allow && allow.indexOf(type) < 0)) return;

      let diff = parseInt(pickTag(b, '难度'), 10);
      if (!Number.isFinite(diff) || diff < 1 || diff > 5) diff = 2;

      // 推荐方法：不在 13 种之内的一律剔除；全剔光就是「无推荐方法」，
      // 承办人拿不到方法加成，失败率的方法系数按 1.0
      const methods = [];
      const bases = [];
      const mre = /<方法>([\s\S]*?)<\/方法>/gi;
      let mm;
      while ((mm = mre.exec(b)) && methods.length < 2) {
        const name = pickTag(mm[1], '名称');
        if (name && mset.indexOf(name) >= 0 && methods.indexOf(name) < 0) {
          methods.push(name);
          bases.push(pickTag(mm[1], '依据'));
        }
      }

      const gainBlk = (b.match(/<收益>([\s\S]*?)<\/收益>/i) || [])[1] || '';
      const loseBlk = (b.match(/<后果>([\s\S]*?)<\/后果>/i) || [])[1] || '';

      let gainCats = parseCats(pickTag(gainBlk, '类别'));
      if (!gainCats.length) gainCats = ['金镑'];           // 收益类别为空 → 按金镑计
      const loseCats = parseCats(pickTag(loseBlk, '类别'));

      let gainKind = pickTag(gainBlk, '货种');
      if (gainCats.indexOf('物资') >= 0 && goodKinds.indexOf(gainKind) < 0) gainKind = '农产品';
      let loseKind = pickTag(loseBlk, '货种');
      if (loseCats.indexOf('物资') >= 0 && goodKinds.indexOf(loseKind) < 0) loseKind = '农产品';

      let coef = parseFloat(pickTag(loseBlk, '系数'));
      if ((conf().neglectCoefs || [0, 0.5, 1, 1.5]).indexOf(coef) < 0) coef = 0.5;

      let src = pickTag(b, '来源');
      if (['玩家行为', '领地内情', '外部'].indexOf(src) < 0) src = '外部';

      out.push({
        id: `af-${Date.now().toString(36)}-${i}-${Math.floor(Math.random() * 1e4)}`,
        类型: type,
        标题: pickTag(b, '标题') || '（无题）',
        经过: pickTag(b, '经过'),
        来源: src,
        难度: diff,
        推荐方法: methods,
        方法依据: bases,
        利益关系人: pickTag(b, '利益关系人') || pickTag(b, '关联人物'),
        处理者: '',
        状态: '待指派',
        '$收益': { 类别: gainCats, 货种: gainKind, 说明: pickTag(gainBlk, '说明') },
        '$后果系数': coef,
        '$后果': { 类别: loseCats, 货种: loseKind, 说明: pickTag(loseBlk, '说明') },
        '$结算': {
          回收率: 0, 是否失败: false, 实得: {},
          货种: '', 物资明细: '', 好感度对象: '',
        },
      });
    });

    return out;
  }

  // 到场检测的解析。口径同 parseVerdict：
  // 解析不出来一律判不在场，绝不允许失败反向判成在场。
  function parseAttendance(raw, memberNames) {
    const text = String(raw || '');
    const names = Array.isArray(memberNames) ? memberNames : [];
    const FALLBACK = '模型回复格式无法解析，可重试检测';
    const out = { 玩家: { 在场: false, 理由: '' }, 成员: {} };
    const yes = (s) => /是|在场/.test(s) && !/否|不在|未到/.test(s);
    let any = false;

    const pm = text.match(/<玩家>([\s\S]*?)<\/玩家>/i);
    if (pm) {
      const v = pickTag(pm[1], '在场');
      if (v) { out.玩家.在场 = yes(v); any = true; }
      out.玩家.理由 = pickTag(pm[1], '理由');
    }

    const mre = /<成员>([\s\S]*?)<\/成员>/gi;
    let m;
    while ((m = mre.exec(text))) {
      const nm = pickTag(m[1], '姓名');
      if (!nm) continue;
      out.成员[nm] = { 在场: yes(pickTag(m[1], '在场')), 理由: pickTag(m[1], '理由') };
      any = true;
    }

    if (!any) out.玩家.理由 = FALLBACK;
    names.forEach((n) => {
      if (!out.成员[n]) {
        out.成员[n] = { 在场: false, 理由: any ? '模型未给出该员判定，按不在场处理' : FALLBACK };
      }
    });
    return out;
  }

  // ---------------- 材料装配（喂给提示词的文本块）----------------

  function typeBrief(types) {
    return (types || []).map((t) => `- ${t}：${scopeOf(t)}`).join('\n');
  }

  function methodBrief() {
    return (conf().methods || []).map((m) => `  ${m[0]}：${m[1]}`).join('\n');
  }

  // 待办清单只填标题、类型、经过、推荐方法。
  // 难度、收益、后果一概不填——那些是前端的账。
  function todoListText(todos) {
    const list = todos || [];
    if (!list.length) return '（本期无事）';
    return list.map((t, i) => {
      const ms = (t.推荐方法 || []).join('、');
      return `${i + 1}. 【${t.类型}】${t.标题}\n   ${t.经过}`
        + (ms ? `\n   （可行的路子：${ms}）` : '');
    }).join('\n');
  }

  // 处置安排只填标题加承办人，不填成败、不填数值
  function assignListText(todos) {
    const list = todos || [];
    if (!list.length) return '（无）';
    return list.map((t, i) => {
      const h = String(t.处理者 || '').trim();
      let who;
      if (!h || h === '暂且搁下') who = '暂且搁下';
      else if (h === '<User>') who = '<User> 亲自处置';
      else who = h;
      return `${i + 1}. 【${t.类型}】${t.标题} —— ${who}`;
    }).join('\n');
  }

  // 与会人员不给序列、不给好感度数字，给了 LLM 就会在正文里写等级
  function rosterText(roster) {
    const list = roster || [];
    if (!list.length) return '（无）';
    return list.map((p) => {
      if (p.路人) return `- ${p.姓名}（${p.职衔}）· 临时属吏`;
      return `- ${p.姓名}${p.身份 ? `（${p.身份}）` : ''}`;
    }).join('\n');
  }

  // 拟事官挑利益关系人时的名册。全表照发，不按好感度或重点与否裁剪：
  // 名册越窄，它越容易硬把某条事安到名册里的人头上。
  function relationRosterText(mvuState) {
    const rel = (mvuState && mvuState.stat_data && mvuState.stat_data.人物关系列表) || {};
    const lines = [];
    Object.keys(rel).forEach((name) => {
      if (!name || name.charAt(0) === '$') return;
      const o = rel[name];
      if (!o || typeof o !== 'object') return;
      const tail = ['身份', '关系']
        .map((k) => String(o[k] || '').trim())
        .filter((x) => x && x !== '未知')
        .join('，');
      lines.push(`- ${name}${tail ? `（${tail}）` : ''}`);
    });
    return lines.length ? lines.join('\n') : '（无）';
  }

  function attendanceText(att, roster) {
    if (!att) return '（尚未检测）';
    const lines = [
      `- <User>：${att.玩家.在场 ? '在场' : '不在场'} —— ${att.玩家.理由 || '（无理由）'}`,
    ];
    (roster || []).forEach((p) => {
      if (p.路人) { lines.push(`- ${p.姓名}（${p.职衔}）：在场 —— 临时属吏，随传随到`); return; }
      const r = att.成员[p.姓名] || { 在场: false, 理由: '（无记录）' };
      lines.push(`- ${p.姓名}：${r.在场 ? '在场' : '不在场'} —— ${r.理由 || '（无理由）'}`);
    });
    return lines.join('\n');
  }

  // 成员侧喂给到场校验官的材料。位置读 npc_data（客观真实），
  // 不读人物关系列表（那是玩家主观认知，可能过时）。
  // 两张表不同步时三个字段填「（无记录）」照常喂，不跳过该成员，
  // 否则玩家会看不到他为什么没来。
  function memberFacts(names, mvuState) {
    const objs = (mvuState && mvuState.npc_data) || {};
    return (names || []).map((n) => {
      const o = objs[n] || {};
      const at = String(o.所处地点 || '').trim() || '（无记录）';
      const doing = String(o.正在做的事 || '').trim() || '（无记录）';
      const plan = String(o.近期打算 || '').trim() || '（无记录）';
      return `- ${n}\n  所处地点：${at}\n  正在做的事：${doing}\n  近期打算：${plan}`;
    }).join('\n');
  }

  // 覆盖了多少游戏内时间。首次评定没有基准，如实说明。
  function spanText(domain, mvuState) {
    const af = affairsOf(domain);
    const dc = core();
    const nowMin = dc ? dc.nowMinutes(mvuState) : 0;
    const lastMin = Number(af.上次评定时刻) || 0;
    if (!lastMin) return '首次评定，无往期对照';
    const days = Math.max(0, Math.round((nowMin - lastMin) / 1440));
    return `约 ${days} 天`;
  }

  return {
    conf, bandOf,
    affairsOf, todosOf, findTodo, pendingOwn,
    typesOfLevel, scopeOf, xOfLevel, zOfLevel, yPerType, rollTypes, pickReal, shuffle,
    sequenceOf, tierOf, tierOfSequence, allMethods, methodsOf, methodsOfNpc, matchCount,
    baseRate, affinityMul, recoveryRate, failRate,
    amountsOf, scaleAmounts, goodsBagOf, goldBudget,
    applyEffect, packSettlement, affinityTargetOf, isPasserby,
    settleBatch, settleOwn, settleNeglect, buildRecap,
    cooldownTurns, canStart, openAssembly, closeAssembly,
    rollPasserby, spanText,
    // 解析与材料装配
    pickTag, parseCandidates, parseAttendance,
    typeBrief, methodBrief, todoListText, assignListText, relationRosterText,
    rosterText, attendanceText, memberFacts,
  };
  })();
  window.AffairCore = AffairCore;

  const AFFAIR_CANDIDATE_TEMPLATES = {
    "治安": [
      { 标题: "巡防私运与帮派械斗", 经过: "领地边境有走私船只偷运违禁品，并与本地帮派发生摩擦，需派员处置。", 难度: 2, 推荐方法: ["武力强压", "依法办理"], 收益: { 类别: ["金镑", "物资"], 货种: "农产品" }, 后果: { 类别: ["金镑"], 系数: 0.5 } },
      { 标题: "流寇哨探驱离", 经过: "哨塔发现在荒野边界有小股盗匪出没窥伺领地仓库。", 难度: 3, 推荐方法: ["武力强压", "暗中动手"], 收益: { 类别: ["物资", "好感度"], 货种: "工业品" }, 后果: { 类别: ["物资"], 货种: "工业品", 系数: 0.5 } },
      { 标题: "集市斗殴裁断", 经过: "酒馆与马车行因占道发生争执打斗，损坏货摊。", 难度: 1, 推荐方法: ["依法办理", "谈判交涉"], 收益: { 类别: ["金镑"], 货种: "服务" }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "民生": [
      { 标题: "冬日救济粮与流民安置", 经过: "周边荒原流民涌入，粮价微涨，需调拨物资安抚并统筹修葺避寒棚屋。", 难度: 2, 推荐方法: ["行政调度", "利益收买"], 收益: { 类别: ["人口", "好感度"] }, 后果: { 类别: ["物资"], 货种: "农产品", 系数: 0.5 } },
      { 标题: "济贫所修缮与柴炭核发", 经过: "寒潮来袭，孤寡贫民需增拨柴炭补助。", 难度: 1, 推荐方法: ["行政调度", "威望感召"], 收益: { 类别: ["好感度"] }, 后果: { 类别: ["金镑"], 系数: 0.5 } },
      { 标题: "饮用水井疏浚工程", 经过: "主要村落水井淤塞，村民请愿开掘新深井防冻。", 难度: 2, 推荐方法: ["技艺施为", "行政调度"], 收益: { 类别: ["人口", "物资"], 货种: "服务" }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "医疗卫生": [
      { 标题: "巡诊医馆药材紧缺", 经过: "领地初冬湿寒，咳喘疫病有蔓延迹象，医师请求增设药房与储备药草。", 难度: 2, 推荐方法: ["技艺施为", "行政调度"], 收益: { 类别: ["人口", "好感度"] }, 后果: { 类别: ["人口"], 系数: 0.5 } },
      { 标题: "屠宰作坊卫生检疫", 经过: "肉铺集市出现腐坏肉类传闻，需规范检疫立规。", 难度: 1, 推荐方法: ["依法办理", "技艺施为"], 收益: { 类别: ["好感度", "金镑"] }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "生产": [
      { 标题: "作坊改良与产能扩张", 经过: "铁匠作坊与磨坊提出改良水车联动轴，有望大幅提高周产量。", 难度: 3, 推荐方法: ["技艺施为", "利益收买"], 收益: { 类别: ["物资", "金镑"], 货种: "工业品" }, 后果: { 类别: ["物资"], 货种: "工业品", 系数: 0.5 } },
      { 标题: "农田灌溉渠系清淤", 经过: "主干水渠沉积泥沙，农夫工头呈请召集劳力疏通。", 难度: 2, 推荐方法: ["行政调度", "利益收买"], 收益: { 类别: ["物资"], 货种: "农产品" }, 后果: { 类别: ["物资"], 货种: "农产品", 系数: 0.5 } }
    ],
    "财务": [
      { 标题: "领地租赋与欠款清缴", 经过: "几处商行租契到期，账房核查发现有一笔陈年欠款未结，需按成例追讨。", 难度: 2, 推荐方法: ["依法办理", "谈判交涉"], 收益: { 类别: ["金镑"] }, 后果: { 类别: ["金镑"], 系数: 0.5 } },
      { 标题: "岁末账册平准审计", 经过: "核对各项仓库账目与出库收据，规避虚报冒领。", 难度: 2, 推荐方法: ["技艺施为", "依法办理"], 收益: { 类别: ["金镑", "物资"], 货种: "工业品" }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "市场监管": [
      { 标题: "集市度量衡与掺假整治", 经过: "农贸集市有客商反映谷物掺沙、秤杆缺斤短两，影响集市信誉。", 难度: 1, 推荐方法: ["依法办理", "查访取证"], 收益: { 类别: ["金镑", "好感度"] }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "军备": [
      { 标题: "哨所军械修缮与冬饷核发", 经过: "卫队防具需要修补磨砺，军官呈请提支部分军费与优质铁料。", 难度: 3, 推荐方法: ["行政调度", "武力强压"], 收益: { 类别: ["物资"], 货种: "工业品" }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "对外交涉": [
      { 标题: "邻境乡绅的结盟试探", 经过: "邻地贵族派信使送来礼函，试探我方在通商税率上的态度与协防意向。", 难度: 3, 推荐方法: ["谈判交涉", "利益收买"], 收益: { 类别: ["金镑", "好感度"] }, 后果: { 类别: ["好感度"], 系数: 0.5 } }
    ],
    "情报": [
      { 标题: "密探截获加密信笺", 经过: "密探在旅馆截获一份加密字条，疑似有可疑人员在刺探领地仓库防务。", 难度: 2, 推荐方法: ["查访取证", "暗中动手"], 收益: { 类别: ["金镑", "好感度"] }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "非凡事务": [
      { 标题: "废弃矿道灵性骚动", 经过: "伐木工在林区边缘听到诡异低语，疑似有微弱的灵界生物徘徊，需慎重调查。", 难度: 3, 推荐方法: ["暗中动手", "查访取证"], 收益: { 类别: ["物资", "好感度"], 货种: "服务" }, 后果: { 类别: ["人口"], 系数: 0.5 } }
    ],
    "<User>的个人私事与私人社交圈": [
      { 标题: "旧识来信与人情往来", 经过: "一位旧友寄来请托信，询问领地能否为其亲眷提供经商庇护或落脚住处。", 难度: 2, 推荐方法: ["人脉疏通", "威望感召"], 收益: { 类别: ["好感度", "金镑"] }, 后果: { 类别: ["好感度"], 系数: 0.5 } }
    ],
    "土地房产": [
      { 标题: "地界石移位与林权争议", 经过: "相邻两处庄园佃户因林地界限起纠纷，双方各执一词，需领主裁断。", 难度: 2, 推荐方法: ["依法办理", "谈判交涉"], 收益: { 类别: ["金镑"] }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ],
    "仆役与修缮": [
      { 标题: "主楼管事房与蓄水池翻修", 经过: "领地水井与蓄水池年久失修，泥瓦匠呈递修缮预算与工期申请。", 难度: 1, 推荐方法: ["行政调度", "技艺施为"], 收益: { 类别: ["物资"], 货种: "工业品" }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
    ]
  };

  function generateFallbackAffairs(domain, mvuState, level) {
    const rolledTypes = AffairCore.rollTypes(level);
    const cands = [];
    let idx = 0;
    rolledTypes.forEach(t => {
      const list = AFFAIR_CANDIDATE_TEMPLATES[t] || [
        { 标题: t + "常规事务", 经过: "关于" + t + "的日常条规执行与申诉处理。", 难度: 2, 推荐方法: ["依法办理", "行政调度"], 收益: { 类别: ["金镑"], 货种: "农产品" }, 后果: { 类别: ["金镑"], 系数: 0.5 } }
      ];
      list.forEach(item => {
        idx++;
        cands.push({
          id: "af-" + Date.now().toString(36) + "-" + idx + "-" + Math.floor(Math.random() * 10000),
          类型: t,
          标题: item.标题,
          经过: item.经过,
          难度: item.难度 || 2,
          推荐方法: item.推荐方法 ? [...item.推荐方法] : ["依法办理"],
          $收益: item.收益 || { 类别: ["金镑"], 货种: "农产品" },
          $后果: item.后果 || { 类别: ["金镑"], 系数: 0.5 },
          $后果系数: item.后果?.系数 || 0.5,
          状态: "待指派",
          处理者: "",
        });
      });
    });
    return AffairCore.pickReal(cands, level);
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        handlers: Object.freeze(["affair-core", "affair-assembly", "affair-settlement"]),
      });
    },
    AFFAIR_CONF,
    AffairCore,
    affairsOf: AffairCore.affairsOf,
    todosOf: AffairCore.todosOf,
    findTodo: AffairCore.findTodo,
    pendingOwn: AffairCore.pendingOwn,
    canStart: AffairCore.canStart,
    openAssembly: AffairCore.openAssembly,
    closeAssembly: AffairCore.closeAssembly,
    rollTypes: AffairCore.rollTypes,
    pickReal: AffairCore.pickReal,
    assignTodo(domain, todoId, handler) {
      const todo = AffairCore.findTodo(domain, todoId);
      if (!todo) return false;
      todo.处理者 = String(handler || "").trim();
      return true;
    },
    generateAffairs(domain, mvuState, level) {
      const lv = Number(level || domain?.等级 || 1);
      const realTasks = generateFallbackAffairs(domain, mvuState, lv);
      const af = AffairCore.affairsOf(domain);
      af.待办 = realTasks;
      return realTasks;
    },
    settleBatch: AffairCore.settleBatch,
    settleOwn: AffairCore.settleOwn,
    settleNeglect: AffairCore.settleNeglect,
    rollPasserby: AffairCore.rollPasserby,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
