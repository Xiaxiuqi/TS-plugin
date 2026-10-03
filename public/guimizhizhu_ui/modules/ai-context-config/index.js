(() => {
  'use strict';

  const KEY = 'cryptLord.aiContextConfigUi';
  const CONFIG_KEY = 'cryptLord.aiContextConfig';
  const STORE_KEY = 'cryptLord.stateStore';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const LAYOUT_KEY = 'cryptLord.aiContextConfigUi.layout.v1';
  const DOMAINS = Object.freeze(['stat_data', 'npc_data', 'world_data']);
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const afterNative = root.__stage1Modules?.[HOST_KEY];
  if (!afterNative) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const state = {
    ball: null,
    panel: null,
    tree: null,
    search: null,
    status: null,
    data: {},
    config: { hiddenFields: [], lockedFields: [] },
    expanded: new Set(DOMAINS),
    drag: null,
    resize: null,
    ballDrag: null,
    dirty: false,
    disposed: false,
    cleanups: [],
  };

  function doc() { return afterNative.getHost()?.document || document; }
  function hostWindow() { return doc().defaultView || window; }
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) {
    if (value === undefined) return undefined;
    return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
  }
  function element(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, action, title) {
    const node = element('button');
    node.type = 'button';
    node.dataset.contextAction = action;
    node.textContent = label;
    if (title) node.title = title;
    return node;
  }
  function notify(message, level = 'info') {
    const fn = hostWindow().toastr?.[level] || window.toastr?.[level];
    if (typeof fn === 'function') fn(message);
    else console[level === 'error' ? 'error' : 'info'](`[${KEY}] ${message}`);
  }
  function clear(node) { while (node?.firstChild) node.removeChild(node.firstChild); }
  function pathFor(parts) { return parts.join('.'); }
  function pathLabel(path) { return path.split('.').slice(1).join('.') || path; }
  function settingList(name) { return Array.isArray(state.config[name]) ? state.config[name] : []; }
  function setList(name, values) { state.config = { ...state.config, [name]: Array.from(new Set(values)) }; state.dirty = true; }
  function layout() {
    try {
      const saved = JSON.parse(hostWindow().localStorage?.getItem(LAYOUT_KEY) || '{}');
      return {
        panel: {
          x: Number.isFinite(saved?.panel?.x) ? saved.panel.x : 510,
          y: Number.isFinite(saved?.panel?.y) ? saved.panel.y : 112,
          width: Math.max(340, Number(saved?.panel?.width) || 430),
          height: Math.max(420, Number(saved?.panel?.height) || 640),
        },
        ball: {
          x: Number.isFinite(saved?.ball?.x) ? saved.ball.x : null,
          y: Number.isFinite(saved?.ball?.y) ? saved.ball.y : null,
        },
      };
    } catch { return { panel: { x: 510, y: 112, width: 430, height: 640 }, ball: { x: null, y: null } }; }
  }
  function saveLayout() {
    if (!state.panel || !state.ball) return;
    try {
      hostWindow().localStorage?.setItem(LAYOUT_KEY, JSON.stringify({
        panel: {
          x: parseFloat(state.panel.style.left) || 510,
          y: parseFloat(state.panel.style.top) || 112,
          width: parseFloat(state.panel.style.width) || 430,
          height: parseFloat(state.panel.style.height) || 640,
        },
        ball: {
          x: parseFloat(state.ball.style.left),
          y: parseFloat(state.ball.style.top),
        },
      }));
    } catch { /* Layout persistence is optional. */ }
  }
  function clampPanel() {
    if (!state.panel) return;
    const view = hostWindow();
    const width = Math.min(Math.max(340, parseFloat(state.panel.style.width) || 430), Math.max(340, view.innerWidth - 16));
    const height = Math.min(Math.max(420, parseFloat(state.panel.style.height) || 640), Math.max(420, view.innerHeight - 16));
    const x = Math.max(8, Math.min(parseFloat(state.panel.style.left) || 8, view.innerWidth - width - 8));
    const y = Math.max(8, Math.min(parseFloat(state.panel.style.top) || 8, view.innerHeight - height - 8));
    Object.assign(state.panel.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
  }
  function clampBall() {
    if (!state.ball) return;
    const view = hostWindow();
    const width = state.ball.offsetWidth || 44;
    const height = state.ball.offsetHeight || 44;
    const hasPosition = Number.isFinite(parseFloat(state.ball.style.left)) && Number.isFinite(parseFloat(state.ball.style.top));
    if (!hasPosition) {
      state.ball.style.left = `${Math.max(8, view.innerWidth - width - 20)}px`;
      state.ball.style.top = `${Math.max(8, view.innerHeight - height - 185)}px`;
      return;
    }
    state.ball.style.left = `${Math.max(8, Math.min(parseFloat(state.ball.style.left), view.innerWidth - width - 8))}px`;
    state.ball.style.top = `${Math.max(8, Math.min(parseFloat(state.ball.style.top), view.innerHeight - height - 8))}px`;
  }
  function configApi() { return root.__stage1Modules?.[CONFIG_KEY]; }
  function isLocked(path) { return configApi()?.isLocked?.(state.config, path) || false; }
  function isHidden(path) { return configApi()?.isHidden?.(state.config, path) || false; }
  function addPath(name, path) {
    const current = settingList(name).filter(value => !(value === path || value.startsWith(`${path}.`)));
    if (!current.some(value => path.startsWith(`${value}.`) || value === path)) current.push(path);
    setList(name, current);
  }
  function removeCoveringPath(name, path) {
    setList(name, settingList(name).filter(value => !(value === path || path.startsWith(`${value}.`) || value.startsWith(`${path}.`))));
  }
  function setVisibility(path, visible) {
    if (isLocked(path)) return;
    if (visible) removeCoveringPath('hiddenFields', path);
    else addPath('hiddenFields', path);
    render();
  }
  function setLocked(path, locked) {
    if (locked) addPath('lockedFields', path);
    else removeCoveringPath('lockedFields', path);
    render();
  }
  function changeStatus(text) { if (state.status) state.status.textContent = text; }
  function updateStatus() {
    const hidden = settingList('hiddenFields').length;
    const locked = settingList('lockedFields').length;
    changeStatus(`${state.dirty ? '未保存 · ' : ''}隐藏 ${hidden} 项 · 锁定 ${locked} 项`);
  }
  function matchesFilter(path, key, value, filter) {
    if (!filter) return true;
    const text = `${path} ${key} ${typeof value === 'object' ? '' : String(value)}`.toLowerCase();
    return text.includes(filter);
  }
  function treeNode(key, value, parts, filter) {
    const path = pathFor(parts);
    const branch = value && typeof value === 'object';
    const keys = branch ? Object.keys(value) : [];
    const children = branch ? keys.map(child => treeNode(child, value[child], [...parts, child], filter)).filter(Boolean) : [];
    const directMatch = matchesFilter(path, key, value, filter);
    if (filter && !directMatch && !children.length) return null;
    const wrapper = element(branch ? 'details' : 'div', `crypt-lord-ai-context__node${branch ? ' is-branch' : ''}`);
    if (branch) wrapper.open = state.expanded.has(path) || Boolean(filter);
    const row = element(branch ? 'summary' : 'div', 'crypt-lord-ai-context__row');
    const name = element('span', 'crypt-lord-ai-context__name', key);
    name.title = pathLabel(path);
    row.appendChild(name);
    if (branch) row.appendChild(element('span', 'crypt-lord-ai-context__kind', Array.isArray(value) ? `[${keys.length}]` : `{${keys.length}}`));
    else row.appendChild(element('span', 'crypt-lord-ai-context__value', String(value)));
    const controls = element('span', 'crypt-lord-ai-context__controls');
    const visible = element('input');
    visible.type = 'checkbox';
    visible.checked = !isHidden(path);
    visible.disabled = isLocked(path);
    visible.title = isLocked(path) ? '已锁定字段不会提供给变量副 API' : '是否提供给变量副 API';
    visible.addEventListener('click', event => event.stopPropagation());
    visible.addEventListener('change', () => setVisibility(path, visible.checked));
    const lock = element('input');
    lock.type = 'checkbox';
    lock.checked = isLocked(path);
    lock.title = '锁定后，变量副 API 不可读取或修改此字段';
    lock.addEventListener('click', event => event.stopPropagation());
    lock.addEventListener('change', () => setLocked(path, lock.checked));
    controls.append(visible, lock);
    row.appendChild(controls);
    if (branch) {
      wrapper.appendChild(row);
      const childList = element('div', 'crypt-lord-ai-context__children');
      children.forEach(child => childList.appendChild(child));
      wrapper.appendChild(childList);
      wrapper.addEventListener('toggle', () => {
        if (wrapper.open) state.expanded.add(path); else state.expanded.delete(path);
      });
    } else wrapper.appendChild(row);
    if (isHidden(path)) wrapper.classList.add('is-hidden');
    if (isLocked(path)) wrapper.classList.add('is-locked');
    return wrapper;
  }
  function render() {
    if (!state.tree) return;
    clear(state.tree);
    const filter = String(state.search?.value || '').trim().toLowerCase();
    let count = 0;
    for (const domain of DOMAINS) {
      const node = treeNode(domain, state.data?.[domain] || {}, [domain], filter);
      if (node) { state.tree.appendChild(node); count += 1; }
    }
    if (!count) state.tree.appendChild(element('div', 'crypt-lord-ai-context__empty', '未找到匹配字段'));
    updateStatus();
  }
  async function reload() {
    const [config, store] = await Promise.all([
      configApi().readConfig(),
      contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 }),
    ]);
    state.config = clone(config);
    state.data = clone(await store.readAssistantData()) || {};
    state.dirty = false;
    render();
  }
  async function save() {
    try {
      state.config = clone(await configApi().saveConfig(state.config));
      state.dirty = false;
      render();
      notify('变量副 API 可见性配置已保存。', 'success');
    } catch (error) { notify(`配置保存失败：${error?.message || error}`, 'error'); }
  }
  function close() { if (state.panel) state.panel.dataset.open = 'false'; saveLayout(); }
  async function open() {
    if (!mount()) return false;
    state.panel.dataset.open = 'true';
    clampPanel();
    try { await reload(); }
    catch (error) { changeStatus(`读取变量失败：${error?.message || error}`); }
    return true;
  }
  function mount() {
    if (state.disposed || state.panel || !doc()?.body) return Boolean(state.panel);
    const saved = layout();
    const ball = element('button', 'crypt-lord-ai-context__ball', '◉');
    ball.type = 'button';
    ball.title = '变量副 API 可见性与锁定配置';
    ball.setAttribute('aria-label', '变量副 API 配置');
    if (saved.ball.x !== null) { ball.style.left = `${saved.ball.x}px`; ball.style.top = `${saved.ball.y}px`; }
    const panel = element('section', 'crypt-lord-ai-context');
    panel.dataset.open = 'false';
    Object.assign(panel.style, { left: `${saved.panel.x}px`, top: `${saved.panel.y}px`, width: `${saved.panel.width}px`, height: `${saved.panel.height}px` });
    panel.innerHTML = '<header><strong>变量 AI 配置</strong><span data-ai-context-status></span><div><button type="button" data-context-action="reload" title="重新读取">↻</button><button type="button" data-context-action="close" title="关闭">×</button></div></header><div class="crypt-lord-ai-context__toolbar"><input type="search" data-ai-context-search placeholder="搜索变量路径或键名"><button type="button" data-context-action="show-all">显示全部</button><button type="button" data-context-action="hide-all">隐藏全部</button><button type="button" data-context-action="reset">重置</button></div><div class="crypt-lord-ai-context__legend"><span><i></i> 可见</span><span><b></b> 锁定</span></div><main data-ai-context-tree></main><footer><span data-ai-context-status></span><button type="button" data-context-action="save" class="is-primary">保存</button></footer><i class="crypt-lord-ai-context__resize" title="拖拽调整窗口大小"></i>';
    doc().body.append(ball, panel);
    state.ball = ball;
    state.panel = panel;
    state.tree = panel.querySelector('[data-ai-context-tree]');
    state.search = panel.querySelector('[data-ai-context-search]');
    state.status = panel.querySelector('footer [data-ai-context-status]');
    clampBall();
    clampPanel();
    let dragMoved = false;
    ball.addEventListener('pointerdown', event => {
      state.ballDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: parseFloat(ball.style.left) || 0, top: parseFloat(ball.style.top) || 0 };
      dragMoved = false;
      ball.setPointerCapture?.(event.pointerId);
    });
    ball.addEventListener('pointermove', event => {
      if (!state.ballDrag || event.pointerId !== state.ballDrag.id) return;
      const dx = event.clientX - state.ballDrag.x;
      const dy = event.clientY - state.ballDrag.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
      if (!dragMoved) return;
      ball.style.left = `${state.ballDrag.left + dx}px`;
      ball.style.top = `${state.ballDrag.top + dy}px`;
      clampBall();
    });
    const finishBall = event => {
      if (!state.ballDrag || (event && event.pointerId !== state.ballDrag.id)) return;
      state.ballDrag = null;
      saveLayout();
    };
    ball.addEventListener('pointerup', finishBall);
    ball.addEventListener('pointercancel', finishBall);
    ball.addEventListener('click', () => { if (!dragMoved) void open(); });
    const header = panel.querySelector('header');
    header.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: parseFloat(panel.style.left) || 0, top: parseFloat(panel.style.top) || 0 };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag || event.pointerId !== state.drag.id) return;
      panel.style.left = `${state.drag.left + event.clientX - state.drag.x}px`;
      panel.style.top = `${state.drag.top + event.clientY - state.drag.y}px`;
      clampPanel();
    });
    const endDrag = event => { if (state.drag && (!event || event.pointerId === state.drag.id)) { state.drag = null; saveLayout(); } };
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
    const resize = panel.querySelector('.crypt-lord-ai-context__resize');
    resize.addEventListener('pointerdown', event => {
      state.resize = { id: event.pointerId, x: event.clientX, y: event.clientY, width: panel.offsetWidth, height: panel.offsetHeight };
      resize.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    resize.addEventListener('pointermove', event => {
      if (!state.resize || event.pointerId !== state.resize.id) return;
      panel.style.width = `${state.resize.width + event.clientX - state.resize.x}px`;
      panel.style.height = `${state.resize.height + event.clientY - state.resize.y}px`;
      clampPanel();
    });
    const endResize = event => { if (state.resize && (!event || event.pointerId === state.resize.id)) { state.resize = null; saveLayout(); } };
    resize.addEventListener('pointerup', endResize);
    resize.addEventListener('pointercancel', endResize);
    state.search.addEventListener('input', render);
    panel.addEventListener('click', event => {
      const action = event.target?.dataset?.contextAction;
      if (action === 'close') close();
      if (action === 'reload') void reload();
      if (action === 'save') void save();
      if (action === 'show-all') { setList('hiddenFields', []); render(); }
      if (action === 'hide-all') { setList('hiddenFields', DOMAINS); render(); }
      if (action === 'reset') { state.config = { hiddenFields: [], lockedFields: [] }; state.dirty = true; render(); }
    });
    const onResize = () => { clampPanel(); clampBall(); saveLayout(); };
    hostWindow().addEventListener('resize', onResize);
    state.cleanups.push(() => hostWindow().removeEventListener('resize', onResize));
    return true;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true', dirty: state.dirty }); },
    mount,
    open,
    close,
    reload,
    dispose() {
      state.disposed = true;
      state.cleanups.splice(0).forEach(cleanup => cleanup());
      state.ball?.remove();
      state.panel?.remove();
      state.ball = null;
      state.panel = null;
      try { contract.releaseGlobal(KEY, api); } catch {}
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
