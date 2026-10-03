(() => {
  'use strict';
  const KEY = 'cryptLord.sourceCastleUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.sourceCastleState'];
  const afterNative = modules['cryptLord.afterNativeHost'];
  if (!contract || !service || !afterNative) throw new Error('源堡窗口依赖尚未加载');
  const state = { panel: null, tabs: null, body: null, notice: null, data: null,
    tab: 'data', token: 0, subscription: null, disposed: false };
  const doc = () => afterNative.getHost()?.document || document;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, fn, title = '') => {
    const node = el('button', '', label);
    node.type = 'button';
    if (title) node.title = title;
    node.addEventListener('click', fn);
    return node;
  };
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === 'true';
  function close() {
    state.token++;
    state.panel?.setAttribute('data-open', 'false');
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-source-castle');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '源堡系统'), button('×', close, '关闭'));
    const tabs = el('nav', 'crypt-lord-source-castle__tabs');
    const body = el('main', 'crypt-lord-source-castle__body');
    const notice = el('footer', 'crypt-lord-source-castle__notice');
    notice.setAttribute('role', 'status');
    panel.append(header, tabs, body, notice);
    doc().body.append(panel);
    Object.assign(state, { panel, tabs, body, notice });
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
    if (events?.CHAT_CHANGED) state.subscription = afterNative.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  function render() {
    if (!state.panel || state.panel.dataset.open !== 'true') return;
    state.tabs.replaceChildren();
    for (const [id, label] of [['data', '源堡数据'], ['logs', '历史日志'], ['actions', '操作面板']]) {
      const tab = button(label, () => { state.tab = id; render(); });
      tab.setAttribute('aria-pressed', String(state.tab === id));
      state.tabs.append(tab);
    }
    state.body.replaceChildren();
    if (!state.data) return;
    if (state.tab === 'data') {
      const rows = [
        ['真实 assistant 楼层', state.data.messageId === null ? '暂无' : `#${state.data.messageId}`],
        ...Object.entries(state.data.counts).map(([key, value]) => [key, `${value} 项`]),
        ['已挂载世界书', state.data.books],
        ['快捷指令', state.data.shortcuts],
        ['加载器', state.data.loader],
      ];
      const list = el('dl', 'crypt-lord-source-castle__list');
      for (const [label, value] of rows) list.append(el('dt', '', label), el('dd', '', value));
      state.body.append(list);
      if (state.data.floorError) state.body.append(el('p', 'crypt-lord-source-castle__error', state.data.floorError));
      const title = el('h3', '', '楼层链路');
      state.body.append(title);
      for (const item of state.data.modules) {
        const row = el('div', 'crypt-lord-source-castle__module');
        row.append(el('span', '', item.key), el('span', '', !item.registered ? '未注册' :
          item.ready ? item.mounted ? '就绪 · 已挂载' : '就绪' : '已注册 · 未就绪'));
        state.body.append(row);
      }
    } else if (state.tab === 'logs') {
      const toolbar = el('div', 'crypt-lord-source-castle__toolbar');
      const exportButton = button('导出观测记录', exportLogs);
      exportButton.disabled = !state.data.events.length;
      toolbar.append(exportButton);
      state.body.append(toolbar);
      if (!state.data.events.length) state.body.append(el('p', '', '暂无观测记录'));
      for (const item of [...state.data.events].reverse()) {
        const row = el('div', 'crypt-lord-source-castle__log');
        row.dataset.level = item.level || 'info';
        const date = new Date(item.timestamp);
        row.append(el('time', '', Number.isNaN(date.getTime()) ? '' : date.toLocaleString()),
          el('strong', '', [item.module, item.action].filter(Boolean).join(' · ')),
          el('span', '', String(item.details || '')));
        state.body.append(row);
      }
    } else {
      state.body.append(button('重新读取状态与日志', () => void refresh()));
    }
  }
  function exportLogs() {
    if (!state.data?.events.length) return;
    const view = doc().defaultView || window;
    const url = view.URL.createObjectURL(new view.Blob([service.formatLogs(state.data.events)], { type: 'text/plain;charset=utf-8' }));
    const anchor = el('a');
    anchor.href = url;
    anchor.download = 'crypt-lord-observation.txt';
    doc().body.append(anchor);
    anchor.click();
    anchor.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
  }
  async function refresh() {
    const token = ++state.token;
    state.notice.textContent = '正在读取…';
    try {
      const data = await service.collect();
      if (!active(token)) return;
      state.data = data;
      state.notice.textContent = '读取完成';
      render();
    } catch (error) {
      if (active(token)) state.notice.textContent = `读取失败：${error?.message || error}`;
    }
  }
  async function open() {
    if (!mount()) return false;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    state.tab = 'data';
    state.data = null;
    render();
    await refresh();
    return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscription?.stop();
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
