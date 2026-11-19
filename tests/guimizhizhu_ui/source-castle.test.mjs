import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const modules = Object.create(null), listeners = new Map(), pages = new Map();
let failBooks = false, hook = null, chat = 'a';
const floors = [{ message_id: 8, role: 'assistant', message: '真实正文',
  data: { stat_data: { $meta: {}, 名称: '克莱恩' }, npc_data: { A: {} }, world_data: { 当前时间纪元: '1349年6月28日' } } }];
const protectedFloors = JSON.stringify(floors), surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => chat } } };
modules['cryptLord.stateStore'] = { findLatestAssistant() { assert.fail('只读观测不初始化开场'); } };
modules['cryptLord.afterNativeHost'] = {
  getHost: () => surface,
  tavernEvents: () => Object.fromEntries(['CHAT_CHANGED', 'GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED'].map(name => [name, name])),
  bindEvent(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn);
    return { stop() { listeners.get(name).delete(fn); } }; },
};
modules['cryptLord.hostApi'] = {
  scriptVariableOptions: () => ({ type: 'script', script_id: 'diagnostics' }),
  getChatMessages(_, options) {
    const rows = structuredClone(options?.include_swipes ? floors.map(row => pages.get(row.message_id) ||
      ({ ...row, swipe_id: 0, swipes: [row.message, '历史分支'], swipes_data: [row.data, {}], swipes_info: [{}, { keep: true }] })) : floors);
    hook?.(); return rows;
  },
  getCharWorldbookNames: () => ({ primary: '实际主库', additional: ['附加库'] }),
  getGlobalWorldbookNames: () => ['全局库', '实际主库'],
  getChatWorldbookName: () => '聊天库',
  async getWorldbookNames() { if (failBooks) throw Error('读取失败'); return ['1源堡', '原著', '实际主库', '附加库', '聊天库', '全局库']; },
};
modules['cryptLord.quickShortcuts'] = { async load() {
  return { commands: ['指令A'], source: 'primary-fallback', revisions: { primary: { book: '实际主库' } } };
} };
const context = {
  structuredClone, DOMException,
  cryptLord: {
    __stage1Modules: modules,
    debug: { snapshot: () => ({ loader: { status: 'ready' }, modules: [
      { key: 'cryptLord.nativeFloor', registered: true, ready: true, mounted: true },
    ], events: [{ timestamp: '2026-10-01T00:00:00.000Z', level: 'warn', module: '测试', action: '触发', details: '细节' }] }) },
    contract: {
      initializeGlobal(key, api) { modules[key] = api; },
      releaseGlobal(key) { delete modules[key]; },
      async waitGlobalInitialized(key) { return modules[key]; },
    },
  },
};
context.window = context;
vm.createContext(context);
for (const file of ['native-floor-source.js', 'source-castle-state.js'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${file}`, import.meta.url), 'utf8'), context);
const service = modules['cryptLord.sourceCastleState'];
const emit = (name, ...args) => listeners.get(name)?.forEach(fn => fn(...args));
const result = await service.collect();
assert.equal(result.messageId, 8);
assert.equal(result.counts.stat_data, 1);
assert.equal(result.books, '6 本');
assert.match(result.mountedBooks, /^4 本/);
assert.match(result.shortcuts, /实际主库/);
assert.equal(result.modules[0].mounted, true);
assert.match(service.formatLogs(result.events), /2026-10-01T00:00:00.000Z \| WARN \| 测试 · 触发 \| 细节/);
assert.equal(service.assertCurrent(result), true);
assert.match(service.formatLogs([{ timestamp: '坏时间', details: 'a\nb' }]), /时间未知.*a b/);
assert.throws(() => service.assertCurrent(structuredClone(result)), /凭据/);
failBooks = true;
assert.match((await service.collect()).books, /读取失败/);
const originalCatalog = modules['cryptLord.hostApi'].getWorldbookNames;
modules['cryptLord.hostApi'].getWorldbookNames = () => ({ invalid: true });
assert.match((await service.collect()).books, /目录格式无效/);
modules['cryptLord.hostApi'].getWorldbookNames = originalCatalog;
floors[0].is_hidden = true;
const hidden = await service.collect();
assert.equal(hidden.messageId, null); assert.equal(hidden.counts.stat_data, 0); assert.match(hidden.floorError, /隐藏/);
delete floors[0].is_hidden;
const row = floors[0];
pages.set(8, { ...row, swipe_id: 0, swipes: [row.message, '旧页'], swipes_data: [row.data, {}], swipes_info: [{}, {}] });
let reads = 0;
hook = () => { if (++reads === 3) { pages.get(8).swipes_info[1].changed = true; hook = null; } };
assert.match((await service.collect()).floorError, /已变化/);
hook = () => { hook = null; emit('CHAT_CHANGED'); };
await assert.rejects(service.collect(), { name: 'AbortError' });
hook = () => { hook = null; chat = 'b'; };
await assert.rejects(service.collect(), { name: 'AbortError' });
let active = true;
hook = () => { hook = null; active = false; };
await assert.rejects(service.collect(() => active), { name: 'AbortError' });
assert.throws(() => service.assertCurrent(result), { name: 'AbortError' });
for (const args of [['quiet'], ['quiet_prompt'], ['normal', { dryRun: true }], ['normal', {}, true]]) emit('GENERATION_STARTED', ...args);
const quiet = await service.collect(); assert.equal(quiet.messageId, 8);
emit('GENERATION_STARTED', 'normal'); await assert.rejects(service.collect(), { name: 'AbortError' });
emit('GENERATION_STOPPED'); assert.throws(() => service.assertCurrent(quiet), { name: 'AbortError' });
const restored = await service.collect(); surface.document = {};
assert.throws(() => service.assertCurrent(restored), { name: 'AbortError' });
assert.equal(JSON.stringify(floors), protectedFloors);
service.dispose(); await assert.rejects(service.collect(), { name: 'AbortError' });
console.log('source castle: complete native observation, binding, cancellation, export and partial failures passed');
