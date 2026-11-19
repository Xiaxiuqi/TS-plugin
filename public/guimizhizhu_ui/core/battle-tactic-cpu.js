(() => {
  'use strict';
  const KEY = 'cryptLord.battleTacticCpu';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules;
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const fields = modules['cryptLord.battleFieldEffects'];
  const copy = value => structuredClone(value);
  const required = ['battleMythicForm', 'battleExile', 'battleActiveLeave', 'battleEvents',
    'battleRewind', 'battleExtraAction', 'battleHardControl', 'battleMindDeprive',
    'battleTempControl', 'battlePermanentControl', 'battlePossession', 'battleRuleChange',
    'battleEnvironment', 'battleFundamental', 'battleSummon', 'battleAbilityBorrow',
    'battleBalance', 'battlePunishment', 'battleBribery', 'battleEffectTransfer'];
  const schemas = ['mythicMeta', 'exileMeta', 'activeLeaveMeta', 'battleEventMeta',
    'rewindMeta', 'extraActionMeta', 'hardControlMeta', 'mindDepriveMeta',
    'tempControlMeta', 'permanentControlMeta', 'possessionMeta', 'ruleChangeMeta',
    'environmentMeta', 'fundamentalMeta', 'summonMeta', 'borrowMeta',
    'balanceMeta', 'punishmentMeta', 'briberyMeta', 'effectTransferMeta'];
  function initialize(battle, data) {
    const missing = [...required, 'battleFormulas', 'battleFieldEffects',
      'audienceImagination', 'grazingState'].find(key => !modules[`cryptLord.${key}`]);
    if (missing) throw Error(`统一战术管线缺少 ${missing}，未进行结算。`);
    // Upgrade saved native floors without resetting existing quotas, processes or pools.
    if (data) {
      battle.formulas ||= modules['cryptLord.battleFormulas'].initialize(battle.seed);
      const pathways = battle.fieldEffectMeta?.pathways || battle.summonMeta?.pool?.pathways;
      fields.initialize(battle, pathways);
      required.forEach((key, index) => {
        if (battle[schemas[index]]) return;
        const manager = modules[`cryptLord.${key}`];
        if (key === 'battleSummon') manager.initialize(battle, data);
        else manager.initialize(battle, pathways);
      });
    }
    battle.tacticCpuMeta ||= { version: 1 };
  }
  function run(battle, data, request = {}, random) {
    initialize(battle, data);
    return fields.withRuntime(battle, data, random, rt => {
      const previousLogs = new Set(battle.log);
      const player = rt.heroes.find(hero => hero.dataSource === 'player' && !hero.isSummon);
      const occupies = rt.turnSkip.occupiesTactic;
      rt.turnSkip.occupiesTactic = function (host, hero) {
        return Boolean(hero?.unit.stunned || hero?.unit.skipTurn ||
          !request.asNpc && hero?.heroId !== player?.heroId && hero?.controller === 'player') ||
          occupies.call(this, host, hero);
      };
      const target = id => rt.heroes.find(hero => hero.heroId === id);
      const opts = { playerHero: request.asNpc ? null : player, mythicX: request.mythicCount };
      let declaration = null;
      function nativeOptions(hero, method, value) {
        const row = typeof value === 'string' ? { subtype: value } : value || {};
        const chosen = target(row.target);
        switch (method) {
          case 'permanentControl': case 'tempControl': case 'hardControl':
            return { playerControl: { type: row.subtype, target: chosen } };
          case 'mindDeprive': return { playerControl: { type: rt.tacticCatalog.MIND_DEPRIVE } };
          case 'summon': return { playerSummon: { subtype: row.subtype, targetName: row.target } };
          case 'rewind': return { playerRewind: row };
          case 'extraAction': return { playerExtraAction: row };
          case 'battleEvent': return { playerBattleEvent: row };
          case 'fieldEffect': return { playerFieldEffect: { ...row, target: chosen } };
          case 'effectTransfer': return { playerEffectTransfer: { ...row, target: chosen } };
          case 'bribery': return { playerBribery: { ...row, target: chosen } };
          case 'punishment': return { playerPunishment: { target: chosen } };
          case 'balance': return { playerBalance: { target: chosen } };
          case 'exile': return { playerExile: { ...row, target: chosen } };
          case 'changeEnvironment': return { playerEnvChange: row };
          case 'fundamentalRule': return { playerFundamentalRule: row };
          case 'ruleChange': {
            const m = rt.ruleChange;
            return { playerRuleChange: m.isPresetSubtype(row.subtype)
              ? m.buildPresetPlan(rt.bm, hero, row.subtype, row.presetKey, chosen)
              : { ...row, targets: m.targetsOf(rt.bm, hero, row.scope, chosen) } };
          }
          default: throw Error(`统一战术管线不支持 ${method}。`);
        }
      }
      let borrowed = null, reportBorrowedSkill = null;
      if (request.method) {
        Object.assign(opts, nativeOptions(player, request.method, request.value));
        declaration = typeof request.value === 'string'
          ? { subtype: request.value } : request.value || {};
      }
      if (request.borrow) {
        const selected = modules['cryptLord.battleAbilityBorrow']
          .selection(battle, player.unit, request.borrow, data);
        if (!selected) throw Error('借用来源或资格已失效。');
        const owner = target(selected.source.id);
        const ctx = rt.borrowReport.begin(rt.bm,
          rt.borrowRegistry.context(player, owner, selected.authority.authority, selected.descriptor));
        ctx.atomCount = request.borrow.request?.mutations?.length || 1;
        const authority = rt.borrow.attempt(rt.bm, player, owner, ctx.authoritySubtype);
        if (!authority.ok) throw Error(authority.error || '借用权柄未能发动。');
        ctx.authorityWin = authority.win;
        rt.borrowReport.detail(rt.bm, ctx, `权柄费用 ${authority.spent.actual}/${authority.spent.cost}，拼点 ${authority.roll.casterScore}:${authority.roll.targetScore}`);
        borrowed = { ctx, authority, selected };
        declaration = { subtype: selected.descriptor.subtype };
        if (authority.win) {
          const view = rt.borrowContext.casterView(ctx);
          if (request.borrow.method === 'skillControl') {
            const summary = [], results = [];
            rt.borrowReport.execute(rt.bm, ctx, summary, results, () =>
              rt.borrowContext.withUsageOwner(rt.bm, ctx, () => {
                battle.borrowScope = { actor: player.heroId, source: owner.heroId,
                  authority: ctx.authoritySubtype, descriptor: selected.descriptor,
                  borrowId: ctx.borrowId, rolls: ctx.rolls };
                try {
                  const outcome = modules['cryptLord.teamBattleState'].borrowedSkillControl(
                    data, player.unit, request.borrow.request, rt.dice);
                  if (!outcome.ok) throw Error(outcome.error);
                  results.push({ ...outcome, kind: 'skill-control', actor: player.name });
                } finally { delete battle.borrowScope; }
              }));
            reportBorrowedSkill = { summary, results };
          } else opts.playerBorrow = { context: ctx, descriptor: selected.descriptor,
            native: nativeOptions(view, request.borrow.method, request.borrow.request) };
        }
      }
      const control = request.permanent || request.temp || request.hard || request.possession;
      if (control) {
        const type = control.mode === 'continue' ? rt.tacticCatalog.POSSESS_CONTINUE
          : control.mode === 'release' ? rt.tacticCatalog.POSSESS_RELEASE : control.subtype;
        opts.playerControl = { type, target: target(control.target) };
        declaration = { subtype: control.subtype || type };
      } else if (request.mind) {
        opts.playerControl = { type: rt.tacticCatalog.MIND_DEPRIVE };
        declaration = { subtype: rt.tacticCatalog.MIND_DEPRIVE, outcome: 'mind-deprive' };
      }
      if (request.exile) {
        opts.playerExile = { ...request.exile, target: target(request.exile.target) };
        declaration = request.exile;
      }
      if (request.leave) {
        opts.playerActiveLeave = request.leave; declaration = request.leave;
      }
      if (request.rule) {
        const row = request.rule;
        const m = rt.ruleChange;
        opts.playerRuleChange = m.isPresetSubtype(row.subtype)
          ? m.buildPresetPlan(rt.bm, player, row.subtype, row.presetKey, target(row.target))
          : { ...row, targets: m.targetsOf(rt.bm, player, row.scope, target(row.target)) };
        declaration = row;
      }
      if (request.environment) {
        opts.playerEnvChange = { subtype: request.environment.subtype };
        declaration = request.environment;
      }
      for (const hero of rt.heroes)
        if (hero.dataSource === 'player') hero.grazingActiveSouls =
          modules['cryptLord.battleSummon'].grazingCore(battle).activeSelections(data);
      const report = rt.enemyControl.runFrontendNpcTactics(rt.bm, opts);
      if (reportBorrowedSkill) {
        report.results.push(...reportBorrowedSkill.results);
        report.summary.push(...reportBorrowedSkill.summary);
      }
      if (borrowed && !opts.playerBorrow) {
        rt.borrowReport.finish(rt.bm, borrowed.ctx, report.results, report.summary);
        report.results = rt.borrowReport.package(report.results, [borrowed.ctx]);
      }
      const acted = [...new Set([...report.controlNpcs, ...report.mythicNpcs])];
      if (declaration && player && !acted.includes(player)) acted.push(player);
      const idOf = name => target(name)?.heroId ||
        rt.heroes.find(hero => hero.name === name)?.heroId || name;
      const results = report.results.map(row => ({ ...row, actor: idOf(row.actor),
        ...(row.target ? { target: idOf(row.target) } : {}) }));
      const namedHeroes = [...acted].sort((a, b) => b.name.length - a.name.length);
      const summaries = new Map();
      for (const line of report.summary) {
        const text = String(line).replace(/^[^\p{L}\p{N}<]+/u, '');
        const hero = namedHeroes.find(row => text.startsWith(row.name));
        if (!hero) continue;
        if (!summaries.has(hero.heroId)) summaries.set(hero.heroId, []);
        summaries.get(hero.heroId).push(line);
      }
      const outcomes = acted.map(hero => {
        const rows = results.filter(row => row.actor === hero.heroId);
        const declared = hero === player ? declaration : null;
        const summary = summaries.get(hero.heroId) || [];
        return { actor: hero.heroId, subtype: declared?.subtype || rows[0]?.subtype,
          outcome: declared?.outcome || 'settled',
          summary: summary.length ? summary : [`${hero.name} · 战术已结算`], results: rows };
      });
      if (borrowed) {
        const row = outcomes.find(row => row.actor === player.heroId);
        Object.assign(row, { outcome: borrowed.authority.win ? 'borrowed' : 'resisted',
          authority: copy(borrowed.authority), source: borrowed.selected.source.id,
          ability: borrowed.selected.descriptor.id });
      }
      const switches = results.filter(row => row.kind === 'grazing' && row.stage === 'switch-final');
      outcomes.push(...switches.map(row => ({ ...row,
        summary: [`放牧激活组合：${row.names.join('、') || '无'}`] })));
      delete battle.grazingSwitchFinal;
      const normalize = text => String(text).replace(/^[✓✗↩⚡✨⏳◈\s]+/u, '');
      const logged = new Set(battle.log.filter(row => !previousLogs.has(row))
        .map(row => normalize(row.message)));
      for (const line of report.summary) {
        const key = normalize(line);
        if (!logged.has(key)) { rt.bm.battleLogger.log(line); logged.add(key); }
      }
      battle.tacticCpuMeta.last = { round: battle.round,
        actors: outcomes.filter(row => row.stage !== 'switch-final').map(row => row.actor),
        results: copy(results) };
      modules['cryptLord.battleSummon'].syncProjection(battle, data, player?.unit);
      return copy(outcomes);
    });
  }
  const api = { initialize, run, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
