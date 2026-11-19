(() => {
  'use strict';
  const KEY = 'cryptLord.theaterActions';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw Error('剧场行动依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const ACTIONS = Object.freeze([
    Object.freeze({ id: 'staff', label: '寻找幕后工作人员', cost: 80, summary: '其他世界的物品' }),
    Object.freeze({ id: 'tickets', label: '寻找售票工作人员', cost: 50, summary: '穿越世界的票据' }),
    Object.freeze({ id: 'events', label: '寻找剧场活动工作人员', cost: 0, summary: '当前剧场活动' }),
    Object.freeze({ id: 'arena', label: '寻找角斗场工作人员', cost: 0, summary: '角斗场咨询' }),
  ]);
  const images = Object.freeze({
    theater: 'https://i.postimg.cc/76BNrNdx/ju-chang2.png',
    arena: 'https://i.postimg.cc/7L5j8pzG/6.png',
  });
  let disposed = false, pending = null, armed = null, injection = null, epoch = 0, queueBusy = false, nativeReady = false;
  const subscriptions = [];
  const versions = new WeakMap(), origins = new WeakMap(), settlements = new WeakMap(),
    confirmed = new Map(), awaiting = new Map();
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const text = value => String(value || '').trim();
  const revision = floor => JSON.stringify([floor.message_id, floor.role, floor.message, floor.data || {}]);
  const points = data => {
    const value = Number(data?.stat_data?.剧场点数);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  };
  function usable(guard) {
    if (disposed || modules[KEY] !== api || guard && !guard()) throw Error('剧场操作已取消');
  }
  function changed() {
    const view = modules['cryptLord.afterNativeHost']?.getHost()?.window || window;
    view.dispatchEvent?.(new view.Event('cryptLord:theater-action-changed'));
  }
  function clearTicket(clearPending = false) {
    epoch++;
    armed = null;
    try { injection?.uninject(); } catch (error) { console.warn(`[${KEY}] 提示清理失败`, error); }
    injection = null;
    if (clearPending) pending = null;
    changed();
  }
  async function snapshot(messageId, guard) {
    usable(guard);
    const token = epoch, reader = modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('原生楼层来源服务尚未加载');
    const source = await reader.read(guard), list = source.rows;
    await reader.assert(source, guard);
    usable(guard);
    if (epoch !== token || modules['cryptLord.nativeFloorSource'] !== reader) throw Error('剧场来源服务或回合已变化');
    const floors = list.filter(item => item?.role === 'assistant').sort((a, b) => b.message_id - a.message_id);
    const latest = floors[0];
    const floor = messageId === undefined ? latest : floors.find(item => item.message_id === messageId);
    if (!floor || floor.is_hidden) throw Error('所选 assistant 楼层不存在或已隐藏');
    const version = Object.freeze({ messageId: floor.message_id });
    versions.set(version, { reader, source, epoch: token,
      signature: reader.floorSignature(source, floor.message_id), floor: structuredClone(floor) });
    return { message: structuredClone(floor), latestId: latest.message_id,
      editable: latest.message_id === floor.message_id && list.at(-1)?.message_id === floor.message_id,
      points: points(floor.data), revision: version };
  }
  async function queue(actionId, messageId, expected, guard) {
    usable(guard);
    if (queueBusy || armed) throw Error('剧场行动正在处理，请稍后再试');
    if (!nativeReady) throw Error('原生剧场回合监听不可用，未准备行动');
    const action = ACTIONS.find(item => item.id === actionId);
    if (!action) throw Error('未知剧场行动');
    queueBusy = true;
    const token = epoch;
    try {
      const origin = expected && versions.get(expected);
      if (!origin || origin.epoch !== epoch) throw Error('剧场楼层凭据无效，请重新读取');
      const current = await snapshot(messageId, guard);
      usable(guard);
      if (token !== epoch) throw Error('聊天或生成已变化');
      if (current.latestId !== messageId) throw Error('只能从最新 assistant 楼层准备剧场行动');
      if (!current.editable) throw Error('已有新的用户回合，请等待完成后重新读取');
      if (origin.floor.message_id !== messageId || modules['cryptLord.nativeFloorSource'] !== origin.reader)
        throw Error('剧场来源服务已变化，请重新读取');
      await origin.reader.assert(origin.source, guard);
      if (current.points < action.cost) throw Error(`剧场点数不足 ${action.cost} 点`);
      const input = await contract.waitGlobalInitialized('cryptLord.inputAdapter', { timeoutMs: 10000 });
      usable(guard);
      if (token !== epoch) throw Error('聊天或生成已变化');
      await origin.reader.assert(origin.source, guard);
      usable(guard);
      if (token !== epoch || modules['cryptLord.inputAdapter'] !== input) throw Error('剧场输入来源已变化');
      const composer = modules['cryptLord.afterNativeHost']?.getHost()?.document?.querySelector('#send_textarea');
      const previousInput = pending && composer?.value === pending.label ? pending.previousInput : composer?.value || '';
      if (await input.submit(action.label, 'crypt-lord-theater') !== true) throw Error('原生输入框未接受剧场行动');
      usable(guard);
      if (token !== epoch) throw Error('聊天或生成已变化');
      pending = { actionId, label: action.label, cost: action.cost, sourceId: messageId,
        revision: expected, points: current.points, previousInput, error: '' };
      origins.set(pending, origin);
      changed();
      return structuredClone(pending);
    } finally { queueBusy = false; }
  }
  function cancel() {
    usable();
    if (armed || queueBusy) throw Error('本回合剧场行动正在处理');
    const composer = modules['cryptLord.afterNativeHost']?.getHost()?.document?.querySelector('#send_textarea');
    if (pending && composer?.value === pending.label) {
      const input = modules['cryptLord.inputAdapter'];
      if (!input?.setInputText) throw Error('原生输入框恢复接口不可用，未取消行动');
      input.setInputText(pending.previousInput);
    }
    clearTicket(true);
    return true;
  }
  async function beforeGeneration(type, options, dryRun) {
    if (disposed || dryRun || ['quiet', 'dryRun'].includes(type) || options?.dryRun || options?.quiet_prompt) return;
    clearTicket();
    if (!['normal', '', undefined, null].includes(type) || !pending) return;
    const prepared = pending, token = epoch;
    try {
      const origin = origins.get(prepared), reader = modules['cryptLord.nativeFloorSource'];
      if (!origin || reader !== origin.reader) throw Error('剧场来源服务已变化，请重新准备行动');
      reader.assertIdentity(origin.source);
      const source = await reader.read();
      const api = await host(), users = source.rows;
      usable();
      if (token !== epoch || pending !== prepared) return;
      const latest = users.at(-1);
      const composer = modules['cryptLord.afterNativeHost']?.getHost()?.document?.querySelector('#send_textarea');
      const composerText = text(composer?.value);
      const existingUser = !composerText && latest?.role === 'user' && text(latest.message) === prepared.label &&
        latest.message_id > prepared.sourceId;
      if (composerText !== prepared.label && !existingUser) {
        clearTicket(true);
        return;
      }
      const floor = users.find(row => row.message_id === prepared.sourceId);
      const latestAssistant = users.filter(row => row.role === 'assistant').at(-1);
      if (!floor || floor.is_hidden || latestAssistant?.message_id !== prepared.sourceId ||
        reader.floorSignature(source, prepared.sourceId) !== origin.signature ||
        latest?.message_id !== prepared.sourceId && !existingUser)
        throw Error('剧场来源楼层已变化，请重新准备行动');
      if (points(floor.data) < prepared.cost) throw Error('剧场点数不足');
      await reader.assert(source);
      usable();
      if (token !== epoch || pending !== prepared) return;
      injection = api.injectPrompts([{
        id: 'cryptLord.theater.native', role: 'system', position: 'in_chat', depth: 0, should_scan: false,
        content: `本回合剧场行动：${prepared.label}。\n费用：${prepared.cost} 点；结算后基础余额：${prepared.points - prepared.cost} 点。\n${prepared.cost ? '本回合剧场点数由脚本在 assistant 楼层成功保存时统一结算，模型不要再次增减剧场点数。' : '本次咨询免费，其他世界书奖励和变量变更按正常规则输出。'}根据当前世界书的剧场或角斗场规则回应这次行动。`,
      }], { once: true });
      prepared.error = '';
      // SillyTavern emits this event before creating the new user floor.
      armed = { ...structuredClone(prepared), epoch: token, baseline: Number(latest?.message_id ?? prepared.sourceId),
        userId: existingUser ? latest.message_id : null };
      origins.set(armed, origin);
      changed();
    } catch (error) {
      if (token === epoch && pending === prepared) { prepared.error = error.message || String(error); changed(); }
      console.warn(`[${KEY}] 剧场回合未绑定，未扣费`, error);
    }
  }
  async function settle(data, transaction) {
    usable();
    const requestEpoch = epoch;
    const reader = modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('剧场来源服务已卸载');
    const loaded = await reader.read(transaction.guard);
    const target = loaded.rows.find(row => row.message_id === transaction.assistantMessageId);
    usable();
    if (requestEpoch !== epoch) return { applied: false };
    const saved = target?.data?.cryptLord?.theaterAction;
    const action = ACTIONS.find(item => item.id === saved?.actionId);
    const completed = confirmed.get(transaction.assistantMessageId) || awaiting.get(transaction.assistantMessageId);
    const repeated = completed && saved && reader.signature(saved) === reader.signature(completed.receipt) &&
      saved.userId === transaction.userMessageId &&
      saved.label === text(transaction.userText) && saved.assistantId === transaction.assistantMessageId &&
      completed.userSignature === reader.floorSignature(loaded, transaction.userMessageId) &&
      completed.swipeId === loaded.swipes.find(row => row.message_id === transaction.assistantMessageId)?.swipe_id &&
      action?.label === saved.label && action.cost === saved.cost &&
      Number.isInteger(saved.points) && saved.points >= saved.cost &&
      Number.isInteger(saved.sourceId) && saved.sourceId < saved.userId && saved.userId < saved.assistantId;
    if (completed && saved && !repeated) throw Error('剧场已保存结算的用户回合或消息分支已变化，请重新读取');
    const ticket = repeated ? saved : armed;
    const origin = repeated ? completed.origin : ticket && origins.get(ticket);
    const userId = transaction.userMessageId;
    if (!ticket || ticket.userId !== null && ticket.userId !== userId ||
      ticket.userId === null && (!Number.isInteger(userId) || userId <= ticket.baseline) ||
      ticket.label !== text(transaction.userText) ||
      !String(transaction.generationId || '').startsWith('native-host-')) {
      return { applied: false, warning: pending?.error && pending.label === text(transaction.userText)
        ? `剧场行动未结算：${pending.error}` : '' };
    }
    if (!repeated && (ticket.epoch !== epoch || ticket.sourceId >= userId || target?.role !== 'assistant')) return { applied: false };
    if (!origin || origin.reader !== reader) throw Error('剧场来源服务已变化，未扣费');
    reader.assertIdentity(origin.source, transaction.guard);
    const source = loaded.rows.find(row => row.message_id === ticket.sourceId);
    const user = loaded.rows.find(row => row.message_id === userId);
    const previousAssistant = loaded.rows.filter(item => item.role === 'assistant' && item.message_id < userId).at(-1);
    const previousUser = loaded.rows.filter(item => item.role === 'user' && item.message_id < target?.message_id).at(-1);
    usable();
    if (requestEpoch !== epoch) return { applied: false };
    if (!repeated && ticket.epoch !== epoch) return { applied: false };
    if (!source || source.is_hidden || user?.is_hidden || target?.is_hidden ||
      previousAssistant?.message_id !== ticket.sourceId || previousUser?.message_id !== userId ||
      loaded.rows.at(-1)?.message_id !== target?.message_id ||
      user?.role !== 'user' || text(user.message) !== ticket.label ||
      reader.floorSignature(loaded, ticket.sourceId) !== origin.signature) {
      if (pending) { pending.error = '剧场来源楼层已变化，未扣费，请重新准备行动'; changed(); }
      return { applied: false, warning: '剧场来源楼层已变化，未扣费，请重新准备行动。' };
    }
    await reader.assert(loaded, transaction.guard);
    usable(transaction.guard);
    if (requestEpoch !== epoch) throw Error('剧场回合已变化，未扣费');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('剧场结算数据无效');
    data.stat_data = data.stat_data && typeof data.stat_data === 'object' && !Array.isArray(data.stat_data) ? data.stat_data : {};
    if (ticket.cost) data.stat_data.剧场点数 = ticket.points - ticket.cost;
    const receipt = { actionId: ticket.actionId, label: ticket.label, cost: ticket.cost, points: ticket.points,
      sourceId: ticket.sourceId, userId, assistantId: transaction.assistantMessageId };
    data.cryptLord = { ...data.cryptLord, theaterAction: receipt };
    if (!repeated) ticket.userId = userId;
    const result = { applied: true, receipt, epoch: ticket.epoch };
    settlements.set(result, { reader, loaded, origin, epoch,
      signature: reader.signature(result), repeated: Boolean(repeated) });
    awaiting.clear();
    awaiting.set(transaction.assistantMessageId, { receipt: structuredClone(receipt), origin,
      userSignature: reader.floorSignature(loaded, userId),
      swipeId: loaded.swipes.find(row => row.message_id === transaction.assistantMessageId).swipe_id });
    return result;
  }
  function guardSettlement(result, guard) {
    const saved = result && settlements.get(result);
    usable(guard);
    if (!saved || modules['cryptLord.nativeFloorSource'] !== saved.reader ||
      saved.epoch !== epoch || saved.signature !== saved.reader.signature(result)) throw Error('剧场结算凭据已变化，未写入');
    saved.reader.assertIdentity(saved.loaded, guard);
    return true;
  }
  async function assertSettlement(result, guard) {
    guardSettlement(result, guard);
    const saved = settlements.get(result);
    await saved.reader.assert(saved.loaded, guard);
    return guardSettlement(result, guard);
  }
  function consume(result, data) {
    const saved = result && settlements.get(result);
    if (!saved || !result.applied || saved.epoch !== epoch ||
      modules['cryptLord.nativeFloorSource'] !== saved.reader ||
      saved.signature !== saved.reader.signature(result) ||
      saved.reader.signature(data?.cryptLord?.theaterAction) !== saved.reader.signature(result.receipt)) return false;
    saved.reader.assertIdentity(saved.loaded);
    confirmed.clear();
    confirmed.set(result.receipt.assistantId, awaiting.get(result.receipt.assistantId));
    awaiting.clear();
    if (!saved.repeated || pending?.sourceId === result.receipt.sourceId && pending.label === result.receipt.label)
      clearTicket(true);
    return true;
  }
  function install() {
    const after = modules['cryptLord.afterNativeHost'];
    const events = after?.tavernEvents();
    if (!events?.GENERATION_AFTER_COMMANDS || !events.CHAT_CHANGED || !events.GENERATION_STOPPED) return;
    for (const [name, fn] of [[events.GENERATION_AFTER_COMMANDS, beforeGeneration],
      [events.GENERATION_STOPPED, () => clearTicket()], [events.CHAT_CHANGED, () => {
        confirmed.clear(); awaiting.clear(); clearTicket(true);
      }]]) {
      const subscription = after.bindEvent(name, fn);
      if (!subscription) { subscriptions.splice(0).forEach(item => item.stop()); return; }
      subscriptions.push(subscription);
    }
    nativeReady = true;
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed, nativeReady, busy: queueBusy || Boolean(armed),
      settlementMessageId: awaiting.keys().next().value ?? confirmed.keys().next().value ?? null,
      pending: pending ? structuredClone(pending) : null }),
    actions: () => ACTIONS, images, points, revision, snapshot, queue, cancel, settle, guardSettlement, assertSettlement, consume,
    dispose() {
      clearTicket(true);
      disposed = true;
      nativeReady = false;
      confirmed.clear();
      awaiting.clear();
      subscriptions.splice(0).forEach(item => item.stop());
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  install();
})();
