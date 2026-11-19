(() => {
  'use strict';
  const KEY = 'cryptLord.dualWorldbookUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.dualWorldbook'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!service || !host) throw new Error('双库管理依赖尚未加载');
  const state = { panel: null, body: null, stats: null, result: null, report: [], tab: 'all',
    token: 0, request: 0, busy: false, disposed: false, subscriptions: [], readError: '',
    generating: service.status().generating, focus: null, primaryBook: '' };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  function element(tag, cls, text) {
    const node = doc().createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, handler, title = text) {
    const node = element('button', '', text);
    node.type = 'button';
    node.title = title;
    node.setAttribute('aria-label', title);
    node.addEventListener('click', handler);
    return node;
  }
  function message(text, error = false) {
    if (!state.result) return;
    state.result.textContent = text;
    state.result.dataset.error = String(error);
  }
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && state.token === token &&
    modules[KEY] === api && modules['cryptLord.dualWorldbook'] === service &&
    modules['cryptLord.afterNativeHost'] === host && state.panel.ownerDocument === doc();
  function setBusy(busy) {
    state.busy = busy;
    const locked = busy || state.generating;
    if (state.body) state.body.disabled = locked;
    if (busy) state.panel?.setAttribute('aria-busy', 'true');
    else state.panel?.removeAttribute('aria-busy');
    state.panel?.querySelectorAll('[data-tab], [aria-label="刷新双库数据"]').forEach(node => { node.disabled = locked; });
  }
  function close() {
    state.token++;
    state.request++;
    setBusy(false);
    if (state.panel) state.panel.dataset.open = 'false';
    if (state.focus?.isConnected) state.focus.focus();
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel || !doc().body) return Boolean(state.panel);
    const panel = element('section', 'crypt-lord-dual-books');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '世界书管控中枢');
    panel.tabIndex = -1;
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const nodes = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), summary')]
          .filter(node => !node.closest('fieldset:disabled') && node.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === panel)) { event.preventDefault(); first?.focus(); }
      }
    });
    const header = element('header');
    const stats = element('span', 'crypt-lord-dual-books__stats', '同步中…');
    header.append(element('strong', '', '世界书管控中枢'), stats, button('↻', () => void reload(), '刷新双库数据'), button('×', close, '关闭'));
    const tabs = element('nav', 'crypt-lord-dual-books__tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '双库分类');
    const choices = [['all', '全部'], ['primary_only', '主库'], ['library_only', '历史孔隙'], ['conflict', '双库冲突']];
    choices.forEach(([id, label]) => {
      const tab = button(label, () => { state.tab = id; render(); });
      tab.dataset.tab = id;
      tab.setAttribute('role', 'tab');
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || state.busy || state.generating) return;
        event.preventDefault();
        const index = choices.findIndex(([value]) => value === state.tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 :
          (index + (event.key === 'ArrowRight' ? 1 : -1) + choices.length) % choices.length;
        state.tab = choices[next][0];
        render();
        tabs.querySelector(`[data-tab="${state.tab}"]`).focus();
      });
      tabs.append(tab);
    });
    const scroller = element('div', 'crypt-lord-dual-books__body');
    const body = element('fieldset', 'crypt-lord-dual-books__controls');
    scroller.append(body);
    const result = element('div', 'crypt-lord-dual-books__result');
    result.setAttribute('role', 'status');
    panel.append(header, tabs, scroller, result);
    doc().body.append(panel);
    Object.assign(state, { panel, body, result, stats });
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
    bind(events?.CHAT_CHANGED, () => { state.generating = false; close(); state.report = []; });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      state.token++;
      state.request++;
      state.generating = true;
      state.report = [];
      state.readError = '正文生成中，世界书操作已暂停。';
      render();
      setBusy(false);
      message(state.readError, true);
    });
    const ended = () => {
      state.generating = false;
      setBusy(false);
      if (state.panel.dataset.open === 'true') message('生成已结束，请刷新双库数据。', true);
    };
    bind(events?.GENERATION_ENDED, ended);
    bind(events?.GENERATION_STOPPED, ended);
    return true;
  }
  function actionButton(label, action, item, dangerous = false) {
    const node = button(label, () => void execute(action, item));
    if (dangerous) node.className = 'crypt-lord-dual-books__danger';
    return node;
  }
  function detail(label, entry) {
    const group = element('details', 'crypt-lord-dual-books__detail');
    const summary = element('summary');
    summary.title = `展开或收起${label}正文`;
    summary.append(element('b', '', label), element('span', '', String(entry?.content || '无内容').slice(0, 200)));
    group.append(summary, element('pre', '', String(entry?.content || '无内容')));
    group.title = String(entry?.content || '');
    return group;
  }
  function render() {
    if (!state.body) return;
    state.body.replaceChildren();
    state.panel.querySelectorAll('[data-tab]').forEach(tab => { tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab)); });
    if (state.readError) {
      state.stats.textContent = '读取失败';
      state.body.append(element('p', 'crypt-lord-dual-books__warning', state.readError));
      return;
    }
    const counts = { primary_only: 0, library_only: 0, conflict: 0, ambiguous: 0 };
    state.report.forEach(item => {
      if (item.status === 'identical') counts.primary_only++;
      else counts[item.status]++;
    });
    state.stats.textContent = `${state.primaryBook} · 总计 ${state.report.length} · 主库 ${counts.primary_only} · 孔隙 ${counts.library_only} · 冲突 ${counts.conflict}${counts.ambiguous ? ` · 重名 ${counts.ambiguous}` : ''}`;
    state.stats.title = state.stats.textContent;
    const filtered = state.report.filter(item => state.tab === 'all' ||
      (state.tab === 'primary_only' ? item.status === 'primary_only' || item.status === 'identical' : item.status === state.tab));
    if (!filtered.length) {
      state.body.append(element('p', 'crypt-lord-dual-books__empty', state.report.length ? '当前分类没有条目' : '双库中没有条目'));
      return;
    }
    filtered.forEach(item => {
      const entry = item.primaryData || item.libraryData;
      const row = element('article', 'crypt-lord-dual-books__entry');
      const title = element('div', 'crypt-lord-dual-books__entry-title');
      title.append(element('strong', '', item.name), element('span', '', ({
        primary_only: '仅主库', library_only: '仅历史孔隙', identical: '双库已同步',
        conflict: '双库冲突', ambiguous: '同名条目不唯一',
      })[item.status]));
      row.append(title);
      if (item.status === 'conflict') {
        row.append(detail('主库', item.primaryData), detail('孔隙', item.libraryData));
      } else row.append(detail(item.primaryData ? '主库' : '孔隙', entry));
      if (item.status === 'ambiguous') {
        row.append(element('p', 'crypt-lord-dual-books__warning', item.reason || '存在同名重复或无效 UID，请在酒馆世界书编辑器中处理后刷新。'));
      } else {
        const actions = element('div', 'crypt-lord-dual-books__actions');
        if (item.primaryData) {
          const toggle = element('input');
          toggle.type = 'checkbox';
          toggle.setAttribute('aria-label', `${item.name} 启用`);
          toggle.checked = Boolean(item.primaryData.enabled);
          toggle.addEventListener('change', () => void execute('toggle', item));
          const label = element('label', 'crypt-lord-dual-books__toggle', '启用');
          label.prepend(toggle);
          actions.append(label);
        }
        if (item.status === 'primary_only' || item.status === 'identical') {
          actions.append(actionButton('移至孔隙', 'demote', item));
        } else if (item.status === 'library_only') {
          actions.append(actionButton('唤醒至主库', 'promote', item));
        } else if (item.status === 'conflict') {
          actions.append(actionButton('用孔隙覆盖主库', 'overwrite_primary', item),
            actionButton('用主库覆盖孔隙', 'overwrite_library', item));
        }
        actions.append(actionButton('双库删除', 'delete', item, true));
        row.append(actions);
      }
      state.body.append(row);
    });
  }
  async function reload() {
    if (!mount() || state.busy || state.generating || state.panel.dataset.open !== 'true') return false;
    const token = state.token;
    setBusy(true);
    try { return await refreshData(token); }
    finally { if (active(token)) setBusy(false); }
  }
  async function refreshData(token) {
    const request = ++state.request;
    message('正在比对双库…');
    try {
      const report = await service.compare({ guard: () => active(token) && request === state.request });
      if (!active(token) || request !== state.request) return false;
      state.readError = '';
      state.report = report;
      state.primaryBook = report.primaryBook;
      render();
      message('');
      return true;
    } catch (error) {
      if (active(token) && request === state.request) {
        state.report = [];
        state.readError = `读取双库失败：${error?.message || error}`;
        render();
        message(state.readError, true);
      }
      return false;
    }
  }
  async function execute(action, item) {
    if (state.busy || state.generating) return;
    const prompts = {
      promote: `将「${item.name}」唤醒至「${item.primaryBook}」并从孔隙移除？`,
      demote: `将「${item.name}」备份到孔隙后从「${item.primaryBook}」移除？`,
      overwrite_primary: `用孔隙版本覆盖「${item.primaryBook}」的「${item.name}」？主库原内容将被替换。`,
      overwrite_library: `用「${item.primaryBook}」版本覆盖孔隙的「${item.name}」？孔隙原内容将被替换。`,
      delete: `从「${item.primaryBook}」和历史孔隙永久删除「${item.name}」？此操作不可撤销。`,
    };
    if (prompts[action] && !win().confirm(prompts[action])) { render(); return; }
    const token = state.token;
    setBusy(true);
    try {
      const result = await service.act(action, item, { guard: () => active(token) });
      if (!active(token)) return;
      const refreshed = await refreshData(token);
      if (active(token)) message(refreshed ? `「${item.name}」操作完成${result.warning ? `；${result.warning}` : ''}` :
        `「${item.name}」操作已提交，但读取双库失败，请刷新核对状态。`, !refreshed || Boolean(result.warning));
    } catch (error) {
      if (active(token)) {
        await refreshData(token);
        if (!active(token)) return;
        const partial = error.partial;
        message(`操作失败：${error?.message || error}${partial?.completed?.length
          ? `；已确认 ${partial.completed.length} 个步骤：${partial.completed.join('、')}` : ''}${partial?.pending
          ? `；停止于 ${partial.pending}，该步请以刷新结果为准` : ''}${partial?.sourceRetained
          ? '；来源移除未确认完成' : ''}${error.submitted ? '；宿主已返回提交响应，但实际状态未确认' : ''}。未自动回滚，请核对双库状态。`, true);
      }
    } finally {
      if (active(token)) setBusy(false);
    }
  }
  async function open() {
    if (!mount()) return false;
    if (state.panel.dataset.open === 'true') return true;
    state.focus = doc().activeElement;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    state.tab = 'all';
    state.token++;
    state.report = [];
    state.readError = state.generating ? '正文生成中，世界书操作已暂停。' : '';
    state.body.replaceChildren();
    state.stats.textContent = '同步中…';
    state.panel.focus();
    setBusy(false);
    if (state.generating) { render(); message(state.readError, true); return false; }
    return reload();
  }
  const api = Object.freeze({
    status() { return Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true', count: state.report.length }); },
    mount, open, close, reload,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(sub => sub.stop());
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
