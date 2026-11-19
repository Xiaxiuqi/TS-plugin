(() => {
  'use strict';
  const KEY = 'cryptLord.shamanPictureUi';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const api = modules['cryptLord.pathwayRosterWindow'].create({
    nativeTransactions: true,
    key: KEY, serviceKey: 'cryptLord.shamanPictureState',
    className: 'crypt-lord-marionette crypt-lord-picture',
    title: '萨满 · 制造画中人', label: '画中人',
    lockedText: '当前有效萨满序列5及以上才具有制造画中人的资格。',
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
