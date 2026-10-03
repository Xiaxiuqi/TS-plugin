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
  async function loadConfigs() {
    const sequence = ++loadSequence;
    activeConfig = DEFAULT_CONFIG;
    configStatus = { source: '默认规则', books: [], accepted: 0, warnings: [] };
    const next = Object.fromEntries(Object.entries(DEFAULT_CONFIG).map(([key, value]) => [
      key, record(value) ? { ...value } : value,
    ]));
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    try {
      const bound = await host.getCharWorldbookNames('current');
      const names = [...new Set(['2历史孔隙', ...(bound?.additional || []), bound?.primary, '1源堡'].filter(Boolean))];
      const warnings = [];
      let accepted = 0;
      const books = [];
      const selected = new Map();
      for (const name of names) {
        let entries;
        try { entries = await host.getWorldbook(name); }
        catch (error) {
          if (/未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) continue;
          throw error;
        }
        if (!Array.isArray(entries)) throw new Error(`世界书“${name}”不可读取。`);
        books.push(name);
        for (const entry of entries) {
          const title = String(entry?.name || entry?.comment || '').trim();
          if (!title.startsWith('【配置') || !title.includes('产业配置')) continue;
          selected.set(title, { name, entry });
        }
      }
      for (const [title, { name, entry }] of selected) {
        try { accepted += applyConfig(next, parseWorldbookJson(entry.content)); }
        catch (error) { warnings.push(`${name} / ${title}: ${error.message}`); }
      }
      if (sequence !== loadSequence) return { ...configStatus };
      activeConfig = accepted ? next : DEFAULT_CONFIG;
      configStatus = { source: accepted ? '世界书配置' : '默认规则', books, accepted, warnings };
      return { ...configStatus };
    } catch (error) {
      if (sequence === loadSequence) {
        activeConfig = DEFAULT_CONFIG;
        configStatus = { source: '默认规则', books: [], accepted: 0, warnings: [String(error?.message || error)] };
      }
      throw error;
    }
  }
  async function loadPathways() {
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    const bound = await host.getCharWorldbookNames('current');
    const names = [...new Set(['2历史孔隙', ...(bound?.additional || []), bound?.primary, '1源堡'].filter(Boolean))];
    const selected = new Map();
    for (const name of names) {
      let entries;
      try { entries = await host.getWorldbook(name); }
      catch (error) {
        if (/未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) continue;
        throw error;
      }
      if (!Array.isArray(entries)) throw new Error(`世界书“${name}”不可读取。`);
      for (const entry of entries) {
        const title = String(entry?.name || entry?.comment || '').trim();
        if (title.startsWith('[神之途径]')) selected.set(title, entry);
      }
    }
    const pathways = Object.create(null);
    for (const entry of selected.values()) {
      const parsed = parseWorldbookJson(entry.content);
      if (!record(parsed)) continue;
      for (const [name, sequences] of Object.entries(parsed)) {
        if (name !== '$meta' && !['__proto__', 'constructor', 'prototype'].includes(name) && Array.isArray(sequences)) {
          pathways[name] = sequences;
        }
      }
    }
    return pathways;
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
    const baseGrossProfit = capital * actualRate / 100;
    const grossProfit = baseGrossProfit >= 0 ? baseGrossProfit * techPotential : baseGrossProfit / techPotential;
    const efficiency = clamp(number(industry?.运营效率, 50), 0, 100);
    const costMultiplier = number(formulas.costMultiplierBase, 2) -
      efficiency / number(formulas.costMultiplierDivisor, 100);
    const fixedCostRate = Math.max(0, number(industry?.固定成本率, 5));
    const actualFixedCost = capital * fixedCostRate / 100 * costMultiplier;
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
    if (index >= result.maxLevel) throw new Error('当前产业规模尚未解锁该等级。');
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100) throw new Error('分配比例必须在 0 到 100 之间。');
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

  function industryWeeklyGoods(industries) {
    const output = {};
    if (!industries || typeof industries !== 'object') return output;
    const retention = clamp(number(activeConfig.industryInjectRetention, 0.75), 0, 1);
    for (const [id, industry] of Object.entries(industries)) {
      if (id === '$meta' || !record(industry)) continue;
      const result = evaluate(industry);
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

  function applyIndustryProduce(data, cycles) {
    const domain = data?.stat_data?.领地;
    if (!record(domain) || !domain.已建立) return { kinds: 0, goods: {} };
    const store = record(domain.物资库) ? domain.物资库 : (domain.物资库 = {});
    const goods = industryWeeklyGoods(data?.stat_data?.产业);
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
    loadConfigs, loadPathways, principal, parseCurrency, evaluate, dashboard, allocation, create,
    settleWeekly, industryWeeklyGoods, applyIndustryProduce,
    dispose() {
      loadSequence++;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
