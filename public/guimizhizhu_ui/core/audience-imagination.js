(() => {
  'use strict';

  const KEY = 'cryptLord.audienceImagination';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const PATH = '观众途径';
  const PREFIX = '#空想:';
  const GRAZE_PREFIX = '#放牧:';
  const invalid = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const copy = value => structuredClone(value);
  const fragments = value => String(value || '').split(/[/|，,;；与和及以及\s+&、]/).map(x => x.trim()).filter(Boolean);
  const rankOf = value => {
    const match = String(value || '').match(/序列\s*(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
    return /旧日|支柱|上帝/.test(String(value || '')) ? 0 : null;
  };
  const pure = value => String(value || '').replace(/^序列\s*\d+(?:\.\d+)?[-—\s]*/, '').trim();
  const normalizedKey = value => String(value || '').replace(/\s+/g, '').replace(/序列0([0-9])/g, '序列$1');
  const sequences = (pool, pathway) => Array.isArray(pool?.pathways?.[pathway]) ? pool.pathways[pathway] : [];

  function pathwayFor(pool, fragment) {
    for (const [pathway, entries] of Object.entries(pool?.pathways || {})) {
      if (!Array.isArray(entries)) continue;
      if (entries.some(value => value === fragment || pure(value) === pure(fragment))) return pathway;
    }
    return '';
  }

  function owned(pool, sequence) {
    return new Set(fragments(sequence).map(fragment => pathwayFor(pool, fragment)).filter(Boolean));
  }

  function gate(pool, sequence) {
    const source = String(sequence || '');
    if (source.includes('上帝')) return { unlocked: true, rank: 0, slots: 2 };
    const audience = fragments(source).filter(fragment => pathwayFor(pool, fragment) === PATH);
    const ranks = audience.map(rankOf).filter(rank => rank !== null);
    if (!ranks.length) return { unlocked: false, rank: null, slots: 0 };
    const best = Math.min(...ranks);
    return { unlocked: best <= 1, rank: best <= 0 ? 0 : 1, slots: best <= 0 ? 2 : 1 };
  }

  function canonical(pool, pathway, rank) {
    return sequences(pool, pathway).find(value => rankOf(value) === rank) || '';
  }

  function stored(data) {
    const play = data?.stat_data?.$专属玩法?.[PATH]?.空想玩法;
    const slots = play?.空想栏位;
    return {
      slots: [1, 2].map(index => String(slots?.[`栏位${index}`]?.途径 || '').trim()),
      used: Math.max(0, Math.min(2, Math.floor(Number(play?.分离序列1特性?.已使用次数) || 0))),
    };
  }

  function grazeSelections(data, effectiveGate) {
    if (effectiveGate === undefined || effectiveGate === null) return [];
    const play = data?.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法;
    const souls = record(play?.灵魂列表) ? play.灵魂列表 : {};
    const cap = effectiveGate <= 0 ? 5 : effectiveGate <= 3 ? 3 : 1;
    const seen = new Set();
    return (Array.isArray(play?.激活灵魂) ? play.激活灵魂 : [])
      .flatMap(name => {
        const sequence = String(souls[name]?.当前序列 || '').trim();
        if (typeof name !== 'string' || invalid.has(name) || seen.has(name) || !sequence) return [];
        seen.add(name);
        return [{ name, sequence }];
      }).slice(0, cap);
  }

  function selections(pool, data, owner, slots) {
    const real = String(data?.stat_data?.当前序列 || '').trim();
    const seen = owned(pool, real);
    const result = [];
    slots.slice(0, owner.slots).forEach((pathway, index) => {
      if (!pathway || seen.has(pathway) || !sequences(pool, pathway).length) return;
      const sequence = canonical(pool, pathway, owner.rank);
      if (!sequence) return;
      seen.add(pathway);
      result.push({ slot: index + 1, pathway, sequence, rank: owner.rank });
    });
    return result;
  }

  function strongest(pool, sequence, additions) {
    const result = [];
    const index = new Map();
    for (const fragment of fragments([sequence, ...additions].filter(Boolean).join('/'))) {
      const pathway = pathwayFor(pool, fragment);
      if (!pathway || !index.has(pathway)) {
        if (pathway) index.set(pathway, result.length);
        if (!result.includes(fragment)) result.push(fragment);
      } else {
        const at = index.get(pathway);
        if ((rankOf(fragment) ?? 10) < (rankOf(result[at]) ?? 10)) result[at] = fragment;
      }
    }
    return result.join('/');
  }

  function resolve(pool, data, override = null) {
    const real = String(data?.stat_data?.当前序列 || '').trim();
    const slots = override || stored(data).slots;
    const directGate = gate(pool, real);
    const directImagined = selections(pool, data, directGate, slots);
    const directGrazeRank = fragments(real).filter(fragment => pathwayFor(pool, fragment) === '秘祈人途径')
      .map(rankOf).filter(rank => rank !== null && rank <= 5).sort((a, b) => a - b)[0];
    const title = real.includes('上帝');
    const directGrazed = grazeSelections(data, title ? 0 : directGrazeRank);
    const grantAudience = strongest(pool, real, directGrazed.map(row => row.sequence));
    const imaginationGate = gate(pool, grantAudience);
    const imagined = selections(pool, data, imaginationGate, slots);
    const grantGraze = strongest(pool, real, directImagined.map(row => row.sequence));
    const grazeRank = title ? 0 : fragments(grantGraze)
      .filter(fragment => pathwayFor(pool, fragment) === '秘祈人途径')
      .map(rankOf).filter(rank => rank !== null && rank <= 5).sort((a, b) => a - b)[0];
    const grazed = grazeSelections(data, grazeRank);
    return {
      real, directImaginationGate: directGate,
      directGrazingGate: { unlocked: title || directGrazeRank !== undefined,
        rank: title ? -2 : directGrazeRank ?? null },
      imaginationGate, grazingGate: { unlocked: title || grazeRank !== undefined,
        rank: title ? -2 : grazeRank ?? null },
      imagined, grazed,
      effectiveSequence: strongest(pool, real, [...imagined, ...grazed].map(row => row.sequence)) || real,
    };
  }

  function validate(pool, data, values) {
    const snapshot = resolve(pool, data);
    if (!snapshot.imaginationGate.unlocked) throw new Error('当前不具备观众空想资格。');
    if (!Array.isArray(values) || values.length !== 2) throw new Error('需要两个空想栏位。');
    const selected = values.map(value => String(value || '').trim()).filter(Boolean);
    if (new Set(selected).size !== selected.length) throw new Error('两个栏位不能选择同一途径。');
    for (const [index, raw] of values.entries()) {
      const pathway = String(raw || '').trim();
      if (!pathway) continue;
      if (invalid.has(pathway) || !sequences(pool, pathway).length) throw new Error(`世界书中没有“${pathway}”。`);
      if (index < snapshot.imaginationGate.slots &&
        !canonical(pool, pathway, snapshot.imaginationGate.rank)) throw new Error(`“${pathway}”缺少对应序列。`);
    }
    return snapshot;
  }

  function save(data, pool, values, locked = false) {
    validate(pool, data, values);
    const next = copy(data);
    const stat = next.stat_data;
    const rootPlay = stat.$专属玩法 || (stat.$专属玩法 = {});
    const pathway = rootPlay[PATH] || (rootPlay[PATH] = {});
    const play = pathway.空想玩法 || (pathway.空想玩法 = {});
    play.版本 = Math.max(2, Number(play.版本) || 0);
    play.空想栏位 = Object.fromEntries(values.map((value, index) =>
      [`栏位${index + 1}`, { 途径: String(value || '').trim() }]));
    sync(next, pool, locked);
    modules['cryptLord.readerMystic']?.sync(next, pool);
    modules['cryptLord.mysteryReenactment']?.sync(next, pool);
    return next;
  }

  function separate(data, pool) {
    const owner = resolve(pool, data).imaginationGate;
    if (!owner.unlocked || owner.rank !== 0) throw new Error('序列0或“上帝”才能分离作家特性。');
    if (stored(data).used >= 2) throw new Error('两次永久额度已用尽。');
    const next = copy(data);
    const stat = next.stat_data;
    const rootPlay = stat.$专属玩法 || (stat.$专属玩法 = {});
    const pathway = rootPlay[PATH] || (rootPlay[PATH] = {});
    const play = pathway.空想玩法 || (pathway.空想玩法 = {});
    play.版本 = Math.max(2, Number(play.版本) || 0);
    const used = stored(data).used + 1;
    play.分离序列1特性 = { 已使用次数: used };
    const items = record(stat.其他列表) ? stat.其他列表 : (stat.其他列表 = { $meta: { extensible: true } });
    let key = Object.keys(items).find(k => k !== '$meta' && items[k]?.名称 === '作家特性');
    if (!key) {
      key = '作家特性';
      for (let suffix = 2; Object.hasOwn(items, key); suffix += 1) key = `作家特性#${suffix}`;
    }
    const previous = items[key];
    const quantity = Number(previous?.数量);
    items[key] = { ...(record(previous) ? previous : {}), 名称: '作家特性',
      描述: '观众途径序列1作家的非凡特性', 途径: PATH, 序列: '序列1',
      数量: previous ? (Number.isFinite(quantity) && quantity >= 0 ? quantity : 1) + 1 : 1, 单位: '份' };
    return next;
  }

  function abilityRows(pool, selection, locked) {
    const entries = sequences(pool, selection.pathway);
    const end = entries.indexOf(selection.sequence);
    return entries.slice(locked ? end : 0, end + 1).flatMap(sequence => {
      const match = sequence.match(/序列\s*(\d+(?:\.\d+)?)/);
      const key = normalizedKey(`${selection.pathway}-${match ? `序列${match[1]}` : sequence.split('-')[0]}`);
      return (Array.isArray(pool.abilities[key]) ? pool.abilities[key] : [])
        .map(raw => ({ sequence, ability: raw })).filter(row => row.ability?.name || row.ability?.名称);
    });
  }

  function sync(data, pool, locked = false) {
    if (!record(data?.stat_data)) return false;
    const stat = data.stat_data;
    const snapshot = resolve(pool, data);
    const soulCount = Object.keys(data?.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法?.灵魂列表 || {})
      .filter(key => !invalid.has(key)).length;
    if (!snapshot.imagined.length && !snapshot.grazed.length && !soulCount &&
      !record(stat.序列能力列表) && !record(stat.辅助能力列表)) return false;
    const groups = record(stat.序列能力列表) ? stat.序列能力列表
      : snapshot.imagined.length || snapshot.grazed.length
        ? (stat.序列能力列表 = {}) : {};
    for (const key of Object.keys(groups)) if (key.startsWith(PREFIX) || key.startsWith(GRAZE_PREFIX)) delete groups[key];
    const names = new Set(Object.entries(groups).filter(([key]) => key !== '$meta')
      .flatMap(([, list]) => Array.isArray(list) ? list.map(row => String(row?.名称 || row?.name || '').trim()) : []));
    const add = (selection, prefix, sourceKey) => {
      for (const { sequence, ability } of abilityRows(pool, selection, locked)) {
        const name = String(ability.name || ability.名称).trim();
        if (!name || names.has(name)) continue;
        names.add(name);
        const source = sourceKey === '$放牧来源' ? selection.name : selection.pathway;
        const group = `${prefix}${source}:${sequence}`;
        const row = { ...copy(ability), 名称: name, [sourceKey]: source };
        (groups[group] || (groups[group] = [])).push(row);
      }
    };
    snapshot.imagined.forEach(row => add(row, PREFIX, '$空想来源'));
    snapshot.grazed.forEach(row => {
      fragments(row.sequence).forEach(fragment => {
        const pathway = pathwayFor(pool, fragment);
        if (pathway) add({ ...row, pathway, sequence: canonical(pool, pathway, rankOf(fragment)) || fragment },
          GRAZE_PREFIX, '$放牧来源');
      });
    });
    const auxiliary = record(stat.辅助能力列表) ? stat.辅助能力列表
      : snapshot.imagined.length || soulCount
        ? (stat.辅助能力列表 = { $meta: { extensible: true } }) : null;
    if (!auxiliary) return true;
    if (snapshot.imagined.length) auxiliary['#空想'] = {
      名称: '空想', 序列: `序列${snapshot.imagined[0].rank}`,
      描述: `当前空想${snapshot.imagined.map(row => `${row.pathway}（${row.sequence}）`).join('、')}并享受相应能力与机制；真实当前序列仍为${snapshot.real}，并未实际改换途径。`,
      isEquipped: false,
    };
    else delete auxiliary['#空想'];
    if (soulCount) auxiliary['#放牧'] = {
      名称: '放牧', 序列: snapshot.real,
      描述: `当前共放牧${soulCount}个灵魂，已激活${snapshot.grazed.length}个：${snapshot.grazed.map(row => `${row.name}（${row.sequence}）`).join('、') || '无'}。激活灵魂提供其对应序列范围内的能力与途径机制，但不会改变玩家的真实序列与基础属性。`,
      isEquipped: false,
    };
    else delete auxiliary['#放牧'];
    return true;
  }

  function npcProjection(pool, sequence, random = Math.random) {
    const owner = gate(pool, sequence);
    if (!owner.unlocked) return null;
    const occupied = owned(pool, sequence);
    const candidates = Object.keys(pool.pathways || {}).filter(pathway =>
      pathway !== PATH && !occupied.has(pathway) && canonical(pool, pathway, owner.rank));
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const chosen = candidates.slice(0, owner.slots).map(pathway =>
      ({ pathway, sequence: canonical(pool, pathway, owner.rank), rank: owner.rank }));
    const abilities = chosen.flatMap(row => {
      const rows = abilityRows(pool, row, false).map(entry => entry.ability);
      for (let i = rows.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
      return rows.slice(0, 3);
    });
    return { imagined: chosen, effectiveSequence: strongest(pool, sequence, chosen.map(row => row.sequence)),
      abilities };
  }

  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    gate, canonical, stored, resolve, validate, save, separate, sync, npcProjection,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
