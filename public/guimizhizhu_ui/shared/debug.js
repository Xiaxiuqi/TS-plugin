(() => {
  'use strict';

  const KEY = 'cryptLord.debug';
  const STORAGE_KEY = 'cryptLord.debug.enabled';
  const MAX_EVENTS = 50;
  const DEDUPE_MS = 600;
  const CATEGORY_BUDGET = 12;
  const BUDGET_WINDOW_MS = 10000;
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);

  if (root.debug) {
    const valid = ['isEnabled', 'setEnabled', 'event', 'status', 'snapshot'].every(
      method => typeof root.debug[method] === 'function',
    );
    if (!valid || !root.debug.panel || typeof root.debug.panel.mount !== 'function') {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的调试API`);
    }
    contract.initializeGlobal(KEY, root.debug);
    return;
  }

  let enabled = true;
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    enabled = stored === null ? true : stored === 'true';
    if (stored === null) window.localStorage?.setItem(STORAGE_KEY, 'true');
  } catch {
    enabled = true;
  }

  const events = [];
  const dedupe = new Map();
  const budgets = new Map();
  const PANEL_SELECTOR = '[data-cryptLordDiagnostic]';
  const PANEL_LOCATION_DEDUPE_MS = 250;
  let panelElement = null;
  let panelSummaryElement = null;
  let panelLogElement = null;
  let panelCollapsed = false;
  let globalErrorHandler = null;
  let globalRejectionHandler = null;
  let lastPanelLocationAt = 0;

  function safeText(value) {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'string') return value;
    if (value === undefined) return '';
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function emitConsole(level, formattedText, payload) {
    try {
      const target = typeof console !== 'undefined' ? console : null;
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info';
      if (typeof target?.[method] === 'function') {
        target[method](`[cryptLord.debug] ${formattedText}`, payload);
      }
    } catch {
      // Diagnostics must never break the host when its console implementation throws.
    }
  }

  function safeString(value) {
    try {
      return value === null || value === undefined ? '' : String(value).slice(0, 500);
    } catch {
      return '';
    }
  }

  function safeRead(read, fallback = '') {
    try {
      const value = read();
      return value === undefined || value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function compactElement(node) {
    if (!node) return '';
    try {
      const tag = safeString(node.tagName || node.nodeName || 'node').toLowerCase() || 'node';
      const id = safeString(node.id).slice(0, 80);
      const classes = safeString(node.className).trim().split(/\s+/).filter(Boolean).slice(0, 4).map(name => name.slice(0, 60));
      return `${tag}${id ? `#${id}` : ''}${classes.length ? `.${classes.join('.')}` : ''}`.slice(0, 240);
    } catch {
      return '';
    }
  }

  function styleValues(style, properties) {
    const output = {};
    properties.forEach(property => {
      output[property] = safeString(safeRead(() => style?.[property], ''));
    });
    return output;
  }

  function panelLocationPayload(targetDocument, panel, mountResult, reason = '') {
    const payload = {
      mountResult: mountResult === true,
      selector: PANEL_SELECTOR,
      documentURL: safeString(safeRead(() => targetDocument?.URL, '')),
      documentTitle: safeString(safeRead(() => targetDocument?.title, '')),
      documentReadyState: safeString(safeRead(() => targetDocument?.readyState, '')),
      localFrame: false,
      bodyAvailable: !!safeRead(() => targetDocument?.body, null),
      rootAvailable: !!safeRead(() => targetDocument?.documentElement, null),
      selectorCount: 0,
      panelIsConnected: !!safeRead(() => panel?.isConnected, false),
      panelParent: compactElement(safeRead(() => panel?.parentNode, null)),
      ownerDocumentURL: safeString(safeRead(() => panel?.ownerDocument?.URL, '')),
      computedStyle: {},
      rect: null,
      viewport: { width: 0, height: 0 },
      ancestorStylePath: [],
    };
    if (mountResult !== true) payload.reason = safeString(reason || 'mount returned false');

    try {
      payload.selectorCount = Number(targetDocument?.querySelectorAll?.(PANEL_SELECTOR)?.length) || 0;
    } catch {
      payload.selectorCount = 0;
    }

    const ownerWindow = safeRead(() => panel?.ownerDocument?.defaultView || targetDocument?.defaultView, null);
    payload.localFrame = ownerWindow === window;
    payload.viewport = {
      width: Number(safeRead(() => ownerWindow?.innerWidth, 0)) || 0,
      height: Number(safeRead(() => ownerWindow?.innerHeight, 0)) || 0,
    };

    const getStyle = safeRead(() => ownerWindow?.getComputedStyle, null);
    const panelStyleProperties = [
      'display', 'visibility', 'opacity', 'zIndex', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'transform', 'filter', 'perspective', 'willChange', 'contain', 'overflow', 'pointerEvents',
    ];
    if (panel && typeof getStyle === 'function') {
      try {
        payload.computedStyle = styleValues(getStyle.call(ownerWindow, panel), panelStyleProperties);
      } catch {
        payload.computedStyle = {};
      }
    }

    if (panel && typeof safeRead(() => panel.getBoundingClientRect, null) === 'function') {
      try {
        const rect = panel.getBoundingClientRect();
        payload.rect = {
          x: Number(rect?.x) || 0,
          y: Number(rect?.y) || 0,
          width: Number(rect?.width) || 0,
          height: Number(rect?.height) || 0,
          top: Number(rect?.top) || 0,
          right: Number(rect?.right) || 0,
          bottom: Number(rect?.bottom) || 0,
          left: Number(rect?.left) || 0,
        };
      } catch {
        payload.rect = null;
      }
    }

    const ancestorProperties = ['position', 'zIndex', 'display', 'visibility', 'opacity', 'transform', 'filter', 'perspective', 'contain', 'overflow', 'overflowX', 'overflowY', 'clip', 'clipPath', 'isolation'];
    let ancestor = safeRead(() => panel?.parentElement || panel?.parentNode, null);
    for (let index = 0; ancestor && index < 5; index += 1) {
      const entry = { element: compactElement(ancestor), style: {} };
      if (typeof getStyle === 'function') {
        try {
          entry.style = styleValues(getStyle.call(ownerWindow, ancestor), ancestorProperties);
        } catch {
          entry.style = {};
        }
      }
      payload.ancestorStylePath.push(entry);
      ancestor = safeRead(() => ancestor.parentElement || ancestor.parentNode, null);
    }
    return payload;
  }

  function emitPanelLocation(targetDocument, panel, mountResult, reason = '') {
    try {
      const now = Date.now();
      if (mountResult === true && now - lastPanelLocationAt < PANEL_LOCATION_DEDUPE_MS) return;
      if (mountResult === true) lastPanelLocationAt = now;
      emitConsole(
        mountResult === true ? 'info' : 'error',
        mountResult === true ? 'panel-located' : 'panel-mount-failure',
        panelLocationPayload(targetDocument, panel, mountResult, reason),
      );
    } catch {
      // Location diagnostics are strictly best-effort and cannot affect mounting.
    }
  }

  function isFailure(entry) {
    return ['error', 'failure', 'failed', 'refusal', 'timeout', 'cancel'].some(token =>
      `${entry.category} ${entry.action} ${entry.level}`.toLowerCase().includes(token),
    );
  }

  function allowedByBudget(entry, now) {
    if (isFailure(entry)) return true;
    const bucket = budgets.get(entry.category) || [];
    const active = bucket.filter(time => now - time < BUDGET_WINDOW_MS);
    if (active.length >= CATEGORY_BUDGET) {
      budgets.set(entry.category, active);
      return false;
    }
    active.push(now);
    budgets.set(entry.category, active);
    return true;
  }

  function moduleStatuses() {
    const known = [
      'cryptLord.nativeFloor',
      'cryptLord.inputAdapter',
      'cryptLord.floatingVariableEditor',
      'cryptLord.judgmentBeautify',
    ];
    return known.map(key => {
      const module = root.__stage1Modules?.[key];
      let reported = null;
      try {
        reported = module?.status?.() || null;
      } catch (error) {
        reported = { error: safeText(error) };
      }
      return {
        key,
        registered: !!module,
        mounted: reported?.mounted === true,
        status: reported,
      };
    });
  }

  function snapshot() {
    return Object.freeze({
      enabled,
      loader: root.loader ? { status: root.loader.status, error: root.loader.error || '' } : null,
      modules: moduleStatuses(),
      limitations: Object.freeze([
        '未注册 cryptLord.nativeFloorBridge，原生楼层业务链路不可用',
        '未注册 AI 消息/MVU 生命周期监听器，不会解析或应用消息正文变量',
        '浮动变量编辑器尚未迁移',
        '判定美化尚未迁移',
      ]),
      events: Object.freeze(events.map(item => Object.freeze({ ...item }))),
    });
  }

  function append(parent, tag, text, style) {
    const node = parent.ownerDocument.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (style) node.setAttribute('style', style);
    parent.appendChild(node);
    return node;
  }

  const BUTTON_STYLE = 'padding:3px 7px;border:1px solid rgba(180,151,104,.65);border-radius:5px;color:inherit;background:rgba(255,255,255,.06);cursor:pointer';
  const ROW_STYLE = 'overflow-wrap:anywhere;margin:3px 0';

  function renderPanel() {
    if (!panelElement || !panelElement.isConnected) return;
    const summary = panelSummaryElement;
    const log = panelLogElement;
    if (!summary || !log) return;
    summary.textContent = '';
    log.textContent = '';
    const enableButton = panelElement.querySelector('[data-crypt-lord-debug-enable]');
    if (enableButton) enableButton.textContent = enabled ? '停用' : '启用';

    const state = snapshot();
    append(summary, 'div', `诊断：${state.enabled ? '已启用' : '已停用'}；加载器：${state.loader?.status || '未启动'}`, ROW_STYLE);
    state.modules.forEach(item => {
      const registered = item.registered ? '资源已注册' : '资源未注册';
      const mounted = item.mounted ? '业务功能已挂载' : '业务功能未挂载/不可用';
      append(summary, 'div', `${item.key}: ${registered}；${mounted}`, ROW_STYLE);
    });
    state.limitations.forEach(text => append(summary, 'div', `限制：${text}`, `${ROW_STYLE};color:#f0c674`));
    state.events.slice().reverse().forEach(item => {
      append(
        log,
        'div',
        `${item.timestamp} [${item.category}] ${item.module} · ${item.action}${item.details ? ` — ${item.details}` : ''}`,
        `${ROW_STYLE};${item.level === 'error' ? 'color:#ff8f8f' : item.level === 'warn' ? 'color:#f0c674' : ''}`,
      );
    });
    summary.setAttribute('style', `margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.12);${panelCollapsed ? 'display:none' : ''}`);
    log.setAttribute('style', `max-height:36vh;overflow:auto;${panelCollapsed ? 'display:none' : ''}`);
  }

  function mount(requestedDocument) {
    let targetDocument = null;
    try {
      // Once the host manager is registered it exclusively owns visible UI.  Debug
      // events and preference changes must not resurrect this compatibility panel.
      const manager = root.debugManager;
      if (manager && ['status', 'open', 'close', 'refresh', 'dispose'].every(method => typeof manager[method] === 'function')) {
        unmount();
        return false;
      }
      targetDocument = requestedDocument?.createElement ? requestedDocument : (typeof document !== 'undefined' ? document : null);
      if (typeof targetDocument?.createElement !== 'function' || (!targetDocument.body && !targetDocument.documentElement)) {
        emitPanelLocation(targetDocument, panelElement, false, 'usable document root is unavailable');
        return false;
      }
      if (panelElement?.isConnected && panelElement.ownerDocument === targetDocument) {
        renderPanel();
        emitPanelLocation(targetDocument, panelElement, true);
        return true;
      }
      if (panelElement?.isConnected) panelElement.remove();
      const panel = targetDocument.createElement('section');
      panel.dataset.cryptLordInstance = root.loader?.instanceId || '';
      panel.dataset.cryptLordDiagnostic = '';
      panel.setAttribute('data-cryptLordDiagnostic', '');
      panel.setAttribute('aria-label', 'Crypt Lord 调试面板');
      panel.setAttribute('style', 'position:fixed;right:12px;bottom:12px;z-index:2147483000;box-sizing:border-box;width:min(520px,calc(100vw - 24px));max-height:min(70vh,680px);overflow:auto;padding:10px;border:1px solid rgba(180,151,104,.75);border-radius:10px;color:#d9d5cc;background:rgba(28,29,33,.96);box-shadow:0 8px 28px rgba(0,0,0,.42);font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;pointer-events:auto');
      const header = append(panel, 'div', undefined, 'display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-10px;padding:8px 0;background:rgba(28,29,33,.96)');
      append(header, 'strong', 'Crypt Lord 诊断');
      const controls = append(header, 'div', undefined, 'display:flex;flex-wrap:wrap;gap:4px');
      const makeButton = (label, action) => {
        const button = append(controls, 'button', label, BUTTON_STYLE);
        button.type = 'button';
        button.addEventListener('click', action);
        return button;
      };
      makeButton('折叠', () => toggle());
      const enableButton = makeButton(enabled ? '停用' : '启用', () => setEnabled(!enabled));
      enableButton.dataset.cryptLordDebugEnable = '';
      makeButton('复制', () => { void copy(); });
      makeButton('清空', () => clear());
      panelSummaryElement = append(panel, 'div', '');
      panelSummaryElement.dataset.cryptLordDebugSummary = '';
      panelLogElement = append(panel, 'div', '');
      panelLogElement.dataset.cryptLordDebugLog = '';
      (targetDocument.body || targetDocument.documentElement).appendChild(panel);
      panelElement = panel;
      renderPanel();
      emitPanelLocation(targetDocument, panelElement, true);
      return true;
    } catch (error) {
      emitPanelLocation(targetDocument, panelElement, false, safeText(error));
      return false;
    }
  }

  function unmount() {
    try {
      panelElement?.remove();
      panelElement = null;
      panelSummaryElement = null;
      panelLogElement = null;
      return true;
    } catch {
      return false;
    }
  }

  function toggle(force) {
    panelCollapsed = typeof force === 'boolean' ? force : !panelCollapsed;
    renderPanel();
    return panelCollapsed;
  }

  async function copy() {
    const text = JSON.stringify(snapshot(), null, 2);
    try {
      if (window.navigator?.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to a non-throwing result; do not mutate host DOM as a clipboard workaround.
    }
    return false;
  }

  function clear() {
    events.length = 0;
    dedupe.clear();
    budgets.clear();
    renderPanel();
    return true;
  }

  function notify(entry) {
    if (!enabled) return;
    const formattedText = `${entry.module} · ${entry.action}${entry.details ? `: ${entry.details}` : ''}`;
    emitConsole(entry.level, formattedText, entry);
    mount();
  }

  function event(categoryOrEntry, module, action, details, level = 'info') {
    try {
      const source = categoryOrEntry && typeof categoryOrEntry === 'object'
        ? categoryOrEntry
        : { category: categoryOrEntry, module, action, details, level };
      const now = Date.now();
      const entry = {
        timestamp: new Date(now).toISOString(),
        category: safeText(source.category || 'general'),
        module: safeText(source.module || KEY),
        action: safeText(source.action || 'event'),
        details: safeText(source.details),
        level: ['info', 'warn', 'error'].includes(source.level) ? source.level : 'info',
      };
      const key = `${entry.category}\u0000${entry.module}\u0000${entry.action}`;
      const previous = dedupe.get(key) || 0;
      if (!isFailure(entry) && now - previous < DEDUPE_MS) return false;
      if (!allowedByBudget(entry, now)) return false;
      dedupe.set(key, now);
      events.push(entry);
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
      notify(entry);
      renderPanel();
      return true;
    } catch {
      return false;
    }
  }

  function setEnabled(value) {
    enabled = !!value;
    try {
      window.localStorage?.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Persistence may be unavailable in sandboxed hosts.
    }
    mount();
    renderPanel();
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function status() {
    return snapshot();
  }

  function dispose(reason) {
    try {
      if (globalErrorHandler) window.removeEventListener?.('error', globalErrorHandler);
      if (globalRejectionHandler) window.removeEventListener?.('unhandledrejection', globalRejectionHandler);
      if (root.__debugGlobalCaptureInstalled === api) delete root.__debugGlobalCaptureInstalled;
      unmount();
      events.length = 0;
      dedupe.clear();
      budgets.clear();
      if (reason === 'reset-preferences') window.localStorage?.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  const panel = Object.freeze({ mount, unmount, toggle, copy, clear });
  const api = Object.freeze({ isEnabled, setEnabled, event, status, snapshot, panel, dispose });
  root.debug = api;
  try {
    contract.initializeGlobal(KEY, api);
  } catch (error) {
    if (root.debug === api) delete root.debug;
    throw error;
  }

  if (!root.__debugGlobalCaptureInstalled) {
    root.__debugGlobalCaptureInstalled = api;
    globalErrorHandler = captured => {
      event('failure', 'window', 'error', captured?.error || captured?.message || '未知 window error', 'error');
    };
    globalRejectionHandler = captured => {
      event('failure', 'window', 'unhandledrejection', captured?.reason || '未知 Promise rejection', 'error');
    };
    window.addEventListener?.('error', globalErrorHandler);
    window.addEventListener?.('unhandledrejection', globalRejectionHandler);
  }

  mount();
  if (enabled) {
    event('lifecycle', KEY, 'registered', '诊断 API 已注册；面板仅报告真实可观测状态');
  }
})();
