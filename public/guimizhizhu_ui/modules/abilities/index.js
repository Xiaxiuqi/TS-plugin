(() => {
  'use strict';
  const KEY = 'cryptLord.abilitiesUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.abilityState'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('序列能力界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const empty = () => ({ name: '', description: '', abilityType: '非凡能力' });
  const state = { panel: null, token: 0, disposed: false, busy: false, messageId: null, loaded: null,
    draft: empty(), sourceId: null, stale: false, focus: null, subscriptions: [], folded: new Set(),
    session: 0, pending: null, generating: false };
  const doc = () => after.getHost()?.document || document;
  const el = (tag, cls = '', text) => {
    const node = doc().createElement(tag); node.className = cls;
    if (text !== undefined) node.textContent = text; return node;
  };
  const dirty = () => Boolean(state.draft.name || state.draft.description);
  const current = () => !state.disposed && modules[KEY] === api && modules['cryptLord.abilityState'] === service &&
    modules['cryptLord.afterNativeHost'] === after && state.panel?.ownerDocument === doc() && state.panel?.dataset.open === 'true';
  const active = token => current() && token === state.token;
  const sessionGuard = () => { const session = state.session; return () => current() && session === state.session && !state.generating; };
  function button(label, icon, action, compact = false) {
    const node = el('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = el('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true'); node.append(symbol);
    if (compact && ['fa-xmark', 'fa-rotate-right'].includes(icon)) node.dataset.symbol = icon === 'fa-xmark' ? '\u00d7' : '\u21bb';
    if (!compact) node.append(el('span', '', label));
    node.addEventListener('click', action); return node;
  }
  function close(force = false) {
    if (!force && state.pending && !doc().defaultView.confirm('关闭将放弃本次待保存结果；若已发出保存，请再次打开后核对实际楼层。确定关闭？')) return;
    state.token++; state.session++; state.pending = null; state.busy = false; state.panel?.setAttribute('data-open', 'false');
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return true;
    const panel = el('section', 'crypt-lord-abilities'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '序列能力');
    const header = el('header'), tools = el('div', 'crypt-lord-abilities__tools');
    tools.append(button('重新读取', 'fa-rotate-right', () => void reload(true), true), button('关闭', 'fa-xmark', () => close(), true));
    header.append(el('strong', '', '序列能力'), tools);
    const status = el('p', 'crypt-lord-abilities__status'); status.setAttribute('role', 'status');
    const recovery = el('div', 'crypt-lord-abilities__recovery'), main = el('main'), fieldset = el('fieldset');
    main.append(fieldset); panel.append(header, status, recovery, main);
    doc().body.append(panel); Object.assign(state, { panel, status, main, fieldset, recovery });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')]
        .filter(node => !node.matches(':disabled') && node.getClientRects().length && node.checkVisibility());
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && [first, panel].includes(doc().activeElement)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && [last, panel].includes(doc().activeElement)) { event.preventDefault(); first.focus(); }
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
    const events = after.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      close(true); state.loaded = null; state.messageId = null; state.sourceId = null; state.draft = empty(); state.folded.clear(); state.generating = false;
    }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt || dryRun || options?.dryRun) return;
      state.generating = true; state.session++; state.token++; state.busy = false; state.stale = true;
      if (state.panel.dataset.open === 'true') { state.status.textContent = '正在生成，已取消旧操作；草稿保留，请结束后重新读取'; render(); }
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(event, () => { state.generating = false; if (state.panel.dataset.open === 'true') render(); }));
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED, events?.CHARACTER_MESSAGE_RENDERED].filter(Boolean))) {
      state.subscriptions.push(after.bindEvent(name, () => {
        if (state.panel.dataset.open !== 'true' || state.busy) return;
        state.stale = true; state.status.textContent = '楼层已更新，请重新读取'; render();
      }));
    }
    return true;
  }
  function render() {
    const scroll = state.main.scrollTop;
    state.recovery.replaceChildren();
    const pending = state.pending, phase = pending?.transaction.status();
    if (pending) {
      const retry = button(phase === 'uncertain' ? '核对保存' : '重试保存', phase === 'uncertain' ? 'fa-magnifying-glass' : 'fa-floppy-disk',
        () => void recover());
      retry.disabled = state.busy || state.stale || !['pending', 'uncertain'].includes(phase);
      state.recovery.append(retry, button('放弃结果并重新读取', 'fa-rotate-right', () => void reload(true)));
      state.recovery.lastChild.disabled = state.busy || state.generating;
    }
    state.panel.querySelector('header [aria-label="重新读取"]').disabled = state.busy || state.generating;
    state.fieldset.replaceChildren(); state.fieldset.disabled = state.busy || Boolean(pending) || state.generating;
    if (!state.loaded) { state.fieldset.append(el('p', '', '尚未读取能力')); return; }
    const loaded = state.loaded, editable = loaded.editable && !state.stale;
    const toolbar = el('div', 'crypt-lord-abilities__toolbar'), lockLabel = el('label'), lock = el('input');
    lock.type = 'checkbox'; lock.checked = loaded.locked; lock.disabled = !editable;
    lock.setAttribute('aria-label', '仅同步当前序列能力');
    lock.title = '开启后不再补充低序列能力，已获得的能力仍保留';
    lock.addEventListener('change', () => void mutate({ type: 'lock', locked: lock.checked }));
    lockLabel.append(lock, el('span', '', '仅同步当前序列能力'));
    const sync = button('世界书同步', 'fa-arrows-rotate', () => void mutate({ type: 'sync' }));
    sync.title = '补充新能力与缺失棋盘字段，不覆盖已有修改';
    const hasSequence = loaded.sequence.trim() && !loaded.sequence.includes('普通人');
    sync.disabled = !editable || !hasSequence;
    const cleanup = button('清理异常', 'fa-broom', () => void mutate({ type: 'cleanup' }));
    cleanup.disabled = !editable || !loaded.groups.some(group => !group.managed && group.entries.some(row => row.invalid));
    toolbar.append(lockLabel, sync, cleanup); state.fieldset.append(toolbar);
    if (hasSequence) {
      const form = el('form', 'crypt-lord-abilities__form'); form.dataset.manualForm = '';
      form.append(el('h3', '', `手动添加 · ${loaded.sequence}`));
      for (const [key, label, tag] of [['name', '能力名称', 'input'], ['description', '能力描述', 'textarea']]) {
        const field = el('label'), input = el(tag); input.value = state.draft[key]; input.disabled = !editable;
        input.setAttribute('aria-label', label); if (key === 'name') input.required = true;
        if (tag === 'textarea') input.rows = 3;
        input.addEventListener('input', () => { state.draft[key] = input.value; });
        field.append(el('span', '', label), input); form.append(field);
      }
      const actions = el('div', 'crypt-lord-abilities__form-actions'), type = el('select');
      type.setAttribute('aria-label', '能力类型'); type.disabled = !editable;
      for (const value of ['非凡能力', '被动特性', '神之权柄', '旧日象征']) {
        const option = el('option', '', value); option.value = value; type.append(option);
      }
      type.value = state.draft.abilityType; type.addEventListener('change', () => { state.draft.abilityType = type.value; });
      const add = button('添加能力', 'fa-plus', () => {}); add.type = 'submit'; add.disabled = !editable;
      actions.append(type, add); form.append(actions);
      form.addEventListener('submit', event => { event.preventDefault(); void mutate({ type: 'add', ...state.draft }); });
      state.fieldset.append(form);
    }
    let total = 0;
    for (const group of loaded.groups) {
      if (!group.entries.length) continue;
      total += group.entries.length;
      const section = el('details', 'crypt-lord-abilities__group'); section.open = !state.folded.has(group.group);
      section.dataset.group = group.group;
      section.append(el('summary', '', `${group.group} · ${group.entries.length}`));
      section.addEventListener('toggle', () => {
        if (section.open) state.folded.delete(group.group); else state.folded.add(group.group);
      });
      for (const row of group.entries) {
        const item = el('article', 'crypt-lord-abilities__item'); item.dataset.index = row.index;
        const info = el('div', 'crypt-lord-abilities__info');
        info.append(el('strong', '', row.name), el('small', '', row.type), el('p', '', row.description || '无详细描述。'));
        const fields = Object.entries(row.raw && typeof row.raw === 'object' ? row.raw : {}).filter(([key]) =>
          !['名称', '描述', '类型', '$meta', '__proto__', 'constructor', 'prototype'].includes(key));
        if (fields.length) {
          const detail = el('details', 'crypt-lord-abilities__fields'), list = el('dl');
          detail.append(el('summary', '', '战斗字段'));
          for (const [key, value] of fields) list.append(el('dt', '', key), el('dd', '',
            typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)));
          detail.append(list); info.append(detail);
        }
        item.append(info);
        if (group.managed) item.append(el('span', 'crypt-lord-abilities__managed', `${group.managed}管理`));
        else {
          const remove = button(`删除 ${row.name}`, 'fa-trash-can', () => void mutate({ type: 'remove', ...row.selection }), true);
          remove.disabled = !editable; remove.classList.add('is-danger'); item.append(remove);
        }
        section.append(item);
      }
      state.fieldset.append(section);
    }
    if (!total) state.fieldset.append(el('p', '', '尚未获得任何序列能力。'));
    state.main.scrollTop = scroll;
  }
  async function operate(action) {
    if (state.busy || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; state.busy = true; render(); state.status.textContent = '处理中...';
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) {
        const phase = state.pending?.transaction.status();
        if (phase === 'failed') state.pending = null;
        if (phase === 'invalid') state.stale = true;
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
    if (state.busy || state.generating || (discard || state.pending) && (dirty() || state.pending) &&
      !doc().defaultView.confirm('放弃尚未添加的能力和待保存结果并重新读取？保存状态不明时将读取实际楼层。')) return;
    if (discard) state.draft = empty();
    state.session++; state.pending = null;
    return operate(async guard => {
      state.loaded = null; state.stale = false; render();
      const loaded = await service.project(await service.load(state.messageId, guard), guard);
      if (!guard()) return;
      if (state.sourceId !== null && state.sourceId !== loaded.floor.message_id) { state.draft = empty(); state.folded.clear(); }
      state.sourceId = loaded.floor.message_id;
      state.loaded = loaded;
      state.status.textContent = `#${loaded.floor.message_id} · ${loaded.groups.reduce((count, row) => count + row.entries.length, 0)} 项${loaded.reason ? ` · ${loaded.reason}` : ''}${loaded.warning ? ` · ${loaded.warning}` : ''}`;
    });
  }
  async function mutate(action) {
    if (state.busy || state.pending || !state.loaded?.editable || state.stale) return;
    const baseline = state.loaded, operation = structuredClone(action), token = state.token;
    if (action.type === 'remove' && !doc().defaultView.confirm(`确定删除「${action.name || '异常条目'}」？世界书同步可能重新补回默认能力。`)) return;
    if (action.type === 'cleanup' && !doc().defaultView.confirm('清理普通能力分组中的空白和非对象条目？专属系统记录保持不变。')) return;
    if (!active(token)) return;
    return operate(async guard => {
      const transaction = service.begin(baseline, operation, sessionGuard());
      const finish = async (result, guard) => {
        state.pending = null;
        state.loaded = result.loaded;
        if (action.type === 'add') state.draft = empty();
        state.status.textContent = result.warning || (result.unchanged ? '没有需要保存的变化' :
          action.type === 'sync' ? `同步完成 · 新增 ${result.added} 项 · 补齐 ${result.patched} 个字段` :
          action.type === 'lock' ? (action.locked ? '已锁定 · 仅同步当前序列' : '已解锁 · 同步当前及低序列') :
          action.type === 'cleanup' ? `已清理 ${result.removed} 项异常条目` : action.type === 'add' ? '能力已添加' : '能力已删除');
        if (result.unchanged) return;
        try { modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
          messageId: baseline.floor.message_id, beforeData: baseline.floor.data, afterData: result.data, source: `abilities-${action.type}`,
        }); } catch (error) { console.warn('能力已保存，变量面板通知失败', error); }
        for (const refresh of [
          () => modules['cryptLord.gameShell']?.refresh?.(),
          () => modules['cryptLord.nativeFloorStatusBar']?.refresh?.(baseline.floor.message_id),
        ]) {
          try { await refresh(); } catch (error) { console.warn('能力已保存，面板刷新失败', error); }
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
    if (state.panel.dataset.open === 'true' && (state.messageId === messageId || state.busy || state.pending)) {
      state.panel.focus(); return state.messageId === messageId;
    }
    if (messageId !== state.messageId && dirty() && !doc().defaultView.confirm('放弃当前能力草稿并切换楼层？')) return false;
    if (messageId !== state.messageId) { state.draft = empty(); state.folded.clear(); }
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.messageId = messageId; state.panel.dataset.open = 'true'; state.panel.focus(); render();
    if (state.generating) state.status.textContent = '正在生成，请结束后重新读取';
    await reload(); return true;
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
