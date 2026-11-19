(() => {
  'use strict';

  const KEY = 'cryptLord.itemForge';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const ATTRIBUTES = Object.freeze(['活力', '灵性', '理智', '人性', '敏捷', '运气']);
  const reference = modules['cryptLord.itemForgeReference'];
  if (!reference) throw Error('装备重铸原版规则尚未加载');
  const { sequenceBase: SEQUENCE_BASE, itemConfig: ITEM_CONFIG,
    pathwayMatrix: PATHWAY_MATRIX, traitDB: TRAIT_DB } = reference.defaults;
  const EMPTY_TRAIT = Object.freeze({ M: [0, 0, 0, 0, 0, 0], A: [0, 0, 0, 0, 0, 0], n_bias: [], p_boost: 1, n_boost: 1 });
  const defaults = () => structuredClone({ sequenceBase: SEQUENCE_BASE, itemConfig: ITEM_CONFIG,
    pathwayMatrix: PATHWAY_MATRIX, traitDB: { ...TRAIT_DB, 空: EMPTY_TRAIT } });
  let config = defaults();
  let loadedBooks = [];
  let loadVersion = 0;
  const loadedTickets = new WeakMap(), operations = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  function check(guard, token = epoch) {
    if (disposed || token !== epoch || generating || modules[KEY] !== api || guard && !guard())
      throw new DOMException('装备重铸已取消，请重新读取', 'AbortError');
  }

  async function loadConfigs(guard) {
    const version = ++loadVersion;
    const derivation = modules['cryptLord.itemDerivation'];
    if (!derivation) throw Error('原生物品派生服务尚未加载');
    const loaded = await derivation.loadRules(guard);
    if (version !== loadVersion) throw Error('装备配置读取已被新请求替代');
    config = structuredClone(loaded.rules);
    loadedBooks = [...loaded.books];
    return { books: loadedBooks.length };
  }

  function parseRank(value, rules = config) {
    return reference.create(rules).parseRank(value);
  }
  function baseValue(rank, rules = config) { return reference.create(rules).baseValue(rank); }
  function cost(item, action, rules = config) {
    const rank = parseRank(item?.序列 ?? item?.品阶 ?? item?.tier ?? item?.sequence, rules);
    const base = Math.max(10, Math.floor(Math.sqrt(baseValue(rank, rules)) * .5));
    return Math.floor(base * ({ reroll_stats: 1, add_trait: 3, reroll_trait: 2, remove_trait: .5 }[action] || 1));
  }
  function roll(item, trait = '', random = Math.random, configRules = config) {
    const rules = reference.create(configRules, random);
    const rank = parseRank(item?.序列 ?? item?.品阶 ?? item?.tier ?? item?.sequence);
    const stats = rank === 10 ? rules.mundane(item) : rules.extraordinary(baseValue(rank, configRules),
      item?.类型, item?.名称 ?? item?.name, item?.途径, trait);
    if (ATTRIBUTES.some(key => !Number.isFinite(stats[key]))) throw Error('原版重铸返回了无效属性');
    return { 特质: rank === 10 ? '' : trait, ...stats };
  }
  function isEquipped(item, stat = {}) {
    if ([item?.isEquipped, item?.已装备, item?.装备中, item?.equipped].includes(true)) return true;
    const name = String(item?.名称 ?? item?.name ?? '');
    const contains = value => value === item || typeof value === 'string' && name && value === name ||
      value && typeof value === 'object' && (String(value.名称 ?? value.name ?? '') === name && name ||
        Object.values(value).some(contains));
    return Boolean(name && (contains(stat.装备) || contains(stat.装备栏)));
  }
  function unequip(data, category, key, expectedName) {
    const next = modules['cryptLord.equipmentState'].apply(data, category, key, expectedName, false);
    const target = next.stat_data[category][key];
    for (const flag of ['已装备', '装备中', 'equipped']) if (Object.hasOwn(target, flag)) target[flag] = false;
    const clear = value => {
      if (value === expectedName || value && typeof value === 'object' &&
        String(value.名称 ?? value.name ?? '') === expectedName) return null;
      if (value && typeof value === 'object')
        for (const child of Object.keys(value)) value[child] = clear(value[child]);
      return value;
    };
    for (const slot of ['装备', '装备栏']) if (Object.hasOwn(next.stat_data, slot))
      next.stat_data[slot] = clear(next.stat_data[slot]);
    return next;
  }
  function apply(data, category, key, expectedName, action, random = Math.random, rules = config) {
    if (!['武器列表', '衣物列表', '饰品列表', '封印物列表'].includes(category) ||
      !['reroll_stats', 'add_trait', 'reroll_trait', 'remove_trait'].includes(action) ||
      ['$meta', '__proto__', 'constructor', 'prototype'].includes(String(key))) throw Error('重铸分类或操作无效');
    const next = structuredClone(data), list = next?.stat_data?.[category];
    const target = Array.isArray(list) ? Number.isInteger(Number(key)) && Number(key) >= 0 &&
      String(Number(key)) === String(key) ? list[Number(key)] : null :
      list && Object.hasOwn(list, key) ? list[key] : null;
    if (!target || typeof target !== 'object' || Array.isArray(target) ||
      String(target.名称 ?? target.name ?? '') !== expectedName) throw Error('装备列表已变化，请重新选择');
    if (target['$强化模块安装']?.模块ID) throw Error('请先卸下强化模块再重铸');
    if (isEquipped(target, next.stat_data))
      throw Error('请先卸下已装备物品');
    const points = Number(next.stat_data.剧场点数);
    const price = cost(target, action, rules);
    if (!Number.isFinite(points) || points < price) throw Error(`点数不足，需要 ${price} 点剧场点数`);
    let trait = String(target.特质 || '');
    const mundane = parseRank(target.序列 ?? target.品阶 ?? target.tier ?? target.sequence) === 10;
    if (action === 'remove_trait') trait = '';
    else if (!mundane && ['add_trait', 'reroll_trait'].includes(action)) {
      const choices = Object.keys(rules.traitDB).filter(name => !['空', '$meta', '__proto__', 'constructor', 'prototype'].includes(name));
      if (!choices.length) throw Error('特质图鉴为空');
      trait = choices[Math.floor(random() * choices.length)];
    }
    Object.assign(target, roll(target, trait, random, rules));
    const derivation = modules['cryptLord.itemDerivation'];
    if (derivation) target.$物品属性同步 = derivation.itemSignature(target);
    next.stat_data.剧场点数 = points - price;
    return next;
  }
  async function load(messageId = null, guard) {
    const token = epoch; check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const service = modules['cryptLord.nativeFloorSource'];
    const dependencies = service.writeDependencies([KEY, 'cryptLord.itemForgeReference', 'cryptLord.equipmentState']);
    const valid = () => { check(guard, token); return true; };
    const source = await service.read(valid), latest = source.rows.at(-1);
    const floor = source.rows.find(row => row.message_id === (messageId ?? latest?.message_id) && row.role === 'assistant');
    if (!floor?.data?.stat_data) throw Error('所选assistant没有有效角色状态');
    const derivation = modules['cryptLord.itemDerivation'];
    if (!derivation) throw Error('原生物品派生服务尚未加载');
    const rules = await derivation.loadRules(valid);
    await service.assert(source, valid);
    if (Object.entries(dependencies).some(([key, value]) => modules[key] !== value))
      throw Error('重铸来源或保存服务已变化，请重新读取');
    const reason = floor.is_hidden ? '隐藏楼层只读，请打开最新楼层' :
      floor.message_id === 0 || latest?.message_id !== floor.message_id ?
      '历史楼层只读，请打开最新楼层' :
      modules['cryptLord.attributeRecalculation']?.busyBattle(floor.data) ? '请先结束并结算战斗' : '';
    const loaded = { floor: structuredClone(floor), latestId: latest?.message_id ?? null,
      rules: structuredClone(rules.rules), editable: !reason, reason };
    loadedTickets.set(loaded, { token, source, service, dependencies, floor: structuredClone(floor), rules, derivation, reason,
      signature: service.signature(loaded), locked: dependencies['cryptLord.abilityState']?.locked?.(floor.data) });
    return loaded;
  }
  async function assertSource(ticket, guard) {
    try {
      const { token, source, rules, derivation, dependencies, service, locked, floor } = ticket;
      check(guard, token);
      if (Object.entries(dependencies).some(([key, value]) => modules[key] !== value))
        throw Error('原生来源、派生或保存服务已变化，请重新读取');
      if (dependencies['cryptLord.abilityState']?.locked?.(floor.data) !== locked)
        throw Error('能力锁定已变化，请重新读取');
      await service.assert(source, () => { check(guard, token); return true; });
      await derivation.assertRules(rules, () => { check(guard, token); return true; });
      check(guard, token);
    } catch (error) {
      if (error.name !== 'AbortError') error.code = 'FORGE_SOURCE_CHANGED';
      throw error;
    }
  }
  async function prepareOperation(loaded, category, key, name, action, guard, random = Math.random) {
    const ticket = loadedTickets.get(loaded);
    if (!ticket || ticket.signature !== ticket.service.signature(loaded)) throw Error('重铸来源无效或已修改，请重新读取');
    if (ticket.reason) throw Error(ticket.reason);
    await assertSource(ticket, guard);
    const before = ticket.floor.data, rules = ticket.rules.rules;
    const next = action === 'unequip' ? unequip(before, category, key, name) :
      apply(before, category, key, name, action, random, rules);
    const result = { data: structuredClone(next), action,
      cost: action === 'unequip' ? 0 : cost(before.stat_data[category][key], action, rules) };
    operations.set(result, { ticket, loaded, draft: next, guard }); return result;
  }
  function executeOperation(operation, guard, inspect = false) {
    const task = queue.then(async () => {
      const pending = operations.get(operation);
      if (!pending || pending.transaction?.status() === 'saved') throw Error('重铸结果已保存或不可确认，请重新读取');
      const { ticket, draft } = pending, { service } = ticket;
      if (!pending.transaction) {
        if (inspect) throw Error('当前无需核对保存');
        pending.saveGuard = guard;
        pending.transaction = service.transaction(ticket.source, ticket.floor.message_id, {
          dependencies: ticket.dependencies,
          guard: () => {
            check(pending.guard, ticket.token); check(pending.saveGuard, ticket.token); check(guard, ticket.token);
            if (ticket.dependencies['cryptLord.abilityState']?.locked?.(ticket.floor.data) !== ticket.locked)
              throw Error('能力锁定已变化，请重新读取');
            return true;
          },
          beforeWrite: () => assertSource(ticket, pending.saveGuard),
          compute: () => ({ data: structuredClone(draft), writeOptions: { forgeRules: ticket.rules } }),
        });
      }
      check(guard, ticket.token);
      const transaction = pending.transaction;
      const saved = await (inspect ? transaction.inspect() :
        transaction.status() === 'ready' ? transaction.run() : transaction.save());
      pending.warning = saved.warning;
      loadedTickets.delete(pending.loaded);
      return saved.data;
    });
    queue = task.catch(() => {}); return task;
  }
  const commitOperation = (operation, guard) => executeOperation(operation, guard);
  const inspectOperation = (operation, guard) => executeOperation(operation, guard, true);
  function operationStatus(operation) {
    const pending = operations.get(operation);
    return Object.freeze({ phase: pending?.transaction?.status() || (pending ? 'ready' : 'invalid'), warning: pending?.warning });
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !dryRun && !options?.dryRun && !options?.quiet_prompt) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, books: [...loadedBooks], traitCount: Object.keys(config.traitDB).length }); },
    loadConfigs, parseRank, baseValue, cost, roll, apply, isEquipped, unequip, load, prepareOperation, commitOperation, inspectOperation, operationStatus,
    traits() { return Object.keys(config.traitDB).filter(name => name !== '空'); },
    dispose() { disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); try { contract.releaseGlobal(KEY, api); } catch { /* Global may already be released during teardown. */ } if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
