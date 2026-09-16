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
        open: !!(overlay && !overlay.hidden),
        buttonId: BUTTON_ID,
        overlayId: OVERLAY_ID,
      });
    },
    mount,
    open,
    close,
    unmount,
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
