(() => {
  'use strict';
  const KEY = 'cryptLord.sourceCastleState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw new Error('源堡状态依赖 shared/contract.js');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const count = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).filter(key => key !== '$meta').length : 0;

  async function collect() {
    const [store, host] = await Promise.all([
      contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 }),
      contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 }),
    ]);
    const [floor, books, shortcuts] = await Promise.allSettled([
      store.findLatestAssistant(),
      host.getWorldbookNames(),
      contract.waitGlobalInitialized('cryptLord.quickShortcuts', { timeoutMs: 10000 })
        .then(api => api.load()),
    ]);
    const message = floor.status === 'fulfilled' ? floor.value : null;
    const data = message?.data || {};
    const names = books.status === 'fulfilled' && Array.isArray(books.value) ? books.value : [];
    const loaded = shortcuts.status === 'fulfilled' ? shortcuts.value : null;
    const snapshot = root.debug?.snapshot?.() || { modules: [], events: [] };
    return {
      messageId: Number.isInteger(message?.message_id) ? message.message_id : null,
      counts: Object.fromEntries(['stat_data', 'npc_data', 'world_data'].map(key => [key, count(data[key])])),
      books: books.status === 'rejected' ? `读取失败：${books.reason?.message || books.reason}` : `${names.length} 本`,
      shortcuts: shortcuts.status === 'rejected'
        ? `读取失败：${shortcuts.reason?.message || shortcuts.reason}`
        : `${loaded?.commands?.length || 0} 项 · ${loaded?.source === 'custom' ? '玩家自建' : loaded?.source === 'primary-fallback' ? '1源堡' : '空'}`,
      floorError: floor.status === 'rejected' ? String(floor.reason?.message || floor.reason) : '',
      loader: snapshot.loader?.status || root.loader?.status || '未知',
      modules: (snapshot.modules || []).map(item => ({
        key: item.key, registered: Boolean(item.registered),
        ready: Boolean(item.ready), mounted: Boolean(item.mounted),
      })),
      events: (snapshot.events || []).map(item => ({ ...item })),
    };
  }

  function formatLogs(events) {
    return (events || []).map(item => [
      new Date(item.timestamp).toISOString(),
      String(item.level || 'info').toUpperCase(),
      [item.module, item.action].filter(Boolean).join(' · '),
      String(item.details || '').replace(/\r?\n/g, ' '),
    ].join(' | ')).join('\n');
  }

  const api = Object.freeze({
    status: () => ({ ready: true, key: KEY }), collect, formatLogs,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
