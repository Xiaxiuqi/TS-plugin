(() => {
  'use strict';
  const KEY = 'cryptLord.battleLifeSave';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  // BEGIN ORIGINAL LIFE SAVE
const LIFE_SAVE_TABLE = {
    窥秘人: { strong: { from: 2, name: '自身信息化' }, weak: null },
    罪犯:   { strong: { from: 2, name: '鲜血主宰' }, weak: { from: 5, name: '欲望化身' } },
    药师:   { strong: { from: 4, name: '替身法术' }, weak: { from: 5, name: '月光化' } },
    学徒:   { strong: { from: 4, name: '空间隐藏' }, weak: { from: 5, name: '闪现' } },
    怪物:   { strong: { from: 2, name: '水银之躯' }, weak: { from: 5, name: '幸运' } },
    律师:   { strong: { from: 5, name: '混乱' }, weak: { from: 5, name: '扭曲' } },
    占卜家: { strong: { from: 7, name: '纸人替身' }, weak: { from: 7, name: '伤害转移' } },
    秘祈人: { strong: { from: 3, name: '阴影替身之术' }, weak: { from: 6, name: '血肉魔法' } },
    收尸人: { strong: { from: 3, name: '死亡化身' }, weak: null },
    歌颂者: { strong: { from: 2, name: '光形态' }, weak: null },
    耕种者: { strong: { from: 5, name: '地底潜行' }, weak: { from: 8, name: '紧急治疗' } },
    舞蹈家: { strong: { from: 4, name: '制造「环」' }, weak: null },
    入门者: { strong: { from: 2, name: '纯粹精神化' }, weak: null },
    掮客:   { strong: { from: 4, name: '神圣保护' }, weak: { from: 8, name: '阴影利用' } },
    吝啬鬼: { strong: { from: 5, name: '不灭之树' }, weak: null },
    恶棍:   { strong: { from: 4, name: '杨枝甘露治愈' }, weak: { from: 5, name: '树之自愈' } },
    萨满:   { strong: { from: 5, name: '维度穿梭' }, weak: null },
    猎人:   { strong: null, weak: { from: 6, name: '火焰瞬移' } },
    刺客:   { strong: { from: 7, name: '魔镜替身' }, weak: { from: 7, name: '镜子/魔杖替身' } },
    囚犯:   { strong: null, weak: { from: 5, name: '镜面闪现' } },
    战士:   { strong: null, weak: { from: 3, name: '水银化' } },
    偷盗者: { strong: { from: 4, name: '身体时之虫化' }, weak: null }
};
function originalManager(table, pathways, chosen) {
  const GameDBManager = { DB: { lifeSaveTable: table, godPathways: pathways } };
  let preference = chosen == null ? null : JSON.stringify(chosen);
  const localStorage = { getItem: () => preference };
  const PlayerSettingsWorldbook = {
    setLocalPreference(_key, value) { preference = value; },
    removeLocalPreference() { preference = null; },
  };
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
const getPureName = (nameStr) => {
  if (!nameStr) return "";
  let s = nameStr.replace(/[【】]/g, "").trim();
  // 先剥序列前缀；完整「旧日侍者」保留，避免被「旧日」前缀误伤成「侍者」
  s = s.replace(/^(序列\d+(\.\d+)?)[-—\s]?/, "").trim();
  if (containsOldDayAttendant(s)) return s;
  return s.replace(/^(旧日|支柱)[-—\s]?/, "").trim();
};
class LifeSaveManager {
    static STORAGE_KEY = 'battle-lifesave-weak-strategy';
    static STRONG_USES = 1;
    static WEAK_USES = 3;
    static STRONG_SHIELD_RATIO = 2;
    static WEAK_SHIELD_RATIO = 0.2;

    /** 默认弱保命策略（NPC 固定；玩家未自定义时使用） */
    static DEFAULT_WEAK_STRATEGY = {
        stages: [
            { damageOverMaxRatio: 0.3 },
            { hpBelowRatio: 0.5, damageOverMaxRatio: 0.1 }
        ]
    };

    /**
     * 多途径拆分：与 fetchAvailableAbilities 同源分隔符
     */
    static splitSequenceFragments(sequenceString) {
        const raw = String(sequenceString || '').trim();
        if (!raw || raw.includes('普通人')) return [];
        return raw.split(/[/|，,;；与和及以及\s\+&、]/).map(f => f.trim()).filter(Boolean);
    }

    /**
     * 片段 → { pathwayShort, rank }；查不到返回 null
     */
    static resolveFragment(frag) {
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

    /**
     * 解析保命资格（多途径按段合并；同类型技能名取片段从左到右第一个）
     */
    static resolveEligibility(sequenceString) {
        const result = {
            hasStrong: false,
            hasWeak: false,
            strongName: '',
            weakName: ''
        };
        const fragments = LifeSaveManager.splitSequenceFragments(sequenceString);
        if (fragments.length === 0) return result;

        for (const frag of fragments) {
            const resolved = LifeSaveManager.resolveFragment(frag);
            if (!resolved) continue;
            const table = (typeof GameDBManager !== 'undefined' && GameDBManager.DB
                && GameDBManager.DB.lifeSaveTable)
                ? GameDBManager.DB.lifeSaveTable
                : LIFE_SAVE_TABLE;
            const entry = table[resolved.pathwayShort];
            if (!entry) continue;

            if (entry.strong && Number(resolved.rank) <= Number(entry.strong.from)) {
                if (!result.hasStrong) {
                    result.hasStrong = true;
                    result.strongName = entry.strong.name;
                }
            }
            if (entry.weak && Number(resolved.rank) <= Number(entry.weak.from)) {
                if (!result.hasWeak) {
                    result.hasWeak = true;
                    result.weakName = entry.weak.name;
                }
            }
        }
        return result;
    }

    static cloneStrategy(strategy) {
        const src = strategy && Array.isArray(strategy.stages) ? strategy : LifeSaveManager.DEFAULT_WEAK_STRATEGY;
        return {
            stages: src.stages.map(s => ({
                damageOverMaxRatio: Number(s.damageOverMaxRatio),
                ...(s.hpBelowRatio !== undefined && s.hpBelowRatio !== null && s.hpBelowRatio !== ''
                    ? { hpBelowRatio: Number(s.hpBelowRatio) }
                    : {})
            })).filter(s => Number.isFinite(s.damageOverMaxRatio))
        };
    }

    /** 读取玩家自定义弱策略；无有效配置返回 null */
    static loadPlayerWeakStrategy() {
        try {
            const raw = localStorage.getItem(LifeSaveManager.STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.stages) || parsed.stages.length === 0) return null;
            const cloned = LifeSaveManager.cloneStrategy(parsed);
            return cloned.stages.length > 0 ? cloned : null;
        } catch (e) {
            console.warn('[LifeSaveManager] 读取弱保命策略失败', e);
            return null;
        }
    }

    static savePlayerWeakStrategy(strategy) {
        const cloned = LifeSaveManager.cloneStrategy(strategy);
        if (cloned.stages.length === 0) {
            PlayerSettingsWorldbook.removeLocalPreference(LifeSaveManager.STORAGE_KEY);
            return;
        }
        PlayerSettingsWorldbook.setLocalPreference(LifeSaveManager.STORAGE_KEY, JSON.stringify(cloned));
    }

    static clearPlayerWeakStrategy() {
        PlayerSettingsWorldbook.removeLocalPreference(LifeSaveManager.STORAGE_KEY);
    }

    /**
     * 开战时挂到 Hero 上
     * @param {Hero} hero
     */
    static initOnHero(hero) {
        if (!hero) return;
        const eligibility = LifeSaveManager.resolveEligibility(hero.sequenceString);
        const isPlayer = hero.dataSource === 'player';
        const custom = isPlayer ? LifeSaveManager.loadPlayerWeakStrategy() : null;
        const strategy = custom || LifeSaveManager.cloneStrategy(LifeSaveManager.DEFAULT_WEAK_STRATEGY);

        hero.lifeSave = {
            hasStrong: eligibility.hasStrong,
            hasWeak: eligibility.hasWeak,
            strongName: eligibility.strongName,
            weakName: eligibility.weakName,
            strongLeft: eligibility.hasStrong ? LifeSaveManager.STRONG_USES : 0,
            weakLeft: eligibility.hasWeak ? LifeSaveManager.WEAK_USES : 0,
            strongUsed: 0,
            weakUsed: 0,
            strategy,
            usingCustomStrategy: !!custom
        };
    }

    /** 投影切换后只更新资格；已消耗次数永不回补。 */
    static reconcileOnProjectionChange(hero) {
        if (!hero) return;
        if (!hero.lifeSave) {
            LifeSaveManager.initOnHero(hero);
            return;
        }
        const ls = hero.lifeSave;
        const eligibility = LifeSaveManager.resolveEligibility(hero.sequenceString);
        const strongUsed = Number.isFinite(Number(ls.strongUsed))
            ? Math.max(0, Number(ls.strongUsed))
            : Math.max(0, LifeSaveManager.STRONG_USES - (Number(ls.strongLeft) || 0));
        const weakUsed = Number.isFinite(Number(ls.weakUsed))
            ? Math.max(0, Number(ls.weakUsed))
            : Math.max(0, LifeSaveManager.WEAK_USES - (Number(ls.weakLeft) || 0));
        ls.strongUsed = strongUsed;
        ls.weakUsed = weakUsed;
        ls.hasStrong = eligibility.hasStrong;
        ls.hasWeak = eligibility.hasWeak;
        ls.strongName = eligibility.strongName;
        ls.weakName = eligibility.weakName;
        ls.strongLeft = eligibility.hasStrong ? Math.max(0, LifeSaveManager.STRONG_USES - strongUsed) : 0;
        ls.weakLeft = eligibility.hasWeak ? Math.max(0, LifeSaveManager.WEAK_USES - weakUsed) : 0;
    }

    /**
     * 弱策略是否命中（不含濒死兜底）
     */
    static strategyMatches(hero, incoming) {
        const maxHp = Number(hero.additionalStats?.活力) || 0;
        const curHp = Number(hero.additionalStats?.当前活力) || 0;
        if (maxHp <= 0) return false;

        const stages = hero.lifeSave?.strategy?.stages
            || LifeSaveManager.DEFAULT_WEAK_STRATEGY.stages;

        return stages.some(stage => {
            const dmgRatio = Number(stage.damageOverMaxRatio);
            if (!Number.isFinite(dmgRatio)) return false;
            if (!(incoming > maxHp * dmgRatio)) return false;
            if (stage.hpBelowRatio !== undefined && stage.hpBelowRatio !== null) {
                const hpRatio = Number(stage.hpBelowRatio);
                if (!Number.isFinite(hpRatio)) return false;
                if (!(curHp / maxHp < hpRatio)) return false;
            }
            return true;
        });
    }

    /**
     * 实伤占比 → 保命类战报结语（禁止「未中」）
     */
    static finalEffectVerdict(finalDamage, maxHp) {
        if (!maxHp || maxHp <= 0 || finalDamage <= 0) return '无效果';
        const percentage = (finalDamage / maxHp) * 100;
        if (percentage <= 1) return '几乎无效果';
        if (percentage <= 10) return '效果微弱';
        if (percentage <= 20) return '效果一般';
        if (percentage <= 30) return '效果良好';
        return '效果显著';
    }

    /**
     * 同步拦截：改写本击伤害。只应由技能攻击路径调用。
     * @returns {{ damage:number, triggered:boolean, skillName:string, absorbPct:number, incoming:number, absorbed:number }}
     */
    static tryAbsorb(hero, incoming) {
        const rawIncoming = Math.max(0, Number(incoming) || 0);
        const empty = {
            damage: rawIncoming,
            triggered: false,
            skillName: '',
            absorbPct: 0,
            incoming: rawIncoming,
            absorbed: 0
        };

        if (!hero || !hero.lifeSave || rawIncoming <= 0) return empty;

        const ls = hero.lifeSave;
        const maxHp = Number(hero.additionalStats?.活力) || 0;
        const curHp = Number(hero.additionalStats?.当前活力) || 0;
        // 已倒下的单位不再触发：否则 curHp=0 会让 wouldDie 恒真，白白吃掉唯一一次强保命
        if (maxHp <= 0 || curHp <= 0) return empty;

        const wouldDie = (curHp - rawIncoming) <= 0;
        let shield = 0;
        let skillName = '';

        if (wouldDie && ls.strongLeft > 0) {
            shield = maxHp * LifeSaveManager.STRONG_SHIELD_RATIO;
            skillName = ls.strongName || '保命';
            ls.strongLeft -= 1;
            ls.strongUsed = (Number(ls.strongUsed) || 0) + 1;
        } else if (ls.weakLeft > 0 && (wouldDie || LifeSaveManager.strategyMatches(hero, rawIncoming))) {
            // wouldDie 为不可改兜底；策略命中为默认/自定义
            shield = maxHp * LifeSaveManager.WEAK_SHIELD_RATIO;
            skillName = ls.weakName || '保命';
            ls.weakLeft -= 1;
            ls.weakUsed = (Number(ls.weakUsed) || 0) + 1;
        } else {
            return empty;
        }

        const absorbed = Math.min(shield, rawIncoming);
        const finalDamage = Math.max(0, rawIncoming - absorbed);
        // 只有真的一点没漏才配写 100%，否则「吸收 100% 还掉血」自相矛盾
        const absorbPct = finalDamage <= 0
            ? 100
            : Math.min(99, Math.floor((absorbed / rawIncoming) * 100));

        return {
            damage: finalDamage,
            triggered: true,
            skillName,
            absorbPct,
            incoming: rawIncoming,
            absorbed
        };
    }
}
  return LifeSaveManager;
}
// END ORIGINAL LIFE SAVE
  const defaults = Object.freeze(LIFE_SAVE_TABLE);
  const defaultStrategy = Object.freeze(originalManager().DEFAULT_WEAK_STRATEGY);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  function strategy(value) {
    if (!record(value) || !Array.isArray(value.stages) || !value.stages.length ||
      value.stages.length > 10) throw new Error('弱保命至少需要一条、至多十条阶段。');
    return { stages: value.stages.map(row => {
      const damageOverMaxRatio = Number(row?.damageOverMaxRatio);
      const hpBelowRatio = row?.hpBelowRatio == null || row.hpBelowRatio === ''
        ? null : Number(row.hpBelowRatio);
      if (!Number.isFinite(damageOverMaxRatio) || damageOverMaxRatio <= 0 || damageOverMaxRatio > 1 ||
        hpBelowRatio != null && (!Number.isFinite(hpBelowRatio) || hpBelowRatio <= 0 || hpBelowRatio > 1))
        throw new Error('伤害与活力阈值须在 0% 到 100% 之间。');
      return { damageOverMaxRatio, ...(hpBelowRatio == null ? {} : { hpBelowRatio }) };
    }) };
  }
  function storedStrategy(data) {
    try { return strategy(data?.cryptLord?.lifeSaveStrategy || defaultStrategy); }
    catch { return strategy(defaultStrategy); }
  }
  function saveStrategy(data, value) {
    const chosen = value == null ? null : strategy(value);
    const next = structuredClone(data || {});
    next.cryptLord = record(next.cryptLord) ? next.cryptLord : {};
    if (chosen) next.cryptLord.lifeSaveStrategy = chosen;
    else delete next.cryptLord.lifeSaveStrategy;
    if (next.cryptLord.personalBattle?.status === 'active' && next.cryptLord.personalBattle.player?.lifeSave) {
      next.cryptLord.personalBattle.player.lifeSave.strategy = chosen || strategy(defaultStrategy);
      next.cryptLord.personalBattle.player.lifeSave.usingCustomStrategy = chosen != null;
    }
    const team = next.cryptLord.teamBattle;
    if (team?.status === 'active') {
      const player = team.units?.find(actor => actor.source === 'player');
      if (player) {
        if (!player.lifeSave) initialize(player, player.sequence,
          player.pathway ?? next.stat_data?.当前途径 ?? next.stat_data?.途径 ??
            next.stat_data?.pathway ?? next.stat_data?.所属途径,
          team.lifeSaveTable, chosen,
          team.lifeSavePathways || team.fieldEffectMeta?.pathways || team.formulas?.pathways);
        player.lifeSave.strategy = chosen || strategy(defaultStrategy);
        player.lifeSave.usingCustomStrategy = chosen != null;
      }
    }
    return { ok: true, data: next };
  }
  function tableEntry(value) {
    if (!record(value)) return null;
    const parse = part => {
      if (part === null) return null;
      if (!record(part) || !Number.isFinite(Number(part.from)) ||
        Number(part.from) < -2 || Number(part.from) > 10 ||
        typeof part.name !== 'string' || !part.name.trim()) return undefined;
      return { from: Number(part.from), name: part.name.trim().slice(0, 80) };
    };
    const strong = parse(value.strong);
    const weak = parse(value.weak);
    if (strong === undefined && weak === undefined) return null;
    return { ...(strong === undefined ? {} : { strong }), ...(weak === undefined ? {} : { weak }) };
  }
  async function load() {
    const table = structuredClone(defaults);
    const db = window.GameDBManager?.DB?.lifeSaveTable;
    if (record(db)) for (const [key, entry] of Object.entries(db)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      const normalized = tableEntry(entry);
      if (normalized) table[key] = { ...table[key], ...normalized };
    }
    try {
      const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      const books = await host.getWorldbookNames();
      const available = Array.isArray(books) ? books : [];
      const ordered = ['1源堡', '2历史孔隙', '【源堡】玩家自建内容'];
      const selected = ordered.some(book => available.includes(book))
        ? ordered.filter(book => available.includes(book)) : available;
      const seen = new Set();
      for (const book of selected) {
        let entries;
        try { entries = await host.getWorldbook(book); } catch { continue; }
        const local = new Map();
        for (const entry of Array.isArray(entries) ? entries : []) {
          if (![entry?.comment, entry?.name].some(value => String(value || '').includes('保命技能'))) continue;
          let parsed;
          try {
            parsed = (modules['cryptLord.abilityState']?.parseWorldbookJson || JSON.parse)(entry.content);
          } catch { continue; }
          if (!record(parsed)) continue;
          for (const [key, row] of Object.entries(parsed)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            const normalized = tableEntry(row);
            if (normalized) local.set(key, normalized);
          }
        }
        for (const [key, normalized] of local) {
          if (seen.has(key)) continue;
          table[key] = { ...table[key], ...normalized };
          seen.add(key);
        }
      }
    } catch { /* No worldbook bridge: built-in table remains usable. */ }
    return table;
  }
  function library(sequence, pathway, pathways = window.GameDBManager?.DB?.godPathways) {
    if (record(pathways) && Object.keys(pathways).length) return pathways;
    // Legacy floor data may have only a declared pathway, without a formal sequence library.
    return pathway ? { [String(pathway)]: originalManager().splitSequenceFragments(sequence) } : {};
  }
  function eligibility(sequence, pathway, table = defaults, pathways) {
    return originalManager(table, library(sequence, pathway, pathways)).resolveEligibility(sequence);
  }
  function hero(actor, sequence = actor?.sequenceString || actor?.sequence, player = actor?.source === 'player') {
    return { sequenceString: sequence, dataSource: player ? 'player' : 'npc',
      additionalStats: { 活力: actor?.maxHp, 当前活力: actor?.hp }, lifeSave: actor?.lifeSave };
  }
  function initialize(actor, sequence, pathway, table = defaults, chosen = null, pathways) {
    let custom = null;
    try { if (chosen != null) custom = strategy(chosen); } catch { /* Invalid legacy floor preference uses defaults. */ }
    const manager = originalManager(table, library(sequence, pathway, pathways), custom);
    const adapted = hero(actor, sequence,
      actor?.source === 'player' || !actor?.source && chosen != null);
    manager.initOnHero(adapted);
    actor.lifeSave = adapted.lifeSave;
    return actor.lifeSave;
  }
  function reconcile(actor, sequence, pathway, table = defaults, pathways) {
    const adapted = hero(actor, sequence);
    originalManager(table, library(sequence, pathway, pathways)).reconcileOnProjectionChange(adapted);
    actor.lifeSave = adapted.lifeSave;
    return actor.lifeSave;
  }
  function absorb(actor, incoming) {
    return originalManager().tryAbsorb(hero(actor), incoming);
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    defaults, defaultStrategy, load, eligibility, initialize, reconcile, absorb, strategy, storedStrategy, saveStrategy,
    createOriginal: originalManager,
    finalEffectVerdict: (damage, maxHp) => originalManager().finalEffectVerdict(damage, maxHp),
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
