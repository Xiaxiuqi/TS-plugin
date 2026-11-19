(() => {
  'use strict';
  const KEY = 'cryptLord.npcProgressionUi', root = window.cryptLord, contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.npcProgression'], after = modules?.['cryptLord.afterNativeHost'];
  if (!service || !after || !contract) throw Error('NPC成长界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { disposed: false, token: 0, busy: false, selected: null, npc: null, panel: null, focus: null,
    loaded: null, confirm: false, generating: false, subscriptions: [] };
  const doc = () => after.getHost()?.document || document;
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
    const blocked = state.busy || state.generating;
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.reload.disabled = blocked; state.select.disabled = blocked || !state.select.options.length;
    state.npcSelect.disabled = blocked || !state.npcSelect.options.length;
    state.save.disabled = blocked || !state.loaded?.editable || !state.loaded.changed;
    state.save.setAttribute('aria-label', state.confirm ? '确认保存整楼NPC修正' : '修正本楼层NPC');
    state.save.title = state.save.getAttribute('aria-label');
  }
  function close(returnFocus = true) {
    state.token++; state.busy = false; state.loaded = null; state.confirm = false;
    state.panel?.setAttribute('data-open', 'false'); state.main?.replaceChildren(); controls();
    if (returnFocus && state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  const value = raw => raw === undefined || raw === null ? '未记录' : String(raw);
  function render() {
    state.main.replaceChildren();
    const reports = state.loaded?.reports || [], report = reports.find(row => row.name === state.npc) || reports[0];
    if (!report) { state.main.append(node('p', '', '无可结算NPC')); return; }
    state.npc = report.name;
    const summary = node('section', 'crypt-lord-npc-growth__summary');
    summary.append(node('h3', '', report.name), node('p', '', `${report.kind} · ${report.sequence}`),
      node('p', '', `模板 ${report.template} · 能力体系 ${report.system} · 神性 ${value(report.divinity)}`),
      node('p', '', report.autonomous ? `工程基准 × ${report.xpMultiplier}` :
        `六维配额 ${report.quota} · 模板倍率 ${report.multiplier} · 经验倍率 ${report.xpMultiplier}`),
      node('small', '', `经验 Lv.${report.experience.level} · 进度 ${report.experience.exp}/${report.experience.need}`));
    state.main.append(summary);
    for (const row of report.rows) {
      const item = node('section', 'crypt-lord-npc-growth__row'), detail = node('div');
      detail.append(node('p', '', `上限 ${value(row.stored)} → ${value(row.next)}`));
      if (row.key !== '运气') detail.append(node('p', '', `当前 ${value(row.current)} → ${value(row.nextCurrent)}`));
      item.append(node('h3', '', row.key), detail); state.main.append(item);
    }
    const abilities = node('section', 'crypt-lord-npc-growth__abilities');
    abilities.append(node('h3', '', `${report.initialized ? '初始化能力' : '能力清单'} · ${report.abilities?.length || 0}`));
    for (const ability of report.abilities || []) {
      const item = node('article'); item.append(node('h4', '', ability.名称 || ability.name || '未命名能力'),
        node('p', '', ability.描述 || ability.description || ''),
        node('small', '', [ability.类型, ability.damageType, ability.targetType].filter(Boolean).join(' · ')));
      abilities.append(item);
    }
    state.main.append(abilities);
  }
  function show(loaded) {
    state.loaded = loaded; state.selected = loaded.floor.message_id; state.confirm = false;
    state.select.replaceChildren(...loaded.floors.slice().reverse().map(row => {
      const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
      option.value = row.messageId; option.selected = row.messageId === state.selected; return option;
    }));
    if (!loaded.reports.some(row => row.name === state.npc)) state.npc = loaded.reports[0]?.name || null;
    state.npcSelect.replaceChildren(...loaded.reports.map(row => {
      const option = node('option', '', row.name); option.value = row.name; option.selected = row.name === state.npc; return option;
    }));
    render();
    state.status.textContent = `#${state.selected} · ${loaded.reports.length}名NPC · ${loaded.reason ||
      (loaded.changed ? '成长数据待修正' : '成长数据一致')}`;
  }
  async function reload() {
    if (state.panel?.dataset.open !== 'true' || state.generating || state.disposed) return false;
    const token = ++state.token;
    state.busy = true; state.loaded = null; state.confirm = false; state.main.replaceChildren(); controls();
    state.status.textContent = '正在读取原生NPC...';
    try {
      const loaded = await service.load(state.selected, () => active(token) && !state.generating);
      if (!active(token)) return false; show(loaded); return true;
    } catch (error) {
      if (active(token)) {
        state.select.replaceChildren(); state.npcSelect.replaceChildren();
        if (error.floors) {
          const absent = node('option', '', '所选楼层已不可用'); absent.disabled = true; absent.selected = true;
          state.select.append(absent, ...error.floors.map(row => {
            const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
            option.value = row.messageId; return option;
          }));
        }
        state.status.textContent = `读取失败：${error.message || error}`;
      }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  async function save() {
    if (!state.loaded?.editable || !state.loaded.changed || state.busy || state.generating) return false;
    if (!state.confirm) {
      state.confirm = true;
      state.status.textContent = `确认修正 #${state.selected} 的全部${state.loaded.reports.length}名NPC成长、能力和当前值？`;
      controls(); return false;
    }
    const token = state.token, loaded = state.loaded; state.busy = true; controls(); state.status.textContent = '正在保存NPC修正...';
    try {
      const result = await service.commit(loaded, () => active(token) && !state.generating);
      if (!active(token)) return false;
      if (result.loaded) show(result.loaded);
      else { state.loaded = null; state.main.replaceChildren(); }
      state.status.textContent = result.warning || (result.unchanged ? 'NPC数据已一致，未重复写入' : `#${state.selected} · 整楼NPC修正已保存`);
      return true;
    } catch (error) {
      if (active(token)) { state.loaded = null; state.confirm = false; state.main.replaceChildren(); state.status.textContent = `未保存：${error.message || error}`; }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  function updated() {
    if (state.disposed || state.panel?.dataset.open !== 'true') return;
    if (state.busy && state.loaded) return;
    state.token++; state.busy = false; state.loaded = null; state.confirm = false; state.main.replaceChildren(); controls();
    if (state.generating) state.status.textContent = '正在生成，等待完整楼层'; else void reload();
  }
  function mount() {
    if (state.disposed) return false; if (state.panel) return true;
    const panel = node('section', 'crypt-lord-npc-growth'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'NPC成长与初始化');
    const header = node('header'), tools = node('div', 'crypt-lord-npc-growth__tools');
    state.reload = tool('重新读取', 'rotate-right', () => void reload());
    state.save = tool('修正本楼层NPC', 'floppy-disk', () => void save());
    tools.append(state.reload, state.save, tool('关闭', 'xmark', () => close()));
    header.append(node('strong', '', 'NPC成长与初始化'), tools);
    const selectors = node('div', 'crypt-lord-npc-growth__selectors');
    const label = node('label', '', '楼层'), select = node('select'); select.setAttribute('aria-label', 'NPC楼层');
    select.addEventListener('change', () => { state.selected = Number(select.value); void reload(); }); label.append(select);
    const npcLabel = node('label', '', 'NPC'), npcSelect = node('select'); npcSelect.setAttribute('aria-label', 'NPC角色');
    npcSelect.addEventListener('change', () => {
      state.npc = npcSelect.value; state.confirm = false; render(); state.main.scrollTop = 0; controls();
    }); npcLabel.append(npcSelect); selectors.append(label, npcLabel);
    const main = node('main'), status = node('p', 'crypt-lord-npc-growth__status'); status.setAttribute('role', 'status');
    panel.append(header, selectors, main, status); doc().body.append(panel);
    Object.assign(state, { panel, select, npcSelect, main, status });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll('button,select')].filter(item => !item.disabled && item.getClientRects().length);
      if (event.shiftKey && [items[0], panel].includes(doc().activeElement)) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && doc().activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    });
    const events = after.tavernEvents() || {}, bind = (name, fn) => { if (name) state.subscriptions.push(after.bindEvent(name, fn)); };
    bind(events.CHAT_CHANGED, () => { close(false); state.selected = null; state.npc = null; state.generating = false; });
    bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (type === 'quiet' || dryRun || options?.dryRun) return;
      state.generating = true; state.token++; state.busy = false; state.loaded = null; updated();
    });
    for (const name of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
      bind(name, () => { state.generating = false; updated(); });
    for (const name of new Set([events.MESSAGE_UPDATED, events.MESSAGE_DELETED, events.MESSAGE_SWIPED,
      events.MESSAGE_RECEIVED, events.CHARACTER_MESSAGE_RENDERED].filter(Boolean))) bind(name, updated);
    const hostWindow = doc().defaultView || window; hostWindow.addEventListener('cryptLord:variables-updated', updated);
    state.subscriptions.push({ stop: () => hostWindow.removeEventListener('cryptLord:variables-updated', updated) });
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
      close(false); state.disposed = true; state.subscriptions.forEach(item => item?.stop());
      state.panel?.remove(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
