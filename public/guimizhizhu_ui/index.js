(() => {
  'use strict';

  const VERSION = 'stage1-1.1.0';
  const PUBLIC_BASE_URL = 'https://ts-plugin.pages.dev/guimizhizhu_ui/';
  const RESOURCE_TIMEOUT_MS = 15000;
  const LOG_PREFIX = `[CryptLord:${VERSION}]`;
  const INDEX_STATE_KEY = '__stage1Index';

  const root = (window.cryptLord = window.cryptLord || {});
  const existingState = root[INDEX_STATE_KEY];
  if (existingState?.status === 'loading' || existingState?.status === 'ready' || existingState?.status === 'disposing') {
    console.info(LOG_PREFIX, '入口已加载，跳过重复启动。');
    return;
  }

  function getDebug() {
    const debug = root.debug;
    return debug && typeof debug.event === 'function' ? debug : null;
  }

  function debugEvent(category, action, details, level = 'info') {
    try {
      getDebug()?.event(category, 'cryptLord.index', action, details, level);
    } catch {
      // Entry startup must not depend on diagnostics.
    }
  }

  function normalizeBaseUrl(value) {
    try {
      return new URL('./', value).href;
    } catch {
      return PUBLIC_BASE_URL;
    }
  }

  function detectSelfScript() {
    if (document.currentScript?.src) return document.currentScript;
    return Array.from(document.scripts).find(script => /\/guimizhizhu_ui\/index\.js(?:[?#]|$)/.test(script.src)) || null;
  }

  function toError(error, stage, url) {
    const detail = error instanceof Error ? error.message : String(error);
    return new Error(`[${stage}] ${url}; ${detail}`);
  }

  const selfScript = detectSelfScript();
  const baseUrl = selfScript?.src ? normalizeBaseUrl(selfScript.src) : PUBLIC_BASE_URL;
  const loaderUrl = new URL('loader.js', baseUrl).href;
  const instanceId = `stage1_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const state = {
    version: VERSION,
    publicBaseUrl: PUBLIC_BASE_URL,
    baseUrl,
    instanceId,
    status: 'loading',
    error: '',
    ready: null,
    disposePromise: null,
  };
  root[INDEX_STATE_KEY] = state;

  let loaderScript = null;
  let cancelLoaderWait = null;
  let pagehideHandler = null;

  function status() {
    return Object.freeze({
      version: state.version,
      instanceId: state.instanceId,
      status: state.status,
      error: state.error,
      loader: root.loader?.instanceId === instanceId ? root.loader.status : null,
    });
  }

  function dispose(reason = 'manual') {
    if (state.disposePromise) return state.disposePromise;
    if (state.status === 'disposed') return Promise.resolve(true);
    state.status = 'disposing';
    cancelLoaderWait?.(new DOMException('入口已释放', 'AbortError'));
    if (pagehideHandler) window.removeEventListener?.('pagehide', pagehideHandler);
    pagehideHandler = null;
    state.disposePromise = Promise.resolve()
      .then(() => {
        const loader = root.loader;
        if (loader?.instanceId === instanceId && typeof loader.dispose === 'function') return loader.dispose(reason);
        return true;
      })
      .catch(error => {
        state.error = error instanceof Error ? error.message : String(error);
        console.error(LOG_PREFIX, '清理出现异常', error);
        return false;
      })
      .then(result => {
        try {
          if (loaderScript?.dataset?.cryptLordInstance === instanceId) loaderScript.remove();
        } catch {
          // Best-effort removal of this instance's loader script.
        }
        if (reason === 'reset-preferences') {
          try { window.localStorage?.removeItem('cryptLord.debug.enabled'); } catch { /* unavailable storage */ }
        }
        state.status = 'disposed';
        if (root[INDEX_STATE_KEY] === state) root[INDEX_STATE_KEY] = state;
        return result !== false;
      });
    return state.disposePromise;
  }

  const stage1Api = Object.freeze({ dispose, status });
  root.stage1 = stage1Api;

  pagehideHandler = () => { void dispose('pagehide'); };
  window.addEventListener?.('pagehide', pagehideHandler, { once: true });

  function waitForLoaderScript() {
    debugEvent('lifecycle', 'loader-script-wait', loaderUrl);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      loaderScript = script;
      let settled = false;
      const cleanupHandlers = () => {
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (cancelLoaderWait === cancel) cancelLoaderWait = null;
      };
      const cancel = error => {
        if (settled) return;
        settled = true;
        cleanupHandlers();
        reject(error?.name === 'AbortError' ? error : new DOMException('入口已释放', 'AbortError'));
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        cleanupHandlers();
        if (state.status === 'disposing' || state.status === 'disposed') {
          reject(new DOMException('入口已释放', 'AbortError'));
          return;
        }
        script.dataset.cryptLordLoadState = 'failed';
        script.remove();
        reject(toError(error, '入口loader script', loaderUrl));
      };
      const succeed = () => {
        if (settled) return;
        if (state.status === 'disposing' || state.status === 'disposed') {
          cancel(new DOMException('入口已释放', 'AbortError'));
          return;
        }
        settled = true;
        cleanupHandlers();
        script.dataset.cryptLordLoadState = 'loaded';
        resolve(script);
      };
      const timer = setTimeout(() => fail(new Error(`加载超时(${RESOURCE_TIMEOUT_MS}ms)`)), RESOURCE_TIMEOUT_MS);
      cancelLoaderWait = cancel;
      script.onload = succeed;
      script.onerror = () => fail(new Error('网络或脚本执行失败'));
      script.src = loaderUrl;
      script.async = false;
      script.dataset.cryptLordLoader = loaderUrl;
      script.dataset.cryptLordInstance = instanceId;
      script.dataset.cryptLordLoadState = 'loading';
      (document.head || document.documentElement).appendChild(script);
    });
  }

  state.ready = waitForLoaderScript()
    .then(() => {
      if (state.status === 'disposing' || state.status === 'disposed') throw new Error('入口已开始清理');
      if (!root.loader?.ready || root.loader.instanceId !== instanceId || typeof root.loader.ready.then !== 'function') {
        throw new Error(`[等待loader ready] ${loaderUrl}; loader未公开当前实例的有效ready Promise`);
      }
      return root.loader.ready;
    })
    .then(() => {
      if (state.status === 'disposing' || state.status === 'disposed') return state;
      if (root.loader?.status !== 'ready' || root.loader.instanceId !== instanceId) {
        throw new Error(`[等待loader ready] ${loaderUrl}; loader状态不是当前实例ready`);
      }
      state.status = 'ready';
      console.info(LOG_PREFIX, '阶段1资源已注册；这不表示业务功能已全部挂载。');
      return state;
    })
    .catch(error => {
      if (state.status === 'disposing' || state.status === 'disposed') return state;
      const diagnosed = toError(error, '阶段1入口', loaderUrl);
      state.status = 'failed';
      state.error = diagnosed.message;
      console.error(LOG_PREFIX, diagnosed);
      throw diagnosed;
    });
})();
