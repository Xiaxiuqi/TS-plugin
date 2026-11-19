(() => {
  'use strict';
  const KEY = 'cryptLord.characterArchiveUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.characterPanelState'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('档案界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { panel: null, token: 0, disposed: false, busy: false, messageId: null, sourceId: null,
    loaded: null, stale: false, generating: false, folded: new Set(), subscriptions: [], focus: null,
    pending: null, lifetime: 0 };
  const doc = () => after.getHost()?.document || document;
  const current = () => !state.disposed && state.panel?.isConnected && state.panel.ownerDocument === doc() &&
    modules[KEY] === api && modules['cryptLord.characterPanelState'] === service &&
    modules['cryptLord.afterNativeHost'] === after && state.panel.dataset.open === 'true';
  const active = token => token === state.token && current();
  const text = value => typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
  function el(tag, cls = '', value) {
    const node = doc().createElement(tag); node.className = cls;
    if (value !== undefined) node.textContent = value; return node;
  }
  function button(label, icon, action) {
    const node = el('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = el('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true'); node.append(symbol);
    node.addEventListener('click', action); return node;
  }
  function setBusy(value) {
    state.busy = value;
    for (const node of (state.panel?.ownerDocument || doc()).querySelectorAll('.crypt-lord-game-shell__quest-delete'))
      node.disabled = value || !!state.pending;
  }
  function close(force = false) {
    if (force !== true && state.pending &&
      !doc().defaultView.confirm('关闭将放弃待保存或待核对的任务删除结果，确定关闭？')) return false;
    state.lifetime++; state.pending = null;
    state.token++; setBusy(false); state.panel?.setAttribute('data-open', 'false');
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
    return true;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return state.panel.isConnected && state.panel.ownerDocument === doc();
    const panel = el('section', 'crypt-lord-archive'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '档案详情');
    panel.setAttribute('aria-modal', 'true');
    const header = el('header'), tools = el('div', 'crypt-lord-archive__tools');
    const refresh = button('重新读取', 'fa-rotate-right', () => void reload());
    const exit = button('关闭', 'fa-xmark', close);
    refresh.dataset.symbol = '\u21bb'; exit.dataset.symbol = '\u00d7'; tools.append(refresh, exit);
    header.append(el('strong', '', '档案详情'), tools);
    const status = el('p', 'crypt-lord-archive__status'); status.setAttribute('role', 'status');
    const recovery = el('div', 'crypt-lord-archive__recovery');
    const main = el('main'), fieldset = el('fieldset'); main.append(fieldset); panel.append(header, status, recovery, main);
    doc().body.append(panel); Object.assign(state, { panel, refresh, status, recovery, main, fieldset });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button,input,summary,[tabindex="0"]')]
        .filter(item => !item.matches(':disabled') && item.getClientRects().length && item.checkVisibility());
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && [first, panel].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && doc().activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
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
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      close(true); state.generating = false; state.loaded = null; state.messageId = null; state.sourceId = null; state.folded.clear();
    }));
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED,
      events?.CHARACTER_MESSAGE_RENDERED, events?.USER_MESSAGE_RENDERED].filter(Boolean))) {
      state.subscriptions.push(after.bindEvent(name, () => {
        if (state.panel.dataset.open !== 'true' || state.busy) return;
        state.stale = true; state.status.textContent = '楼层已更新，请重新读取'; render();
      }));
    }
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      const info = typeof type === 'object' ? type : options, kind = typeof type === 'string' ? type : info?.type;
      if (dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(kind) ||
        info?.dryRun || info?.quiet_prompt || info?.options?.dryRun || info?.options?.quiet_prompt) return;
      state.generating = true; state.lifetime++; state.token++; setBusy(false); state.stale = true;
      state.status.textContent = '正文生成中，档案修改已取消'; render();
    }));
    for (const name of [events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))
      state.subscriptions.push(after.bindEvent(name, () => {
        if (!state.generating) return;
        state.generating = false; state.stale = true;
        state.status.textContent = '生成已结束，请重新读取档案'; render();
      }));
    const clamp = () => {
      if (!current() || !panel.style.left || !panel.offsetWidth) return;
      const rect = panel.getBoundingClientRect(), view = doc().defaultView;
      panel.style.left = `${Math.max(8, Math.min(view.innerWidth - panel.offsetWidth - 8, rect.left))}px`;
      panel.style.top = `${Math.max(8, Math.min(view.innerHeight - panel.offsetHeight - 8, rect.top))}px`;
    };
    const mountedWindow = doc().defaultView;
    mountedWindow.addEventListener('resize', clamp);
    state.subscriptions.push({ stop: () => mountedWindow.removeEventListener('resize', clamp) });
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(() => { if (state.loaded && current()) render(); });
      for (const node of [doc().documentElement, doc().body])
        observer.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
      state.subscriptions.push({ stop: () => observer.disconnect() });
    }
    return true;
  }
  function fields(parent, values) {
    const list = el('dl');
    for (const [label, value] of values) list.append(el('dt', '', label), el('dd', '', text(value)));
    parent.append(list);
  }
  function meter(parent, label, value, percent, kind) {
    const line = el('div', 'crypt-lord-archive__attribute');
    line.append(el('span', '', label), el('strong', '', value));
    const track = el('div', 'crypt-lord-archive__track'), fill = el('span');
    track.dataset.kind = kind; fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    track.append(fill); parent.append(line, track);
  }
  function radar(parent, axes) {
    const canvas = el('canvas', 'crypt-lord-archive__radar'), dpr = Math.max(1, Math.min(3, doc().defaultView.devicePixelRatio || 1));
    canvas.width = 264 * dpr; canvas.height = 240 * dpr; parent.append(canvas);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `六维上限相对图：${axes.map(row => `${row.label} ${Math.round(row.value)}%`).join('，')}`);
    const ctx = canvas.getContext?.('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const point = (index, distance) => {
      const angle = Math.PI * 2 * index / axes.length - Math.PI / 2;
      return [132 + Math.cos(angle) * distance, 118 + Math.sin(angle) * distance];
    };
    const polygon = values => {
      ctx.beginPath(); values.forEach((distance, index) => {
        const [x, y] = point(index, distance); if (!index) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }); ctx.closePath();
    };
    ctx.strokeStyle = '#82938c'; ctx.lineWidth = 1;
    for (let level = 1; level <= 4; level++) { polygon(axes.map(() => 76 * level / 4)); ctx.stroke(); }
    axes.forEach((row, index) => {
      const [x, y] = point(index, 76); ctx.beginPath(); ctx.moveTo(132, 118); ctx.lineTo(x, y); ctx.stroke();
      const [lx, ly] = point(index, 100);
      ctx.fillStyle = doc().defaultView.getComputedStyle(state.panel).color;
      ctx.font = '12px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(row.label, lx, ly);
    });
    polygon(axes.map(row => 76 * row.value / 100));
    ctx.fillStyle = 'rgba(88,166,134,.25)'; ctx.strokeStyle = '#58a686'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
  }
  function section(title, key) {
    const node = el('section', `crypt-lord-archive__section crypt-lord-archive__${key}`);
    node.append(el('h3', '', title)); state.fieldset.append(node); return node;
  }
  function details(title, key) {
    const node = el('details'), summary = el('summary', '', title); node.append(summary);
    node.open = !state.folded.has(key);
    node.addEventListener('toggle', () => {
      if (!node.isConnected) return;
      if (node.open) state.folded.delete(key); else state.folded.add(key);
    });
    return node;
  }
  function render() {
    if (state.panel.ownerDocument !== doc()) {
      state.fieldset.disabled = true; state.refresh.disabled = true;
      for (const node of state.recovery.querySelectorAll('button')) node.disabled = true;
      return;
    }
    const scroll = state.main.scrollTop;
    state.fieldset.replaceChildren(); state.fieldset.disabled = state.busy || state.generating || !!state.pending;
    state.refresh.disabled = state.busy || state.generating;
    state.recovery.replaceChildren();
    if (state.pending) {
      const phase = state.pending.transaction.status(), label = phase === 'uncertain' ? '核对保存' : '重试保存';
      const retry = button(label, 'fa-rotate-right', () => void recover());
      retry.append(el('span', '', label));
      retry.disabled = state.busy || state.stale || state.generating || !['pending', 'uncertain'].includes(phase);
      state.recovery.append(retry);
    }
    if (!state.loaded) { state.fieldset.append(el('p', 'crypt-lord-archive__empty', '尚未读取角色档案')); return; }
    const loaded = state.loaded, view = loaded.view, stat = loaded.floor.data.stat_data;
    const editable = current() && loaded.editable && !state.stale && !state.generating && !state.pending;
    const profile = section('调查员档案', 'profile'), overview = el('div', 'crypt-lord-archive__overview');
    profile.append(el('p', 'crypt-lord-archive__identity', `${text(stat.名称 || stat.姓名 || '<User>')} · ${service.sequence(stat)}`));
    const values = el('div', 'crypt-lord-archive__attributes');
    for (const row of view.attributes) meter(values, row.label,
      row.label === '运气' ? String(row.maximum) : `${row.current} / ${row.maximum}`, row.percentage,
      row.percentage < 34 ? 'low' : row.percentage < 67 ? 'medium' : 'high');
    fields(values, [['身体年龄', view.bodyAge], ['灵魂年龄', view.soulAge]]);
    overview.append(values); radar(overview, view.radar); profile.append(overview);
    const quests = section('<User>接受的任务', 'quests');
    quests.querySelector('h3').append(el('span', 'crypt-lord-archive__count', `${view.quests.length}/10`));
    if (view.quests.length >= 10) quests.append(el('p', 'crypt-lord-archive__warning', '任务已满 10 个，新任务将被自动清理'));
    if (!view.quests.length) quests.append(el('p', 'crypt-lord-archive__empty', '暂无接受的任务'));
    for (const entry of view.quests) {
      const row = el('article', 'crypt-lord-archive__quest'); row.dataset.key = entry.key;
      const heading = el('div', 'crypt-lord-archive__heading'), detail = details(entry.name, `quest:${entry.key}`);
      const flags = el('p', 'crypt-lord-archive__flags', `${entry.completed ? '已完成' : '未完成'} · ${entry.claimed ? '已领奖' : '未领奖'}`);
      fields(detail, [['委托者', entry.commissioner || '无'], ['概述', entry.summary || '无'],
        ['完成条件', entry.condition || '无'], ['奖励', entry.reward || '无']]);
      detail.append(flags);
      const remove = button(`删除任务「${entry.name}」`, 'fa-trash-can', () => void mutate(entry));
      remove.classList.add('is-danger'); remove.disabled = !editable; heading.append(detail, remove);
      row.append(heading); quests.append(row);
    }
    const traits = section('非凡特性', 'traits');
    if (!view.traits.length) traits.append(el('p', 'crypt-lord-archive__empty', '暂无非凡特性'));
    view.traits.forEach((row, index) => {
      const detail = details(`【${row.tier}】${row.name}`, `trait:${index}:${row.name}`);
      detail.append(el('p', '', row.description)); if (row.bonuses.length) fields(detail, row.bonuses);
      traits.append(detail);
    });
    const equipment = section('装备', 'equipment');
    if (!view.equipment.length) equipment.append(el('p', 'crypt-lord-archive__empty', '暂无装备'));
    for (const row of view.equipment) {
      const line = el('div', 'crypt-lord-archive__equipment-row');
      line.append(el('strong', '', row.name), el('span', '',
        [row.type, text(row.tier), row.equipped ? '已装备' : ''].filter(Boolean).join(' · ')));
      equipment.append(line);
    }
    const acting = section('扮演法详情', 'acting');
    meter(acting, '消化进度', `${view.digestion}%`, view.digestion, 'digestion');
    fields(acting, [['失控进度', view.loss]]);
    state.main.scrollTop = scroll;
  }
  async function operate(action) {
    if (state.busy || state.generating || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; setBusy(true); state.fieldset.disabled = true;
    state.refresh.disabled = true; state.status.textContent = '处理中...';
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) {
        const phase = state.pending?.transaction.status();
        if (phase === 'invalid' || /变化|不存在|取消/.test(error.message)) state.stale = true;
        if (phase === 'failed') state.pending = null;
        state.status.textContent = `${state.pending ? '任务删除尚未确认' : '未提交'}：${error.message || error}`;
      }
    } finally {
      if (token === state.token) {
        setBusy(false);
        if (!current()) {
          state.stale = true;
          state.status.textContent = '档案宿主或服务已变化，请重新打开';
          close(true);
        } else render();
      }
    }
  }
  async function reload() {
    if (state.busy || state.generating) return;
    if (state.pending && !doc().defaultView.confirm('重新读取将放弃待保存或待核对的任务删除结果，继续？')) return;
    state.lifetime++; state.pending = null;
    const scroll = state.main.scrollTop;
    return operate(async guard => {
      state.loaded = null; state.stale = false; render();
      const loaded = await service.load(state.messageId, guard);
      if (!guard()) return;
      const changedSource = state.sourceId !== loaded.floor.message_id;
      if (changedSource) state.folded.clear();
      state.sourceId = loaded.floor.message_id; state.loaded = loaded;
      state.status.textContent = `#${loaded.floor.message_id}${loaded.reason ? ` · ${loaded.reason}` : ''}`;
      render(); state.main.scrollTop = changedSource ? 0 : scroll;
    });
  }
  async function mutate(entry) {
    if (!current() || state.busy || state.pending || state.generating || !state.loaded?.editable || state.stale) return;
    const baseline = state.loaded, target = structuredClone(entry), token = state.token;
    if (!doc().defaultView.confirm(`确定删除任务「${entry.name}」吗？此操作不可恢复。`)) return;
    if (!active(token)) return;
    const lifetime = state.lifetime;
    return operate(async guard => {
      const transaction = service.begin(baseline, target,
        () => current() && lifetime === state.lifetime && !state.generating);
      state.pending = { transaction, baseline, target };
      await finish(await transaction.run(), guard);
    });
  }
  async function finish(result, guard) {
      if (!guard()) return;
      const { baseline, target } = state.pending;
      state.pending = null; state.loaded = result.loaded; state.stale = !result.loaded;
      state.status.textContent = result.warning || `已删除任务「${target.name}」`;
      try { if (result.data) modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
        messageId: baseline.floor.message_id, beforeData: baseline.floor.data, afterData: result.data,
        source: 'accepted-quest-delete',
      }); } catch (error) { console.warn('任务已删除，变量面板通知失败', error); }
      for (const refresh of [
        () => modules['cryptLord.gameShell']?.refresh?.(),
        () => modules['cryptLord.nativeFloorStatusBar']?.refresh?.(baseline.floor.message_id),
      ]) {
        try { await refresh(); } catch (error) { console.warn('任务已删除，面板刷新失败', error); }
        if (!guard()) return;
      }
  }
  async function recover() {
    if (!current() || !state.pending || state.stale) return;
    return operate(async guard => {
      const transaction = state.pending.transaction;
      await finish(await (transaction.status() === 'uncertain' ? transaction.inspect() : transaction.save()), guard);
    });
  }
  async function open(messageId = null) {
    if (!mount() || messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) return false;
    if (state.panel.dataset.open === 'true' && state.messageId === messageId) { state.panel.focus(); return true; }
    if (state.panel.dataset.open === 'true' && state.busy) return false;
    if (state.pending && !doc().defaultView.confirm('切换档案将放弃待保存或待核对的任务删除结果，继续？')) return false;
    state.pending = null;
    if (messageId !== state.messageId) state.folded.clear();
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.messageId = messageId; state.panel.dataset.open = 'true'; state.panel.focus(); await reload(); return true;
  }
  async function deleteQuest(messageId, entry, expectedFloor) {
    const target = structuredClone(entry), expected = structuredClone(expectedFloor);
    const opening = open(messageId), token = state.token;
    if (!await opening || !active(token) || state.busy || !state.loaded) return false;
    if (!expected || ['message_id', 'role', 'message', 'data', 'swipe_id'].some(key =>
      JSON.stringify(expected[key]) !== JSON.stringify(state.loaded.floor[key]))) {
      state.stale = true; state.status.textContent = '角色面板来源已变化，请重新读取后删除'; render(); return false;
    }
    await mutate(target); return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: !state.disposed, open: state.panel?.dataset.open === 'true', busy: state.busy,
      pending: !!state.pending, phase: state.pending?.transaction.status(), stale: state.stale }),
    mount, open, close, reload, deleteQuest,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(subscription => subscription?.stop());
      state.panel?.remove(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
