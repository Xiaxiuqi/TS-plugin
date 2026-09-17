(() => {
  'use strict';

  const KEY = 'cryptLord.hostApi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }

  function requireTavernHelper() {
    const helper = window.TavernHelper;
    if (!helper || typeof helper !== 'object') throw new Error(`[${KEY}] TavernHelper 不可用`);
    return helper;
  }

  function requireMethod(owner, name) {
    const method = owner?.[name];
    if (typeof method !== 'function') throw new Error(`[${KEY}] 宿主 API 不可用: ${name}`);
    return method.bind(owner);
  }

  function getChatMessages(range = '0-{{lastMessageId}}') {
    return Promise.resolve(requireMethod(window, 'getChatMessages')(range));
  }

  async function getLatestAssistantMessage() {
    const messages = await getChatMessages('0-{{lastMessageId}}');
    if (!Array.isArray(messages)) return null;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'assistant') return messages[index];
    }
    return null;
  }

  function createChatMessages(messages, options = {}) {
    return requireMethod(requireTavernHelper(), 'createChatMessages')(messages, options);
  }

  function setChatMessages(messages, options = {}) {
    return requireMethod(requireTavernHelper(), 'setChatMessages')(messages, options);
  }

  function deleteChatMessages(messageIds, options = {}) {
    return requireMethod(requireTavernHelper(), 'deleteChatMessages')(messageIds, options);
  }

  function generate(config) {
    return requireMethod(requireTavernHelper(), 'generate')(config);
  }

  async function waitForMvu(options = {}) {
    const waitForGlobal = window.waitGlobalInitialized;
    if (typeof waitForGlobal !== 'function') throw new Error(`[${KEY}] waitGlobalInitialized 不可用，无法等待 Mvu`);
    await waitForGlobal('Mvu', options);
    if (!window.Mvu || typeof window.Mvu.parseMessage !== 'function') {
      throw new Error(`[${KEY}] Mvu 已等待完成但 API 形状无效`);
    }
    return window.Mvu;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        tavernHelperReady: Boolean(window.TavernHelper),
        mvuReady: Boolean(window.Mvu?.parseMessage),
      });
    },
    getChatMessages,
    getLatestAssistantMessage,
    createChatMessages,
    setChatMessages,
    deleteChatMessages,
    generate,
    waitForMvu,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
