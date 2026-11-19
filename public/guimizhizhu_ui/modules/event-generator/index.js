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
    draft: '', card: '', target: null, choices: [], busy: false, token: 0, disposed: false,
    cancelButton: null, subscriptions: [], generating: false, cardConfig: null, returnFocus: null, keyListener: null,
    document: null, view: null,
  };
  const doc = () => state.document || host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const owned = () => modules[KEY] === api && modules['cryptLord.eventGenerator'] === service &&
    modules['cryptLord.afterNativeHost'] === host && (host.getHost()?.document || document) === state.document &&
    (host.getHost()?.window || state.document?.defaultView || window) === state.view;
  const active = token => !state.disposed && owned() && state.panel?.dataset.open === 'true' && state.token === token;
  function el(tag, className = '', text) {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, action, title = label) {
    const node = el('button', '', label);
    node.type = 'button';
    node.title = title;
    node.setAttribute('aria-label', title);
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
    state.target = null;
    state.config = null;
    state.cardConfig = null;
    state.choices = [];
    state.busy = false;
    state.panel?.removeAttribute('aria-busy');
    if (state.panel) state.panel.dataset.open = 'false';
    if (state.returnFocus?.isConnected) state.returnFocus.focus?.();
  }
  function controls() {
    state.body.querySelectorAll('button,textarea').forEach(node => { node.disabled = state.busy || state.generating; });
    state.cancelButton.disabled = !state.busy;
  }
  function cancel() {
    if (!state.busy) return;
    ++state.token;
    state.busy = false;
    state.panel.removeAttribute('aria-busy');
    controls();
    message('操作已取消');
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    state.document = doc();
    state.view = host.getHost()?.window || state.document.defaultView || window;
    const panel = el('section', 'crypt-lord-event-generator');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '事件词库生成器');
    panel.tabIndex = -1;
    const header = el('header');
    const cancelButton = button('取消', cancel);
    header.append(el('strong', '', '事件词库生成器'), cancelButton, button('×', close, '关闭'));
    const body = el('div', 'crypt-lord-event-generator__body');
    const status = el('div', 'crypt-lord-event-generator__status');
    status.setAttribute('role', 'status');
    panel.append(header, body, status);
    doc().body.append(panel);
    Object.assign(state, { panel, body, status, cancelButton });
    controls();
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
    const bind = (event, callback) => { if (event) state.subscriptions.push(host.bindEvent(event, callback)); };
    bind(events?.CHAT_CHANGED, () => { state.generating = false; close(); });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !options?.quiet_prompt && !options?.dryRun && !dryRun) {
        state.generating = true;
        ++state.token; state.busy = false; state.target = null;
        state.panel?.removeAttribute('aria-busy');
        controls();
        if (state.panel?.dataset.open === 'true') message('正文已开始生成；草稿保留，完成后请重新读取来源', true);
      }
    });
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      bind(event, () => { state.generating = false; controls(); });
    state.keyListener = event => {
      if (panel.dataset.open !== 'true') return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button:not(:disabled), textarea:not(:disabled), summary')]
        .filter(node => node.getClientRects().length);
      if (event.shiftKey && [panel, nodes[0]].includes(doc().activeElement)) {
        event.preventDefault(); nodes.at(-1)?.focus();
      } else if (!event.shiftKey && (doc().activeElement === nodes.at(-1) || !panel.contains(doc().activeElement))) {
        event.preventDefault(); nodes[0]?.focus();
      }
    };
    doc().addEventListener('keydown', state.keyListener);
    return true;
  }
  async function task(work) {
    if (state.busy || state.generating || !owned()) return;
    const token = state.token;
    state.busy = true;
    controls();
    state.panel.setAttribute('aria-busy', 'true');
    try { await work(token); }
    catch (error) { if (active(token)) message(error?.message || String(error), true); }
    finally {
      if (!state.disposed && state.token === token) {
        state.busy = false;
        state.panel?.removeAttribute('aria-busy');
        controls();
        if (!owned()) { state.target = null; message('宿主或服务已变化，操作已取消，请重新加载窗口', true); }
      }
    }
  }
  function textarea(value, changed, label) {
    const node = el('textarea');
    node.value = value;
    node.setAttribute('aria-label', label);
    node.addEventListener('input', () => changed(node.value));
    return node;
  }
  async function generate(token) {
    if (!state.draft.trim()) throw new Error('请先生成或编辑事件指令');
    const prompt = state.draft;
    const config = state.config;
    const target = await service.readCardTarget(() => active(token));
    if (!active(token)) return;
    message('正在请求事件卡…');
    const card = await service.generateCard(prompt, () => active(token), config);
    if (!active(token)) return;
    state.card = card;
    state.target = target;
    state.cardConfig = config;
    state.tab = 'card';
    render();
    message('事件卡已生成，尚未归档');
  }
  function render() {
    state.body.replaceChildren();
    const tabs = el('nav', 'crypt-lord-event-generator__tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [id, label] of [['compose', '生成事件'], ['card', '事件卡归档']]) {
      const tab = button(label, () => {
        state.tab = id;
        render();
      });
      tab.dataset.selected = String(state.tab === id);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(state.tab === id));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || state.busy || state.generating) return;
        event.preventDefault();
        state.tab = event.key === 'Home' ? 'compose' : event.key === 'End' ? 'card' :
          state.tab === 'compose' ? 'card' : 'compose';
        render();
        state.body.querySelector('[aria-selected="true"]')?.focus();
      });
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
          if (state.draft.trim() && !win().confirm('重新抽取将替换事件指令草稿，确认继续？')) return;
          const config = await service.loadConfig(() => active(token));
          const result = service.compose(config.template, config.wordbank);
          if (!active(token)) return;
          state.config = config;
          state.draft = result.text;
          state.choices = result.choices;
          render();
          message(`已填充 ${result.choices.length} 个词库槽位`);
        })),
        button('请求生成事件卡', () => void task(generate)),
      );
      content.append(actions, textarea(state.draft, value => { state.draft = value; }, '事件生成指令'));
      if (state.choices.length) {
        const drawn = el('details', 'crypt-lord-event-generator__details');
        drawn.append(el('summary', '', '抽取结果'));
        const list = el('dl');
        state.choices.forEach(item => {
          list.append(el('dt', '', `${item.slot} · ${item.pool}`), el('dd', '', item.text));
        });
        drawn.append(list); content.append(drawn);
      }
    } else {
      content.append(el('h3', '', '事件卡片'),
        el('p', '', state.card ? '事件卡草稿' : '暂无事件卡草稿'));
      const actions = el('div', 'crypt-lord-event-generator__actions');
      actions.append(
        button('重新生成', () => void task(generate)),
        button('重新读取归档', () => void task(async token => {
          const target = await service.readCardTarget(() => active(token));
          if (!active(token)) return;
          state.target = target;
          render(); message('已读取最新归档，事件卡草稿保留');
        })),
        button('追加到世界书', () => void task(async token => {
          if (!state.card.trim()) throw new Error('事件卡片内容不能为空');
          if (!state.target) throw Error('请先重新读取归档');
          if (!win().confirm(`追加事件卡片到「${state.target.book}」的「生成的事件」？原有正文将保留。`)) return;
          let saved;
          try { saved = await service.saveCard(state.card, state.target.revision, () => active(token), state.cardConfig); }
          catch (error) { if (error.requiresReload) state.target = null; throw error; }
          if (!active(token)) return;
          state.target = saved.revision ? saved : null;
          state.card = '';
          state.cardConfig = null;
          render();
          message(saved.warning || `事件卡片已追加到「${saved.book}」世界书`, Boolean(saved.warning));
        })),
      );
      content.append(actions, textarea(state.card, value => { state.card = value; }, '事件卡草稿'));
      const archive = el('details', 'crypt-lord-event-generator__details');
      archive.append(el('summary', '', '已归档事件'), el('pre', '', state.target?.entry?.content || '暂无归档'));
      content.append(archive);
    }
    state.body.append(content);
    controls();
  }
  function open() {
    if (!mount() || !owned()) return false;
    if (state.panel.dataset.open === 'true') { state.panel.focus(); return true; }
    close();
    ++state.token;
    state.tab = 'compose';
    state.panel.dataset.open = 'true';
    state.returnFocus = doc().activeElement;
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    render();
    message('');
    state.panel.focus();
    return true;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(item => item?.stop());
      state.document?.removeEventListener('keydown', state.keyListener);
      state.panel?.remove();
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
