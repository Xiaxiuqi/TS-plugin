(() => {
  'use strict';
  const KEY = 'cryptLord.enhancementNativeUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    key: KEY, serviceKey: 'cryptLord.enhancementState',
    className: 'crypt-lord-marionette crypt-lord-enhancement-native',
    title: '通识者 · 装备强化', label: '装备强化', nativeTransactions: true,
    lockedText: '当前有效通识者序列6及以上才具有装备强化资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
