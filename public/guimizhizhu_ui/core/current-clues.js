(() => {
  'use strict';
  const KEY = 'cryptLord.currentClues', STORAGE = KEY;
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('当前线索契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const saveRecovery = modules['cryptLord.saveRecovery'];
  if (!saveRecovery) throw Error('当前线索依赖的保存恢复模块尚未加载');
  let disposed = false, epoch = 0, promptEpoch = 0, turnSequence = 0, injection = null, nativeTurn = null;
  let queue = Promise.resolve(), unregister = null;
  const subscriptions = [];
  const revisions = new WeakMap(), baselines = new WeakMap(), sources = new WeakMap(), turns = new Map();
  let generating = false, turnPrepared = false, manualEpoch = 0, receiptId = 0;
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const canonical = value => {
    if (Object.prototype.toString.call(value) === '[object Date]') return ['Date', value.toISOString()];
    if (Object.prototype.toString.call(value) === '[object RegExp]') return [value.source, value.flags];
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard())
      throw Object.assign(Error('当前线索操作已取消'), { code: 'CURRENT_CLUES_CANCELLED' });
  }
  // BEGIN ORIGINAL CLUE RULES
  const original = {_extractLastTagContent(tagName, text, ignoreCase = false) {
  if (!text || typeof text !== "string") return null;

  // 【超强容错改造】
  // 正则解析：允许 <tag> 内部带有属性 (如 <tag lang="zh">) 或空格
  // (?:\\s+[^>]*)? 代表非捕获组，匹配空格+任意非'>'字符
  const flags = ignoreCase ? "gi" : "g";
  const regex = new RegExp("<" + tagName + "(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/" + tagName + ">", flags);

  const matches = [...text.matchAll(regex)];

  if (matches.length > 0) {
    // 取最后一个匹配项的第1个捕获组（即标签内部的文本）
    return matches[matches.length - 1][1].trim();
  }

  return null;
}};
  // END ORIGINAL CLUE RULES
  function extract(text) {
    const clean = modules['cryptLord.responseNormalizer'].maskHidden(String(text ?? ''));
    return original._extractLastTagContent('当前线索', clean);
  }
  function embed(message, response) {
    const content = extract(response);
    if (!content || extract(message) === content) return String(message ?? '');
    return `${String(message ?? '').trimEnd()}\n\n<当前线索>\n${content}\n</当前线索>`;
  }
  function normalize(value) {
    if (value === undefined) return { version: 1, automatic: true, index: 1 };
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 ||
      typeof value.automatic !== 'boolean' || !Number.isSafeInteger(value.index) || value.index < 1)
      throw Error('当前线索配置格式或版本无效');
    return clone(value);
  }
  const entryName = index => index > 1 ? `当前线索(${index})` : '当前线索';
  const optionsFor = host => ({ type: 'script', script_id: host.getScriptId() });
  function scope(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost();
    return { host, after, document: surface?.document, window: surface?.window,
      script: JSON.stringify(optionsFor(host)),
      chat: surface?.window?.SillyTavern?.getCurrentChatId?.() };
  }
  function assertScope(expected, guard, token) {
    check(guard, token);
    const current = scope(modules['cryptLord.hostApi']);
    if (Object.keys(expected).some(key => expected[key] !== current[key]))
      throw Error('线索宿主、聊天或脚本身份已变化，请重新读取');
  }
  async function binding(host, guard, token) {
    const bound = clone(await host.getCharWorldbookNames('current'));
    check(guard, token);
    if (typeof bound?.primary !== 'string' || !bound.primary.trim()) throw Error('当前角色没有可归档的主世界书');
    return { bound, book: bound.primary };
  }
  async function settings(host, guard, token = epoch) {
    check(guard, token);
    const identity = scope(host), options = optionsFor(host), values = await host.getVariables(options);
    assertScope(identity, guard, token);
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw Error('脚本配置不可读取');
    if (!same(options, optionsFor(host))) throw Error('脚本身份已变化');
    const raw = values[STORAGE];
    const result = { config: normalize(raw), revision: { options, exists: Object.hasOwn(values, STORAGE), raw: clone(raw) } };
    revisions.set(result.revision, { value: clone(result.revision), scope: identity, token, manual: manualEpoch });
    return result;
  }
  function select(entries, name) {
    if (!Array.isArray(entries)) throw Error('线索世界书不可读取');
    const matches = entries.filter(entry => (entry?.name ?? entry?.comment) === name);
    if (matches.length > 1) throw Error(`线索条目「${name}」重名，请先核对世界书`);
    const target = matches[0] || null;
    if (target && (!Number.isSafeInteger(target.uid) || target.uid < 0 || entries.filter(entry => entry.uid === target.uid).length !== 1))
      throw Error('线索条目UID缺失或重复');
    if (target && typeof target.content !== 'string') throw Error('线索条目内容损坏，未覆盖');
    return clone(target);
  }
  async function snapshot(host, guard, token = epoch) {
    const identity = scope(host);
    const config = await settings(host, guard, token);
    const targetBinding = await binding(host, guard, token);
    const name = entryName(config.config.index);
    const entries = await host.getWorldbook(targetBinding.book);
    check(guard, token);
    const target = select(entries, name);
    const result = { ...config, ...targetBinding, name, target, content: String(target?.content ?? ''), epoch: token };
    assertScope(identity, guard, token);
    if (!same(targetBinding, await binding(host, guard, token)) ||
      !same(config.revision, (await settings(host, guard, token)).revision)) throw Error('线索配置或绑定已变化');
    if (!same(target, select(await host.getWorldbook(targetBinding.book), name))) throw Error('读取期间线索条目已变化');
    assertScope(identity, guard, token);
    baselines.set(result, { value: clone(result), scope: identity, token, manual: manualEpoch });
    return result;
  }
  async function load(guard) {
    const token = epoch;
    await queue;
    check(guard, token);
    return snapshot(await hostApi(), guard, token);
  }
  function enqueue(execute) {
    const task = queue.then(execute);
    queue = task.catch(() => {});
    return task;
  }
  function recovery({ verify, write, inspect, pending, prefix }) {
    return saveRecovery.create({
      enqueue, verify, write, inspect, pending,
      isConflict: error => error.code === 'CURRENT_CLUES_CANCELLED' || /变化|身份|来源|凭据|损坏/.test(error.message),
      onSaved(result, failure) {
        if (failure) result.warning = `${prefix}，宿主响应丢失后已确认：${failure.message}`;
        // Public baselines remain signed even when the recovered result carries a warning.
        if (baselines.has(result)) baselines.get(result).value = clone(result);
        return result;
      },
      text: {
        busy: '线索保存或核对正在进行', invalid: '线索凭据已失效，请重新读取',
        uncertain: '保存状态待核对，不能重复提交', notSubmitted: '宿主未执行更新器，可重试原结果',
        unchanged: `${prefix}提交结果尚未落盘，可重试原结果`,
        conflict: `${prefix}提交结果与预期不一致，请重新读取；未覆盖外部修改`,
        recheckFailed: error => `${prefix}提交，但复核失败：${error.message}`,
      },
    });
  }
  function beginConfig(value, revision, guard) {
    const issued = revisions.get(revision), expected = clone(revision);
    if (!issued || !same(issued.value, expected)) throw Error('线索配置凭据无效，请重新读取');
    if (guard) (issued.guards ||= new Set()).add(guard);
    const next = { ...normalize(expected.raw), ...normalize(value) }, token = issued.token;
    if (issued.operation) {
      if (!same(issued.desired, next)) throw Error('线索配置已变化或仍待恢复，请先核对或重新读取');
      return issued.operation;
    }
    const valid = () => !generating && manualEpoch === issued.manual &&
      (!issued.guards || [...issued.guards].every(validate => validate()));
    const verify = async () => assertScope(issued.scope, valid, token);
    let host;
    issued.desired = clone(next);
    issued.operation = recovery({
      verify, prefix: '设置已保存', pending: () => ({ config: clone(next), revision: null }),
      async write(submit) {
        host = await hostApi(); await verify();
        const before = await settings(host, valid, token);
        if (!same(before.revision, expected)) throw Error('线索配置已变化，请重新读取');
        if (same(before.config, next)) {
          const current = await snapshot(host, valid, token);
          current.unchanged = true; baselines.get(current).value = clone(current); return current;
        }
        await host.updateVariablesWith(values => {
          assertScope(issued.scope, valid, token);
          if (!values || typeof values !== 'object' || Array.isArray(values) ||
            !same(optionsFor(host), expected.options) || Object.hasOwn(values, STORAGE) !== expected.exists ||
            !same(values[STORAGE], expected.raw)) throw Error('线索配置已变化，请重新读取');
          submit();
          return { ...values, [STORAGE]: clone(next) };
        }, expected.options);
      },
      async inspect() {
        const after = await snapshot(host, valid, token);
        return same(after.revision.raw, next) ? { saved: true, result: after } :
          { unchanged: same(after.revision, expected) };
      },
    });
    return issued.operation;
  }
  async function saveConfig(value, revision, guard) {
    const transaction = beginConfig(value, revision, guard);
    return transaction.save();
  }
  async function floor(host, messageId, guard, token) {
    const reader = modules['cryptLord.nativeFloorSource'], native = await reader.read(guard), rows = native.rows;
    check(guard, token);
    if (host !== modules['cryptLord.hostApi']) throw Error('线索宿主已变化');
    const row = messageId === null ? rows.at(-1) :
      rows.find(item => item.message_id === messageId && item.role === 'assistant');
    if (!row || row.role !== 'assistant' || row.is_hidden || !Number.isInteger(row.message_id)) throw Error('没有可读取的公开assistant楼层');
    await reader.assert(native, guard); check(guard, token);
    return { row: clone(row), native, reader };
  }
  async function readFloor(messageId = null, guard) {
    const token = epoch;
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('线索来源楼层无效');
    const read = await floor(await hostApi(), messageId, guard, token);
    const result = { floor: read.row, content: extract(read.row.message) || '' };
    sources.set(result, { ...read, value: clone(result), token, manual: manualEpoch });
    return result;
  }
  function newEntry(name, content, entries) {
    const uid = Math.max(0, ...entries.map(entry => Number.isSafeInteger(entry.uid) ? entry.uid : 0)) + 1;
    if (!Number.isSafeInteger(uid)) throw Error('线索条目UID空间无效');
    return {
      uid,
      name, content, enabled: false,
      strategy: { type: 'selective', keys: [name], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
      probability: 100, recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
    };
  }
  function begin(source, baseline, guard, latestOnly = false) {
    const origin = sources.get(source), issued = baselines.get(baseline), manual = manualEpoch;
    const input = clone(source), expected = clone(baseline), token = epoch;
    if (!origin || !issued || !same(origin.value, source) || !same(issued.value, baseline)) throw Error('线索来源或目标凭据无效');
    if (guard) (issued.guards ||= new Set()).add(guard);
    if (issued.operation) {
      if (issued.origin !== source) throw Error('线索归档仍待恢复，请先核对或重新读取');
      return issued.operation;
    }
    const valid = () => (!issued.guards || [...issued.guards].every(validate => validate())) &&
      (latestOnly || !generating && manual === manualEpoch && origin.manual === manualEpoch && issued.manual === manualEpoch);
    const content = extract(input.floor.message);
    if (!content) throw Error('所选楼层没有可归档的当前线索');
    let host, originalBook, proposedBook;
    async function verifySource() {
      assertScope(issued.scope, valid, issued.token);
      if (origin.reader !== modules['cryptLord.nativeFloorSource']) throw Error('线索来源服务已变化');
      await origin.reader.assert(origin.native, valid);
      assertScope(issued.scope, valid, token);
      if (latestOnly && origin.native.rows.at(-1)?.message_id !== input.floor.message_id)
        throw Error('线索回合之后已有新楼层，不归档旧回合');
    }
    async function verify() {
      host = await hostApi(); await verifySource();
      if (!same(await binding(host, valid, token), { book: expected.book, bound: expected.bound }) ||
        !same((await settings(host, valid, token)).revision, expected.revision)) throw Error('线索配置或绑定已变化');
    }
    issued.origin = source;
    issued.operation = recovery({
      verify, prefix: '线索已归档',
      pending: () => ({ name: expected.name, book: expected.book, content, config: clone(expected.config), revision: null }),
      async write(submit) {
        const current = await snapshot(host, valid, token);
        if (!same(current.revision, expected.revision) || !same(current.target, expected.target) || !same(current.bound, expected.bound))
          throw Error('线索配置或世界书条目已变化，请重新读取');
        await verifySource();
        if (current.content === content) {
          current.unchanged = true; baselines.get(current).value = clone(current); return current;
        }
        await host.updateWorldbookWith(expected.book, async entries => {
          assertScope(issued.scope, valid, token);
          if (!same(await binding(host, valid, token), { book: expected.book, bound: expected.bound })) throw Error('线索世界书绑定已变化');
          const config = await settings(host, valid, token);
          if (!same(config.revision, expected.revision)) throw Error('线索配置已变化');
          if (!same(select(entries, expected.name), expected.target)) throw Error('线索条目已变化，拒绝覆盖');
          if (originalBook && !same(entries, originalBook)) throw Error('主世界书已变化，拒绝覆盖');
          await verifySource();
          const fresh = await host.getWorldbook(expected.book);
          assertScope(issued.scope, valid, token);
          if (!same(entries, fresh)) throw Error('主世界书在等待期间已变化，拒绝覆盖');
          const proposed = expected.target ? { ...expected.target, content } : newEntry(expected.name, content, entries);
          originalBook = clone(entries);
          proposedBook = expected.target ? entries.map(entry => entry.uid === expected.target.uid ? proposed : entry) : [...entries, proposed];
          submit(); return clone(proposedBook);
        }, { render: 'debounced' });
      },
      async inspect() {
        const after = await snapshot(host, valid, token), entries = await host.getWorldbook(expected.book);
        if (!same(after.target, select(entries, expected.name))) throw Error('核对期间线索条目已变化');
        return same(entries, proposedBook) ? { saved: true, result: after } :
          { unchanged: same(entries, originalBook) };
      },
    });
    return issued.operation;
  }
  async function archive(source, baseline, guard, latestOnly = false) {
    const transaction = begin(source, baseline, guard, latestOnly);
    return transaction.save();
  }
  async function prepareTurn(guard, type = 'normal') {
    const token = epoch;
    const valid = () => epoch === token && (!guard || guard());
    const loaded = await load(valid), host = await hostApi();
    const reader = modules['cryptLord.nativeFloorSource'], native = await reader.read(valid);
    await reader.assert(native, valid);
    const rows = native.rows, assistants = rows.filter(row => row.role === 'assistant');
    const rewriting = ['regenerate', 'swipe'].includes(type) && rows.at(-1)?.role === 'assistant';
    const continuing = type === 'continue' || type === 'append' && rows.at(-1)?.role === 'assistant';
    const source = rewriting ? assistants.at(-2) : assistants.at(-1);
    if (source?.is_hidden) throw Error('线索生成来源已隐藏');
    const ticket = { ...clone(loaded), source: clone(source), type, continuing, id: ++receiptId,
      userSource: continuing || rewriting ?
        clone(rows.filter(row => row.role === 'user' && row.message_id < assistants.at(-1)?.message_id).at(-1)) : undefined };
    turns.set(ticket.id, { value: clone(ticket), baseline: loaded, native, reader, token, scope: scope(host) });
    while (turns.size > 8) turns.delete(turns.keys().next().value);
    return ticket;
  }
  function assertTurn(ticket) {
    check(() => ticket && (ticket.requestId === undefined || ticket.requestId === turnSequence), ticket?.epoch);
    if (ticket.id !== undefined) {
      const issued = turns.get(ticket.id);
      if (!issued || !same(issued.value, ticket)) throw Error('线索回合凭据已失效');
      assertScope(issued.scope, null, issued.token);
      if (issued.reader !== modules['cryptLord.nativeFloorSource']) throw Error('线索来源服务已变化');
      issued.reader.assertIdentity(issued.native);
    }
  }
  async function completeTurn(response, transaction, prepared) {
    const ticket = prepared || nativeTurn;
    if (!ticket || !ticket.config.automatic || !extract(response)) return { skipped: true };
    assertTurn(ticket);
    const issued = turns.get(ticket.id);
    if (!issued) throw Error('线索回合凭据已失效');
    const token = ticket.epoch;
    check(null, token);
    const guard = () => epoch === token && (!transaction.guard || transaction.guard()) && (ticket.requestId === undefined || ticket.requestId === turnSequence);
    try {
      check(guard, token);
      const source = await readFloor(transaction.assistantMessageId, guard);
      const current = sources.get(source).native, rows = current.rows;
      check(guard, token);
      if (!Array.isArray(rows)) throw Error('线索回合楼层不可读取');
      const user = rows.find(row => row.message_id === transaction.userMessageId && row.role === 'user');
      if (!user || user.is_hidden || source.floor.message_id <= user.message_id || String(user.message) !== String(transaction.userText))
        throw Error('线索回合身份已变化');
      if (extract(source.floor.message) !== extract(response)) throw Error('保存楼层与本回合线索不一致');
      if (ticket.source) {
        if (ticket.continuing) {
          if (source.floor.message_id !== ticket.source.message_id || !same(user, ticket.userSource))
            throw Error('线索续写目标或用户楼层已变化');
        } else {
          const previous = rows.filter(row => row.role === 'assistant' && row.message_id < user.message_id).at(-1);
          if (!same(previous, ticket.source) || ticket.userSource && !same(user, ticket.userSource)) throw Error('线索生成来源已变化');
        }
      }
      for (const row of issued.native.rows.filter(row => row.message_id !== source.floor.message_id))
        if (issued.reader.floorSignature(issued.native, row.message_id, guard) !== issued.reader.floorSignature(current, row.message_id, guard))
          throw Error('线索生成前楼层或分支已变化');
      return await archive(source, issued.baseline, guard, true);
    } finally { finishTurn(ticket); }
  }
  function finishTurn(ticket) {
    if (ticket?.id !== undefined) turns.delete(ticket.id);
    if (nativeTurn && ticket?.requestId === nativeTurn.requestId && ticket.epoch === nativeTurn.epoch)
      nativeTurn = null;
  }
  const promptFor = loaded => loaded.content.trim() ? {
    role: 'system', position: 'in_chat', depth: 4, should_scan: true,
    content: `\n<当前待办线索>\n${loaded.content}\n</当前待办线索>`,
  } : null;
  async function provide({ guard } = {}) { return promptFor(await load(guard)); }
  function clearPrompt() {
    promptEpoch++;
    const active = injection; injection = null; active?.uninject();
  }
  function cancel() { epoch++; manualEpoch++; generating = false; turnPrepared = false; nativeTurn = null; turns.clear(); clearPrompt(); }
  const quiet = (type, options, dryRun) => dryRun || ['quiet', 'quiet_prompt'].includes(type) ||
    options?.dryRun || options?.params?.dryRun || options?.quiet_prompt || options?.params?.quiet_prompt;
  async function beforeGeneration(type, options, dryRun) {
    if (disposed || quiet(type, options, dryRun)) return;
    // Side requests (variable settlement via generateRaw) emit a second plain 'normal' AFTER_COMMANDS
    // while the native turn is still open; treating it as a new turn would cancel the turn being settled.
    if (turnPrepared && (type || 'normal') === 'normal') return;
    turnPrepared = true;
    clearPrompt(); nativeTurn = null; turns.clear(); turnSequence++;
    if (!['normal', 'continue', 'regenerate', 'swipe', 'append', '', undefined, null].includes(type)) return;
    const token = epoch, request = promptEpoch;
    const guard = () => !disposed && epoch === token && promptEpoch === request;
    try {
      const host = await hostApi();
      nativeTurn = await prepareTurn(guard, type);
      check(guard, token);
      nativeTurn.requestId = turnSequence;
      turns.get(nativeTurn.id).value = clone(nativeTurn);
      const prepared = turns.get(nativeTurn.id);
      await prepared.reader.assert(prepared.native, guard);
      assertScope(prepared.scope, guard, token);
      const fresh = await snapshot(host, guard, token);
      if (!same(fresh.bound, nativeTurn.bound) || !same(fresh.target, nativeTurn.target) ||
        !same(fresh.revision, nativeTurn.revision)) throw Error('线索提示来源已变化');
      const prompt = promptFor(nativeTurn);
      if (prompt) injection = host.injectPrompts([{ ...prompt, id: 'cryptLord.currentClues.native' }], { once: true });
    } catch (error) {
      if (guard()) {
        nativeTurn = null; turns.clear();
        console.warn(`[${KEY}] 线索不可用，本次不注入或自动归档`, error);
      }
    }
  }
  async function install() {
    const builder = await contract.waitGlobalInitialized('cryptLord.contextBuilder', { timeoutMs: 10000 });
    check();
    unregister = builder.register('current-clues', async context => {
      const token = epoch;
      try { return await provide({ guard: () => token === epoch && (!context.guard || context.guard()) }); }
      catch (error) {
        if (!disposed && epoch === token) console.warn(`[${KEY}] 线索提示读取失败，本次跳过`, error);
        return null;
      }
    }, 45);
    const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents();
    for (const [name, handler] of [[events?.GENERATION_AFTER_COMMANDS, beforeGeneration], [events?.CHAT_CHANGED, cancel],
      [events?.GENERATION_STOPPED, (type, options, dryRun) => { if (!quiet(type, options, dryRun)) cancel(); }],
      [events?.GENERATION_ENDED, (type, options, dryRun) => { if (!quiet(type, options, dryRun)) { generating = false; turnPrepared = false; clearPrompt(); } }],
      [events?.GENERATION_STARTED, (type, options, dryRun) => {
        if (quiet(type, options, dryRun)) return;
        generating = true; turnPrepared = false; manualEpoch++;
      }]]) {
      if (name) subscriptions.push(after.bindEvent(name, handler));
    }
    check();
    contract.initializeGlobal(KEY, api);
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed && Boolean(unregister), epoch, generating, nativeReady: subscriptions.length >= 4 }),
    extract, embed, entryName, load, readFloor, begin, archive, beginConfig, saveConfig, prepareTurn, assertTurn, completeTurn, finishTurn, provide,
    nativeTicket: () => clone(nativeTurn),
    dispose() {
      disposed = true; cancel(); unregister?.(); unregister = null;
      subscriptions.splice(0).forEach(subscription => subscription?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  void install().catch(error => { if (!disposed) { api.dispose(); console.error(`[${KEY}] 注册失败`, error); } });
})();
