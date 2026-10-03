(() => {
  'use strict';

  const KEY = 'cryptLord.stateStore';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const PATCH_KEY = 'cryptLord.variablePatch';
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

  function cleanData(value) {
    const data = clone(value || {});
    if (data?.world_data && typeof data.world_data === 'object' && !Array.isArray(data.world_data)) {
      delete data.world_data['星界之门'];
    }
    if (data?.cryptLord?.rewards && typeof data.cryptLord.rewards === 'object' && !Array.isArray(data.cryptLord.rewards)) {
      delete data.cryptLord.rewards.astralDust;
      if (!Object.keys(data.cryptLord.rewards).length) delete data.cryptLord.rewards;
    }
    return data;
  }
  function settledData(value) {
    const data = cleanData(value);
    modules['cryptLord.shamanTerritory']?.syncRadius?.(data);
    const mystery = modules['cryptLord.mysteryAnalysis'];
    if (data?.stat_data && mystery) {
      mystery.syncDisplay(data.stat_data);
      mystery.reconcile(data.stat_data);
    }
    return data;
  }

  async function messages() {
    const hostApi = await contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 });
    const list = await hostApi.getChatMessages('0-{{lastMessageId}}');
    return { hostApi, list: Array.isArray(list) ? list : [] };
  }

  let openingPromise = null;
  async function ensureOpeningState() {
    if (openingPromise) return openingPromise;
    openingPromise = (async () => {
      const { hostApi, list } = await messages();
      const opening = list.find(message => Number(message?.message_id) === 0 && message?.role === 'assistant');
      if (!opening || !/<UpdateVariable\b/i.test(String(opening.message || ''))) return null;
      const patch = await contract.waitGlobalInitialized(PATCH_KEY, { timeoutMs: 10000 });
      const commands = patch.commands(opening.message);
      if (!commands.length) return null;
      const source = JSON.stringify(commands);
      let hash = 2166136261;
      for (let index = 0; index < source.length; index += 1) {
        hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
      }
      const signature = `${source.length}:${(hash >>> 0).toString(16)}`;
      const current = cleanData(opening.data);
      if (current.cryptLord?.openingPatchSignature === signature) return current;
      const result = patch.apply(opening.message, current);
      if (!result.applied) return null;
      const next = cleanData(result.data);
      next.cryptLord = { ...(next.cryptLord || {}), openingPatchSignature: signature };
      await hostApi.setChatMessages([{ message_id: 0, data: next }], { refresh: 'affected' });
      try { await modules['cryptLord.nativeFloorStatusBar']?.refresh?.(0); }
      catch (error) { console.warn(`[${KEY}] 开场变量已写入，状态条刷新失败`, error); }
      return next;
    })();
    try { return await openingPromise; }
    finally { openingPromise = null; }
  }

  async function findLatestAssistant(beforeMessageId = Infinity) {
    await ensureOpeningState();
    const { list } = await messages();
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index];
      if (message?.role === 'assistant' && message.message_id < beforeMessageId) {
        const latest = clone(message);
        latest.data = cleanData(latest.data);
        return latest;
      }
    }
    return null;
  }

  async function readAssistantData(beforeMessageId = Infinity) {
    return cleanData((await findLatestAssistant(beforeMessageId))?.data);
  }

  async function readMessageData(messageId) {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] 消息楼层 ID 无效`);
    if (messageId === 0) await ensureOpeningState();
    const { hostApi } = await messages();
    const list = await hostApi.getChatMessages(String(messageId));
    return cleanData(Array.isArray(list) ? list[0]?.data : {});
  }

  async function readMessage(messageId) {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] 消息楼层 ID 无效`);
    if (messageId === 0) await ensureOpeningState();
    const { hostApi } = await messages();
    const list = await hostApi.getChatMessages(String(messageId));
    if (!Array.isArray(list) || !list[0]) return null;
    const message = clone(list[0]);
    message.data = cleanData(message.data);
    return message;
  }

  async function writeAssistantMessage(messageId, message, data) {
    const target = await readMessage(messageId);
    if (target?.role !== 'assistant') throw new Error(`[${KEY}] 只能编辑真实 assistant 楼层`);
    const { hostApi } = await messages();
    await hostApi.setChatMessages([{ message_id: messageId, message: String(message), data: settledData(data ?? target.data) }], { refresh: 'affected' });
  }

  async function writeAssistantData(messageId, data, refresh = 'affected') {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] assistant 楼层 ID 无效`);
    const { hostApi } = await messages();
    await hostApi.setChatMessages([{ message_id: messageId, data: settledData(data) }], { refresh });
  }

  async function restoreVariableTag(messageId) {
    const target = await readMessage(messageId);
    if (target?.role !== 'assistant' || !target.data?.cryptLord?.lastUpdateVariable) return false;
    const patch = await contract.waitGlobalInitialized(PATCH_KEY, { timeoutMs: 10000 });
    if (/<UpdateVariable\b/i.test(String(target.message || '')) &&
      patch.updateTag(target.message) !== patch.updateTag(target.data.cryptLord.lastUpdateVariable)) return false;
    const message = patch.embedUpdate(target.message, target.data.cryptLord.lastUpdateVariable);
    if (message === target.message) return false;
    const { hostApi } = await messages();
    await hostApi.setChatMessages([{ message_id: messageId, message }], { refresh: 'affected' });
    return true;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, source: 'native-assistant-floor' }); },
    findLatestAssistant,
    ensureOpeningState,
    readAssistantData,
    readMessageData,
    readMessage,
    writeAssistantData,
    writeAssistantMessage,
    restoreVariableTag,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
