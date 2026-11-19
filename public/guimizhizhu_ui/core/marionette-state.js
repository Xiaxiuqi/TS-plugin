(() => {
  'use strict';
  const KEY = 'cryptLord.marionetteState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.marionetteReference'];
  const fields = modules['cryptLord.battleFieldEffectReference'];
  const copy = value => structuredClone(value);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(name);
  const mutations = new Set(['certify', 'story-judge', 'story-add', 'do-promote', 'revert',
    'unmark', 'rename', 'reroll', 'drop', 'craft']);
  function guard(data) {
    if (!object(data?.stat_data)) throw Error('当前楼层没有角色变量');
    for (const key of ['teamBattle', 'personalBattle']) {
      const battle = data?.cryptLord?.[key];
      if (battle && (battle.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(battle.status) && !battle.settled ||
        key === 'personalBattle' && battle.status === 'finished' && battle.result === 'victory' &&
          battle.enemy?.npcKey && !battle.experienceClaimed))
        throw Error('战斗进行中或尚未结算，不能修改秘偶');
    }
  }
  function gate(data, pool, source = 'puppet') {
    const play = modules['cryptLord.battlePlayUnits'].sources(data, pool)
      .find(row => row.play.BAG_SOURCE === source)?.play;
    const sequence = modules['cryptLord.audienceImagination']?.resolve(pool, data)?.effectiveSequence ||
      data?.stat_data?.当前序列;
    return play?.resolve(sequence) || { rank: null, unlocked: false };
  }
  function validateObjective(value) {
    if (!object(value) || !String(value.当前序列 || '').trim() ||
      !['活力', '敏捷', '灵性', '理智', '人性', '运气'].every(key =>
        Number.isFinite(value[key]) && value[key] >= 1))
      throw Error('秘偶序列或六维数据无效，未入册');
    return copy(value);
  }
  function validateSubjective(value) {
    if (!object(value) || !Number.isFinite(value.好感度)) throw Error('秘偶人物关系数据无效');
    return copy(value);
  }
  function create(data, pool, options = {}, specification = {}) {
    const draft = copy(data);
    let teamSource = null;
    const modeReference = specification.reference || reference;
    const source = specification.source || 'puppet';
    const label = specification.label || '秘偶';
    const rank = modeReference.rank;
    const originalSynthesis = fields.create({ Math, parseSequenceRank: rank,
      GameDBManager: { DB: { ...fields.summonDefaults(), abilitySystemDB: {},
        ...pool.pictureConfig, godPathways: pool.pathways, sequenceAbilities: pool.abilities || {} } } }).summon;
    const mode = modeReference.create({
      pool, rank, window: options.window, resolveGate: () => gate(draft, pool, source),
      synthesize: sequence => originalSynthesis.synthesizeRecord(sequence),
      rollAbilities: sequence => originalSynthesis.rollAbilitiesFor(sequence),
      validateObjective, validateSubjective, scope: options.scope || (() => null),
      evidenceList: options.evidenceList || (async () => []),
    });
    const originalNameTaken = mode.nameTaken;
    mode.nameTaken = (game, name) => forbidden(name) ? '名称为空或为系统保留键' :
      originalNameTaken.call(mode, game, name);
    const candidates = mode.candidates;
    mode.candidates = game => candidates.call(mode, game).filter(row => !forbidden(row.name))
      .map((row, idx) => ({ ...row, idx }));
    const promote = mode.doPromote;
    mode.doPromote = async (win, name) => {
      if (Object.hasOwn(win.game.currentMvuState.stat_data.人物关系列表 || {}, name))
        throw Error('人物关系列表已有同名角色，不能覆盖入册');
      const card = mode.recordOfState(draft, name);
      if (card && !mode.snapshotOf(card)) validateObjective(card);
      return promote.call(mode, win, name);
    };
    const renameKey = specification.renameKey || 'renameRecord';
    const rename = mode[renameKey];
    mode[renameKey] = async (win, oldName) => {
      const before = mode.recordOfState(draft, oldName);
      await rename.call(mode, win, oldName);
      if (before && before.名称 !== oldName) {
        const snap = mode.snapshotOf(before);
        if (snap) {
          snap.客观.名称 = before.名称;
          if (snap.主观) snap.主观.名称 = before.名称;
        }
      }
    };
    const win = {
      game: { currentMvuState: draft, _getLatestStoryContent: () => options.message || '',
        stringifyJourneyEvent: event => event.正文 || event.详细描述 || '',
        showConfirmModal: options.confirm || (async () => false),
        showPromptModal: options.prompt || (async () => null) },
      _modeState: {}, isBusy: false, sd: () => draft.stat_data,
      playerName: () => String(draft.stat_data.名称 || '<User>'),
      playerSequence: () => modules['cryptLord.audienceImagination']?.resolve(pool, draft)?.effectiveSequence ||
        String(draft.stat_data.当前序列 || ''),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: options.notice || (() => {}), render: options.render || (() => {}),
      chooseNarrative: options.chooseNarrative || (async () => 'skip'),
      promptNarrativeText: options.promptNarrativeText || (async () => ''),
      writeNarrativeToInput: text => effects.push({ type: 'native-input', text }),
      ensureApiReady: () => true,
      callRaw: (system, user, specified) => request(system, user, options.evidence || options.message || '', specified, options),
      // Original persistZero must never write floor #0. The UI commits this isolated draft once.
      persist: () => {}, persistZero: async () => {},
      forgetTeamEntry(name) {
        const team = draft.cryptLord?.teamComposition;
        if (!team) return;
        for (const key of ['allyTeam', 'enemyTeam'])
          if (Array.isArray(team[key])) team[key] = team[key].filter(row =>
            !(row.name === name && row.dataSource === teamSource));
      },
      guardBattleMutation(act) {
        if (!mutations.has(act)) return false;
        try { guard(draft); }
        catch (error) { throw Error(error.message.replaceAll('秘偶', label)); }
        if (!gate(draft, pool, source).unlocked) throw Error(`当前有效途径不满足${label}解锁条件`);
        return false;
      },
    };
    const effects = [];
    const state = mode.state(win);
    return { mode, win, state, effects, data: draft,
      async action(act, arg) {
        const before = copy(draft), beforeState = copy(state), effectsCount = effects.length;
        try {
          if (['drop', 'rename', 'reroll', 'do-promote', 'revert', 'unmark'].includes(act) && forbidden(arg))
            throw Error(`无效${label}名称`);
          if (act === 'drop' && !await win.game.showConfirmModal(`确定销毁「${arg}」？此操作不可恢复。`)) return;
          teamSource = ['revert', 'unmark'].includes(act) ? 'npc' : source;
          if (['certify', 'story-judge', 'craft'].includes(act)) state.lastError = '';
          await mode.action(win, act, arg);
          if (['certify', 'story-judge', 'craft'].includes(act) && state.lastError &&
            JSON.stringify(draft) !== JSON.stringify(before))
            throw Error(`${state.lastError}；本次草稿未提交`);
          return draft;
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          effects.splice(effectsCount);
          throw error;
        } finally { teamSource = null; }
      },
      render() { return mode.render(win, gate(draft, pool, source)); },
    };
  }
  async function request(system, user, evidence, specified = '', options = {}) {
    const check = () => {
      if (options.guard?.() === false) throw new DOMException('玩法请求已取消', 'AbortError');
    };
    check();
    const settingsService = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi',
      { timeoutMs: 10000 });
    const settings = structuredClone(await settingsService.readSettings());
    check();
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const normalizer = modules['cryptLord.responseNormalizer'];
    const signature = modules['cryptLord.nativeFloorSource']?.signature || JSON.stringify;
    async function verify() {
      check();
      if (options.guard) {
        await options.assertCurrent?.();
        check();
        if (modules['cryptLord.variableSettlementApi'] !== settingsService ||
          modules['cryptLord.hostApi'] !== host || modules['cryptLord.responseNormalizer'] !== normalizer)
          throw Error('玩法请求服务已变化，请重新认定');
        if (signature(await settingsService.readSettings()) !== signature(settings))
          throw Error('系统独立 API 设置已变化，请重新认定');
        check();
        if (modules['cryptLord.variableSettlementApi'] !== settingsService ||
          modules['cryptLord.hostApi'] !== host || modules['cryptLord.responseNormalizer'] !== normalizer)
          throw Error('玩法请求服务已变化，请重新认定');
      }
    }
    const config = { should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false, use_persona: false,
      ordered_prompts: ['world_info_before', 'world_info_after',
        { role: 'system', content: system },
        { role: 'user', content: `${user}\n${
          object(evidence) ? `<历史事件>\n${evidence.history || ''}\n</历史事件>\n<近期事件>\n${
            evidence.recent || ''}\n</近期事件>\n<最新剧情>\n${evidence.latest || ''}\n</最新剧情>` :
            `<最新剧情>\n${String(evidence)}\n</最新剧情>`}\n${specified || ''}` }] };
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw Error('系统独立 API 缺少 URL 或模型');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey,
        model: settings.model, source: 'openai' };
    }
    await verify();
    const reply = await host.generateRaw(config);
    await verify();
    const text = typeof reply === 'string' ? reply : reply?.content || '';
    return options.guard && normalizer?.maskHidden ? normalizer.maskHidden(text) : text;
  }
  const api = { create, gate, guard, request, validateObjective, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
