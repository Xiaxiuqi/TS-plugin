(() => {
  'use strict';

  const KEY = 'cryptLord.nativeSettlement';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function equal(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left).filter(key => key !== 'cryptLord').sort();
    const rightKeys = Object.keys(right).filter(key => key !== 'cryptLord').sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key, index) => key === rightKeys[index] && equal(left[key], right[key]));
  }

  function apply(data, previousData) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return Object.freeze({ data, changed: false, applied: Object.freeze([]) });
    }
    if (equal(previousData || {}, data)) {
      return Object.freeze({ data, changed: false, applied: Object.freeze([]) });
    }

    const applied = [];
    try {
      if (typeof window.TimePassageEngine?.applyTimePassage === 'function') {
        window.TimePassageEngine.applyTimePassage(data);
        applied.push('time-passage');
      }
    } catch (error) {
      console.warn(`[${KEY}] 时间流逝结算失败，已保留本回合状态`, error);
    }
    try {
      if (typeof window.checkCollectionGrowth === 'function') {
        window.checkCollectionGrowth(data);
        applied.push('collection-growth');
      }
    } catch (error) {
      console.warn(`[${KEY}] 变量增殖提醒失败，已保留本回合状态`, error);
    }
    return Object.freeze({ data, changed: true, applied: Object.freeze(applied) });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, handlers: Object.freeze(['time-passage', 'collection-growth']) }); },
    apply,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
