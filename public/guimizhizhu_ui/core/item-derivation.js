(() => {
  'use strict';
  const KEY = 'cryptLord.itemDerivation', root = window.cryptLord, contract = root?.contract, modules = root?.__stage1Modules;
  if (!contract || !modules) throw Error('物品派生契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const forge = modules['cryptLord.itemForgeReference'], reference = modules['cryptLord.itemDerivationReference'];
  if (!forge || !reference) throw Error('原版物品规则尚未加载');
  const STATS = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];
  const EQUIPMENT = ['武器列表', '衣物列表', '饰品列表', '封印物列表'];
  const METHODS = ['扮演法列表', '辅助能力列表'];
  const LISTS = [...EQUIPMENT, ...METHODS, '消耗品列表', '其他列表', '非凡特性列表', '人物关系列表', '序列能力列表'];
  const CONFIGS = { 序列基准: 'sequenceBase', 物品参数: 'itemConfig', 途径矩阵: 'pathwayMatrix',
    特质图鉴: 'traitDB', 消耗品配置: 'consumableConfig', 天赋加成: 'maxBonusConfig' };
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const DISPLAY = new Set(['#空想', '#放牧', '#神秘解析']);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const entries = value => value && typeof value === 'object' ? Object.entries(value).filter(([key]) => !RESERVED.has(key)) : [];
  const tickets = new WeakMap(), issued = new WeakMap(), ruleTickets = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  const seed = Math.floor(Math.random() * 4294967296);
  function defaults() {
    return clone({ ...forge.defaults, ...reference.defaults, traitDB: { ...forge.defaults.traitDB,
      空: { M: [0, 0, 0, 0, 0, 0], A: [0, 0, 0, 0, 0, 0], n_bias: [], p_boost: 1, n_boost: 1 } } });
  }
  function validateRules(rules) {
    for (const kind of Object.values(CONFIGS)) if (!record(rules[kind])) throw Error(`物品规则${kind}须为字典`);
    const six = (values, negative = false) => Array.isArray(values) && values.length === 6 &&
      values.every(value => Number.isFinite(value) && (negative || value >= 0));
    for (const [, value] of entries(rules.sequenceBase)) if (!Number.isFinite(value) || value < 0) throw Error('序列基准无效');
    for (const [, value] of entries(rules.maxBonusConfig)) if (!Number.isFinite(value) || value < 0) throw Error('天赋加成上限无效');
    for (const [, value] of entries(rules.itemConfig))
      if (!record(value) || !six(value.pW) || !value.pW.some(n => n > 0) || !['p', 'n'].every(key =>
        Array.isArray(value[key]) && value[key].length === 2 && value[key].every(n => Number.isFinite(n) && n >= 0) &&
        value[key][0] <= value[key][1])) throw Error('物品参数无效');
    for (const kind of ['武器', '衣物', '饰品', '封印物']) if (!rules.itemConfig[kind]) throw Error(`缺少${kind}物品参数`);
    for (const [, value] of entries(rules.pathwayMatrix)) if (!six(value) || !value.some(n => n > 0)) throw Error('途径矩阵无效');
    for (const [, value] of entries(rules.traitDB))
      if (!record(value) || !six(value.M, true) || !six(value.A, true) || !Array.isArray(value.n_bias) ||
        !value.n_bias.every(n => Number.isInteger(n) && n >= 0 && n < 6) ||
        ![value.p_boost, value.n_boost].every(n => Number.isFinite(n) && n > 0)) throw Error('装备特质图鉴无效');
    if (!rules.traitDB.空) throw Error('缺少空特质配置');
    for (const [name, value] of entries(rules.consumableConfig)) {
      if (name === 'avgAttrByRank') {
        if (!record(value) || entries(value).some(([, row]) => !record(row) ||
          STATS.some(key => !Number.isFinite(row[key]) || row[key] < 0))) throw Error('消耗品序列均值无效');
      } else if (!record(value) || ![value.powerRatio, value.costRatio].every(n => Number.isFinite(n) && n >= 0) ||
        !STATS.includes(value.defaultCost)) throw Error(`消耗品「${name}」配置无效`);
    }
    return rules;
  }
  function signature(item) {
    return JSON.stringify(['名称', '序列', '类型', '途径', '特质', '效果', '作用属性', '伤害加成', ...STATS].map(key => item[key] ?? null));
  }
  function randomFor(list, key, item) {
    let state = seed;
    for (const char of JSON.stringify([list, key, item.名称, item.序列, item.类型, item.途径, item.效果, item.作用属性]))
      state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }
  function settle(data, rules = defaults(), randomFactory = randomFor) {
    validateRules(rules);
    const next = clone(data), stat = next?.stat_data, reports = [];
    if (!record(stat)) return { data: next, reports, skipped: true };
    for (const listKey of LISTS) {
      const list = stat[listKey];
      if (list === undefined || list === null) continue;
      if (listKey === '序列能力列表') {
        const normalized = modules['cryptLord.abilityState'].normalizeRecord(list);
        if (!same(list, normalized)) {
          stat[listKey] = normalized;
          reports.push({ list: listKey, name: '旧版能力分组与字段兼容', before: clone(list), after: clone(normalized) });
        }
        continue;
      }
      if (!record(list) && !Array.isArray(list)) throw Error(`${listKey}格式异常，未覆盖`);
      for (const [key, item] of entries(list)) {
        if (!record(item)) throw Error(`${listKey}「${key}」不是有效条目`);
        if (listKey === '辅助能力列表' && DISPLAY.has(key)) continue;
        const before = clone(item), random = randomFactory(listKey, key, item), engine = reference.create(rules, random);
        if (EQUIPMENT.includes(listKey) || METHODS.includes(listKey)) {
          item.isEquipped ??= false;
          if (typeof item.isEquipped !== 'boolean') throw Error(`${listKey}「${key}」装备标记无效`);
        }
        if (EQUIPMENT.includes(listKey) || listKey === '消耗品列表') {
          for (const attr of [...STATS, '伤害加成']) if (item[attr] !== undefined) {
            if (item[attr] === null || !['number', 'string'].includes(typeof item[attr]) || !Number.isFinite(Number(item[attr])))
              throw Error(`${listKey}「${key}」的${attr}无效`);
            item[attr] = Number(item[attr]);
          }
        }
        if (['消耗品列表', '其他列表'].includes(listKey) && item.数量 !== undefined) {
          if (item.数量 === null || !['number', 'string'].includes(typeof item.数量) || !Number.isFinite(Number(item.数量)))
            throw Error(`${listKey}「${key}」数量无效`);
          item.数量 = Number(item.数量);
        }
        if (EQUIPMENT.includes(listKey)) {
          item.名称 ??= item.name ?? '未命名装备'; item.序列 ??= item.sequence ?? item.tier ?? '普通';
          for (const field of ['级别', '编号', '序列']) if (item[field] !== undefined && typeof item[field] !== 'string')
            throw Error(`${item.名称}的${field}须为文本`);
          engine.sealed(item);
          const protectedItem = item.$强化模块安装?.模块ID;
          const synchronized = item.$物品属性同步 === signature(item);
          if (!protectedItem && !synchronized && STATS.some(attr => !Number(item[attr]))) {
            const model = forge.create(rules, random), rank = model.parseRank(item.序列);
            if (rank === 10) { item.特质 = ''; Object.assign(item, model.mundane(item)); }
            else {
              if (!item.特质) {
                const traits = Object.keys(rules.traitDB).filter(name => !RESERVED.has(name) && name !== '空');
                item.特质 = random() < .2 && traits.length ? traits[Math.floor(random() * traits.length)] : '';
              }
              Object.assign(item, model.extraordinary(model.baseValue(rank), item.类型 || '', item.名称 || '',
                item.途径 || '', item.特质 || ''));
            }
            // Persist the result identity so legitimate zero attributes do not reroll on unrelated saves or reloads.
            item.$物品属性同步 = signature(item);
          }
          for (const attr of STATS) if (item[attr] !== undefined && !Number.isFinite(Number(item[attr])))
            throw Error(`${item.名称}的${attr}无效`);
        } else if (listKey === '消耗品列表' && item.$卷轴制造 !== true) {
          const hasStats = STATS.some(attr => item[attr] !== undefined && Number(item[attr]) !== 0) || Number(item.伤害加成);
          if (!hasStats && item.$物品属性同步 !== signature(item)) {
            const result = engine.consumable(rules.sequenceBase[String(engine.rank(item.序列 ?? item.sequence ?? '普通'))] || 200,
              item.类型 || '', item.效果 || '', item.作用属性 || '');
            Object.assign(item, result.attributes);
            if (result.damageBonus !== undefined) {
              item.伤害加成 = result.damageBonus;
              item.描述 = `${item.描述 || ''} (机制：消耗自身属性发动，在对抗判定中获得 +${result.damageBonus} 点伤害加成)`.trim();
            }
            item.$物品属性同步 = signature(item);
          }
          for (const attr of [...STATS, '伤害加成']) if (item[attr] !== undefined && !Number.isFinite(Number(item[attr])))
            throw Error(`消耗品「${key}」的${attr}无效`);
        } else if (METHODS.includes(listKey)) {
          if (record(item.百分比加成)) item.百分比加成 = engine.bonus(item.百分比加成, item.序列, '扮演法');
        } else if (listKey === '非凡特性列表') {
          let bonus = item.百分比加成;
          if (['string', 'number'].includes(typeof bonus)) bonus = { 全部属性: String(bonus) };
          if (!record(bonus) || !entries(bonus).some(([, value]) => value !== undefined && value !== '' && value !== null))
            bonus = { 全部属性: `${engine.trait(item.序列, item.等阶 ?? '普通')}%` };
          item.百分比加成 = bonus;
        } else if (listKey === '人物关系列表') {
          const affinity = Number(item.好感度 ?? 0);
          if (!Number.isFinite(affinity)) throw Error(`人物「${key}」好感度无效`);
          item.好感度 = Math.max(-200, Math.min(200, affinity));
          item['对<User>的态度'] = engine.attitude(item.好感度);
        }
        if (!same(before, item)) reports.push({ list: listKey, key, name: String(item.名称 ?? item.name ?? key), before, after: clone(item) });
      }
      const beforeConstraints = clone(list), engine = reference.create(rules);
      if (EQUIPMENT.includes(listKey) || METHODS.includes(listKey))
        engine.single(Object.fromEntries(entries(list).filter(([key]) => listKey !== '辅助能力列表' || !DISPLAY.has(key))));
      if (['消耗品列表', '其他列表'].includes(listKey)) {
        if (Array.isArray(list)) {
          for (let index = list.length - 1; index >= 0; index--)
            if (record(list[index]) && Object.hasOwn(list[index], '数量') && Number(list[index].数量) <= .05) list.splice(index, 1);
        } else {
          const candidates = Object.fromEntries(entries(list)); engine.prune(candidates);
          for (const [key] of entries(list)) if (!Object.hasOwn(candidates, key)) delete list[key];
        }
      }
      if (!same(beforeConstraints, list)) reports.push({ list: listKey, name: '装备冲突或空数量清理', before: beforeConstraints, after: clone(list) });
    }
    return { data: next, reports, changed: !same(data, next) };
  }
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw new DOMException('物品校验已取消', 'AbortError');
  }
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  async function ruleSource(host, guard, token) {
    const binding = clone(await host.getCharWorldbookNames('current')); check(guard, token);
    const primary = binding?.primary || '1源堡';
    const names = [...new Set(['【源堡】玩家自建内容', ...(binding?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary], rules = defaults(), books = [];
    for (const name of names) {
      let list;
      try { list = await host.getWorldbook(name); }
      catch (error) {
        check(guard, token);
        if (name !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error)))
          { books.push({ name, absent: true }); continue; }
        throw error;
      }
      check(guard, token);
      if (!Array.isArray(list)) throw Error(`世界书「${name}」不可读取`);
      const relevant = [];
      for (const entry of list) {
        const title = String(entry?.name || entry?.comment || '');
        const kind = Object.entries(CONFIGS).find(([label]) => title.includes(label))?.[1]; if (!kind) continue;
        relevant.push(clone(entry));
        let parsed;
        try { parsed = modules['cryptLord.abilityState'].parseWorldbookJson(entry.content); }
        catch { throw Error(`物品规则「${title}」格式损坏，未使用默认值覆盖`); }
        if (!record(parsed)) throw Error(`物品规则「${title}」须为字典`);
        rules[kind] = { ...rules[kind], ...Object.fromEntries(entries(parsed)) };
      }
      books.push({ name, entries: relevant });
    }
    validateRules(rules); return { binding, books, rules };
  }
  async function prepare(data, guard) {
    const token = epoch; check(guard, token);
    const input = clone(data);
    if (!record(input?.stat_data) || !LISTS.some(key => input.stat_data[key] != null) ||
      modules['cryptLord.attributeRecalculation']?.busyBattle(input)) {
      const result = { data: input, reports: [], skipped: true }; tickets.set(result, { token }); return result;
    }
    const host = await hostApi(); check(guard, token);
    const source = await ruleSource(host, guard, token), result = settle(input, source.rules);
    if (!same(source, await ruleSource(host, guard, token))) throw Error('物品规则读取期间已变化');
    tickets.set(result, { token, source: clone(source) }); return result;
  }
  async function loadRules(guard) {
    const token = epoch; check(guard, token);
    if (generating) throw Error('正在生成，等待完整楼层');
    const host = await hostApi(), source = await ruleSource(host, guard, token);
    if (!same(source, await ruleSource(host, guard, token))) throw Error('物品规则读取期间已变化');
    const result = { rules: clone(source.rules), books: source.books.map(book => book.name) };
    ruleTickets.set(result, { token, source }); return result;
  }
  async function assertRules(result, guard) {
    const ticket = ruleTickets.get(result);
    if (!ticket || !same(result.rules, ticket.source.rules)) throw Error('物品规则凭据无效');
    check(guard, ticket.token);
    if (!same(ticket.source, await ruleSource(await hostApi(), guard, ticket.token))) throw Error('物品规则已变化，未写入');
    check(guard, ticket.token);
  }
  async function assertPrepared(result, guard) {
    const ticket = tickets.get(result); if (!ticket) throw Error('物品校验来源无效');
    check(guard, ticket.token); if (result.skipped) return;
    if (!same(ticket.source, await ruleSource(await hostApi(), guard, ticket.token))) throw Error('物品规则已变化，未写入');
    check(guard, ticket.token);
  }
  async function load(messageId, guard, token = epoch) {
    check(guard, token);
    if (!Number.isInteger(messageId) || messageId < 0) throw Error('楼层编号无效');
    if (generating) throw Error('正在生成，等待完整楼层');
    const service = modules['cryptLord.nativeFloorSource'], dependencies = service.writeDependencies([KEY]);
    const source = await service.read(() => { check(guard, token); return true; });
    const floor = source.rows.find(row => row.message_id === messageId && row.role === 'assistant' && !row.is_hidden);
    if (!floor || !record(floor.data?.stat_data)) throw Error('所选assistant没有有效角色状态');
    const result = await prepare(floor.data, guard); check(guard, token);
    const pool = modules['cryptLord.attributeRecalculation']?.needsPool(result.data) ?
      await modules['cryptLord.abilityState'].loadPool(guard) : undefined;
    modules['cryptLord.attributeRecalculation']?.apply(result.data, pool);
    await assertPrepared(result, guard); check(guard, token);
    if (pool) await dependencies['cryptLord.abilityState'].assertPool(pool, guard);
    await service.assert(source, () => { check(guard, token); return true; });
    const reason = floor.message_id === 0 || source.rows.at(-1)?.message_id !== floor.message_id ? '历史楼层只读' :
      modules['cryptLord.attributeRecalculation']?.busyBattle(floor.data) ? '请先结束并结算战斗' : '';
    const loaded = { floor: clone(floor), reports: clone(result.reports), changed: !same(floor.data, result.data), editable: !reason, reason };
    issued.set(loaded, { token, source, result, floor: clone(floor), pool, dependencies,
      signature: service.signature(loaded), draft: clone(result.data), editable: !reason,
      lock: dependencies['cryptLord.abilityState']?.locked?.(floor.data) });
    return loaded;
  }
  async function adopt(target, result, guard) {
    const ticket = tickets.get(result); if (!ticket || !ticket.draft) throw Error('物品修正来源不可确认');
    await assertPrepared(result, guard);
    if (!same(target, ticket.target)) throw Error('物品修正目标已变化');
    return { data: clone(ticket.draft), itemDerivation: result };
  }
  function begin(loaded, guard) {
    const baseline = issued.get(loaded), service = modules['cryptLord.nativeFloorSource'];
    if (!baseline || baseline.signature !== service.signature(loaded)) throw Error('请先读取有效物品校验结果');
    const { token, source, result, dependencies } = baseline; check(guard, token);
    if (!baseline.editable) throw Error(loaded.reason || '当前楼层只读');
    return service.transaction(source, baseline.floor.message_id, {
      dependencies, guard: () => {
        check(guard, token);
        if (generating || dependencies['cryptLord.abilityState']?.locked?.(baseline.floor.data) !== baseline.lock)
          throw Error('生成状态或能力锁定已变化，请重新读取');
        return true;
      },
      async beforeWrite() {
        await assertPrepared(result, guard);
        if (baseline.pool !== undefined) await dependencies['cryptLord.abilityState'].assertPool(baseline.pool, guard);
        check(guard, token);
      },
      compute() {
        const ticket = tickets.get(result);
        ticket.target = clone(baseline.floor.data); ticket.draft = clone(baseline.draft);
        return { data: clone(baseline.draft), writeOptions: { itemOnly: true, itemPrepared: result } };
      },
      async onSaved(saved) { return { ...saved, loaded: await load(baseline.floor.message_id, guard, token) }; },
    });
  }
  function commit(loaded, guard) {
    const task = queue.then(() => begin(loaded, guard).run());
    queue = task.catch(() => {}); return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !dryRun && !options?.dryRun && !options?.quiet_prompt) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean))) bind(event, () => { generating = false; });
  const api = Object.freeze({ status: () => ({ ready: !disposed }), defaults, validateRules, settle, prepare, assertPrepared,
    load, commit, begin, adopt, loadRules, assertRules, itemSignature: signature, signature: result => clone(tickets.get(result)?.source),
    dispose() { disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api); delete modules[KEY]; } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
