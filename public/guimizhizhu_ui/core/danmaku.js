(() => {
  'use strict';
  const KEY = 'cryptLord.danmaku', BOOK = '1源堡';
  const NAMES = Object.freeze(['【系统】弹幕风格', '【系统】弹幕框架', '【系统】弹幕触发',
    '【系统】格式要求-弹幕', '【系统】格式要求']);
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('弹幕模块共享契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, queue = Promise.resolve(), epoch = 0, generating = false;
  const proofs = new WeakMap(), subscriptions = [];
  const check = guard => {
    if (disposed || modules[KEY] !== api || guard && !guard()) throw new DOMException('弹幕操作已取消', 'AbortError');
  };
  const canonical = value => {
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { $regex: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  const revision = value => JSON.stringify(canonical(value));
  function sourceFor(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()),
      script: revision(host.scriptVariableOptions?.()), epoch };
  }
  function checkSource(source, guard) {
    check(guard);
    const current = sourceFor(source.host);
    if (generating || modules['cryptLord.hostApi'] !== source.host ||
      Object.keys(source).some(key => source[key] !== current[key]))
      throw new DOMException('弹幕来源、聊天或生成阶段已变化，请重新读取', 'AbortError');
  }
  function extract(text) {
    if (!text || typeof text !== 'string') return [];
    const parser = modules['cryptLord.responseNormalizer'];
    if (!parser) throw Error('正文归一化服务尚未加载');
    const visible = parser.maskHidden(text);
    return parser.tagSpans(visible, 'dm').filter(span => span.closed)
      .map(span => visible.slice(span.innerStart, span.innerEnd).trim()).filter(Boolean);
  }
  function project(rows) {
    return (Array.isArray(rows) ? rows : []).filter(row => row?.role === 'assistant' && !row.is_hidden &&
      Number.isInteger(Number(row.message_id)) && Number(row.message_id) >= 0)
      .map(row => ({ messageId: Number(row.message_id), raw: String(row.message || ''),
        swipeId: row.swipe_id ?? null, comments: extract(row.message) }))
      .filter(row => row.comments.length).sort((a, b) => a.messageId - b.messageId);
  }
  async function readFloors(guard) {
    check(guard);
    const source = modules['cryptLord.nativeFloorSource'], parser = modules['cryptLord.responseNormalizer'];
    if (!source) throw Error('原生楼层来源尚未加载');
    const context = await source.read(guard), rows = project(context.rows);
    await source.assert(context, guard); check(guard);
    if (modules['cryptLord.nativeFloorSource'] !== source || modules['cryptLord.responseNormalizer'] !== parser)
      throw Error('弹幕楼层来源已变化，请重新读取');
    return rows;
  }
  function targets(entries) {
    if (!Array.isArray(entries)) throw Error('弹幕世界书未返回条目列表');
    return NAMES.map(name => {
      const found = entries.filter(entry => String(entry.name || entry.comment || '').trim() === name);
      if (found.length !== 1) throw Error(`「${name}」${found.length ? '重名' : '缺失'}，请先整理原生世界书`);
      const entry = found[0];
      if (entry.uid == null || entries.filter(row => row.uid === entry.uid).length !== 1)
        throw Error(`「${name}」UID 无效或重复`);
      return entry;
    });
  }
  function describe(entries) {
    const rows = targets(entries);
    const on = rows.every((row, index) => row.enabled === (index !== 4));
    const off = rows.every((row, index) => row.enabled === (index === 4));
    return { mode: on ? 'on' : off ? 'off' : 'mixed',
      entries: rows.map(row => ({ uid: row.uid, name: row.name || row.comment, enabled: row.enabled })) };
  }
  async function binding(api, guard) {
    check(guard);
    const character = structuredClone(await api.getCharWorldbookNames('current'));
    const global = typeof api.getGlobalWorldbookNames === 'function' ? structuredClone(await api.getGlobalWorldbookNames()) : [];
    const chat = typeof api.getChatWorldbookName === 'function' ? await api.getChatWorldbookName('current') : null;
    check(guard);
    const names = [character?.primary, ...(character?.additional || []), ...(global || []), chat];
    if (!names.includes(BOOK)) throw Error('当前聊天未挂载「1源堡」，不会改动其他世界书');
    return revision({ character, global, chat, script: api.scriptVariableOptions?.() || null });
  }
  async function snapshot(api, guard) {
    check(guard);
    const source = sourceFor(api), identity = await binding(api, guard);
    checkSource(source, guard);
    const entries = structuredClone(await api.getWorldbook(BOOK));
    checkSource(source, guard);
    const targetVersion = revision(targets(entries));
    const confirmed = await api.getWorldbook(BOOK);
    checkSource(source, guard);
    if (targetVersion !== revision(targets(confirmed))) throw Error('弹幕条目已变化，请重新读取');
    if (await binding(api, guard) !== identity) throw Error('世界书绑定已变化，请重新读取');
    checkSource(source, guard);
    const ticket = { identity, entries: targetVersion };
    proofs.set(ticket, { source, value: revision(ticket) });
    return { ...describe(entries), revision: ticket };
  }
  async function readMode(guard) {
    await queue;
    check(guard);
    return snapshot(await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 }), guard);
  }
  function setMode(enabled, expected, guard) {
    const ticket = structuredClone(expected), proof = expected && proofs.get(expected);
    const task = queue.then(async () => {
      check(guard);
      if (typeof enabled !== 'boolean' || !ticket) throw Error('请先重新读取弹幕配置');
      if (!proof || proof.revoked || proof.value !== revision(ticket)) throw Error('弹幕条目凭据无效或已在别处修改，请重新读取');
      checkSource(proof.source, guard);
      const api = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      if (await binding(api, guard) !== ticket.identity) throw Error('世界书绑定或脚本身份已变化，请重新读取');
      const rows = structuredClone(await api.getWorldbook(BOOK));
      checkSource(proof.source, guard);
      if (revision(targets(rows)) !== ticket.entries) throw Error('弹幕条目已在别处修改，请重新读取');
      if (describe(rows).mode === (enabled ? 'on' : 'off')) return { ...await snapshot(api, guard), unchanged: true };
      const wanted = targets(rows).map((entry, index) => ({ ...entry, enabled: index !== 4 ? enabled : !enabled }));
      let attempted = false, failure;
      try { await api.updateWorldbookWith(BOOK, async entries => {
        checkSource(proof.source, guard);
        if (await binding(api, guard) !== ticket.identity) throw Error('世界书绑定已变化，请重新读取');
        if (revision(targets(entries)) !== ticket.entries) throw Error('弹幕条目已变化，请重新读取');
        checkSource(proof.source, guard);
        attempted = true;
        return entries.map(entry => {
          const index = NAMES.indexOf(String(entry.name || entry.comment || '').trim());
          return index < 0 ? entry : { ...entry, enabled: index !== 4 ? enabled : !enabled };
        });
      }, { render: 'debounced' }); } catch (error) { if (!attempted) throw error; failure = error; }
      try {
        checkSource(proof.source, guard);
        const result = await snapshot(api, guard);
        checkSource(proof.source, guard);
        if (failure && revision(result.revision) === revision(ticket)) throw failure;
        if (result.revision.identity !== ticket.identity || result.revision.entries !== revision(wanted))
          throw Error('写入后的完整弹幕条目与提交结果不一致');
        proof.revoked = true;
        return { ...result, ...(failure ? { warning: '弹幕模式已确认保存，但宿主响应丢失；未重复提交' } : {}) };
      } catch (error) {
        if (failure && error === failure) throw error;
        proof.revoked = true;
        return { mode: null, revision: null,
          warning: `弹幕模式保存结果无法确认：${error.message}。请重新读取，勿重复提交。` };
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed }), extract, project, readFloors, describe, readMode, setMode,
    names: NAMES, book: BOOK,
    dispose() {
      disposed = true; epoch++; subscriptions.splice(0).forEach(item => item?.stop()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
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
