(() => {
  'use strict';

  const KEY = 'cryptLord.stateStore';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  async function messages() {
    const hostApi = await contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 });
    const list = await hostApi.getChatMessages('0-{{lastMessageId}}');
    return { hostApi, list: Array.isArray(list) ? list : [] };
  }

  async function findLatestAssistant(beforeMessageId = Infinity) {
    const { list } = await messages();
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index];
      if (message?.role === 'assistant' && message.message_id < beforeMessageId) return message;
    }
    return null;
  }

  async function readAssistantData(beforeMessageId = Infinity) {
    return clone((await findLatestAssistant(beforeMessageId))?.data || {});
  }

  async function readMessageData(messageId) {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] 消息楼层 ID 无效`);
    const { hostApi } = await messages();
    const list = await hostApi.getChatMessages(String(messageId));
    return clone(Array.isArray(list) ? list[0]?.data || {} : {});
  }

  async function writeAssistantData(messageId, data, refresh = 'affected') {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] assistant 楼层 ID 无效`);
    const { hostApi } = await messages();
    await hostApi.setChatMessages([{ message_id: messageId, data: clone(data || {}) }], { refresh });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, source: 'native-assistant-floor' }); },
    findLatestAssistant,
    readAssistantData,
    readMessageData,
    writeAssistantData,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
