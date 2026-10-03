(() => {
  'use strict';
  const KEY = 'cryptLord.worldbookToggleProfilesUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.worldbookToggleProfiles'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!service || !host) throw new Error('世界书开关方案依赖尚未加载');
  const state = { panel: null, data: null, revision: '', selected: '', books: [], token: 0, busy: false, disposed: false, cleanups: [] };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, cls, text) => {
    const node = doc().createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const btn = (text, action, title) => {
    const node = el('button', '', text);
    node.type = 'button';
    if (title) node.title = title;
    node.addEventListener('click', action);
    return node;
  };
  const current = () => state.data?.profiles.find(profile => profile.id === state.selected);
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && token === state.token;
  function message(text, error = false) {
    const node = state.panel?.querySelector('[data-result]');
    if (node) { node.textContent = text; node.dataset.error = String(error); }
  }
  async function task(action) {
    if (state.busy) return;
    state.busy = true;
    state.panel?.setAttribute('aria-busy', 'true');
    const token = state.token;
    try { await action(token); }
    catch (error) { if (active(token)) message(error?.message || String(error), true); }
    finally { state.busy = false; state.panel?.removeAttribute('aria-busy'); }
  }
  function syncForm() {
    const profile = current();
    if (!profile) return;
    profile.name = state.panel.querySelector('[data-name]')?.value.trim() || '未命名方案';
    profile.note = state.panel.querySelector('[data-note]')?.value || '';
    profile.updatedAt = new Date().toISOString();
    state.data.activeId = profile.id;
  }
  function render() {
    const body = state.panel.querySelector('[data-body]');
    body.replaceChildren();
    const profile = current();
    if (!profile) return;
    const row = (cls, ...children) => { const node = el('div', cls); node.append(...children); return node; };
    const select = el('select');
    select.title = '选择方案';
    state.data.profiles.forEach(item => {
      const option = el('option', '', item.name);
      option.value = item.id;
      select.append(option);
    });
    select.value = profile.id;
    select.addEventListener('change', () => { syncForm(); state.selected = select.value; render(); });
    const create = (duplicate = false) => {
      syncForm();
      const source = current();
      const created = {
        id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: duplicate ? `${source.name} 副本` : `新方案 ${state.data.profiles.length + 1}`,
        note: duplicate ? source.note : '', updatedAt: new Date().toISOString(),
        entries: duplicate ? source.entries.map(entry => ({ ...entry })) : [],
      };
      state.data.profiles.push(created);
      state.selected = created.id;
      state.data.activeId = created.id;
      render();
    };
    body.append(row('wb-profiles__toolbar', select, btn('重新读取', () => {
      if (!win().confirm('放弃未保存的修改并重新读取？')) return;
      void open();
    }), btn('新建', () => create()), btn('另存', () => create(true)),
      btn('删除', () => {
        if (!win().confirm(`删除方案「${profile.name}」？保存后生效。`)) return;
        state.data.profiles = state.data.profiles.filter(item => item.id !== profile.id);
        if (!state.data.profiles.length) state.data.profiles = service.normalize({}).profiles;
        state.selected = state.data.profiles[0].id;
        state.data.activeId = state.selected;
        render();
      })));
    const name = el('input');
    name.value = profile.name;
    name.dataset.name = '';
    const note = el('textarea');
    note.value = profile.note;
    note.rows = 2;
    note.dataset.note = '';
    body.append(row('wb-profiles__field', el('label', '', '方案名称'), name),
      row('wb-profiles__field', el('label', '', '备注'), note));
    const bound = new Set(state.books);
    const hidden = [...new Set(profile.entries.filter(entry => !bound.has(entry.book)).map(entry => entry.book))];
    if (hidden.length) body.append(el('p', 'wb-profiles__warning', `未挂载书的条目已隐藏，配置保留：${hidden.join('、')}`));
    body.append(el('h3', '', '方案条目'));
    const list = el('div', 'wb-profiles__entries');
    profile.entries.forEach((entry, index) => {
      if (!bound.has(entry.book)) return;
      const check = el('input');
      check.type = 'checkbox';
      check.checked = entry.enabled;
      check.addEventListener('change', () => { entry.enabled = check.checked; profile.updatedAt = new Date().toISOString(); });
      const label = el('label', 'wb-profiles__switch', '开启');
      label.prepend(check);
      list.append(row('wb-profiles__entry', el('span', '', entry.book), el('strong', '', entry.name), label,
        btn('移除', () => { syncForm(); profile.entries.splice(index, 1); render(); })));
    });
    if (!list.childElementCount) list.append(el('p', 'wb-profiles__empty', '暂无可见条目'));
    body.append(list);
    const book = el('select');
    book.title = '选择已挂载世界书';
    const entry = el('select');
    entry.title = '选择条目';
    const placeholder = (selectNode, text) => { selectNode.replaceChildren(); const option = el('option', '', text); option.value = ''; selectNode.append(option); };
    placeholder(book, '选择世界书');
    placeholder(entry, '先选世界书');
    state.books.forEach(name => { const option = el('option', '', name); option.value = name; book.append(option); });
    book.addEventListener('change', () => {
      placeholder(entry, '加载中…');
      entry.disabled = true;
      const selectedBook = book.value;
      const token = state.token;
      if (!selectedBook) { placeholder(entry, '先选世界书'); return; }
      void service.entriesFor(selectedBook).then(entries => {
        if (!active(token) || book.value !== selectedBook) return;
        placeholder(entry, '选择条目');
        const counts = new Map();
        entries.forEach(item => { const name = String(item.name || item.comment || '').trim(); if (name) counts.set(name, (counts.get(name) || 0) + 1); });
        for (const [name, count] of counts) {
          if (count !== 1) continue;
          const option = el('option', '', name);
          option.value = name;
          entry.append(option);
        }
        entry.disabled = false;
      }).catch(error => { if (active(token)) message(`读取条目失败：${error?.message || error}`, true); });
    });
    const enabled = el('input');
    enabled.type = 'checkbox';
    enabled.checked = true;
    const enabledLabel = el('label', 'wb-profiles__switch', '目标开启');
    enabledLabel.prepend(enabled);
    body.append(row('wb-profiles__add', book, entry, enabledLabel, btn('添加', () => {
      if (!book.value || !entry.value) return message('请选择世界书和条目', true);
      syncForm();
      if (profile.entries.some(item => item.book === book.value && item.name === entry.value)) return message('条目已在方案中', true);
      profile.entries.push({ book: book.value, name: entry.value, enabled: enabled.checked });
      render();
    })));
    body.append(row('wb-profiles__actions',
      btn('保存方案', () => void task(async token => {
        syncForm();
        const saved = await service.save(state.data, state.revision);
        if (!active(token)) return;
        state.data = saved.data;
        state.revision = saved.revision;
        message('方案已保存');
        render();
      })),
      btn('应用此方案', () => void task(async token => {
        syncForm();
        if (!profile.entries.length) return message('方案没有条目', true);
        const checked = await service.validate(profile);
        if (!active(token)) return;
        const omissions = [
          ...checked.unbound.map(item => `${item.book}（未挂载，${item.entryCount} 条）`),
          ...checked.missing.map(item => `${item.book} / ${item.name}（${item.reason}）`),
        ];
        if (omissions.length && !win().confirm(`以下条目将跳过：\n${omissions.slice(0, 20).join('\n')}${omissions.length > 20 ? `\n另有 ${omissions.length - 20} 项` : ''}\n继续应用其余条目？`)) return;
        if (!checked.found.length) return message('没有可应用的条目', true);
        const saved = await service.save(state.data, state.revision);
        if (!active(token)) return;
        state.data = saved.data;
        state.revision = saved.revision;
        const result = await service.apply(profile, { guard: () => { if (!active(token)) throw new Error('聊天已切换，操作中断'); } });
        if (active(token)) message(`已修改 ${result.changed} 项，原状态 ${result.skipped} 项，跳过 ${omissions.length} 项`);
      }))));
  }
  function close() { state.token++; if (state.panel) state.panel.dataset.open = 'false'; }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'wb-profiles');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '世界书开关方案'), btn('×', close, '关闭'));
    const body = el('div', 'wb-profiles__body');
    body.dataset.body = '';
    const result = el('div', 'wb-profiles__result');
    result.dataset.result = '';
    panel.append(header, body, result);
    doc().body.append(panel);
    state.panel = panel;
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
    if (events?.CHAT_CHANGED) {
      const subscription = host.bindEvent(events.CHAT_CHANGED, close);
      if (subscription) state.cleanups.push(subscription);
    }
    return true;
  }
  async function open() {
    if (!mount()) return false;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    message('正在读取方案…');
    try {
      const [stored, books] = await Promise.all([service.load(), service.boundBooks()]);
      if (!active(token)) return false;
      state.data = stored.data;
      state.revision = stored.revision;
      state.books = books;
      state.selected = stored.data.activeId;
      render();
      message('');
      return true;
    } catch (error) { if (active(token)) message(`读取失败：${error?.message || error}`, true); return false; }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }); },
    mount, open, close,
    reload: open,
    dispose() {
      state.disposed = true;
      close();
      state.cleanups.forEach(subscription => subscription.stop());
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
