(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const STORAGE_KEY = 'jjks_story_ui_theme';
  const VALID_THEMES = new Set(['day', 'night']);

  let currentTheme = 'day';
  let initialized = false;

  function normalizeTheme(theme) {
    return VALID_THEMES.has(theme) ? theme : 'day';
  }

  function readStoredTheme() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (VALID_THEMES.has(current)) return current;
    } catch (error) {
      console.warn('[StoryRegexUI] 读取主题失败，使用默认日间主题。', error);
    }

    return 'day';
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn('[StoryRegexUI] 保存主题失败，本次仅在当前页面生效。', error);
    }
  }

  function applyThemeToRoot(root) {
    if (!root?.classList) return;
    const isNight = currentTheme === 'night';
    root.classList.toggle('story-ui-night', isNight);
    root.classList.toggle('story-ui-day', !isNight);
    root.classList.toggle('theme-night', isNight);
    root.classList.toggle('theme-day', !isNight);
    if (root.classList.contains('bp-radar-widget') || root.classList.contains('story-ui-bp')) {
      root.classList.toggle('bp-night-ui', isNight);
      root.classList.toggle('bp-day-ui', !isNight);
    }
    root.dataset.storyUiTheme = currentTheme;
  }

  function applyTheme(scope = document) {
    const roots = scope.querySelectorAll?.('.story-ui-root') || [];
    roots.forEach(applyThemeToRoot);

    if (scope.matches?.('.story-ui-root')) {
      applyThemeToRoot(scope);
    }
  }

  function getThemeRerenderLimit() {
    const runtimeLimit = Number(
      ui?.runtime?.themeRerenderLimit || ui?.runtime?.renderDepth || ui?.runtime?.recentRenderLimit,
    );
    if (Number.isFinite(runtimeLimit) && runtimeLimit > 0) return Math.floor(runtimeLimit);
    return 5;
  }

  function getRecentMessageElements(limit = getThemeRerenderLimit()) {
    const messageNodes = Array.from(document.querySelectorAll('.mes[mesid]'));
    if (!Number.isFinite(limit) || limit <= 0) return messageNodes;
    return messageNodes.slice(-limit);
  }

  function getModuleHostsForThemeRerender(moduleId, fallbackSelector = '') {
    const hostSet = new Set();
    const roots = [];
    const selector = fallbackSelector || `[data-story-ui-module="${moduleId}"]`;

    getRecentMessageElements().forEach(messageNode => {
      messageNode.querySelectorAll(selector).forEach(root => {
        const host = root.closest?.('[data-story-ui-raw-mount="true"]') || root.parentElement;
        if (!host || hostSet.has(host)) return;
        hostSet.add(host);
        roots.push(host);
      });
    });

    if (roots.length > 0) return roots;

    document.querySelectorAll(selector).forEach(root => {
      const host = root.closest?.('[data-story-ui-raw-mount="true"]') || root.parentElement;
      if (!host || hostSet.has(host)) return;
      hostSet.add(host);
      roots.push(host);
    });

    return roots;
  }

  function captureDetailsState(scope) {
    if (!scope?.querySelectorAll) return [];
    return Array.from(scope.querySelectorAll('details')).map((details, index) => ({
      index,
      open: Boolean(details.open),
    }));
  }

  function restoreDetailsState(scope, stateList = []) {
    if (!scope?.querySelectorAll || !Array.isArray(stateList)) return;
    const detailsList = Array.from(scope.querySelectorAll('details'));
    stateList.forEach(state => {
      const details = detailsList[state.index];
      if (!details) return;
      details.open = Boolean(state.open);
    });
  }

  function rerenderWithPreservedDetails(oldRoot, buildNextRoot) {
    if (!oldRoot || typeof buildNextRoot !== 'function') return null;
    const detailsState = captureDetailsState(oldRoot);
    const nextRoot = buildNextRoot();
    if (!nextRoot) return null;
    restoreDetailsState(nextRoot, detailsState);
    oldRoot.replaceWith(nextRoot);
    applyThemeToRoot(nextRoot);
    return nextRoot;
  }

  function setTheme(theme, options = {}) {
    currentTheme = normalizeTheme(theme);
    if (options.save !== false) {
      saveTheme(currentTheme);
    }
    applyTheme(document);
    document.dispatchEvent(
      new CustomEvent('story-ui-theme-changed', {
        detail: { theme: currentTheme },
      }),
    );
    return currentTheme;
  }

  function toggleTheme() {
    return setTheme(currentTheme === 'night' ? 'day' : 'night');
  }

  function getTheme() {
    return currentTheme;
  }

  function init() {
    if (initialized) {
      applyTheme(document);
      return currentTheme;
    }

    initialized = true;
    currentTheme = readStoredTheme();
    applyTheme(document);

    document.addEventListener('click', event => {
      const trigger = event.target?.closest?.('[data-story-ui-theme-toggle]');
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      toggleTheme();
    });

    return currentTheme;
  }

  ui.theme = {
    STORAGE_KEY,
    init,
    getTheme,
    setTheme,
    toggleTheme,
    applyTheme,
    captureDetailsState,
    restoreDetailsState,
    rerenderWithPreservedDetails,
    getThemeRerenderLimit,
    getModuleHostsForThemeRerender,
    applyThemeToRoot,
  };
})();
