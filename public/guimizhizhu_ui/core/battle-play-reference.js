// Generated from original pathway bag battle interfaces; regenerate with the test extractor.
(() => {
  'use strict';
  const KEY = 'cryptLord.battlePlayReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create({ LifeSaveManager, parseSequenceRank, effectivePlayerSequence }) {
    const AudienceImaginationCore = { effectivePlayerSequence };
    const window = { AudienceImaginationCore };
const MarauderCloneMode = {
id: 'marauder-clone',
途径: '偷盗者',
途径全名: '偷盗者途径',
名称: '分身',
GATE: 4,
TITLE: '诡秘之主',
BAG_SOURCE: 'clone',
resolve(sequenceString) {
    const s = String(sequenceString || '');
    if (s.includes(this.TITLE)) return { inPathway: true, rank: -2, unlocked: true };
    let best = null;
    LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      if (!r || r.pathwayShort !== this.途径) return;
      const rank = Number(r.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, rank: null, unlocked: false };
    return { inPathway: true, rank: best, unlocked: best <= this.GATE };
  },
bagOfState(mvuState) {
    const sd = (mvuState && mvuState.stat_data) || null;
    const root = sd && sd['$专属玩法'];
    const pw = root && root[this.途径全名];
    const play = pw && pw['分身玩法'];
    const bag = play && play['分身列表'];
    return (bag && typeof bag === 'object' && !Array.isArray(bag)) ? bag : null;
  },
recordsOfState(mvuState) {
    const bag = this.bagOfState(mvuState) || {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && bag[k] && typeof bag[k] === 'object')
      .map(k => ({ name: k, data: bag[k] }));
  },
recordOfState(mvuState, name) {
    const bag = this.bagOfState(mvuState);
    const rec = bag && bag[name];
    return (rec && typeof rec === 'object') ? rec : null;
  },
PARASITE_MARK: '$寄生分身',
isParasite(rec) {
    return !!(rec && typeof rec === 'object' && rec[this.PARASITE_MARK] === true);
  },
npcPoolOfState(mvuState) {
    return (mvuState && mvuState.npc_data) || {};
  },
convertedOfPool(pool) {
    const bag = (pool && typeof pool === 'object') ? pool : {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && bag[k] && typeof bag[k] === 'object' && bag[k]['$分身转化'] === true)
      .map(k => ({ name: k, data: bag[k] }));
  },
convertedOfState(mvuState) {
    return this.convertedOfPool(this.npcPoolOfState(mvuState));
  },
parasitesOfPool(pool) {
    const bag = (pool && typeof pool === 'object') ? pool : {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && this.isParasite(bag[k]))
      .map(k => ({ name: k, data: bag[k] }));
  },
parasitesOfState(mvuState) {
    return this.parasitesOfPool(this.npcPoolOfState(mvuState));
  },
purgeDead(mvuState, heroes) {
    const bag = this.bagOfState(mvuState);
    if (!bag) return [];
    const dead = [];
    (heroes || []).forEach(h => {
      // 按玩法 id 认人：多个玩法并存时，布尔判断会让别家的阵亡单位跑来翻这只袋
      if (!h || h.playSource !== this.id) return;
      const hp = Number(h.additionalStats && h.additionalStats.当前活力);
      if (Number.isFinite(hp) && hp > 0) return;
      if (!Object.prototype.hasOwnProperty.call(bag, h.name)) return;
      delete bag[h.name];
      dead.push(h.name);
    });
    if (dead.length) this.syncDisplayAbility(mvuState);
    return dead;
  },
DISPLAY_KEY: '#制作分身',
syncDisplayAbility(mvuState) {
    const sd = (mvuState && mvuState.stat_data) || null;
    if (!sd) return;
    const people = this.recordsOfState(mvuState)
      .concat(this.convertedOfState(mvuState))
      .concat(this.parasitesOfState(mvuState));
    const list = sd.辅助能力列表;
    const key = this.DISPLAY_KEY;

    if (!people.length) {
      if (list && typeof list === 'object' && !Array.isArray(list) && Object.prototype.hasOwnProperty.call(list, key)) {
        delete list[key];
      }
      return;
    }

    const counts = new Map();
    people.forEach(({ data }) => {
      const rank = (typeof parseSequenceRank === 'function')
        ? parseSequenceRank(String((data && data.当前序列) || ''))
        : 10;
      counts.set(rank, (counts.get(rank) || 0) + 1);
    });
    const ranks = Array.from(counts.keys()).sort((a, b) => a - b);
    const parts = ranks.map((rank) => {
      const n = counts.get(rank);
      if (rank === -2) return `${n}个支柱`;
      if (rank === -1) return `${n}个旧日`;
      // 寄生来的宿主可能是凡人，parseSequenceRank 给的 10 不是一条真序列
      if (rank === 10) return `${n}个凡人`;
      return `${n}个序列${rank}`;
    });
    const player = String((sd.名称 || '')).trim() || '<User>';
    const desc = `${player}已有${people.length}个分身，其中${parts.join('、')}。`;

    let bag = list;
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
      bag = sd.辅助能力列表 = { $meta: { extensible: true } };
    } else if (!bag.$meta) {
      bag.$meta = { extensible: true };
    }
    bag[key] = {
      名称: '制作分身',
      序列: '序列4',
      描述: desc,
      isEquipped: false,
    };
  }
};
const MarionetteMode = {
id: 'diviner-marionette',
途径: '占卜家',
途径全名: '占卜家途径',
名称: '秘偶',
GATE: 5,
TITLE: '诡秘之主',
BAG_SOURCE: 'puppet',
resolve(sequenceString) {
    const s = String(sequenceString || '');
    if (s.includes(this.TITLE)) return { inPathway: true, rank: -2, unlocked: true };
    let best = null;
    LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      if (!r || r.pathwayShort !== this.途径) return;
      const rank = Number(r.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, rank: null, unlocked: false };
    return { inPathway: true, rank: best, unlocked: best <= this.GATE };
  },
bagOfState(mvuState) {
    const sd = (mvuState && mvuState.stat_data) || null;
    const root = sd && sd['$专属玩法'];
    const pw = root && root[this.途径全名];
    const play = pw && pw['秘偶玩法'];
    const bag = play && play['秘偶列表'];
    return (bag && typeof bag === 'object' && !Array.isArray(bag)) ? bag : null;
  },
recordsOfState(mvuState) {
    const bag = this.bagOfState(mvuState) || {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && bag[k] && typeof bag[k] === 'object')
      .map(k => ({ name: k, data: bag[k] }));
  },
recordOfState(mvuState, name) {
    const bag = this.bagOfState(mvuState);
    const rec = bag && bag[name];
    return (rec && typeof rec === 'object') ? rec : null;
  },
MARK: '$秘偶',
isMarked(rec) {
    return !!(rec && typeof rec === 'object' && rec[this.MARK] === true);
  },
npcPoolOfState(mvuState) {
    return (mvuState && mvuState.npc_data) || {};
  },
markedOfPool(pool) {
    const bag = (pool && typeof pool === 'object') ? pool : {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && this.isMarked(bag[k]))
      .map(k => ({ name: k, data: bag[k] }));
  },
markedOfState(mvuState) {
    return this.markedOfPool(this.npcPoolOfState(mvuState));
  },
purgeDead(mvuState, heroes) {
    const bag = this.bagOfState(mvuState);
    if (!bag) return [];
    const dead = [];
    (heroes || []).forEach(h => {
      // 按玩法 id 认人：多个玩法并存时，布尔判断会让别家的阵亡单位跑来翻这只袋
      if (!h || h.playSource !== this.id) return;
      const hp = Number(h.additionalStats && h.additionalStats.当前活力);
      if (Number.isFinite(hp) && hp > 0) return;
      if (!Object.prototype.hasOwnProperty.call(bag, h.name)) return;
      delete bag[h.name];
      dead.push(h.name);
    });
    if (dead.length) this.syncDisplayAbility(mvuState);
    return dead;
  },
DISPLAY_KEY: '#秘偶',
syncDisplayAbility(mvuState) {
    const sd = (mvuState && mvuState.stat_data) || null;
    if (!sd) return;
    const people = this.recordsOfState(mvuState).concat(this.markedOfState(mvuState));
    const list = sd.辅助能力列表;
    const key = this.DISPLAY_KEY;

    if (!people.length) {
      if (list && typeof list === 'object' && !Array.isArray(list) && Object.prototype.hasOwnProperty.call(list, key)) {
        delete list[key];
      }
      return;
    }

    const counts = new Map();
    people.forEach(({ data }) => {
      const rank = (typeof parseSequenceRank === 'function')
        ? parseSequenceRank(String((data && data.当前序列) || ''))
        : 10;
      counts.set(rank, (counts.get(rank) || 0) + 1);
    });
    const ranks = Array.from(counts.keys()).sort((a, b) => a - b);
    const parts = ranks.map((rank) => {
      const n = counts.get(rank);
      if (rank === -2) return `${n}个支柱`;
      if (rank === -1) return `${n}个旧日`;
      return `${n}个序列${rank}`;
    });
    const player = String((sd.名称 || '')).trim() || '<User>';
    const desc = `${player}操控着${people.length}具秘偶，其中${parts.join('、')}。`;

    let bag = list;
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
      bag = sd.辅助能力列表 = { $meta: { extensible: true } };
    } else if (!bag.$meta) {
      bag.$meta = { extensible: true };
    }
    bag[key] = {
      名称: '操控秘偶',
      序列: '序列5',
      描述: desc,
      isEquipped: false,
    };
  }
};
const SavantMaterialMode = {
id: 'savant-material-processing',
途径: '通识者',
途径全名: '通识者途径',
名称: '材料加工与制造工坊',
GATE: 6,
TITLE: '知识之妖',
BAG_SOURCE: 'savant-construct',
resolve(sequenceString) {
    const s = String(sequenceString || '');
    if (s.includes(this.TITLE)) return { inPathway: true, rank: -1, unlocked: true, viaTitle: true };
    let best = null;
    LifeSaveManager.splitSequenceFragments(s).forEach(frag => {
      const r = LifeSaveManager.resolveFragment(frag);
      if (!r || r.pathwayShort !== this.途径) return;
      const rank = Number(r.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, rank: null, unlocked: false, viaTitle: false };
    const effectiveRank = best > 0 ? Math.ceil(best) : best;
    return { inPathway: true, rank: effectiveRank, unlocked: effectiveRank <= this.GATE, viaTitle: false };
  },
bagOfState(mvuState) {
    const store = this.craftStore(mvuState, false);
    return store && store.bag;
  },
recordsOfState(mvuState) {
    const seq = window.AudienceImaginationCore
      ? AudienceImaginationCore.effectivePlayerSequence(mvuState)
      : String((mvuState && mvuState.stat_data && mvuState.stat_data.当前序列) || '');
    const gate = this.resolve(seq);
    if (!gate.unlocked) return [];
    return this.bagConstructsOfState(mvuState)
      .filter(x => Number(x.data.当前活力) > 0);
  },
recordOfState(mvuState, name) {
    const bag = this.bagOfState(mvuState);
    const rec = bag && bag[name];
    return rec && typeof rec === 'object' ? rec : null;
  },
STORE_CRAFT: '制造玩法',
STORE_CONSTRUCTS: '造物列表',
AUTONOMY_MARK: '$完全自主造物',
CONSTRUCT_TYPES: ['机械奇物', '魔偶'],
GRADE_RANK: {
    '支柱': -2, '旧日': -1, '序列0': 0, '序列1': 1, '序列2': 2, '序列3': 3,
    '序列4': 4, '序列5': 5, '序列6': 6, '序列7': 7, '序列8': 8, '序列9': 9, '普通': 10,
  },
gradeOfRank(rank) {
    const found = Object.keys(this.GRADE_RANK).find(k => this.GRADE_RANK[k] === Number(rank));
    return found || '普通';
  },
CONSTRUCT_DISPLAY_KEY: '#制造造物',
craftStore(mvuState, create) {
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
    let play = pathway[this.STORE_CRAFT];
    if (!play || typeof play !== 'object' || Array.isArray(play)) {
      if (!create) return null;
      play = pathway[this.STORE_CRAFT] = { 版本: 1, [this.STORE_CONSTRUCTS]: {} };
    }
    let bag = play[this.STORE_CONSTRUCTS];
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
      if (!create) return { play, bag: null };
      bag = play[this.STORE_CONSTRUCTS] = {};
    }
    return { play, bag };
  },
bagConstructsOfState(mvuState) {
    const bag = this.bagOfState(mvuState) || {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && bag[k] && typeof bag[k] === 'object')
      .map(name => ({ name, data: bag[name], autonomous: false }));
  },
isAutonomous(rec) {
    return !!(rec && typeof rec === 'object' && rec[this.AUTONOMY_MARK] === true
      && this.CONSTRUCT_TYPES.includes(String(rec['$造物类型'] || '')));
  },
autonomousConstructsOfState(mvuState) {
    const pool = (mvuState && mvuState.npc_data) || {};
    return Object.keys(pool)
      .filter(name => name !== '$meta' && this.isAutonomous(pool[name]))
      .map(name => ({ name, data: pool[name], autonomous: true }));
  },
allConstructsOfState(mvuState) {
    return this.bagConstructsOfState(mvuState).concat(this.autonomousConstructsOfState(mvuState));
  },
settleBattleRecords(mvuState, heroes) {
    const bag = this.bagOfState(mvuState);
    if (!bag) return { changed: false, removed: [] };
    let changed = false;
    (heroes || []).forEach(hero => {
      if (!hero || hero.playSource !== this.id) return;
      const rec = bag[hero.name];
      if (!rec || typeof rec !== 'object') return;
      const hp = Math.max(0, Math.min(Number(rec.活力) || 0,
        Number(hero.additionalStats && hero.additionalStats.当前活力) || 0));
      if (Number(rec.当前活力) !== hp) { rec.当前活力 = hp; changed = true; }
      ['敏捷', '灵性', '理智', '人性'].forEach(key => {
        const cap = Number(rec[key]) || 0;
        if (Number(rec[`当前${key}`]) !== cap) { rec[`当前${key}`] = cap; changed = true; }
      });
    });
    if (changed) this.syncConstructDisplay(mvuState);
    return { changed, removed: [] };
  },
syncConstructDisplay(mvuState) {
    const sd = mvuState && mvuState.stat_data;
    if (!sd) return;
    const rows = this.allConstructsOfState(mvuState);
    let list = sd.辅助能力列表;
    if (!rows.length) {
      if (list && typeof list === 'object' && !Array.isArray(list)) delete list[this.CONSTRUCT_DISPLAY_KEY];
      return;
    }
    if (!list || typeof list !== 'object' || Array.isArray(list)) list = sd.辅助能力列表 = { $meta: { extensible: true } };
    else if (!list.$meta) list.$meta = { extensible: true };
    const counts = new Map();
    rows.forEach(({ data }) => {
      const type = String(data['$造物类型'] || '机械奇物');
      const rank = Number(data['$成品位阶']);
      const key = `${type}:${Number.isFinite(rank) ? rank : 10}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const desc = Array.from(counts.entries()).map(([key, n]) => {
      const [type, rawRank] = key.split(':');
      return `${n}具${this.gradeOfRank(Number(rawRank))}${type}`;
    }).join('、');
    list[this.CONSTRUCT_DISPLAY_KEY] = {
      名称: '制造造物', 序列: '序列6',
      描述: `制造工坊现有${rows.length}具长期造物：${desc}。造物可编入战斗，战损会保留并可用材料维修。`,
      isEquipped: false,
    };
  }
};
    return [MarauderCloneMode, MarionetteMode, SavantMaterialMode];
  }
  const api = { create, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
