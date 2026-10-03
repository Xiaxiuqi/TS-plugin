(() => {
  'use strict';
  const KEY = 'cryptLord.initialPlacement';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function collect(data) {
    const battle = data?.cryptLord?.personalBattle;
    if (battle?.status !== 'active') return [];
    const npc = data?.npc_data?.[battle.enemy?.npcKey] || {};
    return [
      { 编号: 'P1', 阵营: '我方', 名称: String(battle.player.name || '玩家'),
        序列: String(data?.stat_data?.当前序列 || '未知'),
        身份: String(data?.stat_data?.身份 || data?.stat_data?.背景 || '未知'),
        外貌: String(data?.stat_data?.外貌 || '未知') },
      { 编号: 'E1', 阵营: '敌方', 名称: String(battle.enemy.name || '对手'),
        序列: String(npc.当前序列 || battle.enemy.sequenceString || '未知'),
        身份: String(npc.身份 || npc.背景 || '未知'),
        外貌: String(npc.外貌 || '未知') },
    ];
  }
  function section(actors, cols, rows) {
    if (!Array.isArray(actors) || !actors.length) return '';
    return `\n附加任务：按当前剧情安排全部参战者的开战位置，不强制双方各守半场。
编号 | 阵营 | 名称 | 序列 | 身份 | 外貌
${actors.map(actor => ['编号', '阵营', '名称', '序列', '身份', '外貌']
    .map(key => JSON.stringify(String(actor[key] || '未知').slice(0, 80))).join(' | ')).join('\n')}
在原战场 JSON 的 "初始站位" 数组中，每编号写一次 {"编号":"P1","x":1,"y":5}。
x=0..${cols - 1}，y=0..${rows - 1}，必须为整数、不得重叠；先画地形，
再避开危险地形与分级3/4的障碍。编号不可改为角色名。`;
  }
  function safe(board, point, terrain) {
    if (!Number.isInteger(point?.x) || !Number.isInteger(point?.y) ||
      point.x < 0 || point.y < 0 || point.x >= board.cols || point.y >= board.rows) return false;
    const key = `${point.x},${point.y}`;
    const id = board.terrain?.[key];
    const ground = board.terrainSpec?.[key] || terrain.option(id);
    return !terrain.get(id) && !ground?.blocked && Number(ground?.tier ?? 0) < 3;
  }
  function parse(raw, actors, board, terrain) {
    const out = new Map();
    if (!Array.isArray(raw) || !Array.isArray(actors) || !board || !terrain) return out;
    const expected = new Set(actors.map(row => row.编号));
    const occupied = new Set();
    for (const row of raw) {
      const id = String(row?.编号 || '').trim();
      if (!expected.has(id) || out.has(id) || row.x == null || row.y == null ||
        row.x === '' || row.y === '') continue;
      const point = { x: Number(row.x), y: Number(row.y) };
      const key = `${point.x},${point.y}`;
      if (!safe(board, point, terrain) || occupied.has(key)) continue;
      out.set(id, point);
      occupied.add(key);
    }
    return out;
  }
  function deploy(battle, positions, terrain, connected) {
    if (!positions?.size || !battle?.board) return false;
    const board = battle.board;
    const actors = [['P1', battle.player], ['E1', battle.enemy]];
    const occupied = new Set([...positions.values()].map(point => `${point.x},${point.y}`));
    const chosen = new Map(positions);
    for (const [id, actor] of actors) {
      if (chosen.has(id)) continue;
      const candidates = [];
      for (let y = 0; y < board.rows; y++) for (let x = 0; x < board.cols; x++) {
        const point = { x, y };
        if (safe(board, point, terrain) && !occupied.has(`${x},${y}`)) {
          candidates.push({ ...point, distance: Math.abs(x - actor.x) + Math.abs(y - actor.y) });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
      if (!candidates.length) return false;
      const point = { x: candidates[0].x, y: candidates[0].y };
      chosen.set(id, point);
      occupied.add(`${point.x},${point.y}`);
    }
    const player = chosen.get('P1'), enemy = chosen.get('E1');
    if (!connected(board, player, enemy)) return false;
    Object.assign(battle.player, player);
    Object.assign(battle.enemy, enemy);
    return true;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    collect, section, safe, parse, deploy,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
