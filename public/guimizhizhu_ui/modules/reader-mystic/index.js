(() => {
  'use strict';
  const KEY = 'cryptLord.readerMysticUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.readerRosterState',
    className: 'crypt-lord-marionette crypt-lord-reader',
    title: '阅读者 · 秘术强化与解析学习', label: '秘术',
    lockedText: '当前有效途径不满足阅读者序列5及以上的解锁条件。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
