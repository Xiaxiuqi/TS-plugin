function getSillyTavern() {
  try {
    return window.SillyTavern || window.parent?.SillyTavern || window.top?.SillyTavern || null;
  } catch {
    return window.SillyTavern || null;
  }
}

const TABS = [
  ['overview', '账本总览', 'fa-book-open'],
  ['candidates', '候选轨迹', 'fa-code-branch'],
  ['chronicle', '幕后纪要', 'fa-scroll'],
  ['missed', '错过清单', 'fa-hourglass-end'],
  ['rumors', '风声', 'fa-wind'],
  ['signals', '场外信号', 'fa-satellite-dish'],
];
const LEDGER_KEY = '_qrf_world_simulation_state';
const MATERIAL_KEY = '_qrf_world_simulation_agent_materials';
const ENVELOPE_KEY = '_qrf_world_simulation';
const ORB_POSITION_KEY = 'acu_ws_orb_position_v1';
const PANEL_GEOMETRY_KEY = 'acu_ws_panel_geometry_v1';
const THEME_KEY = 'acu_ws_theme_v1';
const STATUS = {
  established: '已建立', incubating: '酝酿中', active: '活跃', converging: '汇聚中',
  latent: '潜伏', ripe: '待命', revealed: '已得知', dead: '已失效',
  encounter: '遭遇', rumor: '传闻', ambient: '环境',
  running: '进行中', completed: '已完成', blocked: '受阻',
};
const label = value => STATUS[value] ?? value;
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const escapeHtml = value => text(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const display = value => escapeHtml(value || '未记录');
const item = (row, changed = new Set()) => `
  <article class="acu-ws-item${changed.size ? ' acu-ws-updated' : ''}">
    <div class="acu-ws-item-head"><h4 class="${changed.has('title') ? 'acu-ws-changed' : ''}">${display(row.title)}</h4>${row.badge ? `<span class="acu-ws-badge${changed.has('badge') ? ' acu-ws-changed' : ''}">${display(row.badge)}</span>` : ''}</div>
    <p class="${changed.has('detail') ? 'acu-ws-changed' : ''}">${display(row.detail)}</p>${row.meta ? `<small class="${changed.has('meta') ? 'acu-ws-changed' : ''}">${display(row.meta)}</small>` : ''}
  </article>`;
const section = (title, entries) => `
  <section class="acu-ws-section"><h3>${escapeHtml(title)} <span>${entries.length}</span></h3>
  ${entries.length ? entries.join('') : '<p class="acu-ws-empty-inline">暂无记录</p>'}</section>`;
const empty = () => '<div class="acu-ws-empty"><i class="fas fa-layer-group" aria-hidden="true"></i><strong>暂无推演资料</strong><span>当前聊天分支尚未留下这一类记录。</span></div>';

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function applyDelta(ledger, delta) {
  if (!ledger) return null;
  const next = { ...ledger };
  for (const name of ['dimensions', 'seeds', 'actors', 'chronicle', 'rumors', 'chronicleOverview']) {
    const removed = new Set(array(delta.removedIds?.[name]));
    const changed = array(delta.upserts?.[name]);
    const id = name === 'chronicleOverview' ? 'fingerprint' : 'id';
    const byId = new Map(changed.map(entry => [entry[id], entry]));
    next[name] = array(ledger[name]).filter(entry => !removed.has(entry[id])).map(entry => {
      const updated = byId.get(entry[id]);
      byId.delete(entry[id]);
      return updated ?? entry;
    }).concat([...byId.values()]);
  }
  for (const name of ['clock', 'player', 'guidance', 'materialCompletion', 'pendingFixes']) {
    if (delta[name] !== undefined) next[name] = delta[name];
  }
  next.revision = delta.revision;
  return next;
}

async function readSimulation() {
  const context = getSillyTavern()?.getContext?.();
  const chat = context?.chat;
  if (!Array.isArray(chat)) return { ledger: null, candidates: [], message: '无法读取当前聊天楼层' };
  const chatId = text(getSillyTavern()?.getCurrentChatId?.() ?? context?.chatId) || '__host_without_chat_id__';
  let ledger = null;
  const envelope = chat[0]?.[ENVELOPE_KEY];
  let candidates = array(envelope?.timeline);
  for (let index = 0; index < chat.length; index++) {
    const message = chat[index];
    if (!message || message.is_user || message.is_system) continue;
    const messageId = message.message_id ?? index;
    const anchor = {
      messageKey: `${typeof messageId}:${messageId}`,
      swipeId: String(Number.isInteger(message.swipe_id) ? message.swipe_id : 0),
      contentDigest: await digest(typeof message.mes === 'string' ? message.mes : String(message.message ?? '')),
    };
    const read = key => {
      const bucket = message[key];
      if (!bucket || bucket.schemaVersion !== 1 || !bucket.entries) return null;
      const entry = Object.values(bucket.entries).find(candidate => {
        const saved = candidate?.anchor;
        return saved?.chatIdentity === chatId && saved.messageKey === anchor.messageKey &&
          saved.swipeId === anchor.swipeId && saved.contentDigest === anchor.contentDigest;
      });
      return entry?.value ?? null;
    };
    const frame = read(LEDGER_KEY);
    if (frame?.clock && Array.isArray(frame.seeds)) ledger = frame;
    else if (frame?.schemaVersion === 2 && Array.isArray(frame.deltas)) {
      if (frame.checkpoint) ledger = frame.checkpoint;
      for (const delta of [...frame.deltas].sort((a, b) => a.seq - b.seq)) ledger = applyDelta(ledger, delta);
    }
    const material = read(MATERIAL_KEY);
    if (!ledger && material?.ledger) ledger = material.ledger;
  }
  if (!ledger && envelope?.ledger?.clock) ledger = envelope.ledger;
  return { chatId, ledger, candidates, message: ledger ? '' : '当前分支尚无可读取的格林推演账本' };
}

function viewRows(data) {
  const ledger = data.ledger ?? {};
  const clock = ledger.clock ?? {};
  const rows = (entries, makeRow) => array(entries).map((value, index) => ({
    key: String(value.id ?? index), ...makeRow(value),
  }));
  return {
    clock: [{ key: 'clock', title: `第 ${clock.day ?? '—'} 日`, detail: clock.storyTime || clock.slot }],
    revision: [{ key: 'revision', title: `R${ledger.revision ?? 0}`, detail: `${array(ledger.seeds).length} 条伏线 · ${array(ledger.actors).length} 位人物` }],
    candidates: rows(data.candidates, value => ({
      title: value.title ?? label(value.kind ?? value.type),
      detail: value.detail ?? value.summary ?? value.reason,
      meta: label(value.agentName ?? value.status),
    })),
    dimensions: rows(ledger.dimensions, value => ({ title: value.name, detail: value.rationale, meta: value.trend, badge: `${value.value ?? 0} / 100` })),
    seeds: rows(array(ledger.seeds).filter(value => !['resolved', 'retired'].includes(value.status)),
      value => ({ title: value.title, detail: value.catalyst, meta: value.visibility, badge: label(value.status) })),
    actors: rows(array(ledger.actors).filter(value => value.life !== 'dead'),
      value => ({ title: value.name, detail: value.location, meta: array(value.goals).join(' · '), badge: value.visibility })),
    chronicle: rows(ledger.chronicle,
      value => ({ title: value.at || `第 ${value.day ?? '—'} 日`, detail: value.summary, meta: array(value.relatedIds).join(' · ') })),
    missed: rows(array(ledger.chronicle).filter(value => text(value.missedNote)),
      value => ({ title: value.summary, detail: value.missedNote, meta: value.at })),
    rumors: rows(ledger.rumors,
      value => ({ title: value.fact, detail: array(value.channels).join(' · '), meta: `最早第 ${value.earliestRevealDay ?? '—'} 日`, badge: label(value.status) })),
    signals: rows(ledger.guidance?.signals,
      value => ({ title: value.title ?? label(value.voice) ?? value.id, detail: value.text ?? value.summary ?? value.fact, meta: array(value.evidenceRefs).join(' · ') })),
  };
}

function diffRows(before, after) {
  const changes = {};
  for (const group of Object.keys(after)) {
    const oldRows = new Map(before[group].map(row => [row.key, row]));
    const updated = new Map();
    for (const row of after[group]) {
      const old = oldRows.get(row.key);
      const fields = new Set(['title', 'detail', 'meta', 'badge'].filter(field =>
        !old || JSON.stringify(old[field] ?? '') !== JSON.stringify(row[field] ?? '')));
      if (fields.size) updated.set(row.key, fields);
      oldRows.delete(row.key);
    }
    if (updated.size || oldRows.size) changes[group] = updated;
  }
  return changes;
}

function changedRows(previous, next) {
  return diffRows(viewRows(previous), viewRows(next));
}

function renderTab(tab, data, changes = {}) {
  const ledger = data.ledger;
  const rows = viewRows(data);
  const renderRows = group => rows[group].map(row => item(row, changes[group]?.get(row.key)));
  if (!ledger && !data.candidates.length) return empty();
  if (tab === 'candidates') {
    const entries = renderRows('candidates');
    return entries.length ? section('候选与阶段记录', entries) : empty();
  }
  if (!ledger) return empty();
  if (tab === 'overview') {
    const summary = `<div class="acu-ws-summary">${[['clock', '世界时序'], ['revision', '账本版本']].map(([group, title]) => {
      const row = rows[group][0];
      const changed = changes[group]?.get(row.key) ?? new Set();
      return `<div class="${changed.size ? 'acu-ws-updated' : ''}"><small>${title}</small><strong class="${changed.has('title') ? 'acu-ws-changed' : ''}">${display(row.title)}</strong><span class="${changed.has('detail') ? 'acu-ws-changed' : ''}">${display(row.detail)}</span></div>`;
    }).join('')}</div>`;
    return summary +
      section('局势刻度', renderRows('dimensions')) +
      section('伏线', renderRows('seeds')) +
      section('人物谱', renderRows('actors'));
  }
  if (tab === 'chronicle') return section('幕后纪要', renderRows('chronicle'));
  if (tab === 'missed') return section('错过清单', renderRows('missed'));
  if (tab === 'rumors') return section('风声', renderRows('rumors'));
  return section('场外信号', renderRows('signals'));
}

export function mountWorldSimulation(hostWindow, doc) {
  const root = doc.createElement('div');
  root.className = 'acu-ws-root';
  root.innerHTML = `
    <button type="button" class="acu-ws-orb" title="格林推演" aria-label="打开格林推演" aria-expanded="false"><span aria-hidden="true">✦</span></button>
    <div class="acu-ws-panel" role="dialog" aria-label="格林推演" hidden>
      <header class="acu-ws-header"><button type="button" class="acu-ws-mark" aria-label="切换夜间模式" title="切换夜间模式" aria-pressed="false"><span aria-hidden="true">✦</span></button><div class="acu-ws-heading"><small>格林 · 世界推演</small><h2>格林推演</h2></div>
        <button type="button" class="acu-ws-icon acu-ws-refresh" title="刷新资料" aria-label="刷新资料">↻</button>
        <button type="button" class="acu-ws-icon acu-ws-minimize" title="缩小为悬浮球" aria-label="缩小为悬浮球">−</button></header>
      <nav class="acu-ws-tabs" aria-label="推演资料分类"></nav><div class="acu-ws-body"></div>
      <footer class="acu-ws-footer"><span class="acu-ws-status">只读资料</span><span>当前聊天分支</span></footer>
    </div>`;
  doc.body.appendChild(root);
  const orb = root.querySelector('.acu-ws-orb');
  const panel = root.querySelector('.acu-ws-panel');
  const tabs = root.querySelector('.acu-ws-tabs');
  const body = root.querySelector('.acu-ws-body');
  const status = root.querySelector('.acu-ws-status');
  const themeToggle = root.querySelector('.acu-ws-mark');
  const setTheme = theme => {
    const night = theme === 'night';
    root.classList.toggle('acu-ws-night', night);
    themeToggle.setAttribute('aria-pressed', String(night));
    themeToggle.setAttribute('aria-label', night ? '切换日间模式' : '切换夜间模式');
    themeToggle.title = night ? '切换日间模式' : '切换夜间模式';
  };
  try {
    setTheme(hostWindow.localStorage.getItem(THEME_KEY));
  } catch { setTheme('day'); }
  themeToggle.addEventListener('click', () => {
    const theme = root.classList.contains('acu-ws-night') ? 'day' : 'night';
    setTheme(theme);
    try { hostWindow.localStorage.setItem(THEME_KEY, theme); } catch { /* Storage is optional. */ }
  });
  let active = 'overview';
  let data = { ledger: null, candidates: [] };
  let displayedRows = viewRows(data);
  let changes = {};
  let initialized = false;
  let reading = false;
  let pendingRefresh = false;
  let disposed = false;
  let request = 0;
  const clamp = (value, max) => Math.max(8, Math.min(value, max - 8));
  const keepOrbInViewport = () => {
    if (!orb.style.left) return;
    const rect = orb.getBoundingClientRect();
    orb.style.left = `${clamp(rect.left, hostWindow.innerWidth - rect.width)}px`;
    orb.style.top = `${clamp(rect.top, hostWindow.innerHeight - rect.height)}px`;
  };
  try {
    const saved = JSON.parse(hostWindow.localStorage.getItem(ORB_POSITION_KEY));
    if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
      orb.style.right = 'auto';
      orb.style.bottom = 'auto';
      orb.style.left = `${clamp(saved.left, hostWindow.innerWidth - 50)}px`;
      orb.style.top = `${clamp(saved.top, hostWindow.innerHeight - 50)}px`;
    }
  } catch { /* Storage may be unavailable in a sandboxed host. */ }
  try {
    const saved = JSON.parse(hostWindow.localStorage.getItem(PANEL_GEOMETRY_KEY));
    if ([saved?.left, saved?.top, saved?.width, saved?.height].every(Number.isFinite)) {
      panel.style.width = `${Math.max(1, Math.min(saved.width, hostWindow.innerWidth - 16))}px`;
      panel.style.height = `${Math.max(1, Math.min(saved.height, hostWindow.innerHeight - 16))}px`;
      panel.style.left = `${Math.max(8, Math.min(saved.left, hostWindow.innerWidth - saved.width - 8))}px`;
      panel.style.top = `${Math.max(8, Math.min(saved.top, hostWindow.innerHeight - saved.height - 8))}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
  } catch { /* Storage may be unavailable in a sandboxed host. */ }
  const savePanelGeometry = () => {
    if (panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    try {
      hostWindow.localStorage.setItem(PANEL_GEOMETRY_KEY, JSON.stringify({
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      }));
    } catch { /* Dragging and resizing still work without storage. */ }
  };
  const constrainPanelSize = () => {
    if (panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    panel.style.maxWidth = `${hostWindow.innerWidth - rect.left - 8}px`;
    panel.style.maxHeight = `${hostWindow.innerHeight - rect.top - 8}px`;
  };
  const keepInViewport = () => {
    if (panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(rect.left, hostWindow.innerWidth - rect.width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(rect.top, hostWindow.innerHeight - rect.height - 8))}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    constrainPanelSize();
  };
  const resizeObserver = new hostWindow.ResizeObserver(constrainPanelSize);
  resizeObserver.observe(panel);
  hostWindow.addEventListener('resize', keepInViewport);
  hostWindow.addEventListener('resize', keepOrbInViewport);
  const hasUpdate = tab => (tab === 'overview'
    ? ['clock', 'revision', 'dimensions', 'seeds', 'actors']
    : [tab]).some(group => Object.hasOwn(changes, group));
  const render = () => {
    const scrollTop = body.scrollTop;
    const tabsScrollLeft = tabs.scrollLeft;
    tabs.innerHTML = TABS.map(([id, label, icon]) =>
      `<button type="button" data-tab="${id}" class="${[id === active ? 'active' : '', hasUpdate(id) ? 'acu-ws-tab-updated' : ''].filter(Boolean).join(' ')}" aria-selected="${id === active}" title="${label}"><i class="fas ${icon}" aria-hidden="true"></i><span>${label}</span>${hasUpdate(id) ? '<span class="acu-ws-update-dot" aria-label="有更新"></span>' : ''}</button>`).join('');
    tabs.scrollLeft = tabsScrollLeft;
    body.innerHTML = renderTab(active, data, changes);
    body.scrollTop = scrollTop;
    orb.classList.toggle('acu-ws-orb-updated', Object.keys(changes).length > 0);
    status.textContent = data.message || `账本 R${data.ledger?.revision ?? 0} · 只读资料`;
  };
  const refresh = async () => {
    if (disposed) return;
    if (reading) { pendingRefresh = true; return; }
    reading = true;
    const current = ++request;
    if (!initialized) status.textContent = '读取推演资料中…';
    try {
      const next = await readSimulation();
      if (!disposed && current === request) {
        const nextRows = viewRows(next);
        if (!initialized || next.chatId !== data.chatId) changes = {};
        else {
          const delta = diffRows(displayedRows, nextRows);
          if (Object.keys(delta).length) changes = delta;
        }
        displayedRows = nextRows;
        data = next;
        initialized = true;
        render();
      }
    } catch (error) {
      if (!disposed && current === request) {
        status.textContent = `读取失败：${error.message}`;
      }
    } finally {
      reading = false;
      if (pendingRefresh && !disposed) {
        pendingRefresh = false;
        void refresh();
      }
    }
  };
  const subscriptions = [];
  const context = getSillyTavern()?.getContext?.();
  const source = context?.eventSource ?? getSillyTavern()?.eventSource;
  const events = context?.eventTypes ?? getSillyTavern()?.eventTypes;
  const onCommit = () => { void refresh(); };
  if (source?.on && events) {
    for (const name of ['MESSAGE_UPDATED', 'CHARACTER_MESSAGE_RENDERED', 'CHAT_CHANGED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED']) {
      if (!events[name]) continue;
      source.on(events[name], onCommit);
      subscriptions.push(() => {
        if (source.removeListener) source.removeListener(events[name], onCommit);
        else source.off?.(events[name], onCommit);
      });
    }
  }
  // The database's final commit rerenders the message block; it may not emit MESSAGE_UPDATED.
  const chatElement = doc.querySelector('#chat');
  let mutationTimer = null;
  const observer = chatElement && hostWindow.MutationObserver
    ? new hostWindow.MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.type === 'childList' &&
        (mutation.target.closest?.('.mes') || [...mutation.addedNodes].some(node =>
          node.nodeType === 1 && (node.matches?.('.mes') || node.querySelector?.('.mes')))))) {
        hostWindow.clearTimeout(mutationTimer);
        mutationTimer = hostWindow.setTimeout(onCommit, 300);
      }
    })
    : null;
  observer?.observe(chatElement, { childList: true, subtree: true });
  const open = () => {
    panel.hidden = false;
    orb.hidden = true;
    orb.setAttribute('aria-expanded', 'true');
    if (!panel.style.left) {
      const rect = panel.getBoundingClientRect();
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
    keepInViewport();
    void refresh();
  };
  const minimize = () => {
    panel.hidden = true;
    orb.hidden = false;
    orb.setAttribute('aria-expanded', 'false');
    keepOrbInViewport();
    orb.focus();
  };
  let orbDrag = null;
  let suppressOrbClickUntil = 0;
  orb.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const rect = orb.getBoundingClientRect();
    orbDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener('pointermove', event => {
    if (!orbDrag || event.pointerId !== orbDrag.id) return;
    const dx = event.clientX - orbDrag.x;
    const dy = event.clientY - orbDrag.y;
    if (!orbDrag.moved && Math.hypot(dx, dy) < 5) return;
    orbDrag.moved = true;
    orb.classList.add('acu-ws-orb-dragging');
    orb.style.right = 'auto';
    orb.style.bottom = 'auto';
    orb.style.left = `${clamp(orbDrag.left + dx, hostWindow.innerWidth - orb.offsetWidth)}px`;
    orb.style.top = `${clamp(orbDrag.top + dy, hostWindow.innerHeight - orb.offsetHeight)}px`;
  });
  const stopOrbDrag = event => {
    if (!orbDrag || event.pointerId !== orbDrag.id) return;
    suppressOrbClickUntil = orbDrag.moved && event.type === 'pointerup' ? Date.now() + 350 : 0;
    if (orbDrag.moved) {
      try {
        hostWindow.localStorage.setItem(ORB_POSITION_KEY, JSON.stringify({
          left: orb.getBoundingClientRect().left, top: orb.getBoundingClientRect().top,
        }));
      } catch { /* Dragging still works without storage. */ }
    }
    orbDrag = null;
    orb.classList.remove('acu-ws-orb-dragging');
  };
  orb.addEventListener('pointerup', stopOrbDrag);
  orb.addEventListener('pointercancel', stopOrbDrag);
  orb.addEventListener('click', event => {
    if (event.detail && Date.now() < suppressOrbClickUntil) return;
    open();
  });
  root.querySelector('.acu-ws-minimize').addEventListener('click', minimize);
  root.querySelector('.acu-ws-refresh').addEventListener('click', () => { void refresh(); });
  tabs.addEventListener('wheel', event => {
    if (tabs.scrollWidth <= tabs.clientWidth) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    tabs.scrollLeft += delta;
  }, { passive: false });
  let tabsDrag = null;
  let suppressTabClickUntil = 0;
  tabs.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    tabsDrag = { id: event.pointerId, x: event.clientX, scroll: tabs.scrollLeft, moved: false };
  });
  tabs.addEventListener('pointermove', event => {
    if (!tabsDrag || event.pointerId !== tabsDrag.id) return;
    const dx = event.clientX - tabsDrag.x;
    if (!tabsDrag.moved && Math.abs(dx) < 5) return;
    if (!tabsDrag.moved) tabs.setPointerCapture(event.pointerId);
    tabsDrag.moved = true;
    tabs.classList.add('acu-ws-tabs-dragging');
    tabs.scrollLeft = tabsDrag.scroll - dx;
  });
  const stopTabsDrag = event => {
    if (!tabsDrag || event.pointerId !== tabsDrag.id) return;
    suppressTabClickUntil = tabsDrag.moved && event.type === 'pointerup' ? Date.now() + 350 : 0;
    tabsDrag = null;
    tabs.classList.remove('acu-ws-tabs-dragging');
  };
  tabs.addEventListener('pointerup', stopTabsDrag);
  tabs.addEventListener('pointercancel', stopTabsDrag);
  tabs.addEventListener('click', event => {
    if (event.detail && Date.now() < suppressTabClickUntil) return;
    const button = event.target.closest('[data-tab]');
    if (button) { active = button.dataset.tab; render(); }
  });
  const onKey = event => { if (event.key === 'Escape' && !panel.hidden) minimize(); };
  doc.addEventListener('keydown', onKey);
  let drag = null;
  const header = root.querySelector('.acu-ws-header');
  const move = event => {
    if (!drag || event.pointerId !== drag.id) return;
    panel.style.left = `${Math.max(8, Math.min(hostWindow.innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
    panel.style.top = `${Math.max(8, Math.min(hostWindow.innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
    constrainPanelSize();
  };
  const stop = () => { if (drag) savePanelGeometry(); drag = null; };
  header.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener('pointermove', move);
  header.addEventListener('pointerup', stop);
  header.addEventListener('pointercancel', stop);
  let resizing = false;
  panel.addEventListener('pointerdown', event => {
    const rect = panel.getBoundingClientRect();
    resizing = event.clientX >= rect.right - 20 && event.clientY >= rect.bottom - 20;
  });
  const finishResize = () => {
    if (resizing) savePanelGeometry();
    resizing = false;
  };
  doc.addEventListener('pointerup', finishResize);
  doc.addEventListener('pointercancel', finishResize);
  render();
  void refresh();
  return () => {
    disposed = true;
    request++;
    observer?.disconnect();
    hostWindow.clearTimeout(mutationTimer);
    subscriptions.forEach(unsubscribe => unsubscribe());
    resizeObserver.disconnect();
    hostWindow.removeEventListener('resize', keepInViewport);
    hostWindow.removeEventListener('resize', keepOrbInViewport);
    doc.removeEventListener('keydown', onKey);
    doc.removeEventListener('pointerup', finishResize);
    doc.removeEventListener('pointercancel', finishResize);
    root.remove();
  };
}

async function bootstrapWorldSimulation() {
  const hostWindow = window.parent || window;
  const hostDocument = hostWindow.document || document;
  hostWindow.ACUWorldSimulation?.destroy?.();

  const style = hostDocument.createElement('style');
  style.id = 'acu-world-simulation-style';
  const response = await fetch(new URL('./style.css', import.meta.url));
  if (!response.ok) throw new Error(`格林推演样式加载失败: ${response.status}`);
  style.textContent = await response.text();
  hostDocument.getElementById(style.id)?.remove();
  hostDocument.head.appendChild(style);
  const unmount = mountWorldSimulation(hostWindow, hostDocument);
  const api = { destroy: () => { unmount(); style.remove(); } };
  hostWindow.ACUWorldSimulation = api;
  window.ACUWorldSimulation = api;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootstrapWorldSimulation().catch(error => console.error('[ACU World Simulation]', error));
}
