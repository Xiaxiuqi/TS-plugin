(() => {
  'use strict';
  const KEY = 'cryptLord.storyArchive', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  if (!contract || !modules['cryptLord.responseInspector']) throw Error('剧情归档依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const saveRecovery = modules['cryptLord.saveRecovery'];
  if (!saveRecovery) throw Error('剧情归档依赖的保存恢复模块尚未加载');
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const canonical = value => {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return [value.source, value.flags];
    if (Array.isArray(value)) return value.map(canonical);
    return record(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  };
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  // Other extensions toggle is_hidden/extra on old floors; that is not a source change.
  const stable = row => row && typeof row === 'object' ? { ...row, is_hidden: undefined, extra: undefined } : row;
  const tickets = new WeakMap(), revisions = new WeakMap(), turns = new Map(), subscriptions = [];
  let disposed = false, epoch = 0, manualEpoch = 0, generating = false, sequence = 0;
  let queue = Promise.resolve(), nativePending = null, nativeSequence = 0;
  function check(guard, token = epoch) {
    if (disposed || token !== epoch || modules[KEY] !== api || guard && !guard())
      throw new DOMException('剧情归档已取消', 'AbortError');
  }
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function scope(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      script: JSON.stringify(optionsFor(host)), chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()) };
  }
  function assertScope(identity, guard, token) {
    check(guard, token);
    const now = scope(modules['cryptLord.hostApi']);
    if (Object.keys(identity).some(key => identity[key] !== now[key])) throw Error('归档宿主、聊天或脚本已变化，请重新读取');
    return true;
  }
  function enqueue(run) { const task = queue.then(run); queue = task.catch(() => {}); return task; }
  function normalize(value) {
    if (value === undefined) return { version: 1, journeyAutomatic: true, novelAutomatic: false, index: 1 };
    if (!record(value) || value.version !== 1 || typeof value.journeyAutomatic !== 'boolean' ||
      typeof value.novelAutomatic !== 'boolean' || !Number.isSafeInteger(value.index) || value.index < 1)
      throw Error('剧情归档配置损坏，请检查脚本变量');
    return clone(value);
  }
  const entryName = (kind, index) => {
    if (!['journey', 'novelText'].includes(kind) || !Number.isSafeInteger(index) || index < 1) throw Error('归档分区或索引无效');
    const name = kind === 'journey' ? '本周目经历' : '小说模式';
    return index > 1 ? `${name}(${index})` : name;
  };
  function optionsFor(host) {
    const options = host.scriptVariableOptions?.() || { type: 'script', script_id: host.getScriptId() };
    if (options.type !== 'script' || !String(options.script_id || '').trim()) throw Error('无法确认归档脚本身份');
    return clone(options);
  }
  async function settings(host, guard, token) {
    check(guard, token);
    const identity = scope(host), options = optionsFor(host), values = clone(await host.getVariables(options));
    assertScope(identity, guard, token);
    check(guard, token);
    if (!record(values) || !same(options, optionsFor(host))) throw Error('归档配置或脚本身份不可确认');
    const loaded = { config: normalize(values[KEY]), revision: {
      options, exists: Object.hasOwn(values, KEY), raw: clone(values[KEY]),
    } };
    revisions.set(loaded.revision, { identity, value: clone(loaded.revision), epoch: token, manual: manualEpoch });
    return loaded;
  }
  async function readConfig(guard) { const token = epoch; return settings(await hostApi(), guard, token); }
  function recovery({ verify, write, inspect, pending, prefix }) {
    return saveRecovery.create({
      enqueue, verify, write, inspect, pending,
      isConflict: error => error.name === 'AbortError' || /变化|身份|来源|凭据|损坏/.test(error.message),
      onSaved: (result, failure) => ({ ...result, ...(failure ? { recovered: true, warning: `${prefix}，宿主响应丢失后已确认：${failure.message}` } : {}) }),
      text: {
        busy: '归档保存或核对正在进行', invalid: '归档凭据已失效，请重新读取',
        uncertain: '保存状态待核对，不能重复提交', notSubmitted: '宿主未执行更新器，可重试原结果',
        unchanged: `${prefix}提交结果尚未落盘，可重试原结果`,
        conflict: `${prefix}提交结果与预期不一致，请重新读取；未覆盖外部修改`,
        recheckFailed: error => `${prefix}，但复核失败：${error.message}`,
      },
    });
  }
  function beginConfig(value, revision, guard) {
    const issued = revision && revisions.get(revision);
    if (!issued || issued.epoch !== epoch || !same(issued.value, revision))
      throw Error('归档设置凭据无效或已修改，请重新读取');
    if (guard) (issued.guards ||= new Set()).add(guard);
    const desired = { ...normalize(issued.value.raw), ...normalize(value) }, expected = clone(issued.value), token = issued.epoch;
    if (issued.operation) {
      if (!same(issued.desired, desired)) throw Error('归档设置仍待恢复，请先核对或重新读取');
      return issued.operation;
    }
    const active = () => !generating && issued.manual === manualEpoch &&
      (!issued.guards || [...issued.guards].every(validate => validate()));
    const verify = async () => assertScope(issued.identity, active, token);
    let host;
    issued.desired = clone(desired);
    issued.operation = recovery({
      verify, prefix: '归档设置已保存', pending: () => ({ config: clone(desired), revision: null }),
      async write(submit) {
        await verify(); host = await hostApi();
        const before = await settings(host, active, token);
        if (!same(before.revision, expected)) throw Error('归档配置已变化，请重新读取');
        if (same(before.config, desired)) return { ...before, unchanged: true };
        await host.updateVariablesWith(values => {
          assertScope(issued.identity, active, token);
          if (!record(values) || !same(optionsFor(host), expected.options) ||
            Object.hasOwn(values, KEY) !== expected.exists || !same(values[KEY], expected.raw))
            throw Error('归档配置已变化，未覆盖');
          submit();
          return { ...values, [KEY]: clone(desired) };
        }, expected.options);
      },
      async inspect() {
        const after = await settings(host, active, token);
        if (!same(after.revision, (await settings(host, active, token)).revision)) throw Error('核对期间归档配置已变化');
        return same(after.revision.raw, desired) ? { saved: true, result: after } :
          { unchanged: same(after.revision, expected) };
      },
    });
    return issued.operation;
  }
  async function saveConfig(value, revision, guard) {
    const transaction = beginConfig(value, revision, guard);
    return { ...await transaction.save(), transaction };
  }
  async function binding(host, guard, token) {
    const character = clone(await host.getCharWorldbookNames('current'));
    check(guard, token);
    if (!record(character) || typeof character.primary !== 'string' || !character.primary.trim())
      throw Error('当前角色没有主世界书，未写入');
    return { character, script: optionsFor(host) };
  }
  function select(entries, name) {
    if (!Array.isArray(entries)) throw Error('主世界书不可读取');
    const rows = entries.filter(row => (row.name ?? row.comment) === name);
    if (rows.length > 1) throw Error(`归档条目「${name}」重名，未覆盖`);
    const target = rows[0] || null;
    if (target && (!Number.isSafeInteger(target.uid) || target.uid < 0 ||
      entries.filter(row => row.uid === target.uid).length !== 1)) throw Error('归档条目UID缺失或重复');
    if (target && typeof target.content !== 'string') throw Error(`归档条目「${name}」内容损坏，未覆盖`);
    return clone(target);
  }
  async function source(host, expected, guard, token, latestOnly = false) {
    check(guard, token);
    const reader = modules['cryptLord.nativeFloorSource'];
    const native = await reader.read(() => { check(guard, token); return true; });
    const floor = native.rows.find(row => row.message_id === expected.message_id), latest = native.rows.at(-1);
    const pages = native.swipes.filter(row => row.message_id === expected.message_id);
    await reader.assert(native, () => { check(guard, token); return true; });
    check(guard, token);
    if (!same(floor, expected) || floor?.role !== 'assistant' || floor.is_hidden ||
      !Array.isArray(pages) || pages.length !== 1) throw Error('归档来源楼层已变化，请重新读取');
    if (latestOnly && !same(latest, floor)) throw Error('归档回合之后已有新楼层');
    return { value: { pages: clone(pages), latest: clone(latest), signature: reader.signature(native) }, reader, native };
  }
  async function merge(kind, previous, incoming) {
    if (!incoming.trim()) throw Error('所选楼层没有可归档的内容');
    if (kind === 'journey') {
      const editor = await contract.waitGlobalInitialized('cryptLord.nativeEditor', { timeoutMs: 10000 });
      return { ...(await editor.mergeJourney(previous, incoming)), service: editor };
    }
    // Original novel mode appends a paragraph unless it already occurs in the entry.
    return { content: previous.includes(incoming) ? previous : previous + (previous ? '\n\n' : '') + incoming };
  }
  async function prepare(sourceFloor, kinds = ['journey', 'novelText'], guard, options = {}) {
    const token = epoch, manual = manualEpoch, floor = clone(sourceFloor), list = [...new Set(kinds)];
    const active = () => (options.automatic || !generating && manual === manualEpoch) && (!guard || guard());
    check(active, token);
    if (floor?.role !== 'assistant' || floor.is_hidden === true || !Number.isInteger(floor.message_id) || floor.message_id < 0 ||
      !list.length || list.some(kind => !['journey', 'novelText'].includes(kind))) throw Error('归档来源或分区无效');
    const host = await hostApi(), loaded = await settings(host, active, token);
    if (options.configRevision && !same(loaded.revision, options.configRevision)) throw Error('归档设置在生成期间已变化');
    const index = options.index ?? loaded.config.index, identity = await binding(host, active, token);
    const book = identity.character.primary, initial = await source(host, floor, active, token, options.latestOnly);
    const entries = clone(await host.getWorldbook(book)), extracted = modules['cryptLord.responseInspector'].parse(floor.message);
    const rows = [];
    for (const kind of list) {
      const name = entryName(kind, index), target = select(entries, name), incoming = extracted[kind].trim();
      const result = await merge(kind, target?.content || '', incoming);
      rows.push({ kind, name, target, incoming, content: result.content, serials: result.serials || [],
        changed: !target || target.content !== result.content });
    }
    check(active, token);
    if (!same(identity, await binding(host, active, token)) ||
      !same(initial.value, (await source(host, floor, active, token, options.latestOnly)).value) ||
      !same(loaded.revision, (await settings(host, active, token)).revision)) throw Error('归档来源或配置在读取期间已变化');
    const fresh = await host.getWorldbook(book);
    check(active, token);
    if (rows.some(row => !same(select(fresh, row.name), row.target))) throw Error('归档条目在读取期间已变化');
    const ticket = { floor, source: initial.value, identity, book, rows, revision: loaded.revision, epoch: token,
      manual, automatic: Boolean(options.automatic), latestOnly: Boolean(options.latestOnly) };
    tickets.set(ticket, { value: clone(ticket), editor: modules['cryptLord.nativeEditor'], parser: modules['cryptLord.responseInspector'],
      scope: scope(host), source: initial });
    return ticket;
  }
  function newEntry(entries, name, content) {
    const uid = Math.max(0, ...entries.map(row => Number.isSafeInteger(row.uid) ? row.uid : 0)) + 1;
    if (!Number.isSafeInteger(uid)) throw Error('归档条目UID空间无效');
    return { uid, name, content, enabled: false,
      strategy: { type: 'selective', keys: [name], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 }, probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null } };
  }
  function begin(ticket, guard) {
    const issued = tickets.get(ticket);
    if (!issued || !same(issued.value, ticket)) throw Error('归档凭据无效或已修改，请重新读取');
    if (guard) (issued.guards ||= new Set()).add(guard);
    if (issued.operation) return issued.operation;
    const input = clone(issued.value), token = input.epoch;
    const active = () => (input.automatic || !generating && input.manual === manualEpoch) &&
      (!issued.guards || [...issued.guards].every(validate => validate()));
    let host, originalBook, proposed;
    async function verify() {
      host = await hostApi();
      assertScope(issued.scope, active, token);
      check(active, token);
      if (issued.parser !== modules['cryptLord.responseInspector'] || issued.parser.status?.().ready === false ||
        input.rows.some(row => row.kind === 'journey') &&
        (issued.editor !== modules['cryptLord.nativeEditor'] || issued.editor.status?.().ready === false))
        throw Error('归档服务已变化，请重新读取');
      if (issued.source.reader !== modules['cryptLord.nativeFloorSource']) throw Error('归档楼层服务已变化');
      await issued.source.reader.assert(issued.source.native, () => assertScope(issued.scope, active, token));
      if (!same(input.source, (await source(host, input.floor, active, token, input.latestOnly)).value) ||
        !same(input.identity, await binding(host, active, token))) throw Error('归档楼层、消息页、末楼或绑定已变化');
      if (!same(input.revision, (await settings(host, active, token)).revision)) throw Error('归档配置已变化，请重新读取');
      check(active, token);
    }
    issued.operation = recovery({
      verify, prefix: '剧情已归档', pending: () => ({ rows: clone(input.rows) }),
      async write(submit) {
        host = await hostApi();
        await verify();
        const current = await host.getWorldbook(input.book);
        assertScope(issued.scope, active, token);
        if (originalBook && !same(current, originalBook)) throw Error('主世界书已变化，未覆盖');
        if (input.rows.some(row => !same(select(current, row.name), row.target))) throw Error('归档条目已变化，未覆盖');
        if (!input.rows.some(row => row.changed)) return { unchanged: true, rows: clone(input.rows) };
        await host.updateWorldbookWith(input.book, async entries => {
          if (originalBook && !same(entries, originalBook)) throw Error('主世界书已变化，未覆盖');
          if (input.rows.some(row => !same(select(entries, row.name), row.target))) throw Error('归档条目已变化，未覆盖');
          await verify();
          const fresh = await host.getWorldbook(input.book);
          check(active, token);
          if (!same(entries, fresh)) throw Error('主世界书在等待期间已变化，未覆盖');
          let next = clone(entries);
          for (const row of input.rows.filter(row => row.changed)) {
            next = row.target ? next.map(entry => entry.uid === row.target.uid ? { ...entry, content: row.content } : entry) :
              [...next, newEntry(next, row.name, row.content)];
          }
          assertScope(issued.scope, active, token);
          originalBook = clone(entries); proposed = clone(next); submit();
          return next;
        }, { render: 'debounced' });
      },
      async inspect() {
        const after = await host.getWorldbook(input.book);
        if (!same(after, await host.getWorldbook(input.book))) throw Error('核对期间主世界书已变化');
        return same(after, proposed) ? { saved: true, result: { rows: clone(input.rows) } } :
          { unchanged: same(after, originalBook) };
      },
    });
    return issued.operation;
  }
  async function commit(ticket, guard) {
    const issued = tickets.get(ticket);
    if (issued) check(() => (issued.value.automatic || !generating && issued.value.manual === manualEpoch) && (!guard || guard()), issued.value.epoch);
    const transaction = begin(ticket, guard);
    return { ...await transaction.save(), transaction };
  }
  async function prepareTurn(guard, type = 'normal') {
    const token = epoch, host = await hostApi();
    const reader = modules['cryptLord.nativeFloorSource'], native = await reader.read(guard);
    const before = native.rows, pages = native.swipes;
    check(guard, token);
    if (!Array.isArray(before) || !Array.isArray(pages)) throw Error('归档生成来源不可读取');
    const config = await settings(host, guard, token);
    // Disabled archival never needs a worldbook read or a new model request.
    if (!config.config.journeyAutomatic && !config.config.novelAutomatic) return null;
    const identity = await binding(host, guard, token);
    const entries = await host.getWorldbook(identity.character.primary);
    check(guard, token);
    const targets = ['journey', 'novelText'].filter(kind =>
      config.config[kind === 'journey' ? 'journeyAutomatic' : 'novelAutomatic'])
      .map(kind => ({ kind, name: entryName(kind, config.config.index), target: select(entries, entryName(kind, config.config.index)) }));
    const assistants = before.filter(row => row.role === 'assistant' && !row.is_hidden);
    const rewriting = ['regenerate', 'swipe'].includes(type) && before.at(-1)?.role === 'assistant';
    const origin = assistants.at(-1);
    const continuing = type === 'continue' || type === 'append' && before.at(-1)?.role === 'assistant';
    const previous = rewriting ? assistants.at(-2) : assistants.at(-1);
    await reader.assert(native, guard);
    check(guard, token);
    const turn = { ...config, identity, targets, source: clone(previous), origin: clone(origin), epoch: token, id: ++sequence, type,
      continuing, userSource: continuing || rewriting ? clone(before.filter(row => row.role === 'user' &&
        row.message_id < origin?.message_id).at(-1)) : undefined,
      sourcePages: clone(pages.find(row => row.message_id === previous?.message_id)) };
    turns.set(turn.id, { value: clone(turn), scope: scope(host), reader, native });
    while (turns.size > 8) turns.delete(turns.keys().next().value);
    return turn;
  }
  async function completeTurn(response, transaction, prepared) {
    const turn = prepared === undefined ? await nativePending : prepared;
    if (!turn) return { skipped: true };
    const issued = turns.get(turn.id), token = turn.epoch;
    if (!issued || !same(issued.value, turn)) throw Error('自动归档回合凭据已失效');
    const guard = () => !disposed && token === epoch && (!transaction.guard || transaction.guard());
    try {
      check(guard, token);
      assertScope(issued.scope, guard, token);
      if (issued.reader !== modules['cryptLord.nativeFloorSource']) throw Error('归档楼层服务已变化');
      issued.reader.assertIdentity(issued.native, guard);
      if (!same(turn.revision, (await settings(await hostApi(), guard, token)).revision)) throw Error('归档设置在生成期间已变化');
      const host = await hostApi(), current = await issued.reader.read(guard), rows = current.rows;
      await issued.reader.assert(current, guard);
      const floor = rows?.find(row => row.message_id === transaction.assistantMessageId && row.role === 'assistant');
      const user = rows?.find(row => row.message_id === transaction.userMessageId && row.role === 'user');
      check(guard, token);
      if (!floor || floor.is_hidden || !user || user.is_hidden || floor.message_id <= user.message_id || String(user.message) !== String(transaction.userText))
        throw Error('自动归档回合身份已变化');
      const previous = rows.filter(row => row.role === 'assistant' && row.message_id < user.message_id).at(-1);
      if (turn.continuing) {
        if (floor.message_id !== turn.origin?.message_id || !same(user, turn.userSource)) throw Error('归档续写来源已变化');
      } else if (!same(stable(previous), stable(turn.source)) || turn.userSource && !same(stable(user), stable(turn.userSource))) throw Error('归档回合前状态已变化');
      if (!turn.continuing && turn.source) {
        const pages = await host.getChatMessages(String(turn.source.message_id), { include_swipes: true });
        check(guard, token);
        if (!same(pages?.[0], turn.sourcePages)) throw Error('归档回合前状态消息页已变化');
      }
      // Generation may replace its target, but never another previously existing floor or branch.
      const protectedIds = issued.native.rows.filter(row => row.message_id !== floor.message_id).map(row => row.message_id);
      for (const id of protectedIds)
        if (issued.reader.floorSignature(issued.native, id, guard) !== issued.reader.floorSignature(current, id, guard))
          throw Error('归档回合前楼层或分支已变化');
      assertScope(issued.scope, guard, token);
      const parsed = modules['cryptLord.responseInspector'].parse(response);
      const stored = modules['cryptLord.responseInspector'].parse(floor.message);
      const kinds = ['journey', 'novelText'].filter(kind => parsed[kind] &&
        turn.config[kind === 'journey' ? 'journeyAutomatic' : 'novelAutomatic']);
      if (!kinds.length) return { skipped: true };
      if (kinds.some(kind => parsed[kind] !== stored[kind])) throw Error('保存楼层与本回合归档内容不一致');
      const ticket = await prepare(floor, kinds, guard, { automatic: true, latestOnly: true, configRevision: turn.revision });
      if (!same(ticket.identity, turn.identity)) throw Error('归档世界书绑定在生成期间已变化');
      if (ticket.rows.some(row => !same(row.target, turn.targets.find(target => target.kind === row.kind)?.target)))
        throw Error('归档条目在生成期间已变化，未覆盖');
      return await commit(ticket, guard);
    } finally { turns.delete(turn.id); }
  }
  function cancel() { epoch++; manualEpoch++; generating = false; nativePending = null; nativeSequence++; turns.clear(); }
  const quiet = (type, options, dryRun) => dryRun || ['quiet', 'quiet_prompt'].includes(type) ||
    options?.dryRun || options?.params?.dryRun || options?.quiet_prompt || options?.params?.quiet_prompt;
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  for (const [name, callback] of [
    ['CHAT_CHANGED', cancel], ['GENERATION_STOPPED', (type, options, dryRun) => { if (!quiet(type, options, dryRun)) cancel(); }],
    ['GENERATION_STARTED', (type, options, dryRun) => {
      if (quiet(type, options, dryRun)) return;
      generating = true; manualEpoch++;
    }],
    ['GENERATION_ENDED', (type, options, dryRun) => { if (!quiet(type, options, dryRun)) generating = false; }],
    ['GENERATION_AFTER_COMMANDS', (type, options, dryRun) => {
      if (disposed || quiet(type, options, dryRun)) return;
      nativePending = null; const request = ++nativeSequence, token = epoch;
      if (!['normal', 'continue', 'regenerate', 'swipe', 'append', '', undefined, null].includes(type)) return;
      nativePending = prepareTurn(() => !disposed && token === epoch && request === nativeSequence, type).catch(error => {
        if (!disposed && token === epoch) console.warn(`[${KEY}] 本轮自动归档未准备`, error);
        return null;
      });
      return nativePending;
    }],
  ]) if (events[name]) subscriptions.push(after.bindEvent(events[name], callback));
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, epoch, generating }),
    normalize, entryName, readConfig, beginConfig, saveConfig, prepare, begin, commit, prepareTurn, completeTurn,
    dispose() {
      disposed = true; cancel(); subscriptions.splice(0).forEach(subscription => subscription.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
