(() => {
  'use strict';
  const KEY = 'cryptLord.debugManager';
  const STYLE_MARKER = 'crypt-lord-manager-style';
  const ROOT_MARKER = 'crypt-lord-manager-root';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  if (root.debugManager) {
    if (!['status', 'open', 'close', 'refresh', 'dispose'].every(method => typeof root.debugManager[method] === 'function')) throw new Error(`[${KEY}] 拒绝复用形状不匹配的管理器API`);
    contract.initializeGlobal(KEY, root.debugManager);
    return;
  }

  let disposed = false;
  let host = null;
  let mask = null;
  let style = null;
  let closeButton = null;
  let keydownHandler = null;
  let lastError = '';
let body = null;

  function safeText(value) { try { return value instanceof Error ? `${value.name}: ${value.message}` : typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }
  function consoleFailure(action, details, metadata = {}) {
    lastError = `${action}: ${safeText(details)}`;
    try { console.error('[cryptLord.debugManager] host-resolution-failure', { action, reason: lastError, ...metadata }); } catch { /* diagnostic reporting is non-fatal */ }
  }
  // parent/top access is intentionally restricted to this guarded same-origin host resolver.
  function candidates() {
    const values = [window];
    for (const name of ['parent', 'top']) { try { const candidate = window[name]; if (candidate && !values.includes(candidate)) values.push(candidate); } catch { /* cross-origin frame */ } }
    return values;
  }
  function score(candidate) {
    try {
      const doc = candidate?.document;
      if (!doc?.documentElement || !doc.body || !doc.head) return -1;
      let value = 1;
      if (candidate.SillyTavern) value += 8;
      if (candidate.TavernHelper) value += 6;
      if (doc.querySelector?.('#send_textarea')) value += 12;
      if (Number(candidate.innerWidth) > 0 && Number(candidate.innerHeight) > 0) value += 3;
      return value;
    } catch { return -1; }
  }
  function resolveHost() {
    let best = null; let bestScore = -1;
    candidates().forEach(candidate => { const value = score(candidate); if (value > bestScore) { best = candidate; bestScore = value; } });
    if (!best || bestScore < 1) { consoleFailure('no-usable-host-root-or-viewport', 'No same-origin document with body, head and viewport', { candidateCount: candidates().length }); return null; }
    try { return { window: best, document: best.document, score: bestScore, url: String(best.document.URL || '') }; } catch { consoleFailure('host-document-unreadable', 'Selected candidate became inaccessible'); return null; }
  }
  function append(parent, tag, text, className) { const element = parent.ownerDocument.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; parent.appendChild(element); return element; }
  function ownedCss() {
    try {
      const url = String(root.loader?.baseUrl || '').replace(/\/?$/, '/') + 'modules/manager-ui/style.css';
      return Array.from(document.querySelectorAll?.('style[data-crypt-lord-css]') || [])
        .find(node => String(node.dataset.cryptLordCss || '') === url && node.dataset.cryptLordInstance === root.loader?.instanceId) || null;
    } catch { return null; }
  }
  function ensure() {
    if (disposed) return false;
    host = resolveHost();
    if (!host) return false;
    if (mask?.isConnected && mask.ownerDocument === host.document) return true;
    disposeDom();
    style = ownedCss();
    if (!style) { consoleFailure('manager-css-unavailable', 'Loader-owned manager CSS was not found'); return false; }
    style.dataset.cryptLordManagerStyle = STYLE_MARKER;
    (host.document.head || host.document.documentElement).appendChild(style);
    mask = host.document.createElement('div');
    mask.className = 'crypt-lord-manager-mask'; mask.dataset.cryptLordManagerRoot = ROOT_MARKER; mask.dataset.open = 'false';
    mask.setAttribute('role', 'presentation');
    const dialog = append(mask, 'section', undefined, 'crypt-lord-manager-dialog'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', 'Crypt Lord 调试管理器'); dialog.tabIndex = -1;
    const header = append(dialog, 'header', undefined, 'crypt-lord-manager-head'); const title = append(header, 'div'); append(title, 'p', 'CRYPT LORD · DIAGNOSTICS', 'crypt-lord-manager-eyebrow'); append(title, 'h2', '调试管理器'); append(title, 'p', '仅展示真实诊断快照；不执行任何业务操作。');
    closeButton = append(header, 'button', '×', 'crypt-lord-manager-close'); closeButton.type = 'button'; closeButton.setAttribute('aria-label', '关闭调试管理器'); closeButton.addEventListener('click', close);
    const newBody = append(dialog, 'main', undefined, 'crypt-lord-manager-body'); newBody.dataset.cryptLordManagerBody = '';
    body = newBody;
    mask.addEventListener('click', event => { if (event.target === mask) close(); });
    keydownHandler = event => { if (event.key === 'Escape' && mask?.dataset.open === 'true') { event.preventDefault?.(); close(); } };
    host.document.addEventListener?.('keydown', keydownHandler);
    (host.document.body || host.document.documentElement).appendChild(mask);
    return true;
  }
  function disposeDom() {
    try { if (keydownHandler && host?.document) host.document.removeEventListener?.('keydown', keydownHandler); } catch { /* detached host */ }
    keydownHandler = null;
    try { mask?.remove(); } catch {}
    // This node is loader-owned but manager-consumed.  Once consumed, manager owns
    // its lifetime so no CSS survives a manager or full-loader disposal.
    try { style?.remove(); } catch {}
    mask = null; style = null; closeButton = null; body = null;
  }
  function renderList(parent, values, empty) { const list = append(parent, 'ul', undefined, 'crypt-lord-manager-list'); if (!values.length) { append(list, 'li', empty, 'crypt-lord-manager-empty'); return; } values.forEach(value => append(list, 'li', value)); }
  function card(parent, title) { const section = append(parent, 'section', undefined, 'crypt-lord-manager-card'); append(section, 'h3', title); return append(section, 'div', undefined, 'crypt-lord-manager-content'); }
  function refresh() {
    if (!ensure()) return false;
    if (!body || !body.isConnected) {
      consoleFailure('manager-body-missing', 'Manager body reference is unavailable or detached from the host document');
      return false;
    }
    body.textContent = '';
    let snapshot; try { snapshot = root.debug?.snapshot?.(); } catch (error) { snapshot = { enabled: false, loader: null, modules: [], limitations: [safeText(error)], events: [] }; }
    const overview = card(body, '运行总览'); const badges = append(overview, 'div', undefined, 'crypt-lord-manager-badges');
    const badge = (text, level = '') => { const node = append(badges, 'span', text, 'crypt-lord-manager-badge'); if (level) node.dataset.level = level; };
    badge(snapshot?.enabled ? '调试已启用' : '调试已停用', snapshot?.enabled ? '' : 'warn'); badge(`加载器：${snapshot?.loader?.status || '未启动'}`, snapshot?.loader?.error ? 'error' : ''); badge(`模块：${snapshot?.modules?.length || 0}`);
    const actions = card(body, '诊断操作'); const actionsRow = append(actions, 'div', undefined, 'crypt-lord-manager-actions');
    const action = (label, handler) => { const button = append(actionsRow, 'button', label, 'crypt-lord-manager-button'); button.type = 'button'; button.addEventListener('click', handler); };
    action('刷新快照', refresh); action('清空事件日志', () => { root.debug?.panel?.clear?.(); refresh(); }); action(snapshot?.enabled ? '停用调试' : '启用调试', () => { root.debug?.setEnabled?.(!root.debug?.isEnabled?.()); refresh(); });
    const modules = card(body, '模块状态'); renderList(modules, (snapshot?.modules || []).map(item => `${safeText(item.key)} · ${item.registered ? '已注册' : '未注册'} · ${item.mounted ? '已挂载' : '未挂载'}`), '没有可观测模块状态。');
    const limitations = card(body, '当前限制'); renderList(limitations, (snapshot?.limitations || []).map(safeText), '未报告限制。');
    const events = card(body, '事件日志'); events.parentNode.className += ' crypt-lord-manager-card-wide'; renderList(events, (snapshot?.events || []).slice().reverse().map(item => `${safeText(item.timestamp)} [${safeText(item.level)}] ${safeText(item.module)} · ${safeText(item.action)}${item.details ? ` — ${safeText(item.details)}` : ''}`), '事件日志为空。');
    if (!body.children.length) {
      consoleFailure('manager-render-empty', 'Refresh produced no diagnostic content into manager body');
      return false;
    }
    return true;
  }
  function open() {
    if (!ensure()) return false;
    mask.dataset.open = 'true';
    const rendered = refresh();
    if (!rendered) {
      mask.dataset.open = 'false';
      const reason = lastError || 'manager refresh did not render any diagnostic content into host body';
      try { console.error('[cryptLord.debugManager] manager-refresh-failure', { reason, root: ROOT_MARKER, body: body ? (body.isConnected ? 'present' :'detached') : 'missing' }); } catch { /* diagnostic reporting is non-fatal */ }
      return false;
    }
    try { closeButton?.focus?.(); } catch {}
    return true;
  }
  function close() { if (!mask?.isConnected) return false; mask.dataset.open = 'false'; return true; }
  function status() { return Object.freeze({ key: KEY, available: !disposed, open: mask?.dataset?.open === 'true', host: host ? Object.freeze({ score: host.score, url: host.url, root: ROOT_MARKER, style: STYLE_MARKER }) : null, lastError }); }
  function dispose() { if (disposed) return true; disposed = true; disposeDom(); try { contract.releaseGlobal(KEY, api); } catch {} if (root.debugManager === api) delete root.debugManager; return true; }
  const api = Object.freeze({ status, open, close, refresh, dispose });
  root.debugManager = api;
  try { root.debug?.panel?.unmount?.(); } catch { /* manager remains usable without the legacy compatibility panel */ }
  try { contract.initializeGlobal(KEY, api); } catch (error) { if (root.debugManager === api) delete root.debugManager; throw error; }
})();
