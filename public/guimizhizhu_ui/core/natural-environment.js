(() => {
  'use strict';
  const KEY = 'cryptLord.naturalEnvironment';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const land = '森林 丛林 草原 农田 荒原 沙漠 冰原 湖泊 江河 海洋 海岸滩涂 湿地沼泽 山地 丘陵 峡谷 洞穴地下 火山熔岩地带 宇宙真空 灵界'.split(' ')
    .concat(['陆地上', '江河湖上', '江河湖附近', '高空', '海上', '海边', '宇宙中', '灵界中']
      .map(value => `人造建筑与载具（${value}）`));
  const weather = '晴 多云 阴 阵雨 雷阵雨 雷阵雨伴有冰雹 小雨 中雨 大雨 暴雨 大暴雨 特大暴雨 雨夹雪 冻雨 阵雪 小雪 中雪 大雪 暴雪 雾 大雾 轻度霾 重度霾 沙尘暴 大风 风暴 暴风雨 无天气概念'.split(' ');
  const time = '清晨 上午 中午 下午 夜晚 深夜 无时间概念'.split(' ');
  const vocab = Object.freeze({ 地貌: Object.freeze(land), 天气: Object.freeze(weather), 时间: Object.freeze(time) });
  const effects = {
    地貌: Object.create(null), 天气: Object.create(null), 时间: Object.create(null),
  };
  const bonus = (pathway, gate, stats, per, div) => ({ pathway, gate, stats, per, div });
  for (const [names, per, div, gate] of [
    [['湖泊', '江河', '人造建筑与载具（江河湖上）'], 8, 4, 9],
    [['海洋', '人造建筑与载具（海上）'], 10, 3, 9],
    [['海岸滩涂', '湿地沼泽', '人造建筑与载具（江河湖附近）', '人造建筑与载具（海边）'], 5, 5, 9],
    [['人造建筑与载具（高空）'], 8, 4, 6],
  ]) for (const name of names) effects.地貌[name] = [bonus('水手', gate, ['attack', 'defense', 'speed'], per, div)];
  for (const [names, per, div, gate] of [
    [['阵雨'], 1, null, 9],
    [['雷阵雨', '雷阵雨伴有冰雹', '小雨'], 2, null, 9],
    [['中雨', '大雨', '雨夹雪', '冻雨'], 3, null, 9],
    [['暴雨', '大暴雨'], 4, 5, 9],
    [['特大暴雨'], 5, 4, 9],
    [['沙尘暴', '风暴'], 5, 3, 6],
    [['大风'], 3, 4, 6],
  ]) for (const name of names) effects.天气[name] = [bonus('水手', gate, ['attack'], per, div)];
  effects.天气.暴风雨 = [
    bonus('水手', 9, ['attack', 'defense'], 5, null),
    bonus('水手', 6, [], 0, 3),
  ];
  effects.时间.夜晚 = [bonus('不眠者', 9, ['attack', 'defense', 'speed'], 5, 4)];
  effects.时间.深夜 = [bonus('不眠者', 9, ['attack', 'defense', 'speed'], 7, 3)];
  const labels = { attack: '攻击力', defense: '防御力', speed: '速度' };

  function parse(raw) {
    return Object.fromEntries(Object.entries(vocab).map(([kind, names]) =>
      [kind, names.includes(raw?.[kind]) ? raw[kind] : null]));
  }

  function sequenceRank(sequence, pathway) {
    const value = String(sequence || '');
    if (!value) return null;
    if (pathway === '水手' && value.includes('上帝')) return -2;
    if (pathway === '不眠者' && value.includes('永恒之暗')) return -1;
    const fragments = value.split(/[、，,;；|+＋/]/);
    const ranks = fragments.flatMap(fragment => {
      if (!fragment.includes(pathway)) return [];
      const match = fragment.match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/);
      return match ? [Number(match[1])] : [];
    });
    return ranks.length ? Math.min(...ranks) : null;
  }

  function resolve(actor, natural) {
    const out = { effects: [], move: 0 };
    const parsed = parse(natural);
    for (const [kind, name] of Object.entries(parsed)) {
      if (!name) continue;
      for (const entry of effects[kind][name] || []) {
        const rank = sequenceRank(actor?.sequenceString, entry.pathway);
        if (rank == null || rank > entry.gate) continue;
        const multiplier = Math.max(0, 10 - rank);
        const power = Math.max(0, Math.round(multiplier * entry.per));
        if (entry.div) out.move += Math.max(0, Math.floor(multiplier / entry.div));
        if (!power) continue;
        for (const stat of entry.stats) out.effects.push({
          name: `${name}·${labels[stat]}`, type: 'buff', stat,
          valueType: 'percentage', power, duration: 1, environment: true,
        });
      }
    }
    return out;
  }

  function sync(battle) {
    if (!battle?.board) return battle;
    battle.board.naturalEnv = parse(battle.board.naturalEnv);
    for (const key of ['player', 'enemy', 'picture']) {
      const actor = battle[key];
      if (!actor) continue;
      const current = Array.isArray(actor.effects) ? actor.effects : [];
      const resolved = resolve(actor, battle.board.naturalEnv);
      actor.effects = current.filter(effect => !effect.environment).concat(resolved.effects);
      actor.envMoveBonus = resolved.move;
    }
    return battle;
  }

  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    vocab, parse, sequenceRank, resolve, sync,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
