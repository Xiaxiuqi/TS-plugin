(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const modules = [];
  const STORAGE_KEY = 'jjks_story_ui_module_enabled_state';
  const MODE_STORAGE_KEY = 'jjks_story_ui_module_modes';
  const VALID_MODES = new Set(['script', 'native', 'off']);
  const DEFAULT_MODE = 'script';
  const enabledState = readEnabledState();
  const modeState = readModeState();

  function readEnabledState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function readModeState() {
    try {
      const raw = localStorage.getItem(MODE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveEnabledState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledState));
    } catch {
      // ignore persistence failures
    }
  }

  function saveModeState() {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(modeState));
    } catch {
      // ignore persistence failures
    }
  }

  function normalizeMode(mode) {
    return VALID_MODES.has(mode) ? mode : DEFAULT_MODE;
  }

  function getStoredOrCompatMode(moduleId) {
    const savedMode = modeState[moduleId];
    if (VALID_MODES.has(savedMode)) return savedMode;
    if (enabledState[moduleId] === false) return 'off';
    return DEFAULT_MODE;
  }

  function applyEnabledState(module) {
    if (!module?.id) return module;
    const mode = getStoredOrCompatMode(module.id);
    module.mode = mode;
    module.enabled = mode !== 'off';
    return module;
  }

  function register(module) {
    if (!module || typeof module !== 'object') {
      console.warn('[StoryRegexUI] 已忽略无效模块注册。', module);
      return false;
    }

    if (!module.id || typeof module.id !== 'string') {
      console.warn('[StoryRegexUI] 模块缺少 id，已忽略。', module);
      return false;
    }

    applyEnabledState(module);

    const existingIndex = modules.findIndex(item => item.id === module.id);
    if (existingIndex >= 0) {
      modules.splice(existingIndex, 1, module);
    } else {
      modules.push(module);
    }

    modules.sort((a, b) => (a.priority || 100) - (b.priority || 100));
    return true;
  }

  function unregister(moduleId) {
    const index = modules.findIndex(module => module.id === moduleId);
    if (index < 0) return false;
    const [module] = modules.splice(index, 1);

    try {
      module.cleanup?.();
    } catch (error) {
      console.error(`[StoryRegexUI] 模块清理失败: ${moduleId}`, error);
    }

    return true;
  }

  function list(options = {}) {
    const includeDisabled = Boolean(options.includeDisabled);
    const snapshot = modules.slice();
    return includeDisabled ? snapshot : snapshot.filter(module => module.enabled !== false);
  }

  function find(moduleId) {
    return modules.find(module => module.id === moduleId) || null;
  }

  function getMode(moduleId) {
    const module = find(moduleId);
    if (!module) return getStoredOrCompatMode(moduleId);
    const mode = normalizeMode(module.mode || getStoredOrCompatMode(moduleId));
    module.mode = mode;
    module.enabled = mode !== 'off';
    return mode;
  }

  function isEnabled(moduleId) {
    const module = find(moduleId);
    if (!module) return false;
    return getMode(moduleId) !== 'off';
  }

  function isScriptMode(moduleId) {
    return getMode(moduleId) === 'script';
  }

  function setMode(moduleId, mode) {
    const module = find(moduleId);
    if (!module) return false;
    const nextMode = normalizeMode(mode);
    module.mode = nextMode;
    module.enabled = nextMode !== 'off';
    modeState[moduleId] = nextMode;
    enabledState[moduleId] = nextMode !== 'off';
    saveModeState();
    saveEnabledState();
    return true;
  }

  function setEnabled(moduleId, enabled) {
    return setMode(moduleId, enabled === false ? 'off' : DEFAULT_MODE);
  }

  function safelyCall(module, methodName, ...args) {
    try {
      const method = module?.[methodName];
      if (typeof method !== 'function') return undefined;
      return method.apply(module, args);
    } catch (error) {
      console.error(`[StoryRegexUI] 模块 ${module?.id || 'unknown'} 执行 ${methodName} 失败。`, error);
      return undefined;
    }
  }

  ui.registry = {
    STORAGE_KEY,
    MODE_STORAGE_KEY,
    VALID_MODES: Array.from(VALID_MODES),
    DEFAULT_MODE,
    register,
    unregister,
    list,
    find,
    getMode,
    setMode,
    isEnabled,
    setEnabled,
    isScriptMode,
    safelyCall,
  };
})();
