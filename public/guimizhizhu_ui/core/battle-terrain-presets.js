(() => {
  'use strict';

  const KEY = 'cryptLord.battleTerrainPresets';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  // Original HAZARD_PRESETS: damage/status, field/residue, secondary effect x0.5.
  const damage = (channel = 'field') => ({ kind: 'damage', channel, stat: '当前活力', ratio: 1 });
  const status = (stat, ratio = 1) => ({ kind: 'status', channel: 'field', stat, ratio });
  const specs = [
    ['fireSurface', '火焰地表', 'surface', 0, 8, 3, ['火焰'], ['草', '冰'], ['水', '岩石', '钢'], [damage(), status('defense', .5)]],
    ['lavaSurface', '熔岩', 'surface', 3, 6, 0, ['火焰'], ['草', '冰', '水'], ['岩石', '钢'], [damage(), status('defense', .5)]],
    ['emberSurface', '余烬地', 'surface', 0, 9, 0, ['火焰'], ['草', '冰'], ['岩石', '钢'], [damage()]],
    ['poisonSurface', '毒液地表', 'surface', 1, 8, 0, ['毒'], ['生命', '草'], ['亡灵', '钢', '腐化'], [damage('residue')]],
    ['acidSurface', '强酸地表', 'surface', 1, 8, 0, ['毒'], ['钢', '岩石'], ['水', '腐化'], [damage('residue'), status('defense', .5)]],
    ['oilSurface', '油污', 'surface', 1, 9, 0, [], ['火焰'], ['钢', '水'], [status('speed')]],
    ['bloodSurface', '血泊', 'surface', 0, 8, 0, ['死亡', '亡灵', '腐化'], ['光明', '生命'], ['钢'], [damage('residue')]],
    ['iceSurface', '冰面', 'surface', 1, 8, 0, ['冰'], ['钢', '岩石'], ['飞行', '水'], [status('defense')]],
    ['webSurface', '蛛网', 'surface', 2, 9, 0, ['毒', '草'], ['飞行'], ['火焰', '钢'], [status('speed')]],
    ['thornBriar', '荆棘丛', 'surface', 1, 9, 0, ['草'], ['生命'], ['火焰', '钢', '岩石', '亡灵'], [damage()]],
    ['swampMire', '沼泽', 'surface', 1, 8, 0, ['水', '草'], ['火焰', '钢'], ['飞行', '亡灵'], [damage('residue'), status('speed', .5)]],
    ['smokeCloud', '烟雾', 'cloud', 0, 9, 4, ['黑暗'], ['光明'], ['精神'], [status('attack')]],
    ['fogBank', '浓雾', 'cloud', 0, 9, 0, ['黑暗'], ['光明'], ['精神'], [status('attack')]],
    ['steamCloud', '蒸汽云', 'cloud', 0, 9, 3, ['水'], ['冰', '火焰'], ['钢', '岩石'], [status('attack'), { ...damage(), ratio: .5 }]],
    ['poisonCloud', '毒气云', 'cloud', 0, 8, 0, ['毒'], ['生命', '草'], ['亡灵', '钢'], [damage('residue')]],
    ['sporeCloud', '孢子云', 'cloud', 0, 8, 0, ['草', '毒'], ['生命'], ['钢', '亡灵'], [damage('residue'), status('attack', .5)]],
    ['stormCloud', '雷云', 'cloud', 0, 8, 0, ['电'], ['水', '钢'], ['岩石'], [damage(), status('speed', .5)]],
    ['rockfall', '落石区', 'geo', 0, 7, 3, ['岩石'], ['冰', '草'], ['钢', '飞行'], [damage()]],
    ['quicksand', '流沙', 'geo', 2, 8, 0, [], ['钢', '岩石'], ['飞行', '草'], [status('speed')]],
    ['unevenGround', '崩裂地面', 'geo', 1, 8, 0, ['岩石'], ['钢'], ['飞行'], [status('defense')]],
    ['galeZone', '强风带', 'geo', 1, 9, 0, ['飞行'], ['火焰', '草'], ['岩石', '钢'], [status('attack')]],
  ];
  const presets = Object.freeze(Object.fromEntries(specs.map(
    ([id, name, family, tier, rank, rounds, adapt, countered, resist, effects]) =>
      [id, Object.freeze({ id, name, family, tier, rank, rounds, adapt, countered, resist, effects })],
  )));
  const values = Object.freeze({
    damage: {
      '-2': [37000, -18500, -46250, -111000], '-1': [22200, -11100, -27750, -66600],
      0: [8880, -4440, -11100, -26640], 1: [2220, -1110, -2775, -6660],
      2: [888, -444, -1110, -2664], 3: [296, -148, -370, -888],
      4: [111, -56, -139, -333], 5: [44, -22, -56, -133],
      6: [18, -9, -23, -55], 7: [7, -4, -9, -22],
      8: [3, -2, -4, -10], 9: [2, -1, -3, -7], 10: [1, -1, -2, -4],
    },
    status: {
      '-2': [112500, -56250, -135000, -337500], '-1': [67500, -33750, -81000, -202500],
      0: [27000, -13500, -32400, -81000], 1: [6750, -3375, -8100, -20250],
      2: [2700, -1350, -3240, -8100], 3: [900, -450, -1080, -2700],
      4: [338, -169, -405, -1013], 5: [135, -68, -162, -405],
      6: [56, -28, -67, -169], 7: [23, -11, -27, -68],
      8: [10, -5, -12, -30], 9: [7, -3, -8, -20], 10: [5, -2, -5, -14],
    },
  });
  const cost = [1, 2, 3, Infinity];
  function round(raw) {
    return raw ? Math.sign(raw) * Math.max(1, Math.round(Math.abs(raw))) : 0;
  }
  function get(id) { return presets[id] || null; }
  function option(id) {
    const row = get(id);
    return row && { id: row.id, name: row.name, family: row.family,
      moveCost: cost[row.tier], blocked: !Number.isFinite(cost[row.tier]),
      rounds: row.rounds, tier: row.tier, symbol: row.family === 'cloud' ? '☁' : row.family === 'geo' ? '◇' : '◆' };
  }
  function tierOf(actor, preset) {
    const tags = Array.isArray(actor?.tags) ? actor.tags : [];
    const has = list => list.some(tag => tags.includes(tag));
    if (has(preset.adapt)) return '适应';
    if (has(preset.countered)) return '被克制';
    if (has(preset.resist)) return '抗性';
    return '无关系';
  }
  function hits(id, actor, strength) {
    const preset = get(id);
    if (!preset) return [];
    const tier = tierOf(actor, preset);
    const index = { 适应: 0, 抗性: 1, 无关系: 2, 被克制: 3 }[tier];
    const rank = Math.max(-2, Math.min(10, Math.round(Number.isFinite(Number(strength)) && strength != null
      ? Number(strength) : Number(preset.rank))));
    return preset.effects.flatMap(effect => {
      const base = round(values[effect.kind][rank][index] * effect.ratio);
      const distance = { 适应: 4, 抗性: 3, 无关系: 4, 被克制: 5 }[tier];
      const gap = rank - Number(actor?.rank);
      const scale = effect.kind === 'status' && Number.isFinite(gap)
        ? Math.max(0, Math.min(1, (distance - gap) / distance)) : 1;
      const value = round(base * scale);
      return value ? [{ ...effect, value, tier, rounds: effect.channel === 'residue' ? 2 : 1 }] : [];
    });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    get, option, hits, tierOf,
    options: () => Object.keys(presets).map(option),
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
