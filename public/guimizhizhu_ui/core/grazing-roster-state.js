(() => {
  'use strict';
  const KEY = 'cryptLord.grazingRosterState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const native = modules['cryptLord.marionetteState'];
  const imagination = modules['cryptLord.audienceImagination'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(name);
  const mutations = new Set(['certify', 'save-active', 'release']);
  const projection = (data, pool) => {
    const snapshot = imagination.resolve(pool, data);
    return { ...snapshot, grazedSelections: snapshot.grazed };
  };
  const gate = (data, pool) => projection(data, pool).grazingGate;
  function guard(data) {
    try { native.guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '放牧名册')); }
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const locked = options.locked ?? modules['cryptLord.abilityState']?.locked?.(data, realWindow) ??
      (realWindow.localStorage?.getItem('ST_LoM_AbilityLock') === 'true');
    const facade = { document: realWindow.document,
      confirm: options.confirmSync || (text => realWindow.confirm(text)),
      PlayerProjectionResolver: null, PlayerProjectionSync: null };
    const sync = state => {
      imagination.sync(state, pool, Boolean(locked));
      modules['cryptLord.readerMystic']?.sync(state, pool);
      modules['cryptLord.mysteryReenactment']?.sync(state, pool);
    };
    const { core, mode } = modules['cryptLord.grazingReference'].create({
      window: facade, pool, locked, scope: options.scope || (() => null),
      projection: state => projection(state, pool), sync,
    });
    facade.PlayerProjectionResolver = { resolve: state => projection(state, pool) };
    facade.PlayerProjectionSync = { syncAll: sync };
    core.syncPlayerProjection = sync;
    core.effectiveSequence = state => projection(state, pool).effectiveSequence;
    const playOf = core.playOfState;
    core.playOfState = (state, create) => {
      const play = state.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法;
      // Old floor records may omit selection arrays. Read a view without rewriting the floor.
      if (!create && object(play) && object(play.灵魂列表) && !Array.isArray(play.激活灵魂))
        return { ...play, 激活灵魂: Array.isArray(play.激活灵魂) ? play.激活灵魂 : [],
          休眠灵魂: Array.isArray(play.休眠灵魂) ? play.休眠灵魂 : [] };
      return playOf.call(core, state, create);
    };
    const souls = core.soulsOfState;
    core.soulsOfState = state => Object.fromEntries(Object.entries(souls.call(core, state))
      .filter(([name, row]) => !forbidden(name) && object(row)));
    const remove = core.removeSoul;
    core.removeSoul = (state, name) => {
      if (forbidden(name) || !Object.hasOwn(core.soulsOfState(state), name)) return false;
      core.playOfState(state, true);
      return remove.call(core, state, name);
    };
    const records = core.recordsOfState;
    core.recordsOfState = state => records.call(core, state).filter(row =>
      !forbidden(row.name) && object(row.data));
    const candidates = mode.candidates;
    mode.candidates = win => candidates.call(mode, win).filter(row => !forbidden(row.name));
    const add = core.addSoul;
    core.addSoul = (state, name, npc, source, snapshot) => forbidden(name)
      ? { ok: false, reason: '无效灵魂名称' } : add.call(core, state, name, npc, source, snapshot);
    const selected = core.saveActiveNames;
    core.saveActiveNames = (state, names, snapshot) => {
      if (!Array.isArray(names) || names.some(name => forbidden(name) ||
        !Object.hasOwn(core.soulsOfState(state), name) || !object(core.soulsOfState(state)[name])) ||
        new Set(names).size !== names.length)
        return { ok: false, reason: '选择中存在无效或重复的灵魂' };
      return selected.call(core, state, names, snapshot);
    };
    const win = {
      game: { currentMvuState: draft }, _modeState: {}, isBusy: false,
      playerName: () => String(draft.stat_data?.名称 || '<User>'),
      actualPlayerSequence: () => String(draft.stat_data?.当前序列 || ''),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: options.notice || (() => {}), render: options.render || (() => {}),
      ensureApiReady: () => true,
      callRaw: (system, user) => native.request(
        system.replaceAll('小总结', '原生楼层'), user, options.evidence || options.message || '', '', options),
      persist() {}, async persistZero() {},
      guardBattleMutation(act) {
        if (!mutations.has(act)) return false;
        guard(draft);
        if (!gate(draft, pool).unlocked) throw Error('当前不具备放牧资格');
        return false;
      },
    };
    const state = mode.state(win);
    return { data: draft, effects: [], core, mode, win, state,
      render() {
        let html = mode.render(win, gate(draft, pool));
        try { guard(draft); }
        catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` +
            html.replace(/data-ppw="(certify|save-active|release|open-certify)"/g, '$& disabled');
        }
        return html;
      },
      async action(act, arg) {
        const before = structuredClone(draft), beforeState = structuredClone(state);
        try {
          const version = draft.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法?.版本;
          if (version !== undefined && ![1, 2].includes(version)) throw Error('不支持此放牧名册版本');
          const play = draft.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法;
          if (play !== undefined && (!object(play) ||
            play.灵魂列表 !== undefined && !object(play.灵魂列表) ||
            ['激活灵魂', '休眠灵魂'].some(key => play[key] !== undefined && !Array.isArray(play[key]))))
            throw Error('放牧名册格式无效，请先修复变量');
          if (act === 'release' && forbidden(arg)) throw Error('无效灵魂名称');
          await mode.action(win, act, arg);
          if (act === 'certify' && state.result?.ok === false &&
            JSON.stringify(draft) !== JSON.stringify(before)) throw Error(state.result.reason);
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
  const api = { create, gate, guard, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
