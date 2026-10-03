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

  // The entry script may deliberately run in the Tavern page instead of its
  // helper iframe. Carry the helper script ID through the resource chain so
  // script-scoped settings remain available after that context switch.
  const currentScript = typeof document === 'undefined' ? null : document.currentScript;
  const inheritedScriptId = String(
    currentScript?.dataset?.cryptLordScriptId || root.__stage1Index?.scriptId || root.__stage1ScriptId || '',
  ).trim();

  function candidateOwners() {
    const candidates = [window];
    for (const name of ['parent', 'top']) {
      try {
        if (window[name] && !candidates.includes(window[name])) candidates.push(window[name]);
      } catch {
        // A cross-origin ancestor cannot expose Tavern Helper APIs.
      }
    }
    return candidates.sort((left, right) => scoreOwner(right) - scoreOwner(left));
  }

  function scoreOwner(owner) {
    try {
      const document = owner?.document;
      return (owner?.TavernHelper ? 12 : 0) + (typeof owner?.getChatMessages === 'function' ? 8 : 0) +
        (document?.querySelector?.('#send_textarea') ? 6 : 0);
    } catch {
      return -1;
    }
  }

  function findMethod(name) {
    for (const owner of candidateOwners()) {
      if (typeof owner?.[name] === 'function') return owner[name].bind(owner);
      if (typeof owner?.TavernHelper?.[name] === 'function') return owner.TavernHelper[name].bind(owner.TavernHelper);
    }
    throw new Error(`[${KEY}] 宿主 API 不可用: ${name}`);
  }

  function getChatMessages(range = '0-{{lastMessageId}}') {
    return Promise.resolve(findMethod('getChatMessages')(range));
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
    return findMethod('createChatMessages')(messages, options);
  }

  function setChatMessages(messages, options = {}) {
    return findMethod('setChatMessages')(messages, options);
  }

  function deleteChatMessages(messageIds, options = {}) {
    return findMethod('deleteChatMessages')(messageIds, options);
  }

  function generate(config) {
    return findMethod('generate')(config);
  }

  function generateRaw(config) {
    return findMethod('generateRaw')(config);
  }

  function getModelList(customApi) {
    return Promise.resolve(findMethod('getModelList')(customApi));
  }

  function getVariables(options) {
    return findMethod('getVariables')(options);
  }

  function replaceVariables(variables, options) {
    return findMethod('replaceVariables')(variables, options);
  }

  function scriptIdFromElement(element) {
    const value = element?.getAttribute?.('script_id') || element?.dataset?.scriptId || '';
    if (String(value).trim()) return String(value).trim();
    const id = String(element?.id || '').trim();
    const match = id.match(/^TH-script--.+--([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i);
    return match?.[1] || '';
  }

  function getScriptId() {
    if (inheritedScriptId) return inheritedScriptId;
    for (const owner of candidateOwners()) {
      try {
        const direct = owner?.getScriptId;
        const scriptId = typeof direct === 'function' ? String(direct.call(owner) || '').trim() : '';
        if (scriptId) return scriptId;
      } catch {
        // The page host normally has no script identity; keep looking in the script iframe.
      }
    }

    const localCandidates = [window.frameElement, document.currentScript];
    for (const candidate of localCandidates) {
      const scriptId = scriptIdFromElement(candidate);
      if (scriptId) return scriptId;
    }

    for (const owner of candidateOwners()) {
      try {
        const frames = Array.from(owner?.document?.querySelectorAll?.('iframe[script_id], [data-script-id]') || []);
        const frame = frames.find(candidate => candidate?.contentWindow === window);
        const scriptId = scriptIdFromElement(frame);
        if (scriptId) return scriptId;
      } catch {
        // Access to a cross-origin host document is unavailable.
      }
    }
    throw new Error(`[${KEY}] 未能解析当前酒馆助手脚本 ID`);
  }

  function scriptVariableOptions() {
    return Object.freeze({ type: 'script', script_id: getScriptId() });
  }

  function getCharWorldbookNames(character = 'current') {
    return Promise.resolve(findMethod('getCharWorldbookNames')(character));
  }

  function getGlobalWorldbookNames() {
    return Promise.resolve(findMethod('getGlobalWorldbookNames')());
  }

  function getChatWorldbookName(chat = 'current') {
    return Promise.resolve(findMethod('getChatWorldbookName')(chat));
  }

  function getWorldbook(name) {
    return Promise.resolve(findMethod('getWorldbook')(name));
  }

  function getWorldbookNames() {
    return Promise.resolve(findMethod('getWorldbookNames')());
  }

  function createWorldbook(name) {
    return Promise.resolve(findMethod('createWorldbook')(name));
  }

  function createWorldbookEntries(name, entries) {
    return Promise.resolve(findMethod('createWorldbookEntries')(name, entries));
  }

  function updateWorldbookWith(name, updater, options) {
    return Promise.resolve(findMethod('updateWorldbookWith')(name, updater, options));
  }

  function deleteWorldbookEntries(name, predicate, options) {
    return Promise.resolve(findMethod('deleteWorldbookEntries')(name, predicate, options));
  }

  async function waitForMvu(options = {}) {
    let owner = null;
    for (const candidate of candidateOwners()) {
      if (typeof candidate?.waitGlobalInitialized === 'function') {
        owner = candidate;
        break;
      }
    }
    if (!owner) throw new Error(`[${KEY}] waitGlobalInitialized 不可用，无法等待 Mvu`);
    await owner.waitGlobalInitialized('Mvu', options);
    if (!owner.Mvu || typeof owner.Mvu.parseMessage !== 'function') {
      throw new Error(`[${KEY}] Mvu 已等待完成但 API 形状无效`);
    }
    return owner.Mvu;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        tavernHelperReady: candidateOwners().some(owner => Boolean(owner.TavernHelper)),
        mvuReady: candidateOwners().some(owner => Boolean(owner.Mvu?.parseMessage)),
      });
    },
    getChatMessages,
    getLatestAssistantMessage,
    createChatMessages,
    setChatMessages,
    deleteChatMessages,
    generate,
    generateRaw,
    getModelList,
    getVariables,
    replaceVariables,
    getScriptId,
    scriptVariableOptions,
    getCharWorldbookNames,
    getGlobalWorldbookNames,
    getChatWorldbookName,
    getWorldbook,
    getWorldbookNames,
    createWorldbook,
    createWorldbookEntries,
    updateWorldbookWith,
    deleteWorldbookEntries,
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
