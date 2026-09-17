(() => {
  'use strict';

  const KEY = 'cryptLord.nativeHistoryPolicy';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }

  const content = [
    '本轮不提供自定义长期记忆、核心记忆或 RAG 召回。',
    '请仅依据系统规则、世界书、当前原生聊天记录与本次用户输入推进剧情。',
    '未出现在当前上下文中的既往信息不得擅自补造；信息不足时应以当前可见事实为准。',
  ].join('');

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    content,
    createInjection() {
      return Object.freeze({
        role: 'system',
        content,
        position: 'in_chat',
        depth: 0,
        should_scan: true,
      });
    },
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
