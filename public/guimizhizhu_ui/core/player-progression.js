(() => {
  'use strict';
  const KEY = 'cryptLord.playerProgression', root = window.cryptLord, contract = root?.contract;
  const modules = root?.__stage1Modules;
  if (!contract || !modules) throw Error('玩家成长契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const STATS = Object.freeze(['活力', '敏捷', '灵性', '理智', '人性', '运气']);
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const CONFIGS = Object.freeze({ 序列基准: 'sequenceBase', 神性: 'divinityConfig',
    能力体系配置: 'abilitySystemConfig', 能力体系映射: 'abilitySystemDB' });
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const numeric = value => ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value));
  const entries = value => Object.entries(value).filter(([key]) => !RESERVED.has(key));
  const revisions = new WeakMap(), prepared = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, queue = Promise.resolve();
  function defaults() {
    return {
      sequenceBase: { '-2': 5000000, '-1': 3000000, 0: 1200000, 1: 300000,
        2: 120000, 3: 40000, 4: 15000, 5: 6000, 6: 2500, 7: 1000, 8: 450, 9: 300 },
      divinityConfig: [{ min: -2, max: 0, val: 2 }, { min: 1, max: 2, val: 1.5 }, { min: 3, max: 4, val: 1.3 }],
      abilitySystemConfig: { systems: {
        物理突击系: { 活力: .35, 敏捷: .20, 灵性: .20, 理智: .10, 人性: .10, 运气: .05 },
        高敏游击系: { 活力: .20, 敏捷: .40, 灵性: .10, 理智: .15, 人性: .10, 运气: .05 },
        神秘法术系: { 活力: .10, 敏捷: .20, 灵性: .35, 理智: .20, 人性: .10, 运气: .05 },
        精神控制系: { 活力: .10, 敏捷: .15, 灵性: .20, 理智: .20, 人性: .30, 运气: .05 },
        命运特殊系: { 活力: .15, 敏捷: .20, 灵性: .20, 理智: .05, 人性: .10, 运气: .30 },
        诡异综合系: { 活力: .20, 敏捷: .20, 灵性: .25, 理智: .15, 人性: .10, 运气: .10 },
      }, aliases: {}, defaultSystem: '物理突击系' },
      abilitySystemDB: {},
    };
  }
  function rank(sequence) {
    if (!sequence || typeof sequence !== 'string') return 10;
    if (sequence.includes('支柱')) return -2;
    if (sequence.includes('旧日侍者')) return Number(sequence.match(/序列[：:\s]*(\d+(?:\.\d+)?)/)?.[1] ?? 2);
    if (sequence.includes('旧日')) return -1;
    const match = sequence.match(/^\d+(?:\.\d+)?$/) || sequence.match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
    return match ? Number(match[1] ?? match[0]) : 10;
  }
  function validateRules(rules) {
    if (!record(rules?.sequenceBase) || !Array.isArray(rules.divinityConfig) || !record(rules.abilitySystemDB) ||
      !record(rules.abilitySystemConfig?.systems) || !record(rules.abilitySystemConfig.aliases)) throw Error('序列成长数据库格式异常');
    for (const [key, value] of entries(rules.sequenceBase))
      if (!numeric(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw Error(`序列${key}基础配额无效`);
    for (const row of rules.divinityConfig)
      if (!record(row) || ![row.min, row.max, row.val].every(value => Number.isFinite(value)) || row.min > row.max || row.val < 0)
        throw Error('神性区间配置无效');
    const config = rules.abilitySystemConfig;
    if (typeof config.defaultSystem !== 'string' || RESERVED.has(config.defaultSystem) ||
      !Object.hasOwn(config.systems, config.defaultSystem)) throw Error('默认能力体系不存在');
    for (const [name, rates] of entries(config.systems)) {
      if (!record(rates) || !STATS.every(key => numeric(rates[key]) && Number(rates[key]) >= 0) ||
        Math.abs(STATS.reduce((sum, key) => sum + Number(rates[key]), 0) - 1) > 1e-9) throw Error(`能力体系「${name}」六维比例须合计为1`);
    }
    for (const [, value] of [...entries(config.aliases), ...entries(rules.abilitySystemDB)])
      if (typeof value !== 'string' || !value.trim() || RESERVED.has(value)) throw Error('能力体系映射或别名无效');
    return rules;
  }
  function abilitySystem(sequence, current, force, rules) {
    if (!force && typeof current === 'string' && current.trim() &&
      Object.hasOwn(rules.abilitySystemConfig.systems, current)) return current;
    for (const [name, system] of entries(rules.abilitySystemDB)) if (sequence.includes(name)) return system;
    return typeof current === 'string' && current.trim() ? current : '神秘法术系';
  }
  function ratesFor(system, rules) {
    const config = rules.abilitySystemConfig, input = (system || '').trim();
    const key = Object.hasOwn(config.aliases, input) ? config.aliases[input] : input;
    return Object.hasOwn(config.systems, key) ? config.systems[key] : config.systems[config.defaultSystem];
  }
  function allocate(quota, rates) {
    let total = 0;
    const parts = STATS.map((key, index) => {
      const exact = quota * Number(rates[key]), value = Math.floor(exact); total += value;
      return { key, index, value, remainder: exact - value };
    });
    const left = Math.round(quota - total);
    if (!Number.isInteger(left) || left < 0 || left > parts.length) throw Error('基础配额无法安全分配');
    parts.slice().sort((a, b) => b.remainder - a.remainder || a.index - b.index).slice(0, left).forEach(part => { part.value++; });
    return Object.fromEntries(parts.map(part => [part.key, part.value]));
  }
  function normalizeSettings(raw) {
    if (raw === undefined) return { version: 1, maxDigestionDelta: 3 };
    if (!record(raw) || raw.version !== 1 || !Number.isInteger(raw.maxDigestionDelta) ||
      raw.maxDigestionDelta < 1 || raw.maxDigestionDelta > 100) throw Error('消化单次增幅须为1至100的整数');
    return clone(raw);
  }
  function settle(data, rules = defaults(), settings = normalizeSettings(), previousStat) {
    validateRules(rules); normalizeSettings(settings);
    const next = clone(data), stat = next?.stat_data;
    if (!record(stat) || typeof stat.当前序列 !== 'string' || !stat.当前序列.trim()) return { data: next, skipped: true };
    const prior = record(previousStat) ? previousStat : stat;
    const wasInitialized = prior.initialized === true;
    const changedSequence = wasInitialized && Boolean(prior._lastSequence) && prior._lastSequence !== stat.当前序列;
    const initialize = !wasInitialized || changedSequence;
    if (changedSequence) stat.消化进度 = 0;
    if (stat.消化进度 !== undefined && stat.消化进度 !== null && !numeric(stat.消化进度))
      throw Error('消化进度须为0至100的有限数值');
    let digestion = Number(stat.消化进度 ?? 0);
    if (!Number.isFinite(digestion) || digestion < 0 || digestion > 100) throw Error('消化进度须为0至100的有限数值');
    if (digestion !== 0 && prior._lastDigestion !== undefined && prior._lastDigestion !== null) {
      if (!numeric(prior._lastDigestion) || Number(prior._lastDigestion) < 0 || Number(prior._lastDigestion) > 100)
        throw Error('上次消化进度无效，未覆盖成长数据');
      const old = Number(prior._lastDigestion);
      digestion = Math.max(old, Math.min(digestion, old + settings.maxDigestionDelta));
    }
    stat.消化进度 = digestion;
    const sequenceRank = rank(stat.当前序列);
    const divinity = rules.divinityConfig.find(row => sequenceRank >= row.min && sequenceRank <= row.max)?.val ?? 1;
    const sequenceBase = Object.hasOwn(rules.sequenceBase, String(sequenceRank)) ? rules.sequenceBase[String(sequenceRank)] : 0;
    const quota = Number(sequenceBase || 200);
    const system = abilitySystem(stat.当前序列, stat.能力体系, initialize, rules);
    const rates = ratesFor(system, rules), allocation = allocate(quota, rates);
    const experience = modules['cryptLord.battleExperience'];
    if (!experience) throw Error('战斗经验模块尚未加载');
    if ([stat.$战斗经验, stat.$战斗经验等级].some(value => value !== undefined && value !== null && !numeric(value)))
      throw Error('玩家战斗经验字段无效');
    const xp = experience.settle(stat.$战斗经验, stat.$战斗经验等级, sequenceRank);
    stat.神性 = divinity; stat.能力体系 = system; stat.基准总值 = quota;
    for (const key of STATS) stat[`基础${key}`] = allocation[key];
    stat.$战斗经验 = xp.exp; stat.$战斗经验等级 = xp.level;
    stat.initialized = true; stat._lastSequence = stat.当前序列; stat._lastDigestion = digestion;
    return { data: next, initialize, report: { kind: changedSequence ? '序列变动初始化' : initialize ? '首次初始化' : '日常成长',
      previousSequence: String(prior._lastSequence || ''), sequence: stat.当前序列, rank: sequenceRank, divinity,
      system, quota, rates: clone(rates), allocation, digestion, requestedDigestion: Number(data.stat_data.消化进度) || 0,
      maxDigestionDelta: settings.maxDigestionDelta, experience: xp } };
  }
  function finalize(result, pool) {
    if (result.skipped) return result;
    const stat = result.data.stat_data, engine = modules['cryptLord.attributeRecalculation'];
    if (!engine) throw Error('属性上限引擎尚未加载');
    const invalid = new Set(STATS.filter(key => key !== '运气' && !numeric(stat[`当前${key}`])));
    engine.apply(result.data, pool);
    for (const key of STATS) if (key !== '运气') {
      const current = `当前${key}`;
      if (result.initialize || invalid.has(key)) stat[current] = stat[key];
    }
    return result;
  }
  function check(guard, token = epoch) {
    if (disposed || token !== epoch || guard && !guard()) throw new DOMException('玩家成长操作已取消', 'AbortError');
  }
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  async function settingsSource(host, guard, token) {
    check(guard, token);
    const options = { type: 'script', script_id: host.getScriptId() };
    if (!options.script_id) throw Error('玩家成长脚本身份不可确认');
    const variables = await host.getVariables(options); check(guard, token);
    if (!record(variables) || options.script_id !== host.getScriptId()) throw Error('玩家成长配置不可读取');
    return { options, raw: clone(variables[KEY]), exists: Object.hasOwn(variables, KEY), settings: normalizeSettings(variables[KEY]) };
  }
  async function readSettings(guard, token = epoch) {
    const host = await hostApi(); check(guard, token);
    const first = await settingsSource(host, guard, token);
    if (!same(first, await settingsSource(host, guard, token))) throw Error('成长配置读取期间已变化');
    const revision = {}; revisions.set(revision, { source: clone(first), token });
    return { settings: clone(first.settings), revision };
  }
  function saveSettings(input, revision, guard) {
    const ticket = revisions.get(revision);
    if (!ticket) return Promise.reject(Error('成长配置来源无效，请重新读取'));
    let desired;
    try { desired = normalizeSettings({ version: 1, maxDigestionDelta: input }); }
    catch (error) { return Promise.reject(error); }
    const expected = clone(ticket.source), token = ticket.token;
    const next = { ...clone(expected.settings), maxDigestionDelta: desired.maxDigestionDelta };
    const task = queue.then(async () => {
      check(guard, token); const host = await hostApi(); check(guard, token);
      if (!same(expected, await settingsSource(host, guard, token))) throw Error('成长配置已变化，未覆盖');
      if (same(next, expected.settings)) return readSettings(guard, token);
      await host.updateVariablesWith(async variables => {
        check(guard, token);
        if (!record(variables) || host.getScriptId() !== expected.options.script_id ||
          Object.hasOwn(variables, KEY) !== expected.exists || !same(variables[KEY], expected.raw)) throw Error('成长配置已变化，未覆盖');
        const current = await host.getVariables(expected.options); check(guard, token);
        if (host.getScriptId() !== expected.options.script_id || !same(current, variables)) throw Error('等待期间脚本变量已变化，未覆盖');
        return { ...variables, [KEY]: clone(next) };
      }, expected.options);
      revisions.delete(revision);
      try {
        const saved = await readSettings(guard, token), source = revisions.get(saved.revision)?.source;
        if (!same(source?.options, expected.options) || !same(source?.raw, next)) throw Error('已提交的成长配置随后已变化');
        return saved;
      }
      catch (error) { return { settings: clone(next), revision: null, warning: `成长配置已保存，但复核失败：${error.message || error}` }; }
    });
    queue = task.catch(() => {}); return task;
  }
  async function ruleSource(host, guard, token) {
    const binding = clone(await host.getCharWorldbookNames('current')); check(guard, token);
    const primary = binding?.primary || '1源堡';
    const names = [...new Set(['【源堡】玩家自建内容', ...(binding?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary];
    const rules = defaults(), books = [];
    const parser = modules['cryptLord.abilityState'];
    if (!parser) throw Error('世界书解析模块尚未加载');
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
        const key = Object.entries(CONFIGS).find(([label]) => title.includes(label))?.[1]; if (!key) continue;
        relevant.push(clone(entry));
        let parsed;
        try { parsed = parser.parseWorldbookJson(entry.content); }
        catch { throw Error(`世界书「${name}」的「${title}」格式损坏，未按默认规则覆盖`); }
        if (key === 'divinityConfig') {
          if (!Array.isArray(parsed)) throw Error('神性数据库须为区间列表');
          rules[key].push(...parsed);
        } else {
          if (!record(parsed)) throw Error(`「${title}」须为字典`);
          rules[key] = { ...rules[key], ...Object.fromEntries(entries(parsed)) };
        }
      }
      books.push({ name, entries: relevant });
    }
    validateRules(rules);
    return { binding, books, rules };
  }
  async function prepare(data, previousStat, guard, pool) {
    const token = epoch; check(guard, token);
    const input = clone(data), prior = clone(previousStat);
    if (!record(input?.stat_data) || typeof input.stat_data.当前序列 !== 'string' || !input.stat_data.当前序列.trim() ||
      modules['cryptLord.attributeRecalculation']?.busyBattle(input)) {
      const result = { data: input, skipped: true }; prepared.set(result, { token }); return result;
    }
    const host = await hostApi(); check(guard, token);
    const settings = await settingsSource(host, guard, token), source = await ruleSource(host, guard, token);
    const result = settle(input, source.rules, settings.settings, prior);
    const signature = { settings, source };
    if (!same(settings, await settingsSource(host, guard, token)) || !same(source, await ruleSource(host, guard, token)))
      throw Error('成长规则或设置读取期间已变化，未写入');
    prepared.set(result, { signature: clone(signature), token });
    if (pool !== undefined) finalize(result, pool);
    return result;
  }
  function signature(result) { return clone(prepared.get(result)?.signature); }
  async function assertPrepared(result, guard) {
    const ticket = prepared.get(result); if (!ticket) throw Error('成长结算来源无效');
    const { token } = ticket; check(guard, token); if (result.skipped) return;
    const host = await hostApi(); check(guard, token);
    if (!same(ticket.signature, { settings: await settingsSource(host, guard, token), source: await ruleSource(host, guard, token) }))
      throw Error('成长规则或设置已变化，未写入');
    check(guard, token);
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (name, fn) => { if (name) subscriptions.push(after.bindEvent(name, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => { if (type !== 'quiet' && !dryRun && !options?.dryRun) epoch++; });
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed }), stats: STATS,
    defaults, rank, validateRules, abilitySystem, ratesFor, allocate, normalizeSettings, settle, finalize,
    readSettings, saveSettings, prepare, signature, assertPrepared,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
