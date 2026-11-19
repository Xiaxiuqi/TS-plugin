(() => {
  'use strict';
  const KEY = 'cryptLord.battleAbilityBorrow';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const copy = value => structuredClone(value);
  const use = (battle, data, random, fn) => fields.withRuntime(battle, data, random, fn);
  const present = a => a?.hp > 0 && !a.offField && !a.exiled && !a.activeLeaving && !a.possessedHidden;
  const moduleOf = suffix => modules[`cryptLord.battle${suffix}`];
  const routes = {
    'skill-control': ['技能干涉', 'skillControl'],
    control: ['永久控制', 'permanentControl'], temp: ['阵营短控', 'tempControl'],
    hard: ['硬控', 'hardControl'], bribery: ['贿赂', 'bribery'],
    punishment: ['惩戒', 'punishment'], balance: ['平衡', 'balance'],
    rule: ['规则修改', 'ruleChange'], fundamental: ['底层规则修改', 'fundamentalRule'],
    environment: ['改变环境', 'changeEnvironment'], exile: ['放逐', 'exile'],
    extra: ['额外行动', 'extraAction'], field: ['施加效果', 'fieldEffect'],
    transfer: ['效果传递', 'effectTransfer'], event: ['制造战场事件', 'battleEvent'],
    rewind: ['回溯', 'rewind'], summon: ['召唤', 'summon'],
  };
  function route(d) {
    return d?.id === 'control:mind-deprive' ? ['心智剥夺', 'mindDeprive']
      : routes[d?.id.split(':')[0]];
  }
  function initialize(battle) { battle.borrowMeta ||= { version: 1 }; }
  function blocked(battle, actor) {
    return !present(actor) ? '施法者不在场。' : actor.sanity <= 0 ? '理智不足。'
      : moduleOf('HardControl')?.occupied(battle, actor) ? '本轮战术被占用。'
      : battle.enemyControl?.processes.some(p => p.casterId === actor.id) ||
        battle.possession?.processes.some(p => p.casterId === actor.id)
        ? '当前正在维持控制过程。' : '';
  }
  function options(battle, actor, data) {
    if (!battle.borrowMeta || blocked(battle, actor)) return [];
    return use(copy(battle), copy(data), undefined, rt => {
      const hero = rt.heroes.find(h => h.heroId === actor.id), m = rt.borrow;
      return m.availableSubtypes(hero).map(authority => ({
        authority, name: m.displayName(hero, authority), cost: m.costOf(hero, authority),
        balance: hero.additionalStats.当前灵性,
        sources: m.sources(rt.bm, hero, authority).map(owner => ({
          id: owner.heroId, name: owner.name,
          abilities: rt.borrowRegistry.list(rt.bm, hero, owner).map(d => ({
            ...copy(d), actionLabel: route(d)?.[0], method: route(d)?.[1],
          })),
        })),
      }));
    });
  }
  function selection(battle, actor, request, data) {
    const authority = options(battle, actor, data).find(r => r.authority === request?.authority);
    const source = authority?.sources.find(r => r.id === request?.source);
    const descriptor = source?.abilities.find(r => r.id === request?.ability);
    return descriptor ? { authority, source, descriptor } : null;
  }
  function project(data, request) {
    const next = copy(data), battle = next.cryptLord?.teamBattle;
    const actor = battle?.units.find(r => r.source === 'player');
    const selected = actor && selection(battle, actor, request, next);
    if (!selected) return null;
    actor.spirit = Math.max(0, actor.spirit - selected.authority.cost);
    battle.borrowScope = { actor: actor.id, source: selected.source.id,
      authority: selected.authority.authority, descriptor: selected.descriptor };
    return next;
  }
  // A facade lets the original, complete parameter editors keep their native schemas.
  function facade(engine, getData, request) {
    const selected = selection(engine.get(getData()),
      engine.get(getData()).units.find(r => r.source === 'player'), request, getData());
    if (!selected) return engine;
    const d = selected.descriptor, method = route(d)[1];
    return new Proxy({ ...engine }, {
      get(target, key) {
        if (key === method) return (data, value) =>
          target.abilityBorrow(data, { ...request, method, request: value });
        if (key === 'advanceAuto') return target[key];
        if (typeof target[key] !== 'function' || !/Options$|Preview$/u.test(key)) return target[key];
        return (_data, ...args) => {
          const projected = project(getData(), request);
          if (!projected) return /Options$/u.test(key) ? [] : { ok: false, reason: '借用来源失效。' };
          if (key === 'skillControlOptions') {
            const native = target.skillControlOptions(getData());
            return { ...native, modes: d.mode ? { [d.mode]: d.label } : {} };
          }
          let result = target[key](projected, ...args);
          if (/Options$/u.test(key)) {
            if (Array.isArray(result)) result = result.filter(r => r.subtype === d.subtype);
            else if (result?.choices) result.choices = result.choices.filter(r => r.subtype === d.subtype);
          }
          return result;
        };
      },
    });
  }
  function dispatch(battle, actor, method, request, data, random) {
    const otherIds = battle.units.filter(r => r.id !== actor.id).map(r => r.id);
    const allIds = battle.units.map(r => r.id);
    const prepared = (suffix, value) => {
      const m = moduleOf(suffix);
      const rows = m.prepare(battle, data, random, otherIds, value);
      const outcomes = m.apply(battle, data, random, rows);
      return outcomes.length ? { ok: true, ...outcomes[0] }
        : { ok: false, error: '原能力参数或目标已失效。' };
    };
    switch (method) {
      case 'fieldEffect': return moduleOf('FieldEffects').attempt(battle, actor, request.subtype, request.target, data, random);
      case 'effectTransfer': return moduleOf('EffectTransfer').attempt(battle, actor, request.subtype, request.target, data, random);
      case 'bribery': return moduleOf('Bribery').attempt(battle, actor, request.subtype, request.target, data, random);
      case 'punishment': return moduleOf('Punishment').attempt(battle, actor, request.target, data);
      case 'balance': return moduleOf('Balance').attempt(battle, actor, request.target, data);
      case 'fundamentalRule': return moduleOf('Fundamental').apply(battle, actor, request, data, random);
      case 'summon': return moduleOf('Summon').apply(battle, actor, request, data, random);
      case 'battleEvent': return moduleOf('Events').attempt(battle, actor, request, data, random);
      case 'extraAction': return moduleOf('ExtraAction').grant(battle, actor, request, data);
      case 'rewind': return moduleOf('Rewind').apply(battle, actor, request.subtype, request.round, data);
      case 'permanentControl': return prepared('PermanentControl', request);
      case 'tempControl': return prepared('TempControl', request);
      case 'mindDeprive': return prepared('MindDeprive', true);
      case 'ruleChange': return prepared('RuleChange', request);
      case 'changeEnvironment': return prepared('Environment', request);
      case 'hardControl': {
        const rows = moduleOf('HardControl').resolve(battle, data, random, allIds, request);
        return rows.length ? { ok: true, ...rows[0] } : { ok: false, error: '硬控目标失效。' };
      }
      case 'exile': return moduleOf('Exile').resolve(battle, data, random,
        { ...request, actor: actor.id }, allIds);
      case 'skillControl': return modules['cryptLord.teamBattleState'].borrowedSkillControl(data, actor, request, random);
      default: return { ok: false, error: '该能力不允许借用。' };
    }
  }
  function validateRequest(battle, actor, request, data) {
    const selected = selection(battle, actor, request, data);
    if (!selected || blocked(battle, actor) || route(selected.descriptor)?.[1] !== request.method)
      return { ok: false, error: blocked(battle, actor) || '借用资格、来源或能力已变化。' };
    const descriptor = selected.descriptor;
    if (request.method !== 'mindDeprive' && descriptor.subtype && descriptor.subtype !==
      (typeof request.request === 'string' ? request.request : request.request?.subtype))
      return { ok: false, error: '选定能力与发动参数不一致。' };
    if (descriptor.mode && descriptor.mode !== request.request?.mode)
      return { ok: false, error: '选定技能干涉模式不一致。' };
    // Validate the complete native command on a disposable, post-authority-cost state.
    // Invalid targets must be rejected even when the subsequent authority roll would lose.
    const probe = project(data, request), probeBattle = probe.cryptLord.teamBattle;
    const validation = dispatch(probeBattle, probeBattle.units.find(r => r.id === actor.id),
      request.method, request.request, probe, () => .5);
    if (validation?.ok === false) return validation;
    return { ok: true, selected };
  }
  function apply(battle, actor, request, data, random) {
    const validation = validateRequest(battle, actor, request, data);
    if (!validation.ok) return validation;
    const selected = validation.selected, descriptor = selected.descriptor;
    return use(battle, data, random, rt => {
      const caster = rt.heroes.find(h => h.heroId === actor.id);
      const owner = rt.heroes.find(h => h.heroId === selected.source.id);
      const ctx = rt.borrowReport.begin(rt.bm,
        rt.borrowRegistry.context(caster, owner, selected.authority.authority, descriptor));
      ctx.atomCount = request.request?.mutations?.length || 1;
      const authority = rt.borrow.attempt(rt.bm, caster, owner, ctx.authoritySubtype);
      if (!authority.ok) return authority;
      ctx.authorityWin = authority.win;
      rt.borrowReport.detail(rt.bm, ctx, `权柄费用 ${authority.spent.actual}/${authority.spent.cost}，拼点 ${authority.roll.casterScore}:${authority.roll.targetScore}${authority.win ? '，成功' : '，失败'}`);
      let native = null;
      const results = [], summary = [];
      if (authority.win) {
        battle.borrowScope = { actor: actor.id, source: owner.heroId, authority: ctx.authoritySubtype,
          descriptor, borrowId: ctx.borrowId, rolls: ctx.rolls };
        try {
          native = rt.borrowReport.execute(rt.bm, ctx, summary, results, () => {
            const outcome = dispatch(battle, actor, request.method, request.request, data, random);
            if (outcome?.ok === false) return outcome;
            results.push(...(outcome?.results || outcome?.outcomes?.flatMap(r => r.results || []) ||
              [{ kind: descriptor.resultKinds[0], actor: caster.name, outcome: outcome?.outcome,
                success: !['resisted', 'failed', 'superseded'].includes(outcome?.outcome) }])
              .map(r => ({ ...r, borrowId: ctx.borrowId })));
            return outcome;
          });
        } finally { delete battle.borrowScope; }
        if (native?.ok === false) return native;
      }
      rt.borrowReport.finish(rt.bm, ctx, results, summary);
      return { ok: true, actor: actor.id, outcome: authority.win ? 'borrowed' : 'resisted',
        authority: copy(authority), source: owner.heroId, ability: descriptor.id,
        native: native && copy(native), summary,
        results: copy(rt.borrowReport.package(results, [ctx])) };
    });
  }
  // NPC plans come from the original registry; each category has one probability roll.
  function npc(battle, data, excluded = [], random) {
    if (!battle.borrowMeta) return [];
    return use(battle, data, random, rt => {
      const outcomes = [];
      for (const caster of rt.heroes.slice()) {
        if (caster.controller === 'player' || excluded.includes(caster.heroId) ||
          blocked(battle, caster.unit)) continue;
        const authorities = rt.borrow.availableSubtypes(caster).map(authority => ({
          authority, sources: rt.borrowRegistry.npcSources(rt.bm, caster, authority),
        })).filter(r => r.sources.length);
        if (!authorities.length || rt.dice() >= .3) continue;
        const pick = rows => rows[Math.floor(rt.dice() * rows.length)];
        const auth = pick(authorities), owner = pick(auth.sources);
        const groups = rt.borrowRegistry.npcGroupsForSource(rt.bm, caster, owner, auth.authority);
        const plan = rt.borrowRegistry.planNpcGroup(rt.bm, caster, owner, auth.authority, pick(groups));
        if (!plan) continue;
        const ctx = rt.borrowReport.begin(rt.bm, plan.context);
        ctx.npcFallback = plan.kind === 'rule-change';
        const authority = rt.borrow.attempt(rt.bm, caster, owner, auth.authority);
        if (!authority.ok) continue;
        ctx.authorityWin = authority.win;
        const summary = [], results = [];
        rt.borrowReport.detail(rt.bm, ctx, `权柄费用 ${authority.spent.actual}/${authority.spent.cost}，拼点 ${authority.roll.casterScore}:${authority.roll.targetScore}`);
        if (authority.win) rt.borrowReport.execute(rt.bm, ctx, summary, results, () =>
          rt.borrowContext.withUsageOwner(rt.bm, ctx, () => executeNpc(rt, plan, summary, results)));
        rt.borrowReport.finish(rt.bm, ctx, results, summary);
        summary.forEach(line => rt.bm.battleLogger.log(line));
        outcomes.push({ actor: caster.heroId, source: owner.heroId, ability: plan.descriptor.id,
          outcome: authority.win ? 'borrowed' : 'resisted', authority: copy(authority),
          results: copy(rt.borrowReport.package(results, [ctx])) });
      }
      return outcomes;
    });
  }
  function executeNpc(rt, plan, summary, results) {
    const bm = rt.bm, hero = plan.view, sub = plan.subtype || plan.native?.subtype;
    const target = plan.target || plan.native?.target;
    switch (plan.kind) {
      case 'skill-control': return rt.skillControl.npcAttempt(bm, hero, plan.mode, plan.pair,
        rt.skillControl.resolveEligibility(hero.sequenceString)[plan.mode], summary, results);
      case 'bribery': return rt.bribery.attempt(bm, hero, target, sub, summary, results);
      case 'punishment': {
        const hit = rt.punishment.activate(bm, hero, target);
        if (hit.applied) results.push({ kind: 'punishment', actor: hero.name, target: target.name });
        return hit.applied;
      }
      case 'balance': {
        const hit = rt.balance.activate(bm, hero, target);
        if (hit.applied) results.push(rt.balance.resultOf(hero, hit));
        return hit.applied;
      }
      case 'rule-change': {
        const hit = rt.ruleChange.attempt(bm, hero, plan.native);
        return rt.ruleChange.arbitrate(bm, [hit], summary, results);
      }
      case 'environment': {
        const hit = rt.environment.attempt(bm, hero, plan.native);
        rt.environment.arbitrate(bm, [hit], summary, results);
        return rt.environment.resync(bm);
      }
      case 'field': return rt.field.attempt(bm, hero, sub, target || null, summary, results);
      case 'transfer': return rt.transfer.attempt(bm, hero, target, sub, summary, results);
      case 'event': return rt.battleEvent.attempt(bm, hero, sub, summary, results);
      case 'extra': return rt.extraAction.grant(bm, hero, sub, summary, results);
      case 'rewind': return rt.rewind.apply(bm, hero, sub, plan.round, summary, results);
      case 'summon': return rt.summon.tryNpcSummon(bm, hero, sub, plan.native.entry, summary, results);
      case 'exile': {
        const spent = rt.exile.spend(hero);
        return rt.exile.arbitrate(bm, [{ caster: hero, target, subtype: sub,
          roll: rt.exile.contest(hero, target, hero.additionalStats[spent.field]) }], summary, results);
      }
      case 'mind-deprive': {
        const pool = rt.mindDeprive.targetsInRange(bm, hero), spent = rt.mindDeprive.spend(hero);
        return rt.mindDeprive.arbitrate(bm, pool.map(target => ({ caster: hero, target,
          roll: rt.mindDeprive.contest(hero, target, hero.additionalStats[spent.field]) })), summary, results);
      }
      case 'control': {
        if (rt.hardControl.has(sub))
          return rt.hardControl.arbitrate(bm, [rt.hardControl.attempt(hero, target, sub)], summary, results);
        if (rt.tempAllegiance.subtypes().includes(sub)) {
          const spent = rt.tempAllegiance.spend(hero, sub);
          return rt.tempAllegiance.arbitrate(bm, [{ caster: hero, target, subtype: sub,
            roll: rt.tempAllegiance.contest(hero, target, hero.additionalStats[spent.field]) }], summary, results);
        }
        const m = rt.enemyControl, state = m.ensure(bm);
        const spec = { 征服: ['conquestUsed', 'conquestTries'],
          '「心灵」权柄': ['mindUsed', 'mindTries'], 奴役: ['enslaveUsed', 'enslaveTries'],
          驯化: ['tameUsed', 'tameTries'] }[sub];
        state[spec[0]].add(hero.heroId);
        const stat = sub === '「心灵」权柄' ? '当前人性'
          : sub === '驯化' ? m.tameStatKey(hero) : '当前灵性';
        if (sub === '「心灵」权柄') m.spendHumanity(hero);
        else if (sub === '驯化') m.spendTame(hero);
        else m.spendSpirit(hero);
        const groups = { marionetteTries: [], conquestTries: [], mindTries: [], enslaveTries: [], tameTries: [] };
        const penalty = sub === '奴役' ? m.enslavePenalty(hero, target) : bm.controlConfig.CONTROL_PENALTY;
        groups[spec[1]].push({ caster: hero, target, borrowId: plan.context.borrowId,
          roll: m.contest(hero, target, penalty, hero.additionalStats[stat.startsWith('当前') ? stat : `当前${stat}`]) });
        return m.arbitrate(bm, groups, summary, results);
      }
    }
  }
  const api = { initialize, options, selection, project, facade, apply, npc, validateRequest,
    validateNative: (battle, actor, method, request, data) =>
      dispatch(battle, actor, method, request, data, () => .5),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
