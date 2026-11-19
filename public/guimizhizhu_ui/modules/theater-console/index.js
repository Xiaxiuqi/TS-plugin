(() => {
  'use strict';

  const KEY = 'cryptLord.theaterConsole';
  const STORE_KEY = 'cryptLord.stateStore';
  const FORGE_KEY = 'cryptLord.itemForge';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const host = root.__stage1Modules?.[HOST_KEY];
  if (!host) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const EQUIPMENT_CATEGORIES = Object.freeze(['武器列表', '衣物列表', '饰品列表', '封印物列表']);
  const ATTRIBUTES = Object.freeze(['活力', '灵性', '理智', '人性', '敏捷', '运气']);
  const forge = modules[FORGE_KEY];
  const theater = modules['cryptLord.theaterActions'];
  if (!forge) throw new Error(`[${KEY}] core/item-forge.js 尚未加载`);
  const ACTIONS = theater ? theater.actions().filter(item => item.id !== 'arena') : Object.freeze([
    Object.freeze({ label: '寻找幕后工作人员', cost: 80, loading: '消耗 80 点，正在寻找幕后人员…' }),
    Object.freeze({ label: '寻找售票工作人员', cost: 50, loading: '消耗 50 点，正在寻找售票人员…' }),
    Object.freeze({ label: '寻找剧场活动工作人员', cost: 0, loading: '正在查询剧场活动详情…' }),
  ]);
  const state = { mask: null, dialog: null, title: null, points: null, tabs: null, body: null, targetId: null,
    latestId: null, revision: null, editable: false, data: null, result: '', activeTab: 'theater', selectedEquipment: null, drag: null,
    busy: false, disposed: false, token: 0, subscription: null, cleanup: [], focus: null,
    forgeLoaded: null, forgeError: '', pendingForge: null, generating: false, stale: false };

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) { return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function doc() { return host.getHost()?.document || window.document; }
  function win() { return doc().defaultView || window; }
  function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  function element(tag, className, text) { const node = doc().createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function button(label, className, handler) { const node = element('button', className, label); node.type = 'button'; node.dataset.theaterControl = label; node.addEventListener('click', handler); return node; }
  function notify(message, level = 'info') { const toast = win().toastr?.[level] || window.toastr?.[level]; if (typeof toast === 'function') toast(message); else console[level === 'error' ? 'error' : 'info'](`[${KEY}] ${message}`); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function statData(data = state.data) { return record(data?.stat_data) ? data.stat_data : {}; }
  function theaterPoints(data = state.data) { return Math.max(0, Math.floor(number(statData(data)['剧场点数'], 0))); }
  function close(force = false) {
    if (!force && state.pendingForge && !win().confirm('本次重铸结果尚待保存或核对，确认放弃面板中的结果并关闭？')) return false;
    state.token++;
    state.busy = false;
    state.drag = null;
    state.pendingForge = null;
    state.forgeLoaded = null;
    if (state.mask) state.mask.dataset.open = 'false';
    if (state.focus?.isConnected) state.focus.focus();
    return true;
  }
  const active = token => !state.disposed && state.mask?.isConnected &&
    state.mask.ownerDocument === doc() && state.mask.dataset.open === 'true' && token === state.token;
  function syncViewport() {
    if (!state.mask) return;
    const view = win(), html = doc().documentElement, style = view.getComputedStyle(html);
    const transformed = style.transform !== 'none' || style.perspective !== 'none' || style.filter !== 'none';
    state.mask.style.top = `${transformed ? -html.getBoundingClientRect().top : 0}px`;
    state.mask.style.height = `${view.innerHeight}px`;
    if (state.dialog.style.left) {
      state.dialog.style.left = `${clamp(parseFloat(state.dialog.style.left), 8, Math.max(8, view.innerWidth - state.dialog.offsetWidth - 8))}px`;
      state.dialog.style.top = `${clamp(parseFloat(state.dialog.style.top), 8, Math.max(8, view.innerHeight - state.dialog.offsetHeight - 8))}px`;
    }
  }
  function isEquipped(item, stat = statData()) {
    return forge.isEquipped(item, stat);
  }
  function reforgeCost(item, action) { return forge.cost(item, action, state.forgeLoaded?.rules); }
  function forgeLocked() {
    return state.busy || state.generating || state.stale || state.pendingForge || theater?.status().busy ||
      modules[FORGE_KEY] !== forge || !state.forgeLoaded?.editable;
  }
  function forgePhase() { return forge.operationStatus(state.pendingForge).phase; }
  function forgeFailed(error) {
    if (error.code === 'FORGE_SOURCE_CHANGED' || error.name === 'AbortError' || forgePhase() === 'invalid') state.stale = true;
    state.result = forgePhase() === 'uncertain' ? String(error.message || error) : `重铸保存失败：${error.message || error}`;
    notify(state.result, 'error');
  }
  function itemsFromCategory(stat, category) {
    const source = stat?.[category];
    if (Array.isArray(source)) return source.map((item, index) => record(item) ? { item, category, key: String(index) } : null).filter(Boolean);
    if (!record(source)) return [];
    return Object.entries(source).map(([key, item]) => !key.startsWith('$') && record(item) ? { item, category, key } : null).filter(Boolean);
  }
  function hasModule(item) { return Boolean(item?.['$强化模块安装']?.模块ID); }
  function equipment() { const stat = statData(); return EQUIPMENT_CATEGORIES.flatMap(category => itemsFromCategory(stat, category)).filter(({ item }) => String(item.名称 ?? item.name ?? '').trim() && !hasModule(item)); }
  function titleFor(entry) { return String(entry.item.名称 ?? entry.item.name ?? entry.key); }
  function traitFor(item) { const value = String(item?.特质 ?? item?.trait ?? item?.特性 ?? '').trim(); return ['', '无', '空', 'none', 'null', 'undefined'].includes(value.toLowerCase()) ? '' : value; }
  function refreshHeader() { if (state.title) state.title.textContent = `诡秘剧场 · 楼层 #${state.targetId ?? '-'}`; if (state.points) state.points.textContent = `${theaterPoints()} 点`; }

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
      const view = win();
      state.dialog.style.left = `${clamp(state.drag.left + event.clientX - state.drag.x, 8, view.innerWidth - state.dialog.offsetWidth - 8)}px`;
      state.dialog.style.top = `${clamp(state.drag.top + event.clientY - state.drag.y, 8, view.innerHeight - state.dialog.offsetHeight - 8)}px`;
      state.dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
  }

  function mount() {
    if (state.disposed || state.mask) return Boolean(state.mask);
    if (!doc().body) return false;
    const mask = element('section', 'crypt-lord-theater-console');
    mask.dataset.open = 'false';
    mask.innerHTML = '<section class="crypt-lord-theater-console__dialog" role="dialog" aria-modal="true" aria-label="诡秘剧场" tabindex="-1"><header><div><strong data-theater-title>诡秘剧场</strong><span data-theater-points>0 点</span></div><button type="button" data-theater-refresh title="重新读取剧场" aria-label="重新读取剧场">↻</button><button type="button" data-theater-close title="关闭剧场" aria-label="关闭剧场">×</button></header><nav class="crypt-lord-theater-console__tabs" role="tablist" aria-label="剧场功能"><button type="button" role="tab" data-theater-tab="theater">剧场</button><button type="button" role="tab" data-theater-tab="arena">角斗场</button><button type="button" role="tab" data-theater-tab="reforge">重铸装备</button></nav><div class="crypt-lord-theater-console__body" data-theater-body></div><footer><span data-theater-result role="status"></span><button type="button" data-theater-cancel title="取消待结算行动" aria-label="取消待结算行动" hidden>×</button></footer></section>';
    state.mask = mask;
    state.dialog = mask.querySelector('.crypt-lord-theater-console__dialog');
    state.title = mask.querySelector('[data-theater-title]');
    state.points = mask.querySelector('[data-theater-points]');
    state.tabs = mask.querySelector('.crypt-lord-theater-console__tabs');
    state.body = mask.querySelector('[data-theater-body]');
    mask.addEventListener('click', event => {
      if (event.target === mask || event.target?.dataset?.theaterClose !== undefined) close();
      const tab = event.target?.dataset?.theaterTab;
      if (tab && !state.busy && !state.pendingForge) { state.activeTab = tab; render(); }
      if (event.target?.dataset?.theaterRefresh !== undefined) void refresh();
      if (event.target?.dataset?.theaterCancel !== undefined) {
        try { theater?.cancel(); state.result = '待结算行动已取消，未扣费。'; render(); void refresh(); }
        catch (error) { state.result = error.message; render(); }
      }
    });
    mask.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const items = [...state.dialog.querySelectorAll('button:not(:disabled)')].filter(item => item.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && [first, state.dialog].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && [last, state.dialog].includes(doc().activeElement)) { event.preventDefault(); first?.focus(); }
      }
    });
    dragDialog(mask.querySelector('header'));
    doc().body.appendChild(mask);
    const events = host.tavernEvents?.();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, () => {
      close(true); state.targetId = null; state.data = null; state.result = ''; state.generating = false;
    });
    if (events?.GENERATION_STARTED) {
      const subscription = host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
        if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || dryRun || options?.dryRun || options?.quiet_prompt) return;
        state.generating = true;
        if (state.mask?.dataset.open === 'true') {
          state.token++; state.busy = false; state.stale = true; state.forgeLoaded = null;
          state.result = '正在生成，完成或停止后请重新读取楼层。'; render();
        }
      });
      state.cleanup.push(() => subscription?.stop());
    }
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
      const subscription = host.bindEvent(event, () => {
        state.generating = false;
        if (state.stale && state.mask?.dataset.open === 'true') { state.result = '楼层可能已变化，请重新读取。'; render(); }
      });
      state.cleanup.push(() => subscription?.stop());
    }
    const update = () => { if (state.mask?.dataset.open === 'true' && !state.busy) render(); };
    const floorUpdate = () => {
      if (state.mask?.dataset.open !== 'true' || state.busy) return;
      if (state.pendingForge) { state.stale = true; state.result = '楼层已更新，请重新读取。'; render(); }
      else void refresh(true);
    };
    win().addEventListener('cryptLord:theater-action-changed', update);
    for (const target of new Set([window, win()])) {
      target.addEventListener('cryptLord:variables-updated', floorUpdate);
      state.cleanup.push(() => target.removeEventListener('cryptLord:variables-updated', floorUpdate));
    }
    win().addEventListener('resize', syncViewport);
    win().addEventListener('scroll', syncViewport, { passive: true });
    state.cleanup.push(() => {
      win().removeEventListener('cryptLord:theater-action-changed', update);
      win().removeEventListener('resize', syncViewport);
      win().removeEventListener('scroll', syncViewport);
    });
    syncViewport();
    return true;
  }

  async function loadTarget(messageId, guard) {
    if (theater) {
      const loaded = await theater.snapshot(messageId, guard);
      if (guard && !guard()) throw Error('窗口或聊天已变化');
      state.targetId = loaded.message.message_id;
      state.latestId = loaded.latestId;
      state.revision = loaded.revision;
      state.editable = loaded.editable;
      state.data = clone(loaded.message.data || {});
      return { store: modules[STORE_KEY], message: loaded.message };
    }
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const api = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const rows = await api.getChatMessages('0-{{lastMessageId}}');
    if (guard && !guard()) throw Error('窗口或聊天已变化');
    if (!Array.isArray(rows)) throw Error('原生消息页不可读取');
    const floors = rows.filter(row => row.role === 'assistant' && !row.is_hidden).sort((a, b) => a.message_id - b.message_id);
    const latest = floors.at(-1);
    const message = messageId === undefined ? rows.at(-1) : rows.find(row => row.message_id === messageId);
    if (message?.role !== 'assistant') throw new Error('请先选择一条真实 assistant 楼层。');
    state.targetId = message.message_id;
    state.data = clone(message.data || {});
    state.latestId = latest?.message_id ?? null;
    return { store, message };
  }
  async function loadForge(guard) {
    state.forgeLoaded = null; state.forgeError = '';
    try {
      const loaded = await forge.load(state.targetId, guard);
      if (guard && !guard()) return;
      if (modules['cryptLord.nativeFloorSource'].signature(loaded.floor.data) !==
        modules['cryptLord.nativeFloorSource'].signature(state.data)) throw Error('楼层已变化，请重新读取');
      state.forgeLoaded = loaded;
    } catch (error) { if (!guard || guard()) state.forgeError = `重铸不可用：${error.message || error}`; }
  }
  async function submitAction(action) {
    if (state.busy || state.generating || state.stale || !state.editable) return;
    const token = state.token;
    state.busy = true;
    render();
    try {
      if (!theater) throw Error('剧场原生结算模块尚未加载');
      const definition = theater.actions().find(item => item.label === action.label);
      const existing = doc().querySelector('#send_textarea')?.value || '';
      if (existing.trim() && existing.trim() !== action.label && !win().confirm('原生输入框已有内容，是否替换为这次剧场行动？')) return;
      await theater.queue(definition.id, state.targetId, state.revision, () => active(token));
      if (!active(token)) return;
      notify('剧场行动已准备，尚未扣费。', 'info');
      close();
    } catch (error) {
      if (active(token)) { state.result = `剧场行动失败：${error?.message || error}`; notify(state.result, 'error'); }
    } finally {
      if (state.token === token) { state.busy = false; if (active(token)) render(); }
    }
  }
  async function reforge(entry, action) {
    if (state.busy || !entry) return;
    await equipmentAction(entry, action);
  }
  async function equipmentAction(entry, action) {
    if (!entry || forgeLocked()) return;
    if (action === 'unequip' && !win().confirm(`确认卸下【${titleFor(entry)}】以进行重铸？`)) return;
    const token = state.token, targetId = state.targetId;
    state.busy = true;
    render();
    try {
      const operation = await forge.prepareOperation(state.forgeLoaded, entry.category, entry.key, titleFor(entry), action,
        () => active(token) && !state.generating);
      if (!active(token)) return;
      state.pendingForge = operation;
      state.selectedEquipment = { category: entry.category, key: entry.key };
      await saveForge(token, targetId);
    } catch (error) {
      if (active(token)) {
        forgeFailed(error);
      }
    }
    finally { if (state.token === token) { state.busy = false; if (active(token)) render(); } }
  }
  async function saveForge(token, targetId, inspect = false) {
    const operation = state.pendingForge, before = clone(state.data);
    const committed = await (inspect ? forge.inspectOperation : forge.commitOperation)(operation, () => active(token) && !state.generating);
    if (!active(token)) return;
    state.pendingForge = null;
    state.data = committed;
    state.revision = null; state.editable = false;
    state.result = operation.action === 'unequip' ? '装备已卸下。' : `重铸成功，消耗 ${operation.cost} 点剧场点数。`;
    const warning = forge.operationStatus(operation).warning;
    if (warning) state.result += ` ${warning}`;
    notify(state.result, warning ? 'warning' : 'success');
    try {
      modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
        messageId: targetId, beforeData: before, afterData: committed, source: 'theater-reforge' });
    } catch (error) { state.result += ` 已保存，但通知失败：${error.message}`; }
    await loadForge(() => active(token));
    if (theater && active(token)) {
      try { await loadTarget(targetId, () => active(token)); }
      catch (error) { state.stale = true; state.result += ` 行动来源需重读：${error.message}`; }
    }
    if (active(token) && state.forgeError) state.result = `${state.result} ${state.forgeError}`;
  }
  async function retryForge(inspect = false) {
    if (state.busy || state.generating || state.stale || modules[FORGE_KEY] !== forge || !state.pendingForge) return;
    const token = state.token; state.busy = true; render();
    try { await saveForge(token, state.targetId, inspect); }
    catch (error) {
      if (active(token)) {
        forgeFailed(error);
      }
    } finally { if (token === state.token) { state.busy = false; if (active(token)) render(); } }
  }
  function selectedEntry(entries) { return entries.find(entry => entry.category === state.selectedEquipment?.category && entry.key === state.selectedEquipment?.key) || null; }
  function renderScene(kind) {
    const scene = element('div', 'crypt-lord-theater-console__scene');
    const image = element('img');
    image.alt = kind === 'arena' ? '角斗场' : '诡秘剧场';
    image.referrerPolicy = 'no-referrer';
    image.draggable = false;
    const status = element('div', 'crypt-lord-theater-console__image-status');
    const label = element('span', '', '正在加载场景...');
    const retry = button('↻', '', () => load());
    retry.title = '重试场景图片';
    retry.setAttribute('aria-label', '重试场景图片');
    retry.hidden = true;
    status.append(label, retry);
    function load() {
      label.textContent = '正在加载场景...';
      retry.hidden = true;
      image.style.visibility = 'hidden';
      image.src = (theater?.images || {
        theater: 'https://i.postimg.cc/76BNrNdx/ju-chang2.png', arena: 'https://i.postimg.cc/7L5j8pzG/6.png',
      })[kind];
    }
    image.addEventListener('load', () => { if (scene.isConnected) { label.textContent = ''; image.style.visibility = ''; } });
    image.addEventListener('error', () => { if (scene.isConnected) { label.textContent = '场景图片暂不可用'; retry.hidden = false; } });
    scene.append(image);
    state.body.append(scene, status);
    load();
  }
  function renderTheater() {
    renderScene('theater');
    const intro = element('p', 'crypt-lord-theater-console__prompt', '为何走下台？幕后人员可以抽取其他世界的物品，售票人员可以出售穿越世界的票据，活动人员会介绍当前的 DLC 活动。');
    const actions = element('div', 'crypt-lord-theater-console__actions');
    ACTIONS.forEach(action => {
      const control = button(`${action.label}${action.cost ? ` · ${action.cost} 点` : ''}`, 'crypt-lord-theater-console__button is-primary', () => { void submitAction(action); });
      control.disabled = state.busy || state.generating || state.stale || theater?.status().busy ||
        action.cost > theaterPoints() || theater && !state.editable;
      actions.appendChild(control);
    });
    state.body.append(intro, actions);
  }
  function renderArena() {
    renderScene('arena');
    const intro = element('p', 'crypt-lord-theater-console__prompt', '角斗场招募各世界的斗士参与决斗，胜者可获得丰厚奖励。');
    const control = button('咨询角斗场工作人员', 'crypt-lord-theater-console__button is-primary', () => { void submitAction({ label: '寻找角斗场工作人员', cost: 0, loading: '正在寻找角斗场工作人员…' }); });
    control.disabled = state.busy || state.generating || state.stale || theater?.status().busy || theater && !state.editable;
    state.body.append(intro, control);
  }
  function renderReforge() {
    const entries = equipment();
    const layout = element('div', 'crypt-lord-theater-console__reforge');
    const list = element('section', 'crypt-lord-theater-console__equipment-list');
    list.appendChild(element('h3', '', '可重铸装备'));
    entries.forEach(entry => {
      const selected = state.selectedEquipment?.category === entry.category && state.selectedEquipment?.key === entry.key;
      const control = button(titleFor(entry), `crypt-lord-theater-console__equipment${selected ? ' is-selected' : ''}${isEquipped(entry.item) ? ' is-equipped' : ''}`, () => { state.selectedEquipment = { category: entry.category, key: entry.key }; render(); });
      control.disabled = state.busy || Boolean(state.pendingForge);
      const meta = element('span', '', `${entry.category.replace('列表', '')}${isEquipped(entry.item) ? ' · 已装备' : ''}`);
      control.appendChild(meta);
      list.appendChild(control);
    });
    if (!entries.length) list.appendChild(element('div', 'crypt-lord-theater-console__empty', '当前楼层没有武器、衣物、饰品或封印物列表。'));
    const altar = element('section', 'crypt-lord-theater-console__altar');
    const current = selectedEntry(entries);
    if (!current) altar.appendChild(element('div', 'crypt-lord-theater-console__empty', '在左侧选择一件装备以查看重铸选项。'));
    else {
      const itemStat = statData(state.pendingForge?.data || state.data);
      const item = state.pendingForge ? itemStat[current.category][current.key] : current.item;
      altar.appendChild(element('h3', '', titleFor(current)));
      altar.appendChild(element('p', 'crypt-lord-theater-console__item-meta', `序列：${item.序列 ?? item.品阶 ?? item.tier ?? '普通'} · 特质：${traitFor(item) || '无'}${state.pendingForge ? forgePhase() === 'uncertain' ? ' · 待核对' : ' · 待保存' : ''}`));
      const stats = element('div', 'crypt-lord-theater-console__stats');
      ATTRIBUTES.forEach(key => stats.appendChild(element('span', '', `${key} ${number(item[key])}`)));
      altar.appendChild(stats);
      if (isEquipped(item, itemStat)) {
        const control = button('卸下装备', 'crypt-lord-theater-console__button',
          () => { void equipmentAction(current, 'unequip'); });
        control.disabled = Boolean(forgeLocked());
        altar.appendChild(control);
      }
      else {
        const mundane = forge.parseRank(item.序列 ?? item.品阶 ?? item.tier ?? item.sequence) === 10;
        const actions = [{ id: 'reroll_stats', label: '刷新属性' }, ...(!mundane && Object.keys(state.forgeLoaded?.rules.traitDB || {}).some(name => name !== '空') ? (traitFor(item) ? [{ id: 'reroll_trait', label: '重塑特质' }, { id: 'remove_trait', label: '洗去特质' }] : [{ id: 'add_trait', label: '赋予特质' }]) : [])];
        const controls = element('div', 'crypt-lord-theater-console__actions');
        actions.forEach(action => {
          const cost = reforgeCost(item, action.id);
          const control = button(`${action.label} · ${cost} 点`, 'crypt-lord-theater-console__button', () => { void reforge(current, action.id); });
          control.disabled = Boolean(forgeLocked()) || cost > theaterPoints();
          controls.appendChild(control);
        });
        altar.appendChild(controls);
      }
    }
    layout.append(list, altar);
    state.body.appendChild(layout);
    if (state.pendingForge) {
      const phase = forgePhase(), inspect = phase === 'uncertain';
      const retry = button(inspect ? '核对原生保存状态' : '重试保存本次结果',
        'crypt-lord-theater-console__button', () => { void retryForge(inspect); });
      retry.disabled = state.busy || state.generating || state.stale || modules[FORGE_KEY] !== forge ||
        !['pending', 'uncertain'].includes(phase);
      state.body.appendChild(retry);
    }
  }
  function render() {
    if (!state.body) return;
    const focused = doc().activeElement;
    const restoreFocus = state.body.contains(focused);
    const control = focused?.dataset?.theaterControl;
    state.body.replaceChildren();
    refreshHeader();
    state.mask.setAttribute('aria-busy', String(state.busy));
    state.mask.querySelector('[data-theater-refresh]').disabled = state.busy || state.generating;
    state.tabs?.querySelectorAll('[data-theater-tab]').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.theaterTab === state.activeTab);
      tab.setAttribute('aria-selected', String(tab.dataset.theaterTab === state.activeTab));
      tab.disabled = state.busy || Boolean(state.pendingForge);
    });
    state.body.dataset.tab = state.activeTab;
    if (state.data) {
      if (state.activeTab === 'arena') renderArena();
      else if (state.activeTab === 'reforge') renderReforge();
      else renderTheater();
    }
    const pending = theater?.status().pending;
    state.mask.querySelector('[data-theater-result]').textContent = state.result ||
      (state.activeTab === 'reforge' ? state.forgeError || state.forgeLoaded?.reason : '') || pending?.error ||
      (pending ? `待结算：${pending.label} · ${pending.cost} 点` : state.latestId !== null && state.latestId !== state.targetId ? '历史楼层只读，请打开最新楼层。' : '');
    const cancel = state.mask.querySelector('[data-theater-cancel]');
    cancel.hidden = !pending;
    cancel.disabled = state.busy || theater?.status().busy;
    if (restoreFocus && state.mask.dataset.open === 'true') {
      const next = [...state.body.querySelectorAll('button:not(:disabled)')].find(item => item.dataset.theaterControl === control);
      (next || state.dialog).focus();
    }
  }
  async function refresh(latest = false) {
    if (state.busy || state.generating || state.disposed || state.mask?.dataset.open !== 'true') return false;
    if (state.pendingForge && !win().confirm('确认放弃待保存或待核对的重铸结果，重新读取原生楼层？')) return false;
    const token = ++state.token;
    state.busy = true;
    state.pendingForge = null; state.stale = false;
    state.result = '正在读取剧场...';
    render();
    try {
      await loadTarget(latest ? undefined : state.targetId, () => active(token));
      await loadForge(() => active(token));
      state.result = '';
      return true;
    } catch (error) {
      if (active(token)) { state.data = null; state.result = `读取剧场失败：${error.message}`; }
      return false;
    } finally { if (token === state.token) { state.busy = false; if (active(token)) render(); } }
  }
  async function open(messageId) {
    if (state.mask?.dataset.open === 'true' && (messageId === undefined || messageId === state.targetId)) {
      state.dialog.focus(); return true;
    }
    if (state.busy || state.generating) return false;
    if (state.pendingForge && !win().confirm('确认放弃待保存或待核对的重铸结果，切换楼层？')) return false;
    const token = ++state.token;
    if (!mount()) return false;
    state.focus = doc().activeElement;
    state.activeTab = 'theater';
    state.selectedEquipment = null;
    state.pendingForge = null; state.forgeLoaded = null; state.stale = false;
    state.mask.dataset.open = 'true';
    state.dialog.focus();
    state.busy = true;
    state.data = null;
    state.result = '正在读取剧场...';
    render();
    syncViewport();
    try {
      await loadTarget(messageId, () => active(token));
      await loadForge(() => active(token));
      if (!active(token)) return false;
      state.result = '';
      return true;
    } catch (error) {
      if (active(token)) { state.data = null; state.result = `读取剧场失败：${error.message}`; }
      return false;
    } finally { if (token === state.token) { state.busy = false; if (active(token)) render(); } }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', targetId: state.targetId, tab: state.activeTab, points: theaterPoints(), busy: state.busy }); },
    mount, open, close, refresh,
    dispose() { close(true); state.disposed = true; state.subscription?.stop?.(); state.cleanup.splice(0).forEach(stop => stop()); state.mask?.remove(); state.mask = null; try { contract.releaseGlobal(KEY, api); } catch { /* Global may already be released during teardown. */ } if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
