(() => {
  'use strict';

  const KEY = 'cryptLord.industryState';
  const HOST_KEY = 'cryptLord.hostApi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const TYPES = Object.freeze({
    第一产业: '农产品', 第二产业: '工业品', 第三产业: '服务', 独立领地: '农产品',
  });
  const CONVERSION = Object.freeze([1, 5, 10, 50, 100]);
  const TIER_FIELDS = Object.freeze([
    [10, 0, 50, 4, 22], [13, 0, 55, 4, 22], [15, 30, 60, 4, 22],
    [16, 50, 65, 4, 22], [17, 80, 70, 4, 22], [19, 100, 70, 4, 22],
    [21, 130, 75, 4, 22], [23, 170, 80, 4, 22], [25, 200, 85, 4, 22],
    [27, 240, 88, 4, 22], [28, 270, 90, 4, 22], [30, 300, 94, 4, 22],
    [30, 300, 100, 3.5, 22],
  ]);
  const SPECIALTY = Object.freeze({
    第一产业: ['耕种者', '药师', '流浪汉', '萨满', '恶棍'],
    第二产业: ['通识者', '窥秘人', '学徒'],
    第三产业: ['掮客', '律师', '仲裁人', '占卜家', '吝啬鬼', '刺客', '天文爱好者'],
    独立领地: ['水手', '战士', '猎人'],
  });
  const GENERALIST = new Set(['歌颂者', '入门者', '观众', '怪物', '失梦人', '阅读者']);
  const DEFAULT_CONFIG = Object.freeze({
    scaleThresholds: Object.freeze({ medium: 5000, large: 50000 }),
    productionConversion: Object.freeze(Object.fromEntries(CONVERSION.map((value, index) => [`${index + 1}级`, value]))),
    typeMapping: TYPES,
    formulas: Object.freeze({
      techPositiveCoeff: .000002, techNegativeCoeff: .0000125,
      scalePenaltyBase: 10000, scalePenaltyCoeff: .1,
      marketFactorBase: .5, marketFactorOffset: 10, marketFactorDivisor: 90,
      costMultiplierBase: 2, costMultiplierDivisor: 100,
    }),
    industryInjectRetention: .75,
  });
  let activeConfig = DEFAULT_CONFIG;
  let configStatus = { source: '默认规则', books: [], accepted: 0, warnings: [] };
  let loadSequence = 0;
  let epoch = 0, disposed = false, generating = false, queue = Promise.resolve();
  const subscriptions = [], ruleTickets = new WeakMap(), loadedTickets = new WeakMap();
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function number(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function parseCurrency(value) {
    if (typeof value === 'number') return { value: Math.round(number(value)), currency: '' };
    const match = String(value ?? '').trim().replace(/[\s,_]/g, '').match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
    return match ? { value: Math.round(number(match[1])), currency: match[2].trim() } : { value: 0, currency: '' };
  }
  function format(value, currency) { return `${Math.round(value)}${currency ? ` ${currency}` : ''}`; }
  function parseWorldbookJson(content) {
    const source = String(content || '').trim().replace(/^```(?:jsonc|json)?\s*/i, '').replace(/\s*```$/, '');
    let clean = '';
    let quoted = false;
    let escaped = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        clean += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') {
        quoted = true;
        clean += char;
      } else if (char === '/' && source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') i += 1;
        clean += '\n';
      } else if (char === '/' && source[i + 1] === '*') {
        i += 2;
        while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i += 1;
      } else clean += char;
    }
    let normalized = '';
    quoted = false;
    escaped = false;
    for (let i = 0; i < clean.length; i += 1) {
      const char = clean[i];
      if (quoted) {
        normalized += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') {
        quoted = true;
        normalized += char;
      } else if (char === ',') {
        let cursor = i + 1;
        while (cursor < clean.length && /\s/.test(clean[cursor])) cursor += 1;
        if (clean[cursor] !== '}' && clean[cursor] !== ']') normalized += char;
      } else normalized += char;
    }
    return JSON.parse(normalized);
  }
  function applyConfig(next, parsed) {
    if (!record(parsed)) throw new Error('产业配置必须是对象');
    const staged = Object.fromEntries(Object.entries(next).map(([key, value]) => [
      key, record(value) ? { ...value } : value,
    ]));
    let accepted = 0;
    const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
    const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
    if (Object.hasOwn(parsed, 'industryInjectRetention') &&
      typeof parsed.industryInjectRetention === 'number' &&
      Number.isFinite(parsed.industryInjectRetention) &&
      parsed.industryInjectRetention >= 0 && parsed.industryInjectRetention <= 1) {
      staged.industryInjectRetention = parsed.industryInjectRetention;
      accepted += 1;
    }
    for (const [group, values] of Object.entries(parsed)) {
      if (!Object.hasOwn(DEFAULT_CONFIG, group) || !record(values)) continue;
      for (const [key, value] of Object.entries(values)) {
        if (['__proto__', 'constructor', 'prototype', '$meta'].includes(key)) continue;
        if (group === 'typeMapping') {
          if (!Object.hasOwn(TYPES, key) || typeof value !== 'string' || !value.trim()) continue;
          staged[group][key] = value.trim();
        } else {
          if (!Object.hasOwn(DEFAULT_CONFIG[group], key)) continue;
          const valid = group === 'scaleThresholds' || group === 'productionConversion' ||
            ['scalePenaltyBase', 'marketFactorDivisor', 'costMultiplierBase', 'costMultiplierDivisor'].includes(key)
            ? positive(value) : nonnegative(value);
          if (!valid) continue;
          staged[group][key] = value;
        }
        accepted += 1;
      }
    }
    if (staged.scaleThresholds.medium >= staged.scaleThresholds.large) throw new Error('规模阈值必须满足中型 < 大型');
    Object.assign(next, staged);
    return accepted;
  }
  async function loadConfigs(guard) {
    const sequence = ++loadSequence;
    const loaded = await loadRules(guard);
    if (sequence !== loadSequence) throw Error('产业配置读取已被新请求替代');
    if (loaded.warnings.length) throw Error(`产业配置异常：${loaded.warnings.join('；')}`);
    activeConfig = structuredClone(loaded.config);
    configStatus = { source: loaded.source, books: [...loaded.books], accepted: loaded.accepted, warnings: [] };
    return structuredClone(configStatus);
  }
  async function loadPathways(guard) {
    const loaded = await loadRules(guard);
    if (loaded.warnings.length) throw Error(`产业配置异常：${loaded.warnings.join('；')}`);
    return structuredClone(loaded.pathways);
  }
  function principal(industry, data, pathways = {}, industries = data?.stat_data?.产业) {
    const name = String(industry?.负责人 || '').trim();
    const npcPool = data?.npc_data;
    const relationPool = data?.stat_data?.人物关系列表;
    const npc = name && record(npcPool) && Object.hasOwn(npcPool, name) ? npcPool[name] : null;
    const relation = name && record(relationPool) && Object.hasOwn(relationPool, name) ? relationPool[name] : null;
    const sequence = String(npc?.当前序列 || '').trim();
    const source = !name ? 'no-principal' : !record(npc) || npc.当前序列 === undefined ? 'unrecognized'
      : !record(relation) || relation.好感度 === undefined ? 'no-relation' : sequence.includes('普通人') ? 'normal-person'
      : /^序列([0-9])-/.test(sequence) ? `sequence-${sequence.match(/^序列([0-9])-/)[1]}`
      : sequence.startsWith('旧日-') ? 'old-day' : sequence.startsWith('支柱-') ? 'pillar' : 'normal-person';
    const baseTier = source.startsWith('sequence-') ? 11 - Number(source.slice(9))
      : source === 'old-day' || source === 'pillar' ? 12
      : source === 'normal-person' ? 1 : 0;
    const pathway = Object.entries(pathways).find(([, sequences]) =>
      Array.isArray(sequences) && sequences.includes(sequence))?.[0]?.replace(/途径$/, '').trim() || '';
    const matched = baseTier > 0 && baseTier < 12 && source !== 'normal-person' &&
      SPECIALTY[industry?.类型]?.includes(pathway);
    const generalist = baseTier > 0 && baseTier < 12 && source !== 'normal-person' && GENERALIST.has(pathway);
    const tier = Math.min(12, baseTier + (matched ? 2 : generalist ? 1 : 0));
    const rawAffinity = Number(relation?.好感度);
    const affinity = Number.isFinite(rawAffinity) ? clamp(rawAffinity, -200, 200) : 0;
    const coefficient = clamp((affinity - 30) / 100, 0, 1);
    const baseline = TIER_FIELDS[0];
    const target = source === 'no-principal' || source === 'unrecognized' || source === 'no-relation'
      ? baseline : affinity < 0 ? [10, 0, 50, 6, 22]
      : affinity < 30 ? [10, 0, 50, 5, 22]
      : TIER_FIELDS[tier].map((value, index) => baseline[index] + (value - baseline[index]) * coefficient);
    const [saturation, tech, efficiency, fixedCost, rate] = target.map(value => Math.round(value * 10) / 10);
    const sources = (Array.isArray(industries) ? industries : record(industries) ? Object.values(industries) : [])
      .filter(item => record(item) && String(item.负责人 || '').trim() === name && name)
      .map(item => ({
        name: String(item.名称 || '未命名产业'),
        perWeek: item['$轻负荷运营'] || parseCurrency(item.当前投入资本总额).value <= 0 ? 0
          : parseCurrency(item.当前投入资本总额).value >= 50000 ? 4
          : parseCurrency(item.当前投入资本总额).value >= 5000 ? 2 : 1,
      }));
    const weeklyDeduction = industry?.['$轻负荷运营'] || parseCurrency(industry?.当前投入资本总额).value <= 0 ? 0
      : parseCurrency(industry?.当前投入资本总额).value >= 50000 ? 4
      : parseCurrency(industry?.当前投入资本总额).value >= 5000 ? 2 : 1;
    return {
      name, source, baseTier, tier, pathway, specialty: matched ? 'matched' : generalist ? 'generalist' : 'none',
      affinity, coefficient, weeklyDeduction, totalDeduction: sources.reduce((sum, item) => sum + item.perWeek, 0),
      sources, floorReached: affinity <= 10, lightLoad: Boolean(industry?.['$轻负荷运营']),
      fields: { 市场饱和度: saturation, 技术先进指数: tech, 运营效率: efficiency, 固定成本率: fixedCost, 月均资本回报率: rate },
    };
  }
  function evaluate(industry, config = activeConfig) {
    const { value: capital, currency } = parseCurrency(industry?.当前投入资本总额);
    const formulas = config.formulas || {};
    const thresholds = config.scaleThresholds || {};
    const scale = capital >= number(thresholds.large, 50000) ? '大型'
      : capital >= number(thresholds.medium, 5000) ? '中型' : '小型';
    const baseRate = number(industry?.月均资本回报率);
    const saturation = clamp(number(industry?.市场饱和度, 30), 0, 100);
    const marketFactor = number(formulas.marketFactorBase, .5) +
      (saturation - number(formulas.marketFactorOffset, 10)) / number(formulas.marketFactorDivisor, 90);
    const penaltyBase = number(formulas.scalePenaltyBase, 10000);
    const scalePenalty = capital > penaltyBase && penaltyBase > 0
      ? Math.max(.5, 1 - Math.log10(capital / penaltyBase) * number(formulas.scalePenaltyCoeff, .1)) : 1;
    const actualRate = baseRate * marketFactor * scalePenalty;
    const techIndex = clamp(number(industry?.技术先进指数), -200, 1000);
    const techPotential = clamp(techIndex <= 0
      ? 1 - number(formulas.techNegativeCoeff, .0000125) * techIndex ** 2
      : 1 + number(formulas.techPositiveCoeff, .000002) * techIndex ** 2, .1, 100);
    const baseGrossProfit = capital * (actualRate / 100);
    const grossProfit = baseGrossProfit >= 0 ? baseGrossProfit * techPotential : baseGrossProfit / techPotential;
    const efficiency = clamp(number(industry?.运营效率, 50), 0, 100);
    const costMultiplier = number(formulas.costMultiplierBase, 2) -
      efficiency / number(formulas.costMultiplierDivisor, 100);
    const fixedCostRate = Math.max(0, number(industry?.固定成本率, 5));
    const actualFixedCost = capital * (fixedCostRate / 100) * costMultiplier;
    const monthlyReturn = grossProfit - actualFixedCost;
    const productType = (config.typeMapping || TYPES)[industry?.类型] || '农产品';
    const maxLevel = scale === '小型' ? 2 : scale === '中型' ? 4 : 5;
    const allocation = Array.from({ length: 5 }, (_, index) =>
      clamp(number(industry?.[`生产分配_${index + 1}级`], index === 0 ? 100 : 0), 0, 100));
    const conversion = config.productionConversion || {};
    const production = allocation.map((percentage, index) => {
      const configured = number(conversion[`${index + 1}级`], CONVERSION[index]);
      return index >= maxLevel ? 0 : Math.floor(Math.max(0, monthlyReturn) * percentage / 100 /
        (configured > 0 ? configured : CONVERSION[index]));
    });
    return {
      capital, currency, scale, baseRate, actualRate, saturation, marketFactor, scalePenalty,
      techIndex, techPotential, efficiency, costMultiplier, fixedCostRate, actualFixedCost,
      grossProfit, monthlyReturn, productType, allocation, production, maxLevel,
    };
  }
  function dashboard(value, config = activeConfig, project = item => item) {
    const entries = value && typeof value === 'object'
      ? Object.entries(value).filter(([key, item]) => key !== '$meta' && record(item)) : [];
    const valuation = new Map();
    const returns = new Map();
    const production = new Map();
    let baseRate = 0;
    entries.forEach(([, industry]) => {
      const result = evaluate(project(industry), config);
      valuation.set(result.currency, (valuation.get(result.currency) || 0) + result.capital);
      returns.set(result.currency, (returns.get(result.currency) || 0) + result.monthlyReturn);
      result.production.forEach((amount, index) => {
        const key = `${index + 1}级${result.productType}`;
        production.set(key, (production.get(key) || 0) + amount);
      });
      baseRate += result.baseRate;
    });
    const display = map => [...map].map(([currency, amount]) => format(amount, currency)).join('、') || '0';
    return {
      count: entries.length,
      valuation: display(valuation),
      monthlyReturn: display(returns),
      averageRate: entries.length ? (baseRate / entries.length).toFixed(2) : '0.00',
      production: [...production].filter(([, amount]) => amount > 0),
    };
  }
  function allocation(industry, level, value, config = activeConfig) {
    const index = Number(level) - 1;
    if (!Number.isInteger(index) || index < 0 || index > 4) throw new Error('生产等级无效。');
    const result = evaluate(industry, config);
    if (index >= result.maxLevel && Number(value) !== 0) throw new Error('当前产业规模尚未解锁该等级。');
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount < 0 || amount > 100) throw new Error('分配比例必须是 0 到 100 之间的整数。');
    const next = [...result.allocation];
    next[index] = amount;
    if (next.reduce((sum, item) => sum + item, 0) > 100) throw new Error('分配比例总和不能超过 100%。');
    return { ...industry, [`生产分配_${level}级`]: amount };
  }
  function create(name, gameTime = '') {
    return {
      名称: String(name).trim(), 类型: '第一产业', 当前投入资本总额: '0 金镑',
      规模: '小型', 利润倍率: 1, 月均资本回报率: 0, 技术先进指数: 50,
      固定成本率: 8, 运营效率: 50, 市场饱和度: 50, 产业情况概述: '',
      负责人: '', '$轻负荷运营': false, 资产: '', 收入来源: '',
      创建时间: gameTime, 上次结算时间: gameTime,
      生产分配_1级: 100, 生产分配_2级: 0, 生产分配_3级: 0,
      生产分配_4级: 0, 生产分配_5级: 0,
    };
  }
  async function loadRules(guard) {
    const token = epoch;
    const valid = () => check(guard, token, true);
    valid();
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    const bound = await host.getCharWorldbookNames('current');
    valid();
    const primary = bound?.primary || '1源堡';
    const names = [...new Set(['【源堡】玩家自建内容', ...(bound?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary];
    const selected = new Map(), revision = [], warnings = [];
    for (const name of names) {
      valid();
      let entries;
      try { entries = await host.getWorldbook(name); }
      catch (error) {
        valid();
        if (name !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) {
          revision.push([name, null]); continue;
        }
        throw error;
      }
      valid();
      if (!Array.isArray(entries)) throw Error(`世界书“${name}”不可读取。`);
      const relevant = entries.filter(entry => {
        const title = String(entry?.name || entry?.comment || '').trim();
        return title.startsWith('【配置') && title.includes('产业配置') || title.startsWith('[神之途径]');
      });
      revision.push([name, relevant]);
      for (const entry of relevant) selected.set(String(entry.name || entry.comment).trim(), entry);
    }
    valid();
    if (!same(bound, await host.getCharWorldbookNames('current'))) throw Error('世界书绑定已变化，请重新读取');
    valid();
    if (modules[HOST_KEY] !== host) throw Error('产业规则宿主已变化，请重新读取');
    const config = structuredClone(DEFAULT_CONFIG), pathways = {};
    let accepted = 0;
    for (const [title, entry] of selected) {
      try {
        const parsed = parseWorldbookJson(entry.content);
        if (title.startsWith('[神之途径]')) {
          if (!record(parsed)) throw Error('神之途径必须是对象');
          for (const [name, values] of Object.entries(parsed)) {
            if (RESERVED.has(name)) continue;
            if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) throw Error('神之途径序列必须是字符串数组');
            pathways[name] = values;
          }
        } else {
          if (!record(parsed)) throw Error('产业配置必须是对象');
          for (const [group, values] of Object.entries(parsed)) {
            if (!Object.hasOwn(DEFAULT_CONFIG, group)) continue;
            if (group === 'industryInjectRetention') {
              if (typeof values !== 'number' || !Number.isFinite(values) || values < 0 || values > 1) throw Error('产业产出留存比例无效');
            } else {
              if (!record(values)) throw Error(`配置组 ${group} 必须是对象`);
              for (const [key, value] of Object.entries(values)) {
                if (!Object.hasOwn(DEFAULT_CONFIG[group], key)) continue;
                if (group === 'typeMapping') {
                  if (typeof value !== 'string' || !value.trim()) throw Error('产业产出类型无效');
                } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
                  (group === 'scaleThresholds' || group === 'productionConversion' ||
                    ['scalePenaltyBase', 'marketFactorDivisor', 'costMultiplierBase', 'costMultiplierDivisor'].includes(key)) && value === 0)
                  throw Error(`配置数值 ${group}.${key} 无效`);
              }
            }
          }
          accepted += applyConfig(config, parsed);
        }
      } catch (error) { warnings.push(`${title}: ${error.message}`); }
    }
    const loaded = { config, pathways, warnings, source: accepted ? '世界书配置' : '默认规则',
      books: names, accepted, revision: JSON.stringify({ bound, revision }) };
    ruleTickets.set(loaded, { token, host, result: JSON.stringify(loaded) });
    return loaded;
  }
  async function assertRules(loaded, guard) {
    const ticket = ruleTickets.get(loaded);
    if (!ticket || ticket.result !== JSON.stringify(loaded)) throw Error('产业规则来源无效或已修改，请重新读取');
    check(guard, ticket.token, true);
    if (modules[HOST_KEY] !== ticket.host) throw Error('产业规则宿主已变化，请重新读取');
    if (loaded.warnings.length) throw Error(`产业配置异常：${loaded.warnings.join('；')}`);
    const fresh = await loadRules(guard);
    if (fresh.revision !== loaded.revision) throw Error('产业配置或世界书绑定已变化，请重新读取');
    check(guard, ticket.token, true);
    if (modules[HOST_KEY] !== ticket.host) throw Error('产业规则宿主已变化，请重新读取');
  }
  function sourceOf(data) {
    for (const domain of ['stat_data', 'world_data']) {
      for (const key of ['产业', '产业数据', 'industries', 'industry']) {
        if (record(data?.[domain]) && Object.hasOwn(data[domain], key))
          return { domain, key, value: data[domain][key] };
      }
    }
    return { domain: 'stat_data', key: '产业', value: undefined };
  }
  function malformed(value) {
    return value !== undefined && (!record(value) && !Array.isArray(value) ||
      Object.entries(value).some(([key, item]) => key !== '$meta' && (RESERVED.has(key) || !record(item))));
  }
  function check(guard, token, allowGeneration = false) {
    if (disposed || generating && !allowGeneration || token !== epoch || modules[KEY] !== api || guard && !guard())
      throw new DOMException('产业操作已取消，请重新读取', 'AbortError');
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const service = modules['cryptLord.nativeFloorSource'];
    const dependencies = service.writeDependencies([KEY, 'cryptLord.domainState', 'cryptLord.factionState', 'cryptLord.cashflow']);
    const page = await service.read(() => { check(guard, token); return true; }), latest = page.rows.at(-1);
    const id = messageId ?? latest?.message_id;
    const floor = page.rows.find(row => row.message_id === id && row.role === 'assistant');
    check(guard, token);
    if (!floor || !Number.isInteger(id) || !record(floor.data?.stat_data)) throw Error('所选 assistant 楼层没有角色状态');
    const rules = await loadRules(() => { check(guard, token); return true; });
    check(guard, token);
    await service.assert(page, () => { check(guard, token); return true; });
    const source = sourceOf(floor.data);
    const battle = ['teamBattle', 'personalBattle'].some(key => {
      const value = floor.data.cryptLord?.[key];
      return value?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(value?.status) && !value.settled ||
        key === 'personalBattle' && value?.status === 'finished' && value.result === 'victory' &&
          value.enemy?.npcKey && !value.experienceClaimed;
    });
    const reason = floor.is_hidden ? '隐藏楼层只读' : id === 0 || latest?.message_id !== id ? '历史楼层只读' : battle ? '请先结束并结算战斗' :
      source.domain !== 'stat_data' || source.key !== '产业' ? '旧版产业路径只读，请在变量面板迁入 stat_data.产业' :
      malformed(source.value) ? '产业字典格式异常，请在变量面板修复' :
      [floor.data.stat_data.人物关系列表, floor.data.npc_data, floor.data.stat_data.生产力]
        .some(value => value !== undefined && !record(value)) ? '负责人或生产力字典格式异常，请在变量面板修复' :
      rules.warnings.length ? '产业配置异常，请修复世界书配置后重新读取' : '';
    const loaded = { floor: structuredClone(floor), latest: structuredClone(latest), revision: service.signature(page), rules: structuredClone(rules),
      source: structuredClone(source), editable: !reason, reason };
    loadedTickets.set(loaded, { token, page, rules, dependencies, signature: service.signature(loaded),
      locked: dependencies['cryptLord.abilityState']?.locked?.(floor.data) });
    return loaded;
  }
  function prepare(data, value, rules) {
    if (malformed(value)) throw Error('产业字典格式异常');
    const next = structuredClone(data), industries = structuredClone(value);
    const time = data.world_data?.当前时间纪元 || data.stat_data?.当前时间纪元 || '';
    for (const [key, item] of Object.entries(industries)) {
      if (key === '$meta') continue;
      if (!String(item.名称 || '').trim()) throw Error('产业名称不能为空');
      const capital = String(item.当前投入资本总额 ?? '').trim().replace(/[\s,_]/g, '');
      if (!/^\d+(?:\.\d+)?[^\d.+-]*$/.test(capital) || !Number.isSafeInteger(parseCurrency(capital).value))
        throw Error(`「${item.名称}」的投入资本格式无效`);
      if (!Object.hasOwn(TYPES, item.类型)) throw Error(`「${item.名称}」的产业类型无效`);
      if (item.利润倍率 !== undefined && (item.利润倍率 === '' || !Number.isFinite(Number(item.利润倍率)) ||
        Number(item.利润倍率) < 0 || Number(item.利润倍率) > 5)) throw Error('利润倍率必须在 0 到 5 之间');
      const amounts = Array.from({ length: 5 }, (_, index) => {
        const amount = item[`生产分配_${index + 1}级`] ?? (index ? 0 : 100);
        return typeof amount === 'string' && !amount.trim() ? NaN : Number(amount);
      });
      if (amounts.some(amount => !Number.isInteger(amount) || amount < 0 || amount > 100) ||
        amounts.reduce((sum, amount) => sum + amount, 0) > 100) throw Error('生产分配必须为整数百分比且总和不能超过 100%');
      const perf = evaluate(item, rules.config);
      if (amounts.some((amount, index) => index >= perf.maxLevel && amount > 0)) throw Error('当前产业规模尚未解锁已分配的生产等级');
      if (item['$轻负荷运营'] !== undefined && typeof item['$轻负荷运营'] !== 'boolean') throw Error('轻负荷运营必须是开关');
      item.利润倍率 = Number(item.利润倍率 ?? 1);
      Object.assign(item, principal(item, data, rules.pathways, industries).fields);
      item.规模 = perf.scale;
      item.创建时间 ||= time;
      item.上次结算时间 ||= item.创建时间 || time;
    }
    next.stat_data.产业 = industries;
    project(next, rules.pathways, rules.config);
    return next;
  }
  function project(data, pathways = {}, config = activeConfig) {
    const industries = data?.stat_data?.产业;
    if (industries === undefined) return false;
    if (malformed(industries)) throw Error('产业字典格式异常');
    for (const [key, item] of Object.entries(industries)) {
      if (key === '$meta') continue;
      Object.assign(item, principal(item, data, pathways, industries).fields);
      item.规模 = evaluate(item, config).scale;
    }
    const summary = dashboard(industries, config);
    if (!Array.isArray(industries)) {
      if (industries.$meta !== undefined && !record(industries.$meta)) throw Error('产业元数据格式异常');
      industries.$meta = { ...(industries.$meta || { extensible: true }), 总估值: summary.valuation };
    }
    if (data.stat_data.生产力 !== undefined && !record(data.stat_data.生产力)) throw Error('生产力字典格式异常');
    const production = { ...(data.stat_data.生产力 || {}) };
    for (const type of new Set([...Object.values(TYPES), ...Object.values(config.typeMapping || TYPES)]))
      for (let level = 1; level <= 5; level++) production[`${level}级${type}`] = 0;
    for (const [key, amount] of summary.production) {
      if (!Number.isSafeInteger(amount)) throw Error('生产力超出安全数值范围');
      production[key] = amount;
    }
    data.stat_data.生产力 = production;
    return true;
  }
  function begin(baseline, value, guard) {
    const ticket = loadedTickets.get(baseline), service = modules['cryptLord.nativeFloorSource'];
    if (!ticket || ticket.signature !== service.signature(baseline)) throw Error('产业来源无效或已修改，请重新读取');
    const { token, page, rules, dependencies, locked } = ticket, draft = structuredClone(value), expected = structuredClone(baseline);
    check(guard, token);
    if (!expected.editable) throw Error(expected.reason);
    const valid = () => {
      check(guard, token);
      if (dependencies['cryptLord.abilityState']?.locked?.(expected.floor.data) !== locked)
        throw Error('能力锁定已变化，请重新读取');
      return true;
    };
    return service.transaction(page, expected.floor.message_id, {
      dependencies, guard: valid, beforeWrite: () => assertRules(rules, valid),
      compute(data) {
        const initial = sourceOf(data).value ?? { $meta: { extensible: true, 总估值: '0', 上次计算时间: '' } };
        return { data: same(draft, initial) ? data : prepare(data, draft, rules), writeOptions: { industryRules: rules } };
      },
      async onSaved(result) { return { ...result, loaded: await load(expected.floor.message_id, guard, token) }; },
    });
  }
  function commit(baseline, value, guard) {
    const draft = structuredClone(value);
    const task = queue.then(() => begin(baseline, draft, guard).run());
    queue = task.catch(() => {});
    return task;
  }
  const WALLET_PATHS = Object.freeze({
    金镑: ['鲁恩王国', '金镑'], 银苏勒: ['鲁恩王国', '银苏勒'], 铜便士: ['鲁恩王国', '铜便士'],
    金霍恩: ['弗萨克帝国', '金霍恩'], 弗银: ['弗萨克帝国', '弗银'], 戈比: ['弗萨克帝国', '戈比'],
    费尔金: ['因蒂斯共和国', '费尔金'], 里克: ['因蒂斯共和国', '里克'], 科佩: ['因蒂斯共和国', '科佩'],
    金里索: ['费内波特王国', '金里索'], 塞塔: ['费内波特王国', '塞塔'], 德根: ['费内波特王国', '德根'],
    萨森金: ['其他', '萨森金'], 波特金: ['其他', '波特金'], 兹罗提: ['其他', '兹罗提'],
    花纹金币: ['其他', '花纹金币'], 德力西: ['其他', '德力西'],
  });
  const CURRENCY_ALIASES = Object.freeze({
    镑: '金镑', 磅: '金镑', 苏勒: '银苏勒', 便士: '铜便士',
    霍恩: '金霍恩', 里索: '金里索', 萨森: '萨森金', 波特: '波特金',
  });
  function settlementCapital(value) {
    const cleaned = String(value ?? '').trim().replace(/[\s,_：:]/g, '');
    const match = cleaned.match(/(-?\d+(?:\.\d+)?)/);
    return { value: match ? Math.round(Number(match[1])) : 0, currency: match ? cleaned.replace(match[0], '') : '' };
  }
  function walletSlot(wallet, currency) {
    const normalized = Object.hasOwn(CURRENCY_ALIASES, currency) ? CURRENCY_ALIASES[currency] : currency;
    const [group, denomination] = Object.hasOwn(WALLET_PATHS, normalized)
      ? WALLET_PATHS[normalized] : currency ? ['其他', currency] : WALLET_PATHS.金镑;
    if (['__proto__', 'constructor', 'prototype'].includes(denomination) ||
      !record(wallet?.[group])) return null;
    const current = Object.hasOwn(wallet[group], denomination) ? Number(wallet[group][denomination]) : 0;
    if (!Number.isFinite(current)) return null;
    return { group, denomination, current };
  }
  function compoundedProfit(industry, capital, cycles) {
    const periods = Math.min(cycles, 2400);
    const rate = clamp(number(industry.月均资本回报率) / 400, -.5, .5);
    const saturation = clamp(number(industry.市场饱和度, 30), 0, 100);
    const marketFactor = .5 + (saturation - 10) / 90;
    const scalePenalty = capital > 10000 ? Math.max(.5, 1 - Math.log10(capital / 10000) * .1) : 1;
    const tech = clamp(number(industry.技术先进指数), -200, 1000);
    const potential = clamp(tech <= 0 ? 1 - .0000125 * tech ** 2 : 1 + .000002 * tech ** 2, .1, 100);
    const efficiency = clamp(number(industry.运营效率, 50), 0, 100);
    const costRate = Math.max(0, number(industry.固定成本率, 5));
    const multiplier = Math.pow(1 + rate * marketFactor * scalePenalty, periods);
    if (multiplier > 1000) return Math.round(capital * 1000) - capital;
    const baseProfit = capital * (multiplier - 1);
    const adjustedProfit = baseProfit >= 0 ? baseProfit * potential : baseProfit / potential;
    const cost = capital * (costRate / 4 / 100) * (2 - efficiency / 100) * periods;
    const newCapital = Math.max(0, capital + adjustedProfit - cost);
    return Number.isFinite(newCapital) ? Math.round(newCapital) - capital : null;
  }
  function settleWeekly(data, cycles, pathways = {}) {
    const stat = data?.stat_data;
    const industries = stat?.产业;
    const wallet = stat?.货币;
    if (!record(stat) || !record(wallet) || !record(industries) && !Array.isArray(industries)) {
      return { settled: 0, affinityChanged: 0 };
    }
    if (!Number.isSafeInteger(cycles) || cycles <= 0) return { settled: 0, affinityChanged: 0 };
    let settled = 0;
    let affinityChanged = 0;
    const deductions = new Map();
    for (const [id, item] of Object.entries(industries)) {
      if (id === '$meta' || !record(item)) continue;
      const { value: capital, currency } = settlementCapital(item.当前投入资本总额);
      if (capital <= 0) continue;
      Object.assign(item, principal(item, data, pathways, industries).fields);
      const profit = compoundedProfit(item, capital, cycles);
      if (profit === null) continue;
      const multiplier = Number(item.利润倍率);
      let finalProfit = Number.isFinite(multiplier) ? Math.round(profit * multiplier) : profit;
      if (item['$轻负荷运营']) finalProfit = Math.round(finalProfit * .5);
      if (!Number.isFinite(finalProfit)) continue;
      if (finalProfit !== 0) {
        const slot = walletSlot(wallet, currency);
        if (!slot || !Number.isFinite(slot.current + finalProfit)) continue;
        wallet[slot.group][slot.denomination] = slot.current + finalProfit;
        settled++;
        if (Number.isFinite(multiplier) && multiplier !== 1) {
          const step = .05 * cycles;
          item.利润倍率 = multiplier > 1 ? Math.max(1, Math.min(multiplier - step, 5))
            : Math.min(1, Math.max(multiplier + step, 0));
        }
      }
      item.上次结算时间 = data.world_data?.当前时间纪元 || item.上次结算时间;
      const name = String(item.负责人 || '').trim();
      if (!name || item['$轻负荷运营']) continue;
      const perWeek = capital >= 50000 ? 4 : capital >= 5000 ? 2 : 1;
      deductions.set(name, (deductions.get(name) || 0) + perWeek * cycles);
    }
    const relations = stat.人物关系列表;
    for (const [name, intent] of deductions) {
      if (!record(data.npc_data) || !Object.hasOwn(data.npc_data, name) ||
        !record(relations) || !Object.hasOwn(relations, name) || !record(relations[name])) continue;
      const affinity = Number(relations[name].好感度);
      if (!Number.isFinite(affinity) || affinity <= 10) continue;
      const deduction = Math.min(intent, affinity - 10);
      if (deduction > 0) { relations[name].好感度 = affinity - deduction; affinityChanged++; }
    }
    return { settled, affinityChanged };
  }

  function industryWeeklyGoods(industries, config = activeConfig) {
    const output = {};
    if (!industries || typeof industries !== 'object') return output;
    const retention = clamp(number(config.industryInjectRetention, 0.75), 0, 1);
    for (const [id, industry] of Object.entries(industries)) {
      if (id === '$meta' || !record(industry)) continue;
      const result = evaluate(industry, config);
      if (result.monthlyReturn <= 0) continue;
      for (let index = 0; index < result.production.length; index += 1) {
        const weekly = Math.floor(Math.floor(result.production[index] / 4) * retention);
        if (weekly <= 0) continue;
        const key = `${index + 1}级${result.productType}`;
        output[key] = (output[key] || 0) + weekly;
      }
    }
    return output;
  }

  function applyIndustryProduce(data, cycles, config = activeConfig) {
    const domain = data?.stat_data?.领地;
    if (!record(domain) || !domain.已建立) return { kinds: 0, goods: {} };
    const store = record(domain.物资库) ? domain.物资库 : (domain.物资库 = {});
    const goods = industryWeeklyGoods(data?.stat_data?.产业, config);
    const multiplier = Math.max(1, Number(cycles) || 1);
    let kinds = 0;
    for (const [key, amount] of Object.entries(goods)) {
      const added = amount * multiplier;
      if (added <= 0) continue;
      store[key] = number(store[key]) + added;
      kinds += 1;
    }
    return { kinds, goods };
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, ...configStatus, books: [...configStatus.books], warnings: [...configStatus.warnings] }); },
    loadConfigs, loadPathways, parseWorldbookJson, principal, parseCurrency, evaluate, dashboard, allocation, create,
    settleWeekly, industryWeeklyGoods, applyIndustryProduce, loadRules, assertRules, sourceOf, load, prepare, project, commit, begin,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      loadSequence++;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !dryRun && !options?.quiet_prompt && !options?.dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
