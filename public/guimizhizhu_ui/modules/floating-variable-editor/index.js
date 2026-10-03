(() => {
  'use strict';

  const KEY = 'cryptLord.floatingVariableEditor';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const MODULE_ID = 'status-card';
  const CARD_ATTR = 'data-crypt-lord-floating-variable-editor-card';
  const CARD_CLASS = 'crypt-lord-floating-variable-editor-card';
  const CARD_LIST_CLASS = 'crypt-lord-floating-variable-editor-card__list';
  const CARD_TITLE_CLASS = 'crypt-lord-floating-variable-editor-card__title';
  const CARD_KEY_CLASS = 'crypt-lord-floating-variable-editor-card__key';
  const CARD_VALUE_CLASS = 'crypt-lord-floating-variable-editor-card__value';
  const CARD_EMPTY_CLASS = 'crypt-lord-floating-variable-editor-card__empty';
  const INSTANCE_ATTR = 'data-crypt-lord-floating-variable-editor-instance';
  const MESSAGE_ID_ATTR = 'data-crypt-lord-message-id';
  const CARD_TITLE_TEXT = '角色详情';
  const EMPTY_TEXT = '(stat_data 为空)';
  const FALLBACK_VALUE_TEXT = '—';
  const MAX_ENTRIES = 32;
  const MAX_VALUE_LENGTH = 200;
  const MAX_TOTAL_LENGTH = 4096;
  const MVU_WAIT_TIMEOUT_MS = 1500;
  const ATTRIBUTE_DEFINITIONS = Object.freeze([
    Object.freeze({ label: '活力', current: '当前活力', max: '活力' }),
    Object.freeze({ label: '灵性', current: '当前灵性', max: '灵性' }),
    Object.freeze({ label: '理智', current: '当前理智', max: '理智' }),
    Object.freeze({ label: '人性', current: '当前人性', max: '人性' }),
    Object.freeze({ label: '敏捷', current: '当前敏捷', max: '敏捷' }),
    Object.freeze({ label: '运气', current: '当前运气', max: '运气' }),
  ]);

  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const afterNative = root.__stage1Modules?.[HOST_KEY];
  if (!afterNative) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
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

  function createElement(tag, className, text) {
    const element = afterNative.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function numericValue(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function attributeValue(statData, definition) {
    const maximum = numericValue(statData[definition.max], 0);
    const rawCurrent = statData[definition.current];
    const current = rawCurrent === undefined ? maximum : numericValue(rawCurrent, maximum);
    const percent = maximum > 0 ? Math.max(0, Math.min(100, current / maximum * 100)) : 0;
    return { current, maximum, percent };
  }

  function appendAttributeRows(container, statData) {
    ATTRIBUTE_DEFINITIONS.forEach(definition => {
      const values = attributeValue(statData, definition);
      const item = createElement('div', 'crypt-lord-floating-variable-editor-card__attribute');
      const line = createElement('div', 'crypt-lord-floating-variable-editor-card__attribute-line');
      line.append(
        createElement('span', 'crypt-lord-floating-variable-editor-card__attribute-name', definition.label),
        createElement(
          'strong',
          'crypt-lord-floating-variable-editor-card__attribute-value',
          values.maximum > 0 && values.current !== values.maximum
            ? `${values.current} / ${values.maximum}`
            : String(values.maximum || values.current || '—'),
        ),
      );
      const progress = createElement('span', 'crypt-lord-floating-variable-editor-card__progress');
      const fill = createElement('span', 'crypt-lord-floating-variable-editor-card__progress-fill');
      fill.style.width = `${values.percent}%`;
      fill.dataset.level = values.percent <= 30 ? 'low' : values.percent <= 65 ? 'medium' : 'high';
      progress.appendChild(fill);
      item.append(line, progress);
      container.appendChild(item);
    });
  }

  function compactValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) {
      const values = value.map(item => safeText(item?.名称 ?? item)).filter(Boolean).slice(0, 4);
      return values.length ? values.join('、') : '—';
    }
    if (isPlainObject(value)) {
      const names = Object.entries(value)
        .filter(([key]) => key !== '$meta')
        .map(([key, item]) => safeText(item?.名称 ?? key))
        .filter(Boolean)
        .slice(0, 4);
      return names.length ? names.join('、') : '—';
    }
    return safeText(value);
  }

  function appendOverview(body, statData) {
    const overview = createElement('div', 'crypt-lord-floating-variable-editor-card__overview');
    const attributes = createElement('section', 'crypt-lord-floating-variable-editor-card__section');
    attributes.appendChild(createElement('h4', 'crypt-lord-floating-variable-editor-card__section-title', '基础属性'));
    const attributeList = createElement('div', 'crypt-lord-floating-variable-editor-card__attributes');
    appendAttributeRows(attributeList, statData);
    attributes.appendChild(attributeList);

    const profile = createElement('section', 'crypt-lord-floating-variable-editor-card__section');
    profile.appendChild(createElement('h4', 'crypt-lord-floating-variable-editor-card__section-title', '当前概况'));
    const facts = createElement('dl', 'crypt-lord-floating-variable-editor-card__facts');
    [
      ['途径', statData.当前途径 ?? statData.途径],
      ['地点', statData.当前地点 ?? statData.所在地],
      ['状态', statData.当前状态],
      ['任务', statData.当前任务 ?? statData.已接受任务],
      ['装备', statData.装备 ?? statData.装备栏],
    ].forEach(([label, value]) => {
      facts.append(
        createElement('dt', 'crypt-lord-floating-variable-editor-card__fact-key', label),
        createElement('dd', 'crypt-lord-floating-variable-editor-card__fact-value', compactValue(value)),
      );
    });
    profile.appendChild(facts);
    overview.append(attributes, profile);
    body.appendChild(overview);
  }

  function appendRawDetails(body, statData) {
    const details = createElement('details', 'crypt-lord-floating-variable-editor-card__details');
    const summary = createElement('summary', 'crypt-lord-floating-variable-editor-card__details-summary', '全部楼层变量');
    const list = createElement('dl', CARD_LIST_CLASS);
    appendListEntries(details.ownerDocument || afterNative.getHost()?.document, list, statData);
    details.append(summary, list);
    body.appendChild(details);
  }

  function buildCardElement(messageId, statData) {
    const card = afterNative.createElement('section');
    card.setAttribute(CARD_ATTR, '');
    card.setAttribute(INSTANCE_ATTR, root.loader?.instanceId || '');
    card.setAttribute(MESSAGE_ID_ATTR, String(messageId));
    card.setAttribute('aria-label', CARD_TITLE_TEXT);
    card.className = `crypt-lord-original-ui ${CARD_CLASS}`;
    try { card.dataset.theme = window.localStorage?.getItem('cryptLord.originalUi.theme') === 'light' ? 'light' : 'dark'; } catch { card.dataset.theme = 'dark'; }
    const title = afterNative.createElement('header');
    title.className = CARD_TITLE_CLASS;
    const heading = createElement('div', 'crypt-lord-floating-variable-editor-card__heading');
    heading.append(
      createElement('strong', '', safeText(statData.名称 || '<User>')),
      createElement('span', '', safeText(statData.当前序列 || statData.位阶 || '普通人')),
    );
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'true');
    title.append(heading, createElement('span', 'crypt-lord-floating-variable-editor-card__collapse-mark', '◆'));
    card.appendChild(title);
    const body = createElement('div', 'crypt-lord-floating-variable-editor-card__body');
    appendOverview(body, statData);
    appendRawDetails(body, statData);
    const toggleCollapsed = () => {
      const collapsed = card.dataset.collapsed === 'true';
      card.dataset.collapsed = collapsed ? 'false' : 'true';
      title.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
    };
    title.addEventListener('click', toggleCollapsed);
    title.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleCollapsed();
    });
    card.appendChild(body);
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

  function attachCard(messageId, statData) {
    if (disposed) return false;
    const existing = cards.get(messageId);
    if (existing) {
      removeCard(messageId);
    }
    const fragment = buildCardElement(messageId, statData);
    if (!fragment) return false;
    if (!afterNative.mount(Number(messageId), MODULE_ID, fragment)) return false;
    cards.set(messageId, { element: fragment, statData });
    return true;
  }

  function removeCard(messageId) {
    const entry = cards.get(messageId);
    if (!entry) return false;
    afterNative.unmount(Number(messageId), MODULE_ID);
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
    const handle = afterNative.bindEvent(name, handler);
    if (handle?.stop) subscriptions.push(handle);
  }

  function ensureListeners() {
    if (listenersInstalled || disposed) return;
    const tavernEvents = afterNative.tavernEvents() || resolveTavernEvents();
    if (!tavernEvents) {
      debugEvent('refusal', 'tavern-events-missing', 'window.tavern_events 不可用；将仅扫描当前已渲染楼层', 'warn');
    } else {
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
        void scanExisting();
      });
    }
    const ownerWindow = afterNative.getHost()?.window || getOwnerWindow();
    if (ownerWindow && typeof ownerWindow.addEventListener === 'function' && !pagehideHandler) {
      pagehideHandler = () => {
        const count = cards.size;
        clearAllCards();
        debugEvent('lifecycle', 'pagehide-cleanup', `已清理 ${count} 张状态卡`, 'info');
      };
      ownerWindow.addEventListener('pagehide', pagehideHandler, { once: true });
    }
  }

  async function scanExisting() {
    if (disposed) return 0;
    const messages = await afterNative.listAssistantMessages();
    for (const message of messages) await handleUpdate(Number(message.message_id));
    return cards.size;
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
    return stateStoreReady.then(async () => {
      if (disposed) return false;
      await scanExisting();
      return !disposed;
    });
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
    const ownerWindow = afterNative.getHost()?.window || getOwnerWindow();
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
        ready: !disposed && booted,
        mvuReady: mvuAvailable,
        booted,
        mounted: cards.size > 0,
        cards: cards.size,
        listenerHandles: subscriptions.length,
        pagehideBound: !!pagehideHandler,
        mvuResolved,
        tavernEventsAvailable: !!afterNative.tavernEvents() || !!resolveTavernEvents(),
        eventOnAvailable: isEventOnAvailable() || typeof afterNative.getHost()?.window?.eventOn === 'function',
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
