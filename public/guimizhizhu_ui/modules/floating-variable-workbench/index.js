(() => {
  'use strict';

  const KEY = 'cryptLord.variableWorkbench';
  const STORE_KEY = 'cryptLord.stateStore';
  const PATCH_KEY = 'cryptLord.variablePatch';
  const SETTLEMENT_KEY = 'cryptLord.variableSettlementApi';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const STORAGE_KEY = 'cryptLord.variableWorkbench.state.v1';
  const DOMAINS = Object.freeze(['stat_data', 'npc_data', 'world_data']);
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const host = root.__stage1Modules?.[HOST_KEY];
  if (!host) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const state = {
    ball: null,
    retryBall: null,
    panel: null,
    status: null,
    search: null,
    tree: null,
    patch: null,
    instruction: null,
    targetId: null,
    base: {},
    draft: {},
    expanded: new Set(DOMAINS),
    highlighted: new Set(),
    unreadChanges: 0,
    activeTab: 'deep',
    zoom: 1,
    drag: null,
    resize: null,
    ballDrag: null,
    retryBusy: false,
    disposed: false,
    cleanup: [],
  };

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) {
    const source = value && typeof value === 'object' ? value : {};
    if (typeof window.structuredClone === 'function') return window.structuredClone(source);
    return JSON.parse(JSON.stringify(source));
  }
  function notify(message, level = 'info') {
    const fn = window.toastr?.[level];
    if (typeof fn === 'function') fn(message);
    else console[level === 'error' ? 'error' : 'info'](`[${KEY}] ${message}`);
  }
  function doc() { return host.getHost()?.document || document; }
  function hostWindow() { return doc().defaultView || window; }
  function dispatchHostEvent(name, detail) {
    try {
      const owner = hostWindow();
      owner.dispatchEvent(new owner.CustomEvent(name, { detail }));
    } catch (error) {
      console.warn(`[${KEY}] 无法派发 ${name} 通知`, error);
    }
  }
  function element(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, className, handler, title) {
    const node = element('button', className, label);
    node.type = 'button';
    if (title) node.title = title;
    node.addEventListener('click', handler);
    return node;
  }
  function pointer(segments) { return `/${segments.map(key => String(key).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`; }
  function pathId(domain, segments) { return `${domain}:${pointer(segments)}`; }
  function getAt(source, segments) { return segments.reduce((value, key) => value == null ? undefined : value[key], source); }
  function setAt(source, segments, value) {
    const parent = getAt(source, segments.slice(0, -1));
    if (!record(parent) && !Array.isArray(parent)) throw new Error('变量路径的父节点不是对象或列表。');
    parent[segments.at(-1)] = value;
  }
  function removeAt(source, segments) {
    const parent = getAt(source, segments.slice(0, -1));
    if (Array.isArray(parent)) parent.splice(Number(segments.at(-1)), 1);
    else if (record(parent)) delete parent[segments.at(-1)];
    else throw new Error('变量路径的父节点不是对象或列表。');
  }
  function isSame(left, right) {
    if (left === right) return true;
    try { return JSON.stringify(left) === JSON.stringify(right); } catch { return false; }
  }
  function loadLayout() {
    try {
      const saved = JSON.parse(hostWindow().localStorage?.getItem(STORAGE_KEY) || '{}');
      return {
        panel: { x: Number(saved?.panel?.x) || 24, y: Number(saved?.panel?.y) || 112, width: Math.max(340, Number(saved?.panel?.width) || 470), height: Math.max(420, Number(saved?.panel?.height) || 640) },
        ball: { x: Number.isFinite(saved?.ball?.x) ? saved.ball.x : null, y: Number.isFinite(saved?.ball?.y) ? saved.ball.y : null },
        zoom: Math.min(1.5, Math.max(.75, Number(saved?.zoom) || 1)),
      };
    } catch { return { panel: { x: 24, y: 112, width: 470, height: 640 }, ball: { x: null, y: null }, zoom: 1 }; }
  }
  function saveLayout() {
    if (!state.panel || !state.ball) return;
    try {
      hostWindow().localStorage?.setItem(STORAGE_KEY, JSON.stringify({
        panel: { x: parseFloat(state.panel.style.left) || 24, y: parseFloat(state.panel.style.top) || 112, width: parseFloat(state.panel.style.width) || 470, height: parseFloat(state.panel.style.height) || 640 },
        ball: { x: parseFloat(state.ball.style.left), y: parseFloat(state.ball.style.top) },
        zoom: state.zoom,
      }));
    } catch { /* Storage is optional. */ }
  }
  function clampPanel() {
    if (!state.panel) return;
    const view = hostWindow();
    const margin = 8;
    const width = Math.min(Math.max(340, parseFloat(state.panel.style.width) || 470), Math.max(340, view.innerWidth - margin * 2));
    const height = Math.min(Math.max(420, parseFloat(state.panel.style.height) || 640), Math.max(420, view.innerHeight - margin * 2));
    const x = Math.max(margin, Math.min(parseFloat(state.panel.style.left) || margin, view.innerWidth - width - margin));
    const y = Math.max(margin, Math.min(parseFloat(state.panel.style.top) || margin, view.innerHeight - height - margin));
    state.panel.style.width = `${width}px`;
    state.panel.style.height = `${height}px`;
    state.panel.style.left = `${x}px`;
    state.panel.style.top = `${y}px`;
  }
  function clampBall() {
    if (!state.ball) return;
    const view = hostWindow();
    const x = parseFloat(state.ball.style.left);
    const y = parseFloat(state.ball.style.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      state.ball.style.left = `${Math.max(10, view.innerWidth - 68)}px`;
      state.ball.style.top = `${Math.max(10, view.innerHeight - 146)}px`;
      return;
    }
    state.ball.style.left = `${Math.max(8, Math.min(x, view.innerWidth - 56))}px`;
    state.ball.style.top = `${Math.max(8, Math.min(y, view.innerHeight - 56))}px`;
  }
  function positionRetryBall() {
    if (!state.ball || !state.retryBall) return;
    const view = hostWindow();
    const mainX = parseFloat(state.ball.style.left) || 0;
    const mainY = parseFloat(state.ball.style.top) || 0;
    const preferredX = mainX - 13;
    const x = Math.max(8, Math.min(preferredX, view.innerWidth - 32));
    const y = Math.max(8, Math.min(mainY + 34, view.innerHeight - 32));
    state.retryBall.style.left = `${x}px`;
    state.retryBall.style.top = `${y}px`;
  }
  function setStatus(text) { if (state.status) state.status.textContent = text; }
  function setUnread(count = state.unreadChanges) {
    state.unreadChanges = Math.max(0, Number(count) || 0);
    const badge = state.ball?.querySelector('[data-variable-badge]');
    if (badge) {
      badge.textContent = state.unreadChanges > 99 ? '99+' : String(state.unreadChanges);
      badge.hidden = state.unreadChanges === 0;
    }
    state.ball?.classList.toggle('crypt-lord-variable-workbench__ball--updated', state.unreadChanges > 0);
  }
  function makePatch(domain, op, segments, value) {
    const command = { op, path: pointer(segments) };
    if (op !== 'remove') command.value = clone({ value }).value;
    return { domain, command };
  }
  function changesBetween(before, after) {
    const changed = [];
    const walk = (domain, left, right, segments = [], depth = 0) => {
      if (isSame(left, right)) return;
      if (depth >= 6 || !record(left) && !Array.isArray(left) || !record(right) && !Array.isArray(right)) {
        changed.push(pathId(domain, segments));
        return;
      }
      const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
      if (!keys.size) changed.push(pathId(domain, segments));
      keys.forEach(key => walk(domain, left?.[key], right?.[key], [...segments, key], depth + 1));
    };
    DOMAINS.forEach(domain => walk(domain, before?.[domain] || {}, after?.[domain] || {}, []));
    return changed;
  }
  function normalizeDraft(data) {
    const next = clone(data);
    DOMAINS.forEach(domain => { if (!record(next[domain])) next[domain] = {}; });
    return next;
  }
  async function getTarget(messageId) {
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const target = Number.isInteger(messageId) ? await store.readMessage(messageId) : await store.findLatestAssistant();
    if (!target || target.role !== 'assistant' || !Number.isInteger(target.message_id)) throw new Error('没有可编辑的真实 assistant 楼层。');
    return { store, target };
  }
  function updateZoom(next) {
    state.zoom = Math.max(.75, Math.min(1.5, next));
    const treeRoot = state.tree?.querySelector('.crypt-lord-variable-workbench__tree-scale');
    if (treeRoot) treeRoot.style.fontSize = `${Math.round(state.zoom * 100)}%`;
    const label = state.panel?.querySelector('[data-variable-zoom]');
    if (label) label.textContent = `${Math.round(state.zoom * 100)}%`;
    saveLayout();
  }
  function readPrimitive(input, prior) {
    if (typeof prior === 'boolean') return input.checked;
    if (typeof prior === 'number') {
      const value = Number(input.value);
      if (!Number.isFinite(value)) throw new Error('数值字段必须填写有效数字。');
      return value;
    }
    return input.value;
  }
  function renderTree() {
    if (!state.tree) return;
    state.tree.replaceChildren();
    const scale = element('div', 'crypt-lord-variable-workbench__tree-scale');
    state.tree.appendChild(scale);
    updateZoom(state.zoom);
    const filter = String(state.search?.value || '').trim().toLocaleLowerCase();
    const hasMatch = (key, value) => !filter || String(key).toLocaleLowerCase().includes(filter) || (!record(value) && !Array.isArray(value) && String(value).toLocaleLowerCase().includes(filter));
    const renderNode = (domain, key, value, segments, rootNode = false) => {
      const branch = record(value) || Array.isArray(value);
      const children = branch ? Object.entries(value).filter(([child]) => child !== '$meta').map(([child, item]) => renderNode(domain, child, item, [...segments, child])).filter(Boolean) : [];
      if (!hasMatch(key, value) && !children.length) return null;
      const path = pathId(domain, segments);
      const row = element('div', 'crypt-lord-variable-workbench__tree-row');
      const node = element('div', 'crypt-lord-variable-workbench__tree-node');
      node.dataset.variablePath = path;
      if (state.highlighted.has(path)) node.classList.add('is-updated');
      if (branch) {
        const expanded = state.expanded.has(path) || Boolean(filter);
        node.appendChild(button(expanded ? '−' : '+', 'crypt-lord-variable-workbench__icon', () => {
          if (state.expanded.has(path)) state.expanded.delete(path); else state.expanded.add(path);
          renderTree();
        }, '展开或收起'));
      } else node.appendChild(element('span', 'crypt-lord-variable-workbench__spacer'));
      node.appendChild(element('strong', 'crypt-lord-variable-workbench__tree-key', rootNode ? domain : Array.isArray(value) ? `[${key}]` : key));
      if (branch) {
        const count = Object.keys(value).filter(child => child !== '$meta').length;
        node.appendChild(element('span', 'crypt-lord-variable-workbench__tree-summary', Array.isArray(value) ? `列表 (${count})` : `对象 (${count})`));
        node.appendChild(button('+', 'crypt-lord-variable-workbench__icon', () => addNode(domain, segments, value, path), '新增字段'));
      } else {
        const input = element('input', 'crypt-lord-variable-workbench__tree-input');
        if (typeof value === 'boolean') { input.type = 'checkbox'; input.checked = value; }
        else { input.type = typeof value === 'number' ? 'number' : 'text'; input.value = value == null ? '' : String(value); }
        if (!isSame(getAt(state.base?.[domain], segments), value)) input.classList.add('is-dirty');
        input.addEventListener('change', () => {
          try {
            const next = readPrimitive(input, value);
            setAt(state.draft[domain], segments, next);
            input.classList.toggle('is-dirty', !isSame(getAt(state.base?.[domain], segments), next));
            setStatus('已修改草稿；点击“应用”后才会写入当前真实 assistant 楼层。');
          } catch (error) { notify(`修改变量失败：${error?.message || error}`, 'error'); renderTree(); }
        });
        node.appendChild(input);
      }
      if (!rootNode) node.appendChild(button('×', 'crypt-lord-variable-workbench__icon crypt-lord-variable-workbench__delete', () => deleteNode(domain, segments), '删除字段'));
      row.appendChild(node);
      if (branch && (state.expanded.has(path) || filter)) {
        const childBox = element('div', 'crypt-lord-variable-workbench__tree-children');
        children.forEach(child => childBox.appendChild(child));
        row.appendChild(childBox);
      }
      return row;
    };
    DOMAINS.forEach(domain => {
      const node = renderNode(domain, domain, state.draft[domain] || {}, [], true);
      if (node) scale.appendChild(node);
    });
    if (!scale.childElementCount) scale.appendChild(element('div', 'crypt-lord-variable-workbench__empty', '没有匹配的变量。'));
  }
  function addNode(domain, segments, value, path) {
    const win = hostWindow();
    const parent = getAt(state.draft[domain], segments);
    if (!record(parent) && !Array.isArray(parent)) return;
    let key = '';
    if (!Array.isArray(parent)) {
      key = win.prompt(`在 ${pointer(segments) || '/'} 下新增变量名：`, '新变量');
      if (key === null || !key.trim()) return;
      key = key.trim();
    }
    const kind = win.prompt('选择类型：1 文本；2 数字；3 开关；4 对象；5 列表', '1');
    const values = { 1: '新内容', 2: 0, 3: false, 4: {}, 5: [] };
    const next = values[String(kind || '').trim()];
    if (next === undefined) return;
    const nextSegments = Array.isArray(parent) ? [...segments, String(parent.length)] : [...segments, key];
    if (Array.isArray(parent)) parent.push(next); else parent[key] = next;
    state.expanded.add(path);
    setStatus('已新增变量草稿；点击“应用”后才会写入当前真实 assistant 楼层。');
    renderTree();
  }
  function deleteNode(domain, segments) {
    if (!hostWindow().confirm(`删除变量 ${pointer(segments)}？`)) return;
    try {
      removeAt(state.draft[domain], segments);
      setStatus('已删除变量草稿；点击“应用”后才会写入当前真实 assistant 楼层。');
      renderTree();
    } catch (error) { notify(`删除变量失败：${error?.message || error}`, 'error'); }
  }
  function setTab(tab) {
    state.activeTab = tab === 'raw' ? 'raw' : 'deep';
    state.panel?.querySelectorAll('[data-variable-tab]').forEach(node => node.classList.toggle('is-active', node.dataset.variableTab === state.activeTab));
    state.panel?.querySelector('[data-variable-deep]')?.toggleAttribute('hidden', state.activeTab !== 'deep');
    state.panel?.querySelector('[data-variable-raw]')?.toggleAttribute('hidden', state.activeTab !== 'raw');
  }
  async function applyRawPatch() {
    try {
      const patch = await contract.waitGlobalInitialized(PATCH_KEY, { timeoutMs: 10000 });
      const result = patch.apply(`<UpdateVariable><JSONPatch>${state.patch.value}</JSONPatch></UpdateVariable>`, state.draft);
      if (!result.applied) throw new Error('没有识别到 add、replace 或 remove 指令。');
      state.draft = normalizeDraft(result.data);
      setStatus(`已将 ${result.applied} 项补丁写入草稿；尚未保存。`);
      renderTree();
    } catch (error) { notify(`应用补丁失败：${error?.message || error}`, 'error'); }
  }
  async function recoverUpdate() {
    const extracted = state.base?.cryptLord?.lastUpdateVariable || state.draft?.cryptLord?.lastUpdateVariable;
    if (!extracted) { notify('当前楼层没有可恢复的 UpdateVariable 提取记录。', 'warning'); return; }
    const match = String(extracted).match(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/i);
    state.patch.value = match?.[1]?.trim() || String(extracted);
    setTab('raw');
    setStatus('已恢复本回合提取；请检查后应用到草稿。');
  }
  async function repairWithAi() {
    const instruction = String(state.instruction?.value || '').trim();
    if (!instruction) { notify('请先填写变量修改要求。', 'warning'); return; }
    const action = state.panel?.querySelector('[data-variable-repair]');
    try {
      const settlement = await contract.waitGlobalInitialized(SETTLEMENT_KEY, { timeoutMs: 10000 });
      action.disabled = true;
      action.textContent = '处理中';
      const result = await settlement.repair({ previousData: state.draft, instruction });
      state.draft = normalizeDraft(result.data);
      setStatus(`AI 已生成 ${result.applied} 项变量修改到草稿；检查后点击“应用”。`);
      renderTree();
    } catch (error) { notify(`AI 变量修复失败：${error?.message || error}`, 'error'); }
    finally { if (action) { action.disabled = false; action.textContent = 'AI 修改'; } }
  }
  async function reload() {
    try {
      const { store, target } = await getTarget(state.targetId);
      await store.restoreVariableTag(target.message_id);
      state.targetId = target.message_id;
      state.base = normalizeDraft(target.data);
      state.draft = clone(state.base);
      state.highlighted.clear();
      renderTree();
      setStatus(`已从真实 assistant 楼层 #${state.targetId} 重新读取。`);
    } catch (error) { notify(`重新读取变量失败：${error?.message || error}`, 'error'); }
  }
  async function save() {
    const apply = state.panel?.querySelector('[data-variable-save]');
    try {
      const { store, target } = await getTarget(state.targetId);
      const before = normalizeDraft(target.data);
      const next = normalizeDraft(state.draft);
      apply.disabled = true;
      await store.writeAssistantData(target.message_id, next);
      state.targetId = target.message_id;
      state.base = clone(next);
      const changed = changesBetween(before, next);
      notifyUpdate({ messageId: target.message_id, beforeData: before, afterData: next, changedPaths: changed, source: 'manual' });
      setStatus(`已保存到真实 assistant 楼层 #${target.message_id}。`);
      notify('变量已保存到当前真实 assistant 楼层。', 'success');
    } catch (error) { notify(`保存变量失败：${error?.message || error}`, 'error'); }
    finally { if (apply) apply.disabled = false; }
  }
  async function retryVariableSettlement() {
    if (state.retryBusy) return;
    const trigger = state.retryBall;
    try {
      state.retryBusy = true;
      if (trigger) {
        trigger.disabled = true;
        trigger.classList.add('crypt-lord-variable-workbench__retry-ball--busy');
      }
      setStatus('正在重新请求本回合变量结算...');
      const settlement = await contract.waitGlobalInitialized(SETTLEMENT_KEY, { timeoutMs: 10000 });
      const result = await settlement.retryTurn({ messageId: state.targetId });
      const { store, target } = await getTarget(result.messageId);
      const before = normalizeDraft(target.data);
      const next = normalizeDraft(result.data);
      const patch = await contract.waitGlobalInitialized(PATCH_KEY, { timeoutMs: 10000 });
      const tag = patch.updateTag(result.response);
      if (result.response) {
        next.cryptLord = record(next.cryptLord) ? next.cryptLord : {};
        next.cryptLord.lastUpdateVariable = tag || result.response;
      }
      await store.writeAssistantMessage(result.messageId, patch.embedUpdate(target.message, result.response), next);
      state.targetId = result.messageId;
      state.base = clone(next);
      state.draft = clone(next);
      const after = next;
      const changed = changesBetween(before, after);
      dispatchHostEvent('cryptLord:variables-updated', {
        messageId: result.messageId, beforeData: before, afterData: after, changedPaths: changed, source: 'variable-retry',
      });
      renderTree();
      setStatus(result.skipped
        ? changed.length ? `变量模型返回空补丁；已从前一真实楼层同步 ${changed.length} 项状态。` : '变量模型明确返回空补丁，本回合没有变量变更。'
        : `变量重新结算完成，已写入 ${result.applied} 项并高亮显示。`);
      notify(result.skipped
        ? changed.length ? '模型返回空补丁，已同步前一楼层变量。' : '模型返回空补丁，本回合无变量变更。'
        : '变量重新结算已写入当前真实 assistant 楼层。', result.skipped && !changed.length ? 'warning' : 'success');
    } catch (error) {
      notify(`重新请求变量结算失败：${error?.message || error}`, 'error');
      setStatus('变量重新结算失败。');
    } finally {
      state.retryBusy = false;
      if (trigger) {
        trigger.disabled = false;
        trigger.classList.remove('crypt-lord-variable-workbench__retry-ball--busy');
      }
    }
  }
  function mount() {
    if (state.disposed || state.ball) return Boolean(state.ball);
    const body = doc().body;
    if (!body) return false;
    const layout = loadLayout();
    state.zoom = layout.zoom;
    const ball = element('button', 'crypt-lord-variable-workbench__ball');
    ball.type = 'button';
    ball.title = '变量修改器';
    ball.innerHTML = '<span aria-hidden="true">变量</span><b data-variable-badge hidden>0</b>';
    ball.style.left = layout.ball.x === null ? '' : `${layout.ball.x}px`;
    ball.style.top = layout.ball.y === null ? '' : `${layout.ball.y}px`;
    const retryBall = element('button', 'crypt-lord-variable-workbench__retry-ball');
    retryBall.type = 'button';
    retryBall.title = '重新请求变量结算';
    retryBall.setAttribute('aria-label', retryBall.title);
    retryBall.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8.1 8.1 0 0 0-14.8-4.5L3 9m1-5v5h5m-5 4a8.1 8.1 0 0 0 14.8 4.5L21 15m-1 5v-5h-5"/></svg>';
    const panel = element('section', 'crypt-lord-variable-workbench');
    panel.dataset.open = 'false';
    panel.style.left = `${layout.panel.x}px`;
    panel.style.top = `${layout.panel.y}px`;
    panel.style.width = `${layout.panel.width}px`;
    panel.style.height = `${layout.panel.height}px`;
    panel.innerHTML = '<header class="crypt-lord-variable-workbench__header"><strong>变量修改器</strong><span data-variable-target></span><div><button type="button" data-variable-action="context-config" title="变量副 API 可见性与锁定配置">◉</button><button type="button" data-variable-action="zoom-out" title="缩小">−</button><button type="button" data-variable-zoom title="双击重置缩放">100%</button><button type="button" data-variable-action="zoom-in" title="放大">+</button><button type="button" data-variable-action="close" title="关闭">×</button></div></header><div class="crypt-lord-variable-workbench__tabs"><button type="button" data-variable-tab="deep" class="is-active">深度编辑</button><button type="button" data-variable-tab="raw">原始模式</button></div><div class="crypt-lord-variable-workbench__notice">编辑 <strong>stat_data</strong>、<strong>npc_data</strong>、<strong>world_data</strong>。带 <strong>_for_ai</strong> 后缀的快照不会作为主变量写入。</div><section class="crypt-lord-variable-workbench__body" data-variable-deep><div class="crypt-lord-variable-workbench__tools"><input type="search" placeholder="搜索变量路径或键名" data-variable-search><button type="button" data-variable-action="expand">展开</button><button type="button" data-variable-action="collapse">收起</button></div><div class="crypt-lord-variable-workbench__tree" data-variable-tree></div></section><section class="crypt-lord-variable-workbench__body" data-variable-raw hidden><textarea data-variable-patch spellcheck="false" placeholder="{\n  &quot;stat_data&quot;: [{ &quot;op&quot;: &quot;replace&quot;, &quot;path&quot;: &quot;/当前活力&quot;, &quot;value&quot;: 18 }],\n  &quot;npc_data&quot;: [],\n  &quot;world_data&quot;: []\n}"></textarea><div class="crypt-lord-variable-workbench__raw-actions"><button type="button" data-variable-action="patch">应用补丁到草稿</button><button type="button" data-variable-action="recover">恢复提取</button></div><textarea data-variable-instruction placeholder="例如：将当前地点改为贝克兰德北区；移除已死亡 NPC 的关系记录。"></textarea><div class="crypt-lord-variable-workbench__raw-actions"><button type="button" data-variable-repair>AI 修改</button><button type="button" data-variable-action="settings">副 API 设置</button></div></section><footer><span data-variable-status>等待读取变量。</span><div><button type="button" data-variable-action="reload">重新读取</button><button type="button" data-variable-save class="is-primary">应用</button></div></footer><i class="crypt-lord-variable-workbench__resize" title="拖拽调整窗口大小"></i>';
    state.ball = ball;
    state.retryBall = retryBall;
    state.panel = panel;
    state.status = panel.querySelector('[data-variable-status]');
    state.search = panel.querySelector('[data-variable-search]');
    state.tree = panel.querySelector('[data-variable-tree]');
    state.patch = panel.querySelector('[data-variable-patch]');
    state.instruction = panel.querySelector('[data-variable-instruction]');
    body.append(ball, retryBall, panel);
    clampBall();
    positionRetryBall();
    clampPanel();
    bindEvents();
    updateZoom(state.zoom);
    return true;
  }
  function open(messageId) {
    if (!mount()) return Promise.resolve(false);
    if (Number.isInteger(messageId)) state.targetId = messageId;
    state.panel.dataset.open = 'true';
    setUnread(0);
    return reload().then(() => {
      const label = state.panel.querySelector('[data-variable-target]');
      if (label) label.textContent = `楼层 #${state.targetId}`;
      return true;
    }).catch(error => { notify(`无法打开变量修改器：${error?.message || error}`, 'error'); return false; });
  }
  function close() { if (state.panel) state.panel.dataset.open = 'false'; saveLayout(); }
  function expandAll() {
    const walk = (domain, value, segments = []) => {
      if (!record(value) && !Array.isArray(value)) return;
      state.expanded.add(pathId(domain, segments));
      Object.entries(value).filter(([key]) => key !== '$meta').forEach(([key, item]) => walk(domain, item, [...segments, key]));
    };
    DOMAINS.forEach(domain => walk(domain, state.draft[domain] || {}));
    renderTree();
  }
  function bindEvents() {
    const header = state.panel.querySelector('.crypt-lord-variable-workbench__header');
    state.ball.addEventListener('click', event => { if (!state.ballDrag?.moved) void open(); event.preventDefault(); });
    state.ball.addEventListener('pointerdown', event => {
      state.ballDrag = { startX: event.clientX, startY: event.clientY, x: parseFloat(state.ball.style.left) || 0, y: parseFloat(state.ball.style.top) || 0, moved: false };
      state.ball.setPointerCapture?.(event.pointerId);
    });
    state.ball.addEventListener('pointermove', event => {
      if (!state.ballDrag) return;
      const dx = event.clientX - state.ballDrag.startX;
      const dy = event.clientY - state.ballDrag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) state.ballDrag.moved = true;
      if (!state.ballDrag.moved) return;
      state.ball.style.left = `${state.ballDrag.x + dx}px`;
      state.ball.style.top = `${state.ballDrag.y + dy}px`;
      clampBall();
      positionRetryBall();
    });
    state.ball.addEventListener('pointerup', () => { positionRetryBall(); saveLayout(); setTimeout(() => { state.ballDrag = null; }, 0); });
    state.retryBall.addEventListener('click', () => { void retryVariableSettlement(); });
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      state.drag = { startX: event.clientX, startY: event.clientY, x: parseFloat(state.panel.style.left) || 0, y: parseFloat(state.panel.style.top) || 0 };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      state.panel.style.left = `${state.drag.x + event.clientX - state.drag.startX}px`;
      state.panel.style.top = `${state.drag.y + event.clientY - state.drag.startY}px`;
      clampPanel();
    });
    header.addEventListener('pointerup', () => { state.drag = null; saveLayout(); });
    const resize = state.panel.querySelector('.crypt-lord-variable-workbench__resize');
    resize.addEventListener('pointerdown', event => {
      state.resize = { startX: event.clientX, startY: event.clientY, width: state.panel.offsetWidth, height: state.panel.offsetHeight };
      resize.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    resize.addEventListener('pointermove', event => {
      if (!state.resize) return;
      state.panel.style.width = `${state.resize.width + event.clientX - state.resize.startX}px`;
      state.panel.style.height = `${state.resize.height + event.clientY - state.resize.startY}px`;
      clampPanel();
    });
    resize.addEventListener('pointerup', () => { state.resize = null; saveLayout(); });
    state.panel.addEventListener('click', event => {
      const action = event.target?.dataset?.variableAction;
      const tab = event.target?.dataset?.variableTab;
      if (tab) setTab(tab);
      if (action === 'close') close();
      if (action === 'zoom-in') updateZoom(state.zoom + .1);
      if (action === 'zoom-out') updateZoom(state.zoom - .1);
      if (action === 'expand') expandAll();
      if (action === 'collapse') { state.expanded.clear(); renderTree(); }
      if (action === 'patch') void applyRawPatch();
      if (action === 'recover') void recoverUpdate();
      if (action === 'reload') void reload();
      if (action === 'settings') {
        const gameShell = root.__stage1Modules?.['cryptLord.gameShell'];
        if (typeof gameShell?.openSettings === 'function') void gameShell.openSettings();
        else dispatchHostEvent('cryptLord:open-variable-settlement-settings');
      }
      if (action === 'context-config') {
        void contract.waitGlobalInitialized('cryptLord.aiContextConfigUi', { timeoutMs: 10000 }).then(api => api.open());
      }
    });
    state.panel.querySelector('[data-variable-zoom]').addEventListener('dblclick', () => updateZoom(1));
    state.search.addEventListener('input', renderTree);
    state.panel.querySelector('[data-variable-save]').addEventListener('click', () => { void save(); });
    state.panel.querySelector('[data-variable-repair]').addEventListener('click', () => { void repairWithAi(); });
    const onUpdate = event => notifyUpdate(event.detail || {});
    const onResize = () => { clampBall(); positionRetryBall(); clampPanel(); saveLayout(); };
    hostWindow().addEventListener('cryptLord:variables-updated', onUpdate);
    hostWindow().addEventListener('resize', onResize);
    if (hostWindow() !== window) {
      window.addEventListener('cryptLord:variables-updated', onUpdate);
      state.cleanup.push(() => window.removeEventListener('cryptLord:variables-updated', onUpdate));
    }
    state.cleanup.push(() => hostWindow().removeEventListener('cryptLord:variables-updated', onUpdate), () => hostWindow().removeEventListener('resize', onResize));
  }
  function notifyUpdate(detail = {}) {
    const changed = Array.isArray(detail.changedPaths) ? detail.changedPaths : changesBetween(detail.beforeData || {}, detail.afterData || {});
    if (!changed.length) return;
    state.highlighted = new Set(changed);
    setUnread(changed.length);
    if (state.panel?.dataset.open === 'true' && Number(detail.messageId) === state.targetId) {
      state.base = normalizeDraft(detail.afterData);
      state.draft = clone(state.base);
      renderTree();
      setStatus(`本回合更新了 ${changed.length} 项变量，已高亮显示。`);
    }
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.ball), open: state.panel?.dataset.open === 'true', targetId: state.targetId, unreadChanges: state.unreadChanges }); },
    mount,
    open,
    close,
    notifyUpdate,
    retryVariableSettlement,
    dispose() {
      state.disposed = true;
      state.cleanup.splice(0).forEach(cleanup => cleanup());
      state.ball?.remove();
      state.retryBall?.remove();
      state.panel?.remove();
      state.ball = null;
      state.retryBall = null;
      state.panel = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
