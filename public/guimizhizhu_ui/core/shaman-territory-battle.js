(() => {
  'use strict';
  const KEY = 'cryptLord.shamanTerritoryBattle';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const copy = value => structuredClone(value);
  const ATTRS = { 活力: ['hp', 'maxHp'], 敏捷: ['agility', 'maxAgility'],
    灵性: ['spirit', 'maxSpirit'], 理智: ['sanity', 'maxSanity'],
    人性: ['humanity', 'maxHumanity'], 运气: ['luck', 'maxLuck'] };
  function runtime(data, battle, pool, personal = false, referenceKey = 'cryptLord.shamanTerritoryReference',
    effectKey = 'territoryEffect') {
    const isolated = copy(data);
    const rules = modules[referenceKey].create({ pool });
    const actors = personal ? [battle.player, battle.enemy] : battle.units;
    const heroes = actors.filter(actor => !actor.isSummon).map((actor, index) => {
      const player = personal ? index === 0 : actor.source === 'player';
      const source = player ? 'player' : personal ? actor.npcKey ? 'npc' : 'practice' : actor.source;
      const stats = {};
      for (const [stat, [current, max]] of Object.entries(ATTRS)) {
        Object.defineProperty(stats, stat, { get: () => actor[max] ?? actor[current] ?? 0,
          set: value => { actor[max] = value; } });
        if (stat !== '运气') Object.defineProperty(stats, `当前${stat}`, {
          get: () => actor[current] ?? 0, set: value => { actor[current] = value; } });
      }
      return { actor, name: personal ? player ? actor.name : actor.npcKey || actor.name : actor.name,
        dataSource: source, playSource: actor.playSource,
        sequenceString: player
          ? modules['cryptLord.audienceImagination'].resolve(pool, isolated).effectiveSequence
          : actor.sequence || actor.sequenceString,
        additionalStats: stats };
    });
    const bm = { currentMvuState: isolated,
      teamManager: { getAllHeroes: () => heroes },
      battleLogger: { log: (message, type) => {
        battle.log.push({ round: battle.round, actor: 'system', message, type,
          [effectKey === 'jurisdictionEffect' ? 'jurisdiction' : 'territory']: true, at: Date.now() });
      } },
      effectManager: { applyEffect(hero, effect) {
        const actor = hero.actor;
        actor.effects ||= [];
        actor.effects.push({ ...effect, [effectKey]: true, skillEffect: true });
        modules['cryptLord.teamBattleState'].recalculateAttributes(actor);
      } },
    };
    return { ...rules, bm, heroes };
  }
  function collect(data, battle, pool, personal = false) {
    const probe = copy(battle), rt = runtime(data, probe, pool, personal);
    return rt.battle.collect(rt.bm).map(({ hero, ...row }) => ({
      ...row, actorId: personal ? hero.dataSource === 'player' ? 'player' : 'enemy' : hero.actor.id,
    }));
  }
  function section(data, battle, pool, personal = false) {
    const cases = collect(data, battle, pool, personal);
    if (!cases.length) return '';
    const rules = modules['cryptLord.shamanTerritoryReference'].create({ pool });
    return rules.battle.promptSection(cases);
  }
  function applyTeam(data, battle, pool, plan) {
    if (battle.territoryMeta?.applied) return false;
    const rt = runtime(data, battle, pool), cases = rt.battle.collect(rt.bm);
    if (!cases.length) return false;
    rt.battle.apply(rt.bm, cases, rt.battle.parse(plan, cases));
    battle.territoryMeta = { version: 1, applied: true,
      cases: cases.map(({ hero, ...row }) => ({ ...row, actorId: hero.actor.id })) };
    modules['cryptLord.shamanTerritoryState'].sync(data, pool);
    return true;
  }
  function applyPersonal(data, plan) {
    const battle = data?.cryptLord?.personalBattle;
    if (!battle || battle.territoryMeta?.applied) return false;
    const pool = battle.player.picturePool || { pathways: {} };
    const rt = runtime(data, battle, pool, true), cases = rt.battle.collect(rt.bm);
    if (!cases.length) return false;
    const parsed = rt.battle.parse(plan, cases);
    const effects = { player: null, npc: null };
    for (const row of cases) {
      const judgement = parsed.get(row.id);
      if (!judgement) {
        rt.bm.battleLogger.log(`${row.hero.name}的萨满领地无法完成判定，本场按中性处理。`, 'warning');
        continue;
      }
      if (row.kind === 'player') effects.player = rt.battle.playerEffect(judgement.distance, row.radius);
      else effects.npc = { type: judgement.inside ? 'buff' : 'debuff', power: judgement.inside ? 100 : 30,
        label: judgement.inside ? '长期据点内·六维翻倍' : '长期据点外·六维衰退' };
    }
    modules['cryptLord.shamanTerritory'].applyBattle(battle, effects);
    battle.territoryMeta = { version: 1, applied: true };
    modules['cryptLord.shamanTerritoryState'].sync(data, pool);
    return true;
  }
  function strip(actor, effectKey = 'territoryEffect') {
    if (!actor.effects?.some(effect => effect[effectKey])) return actor;
    const ratios = Object.fromEntries(Object.entries(ATTRS).filter(([stat]) => stat !== '运气')
      .map(([stat, [current, max]]) => [stat, actor[max] > 0
        ? Math.max(0, Math.min(1, actor[current] / actor[max])) : 0]));
    actor.effects = actor.effects.filter(effect => !effect[effectKey]);
    modules['cryptLord.teamBattleState'].recalculateAttributes(actor);
    for (const [stat, ratio] of Object.entries(ratios)) {
      const [current, max] = ATTRS[stat];
      actor[current] = Math.floor(actor[max] * ratio);
    }
    return actor;
  }
  const api = { collect, section, applyTeam, applyPersonal, strip, runtime,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
