(() => {
  'use strict';

  const KEY = 'cryptLord.actionOptions';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
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
  let subscriptions = [];
  let disposed = false;

  function actionsFromData(data) {
    const values = data?.cryptLord?.actions;
    if (!Array.isArray(values)) return [];
    return values
      .map(value => String(value ?? '').trim())
      .filter(value => value && value.length <= 300)
      .slice(0, 8);
  }

  function actionsFor(message) {
    const stored = actionsFromData(message?.data);
    if (stored.length) return stored;
    const messageElement = afterNative.getMessageTextElement(afterNative.getDisplayedMessageElement(message?.message_id));
    return modules[NORMALIZER_KEY]?.extractLegacyActions?.(message?.message, messageElement) || [];
  }

  function remove(messageId) {
    const id = Number(messageId);
    if (!mounted.has(id)) return false;
    afterNative.unmount(id, MODULE_ID);
    mounted.delete(id);
    return true;
  }

  async function fillAction(action) {
    if (disposed) return false;
    const inputAdapter = await contract.waitGlobalInitialized(INPUT_ADAPTER_KEY, { timeoutMs: 10000 });
    if (disposed) return false;
    try {
      return inputAdapter.setInputText(action, 'sillytavern-native');
    } catch (error) {
      console.error(`[${KEY}] 行动选项填入失败`, error);
      afterNative.getHost()?.window?.toastr?.error?.(`无法填入行动：${error?.message || error}`);
      return false;
    }
  }

  function render(messageId, actions) {
    remove(messageId);
    if (!actions.length || disposed) return false;
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
    const hint = afterNative.createElement('span');
    hint.textContent = '点击后填入酒馆输入框';
    heading.append(title, hint);
    const list = afterNative.createElement('div');
    list.className = 'crypt-lord-action-options__list';
    actions.forEach((action, index) => {
      const button = afterNative.createElement('button');
      button.type = 'button';
      button.className = 'crypt-lord-action-options__button';
      const number = afterNative.createElement('span');
      number.className = 'crypt-lord-action-options__number';
      number.textContent = String(index + 1);
      const text = afterNative.createElement('span');
      text.className = 'crypt-lord-action-options__text';
      text.textContent = action;
      button.append(number, text);
      button.addEventListener('click', () => { void fillAction(action); });
      list.appendChild(button);
    });
    section.append(heading, list);
    if (!afterNative.mount(Number(messageId), MODULE_ID, section)) return false;
    mounted.set(Number(messageId), section);
    return true;
  }

  async function refresh(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || disposed) return false;
    const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
    const message = await store.readMessage(id);
    return render(id, actionsFor(message));
  }

  async function scan() {
    const messages = await afterNative.listAssistantMessages();
    const visible = new Set();
    for (const message of messages) {
      const id = Number(message.message_id);
      if (render(id, actionsFor(message))) visible.add(id);
    }
    Array.from(mounted.keys()).filter(id => !visible.has(id)).forEach(remove);
    return visible.size;
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
        bind(events.MESSAGE_DELETED, messageId => { remove(Number(messageId)); });
        bind(events.CHAT_CHANGED, () => {
          Array.from(mounted.keys()).forEach(remove);
          void Promise.resolve().then(scan);
        });
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
    dispose() {
      if (disposed) return true;
      disposed = true;
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
