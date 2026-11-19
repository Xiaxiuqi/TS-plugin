(() => {
  'use strict';
  const KEY = 'cryptLord.battleTeamBuilder';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const copy = value => structuredClone(value);
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = new Set(['$meta', '__proto__', 'prototype', 'constructor']);
  const labels = { player: '本体', npc: 'NPC', clone: '分身', puppet: '秘偶',
    'savant-construct': '长期造物' };
  const player = () => ({ name: '<User>', dataSource: 'player' });
  const identity = row => JSON.stringify([row.dataSource, row.name]);
  const defaults = () => ({ version: 1, allyTeam: [player()], enemyTeam: [] });
  function normalize(value) {
    if (!record(value) || value.version !== 1) throw Error('编队配置版本不可识别，请清空后重新编队。');
    const seen = new Set();
    const result = { version: 1 };
    for (const [key, max] of [['allyTeam', 60], ['enemyTeam', 60]]) {
      if (!Array.isArray(value[key]) || value[key].length > max) throw Error('编队格式或人数超过单方棋盘容量。');
      result[key] = value[key].map(row => {
        if (!record(row) || !Object.hasOwn(labels, row.dataSource) ||
          typeof row.name !== 'string' || !row.name.trim() || forbidden.has(row.name))
          throw Error('编队含有无效成员。');
        const entry = { name: row.name, dataSource: row.dataSource };
        if (entry.dataSource === 'player' && (key !== 'allyTeam' || entry.name !== '<User>'))
          throw Error('原生战斗本体固定在我方。');
        const id = identity(entry);
        if (seen.has(id)) throw Error('同一来源成员不能重复参战或同时属于双方。');
        seen.add(id);
        return entry;
      });
    }
    if (!result.allyTeam.some(row => row.dataSource === 'player')) {
      if (result.allyTeam.length >= 60) throw Error('我方需为本体保留一个位置。');
      result.allyTeam.unshift(player());
    }
    return result;
  }
  function load(data) {
    const saved = data?.cryptLord?.teamComposition;
    return saved == null ? defaults() : normalize(saved);
  }
  function roster(data, pool = {}) {
    const result = [];
    const add = (key, name, source, card) => {
      if (!record(card) || forbidden.has(name)) return;
      const hp = Number(card.当前活力), cap = Number(card.活力 ?? card.当前活力);
      const important = source === 'npc'
        ? Boolean(card.isImportant || data.stat_data?.人物关系列表?.[name]?.isImportant)
        : Boolean(card.isImportant);
      result.push({ key, name: String(card.名称 || name), descriptor: { name, dataSource: source },
        label: labels[source], important, sequence: String(card.当前序列 || '普通人'),
        stats: ['活力', '敏捷', '灵性', '理智', '人性', '运气'].map(stat => {
          const maximum = Number(card[stat]);
          const current = stat === '运气' ? maximum : Number(card[`当前${stat}`]);
          return { stat, current: Number.isFinite(current) ? current : null,
            maximum: Number.isFinite(maximum) ? maximum : null,
            percent: Number.isFinite(current) && maximum > 0 ? Math.round(current / maximum * 100) : null };
        }),
        available: Number.isFinite(hp) && hp > 0 && cap > 0,
        reason: !Number.isFinite(hp) ? '缺少当前活力' : hp <= 0 ? '没有可用活力' : cap <= 0 ? '活力上限无效' : '',
      });
    };
    add('player', '<User>', 'player', data?.stat_data);
    for (const [name, card] of Object.entries(record(data?.npc_data) ? data.npc_data : {}))
      if (name !== 'player') add(name, name, 'npc', card);
    for (const { play, allowed } of modules['cryptLord.battlePlayUnits']?.sources(data, pool) || []) {
      if (!allowed) continue;
      for (const row of play.recordsOfState(data))
        add(`play:${play.BAG_SOURCE}:${encodeURIComponent(row.name)}`, row.name, play.BAG_SOURCE, row.data);
    }
    const keyCounts = new Map();
    for (const row of result) keyCounts.set(row.key, (keyCounts.get(row.key) || 0) + 1);
    for (const row of result) if (keyCounts.get(row.key) > 1) {
      row.available = false; row.reason = '战斗编号与另一来源冲突';
    }
    return result.sort((a, b) => (a.descriptor.dataSource === 'player' ? 0 : a.important ? 1 : 2) -
      (b.descriptor.dataSource === 'player' ? 0 : b.important ? 1 : 2));
  }
  function filter(rows, query = '') {
    const search = String(query).trim().toLowerCase();
    return !search ? rows : rows.filter(row =>
      row.name.toLowerCase().includes(search) || row.descriptor.name.toLowerCase().includes(search));
  }
  function resolve(data, pool, value = load(data)) {
    const configuration = normalize(value), rows = roster(data, pool), missing = [];
    const keys = {};
    for (const side of ['allyTeam', 'enemyTeam']) {
      keys[side] = [];
      for (const member of configuration[side]) {
        const row = rows.find(candidate => identity(candidate.descriptor) === identity(member));
        if (!row?.available) missing.push({ side, ...member,
          reason: row?.reason || '记录已删除或当前途径资格未开启' });
        else if (member.dataSource !== 'player') keys[side].push(row.key);
      }
    }
    return { configuration, rows, missing, allies: keys.allyTeam, enemies: keys.enemyTeam };
  }
  function edit(value, member, side) {
    const configuration = normalize(value);
    if (member.dataSource === 'player') throw Error('本体固定在我方，不可移除。');
    if (![null, 'allyTeam', 'enemyTeam'].includes(side)) throw Error('未知编队阵营。');
    for (const key of ['allyTeam', 'enemyTeam'])
      configuration[key] = configuration[key].filter(row => identity(row) !== identity(member));
    if (side) configuration[side].push(copy(member));
    return normalize(configuration);
  }
  function save(data, pool, value, expected = data?.cryptLord?.teamComposition) {
    if (data?.cryptLord?.teamBattle?.status === 'active') throw Error('战斗进行中不能更改编队。');
    if (JSON.stringify(data?.cryptLord?.teamComposition) !== JSON.stringify(expected))
      throw Error('已保存编队发生变化，请重新读取后再保存。');
    const configuration = normalize(value);
    const checked = resolve(data, pool, configuration);
    if (checked.missing.length) throw Error(`编队成员不可用：${checked.missing.map(row =>
      `${row.name}（${labels[row.dataSource]}：${row.reason}）`).join('、')}`);
    const next = copy(data);
    next.cryptLord ||= {};
    next.cryptLord.teamComposition = configuration;
    return { ok: true, data: next, teamConfiguration: copy(configuration),
      changed: JSON.stringify(expected) !== JSON.stringify(configuration) };
  }
  function important(data, name) {
    if (data?.cryptLord?.teamBattle?.status === 'active') throw Error('战斗进行中不能更改组队标记。');
    if (forbidden.has(name) || !Object.hasOwn(data?.npc_data || {}, name) ||
      !record(data.npc_data[name])) throw Error('人物记录不存在。');
    const next = copy(data), card = next.npc_data[name];
    const subjective = next.stat_data?.人物关系列表?.[name];
    card.isImportant = !Boolean(card.isImportant || subjective?.isImportant);
    if (record(subjective)) subjective.isImportant = card.isImportant;
    return { ok: true, data: next };
  }
  function importLegacy(raw) {
    let value;
    try { value = JSON.parse(raw); } catch { throw Error('原版旧编队不是有效JSON。'); }
    if (!record(value)) throw Error('原版旧编队格式错误。');
    return normalize({ version: 1, allyTeam: value.allyTeam, enemyTeam: value.enemyTeam });
  }
  const api = { defaults, normalize, load, roster, filter, resolve, edit, save, important,
    importLegacy, identity, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
