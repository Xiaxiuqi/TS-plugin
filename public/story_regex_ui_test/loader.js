(() => {
  const GLOBAL_KEY = 'StoryRegexUI';
  const LOADER_FLAG = '__storyRegexUiLoaderReady';

  if (window[LOADER_FLAG]) {
    window[GLOBAL_KEY]?.scanner?.scan?.();
    return;
  }

  window[LOADER_FLAG] = true;

  const currentScript = document.currentScript;
  const baseUrl = (() => {
    if (currentScript?.src) {
      return new URL('.', currentScript.src).href;
    }

    const fallback = Array.from(document.scripts)
      .map(script => script.src)
      .find(src => src.includes('/story_regex_ui_test/loader.js') || src.includes('/story_regex_ui_prod/loader.js'));

    return fallback ? new URL('.', fallback).href : './';
  })();

  const state = {
    baseUrl,
    version: 'test',
    loadedCss: new Set(),
    loadedScripts: new Set(),
  };

  function toUrl(path) {
    const url = new URL(path, state.baseUrl);
    if (!url.searchParams.has('v')) {
      url.searchParams.set('v', state.version);
    }
    return url.href;
  }

  function loadCss(path) {
    const href = toUrl(path);
    if (state.loadedCss.has(href) || document.querySelector(`link[data-story-ui-css="${href}"]`)) {
      state.loadedCss.add(href);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.storyUiCss = href;
      link.onload = () => {
        state.loadedCss.add(href);
        resolve();
      };
      link.onerror = () => reject(new Error(`StoryRegexUI CSS 加载失败: ${href}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(path) {
    const src = toUrl(path);
    if (state.loadedScripts.has(src) || document.querySelector(`script[data-story-ui-script="${src}"]`)) {
      state.loadedScripts.add(src);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.storyUiScript = src;
      script.onload = () => {
        state.loadedScripts.add(src);
        resolve();
      };
      script.onerror = () => reject(new Error(`StoryRegexUI 脚本加载失败: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function boot() {
    try {
      await loadCss('shared.css');

      await loadScript('core/dom.js');
      await loadScript('core/registry.js');
      await loadScript('core/theme.js');
      await loadScript('core/scanner.js');

      await loadCss('modules/variable-update/style.css');
      await loadScript('modules/variable-update/index.js');

      await loadCss('modules/mvu-status/style.css');
      await loadScript('modules/mvu-status/index.js');

      await loadCss('modules/bp-panel/style.css');
      await loadScript('modules/bp-panel/index.js');

      window[GLOBAL_KEY]?.theme?.init?.();
      window[GLOBAL_KEY]?.scanner?.init?.();
      window[GLOBAL_KEY]?.scanner?.scan?.();
    } catch (error) {
      console.error('[StoryRegexUI] 启动失败，保留原始正文。', error);
    }
  }

  boot();
})();
