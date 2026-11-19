(() => {
  'use strict';
  const KEY = 'cryptLord.nativeFloorEditorUi', EDITOR_KEY = 'cryptLord.nativeEditor';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract, modules = root.__stage1Modules;
  const host = modules?.['cryptLord.afterNativeHost'];
  const editor = modules?.[EDITOR_KEY], surface = host?.getHost();
  if (!contract || !host || !editor) throw Error('剧情编辑宿主或核心尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { mask: null, panel: null, loaded: null, messageId: null, baseText: '', mode: 'sections',
    busy: false, generating: false, stale: false, syncStale: false, token: 0, session: 0, pending: null,
    disposed: false, focus: null, cleanups: [], position: { x: 0, y: 0 },
    document: surface?.document || document, window: surface?.window || window };
  const doc = () => state.document, view = () => state.window;
  const service = () => editor;
  const field = name => state.panel.querySelector(`[data-editor-${name}]`);
  function validSurface() {
    const current = host.getHost();
    if (modules[KEY] !== api || modules[EDITOR_KEY] !== editor || modules['cryptLord.afterNativeHost'] !== host ||
      current?.document !== state.document || current?.window !== state.window) { close(true); return false; }
    return !state.disposed;
  }
  const active = token => validSurface() && state.token === token && state.mask?.dataset.open === 'true';
  const alive = session => validSurface() && state.session === session && state.mask?.dataset.open === 'true';
  const blocked = () => state.busy || state.generating || state.stale || Boolean(state.pending) || !state.loaded?.editable;
  function element(tag, className, text) {
    const item = doc().createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function button(name, icon, handler, text = '') {
    const item = element('button'); item.type = 'button'; item.title = name; item.setAttribute('aria-label', name);
    item.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    if (text) item.append(element('span', '', text));
    item.addEventListener('click', handler); return item;
  }
  function status(text) { if (state.panel) field('status').textContent = text; }
  function draft() {
    return { narrative: field('narrative').value, automatic: field('automatic').value,
      journey: [...field('journey').querySelectorAll('[data-editor-row]')].map(row => ({
        key: row.querySelector('input').value, value: row.querySelector('textarea').value,
      })) };
  }
  function text() { return state.mode === 'raw' ? field('raw').value : service().compose(state.baseText, draft()); }
  function dirty() {
    if (!state.loaded) return false;
    try { return text() !== state.loaded.message; } catch { return true; }
  }
  function controls() {
    if (!state.panel) return;
    state.panel.setAttribute('aria-busy', String(state.busy));
    field('fields').disabled = blocked();
    field('save').disabled = blocked() || !dirty();
    field('reload').disabled = state.busy || state.generating;
    field('reset').disabled = blocked() || !dirty();
    field('sync').disabled = blocked() || dirty() || state.syncStale || !state.loaded?.sections.hasJourney;
    field('index').disabled = blocked() || state.syncStale || !state.loaded?.sections.hasJourney;
    field('dirty').textContent = dirty() ? '未保存' : '';
    const phase = state.pending?.transaction.status().phase;
    field('recovery').hidden = !state.pending;
    field('retry').hidden = phase !== 'pending'; field('inspect').hidden = phase !== 'uncertain';
    field('retry').disabled = field('inspect').disabled = state.busy || state.generating || state.stale;
    state.panel.querySelector('[data-editor-mode="sections"]').disabled = state.busy || Boolean(state.pending) || state.generating || state.stale ||
      !service().sections(state.mode === 'raw' ? field('raw').value : state.baseText).available;
    state.panel.querySelector('[data-editor-mode="raw"]').disabled = state.busy || Boolean(state.pending) || state.generating || state.stale;
  }
  function resizeTextarea(item) {
    const scroll = field('scroll').scrollTop;
    item.style.height = 'auto'; item.style.height = `${Math.max(item.closest('[data-editor-row]') ? 44 : 68, item.scrollHeight + 2)}px`;
    field('scroll').scrollTop = scroll;
  }
  function fitTextareas() {
    field('scroll').querySelectorAll('textarea:not([data-editor-raw])').forEach(item => { if (item.getClientRects().length) resizeTextarea(item); });
  }
  function row(item) {
    const wrapper = element('div', 'crypt-lord-native-editor-row'); wrapper.dataset.editorRow = '';
    const key = element('input'); key.type = 'text'; key.value = item.key; key.setAttribute('aria-label', '经历字段名');
    const value = element('textarea'); value.rows = 1; value.value = item.value; value.spellcheck = false; value.setAttribute('aria-label', `经历内容 ${item.key || '续行'}`);
    const remove = button(`删除经历字段 ${item.key || '续行'}`, 'trash-can', () => {
      if (blocked() || !view().confirm(`删除经历字段「${key.value || '续行'}」？`)) return;
      wrapper.remove(); controls(); status('经历草稿已修改。');
    });
    remove.className = 'is-danger'; wrapper.append(key, value, remove); return wrapper;
  }
  function fillSections(source) {
    const parts = service().sections(source);
    field('narrative').value = parts.narrative; field('automatic').value = parts.automatic;
    field('automatic-panel').hidden = !parts.hasAutomatic;
    field('journey-panel').hidden = !parts.hasJourney;
    field('journey').replaceChildren(...parts.journey.map(row));
    return parts;
  }
  function setMode(next) {
    if (state.busy || state.generating || state.pending || state.stale || !validSurface()) return false;
    try {
      const current = state.loaded ? text() : state.baseText;
      const parts = service().sections(current);
      if (next === 'sections' && !parts.available) { status(parts.reason); return false; }
      state.baseText = current; field('raw').value = current; fillSections(current);
      state.mode = next;
      field('sections').hidden = next !== 'sections'; field('raw-panel').hidden = next !== 'raw';
      state.panel.querySelectorAll('[data-editor-mode]').forEach(item => item.setAttribute('aria-selected', String(item.dataset.editorMode === next)));
      controls(); fitTextareas(); return true;
    } catch (error) { status(error.message); return false; }
  }
  function accept(loaded) {
    const scroll = field('scroll').scrollTop;
    state.loaded = loaded; state.messageId = loaded.messageId; state.baseText = loaded.message;
    state.stale = false; state.syncStale = false;
    field('target').textContent = `#${loaded.messageId}`;
    field('raw').value = loaded.message; fillSections(loaded.message);
    const mode = loaded.sections.available ? state.mode : 'raw';
    state.mode = mode; field('sections').hidden = mode !== 'sections'; field('raw-panel').hidden = mode !== 'raw';
    state.panel.querySelectorAll('[data-editor-mode]').forEach(item => item.setAttribute('aria-selected', String(item.dataset.editorMode === mode)));
    controls(); fitTextareas(); field('scroll').scrollTop = scroll;
  }
  async function reload() {
    if (state.busy || state.generating || !active(state.token) || !discard()) return false;
    if (dirty() && !view().confirm('放弃未保存的正文草稿，重新读取？')) return false;
    const token = ++state.token; state.session++; state.pending = null;
    state.busy = true; controls(); status('正在读取原生楼层...');
    try {
      const loaded = await service().open(state.messageId, () => active(token));
      if (!active(token)) return false;
      accept(loaded); status(loaded.reason || (loaded.sections.available ? '原生楼层已读取。' : loaded.sections.reason)); return true;
    } catch (error) { if (active(token)) { state.stale = true; status(`读取失败：${error.message}`); } return false; }
    finally { if (active(token)) { state.busy = false; controls(); } }
  }
  async function operation(run, complete, recovering = false) {
    if (!active(state.token) || (recovering ? state.busy || state.generating || state.stale || !state.pending : blocked())) return false;
    const token = ++state.token; state.busy = true; controls();
    try {
      const result = await run(() => active(token));
      if (!active(token)) return false;
      if (result !== null) await complete(result, () => active(token));
      return result !== null;
    } catch (error) {
      if (active(token)) { if (/楼层.*变化|来源.*失效/.test(error.message)) state.stale = true; status(`操作失败：${error.message}`); }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  function save() {
    let value;
    try { value = text(); } catch (error) { status(error.message); return Promise.resolve(false); }
    return operation(() => {
      const session = state.session;
      state.pending = { kind: 'text', transaction: service().begin(state.loaded, value, () => alive(session)) };
      return state.pending.transaction.save();
    }, finish);
  }
  function sync() {
    if (dirty() || state.syncStale) { status('正文有未保存修改或同步尚未复核。'); return Promise.resolve(false); }
    const index = Number(field('index').value);
    return operation(async guard => {
      const ticket = await service().prepareSync(state.loaded, index, guard);
      if (!guard() || !view().confirm(`将原生楼层 #${state.messageId} 的经历 #${ticket.serials.join('、')} 同步至「${ticket.name}」？`)) return null;
      const session = state.session;
      state.pending = { kind: 'sync', transaction: service().beginSync(ticket, () => alive(session)) };
      return state.pending.transaction.save();
    }, finish);
  }
  async function finish(result, guard) {
    if (!guard()) return;
    if (state.pending.transaction.status().phase !== 'saved') {
      status(result.warning || '保存尚未确认，请核对或重试本次结果。'); return;
    }
    const kind = state.pending.kind; state.pending = null;
    if (kind === 'sync') {
      status(result.warning || (result.unchanged ? `「${result.name}」无变化，未写入。` : `经历已同步至「${result.name}」。`)); return;
    }
    accept(result.loaded); status(result.warning || (result.unchanged ? '正文没有变化，未写入。' : '正文已保存到原生楼层。'));
    if (result.unchanged) return;
    const messageId = state.messageId;
    try { view().dispatchEvent(new (view().CustomEvent)('cryptLord:message-edited', { detail: { messageId } })); }
    catch (error) { console.warn('正文已确认保存，变更通知失败', error); }
    for (const key of ['cryptLord.gameShell', 'cryptLord.nativeFloorStatusBar']) {
      if (!guard()) return;
      try { await modules[key]?.refresh?.(messageId); } catch (error) { console.warn('正文已保存，界面刷新失败', error); }
    }
  }
  function recover(inspect) {
    return operation(() => inspect ? state.pending.transaction.inspect() : state.pending.transaction.save(), finish, true);
  }
  function discard() {
    return !state.pending || view().confirm('放弃本次待保存或待核对的结果？已经写入的正文或经历不会撤销。');
  }
  function close(force = false) {
    if (!force && !discard()) return false;
    if (state.pending) state.stale = true;
    state.token++; state.session++; state.busy = false; state.pending = null;
    if (state.mask) { state.mask.dataset.open = 'false'; controls(); }
    if (state.focus?.isConnected && !state.panel?.contains(state.focus)) state.focus.focus();
    return true;
  }
  async function open(messageId = null) {
    if (!mount() || !validSurface()) return false;
    if (state.mask.dataset.open === 'true' && (messageId == null || messageId === state.messageId)) { state.panel.focus(); return true; }
    if (!discard()) return false;
    if (state.loaded && messageId != null && messageId !== state.messageId && dirty() &&
      !view().confirm('放弃旧楼层草稿，切换编辑楼层？')) return false;
    const preserve = state.loaded && (messageId == null || messageId === state.messageId) && dirty();
    state.focus = doc().activeElement; state.token++; state.session++; state.pending = null;
    state.mask.dataset.open = 'true'; state.panel.focus();
    if (preserve) { controls(); return true; }
    state.messageId = messageId ?? null; state.loaded = null; state.baseText = ''; return reload();
  }
  async function openData(messageId) {
    if (!mount() || !validSurface()) return false;
    const token = state.token;
    const editor = await contract.waitGlobalInitialized('cryptLord.variableWorkbench', { timeoutMs: 10000 });
    if (!validSurface() || state.token !== token) return false;
    return editor.open(messageId);
  }
  function mount() {
    if (state.disposed || state.mask) return Boolean(state.mask);
    if (!doc().body) return false;
    const mask = element('div', 'crypt-lord-native-editor-mask'), panel = element('section', 'crypt-lord-native-editor-dialog');
    mask.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '剧情文本编辑器');
    panel.innerHTML = '<header><strong>剧情文本编辑器</strong><span data-editor-target></span><div data-editor-header-tools></div></header><nav role="tablist" data-editor-tabs></nav><div class="crypt-lord-native-editor-scroll" data-editor-scroll><fieldset data-editor-fields><section data-editor-sections><label class="crypt-lord-native-editor-label">剧情正文<textarea aria-label="剧情正文" data-editor-narrative spellcheck="false"></textarea></label><details data-editor-automatic-panel><summary>自动化系统</summary><textarea aria-label="自动化系统" data-editor-automatic spellcheck="false"></textarea></details><details data-editor-journey-panel open><summary>本周目经历</summary><div data-editor-journey></div><div data-editor-journey-tools></div></details></section><section data-editor-raw-panel hidden><label class="crypt-lord-native-editor-label">完整原文<textarea aria-label="完整原文" data-editor-raw spellcheck="false"></textarea></label></section></fieldset></div><div class="crypt-lord-native-editor-sync"><label>经历条目索引<input type="number" min="1" step="1" value="1" aria-label="经历条目索引" data-editor-index></label><div data-editor-sync-tools></div></div><footer><span role="status" data-editor-status></span><span data-editor-dirty></span><div data-editor-footer-tools></div></footer>';
    state.mask = mask; state.panel = panel; mask.append(panel); doc().body.append(mask);
    const recovery = element('div', 'crypt-lord-native-editor-recovery'); recovery.dataset.editorRecovery = '';
    const retry = button('重试保存', 'floppy-disk', () => void recover(false), '重试保存'); retry.dataset.editorRetry = '';
    const inspect = button('核对保存', 'magnifying-glass', () => void recover(true), '核对保存'); inspect.dataset.editorInspect = '';
    recovery.append(retry, inspect); panel.insertBefore(recovery, panel.querySelector('footer'));
    field('header-tools').append(button('重新读取', 'rotate-right', () => void reload()), button('关闭', 'xmark', () => close()));
    field('header-tools').firstChild.dataset.editorReload = '';
    for (const [mode, label, icon] of [['sections', '剧情分区', 'list-tree'], ['raw', '完整原文', 'code']]) {
      const control = button(label, icon, () => setMode(mode), label); control.dataset.editorMode = mode;
      control.setAttribute('role', 'tab'); field('tabs').append(control);
    }
    field('journey-tools').append(button('新增经历字段', 'plus', () => {
      if (blocked()) return; const item = row({ key: '', value: '' }); field('journey').append(item);
      resizeTextarea(item.querySelector('textarea')); item.querySelector('input').focus(); controls();
    }, '新增字段'));
    const synchronize = button('同步本周目经历', 'book', () => void sync(), '同步经历');
    synchronize.dataset.editorSync = ''; field('sync-tools').append(synchronize);
    const reset = button('重置正文草稿', 'eraser', () => {
      if (blocked() || !view().confirm('放弃全部正文草稿修改？')) return;
      accept(state.loaded); status('正文草稿已重置，未写入。');
    });
    reset.dataset.editorReset = '';
    const saveButton = button('保存正文', 'floppy-disk', () => void save(), '保存');
    saveButton.dataset.editorSave = ''; saveButton.className = 'is-primary'; field('footer-tools').append(reset, saveButton);
    field('fields').addEventListener('input', event => {
      if (event.target.tagName === 'TEXTAREA' && event.target !== field('raw')) resizeTextarea(event.target);
      controls(); status('正文草稿已修改。');
    });
    panel.querySelectorAll('details').forEach(item => item.addEventListener('toggle', fitTextareas));
    mask.addEventListener('click', event => { if (event.target === mask) close(); });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const items = [...panel.querySelectorAll('button,input,textarea,summary')].filter(item =>
          !item.matches(':disabled') && item.getClientRects().length && (!item.checkVisibility || item.checkVisibility()));
        if (!items.length) { event.preventDefault(); return; }
        if (event.shiftKey && (doc().activeElement === items[0] || doc().activeElement === panel)) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && (doc().activeElement === items.at(-1) || doc().activeElement === panel)) { event.preventDefault(); items[0].focus(); }
      }
    });
    let drag = null;
    const header = panel.querySelector('header');
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: { ...state.position } };
      header.setPointerCapture(event.pointerId); event.preventDefault();
    });
    function clamp() {
      const before = { ...state.position }, rect = panel.getBoundingClientRect(), win = view();
      state.position.x += Math.max(8 - rect.left, Math.min(0, win.innerWidth - 8 - rect.right));
      state.position.y += Math.max(8 - rect.top, Math.min(0, win.innerHeight - 8 - rect.bottom));
      if (before.x !== state.position.x || before.y !== state.position.y)
        panel.style.transform = `translate(${state.position.x}px, ${state.position.y}px)`;
    }
    header.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      state.position = { x: drag.origin.x + event.clientX - drag.x, y: drag.origin.y + event.clientY - drag.y };
      panel.style.transform = `translate(${state.position.x}px, ${state.position.y}px)`; clamp();
    });
    for (const name of ['pointerup', 'pointercancel']) header.addEventListener(name, () => { drag = null; });
    const resize = () => { if (mask.dataset.open === 'true') { clamp(); fitTextareas(); } };
    const ownerWindow = view();
    ownerWindow.addEventListener('resize', resize); state.cleanups.push(() => ownerWindow.removeEventListener('resize', resize));
    const observer = new (ownerWindow.ResizeObserver)(() => { if (mask.dataset.open === 'true' && validSurface()) clamp(); });
    observer.observe(panel); state.cleanups.push(() => observer.disconnect());
    const changed = event => {
      if (state.loaded && Number(event.detail?.messageId) === state.messageId) {
        if (!validSurface()) return;
        if (state.pending) { status('楼层发生变化，本次结果已保留，请核对保存。'); controls(); return; }
        state.stale = true; controls(); status('楼层变量已变化，正文草稿已保留。');
      }
    };
    ownerWindow.addEventListener('cryptLord:variables-updated', changed);
    state.cleanups.push(() => ownerWindow.removeEventListener('cryptLord:variables-updated', changed));
    const events = host.tavernEvents() || {}, chat = events.CHAT_CHANGED;
    for (const [name, callback] of [
      ['GENERATION_STARTED', (type, options, dryRun) => {
        if (dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.dryRun ||
          options?.options?.quiet_prompt || options?.options?.dryRun) return;
        state.token++; state.session++; state.busy = false;
        state.generating = true; state.stale = true; controls(); status('原生生成已开始，正文草稿已保留。');
      }],
      ['GENERATION_ENDED', () => { if (state.generating) { state.generating = false; controls(); status('生成已结束，请重新读取核对；正文草稿已保留。'); } }],
      ['GENERATION_STOPPED', () => { if (state.generating) { state.generating = false; state.stale = true; controls(); status('生成已停止，请重新读取核对；正文草稿已保留。'); } }],
    ]) if (events[name]) {
      const subscription = host.bindEvent(events[name], callback);
      state.cleanups.push(() => subscription.stop());
    }
    if (chat) {
      const subscription = host.bindEvent(chat, () => {
        close(true); state.loaded = null; state.messageId = null; state.baseText = ''; state.generating = false; state.stale = false; state.syncStale = false;
        field('raw').value = ''; field('index').value = '1'; fillSections(''); controls();
      });
      state.cleanups.push(() => subscription.stop());
    }
    controls(); return true;
  }
  function unmount() {
    close(true); state.cleanups.splice(0).forEach(cleanup => cleanup()); state.mask?.remove();
    state.mask = null; state.panel = null; state.loaded = null; state.baseText = ''; return true;
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true',
    busy: state.busy, messageId: state.messageId }), mount, open, openData, close, reload, save, sync, unmount,
    dispose() { state.disposed = true; unmount(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true; } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
