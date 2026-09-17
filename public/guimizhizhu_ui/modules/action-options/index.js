(() => {
  'use strict';

  const KEY = 'cryptLord.actionOptions';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const INPUT_ADAPTER_KEY = 'cryptLord.inputAdapter';
  const ROOT_ATTR = 'data-crypt-lord-action-options';
  const INSTANCE_ATTR = 'data-crypt-lord-action-options-instance';
  const MESSAGE_ID_ATTR = 'data-crypt-lord-message-id';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const mounted = new Map();
  let subscriptions = [];
  let disposed = false;

  function getOwnerWindow() { return window; }

  function getMessageContainer(messageId) {
    try {
      const direct = getOwnerWindow().retrieveDisplayedMessage?.(messageId);
      if (direct?.nodeType === 1) return direct;
    } catch { /* Fall through to the DOM lookup. */ }
    const safeId = String(messageId).replace(/(["\\])/g, '\\$1');
    return document.querySelector(`#chat > .mes[mesid="${safeId}"]`);
  }

  function actionsFromData(data) {
    const values = data?.cryptLord?.actions;
    if (!Array.isArray(values)) return [];
    return values
      .map(value => String(value ?? '').trim())
      .filter(value => value && value.length <= 300)
      .slice(0, 8);
  }

  function remove(messageId) {
    const node = mounted.get(messageId);
    if (!node) return false;
    node.remove();
    mounted.delete(messageId);
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
      window.toastr?.error?.(`无法填入行动：${error?.message || error}`);
      return false;
    }
  }

  function render(messageId, actions) {
    remove(messageId);
    if (!actions.length || disposed) return false;
    const container = getMessageContainer(messageId);
    if (!container) return false;
    const anchor = container.querySelector('.mes_text') || container;
    const section = document.createElement('section');
    section.setAttribute(ROOT_ATTR, '');
    section.setAttribute(INSTANCE_ATTR, root.loader?.instanceId || '');
    section.setAttribute(MESSAGE_ID_ATTR, String(messageId));
    section.className = 'crypt-lord-action-options';
    const list = document.createElement('div');
    list.className = 'crypt-lord-action-options__list';
    actions.forEach((action, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crypt-lord-action-options__button';
      button.textContent = `${index + 1}. ${action}`;
      button.addEventListener('click', () => { void fillAction(action); });
      list.appendChild(button);
    });
    section.appendChild(list);
    anchor.insertAdjacentElement('afterend', section);
    mounted.set(messageId, section);
    return true;
  }

  async function refresh(messageId) {
    if (!Number.isInteger(Number(messageId)) || disposed) return false;
    const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
    const data = await store.readMessageData(Number(messageId));
    return render(Number(messageId), actionsFromData(data));
  }

  function bind(name, handler) {
    const handle = window.eventOn?.(name, handler);
    if (handle?.stop) subscriptions.push(handle);
  }

  function mount() {
    if (disposed || subscriptions.length) return true;
    const events = window.tavern_events;
    if (!events || typeof window.eventOn !== 'function') return false;
    bind(events.CHARACTER_MESSAGE_RENDERED, messageId => { void refresh(messageId); });
    bind(events.MESSAGE_UPDATED, messageId => { void refresh(messageId); });
    bind(events.MESSAGE_DELETED, messageId => { remove(Number(messageId)); });
    bind(events.CHAT_CHANGED, () => { Array.from(mounted.keys()).forEach(remove); });
    return true;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed, mounted: mounted.size, listeners: subscriptions.length }); },
    mount,
    refresh,
    dispose() {
      if (disposed) return true;
      disposed = true;
      subscriptions.forEach(handle => { try { handle.stop(); } catch {} });
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
