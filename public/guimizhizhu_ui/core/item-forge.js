(() => {
  'use strict';

  const KEY = 'cryptLord.itemForge';
  const HOST_KEY = 'cryptLord.hostApi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const ATTRIBUTES = Object.freeze(['活力', '灵性', '理智', '人性', '敏捷', '运气']);
  const SEQUENCE_BASE = Object.freeze({
    '-2': 5000000, '-1': 3000000, '0': 1200000, '1': 300000,
    '2': 120000, '3': 40000, '4': 15000, '5': 6000,
    '6': 2500, '7': 1000, '8': 450, '9': 300,
  });
  const ITEM_CONFIG = Object.freeze({
    武器: { p: [.25, .50], n: [.50, .75], pW: [2, 3, 1, 1, 3, 1] },
    衣物: { p: [.20, .45], n: [.45, .65], pW: [4, 2, 3, 1, 2, 1] },
    饰品: { p: [.15, .40], n: [.30, .60], pW: [1, 4, 2, 3, 1, 3] },
    封印物: { p: [.40, .75], n: [.60, .90], pW: [1, 1, 1, 1, 1, 1] },
  });
  const PATHWAY_MATRIX = Object.freeze({ 占卜家: [1, 5, 3, 1, 3, 2] });
  const TRAIT_DB = Object.freeze({
    不可名状: { M: [1, 2, -1, -1, 1, 1], A: [0, 0, 0, 0, 0, 0], n_bias: [2, 3], p_boost: 6, n_boost: 8 },
  });
  const EMPTY_TRAIT = Object.freeze({ M: [0, 0, 0, 0, 0, 0], A: [0, 0, 0, 0, 0, 0], n_bias: [], p_boost: 1, n_boost: 1 });
  let config = { sequenceBase: SEQUENCE_BASE, itemConfig: ITEM_CONFIG, pathwayMatrix: PATHWAY_MATRIX, traitDB: TRAIT_DB };
  let loadedBooks = [];

  function parseWorldbookJson(content) {
    const source = String(content || '').trim().replace(/^```(?:jsonc|json)?\s*/i, '').replace(/\s*```$/, '');
    let clean = '';
    let quoted = false;
    let escaped = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      const next = source[i + 1];
      if (quoted) {
        clean += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') {
        quoted = true;
        clean += char;
      } else if (char === '/' && next === '/') {
        while (i < source.length && source[i] !== '\n') i += 1;
        clean += '\n';
      } else if (char === '/' && next === '*') {
        i += 2;
        while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i += 1;
      } else {
        clean += char;
      }
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
      } else {
        normalized += char;
      }
    }
    return JSON.parse(normalized);
  }
  function sixNumbers(values, allowNegative = false) {
    return Array.isArray(values) && values.length === 6 && values.every(value => Number.isFinite(value) && (allowNegative || value >= 0));
  }
  function applyConfig(next, kind, parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 0;
    let accepted = 0;
    for (const [key, value] of Object.entries(parsed)) {
      if (key === '$meta' || key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      let valid = false;
      if (kind === 'sequenceBase') valid = Number.isFinite(value) && value > 0;
      else if (kind === 'itemConfig') valid = value && Array.isArray(value.p) && Array.isArray(value.n) &&
        value.p.length === 2 && value.n.length === 2 && [...value.p, ...value.n].every(number => Number.isFinite(number) && number >= 0) && sixNumbers(value.pW);
      else if (kind === 'pathwayMatrix') valid = sixNumbers(value);
      else if (kind === 'traitDB') valid = value && sixNumbers(value.M, true) && sixNumbers(value.A, true) &&
        Array.isArray(value.n_bias) && value.n_bias.every(index => Number.isInteger(index) && index >= 0 && index < 6) &&
        Number.isFinite(value.p_boost) && value.p_boost > 0 && Number.isFinite(value.n_boost) && value.n_boost > 0;
      if (valid) { next[kind][key] = value; accepted += 1; }
    }
    return accepted;
  }
  async function loadConfigs() {
    const next = {
      sequenceBase: { ...SEQUENCE_BASE }, itemConfig: { ...ITEM_CONFIG },
      pathwayMatrix: { ...PATHWAY_MATRIX }, traitDB: { ...TRAIT_DB },
    };
    config = next;
    loadedBooks = [];
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    const books = await host.getCharWorldbookNames('current');
    const names = [...new Set([...(books?.additional || []), books?.primary].filter(Boolean))];
    const keys = { 序列基准: 'sequenceBase', 物品参数: 'itemConfig', 途径矩阵: 'pathwayMatrix', 特质图鉴: 'traitDB' };
    let accepted = 0;
    try {
      for (const name of names) {
        const entries = await host.getWorldbook(name);
        for (const entry of entries || []) {
          const kind = Object.entries(keys).find(([label]) => String(entry?.comment || entry?.name || '').includes(label))?.[1];
          if (!kind) continue;
          try { accepted += applyConfig(next, kind, parseWorldbookJson(entry.content)); }
          catch (error) { console.warn(`[${KEY}] 无法解析 ${name} / ${entry.comment || entry.name}`, error); }
        }
      }
    } catch (error) {
      config = { sequenceBase: SEQUENCE_BASE, itemConfig: ITEM_CONFIG, pathwayMatrix: PATHWAY_MATRIX, traitDB: TRAIT_DB };
      throw error;
    }
    config = next;
    loadedBooks = names;
    return { books: names.length, accepted };
  }

  function parseRank(value) {
    const text = String(value ?? '').trim();
    if (text.includes('支柱')) return -2;
    if (text.includes('旧日侍者')) return Number(text.match(/序列[：:\s]*(\d+(?:\.\d+)?)/)?.[1] ?? 2);
    if (text.includes('旧日')) return -1;
    if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
    const match = text.match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 10;
  }
  function baseValue(rank) { return config.sequenceBase[String(rank)] || 200; }
  function cost(item, action) {
    const rank = parseRank(item?.序列 ?? item?.品阶 ?? item?.tier ?? item?.sequence);
    const base = Math.max(10, Math.floor(Math.sqrt(baseValue(rank)) * .5));
    return Math.floor(base * ({ reroll_stats: 1, add_trait: 3, reroll_trait: 2, remove_trait: .5 }[action] || 1));
  }
  function typeFor(item) {
    const text = `${item?.类型 || ''}${item?.名称 || item?.name || ''}`.toLowerCase();
    if (/武器|剑|枪|刀/.test(text)) return '武器';
    if (/衣|甲|袍/.test(text)) return '衣物';
    if (/饰品|环|链/.test(text)) return '饰品';
    return '封印物';
  }
  function range(min, max, random) { return min + random() * (max - min); }
  function mundaneStats(item, random) {
    const type = typeFor(item);
    const weights = (config.itemConfig[type] || ITEM_CONFIG[type]).pW;
    const sum = weights.reduce((a, b) => a + b, 0);
    const total = type === '封印物' ? 40 : 20;
    return Object.fromEntries(ATTRIBUTES.map((attr, i) => [attr, Math.max(0, Math.round(weights[i] / sum * total * range(.8, 1.2, random)))]));
  }
  function allocate(pool, weights, cap) {
    const result = [0, 0, 0, 0, 0, 0];
    let remaining = pool;
    const active = new Set([0, 1, 2, 3, 4, 5]);
    const maximum = pool * .5;
    for (let guard = 0; remaining > .5 && active.size && guard < 20; guard += 1) {
      const sum = [...active].reduce((value, i) => value + weights[i], 0);
      if (sum <= 0) break;
      const overCap = [];
      let distributed = 0;
      for (const i of active) {
        const amount = cap ? Math.min(weights[i] / sum * remaining, Math.max(0, maximum - result[i])) : weights[i] / sum * remaining;
        result[i] += amount;
        distributed += amount;
        if (cap && result[i] >= maximum) overCap.push(i);
      }
      remaining -= distributed;
      overCap.forEach(i => active.delete(i));
    }
    return result.map(Math.round);
  }
  function extraordinaryStats(item, trait, random) {
    const type = typeFor(item);
    const itemConfig = config.itemConfig[type] || ITEM_CONFIG[type];
    const activeTrait = config.traitDB[trait] || EMPTY_TRAIT;
    const weights = config.pathwayMatrix[item?.途径] || itemConfig.pW;
    const base = baseValue(parseRank(item?.序列 ?? item?.品阶 ?? item?.tier ?? item?.sequence));
    const positiveBase = base * range(...itemConfig.p, random);
    const positive = positiveBase * activeTrait.p_boost;
    const negative = positiveBase * range(...itemConfig.n, random) * activeTrait.n_boost;
    const positiveWeights = weights.map((weight, i) => Math.max(.1, weight * (1 + activeTrait.M[i]) + activeTrait.A[i]) * range(.8, 1.2, random));
    const negativeWeights = [0, 0, 0, 0, 0, 0];
    if (activeTrait.n_bias.length) {
      activeTrait.n_bias.forEach(i => { negativeWeights[i] = range(5, 10, random); });
      negativeWeights.forEach((weight, i) => { if (!weight) negativeWeights[i] = range(.1, 1, random); });
    } else {
      const count = Math.floor(random() * 3) + 1;
      const indices = [0, 1, 2, 3, 4, 5].sort(() => .5 - random()).slice(0, count);
      indices.forEach(i => { negativeWeights[i] = range(2, 5, random); });
    }
    const gains = allocate(positive, positiveWeights, type !== '封印物');
    const losses = allocate(negative, negativeWeights, type !== '封印物');
    return Object.fromEntries(ATTRIBUTES.map((attr, i) => [attr, gains[i] - losses[i]]));
  }
  function roll(item, trait = '', random = Math.random) {
    const rank = parseRank(item?.序列 ?? item?.品阶 ?? item?.tier ?? item?.sequence);
    return { 特质: rank === 10 ? '' : trait, ...(rank === 10 ? mundaneStats(item, random) : extraordinaryStats(item, trait, random)) };
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, books: [...loadedBooks], traitCount: Object.keys(config.traitDB).length }); },
    loadConfigs, parseRank, baseValue, cost, roll,
    traits() { return Object.keys(config.traitDB).filter(name => name !== '空'); },
    dispose() { try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
