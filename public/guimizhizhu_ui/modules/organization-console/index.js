(() => {
  'use strict';

  const KEY = 'cryptLord.organizationConsole';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const INDUSTRY_KEY = 'cryptLord.industryState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const host = root.__stage1Modules?.[HOST_KEY];
  if (!host) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const industryState = modules[INDUSTRY_KEY];
  if (!industryState) throw new Error(`[${KEY}] core/industry-state.js 尚未加载`);

  const SPECS = Object.freeze({
    industry: Object.freeze({
      title: '我的产业',
      keys: Object.freeze(['产业', '产业数据', 'industries', 'industry']),
      singular: '产业',
      defaultRecord: Object.freeze({ 名称: '新产业' }),
    }),
    faction: Object.freeze({
      title: '势力管理',
      keys: Object.freeze(['势力', '势力数据', 'factions', 'faction']),
    }),
  });
  const state = { mask: null, dialog: null, body: null, kind: null, targetId: null, data: null, source: null,
    pathways: {}, rules: null, loaded: null, stale: false, draftBaseline: '', controls: null,
    drag: null, resizer: null, busy: false, epoch: 0, openSequence: 0, subscription: null, disposed: false,
    factionRows: [], selected: '', filter: '', returnFocus: null, floorSubscriptions: [], generating: false, pending: null };

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) { return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function document() { return host.getHost()?.document || window.document; }
  function windowForDocument() { return document().defaultView || window; }
  function notify(message, level = 'info') { const fn = window.toastr?.[level]; if (typeof fn === 'function') fn(message); }
  function element(tag, className, text) { const node = document().createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function button(label, className, handler) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('pointerdown', event => {
      // Keep change-triggered row refreshes from removing the command before its click.
      if (state.kind === 'industry' && document().activeElement?.matches('input, textarea')) event.preventDefault();
    });
    node.addEventListener('click', handler);
    return node;
  }
  function field(recordValue, names, fallback = '') { for (const name of names) if (recordValue?.[name] !== undefined && recordValue[name] !== null) return recordValue[name]; return fallback; }
  function inputValue(node, prior) { return typeof prior === 'number' && node.value.trim() ? Number(node.value) : node.value; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function findSource(data, keys) {
    for (const domain of ['stat_data', 'world_data']) {
      const domainData = record(data?.[domain]) ? data[domain] : {};
      for (const key of keys) if (domainData[key] !== undefined) return { domain, key, value: domainData[key] };
    }
    return { domain: 'stat_data', key: keys[0], value: undefined };
  }
  function rowsFrom(value) {
    if (Array.isArray(value)) return value.map((item, index) => ({ id: String(index), value: record(item) ? item : { 名称: String(item ?? '') } }));
    if (record(value)) return Object.entries(value).filter(([key]) => key !== '$meta').map(([key, item]) => ({ id: key, value: record(item) ? item : { 名称: key, 数值: item } }));
    return [];
  }
  function currentRows() { return rowsFrom(state.source?.value); }
  function dirty() { return state.kind === 'industry' && state.source && JSON.stringify(state.source.value) !== state.draftBaseline; }
  function current() {
    return !state.disposed && modules[KEY] === api && modules[INDUSTRY_KEY] === industryState &&
      modules[HOST_KEY] === host && state.dialog?.ownerDocument === document() && state.mask?.dataset.open === 'true';
  }
  function editable() { return current() && state.loaded?.editable && !state.stale && !state.busy && !state.pending && !state.generating; }
  function recoveryControls() {
    const recovery = state.body.querySelector('[data-industry-recovery]');
    if (!recovery) return;
    recovery.replaceChildren();
    const phase = state.pending?.transaction.status();
    if (!state.pending) return;
    const retry = button(phase === 'uncertain' ? '核对保存' : '重试保存',
      'crypt-lord-organization-console__button is-primary', () => void save(true));
    retry.disabled = state.busy || state.stale || state.generating || !['pending', 'uncertain'].includes(phase);
    const discard = button('放弃结果并重新读取', 'crypt-lord-organization-console__button',
      () => void open('industry', state.targetId, true));
    discard.disabled = state.busy || state.generating; recovery.append(retry, discard);
  }
  function industryStatus(text) {
    state.dialog.querySelector('header span').textContent = text ||
      (state.generating ? '正文生成中，暂不可修改' : state.stale ? '来源已变化，请重新读取' : state.busy ? '保存中' :
        `${state.loaded?.reason || (dirty() ? '未保存' : '已读取')} · ${state.rules?.source || ''}`);
    if (state.controls) state.controls.disabled = !editable();
    state.body.querySelectorAll('[data-industry-command]').forEach(node => { node.disabled = !editable(); });
    const refresh = state.body.querySelector('[data-industry-refresh]');
    if (refresh) refresh.disabled = state.busy || state.generating;
    recoveryControls();
  }
  function close(force = false) {
    if (!force && state.pending && !windowForDocument().confirm('关闭将放弃本次待保存结果；若已发出保存，请重新打开后核对实际楼层。确定关闭？')) return;
    if (!force && !state.pending && !state.busy && dirty() && !windowForDocument().confirm('关闭产业管理？未保存的草稿会保留至重新读取或切换聊天。')) return;
    state.openSequence++;
    state.pending = null;
    state.busy = false;
    state.drag = null;
    if (state.mask) state.mask.dataset.open = 'false';
    state.returnFocus?.focus?.();
  }
  function dragDialog(header) {
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = state.dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const view = windowForDocument();
      const width = state.dialog.offsetWidth;
      const height = state.dialog.offsetHeight;
      state.dialog.style.left = `${clamp(state.drag.left + event.clientX - state.drag.x, 8, view.innerWidth - width - 8)}px`;
      state.dialog.style.top = `${clamp(state.drag.top + event.clientY - state.drag.y, 8, view.innerHeight - height - 8)}px`;
      state.dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
  }
  function mount() {
    if (state.disposed) return false;
    if (state.mask) return state.mask.isConnected && state.mask.ownerDocument === document();
    const body = document().body;
    if (!body) return false;
    const mask = element('section', 'crypt-lord-organization-console');
    mask.dataset.open = 'false';
    mask.innerHTML = '<section class="crypt-lord-organization-console__dialog" role="dialog" aria-modal="true"><header><strong data-console-title></strong><span>真实 assistant 楼层数据</span><button type="button" data-console-close title="关闭">×</button></header><div class="crypt-lord-organization-console__body" data-console-body></div></section>';
    state.mask = mask;
    state.dialog = mask.querySelector('.crypt-lord-organization-console__dialog');
    state.dialog.tabIndex = -1;
    mask.querySelector('[data-console-close]').setAttribute('aria-label', '关闭');
    state.body = mask.querySelector('[data-console-body]');
    mask.addEventListener('click', event => { if (event.target === mask || event.target?.dataset?.consoleClose !== undefined) close(); });
    mask.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...state.dialog.querySelectorAll('button, input, select, textarea, summary')]
        .filter(node => !node.matches(':disabled') && node.getClientRects().length && node.checkVisibility());
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); state.dialog.focus(); }
      else if (event.shiftKey && (document().activeElement === first || document().activeElement === state.dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && [last, state.dialog].includes(document().activeElement)) {
        event.preventDefault(); first?.focus();
      }
    });
    dragDialog(mask.querySelector('header'));
    body.appendChild(mask);
    const Resize = windowForDocument().ResizeObserver;
    if (Resize) {
      state.resizer = new Resize(() => {
        if (state.mask?.dataset.open !== 'true' || state.kind !== 'industry') return;
        const view = windowForDocument(), rect = state.dialog.getBoundingClientRect();
        const left = clamp(rect.left, 8, view.innerWidth - rect.width - 8);
        const top = clamp(rect.top, 8, view.innerHeight - rect.height - 8);
        if (left !== rect.left || top !== rect.top) {
          state.dialog.style.left = `${left}px`; state.dialog.style.top = `${top}px`;
          state.dialog.style.transform = 'none';
        }
      });
      state.resizer.observe(state.dialog);
    }
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, () => {
      state.epoch++;
      state.generating = false;
      state.source = null; state.loaded = null; state.draftBaseline = '';
      close(true);
    });
    if (events?.GENERATION_STARTED) state.floorSubscriptions.push(host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      const info = typeof type === 'object' ? type : options, kind = typeof type === 'string' ? type : info?.type;
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(kind) || info?.quiet_prompt || info?.dryRun ||
        info?.options?.quiet_prompt || info?.options?.dryRun || dryRun) return;
      state.generating = true;
      if (state.kind === 'faction') {
        state.openSequence++; state.stale = true;
        if (state.mask?.dataset.open === 'true') factionUnavailable('正文生成中，请结束后重新读取势力');
        return;
      }
      if (state.kind !== 'industry') return;
      state.openSequence++; state.busy = false; state.stale = true;
      if (state.mask?.dataset.open === 'true') {
        if (!state.source) {
          const retry = button('重新读取', '', () => { void open('industry', state.targetId, true); });
          retry.dataset.industryRefresh = '';
          state.body.replaceChildren(element('p', '', '正文生成中'), retry);
        }
        industryStatus();
      }
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
      state.floorSubscriptions.push(host.bindEvent(event, () => {
        const wasGenerating = state.generating;
        state.generating = false;
        if (wasGenerating && state.kind === 'faction' && state.mask?.dataset.open === 'true')
          factionUnavailable('生成已结束，请重新读取势力');
        if (state.kind === 'industry' && state.mask?.dataset.open === 'true') industryStatus();
      }));
    }
    for (const name of ['MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED', 'MESSAGE_SENT']) {
      if (!events?.[name]) continue;
      state.floorSubscriptions.push(host.bindEvent(events[name], id => {
        if (state.kind === 'faction' && state.mask?.dataset.open === 'true' && Number(id) === Number(state.targetId))
          void openFaction(state.targetId, true);
        if (state.kind === 'industry' && state.mask?.dataset.open === 'true' && !state.busy &&
          (name === 'MESSAGE_DELETED' || Number(id) >= Number(state.targetId))) {
          state.stale = true; industryStatus();
        }
      }));
    }
    if (events?.MESSAGE_RECEIVED) state.floorSubscriptions.push(host.bindEvent(events.MESSAGE_RECEIVED, () => {
      if (state.kind === 'industry' && state.mask?.dataset.open === 'true' && !state.busy) {
        state.stale = true; industryStatus();
      }
    }));
    return true;
  }
  function metric(label, value) { const item = element('div', 'crypt-lord-organization-console__metric'); item.append(element('span', '', label), element('strong', '', String(value))); return item; }
  function iconButton(title, icon, handler) {
    const node = button('', 'crypt-lord-organization-console__icon', handler);
    node.title = title;
    node.setAttribute('aria-label', title);
    const glyph = element('i', `fa-solid fa-${icon}`);
    glyph.setAttribute('aria-hidden', 'true');
    node.appendChild(glyph);
    return node;
  }
  function factionSection(parent, title) {
    const section = element('section', 'crypt-lord-organization-console__faction-section');
    section.appendChild(element('h3', '', title));
    parent.appendChild(section);
    return section;
  }
  function dataLine(parent, title, value) {
    const line = element('div', 'crypt-lord-organization-console__data-line');
    line.append(element('span', '', title), element('strong', '', String(value ?? '')));
    parent.appendChild(line);
  }
  function renderFactionDetail(parent, row) {
    const service = modules['cryptLord.factionState'];
    const faction = row.faction;
    const identity = element('div', 'crypt-lord-organization-console__faction-title');
    identity.append(element('h2', '', faction.势力名 || faction.名称 || row.key),
      element('span', '', faction.势力类型 || '未知'));
    parent.appendChild(identity);
    const metrics = element('div', 'crypt-lord-organization-console__metrics');
    metrics.append(metric('我的职位', faction['<User>的职位'] || '无'),
      metric('人口数量', row.population), metric('锚的供给量', faction.锚的供给量),
      metric('锚的需求', faction.锚的需求 === '' ? '未指定' : faction.锚的需求));
    parent.append(metrics, element('p', 'crypt-lord-organization-console__overview', faction.势力概述 || '暂无概述'));
    const gods = factionSection(parent, '直辖半神与真神');
    for (const [key, god] of row.gods) {
      const item = element('div', 'crypt-lord-organization-console__faction-row');
      item.append(element('strong', '', god['半神/真神名称'] || '未知'), element('span', '', key));
      dataLine(item, '序列', god.序列 || '未知');
      dataLine(item, '职位', god.职位 || '未知');
      gods.appendChild(item);
    }
    if (!row.gods.length) gods.appendChild(element('p', '', '暂无直辖神祇'));
    const regions = factionSection(parent, '实控区域');
    dataLine(regions, '汇总名单', faction.实控区域.实控区域汇总名单 || '无');
    dataLine(regions, '总面积', `${faction.实控区域.总面积} 平方公里`);
    for (const [key, region] of row.regions) {
      const item = element('div', 'crypt-lord-organization-console__faction-row');
      item.appendChild(element('strong', '', region.区域名 || key));
      dataLine(item, '类型', region.区域类型 || '未知');
      dataLine(item, '面积', `${region.区域面积 || 0} 平方公里`);
      dataLine(item, '核心', region.区域核心 || '无');
      dataLine(item, '人口', service.hasPopulation(region.区域类型) ? region.区域人口 || 0 : '该区域类型不适用人口概念');
      item.appendChild(element('p', '', region.区域概述 || '暂无概述'));
      regions.appendChild(item);
    }
    const army = factionSection(parent, '世俗军队');
    for (const { branch, units } of row.armies) {
      army.appendChild(element('h4', '', branch));
      for (const [key, unit] of units) {
        const item = element('div', 'crypt-lord-organization-console__faction-row');
        item.appendChild(element('strong', '', unit.部队名 || key));
        dataLine(item, '类型 / 精锐', `${unit.部队类型 || '未知'} / ${unit.部队精锐等级 || '1级'}`);
        dataLine(item, '数量', unit.部队数量 || 0);
        army.appendChild(item);
      }
      if (!units.length) army.appendChild(element('p', '', '暂无部队'));
    }
    const demand = factionSection(parent, '生产力需求');
    const table = element('table', 'crypt-lord-organization-console__demand');
    const head = element('tr');
    ['等级', '农产品', '工业品', '服务'].forEach(label => head.appendChild(element('th', '', label)));
    const thead = element('thead'); thead.appendChild(head); table.appendChild(thead);
    const tbody = element('tbody');
    for (let level = 1; level <= 5; level++) {
      const line = element('tr');
      line.appendChild(element('th', '', `${level}级`));
      for (const type of ['农产品', '工业品', '服务']) line.appendChild(element('td', '', faction.势力生产力总需求[`${level}级${type}需求`]));
      tbody.appendChild(line);
    }
    table.appendChild(tbody); demand.appendChild(table);
  }
  function renderFactions() {
    state.body.replaceChildren();
    const toolbar = element('div', 'crypt-lord-organization-console__toolbar');
    const search = element('input');
    search.type = 'search';
    search.placeholder = '搜索势力';
    search.setAttribute('aria-label', '搜索势力');
    search.value = state.filter;
    toolbar.append(search, iconButton('重新读取势力', 'rotate-right', () => { void openFaction(state.targetId, true); }));
    state.body.appendChild(toolbar);
    const layout = element('div', 'crypt-lord-organization-console__faction-layout');
    const nav = element('nav', 'crypt-lord-organization-console__faction-nav');
    nav.setAttribute('aria-label', '势力列表');
    const detail = element('div', 'crypt-lord-organization-console__faction-detail');
    function refresh() {
      nav.replaceChildren(); detail.replaceChildren();
      const rows = state.factionRows.filter(row => String(row.faction.势力名 || row.faction.名称 || row.key).includes(state.filter.trim()));
      if (!rows.some(row => row.key === state.selected)) state.selected = rows[0]?.key || '';
      for (const row of rows) {
        const node = button('', 'crypt-lord-organization-console__faction-choice', () => {
          state.selected = row.key; refresh();
          [...nav.children].find(child => child.dataset.key === row.key)?.focus();
        });
        node.dataset.key = row.key;
        node.setAttribute('aria-current', String(row.key === state.selected));
        node.append(element('strong', '', row.faction.势力名 || row.faction.名称 || row.key),
          element('span', '', `${row.faction.势力类型 || '未知'}${row.faction.$投影 ? ' · 领地' : ''}`));
        nav.appendChild(node);
      }
      const selected = rows.find(row => row.key === state.selected);
      if (selected) renderFactionDetail(detail, selected);
      else detail.appendChild(element('p', 'crypt-lord-organization-console__empty', state.filter ? '没有匹配的势力' : '暂无势力数据'));
    }
    search.addEventListener('input', () => { state.filter = search.value; refresh(); });
    layout.append(nav, detail); state.body.appendChild(layout); refresh();
  }
  function factionUnavailable(text) {
    state.dialog.querySelector('header span').textContent = text;
    const retry = button('重新读取势力', 'crypt-lord-organization-console__button',
      () => { void openFaction(state.targetId, true); });
    retry.disabled = state.generating;
    state.body.replaceChildren(element('p', 'crypt-lord-organization-console__error', text), retry);
  }
  async function openFaction(messageId = null, reread = false) {
    if (state.generating) return false;
    if (state.busy || state.pending) { state.dialog?.focus(); return false; }
    if (dirty() && !windowForDocument().confirm('切换到势力管理并放弃未保存的产业草稿？')) return false;
    if (!mount()) return false;
    const same = state.kind === 'faction' && state.mask.dataset.open === 'true' && state.targetId === messageId;
    if (same && !reread) { state.dialog.focus(); return true; }
    const scroll = same ? state.body.scrollTop : 0;
    const sequence = ++state.openSequence, epoch = state.epoch;
    const ownerDocument = document(), reader = modules['cryptLord.nativeFloorSource'],
      factionService = modules['cryptLord.factionState'];
    state.returnFocus = state.mask.dataset.open === 'true' ? state.returnFocus : document().activeElement;
    state.kind = 'faction'; state.targetId = messageId;
    if (!same) { state.filter = ''; state.selected = ''; }
    state.source = null; state.loaded = null; state.controls = null;
    state.dialog.dataset.kind = 'faction';
    state.dialog.setAttribute('aria-label', '势力管理');
    state.mask.dataset.open = 'true';
    state.dialog.querySelector('[data-console-title]').textContent = `势力管理 · 楼层 #${messageId}`;
    state.dialog.querySelector('header span').textContent = '读取中';
    state.body.replaceChildren(element('p', '', '正在读取势力'));
    state.dialog.focus();
    const active = () => sequence === state.openSequence && epoch === state.epoch && !state.disposed &&
      !state.generating && modules[KEY] === api && modules[HOST_KEY] === host &&
      modules['cryptLord.factionState'] === factionService && modules['cryptLord.nativeFloorSource'] === reader &&
      state.mask.isConnected && state.mask.dataset.open === 'true' && state.mask.ownerDocument === ownerDocument &&
      document() === ownerDocument;
    try {
      const service = await contract.waitGlobalInitialized('cryptLord.factionState', { timeoutMs: 10000 });
      const loaded = await service.loadNative(messageId, active);
      await service.assertNative(loaded, active);
      if (!active()) return false;
      state.loaded = loaded; state.stale = false; state.data = loaded.data;
      state.targetId = loaded.floor.message_id;
      state.dialog.querySelector('[data-console-title]').textContent = `势力管理 · 楼层 #${state.targetId}`;
      state.source = findSource(state.data, SPECS.faction.keys);
      state.factionRows = loaded.rows;
      state.dialog.querySelector('header span').textContent = `${loaded.reason} · ${loaded.rules.source}`;
      renderFactions();
      state.body.scrollTop = scroll;
      if (loaded.rules.warnings.length) notify(`部分势力配置无效，使用默认规则：${loaded.rules.warnings[0]}`, 'warning');
      return true;
    } catch (error) {
      if (!active()) return false;
      state.dialog.querySelector('header span').textContent = '读取失败';
      state.body.replaceChildren(element('p', 'crypt-lord-organization-console__error', `读取失败：${error.message}`),
        button('重试', 'crypt-lord-organization-console__button', () => { void openFaction(messageId, true); }));
      return false;
    } finally {
      if (sequence === state.openSequence && !active() && state.mask?.dataset.open === 'true') {
        state.stale = true; close(true);
      }
    }
  }
  function editableLine(label, prior, onChange, multiline = false, refresh = false) {
    const line = element('label', 'crypt-lord-organization-console__line');
    line.appendChild(element('span', '', label));
    const input = element(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = typeof prior === 'number' ? 'number' : 'text';
    else input.rows = 3;
    input.setAttribute('aria-label', label);
    input.value = String(prior ?? '');
    input.addEventListener('input', () => { onChange(inputValue(input, prior)); industryStatus(); });
    input.addEventListener('change', () => { if (editable() && refresh) renderRows(); });
    if (label === '利润倍率') {
      input.min = '0'; input.max = '5'; input.step = '0.05';
      input.title = '最终周收益倍率，每周以 0.05 向 1 收敛';
    }
    line.appendChild(input);
    return line;
  }
  function renderIndustry() {
    const summary = industryState.dashboard(state.source.value, state.rules.config, industry => ({
      ...industry, ...industryState.principal(industry, state.data, state.pathways, state.source.value).fields,
    }));
    const metrics = element('div', 'crypt-lord-organization-console__metrics');
    metrics.append(metric('产业总估值', summary.valuation), metric('产业数量', summary.count),
      metric('预计总月收益', summary.monthlyReturn), metric('平均回报率', `${summary.averageRate}%`));
    const dashboard = element('details', 'crypt-lord-organization-console__dashboard');
    dashboard.open = true;
    dashboard.append(element('summary', '', '经营总览'), metrics);
    const output = element('div', 'crypt-lord-organization-console__production');
    output.appendChild(element('strong', '', '预计总月产出'));
    output.appendChild(element('span', '', summary.production.length
      ? summary.production.map(([name, amount]) => `${name} ${amount}`).join(' · ') : '暂无产出'));
    dashboard.appendChild(output);
    state.body.appendChild(dashboard);
  }
  function updateEntry(entry, key, value) { entry.value[key] = value; }
  function industryCard(entry, index, expanded) {
    const industry = entry.value;
    const principal = industryState.principal(industry, state.data, state.pathways, state.source.value);
    const perf = industryState.evaluate({ ...industry, ...principal.fields }, state.rules.config);
    const card = element('article', 'crypt-lord-organization-console__card crypt-lord-organization-console__industry');
    card.dataset.id = entry.id;
    const title = element('div', 'crypt-lord-organization-console__card-title');
    const identity = element('div', 'crypt-lord-organization-console__industry-identity');
    identity.append(element('strong', '', String(field(industry, ['名称'], `产业${index + 1}`))),
      element('span', '', `${industry.类型 || '未知类型'} · ${perf.scale}`));
    title.appendChild(identity);
    const remove = iconButton(`删除 ${industry.名称 || entry.id}`, 'trash-can', () => {
      if (!editable()) return;
      if (!windowForDocument().confirm('删除该产业记录？')) return;
      if (Array.isArray(state.source.value)) state.source.value.splice(Number(entry.id), 1);
      else delete state.source.value[entry.id];
      renderRows();
    });
    remove.classList.add('crypt-lord-organization-console__delete');
    title.appendChild(remove);
    card.appendChild(title);
    const overview = element('div', 'crypt-lord-organization-console__industry-overview');
    overview.append(metric('当前资本', `${perf.capital} ${perf.currency}`.trim()),
      metric('月净收益', `${Math.round(perf.monthlyReturn)} ${perf.currency}`.trim()),
      metric('月回报率', `${perf.baseRate}% → ${perf.actualRate.toFixed(2)}%`),
      metric('固定成本', `${Math.round(perf.actualFixedCost)} ${perf.currency}`.trim()));
    overview.children[1].dataset.trend = perf.monthlyReturn < 0 ? 'loss' : 'profit';
    card.appendChild(overview);
    const details = element('details', 'crypt-lord-organization-console__industry-details');
    details.dataset.id = entry.id;
    details.open = expanded.has(entry.id);
    details.appendChild(element('summary', '', '经营详情与生产分配'));
    const content = element('div', 'crypt-lord-organization-console__industry-content');
    const principalStatus = element('div', 'crypt-lord-organization-console__principal');
    const stateLabel = {
      'no-principal': '未指派负责人', unrecognized: `负责人 ${principal.name} 未识别`,
      'no-relation': `负责人 ${principal.name} 关系未建立`,
    };
    const tierLabel = principal.source.startsWith('sequence-') ? `序列 ${principal.source.slice(9)}`
      : principal.source === 'old-day' ? '旧日' : principal.source === 'pillar' ? '支柱' : '普通人';
    const specialty = principal.specialty === 'matched' ? ` · 偏科 ${principal.pathway} +2档`
      : principal.specialty === 'generalist' ? ` · 万金油 ${principal.pathway} +1档` : '';
    const affinityLabel = principal.affinity >= 130 ? '心腹 · BUFF满效'
      : principal.affinity >= 30 ? `BUFF ${Math.round(principal.coefficient * 100)}%`
      : principal.affinity >= 0 ? '关系冷淡 · 效率减损' : '关系恶化 · 怠工';
    principalStatus.append(
      element('strong', '', stateLabel[principal.source] ||
        `${principal.name}（${tierLabel}${specialty}）· ${principal.tier}/12档 · 好感 ${principal.affinity} · ${affinityLabel}`),
      element('span', '', !principal.name || stateLabel[principal.source] ? '负责人需在 NPC 数据和人物关系列表中。'
        : principal.lightLoad ? `轻负荷：本产业不扣好感 · 合计 -${principal.totalDeduction}/周`
        : principal.floorReached ? '好感已达地板（≤10），本周不再扣减'
        : `本产业 -${principal.weeklyDeduction}/周 · 合计 -${principal.totalDeduction}/周`),
    );
    if (principal.sources.length > 1) principalStatus.title = principal.sources.map(item => `${item.name} -${item.perWeek}/周`).join('\n');
    content.appendChild(principalStatus);
    const edit = (label, key, fallback = '') => editableLine(label, field(industry, [key], fallback), value => {
      if (!editable()) return;
      updateEntry(entry, key, value);
    }, ['产业情况概述', '资产', '收入来源'].includes(key),
    ['当前投入资本总额', '负责人'].includes(key));
    const type = element('label', 'crypt-lord-organization-console__line');
    type.appendChild(element('span', '', '类型'));
    const choices = element('select');
    ['独立领地', '第一产业', '第二产业', '第三产业'].forEach(value => {
      const option = element('option', '', value);
      option.value = value;
      choices.appendChild(option);
    });
    choices.value = String(industry.类型 || '第一产业');
    choices.setAttribute('aria-label', '类型');
    choices.addEventListener('change', () => { if (!editable()) return; industry.类型 = choices.value; renderRows(); });
    type.appendChild(choices);
    content.append(edit('名称', '名称'), type, edit('当前投入资本总额', '当前投入资本总额', '0 金镑'),
      edit('利润倍率', '利润倍率', 1), edit('负责人', '负责人'));
    const financial = element('div', 'crypt-lord-organization-console__derived');
    financial.append(metric('月毛利润', `${Math.round(perf.grossProfit)} ${perf.currency}`),
      metric('技术潜力', `×${perf.techPotential.toFixed(2)}`), metric('运营成本系数', `×${perf.costMultiplier.toFixed(2)}`),
      metric('市场系数', `×${perf.marketFactor.toFixed(2)}`), metric('规模系数', `×${perf.scalePenalty.toFixed(2)}`));
    const progress = element('progress', 'crypt-lord-organization-console__tech');
    progress.max = 1200; progress.value = perf.techIndex + 200;
    progress.setAttribute('aria-label', '技术先进度');
    content.append(financial, progress);
    const derived = element('div', 'crypt-lord-organization-console__derived');
    derived.appendChild(element('strong', '', '负责人派生经营属性'));
    for (const [label, value] of Object.entries(principal.fields)) derived.appendChild(metric(label, value));
    content.appendChild(derived);
    const lightLoad = element('label', 'crypt-lord-organization-console__light-load');
    const lightCheck = element('input');
    lightCheck.type = 'checkbox';
    lightCheck.checked = industry['$轻负荷运营'] === true;
    lightCheck.addEventListener('change', () => { if (!editable()) return; industry['$轻负荷运营'] = lightCheck.checked; renderRows(); });
    lightLoad.append(lightCheck, element('span', '', '轻负荷运营'));
    lightLoad.title = '收益减半，不扣负责人好感；生产力沿原版保持不变';
    content.appendChild(lightLoad);
    const production = element('div', 'crypt-lord-organization-console__allocation');
    production.appendChild(element('strong', '', `生产分配 · ${perf.productType} · 合计 ${perf.allocation.reduce((sum, value) => sum + value, 0)}%`));
    perf.allocation.forEach((amount, index) => {
      const level = index + 1;
      const line = element('label', 'crypt-lord-organization-console__allocation-line');
      line.appendChild(element('span', '', `${level}级`));
      const input = element('input');
      input.type = 'number';
      input.min = '0'; input.max = '100'; input.step = '1';
      input.value = String(amount);
      input.setAttribute('aria-label', `${level}级生产分配`);
      input.disabled = level > perf.maxLevel && amount === 0;
      input.addEventListener('input', () => {
        if (!editable()) return;
        entry.value[`生产分配_${level}级`] = input.value.trim() ? Number(input.value) : '';
        industryStatus();
      });
      input.addEventListener('change', () => {
        if (!editable()) return;
        try {
          if (!input.value.trim()) throw Error('分配比例不能为空');
          const next = industryState.allocation(entry.value, level, input.value, state.rules.config);
          if (Array.isArray(state.source.value)) state.source.value[Number(entry.id)] = next;
          else state.source.value[entry.id] = next;
          renderRows();
        } catch (error) {
          entry.value[`生产分配_${level}级`] = amount;
          input.value = String(amount);
          industryStatus();
          notify(error.message, 'warning');
        }
      });
      line.append(input, element('span', '', `% · 预计 ${perf.production[index]}`));
      production.appendChild(line);
    });
    content.append(production, edit('产业情况概述', '产业情况概述'),
      edit('资产', '资产'), edit('收入来源', '收入来源'));
    dataLine(content, '创建时间', industry.创建时间 || '未记录');
    dataLine(content, '上次结算', industry.上次结算时间 || '未记录');
    details.appendChild(content);
    card.appendChild(details);
    return card;
  }
  function renderRows() {
    const scrollTop = state.body.scrollTop;
    const collapsed = state.body.querySelector('.crypt-lord-organization-console__dashboard')?.open === false;
    const expanded = new Set(Array.from(state.body.querySelectorAll('.crypt-lord-organization-console__industry-details[open]'))
      .map(node => node.dataset.id));
    state.body.replaceChildren();
    const spec = SPECS[state.kind];
    const rows = currentRows();
    if (state.kind === 'industry') renderIndustry();
    if (collapsed) state.body.querySelector('.crypt-lord-organization-console__dashboard').open = false;
    const toolbar = element('div', 'crypt-lord-organization-console__toolbar');
    const controls = element('fieldset', 'crypt-lord-organization-console__controls');
    state.controls = controls;
    const createButton = button(`新建${spec.singular}`, 'crypt-lord-organization-console__button', () => {
      if (!editable()) return;
      if (state.kind === 'industry') {
        const existing = state.body.querySelector('.crypt-lord-organization-console__new-industry input');
        if (existing) { existing.focus(); return; }
        const form = element('div', 'crypt-lord-organization-console__new-industry');
        const nameInput = element('input');
        nameInput.type = 'text';
        nameInput.placeholder = '产业名称';
        nameInput.maxLength = 80;
        nameInput.setAttribute('aria-label', '产业名称');
        const create = () => {
          const name = nameInput.value.trim();
          if (!editable()) return;
          if (!name) { nameInput.focus(); return; }
          const gameTime = state.data?.world_data?.当前时间纪元 || state.data?.stat_data?.当前时间纪元 || '';
          const next = industryState.create(name, gameTime);
          const source = state.source.value;
          if (Array.isArray(source)) source.push(next);
          else {
            const base = `industry_${Date.now()}`;
            let id = base;
            for (let index = 1; Object.hasOwn(source, id); index++) id = `${base}_${index}`;
            source[id] = next;
          }
          renderRows();
        };
        nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') create(); });
        form.append(nameInput, button('创建', 'crypt-lord-organization-console__button is-primary', create),
          button('取消', 'crypt-lord-organization-console__button', () => form.remove()));
        controls.insertBefore(form, list);
        nameInput.focus();
        return;
      }
    });
    const saveButton = button('保存更改', 'crypt-lord-organization-console__button is-primary', () => { void save(); });
    createButton.dataset.industryCommand = '';
    saveButton.dataset.industryCommand = '';
    const refreshButton = iconButton('重新读取', 'rotate-right', () => { void open(state.kind, state.targetId, true); });
    refreshButton.dataset.industryRefresh = '';
    toolbar.append(createButton, saveButton, refreshButton);
    state.body.appendChild(toolbar);
    const recovery = element('div', 'crypt-lord-organization-console__toolbar');
    recovery.dataset.industryRecovery = ''; state.body.appendChild(recovery);
    const list = element('div', 'crypt-lord-organization-console__list');
    rows.forEach((entry, index) => {
      if (state.kind === 'industry') {
        list.appendChild(industryCard(entry, index, expanded));
        return;
      }
    });
    if (!rows.length) list.appendChild(element('div', 'crypt-lord-organization-console__empty', `暂无${spec.singular}。可通过剧情获得，或在此建立第一条记录。`));
    controls.appendChild(list);
    state.body.appendChild(controls);
    state.body.scrollTop = scrollTop;
    industryStatus();
  }
  async function save(recover = false) {
    if (state.kind !== 'industry' || state.busy || state.generating || !current() ||
      (recover ? !state.pending || state.stale : !editable())) return;
    const epoch = state.epoch, sequence = state.openSequence;
    const active = () => current() && epoch === state.epoch && sequence === state.openSequence && !state.generating;
    const baseline = recover ? state.pending.baseline : state.loaded;
    state.busy = true;
    industryStatus();
    try {
      if (!recover) state.pending = {
        baseline, transaction: industryState.begin(baseline, clone(state.source.value), active),
      };
      recoveryControls();
      const transaction = state.pending.transaction;
      const result = await (recover ? transaction.status() === 'uncertain' ? transaction.inspect() : transaction.save() : transaction.run());
      if (!active()) return;
      state.pending = null;
      if (!result.loaded) {
        state.source = null; state.loaded = null; state.draftBaseline = '';
        state.body.replaceChildren(element('p', 'crypt-lord-organization-console__error', result.warning),
          button('重新读取', '', () => { void open('industry', state.targetId, true); }));
        industryStatus(result.warning);
      } else {
        acceptIndustry(result.loaded);
        state.busy = false;
        renderRows();
        industryStatus(result.warning || (result.unchanged ? '没有未保存更改' : '已保存'));
      }
      notify(result.warning || (result.unchanged ? '没有未保存更改' : '产业已保存到原生楼层'), result.warning ? 'warning' : 'success');
      if (result.data && !result.unchanged) {
        try { modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
          messageId: baseline.floor.message_id, beforeData: baseline.floor.data, afterData: result.data, source: 'organization-console',
        }); } catch (error) { console.warn(`[${KEY}] 产业已保存，展示刷新失败`, error); }
      }
    } catch (error) {
      if (!active()) return;
      const phase = state.pending?.transaction.status();
      if (phase === 'failed') state.pending = null;
      if (phase === 'invalid' || /已变化|历史楼层|战斗|配置异常|取消|重新读取/.test(error.message)) state.stale = true;
      state.busy = false;
      const message = `${['pending', 'uncertain', 'invalid'].includes(phase) ? '' : '保存失败：'}${error.message || error}`;
      industryStatus(message); notify(message, 'error');
    } finally {
      if (epoch === state.epoch && sequence === state.openSequence && state.mask?.dataset.open === 'true') {
        state.busy = false;
        if (!current()) { state.stale = true; industryStatus('宿主或管理服务已变化，请重新加载界面'); }
        if (state.controls) state.controls.disabled = !editable();
        state.body.querySelectorAll('[data-industry-command]').forEach(node => { node.disabled = !editable(); });
        const refresh = state.body.querySelector('[data-industry-refresh]');
        if (refresh) refresh.disabled = state.generating;
        recoveryControls();
      }
    }
  }
  function acceptIndustry(loaded, preserve = false) {
    const prior = state.source?.value;
    state.loaded = loaded; state.rules = loaded.rules; state.pathways = loaded.rules.pathways;
    state.targetId = loaded.floor.message_id; state.data = clone(loaded.floor.data);
    state.source = clone(loaded.source);
    state.source.value ??= { $meta: { extensible: true, 总估值: '0', 上次计算时间: '' } };
    state.draftBaseline = JSON.stringify(state.source.value);
    if (preserve) state.source.value = prior;
    state.stale = false;
  }
  async function open(kind, messageId, reload = false) {
    if (!SPECS[kind]) throw new Error(`未知管理面板：${kind}`);
    if (kind === 'faction') return openFaction(messageId);
    if (!mount()) return false;
    if (state.mask.dataset.open === 'true' && (state.busy || !reload && state.kind === kind && messageId === state.targetId)) {
      state.dialog.focus(); return state.kind === kind && messageId === state.targetId;
    }
    if (state.pending && !reload) { state.dialog.focus(); return false; }
    if ((reload || messageId !== state.targetId) && (dirty() || state.pending) &&
      !windowForDocument().confirm('放弃未保存的产业更改和待保存结果并重新读取？保存状态不明时将读取实际楼层。')) return false;
    state.pending = null;
    const old = state.loaded, oldSource = state.source, priorDirty = dirty(), scrollTop = state.body.scrollTop;
    const collapsed = state.body.querySelector('.crypt-lord-organization-console__dashboard')?.open === false;
    const expanded = [...state.body.querySelectorAll('details[open]')].map(node => node.dataset.id).filter(Boolean);
    const sequence = ++state.openSequence, epoch = state.epoch;
    const active = () => current() && sequence === state.openSequence && epoch === state.epoch;
    state.returnFocus = state.mask.dataset.open === 'true' ? state.returnFocus : document().activeElement;
    state.kind = kind; state.targetId = messageId; state.busy = false;
    state.controls = null; state.dialog.dataset.kind = 'industry';
    state.dialog.setAttribute('aria-label', '我的产业');
    state.mask.dataset.open = 'true';
    state.dialog.querySelector('[data-console-title]').textContent = '我的产业';
    industryStatus('正在读取产业');
    state.body.replaceChildren(element('p', '', '正在读取产业'));
    state.dialog.focus();
    if (state.generating) {
      const retry = button('重新读取', '', () => { void open(kind, messageId, true); });
      retry.dataset.industryRefresh = '';
      state.stale = true;
      state.body.replaceChildren(element('p', '', '正文生成中'), retry);
      industryStatus();
      return false;
    }
    try {
      const loaded = await industryState.load(messageId, active);
      if (!active()) return false;
      const preserve = !reload && priorDirty && JSON.stringify(old?.floor) === JSON.stringify(loaded.floor) &&
        old?.revision === loaded.revision && old?.rules.revision === loaded.rules.revision;
      acceptIndustry(loaded, preserve);
      state.dialog.querySelector('[data-console-title]').textContent = `我的产业 · 楼层 #${state.targetId}`;
      renderRows();
      if (collapsed && old?.floor.message_id === loaded.floor.message_id)
        state.body.querySelector('.crypt-lord-organization-console__dashboard').open = false;
      for (const detail of state.body.querySelectorAll('details')) if (expanded.includes(detail.dataset.id)) detail.open = true;
      if (old?.floor.message_id === loaded.floor.message_id) state.body.scrollTop = scrollTop;
      if (loaded.rules.warnings.length) notify(loaded.rules.warnings.join('\n'), 'warning');
      return true;
    } catch (error) {
      if (!active()) return false;
      if (!reload && priorDirty && old?.floor.message_id === messageId) {
        state.source = oldSource; state.loaded = old; state.stale = true;
      } else {
        state.source = null; state.loaded = null; state.draftBaseline = '';
      }
      industryStatus('读取失败');
      state.body.replaceChildren(element('p', 'crypt-lord-organization-console__error', `读取失败：${error.message || error}`),
        button('重试', '', () => { void open(kind, messageId, true); }));
      return false;
    } finally {
      if (sequence === state.openSequence && epoch === state.epoch && state.mask?.dataset.open === 'true' && !current()) {
        state.busy = false; state.stale = true;
        industryStatus('宿主或管理服务已变化，请重新加载界面');
      }
    }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', kind: state.kind, targetId: state.targetId }); },
    mount,
    open,
    close,
    dispose() {
      state.disposed = true; state.openSequence++; state.pending = null;
      state.subscription?.stop?.();
      state.resizer?.disconnect();
      state.floorSubscriptions.forEach(subscription => subscription?.stop?.());
      state.mask?.remove(); state.mask = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
