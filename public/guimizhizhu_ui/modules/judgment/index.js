(() => {
  "use strict";

  const KEY = "cryptLord.judgmentUi";
  const JUDGMENT_STATE_KEY = "cryptLord.judgmentState";
  const HOST_KEY = "cryptLord.afterNativeHost";
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const SVG_DEFS = "<svg style=\"display: none;\" aria-hidden=\"true\">\r\n      <defs>\r\n        <!-- 神秘符文图案 -->\r\n        <symbol id=\"rune-seal\" viewBox=\"0 0 100 100\">\r\n          <circle cx=\"50\" cy=\"50\" r=\"45\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" />\r\n          <path d=\"M50 10 L50 90 M10 50 L90 50\" stroke=\"currentColor\" stroke-width=\"2\" />\r\n          <circle cx=\"50\" cy=\"50\" r=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" />\r\n          <path d=\"M50 30 L65 50 L50 70 L35 50 Z\" fill=\"currentColor\" opacity=\"0.3\" />\r\n        </symbol>\r\n        <!-- 心形图标 (HP/活力) -->\r\n        <symbol id=\"icon-heart\" viewBox=\"0 0 24 24\">\r\n          <path d=\"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z\" fill=\"currentColor\" />\r\n        </symbol>\r\n        <!-- 火焰图标 (灵性/MP) -->\r\n        <symbol id=\"icon-flame\" viewBox=\"0 0 24 24\">\r\n          <path d=\"M12 2c-1.5 4.5-3 6-3 9 0 2.5 1.5 4 3 4s3-1.5 3-4c0-3-1.5-4.5-3-9zm0 18c-3.5 0-6-2.5-6-6 0-4 2.5-6.5 4-9 1.5 2.5 4 5 4 9 0 3.5-2.5 6-6 6z\" fill=\"currentColor\" />\r\n        </symbol>\r\n        <!-- 大脑图标 (理智/SAN) -->\r\n        <symbol id=\"icon-brain\" viewBox=\"0 0 24 24\">\r\n          <path d=\"M12 2C9.5 2 7.5 4 7.5 6.5c0 1-0.5 2-1 2.5-1 1-1.5 2.5-1.5 4 0 2 1 3.5 2.5 4.5 0.5 0.5 1 1 1 2 0 1.5 1 2.5 2.5 2.5h2c1.5 0 2.5-1 2.5-2.5 0-1 0.5-1.5 1-2 1.5-1 2.5-2.5 2.5-4.5 0-1.5-0.5-3-1.5-4-0.5-0.5-1-1.5-1-2.5C16.5 4 14.5 2 12 2z\" fill=\"currentColor\" />\r\n        </symbol>\r\n        <!-- 剑形图标 (物理攻击) -->\r\n        <symbol id=\"icon-sword\" viewBox=\"0 0 24 24\">\r\n          <path d=\"M6.92 5L5 6.92l7.07 7.07-2.12 2.12L8.5 14.66 6.92 16.24l3.54 3.54 1.58-1.58-1.45-1.45 2.12-2.12L20 7.34 18.66 6l-7.29 7.29L6.92 5z\" fill=\"currentColor\" />\r\n        </symbol>\r\n        <!-- 盾牌图标 (防御) -->\r\n        <symbol id=\"icon-shield\" viewBox=\"0 0 24 24\">\r\n          <path d=\"M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z\" fill=\"currentColor\" />\r\n        </symbol>\r\n        <!-- 眼睛图标 (恐惧/感知) -->\r\n        <symbol id=\"icon-eye\" viewBox=\"0 0 24 24\">\r\n          <path d=\"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z\" fill=\"currentColor\" />\r\n        </symbol>\r\n        <!-- SVG滤镜定义 -->\r\n        <!-- 噪点滤镜 -->\r\n        <filter id=\"noise-texture\">\r\n          <feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" result=\"noise\" />\r\n          <feColorMatrix in=\"noise\" type=\"saturate\" values=\"0\" />\r\n          <feBlend in=\"SourceGraphic\" in2=\"noise\" mode=\"multiply\" result=\"blend\" />\r\n          <feComposite in=\"blend\" in2=\"SourceAlpha\" operator=\"in\" />\r\n        </filter>\r\n        <!-- 色差分离滤镜 (大失败用) -->\r\n        <filter id=\"chromatic-aberration\">\r\n          <feOffset in=\"SourceGraphic\" dx=\"2\" dy=\"0\" result=\"red\" />\r\n          <feOffset in=\"SourceGraphic\" dx=\"-2\" dy=\"0\" result=\"blue\" />\r\n          <feBlend in=\"red\" in2=\"SourceGraphic\" mode=\"screen\" result=\"blend1\" />\r\n          <feBlend in=\"blue\" in2=\"blend1\" mode=\"screen\" />\r\n        </filter>\r\n        <!-- 发光滤镜 -->\r\n        <filter id=\"glow-effect\">\r\n          <feGaussianBlur stdDeviation=\"3\" result=\"blur\" />\r\n          <feMerge>\r\n            <feMergeNode in=\"blur\" />\r\n            <feMergeNode in=\"SourceGraphic\" />\r\n          </feMerge>\r\n        </filter>\r\n      </defs>\r\n    </svg>";

  const records = new Map(), subscriptions = [];
  let session = null, observer = null, pending = null, disposed = false, hostDocument = null;
  let symbols = null, simplified = false, serial = 0;

  function ensureSvgSymbols(doc) {
    if (!doc || doc.getElementById("crypt-lord-judgment-svg-symbols")) return;
    const container = doc.createElement("div");
    container.id = "crypt-lord-judgment-svg-symbols";
    container.style.display = "none";
    container.setAttribute("aria-hidden", "true");
    container.innerHTML = SVG_DEFS.replace(/\bid="([^"]+)"/g, 'id="crypt-lord-judgment-$1"');
    (doc.body || doc.documentElement).appendChild(container);
    symbols = container;
  }

  function getHostDocument() {
    const afterNative = root.__stage1Modules?.[HOST_KEY] || root.afterNativeHost;
    const hostDoc = afterNative?.getHost?.()?.document;
    return hostDoc || document;
  }

  function textOf(node) {
    if (node.nodeType === 3) return node.nodeValue || '';
    if (node.nodeType !== 1 || node.matches('script,style,think,thinking,updatevariable,jsonpatch,.mes_reasoning,.crypt-lord-judgment-mount')) return '';
    if (node.tagName === 'BR') return '\n';
    const text = [...node.childNodes].map(textOf).join('');
    return /^(P|DIV|BLOCKQUOTE|PRE|LI|SECTION|H[1-6])$/.test(node.tagName) ? `\n${text}\n` : text;
  }
  function release(record) {
    for (const node of record.hidden) node.removeAttribute('data-crypt-lord-judgment-source');
    record.mount.remove();
    records.delete(record.source);
  }
  function clear() {
    for (const record of [...records.values()]) release(record);
    session?.dispose();
    session = null;
  }
  function service() {
    if (session) return session;
    const state = modules[JUDGMENT_STATE_KEY];
    if (!state?.createSession) throw Error('判定原版规则尚未加载');
    const view = hostDocument.defaultView || window;
    simplified = Boolean(view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      view.innerWidth <= 600 || view.navigator?.hardwareConcurrency <= 4);
    session = state.createSession(view, { simplified });
    return session;
  }
  function control(doc, label, callback) {
    const node = doc.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.addEventListener('click', callback);
    return node;
  }
  function beautifyElement(mesText) {
    if (disposed || !mesText?.isConnected || !hostDocument) return false;
    const message = mesText.closest('.mes[mesid]');
    const messageId = Number(message?.getAttribute('mesid'));
    if (!message || !Number.isInteger(messageId) || messageId < 0 ||
      message.getAttribute('is_user') === 'true' || message.dataset.role === 'user') {
      const previous = records.get(mesText);
      if (previous) release(previous);
      return false;
    }
    const text = textOf(mesText);
    const previous = records.get(mesText);
    const state = modules[JUDGMENT_STATE_KEY];
    if (!state || !text.includes('判定请求')) {
      if (previous) release(previous);
      return false;
    }
    const revision = `${messageId}\0${text}`;
    if (previous?.revision === revision && previous.mount.isConnected) return false;
    const engine = service(), doc = mesText.ownerDocument;
    const logs = state.logs(text);
    const rendered = logs.map((raw, index) => {
      const identity = `${index}\0${raw}`;
      const old = previous?.cards.get(identity);
      return { raw, identity, block: old || engine.render(raw) };
    }).filter(row => row.block);
    if (!rendered.length) {
      if (previous) release(previous);
      return false;
    }
    const mount = doc.createElement('section');
    mount.className = 'crypt-lord-judgment-mount';
    mount.dataset.messageId = String(messageId);
    mount.classList.toggle('simplified-mode', simplified);
    mount.setAttribute('aria-label', `楼层 ${messageId} 判定`);
    const toolbar = doc.createElement('nav');
    toolbar.className = 'crypt-lord-judgment-controls';
    toolbar.setAttribute('aria-label', '判定显示');
    toolbar.append(control(doc, '全部展开', () => rendered.forEach(row => engine.expand(row.block))),
      control(doc, '全部折叠', () => rendered.forEach(row => engine.collapse(row.block))));
    const label = doc.createElement('label'), toggle = doc.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = simplified;
    toggle.addEventListener('change', () => {
      simplified = toggle.checked;
      engine.setSimplified(simplified);
      for (const record of records.values()) {
        record.mount.classList.toggle('simplified-mode', simplified);
        record.mount.querySelector('input[type="checkbox"]').checked = simplified;
      }
    });
    label.append(toggle, doc.createTextNode('简化特效'));
    toolbar.append(label);
    mount.append(toolbar);
    const cards = new Map();
    for (const row of rendered) {
      const block = row.block;
      block.dataset.blockId ||= `crypt-lord-judgment-block-${++serial}`;
      block.querySelector('.judgment-details').id ||= `${block.dataset.blockId}-details`;
      block.querySelector('.judgment-header')?.setAttribute('aria-controls', `${block.dataset.blockId}-details`);
      block.querySelectorAll('use').forEach(use => {
        for (const attr of ['href', 'xlink:href']) {
          const value = use.getAttribute(attr);
          if (value?.startsWith('#') && !value.startsWith('#crypt-lord-judgment-'))
            use.setAttribute(attr, value.replace('#', '#crypt-lord-judgment-'));
        }
      });
      mount.append(block);
      cards.set(row.identity, block);
    }
    if (previous) release(previous);
    mesText.insertAdjacentElement('afterend', mount);
    // Hide only standalone native log containers; mixed narrative/markup stays untouched.
    const hidden = [];
    for (const source of mesText.querySelectorAll('blockquote,pre')) {
      if (source.parentElement.closest('blockquote,pre')) continue;
      const raw = textOf(source).trim().replace(/^>\s*/gm, '');
      if (!/^(?:【判定请求\s*\||判定请求\s*\|)/.test(raw) || source.querySelector('img,video,audio,iframe')) continue;
      const last = raw.split('\n').map(line => line.trim()).filter(Boolean).at(-1);
      if (!/^(?:【(?:对抗)?判定结果[：:][^】]+】|.*<[^<>]+[：:]\s*[+-]?\d+>)$/.test(last)) continue;
      const parts = state.logs(raw);
      if (parts.length && parts.every(part => engine.complete(part)) &&
        !source.hasAttribute('data-crypt-lord-judgment-source')) {
        source.setAttribute('data-crypt-lord-judgment-source', '');
        hidden.push(source);
      }
    }
    records.set(mesText, { source: mesText, revision, mount, cards, hidden });
    return true;
  }

  function scanAll() {
    if (disposed) return;
    const doc = getHostDocument();
    if (doc !== hostDocument) {
      clear();
      observer?.disconnect();
      symbols?.remove();
      symbols = null;
      hostDocument = doc;
      observer = null;
      observe();
    }
    ensureSvgSymbols(doc);
    for (const record of [...records.values()])
      if (!record.source.isConnected || !record.mount.isConnected) release(record);
    const messageElements = Array.from(doc.querySelectorAll?.("#chat .mes_text, #chat .custom-mes_text") || []);
    for (const element of messageElements) {
      try { beautifyElement(element); }
      catch (error) { console.warn(`[${KEY}] 判定展示失败，保留原文`, error); }
    }
  }
  function schedule() {
    if (disposed || pending !== null) return;
    pending = window.setTimeout(() => { pending = null; scanAll(); }, 40);
  }
  function observe() {
    if (observer || !hostDocument?.body) return;
    const Observer = hostDocument.defaultView?.MutationObserver || window.MutationObserver;
    observer = new Observer(changes => {
      if (changes.some(change => {
        const element = change.target.nodeType === 1 ? change.target : change.target.parentElement;
        if (element?.closest('.crypt-lord-judgment-mount,#crypt-lord-judgment-svg-symbols')) return false;
        if (change.type === 'attributes') return true;
        if (change.type === 'characterData') return Boolean(element?.closest('#chat'));
        return [...change.addedNodes, ...change.removedNodes].some(node =>
          !(node.nodeType === 1 && node.matches('.crypt-lord-judgment-mount,#crypt-lord-judgment-svg-symbols')) &&
          (element?.closest('#chat') || node.nodeType === 1 && (node.id === 'chat' || node.querySelector('#chat'))));
      })) schedule();
    });
    observer.observe(hostDocument.body, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['mesid', 'is_user', 'data-role'] });
  }
  function mount() {
    if (disposed) return { key: KEY, ready: false };
    const doc = getHostDocument();
    hostDocument ||= doc;
    ensureSvgSymbols(doc);
    scanAll();
    observe();
    if (!subscriptions.length) {
      const host = modules[HOST_KEY], events = host?.tavernEvents?.() || {};
      for (const name of ['MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MESSAGE_DELETED', 'CHAT_CHANGED']) {
        if (!events[name]) continue;
        const handle = host.bindEvent(events[name], () => {
          if (name === 'CHAT_CHANGED') clear();
          schedule();
        });
        if (handle) subscriptions.push(handle);
      }
    }
    return { key: KEY, ready: true };
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed && Boolean(observer), floors: records.size,
      cards: [...records.values()].reduce((sum, record) => sum + record.cards.size, 0), simplified }); },
    mount,
    scanAll,
    beautifyElement,
    dispose() {
      disposed = true;
      if (pending !== null) window.clearTimeout(pending);
      pending = null;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      subscriptions.forEach(handle => handle.stop?.());
      subscriptions.length = 0;
      clear();
      symbols?.remove();
      symbols = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    }
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  try { api.mount(); } catch (e) { /* host mount deferred */ }
})();
