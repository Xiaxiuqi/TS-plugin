// Generated from the original complete MarionetteMode; native adapters are in marionette-state.js.
(() => {
  'use strict';
  const KEY = 'cryptLord.marionetteReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
const containsOldDayAttendant = (s) => String(s || '').includes('旧日侍者');
const resolveOldDayAttendantRank = (sequenceStr) => {
  const seqMatch = String(sequenceStr || '').match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
  return seqMatch ? Number(seqMatch[1]) : 2;
};
//解析序列（如"序列9-占卜家"→9，"普通人"→10，"序列0-真神"→0）
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

  function create(deps) {
    const window = deps.window || globalThis.window;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const NpcObjectiveSchema = { parse: deps.validateObjective };
    const NpcSubjectiveSchema = { parse: deps.validateSubjective };
    const getPureName = text => {
      const pure = String(text || '').replace(/[【】]/g, '').trim()
        .replace(/^序列\d+(\.\d+)?[-—\s]?/, '').trim();
      return containsOldDayAttendant(pure) ? pure : pure.replace(/^(旧日|支柱)[-—\s]?/, '').trim();
    };
const PathwaySeqUtil = {
MORTAL: '普通人',
pathwayDb() {
    const db = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
      ? GameDBManager.DB.godPathways : null;
    return (db && typeof db === 'object' && !Array.isArray(db)) ? db : {};
  },
pathwayNames() {
    const db = this.pathwayDb();
    return Object.keys(db).filter(k => Array.isArray(db[k]));
  },
seqEntriesOf(pathwayFullName) {
    if (pathwayFullName === this.MORTAL) return [this.MORTAL];
    const list = this.pathwayDb()[pathwayFullName];
    return Array.isArray(list) ? list.filter(s => typeof s === 'string' && s.trim()) : [];
  },
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
pathwayText() {
    const db = this.pathwayDb();
    return Object.keys(db).map(pw => {
      const list = db[pw];
      if (!Array.isArray(list)) return '';
      return [pw].concat(list.filter(s => typeof s === 'string' && s.trim())).join('|');
    }).filter(Boolean).join('\n');
  }
};
const PathwayEntityRoleGuard = {
MARKERS: ['$分身转化', '$寄生分身', '$秘偶', '$完全自主造物'],
hasAny(rec) {
    return !!(rec && typeof rec === 'object'
      && this.MARKERS.some(key => rec[key] === true));
  }
};
const MarionetteMode = {
id: 'diviner-marionette',
途径: '占卜家',
途径全名: '占卜家途径',
名称: '秘偶',
图标: '🎎',
GATE: 5,
TITLE: '诡秘之主',
BASE_CAP: 3,
CAP_STEP: 2,
BAG_SOURCE: 'puppet',
MARK: '$秘偶',
SNAPSHOT: '$入册快照',
STAT_KEYS: ['活力', '敏捷', '灵性', '理智', '人性', '运气'],
JOURNEY_PICK: 100,
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
capOf(rank) {
    const r = Number(rank);
    if (!Number.isFinite(r)) return 0;
    const eff = r > 0 ? Math.ceil(r) : r;
    return this.BASE_CAP + this.CAP_STEP * Math.max(0, this.GATE - eff);
  },
bag(game, create) {
    const sd = (game && game.currentMvuState && game.currentMvuState.stat_data) || null;
    if (!sd) return null;
    const path = ['$专属玩法', this.途径全名, '秘偶玩法', '秘偶列表'];
    let node = sd;
    for (const key of path) {
      let next = node[key];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        if (!create) return null;
        next = node[key] = {};
      }
      node = next;
    }
    return node;
  },
bagOfState(mvuState) {
    const sd = (mvuState && mvuState.stat_data) || null;
    const root = sd && sd['$专属玩法'];
    const pw = root && root[this.途径全名];
    const play = pw && pw['秘偶玩法'];
    const bag = play && play['秘偶列表'];
    return (bag && typeof bag === 'object' && !Array.isArray(bag)) ? bag : null;
  },
records(game) {
    const bag = this.bag(game, false) || {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && bag[k] && typeof bag[k] === 'object')
      .map(k => ({ name: k, data: bag[k] }));
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
npcPool(game) {
    return (game && game.currentMvuState && game.currentMvuState.npc_data) || {};
  },
npcPoolOfState(mvuState) {
    return (mvuState && mvuState.npc_data) || {};
  },
relPool(game) {
    const sd = (game && game.currentMvuState && game.currentMvuState.stat_data) || null;
    const rel = sd && sd.人物关系列表;
    return (rel && typeof rel === 'object' && !Array.isArray(rel)) ? rel : {};
  },
isMarked(rec) {
    return !!(rec && typeof rec === 'object' && rec[this.MARK] === true);
  },
markedOfPool(pool) {
    const bag = (pool && typeof pool === 'object') ? pool : {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && this.isMarked(bag[k]))
      .map(k => ({ name: k, data: bag[k] }));
  },
marked(game) {
    return this.markedOfPool(this.npcPool(game));
  },
markedOfState(mvuState) {
    return this.markedOfPool(this.npcPoolOfState(mvuState));
  },
occupied(game) {
    return this.records(game).length + this.marked(game).length;
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
  },
nameTaken(game, name) {
    const n = String(name || '').trim();
    if (!n) return '名字为空';
    const has = (obj) => !!(obj && Object.prototype.hasOwnProperty.call(obj, n) && obj[n]);
    if (has(this.bag(game, false))) return '袋里已有同名秘偶';
    const npc = this.npcPool(game);
    if (has(npc) && this.isMarked(npc[n])) return '已认证过这具秘偶';
    if (has(npc)) return '人物列表里已有同名角色，请改用「勾选人物认证」';
    if (has(this.relPool(game))) return '人物关系列表里已有同名角色，请改用「勾选人物认证」';
    return '';
  },
pathwayDb() {
    return PathwaySeqUtil.pathwayDb();
  },
pathwayNames() {
    return PathwaySeqUtil.pathwayNames();
  },
seqEntriesOf(pathwayFullName) {
    return PathwaySeqUtil.seqEntriesOf(pathwayFullName);
  },
findSeqString(raw) {
    return PathwaySeqUtil.findSeqString(raw);
  },
toBagRecord(npc, name, subj) {
    const rec = {
      名称: name,
      当前序列: npc.当前序列,
      模板: npc.模板 || '普通',
      神性: npc.神性,
      能力清单: Array.isArray(npc.能力清单) ? npc.能力清单 : [],
      $战斗经验: npc['$战斗经验'] ?? 0,
      $战斗经验等级: npc['$战斗经验等级'] ?? 0,
    };
    // 这三个键在老档里没有 $ 前缀，读两边、只写带前缀的那个
    const legacyId = npc['$id'] ?? npc['id'];
    if (legacyId != null) rec['$id'] = legacyId;
    const legacyTime = npc['$创建时间'] ?? npc['创建时间'];
    if (legacyTime != null) rec['$创建时间'] = legacyTime;
    const legacySource = npc['$来源剧情'] ?? npc['来源剧情'];
    if (legacySource != null) rec['$来源剧情'] = legacySource;
    rec.能力体系 = npc.能力体系 || '';
    this.STAT_KEYS.forEach(key => {
      rec[key] = npc[key];
      if (key !== '运气' && npc[`当前${key}`] != null) rec[`当前${key}`] = npc[`当前${key}`];
    });
    try {
      rec[this.SNAPSHOT] = {
        客观: JSON.parse(JSON.stringify(npc)),
        主观: (subj && typeof subj === 'object') ? JSON.parse(JSON.stringify(subj)) : null,
      };
    } catch (e) {
      console.warn('[秘偶] 快照序列化失败，退回后将只保留战斗字段', e);
    }
    return rec;
  },
snapshotOf(rec) {
    const snap = rec && rec[this.SNAPSHOT];
    return (snap && typeof snap === 'object' && snap.客观 && typeof snap.客观 === 'object') ? snap : null;
  },
LEGACY_KEYS: [['id', '$id'], ['创建时间', '$创建时间'], ['来源剧情', '$来源剧情']],
migrateLegacyKeys(rec) {
    if (!rec || typeof rec !== 'object') return rec;
    this.LEGACY_KEYS.forEach(([old, next]) => {
      if (!Object.prototype.hasOwnProperty.call(rec, old)) return;
      // 手改变量可能把旧键塞成 null，这种没值可迁，但键本身仍得删掉，
      // 否则它会以无 $ 前缀的形态跟着进 npc_data
      if (rec[old] != null && rec[next] == null) rec[next] = rec[old];
      delete rec[old];
    });
    return rec;
  },
ensureNpcTables(game) {
    const st = game && game.currentMvuState;
    if (!st) return null;
    if (!st.npc_data || typeof st.npc_data !== 'object' || Array.isArray(st.npc_data)) st.npc_data = {};
    if (!st.stat_data) return null;
    if (!st.stat_data.人物关系列表 || typeof st.stat_data.人物关系列表 !== 'object'
      || Array.isArray(st.stat_data.人物关系列表)) {
      st.stat_data.人物关系列表 = {};
    }
    return st;
  },
candidates(game) {
    const npc = this.npcPool(game);
    const rel = this.relPool(game);
    const bag = this.bag(game, false) || {};
    const out = [];
    Object.keys(npc).forEach(name => {
      if (name === '$meta') return;
      const rec = npc[name];
      if (!rec || typeof rec !== 'object') return;
      if (PathwayEntityRoleGuard.hasAny(rec)) return;
      if (Object.prototype.hasOwnProperty.call(bag, name)) return;
      const subj = rel[name] || {};
      const status = (rec.当前状态 && typeof rec.当前状态 === 'object')
        ? Object.keys(rec.当前状态).filter(k => k !== '$meta')
        : [];
      out.push({
        idx: 0,
        name,
        序列: String(rec.当前序列 || '').trim() || '-',
        体系: String(rec.能力体系 || '').trim() || '-',
        关系: String(subj.关系 || '').trim() || '-',
        好感度: (subj.好感度 === undefined || subj.好感度 === null) ? '-' : subj.好感度,
        地点: String(rec.所处地点 || subj.所处地点 || '').trim() || '-',
        状态: status.length ? status.join('、') : '-',
        在做: String(rec.正在做的事 || '').trim() || '-',
      });
    });
    out.forEach((c, i) => { c.idx = i; });
    return out;
  },
candidateText(picks) {
    return picks.map((p, i) =>
      `[${i + 1}] ${p.name} | 序列:${p.序列} | 体系:${p.体系} | 关系:${p.关系}`
      + ` | 好感度:${p.好感度} | 地点:${p.地点} | 状态:${p.状态} | 正在做:${p.在做}`
    ).join('\n');
  },
promptCertify(playerName, sequence, candidateText) {
    return `你是「占卜家途径 · 秘偶」玩法的认证官。

玩家【${playerName}】的当前序列是【${sequence}】。他声称下列角色已经是他的秘偶，
请你只依据 <历史事件>、<近期事件> 与 <最新剧情> 三段材料，逐个判断这些角色
能否被认证为他的秘偶。若某段材料未提供，或小总结以 [小总结原文] 的形式给出，
就以实际给到的内容为准。

## 本玩法的铁则

1. 秘偶是占卜家途径的产物：施术者以自身能力，把目标制成受自己操控的傀儡。
   下列情形都算，居其一即可：
   - 剧情明确写到玩家把这个对象制成了秘偶、傀儡、人偶；
   - 剧情明确写到玩家以秘偶化、傀儡化一类手段，彻底转化了这个对象。
2. 只有玩家亲手制成的秘偶才算。别人制作的、别人操控的、他人转让的、
   缴获得来的、来历不明的，一律不行。
3. 没有「被制成秘偶」这一环的，一律不行——仆从、雇员、部下、盟友、信徒、
   受玩家胁迫或听命于玩家的活人，无论多么忠诚顺从，都不是秘偶。
4. 必须仍然有效。截至 <最新剧情>，若这具秘偶已被摧毁、被夺走、已脱离玩家控制、
   已失控、已被玩家自己解除或销毁，一律不行。
5. 不要判断这个角色的途径、序列或强弱。那些沿用已有记录，与本次认证无关。

## 判定标准

- 通过：材料中确有玩家亲手把这个对象制成秘偶的明确一环，且截至 <最新剧情>
  它仍是玩家可用的秘偶。
- 不通过：材料中没有这一环；或曾经有过，但如今已损毁、失控、易主、解除。

严禁脑补候选清单与材料里没有的情节。拿不准的一律判不通过。

## 待认证角色

${candidateText}

## 输出格式

只输出一个 <裁定> 块。块内每个角色占一行，除此之外不要输出任何其它内容、
解释、标签或空行。

<裁定>
编号|通过|理由
编号|不通过|理由
</裁定>

- 编号：原样照抄上面清单的编号。一个角色一行，不得增补、遗漏或调换顺序。
- 第二段：只能写「通过」或「不通过」，不要写别的词。
- 第三段：理由，一句话，40 字以内，其中不得出现竖线与换行。`;
  },
USER_INPUT_CERTIFY: '请逐条认证：上列角色中，哪些确实是我的秘偶？',
parseCertifyVerdicts(raw, count) {
    const block = String(raw || '').match(/<裁定>([\s\S]*?)<\/裁定>/);
    if (!block) return null;
    const out = {};
    block[1].split(/\r?\n/).forEach(line => {
      const seg = line.trim().split('|');
      if (seg.length < 2) return;
      const idx = parseInt(String(seg[0]).replace(/[^0-9]/g, ''), 10);
      if (!Number.isInteger(idx) || idx < 1 || idx > count) return;
      const verdict = String(seg[1] || '');
      const rejected = /不通过|未通过/.test(verdict);
      const passed = /通过/.test(verdict) && !rejected;
      // 第二段既不是「通过」也不是「不通过」的行直接丢弃：留着只会在结果页
      // 显示一条来源不明的判定。丢掉之后由调用方按「漏判」兜底，话说得更准
      if (!passed && !rejected) return;
      out[idx] = {
        ok: passed,
        reason: String(seg[2] || '').trim() || '（模型未给出理由）',
      };
    });
    return Object.keys(out).length ? out : null;
  },
eventLabel(ev) {
    const seq = String((ev && ev['序号']) || '').trim() || '?';
    const date = String((ev && ev['日期']) || '').trim() || '未知时间';
    const title = String((ev && ev['大纲']) || '').trim() || '未命名节点';
    return `序号${seq} · ${date} · ${title}`;
  },
selectedStory(win) {
    const st = this.state(win);
    if (st.source === 'latest') {
      const raw = (win.game && typeof win.game._getLatestStoryContent === 'function')
        ? win.game._getLatestStoryContent() : '';
      const body = String(raw || '').trim();
      if (!body) return null;
      return {
        source: '最新正文',
        text: `<指定剧情>\n来源：最新剧情（与上文 <最新剧情> 是同一段）\n${body}\n</指定剧情>`,
      };
    }
    const events = Array.isArray(st.events) ? st.events : [];
    const ev = events[Number(st.source)];
    if (!ev) return null;
    const body = (win.game && typeof win.game.stringifyJourneyEvent === 'function')
      ? win.game.stringifyJourneyEvent(ev)
      : JSON.stringify(ev);
    const label = this.eventLabel(ev);
    return {
      source: label,
      text: `<指定剧情>\n来源：小总结 ${label}\n${String(body || '').trim()}\n</指定剧情>`,
    };
  },
pathwayText() {
    return PathwaySeqUtil.pathwayText();
  },
promptStory(playerName, sequence, pathwayText, existingNames) {
    return `你是「占卜家途径 · 秘偶」玩法的认证官。

玩家【${playerName}】的当前序列是【${sequence}】。他指定了 <指定剧情> 这一段，
主张自己在其中获得了秘偶。请你结合 <历史事件>、<近期事件> 与 <最新剧情>，
判断这一主张是否成立。若某段材料未提供，或小总结以 [小总结原文] 的形式给出，
就以实际给到的内容为准。

## 本玩法的铁则

1. 秘偶是占卜家途径的产物：施术者以自身能力，把目标制成受自己操控的傀儡。
   下列情形都算，居其一即可：
   - <指定剧情> 里玩家把这个对象制成了秘偶、傀儡、人偶；
   - <指定剧情> 里玩家以秘偶化、傀儡化一类手段，彻底转化了这个对象。
2. 只有玩家亲手制成的秘偶才算。别人制作的、别人操控的、他人转让的、
   缴获得来的、来历不明的，一律不行。
3. 没有「被制成秘偶」这一环的，一律不行——仆从、雇员、部下、盟友、信徒、
   受玩家胁迫或听命于玩家的活人，无论多么忠诚顺从，都不是秘偶。
4. 两道关必须同时过：
   - 第一关只看 <指定剧情>：这段剧情里确实发生了「玩家亲手制成秘偶」这件事；
   - 第二关看 <历史事件>、<近期事件> 与 <最新剧情>：截至 <最新剧情>，
     这具秘偶没有被摧毁、被夺走、脱离控制、失控，也没有被玩家自己解除或销毁，
     现在仍然可用。
   只过第一关、第二关不过的，判不通过。
5. 秘偶的途径不限，可能是任何途径，也不必与玩家自己的途径相同。
6. 秘偶的序列，必须从下面的【序列名清单】里原样照抄一条完整序列名，
   例如「序列5-秘偶大师」「旧日-恶魔之父」「支柱-诡秘之主」。
   - 不得只写数字，不得只写称号，不得改动清单里的任何一个字；
   - 旧日与支柱同样可以做成秘偶，照抄对应那一条即可；
   - 取 <指定剧情> 中可以判明的那一档，不得自行拔高或压低；
   - 序列无从判明的，判不通过。
7. 不要输出这具秘偶的属性、六维、能力，那些由系统按序列自行计算。
8. 下列秘偶玩家已经拥有，若 <指定剧情> 说的正是其中某一具，判不通过并在理由里
   注明重复：${existingNames}

## 序列名清单

${pathwayText}

## 判定标准

- 通过：<指定剧情> 中确有玩家亲手制成秘偶的明确一环，该秘偶截至 <最新剧情>
  仍然可用，且序列名能够判明。
- 不通过：<指定剧情> 里没有这一环；或秘偶并非玩家亲手制成；或已损毁、失控、
  易主、解除；或序列无从判明；或与已有秘偶重复。

严禁脑补 <指定剧情> 与其余材料里没有的情节。拿不准的一律判不通过。

## 输出格式

只输出一个 <裁定> 块。块内一具秘偶占一行，除此之外不要输出任何其它内容、
解释、标签或空行。同一段剧情里确实制成了多具秘偶时，一具写一行。

<裁定>
通过|名称|序列名|理由
</裁定>

没有任何可认定的秘偶时，只写一行：

<裁定>
不通过|||理由
</裁定>

- 第一段：只能写「通过」或「不通过」，不要写别的词。
- 第二段：名称。剧情里有名字就原样照抄；没有名字就用剧情中对它的称法，
  不超过 10 字，不要自创华丽名号。判不通过时留空。
- 第三段：从【序列名清单】里原样照抄的完整序列名。判不通过时留空。
- 第四段：理由，一句话，40 字以内，其中不得出现竖线与换行。
- 判不通过时，中间两段留空，竖线紧挨着写。`;
  },
USER_INPUT_STORY: '请裁定：我在这段剧情里获得的秘偶，是否成立且至今仍可使用？',
parseStoryVerdicts(raw) {
    const block = String(raw || '').match(/<裁定>([\s\S]*?)<\/裁定>/);
    if (!block) return null;
    const passed = [];
    let reject = '';
    block[1].split(/\r?\n/).forEach(line => {
      const seg = line.trim().split('|');
      if (seg.length < 4) return;
      const verdict = String(seg[0] || '').trim();
      const isPass = /通过/.test(verdict) && !/不通过|未通过/.test(verdict);
      const reason = String(seg[3] || '').trim();
      if (!isPass) {
        if (/不通过|未通过/.test(verdict) && !reject) reject = reason || '（模型未给出理由）';
        return;
      }
      const name = String(seg[1] || '').trim();
      if (!name) return;
      const seqRaw = String(seg[2] || '').trim();
      const hit = this.findSeqString(seqRaw);
      passed.push({
        name,
        seqRaw,
        pathway: hit ? hit.pathway : '',
        seqString: hit ? hit.seqString : '',
        ok: !!hit,
        reason: reason || '（模型未给出理由）',
      });
    });
    return { passed, reject };
  },
shortDate(win) {
    const era = String((win.game && win.game.currentMvuState
      && win.game.currentMvuState.world_data
      && win.game.currentMvuState.world_data.当前时间纪元) || '');
    const m = era.match(/(\d+年\d+月\d+日)/);
    return (m && m[1]) || '入册当日';
  },
playerPlace(win) {
    const sd = win.sd();
    const region = String((sd && sd.当前区域) || '').trim() || '鲁恩王国';
    const landmark = String((sd && sd.当前地标) || '').trim() || '廷根';
    return `${region}·${landmark}`;
  },
fallbackText(v, fallback) {
    const s = String(v == null ? '' : v).trim();
    if (!s || s === '未知') return fallback;
    return s;
  },
promoteDefaults(win) {
    const player = win.playerName();
    const place = this.playerPlace(win);
    const date = this.shortDate(win);
    return {
      身份: `${player}的秘偶。`,
      性格: `没有自己的意志，完全听从${player}。`,
      外貌: '与生前或原本的形貌相同，动作略显僵硬',
      关系: `${player}的秘偶`,
      '对<User>的称呼': '主人',
      好感度: 150,
      持有物品: '一套衣服',
      所处地点: place,
      正在做的事: `在${place}按${player}的吩咐行动。`,
      行为链片段: `等待指令 -> 留在${place}附近 -> 执行${player}的吩咐`,
      长期目标: `作为秘偶存续，执行${player}的一切命令`,
      近期打算: `待在原处，等待${player}的指示 | 此刻`,
      关键记忆键: `${date}_被制成秘偶`,
      关键记忆: `${date}|${place}|由${player}以占卜家途径的权柄制成秘偶，此后受其操控。`,
    };
  },
collectPromoteForm(win, defaults) {
    const out = Object.assign({}, defaults);
    this.queryAll('[data-mrn-field]').forEach(el => {
      const key = el.dataset.mrnField;
      if (!key) return;
      if (key === '好感度') {
        const n = Number(el.value);
        out.好感度 = Number.isFinite(n) ? n : defaults.好感度;
        return;
      }
      out[key] = this.fallbackText(el.value, defaults[key]);
    });
    return out;
  },
formField(esc, key, label, value, kind) {
    const v = esc(value);
    if (kind === 'textarea') {
      return `<label class="ppw-field"><span>${esc(label)}</span><textarea data-mrn-field="${esc(key)}" rows="2">${v}</textarea></label>`;
    }
    if (kind === 'number') {
      return `<label class="ppw-field"><span>${esc(label)}</span><input type="number" data-mrn-field="${esc(key)}" value="${v}" /></label>`;
    }
    return `<label class="ppw-field"><span>${esc(label)}</span><input type="text" data-mrn-field="${esc(key)}" value="${v}" /></label>`;
  },
async doPromote(win, name) {
    const bag = this.bag(win.game, false);
    const rec = bag && bag[name];
    if (!rec || typeof rec !== 'object') { win.msg('找不到这具秘偶'); return; }

    const mvu = this.ensureNpcTables(win.game);
    if (!mvu) { win.msg('存档尚未就绪'); return; }
    if (Object.prototype.hasOwnProperty.call(mvu.npc_data, name) && mvu.npc_data[name]) {
      win.msg('人物列表里已有同名角色，无法入册', 3500);
      return;
    }

    const snap = this.snapshotOf(rec);
    if (snap) {
      const obj = this.migrateLegacyKeys(JSON.parse(JSON.stringify(snap.客观)));
      obj[this.MARK] = true;
      mvu.npc_data[name] = obj;
      if (snap.主观 && typeof snap.主观 === 'object') {
        mvu.stat_data.人物关系列表[name] = JSON.parse(JSON.stringify(snap.主观));
      }
      delete bag[name];
      win.forgetTeamEntry(name);
      this.syncDisplayAbility(mvu);
      win.persist();
      await win.persistZero();
      const st0 = this.state(win);
      st0.view = 'main';
      st0.promoteName = '';
      win.msg(`「${name}」已按原记录重新入册`);
      win.render();
      return;
    }

    const defaults = this.promoteDefaults(win);
    const filled = this.collectPromoteForm(win, defaults);
    const seq = String(rec.当前序列 || '').trim();
    const sys = String(rec.能力体系 || '').trim();

    const objRaw = Object.assign({}, rec, {
      名称: name,
      身份: filled.身份,
      性格: filled.性格,
      外貌: filled.外貌,
      持有物品: filled.持有物品,
      所处地点: filled.所处地点,
      正在做的事: filled.正在做的事,
      行为链片段: filled.行为链片段,
      长期目标: filled.长期目标,
      近期打算: filled.近期打算,
      当前状态: {},
      事件历史: {},
      关键记忆: { [filled.关键记忆键]: filled.关键记忆 },
      initialized: true,
      _lastSequence: seq,
      isImportant: false,
      [this.MARK]: true,
    });
    delete objRaw[this.SNAPSHOT];
    this.migrateLegacyKeys(objRaw);

    let obj;
    let subj;
    try {
      obj = NpcObjectiveSchema.parse(objRaw);
      obj[this.MARK] = true;
      subj = NpcSubjectiveSchema.parse({
        名称: name,
        身份: filled.身份,
        性格: filled.性格,
        外貌: filled.外貌,
        当前序列: seq,
        能力体系: sys,
        '对<User>的称呼': filled['对<User>的称呼'],
        好感度: filled.好感度,
        关系: filled.关系,
        持有物品: filled.持有物品,
        所处地点: filled.所处地点,
      });
    } catch (e) {
      console.error('[秘偶] 入册校验失败', e);
      win.msg('入册失败：' + (e.message || e), 4000);
      return;
    }

    // 主观序列/体系绝不能落成「未知」：正常秘偶 buildRecord 一定有当前序列
    if (!String(subj.当前序列 || '').trim() || subj.当前序列 === '未知') subj.当前序列 = seq || '占卜家途径秘偶';
    if (!String(subj.能力体系 || '').trim() || subj.能力体系 === '未知') subj.能力体系 = sys || '占卜家途径';

    mvu.npc_data[name] = obj;
    mvu.stat_data.人物关系列表[name] = subj;
    delete bag[name];

    win.forgetTeamEntry(name);
    this.syncDisplayAbility(mvu);
    win.persist();
    await win.persistZero();
    const st = this.state(win);
    st.view = 'main';
    st.promoteName = '';
    win.msg(`「${name}」已入册，进入人物列表`);
    win.render();
  },
async revert(win, name) {
    const npc = this.npcPool(win.game)[name];
    if (!this.isMarked(npc)) { win.msg('找不到这具已入册的秘偶'); return; }
    if (win.game && typeof win.game.showConfirmModal === 'function') {
      const ok = await win.game.showConfirmModal(
        `确定将「${win.esc(name)}」退回为袋内秘偶？将离开人物列表，性格与记忆存进快照，之后可原样重新入册。`
      );
      if (!ok) return;
    }
    await this.doRevert(win, name);
  },
async doRevert(win, name) {
    const mvu = this.ensureNpcTables(win.game);
    const npc = mvu && mvu.npc_data && mvu.npc_data[name];
    if (!this.isMarked(npc)) { win.msg('找不到这具已入册的秘偶'); return; }
    const bag = this.bag(win.game, true);
    if (Object.prototype.hasOwnProperty.call(bag, name) && bag[name]) {
      win.msg('袋里已有同名秘偶，无法退回', 3500);
      return;
    }
    const subj = mvu.stat_data.人物关系列表 ? mvu.stat_data.人物关系列表[name] : null;
    bag[name] = this.toBagRecord(npc, name, subj);
    delete mvu.npc_data[name];
    if (mvu.stat_data.人物关系列表) delete mvu.stat_data.人物关系列表[name];

    win.forgetTeamEntry(name);
    this.syncDisplayAbility(mvu);
    win.persist();
    await win.persistZero();
    win.msg(`「${name}」已退回为袋内秘偶`);
    win.render();
  },
async unmark(win, name) {
    const mvu = win.game && win.game.currentMvuState;
    const npc = mvu && mvu.npc_data && mvu.npc_data[name];
    if (!this.isMarked(npc)) { win.msg('找不到这具已入册的秘偶'); return; }
    if (win.game && typeof win.game.showConfirmModal === 'function') {
      const ok = await win.game.showConfirmModal(
        `确定取消「${win.esc(name)}」的秘偶认证？角色本身与其全部数据保持原样，只是不再算作你的秘偶。`
      );
      if (!ok) return;
    }
    delete npc[this.MARK];
    win.forgetTeamEntry(name);
    this.syncDisplayAbility(mvu);
    win.persist();
    await win.persistZero();
    win.msg(`已取消「${name}」的秘偶认证`);
    win.render();
  },
async renameRecord(win, oldName) {
    const bag = this.bag(win.game, false);
    if (!bag || !bag[oldName]) { win.msg('找不到这具秘偶'); return; }

    let input = null;
    if (win.game && typeof win.game.showPromptModal === 'function') {
      input = await win.game.showPromptModal(
        '秘偶改名', '输入新的名字：', win.esc(oldName), 'text', '',
        { confirmClass: 'interaction-btn primary-btn' },
      );
    } else {
      input = window.prompt('秘偶改名', oldName);
    }
    const next = String(input == null ? '' : input).trim();
    if (!next || next === oldName) return;

    const why = this.nameTaken(win.game, next);
    if (why) { win.msg(why, 3500); return; }

    const rec = bag[oldName];
    rec.名称 = next;
    bag[next] = rec;
    delete bag[oldName];
    // 队伍配置按名字匹配，旧名留着会变成一条永远匹配不上的死记录
    win.forgetTeamEntry(oldName);
    win.persist();
    win.msg(`已改名为「${next}」`);
    win.render();
  },
rerollRecord(win, name) {
    const bag = this.bag(win.game, false);
    const rec = bag && bag[name];
    if (!rec) { win.msg('找不到这具秘偶'); return; }
    const seqString = String(rec.当前序列 || '');
    rec.能力清单 = this.rollAbilities(seqString, parseSequenceRank(seqString));
    win.persist();
    win.msg(`已为「${name}」重抽序列能力`);
    win.render();
  },
dropRecord(win, name) {
    const bag = this.bag(win.game, false);
    if (!bag || !bag[name]) { win.msg('找不到这具秘偶'); return; }
    delete bag[name];
    win.forgetTeamEntry(name);
    this.syncDisplayAbility(win.game && win.game.currentMvuState);
    win.persist();
    win.msg(`「${name}」已销毁`);
    win.render();
  },
state(win) {
    if (!win._modeState) win._modeState = {};
    if (!win._modeState[this.id]) {
      win._modeState[this.id] = {
        view: 'main',
        results: null,
        lastError: '',
        promoteName: '',
        events: null,
        loading: false,
        source: 'latest',
        pending: null,
        storyLabel: '',
      };
    }
    return win._modeState[this.id];
  },
abilityText(d) {
    const list = Array.isArray(d && d.能力清单) ? d.能力清单 : [];
    if (!list.length) return '（无）';
    return list.map(a => (a && (a.名称 || a.name)) || '').filter(Boolean).join('、') || '（无）';
  },
rowHtml(win, c, kind) {
    const esc = win.esc.bind(win);
    const d = c.data || {};
    const ops = kind === 'marked'
      ? `<button type="button" class="ppw-btn ghost" data-ppw="revert" data-arg="${esc(c.name)}">退回袋内</button>
    <button type="button" class="ppw-btn ghost" data-ppw="unmark" data-arg="${esc(c.name)}">取消认证</button>`
      : `<button type="button" class="ppw-btn ghost" data-ppw="to-promote" data-arg="${esc(c.name)}">入册</button>
    <button type="button" class="ppw-btn ghost" data-ppw="rename" data-arg="${esc(c.name)}">改名</button>
    <button type="button" class="ppw-btn ghost" data-ppw="reroll" data-arg="${esc(c.name)}">🎲 重抽能力</button>
    <button type="button" class="ppw-btn warn" data-ppw="drop" data-arg="${esc(c.name)}">销毁</button>`;
    const tags = [];
    if (kind === 'marked') tags.push('已在人物列表 · 我方战斗由你操控');
    else if (this.snapshotOf(d)) tags.push('带入册快照 · 入册时原样还原');
    const tag = tags.length ? `<div class="ppw-clone-sub">${esc(tags.join(' · '))}</div>` : '';
    return `<div class="ppw-clone">
  <div class="ppw-clone-main">
    <div class="ppw-clone-name">${esc(c.name)}</div>
    <div class="ppw-clone-sub">${esc(d.当前序列 || '未知序列')} · ${esc(d.能力体系 || '未知体系')}</div>
    ${tag}
    <div class="ppw-clone-stats">活力 ${d.当前活力 ?? '-'}/${d.活力 ?? '-'} · 灵性 ${d.当前灵性 ?? '-'}/${d.灵性 ?? '-'} · 理智 ${d.当前理智 ?? '-'}/${d.理智 ?? '-'} · 敏捷 ${d.当前敏捷 ?? '-'}/${d.敏捷 ?? '-'} · 人性 ${d.当前人性 ?? '-'}/${d.人性 ?? '-'} · 运气 ${d.运气 ?? '-'}</div>
    <div class="ppw-clone-ab">能力：${esc(this.abilityText(d))}</div>
  </div>
  <div class="ppw-clone-ops">${ops}</div>
</div>`;
  },
render(win, gate) {
    const st = this.state(win);
    if (st.view === 'certify') return this.renderCertify(win, gate);
    if (st.view === 'result') return this.renderResult(win, gate);
    if (st.view === 'story') return this.renderStory(win, gate);
    if (st.view === 'story-result') return this.renderStoryResult(win, gate);
    if (st.view === 'promote') return this.renderPromote(win, gate);
    return this.renderMain(win, gate);
  },
renderMain(win, gate) {
    const st = this.state(win);
    const list = this.records(win.game);
    const marked = this.marked(win.game);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    const bagRows = list.map(c => this.rowHtml(win, c, 'bag')).join('');
    const markRows = marked.map(c => this.rowHtml(win, c, 'marked')).join('');
    const full = have >= cap;
    const notice = String(st.notice || '').trim();
    return `<div class="ppw-card">
  ${notice ? `<p class="ppw-warn">${win.esc(notice)}</p>` : ''}
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>已有秘偶（含已入册） ${have} / ${cap}</b></div>
    <div class="ppw-row">
      <button type="button" class="ppw-btn" data-ppw="to-certify" ${full ? 'disabled' : ''}>勾选人物认证</button>
      <button type="button" class="ppw-btn" data-ppw="to-story" ${full ? 'disabled' : ''}>据剧情认证</button>
    </div>
  </div>
  <p class="ppw-hint">上限随序列提升：序列5 起 3 具，之后每升一整级 +2（0.X 与序列 1 同档）。两条入口：勾选人物列表里已有的角色认证，认证通过只在其客观记录上打一个标记，原有数据一律不动；或指定最新正文、最近 ${this.JOURNEY_PICK} 条小总结中的某一条，据剧情认证出一具新秘偶。秘偶途径不限，可以是任何途径，旧日与支柱也可以。编入我方一律由你亲自操控。袋内秘偶在战斗结算中阵亡会被销毁；已入册秘偶从人物列表删除即等于损毁。</p>
  ${full ? '<p class="ppw-warn">秘偶数量已达上限（含已入册的），先销毁、取消认证或从人物列表删除一具再认。</p>' : ''}
  <p class="ppw-sect-label">袋内秘偶</p>
  ${bagRows || '<p class="ppw-hint">还没有袋内秘偶。</p>'}
  <p class="ppw-sect-label">已入册秘偶</p>
  ${markRows || '<p class="ppw-hint">还没有已入册的秘偶。</p>'}
</div>`;
  },
renderCertify(win, gate) {
    const esc = win.esc.bind(win);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    const list = this.candidates(win.game);

    let body = '';
    if (!list.length) {
      body = '<p class="ppw-hint">人物列表里没有可认证的角色（已认证过的与袋内同名的不再列出）。</p>';
    } else {
      const rows = list.map(c => `<div class="ppw-mat" data-idx="${c.idx}">
  <label class="ppw-mat-hit">
    <input type="checkbox" class="mrn-cand-cb" />
    <span class="ppw-mat-main">
      <span class="ppw-mat-name">${esc(c.name)}</span>
      <span class="ppw-mat-meta">${esc(c.序列)} · ${esc(c.体系)} · 关系 ${esc(c.关系)} · 好感 ${esc(c.好感度)} · ${esc(c.地点)}</span>
    </span>
  </label>
</div>`).join('');
      body = `<details class="ppw-group" open><summary>人物列表（${list.length}）</summary>${rows}</details>`;
    }

    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>勾选人物认证</b>　<span class="ppw-hint">还可再认 ${Math.max(0, cap - have)} 具</span></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">勾选你认为已经是秘偶的角色，一次裁定全部勾选项。通过的只在客观记录上打一个标记，序列、六维、性格、记忆等原有数据一个字都不改，也不会重算属性。</p>
  ${body}
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="certify" ${win.isBusy ? 'disabled' : ''}>${win.isBusy ? '认证中…' : '开始认证'}</button>
  </div>
</div>`;
  },
renderResult(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const rows = (st.results || []).map(r => `<div class="ppw-verdict ${r.ok ? 'ok' : 'no'}">
  <b>${esc(r.name)}</b> —— ${r.ok ? '认证通过，已记为你的秘偶' : '不通过'}
  <div class="ppw-hint">${esc(r.reason)}</div>
</div>`).join('');
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>认证结果</b></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  ${st.lastError ? `<p class="ppw-warn">${esc(st.lastError)}</p>` : ''}
  ${rows || '<p class="ppw-hint">没有可展示的结果。</p>'}
</div>`;
  },
renderStory(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);

    let body = '';
    if (st.loading) {
      body = '<p class="ppw-hint">正在读取小总结…</p>';
    } else {
      const events = Array.isArray(st.events) ? st.events : [];
      // 先带上下标再倒序：靠 indexOf 回查会在重复对象上出错，也白多一层遍历
      const rows = events.map((ev, i) => ({ ev, i })).reverse().map(({ ev, i }) => {
        const checked = String(st.source) === String(i) ? 'checked' : '';
        const detail = String(ev['详细描述'] || '').trim();
        return `<div class="ppw-mat">
  <label class="ppw-mat-hit">
    <input type="radio" name="mrn-src" class="mrn-src-rb" data-src="${i}" ${checked} />
    <span class="ppw-mat-main">
      <span class="ppw-mat-name">${esc(this.eventLabel(ev))}</span>
      <span class="ppw-mat-meta">${esc(detail.slice(0, 60) || '（无详细描述）')}</span>
    </span>
  </label>
</div>`;
      }).join('');
      body = `<div class="ppw-mat">
  <label class="ppw-mat-hit">
    <input type="radio" name="mrn-src" class="mrn-src-rb" data-src="latest" ${st.source === 'latest' ? 'checked' : ''} />
    <span class="ppw-mat-main">
      <span class="ppw-mat-name">最新正文</span>
      <span class="ppw-mat-meta">用上一轮回复的剧情原文作为认定依据</span>
    </span>
  </label>
</div>
<details class="ppw-group" open><summary>最近 ${events.length} 条小总结</summary>${rows || '<p class="ppw-hint">还没有小总结可选。</p>'}</details>`;
    }

    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>据剧情认证</b>　<span class="ppw-hint">还可再认 ${Math.max(0, cap - have)} 具</span></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">选一段剧情作为认定依据。判定官会先看这段剧情里你是否亲手制成了秘偶，再结合大总结、近期事件与最新正文确认它至今仍然可用。同一段剧情里制成多具时会一并认出。</p>
  ${body}
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="story-judge" ${win.isBusy || st.loading ? 'disabled' : ''}>${win.isBusy ? '判定中…' : '开始判定'}</button>
  </div>
</div>`;
  },
renderStoryResult(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    const left = Math.max(0, cap - have);
    const pending = Array.isArray(st.pending) ? st.pending : [];
    const pathways = this.pathwayNames();

    const rows = pending.map((p, i) => {
      const pwOpts = ['<option value="">-- 选择途径 --</option>'].concat(
        pathways.map(pw => `<option value="${esc(pw)}" ${pw === p.pathway ? 'selected' : ''}>${esc(pw)}</option>`)
      ).join('');
      const seqList = p.pathway ? this.seqEntriesOf(p.pathway) : [];
      const seqOpts = ['<option value="">-- 选择序列 --</option>'].concat(
        seqList.map(s => `<option value="${esc(s)}" ${s === p.seqString ? 'selected' : ''}>${esc(s)}</option>`)
      ).join('');
      const warn = p.ok ? '' : `<p class="ppw-warn">模型给的序列名「${esc(p.seqRaw || '空')}」不在清单内，请自己选一个再添加。</p>`;
      return `<div class="ppw-clone" data-mrn-row="${i}">
  <div class="ppw-clone-main">
    <div class="ppw-clone-sub">${esc(p.reason)}</div>
    ${warn}
    <div class="ppw-form">
      <label class="ppw-field"><span>名称</span><input type="text" class="mrn-p-name" value="${esc(p.name)}" /></label>
      <label class="ppw-field"><span>途径（只作筛选，决定下面能选哪些序列）</span><select class="mrn-p-pw" data-ppw-change="pathway">${pwOpts}</select></label>
      <label class="ppw-field"><span>序列名（写入 当前序列 的就是这一条）</span><select class="mrn-p-seq">${seqOpts}</select></label>
    </div>
  </div>
</div>`;
    }).join('');

    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>判定结果</b>　<span class="ppw-hint">来源：${esc(st.storyLabel || '-')}</span></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  ${st.lastError ? `<p class="ppw-warn">${esc(st.lastError)}</p>` : ''}
  ${pending.length ? `<p class="ppw-hint">下列秘偶已通过判定。途径与序列可以改，你是最后一道兜底；改途径只是换一份序列清单，真正写进变量的是那条完整序列名。本次最多还能添加 ${left} 具。</p>` : ''}
  ${rows}
  ${pending.length ? `<div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="story-add">确认添加</button></div>` : '<p class="ppw-hint">本次没有认定出可用的秘偶。</p>'}
</div>`;
  },
renderPromote(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const name = st.promoteName || '';
    const bag = this.bag(win.game, false) || {};
    const rec = bag[name];
    if (!rec) {
      return `<div class="ppw-card">
  <p class="ppw-warn">找不到要入册的秘偶。</p>
  <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
</div>`;
    }
    if (this.snapshotOf(rec)) {
      return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>入册 · ${esc(name)}</b></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">这具秘偶带着入册快照（此前从人物列表退回来的），入册将按原记录原样还原性格、记忆与事件历史，不需要重新填写。</p>
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="do-promote" data-arg="${esc(name)}">按原记录入册</button>
  </div>
</div>`;
    }
    const d = this.promoteDefaults(win);
    const f = this.formField.bind(this, esc);
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>入册 · ${esc(name)}</b></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">下列字段会写入人物关系列表与客观记录。留空则用预填的默认成句，不会写成「未知」。序列、六维与能力清单沿用袋内记录，不在这里改。事件历史固定为空。</p>
  <p class="ppw-hint">${esc(rec.当前序列 || '')} · ${esc(rec.能力体系 || '')}</p>
  <div class="ppw-form">
    ${f('身份', '身份', d.身份)}
    ${f('性格', '性格', d.性格, 'textarea')}
    ${f('外貌', '外貌', d.外貌, 'textarea')}
    ${f('关系', '关系', d.关系)}
    ${f('对<User>的称呼', '对你的称呼', d['对<User>的称呼'])}
    ${f('好感度', '好感度', d.好感度, 'number')}
    ${f('持有物品', '持有物品', d.持有物品)}
    ${f('所处地点', '所处地点', d.所处地点)}
    ${f('正在做的事', '正在做的事', d.正在做的事, 'textarea')}
    ${f('行为链片段', '行为链片段', d.行为链片段, 'textarea')}
    ${f('长期目标', '长期目标', d.长期目标)}
    ${f('近期打算', '近期打算', d.近期打算)}
    ${f('关键记忆', '关键记忆', d.关键记忆, 'textarea')}
  </div>
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="do-promote" data-arg="${esc(name)}">确认入册</button>
  </div>
</div>`;
  },
onChange(win, kind, el) {
    if (kind !== 'pathway' || !el) return;
    const row = el.closest('[data-mrn-row]');
    const seqEl = row && row.querySelector('.mrn-p-seq');
    if (!seqEl) return;
    const list = this.seqEntriesOf(el.value);
    const esc = win.esc.bind(win);
    seqEl.innerHTML = ['<option value="">-- 选择序列 --</option>']
      .concat(list.map(s => `<option value="${esc(s)}">${esc(s)}</option>`))
      .join('');
  },
async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    const st = this.state(win);
    switch (act) {
      case 'to-main':
        st.view = 'main';
        st.results = null;
        st.lastError = '';
        st.promoteName = '';
        st.pending = null;
        st.notice = '';
        win.render();
        break;
      case 'to-certify': st.view = 'certify'; win.render(); break;
      case 'certify': await this.runCertify(win); break;
      case 'to-story': await this.openStory(win); break;
      case 'story-judge': await this.runStory(win); break;
      case 'story-add': await this.addPending(win); break;
      case 'to-promote':
        st.view = 'promote';
        st.promoteName = arg || '';
        win.render();
        break;
      case 'do-promote': await this.doPromote(win, arg); break;
      case 'revert': await this.revert(win, arg); break;
      case 'unmark': await this.unmark(win, arg); break;
      case 'rename': await this.renameRecord(win, arg); break;
      case 'reroll': this.rerollRecord(win, arg); break;
      case 'drop': this.dropRecord(win, arg); break;
      default: break;
    }
  },
collectPicks(win) {
    const list = this.candidates(win.game);
    const picks = [];
    this.queryAll('.ppw-mat').forEach(row => {
      const cb = row.querySelector('.mrn-cand-cb');
      if (!cb || !cb.checked) return;
      const c = list[parseInt(row.dataset.idx, 10)];
      if (c) picks.push(c);
    });
    return picks;
  },
async runCertify(win) {
    if (win.isBusy) return;
    const gate = this.resolve(win.playerSequence());
    if (!gate.unlocked) { win.msg('当前序列不满足解锁条件'); return; }

    const picks = this.collectPicks(win);
    if (!picks.length) { win.msg('请先勾选至少一个角色'); return; }

    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    if (have + picks.length > cap) {
      win.msg(`秘偶上限 ${cap} 具，你已有 ${have} 具，本次最多再认 ${Math.max(0, cap - have)} 具`, 4000);
      return;
    }
    if (!win.ensureApiReady()) return;

    const st = this.state(win);
    win.isBusy = true;
    if (win.game) win.game.isBackgroundProcessing = true;
    win.render();
    try {
      const sys = this.promptCertify(win.playerName(), win.playerSequence(), this.candidateText(picks));
      const raw = await win.callRaw(sys, this.USER_INPUT_CERTIFY);
      const parsed = this.parseCertifyVerdicts(raw, picks.length);

      st.results = [];
      st.lastError = '';
      if (!parsed) {
        st.lastError = '模型回复格式无法解析，本次按全部不通过处理，什么都没有改动，可直接重试。';
        picks.forEach(p => st.results.push({ name: p.name, ok: false, reason: '未能解析裁定' }));
      } else {
        const mvu = win.game && win.game.currentMvuState;
        let made = 0;
        picks.forEach((p, i) => {
          const v = parsed[i + 1] || { ok: false, reason: '模型漏判了这一条，按不通过处理' };
          if (!v.ok) {
            st.results.push({ name: p.name, ok: false, reason: v.reason });
            return;
          }
          const npc = mvu && mvu.npc_data && mvu.npc_data[p.name];
          if (!npc || typeof npc !== 'object') {
            st.results.push({ name: p.name, ok: false, reason: '人物列表里已找不到这个角色' });
            return;
          }
          // 只加一个标记。刻意不走 NpcObjectiveSchema.parse 再写回：
          // 那个 transform 会重算神性、按配额重分六维、还会触发序列变动检测
          npc[this.MARK] = true;
          made++;
          st.results.push({ name: p.name, ok: true, reason: v.reason });
        });
        if (made > 0) {
          this.syncDisplayAbility(mvu);
          win.persist();
          await win.persistZero();
        }
        win.msg(made > 0 ? `认证通过 ${made} 具秘偶` : '本次没有角色通过认证', 3000);
      }
      st.view = 'result';
    } catch (e) {
      console.error('[秘偶] 认证失败', e);
      st.results = [];
      st.lastError = '调用失败：' + (e.message || e);
      st.view = 'result';
    } finally {
      if (win.game) win.game.isBackgroundProcessing = false;
      win.isBusy = false;
      win.render();
    }
  },
async openStory(win) {
    const st = this.state(win);
    st.view = 'story';
    if (!Array.isArray(st.events)) {
      st.loading = true;
      win.render();
      st.events = await this.journeyList(win);
      st.loading = false;
    }
    win.render();
  },
collectSource(win) {
    let picked = null;
    this.queryAll('.mrn-src-rb').forEach(rb => {
      if (rb.checked) picked = rb.dataset.src;
    });
    return picked;
  },
async runStory(win) {
    if (win.isBusy) return;
    const gate = this.resolve(win.playerSequence());
    if (!gate.unlocked) { win.msg('当前序列不满足解锁条件'); return; }

    const st = this.state(win);
    const picked = this.collectSource(win);
    if (picked === null) { win.msg('请先选一段剧情'); return; }
    st.source = picked === 'latest' ? 'latest' : picked;

    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    if (have >= cap) {
      win.msg(`秘偶数量已达上限 ${cap} 具`, 4000);
      return;
    }

    const sel = this.selectedStory(win);
    if (!sel) { win.msg('这段剧情取不到内容，换一段试试'); return; }
    if (!win.ensureApiReady()) return;

    win.isBusy = true;
    if (win.game) win.game.isBackgroundProcessing = true;
    win.render();
    try {
      const owned = this.records(win.game).map(c => c.name)
        .concat(this.marked(win.game).map(c => c.name));
      const sys = this.promptStory(
        win.playerName(),
        win.playerSequence(),
        this.pathwayText(),
        owned.length ? owned.join('、') : '（暂无）',
      );
      const raw = await win.callRaw(sys, this.USER_INPUT_STORY, sel.text);
      const parsed = this.parseStoryVerdicts(raw);

      st.lastError = '';
      st.storyLabel = sel.source;
      if (!parsed) {
        st.pending = [];
        st.lastError = '模型回复格式无法解析，本次什么都没有添加，可直接重试。';
      } else if (!parsed.passed.length) {
        st.pending = [];
        st.lastError = parsed.reject
          ? `判定不通过：${parsed.reject}`
          : '本次没有认定出秘偶。';
      } else {
        st.pending = parsed.passed;
      }
      st.view = 'story-result';
    } catch (e) {
      console.error('[秘偶] 剧情判定失败', e);
      st.pending = [];
      st.lastError = '调用失败：' + (e.message || e);
      st.view = 'story-result';
    } finally {
      if (win.game) win.game.isBackgroundProcessing = false;
      win.isBusy = false;
      win.render();
    }
  },
async addPending(win) {
    const st = this.state(win);
    const pending = Array.isArray(st.pending) ? st.pending : [];
    if (!pending.length) { win.msg('没有待添加的秘偶'); return; }

    const gate = this.resolve(win.playerSequence());
    const cap = this.capOf(gate.rank);
    let have = this.occupied(win.game);

    const rows = [];
    this.queryAll('[data-mrn-row]').forEach(row => {
      const i = parseInt(row.dataset.mrnRow, 10);
      const src = pending[i];
      if (!src) return;
      const nameEl = row.querySelector('.mrn-p-name');
      const seqEl = row.querySelector('.mrn-p-seq');
      rows.push({
        name: String((nameEl && nameEl.value) || '').trim(),
        seqString: String((seqEl && seqEl.value) || '').trim(),
        reason: src.reason,
      });
    });

    const notes = [];
    let bag = null;
    let made = 0;
    for (const r of rows) {
      if (!r.name) { notes.push('有一行没填名称，已跳过'); continue; }
      if (!r.seqString) { notes.push(`「${r.name}」没有选序列名，已跳过`); continue; }
      const hit = this.findSeqString(r.seqString);
      if (!hit) { notes.push(`「${r.name}」的序列名不在清单内，已跳过`); continue; }
      const why = this.nameTaken(win.game, r.name);
      if (why) { notes.push(`「${r.name}」${why}，已跳过`); continue; }
      if (have >= cap) { notes.push(`「${r.name}」上限不足，已跳过`); continue; }
      // 惰性建壳：一具都没成时，不该在 stat_data 里留下一个空的秘偶列表
      if (!bag) bag = this.bag(win.game, true);
      bag[r.name] = this.buildRecord(r.name, hit.seqString, st.storyLabel || '');
      have++;
      made++;
    }

    if (made > 0) {
      this.syncDisplayAbility(win.game && win.game.currentMvuState);
      win.persist();
    }
    st.pending = null;
    // 跳过原因要留在界面上：toast 一闪就没了，玩家会以为秘偶凭空少了一具
    st.notice = notes.join('；');
    st.view = 'main';
    win.msg(made > 0 ? `已添加 ${made} 具秘偶${notes.length ? '，另有若干被跳过' : ''}` : (notes[0] || '没有可添加的秘偶'), 4000);
    win.render();
  }
};
    MarionetteMode.resolve = deps.resolveGate;
    MarionetteMode.scope = deps.scope;
    MarionetteMode.queryAll = selector => Array.from(deps.scope()?.querySelectorAll(selector) || []);
    MarionetteMode.journeyList = deps.evidenceList;
    MarionetteMode.rollAbilities = deps.rollAbilities;
    MarionetteMode.buildRecord = (name, sequence, source) => ({
      ...deps.synthesize(sequence), 名称: name, 能力清单: deps.rollAbilities(sequence),
      $战斗经验: 0, $战斗经验等级: 0,
      $id: 'puppet-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4),
      $创建时间: new Date().toISOString(), $来源剧情: String(source || ''),
    });
    return MarionetteMode;
  }
  const api = { create, rank: parseSequenceRank, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
