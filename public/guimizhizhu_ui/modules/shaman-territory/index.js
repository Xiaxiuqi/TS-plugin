(() => {
  'use strict';
  const KEY = 'cryptLord.shamanTerritoryUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.shamanTerritoryState',
    className: 'crypt-lord-marionette crypt-lord-territory',
    title: '萨满 · 领地图腾', label: '领地图腾',
    lockedText: '当前有效萨满序列9及以上才具有领地图腾资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
