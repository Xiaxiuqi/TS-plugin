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
  const BUILTINS = [
    ['魔药配方', '请生成一份《诡秘之主》原著风格的魔药配方：包含途径名称、对应序列等级、主材料、辅助材料与晋升仪式。'],
    ['封印物', '请生成一件《诡秘之主》原著风格的封印物：包含代号、途径与序列、外观、非凡能力、负面代价与收容方式。'],
    ['非凡者档案', '请生成一位非凡者档案：包含姓名、外貌、途径与序列、公开身份、隐秘立场、性格与核心能力。'],
    ['隐秘传闻', '请生成一段隐秘传闻：包含地点、异常表象、牵涉派系、危险与可供调查的初始线索。'],
  ];
  const state = {
    panel: null, body: null, result: null, presets: [], revision: '', books: [], entries: [],
    presetName: '', prompt: '', output: '', book: '', entryName: '', selectedUid: null,
    mode: 'append', config: null, token: 0, busy: false, disposed: false, subscription: null,
  };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && state.token === token;
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
  function close() { state.token++; if (state.panel) state.panel.dataset.open = 'false'; }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = element('section', 'crypt-lord-custom');
    panel.dataset.open = 'false';
    const header = element('header');
    header.append(element('strong', '', '自建内容生成器'), button('×', close, '关闭'));
    const body = element('div', 'crypt-lord-custom__body');
    const result = element('div', 'crypt-lord-custom__result');
    panel.append(header, body, result);
    doc().body.append(panel);
    Object.assign(state, { panel, body, result });
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
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  function selectedPreset() { return state.presets.find(item => item.name === state.presetName); }
  function selectPreset(item) {
    state.presetName = item?.name || '';
    state.prompt = item?.prompt || '';
    const preset = item?.preset;
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
    state.prompt = find('prompt')?.value || state.prompt;
    state.output = find('output')?.value || state.output;
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
    if (state.busy) return;
    const token = state.token;
    state.busy = true;
    state.panel?.setAttribute('aria-busy', 'true');
    try { await work(token); }
    catch (error) { if (active(token)) message(error?.message || String(error), true); }
    finally { state.busy = false; state.panel?.removeAttribute('aria-busy'); }
  }
  async function refreshEntries(token) {
    const book = state.book;
    state.entries = [];
    const select = state.body.querySelector('[data-field="entry"]');
    if (select) { select.replaceChildren(); option(select, '__new__', '新建条目'); select.disabled = true; }
    if (!book) return;
    try {
      const entries = await service.entriesFor(book);
      if (!active(token) || state.book !== book) return;
      state.entries = entries.filter(item => item.uid != null);
      const names = new Map();
      state.entries.forEach(item => {
        const name = String(item.name || item.comment || '').trim();
        if (name) names.set(name, (names.get(name) || 0) + 1);
      });
      select.replaceChildren();
      option(select, '__new__', '新建条目');
      state.entries.forEach(item => {
        const name = String(item.name || item.comment || '').trim();
        if (name && names.get(name) === 1) option(select, String(item.uid), name);
      });
      const selected = state.entries.find(item => String(item.name || item.comment || '').trim() === state.entryName && names.get(state.entryName) === 1);
      select.value = selected ? String(selected.uid) : '__new__';
      select.disabled = Boolean(selectedPreset()?.locked);
      syncEntryFields();
    } catch (error) { if (active(token)) message(`读取目标世界书失败：${error?.message || error}`, true); }
  }
  function syncEntryFields() {
    const isNew = state.body.querySelector('[data-field="entry"]')?.value === '__new__';
    state.body.querySelector('[data-new-config]')?.toggleAttribute('hidden', !isNew);
    const input = state.body.querySelector('[data-field="new-name"]');
    if (input) input.closest('.crypt-lord-custom__field').hidden = !isNew;
  }
  function render() {
    const body = state.body;
    body.replaceChildren();
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
    presetRow.append(preset, button('删除预设', () => void task(async token => {
      gather();
      const item = selectedPreset();
      if (!item || item.locked) throw new Error('请先选择可删除的预设');
      if (!win().confirm(`删除预设「${item.name}」？`)) return;
      const saved = await service.savePresets(state.presets.filter(value => value !== item), state.revision);
      if (!active(token)) return;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.presetName = '';
      render();
      message('预设已删除');
    })));
    source.append(presetRow);
    const builtins = element('div', 'crypt-lord-custom__row');
    BUILTINS.forEach(([name, text]) => builtins.append(button(name, () => {
      gather();
      state.presetName = '';
      state.prompt = text;
      state.config = null;
      render();
    })));
    source.append(builtins);
    const prompt = element('textarea');
    prompt.rows = 4;
    prompt.value = state.prompt;
    prompt.dataset.field = 'prompt';
    source.append(field('生成提示词', prompt));
    source.append(button('生成内容', () => void task(async token => {
      gather();
      message('正在生成…');
      const output = await service.generate(state.prompt);
      if (!active(token)) return;
      state.output = output;
      body.querySelector('[data-field="output"]').value = output;
      message('生成完成');
    })));
    const outputSection = section('生成结果');
    const output = element('textarea');
    output.rows = 6;
    output.value = state.output;
    output.dataset.field = 'output';
    outputSection.append(output, button('填入酒馆输入框', () => {
      gather();
      if (!state.output.trim()) return message('生成结果为空', true);
      try { modules['cryptLord.inputAdapter'].setInputText(state.output); message('已填入原生输入框，发送仍由酒馆处理'); }
      catch (error) { message(error?.message || String(error), true); }
    }));
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
    actions.append(button('保存为预设', () => void task(async token => {
      gather();
      const name = win().prompt('预设名称', state.presetName || state.entryName || '');
      if (name === null) return;
      const trimmed = name.trim();
      if (!trimmed || !state.prompt.trim()) throw new Error('预设名称和提示词不能为空');
      const existing = state.presets.find(item => item.name === trimmed);
      if (existing?.locked) throw new Error('锁定预设不能覆盖');
      if (existing && !win().confirm(`覆盖预设「${trimmed}」？`)) return;
      const candidate = {
        name: trimmed, prompt: state.prompt, locked: false,
        preset: {
          targetBook: state.book, entryName: state.entryName, saveMode: state.mode,
          ...service.configOf(state.config, state.entryName),
        },
      };
      const list = existing ? state.presets.map(item => item === existing ? candidate : item) : [...state.presets, candidate];
      const saved = await service.savePresets(list, state.revision);
      if (!active(token)) return;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.presetName = trimmed;
      render();
      message(`预设「${trimmed}」已保存`);
    })), button('写入世界书', () => void task(async token => {
      gather();
      if (state.selectedUid != null && state.mode === 'overwrite' &&
        !win().confirm(`覆盖「${state.entryName}」的现有正文？此操作不可撤销。`)) return;
      const expectedUid = state.selectedUid;
      const result = await service.write({
        book: state.book, name: state.entryName, content: state.output, mode: state.mode,
        config: state.config, expectedUid,
        guard: () => { if (!active(token)) throw new Error('聊天已切换，写入中断'); },
      });
      if (!active(token)) return;
      await refreshEntries(token);
      if (active(token)) message(`已${result.created ? '新建' : '更新'}「${result.name}」`);
    })));
    target.append(actions);
    void refreshEntries(state.token);
  }
  async function open() {
    if (!mount()) return false;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    message('正在读取预设和世界书…');
    try {
      const [saved, names] = await Promise.all([service.loadPresets(), service.books()]);
      if (!active(token)) return false;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.books = names;
      state.presetName = '';
      state.prompt = '';
      state.output = '';
      state.book = names.includes('【源堡】玩家自建内容') ? '【源堡】玩家自建内容' : names[0] || '';
      state.entryName = '';
      state.mode = 'append';
      state.config = null;
      render();
      message('');
      return true;
    } catch (error) { if (active(token)) message(`读取失败：${error?.message || error}`, true); return false; }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }); },
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscription?.stop();
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
