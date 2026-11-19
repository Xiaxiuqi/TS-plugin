(() => {
  'use strict';
  const KEY = 'cryptLord.customContentUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.customContent'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!service || !host) throw new Error('自建内容生成器依赖尚未加载');
  const state = {
    panel: null, body: null, form: null, result: null, presets: [], revision: null, books: [], entries: [],
    presetName: '', prompt: '', output: '', book: '', entryName: '', selectedUid: null,
    mode: 'append', config: null, token: 0, busy: false, disposed: false, subscriptions: [], generating: service.status().generating,
    request: 0, taskId: 0, targetReady: false, lastPrompt: '', reload: null, focusReturn: null, keydown: null,
  };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && state.token === token &&
    modules[KEY] === api && modules['cryptLord.customContent'] === service &&
    modules['cryptLord.afterNativeHost'] === host && state.panel.ownerDocument === doc();
  function element(tag, cls, text) {
    const node = doc().createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, action, title = label) {
    const node = element('button', '', label);
    node.type = 'button';
    node.title = title;
    node.addEventListener('click', action);
    return node;
  }
  function field(label, control) {
    const row = element('label', 'crypt-lord-custom__field');
    row.append(element('span', '', label), control);
    return row;
  }
  function option(select, value, label) {
    const node = element('option', '', label);
    node.value = value;
    select.append(node);
  }
  function message(text, error = false) {
    if (!state.result) return;
    state.result.textContent = text;
    state.result.dataset.error = String(error);
  }
  function close() {
    if (state.form?.isConnected) gather();
    state.token++;
    state.request++;
    state.taskId++;
    state.busy = false;
    if (state.form) state.form.disabled = state.generating;
    if (state.reload) state.reload.disabled = state.generating;
    if (state.panel) { state.panel.dataset.open = 'false'; state.panel.removeAttribute('aria-busy'); }
    if (state.focusReturn?.isConnected) state.focusReturn.focus();
  }
  const guard = token => () => { if (!active(token)) throw Error('窗口或聊天已变化，操作已取消'); };
  function mount() {
    if (state.disposed) return false;
    if (state.panel || !doc().body) return Boolean(state.panel);
    const panel = element('section', 'crypt-lord-custom');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '自建内容生成器');
    panel.tabIndex = -1;
    const header = element('header');
    const reload = button('↻', () => void open(), '重新读取');
    reload.setAttribute('aria-label', '重新读取');
    header.append(element('strong', '', '自建内容生成器'), reload, button('×', close, '关闭'));
    header.lastChild.setAttribute('aria-label', '关闭');
    const body = element('div', 'crypt-lord-custom__body');
    const result = element('div', 'crypt-lord-custom__result');
    result.setAttribute('role', 'status');
    panel.append(header, body, result);
    doc().body.append(panel);
    Object.assign(state, { panel, body, result, reload });
    state.keydown = event => {
      if (event.key === 'Escape' && panel.dataset.open === 'true' && panel.contains(doc().activeElement)) {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab' && panel.dataset.open === 'true' && panel.contains(doc().activeElement)) {
        const nodes = [...panel.querySelectorAll('button,input,select,textarea')]
          .filter(node => !node.disabled && !node.closest('fieldset:disabled') && node.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === panel)) { event.preventDefault(); first?.focus(); }
      }
    };
    doc().addEventListener('keydown', state.keydown);
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = host.tavernEvents();
    const bind = (name, fn) => { if (name) { const sub = host.bindEvent(name, fn); if (sub) state.subscriptions.push(sub); } };
    bind(events?.CHAT_CHANGED, () => {
      state.generating = false;
      close();
      state.prompt = ''; state.output = ''; state.lastPrompt = ''; state.presetName = '';
      state.book = ''; state.entryName = ''; state.entries = []; state.revision = null; state.targetReady = false;
    });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      if (state.form?.isConnected) gather();
      state.token++; state.taskId++; state.request++;
      state.generating = true; state.busy = false; state.targetReady = false; state.revision = null;
      if (state.form) state.form.disabled = true;
      state.reload.disabled = true;
      state.panel.removeAttribute('aria-busy');
      message('正文生成中，自建操作已暂停，草稿已保留。', true);
    });
    const ended = () => {
      state.generating = false;
      if (state.form) state.form.disabled = false;
      state.reload.disabled = false;
      if (state.panel.dataset.open === 'true') message('生成已结束，请重新读取后继续。', true);
    };
    bind(events?.GENERATION_ENDED, ended);
    bind(events?.GENERATION_STOPPED, ended);
    return true;
  }
  function selectedPreset() { return state.presets.find(item => item.name === state.presetName); }
  function selectPreset(item) {
    state.presetName = item?.name || '';
    state.prompt = item?.prompt || '';
    state.lastPrompt = '';
    const preset = item?.preset;
    state.config = null;
    if (preset) {
      state.book = String(preset.targetBook || '');
      state.entryName = String(preset.entryName || '');
      state.mode = preset.saveMode === 'overwrite' ? 'overwrite' : 'append';
      state.config = service.configOf(preset, state.entryName);
    }
    render();
  }
  function gather() {
    const find = key => state.body.querySelector(`[data-field="${key}"]`);
    if (find('prompt')) state.prompt = find('prompt').value;
    if (find('output')) state.output = find('output').value;
    state.book = find('book')?.value || '';
    state.entryName = find('entry')?.value === '__new__' ? find('new-name')?.value.trim() || '' : find('entry')?.selectedOptions?.[0]?.textContent || '';
    state.selectedUid = find('entry')?.value === '__new__' ? null : state.entries.find(item => String(item.uid) === find('entry')?.value)?.uid ?? null;
    state.mode = find('overwrite')?.checked ? 'overwrite' : 'append';
    state.config = {
      enabled: find('enabled')?.checked !== false,
      strategy: { type: find('selective')?.checked ? 'selective' : 'constant', keys: (find('keys')?.value || '').split(/[,，]/).map(key => key.trim()).filter(Boolean) },
      position: { type: find('position')?.value || 'before_character_definition', order: Number(find('order')?.value), depth: Number(find('depth')?.value) },
      recursion: { prevent_incoming: find('rec-in')?.checked !== false, prevent_outgoing: find('rec-out')?.checked !== false },
    };
  }
  async function task(work) {
    if (state.busy || state.generating) return;
    const token = state.token;
    const id = ++state.taskId;
    state.busy = true;
    if (state.form) state.form.disabled = true;
    state.reload.disabled = true;
    state.panel?.setAttribute('aria-busy', 'true');
    try { await work(token); }
    catch (error) {
      if (active(token)) {
        if (error.requiresReload) { state.targetReady = false; state.revision = null; }
        message(error?.message || String(error), true);
      }
    }
    finally {
      if (state.taskId === id) {
        state.busy = false;
        if (state.form) state.form.disabled = state.generating;
        state.reload.disabled = state.generating;
        state.panel?.removeAttribute('aria-busy');
      }
    }
  }
  async function refreshEntries(token) {
    const book = state.book;
    const request = ++state.request;
    state.targetReady = false;
    state.selectedUid = null;
    state.entries = [];
    const select = state.body.querySelector('[data-field="entry"]');
    if (select) { select.replaceChildren(); option(select, '__new__', '新建条目'); select.disabled = true; }
    if (!book) return false;
    try {
      const entries = await service.entriesFor(book, () => active(token) && request === state.request);
      if (!active(token) || state.book !== book || request !== state.request || !select.isConnected) return false;
      state.entries = entries;
      const names = new Map();
      const uids = new Map();
      state.entries.forEach(item => {
        const name = String(item.name || item.comment || '').trim();
        if (name) names.set(name, (names.get(name) || 0) + 1);
        if (item.comment && item.comment !== name) names.set(item.comment, (names.get(item.comment) || 0) + 1);
        uids.set(item.uid, (uids.get(item.uid) || 0) + 1);
      });
      select.replaceChildren();
      option(select, '__new__', '新建条目');
      state.entries.forEach(item => {
        const name = String(item.name || item.comment || '').trim();
        if (name && names.get(name) === 1 && item.uid != null && uids.get(item.uid) === 1 &&
          !(book === '【源堡】玩家自建内容' && ['[自建提示词]', '[生图提示词]', '[世界书开关方案]'].includes(name))) option(select, String(item.uid), name);
      });
      const selected = state.entries.find(item => String(item.name || item.comment || '').trim() === state.entryName &&
        [...select.options].some(opt => opt.value === String(item.uid)));
      const ambiguous = !selected && entries.some(item => String(item.name || item.comment || '').trim() === state.entryName || item.comment === state.entryName);
      select.value = selected ? String(selected.uid) : '__new__';
      select.disabled = Boolean(selectedPreset()?.locked);
      state.targetReady = !ambiguous;
      syncEntryFields();
      if (ambiguous) message('预设目标条目不可安全选择，请检查重名、UID 或系统配置条目', true);
      return !ambiguous;
    } catch (error) {
      if (active(token) && request === state.request) message(`读取目标世界书失败：${error?.message || error}`, true);
      return false;
    }
  }
  function syncEntryFields() {
    const isNew = state.body.querySelector('[data-field="entry"]')?.value === '__new__';
    state.body.querySelector('[data-new-config]')?.toggleAttribute('hidden', !isNew);
    const input = state.body.querySelector('[data-field="new-name"]');
    if (input) input.closest('.crypt-lord-custom__field').hidden = !isNew;
  }
  function render() {
    const body = element('fieldset', 'crypt-lord-custom__form');
    body.disabled = state.busy || state.generating;
    state.body.replaceChildren(body);
    state.form = body;
    const locked = Boolean(selectedPreset()?.locked);
    const section = (title) => {
      const node = element('section', 'crypt-lord-custom__section');
      node.append(element('h3', '', title));
      body.append(node);
      return node;
    };
    const source = section('提示词');
    const presetRow = element('div', 'crypt-lord-custom__row');
    const preset = element('select');
    preset.title = '预存提示词';
    option(preset, '', '选择预设');
    state.presets.forEach(item => option(preset, item.name, `${item.locked ? '锁定 · ' : ''}${item.name}`));
    preset.value = state.presetName;
    preset.addEventListener('change', () => { gather(); selectPreset(state.presets.find(item => item.name === preset.value)); });
    const remove = button('删除预设', () => void task(async token => {
      gather();
      const item = selectedPreset();
      if (!item || item.locked) throw new Error('请先选择可删除的预设');
      if (!win().confirm(`删除预设「${item.name}」？`)) return;
      const saved = await service.savePresets(state.presets.filter(value => value !== item), state.revision, guard(token));
      if (!active(token)) return;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.presetName = '';
      render();
      message(saved.warning || '预设已删除', Boolean(saved.warning));
    }));
    remove.disabled = !selectedPreset() || locked || !state.revision;
    presetRow.append(preset, remove);
    source.append(presetRow);
    const prompt = element('textarea');
    prompt.rows = 4;
    prompt.value = state.prompt;
    prompt.dataset.field = 'prompt';
    source.append(field('生成提示词', prompt));
    source.append(button('生成内容', () => void task(async token => {
      gather();
      message('正在生成…');
      const sentPrompt = state.prompt;
      const output = await service.generate(sentPrompt, guard(token));
      if (!active(token)) return;
      state.output = output;
      state.lastPrompt = sentPrompt;
      body.querySelector('[data-field="output"]').value = output;
      message('生成完成');
    })));
    const outputSection = section('生成结果');
    const output = element('textarea');
    output.rows = 6;
    output.value = state.output;
    output.dataset.field = 'output';
    output.setAttribute('aria-label', '生成结果');
    outputSection.append(output);
    const target = section('存入世界书');
    const book = element('select');
    book.dataset.field = 'book';
    option(book, '', '选择世界书');
    state.books.forEach(name => option(book, name, name));
    book.value = state.books.includes(state.book) ? state.book : '';
    book.disabled = locked;
    book.addEventListener('change', () => { gather(); state.book = book.value; state.entryName = ''; void refreshEntries(state.token); });
    target.append(field('目标世界书', book));
    const entry = element('select');
    entry.dataset.field = 'entry';
    option(entry, '__new__', '新建条目');
    entry.disabled = locked;
    entry.addEventListener('change', syncEntryFields);
    target.append(field('目标条目', entry));
    const newName = element('input');
    newName.dataset.field = 'new-name';
    newName.placeholder = '新建条目名称';
    newName.value = state.entryName;
    newName.disabled = locked;
    target.append(field('条目名称', newName));
    const mode = element('div', 'crypt-lord-custom__row');
    for (const [key, label] of [['append', '追加到末尾'], ['overwrite', '覆盖内容']]) {
      const radio = element('input');
      radio.type = 'radio';
      radio.name = 'crypt-lord-custom-mode';
      radio.dataset.field = key;
      radio.checked = state.mode === key;
      radio.disabled = locked;
      const control = element('label', 'crypt-lord-custom__check', label);
      control.prepend(radio);
      mode.append(control);
    }
    target.append(field('写入方式', mode));
    const newConfig = element('div', 'crypt-lord-custom__config');
    newConfig.dataset.newConfig = '';
    const config = state.config || service.configOf({}, state.entryName);
    const checkbox = (key, label, checked) => {
      const input = element('input');
      input.type = 'checkbox';
      input.dataset.field = key;
      input.checked = checked;
      input.disabled = locked;
      const control = element('label', 'crypt-lord-custom__check', label);
      control.prepend(input);
      return control;
    };
    newConfig.append(checkbox('enabled', '启用', config.enabled));
    const triggers = element('div', 'crypt-lord-custom__row');
    [['constant', '常驻'], ['selective', '关键词']].forEach(([key, label]) => {
      const input = element('input');
      input.type = 'radio';
      input.name = 'crypt-lord-custom-trigger';
      input.dataset.field = key;
      input.checked = config.strategy.type === key;
      input.disabled = locked;
      const control = element('label', 'crypt-lord-custom__check', label);
      control.prepend(input);
      triggers.append(control);
    });
    newConfig.append(field('触发方式', triggers));
    const keys = element('input');
    keys.dataset.field = 'keys';
    keys.placeholder = '关键词，逗号分隔';
    keys.value = config.strategy.keys.join(', ');
    keys.disabled = locked;
    newConfig.append(field('触发关键词', keys));
    const position = element('select');
    position.dataset.field = 'position';
    [['before_character_definition', '角色定义之前'], ['after_character_definition', '角色定义之后'], ['at_depth', '指定深度']].forEach(([value, label]) => option(position, value, label));
    position.value = config.position.type;
    position.disabled = locked;
    newConfig.append(field('插入位置', position));
    for (const [key, label, value] of [['order', '顺序', config.position.order], ['depth', '深度', config.position.depth ?? 0]]) {
      const input = element('input');
      input.type = 'number';
      input.dataset.field = key;
      input.value = String(value);
      input.disabled = locked;
      newConfig.append(field(label, input));
    }
    newConfig.append(checkbox('rec-in', '不被其他条目扫描', config.recursion.prevent_incoming),
      checkbox('rec-out', '不扫描其他条目', config.recursion.prevent_outgoing));
    target.append(newConfig);
    const actions = element('div', 'crypt-lord-custom__row');
    const savePreset = button('保存为预设', () => void task(async token => {
      gather();
      if (!state.revision) throw Error('请先重新读取预设库');
      if (!state.targetReady) throw Error('请先成功读取目标世界书');
      const name = win().prompt('预设名称', state.presetName || state.entryName || '');
      if (name === null) return;
      const trimmed = name.trim();
      if (!trimmed || !(state.lastPrompt || state.prompt).trim()) throw new Error('预设名称和提示词不能为空');
      const existing = state.presets.find(item => item.name === trimmed);
      if (existing?.locked) throw new Error('锁定预设不能覆盖');
      if (existing && !win().confirm(`覆盖预设「${trimmed}」？`)) return;
      const candidate = {
        name: trimmed, prompt: state.lastPrompt || state.prompt, locked,
        preset: {
          targetBook: state.book, entryName: state.entryName, saveMode: state.mode,
          ...service.configOf(state.config, state.entryName),
        },
      };
      const list = existing ? state.presets.map(item => item === existing ? candidate : item) : [...state.presets, candidate];
      const saved = await service.savePresets(list, state.revision, guard(token));
      if (!active(token)) return;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.presetName = trimmed;
      render();
      message(saved.warning || `预设「${trimmed}」已保存`, Boolean(saved.warning));
    }));
    savePreset.disabled = !state.revision;
    actions.append(savePreset, button('写入世界书', () => void task(async token => {
      gather();
      if (!state.targetReady) throw Error('请先成功读取目标世界书');
      if (state.selectedUid != null && state.mode === 'overwrite' &&
        !win().confirm(`覆盖「${state.entryName}」的现有正文？此操作不可撤销。`)) return;
      const expectedUid = state.selectedUid;
      const result = await service.write({
        book: state.book, name: state.entryName, content: state.output, mode: state.mode, source: state.entries,
        config: state.config, expectedUid,
        expectedEntry: state.selectedUid == null ? null : state.entries.find(item => item.uid === state.selectedUid),
        guard: guard(token),
      });
      if (!active(token)) return;
      state.entryName = result.name;
      const refreshed = await refreshEntries(token);
      if (active(token)) message(result.warning || (refreshed ?
        `已${result.created ? '新建' : '更新'}「${result.name}」` : '世界书已提交，但目标列表刷新失败，请重新读取'), Boolean(result.warning || !refreshed));
    })));
    target.append(actions);
    void refreshEntries(state.token);
  }
  async function open() {
    if (!mount()) return false;
    if (state.generating) { state.panel.dataset.open = 'true'; message('正文生成中，自建操作已暂停。', true); return false; }
    if (state.panel.dataset.open === 'true' && state.busy) return false;
    if (state.panel.dataset.open !== 'true') state.focusReturn = doc().activeElement;
    if (state.form?.isConnected) gather();
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    const id = ++state.taskId;
    state.busy = true;
    if (state.form) state.form.disabled = true;
    state.reload.disabled = true;
    state.panel.setAttribute('aria-busy', 'true');
    message('正在读取预设和世界书…');
    try {
      const [saved, names] = await Promise.all([service.loadPresets(guard(token)), service.books(guard(token))]);
      if (!active(token)) return false;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.books = names;
      if (state.presetName && !selectedPreset()) state.presetName = '';
      if (selectedPreset()?.locked) {
        const preset = selectedPreset().preset;
        if (preset) {
          state.book = String(preset.targetBook || '');
          state.entryName = String(preset.entryName || '');
          state.mode = preset.saveMode === 'overwrite' ? 'overwrite' : 'append';
          state.config = service.configOf(preset, state.entryName);
        }
      }
      if (!state.book) state.book = names.includes('【源堡】玩家自建内容') ? '【源堡】玩家自建内容' : names[0] || '';
      render();
      message('');
      return true;
    } catch (error) {
      if (active(token)) { state.targetReady = false; state.revision = null; message(`读取失败：${error?.message || error}`, true); }
      return false;
    } finally {
      if (state.taskId === id) {
        state.busy = false;
        if (state.form) state.form.disabled = false;
        state.reload.disabled = false;
        state.panel?.removeAttribute('aria-busy');
        if (active(token)) state.body.querySelector('[data-field="prompt"]')?.focus();
      }
    }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }); },
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(sub => sub.stop());
      doc().removeEventListener('keydown', state.keydown);
      state.panel?.remove();
      state.panel = null;
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
