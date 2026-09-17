(() => {
  'use strict';

  const KEY = 'cryptLord.legacyToolsHub';
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

  // 源文件 诡秘之主正则2.js:41170-41237 原样 7 项入口（顺序与文案保持源文件原貌）。
  const TOOLS_HUB_ITEMS = [
    { action: 'ai-context', icon: '🔒', name: '变量可见性配置', desc: '配置哪些变量对 AI 可见 / 不可见' },
    { action: 'var-fix', icon: '📝', name: '肘击AI（变量修复与修改）', desc: '命令AI修改变量，必须先跑一轮正文才能打开此功能' },
    { action: 'fast-relay', icon: '🔮', name: '占卜', desc: '前端占卜功能，占卜只揭示客观信息，拒绝AI媚玩家，拒绝把占卜当成许愿机' },
    { action: 'fast-romance', icon: '💋', name: '快速色色（NSFW）', desc: '快速出文的NSFW玩法，可自定义文风和破甲' },
    { action: 'detective', icon: '🕵️', name: '探案玩法（侦探本）', desc: '作为侦探调查案件真相，内置几百种核心诡计' },
    { action: 'domain', icon: '🏰', name: '独立领地', desc: '经营领地，招募军队，征服整个大陆' },
    { action: 'pathway-play', icon: '🎭', name: '途径专属玩法', desc: '按你的当前序列解锁所属途径的专属玩法' },
  ];

  let toggle = null;
  let panel = null;
  let closeBtn = null;
  let list = null;
  let disposeState = null;
  let mounted = false;
  let isDragging = false;
  let touchMoved = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  function debugEvent(category, action, details, level = 'info') {
    try { root.debug?.event?.(category, KEY, action, details, level); } catch { /* diagnostics are best-effort */ }
  }

  function ownerDocument() {
    try {
      return typeof document !== 'undefined' && document?.body && typeof document.createElement === 'function' ? document : null;
    } catch { return null; }
  }

  function make(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setStyle(node, cssText) {
    try { node.setAttribute('style', cssText); } catch { /* style attribute may be unavailable */ }
  }

  function togglePanel(force) {
    if (!panel || !toggle) return false;
    const next = typeof force === 'boolean' ? force : panel.style.display === 'none';
    panel.style.display = next ? 'flex' : 'none';
    debugEvent('ui', next ? 'tools-hub-shown' : 'tools-hub-hidden', '按源文件 toggleToolsHub 同款行为');
    return next;
  }

  function runToolsHubAction(action) {
    // 按源文件 initToolsHub 的列表点击 → runToolsHubAction(action) 调用；
    // 源文件中这 7 个 action 全是写入路径（setVariables / createChatMessages / UpdateVariable）
    // 或宿主持久化路径（手动备份、自动备份、导出），这些已被本项目红线禁止，
    // 因此这里仅 console.info 提示，禁止调用任何 setVariables / createChatMessages /
    // setChatMessages / deleteChatMessages / updateVariable / toastr。
    try { console.info(`[${KEY}] 工具栏点击：${action}（壳层已就位；写入路径未迁移）`); } catch { /* console unavailable */ }
    debugEvent('refusal', 'tools-hub-action-not-migrated', `data-hub-action=${action}`);
  }

  function buildToggle(doc) {
    const node = make(doc, 'button', 'fve-toggle-btn fve-toggle-btn-text', '工具与衍生玩法');
    node.id = 'float-tools-hub-toggle';
    node.type = 'button';
    node.setAttribute('title', '工具与衍生玩法');
    setStyle(node, 'bottom: 140px;');
    return node;
  }

  function buildPanel(doc) {
    const rootPanel = make(doc, 'div');
    rootPanel.id = 'float-tools-hub-panel';
    setStyle(rootPanel, 'display: none;');

    const header = make(doc, 'div', 'tools-hub-header');
    const title = make(doc, 'div', 'tools-hub-title', '🧰 工具与衍生玩法');
    header.appendChild(title);

    const closeButton = make(doc, 'button', 'bare-icon-btn', '×');
    closeButton.type = 'button';
    closeButton.id = 'btn-close-tools-hub';
    closeButton.setAttribute('title', '关闭');
    header.appendChild(closeButton);
    rootPanel.appendChild(header);

    const listNode = make(doc, 'ul', 'tools-hub-list');
    listNode.id = 'float-tools-hub-list';
    TOOLS_HUB_ITEMS.forEach(item => {
      const li = make(doc, 'li', 'tools-hub-item');
      li.setAttribute('data-hub-action', item.action);
      const icon = make(doc, 'div', 'tools-hub-item-icon', item.icon);
      li.appendChild(icon);
      const body = make(doc, 'div', 'tools-hub-item-body');
      const name = make(doc, 'span', 'tools-hub-item-name', item.name);
      const desc = make(doc, 'span', 'tools-hub-item-desc', item.desc);
      body.appendChild(name);
      body.appendChild(desc);
      li.appendChild(body);
      const arrow = make(doc, 'div', 'tools-hub-item-arrow', '›');
      li.appendChild(arrow);
      listNode.appendChild(li);
    });
    rootPanel.appendChild(listNode);

    return { rootPanel, closeButton, listNode };
  }

  function bindEvents() {
    if (!toggle || !panel) return;
    if (toggle.dataset.cryptLordToolsHubInit === 'true') return;
    toggle.dataset.cryptLordToolsHubInit = 'true';

    toggle.addEventListener('click', () => {
      if (toggle.dataset.dragging === 'true') {
        toggle.dataset.dragging = 'false';
        return;
      }
      togglePanel();
    });

    closeBtn?.addEventListener('click', event => {
      try { event.stopPropagation?.(); } catch { /* listener optional */ }
      togglePanel(false);
    });

    list?.addEventListener('click', event => {
      const item = event.target?.closest?.('.tools-hub-item');
      if (!item) return;
      const action = item.dataset.hubAction;
      if (action) runToolsHubAction(action);
    });

    toggle.addEventListener('mousedown', event => {
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      try {
        const rect = toggle.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
      } catch { startLeft = 0; startTop = 0; }
      try { event.preventDefault?.(); } catch { /* ignore */ }
    });

    const onMouseMove = event => {
      if (!isDragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        toggle.dataset.dragging = 'true';
        togglePanel(false);
      }
      const maxX = Math.max(0, (window.innerWidth || 0) - 48);
      const maxY = Math.max(0, (window.innerHeight || 0) - 48);
      const newX = Math.max(0, Math.min(maxX, startLeft + dx));
      const newY = Math.max(0, Math.min(maxY, startTop + dy));
      toggle.style.left = `${newX}px`;
      toggle.style.top = `${newY}px`;
      toggle.style.right = 'auto';
      toggle.style.bottom = 'auto';
    };
    document.addEventListener('mousemove', onMouseMove);

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        setTimeout(() => { toggle.dataset.dragging = 'false'; }, 100);
      }
    };
    document.addEventListener('mouseup', onMouseUp);

    toggle.addEventListener('touchstart', event => {
      touchMoved = false;
      const touch = event.touches?.[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      try {
        const rect = toggle.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
      } catch { startLeft = 0; startTop = 0; }
    }, { passive: true });

    toggle.addEventListener('touchmove', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchMoved = true;
        toggle.dataset.dragging = 'true';
        togglePanel(false);
        const maxX = Math.max(0, (window.innerWidth || 0) - 48);
        const maxY = Math.max(0, (window.innerHeight || 0) - 48);
        const newX = Math.max(0, Math.min(maxX, startLeft + dx));
        const newY = Math.max(0, Math.min(maxY, startTop + dy));
        toggle.style.left = `${newX}px`;
        toggle.style.top = `${newY}px`;
        toggle.style.right = 'auto';
        toggle.style.bottom = 'auto';
      }
    }, { passive: true });

    toggle.addEventListener('touchend', () => {
      if (touchMoved) {
        touchMoved = false;
        setTimeout(() => { toggle.dataset.dragging = 'false'; }, 100);
      }
    });

    disposeState = { onMouseMove, onMouseUp };
  }

  function unbindEvents() {
    if (!disposeState) return;
    try { document.removeEventListener('mousemove', disposeState.onMouseMove); } catch { /* detached */ }
    try { document.removeEventListener('mouseup', disposeState.onMouseUp); } catch { /* detached */ }
    disposeState = null;
  }

  function mount() {
    if (mounted) return true;
    const doc = ownerDocument();
    if (!doc) {
      debugEvent('failure', 'tools-hub-mount-failure', '当前脚本文档没有可用 body', 'error');
      return false;
    }
    const existingToggle = (doc.body && typeof doc.body.querySelector === 'function') ? doc.body.querySelector('#float-tools-hub-toggle') : null;
    const existingPanel = (doc.body && typeof doc.body.querySelector === 'function') ? doc.body.querySelector('#float-tools-hub-panel') : null;
    if (existingToggle || existingPanel) {
      debugEvent('lifecycle', 'tools-hub-skip', '源节点已存在，跳过注入以避免重复 DOM');
      return false;
    }

    toggle = buildToggle(doc);
    const built = buildPanel(doc);
    panel = built.rootPanel;
    closeBtn = built.closeButton;
    list = built.listNode;

    doc.body.appendChild(toggle);
    doc.body.appendChild(panel);
    bindEvents();
    mounted = true;
    debugEvent('lifecycle', 'tools-hub-mounted', '按源文件原样 DOM 注入 + initToolsHub 事件绑定完成；写入路径未迁移');
    return true;
  }

  function unmount() {
    unbindEvents();
    try { toggle?.remove(); } catch { /* detached */ }
    try { panel?.remove(); } catch { /* detached */ }
    toggle = null;
    panel = null;
    closeBtn = null;
    list = null;
    mounted = false;
    return true;
  }

  function dispose(reason = 'dispose') {
    unmount();
    try { contract.releaseGlobal(KEY, api); } catch { /* idempotent contract cleanup */ }
    if (modules[KEY] === api) delete modules[KEY];
    debugEvent('lifecycle', 'tools-hub-disposed', reason);
    return true;
  }

  function readActions() {
    if (!list) return [];
    return Array.from(list.querySelectorAll('.tools-hub-item')).map(li => li.dataset.hubAction || '');
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
phase: 'legacy-tools-hub-source-faithful',
        ready: true,
        mounted,
        panelOpen: !!(panel && panel.style.display !== 'none'),
        expectedActions: Object.freeze(TOOLS_HUB_ITEMS.map(item => item.action)),
        actualActions: Object.freeze(readActions()),
        sourceEntryCount: TOOLS_HUB_ITEMS.length,
      });
    },
    mount,
    open: () => togglePanel(true),
    close: () => togglePanel(false),
    unmount,
    dispose,
    isMounted() { return mounted; },
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
    if (!mount()) throw new Error('按源文件原样 DOM 注入失败');
  } catch (error) {
    if (modules[KEY] === api) delete modules[KEY];
    try { contract.releaseGlobal(KEY, api); } catch { /* rollback best-effort */ }
    throw error;
  }
})();