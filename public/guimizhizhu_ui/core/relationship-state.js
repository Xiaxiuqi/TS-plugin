(() => {
  'use strict';

  const KEY = 'cryptLord.relationshipState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const SUBJECTIVE_FIELDS = Object.freeze([
    ['对你的称呼', '对<User>的称呼'], ['认知身份', '身份'], ['认知性格', '性格'],
    ['认知外貌', '外貌'], ['推测序列', '当前序列'], ['推测体系', '能力体系'],
    ['推测所持物品', '持有物品'], ['推测所处地点', '所处地点'],
  ]);
  const OBJECTIVE_FIELDS = Object.freeze([
    ['真实身份', '身份'], ['真实性格', '性格'], ['真实体系', '能力体系'],
    ['此刻外貌', '外貌'], ['此刻所持物品', '持有物品'], ['此刻所处地点', '所处地点'],
    ['此刻动作', '正在做的事'], ['近期打算', '近期打算'], ['长期目标', '长期目标'],
  ]);
  const ATTRIBUTES = Object.freeze([
    ['活力', '当前活力'], ['灵性', '当前灵性'], ['理智', '当前理智'],
    ['人性', '当前人性'], ['敏捷', '当前敏捷'], ['运气', null],
  ]);
  const RESERVED_KEYS = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function fields(source, definitions) {
    return definitions.flatMap(([label, key]) => {
      const value = source?.[key];
      if (value === undefined || value === null || value === '' || value === '未知' ||
        key === '对<User>的称呼' && value === '<User>') return [];
      return [[label, value]];
    });
  }
  function snapshot(data, key) {
    const subjective = data?.stat_data?.人物关系列表?.[key];
    if (!record(subjective) || RESERVED_KEYS.has(key)) return null;
    const objective = data?.npc_data?.[key];
    return JSON.stringify({
      subjective,
      objective: record(objective) ? objective : null,
    });
  }
  function list(data) {
    const relationships = data?.stat_data?.人物关系列表;
    if (!record(relationships)) return [];
    return Object.entries(relationships)
      .filter(([key, value]) => !RESERVED_KEYS.has(key) && record(value))
      .map(([key, subjective]) => {
        const objective = record(data?.npc_data?.[key]) ? data.npc_data[key] : null;
        const knownName = subjective.名称 && subjective.名称 !== '未知' ? subjective.名称 : key;
        const favorability = Number.parseInt(subjective.好感度, 10);
        const abilities = Array.isArray(objective?.能力清单) ? objective.能力清单
          .filter(record).map(item => [item.名称, item.描述].filter(Boolean).join('：')).filter(Boolean) : [];
        const stats = objective ? ATTRIBUTES.flatMap(([maximum, current]) => {
          if (objective[maximum] == null || objective[maximum] === 'N/A') return [];
          return [[maximum, current && objective[current] != null
            ? `${objective[current]} / ${objective[maximum]}` : String(objective[maximum])]];
        }) : [];
        const statuses = record(objective?.当前状态)
          ? Object.entries(objective.当前状态).filter(([name]) => name !== '$meta')
          : typeof objective?.当前状态 === 'string' && objective.当前状态.trim()
            ? [['状态', objective.当前状态]] : [];
        return {
          key,
          name: String(knownName),
          relationship: String(subjective.关系 ?? '未知'),
          favorability: Number.isFinite(favorability) ? favorability : 0,
          important: objective?.isImportant === true || subjective.isImportant === true,
          subjective: fields(subjective, SUBJECTIVE_FIELDS),
          objective: objective ? {
            sequence: String(objective.当前序列 ?? '普通人'),
            fields: fields(objective, OBJECTIVE_FIELDS),
            stats, statuses, abilities,
          } : null,
          original: snapshot(data, key),
        };
      })
      .sort((left, right) => Number(right.important) - Number(left.important));
  }
  function checked(data, entries) {
    if (!record(data?.stat_data?.人物关系列表) || !Array.isArray(entries) || !entries.length) {
      throw new Error('人物关系已不存在，请重新读取。');
    }
    const seen = new Set();
    entries.forEach(({ key, original }) => {
      if (typeof key !== 'string' || !key || RESERVED_KEYS.has(key) || seen.has(key)) {
        throw new Error('无效的人物关系目标。');
      }
      seen.add(key);
      const current = snapshot(data, key);
      if (current === null) throw new Error('人物关系已不存在，请重新读取。');
      if (current !== original) throw new Error('人物关系已变化，请重新读取。');
    });
    return structuredClone(data);
  }
  function toggleImportant(data, entry) {
    const next = checked(data, [entry]);
    const subjective = next.stat_data.人物关系列表[entry.key];
    const objective = record(next.npc_data?.[entry.key]) ? next.npc_data[entry.key] : null;
    const important = !(objective?.isImportant === true || subjective.isImportant === true);
    subjective.isImportant = important;
    if (objective) objective.isImportant = important;
    return next;
  }
  function removeMany(data, entries) {
    const next = checked(data, entries);
    entries.forEach(({ key }) => {
      delete next.stat_data.人物关系列表[key];
      if (record(next.npc_data)) delete next.npc_data[key];
    });
    return next;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    list, toggleImportant, removeMany,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
