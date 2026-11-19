(() => {
  'use strict';
  const KEY = 'cryptLord.nativeFloorSource', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('原生楼层来源契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0;
  const issued = new WeakMap(), subscriptions = [];
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function identity() {
    const host = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost();
    return { host, after, document: surface?.document, window: surface?.window, epoch,
      script: signature(host?.scriptVariableOptions?.()),
      chat: surface?.window?.SillyTavern?.getCurrentChatId?.() };
  }
  function check(scope, guard) {
    if (disposed || modules[KEY] !== api || guard?.() === false)
      throw new DOMException('原生楼层读取已取消', 'AbortError');
    const now = identity();
    if (scope && Object.keys(scope).some(key => scope[key] !== now[key]))
      throw new DOMException('原生楼层宿主、聊天或脚本已变化，请重新读取', 'AbortError');
  }
  function receipt(source, guard) {
    const stored = source && issued.get(source);
    if (!stored || stored.signature !== signature(source)) throw Error('原生楼层读取凭据无效，请重新读取');
    check(stored.scope, guard);
    return stored;
  }
  async function read(guard) {
    check(null, guard);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const scope = identity();
    check(scope, guard);
    if (host !== scope.host) throw Error('原生楼层来源服务已变化');
    const rows = structuredClone(await host.getChatMessages('0-{{lastMessageId}}'));
    check(scope, guard);
    const swipes = structuredClone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true }));
    check(scope, guard);
    if (!Array.isArray(rows) || !Array.isArray(swipes)) throw Error('原生楼层不可读取');
    for (const list of [rows, swipes]) {
      if (list.some(row => !Number.isInteger(row?.message_id) || row.message_id < 0) ||
        new Set(list.map(row => row.message_id)).size !== list.length) throw Error('原生楼层编号异常');
      list.sort((a, b) => a.message_id - b.message_id);
    }
    if (rows.length !== swipes.length) throw Error('原生楼层消息页已变化，请重新读取');
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index], page = swipes[index], selected = page.swipe_id;
      if (row.message_id !== page.message_id || row.role !== page.role ||
        !['assistant', 'user', 'system'].includes(row.role) || typeof row.message !== 'string' ||
        !row.data || typeof row.data !== 'object' || Array.isArray(row.data) ||
        Boolean(row.is_hidden) !== Boolean(page.is_hidden) || row.name !== page.name ||
        !Number.isInteger(selected) || selected < 0 || !Array.isArray(page.swipes) ||
        !Array.isArray(page.swipes_data) || !Array.isArray(page.swipes_info) ||
        selected >= page.swipes.length || selected >= page.swipes_data.length ||
        page.swipes[selected] !== row.message || signature(page.swipes_data[selected]) !== signature(row.data))
        throw Error('原生楼层正文、变量或所选分支已变化，请重新读取');
    }
    const source = { rows, swipes };
    issued.set(source, { scope, signature: signature(source) });
    return source;
  }
  async function assert(source, guard) {
    receipt(source, guard);
    const current = await read(guard);
    receipt(source, guard);
    if (signature(source) !== signature(current)) throw Error('原生楼层正文、变量或消息页已变化，请重新读取');
    return current;
  }
  function floorSignature(source, messageId, guard) {
    receipt(source, guard);
    return signature([source.rows.find(row => row.message_id === messageId),
      source.swipes.find(row => row.message_id === messageId)]);
  }
  function writeDependencies(keys = []) {
    return Object.fromEntries([...new Set([KEY, 'cryptLord.hostApi', 'cryptLord.afterNativeHost',
      'cryptLord.stateStore', 'cryptLord.nativeSettlement', 'cryptLord.abilityState',
      'cryptLord.itemDerivation', 'cryptLord.attributeRecalculation', 'cryptLord.dynamicStatus',
      'cryptLord.playerProgression', 'cryptLord.npcProgression', 'cryptLord.audienceImagination',
      'cryptLord.readerMystic', 'cryptLord.mysteryReenactment', ...keys])].map(key => [key, modules[key]]));
  }
  function transaction(source, messageId, { guard, dependencies = writeDependencies(), compute,
    beforeWrite = async () => {}, onSaved = async result => result } = {}) {
    receipt(source, guard);
    const floor = source.rows.at(-1), store = dependencies['cryptLord.stateStore'];
    if (!store || floor?.message_id !== messageId || floor.role !== 'assistant' ||
      floor.is_hidden || !floor.data?.stat_data) throw Error('只能修改最新可见的 assistant 角色楼层');
    let phase = 'ready', pending, expected, writeOptions, preparedWrite;
    const valid = () => {
      receipt(source, guard);
      if (Object.entries(dependencies).some(([key, service]) => modules[key] !== service))
        throw Error('原生保存或派生服务已变化，请重新读取');
      return true;
    };
    const verify = async () => {
      try { valid(); await beforeWrite(); await assert(source, valid); valid(); }
      catch (error) { phase = 'invalid'; throw error; }
    };
    const inspectResult = async writeError => {
      try { valid(); } catch (error) { phase = 'invalid'; throw error; }
      let fresh;
      try { fresh = await read(valid); }
      catch (error) {
        phase = 'uncertain';
        throw Error(`保存状态待核对，未重复执行操作：${error.message || error}`);
      }
      try { valid(); } catch (error) { phase = 'invalid'; throw error; }
      const saved = structuredClone(source);
      saved.rows.find(row => row.message_id === messageId).data = structuredClone(expected);
      const page = saved.swipes.find(row => row.message_id === messageId);
      page.swipes_data[page.swipe_id] = structuredClone(expected);
      if (signature(saved) === signature(fresh)) {
        phase = 'saved';
        const result = { ...pending, data: structuredClone(expected),
          warning: writeError ? '保存回执异常，已核对原生楼层并确认保存。' : undefined };
        try { return await onSaved(result); }
        catch (error) { return { ...result, loaded: null, warning: `已确认保存，但面板复核失败：${error.message || error}` }; }
      }
      if (signature(source) === signature(fresh)) {
        phase = 'pending';
        throw Error(`${writeError?.message || '原生楼层尚未保存'}；本次结果已保留，可重试保存。`);
      }
      phase = 'invalid';
      throw Error('保存后楼层、变量或消息页已变化，未覆盖；请重新读取核对');
    };
    const save = async () => {
      if (phase !== 'pending') throw Error('当前结果不能重新提交，请核对保存或重新读取');
      phase = 'saving';
      await verify();
      let attempted = false, writeError;
      try {
        await store.writeAssistantData(messageId, structuredClone(pending.data), 'affected', verify, valid, {
          ...writeOptions,
          preparedWrite,
          async onWriteAttempt(next, receipt) {
            await verify();
            if (expected && signature(expected) !== signature(next)) {
              phase = 'invalid'; throw Error('派生结果已变化，未提交不同结果，请重新读取');
            }
            expected = structuredClone(next); preparedWrite = receipt; attempted = true;
          },
        });
      } catch (error) { writeError = error; }
      if (!attempted) {
        if (phase !== 'invalid') phase = 'pending';
        throw writeError || Error('未收到原生写入凭据，本次结果已保留');
      }
      return inspectResult(writeError);
    };
    return Object.freeze({
      status: () => phase, verify,
      async run() {
        if (phase !== 'ready') throw Error('本次操作已经执行，不能重复计算');
        phase = 'running';
        await verify();
        try {
          const result = await compute(structuredClone(floor.data), valid, verify);
          await verify();
          if (!result?.data) throw Error('操作未产生有效角色数据');
          writeOptions = result.writeOptions;
          pending = { ...result, data: structuredClone(result.data) }; delete pending.writeOptions;
        } catch (error) { if (phase !== 'invalid') phase = 'failed'; throw error; }
        if (signature(pending.data) === signature(floor.data)) {
          phase = 'saved';
          try { return await onSaved({ ...pending, unchanged: true }); }
          catch (error) { return { ...pending, unchanged: true, loaded: null,
            warning: `没有需要保存的变化，但面板复核失败：${error.message || error}` }; }
        }
        phase = 'pending';
        return save();
      },
      save,
      inspect() {
        if (phase !== 'uncertain') throw Error('当前无需核对保存');
        phase = 'checking'; return inspectResult();
      },
    });
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents?.();
  if (events?.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; }));
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed }), read, assert, signature,
    assertIdentity: (source, guard) => { receipt(source, guard); return true; }, floorSignature,
    writeDependencies, transaction,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
