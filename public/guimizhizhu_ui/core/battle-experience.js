(() => {
  'use strict';

  const KEY = 'cryptLord.battleExperience';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const DEATH_XP = Object.freeze({
    10: 10, 9: 20, 8: 35, 7: 55, 6: 85, 5: 130, 4: 200,
    3: 300, 2: 450, 1: 700, 0: 1100, '-1': 1800, '-2': 2800,
  });
  function rank(value) {
    if (typeof value === 'string') {
      if (value.includes('支柱')) return -2;
      if (value.includes('旧日侍者')) value = value.match(/序列[：:\s]*(\d+)/)?.[1] ?? 2;
      else if (value.includes('旧日')) return -1;
      else value = value.match(/^(?:序列[：:\s]*)?(\d+(?:\.\d+)?)(?:$|[^\d])/)?.[1];
    }
    const parsed = Math.round(Number(value));
    return Number.isFinite(parsed) ? Math.max(-2, Math.min(10, parsed)) : 10;
  }
  function deathXp(value) { return DEATH_XP[rank(value)]; }
  function need(value) { return deathXp(value) * 5; }
  function levelNeed(level) { return need(10 - Math.max(0, Math.floor(Number(level) || 0))); }
  function settle(expValue, levelValue, sequence) {
    const cap = Math.max(0, 12 - rank(sequence));
    let exp = Math.max(0, Math.floor(Number(expValue) || 0));
    let level = Math.min(cap, Math.max(0, Math.floor(Number(levelValue) || 0)));
    while (level < cap && exp >= levelNeed(level)) {
      exp -= levelNeed(level);
      level++;
    }
    if (level === cap) exp = Math.min(exp, levelNeed(level) - 1);
    return { exp, level, cap, need: levelNeed(level) };
  }
  function preview(entity, gain, sequence) {
    const before = settle(entity?.$战斗经验, entity?.$战斗经验等级, sequence);
    const after = settle(before.exp + Math.max(0, Math.floor(Number(gain) || 0)), before.level, sequence);
    return { gain, before, after };
  }
  function award(entity, gain, sequence) {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity)) throw new Error('经验接收者不存在。');
    const result = preview(entity, gain, sequence);
    entity.$战斗经验 = result.after.exp;
    entity.$战斗经验等级 = result.after.level;
    return result;
  }
  function giftGain(sequence) { return Math.round(need(sequence) * .5); }
  function compute(heroes, state) {
    const counted = hero => hero && !hero.isSummon && !hero.playSource;
    const participants = Array.isArray(heroes) ? heroes.filter(counted) : [];
    const enemies = [];
    let pool = 0;
    participants.filter(hero => hero.teamType === 'enemy').forEach(hero => {
      const current = Number(hero.additionalStats?.当前活力);
      const maximum = Number(hero.additionalStats?.活力);
      const condition = !Number.isFinite(current) || current <= 0 ? 'dead'
        : maximum > 0 && current / maximum < .3 ? 'wounded' : 'alive';
      const gain = condition === 'dead' ? deathXp(hero.sequenceRank)
        : condition === 'wounded' ? Math.round(deathXp(hero.sequenceRank) * .5) : 0;
      if (gain) {
        enemies.push({ name: hero.name, rank: rank(hero.sequenceRank), status: condition, xp: gain });
        pool += gain;
      }
    });
    const allies = participants.filter(hero => hero.teamType === 'ally');
    const weight = hero => Math.max(1, 11 - rank(hero.sequenceRank));
    const totalWeight = allies.reduce((sum, hero) => sum + weight(hero), 0);
    const recipients = allies.map(hero => {
      const entity = hero.dataSource === 'player' ? state?.stat_data : state?.npc_data?.[hero.name];
      const sequence = rank(hero.sequenceRank);
      const gain = pool && totalWeight ? Math.round(pool * weight(hero) / totalWeight) : 0;
      return {
        name: hero.name, dataSource: hero.dataSource, rank: sequence, gain,
        hasEntity: Boolean(entity),
        levelCap: Math.max(0, 12 - sequence),
        sim: preview(entity, gain, sequence),
      };
    });
    return { pool, enemyBreakdown: enemies, recipients };
  }
  function commit(results, state) {
    if (!results || !state) return false;
    let changed = false;
    for (const recipient of results.recipients || []) {
      if (!recipient || recipient.gain <= 0) continue;
      const entity = recipient.dataSource === 'player' ? state.stat_data : state.npc_data?.[recipient.name];
      if (!entity || typeof entity !== 'object' || Array.isArray(entity)) continue;
      award(entity, recipient.gain, recipient.rank);
      changed = true;
    }
    return changed;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    rank, deathXp, need, levelNeed, settle, preview, award, giftGain, compute, commit,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
