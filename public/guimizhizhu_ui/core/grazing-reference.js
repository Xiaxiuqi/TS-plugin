// Generated from the complete original grazing core and management mode.
(() => {
  'use strict';
  const KEY = 'cryptLord.grazingReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window;
    const document = window.document;
    const localStorage = { getItem: () => String(Boolean(deps.locked)) };
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
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
    const PlayerProjectionResolver = { resolve: deps.projection };
    const PlayerProjectionSync = { syncAll: deps.sync };
    const AudienceImaginationCore = { mergeSequenceFragments: deps.mergeSequence };
    const fetchAvailableAbilities = deps.abilities;
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
const GrazingMode = {
  id: GrazingCore.ID,
  途径: GrazingCore.PATHWAY,
  途径全名: GrazingCore.PATHWAY_FULL,
  名称: '放牧',
  图标: '🕯️',
  GATE: GrazingCore.GATE,
  TITLE: GrazingCore.TITLE,

  resolve(sequenceString) { return GrazingCore.resolveOwnerSequence(sequenceString); },

  state(win) {
    if (!win._modeState[this.id]) win._modeState[this.id] = { view: 'main', result: null };
    return win._modeState[this.id];
  },

  scope() { return document.querySelector(`#ppw-body [data-ppw-mode="${this.id}"]`); },

  candidates(win) {
    const mvu = win.game && win.game.currentMvuState;
    const rel = (mvu && mvu.stat_data && mvu.stat_data.人物关系列表) || {};
    const npc = (mvu && mvu.npc_data) || {};
    const souls = GrazingCore.soulsOfState(mvu);
    const gate = PlayerProjectionResolver.resolve(mvu).grazingGate;
    const out = [];
    Object.keys(rel).forEach(name => {
      if (!name || name === '$meta' || souls[name]) return;
      const subj = rel[name];
      const obj = npc[name];
      if (!subj || typeof subj !== 'object' || !obj || typeof obj !== 'object') return;
      const sequence = String(obj.当前序列 || '').trim();
      if (!Number.isFinite(GrazingCore.strongestRank(sequence))) return;
      if (!GrazingCore.canGraze(gate.rank, sequence)) return;
      if (!GrazingCore.STAT_KEYS.every(k => typeof obj[k] === 'number' && Number.isFinite(obj[k]))) return;
      const statuses = (obj.当前状态 && typeof obj.当前状态 === 'object')
        ? Object.keys(obj.当前状态).filter(k => k !== '$meta').join('、') : '';
      out.push({
        name, sequence, obj, subj,
        identity: String(obj.身份 || subj.身份 || '未知'),
        relationship: String(subj.关系 || '未知'),
        affinity: subj.好感度 == null ? '未知' : subj.好感度,
        status: statuses || '无明确异常状态',
        currentAction: String(obj.正在做的事 || '未知'),
      });
    });
    return out;
  },

  prompt(win, c) {
    return `你是「秘祈人途径 · 放牧」玩法的认证官。

玩家【${win.playerName()}】的真实当前序列是【${win.actualPlayerSequence()}】。
玩家主张自己已经放牧了【${c.name}】的灵魂。

请你只依据提供给你的 <历史事件>、<近期事件> 与 <最新剧情> 判断这一主张。
若某一段材料没有提供，或小总结以 [小总结原文] 的形式出现，就以实际收到的内容为准。

<候选目标>
名称：${c.name}
当前序列：${c.sequence}
身份：${c.identity}
与玩家的关系：${c.relationship}
好感度：${c.affinity}
当前状态：${c.status}
正在做的事：${c.currentAction}
</候选目标>

## 放牧认定铁则

1. “放牧”必须是秘祈人途径意义上的灵魂放牧：玩家以自身的非凡能力夺取、吞噬、收纳或控制目标的灵魂，使其成为可以被玩家调用的被放牧灵魂。

2. 材料中必须明确存在“玩家亲手完成放牧”这一环。下列情形可以认定通过，满足其中一项即可：
   - 明确写到玩家放牧了目标的灵魂；
   - 明确写到玩家以牧羊人、秘祈人或相应权柄吞噬并收纳了目标灵魂；
   - 明确写到目标灵魂被玩家纳入自身、成为玩家可以调用的灵魂或能力来源。

3. 下列情形一律不能认定为放牧：
   - 只是杀死、击败、俘虏或控制了目标；
   - 只是看见、接触、召唤、安抚或暂时拘束目标灵魂；
   - 只是读取记忆、复制能力、借用力量或建立契约；
   - 灵魂由别人放牧、别人转让、来历不明，或材料没有写明由玩家亲手完成；
   - 目标仍只是玩家的部下、盟友、信徒、仆从、秘偶、召唤物或附身对象。

4. 被放牧的灵魂必须截至 <最新剧情> 仍由玩家持有。若材料明确写到该灵魂已经：
   - 被释放；
   - 被净化或摧毁；
   - 被夺走；
   - 脱离玩家控制；
   - 被玩家消耗殆尽；
   则判定不通过。

5. 不要判断目标位阶是否超过玩家，也不要重算目标属性、能力或序列。这些由程序另行校验。

6. 严禁补写材料中不存在的过程。拿不准、只有暗示、缺少“亲手放牧”这一关键环节时，一律判定不通过。

## 输出格式

只输出一个 <裁定> 块，块内只能有一行，除此之外不要输出任何解释、标题、空行或其它标签。

通过时：

<裁定>
通过|理由
</裁定>

不通过时：

<裁定>
不通过|理由
</裁定>

要求：
- 第一段只能是“通过”或“不通过”。
- 第二段是一句话理由，不超过40个汉字。
- 理由中不得包含竖线或换行。`;
  },

  parseVerdict(raw) {
    const block = String(raw || '').match(/<裁定>([\s\S]*?)<\/裁定>/);
    if (!block) return null;
    const lines = block[1].split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (lines.length !== 1) return null;
    const seg = lines[0].split('|');
    if (seg.length !== 2) return null;
    const verdict = String(seg[0] || '').trim();
    const reason = String(seg[1] || '').trim();
    if (verdict !== '通过' && verdict !== '不通过') return null;
    if (!reason || reason.includes('|') || /[\r\n]/.test(reason)) return null;
    return { ok: verdict === '通过', reason };
  },

  selectedCandidate(win) {
    const root = this.scope();
    const checked = root && root.querySelector('input[name="grazing-candidate"]:checked');
    if (!checked) return null;
    return this.candidates(win).find(c => c.name === checked.value) || null;
  },

  activeFromDom(win) {
    const root = this.scope();
    if (!root) {
      const state = win.game && win.game.currentMvuState;
      return GrazingCore.storedActiveNames(state).concat(GrazingCore.storedDormantNames(state));
    }
    return Array.from(root.querySelectorAll('[data-grazing-active]:checked')).map(el => el.value);
  },

  renderMain(win, gate) {
    const mvu = win.game && win.game.currentMvuState;
    const snapshot = PlayerProjectionResolver.resolve(mvu);
    const rawRecords = GrazingCore.recordsOfState(mvu);
    const active = new Set(GrazingCore.activeNames(mvu, snapshot));
    const stored = GrazingCore.storedActiveNames(mvu);
    const dormantNames = stored.filter(name => !active.has(name)).concat(GrazingCore.storedDormantNames(mvu));
    const dormant = new Set(dormantNames);
    const order = stored.concat(GrazingCore.storedDormantNames(mvu));
    const recordsByName = new Map(rawRecords.map(row => [row.name, row]));
    const records = order.map(name => recordsByName.get(name)).filter(Boolean)
      .concat(rawRecords.filter(row => !order.includes(row.name)));
    const cap = GrazingCore.capacityOf(gate.rank);
    const activeCap = GrazingCore.activeCapOf(gate.rank);
    const rows = records.map(({ name, data }) => {
      const checked = active.has(name) || dormant.has(name) ? ' checked' : '';
      const sequence = String(data.当前序列 || '未知');
      const source = String(data['$放牧来源'] || '人物认证');
      return `<div class="ppw-clone">
  <label class="ppw-clone-main" style="cursor:pointer;">
    <span class="ppw-clone-name"><input type="checkbox" data-grazing-active value="${win.esc(name)}"${checked}> ${win.esc(name)}</span>
    <span class="ppw-clone-sub">当前序列：${win.esc(sequence)}　来源：${win.esc(source)}</span>
    <span class="ppw-clone-stats">状态：${active.has(name) ? '已激活' : dormant.has(name) ? '休眠（不生效）' : '未激活'}</span>
  </label>
  <div class="ppw-clone-ops"><button type="button" class="ppw-btn warn" data-ppw="release" data-arg="${win.esc(name)}">释放灵魂</button></div>
</div>`;
    }).join('');
    return `<div class="ppw-card">
  <p class="ppw-hint">真实当前序列：${win.esc(win.actualPlayerSequence() || '未知')}</p>
  <p class="ppw-hint">已放牧 ${records.length}/${cap} 个灵魂；已激活 ${active.size}/${activeCap} 个；休眠 ${dormant.size} 个。</p>
  <p class="ppw-hint">勾选顺序中前 ${activeCap} 个当前生效，超出的选择保存为休眠，不会因位阶变化被删除。</p>
  <p class="ppw-hint">激活灵魂会提供其完整序列范围内的能力与途径机制，但不会改变你的真实序列和基础属性。</p>
  <p class="ppw-hint">场外保存激活组合不消耗灵性；战斗中每次切换组合消耗真实序列平均灵性的2%。</p>
  ${rows || '<p class="ppw-hint">你还没有放牧任何灵魂。</p>'}
  <div class="ppw-actions">
    <button type="button" class="ppw-btn" data-ppw="open-certify">认证新灵魂</button>
    <button type="button" class="ppw-btn" data-ppw="save-active">保存激活组合</button>
  </div>
</div>`;
  },

  renderCertify(win) {
    const candidates = this.candidates(win);
    const rows = candidates.map(c => `<label class="ppw-mat-hit">
  <input type="radio" name="grazing-candidate" value="${win.esc(c.name)}">
  <span class="ppw-mat-main"><span class="ppw-mat-name">${win.esc(c.name)}</span><span class="ppw-mat-meta">${win.esc(c.sequence)}　关系：${win.esc(c.relationship)}　好感度：${win.esc(c.affinity)}</span></span>
</label>`).join('');
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;"><b>选择人物认证</b><button type="button" class="ppw-btn ghost" data-ppw="to-main">返回</button></div>
  <p class="ppw-hint">从人物关系列表中选择一名角色。认证官会检查剧情中是否明确发生过“你亲手放牧其灵魂”，以及这份灵魂至今是否仍由你持有。</p>
  ${rows || '<p class="ppw-hint">当前没有可以认证的角色。目标必须同时存在于人物关系列表和NPC客观记录中，且位阶不能高于你。</p>'}
  <div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="certify"${!candidates.length || win.isBusy ? ' disabled' : ''}>${win.isBusy ? '认证中…' : '开始认证'}</button></div>
</div>`;
  },

  renderResult(win) {
    const r = this.state(win).result;
    return `<div class="ppw-card">
  <div class="ppw-row" style="justify-content:space-between;"><b>认证结果</b><button type="button" class="ppw-btn ghost" data-ppw="to-main">返回放牧界面</button></div>
  ${r ? `<div class="ppw-verdict ${r.ok ? 'ok' : 'no'}"><b>${win.esc(r.name || '')}</b> —— ${r.ok ? '认证通过，已加入放牧灵魂列表。' : '认证不通过。'}<div class="ppw-hint">理由：${win.esc(r.reason || '')}</div></div>` : '<p class="ppw-warn">认证回复格式无法解析，本次没有写入任何数据，可以直接重试。</p>'}
</div>`;
  },

  render(win, gate) {
    const st = this.state(win);
    if (st.view === 'certify') return this.renderCertify(win);
    if (st.view === 'result') return this.renderResult(win);
    return this.renderMain(win, gate);
  },

  async saveActive(win) {
    const mvu = win.game && win.game.currentMvuState;
    const snapshot = PlayerProjectionResolver.resolve(mvu);
    const result = GrazingCore.saveActiveNames(mvu, this.activeFromDom(win), snapshot);
    if (!result.ok) { win.msg(result.reason, 4000); return; }
    PlayerProjectionSync.syncAll(mvu, localStorage.getItem('ST_LoM_AbilityLock') === 'true');
    win.persist();
    await win.persistZero();
    win.msg('激活组合已保存，能力与途径机制已同步。');
    win.render();
  },

  async certify(win) {
    const c = this.selectedCandidate(win);
    if (!c) { win.msg('请先选择一名要认证的角色。'); return; }
    if (!win.ensureApiReady()) return;
    const mvu = win.game && win.game.currentMvuState;
    const snapshot = PlayerProjectionResolver.resolve(mvu);
    const gate = snapshot.grazingGate;
    if (GrazingCore.recordsOfState(mvu).length >= GrazingCore.capacityOf(gate.rank)) {
      win.msg(`放牧灵魂数量已达上限 ${GrazingCore.capacityOf(gate.rank)} 个。`, 4000); return;
    }
    win.isBusy = true;
    win.game.isBackgroundProcessing = true;
    win.render();
    try {
      const raw = await win.callRaw(this.prompt(win, c), `请裁定：我是否已经亲手放牧并仍然持有【${c.name}】的灵魂？`);
      const verdict = this.parseVerdict(raw);
      if (!verdict) {
        this.state(win).result = null;
      } else if (!verdict.ok) {
        this.state(win).result = { name: c.name, ok: false, reason: verdict.reason };
        win.msg('本次认证未通过。');
      } else {
        const latest = (mvu.npc_data || {})[c.name];
        const added = latest ? GrazingCore.addSoul(mvu, c.name, latest, '人物认证', snapshot)
          : { ok: false, reason: '找不到目标的NPC客观记录，无法复制灵魂数据。' };
        this.state(win).result = { name: c.name, ok: added.ok, reason: added.ok ? verdict.reason : added.reason };
        if (added.ok) {
          PlayerProjectionSync.syncAll(mvu, localStorage.getItem('ST_LoM_AbilityLock') === 'true');
          win.persist();
          await win.persistZero();
          win.msg(`已成功放牧“${c.name}”的灵魂。`, 3500);
        } else win.msg(added.reason, 4000);
      }
      this.state(win).view = 'result';
    } catch (e) {
      console.error('[放牧] 认证失败', e);
      this.state(win).result = { name: c.name, ok: false, reason: '认证失败：' + (e.message || e) };
      this.state(win).view = 'result';
    } finally {
      win.game.isBackgroundProcessing = false;
      win.isBusy = false;
      win.render();
    }
  },

  async release(win, name) {
    if (!GrazingCore.soulsOfState(win.game && win.game.currentMvuState)[name]) { win.msg('找不到这份灵魂。'); return; }
    const ok = window.confirm(`确定永久释放“${name}”的灵魂吗？\n\n释放后，这份灵魂及其能力会从放牧列表中永久删除，无法撤销。`);
    if (!ok) return;
    GrazingCore.removeSoul(win.game.currentMvuState, name);
    win.persist();
    await win.persistZero();
    win.msg(`已永久释放“${name}”的灵魂。`);
    win.render();
  },

  async action(win, act, arg) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    const st = this.state(win);
    if (act === 'open-certify') { st.view = 'certify'; win.render(); return; }
    if (act === 'to-main') { st.view = 'main'; win.render(); return; }
    if (act === 'save-active') return this.saveActive(win);
    if (act === 'certify') return this.certify(win);
    if (act === 'release') return this.release(win, arg);
  },
};
    GrazingMode.scope = deps.scope;
    return { core: GrazingCore, mode: GrazingMode };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
