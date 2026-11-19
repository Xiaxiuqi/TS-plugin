(() => {
  'use strict';
  const KEY = 'cryptLord.battlePromptMode', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  if (!contract || !modules?.['cryptLord.responseInspector']) throw Error('战斗提示模式依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const names = Object.freeze(['【判定】战斗', '【世界】海洋环境', '【世界】神秘学基础',
    '【世界】灵性聚合', '【世界】简易年表（3.0版）']);
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const canonical = value => Object.prototype.toString.call(value) === '[object RegExp]' ? [value.source, value.flags] :
    Array.isArray(value) ? value.map(canonical) : record(value) ?
      Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  // Other extensions toggle is_hidden/extra on old floors; that is not a source change.
  const stable = row => row && typeof row === 'object' ? { ...row, is_hidden: undefined, extra: undefined } : row;
  const revisions = new WeakMap(), turns = new Map(), subscriptions = [];
  let disposed = false, epoch = 0, manualEpoch = 0, turnEpoch = 0, sequence = 0, queue = Promise.resolve(), nativePending = null, generating = false;
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function check(guard, token = epoch) {
    if (disposed || token !== epoch || guard && !guard()) throw new DOMException('战斗提示模式操作已取消', 'AbortError');
  }
  function enqueue(run) { const task = queue.then(run); queue = task.catch(() => {}); return task; }
  function detect(floor, previous) {
    const sessions = ['teamBattle', 'personalBattle'].map(key => floor?.data?.cryptLord?.[key]).filter(value => value !== undefined);
    if (sessions.length) {
      if (sessions.some(value => !record(value) || !['active', 'finished', 'ended', 'idle'].includes(value.status)))
        throw Error('原生战斗状态损坏，无法确定提示模式');
      if (sessions.some(value => value.status === 'active')) return true;
      // A completed session copied from the previous floor is not a new battle signal.
      if (!['teamBattle', 'personalBattle'].every(key =>
        same(floor?.data?.cryptLord?.[key], previous?.data?.cryptLord?.[key]))) return false;
    }
    return modules['cryptLord.responseInspector'].parse(floor?.message).novelText.includes('【战斗状态表】');
  }
  function select(entries) {
    if (!Array.isArray(entries)) throw Error('主要世界书不可读取');
    // Only the battle rule is mandatory; optional companions absent from this card's book are skipped.
    return names.flatMap((name, position) => {
      const list = entries.filter(row => String(row.name ?? row.comment ?? '').trim() === name);
      if (!list.length && position > 0) return [];
      if (list.length !== 1) throw Error(`「${name}」${list.length ? '重名' : '缺失'}`);
      const row = list[0];
      if (!Number.isSafeInteger(row.uid) || row.uid < 0 || entries.filter(item => item.uid === row.uid).length !== 1)
        throw Error(`「${name}」UID 缺失或重复`);
      if (typeof row.enabled !== 'boolean') throw Error(`「${name}」启用状态无效`);
      return [clone(row)];
    });
  }
  function describe(rows) {
    if (!rows) return 'unavailable';
    if (rows.every((row, index) => row.enabled === (index === 0))) return 'battle';
    if (rows.every((row, index) => row.enabled === (index !== 0))) return 'normal';
    return 'mixed';
  }
  function normalize(value) {
    if (value === undefined) return { version: 1, automatic: true };
    if (!record(value) || value.version !== 1 || typeof value.automatic !== 'boolean') throw Error('战斗提示自动开关配置损坏');
    return clone(value);
  }
  async function settings(host, guard, token) {
    check(guard, token);
    const options = { type: 'script', script_id: host.getScriptId() }, variables = await host.getVariables(options);
    check(guard, token);
    if (!record(variables) || host.getScriptId() !== options.script_id) throw Error('脚本配置身份不可确认');
    const raw = variables[KEY];
    return { config: normalize(raw), revision: { options, exists: Object.hasOwn(variables, KEY), raw: clone(raw) } };
  }
  async function identity(host, guard, token) {
    const character = clone(await host.getCharWorldbookNames('current'));
    check(guard, token);
    if (!record(character) || typeof character.primary !== 'string' || !character.primary.trim()) throw Error('当前角色未绑定主要世界书');
    return { character, script: host.getScriptId() };
  }
  function assertIssued(issued, guard, manual = false) {
    check(guard, issued.token);
    if (issued.revoked || issued.reader !== modules['cryptLord.nativeFloorSource'] ||
      issued.inspector !== modules['cryptLord.responseInspector']) throw Error('战斗提示来源服务或凭据已失效，请重新读取');
    issued.reader.assertIdentity(issued.native, guard);
    if (manual && (generating || issued.manualToken !== manualEpoch))
      throw new DOMException('生成已开始，旧手动操作已取消，请重新读取', 'AbortError');
    return true;
  }
  function publicReceipt(baseline) {
    const issued = revisions.get(baseline);
    if (!issued || issued.signature !== issued.reader.signature(baseline)) throw Error('战斗提示模式来源无效，请重新读取');
    return issued;
  }
  async function source(host, guard, token) {
    const reader = modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('原生楼层来源服务尚未加载');
    const native = await reader.read(guard);
    check(guard, token);
    return { reader, native, value: { floors: native.rows, pages: native.swipes } };
  }
  async function load(guard, token = epoch) {
    check(guard, token);
    const host = await hostApi(), before = await source(host, guard, token), config = await settings(host, guard, token);
    const scope = { reader: before.reader, native: before.native, inspector: modules['cryptLord.responseInspector'],
      token, manualToken: manualEpoch };
    const owned = () => assertIssued(scope, guard);
    owned();
    let binding = null, targets = null, error = '';
    try {
      binding = await identity(host, guard, token);
      targets = select(await host.getWorldbook(binding.character.primary));
      if (!same(binding, await identity(host, guard, token))) throw Error('主要世界书绑定已变化');
    } catch (failure) { check(guard, token); error = failure.message || String(failure); }
    if (targets && !same(targets, select(await host.getWorldbook(binding.character.primary)))) throw Error('读取期间战斗条目已变化');
    if (binding && !same(binding, await identity(host, guard, token))) throw Error('读取期间主要世界书绑定已变化');
    await before.reader.assert(before.native, owned);
    const configAfter = await settings(host, owned, token);
    check(guard, token);
    if (!same(config, configAfter)) throw Error('读取期间配置已变化');
    owned();
    const assistants = before.value.floors.filter(row => row.role === 'assistant'), floor = assistants.at(-1) || null;
    let recommended = null;
    try {
      if (floor?.is_hidden) throw Error('最新 assistant 楼层已隐藏');
      if (floor) recommended = detect(floor, assistants.at(-2));
    } catch (failure) { error = error || failure.message; }
    const reason = error || (!floor ? '没有真实 assistant 楼层' :
      before.value.floors.at(-1) !== floor ? '新 user 回合尚未完成，请等待正文保存' :
        generating ? '生成进行中，暂不能手动切换' : '');
    const result = { config: clone(config.config), entries: clone(targets), mode: describe(targets), book: binding?.character.primary || '',
      floor: clone(floor), recommended, editable: !reason, reason };
    revisions.set(result, { ...scope, source: before.value, config, binding, targets, recommended, error, floor,
      signature: before.reader.signature(result) });
    return result;
  }
  async function verify(expected, guard) {
    assertIssued(expected, guard);
    const fresh = await load(guard, expected.token), issued = revisions.get(fresh);
    if (issued.error || !same(issued.source, expected.source) || !same(issued.config, expected.config) ||
      !same(issued.binding, expected.binding) || !same(issued.targets, expected.targets))
      throw Error('楼层、消息页、战斗条目、绑定或配置已变化，请重新读取');
    return hostApi();
  }
  function apply(expected, battle, guard, automatic = false) {
    const input = expected, desired = Boolean(battle), callerGuard = guard;
    guard = () => assertIssued(input, callerGuard, !automatic);
    return enqueue(async () => {
      check(guard, input.token);
      if (!input.targets || input.error || !input.floor || input.recommended === null) throw Error(input.error || '没有有效的原生来源');
      if (!automatic && !same(input.source.floors.at(-1), input.floor))
        throw Error('新 user 回合尚未完成，请重新读取');
      assertIssued(input, guard, !automatic);
      const host = await verify(input, guard);
      if (input.targets.every((row, index) => row.enabled === (index === 0 ? desired : !desired)))
        return { unchanged: true, loaded: await load(guard, input.token) };
      const desiredTargets = input.targets.map((row, index) => ({ ...clone(row), enabled: index === 0 ? desired : !desired }));
      let attempted = false, failure;
      try { await host.updateWorldbookWith(input.binding.character.primary, async entries => {
        check(guard, input.token);
        if (!same(select(entries), input.targets)) throw Error('战斗条目已变化，未覆盖');
        await verify(input, guard);
        const fresh = await host.getWorldbook(input.binding.character.primary);
        check(guard, input.token);
        if (!same(fresh, entries)) throw Error('世界书在等待期间发生外部修改，未覆盖');
        if (!same(input.binding, await identity(host, guard, input.token)) ||
          !same(input.source, (await source(host, guard, input.token)).value) ||
          !same(input.config, await settings(host, guard, input.token))) throw Error('提交前原生来源或配置已变化，未覆盖');
        check(guard, input.token);
        if (!automatic && generating) throw Error('生成已开始，未切换模式');
        const ids = new Map(input.targets.map((row, index) => [row.uid, index === 0 ? desired : !desired]));
        attempted = true;
        return entries.map(row => ids.has(row.uid) ? { ...row, enabled: ids.get(row.uid) } : row);
      }, { render: 'debounced' }); } catch (error) { if (!attempted) throw error; failure = error; }
      try {
        const loaded = await load(guard, input.token);
        const fresh = revisions.get(loaded);
        if (!same(fresh.binding, input.binding) || !same(fresh.source, input.source) || !same(fresh.config, input.config))
          throw Error('提交后的来源、配置或绑定不一致');
        if (failure && same(fresh.targets, input.targets)) throw failure;
        if (!same(fresh.targets, desiredTargets)) throw Error('实际保存的完整条目与本次模式不一致');
        input.revoked = true;
        return { loaded, ...(failure ? { warning: '战斗提示模式已确认保存，但宿主响应丢失；未重复提交' } : {}) };
      } catch (error) {
        if (failure && error === failure) throw error;
        input.revoked = true;
        return { loaded: null, warning: `战斗提示模式保存结果无法确认，复核失败，请重新读取：${error.message || error}` };
      }
    });
  }
  function setMode(baseline, battle, guard) {
    try {
      if (typeof battle !== 'boolean') throw Error('战斗提示模式来源无效，请重新读取');
      return apply(publicReceipt(baseline), battle, guard);
    } catch (error) { return Promise.reject(error); }
  }
  function saveAutomatic(baseline, automatic, guard) {
    let issued;
    try {
      issued = publicReceipt(baseline);
      if (typeof automatic !== 'boolean') throw Error('自动开关来源无效');
    } catch (error) { return Promise.reject(error); }
    const callerGuard = guard;
    guard = () => assertIssued(issued, callerGuard, true);
    const expected = clone(issued.config), token = issued.token;
    return enqueue(async () => {
      const host = await hostApi(), fresh = await settings(host, guard, token);
      if (!same(fresh, expected)) throw Error('战斗提示配置已变化，请重新读取');
      await issued.reader.assert(issued.native, guard);
      if (issued.binding && !same(issued.binding, await identity(host, guard, token))) throw Error('主要世界书绑定已变化');
      const next = { ...fresh.config, automatic };
      if (same(next, fresh.config)) return { unchanged: true, loaded: await load(guard, token) };
      let attempted = false, failure;
      try { await host.updateVariablesWith(async variables => {
        check(guard, token);
        await issued.reader.assert(issued.native, guard);
        if (issued.binding && !same(issued.binding, await identity(host, guard, token))) throw Error('主要世界书绑定已变化');
        if (host.getScriptId() !== expected.revision.options.script_id ||
          Object.hasOwn(variables, KEY) !== expected.revision.exists || !same(variables[KEY], expected.revision.raw))
          throw Error('自动开关配置已变化，未覆盖');
        check(guard, token);
        attempted = true;
        return { ...variables, [KEY]: clone(next) };
      }, expected.revision.options); } catch (error) { if (!attempted) throw error; failure = error; }
      try {
        const loaded = await load(guard, token);
        if (failure && same(revisions.get(loaded).config, expected)) throw failure;
        if (!same(loaded.config, next)) throw Error('实际保存的自动开关不一致');
        issued.revoked = true;
        return { loaded, ...(failure ? { warning: '自动开关已确认保存，但宿主响应丢失；未重复提交' } : {}) };
      } catch (error) {
        if (failure && error === failure) throw error;
        issued.revoked = true;
        return { loaded: null, warning: `自动开关保存结果无法确认，复核失败，请重新读取：${error.message || error}` };
      }
    });
  }
  async function prepareTurn(guard, type = 'normal') {
    const token = epoch, ticketToken = turnEpoch, loaded = await load(guard, token), baseline = revisions.get(loaded);
    if (ticketToken !== turnEpoch) throw new DOMException('战斗提示回合准备已取消', 'AbortError');
    if (!baseline.config.config.automatic) return null;
    if (baseline.error) throw Error(baseline.error);
    assertIssued(baseline, guard);
    const assistants = baseline.source.floors.filter(row => row.role === 'assistant');
    const rewriting = ['regenerate', 'swipe'].includes(type) && baseline.source.floors.at(-1)?.role === 'assistant';
    const previous = rewriting ? assistants.at(-2) : assistants.at(-1);
    const origin = assistants.at(-1);
    const continuing = ['continue', 'append'].includes(type);
    const turn = { id: ++sequence, token, type, config: clone(baseline.config), binding: clone(baseline.binding),
      targets: clone(baseline.targets), previous: clone(previous), origin: clone(origin),
      user: continuing || rewriting ? clone(baseline.source.floors.filter(row => row.role === 'user' && row.message_id < origin?.message_id).at(-1)) : null };
    await baseline.reader.assert(baseline.native, guard);
    check(guard, token);
    if (ticketToken !== turnEpoch) throw new DOMException('战斗提示回合准备已取消', 'AbortError');
    turns.set(turn.id, { value: clone(turn), public: turn, baseline }); while (turns.size > 8) turns.delete(turns.keys().next().value);
    return turn;
  }
  function finishTurn() { turnEpoch++; turns.clear(); nativePending = null; }
  async function completeTurn(response, transaction, prepared) {
    const pending = nativePending, turn = prepared === undefined ? await pending : prepared;
    if (!turn) return { skipped: true };
    const issued = turns.get(turn.id);
    if (!issued || issued.public !== turn || !same(issued.value, turn)) throw Error('战斗提示回合凭据已失效');
    const guard = () => !disposed && epoch === turn.token && (!transaction.guard || transaction.guard());
    try {
      assertIssued(issued.baseline, guard);
      const loaded = await load(guard, turn.token), baseline = revisions.get(loaded);
      const rows = baseline.source.floors, user = rows.find(row => row.message_id === transaction.userMessageId && row.role === 'user');
      if (!loaded.floor || loaded.floor.is_hidden || loaded.floor.message_id !== transaction.assistantMessageId || !same(rows.at(-1), loaded.floor) ||
        !user || user.is_hidden || user.message_id >= loaded.floor.message_id || String(user.message) !== String(transaction.userText))
        throw Error('战斗提示回合身份或末楼已变化');
      if (['continue', 'append'].includes(turn.type)) {
        if (loaded.floor.message_id !== turn.origin?.message_id || !same(user, turn.user)) throw Error('续写来源已变化');
      } else if (!same(stable(rows.filter(row => row.role === 'assistant' && row.message_id < user.message_id).at(-1)), stable(turn.previous)))
        throw Error('回合前状态已变化');
      if (turn.user && !same(stable(user), stable(turn.user))) throw Error('回合 user 来源已变化');
      for (const row of issued.baseline.native.rows) {
        if (row.message_id === loaded.floor.message_id) continue;
        if (baseline.reader.floorSignature(issued.baseline.native, row.message_id, guard) !==
          baseline.reader.floorSignature(baseline.native, row.message_id, guard)) throw Error('生成前楼层或完整分支已变化');
      }
      if (rows.some(row => !issued.baseline.native.rows.some(old => old.message_id === row.message_id) &&
        row.message_id !== user.message_id && row.message_id !== loaded.floor.message_id))
        throw Error('生成期间出现其他回合楼层');
      if (modules['cryptLord.responseInspector'].parse(loaded.floor.message).novelText !==
        modules['cryptLord.responseInspector'].parse(response).novelText) throw Error('保存正文与回合响应不一致');
      if (!same(baseline.config, turn.config) || !same(baseline.binding, turn.binding) || !same(baseline.targets, turn.targets))
        throw Error('生成期间战斗提示配置、绑定或条目已变化');
      return await apply(baseline, loaded.recommended, guard, true);
    } finally {
      turns.delete(turn.id);
      if (nativePending === pending) {
        nativePending = null;
        void pending?.then(value => { if (value) turns.delete(value.id); });
      }
    }
  }
  async function observe() {
    if (disposed || generating || nativePending || turns.size) return { skipped: true };
    const token = epoch, guard = () => !disposed && token === epoch && !generating;
    const loaded = await load(guard, token);
    if (!loaded.config.automatic || !loaded.editable || !['teamBattle', 'personalBattle'].some(key =>
      loaded.floor?.data?.cryptLord?.[key] !== undefined)) return { skipped: true };
    return apply(revisions.get(loaded), loaded.recommended, guard, true);
  }
  function cancel() { epoch++; manualEpoch++; finishTurn(); generating = false; }
  const silent = (type, options, dryRun) => dryRun || options?.dryRun || type === 'quiet' || options?.quiet_prompt;
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  for (const [name, handler] of [
    ['CHAT_CHANGED', cancel], ['GENERATION_STOPPED', cancel],
    ['GENERATION_STARTED', (type, options, dryRun) => {
      if (silent(type, options, dryRun)) return;
      generating = true; manualEpoch++;
    }],
    ['GENERATION_ENDED', messageId => {
      generating = false;
      if (messageId !== undefined && (!Number.isSafeInteger(messageId) || messageId < 0)) finishTurn();
    }],
    ['GENERATION_AFTER_COMMANDS', (type, options, dryRun) => {
      if (disposed || silent(type, options, dryRun)) return;
      turnEpoch++; nativePending = null;
      if (!['normal', 'continue', 'append', 'regenerate', 'swipe', '', undefined, null].includes(type)) return;
      const token = epoch, request = turnEpoch;
      const pending = prepareTurn(() => !disposed && epoch === token && request === turnEpoch, type).catch(error => {
        if (!disposed && epoch === token) console.warn(`[${KEY}] 本轮自动切换未准备`, error); return null;
      });
      nativePending = pending;
      void pending.then(turn => { if (!turn && nativePending === pending) nativePending = null; });
      return pending;
    }],
  ]) if (events[name]) subscriptions.push(after.bindEvent(events[name], handler));
  const view = after?.getHost()?.window || window;
  const updated = () => { void observe().then(result => {
    if (result?.warning) console.warn(`[${KEY}] ${result.warning}`);
  }).catch(error => { if (!disposed && error.name !== 'AbortError') console.warn(`[${KEY}] 本地战斗提示切换未完成，可手动重试`, error); }); };
  view.addEventListener?.('cryptLord:variables-updated', updated);
  const api = Object.freeze({ names, detect, describe, load, setMode, saveAutomatic, prepareTurn, completeTurn, finishTurn, observe,
    status: () => ({ ready: !disposed, epoch, generating }),
    dispose() {
      disposed = true; cancel(); subscriptions.forEach(item => item?.stop());
      view.removeEventListener?.('cryptLord:variables-updated', updated);
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
