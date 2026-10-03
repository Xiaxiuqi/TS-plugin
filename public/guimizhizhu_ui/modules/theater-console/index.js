(() => {
  'use strict';

  const KEY = 'cryptLord.theaterConsole';
  const STORE_KEY = 'cryptLord.stateStore';
  const INPUT_KEY = 'cryptLord.inputAdapter';
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
  if (!forge) throw new Error(`[${KEY}] core/item-forge.js 尚未加载`);
  const ACTIONS = Object.freeze([
    Object.freeze({ label: '寻找幕后工作人员', cost: 80, loading: '消耗 80 点，正在寻找幕后人员…' }),
    Object.freeze({ label: '寻找售票工作人员', cost: 50, loading: '消耗 50 点，正在寻找售票人员…' }),
    Object.freeze({ label: '寻找剧场活动工作人员', cost: 0, loading: '正在查询剧场活动详情…' }),
  ]);
  const state = { mask: null, dialog: null, title: null, points: null, tabs: null, body: null, targetId: null, data: null, activeTab: 'theater', selectedEquipment: null, drag: null, busy: false, disposed: false };

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) { return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function doc() { return host.getHost()?.document || window.document; }
  function win() { return doc().defaultView || window; }
  function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  function element(tag, className, text) { const node = doc().createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function button(label, className, handler) { const node = element('button', className, label); node.type = 'button'; node.addEventListener('click', handler); return node; }
  function notify(message, level = 'info') { const toast = win().toastr?.[level] || window.toastr?.[level]; if (typeof toast === 'function') toast(message); else console[level === 'error' ? 'error' : 'info'](`[${KEY}] ${message}`); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function statData(data = state.data) { return record(data?.stat_data) ? data.stat_data : {}; }
  function theaterPoints(data = state.data) { return Math.max(0, Math.floor(number(statData(data)['剧场点数'], 0))); }
  function close() { if (state.mask) state.mask.dataset.open = 'false'; }
  function isEquipped(item, stat = statData()) {
    if (item?.isEquipped === true || item?.已装备 === true || item?.装备中 === true || item?.equipped === true) return true;
    const equipment = stat?.装备 ?? stat?.装备栏;
    const itemName = String(item?.名称 ?? item?.name ?? '');
    const includesName = value => {
      if (Array.isArray(value)) return value.some(includesName);
      if (!record(value)) return String(value ?? '') === itemName;
      return Object.values(value).some(child => child === item || (record(child) && String(child.名称 ?? child.name ?? '') === itemName));
    };
    return Boolean(itemName && includesName(equipment));
  }
  function reforgeCost(item, action) { return forge.cost(item, action); }
  function itemsFromCategory(stat, category) {
    const source = stat?.[category];
    if (Array.isArray(source)) return source.map((item, index) => record(item) ? { item, category, key: String(index) } : null).filter(Boolean);
    if (!record(source)) return [];
    return Object.entries(source).map(([key, item]) => record(item) ? { item, category, key } : null).filter(Boolean);
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
    mask.innerHTML = '<section class="crypt-lord-theater-console__dialog" role="dialog" aria-modal="true" aria-label="诡秘剧场"><header><div><strong data-theater-title>诡秘剧场</strong><span data-theater-points>0 点</span></div><button type="button" data-theater-close title="关闭">×</button></header><nav class="crypt-lord-theater-console__tabs" aria-label="剧场功能"><button type="button" data-theater-tab="theater">剧场</button><button type="button" data-theater-tab="arena">角斗场</button><button type="button" data-theater-tab="reforge">重铸装备</button></nav><div class="crypt-lord-theater-console__body" data-theater-body></div></section>';
    state.mask = mask;
    state.dialog = mask.querySelector('.crypt-lord-theater-console__dialog');
    state.title = mask.querySelector('[data-theater-title]');
    state.points = mask.querySelector('[data-theater-points]');
    state.tabs = mask.querySelector('.crypt-lord-theater-console__tabs');
    state.body = mask.querySelector('[data-theater-body]');
    mask.addEventListener('click', event => {
      if (event.target === mask || event.target?.dataset?.theaterClose !== undefined) close();
      const tab = event.target?.dataset?.theaterTab;
      if (tab) { state.activeTab = tab; render(); }
    });
    dragDialog(mask.querySelector('header'));
    doc().body.appendChild(mask);
    return true;
  }

  async function loadTarget(messageId = state.targetId) {
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const message = await store.readMessage(messageId);
    if (message?.role !== 'assistant') throw new Error('请先选择一条真实 assistant 楼层。');
    state.targetId = message.message_id;
    state.data = clone(message.data || {});
    return { store, message };
  }
  async function writeData(next, before, source) {
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    await store.writeAssistantData(state.targetId, next);
    state.data = next;
    root.__stage1Modules?.['cryptLord.variableWorkbench']?.notifyUpdate?.({ messageId: state.targetId, beforeData: before, afterData: next, source });
  }
  async function submitAction(action) {
    if (state.busy) return;
    state.busy = true;
    render();
    let before = null;
    try {
      const { message } = await loadTarget();
      before = clone(message.data || {});
      const points = theaterPoints(before);
      if (action.cost > points) throw new Error(`剧场点数不足 ${action.cost} 点。`);
      if (action.cost) {
        const next = clone(before);
        next.stat_data = record(next.stat_data) ? next.stat_data : {};
        next.stat_data['剧场点数'] = points - action.cost;
        await writeData(next, before, 'theater-action-cost');
      }
      notify(action.loading, 'info');
      const input = await contract.waitGlobalInitialized(INPUT_KEY, { timeoutMs: 10000 });
      await input.submit(action.label, 'crypt-lord-theater');
      notify('剧场行动已提交到原生楼层。', 'success');
      close();
    } catch (error) {
      if (before && action.cost) {
        try { await writeData(before, state.data, 'theater-action-rollback'); } catch (rollbackError) { console.error(`[${KEY}] 剧场点数回滚失败`, rollbackError); }
      }
      notify(`剧场行动失败：${error?.message || error}`, 'error');
    } finally {
      state.busy = false;
      if (state.mask?.dataset.open === 'true') render();
    }
  }
  async function reforge(entry, action) {
    if (state.busy || !entry) return;
    if (isEquipped(entry.item)) { notify('已装备物品请先在物品栏卸下后再重铸。', 'warning'); return; }
    state.busy = true;
    render();
    try {
      const { message } = await loadTarget();
      const before = clone(message.data || {});
      const stat = statData(before);
      const container = stat?.[entry.category];
      const actual = Array.isArray(container) ? container[Number(entry.key)] : container?.[entry.key];
      if (!record(actual)) throw new Error('找不到待重铸的装备，可能已被剧情更新。');
      if (String(actual.名称 ?? actual.name ?? '') !== titleFor(entry)) throw new Error('装备列表已变化，请重新选择。');
      if (hasModule(actual)) throw new Error('该装备已安装强化模块，请先卸下再重铸。');
      if (isEquipped(actual, stat)) throw new Error('已装备物品请先卸下后再重铸。');
      const cost = reforgeCost(actual, action);
      const points = theaterPoints(before);
      if (cost > points) throw new Error(`点数不足，需要 ${cost} 点剧场点数。`);
      let trait = traitFor(actual);
      if (action === 'remove_trait') trait = '';
      if (action === 'add_trait' || action === 'reroll_trait') {
        const traits = forge.traits();
        if (!traits.length) throw new Error('特质图鉴为空，暂时无法赋予或重塑特质。');
        trait = traits[Math.floor(Math.random() * traits.length)];
      }
      const next = clone(before);
      next.stat_data = record(next.stat_data) ? next.stat_data : {};
      const targetContainer = next.stat_data[entry.category];
      const target = Array.isArray(targetContainer) ? targetContainer[Number(entry.key)] : targetContainer?.[entry.key];
      if (!record(target)) throw new Error('重铸目标已失效。');
      Object.assign(target, forge.roll(target, trait));
      next.stat_data['剧场点数'] = points - cost;
      await writeData(next, before, 'theater-reforge');
      state.selectedEquipment = { category: entry.category, key: entry.key };
      notify(`重铸成功，消耗 ${cost} 点剧场点数。`, 'success');
    } catch (error) { notify(`重铸失败：${error?.message || error}`, 'error'); }
    finally { state.busy = false; render(); }
  }
  function selectedEntry(entries) { return entries.find(entry => entry.category === state.selectedEquipment?.category && entry.key === state.selectedEquipment?.key) || null; }
  function renderTheater() {
    const intro = element('p', 'crypt-lord-theater-console__prompt', '为何走下台？幕后人员可以抽取其他世界的物品，售票人员可以出售穿越世界的票据，活动人员会介绍当前的 DLC 活动。');
    const actions = element('div', 'crypt-lord-theater-console__actions');
    ACTIONS.forEach(action => {
      const control = button(`${action.label}${action.cost ? ` · ${action.cost} 点` : ''}`, 'crypt-lord-theater-console__button is-primary', () => { void submitAction(action); });
      control.disabled = state.busy || action.cost > theaterPoints();
      actions.appendChild(control);
    });
    state.body.append(intro, actions);
  }
  function renderArena() {
    const intro = element('p', 'crypt-lord-theater-console__prompt', '角斗场招募各世界的斗士参与决斗，胜者可获得丰厚奖励。');
    const control = button('咨询角斗场工作人员', 'crypt-lord-theater-console__button is-primary', () => { void submitAction({ label: '寻找角斗场工作人员', cost: 0, loading: '正在寻找角斗场工作人员…' }); });
    control.disabled = state.busy;
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
      const meta = element('span', '', `${entry.category.replace('列表', '')}${isEquipped(entry.item) ? ' · 已装备' : ''}`);
      control.appendChild(meta);
      list.appendChild(control);
    });
    if (!entries.length) list.appendChild(element('div', 'crypt-lord-theater-console__empty', '当前楼层没有武器、衣物、饰品或封印物列表。'));
    const altar = element('section', 'crypt-lord-theater-console__altar');
    const current = selectedEntry(entries);
    if (!current) altar.appendChild(element('div', 'crypt-lord-theater-console__empty', '在左侧选择一件装备以查看重铸选项。'));
    else {
      const item = current.item;
      altar.appendChild(element('h3', '', titleFor(current)));
      altar.appendChild(element('p', 'crypt-lord-theater-console__item-meta', `序列：${item.序列 ?? item.品阶 ?? item.tier ?? '普通'} · 特质：${traitFor(item) || '无'}`));
      const stats = element('div', 'crypt-lord-theater-console__stats');
      ATTRIBUTES.forEach(key => stats.appendChild(element('span', '', `${key} ${number(item[key])}`)));
      altar.appendChild(stats);
      if (isEquipped(item)) altar.appendChild(element('div', 'crypt-lord-theater-console__warning', '原版规则要求先卸下已装备物品。'));
      else {
        const mundane = forge.parseRank(item.序列 ?? item.品阶 ?? item.tier ?? item.sequence) === 10;
        const actions = [{ id: 'reroll_stats', label: '刷新属性' }, ...(!mundane && forge.traits().length ? (traitFor(item) ? [{ id: 'reroll_trait', label: '重塑特质' }, { id: 'remove_trait', label: '洗去特质' }] : [{ id: 'add_trait', label: '赋予特质' }]) : [])];
        const controls = element('div', 'crypt-lord-theater-console__actions');
        actions.forEach(action => {
          const cost = reforgeCost(item, action.id);
          const control = button(`${action.label} · ${cost} 点`, 'crypt-lord-theater-console__button', () => { void reforge(current, action.id); });
          control.disabled = state.busy || cost > theaterPoints();
          controls.appendChild(control);
        });
        altar.appendChild(controls);
      }
    }
    layout.append(list, altar);
    state.body.appendChild(layout);
  }
  function render() {
    if (!state.body) return;
    state.body.replaceChildren();
    refreshHeader();
    state.tabs?.querySelectorAll('[data-theater-tab]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.theaterTab === state.activeTab));
    if (state.activeTab === 'arena') renderArena();
    else if (state.activeTab === 'reforge') renderReforge();
    else renderTheater();
  }
  async function refresh() { if (!Number.isInteger(state.targetId)) return false; await loadTarget(); render(); return true; }
  async function open(messageId) {
    if (!mount()) return false;
    await loadTarget(messageId);
    try { await forge.loadConfigs(); }
    catch (error) { console.warn(`[${KEY}] 世界书配置读取失败，使用内建规则`, error); }
    state.activeTab = 'theater';
    state.selectedEquipment = null;
    state.mask.dataset.open = 'true';
    render();
    return true;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', targetId: state.targetId, tab: state.activeTab, points: theaterPoints(), busy: state.busy }); },
    mount, open, close, refresh,
    dispose() { state.disposed = true; state.mask?.remove(); state.mask = null; try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
