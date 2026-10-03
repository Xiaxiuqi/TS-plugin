(() => {
  'use strict';

  const KEY = 'cryptLord.equipmentState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const LISTS = Object.freeze(['武器列表', '衣物列表', '饰品列表', '封印物列表', '扮演法列表', '辅助能力列表']);
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function apply(data, listKey, itemKey, expectedName, equipped) {
    if (!LISTS.includes(listKey) || !record(data)) throw new Error('装备分类或楼层数据无效。');
    const next = typeof window.structuredClone === 'function' ? window.structuredClone(data) : JSON.parse(JSON.stringify(data));
    const list = next?.stat_data?.[listKey];
    if (!record(list) && !Array.isArray(list)) throw new Error('当前楼层没有该装备列表。');
    const index = Number(itemKey);
    const target = Array.isArray(list)
      ? Number.isInteger(index) && index >= 0 && String(index) === String(itemKey) ? list[index] : null
      : Object.hasOwn(list, itemKey) ? list[itemKey] : null;
    if (!record(target) || String(target.名称 ?? target.name ?? '') !== expectedName) throw new Error('物品列表已变化，请重新打开物品栏。');
    if (equipped) Object.values(list).forEach(item => { if (record(item)) item.isEquipped = false; });
    target.isEquipped = Boolean(equipped);
    return next;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    lists: LISTS, apply,
    dispose() { try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
