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
    root.classList.toggle('story-ui-night', currentTheme === 'night');
    root.classList.toggle('story-ui-day', currentTheme !== 'night');
    root.dataset.storyUiTheme = currentTheme;
  }

  function applyTheme(scope = document) {
    const roots = scope.querySelectorAll?.('.story-ui-root') || [];
    roots.forEach(applyThemeToRoot);

    if (scope.matches?.('.story-ui-root')) {
      applyThemeToRoot(scope);
    }
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
    applyThemeToRoot,
  };
})();
