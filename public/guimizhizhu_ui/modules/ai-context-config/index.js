(() => {
  'use strict';

  const KEY = 'cryptLord.aiContextConfigUi';
  const CONFIG_KEY = 'cryptLord.aiContextConfig';
  const HOST_API_KEY = 'cryptLord.hostApi';
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
    revision: null,
    busy: false,
    token: 0,
    loaded: false,
    zoom: 1,
    retained: new Set(),
    focus: null,
    subscription: null,
    disposed: false,
    cleanups: [],
  };

  function doc() { return afterNative.getHost()?.document || document; }
  function hostWindow() { return doc().defaultView || window; }
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
    const width = Math.min(Math.max(340, parseFloat(state.panel.style.width) || 430), Math.max(0, view.innerWidth - 16));
    const height = Math.min(Math.max(420, parseFloat(state.panel.style.height) || 640), Math.max(0, view.innerHeight - 16));
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
  function setVisibility(path, visible) {
    if (isLocked(path)) return;
    if (visible) {
      const patterns = settingList('hiddenFields').filter(value => configApi().patternMatches(value, path));
      if (patterns.some(value => value !== path) && !hostWindow().confirm(`显示此字段需要移除覆盖规则：${patterns.join('、')}。继续？`)) { render(); return; }
      setList('hiddenFields', settingList('hiddenFields').filter(value => !patterns.includes(value)));
    }
    else addPath('hiddenFields', path);
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
    visible.setAttribute('aria-label', `可见 ${path}`);
    visible.addEventListener('click', event => event.stopPropagation());
    visible.addEventListener('change', () => setVisibility(path, visible.checked));
    controls.append(visible);
    if (isLocked(path)) {
      const lock = element('span', '', '锁定');
      lock.title = '此字段由锁定清单保护';
      controls.append(lock);
    }
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
    renderInvalid();
    updateStatus();
  }
  function renderInvalid() {
    const container = state.panel.querySelector('[data-context-invalid]');
    container.replaceChildren();
    const invalid = configApi().invalidFields(state.data, state.config).filter(path => !state.retained.has(path));
    if (!invalid.length) return;
    container.append(element('strong', '', `失效隐藏配置 (${invalid.length})`));
    for (const path of invalid) {
      const row = element('div', 'crypt-lord-ai-context__invalid-row');
      row.append(element('span', '', path));
      for (const [action, text] of [['remove', '清除'], ['keep', '保留']]) {
        const control = button(text, '', `${text} ${path}`);
        control.setAttribute('aria-label', `${text} ${path}`);
        control.addEventListener('click', () => {
          if (action === 'keep') state.retained.add(path);
          else setList('hiddenFields', settingList('hiddenFields').filter(value => value !== path));
          render();
        });
        row.append(control);
      }
      container.append(row);
    }
    const clearAll = button('清除全部失效配置', '');
    clearAll.addEventListener('click', () => {
      setList('hiddenFields', settingList('hiddenFields').filter(path => !invalid.includes(path)));
      render();
    });
    container.append(clearAll);
  }
  const active = token => !state.disposed && modules[KEY] === api && modules[HOST_KEY] === afterNative &&
    state.panel?.dataset.open === 'true' && state.token === token && doc() === state.panel.ownerDocument;
  function setBusy(value) {
    state.busy = value;
    state.panel.setAttribute('aria-busy', String(value));
    state.panel.querySelector('[data-context-fieldset]').disabled = value || !state.loaded || !state.revision;
    state.panel.querySelector('[data-context-action="save"]').disabled = value || !state.loaded || !state.revision;
    state.panel.querySelector('[data-context-action="reload"]').disabled = value;
  }
  async function reload() {
    if (state.busy) return false;
    if (state.dirty && !hostWindow().confirm('放弃未保存的可见性修改，重新读取？')) return false;
    const token = state.token, selected = configApi(), sourceHost = modules[HOST_API_KEY];
    const valid = () => active(token) && configApi() === selected && modules[HOST_API_KEY] === sourceHost;
    setBusy(true);
    changeStatus('正在读取配置与当前楼层...');
    try {
      const [snapshot, floors] = await Promise.all([
        selected.readSnapshot(valid),
        contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 }),
      ]);
      const loaded = await floors.readFloorSource({ guard: valid });
      if (loaded.floor.is_hidden) throw Error('当前 assistant 楼层已隐藏，请选择公开楼层');
      const fresh = await selected.readSnapshot(valid);
      await floors.assertFloorSource(loaded, valid);
      if (JSON.stringify(snapshot.revision) !== JSON.stringify(fresh.revision)) throw Error('读取期间可见性配置已变化，请重新读取');
      if (!valid()) return false;
      state.config = clone(snapshot.config);
      state.revision = snapshot.revision;
      state.data = clone(loaded.floor.data);
      state.loaded = true;
      state.dirty = false;
      state.retained.clear();
      render();
      return true;
    } catch (error) {
      if (active(token)) {
        state.loaded = false;
        state.revision = null;
        state.tree.replaceChildren();
        state.panel.querySelector('[data-context-invalid]').replaceChildren();
        changeStatus(`读取失败：${error.message || error}`);
      }
      return false;
    } finally { if (active(token)) setBusy(false); }
  }
  async function save() {
    if (state.busy || !state.loaded || !state.revision) return;
    const token = state.token, selected = configApi(), sourceHost = modules[HOST_API_KEY];
    const valid = () => active(token) && configApi() === selected && modules[HOST_API_KEY] === sourceHost;
    setBusy(true);
    try {
      const saved = await selected.saveConfig(state.config, state.revision, valid);
      if (!active(token)) return;
      state.config = configApi().normalize(saved);
      state.revision = saved.revision;
      state.dirty = false;
      render();
      changeStatus(saved.warning || '可见性配置已保存。');
    } catch (error) {
      if (active(token)) {
        if (error.requiresReload || /来源|身份|别处更改/.test(error.message)) state.revision = null;
        changeStatus(`配置保存失败：${error?.message || error}${error.requiresReload ? '，草稿已保留，请重新读取。' : ''}`);
      }
    }
    finally { if (active(token)) setBusy(false); }
  }
  function close() {
    state.token++;
    state.drag = null;
    state.resize = null;
    if (state.panel) { state.panel.dataset.open = 'false'; setBusy(false); }
    if (state.ball) state.ball.hidden = false;
    saveLayout();
    if (state.focus?.isConnected) state.focus.focus();
  }
  async function open() {
    if (!mount()) return false;
    if (state.panel.dataset.open === 'true') return true;
    state.focus = doc().activeElement;
    state.token++;
    state.panel.dataset.open = 'true';
    state.ball.hidden = true;
    state.panel.focus();
    clampPanel();
    if (state.loaded && state.dirty) { render(); setBusy(false); }
    else await reload();
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
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '变量 AI 配置');
    panel.tabIndex = -1;
    panel.innerHTML = '<header><strong>变量 AI 配置</strong><span data-ai-context-status></span><div><button type="button" data-context-action="reload" title="重新读取" aria-label="重新读取">↻</button><button type="button" data-context-action="close" title="关闭" aria-label="关闭">×</button></div></header><div class="crypt-lord-ai-context__scroll"><fieldset data-context-fieldset><div class="crypt-lord-ai-context__toolbar"><input type="search" data-ai-context-search aria-label="搜索变量" placeholder="搜索变量路径或键名"><button type="button" data-context-action="show-all">显示全部</button><button type="button" data-context-action="hide-all">隐藏全部</button><button type="button" data-context-action="reset">重置</button></div><div class="crypt-lord-ai-context__legend"><span>可见</span><span>锁定</span><label>缩放 <input type="range" min="0.5" max="2" step="0.1" value="1" aria-label="树形缩放"></label></div><section data-context-invalid></section><main data-ai-context-tree></main></fieldset></div><footer><span data-ai-context-status role="status"></span><button type="button" data-context-action="save" class="is-primary">保存</button></footer><i class="crypt-lord-ai-context__resize" title="拖拽调整窗口大小"></i>';
    doc().body.append(ball, panel);
    state.ball = ball;
    state.panel = panel;
    state.tree = panel.querySelector('[data-ai-context-tree]');
    state.search = panel.querySelector('[data-ai-context-search]');
    state.status = panel.querySelector('footer [data-ai-context-status]');
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button,input,summary')].filter(item =>
          !item.matches(':disabled') && item.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && [first, panel].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && [last, panel].includes(doc().activeElement)) { event.preventDefault(); first?.focus(); }
      }
    });
    panel.querySelector('[aria-label="树形缩放"]').addEventListener('input', event => {
      state.zoom = Number(event.target.value);
      state.tree.style.zoom = String(state.zoom);
    });
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
      if (action === 'hide-all') { setList('hiddenFields', configApi().allPaths(state.data).filter(path => !isLocked(path))); render(); }
      if (action === 'reset' && hostWindow().confirm('重置隐藏清单为全部显示？锁定清单将保留。')) { setList('hiddenFields', []); state.retained.clear(); render(); }
    });
    const onResize = () => { clampPanel(); clampBall(); saveLayout(); };
    hostWindow().addEventListener('resize', onResize);
    state.cleanups.push(() => hostWindow().removeEventListener('resize', onResize));
    const events = afterNative.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = afterNative.bindEvent(events.CHAT_CHANGED, () => {
      close();
      state.config = configApi().defaults();
      state.data = {};
      state.dirty = false;
      state.loaded = false;
      state.revision = null;
      state.retained.clear();
    });
    setBusy(false);
    return true;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true', dirty: state.dirty }); },
    mount,
    open,
    close,
    reload,
    dispose() {
      close();
      state.disposed = true;
      state.subscription?.stop?.();
      state.cleanups.splice(0).forEach(cleanup => cleanup());
      state.ball?.remove();
      state.panel?.remove();
      state.ball = null;
      state.panel = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
