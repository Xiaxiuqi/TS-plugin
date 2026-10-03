(() => {
  'use strict';

  const KEY = 'cryptLord.afterNativeHost';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const STACK_ATTR = 'data-crypt-lord-after-native-stack';
  const TOP_STACK_ATTR = 'data-crypt-lord-before-native-stack';
  const MOUNT_ATTR = 'data-crypt-lord-after-native-mount';
  const MESSAGE_ID_ATTR = 'data-crypt-lord-message-id';
  const STACK_CLASS = 'crypt-lord-after-native-stack';
  const TOP_STACK_CLASS = 'crypt-lord-before-native-stack';
  const MOUNT_CLASS = 'crypt-lord-after-native-mount';
  const MODULE_ORDER = Object.freeze(['status-bar', 'status-card', 'action-options']);
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) {
    contract.initializeGlobal(KEY, modules[KEY]);
    return;
  }

  const stacks = new Map();
  const topStacks = new Map();
  let cachedHost = null;
  let disposed = false;

  function candidateWindows() {
    const values = [window];
    for (const name of ['parent', 'top']) {
      try {
        if (window[name] && !values.includes(window[name])) values.push(window[name]);
      } catch {
        // Cross-origin frames are not usable host documents.
      }
    }
    return values;
  }

  function scoreWindow(candidate) {
    try {
      const document = candidate?.document;
      if (!document?.body || !document?.documentElement || !document?.createElement) return -1;
      return (
        (candidate === window ? 1 : 3) +
        (candidate.TavernHelper ? 8 : 0) +
        (candidate.SillyTavern ? 10 : 0) +
        (document.querySelector?.('#send_textarea') ? 12 : 0) +
        (document.querySelector?.('#chat') ? 6 : 0)
      );
    } catch {
      return -1;
    }
  }

  function resolveHost() {
    if (disposed) return null;
    cachedHost = candidateWindows().reduce((best, candidate) => {
      const score = scoreWindow(candidate);
      if (score < 0) return best;
      return !best || score > best.score ? { window: candidate, document: candidate.document, score } : best;
    }, null);
    return cachedHost;
  }

  function getHost() {
    return cachedHost || resolveHost();
  }

  function owners() {
    const values = [window];
    const host = getHost();
    if (host?.window && !values.includes(host.window)) values.push(host.window);
    return values;
  }

  function normalizeDisplayedMessage(value) {
    const node = value?.nodeType === 1 ? value : value?.[0];
    if (!node || node.nodeType !== 1) return null;
    return typeof node.closest === 'function' ? node.closest('.mes[mesid]') || node : node;
  }

  function queryMessageElement(document, messageId) {
    if (!document?.querySelector) return null;
    const safeId = String(messageId).replace(/(["\\])/g, '\\$1');
    return (
      document.querySelector(`#chat > .mes[mesid="${safeId}"]`) ||
      document.querySelector(`.mes[mesid="${safeId}"]`) ||
      null
    );
  }

  function getDisplayedMessageElement(messageId) {
    if (messageId === undefined || messageId === null || disposed) return null;
    for (const owner of owners()) {
      try {
        const direct = normalizeDisplayedMessage(owner?.retrieveDisplayedMessage?.(messageId));
        if (direct) return direct;
      } catch {
        // Try the next same-origin owner.
      }
    }
    return queryMessageElement(getHost()?.document, messageId);
  }

  function getMessageTextElement(messageElement) {
    if (!messageElement) return null;
    return (
      messageElement.querySelector?.('.mes_text') ||
      messageElement.querySelector?.('.custom-mes_text') ||
      messageElement
    );
  }

  function createElement(tagName) {
    const document = getHost()?.document;
    if (!document?.createElement) throw new Error(`[${KEY}] 未找到可写入的 SillyTavern 宿主 document`);
    return document.createElement(tagName);
  }

  function isAttached(node) {
    if (!node || node.removed === true || node.isConnected === false) return false;
    return true;
  }

  function insertAfter(anchor, node) {
    if (!anchor || !node) return false;
    if (typeof anchor.insertAdjacentElement === 'function') {
      anchor.insertAdjacentElement('afterend', node);
    } else if (anchor.parentNode?.insertBefore) {
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    } else if (anchor.parentNode?.appendChild) {
      anchor.parentNode.appendChild(node);
    } else {
      return false;
    }
    return isAttached(node);
  }

  function insertBefore(anchor, node) {
    if (!anchor || !node) return false;
    if (anchor.parentNode?.insertBefore) {
      anchor.parentNode.insertBefore(node, anchor);
    } else if (typeof anchor.insertAdjacentElement === 'function') {
      anchor.insertAdjacentElement('beforebegin', node);
    } else {
      return false;
    }
    return isAttached(node);
  }

  function childList(node) {
    return Array.from(node?.children || []);
  }

  function findMount(stack, moduleId) {
    return childList(stack).find(child => child.getAttribute?.(MOUNT_ATTR) === moduleId) || null;
  }

  function ensureStack(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || disposed) return null;
    const existing = stacks.get(id);
    if (isAttached(existing)) return existing;
    if (existing) stacks.delete(id);
    const messageElement = getDisplayedMessageElement(id);
    if (!messageElement) return null;
    const anchor = getMessageTextElement(messageElement);
    if (!anchor) return null;
    const stack = createElement('section');
    stack.className = STACK_CLASS;
    stack.setAttribute(STACK_ATTR, 'true');
    stack.setAttribute(MESSAGE_ID_ATTR, String(id));
    if (!insertAfter(anchor, stack)) return null;
    stacks.set(id, stack);
    return stack;
  }

  function ensureTopStack(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || disposed) return null;
    const existing = topStacks.get(id);
    if (isAttached(existing)) return existing;
    if (existing) topStacks.delete(id);
    const messageElement = getDisplayedMessageElement(id);
    if (!messageElement) return null;
    const anchor = getMessageTextElement(messageElement);
    if (!anchor) return null;
    const stack = createElement('section');
    stack.className = TOP_STACK_CLASS;
    stack.setAttribute(TOP_STACK_ATTR, 'true');
    stack.setAttribute(MESSAGE_ID_ATTR, String(id));
    if (!insertBefore(anchor, stack)) return null;
    topStacks.set(id, stack);
    return stack;
  }

  function mount(messageId, moduleId, node) {
    if (disposed || !node || !MODULE_ORDER.includes(moduleId)) return false;
    const stack = ensureStack(messageId);
    if (!stack) return false;
    node.className = [String(node.className || '').trim(), MOUNT_CLASS].filter(Boolean).join(' ');
    node.setAttribute(MOUNT_ATTR, moduleId);
    node.setAttribute(MESSAGE_ID_ATTR, String(messageId));
    const existing = findMount(stack, moduleId);
    if (existing === node) return true;
    if (existing?.parentNode?.insertBefore) {
      existing.parentNode.insertBefore(node, existing);
      existing.remove();
    } else {
      const order = MODULE_ORDER.indexOf(moduleId);
      const next = childList(stack).find(child => MODULE_ORDER.indexOf(child.getAttribute?.(MOUNT_ATTR) || '') > order);
      if (next && stack.insertBefore) stack.insertBefore(node, next);
      else stack.appendChild(node);
    }
    return isAttached(node);
  }

  function mountTop(messageId, moduleId, node) {
    if (disposed || !node || !MODULE_ORDER.includes(moduleId)) return false;
    const stack = ensureTopStack(messageId);
    if (!stack) return false;
    node.className = [String(node.className || '').trim(), MOUNT_CLASS].filter(Boolean).join(' ');
    node.setAttribute(MOUNT_ATTR, moduleId);
    node.setAttribute(MESSAGE_ID_ATTR, String(messageId));
    const existing = findMount(stack, moduleId);
    if (existing === node) return true;
    if (existing?.parentNode?.insertBefore) {
      existing.parentNode.insertBefore(node, existing);
      existing.remove();
    } else {
      stack.appendChild(node);
    }
    return isAttached(node);
  }

  function unmount(messageId, moduleId) {
    const id = Number(messageId);
    const stack = stacks.get(id);
    if (!stack) return false;
    const node = findMount(stack, moduleId);
    node?.remove?.();
    if (childList(stack).length === 0) {
      stack.remove?.();
      stacks.delete(id);
    }
    return true;
  }

  function unmountTop(messageId, moduleId) {
    const id = Number(messageId);
    const stack = topStacks.get(id);
    if (!stack) return false;
    findMount(stack, moduleId)?.remove?.();
    if (childList(stack).length === 0) {
      stack.remove?.();
      topStacks.delete(id);
    }
    return true;
  }

  function clearMessage(messageId) {
    const id = Number(messageId);
    const stack = stacks.get(id);
    const topStack = topStacks.get(id);
    if (!stack && !topStack) return false;
    stack?.remove?.();
    topStack?.remove?.();
    stacks.delete(id);
    topStacks.delete(id);
    return true;
  }

  function clearAll() {
    new Set([...stacks.keys(), ...topStacks.keys()]).forEach(clearMessage);
    return true;
  }

  async function readChatMessages(range = '0-{{lastMessageId}}') {
    const hostApi = modules[HOST_API_KEY];
    if (hostApi) {
      try {
        const result = await hostApi.getChatMessages(range);
        if (Array.isArray(result)) return result;
      } catch {
        // Legacy hosts may expose only the direct global helper.
      }
    }
    for (const owner of owners()) {
      try {
        const result = await Promise.resolve(owner?.getChatMessages?.(range) ?? owner?.TavernHelper?.getChatMessages?.(range));
        if (Array.isArray(result)) return result;
      } catch {
        // Try the next same-origin owner.
      }
    }
    return [];
  }

  async function listAssistantMessages() {
    const messages = await readChatMessages('0-{{lastMessageId}}');
    return messages.filter(message => message?.role === 'assistant' && Number.isInteger(Number(message.message_id)));
  }

  function tavernEvents() {
    for (const owner of owners()) {
      try {
        if (owner?.tavern_events && typeof owner.tavern_events === 'object') return owner.tavern_events;
      } catch {
        // Try the next same-origin owner.
      }
    }
    return null;
  }

  function bindEvent(name, handler) {
    if (!name || typeof handler !== 'function') return null;
    for (const owner of owners()) {
      try {
        if (typeof owner?.eventOn === 'function') {
          const handle = owner.eventOn(name, handler);
          if (handle && typeof handle.stop === 'function') return handle;
          return { stop() {} };
        }
      } catch {
        // Try the next same-origin owner.
      }
    }
    return null;
  }

  const api = Object.freeze({
    status() {
      const host = getHost();
      return Object.freeze({
        key: KEY,
        ready: !disposed && !!host?.document,
        mounted: stacks.size > 0 || topStacks.size > 0,
        stacks: stacks.size,
        topStacks: topStacks.size,
        hostUrl: host?.document?.URL || '',
      });
    },
    resolveHost,
    getHost,
    getDisplayedMessageElement,
    getMessageTextElement,
    createElement,
    mount,
    mountTop,
    unmount,
    unmountTop,
    clearMessage,
    clearAll,
    readChatMessages,
    listAssistantMessages,
    tavernEvents,
    bindEvent,
    dispose() {
      if (disposed) return true;
      disposed = true;
      clearAll();
      cachedHost = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  resolveHost();
})();
