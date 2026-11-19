import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../../public/guimizhizhu_ui/core/quick-shortcuts.js', import.meta.url), 'utf8');
const bridgeSource = await readFile(new URL('../../public/guimizhizhu_ui/core/generation-bridge.js', import.meta.url), 'utf8');
const floorSource = await readFile(new URL('../../public/guimizhizhu_ui/core/native-floor-source.js', import.meta.url), 'utf8');
const nativeSource = await readFile(new URL('../../public/guimizhizhu_ui/modules/native-floor/index.js', import.meta.url), 'utf8');
const hostSource = await readFile(new URL('../../public/guimizhizhu_ui/shared/host-api.js', import.meta.url), 'utf8');
const raw = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
const BOOK = '【源堡】玩家自建内容', COMMAND = '[快捷指令]', STATE = '[快捷指令状态]';
const plain = value => JSON.parse(JSON.stringify(value));
function original(name) {
  const start = raw.search(new RegExp(`^\\s*${name}\\(`, 'm'));
  const tree = ts.createSourceFile('original.js', `({${raw.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree).replace(/,$/, '');
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return vm.runInNewContext(`({${member}})`, { console })[name];
}
function fixture() {
  const state = { version: 1, isKeepShortcutsEnabled: false, pendingSupplementary: ['行动A'] };
  const books = new Map([
    [BOOK, [{ uid: 1, name: COMMAND, content: '<cmd>\n行动A\n</cmd>\n<cmd>行动B</cmd>', enabled: false, extra: { retain: true } },
      { uid: 2, name: STATE, content: JSON.stringify(state), enabled: false },
      { uid: 9, name: '其他插件', content: '保留', enabled: true }]],
    ['1源堡', [{ uid: 8, name: COMMAND, content: '<cmd>原版备用</cmd>' }]],
    ['当前主书', [{ uid: 18, name: COMMAND, content: '<cmd>当前角色备用</cmd>' }]],
  ]);
  const flags = { writes: 0, floorWrites: 0, before: null, failWrite: false, failRead: false, injections: [], uninjects: 0 };
  const handlers = new Map();
  const events = { GENERATION_AFTER_COMMANDS: 'before', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop', CHAT_CHANGED: 'chat' };
  const floors = [{ message_id: 3, role: 'user', message: '原生行动' }];
  const modules = {};
  const surface = { document: {}, window: null };
  const after = {
    getHost: () => surface,
    tavernEvents: () => events,
    bindEvent(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(fn);
      return { stop() { handlers.get(name)?.delete(fn); } };
    },
  };
  const host = {
    async getWorldbook(book) {
      await flags.readHook?.(book);
      if (flags.failRead) throw Error('读取失败');
      if (!books.has(book)) throw Error('世界书不存在');
      return structuredClone(books.get(book));
    },
    async getCharWorldbookNames() { return { primary: flags.primary || '当前主书', additional: [] }; },
    async getChatMessages(_range, options = {}) {
      await flags.floorHook?.(options);
      if (!options.include_swipes) return structuredClone(floors).map(row => ({ data: {}, ...row }));
      return floors.map(row => ({ message_id: row.message_id, role: row.role, name: row.name, is_hidden: Boolean(row.is_hidden),
        swipe_id: 0, swipes: [row.message], swipes_data: [structuredClone(row.data || {})],
        swipes_info: [{}], ...structuredClone(flags.pages?.[row.message_id] || {}) }));
    },
    scriptVariableOptions: () => ({ type: 'script', script_id: flags.script || 'shortcuts-test' }),
    async createChatMessages(messages) {
      for (const message of messages) floors.push({ message_id: (floors.at(-1)?.message_id ?? -1) + 1, data: {}, ...structuredClone(message) });
      await flags.created?.();
    },
    async setChatMessages(messages) {
      for (const message of messages) Object.assign(floors.find(row => row.message_id === message.message_id), structuredClone(message));
    },
    async deleteChatMessages(ids) {
      for (let index = floors.length - 1; index >= 0; index--) if (ids.includes(floors[index].message_id)) floors.splice(index, 1);
    },
    async generate(config) {
      flags.requests ||= [];
      flags.requests.push(structuredClone(config));
      await emit('GENERATION_STARTED', 'normal', {}, false);
      await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
      if (flags.retry && flags.requests.length === 1) throw Error('一次请求失败');
      return '原生正文';
    },
    async createWorldbook(book) { if (books.has(book)) throw Error('世界书已存在'); books.set(book, []); },
    async updateWorldbookWith(book, update) {
      await flags.before?.();
      const next = await update(structuredClone(books.get(book)));
      if (flags.failWrite) throw Error('提交失败');
      let uid = 10;
      books.set(book, structuredClone(next).map(entry => ({ ...entry, uid: entry.uid ?? uid++ })));
      flags.writes++;
      if (flags.failAfter) flags.failRead = true;
      if (flags.lostResponse) throw Error('响应丢失');
    },
    injectPrompts(prompts, options) {
      flags.injections.push({ prompts: structuredClone(prompts), options });
      return { uninject() { flags.uninjects++; } };
    },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = after;
  const ctx = {
    console, structuredClone, DOMException, AbortController, Event, setTimeout, clearTimeout, dispatchEvent() {},
    SillyTavern: { getCurrentChatId: () => flags.chat || 'shortcuts-chat' },
    cryptLord: { __stage1Modules: modules, contract: {
      initializeGlobal(key, api) { modules[key] = api; },
      releaseGlobal(key) { delete modules[key]; },
      async waitGlobalInitialized(key) { return modules[key]; },
    } },
  };
  ctx.window = ctx;
  surface.window = ctx;
  vm.runInNewContext(floorSource, ctx);
  vm.runInNewContext(source, ctx);
  const api = modules['cryptLord.quickShortcuts'];
  const emit = async (name, ...args) => { for (const fn of handlers.get(events[name]) || []) await fn(...args); };
  const begin = () => {
    if (floors.at(-1)?.role === 'assistant') floors.push({ message_id: floors.at(-1).message_id + 1, role: 'user', message: '原生行动' });
    const userMessageId = floors.at(-1).message_id;
    return { assistantMessageId: userMessageId + 1, userMessageId, generationId: `native-host-${userMessageId + 1}`, userText: '原生行动', narrativeText: '原生正文' };
  };
  const runBridge = () => {
    modules['cryptLord.contextBuilder'] = { async build() { return []; } };
    modules['cryptLord.generationQuality'] = {
      async readSnapshot() { return { settings: { retryLimit: 1 } }; },
      async inspect(text) { return { passed: true, text }; },
      retryDelayMs: () => 0,
    };
    modules['cryptLord.responseNormalizer'] = { normalize: text => ({ raw: text, message: text }), extractActions: () => [] };
    modules['cryptLord.nativeSettlement'] = { apply() {} };
    modules['cryptLord.variablePatch'] = { apply: () => ({ applied: false }), updateTag: () => '', embedUpdate: text => text };
    modules['cryptLord.variableSettlementApi'] = { async settle() {
      // A variable side request must not consume/reset the native narrative's injection ticket.
      await emit('GENERATION_AFTER_COMMANDS', 'quiet', { quiet_prompt: '结算变量' }, false);
      return { skipped: true };
    } };
    modules['cryptLord.stateStore'] = {
      async readAssistantData() { return {}; },
      async readMessage() { return { message: '原生正文' }; },
      async writeAssistantMessage(id, message, data) {
        if (flags.floorFail) throw Error('楼层提交失败');
        flags.floorWrites++;
        const row = floors.find(row => row.message_id === id);
        if (row) Object.assign(row, { message, data });
        else floors.push({ message_id: id, role: 'assistant', message, data });
      },
    };
    vm.runInNewContext(bridgeSource, ctx);
    return modules['cryptLord.nativeFloorBridge'];
  };
  const runNative = () => {
    vm.runInNewContext(nativeSource, ctx);
    return modules['cryptLord.nativeFloor'];
  };
  return { api, books, flags, emit, runBridge, runNative, modules, floors, begin, surface };
}
test('原版规则与指令/状态整体保存保护', async () => {
  let registeredHost;
  let forwarded;
  const handle = { uninject() {} };
  const owner = { injectPrompts(prompts, options) { forwarded = { owner: this, prompts, options }; return handle; } };
  const hostWindow = { TavernHelper: owner, cryptLord: { contract: {
    initializeGlobal(_key, api) { registeredHost = api; },
  } } };
  vm.runInNewContext(hostSource, { window: hostWindow });
  assert.equal(registeredHost.injectPrompts([{ id: 'fixture' }], { once: true }), handle);
  assert.equal(forwarded.owner, owner);
  assert.equal(forwarded.options.once, true);
  let f = fixture();
  const originalParse = original('_parseQuickShortcuts');
  for (const text of ['', '<cmd>多行\n指令</cmd><cmd>第二条</cmd>', '1. 第一条\n2. 第二条', '1. \n3. 内容']) {
    assert.deepEqual(plain(f.api.parse(text)), plain(originalParse(text)));
  }
  const loaded = await f.api.load();
  const normalize = original('_normalizeQuickShortcutState');
  const value = { isKeepShortcutsEnabled: true, pendingSupplementary: [' 行动A ', '行动A', '行动B'] };
  const saved = await f.api.save(loaded.commands, value, loaded.revisions);
  assert.deepEqual(plain(saved.state), plain(normalize(value)));
  assert.equal(f.flags.writes, 1);
  assert.equal(f.books.get(BOOK)[0].extra.retain, true);
  assert.equal(f.books.get(BOOK)[2].content, '保留');
  await assert.rejects(f.api.save(['新指令'], value, loaded.revisions), /外部修改/);
  f.flags.failWrite = true;
  await assert.rejects(f.api.save(['新指令'], { pendingSupplementary: ['新指令'] }, saved.revisions), /提交失败/);
  assert.deepEqual(plain((await f.api.load()).commands), ['行动A', '行动B']);
  f.flags.failWrite = false;
  await f.api.save([], { pendingSupplementary: [] }, saved.revisions);
  assert.equal((await f.api.load()).source, 'custom');
  assert.deepEqual(plain((await f.api.load()).commands), []);
  f = fixture();
  f.books.get(BOOK).splice(0, 1);
  const fallback = await f.api.load();
  assert.equal(fallback.source, 'primary-fallback');
  assert.deepEqual(plain(fallback.commands), ['当前角色备用']);
  f.flags.primary = '1源堡';
  await assert.rejects(f.api.save(['玩家自建'], {}, fallback.revisions), /外部修改/);
  f.flags.primary = '';
  f.flags.before = () => f.books.get(BOOK).push({ uid: 6, comment: COMMAND, content: '竞争新增' });
  await assert.rejects(f.api.save(['玩家自建'], {}, fallback.revisions), /外部修改/);
  assert.equal(f.flags.writes, 0);
  f = fixture();
  const snapshot = await f.api.load();
  f.books.get(BOOK)[1].uid = 99;
  await assert.rejects(f.api.save(snapshot.commands, snapshot.state, snapshot.revisions), /外部修改/);
  f.books.get(BOOK)[1].content = '{坏JSON';
  await assert.rejects(f.api.load(), /JSON 损坏/);
  const repair = await f.api.load({ repairState: true });
  assert.equal(f.flags.writes, 0);
  await f.api.save(repair.commands, repair.state, repair.revisions, undefined, { repairState: true });
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), []);
  f = fixture();
  let current = true;
  f.flags.before = () => { current = false; };
  const before = await f.api.load();
  await assert.rejects(f.api.save(before.commands, before.state, before.revisions, () => { if (!current) throw Error('关窗'); }), /关窗/);
  assert.equal(f.flags.writes, 0);
  f.flags.before = null;
  f.flags.failAfter = true;
  const submitted = await f.api.save(before.commands, before.state, before.revisions);
  assert.match(submitted.warning, /已提交.*复核失败/);
  assert.equal(submitted.revisions, null);
  f = fixture();
  const loss = await f.api.load();
  f.flags.lostResponse = true;
  const acknowledged = await f.api.save(['成功但响应丢失'], {}, loss.revisions);
  assert.match(acknowledged.warning, /未返回成功响应/);
  assert.ok(acknowledged.revisions);
  assert.deepEqual(plain((await f.api.load()).commands), ['成功但响应丢失']);
  f = fixture();
  const edit = await f.api.load();
  f.flags.before = async () => { await f.emit('GENERATION_STARTED', 'normal'); };
  await assert.rejects(f.api.save(['不能覆盖'], {}, edit.revisions), /生成或聊天已变化/);
  assert.equal(f.flags.writes, 0);
  await f.emit('GENERATION_ENDED');
  f.flags.before = null;
  await assert.rejects(f.api.save(['不能覆盖'], {}, edit.revisions, () => false), /已取消/);
  await f.api.save(['恢复后保存'], {}, (await f.api.load()).revisions);
});
test('原生请求注入与成功楼层清理完整链路', async () => {
  const f = fixture();
  const loaded = await f.api.load();
  const bridge = f.runBridge();
  await f.emit('GENERATION_AFTER_COMMANDS', 'quiet', {}, false);
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, true);
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', { dryRun: true }, false);
  await f.emit('GENERATION_AFTER_COMMANDS', 'dryRun', {}, false);
  await f.emit('GENERATION_AFTER_COMMANDS', 'continue', {}, false);
  await f.emit('GENERATION_AFTER_COMMANDS', 'swipe', {}, false);
  assert.equal(f.flags.injections.length, 0);
  await f.emit('GENERATION_AFTER_COMMANDS', undefined, {}, false);
  const injection = f.flags.injections[0];
  assert.equal(injection.prompts[0].content, '[补充指令]\n1. 行动A');
  assert.equal(injection.prompts[0].should_scan, true);
  assert.equal(injection.options.once, true);
  assert.equal(f.flags.writes, 0);
  let transaction = f.begin();
  await assert.rejects(f.api.consumeNative(transaction, '伪造正文'), /真实楼层/);
  assert.equal(f.flags.writes, 0);
  f.flags.floorFail = true;
  await assert.rejects(bridge.completeNarrative('原生正文', transaction), /楼层提交失败/);
  assert.equal((await f.api.load()).state.pendingSupplementary[0], '行动A');
  f.flags.floorFail = false;
  await bridge.completeNarrative('原生正文', transaction);
  assert.equal(f.flags.floorWrites, 1);
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), []);
  await f.api.saveState({ isKeepShortcutsEnabled: true, pendingSupplementary: ['行动B'] });
  transaction = f.begin();
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  await bridge.completeNarrative('原生正文', transaction);
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), ['行动B']);
  await f.api.saveState({ pendingSupplementary: ['行动A'] });
  transaction = f.begin();
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  await f.emit('GENERATION_STOPPED');
  await bridge.completeNarrative('原生正文', transaction);
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), ['行动A']);
  transaction = f.begin();
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  await f.api.saveState({ pendingSupplementary: ['行动B'] });
  await bridge.completeNarrative('原生正文', transaction);
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), ['行动B']);
  transaction = f.begin();
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  await f.emit('CHAT_CHANGED');
  await bridge.completeNarrative('原生正文', transaction);
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), ['行动B']);
  // Explicit generate() requests carry their own supplement snapshot, not a shared last-turn array.
  const built = await bridge.buildGenerationConfig('脚本请求');
  assert.match(built.config.user_input, /行动B/);
  await f.api.saveState({ pendingSupplementary: ['行动A'] });
  await bridge.completeNarrative('正文', { ...transaction, generationId: 'helper-request', shortcutTurn: built.shortcutTurn });
  assert.deepEqual(plain((await f.api.load()).state.pendingSupplementary), ['行动A']);
  // Frontend tickets also require the exact current public floor/page proof.
  const front = fixture();
  front.floors.length = 0;
  front.floors.push({ message_id: 0, role: 'assistant', message: '开场' });
  const turn = await front.api.prepareTurn();
  const user = { message_id: 1, role: 'user', message: '前端行动' };
  front.floors.push(user, { message_id: 2, role: 'assistant', message: '已保存正文' });
  const tx = { userMessageId: 1, assistantMessageId: 2, userText: user.message };
  assert.equal(await front.api.consumeTurn(tx, structuredClone(turn), '已保存正文'), false);
  front.floors[0].message = '旧楼层被编辑';
  await assert.rejects(front.api.consumeTurn(tx, turn, '已保存正文'), /真实楼层/);
  front.floors[0].message = '开场';
  front.flags.pages = { 0: { swipes: ['开场', '另一个开局'] } };
  await assert.rejects(front.api.consumeTurn(tx, turn, '已保存正文'), /真实楼层/);
  front.flags.pages = { 2: { swipes: ['已保存正文', '重roll正文'] } };
  await assert.rejects(front.api.consumeTurn(tx, turn, '已保存正文'), /消息页不唯一/);
  front.flags.pages = null;
  front.flags.lostResponse = true;
  assert.ok(await front.api.consumeTurn(tx, turn, '已保存正文'));
  assert.deepEqual(plain((await front.api.load()).state.pendingSupplementary), []);
  assert.equal(await front.api.consumeTurn(tx, turn, '已保存正文'), false);
  front.flags.lostResponse = false;
  await front.api.saveState({ pendingSupplementary: ['行动B'] });
  const frontendBridge = front.runBridge();
  const frontendConfig = await frontendBridge.buildGenerationConfig('前端回合');
  front.floors.push({ message_id: 3, role: 'user', message: '前端回合' });
  await frontendBridge.completeNarrative('原生正文', {
    userMessageId: 3, assistantMessageId: 4, userText: '前端回合', generationId: 'helper-front',
    shortcutTurn: frontendConfig.shortcutTurn,
  });
  assert.deepEqual(plain((await front.api.load()).state.pendingSupplementary), []);
  assert.equal(front.flags.floorWrites, 1);
  // Full native frontend transaction: the native event must not invalidate or double-inject its own ticket.
  const whole = fixture();
  whole.floors.splice(0, 1, { message_id: 0, role: 'assistant', message: '开场', data: {} });
  whole.runBridge();
  let stateReads = 0;
  whole.modules['cryptLord.stateStore'].readAssistantData = async () => {
    if (!stateReads++) whole.floors[0].data = { openingInitialized: true };
    return structuredClone(whole.floors[0].data);
  };
  const native = whole.runNative();
  whole.flags.retry = true;
  await native.submitNativeTurn('完整前端行动');
  assert.equal(whole.flags.requests.length, 2);
  assert.equal(whole.flags.requests[0].user_input, whole.flags.requests[1].user_input);
  assert.equal(whole.flags.injections.length, 0);
  assert.deepEqual(plain((await whole.api.load()).state.pendingSupplementary), []);
  assert.equal(whole.flags.floorWrites, 1);
  assert.equal(whole.floors.length, 3);
  assert.equal(whole.floors[0].data.openingInitialized, true);
  native.dispose();
  const stale = fixture();
  stale.floors.splice(0, 1, { message_id: 0, role: 'assistant', message: '开场', data: {} });
  stale.runBridge();
  const staleNative = stale.runNative();
  stale.flags.created = () => { stale.books.get(BOOK)[1].content = JSON.stringify({ pendingSupplementary: ['行动B'] }); };
  await staleNative.submitNativeTurn('不能发送过期指令');
  assert.equal(stale.flags.requests?.length || 0, 0);
  assert.equal(stale.floors.length, 1);
  assert.deepEqual(plain((await stale.api.load()).state.pendingSupplementary), ['行动B']);
  staleNative.dispose();
  const moved = fixture();
  moved.floors.splice(0, 1, { message_id: 0, role: 'assistant', message: '开场', data: {} });
  moved.runBridge();
  const movedNative = moved.runNative();
  moved.flags.created = () => { moved.flags.chat = '未触发事件的新聊天'; };
  await movedNative.submitNativeTurn('同名行动不能误删');
  assert.equal(moved.flags.requests?.length || 0, 0);
  assert.equal(moved.floors.length, 2);
  assert.equal(movedNative.hasActiveTurn(), false);
  assert.deepEqual(plain((await moved.api.load()).state.pendingSupplementary), ['行动A']);
  movedNative.dispose();
  // Complete selected-page data, hidden/name correspondence and every source identity participate.
  const guarded = fixture();
  guarded.flags.pages = { 3: { swipes_data: [{ changed: true }] } };
  await assert.rejects(guarded.api.prepareTurn(), /正文、变量或所选分支/);
  guarded.flags.pages = { 3: { name: '其他名字' } };
  await assert.rejects(guarded.api.prepareTurn(), /正文、变量或所选分支/);
  guarded.flags.pages = null;
  guarded.floors[0].is_hidden = true;
  await assert.rejects(guarded.api.prepareTurn(), /隐藏/);
  delete guarded.floors[0].is_hidden;
  for (const change of [
    () => { guarded.surface.document = {}; },
    () => { guarded.flags.script = '换脚本'; },
    () => { guarded.flags.chat = '换聊天'; },
    () => { guarded.modules['cryptLord.nativeFloorSource'] = { ...guarded.modules['cryptLord.nativeFloorSource'] }; },
  ]) {
    const saved = { ...guarded.surface }, script = guarded.flags.script, chat = guarded.flags.chat, reader = guarded.modules['cryptLord.nativeFloorSource'];
    const ticket = await guarded.api.prepareTurn();
    change();
    await assert.rejects(guarded.api.assertTurn(ticket), /变化/);
    Object.assign(guarded.surface, saved); guarded.flags.script = script; guarded.flags.chat = chat; guarded.modules['cryptLord.nativeFloorSource'] = reader;
  }
  await guarded.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  const count = guarded.flags.injections.length, admin = guarded.api.status().adminEpoch;
  for (const [type, options, dryRun] of [
    ['quiet_prompt', {}, false], ['normal', { quiet_prompt: '副模型' }, false],
    ['normal', { dryRun: true }, false], ['normal', {}, true],
  ]) {
    await guarded.emit('GENERATION_AFTER_COMMANDS', type, options, dryRun);
    await guarded.emit('GENERATION_STARTED', type, options, dryRun);
  }
  assert.equal(guarded.flags.injections.length, count);
  assert.equal(guarded.api.status().adminEpoch, admin);
  const quietTx = guarded.begin();
  guarded.floors.push({ message_id: quietTx.assistantMessageId, role: 'assistant', message: '静默后正文', data: {} });
  await guarded.api.consumeNative(quietTx, '静默后正文');
  assert.deepEqual(plain((await guarded.api.load()).state.pendingSupplementary), []);
  assert.deepEqual(plain(f.books.get('1源堡')), [{ uid: 8, name: COMMAND, content: '<cmd>原版备用</cmd>' }]);
  assert.equal(loaded.commands.length, 2);
  f.api.dispose();
  await f.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  await assert.rejects(f.api.load(), /已卸载/);
});
