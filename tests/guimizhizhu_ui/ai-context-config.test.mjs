import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const root = new URL('../../', import.meta.url);
const original = await readFile(new URL('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', root), 'utf8');
const source = original.slice(original.indexOf('class AIContextConfigUI'));
const tree = ts.createSourceFile('original.js', source, 99, true, ts.ScriptKind.JS);
const names = ['collectAllFieldPaths', 'isFieldLocked', 'isFieldHidden', 'reset', 'deselectAll', 'selectAll', 'detectInvalidConfig', 'fieldExistsInData'];
const members = new Map();
function visit(node) {
  if (ts.isMethodDeclaration(node) && names.includes(node.name?.getText(tree)) && !members.has(node.name.getText(tree))) members.set(node.name.getText(tree), node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree);
assert.equal(members.size, names.length);
const reference = vm.runInNewContext(`({${[...members.values()].join(',')}})`, { confirm: () => true, console: { log() {} } });
const KEY = 'cryptLord.aiContextConfig';
const sample = {
  stat_data: { 人物: { 活力: 10, 暗号: '不能发送的秘密', initialized: true }, 地点: '廷根' },
  npc_data: { 伦纳德: { 好感度: 3, initialized: true } },
  world_data: { 时间: '上午' },
};
const policy = { version: 1, mode: 'blacklist', hiddenFields: ['stat_data.人物.暗号', '**.initialized', 'world_data.不存在'],
  lockedFields: ['stat_data.人物.活力', 'npc_data.*.隐秘'] };
let variables = { [KEY]: structuredClone(policy), otherPlugin: { keep: true }, 'cryptLord.variableSettlement': { retryLimit: 0 } };
let writes = 0, hook = null, fail = false, readFail = false, afterFail = false, scriptId = 'test-script';
let modelCalls = [], modelHook = null, lostResponse = false, hostDocument = {};
const handlers = new Set();
const legacyRows = [{ uid: 1, name: '【配置】变量对AI的可见性', content: JSON.stringify(policy), enabled: false }];
legacyRows.push({ uid: 2, name: '【模板】提示词模板',
  content: '{"variable_template":"结算模板","fix_variable_template":"修复模板"}', enabled: false });
const legacyBefore = structuredClone(legacyRows);
const host = {
  scriptVariableOptions() { return { type: 'script', script_id: scriptId }; },
  getVariables(options) { assert.ok(options.script_id); if (readFail) throw Error('读取失败'); return structuredClone(variables); },
  async updateVariablesWith(updater, options) {
    assert.ok(options.script_id);
    await hook?.();
    const next = await updater(structuredClone(variables));
    if (fail) throw Error('保存失败');
    variables = structuredClone(next); writes++;
    if (afterFail) readFail = true;
    if (lostResponse) throw Error('保存响应丢失');
    return structuredClone(next);
  },
  getCharWorldbookNames() { return { primary: '主书' }; },
  async getWorldbook() { return structuredClone(legacyRows); },
  async generateRaw(config) {
    modelCalls.push(structuredClone(config));
    return modelHook ? modelHook() : '<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/地点","value":"贝克兰德"}],"npc_data":[],"world_data":[]}</JSONPatch></UpdateVariable>';
  },
};
const modules = { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': {
  getHost: () => ({ document: hostDocument }), tavernEvents: () => ({ CHAT_CHANGED: 'chat' }),
  bindEvent(name, fn) { handlers.add(fn); return { stop() { handlers.delete(fn); } }; },
} };
const context = { console, structuredClone, setTimeout, clearTimeout, cryptLord: {
  __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { return modules[key]; } },
} };
context.window = context;
const load = async file => vm.runInNewContext(await readFile(new URL(file, root), 'utf8'), context);
await load('public/guimizhizhu_ui/core/ai-context-config.js');
const api = modules[KEY];
const ref = { ...reference, latestData: structuredClone(sample), hiddenFields: [...policy.hiddenFields], lockedFields: [...policy.lockedFields],
  renderTree() {}, updateStatusBar() {} };
assert.deepEqual(Array.from(api.allPaths(sample)), Array.from(ref.collectAllFieldPaths(sample)));
for (const path of api.allPaths(sample)) {
  assert.equal(api.isHidden(policy, path), ref.isFieldHidden(path));
  assert.equal(api.isLocked(policy, path), ref.isFieldLocked(path));
}
ref.detectInvalidConfig();
assert.deepEqual(Array.from(api.invalidFields(sample, policy)), Array.from(ref.invalidFields));
ref.reset();
assert.deepEqual(Array.from(ref.hiddenFields), []);
assert.deepEqual(ref.lockedFields, policy.lockedFields);
ref.selectAll();
assert.deepEqual(Array.from(ref.hiddenFields), Array.from(api.allPaths(sample)).filter(path => !api.isLocked(policy, path)));
assert.equal(api.normalize({ hiddenFields: Array.from({ length: 650 }, (_, i) => `stat_data.k${i}`) }).hiddenFields.length, 650);
assert.equal(api.patternMatches('npc_data.伦*.好感度', 'npc_data.伦纳德.好感度'), true);
assert.equal(api.patternMatches('stat_data.能力[0].等级', 'stat_data.能力.0.等级'), true);
const filtered = api.filterData(sample, policy);
assert.equal(filtered.stat_data.人物.暗号, undefined);
assert.equal(filtered.stat_data.人物.活力, undefined);
assert.equal(filtered.stat_data.人物.initialized, undefined);
assert.equal(filtered.npc_data.伦纳德.initialized, undefined);
assert.equal(sample.stat_data.人物.暗号, '不能发送的秘密');
assert.deepEqual(api.filterData({ stat_data: { 列表: ['甲', '乙', '丙'] } }, { hiddenFields: ['stat_data.列表.0', 'stat_data.列表.1'] }).stat_data.列表, [null, null, '丙']);
assert.equal(api.filterData(sample, { hiddenFields: ['stat_data'] }).stat_data, undefined);
assert.equal(api.affectsLocked(policy, 'stat_data.人物', sample, { op: 'replace' }), true);
assert.equal(api.affectsLocked(policy, 'stat_data.地点', sample, { op: 'replace' }), false);
assert.equal(api.affectsLocked({ lockedFields: ['**.secret'] }, 'stat_data.新对象', sample, { op: 'add', value: { nested: { secret: 1 } } }), true);
assert.equal(api.affectsLocked({ lockedFields: ['stat_data.列表.1.秘密'] }, 'stat_data.列表.0', { stat_data: { 列表: [{}, { 秘密: 1 }] } }, { op: 'remove' }), true);
console.log('AI context 1/2: original tree/visibility/reset rules, invalid patterns and stable request filtering passed');

let snapshot = await api.readSnapshot();
const input = structuredClone(snapshot.config);
const saveTask = api.saveConfig(input, snapshot.revision);
input.hiddenFields.push('stat_data.地点');
const saved = await saveTask;
assert.equal(saved.hiddenFields.includes('stat_data.地点'), false);
assert.equal(variables.otherPlugin.keep, true);
await assert.rejects(api.saveConfig(policy, snapshot.revision), /别处更改/);
snapshot = await api.readSnapshot();
hook = () => { variables[KEY].hiddenFields.push('stat_data.外部'); };
await assert.rejects(api.saveConfig(policy, snapshot.revision), /别处更改/);
hook = null;
snapshot = await api.readSnapshot();
fail = true;
await assert.rejects(api.saveConfig(policy, snapshot.revision), /保存失败/);
fail = false;
await api.saveConfig(policy, snapshot.revision);
snapshot = await api.readSnapshot();
afterFail = true;
const warning = await api.saveConfig(policy, snapshot.revision);
assert.match(warning.warning, /已提交/);
assert.equal(warning.revision, null);
afterFail = false; readFail = false;
snapshot = await api.readSnapshot();
await assert.rejects(api.saveConfig(policy, structuredClone(snapshot.revision)), /凭据无效/);
lostResponse = true;
const recovered = await api.saveConfig({ ...policy, hiddenFields: [...policy.hiddenFields, 'stat_data.失去响应'] }, snapshot.revision);
assert.match(recovered.warning, /已保存.*响应/); assert.ok(recovered.revision);
lostResponse = false;
snapshot = await api.readSnapshot(); hostDocument = {};
const beforeSourceChange = writes;
await assert.rejects(api.saveConfig(policy, snapshot.revision), /来源已变化/);
assert.equal(writes, beforeSourceChange);
snapshot = await api.readSnapshot(); handlers.forEach(fn => fn());
await assert.rejects(api.saveConfig(policy, snapshot.revision), /来源已变化/);
variables[KEY] = { hiddenFields: '坏配置' };
await assert.rejects(api.readConfig(), /字符串列表/);
scriptId = '';
await assert.rejects(api.readConfig(), /script_id/);
scriptId = 'test-script';
delete variables[KEY];
snapshot = await api.readSnapshot();
assert.equal(snapshot.revision.source.entry.uid, 1);
assert.equal(snapshot.config.lockedFields.length, 2);
await api.saveConfig(snapshot.config, snapshot.revision);
assert.deepEqual(legacyRows, legacyBefore);

await load('public/guimizhizhu_ui/core/variable-patch.js');
await load('public/guimizhizhu_ui/core/response-normalizer.js');
await load('public/guimizhizhu_ui/core/variable-settlement-api.js');
const settle = modules['cryptLord.variableSettlementApi'];
const result = await settle.settle({ previousData: sample, userText: '调查', narrativeText: '前往城市' });
assert.equal(result.data.stat_data.地点, '贝克兰德');
assert.doesNotMatch(modelCalls[0].user_input, /不能发送的秘密|暗号|活力|initialized/);
assert.equal(result.data.stat_data.人物.活力, 10);
modelHook = () => {
  variables[KEY].lockedFields = [];
  return '<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/人物","value":{}}],"npc_data":[],"world_data":[]}</JSONPatch></UpdateVariable>';
};
await assert.rejects(settle.repair({ previousData: sample, instruction: '修复人物' }), /已锁定字段|锁定设置已变化/);
variables[KEY] = structuredClone(policy);
modelHook = null;
modules['cryptLord.stateStore'] = { async ensureOpeningState() {} };
host.getChatMessages = async (range, options = {}) => {
  const rows = [
  { message_id: 0, role: 'assistant', swipe_id: 1, swipes: ['不该使用的开场', '开场'],
    swipes_data: [{}, structuredClone(sample)], swipes_info: [{}, {}] },
  { message_id: 1, role: 'user', swipe_id: 0, swipes: ['调查城市'], swipes_data: [{}], swipes_info: [{}] },
  { message_id: 2, role: 'assistant', swipe_id: 1, swipes: ['不该使用的正文', '来到贝克兰德'],
    swipes_data: [{}, structuredClone(sample)], swipes_info: [{}, {}] },
  ];
  return options.include_swipes ? rows : rows.map(({ swipe_id, swipes, swipes_data, swipes_info, ...identity }) =>
    ({ ...identity, message: swipes[swipe_id], data: swipes_data[swipe_id], extra: swipes_info[swipe_id] }));
};
const retry = await settle.retryTurn({ messageId: 2 });
assert.equal(retry.messageId, 2);
assert.equal(retry.data.stat_data.地点, '贝克兰德');
assert.doesNotMatch(modelCalls.at(-1).user_input, /不能发送的秘密|暗号|活力|initialized/);
readFail = true;
const beforeRequest = modelCalls.length;
await assert.rejects(settle.repair({ previousData: sample, instruction: '修复' }), /读取失败/);
assert.equal(modelCalls.length, beforeRequest);
readFail = false;
snapshot = await api.readSnapshot();
let alive = true;
hook = () => { alive = false; };
const beforeCancel = writes;
await assert.rejects(api.saveConfig(policy, snapshot.revision, () => alive), /取消/);
assert.equal(writes, beforeCancel);
hook = null;
api.dispose();
await assert.rejects(api.readConfig(), /取消/);
let delegated = 0;
const helper = {
  updateVariablesWith(updater, options) {
    assert.equal(this, helper);
    assert.equal(options.script_id, 'delegate-script');
    delegated++;
    return updater({ unrelated: 1 });
  },
};
const adapterContext = { TavernHelper: helper, cryptLord: { __stage1ScriptId: 'delegate-script',
  __stage1Modules: {}, contract: { initializeGlobal() {}, releaseGlobal() {} } } };
adapterContext.window = adapterContext;
vm.runInNewContext(await readFile(new URL('public/guimizhizhu_ui/shared/host-api.js', root), 'utf8'), adapterContext);
const adapter = adapterContext.cryptLord.__stage1Modules['cryptLord.hostApi'];
assert.equal((await adapter.updateVariablesWith(vars => ({ ...vars, changed: 1 }), adapter.scriptVariableOptions())).unrelated, 1);
assert.equal(delegated, 1);
console.log('AI context 2/2: guarded storage, original read-only inheritance and actual settlement policy passed');
