// Generated from the complete original ShamanPictureMode; no original plugin globals are modified.
(() => {
  'use strict';
  const KEY = 'cryptLord.shamanPictureReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const PlayerProjectionResolver = window.PlayerProjectionResolver;
    const GameDBManager = { DB: { ...modules['cryptLord.battleFieldEffectReference'].summonDefaults(),
      abilitySystemDB: {}, ...deps.pool.pictureConfig,
      godPathways: deps.pool.pathways, sequenceAbilities: deps.pool.abilities || {} } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const getPureName = text => String(text || '').replace(/[【】]/g, '').trim()
      .replace(/^序列\d+(\.\d+)?[-—\s]?/, '').trim().replace(/^(旧日|支柱)[-—\s]?/, '').trim();
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
    const math = Object.create(Math);
    math.random = deps.random || Math.random.bind(Math);
    const SummonManager = modules['cryptLord.battleFieldEffectReference'].create({
      Math: math, GameDBManager, parseSequenceRank,
    }).summon;
    const MysteryPryerScrollMode = modules['cryptLord.scrollWorkshopReference'].create({
      pool: deps.pool, window });
    window.MysteryPryerScrollMode = MysteryPryerScrollMode;
const ShamanPictureMode = {
  id: 'shaman-picture-person',
  途径: '萨满',
  途径全名: '萨满途径',
  名称: '制造画中人',
  图标: '🖼️',
  GATE: 5,
  TITLE: '高维俯视者',
  STORE_PLAY: '制造画中人玩法',
  STORE_LIST: '画中人列表',
  MATERIAL_COST: 10,

  clone(value) {
    try {
      if (typeof _ !== 'undefined' && _ && typeof _.cloneDeep === 'function') return _.cloneDeep(value);
      return JSON.parse(JSON.stringify(value));
    } catch (_) { return value; }
  },

  resolve(sequenceString) {
    const text = String(sequenceString || '');
    if (text.includes(this.TITLE)) return { inPathway: true, unlocked: true, rank: -1, viaTitle: true };
    let best = null;
    LifeSaveManager.splitSequenceFragments(text).forEach(frag => {
      const row = LifeSaveManager.resolveFragment(frag);
      if (!row || row.pathwayShort !== this.途径) return;
      const rank = Number(row.rank);
      if (!Number.isFinite(rank)) return;
      if (best === null || rank < best) best = rank;
    });
    if (best === null) return { inPathway: false, unlocked: false, rank: null, viaTitle: false };
    return { inPathway: true, unlocked: best <= this.GATE, rank: best, viaTitle: false };
  },

  effectiveSequence(win) {
    const state = win.game && win.game.currentMvuState;
    return state && window.PlayerProjectionResolver
      ? PlayerProjectionResolver.resolve(state).effectiveSequence
      : win.playerSequence();
  },

  gate(win) { return this.resolve(this.effectiveSequence(win)); },

  store(mvuState, create) {
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
    let play = pathway[this.STORE_PLAY];
    if (!play || typeof play !== 'object' || Array.isArray(play)) {
      if (!create) return null;
      play = pathway[this.STORE_PLAY] = { 版本: 1, [this.STORE_LIST]: {} };
    }
    let list = play[this.STORE_LIST];
    if (!list || typeof list !== 'object' || Array.isArray(list)) {
      if (!create) return { play, list: null };
      list = play[this.STORE_LIST] = {};
    }
    if (create) play.版本 = Math.max(1, Math.floor(Number(play.版本) || 1));
    return { play, list };
  },

  recordsOfState(mvuState) {
    const store = this.store(mvuState, false);
    const list = store && store.list || {};
    return Object.keys(list).filter(id => id !== '$meta' && list[id] && typeof list[id] === 'object')
      .map(id => {
        const rec = list[id];
        const data = rec.角色卡 && typeof rec.角色卡 === 'object' ? rec.角色卡 : null;
        return data ? {
          id: String(rec.ID || id),
          name: String(rec.名称 || data.名称 || '未命名画中人'),
          pathway: String(rec.途径 || ''),
          rank: Number(rec.制造位阶),
          data,
        } : null;
      }).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  },

  removeByIds(mvuState, ids) {
    const store = this.store(mvuState, false);
    if (!store || !store.list) return [];
    const removed = [];
    (ids || []).forEach(raw => {
      const id = String(raw || '');
      const rec = store.list[id];
      if (!rec || typeof rec !== 'object') return;
      removed.push(String(rec.名称 || id));
      delete store.list[id];
    });
    return removed;
  },

  newId() {
    const rnd = window.crypto && typeof window.crypto.getRandomValues === 'function'
      ? (() => { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0].toString(36); })()
      : Math.random().toString(36).slice(2, 10);
    return 'picture-' + Date.now().toString(36) + '-' + rnd;
  },

  pathwayChoices(gate) {
    if (!gate || !gate.unlocked) return [];
    const raw = Number(gate.rank);
    const valueRank = SummonManager.valueRankOf(raw > 0 ? Math.ceil(raw) : raw);
    const nameRank = SummonManager.nameRankOf(valueRank);
    const pathways = typeof GameDBManager !== 'undefined' && GameDBManager.DB
      ? GameDBManager.DB.godPathways : null;
    if (!pathways || typeof pathways !== 'object') return [];
    const out = [];
    Object.entries(pathways).forEach(([pathwayName, list]) => {
      if (!Array.isArray(list)) return;
      const libEntry = list.find(seq => typeof seq === 'string' && parseSequenceRank(seq) === nameRank);
      if (!libEntry) return;
      const seqString = SummonManager.composeSequence(valueRank, libEntry);
      out.push({
        key: String(pathwayName),
        pathway: String(pathwayName).replace(/途径$/, '').trim() || String(pathwayName),
        seqString,
      });
    });
    return out.sort((a, b) => a.pathway.localeCompare(b.pathway, 'zh-CN'));
  },

  materials(win) {
    return window.MysteryPryerScrollMode ? MysteryPryerScrollMode.materials(win) : [];
  },

  state(win) {
    if (!win._modeState) win._modeState = {};
    if (!win._modeState[this.id]) win._modeState[this.id] = { pathwayKey: '', materialQty: {} };
    return win._modeState[this.id];
  },

  scope() { return document.querySelector('#ppw-body [data-ppw-mode="' + this.id + '"]'); },

  normalizeSelections(win) {
    const st = this.state(win);
    const materials = this.materials(win);
    const live = new Set(materials.map(row => row.key));
    Object.keys(st.materialQty).forEach(key => { if (!live.has(key)) delete st.materialQty[key]; });
    materials.forEach(row => {
      st.materialQty[row.key] = Math.max(0, Math.min(row.available,
        Math.floor(Number(st.materialQty[row.key]) || 0)));
    });
    return materials;
  },

  selected(win) {
    const st = this.state(win);
    return this.normalizeSelections(win).map(row => ({
      ...row, qty: Math.max(0, Math.min(row.available, Math.floor(Number(st.materialQty[row.key]) || 0))),
    })).filter(row => row.qty > 0);
  },

  selectedValue(rows) {
    return (rows || []).reduce((sum, row) => sum + row.qty * row.perUnit, 0);
  },

  capture(win) {
    const st = this.state(win);
    const root = this.scope();
    const pathway = root && root.querySelector('[data-picture-pathway]');
    if (pathway) st.pathwayKey = String(pathway.value || '');
    root && root.querySelectorAll('[data-picture-material]').forEach(input => {
      const key = String(input.dataset.pictureMaterial || '');
      if (key) st.materialQty[key] = Math.max(0, Math.floor(Number(input.value) || 0));
    });
  },

  uniqueName(mvuState, pathway) {
    const used = new Set(this.recordsOfState(mvuState).map(row => row.name));
    const base = pathway + '画中人';
    if (!used.has(base)) return base;
    const ord = ['二', '三', '四', '五', '六', '七', '八', '九', '十'];
    for (const suffix of ord) if (!used.has(base + '·' + suffix)) return base + '·' + suffix;
    let i = 11;
    while (used.has(base + '·' + i)) i++;
    return base + '·' + i;
  },

  materialRowsHtml(win, materials) {
    const st = this.state(win);
    if (!materials.length) return '<p class="ppw-warn">“其他列表”中没有卷轴玩法认可的材料。</p>';
    return materials.map(row => '<label class="ppw-material-batch">'
      + '<span><b>' + win.esc(row.name) + '</b> · ' + win.esc(row.type)
      + ' · 库存 ' + row.available + win.esc(row.item.单位 || '份')
      + ' · 每件折算 ' + row.perUnit + ' 点</span>'
      + '<input class="ppw-mat-n" type="number" min="0" max="' + row.available
      + '" step="1" value="' + Math.max(0, Math.floor(Number(st.materialQty[row.key]) || 0))
      + '" data-ppw-change="picture-material" data-picture-material="' + win.esc(row.key) + '" />'
      + '</label>').join('');
  },

  inventoryHtml(win) {
    const rows = this.recordsOfState(win.game && win.game.currentMvuState);
    if (!rows.length) return '<p class="ppw-hint">尚未制造画中人。</p>';
    return rows.map(row => '<div class="ppw-material-batch"><div><b>' + win.esc(row.name)
      + '</b><div class="ppw-mat-meta">' + win.esc(row.pathway) + ' · '
      + win.esc(String(row.data.当前序列 || '未知序列'))
      + ' · 战斗实力100% · 移动力0</div></div></div>').join('');
  },

  render(win, gate) {
    const st = this.state(win);
    const choices = this.pathwayChoices(gate);
    if (!choices.some(row => row.key === st.pathwayKey)) st.pathwayKey = choices[0] ? choices[0].key : '';
    const selectedChoice = choices.find(row => row.key === st.pathwayKey) || null;
    const materials = this.normalizeSelections(win);
    const selected = this.selected(win);
    const total = this.selectedValue(selected);
    const options = choices.map(row => '<option value="' + win.esc(row.key) + '"'
      + (row.key === st.pathwayKey ? ' selected' : '') + '>' + win.esc(row.pathway)
      + ' · ' + win.esc(row.seqString) + '</option>').join('');
    const canCraft = !win.isBusy && !!selectedChoice && total >= this.MATERIAL_COST;
    return '<div class="ppw-card"><div class="ppw-sect-label">已有画中人</div>'
      + this.inventoryHtml(win)
      + '<div class="ppw-sect-label" style="margin-top:12px;">制造新画中人</div>'
      + (choices.length ? '<label class="ppw-field"><span>目标途径（位阶固定为当前萨满位阶）</span>'
        + '<select data-ppw-change="picture-pathway" data-picture-pathway>' + options + '</select></label>'
        : '<p class="ppw-warn">世界书中没有与当前位阶匹配的途径条目。</p>')
      + this.materialRowsHtml(win, materials)
      + '<p class="' + (total >= this.MATERIAL_COST ? 'ppw-hint' : 'ppw-warn') + '">已选 '
      + total + ' 点；需要至少 ' + this.MATERIAL_COST + ' 点。整件消耗，溢出不返还。</p>'
      + '<div class="ppw-actions"><button type="button" class="ppw-btn" data-ppw="picture-craft"'
      + (canCraft ? '' : ' disabled') + '>' + (win.isBusy ? '制造中…' : '确认消耗并制造')
      + '</button></div></div>';
  },

  liveSelections(win, snapshots) {
    const byKey = new Map(this.materials(win).map(row => [row.key, row]));
    const out = [];
    for (const old of snapshots) {
      const live = byKey.get(old.key);
      if (!live || live.available < old.qty || live.type !== old.type
        || live.rank !== old.rank || live.perUnit !== old.perUnit) return null;
      out.push({ ...live, qty: old.qty });
    }
    return out;
  },

  async confirmCraft(win, choice, selected, total) {
    const lines = selected.map(row => row.qty + (row.item.单位 || '份') + '“' + row.name
      + '”（' + row.qty * row.perUnit + '点）');
    const text = '确定制造“' + choice.pathway + '”途径的' + choice.seqString + '画中人吗？\n\n将消耗：\n'
      + lines.join('\n') + '\n\n总计' + total + '点'
      + (total > this.MATERIAL_COST ? '，溢出' + (total - this.MATERIAL_COST) + '点不返还' : '') + '。';
    if (win.game && typeof win.game.showConfirmModal === 'function') return !!(await win.game.showConfirmModal(text));
    return window.confirm(text);
  },

  async craft(win) {
    if (win.isBusy) return;
    this.capture(win);
    const gate = this.gate(win);
    if (!gate.unlocked) { win.msg('当前没有制造画中人的资格。', 3500); return; }
    const st = this.state(win);
    const choice = this.pathwayChoices(gate).find(row => row.key === st.pathwayKey);
    if (!choice) { win.msg('请选择一个有效途径。'); return; }
    const selected = this.selected(win);
    const total = this.selectedValue(selected);
    if (total < this.MATERIAL_COST) { win.msg('制造画中人至少需要10点材料。', 3500); return; }
    if (!(await this.confirmCraft(win, choice, selected, total))) return;

    const snapshots = selected.map(row => ({
      key: row.key, qty: row.qty, type: row.type, rank: row.rank, perUnit: row.perUnit,
    }));
    const live = this.liveSelections(win, snapshots);
    if (!live) { win.msg('确认期间材料发生变化，本次没有消耗。', 4000); win.render(); return; }
    const liveChoice = this.pathwayChoices(this.gate(win)).find(row => row.key === choice.key
      && row.seqString === choice.seqString);
    if (!liveChoice) { win.msg('确认期间有效序列或途径库发生变化，本次没有消耗。', 4500); win.render(); return; }

    const mvu = win.game && win.game.currentMvuState;
    const sd = win.sd();
    const hadOther = Object.prototype.hasOwnProperty.call(sd, '其他列表');
    const hadPlayRoot = Object.prototype.hasOwnProperty.call(sd, '$专属玩法');
    const otherBackup = this.clone(sd.其他列表);
    const playBackup = this.clone(sd['$专属玩法']);
    win.isBusy = true;
    if (win.game) win.game.isBackgroundProcessing = true;
    win.render();
    try {
      live.forEach(row => {
        const source = sd.其他列表 && sd.其他列表[row.key];
        if (!source || Math.floor(Number(source.数量) || 0) < row.qty) throw new Error('材料“' + row.name + '”数量不足');
        const left = Number(source.数量) - row.qty;
        if (left <= 0.05) delete sd.其他列表[row.key];
        else source.数量 = left;
      });
      const data = SummonManager.synthesizeRecord(liveChoice.seqString);
      data.能力清单 = SummonManager.rollAbilitiesFor(liveChoice.seqString);
      const name = this.uniqueName(mvu, liveChoice.pathway);
      data.名称 = name;
      const id = this.newId();
      const store = this.store(mvu, true);
      store.list[id] = {
        ID: id, 名称: name, 途径: liveChoice.pathway, 当前序列: liveChoice.seqString,
        制造位阶: Number(this.gate(win).rank), 制造时间: String(mvu && mvu.world_data && mvu.world_data.当前时间纪元 || ''),
        角色卡: data,
      };
      win.persist();
      const saved = await win.persistZero();
      if (saved === false) throw new Error('0号消息持久化失败');
      st.materialQty = {};
      win.msg('制造完成：' + name, 3500);
    } catch (error) {
      if (hadOther) sd.其他列表 = otherBackup;
      else delete sd.其他列表;
      if (hadPlayRoot) sd['$专属玩法'] = playBackup;
      else delete sd['$专属玩法'];
      win.persist();
      try { await win.persistZero(); } catch (_) {}
      win.msg('制造失败，材料与存档已恢复：' + (error.message || error), 5000);
    } finally {
      win.isBusy = false;
      if (win.game) win.game.isBackgroundProcessing = false;
      win.render();
    }
  },

  onChange(win, kind, element) {
    const st = this.state(win);
    if (kind === 'picture-pathway') st.pathwayKey = String(element && element.value || '');
    if (kind === 'picture-material') {
      const key = String(element && element.dataset.pictureMaterial || '');
      if (key) st.materialQty[key] = Math.max(0, Math.floor(Number(element.value) || 0));
    }
    win.render();
  },

  async action(win, act) {
    if (win.guardBattleMutation && win.guardBattleMutation(act)) return;
    if (act === 'picture-craft') return this.craft(win);
  },
};
    return ShamanPictureMode;
  }
  const api = { create, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
