(() => {
  'use strict';
  const KEY = 'cryptLord.worldReportUi', root = window.cryptLord, modules = root?.__stage1Modules, contract = root?.contract;
  const service = modules?.['cryptLord.worldReport'], after = modules?.['cryptLord.afterNativeHost'];
  if (!service || !after || !contract) throw Error('世界线报告界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { disposed: false, panel: null, token: 0, scanToken: 0, busy: false, generating: false, focus: null,
    selected: null, loaded: null, mounted: new Map(), folds: new Map(), subscriptions: [], observer: null, queued: false };
  const doc = () => after.getHost()?.document || document, win = () => doc().defaultView || window;
  const active = token => !state.disposed && token === state.token && state.panel?.dataset.open === 'true';
  function node(tag, cls = '', text) {
    const item = doc().createElement(tag); item.className = cls;
    if (text !== undefined) item.textContent = text; return item;
  }
  function tool(label, icon, action) {
    const item = node('button'); item.type = 'button'; item.title = label; item.setAttribute('aria-label', label);
    const image = node('i', `fa-solid fa-${icon}`); image.setAttribute('aria-hidden', 'true'); item.append(image);
    item.addEventListener('click', action); return item;
  }
  function disclosure(parent, title, context, key, open = false) {
    const section = node('details'), id = JSON.stringify([context, key]);
    section.open = state.folds.has(id) ? state.folds.get(id) : open;
    section.append(node('summary', '', title));
    section.addEventListener('toggle', () => {
      if (section.isConnected && !state.disposed) state.folds.set(id, section.open);
    });
    parent.append(section); return section;
  }
  function fields(parent, pairs) {
    const list = node('dl');
    for (const [name, value] of pairs) if (value) list.append(node('dt', '', name), node('dd', '', value));
    if (list.children.length) parent.append(list);
  }
  function card(parent, item, context, group) {
    const section = node('article', 'crypt-lord-report__npc'), heading = node('h4', '', item.name);
    if (item.identity) heading.append(node('span', 'crypt-lord-report__identity', item.identity));
    section.append(heading);
    if (item.experience) {
      const { level, exp, need, full, percentage } = item.experience, row = node('div', 'crypt-lord-report__experience');
      const meter = node('progress'); meter.max = 100; meter.value = percentage; meter.setAttribute('aria-label', `${item.name}战斗经验`);
      row.append(node('strong', '', `Lv.${level}${full ? '（满）' : ''}`), meter, node('span', '', `${exp}/${need}`)); section.append(row);
    }
    fields(section, [['行为链', item.behavior]]);
    if (item.statuses.length) {
      const statuses = node('ul', 'crypt-lord-report__statuses');
      for (const status of item.statuses) statuses.append(node('li', '', status));
      section.append(statuses);
    }
    fields(section, [['正在做的事', item.doing], ['位置', item.location], ['外貌', item.appearance],
      ['行动', item.action], ['长期目标', item.goal]]);
    if (item.plans.length) {
      section.append(node('h5', '', '近期打算'));
      const list = node('ol', 'crypt-lord-report__plans');
      for (const plan of item.plans) {
        const row = node('li'); row.append(node('p', '', plan.content));
        if (plan.status || plan.time) row.append(node('small', '', [plan.status, plan.time].filter(Boolean).join(' · ')));
        list.append(row);
      }
      section.append(list);
    }
    for (const [key, label] of [['history', '事件历史记录'], ['memories', '关键记忆档案']]) if (item[key].length) {
      const detail = disclosure(section, `${label} · ${item[key].length}`, context, [group, item.name, key]);
      const list = node('ul'); for (const line of item[key]) list.append(node('li', '', line)); detail.append(list);
    }
    parent.append(section);
  }
  function renderReport(report, parent, context, inline = false) {
    const root = node('div', 'crypt-lord-report'), groups = [['active', '在场人物推演'], ['offscreen', '幕后暗流涌动'], ['legacy', '旧版人物推演']];
    let body = root;
    const hasSync = groups.some(([key]) => report[key].length) || report.news.length;
    if (hasSync && inline) body = disclosure(root, '世界线同步报告', context, 'sync');
    for (const [key, label] of groups) {
      if (!report[key].length) continue;
      const section = node('section', `crypt-lord-report__group crypt-lord-report__group--${key}`);
      section.append(node('h3', '', `${label} · ${report[key].length}`));
      for (const item of report[key]) card(section, item, context, key);
      body.append(section);
    }
    if (report.news.length) {
      const newspaper = disclosure(body, `日报与传闻 · ${report.news.length}`, context, 'news', !inline);
      newspaper.classList.add('crypt-lord-report__news');
      newspaper.append(node('h3', '', 'The Backlund Gazette'));
      for (const item of report.news) {
        const article = node('article'); if (item.date) article.append(node('h4', '', item.date));
        article.append(node('p', '', item.content)); newspaper.append(article);
      }
    }
    if (report.worldLog) {
      const log = disclosure(root, '世界运行报告', context, 'log', !inline);
      if (report.worldLog.time) log.append(node('p', 'crypt-lord-report__time', report.worldLog.time));
      log.append(node('pre', 'crypt-lord-report__log', report.worldLog.body));
    }
    for (const warning of report.warning) root.append(node('p', 'crypt-lord-report__warning', warning));
    if (!report.hasContent) root.append(node('p', 'crypt-lord-report__empty', '本楼层没有世界线报告'));
    parent.append(root);
  }
  function controls() {
    if (!state.panel) return;
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.reload.disabled = state.busy || state.generating;
    state.select.disabled = state.busy || state.generating || !state.select.options.length;
  }
  function close(returnFocus = true) {
    state.token++; state.busy = false; state.loaded = null; state.panel?.setAttribute('data-open', 'false');
    state.main?.replaceChildren(); controls();
    if (returnFocus && state.focus?.isConnected) state.focus.focus();
    state.focus = null;
  }
  async function reload() {
    if (!state.panel || state.panel.dataset.open !== 'true' || state.generating || state.disposed) return false;
    const token = ++state.token, scroll = state.main.scrollTop;
    state.busy = true; state.loaded = null; state.main.replaceChildren(); controls(); state.status.textContent = '正在读取原生楼层...';
    try {
      const loaded = await service.load(state.selected, () => active(token) && !state.generating);
      if (!active(token)) return false;
      state.loaded = loaded; state.selected = loaded.report.messageId;
      fillFloors(loaded.floors);
      renderReport(loaded.report, state.main, ['window', state.selected]); state.main.scrollTop = scroll;
      state.status.textContent = `#${state.selected} · ${loaded.report.source === 'native-data' ? '原生变量' : '旧版文本'} · 只读`;
      return true;
    } catch (error) {
      if (active(token)) {
        state.select.replaceChildren();
        if (error.code === 'REPORT_FLOOR_UNAVAILABLE') fillFloors(error.floors, true);
        state.status.textContent = `读取失败：${error.message || error}`;
      }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  function fillFloors(floors, unavailable = false) {
    state.select.replaceChildren(...floors.slice().reverse().map(row => {
      const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
      option.value = row.messageId; option.selected = row.messageId === state.selected; return option;
    }));
    if (unavailable) {
      const option = node('option', '', '所选楼层已不可用'); option.value = ''; option.disabled = true; option.selected = true;
      state.select.prepend(option);
    }
  }
  function remove(id) { after.unmount(id, 'world-report'); state.mounted.delete(id); }
  function clearFloors() { for (const id of state.mounted.keys()) remove(id); }
  async function refresh() {
    if (state.disposed || state.generating) return false;
    const token = ++state.scanToken, guard = () => !state.disposed && !state.generating && token === state.scanToken;
    try {
      const result = await service.scan(guard);
      if (!guard()) return false;
      const visible = new Set();
      for (const report of result.reports) {
        const id = report.messageId, message = after.getDisplayedMessageElement(id);
        if (!message || !report.hasContent && !report.warning.length) continue;
        visible.add(id);
        const signature = JSON.stringify(report), previous = state.mounted.get(id);
        if (previous?.signature === signature && previous.node.isConnected && message.contains(previous.node)) continue;
        const container = node('section', 'crypt-lord-report-mount');
        container.setAttribute('aria-label', `楼层 #${id} 世界线报告`);
        const toolbar = node('div', 'crypt-lord-report__toolbar');
        toolbar.append(tool('在窗口查看世界线报告', 'up-right-from-square', () => void open(id)));
        container.append(toolbar); renderReport(report, container, ['floor', id], true);
        if (after.mount(id, 'world-report', container)) state.mounted.set(id, { node: container, signature });
      }
      for (const id of state.mounted.keys()) if (!visible.has(id)) remove(id);
      return true;
    } catch (error) {
      if (guard()) {
        clearFloors();
        if (state.panel?.dataset.open === 'true') state.status.textContent = `楼层报告读取失败，可重新读取：${error.message || error}`;
        console.warn(`[${KEY}] 报告读取失败，未修改楼层`, error);
      }
      return false;
    }
  }
  function queueRefresh() {
    if (state.queued || state.disposed || state.generating) return;
    state.queued = true;
    queueMicrotask(() => { state.queued = false; if (!state.disposed && !state.generating) void refresh(); });
  }
  function updated() {
    if (state.disposed) return;
    state.scanToken++; clearFloors();
    if (state.panel?.dataset.open === 'true') {
      state.token++; state.busy = false; state.loaded = null; state.main.replaceChildren(); controls();
      if (state.generating) state.status.textContent = '正在生成，等待完整楼层';
      else void reload();
    }
    queueRefresh();
  }
  function mount() {
    if (state.disposed) return false; if (state.panel) return true;
    const panel = node('section', 'crypt-lord-report-window'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '世界线同步报告');
    const header = node('header'), tools = node('div', 'crypt-lord-report__tools');
    state.reload = tool('重新读取', 'rotate-right', () => { void reload(); queueRefresh(); });
    tools.append(state.reload, tool('关闭', 'xmark', () => close()));
    header.append(node('strong', '', '世界线同步报告'), tools);
    const selector = node('label', 'crypt-lord-report-window__selector', '楼层'), select = node('select');
    select.setAttribute('aria-label', '报告楼层');
    select.addEventListener('change', () => { state.selected = Number(select.value); state.main.scrollTop = 0; void reload(); });
    selector.append(select);
    const main = node('main'), status = node('p', 'crypt-lord-report-window__status'); status.setAttribute('role', 'status');
    panel.append(header, selector, main, status); doc().body.append(panel); Object.assign(state, { panel, select, main, status });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const targets = [...panel.querySelectorAll('button,select,summary')].filter(item => !item.disabled && item.getClientRects().length);
      if (event.shiftKey && [targets[0], panel].includes(doc().activeElement)) { event.preventDefault(); targets.at(-1)?.focus(); }
      else if (!event.shiftKey && doc().activeElement === targets.at(-1)) { event.preventDefault(); targets[0]?.focus(); }
    });
    const clamp = () => {
      if (panel.dataset.open !== 'true' || !panel.style.left) return;
      const rect = panel.getBoundingClientRect();
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, rect.left))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, rect.top))}px`;
    };
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${drag.left + event.clientX - drag.x}px`; panel.style.top = `${drag.top + event.clientY - drag.y}px`;
      panel.style.transform = 'none'; clamp();
    });
    for (const event of ['pointerup', 'pointercancel']) header.addEventListener(event, () => { drag = null; });
    win().addEventListener('resize', clamp); state.subscriptions.push({ stop: () => win().removeEventListener('resize', clamp) });
    const events = after.tavernEvents() || {};
    const bind = (name, callback) => { if (name) state.subscriptions.push(after.bindEvent(name, callback)); };
    bind(events.CHAT_CHANGED, () => {
      state.scanToken++; clearFloors(); close(false); state.selected = null; state.folds.clear(); state.generating = false; queueRefresh();
    });
    bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (['quiet', 'dryRun'].includes(type) || dryRun || options?.dryRun || options?.quiet_prompt) return;
      state.generating = true; updated();
    });
    for (const name of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
      bind(name, () => { state.generating = false; updated(); });
    for (const name of new Set([events.CHARACTER_MESSAGE_RENDERED, events.USER_MESSAGE_RENDERED, events.MESSAGE_UPDATED,
      events.MESSAGE_DELETED, events.MESSAGE_SWIPED, events.MESSAGE_RECEIVED].filter(Boolean))) bind(name, updated);
    win().addEventListener('cryptLord:variables-updated', updated);
    state.subscriptions.push({ stop: () => win().removeEventListener('cryptLord:variables-updated', updated) });
    const chat = doc().querySelector('#chat'), Observer = win().MutationObserver;
    if (chat && Observer) {
      state.observer = new Observer(records => {
        // Ignore our own mounting and details toggles; repair native replacement/pagination only.
        if (records.some(item => !item.target.closest?.('.crypt-lord-after-native-stack') &&
          [...item.addedNodes, ...item.removedNodes].some(value => value.nodeType === 1 &&
            (value.matches?.('.mes,.mes_text') || value.querySelector?.('.mes,.mes_text'))))) queueRefresh();
      });
      state.observer.observe(chat, { childList: true, subtree: true });
    }
    controls(); queueRefresh(); return true;
  }
  async function open(messageId = null) {
    if (!mount()) return false;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.panel.dataset.open = 'true'; state.selected = messageId; state.main.scrollTop = 0; state.panel.focus();
    if (state.generating) { state.status.textContent = '正在生成，等待完整楼层'; controls(); return true; }
    return reload();
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !state.disposed, busy: state.busy, reports: state.mounted.size }),
    mount, open, close, reload, refresh,
    dispose() {
      close(false); state.disposed = true; state.scanToken++; clearFloors(); state.folds.clear(); state.observer?.disconnect();
      state.subscriptions.forEach(item => item?.stop()); state.panel?.remove(); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
