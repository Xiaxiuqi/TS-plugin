(() => {
  'use strict';

  const KEY = 'cryptLord.inputAdapter';
  const NATIVE_FLOOR_KEY = 'cryptLord.nativeFloor';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    if (typeof existing.status !== 'function' || typeof existing.submit !== 'function' || typeof existing.dispose !== 'function') {
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
      // Delegation remains independent from diagnostics.
    }
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({ key: KEY, phase: 'stage1-skeleton', ready: false, delegatedTo: NATIVE_FLOOR_KEY });
    },
    async submit(rawText, source) {
      debugEvent('action', 'submit-delegation-start', `委托至 ${NATIVE_FLOOR_KEY}`);
      try {
        const nativeFloor = await contract.waitGlobalInitialized(NATIVE_FLOOR_KEY, { timeoutMs: 10000 });
        const result = await nativeFloor.submitNativeTurn(rawText, source);
        debugEvent('action', 'submit-delegation-success', `已委托至 ${NATIVE_FLOOR_KEY}`);
        return result;
      } catch (error) {
        debugEvent('failure', 'submit-delegation-failure', error?.message || error, 'error');
        throw error;
      }
    },
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* idempotent cleanup */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
    debugEvent('lifecycle', 'registered', '资源已注册；提交将委托给 native-floor，不代表 bridge 已注册');
  } catch (error) {
    debugEvent('failure', 'registration-failure', error?.message || error, 'error');
    if (modules[KEY] === api) delete modules[KEY];
    throw error;
  }
})();
