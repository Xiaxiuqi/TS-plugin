function getSillyTavern() {
  try {
    return window.SillyTavern || window.parent?.SillyTavern || window.top?.SillyTavern || null;
  } catch {
    return window.SillyTavern || null;
  }
}

const TABS = [
  ['overview', '账本总览', 'fa-book-open'],
  ['chronicle', '幕后纪要', 'fa-scroll'],
  ['rumors', '风声', 'fa-wind'],
  ['missed', '错过清单', 'fa-hourglass-end'],
  ['candidates', '候选轨迹', 'fa-code-branch'],
];
const LEDGER_KEY = '_qrf_world_simulation_state';
const MATERIAL_KEY = '_qrf_world_simulation_agent_materials';
const AGENT_CHAT_KEY = '_qrf_world_simulation_agent_chat';
const ENVELOPE_KEY = '_qrf_world_simulation';
const ORB_POSITION_KEY = 'acu_ws_orb_position_v1';
const PANEL_GEOMETRY_KEY = 'acu_ws_panel_geometry_v1';
const THEME_KEY = 'acu_ws_theme_v1';
const SETTINGS_KEY = 'acu_ws_settings_v1';
const DEFAULT_SETTINGS = {
  highlightEnabled: true,
  actorHighlightEnabled: true,
  simpleHighlight: false,
  refreshInjectedMessage: false,
};
const PROJECTION_PATTERN = /<!-- qrf-world-simulation-projection:v([12]):start -->([\s\S]*?)<!-- qrf-world-simulation-projection:v\1:end -->/;
const projectionSignature = content => {
  const projection = content.match(PROJECTION_PATTERN)?.[0];
  if (!projection) return null;
  let hash = 2166136261;
  for (let index = 0; index < projection.length; index++) {
    hash = Math.imul(hash ^ projection.charCodeAt(index), 16777619);
  }
  return `${projection.length}:${hash >>> 0}`;
};
const STATUS = {
  established: '已建立', incubating: '酝酿中', active: '活跃', converging: '汇聚中',
  resolved: '已收束', retired: '已退役',
  latent: '潜伏', ripe: '待命', revealed: '已得知', dead: '已失效',
  encounter: '遭遇', rumor: '传闻', ambient: '环境',
  running: '进行中', completed: '已完成', blocked: '受阻',
  hidden: '幕后', limited: '有限可见', public: '公开',
  rising: '上升', stable: '平稳', falling: '下降',
  pressure: '压力', growth: '生长',
};
const label = value => STATUS[value] ?? value;
const AGENT_LABELS = {
  'world-director': '主 Agent', 'world-stage-planner': '阶段规划',
  timekeeper: '旧角色：时计', 'undercurrent-analyst': '时序与伏线',
  'dramatis-keeper': '人物谱', chronicler: '旧角色：纪要',
  'causality-reviewer': '因果审核', 'guidance-composer': '纪要、风声与场外信号',
  'lore-researcher': '设定研究', 'requirements-maintainer': '用户要求维护',
  'world-analyst': '格林推演',
};
const CANDIDATE_KINDS = new Set(['delegation', 'finalize', 'block', 'stage_plan']);
const agentLabel = name => name ? AGENT_LABELS[name] ?? name : '主 Agent';
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const actionText = action => action ? `${text(action.text)}（预计 ${text(action.expectedDuration) || '未定'}）` : '无';
const actorExperience = experience => {
  const day = (value, time) => value == null ? '起始不详（早于记录）' : `第 ${value} 日${time ? `（${time}）` : ''}`;
  const duration = experience.startedAtDay == null ? '' :
    `\n历时 ${Math.max(0, experience.endedAtDay - experience.startedAtDay)} 日`;
  const outcome = experience.outcome ? `\n${experience.status === 'done' ? '结果' : '中止原因'}：${experience.outcome}` :
    experience.status === 'abandoned' ? '\n已中止' : '';
  return `${day(experience.startedAtDay, experience.startedAt)} → ${day(experience.endedAtDay, experience.endedAt)}${duration}\n${experience.text}${outcome}`;
};
const escapeHtml = value => text(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const display = value => escapeHtml(value || '未记录');
const taggedText = value => text(value).split(/(\[[^\]\n]{1,12}\])/g).map(part =>
  /^\[[^\]\n]{1,12}\]$/.test(part)
    ? `<span class="acu-ws-inline-tag">${escapeHtml(part.slice(1, -1))}</span>`
    : escapeHtml(part)).join('') || '未记录';
const item = (row, changed = new Set(), options = {}) => {
  const fieldChanged = field => !options.simpleHighlight && changed.has(field) ? 'acu-ws-changed' : '';
  const content = value => row.tagged ? taggedText(value) : display(value);
  return `
  <article class="acu-ws-item${row.timeline ? ' acu-ws-actor' : ''}${row.status === 'failed' ? ' acu-ws-failed' : ''}${changed.size ? ' acu-ws-updated' : ''}">
    <div class="acu-ws-item-head"><h4 class="${fieldChanged('title')}">${content(row.title)}</h4>${row.badge ? `<span class="acu-ws-badge ${fieldChanged('badge')}">${display(row.badge)}</span>` : ''}</div>
    <p class="${fieldChanged('detail')}">${content(row.detail)}</p>${row.meta ? `<small class="${fieldChanged('meta')}">${content(row.meta)}</small>` : ''}
    ${row.tags?.length ? `<div class="acu-ws-tags ${fieldChanged('tags')}">${row.tags.map(tag => `<span class="acu-ws-tag">${display(tag)}</span>`).join('')}</div>` : ''}
    ${row.timeline?.length ? `<ul class="acu-ws-timeline ${fieldChanged('timeline')}">${row.timeline.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}
  </article>`;
};
const section = (title, entries) => `
  <section class="acu-ws-section"><h3>${escapeHtml(title)} <span>${entries.length}</span></h3>
  ${entries.length ? entries.join('') : '<p class="acu-ws-empty-inline">暂无记录</p>'}</section>`;
const empty = () => '<div class="acu-ws-empty"><i class="fas fa-layer-group" aria-hidden="true"></i><strong>暂无推演资料</strong><span>当前聊天分支尚未留下这一类记录。</span></div>';
const localizeReference = (value, ledger) => {
  const key = text(value);
  if (!key) return '';
  const groups = [
    ['actors', 'name'], ['seeds', 'title'], ['dimensions', 'name'], ['rumors', 'fact'],
  ];
  for (const [group, field] of groups) {
    const match = array(ledger?.[group]).find(entry => String(entry.id ?? '') === key);
    if (match) return text(match[field]) || key;
  }
  const locations = [
    ...array(ledger?.actors).flatMap(actor => [actor.location, actor.locationRef?.region, actor.locationRef?.place]),
    ...array(ledger?.seeds).map(seed => seed.location),
    ledger?.player?.location?.region, ledger?.player?.location?.place,
  ].filter(Boolean);
  const location = locations.find(place => place === key || text(place).endsWith(`·${key}`));
  return location || (/[\u3400-\u9fff]/u.test(key) ? key : '关联资料');
};
const loadSettings = hostWindow => {
  try {
    const saved = JSON.parse(hostWindow.localStorage.getItem(SETTINGS_KEY));
    return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

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
  if (!Array.isArray(chat)) return { ledger: null, candidates: [], projections: new Map(), message: '无法读取当前聊天楼层' };
  const chatId = text(getSillyTavern()?.getCurrentChatId?.() ?? context?.chatId) || '__host_without_chat_id__';
  let ledger = null;
  const envelope = chat[0]?.[ENVELOPE_KEY];
  const candidates = [];
  const projections = new Map();
  for (let index = 0; index < chat.length; index++) {
    const message = chat[index];
    if (!message || message.is_user || message.is_system) continue;
    const content = typeof message.mes === 'string' ? message.mes : String(message.message ?? '');
    const signature = projectionSignature(content);
    if (signature) projections.set(index, signature);
    const messageId = message.message_id ?? index;
    const anchor = {
      messageKey: `${typeof messageId}:${messageId}`,
      swipeId: String(Number.isInteger(message.swipe_id) ? message.swipe_id : 0),
      contentDigest: await digest(content),
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
    const conversation = read(AGENT_CHAT_KEY);
    for (const segment of array(conversation?.segments)) {
      for (const event of array(segment.messages)) {
        if (!CANDIDATE_KINDS.has(event?.eventKind)) continue;
        candidates.push({
          id: `${segment.segmentId}:${event.id}`,
          kind: event.eventKind,
          title: event.title || event.digest,
          detail: event.text,
          agentName: event.agentName,
          status: event.status,
          at: event.at,
        });
      }
    }
  }
  if (!ledger && envelope?.ledger?.clock) ledger = envelope.ledger;
  if (!candidates.length) {
    candidates.push(...array(envelope?.timeline).filter(entry =>
      CANDIDATE_KINDS.has(entry?.kind) || CANDIDATE_KINDS.has(entry?.eventKind)));
  }
  candidates.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  return { chatId, ledger, candidates, projections, message: ledger ? '' : '当前分支尚无可读取的格林推演账本' };
}

function changedProjectionTargets(previous, next) {
  if (previous.chatId !== next.chatId ||
    Number(next.ledger?.revision ?? 0) <= Number(previous.ledger?.revision ?? 0)) return [];
  return [...next.projections].filter(([index, signature]) => previous.projections?.get(index) !== signature);
}

function isChatEditorOpen(doc) {
  return Boolean(doc.querySelector('#chat .mes textarea, #chat .mes [contenteditable="true"]'));
}

function viewRows(data) {
  const ledger = data.ledger ?? {};
  const clock = ledger.clock ?? {};
  const rows = (entries, makeRow) => array(entries).map((value, index) => ({
    key: String(value.id ?? index), ...makeRow(value),
  }));
  return {
    clock: [{ key: 'clock', title: `第 ${clock.day ?? '—'} 日`, detail: clock.storyTime
      ? `${clock.storyTime}${clock.slot ? `\n${clock.slot}` : ''}` : clock.slot }],
    revision: [{ key: 'revision', title: `R${ledger.revision ?? 0}`, detail: `${array(ledger.seeds).length} 条伏线\n${array(ledger.actors).length} 位人物` }],
    candidates: rows(data.candidates, value => ({
      title: value.title,
      detail: value.detail,
      badge: agentLabel(value.agentName),
      status: value.status,
    })),
    dimensions: rows(ledger.dimensions, value => ({
      title: value.name, detail: value.rationale, meta: label(value.trend),
      badge: `${label(value.kind) ? `${label(value.kind)} ` : ''}${value.value ?? 0} / 100`,
    })),
    seeds: rows(array(ledger.seeds).filter(value => !['resolved', 'retired'].includes(value.status)),
      value => ({ title: value.title, detail: value.catalyst, meta: label(value.visibility), badge: label(value.status) })),
    actors: rows(array(ledger.actors).filter(value => value.life !== 'dead'),
      value => ({
        title: value.name,
        badge: label(value.visibility),
        detail: `在做：${actionText(value.currentAction)}\n长期：${actionText(value.longTermAction)}\n位置：${text(value.location) || '未知'}`,
        meta: `打算：${array(value.goals).join('；') || '无'}\n关注：${array(value.interests).join('、') || '无'}\n认知：${array(value.knownFacts).join('、') || '无'}`,
        timeline: array(value.experiences).map(actorExperience),
      })),
    chronicle: rows(ledger.chronicle,
      value => ({
        title: value.at || `第 ${value.day ?? '—'} 日`,
        detail: value.summary,
        tagged: true,
        tags: array(value.relatedIds).map(id => localizeReference(id, ledger)).filter(Boolean),
      })),
    missed: rows(array(ledger.chronicle).filter(value => text(value.missedNote)),
      value => ({ title: value.summary, badge: '错过', detail: value.missedNote, meta: value.at, tagged: true })),
    rumors: rows(ledger.rumors,
      value => ({ title: value.fact, detail: array(value.channels).join('、'), meta: `最早第 ${value.earliestRevealDay ?? '—'} 日`, badge: label(value.status) })),
    signals: rows(ledger.guidance?.signals,
      value => ({ title: value.title ?? label(value.voice) ?? value.id, detail: value.text ?? value.summary ?? value.fact, meta: array(value.evidenceRefs).join('、') })),
  };
}

function diffRows(before, after) {
  const changes = {};
  for (const group of Object.keys(after)) {
    const oldRows = new Map(before[group].map(row => [row.key, row]));
    const updated = new Map();
    for (const row of after[group]) {
      const old = oldRows.get(row.key);
      const fields = new Set(['title', 'detail', 'meta', 'badge', 'status', 'tags', 'timeline'].filter(field =>
        (field !== 'status' || row.status !== undefined || old?.status !== undefined) &&
        (field !== 'tags' || row.tags !== undefined || old?.tags !== undefined) &&
        (field !== 'timeline' || row.timeline !== undefined || old?.timeline !== undefined) &&
        (!old || JSON.stringify(old[field] ?? '') !== JSON.stringify(row[field] ?? ''))));
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

function renderTab(tab, data, changes = {}, options = {}) {
  const ledger = data.ledger;
  const rows = viewRows(data);
  const renderRows = group => rows[group].map(row => item(row, changes[group]?.get(row.key), options));
  if (tab === 'candidates') {
    const entries = renderRows('candidates');
    return entries.length ? section('候选轨迹', entries) : empty();
  }
  if (!ledger) return empty();
  if (tab === 'overview') {
    const summary = `<div class="acu-ws-summary">${[['clock', '世界时序'], ['revision', '账本版本']].map(([group, title]) => {
      const row = rows[group][0];
      const changed = changes[group]?.get(row.key) ?? new Set();
      const changedClass = !options.simpleHighlight ? 'acu-ws-changed' : '';
      return `<div class="${changed.size ? 'acu-ws-updated' : ''}"><small>${title}</small><strong class="${changed.has('title') ? changedClass : ''}">${display(row.title)}</strong><span class="${changed.has('detail') ? changedClass : ''}">${display(row.detail)}</span></div>`;
    }).join('')}</div>`;
    return summary +
      section('场外信号', renderRows('signals')) +
      section('局势刻度', renderRows('dimensions')) +
      section('伏线', renderRows('seeds')) +
      section('人物谱', renderRows('actors'));
  }
  if (tab === 'chronicle') return section('幕后纪要', renderRows('chronicle'));
  if (tab === 'missed') return section('错过清单', renderRows('missed'));
  if (tab === 'rumors') return section('风声', renderRows('rumors'));
  return empty();
}

function renderSettings(settings) {
  const checked = value => value ? ' checked' : '';
  return `<section class="acu-ws-settings">
    <h3>显示设置</h3>
    <label class="acu-ws-setting"><span>夜间模式</span><input type="checkbox" data-setting="nightTheme"></label>
    <label class="acu-ws-setting"><span>显示更新高亮</span><input type="checkbox" data-setting="highlightEnabled"${checked(settings.highlightEnabled)}></label>
    <label class="acu-ws-setting"><span>人物谱更新高亮</span><input type="checkbox" data-setting="actorHighlightEnabled"${checked(settings.actorHighlightEnabled)}></label>
    <label class="acu-ws-setting"><span>简易更新高亮</span><input type="checkbox" data-setting="simpleHighlight"${checked(settings.simpleHighlight)}></label>
    <label class="acu-ws-setting"><span>注入后修复正文显示</span><input type="checkbox" data-setting="refreshInjectedMessage"${checked(settings.refreshInjectedMessage)}></label>
  </section>`;
}

export function mountWorldSimulation(hostWindow, doc) {
  const root = doc.createElement('div');
  root.className = 'acu-ws-root';
  root.innerHTML = `
    <button type="button" class="acu-ws-orb" title="格林推演" aria-label="打开格林推演" aria-expanded="false"><span aria-hidden="true">✦</span></button>
    <div class="acu-ws-panel" role="dialog" aria-label="格林推演" hidden>
      <header class="acu-ws-header"><button type="button" class="acu-ws-mark" aria-label="切换夜间模式" title="切换夜间模式" aria-pressed="false"><span aria-hidden="true">✦</span></button><div class="acu-ws-heading"><small>格林 · 世界推演</small><h2>格林推演</h2></div>
        <button type="button" class="acu-ws-icon acu-ws-settings-toggle" title="显示设置" aria-label="显示设置" aria-expanded="false" aria-controls="acu-ws-settings-panel"><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/></svg></button>
        <button type="button" class="acu-ws-icon acu-ws-minimize" title="缩小为悬浮球" aria-label="缩小为悬浮球">−</button></header>
      <nav class="acu-ws-tabs" aria-label="推演资料分类"></nav>
      <nav class="acu-ws-settings-nav" aria-label="悬浮窗设置导航" hidden><button type="button" class="acu-ws-settings-back"><i class="fas fa-arrow-left" aria-hidden="true"></i><span>返回资料</span></button><strong>显示设置</strong></nav>
      <div class="acu-ws-body"></div>
      <div id="acu-ws-settings-panel" class="acu-ws-settings-panel" hidden></div>
      <footer class="acu-ws-footer"><span class="acu-ws-status">只读资料</span><span>当前聊天分支</span></footer>
    </div>`;
  doc.body.appendChild(root);
  const orb = root.querySelector('.acu-ws-orb');
  const panel = root.querySelector('.acu-ws-panel');
  const tabs = root.querySelector('.acu-ws-tabs');
  const body = root.querySelector('.acu-ws-body');
  const settingsPanel = root.querySelector('.acu-ws-settings-panel');
  const settingsNav = root.querySelector('.acu-ws-settings-nav');
  const settingsToggle = root.querySelector('.acu-ws-settings-toggle');
  const settingsBack = root.querySelector('.acu-ws-settings-back');
  const status = root.querySelector('.acu-ws-status');
  const themeToggle = root.querySelector('.acu-ws-mark');
  const settings = loadSettings(hostWindow);
  const saveSettings = () => {
    try { hostWindow.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch { /* Preferences work for this session without storage. */ }
  };
  const syncThemeSwitch = () => {
    const input = settingsPanel.querySelector('[data-setting="nightTheme"]');
    if (input) input.checked = root.classList.contains('acu-ws-night');
  };
  const setTheme = theme => {
    const night = theme === 'night';
    root.classList.toggle('acu-ws-night', night);
    themeToggle.setAttribute('aria-pressed', String(night));
    themeToggle.setAttribute('aria-label', night ? '切换日间模式' : '切换夜间模式');
    themeToggle.title = night ? '切换日间模式' : '切换夜间模式';
    syncThemeSwitch();
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
  let showingSettings = false;
  let data = { ledger: null };
  let displayedRows = viewRows(data);
  let changes = {};
  let initialized = false;
  let reading = false;
  let pendingRefresh = false;
  let disposed = false;
  let request = 0;
  const displayRefreshTimers = new Map();
  const clearDisplayRefreshTimers = () => {
    for (const timer of displayRefreshTimers.values()) hostWindow.clearTimeout(timer);
    displayRefreshTimers.clear();
  };
  const scheduleDisplayRefresh = (messageId, signature, chatId) => {
    if (!settings.refreshInjectedMessage || disposed) return;
    hostWindow.clearTimeout(displayRefreshTimers.get(messageId));
    const timer = hostWindow.setTimeout(async () => {
      displayRefreshTimers.delete(messageId);
      if (disposed || !settings.refreshInjectedMessage || isChatEditorOpen(doc)) return;
      const context = getSillyTavern()?.getContext?.();
      const currentChatId = text(getSillyTavern()?.getCurrentChatId?.() ?? context?.chatId) || '__host_without_chat_id__';
      const message = context?.chat?.[messageId];
      if (currentChatId !== chatId || !message || message.is_user || message.is_system ||
        projectionSignature(typeof message.mes === 'string' ? message.mes : String(message.message ?? '')) !== signature) return;
      const refreshMessage = hostWindow.TavernHelper?.refreshOneMessage ??
        window.TavernHelper?.refreshOneMessage ?? hostWindow.refreshOneMessage ?? window.refreshOneMessage;
      if (typeof refreshMessage !== 'function') return;
      try {
        await refreshMessage(messageId);
      } catch (error) {
        console.warn('[ACU World Simulation] 单楼层显示刷新失败', error);
      }
    }, 400);
    displayRefreshTimers.set(messageId, timer);
  };
  const clamp = (value, max) => Math.max(8, Math.min(value, Math.max(8, max - 8)));
  const keepOrbInViewport = () => {
    const rect = orb.getBoundingClientRect();
    orb.style.right = 'auto';
    orb.style.bottom = 'auto';
    orb.style.left = `${clamp(rect.left, hostWindow.innerWidth - rect.width)}px`;
    orb.style.top = `${clamp(rect.top, hostWindow.innerHeight - rect.height)}px`;
  };
  try {
    const saved = JSON.parse(hostWindow.localStorage.getItem(ORB_POSITION_KEY));
    if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
      orb.style.right = 'auto';
      orb.style.bottom = 'auto';
      orb.style.left = `${saved.left}px`;
      orb.style.top = `${saved.top}px`;
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
  keepOrbInViewport();
  const visibleChanges = () => {
    if (!settings.highlightEnabled) return {};
    if (settings.actorHighlightEnabled) return changes;
    const { actors, ...others } = changes;
    return others;
  };
  const hasUpdate = (tab, displayed) => (tab === 'overview'
    ? ['clock', 'revision', 'signals', 'dimensions', 'seeds', 'actors']
    : [tab]).some(group => Object.hasOwn(displayed, group));
  const render = () => {
    const displayed = visibleChanges();
    const scrollTop = body.scrollTop;
    const tabsScrollLeft = tabs.scrollLeft;
    tabs.innerHTML = TABS.map(([id, label, icon]) =>
      `<button type="button" data-tab="${id}" class="${[id === active ? 'active' : '', hasUpdate(id, displayed) ? 'acu-ws-tab-updated' : ''].filter(Boolean).join(' ')}" aria-selected="${id === active}" title="${label}"><i class="fas ${icon}" aria-hidden="true"></i><span>${label}</span><span class="acu-ws-update-slot">${hasUpdate(id, displayed) ? '<span class="acu-ws-update-dot" aria-label="有更新"></span>' : ''}</span></button>`).join('');
    tabs.scrollLeft = tabsScrollLeft;
    body.innerHTML = renderTab(active, data, displayed, settings);
    body.scrollTop = scrollTop;
    orb.classList.toggle('acu-ws-orb-updated', Object.keys(displayed).length > 0);
    status.textContent = data.message || `账本 R${data.ledger?.revision ?? 0} · 只读资料`;
  };
  const showSettings = show => {
    showingSettings = show;
    settingsToggle.setAttribute('aria-expanded', String(show));
    settingsToggle.classList.toggle('active', show);
    tabs.hidden = show;
    settingsNav.hidden = !show;
    body.hidden = show;
    settingsPanel.hidden = !show;
    if (show) {
      settingsPanel.innerHTML = renderSettings(settings);
      syncThemeSwitch();
    } else render();
  };
  settingsToggle.addEventListener('click', () => showSettings(!showingSettings));
  settingsBack.addEventListener('click', () => showSettings(false));
  settingsPanel.addEventListener('change', event => {
    const key = event.target.dataset.setting;
    if (key === 'nightTheme') {
      const theme = event.target.checked ? 'night' : 'day';
      setTheme(theme);
      try { hostWindow.localStorage.setItem(THEME_KEY, theme); } catch { /* Optional. */ }
    } else if (Object.hasOwn(DEFAULT_SETTINGS, key)) {
      settings[key] = event.target.checked;
      saveSettings();
      render();
      if (key === 'refreshInjectedMessage' && !settings[key]) clearDisplayRefreshTimers();
    }
  });
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
        const sameChat = initialized && next.chatId === data.chatId;
        if (!sameChat) {
          changes = {};
          clearDisplayRefreshTimers();
        } else {
          const delta = diffRows(displayedRows, nextRows);
          if (Object.keys(delta).length) changes = delta;
          for (const [index, signature] of changedProjectionTargets(data, next)) {
            scheduleDisplayRefresh(index, signature, next.chatId);
          }
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
    if (!panel.style.left) {
      const rect = panel.getBoundingClientRect();
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
    keepInViewport();
    orb.hidden = true;
    orb.setAttribute('aria-expanded', 'true');
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
  let suppressNextOrbClick = false;
  let orbClickTimer = null;
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
    suppressNextOrbClick = orbDrag.moved && event.type === 'pointerup';
    hostWindow.clearTimeout(orbClickTimer);
    if (suppressNextOrbClick) orbClickTimer = hostWindow.setTimeout(() => {
      suppressNextOrbClick = false;
      orbClickTimer = null;
    }, 0);
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
    if (event.detail && suppressNextOrbClick) { suppressNextOrbClick = false; return; }
    open();
  });
  root.querySelector('.acu-ws-minimize').addEventListener('click', minimize);
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
    if (disposed) return;
    disposed = true;
    request++;
    observer?.disconnect();
    hostWindow.clearTimeout(mutationTimer);
    clearDisplayRefreshTimers();
    hostWindow.clearTimeout(orbClickTimer);
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
  let disposed = false;
  let unmount = null;
  let style = null;
  const styleRequest = new AbortController();
  const onPageHide = () => api.destroy();
  const api = {
    destroy: () => {
      if (disposed) return;
      disposed = true;
      styleRequest.abort();
      window.removeEventListener('pagehide', onPageHide);
      try { unmount?.(); }
      finally {
        style?.remove();
        if (hostWindow.ACUWorldSimulation === api) delete hostWindow.ACUWorldSimulation;
        if (window.ACUWorldSimulation === api) delete window.ACUWorldSimulation;
      }
    },
  };
  hostWindow.ACUWorldSimulation = api;
  window.ACUWorldSimulation = api;
  window.addEventListener('pagehide', onPageHide);
  try {
    const response = await fetch(new URL('./style.css', import.meta.url), { signal: styleRequest.signal });
    if (!response.ok) throw new Error(`格林推演样式加载失败: ${response.status}`);
    const css = await response.text();
    if (disposed) return;
    hostDocument.getElementById('acu-world-simulation-style')?.remove();
    style = hostDocument.createElement('style');
    style.id = 'acu-world-simulation-style';
    style.textContent = css;
    hostDocument.head.appendChild(style);
    unmount = mountWorldSimulation(hostWindow, hostDocument);
  } catch (error) {
    api.destroy();
    if (error.name !== 'AbortError') throw error;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootstrapWorldSimulation().catch(error => console.error('[ACU World Simulation]', error));
}
