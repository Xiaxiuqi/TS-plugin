(() => {
  'use strict';
  const KEY = 'cryptLord.workshopUi';
  const root = window.cryptLord, modules = root.__stage1Modules;
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    key: KEY, serviceKey: 'cryptLord.workshopState', className: 'crypt-lord-marionette crypt-lord-workshop',
    label: '造物', title: '通识者 · 制造工坊', narrative: true, nativeTransactions: true,
    lockedText: '通识者有效序列6及以上解锁制造工坊。',
  });
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
