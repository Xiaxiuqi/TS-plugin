(() => {
  'use strict';
  const KEY = 'cryptLord.mysteryRosterState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const native = modules['cryptLord.marionetteState'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(name);
  const mutations = new Set(['reenact-certify', 'reenact-delete-knowledge',
    'reenact-save-spell', 'reenact-delete-spell']);
  function guard(data) {
    try { native.guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '神秘再现')); }
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const projection = state => modules['cryptLord.audienceImagination'].resolve(pool, state);
    const facade = {
      document: realWindow.document, crypto: realWindow.crypto,
      confirm: options.confirmSync || (text => realWindow.confirm(text)),
      PlayerProjectionResolver: { resolve: projection },
    };
    const averages = pool.pictureConfig?.consumableConfig?.avgAttrByRank ||
      modules['cryptLord.battleFieldEffectReference'].averages();
    const { core, mode, catalog } = modules['cryptLord.mysteryRosterReference'].create({
      window: facade, pool, averages, scope: options.scope || (() => null),
      locked: options.locked ?? modules['cryptLord.abilityState']?.locked?.(data, realWindow) ??
        (realWindow.localStorage?.getItem('ST_LoM_AbilityLock') === 'true'),
    });
    const store = core.store;
    core.store = (state, create) => {
      const play = state?.stat_data?.$专属玩法?.窥秘人途径?.神秘再现玩法;
      // Old floors can contain only the archive or permanent unlock ledger.
      if (!create && object(play)) return { play,
        knowledge: object(play.知识档案) ? play.知识档案 : {},
        slots: object(play.法术栏位) ? play.法术栏位 : {},
        unlocks: object(play.法术解锁账本) ? play.法术解锁账本 : {},
        runtime: object(play.法术运行状态) ? play.法术运行状态 : {} };
      return store.call(core, state, create);
    };
    const records = core.knowledgeRecords;
    core.knowledgeRecords = state => records.call(core, state).filter(row => !forbidden(row.ID));
    const saveKnowledge = core.saveKnowledge;
    core.saveKnowledge = (state, row) => {
      if (forbidden(row?.ID)) throw Error('无效知识记录ID');
      return saveKnowledge.call(core, state, row);
    };
    const validate = core.validateConfig;
    core.validateConfig = (cfg, slot, gate) => {
      const check = validate.call(core, cfg, slot, gate);
      if (forbidden(check.config.名称)) {
        check.errors.push('法术名称为系统保留键'); check.valid = false;
      }
      return check;
    };
    let failure = null;
    mode.syncAll = state => {
      try {
        modules['cryptLord.readerMystic']?.sync(state, pool);
        core.syncPlayerProjection(state);
      } catch (error) { failure = error; throw error; }
    };
    const win = {
      game: { currentMvuState: draft }, _modeState: {}, isBusy: false,
      playerName: () => String(draft.stat_data?.名称 || '<User>'),
      actualPlayerSequence: () => String(draft.stat_data?.当前序列 || ''),
      playerSequence: () => projection(draft).effectiveSequence,
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: text => options.notice?.(text, state.lastVerdict?.ok === false),
      render: options.render || (() => {}),
      ensureApiReady: () => true,
      callRaw: (system, user) => native.request(system, user, options.evidence || options.message || '', '', options),
      persist() {}, async persistZero() {},
      guardBattleMutation(act) {
        if (mutations.has(act)) {
          guard(draft);
          if (!core.resolve(projection(draft).effectiveSequence, draft).unlocked)
            throw Error('当前有效途径不满足神秘再现解锁条件');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], core, mode, win, state, catalog,
      sync: data => core.syncPlayerProjection(data),
      buildCanon: (id, data) => core.buildCanonBattleAbility(id, data),
      render() {
        const gate = mode.gate(win);
        let html = gate.unlocked ? mode.render(win) : mode.renderLocked(win, gate);
        html = html.replace(/<p class="ppw-hint">提交内容只是一项待核验主张[\s\S]*?<\/p>/g, '')
          .replace('<span class="ppw-hint">参数、点价与阅读者秘术强化一致</span>', '')
          .replace(`<p>${win.esc(core.DESCRIPTION)}</p>`, '');
        try { guard(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="(reenact-certify|reenact-delete-knowledge|reenact-save-spell|reenact-delete-spell)"/g, '$& disabled')
            .replace(/<(input|select|textarea)\b/g, '<$1 disabled');
        }
        return html;
      },
      async action(act, arg) {
        const before = structuredClone(draft), beforeState = structuredClone(state);
        failure = null;
        try {
          const play = draft.stat_data?.$专属玩法?.窥秘人途径?.神秘再现玩法;
          if (play !== undefined && (!object(play) ||
            play.版本 !== undefined && ![1, 2].includes(play.版本) ||
            ['知识档案', '法术栏位', '法术解锁账本', '法术运行状态']
              .some(key => play[key] !== undefined && !object(play[key]))))
            throw Error('神秘再现版本或变量格式无效');
          if (play && Object.entries(play.知识档案 || {}).some(([key, row]) =>
            key !== '$meta' && (!object(row) || forbidden(key) ||
              row.ID && String(row.ID) !== key))) throw Error('知识档案ID与存储键不一致或格式无效');
          if (act === 'reenact-save-spell' || act === 'reenact-delete-spell') {
            const slot = Number(arg);
            if (!Number.isInteger(slot) || slot < 1 || slot > mode.gate(win).slots)
              throw Error('当前法术栏位不可用');
          }
          if (act === 'reenact-delete-knowledge' && forbidden(arg)) throw Error('无效知识记录ID');
          await mode.action(win, act, arg);
          if (failure) throw failure;
          if (act === 'reenact-certify' && state.lastVerdict?.ok === false &&
            JSON.stringify(draft) !== JSON.stringify(before))
            throw Error(state.lastVerdict.reason || '知识认证失败');
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
  const gate = (data, pool) => { const session = create(data, pool); return session.mode.gate(session.win); };
  const sync = (data, pool) => create(data, pool).sync(data);
  const api = { create, gate, guard, sync, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
