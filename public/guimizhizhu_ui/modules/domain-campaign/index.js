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
    shell: null, dialog: null, body: null, targetId: null, data: null, story: '',
    busy: false, epoch: 0, operation: 0, drag: null, subscriptions: [], disposed: false,
    selectedArmy: null, rules: null, audio: null, loaded: null, pending: null, stale: false,
    generating: false, error: '', action: '', focus: null,
  };
  const doc = () => host.getHost()?.document || window.document;
  const view = () => doc().defaultView || window;
  const clone = value => structuredClone(value);
  function el(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(label, handler, className = '') {
    const node = el('button', className, label);
    node.type = 'button';
    node.disabled = locked();
    node.addEventListener('click', () => { void handler(); });
    return node;
  }
  function notify(message, kind = 'error') {
    if (typeof window.toastr?.[kind] === 'function') window.toastr[kind](message);
    else if (kind === 'error') console.warn(`[${KEY}]`, message);
  }
  const active = () => workflow.sessionOf(state.data);
  const mounted = () => state.shell?.dataset.open === 'true';
  const inRules = run => state.rules ? domainState.withWarRules(state.rules, run) : run();
  const locked = () => state.busy || state.stale || state.generating || Boolean(state.pending) || !state.loaded?.editable;
  async function assertSource(valid) {
    try { await workflow.assertNative(state.loaded, valid); }
    catch (error) { state.stale = true; throw error; }
  }
  async function run(task, recovery = false) {
    if (state.busy || state.generating || state.stale || !state.loaded?.editable || state.pending && !recovery) return;
    const epoch = state.epoch, operation = ++state.operation;
    state.busy = true;
    state.error = '';
    render();
    const valid = () => !state.disposed && epoch === state.epoch && mounted() && state.dialog.isConnected &&
      state.dialog.ownerDocument === doc() && !state.generating && !state.stale &&
      modules[KEY] === api && modules['cryptLord.domainCampaign'] === workflow &&
      modules['cryptLord.domainState'] === domainState && modules['cryptLord.afterNativeHost'] === host &&
      modules['cryptLord.stateStore'] === store;
    try {
      if (!recovery) await assertSource(valid);
      await task(valid);
    }
    catch (error) {
      if (epoch === state.epoch) {
        if (state.pending?.status() === 'invalid') state.stale = true;
        state.error = error?.message || String(error); notify(state.error);
      }
    }
    finally {
      if (operation === state.operation) {
        state.busy = false;
        if (epoch === state.epoch) render();
      }
    }
  }
  async function commit(next, valid) {
    if (!valid() || state.pending) throw Error('窗口或待保存结果已变化，操作已取消');
    state.pending = workflow.beginNative(state.loaded, next, valid);
    await finishCommit(await state.pending.run(), valid);
  }
  function adopt(loaded) {
    state.loaded = loaded; state.targetId = loaded.floor.message_id;
    state.data = clone(loaded.floor.data); state.rules = loaded.rules; state.story = loaded.story;
    state.stale = false;
  }
  async function finishCommit(result, valid) {
    if (!valid()) return;
    const before = clone(state.data), previous = active(), next = workflow.sessionOf(result.data);
    state.pending = null; state.data = clone(result.data);
    if (!next || next.stage !== previous?.stage || next.records.length !== previous?.records.length) state.action = '';
    state.error = result.warning || '';
    if (result.loaded) adopt(result.loaded);
    else { state.loaded = null; state.stale = true; }
    if (!result.unchanged) {
      try {
        modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
          messageId: state.targetId, beforeData: before, afterData: state.data, source: KEY,
        });
      } catch (error) { state.error += ` 已保存，但通知失败：${error.message}`; }
    }
    if (result.warning) notify(result.warning, 'warning');
    if (!result.loaded) throw Error(state.error || '已保存，请重新读取后继续');
  }
  function recover() {
    return run(async valid => {
      const transaction = state.pending;
      const result = await (transaction.status() === 'uncertain' ? transaction.inspect() : transaction.save());
      await finishCommit(result, valid);
    }, true);
  }
  function mount() {
    if (state.disposed || state.shell) return Boolean(state.shell);
    if (!doc().body) return false;
    const shell = el('section', 'crypt-lord-campaign');
    shell.dataset.open = 'false';
    const dialog = el('section', 'crypt-lord-campaign__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '领地战役');
    dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
    const header = el('header');
    header.append(el('strong', '', '领地战役'), el('span', '', ''));
    const closer = button('×', () => close(), 'crypt-lord-campaign__close');
    closer.disabled = false; closer.title = '关闭'; closer.setAttribute('aria-label', '关闭');
    header.appendChild(closer);
    const body = el('div', 'crypt-lord-campaign__body');
    dialog.append(header, body);
    shell.appendChild(dialog);
    doc().body.appendChild(shell);
    state.shell = shell; state.dialog = dialog; state.body = body;
    state.audio = modules['cryptLord.gameAudio']?.createScene(() => state.shell);
    const audioControl = modules['cryptLord.gameAudioControl'];
    if (audioControl) header.insertBefore(audioControl.create(doc(), 'war'), header.lastChild);
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
    shell.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')]
        .filter(node => node.getClientRects().length);
      if (event.shiftKey && [controls[0], dialog].includes(doc().activeElement)) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && [controls.at(-1), dialog].includes(doc().activeElement)) { event.preventDefault(); controls[0]?.focus(); }
    });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => {
      state.generating = false; close(true); state.data = null; state.loaded = null;
    }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt || options?.dryRun || dryRun) return;
      state.generating = true; state.stale = true; state.epoch++; state.operation++; state.busy = false;
      state.error = '原生正文正在生成，完成或停止后请重新读取'; render();
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      state.subscriptions.push(host.bindEvent(event, () => { state.generating = false; render(); }));
    return true;
  }
  async function open(messageId, peerId, reread = false) {
    if (!reread && mounted() && (messageId == null || messageId === state.targetId)) {
      state.dialog.focus(); return true;
    }
    if (state.busy || state.generating || !mount()) return false;
    if (!reread && state.pending && !view().confirm('放弃待保存或待核对的战役结果并切换楼层？')) return false;
    const epoch = ++state.epoch;
    const valid = () => !state.disposed && epoch === state.epoch && state.dialog.isConnected &&
      state.dialog.ownerDocument === doc() && !state.generating &&
      modules[KEY] === api && modules['cryptLord.domainCampaign'] === workflow;
    state.operation++; state.busy = true;
    if (!mounted()) state.focus = doc().activeElement;
    state.shell.dataset.open = 'true'; state.dialog.focus();
    state.pending = null; state.loaded = null; state.stale = true; state.error = ''; render();
    try {
      const loaded = await workflow.loadNative(messageId, valid);
      if (!valid()) return false;
      adopt(loaded); state.action = '';
      const next = peerId && loaded.editable ? inRules(() => workflow.start(state.data, peerId)) : null;
      state.operation += 1; state.busy = false;
      state.selectedArmy = null;
      if (next) {
        await run(async valid => commit(next, valid));
      }
      modules['cryptLord.domainConsole']?.close();
      render();
      if (loaded.editable && !state.pending && !state.stale && active() && !active().checked) await run(async valid => {
        const next = await workflow.checkAbsence(state.data, state.story, valid, () => assertSource(valid));
        await commit(next, valid);
      });
      return true;
    } catch (error) {
      if (epoch === state.epoch) {
        if (!valid()) state.stale = true;
        state.busy = false; state.error = error?.message || String(error); render(); notify(state.error);
      }
      return false;
    }
  }
  function close(force = false) {
    if (force !== true && state.pending && !view().confirm('关闭将放弃待保存或待核对的战役结果，确定继续？')) return false;
    state.epoch += 1; state.operation += 1; state.busy = false;
    state.pending = null; state.drag = null;
    if (state.shell) state.shell.dataset.open = 'false';
    state.audio?.leave();
    const replayUi = modules['cryptLord.warReplayUi'];
    if (replayUi?.status().owner === KEY) replayUi.close();
    if (state.focus?.isConnected) state.focus.focus();
    return true;
  }
  async function reload() {
    if (state.busy || state.generating) return false;
    if (state.pending && !view().confirm('重新读取将放弃待保存或待核对的战役结果，确定继续？')) return false;
    return open(state.targetId, undefined, true);
  }
  function stageTurn(key, stage, nextStage, action = '') {
    return run(async valid => {
      const prose = await workflow.narrate(state.data, state.story, key, action, valid, () => assertSource(valid));
      await commit(workflow.record(state.data, stage, action, prose, nextStage), valid);
    });
  }
  function battleNarration() {
    return run(async valid => {
      const prose = await workflow.narrate(state.data, state.story, 'advance_battle', '', valid, () => assertSource(valid));
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
    const focused = doc().activeElement, restore = state.body?.contains(focused);
    const label = focused?.getAttribute?.('aria-label'), text = focused?.textContent;
    const selection = focused?.tagName === 'TEXTAREA' ? [focused.selectionStart, focused.selectionEnd] : null;
    const result = inRules(renderScoped);
    if (restore && mounted()) {
      const next = [...state.body.querySelectorAll('button:not(:disabled), textarea:not(:disabled), input:not(:disabled)')]
        .find(node => label ? node.getAttribute('aria-label') === label : node.textContent === text);
      (next || state.dialog).focus();
      if (selection && next?.tagName === 'TEXTAREA') next.setSelectionRange(...selection);
    }
    return result;
  }
  function renderScoped() {
    if (!mounted()) return;
    const session = active();
    const audio = modules['cryptLord.gameAudio'];
    const group = audio?.campaignGroup(session?.stage);
    if (group) state.audio?.enter(group, 'war');
    else state.audio?.leave();
    state.body.replaceChildren();
    state.dialog.setAttribute('aria-busy', String(state.busy));
    state.dialog.querySelector('header span').textContent = `${session?.peerName || '邻境'} · 楼层 #${state.targetId}`;
    const toolbar = el('div', 'crypt-lord-campaign__toolbar');
    const reread = button('重新读取', reload);
    reread.disabled = state.busy || state.generating;
    toolbar.appendChild(reread);
    if (state.pending) {
      const phase = state.pending.status();
      const retry = button(phase === 'uncertain' ? '核对原生保存状态' : '保存本次战役结果', recover);
      retry.disabled = state.busy || state.generating || state.stale || !['pending', 'uncertain'].includes(phase);
      toolbar.appendChild(retry);
    }
    state.body.appendChild(toolbar);
    const status = el('p', 'crypt-lord-campaign__pending',
      state.error || state.loaded?.reason || (state.pending ? '本次结果尚待保存或核对。' : state.busy ? '正在处理战役，请稍候…' : ''));
    status.setAttribute('role', 'status'); status.hidden = !status.textContent;
    state.body.appendChild(status);
    if (!session) {
      state.body.appendChild(el('p', '', '没有进行中的战役。'));
      if (state.data?.cryptLord?.domainCampaignExport?.text)
        state.body.appendChild(button('写入原生输入框', () => run(writeExport), 'is-primary'));
      return;
    }
    const steps = el('nav', 'crypt-lord-campaign__steps');
    const stages = workflow.stages.filter(key => key !== 'return' || session.hadReturn);
    for (const key of stages) steps.appendChild(el('span', key === session.stage ? 'is-current' : '', workflow.labels[key]));
    state.body.appendChild(steps);
    if (!session.checked) {
      state.body.appendChild(el('p', 'crypt-lord-campaign__hint', '尚未完成出征在场核验。'));
      state.body.appendChild(button('重新检测', () => run(async valid =>
        commit(await workflow.checkAbsence(state.data, state.story, valid, () => assertSource(valid)), valid))));
      return;
    }
    if (session.stage === 'return') state.body.appendChild(el('p', 'crypt-lord-campaign__hint', `当前无法直接出征：${session.absenceReason}`));
    renderRecords(session);
    const controls = el('div', 'crypt-lord-campaign__actions');
    const stage = session.stage;
    if (stage !== 'battle') {
      const input = el('textarea');
      input.placeholder = '本阶段行动（仅用于战役演绎，不发送酒馆楼层）';
      input.setAttribute('aria-label', '本阶段行动');
      input.rows = 3;
      input.value = state.action; input.addEventListener('input', () => { state.action = input.value; });
      input.disabled = locked();
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
        check.disabled = locked();
        check.addEventListener('change', () => { void run(async valid =>
          commit(inRules(() => workflow.selectArmy(state.data, army.id, check.checked)), valid)); });
        const select = button(`${army.名称 || army.id} · ${domainState.armyCount(army)}人`, () => {
          state.selectedArmy = army.id;
          render();
        }, state.selectedArmy === army.id ? 'is-selected' : '');
        label.append(check, select);
        armies.appendChild(label);
      }
      controls.appendChild(armies);
      const board = el('div', 'crypt-lord-campaign__board');
      const dimensions = domainState.warBoard?.() || { cols: 8, rows: 6, half: 3 };
      board.style.gridTemplateColumns = `repeat(${dimensions.cols}, minmax(0, 1fr))`;
      board.style.gridTemplateRows = `repeat(${dimensions.rows}, 42px)`;
      board.setAttribute('aria-label', '阵前布阵棋盘；先选择部队，再点击我方半区格子');
      const enemy = domainState.peerPieces(domain, session.peerId);
      const selected = (session.armyIds || []).map(id => available.find(item => item.id === id)).filter(Boolean);
      for (let y = 0; y < dimensions.rows; y++) for (let x = 0; x < dimensions.cols; x++) {
        const hostile = enemy.find(item => item.x === x && item.y === y);
        const friendly = selected.find((item, index) => {
          const cell = session.formation?.[item.id] || domainState.formationCell?.(index) || { x: index % 8, y: 4 + Math.floor(index / 8) };
          return cell.x === x && cell.y === y;
        });
        const cell = button(hostile ? `◇ ${hostile.name}` : friendly ? `◆ ${friendly.名称 || friendly.id}` : '',
          () => run(async valid => {
            if (!state.selectedArmy) throw new Error('请先选择我方部队');
            await commit(inRules(() => workflow.position(state.data, state.selectedArmy, x, y)), valid);
          }), `crypt-lord-campaign__cell ${y < dimensions.half ? 'is-enemy' : 'is-ally'} ${friendly ? 'is-occupied' : ''}`);
        cell.title = hostile ? `敌方 · ${hostile.name}` : friendly ? `我方 · ${friendly.名称 || friendly.id}` :
          y < dimensions.half ? '敌方区域' : `我方布阵 ${x + 1},${y - dimensions.half + 1}`;
        cell.disabled = locked() || y < dimensions.half;
        board.appendChild(cell);
      }
      controls.appendChild(board);
      const start = button('开战', () => run(async valid => {
        const ids = [...(active()?.armyIds || [])];
        if (!ids.length) throw new Error('请选择至少一支可出战部队');
        if (!view().confirm?.('开战后立即结算并保存战损，无法撤销。确定出战？')) return;
        const next = inRules(() => workflow.settle(state.data, ids));
        await commit(next, valid);
        modules['cryptLord.warReplayUi']?.open(active().battle.result, { title: `讨伐 ${session.peerName}`, owner: KEY });
        const prose = await workflow.narrate(state.data, state.story, 'advance_battle', '', valid, () => assertSource(valid));
        await commit(workflow.battleProse(state.data, prose), valid);
      }), 'is-primary');
      start.disabled = locked() || !available.length;
      controls.appendChild(start);
    } else if (stage === 'battle') {
      controls.appendChild(button('查看战斗回放', () =>
        modules['cryptLord.warReplayUi']?.open(session.battle.result, { title: `讨伐 ${session.peerName}`, owner: KEY })));
      if (!session.battle.narrated) controls.appendChild(button('重新生成战况', battleNarration, 'is-primary'));
      else controls.appendChild(button('清点战场', () => run(async valid => {
        const key = session.battle.settlement.spoils?.名称 ? 'advance_aftermath_spoils' : 'advance_aftermath';
        const prose = await workflow.narrate(state.data, state.story, key, '', valid, () => assertSource(valid));
        await commit(workflow.aftermath(state.data, prose), valid);
        const replayUi = modules['cryptLord.warReplayUi'];
        if (replayUi?.status().owner === KEY) replayUi.close();
      }), 'is-primary'));
    } else if (stage === 'aftermath') {
      controls.appendChild(button('写入原生输入框', () => run(writeExport), 'is-primary'));
    }
    if (!session.battle) controls.appendChild(button('放弃战役', () => run(async valid => {
      if (!view().confirm?.('放弃本场未结算的战役演绎？')) return;
      await commit(workflow.abort(state.data), valid);
      close();
    })));
    state.body.appendChild(controls);
  }
  async function writeExport(valid) {
    const input = modules['cryptLord.inputAdapter'], document = doc(), node = document.querySelector('#send_textarea');
    if (!input?.setInputText || !node) throw Error('原生输入适配器不可用');
    const draft = node.value, text = workflow.exportText(state.data);
    if (String(draft).trim() && !view().confirm('原生输入框已有草稿。确定替换为战役纪实？')) return;
    await assertSource(valid);
    if (active()) await commit(workflow.finish(state.data), valid);
    await assertSource(valid);
    if (!valid() || modules['cryptLord.inputAdapter'] !== input || doc() !== document ||
      document.querySelector('#send_textarea') !== node || node.value !== draft)
      throw Error('战役纪实已保存，但输入框草稿或来源已变化，未替换；可重新填写纪实');
    input.setInputText(text);
    close(true);
    if (node.isConnected) node.focus();
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, open: mounted(), targetId: state.targetId, busy: state.busy,
      stale: state.stale, generating: state.generating, pending: state.pending?.status() || null }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(item => item?.stop());
      state.audio?.dispose();
      state.shell?.remove(); state.shell = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* already released */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
