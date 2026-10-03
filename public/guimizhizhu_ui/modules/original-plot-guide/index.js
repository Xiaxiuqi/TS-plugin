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
  const state = { panel: null, body: null, status: null, token: 0, subscription: null, disposed: false };
  const doc = () => afterNative.getHost()?.document || document;
  const element = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === 'true';
  function close() {
    state.token++;
    state.panel?.setAttribute('data-open', 'false');
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = element('section', 'crypt-lord-original-plot');
    panel.dataset.open = 'false';
    const header = element('header');
    const title = element('strong', '', '原著剧情指引');
    const refresh = element('button', '', '↻');
    refresh.type = 'button';
    refresh.title = '重新检索';
    refresh.setAttribute('aria-label', '重新检索');
    refresh.addEventListener('click', () => void open());
    const dismiss = element('button', '', '×');
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
    Object.assign(state, { panel, body, status });
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
  async function open() {
    if (!mount()) return false;
    const token = ++state.token;
    state.panel.dataset.open = 'true';
    state.status.textContent = '正在检索原著时间线…';
    state.body.replaceChildren();
    try {
      const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
      const floor = await store.findLatestAssistant();
      if (!active(token)) return false;
      if (!floor) throw new Error('当前聊天没有真实 assistant 楼层');
      const era = guide.currentEra(floor.data);
      if (!era) throw new Error('当前时间纪元未知');
      const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      const result = await guide.search(era, host);
      if (!active(token)) return false;
      state.status.textContent = `${era} · ${result.books} 本原著世界书 · ${result.entries.length} 条匹配`;
      if (result.failed.length) {
        state.body.append(element('p', 'crypt-lord-original-plot__warning',
          `读取失败：${result.failed.join('、')}；以下结果可能不完整。`));
      }
      if (!result.books) state.body.append(element('p', 'crypt-lord-original-plot__empty', '未找到名称包含“原著”的世界书。'));
      else if (!result.entries.length) state.body.append(element('p', 'crypt-lord-original-plot__empty', '当前日期没有匹配的原著剧情条目。'));
      for (const item of result.entries) {
        const row = element('article', 'crypt-lord-original-plot__entry');
        const heading = element('div', 'crypt-lord-original-plot__heading');
        heading.append(element('strong', '', item.name), element('span', '', item.worldbook));
        row.append(heading, element('div', 'crypt-lord-original-plot__text', item.content));
        state.body.append(row);
      }
    } catch (error) {
      if (active(token)) state.status.textContent = `检索失败：${error?.message || String(error)}`;
    }
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
