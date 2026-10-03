(() => {
  'use strict';

  const KEY = 'cryptLord.scrollCrafting';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const YIELD = Object.freeze({ 灵性材料: 1, 魔药辅助材料: 2, 魔药主材料: 10, 非凡特性: 20 });
  const BASE = Object.freeze(['物理攻击', '法术攻击', '精神攻击', '命运攻击',
    '活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复']);
  const EXTRA = Object.freeze(['攻击BUFF', '防御BUFF', '速度BUFF',
    '攻击DEBUFF', '防御DEBUFF', '速度DEBUFF']);
  const ENHANCEMENTS = Object.freeze(['威力', '恢复量', '附加效果幅度', '持续回合',
    '使用灵性消耗', '射程', '全体半径']);
  const RANKS = Object.freeze([-2, -1, 0, .1, .3, .4, .5, .8, .9, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const STORE = '卷轴制造玩法';
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function copy(value) { return structuredClone(value); }
  function rankOf(value) {
    const text = String(value || '');
    if (/支柱/.test(text)) return -2;
    if (/旧日|知识之妖/.test(text)) return -1;
    const match = text.match(/序列\s*(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 10;
  }
  function gate(stat) {
    const text = String(stat?.当前序列 || '');
    if (/知识之妖/.test(text)) return { unlocked: true, rank: -1 };
    const ranks = text.split(/[、,，;；+＋/\n]/).filter(part => /窥秘人/.test(part))
      .map(rankOf).filter(rank => rank <= 9);
    const rank = ranks.length ? Math.min(...ranks)
      : /窥秘人/.test(String(stat?.当前途径 || stat?.途径 || '')) ? rankOf(text) : 10;
    return { unlocked: rank <= 6, rank };
  }
  function rankText(rank) { return rank === -2 ? '支柱' : rank === -1 ? '旧日' : `序列${rank}`; }
  function ranksFor(stat) { const rank = gate(stat).rank; return RANKS.filter(value => value >= rank && value <= 9); }
  function store(stat, create = false) {
    if (!record(stat)) return null;
    if (!record(stat.$专属玩法)) {
      if (!create) return null;
      stat.$专属玩法 = {};
    }
    if (!record(stat.$专属玩法.窥秘人途径)) {
      if (!create) return null;
      stat.$专属玩法.窥秘人途径 = {};
    }
    const pathway = stat.$专属玩法.窥秘人途径;
    if (!record(pathway[STORE])) {
      if (!create) return null;
      pathway[STORE] = { 版本: 1, 卷轴样式: {} };
    }
    if (!record(pathway[STORE].卷轴样式)) {
      if (!create) return null;
      pathway[STORE].卷轴样式 = {};
    }
    return pathway[STORE].卷轴样式;
  }
  function templates(stat) {
    return Object.entries(store(stat) || {}).filter(([key, value]) => key !== '$meta' && record(value))
      .map(([id, data]) => ({ id, data: copy(data) }))
      .sort((a, b) => String(a.data.名称 || '').localeCompare(String(b.data.名称 || ''), 'zh-CN'));
  }
  function isAttack(effect) { return BASE.slice(0, 4).includes(effect); }
  function isHeal(effect) { return BASE.slice(4).includes(effect); }
  function validExtra(base, scope, extra) {
    if (!extra) return true;
    if (!EXTRA.includes(extra) || !['单体', '全体'].includes(scope)) return false;
    return isAttack(base) || (isHeal(base) && (scope === '全体' || !extra.endsWith('DEBUFF')));
  }
  function extrasFor(base, scope) { return EXTRA.filter(extra => validExtra(base, scope, extra)); }
  function applicable(draft) {
    return [...(isAttack(draft.baseEffect) ? ['威力'] : []),
      ...(isHeal(draft.baseEffect) ? ['恢复量'] : []),
      ...(draft.extraEffect ? ['附加效果幅度', '持续回合'] : []),
      '使用灵性消耗', '射程', ...(draft.scope === '全体' ? ['全体半径'] : [])];
  }
  function tier(value) { const n = Number(value); return Number.isInteger(n) && n >= 1 && n <= 3 ? n : 0; }
  function signature(template) {
    return JSON.stringify({ 名称: template.名称, 序列: template.序列, 描述: template.描述,
      战斗效果: template.战斗效果, 增强档位: template.增强档位 });
  }
  function productList(stat) { return record(stat?.消耗品列表) ? stat.消耗品列表 : {}; }
  function hasProduced(stat, id) {
    return Object.values(productList(stat)).some(item => record(item) && item.$卷轴样式ID === id);
  }
  function collision(stat, name, editId, oldName) {
    for (const { id, data } of templates(stat)) {
      if (id === editId) continue;
      const other = String(data.名称 || '').trim();
      if ([other, `强化${other}`].some(value => value === name || value === `强化${name}`)) return '名称与其它样式冲突';
    }
    for (const [key, item] of Object.entries(productList(stat))) {
      if (key === '$meta' || !record(item)) continue;
      const itemName = String(item.名称 || key).trim();
      const own = editId && item.$卷轴样式ID === editId && name === oldName &&
        [oldName, `强化${oldName}`].includes(itemName);
      if (!own && [name, `强化${name}`].includes(itemName)) return `名称与消耗品“${itemName}”冲突`;
    }
    return '';
  }
  function makeTemplate(draft, id, version) {
    const enhancements = {};
    for (const key of applicable(draft)) if (tier(draft.enhancements?.[key])) enhancements[key] = tier(draft.enhancements[key]);
    return { ID: id, 名称: String(draft.name || '').trim(), 序列: rankText(Number(draft.rank)),
      描述: String(draft.description || '').trim(),
      战斗效果: { 基础效果: draft.baseEffect, 范围: draft.scope,
        ...(draft.extraEffect ? { 额外效果: draft.extraEffect } : {}) },
      增强档位: enhancements, 版本: version, '$目标位阶': Number(draft.rank) };
  }
  function validate(stat, draft, editId = '') {
    const errors = [];
    const old = store(stat)?.[editId];
    const name = String(draft?.name || '').trim();
    if (!gate(stat).unlocked) errors.push('当前没有卷轴制造资格');
    if (!name) errors.push('样式名称不能为空');
    if (!BASE.includes(draft?.baseEffect)) errors.push('基础效果无效');
    if (!['单体', '全体'].includes(draft?.scope)) errors.push('范围无效');
    if (!validExtra(draft?.baseEffect, draft?.scope, draft?.extraEffect)) errors.push('额外效果组合无效');
    if (!ranksFor(stat).includes(Number(draft?.rank))) errors.push('目标位阶不合法');
    if (editId && !record(old)) errors.push('样式已不存在');
    if (name) {
      const conflict = collision(stat, name, editId, String(old?.名称 || '').trim());
      if (conflict) errors.push(conflict);
    }
    if (old && hasProduced(stat, editId) && name === String(old.名称 || '').trim() &&
      signature(makeTemplate(draft, editId, old.版本)) !== signature(old)) {
      errors.push('已有库存成品；修改参数必须改名');
    }
    return errors;
  }
  function save(data, draft, editId = '') {
    const stat = data?.stat_data;
    const errors = validate(stat, draft, editId);
    if (errors.length) throw new Error(errors.join('；'));
    const next = copy(data);
    const list = store(next.stat_data, true);
    const id = editId || `scroll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const old = list[id];
    const oldVersion = Math.max(1, Math.floor(Number(old?.版本) || 1));
    const preview = makeTemplate(draft, id, oldVersion);
    list[id] = makeTemplate(draft, id, old && signature(preview) !== signature(old) ? oldVersion + 1 : oldVersion);
    return { data: next, id, changed: !old || signature(preview) !== signature(old) };
  }
  function remove(data, id) {
    const next = copy(data);
    const list = store(next.stat_data);
    if (!record(list?.[id])) throw new Error('样式已不存在');
    delete list[id];
    return next;
  }
  function materials(stat) {
    return Object.entries(stat?.其他列表 || {}).filter(([key, item]) =>
      key !== '$meta' && record(item) && Object.hasOwn(YIELD, String(item.类型 || '')) &&
      Number.isInteger(Number(item.数量)) && Number(item.数量) > 0)
      .map(([key, item]) => ({ key, item: copy(item), name: String(item.名称 || key),
        type: String(item.类型), rank: rankOf(item.序列), available: Number(item.数量),
        perUnit: YIELD[item.类型] }));
  }
  function eligible(material, template) {
    const rank = Number(template?.$目标位阶 ?? rankOf(template?.序列));
    return Boolean(material && template && material.rank <= (rank > 0 && rank < 1 ? 1 : rank));
  }
  function chance(stat, template) {
    const tiers = ENHANCEMENTS.map(key => tier(template.增强档位?.[key])).filter(Boolean);
    if (!tiers.length) return 100;
    const current = Math.max(0, Number(stat.当前灵性) || 0);
    const maximum = Math.max(0, Number(stat.灵性) || 0);
    const ratio = maximum ? Math.min(1, current / maximum) : 0;
    const gap = Math.max(0, Number(template.$目标位阶 ?? rankOf(template.序列)) - gate(stat).rank);
    const raw = 80 + ratio * 20 + Math.min(30, gap * 5) -
      tiers.reduce((sum, value) => sum + ({ 1: 4, 2: 7, 3: 10 })[value], 0) -
      Math.max(0, tiers.length - 2) * 5;
    return Math.max(5, Math.min(95, raw));
  }
  function product(template, enhanced, quantity) {
    const battle = copy(template.战斗效果);
    const healing = isHeal(battle.基础效果);
    const description = String(template.描述 || '').trim();
    const enhancementText = ENHANCEMENTS.filter(key => tier(template.增强档位?.[key]))
      .map(key => `${key}${['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][tier(template.增强档位[key])]}`).join('、');
    return { 名称: enhanced ? `强化${template.名称}` : template.名称,
      序列: template.序列, 类型: '卷轴', 效果: healing ? '恢复' : '杀伤',
      作用属性: healing ? battle.基础效果.replace(/恢复$/, '') : '活力', 战斗效果: battle,
      描述: enhanced ? `${description}${description ? '\n' : ''}此卷轴已增加${enhancementText}能力。` : description,
      数量: quantity, 单位: '张', '$卷轴样式ID': template.ID,
      '$卷轴样式版本': template.版本, '$卷轴快照': signature(template), '$卷轴制造': true,
      ...(enhanced ? { '$卷轴增强': copy(template.增强档位) } : {}) };
  }
  function addProduct(list, template, enhanced, quantity) {
    if (!quantity) return;
    const fresh = product(template, enhanced, quantity);
    const base = `#卷轴:${template.ID}:v${template.版本}:${enhanced ? '强化' : '普通'}`;
    let key = base;
    for (let index = 2; record(list[key]) && list[key].$卷轴快照 !== fresh.$卷轴快照; index += 1) {
      key = `${base}:${index}`;
    }
    if (record(list[key])) list[key].数量 = Number(list[key].数量 || 0) + quantity;
    else list[key] = fresh;
  }
  function rollD100() {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return 1 + value[0] % 100;
    }
    return 1 + Math.floor(Math.random() * 100);
  }
  function craft(data, materialKey, quantity, allocation, roll = rollD100) {
    const stat = data?.stat_data;
    if (!gate(stat).unlocked) throw new Error('当前没有卷轴制造资格');
    const material = materials(stat).find(row => row.key === materialKey);
    if (!material) throw new Error('材料已不存在');
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > material.available) throw new Error('材料数量不足');
    if (!record(allocation)) throw new Error('样式分配无效');
    const rows = [];
    let total = 0;
    const available = store(stat) || {};
    for (const [id, raw] of Object.entries(allocation)) {
      const amount = Number(raw);
      if (!Number.isInteger(amount) || amount < 0) throw new Error('分配数量必须是非负整数');
      if (!amount) continue;
      const template = available[id];
      if (!record(template) || !eligible(material, template) ||
        Number(template.$目标位阶 ?? rankOf(template.序列)) < gate(stat).rank ||
        collision(stat, String(template.名称 || ''), id, String(template.名称 || ''))) {
        throw new Error(`样式 ${id} 不存在、位阶不足或名称冲突`);
      }
      rows.push({ template, amount, chance: chance(stat, template) });
      total += amount;
    }
    if (total !== count * material.perUnit) throw new Error(`必须恰好分配 ${count * material.perUnit} 张`);
    const next = copy(data);
    const source = next.stat_data.其他列表[materialKey];
    if (Number(source.数量) === count) delete next.stat_data.其他列表[materialKey];
    else source.数量 = Number(source.数量) - count;
    if (!record(next.stat_data.消耗品列表)) next.stat_data.消耗品列表 = { $meta: { extensible: true } };
    const results = rows.map(({ template, amount, chance: rate }) => {
      let enhanced = 0;
      if (rate < 100) for (let index = 0; index < amount; index += 1) {
        const result = Number(roll());
        if (!Number.isInteger(result) || result < 1 || result > 100) throw new Error('D100 检定结果无效');
        if (result <= rate) enhanced += 1;
      }
      addProduct(next.stat_data.消耗品列表, template, true, enhanced);
      addProduct(next.stat_data.消耗品列表, template, false, amount - enhanced);
      return { name: template.名称, total: amount, enhanced, normal: amount - enhanced, chance: rate };
    });
    return { data: next, results };
  }

  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    gate, rankOf, rankText, ranksFor, templates, materials, eligible, chance,
    BASE, EXTRA, ENHANCEMENTS, extrasFor, applicable, validate, save, remove, craft,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
