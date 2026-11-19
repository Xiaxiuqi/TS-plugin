(() => {
  'use strict';
  const KEY = 'cryptLord.quickShortcuts';
  const BOOK = '【源堡】玩家自建内容';
  const COMMAND = '[快捷指令]';
  const STATE = '[快捷指令状态]';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const clone = value => structuredClone(value);
  let queue = Promise.resolve();
  let disposed = false;
  let epoch = 0;
  let nativeTicket = null;
  let injection = null;
  let subscriptions = [];
  let nativeReady = false;
  let adminEpoch = 0, generating = false;
  const turns = new WeakMap();
  function usable(guard) {
    if (disposed) throw Error('快捷指令模块已卸载');
    if (modules[KEY] !== api || guard?.() === false) throw new DOMException('快捷指令操作已取消', 'AbortError');
  }
  function scope() {
    const service = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { service, after, document: surface?.document, window: surface?.window, epoch,
      script: signature(service?.scriptVariableOptions?.()), chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()) };
  }
  function scopedGuard(guard) {
    const expected = scope();
    return () => {
      usable(guard);
      const current = scope();
      if (Object.keys(expected).some(key => expected[key] !== current[key]))
        throw new DOMException('快捷指令宿主、来源服务、聊天或脚本已变化，请重新读取', 'AbortError');
      return true;
    };
  }
  function adminGuard(guard, token) {
    const valid = scopedGuard(guard);
    return () => {
      valid();
      if (generating || token !== adminEpoch) throw new DOMException('生成或聊天已变化，请重新读取快捷指令', 'AbortError');
      return true;
    };
  }
  function checkHost(service, guard) {
    usable(guard);
    if (modules['cryptLord.hostApi'] !== service) throw Error('快捷指令来源服务已变化，请重新读取');
  }
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function entryFor(entries, name) {
    if (!Array.isArray(entries)) throw Error('玩家自建世界书不可用');
    const matches = entries.filter(item => String(item.name || '').trim() === name || String(item.comment || '').trim() === name);
    if (matches.length > 1) throw Error(`${name} 世界书条目重名，请先整理`);
    const entry = matches[0] || null;
    if (entry && (entry.uid == null || entries.filter(item => item.uid === entry.uid).length !== 1)) throw Error(`${name} 缺少 UID 或 UID 重复`);
    return entry;
  }
  // BEGIN ORIGINAL QUICK SHORTCUTS
  const originalRules = {
_parseQuickShortcuts(rawContent) {
    const raw = String(rawContent || "").trim();
    if (!raw) return [];
    if (raw.includes("<cmd>")) {
      return [...raw.matchAll(/<cmd>([\s\S]*?)<\/cmd>/g)]
        .map((m) => m[1].trim())
        .filter((cmd) => cmd);
    }
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => line.replace(/^\d+\.\s*/, "").trim());
  },
_normalizeQuickShortcutState(rawState) {
    const fallback = {
      version: 1,
      isKeepShortcutsEnabled: false,
      pendingSupplementary: [],
    };

    let parsed = rawState;
    if (typeof rawState === "string") {
      try {
        parsed = JSON.parse(rawState);
      } catch (error) {
        console.warn("[DB: 快捷指令状态] JSON 解析失败，已使用默认状态:", error);
        return fallback;
      }
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }

    const pendingSupplementary = Array.isArray(parsed.pendingSupplementary)
      ? [...new Set(
          parsed.pendingSupplementary
            .filter((cmd) => typeof cmd === "string")
            .map((cmd) => cmd.trim())
            .filter((cmd) => cmd),
        )]
      : [];

    return {
      version: 1,
      isKeepShortcutsEnabled: parsed.isKeepShortcutsEnabled === true,
      pendingSupplementary,
    };
  }
  };
  // END ORIGINAL QUICK SHORTCUTS
  function parse(content) { return originalRules._parseQuickShortcuts(content); }
  function normalizeState(raw, repair = false) {
    let value = raw;
    if (typeof raw === 'string') {
      if (!raw.trim()) return originalRules._normalizeQuickShortcutState(null);
      try { value = JSON.parse(raw); }
      catch { if (!repair) throw Error('快捷指令状态 JSON 损坏，请显式恢复默认状态'); value = null; }
    }
    if (value != null && (typeof value !== 'object' || Array.isArray(value) || (value.version != null && value.version !== 1))) {
      if (!repair) throw Error('快捷指令状态格式或版本不支持，请显式恢复默认状态');
      value = null;
    }
    return originalRules._normalizeQuickShortcutState(value);
  }
  function normalizeCommands(commands) {
    if (!Array.isArray(commands)) throw Error('快捷指令必须是列表');
    // Original parser keeps duplicates; supplementary picks are keyed by text, so keep the first copy.
    const result = [...new Set(commands.map(command => String(command ?? '').trim()).filter(Boolean))];
    if (result.some(command => /<\/?cmd>/i.test(command))) throw Error('快捷指令正文不能包含 cmd 分隔标签');
    return result;
  }
  async function readCustom(api) {
    try {
      const entries = await api.getWorldbook(BOOK);
      if (!Array.isArray(entries)) throw Error('玩家自建世界书不可用');
      return entries;
    } catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) return null;
      throw error;
    }
  }
  const revision = (entries, name) => ({ exists: entries !== null, entry: clone(entryFor(entries || [], name)) });
  async function primarySource(service, guard) {
    const binding = clone(await service.getCharWorldbookNames('current'));
    checkHost(service, guard);
    const book = String(binding?.primary || '').trim();
    const entry = book ? entryFor(await service.getWorldbook(book), COMMAND) : null;
    checkHost(service, guard);
    if (signature(binding) !== signature(await service.getCharWorldbookNames('current'))) throw Error('当前角色主书已变化，请重新读取');
    checkHost(service, guard);
    return { binding, book, entry: clone(entry) };
  }
  async function readAll(api, options = {}) {
    const custom = await readCustom(api);
    checkHost(api, options.guard);
    const commandEntry = entryFor(custom || [], COMMAND);
    const stateEntry = entryFor(custom || [], STATE);
    let commands = parse(commandEntry?.content);
    let source = 'custom';
    let fallback = null;
    let primary = null;
    // A saved empty list is an intentional deletion, not a request to restore the factory list.
    if (!commandEntry) {
      primary = await primarySource(api, options.guard);
      fallback = primary.entry;
      commands = parse(fallback?.content);
      source = commands.length ? 'primary-fallback' : '';
    }
    commands = normalizeCommands(commands);
    const state = normalizeState(stateEntry?.content, options.repairState === true);
    state.pendingSupplementary = state.pendingSupplementary.filter(command => commands.includes(command));
    return { commands, state, source, revisions: {
      commands: revision(custom, COMMAND), state: revision(custom, STATE), fallback: clone(fallback), primary,
    } };
  }
  async function load(options = {}) {
    options = { ...options, guard: scopedGuard(options.guard) };
    usable(options.guard);
    await queue;
    usable(options.guard);
    const loaded = await readAll(await host(), options);
    usable(options.guard);
    return loaded;
  }
  function serial(work) {
    const task = queue.then(work);
    queue = task.catch(() => {});
    return task;
  }
  function configEntry(name, content) {
    return {
      name, comment: name, content, enabled: false,
      strategy: { type: 'selective', keys: [name] },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
    };
  }
  async function save(commands, value, expected, guard, options = {}) {
    const input = clone({ commands, value, expected, options }), token = adminEpoch;
    guard = adminGuard(guard, token);
    return serial(async () => {
      usable(guard);
      const api = await host();
      const loaded = await readAll(api, { ...input.options, guard });
      usable(guard);
      for (const name of ['commands', 'state', 'fallback', 'primary']) {
        if (input.expected?.[name] !== undefined && signature(input.expected[name]) !== signature(loaded.revisions[name])) {
          throw Error(`${name === 'commands' ? COMMAND : STATE} 已被外部修改，请重新读取`);
        }
      }
      const nextCommands = input.commands == null ? loaded.commands : normalizeCommands(input.commands);
      const nextState = input.value == null ? loaded.state : normalizeState(input.value);
      nextState.pendingSupplementary = nextState.pendingSupplementary.filter(command => nextCommands.includes(command));
      const commandContent = nextCommands.map(command => `<cmd>\n${command}\n</cmd>`).join('\n\n');
      const stateContent = JSON.stringify(nextState, null, 2);
      const writeCommands = input.commands != null;
      const writeState = input.value != null || input.commands != null || signature(nextState) !== signature(loaded.state);
      if (!writeCommands && !writeState) return loaded;
      if (!loaded.revisions.commands.exists) {
        usable(guard);
        try { await api.createWorldbook(BOOK); }
        catch (error) { checkHost(api, guard); if (await readCustom(api) === null) throw error; }
      }
      const verify = async () => {
        checkHost(api, guard);
        const verified = await readAll(api, { guard });
        if ((writeCommands && verified.revisions.commands.entry?.content !== commandContent) ||
          (writeState && verified.revisions.state.entry?.content !== stateContent)) throw Error('提交后内容与预期不符');
        return verified;
      };
      let transformed = false;
      try { await api.updateWorldbookWith(BOOK, async current => {
        checkHost(api, guard);
        if (!loaded.revisions.commands.entry &&
          signature(await primarySource(api, guard)) !== signature(loaded.revisions.primary)) {
          throw Error('原版备用指令已被外部修改，请重新读取');
        }
        checkHost(api, guard);
        // Both records belong to one user operation, so validate both before returning either change.
        for (const [name, key] of [[COMMAND, 'commands'], [STATE, 'state']]) {
          if (signature(entryFor(current, name)) !== signature(loaded.revisions[key].entry)) throw Error(`${name} 已被外部修改，请重新读取`);
        }
        if (signature(await readCustom(api)) !== signature(current)) throw Error('玩家自建世界书已被外部修改，请重新读取');
        checkHost(api, guard);
        const next = [...current];
        for (const [name, content, enabled] of [[COMMAND, commandContent, writeCommands], [STATE, stateContent, writeState]]) {
          if (!enabled) continue;
          const target = entryFor(next, name);
          if (target) next[next.findIndex(item => item.uid === target.uid)] = { ...target, content };
          else next.push(configEntry(name, content));
        }
        transformed = true;
        return next;
      }, { render: 'debounced' }); }
      catch (error) {
        try {
          if (!transformed || !(writeCommands && loaded.revisions.commands.entry?.content !== commandContent ||
            writeState && loaded.revisions.state.entry?.content !== stateContent)) throw error;
          return { ...await verify(), warning: '快捷指令已提交，但宿主未返回成功响应' };
        }
        catch { throw error; }
      }
      try {
        const verified = await verify();
        return { ...verified, warning: '' };
      }
      catch (error) {
        return { commands: nextCommands, state: nextState, source: 'custom', revisions: null, warning: `快捷指令已提交，但复核失败：${error.message}` };
      }
    });
  }
  async function saveCommands(commands, expectedRevision, guard) {
    return (await save(commands, null, { commands: expectedRevision }, guard)).commands;
  }
  async function saveState(value, expectedRevision, guard) {
    return (await save(null, value, { state: expectedRevision }, guard)).state;
  }
  function consumeSupplementary(snapshot, expected, guard, beforeWrite) {
    guard = scopedGuard(guard);
    const commands = clone(snapshot || []);
    const expectedPair = expected?.commands !== undefined ? clone(expected) : { state: clone(expected) };
    return serial(async () => {
      usable(guard);
      if (!commands.length) return false;
      const api = await host();
      const loaded = await readAll(api, { guard });
      usable(guard);
      for (const key of ['commands', 'state', 'fallback', 'primary']) {
        if (expectedPair[key] !== undefined && signature(expectedPair[key]) !== signature(loaded.revisions[key])) return false;
      }
      if (loaded.state.isKeepShortcutsEnabled) return loaded.state;
      const state = { ...loaded.state, pendingSupplementary: loaded.state.pendingSupplementary.filter(command => !commands.includes(command)) };
      if (signature(state) === signature(loaded.state)) return state;
      const content = JSON.stringify(state, null, 2);
      const verifySaved = async () => {
        checkHost(api, guard);
        const actual = await readAll(api, { guard });
        if (signature(actual.revisions.commands) !== signature(loaded.revisions.commands) ||
          signature(actual.revisions.primary) !== signature(loaded.revisions.primary) ||
          signature(actual.revisions.state.entry) !== signature({ ...loaded.revisions.state.entry, content }))
          throw Error('补充指令清理结果未确认，请重新读取');
        checkHost(api, guard);
      };
      let transformed = false;
      try { await api.updateWorldbookWith(BOOK, async current => {
        checkHost(api, guard);
        if (!loaded.revisions.commands.entry &&
          signature(await primarySource(api, guard)) !== signature(loaded.revisions.primary)) throw Error('备用指令已变化，保留当前勾选');
        await beforeWrite?.();
        checkHost(api, guard);
        for (const [name, key] of [[COMMAND, 'commands'], [STATE, 'state']]) {
          if (signature(entryFor(current, name)) !== signature(loaded.revisions[key].entry)) throw Error('补充指令状态已变化，保留当前勾选');
        }
        if (signature(await readCustom(api)) !== signature(current)) throw Error('玩家自建世界书已变化，保留当前勾选');
        checkHost(api, guard);
        const entry = entryFor(current, STATE);
        if (!entry) throw Error('补充指令状态条目不存在');
        transformed = true;
        return current.map(item => item.uid === entry.uid ? { ...item, content } : item);
      }, { render: 'debounced' }); }
      catch (error) {
        try { if (!transformed) throw error; await verifySaved(); }
        catch { throw error; }
      }
      await verifySaved();
      const view = modules['cryptLord.afterNativeHost']?.getHost?.()?.window;
      view?.dispatchEvent(new view.Event('cryptLord:quick-shortcuts-consumed'));
      return state;
    });
  }
  const format = commands => commands.length ? `[补充指令]\n${commands.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : '';
  async function readPages(service, guard) {
    checkHost(service, guard);
    const reader = modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('原生楼层来源服务不可用');
    const source = await reader.read(guard);
    checkHost(service, guard);
    return { rows: source.rows, pages: source.swipes, source, reader };
  }
  function sourceGuard(source, guard) {
    return () => {
      usable(guard);
      if (modules['cryptLord.nativeFloorSource'] !== source.reader) throw Error('原生楼层来源服务已变化');
      source.reader.assertIdentity(source.source, guard);
      return true;
    };
  }
  function assertPendingFloor(before, current, transaction) {
    const baseline = before.rows.at(-1)?.message_id ?? -1, user = current.rows.at(-1);
    if (!user || user.role !== 'user' || user.is_hidden || user.message_id !== transaction.userMessageId ||
      user.message !== transaction.userText || user.message_id <= baseline || current.rows.length !== before.rows.length + 1 ||
      signature(current.rows.slice(0, -1)) !== signature(before.rows) ||
      signature(current.pages.slice(0, -1)) !== signature(before.pages) ||
      current.pages.at(-1)?.swipes.length !== 1 || current.pages.at(-1)?.swipe_id !== 0)
      throw Error('生成前原生楼层或行动已变化，请重新准备回合');
  }
  async function prepareTurn(options = {}) {
    const guard = scopedGuard(options.guard), token = epoch, service = await host();
    guard();
    const loaded = await load({ guard });
    const source = await readPages(service, guard);
    const latest = source.rows.at(-1), previous = source.rows.filter(row => row.role === 'assistant').at(-1);
    if (latest?.is_hidden || previous?.is_hidden || latest && !['user', 'assistant'].includes(latest.role))
      throw Error('最新原生来源已隐藏或不是可用正文回合');
    const result = { commands: clone(loaded.state.pendingSupplementary), revisions: clone(loaded.revisions), epoch: token };
    turns.set(result, { service, token, source, guard, loaded: clone(loaded), result: clone(result) });
    await assertTurn(result);
    return result;
  }
  async function assertTurn(ticket, transaction = {}) {
    const receipt = turns.get(ticket);
    if (!receipt || signature(receipt.result) !== signature(ticket)) throw Error('快捷指令回合凭据无效，请重新准备');
    const guard = sourceGuard(receipt.source, () => { receipt.guard(); usable(transaction.guard); return true; });
    guard();
    if (signature((await readAll(receipt.service, { guard })).revisions) !== signature(receipt.loaded.revisions))
      throw Error('快捷指令已变化，请重新准备回合');
    if (Number.isInteger(transaction.userMessageId))
      assertPendingFloor(receipt.source, await readPages(receipt.service, guard), transaction);
    else await receipt.source.reader.assert(receipt.source.source, guard);
    guard();
    return guard;
  }
  async function consumeTurn(transaction, ticket, savedMessage) {
    const receipt = turns.get(ticket);
    if (!receipt || signature(receipt.result) !== signature(ticket)) return false;
    const guard = () => {
      receipt.guard();
      sourceGuard(receipt.source)();
      usable(transaction.guard);
      if (receipt.token !== epoch) throw Error('聊天或生成已变化，保留补充勾选');
      checkHost(receipt.service);
    };
    const verify = async () => {
      guard();
      const current = await readPages(receipt.service, guard);
      guard();
      const before = receipt.source, baseline = before.rows.at(-1)?.message_id ?? -1;
      const userId = Number(transaction.userMessageId), assistantId = Number(transaction.assistantMessageId);
      const assistant = current.rows.at(-1), user = current.rows.find(row => row.message_id === userId);
      const isNative = before.rows.at(-1)?.role === 'user';
      const added = current.rows.filter(row => row.message_id > baseline);
      if (!assistant || assistant.role !== 'assistant' || assistant.is_hidden || !String(savedMessage || '').trim() ||
        assistant.message_id !== assistantId || assistantId <= baseline || assistant.message !== savedMessage ||
        !user || user.role !== 'user' || user.is_hidden || user.message !== transaction.userText ||
        (isNative ? userId !== baseline || added.length !== 1 : userId <= baseline || added.length !== 2) ||
        current.rows.at(-2)?.message_id !== userId ||
        signature(current.rows.filter(row => row.message_id <= baseline)) !== signature(before.rows) ||
        signature(current.pages.filter(row => row.message_id <= baseline)) !== signature(before.pages))
        throw Error('真实楼层、正文或消息页已变化，保留补充勾选');
      // New turns may not consume selections from a regenerated/swiped response.
      const page = current.pages.find(row => row.message_id === assistantId);
      const userPage = current.pages.find(row => row.message_id === userId);
      if (!page || page.swipes.length !== 1 || page.swipe_id !== 0 ||
        !userPage || userPage.swipes.length !== 1 || userPage.swipe_id !== 0)
        throw Error('本轮消息页不唯一，保留补充勾选');
    };
    await verify();
    const result = await consumeSupplementary(ticket.commands, ticket.revisions, guard, verify);
    turns.delete(ticket);
    return result;
  }
  function resetNative() {
    epoch++;
    nativeTicket = null;
    const previous = injection;
    injection = null;
    try { previous?.uninject(); }
    catch (error) { console.warn(`[${KEY}] 注入清理失败`, error); }
  }
  async function installNative() {
    const after = await contract.waitGlobalInitialized('cryptLord.afterNativeHost', { timeoutMs: 10000 });
    usable();
    const events = after.tavernEvents();
    if (!events?.GENERATION_AFTER_COMMANDS || !events.CHAT_CHANGED || !events.GENERATION_STOPPED || !after.bindEvent) return false;
    const bind = (name, fn) => {
      if (!name) return null;
      const subscription = after.bindEvent(name, fn);
      if (subscription) subscriptions.push(subscription);
      return subscription;
    };
    const start = bind(events.GENERATION_AFTER_COMMANDS, async (type, options, dryRun) => {
      // Only a new native narrative turn consumes this queue; side generations and swipes do not.
      if (dryRun || options?.dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      if (modules['cryptLord.nativeFloor']?.hasActiveTurn?.()) return;
      if (!['normal', '', undefined, null].includes(type)) { resetNative(); return; }
      resetNative();
      const token = epoch;
      try {
        const ticket = await prepareTurn();
        const api = await host();
        usable();
        if (token !== epoch || !ticket.commands.length || turns.get(ticket)?.source.rows.at(-1)?.role !== 'user') return;
        const valid = await assertTurn(ticket);
        valid();
        injection = api.injectPrompts([{
          id: 'cryptLord.quickShortcuts.native', role: 'user', position: 'in_chat', depth: 0,
          should_scan: true, content: format(ticket.commands),
        }], { once: true });
        nativeTicket = ticket;
      } catch (error) {
        console.warn(`[${KEY}] 原生补充指令注入失败，未清除勾选`, error);
        if (token === epoch) { injection?.uninject(); injection = null; nativeTicket = null; }
      }
    });
    if (!start) return false;
    const stop = bind(events.GENERATION_STOPPED, resetNative);
    const chat = bind(events.CHAT_CHANGED, () => { adminEpoch++; generating = false; resetNative(); });
    if (events.GENERATION_STARTED) bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      adminEpoch++; generating = true;
    });
    if (events.GENERATION_ENDED) bind(events.GENERATION_ENDED, () => { generating = false; });
    bind(events.GENERATION_STOPPED, () => { generating = false; });
    if (!stop || !chat) {
      subscriptions.forEach(subscription => subscription.stop());
      subscriptions = [];
      return false;
    }
    nativeReady = true;
    return true;
  }
  async function consumeNative(transaction, savedMessage) {
    const ticket = nativeTicket;
    if (!ticket || !String(transaction.generationId || '').startsWith('native-host-') ||
      ticket.epoch !== epoch) return false;
    const result = await consumeTurn(transaction, ticket, savedMessage);
    if (nativeTicket === ticket) resetNative();
    return result;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed, nativeReady, epoch, adminEpoch, generating }); },
    parse, load, save, saveCommands, saveState, consumeSupplementary, consumeNative, prepareTurn, assertTurn, consumeTurn, format,
    dispose() {
      disposed = true;
      resetNative();
      subscriptions.forEach(subscription => subscription.stop());
      subscriptions = [];
      nativeReady = false;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  void installNative().catch(error => {
    subscriptions.splice(0).forEach(subscription => subscription.stop());
    nativeReady = false;
    if (!disposed) console.warn(`[${KEY}] 原生补充指令监听不可用`, error);
  });
})();
