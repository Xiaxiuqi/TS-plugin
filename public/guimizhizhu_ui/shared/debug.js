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
  let panelElement = null;
  let panelCollapsed = false;
  let globalErrorHandler = null;
  let globalRejectionHandler = null;

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

  function append(parent, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function renderPanel() {
    if (!panelElement || !panelElement.isConnected) return;
    const summary = panelElement.querySelector('[data-crypt-lord-debug-summary]');
    const log = panelElement.querySelector('[data-crypt-lord-debug-log]');
    if (!summary || !log) return;
    summary.textContent = '';
    log.textContent = '';
    const enableButton = panelElement.querySelector('[data-crypt-lord-debug-enable]');
    if (enableButton) enableButton.textContent = enabled ? '停用' : '启用';

    const state = snapshot();
    append(summary, 'div', 'crypt-lord-debug-state', `诊断：${state.enabled ? '已启用' : '已停用'}；加载器：${state.loader?.status || '未启动'}`);
    state.modules.forEach(item => {
      const registered = item.registered ? '资源已注册' : '资源未注册';
      const mounted = item.mounted ? '业务功能已挂载' : '业务功能未挂载/不可用';
      append(summary, 'div', 'crypt-lord-debug-module', `${item.key}: ${registered}；${mounted}`);
    });
    state.limitations.forEach(text => append(summary, 'div', 'crypt-lord-debug-limitation', `限制：${text}`));
    state.events.slice().reverse().forEach(item => {
      append(
        log,
        'div',
        `crypt-lord-debug-event crypt-lord-debug-level-${item.level}`,
        `${item.timestamp} [${item.category}] ${item.module} · ${item.action}${item.details ? ` — ${item.details}` : ''}`,
      );
    });
    panelElement.classList.toggle('crypt-lord-debug-collapsed', panelCollapsed);
  }

  function mount() {
    try {
      if (!document?.createElement || !document.documentElement) return false;
      if (panelElement?.isConnected) {
        renderPanel();
        return true;
      }
      const panel = document.createElement('section');
      panel.className = 'crypt-lord-root crypt-lord-debug-panel';
      panel.setAttribute('aria-label', 'Crypt Lord 调试面板');
      const header = append(panel, 'div', 'crypt-lord-debug-header');
      append(header, 'strong', '', 'Crypt Lord 诊断');
      const controls = append(header, 'div', 'crypt-lord-debug-controls');
      const makeButton = (label, action) => {
        const button = append(controls, 'button', '', label);
        button.type = 'button';
        button.addEventListener('click', action);
        return button;
      };
      makeButton('折叠', () => toggle());
      const enableButton = makeButton(enabled ? '停用' : '启用', () => setEnabled(!enabled));
      enableButton.dataset.cryptLordDebugEnable = '';
      makeButton('复制', () => { void copy(); });
      makeButton('清空', () => clear());
      append(panel, 'div', 'crypt-lord-debug-summary', '').dataset.cryptLordDebugSummary = '';
      append(panel, 'div', 'crypt-lord-debug-log', '').dataset.cryptLordDebugLog = '';
      (document.body || document.documentElement).appendChild(panel);
      panelElement = panel;
      renderPanel();
      return true;
    } catch {
      return false;
    }
  }

  function unmount() {
    try {
      panelElement?.remove();
      panelElement = null;
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
    const message = `${entry.module} · ${entry.action}${entry.details ? `: ${entry.details}` : ''}`;
    try {
      const toastr = window.toastr;
      const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warning' : 'info';
      if (toastr && typeof toastr[method] === 'function') toastr[method](message, 'Crypt Lord');
    } catch {
      // The panel remains the safe visible fallback.
    }
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

  function dispose() {
    try {
      if (globalErrorHandler) window.removeEventListener?.('error', globalErrorHandler);
      if (globalRejectionHandler) window.removeEventListener?.('unhandledrejection', globalRejectionHandler);
      if (root.__debugGlobalCaptureInstalled === api) delete root.__debugGlobalCaptureInstalled;
      unmount();
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
