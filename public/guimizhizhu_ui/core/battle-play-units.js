(() => {
  'use strict';
  const KEY = 'cryptLord.battlePlayUnits';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battlePlayReference'];
  if (!reference) throw Error('专属玩法战斗缺少原版来源接口。');
  const copy = value => structuredClone(value);
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const invalid = new Set(['$meta', '__proto__', 'prototype', 'constructor']);
  const labels = { clone: '分身', puppet: '秘偶', 'savant-construct': '长期造物' };
  const keyOf = (source, name) => `play:${source}:${encodeURIComponent(name)}`;
  function sources(data, pool = {}) {
    const pathways = pool.pathways || pool;
    const fragments = text => String(text || '').split(/[/|，,;；与和及以及\s+&、]/u).filter(Boolean);
    const pure = text => String(text || '').replace(/^序列\s*[：:]?\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
    const real = String(data?.stat_data?.当前序列 || '');
    const explicit = String(data?.stat_data?.当前途径 || data?.stat_data?.途径 || '').replace(/途径$/u, '');
    const resolveFragment = text => {
      const match = String(text).match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
      if (!match) return null;
      const found = Object.entries(pathways).find(([, rows]) =>
        Array.isArray(rows) && rows.some(row => pure(row) === pure(text)));
      const direct = ['占卜家', '偷盗者', '通识者'].includes(pure(text)) ? pure(text) : '';
      const pathwayShort = String(found?.[0] || direct ||
        (fragments(real).length === 1 && pure(real) === pure(text) ? explicit : '')).replace(/途径$/u, '');
      return pathwayShort ? { pathwayShort, rank: Number(match[1]) } : null;
    };
    const imagination = modules['cryptLord.audienceImagination'];
    const projected = imagination?.resolve({ pathways }, data);
    const effective = projected?.effectiveSequence || real;
    return reference.create({
      LifeSaveManager: { splitSequenceFragments: fragments, resolveFragment },
      parseSequenceRank: modules['cryptLord.battleExperience'].rank,
      effectivePlayerSequence: () => effective,
    }).map(play => ({ play, allowed: play.resolve(effective).unlocked }));
  }
  function roster(data, pool) {
    return sources(data, pool).flatMap(({ play, allowed }) => !allowed ? [] :
      play.recordsOfState(data).filter(row => !invalid.has(row.name) &&
        record(row.data) && Number(row.data.当前活力) > 0)
        .map(row => ({ key: keyOf(play.BAG_SOURCE, row.name), name: row.name,
          source: play.BAG_SOURCE, playSource: play.id, label: labels[play.BAG_SOURCE],
          hp: Number(row.data.当前活力), rank: modules['cryptLord.battleExperience'].rank(row.data.当前序列) })));
  }
  function prepare(data, selected, pool) {
    const candidates = roster(data, pool);
    const plays = sources(data, pool);
    return selected.map(key => {
      const choice = candidates.find(row => row.key === key);
      if (!choice) throw Error('专属玩法单位已变化、阵亡或当前途径资格不可用。');
      const play = plays.find(row => row.play.id === choice.playSource).play;
      const card = play.recordOfState(data, choice.name);
      return { ...choice, card: copy(card), original: copy(card) };
    });
  }
  function preview(battle) {
    return (battle?.units || []).filter(unit => unit.playSource && unit.playRecord)
      .map(unit => ({ id: unit.id, name: unit.name, source: unit.playRecord.source,
        hp: unit.hp, maxHp: unit.maxHp,
        outcome: unit.playRecord.source === 'savant-construct'
          ? '保留战损，可维修' : unit.hp > 0 ? '保留原记录' : '阵亡删除' }));
  }
  function settle(data, battle, settledUnits) {
    if (battle.playUnitMeta?.version !== 1) throw Error('专属玩法战斗版本不可识别。');
    const plays = sources(data, battle.playUnitMeta.pathways);
    const units = settledUnits.filter(unit => unit.playSource && unit.playRecord);
    for (const unit of units) {
      const play = plays.find(row => row.play.id === unit.playSource)?.play;
      if (!play || unit.playRecord.source !== play.BAG_SOURCE)
        throw Error(`专属单位 ${unit.name} 的来源标记不一致。`);
      const current = play?.recordOfState(data, unit.playRecord.name);
      if (!current || JSON.stringify(current) !== JSON.stringify(unit.playRecord.original))
        throw Error(`专属单位 ${unit.name} 的原记录已变化，未提交结算。`);
    }
    const heroes = units.map(unit => ({ name: unit.playRecord.name,
      playSource: unit.playSource, additionalStats: { 当前活力: unit.hp } }));
    const summary = [];
    for (const { play } of plays) {
      if (play.settleBattleRecords) {
        const result = play.settleBattleRecords(data, heroes);
        if (result.changed) summary.push(`${labels[play.BAG_SOURCE]}已保留战损并恢复其他四项资源。`);
      } else {
        const dead = play.purgeDead(data, heroes);
        if (dead.length) summary.push(`${labels[play.BAG_SOURCE]}「${dead.join('」「')}」已阵亡删除。`);
      }
    }
    return summary;
  }
  const api = { roster, prepare, preview, settle, sources,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
