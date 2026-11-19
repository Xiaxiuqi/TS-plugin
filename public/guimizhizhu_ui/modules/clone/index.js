(() => {
  'use strict';
  const KEY = 'cryptLord.cloneUi';
  const root = window.cryptLord, modules = root.__stage1Modules;
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.cloneState', className: 'crypt-lord-marionette crypt-lord-clone',
    label: '分身', title: '偷盗者 · 分身管理', narrative: true,
    lockedText: '偷盗者有效序列4及以上解锁分身管理。',
  });
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
