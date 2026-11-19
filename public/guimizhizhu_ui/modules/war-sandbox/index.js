(() => {
  'use strict';
  const KEY = 'cryptLord.warSandboxUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw Error(`[${KEY}] contract missing`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'], store = modules['cryptLord.stateStore'];
  const domain = modules['cryptLord.domainState'], sandbox = modules['cryptLord.warSandbox'];
  const hostApi = modules['cryptLord.hostApi'];
  if (!host || !store || !domain || !sandbox || !hostApi) throw Error(`[${KEY}] dependencies missing`);
  const state = { shell: null, dialog: null, body: null, target: null, data: null, rules: null, baseline: '',
    loaded: null, saved: null, side: 'A', selected: null, peer: '', field: '陆战', seed: 1,
    result: null, pending: null, busy: false, error: '', epoch: 0, stale: false, generating: false,
    reportOpen: false, subscriptions: [], disposed: false, audio: null, focus: null, operation: 0 };
  const clone = value => JSON.parse(JSON.stringify(value));
  const doc = () => host.getHost()?.document || window.document;
  const view = () => doc().defaultView || window;
  const opened = () => state.shell?.dataset.open === 'true';
  const dirty = () => state.data && JSON.stringify(state.data) !== state.baseline;
  const locked = () => state.busy || state.stale || state.generating || Boolean(state.pending) || !state.loaded?.editable;
  const inRules = run => domain.withWarRules(state.rules, run);
  function el(tag, className = '', text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(label, title, handler, locked = true) {
    const node = el('button', '', label);
    node.type = 'button'; node.title = title; node.setAttribute('aria-label', title);
    node.disabled = locked && (state.busy || state.stale || state.generating || Boolean(state.pending) || !state.loaded?.editable);
    node.addEventListener('click', () => { void handler(); });
    return node;
  }
  function fail(error) { state.error = error?.message || String(error); render(); }
  function edit(change) {
    if (locked()) return;
    try {
      state.data = change(); state.error = '';
      render();
    } catch (error) { fail(error); }
  }
  function select(label, value, options, change, locked = true) {
    const wrap = el('label', '', label), node = el('select');
    node.setAttribute('aria-label', label);
    for (const [key, text] of options) {
      const option = el('option', '', text);
      option.value = key; node.appendChild(option);
    }
    node.value = value; node.disabled = locked && (state.busy || state.stale || state.generating || Boolean(state.pending) || !state.loaded?.editable);
    node.addEventListener('change', () => change(node.value));
    wrap.appendChild(node);
    return wrap;
  }
  function input(parent, label, value, change, options = {}) {
    const wrap = el('label', '', label), node = el('input');
    node.type = options.type || 'number'; node.value = value ?? '';
    node.setAttribute('aria-label', label);
    if (node.type === 'number') { node.min = options.min ?? 0; node.step = 1; }
    if (options.max !== undefined) node.max = options.max;
    node.disabled = locked();
    node.addEventListener('change', () => change(node.value));
    wrap.appendChild(node); parent.appendChild(wrap);
  }
  async function assertSource(valid) {
    if (!valid()) throw Error('窗口、聊天或生成状态已变化，操作已取消');
    try { await sandbox.assertNative(state.loaded, valid); }
    catch (error) { state.stale = true; throw error; }
  }
  async function run(task, recovery = false) {
    if (state.busy || state.stale || state.generating || !state.loaded?.editable || state.pending && !recovery) return;
    const epoch = state.epoch, operation = ++state.operation;
    const valid = () => !state.disposed && epoch === state.epoch && opened() && !state.stale &&
      state.shell.isConnected && state.shell.ownerDocument === doc() &&
      !state.generating && modules[KEY] === api && modules['cryptLord.warSandbox'] === sandbox &&
      modules['cryptLord.domainState'] === domain && modules['cryptLord.afterNativeHost'] === host &&
      modules['cryptLord.stateStore'] === store && modules['cryptLord.hostApi'] === hostApi;
    state.busy = true; state.error = ''; render();
    try {
      if (!recovery) await assertSource(valid);
      await task(valid);
    } catch (error) {
      if (epoch === state.epoch) {
        const phase = state.pending?.transaction.status();
        if (phase === 'invalid') state.stale = true;
        if (['ready', 'failed'].includes(phase)) state.pending = null;
        state.error = error?.message || String(error);
      }
    } finally { if (operation === state.operation) { state.busy = false; if (epoch === state.epoch) render(); } }
  }
  function adopt(loaded) {
    state.loaded = loaded; state.rules = loaded.rules; state.target = loaded.floor.message_id;
    state.saved = clone(loaded.floor.data); state.baseline = JSON.stringify(state.saved);
    state.data = sandbox.create(state.saved);
  }
  async function commit(valid, simulate = false) {
    if (!valid() || state.pending) throw Error('窗口或待保存结果已变化，操作已取消');
    const transaction = sandbox.beginNative(state.loaded, state.data,
      { field: state.field, seed: state.seed, simulate }, valid);
    state.pending = { transaction, simulate, before: clone(state.saved) };
    await finishCommit(await transaction.run(), valid);
  }
  async function finishCommit(result, valid) {
    if (!valid()) throw Error('窗口或聊天已变化，保存结果未用于旧窗口');
    const pending = state.pending;
    state.pending = null; state.saved = clone(result.data); state.baseline = JSON.stringify(result.data);
    state.data = sandbox.create(result.data);
    if (result.loaded) adopt(result.loaded);
    else { state.loaded = null; state.stale = true; }
    if (result.warning) state.error = result.warning;
    if (result.result) state.result = result.result;
    try {
      if (!result.unchanged) modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
        messageId: state.target, beforeData: pending.before, afterData: clone(result.data), source: KEY,
      });
    } catch (error) { state.error = `已确认保存，面板通知失败：${error.message || error}`; }
    if (result.result && result.loaded) {
      try { modules['cryptLord.warReplayUi']?.open(result.result, { title: '沙盘军演', owner: KEY }); }
      catch (error) { state.error = `已确认保存，回放打开失败：${error.message || error}`; }
    }
  }
  function recover() {
    return run(async valid => {
      const transaction = state.pending.transaction;
      await finishCommit(await (transaction.status() === 'uncertain' ? transaction.inspect() : transaction.save()), valid);
    }, true);
  }
  function fight() { return run(valid => commit(valid, true)); }
  function composer() {
    const document = doc(), node = document.querySelector('#send_textarea');
    return { document, node, draft: node?.value, adapter: modules['cryptLord.inputAdapter'] };
  }
  async function exportReport(kind) {
    const captured = composer(), win = view();
    return run(async valid => {
      const text = sandbox.exportText(state.saved);
      if (!valid()) return;
      if (kind === 'composer') {
        const { document, node, draft, adapter } = captured;
        if (!adapter?.setInputText) throw Error('原生输入接口尚未就绪');
        if (!node) throw Error('找不到原生输入框');
        if (String(draft || '').trim() && !win.confirm('原生输入框已有草稿，确定替换为已保存的军演战报？')) return;
        await assertSource(valid);
        if (!valid() || doc() !== document || !node.isConnected || document.querySelector('#send_textarea') !== node ||
          node.value !== draft || modules['cryptLord.inputAdapter'] !== adapter) throw Error('原生输入框或草稿已变化，未替换草稿');
        adapter.setInputText(text);
      } else if (kind === 'copy') await win.navigator.clipboard.writeText(text);
      else {
        const url = win.URL.createObjectURL(new win.Blob([text], { type: 'text/plain;charset=utf-8' }));
        const link = el('a'); link.href = url; link.download = `沙盘军演-${state.target}.txt`;
        doc().body.appendChild(link); link.click(); link.remove();
        win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
      }
    });
  }
  function mount() {
    if (state.disposed || state.shell) return Boolean(state.shell);
    if (!doc().body) return false;
    const shell = el('section', 'crypt-lord-war-sandbox');
    shell.dataset.open = 'false';
    const dialog = el('section', 'crypt-lord-war-sandbox__dialog');
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-label', '战争沙盘编辑');
    dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
    const header = el('header');
    header.append(el('strong', '', '战争沙盘'), el('output'));
    header.appendChild(button('×', '关闭', close, false));
    const body = el('div', 'crypt-lord-war-sandbox__body');
    dialog.append(header, body); shell.appendChild(dialog); doc().body.appendChild(shell);
    state.shell = shell; state.dialog = dialog; state.body = body;
    shell.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, input, select, summary')]
        .filter(node => !node.disabled && node.getClientRects().length &&
          (!node.closest('details:not([open])') || node.matches('summary')));
      if (!controls.length) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && [controls[0], dialog].includes(doc().activeElement)) {
        event.preventDefault(); controls.at(-1).focus();
      } else if (!event.shiftKey && [controls.at(-1), dialog].includes(doc().activeElement)) {
        event.preventDefault(); controls[0].focus();
      }
    });
    state.audio = modules['cryptLord.gameAudio']?.createScene(() => state.shell);
    const audioControl = modules['cryptLord.gameAudioControl'];
    if (audioControl) header.insertBefore(audioControl.create(doc(), 'war'), header.lastChild);
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => { state.generating = false; close(true); }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(host.bindEvent(events.GENERATION_STARTED, (_id, info, dryRun) => {
      const type = typeof _id === 'string' ? _id : info?.type ?? _id?.type;
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || dryRun || info?.dryRun || _id?.dryRun ||
        info?.quiet_prompt || _id?.quiet_prompt || info?.options?.quiet_prompt || _id?.options?.quiet_prompt ||
        info?.options?.dryRun || _id?.options?.dryRun) return;
      state.generating = true; state.stale = true; state.epoch++; state.operation++; state.busy = false;
      state.error = '原生生成已开始，请在生成结束后重新读取';
      if (modules['cryptLord.warReplayUi']?.status().owner === KEY) modules['cryptLord.warReplayUi'].close();
      render();
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
      state.subscriptions.push(host.bindEvent(event, () => { state.generating = false; render(); }));
    }
    return true;
  }
  async function open(messageId, options = {}) {
    if (!mount() || state.generating) return false;
    if (opened() && !options.reread && (!Number.isInteger(messageId) || messageId === state.target)) {
      state.dialog.focus(); return true;
    }
    if (!options.reread && (dirty() || state.pending) && opened() &&
      !view().confirm('放弃待保存或待核对的沙盘结果并切换楼层？')) return false;
    if (!opened()) state.focus = doc().activeElement;
    const epoch = ++state.epoch;
    state.operation++;
    const valid = () => !state.disposed && epoch === state.epoch && !state.generating &&
      state.shell.isConnected && state.shell.ownerDocument === doc() && modules[KEY] === api;
    state.busy = true; state.stale = true; state.pending = null; state.loaded = null;
    state.data = null; state.rules = null; state.error = ''; state.target = Number.isInteger(messageId) ? messageId : null;
    state.shell.dataset.open = 'true'; state.dialog.focus(); render();
    try {
      const loaded = await sandbox.loadNative(Number.isInteger(messageId) ? messageId : null, valid);
      if (!valid()) return false;
      adopt(loaded);
      state.field = options.field || sandbox.warOf(state.data).沙盘战场 || '陆战';
      state.seed = sandbox.warOf(state.data).沙盘种子 ?? 1;
      state.side = 'A'; state.selected = null; state.result = null; state.pending = null;
      state.reportOpen = false;
      state.peer = sandbox.warOf(state.data).敌方来源; state.stale = false; state.error = loaded.reason;
      modules['cryptLord.domainConsole']?.close(true);
      state.audio?.enter('prep', 'war');
      return true;
    } catch (error) { if (valid()) state.error = error?.message || String(error); return false; }
    finally { if (epoch === state.epoch) { state.busy = false; render(); } }
  }
  function close(force = false) {
    if (force !== true && (dirty() || state.pending) && !view().confirm('关闭并放弃待保存或待核对的沙盘草稿？')) return false;
    state.epoch++; state.operation++; state.busy = false; state.pending = null;
    if (state.shell) state.shell.dataset.open = 'false';
    state.audio?.leave();
    const replayUi = modules['cryptLord.warReplayUi'];
    if (replayUi?.status().owner === KEY) replayUi.close();
    if (state.focus?.isConnected) state.focus.focus();
    return true;
  }
  async function reload() {
    if (state.busy || state.generating) return;
    if ((dirty() || state.pending) && !view().confirm('重新读取将放弃待保存或待核对的草稿，继续？')) return;
    await open(state.target, { reread: true });
  }
  function render() {
    try { renderBody(); }
    catch (error) {
      state.stale = true;
      state.error = error?.message || String(error);
      state.body?.appendChild(el('p', 'crypt-lord-war-sandbox__error', state.error));
    }
  }
  function renderBody() {
    if (!opened()) return;
    const scroll = state.body.scrollTop;
    state.reportOpen = state.body.querySelector('.crypt-lord-war-sandbox__report')?.open ?? state.reportOpen;
    state.body.replaceChildren();
    state.shell.querySelector('header output').textContent = state.busy ? '处理中' :
      `${state.target === null ? '' : `楼层 #${state.target} · `}${state.stale ? '来源已失效' : dirty() ? '未保存' : '已保存'}`;
    const bar = el('div', 'crypt-lord-war-sandbox__toolbar');
    const reloadButton = button('重新读取', '重新读取', reload, false);
    reloadButton.disabled = state.busy || state.generating; bar.appendChild(reloadButton);
    if (state.pending) {
      const phase = state.pending.transaction.status();
      const label = phase === 'uncertain' ? '核对原生保存状态' :
        state.pending.simulate ? '保存模拟结果' : '保存本次布阵结果';
      const retry = button(label, label, recover, false);
      retry.disabled = state.busy || state.stale || state.generating || !['pending', 'uncertain'].includes(phase);
      bar.appendChild(retry);
    }
    state.body.appendChild(bar);
    if (state.error) state.body.appendChild(el('p', 'crypt-lord-war-sandbox__error', state.error));
    if (!state.data || !state.rules) return;
    const layout = sandbox.board(state.rules);
    bar.appendChild(select('战场', state.field, [['陆战', '陆战'], ['海战', '海战']], value => edit(() => {
      state.field = value; const next = clone(state.data); sandbox.warOf(next).沙盘战场 = value; return next;
    })));
    input(bar, '种子', state.seed, value => {
      const seed = Number(value);
      if (value === '' || !Number.isSafeInteger(seed) || seed < 0 || seed >= 2147483647) { fail(Error('种子超出有效整数范围')); return; }
      edit(() => { state.seed = seed; const next = clone(state.data); sandbox.warOf(next).沙盘种子 = seed; return next; });
    }, { max: 2147483646 });
    bar.append(
      button('保存布阵', '保存布阵', () => run(commit)),
      button('开始军演', '开始军演', fight),
    );
    const sides = el('nav', 'crypt-lord-war-sandbox__sides');
    for (const side of ['A', 'B']) {
      const b = button(`${side === 'A' ? '我方' : '敌方'} ${sandbox.roster(state.data, side).length}/${layout.limit}`,
        side === 'A' ? '我方' : '敌方', () => { state.side = side; state.selected = null; render(); });
      b.setAttribute('aria-pressed', String(side === state.side)); sides.appendChild(b);
    }
    state.body.appendChild(sides);
    const board = el('div', 'crypt-lord-war-sandbox__board');
    board.style.setProperty('--cols', layout.cols);
    board.style.aspectRatio = `${layout.cols}/${layout.rows}`;
    const all = ['A', 'B'].flatMap(side => sandbox.roster(state.data, side).map(row => ({ side, row })));
    for (let y = 0; y < layout.rows; y++) for (let x = 0; x < layout.cols; x++) {
      const unit = all.find(item => item.row.x === x && item.row.y === y);
      const b = button('', `格子 ${x},${y}`, () => {
        if (unit && unit.side === state.side) { state.selected = unit.row.id; render(); }
        else edit(() => sandbox.place(state.data, state.side, state.selected, x, y, state.rules));
      });
      b.className = `crypt-lord-war-sandbox__cell is-${y < layout.half ? 'enemy' : 'ally'}`;
      b.dataset.x = x; b.dataset.y = y;
      if (unit) {
        b.append(el('strong', '', unit.row.名称 || unit.row.id), el('small', '', `e${unit.row.精锐等级 || 1} · ${unit.row.数量 || 0}`));
        b.title = `${unit.row.名称 || unit.row.id} (${x},${y})`;
        if (unit.side === state.side && unit.row.id === state.selected) b.classList.add('is-selected');
      }
      board.appendChild(b);
    }
    state.body.appendChild(board);
    const tools = el('div', 'crypt-lord-war-sandbox__toolbar');
    tools.append(
      button('+', '添加部队', () => edit(() => sandbox.add(state.data, state.side, state.rules))),
      button('清空这一方', '清空这一方', () => {
        if (view().confirm('清空这一方的沙盘布阵？不会遣散实际驻军。'))
          edit(() => sandbox.clear(state.data, state.side));
      }),
    );
    if (state.side === 'A') tools.appendChild(button('同步出战名单', '同步出战名单',
      () => edit(() => sandbox.sync(state.data, state.rules, state.field))));
    else {
      const peers = inRules(() => domain.ensureDomain(clone(state.data.stat_data.领地)).同级对手 || []);
      tools.appendChild(select('邻境', state.peer, [['', '选择对手'], ...peers.map(p => [p.id, p.名称 || p.id])],
        value => { state.peer = value; }));
      tools.appendChild(button('导入邻境', '导入邻境', () => edit(() => sandbox.importPeer(state.data, state.peer, state.rules))));
    }
    state.body.appendChild(tools);
    for (const row of sandbox.roster(state.data, state.side)) {
      const item = el('article', 'crypt-lord-war-sandbox__unit');
      item.classList.toggle('is-selected', row.id === state.selected);
      const top = el('div', 'crypt-lord-war-sandbox__toolbar');
      top.append(el('strong', '', row.名称 || row.id), el('small', '', `${row.id} (${row.x},${row.y})`),
        button('摆位', `摆位 ${row.id}`, () => { state.selected = row.id; render(); }),
        button('×', `移除 ${row.id}`, () => edit(() => sandbox.remove(state.data, state.side, row.id))));
      item.appendChild(top);
      let p;
      try { p = sandbox.piece(state.data, state.side, row, state.rules, state.field); }
      catch (error) { item.appendChild(el('p', 'crypt-lord-war-sandbox__error', error.message)); }
      const linked = row.来源 === '领地' || row.来源 === '邻境' ||
        state.side === 'A' && (state.data.stat_data.领地.驻军?.军队 || []).some(a => a.id === row.id) ||
        state.side === 'B' && String(row.id).startsWith(`peer-${sandbox.warOf(state.data).敌方来源}-`);
      if (!linked) {
        const fields = el('div', 'crypt-lord-war-sandbox__fields');
        const update = (field, value) => edit(() => sandbox.setField(state.data, state.side, row.id, field, value, state.rules, state.field));
        input(fields, '名称', row.名称, value => update('名称', value), { type: 'text' });
        fields.appendChild(select('兵种', row.兵种 || '', [['', '自定义'],
          ...inRules(() => domain.troopDefs()).map(t => [t.id, `${t.军种} · ${t.名称} e${t.精锐 || 1}`])],
        value => update('兵种', value)));
        input(fields, '数量', row.数量, value => update('数量', value));
        if (!row.兵种) for (const field of ['生命', '攻击', '射程', '精锐等级'])
          input(fields, field, row[field], value => update(field, value), {
            min: field === '攻击' ? 0 : 1, max: field === '精锐等级' ? 5 : undefined,
          });
        item.appendChild(fields);
      }
      if (p) item.appendChild(el('p', '', `生命 ${p.hp} · 攻击 ${p.atk} · 射程 ${p.range} · 护盾 ${p.shield ?? state.rules.warConfig.defaults.shield} · 技能 ${p.ability || state.rules.warConfig.defaults.ability}`));
      state.body.appendChild(item);
    }
    if (!sandbox.roster(state.data, state.side).length) state.body.appendChild(el('p', '', '暂无部队'));
    const last = sandbox.warOf(state.saved)?.最近战报;
    if (last?.摘要) {
      const report = el('details', 'crypt-lord-war-sandbox__report');
      report.open = state.reportOpen;
      report.append(el('summary', '', `最近军演 · ${last.结果}`), el('pre', '', sandbox.exportText(state.saved)));
      const actions = el('div', 'crypt-lord-war-sandbox__toolbar');
      if (state.result) actions.appendChild(button('战况回放', '战况回放',
        () => modules['cryptLord.warReplayUi']?.open(state.result, { title: '沙盘军演', owner: KEY })));
      actions.append(button('复制战报', '复制战报', () => exportReport('copy')),
        button('下载战报', '下载战报', () => exportReport('download')),
        button('写入原生输入框', '写入原生输入框', () => exportReport('composer')));
      report.appendChild(actions); state.body.appendChild(report);
    }
    state.body.scrollTop = scroll;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, open: opened(), busy: state.busy, dirty: Boolean(dirty()), stale: state.stale,
      pending: Boolean(state.pending), phase: state.pending?.transaction.status() || null, editable: Boolean(state.loaded?.editable) }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(sub => sub?.stop?.());
      state.audio?.dispose();
      state.shell?.remove(); state.shell = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
