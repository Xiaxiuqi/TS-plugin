(() => {
  'use strict';

  const KEY = 'cryptLord.lifecycle';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }

  function createScope(label) {
    const cleanups = new Set();
    let disposed = false;

    function addCleanup(cleanup) {
      if (typeof cleanup !== 'function') throw new TypeError(`[${KEY}] ${label} 的清理器必须是函数`);
      if (disposed) {
        cleanup();
        return () => false;
      }
      cleanups.add(cleanup);
      return () => cleanups.delete(cleanup);
    }

    function listen(target, eventName, listener, options) {
      if (!target?.addEventListener) throw new Error(`[${KEY}] ${label} 无法监听 ${eventName}`);
      target.addEventListener(eventName, listener, options);
      return addCleanup(() => target.removeEventListener(eventName, listener, options));
    }

    function tavernEvent(eventName, listener) {
      if (typeof window.eventOn !== 'function') throw new Error(`[${KEY}] eventOn 不可用，无法监听 ${eventName}`);
      window.eventOn(eventName, listener);
      return addCleanup(() => window.eventClearListener?.(listener));
    }

    function timeout(callback, delay) {
      const timer = window.setTimeout(() => {
        cleanups.delete(cancel);
        callback();
      }, delay);
      const cancel = () => window.clearTimeout(timer);
      addCleanup(cancel);
      return cancel;
    }

    function dispose() {
      if (disposed) return true;
      disposed = true;
      const errors = [];
      Array.from(cleanups).reverse().forEach(cleanup => {
        try { cleanup(); } catch (error) { errors.push(error); }
      });
      cleanups.clear();
      if (errors.length) console.warn(`[${KEY}] ${label} 清理时发生 ${errors.length} 个错误`, errors);
      return errors.length === 0;
    }

    return Object.freeze({ label, addCleanup, listen, tavernEvent, timeout, dispose, get disposed() { return disposed; } });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    createScope,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
