(() => {
  'use strict';
  const KEY = 'cryptLord.dlcManager';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'];
  const service = modules['cryptLord.dlcService'];
  if (!contract || !host || !service) throw new Error('DLC 管理器依赖尚未加载');
  const state = { mask: null, dialog: null, body: null, bookName: null, entries: [], busy: false,
    token: 0, disposed: false, drag: null, cleanup: null, subscriptions: [], focus: null,
    generating: service.status().generating };
  const doc = () => host.getHost()?.document || window.document;
  const win = () => doc().defaultView || window;
  const active = token => !state.disposed && state.mask?.dataset.open === 'true' && token === state.token &&
    modules[KEY] === api && modules['cryptLord.dlcService'] === service &&
    modules['cryptLord.afterNativeHost'] === host && state.mask.ownerDocument === doc();
  function element(tag, cls, text) {
    const node = doc().createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, title, callback) {
    const node = element('button', '', text);
    node.type = 'button';
    node.title = title;
    node.setAttribute('aria-label', title);
    node.addEventListener('click', callback);
    return node;
  }
  function iconButton(symbol, icon, title, callback) {
    const node = button(symbol, title, callback);
    const fonts = doc().fonts;
    if (fonts?.load) void fonts.load('900 13px "Font Awesome 6 Free"').then(loaded => {
      if (!loaded.length || !node.isConnected) return;
      const glyph = element('i', `fa-solid ${icon}`);
      glyph.setAttribute('aria-hidden', 'true');
      node.replaceChildren(glyph);
    }).catch(() => {});
    return node;
  }
  function message(text, error = false) {
    const result = state.mask.querySelector('[data-dlc-result]');
    result.textContent = text;
    result.dataset.error = String(error);
  }
  function busy(value) {
    state.busy = value;
    state.body.disabled = value || state.generating;
    state.mask.setAttribute('aria-busy', String(value));
    state.mask.querySelector('[aria-label="刷新 DLC 条目"]').disabled = value || state.generating;
  }
  function close() {
    state.token++;
    state.drag = null;
    if (!state.mask) return;
    state.mask.dataset.open = 'false';
    busy(false);
    if (state.focus?.isConnected) state.focus.focus();
  }
  const clamp = (value, max) => Math.max(8, Math.min(value, Math.max(8, max)));
  function syncViewport() {
    if (!state.mask) return;
    const view = win();
    const rootElement = doc().documentElement;
    const style = view.getComputedStyle(rootElement);
    const transformed = style.transform !== 'none' || style.perspective !== 'none' || style.filter !== 'none';
    state.mask.style.top = `${transformed ? -rootElement.getBoundingClientRect().top : 0}px`;
    state.mask.style.height = `${view.innerHeight}px`;
    if (state.dialog.style.left) {
      state.dialog.style.left = `${clamp(parseFloat(state.dialog.style.left), view.innerWidth - state.dialog.offsetWidth - 8)}px`;
      state.dialog.style.top = `${clamp(parseFloat(state.dialog.style.top), view.innerHeight - state.dialog.offsetHeight - 8)}px`;
    }
  }
  function mount() {
    if (state.disposed || state.mask || !doc().body) return Boolean(state.mask);
    const mask = element('section', 'crypt-lord-dlc-manager');
    mask.dataset.open = 'false';
    const dialog = element('section', 'crypt-lord-dlc-manager__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'DLC 管理器');
    dialog.tabIndex = -1;
    const header = element('header');
    const book = element('span');
    book.dataset.dlcBook = '';
    const refresh = iconButton('↻', 'fa-rotate-right', '刷新 DLC 条目', () => void reload());
    const exit = iconButton('×', 'fa-xmark', '关闭', close);
    header.append(element('strong', '', 'DLC 管理器'), book, refresh, exit);
    const scroller = element('div', 'crypt-lord-dlc-manager__body');
    const body = element('fieldset', 'crypt-lord-dlc-manager__controls');
    scroller.append(body);
    const result = element('div', 'crypt-lord-dlc-manager__result');
    result.dataset.dlcResult = '';
    result.setAttribute('role', 'status');
    dialog.append(header, scroller, result);
    mask.append(dialog);
    doc().body.append(mask);
    Object.assign(state, { mask, dialog, body });
    mask.addEventListener('click', event => { if (event.target === mask) close(); });
    mask.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const nodes = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), summary')]
          .filter(node => !node.closest('fieldset:disabled') && node.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (doc().activeElement === first || doc().activeElement === dialog)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === dialog)) { event.preventDefault(); first?.focus(); }
      }
    });
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      dialog.style.left = `${clamp(state.drag.left + event.clientX - state.drag.x, win().innerWidth - dialog.offsetWidth - 8)}px`;
      dialog.style.top = `${clamp(state.drag.top + event.clientY - state.drag.y, win().innerHeight - dialog.offsetHeight - 8)}px`;
      dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
    const view = win();
    view.addEventListener('scroll', syncViewport, { passive: true });
    view.addEventListener('resize', syncViewport);
    state.cleanup = () => { view.removeEventListener('scroll', syncViewport); view.removeEventListener('resize', syncViewport); };
    const events = host.tavernEvents();
    const bind = (name, fn) => { if (name) { const sub = host.bindEvent(name, fn); if (sub) state.subscriptions.push(sub); } };
    bind(events?.CHAT_CHANGED, () => {
      state.generating = false;
      close();
      state.bookName = null;
      state.entries = [];
    });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      state.token++;
      state.generating = true;
      state.entries = [];
      render();
      busy(false);
      message('正文生成中，DLC 操作已暂停。', true);
    });
    const ended = () => {
      state.generating = false;
      busy(false);
      if (state.mask.dataset.open === 'true') message('生成已结束，请重新读取 DLC 条目。', true);
    };
    bind(events?.GENERATION_ENDED, ended);
    bind(events?.GENERATION_STOPPED, ended);
    syncViewport();
    return true;
  }
  function render() {
    state.body.replaceChildren();
    state.mask.querySelector('[data-dlc-book]').textContent = state.bookName || '世界书未绑定';
    if (!state.bookName || !state.entries.length) {
      state.body.append(element('div', 'crypt-lord-dlc-manager__empty', state.bookName ? '未找到 DLC 条目。' : '未找到当前角色绑定的主世界书。'));
      return;
    }
    state.body.append(element('div', 'crypt-lord-dlc-manager__count', `${state.entries.filter(item => item.enabled).length} / ${state.entries.length} 已启用`));
    for (const entry of state.entries) {
      const row = element('article', 'crypt-lord-dlc-manager__card');
      const info = element('details', 'crypt-lord-dlc-manager__info');
      const summary = element('summary');
      const title = service.name(entry);
      summary.append(element('strong', '', title), element('p', '', service.preview(entry)));
      info.append(summary, element('pre', '', String(entry.content || '(无内容)')));
      const label = element('label', 'crypt-lord-dlc-manager__switch');
      const input = element('input');
      input.type = 'checkbox';
      input.checked = Boolean(entry.enabled);
      input.setAttribute('role', 'switch');
      input.setAttribute('aria-label', title);
      const track = element('span', 'crypt-lord-dlc-manager__track');
      track.setAttribute('aria-hidden', 'true');
      label.append(input, track, element('span', '', entry.enabled ? '已启用' : '已禁用'));
      input.addEventListener('change', () => void toggle(entry, input.checked));
      row.append(info, label);
      state.body.append(row);
    }
  }
  async function reload() {
    if (state.busy || state.generating || !state.mask || state.mask.dataset.open !== 'true') return false;
    const token = state.token;
    busy(true);
    message('正在读取 DLC 条目...');
    try {
      const data = await service.load(() => active(token));
      if (!active(token)) return false;
      Object.assign(state, data);
      render();
      message('');
      return true;
    } catch (error) {
      if (active(token)) {
        state.entries = [];
        state.bookName = null;
        render();
        message(`读取 DLC 失败：${error.message || error}`, true);
      }
      return false;
    } finally { if (active(token)) busy(false); }
  }
  async function toggle(entry, enabled) {
    if (state.busy || state.generating) return;
    const token = state.token;
    const title = service.name(entry);
    let committed = false;
    busy(true);
    message(`正在${enabled ? '启用' : '禁用'} ${title}...`);
    try {
      const result = await service.toggle(state.bookName, entry, enabled, () => active(token));
      committed = true;
      if (!active(token)) return;
      const data = await service.load(() => active(token));
      if (!active(token)) return;
      Object.assign(state, data);
      render();
      message(`${title} 已${enabled ? '启用' : '禁用'}。${result.warning}`, Boolean(result.warning));
    } catch (error) {
      if (active(token)) {
        if (committed) {
          state.entries = [];
          render();
          message(`开关已保存，但重新读取失败：${error.message || error}`, true);
        } else if (error.requiresReload) {
          state.entries = [];
          render();
          message(`${error.submitted ? '宿主已返回提交响应，但实际开关未确认' : '切换 DLC 失败'}：${error.message || error}；请重新读取后核对。`, true);
        } else {
          render();
          message(`切换 DLC 失败：${error.message || error}`, true);
        }
      }
    } finally { if (active(token)) busy(false); }
  }
  async function open() {
    if (!mount()) return false;
    if (state.mask.dataset.open === 'true') return true;
    state.focus = doc().activeElement;
    state.token++;
    state.mask.dataset.open = 'true';
    state.entries = [];
    state.bookName = null;
    render();
    syncViewport();
    state.dialog.focus();
    busy(false);
    if (state.generating) { message('正文生成中，DLC 操作已暂停。', true); return false; }
    return reload();
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', busy: state.busy, bookName: state.bookName, entries: state.entries.length }),
    mount, open, close, reload,
    dispose() {
      close();
      state.disposed = true;
      state.cleanup?.();
      state.subscriptions.forEach(sub => sub.stop());
      state.mask?.remove();
      state.mask = null;
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
