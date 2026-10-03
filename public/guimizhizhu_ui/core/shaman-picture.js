(() => {
  'use strict';

  const KEY = 'cryptLord.shamanPicture';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const ATTRS = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
  const BASE = { 0: 1200000, 1: 300000, 2: 120000, 3: 40000, 4: 15000,
    5: 6000, 6: 2500, 7: 1000, 8: 450, 9: 300 };
  const DEFAULT_RATES = { 活力: .35, 敏捷: .2, 灵性: .2, 理智: .1, 人性: .1, 运气: .05 };
  const AVG_SPIRIT = { '-2': 1075000, '-1': 645000, 0: 258000,
    0.1: 193500, 0.3: 129000, 0.4: 118250, 0.5: 107500, 0.8: 86000, 0.9: 75250, 1: 64500,
    2: 25800, 3: 8600, 4: 3225, 5: 1290, 6: 537, 7: 215, 8: 96, 9: 64 };
  const STORE = '制造画中人玩法';
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function copy(value) { return structuredClone(value); }
  function gate(stat) {
    const territory = modules['cryptLord.shamanTerritory']?.gate(stat);
    return { unlocked: Boolean(territory?.unlocked && territory.rank <= 5), rank: territory?.rank ?? 10 };
  }
  function list(stat, create = false) {
    if (!record(stat)) return {};
    if (create) {
      stat.$专属玩法 ||= {};
      stat.$专属玩法.萨满途径 ||= {};
      stat.$专属玩法.萨满途径[STORE] ||= { 版本: 1, 画中人列表: {} };
    }
    return stat.$专属玩法?.萨满途径?.[STORE]?.画中人列表 || {};
  }
  function records(data) {
    return Object.entries(list(data?.stat_data))
      .filter(([id, row]) => id !== '$meta' && record(row) && record(row.角色卡))
      .map(([id, row]) => ({ id, name: String(row.名称 || row.角色卡.名称 || id),
        pathway: String(row.途径 || ''), rank: Number(row.制造位阶), card: copy(row.角色卡) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }
  function choices(pool, stat) {
    const access = gate(stat);
    if (!access.unlocked || !record(pool?.pathways)) return [];
    const rank = Math.max(0, Math.min(9, access.rank > 0 ? Math.ceil(access.rank) : 0));
    return Object.entries(pool.pathways).flatMap(([key, sequences]) => {
      const source = Array.isArray(sequences) && sequences.find(seq =>
        modules['cryptLord.scrollCrafting']?.rankOf(seq) === rank);
      if (!source) return [];
      const sequence = access.rank > 0 && !Number.isInteger(access.rank)
        ? `序列${access.rank}-${String(source).replace(/^序列\d+(?:\.\d+)?[-—\s]?/, '')}` : source;
      return [{ key, pathway: key.replace(/途径$/, ''), sequence }];
    }).sort((a, b) => a.pathway.localeCompare(b.pathway, 'zh-CN'));
  }
  function ratesFor(pool, sequence) {
    const config = pool?.pictureConfig || {};
    const mapping = Object.entries(config.abilitySystemDB || {})
      .find(([name]) => sequence.includes(name))?.[1];
    const system = config.abilitySystemConfig || {};
    const name = mapping || system.defaultSystem;
    const rates = system.systems?.[system.aliases?.[name] || name] || DEFAULT_RATES;
    if (!ATTRS.every(attr => Number.isFinite(Number(rates[attr])) && Number(rates[attr]) >= 0)
      || Math.abs(ATTRS.reduce((sum, attr) => sum + Number(rates[attr]), 0) - 1) > .001) {
      throw new Error('能力体系配置无法分配六维属性。');
    }
    return { name: name || '物理突击系', rates };
  }
  function abilitiesFor(pool, key, rank) {
    const groups = [];
    const sequences = pool.pathways[key];
    for (const sequence of sequences) {
      const tier = modules['cryptLord.scrollCrafting']?.rankOf(sequence);
      if (tier < rank || tier > 9) continue;
      const abilityKey = `${key}-序列${tier}`.replace(/\s+/g, '');
      const entries = pool.abilities?.[abilityKey];
      if (Array.isArray(entries)) entries.forEach(ability => {
        if (record(ability) && String(ability.name || ability.名称 || '').trim()) {
          groups.push({ ...copy(ability), seqRank: tier });
        }
      });
    }
    if (!groups.length) throw new Error('目标途径缺少可用的序列能力条目。');
    const maximum = rank <= 0 ? 15 : Math.max(5, 15 - rank);
    const result = [];
    while (groups.length && result.length < maximum) {
      const weights = groups.map(item => 3 ** Math.max(0, 10 - item.seqRank));
      let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
      let selected = weights.findIndex(weight => (roll -= weight) <= 0);
      if (selected < 0) selected = groups.length - 1;
      const { seqRank, ...ability } = groups.splice(selected, 1)[0];
      result.push({ seqRank, ability: {
        ...ability,
        名称: String(ability.名称 || ability.name || ''),
        描述: String(ability.描述 || ability.description || ''),
        类型: String(ability.类型 || ability.type || '非凡能力'),
      } });
    }
    return result.sort((a, b) => a.seqRank - b.seqRank).map(row => row.ability);
  }
  function synthesize(pool, choice, access) {
    const rank = Math.max(0, Math.min(9, access.rank));
    const nameRank = Math.ceil(rank);
    const { name, rates } = ratesFor(pool, choice.sequence);
    const config = pool.pictureConfig || {};
    const base = Number(config.sequenceBase?.[String(rank)] || BASE[String(rank)] || 200);
    const template = rank <= 2 ? '首领' : rank <= 4 ? '头目' : rank <= 7 ? '精英' : '普通';
    const multiplier = Number(config.npcTemplateConfig?.multipliers?.[template] ||
      { 首领: 3, 头目: 2, 精英: 1.4, 普通: 1 }[template]);
    const quota = base * multiplier;
    const values = ATTRS.map(attr => {
      const exact = quota * rates[attr];
      return { attr, value: Math.floor(exact), remainder: exact % 1 };
    });
    const rest = Math.round(quota - values.reduce((sum, row) => sum + row.value, 0));
    values.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < rest; i += 1) values[i % values.length].value += 1;
    const card = { 当前序列: choice.sequence, 模板: template, 能力体系: name,
      神性: rank <= 0 ? 2 : rank <= 2 ? 1.5 : rank <= 4 ? 1.3 : 1,
      能力清单: abilitiesFor(pool, choice.key, nameRank) };
    values.forEach(({ attr, value }) => {
      card[attr] = Math.max(1, Math.round(value));
      if (attr !== '运气') card[`当前${attr}`] = card[attr];
    });
    return card;
  }
  function summonCost(rank) {
    const value = Number(AVG_SPIRIT[String(rank)] ?? AVG_SPIRIT[String(Math.ceil(rank))] ?? AVG_SPIRIT[9]);
    return Math.max(1, Math.round(value * .05));
  }
  function craft(data, pool, pathwayKey, quantities) {
    if (!record(data?.stat_data)) throw new Error('当前楼层没有角色状态。');
    const access = gate(data.stat_data);
    const choice = choices(pool, data.stat_data).find(row => row.key === pathwayKey);
    if (!choice) throw new Error('萨满位阶或目标途径已变化。');
    const materials = modules['cryptLord.scrollCrafting']?.materials(data.stat_data) || [];
    const selected = Object.entries(quantities || {}).filter(([, qty]) => Number(qty) > 0)
      .map(([key, qty]) => {
        const item = materials.find(row => row.key === key);
        if (!item || !Number.isInteger(Number(qty)) || Number(qty) > item.available) {
          throw new Error('材料已变化或数量无效。');
        }
        return { ...item, qty: Number(qty) };
      });
    const total = selected.reduce((sum, item) => sum + item.qty * item.perUnit, 0);
    if (total < 10) throw new Error('至少需要 10 点材料，整件消耗且溢出不返还。');
    const card = synthesize(pool, choice, access);
    const next = copy(data);
    selected.forEach(row => {
      const item = next.stat_data.其他列表[row.key];
      item.数量 -= row.qty;
      if (item.数量 <= 0) delete next.stat_data.其他列表[row.key];
    });
    const existing = new Set(records(next).map(row => row.name));
    const base = `${choice.pathway}画中人`;
    let name = base;
    for (let index = 2; existing.has(name); index += 1) name = `${base}·${index}`;
    card.名称 = name;
    const id = `picture-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    list(next.stat_data, true)[id] = { ID: id, 名称: name, 途径: choice.pathway,
      当前序列: choice.sequence, 制造位阶: access.rank,
      制造时间: String(next.world_data?.当前时间纪元 || ''), 角色卡: card };
    return { data: next, id, name, total };
  }
  function removeLoss(data, id) {
    const rows = list(data?.stat_data);
    if (Object.hasOwn(rows, id)) delete rows[id];
  }
  const api = Object.freeze({
    gate, records, choices, craft, removeLoss, synthesize, summonCost,
    status() { return Object.freeze({ key: KEY, ready: true }); },
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
