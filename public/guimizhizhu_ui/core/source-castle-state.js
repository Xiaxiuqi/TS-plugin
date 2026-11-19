(() => {
  'use strict';
  const KEY = 'cryptLord.sourceCastleState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw new Error('源堡状态依赖 shared/contract.js');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0, generating = false;
  const proofs = new WeakMap(), subscriptions = [];
  function scopeFor() {
    const host = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window, epoch,
      source: modules['cryptLord.nativeFloorSource'], shortcuts: modules['cryptLord.quickShortcuts'],
      script: JSON.stringify(host?.scriptVariableOptions?.()),
      chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()) };
  }
  function check(scope, guard) {
    if (disposed || modules[KEY] !== api || generating || guard?.() === false)
      throw new DOMException('源堡观测已取消', 'AbortError');
    const current = scopeFor();
    if (scope && Object.keys(scope).some(key => scope[key] !== current[key]))
      throw new DOMException('源堡观测来源已变化，请重新读取', 'AbortError');
    return true;
  }
  const count = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).filter(key => key !== '$meta').length : 0;

  async function collect(guard) {
    check(null, guard);
    const scope = scopeFor(), host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(scope, guard);
    const source = scope.source;
    const readBinding = async () => {
      const [character, global, chat] = await Promise.all([
        host.getCharWorldbookNames('current'), host.getGlobalWorldbookNames(), host.getChatWorldbookName('current'),
      ]);
      check(scope, guard);
      if (!character || typeof character !== 'object' || Array.isArray(character) ||
        character.additional != null && !Array.isArray(character.additional) ||
        !Array.isArray(global) || chat != null && typeof chat !== 'string')
        throw Error('世界书挂载列表格式无效');
      return structuredClone({ character, global, chat });
    };
    const [floor, books, shortcuts, binding] = await Promise.allSettled([
      (async () => {
        if (!source) throw Error('原生楼层来源尚未加载');
        return source.read(() => check(scope, guard));
      })(),
      (async () => {
        const names = await host.getWorldbookNames();
        if (!Array.isArray(names) || names.some(name => typeof name !== 'string')) throw Error('世界书目录格式无效');
        return [...new Set(names)];
      })(),
      contract.waitGlobalInitialized('cryptLord.quickShortcuts', { timeoutMs: 10000 })
        .then(api => api.load({ guard: () => check(scope, guard) })),
      readBinding(),
    ]);
    check(scope, guard);
    let message = null, floorError = floor.status === 'rejected' ? String(floor.reason?.message || floor.reason) : '';
    if (floor.status === 'fulfilled') {
      try {
        await source.assert(floor.value, () => check(scope, guard));
        message = floor.value.rows.filter(row => row.role === 'assistant').at(-1);
        if (message?.is_hidden) { message = null; floorError = '最新 assistant 楼层已隐藏'; }
      } catch (error) { floorError = String(error.message || error); }
    }
    check(scope, guard);
    if (binding.status === 'fulfilled') {
      if (JSON.stringify(await readBinding()) !== JSON.stringify(binding.value)) throw Error('世界书挂载已变化，请重新读取');
    }
    const data = message?.data || {};
    const names = books.status === 'fulfilled' && Array.isArray(books.value) ? books.value : [];
    const loaded = shortcuts.status === 'fulfilled' ? shortcuts.value : null;
    const bound = binding.status === 'fulfilled' ? binding.value : null;
    const mounted = bound ? [...new Set([bound.character?.primary, ...(bound.character?.additional || []),
      ...(bound.global || []), bound.chat].filter(Boolean))] : null;
    const snapshot = root.debug?.snapshot?.() || { modules: [], events: [] };
    const result = {
      messageId: Number.isInteger(message?.message_id) ? message.message_id : null,
      counts: Object.fromEntries(['stat_data', 'npc_data', 'world_data'].map(key => [key, count(data[key])])),
      books: books.status === 'rejected' ? `读取失败：${books.reason?.message || books.reason}` : `${names.length} 本`,
      mountedBooks: mounted ? `${mounted.length} 本${mounted.length ? ` · ${mounted.join('、')}` : ''}` :
        `读取失败：${binding.reason?.message || binding.reason}`,
      shortcuts: shortcuts.status === 'rejected'
        ? `读取失败：${shortcuts.reason?.message || shortcuts.reason}`
        : `${loaded?.commands?.length || 0} 项 · ${loaded?.source === 'custom' ? '玩家自建' :
          loaded?.source === 'primary-fallback' ? loaded.revisions?.primary?.book || '当前角色主书' : '空'}`,
      floorError,
      loader: snapshot.loader?.status || root.loader?.status || '未知',
      modules: (snapshot.modules || []).map(item => ({
        key: item.key, registered: Boolean(item.registered),
        ready: Boolean(item.ready), mounted: Boolean(item.mounted),
      })),
      events: (snapshot.events || []).map(item => ({ ...item })),
    };
    check(scope, guard);
    proofs.set(result, scope);
    return result;
  }

  function formatLogs(events) {
    return (events || []).map(item => [
      Number.isNaN(new Date(item.timestamp).getTime()) ? '时间未知' : new Date(item.timestamp).toISOString(),
      String(item.level || 'info').toUpperCase(),
      [item.module, item.action].filter(Boolean).join(' · '),
      String(item.details || '').replace(/\r?\n/g, ' '),
    ].join(' | ')).join('\n');
  }

  const api = Object.freeze({
    status: () => ({ ready: !disposed, key: KEY }), collect, formatLogs,
    assertCurrent(result, guard) {
      const scope = proofs.get(result);
      if (!scope) throw Error('源堡观测凭据无效，请重新读取');
      return check(scope, guard);
    },
    dispose() {
      disposed = true; epoch++; subscriptions.splice(0).forEach(item => item?.stop());
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents?.() || {};
  const bind = (name, handler) => { if (events[name]) subscriptions.push(after.bindEvent(events[name], handler)); };
  bind('CHAT_CHANGED', () => { epoch++; generating = false; });
  bind('GENERATION_STARTED', (type, options = {}, dryRun) => {
    if (['quiet', 'quiet_prompt'].includes(String(type || '').toLowerCase()) ||
      options?.dryRun || options?.dry_run || dryRun === true) return;
    epoch++; generating = true;
  });
  for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED']) bind(name, () => { generating = false; });
})();
