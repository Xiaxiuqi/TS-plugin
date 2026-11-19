(() => {
  'use strict';
  const KEY = 'cryptLord.mysteryAnalysisState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const native = modules['cryptLord.marionetteState'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const certifications = new Set(['mystery-item-certify', 'mystery-summary-certify']);
  const reference = pool => modules['cryptLord.mysteryAnalysisReference'].create({ pool });
  const gate = (data, pool) => reference(pool).core.resolveReal(data?.stat_data?.当前序列);
  function guard(data) {
    try { native.guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '神秘解析')); }
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data);
    const { core, mode } = reference(pool);
    mode.scope = options.scope || (() => null);
    mode.journeyList = async () => (await (options.evidenceList?.() || [])).slice(-100);
    const summaryPrompt = mode.summaryPrompt, selectedSummary = mode.selectedSummary;
    mode.summaryPrompt = win => summaryPrompt.call(mode, win).replaceAll('小总结', '原生楼层');
    mode.USER_INPUT_SUMMARY = mode.USER_INPUT_SUMMARY.replaceAll('小总结', '原生楼层');
    mode.selectedSummary = win => {
      const ui = mode.state(win);
      // The original coerces an empty selection to index zero. Require explicit selection.
      if (ui.source === '' || !Number.isInteger(Number(ui.source)) || Number(ui.source) < 0) return null;
      const selected = selectedSummary.call(mode, win);
      return selected ? { ...selected, text: selected.text.replaceAll('小总结', '原生楼层') } : null;
    };
    let failure = null, certifiedEvidence = null;
    async function verifyEvidence(selected = certifiedEvidence) {
      if (!selected) return;
      const fresh = await (options.freshEvidenceList?.() || options.evidenceList?.() || []);
      const live = fresh.find(row => row.序号 === selected.序号);
      if (!live || JSON.stringify(live) !== JSON.stringify(selected))
        throw Error('指定原生楼层已变化，本次没有写入数据');
    }
    const win = {
      game: { currentMvuState: draft,
        stringifyJourneyEvent: event => `#${event.序号}\n${event.正文 || event.详细描述 || ''}`,
        async updateDisplayedAttributes() {
          try { modules['cryptLord.mysteryAnalysis'].reconcile(draft.stat_data, pool); }
          catch (error) { failure = error; throw error; }
        } },
      _modeState: {}, isBusy: false, sd: () => draft.stat_data,
      actualPlayerSequence: () => String(draft.stat_data?.当前序列 || ''),
      playerName: () => String(draft.stat_data?.名称 || draft.stat_data?.姓名 || '<User>'),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      render: options.render || (() => {}),
      msg: text => options.notice?.(text, state.result?.ok === false),
      ensureApiReady: () => true, persist() {}, async persistZero() {},
      async callRaw(system, user, specified) {
        const selected = specified ? structuredClone(state.events[Number(state.source)]) : null;
        const raw = await native.request(system, user, options.evidence || options.message || '', specified, options);
        await verifyEvidence(selected);
        certifiedEvidence = selected;
        return raw;
      },
      guardBattleMutation(act) {
        if (certifications.has(act)) {
          guard(draft);
          if (!gate(draft, pool).unlocked) throw Error('真实窥秘人序列未达到神秘解析资格');
          if (core.completed(draft.stat_data)) throw Error('神秘解析已经完成，不能重复认证');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], core, mode, win, state, verifyEvidence,
      render() {
        const access = mode.gate(win);
        // Original render persists auxiliary display. Opening this native window is read-only.
        let html = state.view === 'items' ? mode.renderItems(win) :
          state.view === 'summary' ? mode.renderSummary(win) : mode.renderMain(win, access);
        html = html.replaceAll('小总结', '原生楼层')
          .replace(/<p class="ppw-hint">(?:从“其他列表”|你已经晋升|这里不按名称|所选原生楼层本身)[\s\S]*?<\/p>/g, '')
          .replaceAll('&lt;User&gt;', win.esc(win.playerName()));
        try { guard(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="mystery-(item|summary)-certify"/g, '$& disabled');
        }
        return html;
      },
      async action(act) {
        const before = structuredClone(draft), beforeState = structuredClone(state);
        failure = null; certifiedEvidence = null;
        try {
          if (certifications.has(act)) {
            const stored = core.recordOfStatData(draft.stat_data);
            const raw = draft.stat_data?.$专属玩法?.窥秘人途径?.神秘解析玩法;
            if (raw !== undefined && (!object(raw) ||
              raw.版本 !== undefined && raw.版本 !== 1 ||
              raw.最终加成 !== undefined && !core.finalBonusOfStatData(draft.stat_data) ||
              stored?.描述 && !core.completed(draft.stat_data)))
              throw Error('神秘解析版本或记录格式无效');
          }
          await mode.action(win, act);
          if (failure) throw failure;
          if (state.result?.ok === false && JSON.stringify(draft) !== JSON.stringify(before))
            throw Error(state.result.reason || '认证失败');
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          certifiedEvidence = null;
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
