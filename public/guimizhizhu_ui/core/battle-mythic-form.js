(() => {
  'use strict';
  const KEY = 'cryptLord.battleMythicForm';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!fields?.withRuntime || !reference?.mythicConfig) throw Error(`[${KEY}] original runtime unavailable`);
  const clone = value => structuredClone(value);
  const onField = actor => actor && actor.hp > 0 && !actor.offField && !actor.activeLeaving && !actor.exiled && !actor.possessedHidden;
  const heroOf = (rt, id) => rt.heroes.find(hero => hero.heroId === id);
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  function initialize(battle, pathways) {
    fields.initialize(battle, pathways);
    battle.mythicMeta ||= { version: 1, config: reference.mythicConfig() };
  }
  function description(battle, actor, data) {
    if (!battle.mythicMeta || !actor) return '';
    return use(clone(battle), data, undefined, rt =>
      rt.mythicDescriptions.descriptionOfHero(heroOf(rt, actor.id)));
  }
  function options(battle, actor, data) {
    if (!battle?.mythicMeta || !onField(actor) || actor.source !== 'player') return [];
    return use(clone(battle), data, undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.mythic;
      const game = { currentMvuState: data }, tier = manager.tierOf(hero.sequenceRank);
      const active = manager.hasAny(hero);
      const entries = [];
      if (tier) {
        const cooldown = manager.cooldown(game);
        entries.push({ id: 'natural', name: '神话生物形态', ...clone(tier),
          corruption: manager.isSpectator(hero.sequenceString) ? 0 : tier.corruption,
          cooldownDays: battle.mythicMeta.config.MYTHIC_CD_DAYS,
          cooldownLeft: cooldown.left, active,
          description: rt.mythicDescriptions.descriptionOfHero(hero),
          reason: active ? '当前形态仍在持续。' : !cooldown.ready ? `冷却尚余 ${cooldown.left} 个游戏日。` : '' });
      }
      if (rt.canonAccess.canUseTactic(hero, 'ugly_duckling')) {
        const cooldown = manager.canonCooldown(game, hero);
        entries.push({ id: 'ugly_duckling', name: '神秘再现·丑小鸭', rounds: 1,
          pct: 50, corruption: 0, cooldownDays: 1, cooldownLeft: cooldown.left,
          active, description: '', reason: active ? '当前形态仍在持续。'
            : !cooldown.ready ? `冷却尚余 ${cooldown.left} 个游戏日。` : '' });
      }
      return entries;
    });
  }
  function attempt(battle, actor, kind, data) {
    const selected = options(battle, actor, data).find(row => row.id === kind);
    if (!selected || selected.reason)
      return { ok: false, error: selected?.reason || '当前形态未解锁或资格已失效。' };
    return use(battle, data, undefined, rt => {
      const hero = heroOf(rt, actor.id), manager = rt.mythic;
      const game = { currentMvuState: data };
      let corruption = 0;
      if (kind === 'ugly_duckling') {
        if (!manager.canCanon(game, hero) || !manager.applyCanon(hero, battle.round))
          return { ok: false, error: '神秘再现资格或冷却已变化。' };
        manager.chargeCanon(game, hero);
      } else {
        if (!manager.apply(hero, battle.round))
          return { ok: false, error: '当前形态已在持续或序列不足。' };
        corruption = manager.chargePlayer(game, hero);
      }
      const message = `${actor.name} 开启了${selected.name}${selected.description
        ? `：${selected.description}` : ''}。`;
      battle.log.push({ round: battle.round, at: Date.now(), mythicForm: true,
        actor: actor.id, kind, message });
      if (battle.log.length > 160) battle.log.shift();
      return { ok: true, applied: true, actor: actor.id, kind, corruption,
        pct: selected.pct, rounds: selected.rounds, summary: [message] };
    });
  }
  function activeCount(battle) {
    return (battle.units || []).filter(unit => unit.hp > 0 &&
      (unit.effects || []).some(effect => effect.mythicForm || effect.canonMythicForm)).length;
  }
  function npc(battle, data, excluded = [], random, count = activeCount(battle)) {
    if (!battle?.mythicMeta) return [];
    return use(battle, data, random, rt => {
      const candidates = rt.heroes.filter(hero => onField(hero.unit) &&
        hero.dataSource !== 'player' && hero.controller !== 'player' &&
        !excluded.includes(hero.heroId) && !hero.unit.turnSkip && !hero.unit.stunned &&
        !hero.unit.skipTurn);
      return rt.mythic.rollNpcs(candidates, null, battle.round, count).map(hero => {
        const description = rt.mythicDescriptions.descriptionOfHero(hero);
        const message = `${hero.name} 开启了神话生物形态${description ? `：${description}` : ''}。`;
        battle.log.push({ round: battle.round, at: Date.now(), mythicForm: true,
          actor: hero.heroId, kind: 'natural', message });
        if (battle.log.length > 160) battle.log.shift();
        return { ok: true, applied: true, actor: hero.heroId, kind: 'natural', summary: [message] };
      });
    });
  }
  function tick(battle) {
    if (!battle?.mythicMeta) return;
    use(battle, undefined, undefined, rt => {
      for (const hero of rt.heroes) rt.mythic.tick(hero, battle.round);
    });
  }
  function finish(battle) {
    for (const unit of battle.units || [])
      unit.effects = (unit.effects || []).filter(effect => !effect.mythicForm && !effect.canonMythicForm);
  }
  function statusLines(battle, actor) {
    const effect = actor?.effects?.find(row => row.mythicForm || row.canonMythicForm);
    return effect ? [`${effect.canonMythicForm ? '神秘再现·丑小鸭' : '神话生物形态'} · 增伤/减伤 ${effect.power}% · ` +
      `第 ${effect.canonMythicUntil ?? effect.mythicUntil} 回合末结束`] : [];
  }
  const api = { initialize, options, attempt, description, activeCount, npc, tick, finish,
    statusLines, defaults: () => reference.mythicConfig(),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
