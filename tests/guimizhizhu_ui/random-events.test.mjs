import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = await readFile(path.join(base, 'public/guimizhizhu_ui/core/random-events.js'), 'utf8');
const bridgeScript = await readFile(path.join(base, 'public/guimizhizhu_ui/core/generation-bridge.js'), 'utf8');
const floorScript = await readFile(path.join(base, 'public/guimizhizhu_ui/core/native-floor-source.js'), 'utf8');
const shortcutScript = await readFile(path.join(base, 'public/guimizhizhu_ui/core/quick-shortcuts.js'), 'utf8');
const nativeScript = await readFile(path.join(base, 'public/guimizhizhu_ui/modules/native-floor/index.js'), 'utf8');
const original = await readFile(path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36a-js-items-equip-relationships.txt'), 'utf8');
const tree = ts.createSourceFile('original.js', `({${original.slice(original.indexOf('executeRandomDraw(entry,'))}\n})`, 99, true, ts.ScriptKind.JS);
let originalDraw;
function findDraw(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(tree) === 'executeRandomDraw') originalDraw = node.getText(tree).replace(/,$/, '');
  ts.forEachChild(node, findDraw);
}
findDraw(tree);
assert.ok(originalDraw);
const sample = {
  name: '街头遭遇', isEnabled: true, order: 2, 触发率: 1, 抽取数量: 2,
  输出指令: '发生${type}-${name}：${description}',
  事件列表: [
    { weight: 10, type: '日常', name: '来信', description: '收到一封信' },
    { weight: 1, type: '奇遇', name: '偶遇', description: '遇到熟人' },
    { weight: 0, type: '忽略', name: '不触发', description: '' },
  ],
};
const books = new Map([
  ['1源堡', [{
    uid: 1, name: '【随机】街头遭遇', content: JSON.stringify(sample), enabled: true,
    strategy: { type: 'selective', keys: ['街头'] },
    position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
  }]],
  ['2历史孔隙', [
    { uid: 2, name: '【随机】街头遭遇', content: JSON.stringify({ ...sample, name: '旧版' }), enabled: true },
    { uid: 3, name: '【随机】梦境', content: JSON.stringify({ ...sample, name: '梦境', isEnabled: false }), enabled: true },
  ]],
]);
let vars = {};
let chat = 'chat-1';
let worldbookWrites = 0;
let failBook = '';
let binding = { primary: '1源堡', additional: [] }, lostBook = '', failVariables = false, lostVariables = false, readHook = null, updateHook = null;
let rows = [{ message_id: 0, role: 'assistant', message: '开场', data: {} }];
let pages = null;
let variableHook = null, floorHook = null, skipVariables = false, scriptId = 'test';
const surface = { document: {}, window: null };
const messagePages = () => rows.map(({ message, data, ...row }) => ({
  ...row, swipe_id: 0, swipes: [message], swipes_data: [structuredClone(data || {})], swipes_info: [{}],
}));
const listeners = new Map(), injects = [];
const emit = async (name, ...args) => { for (const fn of listeners.get(name) || []) await fn(...args); };
function append(role, message) {
  const message_id = (rows.at(-1)?.message_id ?? -1) + 1;
  rows.push({ message_id, role, message, data: {} });
  return message_id;
}
const host = {
  async getCharWorldbookNames() { return structuredClone(binding); },
  async getWorldbook(book) {
    if (readHook) { const hook = readHook; readHook = null; await hook(book); }
    if (!books.has(book)) throw new Error('世界书不存在'); return structuredClone(books.get(book));
  },
  async getChatMessages(_range, options) {
    await floorHook?.(options);
    return structuredClone(options?.include_swipes ? pages || messagePages() : rows);
  },
  injectPrompts(prompts, options) {
    const receipt = { prompts: structuredClone(prompts), options: structuredClone(options), active: true };
    injects.push(receipt); return { uninject() { receipt.active = false; } };
  },
  async getWorldbookNames() { return [...books.keys()]; },
  async updateWorldbookWith(book, updater) {
    if (updateHook) { const hook = updateHook; updateHook = null; await hook(book); }
    if (failBook === book) { failBook = ''; throw new Error('模拟写入失败'); }
    const result = structuredClone(await updater(structuredClone(books.get(book))));
    books.set(book, result);
    worldbookWrites++;
    if (lostBook === book) { lostBook = ''; throw Error('模拟响应丢失'); }
    return structuredClone(result);
  },
  async createWorldbookEntries() { throw new Error('覆盖条目应随世界书更新写入'); },
  async deleteWorldbookEntries() { throw new Error('原版世界书内容不应直接删除'); },
  scriptVariableOptions() { return { type: 'script', script_id: scriptId }; },
  getVariables() { return structuredClone(vars); },
  async replaceVariables(value) {
    if (failVariables) { failVariables = false; throw Error('模拟脚本变量写入失败'); }
    vars = structuredClone(value);
    if (lostVariables) { lostVariables = false; throw Error('模拟脚本变量响应丢失'); }
  },
  async updateVariablesWith(updater) {
    if (variableHook) { const hook = variableHook; variableHook = null; await hook(); }
    const next = await updater(structuredClone(vars));
    if (skipVariables) return;
    await this.replaceVariables(next);
  },
};
const registered = new Map();
const context = {
  console, structuredClone, DOMException, AbortController, Event, setTimeout, clearTimeout, dispatchEvent() {},
  SillyTavern: { getCurrentChatId: () => chat },
  cryptLord: {
    __stage1Modules: {
      'cryptLord.hostApi': host,
      'cryptLord.afterNativeHost': {
        getHost: () => surface,
        tavernEvents() { return Object.fromEntries(['CHAT_CHANGED', 'GENERATION_AFTER_COMMANDS', 'GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED'].map(key => [key, key])); },
        bindEvent(name, fn) {
          const set = listeners.get(name) || new Set(); set.add(fn); listeners.set(name, set);
          return { stop() { set.delete(fn); } };
        },
      },
    },
    contract: {
      initializeGlobal(key, api) { registered.set(key, api); },
      releaseGlobal(key) { registered.delete(key); },
      async waitGlobalInitialized(key) { return context.cryptLord.__stage1Modules[key]; },
    },
  },
};
context.window = context;
context.parent = context;
context.top = context;
surface.window = context;
vm.runInNewContext(floorScript, context);
vm.runInNewContext(script, context);
const api = registered.get('cryptLord.randomEvents');
await new Promise(resolve => setImmediate(resolve));
assert.equal(api.status().nativeReady, true);
for (const entry of [
  sample,
  { ...sample, order: 0, 输出指令: '${weight}/${empty}/${extra}/${missing}', 事件列表: [
    { name: '零', weight: 0, empty: false, extra: '$&' }, { name: '一', weight: 1 }, { name: '二', weight: 1 },
  ] },
  { ...sample, 事件列表: [{ name: '全零', weight: 0 }, { name: '', weight: 5 }] },
]) {
  for (const random of [0, 0.5, 0.999999]) {
    const originalApi = vm.runInNewContext(`({${originalDraw}})`, { Math: Object.assign(Object.create(Math), { random: () => random }) });
    assert.deepEqual(structuredClone(api.draw(entry, 3, () => random)), structuredClone(originalApi.executeRandomDraw(entry, 3)));
  }
}
assert.equal(api.parseEntry('{\n // note\n "url": "https://example.test/a//b", "list": [1, /* kept */ 2,],\n}').list.length, 2);
assert.equal(api.parseEntry('{"text":"a,b"}').text, 'a,b');
assert.throws(() => api.parseEntry('{"broken":/* unfinished'), /未闭合/);
let loaded = await api.load();
assert.equal(loaded.entries.length, 2);
assert.equal(loaded.entries[0].entry.name, '街头遭遇');
assert.equal(loaded.entries[1].entry.name, '梦境');
assert.equal(loaded.entries[1].book, '2历史孔隙');
const draws = api.draw(loaded.entries[0].entry, 2, () => 0);
assert.deepEqual(Array.from(draws, item => item.eventName), ['来信', '偶遇']);
assert.equal(draws[0].text, '发生日常-来信：收到一封信');
assert.deepEqual(Array.from(api.passive(loaded.entries, () => 0), item => item.eventName), ['来信', '偶遇']);
assert.match(api.format(draws), /^\[随机事件1-街头遭遇\]/);
assert.throws(() => api.normalize({ ...sample, 触发率: 2 }), /0 至 1/);
assert.throws(() => api.normalize({ ...sample, 事件列表: [{ name: '坏权重', weight: -1 }] }), /非负/);
await api.queueManual(draws);
assert.equal((await api.pending()).events.length, 2);
chat = 'chat-2';
assert.equal((await api.pending()).events.length, 0);
chat = 'chat-1';
await api.queueManual([draws[0]]);
const ticket = await api.prepareTurn({ random: () => 0 });
assert.equal(await api.consumeTurn({}, structuredClone(ticket), '正文'), false);
const userId = append('user', '事件行动'), assistantId = append('assistant', '正文');
assert.equal(await api.consumeTurn({ userMessageId: userId, assistantMessageId: assistantId, userText: '事件行动' }, ticket, '正文'), true);
assert.equal((await api.pending()).events.length, 0);
await api.queueManual([draws[0]]);
assert.equal((await api.pending()).events.length, 1);
const modules = context.cryptLord.__stage1Modules;
let committed = null;
Object.assign(modules, {
  'cryptLord.contextBuilder': { async build() { return []; } },
  'cryptLord.stateStore': {
    async readAssistantData() { return {}; },
    async readMessage(id) { return structuredClone(rows.find(row => row.message_id === id)); },
    async writeAssistantMessage(id, message, data) { committed = data; Object.assign(rows.find(row => row.message_id === id), { message, data: structuredClone(data) }); },
  },
  'cryptLord.responseNormalizer': { extractActions() { return []; } },
  'cryptLord.nativeSettlement': { apply() {} },
  'cryptLord.variablePatch': {
    apply(_raw, state) { return { applied: false, data: state }; },
    updateTag() { return ''; },
    embedUpdate(text) { return text; },
  },
  'cryptLord.variableSettlementApi': { async settle() { return { skipped: true }; } },
  'cryptLord.generationQuality': { async readSnapshot() { return { settings: { retryLimit: 1, streamTimeoutSeconds: 10, noStreamTimeoutSeconds: 10 } }; } },
});
vm.runInNewContext(bridgeScript, context);
const bridge = registered.get('cryptLord.nativeFloorBridge');
let built = await bridge.buildGenerationConfig('继续前进');
assert.match(built.config.user_input, /随机事件1-街头遭遇/);
assert.match(built.config.user_input, /发生日常-来信/);
assert.match(built.config.user_input, /继续前进$/);
await bridge.onTurnFailed(new Error('模拟失败'));
assert.equal((await api.pending()).events.length, 1);
built = await bridge.buildGenerationConfig('再试一次');
assert.match(built.config.user_input, /发生日常-来信/);
const retryUser = append('user', '再试一次'), retryAssistant = append('assistant', '正文');
await bridge.completeNarrative('正文', {
  userMessageId: retryUser, assistantMessageId: retryAssistant, userText: '再试一次', narrativeText: '正文', randomTurn: built.randomTurn,
});
assert.ok(committed);
assert.equal((await api.pending()).events.length, 0);
const revision = loaded.revision;
loaded = await api.save(loaded.entries, revision);
assert.equal(worldbookWrites, 0);
loaded.entries[0].entry.输出指令 = '修改后${name}';
loaded = await api.save(loaded.entries, loaded.revision);
assert.equal(books.get('1源堡').length, 2);
assert.equal(books.get('1源堡')[0].uid, 1);
assert.equal(books.get('1源堡')[0].enabled, false);
assert.equal(books.get('2历史孔隙')[0].enabled, false);
assert.equal(JSON.parse(books.get('1源堡')[0].content).输出指令, sample.输出指令);
assert.equal(books.get('1源堡')[1].enabled, true);
assert.equal(books.get('1源堡')[1].strategy.keys[0], '街头');
assert.equal(books.get('1源堡')[1].extra.cryptLordRandomEvent.owner, 'test');
assert.equal(JSON.parse(books.get('1源堡')[1].content).输出指令, '修改后${name}');
assert.equal(loaded.entries[0].entry.输出指令, '修改后${name}');
assert.equal(loaded.entries[1].book, '2历史孔隙');
loaded.entries[0].entry.isEnabled = false;
loaded = await api.save(loaded.entries, loaded.revision);
assert.equal(books.get('1源堡')[1].enabled, false);
assert.equal(books.get('1源堡')[0].enabled, false);
loaded.entries[0].entry.isEnabled = true;
loaded = await api.save(loaded.entries, loaded.revision);
assert.equal(books.get('1源堡')[1].enabled, true);
await assert.rejects(api.save(loaded.entries, revision), /已变化/);
await assert.rejects(api.restore(revision), /已变化/);
const primarySource = loaded.entries[0];
await assert.rejects(api.remove(primarySource, revision), /已变化/);
loaded = await api.remove(primarySource, loaded.revision);
assert.equal(loaded.entries.some(item => item.comment === primarySource.comment), false);
assert.equal(api.passive(loaded.entries, () => 0).length, 0);
assert.equal(books.get('1源堡').length, 1);
assert.equal(books.get('1源堡')[0].enabled, false);
assert.equal(books.get('2历史孔隙')[0].uid, 2);
assert.equal((await api.load()).entries.length, 1);
const hiddenGeneration = await bridge.buildGenerationConfig('隐藏后的行动');
assert.doesNotMatch(hiddenGeneration.config.user_input, /随机事件1-街头遭遇/);
await bridge.onTurnFailed(new Error('模拟失败'));
loaded.entries.push({ comment: '', entry: { ...sample, name: '本地奇遇' } });
loaded = await api.save(loaded.entries, loaded.revision);
assert.equal(loaded.entries.length, 2);
const localSource = loaded.entries.find(item => item.entry.name === '本地奇遇');
assert.equal(localSource.local, true);
assert.equal(books.get('1源堡').length, 2);
assert.equal(books.get('1源堡')[1].enabled, true);
assert.equal(books.get('1源堡')[1].strategy.type, 'constant');
assert.equal(books.get('1源堡')[1].position.depth, 0);
loaded = await api.remove(localSource, loaded.revision);
assert.equal(loaded.entries.length, 1);
assert.equal(books.get('1源堡').length, 1);
chat = 'chat-2';
assert.equal((await api.load()).entries.length, 1);
chat = 'chat-1';
loaded = await api.restore(loaded.revision);
assert.equal(loaded.entries.length, 2);
assert.equal(loaded.entries[0].entry.输出指令, sample.输出指令);
assert.equal(loaded.entries[0].book, '1源堡');
assert.equal(books.get('1源堡')[0].enabled, true);
assert.equal(books.get('2历史孔隙')[0].enabled, true);
assert.equal(vars['cryptLord.randomEventsLocal'], undefined);
assert.ok(vars['cryptLord.randomEventsPending']);
loaded.entries[0].entry.isEnabled = false;
loaded = await api.save(loaded.entries, loaded.revision);
assert.equal(books.get('1源堡').length, 1);
assert.equal(books.get('1源堡')[0].enabled, false);
assert.equal(loaded.entries[0].entry.isEnabled, false);
loaded = await api.restore(loaded.revision);
assert.equal(books.get('1源堡')[0].enabled, true);
assert.equal(books.get('2历史孔隙')[0].enabled, true);
assert.ok(worldbookWrites >= 6);
await assert.rejects(api.remove({}, loaded.revision), /目标无效/);
const beforeFailure = structuredClone([...books]);
loaded.entries[1].entry.输出指令 = '梦境修订';
failBook = '1源堡';
await assert.rejects(api.save(loaded.entries, loaded.revision), /已回滚世界书/);
assert.deepEqual([...books], beforeFailure);
assert.equal(vars['cryptLord.randomEventsLocal'], undefined);
loaded.entries[0].entry.输出指令 = '二次修订';
loaded.entries[1].entry.输出指令 = sample.输出指令;
loaded = await api.save(loaded.entries, loaded.revision);
const shadow = books.get('1源堡').find(item => item.extra?.cryptLordRandomEvent);
const shadowContent = shadow.content;
shadow.content = '{"name":"外部改动"}';
let tampered = await api.load();
await assert.rejects(api.restore(tampered.revision), /覆盖条目.*外部修改/);
shadow.content = shadowContent;
books.get('1源堡')[0].enabled = true;
tampered = await api.load();
await assert.rejects(api.restore(tampered.revision), /启用状态.*外部修改/);
books.get('1源堡')[0].enabled = false;
loaded = await api.restore((await api.load()).revision);
assert.equal(books.get('1源堡').length, 1);
vars['cryptLord.randomEventsLocal'] = {
  version: 1, hidden: [], overrides: [
    { comment: '【随机】街头遭遇', entry: { ...sample, 输出指令: '旧版本地覆盖' } },
  ],
};
loaded = await api.load();
assert.equal(loaded.entries[0].entry.输出指令, '旧版本地覆盖');
assert.equal(books.get('1源堡')[0].enabled, true);
assert.equal(books.get('1源堡').length, 1);
assert.equal(loaded.legacy, true);
loaded = await api.save(loaded.entries, loaded.revision);
assert.equal(books.get('1源堡')[0].enabled, false);
assert.equal(books.get('1源堡').length, 2);
assert.ok(vars['cryptLord.randomEventsLocal'].scopes['1源堡'].baselines);
loaded = await api.restore(loaded.revision);
assert.equal(books.get('1源堡')[0].enabled, true);
assert.equal(books.get('1源堡').length, 1);
vars.otherPlugin = { keep: '不动' };
loaded.entries[0].entry.输出指令 = '响应丢失仍确认${name}';
lostBook = '1源堡';
lostVariables = true;
loaded = await api.save(loaded.entries, loaded.revision);
assert.match(loaded.warning, /未返回成功响应/);
assert.deepEqual(vars.otherPlugin, { keep: '不动' });
const firstScope = structuredClone(vars['cryptLord.randomEventsLocal'].scopes['1源堡']);
books.set('另一角色主书', [{ uid: 20, name: '【随机】另一角色', enabled: true, content: JSON.stringify({ ...sample, name: '另一角色' }) }]);
binding = { primary: '另一角色主书', additional: ['附加书'] };
const beforePrimary = structuredClone(books.get('1源堡'));
loaded = await api.load();
assert.equal(loaded.book, '另一角色主书');
assert.equal(loaded.entries.find(source => source.book === '另一角色主书').entry.输出指令, sample.输出指令);
loaded.entries.find(source => source.book === '另一角色主书').entry.输出指令 = '另一角色覆写${name}';
loaded = await api.save(loaded.entries, loaded.revision);
assert.deepEqual(books.get('1源堡'), beforePrimary);
assert.deepEqual(vars['cryptLord.randomEventsLocal'].scopes['1源堡'], firstScope);
loaded = await api.restore(loaded.revision);
assert.equal(vars['cryptLord.randomEventsLocal'].scopes['另一角色主书'], undefined);
binding = { primary: '1源堡', additional: [] };
loaded = await api.restore((await api.load()).revision);
const beforeVariablesFailure = structuredClone([...books]);
loaded.entries[0].entry.输出指令 = '变量保存失败';
failVariables = true;
await assert.rejects(api.save(loaded.entries, loaded.revision), /已回滚世界书/);
assert.deepEqual([...books], beforeVariablesFailure);
assert.equal(vars['cryptLord.randomEventsLocal'], undefined);

// One interrupted two-book transaction, then explicit recovery of that exact intent.
loaded = await api.load();
loaded.entries[0].entry.输出指令 = '中断后显式恢复${name}';
updateHook = async () => { updateHook = async () => { chat = 'chat-other'; await emit('CHAT_CHANGED'); }; };
await assert.rejects(api.save(loaded.entries, loaded.revision), /未完成.*恢复/);
assert.equal(api.status().recovery, true);
assert.equal(vars['cryptLord.randomEventsLocal'], undefined);
await assert.rejects(api.recover(), /原聊天/);
chat = 'chat-1'; await emit('CHAT_CHANGED');
loaded = await api.recover();
assert.equal(loaded.entries[0].entry.输出指令, '中断后显式恢复${name}');
assert.equal(api.status().recovery, false);
loaded = await api.restore(loaded.revision);
await api.queueManual([draws[0]]);
const beforeQuiet = injects.length;
await emit('GENERATION_AFTER_COMMANDS', 'quiet', { quiet_prompt: '副模型' }, false);
await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, true);
assert.equal(injects.length, beforeQuiet);
const nativeUser = append('user', '原生行动');
await emit('GENERATION_STARTED', 'normal', {}, false);
await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
assert.equal(injects.length, beforeQuiet + 1);
assert.match(injects.at(-1).prompts[0].content, /随机事件1-街头遭遇/);
assert.equal(injects.at(-1).options.once, true);
const nativeAssistant = append('assistant', '原生正文');
await bridge.completeNarrative('原生正文', {
  userMessageId: nativeUser, assistantMessageId: nativeAssistant, userText: '原生行动', narrativeText: '原生正文',
  generationId: 'native-host-random-test',
});
assert.equal((await api.pending()).events.length, 0);
assert.equal(injects.at(-1).active, false);
await emit('GENERATION_ENDED');
await api.queueManual([draws[0]]);
append('user', '取消原生行动');
await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
await emit('GENERATION_STOPPED');
assert.equal((await api.pending()).events.length, 1);
assert.equal(injects.at(-1).active, false);
append('assistant', '已有正文');
const protectedTicket = await api.prepareTurn({ random: () => 0 });
const protectedUser = append('user', '保护队列'), protectedAssistant = append('assistant', '保护正文');
const protectedTransaction = { userMessageId: protectedUser, assistantMessageId: protectedAssistant, userText: '保护队列' };
pages = messagePages();
pages[0].swipes.push('历史页外部修改');
await assert.rejects(api.consumeTurn(protectedTransaction, protectedTicket, '保护正文'), /消息页已变化/);
pages = null;
rows.at(-1).is_hidden = true;
await assert.rejects(api.consumeTurn(protectedTransaction, protectedTicket, '保护正文'), /真实楼层/);
delete rows.at(-1).is_hidden;
await api.queueManual([draws[1]]);
assert.equal(await api.consumeTurn(protectedTransaction, protectedTicket, '保护正文'), true);
assert.equal((await api.pending()).events.length, 1);
// Queues retain concurrent plugin fields, other chats and the exact unissued suffix.
variableHook = () => { vars.otherPlugin = { keep: '并发更新' }; vars['cryptLord.randomEventsPending']['other-chat'] = [structuredClone(draws[1])]; };
lostVariables = true;
await api.queueManual([draws[0]]);
assert.deepEqual(vars.otherPlugin, { keep: '并发更新' });
assert.equal(vars['cryptLord.randomEventsPending']['other-chat'].length, 1);
const concurrentTicket = await api.prepareTurn({ random: () => 0 });
const concurrentUser = append('user', '并发清理'), concurrentAssistant = append('assistant', '并发正文');
variableHook = () => {
  vars.otherPlugin.keep = '清理时并发更新';
  vars['cryptLord.randomEventsPending']['chat-1'].push(structuredClone(draws[1]));
};
lostVariables = true;
assert.equal(await api.consumeTurn({ userMessageId: concurrentUser, assistantMessageId: concurrentAssistant, userText: '并发清理' }, concurrentTicket, '并发正文'), true);
assert.deepEqual(vars.otherPlugin, { keep: '清理时并发更新' });
assert.equal((await api.pending()).events.length, 1);
assert.equal(vars['cryptLord.randomEventsPending']['other-chat'].length, 1);
skipVariables = true;
await assert.rejects(api.queueManual([draws[0]]), /未确认/);
assert.equal((await api.pending()).events.length, 1);
skipVariables = false;
pages = messagePages();
pages.at(-1).swipes_data[0] = { mismatch: true };
await assert.rejects(api.prepareTurn(), /正文、变量或所选分支/);
pages = null;
rows.at(-1).is_hidden = true;
await assert.rejects(api.prepareTurn(), /隐藏/);
delete rows.at(-1).is_hidden;
for (const change of [
  () => { surface.document = {}; },
  () => { scriptId = 'other-script'; },
  () => { chat = 'silent-chat-change'; },
  () => { modules['cryptLord.nativeFloorSource'] = { ...modules['cryptLord.nativeFloorSource'] }; },
]) {
  const document = surface.document, script = scriptId, id = chat, reader = modules['cryptLord.nativeFloorSource'];
  const sourceTicket = await api.prepareTurn();
  change();
  await assert.rejects(api.assertTurn(sourceTicket), /变化/);
  surface.document = document; scriptId = script; chat = id; modules['cryptLord.nativeFloorSource'] = reader;
}
const unchanged = await api.prepareTurn();
await api.queueManual([draws[0]]);
await assert.rejects(api.assertTurn(unchanged), /队列已变化/);
const builtBeforeConflict = await bridge.buildGenerationConfig('发出前复核');
const pendingUser = append('user', '发出前复核');
await builtBeforeConflict.assertQueues({ userMessageId: pendingUser, userText: '发出前复核' });
rows[0].data.concurrent = true;
await assert.rejects(builtBeforeConflict.assertQueues({ userMessageId: pendingUser, userText: '发出前复核' }), /来源已变化/);
delete rows[0].data.concurrent;
rows.pop();
const adminBeforeQuiet = api.status().adminEpoch, epochBeforeQuiet = api.status().epoch;
for (const [type, options, dryRun] of [
  ['quiet_prompt', {}, false], ['normal', { quiet_prompt: '副模型' }, false],
  ['normal', { dryRun: true }, false], ['normal', {}, true],
]) {
  await emit('GENERATION_STARTED', type, options, dryRun);
  await emit('GENERATION_AFTER_COMMANDS', type, options, dryRun);
}
assert.equal(api.status().adminEpoch, adminBeforeQuiet);
assert.equal(api.status().epoch, epochBeforeQuiet);
// One real frontend transaction carries both services, including a retry and a single saved-turn cleanup.
books.set('【源堡】玩家自建内容', [
  { uid: 100, name: '[快捷指令]', content: '<cmd>整链补充行动</cmd>', enabled: false },
  { uid: 101, name: '[快捷指令状态]', content: JSON.stringify({ pendingSupplementary: ['整链补充行动'] }), enabled: false },
]);
vm.runInNewContext(shortcutScript, context);
await new Promise(resolve => setImmediate(resolve));
const quick = modules['cryptLord.quickShortcuts'];
const requests = [];
host.createChatMessages = async messages => { for (const message of messages) append(message.role, message.message); };
host.setChatMessages = async messages => {
  for (const message of messages) Object.assign(rows.find(row => row.message_id === message.message_id), structuredClone(message));
};
host.deleteChatMessages = async ids => { rows = rows.filter(row => !ids.includes(row.message_id)); };
host.generate = async config => {
  requests.push(structuredClone(config));
  await emit('GENERATION_STARTED', 'normal', {}, false);
  await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  if (requests.length === 1) throw Error('联合回合第一次失败');
  return '联合正文';
};
modules['cryptLord.generationQuality'].inspect = async text => ({ passed: true, text });
modules['cryptLord.generationQuality'].retryDelayMs = () => 0;
modules['cryptLord.responseNormalizer'].normalize = text => ({ raw: text, message: text });
vm.runInNewContext(nativeScript, context);
const jointNative = modules['cryptLord.nativeFloor'];
const countBeforeJoint = injects.length, floorCountBeforeJoint = rows.length;
await jointNative.submitNativeTurn('联合完整行动');
assert.equal(requests.length, 2);
assert.equal(requests[0].user_input, requests[1].user_input);
assert.match(requests[0].user_input, /随机事件1-街头遭遇/);
assert.match(requests[0].user_input, /补充指令.*\n1. 整链补充行动/);
assert.equal(injects.length, countBeforeJoint);
assert.equal(rows.length, floorCountBeforeJoint + 2);
assert.equal((await api.pending()).events.length, 0);
assert.equal((await quick.load()).state.pendingSupplementary.length, 0);
jointNative.dispose();
quick.dispose();
await emit('GENERATION_ENDED');
await api.queueManual([draws[0]]);
const duplicateTicket = await api.prepareTurn();
const duplicateUser = append('user', '并发同一凭据'), duplicateAssistant = append('assistant', '并发正文');
const duplicateTransaction = { userMessageId: duplicateUser, assistantMessageId: duplicateAssistant, userText: '并发同一凭据' };
variableHook = () => { vars['cryptLord.randomEventsPending']['chat-1'].push(structuredClone(draws[0])); };
const duplicated = await Promise.all([
  api.consumeTurn(duplicateTransaction, duplicateTicket, '并发正文'),
  api.consumeTurn(duplicateTransaction, duplicateTicket, '并发正文'),
]);
assert.deepEqual(duplicated, [true, false]);
assert.equal((await api.pending()).events.length, 1);
const removalTicket = await api.prepareTurn();
const removalUser = append('user', '清理故障'), removalAssistant = append('assistant', '故障正文');
const removalTransaction = { userMessageId: removalUser, assistantMessageId: removalAssistant, userText: '清理故障' };
variableHook = () => { vars['cryptLord.randomEventsPending']['chat-1'].push(structuredClone(draws[0])); };
skipVariables = true;
await assert.rejects(api.consumeTurn(removalTransaction, removalTicket, '故障正文'), /未确认/);
skipVariables = false;
assert.equal((await api.pending()).events.length, 2);
assert.equal(await api.consumeTurn(removalTransaction, removalTicket, '故障正文'), false);
assert.equal((await api.pending()).events.length, 2);
loaded = await api.load();
loaded.entries[0].entry.输出指令 = '取消保存草稿';
let valid = true;
updateHook = async () => { valid = false; };
const beforeCancel = worldbookWrites;
await assert.rejects(api.save(loaded.entries, loaded.revision, () => valid), /已取消/);
assert.equal(worldbookWrites, beforeCancel);
assert.equal(api.status().recovery, false);
loaded = await api.load();
const hostTicket = await api.prepareTurn();
const oldHost = modules['cryptLord.hostApi'];
modules['cryptLord.hostApi'] = { ...oldHost };
await assert.rejects(api.consumeTurn(protectedTransaction, hostTicket, '保护正文'), /来源服务.*已变化/);
modules['cryptLord.hostApi'] = oldHost;
const freshRevision = loaded.revision;
books.get('1源堡')[0].content = JSON.stringify({ ...sample, order: 3 });
await assert.rejects(api.save(loaded.entries, freshRevision), /已变化/);
await assert.rejects(api.restore(freshRevision), /已变化/);
books.get('1源堡').push({ uid: 99, name: '【随机】街头遭遇', content: '{}' });
await assert.rejects(api.load(), /重名/);
api.dispose();
bridge.dispose();
modules['cryptLord.nativeFloorSource'].dispose();
assert.equal(registered.size, 0);
assert.ok([...listeners.values()].every(set => set.size === 0));
await assert.rejects(api.load(), /已取消/);
console.log('random-events: original draw parity; full editor/storage/restore/recovery and native/frontend saved-turn queue workflows OK');
