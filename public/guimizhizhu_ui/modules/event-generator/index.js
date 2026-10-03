(() => {
  'use strict';
  const KEY = 'cryptLord.eventGeneratorUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.eventGenerator'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!contract || !service || !host) throw new Error('事件生成器依赖尚未加载');
  const state = {
    panel: null, body: null, status: null, tab: 'compose', config: null,
    draft: '', card: '', revision: null, busy: false, token: 0, disposed: false, subscription: null,
  };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && state.token === token;
  function el(tag, className = '', text) {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, action) {
    const node = el('button', '', label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  function message(text, error = false) {
    state.status.textContent = text;
    state.status.dataset.error = String(error);
  }
  function close() {
    ++state.token;
    state.card = '';
    state.draft = '';
    state.revision = null;
    state.busy = false;
    if (state.panel) state.panel.dataset.open = 'false';
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-event-generator');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '事件词库生成器'), button('×', close));
    const body = el('div', 'crypt-lord-event-generator__body');
    const status = el('div', 'crypt-lord-event-generator__status');
    panel.append(header, body, status);
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
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  async function task(work) {
    if (state.busy) return;
    const token = state.token;
    state.busy = true;
    state.panel.setAttribute('aria-busy', 'true');
    try { await work(token); }
    catch (error) { if (active(token)) message(error?.message || String(error), true); }
    finally {
      if (active(token)) {
        state.busy = false;
        state.panel?.removeAttribute('aria-busy');
      }
    }
  }
  function textarea(value, changed) {
    const node = el('textarea');
    node.value = value;
    node.addEventListener('input', () => changed(node.value));
    return node;
  }
  function render() {
    state.body.replaceChildren();
    const tabs = el('nav', 'crypt-lord-event-generator__tabs');
    for (const [id, label] of [['compose', '生成事件'], ['card', '事件卡归档']]) {
      const tab = button(label, () => {
        state.tab = id;
        render();
      });
      tab.dataset.selected = String(state.tab === id);
      tabs.append(tab);
    }
    state.body.append(tabs);
    const content = el('div', 'crypt-lord-event-generator__content');
    if (state.tab === 'compose') {
      content.append(el('h3', '', '事件生成指令'),
        el('p', '', state.config ? `模板已就绪 · ${Object.keys(state.config.wordbank).length} 个词库` : '尚未读取模板与词库'));
      const actions = el('div', 'crypt-lord-event-generator__actions');
      actions.append(
        button('从世界书生成', () => void task(async token => {
          const config = await service.loadConfig();
          const result = service.compose(config.template, config.wordbank);
          if (!active(token)) return;
          state.config = config;
          state.draft = result.text;
          render();
          message(`已填充 ${result.choices.length} 个词库槽位`);
        })),
        button('请求生成事件卡', () => void task(async token => {
          if (!state.draft.trim()) throw new Error('请先生成或编辑事件指令');
          const card = await service.generateCard(state.draft);
          const target = await service.readCardTarget();
          if (!active(token)) return;
          state.card = card;
          state.revision = target.revision;
          state.tab = 'card';
          render();
          message('事件卡已生成，请审阅后确认归档');
        })),
      );
      content.append(actions, textarea(state.draft, value => { state.draft = value; }));
    } else {
      content.append(el('h3', '', '事件卡片'),
        el('p', '', state.card ? '事件卡草稿' : '暂无事件卡草稿'));
      const actions = el('div', 'crypt-lord-event-generator__actions');
      actions.append(
        button('重新生成', () => void task(async token => {
          if (!state.draft.trim()) throw new Error('请先生成事件指令');
          const card = await service.generateCard(state.draft);
          const target = await service.readCardTarget();
          if (!active(token)) return;
          state.card = card;
          state.revision = target.revision;
          render();
          message('已重新生成事件卡，尚未写入世界书');
        })),
        button('追加到世界书', () => void task(async token => {
          if (!state.card.trim()) throw new Error('事件卡片内容不能为空');
          if (!win().confirm('追加事件卡片到 1源堡「生成的事件」？原有正文将保留。')) return;
          const saved = await service.saveCard(state.card, state.revision, () => active(token));
          if (!active(token)) return;
          state.revision = saved.revision;
          state.card = '';
          render();
          message('事件卡片已追加到源堡世界书');
        })),
      );
      content.append(actions, textarea(state.card, value => { state.card = value; }));
    }
    state.body.append(content);
  }
  function open() {
    if (!mount()) return false;
    ++state.token;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    render();
    message('');
    return true;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscription?.stop();
      state.panel?.remove();
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
