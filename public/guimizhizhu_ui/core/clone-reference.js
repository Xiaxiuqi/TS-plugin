// Generated from complete original MarauderCloneMode; native adapters are in clone-state.js.
(() => {
  'use strict';
  const KEY = 'cryptLord.cloneReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
  function create(deps) {
    const window = deps.window || globalThis.window;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const NpcObjectiveSchema = { parse: deps.validateObjective };
    const NpcSubjectiveSchema = { parse: deps.validateSubjective };
    const getAbilitySystemFromWorldbook = sequence => deps.synthesize(sequence).能力体系;
    const getPureName = text => {
      const pure = String(text || '').replace(/[【】]/g, '').trim()
        .replace(/^序列\d+(\.\d+)?[-—\s]?/, '').trim();
      return pure.includes('旧日侍者') ? pure : pure.replace(/^(旧日|支柱)[-—\s]?/, '').trim();
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
const MarauderCloneMode = {
id: 'marauder-clone',
途径: '偷盗者',
途径全名: '偷盗者途径',
名称: '分身',
图标: '👥',
GATE: 4,
TITLE: '诡秘之主',
BASE_CAP: 3,
CAP_STEP: 2,
BAG_SOURCE: 'clone',
PARASITE_MARK: '$寄生分身',
SNAPSHOT: '$入册快照',
FIRST_NARRATIVE_MARK: '$分身首次外放已询问',
ORIGIN_KEY: '$来源',
ORIGIN_PARASITE: '寄生',
STAT_KEYS: ['活力', '敏捷', '灵性', '理智', '人性', '运气'],
JOURNEY_PICK: 100,
MATERIAL_CATS: [
    { title: '武器', keys: ['武器列表'], stackable: false },
    { title: '衣物', keys: ['衣物列表'], stackable: false },
    { title: '饰品', keys: ['饰品列表'], stackable: false },
    { title: '封印物', keys: ['封印物列表'], stackable: false },
    { title: '消耗品', keys: ['消耗品列表'], stackable: true },
    { title: '杂物', keys: ['其他列表', '杂物列表'], stackable: true },
  ],
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
    const path = ['$专属玩法', this.途径全名, '分身玩法', '分身列表'];
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
clones(game) {
    const bag = this.bag(game, false) || {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && bag[k] && typeof bag[k] === 'object')
      .map(k => ({ name: k, data: bag[k] }));
  },
npcPool(game) {
    return (game && game.currentMvuState && game.currentMvuState.npc_data) || {};
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
converted(game) {
    return this.convertedOfPool(this.npcPool(game));
  },
isParasite(rec) {
    return !!(rec && typeof rec === 'object' && rec[this.PARASITE_MARK] === true);
  },
parasitesOfPool(pool) {
    const bag = (pool && typeof pool === 'object') ? pool : {};
    return Object.keys(bag)
      .filter(k => k !== '$meta' && this.isParasite(bag[k]))
      .map(k => ({ name: k, data: bag[k] }));
  },
parasites(game) {
    return this.parasitesOfPool(this.npcPool(game));
  },
parasitesOfState(mvuState) {
    return this.parasitesOfPool(this.npcPoolOfState(mvuState));
  },
occupied(game) {
    return this.clones(game).length + this.converted(game).length + this.parasites(game).length;
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
convertedOfState(mvuState) {
    return this.convertedOfPool(this.npcPoolOfState(mvuState));
  },
recordOfState(mvuState, name) {
    const bag = this.bagOfState(mvuState);
    const rec = bag && bag[name];
    return (rec && typeof rec === 'object') ? rec : null;
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
  },
uniqueName(game, base) {
    const bag = this.bag(game, false) || {};
    const npc = (game && game.currentMvuState && game.currentMvuState.npc_data) || {};
    const taken = (n) => Object.prototype.hasOwnProperty.call(bag, n)
      || Object.prototype.hasOwnProperty.call(npc, n);
    if (!taken(base)) return base;
    const ORD = ['二', '三', '四', '五', '六', '七', '八', '九', '十'];
    for (let i = 0; i < ORD.length; i++) {
      const n = `${base}·${ORD[i]}`;
      if (!taken(n)) return n;
    }
    let i = 11;
    while (taken(`${base}·${i}`)) i++;
    return `${base}·${i}`;
  },
relPool(game) {
    const sd = (game && game.currentMvuState && game.currentMvuState.stat_data) || null;
    const rel = sd && sd.人物关系列表;
    return (rel && typeof rel === 'object' && !Array.isArray(rel)) ? rel : {};
  },
nameTaken(game, name) {
    const n = String(name || '').trim();
    if (!n) return '名字为空';
    const has = (obj) => !!(obj && Object.prototype.hasOwnProperty.call(obj, n) && obj[n]);
    if (has(this.bag(game, false))) return '袋里已有同名分身';
    const npc = this.npcPool(game);
    if (has(npc) && this.isParasite(npc[n])) return '已认定过这具寄生分身';
    if (has(npc)) return '人物列表里已有同名角色，请改用「勾选人物认定」';
    if (has(this.relPool(game))) return '人物关系列表里已有同名角色，请改用「勾选人物认定」';
    return '';
  },
materials(game) {
    const sd = (game && game.currentMvuState && game.currentMvuState.stat_data) || null;
    if (!sd) return [];
    const out = [];
    this.MATERIAL_CATS.forEach(cat => {
      cat.keys.forEach(listKey => {
        const list = sd[listKey];
        if (!list || typeof list !== 'object' || Array.isArray(list)) return;
        Object.keys(list).forEach(itemKey => {
          if (itemKey === '$meta') return;
          const item = list[itemKey];
          if (!item || typeof item !== 'object') return;
          const 名称 = String(item.名称 || item.name || itemKey || '').trim();
          if (!名称) return;
          const hasQty = Object.prototype.hasOwnProperty.call(item, '数量');
          const qty = hasQty ? (Number(item.数量) || 0) : 1;
          if (hasQty && qty <= 0.05) return;
          out.push({
            // 索引在 materials() 全部收完后统一回填，见下方。
            // 刻意不用「列表键+条目键」拼字符串当 id：条目键是 AI 写的中文，
            // 拼出来的东西塞进 HTML 属性与 CSS 选择器都不安全
            idx: 0,
            分类: cat.title,
            listKey,
            itemKey,
            名称,
            序列: String(item.序列 || item.品阶 || '').trim() || '-',
            途径: String(item.途径 || '').trim() || '-',
            类型: String(item.类型 || item.种类 || '').trim() || '-',
            描述: String(item.描述 || '').trim() || '-',
            可堆叠: !!(cat.stackable && hasQty),
            持有: hasQty ? Math.max(1, Math.floor(qty)) : 1,
          });
        });
      });
    });
    out.forEach((m, i) => { m.idx = i; });
    return out;
  },
consume(game, pick) {
    const sd = (game && game.currentMvuState && game.currentMvuState.stat_data) || null;
    if (!sd) return { changed: false, equipmentChanged: false };
    const list = sd[pick.listKey];
    if (!list || typeof list !== 'object') return { changed: false, equipmentChanged: false };
    const item = list[pick.itemKey];
    if (!item || typeof item !== 'object') return { changed: false, equipmentChanged: false };
    let removed = false;
    const wasEquipped = item.isEquipped === true;
    if (Object.prototype.hasOwnProperty.call(item, '数量')) {
      const left = (Number(item.数量) || 0) - (Number(pick.份数) || 0);
      if (left <= 0.05) {
        if (wasEquipped) item.isEquipped = false;
        delete list[pick.itemKey];
        removed = true;
      }
      else item.数量 = Math.round(left * 100) / 100;
    } else {
      if (wasEquipped) item.isEquipped = false;
      delete list[pick.itemKey];
      removed = true;
    }
    return { changed: true, equipmentChanged: removed && wasEquipped };
  },
materialText(picks) {
    return picks.map((p, i) =>
      `[${i + 1}] ${p.名称} | 序列:${p.序列} | 途径:${p.途径} | 类型:${p.类型} | 描述:${p.描述}`
    ).join('\n');
  },
prompt(playerName, sequence, materialText) {
    return `你是「偷盗者途径 · 分身」玩法的判定官。

玩家【${playerName}】的当前序列是【${sequence}】。他要用下列材料制造分身，
请你只依据提供的历史事件、近期事件与最新剧情，逐份判断这些材料能否用于制造分身。

## 本玩法的铁则

1. 能用来制造分身的，只有「偷盗者途径的非凡特性」。下列三种情形都算，居其一即可：
   - 材料本身就是一份偷盗者途径的非凡特性；
   - 材料（装备、封印物、物品等）本身属于偷盗者途径；
   - 材料内部蕴含着一份偷盗者途径的特性。
2. 与偷盗者途径无关的一切东西都不行——别的途径的物品与特性、纯粹的凡物、
   情报素材之类，一律不行。
3. 分身固定属于偷盗者途径，不因材料原本的形制或来历而改变。
4. 分身的序列，等于那份偷盗者非凡特性的序列：材料本身即是特性或偷盗者途径之物时，
   取材料自身的序列；材料只是蕴含着某份特性、且那份特性另有序列时，以所蕴含的
   那份特性的序列为准。不得自行拔高或压低。

## 判定标准

- 通过：材料属于偷盗者途径，或其中确实蕴含一份偷盗者途径的特性，且序列可以判明。
- 不通过：材料与偷盗者途径无关；或虽有关联，但那份特性的序列无从判明。

严禁脑补材料清单与剧情里没有的情节。拿不准的一律判不通过。

## 待判材料

${materialText}

## 输出格式

只输出一个 <裁定> 块。块内每份材料占一行，除此之外不要输出任何其它内容、
解释、标签或空行。

<裁定>
编号|通过|分身序列|理由
编号|不通过||理由
</裁定>

- 编号：原样照抄上面材料清单的编号。一份材料一行，不得增补、遗漏或调换顺序。
- 第二段：只能写「通过」或「不通过」，不要写别的词。
- 第三段：判通过时，填 0 到 9 的阿拉伯数字，即分身的序列，只写数字本身，
  不要写「序列」二字；判不通过时留空，两根竖线紧挨着写。
- 第四段：理由，一句话，40 字以内，其中不得出现竖线与换行。`;
  },
USER_INPUT: '请逐条裁定：上列材料中，哪些可以用于制造我的偷盗者分身？',
parseVerdicts(raw, count) {
    const block = String(raw || '').match(/<裁定>([\s\S]*?)<\/裁定>/);
    if (!block) return null;
    const out = {};
    block[1].split(/\r?\n/).forEach(line => {
      const seg = line.trim().split('|');
      if (seg.length < 2) return;
      const idx = parseInt(String(seg[0]).replace(/[^0-9]/g, ''), 10);
      if (!Number.isInteger(idx) || idx < 1 || idx > count) return;
      const verdict = String(seg[1] || '');
      const passed = /通过/.test(verdict) && !/不通过|未通过/.test(verdict);
      let rank = null;
      if (passed) {
        // 模型有时会把「4」写成「序列4」，抽第一个数字即可
        const m = String(seg[2] || '').match(/\d+/);
        const n = m ? parseInt(m[0], 10) : NaN;
        if (Number.isInteger(n) && n >= 0 && n <= 9) rank = n;
      }
      out[idx] = {
        ok: passed && rank !== null,
        rank,
        reason: String(seg[3] || '').trim()
          || (passed && rank === null ? '模型未给出可用的分身序列' : '（模型未给出理由）'),
      };
    });
    return Object.keys(out).length ? out : null;
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
    return `你是「偷盗者途径 · 分身」玩法的认证官。

玩家【${playerName}】的当前序列是【${sequence}】。他声称下列角色已经被他寄生、
因而也是他的分身，请你只依据 <历史事件>、<近期事件> 与 <最新剧情> 三段材料，
逐个判断这些角色能否被认证为他的寄生分身。若某段材料未提供，或小总结以
[小总结原文] 的形式给出，就以实际给到的内容为准。

## 本玩法的铁则

1. 寄生是偷盗者途径的产物：施术者把自身的一部分——意识、灵性、血肉或某种造物
   ——侵入目标体内，占据这具身体，使它成为自己的另一具身体。下列情形都算，
   居其一即可：
   - 剧情明确写到玩家寄生了这个对象；
   - 剧情明确写到玩家以寄生、侵入体内、种入自身一部分一类手段，把这个对象
     变成了自己的载体、替身或另一具身体。
2. 只有玩家亲手寄生的才算。别人寄生的、别人操控的、他人转让的、缴获得来的、
   来历不明的，一律不行。
3. 没有「被玩家寄生」这一环的，一律不行——仆从、雇员、部下、盟友、信徒、
   受玩家胁迫或听命于玩家的活人，无论多么忠诚顺从，都不是寄生分身。
4. 寄生与其它操控手段不是一回事。秘偶化、傀儡化、征服、奴役、驯化、附身、
   夺舍、精神控制、契约、召唤，全都不算寄生。玩家只是控制或指使了这个对象，
   而没有把自身的一部分侵入它体内的，同样不算。
5. 必须仍然有效。截至 <最新剧情>，若这份寄生已被驱逐、被剥离，宿主已死亡、
   已脱离玩家控制、已失控，或已被玩家自己解除、放弃，一律不行。
6. 不要判断这个角色的途径、序列或强弱。那些沿用已有记录，与本次认证无关。
   凡人同样可以被寄生，不要因为对方是凡人就判不通过。

## 判定标准

- 通过：材料中确有玩家亲手寄生这个对象的明确一环，且截至 <最新剧情>
  这份寄生仍然有效。
- 不通过：材料中没有这一环；或那只是别的操控手段；或曾经有过，但如今已被
  驱逐、剥离，宿主已死亡，或已失控、易主、解除。

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
USER_INPUT_CERTIFY: '请逐条认证：上列角色中，哪些确实已经被我寄生、算作我的分身？',
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
promptStory(playerName, sequence, pathwayText, existingNames) {
    return `你是「偷盗者途径 · 分身」玩法的认证官。

玩家【${playerName}】的当前序列是【${sequence}】。他指定了 <指定剧情> 这一段，
主张自己在其中寄生了某个对象、从而多出一具分身。请你结合 <历史事件>、
<近期事件> 与 <最新剧情>，判断这一主张是否成立。若某段材料未提供，或小总结以
[小总结原文] 的形式给出，就以实际给到的内容为准。

## 本玩法的铁则

1. 寄生是偷盗者途径的产物：施术者把自身的一部分——意识、灵性、血肉或某种造物
   ——侵入目标体内，占据这具身体，使它成为自己的另一具身体。下列情形都算，
   居其一即可：
   - <指定剧情> 里玩家寄生了这个对象；
   - <指定剧情> 里玩家以寄生、侵入体内、种入自身一部分一类手段，把这个对象
     变成了自己的载体、替身或另一具身体。
2. 只有玩家亲手寄生的才算。别人寄生的、别人操控的、他人转让的、缴获得来的、
   来历不明的，一律不行。
3. 没有「被玩家寄生」这一环的，一律不行——仆从、雇员、部下、盟友、信徒、
   受玩家胁迫或听命于玩家的活人，无论多么忠诚顺从，都不是寄生分身。
4. 寄生与其它操控手段不是一回事。秘偶化、傀儡化、征服、奴役、驯化、附身、
   夺舍、精神控制、契约、召唤，全都不算寄生。玩家只是控制或指使了这个对象，
   而没有把自身的一部分侵入它体内的，同样不算。
5. 两道关必须同时过：
   - 第一关只看 <指定剧情>：这段剧情里确实发生了「玩家亲手寄生某个对象」这件事；
   - 第二关看 <历史事件>、<近期事件> 与 <最新剧情>：截至 <最新剧情>，这份寄生
     没有被驱逐、被剥离，宿主没有死亡，没有脱离控制、失控，也没有被玩家自己
     解除或放弃，现在仍然有效。
   只过第一关、第二关不过的，判不通过。
6. 寄生分身的途径不限，可能是任何途径，也不必与玩家自己的途径相同——它沿用的
   是宿主本人的途径与序列，不是玩家的。凡人同样可以被寄生。
7. 寄生分身的序列，必须从下面的【序列名清单】里原样照抄一条完整序列名，
   例如「序列5-秘偶大师」「旧日-恶魔之父」「支柱-诡秘之主」。
   - 不得只写数字，不得只写称号，不得改动清单里的任何一个字；
   - 旧日与支柱同样可以被寄生，照抄对应那一条即可；
   - 取 <指定剧情> 中可以判明的那一档，不得自行拔高或压低；
   - 宿主是没有非凡序列的凡人时，第三段只写「普通人」三个字，
     这是清单之外唯一允许的写法；
   - 宿主确实是非凡者、但序列无从判明的，判不通过。
8. 不要输出这具分身的属性、六维、能力，那些由系统按序列自行计算。
9. 下列分身玩家已经拥有，若 <指定剧情> 说的正是其中某一具，判不通过并在理由里
   注明重复：${existingNames}

## 序列名清单

${pathwayText}

## 判定标准

- 通过：<指定剧情> 中确有玩家亲手寄生某个对象的明确一环，该寄生截至 <最新剧情>
  仍然有效，且序列名能够判明（凡人写「普通人」）。
- 不通过：<指定剧情> 里没有这一环；或那只是别的操控手段；或寄生已被驱逐、剥离，
  宿主已死亡，或已失控、易主、解除；或宿主是非凡者而序列无从判明；
  或与已有分身重复。

严禁脑补 <指定剧情> 与其余材料里没有的情节。拿不准的一律判不通过。

## 输出格式

只输出一个 <裁定> 块。块内一具分身占一行，除此之外不要输出任何其它内容、
解释、标签或空行。同一段剧情里确实寄生了多个对象时，一具写一行。

<裁定>
通过|名称|序列名|理由
</裁定>

没有任何可认定的寄生分身时，只写一行：

<裁定>
不通过|||理由
</裁定>

- 第一段：只能写「通过」或「不通过」，不要写别的词。
- 第二段：名称。剧情里有名字就原样照抄；没有名字就用剧情中对它的称法，
  不超过 10 字，不要自创华丽名号。判不通过时留空。
- 第三段：从【序列名清单】里原样照抄的完整序列名，或「普通人」。判不通过时留空。
- 第四段：理由，一句话，40 字以内，其中不得出现竖线与换行。
- 判不通过时，中间两段留空，竖线紧挨着写。`;
  },
USER_INPUT_STORY: '请裁定：我在这段剧情里寄生得来的分身，是否成立且至今仍然有效？',
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
      const hit = PathwaySeqUtil.findSeqString(seqRaw);
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
seqStringOf(rank) {
    const db = (typeof GameDBManager !== 'undefined' && GameDBManager.DB)
      ? GameDBManager.DB.godPathways : null;
    const list = db && (db[this.途径全名] || db[this.途径]);
    if (Array.isArray(list)) {
      const found = list.find(s => typeof s === 'string' && parseSequenceRank(s) === rank);
      if (found) return found;
    }
    console.warn(`[分身] 途径库里查不到偷盗者序列 ${rank}，回落占位名`);
    return `序列${rank}-${this.途径}`;
  },
shortDate(win) {
    const era = String((win.game && win.game.currentMvuState
      && win.game.currentMvuState.world_data
      && win.game.currentMvuState.world_data.当前时间纪元) || '');
    const m = era.match(/(\d+年\d+月\d+日)/);
    return (m && m[1]) || '具现当日';
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
isParasiteRecord(rec) {
    return !!(rec && rec[this.ORIGIN_KEY] === this.ORIGIN_PARASITE);
  },
promoteDefaults(win, rec) {
    const player = win.playerName();
    const place = this.playerPlace(win);
    const date = this.shortDate(win);
    if (this.isParasiteRecord(rec)) {
      return {
        身份: `被${player}寄生的宿主，实为${player}的一具分身。`,
        性格: `原本的意识已被${player}压住，言行完全出自${player}。`,
        外貌: '与被寄生之前的形貌相同，看不出异样',
        关系: `${player}的寄生分身`,
        '对<User>的称呼': '你',
        好感度: 150,
        持有物品: '一套衣服',
        所处地点: place,
        正在做的事: `在${place}按${player}的意志行动。`,
        行为链片段: `维持这具身体的常态 -> 留在${place}附近 -> 执行${player}的意志`,
        长期目标: `守住这具身体，按${player}的需要行事`,
        近期打算: `不引人注意地待着，等${player}的指示 | 此刻`,
        关键记忆键: `${date}_被寄生`,
        关键记忆: `${date}|${place}|被${player}以偷盗者途径的寄生侵入体内，此后这具身体听凭${player}驱使。`,
      };
    }
    return {
      身份: `${player}的分身。`,
      性格: `有独立意识，服从${player}。`,
      外貌: `与${player}的外貌完全相同`,
      关系: `${player}的分身`,
      '对<User>的称呼': '你',
      好感度: 150,
      持有物品: '一套衣服',
      所处地点: place,
      正在做的事: `在${place}按${player}的吩咐活动。`,
      行为链片段: `确认自身存在 -> 留在${place}附近 -> 等待${player}的指示`,
      长期目标: `维持自身存在，按${player}的需要行事`,
      近期打算: `熟悉处境，等待${player}的指示 | 此刻`,
      关键记忆键: `${date}_具现独立`,
      关键记忆: `${date}|${place}|由${player}以偷盗者权柄具现为独立个体，开始与本体分开行动。`,
    };
  },
collectPromoteForm(win, defaults) {
    const out = Object.assign({}, defaults);
    this.queryAll('[data-ppw-field]').forEach(el => {
      const key = el.dataset.ppwField;
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
cloneNarrativeContext(win, name, obj, subj) {
    return {
      player: win.playerName(),
      time: String((win.game && win.game.currentMvuState && win.game.currentMvuState.world_data
        && win.game.currentMvuState.world_data.当前时间纪元) || '').trim() || '当前时刻',
      place: String(obj.所处地点 || subj.所处地点 || this.playerPlace(win)),
      name: String(name || obj.名称 || ''),
      sequence: String(obj.当前序列 || '未知'),
      identity: String(obj.身份 || subj.身份 || '未知'),
      appearance: String(obj.外貌 || subj.外貌 || '未知'),
      personality: String(obj.性格 || subj.性格 || '未知'),
      relation: String(subj.关系 || '未知'),
      address: String(subj['对<User>的称呼'] || '你'),
      material: String(obj['$来源材料'] || '未记录'),
    };
  },
cloneNarrativeData(c) {
    return `【当前时空】\n时间：${c.time}\n地点：${c.place}\n\n【本体】\n名称：${c.player}\n\n【分身资料】\n名称：${c.name}\n当前序列：${c.sequence}\n身份：${c.identity}\n外貌：${c.appearance}\n性格：${c.personality}\n与本体的关系：${c.relation}\n对本体的称呼：${c.address}\n来源材料：${c.material}`;
  },
buildCloneCreatePrompt(win, name, obj, subj) {
    const c = this.cloneNarrativeContext(win, name, obj, subj);
    return `[系统指令]:前端已经完成「偷盗者途径分身外放」的角色与变量结算。下列事实均已成立，本轮严禁重新检定、否定、撤销或改写结算结果。\n\n请结合当前最新剧情，在正文中完整演绎：${c.player}运用偷盗者途径的力量创造分身「${c.name}」，使其作为具有自我意识、能够与本体分开行动的个体正式出现。\n\n${this.cloneNarrativeData(c)}\n\n【既定事实】\n1. 「${c.name}」就是前端已经建立人物记录的同一个分身，不得再创造第二个同名分身。\n2. 分身创造已经成功，不得重新进行成功率或材料判定。\n3. 普通分身在被创造时默认已经拥有自我意识，不需要再经过一次“授予自主权”或“意识觉醒”仪式。\n4. 「${c.name}」具有独立意识，可以与本体分开观察、交流和行动，但其既定性格为服从${c.player}。\n5. 它是偷盗者途径的分身，不得改写成秘偶、寄生宿主、召唤物、历史投影或通识者造物。\n\n【演绎要求】\n1. 从当前最新剧情自然衔接分身创造过程，合理表现偷盗者途径力量、来源材料与分身形体逐渐稳定的过程。\n2. 重点描写分身第一次确认自身存在、观察本体和环境、开口交流或主动行动。\n3. 不得把分身写成没有意识、只能被远程操纵的空壳；它从创造完成起就具有自己的感知与思考。\n4. 分身的外貌、性格和说话方式必须符合【分身资料】。\n5. 正文中不得出现“前端”“变量”“系统指令”“数据记录”“玩家点击”等元叙事词汇。\n6. 不要输出分析、规则说明或再次确认，直接输出完整、连贯的剧情正文。`;
  },
buildCloneCustomPrompt(win, name, obj, subj, customText) {
    const c = this.cloneNarrativeContext(win, name, obj, subj);
    return `[系统指令]:前端已经完成「偷盗者途径分身外放」的角色与变量结算。分身「${c.name}」已经被成功创造、具有自我意识并成为正式人物。以上事实严禁重新检定、否定、撤销或改写。\n\n请以玩家提供的【自定义登场场景】为主要演绎要求，将分身「${c.name}」自然写入当前正文。\n\n【玩家自定义登场场景】\n${String(customText || '').trim()}\n\n${this.cloneNarrativeData(c)}\n\n【不可改写的事实】\n1. 「${c.name}」就是前端已经建立人物记录的同一个分身，不得生成第二个同名个体。\n2. 它已经被成功创造并且天然具有自我意识，不需要额外的意识觉醒或自主权授予。\n3. 它能够与本体分开观察、交流和行动，但既定性格为服从${c.player}。\n4. 它是偷盗者途径分身，不得改写成秘偶、寄生宿主、召唤物、历史投影或通识者造物。\n5. 如果【玩家自定义登场场景】没有描述创造过程，就不得擅自补写创造过程。\n6. 如果自定义内容与已经结算的分身身份或自我意识冲突，保留已结算事实，只采用能够与其相容的内容。\n\n【演绎要求】\n1. 优先遵循【玩家自定义登场场景】中的地点、登场方式、人物互动、气氛和剧情目标。\n2. 补足动作、对话、环境与前后衔接，使其成为完整、连续的正文。\n3. 「${c.name}」的言行必须符合【性格】。\n4. 正文中不得出现“前端”“变量”“系统指令”“数据记录”“玩家点击”等元叙事词汇。\n5. 不要输出分析、规则说明或再次确认，直接输出完整、连贯的剧情正文。`;
  },
async offerCloneNarrative(win, name, obj, subj) {
    const choice = await win.chooseNarrative('首次外放演绎', `是否把分身“${name}”被创造的场景写入正文输入框？`, [
      { value: 'create', text: '演绎分身被创造' },
      { value: 'custom', text: '自定义登场场景' },
      { value: 'skip', text: '不演绎', className: 'ghost' },
    ]);
    if (!choice || choice === 'skip') return;
    if (choice === 'create') {
      win.writeNarrativeToInput(this.buildCloneCreatePrompt(win, name, obj, subj));
      return;
    }
    const custom = await win.promptNarrativeText('自定义分身登场场景', '填写希望正文采用的地点、登场方式、人物互动、气氛或剧情目标。');
    if (!custom) return;
    win.writeNarrativeToInput(this.buildCloneCustomPrompt(win, name, obj, subj, custom));
  },
formField(esc, key, label, value, kind) {
    const v = esc(value);
    if (kind === 'textarea') {
      return `<label class="ppw-field"><span>${esc(label)}</span><textarea data-ppw-field="${esc(key)}" rows="2">${v}</textarea></label>`;
    }
    if (kind === 'number') {
      return `<label class="ppw-field"><span>${esc(label)}</span><input type="number" data-ppw-field="${esc(key)}" value="${v}" /></label>`;
    }
    return `<label class="ppw-field"><span>${esc(label)}</span><input type="text" data-ppw-field="${esc(key)}" value="${v}" /></label>`;
  },
cloneRowHtml(win, c, kind) {
    const esc = win.esc.bind(win);
    const d = c.data || {};
    let ops;
    if (kind === 'converted') {
      ops = `<button type="button" class="ppw-btn ghost" data-ppw="revert" data-arg="${esc(c.name)}">退回袋内</button>`;
    } else if (kind === 'parasite') {
      ops = `<button type="button" class="ppw-btn ghost" data-ppw="revert" data-arg="${esc(c.name)}">退回袋内</button>
    <button type="button" class="ppw-btn ghost" data-ppw="unmark" data-arg="${esc(c.name)}">取消认定</button>`;
    } else {
      ops = `<button type="button" class="ppw-btn ghost" data-ppw="to-promote" data-arg="${esc(c.name)}">${this.isParasiteRecord(d) ? '入册' : '转为常规角色'}</button>
    <button type="button" class="ppw-btn ghost" data-ppw="rename" data-arg="${esc(c.name)}">改名</button>
    <button type="button" class="ppw-btn ghost" data-ppw="reroll" data-arg="${esc(c.name)}">🎲 重抽能力</button>
    <button type="button" class="ppw-btn warn" data-ppw="drop" data-arg="${esc(c.name)}">销毁</button>`;
    }
    const tags = [];
    if (kind === 'converted') tags.push('已进入人物列表 · 我方战斗由 AI 操控');
    else if (kind === 'parasite') tags.push('寄生认定 · 已在人物列表 · 我方战斗由 AI 操控');
    else {
      if (this.isParasiteRecord(d)) tags.push('由寄生认定而来');
      if (this.snapshotOf(d)) tags.push('带入册快照 · 入册时原样还原');
    }
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
    const legacySource = npc['$来源材料'] ?? npc['来源材料'];
    if (legacySource != null) rec['$来源材料'] = legacySource;
    if (npc[this.ORIGIN_KEY] != null) rec[this.ORIGIN_KEY] = npc[this.ORIGIN_KEY];
    if (npc['$来源寄生'] != null) rec['$来源寄生'] = npc['$来源寄生'];
    if (npc[this.FIRST_NARRATIVE_MARK] === true) rec[this.FIRST_NARRATIVE_MARK] = true;
    // 认定得来的寄生分身身上没有来源字段，靠标记补一个，退回后仍认得出它是寄生
    if (this.isParasite(npc)) rec[this.ORIGIN_KEY] = this.ORIGIN_PARASITE;
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
      console.warn('[分身] 快照序列化失败，退回后将只保留战斗字段', e);
    }
    return rec;
  },
snapshotOf(rec) {
    const snap = rec && rec[this.SNAPSHOT];
    return (snap && typeof snap === 'object' && snap.客观 && typeof snap.客观 === 'object') ? snap : null;
  },
LEGACY_KEYS: [['id', '$id'], ['创建时间', '$创建时间'], ['来源材料', '$来源材料']],
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
async doPromote(win, name) {
    const bag = this.bag(win.game, false);
    const clone = bag && bag[name];
    if (!clone || typeof clone !== 'object') { win.msg('找不到这个分身'); return; }

    const mvu = this.ensureNpcTables(win.game);
    if (!mvu) { win.msg('存档尚未就绪'); return; }
    if (Object.prototype.hasOwnProperty.call(mvu.npc_data, name) && mvu.npc_data[name]) {
      win.msg('人物列表里已有同名角色，无法入册', 3500);
      return;
    }

    const isParasiteRec = this.isParasiteRecord(clone);
    const markKey = isParasiteRec ? this.PARASITE_MARK : '$分身转化';

    const snap = this.snapshotOf(clone);
    if (snap) {
      const objSnap = this.migrateLegacyKeys(JSON.parse(JSON.stringify(snap.客观)));
      objSnap[markKey] = true;
      mvu.npc_data[name] = objSnap;
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

    const shouldOfferNarrative = !isParasiteRec && clone[this.FIRST_NARRATIVE_MARK] !== true;
    const defaults = this.promoteDefaults(win, clone);
    const filled = this.collectPromoteForm(win, defaults);
    const seq = String(clone.当前序列 || '').trim();
    const sys = String(clone.能力体系 || '').trim();

    const objRaw = Object.assign({}, clone, {
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
      [markKey]: true,
    });
    if (!isParasiteRec) objRaw[this.FIRST_NARRATIVE_MARK] = true;
    delete objRaw[this.SNAPSHOT];
    this.migrateLegacyKeys(objRaw);

    let obj;
    let subj;
    try {
      obj = NpcObjectiveSchema.parse(objRaw);
      obj[markKey] = true;
      if (!isParasiteRec) obj[this.FIRST_NARRATIVE_MARK] = true;
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
      console.error('[分身] 入册校验失败', e);
      win.msg('入册失败：' + (e.message || e), 4000);
      return;
    }

    // 主观序列/体系绝不能落成「未知」：clone 缺字段时用记录自身的值兜底，
    // 但正常分身 buildRecord 一定有当前序列。这里再挡一层空串。
    // 刻意不写死偷盗者：寄生分身沿用的是宿主自己的途径，可能是任何一条，也可能是凡人。
    if (!String(subj.当前序列 || '').trim() || subj.当前序列 === '未知') {
      subj.当前序列 = seq || PathwaySeqUtil.MORTAL;
    }
    if (!String(subj.能力体系 || '').trim() || subj.能力体系 === '未知') {
      subj.能力体系 = sys || getAbilitySystemFromWorldbook(subj.当前序列, '', true);
    }

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
    win.msg(isParasiteRec
      ? `「${name}」已入册，进入人物列表`
      : `「${name}」已转为常规角色，进入人物列表`);
    win.render();
    if (shouldOfferNarrative) {
      try { await this.offerCloneNarrative(win, name, obj, subj); }
      catch (e) { console.warn('[分身] 首次外放演绎弹窗失败', e); }
    }
  },
markKeyOf(npc) {
    if (!npc || typeof npc !== 'object') return '';
    if (npc['$分身转化'] === true) return '$分身转化';
    if (this.isParasite(npc)) return this.PARASITE_MARK;
    return '';
  },
async revertClone(win, name) {
    const npc = this.npcPool(win.game)[name];
    if (!this.markKeyOf(npc)) { win.msg('找不到这个已入册的分身'); return; }
    if (win.game && typeof win.game.showConfirmModal === 'function') {
      const ok = await win.game.showConfirmModal(
        `确定将「${win.esc(name)}」退回为袋内分身？将离开人物列表，性格与记忆存进快照，之后可原样重新入册。`
      );
      if (!ok) return;
    }
    await this.doRevert(win, name);
  },
async doRevert(win, name) {
    const mvu = this.ensureNpcTables(win.game);
    const npc = mvu && mvu.npc_data && mvu.npc_data[name];
    if (!this.markKeyOf(npc)) { win.msg('找不到这个已入册的分身'); return; }
    const bag = this.bag(win.game, true);
    if (Object.prototype.hasOwnProperty.call(bag, name) && bag[name]) {
      win.msg('袋里已有同名分身，无法退回', 3500);
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
    win.msg(`「${name}」已退回为袋内分身`);
    win.render();
  },
async unmark(win, name) {
    const mvu = win.game && win.game.currentMvuState;
    const npc = mvu && mvu.npc_data && mvu.npc_data[name];
    if (!this.isParasite(npc)) { win.msg('找不到这具已认定的寄生分身'); return; }
    if (win.game && typeof win.game.showConfirmModal === 'function') {
      const ok = await win.game.showConfirmModal(
        `确定取消「${win.esc(name)}」的寄生认定？角色本身与其全部数据保持原样，只是不再算作你的分身。`
      );
      if (!ok) return;
    }
    delete npc[this.PARASITE_MARK];
    win.forgetTeamEntry(name);
    this.syncDisplayAbility(mvu);
    win.persist();
    await win.persistZero();
    win.msg(`已取消「${name}」的寄生认定`);
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
        notice: '',
      };
    }
    return win._modeState[this.id];
  },
render(win, gate) {
    const st = this.state(win);
    if (st.view === 'craft') return this.renderCraft(win, gate);
    if (st.view === 'result') return this.renderResult(win, gate);
    if (st.view === 'certify') return this.renderCertify(win, gate);
    if (st.view === 'cert-result') return this.renderCertResult(win, gate);
    if (st.view === 'story') return this.renderStory(win, gate);
    if (st.view === 'story-result') return this.renderStoryResult(win, gate);
    if (st.view === 'promote') return this.renderPromote(win, gate);
    return this.renderMain(win, gate);
  },
renderMain(win, gate) {
    const st = this.state(win);
    const list = this.clones(win.game);
    const converted = this.converted(win.game);
    const parasites = this.parasites(win.game);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    const bagRows = list.map(c => this.cloneRowHtml(win, c, 'bag')).join('');
    const convRows = converted.map(c => this.cloneRowHtml(win, c, 'converted')).join('');
    const paraRows = parasites.map(c => this.cloneRowHtml(win, c, 'parasite')).join('');
    const full = have >= cap;
    const notice = String(st.notice || '').trim();
    return `<div class="ppw-card">
  ${notice ? `<p class="ppw-warn">${win.esc(notice)}</p>` : ''}
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>已有分身（含已入册） ${have} / ${cap}</b></div>
    <div class="ppw-row">
      <button type="button" class="ppw-btn" data-ppw="to-craft" ${full ? 'disabled' : ''}>制造分身</button>
      <button type="button" class="ppw-btn" data-ppw="to-certify" ${full ? 'disabled' : ''}>勾选人物认定</button>
      <button type="button" class="ppw-btn" data-ppw="to-story" ${full ? 'disabled' : ''}>据剧情认定</button>
    </div>
  </div>
  <p class="ppw-hint">上限随序列提升：序列4 起 3 个，之后每升一整级 +2（0.X 与序列 1 同档），制造、转化与寄生认定共用这一个上限。三条入口：投入材料制造一具偷盗者途径的分身；勾选人物列表里已有的角色，认定它已被你寄生，通过只在其客观记录上打一个标记、原有数据一律不动；或指定最新正文、最近 ${this.JOURNEY_PICK} 条小总结中的某一条，据剧情认定出一具被你寄生的分身。寄生分身沿用宿主本人的途径与序列，因此途径不限，旧日、支柱与凡人都可能。普通分身编入我方由你亲自操控；已入册的（转化的与寄生认定的）在人物列表里、可参与对话，编入我方时改由 AI 操控。从人物列表删除等于这具分身死亡，不回袋、腾出格子。袋内分身在战斗结算中阵亡会被销毁。</p>
  ${full ? '<p class="ppw-warn">分身数量已达上限（含已入册的），先销毁、取消认定或从人物列表删除一个再来。</p>' : ''}
  <p class="ppw-sect-label">普通分身</p>
  ${bagRows || '<p class="ppw-hint">还没有普通分身。</p>'}
  <p class="ppw-sect-label">已转化为常规角色</p>
  ${convRows || '<p class="ppw-hint">还没有已转化的分身。</p>'}
  <p class="ppw-sect-label">已认定的寄生分身</p>
  ${paraRows || '<p class="ppw-hint">还没有认定过的寄生分身。</p>'}
</div>`;
  },
renderCertify(win, gate) {
    const esc = win.esc.bind(win);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    const list = this.candidates(win.game);

    let body = '';
    if (!list.length) {
      body = '<p class="ppw-hint">人物列表里没有可认定的角色（已认定过的、已转化的与袋内同名的不再列出）。</p>';
    } else {
      const rows = list.map(c => `<div class="ppw-mat" data-idx="${c.idx}">
  <label class="ppw-mat-hit">
    <input type="checkbox" class="clo-cand-cb" />
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
    <div><b>勾选人物认定</b>　<span class="ppw-hint">还可再认 ${Math.max(0, cap - have)} 个</span></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">勾选你认为已经被自己寄生的角色，一次裁定全部勾选项。通过的只在客观记录上打一个标记，序列、六维、性格、记忆等原有数据一个字都不改，也不会重算属性。认定官不判对方的途径与强弱，凡人同样可以被寄生。</p>
  ${body}
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="certify" ${win.isBusy ? 'disabled' : ''}>${win.isBusy ? '认定中…' : '开始认定'}</button>
  </div>
</div>`;
  },
renderCertResult(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const rows = (st.results || []).map(r => `<div class="ppw-verdict ${r.ok ? 'ok' : 'no'}">
  <b>${esc(r.name)}</b> —— ${r.ok ? '认定通过，已记为你的寄生分身' : '不通过'}
  <div class="ppw-hint">${esc(r.reason)}</div>
</div>`).join('');
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>认定结果</b></div>
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
    <input type="radio" name="clo-src" class="clo-src-rb" data-src="${i}" ${checked} />
    <span class="ppw-mat-main">
      <span class="ppw-mat-name">${esc(this.eventLabel(ev))}</span>
      <span class="ppw-mat-meta">${esc(detail.slice(0, 60) || '（无详细描述）')}</span>
    </span>
  </label>
</div>`;
      }).join('');
      body = `<div class="ppw-mat">
  <label class="ppw-mat-hit">
    <input type="radio" name="clo-src" class="clo-src-rb" data-src="latest" ${st.source === 'latest' ? 'checked' : ''} />
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
    <div><b>据剧情认定</b>　<span class="ppw-hint">还可再认 ${Math.max(0, cap - have)} 个</span></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">选一段剧情作为认定依据。认定官会先看这段剧情里你是否亲手寄生了某个对象，再结合大总结、近期事件与最新正文确认这份寄生至今仍然有效。同一段剧情里寄生了多个对象时会一并认出。</p>
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
    // 宿主可能根本不是非凡者，途径下拉多一条凡人档，其序列清单只有「普通人」一条
    const pathways = PathwaySeqUtil.pathwayNames();

    const rows = pending.map((p, i) => {
      const pwOpts = ['<option value="">-- 选择途径 --</option>'].concat(
        pathways.map(pw => `<option value="${esc(pw)}" ${pw === p.pathway ? 'selected' : ''}>${esc(pw)}</option>`)
      ).concat([
        `<option value="${esc(PathwaySeqUtil.MORTAL)}" ${p.pathway === PathwaySeqUtil.MORTAL ? 'selected' : ''}>（无途径 · 普通人）</option>`,
      ]).join('');
      const seqList = p.pathway ? PathwaySeqUtil.seqEntriesOf(p.pathway) : [];
      const seqOpts = ['<option value="">-- 选择序列 --</option>'].concat(
        seqList.map(s => `<option value="${esc(s)}" ${s === p.seqString ? 'selected' : ''}>${esc(s)}</option>`)
      ).join('');
      const warn = p.ok ? '' : `<p class="ppw-warn">模型给的序列名「${esc(p.seqRaw || '空')}」不在清单内，请自己选一个再添加；宿主是凡人就选「（无途径 · 普通人）」。</p>`;
      return `<div class="ppw-clone" data-clo-row="${i}">
  <div class="ppw-clone-main">
    <div class="ppw-clone-sub">${esc(p.reason)}</div>
    ${warn}
    <div class="ppw-form">
      <label class="ppw-field"><span>名称</span><input type="text" class="clo-p-name" value="${esc(p.name)}" /></label>
      <label class="ppw-field"><span>途径（只作筛选，决定下面能选哪些序列）</span><select class="clo-p-pw" data-ppw-change="pathway">${pwOpts}</select></label>
      <label class="ppw-field"><span>序列名（写入 当前序列 的就是这一条）</span><select class="clo-p-seq">${seqOpts}</select></label>
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
  ${pending.length ? `<p class="ppw-hint">下列寄生分身已通过判定，确认后先落进袋内，再按需入册进人物列表。途径与序列可以改，你是最后一道兜底；改途径只是换一份序列清单，真正写进变量的是那条完整序列名。本次最多还能添加 ${left} 个。</p>` : ''}
  ${rows}
  ${pending.length ? `<div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="story-add">确认添加</button></div>` : '<p class="ppw-hint">本次没有认定出可用的寄生分身。</p>'}
</div>`;
  },
renderPromote(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const name = st.promoteName || '';
    const bag = this.bag(win.game, false) || {};
    const clone = bag[name];
    if (!clone) {
      return `<div class="ppw-card">
  <p class="ppw-warn">找不到要入册的分身。</p>
  <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
</div>`;
    }
    const isParasiteRec = this.isParasiteRecord(clone);
    const title = isParasiteRec ? '入册' : '转为常规角色';
    if (this.snapshotOf(clone)) {
      return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>${esc(title)} · ${esc(name)}</b></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">这个分身带着入册快照（此前从人物列表退回来的），入册将按原记录原样还原性格、记忆与事件历史，不需要重新填写。</p>
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="do-promote" data-arg="${esc(name)}">按原记录入册</button>
  </div>
</div>`;
    }
    const d = this.promoteDefaults(win, clone);
    const f = this.formField.bind(this, esc);
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>${esc(title)} · ${esc(name)}</b></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">下列字段会写入人物关系列表与客观记录。留空则用预填的默认成句，不会写成「未知」。序列、六维与能力清单沿用分身，不在这里改。事件历史固定为空。</p>
  <p class="ppw-hint">${esc(clone.当前序列 || '')} · ${esc(clone.能力体系 || '')}</p>
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
    <button type="button" class="ppw-btn" data-ppw="do-promote" data-arg="${esc(name)}">${isParasiteRec ? '确认入册' : '确认转化'}</button>
  </div>
</div>`;
  },
abilityText(d) {
    const list = Array.isArray(d && d.能力清单) ? d.能力清单 : [];
    if (!list.length) return '（无）';
    return list.map(a => (a && (a.名称 || a.name)) || '').filter(Boolean).join('、') || '（无）';
  },
renderCraft(win, gate) {
    const esc = win.esc.bind(win);
    const mats = this.materials(win.game);
    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);

    let body = '';
    if (!mats.length) {
      body = '<p class="ppw-hint">物品栏里没有可用作材料的东西。</p>';
    } else {
      this.MATERIAL_CATS.forEach(cat => {
        const group = mats.filter(m => m.分类 === cat.title);
        if (!group.length) return;
        // 份数输入刻意留在 label 之外：嵌进去点它就会连带切换勾选框
        const rows = group.map(m => `<div class="ppw-mat" data-idx="${m.idx}">
  <label class="ppw-mat-hit">
    <input type="checkbox" class="ppw-mat-cb" />
    <span class="ppw-mat-main">
      <span class="ppw-mat-name">${esc(m.名称)}</span>
      <span class="ppw-mat-meta">序列 ${esc(m.序列)} · 途径 ${esc(m.途径)} · ${esc(m.类型)}</span>
    </span>
  </label>
  ${m.可堆叠
    ? `<span class="ppw-mat-qty">份数 <input type="number" class="ppw-mat-n" min="1" max="${m.持有}" step="1" value="1" /> / ${m.持有}</span>`
    : '<span class="ppw-mat-qty">1 份</span>'}
</div>`).join('');
        body += `<details class="ppw-group" open><summary>${esc(cat.title)}（${group.length}）</summary>${rows}</details>`;
      });
    }

    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>选择材料</b>　<span class="ppw-hint">还可再造 ${Math.max(0, cap - have)} 个</span></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  <p class="ppw-hint">勾选要投入的材料并填份数，一份材料造一个分身。判定一次性裁定全部勾选项：通过的立刻造出并扣除材料，不通过的原样保留。装备类每件固定 1 份。</p>
  ${body}
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="craft" ${win.isBusy ? 'disabled' : ''}>${win.isBusy ? '判定中…' : '开始判定'}</button>
  </div>
</div>`;
  },
renderResult(win, gate) {
    const esc = win.esc.bind(win);
    const st = this.state(win);
    const rows = (st.results || []).map(r => `<div class="ppw-verdict ${r.ok ? 'ok' : 'no'}">
  <b>${esc(r.名称)}</b> —— ${r.ok ? `通过，造出序列 ${r.rank} 的「${esc(r.造出 || '')}」${r.份数 > 1 ? ` 等 ${r.份数} 个` : ''}` : '不通过'}
  <div class="ppw-hint">${esc(r.reason)}</div>
</div>`).join('');
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;">
    <div><b>判定结果</b></div>
    <button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button>
  </div>
  ${st.lastError ? `<p class="ppw-warn">${esc(st.lastError)}</p>` : ''}
  ${rows || '<p class="ppw-hint">没有可展示的结果。</p>'}
</div>`;
  },
onChange(win, kind, el) {
    if (kind !== 'pathway' || !el) return;
    const row = el.closest('[data-clo-row]');
    const seqEl = row && row.querySelector('.clo-p-seq');
    if (!seqEl) return;
    const list = PathwaySeqUtil.seqEntriesOf(el.value);
    const esc = win.esc.bind(win);
    seqEl.innerHTML = ['<option value="">-- 选择序列 --</option>']
      .concat(list.map(s => `<option value="${esc(s)}">${esc(s)}</option>`))
      .join('');
  },
async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    const st = this.state(win);
    switch (act) {
      case 'to-craft': st.view = 'craft'; win.render(); break;
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
      case 'revert': await this.revertClone(win, arg); break;
      case 'unmark': await this.unmark(win, arg); break;
      case 'craft': await this.runCraft(win); break;
      case 'rename': await this.renameClone(win, arg); break;
      case 'reroll': this.rerollClone(win, arg); break;
      case 'drop': this.dropClone(win, arg); break;
      default: break;
    }
  },
collectPicks(win) {
    const mats = this.materials(win.game);
    const picks = [];
    this.queryAll('.ppw-mat').forEach(row => {
      const cb = row.querySelector('.ppw-mat-cb');
      if (!cb || !cb.checked) return;
      const m = mats[parseInt(row.dataset.idx, 10)];
      if (!m) return;
      let n = 1;
      if (m.可堆叠) {
        const input = row.querySelector('.ppw-mat-n');
        n = Math.max(1, Math.min(m.持有, Math.floor(Number(input && input.value) || 1)));
      }
      picks.push(Object.assign({}, m, { 份数: n }));
    });
    return picks;
  },
collectCandidatePicks(win) {
    const list = this.candidates(win.game);
    const picks = [];
    this.queryAll('.ppw-mat').forEach(row => {
      const cb = row.querySelector('.clo-cand-cb');
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

    const picks = this.collectCandidatePicks(win);
    if (!picks.length) { win.msg('请先勾选至少一个角色'); return; }

    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    if (have + picks.length > cap) {
      win.msg(`分身上限 ${cap} 个，你已有 ${have} 个，本次最多再认 ${Math.max(0, cap - have)} 个`, 4000);
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
        let equipmentChanged = false;
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
          npc[this.PARASITE_MARK] = true;
          made++;
          st.results.push({ name: p.name, ok: true, reason: v.reason });
        });
        if (made > 0) {
          this.syncDisplayAbility(mvu);
          win.persist();
          await win.persistZero();
        }
        win.msg(made > 0 ? `认定通过 ${made} 个寄生分身` : '本次没有角色通过认定', 3000);
      }
      st.view = 'cert-result';
    } catch (e) {
      console.error('[分身] 寄生认定失败', e);
      st.results = [];
      st.lastError = '调用失败：' + (e.message || e);
      st.view = 'cert-result';
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
    this.queryAll('.clo-src-rb').forEach(rb => {
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
      win.msg(`分身数量已达上限 ${cap} 个`, 4000);
      return;
    }

    const sel = this.selectedStory(win);
    if (!sel) { win.msg('这段剧情取不到内容，换一段试试'); return; }
    if (!win.ensureApiReady()) return;

    win.isBusy = true;
    if (win.game) win.game.isBackgroundProcessing = true;
    win.render();
    try {
      const owned = this.clones(win.game).map(c => c.name)
        .concat(this.converted(win.game).map(c => c.name))
        .concat(this.parasites(win.game).map(c => c.name));
      const sys = this.promptStory(
        win.playerName(),
        win.playerSequence(),
        PathwaySeqUtil.pathwayText(),
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
          : '本次没有认定出寄生分身。';
      } else {
        st.pending = parsed.passed;
      }
      st.view = 'story-result';
    } catch (e) {
      console.error('[分身] 剧情认定失败', e);
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
    if (!pending.length) { win.msg('没有待添加的寄生分身'); return; }

    const gate = this.resolve(win.playerSequence());
    const cap = this.capOf(gate.rank);
    let have = this.occupied(win.game);

    const rows = [];
    this.queryAll('[data-clo-row]').forEach(row => {
      const i = parseInt(row.dataset.cloRow, 10);
      const src = pending[i];
      if (!src) return;
      const nameEl = row.querySelector('.clo-p-name');
      const seqEl = row.querySelector('.clo-p-seq');
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
      const hit = PathwaySeqUtil.findSeqString(r.seqString);
      if (!hit) { notes.push(`「${r.name}」的序列名不在清单内，已跳过`); continue; }
      const why = this.nameTaken(win.game, r.name);
      if (why) { notes.push(`「${r.name}」${why}，已跳过`); continue; }
      if (have >= cap) { notes.push(`「${r.name}」上限不足，已跳过`); continue; }
      // 惰性建壳：一个都没成时，不该在 stat_data 里留下一个空的分身列表
      if (!bag) bag = this.bag(win.game, true);
      bag[r.name] = this.buildRecord(r.name, hit.seqString, st.storyLabel || '', this.ORIGIN_PARASITE);
      have++;
      made++;
    }

    if (made > 0) {
      this.syncDisplayAbility(win.game && win.game.currentMvuState);
      win.persist();
    }
    st.pending = null;
    // 跳过原因要留在界面上：toast 一闪就没了，玩家会以为分身凭空少了一个
    st.notice = notes.join('；');
    st.view = 'main';
    win.msg(made > 0 ? `已添加 ${made} 个寄生分身${notes.length ? '，另有若干被跳过' : ''}` : (notes[0] || '没有可添加的寄生分身'), 4000);
    win.render();
  },
async runCraft(win) {
    if (win.isBusy) return;
    const gate = this.resolve(win.playerSequence());
    if (!gate.unlocked) { win.msg('当前序列不满足解锁条件'); return; }

    const picks = this.collectPicks(win);
    if (!picks.length) { win.msg('请先勾选至少一份材料'); return; }

    const cap = this.capOf(gate.rank);
    const have = this.occupied(win.game);
    const want = picks.reduce((s, p) => s + p.份数, 0);
    if (have + want > cap) {
      win.msg(`分身上限 ${cap} 个，你已有 ${have} 个，本次最多再造 ${Math.max(0, cap - have)} 个`, 4000);
      return;
    }
    if (!win.ensureApiReady()) return;

    const st = this.state(win);
    win.isBusy = true;
    if (win.game) win.game.isBackgroundProcessing = true;
    win.render();
    try {
      const sys = this.prompt(win.playerName(), win.playerSequence(), this.materialText(picks));
      const raw = await win.callRaw(sys, this.USER_INPUT);
      const parsed = this.parseVerdicts(raw, picks.length);

      st.results = [];
      st.lastError = '';
      if (!parsed) {
        st.lastError = '模型回复格式无法解析，本次按全部不通过处理，材料未消耗，可直接重试。';
        picks.forEach(p => st.results.push({ 名称: p.名称, ok: false, reason: '未能解析裁定' }));
      } else {
        // 惰性建壳：一条都没通过时，不该在 stat_data 里留下一个空的分身列表
        let bag = null;
        let made = 0;
        let equipmentChanged = false;
        picks.forEach((p, i) => {
          const v = parsed[i + 1] || { ok: false, reason: '模型漏判了这一条，按不通过处理' };
          if (!v.ok) {
            st.results.push({ 名称: p.名称, ok: false, reason: v.reason });
            return;
          }
          if (!bag) bag = this.bag(win.game, true);
          const names = [];
          // 材料制造固定偷盗者途径，序列名按档反查
          const seqString = this.seqStringOf(v.rank);
          for (let k = 0; k < p.份数; k++) {
            const name = this.uniqueName(win.game, `${win.playerName()}的分身·序列${v.rank}`);
            bag[name] = this.buildRecord(name, seqString, p.名称);
            names.push(name);
            made++;
          }
          const consumed = this.consume(win.game, p);
          equipmentChanged = equipmentChanged || !!consumed.equipmentChanged;
          st.results.push({
            名称: p.名称, ok: true, rank: v.rank, reason: v.reason,
            造出: names[0] || '', 份数: p.份数,
          });
        });
        if (made > 0) {
          if (equipmentChanged && win.game) {
            try {
              if (typeof win.game.syncEquippedItemsFromBooleans === 'function') {
                win.game.syncEquippedItemsFromBooleans(win.game.currentMvuState.stat_data);
              }
              if (typeof win.game.refreshEquipmentSlots === 'function') win.game.refreshEquipmentSlots();
              if (typeof win.game.updateDisplayedAttributes === 'function') win.game.updateDisplayedAttributes();
            } catch (e) {
              console.warn('[分身] 扣除已装备材料后的装备同步失败', e);
            }
          }
          this.syncDisplayAbility(win.game && win.game.currentMvuState);
          win.persist();
          await win.persistZero();
        }
        win.msg(made > 0 ? `造出了 ${made} 个分身` : '本次没有材料通过判定', 3000);
      }
      st.view = 'result';
    } catch (e) {
      console.error('[分身] 判定失败', e);
      st.results = [];
      st.lastError = '调用失败：' + (e.message || e);
      st.view = 'result';
    } finally {
      if (win.game) win.game.isBackgroundProcessing = false;
      win.isBusy = false;
      win.render();
    }
  },
async renameClone(win, oldName) {
    const bag = this.bag(win.game, false);
    if (!bag || !bag[oldName]) { win.msg('找不到这个分身'); return; }

    let input = null;
    if (win.game && typeof win.game.showPromptModal === 'function') {
      input = await win.game.showPromptModal(
        '分身改名', '输入新的名字：', win.esc(oldName), 'text', '',
        { confirmClass: 'interaction-btn primary-btn' },
      );
    } else {
      input = window.prompt('分身改名', oldName);
    }
    const next = String(input == null ? '' : input).trim();
    if (!next || next === oldName) return;

    const npc = (win.game && win.game.currentMvuState && win.game.currentMvuState.npc_data) || {};
    if (Object.prototype.hasOwnProperty.call(bag, next)
      || Object.prototype.hasOwnProperty.call(npc, next)) {
      win.msg('这个名字已经被占用了', 3000);
      return;
    }

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
rerollClone(win, name) {
    const bag = this.bag(win.game, false);
    const rec = bag && bag[name];
    if (!rec) { win.msg('找不到这个分身'); return; }
    const seqString = String(rec.当前序列 || '');
    rec.能力清单 = this.rollAbilities(seqString, parseSequenceRank(seqString));
    win.persist();
    win.msg(`已为「${name}」重抽序列能力`);
    win.render();
  },
dropClone(win, name) {
    const bag = this.bag(win.game, false);
    if (!bag || !bag[name]) { win.msg('找不到这个分身'); return; }
    delete bag[name];
    win.forgetTeamEntry(name);
    this.syncDisplayAbility(win.game && win.game.currentMvuState);
    win.persist();
    win.msg(`「${name}」已销毁`);
    win.render();
  }
};
    MarauderCloneMode.resolve = deps.resolveGate;
    MarauderCloneMode.scope = deps.scope;
    MarauderCloneMode.queryAll = selector => Array.from(deps.scope()?.querySelectorAll(selector) || []);
    MarauderCloneMode.journeyList = deps.evidenceList;
    MarauderCloneMode.rollAbilities = deps.rollAbilities;
    MarauderCloneMode.buildRecord = (name, sequence, source, origin) => ({
      ...deps.synthesize(sequence), 名称: name, 能力清单: deps.rollAbilities(sequence),
      $战斗经验: 0, $战斗经验等级: 0,
      $id: 'clone-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4),
      $创建时间: new Date().toISOString(),
      ...(origin === '寄生' ? { $来源: '寄生', $来源寄生: String(source || '') } :
        { $来源材料: String(source || '') }),
    });
    return MarauderCloneMode;
  }
  const api = { create, rank: parseSequenceRank, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
