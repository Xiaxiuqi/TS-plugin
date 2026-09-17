(() => {
  'use strict';

  const KEY = 'cryptLord.inputAdapter';
  const NATIVE_FLOOR_KEY = 'cryptLord.nativeFloor';
  const LIFECYCLE_KEY = 'cryptLord.lifecycle';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }

  const SELECTORS = Object.freeze({
    nativeTextarea: '#send_textarea',
    nativeSendButton: '#send_but',
    nativeForm: '#send_form',
    gameTextarea: '#quick-send-input',
    gameSendButton: '#btn-quick-send',
  });
  const state = { scope: null, host: null, observer: null, installing: null, submitting: false, disposed: false, ready: false, lastFailure: '' };

  function debugEvent(category, action, details, level = 'info') {
    try { root.debug?.event?.(category, KEY, action, details, level); } catch { /* Diagnostics are optional. */ }
  }

  function notify(message, level = 'warning') {
    const toast = window.toastr?.[level];
    if (typeof toast === 'function') toast(message);
    else console[level === 'error' ? 'error' : 'warn'](`[${KEY}] ${message}`);
  }

  function resolveHost() {
    const candidates = [window];
    for (const name of ['parent', 'top']) {
      try { if (window[name] && !candidates.includes(window[name])) candidates.push(window[name]); } catch { /* cross-origin */ }
    }
    return candidates.reduce((best, candidate) => {
      try {
        const document = candidate?.document;
        if (!document?.body || !document?.documentElement) return best;
        const score = 1 + (candidate.TavernHelper ? 6 : 0) + (candidate.SillyTavern ? 8 : 0) + (document.querySelector(SELECTORS.nativeTextarea) ? 12 : 0);
        return !best || score > best.score ? { window: candidate, document, score } : best;
      } catch { return best; }
    }, null);
  }

  function inputFor(source) {
    if (!state.host) return null;
    return state.host.document.querySelector(source === 'game-shell' ? SELECTORS.gameTextarea : SELECTORS.nativeTextarea);
  }

  function setInputText(rawText, source = 'sillytavern-native') {
    if (state.disposed) throw new Error(`[${KEY}] 模块已释放`);
    const input = inputFor(source);
    if (!input) throw new Error(`未找到输入控件 ${source === 'game-shell' ? SELECTORS.gameTextarea : SELECTORS.nativeTextarea}`);
    input.value = String(rawText ?? '');
    input.dispatchEvent(new state.host.window.Event('input', { bubbles: true }));
    input.focus?.();
    debugEvent('action', 'input-filled', `source=${source}`);
    return true;
  }

  async function submit(rawText, source = 'external') {
    if (state.disposed) throw new Error(`[${KEY}] 模块已释放`);
    if (state.submitting) throw new Error(`[${KEY}] 上一条行动仍在处理中`);
    const text = String(rawText ?? '').trim();
    if (!text) {
      notify('请输入行动后再发送。');
      return false;
    }
    state.submitting = true;
    try {
      const nativeFloor = await contract.waitGlobalInitialized(NATIVE_FLOOR_KEY, { timeoutMs: 10000 });
      const result = await nativeFloor.submitNativeTurn(text, { source });
      debugEvent('action', 'submit-success', `source=${source}`);
      return result ?? true;
    } catch (error) {
      state.lastFailure = error?.message || String(error);
      debugEvent('failure', 'submit-failure', state.lastFailure, 'error');
      notify(`无法提交原生楼层回合：${state.lastFailure}`, 'error');
      throw error;
    } finally {
      state.submitting = false;
    }
  }

  async function submitTextarea(source) {
    const input = inputFor(source);
    if (!input) throw new Error(`未找到输入控件 ${source === 'game-shell' ? SELECTORS.gameTextarea : SELECTORS.nativeTextarea}`);
    const result = await submit(input.value, source);
    input.value = '';
    input.dispatchEvent(new state.host.window.Event('input', { bubbles: true }));
    return result;
  }

  function blockAndSubmit(event, source) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitTextarea(source).catch(() => {});
  }

  function onClick(event) {
    const target = event.target && typeof event.target.closest === 'function' ? event.target : null;
    if (target?.closest(SELECTORS.nativeSendButton)) return blockAndSubmit(event, 'sillytavern-native');
    if (target?.closest(SELECTORS.gameSendButton)) blockAndSubmit(event, 'game-shell');
  }

  function onSubmit(event) {
    if (event.target && typeof event.target.matches === 'function' && event.target.matches(SELECTORS.nativeForm)) {
      blockAndSubmit(event, 'sillytavern-native');
    }
  }

  function onKeyDown(event) {
    if (event.key !== 'Enter' || event.isComposing || event.shiftKey || event.altKey) return;
    const target = event.target && typeof event.target.matches === 'function' ? event.target : null;
    if (target?.matches(SELECTORS.nativeTextarea)) return blockAndSubmit(event, 'sillytavern-native');
    if (target?.matches(SELECTORS.gameTextarea)) blockAndSubmit(event, 'game-shell');
  }

  function refreshAvailability() {
    state.ready = Boolean(state.host?.document.querySelector(SELECTORS.nativeTextarea));
    if (!state.ready) {
      state.lastFailure = `未找到酒馆原生输入控件 ${SELECTORS.nativeTextarea}`;
      debugEvent('availability', 'native-input-missing', state.lastFailure, 'warn');
    }
    return state.ready;
  }

  async function install() {
    if (state.disposed) throw new Error(`[${KEY}] 模块已释放`);
    if (state.installing) return state.installing;
    if (state.scope) return state.ready;
    state.installing = (async () => {
      const lifecycle = await contract.waitGlobalInitialized(LIFECYCLE_KEY, { timeoutMs: 10000 });
      const host = resolveHost();
      if (!host) {
        state.lastFailure = '找不到可访问的 SillyTavern 宿主页面';
        notify(`原生楼层输入适配不可用：${state.lastFailure}`, 'error');
        return false;
      }
      state.host = host;
      state.scope = lifecycle.createScope(KEY);
      state.scope.listen(host.document, 'click', onClick, true);
      state.scope.listen(host.document, 'submit', onSubmit, true);
      state.scope.listen(host.document, 'keydown', onKeyDown, true);
      state.observer = new host.window.MutationObserver(refreshAvailability);
      state.observer.observe(host.document.documentElement, { childList: true, subtree: true });
      state.scope.addCleanup(() => state.observer?.disconnect());
      state.scope.addCleanup(() => { state.observer = null; });
      const ready = refreshAvailability();
      debugEvent('lifecycle', 'installed', `host=${host.document.URL}; ready=${ready}`);
      return ready;
    })().finally(() => { state.installing = null; });
    return state.installing;
  }

  function dispose() {
    if (state.disposed) return true;
    state.disposed = true;
    state.scope?.dispose();
    state.scope = null;
    state.host = null;
    state.ready = false;
    try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
    if (modules[KEY] === api) delete modules[KEY];
    return true;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, phase: 'native-input-adapter', ready: state.ready, submitting: state.submitting, lastFailure: state.lastFailure, selectors: SELECTORS }); },
    install,
    submit,
    submitTextarea,
    setInputText,
    dispose,
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  void install().catch(error => {
    state.lastFailure = error?.message || String(error);
    debugEvent('failure', 'install-failure', state.lastFailure, 'error');
  });
})();
