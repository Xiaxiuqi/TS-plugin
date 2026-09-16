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
    if (typeof existing.status !== 'function' || typeof existing.submit !== 'function') {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    return;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({ key: KEY, phase: 'stage1-skeleton', ready: false, delegatedTo: NATIVE_FLOOR_KEY });
    },
    async submit(rawText, source) {
      const nativeFloor = await contract.waitGlobalInitialized(NATIVE_FLOOR_KEY, { timeoutMs: 10000 });
      return nativeFloor.submitNativeTurn(rawText, source);
    },
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
  } catch (error) {
    if (modules[KEY] === api) delete modules[KEY];
    throw error;
  }
})();
