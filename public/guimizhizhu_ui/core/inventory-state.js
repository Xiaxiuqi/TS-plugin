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
    '饰品列表', '封印物列表', '消耗品列表', '其他列表', '杂物列表',
  ]);
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const CATEGORIES = Object.freeze([
    ['扮演法', '扮演法列表'], ['辅助能力', '辅助能力列表'], ['武器', '武器列表'],
    ['衣物', '衣物列表'], ['饰品', '饰品列表'], ['封印物', '封印物列表'],
    ['消耗品', '消耗品列表'], ['杂物', '杂物列表', '其他列表'],
  ]);
  let disposed = false, epoch = 0, queue = Promise.resolve();
  const clone = value => structuredClone(value);
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  // BEGIN ORIGINAL INVENTORY RULES
  const original = {getTierOrder(tier) {
  const tierOrder = {
    普通: 1,
    非凡: 2,
    罕见: 3,
    史诗: 4,
    传说: 5,
    神话: 7,
    唯一: 10,
    旧日: 15,
    支柱: 20,

    序列9: 1,
    序列8: 2,
    序列7: 3,
    序列6: 4,
    序列5: 5,
    序列4: 6,
    序列3: 7,
    序列2: 8,
    序列1: 9,
    序列0: 10,
  };
  return tierOrder[tier] || 0;
},
sortByTier(items, getTierFn) {
  if (!Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    const tierA = getTierFn(a);
    const tierB = getTierFn(b);
    const orderA = this.getTierOrder(tierA);
    const orderB = this.getTierOrder(tierB);
    if (orderA === orderB) return 0;
    return orderB - orderA;
  });
},
pruneEmptyStackables: (itemList) => {
  if (!itemList || typeof itemList !== 'object') return itemList;

  for (const key of Object.keys(itemList)) {
    if (key === '$meta') continue;
    const item = itemList[key];
    if (!item || typeof item !== 'object') continue;
    if (!Object.prototype.hasOwnProperty.call(item, '数量')) continue;
    const qty = Number(item.数量);
    if (!Number.isNaN(qty) && qty <= 0.05) {
      delete itemList[key];
    }
  }

  return itemList;
},
detailExcluded: [
    "名称",
    "name",
    "描述",
    "description",
    "数量",
    "quantity",
    "单位",
    "unit",
    "id",
    "isEquipped",
    "$强化模块安装",
    "$物品属性同步",
    "品阶",
    "tier",
    "序列",
    "sequence",
    "等级",
    "特质",
    "trait",
    "特性",
    "途径",
    "pathway",
    "类型",
    "type",
    "种类",
    "attributes_bonus",
    "百分比加成",
    "percentage_bonus",
    "special_effects",
    "特殊效果",
    "效果",
    "副作用",
    "负面状态",
    "负面属性",
    "side_effects",
    "negative_effects",
    "伤害加成",
    "damage_bonus",
    "杀伤加成",
    "作用属性",
    "target_attribute",
    "目标属性",
    "活力",
    "灵性",
    "理智",
    "人性",
    "敏捷",
    "运气",
    "当前活力",
    "当前灵性",
    "当前理智",
    "当前人性",
    "当前敏捷",
  ]};
  // END ORIGINAL INVENTORY RULES
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
      if (!LISTS.includes(listKey) || typeof itemKey !== 'string' || !itemKey || RESERVED.has(itemKey)) throw new Error('物品分类或位置无效。');
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
      if (selection.snapshot && !same(item, selection.snapshot)) throw Error('物品内容已变化，请重新读取。');
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
    for (const listKey of new Set(validated.map(row => row.listKey))) {
      const list = next.stat_data[listKey];
      if (Array.isArray(list)) {
        for (let index = list.length - 1; index >= 0; index--) {
          if (record(list[index]) && Object.hasOwn(list[index], '数量') && Number(list[index].数量) <= 0.05)
            list.splice(index, 1);
        }
      } else {
        const candidates = Object.fromEntries(Object.entries(list).filter(([key]) => !RESERVED.has(key)));
        original.pruneEmptyStackables(candidates);
        for (const key of Object.keys(list)) if (!RESERVED.has(key) && !Object.hasOwn(candidates, key)) delete list[key];
      }
    }
    return { data: next, removed: validated.length };
  }
  function gift(data, selection, npcName) {
    const { listKey, itemKey, name, id } = selection || {};
    if (!record(data?.stat_data) || !GIFT_LISTS.includes(listKey) ||
      typeof itemKey !== 'string' || !itemKey || RESERVED.has(itemKey)) throw new Error('仅武器、衣物、饰品和封印物可赠予。');
    const list = data.stat_data[listKey];
    if (!record(list) && !Array.isArray(list)) throw new Error('物品列表已变化，请重新打开物品栏。');
    const item = itemAt(list, itemKey);
    if (!record(item) || !String(name || '').trim() ||
      String(item.名称 ?? item.name ?? '') !== name ||
      (id !== undefined && item.id !== id)) throw new Error('物品列表已变化，请重新打开物品栏。');
    if (item.$强化模块安装?.模块ID) throw new Error('该装备已安装强化模块，请先卸下再赠予。');
    if (selection.snapshot && !same(item, selection.snapshot)) throw Error('物品内容已变化，请重新读取。');
    if (typeof npcName !== 'string' || !npcName || RESERVED.has(npcName) ||
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

  function first(item, keys, fallback = '') {
    for (const key of keys) if (item?.[key] !== undefined && item[key] !== null) return item[key];
    return fallback;
  }
  function text(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
  function details(item) {
    const valid = value => value !== null && value !== undefined &&
      !(typeof value === 'string' && !value.trim()) && !(typeof value === 'number' && Number.isNaN(value));
    const excluded = new Set(original.detailExcluded);
    const extra = Object.entries(item).filter(([key, value]) =>
      !RESERVED.has(key) && !excluded.has(key) && valid(value) && typeof value !== 'object');
    const stats = [];
    for (const [name, keys] of [
      ['作用属性', ['作用属性', 'target_attribute', '目标属性']],
      ['伤害加成', ['伤害加成', 'damage_bonus', '杀伤加成']],
    ]) {
      const value = first(item, keys);
      if (valid(value)) stats.push([name, name === '伤害加成' ? `+${value}` : text(value)]);
    }
    for (const key of ['活力', '灵性', '理智', '人性', '敏捷', '运气']) {
      const value = parseFloat(item.attributes_bonus?.[key] || 0) + parseFloat(item[key] || 0);
      if (value !== 0 && !Number.isNaN(value)) stats.push([key, `${value > 0 ? '+' : ''}${value}`]);
    }
    const percentages = first(item, ['百分比加成', 'percentage_bonus'], null);
    if (record(percentages)) for (const [key, value] of Object.entries(percentages)) {
      if (!RESERVED.has(key) && valid(value)) stats.push([`${key}百分比`, `${String(value).startsWith('-') ? '' : '+'}${value}`]);
    }
    let effects = first(item, ['special_effects', '特殊效果', '效果'], []);
    if (typeof effects === 'string') effects = effects.split('\n');
    effects = Array.isArray(effects) ? effects.filter(value => valid(value) && value !== '$__META_EXTENSIBLE__$').map(text) : [];
    const sideEffect = first(item, ['副作用', '负面状态', '负面属性', 'side_effects', 'negative_effects']);
    const structured = Object.entries(item).filter(([key, value]) =>
      !RESERVED.has(key) && !excluded.has(key) && value && typeof value === 'object');
    return { extra, stats, effects, sideEffect: valid(sideEffect) ? text(sideEffect) : '', structured };
  }
  function view(data) {
    const stat = record(data?.stat_data) ? data.stat_data : {};
    return CATEGORIES.map(([label, listKey, additional]) => {
      const rows = new Map();
      const primary = stat[listKey] != null ? listKey : label;
      const secondary = additional ? [additional, '其他', '杂物'].find(key => stat[key] != null) : null;
      for (const key of [primary, secondary].filter(Boolean)) {
        const list = stat[key];
        if (!record(list) && !Array.isArray(list)) continue;
        for (const [itemKey, raw] of Object.entries(list)) {
          if (RESERVED.has(itemKey) || !record(raw) || !first(raw, ['名称', 'name'])) continue;
          // The original merges the two miscellaneous dictionaries with "other" taking precedence.
          rows.set(itemKey, { listKey: key, itemKey, raw: clone(raw) });
        }
      }
      const entries = original.sortByTier([...rows.values()], row =>
        first(row.raw, ['品阶', 'tier', '序列', 'sequence'], '普通')).flatMap(row => {
        const quantity = quantityOf(row.raw);
        if (quantity.key && (!Number.isFinite(quantity.value) || quantity.value <= 0.05)) return [];
        const item = row.listKey === '武器列表' && modules['cryptLord.savantEnhancement']
          ? modules['cryptLord.savantEnhancement'].resolveWeapon(clone(row.raw), data, row.listKey, row.itemKey) : row.raw;
        const trait = text(first(item, ['特质', 'trait', '特性']));
        const tier = first(item, ['等阶', '品阶', 'tier', '序列', 'sequence'], '无');
        const selection = { listKey: row.listKey, itemKey: row.itemKey,
          name: text(first(row.raw, ['名称', 'name'])), id: row.raw.id, snapshot: clone(row.raw) };
        return [{
          ...row, selection, name: selection.name, equipped: row.raw.isEquipped === true,
          tier: tier !== '无' && !isNaN(tier) ? `序列${tier}` : text(tier),
          trait: ['', '空', '无', 'none', 'null', 'undefined'].includes(trait.trim()) ? '' : trait,
          quantity: quantity.key ? Math.round(quantity.value * 10) / 10 : null,
          unit: text(first(item, ['单位', 'unit'])), description: text(first(item, ['描述', 'description'], '无描述')),
          pathway: text(first(item, ['途径', 'pathway'])), type: text(first(item, ['类型', 'type', '种类'])),
          details: details(item), installed: row.raw.$强化模块安装?.模块ID || null,
        }];
      });
      return { label, listKey, equipable: listKey !== '消耗品列表' && label !== '杂物', entries };
    });
  }
  function compatibility(data) {
    const stat = record(data?.stat_data) ? data.stat_data : {}, world = record(data?.world_data) ? data.world_data : {};
    const seen = new Set(), rows = [];
    for (const [label, keys] of [
      ['装备记录', ['装备', '装备栏', '封印物', '封印物品']],
      ['背包记录', ['物品栏', '背包', '物品']],
      ['材料记录', ['消耗品', '材料', '道具']],
      ['货币与资源', ['货币', '资源', '金钱', '金镑']],
    ]) for (const source of [stat, data, world]) for (const key of keys) {
      const value = source?.[key];
      if (value === undefined || value === null || value === '' || seen.has(value)) continue;
      seen.add(value); rows.push([`${label} · ${key}`, text(value)]);
    }
    return rows;
  }
  const issued = new WeakMap(), subscriptions = [];
  let generating = false;
  function check(guard, token) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw Error('物品栏操作已取消');
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const service = modules['cryptLord.nativeFloorSource'];
    const dependencies = service.writeDependencies([KEY, 'cryptLord.equipmentState', 'cryptLord.battleExperience']);
    const source = await service.read(() => { check(guard, token); return true; });
    check(guard, token);
    const latest = source.rows.at(-1), id = messageId ?? latest?.message_id;
    const target = source.rows.find(row => row.message_id === id);
    if (!target || target.role !== 'assistant') throw Error('所选 assistant 楼层不存在，不能退回旧楼层');
    const busyBattle = ['teamBattle', 'personalBattle'].some(key => {
      const battle = target.data?.cryptLord?.[key];
      return battle?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' &&
          battle.enemy?.npcKey && !battle.experienceClaimed;
    });
    const reason = generating ? '正在生成，请等待完整楼层' : target.is_hidden ? '隐藏楼层只读' :
      latest?.message_id !== target.message_id || id === 0 ? '历史楼层只读' :
      !record(target.data?.stat_data) ? '所选楼层没有有效角色状态' : busyBattle ? '请先结束并结算战斗' : '';
    const loaded = { floor: clone(target), latest: clone(latest), groups: view(target.data),
      compatibility: compatibility(target.data), editable: !reason, reason };
    issued.set(loaded, { source, token, dependencies, signature: service.signature(loaded),
      locked: dependencies['cryptLord.abilityState']?.locked?.(target.data) });
    return loaded;
  }
  function begin(baseline, operation, guard) {
    const ticket = issued.get(baseline), service = modules['cryptLord.nativeFloorSource'];
    if (!ticket || ticket.signature !== service.signature(baseline)) throw Error('物品栏读取凭据无效，请重新读取');
    const { source, token, dependencies, locked } = ticket, action = clone(operation), expected = clone(baseline);
    check(guard, token);
    if (!baseline.editable) throw Error(baseline.reason || '当前楼层不可修改');
    return service.transaction(source, expected.floor.message_id, {
      dependencies, guard: () => {
        check(guard, token);
        if (generating || dependencies['cryptLord.abilityState']?.locked?.(expected.floor.data) !== locked)
          throw Error('生成状态或能力锁定已变化，请重新读取');
        return true;
      },
      compute(before) {
        const equipment = dependencies['cryptLord.equipmentState'];
        let result;
        if (action.type === 'remove') result = remove(before, action.selections);
        else if (action.type === 'gift') result = gift(before, action.selection, action.npcName);
        else if (action.type === 'equip' || action.type === 'unequip') {
          const { listKey, itemKey, name, snapshot } = action.selection || {};
          const list = before?.stat_data?.[listKey];
          const item = (record(list) || Array.isArray(list)) && itemAt(list, itemKey);
          if (!item || !snapshot || !same(item, snapshot)) throw Error('物品内容已变化，请重新读取');
          result = { data: equipment.apply(before, listKey, itemKey, name, action.type === 'equip') };
        } else throw Error('未知物品栏操作');
        return result;
      },
      async onSaved(result) { return { ...result, loaded: await load(expected.floor.message_id, guard, token) }; },
    });
  }
  function commit(baseline, operation, guard) {
    const action = clone(operation);
    const task = queue.then(() => begin(baseline, action, guard).run());
    queue = task.catch(() => {});
    return task;
  }
  const after = modules['cryptLord.afterNativeHost'];
  const events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt || options?.dryRun || dryRun) return;
    epoch++; generating = true;
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    lists: LISTS, giftLists: GIFT_LISTS, giftGain, remove, gift, view, details, load, commit, begin,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
