(() => {
  'use strict';
  const KEY = 'cryptLord.cashflowUi', root = window.cryptLord, contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.cashflow'], after = modules?.['cryptLord.afterNativeHost'];
  if (!service || !after || !contract) throw Error('钱包与收支界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { disposed: false, token: 0, busy: false, selected: null, panel: null, focus: null,
    generating: false, subscriptions: [], observer: null };
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
  function controls() {
    if (!state.panel) return;
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.reload.disabled = state.busy || state.generating;
    state.select.disabled = state.busy || state.generating || !state.select.options.length;
  }
  function close(returnFocus = true) {
    state.token++; state.busy = false; state.panel?.setAttribute('data-open', 'false'); state.main?.replaceChildren(); controls();
    if (returnFocus && state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  function render(report) {
    const wallet = node('section', 'crypt-lord-cashflow__wallet'); wallet.append(node('h3', '', '钱包'));
    if (!report.countries.some(group => group.coins.length)) wallet.append(node('p', '', report.warnings.length ? '暂无有效余额' : '身无分文'));
    for (const group of report.countries) {
      if (!group.coins.length) continue;
      const country = node('div', 'crypt-lord-cashflow__country'); country.append(node('h4', '', group.name));
      const list = node('ul');
      for (const coin of group.coins) list.append(node('li', coin.value < 0 ? 'crypt-lord-cashflow__loss' : '', `${coin.value} ${coin.name}`));
      country.append(list); wallet.append(country);
    }
    state.main.append(wallet);
    for (const [key, title, sign] of [['income', '月入（除产业外）', 1], ['expense', '月出（除产业外）', -1]]) {
      const group = report[key], section = node('section', `crypt-lord-cashflow__${key}`);
      const head = node('header'), total = service.totals(group.buckets, sign);
      head.append(node('h3', '', title), node('p', sign > 0 ? 'crypt-lord-cashflow__gain' : 'crypt-lord-cashflow__loss', `合计  ${total || '无'}`));
      section.append(head);
      if (!group.lines.length) section.append(node('p', '', sign > 0 ? '暂无稳定收入' : '暂无稳定支出'));
      for (const line of group.lines) {
        const row = node('article'); row.append(node('h4', '', line.name));
        if (line.invalid) row.append(node('p', 'crypt-lord-cashflow__warning', '未计入汇总（金额或周期无效）'));
        else {
          row.append(node('p', '', `${line.period} ${line.value} ${line.currency}`),
            node('p', sign > 0 ? 'crypt-lord-cashflow__gain' : 'crypt-lord-cashflow__loss',
              `折合每月 ${sign > 0 ? '+' : '-'}${line.monthly} ${line.currency}`),
            node('small', '', line.last ? `上次结算  ${line.last}` : '上次结算  尚未起算（下一次过期后再入账）'));
        }
        section.append(row);
      }
      state.main.append(section);
    }
    const history = node('section'); history.append(node('h3', '', '最近货币变动'));
    if (!report.history.length) history.append(node('p', '', '暂无变动记录'));
    for (const line of report.history) {
      const row = node('article'); row.append(node('h4', '', line.time), node('p', '', line.text)); history.append(row);
    }
    state.main.append(history);
    for (const warning of report.warnings) state.main.append(node('p', 'crypt-lord-cashflow__warning', warning));
  }
  function fillFloors(floors, unavailable = false) {
    state.select.replaceChildren(...floors.slice().reverse().map(row => {
      const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
      option.value = row.messageId; option.selected = row.messageId === state.selected; return option;
    }));
    if (unavailable) {
      const option = node('option', '', '所选楼层已不可用'); option.disabled = true; option.selected = true; option.value = '';
      state.select.prepend(option);
    }
  }
  async function reload() {
    if (!state.panel || state.panel.dataset.open !== 'true' || state.generating || state.disposed) return false;
    const token = ++state.token, scroll = state.main.scrollTop;
    state.busy = true; state.main.replaceChildren(); controls(); state.status.textContent = '正在读取原生楼层...';
    try {
      const loaded = await service.load(state.selected, () => active(token) && !state.generating);
      if (!active(token)) return false;
      state.selected = loaded.report.messageId; fillFloors(loaded.floors); render(loaded.report); state.main.scrollTop = scroll;
      state.status.textContent = `#${state.selected} · 原生楼层钱包 · 只读`; return true;
    } catch (error) {
      if (active(token)) {
        state.select.replaceChildren();
        if (error.code === 'CASHFLOW_FLOOR_UNAVAILABLE') fillFloors(error.floors, true);
        state.status.textContent = `读取失败：${error.message || error}`;
      }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  function updated() {
    if (state.disposed || state.panel?.dataset.open !== 'true') return;
    state.token++; state.busy = false; state.main.replaceChildren(); controls();
    if (state.generating) state.status.textContent = '正在生成，等待完整楼层';
    else void reload();
  }
  function mount() {
    if (state.disposed) return false; if (state.panel) return true;
    const panel = node('section', 'crypt-lord-cashflow'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '钱包与稳定收支');
    const header = node('header'), tools = node('div', 'crypt-lord-cashflow__tools');
    state.reload = tool('重新读取', 'rotate-right', () => void reload());
    tools.append(state.reload, tool('关闭', 'xmark', () => close())); header.append(node('strong', '', '钱包与稳定收支'), tools);
    const label = node('label', 'crypt-lord-cashflow__selector', '楼层'), select = node('select');
    select.setAttribute('aria-label', '收支楼层');
    select.addEventListener('change', () => { state.selected = Number(select.value); state.main.scrollTop = 0; void reload(); });
    label.append(select);
    const main = node('main'), status = node('p', 'crypt-lord-cashflow__status'); status.setAttribute('role', 'status');
    panel.append(header, label, main, status); doc().body.append(panel); Object.assign(state, { panel, select, main, status });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button,select')].filter(item => !item.disabled && item.getClientRects().length);
      if (event.shiftKey && [controls[0], panel].includes(doc().activeElement)) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && doc().activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
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
    const events = after.tavernEvents() || {}, bind = (name, callback) => { if (name) state.subscriptions.push(after.bindEvent(name, callback)); };
    bind(events.CHAT_CHANGED, () => { close(false); state.selected = null; state.generating = false; });
    bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (type === 'quiet' || dryRun || options?.dryRun) return;
      state.generating = true; updated();
    });
    for (const name of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
      bind(name, () => { state.generating = false; updated(); });
    for (const name of new Set([events.MESSAGE_UPDATED, events.MESSAGE_DELETED, events.MESSAGE_SWIPED,
      events.MESSAGE_RECEIVED, events.CHARACTER_MESSAGE_RENDERED].filter(Boolean))) bind(name, updated);
    win().addEventListener('cryptLord:variables-updated', updated);
    state.subscriptions.push({ stop: () => win().removeEventListener('cryptLord:variables-updated', updated) });
    const chat = doc().querySelector('#chat'), Observer = win().MutationObserver;
    if (chat && Observer) {
      state.observer = new Observer(records => {
        if (records.some(item => item.type === 'attributes' || !item.target.closest?.('.crypt-lord-after-native-stack,.crypt-lord-before-native-stack') &&
          [...item.addedNodes, ...item.removedNodes].some(value => value.nodeType === 1 &&
            (value.matches?.('.mes,.mes_text') || value.querySelector?.('.mes,.mes_text'))))) updated();
      });
      state.observer.observe(chat, { childList: true, subtree: true, attributes: true,
        attributeFilter: ['mesid', 'is_user', 'is_system', 'is_hidden'] });
    }
    controls(); return true;
  }
  async function open(messageId = null) {
    if (!mount()) return false;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.panel.dataset.open = 'true'; state.selected = messageId; state.main.scrollTop = 0; state.panel.focus();
    state.generating = service.status().generating;
    if (state.generating) { state.status.textContent = '正在生成，等待完整楼层'; controls(); return true; }
    return reload();
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !state.disposed, busy: state.busy }), mount, open, close, reload,
    dispose() {
      close(false); state.disposed = true; state.observer?.disconnect(); state.subscriptions.forEach(item => item?.stop());
      state.panel?.remove(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
