(() => {
  'use strict';

  const KEY = 'cryptLord.debugToolbar';
  const BUTTON_SELECTOR = '[data-crypt-lord-debug-toggle]';
  const PROBE_INTERVAL_MS = 500;
  const PROBE_DURATION_MS = 30000;
  const MAX_PROBES = PROBE_DURATION_MS / PROBE_INTERVAL_MS;
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    if (
      typeof existing.status !== 'function' ||
      typeof existing.reconnect !== 'function' ||
      typeof existing.dispose !== 'function'
    ) {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    existing.reconnect();
    return;
  }

  let buttonElement = null;
  let statusElement = null;
  let wrapperElement = null;
  let anchorName = null;
  let retry = 0;
  let probeTicks = 0;
  let lastError = '';
  let disposed = false;
  let probeTimer = null;
  let observer = null;
  let observerProbeTimer = null;

  function safeMessage(error) {
    return error instanceof Error ? error.message : String(error || '未知错误');
  }

  function getDebug() {
    const debug = root.debug;
    return debug && typeof debug === 'object' ? debug : null;
  }

  function debugEvent(action, details, level = 'info') {
    try {
      const debug = getDebug();
      if (typeof debug?.event === 'function') debug.event('lifecycle', KEY, action, details, level);
    } catch {
      // Toolbar behavior must not depend on diagnostics.
    }
  }

  function showFailure(error) {
    lastError = safeMessage(error);
    if (statusElement?.isConnected) statusElement.textContent = `诊断面板打开失败：${lastError}`;
    try {
      if (typeof window.toastr?.error === 'function') {
        window.toastr.error(lastError, 'Crypt Lord 诊断');
      } else {
        window.console?.error?.(`[${KEY}]`, lastError);
      }
    } catch {
      // Visible inline status remains the fallback.
    }
    debugEvent('toolbar-open-failure', lastError, 'error');
  }

  function clearStatus() {
    lastError = '';
    if (statusElement?.isConnected) statusElement.textContent = '';
  }

  function openPanel() {
    debugEvent('toolbar-open-dispatch', '用户通过输入区按钮请求打开诊断面板');
    const debug = getDebug();
    try {
      if (!debug?.panel || typeof debug.panel.mount !== 'function' || typeof debug.setEnabled !== 'function') {
        throw new Error('cryptLord.debug API 当前不可用');
      }
      const mounted = debug.panel.mount();
      debug.setEnabled(true);
      if (mounted !== true) throw new Error('调试面板挂载被宿主拒绝或缺少可用 DOM');
      clearStatus();
      debugEvent('toolbar-open-success', '用户通过输入区按钮请求打开诊断面板');
    } catch (error) {
      showFailure(error);
    }
  }

  function findAnchor() {
    const sendForm = document.querySelector?.('#send_form');
    if (sendForm?.parentNode) return { node: sendForm, parent: sendForm.parentNode, name: '#send_form' };

    const textarea = document.querySelector?.('textarea#send_textarea');
    if (textarea) {
      const container = textarea.closest?.('form') || textarea.parentNode;
      if (container?.parentNode) {
        return {
          node: container,
          parent: container.parentNode,
          name: textarea.closest?.('form') ? 'textarea#send_textarea closest form' : 'textarea#send_textarea parent',
        };
      }
    }

    const fallbackForm = document.querySelector?.('form[id^="send"]');
    if (fallbackForm?.parentNode) {
      return { node: fallbackForm, parent: fallbackForm.parentNode, name: 'form[id^="send"]' };
    }
    return null;
  }

  function removeDuplicateButtons() {
    const buttons = Array.from(document.querySelectorAll?.(BUTTON_SELECTOR) || []);
    buttons.forEach(button => {
      if (button !== buttonElement) {
        const wrapper = button.closest?.('.crypt-lord-debug-toolbar');
        (wrapper || button).remove?.();
      }
    });
  }

  function createToolbar() {
    const wrapper = document.createElement('div');
    wrapper.className = 'crypt-lord-root crypt-lord-debug-toolbar';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'crypt-lord-debug-toolbar-button';
    button.dataset.cryptLordDebugToggle = '';
    button.setAttribute('aria-label', '打开 Crypt Lord 诊断面板');
    button.title = '打开 Crypt Lord 诊断面板';
    button.textContent = '🐞 诊断';
    button.addEventListener('click', openPanel);

    const status = document.createElement('span');
    status.className = 'crypt-lord-debug-toolbar-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    wrapper.appendChild(button);
    wrapper.appendChild(status);
    wrapperElement = wrapper;
    buttonElement = button;
    statusElement = status;
    return wrapper;
  }

  function reconnect() {
    if (disposed) return false;
    if (modules[KEY] !== api) {
      dispose();
      return false;
    }

    removeDuplicateButtons();
    if (buttonElement?.isConnected && wrapperElement?.isConnected) return true;

    const anchor = findAnchor();
    if (!anchor) {
      anchorName = null;
      lastError = '未找到 SillyTavern 输入区锚点';
      return false;
    }

    try {
      const wrapper = createToolbar();
      anchor.parent.insertBefore(wrapper, anchor.node);
      anchorName = anchor.name;
      lastError = '';
      removeDuplicateButtons();
      return buttonElement?.isConnected === true;
    } catch (error) {
      anchorName = anchor.name;
      lastError = safeMessage(error);
      return false;
    }
  }

  function status() {
    return Object.freeze({
      key: KEY,
      installed: buttonElement?.isConnected === true,
      anchor: buttonElement?.isConnected ? anchorName : null,
      retry,
      lastError,
    });
  }

  function dispose() {
    if (disposed) return true;
    disposed = true;
    if (probeTimer !== null) window.clearInterval(probeTimer);
    if (observerProbeTimer !== null) window.clearTimeout(observerProbeTimer);
    observer?.disconnect?.();
    probeTimer = null;
    observerProbeTimer = null;
    observer = null;
    try {
      wrapperElement?.remove();
    } catch {
      // Best-effort host DOM cleanup.
    }
    wrapperElement = null;
    buttonElement = null;
    statusElement = null;
    anchorName = null;
    try {
      contract.releaseGlobal(KEY, api);
    } catch (error) {
      lastError = `释放全局契约失败：${safeMessage(error)}`;
      try {
        window.console?.error?.(`[${KEY}]`, lastError);
      } catch {
        // The module registry cleanup below is still safe when it owns the exact API.
      }
    }
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
  probeTimer = window.setInterval(() => {
    if (disposed || modules[KEY] !== api || probeTicks >= MAX_PROBES) {
      window.clearInterval(probeTimer);
      probeTimer = null;
      if (modules[KEY] !== api) dispose();
      return;
    }
    probeTicks += 1;
    if (!buttonElement?.isConnected) retry += 1;
    if (!buttonElement?.isConnected) reconnect();
  }, PROBE_INTERVAL_MS);

  if (typeof window.MutationObserver === 'function' && document.documentElement) {
    observer = new window.MutationObserver(() => {
      if (disposed || buttonElement?.isConnected) return;
      if (observerProbeTimer !== null) return;
      observerProbeTimer = window.setTimeout(() => {
        observerProbeTimer = null;
        reconnect();
      }, 50);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
