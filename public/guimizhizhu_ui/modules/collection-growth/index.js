(() => {
  'use strict';
  const KEY = 'cryptLord.collectionGrowthUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.collectionGrowth'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('变量增殖提醒界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { disposed: false, token: 0, busy: false, loaded: null, draft: null, tab: 'alerts',
    dirty: false, generating: false, focus: null, resumes: new Set(), selectedMutes: new Set(),
    session: 0, transaction: null, subscriptions: [] };
  const doc = () => state.surface?.document || after.getHost()?.document || document;
  const node = (tag, cls = '', text) => {
    const item = doc().createElement(tag); item.className = cls;
    if (text !== undefined) item.textContent = text; return item;
  };
  function surfaceValid() {
    const surface = after.getHost();
    return modules[KEY] === api && modules['cryptLord.collectionGrowth'] === service &&
      modules['cryptLord.afterNativeHost'] === after && modules['cryptLord.hostApi'] === state.host &&
      surface?.document === state.surface?.document && surface?.window === state.surface?.window;
  }
  const active = token => {
    if (state.disposed || token !== state.token || state.panel?.dataset.open !== 'true') return false;
    if (!surfaceValid()) { closeRaw(); return false; }
    return true;
  };
  function transactionGuard() {
    const session = state.session;
    return () => session === state.session && active(state.token);
  }
  function tool(label, icon, action, compact = false) {
    const button = node('button'); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
    const image = node('i', `fa-solid fa-${icon}`); image.setAttribute('aria-hidden', 'true'); button.append(image);
    if (!compact) button.append(node('span', '', label));
    button.addEventListener('click', action); return button;
  }
  function closeRaw() {
    state.token++; state.session++; state.busy = false; state.loaded = state.draft = null; state.dirty = false;
    state.resumes.clear(); state.selectedMutes.clear(); state.transaction = null;
    if (state.panel) { state.panel.dataset.open = 'false'; state.panel.setAttribute('aria-busy', 'false'); }
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  function close() {
    if (state.transaction) {
      if (!doc().defaultView.confirm('保存结果尚未处理完成，关闭并放弃本次恢复？已提交的配置不会撤销。')) return;
      closeRaw(); return;
    }
    if (state.tab === 'settings') {
      if (state.dirty && !doc().defaultView.confirm('放弃尚未保存的提醒配置？')) return;
      closeRaw();
    } else if (state.busy || !state.loaded) closeRaw();
    else void acknowledge();
  }
  function fill(loaded) {
    state.loaded = loaded; state.draft = structuredClone(loaded.config); state.dirty = false;
    state.resumes.clear(); state.selectedMutes.clear();
  }
  function render() {
    const loaded = state.loaded;
    const pending = Boolean(state.transaction), phase = state.transaction?.status().phase;
    const scroll = state.fields.parentElement?.scrollTop || 0;
    state.panel.setAttribute('aria-busy', String(state.busy)); state.fields.disabled = state.busy || state.generating || !loaded || pending;
    state.reload.disabled = state.busy || state.generating;
    state.tabs.forEach((button, tab) => {
      button.setAttribute('aria-selected', String(state.tab === tab)); button.disabled = state.busy || pending;
    });
    state.alerts.hidden = state.tab !== 'alerts'; state.settings.hidden = state.tab !== 'settings';
    state.summary.textContent = loaded ? loaded.reason || `原生楼层 #${loaded.floor.message_id} · ${loaded.alerts.length} 个未确认超限集合` : '尚未读取';
    state.alerts.replaceChildren(); state.settings.replaceChildren();
    const alerts = loaded?.alerts || [], named = alerts.filter(row => row.kind === 'named'), unknown = alerts.filter(row => row.kind === 'unknown');
    function mute(group, title, parent) {
      const label = node('label', 'crypt-lord-growth__mute'), box = node('input'); box.type = 'checkbox';
      box.checked = state.selectedMutes.has(group);
      box.addEventListener('change', () => {
        if (box.checked) state.selectedMutes.add(group); else state.selectedMutes.delete(group);
      });
      box.setAttribute('aria-label', title); label.append(box, node('span', '', title)); parent.append(label);
    }
    if (!alerts.length) state.alerts.append(node('p', '', loaded?.reason || '没有待确认的超限集合'));
    if (named.length) {
      state.alerts.append(node('h3', '', '诡秘卡自带变量'));
      for (const row of named) {
        const section = node('div', 'crypt-lord-growth__alert');
        section.append(node('p', '', `${row.pathLabel}现在有 ${row.count} 条，超过建议的 ${row.threshold} 条`));
        mute(row.group, `不再提醒${row.pathLabel}`, section); state.alerts.append(section);
      }
    }
    if (unknown.length) {
      state.alerts.append(node('h3', '', `第三方变量 · ${unknown.length} 个超限集合`));
      mute('_unknown', '不再提醒所有第三方变量', state.alerts);
      for (const row of unknown) state.alerts.append(node('p', 'crypt-lord-growth__path',
        `${row.pathLabel}现在有 ${row.count} 条，超过建议的 ${row.threshold} 条`));
    }
    for (const group of service.targets) {
      const row = node('div', 'crypt-lord-growth__setting'), title = node('strong', '', service.labels[group]);
      const config = state.draft?.targets[group], values = loaded?.collections?.filter(item => item.group === group) || [];
      const summary = node('span', 'crypt-lord-growth__count', group === '_unknown' ? `${values.length} 个集合` : `${values[0]?.count || 0} 条`);
      const limitLabel = node('label'), limit = node('input'); limit.type = 'number'; limit.min = '1'; limit.max = '999'; limit.step = '1';
      limit.value = config?.threshold ?? ''; limit.setAttribute('aria-label', `${service.labels[group]}提醒阈值`);
      limitLabel.append(node('span', '', '阈值'), limit);
      const mutedLabel = node('label'), muted = node('input'); muted.type = 'checkbox'; muted.checked = config?.permanentlyMuted ?? false;
      muted.setAttribute('aria-label', `永久静音${service.labels[group]}`); mutedLabel.append(muted, node('span', '', '永久静音'));
      const changed = () => {
        state.draft.targets[group].threshold = Number(limit.value);
        state.draft.targets[group].permanentlyMuted = muted.checked;
        state.dirty = true; state.save.disabled = state.busy || state.generating || !state.loaded;
        state.status.textContent = '配置有未保存的修改';
      };
      limit.addEventListener('input', changed); muted.addEventListener('change', changed);
      const resume = tool(`恢复${service.labels[group]}提醒`, 'bell', () => {
        muted.checked = false; changed(); state.resumes.add(group);
      }, true);
      row.append(title, summary, limitLabel, mutedLabel, resume); state.settings.append(row);
    }
    state.save.hidden = state.tab !== 'settings'; state.ok.hidden = state.tab !== 'alerts';
    state.save.disabled = state.busy || state.generating || !loaded || !state.dirty || pending;
    state.ok.disabled = state.busy || state.generating || !loaded || pending;
    state.recover.hidden = !pending;
    state.recover.disabled = state.busy || state.generating || phase === 'conflict';
    state.recover.querySelector('span').textContent = phase === 'uncertain' ? '核对保存' : '重试保存';
    state.recover.title = phase === 'uncertain' ? '核对保存' : '重试保存';
    state.recover.setAttribute('aria-label', phase === 'uncertain' ? '核对保存' : '重试保存');
    if (state.fields.parentElement) state.fields.parentElement.scrollTop = scroll;
  }
  async function operate(action, preserveDraft = false) {
    if (state.busy || state.generating || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; state.busy = true; state.status.textContent = '处理中...';
    state.panel.setAttribute('aria-busy', 'true'); state.fields.disabled = true; state.reload.disabled = true;
    state.save.disabled = state.ok.disabled = true; state.tabs.forEach(button => { button.disabled = true; });
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) {
        if (!preserveDraft || /变化|身份|来源|损坏/.test(String(error.message))) state.loaded = null;
        state.status.textContent = `未完成：${error.message || error}`;
      }
    } finally { if (active(token)) { state.busy = false; render(); } }
  }
  async function reload() {
    if ((state.dirty || state.transaction) && !doc().defaultView.confirm(state.transaction ?
      '放弃本次保存恢复并重新读取实际配置？已提交的配置不会撤销。' : '放弃尚未保存的提醒配置并重新读取？')) return;
    return operate(async guard => {
      state.session++; state.transaction = null;
      const loaded = await service.load(guard);
      if (!guard()) return;
      fill(loaded); state.status.textContent = loaded.reason || '已读取实际配置和集合数量';
    });
  }
  async function save() {
    if (!state.loaded || !state.dirty) return;
    const loaded = state.loaded, draft = structuredClone(state.draft), resumes = [...state.resumes];
    return operate(async guard => {
      state.transaction = service.beginConfig(loaded, draft, transactionGuard(), resumes);
      await finishTransaction(guard);
    }, true);
  }
  async function acknowledge() {
    if (!state.loaded) { closeRaw(); return; }
    const loaded = state.loaded, mutes = [...state.selectedMutes];
    return operate(async guard => {
      state.transaction = service.beginAcknowledgement(loaded, mutes, transactionGuard());
      await finishTransaction(guard);
    }, true);
  }
  async function finishTransaction(guard, inspect = false) {
    const transaction = state.transaction;
    const result = await transaction[inspect ? 'inspect' : 'save']();
    if (!guard()) return;
    if (transaction.status().phase !== 'saved') {
      state.status.textContent = result.warning; return;
    }
    state.transaction = null;
    if (transaction.status().acknowledgement && !result.warning) { closeRaw(); return; }
    if (result.loaded) fill(result.loaded); else state.loaded = null;
    state.status.textContent = result.warning || (result.unchanged ? '提醒状态已恢复，配置未变化' : '提醒配置已保存');
  }
  function recover() {
    if (!state.transaction) return;
    return operate(guard => finishTransaction(guard, state.transaction.status().phase === 'uncertain'), true);
  }
  function setTab(tab) {
    if (state.busy || state.transaction || !['alerts', 'settings'].includes(tab) || state.tab === tab) return;
    if (state.dirty && !doc().defaultView.confirm('放弃尚未保存的提醒配置？')) return;
    if (state.dirty && state.loaded) {
      state.draft = structuredClone(state.loaded.config); state.dirty = false; state.resumes.clear();
    }
    state.tab = tab; render();
  }
  function mount() {
    if (state.disposed) return false; if (state.panel) return true;
    state.surface = after.getHost(); state.host = modules['cryptLord.hostApi'];
    const panel = node('section', 'crypt-lord-growth'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '变量增殖提醒');
    const header = node('header'), tools = node('div', 'crypt-lord-growth__tools');
    state.reload = tool('重新读取', 'rotate-right', () => void reload(), true);
    tools.append(state.reload, tool('关闭', 'xmark', close, true)); header.append(node('strong', '', '变量增殖提醒'), tools);
    const nav = node('nav'); nav.setAttribute('role', 'tablist'); state.tabs = new Map();
    for (const [tab, title, icon] of [['alerts', '当前提醒', 'bell'], ['settings', '提醒配置', 'sliders']]) {
      const button = tool(title, icon, () => setTab(tab)); button.setAttribute('role', 'tab'); button.id = `crypt-lord-growth-tab-${tab}`;
      button.setAttribute('aria-controls', `crypt-lord-growth-${tab}`); nav.append(button); state.tabs.set(tab, button);
    }
    nav.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || state.busy) return;
      event.preventDefault(); setTab(state.tab === 'alerts' ? 'settings' : 'alerts'); state.tabs.get(state.tab).focus();
    });
    const summary = node('p', 'crypt-lord-growth__summary'), main = node('main'), fields = node('fieldset');
    const alerts = node('section'), settings = node('section');
    for (const [tab, section] of [['alerts', alerts], ['settings', settings]]) {
      section.id = `crypt-lord-growth-${tab}`; section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', `crypt-lord-growth-tab-${tab}`);
    }
    fields.append(alerts, settings); main.append(fields);
    const footer = node('footer'), status = node('span'); status.setAttribute('role', 'status');
    const saveButton = tool('保存提醒配置', 'floppy-disk', () => void save()), ok = tool('知道了', 'check', () => void acknowledge());
    const recoverButton = tool('重试保存', 'rotate-right', () => void recover());
    footer.append(status, recoverButton, saveButton, ok); panel.append(header, nav, summary, main, footer); doc().body.append(panel);
    Object.assign(state, { panel, summary, fields, alerts, settings, status, save: saveButton, ok, recover: recoverButton }); render();
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button,input,[tabindex="0"]')]
          .filter(item => !item.matches(':disabled') && item.getClientRects().length && item.checkVisibility());
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && [first, panel].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && doc().activeElement === last) { event.preventDefault(); first?.focus(); }
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
    for (const event of ['pointerup', 'pointercancel']) header.addEventListener(event, () => { drag = null; });
    const events = after.tavernEvents();
    if (events.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      state.generating = false; closeRaw();
    }));
    const invalidated = () => {
      if (!active(state.token) || state.busy || state.transaction) return;
      state.token++; state.loaded = null; state.status.textContent = '原生来源已变化，请重新读取'; render();
    };
    for (const event of new Set([events.MESSAGE_UPDATED, events.MESSAGE_DELETED, events.MESSAGE_SWIPED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(event, invalidated));
    if (events.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || options?.params?.dryRun || ['quiet', 'quiet_prompt'].includes(type) ||
        options?.quiet_prompt || options?.params?.quiet_prompt) return;
      if (!surfaceValid()) { closeRaw(); return; }
      state.generating = true; state.token++; state.session++; state.busy = false; state.loaded = null; state.transaction = null;
      state.status.textContent = '正文生成中，提醒操作已取消'; render();
    }));
    for (const event of [events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean))
      state.subscriptions.push(after.bindEvent(event, () => {
        if (!state.generating) return;
        state.generating = false; state.status.textContent = '生成已结束，请重新读取提醒'; render();
      }));
    const view = doc().defaultView;
    view.addEventListener('cryptLord:variables-updated', invalidated);
    state.subscriptions.push({ stop: () => view.removeEventListener('cryptLord:variables-updated', invalidated) });
    state.subscriptions.push(service.subscribe(loaded => {
      if (state.disposed || state.busy || state.dirty || state.generating || state.transaction) return;
      if (!surfaceValid()) { closeRaw(); return; }
      if (panel.dataset.open === 'true' && state.selectedMutes.size) return;
      if (panel.dataset.open !== 'true') { state.focus = doc().activeElement; panel.dataset.open = 'true'; state.tab = 'alerts'; panel.focus(); }
      state.token++; fill(loaded); state.status.textContent = '集合数量超过提醒阈值'; render();
    }));
    return true;
  }
  async function open(options = {}) {
    if (!mount()) return false;
    if (!surfaceValid()) { closeRaw(); return false; }
    if (state.panel.dataset.open === 'true') { state.panel.focus(); return true; }
    state.focus = doc().activeElement; state.panel.dataset.open = 'true'; state.tab = options.tab === 'settings' ? 'settings' : 'alerts';
    state.panel.focus(); await reload(); return true;
  }
  const api = Object.freeze({ status: () => ({ ready: !state.disposed }), mount, open, close, reload,
    dispose() {
      closeRaw(); state.disposed = true; state.subscriptions.forEach(item => item?.stop()); state.panel?.remove();
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
