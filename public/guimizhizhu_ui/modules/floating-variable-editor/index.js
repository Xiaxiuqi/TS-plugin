(() => {
  'use strict';

  const KEY = 'cryptLord.floatingVariableEditor';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const CARD_ATTR = 'data-crypt-lord-floating-variable-editor-card';
  const CARD_CLASS = 'crypt-lord-floating-variable-editor-card';
  const CARD_LIST_CLASS = 'crypt-lord-floating-variable-editor-card__list';
  const CARD_TITLE_CLASS = 'crypt-lord-floating-variable-editor-card__title';
  const CARD_KEY_CLASS = 'crypt-lord-floating-variable-editor-card__key';
  const CARD_VALUE_CLASS = 'crypt-lord-floating-variable-editor-card__value';
  const CARD_EMPTY_CLASS = 'crypt-lord-floating-variable-editor-card__empty';
  const INSTANCE_ATTR = 'data-crypt-lord-floating-variable-editor-instance';
  const MESSAGE_ID_ATTR = 'data-crypt-lord-message-id';
  const CARD_TITLE_TEXT = 'Crypt Lord · 角色状态卡';
  const EMPTY_TEXT = '(stat_data 为空)';
  const FALLBACK_VALUE_TEXT = '—';
  const MAX_ENTRIES = 32;
  const MAX_VALUE_LENGTH = 200;
  const MAX_TOTAL_LENGTH = 4096;
  const MVU_WAIT_TIMEOUT_MS = 1500;

  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    if (
      typeof existing.status !== 'function' ||
      typeof existing.isReady !== 'function' ||
      typeof existing.mount !== 'function' ||
      typeof existing.unmount !== 'function' ||
      typeof existing.dispose !== 'function'
    ) {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    return;
  }

  function getDebug() {
    const debug = root.debug;
    return debug && typeof debug.event === 'function' ? debug : null;
  }

  function debugEvent(category, action, details, level = 'info') {
    try {
      getDebug()?.event(category, KEY, action, details, level);
    } catch {
      // Diagnostics are best-effort and must never affect card lifecycle.
    }
  }

  function safeText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    try { return JSON.stringify(value); } catch { return '[unserializable]'; }
  }

  function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function getOwnerDocument() {
    try {
      if (typeof document !== 'undefined' && document && typeof document.createElement === 'function') return document;
    } catch { /* sandbox without document */ }
    return null;
  }

  function getOwnerWindow() {
    try {
      if (typeof window !== 'undefined') return window;
    } catch { /* sandbox */ }
    return null;
  }

  function escapeAttribute(value) {
    return String(value).replace(/(["\\])/g, '\\$1');
  }

  function findMessageContainer(messageId) {
    const ownerWindow = getOwnerWindow();
    if (ownerWindow && typeof ownerWindow.retrieveDisplayedMessage === 'function') {
      try {
        const displayed = ownerWindow.retrieveDisplayedMessage(messageId);
        const node = displayed?.nodeType === 1 ? displayed : displayed?.[0];
        if (node && typeof node === 'object' && (node.tagName || node.nodeType === 1)) {
          return typeof node.closest === 'function' ? node.closest('.mes[mesid]') || node : node;
        }
      } catch { /* fall through to DOM fallback */ }
    }
    const doc = getOwnerDocument();
    if (!doc || typeof doc.querySelector !== 'function') return null;
    try {
      const safeId = escapeAttribute(messageId);
      const node = doc.querySelector(`#chat > .mes[mesid="${safeId}"]`);
      if (node) return node;
      // Fallback: doc.querySelector may be restricted in some host/test sandboxes;
      // doc.body.querySelector walks the live DOM and accepts compound selectors.
      if (doc.body && typeof doc.body.querySelector === 'function') {
        const bodyNode = doc.body.querySelector(`#chat > .mes[mesid="${safeId}"]`);
        if (bodyNode) return bodyNode;
      }
    } catch { /* query failed */ }
    return null;
  }

  function extractStatData(payload) {
    if (!isPlainObject(payload)) return null;
    const candidate = payload.stat_data;
    if (!isPlainObject(candidate)) return null;
    if (Object.keys(candidate).length === 0) return null;
    return candidate;
  }

  function normalizeStatEntries(statData) {
    const keys = Object.keys(statData).sort();
    const entries = [];
    let totalLength = 0;
    for (const key of keys) {
      if (entries.length >= MAX_ENTRIES) break;
      let valueText;
      const value = statData[key];
      if (value === null || value === undefined) valueText = '';
      else if (typeof value === 'string') valueText = value;
      else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') valueText = String(value);
      else valueText = safeText(value);
      if (valueText.length > MAX_VALUE_LENGTH) valueText = `${valueText.slice(0, MAX_VALUE_LENGTH)}…`;
      const entryLength = key.length + valueText.length + 4;
      if (totalLength + entryLength > MAX_TOTAL_LENGTH) break;
      entries.push({ key, value: valueText });
      totalLength += entryLength;
    }
    return entries;
  }

  function appendListEntries(doc, list, statData) {
    const entries = normalizeStatEntries(statData);
    if (entries.length === 0) {
      const empty = doc.createElement('dt');
      empty.className = CARD_EMPTY_CLASS;
      empty.textContent = EMPTY_TEXT;
      list.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      const dt = doc.createElement('dt');
      dt.className = CARD_KEY_CLASS;
      dt.textContent = entry.key;
      const dd = doc.createElement('dd');
      dd.className = CARD_VALUE_CLASS;
      dd.textContent = entry.value || FALLBACK_VALUE_TEXT;
      list.appendChild(dt);
      list.appendChild(dd);
    }
  }

  function buildCardElement(messageId, statData) {
    const doc = getOwnerDocument();
    if (!doc) return null;
    const card = doc.createElement('section');
    card.setAttribute(CARD_ATTR, '');
    card.setAttribute(INSTANCE_ATTR, root.loader?.instanceId || '');
    card.setAttribute(MESSAGE_ID_ATTR, String(messageId));
    card.setAttribute('aria-label', CARD_TITLE_TEXT);
    card.className = CARD_CLASS;
    const title = doc.createElement('header');
    title.className = CARD_TITLE_CLASS;
    title.textContent = CARD_TITLE_TEXT;
    card.appendChild(title);
    const list = doc.createElement('dl');
    list.className = CARD_LIST_CLASS;
    appendListEntries(doc, list, statData);
    card.appendChild(list);
    return card;
  }

  const cards = new Map();
  let subscriptions = [];
  let pagehideHandler = null;
  let listenersInstalled = false;
  let mvuAvailable = false;
  let mvuPromise = null;
  let stateStorePromise = null;
  let mvuResolved = false;
  let booted = false;
  let disposed = false;

  function refreshCardBody(doc, cardElement, statData) {
    const list = cardElement.querySelector(`.${CARD_LIST_CLASS}`);
    if (!list) return false;
    list.textContent = '';
    appendListEntries(doc, list, statData);
    return true;
  }

  function attachCard(messageId, statData) {
    if (disposed) return false;
    const container = findMessageContainer(messageId);
    if (!container) return false;
    const doc = container.ownerDocument || getOwnerDocument();
    if (!doc) return false;
    // Resolve insertion point so the card lives inside .mes after .mes_text.
    const containerIsMesText = typeof container.className === 'string'
      && container.className.split(/\s+/).includes('mes_text');
    const insertTarget = containerIsMesText
      ? container
      : (typeof container.querySelector === 'function' ? container.querySelector('.mes_text') : null) || container;
    const parent = insertTarget.parentNode;
    if (!parent) return false;
    const existing = cards.get(messageId);
    if (existing) {
      // Refresh in place to guarantee no duplicate per message id.
      existing.statData = statData;
      return refreshCardBody(doc, existing.element, statData);
    }
    const fragment = buildCardElement(messageId, statData);
    if (!fragment) return false;
    const nextSibling = insertTarget.nextSibling;
    if (typeof parent.insertBefore === 'function') {
      parent.insertBefore(fragment, nextSibling);
    } else {
      parent.appendChild(fragment);
    }
    cards.set(messageId, { element: fragment, statData });
    return true;
  }

  function removeCard(messageId) {
    const entry = cards.get(messageId);
    if (!entry) return false;
    try { entry.element.remove(); } catch { /* already detached */ }
    cards.delete(messageId);
    return true;
  }

  function clearAllCards() {
    if (cards.size === 0) return false;
    for (const id of Array.from(cards.keys())) removeCard(id);
    return true;
  }

  async function fetchStatData(messageId) {
    try {
      const store = await ensureStateStore();
      const payload = await store?.readMessageData?.(messageId);
      const statData = extractStatData(payload);
      if (statData) return statData;
    } catch {
      // MVU remains a compatibility fallback while old chats are being migrated.
    }
    if (!mvuAvailable || !mvuPromise) return null;
    let mvu = null;
    try { mvu = await mvuPromise; } catch { return null; }
    if (!mvu || typeof mvu.getMvuData !== 'function') return null;
    let payload = null;
    try {
      payload = await mvu.getMvuData({ type: 'message', message_id: messageId });
    } catch {
      return null;
    }
    return extractStatData(payload);
  }

  function ensureStateStore() {
    if (!stateStorePromise) {
      stateStorePromise = contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: MVU_WAIT_TIMEOUT_MS }).catch(() => null);
    }
    return stateStorePromise;
  }

  function isAssistantRenderType(type) {
    if (type === undefined || type === null) return true;
    const normalized = String(type).toLowerCase();
    return normalized === 'assistant' || normalized === 'character';
  }

  function resolveTavernEvents() {
    const ownerWindow = getOwnerWindow();
    if (!ownerWindow) return null;
    try {
      const candidate = ownerWindow.tavern_events;
      if (candidate && typeof candidate === 'object') return candidate;
    } catch { /* sandbox */ }
    return null;
  }

  function isEventOnAvailable() {
    const ownerWindow = getOwnerWindow();
    return !!(ownerWindow && typeof ownerWindow.eventOn === 'function');
  }

  function bindEvent(name, handler) {
    const ownerWindow = getOwnerWindow();
    if (!ownerWindow || typeof ownerWindow.eventOn !== 'function' || !name) return;
    let handle = null;
    try {
      handle = ownerWindow.eventOn(name, handler);
    } catch (error) {
      debugEvent('failure', 'event-binding-failure', `${name}: ${error?.message || error}`, 'error');
      return;
    }
    if (handle && typeof handle.stop === 'function') {
      subscriptions.push(handle);
      return;
    }
    // Best-effort stopper fallback to keep dispose idempotent even if host returns a non-fenced handle.
    subscriptions.push({ stop() { /* noop */ } });
  }

  function ensureListeners() {
    if (listenersInstalled || disposed) return;
    if (!isEventOnAvailable()) {
      debugEvent('refusal', 'event-binding-missing', 'window.eventOn 不可用；卡片不会自动渲染', 'warn');
      return;
    }
    const tavernEvents = resolveTavernEvents();
    if (!tavernEvents) {
      debugEvent('refusal', 'tavern-events-missing', 'window.tavern_events 不可用；卡片不会自动渲染', 'warn');
      return;
    }
    listenersInstalled = true;
    bindEvent(tavernEvents.CHARACTER_MESSAGE_RENDERED, (messageId, type) => {
      if (messageId === undefined || messageId === null) return;
      if (!isAssistantRenderType(type)) return;
      void handleRender(messageId);
    });
    bindEvent(tavernEvents.MESSAGE_UPDATED, (messageId) => {
      if (messageId === undefined || messageId === null) return;
      void handleUpdate(messageId);
    });
    bindEvent(tavernEvents.MESSAGE_DELETED, (messageId) => {
      if (messageId === undefined || messageId === null) return;
      removeCard(messageId);
    });
    bindEvent(tavernEvents.CHAT_CHANGED, () => {
      clearAllCards();
    });
    const ownerWindow = getOwnerWindow();
    if (ownerWindow && typeof ownerWindow.addEventListener === 'function' && !pagehideHandler) {
      pagehideHandler = () => {
        const count = cards.size;
        clearAllCards();
        debugEvent('lifecycle', 'pagehide-cleanup', `已清理 ${count} 张状态卡`, 'info');
      };
      ownerWindow.addEventListener('pagehide', pagehideHandler, { once: true });
    }
  }

  async function handleRender(messageId) {
    if (disposed) return;
    const statData = await fetchStatData(messageId);
    if (disposed || !statData) return;
    attachCard(messageId, statData);
  }

  async function handleUpdate(messageId) {
    if (disposed) return;
    const statData = await fetchStatData(messageId);
    if (disposed) return;
    if (!statData) {
      removeCard(messageId);
      return;
    }
    attachCard(messageId, statData);
  }

  function ensureMvu() {
    if (mvuPromise) return mvuPromise;
    if (!contract || typeof contract.waitGlobalInitialized !== 'function') {
      mvuAvailable = false;
      mvuResolved = true;
      return Promise.resolve(null);
    }
    mvuPromise = contract.waitGlobalInitialized('cryptLord.Mvu', { timeoutMs: MVU_WAIT_TIMEOUT_MS })
      .then(api => {
        if (disposed) return null;
        mvuResolved = true;
        if (api && typeof api.getMvuData === 'function') {
          mvuAvailable = true;
          return api;
        }
        mvuAvailable = false;
        return null;
      })
      .catch(() => {
        if (disposed) return null;
        mvuResolved = true;
        mvuAvailable = false;
        return null;
      });
    return mvuPromise;
  }

  function mount(messageId) {
    if (disposed) return Promise.resolve(false);
    booted = true;
    ensureListeners();
    const stateStoreReady = ensureStateStore();
    void ensureMvu();
    if (messageId !== undefined && messageId !== null) {
      // Wait for the read-only Mvu lookup before refreshing; otherwise this same
      // microtask turn sees mvuAvailable=false and drops the manual request.
      return stateStoreReady.then(async () => {
        if (disposed) return false;
        await handleUpdate(messageId);
        return !disposed;
      });
    }
    return stateStoreReady.then(() => !disposed);
  }

  function unmount() {
    clearAllCards();
    return true;
  }

  function dispose() {
    if (disposed) return true;
    disposed = true;
    clearAllCards();
    const stops = subscriptions;
    subscriptions = [];
    stops.forEach(handle => {
      try { handle.stop?.(); } catch { /* idempotent */ }
    });
    const ownerWindow = getOwnerWindow();
    if (pagehideHandler && ownerWindow && typeof ownerWindow.removeEventListener === 'function') {
      try { ownerWindow.removeEventListener('pagehide', pagehideHandler); } catch { /* idempotent */ }
      pagehideHandler = null;
    }
    try { contract.releaseGlobal(KEY, api); } catch { /* idempotent cleanup */ }
    if (modules[KEY] === api) delete modules[KEY];
    listenersInstalled = false;
    return true;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        phase: 'stage1-body-stat-card',
        ready: mvuAvailable,
        booted,
        mounted: cards.size > 0,
        cards: cards.size,
        listenerHandles: subscriptions.length,
        pagehideBound: !!pagehideHandler,
        mvuResolved,
        tavernEventsAvailable: !!resolveTavernEvents(),
        eventOnAvailable: isEventOnAvailable(),
      });
    },
    isReady() {
      return mvuAvailable;
    },
    mount,
    unmount,
    dispose,
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
    debugEvent('lifecycle', 'registered', '状态卡资源已注册；正在启动原生楼层监听', 'info');
  } catch (error) {
    debugEvent('failure', 'registration-failure', error?.message || error, 'error');
    if (modules[KEY] === api) delete modules[KEY];
    throw error;
  }
  void mount().catch(error => {
    debugEvent('failure', 'initial-mount-failure', error?.message || error, 'error');
  });
})();
