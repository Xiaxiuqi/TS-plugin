(() => {
  'use strict';

  const KEY = 'cryptLord.inventoryState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const battleExp = modules['cryptLord.battleExperience'];
  if (!battleExp) throw new Error(`[${KEY}] core/battle-experience.js 尚未加载`);

  const LISTS = Object.freeze([
    '扮演法列表', '辅助能力列表', '武器列表', '衣物列表',
    '饰品列表', '封印物列表', '消耗品列表', '其他列表',
  ]);
  const GIFT_LISTS = Object.freeze(['武器列表', '衣物列表', '饰品列表', '封印物列表']);
  function giftGain(item) {
    return battleExp.giftGain(item?.序列 ?? item?.品阶 ?? item?.tier ?? item?.sequence ?? '普通');
  }
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function itemAt(list, key) {
    if (Array.isArray(list)) {
      const index = Number(key);
      return Number.isInteger(index) && index >= 0 && String(index) === String(key) ? list[index] : undefined;
    }
    return Object.hasOwn(list, key) ? list[key] : undefined;
  }
  function quantityOf(item) {
    const key = Object.hasOwn(item, '数量') ? '数量' : Object.hasOwn(item, 'quantity') ? 'quantity' : null;
    return { key, value: key ? Number(item[key]) : null };
  }
  function remove(data, selections) {
    if (!record(data?.stat_data) || !Array.isArray(selections) || !selections.length) throw new Error('请选择要删除的物品。');
    const keys = new Set();
    const validated = selections.map(selection => {
      const { listKey, itemKey, name, id, amount, expectedQuantity } = selection || {};
      if (!LISTS.includes(listKey) || typeof itemKey !== 'string' || !itemKey || itemKey === '$meta') throw new Error('物品分类或位置无效。');
      const unique = `${listKey}\0${itemKey}`;
      if (keys.has(unique)) throw new Error('同一物品不能重复选择。');
      keys.add(unique);
      const list = data.stat_data[listKey];
      if (!record(list) && !Array.isArray(list)) throw new Error('物品列表已变化，请重新打开物品栏。');
      const item = itemAt(list, itemKey);
      if (!record(item) || String(item.名称 ?? item.name ?? '') !== name ||
        (id !== undefined && item.id !== id)) throw new Error('物品列表已变化，请重新打开物品栏。');
      if (item.$强化模块安装?.模块ID) throw new Error('已安装强化模块的装备不能删除，请先卸下模块。');
      const quantity = quantityOf(item);
      if (quantity.key) {
        if (!Number.isFinite(quantity.value) || quantity.value <= 0 ||
          expectedQuantity !== quantity.value) throw new Error('物品数量已变化，请重新打开物品栏。');
        if (amount !== null && amount !== undefined &&
          (!Number.isFinite(amount) || amount <= 0 || amount > quantity.value)) throw new Error('删除数量必须大于零且不能超过现有数量。');
      } else if (amount !== null && amount !== undefined) {
        throw new Error('该物品不支持按数量删除。');
      }
      return { listKey, itemKey, quantity, amount };
    });
    const next = structuredClone(data);
    validated.sort((left, right) => {
      if (left.listKey !== right.listKey) return left.listKey < right.listKey ? -1 : 1;
      return (Number(right.itemKey) - Number(left.itemKey)) || 0;
    });
    for (const { listKey, itemKey, quantity, amount } of validated) {
      const list = next.stat_data[listKey];
      const item = itemAt(list, itemKey);
      if (quantity.key && amount != null && amount < quantity.value - 0.05) {
        item[quantity.key] = Number((quantity.value - amount).toFixed(6));
      } else if (Array.isArray(list)) {
        list.splice(Number(itemKey), 1);
      } else {
        delete list[itemKey];
      }
    }
    return { data: next, removed: validated.length };
  }
  function gift(data, selection, npcName) {
    const { listKey, itemKey, name, id } = selection || {};
    if (!record(data?.stat_data) || !GIFT_LISTS.includes(listKey) ||
      typeof itemKey !== 'string' || !itemKey || itemKey === '$meta') throw new Error('仅武器、衣物、饰品和封印物可赠予。');
    const list = data.stat_data[listKey];
    if (!record(list) && !Array.isArray(list)) throw new Error('物品列表已变化，请重新打开物品栏。');
    const item = itemAt(list, itemKey);
    if (!record(item) || !String(name || '').trim() ||
      String(item.名称 ?? item.name ?? '') !== name ||
      (id !== undefined && item.id !== id)) throw new Error('物品列表已变化，请重新打开物品栏。');
    if (item.$强化模块安装?.模块ID) throw new Error('该装备已安装强化模块，请先卸下再赠予。');
    if (typeof npcName !== 'string' || !npcName || npcName === '$meta' ||
      !record(data.npc_data) || !Object.hasOwn(data.npc_data, npcName) ||
      !record(data.npc_data[npcName])) throw new Error('目标 NPC 不存在。');
    const next = structuredClone(data);
    const targetList = next.stat_data[listKey];
    if (Array.isArray(targetList)) targetList.splice(Number(itemKey), 1);
    else delete targetList[itemKey];
    const npc = next.npc_data[npcName];
    const held = npc.持有物品;
    npc.持有物品 = typeof held === 'string' && held && held !== '未知' && held !== '无'
      ? `${held}、${name}` : name;
    const gain = giftGain(item);
    battleExp.award(npc, gain, npc.当前序列);
    return { data: next, gain, level: npc.$战斗经验等级 };
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    lists: LISTS, giftLists: GIFT_LISTS, giftGain, remove, gift,
    dispose() { try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ } if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
