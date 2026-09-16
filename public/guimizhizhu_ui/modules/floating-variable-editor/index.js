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
      // Stub behavior must not depend on diagnostics.
    }
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({ key: KEY, phase: 'stage1-skeleton', ready: false, mounted: false });
    },
    isReady() {
      return false;
    },
    mount() {
      debugEvent('refusal', 'mount-refused', '浮动变量编辑器尚未迁移，未执行挂载', 'warn');
      return Promise.reject(new Error('cryptLord.floatingVariableEditor.mount 尚未迁移'));
    },
    unmount() {
      debugEvent('refusal', 'unmount-not-ready', '模块未挂载，无可卸载内容', 'warn');
      return false;
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
    debugEvent('lifecycle', 'registered-not-ready', '资源已注册；业务功能未挂载，浮动变量编辑器尚未迁移', 'warn');
  } catch (error) {
    debugEvent('failure', 'registration-failure', error?.message || error, 'error');
    if (modules[KEY] === api) delete modules[KEY];
    throw error;
  }
})();
