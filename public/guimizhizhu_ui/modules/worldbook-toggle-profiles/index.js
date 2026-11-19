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
  const surface = host.getHost(), ownerDocument = surface?.document || document, ownerWindow = surface?.window || window;
  const state = { panel: null, data: null, revision: null, selected: '', books: [], token: 0,
    busy: false, disposed: false, pending: null, cleanups: [], renderId: 0, entryRequest: 0, draft: null, returnFocus: null, cleanData: '' };
  const doc = () => ownerDocument;
  const win = () => ownerWindow;
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
    node.setAttribute('aria-label', title || text);
    node.addEventListener('click', action);
    return node;
  };
  const current = () => state.data?.profiles.find(profile => profile.id === state.selected);
  function validSurface() {
    const now = host.getHost();
    if (modules[KEY] !== api || modules['cryptLord.worldbookToggleProfiles'] !== service ||
      modules['cryptLord.afterNativeHost'] !== host || now?.document !== ownerDocument || now?.window !== ownerWindow) {
      close(false, true); return false;
    }
    return !state.disposed;
  }
  const active = token => validSurface() && state.panel?.dataset.open === 'true' && token === state.token;
  function message(text, error = false) {
    const node = state.panel?.querySelector('[data-result]');
    if (node) { node.textContent = text; node.dataset.error = String(error); }
  }
  function setBusy(busy) {
    state.busy = busy;
    if (busy) state.panel?.setAttribute('aria-busy', 'true');
    else state.panel?.removeAttribute('aria-busy');
    const body = state.panel?.querySelector('[data-body]');
    if (body) body.disabled = busy || Boolean(state.pending) || service.status().generating;
    const phase = state.pending?.transaction.status().phase;
    const recovery = state.panel?.querySelector('[data-recovery]');
    if (recovery) {
      recovery.hidden = !state.pending;
      recovery.querySelector('[data-retry]').hidden = phase !== 'pending';
      recovery.querySelector('[data-inspect]').hidden = phase !== 'uncertain';
      recovery.querySelectorAll('button').forEach(button => { button.disabled = busy || service.status().generating || !state.revision; });
    }
    state.panel?.querySelectorAll('[data-reload]').forEach(button => { button.disabled = busy || service.status().generating; });
  }
  const guard = token => {
    if (!active(token)) throw new Error('窗口或聊天已变化，操作中断');
  };
  async function task(action, recovering = false) {
    if (state.busy || !state.data || !active(state.token) || !recovering && state.pending) return;
    if (service.status().generating) return message('生成期间不能保存或应用方案，请等待结束后重新读取', true);
    if (!state.revision) return message('请重新读取方案，确认已提交结果后再操作', true);
    setBusy(true);
    const token = state.token;
    try { await action(token); }
    catch (error) {
      if (active(token) && error.requiresReload) state.revision = null;
      const uncertain = state.pending?.transaction.status().phase === 'uncertain';
      if (active(token)) message(`${uncertain ? '保存状态待核对，未重复提交：' : ''}${error?.message || String(error)}${error.partial && state.pending?.kind === 'apply'
        ? `；已确认 ${error.partial.changed} 项，停止于「${error.partial.book}」。已提交内容不会回滚。` : ''}`, true);
    }
    finally { if (active(token)) setBusy(false); }
  }
  function syncForm() {
    const profile = current();
    if (!profile) return;
    const name = state.panel.querySelector('[data-name]'), note = state.panel.querySelector('[data-note]');
    if (!name || !note) return;
    const nextName = name.value.trim() || '未命名方案', nextNote = note.value || '';
    if (profile.name !== nextName || profile.note !== nextNote) profile.updatedAt = new Date().toISOString();
    profile.name = nextName;
    profile.note = nextNote;
    state.data.activeId = profile.id;
  }
  function render() {
    const renderId = ++state.renderId;
    const body = state.panel.querySelector('[data-body]');
    body.replaceChildren();
    const profile = current();
    if (!profile) return;
    const row = (cls, ...children) => { const node = el('div', cls); node.append(...children); return node; };
    const select = el('select');
    select.title = '选择方案';
    select.setAttribute('aria-label', '选择方案');
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
        ...service.defaultProfile(),
        name: duplicate ? `${source.name} 副本` : `新方案 ${state.data.profiles.length + 1}`,
        note: duplicate ? source.note : '', updatedAt: new Date().toISOString(),
        entries: duplicate ? source.entries.map(entry => ({ ...entry })) : [],
      };
      state.data.profiles.push(created);
      state.selected = created.id;
      state.data.activeId = created.id;
      render();
    };
    body.append(row('wb-profiles__toolbar', select, btn('新建', () => create()), btn('另存', () => create(true)),
      btn('删除', () => {
        syncForm();
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
    name.setAttribute('aria-label', '方案名称');
    const note = el('textarea');
    note.value = profile.note;
    note.rows = 2;
    note.dataset.note = '';
    note.setAttribute('aria-label', '备注');
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
      check.setAttribute('aria-label', `${entry.book} / ${entry.name} 开启`);
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
    book.setAttribute('aria-label', book.title);
    const entry = el('select');
    entry.title = '选择条目';
    entry.setAttribute('aria-label', entry.title);
    const placeholder = (selectNode, text) => { selectNode.replaceChildren(); const option = el('option', '', text); option.value = ''; selectNode.append(option); };
    placeholder(book, '选择世界书');
    placeholder(entry, '先选世界书');
    state.books.forEach(name => { const option = el('option', '', name); option.value = name; book.append(option); });
    book.addEventListener('change', () => {
      placeholder(entry, '加载中…');
      entry.disabled = true;
      const selectedBook = book.value;
      const token = state.token;
      const request = ++state.entryRequest;
      if (!selectedBook) { placeholder(entry, '先选世界书'); return; }
      void service.entriesFor(selectedBook, { guard: () => guard(token) }).then(entries => {
        if (!active(token) || book.value !== selectedBook || renderId !== state.renderId || request !== state.entryRequest) return;
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
      }).catch(error => {
        if (active(token) && renderId === state.renderId && request === state.entryRequest) {
          placeholder(entry, '读取失败');
          message(`读取条目失败：${error?.message || error}`, true);
        }
      });
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
        state.pending = { kind: 'save', transaction: service.beginSave(state.data, state.revision, { guard: () => guard(token) }) };
        setBusy(true);
        await finish(await state.pending.transaction.save(), token, true);
      })),
      btn('应用此方案', () => void task(async token => {
        syncForm();
        if (!profile.entries.length) return message('方案没有条目', true);
        const checked = await service.validate(profile, { guard: () => guard(token) });
        if (!active(token)) return;
        const omissions = [
          ...checked.unbound.map(item => `${item.book}（未挂载，${item.entryCount} 条）`),
          ...checked.missing.map(item => `${item.book} / ${item.name}（${item.reason}）`),
        ];
        if (!checked.found.length) return message('没有可应用的条目', true);
        const changes = checked.found.map(item => `${item.book} / ${item.name}：${item.enabled ? '开启' : '关闭'}`);
        if (!win().confirm(`应用方案「${profile.name}」？\n${changes.slice(0, 20).join('\n')}${changes.length > 20 ? `\n另有 ${changes.length - 20} 项` : ''}${omissions.length
          ? `\n以下条目跳过：\n${omissions.slice(0, 20).join('\n')}${omissions.length > 20 ? `\n另有 ${omissions.length - 20} 项` : ''}` : ''}`)) return;
        state.pending = { kind: 'save', transaction: service.beginSave(state.data, state.revision, { guard: () => guard(token) }),
          next: { profile: structuredClone(profile), validation: checked, omissions: omissions.length } };
        setBusy(true);
        await finish(await state.pending.transaction.save(), token, true);
      }))));
    body.querySelectorAll('.wb-profiles__actions button').forEach(button => { button.disabled = !state.revision; });
  }
  async function finish(result, token, advance) {
    if (!active(token)) return;
    const pending = state.pending;
    if (pending.transaction.status().phase !== 'saved') { message(result.warning || '本次结果尚未确认', true); return; }
    if (pending.kind === 'save') {
      state.data = result.data; state.cleanData = JSON.stringify(result.data); state.revision = result.revision;
      state.draft = null;
      if (pending.next) {
        const next = pending.next;
        state.pending = { kind: 'apply', omissions: next.omissions, saveWarning: result.warning,
          transaction: service.beginApply(next.profile, { validation: next.validation, guard: () => guard(token) }) };
        render(); setBusy(true);
        if (advance) return finish(await state.pending.transaction.save(), token, true);
        message('方案已确认保存，目标开关尚未全部应用；请重试保存继续。'); return;
      }
      state.pending = null; render(); message(result.warning || '方案已保存', Boolean(result.warning)); return;
    }
    state.pending = null; render();
    message([`已修改 ${result.changed} 项，原状态 ${result.skipped} 项，跳过 ${pending.omissions} 项`,
      pending.saveWarning, ...(result.warnings || [])].filter(Boolean).join('；'), Boolean(pending.saveWarning || result.warnings?.length));
  }
  function recover(inspect) {
    return task(async token => {
      const result = await (inspect ? state.pending.transaction.inspect() : state.pending.transaction.save());
      await finish(result, token, !inspect);
    }, true);
  }
  function discard() {
    return !state.pending || win().confirm('放弃本次待保存或待核对结果？已经保存的方案和已应用的开关不会撤销。');
  }
  function reload() {
    if (state.busy || service.status().generating) return false;
    if (state.pending ? !discard() : !win().confirm('放弃未保存的修改并重新读取？')) return false;
    return open({ discardDraft: true, confirmed: true });
  }
  function capture() {
    if (!state.data) return;
    syncForm();
    if (state.revision && JSON.stringify(state.data) === state.cleanData) { state.draft = null; return; }
    state.draft = { data: structuredClone(state.data), revision: state.revision,
      selected: state.selected, books: [...state.books] };
  }
  function close(preserve = true, force = false) {
    if (!force && !discard()) return false;
    if (state.pending) state.revision = null;
    if (preserve) capture();
    else { state.draft = null; state.data = null; state.revision = null; }
    state.pending = null;
    state.token++;
    state.entryRequest++;
    setBusy(false);
    if (state.panel) state.panel.dataset.open = 'false';
    if (state.returnFocus?.isConnected) state.returnFocus.focus();
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'wb-profiles');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '世界书开关方案');
    panel.tabIndex = -1;
    panel.setAttribute('aria-modal', 'true');
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button, input, textarea, select')].filter(node =>
        !node.matches(':disabled') && node.getClientRects().length && (!node.checkVisibility || node.checkVisibility()));
      const first = nodes[0], last = nodes.at(-1), focus = doc().activeElement;
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (focus === first || focus === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (focus === last || focus === panel)) { event.preventDefault(); first.focus(); }
    });
    const header = el('header');
    const reloadButton = btn('', () => void reload(), '重新读取'); reloadButton.dataset.reload = '';
    reloadButton.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i>';
    const closeButton = btn('', () => close(), '关闭');
    closeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    const tools = el('div', 'wb-profiles__header-tools'); tools.append(reloadButton, closeButton);
    header.append(el('strong', '', '世界书开关方案'), tools);
    const body = el('fieldset', 'wb-profiles__body');
    body.dataset.body = '';
    const result = el('div', 'wb-profiles__result');
    result.dataset.result = '';
    result.setAttribute('role', 'status');
    const recovery = el('div', 'wb-profiles__recovery'); recovery.dataset.recovery = ''; recovery.hidden = true;
    const retry = btn('重试保存', () => void recover(false)); retry.dataset.retry = '';
    const inspect = btn('核对保存', () => void recover(true)); inspect.dataset.inspect = '';
    recovery.append(retry, inspect);
    panel.append(header, body, recovery, result);
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
      const subscription = host.bindEvent(events.CHAT_CHANGED, () => close(false, true));
      if (subscription) state.cleanups.push(subscription);
    }
    if (events?.GENERATION_STARTED) {
      const subscription = host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
        if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || dryRun || options?.quiet_prompt || options?.dryRun ||
          options?.options?.quiet_prompt || options?.options?.dryRun) return;
        capture();
        state.token++; state.entryRequest++;
        setBusy(false);
        state.revision = null;
        if (state.draft) state.draft.revision = null;
        if (state.panel?.dataset.open === 'true' && state.data) render();
        message('生成已开始，草稿已保留；结束后请重新读取方案再保存或应用', true);
      });
      if (subscription) state.cleanups.push(subscription);
    }
    for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED']) if (events?.[name]) {
      const subscription = host.bindEvent(events[name], () => setBusy(state.busy));
      if (subscription) state.cleanups.push(subscription);
    }
    return true;
  }
  async function open(options = {}) {
    if (!mount() || !validSurface()) return false;
    if (state.panel.dataset.open === 'true' && !options.discardDraft) { state.panel.focus(); return true; }
    if (options.discardDraft) {
      if (!options.confirmed && !discard()) return false;
      state.draft = null; state.pending = null;
    }
    if (state.panel.dataset.open !== 'true') state.returnFocus = doc().activeElement;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    setBusy(true);
    state.data = null;
    state.panel.querySelector('[data-body]').replaceChildren();
    state.panel.focus();
    message('正在读取方案…');
    try {
      if (state.draft) {
        Object.assign(state, { ...state.draft, data: structuredClone(state.draft.data), books: [...state.draft.books] });
        render();
        message(state.revision ? '编辑草稿已保留' : '草稿已保留，请重新读取后再保存或应用', !state.revision);
        return true;
      }
      const [stored, books] = await Promise.all([service.load({ guard: () => guard(token) }),
        service.boundBooks(null, { guard: () => guard(token) })]);
      if (!active(token)) return false;
      state.data = stored.data;
      state.cleanData = JSON.stringify(stored.data);
      state.revision = stored.revision;
      state.books = books;
      state.selected = stored.data.activeId;
      render();
      message('');
      return true;
    } catch (error) {
      if (active(token)) {
        message(`读取失败：${error?.message || error}`, true);
      }
      return false;
    } finally { if (active(token)) setBusy(false); }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }); },
    mount, open, close,
    reload,
    dispose() {
      state.disposed = true;
      close(false, true);
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
