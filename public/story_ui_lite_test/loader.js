(() => {
  const GLOBAL_KEY = 'StoryRegexUI';
  const LOADER_FLAG = '__storyRegexUiLoaderReady_lite_test';
  const LOADER_ENV = 'lite_test';
  const LOADER_VERSION = 'lite_test-0.1.4';

  const existingUi = window[GLOBAL_KEY];
  const existingLoaderState = existingUi?.loaderState;
  const hasUnownedRuntime = Boolean(
    existingUi &&
      ((existingLoaderState?.env && existingLoaderState.env !== LOADER_ENV) ||
        (!existingLoaderState?.env && (existingUi.scanner || existingUi.registry || existingUi.theme))),
  );
  if (hasUnownedRuntime) {
    console.warn('[StoryRegexUI] 检测到其他环境的共享运行时，精简测试版 loader 已停止启动。');
    return;
  }

  if (window[LOADER_FLAG]) {
    const loaderState = existingLoaderState;
    const ownsLoaderState = loaderState?.env === LOADER_ENV && loaderState?.version === LOADER_VERSION;
    if (ownsLoaderState && loaderState.status === 'ready') {
      window[GLOBAL_KEY]?.scanner?.scan?.();
      return;
    }
    if (ownsLoaderState && loaderState.status === 'loading') return;
    if (!ownsLoaderState && loaderState) return;
    window[LOADER_FLAG] = false;
  }

  window[LOADER_FLAG] = true;
  const ui = (window[GLOBAL_KEY] = window[GLOBAL_KEY] || {});
  const cycleId = `${LOADER_VERSION}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const abortController = typeof AbortController === 'function' ? new AbortController() : null;
  const activeResources = new Set();
  let cancelled = false;
  const loaderState = {
    env: LOADER_ENV,
    version: LOADER_VERSION,
    cycleId,
    status: 'loading',
    error: '',
  };
  ui.loaderState = loaderState;

  const currentScript = document.currentScript;
  const baseUrl = (() => {
    if (currentScript?.src) {
      return new URL('.', currentScript.src).href;
    }

    const fallback = Array.from(document.scripts)
      .map(script => script.src)
      .find(src => src.includes('/story_ui_lite_test/loader.js'));

    return fallback ? new URL('.', fallback).href : './';
  })();

  const state = {
    baseUrl,
    version: LOADER_VERSION,
    loadedCss: new Set(),
    loadedScripts: new Set(),
    modules: [
      {
        id: 'bp-panel-newvars',
        version: '1.0.0-lite_test-dual-panel',
        css: 'modules/bp-panel-newvars/style.css',
        script: 'modules/bp-panel-newvars/index.js',
      },
      {
        id: 'world-log',
        version: '0.2.0-lite_test-flexible-sections',
        css: 'modules/world-log/style.css',
        script: 'modules/world-log/index.js',
      },
      {
        id: 'manager-ui',
        css: 'modules/manager-ui/style.css',
        script: 'modules/manager-ui/index.js',
      },
      {
        id: 'db-status-bar',
        version: '1.1.0-lite_test',
        css: 'modules/db-status-bar/style.css',
        scripts: ['modules/db-status-bar/data.js', 'modules/db-status-bar/index.js'],
      },
      {
        id: 'db-map',
        version: '1.1.0-lite_test',
        css: 'modules/db-map/style.css',
        scripts: ['modules/db-map/data.js', 'modules/db-map/index.js'],
      },
    ],
  };

  function isCurrentCycle() {
    return !cancelled && window[LOADER_FLAG] === true && window[GLOBAL_KEY] === ui && ui.loaderState === loaderState;
  }

  function createCycleError(reason = 'loader 启动周期已取消') {
    const error = new Error(reason);
    error.name = 'AbortError';
    return error;
  }

  function assertCurrentCycle() {
    if (!isCurrentCycle()) throw createCycleError();
  }

  function cancel(reason = 'loader 启动周期已由管理端终止') {
    if (cancelled) return;
    const ownedAtCancellation = window[GLOBAL_KEY] === ui && ui.loaderState === loaderState;
    cancelled = true;
    abortController?.abort?.();
    activeResources.forEach(resource => {
      if (resource?.dataset?.storyUiLoadState === 'loading') resource.remove();
    });
    activeResources.clear();
    if (ownedAtCancellation) {
      loaderState.status = 'cancelled';
      loaderState.error = reason;
      window[LOADER_FLAG] = false;
    }
  }

  loaderState.cancel = cancel;

  function removeResourceCopies(attribute, url) {
    document.querySelectorAll(`[${attribute}]`).forEach(resource => {
      if (resource.getAttribute(attribute) === url) resource.remove();
    });
  }

  function toUrl(path) {
    const url = new URL(path, state.baseUrl);
    if (!url.searchParams.has('v')) {
      url.searchParams.set('v', state.version);
    }
    return url.href;
  }

  function findLoadedCss(href) {
    const escapedHref =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(href) : href.replace(/"/g, '\\"');
    const resource =
      document.querySelector(`style[data-story-ui-css="${escapedHref}"]`) ||
      document.querySelector(`link[data-story-ui-css="${escapedHref}"]`);
    if (!resource?.isConnected || resource.dataset?.storyUiLoadState !== 'loaded') return null;
    if (resource.tagName === 'STYLE') {
      return resource.textContent?.trim() ? resource : null;
    }
    return resource.sheet ? resource : null;
  }

  function isScriptContractReady(path) {
    if (path === 'core/dom.js') return typeof ui.dom?.escapeHtml === 'function';
    if (path === 'core/registry.js') return typeof ui.registry?.register === 'function' && typeof ui.registry?.find === 'function';
    if (path === 'core/theme.js') return typeof ui.theme?.init === 'function' && typeof ui.theme?.setTheme === 'function';
    if (path === 'core/scanner.js') return typeof ui.scanner?.init === 'function' && typeof ui.scanner?.scan === 'function';
    if (path === 'modules/manager-ui/index.js') return typeof window.JJKSStoryUiManagerView?.buildPanelHtml === 'function';
    if (path === 'modules/db-status-bar/data.js') return typeof ui.dbStatusData?.parseTables === 'function';
    if (path === 'modules/db-map/data.js') return typeof ui.dbMapData?.parseTables === 'function';
    const moduleDef = state.modules.find(item => item.script === path || item.scripts?.includes(path));
    return moduleDef ? ui.registry?.find?.(moduleDef.id)?.version === moduleDef.version : false;
  }

  async function loadCss(path) {
    assertCurrentCycle();
    const href = toUrl(path);
    if (state.loadedCss.has(href) || findLoadedCss(href)) {
      state.loadedCss.add(href);
      return;
    }
    removeResourceCopies('data-story-ui-css', href);

    try {
      const response = await fetch(href, { cache: 'no-store', mode: 'cors', signal: abortController?.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const cssText = await response.text();
      assertCurrentCycle();
      const style = document.createElement('style');
      style.dataset.storyUiCss = href;
      style.dataset.storyUiLoadState = 'loaded';
      style.dataset.storyUiLoaderCycle = cycleId;
      style.dataset.storyUiCssInline = 'true';
      style.textContent = `\n/* ${href} */\n${cssText}`;
      document.head.appendChild(style);
      state.loadedCss.add(href);
      return;
    } catch (fetchError) {
      if (!isCurrentCycle()) throw createCycleError();
      console.warn('[StoryRegexUI] CSS inline 加载失败，回退为 link 加载。', {
        href,
        error: fetchError?.message || String(fetchError),
      });
    }

    let sameOrigin = false;
    try {
      sameOrigin = new URL(href, window.location.href).origin === window.location.origin;
    } catch {
      sameOrigin = false;
    }

    if (!sameOrigin) {
      throw new Error(`StoryRegexUI CSS inline 加载失败且不创建跨域 link，避免 cssRules SecurityError: ${href}`);
    }

    assertCurrentCycle();
    await new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.storyUiCss = href;
      link.dataset.storyUiLoadState = 'loading';
      link.dataset.storyUiLoaderCycle = cycleId;
      activeResources.add(link);
      link.onload = () => {
        activeResources.delete(link);
        if (!isCurrentCycle()) {
          link.remove();
          reject(createCycleError());
          return;
        }
        link.dataset.storyUiLoadState = 'loaded';
        state.loadedCss.add(href);
        resolve();
      };
      link.onerror = () => {
        activeResources.delete(link);
        link.dataset.storyUiLoadState = 'failed';
        link.remove();
        reject(new Error(`StoryRegexUI CSS 加载失败: ${href}`));
      };
      document.head.appendChild(link);
    });
    assertCurrentCycle();
  }

  function loadScript(path) {
    assertCurrentCycle();
    const src = toUrl(path);
    const existing = document.querySelector(`script[data-story-ui-script="${src}"]`);
    if (state.loadedScripts.has(src) && isScriptContractReady(path)) return Promise.resolve();
    if (existing?.isConnected && existing.dataset?.storyUiLoadState === 'loaded' && isScriptContractReady(path)) {
      state.loadedScripts.add(src);
      return Promise.resolve();
    }
    removeResourceCopies('data-story-ui-script', src);

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.storyUiScript = src;
      script.dataset.storyUiLoadState = 'loading';
      script.dataset.storyUiLoaderCycle = cycleId;
      activeResources.add(script);
      script.onload = () => {
        activeResources.delete(script);
        if (!isCurrentCycle()) {
          script.remove();
          reject(createCycleError());
          return;
        }
        if (!isScriptContractReady(path)) {
          script.dataset.storyUiLoadState = 'failed';
          script.remove();
          reject(new Error(`StoryRegexUI 脚本执行后未满足注册契约: ${src}`));
          return;
        }
        script.dataset.storyUiLoadState = 'loaded';
        state.loadedScripts.add(src);
        resolve();
      };
      script.onerror = () => {
        activeResources.delete(script);
        script.dataset.storyUiLoadState = 'failed';
        script.remove();
        reject(new Error(`StoryRegexUI 脚本加载失败: ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadModules() {
    for (const moduleDef of state.modules) {
      assertCurrentCycle();
      if (moduleDef.css) {
        await loadCss(moduleDef.css);
      }
      const scripts = Array.isArray(moduleDef.scripts) ? moduleDef.scripts : moduleDef.script ? [moduleDef.script] : [];
      for (const script of scripts) {
        await loadScript(script);
      }
    }
    assertCurrentCycle();
  }

  async function boot() {
    try {
      await loadCss('shared.css');

      await loadScript('core/dom.js');
      await loadScript('core/registry.js');
      await loadScript('core/theme.js');
      await loadScript('core/scanner.js');

      await loadModules();

      assertCurrentCycle();
      if (
        typeof ui.registry?.find !== 'function' ||
        typeof ui.dbStatusData?.parseTables !== 'function' ||
        typeof ui.dbMapData?.parseTables !== 'function' ||
        typeof ui.theme?.init !== 'function' ||
        typeof ui.scanner?.init !== 'function' ||
        typeof ui.scanner?.scan !== 'function' ||
        state.modules.some(moduleDef => moduleDef.id !== 'manager-ui' && ui.registry.find(moduleDef.id)?.version !== moduleDef.version)
      ) {
        throw new Error('StoryRegexUI 启动契约不完整，拒绝标记 loader 为 ready');
      }
      ui.theme.init();
      ui.scanner.init();
      ui.scanner.scan();
      assertCurrentCycle();
      loaderState.status = 'ready';
    } catch (error) {
      if (!isCurrentCycle()) return;
      loaderState.status = 'failed';
      loaderState.error = error?.message || String(error);
      window[LOADER_FLAG] = false;
      console.error('[StoryRegexUI] 启动失败，保留原始正文。', error);
    } finally {
      activeResources.clear();
    }
  }

  boot();
})();
