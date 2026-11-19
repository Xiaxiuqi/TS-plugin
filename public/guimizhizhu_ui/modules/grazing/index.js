(() => {
  'use strict';
  const KEY = 'cryptLord.grazingUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.grazingRosterState',
    className: 'crypt-lord-marionette crypt-lord-grazing',
    title: '秘祈人 · 放牧名册', label: '放牧',
    lockedText: '当前有效途径不满足放牧解锁条件。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
