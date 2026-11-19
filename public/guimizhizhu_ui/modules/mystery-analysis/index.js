(() => {
  'use strict';
  const KEY = 'cryptLord.mysteryAnalysisUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.mysteryAnalysisState',
    className: 'crypt-lord-marionette crypt-lord-analysis',
    title: '窥秘人 · 神秘解析', label: '神秘解析',
    lockedText: '真实窥秘人序列5及以上才具有神秘解析资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
