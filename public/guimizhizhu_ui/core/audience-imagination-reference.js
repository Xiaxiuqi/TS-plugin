// Generated from the complete original imagination, projection resolver and weighted NPC ability rules.
(() => {
  'use strict';
  const KEY = 'cryptLord.audienceImaginationReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const localStorage = { getItem: () => String(Boolean(deps.locked)) };
    const Math = Object.create(globalThis.Math);
    Math.random = deps.random || globalThis.Math.random;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways || {},
      sequenceAbilities: Object.fromEntries(Object.entries(deps.pool.abilities || {}).map(([key, rows]) =>
        [key, Array.isArray(rows) ? rows.map(row => ({ ...row, name: row.name ?? row.名称,
          description: row.description ?? row.描述, type: row.type ?? row.类型 })) : rows])) } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const containsOldDayAttendant = value => String(value || '').includes('旧日侍者');
const getPureName = (nameStr) => {
  if (!nameStr) return "";
  let s = nameStr.replace(/[【】]/g, "").trim();
  // 先剥序列前缀；完整「旧日侍者」保留，避免被「旧日」前缀误伤成「侍者」
  s = s.replace(/^(序列\d+(\.\d+)?)[-—\s]?/, "").trim();
  if (containsOldDayAttendant(s)) return s;
  return s.replace(/^(旧日|支柱)[-—\s]?/, "").trim();
};
const buildAbilityKey = (pathway, rankMatch, tierPrefix) => {
  const rawKey = rankMatch ? `${pathway}-序列${rankMatch[1]}` : `${pathway}-${tierPrefix}`;
  return rawKey.replace(/序列0([0-9])/g, "序列$1");
};
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
const PathwaySeqUtil = {
  // 凡人档。不在途径库里，但 parseSequenceRank 给 10、sequenceBase 走 200 兜底、
  // fetchAvailableAbilities 对它直接返回空池落到兜底攻击，全链路都算得出来
  MORTAL: '普通人',

  pathwayDb() {
    const db = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
      ? GameDBManager.DB.godPathways : null;
    return (db && typeof db === 'object' && !Array.isArray(db)) ? db : {};
  },

  /** 途径全名列表。UI 里的途径下拉只是筛选器，选定结果仍是一个序列名字符串 */
  pathwayNames() {
    const db = this.pathwayDb();
    return Object.keys(db).filter(k => Array.isArray(db[k]));
  },

  /** 某途径下的全部序列名条目，含旧日与支柱 */
  seqEntriesOf(pathwayFullName) {
    if (pathwayFullName === this.MORTAL) return [this.MORTAL];
    const list = this.pathwayDb()[pathwayFullName];
    return Array.isArray(list) ? list.filter(s => typeof s === 'string' && s.trim()) : [];
  },

  /**
   * 把一个序列名校验成库里真实存在的那一条。
   * 必须精确命中：自己拼的名字会让能力体系反查与序列能力池匹配全部落空
   *（分身的 seqStringOf 存在的理由就是这个）。
   * 先按整串比，再退一步按纯名比——后者返回的仍是库里的原字符串。
   * 「普通人」是清单之外唯一放行的写法：被寄生的宿主可能根本不是非凡者。
   * @returns {{seqString:string, pathway:string}|null}
   */
  findSeqString(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (s === this.MORTAL || s === '凡人') return { seqString: this.MORTAL, pathway: this.MORTAL };
    const db = this.pathwayDb();
    const names = Object.keys(db);
    for (const pw of names) {
      const list = db[pw];
      if (!Array.isArray(list)) continue;
      if (list.some(x => typeof x === 'string' && x.trim() === s)) return { seqString: s, pathway: pw };
    }
    const pureOf = (v) => (typeof getPureName === 'function')
      ? getPureName(v)
      : String(v || '').replace(/^(序列\d+(\.\d+)?)[-—\s]?/, '').trim();
    const pure = pureOf(s);
    if (!pure) return null;
    for (const pw of names) {
      const list = db[pw];
      if (!Array.isArray(list)) continue;
      const hit = list.find(x => typeof x === 'string' && pureOf(x) === pure);
      if (hit) return { seqString: hit, pathway: pw };
    }
    return null;
  },

  /** 序列名清单：一途径一行，比 JSON 省一半字符。世界书改了这里跟着改 */
  pathwayText() {
    const db = this.pathwayDb();
    return Object.keys(db).map(pw => {
      const list = db[pw];
      if (!Array.isArray(list)) return '';
      return [pw].concat(list.filter(s => typeof s === 'string' && s.trim())).join('|');
    }).filter(Boolean).join('\n');
  },
};
const AudienceImaginationCore = {
  ID: 'spectator-imagination',
  PATHWAY: '观众',
  PATHWAY_FULL: '观众途径',
  TITLE: '上帝',
  STORE_PLAY: '空想玩法',
  STORE_SLOTS: '空想栏位',
  ABILITY_PREFIX: '#空想:',
  DISPLAY_KEY: '#空想',
  SEPARATION_KEY: '分离序列1特性',
  SEPARATION_COUNT: '已使用次数',
  SEPARATION_LIMIT: 2,
  WRITER_TRAIT_NAME: '作家特性',

  clone(v) {
    try {
      if (typeof _ !== 'undefined' && _ && typeof _.cloneDeep === 'function') return _.cloneDeep(v);
      return JSON.parse(JSON.stringify(v));
    } catch (_) {
      return v;
    }
  },

  realSequence(mvuState) {
    return String((mvuState && mvuState.stat_data && mvuState.stat_data.当前序列) || '').trim();
  },

  /**
   * 真实观众档位 → 空想档位。0.X 明确按序列1；序列0、旧日与上帝按序列0。
   * 上帝先按称号短路，避免它同时躺在多条途径数组里时被对象键序误判。
   */
  resolveOwnerSequence(sequenceString) {
    const s = String(sequenceString || '').trim();
    if (!s) return { inPathway: false, unlocked: false, realRank: null, projectionRank: null, slots: 0, viaTitle: false };
    if (s.includes(this.TITLE)) {
      return {
        inPathway: true,
        unlocked: true,
        realRank: parseSequenceRank(s),
        projectionRank: 0,
        slots: 2,
        viaTitle: true,
      };
    }

    let best = null;
    LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      if (!r || r.pathwayShort !== this.PATHWAY) return;
      const rank = Number(r.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });

    if (best === null) {
      return { inPathway: false, unlocked: false, realRank: null, projectionRank: null, slots: 0, viaTitle: false };
    }
    if (best > 1) {
      return { inPathway: true, unlocked: false, realRank: best, projectionRank: null, slots: 0, viaTitle: false };
    }
    if (best > 0) {
      return { inPathway: true, unlocked: true, realRank: best, projectionRank: 1, slots: 1, viaTitle: false };
    }
    return { inPathway: true, unlocked: true, realRank: best, projectionRank: 0, slots: 2, viaTitle: false };
  },

  pathwayNames() {
    return PathwaySeqUtil.pathwayNames();
  },

  canonicalSequenceOf(pathwayFullName, rank) {
    const want = Number(rank);
    if (!Number.isFinite(want)) return '';
    const list = PathwaySeqUtil.seqEntriesOf(pathwayFullName);
    const hit = list.find(s => parseSequenceRank(String(s || '')) === want);
    return hit ? String(hit) : '';
  },

  /** @returns {Set<string>} 真实序列已经拥有的途径全名 */
  existingPathwaysOf(sequenceString) {
    const out = new Set();
    LifeSaveManager.splitSequenceFragments(sequenceString).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      if (r && r.pathwayShort) out.add(`${r.pathwayShort}途径`);
    });
    return out;
  },

  mergeSequenceFragments(baseSequence, additions) {
    const out = LifeSaveManager.splitSequenceFragments(baseSequence);
    if (!out.length && String(baseSequence || '').trim()) out.push(String(baseSequence).trim());
    const seen = new Set(out);
    (additions || []).forEach(seq => {
      const s = String(seq || '').trim();
      if (!s || seen.has(s)) return;
      seen.add(s);
      out.push(s);
    });
    return out.join('/');
  },

  /** 投影快照专用：同一途径有多个合法来源时只保留最高位阶。 */
  mergeStrongestSequenceFragments(baseSequence, additions) {
    const sources = [baseSequence].concat(additions || []);
    const out = [];
    const exact = new Set();
    const pathwayIndex = new Map();
    const pathwayRank = new Map();
    sources.forEach(source => {
      let fragments = LifeSaveManager.splitSequenceFragments(source);
      if (!fragments.length && String(source || '').trim()) fragments = [String(source).trim()];
      fragments.forEach(frag => {
        const text = String(frag || '').trim();
        if (!text) return;
        const resolved = LifeSaveManager.resolveFragment(text);
        const rank = resolved ? Number(resolved.rank) : NaN;
        const pathway = resolved && resolved.pathwayShort;
        if (pathway && Number.isFinite(rank)) {
          if (!pathwayIndex.has(pathway)) {
            pathwayIndex.set(pathway, out.length);
            pathwayRank.set(pathway, rank);
            out.push(text);
          } else if (rank < pathwayRank.get(pathway)) {
            out[pathwayIndex.get(pathway)] = text;
            pathwayRank.set(pathway, rank);
          }
          return;
        }
        if (exact.has(text)) return;
        exact.add(text);
        out.push(text);
      });
    });
    return out.join('/');
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

  playerSlotValues(mvuState) {
    const store = this.playerStore(mvuState, false);
    const slots = store ? store.slots : {};
    return [1, 2].map(i => {
      const row = slots[`栏位${i}`];
      return String((row && row.途径) || '').trim();
    });
  },

  savePlayerSlots(mvuState, values) {
    const store = this.playerStore(mvuState, true);
    if (!store) return false;
    store.play.版本 = Math.max(2, Number(store.play.版本) || 0);
    [1, 2].forEach((i) => {
      const pathway = String((values && values[i - 1]) || '').trim();
      store.slots[`栏位${i}`] = { 途径: pathway };
    });
    return true;
  },

  separationRecord(mvuState, create) {
    const store = this.playerStore(mvuState, create);
    if (!store) return null;
    let record = store.play[this.SEPARATION_KEY];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      if (!create) return null;
      record = store.play[this.SEPARATION_KEY] = { [this.SEPARATION_COUNT]: 0 };
    }
    const parsed = Math.floor(Number(record[this.SEPARATION_COUNT]) || 0);
    const used = Math.min(this.SEPARATION_LIMIT, Math.max(0, parsed));
    if (create) {
      record[this.SEPARATION_COUNT] = used;
      store.play.版本 = Math.max(2, Number(store.play.版本) || 0);
    }
    return { store, record, used };
  },

  separationUsedCount(mvuState) {
    const state = this.separationRecord(mvuState, false);
    return state ? state.used : 0;
  },

  canSeparateWriterTrait(mvuState, snapshot = null) {
    const gate = snapshot && snapshot.imaginationGate
      ? snapshot.imaginationGate
      : (window.PlayerProjectionResolver
        ? window.PlayerProjectionResolver.resolve(mvuState).imaginationGate
        : this.resolveOwnerSequence(this.realSequence(mvuState)));
    return !!(gate.unlocked && gate.projectionRank === 0);
  },

  /** 同步增加永久次数与其他列表中的作家特性；调用方随后负责落盘。 */
  separateWriterTrait(mvuState, snapshot = null) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd || !this.canSeparateWriterTrait(mvuState, snapshot)) {
      return { ok: false, reason: '该功能需要当前有效的观众途径资格达到序列0，或拥有“上帝”资格。' };
    }
    const separation = this.separationRecord(mvuState, true);
    if (!separation || separation.used >= this.SEPARATION_LIMIT) {
      return { ok: false, reason: '分离序列1特性的两次永久额度均已使用。' };
    }

    let list = sd.其他列表;
    if (!list || typeof list !== 'object' || Array.isArray(list)) {
      list = sd.其他列表 = { $meta: { extensible: true } };
    } else if (!list.$meta || typeof list.$meta !== 'object') {
      list.$meta = { extensible: true };
    }

    let key = Object.keys(list).find(k => {
      if (k === '$meta') return false;
      const item = list[k];
      return item && typeof item === 'object' && String(item.名称 || '').trim() === this.WRITER_TRAIT_NAME;
    });
    if (!key) {
      key = this.WRITER_TRAIT_NAME;
      if (Object.prototype.hasOwnProperty.call(list, key)) {
        let suffix = 2;
        while (Object.prototype.hasOwnProperty.call(list, `${this.WRITER_TRAIT_NAME}#${suffix}`)) suffix++;
        key = `${this.WRITER_TRAIT_NAME}#${suffix}`;
      }
      list[key] = {
        名称: this.WRITER_TRAIT_NAME,
        描述: '观众途径序列1作家的非凡特性',
        途径: this.PATHWAY_FULL,
        序列: '序列1',
        数量: 1,
        单位: '份',
      };
    } else {
      const current = list[key];
      const rawQuantity = Object.prototype.hasOwnProperty.call(current, '数量') ? Number(current.数量) : NaN;
      const quantity = Number.isFinite(rawQuantity) && rawQuantity >= 0 ? rawQuantity : 1;
      list[key] = {
        ...current,
        名称: this.WRITER_TRAIT_NAME,
        描述: '观众途径序列1作家的非凡特性',
        途径: this.PATHWAY_FULL,
        序列: '序列1',
        数量: quantity + 1,
        单位: '份',
      };
    }

    const used = separation.used + 1;
    separation.record[this.SEPARATION_COUNT] = used;
    return { ok: true, used, remaining: this.SEPARATION_LIMIT - used, quantity: list[key].数量 };
  },

  /**
   * 当前真正生效的玩家栏位。第二栏在序列1/0.X时保留但不返回；
   * 无效途径、重复途径、真实已有途径与找不到目标档条目的途径全部跳过。
   */
  selectionsForGate(mvuState, gate, slotValues = null) {
    const base = this.realSequence(mvuState);
    if (!gate.unlocked) return [];
    const known = new Set(this.pathwayNames());
    const owned = this.existingPathwaysOf(base);
    const used = new Set();
    const out = [];
    const values = Array.isArray(slotValues) ? slotValues : this.playerSlotValues(mvuState);
    values.slice(0, gate.slots).forEach((pathway, index) => {
      if (!pathway || !known.has(pathway) || used.has(pathway) || owned.has(pathway)) return;
      const sequence = this.canonicalSequenceOf(pathway, gate.projectionRank);
      if (!sequence) return;
      used.add(pathway);
      out.push({ slot: index + 1, pathway, sequence, rank: gate.projectionRank });
    });
    return out;
  },

  activePlayerSelections(mvuState, snapshot = null) {
    if (snapshot && Array.isArray(snapshot.imaginedSelections)) return snapshot.imaginedSelections;
    if (window.PlayerProjectionResolver) {
      return window.PlayerProjectionResolver.resolve(mvuState).imaginedSelections;
    }
    return this.selectionsForGate(mvuState, this.resolveOwnerSequence(this.realSequence(mvuState)));
  },

  effectivePlayerSequence(mvuState) {
    if (window.PlayerProjectionResolver) {
      return window.PlayerProjectionResolver.resolve(mvuState).effectiveSequence;
    }
    const base = this.realSequence(mvuState);
    return this.mergeSequenceFragments(base, this.activePlayerSelections(mvuState).map(x => x.sequence)) || base;
  },

  /** 重建可撤销的玩家空想能力分组，并同步一条 AI 可见的玩法说明。 */
  syncPlayerProjections(mvuState, abilityLocked, snapshot = null) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return false;
    let record = sd.序列能力列表;
    if (!record || typeof record !== 'object' || Array.isArray(record)) record = {};

    Object.keys(record).forEach(key => {
      if (String(key).startsWith(this.ABILITY_PREFIX)) delete record[key];
    });

    const permanentNames = new Set();
    Object.keys(record).forEach(key => {
      // 放牧分组在空想之后重建。这里忽略旧放牧分组，保证固定去重顺序：
      // 玩家真实能力 → 观众空想 → 放牧灵魂 → 阅读者秘术 → 神秘再现。
      if (window.GrazingCore && String(key).startsWith(window.GrazingCore.ABILITY_PREFIX)) return;
      if (window.ReaderMysticCore && key === window.ReaderMysticCore.ABILITY_GROUP) return;
      if (window.MysteryReenactmentCore && key === window.MysteryReenactmentCore.ABILITY_GROUP) return;
      const list = record[key];
      if (!Array.isArray(list)) return;
      list.forEach(ab => {
        const name = String((ab && (ab.名称 || ab.name)) || '').trim();
        if (name) permanentNames.add(name);
      });
    });

    const seen = new Set(permanentNames);
    const active = this.activePlayerSelections(mvuState, snapshot);
    active.forEach(sel => {
      let pool = {};
      try { pool = fetchAvailableAbilities(sel.sequence, !!abilityLocked) || {}; }
      catch (e) { console.warn(`[空想] 读取${sel.pathway}能力失败`, e); }
      Object.entries(pool).forEach(([seqName, abilities]) => {
        if (!Array.isArray(abilities)) return;
        const rows = [];
        abilities.forEach(ab => {
          const name = String((ab && (ab.名称 || ab.name)) || '').trim();
          if (!name || seen.has(name)) return;
          seen.add(name);
          const copy = this.clone(ab);
          copy['$空想来源'] = sel.pathway;
          rows.push(copy);
        });
        if (rows.length) record[`${this.ABILITY_PREFIX}${sel.pathway}:${seqName}`] = rows;
      });
    });

    sd.序列能力列表 = record;
    this.syncPlayerDisplayAbility(mvuState, snapshot);
    return true;
  },

  syncPlayerDisplayAbility(mvuState, snapshot = null) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return;
    let list = sd.辅助能力列表;
    const active = this.activePlayerSelections(mvuState, snapshot);
    if (!active.length) {
      if (list && typeof list === 'object' && !Array.isArray(list)) delete list[this.DISPLAY_KEY];
      return;
    }
    if (!list || typeof list !== 'object' || Array.isArray(list)) {
      list = sd.辅助能力列表 = { $meta: { extensible: true } };
    } else if (!list.$meta) {
      list.$meta = { extensible: true };
    }
    const real = this.realSequence(mvuState) || '未知';
    const parts = active.map(x => `${x.pathway}（${x.sequence}）`).join('、');
    list[this.DISPLAY_KEY] = {
      名称: '空想',
      序列: `序列${active[0].rank}`,
      描述: `当前空想${parts}并享受相应能力与机制；真实当前序列仍为${real}，并未实际改换途径。`,
      isEquipped: false,
    };
  },

  buildPlayerBattleProjection(mvuState, characterData) {
    const locked = localStorage.getItem('ST_LoM_AbilityLock') === 'true';
    const snapshot = window.PlayerProjectionResolver
      ? window.PlayerProjectionResolver.resolve(mvuState)
      : null;
    if (window.PlayerProjectionSync) window.PlayerProjectionSync.syncAll(mvuState, locked, snapshot);
    else this.syncPlayerProjections(mvuState, locked, snapshot);
    const base = (snapshot && snapshot.realSequence)
      || this.realSequence(mvuState)
      || String((characterData && characterData.当前序列) || '普通人');
    const active = this.activePlayerSelections(mvuState, snapshot);
    const grazingBaseSequence = this.mergeSequenceFragments(base, active.map(x => x.sequence)) || base;
    return {
      data: characterData,
      baseSequence: base,
      grazingBaseSequence,
      grazingGrantSequence: (snapshot && snapshot.grazingGrantSequence) || grazingBaseSequence,
      effectiveSequence: (snapshot && snapshot.effectiveSequence) || grazingBaseSequence,
      imaginedPathways: active.map(x => ({ pathway: x.pathway, sequence: x.sequence, rank: x.rank })),
      grazingActiveSouls: snapshot ? snapshot.grazedSelections
        : (window.GrazingCore ? window.GrazingCore.activeSelections(mvuState) : []),
    };
  },

  /** NPC 随机池：排除观众、真实已有途径、重复项与缺失目标档条目的途径。 */
  rollNpcPathways(sequenceString, gate) {
    const owned = this.existingPathwaysOf(sequenceString);
    const candidates = this.pathwayNames()
      .filter(pathway => pathway !== this.PATHWAY_FULL && !owned.has(pathway))
      .map(pathway => ({
        pathway,
        sequence: this.canonicalSequenceOf(pathway, gate.projectionRank),
        rank: gate.projectionRank,
      }))
      .filter(x => !!x.sequence);

    // Fisher-Yates；只在 Hero 构造前跑一次，结果随后进入本场缓存。
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }
    return candidates.slice(0, Math.min(gate.slots, candidates.length));
  },

  npcImaginedAbilities(selections) {
    const out = [];
    const seen = new Set();
    (selections || []).forEach(sel => {
      let pool = {};
      try { pool = fetchAvailableAbilities(sel.sequence, false) || {}; }
      catch (e) { console.warn(`[空想] NPC读取${sel.pathway}能力失败`, e); }
      if (!pool || Object.keys(pool).length === 0) return;
      let picked = [];
      try { picked = generateNpcAbilities(pool, sel.rank) || []; }
      catch (e) { console.warn(`[空想] NPC抽取${sel.pathway}能力失败`, e); }
      picked.forEach(ab => {
        const name = String((ab && (ab.名称 || ab.name)) || '').trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        out.push(this.clone(ab));
      });
    });
    return out;
  },

  buildNpcBattleProjection(characterData, characterName, cache) {
    const base = String((characterData && characterData.当前序列) || '').trim();
    const gate = this.resolveOwnerSequence(base);
    if (!gate.unlocked) return null;

    const key = String(characterName || (characterData && characterData.名称) || '未命名NPC');
    let roll = cache && cache.get(key);
    if (!roll) {
      const selections = this.rollNpcPathways(base, gate);
      roll = {
        baseSequence: base,
        projectionRank: gate.projectionRank,
        selections,
        abilities: this.npcImaginedAbilities(selections),
      };
      if (cache) cache.set(key, roll);
    }

    const data = this.clone(characterData) || {};
    const merged = [];
    const names = new Set();
    const append = (ab) => {
      if (!ab || typeof ab !== 'object') return;
      const name = String(ab.名称 || ab.name || '').trim();
      if (!name || names.has(name)) return;
      names.add(name);
      merged.push(this.clone(ab));
    };
    (Array.isArray(data.能力清单) ? data.能力清单 : []).forEach(append);
    (Array.isArray(roll.abilities) ? roll.abilities : []).forEach(append);
    data.能力清单 = merged;

    return {
      data,
      baseSequence: base || '普通人',
      effectiveSequence: this.mergeSequenceFragments(base, roll.selections.map(x => x.sequence)) || base || '普通人',
      imaginedPathways: roll.selections.map(x => ({ pathway: x.pathway, sequence: x.sequence, rank: x.rank })),
    };
  },
};
const GrazingCore = {
  ID: 'supplicant-grazing',
  PATHWAY: '秘祈人',
  PATHWAY_FULL: '秘祈人途径',
  TITLE: '上帝',
  GATE: 5,
  PLAY_KEY: '放牧玩法',
  SOULS_KEY: '灵魂列表',
  ACTIVE_KEY: '激活灵魂',
  DORMANT_KEY: '休眠灵魂',
  ABILITY_PREFIX: '#放牧:',
  DISPLAY_KEY: '#放牧',
  STAT_KEYS: ['活力', '敏捷', '灵性', '理智', '人性', '运气'],

  clone(v) {
    try {
      if (typeof _ !== 'undefined' && _ && typeof _.cloneDeep === 'function') return _.cloneDeep(v);
      return JSON.parse(JSON.stringify(v));
    } catch (_) { return v; }
  },

  realSequence(mvuState) {
    return String((mvuState && mvuState.stat_data && mvuState.stat_data.当前序列) || '').trim();
  },

  strongestRank(sequenceString) {
    const source = String(sequenceString || '').trim();
    if (!source) return null;
    const validMundane = text => /普通人|野兽|动物|凡人/.test(String(text || ''));
    let best = null;
    LifeSaveManager.splitSequenceFragments(source).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      const rank = r ? Number(r.rank) : parseSequenceRank(frag);
      if (!Number.isFinite(rank) || (rank === 10 && !validMundane(frag))) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) {
      const rank = parseSequenceRank(source);
      if (Number.isFinite(rank) && (rank !== 10 || validMundane(source))) best = rank;
    }
    return best;
  },

  resolveOwnerSequence(sequenceString) {
    const s = String(sequenceString || '').trim();
    if (!s) return { inPathway: false, unlocked: false, rank: null, viaTitle: false };
    if (s.includes(this.TITLE)) return { inPathway: true, unlocked: true, rank: -2, viaTitle: true };
    let best = null;
    LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      if (!r || r.pathwayShort !== this.PATHWAY) return;
      const rank = Number(r.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, unlocked: false, rank: null, viaTitle: false };
    return { inPathway: true, unlocked: best <= this.GATE, rank: best, viaTitle: false };
  },

  capacityOf(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r) || r > 5) return 0;
    if (r <= 1) return 22;
    if (r <= 2) return 18;
    if (r <= 3) return 13;
    if (r <= 4) return 9;
    return 7;
  },

  activeCapOf(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r) || r > 5) return 0;
    if (r <= 0) return 5;
    if (r <= 3) return 3;
    return 1;
  },

  // 战斗侧只在运行期通过 window 访问，提供语义化别名，避免写入任何第二份状态。
  resolve(sequenceString) { return this.resolveOwnerSequence(sequenceString); },
  activeCapacity(sequenceString) { return this.activeCapOf(this.resolveOwnerSequence(sequenceString).rank); },
  soulRecords(mvuState) { return this.soulsOfState(mvuState); },
  saveActive(mvuState, names, snapshot = null) { return this.saveEffectiveActiveNames(mvuState, names, snapshot); },

  canGraze(ownerRank, targetSequence) {
    const targetRank = this.strongestRank(targetSequence);
    return Number.isFinite(Number(ownerRank)) && Number.isFinite(targetRank)
      && targetRank >= Number(ownerRank);
  },

  playOfState(mvuState, create) {
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
    let play = pathway[this.PLAY_KEY];
    if (!play || typeof play !== 'object' || Array.isArray(play)) {
      if (!create) return null;
      play = pathway[this.PLAY_KEY] = { 版本: 2, [this.SOULS_KEY]: {}, [this.ACTIVE_KEY]: [], [this.DORMANT_KEY]: [] };
    }
    if (!play[this.SOULS_KEY] || typeof play[this.SOULS_KEY] !== 'object' || Array.isArray(play[this.SOULS_KEY])) {
      if (!create) return null;
      play[this.SOULS_KEY] = {};
    }
    if (!Array.isArray(play[this.ACTIVE_KEY])) {
      if (!create) return null;
      play[this.ACTIVE_KEY] = [];
    }
    if (!Array.isArray(play[this.DORMANT_KEY])) {
      if (create) play[this.DORMANT_KEY] = [];
    }
    return play;
  },

  soulsOfState(mvuState) {
    const play = this.playOfState(mvuState, false);
    return (play && play[this.SOULS_KEY]) || {};
  },

  recordsOfState(mvuState) {
    const souls = this.soulsOfState(mvuState);
    return Object.keys(souls)
      .filter(k => k !== '$meta' && souls[k] && typeof souls[k] === 'object')
      .map(name => ({ name, data: souls[name] }));
  },

  storedActiveNames(mvuState) {
    const play = this.playOfState(mvuState, false);
    const souls = this.soulsOfState(mvuState);
    const seen = new Set();
    return ((play && play[this.ACTIVE_KEY]) || []).filter(name => {
      name = String(name || '').trim();
      if (!name || seen.has(name) || !souls[name]) return false;
      seen.add(name);
      return true;
    });
  },

  storedDormantNames(mvuState) {
    const play = this.playOfState(mvuState, false);
    const souls = this.soulsOfState(mvuState);
    const active = new Set(this.storedActiveNames(mvuState));
    const seen = new Set();
    return ((play && play[this.DORMANT_KEY]) || []).filter(name => {
      name = String(name || '').trim();
      if (!name || active.has(name) || seen.has(name) || !souls[name]) return false;
      seen.add(name);
      return true;
    });
  },

  activeNamesForGate(mvuState, gate, namesOverride = null) {
    if (!gate || !gate.unlocked) return [];
    const cap = this.activeCapOf(gate.rank);
    const source = Array.isArray(namesOverride) ? namesOverride : this.storedActiveNames(mvuState);
    const souls = this.soulsOfState(mvuState);
    const seen = new Set();
    const out = [];
    source.forEach(raw => {
      const name = String(raw || '').trim();
      if (!name || seen.has(name) || !souls[name] || out.length >= cap) return;
      seen.add(name);
      out.push(name);
    });
    return out;
  },

  activeNames(mvuState, snapshot = null) {
    if (snapshot && Array.isArray(snapshot.grazedSelections)) {
      return snapshot.grazedSelections.map(x => x.name);
    }
    if (window.PlayerProjectionResolver) {
      return window.PlayerProjectionResolver.resolve(mvuState).grazedSelections.map(x => x.name);
    }
    return this.activeNamesForGate(mvuState, this.resolveOwnerSequence(this.realSequence(mvuState)));
  },

  saveStoredActiveNames(mvuState, activeNames, dormantNames = []) {
    const play = this.playOfState(mvuState, true);
    if (!play) return { ok: false, reason: '存档尚未就绪。' };
    const souls = play[this.SOULS_KEY];
    const out = [];
    const seen = new Set();
    for (const raw of (activeNames || [])) {
      const name = String(raw || '').trim();
      if (!name || seen.has(name)) continue;
      if (!souls[name]) return { ok: false, reason: '激活列表中存在已经失效的灵魂，请刷新后重试。' };
      seen.add(name);
      out.push(name);
    }
    const dormant = [];
    for (const raw of (dormantNames || [])) {
      const name = String(raw || '').trim();
      if (!name || seen.has(name)) continue;
      if (!souls[name]) return { ok: false, reason: '休眠列表中存在已经失效的灵魂，请刷新后重试。' };
      seen.add(name);
      dormant.push(name);
    }
    play[this.ACTIVE_KEY] = out;
    play[this.DORMANT_KEY] = dormant;
    play.版本 = Math.max(2, Number(play.版本) || 0);
    return { ok: true, names: out, dormant };
  },

  saveActiveNames(mvuState, names, snapshot = null) {
    const gate = snapshot && snapshot.grazingGate
      ? snapshot.grazingGate
      : (window.PlayerProjectionResolver
        ? window.PlayerProjectionResolver.resolve(mvuState).grazingGate
        : this.resolveOwnerSequence(this.realSequence(mvuState)));
    if (!gate.unlocked) return { ok: false, reason: '当前不具备放牧资格。' };
    const all = Array.from(new Set((names || []).map(x => String(x || '').trim()).filter(Boolean)));
    const cap = this.activeCapOf(gate.rank);
    return this.saveStoredActiveNames(mvuState, all.slice(0, cap), all.slice(cap));
  },

  saveEffectiveActiveNames(mvuState, names, snapshot = null) {
    const resolved = snapshot || (window.PlayerProjectionResolver
      ? window.PlayerProjectionResolver.resolve(mvuState)
      : null);
    const gate = resolved ? resolved.grazingGate : this.resolveOwnerSequence(this.realSequence(mvuState));
    if (!gate.unlocked) return { ok: false, reason: '当前不具备放牧资格。' };
    const effective = this.activeNamesForGate(mvuState, gate, names);
    const requested = Array.from(new Set((names || []).map(x => String(x || '').trim()).filter(Boolean)));
    if (requested.length > this.activeCapOf(gate.rank)) {
      return { ok: false, reason: `激活数量不能超过当前上限 ${this.activeCapOf(gate.rank)} 个。` };
    }
    if (effective.length !== requested.length) {
      return { ok: false, reason: '激活列表中存在已经失效的灵魂，请刷新后重试。' };
    }
    const oldEffective = new Set(resolved ? resolved.grazedSelections.map(x => x.name) : this.activeNames(mvuState));
    const overflow = this.storedActiveNames(mvuState).filter(name => !oldEffective.has(name));
    const dormant = overflow.concat(this.storedDormantNames(mvuState))
      .filter((name, index, all) => !effective.includes(name) && all.indexOf(name) === index);
    const saved = this.saveStoredActiveNames(mvuState, effective, dormant);
    return saved.ok ? { ...saved, effective, dormant } : saved;
  },

  selectionsForGate(mvuState, gate, namesOverride = null) {
    const souls = this.soulsOfState(mvuState);
    return this.activeNamesForGate(mvuState, gate, namesOverride).map(name => ({
      name,
      sequence: String((souls[name] && souls[name].当前序列) || '').trim(),
      rank: this.strongestRank(String((souls[name] && souls[name].当前序列) || '')),
      data: souls[name],
    })).filter(x => !!x.sequence);
  },

  activeSelections(mvuState, snapshot = null) {
    if (snapshot && Array.isArray(snapshot.grazedSelections)) return snapshot.grazedSelections;
    if (window.PlayerProjectionResolver) {
      return window.PlayerProjectionResolver.resolve(mvuState).grazedSelections;
    }
    return this.selectionsForGate(mvuState, this.resolveOwnerSequence(this.realSequence(mvuState)));
  },

  effectiveSequence(mvuState, baseSequence, snapshot = null) {
    const base = String(baseSequence || this.realSequence(mvuState) || '').trim();
    const additions = this.activeSelections(mvuState, snapshot).map(x => x.sequence);
    return AudienceImaginationCore.mergeSequenceFragments(base, additions) || base;
  },

  addSoul(mvuState, name, npc, source, snapshot = null) {
    const gate = snapshot && snapshot.grazingGate
      ? snapshot.grazingGate
      : (window.PlayerProjectionResolver
        ? window.PlayerProjectionResolver.resolve(mvuState).grazingGate
        : this.resolveOwnerSequence(this.realSequence(mvuState)));
    if (!gate.unlocked) return { ok: false, reason: '当前不具备放牧资格。' };
    const play = this.playOfState(mvuState, true);
    const souls = play && play[this.SOULS_KEY];
    if (!souls) return { ok: false, reason: '存档尚未就绪。' };
    if (this.recordsOfState(mvuState).length >= this.capacityOf(gate.rank)) {
      return { ok: false, reason: `放牧灵魂数量已达上限 ${this.capacityOf(gate.rank)} 个。` };
    }
    if (souls[name]) return { ok: false, reason: `你已经放牧过“${name}”的灵魂。` };
    const sequence = String((npc && npc.当前序列) || '').trim();
    if (!npc || !this.STAT_KEYS.every(k => typeof npc[k] === 'number' && Number.isFinite(npc[k]))) {
      return { ok: false, reason: '找不到目标的NPC客观记录，无法复制灵魂数据。' };
    }
    if (!Number.isFinite(this.strongestRank(sequence))) return { ok: false, reason: '目标的当前序列无法识别，不能进行放牧认证。' };
    if (!this.canGraze(gate.rank, sequence)) return { ok: false, reason: '目标位阶高于你，无法放牧其灵魂。' };
    const rec = this.clone(npc) || {};
    rec.名称 = rec.名称 || name;
    rec['$放牧来源'] = String(source || '人物认证');
    rec['$放牧时间'] = new Date().toISOString();
    souls[name] = rec;
    return { ok: true, record: rec };
  },

  removeSoul(mvuState, name) {
    const play = this.playOfState(mvuState, false);
    const souls = play && play[this.SOULS_KEY];
    if (!souls || !souls[name]) return false;
    delete souls[name];
    play[this.ACTIVE_KEY] = ((play[this.ACTIVE_KEY]) || []).filter(x => x !== name);
    play[this.DORMANT_KEY] = ((play[this.DORMANT_KEY]) || []).filter(x => x !== name);
    const locked = localStorage.getItem('ST_LoM_AbilityLock') === 'true';
    if (window.PlayerProjectionSync) window.PlayerProjectionSync.syncAll(mvuState, locked);
    else this.syncPlayerProjection(mvuState, locked);
    return true;
  },

  syncPlayerProjection(mvuState, abilityLocked, snapshot = null) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return false;
    let record = sd.序列能力列表;
    if (!record || typeof record !== 'object' || Array.isArray(record)) record = {};
    Object.keys(record).forEach(key => {
      if (String(key).startsWith(this.ABILITY_PREFIX)) delete record[key];
    });
    const seen = new Set();
    Object.entries(record).forEach(([key, list]) => {
      if (window.ReaderMysticCore && key === window.ReaderMysticCore.ABILITY_GROUP) return;
      if (window.MysteryReenactmentCore && key === window.MysteryReenactmentCore.ABILITY_GROUP) return;
      if (!Array.isArray(list)) return;
      list.forEach(ab => {
        const name = String((ab && (ab.名称 || ab.name)) || '').trim();
        if (name) seen.add(name);
      });
    });
    const active = this.activeSelections(mvuState, snapshot);
    active.forEach(sel => {
      let pool = {};
      try { pool = fetchAvailableAbilities(sel.sequence, !!abilityLocked) || {}; }
      catch (e) { console.warn(`[放牧] 读取${sel.name}能力失败`, e); }
      Object.entries(pool).forEach(([seqName, abilities]) => {
        if (!Array.isArray(abilities)) return;
        const rows = [];
        abilities.forEach(ab => {
          const name = String((ab && (ab.名称 || ab.name)) || '').trim();
          if (!name || seen.has(name)) return;
          seen.add(name);
          const copy = this.clone(ab);
          copy['$放牧来源'] = sel.name;
          rows.push(copy);
        });
        if (rows.length) record[`${this.ABILITY_PREFIX}${sel.name}:${seqName}`] = rows;
      });
    });
    sd.序列能力列表 = record;
    this.syncDisplayAbility(mvuState, snapshot);
    return true;
  },

  syncDisplayAbility(mvuState, snapshot = null) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return;
    const all = this.recordsOfState(mvuState);
    const active = this.activeSelections(mvuState, snapshot);
    let list = sd.辅助能力列表;
    if (!all.length) {
      if (list && typeof list === 'object' && !Array.isArray(list)) delete list[this.DISPLAY_KEY];
      return;
    }
    if (!list || typeof list !== 'object' || Array.isArray(list)) list = sd.辅助能力列表 = { $meta: { extensible: true } };
    else if (!list.$meta) list.$meta = { extensible: true };
    const desc = active.length
      ? active.map(x => `${x.name}（${x.sequence}）`).join('、')
      : '无';
    list[this.DISPLAY_KEY] = {
      名称: '放牧',
      序列: this.realSequence(mvuState) || '未知',
      描述: `当前共放牧${all.length}个灵魂，已激活${active.length}个：${desc}。激活灵魂提供其对应序列范围内的能力与途径机制，但不会改变玩家的真实序列与基础属性。`,
      isEquipped: false,
    };
  },
};
const PlayerProjectionResolver = {
  resolve(mvuState, options = {}) {
    const imaginationSlots = Array.isArray(options.imaginationSlots) ? options.imaginationSlots : null;
    const grazingActiveNames = Array.isArray(options.grazingActiveNames) ? options.grazingActiveNames : null;
    const realSequence = AudienceImaginationCore.realSequence(mvuState);
    const directImaginationGate = AudienceImaginationCore.resolveOwnerSequence(realSequence);
    const directGrazingGate = GrazingCore.resolveOwnerSequence(realSequence);
    const directImaginedSelections = AudienceImaginationCore.selectionsForGate(mvuState, directImaginationGate, imaginationSlots);
    const directGrazedSelections = GrazingCore.selectionsForGate(mvuState, directGrazingGate, grazingActiveNames);

    const audienceGrantSequence = AudienceImaginationCore.mergeStrongestSequenceFragments(
      realSequence,
      directGrazedSelections.map(x => x.sequence),
    ) || realSequence;
    const grazingGrantSequence = AudienceImaginationCore.mergeStrongestSequenceFragments(
      realSequence,
      directImaginedSelections.map(x => x.sequence),
    ) || realSequence;

    const imaginationGate = AudienceImaginationCore.resolveOwnerSequence(audienceGrantSequence);
    const grazingGate = GrazingCore.resolveOwnerSequence(grazingGrantSequence);
    const imaginedSelections = AudienceImaginationCore.selectionsForGate(mvuState, imaginationGate, imaginationSlots);
    const grazedSelections = GrazingCore.selectionsForGate(mvuState, grazingGate, grazingActiveNames);
    const effectiveSequence = AudienceImaginationCore.mergeStrongestSequenceFragments(
      realSequence,
      imaginedSelections.concat(grazedSelections).map(x => x.sequence),
    ) || realSequence;

    return {
      realSequence,
      directImaginationGate,
      directGrazingGate,
      directImaginedSelections,
      directGrazedSelections,
      audienceGrantSequence,
      grazingGrantSequence,
      imaginationGate,
      grazingGate,
      imaginedSelections,
      grazedSelections,
      effectiveSequence,
    };
  },
};
const PlayerProjectionSync = {
  syncAll(mvuState, abilityLocked, snapshot = null) {
    if (!mvuState || !mvuState.stat_data) return false;
    const resolved = snapshot || PlayerProjectionResolver.resolve(mvuState);
    AudienceImaginationCore.syncPlayerProjections(mvuState, abilityLocked, resolved);
    GrazingCore.syncPlayerProjection(mvuState, abilityLocked, resolved);
    if (window.ReaderMysticCore && typeof window.ReaderMysticCore.syncPlayerProjection === 'function') {
      window.ReaderMysticCore.syncPlayerProjection(mvuState, resolved);
    }
    if (window.MysteryReenactmentCore && typeof window.MysteryReenactmentCore.syncPlayerProjection === 'function') {
      window.MysteryReenactmentCore.syncPlayerProjection(mvuState, resolved);
    }
    return resolved;
  },
};
const AudienceImaginationMode = {
  id: 'spectator-imagination',
  途径: '观众',
  途径全名: '观众途径',
  名称: '空想',
  图标: '🖋️',
  GATE: 1,
  TITLE: '上帝',

  resolve(sequenceString) {
    return AudienceImaginationCore.resolveOwnerSequence(sequenceString);
  },

  scope() {
    return document.querySelector(`#ppw-body [data-ppw-mode="${this.id}"]`);
  },

  valuesFromDom(win) {
    const root = this.scope();
    if (!root) return AudienceImaginationCore.playerSlotValues(win.game && win.game.currentMvuState);
    return [1, 2].map(i => String((root.querySelector(`[data-imagination-slot="${i}"]`) || {}).value || '').trim());
  },

  validate(values, gate) {
    const known = new Set(AudienceImaginationCore.pathwayNames());
    const nonEmpty = (values || []).map(x => String(x || '').trim()).filter(Boolean);
    if (new Set(nonEmpty).size !== nonEmpty.length) return '两个空想栏位不能选择同一途径。';
    for (let i = 0; i < nonEmpty.length; i++) {
      if (!known.has(nonEmpty[i])) return `途径“${nonEmpty[i]}”不在当前世界书中。`;
    }
    for (let i = 0; i < Math.min(gate.slots || 0, values.length); i++) {
      const pathway = String(values[i] || '').trim();
      if (pathway && !AudienceImaginationCore.canonicalSequenceOf(pathway, gate.projectionRank)) {
        return `途径“${pathway}”缺少序列${gate.projectionRank}的世界书条目。`;
      }
    }
    return '';
  },

  previewFor(win, values, gate) {
    const state = win.game && win.game.currentMvuState;
    if (!state) return win.actualPlayerSequence() || '未知';
    return PlayerProjectionResolver.resolve(state, { imaginationSlots: values }).effectiveSequence
      || win.actualPlayerSequence() || '未知';
  },

  slotHtml(win, index, value, gate) {
    const enabled = index <= gate.slots;
    const options = ['<option value="">-- 清空 --</option>'].concat(
      AudienceImaginationCore.pathwayNames().map(pathway => {
        const selected = pathway === value ? ' selected' : '';
        const target = AudienceImaginationCore.canonicalSequenceOf(pathway, gate.projectionRank);
        const unavailable = enabled && !target ? ' disabled' : '';
        return `<option value="${win.esc(pathway)}"${selected}${unavailable}>${win.esc(pathway)}${enabled && !target ? '（缺少目标序列）' : ''}</option>`;
      })
    ).join('');
    const target = value ? AudienceImaginationCore.canonicalSequenceOf(value, gate.projectionRank) : '';
    const dormant = !enabled
      ? `<p class="ppw-hint">序列0时解锁；已保存的选择会保留，但当前不生效。</p>`
      : `<p class="ppw-hint">等效片段：${win.esc(target || (value ? '当前档位无有效世界书条目' : '未选择'))}</p>`;
    return `<div class="ppw-card" style="border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:8px;">
  <label class="ppw-field">空想栏位${index}
    <select data-imagination-slot="${index}" data-ppw-change="imagination-slot"${enabled ? '' : ' disabled'} style="width:100%;box-sizing:border-box;background:var(--bg-base,#111);border:1px solid var(--color-border-dark,#444);color:var(--text-main,#eee);border-radius:6px;padding:6px 8px;">${options}</select>
  </label>
  ${dormant}
  <div><button type="button" class="ppw-btn ghost" data-ppw="clear-slot" data-arg="${index}">清空栏位${index}</button></div>
</div>`;
  },

  separationHtml(win, gate) {
    const state = win.game && win.game.currentMvuState;
    const used = AudienceImaginationCore.separationUsedCount(state);
    const remaining = Math.max(0, AudienceImaginationCore.SEPARATION_LIMIT - used);
    const unlocked = !!(gate && gate.unlocked && gate.projectionRank === 0);
    if (!unlocked) {
      return `<div class="ppw-card">
  <h4 style="margin:0 0 6px;">分离序列1特性</h4>
  <p class="ppw-hint">观众途径序列0时解锁；0.X仍按序列1处理，不能使用此功能。</p>
</div>`;
    }
    const exhausted = remaining <= 0;
    return `<div class="ppw-card">
  <h4 style="margin:0 0 6px;">分离序列1特性</h4>
  <p class="ppw-hint">从自身分离一份“作家特性”，写入物品栏的杂物分类。每个存档永久最多成功两次，删除物品不会返还次数。</p>
  <p class="ppw-hint">已分离：${used}/2；剩余：${remaining}次。</p>
  <div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="separate-writer-trait"${exhausted ? ' disabled' : ''}>${exhausted ? '分离次数已用尽' : '分离序列1特性'}</button></div>
</div>`;
  },

  render(win, gate) {
    const actual = win.actualPlayerSequence();
    if (!gate.unlocked) return `<p class="ppw-hint">该玩法在观众途径序列1解锁；“上帝”会自动解锁。</p>`;
    const values = AudienceImaginationCore.playerSlotValues(win.game && win.game.currentMvuState);
    const preview = this.previewFor(win, values, gate);
    return `<div class="ppw-card">
  <p class="ppw-hint">真实序列：${win.esc(actual || '未知')}</p>
  <p class="ppw-hint">空想等效：序列${gate.projectionRank}；当前有效栏位：${gate.slots}。0.X 始终按序列1与一个栏位处理。</p>
  ${this.slotHtml(win, 1, values[0], gate)}
  ${this.slotHtml(win, 2, values[1], gate)}
  <p class="ppw-hint">选择真实已经拥有的途径（包括观众途径本身）不会重复获得能力或机制。</p>
  <p class="ppw-hint">运行期有效序列预览：<span data-imagination-preview>${win.esc(preview)}</span></p>
  <div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="save">保存空想栏位</button></div>
</div>
${this.separationHtml(win, gate)}`;
  },

  onChange(win, kind) {
    if (kind !== 'imagination-slot') return;
    const state = win.game && win.game.currentMvuState;
    const gate = PlayerProjectionResolver.resolve(state).imaginationGate;
    const root = this.scope();
    const preview = root && root.querySelector('[data-imagination-preview]');
    if (preview) preview.textContent = this.previewFor(win, this.valuesFromDom(win), gate);
  },

  async commit(win, values) {
    const state = win.game && win.game.currentMvuState;
    const gate = PlayerProjectionResolver.resolve(state).imaginationGate;
    if (!state || !gate.unlocked) { win.msg('当前不具备空想资格。'); return; }
    const error = this.validate(values, gate);
    if (error) { win.msg(error, 4000); return; }
    AudienceImaginationCore.savePlayerSlots(state, values);
    const locked = localStorage.getItem('ST_LoM_AbilityLock') === 'true';
    PlayerProjectionSync.syncAll(state, locked);
    win.persist();
    await win.persistZero();
    win.msg('空想栏位已保存，能力与途径机制已同步。');
    win.render();
    const abilitiesModal = document.querySelector('#abilities-modal');
    if (abilitiesModal && abilitiesModal.style.display !== 'none' && !abilitiesModal.classList.contains('hidden')) {
      win.game.showAbilities();
    }
  },

  async separateWriterTrait(win) {
    const state = win.game && win.game.currentMvuState;
    const snapshot = state ? PlayerProjectionResolver.resolve(state) : null;
    if (!state || !AudienceImaginationCore.canSeparateWriterTrait(state, snapshot)) {
      win.msg('该功能需要当前有效的观众途径资格达到序列0，或拥有“上帝”资格。', 4000);
      return;
    }
    const used = AudienceImaginationCore.separationUsedCount(state);
    if (used >= AudienceImaginationCore.SEPARATION_LIMIT) {
      win.msg('分离序列1特性的两次永久额度均已使用。', 4000);
      win.render();
      return;
    }
    const remainingAfter = AudienceImaginationCore.SEPARATION_LIMIT - used - 1;
    const confirmed = window.confirm(
      `确定分离一份“作家特性”吗？\n\n本次会永久消耗一次分离额度，物品被删除后也不会返还。完成后还可分离 ${remainingAfter} 次。`
    );
    if (!confirmed) return;

    // 确认框可能停留很久；写入前重新读取资格和次数，防止并发点击越过两次上限。
    const latestSnapshot = PlayerProjectionResolver.resolve(state);
    const result = AudienceImaginationCore.separateWriterTrait(state, latestSnapshot);
    if (!result.ok) {
      win.msg(result.reason || '分离失败。', 4000);
      win.render();
      return;
    }
    win.persist();
    await win.persistZero();
    win.msg(`已获得“作家特性”×1；当前共 ${result.quantity} 份，永久额度已使用 ${result.used}/2。`, 4000);
    win.render();
  },

  async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    if (act === 'separate-writer-trait') return this.separateWriterTrait(win);
    if (act === 'save') return this.commit(win, this.valuesFromDom(win));
    if (act === 'clear-slot') {
      const values = this.valuesFromDom(win);
      const index = Math.max(1, Math.min(2, parseInt(arg, 10) || 1));
      values[index - 1] = '';
      return this.commit(win, values);
    }
  },
};
    window.AudienceImaginationCore = AudienceImaginationCore;
    window.GrazingCore = GrazingCore;
    window.PlayerProjectionResolver = PlayerProjectionResolver;
    window.PlayerProjectionSync = PlayerProjectionSync;
    window.ReaderMysticCore = { ABILITY_GROUP: '#秘术强化',
      syncPlayerProjection: data => modules['cryptLord.readerMystic']?.sync(data, deps.pool) };
    window.MysteryReenactmentCore = { ABILITY_GROUP: '#神秘再现',
      syncPlayerProjection: data => modules['cryptLord.mysteryReenactment']?.sync(data, deps.pool) };
    // Legacy records can omit activation arrays. Keep reads pure and reject reserved dictionary keys.
    const souls = GrazingCore.soulsOfState, forbidden = key =>
      !String(key).trim() || String(key).startsWith('$') || ['__proto__', 'constructor', 'prototype'].includes(key);
    GrazingCore.soulsOfState = data => Object.fromEntries(Object.entries(souls.call(GrazingCore, data))
      .filter(([key, row]) => !forbidden(key) && row && typeof row === 'object' && !Array.isArray(row)));
    const play = GrazingCore.playOfState;
    GrazingCore.playOfState = (data, create) => {
      const stored = data.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法;
      if (!create && stored && typeof stored === 'object' && !Array.isArray(stored) &&
        stored.灵魂列表 && !Array.isArray(stored.激活灵魂))
        return { ...stored, 激活灵魂: [], 休眠灵魂: Array.isArray(stored.休眠灵魂) ? stored.休眠灵魂 : [] };
      return play.call(GrazingCore, data, create);
    };
    return { core: AudienceImaginationCore, grazing: GrazingCore,
      resolver: PlayerProjectionResolver, sync: PlayerProjectionSync, mode: AudienceImaginationMode,
      abilities: fetchAvailableAbilities, npcAbilities: generateNpcAbilities };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
