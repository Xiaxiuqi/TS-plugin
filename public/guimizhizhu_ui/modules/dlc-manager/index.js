(() => {
  'use strict';

  const KEY = 'cryptLord.dlcManager';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const host = root.__stage1Modules?.[HOST_KEY];
  if (!host) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const state = { mask: null, dialog: null, body: null, bookName: null, entries: [], drag: null, viewportCleanup: null, disposed: false };

  function owners() {
    const result = [window];
    for (const key of ['parent', 'top']) { try { if (window[key] && !result.includes(window[key])) result.push(window[key]); } catch {} }
    return result;
  }
  function apiFor(owner) { return owner?.TavernHelper || owner; }
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function doc() { return host.getHost()?.document || window.document; }
  function win() { return doc().defaultView || window; }
  function notify(message, level = 'info') { const fn = win().toastr?.[level] || window.toastr?.[level]; if (typeof fn === 'function') fn(message); }
  function element(tag, className, text) { const node = doc().createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function button(label, className, handler) { const node = element('button', className, label); node.type = 'button'; node.addEventListener('click', handler); return node; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isDlc(entry) { return /【DLC】|\[DLC\]/i.test(String(entry?.comment || entry?.name || '')); }
  function displayName(entry) { return String(entry?.comment || entry?.name || '未命名 DLC').replace(/【DLC】|\[DLC\]/ig, '').trim() || '未命名 DLC'; }
  function preview(entry) { return String(entry?.content || '').replace(/\s+/g, ' ').trim().slice(0, 180) || '该条目没有正文。'; }

  async function method(name, ...args) {
    for (const owner of owners()) {
      const api = apiFor(owner);
      if (typeof api?.[name] === 'function') return api[name](...args);
    }
    throw new Error(`当前酒馆未提供 ${name}。`);
  }
  async function resolveBookName() {
    for (const owner of owners()) {
      const api = apiFor(owner);
      if (typeof api?.getCharWorldbookNames === 'function') {
        const current = await api.getCharWorldbookNames('current');
        if (current?.primary) return current.primary;
      }
      if (typeof owner?.WorldbookManager?.PRIMARY_BOOK === 'string' && owner.WorldbookManager.PRIMARY_BOOK) return owner.WorldbookManager.PRIMARY_BOOK;
    }
    const names = await method('getWorldbookNames');
    for (const name of names || []) {
      const entries = await method('getWorldbook', name);
      if (entries?.some?.(isDlc)) return name;
    }
    return null;
  }
  function close() { if (state.mask) state.mask.dataset.open = 'false'; }
  function syncViewport() {
    if (!state.mask) return;
    const view = win();
    const rootElement = doc().documentElement;
    const style = view.getComputedStyle(rootElement);
    const transformed = style.transform !== 'none' || style.perspective !== 'none' || style.filter !== 'none';
    state.mask.style.top = `${transformed ? -rootElement.getBoundingClientRect().top : 0}px`;
    state.mask.style.height = `${view.innerHeight}px`;
    state.mask.style.bottom = 'auto';
    if (state.dialog.style.left) {
      state.dialog.style.left = `${clamp(parseFloat(state.dialog.style.left), 8, Math.max(8, view.innerWidth - state.dialog.offsetWidth - 8))}px`;
      state.dialog.style.top = `${clamp(parseFloat(state.dialog.style.top), 8, Math.max(8, view.innerHeight - state.dialog.offsetHeight - 8))}px`;
    }
  }
  function installDrag(header) {
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = state.dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      state.dialog.style.left = `${clamp(state.drag.left + event.clientX - state.drag.x, 8, win().innerWidth - state.dialog.offsetWidth - 8)}px`;
      state.dialog.style.top = `${clamp(state.drag.top + event.clientY - state.drag.y, 8, win().innerHeight - state.dialog.offsetHeight - 8)}px`;
      state.dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
  }
  function mount() {
    if (state.disposed || state.mask) return Boolean(state.mask);
    if (!doc().body) return false;
    const mask = element('section', 'crypt-lord-dlc-manager');
    mask.dataset.open = 'false';
    mask.innerHTML = '<section class="crypt-lord-dlc-manager__dialog" role="dialog" aria-modal="true"><header><strong>DLC 管理器</strong><span data-dlc-book></span><button type="button" data-dlc-close title="关闭">×</button></header><div class="crypt-lord-dlc-manager__body" data-dlc-body></div></section>';
    state.mask = mask;
    state.dialog = mask.querySelector('.crypt-lord-dlc-manager__dialog');
    state.body = mask.querySelector('[data-dlc-body]');
    mask.addEventListener('click', event => { if (event.target === mask || event.target?.dataset?.dlcClose !== undefined) close(); });
    installDrag(mask.querySelector('header'));
    doc().body.appendChild(mask);
    const view = win();
    view.addEventListener('scroll', syncViewport, { passive: true });
    view.addEventListener('resize', syncViewport);
    state.viewportCleanup = () => {
      view.removeEventListener('scroll', syncViewport);
      view.removeEventListener('resize', syncViewport);
    };
    syncViewport();
    return true;
  }
  async function reload() {
    state.bookName = await resolveBookName();
    if (!state.bookName) { state.entries = []; return; }
    state.entries = (await method('getWorldbook', state.bookName)).filter(isDlc);
  }
  async function toggle(entry) {
    try {
      const current = Boolean(entry.enabled);
      const entries = await method('getWorldbook', state.bookName);
      const updated = entries.map(item => item.uid === entry.uid ? { ...item, enabled: !current } : item);
      await method('replaceWorldbook', state.bookName, updated, { render: 'immediate' });
      await reload();
      notify(`${displayName(entry)} 已${current ? '禁用' : '启用'}。`, 'success');
      render();
    } catch (error) { notify(`切换 DLC 失败：${error?.message || error}`, 'error'); }
  }
  function render() {
    state.body.replaceChildren();
    const toolbar = element('div', 'crypt-lord-dlc-manager__toolbar');
    toolbar.append(button('重新读取', 'crypt-lord-dlc-manager__button', () => { void open(); }), element('span', 'crypt-lord-dlc-manager__count', `${state.entries.filter(entry => entry.enabled).length}/${state.entries.length} 已启用`));
    state.body.appendChild(toolbar);
    if (!state.bookName) { state.body.appendChild(element('div', 'crypt-lord-dlc-manager__empty', '未找到当前角色绑定的世界书。')); return; }
    const list = element('div', 'crypt-lord-dlc-manager__list');
    state.entries.forEach(entry => {
      const card = element('article', `crypt-lord-dlc-manager__card${entry.enabled ? ' is-enabled' : ''}`);
      const info = element('div', 'crypt-lord-dlc-manager__info');
      info.append(element('strong', '', displayName(entry)), element('p', '', preview(entry)));
      const action = button(entry.enabled ? '已启用' : '已禁用', `crypt-lord-dlc-manager__toggle${entry.enabled ? ' is-active' : ''}`, () => { void toggle(entry); });
      action.setAttribute('aria-label', `${entry.enabled ? '禁用' : '启用'} ${displayName(entry)}`);
      card.append(info, action);
      list.appendChild(card);
    });
    if (!state.entries.length) list.appendChild(element('div', 'crypt-lord-dlc-manager__empty', '当前主世界书没有带【DLC】标记的条目。'));
    state.body.appendChild(list);
  }
  async function open() {
    if (!mount()) return false;
    try { await reload(); }
    catch (error) { state.bookName = null; state.entries = []; notify(`读取 DLC 失败：${error?.message || error}`, 'error'); }
    state.mask.dataset.open = 'true';
    syncViewport();
    state.dialog.querySelector('[data-dlc-book]').textContent = state.bookName ? `世界书：${state.bookName}` : '世界书未绑定';
    render();
    return true;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', bookName: state.bookName, entries: state.entries.length }); },
    mount, open, close,
    dispose() { state.disposed = true; state.viewportCleanup?.(); state.viewportCleanup = null; state.mask?.remove(); state.mask = null; try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
