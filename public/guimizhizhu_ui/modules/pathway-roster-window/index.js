(() => {
  'use strict';
  const KEY = 'cryptLord.pathwayRosterWindow';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(options) {
  const service = modules[options.serviceKey], host = modules['cryptLord.afterNativeHost'];
  const state = { panel: null, body: null, notice: null, session: null, snapshot: null,
    pool: null, events: [], busy: false, token: 0, disposed: false, subscriptions: [],
    source: null, scope: null, pending: null, invalid: false, generating: false, writing: false,
    locked: false };
  const transactional = options.nativeTransactions === true;
  let ownerDocument = null;
  const doc = () => ownerDocument || host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const store = () => contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === 'true';
  function guard(token) {
    if (!active(token) || state.invalid || state.generating) return false;
    if (!transactional || !state.scope) return true;
    return Object.entries(state.scope).every(([key, value]) => modules[key] === value) &&
      host.getHost()?.document === ownerDocument &&
      (state.scope['cryptLord.abilityState'].locked?.(state.snapshot.data, win()) ?? false) === state.locked &&
      state.scope['cryptLord.nativeFloorSource'].assertIdentity(state.source, () => active(token));
  }
  const story = text => modules['cryptLord.responseNormalizer'].normalize(text).message;
  function notice(text, error = false) {
    state.notice.textContent = text;
    state.notice.dataset.error = String(error);
  }
  function close() {
    state.choice?.('skip');
    state.choice = null;
    state.token++;
    state.panel?.setAttribute('data-open', 'false');
    state.busy = false;
    state.writing = false;
    state.session = null;
    state.pending = null;
    state.rollback = null;
    state.panel?.setAttribute('aria-busy', 'false');
    if (transactional && state.returnFocus?.isConnected) state.returnFocus.focus();
  }
  function makeSession(data, view = {}) {
    const token = state.token;
    const latest = story(state.snapshot.message);
    const older = state.events.filter(event => event.序号 < state.snapshot.id);
    const session = service.create(data, state.pool, {
      window: win(), message: latest, scope: () => state.body, locked: state.locked,
      guard: transactional ? () => guard(token) : undefined,
      assertCurrent: transactional ? async () => {
        await verify(token);
        await state.scope['cryptLord.abilityState'].assertPool(state.pool, () => guard(token));
      } : undefined,
      evidenceList: async () => state.events.filter(event => event.序号 < state.snapshot.id),
      freshEvidenceList: async () => {
        if (transactional) await verify(token);
        return (transactional ? state.source.rows : await host.listAssistantMessages() || [])
          .filter(row => row.role === 'assistant' && !row.is_hidden && row.message_id < state.snapshot.id)
          .slice(-100).map(evidenceEvent);
      },
      evidence: { latest, history: older.slice(0, -10).map(event => `#${event.序号}\n${event.正文}`).join('\n'),
        recent: older.slice(-10).map(event => `#${event.序号}\n${event.正文}`).join('\n') },
      confirm: async text => win().confirm(String(text).replace(/<[^>]*>/g, '')),
      prompt: async (_title, _description, value) => win().prompt(`${options.label}改名`,
        String(value || '').replace(/&(amp|lt|gt|quot|#39);/g, (_, key) =>
          ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[key])),
      chooseNarrative: options.narrative ? (title, _description, choices) => new Promise(resolve => {
        const band = el('div', 'ppw-narrative');
        band.append(el('strong', '', title));
        for (const choice of choices) {
          const button = el('button', '', choice.label || choice.text || choice.name || choice);
          button.type = 'button';
          button.addEventListener('click', () => {
            state.choice = null; band.remove(); resolve(choice.value || choice.id || choice);
          });
          band.append(button);
        }
        state.choice = resolve;
        state.body.append(band);
      }) : undefined,
      promptNarrativeText: async title => win().prompt(title || `自定义${options.label}登场场景`, '') || '',
      notice: (text, error) => { if (active(token)) notice(text, error); },
      render: () => { if (active(token)) render(); },
    });
    Object.assign(session.state, view);
    return session;
  }
  function render() {
    if (!state.body || state.rendering) return;
    if (!state.session) {
      if (transactional) {
        state.body.replaceChildren();
        state.panel.setAttribute('aria-busy', String(state.busy));
        updateTools();
      }
      return;
    }
    state.rendering = true;
    try {
    // Flush focused field changes before replacing the form; change handlers can request another render.
    const focused = doc().activeElement;
    if (state.body.contains(focused)) focused.blur();
    state.body.innerHTML = state.session.render()
      .replaceAll('最近 100 条小总结', '最近 100 个原生楼层')
      .replaceAll('小总结', '原生楼层')
      .replaceAll('🎲 ', '');
    for (const paragraph of state.body.querySelectorAll('p.ppw-hint')) {
      if (/上限随序列提升|勾选你认为|选一段剧情作为|下列秘偶已通过判定|带着入册快照（此前|下列字段会写入|勾选顺序中前|激活灵魂会提供|场外保存激活组合|认证官会检查剧情/.test(paragraph.textContent))
        paragraph.remove();
    }
    state.panel.setAttribute('aria-busy', String(state.busy));
    if (!service.gate(state.session.data, state.pool).unlocked) {
      state.body.prepend(el('p', 'ppw-warn', options.lockedText));
    }
    const disabled = state.busy || !service.gate(state.session.data, state.pool).unlocked ||
      transactional && (state.invalid || state.generating || Boolean(state.pending));
    for (const button of state.body.querySelectorAll('button[data-ppw]'))
      if (disabled && (transactional || !button.dataset.ppw.startsWith('to-'))) button.disabled = true;
    if (transactional) {
      for (const input of state.body.querySelectorAll('input, select, textarea'))
        if (disabled) input.disabled = true;
      updateTools();
    }
    } finally { state.rendering = false; }
  }
  async function verify(token) {
    if (!active(token) || !state.snapshot) throw Error('窗口或聊天已变化');
    if (transactional) {
      try {
        if (!guard(token)) throw Error('原生楼层、能力锁定或玩法服务已变化，请重新读取');
        await state.scope['cryptLord.nativeFloorSource'].assert(state.source, () => guard(token));
        if (!guard(token)) throw Error('玩法来源已变化，请重新读取');
        return state.source.rows.find(row => row.message_id === state.snapshot.id);
      } catch (error) {
        if (active(token)) state.invalid = true;
        throw error;
      }
    }
    const current = await (await store()).findLatestAssistant();
    if (!active(token) || !current || current.message_id !== state.snapshot.id ||
      current.message !== state.snapshot.message || JSON.stringify(current.data) !== state.snapshot.revision)
      throw Error('楼层正文或变量已变化，请重新读取');
    return current;
  }
  function snapshot(message) {
    state.snapshot = { id: message.message_id, message: message.message,
      data: structuredClone(message.data), revision: JSON.stringify(message.data) };
  }
  function evidenceEvent(row) {
    return { 序号: row.message_id, 日期: String(row.data?.world_data?.当前时间纪元 || ''),
      大纲: story(row.message).slice(0, 40), 详细描述: story(row.message), 正文: story(row.message) };
  }
  async function refresh(token) {
    const abilities = modules['cryptLord.abilityState'];
    if (transactional) {
      if (state.generating) throw Error('正文正在生成，请结束后重新读取');
      state.scope = null; state.source = null; state.session = null; state.pending = null; state.invalid = false;
      const sourceService = modules['cryptLord.nativeFloorSource'];
      if (!sourceService) throw Error('原生楼层来源服务尚未加载');
      if (!abilities?.assertPool) throw Error('玩法规则来源服务尚未加载');
      const scope = Object.fromEntries([options.serviceKey, 'cryptLord.afterNativeHost', 'cryptLord.hostApi',
        'cryptLord.stateStore', 'cryptLord.nativeFloorSource', 'cryptLord.abilityState',
        'cryptLord.responseNormalizer', ...[
          'marionetteState', 'marionetteReference', 'cloneReference', 'battleFieldEffectReference',
          'battlePlayUnits', 'audienceImagination', 'grazingReference', 'readerMystic', 'readerReference',
          'mysteryReenactment', 'mysteryRosterReference', 'mysteryAnalysis', 'mysteryAnalysisReference',
          'scrollWorkshopReference', 'shamanPictureReference', 'shamanTerritoryReference',
          'arbiterJurisdictionReference', 'audienceImaginationReference',
        ].map(name => `cryptLord.${name}`)].map(key => [key, modules[key]]));
      const source = await sourceService.read(() => active(token) && !state.generating);
      const pool = await abilities.loadPool(() => active(token) && !state.generating);
      await sourceService.assert(source, () => active(token) && !state.generating);
      if (!active(token)) return;
      const latest = source.rows.at(-1);
      if (latest?.role !== 'assistant' || latest.is_hidden || !latest.data?.stat_data)
        throw Error('末楼必须是可见且具有角色变量的真实 assistant 楼层');
      if (Object.entries(scope).some(([key, value]) => modules[key] !== value) ||
        scope[options.serviceKey] !== service || scope['cryptLord.afterNativeHost'] !== host)
        throw Error('玩法窗口服务已变化，请重新打开');
      state.scope = scope;
      state.source = source; state.pool = pool; snapshot(latest);
      state.locked = abilities.locked?.(latest.data, win()) ?? false;
      state.events = source.rows.filter(row => row.role === 'assistant' && !row.is_hidden)
        .slice(-100).map(evidenceEvent);
      if (!guard(token)) throw Error('玩法窗口宿主已变化，请重新打开');
      state.session = makeSession(latest.data);
      render(); notice(''); return;
    }
    const pool = await abilities.loadPool(() => active(token));
    if (!active(token)) return;
    const latest = await (await store()).findLatestAssistant();
    if (!latest || latest.role !== 'assistant') throw Error('没有真实 assistant 楼层');
    const events = await host.listAssistantMessages();
    if (!active(token)) return;
    state.pool = pool;
    snapshot(latest);
    state.events = (events || []).filter(row => row.message_id <= latest.message_id)
      .slice(-100).map(evidenceEvent);
    state.session = makeSession(latest.data);
    render();
    notice('');
  }
  async function action(act, arg) {
    if (state.busy || !state.session || transactional && (state.pending || state.invalid || state.generating)) return;
    const token = state.token, session = state.session, pool = state.pool;
    const abilities = modules['cryptLord.abilityState'];
    state.busy = true;
    state.panel.setAttribute('aria-busy', 'true');
    if (transactional) {
      // Keep an independent pre-action draft so a late model result cannot mutate a cancelled session.
      state.rollback = { data: structuredClone(session.data), view: structuredClone(session.state) };
      lockControls();
    }
    try {
      await verify(token);
      if (abilities.assertPool) await abilities.assertPool(pool, () => active(token));
      if (!active(token)) return;
      await session.action(act, arg);
      const storage = await store();
      await verify(token);
      if (JSON.stringify(session.data) !== state.snapshot.revision) {
        if (transactional) {
          state.pending = { session, expected: null, attempted: false, uncertain: false };
          updateTools();
          await savePending(token);
          return;
        }
        service.guard(session.data);
        const committed = await storage.writeAssistantData(state.snapshot.id, session.data, 'affected', async () => {
          await session.verifyEvidence?.();
          await verify(token);
        }, () => active(token), { rulePool: abilities.assertPool ? pool : undefined });
        if (!active(token)) return;
        const fresh = await (await store()).findLatestAssistant();
        if (!active(token) || fresh?.message_id !== state.snapshot.id ||
          fresh.message !== state.snapshot.message ||
          JSON.stringify(fresh.data) !== JSON.stringify(committed?.stat_data ? committed : session.data))
          throw Error('写入后聊天或楼层已变化，请重新读取');
        snapshot(fresh);
        state.session = makeSession(fresh.data, session.state);
        for (const effect of session.effects || []) {
          if (effect.type !== 'native-input') continue;
          await verify(token);
          const adapter = await contract.waitGlobalInitialized('cryptLord.inputAdapter', { timeoutMs: 10000 });
          const input = doc().querySelector('#send_textarea');
          if (!input) throw Error(`${options.label}已保存，但未找到原生输入框`);
          const previous = input.value;
          if (previous.trim() && !win().confirm(`原生输入框已有内容，是否替换为${options.label}登场演绎？`)) continue;
          await verify(token);
          if (input.value !== previous) throw Error(`${options.label}已保存，输入框内容已变化，未覆盖`);
          if (adapter.setInputText(effect.text, 'sillytavern-native') === false)
            throw Error(`${options.label}已保存，登场演绎填入失败`);
        }
        session.effects.length = 0;
      }
    } catch (error) {
      if (active(token)) {
        if (!transactional) state.session = makeSession(state.snapshot.data);
        else if (!state.pending && state.rollback)
          state.session = makeSession(state.rollback.data, state.rollback.view);
        notice(error?.message || String(error), true);
      }
    } finally {
      if (active(token)) { state.busy = false; state.rollback = null; render(); }
    }
  }
  function updateTools() {
    state.reload.disabled = state.busy || state.generating;
    state.cancel.hidden = !state.busy;
    state.cancel.disabled = state.writing || Boolean(state.pending);
    state.retry.hidden = !state.pending || state.pending.uncertain;
    state.retry.disabled = state.busy || state.invalid || state.generating;
    state.inspect.hidden = !state.pending?.uncertain;
    state.inspect.disabled = state.busy || state.invalid || state.generating;
  }
  function lockControls() {
    state.panel.setAttribute('aria-busy', String(state.busy));
    for (const node of state.body.querySelectorAll('button, input, select, textarea')) node.disabled = true;
    updateTools();
  }
  function cancel() {
    if (!state.busy || state.writing) return;
    const rollback = state.rollback;
    state.choice?.('skip'); state.choice = null;
    state.token++; state.busy = false;
    if (rollback) state.session = makeSession(rollback.data, rollback.view);
    state.rollback = null;
    notice('操作已取消');
    render();
  }
  async function finishSave(token, fresh, warning = '') {
    if (!guard(token)) return;
    const pending = state.pending, previous = pending.session;
    state.source = fresh;
    snapshot(fresh.rows.find(row => row.message_id === state.snapshot.id));
    state.pending = null;
    state.rollback = null;
    state.session = makeSession(state.snapshot.data, previous.state);
    notice(warning || '已保存');
    // Only a confirmed native write may publish the optional entrance narrative.
    for (const effect of previous.effects || []) {
      if (effect.type !== 'native-input') continue;
      await verify(token);
      const adapter = await contract.waitGlobalInitialized('cryptLord.inputAdapter', { timeoutMs: 10000 });
      const input = doc().querySelector('#send_textarea');
      if (!input) throw Error(`${options.label}已保存，但未找到原生输入框`);
      const value = input.value;
      if (value.trim() && !win().confirm(`原生输入框已有内容，是否替换为${options.label}登场演绎？`)) continue;
      await verify(token);
      if (modules['cryptLord.inputAdapter'] !== adapter || input !== doc().querySelector('#send_textarea') ||
        input.value !== value) throw Error(`${options.label}已保存，输入框已变化，未覆盖`);
      if (adapter.setInputText(effect.text, 'sillytavern-native') === false)
        throw Error(`${options.label}已保存，登场演绎填入失败`);
    }
    previous.effects.length = 0;
  }
  async function inspectPending(token, writeError) {
    const pending = state.pending, sourceService = state.scope['cryptLord.nativeFloorSource'];
    if (!guard(token)) throw Error('玩法来源已变化，请重新读取');
    let fresh;
    try { fresh = await sourceService.read(() => guard(token)); }
    catch (error) {
      pending.uncertain = true;
      throw Error(`保存状态待核对，未重新执行操作：${error.message}`);
    }
    if (!guard(token)) throw Error('玩法来源已变化，请重新读取');
    const expected = structuredClone(state.source);
    const row = expected.rows.find(item => item.message_id === state.snapshot.id);
    const page = expected.swipes.find(item => item.message_id === state.snapshot.id);
    row.data = structuredClone(pending.expected);
    page.swipes_data[page.swipe_id] = structuredClone(pending.expected);
    if (sourceService.signature(expected) === sourceService.signature(fresh)) {
      await finishSave(token, fresh, writeError ? '保存回执异常，已核对原生楼层并确认保存' : '');
      return;
    }
    if (sourceService.signature(state.source) === sourceService.signature(fresh)) {
      pending.uncertain = false;
      throw Error(`${writeError?.message || '原生楼层尚未保存'}；结果已保留，可重试保存`);
    }
    state.invalid = true;
    throw Error('保存后楼层、变量或消息页已变化，未覆盖；请重新读取核对');
  }
  async function savePending(token) {
    const pending = state.pending;
    await verify(token);
    const abilities = state.scope['cryptLord.abilityState'];
    await abilities.assertPool(state.pool, () => guard(token));
    await pending.session.verifyEvidence?.();
    if (!guard(token)) throw Error('玩法保存已取消');
    service.guard(pending.session.data);
    state.writing = true; updateTools();
    let writeError;
    try {
      await state.scope['cryptLord.stateStore'].writeAssistantData(state.snapshot.id, pending.session.data,
        'affected', async () => {
          await pending.session.verifyEvidence?.();
          await verify(token);
        }, () => guard(token), {
          rulePool: abilities.assertPool ? state.pool : undefined,
          onWriteAttempt(next) { pending.expected = structuredClone(next); pending.attempted = true; },
        });
    } catch (error) { writeError = error; }
    finally { if (active(token)) state.writing = false; }
    if (!active(token)) return;
    if (!pending.attempted) throw writeError || Error('原生保存未返回写入凭据，未重新执行操作');
    await inspectPending(token, writeError);
  }
  async function retrySave(inspectOnly = false) {
    if (state.busy || !state.pending || state.invalid || state.generating) return;
    const token = state.token;
    state.busy = true; lockControls();
    try { if (inspectOnly) await inspectPending(token); else await savePending(token); }
    catch (error) { if (active(token)) notice(error.message, true); }
    finally { if (active(token)) { state.busy = false; render(); } }
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    if (transactional) ownerDocument = doc();
    const panel = el('section', `crypt-lord-pathway-roster ${options.className}`);
    panel.dataset.open = 'false';
    const header = el('header'), tools = el('div', 'crypt-lord-marionette__tools');
    const reload = el('button', '', '重新读取'), shut = el('button', '', '×');
    if (transactional) {
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', options.title); panel.tabIndex = -1;
      const cancelButton = el('button', '', '取消'), retry = el('button', '', '重试保存'),
        inspect = el('button', '', '核对保存');
      cancelButton.type = retry.type = inspect.type = 'button';
      cancelButton.hidden = retry.hidden = inspect.hidden = true;
      cancelButton.addEventListener('click', cancel);
      retry.addEventListener('click', () => void retrySave());
      inspect.addEventListener('click', () => void retrySave(true));
      Object.assign(state, { reload, cancel: cancelButton, retry, inspect });
      tools.append(cancelButton, retry, inspect);
    }
    reload.type = shut.type = 'button';
    shut.title = `关闭${options.label}管理`;
    shut.setAttribute('aria-label', shut.title);
    shut.addEventListener('click', close);
    reload.addEventListener('click', async () => {
      if (state.busy || transactional && state.generating) return;
      if (state.pending && !win().confirm('放弃当前保留的结果并重新读取原生楼层？')) return;
      const token = state.token;
      state.busy = true;
      if (transactional) lockControls();
      try { await refresh(token); }
      catch (error) { if (active(token)) notice(error.message, true); }
      finally { if (active(token)) { state.busy = false; render(); } }
    });
    tools.append(reload, shut);
    header.append(el('strong', '', options.title), tools);
    const body = el('main', 'crypt-lord-marionette__body');
    const footer = el('footer');
    footer.setAttribute('role', 'status');
    panel.append(header, body, footer);
    doc().body.append(panel);
    Object.assign(state, { panel, body, notice: footer });
    body.addEventListener('click', event => {
      const command = event.target.closest('button[data-ppw]');
      if (command && !command.disabled) void action(command.dataset.ppw, command.dataset.arg);
    });
    body.addEventListener('change', event => {
      if (event.target.dataset.ppwChange && !state.busy)
        state.session?.mode.onChange?.(state.session.win, event.target.dataset.ppwChange, event.target);
    });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8,
        drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8,
        drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => {
      state.generating = false; close();
    }));
    if (transactional) {
      if (events?.GENERATION_STARTED) state.subscriptions.push(host.bindEvent(events.GENERATION_STARTED,
        (type, config, dryRun) => {
          if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || config?.quiet_prompt || config?.dryRun || dryRun) return;
          state.generating = true;
          if (state.panel?.dataset.open !== 'true') return;
          state.choice?.('skip'); state.choice = null;
          state.token++; state.busy = false; state.writing = false; state.invalid = true;
          if (state.session && !state.pending) state.session = makeSession(state.snapshot.data);
          notice('正文已开始生成，请结束后重新读取原生楼层', true); render();
        }));
      for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
        state.subscriptions.push(host.bindEvent(name, () => { state.generating = false; render(); }));
      state.keyListener = event => {
        if (panel.dataset.open !== 'true') return;
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const nodes = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')]
          .filter(node => node.getClientRects().length && node.checkVisibility?.() !== false);
        if (event.shiftKey && [nodes[0], panel].includes(doc().activeElement)) {
          event.preventDefault(); nodes.at(-1)?.focus();
        } else if (!event.shiftKey && (doc().activeElement === nodes.at(-1) || !panel.contains(doc().activeElement))) {
          event.preventDefault(); nodes[0]?.focus();
        }
      };
      doc().addEventListener('keydown', state.keyListener);
    }
    return true;
  }
  async function open() {
    if (!mount()) return false;
    if (transactional && state.panel.dataset.open === 'true') { state.panel.focus(); return true; }
    if (transactional) state.returnFocus = doc().activeElement;
    close();
    const token = state.token;
    state.panel.dataset.open = 'true';
    if (transactional) state.panel.focus();
    state.panel.style.left = state.panel.style.top = state.panel.style.transform = '';
    state.body.replaceChildren();
    notice(`正在读取${options.label}资料…`);
    state.busy = true;
    try {
      await refresh(token);
    } catch (error) { if (active(token)) notice(error.message, true); }
    finally { if (active(token)) { state.busy = false; render(); } }
    return true;
  }
  const api = { open, close, mount, status: () => ({ mounted: Boolean(state.panel), busy: state.busy }),
    dispose() { close(); state.disposed = true; state.subscriptions.forEach(item => item?.stop?.());
      if (state.keyListener) doc().removeEventListener('keydown', state.keyListener);
      state.panel?.remove(); state.panel = null; contract.releaseGlobal(options.key); } };
  return api;
  }
  const api = { create, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
