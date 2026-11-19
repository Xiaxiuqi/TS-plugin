(() => {
  'use strict';
  const KEY = 'cryptLord.battlePromptModeUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.battlePromptMode'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('战斗提示模式界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { token: 0, disposed: false, busy: false, loaded: null, subscriptions: [], focus: null };
  const doc = () => after.getHost()?.document || document;
  const el = (tag, cls = '', text) => {
    const node = doc().createElement(tag); node.className = cls;
    if (text !== undefined) node.textContent = text; return node;
  };
  const active = token => !state.disposed && token === state.token && state.panel?.dataset.open === 'true';
  function button(label, icon, action, compact = false) {
    const node = el('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = el('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true'); node.append(symbol);
    if (!compact) node.append(el('span', '', label));
    node.addEventListener('click', action); return node;
  }
  function close() {
    state.token++; state.busy = false; state.loaded = null; state.panel?.setAttribute('data-open', 'false');
    if (state.panel) render();
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return true;
    const panel = el('section', 'crypt-lord-battle-prompt'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '战斗提示模式');
    const header = el('header'), tools = el('div', 'crypt-lord-battle-prompt__tools');
    tools.append(button('重新读取', 'fa-rotate-right', () => void reload(), true), button('关闭', 'fa-xmark', close, true));
    header.append(el('strong', '', '战斗提示模式'), tools);
    const status = el('p', 'crypt-lord-battle-prompt__status'); status.setAttribute('role', 'status');
    const main = el('main'), fieldset = el('fieldset'), controls = el('div', 'crypt-lord-battle-prompt__controls');
    const label = el('label'), automatic = el('input'); automatic.type = 'checkbox'; automatic.setAttribute('aria-label', '自动切换战斗提示');
    automatic.addEventListener('change', () => void changeAutomatic(automatic.checked));
    label.append(el('span', '', '自动切换'), automatic);
    const modes = el('div', 'crypt-lord-battle-prompt__modes'), normal = button('日常模式', 'fa-book-open', () => void setMode(false));
    const battle = button('战斗模式', 'fa-shield-halved', () => void setMode(true));
    modes.append(normal, battle);
    const recommended = button('应用当前状态', 'fa-arrows-rotate', () => void setMode(state.loaded?.recommended));
    controls.append(label, modes, recommended);
    const summary = el('p', 'crypt-lord-battle-prompt__summary'), list = el('dl', 'crypt-lord-battle-prompt__list');
    fieldset.append(controls, summary, list); main.append(fieldset); panel.append(header, status, main); doc().body.append(panel);
    Object.assign(state, { panel, status, fieldset, automatic, normal, battle, recommended, summary, list });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button,input,[tabindex="0"]')]
        .filter(node => !node.matches(':disabled') && node.getClientRects().length &&
          doc().defaultView.getComputedStyle(node).visibility !== 'hidden');
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === panel)) {
        event.preventDefault(); first.focus();
      }
    });
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      const view = doc().defaultView;
      panel.style.left = `${Math.max(8, Math.min(view.innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(view.innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    for (const name of ['pointerup', 'pointercancel']) header.addEventListener(name, () => { drag = null; });
    const events = after.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, close));
    const invalidate = () => {
      if (state.busy || panel.dataset.open !== 'true') return;
      state.token++; state.loaded = null; status.textContent = '楼层或世界书已变化，请重新读取'; render();
    };
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED,
      events?.WORLDINFO_UPDATED, events?.WORLDINFO_SETTINGS_UPDATED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(name, invalidate));
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || type === 'quiet' || options?.quiet_prompt) return;
      state.token++; state.busy = false; state.loaded = null;
      if (panel.dataset.open === 'true') { status.textContent = '生成进行中，请在完成后重新读取'; render(); }
    }));
    for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED']) if (events?.[name])
      state.subscriptions.push(after.bindEvent(events[name], () => {
        if (panel.dataset.open === 'true' && !state.loaded) {
          status.textContent = '生成已结束，请重新读取'; render();
        }
      }));
    const view = doc().defaultView;
    view.addEventListener('cryptLord:variables-updated', invalidate);
    state.subscriptions.push({ stop: () => view.removeEventListener('cryptLord:variables-updated', invalidate) });
    return true;
  }
  function render() {
    const loaded = state.loaded, editable = loaded?.editable;
    state.panel.setAttribute('aria-busy', String(state.busy)); state.fieldset.disabled = state.busy;
    state.automatic.disabled = !loaded; if (!state.busy) state.automatic.checked = loaded?.config.automatic ?? false;
    state.normal.disabled = state.battle.disabled = state.recommended.disabled = !editable;
    state.normal.setAttribute('aria-pressed', String(loaded?.mode === 'normal'));
    state.battle.setAttribute('aria-pressed', String(loaded?.mode === 'battle'));
    const label = { battle: '战斗', normal: '日常', mixed: '条目状态不一致', unavailable: '不可读取' };
    state.summary.textContent = loaded ? `${loaded.book || '未绑定主要世界书'} · 当前${label[loaded.mode]} · ` +
      (loaded.floor ? `#${loaded.floor.message_id} ${loaded.recommended === null ? '状态未知' : loaded.recommended ? '战斗中' : '非战斗'}` : '无 assistant 楼层') : '尚未读取';
    state.list.replaceChildren();
    for (const name of service.names) {
      const row = loaded?.entries?.find(item => String(item.name ?? item.comment ?? '').trim() === name);
      const value = el('dd', row?.enabled ? 'is-enabled' : '', row ? row.enabled ? '开启' : '关闭' : '不可读取');
      state.list.append(el('dt', '', name), value);
    }
  }
  async function operate(action) {
    if (state.busy || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; state.busy = true; state.status.textContent = '处理中...'; render();
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) { state.loaded = null; state.status.textContent = `未完成：${error.message || error}`; }
    } finally { if (active(token)) { state.busy = false; render(); } }
  }
  async function reload() {
    return operate(async guard => {
      state.loaded = null;
      const loaded = await service.load(guard);
      if (!guard()) return;
      state.loaded = loaded; state.status.textContent = loaded.reason || '已读取实际世界书状态';
    });
  }
  async function setMode(battle) {
    if (state.busy || !state.loaded?.editable || typeof battle !== 'boolean') return;
    const baseline = state.loaded;
    if (!doc().defaultView.confirm(`将「${baseline.book}」切换为${battle ? '战斗' : '日常'}提示模式？只修改五个条目的启用状态。`)) return;
    return operate(async guard => {
      const result = await service.setMode(baseline, battle, guard);
      if (!guard()) return;
      state.loaded = result.loaded;
      state.status.textContent = result.warning || (result.unchanged ? '模式无变化，未写入' : `${battle ? '战斗' : '日常'}模式已保存`);
    });
  }
  async function changeAutomatic(automatic) {
    if (state.busy || !state.loaded) return;
    const baseline = state.loaded;
    return operate(async guard => {
      const result = await service.saveAutomatic(baseline, automatic, guard);
      if (!guard()) return;
      state.loaded = result.loaded; state.status.textContent = result.warning ||
        (automatic ? '自动切换已开启' : '自动切换已关闭，保留现有条目状态');
    });
  }
  async function open() {
    if (!mount() || state.busy) return false;
    if (state.panel.dataset.open === 'true') { state.panel.focus(); return true; }
    state.focus = doc().activeElement; state.panel.dataset.open = 'true'; state.panel.focus(); await reload(); return true;
  }
  const api = Object.freeze({ status: () => ({ ready: !state.disposed }), mount, open, close, reload,
    dispose() {
      close(); state.disposed = true; state.subscriptions.forEach(item => item?.stop()); state.panel?.remove();
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
