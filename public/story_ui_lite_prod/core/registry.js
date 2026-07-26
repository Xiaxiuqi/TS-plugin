(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const modules = [];
  const STORAGE_KEY = 'jjks_story_ui_module_enabled_state';
  const DB_MAP_INDEPENDENT_STATE_MIGRATION_KEY = 'jjks_story_ui_db_map_independent_state_v1';
  const enabledState = readEnabledState();
  migrateDbMapEnabledState();

  function readEnabledState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveEnabledState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledState));
      return true;
    } catch {
      // ignore persistence failures
      return false;
    }
  }

  function migrateDbMapEnabledState() {
    try {
      if (localStorage.getItem(DB_MAP_INDEPENDENT_STATE_MIGRATION_KEY) === 'done') return;
      // 历史 db-map=false 没有来源标识，无法区分旧逻辑写入与用户手动关闭；
      // 本次按恢复地图显示的产品要求首次重置 false，保留 true，之后继续尊重地图的独立开关。
      if (enabledState['db-map'] === false) delete enabledState['db-map'];
      if (!saveEnabledState()) return;
      localStorage.setItem(DB_MAP_INDEPENDENT_STATE_MIGRATION_KEY, 'done');
    } catch {
      // keep the migration retryable when persistence is unavailable
    }
  }

  function applyEnabledState(module) {
    if (!module?.id) return module;
    const saved = enabledState[module.id];
    if (typeof saved === 'boolean') {
      module.enabled = saved;
    } else if (typeof module.enabled !== 'boolean') {
      module.enabled = true;
    }
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
      const previousModule = modules[existingIndex];
      if (previousModule !== module) {
        safelyCall(previousModule, 'cleanup');
      }
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

  function isEnabled(moduleId) {
    const module = find(moduleId);
    if (!module) return false;
    return module.enabled !== false;
  }

  function setEnabled(moduleId, enabled) {
    const module = find(moduleId);
    if (!module) return false;
    const nextValue = enabled !== false;
    const previousValue = module.enabled !== false;
    if (previousValue === nextValue) return true;
    module.enabled = nextValue;
    enabledState[moduleId] = nextValue;
    saveEnabledState();
    safelyCall(module, nextValue ? 'onEnable' : 'onDisable');
    return true;
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
    register,
    unregister,
    list,
    find,
    isEnabled,
    setEnabled,
    safelyCall,
  };
})();
