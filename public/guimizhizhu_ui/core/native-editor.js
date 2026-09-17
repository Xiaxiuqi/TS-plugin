(() => {
  'use strict';

  const KEY = 'cryptLord.nativeEditor';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  async function store() {
    return contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
  }

  async function open(messageId) {
    const stateStore = await store();
    const target = Number.isInteger(messageId) ? await stateStore.readMessage(messageId) : await stateStore.findLatestAssistant();
    if (!target || target.role !== 'assistant') throw new Error(`[${KEY}] 没有可编辑的真实 assistant 楼层`);
    return Object.freeze({ messageId: target.message_id, message: String(target.message || ''), data: target.data || {} });
  }

  async function save(messageId, message, data) {
    const stateStore = await store();
    await stateStore.writeAssistantMessage(messageId, message, data);
    return open(messageId);
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, target: 'native-assistant-floor' }); },
    open,
    save,
    dispose() { try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
