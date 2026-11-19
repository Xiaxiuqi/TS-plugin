(() => {
  'use strict';
  const KEY = 'cryptLord.marionetteUi';
  const root = window.cryptLord, modules = root.__stage1Modules;
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.marionetteState', className: 'crypt-lord-marionette',
    label: '秘偶', title: '占卜家 · 秘偶管理',
    lockedText: '占卜家有效序列5及以上解锁秘偶管理。',
  });
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
