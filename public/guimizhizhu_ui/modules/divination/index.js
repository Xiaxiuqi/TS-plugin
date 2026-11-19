(() => {
  'use strict';
  const KEY = 'cryptLord.divinationUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.divinationState'];
  const afterNative = modules['cryptLord.afterNativeHost'];
  if (!contract || !service || !afterNative) throw new Error('占卜窗口依赖尚未加载');
  const state = {
    panel: null, content: null, notice: null, session: null, presets: [],
    revision: null, selected: '', config: false, busy: false, token: 0,
    witness: null, disposed: false, subscriptions: [], note: '', isError: false,
    invalid: false, generating: false, cancelButton: null, returnFocus: null, keyListener: null,
    presetDrafts: Object.create(null),
  };
  const doc = () => afterNative.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, fn, title = '') => {
    const node = el('button', '', label);
    node.type = 'button';
    if (title) node.title = title;
    if (title) node.setAttribute('aria-label', title);
    node.addEventListener('click', fn);
    return node;
  };
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === 'true';
  const selectedPreset = () => state.presets.find(item => item.id === state.selected) || state.presets[0];
  function message(text, error = false) {
    state.note = text;
    state.isError = error;
    if (state.notice) {
      state.notice.textContent = text;
      state.notice.dataset.error = String(error);
    }
  }
  function close() {
    state.token++;
    state.session = null;
    state.witness = null;
    state.config = false;
    state.busy = false;
    state.presetDrafts = Object.create(null);
    state.panel?.removeAttribute('aria-busy');
    state.panel?.setAttribute('data-open', 'false');
    if (state.returnFocus?.isConnected) state.returnFocus.focus?.();
  }
  function cancel() {
    if (!state.busy) return;
    state.token++;
    state.busy = false;
    state.panel?.removeAttribute('aria-busy');
    message('操作已取消；本环骰点与草稿保留');
    render();
  }
  function invalidate() {
    state.token++;
    state.busy = false;
    state.invalid = true;
    state.panel?.removeAttribute('aria-busy');
    message('正文已开始生成，请等待完成后重新占卜', true);
    render();
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-divination');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '占卜');
    panel.tabIndex = -1;
    const header = el('header');
    const cancelButton = button('取消', cancel);
    header.append(el('strong', '', '占卜'), cancelButton, button('×', close, '关闭'));
    const content = el('main', 'crypt-lord-divination__content');
    const notice = el('footer', 'crypt-lord-divination__notice');
    notice.setAttribute('role', 'status');
    panel.append(header, content, notice);
    doc().body.append(panel);
    Object.assign(state, { panel, content, notice, cancelButton });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = afterNative.tavernEvents();
    const bind = (event, fn) => { if (event) state.subscriptions.push(afterNative.bindEvent(event, fn)); };
    bind(events?.CHAT_CHANGED, () => { state.generating = false; close(); });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (!['quiet', 'dryRun'].includes(type) && !options?.dryRun && !dryRun) {
        state.generating = true; invalidate();
      }
    });
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      bind(event, () => { state.generating = false; render(); });
    state.keyListener = event => {
      if (panel.dataset.open !== 'true') return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')]
        .filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (doc().activeElement === last || !panel.contains(doc().activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    doc().addEventListener('keydown', state.keyListener);
    return true;
  }
  function actions(parent, ...nodes) {
    const row = el('div', 'crypt-lord-divination__actions');
    row.append(...nodes);
    parent.append(row);
  }
  async function witness(token) {
    return service.loadContext(() => active(token));
  }
  async function verify(token) {
    if (!active(token) || !state.witness) throw new Error('占卜已取消');
    if (state.invalid || state.generating) throw Error('占卜来源已失效，请重新占卜');
    await service.assertContext(state.witness, () => active(token));
    return state.witness;
  }
  async function run(work) {
    if (state.busy || state.generating) return;
    const token = state.token;
    state.busy = true;
    state.panel?.setAttribute('aria-busy', 'true');
    render();
    try { await work(token); }
    catch (error) { if (active(token)) message(error?.message || String(error), true); }
    finally {
      if (active(token)) {
        state.busy = false;
        state.panel?.removeAttribute('aria-busy');
        render();
      }
    }
  }
  function pushHistory(session, user, raw) {
    session.chatMessages.push({ role: 'user', content: user }, { role: 'assistant', content: raw });
  }
  async function startParam(token) {
    await verify(token);
    const session = state.session;
    if (!session?.statement.trim()) throw new Error('请填写占卜语句');
    session.preset ||= service.normalizePreset(selectedPreset());
    session.tagBag['占卜语句'] = [session.statement];
    session.tagBag['占卜方法'] = [session.method];
    const user = `【定参】\n陈述句：${session.statement}\n方法：${session.method}\n请输出问句类型、命题摘要、基础DC、反占卜参数。禁止输出真实结论与完整检定。`;
    message('正在定参与标定难度…');
    const raw = await service.requestPhase(session.preset, 'param', user, [],
      state.witness.story, () => active(token), state.witness);
    await verify(token);
    const parsed = service.parseAndApplyParams(raw, session);
    if (!parsed.ok) throw new Error(parsed.error);
    pushHistory(session, user, raw);
    service.extractTagsFromText(raw, session.tagBag, session.preset);
    session.tagBag['占卜语句'] = [session.statement];
    session.tagBag['占卜方法'] = [session.method];
    if (parsed.abort) {
      session.phase = 'aborted';
      message(parsed.abortReason, true);
      return;
    }
    session.phase = 'truth_gen';
    message('正在生成互斥真实候选…');
    const candidateUser = service.candidatePrompt(session);
    const candidateRaw = await service.requestPhase(session.preset, 'truth_gen', candidateUser, [],
      state.witness.story, () => active(token), state.witness);
    await verify(token);
    const parsedCandidates = service.parseTruthCandidateResponse(candidateRaw, session.questionType);
    if (!parsedCandidates.candidates.length) throw new Error('模型未返回可用候选真实；可重试候选生成');
    session.truthCandidates = parsedCandidates.candidates;
    session.truthPack = Object.freeze(service.pickTruthFromCandidates(session.truthCandidates,
      session.questionType, session.propositionSummary || session.statement));
    session.phase = 'ritual';
    message(`定参完成 · 基础 DC ${session.baseDc} · ${session.hasAntiDiv ? `反占卜 DC ${session.antiDc}` : '无反占卜'}`);
  }
  async function retryTruth(token) {
    await verify(token);
    const session = state.session;
    const raw = await service.requestPhase(session.preset, 'truth_gen',
      service.candidatePrompt(session), [], state.witness.story, () => active(token), state.witness);
    await verify(token);
    const candidates = service.parseTruthCandidateResponse(raw, session.questionType).candidates;
    if (!candidates.length) throw new Error('候选真实仍为空；请重试');
    session.truthCandidates = candidates;
    session.truthPack = Object.freeze(service.pickTruthFromCandidates(candidates, session.questionType,
      session.propositionSummary || session.statement));
    session.phase = 'ritual';
    message(`已锁定真实 · 基础 DC ${session.baseDc}`);
  }
  async function advance(token) {
    await verify(token);
    const session = state.session;
    if (!session?.truthPack) throw new Error('本局真实尚未锁定');
    if (!session.pendingRitual) {
      if (session.pushCount >= service.MAX_PUSHES || session.successCount >= service.MAX_SUCCESSES) return;
      const stat = state.witness.stat;
      session.pendingRitual = service.buildPendingRitual(session, {
        spiritCur: Number(stat.当前灵性 ?? stat.灵性 ?? 0),
        luck: Number(stat.运气 ?? 0),
      });
    }
    const pending = session.pendingRitual;
    if (!pending) throw new Error('已达仪式推进上限');
    message(`第 ${pending.push} 环出文中；失败可沿用本环骰点重试…`);
    const raw = await service.requestPhase(session.preset, 'ritual', pending.userText,
      session.chatMessages, state.witness.story, () => active(token), state.witness);
    await verify(token);
    const validated = service.validateRitual(raw, pending);
    pushHistory(session, pending.userText, raw);
    service.extractTagsFromText(raw, session.tagBag, session.preset);
    session.tagBag['占卜语句'] = [session.statement];
    session.tagBag['占卜方法'] = [session.method];
    (session.displayRecords ||= []).push(`过程：${validated.process}\n启示：${validated.insight}`);
    service.commitPendingRitual(session, pending);
    message(`已推进 ${session.pushCount}/${service.MAX_PUSHES} · 成功 ${session.successCount}/${service.MAX_SUCCESSES}`);
  }
  async function exportReport() {
    if (state.session?.pendingRitual) { message('本环尚未成功出文，请重试或取消', true); return; }
    if (!state.session?.pushCount) { message('尚无可导出的占卜结果', true); return; }
    await run(async token => {
      await verify(token);
      const input = await contract.waitGlobalInitialized('cryptLord.inputAdapter', { timeoutMs: 10000 });
      await verify(token);
      const report = service.buildExportReport(state.session, state.session.preset);
      const textarea = doc().querySelector('#send_textarea');
      if (!textarea) throw Error('未找到原生输入框');
      const draft = textarea.value;
      if (draft.trim() && draft !== report && !win().confirm('原生输入框已有草稿，确认用占卜简报替换？')) return;
      await verify(token);
      if (textarea !== doc().querySelector('#send_textarea') || textarea.value !== draft ||
        modules['cryptLord.inputAdapter'] !== input) throw Error('原生输入草稿或输入服务已变化，未替换');
      input.setInputText(report, 'sillytavern-native');
      message('占卜简报已填入原生输入框，由你决定何时发送');
    });
  }
  function renderConfig() {
    actions(state.content, button('← 返回', () => { state.config = false; render(); }),
      button('从世界书重新读取', () => void run(async token => {
        if (Object.keys(state.presetDrafts).length && !win().confirm('放弃未保存的方案草稿并重新读取？')) return;
        const loaded = await service.loadPresets(() => active(token));
        if (!active(token)) return;
        state.presets = loaded.presets;
        state.revision = loaded.revision;
        state.selected = state.presets[0].id;
        state.presetDrafts = Object.create(null);
        state.invalid = false;
        message('已重新读取快窗方案');
      })));
    const preset = selectedPreset();
    if (!preset) return;
    if (state.presets.length > 1) {
      const selection = el('select');
      selection.setAttribute('aria-label', '编辑占卜方案');
      for (const row of state.presets) {
        const option = el('option', '', row.name);
        option.value = row.id; selection.append(option);
      }
      selection.value = state.selected;
      selection.addEventListener('change', () => { state.selected = selection.value; render(); });
      state.content.append(selection);
    }
    const draft = state.presetDrafts[preset.id] ||= {
      ...preset, tags: JSON.stringify(preset.tags || service.defaultPreset().tags, null, 2),
    };
    const fields = [
      ['name', '方案名称'], ['promptParam', '定参提示词'],
      ['promptTruthCandidates', '候选真实提示词'], ['promptRitual', '仪式演绎提示词'],
      ['exportShell', '导出前缀'],
      ['tags', '输出标签配置'],
    ];
    const values = {};
    for (const [key, label] of fields) {
      const field = el('label', 'crypt-lord-divination__field', label);
      const input = key === 'name' ? el('input') : el('textarea');
      input.value = draft[key] || '';
      input.setAttribute('aria-label', label);
      input.addEventListener('input', () => { draft[key] = input.value; });
      values[key] = input;
      field.append(input);
      state.content.append(field);
    }
    actions(state.content,
      button('保存方案', () => void run(async token => {
        let tags;
        try { tags = JSON.parse(draft.tags); } catch { throw Error('输出标签配置 JSON 损坏'); }
        const next = state.presets.map(row => row.id === preset.id ? {
          ...row, ...Object.fromEntries(fields.filter(([key]) => key !== 'tags')
            .map(([key]) => [key, draft[key].trim()])), tags, version: 8,
        } : row);
        if (state.invalid) throw Error('请先重新读取方案');
        let saved;
        try { saved = await service.savePresets(next, state.revision, () => active(token)); }
        catch (error) { if (error.requiresReload) state.invalid = true; throw error; }
        if (!active(token)) return;
        state.presets = saved.presets;
        state.revision = saved.revision;
        delete state.presetDrafts[preset.id];
        state.invalid = Boolean(saved.warning);
        message(saved.warning || '方案已保存到 2历史孔隙', Boolean(saved.warning));
      })),
      button('恢复原版方案', () => {
        const original = service.defaultPreset();
        for (const [key] of fields) {
          draft[key] = key === 'tags' ? JSON.stringify(original.tags, null, 2) : original[key] || '';
          values[key].value = draft[key];
        }
        message('原版提示词已载入编辑框，点击保存后生效');
      }));
  }
  function renderSession() {
    const session = state.session;
    actions(state.content, button('重新占卜', () => void run(async token => {
      if ((session.pushCount || session.pendingRitual || session.statement) &&
        !win().confirm('放弃本局占卜并重新读取当前楼层？')) return;
      const floor = await witness(token);
      if (!active(token)) return;
      state.witness = floor;
      state.session = service.createSession();
      state.invalid = false;
      message('');
    })), ...(session.phase === 'fill'
      ? [button('方案设置', () => { state.config = true; render(); })] : []));
    if (session.phase === 'fill') {
      if (state.presets.length > 1) {
        const presetSelect = el('select');
        presetSelect.setAttribute('aria-label', '占卜方案');
        for (const preset of state.presets) {
          const option = el('option', '', preset.name);
          option.value = preset.id;
          presetSelect.append(option);
        }
        presetSelect.value = state.selected;
        presetSelect.addEventListener('change', () => { state.selected = presetSelect.value; });
        state.content.append(presetSelect);
      }
      const statement = el('textarea');
      statement.placeholder = '例如：今晚前往码头是安全的吗？';
      statement.setAttribute('aria-label', '占卜语句');
      statement.value = session.statement;
      statement.addEventListener('input', () => { session.statement = statement.value; });
      const method = el('select');
      method.setAttribute('aria-label', '占卜方法');
      for (const value of ['灵摆', '塔罗', '梦境', '能力直接']) {
        const option = el('option', '', value);
        option.value = value;
        method.append(option);
      }
      method.value = session.method;
      method.addEventListener('change', () => { session.method = method.value; });
      state.content.append(statement, method);
      actions(state.content, button('开始定参', () => void run(startParam)));
      return;
    }
    if (session.phase === 'aborted') {
      state.content.append(el('p', 'crypt-lord-divination__warning', session.sessionAbortReason || state.note));
      return;
    }
    const info = el('div', 'crypt-lord-divination__summary');
    info.append(el('strong', '', session.statement),
      el('span', '', `${session.method} · ${session.questionType || '定参中'} · 基础 DC ${session.baseDc ?? '…'}`));
    state.content.append(info);
    if (session.phase === 'truth_gen') {
      actions(state.content, button('重试候选生成', () => void run(retryTruth)));
      return;
    }
    const progress = el('div', 'crypt-lord-divination__summary');
    const stats = state.witness.stat;
    const rates = service.previewRates(session, {
      spiritCur: Number(stats.当前灵性 ?? stats.灵性 ?? 0), luck: Number(stats.运气 ?? 0),
    });
    progress.append(
      el('span', '', `仪式 ${session.pushCount}/${service.MAX_PUSHES} · 成功 ${session.successCount}/${service.MAX_SUCCESSES} · 清晰度 ${service.CLARITY[session.successCount]}`),
      el('span', '', `当前灵性 ${rates.spiritCur} ×2 · 运气 ${rates.luck} · 有效 DC ${rates.divDc} · 成功阈值 ${rates.divTh}`),
      el('span', '', `阶段系数 ${Math.round(rates.stage * 100)}% · 反占卜加码 ${Math.round(rates.antiBonus * 100)}%`),
      el('span', '', session.hasAntiDiv
        ? `反占卜 DC ${session.antiDc} · 成功阈值 ${rates.antiTh} · 失败 ${session.antiFailCount} 次`
        : '无反占卜'),
    );
    state.content.append(progress);
    const log = el('div', 'crypt-lord-divination__log');
    for (const [index, raw] of (session.displayRecords || []).entries()) {
      const round = session.roundLogs[index];
      const entry = el('article');
      entry.append(el('small', '', `第 ${index + 1} 环 · ${round?.div?.resultKey || ''} · 骰点 ${round?.div?.roll ?? '—'} / 阈值 ${round?.div?.threshold ?? '—'} · ${round?.clarity || ''}`),
        el('p', '', raw.replace(/<[^>]+>/g, '').trim()));
      log.append(entry);
    }
    state.content.append(log);
    const canAdvance = session.pendingRitual ||
      (session.pushCount < service.MAX_PUSHES && session.successCount < service.MAX_SUCCESSES);
    const advanceButton = button(session.pendingRitual ? '重试本环（不重掷）' : '进行占卜',
      () => void run(advance));
    advanceButton.disabled = !canAdvance || state.busy;
    const exportButton = button(session.successCount >= service.MAX_SUCCESSES ? '写入输入框' :
      canAdvance ? '见好就收（未问尽）' : '收手并写入输入框', () => void exportReport());
    exportButton.disabled = Boolean(session.pendingRitual) || !session.pushCount || state.busy;
    actions(state.content, advanceButton, exportButton);
  }
  function render() {
    if (!state.content || state.panel.dataset.open !== 'true') return;
    state.content.replaceChildren();
    state.cancelButton.disabled = !state.busy;
    if (!state.session) {
      state.content.append(el('p', '', '正在读取当前楼层与占卜方案…'));
      if (state.isError) actions(state.content,
        button('重新读取', () => void open()),
        button('使用内置方案', () => void run(async token => {
          const floor = await witness(token);
          if (!active(token)) return;
          state.witness = floor;
          state.presets = [service.defaultPreset()];
          state.revision = null;
          state.selected = state.presets[0].id;
          state.session = service.createSession();
          state.invalid = false;
          message('当前仅使用内置方案；世界书配置未修改');
        })));
    } else if (state.config) renderConfig();
    else renderSession();
    for (const control of state.content.querySelectorAll('button, input, select, textarea'))
      if (state.busy || state.generating) control.disabled = true;
  }
  async function open() {
    if (!mount()) return false;
    state.token++;
    const token = state.token;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    state.config = false;
    state.session = null;
    state.busy = false;
    state.witness = null;
    state.invalid = false;
    state.returnFocus = doc().activeElement;
    state.panel.removeAttribute('aria-busy');
    state.presetDrafts = Object.create(null);
    message('正在读取…');
    render();
    try {
      const [floor, loaded] = await Promise.all([witness(token), service.loadPresets(() => active(token))]);
      if (!active(token)) return false;
      state.witness = floor;
      state.presets = loaded.presets;
      state.revision = loaded.revision;
      state.selected = state.presets[0].id;
      state.session = service.createSession();
      message('');
      render();
      state.panel.focus();
    } catch (error) {
      if (active(token)) { message(error?.message || String(error), true); render(); }
    }
    return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(item => item?.stop());
      doc().removeEventListener('keydown', state.keyListener);
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
