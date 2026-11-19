(() => {
  'use strict';
  const KEY = 'cryptLord.journeyReaderUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract, reader = modules['cryptLord.journeyReader'], host = modules['cryptLord.afterNativeHost'];
  if (!contract || !reader || !host) throw Error('经历浏览依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { panel: null, body: null, result: null, status: null, feedback: null, controls: null,
    target: null, tab: 'native', book: '', scope: 'all', query: '', tag: '', minimum: '', maximum: '', order: 'newest',
    page: 0, token: 0, busy: false, queued: false, generating: false, disposed: false, focus: null,
    expanded: new Set(), subscriptions: [], drag: null, surface: host.getHost() };
  const doc = () => state.surface?.document || document;
  function element(tag, className = '', text) {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function iconButton(label, icon, handler) {
    const node = element('button');
    node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const glyph = element('i', `fa-solid fa-${icon}`);
    glyph.setAttribute('aria-hidden', 'true'); node.appendChild(glyph);
    node.addEventListener('click', handler); return node;
  }
  function active(token) {
    const surface = host.getHost();
    if (modules[KEY] !== api || modules['cryptLord.journeyReader'] !== reader || modules['cryptLord.afterNativeHost'] !== host ||
      surface?.document !== state.surface?.document || surface?.window !== state.surface?.window) { close(); return false; }
    return !state.disposed && state.token === token && state.panel?.dataset.open === 'true';
  }
  function close() {
    state.token++; state.busy = false; state.queued = false; state.drag = null; state.result = null; state.expanded.clear();
    if (state.panel) { state.panel.dataset.open = 'false'; state.panel.removeAttribute('aria-busy'); }
    state.body?.replaceChildren();
    if (state.focus?.isConnected) state.focus.focus();
    state.focus = null;
  }
  function select(label, options, value, handler) {
    const input = element('select');
    input.setAttribute('aria-label', label);
    for (const [key, name] of options) {
      const option = element('option', '', name); option.value = key; input.appendChild(option);
    }
    input.value = value;
    input.addEventListener('change', () => handler(input.value)); return input;
  }
  function records() {
    if (!state.result) return { rows: [], invalid: [], error: '' };
    if (state.tab === 'books') {
      const source = state.result.books.find(book => book.id === state.book);
      return { rows: source?.records || [], invalid: source?.invalid || [], error: state.result.booksError };
    }
    const source = state.result.native;
    return { rows: (source?.records || []).filter(row => state.scope !== 'current' || row.source.messageId === source.messageId),
      invalid: (source?.invalid || []).filter(row => state.scope !== 'current' || row.source.messageId === source.messageId),
      error: state.result.nativeError };
  }
  function mount() {
    if (state.disposed || !doc().body) return false;
    if (state.panel) return true;
    const panel = element('section', 'crypt-lord-journey');
    panel.dataset.open = 'false'; panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '本周目经历'); panel.setAttribute('aria-modal', 'true'); panel.tabIndex = -1;
    const header = element('header'), tools = element('div', 'crypt-lord-journey__tools');
    tools.append(iconButton('重新读取经历', 'rotate-right', () => void reload()),
      iconButton('关闭', 'xmark', close));
    header.append(element('strong', '', '本周目经历'), tools);
    const controls = element('div', 'crypt-lord-journey__controls');
    const status = element('div', 'crypt-lord-journey__status');
    status.setAttribute('role', 'status');
    const body = element('main', 'crypt-lord-journey__body');
    const feedback = element('div', 'crypt-lord-journey__feedback');
    feedback.setAttribute('role', 'status');
    panel.append(header, controls, status, body, feedback); doc().body.appendChild(panel);
    Object.assign(state, { panel, controls, status, body, feedback });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary')]
        .filter(node => node.getClientRects().length && (!node.checkVisibility || node.checkVisibility()));
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && [panel, first].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && doc().activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button') || (doc().defaultView || window).innerWidth <= 640) return;
      const rect = panel.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId); event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const view = doc().defaultView || window;
      panel.style.left = `${Math.max(8, Math.min(view.innerWidth - panel.offsetWidth - 8, state.drag.left + event.clientX - state.drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(view.innerHeight - panel.offsetHeight - 8, state.drag.top + event.clientY - state.drag.y))}px`;
      panel.style.transform = 'none';
    });
    for (const name of ['pointerup', 'pointercancel']) header.addEventListener(name, () => { state.drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => { state.generating = false; close(); }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.dryRun ||
        options?.options?.quiet_prompt || options?.options?.dryRun) return;
      state.queued = false;
      state.generating = true; state.token++; state.busy = false; state.result = null; state.body.replaceChildren();
      state.panel.removeAttribute('aria-busy'); state.status.textContent = '正文生成中，结束后重新读取经历';
      state.controls.querySelectorAll('input,select,button').forEach(node => { node.disabled = true; });
    }));
    for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      state.subscriptions.push(host.bindEvent(name, () => {
        if (!state.generating) return;
        state.generating = false;
        if (panel.dataset.open === 'true') state.status.textContent = '生成已结束，请重新读取经历';
      }));
    for (const name of ['MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED']) {
      if (events?.[name]) state.subscriptions.push(host.bindEvent(events[name], id => {
        if (panel.dataset.open === 'true' && (state.target === null || Number(id) <= state.target)) void reload();
      }));
    }
    const ownerWindow = doc().defaultView;
    const edited = event => {
      const id = event.detail?.messageId;
      if (panel.dataset.open === 'true' && (id === undefined || state.target === null || Number(id) <= state.target)) void reload();
    };
    ownerWindow.addEventListener('cryptLord:message-edited', edited);
    state.subscriptions.push({ stop: () => ownerWindow.removeEventListener('cryptLord:message-edited', edited) });
    return true;
  }
  function resetFilters() {
    state.page = 0; state.query = ''; state.tag = ''; state.minimum = ''; state.maximum = ''; state.expanded.clear();
  }
  function renderControls() {
    const focusedLabel = state.controls.contains(doc().activeElement) ? doc().activeElement.getAttribute('aria-label') : null;
    state.controls.replaceChildren();
    const tabs = element('div', 'crypt-lord-journey__tabs'); tabs.setAttribute('role', 'tablist');
    for (const [id, label] of [['native', '原生楼层'], ['books', '世界书记录']]) {
      const tab = element('button', '', label); tab.type = 'button'; tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(state.tab === id));
      tab.addEventListener('click', () => {
        state.tab = id; resetFilters(); renderControls(); render();
        [...state.controls.querySelectorAll('[role="tab"]')].find(node => node.textContent === label)?.focus();
      });
      tabs.appendChild(tab);
    }
    const source = state.tab === 'books' ? select('经历世界书条目',
      state.result?.books.length ? state.result.books.map(book => [book.id, book.label]) : [['', '暂无经历条目']],
      state.book, value => { state.book = value; resetFilters(); renderControls(); render(); })
      : select('原生楼层范围', [['all', '截至所选楼层'], ['current', '仅所选楼层']], state.scope,
        value => { state.scope = value; resetFilters(); renderControls(); render(); });
    const sourceRow = element('div', 'crypt-lord-journey__source'); sourceRow.append(tabs, source);
    const filters = element('div', 'crypt-lord-journey__filters');
    const query = element('input'); query.type = 'search'; query.placeholder = '搜索事件、地点或人物';
    query.setAttribute('aria-label', '搜索经历'); query.value = state.query;
    query.addEventListener('input', () => { state.query = query.value; state.page = 0; render(); });
    const tagNames = [...new Set(records().rows.flatMap(row => row.tags))];
    const tag = select('事件标签', [['', '全部标签'], ...tagNames.map(name => [name, name])], state.tag,
      value => { state.tag = value; state.page = 0; render(); });
    const order = select('事件顺序', [['newest', '序号倒序'], ['oldest', '序号正序']], state.order,
      value => { state.order = value; state.page = 0; render(); });
    const range = element('div', 'crypt-lord-journey__range');
    for (const [key, label] of [['minimum', '起始序号'], ['maximum', '结束序号']]) {
      const input = element('input'); input.type = 'number'; input.min = '0'; input.step = '1';
      input.placeholder = label; input.setAttribute('aria-label', label); input.value = state[key];
      input.addEventListener('input', () => { state[key] = input.value; state.page = 0; render(); });
      range.appendChild(input);
    }
    range.appendChild(iconButton('清除筛选', 'filter-circle-xmark', () => { resetFilters(); renderControls(); render(); }));
    filters.append(query, tag, order, range);
    state.controls.append(sourceRow, filters);
    if (focusedLabel) [...state.controls.querySelectorAll('[aria-label]')]
      .find(node => node.getAttribute('aria-label') === focusedLabel)?.focus();
  }
  async function copy(row) {
    const token = state.token;
    if (!active(token)) return;
    try {
      const clipboard = (doc().defaultView || window).navigator?.clipboard;
      if (!clipboard?.writeText) throw Error('剪贴板不可用');
      await clipboard.writeText(row.text);
      if (active(token)) state.feedback.textContent = '事件文本已复制';
    } catch (error) { if (active(token)) state.feedback.textContent = `复制失败：${error.message}`; }
  }
  function jump(row) {
    if (!active(state.token)) return;
    const node = host.getDisplayedMessageElement?.(row.source.messageId);
    if (!node) { state.feedback.textContent = '该原生楼层暂未显示'; return; }
    close(); node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function eventCard(row) {
    const event = row.event, details = element('details', 'crypt-lord-journey__event');
    details.dataset.id = row.id;
    details.open = state.expanded.has(row.id);
    details.addEventListener('toggle', () => {
      if (!details.isConnected) return;
      if (details.open) state.expanded.add(row.id); else state.expanded.delete(row.id);
    });
    const summary = element('summary');
    const serial = element('span', 'crypt-lord-journey__serial');
    const expand = element('i', 'fa-solid fa-chevron-right crypt-lord-journey__expand');
    expand.setAttribute('aria-hidden', 'true');
    serial.append(expand, doc().createTextNode(` №${event.序号}`));
    summary.append(serial,
      element('strong', '', event.大纲 || '无标题'),
      element('span', 'crypt-lord-journey__date', `${event.日期 || '未知日期'} ${event.时间 || ''}`.trim()));
    const brief = element('div', 'crypt-lord-journey__brief');
    brief.append(element('span', '', `地点：${event.地点 || '未知地点'}`),
      element('span', 'crypt-lord-journey__origin', row.source.label));
    const labels = element('div', 'crypt-lord-journey__tags');
    for (const name of row.tags) labels.appendChild(element('span', '', name));
    const content = element('div', 'crypt-lord-journey__detail');
    for (const [key, label] of [['详细描述','详细描述'], ['在场人物','在场人物'], ['核心侧写','核心侧写'],
      ['核心锚点','核心锚点'], ['自动化系统','自动化系统']]) {
      if (!event[key]) continue;
      const line = element('section');
      line.append(element('h3', '', label), element('p', '', event[key])); content.appendChild(line);
    }
    const tools = element('div', 'crypt-lord-journey__event-tools');
    tools.appendChild(iconButton('复制事件文本', 'copy', () => void copy(row)));
    if (row.source.messageId !== undefined) tools.appendChild(iconButton('定位原生楼层', 'arrow-up-right-from-square', () => jump(row)));
    summary.append(brief, labels);
    content.appendChild(tools); details.append(summary, content);
    return details;
  }
  function render() {
    const source = records();
    const filtered = reader.filter(source.rows, state);
    const page = reader.page(filtered, state.page); state.page = page.index;
    state.status.textContent = `${state.tab === 'native' ? `截至楼层 #${state.result?.native?.messageId ?? '?'}` : '世界书记录'} · ${filtered.length} / ${source.rows.length} 条事件`;
    state.body.replaceChildren();
    if (source.error) {
      state.body.appendChild(element('p', 'crypt-lord-journey__error', `读取失败：${source.error}`));
      const retry = element('button', '', '重试'); retry.type = 'button'; retry.addEventListener('click', () => void reload());
      state.body.appendChild(retry);
    } else if (!source.rows.length) {
      state.body.appendChild(element('p', 'crypt-lord-journey__empty', source.invalid.length ? '记录格式有误，无法解析事件' : '尚未留下任何经历记录'));
    } else if (!filtered.length) state.body.appendChild(element('p', 'crypt-lord-journey__empty', '没有匹配的事件'));
    for (const row of source.invalid) {
      const detail = element('details', 'crypt-lord-journey__invalid');
      detail.append(element('summary', '', `${row.source.label} · 未解析原文`), element('pre', '', row.content));
      state.body.appendChild(detail);
    }
    const list = element('div', 'crypt-lord-journey__list');
    page.rows.forEach(row => list.appendChild(eventCard(row))); state.body.appendChild(list);
    if (page.count > 1) {
      const pager = element('nav', 'crypt-lord-journey__pager'); pager.setAttribute('aria-label', '事件分页');
      const changePage = (offset, label) => {
        state.page += offset; render(); state.body.scrollTop = 0;
        const buttons = [...state.body.querySelectorAll('.crypt-lord-journey__pager button')];
        (buttons.find(node => node.getAttribute('aria-label') === label && !node.disabled) ||
          buttons.find(node => !node.disabled) || state.panel).focus();
      };
      const previous = iconButton('上一页', 'chevron-left', () => changePage(-1, '上一页'));
      previous.disabled = page.index === 0;
      const next = iconButton('下一页', 'chevron-right', () => changePage(1, '下一页'));
      next.disabled = page.index === page.count - 1;
      pager.append(previous, element('span', '', `${page.index + 1} / ${page.count}`), next); state.body.appendChild(pager);
    }
  }
  async function reload() {
    if (state.disposed || state.generating || !active(state.token)) return false;
    if (state.busy) { state.queued = true; return false; }
    const token = ++state.token;
    const scroll = state.body.scrollTop;
    // A refresh can remove details before its queued toggle event runs.
    for (const node of state.body.querySelectorAll('.crypt-lord-journey__event')) {
      if (node.open) state.expanded.add(node.dataset.id); else state.expanded.delete(node.dataset.id);
    }
    state.busy = true; state.result = null; state.body.replaceChildren(); state.feedback.textContent = '';
    state.status.textContent = '正在读取经历';
    state.panel.setAttribute('aria-busy', 'true');
    state.controls.querySelectorAll('input,select,button').forEach(node => { node.disabled = true; });
    try {
      const result = await reader.load(state.target, () => active(token));
      if (!active(token)) return false;
      state.result = result;
      if (!result.books.some(book => book.id === state.book)) state.book = result.books[0]?.id || '';
      renderControls(); render(); state.body.scrollTop = scroll;
      return true;
    } catch (error) {
      if (active(token)) {
        state.result = { native: null, books: [], nativeError: error.message, booksError: error.message };
        renderControls(); render();
      }
      return false;
    } finally {
      if (active(token)) {
        state.busy = false; state.panel.removeAttribute('aria-busy');
        if (state.queued) { state.queued = false; void reload(); }
      }
    }
  }
  async function open(messageId = null) {
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    if (!mount()) return false;
    if (state.panel.dataset.open === 'true' && state.target === messageId && active(state.token)) {
      state.panel.focus(); return true;
    }
    state.token++; state.busy = false; state.queued = false;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.target = messageId; state.tab = 'native'; state.scope = 'all'; resetFilters();
    state.panel.dataset.open = 'true'; state.panel.focus();
    if (!active(state.token)) return false;
    return reload();
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true', busy: state.busy, target: state.target }),
    mount, open, close, reload,
    dispose() {
      close(); state.disposed = true; state.subscriptions.forEach(item => item?.stop?.()); state.panel?.remove();
      state.panel = null; contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
