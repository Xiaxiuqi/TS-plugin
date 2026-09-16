(() => {
  'use strict';

  const VERSION = 'stage1-1.0.0';
  const PUBLIC_BASE_URL = 'https://ts-plugin.pages.dev/guimizhizhu_ui/';
  const RESOURCE_TIMEOUT_MS = 15000;
  const LOG_PREFIX = `[CryptLord:${VERSION}]`;
  const INDEX_STATE_KEY = '__stage1Index';

  const root = (window.cryptLord = window.cryptLord || {});
  const existingState = root[INDEX_STATE_KEY];
  if (existingState?.status === 'loading' || existingState?.status === 'ready') {
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
  const state = {
    version: VERSION,
    publicBaseUrl: PUBLIC_BASE_URL,
    baseUrl,
    status: 'loading',
    error: '',
    ready: null,
  };
  root[INDEX_STATE_KEY] = state;

  function waitForLoaderScript() {
    const found = Array.from(document.scripts).find(script => script.dataset.cryptLordLoader === loaderUrl);
    debugEvent('lifecycle', 'loader-script-wait', loaderUrl);
    if (found?.dataset.cryptLordLoadState === 'failed') found.remove();

    return new Promise((resolve, reject) => {
      const loaderScript = found?.isConnected ? found : document.createElement('script');
      let settled = false;
      const cleanupHandlers = () => {
        clearTimeout(timer);
        loaderScript.onload = null;
        loaderScript.onerror = null;
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        cleanupHandlers();
        loaderScript.dataset.cryptLordLoadState = 'failed';
        loaderScript.remove();
        debugEvent('failure', 'loader-script-failure', error?.message || error, 'error');
        reject(toError(error, '入口loader script', loaderUrl));
      };
      const succeed = () => {
        if (settled) return;
        settled = true;
        cleanupHandlers();
        loaderScript.dataset.cryptLordLoadState = 'loaded';
        debugEvent('lifecycle', 'loader-script-loaded', 'loader.js 已执行，等待资源注册');
        resolve(loaderScript);
      };
      const timer = setTimeout(
        () => fail(new Error(`加载超时(${RESOURCE_TIMEOUT_MS}ms)`)),
        RESOURCE_TIMEOUT_MS,
      );

      loaderScript.onload = succeed;
      loaderScript.onerror = () => fail(new Error('网络或脚本执行失败'));
      if (loaderScript.dataset.cryptLordLoadState === 'loaded') {
        succeed();
        return;
      }
      loaderScript.src = loaderUrl;
      loaderScript.async = false;
      loaderScript.dataset.cryptLordLoader = loaderUrl;
      loaderScript.dataset.cryptLordLoadState = 'loading';
      if (!loaderScript.isConnected) (document.head || document.documentElement).appendChild(loaderScript);
    });
  }

  state.ready = waitForLoaderScript()
    .then(() => {
      if (!root.loader?.ready || typeof root.loader.ready.then !== 'function') {
        throw new Error(`[等待loader ready] ${loaderUrl}; loader未公开有效ready Promise`);
      }
      return root.loader.ready;
    })
    .then(() => {
      if (root.loader?.status !== 'ready') {
        throw new Error(`[等待loader ready] ${loaderUrl}; loader状态不是ready`);
      }
      state.status = 'ready';
      debugEvent(
        'lifecycle',
        'entry-ready',
        '资源已注册；业务功能未全部挂载。无消息/MVU监听，浮动编辑器与判定美化未迁移',
        'warn',
      );
      console.info(LOG_PREFIX, '阶段1资源已注册；这不表示业务功能已全部挂载。');
      return state;
    })
    .catch(error => {
      const diagnosed = toError(error, '阶段1入口', loaderUrl);
      const loaderScript = Array.from(document.scripts).find(
        script => script.dataset.cryptLordLoader === loaderUrl,
      );
      if (loaderScript) {
        loaderScript.dataset.cryptLordLoadState = 'failed';
        loaderScript.remove();
      }
      state.status = 'failed';
      state.error = diagnosed.message;
      debugEvent('failure', 'entry-failed', diagnosed.message, 'error');
      console.error(LOG_PREFIX, diagnosed);
      throw diagnosed;
    });
})();
