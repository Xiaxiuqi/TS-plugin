(() => {
  'use strict';

  const KEY = 'cryptLord.actionOptions';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const SOURCE_KEY = 'cryptLord.nativeFloorSource';
  const NORMALIZER_KEY = 'cryptLord.responseNormalizer';
  const INPUT_ADAPTER_KEY = 'cryptLord.inputAdapter';
  const MODULE_ID = 'action-options';
  const INSTANCE_ATTR = 'data-crypt-lord-action-options-instance';
  const ROOT_ATTR = 'data-crypt-lord-action-options';
  const MESSAGE_ID_ATTR = 'data-crypt-lord-message-id';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const afterNative = root.__stage1Modules?.[HOST_KEY];
  if (!afterNative) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const mounted = new Map();
  const drafts = new Map(), sections = new Set();
  let subscriptions = [];
  let disposed = false, generating = false, epoch = 0, request = 0;

  function actionsFor(message) {
    return modules[NORMALIZER_KEY]?.actionsForFloor?.(message) || [];
  }

  function remove(messageId) {
    const id = Number(messageId);
    if (!mounted.has(id)) return false;
    afterNative.unmount(id, MODULE_ID);
    mounted.delete(id);
    return true;
  }

  async function fillAction(field, source, reader, token, section, button, guard) {
    const action = field.value.trim(), draft = field.value;
    const active = () => !disposed && !generating && token === epoch && section.isConnected &&
      modules[SOURCE_KEY] === reader && modules[KEY] === api && (!guard || guard());
    if (!active() || !action) return false;
    button.disabled = true;
    try {
      const inputAdapter = await contract.waitGlobalInitialized(INPUT_ADAPTER_KEY, { timeoutMs: 10000 });
      const surface = afterNative.getHost(), input = surface?.document.querySelector(
        inputAdapter.status?.().selectors?.nativeTextarea || '#send_textarea');
      if (!input) throw Error('原生输入控件不存在');
      const previous = input.value;
      await reader.assert(source, active);
      if (!active()) return false;
      reader.assertIdentity(source, active);
      if (modules[INPUT_ADAPTER_KEY] !== inputAdapter || input.value !== previous || !input.isConnected ||
        field.value !== draft || !field.isConnected) throw Error('行动草稿或原生输入已变化');
      const combined = previous.trim() ? `${previous.trim()}\n${action}` : action;
      return inputAdapter.setInputText(combined, 'sillytavern-native');
    } catch (error) {
      if (active()) {
        console.warn(`[${KEY}] 行动选项来源已失效`, error);
        afterNative.getHost()?.window?.toastr?.error?.(`无法填入行动：${error?.message || error}`);
      }
      return false;
    } finally { if (active()) button.disabled = false; }
  }

  function createSection(messageId, actions, source, reader, token, guard) {
    const section = afterNative.createElement('section');
    section.setAttribute(ROOT_ATTR, '');
    section.setAttribute(INSTANCE_ATTR, root.loader?.instanceId || '');
    section.setAttribute(MESSAGE_ID_ATTR, String(messageId));
    section.className = 'crypt-lord-original-ui crypt-lord-action-options';
    try { section.dataset.theme = window.localStorage?.getItem('cryptLord.originalUi.theme') === 'light' ? 'light' : 'dark'; } catch { section.dataset.theme = 'dark'; }
    const heading = afterNative.createElement('header');
    heading.className = 'crypt-lord-action-options__header';
    const title = afterNative.createElement('strong');
    title.textContent = '可选行动';
    heading.append(title);
    const signature = reader.floorSignature(source, messageId);
    let draft = drafts.get(messageId);
    if (!draft || draft.signature !== signature) {
      draft = { signature, values: actions.map(text => ({ text })) }; drafts.set(messageId, draft);
    }
    const list = afterNative.createElement('div');
    list.className = 'crypt-lord-action-options__list';
    function draw() {
      list.replaceChildren();
      if (!draft.values.length) {
        const empty = afterNative.createElement('span'); empty.textContent = '暂无行动选项'; list.append(empty);
      }
      draft.values.forEach((value, index) => {
        const row = afterNative.createElement('div'); row.className = 'crypt-lord-action-options__row';
        const number = afterNative.createElement('span');
        number.className = 'crypt-lord-action-options__number';
        number.textContent = String(index + 1);
        const text = afterNative.createElement('textarea');
        text.className = 'crypt-lord-action-options__text'; text.rows = 2; text.maxLength = 300;
        text.value = value.text; text.setAttribute('aria-label', `行动选项 ${index + 1}`);
        text.addEventListener('input', () => { value.text = text.value; });
        const controls = afterNative.createElement('div'); controls.className = 'crypt-lord-action-options__tools';
        function tool(name, icon, handler) {
          const button = afterNative.createElement('button'); button.type = 'button';
          button.className = 'crypt-lord-action-options__button'; button.title = name; button.setAttribute('aria-label', name);
          button.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
          button.addEventListener('click', () => handler(button)); controls.append(button); return button;
        }
        tool(`填入行动 ${index + 1}`, 'arrow-down', button => { void fillAction(text, source, reader, token, section, button, guard); });
        tool(`删除行动 ${index + 1}`, 'trash-can', () => {
          if (disposed || generating || token !== epoch || guard && !guard()) return;
          const selected = draft.values.indexOf(value);
          if (selected < 0) return;
          draft.values.splice(selected, 1); draw();
        });
        row.append(number, text, controls); list.append(row);
      });
    }
    draw();
    section.append(heading, list);
    sections.add(section);
    return section;
  }

  function render(messageId, actions, source, reader, token) {
    remove(messageId);
    if (!actions.length || disposed) return false;
    const section = createSection(messageId, actions, source, reader, token);
    if (!afterNative.mount(Number(messageId), MODULE_ID, section)) return false;
    mounted.set(Number(messageId), section);
    return true;
  }

  async function createList(messageId, guard) {
    const token = epoch, active = () => !disposed && !generating && token === epoch && (!guard || guard());
    const reader = await contract.waitGlobalInitialized(SOURCE_KEY, { timeoutMs: 10000 });
    const source = await reader.read(active);
    await reader.assert(source, active);
    const floor = source.rows.find(row => row.message_id === messageId && row.role === 'assistant' && !row.is_hidden);
    if (!floor) throw Error('行动来源assistant楼层不存在');
    return createSection(messageId, actionsFor(floor), source, reader, token, guard);
  }

  async function refresh(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || disposed) return false;
    return scan();
  }

  async function scan() {
    const token = epoch, run = ++request, active = () => !disposed && !generating && token === epoch && run === request;
    if (!active()) return false;
    try {
      const reader = await contract.waitGlobalInitialized(SOURCE_KEY, { timeoutMs: 10000 });
      const source = await reader.read(active);
      await reader.assert(source, active);
      if (!active()) return false;
      const visible = new Set();
      for (const section of sections) if (!section.isConnected) sections.delete(section);
      for (const id of drafts.keys()) if (!source.rows.some(row => row.message_id === id)) drafts.delete(id);
      for (const message of source.rows.filter(row => row.role === 'assistant' && !row.is_hidden)) {
        const id = Number(message.message_id);
        if (render(id, actionsFor(message), source, reader, token)) visible.add(id);
      }
      Array.from(mounted.keys()).filter(id => !visible.has(id)).forEach(remove);
      return visible.size;
    } catch (error) {
      if (active()) { Array.from(mounted.keys()).forEach(remove); console.warn(`[${KEY}] 行动读取失败`, error); }
      return false;
    }
  }

  function bind(name, handler) {
    const handle = afterNative.bindEvent(name, handler);
    if (handle?.stop) subscriptions.push(handle);
  }

  function mount() {
    if (disposed) return false;
    if (!subscriptions.length) {
      const events = afterNative.tavernEvents();
      if (events) {
        bind(events.CHARACTER_MESSAGE_RENDERED, messageId => { void refresh(messageId); });
        bind(events.MESSAGE_UPDATED, messageId => { void refresh(messageId); });
        for (const name of ['MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED'])
          if (events[name]) bind(events[name], () => { void scan(); });
        bind(events.MESSAGE_DELETED, messageId => { remove(Number(messageId)); });
        bind(events.CHAT_CHANGED, () => {
          epoch++; request++; generating = false;
          drafts.clear();
          Array.from(mounted.keys()).forEach(remove);
          void Promise.resolve().then(scan);
        });
        if (events.GENERATION_STARTED) bind(events.GENERATION_STARTED, (type, options, dryRun) => {
          if (dryRun || type === 'quiet' || options?.quiet_prompt) return;
          generating = true; epoch++; request++; Array.from(mounted.keys()).forEach(remove);
          for (const section of sections) section.querySelectorAll('button,textarea').forEach(item => { item.disabled = true; });
        });
        for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED'])
          if (events[name]) bind(events[name], () => { generating = false; epoch++; void scan(); });
      }
    }
    void scan();
    return true;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: !disposed && afterNative.status().ready,
        mounted: mounted.size > 0,
        count: mounted.size,
        listeners: subscriptions.length,
      });
    },
    mount,
    refresh,
    createList,
    dispose() {
      if (disposed) return true;
      disposed = true;
      epoch++; request++;
      drafts.clear();
      for (const section of sections) section.querySelectorAll('button,textarea').forEach(item => { item.disabled = true; });
      sections.clear();
      subscriptions.forEach(handle => { try { handle.stop(); } catch { /* Loader owns final cleanup. */ } });
      subscriptions = [];
      Array.from(mounted.keys()).forEach(remove);
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  api.mount();
})();
