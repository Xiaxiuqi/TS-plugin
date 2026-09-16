(() => {
  'use strict';

  const KEY = 'cryptLord.floatingVariableEditor';
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
      typeof existing.unmount !== 'function'
    ) {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    return;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({ key: KEY, phase: 'stage1-skeleton', ready: false, mounted: false });
    },
    isReady() {
      return false;
    },
    mount() {
      return Promise.reject(new Error('cryptLord.floatingVariableEditor.mount 尚未迁移'));
    },
    unmount() {
      return false;
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
