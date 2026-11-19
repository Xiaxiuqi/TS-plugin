(() => {
  'use strict';
  const KEY = 'cryptLord.scrollWorkshopUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.scrollWorkshopState',
    className: 'crypt-lord-marionette crypt-lord-scroll',
    title: '窥秘人 · 卷轴制造', label: '卷轴制造',
    lockedText: '当前有效窥秘人序列6及以上才具有卷轴制造资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
