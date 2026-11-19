(() => {
  'use strict';
  const KEY = 'cryptLord.variableWorkbench', STATE_KEY = 'cryptLord.variableWorkbenchState';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  const modules = root.__stage1Modules, host = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !host) throw Error('变量编辑宿主尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { panel: null, ball: null, retryBall: null, loaded: null, draft: {}, targetId: null,
    token: 0, busy: false, stale: false, rawEdited: false, variablePrepared: null, expanded: new Set(['stat_data', 'npc_data', 'world_data']),
    highlighted: new Set(), highlightTarget: null, unreadChanges: 0, zoom: 1, activeTab: 'deep', disposed: false, cleanups: [], focus: null };
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => structuredClone(value);
  const doc = () => host.getHost()?.document || document;
  const view = () => doc().defaultView || window;
  const service = () => modules[STATE_KEY];
  const panelField = name => state.panel.querySelector(`[data-variable-${name}]`);
  const active = token => !state.disposed && modules[KEY] === api && modules['cryptLord.afterNativeHost'] === host &&
    state.token === token && state.panel?.dataset.open === 'true' && doc() === state.panel.ownerDocument;
  const blocked = () => state.busy || state.stale || !state.loaded?.editable;
  const idFor = (domain, parts) => `${domain}:${service().pointer(parts)}`;
  function element(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(name, icon, handler, mutation = false, text = '') {
    const node = element('button');
    node.type = 'button'; node.title = name; node.setAttribute('aria-label', name);
    node.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    if (text) node.append(element('span', '', text));
    if (mutation) node.dataset.variableMutation = '';
    node.addEventListener('click', handler);
    return node;
  }
  function message(text) { if (state.panel) panelField('status').textContent = text; }
  function delta() { return service().changes(state.loaded?.floor.data || {}, state.draft); }
  function dirty() { return state.rawEdited || Object.values(delta()).some(items => items.length); }
  function rawSync() { panelField('patch').value = JSON.stringify(delta(), null, 2); state.rawEdited = false; }
  function controls() {
    if (!state.panel) return;
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.panel.querySelectorAll('[data-variable-mutation]').forEach(node => { node.disabled = blocked() || node.dataset.variableArrayName === 'true'; });
    panelField('save').disabled = blocked() || !dirty();
    panelField('reload').disabled = state.busy;
    panelField('dirty').textContent = dirty() ? '未保存' : '';
    state.retryBall.disabled = state.busy;
    state.retryBall.classList.toggle('crypt-lord-variable-workbench__retry-ball--busy', state.busy);
  }
  function layoutSave() {
    if (!state.panel) return;
    try { view().localStorage.setItem('cryptLord.variableWorkbench.state.v1', JSON.stringify({
      panel: { x: parseFloat(state.panel.style.left), y: parseFloat(state.panel.style.top),
        width: parseFloat(state.panel.style.width), height: parseFloat(state.panel.style.height) },
      ball: { x: parseFloat(state.ball.style.left), y: parseFloat(state.ball.style.top) },
      zoom: state.zoom, activeTab: state.activeTab,
    })); } catch { /* Only window geometry is optional local storage. */ }
  }
  function clamp() {
    if (!state.panel) return;
    const win = view(), panel = state.panel, rect = panel.getBoundingClientRect();
    const width = Math.min(parseFloat(panel.style.width) || 580, Math.max(0, win.innerWidth - 16));
    const height = Math.min(parseFloat(panel.style.height) || 700, Math.max(0, win.innerHeight - 16));
    Object.assign(panel.style, { width: `${width}px`, height: `${height}px`,
      left: `${Math.max(8, Math.min(parseFloat(panel.style.left) || rect.left, win.innerWidth - width - 8))}px`,
      top: `${Math.max(8, Math.min(parseFloat(panel.style.top) || rect.top, win.innerHeight - height - 8))}px` });
    const x = Math.max(8, Math.min(parseFloat(state.ball.style.left) || win.innerWidth - 68, win.innerWidth - 56));
    const y = Math.max(8, Math.min(parseFloat(state.ball.style.top) || win.innerHeight - 146, win.innerHeight - 56));
    Object.assign(state.ball.style, { left: `${x}px`, top: `${y}px` });
    Object.assign(state.retryBall.style, { left: `${Math.max(8, x - 13)}px`, top: `${Math.min(win.innerHeight - 38, y + 36)}px` });
  }
  function zoom(value) {
    state.zoom = Math.max(.5, Math.min(2, Number(value) || 1));
    panelField('zoom').value = String(state.zoom); panelField('tree').style.zoom = String(state.zoom);
    panelField('tree').style.width = '100%'; layoutSave();
  }
  function applyRawPatch() {
    if (blocked()) return false;
    try {
      const result = service().applyPatch(state.loaded.floor.data, panelField('patch').value);
      state.draft = result.data; state.rawEdited = false; render();
      message(result.applied ? `已应用 ${result.applied} 项补丁到草稿，尚未保存。` : '补丁为空，草稿已重置。');
      return true;
    } catch (error) { message(error.message); return false; }
  }
  function tab(next) {
    if (next === 'deep' && state.rawEdited && !applyRawPatch()) return;
    state.activeTab = next === 'raw' ? 'raw' : 'deep';
    for (const node of state.panel.querySelectorAll('[data-variable-tab]'))
      node.setAttribute('aria-selected', String(node.dataset.variableTab === state.activeTab));
    panelField('deep').hidden = state.activeTab !== 'deep'; panelField('raw').hidden = state.activeTab !== 'raw'; layoutSave();
  }
  function change(domain, parts, op, value) {
    if (blocked()) return false;
    try {
      state.draft = service().mutate(state.draft, domain, parts, op, value); rawSync(); controls(); message('草稿已修改。'); return true;
    } catch (error) { message(error.message); return false; }
  }
  function add(domain, parts) {
    if (blocked()) return;
    const parent = service().at(state.draft[domain], parts), form = panelField('addition');
    form.hidden = false;
    const name = form.querySelector('input'); name.value = ''; name.dataset.variableArrayName = String(Array.isArray(parent));
    name.disabled = Array.isArray(parent);
    form.querySelector('select').value = 'string';
    form.onsubmit = event => {
      event.preventDefault();
      const key = Array.isArray(parent) ? '-' : name.value.trim();
      if (!key) { message('请输入变量名。'); name.focus(); return; }
      if (!Array.isArray(parent) && parent && Object.hasOwn(parent, key)) { message('同名变量已存在，请直接修改。'); return; }
      const types = { string: '新内容', number: 0, boolean: false, object: {}, array: [], null: null };
      if (change(domain, [...parts, key], 'add', types[form.querySelector('select').value])) {
        form.hidden = true; state.expanded.add(idFor(domain, parts)); render();
      }
    };
    (name.disabled ? form.querySelector('select') : name).focus();
  }
  function render() {
    if (!state.panel) return;
    const tree = panelField('tree'), scroll = panelField('deep').scrollTop;
    tree.replaceChildren();
    const filter = panelField('search').value.trim().toLowerCase();
    const dirtyPaths = new Set(Object.entries(delta()).flatMap(([domain, commands]) => commands.map(item => `${domain}:${item.path}`)));
    function node(domain, key, value, parts, rootNode = false) {
      const path = idFor(domain, parts), branch = record(value) || Array.isArray(value);
      const children = branch ? Object.entries(value).filter(([name]) =>
        !['$meta', '__proto__', 'constructor', 'prototype'].includes(name)).map(([name, item]) => node(domain, name, item, [...parts, name])).filter(Boolean) : [];
      const match = `${key} ${path} ${branch ? '' : String(value)}`.toLowerCase().includes(filter);
      if (filter && !match && !children.length) return null;
      const wrapper = element(branch ? 'details' : 'div', 'crypt-lord-variable-workbench__node'); wrapper.dataset.variablePath = path;
      if (branch) wrapper.open = Boolean(filter) || state.expanded.has(rootNode ? domain : path);
      const row = element(branch ? 'summary' : 'div', 'crypt-lord-variable-workbench__row');
      row.classList.toggle('is-updated', state.highlighted.has(path)); row.classList.toggle('is-dirty', dirtyPaths.has(path));
      const label = element('strong'); label.title = path;
      if (branch) { const arrow = element('i', 'fa-solid fa-chevron-right'); arrow.setAttribute('aria-hidden', 'true'); label.append(arrow); }
      label.append(doc().createTextNode(key)); row.append(label);
      if (branch) {
        row.append(element('span', 'crypt-lord-variable-workbench__kind', Array.isArray(value) ? `[${value.length}]` : `{${children.length}}`));
        row.append(button(`新增 ${path}`, 'plus', event => { event.stopPropagation(); event.preventDefault(); add(domain, parts); }, true));
      } else {
        const input = element(value === null ? 'span' : 'input', 'crypt-lord-variable-workbench__input');
        if (value === null) input.textContent = 'null';
        else {
          input.type = typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text';
          if (input.type === 'checkbox') input.checked = value;
          else { input.value = String(value); if (input.type === 'number') input.step = 'any'; }
          input.setAttribute('aria-label', `编辑 ${path}`); input.dataset.variableMutation = '';
          input.addEventListener('change', () => {
            let next = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
            if (input.type === 'number' && !input.value.trim()) next = NaN;
            if (change(domain, parts, 'replace', next)) row.classList.toggle('is-dirty', delta()[domain].some(item => item.path === service().pointer(parts)));
          });
        }
        row.append(input);
      }
      if (!rootNode) {
        const remove = button(`删除 ${path}`, 'trash-can', event => {
          event.preventDefault(); event.stopPropagation();
          if (!view().confirm(`删除变量 ${path}？`)) return;
          if (change(domain, parts, 'remove')) render();
        }, true);
        remove.className = 'is-danger'; row.append(remove);
      }
      wrapper.append(row);
      if (branch) {
        children.forEach(child => wrapper.append(child));
        wrapper.addEventListener('toggle', () => {
          const key = rootNode ? domain : path;
          if (wrapper.open) state.expanded.add(key); else state.expanded.delete(key);
        });
      }
      return wrapper;
    }
    for (const domain of service().domains) {
      const branch = node(domain, domain, state.draft[domain] ?? {}, [], true); if (branch) tree.append(branch);
    }
    if (!tree.childElementCount) tree.append(element('p', '', '没有匹配的变量。'));
    panelField('target').textContent = state.loaded ? `#${state.loaded.floor.message_id}` : '';
    panelField('deep').scrollTop = scroll; controls();
  }
  async function reload() {
    if (state.busy) return false;
    if (state.loaded && dirty() && !view().confirm('放弃未保存的变量草稿，重新读取？')) return false;
    const token = state.token; state.busy = true; controls(); message('正在读取原生楼层...');
    try {
      const loaded = await service().load(state.targetId, () => active(token));
      if (!active(token)) return false;
      state.loaded = loaded; state.targetId = loaded.floor.message_id; state.draft = clone(loaded.floor.data);
      state.variablePrepared = null;
      state.stale = false; state.rawEdited = false;
      if (state.highlightTarget !== loaded.floor.message_id) state.highlighted.clear();
      panelField('addition').hidden = true; rawSync(); render(); message(loaded.reason || '已读取原生楼层变量。'); return true;
    } catch (error) { if (active(token)) { state.stale = true; message(`读取失败：${error.message}`); } return false; }
    finally { if (active(token)) { state.busy = false; controls(); } }
  }
  async function operation(action, complete) {
    if (blocked()) return false;
    const token = state.token; state.busy = true; controls();
    try {
      const result = await action(() => active(token));
      if (!active(token)) return false;
      complete(result); return true;
    } catch (error) {
      if (active(token)) {
        if (error.requiresReload || /变化|重新读取/.test(error.message)) state.stale = true;
        message(`操作失败：${error.message}${error.requiresReload ? '，草稿已保留，请重新读取。' : ''}`);
      }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  function accepted(result) {
    if (result.cancelled) { message('已取消，变量草稿已保留。'); return; }
    if (result.warning) { state.stale = true; message(result.warning); return; }
    const before = state.loaded.floor.data;
    state.loaded = result.loaded; state.draft = clone(result.loaded.floor.data); state.stale = false;
    state.variablePrepared = null;
    rawSync();
    const detail = { messageId: state.targetId, beforeData: before, afterData: state.draft, source: 'manual',
      changedPaths: Object.entries(service().changes(before, state.draft)).flatMap(([domain, items]) => items.map(item => `${domain}:${item.path}`)) };
    view().dispatchEvent(new (view().CustomEvent)('cryptLord:variables-updated', { detail }));
    render(); message(result.unchanged ? '没有变量变化，未写入。' : '变量已保存到当前原生楼层。');
    void modules['cryptLord.gameShell']?.refresh?.();
  }
  function save() {
    if (state.rawEdited && !applyRawPatch()) return Promise.resolve(false);
    return operation(async guard => {
      const preview = await service().prepareCommit(state.loaded, state.draft, guard, state.variablePrepared);
      if (preview.summary.length && !view().confirm(`保存变量并同步以下联动结果？\n\n${preview.summary.join('\n')}`))
        return { cancelled: true };
      if (!guard()) return { cancelled: true };
      return service().commit(state.loaded, state.draft, guard, null, preview);
    }, accepted);
  }
  function repair() {
    const text = panelField('instruction').value.trim();
    if (!text) { message('请填写变量修改要求。'); return Promise.resolve(false); }
    return operation(guard => service().repair(state.loaded, state.draft, text, panelField('patch').value, guard), result => {
      state.variablePrepared = modules['cryptLord.variableSettlementApi']?.assertResult ? result : null;
      state.draft = clone(result.data); rawSync(); render(); message(result.skipped ? 'AI 返回空补丁，草稿未变。' : `AI 已修改 ${result.applied} 项草稿，尚未保存。`);
    });
  }
  async function retryVariableSettlement() {
    if (state.disposed) return false;
    if (state.panel?.dataset.open !== 'true' && !await open()) return false;
    if (state.disposed || blocked()) return false;
    if (dirty() && !view().confirm('重新结算将替换本回合变量及未保存草稿，继续？')) return false;
    return operation(guard => service().retry(state.loaded, guard), accepted);
  }
  function notifyUpdate(detail = {}) {
    const changed = Array.isArray(detail.changedPaths) ? detail.changedPaths : Object.entries(service().changes(detail.beforeData || {}, detail.afterData || {}))
      .flatMap(([domain, entries]) => entries.map(item => `${domain}:${item.path}`));
    if (!changed.length) return;
    state.highlighted = new Set(changed.map(path => path.includes(':') ? path :
      `${path.split('.')[0]}:${service().pointer(path.split('.').slice(1))}`));
    state.highlightTarget = Number(detail.messageId);
    state.unreadChanges = state.panel?.dataset.open === 'true' && state.targetId === state.highlightTarget ? 0 : changed.length;
    const badge = state.ball?.querySelector('b');
    if (badge) { badge.hidden = !state.unreadChanges; badge.textContent = changed.length > 99 ? '99+' : String(changed.length); }
    if (state.loaded?.floor.message_id === Number(detail.messageId) && detail.source !== 'manual') {
      state.stale = true; controls(); message('当前楼层变量已更新，草稿已保留，请重新读取。');
    }
  }
  function close() {
    state.token++; state.busy = false;
    if (state.panel) { state.panel.dataset.open = 'false'; panelField('addition').hidden = true; controls(); }
    layoutSave(); if (state.focus?.isConnected) state.focus.focus();
  }
  async function open(messageId) {
    if (!mount()) return false;
    if (state.panel.dataset.open === 'true' && (messageId === undefined || messageId === state.targetId)) return true;
    const target = Number.isInteger(messageId) ? messageId : null;
    if (state.loaded && target !== null && target !== state.targetId && dirty() && !view().confirm('放弃旧楼层草稿，切换编辑楼层？')) return false;
    const preserve = state.loaded && (target === null || target === state.targetId);
    state.focus = doc().activeElement; state.token++; state.panel.dataset.open = 'true'; state.panel.focus(); clamp();
    state.unreadChanges = 0; state.ball.querySelector('b').hidden = true;
    if (preserve && dirty()) { render(); return true; }
    state.targetId = target; state.loaded = null; state.draft = {}; state.rawEdited = false; return reload();
  }
  function mount() {
    if (state.disposed || state.panel) return Boolean(state.panel);
    if (!doc().body) return false;
    const panel = element('section', 'crypt-lord-variable-workbench');
    panel.dataset.open = 'false'; panel.tabIndex = -1; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '变量修改器');
    panel.innerHTML = '<header><strong>变量修改器</strong><span data-variable-target></span><div data-variable-header-tools></div></header><div class="crypt-lord-variable-workbench__tabs" role="tablist"></div><main><section data-variable-deep><div class="crypt-lord-variable-workbench__tools"><input type="search" data-variable-search aria-label="搜索变量" placeholder="搜索变量路径或键名"><label>缩放<input type="range" data-variable-zoom aria-label="树形缩放" min="0.5" max="2" step="0.1" value="1"></label></div><form data-variable-addition hidden><input aria-label="新变量名" placeholder="变量名"><select aria-label="新变量类型"><option value="string">文本</option><option value="number">数字</option><option value="boolean">开关</option><option value="object">对象</option><option value="array">列表</option><option value="null">空值</option></select><button type="submit">新增</button><button type="button" data-variable-cancel-add>取消</button></form><div data-variable-tree></div></section><section data-variable-raw hidden><label>JSON Patch<textarea data-variable-patch aria-label="原始补丁" spellcheck="false" data-variable-mutation></textarea></label><div data-variable-patch-tools></div><label>变量修改要求<textarea data-variable-instruction aria-label="变量修改要求" data-variable-mutation></textarea></label><div data-variable-ai-tools></div></section></main><footer><span data-variable-status role="status"></span><span data-variable-dirty></span><div data-variable-footer-tools></div></footer>';
    state.panel = panel;
    const ball = button('变量修改器', 'sliders', () => void open()), retryBall = button('重新请求变量结算', 'rotate-right', () => void retryVariableSettlement());
    ball.className = 'crypt-lord-variable-workbench__ball'; ball.append(element('b', '', '')); ball.querySelector('b').hidden = true;
    retryBall.className = 'crypt-lord-variable-workbench__retry-ball'; state.ball = ball; state.retryBall = retryBall;
    let layout = {};
    try { layout = JSON.parse(view().localStorage.getItem('cryptLord.variableWorkbench.state.v1') || '{}'); } catch { /* Use default geometry. */ }
    Object.assign(panel.style, { left: `${Number(layout.panel?.x) || 24}px`, top: `${Number(layout.panel?.y) || 70}px`,
      width: `${Math.max(320, Number(layout.panel?.width) || 600)}px`, height: `${Math.max(400, Number(layout.panel?.height) || 700)}px` });
    if (Number.isFinite(layout.ball?.x)) { ball.style.left = `${layout.ball.x}px`; ball.style.top = `${layout.ball.y}px`; }
    panelField('header-tools').append(
      button('重新结算本回合', 'rotate-right', () => void retryVariableSettlement(), true),
      button('变量可见性', 'eye', () => void modules['cryptLord.aiContextConfigUi']?.open()),
      button('系统设置', 'gear', () => view().dispatchEvent(new (view().CustomEvent)('cryptLord:open-variable-settlement-settings'))),
      button('关闭', 'xmark', close));
    for (const [name, label] of [['deep', '深度编辑'], ['raw', '原始模式']]) {
      const control = button(label, name === 'deep' ? 'list-tree' : 'code', () => tab(name), false, label);
      control.dataset.variableTab = name; control.setAttribute('role', 'tab'); panel.querySelector('[role="tablist"]').append(control);
    }
    panelField('patch-tools').append(button('应用补丁到草稿', 'check', applyRawPatch, true, '应用补丁'),
      button('恢复提取', 'file-arrow-up', () => {
        try { panelField('patch').value = service().recovered(state.loaded.floor); state.rawEdited = true; controls(); message('已恢复提取到补丁草稿。'); }
        catch (error) { message(error.message); }
      }, true, '恢复提取'));
    panelField('ai-tools').append(button('AI 修改', 'wand-magic-sparkles', () => void repair(), true, 'AI 修改'));
    const reloadButton = button('重新读取', 'rotate-right', () => void reload()); reloadButton.dataset.variableReload = '';
    const saveButton = button('应用', 'floppy-disk', () => void save(), true, '应用'); saveButton.dataset.variableSave = ''; saveButton.className = 'is-primary';
    panelField('footer-tools').append(button('重置草稿', 'eraser', () => {
      if (!view().confirm('放弃全部变量草稿修改？')) return;
      state.draft = clone(state.loaded.floor.data); state.variablePrepared = null;
      rawSync(); render(); message('草稿已重置，未写入。');
    }, true), reloadButton, saveButton);
    doc().body.append(ball, retryBall, panel);
    panelField('addition').querySelectorAll('input,select,button').forEach(control => { control.dataset.variableMutation = ''; });
    panelField('cancel-add').onclick = () => { panelField('addition').hidden = true; };
    panelField('search').oninput = render; panelField('zoom').oninput = event => zoom(event.target.value);
    panelField('patch').oninput = () => { state.rawEdited = true; controls(); };
    const attachDrag = (node, target) => {
      let drag = null, moved = false;
      node.addEventListener('pointerdown', event => {
        moved = false;
        if (event.button !== 0 || event.target.closest('button') && node !== ball) return;
        const rect = target.getBoundingClientRect();
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }; node.setPointerCapture(event.pointerId);
      });
      node.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        if (moved) { target.style.left = `${drag.left + dx}px`; target.style.top = `${drag.top + dy}px`; clamp(); }
      });
      for (const name of ['pointerup', 'pointercancel']) node.addEventListener(name, () => { drag = null; layoutSave(); });
      node.addEventListener('click', event => { if (moved) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    };
    attachDrag(panel.querySelector('header'), panel); attachDrag(ball, ball);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const items = [...panel.querySelectorAll('button,input,select,textarea,summary')]
          .filter(item => !item.disabled && item.getClientRects().length);
        if (!items.length) { event.preventDefault(); return; }
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === panel)) { event.preventDefault(); first.focus(); }
      }
    });
    const resize = () => { clamp(); layoutSave(); };
    view().addEventListener('resize', resize); state.cleanups.push(() => view().removeEventListener('resize', resize));
    const observer = new (view().ResizeObserver)(() => { if (panel.dataset.open === 'true') clamp(); });
    observer.observe(panel); state.cleanups.push(() => observer.disconnect());
    const update = event => notifyUpdate(event.detail);
    view().addEventListener('cryptLord:variables-updated', update); state.cleanups.push(() => view().removeEventListener('cryptLord:variables-updated', update));
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) {
      const subscription = host.bindEvent(events.CHAT_CHANGED, () => {
        close(); state.loaded = null; state.draft = {}; state.rawEdited = false; state.stale = false;
        state.highlighted.clear(); state.highlightTarget = null; state.targetId = null; state.unreadChanges = 0; ball.querySelector('b').hidden = true; render();
      });
      state.cleanups.push(() => subscription.stop());
    }
    if (events?.GENERATION_STARTED) {
      const subscription = host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
        if (type === 'quiet' || type === 'dryRun' || dryRun || options?.dryRun || options?.quiet_prompt) return;
        state.token++; state.busy = false; state.stale = true;
        controls(); message('正文生成已开始，草稿已保留，完成后请重新读取。');
      });
      state.cleanups.push(() => subscription.stop());
    }
    rawSync(); render(); tab(layout.activeTab); zoom(layout.zoom); clamp(); return true;
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: Boolean(state.ball), open: state.panel?.dataset.open === 'true',
      targetId: state.targetId, unreadChanges: state.unreadChanges }),
    mount, open, close, reload, save, notifyUpdate, retryVariableSettlement,
    dispose() {
      close(); state.disposed = true; state.cleanups.splice(0).forEach(cleanup => cleanup());
      state.panel?.remove(); state.ball?.remove(); state.retryBall?.remove(); state.panel = null;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
