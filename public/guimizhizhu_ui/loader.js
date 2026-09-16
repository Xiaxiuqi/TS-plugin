(() => {
  'use strict';

  const VERSION = 'stage1-1.0.0';
  const PUBLIC_BASE_URL = 'https://ts-plugin.pages.dev/guimizhizhu_ui/';
  const RESOURCE_TIMEOUT_MS = 15000;
  const LOG_PREFIX = `[CryptLordLoader:${VERSION}]`;
  const root = (window.cryptLord = window.cryptLord || {});

  // 同一轮加载只允许一个执行者；失败后重新执行 loader.js 会创建全新批次与 ready Promise。
  if (root.loader?.status === 'loading' || root.loader?.status === 'ready') return;

  function getDebug() {
    const debug = root.debug;
    return debug && typeof debug.event === 'function' ? debug : null;
  }

  function debugEvent(category, action, details, level = 'info') {
    try {
      getDebug()?.event(category, 'cryptLord.loader', action, details, level);
    } catch {
      // Diagnostics must never affect resource loading.
    }
  }

  function detectBaseUrl() {
    const current = document.currentScript?.src;
    const discovered = Array.from(document.scripts)
      .map(script => script.src)
      .find(src => /\/guimizhizhu_ui\/loader\.js(?:[?#]|$)/.test(src));
    try {
      return new URL('./', current || discovered || PUBLIC_BASE_URL).href;
    } catch {
      return PUBLIC_BASE_URL;
    }
  }

  function validateMethods(label, api, methods) {
    if (!api || !methods.every(method => typeof api[method] === 'function')) {
      throw new Error(`${label} 未注册预期API形状(${methods.join(', ')})`);
    }
    return api;
  }

  const baseUrl = detectBaseUrl();
  const cssResources = [
    'shared/styles.css',
    'modules/floating-variable-editor/style.css',
    'modules/judgment-beautify/style.css',
  ];
  const scriptResources = [
    {
      path: 'shared/contract.js',
      key: 'contract',
      validate: api =>
        validateMethods('window.cryptLord.contract', api, [
          'initializeGlobal',
          'waitGlobalInitialized',
          'releaseGlobal',
        ]),
    },
    {
      path: 'shared/debug.js',
      key: 'cryptLord.debug',
      validate: api => {
        validateMethods('cryptLord.debug', api, ['isEnabled', 'setEnabled', 'event', 'status', 'snapshot']);
        return validateMethods('cryptLord.debug.panel', api.panel, ['mount', 'unmount', 'toggle', 'copy', 'clear']);
      },
    },
    {
      path: 'modules/native-floor/index.js',
      key: 'cryptLord.nativeFloor',
      validate: api => validateMethods('cryptLord.nativeFloor', api, ['status', 'submitNativeTurn']),
    },
    {
      path: 'modules/input-adapter/index.js',
      key: 'cryptLord.inputAdapter',
      validate: api => validateMethods('cryptLord.inputAdapter', api, ['status', 'submit']),
    },
    {
      path: 'modules/floating-variable-editor/index.js',
      key: 'cryptLord.floatingVariableEditor',
      validate: api =>
        validateMethods('cryptLord.floatingVariableEditor', api, ['status', 'isReady', 'mount', 'unmount']),
    },
    {
      path: 'modules/judgment-beautify/index.js',
      key: 'cryptLord.judgmentBeautify',
      validate: api => validateMethods('cryptLord.judgmentBeautify', api, ['status', 'isReady', 'decorate']),
    },
  ];
  const cssPromises = new Map();
  const scriptPromises = new Map();
  const batch = {
    cssMapEntries: new Set(),
    scriptMapEntries: new Set(),
    styles: [],
    scripts: [],
    controllers: new Set(),
    registeredApis: [],
    contractAdded: null,
  };

  function resourceUrl(path) {
    return new URL(path, baseUrl).href;
  }

  function resourceError(stage, url, error) {
    const detail = error instanceof Error ? error.message : String(error);
    return new Error(`[${stage}] ${url}; ${detail}`);
  }

  function getResourceApi(resource) {
    if (resource.key === 'contract') return root.contract;
    if (resource.key === 'cryptLord.debug') return root.debug;
    return root.__stage1Modules?.[resource.key];
  }

  function validateResource(resource) {
    return resource.validate(getResourceApi(resource));
  }

  function loadCss(path) {
    const url = resourceUrl(path);
    debugEvent('resource', 'css-load-start', path);
    if (cssPromises.has(url)) return cssPromises.get(url);

    const existing = Array.from(document.querySelectorAll('style[data-crypt-lord-css]')).find(
      style => style.dataset.cryptLordCss === url && style.dataset.cryptLordLoadState === 'loaded',
    );
    if (existing) return Promise.resolve(existing);

    const controller = new AbortController();
    batch.controllers.add(controller);
    batch.cssMapEntries.add(url);
    let timer = null;
    let timedOut = false;
    let injectedStyle = null;

    const promise = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error(`加载超时(${RESOURCE_TIMEOUT_MS}ms)`));
      }, RESOURCE_TIMEOUT_MS);

      fetch(url, { signal: controller.signal }).then(resolve, reject);
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(cssText => {
        const style = document.createElement('style');
        style.dataset.cryptLordCss = url;
        style.dataset.cryptLordLoadState = 'loaded';
        style.textContent = `${cssText}\n/*# sourceURL=${url} */`;
        (document.head || document.documentElement).appendChild(style);
        injectedStyle = style;
        batch.styles.push(style);
        debugEvent('resource', 'css-load-success', path);
        return style;
      })
      .catch(error => {
        if (!controller.signal.aborted) controller.abort();
        if (injectedStyle) {
          injectedStyle.remove();
          const index = batch.styles.indexOf(injectedStyle);
          if (index >= 0) batch.styles.splice(index, 1);
        }
        cssPromises.delete(url);
        const stage = timedOut ? 'CSS fetch timeout' : 'CSS fetch';
        debugEvent('failure', 'css-load-failure', `${path}: ${error?.message || error}`, 'error');
        throw resourceError(stage, url, error);
      })
      .finally(() => {
        if (timer !== null) clearTimeout(timer);
        batch.controllers.delete(controller);
      });

    cssPromises.set(url, promise);
    return promise;
  }

  function loadScript(resource) {
    const url = resourceUrl(resource.path);
    debugEvent('resource', 'script-load-start', resource.path);
    if (scriptPromises.has(url)) return scriptPromises.get(url);

    const found = Array.from(document.querySelectorAll('script[data-crypt-lord-script]')).find(
      script => script.dataset.cryptLordScript === url,
    );
    if (found?.dataset.cryptLordLoadState === 'failed') found.remove();

    if (found?.isConnected && found.dataset.cryptLordLoadState === 'loaded') {
      try {
        validateResource(resource);
        return Promise.resolve(found);
      } catch (error) {
        return Promise.reject(resourceError('模块注册验证', url, error));
      }
    }

    const beforeApi = getResourceApi(resource);
    batch.scriptMapEntries.add(url);
    const promise = new Promise((resolve, reject) => {
      const script = found?.isConnected ? found : document.createElement('script');
      const createdByBatch = !found?.isConnected;
      let recordedApi = null;
      let settled = false;
      let timer = null;
      if (createdByBatch) {
        batch.scripts.push(script);
      }

      const recordNewApi = () => {
        const api = getResourceApi(resource);
        if (beforeApi !== undefined || api === undefined || recordedApi === api) return api;
        recordedApi = api;
        if (resource.key === 'contract') {
          batch.contractAdded = api;
        } else {
          batch.registeredApis.push({ key: resource.key, api });
        }
        return api;
      };
      const cleanupHandlers = () => {
        if (timer !== null) clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        window.removeEventListener('error', onWindowError);
      };
      const fail = (stage, error) => {
        if (settled) return;
        recordNewApi();
        settled = true;
        cleanupHandlers();
        if (createdByBatch) script.dataset.cryptLordLoadState = 'failed';
        debugEvent('failure', 'script-load-failure', `${resource.path}: ${error?.message || error}`, 'error');
        reject(resourceError(stage, url, error));
      };
      const onWindowError = event => {
        if (event?.filename !== url) return;
        fail('动态模块script执行', event.error || new Error(event.message || '脚本执行时抛出异常'));
      };
      const succeed = () => {
        if (settled) return;
        try {
          validateResource(resource);
        } catch (error) {
          fail('模块注册验证', error);
          return;
        }
        recordNewApi();
        settled = true;
        cleanupHandlers();
        script.dataset.cryptLordLoadState = 'loaded';
        debugEvent('resource', 'script-load-success', `${resource.path}: 资源已注册`);
        resolve(script);
      };

      timer = setTimeout(
        () => fail('动态模块script超时', new Error(`加载超时(${RESOURCE_TIMEOUT_MS}ms)`)),
        RESOURCE_TIMEOUT_MS,
      );
      script.onload = succeed;
      script.onerror = () => fail('动态模块script加载', new Error('网络或脚本执行失败'));
      window.addEventListener('error', onWindowError);
      script.src = url;
      script.async = false;
      script.dataset.cryptLordScript = url;
      script.dataset.cryptLordLoadState = 'loading';
      if (!script.isConnected) (document.head || document.documentElement).appendChild(script);
    }).catch(error => {
      scriptPromises.delete(url);
      throw error;
    });

    scriptPromises.set(url, promise);
    return promise;
  }

  async function rollback(originalError) {
    debugEvent('failure', 'rollback-start', originalError?.message || originalError, 'error');
    const cleanupErrors = [];
    const capture = operation => {
      try {
        operation();
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : String(error));
      }
    };

    batch.controllers.forEach(controller => capture(() => controller.abort()));
    batch.controllers.clear();

    for (let index = batch.registeredApis.length - 1; index >= 0; index -= 1) {
      const { key, api } = batch.registeredApis[index];
      capture(() => {
        const contract = root.contract;
        if (!contract || typeof contract.releaseGlobal !== 'function') {
          throw new Error(`无法释放本轮API，契约不可用: ${key}`);
        }
        contract.releaseGlobal(key, api);
      });
      capture(() => {
        if (key === 'cryptLord.debug' && typeof api.dispose === 'function') api.dispose();
      });
      capture(() => { if (key === 'cryptLord.debug' && root.debug === api) delete root.debug; });
      capture(() => {
        if (root.__stage1Modules?.[key] === api) delete root.__stage1Modules[key];
      });
    }

    capture(() => {
      if (batch.contractAdded && root.contract === batch.contractAdded) delete root.contract;
    });
    for (let index = batch.scripts.length - 1; index >= 0; index -= 1) {
      capture(() => batch.scripts[index].remove());
    }
    for (let index = batch.styles.length - 1; index >= 0; index -= 1) {
      capture(() => batch.styles[index].remove());
    }
    batch.scriptMapEntries.forEach(url => scriptPromises.delete(url));
    batch.cssMapEntries.forEach(url => cssPromises.delete(url));

    const error = originalError instanceof Error ? originalError : new Error(String(originalError));
    if (cleanupErrors.length > 0) error.message += `; [批次清理异常] ${cleanupErrors.join(' | ')}`;
    debugEvent('failure', 'rollback-complete', error.message, 'error');
    return error;
  }

  const state = {
    version: VERSION,
    publicBaseUrl: PUBLIC_BASE_URL,
    baseUrl,
    status: 'loading',
    error: '',
    ready: null,
  };
  root.loader = state;

  state.ready = (async () => {
    debugEvent('lifecycle', 'loading', '阶段1资源加载开始');
    try {
      // 顺序加载，确保失败后没有仍在后台完成并晚到注入的同批资源。
      for (const path of cssResources) await loadCss(path);
      for (const resource of scriptResources) await loadScript(resource);
      state.status = 'ready';
      debugEvent(
        'lifecycle',
        'resources-ready',
        '资源已注册；不等于业务功能已挂载。当前限制：无 nativeFloorBridge、无消息/MVU监听、浮动编辑器与判定美化未迁移',
        'warn',
      );
      console.info(LOG_PREFIX, '契约、调试设施与四个阶段1模块已按顺序加载并通过注册验证；业务功能挂载状态请查看调试面板。');
      return state;
    } catch (error) {
      const diagnosed = await rollback(error);
      state.status = 'failed';
      state.error = diagnosed.message;
      debugEvent('failure', 'loader-failed', diagnosed.message, 'error');
      console.error(LOG_PREFIX, diagnosed);
      throw diagnosed;
    }
  })();
})();
