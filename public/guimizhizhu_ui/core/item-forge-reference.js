// Generated from original equipment rules; regenerate with extract-forge-reference.mjs.
(() => {
  'use strict';
  const root = window.cryptLord, modules = root.__stage1Modules;
  const KEY = 'cryptLord.itemForgeReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const defaults = { sequenceBase: {
        "-2": 5000000, "-1": 3000000, "0": 1200000, "1": 300000,
        "2": 120000, "3": 40000, "4": 15000, "5": 6000,
        "6": 2500, "7": 1000, "8": 450, "9": 300
    },
itemConfig: {
        "武器": { p: [0.25, 0.50], n: [0.50, 0.75], pW: [2, 3, 1, 1, 3, 1] },
        "衣物": { p: [0.20, 0.45], n: [0.45, 0.65], pW: [4, 2, 3, 1, 2, 1] },
        "饰品": { p: [0.15, 0.40], n: [0.30, 0.60], pW: [1, 4, 2, 3, 1, 3] },
        "封印物": { p: [0.40, 0.75], n: [0.60, 0.90], pW: [1, 1, 1, 1, 1, 1] }
    },
pathwayMatrix: {
      "占卜家": [1, 5, 3, 1, 3, 2]
    },
traitDB: {
      "不可名状": { M: [1.0, 2.0, -1.0, -1.0, 1.0, 1.0], A: [0,0,0,0,0,0], n_bias: [2, 3], p_boost: 6.0, n_boost: 8.0 }
    } };
  function create(config, random = Math.random) {
    const GameDBManager = { DB: config };
    const Math = Object.create(globalThis.Math);
    Math.random = random;
const containsOldDayAttendant = (s) => String(s || '').includes('旧日侍者');
const resolveOldDayAttendantRank = (sequenceStr) => {
  const seqMatch = String(sequenceStr || '').match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
  return seqMatch ? Number(seqMatch[1]) : 2;
};
const parseItemSequenceRank = (sequenceStr) => {
  // 1. 基础校验：非字符串或空值返回默认值 10
  if (!sequenceStr || typeof sequenceStr !== 'string') return 10;

  // 2. 特殊身份匹配（优先判断，因为这些通常是最高位阶）
  if (sequenceStr.includes('支柱')) return -2;
  if (containsOldDayAttendant(sequenceStr)) return resolveOldDayAttendantRank(sequenceStr);
  if (sequenceStr.includes('旧日')) return -1;

  // 3. 匹配纯数字格式（如 "9", "0.5"）
  // 使用 (?:\.\d+)? 以支持可能存在的小数序列（如准高序列）
  const numMatch = sequenceStr.match(/^\d+(?:\.\d+)?$/);
  if (numMatch) return Number(numMatch[0]);

  // 4. 匹配 "序列X" 格式
  // 兼容 "序列9"、"序列: 5"、"序列 0(准)" 等各种写法
  const seqMatch = sequenceStr.match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
  if (seqMatch) return Number(seqMatch[1]);

  // 5. 默认兜底：如 "无"、"普通人" 等返回 10
  return 10;
};
const getSequenceBaseValue = (rank) => {
  // 优先读取 DB 配置，若不存在则回退至硬编码默认值，最差给 200
  return GameDBManager.DB.sequenceBase[String(rank)] || 200;
};
const generateMundaneItemStats = (item) => {
  const { itemConfig: ITEM_CONFIG } = GameDBManager.DB || {};
  const sixAttrs = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];

  // 类型识别（与 generateItemStats 保持一致，封印物兜底）
  let typeKey = "封印物";
  const safeType = String(item.类型 || "");
  const safeName = String(item.名称 || "");
  const typeStr = (safeType + safeName).toLowerCase();
  if (typeStr.includes("武器") || typeStr.includes("剑") || typeStr.includes("枪") || typeStr.includes("刀")) typeKey = "武器";
  else if (typeStr.includes("衣") || typeStr.includes("甲") || typeStr.includes("袍")) typeKey = "衣物";
  else if (typeStr.includes("饰品") || typeStr.includes("环") || typeStr.includes("链")) typeKey = "饰品";

  const config = ITEM_CONFIG[typeKey] || ITEM_CONFIG["封印物"];
  const weights = config.pW;
  const sumW = weights.reduce((a, b) => a + b, 0);

  // 总增益：封印物 40，其余类型 20
  const TOTAL_POSITIVE = (typeKey === "封印物") ? 40 : 20;
  const randomRange = (min, max) => min + Math.random() * (max - min);

  const stats = {};
  sixAttrs.forEach((attr, i) => {
    const base = (weights[i] / sumW) * TOTAL_POSITIVE;
    // ±20% 独立扰动（与 generateItemStats 内部 randomRange(0.8, 1.2) 风格一致）
    const factor = randomRange(0.8, 1.2);
    stats[attr] = Math.max(0, Math.round(base * factor));
  });

  return stats;
};
const generateItemStats = (baseValue, itemType, itemName = "", pathway = "", trait = "") => {

  const {
    traitDB: TRAIT_DB,
    pathwayMatrix: PATHWAY_MATRIX,
    itemConfig: ITEM_CONFIG
  } = GameDBManager.DB || {};

  // 1. 类型识别兜底 (强制转字符串防止 undefined 报错)
  let typeKey = "封印物";
  const safeType = String(itemType || "");
  const safeName = String(itemName || "");
  const typeStr = (safeType + safeName).toLowerCase();
  if (typeStr.includes("武器") || typeStr.includes("剑") || typeStr.includes("枪") || typeStr.includes("刀")) typeKey = "武器";
  else if (typeStr.includes("衣") || typeStr.includes("甲") || typeStr.includes("袍")) typeKey = "衣物";
  else if (typeStr.includes("饰品") || typeStr.includes("环") || typeStr.includes("链")) typeKey = "饰品";

  const isSealed = (typeKey === "封印物");
  const config = ITEM_CONFIG[typeKey] || ITEM_CONFIG["封印物"];
  const randomRange = (min, max) => min + Math.random() * (max - min);

  // 2. 提取特质与途径配置
  const activeTrait = TRAIT_DB[trait] || TRAIT_DB["空"];
  // 如果输入了途径并在矩阵中存在，优先使用途径基础权重；否则使用装备类型的兜底权重
  const baseWeights = PATHWAY_MATRIX[pathway] ? [...PATHWAY_MATRIX[pathway]] : [...config.pW];

  // 3. 严格确定正负总额度（受特质 boost 影响）
  // 新逻辑：先算出没有特质时的“基底池”
  const p_base = baseValue * randomRange(config.p[0], config.p[1]);
  const n_base = p_base * randomRange(config.n[0], config.n[1]);

  // 特质倍率只对对应的基底池生效
  const p_sum = p_base * activeTrait.p_boost;
  const n_sum = n_base * activeTrait.n_boost;

  // 4. 构建双轨权重矩阵
  // 正面权重 = (途径基础 * (1 + 特质乘数) + 特质加数) * 随机扰动
  const p_weights = baseWeights.map((w, i) => {
  let finalW = w * (1 + activeTrait.M[i]) + activeTrait.A[i];
  finalW = Math.max(0.1, finalW); // 防止负数或全0导致无法分配
  return finalW * randomRange(0.8, 1.2); // 引入轻微随机扰动
  });

  // 负面权重：根据特质进行精准打击，如果没有特质偏向，则回归随机惩罚
  const n_weights = [0, 0, 0, 0, 0, 0];
  if (activeTrait.n_bias.length > 0) {
  activeTrait.n_bias.forEach(idx => n_weights[idx] = randomRange(5, 10)); // 特质指定的倒霉属性承受巨大权重
  // 稍微分一点给其他属性，显得不那么生硬
  n_weights.forEach((_, i) => { if (n_weights[i] === 0) n_weights[i] = randomRange(0.1, 1); });
  } else {
  // 老版本的随机打击法
  const penaltyCount = Math.floor(Math.random() * 3) + 1;
  const indices = [0, 1, 2, 3, 4, 5].sort(() => 0.5 - Math.random()).slice(0, penaltyCount);
  indices.forEach(idx => n_weights[idx] = randomRange(2, 5));
  }

  // 5. 精确分配引擎（带防超模与溢出重分配逻辑 - 保持你优秀的旧逻辑不变，仅做了微调优化性能）
  const allocate = (totalPool, weights, applyCap) => {
  let result = [0, 0, 0, 0, 0, 0];
  let remainingPool = totalPool;
  let activeIndices = new Set([0, 1, 2, 3, 4, 5]);
  const maxCap = totalPool * 0.5;

  if (weights.reduce((a, b) => a + b, 0) === 0) return result;

  let loopGuard = 0;
  while (remainingPool > 0.5 && activeIndices.size > 0 && loopGuard < 20) {
    loopGuard++;
    let currentSumW = 0;
    for (let i of activeIndices) currentSumW += weights[i];
    if (currentSumW <= 0) break;

    let tempAlloc = {};
    let overCapIndices = [];

    for (let i of activeIndices) {
    let alloc = (weights[i] / currentSumW) * remainingPool;
    if (applyCap && (result[i] + alloc > maxCap)) {
      tempAlloc[i] = maxCap - result[i];
      overCapIndices.push(i);
    } else {
      tempAlloc[i] = alloc;
    }
    }

    let distributedThisRound = 0;
    for (let i of activeIndices) {
    result[i] += tempAlloc[i];
    distributedThisRound += tempAlloc[i];
    }

    remainingPool -= distributedThisRound;
    for (let i of overCapIndices) activeIndices.delete(i);
  }
  return result.map(v => Math.round(v));
  };

  // 6. 执行分配（封印物关闭 applyCap 限制）
  const p_stats = allocate(p_sum, p_weights, !isSealed);
  const n_stats = allocate(n_sum, n_weights, !isSealed);

  return {
  活力: p_stats[0] - n_stats[0],
  灵性: p_stats[1] - n_stats[1],
  理智: p_stats[2] - n_stats[2],
  人性: p_stats[3] - n_stats[3],
  敏捷: p_stats[4] - n_stats[4],
  运气: p_stats[5] - n_stats[5]
  };
};
    return { parseRank: parseItemSequenceRank, baseValue: getSequenceBaseValue,
      mundane: generateMundaneItemStats, extraordinary: generateItemStats };
  }
  const api = { defaults, create, status: () => ({ ready: true }),
    dispose() { root.contract.releaseGlobal(KEY); delete modules[KEY]; } };
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
