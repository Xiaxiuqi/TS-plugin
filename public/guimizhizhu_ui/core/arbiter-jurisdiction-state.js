(() => {
  'use strict';
  const KEY = 'cryptLord.arbiterJurisdictionState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const sequence = (data, pool) => modules['cryptLord.audienceImagination'].resolve(pool, data).effectiveSequence;
  const reference = pool => modules['cryptLord.arbiterJurisdictionReference'].create({ pool });
  const gate = (data, pool) => reference(pool).core.resolve(sequence(data, pool));
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '辖区')); }
  }
  function validate(data) {
    if (!object(data.stat_data)) throw Error('当前楼层没有角色状态');
    const root = data.stat_data.$专属玩法, path = root?.仲裁人途径, play = path?.设定辖区玩法;
    if (root !== undefined && !object(root) || path !== undefined && !object(path) ||
      play !== undefined && (!object(play) || play.版本 !== undefined && play.版本 !== 1 ||
        play.基础辖区 != null && !object(play.基础辖区) ||
        play.官方任命 != null && (!object(play.官方任命) || !Array.isArray(play.官方任命.行政区列表))))
      throw Error('辖区版本或变量格式无效');
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const facade = { document: realWindow.document, confirm: text => realWindow.confirm(text) };
    const { core, mode } = modules['cryptLord.arbiterJurisdictionReference'].create({ pool, window: facade });
    mode.scope = options.scope || (() => null);
    let evidenceSnapshot = null;
    async function verifyEvidence() {
      if (!evidenceSnapshot || !options.freshEvidenceList) return;
      const fresh = await options.freshEvidenceList();
      const byId = new Map(fresh.map(row => [row.序号, JSON.stringify(row)]));
      if (evidenceSnapshot.some(row => byId.get(row.序号) !== JSON.stringify(row)))
        throw Error('用于认证的原生历史楼层已变化，请重新读取');
    }
    const win = {
      game: { currentMvuState: draft, showConfirmModal: options.confirm || (async text => facade.confirm(text)) },
      _modeState: {}, isBusy: false, sd: () => draft.stat_data,
      playerSequence: () => sequence(draft, pool),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: options.notice || (() => {}), render: options.render || (() => {}),
      persist() {}, async persistZero() {}, ensureApiReady: () => true,
      battleOngoing: () => {
        try { guard(draft); return false; } catch { return true; }
      },
      async callRaw(system, user) {
        evidenceSnapshot = options.evidenceList ? structuredClone(await options.evidenceList()) : null;
        const reply = await modules['cryptLord.marionetteState'].request(
          system, user, options.evidence || options.message || '',
          `<玩家资料>\n${JSON.stringify({ 名称: draft.stat_data.名称 || draft.stat_data.姓名 || '',
            当前序列: win.playerSequence(), 当前时间纪元: draft.world_data?.当前时间纪元 || '' })}\n</玩家资料>`, options);
        await verifyEvidence();
        return reply;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], core, mode, win, state, verifyEvidence,
      render() {
        win.game.currentMvuState = structuredClone(draft);
        let html;
        try { html = mode.render(win, mode.gate(win)); }
        finally { win.game.currentMvuState = draft; }
        try { guard(draft); validate(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="arbiter-[^"]*"/g, '$& disabled')
            .replace(/<(input|textarea)\b/g, '<$1 disabled');
        }
        return html;
      },
      async action(act, arg) {
        if (!['arbiter-base-certify', 'arbiter-appointment-certify', 'arbiter-appointment-clear',
          'arbiter-region-add', 'arbiter-region-remove'].includes(act)) return draft;
        const before = structuredClone(draft), beforeState = structuredClone(state);
        evidenceSnapshot = null;
        try {
          guard(draft); validate(draft);
          if (!gate(draft, pool).unlocked) throw Error('当前有效仲裁人序列不具备辖区资格');
          if (act === 'arbiter-region-remove' && (!Number.isInteger(Number(arg)) ||
            Number(arg) < 0 || Number(arg) >= state.regions.length)) throw Error('行政区编号无效');
          await mode.action(win, act, arg);
          const result = act === 'arbiter-base-certify' ? state.baseResult :
            act === 'arbiter-appointment-certify' ? state.appointmentResult : null;
          if (result?.reason?.startsWith('操作失败')) throw Error(result.reason);
          if (result) win.msg(result.reason, !result.ok);
          validate(draft);
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          evidenceSnapshot = null;
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
