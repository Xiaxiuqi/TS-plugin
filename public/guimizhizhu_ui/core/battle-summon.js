(() => {
  'use strict';
  const KEY = 'cryptLord.battleSummon';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules;
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const reference = modules['cryptLord.battleFieldEffectReference'];
  const copy = value => structuredClone(value);
  const use = (battle, data, random, operation) => fields.withRuntime(battle, data, random, operation);
  const present = actor => actor?.hp > 0 && !actor.offField && !actor.exiled &&
    !actor.possessedHidden && !actor.activeLeaving;
  const grazing = () => modules['cryptLord.grazingState'];
  const imagination = () => modules['cryptLord.audienceImagination'];
  function initialize(battle, data, pool) {
    fields.initialize(battle, pool?.pathways);
    const snapshot = pool && imagination()?.resolve(pool, data);
    const player = battle.units.find(row => row.source === 'player');
    battle.summonMeta ||= { version: 1, serial: 0, playerCard: copy(data.stat_data),
      pool: copy(pool || { pathways: battle.fieldEffectMeta.pathways, abilities: {} }),
      grazingSequence: snapshot ? [snapshot.real, ...snapshot.imagined.map(row => row.sequence)]
        .join('/') : String(data.stat_data?.当前序列 || '') };
    if (snapshot && player) player.sequence = snapshot.effectiveSequence;
    battle.summon ||= { counts: {}, projections: [], npcCandidates: {} };
    if (snapshot && pool?.abilities) syncProjection(battle, data, player);
  }
  function grazingCore(battle) {
    const pool = battle.summonMeta?.pool || { pathways: {} };
    const resolveOwnerSequence = sequence => {
      const gate = imagination()?.resolve(pool, { stat_data: { 当前序列: sequence } }).directGrazingGate;
      return gate || { unlocked: false, rank: null };
    };
    return {
      resolveOwnerSequence,
      soulRecords: data => Object.assign(Object.create(null), Object.fromEntries(
        Object.entries(grazing().soulsOf(data)).filter(([name, soul]) =>
          !['$meta', '__proto__', 'constructor', 'prototype'].includes(name) &&
          soul && typeof soul === 'object' && !Array.isArray(soul)))),
      activeCapOf: rank => grazing().activeCap(rank),
      realSequence: data => data.stat_data?.当前序列,
      storedActiveNames: data => copy(grazing().playOf(data)?.激活灵魂 || []),
      storedDormantNames: data => copy(grazing().playOf(data)?.休眠灵魂 || []),
      saveActive(data, names) {
        const play = grazing().playOf(data);
        if (!play) return { ok: false, reason: '放牧名册不存在。' };
        play.激活灵魂 = copy(names);
        play.休眠灵魂 = Object.keys(grazing().soulsOf(data))
          .filter(name => name !== '$meta' && !names.includes(name));
        return { ok: true };
      },
      saveStoredActiveNames(data, active, dormant) {
        Object.assign(grazing().playOf(data), { 激活灵魂: active, 休眠灵魂: dormant });
      },
      activeCapacity: sequence => {
        const gate = resolveOwnerSequence(sequence);
        return gate.unlocked ? grazing()?.activeCap(gate.rank) || 0 : 0;
      },
      activeNames: data => grazing()?.namesOf(data, '激活灵魂') || [],
      activeSelections: data => (grazing()?.namesOf(data, '激活灵魂') || [])
        .slice(0, resolveOwnerSequence(battle.summonMeta?.grazingSequence).unlocked
          ? grazing()?.activeCap(resolveOwnerSequence(battle.summonMeta?.grazingSequence).rank) || 0 : 0)
        .map(name => {
        const soul = grazing().soulsOf(data)[name];
        const card = soul.角色卡 || soul.data || soul;
        return { name, data: card, rank: grazing().rank(card.当前序列) };
      }),
      removeSoul(data, name) {
        const play = grazing()?.playOf(data);
        if (!play) return;
        delete play.灵魂列表[name];
        for (const key of ['激活灵魂', '休眠灵魂'])
          play[key] = (play[key] || []).filter(row => row !== name);
        syncProjection(battle, data);
      },
    };
  }
  function syncProjection(battle, data, actor = battle.units.find(row => row.source === 'player'),
    locked = false) {
    if (!battle.summonMeta || !data.stat_data) return;
    const pool = battle.summonMeta.pool;
    if (imagination()) {
      const ledger = battle.summonMeta.projectionSkillLedger ||= {};
      const projected = group => /^#(?:放牧:|空想:|秘术强化$|神秘再现$)/u.test(group);
      for (const [group, rows] of Object.entries(data.stat_data.序列能力列表 || {})) {
        if (!projected(group) || !Array.isArray(rows)) continue;
        for (const row of rows) {
          const key = `${group}\u0000${row.名称 || row.name || ''}`;
          ledger[key] = { ...(ledger[key] || {}) };
          for (const field of ['cooldownRemaining', 'remainingCooldown', 'currentCooldown', 'remainingUses'])
            if (Object.hasOwn(row, field)) ledger[key][field] = row[field];
        }
      }
      imagination().sync(data, pool, locked);
      modules['cryptLord.readerMystic']?.sync(data, pool, locked);
      modules['cryptLord.mysteryReenactment']?.sync(data, pool, locked);
      for (const [group, rows] of Object.entries(data.stat_data.序列能力列表 || {})) {
        if (!projected(group) || !Array.isArray(rows)) continue;
        for (const row of rows)
          Object.assign(row, ledger[`${group}\u0000${row.名称 || row.name || ''}`] || {});
      }
      const snapshot = imagination().resolve(pool, data);
      const directData = copy(data);
      const directPlay = grazing()?.playOf(directData);
      if (directPlay) directPlay.激活灵魂 = [];
      const direct = imagination().resolve(pool, directData);
      battle.summonMeta.grazingSequence = [direct.real,
        ...direct.imagined.map(row => row.sequence)].join('/');
      if (actor) actor.sequence = snapshot.effectiveSequence;
      if (actor && modules['cryptLord.teamBattleState'])
        modules['cryptLord.teamBattleState'].refreshProjectionPassives(battle, actor, data.stat_data);
    }
    battle.summonMeta.playerCard = copy(data.stat_data);
  }
  function switchGate(battle, data) {
    const actor = battle?.units?.find(row => row.source === 'player' && !row.isSummon);
    if (!battle?.summonMeta || battle.status !== 'active' || battle.phase !== 'tactic')
      return '当前不是可切换组合的战术阶段。';
    if (!present(actor) || (actor.controller || actor.source) !== 'player')
      return '本体不在场上或无法操控。';
    if (modules['cryptLord.battleHardControl']?.occupied(battle, actor))
      return '本轮受到硬控，不能切换组合。';
    if (actor.possessing || (battle.possession?.processes || []).some(row => row.casterId === actor.id) ||
      (battle.enemyControl?.processes || []).some(row => row.casterId === actor.id))
      return '维持秘偶或附身期间不能切换组合。';
    if (!imagination()?.resolve(battle.summonMeta.pool, data).grazingGate.unlocked)
      return '当前不具备放牧资格。';
    return '';
  }
  function switchOptions(battle, data) {
    if (!battle?.summonMeta || !imagination()) return null;
    const snapshot = imagination().resolve(battle.summonMeta.pool, data);
    if (!snapshot.grazingGate.unlocked) return null;
    return use(copy(battle), copy(data), undefined, rt => {
      const hero = rt.grazingProjection.player(rt.bm);
      if (!hero) return null;
      hero.sequenceRank = hero.unit.rank;
      return { reason: switchGate(battle, data), cost: rt.grazingProjection.switchCost(hero),
        capacity: grazing().activeCap(snapshot.grazingGate.rank),
        active: snapshot.grazed.map(row => row.name),
        locked: rt.grazingProjection.releasedNames(rt.bm, hero),
        rows: Object.entries(grazingCore(battle).soulRecords(data)).map(([name, soul]) => ({
          name, sequence: (soul.角色卡 || soul.data || soul).当前序列 || '未知序列' })) };
    });
  }
  function switchPlayer(battle, data, names, locked = false) {
    const reason = switchGate(battle, data);
    if (reason) return { ok: false, error: reason };
    if (!Array.isArray(names)) return { ok: false, error: '激活组合格式错误。' };
    battle.grazingSwitchLocked = locked;
    try {
      return use(battle, data, undefined, rt => {
        const hero = rt.grazingProjection.player(rt.bm);
        hero.sequenceRank = hero.unit.rank;
        hero.grazingActiveSouls = grazingCore(battle).activeSelections(data);
        const result = rt.grazingProjection.switchPlayer(rt.bm, hero, names);
        if (result.noop) return { ok: true, changed: false };
        if (!result.ok) return { ok: false, error: result.reason };
        delete battle.summonMeta.upkeepFailed;
        battle.grazingSwitchFinal = { kind: 'grazing', stage: 'switch-final',
          actor: hero.heroId, names: copy(result.names) };
        data.stat_data.当前灵性 = hero.unit.spirit;
        battle.summonMeta.playerCard = copy(data.stat_data);
        rt.bm.battleLogger.log(`切换激活灵魂：${result.names.join('、') || '无'}；消耗 ${result.cost} 灵性。`);
        return { ok: true, changed: true, cost: result.cost };
      });
    } finally { delete battle.grazingSwitchLocked; }
  }
  function flush(data) {
    const battle = data?.cryptLord?.teamBattle;
    if (!battle?.summonMeta) return data;
    const play = grazing()?.playOf(data);
    for (const name of battle.grazingPermanentLosses || []) {
      if (!play) break;
      delete play.灵魂列表[name];
      for (const key of ['激活灵魂', '休眠灵魂'])
        play[key] = (play[key] || []).filter(row => row !== name);
    }
    if (play && battle.summonMeta.upkeepFailed) {
      play.休眠灵魂 = Object.keys(play.灵魂列表 || {}).filter(key => key !== '$meta');
      play.激活灵魂 = [];
    }
    if (battle.grazingPermanentLosses?.length || battle.summonMeta.upkeepFailed)
      syncProjection(battle, data);
    return data;
  }
  function gate(battle, actor) {
    return !present(actor) ? '召唤者不在场上。'
      : actor.isSummon ? '召唤物不能再次召唤。'
      : actor.sanity <= 0 ? '当前理智不足。'
      : modules['cryptLord.battleHardControl']?.occupied(battle, actor) ? '本轮受到硬控。' : '';
  }
  function choices(rt, actor) {
    const m = rt.summon, hero = rt.heroes.find(row => row.heroId === actor.id);
    const elig = m.resolveEligibility(hero.sequenceString);
    elig['外放灵魂'] = m.resolveEligibility(m.grazingEligibilitySequence(hero))['外放灵魂'];
    return m.subtypes().filter(subtype => elig[subtype]).map(subtype => {
      const cfg = m.SUBTYPES[subtype], rows = m.targets(rt.bm, hero, subtype);
      const quota = m.quotaLeft(rt.bm, hero, subtype), cost = cfg.grazing ? 0 : m.costOf(hero, subtype);
      const reason = quota <= 0 ? '本类名额已用完。'
        : !m.hasStat(hero, subtype) ? `当前${m.statKeyOf(subtype)}为零。`
        : !m.freeCellNear(rt.bm.board, hero) ? '棋盘没有空位。'
        : !rows.length ? '没有可召唤的目标。' : '';
      return { subtype, cost, stat: m.statKeyOf(subtype), quota, max: m.maxOf(hero, subtype),
        cumulative: !cfg.grazing && !cfg.picture, reason, foes: cfg.contest === 'illusion'
          ? m.illusionFoes(rt.bm, hero).length : 0,
        rows: rows.map(row => ({ name: row.name, label: row.displayName || row.name,
          sequence: row.data.当前序列, ratio: row.ratio,
          rounds: cfg.noExpire ? null : row.rounds, sure: row.sure,
          immobile: Boolean(cfg.picture), affinity: row.affinity })) };
    });
  }
  function options(battle, actor, data) {
    if (!battle?.summonMeta || gate(battle, actor)) return [];
    return use(copy(battle), copy(data), undefined, rt => choices(rt, actor));
  }
  function preview(battle, actor, request, data) {
    const reason = gate(battle, actor);
    if (reason) return { ok: false, reason };
    const choice = options(battle, actor, data).find(row => row.subtype === request?.subtype);
    const target = choice?.rows.find(row => row.name === request?.target);
    return { ...choice, target, ok: Boolean(choice && target && !choice.reason),
      reason: choice?.reason || (!target ? '请选择有效的召唤目标。' : '') };
  }
  function apply(battle, actor, request, data, random) {
    const check = preview(battle, actor, request, data);
    if (!check.ok) return { ok: false, error: check.reason };
    return use(battle, data, random, rt => {
      const summary = [], results = [], hero = rt.heroes.find(row => row.heroId === actor.id);
      const summoned = rt.summon.tryPlayerSummon(rt.bm, hero,
        request.subtype, request.target, summary, results);
      summary.forEach(line => rt.bm.battleLogger.log(line));
      battle.summonMeta.playerCard = copy(data.stat_data);
      return { ok: true, actor: actor.id, subtype: request.subtype,
        outcome: summoned ? 'summoned' : 'failed', results: copy(results) };
    });
  }
  function npc(battle, data, excluded = [], random, priority = false) {
    if (!battle?.summonMeta) return [];
    return use(battle, data, random, rt => {
      const results = [], cfg = reference.summonConfig(), m = rt.summon;
      for (const hero of rt.heroes.slice()) {
        if (hero.controller === 'player' || hero.isSummon || !present(hero.unit) ||
          excluded.includes(hero.heroId) || gate(battle, hero.unit) ||
          hero.unit.sanity < hero.unit.maxSanity * .5 || !m.canUse(rt.bm, hero)) continue;
        let plan = priority ? m.npcPriorityPlan(rt.bm, hero) : null;
        if (!priority) {
          const elig = m.resolveEligibility(hero.sequenceString);
          const ready = k => elig[k] && m.quotaLeft(rt.bm, hero, k) > 0 && m.hasStat(hero, k);
          const kinds = m.subtypes().filter(k => ready(k) && !m.SUBTYPES[k].grazing &&
            !m.SUBTYPES[k].picture && !Number.isFinite(Number(m.SUBTYPES[k].npcPriority)));
          const graze = ready(cfg.SUMMON_GRAZING) && rt.dice() * 100 < cfg.GRAZING_NPC_CHANCE;
          const picture = ready(cfg.SUMMON_PICTURE_PERSON) &&
            rt.dice() * 100 < cfg.SUMMON_PICTURE_PERSON_NPC_CHANCE;
          const ordinary = kinds.length && rt.dice() * 100 < cfg.SUMMON_NPC_CHANCE;
          const subtype = graze ? cfg.SUMMON_GRAZING : picture ? cfg.SUMMON_PICTURE_PERSON
            : ordinary ? kinds[Math.floor(rt.dice() * kinds.length)] : '';
          const sc = m.SUBTYPES[subtype];
          const rows = !sc ? [] : sc.targetPool === 'selfTargets' ? m.selfTargets(rt.bm, hero)
            : sc.picture ? m.randomPictureCandidates(rt.bm, hero)
            : sc.grazing ? m.randomGrazingCandidates(rt.bm, hero) : m.randomCandidates(rt.bm, hero);
          m.cacheCandidates(rt.bm, hero, rows);
          if (rows.length) plan = { subtype, entry: rows[Math.floor(rt.dice() * rows.length)] };
        }
        if (!plan) continue;
        const summary = [], details = [];
        const summoned = m.tryNpcSummon(rt.bm, hero, plan.subtype, plan.entry, summary, details);
        summary.forEach(line => rt.bm.battleLogger.log(line));
        results.push({ actor: hero.heroId, subtype: plan.subtype,
          outcome: summoned ? 'summoned' : 'failed', results: copy(details) });
      }
      return results;
    });
  }
  function sweep(battle, endRound = false) {
    if (!battle?.summonMeta) return;
    use(battle, undefined, undefined, rt => {
      const results = rt.summon.tick(rt.bm);
      for (const row of results) if (row.stage !== 'picture-dead')
        rt.bm.battleLogger.log(`${row.target || row.origin}：${row.stage === 'soul-dead'
          ? '外放灵魂永久消亡' : row.stage === 'owner-dead' ? '召唤者死亡，召唤物消散' : '召唤期限结束'}`);
      if (!endRound || battle.tacticCpuMeta) return;
      const hero = rt.heroes.find(row => row.dataSource === 'player');
      const active = grazingCore(battle).activeSelections(rt.bm.currentMvuState);
      if (!hero || hero.unit.hp <= 0 || !active.length) return;
      const total = Math.max(1, Math.round((battle.fieldEffectMeta.averages[String(hero.sequenceRank)]
        || reference.averages()['10']).灵性 * .05)) * active.length;
      if (hero.unit.spirit >= total) {
        hero.unit.spirit -= total;
        rt.bm.battleLogger.log(`维持 ${active.length} 个激活灵魂，消耗 ${total} 灵性。`);
      } else {
        hero.unit.spirit = 0;
        battle.summonMeta.upkeepFailed = true;
        for (const p of battle.summon.projections.slice().filter(row =>
          row.subtype === '外放灵魂' && row.ownerId === hero.heroId))
          rt.summon.dismiss(rt.bm, rt.heroes.find(row => row.heroId === p.heroId));
        const play = grazing()?.playOf(rt.bm.currentMvuState);
        if (play) {
          play.休眠灵魂 = Object.keys(play.灵魂列表 || {}).filter(key => key !== '$meta');
          play.激活灵魂 = [];
        }
        syncProjection(battle, rt.bm.currentMvuState, hero.unit);
        rt.bm.battleLogger.log('灵性不足，激活灵魂全部沉寂，外放灵魂消散；名册保留。');
      }
    });
  }
  function finish(battle) {
    if (!battle?.summonMeta) return;
    sweep(battle);
    use(battle, undefined, undefined, rt => {
      for (const p of battle.summon.projections.slice())
        rt.summon.dismiss(rt.bm, rt.heroes.find(row => row.heroId === p.heroId));
    });
  }
  const api = { initialize, options, preview, apply, npc, sweep, finish, flush,
    grazingCore, syncProjection, switchGate, switchOptions, switchPlayer,
    status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
