(() => {
  'use strict';
  const KEY = 'cryptLord.arbiterJurisdictionUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.arbiterJurisdictionState',
    className: 'crypt-lord-marionette crypt-lord-jurisdiction',
    title: '仲裁人 · 设定辖区', label: '辖区',
    lockedText: '当前有效仲裁人序列8及以上才具有辖区资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
