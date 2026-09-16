(() => {
  'use strict';

  const KEY = 'cryptLord.legacyBattleLauncher';
  const OWNER_ATTR = 'data-crypt-lord-legacy-battle-launcher';
  const BUTTON_ID = 'crypt-lord-battle-launcher-btn';
  const OVERLAY_ID = 'crypt-lord-battle-launcher-overlay';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    if (!['status', 'mount', 'open', 'close', 'unmount', 'dispose'].every(name => typeof existing[name] === 'function')) {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    return;
  }

  let button = null;
  let overlay = null;
  let closeButton = null;
  let keydownHandler = null;
  let disposed = false;

  function debugEvent(category, action, details, level = 'info') {
    try { root.debug?.event?.(category, KEY, action, details, level); } catch { /* diagnostics are best-effort */ }
  }

  function ownerDocument() {
    try {
      return typeof document !== 'undefined' && document?.body && typeof document.createElement === 'function' ? document : null;
    } catch { return null; }
  }

  function mark(node) {
    node.setAttribute(OWNER_ATTR, '');
    node.setAttribute('data-crypt-lord-instance', root.loader?.instanceId || '');
    return node;
  }

  function make(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function isMounted() {
    return !!(button?.isConnected && overlay?.isConnected);
  }

  function close(reason = 'api') {
    if (!overlay) return false;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    debugEvent('ui', 'battle-frontend-closed', reason);
    return true;
  }

  function open(reason = 'api') {
    if (!isMounted() && !mount()) return false;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    closeButton?.focus?.();
    debugEvent('ui', 'battle-frontend-opened', reason);
    return true;
  }

  function removeStaleNodes(doc) {
    try {
      doc.querySelectorAll(`[${OWNER_ATTR}]`).forEach(node => node.remove());
    } catch { /* a host with constrained selector support may only use current references */ }
  }

  function mount() {
    if (disposed) return false;
    if (isMounted()) return true;
    const doc = ownerDocument();
    if (!doc) {
      debugEvent('failure', 'battle-frontend-mount-failure', '当前脚本文档没有可用 body', 'error');
      return false;
    }
    removeStaleNodes(doc);
    button = mark(make(doc, 'button', 'crypt-lord-battle-launcher__button', '⚔️'));
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = '打开诡秘之主战斗前端';
    button.setAttribute('aria-label', '打开诡秘之主战斗前端');

    overlay = mark(make(doc, 'section', 'crypt-lord-battle-launcher__overlay'));
    overlay.id = OVERLAY_ID;
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-label', '诡秘之主战斗前端');

    const panel = make(doc, 'div', 'crypt-lord-battle-launcher__panel');
    const header = make(doc, 'header', 'crypt-lord-battle-launcher__header');
    const titleGroup = make(doc, 'div', 'crypt-lord-battle-launcher__title-group');
    titleGroup.appendChild(make(doc, 'span', 'crypt-lord-battle-launcher__emblem', '⚔️'));
    titleGroup.appendChild(make(doc, 'h2', 'crypt-lord-battle-launcher__title', '诡秘之主 · 战斗系统'));
    closeButton = make(doc, 'button', 'crypt-lord-battle-launcher__close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', '关闭战斗前端');
    header.appendChild(titleGroup);
    header.appendChild(closeButton);

    const body = make(doc, 'main', 'crypt-lord-battle-launcher__body');
    body.appendChild(make(doc, 'p', 'crypt-lord-battle-launcher__eyebrow', 'LEGACY BATTLE UI · SCRIPTIFIED SHELL'));
    body.appendChild(make(doc, 'h3', 'crypt-lord-battle-launcher__headline', '战斗前端已挂载到酒馆页面'));
    body.appendChild(make(doc, 'p', 'crypt-lord-battle-launcher__copy', '此入口迁自旧 BattleUI 的页面级悬浮按钮与全屏模态结构。战斗引擎、判定和数据写入尚未迁移，因此不会伪造可执行战斗。'));
    const grid = make(doc, 'div', 'crypt-lord-battle-launcher__grid');
    [['前端挂载', '已完成'], ['数据来源', '尚未接入'], ['战斗引擎', '待迁移']].forEach(([label, value]) => {
      const card = make(doc, 'section', 'crypt-lord-battle-launcher__status-card');
      card.appendChild(make(doc, 'span', 'crypt-lord-battle-launcher__status-label', label));
      card.appendChild(make(doc, 'strong', 'crypt-lord-battle-launcher__status-value', value));
      grid.appendChild(card);
    });
    body.appendChild(grid);
    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);
    doc.body.appendChild(button);
    doc.body.appendChild(overlay);

    button.addEventListener('click', () => open('button'));
    closeButton.addEventListener('click', () => close('close-button'));
    overlay.addEventListener('click', event => { if (event.target === overlay) close('backdrop'); });
    keydownHandler = event => { if (event.key === 'Escape' && overlay && !overlay.hidden) close('escape'); };
    doc.addEventListener('keydown', keydownHandler);
    debugEvent('lifecycle', 'battle-frontend-mounted', '已自动挂载 ⚔️ 浮动入口与战斗前端容器');
    return true;
  }
function safeWindowMetric(win, property) {
    try { return Number(win?.[property]) || 0; } catch { return 0; }
  }

  function safeRect(node) {
    if (!node || typeof node.getBoundingClientRect !== 'function') return null;
    try {
      const r = node.getBoundingClientRect();
      return {
        x: Number(r?.x) || 0,
        y: Number(r?.y) || 0,
        width: Number(r?.width) || 0,
        height: Number(r?.height) || 0,
        top: Number(r?.top) || 0,
        right: Number(r?.right) || 0,
        bottom: Number(r?.bottom) || 0,
        left: Number(r?.left) || 0,
      };
    } catch {
      return null;
    }
  }

  function describeLocation(node) {
    if (!node) return Object.freeze({ mounted: false, reason: '节点尚未创建' });
    if (!node.isConnected) return Object.freeze({ mounted: false, reason: '节点已脱离 DOM 树（可能被宿主清理或 dispose）' });
    const doc = node.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const win = (doc && doc.defaultView) || window;
    let topURL = '';
    let parentURL = '';
    let isInIframe = false;
    let isSameAsTop = false;
    try { topURL = String(win.top?.document?.URL || ''); } catch { /* cross-origin or detached */ }
    try { parentURL = String(win.parent?.document?.URL || ''); } catch { /* cross-origin or detached */ }
    try { isInIframe = !!(win.top && win.self && win.top !== win.self); } catch { isInIframe = false; }
    try { isSameAsTop = !!doc && win.top?.document === doc; } catch { isSameAsTop = false; }
    const rect = safeRect(node);
    const viewport = { width: safeWindowMetric(win, 'innerWidth'), height: safeWindowMetric(win, 'innerHeight') };
    const reasons = [];
    if (isInIframe && !isSameAsTop) {
      const selfHref = (() => { try { return String(win.self?.location?.href || ''); } catch { return ''; } })();
      reasons.push(`脚本运行在 iframe 容器（self=${selfHref || '不可访问'}），附加节点到非顶层 document（${doc?.URL || '?'}）；顶层可见页面 URL=${topURL || '不可访问（同源受限）'}；用户看到的页面与挂载点不是同一个 document`);
    }
    if (!doc?.body) reasons.push('ownerDocument 缺少 body 元素');
    if (rect && (rect.width === 0 || rect.height === 0)) {
      reasons.push(`节点矩形为零（width=${rect.width}, height=${rect.height}），可能被 display:none / visibility:hidden / 脱离可见 body`);
    }
    if (rect && viewport.width > 0 && viewport.height > 0) {
      if (rect.right < 0 || rect.bottom < 0) reasons.push(`节点在视口左侧/上侧之外（rect=${JSON.stringify(rect)}）`);
      else if (rect.left > viewport.width || rect.top > viewport.height) reasons.push(`节点在视口右侧/下侧之外（rect=${JSON.stringify(rect)}）`);
    }
    return Object.freeze({
      mounted: true,
      selector: node.id ? `#${node.id}` : (node.tagName ? node.tagName.toLowerCase() : 'node'),
      documentURL: String(doc?.URL || ''),
      documentTitle: String(doc?.title || ''),
      documentReadyState: String(doc?.readyState || ''),
      isInIframe,
      isSameAsTopDocument: isSameAsTop,
      topDocumentURL: topURL,
      parentDocumentURL: parentURL,
      rect,
      viewport,
      visibilityReasons: Object.freeze(reasons),
    });
  }

  function locate() {
    return Object.freeze({
      button: describeLocation(button),
      overlay: describeLocation(overlay),
      scriptWindow: Object.freeze({
        selfLocation: String((() => { try { return window.location?.href || ''; } catch { return ''; } })()),
        topLocation: String((() => { try { return window.top?.location?.href || ''; } catch { return ''; } })()),
        isInIframe: (() => { try { return !!(window.top && window.self && window.top !== window.self); } catch { return false; } })(),
      }),
    });
  }

  function aggregateVisibilityReasons() {
    try {
      const evidence = locate();
      const reasons = [];
      ['button', 'overlay'].forEach(role => {
        const entry = evidence[role];
        if (entry && entry.visibilityReasons && entry.visibilityReasons.length) {
          entry.visibilityReasons.forEach(reason => reasons.push(`[${role}] ${reason}`));
        }
      });
      return Object.freeze(reasons);
    } catch {
      return Object.freeze([]);
    }
  }


  function unmount() {
    const doc = ownerDocument();
    if (keydownHandler && doc?.removeEventListener) {
      try { doc.removeEventListener('keydown', keydownHandler); } catch { /* idempotent */ }
    }
    keydownHandler = null;
    try { button?.remove(); } catch { /* already detached */ }
    try { overlay?.remove(); } catch { /* already detached */ }
    button = null;
    overlay = null;
    closeButton = null;
    return true;
  }

  function dispose(reason = 'dispose') {
    if (disposed) return true;
    disposed = true;
    unmount();
    try { contract.releaseGlobal(KEY, api); } catch { /* idempotent contract cleanup */ }
    if (modules[KEY] === api) delete modules[KEY];
    debugEvent('lifecycle', 'battle-frontend-disposed', reason);
    return true;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        phase: 'legacy-battle-ui-shell',
        ready: !disposed,
        mounted: isMounted(),
        location: locate(),
        visibilityReasons: aggregateVisibilityReasons(),
        open: !!(overlay && !overlay.hidden),
        buttonId: BUTTON_ID,
        overlayId: OVERLAY_ID,
      });
    },
    mount,
    open,
    close,
    unmount,
    locate,
    dispose,
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
    if (!mount()) throw new Error('自动挂载战斗前端失败');
  } catch (error) {
    if (modules[KEY] === api) delete modules[KEY];
    try { contract.releaseGlobal(KEY, api); } catch { /* rollback best-effort */ }
    throw error;
  }
})();
