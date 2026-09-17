(() => {
  'use strict';
  const KEY = 'cryptLord.nativeFloorEditorUi';
  const EDITOR_KEY = 'cryptLord.nativeEditor';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let host = null;
  let trigger = null;
  let mask = null;
  let textarea = null;
  let messageId = null;
  let disposed = false;

  function resolveHost() {
    const candidates = [window];
    for (const key of ['parent', 'top']) { try { if (window[key] && !candidates.includes(window[key])) candidates.push(window[key]); } catch {} }
    return candidates.reduce((best, candidate) => {
      try {
        const doc = candidate.document;
        const score = (candidate.TavernHelper ? 6 : 0) + (doc?.querySelector?.('#send_textarea') ? 12 : 0);
        return !best || score > best.score ? { window: candidate, document: doc, score } : best;
      } catch { return best; }
    }, null);
  }

  function close() { if (mask) mask.dataset.open = 'false'; messageId = null; }
  function notify(message, level = 'error') { const fn = window.toastr?.[level]; if (typeof fn === 'function') fn(message); else console[level](`[${KEY}] ${message}`); }

  async function open() {
    const editor = await contract.waitGlobalInitialized(EDITOR_KEY, { timeoutMs: 10000 });
    const target = await editor.open();
    messageId = target.messageId;
    textarea.value = target.message;
    mask.dataset.open = 'true';
    textarea.focus();
    return target;
  }

  async function save() {
    if (!Number.isInteger(messageId)) return;
    const editor = await contract.waitGlobalInitialized(EDITOR_KEY, { timeoutMs: 10000 });
    await editor.save(messageId, textarea.value);
    close();
  }

  function mount() {
    if (disposed || trigger) return !!trigger;
    host = resolveHost();
    if (!host?.document?.body) return false;
    const doc = host.document;
    trigger = doc.createElement('button');
    trigger.className = 'crypt-lord-native-editor-trigger';
    trigger.type = 'button';
    trigger.title = '编辑最近 AI 楼层';
    trigger.textContent = '✎';
    mask = doc.createElement('div');
    mask.className = 'crypt-lord-native-editor-mask';
    mask.dataset.open = 'false';
    mask.innerHTML = '<section class="crypt-lord-native-editor-dialog" role="dialog" aria-modal="true"><header class="crypt-lord-native-editor-head"><strong>编辑最近 AI 楼层</strong><button type="button" data-action="close">关闭</button></header><textarea class="crypt-lord-native-editor-text" spellcheck="false"></textarea><footer class="crypt-lord-native-editor-actions"><button type="button" data-action="cancel">取消</button><button type="button" data-action="save">保存</button></footer></section>';
    textarea = mask.querySelector('textarea');
    trigger.addEventListener('click', () => open().catch(error => notify(error.message)));
    mask.addEventListener('click', event => { if (event.target === mask || event.target?.dataset?.action === 'close' || event.target?.dataset?.action === 'cancel') close(); if (event.target?.dataset?.action === 'save') save().catch(error => notify(error.message)); });
    doc.body.append(trigger, mask);
    return true;
  }

  function unmount() { trigger?.remove(); mask?.remove(); trigger = null; mask = null; textarea = null; return true; }
  const api = Object.freeze({ status() { return Object.freeze({ key: KEY, ready: !!trigger, open: mask?.dataset.open === 'true' }); }, mount, open, close, unmount, dispose() { disposed = true; unmount(); try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; } });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  if (!mount()) console.warn(`[${KEY}] 无法挂载编辑界面`);
})();
