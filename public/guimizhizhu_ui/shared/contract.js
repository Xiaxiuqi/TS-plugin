(() => {
  'use strict';

  const root = (window.cryptLord = window.cryptLord || {});
  if (root.contract) {
    const valid = ['initializeGlobal', 'waitGlobalInitialized', 'releaseGlobal', 'cancelWaiters', 'reset'].every(
      method => typeof root.contract[method] === 'function',
    );
    if (!valid) throw new Error('拒绝复用形状不匹配的window.cryptLord.contract');
    return;
  }

  const registry = new Map();
  const waiters = new Map();

  function validateKey(key) {
    if (typeof key !== 'string' || !key.startsWith('cryptLord.') || key.length <= 'cryptLord.'.length) {
      throw new TypeError(`全局契约键必须使用 cryptLord. 前缀: ${String(key)}`);
    }
  }

  function initializeGlobal(key, api) {
    validateKey(key);
    if ((typeof api !== 'object' || api === null) && typeof api !== 'function') {
      throw new TypeError(`契约API必须是对象或函数: ${key}`);
    }
    const existing = registry.get(key);
    if (existing) {
      if (existing !== api) throw new Error(`拒绝覆盖已注册的不同API: ${key}`);
      return existing;
    }
    registry.set(key, api);
    const pending = waiters.get(key);
    if (pending) {
      waiters.delete(key);
      pending.forEach(waiter => waiter.resolve(api));
    }
    return api;
  }

  function waitGlobalInitialized(key, options = {}) {
    validateKey(key);
    const existing = registry.get(key);
    if (existing) return Promise.resolve(existing);
    const timeoutMs = options.timeoutMs === undefined ? 10000 : Number(options.timeoutMs);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
      return Promise.reject(new TypeError(`timeoutMs必须是非负有限数: ${key}`));
    }
    if (options.signal?.aborted) return Promise.reject(new DOMException(`等待已取消: ${key}`, 'AbortError'));

    return new Promise((resolve, reject) => {
      const bucket = waiters.get(key) || new Set();
      const waiter = { resolve: null, reject: null, cleanup: null };
      let timer = null;
      const cleanup = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        options.signal?.removeEventListener('abort', onAbort);
        bucket.delete(waiter);
        if (bucket.size === 0) waiters.delete(key);
      };
      const cancel = reason => {
        cleanup();
        reject(new DOMException(`等待已取消: ${key}${reason ? ` (${reason})` : ''}`, 'AbortError'));
      };
      const onAbort = () => cancel('signal');
      waiter.cleanup = cleanup;
      waiter.reject = cancel;
      waiter.resolve = api => { cleanup(); resolve(api); };
      bucket.add(waiter);
      waiters.set(key, bucket);
      options.signal?.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`等待全局契约超时(${timeoutMs}ms): ${key}`));
      }, timeoutMs);
    });
  }

  function releaseGlobal(key, api) {
    validateKey(key);
    const existing = registry.get(key);
    if (!existing) return false;
    if (existing !== api) throw new Error(`拒绝释放不匹配的API: ${key}`);
    registry.delete(key);
    return true;
  }

  function cancelWaiters(reason = 'contract-reset') {
    const pending = Array.from(waiters.values()).flatMap(bucket => Array.from(bucket));
    pending.forEach(waiter => waiter.reject(reason));
    waiters.clear();
    return pending.length;
  }

  function reset(reason = 'contract-reset') {
    const cancelled = cancelWaiters(reason);
    registry.clear();
    return Object.freeze({ cancelled });
  }

  root.contract = Object.freeze({ initializeGlobal, waitGlobalInitialized, releaseGlobal, cancelWaiters, reset });
})();
