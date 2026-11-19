import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
const settingsKey = 'cryptLord.variableSettlement';
const key = 'cryptLord.variableSettlementApi';
const original = await readFile(new URL('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt', root), 'utf8');
const start = original.indexOf('_getVariableAiTailPrompts(legacyAssistantContent)');
const tree = ts.createSourceFile('original.js',
  `const original = {${original.slice(start, original.indexOf('async _callSecondaryAPI', start))}};`, 99, true, ts.ScriptKind.JS);
let tail;
function find(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(tree) === '_getVariableAiTailPrompts') tail = node.getText(tree);
  ts.forEachChild(node, find);
}
find(tree);
assert.ok(tail);
const reference = vm.runInNewContext(`({${tail}})`);
let variables = { otherPlugin: { keep: 7 }, [settingsKey]: { retryLimit: 0, futureOption: { preserved: true } } };
let writes = 0, readFail = false, failed = false, afterFail = false, scriptId = 'settings-script';
let hook = null, modelHook = null, listHook = null, readHook = null, worldHook = null, lostResponse = false, calls = [];
let hostDocument = {};
const handlers = new Set();
const host = {
  getCharWorldbookNames: () => ({ primary: '1源堡' }),
  scriptVariableOptions: () => ({ type: 'script', script_id: scriptId }),
  getVariables(options) {
    assert.equal(options.type, 'script'); assert.ok(options.script_id);
    if (readFail) throw Error('模拟读取失败');
    readHook?.();
    return structuredClone(variables);
  },
  async updateVariablesWith(updater, options) {
    assert.ok(options.script_id);
    await hook?.();
    const next = await updater(structuredClone(variables));
    if (failed) throw Error('模拟保存失败');
    variables = structuredClone(next); writes++;
    if (afterFail) readFail = true;
    if (lostResponse) throw Error('保存响应丢失');
  },
  async getModelList(config) { assert.equal(config.apiurl, 'https://example.test/v1'); return listHook ? listHook(config) : [' alpha ', 'alpha', '', 'beta']; },
  async getWorldbook(book) { worldHook?.(); return book === '1源堡' ? [{ name: '【模板】提示词模板',
    content: '{"variable_template":"original-variable-template","fix_variable_template":"original-fix-template"}' }] : []; },
  async generateRaw(config) {
    calls.push(structuredClone(config));
    return modelHook ? modelHook(config) : '<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/地点","value":"贝克兰德"}],"npc_data":[],"world_data":[]}</JSONPatch></UpdateVariable>';
  },
};
const modules = { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': {
  getHost: () => ({ document: hostDocument }), tavernEvents: () => ({ CHAT_CHANGED: 'chat' }),
  bindEvent(name, fn) { handlers.add(fn); return { stop() { handlers.delete(fn); } }; },
} };
const context = { console, structuredClone, URL, setTimeout: fn => setTimeout(fn, 0), clearTimeout,
  cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(name) { assert.ok(modules[name], name); return modules[name]; } } } };
context.window = context;
const load = async name => vm.runInNewContext(await readFile(new URL(`public/guimizhizhu_ui/${name}`, root), 'utf8'), context);
await load('core/variable-settlement-api.js');
const api = modules[key];
let snapshot = await api.readSnapshot();
assert.equal(writes, 0); assert.equal(snapshot.settings.enabled, true);
assert.equal(snapshot.settings.retryLimit, 0);
const draft = { ...snapshot.settings, model: ' alpha ', retryLimit: 321 };
const task = api.saveSettings(draft, snapshot.revision);
draft.model = 'mutated';
const saved = await task;
assert.equal(saved.model, 'alpha'); assert.equal(saved.retryLimit, 321);
assert.equal(variables.otherPlugin.keep, 7); assert.equal(variables[settingsKey].futureOption.preserved, true);
await assert.rejects(api.saveSettings(saved, snapshot.revision), /别处更改/);
snapshot = await api.readSnapshot();
hook = () => { variables.otherPlugin.keep = 8; };
await api.saveSettings(snapshot.settings, snapshot.revision);
assert.equal(variables.otherPlugin.keep, 8);
snapshot = await api.readSnapshot();
hook = () => { variables[settingsKey].model = 'external'; };
await assert.rejects(api.saveSettings(snapshot.settings, snapshot.revision), /别处更改/);
hook = null; snapshot = await api.readSnapshot();
failed = true;
await assert.rejects(api.saveSettings(snapshot.settings, snapshot.revision), /模拟保存失败/);
failed = false;
await api.saveSettings(snapshot.settings, snapshot.revision);
snapshot = await api.readSnapshot();
afterFail = true;
const warning = await api.saveSettings(snapshot.settings, snapshot.revision);
assert.equal(warning.revision, null); assert.match(warning.warning, /已提交/);
readFail = false; afterFail = false;
snapshot = await api.readSnapshot();
await assert.rejects(api.saveSettings(snapshot.settings, structuredClone(snapshot.revision)), /凭据无效/);
lostResponse = true;
const recovered = await api.saveSettings({ ...snapshot.settings, model: 'lost-response-model' }, snapshot.revision);
assert.match(recovered.warning, /已保存.*响应/); assert.ok(recovered.revision);
lostResponse = false;
snapshot = await api.readSnapshot(); const beforeDocumentChange = writes;
hostDocument = {};
await assert.rejects(api.saveSettings(snapshot.settings, snapshot.revision), /来源已变化/);
assert.equal(writes, beforeDocumentChange);
snapshot = await api.readSnapshot();
handlers.forEach(fn => fn());
await assert.rejects(api.saveSettings(snapshot.settings, snapshot.revision), /来源已变化/);
variables[settingsKey] = { enabled: 'false' };
await assert.rejects(api.readSettings(), /开关值/);
variables[settingsKey] = [];
await assert.rejects(api.readSettings(), /格式无效/);
delete variables[settingsKey];
snapshot = await api.readSnapshot(); assert.equal(snapshot.revision.exists, false);
scriptId = '';
await assert.rejects(api.readSettings(), /script_id/); scriptId = 'settings-script';
let alive = true; hook = () => { alive = false; };
const before = writes;
await assert.rejects(api.saveSettings(snapshot.settings, snapshot.revision, () => alive), /取消/);
assert.equal(writes, before);
hook = null;
const custom = { ...api.defaults(), useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'secret', model: 'alpha', retryLimit: 0 };
assert.throws(() => api.saveSettings({ ...custom, apiUrl: 'javascript:alert(1)' }), /HTTP/);
assert.throws(() => api.saveSettings({ ...custom, apiUrl: 'https://user:password@example.test' }), /HTTP/);
assert.throws(() => api.saveSettings({ ...custom, model: '' }), /模型名/);
assert.deepEqual(Array.from(await api.getModelList({ apiurl: ' https://example.test/v1 ', key: 'secret' })), ['alpha', 'beta']);
listHook = () => [{ id: 'invalid' }];
await assert.rejects(api.getModelList({ apiurl: custom.apiUrl }), /格式无效/);
alive = true; listHook = () => { alive = false; return ['stale']; };
await assert.rejects(api.getModelList({ apiurl: custom.apiUrl }, () => alive), /取消/);
listHook = null;
snapshot = await api.readSnapshot();
const queued = await Promise.allSettled([
  api.saveSettings({ ...snapshot.settings, model: 'first' }, snapshot.revision),
  api.saveSettings({ ...snapshot.settings, model: 'second' }, snapshot.revision),
]);
assert.equal(queued[0].status, 'fulfilled'); assert.equal(queued[1].status, 'rejected');
assert.equal(variables[settingsKey].model, 'first');
const shell = await readFile(new URL('public/guimizhizhu_ui/modules/game-shell/index.js', root), 'utf8');
const shellTree = ts.createSourceFile('shell.js', shell, 99, true, ts.ScriptKind.JS);
let showSettings;
function findRoute(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.getText(shellTree) === 'showSettings') showSettings = node.getText(shellTree);
  ts.forEachChild(node, findRoute);
}
findRoute(shellTree);
let opened = 0, routeHook = null;
const routeState = { chatToken: 1, disposed: false };
const routeContext = { state: routeState, theme: () => 'light', setTheme() {}, notify() { throw Error('不应提示失败'); },
  contract: { async waitGlobalInitialized(name) {
    assert.equal(name, 'cryptLord.systemSettingsUi'); await routeHook?.();
    return { async open(appearance) { assert.equal(appearance.get(), 'light'); assert.equal(typeof appearance.set, 'function'); opened++; } };
  } },
};
const route = vm.runInNewContext(`(${showSettings})`, routeContext);
await route(); assert.equal(opened, 1);
routeHook = () => routeState.chatToken++;
await route(); assert.equal(opened, 1);
routeHook = () => { routeState.disposed = true; };
await route(); assert.equal(opened, 1);
const loader = await readFile(new URL('public/guimizhizhu_ui/loader.js', root), 'utf8');
assert.match(loader, /modules\/system-settings\/style\.css/);
assert.match(loader, /modules\/system-settings\/index\.js/);
console.log('系统 API 1/2：原版配置项、模型列表、脚本身份、冲突、取消和失败重试通过');

await load('core/variable-patch.js');
await load('core/response-normalizer.js');
await load('core/ai-context-config.js');
const data = { stat_data: { 地点: '廷根', 秘密: '不可外发' }, npc_data: {}, world_data: {} };
variables['cryptLord.aiContextConfig'] = { hiddenFields: ['stat_data.秘密'], lockedFields: [] };
variables[settingsKey] = { ...custom };
let result = await api.settle({ previousData: data, userText: '旅行', narrativeText: '来到城市' });
assert.equal(result.data.stat_data.地点, '贝克兰德');
assert.equal(data.stat_data.地点, '廷根');
assert.doesNotMatch(calls.at(-1).user_input, /不可外发/);
assert.equal(calls.at(-1).ordered_prompts[0].content, 'original-variable-template');
assert.equal(calls.at(-1).custom_api.model, 'alpha'); assert.equal(calls.at(-1).should_silence, true);
assert.equal(calls.at(-1).max_chat_history, 0);
for (const gemini of [false, true]) {
  variables[settingsKey] = { ...custom, gemini37fPrefill: gemini, streamingEnabled: true };
  await api.repair({ previousData: data, instruction: '修复地点' });
  assert.equal(calls.at(-1).ordered_prompts.at(-1).role,
    reference._getVariableAiTailPrompts.call({ varAiGemini37fPrefill: gemini }, 'tail')[0].role);
  assert.equal(calls.at(-1).should_stream, true);
}
variables[settingsKey].useCustomApi = false;
await api.repair({ previousData: data, instruction: '修复地点' });
assert.equal(calls.at(-1).custom_api, undefined);
variables[settingsKey].enabled = false;
const beforeDisabled = calls.length;
assert.equal((await api.settle({ previousData: data })).reason, 'disabled');
assert.equal(calls.length, beforeDisabled);
await api.repair({ previousData: data, instruction: '手动修复仍可调用' });
readFail = true;
await assert.rejects(api.settle({ previousData: data }), /模拟读取失败/);
readFail = false;
variables[settingsKey] = { ...custom, retryLimit: 2 };
let attempts = 0;
modelHook = () => { if (++attempts < 3) throw Error('模拟请求失败'); return '{"stat_data":[],"npc_data":[],"world_data":[]}'; };
result = await api.settle({ previousData: data }); assert.equal(result.attempts, 3); assert.equal(result.skipped, true);
alive = true; attempts = 0;
modelHook = () => { attempts++; alive = false; throw Error('取消后不应重试'); };
await assert.rejects(api.repair({ previousData: data, instruction: '修复', guard: () => alive }), /取消/);
assert.equal(attempts, 1);
modelHook = () => { scriptId = 'another-script'; return '{"stat_data":[],"npc_data":[],"world_data":[]}'; };
await assert.rejects(api.repair({ previousData: data, instruction: '修复' }), /身份已改变/);
scriptId = 'settings-script';
// Changing a saved setting during the context read must not mix two request configurations.
variables[settingsKey] = { ...custom, retryLimit: 0 };
let readsAfterCapture = 0;
readHook = () => { if (++readsAfterCapture === 2) variables[settingsKey].model = 'changed-after-read'; };
modelHook = null;
const beforeSettingConflict = calls.length;
await assert.rejects(api.settle({ previousData: data }), /设置已变化/);
assert.equal(calls.length, beforeSettingConflict);
readHook = null;
variables[settingsKey] = { ...custom };
worldHook = () => { variables[settingsKey].model = 'changed-during-template-read'; };
const beforeTemplateReadChange = calls.length;
await assert.rejects(api.repair({ previousData: data, instruction: '修复' }), /设置已变化/);
assert.equal(calls.length, beforeTemplateReadChange);
worldHook = null;
modules['cryptLord.stateStore'] = { async ensureOpeningState() {} };
host.getChatMessages = async (range, options = {}) => {
  const rows = [
  { message_id: 0, role: 'assistant', swipe_id: 1, swipes: ['未选开场', '开场'],
    swipes_data: [{ stat_data: { 地点: '错误分支' } }, structuredClone(data)], swipes_info: [{}, {}] },
  { message_id: 1, role: 'user', swipe_id: 0, swipes: ['调查'], swipes_data: [{}], swipes_info: [{}] },
  { message_id: 2, role: 'assistant', swipe_id: 1, swipes: ['未选正文', '抵达城市'], swipes_data: [{}, {}], swipes_info: [{}, {}] },
  ];
  return options.include_swipes ? rows : rows.map(({ swipe_id, swipes, swipes_data, swipes_info, ...identity }) =>
    ({ ...identity, message: swipes[swipe_id], data: swipes_data[swipe_id], extra: swipes_info[swipe_id] }));
};
const retry = await api.retryTurn({ messageId: 2 });
assert.equal(retry.messageId, 2); assert.equal(retry.data.stat_data.地点, '贝克兰德');
assert.doesNotMatch(calls.at(-1).user_input, /不可外发/);
assert.match(calls.at(-1).user_input, /抵达城市|调查/);
assert.doesNotMatch(calls.at(-1).user_input, /未选|错误分支/);
variables['cryptLord.aiContextConfig'].lockedFields = ['stat_data.地点'];
await assert.rejects(api.repair({ previousData: data, instruction: '修改锁定地点' }), /已锁定字段/);
api.dispose();
await assert.rejects(api.readSettings(), /取消/);
console.log('系统 API 2/2：实际变量请求、原版预填角色、主模型回退、配置快照和有限重试通过');
