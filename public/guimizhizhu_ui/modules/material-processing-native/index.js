(() => {
  'use strict';
  const KEY = 'cryptLord.materialProcessingUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    key: KEY, serviceKey: 'cryptLord.materialProcessingState',
    className: 'crypt-lord-marionette crypt-lord-workshop crypt-lord-material-processing',
    title: '通识者 · 材料加工', label: '材料加工', nativeTransactions: true,
    lockedText: '当前有效通识者序列6及以上才具有材料加工资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
