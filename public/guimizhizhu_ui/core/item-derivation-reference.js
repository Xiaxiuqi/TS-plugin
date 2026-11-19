// Generated from original item and relationship rules; use extract-item-derivation-reference.mjs.
(() => {
  'use strict';
  const root = window.cryptLord, modules = root.__stage1Modules, KEY = 'cryptLord.itemDerivationReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const defaults = { consumableConfig: {
      // 消耗品战斗化：各序列六维平均属性（来源：属性平均值.txt），供 power/healAmt/cost 推算
      avgAttrByRank: {
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
      }
    },
maxBonusConfig: {
      "10": 10, "-2": 36, "-1": 33, "0": 30, "1": 27, "2": 24, "3": 21,
      "4": 18, "5": 15, "6": 12, "7": 9, "8": 6, "9": 3
    } };
  function create(config, random = globalThis.Math.random) {
    const GameDBManager = { DB: config }, Math = Object.create(globalThis.Math);
    Math.random = random;
const containsOldDayAttendant = (s) => String(s || '').includes('旧日侍者');
const resolveOldDayAttendantRank = (sequenceStr) => {
  const seqMatch = String(sequenceStr || '').match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
  return seqMatch ? Number(seqMatch[1]) : 2;
};
const parseSequenceRank = (sequenceStr) => {
      if (!sequenceStr || typeof sequenceStr !== 'string') return 10;
      if (sequenceStr.includes('支柱')) return -2;
      if (containsOldDayAttendant(sequenceStr)) return resolveOldDayAttendantRank(sequenceStr);
      if (sequenceStr.includes('旧日')) return -1;
      const numMatch = sequenceStr.match(/^\d+(?:\.\d+)?$/);
      if (numMatch) return Number(numMatch[0]);
      const seqMatch = sequenceStr.match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
      if (seqMatch) return Number(seqMatch[1]);
      return 10;
};
const getMaxBonusPercent = (seqRank) => {
  // 极致的 O(1) 查表
  return GameDBManager.DB.maxBonusConfig[String(seqRank)] ?? 10;
};
const parseTraitSequenceRank = (seqStr) => Math.round(parseSequenceRank(seqStr));
const isMeaningfulTraitSequence = (seqStr) => {
  if (!seqStr || typeof seqStr !== 'string') return false;
  const trimmed = seqStr.trim();
  if (!trimmed || trimmed === '普通' || trimmed === '无' || trimmed.includes('普通人')) return false;
  if (trimmed.includes('支柱') || trimmed.includes('旧日')) return true;
  if (/序列[：:\s]*\d+(?:\.\d+)?/.test(trimmed)) return true;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return true;
  return false;
};
const tierToEquivalentSeqRank = (tierStr) => {
  if (!tierStr || typeof tierStr !== 'string') return null;
  const tier = tierStr.trim();
  if (!tier || tier === '无') return null;
  if (tier.includes('支柱')) return -2;
  if (tier.includes('旧日')) return -1;
  const directMap = { 普通: 9, 非凡: 8, 罕见: 7, 史诗: 5, 传说: 4, 神话: 2, 唯一: 0 };
  if (Object.prototype.hasOwnProperty.call(directMap, tier)) return directMap[tier];
  const seqMatch = tier.match(/序列(\d+(?:\.\d+)?)/);
  if (seqMatch) return Math.round(Number(seqMatch[1]));
  return null;
};
const getTraitDefaultBonusPercent = (序列, 等阶) => {
  if (isMeaningfulTraitSequence(序列)) {
    return getMaxBonusPercent(parseTraitSequenceRank(序列));
  }
  const tierRank = tierToEquivalentSeqRank(等阶);
  if (tierRank !== null) {
    return getMaxBonusPercent(tierRank);
  }
  return getMaxBonusPercent(9);
};
const generateConsumableStats = (baseValue, type, effect, targetStat) => {
  const {
    consumableConfig: CONSUMABLE_CONFIG
  } = GameDBManager.DB || {};

  // 核心防护：强制转换为字符串，彻底杜绝 .includes() 报错
  const safeType = String(type || "");
  const safeEffect = String(effect || "");
  const safeTargetStat = String(targetStat || "");

  let typeKey = "其他";
  // 防止 CONSUMABLE_CONFIG 为空导致的异常
  if (typeof CONSUMABLE_CONFIG !== 'undefined') {
  for (const key in CONSUMABLE_CONFIG) {
    if (safeType.includes(key)) typeKey = key;
  }
  }

  // 兜底 config 配置，防止取不到数据
  const config = CONSUMABLE_CONFIG[typeKey] || { powerRatio: 1, costRatio: 0.5, defaultCost: '灵性' };

  // 引入轻微随机性 (±20%)
  const randomFactor = () => 0.8 + Math.random() * 0.4;

  const rawPower = Math.round(baseValue * config.powerRatio * randomFactor());
  const rawCost = Math.round(baseValue * config.costRatio * randomFactor());

  let result = {};
  let damageBonus = undefined;

  const validAttrs = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];

  // 辅助函数：安全累加属性（解决覆盖Bug）
  const addStat = (statName, value) => {
  if (statName === "全属性" || statName === "所有属性") {
    validAttrs.forEach(attr => result[attr] = (result[attr] || 0) + Math.round(value / 3)); // 全属性增益稍微打个折
    return;
  }
  // 防呆：如果 AI 编了奇怪的属性，强行纠正为敏捷或活力
  const safeStat = validAttrs.includes(statName) ? statName : "活力";
  result[safeStat] = (result[safeStat] || 0) + value;
  };

  // 效果解析引擎
  if (safeEffect.includes("杀伤") || safeEffect.includes("攻击")) {
  addStat(config.defaultCost, -rawCost); // 扣除驱动代价
  damageBonus = rawPower; // 威力转化为纯伤害加成
  }
  else if (safeEffect.includes("恢复") || safeEffect.includes("治疗")) {
  const healTarget = safeTargetStat !== "" ? safeTargetStat : "活力";
  addStat(healTarget, rawPower);

  // 药三分毒
  const sideEffectStat = safeType.includes("药品") ? "理智" : "人性";
  addStat(sideEffectStat, -Math.ceil(rawCost * 0.5));
  }
  else if (safeEffect.includes("增益") || safeEffect.includes("强化")) {
  const buffTarget = safeTargetStat !== "" ? safeTargetStat : "敏捷";
  addStat(buffTarget, Math.round(rawPower * 0.6));
  addStat(config.defaultCost, -rawCost);
  }
  else {
  addStat("灵性", -rawCost);
  }

  return { attributes: result, damageBonus };
};
const constrainBonusPercent = (bonusObj, seqStr, listType = '') => {
  if (!bonusObj || typeof bonusObj !== 'object') return {};

  const savedMeta = bonusObj.$meta;
  const seqRank = parseSequenceRank(seqStr);
  const maxPercent = getMaxBonusPercent(seqRank);

  if (maxPercent === 0) {
  return savedMeta !== undefined ? { $meta: savedMeta } : {};
  }

  const constrainedBonus = {};
  Object.entries(bonusObj).forEach(([key, value]) => {
  if (key === '$meta') {
    constrainedBonus[key] = value;
    return;
  }
  let num;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = Number((value || '').replace(/%/g, ''));
  } else {
    num = 0;
  }
  if (isNaN(num)) {
    constrainedBonus[key] = `${maxPercent}%`;
  } else {
    const finalNum = num > maxPercent ? maxPercent : num;
    constrainedBonus[key] = `${finalNum}%`;
  }
  });

  return constrainedBonus;
};
const constrainSingleEquipment = (itemList) => {
  if (!itemList || typeof itemList !== 'object') return itemList;

  // 过滤出除了 $meta 之外的所有真实物品键名
  const itemKeys = Object.keys(itemList).filter(key => key !== '$meta');

  // 找出所有被标记为已装备的物品
  const equippedKeys = itemKeys.filter(key => itemList[key] && itemList[key].isEquipped === true);

  // 核心拦截：如果装备数大于 1
  if (equippedKeys.length > 1) {
    console.warn(`[数据层拦截] 发现 ${equippedKeys.length} 件装备同时穿戴，正在执行强制清洗...`);

    // 策略：保留数组中最后一个（通常是玩家最新点击的）
    const keyToKeep = equippedKeys.pop();

    // 剩下的全部强行篡改为 false
    equippedKeys.forEach(key => {
      itemList[key].isEquipped = false;
    });
  }

  return itemList; // 返回清洗后绝对干净的列表
};
const pruneEmptyStackables = (itemList) => {
  if (!itemList || typeof itemList !== 'object') return itemList;

  for (const key of Object.keys(itemList)) {
    if (key === '$meta') continue;
    const item = itemList[key];
    if (!item || typeof item !== 'object') continue;
    if (!Object.prototype.hasOwnProperty.call(item, '数量')) continue;
    const qty = Number(item.数量);
    if (!Number.isNaN(qty) && qty <= 0.05) {
      delete itemList[key];
    }
  }

  return itemList;
};
const syncSealedItemLevelAndNumber = (item) => {
  const { 级别, 序列 } = item;

  // 功能一：如果级别为空，则级别和编号全为空
  if (!级别 || 级别.trim() === '') {
    item.级别 = '';
    item.编号 = '';
    return item;
  }

  // 功能二：检测级别是否包含关键词，激活同步机制
  const levelKeywords = ['1', '2', '3', '0', '真神', '旧日', '支柱'];
  const shouldSync = levelKeywords.some(keyword => 级别.includes(keyword));

  if (!shouldSync) {
    return item; // 不需要同步，直接返回
  }

  // 解析序列等级
  const parseSequenceLevel = (sequenceStr) => {
    if (!sequenceStr) return null;

    // 检查特殊级别（「旧日侍者」按序列2，不当真·旧日）
    if (sequenceStr.includes('支柱')) return '支柱';
    if (containsOldDayAttendant(sequenceStr)) {
      const attendantMatch = sequenceStr.match(/序列(\d)/);
      return attendantMatch ? parseInt(attendantMatch[1], 10) : 2;
    }
    if (sequenceStr.includes('旧日')) return '旧日';

    // 提取数字序列
    const match = sequenceStr.match(/序列(\d)/);
    if (match) {
      return parseInt(match[1]);
    }

    // 直接数字匹配
    const directMatch = sequenceStr.match(/\b([0-9])\b/);
    if (directMatch) {
      return parseInt(directMatch[1]);
    }

    return null;
  };

  const sequenceLevel = parseSequenceLevel(序列);

  // 功能三：序列验证失败处理
  if (sequenceLevel === null) {
    item.级别 = '未评级封印物';
    item.序列 = '无';
    item.编号 = '无';
    return item;
  }

  // 根据序列等级同步级别（编号不做处理，保持原值）
  if (sequenceLevel === '支柱') {
    item.级别 = '支柱级封印物';
    item.编号 = '无';
  } else if (sequenceLevel === '旧日') {
    item.级别 = '旧日级封印物';
    item.编号 = '无';
  } else if (sequenceLevel === 0) {
    item.级别 = '真神级封印物';
    item.编号 = '无';
  } else if (sequenceLevel === 1 || sequenceLevel === 2) {
    item.级别 = '0级封印物';
    // 编号不做处理，保持用户填写的值
  } else if (sequenceLevel === 3 || sequenceLevel === 4) {
    item.级别 = '1级封印物';
    // 编号不做处理，保持用户填写的值
  } else if (sequenceLevel === 5 || sequenceLevel === 6) {
    item.级别 = '2级封印物';
    // 编号不做处理，保持用户填写的值
  } else if (sequenceLevel === 7 || sequenceLevel === 8 || sequenceLevel === 9) {
    item.级别 = '3级封印物';
    // 编号不做处理，保持用户填写的值
  } else {
    item.级别 = '未评级封印物';
    item.编号 = '无';
  }

  return item;
};
function deriveAttitudeFromAffinity(affinity) {
  const a = Number(affinity);
  if (!Number.isFinite(a)) return '点头之交';
  if (a >= 130) return '知己';
  if (a >= 80)  return '信赖';
  if (a >= 30)  return '友善';
  if (a >= -9)  return '点头之交';
  if (a >= -29) return '排斥';
  if (a >= -69) return '厌恶';
  return '仇视';
}
    return { rank: parseSequenceRank, consumable: generateConsumableStats, bonus: constrainBonusPercent,
      trait: getTraitDefaultBonusPercent, single: constrainSingleEquipment, prune: pruneEmptyStackables,
      sealed: syncSealedItemLevelAndNumber, attitude: deriveAttitudeFromAffinity };
  }
  const api = Object.freeze({ defaults, create, status: () => ({ ready: true }),
    dispose() { root.contract.releaseGlobal(KEY, api); delete modules[KEY]; } });
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
