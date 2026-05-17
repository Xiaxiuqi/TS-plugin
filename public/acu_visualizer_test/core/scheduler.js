// ACU Visualizer 测试版调度模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 setTimeout 初始化、AI 消息 MutationObserver、延迟刷新等调度逻辑。
// 迁移原则：只迁移定时/观察器容器，不改变触发时机，不夹带优化。

export function delay(fn, ms = 0) {
  return setTimeout(fn, ms);
}

export function scheduleInitialize(initializeScript, delayMs = 2000) {
  return delay(initializeScript, delayMs);
}

export function retryUntilDatabaseReady({ getDB, onReady, retryMs = 3000 }) {
  const run = () => {
    const api = getDB?.();
    if (!api || typeof api.exportTableAsJson !== 'function') {
      return delay(run, retryMs);
    }
    return onReady?.(api);
  };
  return run();
}

export function observeAIMessages({ $, onAIMessageAdded, root = document.body } = {}) {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const $node = $(node);
            if ($node.hasClass('mes') && !$node.hasClass('sys') && !$node.hasClass('user')) {
              delay(() => onAIMessageAdded?.(node), 300);
              break;
            }
          }
        }
      }
    });
  });
  if (root) observer.observe(root, { childList: true, subtree: true });
  return observer;
}

export function createSchedulerRegistry() {
  const timeouts = new Set();
  const observers = new Set();
  return {
    setTimeout(fn, ms) {
      const id = setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
      return id;
    },
    addObserver(observer) {
      observers.add(observer);
      return observer;
    },
    clearAll() {
      timeouts.forEach(id => clearTimeout(id));
      timeouts.clear();
      observers.forEach(observer => observer.disconnect?.());
      observers.clear();
    },
  };
}
