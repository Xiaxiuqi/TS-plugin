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

  let beautifier = null;
  let observer = null;
  let disposed = false;
  const processedElements = new WeakSet();

  function ensureSvgSymbols(doc) {
    if (!doc || doc.getElementById("rune-seal")) return;
    const container = doc.createElement("div");
    container.id = "crypt-lord-judgment-svg-symbols";
    container.style.display = "none";
    container.setAttribute("aria-hidden", "true");
    container.innerHTML = SVG_DEFS;
    (doc.body || doc.documentElement).appendChild(container);
  }

  function getHostDocument() {
    const afterNative = root.__stage1Modules?.[HOST_KEY] || root.afterNativeHost;
    const hostDoc = afterNative?.getHost?.()?.document;
    return hostDoc || document;
  }

  function beautifyElement(mesText) {
    if (!mesText || processedElements.has(mesText)) return false;
    const text = mesText.textContent || "";
    if (!text.includes("【判定请求") && !text.includes("判定请求 |")) return false;

    ensureSvgSymbols(mesText.ownerDocument || document);

    if (!beautifier) {
      const judgmentState = root.__stage1Modules?.[JUDGMENT_STATE_KEY] || root.judgmentState;
      if (judgmentState?.createBeautifier) {
        beautifier = judgmentState.createBeautifier();
        window.judgmentBeautifierInstance = beautifier;
      }
    }
    if (!beautifier) return false;

    const requestMarkerPattern = /(?:【判定请求\s*\|[^】]+】|判定请求\s*\|[^>\n]+>)[\s\S]*?(?=(?:【判定请求|判定请求\s*\|)|$)/g;
    const matches = text.match(requestMarkerPattern);
    if (!matches || !matches.length) return false;

    let modified = false;
    matches.forEach(rawText => {
      // Check if complete
      if (!beautifier.isJudgmentComplete(rawText)) return;

      const judgmentKey = beautifier.getJudgmentKey(rawText);
      if (!judgmentKey) return;

      // Render block
      const data = beautifier.parser.parse(rawText);
      if (!data) return;

      const judgmentBlock = beautifier.renderer.render(data, null);
      if (!judgmentBlock) return;

      beautifier.interactor.initialize(judgmentBlock);

      // Create collapsible wrapper for raw log or insert judgment block
      const mountContainer = mesText.ownerDocument.createElement("div");
      mountContainer.className = "crypt-lord-judgment-mount";
      mountContainer.style.margin = "12px 0 8px";
      mountContainer.appendChild(judgmentBlock);

      // Append into message container or wrap
      mesText.appendChild(mountContainer);
      modified = true;
    });

    if (modified) {
      processedElements.add(mesText);
    }
    return modified;
  }

  function scanAll() {
    if (disposed) return;
    const doc = getHostDocument();
    const messageElements = Array.from(doc.querySelectorAll?.(".mes_text, .custom-mes_text") || []);
    messageElements.forEach(el => beautifyElement(el));
  }

  function mount() {
    if (disposed) return { key: KEY, ready: false };
    const doc = getHostDocument();
    ensureSvgSymbols(doc);

    const judgmentState = root.__stage1Modules?.[JUDGMENT_STATE_KEY] || root.judgmentState;
    if (judgmentState?.createBeautifier) {
      beautifier = judgmentState.createBeautifier();
      window.judgmentBeautifierInstance = beautifier;
    }

    scanAll();

    const chat = doc.querySelector?.("#chat");
    if (chat && typeof MutationObserver === "function" && !observer) {
      observer = new MutationObserver(() => {
        if (!disposed) scanAll();
      });
      observer.observe(chat, { childList: true, subtree: true });
    }

    return { key: KEY, ready: true };
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed && Boolean(beautifier) }); },
    mount,
    scanAll,
    beautifyElement,
    dispose() {
      disposed = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      beautifier = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    }
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  try { api.mount(); } catch (e) { /* host mount deferred */ }
})();
