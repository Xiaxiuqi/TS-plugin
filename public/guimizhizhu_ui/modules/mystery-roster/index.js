(() => {
  'use strict';
  const KEY = 'cryptLord.mysteryRosterUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.mysteryRosterState',
    className: 'crypt-lord-marionette crypt-lord-reader crypt-lord-mystery-roster',
    title: '窥秘人 · 神秘再现', label: '神秘再现',
    lockedText: '当前有效途径不满足窥秘人序列4及以上的解锁条件。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
