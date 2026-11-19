(() => {
  'use strict';
  const KEY = 'cryptLord.originalPlotGuideUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const guide = modules['cryptLord.originalPlotGuide'];
  const afterNative = modules['cryptLord.afterNativeHost'];
  if (!contract || !guide || !afterNative) throw new Error('原著剧情指引依赖尚未加载');
  const state = { panel: null, body: null, status: null, refresh: null, token: 0,
    subscriptions: [], disposed: false, messageId: null, focus: null, view: null, document: null };
  const doc = () => state.document || afterNative.getHost()?.document || document;
  const element = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === 'true' &&
    modules['cryptLord.originalPlotGuide'] === guide && modules['cryptLord.afterNativeHost'] === afterNative &&
    afterNative.getHost()?.window === state.view && (afterNative.getHost()?.document || document) === state.document;
  function close() {
    state.token++;
    state.panel?.setAttribute('data-open', 'false');
    state.panel?.removeAttribute('aria-busy');
    if (state.refresh) state.refresh.disabled = false;
    if (state.focus?.isConnected) state.focus.focus();
    state.focus = null;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel || !doc().body) return Boolean(state.panel);
    state.document = doc();
    state.view = afterNative.getHost()?.window;
    const panel = element('section', 'crypt-lord-original-plot');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '原著剧情指引');
    panel.setAttribute('aria-modal', 'true');
    panel.tabIndex = -1;
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button')].filter(node => !node.disabled && node.getClientRects().length);
      if (event.shiftKey && (doc().activeElement === nodes[0] || doc().activeElement === panel)) {
        event.preventDefault(); nodes.at(-1)?.focus();
      } else if (!event.shiftKey && doc().activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    });
    const header = element('header');
    const title = element('strong', '', '原著剧情指引');
    const refresh = element('button');
    const refreshIcon = element('i', 'fa-solid fa-rotate-right');
    refreshIcon.setAttribute('aria-hidden', 'true');
    refresh.append(refreshIcon);
    refresh.type = 'button';
    refresh.title = '重新检索';
    refresh.setAttribute('aria-label', '重新检索');
    refresh.addEventListener('click', () => void open(state.messageId));
    const dismiss = element('button');
    const dismissIcon = element('i', 'fa-solid fa-xmark');
    dismissIcon.setAttribute('aria-hidden', 'true');
    dismiss.append(dismissIcon);
    dismiss.type = 'button';
    dismiss.title = '关闭';
    dismiss.setAttribute('aria-label', '关闭');
    dismiss.addEventListener('click', close);
    const tools = element('div', 'crypt-lord-original-plot__tools');
    tools.append(refresh, dismiss);
    header.append(title, tools);
    const status = element('div', 'crypt-lord-original-plot__status');
    status.setAttribute('role', 'status');
    const body = element('main', 'crypt-lord-original-plot__body');
    panel.append(header, status, body);
    doc().body.append(panel);
    for (const [icon, fallback] of [[refreshIcon, '↻'], [dismissIcon, '×']]) {
      const content = doc().defaultView?.getComputedStyle(icon, '::before').content;
      if (!content || content === 'none' || content === 'normal') {
        icon.className = '';
        icon.textContent = fallback;
      }
    }
    Object.assign(state, { panel, body, status, refresh });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      const view = doc().defaultView || window;
      panel.style.left = `${Math.max(8, Math.min(view.innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(view.innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = afterNative.tavernEvents();
    const bind = (name, fn) => { if (name) { const sub = afterNative.bindEvent(name, fn); if (sub) state.subscriptions.push(sub); } };
    bind(events?.CHAT_CHANGED, close);
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      close(); state.body.replaceChildren();
    });
    return true;
  }
  async function open(messageId = null) {
    if (!mount()) return false;
    if ((afterNative.getHost()?.document || document) !== state.document || afterNative.getHost()?.window !== state.view ||
      modules['cryptLord.originalPlotGuide'] !== guide || modules['cryptLord.afterNativeHost'] !== afterNative) return false;
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) return false;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.messageId = messageId;
    const token = ++state.token;
    state.panel.dataset.open = 'true';
    state.panel.setAttribute('aria-busy', 'true');
    state.refresh.disabled = true;
    state.panel.focus();
    state.status.textContent = '正在检索原著时间线…';
    state.body.replaceChildren();
    try {
      const result = await guide.lookup(messageId, { guard: () => active(token) });
      if (!active(token)) return false;
      state.status.textContent = `#${result.messageId} · ${result.era} · ${result.books} 本原著世界书 · ${result.entries.length} 条匹配`;
      if (result.failed.length) {
        state.body.append(element('p', 'crypt-lord-original-plot__warning',
          `读取失败：${result.failed.join('、')}；以下结果可能不完整。`));
      }
      if (!result.books) state.body.append(element('p', 'crypt-lord-original-plot__empty', '未找到名称包含“原著”的世界书。'));
      else if (!result.entries.length && result.failed.length === result.books) {
        state.body.append(element('p', 'crypt-lord-original-plot__empty', '原著世界书读取失败，请重新检索。'));
      } else if (!result.entries.length) state.body.append(element('p', 'crypt-lord-original-plot__empty', '当前日期没有匹配的原著剧情条目。'));
      for (const item of result.entries) {
        const row = element('article', 'crypt-lord-original-plot__entry');
        const heading = element('div', 'crypt-lord-original-plot__heading');
        heading.append(element('strong', '', item.name), element('span', '', item.worldbook));
        row.append(heading, element('div', 'crypt-lord-original-plot__text', item.content));
        state.body.append(row);
      }
    } catch (error) {
      if (active(token)) state.status.textContent = `检索失败：${error?.message || String(error)}`;
    } finally {
      if (!state.disposed && state.token === token) {
        state.panel.removeAttribute('aria-busy');
        state.refresh.disabled = false;
        if (!active(token)) state.status.textContent = '宿主或服务已变化，检索已取消，请重新加载窗口';
      }
    }
    return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(sub => sub.stop());
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
