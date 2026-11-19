(() => {
  'use strict';
  const KEY = 'cryptLord.gameContextProviders';
  const BUILDER_KEY = 'cryptLord.contextBuilder';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  async function directivesProvider(context) {
    try {
      return await modules['cryptLord.dynamicStatus']?.provide({
        ...context, guard: () => !disposed && (!context.guard || context.guard()),
      });
    } catch (error) {
      if (!disposed) console.warn(`[${KEY}] 动态指令读取失败，本次不注入旧规则`, error);
      return null;
    }
  }

  let unregister = [], disposed = false;
  const api = Object.freeze({ status() { return Object.freeze({ key: KEY, ready: !disposed, providers: Object.freeze(['system-directives']) }); }, dispose() { disposed = true; unregister.forEach(stop => stop()); unregister = []; try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ } if (modules[KEY] === api) delete modules[KEY]; return true; } });
  modules[KEY] = api;
  contract.waitGlobalInitialized(BUILDER_KEY, { timeoutMs: 10000 }).then(builder => {
    if (disposed) return;
    unregister = [builder.register('system-directives', directivesProvider, 40)];
    contract.initializeGlobal(KEY, api);
  }).catch(error => { if (modules[KEY] === api) delete modules[KEY]; console.error(`[${KEY}] 注册上下文提供者失败`, error); });
})();
