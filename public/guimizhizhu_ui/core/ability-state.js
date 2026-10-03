(() => {
  'use strict';

  const KEY = 'cryptLord.abilityState';
  const HOST_KEY = 'cryptLord.hostApi';
  const CUSTOM_BOOK = '【源堡】玩家自建内容';
  const LIBRARY_BOOK = '2历史孔隙';
  const PRIMARY_BOOK = '1源堡';
  const BOARD_FIELDS = ['range', 'aoeRadius'];
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
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
        let next = i + 1;
        while (next < clean.length && /\s/.test(clean[next])) next += 1;
        if (clean[next] !== '}' && clean[next] !== ']') normalized += char;
      } else {
        normalized += char;
      }
    }
    return JSON.parse(normalized);
  }
  function normalizedKey(value) {
    return String(value || '').replace(/\s+/g, '').replace(/序列0([0-9])/g, '序列$1');
  }
  async function loadPool() {
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    const bound = await host.getCharWorldbookNames('current');
    const primary = bound?.primary || PRIMARY_BOOK;
    const names = [...new Set([CUSTOM_BOOK, ...(bound?.additional || []), LIBRARY_BOOK, primary].filter(Boolean))];
    const pool = { pathways: Object.create(null), abilities: Object.create(null),
      pictureConfig: {}, books: [] };
    const selected = new Map();
    const configNames = { 序列基准: 'sequenceBase', 'NPC模板': 'npcTemplateConfig',
      能力体系配置: 'abilitySystemConfig', 能力体系映射: 'abilitySystemDB' };
    for (const name of names) {
      let entries;
      try { entries = await host.getWorldbook(name); }
      catch (error) {
        if (name !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) continue;
        throw error;
      }
      if (!Array.isArray(entries)) throw new Error(`世界书“${name}”不可读取。`);
      pool.books.push(name);
      for (const entry of entries) {
        const title = String(entry?.name || entry?.comment || '').trim();
        const kind = title.startsWith('[神之途径]') ? 'pathways' : title.startsWith('[序列能力]') ? 'abilities' : null;
        if (!kind) {
          const configKey = Object.entries(configNames).find(([label]) => title.includes(label))?.[1];
          if (configKey) {
            try {
              const value = parseWorldbookJson(entry.content);
              if (record(value)) pool.pictureConfig[configKey] = value;
            } catch { /* Missing optional synthesis config uses the original defaults. */ }
          }
          continue;
        }
        selected.set(title, { entry, kind, name });
      }
    }
    for (const { entry, kind, name } of selected.values()) {
      let parsed;
      try { parsed = parseWorldbookJson(entry.content); }
      catch { throw new Error(`世界书“${name}”的“${entry.comment || entry.name}”不是有效 JSON。`); }
      if (!record(parsed)) throw new Error(`世界书“${name}”的“${entry.comment || entry.name}”不是字典。`);
      for (const [key, value] of Object.entries(parsed)) {
        if (key === '$meta' || ['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        const targetKey = kind === 'abilities' ? normalizedKey(key) : key.trim();
        if (targetKey && !['__proto__', 'constructor', 'prototype'].includes(targetKey)) pool[kind][targetKey] = value;
      }
    }
    if (!Object.keys(pool.pathways).length || !Object.keys(pool.abilities).length) {
      throw new Error('源堡及角色绑定世界书未提供[神之途径]及[序列能力]数据库。');
    }
    return pool;
  }
  function pureName(value) {
    const text = String(value || '').replace(/[【】]/g, '').trim()
      .replace(/^序列\d+(?:\.\d+)?[-—\s]?/, '').trim();
    if (text.includes('旧日侍者')) return text;
    return text.replace(/^(旧日|支柱)[-—\s]?/, '').trim();
  }
  function normalizeAbility(value) {
    if (!record(value)) return null;
    const name = String(value.name ?? value.名称 ?? '').trim();
    if (!name) return null;
    const result = {
      名称: name,
      描述: String(value.description ?? value.描述 ?? ''),
      类型: String(value.type ?? value.类型 ?? '非凡能力'),
    };
    for (const field of [
      'damageType', 'power', 'cost', 'targetType', 'priority', 'effects',
      'customDamageCalculator', 'isHeal', 'healAmt', 'healType', 'healValueType',
      '治疗数值类型', 'triggerTiming', 'isPassive', 'skillTags', 'applyTags',
      'removeTags', 'conditionalParams',
    ]) {
      if (value[field] !== undefined) result[field] = structuredClone(value[field]);
    }
    if (value.range !== undefined || value.射程 !== undefined) {
      result.range = structuredClone(value.range !== undefined ? value.range : value.射程);
    }
    if (value.aoeRadius !== undefined || value.范围半径 !== undefined || value.爆炸半径 !== undefined) {
      result.aoeRadius = structuredClone(value.aoeRadius !== undefined ? value.aoeRadius :
        value.范围半径 !== undefined ? value.范围半径 : value.爆炸半径);
    }
    return result;
  }
  function synchronize(data, pool, locked = false) {
    if (!record(data?.stat_data) || !record(pool?.pathways) || !record(pool?.abilities)) throw new Error('能力同步数据无效。');
    const sequence = String(data.stat_data.当前序列 || '').trim();
    if (!sequence || sequence.includes('普通人')) throw new Error('当前角色尚无可同步的序列。');
    const highest = Object.create(null);
    const fragments = sequence.split(/[/|，,;；与和及以及\s+&、]/).map(part => pureName(part)).filter(Boolean);
    for (const fragment of fragments) {
      for (const [pathway, sequences] of Object.entries(pool.pathways)) {
        if (!Array.isArray(sequences)) continue;
        const index = sequences.findIndex(item => pureName(item) === fragment);
        if (index >= 0) highest[pathway] = Math.max(highest[pathway] ?? -1, index);
      }
    }
    if (!Object.keys(highest).length) throw new Error(`世界书中找不到当前序列“${sequence}”。`);
    const next = structuredClone(data);
    const stat = next.stat_data;
    if (stat.序列能力列表 !== undefined && !record(stat.序列能力列表)) throw new Error('序列能力列表不是分组字典。');
    const dictionary = stat.序列能力列表 || (stat.序列能力列表 = {});
    let added = 0;
    let patched = 0;
    let matched = 0;
    for (const [pathway, currentIndex] of Object.entries(highest)) {
      for (let index = locked ? currentIndex : 0; index <= currentIndex; index += 1) {
        const group = pool.pathways[pathway][index];
        if (typeof group !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(group)) continue;
        const rank = group.match(/序列(\d+(?:\.\d+)?)/);
        const key = normalizedKey(`${pathway}-${rank ? `序列${rank[1]}` : group.split('-')[0]}`);
        const entries = pool.abilities[key];
        if (!Array.isArray(entries) || !entries.length) continue;
        matched += 1;
        if (Object.hasOwn(dictionary, group) && !Array.isArray(dictionary[group])) throw new Error(`能力分组“${group}”不是列表。`);
        if (!Object.hasOwn(dictionary, group)) dictionary[group] = [];
        const list = dictionary[group];
        for (const raw of entries) {
          const ability = normalizeAbility(raw);
          if (!ability) continue;
          const existing = list.find(item => String(item?.名称 || '').trim() === ability.名称);
          if (!existing) {
            list.push(ability);
            added += 1;
          } else {
            for (const field of BOARD_FIELDS) {
              if (existing[field] === undefined && ability[field] !== undefined) {
                existing[field] = ability[field];
                patched += 1;
              }
            }
          }
        }
      }
    }
    if (!matched) throw new Error('世界书没有与当前序列对应的能力条目。');
    return { data: next, added, patched, matched };
  }
  function groups(data) {
    const source = data?.stat_data?.序列能力列表;
    if (!record(source)) return [];
    return Object.entries(source)
      .filter(([name, abilities]) => name !== '$meta' && Array.isArray(abilities))
      .sort(([left], [right]) => {
        const rank = name => Number(name.match(/序列(\d+)/)?.[1] ?? -1);
        return rank(right) - rank(left);
      });
  }
  function change(data, operation) {
    if (!record(data) || !record(operation)) throw new Error('能力数据无效。');
    const next = structuredClone(data);
    const stat = next.stat_data;
    if (!record(stat)) throw new Error('当前楼层没有角色状态。');
    const abilities = stat.序列能力列表;
    if (abilities !== undefined && !record(abilities)) throw new Error('序列能力列表不是分组字典。');
    const dictionary = abilities || (stat.序列能力列表 = {});
    if (operation.type === 'add') {
      const group = String(stat.当前序列 || '').trim();
      const name = String(operation.name || '').trim();
      if (!group || group.includes('普通人')) throw new Error('当前序列尚不能添加能力。');
      if (['__proto__', 'constructor', 'prototype'].includes(group)) throw new Error('当前序列名称无效。');
      if (!name) throw new Error('能力名称不能为空。');
      if (groups(next).some(([, items]) => items.some(item => String(item?.名称 || '').trim() === name))) {
        throw new Error('已存在同名能力。');
      }
      if (Object.hasOwn(dictionary, group) && !Array.isArray(dictionary[group])) throw new Error('当前序列分组不是列表。');
      if (!Object.hasOwn(dictionary, group)) dictionary[group] = [];
      dictionary[group].push({
        名称: name,
        描述: String(operation.description || '').trim() || '无详细描述。',
        类型: String(operation.abilityType || '非凡能力'),
      });
    } else if (operation.type === 'remove') {
      const group = String(operation.group || '');
      const index = operation.index;
      if (group === '#秘术强化' || group === '#神秘再现' ||
        group.startsWith('#空想:') || group.startsWith('#放牧:')) throw new Error('该能力由专属系统管理。');
      if (!Object.hasOwn(dictionary, group) || !Array.isArray(dictionary[group]) || !Number.isInteger(index) || index < 0 || index >= dictionary[group].length) {
        throw new Error('能力已变化，请重新打开列表。');
      }
      if (String(dictionary[group][index]?.名称 || '') !== operation.name) throw new Error('能力已变化，请重新打开列表。');
      dictionary[group].splice(index, 1);
      if (!dictionary[group].length) delete dictionary[group];
    } else {
      throw new Error('未知能力操作。');
    }
    return next;
  }

  const api = Object.freeze({
    groups, change, loadPool, synchronize,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
