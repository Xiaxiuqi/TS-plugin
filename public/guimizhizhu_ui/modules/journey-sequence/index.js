(() => {
  'use strict';
  const KEY = 'cryptLord.journeySequenceUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.journeySequence'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('经历序号界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { token: 0, session: 0, disposed: false, busy: false, loaded: null, undo: null, pending: null,
    generating: false, stale: false, subscriptions: [], focus: null, surface: after.getHost() };
  const doc = () => state.surface?.document || document;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  };
  function live(session = state.session) {
    const surface = after.getHost();
    if (modules[KEY] !== api || modules['cryptLord.journeySequence'] !== service ||
      modules['cryptLord.afterNativeHost'] !== after || state.surface?.document !== surface?.document ||
      state.surface?.window !== surface?.window) { close(true); return false; }
    return !state.disposed && state.panel?.dataset.open === 'true' && session === state.session;
  }
  const active = token => live() && token === state.token;
  function button(label, icon, action, compact = false) {
    const node = el('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = el('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true'); node.append(symbol);
    if (!compact) node.append(el('span', '', label));
    node.addEventListener('click', action); return node;
  }
  function number(label, value) {
    const wrapper = el('label'), input = el('input'); input.type = 'number'; input.min = '0'; input.step = '1';
    input.value = String(value); input.setAttribute('aria-label', label); wrapper.append(el('span', '', label), input);
    return { wrapper, input };
  }
  function discard() {
    return !state.pending || doc().defaultView.confirm('放弃本次待核对或待重试的结果？已写入的内容不会撤销。');
  }
  function close(force = false) {
    if (!force && (!discard() || !state.pending && state.undo &&
      !doc().defaultView.confirm('关闭将结束本次恢复原始会话；已保存的序号不会撤销，继续？'))) return false;
    state.token++; state.session++; service.cancel(); state.busy = false; state.loaded = null; state.undo = null; state.pending = null;
    state.panel?.setAttribute('data-open', 'false');
    if (state.panel) render();
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null; return true;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return true;
    const panel = el('section', 'crypt-lord-sequence'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '经历序号修正');
    const header = el('header'), tools = el('div', 'crypt-lord-sequence__tools');
    tools.append(button('重新读取', 'fa-rotate-right', () => void reload(), true), button('关闭', 'fa-xmark', () => close(), true));
    header.append(el('strong', '', '经历序号修正'), tools);
    const status = el('p', 'crypt-lord-sequence__status'); status.setAttribute('role', 'status');
    const recovery = el('div', 'crypt-lord-sequence__recovery');
    const retry = button('重试保存', 'fa-floppy-disk', () => void recover(false));
    const inspect = button('核对保存', 'fa-magnifying-glass', () => void recover(true));
    recovery.append(retry, inspect);
    const main = el('main'), fieldset = el('fieldset'), range = el('div', 'crypt-lord-sequence__range');
    const from = number('起始楼层', 1), to = number('结束楼层', 1), read = button('分析范围', 'fa-magnifying-glass', () => void reload());
    range.append(from.wrapper, to.wrapper, read);
    const actions = el('div', 'crypt-lord-sequence__actions'), start = number('起始序号', 1); start.input.min = '1';
    const commands = [
      button('全部重排', 'fa-arrow-down-1-9', () => void mutate({ type: 'renumber', start: Number(start.input.value) })),
      button('智能修复', 'fa-wand-magic-sparkles', () => void mutate({ type: 'smart' })),
      button('修复严重问题', 'fa-triangle-exclamation', () => void mutate({ type: 'critical' })),
      button('恢复原始', 'fa-rotate-left', () => void restore()),
    ];
    actions.append(start.wrapper, ...commands);
    const body = el('div', 'crypt-lord-sequence__body');
    fieldset.append(range, actions, body); main.append(recovery, fieldset); panel.append(header, status, main); doc().body.append(panel);
    Object.assign(state, { panel, status, main, fieldset, recovery, retry, inspect,
      from: from.input, to: to.input, start: start.input, body, commands });
    const invalidate = () => {
      if (!live() || state.busy) return;
      if (state.pending) { state.status.textContent = '楼层发生变化，保留本次结果，需核对保存'; render(); return; }
      state.token++; state.session++; state.loaded = null; state.undo = null;
      state.status.textContent = '楼层已变化，请重新读取'; render();
    };
    for (const input of [from.input, to.input]) input.addEventListener('input', () => {
      if (state.undo && !doc().defaultView.confirm('改变范围将结束本次恢复原始会话，继续？')) {
        from.input.value = state.loaded.range.from; to.input.value = state.loaded.range.to; return;
      }
      state.session++; state.loaded = null; state.undo = null; state.status.textContent = '范围已改变，等待分析'; render();
    });
    const events = after.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      state.generating = false; close(true);
    }));
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED,
      events?.CHARACTER_MESSAGE_RENDERED, events?.USER_MESSAGE_RENDERED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(name, invalidate));
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.dryRun ||
        options?.options?.quiet_prompt || options?.options?.dryRun) return;
      state.generating = true; state.stale = true; state.token++; state.session++; state.busy = false;
      if (!state.pending) { state.loaded = null; state.undo = null; }
      if (panel.dataset.open === 'true') { status.textContent = '生成开始，序号操作已取消；请在结束后重新读取核对'; render(); }
    }));
    for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(name, () => {
        if (!state.generating) return;
        state.generating = false;
        if (panel.dataset.open === 'true') { status.textContent = '生成已结束，请重新读取核对'; render(); }
      }));
    const ownerWindow = doc().defaultView;
    for (const name of ['cryptLord:message-edited', 'cryptLord:variables-updated']) {
      ownerWindow.addEventListener(name, invalidate);
      state.subscriptions.push({ stop: () => ownerWindow.removeEventListener(name, invalidate) });
    }
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),summary')]
        .filter(node => node.getClientRects().length && (!node.checkVisibility || node.checkVisibility()));
      if (event.shiftKey && [panel, nodes[0]].includes(doc().activeElement)) { event.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!event.shiftKey && doc().activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    });
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      const view = doc().defaultView;
      panel.style.left = `${Math.max(8, Math.min(view.innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(view.innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    for (const name of ['pointerup', 'pointercancel']) header.addEventListener(name, () => { drag = null; });
    return true;
  }
  function render() {
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.fieldset.disabled = state.busy || Boolean(state.pending) || state.generating || state.stale;
    const phase = state.pending?.transaction.status();
    state.recovery.hidden = !state.pending;
    state.retry.hidden = phase !== 'pending'; state.inspect.hidden = phase !== 'uncertain';
    state.retry.disabled = state.inspect.disabled = state.busy || state.generating || state.stale;
    const loaded = state.loaded, editable = loaded?.editable;
    state.commands[0].disabled = state.commands[1].disabled = !editable || !loaded.events.length;
    state.commands[2].disabled = !editable || !loaded.events.some(row => ['critical', 'high'].includes(row.problem?.severity));
    state.commands[3].disabled = !editable || !state.undo;
    const scroll = state.main.scrollTop, previous = new Map();
    const preserve = state.rendered === loaded;
    for (const section of state.body.querySelectorAll('[data-floor]')) {
      previous.set(`floor:${section.dataset.floor}`, section.open);
      for (const item of section.querySelectorAll('[data-index]'))
        previous.set(`event:${item.dataset.index}`, { value: item.querySelector('input')?.value, open: item.querySelector('details')?.open });
    }
    state.rendered = loaded; state.body.replaceChildren();
    if (!loaded) { state.body.append(el('p', '', '尚未分析经历')); return; }
    for (const group of loaded.groups) {
      const section = el('details', 'crypt-lord-sequence__floor'); section.dataset.floor = group.messageId;
      section.open = previous.get(`floor:${group.messageId}`) ?? Boolean(group.error || group.events.some(row => row.problem));
      section.append(el('summary', '', `原生楼层 #${group.messageId} · ${group.events.length} 条经历`));
      if (group.error) section.append(el('p', 'is-error', group.error));
      if (!group.events.length && !group.error) section.append(el('p', '', '无经历'));
      for (const row of group.events) {
        const item = el('article', 'crypt-lord-sequence__event'); item.dataset.index = row.index;
        const info = el('div', 'crypt-lord-sequence__info');
        info.append(el('strong', '', `${row.serial || '空序号'} · ${row.title}`), el('small', '', row.date));
        if (row.problem) info.append(el('p', `is-${row.problem.severity}`, row.problem.message));
        const draft = previous.get(`event:${row.index}`);
        const detail = el('details'); detail.open = Boolean(draft?.open);
        detail.append(el('summary', '', '经历原文'), el('pre', '', row.text)); info.append(detail);
        const controls = el('div', 'crypt-lord-sequence__edit'), input = number(`序号 ${row.index + 1}`, row.serial);
        input.input.min = '1'; input.input.disabled = !editable;
        if (preserve && draft) input.input.value = draft.value;
        const apply = button('应用序号', 'fa-check', () => void mutate({ type: 'single', index: row.index, value: Number(input.input.value) }));
        apply.disabled = !editable; controls.append(input.wrapper, apply);
        if (row.problem) {
          const adopt = button(`采纳 ${row.problem.suggested}`, 'fa-arrow-turn-up',
            () => void mutate({ type: 'single', index: row.index, value: row.problem.suggested }));
          adopt.disabled = !editable; controls.append(adopt);
        }
        item.append(info, controls); section.append(item);
      }
      state.body.append(section);
    }
    if (!loaded.groups.length) state.body.append(el('p', '', '所选范围没有 assistant 楼层'));
    state.main.scrollTop = scroll;
  }
  async function operate(action) {
    if (state.busy || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; state.busy = true; state.status.textContent = '处理中...'; render();
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) {
        if (!state.pending) { state.loaded = null; state.undo = null; }
        state.status.textContent = error.message || String(error);
      }
    } finally { if (active(token)) { state.busy = false; render(); } }
  }
  async function reload(initial = false) {
    if (state.busy || state.generating || !live() || !discard() ||
      state.undo && !doc().defaultView.confirm('重新读取将结束本次恢复原始会话，继续？')) return;
    state.session++; state.pending = null; state.stale = false;
    return operate(async guard => {
      state.loaded = null; state.undo = null;
      const loaded = await service.load(initial ? undefined : { from: Number(state.from.value), to: Number(state.to.value) }, guard);
      if (!guard()) return;
      state.loaded = loaded; state.from.value = loaded.range.from; state.to.value = loaded.range.to;
      state.status.textContent = `${loaded.groups.length} 个楼层 · ${loaded.events.length} 条经历 · ${loaded.problems} 个问题${loaded.reason ? ` · ${loaded.reason}` : ''}`;
    });
  }
  async function mutate(operation) {
    if (state.busy || !state.loaded?.editable) return;
    return operate(async guard => {
      const ticket = await service.prepare(state.loaded, operation, guard);
      if (!guard()) return;
      if (!ticket.changes.length) { state.status.textContent = '无须修改'; return; }
      const zero = ticket.rows.some(row => row.message_id === 0) ? '包含开场 #0。' : '';
      const lines = ticket.changes.slice(0, 8).map(row => `#${row.messageId}: ${row.serial || '空'} → ${row.value}`).join('\n');
      if (!doc().defaultView.confirm(`${zero}修改 ${ticket.rows.length} 个真实楼层的 ${ticket.changes.length} 个序号？\n${lines}${ticket.changes.length > 8 ? '\n...' : ''}`) || !guard()) {
        if (guard()) state.status.textContent = '已取消，未提交'; return;
      }
      const session = state.session;
      state.pending = { transaction: service.beginCommit(ticket, state.undo, () => live(session)), restoring: false };
      await finish(await state.pending.transaction.save(), guard);
    });
  }
  async function restore() {
    if (state.busy || !state.undo || !state.loaded?.editable) return;
    if (!doc().defaultView.confirm('恢复本窗口会话开始时的经历序号？正文和变量的其他内容保持不变。')) return;
    return operate(async guard => {
      const session = state.session;
      state.pending = { transaction: service.beginRestore(state.undo, () => live(session)), restoring: true };
      await finish(await state.pending.transaction.save(), guard);
    });
  }
  async function finish(result, guard) {
    if (!guard()) return;
    const restoring = state.pending.restoring; state.pending = null;
    state.loaded = result.loaded; state.undo = result.undo;
    state.status.textContent = result.warning || (restoring ? '已恢复原始序号' : `已保存 · ${result.changed} 个序号 · ${result.floors} 个楼层`);
    const ownerWindow = doc().defaultView;
    try {
      for (const messageId of result.messageIds || []) {
        if (!guard()) return;
        ownerWindow.dispatchEvent(new ownerWindow.CustomEvent('cryptLord:message-edited', { detail: { messageId } }));
      }
    } catch (error) { console.warn('序号已确认保存，变更通知失败', error); }
    if (!guard()) return;
    try { await modules['cryptLord.gameShell']?.refresh?.(); }
    catch (error) { console.warn('序号已确认保存，面板刷新失败', error); }
  }
  async function recover(inspect) {
    if (!state.pending || state.stale || state.generating) return;
    return operate(async guard => {
      const transaction = state.pending.transaction;
      await finish(await (inspect ? transaction.inspect() : transaction.save()), guard);
    });
  }
  async function open() {
    if (!mount()) return false;
    if (state.panel.dataset.open === 'true') { state.panel.focus(); return true; }
    state.focus = doc().activeElement; state.panel.dataset.open = 'true';
    if (!live()) return false;
    state.panel.focus(); await reload(true); return true;
  }
  const api = Object.freeze({ status: () => ({ ready: !state.disposed }), mount, open, close, reload,
    dispose() {
      close(true); state.disposed = true; state.subscriptions.forEach(item => item?.stop()); state.panel?.remove();
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
