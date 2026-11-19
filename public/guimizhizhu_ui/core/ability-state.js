(() => {
  'use strict';

  const KEY = 'cryptLord.abilityState';
  const HOST_KEY = 'cryptLord.hostApi';
  const CUSTOM_BOOK = '【源堡】玩家自建内容';
  const LIBRARY_BOOK = '2历史孔隙';
  const PRIMARY_BOOK = '1源堡';
  const BOARD_FIELDS = ['range', 'aoeRadius'];
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let epoch = 0, disposed = false, generating = false, queue = Promise.resolve();
  const subscriptions = [], pools = new WeakMap(), prepared = new WeakMap(), issued = new WeakMap();
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  // BEGIN ORIGINAL ABILITY RULES
/* eslint-disable no-useless-escape */
const containsOldDayAttendant = (s) => String(s || '').includes('旧日侍者');
const resolveOldDayAttendantRank = (sequenceStr) => {
  const seqMatch = String(sequenceStr || '').match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
  return seqMatch ? Number(seqMatch[1]) : 2;
};
const parseSequenceRank = (sequenceStr) => {
      if (!sequenceStr || typeof sequenceStr !== 'string') return 10;
      if (sequenceStr.includes('支柱')) return -2;
      if (containsOldDayAttendant(sequenceStr)) return resolveOldDayAttendantRank(sequenceStr);
      if (sequenceStr.includes('旧日')) return -1;
      const numMatch = sequenceStr.match(/^\d+(?:\.\d+)?$/);
      if (numMatch) return Number(numMatch[0]);
      const seqMatch = sequenceStr.match(/序列[：:\s]*(\d+(?:\.\d+)?)/);
      if (seqMatch) return Number(seqMatch[1]);
      return 10;
};
const getPureName = (nameStr) => {
  if (!nameStr) return "";
  let s = nameStr.replace(/[【】]/g, "").trim();
  // 先剥序列前缀；完整「旧日侍者」保留，避免被「旧日」前缀误伤成「侍者」
  s = s.replace(/^(序列\d+(\.\d+)?)[-—\s]?/, "").trim();
  if (containsOldDayAttendant(s)) return s;
  return s.replace(/^(旧日|支柱)[-—\s]?/, "").trim();
};
const buildAbilityKey = (pathway, rankMatch, tierPrefix) => {
  const rawKey = rankMatch ? `${pathway}-序列${rankMatch[1]}` : `${pathway}-${tierPrefix}`;
  return rawKey.replace(/序列0([0-9])/g, "序列$1");
};
const originalAbilities = GameDBManager => (currentSequenceRaw, isAbilityLocked = false) => {
  if (!currentSequenceRaw || currentSequenceRaw.includes("普通人")) return {};

  const godPathways = GameDBManager.DB.godPathways;
  const sequenceAbilities = GameDBManager.DB.sequenceAbilities;
  if (!godPathways || Object.keys(godPathways).length === 0) return {};

  const fragments = currentSequenceRaw.split(/[/|，,;；与和及以及\s\+&、]/).map((f) => f.trim()).filter(Boolean);
  const pathwayHighestMatch = {};

  fragments.forEach((frag) => {
    const userCoreName = getPureName(frag);
    if (!userCoreName) return;
    for (const [pathwayName, sequences] of Object.entries(godPathways)) {
      const foundIndex = sequences.findIndex((libSeq) => getPureName(libSeq) === userCoreName);
      if (foundIndex !== -1) {
        if (pathwayHighestMatch[pathwayName] === undefined || foundIndex > pathwayHighestMatch[pathwayName]) {
          pathwayHighestMatch[pathwayName] = foundIndex;
        }
      }
    }
  });

  if (Object.keys(pathwayHighestMatch).length === 0) return {};

  const requiredAbilitiesRecord = {};

  Object.entries(pathwayHighestMatch).forEach(([pathway, currentIndex]) => {
    const sequencesInPathway = godPathways[pathway];
    const startIndex = isAbilityLocked ? currentIndex : 0;

    for (let i = startIndex; i <= currentIndex; i++) {
      const seqNameInLib = sequencesInPathway[i];
      const rankMatch = seqNameInLib.match(/序列(\d+(\.\d+)?)/);
      const tierPrefix = rankMatch ? null : seqNameInLib.split("-")[0];
      const abilityKey = buildAbilityKey(pathway, rankMatch, tierPrefix);
      const seqAbilities = sequenceAbilities[abilityKey];

      if (!Array.isArray(seqAbilities) || seqAbilities.length === 0) continue;

      if (!requiredAbilitiesRecord[seqNameInLib]) {
        requiredAbilitiesRecord[seqNameInLib] = [];
      }

      // 【核心修改】：在这里把数据库的英文映射成中文输出
seqAbilities.forEach(ab => {
  if (!requiredAbilitiesRecord[seqNameInLib].some(existing => existing.名称 === ab.name)) {
    // 保留完整的技能对象，包括所有战斗字段
    const fullAbility = {
      名称: ab.name,
      描述: ab.description || "",
      类型: ab.type || "非凡能力"
    };

    // 添加战斗扩展字段（如果存在）
    if (ab.damageType) fullAbility.damageType = ab.damageType;
    if (ab.power !== undefined) fullAbility.power = ab.power;
    if (ab.cost) fullAbility.cost = ab.cost;
    if (ab.targetType) fullAbility.targetType = ab.targetType;
    if (ab.priority !== undefined) fullAbility.priority = ab.priority;

    // ⭐ 新增：映射 effects 数组，确保 valueType 和 stat 字段正确传递
    if (ab.effects && Array.isArray(ab.effects)) {
      fullAbility.effects = ab.effects.map(effect => {
        const mappedEffect = { ...effect };
        // valueType 和 stat 会自动包含在展开的对象中
        // 支持中英文字段名
        if (effect.valueType !== undefined) mappedEffect.valueType = effect.valueType;
        if (effect.数值类型 !== undefined) mappedEffect.数值类型 = effect.数值类型;
        if (effect.stat !== undefined) mappedEffect.stat = effect.stat;
        if (effect.目标属性 !== undefined) mappedEffect.目标属性 = effect.目标属性;
        return mappedEffect;
      });
    }

    if (ab.customDamageCalculator) fullAbility.customDamageCalculator = ab.customDamageCalculator;
    if (ab.isHeal !== undefined) fullAbility.isHeal = ab.isHeal;
    if (ab.healAmt !== undefined) fullAbility.healAmt = ab.healAmt;
    if (ab.healType) fullAbility.healType = ab.healType;
    if (ab.healValueType !== undefined) fullAbility.healValueType = ab.healValueType;
    if (ab.治疗数值类型 !== undefined) fullAbility.治疗数值类型 = ab.治疗数值类型;
    if (ab.triggerTiming) fullAbility.triggerTiming = ab.triggerTiming;

    // 🆕 节点1：添加被动技能字段映射
    if (ab.isPassive !== undefined) fullAbility.isPassive = ab.isPassive;

    // 🆕 节点2：添加标签字段映射（支持空数组）
    if (ab.skillTags !== undefined) fullAbility.skillTags = ab.skillTags;
    if (ab.applyTags !== undefined) fullAbility.applyTags = ab.applyTags;
    if (ab.removeTags !== undefined) fullAbility.removeTags = ab.removeTags;

    // 🆕 节点1：添加 conditionalParams 字段映射
    if (ab.conditionalParams !== undefined) fullAbility.conditionalParams = ab.conditionalParams;

    // 🆕 节点1：棋盘字段映射。range 可以是 0 / "global" / {min,max}，一律不能用 || 兜底
    if (ab.range !== undefined) fullAbility.range = ab.range;
    else if (ab.射程 !== undefined) fullAbility.range = ab.射程;

    if (ab.aoeRadius !== undefined) fullAbility.aoeRadius = ab.aoeRadius;
    else if (ab.范围半径 !== undefined) fullAbility.aoeRadius = ab.范围半径;
    else if (ab.爆炸半径 !== undefined) fullAbility.aoeRadius = ab.爆炸半径;

    requiredAbilitiesRecord[seqNameInLib].push(fullAbility);
  }
});
    }
  });

  return requiredAbilitiesRecord;
};
/* eslint-enable no-useless-escape */
  // END ORIGINAL ABILITY RULES

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
  async function loadPool(guard) {
    const token = epoch;
    check(guard, token);
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    check(guard, token);
    const bound = await host.getCharWorldbookNames('current');
    check(guard, token);
    const primary = bound?.primary || PRIMARY_BOOK;
    const names = [...new Set([CUSTOM_BOOK, ...(bound?.additional || []), LIBRARY_BOOK]
      .filter(name => name && name !== primary)), primary];
    const averages = modules['cryptLord.battleFieldEffectReference']?.averages();
    const pool = { pathways: Object.create(null), abilities: Object.create(null),
      pictureConfig: averages ? { consumableConfig: { avgAttrByRank: averages } } : {}, books: [] };
    const selected = new Map(), consumables = new Map(), revision = { bound: structuredClone(bound), books: [] };
    const configNames = { 序列基准: 'sequenceBase', 'NPC模板': 'npcTemplateConfig',
      神性: 'divinityConfig', 能力体系配置: 'abilitySystemConfig', 能力体系映射: 'abilitySystemDB' };
    for (const name of names) {
      let entries;
      try { entries = await host.getWorldbook(name); }
      catch (error) {
        check(guard, token);
        if (name !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) {
          revision.books.push({ name, missing: true }); continue;
        }
        throw error;
      }
      check(guard, token);
      if (!Array.isArray(entries)) throw new Error(`世界书“${name}”不可读取。`);
      pool.books.push(name);
      const relevant = [];
      for (const entry of entries) {
        const title = String(entry?.name || entry?.comment || '').trim();
        if (title.includes('消耗品配置')) {
          // Unlike pathway libraries, original consumable rules do not include the custom book.
          if (name !== CUSTOM_BOOK || name === primary) {
            relevant.push({ title, content: entry.content });
            consumables.delete(title);
            consumables.set(title, { entry, name });
          }
          continue;
        }
        const kind = title.startsWith('[神之途径]') ? 'pathways' : title.startsWith('[序列能力]') ? 'abilities' : null;
        if (!kind) {
          const configKey = Object.entries(configNames).find(([label]) => title.includes(label))?.[1];
          if (configKey) {
            relevant.push({ title, content: entry.content });
            try {
              const value = parseWorldbookJson(entry.content);
              if (record(value) || configKey === 'divinityConfig' && Array.isArray(value))
                pool.pictureConfig[configKey] = value;
            } catch { /* Missing optional synthesis config uses the original defaults. */ }
          }
          continue;
        }
        relevant.push({ title, content: entry.content });
        selected.set(title, { entry, kind, name });
      }
      revision.books.push({ name, entries: relevant });
    }
    for (const [title, { entry, name }] of consumables) {
      let value;
      try { value = parseWorldbookJson(entry.content); }
      catch { throw Error(`世界书“${name}”的“${title}”消耗品配置不是有效 JSON。`); }
      if (!record(value)) throw Error(`消耗品配置“${title}”须为字典。`);
      const table = value.avgAttrByRank;
      if (table !== undefined && (!record(table) || Object.entries(table).some(([key, row]) =>
        !RESERVED.has(key) && (!Number.isFinite(Number(key)) || !record(row) ||
          ['活力', '敏捷', '灵性', '理智', '人性', '运气']
            .some(stat => !Number.isFinite(row[stat]) || row[stat] < 0)))))
        throw Error(`消耗品配置“${title}”的序列六维均值无效。`);
      pool.pictureConfig.consumableConfig = { ...pool.pictureConfig.consumableConfig,
        ...Object.fromEntries(Object.entries(value).filter(([key]) => !RESERVED.has(key))) };
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
    if (!same(bound, await host.getCharWorldbookNames('current'))) throw Error('能力库绑定读取期间已变化');
    check(guard, token);
    pools.set(pool, { revision, value: structuredClone(pool), host, token });
    return pool;
  }
  async function assertPool(pool, guard) {
    const source = pools.get(pool);
    check(guard, source?.token ?? epoch);
    if (!source) throw Error('玩法规则来源无效，请重新读取');
    if (!same(pool, source.value)) throw Error('玩法规则已修改，请重新读取');
    if (modules[HOST_KEY] !== source.host) throw Error('玩法规则服务已卸载，请重新读取');
    const fresh = await loadPool(guard); check(guard, source.token);
    if (!same(pools.get(fresh)?.revision, source.revision) || !same(fresh, source.value))
      throw Error('玩法规则或角色绑定已变化，未写入');
  }
  function available(pool, sequence, locked) {
    const abilities = Object.create(null);
    for (const [key, entries] of Object.entries(pool.abilities)) {
      if (RESERVED.has(key) || !Array.isArray(entries)) continue;
      abilities[normalizedKey(key)] = entries.flatMap(raw => {
        const mapped = normalizeAbility(raw);
        return mapped ? [{ ...mapped, name: mapped.名称, description: mapped.描述, type: mapped.类型 }] : [];
      });
    }
    const GameDBManager = { DB: { godPathways: Object.fromEntries(Object.entries(pool.pathways)
      .filter(([key, value]) => !RESERVED.has(key) && Array.isArray(value) &&
        value.every(item => typeof item === 'string' && !RESERVED.has(item)))),
    sequenceAbilities: abilities } };
    return originalAbilities(GameDBManager)(String(sequence || ''), Boolean(locked));
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
  function normalizeRecord(value) {
    if (value === undefined || value === null) return {};
    if (!record(value) && !Array.isArray(value)) throw Error('序列能力列表须为分组字典或旧版数组');
    const next = {}, append = (group, item) => {
      if (RESERVED.has(group) || !record(item)) return;
      const name = String(item.名称 || item.name || '').trim();
      if (!name) return;
      const normalized = normalizeAbility({ ...item, name,
        description: String(item.描述 || item.description || '').trim(),
        type: String(item.类型 || item.type || '非凡能力').trim() });
      if (!Object.hasOwn(next, group)) next[group] = [];
      // Native extensions and generated pathway data must survive compatibility normalization.
      next[group].push({ ...structuredClone(item), ...normalized });
    };
    if (Array.isArray(value)) {
      for (const item of value) if (record(item))
        append(String(item.来源序列 || item.fromSequence || item.序列 || '未知来源'), item);
    } else {
      for (const [group, list] of Object.entries(value)) {
        if (RESERVED.has(group)) { if (group === '$meta') next[group] = structuredClone(list); continue; }
        if (group.startsWith('#')) { next[group] = structuredClone(list); continue; }
        if (!Array.isArray(list)) throw Error(`能力分组「${group}」须为列表`);
        for (const item of list) append(group, item);
      }
    }
    return next;
  }
  function synchronize(data, pool, locked = false) {
    if (!record(data?.stat_data) || !record(pool?.pathways) || !record(pool?.abilities)) throw new Error('能力同步数据无效。');
    const sequence = String(data.stat_data.当前序列 || '').trim();
    if (!sequence || sequence.includes('普通人')) throw new Error('当前角色尚无可同步的序列。');
    const required = available(pool, sequence, locked);
    if (!Object.keys(required).length) throw new Error(`世界书中找不到当前序列“${sequence}”的能力条目。`);
    const next = structuredClone(data);
    const stat = next.stat_data;
    if (Array.isArray(stat.序列能力列表)) stat.序列能力列表 = normalizeRecord(stat.序列能力列表);
    if (stat.序列能力列表 !== undefined && !record(stat.序列能力列表)) throw Error('序列能力列表不是分组字典');
    const dictionary = stat.序列能力列表 || (stat.序列能力列表 = {});
    let added = 0;
    let patched = 0;
    let matched = 0;
    for (const [group, entries] of Object.entries(required)) {
      if (RESERVED.has(group)) continue;
      matched += 1;
      if (Object.hasOwn(dictionary, group) && !Array.isArray(dictionary[group])) throw new Error(`能力分组“${group}”不是列表。`);
      if (!Object.hasOwn(dictionary, group)) dictionary[group] = [];
      const list = dictionary[group];
      const existingByName = new Map();
      for (const item of list) if (record(item)) existingByName.set(String(item.名称 || '').trim(), item);
      for (const ability of entries) {
        if (!ability) continue;
        const existing = existingByName.get(ability.名称);
        if (!existing) {
          list.push(ability);
          existingByName.set(ability.名称, ability);
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
    if (!matched) throw new Error('世界书没有与当前序列对应的能力条目。');
    return { data: next, added, patched, matched };
  }
  function groups(data) {
    const source = data?.stat_data?.序列能力列表;
    if (!record(source)) return [];
    return Object.entries(source)
      .filter(([name, abilities]) => !RESERVED.has(name) && Array.isArray(abilities))
      .sort(([left], [right]) => parseSequenceRank(right) - parseSequenceRank(left));
  }
  function managed(group) {
    if (group === '#秘术强化' || group === '#神秘再现') return group.slice(1);
    if (group.startsWith('#空想:')) return '空想';
    if (group.startsWith('#放牧:')) return '放牧';
    return '';
  }
  function projectData(data, pool, isLocked) {
    const draft = structuredClone(data);
    modules['cryptLord.audienceImagination']?.sync(draft, pool, isLocked);
    modules['cryptLord.readerMystic']?.sync(draft, pool);
    modules['cryptLord.mysteryReenactment']?.sync(draft, pool);
    return draft;
  }
  function busyBattle(data) {
    return ['teamBattle', 'personalBattle'].some(key => {
      const battle = data?.cryptLord?.[key];
      return battle?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' &&
          battle.enemy?.npcKey && !battle.experienceClaimed;
    });
  }
  function projectionNeedsPool(data) {
    const stat = data?.stat_data;
    if (!record(stat)) return false;
    const play = stat.$专属玩法;
    return Boolean(play?.观众途径?.空想玩法 || play?.秘祈人途径?.放牧玩法 ||
      play?.阅读者途径?.秘术强化 || play?.窥秘人途径?.神秘再现玩法 ||
      play?.窥秘人途径?.神秘解析玩法 || play?.萨满途径?.设置领地图腾玩法 ||
      stat.$神秘解析上限同步 ||
      Object.keys(stat.序列能力列表 || {}).some(group => Boolean(managed(group))) ||
      ['#空想', '#放牧', '#秘术强化', '#神秘再现', '#神秘解析']
        .some(group => stat.辅助能力列表?.[group]));
  }
  async function prepare(data, { previous, mode = 'save', guard, pool } = {}) {
    const token = epoch; check(guard, token);
    const draft = structuredClone(data), stat = draft?.stat_data;
    const sequence = String(stat?.当前序列 || '').trim();
    const real = Boolean(sequence && !sequence.includes('普通人'));
    // Ordinary saves preserve explicit removals; turns and battle preparation refresh native abilities.
    const refresh = real && (mode !== 'save' || sequence !== String(previous?.当前序列 || '').trim());
    const needs = record(stat) && !busyBattle(draft) && (refresh || projectionNeedsPool(draft));
    if (!needs) {
      const result = { data: draft, skipped: true };
      prepared.set(result, { token, skipped: true }); return result;
    }
    const sourcePool = pool && pools.has(pool) ? pool : await loadPool(guard);
    check(guard, token);
    const source = pools.get(sourcePool);
    check(guard, source?.token);
    if (!same(source?.value, sourcePool)) throw Error('能力数据库已修改，请重新读取');
    const isLocked = locked(draft), services = Object.fromEntries([
      'audienceImaginationState', 'audienceImagination', 'readerMystic', 'mysteryReenactment',
      'mysteryAnalysis', 'shamanTerritoryState', 'audienceImaginationReference',
      'readerRosterState', 'readerReference', 'mysteryRosterState', 'mysteryRosterReference',
    ].map(name => [`cryptLord.${name}`, modules[`cryptLord.${name}`]]));
    let next = draft, added = 0, patched = 0;
    if (refresh && Object.keys(available(sourcePool, sequence, isLocked)).length) {
      const synchronized = synchronize(next, sourcePool, isLocked);
      next = synchronized.data; added = synchronized.added; patched = synchronized.patched;
    }
    modules['cryptLord.audienceImaginationState']?.validate(next);
    next = projectData(next, sourcePool, isLocked);
    modules['cryptLord.mysteryAnalysis']?.syncDisplay(next.stat_data, sourcePool);
    if (next.stat_data.$专属玩法?.萨满途径?.设置领地图腾玩法)
      modules['cryptLord.shamanTerritoryState']?.sync(next, sourcePool);
    const result = { data: next, pool: structuredClone(sourcePool), added, patched,
      refreshed: refresh, unmatched: refresh && !Object.keys(available(sourcePool, sequence, isLocked)).length };
    pools.set(result.pool, source);
    prepared.set(result, { token, services, source, value: structuredClone(result),
      legacyLock: typeof stat.序列能力锁定 !== 'boolean' ? isLocked : undefined });
    await assertPrepared(result, guard);
    return result;
  }
  function signature(result) {
    const ticket = prepared.get(result);
    return ticket?.source ? structuredClone({ revision: ticket.source.revision, pool: ticket.source.value,
      legacyLock: ticket.legacyLock }) : undefined;
  }
  async function assertPrepared(result, guard) {
    const ticket = prepared.get(result);
    if (!ticket) throw Error('能力同步来源无效，请重新准备');
    check(guard, ticket.token);
    if (ticket.skipped) return;
    if (!same(result, ticket.value)) throw Error('能力同步结果已修改，请重新准备');
    if (Object.entries(ticket.services).some(([key, service]) => modules[key] !== service) ||
      modules[HOST_KEY] !== ticket.source.host) throw Error('能力同步服务已卸载，请重新准备');
    if (ticket.legacyLock !== undefined && locked({}) !== ticket.legacyLock)
      throw Error('能力锁定设置已变化，未写入');
    const fresh = await loadPool(guard); check(guard, ticket.token);
    if (!same(pools.get(fresh)?.revision, ticket.source.revision) || !same(fresh, ticket.source.value))
      throw Error('能力库或角色绑定已变化，未写入');
  }
  function locked(data, legacyWindow) {
    const value = data?.stat_data?.序列能力锁定;
    if (typeof value === 'boolean') return value;
    try {
      return (legacyWindow || modules['cryptLord.afterNativeHost']?.getHost()?.window || window)
        .localStorage?.getItem('ST_LoM_AbilityLock') === 'true';
    } catch { return false; }
  }
  function view(data) {
    return groups(data).map(([group, entries]) => ({
      group, managed: managed(group), rank: parseSequenceRank(group),
      entries: entries.map((raw, index) => {
        const invalid = !record(raw) || !String(raw.名称 || '').trim();
        return { index, raw: structuredClone(raw), invalid,
          name: invalid ? '异常条目' : String(raw.名称),
          description: String(raw?.描述 || ''), type: String(raw?.类型 || '非凡能力'),
          selection: { group, index, name: String(raw?.名称 || ''), snapshot: structuredClone(raw) } };
      }),
    }));
  }
  function change(data, operation) {
    if (!record(data) || !record(operation)) throw new Error('能力数据无效。');
    const next = structuredClone(data);
    const stat = next.stat_data;
    if (!record(stat)) throw new Error('当前楼层没有角色状态。');
    const abilities = stat.序列能力列表;
    if (abilities !== undefined && !record(abilities)) throw new Error('序列能力列表不是分组字典。');
    const dictionary = abilities || (stat.序列能力列表 = {});
    if (operation.type === 'lock') {
      if (typeof operation.locked !== 'boolean') throw Error('能力锁定设置无效。');
      stat.序列能力锁定 = operation.locked;
    } else if (operation.type === 'cleanup') {
      for (const [group, list] of groups(next)) {
        if (managed(group)) continue;
        const kept = list.filter(item => record(item) && String(item.名称 || '').trim());
        if (kept.length === list.length) continue;
        if (kept.length) dictionary[group] = kept;
        else delete dictionary[group];
      }
    } else if (operation.type === 'add') {
      const group = String(stat.当前序列 || '').trim();
      const name = String(operation.name || '').trim();
      if (!group || group.includes('普通人')) throw new Error('当前序列尚不能添加能力。');
      if (RESERVED.has(group) || managed(group)) throw new Error('当前序列名称无效。');
      if (!name) throw new Error('能力名称不能为空。');
      if (!['非凡能力', '被动特性', '神之权柄', '旧日象征'].includes(operation.abilityType || '非凡能力'))
        throw Error('能力类型无效。');
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
      if (RESERVED.has(group) || managed(group)) throw new Error('该能力由专属系统管理。');
      if (!Object.hasOwn(dictionary, group) || !Array.isArray(dictionary[group]) || !Number.isInteger(index) || index < 0 || index >= dictionary[group].length) {
        throw new Error('能力已变化，请重新打开列表。');
      }
      if (String(dictionary[group][index]?.名称 || '') !== operation.name) throw new Error('能力已变化，请重新打开列表。');
      if (Object.hasOwn(operation, 'snapshot') && !same(dictionary[group][index], operation.snapshot))
        throw Error('能力内容已变化，请重新读取。');
      dictionary[group].splice(index, 1);
      if (!dictionary[group].length) delete dictionary[group];
    } else {
      throw new Error('未知能力操作。');
    }
    return next;
  }

  function check(guard, token) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw Error('能力操作已取消');
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const service = modules['cryptLord.nativeFloorSource'], dependencies = service.writeDependencies([KEY]);
    const source = await service.read(() => { check(guard, token); return true; });
    check(guard, token);
    const latest = source.rows.at(-1), id = messageId ?? latest?.message_id;
    const floor = source.rows.find(row => row.message_id === id && row.role === 'assistant');
    if (!floor || !Number.isInteger(floor.message_id) || !record(floor.data?.stat_data)) throw Error('所选 assistant 楼层没有角色状态');
    const dictionary = floor.data.stat_data.序列能力列表;
    const malformed = dictionary !== undefined && (!record(dictionary) ||
      Object.entries(dictionary).some(([group, entries]) => !RESERVED.has(group) && !Array.isArray(entries)));
    const pages = source.swipes.filter(row => row.message_id === id);
    const reason = generating ? '正在生成，请等待完整楼层' :
      floor.is_hidden ? '隐藏楼层只读' : latest?.message_id !== id || id === 0 ? '历史楼层只读' : busyBattle(floor.data) ? '请先结束并结算战斗' :
      malformed ? '序列能力列表格式异常，请在变量面板修复' : '';
    const loaded = { floor: structuredClone(floor), latest: structuredClone(latest), pages: structuredClone(pages), groups: view(floor.data),
      locked: locked(floor.data), sequence: String(floor.data.stat_data.当前序列 || ''),
      editable: !reason, reason };
    issued.set(loaded, { source, token, dependencies, signature: service.signature(loaded) });
    return loaded;
  }
  async function project(baseline, guard) {
    const service = modules['cryptLord.nativeFloorSource'], ticket = issued.get(baseline);
    if (!ticket || service.signature(baseline) !== ticket.signature) throw Error('能力读取凭据无效，请重新读取');
    const expected = structuredClone(baseline), { token } = ticket;
    check(guard, token);
    if (!expected?.editable || !['audienceImagination', 'readerMystic', 'mysteryReenactment']
      .some(key => modules[`cryptLord.${key}`]?.sync)) return baseline;
    let pool, warning;
    try { pool = await loadPool(guard); }
    catch (error) { warning = `投影重建失败，显示楼层原记录：${error.message || error}`; }
    check(guard, token);
    await service.assert(ticket.source, () => { check(guard, token); return true; });
    if (locked(expected.floor.data) !== expected.locked ||
      Object.entries(ticket.dependencies).some(([key, value]) => modules[key] !== value))
      throw Error('楼层正文、变量或锁定设置已变化，请重新读取');
    if (pool) {
      try { expected.groups = view(projectData(expected.floor.data, pool, expected.locked)); }
      catch (error) { warning = `投影重建失败，显示楼层原记录：${error.message || error}`; }
    }
    check(guard, token);
    const projected = { ...expected, warning };
    issued.set(projected, { ...ticket, signature: service.signature(projected) });
    return projected;
  }
  function begin(baseline, operation, guard) {
    const service = modules['cryptLord.nativeFloorSource'], ticket = issued.get(baseline);
    if (!ticket || ticket.signature !== service.signature(baseline)) throw Error('能力读取凭据无效，请重新读取');
    const expected = structuredClone(baseline), action = structuredClone(operation), { token, source, dependencies } = ticket;
    check(guard, token);
    if (!expected.editable) throw Error(expected.reason || '当前楼层不可修改');
    let syncPrepared;
    return service.transaction(source, expected.floor.message_id, {
      dependencies, guard: () => {
        check(guard, token);
        if (generating || locked(expected.floor.data) !== expected.locked) throw Error('生成状态或能力锁定已变化，请重新读取');
        return true;
      },
      async beforeWrite() {
        if (syncPrepared) await assertPrepared(syncPrepared, guard);
      },
      async compute(before, valid) {
        let result;
        if (action.type === 'sync') {
          syncPrepared = await prepare(before, { mode: 'turn', guard: valid });
          check(guard, token);
          if (syncPrepared.unmatched) throw Error(`世界书中找不到当前序列“${expected.sequence}”的能力条目。`);
          result = { data: structuredClone(syncPrepared.data), added: syncPrepared.added, patched: syncPrepared.patched };
        } else {
          const data = change(before, action);
          result = { data, removed: action.type === 'cleanup'
            ? groups(before).reduce((count, [, list]) => count + list.length, 0) -
              groups(data).reduce((count, [, list]) => count + list.length, 0) : 0 };
        }
        return { ...result, writeOptions: { abilityPrepared: syncPrepared } };
      },
      async onSaved(result) {
        const loaded = await project(await load(expected.floor.message_id, guard, token), guard);
        return { ...result, loaded, warning: result.warning || (loaded.warning ? `已保存 · ${loaded.warning}` : undefined) };
      },
    });
  }
  function commit(baseline, operation, guard) {
    const action = structuredClone(operation);
    const task = queue.then(() => begin(baseline, action, guard).run());
    queue = task.catch(() => {});
    return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  if (events.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; generating = false; }));
  if (events.GENERATION_STARTED) subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !dryRun && !options?.dryRun && !options?.quiet_prompt) { epoch++; generating = true; }
  }));
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    subscriptions.push(after.bindEvent(event, () => { generating = false; }));

  const api = Object.freeze({
    groups, change, loadPool, available, normalizeRecord, synchronize, parseWorldbookJson, managed, locked, view, load, project, commit, begin,
    busyBattle, projectionNeedsPool, prepare, signature, assertPrepared, assertPool,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
