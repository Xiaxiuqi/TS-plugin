(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const modules = [];

  function register(module) {
    if (!module || typeof module !== 'object') {
      console.warn('[StoryRegexUI] 已忽略无效模块注册。', module);
      return false;
    }

    if (!module.id || typeof module.id !== 'string') {
      console.warn('[StoryRegexUI] 模块缺少 id，已忽略。', module);
      return false;
    }

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

  function list() {
    return modules.slice();
  }

  function find(moduleId) {
    return modules.find(module => module.id === moduleId) || null;
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
    register,
    unregister,
    list,
    find,
    safelyCall,
  };
})();
