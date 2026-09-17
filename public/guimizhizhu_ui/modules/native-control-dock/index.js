(() => {
  'use strict';

  const KEY = 'cryptLord.nativeControlDock';
  const EDITOR_UI_KEY = 'cryptLord.nativeFloorEditorUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  let host = null;
  let panel = null;
  let detail = null;
  let disposed = false;

  function resolveHost() {
    const candidates = [window];
    for (const name of ['parent', 'top']) {
      try { if (window[name] && !candidates.includes(window[name])) candidates.push(window[name]); } catch { /* cross-origin */ }
    }
    return candidates.reduce((best, candidate) => {
      try {
        const document = candidate?.document;
        if (!document?.body || !document?.documentElement) return best;
        const score = (candidate.TavernHelper ? 6 : 0) + (candidate.SillyTavern ? 8 : 0) + (document.querySelector?.('#send_textarea') ? 12 : 0);
        return !best || score > best.score ? { window: candidate, document, score } : best;
      } catch { return best; }
    }, null);
  }

  function setDetail() {
    if (!detail) return false;
    const input = modules['cryptLord.inputAdapter']?.status?.();
    const nativeFloor = modules['cryptLord.nativeFloor']?.status?.();
    const inputText = input?.ready ? '输入已接入' : '输入等待宿主';
    const floorText = nativeFloor?.active ? '生成中' : '原生楼层就绪';
    detail.textContent = `${floorText} · ${inputText}`;
    return true;
  }

  async function openEditor() {
    const editorUi = await contract.waitGlobalInitialized(EDITOR_UI_KEY, { timeoutMs: 10000 });
    return editorUi.open();
  }

  function openDiagnostics() {
    const manager = root.debugManager;
    if (manager?.open?.() === true) return true;
    return root.debug?.panel?.mount?.(host?.document) === true;
  }

  function button(doc, label, action) {
    const node = doc.createElement('button');
    node.type = 'button';
    node.className = 'crypt-lord-native-control-dock__button';
    node.textContent = label;
    node.addEventListener('click', action);
    return node;
  }

  function mount() {
    if (disposed) return false;
    if (panel?.isConnected) return true;
    host = resolveHost();
    if (!host?.document?.body) return false;
    const doc = host.document;
    panel = doc.createElement('aside');
    panel.className = 'crypt-lord-native-control-dock';
    panel.dataset.cryptLordNativeControlDock = root.loader?.instanceId || '';
    panel.setAttribute('aria-label', '诡秘之主原生楼层工具');
    const title = doc.createElement('strong');
    title.className = 'crypt-lord-native-control-dock__title';
    title.textContent = '诡秘之主';
    detail = doc.createElement('p');
    detail.className = 'crypt-lord-native-control-dock__status';
    detail.setAttribute('aria-live', 'polite');
    const actions = doc.createElement('div');
    actions.className = 'crypt-lord-native-control-dock__actions';
    actions.append(
      button(doc, '编辑最近 AI', () => { void openEditor().catch(error => host.window.toastr?.error?.(error?.message || String(error))); }),
      button(doc, '诊断', openDiagnostics),
    );
    panel.append(title, detail, actions);
    doc.body.appendChild(panel);
    setDetail();
    return true;
  }

  function refresh() { return setDetail(); }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed && !!panel, mounted: !!panel?.isConnected, host: host?.document?.URL || '' }); },
    mount,
    refresh,
    dispose() {
      if (disposed) return true;
      disposed = true;
      panel?.remove();
      panel = null;
      detail = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  if (!mount()) console.warn(`[${KEY}] 未找到可挂载的 SillyTavern 宿主页面`);
})();
