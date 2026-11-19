(() => {
  'use strict';
  const KEY = 'cryptLord.readerRosterState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const native = modules['cryptLord.marionetteState'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(name);
  const mutations = new Set(['save-mystic', 'delete-mystic', 'start-learning',
    'cancel-learning', 'recognize-learning']);
  const learningActions = new Set(['to-learning-select', 'start-learning', 'cancel-learning', 'recognize-learning']);
  function guard(data) {
    try { native.guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '阅读者秘术')); }
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const sequence = state => modules['cryptLord.audienceImagination'].resolve(pool, state).effectiveSequence;
    const facade = {
      document: realWindow.document, confirm: options.confirmSync || (text => realWindow.confirm(text)),
      AudienceImaginationCore: { effectivePlayerSequence: sequence },
      MysteryReenactmentCore: { ABILITY_GROUP: '#神秘再现' },
    };
    const averages = pool.pictureConfig?.consumableConfig?.avgAttrByRank ||
      modules['cryptLord.battleFieldEffectReference'].averages();
    const { core, mode } = modules['cryptLord.readerReference'].create({
      window: facade, pool, averages, scope: options.scope || (() => null),
    });
    const playerStore = core.playerStore;
    core.playerStore = (state, create) => {
      const play = state.stat_data?.$专属玩法?.阅读者途径?.秘术强化;
      // Read old learning-only floors without creating empty editor slots in native storage.
      if (!create && object(play) && play.秘术栏位 === undefined)
        return { play, slots: {} };
      return playerStore.call(core, state, create);
    };
    const candidates = core.learningCandidates;
    core.learningCandidates = (state, gate, slot) => candidates.call(core, state, gate, slot)
      .filter(row => !forbidden(row.目标)).map((row, idx) => ({ ...row, idx }));
    const validate = core.validateConfig;
    core.validateConfig = (cfg, slot, gate) => {
      const check = validate.call(core, cfg, slot, gate);
      if (forbidden(check.config.名称)) {
        check.errors.push('技能名称为系统保留键'); check.valid = false;
      }
      return check;
    };
    const sync = core.syncPlayerProjection;
    let syncing = false, syncFailure = null;
    core.syncPlayerProjection = state => {
      if (syncing) return sync.call(core, state);
      syncing = true;
      try {
        sync.call(core, state);
        modules['cryptLord.mysteryReenactment']?.sync(state, pool);
      } catch (error) {
        syncFailure = error;
        throw error;
      } finally { syncing = false; }
    };
    const win = {
      game: { currentMvuState: draft }, _modeState: {}, isBusy: false,
      playerName: () => String(draft.stat_data?.名称 || '<User>'),
      playerSequence: () => sequence(draft),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: options.notice || (() => {}), render: options.render || (() => {}),
      ensureApiReady: () => true,
      callRaw: (system, user) => native.request(system, user, options.evidence || options.message || '', '', options),
      persist() {}, async persistZero() {},
      guardBattleMutation(act) {
        if (mutations.has(act)) {
          guard(draft);
          if (!core.resolve(sequence(draft), draft).unlocked) throw Error('当前有效途径不满足阅读者解锁条件');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], core, mode, win, state,
      sync: data => sync.call(core, data),
      render() {
        let html = mode.render(win);
        html = html.replace(/<p class="ppw-hint">(?:从人物关系列表中选择|保存后会重建)[\s\S]*?<\/p>/g, '');
        try { guard(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="(save-mystic|delete-mystic|start-learning|cancel-learning|recognize-learning)"/g, '$& disabled');
          html = html.replace(/<(input|select|textarea)\b/g, '<$1 disabled');
        }
        return html;
      },
      async action(act, arg) {
        const before = structuredClone(draft), beforeState = structuredClone(state);
        syncFailure = null;
        try {
          const play = draft.stat_data?.$专属玩法?.阅读者途径?.秘术强化;
          if (play !== undefined && (!object(play) ||
            play.版本 !== undefined && ![1, 2].includes(play.版本) ||
            play.秘术栏位 !== undefined && !object(play.秘术栏位) ||
            play.解析和学习 !== undefined && (!object(play.解析和学习) ||
              play.解析和学习.版本 !== undefined && play.解析和学习.版本 !== 1 ||
              play.解析和学习.目标栏位 !== undefined && !object(play.解析和学习.目标栏位))))
            throw Error('阅读者玩法版本或变量格式无效');
          if (mutations.has(act) || learningActions.has(act)) {
            const gate = core.resolve(sequence(draft), draft), slot = Number(arg);
            const limit = learningActions.has(act) ? gate.learningSlots : gate.slots;
            if (!Number.isInteger(slot) || slot < 1 || slot > limit) throw Error('当前栏位不可用');
          }
          await mode.action(win, act, arg);
          if (syncFailure) throw syncFailure;
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          throw error;
        }
        return draft;
      },
    };
  }
  const gate = (data, pool) => {
    const session = create(data, pool);
    return session.core.resolve(session.win.playerSequence(), session.data);
  };
  const sync = (data, pool) => create(data, pool).sync(data);
  const api = { create, gate, guard, sync, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
