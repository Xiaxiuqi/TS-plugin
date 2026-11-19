(() => {
  'use strict';
  const KEY = 'cryptLord.relationshipsUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.relationshipState'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('人物关系界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { panel: null, token: 0, disposed: false, busy: false, messageId: null, sourceId: null,
    loaded: null, stale: false, batch: false, selected: new Set(), expanded: new Set(), truth: new Set(),
    subscriptions: [], focus: null, generating: false, session: 0, pending: null };
  const doc = () => after.getHost()?.document || document;
  function el(tag, cls = '', text) {
    const node = doc().createElement(tag); node.className = cls;
    if (text !== undefined) node.textContent = text; return node;
  }
  const text = value => typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
  const current = () => !state.disposed && modules[KEY] === api && modules['cryptLord.relationshipState'] === service &&
    modules['cryptLord.afterNativeHost'] === after && state.panel?.ownerDocument === doc() && state.panel?.dataset.open === 'true';
  const active = token => current() && token === state.token;
  const sessionGuard = () => { const session = state.session; return () => current() && session === state.session && !state.generating; };
  function button(label, icon, action, compact = false) {
    const node = el('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = el('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true'); node.append(symbol);
    if (!compact) node.append(el('span', '', label));
    node.addEventListener('click', action); return node;
  }
  function clearSelection() { state.selected.clear(); }
  function reset() { clearSelection(); state.expanded.clear(); state.truth.clear(); state.batch = false; }
  function close(force = false) {
    if (!force && state.pending && !doc().defaultView.confirm('关闭将放弃本次待保存结果；若已发出保存，请重新打开后核对实际楼层。确定关闭？')) return;
    state.token++; state.session++; state.pending = null; state.busy = false; state.panel?.setAttribute('data-open', 'false');
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return true;
    const panel = el('section', 'crypt-lord-relationships'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '人物关系');
    const header = el('header'), tools = el('div', 'crypt-lord-relationships__tools');
    const refresh = button('重新读取', 'fa-rotate-right', () => void reload(true), true);
    const exit = button('关闭', 'fa-xmark', () => close(), true);
    refresh.dataset.symbol = '\u21bb'; exit.dataset.symbol = '\u00d7'; tools.append(refresh, exit);
    header.append(el('strong', '', '人物关系'), tools);
    const status = el('p', 'crypt-lord-relationships__status'); status.setAttribute('role', 'status');
    const recovery = el('div', 'crypt-lord-relationships__recovery');
    const main = el('main'), fieldset = el('fieldset'); main.append(fieldset); panel.append(header, status, recovery, main);
    doc().body.append(panel); Object.assign(state, { panel, refresh, status, recovery, main, fieldset });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button, input, summary')]
        .filter(node => !node.matches(':disabled') && node.getClientRects().length && node.checkVisibility());
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && [last, panel].includes(doc().activeElement)) {
        event.preventDefault(); first?.focus();
      }
    });
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
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
    const events = after.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      state.generating = false; close(true); state.loaded = null; state.messageId = null; state.sourceId = null; reset();
    }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt || options?.dryRun || dryRun) return;
      state.generating = true; state.session++; state.token++; state.busy = false; state.stale = true;
      if (state.panel.dataset.open === 'true') { state.status.textContent = '正文生成中，暂不可修改'; render(); }
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
      state.subscriptions.push(after.bindEvent(event, () => {
        state.generating = false;
        if (state.panel.dataset.open === 'true' && state.stale) { state.status.textContent = '来源已变化，请重新读取'; render(); }
      }));
    }
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED,
      events?.MESSAGE_SENT, events?.MESSAGE_RECEIVED, events?.CHARACTER_MESSAGE_RENDERED].filter(Boolean))) {
      state.subscriptions.push(after.bindEvent(name, () => {
        if (state.panel.dataset.open !== 'true' || state.busy) return;
        state.stale = true; state.status.textContent = '楼层已更新，请重新读取'; render();
      }));
    }
    return true;
  }
  function fields(parent, values) {
    if (!values.length) return;
    const list = el('dl');
    for (const [label, value] of values) list.append(el('dt', '', label), el('dd', '', text(value)));
    parent.append(list);
  }
  function remember(details, set, key) {
    details.open = set.has(key);
    details.addEventListener('toggle', () => {
      if (!details.isConnected) return;
      if (details.open) set.add(key); else set.delete(key);
    });
  }
  function render() {
    const scroll = state.main.scrollTop;
    state.recovery.replaceChildren();
    const pending = state.pending, phase = pending?.transaction.status();
    if (pending) {
      const retry = button(phase === 'uncertain' ? '核对保存' : '重试保存',
        phase === 'uncertain' ? 'fa-magnifying-glass' : 'fa-floppy-disk', () => void recover());
      retry.disabled = state.busy || state.stale || state.generating || !['pending', 'uncertain'].includes(phase);
      const discard = button('放弃结果并重新读取', 'fa-rotate-right', () => void reload(true));
      discard.disabled = state.busy || state.generating; state.recovery.append(retry, discard);
    }
    state.fieldset.replaceChildren(); state.fieldset.disabled = state.busy || state.generating || Boolean(pending);
    state.refresh.disabled = state.busy || state.generating;
    if (!state.loaded) { state.fieldset.append(el('p', '', '尚未读取人物关系')); return; }
    const loaded = state.loaded, editable = loaded.editable && !state.stale && !state.generating;
    const entries = state.batch ? loaded.allEntries : loaded.entries;
    const keys = new Set(entries.map(row => row.key));
    for (const key of state.selected) if (!keys.has(key)) state.selected.delete(key);
    const toolbar = el('div', 'crypt-lord-relationships__toolbar');
    const batch = button(state.batch ? '退出批量' : '批量管理', 'fa-list-check', () => {
      state.batch = !state.batch; clearSelection(); render();
    });
    batch.setAttribute('aria-pressed', String(state.batch)); toolbar.append(batch);
    toolbar.append(el('span', 'crypt-lord-relationships__count',
      `${loaded.entries.length} 位已知人物${state.batch ? ` · ${loaded.allEntries.length - loaded.entries.length} 位仅客观记录` : ''}`));
    state.fieldset.append(toolbar);
    if (state.batch) {
      const bar = el('div', 'crypt-lord-relationships__batch'), label = el('label'), all = el('input');
      all.type = 'checkbox'; all.setAttribute('aria-label', '全选人物'); all.disabled = !editable || !entries.length;
      all.checked = entries.length > 0 && state.selected.size === entries.length;
      all.indeterminate = state.selected.size > 0 && !all.checked;
      all.addEventListener('change', () => {
        clearSelection(); if (all.checked) entries.forEach(row => state.selected.add(row.key)); render();
      });
      label.append(all, el('span', '', '全选')); bar.append(label);
      bar.append(el('span', '', `已选 ${state.selected.size} 人`));
      const remove = button('删除选中', 'fa-trash-can', () => void mutate({
        type: 'remove', entries: entries.filter(row => state.selected.has(row.key)),
      }));
      remove.classList.add('is-danger'); remove.disabled = !editable || !state.selected.size;
      bar.append(remove); state.fieldset.append(bar);
    }
    if (!entries.length) state.fieldset.append(el('p', 'crypt-lord-relationships__empty', '暂无人物记录'));
    for (const entry of entries) {
      const row = el('article', 'crypt-lord-relationships__row'); row.dataset.key = entry.key;
      row.classList.toggle('is-important', entry.important); row.classList.toggle('is-orphan', entry.orphan);
      const heading = el('div', 'crypt-lord-relationships__heading');
      if (state.batch) {
        const check = el('input'); check.type = 'checkbox'; check.disabled = !editable;
        check.setAttribute('aria-label', `选择 ${entry.name}`); check.checked = state.selected.has(entry.key);
        check.addEventListener('change', () => {
          if (check.checked) state.selected.add(entry.key); else state.selected.delete(entry.key); render();
        });
        heading.append(check);
      }
      const details = el('details', 'crypt-lord-relationships__detail'); remember(details, state.expanded, entry.key);
      const summary = el('summary'), title = el('div', 'crypt-lord-relationships__title');
      title.append(el('strong', '', entry.name), el('span', '', entry.orphan ? '仅客观记录' : entry.relationship));
      summary.append(title);
      if (!entry.orphan) summary.append(el('small', '', `好感度 ${entry.favorability}`));
      details.append(summary);
      const body = el('div', 'crypt-lord-relationships__body');
      if (!entry.orphan) {
        fields(body, entry.subjective);
        const meter = el('div', 'crypt-lord-relationships__meter');
        const fill = el('span'); fill.style.width = `${Math.max(0, Math.min(100, entry.favorability / 2))}%`;
        meter.append(fill); body.append(meter);
      }
      const objective = entry.objective;
      if (objective) {
        const truth = el('details', 'crypt-lord-relationships__truth'); remember(truth, state.truth, entry.key);
        truth.append(el('summary', '', objective.legacy ? '旧档资料' : '真实信息 · 上帝视角'));
        fields(truth, [['真名', entry.key], ['真实序列', objective.sequence], ...objective.stats,
          ...objective.statuses, ...objective.fields]);
        if (objective.abilities.length) {
          truth.append(el('h3', '', '真实能力'));
          const list = el('ul'); for (const ability of objective.abilities) list.append(el('li', '', ability));
          truth.append(list);
        }
        body.append(truth);
      }
      details.append(body); heading.append(details);
      const actions = el('div', 'crypt-lord-relationships__actions');
      const mark = button(`${entry.important ? '取消' : '标记'} ${entry.name} 的重要标记`, 'fa-star', () =>
        void mutate({ type: 'important', entry }), true);
      mark.setAttribute('aria-pressed', String(entry.important)); mark.disabled = !editable;
      const remove = button(`删除 ${entry.name}`, 'fa-trash-can', () =>
        void mutate({ type: 'remove', entries: [entry] }), true);
      remove.classList.add('is-danger'); remove.disabled = !editable;
      actions.append(mark, remove); heading.append(actions); row.append(heading); state.fieldset.append(row);
    }
    state.main.scrollTop = scroll;
  }
  async function operate(action) {
    if (state.busy || state.generating || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; state.busy = true; state.fieldset.disabled = true;
    state.refresh.disabled = true; state.status.textContent = '处理中...';
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) {
        const phase = state.pending?.transaction.status();
        if (phase === 'failed') state.pending = null;
        if (phase === 'invalid' || /重新读取|取消/.test(error.message)) state.stale = true;
        state.status.textContent = `${['pending', 'uncertain', 'invalid'].includes(phase) ? '' : '未提交：'}${error.message || error}`;
      }
    }
    finally {
      if (token === state.token && state.panel?.dataset.open === 'true') {
        state.busy = false;
        if (!current()) { state.stale = true; state.status.textContent = '宿主或管理服务已变化，请重新加载界面'; }
        render();
      }
    }
  }
  async function reload(discard = false) {
    if (state.generating) { state.status.textContent = '正文生成中，暂不可修改'; render(); return false; }
    if (state.busy || (discard || state.pending) && (state.selected.size || state.pending) &&
      !doc().defaultView.confirm('放弃当前勾选和待保存结果并重新读取？保存状态不明时将读取实际楼层。')) return;
    state.session++; state.pending = null;
    const previous = state.loaded, scroll = state.main.scrollTop;
    return operate(async guard => {
      state.loaded = null; state.stale = false; render();
      const loaded = await service.load(state.messageId, guard);
      if (!guard()) return;
      const changedSource = state.sourceId !== null && state.sourceId !== loaded.floor.message_id;
      if (changedSource) reset();
      else if (discard || !previous || previous.revision !== loaded.revision) clearSelection();
      state.sourceId = loaded.floor.message_id; state.loaded = loaded;
      state.status.textContent = `#${loaded.floor.message_id} · ${loaded.entries.length} 位已知人物${loaded.reason ? ` · ${loaded.reason}` : ''}`;
      render(); state.main.scrollTop = changedSource ? 0 : scroll;
    });
  }
  async function mutate(action) {
    if (state.busy || state.pending || state.generating || !state.loaded?.editable || state.stale) return;
    const baseline = state.loaded, operation = structuredClone(action), token = state.token;
    if (action.type === 'remove') {
      if (!action.entries.length) return;
      const description = action.entries.length === 1 ? `人物「${action.entries[0].name}」` : `选中的 ${action.entries.length} 位人物`;
      const important = action.entries.some(row => row.important) ? '\n包含重要人物。' : '';
      if (!doc().defaultView.confirm(`确定删除${description}？将同时清除主观关系与客观记录，此操作不可恢复。${important}`)) return;
    }
    if (!active(token)) return;
    return operate(async guard => {
      const transaction = service.begin(baseline, operation, sessionGuard());
      const finish = async (result, guard) => {
        state.pending = null; state.loaded = result.loaded;
        if (action.type === 'remove') { clearSelection(); state.batch = false; }
        state.status.textContent = result.warning || (action.type === 'remove' ?
          `已删除 ${action.entries.length} 位人物` : '重要标记已保存');
        try { modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
          messageId: baseline.floor.message_id, beforeData: baseline.floor.data, afterData: result.data,
          source: `relationship-${action.type}`,
        }); } catch (error) { console.warn('人物关系已保存，变量面板通知失败', error); }
        for (const refresh of [
          () => modules['cryptLord.gameShell']?.refresh?.(),
          () => modules['cryptLord.nativeFloorStatusBar']?.refresh?.(baseline.floor.message_id),
        ]) {
          try { await refresh(); } catch (error) { console.warn('人物关系已保存，面板刷新失败', error); }
          if (!guard()) return;
        }
      };
      state.pending = { transaction, finish }; render();
      const result = await transaction.run(); if (guard()) await finish(result, guard);
    });
  }
  async function recover() {
    const pending = state.pending;
    if (!pending || state.stale || state.generating) return;
    return operate(async guard => {
      const result = await (pending.transaction.status() === 'uncertain' ? pending.transaction.inspect() : pending.transaction.save());
      if (guard()) await pending.finish(result, guard);
    });
  }
  async function open(messageId = null) {
    if (!mount() || messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) return false;
    if (state.panel.dataset.open === 'true' && (state.busy || state.pending)) { state.panel.focus(); return state.messageId === messageId; }
    if (state.panel.dataset.open === 'true' && state.messageId === messageId) { state.panel.focus(); return true; }
    if (messageId !== state.messageId) { reset(); state.loaded = null; }
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.messageId = messageId; state.panel.dataset.open = 'true'; state.panel.focus(); await reload(); return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: !state.disposed, open: state.panel?.dataset.open === 'true' }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(subscription => subscription?.stop());
      state.panel?.remove(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
