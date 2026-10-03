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
    witness: null, disposed: false, subscription: null, note: '', isError: false,
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
    state.panel?.setAttribute('data-open', 'false');
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-divination');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '占卜'), button('×', close, '关闭'));
    const content = el('main', 'crypt-lord-divination__content');
    const notice = el('footer', 'crypt-lord-divination__notice');
    notice.setAttribute('role', 'status');
    panel.append(header, content, notice);
    doc().body.append(panel);
    Object.assign(state, { panel, content, notice });
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
    if (events?.CHAT_CHANGED) state.subscription = afterNative.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  function actions(parent, ...nodes) {
    const row = el('div', 'crypt-lord-divination__actions');
    row.append(...nodes);
    parent.append(row);
  }
  async function witness() {
    const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
    const row = await store.findLatestAssistant();
    if (!row) throw new Error('没有真实 assistant 楼层，无法获取当前剧情与属性');
    return { id: row.message_id, message: row.message, data: JSON.stringify(row.data),
      stat: row.data?.stat_data || {} };
  }
  async function verify(token) {
    if (!active(token) || !state.witness) throw new Error('占卜已取消');
    const fresh = await witness();
    if (!active(token) || fresh.id !== state.witness.id ||
      fresh.message !== state.witness.message || fresh.data !== state.witness.data) {
      throw new Error('聊天、楼层正文或变量已变化，请重新开始占卜');
    }
    return fresh;
  }
  async function run(work) {
    if (state.busy) return;
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
    session.tagBag['占卜语句'] = [session.statement];
    session.tagBag['占卜方法'] = [session.method];
    const user = `【定参】\n陈述句：${session.statement}\n方法：${session.method}\n请输出问句类型、命题摘要、基础DC、反占卜参数。禁止输出真实结论与完整检定。`;
    message('正在定参与标定难度…');
    const raw = await service.requestPhase(selectedPreset(), 'param', user, [],
      String(state.witness.message || '').slice(-20000));
    await verify(token);
    const parsed = service.parseAndApplyParams(raw, session);
    if (!parsed.ok) throw new Error(parsed.error);
    pushHistory(session, user, raw);
    service.extractTagsFromText(raw, session.tagBag);
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
    const candidateRaw = await service.requestPhase(selectedPreset(), 'truth_gen', candidateUser, [],
      String(state.witness.message || '').slice(-20000));
    await verify(token);
    const parsedCandidates = service.parseTruthCandidateResponse(candidateRaw, session.questionType);
    if (!parsedCandidates.candidates.length) throw new Error('模型未返回可用候选真实；可重试候选生成');
    session.truthCandidates = parsedCandidates.candidates;
    session.truthPack = service.pickTruthFromCandidates(session.truthCandidates, session.questionType,
      session.propositionSummary || session.statement);
    session.phase = 'ritual';
    message(`定参完成 · 基础 DC ${session.baseDc} · ${session.hasAntiDiv ? `反占卜 DC ${session.antiDc}` : '无反占卜'}`);
  }
  async function retryTruth(token) {
    await verify(token);
    const session = state.session;
    const raw = await service.requestPhase(selectedPreset(), 'truth_gen',
      service.candidatePrompt(session), [], String(state.witness.message || '').slice(-20000));
    await verify(token);
    const candidates = service.parseTruthCandidateResponse(raw, session.questionType).candidates;
    if (!candidates.length) throw new Error('候选真实仍为空；请重试');
    session.truthCandidates = candidates;
    session.truthPack = service.pickTruthFromCandidates(candidates, session.questionType,
      session.propositionSummary || session.statement);
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
    const raw = await service.requestPhase(selectedPreset(), 'ritual', pending.userText,
      session.chatMessages, String(state.witness.message || '').slice(-20000));
    await verify(token);
    const validated = service.validateRitual(raw, pending);
    pushHistory(session, pending.userText, raw);
    service.extractTagsFromText(raw, session.tagBag);
    session.tagBag['占卜语句'] = [session.statement];
    session.tagBag['占卜方法'] = [session.method];
    (session.displayRecords ||= []).push(`过程：${validated.process}\n启示：${validated.insight}`);
    service.commitPendingRitual(session, pending);
    message(`已推进 ${session.pushCount}/${service.MAX_PUSHES} · 成功 ${session.successCount}/${service.MAX_SUCCESSES}`);
  }
  async function exportReport() {
    if (state.session?.pendingRitual) { message('本环尚未成功出文，请重试或取消', true); return; }
    if (!state.session?.pushCount) { message('尚无可导出的占卜结果', true); return; }
    const token = state.token;
    try {
      await verify(token);
      const input = await contract.waitGlobalInitialized('cryptLord.inputAdapter', { timeoutMs: 10000 });
      await verify(token);
      const report = service.buildExportReport(state.session, selectedPreset());
      input.setInputText(report, 'sillytavern-native');
      message('占卜简报已填入原生输入框，由你决定何时发送');
    } catch (error) { if (active(token)) message(error?.message || String(error), true); }
  }
  function renderConfig() {
    actions(state.content, button('← 返回', () => { state.config = false; render(); }),
      button('从世界书重新读取', () => void run(async token => {
        const loaded = await service.loadPresets();
        if (!active(token)) return;
        state.presets = loaded.presets;
        state.revision = loaded.revision;
        state.selected = state.presets[0].id;
        message('已重新读取快窗方案');
      })));
    const preset = selectedPreset();
    if (!preset) return;
    const fields = [
      ['name', '方案名称'], ['promptParam', '定参提示词'],
      ['promptTruthCandidates', '候选真实提示词'], ['promptRitual', '仪式演绎提示词'],
      ['exportShell', '导出前缀'],
    ];
    const values = {};
    for (const [key, label] of fields) {
      const field = el('label', 'crypt-lord-divination__field', label);
      const input = key === 'name' ? el('input') : el('textarea');
      input.value = preset[key] || '';
      values[key] = input;
      field.append(input);
      state.content.append(field);
    }
    actions(state.content,
      button('保存方案', () => void run(async token => {
        const next = state.presets.map(row => row.id === preset.id ? {
          ...row, ...Object.fromEntries(fields.map(([key]) => [key, values[key].value.trim()])), version: 8,
        } : row);
        const saved = await service.savePresets(next, state.revision, () => active(token));
        if (!active(token)) return;
        state.presets = saved.presets;
        state.revision = saved.revision;
        message('方案已保存到 2历史孔隙');
      })),
      button('恢复原版方案', () => {
        const original = service.defaultPreset();
        for (const [key] of fields) values[key].value = original[key] || '';
        message('原版提示词已载入编辑框，点击保存后生效');
      }));
  }
  function renderSession() {
    const session = state.session;
    actions(state.content, button('重新占卜', () => {
      state.session = service.createSession();
      message('');
      render();
    }), button('方案设置', () => { state.config = true; render(); }));
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
    const spirit = Number(stats.当前灵性 ?? stats.灵性 ?? 15);
    const luck = Number(stats.当前运气 ?? stats.运气 ?? 0);
    const dc = service.getEffectiveDivDc(session);
    progress.append(
      el('span', '', `仪式 ${session.pushCount}/${service.MAX_PUSHES} · 成功 ${session.successCount}/${service.MAX_SUCCESSES} · 清晰度 ${service.CLARITY[session.successCount]}`),
      el('span', '', `当前灵性 ${spirit} ×2 · 运气 ${luck} · 有效 DC ${dc} · 成功阈值 ${service.calcThreshold(spirit * 2, dc, luck)}`),
      el('span', '', session.hasAntiDiv
        ? `反占卜 DC ${session.antiDc} · 失败 ${session.antiFailCount} 次`
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
    if (!state.session) {
      state.content.append(el('p', '', '正在读取当前楼层与占卜方案…'));
      if (state.isError) actions(state.content,
        button('重新读取', () => void open()),
        button('使用内置方案', () => void run(async token => {
          const floor = await witness();
          if (!active(token)) return;
          state.witness = floor;
          state.presets = [service.defaultPreset()];
          state.revision = null;
          state.selected = state.presets[0].id;
          state.session = service.createSession();
          message('当前仅使用内置方案；世界书配置未修改');
        })));
    } else if (state.config) renderConfig();
    else renderSession();
    if (state.busy) state.content.style.pointerEvents = 'none';
    else state.content.style.pointerEvents = '';
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
    message('正在读取…');
    render();
    try {
      const [floor, loaded] = await Promise.all([witness(), service.loadPresets()]);
      if (!active(token)) return false;
      state.witness = floor;
      state.presets = loaded.presets;
      state.revision = loaded.revision;
      state.selected = state.presets[0].id;
      state.session = service.createSession();
      message('');
      render();
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
      state.subscription?.stop();
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
