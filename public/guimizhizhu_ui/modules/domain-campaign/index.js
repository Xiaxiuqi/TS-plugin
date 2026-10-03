(() => {
  'use strict';
  const KEY = 'cryptLord.domainCampaignUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] contract missing`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'];
  const workflow = modules['cryptLord.domainCampaign'];
  const domainState = modules['cryptLord.domainState'];
  const store = modules['cryptLord.stateStore'];
  if (!host || !workflow || !domainState || !store) throw new Error(`[${KEY}] dependencies missing`);
  const state = {
    shell: null, dialog: null, body: null, targetId: null, baseline: '', data: null, story: '',
    busy: false, epoch: 0, operation: 0, drag: null, subscription: null, disposed: false,
    selectedArmy: null,
  };
  const doc = () => host.getHost()?.document || window.document;
  const view = () => doc().defaultView || window;
  const clone = value => JSON.parse(JSON.stringify(value));
  function el(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(label, handler, className = '') {
    const node = el('button', className, label);
    node.type = 'button';
    node.disabled = state.busy;
    node.addEventListener('click', () => { void handler(); });
    return node;
  }
  function notify(message, kind = 'error') {
    if (typeof window.toastr?.[kind] === 'function') window.toastr[kind](message);
    else if (kind === 'error') console.warn(`[${KEY}]`, message);
  }
  const active = () => workflow.sessionOf(state.data);
  const mounted = () => state.shell?.dataset.open === 'true';
  async function run(task) {
    if (state.busy) return;
    const epoch = state.epoch, operation = ++state.operation;
    state.busy = true;
    render();
    try { await task(() => epoch === state.epoch && mounted()); }
    catch (error) { if (epoch === state.epoch) notify(error?.message || String(error)); }
    finally {
      if (operation === state.operation) {
        state.busy = false;
        if (epoch === state.epoch) render();
      }
    }
  }
  async function commit(next, valid) {
    if (!valid()) throw new Error('窗口或聊天已变化，操作已取消');
    const latest = await store.findLatestAssistant();
    const target = await store.readMessage(state.targetId);
    if (!valid() || latest?.message_id !== state.targetId || target?.role !== 'assistant')
      throw new Error('当前 assistant 楼层已变化，请重新读取');
    if (JSON.stringify(target.data || {}) !== state.baseline)
      throw new Error('楼层变量已被其他操作修改，请重新读取后重试');
    const before = clone(target.data || {});
    await store.writeAssistantData(state.targetId, next);
    state.data = next;
    state.baseline = JSON.stringify(next);
    modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
      messageId: state.targetId, beforeData: before, afterData: next, source: KEY,
    });
  }
  function mount() {
    if (state.disposed || state.shell) return Boolean(state.shell);
    if (!doc().body) return false;
    const shell = el('section', 'crypt-lord-campaign');
    shell.dataset.open = 'false';
    const dialog = el('section', 'crypt-lord-campaign__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '领地战役');
    const header = el('header');
    header.append(el('strong', '', '领地战役'), el('span', '', ''));
    header.appendChild(button('×', close, 'crypt-lord-campaign__close'));
    const body = el('div', 'crypt-lord-campaign__body');
    dialog.append(header, body);
    shell.appendChild(dialog);
    doc().body.appendChild(shell);
    state.shell = shell; state.dialog = dialog; state.body = body;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const rect = dialog.getBoundingClientRect();
      dialog.style.left = `${Math.max(8, Math.min(view().innerWidth - rect.width - 8, state.drag.left + event.clientX - state.drag.x))}px`;
      dialog.style.top = `${Math.max(8, Math.min(view().innerHeight - rect.height - 8, state.drag.top + event.clientY - state.drag.y))}px`;
      dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  async function open(messageId, peerId) {
    if (!mount()) return false;
    const latest = await store.findLatestAssistant();
    const id = Number.isInteger(messageId) ? messageId : latest?.message_id;
    if (id !== latest?.message_id) throw new Error('请在最新真实 assistant 楼层发起战役');
    const target = await store.readMessage(id);
    if (target?.role !== 'assistant') throw new Error('找不到当前 assistant 楼层');
    state.targetId = id;
    state.data = clone(target.data || {});
    state.baseline = JSON.stringify(target.data || {});
    const messages = await modules['cryptLord.hostApi'].getChatMessages('0-{{lastMessageId}}');
    const nativeText = text => {
      const raw = String(text || '');
      return raw.match(/<gametxt\b[^>]*>([\s\S]*?)<\/gametxt>/i)?.[1] ||
        raw.replace(/<(?:UpdateVariable|thinking|reasoning|analysis)\b[^>]*>[\s\S]*?<\/(?:UpdateVariable|thinking|reasoning|analysis)>/gi, '');
    };
    state.story = (Array.isArray(messages) ? messages.filter(item => item.role === 'assistant' && item.message_id <= id)
      .slice(-15).map(item => `#${item.message_id} ${nativeText(item.message)}`).join('\n\n') : nativeText(target.message)).slice(-16000);
    const next = peerId ? workflow.start(state.data, peerId) : null;
    state.epoch += 1; state.operation += 1; state.busy = false;
    state.selectedArmy = null;
    state.shell.dataset.open = 'true';
    if (next && JSON.stringify(next) !== state.baseline) {
      await run(async valid => commit(next, valid));
    }
    modules['cryptLord.domainConsole']?.close();
    render();
    if (active() && !active().checked) void run(async valid => {
      const next = await workflow.checkAbsence(state.data, state.story);
      await commit(next, valid);
    });
    return true;
  }
  function close() {
    state.epoch += 1; state.operation += 1; state.busy = false;
    if (state.shell) state.shell.dataset.open = 'false';
  }
  async function reload() { if (!state.busy) await open(state.targetId); }
  function stageTurn(key, stage, nextStage, action = '') {
    return run(async valid => {
      const prose = await workflow.narrate(state.data, state.story, key, action);
      await commit(workflow.record(state.data, stage, action, prose, nextStage), valid);
    });
  }
  function battleNarration() {
    return run(async valid => {
      const prose = await workflow.narrate(state.data, state.story, 'advance_battle');
      await commit(workflow.battleProse(state.data, prose), valid);
    });
  }
  function renderRecords(session) {
    const list = el('div', 'crypt-lord-campaign__records');
    for (const entry of session.records) {
      const block = el('article', 'crypt-lord-campaign__record');
      block.appendChild(el('small', '', `${workflow.labels[entry.stage]}${entry.action ? ` · ${entry.action}` : ''}`));
      block.appendChild(el('p', '', entry.text));
      list.appendChild(block);
    }
    if (session.battle) {
      const details = el('details', 'crypt-lord-campaign__digest');
      details.append(el('summary', '', '战报要点'), el('pre', '', session.battle.digest));
      list.appendChild(details);
    }
    if (!session.records.length) list.appendChild(el('p', 'crypt-lord-campaign__hint', '战役尚未开始演绎。'));
    state.body.appendChild(list);
    list.scrollTop = list.scrollHeight;
  }
  function render() {
    if (!mounted() || !state.data) return;
    const session = active();
    state.body.replaceChildren();
    state.dialog.querySelector('header span').textContent = `${session?.peerName || '邻境'} · 楼层 #${state.targetId}`;
    const toolbar = el('div', 'crypt-lord-campaign__toolbar');
    toolbar.appendChild(button('重新读取', reload));
    state.body.appendChild(toolbar);
    if (!session) { state.body.appendChild(el('p', '', '没有进行中的战役。')); return; }
    const steps = el('nav', 'crypt-lord-campaign__steps');
    const stages = workflow.stages.filter(key => key !== 'return' || session.hadReturn);
    for (const key of stages) steps.appendChild(el('span', key === session.stage ? 'is-current' : '', workflow.labels[key]));
    state.body.appendChild(steps);
    if (state.busy) state.body.appendChild(el('p', 'crypt-lord-campaign__pending', '正在处理战役，请稍候…'));
    if (!session.checked) {
      state.body.appendChild(el('p', 'crypt-lord-campaign__hint', '尚未完成出征在场核验。'));
      state.body.appendChild(button('重新检测', () => run(async valid =>
        commit(await workflow.checkAbsence(state.data, state.story), valid))));
      return;
    }
    if (session.stage === 'return') state.body.appendChild(el('p', 'crypt-lord-campaign__hint', `当前无法直接出征：${session.absenceReason}`));
    renderRecords(session);
    const controls = el('div', 'crypt-lord-campaign__actions');
    const stage = session.stage;
    if (stage !== 'battle') {
      const input = el('textarea');
      input.placeholder = '本阶段行动（仅用于战役演绎，不发送酒馆楼层）';
      input.rows = 3;
      input.disabled = state.busy;
      controls.appendChild(input);
      controls.appendChild(button('演绎补述', () => {
        const text = input.value.trim();
        if (!text) { notify('请填写本阶段行动'); return; }
        return stageTurn(stage, stage, stage, text);
      }));
    }
    if (stage === 'return' || stage === 'muster' || stage === 'march') {
      const transition = {
        return: ['advance_return', 'muster', '集结军队'],
        muster: ['advance_depart', 'march', '率军出发'],
        march: ['advance_arrive', 'parley', '列阵对峙'],
      }[stage];
      controls.appendChild(button(transition[2], () => stageTurn(transition[0], stage, transition[1]), 'is-primary'));
    } else if (stage === 'parley') {
      const armies = el('div', 'crypt-lord-campaign__armies');
      const domain = state.data.stat_data.领地;
      const available = domainState.deployableArmies(domain, session.field);
      const selectedIds = new Set(session.armyIds || []);
      if (!state.selectedArmy || !selectedIds.has(state.selectedArmy))
        state.selectedArmy = available.find(item => selectedIds.has(item.id))?.id || null;
      for (const army of available) {
        const label = el('label');
        const check = el('input'); check.type = 'checkbox'; check.value = army.id;
        check.checked = selectedIds.has(army.id);
        check.disabled = state.busy;
        check.addEventListener('change', () => { void run(async valid =>
          commit(workflow.selectArmy(state.data, army.id, check.checked), valid)); });
        const select = button(`${army.名称 || army.id} · ${domainState.armyCount(army)}人`, () => {
          state.selectedArmy = army.id;
          render();
        }, state.selectedArmy === army.id ? 'is-selected' : '');
        label.append(check, select);
        armies.appendChild(label);
      }
      controls.appendChild(armies);
      const board = el('div', 'crypt-lord-campaign__board');
      board.setAttribute('aria-label', '阵前布阵棋盘；先选择部队，再点击我方半区格子');
      const enemy = domainState.peerPieces(domain, session.peerId);
      const selected = (session.armyIds || []).map(id => available.find(item => item.id === id)).filter(Boolean);
      for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
        const hostile = enemy.find(item => item.x === x && item.y === y);
        const friendly = selected.find((item, index) => {
          const cell = session.formation?.[item.id] || { x: index % 8, y: 4 + Math.floor(index / 8) };
          return cell.x === x && cell.y === y;
        });
        const cell = button(hostile ? `◇ ${hostile.name}` : friendly ? `◆ ${friendly.名称 || friendly.id}` : '',
          () => run(async valid => {
            if (!state.selectedArmy) throw new Error('请先选择我方部队');
            await commit(workflow.position(state.data, state.selectedArmy, x, y), valid);
          }), `crypt-lord-campaign__cell ${y < 3 ? 'is-enemy' : 'is-ally'} ${friendly ? 'is-occupied' : ''}`);
        cell.title = hostile ? `敌方 · ${hostile.name}` : friendly ? `我方 · ${friendly.名称 || friendly.id}` :
          y < 3 ? '敌方区域' : `我方布阵 ${x + 1},${y - 2}`;
        cell.disabled = state.busy || y < 3;
        board.appendChild(cell);
      }
      controls.appendChild(board);
      const start = button('开战', () => run(async valid => {
        const ids = [...(active()?.armyIds || [])];
        if (!ids.length) throw new Error('请选择至少一支可出战部队');
        if (!view().confirm?.('开战后立即结算并保存战损，无法撤销。确定出战？')) return;
        const next = workflow.settle(state.data, ids);
        await commit(next, valid);
        modules['cryptLord.warReplayUi']?.open(active().battle.result, { title: `讨伐 ${session.peerName}` });
        const prose = await workflow.narrate(state.data, state.story, 'advance_battle');
        await commit(workflow.battleProse(state.data, prose), valid);
      }), 'is-primary');
      start.disabled = state.busy || !available.length;
      controls.appendChild(start);
    } else if (stage === 'battle') {
      controls.appendChild(button('查看战斗回放', () =>
        modules['cryptLord.warReplayUi']?.open(session.battle.result, { title: `讨伐 ${session.peerName}` })));
      if (!session.battle.narrated) controls.appendChild(button('重新生成战况', battleNarration, 'is-primary'));
      else controls.appendChild(button('清点战场', () => run(async valid => {
        const key = session.battle.settlement.spoils?.名称 ? 'advance_aftermath_spoils' : 'advance_aftermath';
        const prose = await workflow.narrate(state.data, state.story, key);
        await commit(workflow.aftermath(state.data, prose), valid);
      }), 'is-primary'));
    } else if (stage === 'aftermath') {
      controls.appendChild(button('写入原生输入框', () => run(async valid => {
        const input = modules['cryptLord.inputAdapter'];
        if (!input) throw new Error('原生输入适配器不可用');
        const draft = String(doc().querySelector('#send_textarea')?.value || '').trim();
        if (draft && !view().confirm?.('原生输入框已有草稿。确定替换为战役纪实？')) return;
        const text = workflow.exportText(state.data);
        // Keep the session intact if the composer is unavailable or the floor write fails.
        input.setInputText(text);
        try { await commit(workflow.finish(state.data), valid); }
        catch (error) { notify('纪实已填入输入框，但清理状态失败；请重新读取后完成', 'warning'); throw error; }
        close();
      }), 'is-primary'));
    }
    if (!session.battle) controls.appendChild(button('放弃战役', () => run(async valid => {
      if (!view().confirm?.('放弃本场未结算的战役演绎？')) return;
      await commit(workflow.abort(state.data), valid);
      close();
    })));
    state.body.appendChild(controls);
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, open: mounted(), targetId: state.targetId, busy: state.busy }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(); state.subscription?.stop?.();
      state.shell?.remove(); state.shell = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* already released */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
