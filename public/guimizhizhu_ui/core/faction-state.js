(() => {
  'use strict';
  const KEY = 'cryptLord.factionState';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw Error('势力规则依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0;
  const tickets = new WeakMap(), nativeTickets = new WeakMap(), subscriptions = [];
  const canonical = value => {
    const type = Object.prototype.toString.call(value);
    if (type === '[object Date]') return ['Date', Number.isNaN(value.getTime()) ? 'invalid' : value.toISOString()];
    if (type === '[object RegExp]') return ['RegExp', value.source, value.flags];
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  const signature = value => JSON.stringify(canonical(value));
  function scope() {
    const host = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      script: signature(host?.scriptVariableOptions?.() ?? host?.getScriptId?.()),
      chat: surface?.window?.SillyTavern?.getCurrentChatId?.(), industry: modules['cryptLord.industryState'],
      domain: modules['cryptLord.domainState'] };
  }
  function check(identity, guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard?.() === false)
      throw Error('势力读取已取消，请重新读取');
    const current = scope();
    if (identity && Object.keys(identity).some(key => identity[key] !== current[key]))
      throw Error('势力宿主、聊天、脚本或规则服务已变化，请重新读取');
    return true;
  }
  const TYPES = ['农产品', '工业品', '服务'];
  const BRANCHES = ['海军', '陆军', '空军'];
  const POPULATION_TYPES = new Set(['世俗领地', '教会教区', '地下势力实控区']);
  const DEFAULT_ANCHORS = {
    支柱: 5000000, 旧日: 3000000, '0': 1000000, '0.1': 1000000,
    '0.3': 400000, '0.4': 400000, '0.5': 400000, '0.8': 200000,
    '0.9': 200000, '1': 200000, '2': 100000, '3': 50000, '4': 10000,
  };
  // Original factionConfig, ordered pop/c1/c2/c3/c4/c5 for each goods tier.
  const COEFFICIENTS = {
    农产品: [[1,2,2,5,0,0],[.1,.2,.5,4,8,0],[0,0,0,1,5,20],[0,0,0,0,2,10],[0,0,0,0,0,3]],
    工业品: [[.5,1,2,10,0,0],[0,.2,1,10,30,50],[0,0,0,2,5,20],[0,0,0,0,1,5],[0,0,0,0,0,5]],
    服务: [[.5,1,2,3,0,0],[.1,.4,1,3,2,0],[0,0,0,1,10,20],[0,0,0,0,2,10],[0,0,0,0,0,10]],
  };
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => structuredClone(value);
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const entries = (value, omit = []) => record(value) || Array.isArray(value)
    ? Object.entries(value).filter(([key, item]) =>
      !['$meta', '__proto__', 'constructor', 'prototype', ...omit].includes(key) && record(item)) : [];
  function defaults() {
    return { anchorDemands: { ...DEFAULT_ANCHORS }, productivityDemands: Object.fromEntries(
      TYPES.map(type => [type, Object.fromEntries(COEFFICIENTS[type].map((row, i) =>
        [`${i + 1}级`, Object.fromEntries(row.map((value, j) => [j ? `c${j}` : 'pop', value]))]))]),
    ) };
  }
  function merge(config, patch) {
    if (!record(patch)) throw Error('势力配置必须是对象');
    if (Object.hasOwn(patch, 'anchorDemands')) {
      if (!record(patch.anchorDemands)) throw Error('锚需求表必须是对象');
      const table = {};
      for (const [key, value] of Object.entries(patch.anchorDemands)) {
        if (!['支柱', '旧日'].includes(key) && !/^\d+(?:\.\d+)?$/.test(key)) continue;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw Error('锚需求必须为非负有限数');
        table[key] = value;
      }
      config.anchorDemands = table;
    }
    if (Object.hasOwn(patch, 'productivityDemands')) {
      if (!record(patch.productivityDemands)) throw Error('生产力需求表必须是对象');
      const table = {};
      for (const type of TYPES) for (let i = 1; i <= 5; i++) {
        const row = patch.productivityDemands?.[type]?.[`${i}级`];
        if (!record(row)) continue;
        const clean = {};
        for (const key of ['pop', 'c1', 'c2', 'c3', 'c4', 'c5']) {
          if (!Object.hasOwn(row, key)) continue;
          const value = row[key];
          if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw Error('生产力系数必须为非负有限数');
          clean[key] = value;
        }
        (table[type] ||= {})[`${i}级`] = clean;
      }
      // The original loader replaces each top-level group, rather than merging its leaves.
      config.productivityDemands = table;
    }
    return config;
  }
  async function load(guard) {
    const token = epoch, identity = scope(), valid = () => check(identity, guard, token);
    valid();
    const config = defaults(), warnings = [];
    let accepted = 0;
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const industry = modules['cryptLord.industryState'];
    valid();
    const bound = clone(await host.getCharWorldbookNames('current'));
    valid();
    if (!record(bound) || bound.primary != null && typeof bound.primary !== 'string' ||
      bound.additional != null && (!Array.isArray(bound.additional) ||
        bound.additional.some(name => typeof name !== 'string' || !name.trim())))
      throw Error('势力世界书绑定格式无效');
    const primary = bound?.primary || '1源堡';
    const names = [...new Set(['【源堡】玩家自建内容', ...(bound?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary], revision = [];
    const selected = new Map();
    for (const book of names) {
      valid();
      let rows;
      try { rows = await host.getWorldbook(book); }
      catch (error) {
        if (book !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) {
          revision.push([book, null]); continue;
        }
        throw error;
      }
      valid();
      if (!Array.isArray(rows)) throw Error(`世界书「${book}」不可读取`);
      const relevant = rows.filter(entry => {
        const name = String(entry?.name || entry?.comment || '').trim();
        return name.startsWith('【配置') && name.includes('势力配置');
      });
      revision.push([book, clone(relevant)]);
      for (const entry of relevant) selected.set(String(entry.name || entry.comment).trim(), { book, entry });
    }
    for (const { book, entry } of selected.values()) {
      try {
        const staged = merge(clone(config), industry.parseWorldbookJson(entry.content));
        Object.assign(config, staged);
        accepted++;
      } catch (error) { warnings.push(`${book} / ${entry.name || entry.comment}: ${error.message}`); }
    }
    valid();
    if (signature(bound) !== signature(await host.getCharWorldbookNames('current')))
      throw Error('势力世界书绑定已变化，请重新读取');
    for (const [book, expected] of revision) {
      let rows;
      try { rows = await host.getWorldbook(book); }
      catch (error) {
        if (expected === null && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) {
          valid(); continue;
        }
        throw error;
      }
      valid();
      if (!Array.isArray(rows)) throw Error(`世界书「${book}」不可读取`);
      const relevant = rows.filter(entry => {
        const name = String(entry?.name || entry?.comment || '').trim();
        return name.startsWith('【配置') && name.includes('势力配置');
      });
      if (expected === null || signature(relevant) !== signature(expected))
        throw Error('读取期间势力规则条目已变化，请重新读取');
    }
    if (signature(bound) !== signature(await host.getCharWorldbookNames('current')))
      throw Error('势力世界书绑定已变化，请重新读取');
    valid();
    const loaded = { config, source: accepted ? '世界书配置' : '默认规则', warnings,
      revision: signature({ bound, revision }) };
    tickets.set(loaded, { identity, token, signature: signature(loaded) });
    return loaded;
  }
  async function assertRules(loaded, guard) {
    const ticket = tickets.get(loaded);
    if (!ticket || ticket.signature !== signature(loaded)) throw Error('势力规则凭据无效或已修改，请重新读取');
    check(ticket.identity, guard, ticket.token);
    const fresh = await load(() => check(ticket.identity, guard, ticket.token));
    if (fresh.revision !== loaded.revision) throw Error('势力规则或绑定已变化，请重新读取');
    check(ticket.identity, guard, ticket.token);
  }
  async function loadNative(messageId = null, guard) {
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('势力楼层编号无效');
    const token = epoch, identity = scope(), reader = modules['cryptLord.nativeFloorSource'];
    const valid = () => {
      check(identity, guard, token);
      if (!reader || modules['cryptLord.nativeFloorSource'] !== reader) throw Error('势力原生楼层服务已变化');
      return true;
    };
    valid();
    const source = await reader.read(valid), latest = source.rows.at(-1);
    const floor = source.rows.find(row => row.message_id === (messageId ?? latest?.message_id) && row.role === 'assistant');
    if (!floor) throw Error('目标楼层不存在或不是 assistant');
    if (floor.is_hidden) throw Error('目标势力楼层已隐藏，不能读取');
    if (!record(floor.data?.stat_data)) throw Error('目标楼层没有势力角色状态');
    const rules = await load(valid);
    await reader.assert(source, valid);
    await assertRules(rules, valid);
    await reader.assert(source, valid);
    valid();
    const data = prepare(floor.data, rules.config), stat = data.stat_data;
    const value = ['stat_data', 'world_data']
      .flatMap(domain => ['势力', '势力数据', 'factions', 'faction'].map(key => data[domain]?.[key]))
      .find(item => item !== undefined);
    const loaded = { floor: clone(floor), latest: clone(latest), data, rules,
      rows: list(value ?? stat.势力, rules.config), reason: floor.message_id !== latest?.message_id ? '历史楼层只读' : '只读' };
    nativeTickets.set(loaded, { source, reader, valid, signature: signature(loaded), rules });
    return loaded;
  }
  async function assertNative(loaded, guard) {
    const ticket = nativeTickets.get(loaded);
    if (!ticket || ticket.signature !== signature(loaded)) throw Error('势力楼层凭据无效或已修改，请重新读取');
    const valid = () => { ticket.valid(); return guard?.() !== false; };
    await ticket.reader.assert(ticket.source, valid);
    await assertRules(ticket.rules, valid);
    await ticket.reader.assert(ticket.source, valid);
    ticket.valid();
    if (guard?.() === false) throw Error('势力读取已取消');
  }
  function anchor(sequence, config) {
    const text = String(sequence || '');
    const table = config.anchorDemands;
    if (text.includes('支柱')) return table.支柱 || 5000000;
    const match = text.match(/[0-9.]+/);
    if (text.includes('旧日侍者')) {
      const key = match ? match[0] : '2';
      return table[key] !== undefined ? table[key] : table['2'] || 100000;
    }
    if (text.includes('旧日')) return table.旧日 || 3000000;
    if (!match) return 0;
    const key = match[0], rank = Number.parseFloat(key);
    if (table[key] !== undefined) return table[key];
    return rank === 4 ? 10000 : rank === 3 ? 50000 : rank === 2 ? 100000
      : rank <= 1 && rank >= .8 ? 200000 : rank <= .5 && rank >= .3 ? 400000 : rank <= .1 ? 1000000 : 0;
  }
  function normalize(value, config = defaults()) {
    const faction = clone(value);
    if (!record(faction.实控区域)) faction.实控区域 = {};
    let population = 0, area = 0;
    const regions = entries(faction.实控区域, ['总面积', '实控区域汇总名单']);
    for (const [, region] of regions) {
      area += number(region.区域面积);
      if (!POPULATION_TYPES.has(String(region.区域类型 || '').trim())) region.区域人口 = 0;
      population += number(region.区域人口);
    }
    faction.实控区域.总面积 = area;
    faction.实控区域.实控区域汇总名单 = regions.map(([key, region]) => region.区域名 || key).join('；');
    faction.人口数量 = population;
    faction.锚的供给量 = population;
    const gods = entries(faction.直辖的半神和真神信息);
    faction.锚的需求 = gods.length ? gods.reduce((sum, [, god]) => sum + anchor(god.序列, config), 0)
      : faction.锚的需求 === undefined ? '' : faction.锚的需求;
    const counts = [population, 0, 0, 0, 0, 0];
    for (const branch of BRANCHES) for (const [, unit] of entries(faction.世俗军队?.[branch])) {
      const level = Number.parseInt(unit.部队精锐等级 || '1级');
      if (level >= 1 && level <= 5) counts[level] += number(unit.部队数量);
    }
    const demand = record(faction.势力生产力总需求) ? faction.势力生产力总需求 : {};
    for (const type of TYPES) for (let level = 1; level <= 5; level++) {
      const row = config.productivityDemands?.[type]?.[`${level}级`] || {};
      demand[`${level}级${type}需求`] = Math.round(counts.reduce((sum, amount, index) =>
        sum + amount * number(row[index ? `c${index}` : 'pop']), 0));
    }
    faction.势力生产力总需求 = demand;
    return faction;
  }
  function prepare(data, config = defaults()) {
    const next = clone(data || {});
    if (!record(next.stat_data)) return next;
    const domain = next.stat_data.领地;
    if (record(domain) && modules['cryptLord.domainState']) {
      if (!record(next.stat_data.势力)) next.stat_data.势力 = {};
      modules['cryptLord.domainState'].ensureDomain(domain);
      modules['cryptLord.domainState'].syncProjection(next);
    }
    for (const [key, faction] of entries(next.stat_data.势力)) next.stat_data.势力[key] = normalize(faction, config);
    return next;
  }
  function apply(data, config = defaults()) {
    if (!record(data?.stat_data)) return false;
    const next = prepare(data, config);
    if (JSON.stringify(next.stat_data.势力) === JSON.stringify(data.stat_data.势力)) return false;
    data.stat_data.势力 = next.stat_data.势力;
    return true;
  }
  function list(value, config = defaults()) {
    return entries(value).map(([key, raw]) => {
      const faction = normalize(raw, config);
      const regions = entries(faction.实控区域, ['总面积', '实控区域汇总名单']);
      return { key, faction, regions, gods: entries(faction.直辖的半神和真神信息),
        armies: BRANCHES.map(branch => ({ branch, units: entries(faction.世俗军队?.[branch]) })),
        population: !regions.length ? '没有实控区'
          : !regions.some(([, region]) => POPULATION_TYPES.has(String(region.区域类型 || '').trim()))
            ? '现有实控区类型都不适用人口概念' : faction.人口数量 };
    });
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed }), defaults, load, assertRules, loadNative, assertNative, normalize, prepare, apply, list,
    hasPopulation: type => POPULATION_TYPES.has(String(type || '').trim()),
    dispose() {
      disposed = true; epoch++; subscriptions.splice(0).forEach(item => item?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents?.() || {};
  if (events.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; }));
})();
