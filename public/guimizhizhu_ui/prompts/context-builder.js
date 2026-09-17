(() => {
  'use strict';

  const KEY = 'cryptLord.contextBuilder';
  const POLICY_KEY = 'cryptLord.nativeHistoryPolicy';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const providers = new Map();

  function validateProvider(id, provider) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new TypeError(`[${KEY}] 提供者 ID 必须为小写字母、数字或连字符`);
    if (typeof provider !== 'function') throw new TypeError(`[${KEY}] 提供者必须是函数: ${id}`);
  }

  function register(id, provider, priority = 100) {
    validateProvider(id, provider);
    if (providers.has(id)) throw new Error(`[${KEY}] 提供者已存在: ${id}`);
    providers.set(id, { provider, priority: Number(priority) || 100 });
    return () => providers.delete(id);
  }

  async function build(context = {}) {
    const policy = await contract.waitGlobalInitialized(POLICY_KEY, { timeoutMs: 10000 });
    const injections = [policy.createInjection()];
    const ordered = Array.from(providers.entries()).sort(([, a], [, b]) => a.priority - b.priority);
    for (const [id, entry] of ordered) {
      const output = await entry.provider(Object.freeze({ ...context }));
      const values = Array.isArray(output) ? output : [output];
      values.filter(Boolean).forEach(value => {
        if (!value || typeof value.content !== 'string' || !value.content.trim()) {
          throw new Error(`[${KEY}] 提供者返回了无效注入: ${id}`);
        }
        injections.push(Object.freeze({ ...value }));
      });
    }
    return Object.freeze(injections);
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, providerIds: Object.freeze(Array.from(providers.keys())) }); },
    register,
    build,
    dispose() { providers.clear(); try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
