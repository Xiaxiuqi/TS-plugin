(() => {
  'use strict';

  const KEY = 'cryptLord.debugToolbar';
  const BUTTON_NAME = '🐞 诊断';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    if (!['status', 'reconnect', 'dispose'].every(method => typeof existing[method] === 'function')) {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    existing.reconnect();
    return;
  }

  const bindingOwner = `crypt-lord-${root.loader?.instanceId || 'standalone'}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const localBindings = new Map();
  let disposed = false;
  let registered = false;
  let registrationMethod = null;
  let bindingMethod = null;
  let eventName = null;
  let eventHandler = null;
  let lastError = '';

  function safeMessage(error) {
    return error instanceof Error ? error.message : String(error || '未知错误');
  }

  function directConsole(level, action, details = '') {
    try {
      const method = level === 'error' ? 'error' : 'info';
      if (typeof console?.[method] === 'function') {
        console[method](`[cryptLord.debugToolbar] button=${BUTTON_NAME} action=${action}${details ? ` reason=${details}` : ''}`);
      }
    } catch {
      // Host consoles are not guaranteed to be callable.
    }
  }

  function panelOpenResult(debug, mounted) {
    const selector = '[data-cryptLordDiagnostic]';
    let panelCount = 0;
    let documentURL = '';
    let enabled;
    try { panelCount = Number(document?.querySelectorAll?.(selector)?.length) || 0; } catch { panelCount = 0; }
    try { documentURL = String(document?.URL || ''); } catch { documentURL = ''; }
    try { enabled = debug?.isEnabled?.(); } catch { enabled = undefined; }
    try {
      if (typeof console?.info === 'function') {
        console.info('[cryptLord.debugToolbar] action=panel-open-result', {
          mounted: mounted === true,
          enabled,
          selector,
          panelCount,
          documentURL,
        });
      }
    } catch {
      // Result instrumentation must not affect button behavior.
    }
  }

  function debugEvent(action, details, level = 'info') {
    try { root.debug?.event?.('lifecycle', KEY, action, details, level); } catch { /* diagnostics are optional */ }
  }

  function ownsCurrentModule() {
    return !disposed && modules[KEY] === api;
  }

  function openPanel() {
    if (!ownsCurrentModule()) return false;
    let debug = null;
    let mounted = false;
    try {
      debug = root.debug;
      if (!debug?.panel || typeof debug.panel.mount !== 'function' || typeof debug.setEnabled !== 'function') {
        throw new Error('cryptLord.debug API 当前不可用');
      }
      mounted = debug.panel.mount(document) === true;
      debug.setEnabled(true);
      if (!mounted) throw new Error('调试面板无法挂载到当前脚本文档');
      lastError = '';
      return true;
    } catch (error) {
      lastError = `诊断面板打开失败：${safeMessage(error)}`;
      directConsole('error', 'open-panel-failure', lastError);
      debugEvent('button-open-failure', lastError, 'error');
      return false;
    } finally {
      panelOpenResult(debug, mounted);
    }
  }

  function removeLocalBindings() {
    localBindings.forEach((handler, button) => {
      try {
        button.removeEventListener?.('click', handler);
        if (button.dataset?.cryptLordDebugBinding === bindingOwner) delete button.dataset.cryptLordDebugBinding;
      } catch { /* stale local nodes are harmless */ }
    });
    localBindings.clear();
    if (bindingMethod === 'local-document') bindingMethod = null;
  }

  function bindLocalButtons() {
    removeLocalBindings();
    const buttons = Array.from(document.querySelectorAll?.('button') || []).filter(button => {
      const text = (button.textContent || '').trim();
      return text === BUTTON_NAME || text.includes(BUTTON_NAME);
    });
    buttons.forEach(button => {
      const handler = event => {
        directConsole('info', 'local-fallback-click');
        if (!ownsCurrentModule() || button.dataset?.cryptLordDebugBinding !== bindingOwner) return;
        try {
          event?.preventDefault?.();
          event?.stopPropagation?.();
        } catch { /* opening diagnostics does not depend on event cancellation */ }
        openPanel();
      };
      button.dataset.cryptLordDebugBinding = bindingOwner;
      button.addEventListener('click', handler);
      localBindings.set(button, handler);
    });
    if (localBindings.size > 0) bindingMethod = 'local-document';
    return localBindings.size > 0;
  }

  function registerNativeButton() {
    if (registered) return true;
    const descriptor = [{ name: BUTTON_NAME, visible: true }];
    try {
      if (typeof window.replaceScriptButtons === 'function') {
        window.replaceScriptButtons(descriptor);
        registered = true;
        registrationMethod = 'replaceScriptButtons';
        return true;
      }
      if (typeof window.appendInexistentScriptButtons === 'function') {
        window.appendInexistentScriptButtons(descriptor);
        registered = true;
        registrationMethod = 'appendInexistentScriptButtons';
        return true;
      }
      registered = false;
      registrationMethod = null;
      lastError = '原生助手脚本按钮注册 API 不可用';
      directConsole('error', 'native-registration-failure', lastError);
      debugEvent('button-registration-failure', lastError, 'error');
      return false;
    } catch (error) {
      registered = false;
      registrationMethod = null;
      lastError = `原生诊断按钮注册失败：${safeMessage(error)}`;
      directConsole('error', 'native-registration-failure', lastError);
      debugEvent('button-registration-failure', lastError, 'error');
      return false;
    }
  }

  function bindButton() {
    let nextEventName = null;
    try {
      if (typeof window.getButtonEvent === 'function') nextEventName = window.getButtonEvent(BUTTON_NAME) || null;
    } catch (error) {
      lastError = `读取原生按钮事件失败：${safeMessage(error)}`;
      directConsole('error', 'native-event-binding-failure', lastError);
      debugEvent('button-event-binding-failure', lastError, 'error');
    }

    if (nextEventName && typeof window.eventOn === 'function') {
      removeLocalBindings();
      if (eventName === nextEventName && eventHandler) {
        bindingMethod = 'eventOn';
        return true;
      }
      const ownedApi = api;
      const handler = () => {
        directConsole('info', 'native-event-click');
        if (disposed || modules[KEY] !== ownedApi || api !== ownedApi || eventHandler !== handler) return false;
        return openPanel();
      };
      try {
        window.eventOn(nextEventName, handler);
      } catch (error) {
        eventName = null;
        eventHandler = null;
        bindingMethod = null;
        lastError = `绑定原生按钮事件失败：${safeMessage(error)}`;
        directConsole('error', 'native-event-binding-failure', lastError);
        debugEvent('button-event-binding-failure', lastError, 'error');
        return bindLocalButtons();
      }
      eventName = nextEventName;
      eventHandler = handler;
      bindingMethod = 'eventOn';
      return true;
    }

    eventName = null;
    eventHandler = null;
    bindingMethod = null;
    return bindLocalButtons();
  }

  function reconnect() {
    if (!ownsCurrentModule()) return false;
    const registrationReady = registerNativeButton();
    const bindingReady = bindButton();
    if (registrationReady && bindingReady) {
      lastError = '';
      return true;
    }
    if (!bindingReady && !lastError) {
      lastError = '原生按钮事件 API 不可用，且当前脚本文档中尚未找到可绑定按钮';
      directConsole('error', 'native-event-binding-failure', lastError);
      debugEvent('button-event-binding-failure', lastError, 'error');
    }
    return false;
  }

  function status() {
    return Object.freeze({
      key: KEY,
      installed: registered && bindingMethod !== null,
      registered,
      registrationMethod,
      bindingMethod,
      buttonName: BUTTON_NAME,
      eventName,
      localBindingCount: localBindings.size,
      lastError,
    });
  }

  function dispose() {
    if (disposed) return true;
    disposed = true;
    try { root.debug?.panel?.unmount?.(); } catch { /* debug disposal remains independently safe */ }
    removeLocalBindings();
    registered = false;
    registrationMethod = null;
    bindingMethod = null;
    eventName = null;
    eventHandler = null;
    try { contract.releaseGlobal(KEY, api); } catch { /* loader also releases exact ownership */ }
    if (modules[KEY] === api) delete modules[KEY];
    return true;
  }

  const api = Object.freeze({ status, reconnect, dispose });
  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
  } catch (error) {
    if (modules[KEY] === api) delete modules[KEY];
    dispose();
    throw error;
  }
  reconnect();
})();
