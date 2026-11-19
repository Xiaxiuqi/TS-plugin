import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = await readFile(path.join(base, 'public/guimizhizhu_ui/core/dual-worldbook.js'), 'utf8');
const PRIMARY = '1源堡', LIBRARY = '2历史孔隙';
const clone = value => structuredClone(value);
const originalDir = path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split');
const source = (await readFile(path.join(originalDir, '33b-js-performance-optimizer.txt'), 'utf8')) +
  (await readFile(path.join(originalDir, '34a-js-worldbook-database-tools.txt'), 'utf8'));
const uiSource = await readFile(path.join(originalDir, '36a-js-items-equip-relationships.txt'), 'utf8');
function extract(text, name) {
  const tree = ts.createSourceFile('original.js',
    `({${text.slice(text.search(new RegExp(`^\\s*async\\s+${name}\\(`, 'm')))}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const result = member.replace(/,$/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '');
  assert.ok(script.includes(result), `Original member changed: ${name}`);
  return result;
}
const managerSource = ['saveEntries', 'compareBooks', 'removeEntries'].map(name => extract(source, name)).join(',');
const actionSource = extract(uiSource, 'handleWorldbookAction');
const entry = (uid, name, content, enabled = true) => ({
  uid, name, content, enabled, strategy: { type: 'selective', keys: [name] },
  position: { type: 'at_depth', role: 'system', depth: 2, order: 40 },
});
const initial = () => new Map([
  [PRIMARY, [
    { ...entry(1, '仅源堡', '源堡正文'), keys: ['扁平关键词'], depth: 5,
      effect: { sticky: 2 }, extra: { source: '原版' }, probability: 80, untouched: '保留源字段' },
    entry(2, '相同', '共同正文'),
    { ...entry(3, '冲突', '甲'), recursion: { prevent_incoming: false, delay_until: 4 }, untouched: '保留目标字段' },
  ]],
  [LIBRARY, [entry(4, '仅孔隙', '孔隙正文', false), entry(5, '相同', '共同正文'),
    { ...entry(6, '冲突', '乙', false), strategy: { type: 'selective', keys: [/廷根/i] }, effect: { cooldown: 3 } }]],
]);
let books = initial(), nextUid = 100, primary = PRIMARY, additional = [];
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
const host = {
  getCharWorldbookNames() { return { primary, additional: clone(additional) }; },
  async getWorldbook(name) {
    if (host.readFail) throw Error('模拟读取失败');
    return clone(books.get(name));
  },
  async updateWorldbookWith(name, updater) {
    host.before?.(name);
    const rows = clone(books.get(name));
    const next = await updater(rows);
    if (host.fail === name) throw Error('模拟目标更新失败');
    if (host.deleteFail && name === LIBRARY && next.length < rows.length) throw Error('模拟孔隙删除失败');
    if (host.noCommit !== name) books.set(name, clone(next).map(row => ({
      ...row,
      ...(host.defaults && row.uid == null ? {
        position: { type: 'at_depth', role: 'system', depth: 0, order: 100, ...row.position },
        strategy: { type: 'constant', keys: [], ...row.strategy },
      } : {}),
      uid: row.uid ?? nextUid++,
    })));
    const result = clone(books.get(name));
    host.after?.(name);
    if (host.responseLost === name) throw Error('保存响应丢失');
    return result;
  },
};
const registered = new Map();
const context = { console, structuredClone, DOMException, cryptLord: {
  __stage1Modules: { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': after },
  contract: {
    initializeGlobal(key, api) { registered.set(key, api); },
    releaseGlobal(key) { registered.delete(key); },
    async waitGlobalInitialized() { return host; },
  },
} };
context.window = context;
vm.runInNewContext(script, context);
const api = registered.get('cryptLord.dualWorldbook');
const select = async name => (await api.compare()).find(row => row.name === name);

for (const [action, name] of [
  ['toggle', '仅源堡'], ['demote', '仅源堡'], ['promote', '仅孔隙'],
  ['overwrite_primary', '冲突'], ['overwrite_library', '冲突'], ['delete', '相同'],
]) {
  books = initial(); nextUid = 100;
  const referenceBooks = initial();
  let referenceUid = 100;
  const original = vm.runInNewContext(`(() => {
    const WorldbookManager = { PRIMARY_BOOK: '${PRIMARY}', LIBRARY_BOOK: '${LIBRARY}',
      _cache: { lastFetchTime: 0 }, ${managerSource} };
    const handler = { showTemporaryMessage() {}, fetchAndRenderWorldbookList() {}, ${actionSource} };
    return { manager: WorldbookManager, handler };
  })()`, {
    console,
    getWorldbook: async book => clone(referenceBooks.get(book)),
    updateWorldbookWith: async (book, updater) => referenceBooks.set(book, clone(await updater(clone(referenceBooks.get(book))))),
    createWorldbookEntries: async (book, rows) => referenceBooks.get(book).push(...clone(rows).map(row => ({ ...row, uid: referenceUid++ }))),
    deleteWorldbookEntries: async (book, predicate) => referenceBooks.set(book, referenceBooks.get(book).filter(row => !predicate(clone(row)))),
  });
  const report = await original.manager.compareBooks();
  const selected = await select(name);
  assert.deepEqual(Array.from(await api.compare(), row => [row.name, row.status]),
    Array.from(report, row => [row.name, row.status]));
  await original.handler.handleWorldbookAction(action, report.find(row => row.name === name),
    { dataset: { enabled: String(selected.primaryData?.enabled === true) } });
  await api.act(action, selected);
  assert.deepEqual([...books], [...referenceBooks], `Original action mismatch: ${action}`);
}
console.log('dual worldbook: four original members and six complete action parity passed');

books = initial();
const stale = await select('冲突');
books.get(LIBRARY)[2].strategy.keys = [/贝克兰德/i];
await assert.rejects(api.act('overwrite_primary', stale), /已变化/);
books = initial();
host.before = book => {
  if (book === LIBRARY) books.get(book).push(entry(101, '仅源堡', '外部先建'));
};
await assert.rejects(api.act('demote', await select('仅源堡')), error => {
  assert.match(error.message, /已变化/);
  assert.equal(error.partial.completed.length, 1);
  assert.equal(error.partial.sourceRetained, true);
  return true;
});
assert.ok(books.get(PRIMARY).some(row => row.name === '仅源堡'));
assert.equal(books.get(LIBRARY).find(row => row.name === '仅源堡').content, '外部先建');
host.before = null;
books = initial();
host.fail = LIBRARY;
await assert.rejects(api.act('demote', await select('仅源堡')), /目标更新失败/);
assert.ok(books.get(PRIMARY).some(row => row.name === '仅源堡'));
host.fail = null;
books = initial();
host.noCommit = LIBRARY;
await assert.rejects(api.act('demote', await select('仅源堡')), /未能确认/);
assert.ok(books.get(PRIMARY).some(row => row.name === '仅源堡'));
host.noCommit = null;
books = initial();
host.after = book => {
  if (book === LIBRARY) books.get(book).find(row => row.name === '仅源堡').content = '外部修改备份';
};
await assert.rejects(api.act('demote', await select('仅源堡')), /已变化|未能确认/);
assert.ok(books.get(PRIMARY).some(row => row.name === '仅源堡'));
host.after = null;
books = initial();
let allowed = true;
host.after = () => { allowed = false; };
await assert.rejects(api.act('demote', await select('仅源堡'), { guard() { if (!allowed) throw Error('窗口关闭'); } }), /窗口关闭/);
assert.ok(books.get(PRIMARY).some(row => row.name === '仅源堡'));
host.after = null;
books = initial();
host.deleteFail = true;
await assert.rejects(api.act('delete', await select('相同')), error => {
  assert.equal(error.partial.completed.length, 1);
  return /孔隙删除失败/.test(error.message);
});
assert.equal(books.get(PRIMARY).some(row => row.name === '相同'), false);
assert.equal(books.get(LIBRARY).some(row => row.name === '相同'), true);
host.deleteFail = false;
await api.act('delete', await select('相同'));
assert.equal(books.get(LIBRARY).some(row => row.name === '相同'), false);
books = initial();
books.get(PRIMARY).push(entry(1, '不同名重号', '保持'));
assert.equal((await select('仅源堡')).status, 'ambiguous');
await assert.rejects(api.act('delete', await select('仅源堡')), /不唯一/);
books = initial();
books.get(PRIMARY).push(entry(11, '仅源堡', '同名'));
assert.equal((await select('仅源堡')).status, 'ambiguous');
books = initial();
host.readFail = true;
await assert.rejects(api.compare(), /读取失败/);
host.readFail = false;
books.set(PRIMARY, [{ uid: 1, comment: '旧格式', content: '正文', enabled: true }]);
books.set(LIBRARY, []);
host.defaults = true;
await api.act('demote', await select('旧格式'));
host.defaults = false;
assert.equal(books.get(PRIMARY).length, 0);
assert.equal(books.get(LIBRARY)[0].name, '旧格式');
books = initial();
books.set('实际主书', clone(books.get(PRIMARY)));
const fixedPrimary = clone(books.get(PRIMARY));
primary = '实际主书';
const actual = await select('仅源堡');
assert.equal(actual.primaryBook, primary);
await assert.rejects(api.act('toggle', clone(actual)), /凭据/);
actual.primaryData.extra.source = '篡改';
await assert.rejects(api.act('toggle', actual), /凭据/);
await api.act('demote', await select('仅源堡'));
assert.deepEqual(books.get(PRIMARY), fixedPrimary);
assert.ok(!books.get(primary).some(row => row.name === '仅源堡'));
const bound = await select('冲突');
additional = ['新的附加绑定'];
await assert.rejects(api.act('overwrite_primary', bound), /主世界书已改变/);
additional = [];
const falseGuard = await select('冲突');
await assert.rejects(api.act('overwrite_primary', falseGuard, { guard: () => false }), /取消/);
const documentRow = await select('冲突');
const getHost = after.getHost;
after.getHost = () => ({ document: {} });
await assert.rejects(api.act('delete', documentRow), /来源服务/);
after.getHost = getHost;
const rowsBeforeInvalid = books.get(primary);
books.set(primary, [null]);
await assert.rejects(api.compare(), /有效条目列表/);
books.set(primary, rowsBeforeInvalid);
primary = null;
await assert.rejects(api.compare(), /未找到/);
primary = LIBRARY;
await assert.rejects(api.compare(), /相同/);
primary = '实际主书';
const generation = await select('冲突');
emit('start', 'quiet'); emit('start', 'normal', {}, true);
await api.act('overwrite_primary', generation);
const oldGeneration = await select('冲突');
emit('start', 'normal');
await assert.rejects(api.compare(), /取消/);
emit('stop');
await assert.rejects(api.act('delete', oldGeneration), /取消/);
const changedChat = await select('冲突');
emit('chat');
await assert.rejects(api.act('delete', changedChat), /取消/);
const replaced = await select('冲突');
context.cryptLord.__stage1Modules['cryptLord.hostApi'] = { ...host };
await assert.rejects(api.act('delete', replaced), /来源服务/);
context.cryptLord.__stage1Modules['cryptLord.hostApi'] = host;
const oldModule = await select('冲突');
context.cryptLord.__stage1Modules['cryptLord.dualWorldbook'] = {};
await assert.rejects(api.act('delete', oldModule), /取消/);
context.cryptLord.__stage1Modules['cryptLord.dualWorldbook'] = api;
primary = PRIMARY;
books = initial();
host.responseLost = LIBRARY;
const recovered = await api.act('promote', await select('仅孔隙'));
assert.match(recovered.warning, /已落盘/);
assert.equal(books.get(LIBRARY).some(row => row.name === '仅孔隙'), false);
host.responseLost = null;
host.after = () => { host.readFail = true; };
await assert.rejects(api.act('toggle', await select('仅源堡')), error => {
  assert.equal(error.submitted, true);
  assert.equal(error.partial.completed.length, 0);
  return /读取失败/.test(error.message);
});
assert.equal(books.get(PRIMARY).find(row => row.name === '仅源堡').enabled, false);
host.after = null; host.readFail = false;

// Both managers share the same public worldbook, not independent test copies.
books.get(PRIMARY).push(entry(50, '【DLC】交叉编辑', '正文'));
const dlcScript = await readFile(path.join(base, 'public/guimizhizhu_ui/core/dlc-manager.js'), 'utf8');
vm.runInNewContext(dlcScript, context);
const dlc = context.cryptLord.__stage1Modules['cryptLord.dlcService'];
const dlcRow = (await dlc.load()).entries[0];
await api.act('toggle', await select('【DLC】交叉编辑'));
await assert.rejects(dlc.toggle(PRIMARY, dlcRow, true), /别处更改/);
const dualRow = await select('【DLC】交叉编辑');
await dlc.toggle(PRIMARY, (await dlc.load()).entries[0], true);
await assert.rejects(api.act('toggle', dualRow), /已变化/);
dlc.dispose();
api.dispose();
await assert.rejects(api.compare(), /已卸载/);
await assert.rejects(api.act('delete', {}), /已卸载/);
assert.equal(registered.size, 0);
assert.ok([...listeners.values()].every(set => set.size === 0));
console.log('dual worldbook: guarded commits, backup verification and lifecycle passed');
