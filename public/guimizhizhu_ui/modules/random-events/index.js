(() => {
  'use strict';
  const KEY = 'cryptLord.randomEventsUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.randomEvents'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!service || !host) throw new Error('随机事件依赖尚未加载');
  const state = {
    panel: null, body: null, status: null, entries: [], revision: null, selected: 0, cleanData: '', recovery: false,
    busy: false, token: 0, disposed: false, subscriptions: [], view: null, focus: null, loading: false,
  };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && state.token === token &&
    modules['cryptLord.randomEvents'] === service && modules['cryptLord.afterNativeHost'] === host && host.getHost()?.window === state.view;
  const dirty = () => state.cleanData !== '' && JSON.stringify(state.entries) !== state.cleanData;
  function controls() {
    state.panel?.querySelectorAll('.crypt-lord-random__body input, .crypt-lord-random__body textarea, .crypt-lord-random__body button')
      .forEach(node => { node.disabled = state.busy || state.loading || node.dataset.needsRevision === 'true' &&
        (!state.revision || state.recovery || service.status().recovery); });
  }
  function accept(loaded) {
    if (!loaded.entries || !loaded.revision) {
      state.revision = null;
      controls();
      message(loaded.warning || '提交已完成，请重新读取', true);
      return;
    }
    state.entries = loaded.entries;
    state.revision = loaded.revision;
    state.recovery = loaded.recovery || false;
    state.cleanData = JSON.stringify(state.entries);
    state.selected = Math.max(0, Math.min(state.selected, state.entries.length - 1));
    render();
    if (loaded.warning) message(loaded.warning);
  }
  function el(tag, className = '', text) {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, fn, title = label, writes = false) {
    const node = el('button', '', label);
    node.type = 'button';
    node.title = title;
    if (writes) node.dataset.needsRevision = 'true';
    node.addEventListener('click', event => { if (!node.disabled && (label === '×' || !state.busy && !state.loading)) fn(event); });
    return node;
  }
  function trashIcon() {
    const icon = el('i', 'fa-solid fa-trash');
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }
  function field(label, control) {
    const row = el('label', 'crypt-lord-random__field');
    row.append(el('span', '', label), control);
    return row;
  }
  function input(type, value, changed) {
    const node = el('input');
    node.type = type;
    if (type === 'checkbox') node.checked = Boolean(value);
    else node.value = String(value ?? '');
    node.addEventListener('input', changed);
    return node;
  }
  function message(text, error = false) {
    state.status.textContent = text;
    state.status.dataset.error = String(error);
  }
  function close() {
    ++state.token;
    state.busy = false;
    state.loading = false;
    if (state.panel) { state.panel.dataset.open = 'false'; state.panel.removeAttribute('aria-busy'); }
    if (state.focus?.isConnected) state.focus.focus();
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-random');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '随机事件库');
    const header = el('header');
    header.append(el('strong', '', '随机事件库'), button('×', close, '关闭'));
    const body = el('div', 'crypt-lord-random__body');
    const status = el('div', 'crypt-lord-random__status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.append(header, body, status);
    doc().body.append(panel);
    Object.assign(state, { panel, body, status });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button, input, textarea')].filter(node => !node.disabled && node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && doc().activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && doc().activeElement === last) { event.preventDefault(); first?.focus(); }
    });
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
    const bind = (event, fn) => { if (event) { const sub = host.bindEvent(event, fn); if (sub) state.subscriptions.push(sub); } };
    bind(events?.CHAT_CHANGED, () => {
      close(); state.entries = []; state.revision = null; state.cleanData = ''; state.body.replaceChildren();
    });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      close(); state.revision = null;
    });
    return true;
  }
  async function task(work) {
    if (state.busy) return;
    const token = state.token;
    const guard = () => active(token);
    state.busy = true;
    state.panel.setAttribute('aria-busy', 'true');
    controls();
    try { await work(token, guard); }
    catch (error) {
      if (active(token)) {
        if (service.status().recovery !== state.recovery) { state.recovery = service.status().recovery; render(); }
        message(error?.message || String(error), true);
      }
    }
    finally { if (state.token === token) { state.busy = false; state.panel?.removeAttribute('aria-busy'); controls(); } }
  }
  function render() {
    state.body.replaceChildren();
    const nav = el('nav', 'crypt-lord-random__nav');
    const navActions = el('div', 'crypt-lord-random__nav-actions');
    navActions.append(button('新建条目', () => {
      let name = '新随机事件', suffix = 2;
      while (state.entries.some(source => source.entry.name === name)) name = `新随机事件 ${suffix++}`;
      state.entries.push({
        comment: '', entry: {
          name, isEnabled: false, order: 10, 触发率: 0, 抽取数量: 1,
          输出指令: '需要触发的剧情：${type}-${name}，描述：${description}', 事件列表: [],
        },
      });
      state.selected = state.entries.length - 1;
      render();
    }), button('恢复默认', () => {
      if (!win().confirm('恢复默认随机事件？本脚本的新建、编辑和隐藏记录将清除；原版世界书正文保持不变，启用状态恢复。')) return;
      void task(async (token, guard) => {
        const loaded = await service.restore(state.revision, guard);
        if (!active(token)) return;
        state.selected = 0;
        accept(loaded);
        if (!loaded.warning) message('已恢复默认随机事件和原版条目的启用状态');
      });
    }, '恢复默认', true), button('重新读取', () => {
      if (dirty() && !win().confirm('重新读取将丢弃当前草稿，继续吗？')) return;
      void open(true);
    }));
    if (state.recovery || service.status().recovery) navActions.append(button('恢复未完成提交', () => {
      if (!win().confirm('继续上次未完成的随机事件提交？只有原聊天、世界书绑定及未被外部修改的内容仍匹配时才会恢复。')) return;
      void task(async (token, guard) => {
        const loaded = await service.recover(guard);
        if (active(token)) { accept(loaded); message(loaded.warning || '已恢复未完成提交'); }
      });
    }));
    nav.append(navActions);
    nav.append(el('div', 'crypt-lord-random__nav-heading', `事件库 · ${state.entries.length}`));
    state.entries.forEach(({ entry, book, comment }, index) => {
      const row = el('div', 'crypt-lord-random__nav-item');
      row.dataset.selected = String(state.selected === index);
      const label = button('', () => {
        state.selected = index;
        render();
      });
      label.className = 'crypt-lord-random__nav-select';
      label.append(el('span', 'crypt-lord-random__nav-name', entry.name || '未命名'),
        el('small', '', `${book || '本地'} · ${entry.isEnabled ? '已启用' : '已关闭'}`));
      label.dataset.entryIndex = String(index);
      const controls = el('div', 'crypt-lord-random__nav-controls');
      const toggle = el('label', 'crypt-lord-random__switch');
      const check = input('checkbox', entry.isEnabled, () => {});
      check.dataset.needsRevision = 'true';
      check.setAttribute('aria-label', `${entry.isEnabled ? '关闭' : '开启'}「${entry.name || '未命名'}」`);
      check.title = `切换「${entry.name || '未命名'}」并保存全部当前编辑`;
      check.addEventListener('change', () => {
        state.entries[index].entry.isEnabled = check.checked;
        void task(async (token, guard) => {
          const saved = await service.save(state.entries, state.revision, guard);
          if (!active(token)) return;
          accept(saved);
          if (!saved.warning) message(`「${entry.name}」已${check.checked ? '启用' : '关闭'}，原版世界书正文未改`);
        });
      });
      toggle.append(check, el('span', 'crypt-lord-random__switch-track'));
      const remove = button('', () => {
        const source = state.entries[index];
        const draft = !source.comment;
        if (!win().confirm(`从本脚本移除「${source.entry.name || '未命名'}」？原版世界书正文保留、条目将停用；恢复默认可撤销。${draft ? '' : '当前未保存的其他编辑将丢弃。'}`)) return;
        if (draft) {
          state.entries.splice(index, 1);
          state.selected = Math.max(0, Math.min(state.selected > index ? state.selected - 1 : state.selected, state.entries.length - 1));
          render();
          message('草稿已移除');
          return;
        }
        void task(async (token, guard) => {
          const loaded = await service.remove(source, state.revision, guard);
          if (!active(token)) return;
          state.selected = Math.max(0, Math.min(state.selected > index ? state.selected - 1 : state.selected, state.entries.length - 1));
          accept(loaded);
          if (!loaded.warning) message(`已移除「${source.entry.name}」，原版正文保留且停用`);
        });
      }, `移除「${entry.name || '未命名'}」（保留原版正文，可恢复）`, true);
      remove.className = 'crypt-lord-random__trash';
      remove.setAttribute('aria-label', `移除「${entry.name || '未命名'}」`);
      remove.append(trashIcon());
      controls.append(toggle, remove);
      row.append(label, controls);
      nav.append(row);
    });
    state.body.append(nav);
    const source = state.entries[state.selected];
    if (!source) {
      state.body.append(el('p', 'crypt-lord-random__empty', '暂无随机事件条目'));
      controls();
      return;
    }
    const entry = source.entry;
    const editor = el('div', 'crypt-lord-random__editor');
    const title = el('h3', '', '基础设置');
    const actions = el('div', 'crypt-lord-random__row');
    actions.append(
      button('手动触发', () => void task(async (token, guard) => {
        const normalized = service.normalize(entry);
        const results = service.draw(normalized);
        if (!results.length) throw new Error('没有可抽取的有效事件');
        const pending = await service.queueManual(results, guard);
        if (active(token)) message(`已排队：${results.map(item => item.eventName).join('、')}（待执行 ${pending.length} 项）`);
      }), '手动触发', true),
      button('保存全部', () => void task(async (token, guard) => {
        const saved = await service.save(state.entries, state.revision, guard);
        if (!active(token)) return;
        accept(saved);
        if (!saved.warning) message('随机事件已保存；修改项已同步为世界书覆盖条目');
      }), '保存全部', true),
    );
    editor.append(title, actions);
    const settings = el('div', 'crypt-lord-random__grid');
    settings.append(
      field('条目名称', input('text', entry.name, event => {
        entry.name = event.target.value;
        const label = nav.querySelector(`[data-entry-index="${state.selected}"]`);
        if (label) label.querySelector('.crypt-lord-random__nav-name').textContent = entry.name || '未命名';
      })),
      field('排序', input('number', entry.order, event => { entry.order = Number(event.target.value); })),
      field('触发率 0–1', input('number', entry.触发率, event => { entry.触发率 = Number(event.target.value); })),
      field('抽取数量', input('number', entry.抽取数量, event => { entry.抽取数量 = Number(event.target.value); })),
      field('启用', input('checkbox', entry.isEnabled, event => { entry.isEnabled = event.target.checked; })),
    );
    editor.append(settings);
    const template = el('textarea');
    template.rows = 3;
    template.value = entry.输出指令;
    template.addEventListener('input', () => { entry.输出指令 = template.value; });
    editor.append(field('输出指令模板', template));
    const eventTitle = el('div', 'crypt-lord-random__row');
    eventTitle.append(el('h3', '', '事件列表（加权不重复抽取）'), button('添加事件', () => {
      entry.事件列表.push({ weight: 10, type: '', name: '', description: '' });
      render();
    }));
    editor.append(eventTitle);
    entry.事件列表.forEach((item, index) => {
      const card = el('section', 'crypt-lord-random__event');
      const row = el('div', 'crypt-lord-random__grid');
      row.append(
        field('权重', input('number', item.weight, event => { item.weight = Number(event.target.value); })),
        field('类别', input('text', item.type, event => { item.type = event.target.value; })),
        field('名称', input('text', item.name, event => { item.name = event.target.value; })),
      );
      const description = el('textarea');
      description.rows = 2;
      description.value = item.description;
      description.addEventListener('input', () => { item.description = description.value; });
      card.append(row, field('内容描述', description), button('删除此事件', () => {
        if (!win().confirm(`删除事件「${item.name || index + 1}」？`)) return;
        entry.事件列表.splice(index, 1);
        render();
      }));
      editor.append(card);
    });
    state.body.append(editor);
    controls();
  }
  async function open(force = false) {
    if (!mount()) return false;
    if (!force && state.panel.dataset.open === 'true') return true;
    if (state.panel.dataset.open !== 'true' && !state.panel.contains(doc().activeElement)) state.focus = doc().activeElement;
    state.view = host.getHost()?.window;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    state.busy = false;
    if (!force && dirty()) {
      render();
      message(state.revision ? '已保留未保存草稿' : '已保留未保存草稿；生成已变化，请重新读取', !state.revision);
      state.panel.querySelector('header button').focus();
      return true;
    }
    state.loading = true;
    state.body.replaceChildren();
    message('正在读取随机事件…');
    try {
      const loaded = await service.load({ guard: () => active(token) });
      if (!active(token)) return false;
      state.selected = 0;
      state.loading = false;
      accept(loaded);
      message(loaded.recovery ? '上次提交未完成，请确认恢复未完成提交' : loaded.legacy ? '旧版本地配置尚未同步；保存全部后完成迁移' : '');
      state.panel.querySelector('header button').focus();
      return true;
    } catch (error) {
      if (active(token)) {
        state.loading = false; state.revision = null;
        state.body.append(button('重新读取', () => void open(true)));
        message(error?.message || String(error), true);
      }
      return false;
    }
  }
  const api = Object.freeze({
    status: () => Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(sub => sub.stop());
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
