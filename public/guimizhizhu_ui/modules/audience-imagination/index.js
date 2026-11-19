(() => {
  'use strict';
  const KEY = 'cryptLord.audienceImaginationUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.audienceImaginationState',
    className: 'crypt-lord-marionette crypt-lord-imagination',
    title: '观众 · 空想', label: '空想',
    lockedText: '当前有效观众序列1及以上才具有空想资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
