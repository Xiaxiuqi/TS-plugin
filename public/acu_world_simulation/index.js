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
const item = (title, detail, meta = '', badge = '') => `
  <article class="acu-ws-item">
    <div class="acu-ws-item-head"><h4>${display(title)}</h4>${badge ? `<span class="acu-ws-badge">${display(badge)}</span>` : ''}</div>
    <p>${display(detail)}</p>${meta ? `<small>${display(meta)}</small>` : ''}
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
  return { ledger, candidates, message: ledger ? '' : '当前分支尚无可读取的格林推演账本' };
}

function renderTab(tab, data) {
  const ledger = data.ledger;
  if (!ledger && !data.candidates.length) return empty();
  if (tab === 'candidates') {
    const entries = data.candidates.map(entry =>
      item(entry.title ?? label(entry.kind ?? entry.type), entry.detail ?? entry.summary ?? entry.reason, label(entry.agentName ?? entry.status)));
    return entries.length ? section('候选与阶段记录', entries) : empty();
  }
  if (!ledger) return empty();
  if (tab === 'overview') {
    const clock = ledger.clock ?? {};
    const summary = `<div class="acu-ws-summary"><div><small>世界时序</small><strong>第 ${escapeHtml(clock.day ?? '—')} 日</strong><span>${display(clock.storyTime || clock.slot)}</span></div><div><small>账本版本</small><strong>R${escapeHtml(ledger.revision ?? 0)}</strong><span>${array(ledger.seeds).length} 条伏线 · ${array(ledger.actors).length} 位人物</span></div></div>`;
    return summary +
      section('局势刻度', array(ledger.dimensions).map(value => item(value.name, value.rationale, value.trend, `${value.value ?? 0} / 100`))) +
      section('伏线', array(ledger.seeds).filter(value => !['resolved', 'retired'].includes(value.status)).map(value => item(value.title, value.catalyst, value.visibility, label(value.status)))) +
      section('人物谱', array(ledger.actors).filter(value => value.life !== 'dead').map(value => item(value.name, value.location, array(value.goals).join(' · '), value.visibility)));
  }
  if (tab === 'chronicle') return section('幕后纪要', array(ledger.chronicle).map(value =>
    item(value.at || `第 ${value.day ?? '—'} 日`, value.summary, array(value.relatedIds).join(' · '))));
  if (tab === 'missed') return section('错过清单', array(ledger.chronicle).filter(value => text(value.missedNote)).map(value =>
    item(value.summary, value.missedNote, value.at)));
  if (tab === 'rumors') return section('风声', array(ledger.rumors).map(value =>
    item(value.fact, array(value.channels).join(' · '), `最早第 ${value.earliestRevealDay ?? '—'} 日`, label(value.status))));
  return section('场外信号', array(ledger.guidance?.signals).map(value =>
    item(value.title ?? label(value.voice) ?? value.id, value.text ?? value.summary ?? value.fact, array(value.evidenceRefs).join(' · '))));
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
  const render = () => {
    tabs.innerHTML = TABS.map(([id, label, icon]) =>
      `<button type="button" data-tab="${id}" class="${id === active ? 'active' : ''}" aria-selected="${id === active}" title="${label}"><i class="fas ${icon}" aria-hidden="true"></i><span>${label}</span></button>`).join('');
    body.innerHTML = renderTab(active, data);
    status.textContent = data.message || `账本 R${data.ledger?.revision ?? 0} · 只读资料`;
  };
  const refresh = async () => {
    const current = ++request;
    status.textContent = '读取推演资料中…';
    try {
      const next = await readSimulation();
      if (!disposed && current === request) { data = next; render(); }
    } catch (error) {
      if (!disposed && current === request) {
        data = { ledger: null, candidates: [], message: `读取失败：${error.message}` };
        render();
      }
    }
  };
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
    refresh();
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
  root.querySelector('.acu-ws-refresh').addEventListener('click', refresh);
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
  const stop = () => { drag = null; };
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
  render();
  return () => {
    disposed = true;
    request++;
    resizeObserver.disconnect();
    hostWindow.removeEventListener('resize', keepInViewport);
    hostWindow.removeEventListener('resize', keepOrbInViewport);
    doc.removeEventListener('keydown', onKey);
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
