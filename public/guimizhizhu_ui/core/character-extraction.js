(() => {
  'use strict';
  const KEY = 'cryptLord.characterExtraction', BOOK = '1源堡', LIBRARY = '2历史孔隙';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract || !modules['cryptLord.responseInspector']) throw Error('角色提取依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const saveRecovery = modules['cryptLord.saveRecovery'];
  if (!saveRecovery) throw Error('角色提取依赖的保存恢复模块尚未加载');
  let disposed = false, epoch = 0, queue = Promise.resolve(), sequence = 0, nativePending = null;
  let generating = false, manualEpoch = 0, requestSequence = 0;
  const tickets = new WeakMap(), revisions = new WeakMap(), turns = new Map(), subscriptions = [];
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const canonical = value => {
    if (Object.prototype.toString.call(value) === '[object Date]') return ['Date', value.toISOString()];
    if (Object.prototype.toString.call(value) === '[object RegExp]') return [value.source, value.flags];
    if (Array.isArray(value)) return value.map(canonical);
    if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard())
      throw new DOMException('角色入库操作已取消', 'AbortError');
  }
  const readerApi = () => modules['cryptLord.nativeFloorSource'];
  function scope(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost();
    return { host, after, document: surface?.document, window: surface?.window,
      script: JSON.stringify(optionsFor(host)), chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()) };
  }
  function assertScope(expected, guard, token) {
    check(guard, token);
    const current = scope(modules['cryptLord.hostApi']);
    if (Object.keys(expected).some(key => expected[key] !== current[key]))
      throw Error('角色入库宿主、聊天或脚本身份已变化，请重新读取');
  }
  function enqueue(run) { const task = queue.then(run); queue = task.catch(() => {}); return task; }
  function fields(content) {
    const result = Object.create(null);
    if (typeof content !== 'string') return result;
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('<')) continue;
      const pipe = line.indexOf('|'), colon = line.search(/[:：]/);
      if (pipe > 0 && (colon === -1 || pipe < colon)) result[line.slice(0, pipe).trim()] = line.slice(pipe + 1).trim();
      else if (colon > 0) result[line.slice(0, colon).trim()] = line.slice(colon + 1).replace(/^\s*\|/, '').trim();
    }
    return result;
  }
  function resolveName(content) {
    const values = fields(content), candidates = ['姓名', '名称', '名字', 'Name', 'name', 'NAME'];
    for (const key of candidates) {
      const value = String(values[key] || '').trim();
      if (value && !candidates.includes(value)) return value;
    }
    return null;
  }
  const placeholder = content => !String(content || '').trim() || String(content).includes('正在等待AI生成角色设定');
  const extract = message => modules['cryptLord.responseInspector'].parse(message).characterCard;
  function normalize(value) {
    if (value === undefined) return { version: 1, automatic: true };
    if (!record(value) || value.version !== 1 || typeof value.automatic !== 'boolean') throw Error('角色入库配置损坏，请检查脚本变量');
    return clone(value);
  }
  const optionsFor = host => ({ type: 'script', script_id: host.getScriptId() });
  async function settings(host, guard, token) {
    check(guard, token);
    const identity = scope(host), options = optionsFor(host), variables = await host.getVariables(options);
    check(guard, token);
    if (!record(variables) || !same(options, optionsFor(host))) throw Error('角色入库脚本配置或身份不可确认');
    const raw = variables[KEY];
    assertScope(identity, guard, token);
    const result = { config: normalize(raw), revision: { options, exists: Object.hasOwn(variables, KEY), raw: clone(raw) } };
    revisions.set(result.revision, { value: clone(result.revision), scope: identity, token, manual: manualEpoch });
    return result;
  }
  async function readConfig(guard) {
    const token = epoch;
    return settings(await hostApi(), guard, token);
  }
  function beginConfig(config, revision, guard) {
    const expected = clone(revision), issued = revisions.get(revision), token = epoch;
    if (!issued || !same(issued.value, expected)) throw Error('角色入库配置凭据无效，请重新读取');
    const next = { ...normalize(expected.raw), automatic: normalize(config).automatic };
    const valid = () => !generating && issued.manual === manualEpoch && (!guard || guard());
    const verify = async () => assertScope(issued.scope, valid, issued.token);
    let host;
    const operation = recovery({
      verify,
      async write(submitted) {
        await verify(); host = await hostApi();
        const before = await settings(host, valid, token);
        if (!same(before.revision, expected)) throw Error('角色入库配置已变化，请重新读取');
        if (same(before.config, next)) return { ...before, unchanged: true };
        await host.updateVariablesWith(variables => {
          assertScope(issued.scope, valid, token);
          if (!same(optionsFor(host), expected.options) || Object.hasOwn(variables, KEY) !== expected.exists ||
            !same(variables[KEY], expected.raw)) throw Error('角色入库配置已变化，未覆盖');
          submitted(); revisions.delete(revision);
          return { ...variables, [KEY]: clone(next) };
        }, expected.options);
      },
      async inspect() {
        const after = await settings(host, valid, token);
        if (!same(after.revision, (await settings(host, valid, token)).revision)) throw Error('核对期间角色配置已变化');
        await verify();
        if (same(after.config, next) && after.revision.exists && same(after.revision.raw, next))
          return { saved: true, result: after };
        if (same(after.revision, expected)) return { unchanged: true };
        return { conflict: true };
      },
      prefix: '角色入库设置已保存', mismatch: '角色设置已提交，但持久化配置不一致',
      pending: () => ({ config: clone(next), revision: null }),
      finish: () => revisions.delete(revision),
      retry: () => revisions.set(revision, issued),
    });
    return operation;
  }
  async function saveConfig(config, revision, guard) {
    const transaction = beginConfig(config, revision, guard);
    return { ...await transaction.save(), transaction };
  }
  function recovery({ verify, write, inspect, prefix, mismatch, pending, finish, retry }) {
    return saveRecovery.create({
      enqueue, verify, write, inspect, pending, finish, retry,
      isConflict: error => error.name === 'AbortError' || /变化|身份|来源|凭据|损坏/.test(error.message),
      onSaved: (result, failure) => ({ ...result, ...(failure ? { warning: `${prefix.includes('设置') ? '角色设置已保存' : '角色已入库'}，宿主响应丢失后已确认：${failure.message}` } : {}) }),
      inspected(response, phase) {
        if (phase === 'saved' && !response.warning) response.warning = `${prefix}，核对后已确认`;
        return response;
      },
      text: {
        busy: '角色保存或核对正在进行', invalid: '角色保存凭据已失效，请重新读取',
        uncertain: '保存状态待核对，请先核对保存，不能重复提交', notSubmitted: '宿主未执行更新器，尚未提交，可重试原结果',
        unchanged: `${mismatch}；核对确认尚未保存，可重试原结果`,
        conflict: `${mismatch}，请重新读取；未覆盖外部修改`,
        recheckFailed: error => `${prefix}，但复核失败：${error.message}`,
      },
    });
  }
  async function binding(host, guard, token) {
    const character = await host.getCharWorldbookNames('current'), global = await host.getGlobalWorldbookNames();
    const chat = await host.getChatWorldbookName('current'), names = await host.getWorldbookNames();
    check(guard, token);
    if (!record(character) || !Array.isArray(global) || !Array.isArray(names)) throw Error('角色世界书绑定不可确认');
    if (![character.primary, ...(character.additional || []), ...global, chat].includes(BOOK))
      throw Error('当前聊天未挂载「1源堡」，不会改动其他世界书');
    return { character: clone(character), global: clone(global), chat, script: optionsFor(host), library: names.includes(LIBRARY) };
  }
  function select(entries, name) {
    if (!Array.isArray(entries)) throw Error('角色世界书不可读取');
    const matches = entries.filter(row => String(row.name ?? row.comment ?? '').trim() === name);
    if (matches.length > 1) throw Error(`角色「${name}」条目重名，请先整理世界书`);
    const found = matches[0] || null;
    if (found && (!Number.isSafeInteger(found.uid) || found.uid < 0 || entries.filter(row => row.uid === found.uid).length !== 1))
      throw Error(`角色「${name}」UID缺失或重复`);
    if (found && found.content !== undefined && typeof found.content !== 'string') throw Error(`角色「${name}」内容格式损坏，未覆盖`);
    return clone(found);
  }
  async function targets(host, name, guard, token) {
    const identity = await binding(host, guard, token);
    const primary = select(await host.getWorldbook(BOOK), name);
    const library = identity.library ? select(await host.getWorldbook(LIBRARY), name) : null;
    check(guard, token);
    if (!same(identity, await binding(host, guard, token))) throw Error('角色世界书绑定已变化，请重新读取');
    return { identity, primary, library };
  }
  async function verifyFloor(origin, guard, token, latestOnly, floor) {
    if (origin.reader !== readerApi()) throw Error('角色来源服务已变化');
    await origin.reader.assert(origin.native, guard);
    check(guard, token);
    if (latestOnly && !same(origin.native.rows.at(-1), floor))
      throw Error('角色回合之后已有新楼层，不归档旧回合');
  }
  async function prepare(source, guard, latestOnly = false) {
    const token = epoch, floor = clone(source);
    check(guard, token);
    if (floor?.role !== 'assistant' || !Number.isInteger(floor.message_id) || floor.message_id < 0)
      throw Error('角色入库仅支持真实assistant楼层');
    const content = extract(floor.message), name = resolveName(content);
    if (!content) throw Error('所选楼层没有可入库的角色内容');
    if (!name) throw Error('未找到角色姓名（支持“姓名|”或“Name:”），不会猜测角色');
    const host = await hostApi();
    const reader = readerApi(), native = await reader.read(guard), identity = scope(host);
    if (floor.is_hidden || !same(native.rows.find(row => row.message_id === floor.message_id), floor))
      throw Error('角色来源楼层已变化或隐藏，请重新读取');
    const origin = { reader, native };
    await verifyFloor(origin, guard, token, latestOnly, floor);
    const target = await targets(host, name, guard, token);
    await verifyFloor(origin, guard, token, latestOnly, floor);
    assertScope(identity, guard, token);
    const existing = target.primary || target.library;
    const action = existing && !placeholder(existing.content) ? 'existing' : target.primary ? 'fill' : 'create';
    const ticket = { floor, content, name, action, ...target, epoch: token, latestOnly };
    tickets.set(ticket, { value: clone(ticket), ...origin, scope: identity, manual: manualEpoch }); return ticket;
  }
  function newEntry(entries, name, content) {
    const uid = Math.max(0, ...entries.map(row => Number.isSafeInteger(row.uid) ? row.uid : 0)) + 1;
    if (!Number.isSafeInteger(uid)) throw Error('角色条目UID空间无效，未创建');
    return { uid,
      name, content, enabled: true,
      strategy: { type: 'selective', keys: [name], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: 'before_character_definition', role: 'system', depth: 0, order: 260 }, probability: 100,
      recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null } };
  }
  function begin(ticket, guard, configRevision = null) {
    const issued = tickets.get(ticket);
    if (!issued || !same(issued.value, ticket)) throw Error('角色入库凭据无效或已修改，请重新读取');
    const input = clone(issued.value), expectedConfig = clone(configRevision), configReceipt = revisions.get(configRevision), token = epoch;
    const valid = () => (!guard || guard()) && (input.latestOnly || !generating && issued.manual === manualEpoch);
    let beforeEntries, proposed, host;
    async function verify() {
      assertScope(issued.scope, valid, input.epoch);
      if (expectedConfig && (!configReceipt || !same(configReceipt.value, expectedConfig))) throw Error('角色配置凭据无效');
      host = await hostApi();
      await verifyFloor(issued, valid, token, input.latestOnly, input.floor);
      if (!same(await binding(host, valid, token), input.identity)) throw Error('角色世界书绑定已变化，未覆盖');
      const library = input.identity.library ? select(await host.getWorldbook(LIBRARY), input.name) : null;
      if (!same(library, input.library)) throw Error('角色副库条目已变化，未覆盖');
      if (expectedConfig) {
        assertScope(configReceipt.scope, valid, configReceipt.token);
        if (!same((await settings(host, valid, token)).revision, expectedConfig)) throw Error('角色自动入库配置已变化，未写入');
      }
      assertScope(issued.scope, valid, token);
    }
    return recovery({
      verify,
      async write(submitted) {
        await verify();
        const current = await targets(host, input.name, valid, token);
        if (!same(current.primary, input.primary)) throw Error('角色条目已变化，未覆盖');
        if (input.action === 'existing') return { name: input.name, existing: true, unchanged: true };
        await host.updateWorldbookWith(BOOK, async entries => {
          assertScope(issued.scope, valid, token);
          if (!same(select(entries, input.name), input.primary)) throw Error('角色条目已变化，未覆盖');
          if (beforeEntries && !same(beforeEntries, entries)) throw Error('角色世界书已变化，不能重试旧结果');
          await verify();
          const fresh = await host.getWorldbook(BOOK);
          if (!same(fresh, entries)) throw Error('角色世界书在等待期间已变化，未覆盖');
          assertScope(issued.scope, valid, token);
          if (!beforeEntries) {
            beforeEntries = clone(entries);
            proposed = input.primary ? { ...input.primary, content: input.content, enabled: true } :
              newEntry(entries, input.name, input.content);
          }
          submitted(); tickets.delete(ticket);
          return input.primary ? entries.map(row => row.uid === input.primary.uid ? clone(proposed) : row) : [...entries, clone(proposed)];
        }, { render: 'debounced' });
      },
      async inspect() {
        const rows = await host.getWorldbook(BOOK);
        if (!same(rows, await host.getWorldbook(BOOK))) throw Error('核对期间角色世界书已变化');
        await verify();
        const actual = select(rows, input.name), protectedRows = rows.filter(row => row.uid !== actual?.uid);
        const protectedBefore = beforeEntries.filter(row => row.uid !== input.primary?.uid);
        const targetMatches = input.primary ? same(actual, proposed) : actual &&
          Object.keys(proposed).filter(key => key !== 'uid').every(key => same(actual[key], proposed[key]));
        if (targetMatches && same(protectedRows, protectedBefore))
          return { saved: true, result: { name: input.name, action: input.action } };
        if (same(rows, beforeEntries)) return { unchanged: true };
        return { conflict: true };
      },
      prefix: '角色已入库', mismatch: '角色入库已提交，但持久化条目不一致',
      pending: () => ({ name: input.name }),
      finish: () => tickets.delete(ticket),
      retry: () => tickets.set(ticket, issued),
    });
  }
  async function commit(ticket, guard, configRevision = null) {
    const transaction = begin(ticket, guard, configRevision);
    return { ...await transaction.save(), transaction };
  }
  async function prepareTurn(guard, type = 'normal') {
    const token = epoch, host = await hostApi();
    const reader = readerApi(), native = await reader.read(guard), before = native.rows, identityScope = scope(host);
    const config = await settings(host, guard, token), identity = await binding(host, guard, token);
    await reader.assert(native, guard); assertScope(identityScope, guard, token);
    check(guard, token);
    const rows = before.filter(row => row.role === 'assistant');
    const rewriting = ['regenerate', 'swipe'].includes(type) && before.at(-1)?.role === 'assistant';
    const source = rewriting ? rows.at(-2) : rows.at(-1);
    if (source?.is_hidden || before.at(-1)?.is_hidden) throw Error('角色生成来源楼层已隐藏');
    const turn = { ...config, identity, source: clone(source), epoch: token, id: ++sequence, type,
      userSource: ['continue', 'append', 'regenerate', 'swipe'].includes(type) ?
        clone(before.filter(row => row.role === 'user' && row.message_id < rows.at(-1)?.message_id).at(-1)) : undefined };
    turns.set(turn.id, { value: clone(turn), native, reader, scope: identityScope, revision: config.revision, request: requestSequence });
    while (turns.size > 8) turns.delete(turns.keys().next().value);
    return turn;
  }
  async function completeTurn(response, transaction, prepared) {
    const turn = prepared === undefined ? await nativePending : prepared;
    if (!turn || !turn.config.automatic || !extract(response)) return { skipped: true };
    const issued = turns.get(turn.id), token = turn.epoch;
    if (!issued || !same(issued.value, turn)) throw Error('角色自动入库回合来源已失效');
    const guard = () => !disposed && epoch === token && issued.request === requestSequence && (!transaction.guard || transaction.guard());
    try {
      check(guard, token);
      assertScope(issued.scope, guard, token);
      if (issued.reader !== readerApi()) throw Error('角色回合来源服务已变化');
      issued.reader.assertIdentity(issued.native, guard);
      const native = await issued.reader.read(guard), rows = native.rows;
      check(guard, token);
      if (!Array.isArray(rows)) throw Error('角色回合来源不可读取');
      const floor = rows.find(row => row.message_id === transaction.assistantMessageId && row.role === 'assistant');
      const user = rows.find(row => row.message_id === transaction.userMessageId && row.role === 'user');
      if (!floor || floor.is_hidden || !user || user.is_hidden || floor.message_id <= user.message_id || String(user.message) !== String(transaction.userText) ||
        extract(floor.message) !== extract(response)) throw Error('角色回合身份或提取内容已变化');
      if (['continue', 'append'].includes(turn.type)) {
        if (floor.message_id !== turn.source?.message_id || !same(user, turn.userSource)) throw Error('角色续写来源已变化');
      } else if (!same(rows.filter(row => row.role === 'assistant' && row.message_id < user.message_id).at(-1), turn.source))
        throw Error('角色回合前状态已变化');
      if (['regenerate', 'swipe'].includes(turn.type) && !same(user, turn.userSource)) throw Error('角色重生成用户来源已变化');
      for (const row of issued.native.rows.filter(row => row.message_id !== floor.message_id))
        if (issued.reader.floorSignature(issued.native, row.message_id, guard) !== issued.reader.floorSignature(native, row.message_id, guard))
          throw Error('角色生成前楼层或分支已变化');
      const ticket = await prepare(floor, guard, true);
      if (!same(ticket.identity, turn.identity)) throw Error('角色生成期间世界书绑定已变化');
      await issued.reader.assert(native, guard);
      return await commit(ticket, guard, issued.revision);
    } finally { turns.delete(turn.id); }
  }
  function cancel() { epoch++; manualEpoch++; generating = false; nativePending = null; turns.clear(); }
  const ignoredGeneration = (type, options, dryRun) => dryRun || options?.dryRun || options?.params?.dryRun ||
    ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.params?.quiet_prompt;
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  for (const [name, callback] of [
    ['CHAT_CHANGED', cancel], ['GENERATION_STOPPED', () => { if (generating || nativePending) cancel(); }],
    ['GENERATION_AFTER_COMMANDS', (type, options, dryRun) => {
      if (disposed || ignoredGeneration(type, options, dryRun)) return;
      nativePending = null; turns.clear(); requestSequence++;
      if (!['normal', 'continue', 'append', 'regenerate', 'swipe', '', undefined, null].includes(type)) return;
      const token = epoch, request = requestSequence;
      nativePending = prepareTurn(() => !disposed && token === epoch && request === requestSequence, type).catch(error => {
        if (!disposed && token === epoch && request === requestSequence) console.warn(`[${KEY}] 本轮角色自动入库未准备`, error);
        return null;
      });
      return nativePending;
    }],
    ['GENERATION_STARTED', (type, options, dryRun) => {
      if (ignoredGeneration(type, options, dryRun)) return;
      generating = true; manualEpoch++;
    }],
    ['GENERATION_ENDED', () => { generating = false; }],
  ]) if (events[name]) subscriptions.push(after.bindEvent(events[name], callback));
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, epoch }), fields, resolveName, placeholder, extract,
    readConfig, saveConfig, beginConfig, prepare, begin, commit, prepareTurn, completeTurn,
    dispose() {
      disposed = true; cancel(); subscriptions.splice(0).forEach(subscription => subscription?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
