(() => {
  'use strict';
  const KEY = 'cryptLord.currentCluesUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = root.__stage1Modules;
  const service = modules?.['cryptLord.currentClues'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('当前线索界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { panel: null, fieldset: null, token: 0, disposed: false, focus: null,
    messageId: null, loaded: null, source: null, draft: null, dirty: false, busy: false, pending: null,
    session: 0, generating: false, subscriptions: [] };
  const doc = () => state.surface?.document || after.getHost()?.document || document;
  function surfaceValid() {
    const surface = after.getHost();
    return surface?.document === state.surface?.document && surface?.window === state.surface?.window &&
      modules['cryptLord.currentClues'] === service && modules['cryptLord.afterNativeHost'] === after &&
      modules['cryptLord.hostApi'] === state.hostApi;
  }
  const element = (tag, className = '', text) => {
    const node = doc().createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const active = token => {
    if (state.disposed || state.token !== token || state.panel?.dataset.open !== 'true') return false;
    if (!surfaceValid()) { close(true); return false; }
    return true;
  };
  const quiet = (type, options, dryRun) => dryRun || ['quiet', 'quiet_prompt'].includes(type) ||
    options?.dryRun || options?.params?.dryRun || options?.quiet_prompt || options?.params?.quiet_prompt;
  function discard() {
    return !state.pending || doc().defaultView.confirm('放弃本次线索保存恢复？已提交的设置或线索不会撤销。');
  }
  function button(label, icon, action) {
    const node = element('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = element('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true');
    node.append(symbol, element('span', '', label)); node.addEventListener('click', action);
    return node;
  }
  function close(force = false) {
    if (force !== true && !discard()) return false;
    state.session++; state.pending = null;
    state.token++; state.busy = false; state.panel?.setAttribute('data-open', 'false');
    if (state.fieldset) state.fieldset.disabled = false;
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
    return true;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return true;
    state.surface = after.getHost(); state.hostApi = modules['cryptLord.hostApi'];
    const panel = element('section', 'crypt-lord-current-clues');
    panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '当前线索');
    const header = element('header'), tools = element('div', 'crypt-lord-current-clues__tools');
    tools.append(button('重新读取', 'fa-rotate-right', () => void reload(true)),
      button('关闭', 'fa-xmark', close));
    header.append(element('strong', '', '当前线索'), tools);
    state.status = element('p', 'crypt-lord-current-clues__status'); state.status.setAttribute('role', 'status');
    state.recover = button('重试线索保存', 'fa-rotate-right', () => void recover());
    state.recover.hidden = true;
    const body = element('main'), fieldset = element('fieldset');
    const settings = element('div', 'crypt-lord-current-clues__settings');
    const autoLabel = element('label'), automatic = element('input'); automatic.type = 'checkbox';
    automatic.setAttribute('aria-label', '回合结束自动归档线索');
    autoLabel.append(automatic, element('span', '', '自动归档'));
    const indexLabel = element('label'), index = element('input'); index.type = 'number'; index.min = '1'; index.step = '1';
    index.setAttribute('aria-label', '线索条目索引'); indexLabel.append(element('span', '', '条目索引'), index);
    automatic.addEventListener('change', () => { if (state.draft) { state.draft.automatic = automatic.checked; state.dirty = true; } });
    index.addEventListener('input', () => { if (state.draft) { state.draft.index = Number(index.value); state.dirty = true; } });
    settings.append(autoLabel, indexLabel, button('保存设置', 'fa-floppy-disk', () => void saveSettings()));
    const sourceHeader = element('div', 'crypt-lord-current-clues__heading');
    state.sourceLabel = element('strong', '', '楼层线索');
    sourceHeader.append(state.sourceLabel, button('归档至世界书', 'fa-book', () => void save()));
    state.sourceText = element('pre');
    const targetHeader = element('div', 'crypt-lord-current-clues__heading');
    state.targetLabel = element('strong', '', '世界书线索');
    targetHeader.append(state.targetLabel, button('复制已存线索', 'fa-copy', () => void copy()));
    state.targetText = element('pre');
    fieldset.append(settings, sourceHeader, state.sourceText, targetHeader, state.targetText);
    body.append(fieldset); panel.append(header, state.status, state.recover, body); doc().body.append(panel);
    Object.assign(state, { panel, fieldset, automatic, index });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button,input')].filter(node =>
        !node.matches(':disabled') && node.getClientRects().length && node.checkVisibility());
      if (event.shiftKey && [panel, nodes[0]].includes(doc().activeElement)) { event.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!event.shiftKey && doc().activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    });
    let drag = null;
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
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { close(true); state.draft = null; state.dirty = false; state.loaded = null; state.source = null; state.generating = false; }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (quiet(type, options, dryRun)) return;
      state.session++; state.pending = null;
      state.generating = true; state.token++; state.busy = false; state.loaded = null; state.source = null;
      state.status.textContent = '正文生成中，设置草稿保留；结束后重新读取'; render();
    }));
    for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(name, (type, options, dryRun) => {
        if (quiet(type, options, dryRun)) return;
        state.generating = false;
        if (panel.dataset.open === 'true' && !state.loaded) state.status.textContent = '生成已结束，请重新读取；设置草稿保留';
        render();
      }));
    return true;
  }
  function render() {
    state.fieldset.disabled = state.busy || state.generating || Boolean(state.pending);
    const phase = state.pending?.transaction.status().phase;
    state.recover.hidden = !state.pending;
    state.recover.disabled = state.busy || state.generating || phase === 'conflict';
    const label = phase === 'uncertain' ? '核对线索保存' : '重试线索保存';
    state.recover.title = label; state.recover.setAttribute('aria-label', label);
    state.recover.querySelector('span').textContent = phase === 'uncertain' ? '核对保存' : '重试保存';
    state.automatic.checked = state.draft?.automatic === true;
    state.index.value = state.draft?.index ?? 1;
    state.sourceLabel.textContent = state.source ? `#${state.source.floor.message_id} · 楼层线索` : '楼层线索';
    state.sourceText.textContent = state.source?.content || '本楼层没有当前线索标签';
    state.targetLabel.textContent = state.loaded?.name ? `${state.loaded.book} · ${state.loaded.name}` : '世界书线索';
    state.targetText.textContent = state.loaded?.content || '尚未归档线索';
    state.fieldset.querySelector('[aria-label="归档至世界书"]').disabled =
      !state.source?.content || !state.loaded?.revision;
    state.fieldset.querySelector('[aria-label="保存设置"]').disabled = !state.loaded?.revision;
    state.fieldset.querySelector('[aria-label="复制已存线索"]').disabled = !state.loaded?.content;
  }
  async function operate(action) {
    if (state.busy || state.generating || !state.panel || state.panel.dataset.open !== 'true') return false;
    const token = ++state.token; state.busy = true; state.fieldset.disabled = true;
    state.status.textContent = '处理中...';
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) state.status.textContent =
        `${state.pending?.transaction.status().phase === 'uncertain' ? '保存待核对' : '未提交'}：${error.message || error}`;
    }
    finally {
      if (active(token)) { state.busy = false; state.fieldset.disabled = false; render(); }
    }
    return true;
  }
  async function reload(discard = false) {
    if (state.busy) return false;
    if (state.pending && !doc().defaultView.confirm('放弃本次线索保存恢复并重新读取？已提交的数据不会撤销。')) return false;
    if (discard && state.dirty &&
      !doc().defaultView.confirm('放弃未保存的线索设置并重新读取？')) return false;
    const oldDraft = !discard && state.dirty ? state.draft : null;
    state.session++; state.pending = null;
    if (discard) state.dirty = false;
    return operate(async guard => {
      state.loaded = null; state.source = null; render();
      const loaded = await service.load(guard);
      let source = null, sourceError = '';
      try { source = await service.readFloor(state.messageId, guard); }
      catch (error) { if (!guard()) throw error; sourceError = error.message; }
      if (!guard()) return;
      state.loaded = loaded; state.source = source; state.draft = oldDraft || structuredClone(loaded.config);
      state.status.textContent = source ? `#${source.floor.message_id} · ${loaded.name}${loaded.target?.enabled ? ' · 世界书条目已启用' : ''}` :
        `${loaded.name} · ${sourceError}`;
    });
  }
  async function saveSettings() {
    if (!state.loaded?.revision || state.busy || state.pending) return;
    const session = state.session;
    return operate(async guard => {
      state.pending = { kind: 'config', transaction: service.beginConfig(state.draft, state.loaded.revision,
        () => active(state.token) && session === state.session) };
      await finish(guard);
    });
  }
  async function save() {
    if (!state.loaded?.revision || !state.source?.content || state.busy || state.pending) return;
    const baseline = state.loaded, source = state.source;
    const token = state.token;
    if (!doc().defaultView.confirm(`将 #${source.floor.message_id} 的线索覆盖归档到「${baseline.name}」？`)) return;
    if (!active(token)) return;
    const session = state.session;
    return operate(async guard => {
      state.pending = { kind: 'archive', transaction: service.begin(source, baseline,
        () => active(state.token) && session === state.session) };
      await finish(guard);
    });
  }
  async function finish(guard, inspect = false) {
    const pending = state.pending, transaction = pending.transaction;
    const result = await transaction[inspect ? 'inspect' : 'save']();
    if (!guard()) return;
    if (transaction.status().phase !== 'saved') { state.status.textContent = result.warning; return; }
    state.pending = null; state.loaded = result;
    if (pending.kind === 'config') { state.draft = structuredClone(result.config); state.dirty = false; }
    state.status.textContent = result.warning || (pending.kind === 'config' ? '设置已保存' :
      result.unchanged ? '线索已归档，内容未变化' : '线索已归档');
  }
  async function recover() {
    if (!state.pending || state.busy || state.generating) return false;
    return operate(guard => finish(guard, state.pending.transaction.status().phase === 'uncertain'));
  }
  async function copy() {
    const token = state.token;
    try {
      await doc().defaultView.navigator.clipboard.writeText(state.loaded?.content || '');
      if (active(token)) state.status.textContent = '已复制线索';
    } catch { if (active(token)) state.status.textContent = '复制失败，请重试'; }
  }
  async function open(messageId = null) {
    if (!mount()) return false;
    if (!surfaceValid()) { close(true); return false; }
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) return false;
    if (state.panel.dataset.open === 'true' && (messageId === state.messageId || messageId === null)) {
      state.panel.focus(); return true;
    }
    if (state.panel.dataset.open === 'true' && state.busy) return false;
    if (!discard()) return false;
    state.session++; state.pending = null;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.messageId = messageId; state.panel.dataset.open = 'true'; state.panel.focus();
    await reload(); return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(item => item?.stop()); state.panel?.remove();
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
