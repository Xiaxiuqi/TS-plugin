(() => {
  'use strict';
  const KEY = 'cryptLord.workshopState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const native = modules['cryptLord.marionetteState'];
  const copy = value => structuredClone(value);
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(name);
  const mutations = new Set(['construct-create', 'construct-grant-confirm', 'construct-revoke',
    'construct-repair-sync', 'construct-repair', 'construct-refit-module',
    'construct-refit-ability', 'construct-rename', 'construct-scrap', 'material-recognize', 'material-settle']);
  const gate = (data, pool) => native.gate(data, pool, 'savant-construct');
  function guard(data) {
    try { native.guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '造物')); }
  }
  function create(data, pool, options = {}) {
    const draft = copy(data), effects = [];
    const realWindow = options.window || window;
    const db = { ...modules['cryptLord.battleFieldEffectReference'].summonDefaults(), ...pool.pictureConfig };
    const averages = pool.pictureConfig?.consumableConfig?.avgAttrByRank ||
      modules['cryptLord.battleFieldEffectReference'].averages();
    let mode, failure = '';
    const projection = data => modules['cryptLord.audienceImagination'].resolve(pool, data);
    const resolve = () => gate(draft, pool);
    const facade = {
      document: realWindow.document, crypto: realWindow.crypto,
      confirm: options.confirmSync || (text => realWindow.confirm(text)),
      prompt: options.promptSync || ((text, value) => realWindow.prompt(text, value)),
      SavantEquipmentEnhancementMode: modules['cryptLord.savantEnhancement'],
      PlayerProjectionResolver: true, AudienceImaginationCore: true, PathwayPlaySources: true,
      PathwaySeqUtil: true, pathwayPlayWindowInstance: { forgetTeamEntry: name => {
        const managed = mode.managedRecordOfState(draft, name);
        // Original callbacks run after a record has changed pools or been deleted.
        const source = ['construct-revoke'].includes(currentAction) ? 'npc' :
          ['construct-grant-confirm'].includes(currentAction) ? 'savant-construct' : teamSource;
        const team = draft.cryptLord?.teamComposition;
        for (const key of ['allyTeam', 'enemyTeam'])
          if (Array.isArray(team?.[key])) team[key] = team[key].filter(row =>
            !(row.name === name && row.dataSource === (source || (managed?.autonomous ? 'npc' : 'savant-construct'))));
      } },
    };
    let currentAction = '', teamSource = '';
    mode = modules['cryptLord.workshopReference'].create({
      window: facade, pool, db, averages, projection, resolve,
      scope: options.scope || (() => null),
      withBag: () => modules['cryptLord.battlePlayUnits'].sources(draft, pool).map(row => row.play),
      validateObjective(value) {
        const result = copy(value), baseline = result.$造物机械基准;
        if (!baseline || result.$完全自主造物 !== true) throw Error('造物机械基准缺失');
        const settled = modules['cryptLord.battleExperience'].settle(result.$战斗经验,
          result.$战斗经验等级, modules['cryptLord.marionetteReference'].rank(result.当前序列));
        result.$战斗经验 = settled.exp; result.$战斗经验等级 = settled.level;
        for (const key of ['活力', '敏捷', '灵性', '理智', '人性', '运气']) {
          if (!Number.isFinite(baseline[key]) || baseline[key] < 1) throw Error('造物六维基准无效');
          result[key] = Math.max(1, Math.round(baseline[key] * (1 + settled.level * .02)));
          if (key !== '运气') result[`当前${key}`] = Math.max(0, Math.min(result[key], Number(result[`当前${key}`]) || 0));
        }
        return result;
      },
      validateSubjective(value) {
        if (!Number.isFinite(value.好感度)) throw Error('造物人物关系无效');
        return copy(value);
      },
    });
    const nameError = mode.nameError;
    mode.nameError = (data, name, oldName) => forbidden(name) ? '名称为系统保留键' :
      nameError.call(mode, data, name, oldName);
    const items = mode.itemSources, corpses = mode.corpseSources;
    mode.itemSources = win => items.call(mode, win).filter(row => !forbidden(row.itemKey));
    mode.corpseSources = win => corpses.call(mode, win).filter(row => !forbidden(row.name));
    const win = {
      game: { currentMvuState: draft, _getLatestStoryContent: () => options.message || '',
        showConfirmModal: options.confirm || (async text => facade.confirm(text)) },
      _modeState: {}, isBusy: false, sd: () => draft.stat_data,
      playerName: () => String(draft.stat_data.名称 || '<User>'),
      playerSequence: () => projection(draft)?.effectiveSequence || draft.stat_data.当前序列,
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg(text) {
        if (/^(?:授予完全自主权|收回完全自主权|制造|维修|结构改装|能力改装)失败/.test(text))
          failure = String(text);
        options.notice?.(text);
      },
      render: options.render || (() => {}),
      chooseNarrative: options.chooseNarrative || (async () => 'skip'),
      promptNarrativeText: options.promptNarrativeText || (async () => ''),
      writeNarrativeToInput: text => effects.push({ type: 'native-input', text }),
      ensureApiReady: () => true,
      callRaw: (system, user) => native.request(system, user, options.evidence || options.message || '', '',
        { guard: options.guard, assertCurrent: options.assertCurrent }),
      persist() {}, async persistZero() {},
      battleOngoing() { try { guard(draft); return false; } catch { return true; } },
      guardBattleMutation(act) {
        if (mutations.has(act)) {
          guard(draft);
          if (!gate(draft, pool).unlocked) throw Error('当前有效途径不满足通识者工坊解锁条件');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return { data: draft, effects, mode, win, state,
      render: () => mode.render(win, gate(draft, pool)),
      async action(act, arg) {
        const before = copy(draft), beforeState = copy(state), count = effects.length;
        failure = ''; currentAction = act;
        const managed = mode.managedRecordOfState(draft, state.constructTarget || arg);
        teamSource = managed?.autonomous ? 'npc' : 'savant-construct';
        try {
          if (['construct-open', 'construct-grant-open', 'construct-grant-confirm', 'construct-revoke'].includes(act) &&
            forbidden(arg || state.constructTarget)) throw Error('无效造物名称');
          const version = draft.stat_data?.$专属玩法?.通识者途径?.[
            act.startsWith('material-') ? '材料加工玩法' : '制造玩法']?.版本;
          if (version !== undefined && version !== 1)
            throw Error(act.startsWith('material-') ? '不支持此材料加工版本' : '不支持此制造工坊版本');
          await mode.action(win, act, arg);
          if (failure && JSON.stringify(draft) !== JSON.stringify(before)) throw Error(failure);
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before); effects.splice(count);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          throw error;
        } finally { currentAction = ''; teamSource = ''; }
        return draft;
      },
    };
  }
  const api = { create, gate, guard, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
