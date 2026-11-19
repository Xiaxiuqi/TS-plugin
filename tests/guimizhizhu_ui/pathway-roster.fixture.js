(() => {
  'use strict';
  const after = modules['cryptLord.afterNativeHost'], host = modules['cryptLord.hostApi'];
  const handlers = new Map(), events = { CHAT_CHANGED: 'chat_changed', GENERATION_STARTED: 'generation_started',
    GENERATION_ENDED: 'generation_ended', GENERATION_STOPPED: 'generation_stopped' };
  const emit = (name, ...args) => {
    for (const handler of handlers.get(events[name] || name) || []) handler(...args);
  };
  after.bindEvent(events.CHAT_CHANGED, () => emit('CHAT_CHANGED'));
  after.tavernEvents = () => events;
  after.bindEvent = (name, handler) => {
    const set = handlers.get(name) || new Set();
    handlers.set(name, set); set.add(handler);
    return { stop() { set.delete(handler); } };
  };
  const flags = { branch: '保留备用分支', metadata: 0, revision: 0, lostReceipt: false,
    readFailure: false, failReadAfterWrite: false, conflictAfterWrite: false, failWrite: false };
  preview.transaction = { flags, emit, listeners: () => [...handlers.values()].reduce((sum, set) => sum + set.size, 0) };
  const get = host.getChatMessages?.bind(host);
  host.getChatMessages = async (range, options) => {
    if (flags.readFailure) throw Error('模拟原生读取失败');
    const rows = get ? await get(range) : (await after.listAssistantMessages()).filter(row =>
      range.includes('-') || row.message_id === Number(range));
    return structuredClone(options?.include_swipes ? rows.map(row => ({
      message_id: row.message_id, role: row.role, is_hidden: row.is_hidden, name: row.name, swipe_id: 1,
      swipes: [flags.branch, row.message], swipes_data: [{ preserved: 'alternate' }, row.data],
      swipes_info: [{ preserved: true }, { timestamp: new Date('2026-10-16T00:00:00Z'), revision: flags.metadata }],
    })) : rows);
  };
  const set = host.setChatMessages?.bind(host);
  host.setChatMessages = async (rows, options) => {
    if (flags.failWrite) throw Error('模拟写入失败');
    if (set) await set(rows, options);
    else {
      if (typeof writeFailure !== 'undefined' && writeFailure) throw Error('模拟写入失败');
      for (const row of rows) {
        if (row.message_id !== id || row.message_id === 0 || 'message' in row) throw Error('错误的原生楼层写入');
        stored = structuredClone(row.data); writes.push(row.message_id);
      }
    }
    if (flags.conflictAfterWrite) stored.stat_data.外部修改 = '不得覆盖';
    if (flags.failReadAfterWrite) flags.readFailure = true;
    if (flags.lostReceipt) throw Error('模拟保存回执丢失');
  };
  const abilities = modules['cryptLord.abilityState'], load = abilities.loadPool.bind(abilities), issued = new WeakMap();
  abilities.loadPool = async guard => {
    if (guard?.() === false) throw Error('规则读取已取消');
    const value = await load(guard);
    issued.set(value, { value: JSON.stringify(value), revision: flags.revision }); return value;
  };
  abilities.assertPool = async (value, guard) => {
    const receipt = issued.get(value);
    if (guard?.() === false || !receipt || receipt.value !== JSON.stringify(value)) throw Error('玩法规则来源无效');
    if (receipt.revision !== flags.revision) throw Error('玩法规则或角色绑定已变化');
  };
  abilities.locked = data => typeof data?.stat_data?.序列能力锁定 === 'boolean' ? data.stat_data.序列能力锁定 :
    localStorage.getItem('ST_LoM_AbilityLock') === 'true';
  // Every preview exercises the real state-store and response parser, not the old optimistic stubs.
  delete modules['cryptLord.stateStore'];
  delete modules['cryptLord.responseNormalizer'];
})();
