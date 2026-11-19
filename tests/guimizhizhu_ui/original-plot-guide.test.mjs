import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = Object.create(null);
const listeners = new Map();
let chat = 'plot-chat', script = 'plot-script', badPage = null;
const surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => chat } } };
const emit = async (event, ...args) => { for (const fn of listeners.get(event) || []) await fn(...args); };
modules['cryptLord.afterNativeHost'] = {
  getHost: () => surface,
  tavernEvents: () => Object.fromEntries(['CHAT_CHANGED', 'GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED'].map(name => [name, name])),
  bindEvent(event, fn) {
    const set = listeners.get(event) || new Set(); set.add(fn); listeners.set(event, set);
    return { stop() { set.delete(fn); } };
  },
};
const context = {
  structuredClone, DOMException,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { return modules[key]; },
  } },
};
context.window = context;
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/native-floor-source.js'), 'utf8'), context);
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/original-plot-guide.js'), 'utf8'), context);
const guide = modules['cryptLord.originalPlotGuide'];
assert.equal(guide.parseCurrentDate('第五纪1349年6月28日 23:00'), 13490628);
assert.equal(guide.parseCurrentDate('未记载'), null);
assert.equal(guide.parseCurrentDate('1349年13月1日'), 13491301);
assert.deepEqual({ ...guide.parseEntryDateRange('1349年6月28日（第一卷）') }, { start: 13490628, end: 13490628 });
assert.deepEqual({ ...guide.parseEntryDateRange('1349年6月') }, { start: 13490601, end: 13490631 });
assert.deepEqual({ ...guide.parseEntryDateRange('1349年6月25日—7月2日') }, { start: 13490625, end: 13490702 });
assert.deepEqual({ ...guide.parseEntryDateRange('1349年1-5月28日') }, { start: 13490101, end: 13490528 });
assert.deepEqual({ ...guide.parseEntryDateRange('1349年7月-6月') }, { start: 13490701, end: 13490631 });
const source = await readFile(path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt'), 'utf8');
const tree = ts.createSourceFile('reference.js', `({${source.slice(source.search(/^_parseEntryDateRange\(/m))}\n})`, 99, true, ts.ScriptKind.JS);
let member;
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === '_parseEntryDateRange') member = node.getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree);
const reference = vm.runInNewContext(`({${member.replace(/,$/, '')}})`);
const migrated = await readFile(path.join(base, 'public/guimizhizhu_ui/core/original-plot-guide.js'), 'utf8');
assert.ok(migrated.includes(member.replace(/,$/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')));
for (const name of ['1349年6月', '1349年6月28日（备注）', '1349年6月28日至7月2日',
  '1349年1-5月28日', '1349年7月-6月', '6月—7月', '1349年—1350年', '普通条目']) {
  assert.equal(JSON.stringify(guide.parseEntryDateRange(name)), JSON.stringify(reference._parseEntryDateRange(name)));
}
console.log('original plot guide: original date rule parity passed');
assert.equal(guide.currentEra({ world_data: { 当前时间纪元: '1349年6月28日' },
  stat_data: { 当前时间纪元: '旧时间' } }), '1349年6月28日');

const names = ['1源堡', '2历史孔隙', '原著剧情甲', '原著剧情乙', '杂项'];
let hook = null, pageExtra = false;
let floors = [
  { message_id: 0, role: 'assistant', message: '历史正文', data: { stat_data: { 当前时间纪元: '1349年7月10日' } } },
  { message_id: 1, role: 'user', message: '继续', data: {} },
  { message_id: 2, role: 'assistant', message: '当前正文', data: { world_data: { 当前时间纪元: '1349年6月28日' } } },
];
const host = {
  scriptVariableOptions: () => ({ type: 'script', script_id: script }),
  async getWorldbookNames() { return names; },
  async getChatMessages(_range, options) {
    if (!options?.include_swipes) return structuredClone(floors);
    const pages = floors.map(({ message, data, ...row }) => ({
      ...row, swipe_id: 0, swipes: pageExtra && row.message_id === 0 ? [message, '另一个历史页'] : [message],
      swipes_data: [structuredClone(data)], swipes_info: [{}],
    }));
    badPage?.(pages);
    return pages;
  },
  async getWorldbook(name) {
    if (hook) { const work = hook; hook = null; await work(); }
    if (name === '原著剧情乙') throw Error('读取失败');
    return [
      { name: '1349年6月28日（开场）', content: '第一条' },
      { comment: '1349年6月25日-7月2日', content: '第二条' },
      { name: '1349年7月', content: '下月' },
      { name: '普通条目', content: '忽略' },
    ];
  },
};
modules['cryptLord.hostApi'] = host;
const result = await guide.search('第五纪1349年6月28日', host);
assert.equal(result.books, 2);
assert.deepEqual(Array.from(result.entries, item => item.content), ['第一条', '第二条']);
assert.deepEqual(Array.from(result.failed), ['原著剧情乙']);
await assert.rejects(guide.search('未记载', host), /当前时间纪元/);
names.splice(0, names.length);
assert.equal((await guide.search('1349年6月28日', host)).books, 0);
names.push('原著剧情甲', '原著剧情乙');
assert.equal((await guide.lookup(0)).entries.length, 1);
assert.equal((await guide.lookup()).entries.length, 2);
for (const mutate of [
  pages => { pages.at(-1).swipes_data[0].world_data.当前时间纪元 = '1349年7月10日'; },
  pages => { pages.at(-1).is_hidden = true; },
  pages => { pages.at(-1).name = '另一角色'; },
  pages => { pages.at(-1).swipes_info = null; },
]) {
  badPage = mutate;
  await assert.rejects(guide.lookup(), /原生楼层/);
}
badPage = null;
for (const change of [
  () => { chat = 'another-chat'; },
  () => { script = 'another-script'; },
  () => { surface.document = {}; },
  () => { surface.window = { ...surface.window }; },
  () => { modules['cryptLord.nativeFloorSource'] = { ...modules['cryptLord.nativeFloorSource'] }; },
]) {
  const originalDocument = surface.document, originalWindow = surface.window, reader = modules['cryptLord.nativeFloorSource'];
  hook = change;
  await assert.rejects(guide.lookup(), /来源服务|宿主/);
  surface.document = originalDocument; surface.window = originalWindow;
  modules['cryptLord.nativeFloorSource'] = reader; chat = 'plot-chat'; script = 'plot-script';
}
hook = () => { pageExtra = true; };
await assert.rejects(guide.lookup(), /消息分支/);
pageExtra = false;
hook = () => { floors[2].message = '同纪元正文发生变化'; };
await assert.rejects(guide.lookup(), /楼层或纪元已变化/);
floors[2].is_hidden = true;
await assert.rejects(guide.lookup(), /隐藏楼层/);
delete floors[2].is_hidden;
hook = () => emit('GENERATION_STARTED', 'normal', {}, false);
await assert.rejects(guide.lookup(), /已取消/);
await assert.rejects(guide.lookup(), /已取消/);
await emit('GENERATION_STOPPED');
assert.equal((await guide.lookup()).entries.length, 2);
hook = () => emit('GENERATION_STARTED', 'quiet', { quiet_prompt: '副模型' }, false);
assert.equal((await guide.lookup()).entries.length, 2);
hook = () => emit('GENERATION_STARTED', 'quiet_prompt', {}, false);
assert.equal((await guide.lookup()).entries.length, 2);
hook = () => emit('GENERATION_STARTED', 'normal', { quiet_prompt: '副模型' }, false);
assert.equal((await guide.lookup()).entries.length, 2);
hook = () => emit('GENERATION_STARTED', 'normal', {}, true);
assert.equal((await guide.lookup()).entries.length, 2);
hook = () => { names.push('原著新卷'); };
await assert.rejects(guide.lookup(), /目录已变化/);
names.pop();
hook = () => { modules['cryptLord.hostApi'] = { ...host }; };
await assert.rejects(guide.lookup(), /来源服务.*已变化/);
modules['cryptLord.hostApi'] = host;
let valid = true;
hook = () => { valid = false; };
await assert.rejects(guide.lookup(null, { guard: () => valid }), /已取消/);
hook = () => emit('CHAT_CHANGED');
await assert.rejects(guide.lookup(), /已取消/);
floors = [];
await assert.rejects(guide.lookup(), /没有真实/);
guide.dispose();
await assert.rejects(guide.search('1349年6月28日', host), /已卸载/);
modules['cryptLord.nativeFloorSource'].dispose();
assert.ok([...listeners.values()].every(set => set.size === 0));
console.log('original plot guide: full native-floor/read-only lookup, page/source conflicts and generation/chat lifecycle passed');
