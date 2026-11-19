import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const script = await readFile(new URL('../../public/guimizhizhu_ui/core/dlc-manager.js', import.meta.url), 'utf8');
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36a-js-items-equip-relationships.txt', import.meta.url), 'utf8');
const source = original.slice(original.indexOf('async showDLCManager()'), original.indexOf('// ==========================================', original.indexOf('async showDLCManager()')));
const tree = ts.createSourceFile('original.js', `({${source}})`, 99, true, ts.ScriptKind.JS);
const expressions = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['dlcEntries', 'previewText', 'displayName'].includes(node.name.getText(tree))) {
    expressions.set(node.name.getText(tree), node.initializer.getText(tree));
  }
  ts.forEachChild(node, visit);
}
visit(tree);
assert.equal(expressions.size, 3);
const reference = vm.runInNewContext(`({
  filter(allEntries) { return ${expressions.get('dlcEntries')}; },
  preview(entry) { return (${expressions.get('previewText')}) + (entry.content && entry.content.length > 100 ? '...' : ''); },
  name(entry) { return ${expressions.get('displayName')}; }
})`);
const originalRows = [
  { uid: 1, comment: '【DLC】聚会', enabled: true, content: '开场\n' + '线索'.repeat(80), strategy: { keys: [/秘密/gi] } },
  { uid: 2, comment: '[DLC]非原标记', content: '不可识别' },
  { uid: 3, comment: '普通条目', content: '不可识别' },
  { uid: 4, comment: '【DLC】聚会', enabled: false, content: '' },
];
let bookName = '主书', writes = 0, reads = 0, hook = null, readHook = null, failed = false,
  lost = false, noCommit = false, afterWrite = null, additional = [];
const listeners = new Map(), document = {};
const after = {
  getHost: () => ({ document }),
  tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
  bindEvent(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return { stop() { listeners.get(name).delete(fn); } };
  },
};
const emit = (name, ...args) => { for (const fn of listeners.get(name) || []) fn(...args); };
const books = new Map([
  ['主书', structuredClone(originalRows)],
  ['其他书', [{ uid: 30, name: '【DLC】不扫描', content: '保留', enabled: false }]],
]);
const untouched = structuredClone(books.get('其他书'));
const host = {
  getCharWorldbookNames() { return { primary: bookName, additional: structuredClone(additional) }; },
  async getWorldbook(book) { reads++; readHook?.(); return structuredClone(books.get(book)); },
  async updateWorldbookWith(book, updater, options) {
    assert.equal(options.render, 'immediate');
    await hook?.();
    const next = await updater(structuredClone(books.get(book)));
    if (failed) throw Error('写入失败');
    if (!noCommit) books.set(book, structuredClone(next));
    writes++;
    afterWrite?.();
    if (lost) throw Error('响应丢失');
    return structuredClone(next);
  },
};
const context = {
  structuredClone, DOMException, cryptLord: { __stage1Modules: { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': after },
    contract: { initializeGlobal() {}, releaseGlobal() {} } },
};
context.window = context;
vm.runInNewContext(script, context);
const api = context.cryptLord.__stage1Modules['cryptLord.dlcService'];
const data = await api.load();
assert.deepEqual(data.entries.map(row => row.uid), Array.from(reference.filter(originalRows), row => row.uid));
for (const entry of data.entries) {
  assert.equal(api.name(entry), reference.name(entry));
  assert.equal(api.preview(entry), reference.preview(entry));
}
assert.equal(api.isDlc({ name: '【DLC】现代字段' }), true);
assert.equal(api.isDlc({ name: '[DLC]现代字段' }), false);
bookName = null;
const readsBefore = reads;
assert.equal((await api.load()).bookName, null);
assert.equal(reads, readsBefore);
bookName = '主书';
readHook = () => { bookName = '其他书'; };
await assert.rejects(api.load(), /主世界书已改变/);
readHook = null; bookName = '主书';
assert.equal(writes, 0);
console.log('DLC 1/2: original source selection/name/preview and primary-only reads passed');

const snapshot = (await api.load()).entries[0];
const before = structuredClone(books.get('主书'));
await api.toggle('主书', snapshot, false);
assert.deepEqual(books.get('主书'), before.map(row => row.uid === 1 ? { ...row, enabled: false } : row));
await assert.rejects(api.toggle('主书', snapshot, true), /别处更改/);
let fresh = (await api.load()).entries[0];
hook = () => { books.get('主书')[0].strategy.keys = [/秘密/g]; };
await assert.rejects(api.toggle('主书', fresh, true), /别处更改/);
hook = null;
fresh = (await api.load()).entries[0];
hook = () => { bookName = '其他书'; };
await assert.rejects(api.toggle('主书', fresh, true), /主世界书已改变/);
bookName = '主书'; hook = null;
fresh = (await api.load()).entries[0];
failed = true;
await assert.rejects(api.toggle('主书', fresh, true), /写入失败/);
assert.equal(books.get('主书')[0].enabled, false);
failed = false;
await api.toggle('主书', fresh, true);
fresh = (await api.load()).entries[0];
let valid = true;
hook = () => { valid = false; };
await assert.rejects(api.toggle('主书', fresh, false, () => valid), /取消/);
hook = null;
const sameUid = structuredClone(books.get('主书')[0]);
books.get('主书').push(sameUid);
await assert.rejects(api.toggle('主书', fresh, false), /别处更改/);
books.get('主书').pop();
fresh = (await api.load()).entries[0];
await assert.rejects(api.toggle('主书', structuredClone(fresh), false), /凭据/);
const edited = (await api.load()).entries[0];
edited.content = '伪造正文';
await assert.rejects(api.toggle('主书', edited, false), /凭据/);
additional = ['新附加绑定'];
await assert.rejects(api.toggle('主书', fresh, false), /主世界书已改变/);
additional = [];
const old = (await api.load()).entries[0];
emit('start', 'quiet'); emit('start', 'normal', {}, true);
await api.toggle('主书', old, false);
fresh = (await api.load()).entries[0];
emit('start', 'normal');
await assert.rejects(api.load(), /取消/);
emit('end');
await assert.rejects(api.toggle('主书', fresh, true), /取消/);
fresh = (await api.load()).entries[0];
emit('chat');
await assert.rejects(api.toggle('主书', fresh, true), /取消/);
fresh = (await api.load()).entries[0];
context.cryptLord.__stage1Modules['cryptLord.hostApi'] = { ...host };
await assert.rejects(api.toggle('主书', fresh, true), /来源服务/);
context.cryptLord.__stage1Modules['cryptLord.hostApi'] = host;
const getHost = after.getHost;
after.getHost = () => ({ document: {} });
await assert.rejects(api.toggle('主书', fresh, true), /来源服务/);
after.getHost = getHost;
readHook = () => { after.getHost = () => ({ document: {} }); };
await assert.rejects(api.load(), /来源服务/);
readHook = null; after.getHost = getHost;
const goodRows = books.get('主书');
books.set('主书', [null]);
await assert.rejects(api.load(), /有效条目列表/);
books.set('主书', goodRows);
context.cryptLord.__stage1Modules['cryptLord.dlcService'] = {};
await assert.rejects(api.toggle('主书', fresh, true), /取消/);
context.cryptLord.__stage1Modules['cryptLord.dlcService'] = api;
noCommit = true;
await assert.rejects(api.toggle('主书', fresh, true), /未能确认/);
noCommit = false; lost = true;
const recovered = await api.toggle('主书', fresh, true);
assert.match(recovered.warning, /开关已保存/);
lost = false;
fresh = (await api.load()).entries[0];
afterWrite = () => { readHook = () => { throw Error('复核故障'); }; };
await assert.rejects(api.toggle('主书', fresh, false), error => {
  assert.equal(error.submitted, true);
  assert.equal(error.requiresReload, true);
  return /复核故障/.test(error.message);
});
assert.equal(books.get('主书')[0].enabled, false);
afterWrite = null; readHook = null;
fresh = (await api.load()).entries[0];
const cancelWrites = writes;
let release;
hook = () => new Promise(resolve => { release = resolve; });
const pending = api.toggle('主书', fresh, true);
while (!release) await new Promise(resolve => setTimeout(resolve, 0));
api.dispose();
release();
await assert.rejects(pending, /取消/);
assert.equal(writes, cancelWrites);
assert.deepEqual(books.get('其他书'), untouched);
assert.deepEqual(books.get('主书').slice(1), before.slice(1));
assert.ok([...listeners.values()].every(set => set.size === 0));
console.log('DLC 2/2: UID-only updates, full revisions, binding/cancel/failure protections passed');
