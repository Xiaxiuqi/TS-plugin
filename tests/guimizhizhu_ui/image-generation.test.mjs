import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const source = await read('public/guimizhizhu_ui/core/image-generation.js');
let entries = [{ uid: 1, name: '[生图提示词]', content: JSON.stringify([
  { id: 'default', name: '旧默认', prompt: '原版规则', locked: true },
  { id: 'user-one', name: '自定义', prompt: '自定义规则', locked: false },
]) }, { uid: 9, name: '其他条目', content: '保留' }];
let variables = { unrelated: { keep: true } }, config, removed = 0, writes = 0;
let shared = { useCustomApi: false }, handler, lastPayload, mode = 'success', clock = Date.now();
const settingsKey = 'cryptLord.imageGeneration';
let additional = [], lostResponse = false, failRead = false, failReadAfterWrite = false;
let bookExists = true, corruptCreated = false;
let scriptId = 'test', branch = '', modelResponse = '<pic prompt="夜色中的廷根街道">';
let modelHook = null, settingsGate = null;
const lifecycle = new Map(), document = {};
const rows = [
  { message_id: 0, role: 'assistant', message: '<gametxt>开场</gametxt>', data: { untouched: true } },
  { message_id: 1, role: 'user', message: '继续' },
  { message_id: 2, role: 'assistant', message: '<think>秘密</think><gametxt>本轮正文</gametxt><UpdateVariable>秘密</UpdateVariable>', data: { stat_data: { value: 1 } } },
];
const opening = structuredClone(rows[0]);
const timers = new Map();
let nextTimer = 0;
const host = {
  async getWorldbook() {
    if (failRead) throw Error('读取失败');
    if (!bookExists) throw Error('世界书不存在');
    return structuredClone(entries);
  },
  async createWorldbook() { bookExists = true; entries = []; },
  getCharWorldbookNames() { return { primary: '实际主书', additional }; },
  async updateWorldbookWith(_book, fn) {
    entries = structuredClone(await fn(structuredClone(entries))).map((row, index) => ({ ...row, uid: row.uid ?? 1000 + index })); writes++;
    if (corruptCreated) entries.at(-1).enabled = true;
    if (failReadAfterWrite) failRead = true;
    if (lostResponse) throw Error('提交响应丢失');
  },
  getVariables() { return structuredClone(variables); },
  scriptVariableOptions() { return { type: 'script', script_id: scriptId }; },
  replaceVariables(value, options) { assert.equal(options.script_id, 'test'); variables = structuredClone(value); },
  async updateVariablesWith(fn, options) {
    assert.equal(options.script_id, 'test'); variables = structuredClone(await fn(structuredClone(variables)));
    if (lostResponse) throw Error('设置响应丢失');
  },
  async getChatMessages(_range, options) {
    return structuredClone(options?.include_swipes ? rows.map(row => ({
      message_id: row.message_id, role: row.role, is_hidden: row.is_hidden,
      swipe_id: 0, swipes: [row.message, branch], swipes_data: [row.data, {}], swipes_info: [{}, {}],
    })) : rows);
  },
  async generateRaw(value) { config = value; await modelHook?.(); return modelResponse; },
};
const modules = {
  'cryptLord.hostApi': host,
  'cryptLord.variableSettlementApi': { async readSettings() { if (settingsGate) await settingsGate; return shared; } },
  'cryptLord.afterNativeHost': {
    getHost() { return { document }; },
    tavernEvents() { return { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }; },
    bindEvent(name, fn) { lifecycle.set(name, fn); return { stop() { lifecycle.delete(name); } }; },
  },
};
const context = {
  console, structuredClone, AbortController, DOMException,
  Date: class extends Date { static now() { return clock; } },
  setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
  clearTimeout(id) { timers.delete(id); },
  cryptLord: {
    __stage1Modules: modules,
    contract: {
      initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { return modules[key]; },
    },
  },
  eventOn(_name, fn) { handler = fn; return { stop() { removed++; handler = null; } }; },
  eventEmit(name, payload) {
    assert.equal(name, 'generate-image-request');
    lastPayload = payload;
    if (mode === 'throw') throw Error('事件发送失败');
    if (mode === 'hold') return;
    queueMicrotask(() => {
      handler?.({ id: 'unrelated', success: true });
      handler?.({ type: 'event' }, JSON.stringify({
        ...payload, success: mode !== 'error', error: '后端失败', imageData: 'data:image/png;base64,abc',
      }));
    });
  },
};
context.window = context; context.parent = context; context.top = context;
vm.runInNewContext(await read('public/guimizhizhu_ui/core/response-normalizer.js'), context);
vm.runInNewContext(source, context);
const api = modules['cryptLord.imageGeneration'];

// One parity/storage/API group, including the actual seven source members.
const tree = ts.createSourceFile('migrated.js', source, 99, true, ts.ScriptKind.JS);
const methods = new Map();
function visit(node) {
  if (ts.isMethodDeclaration(node)) methods.set(node.name.getText(tree), node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree);
for (const [file, names] of [
  ['34a-js-worldbook-database-tools.txt', ['getDefaultImagePromptSeed', 'buildDefaultImagePromptPreset', 'normalizeImagePromptPresets']],
  ['36a-js-items-equip-relationships.txt', ['_extractPicPromptFromText', '_cleanupImageGenRequest', '_scheduleImageGenTimeout', 'requestGenerateImage']],
]) {
  const original = await read(`数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${file}`);
  for (const name of names) {
    const start = original.search(new RegExp(`^\\s*${name}\\(`, 'm'));
    const originalTree = ts.createSourceFile('original.js', `({${original.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
    let member;
    function find(node) {
      if (ts.isMethodDeclaration(node) && node.name.getText(originalTree) === name) member = node.getText(originalTree);
      ts.forEachChild(node, find);
    }
    find(originalTree);
    assert.equal(methods.get(name), member.replace(/,$/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''), name);
  }
}
const loaded = await api.loadPresets();
assert.equal(writes, 0);
assert.equal(loaded.presets[0].prompt, '原版规则');
assert.throws(() => api.normalize([{ id: 'same' }, { id: 'same' }]), /重复/);
assert.equal(api.normalize([{ name: 'legacy', prompt: 'rule' }])[1].name, 'legacy');
const saved = await api.savePresets([...loaded.presets, { id: 'new', name: '新增', prompt: '新规则' }], loaded.revision);
assert.equal(saved.presets.length, 3);
assert.deepEqual(entries[1], { uid: 9, name: '其他条目', content: '保留' });
await assert.rejects(api.savePresets(saved.presets, loaded.revision), /别处改变/);
await assert.rejects(api.savePresets(saved.presets, saved.revision, () => false), /已变化/);
entries[0].uid = 3;
await assert.rejects(api.savePresets(saved.presets, saved.revision), /别处改变/);
entries[0].content = '{broken';
await assert.rejects(api.loadPresets(), /JSON/);
const defaults = await api.loadPresets(true);
assert.equal(entries[0].content, '{broken');
assert.equal(defaults.presets.length, 1);
await api.savePresets(defaults.presets, defaults.revision);
await api.saveSettings({ selected: 'new', timeout: 5, key: 'obsolete' }, () => true, await api.readSettings());
assert.equal((await api.readSettings()).timeout, 5);
assert.equal(variables['cryptLord.imageGeneration'].key, undefined);
assert.deepEqual(variables.unrelated, { keep: true });
assert.equal(await api.story(), '本轮正文');
assert.equal(await api.generatePrompt('规则', '正文'), '夜色中的廷根街道');
assert.equal(config.custom_api, undefined);
assert.equal(config.max_chat_history, 0);
assert.equal(config.should_silence, true);
shared = { useCustomApi: true, apiUrl: 'https://example.test/v1', model: 'shared', apiKey: '' };
await api.generatePrompt('规则', '正文');
assert.equal(config.custom_api.model, 'shared');
shared = { useCustomApi: true };
await assert.rejects(api.generatePrompt('规则', '正文'), /URL 或模型/);
assert.equal(api.extractPrompt('<pic prompt="甲"><pic prompt="乙">'), '乙');
const witness = await api.readFloor(2);
rows[2].data.stat_data.value++;
await assert.rejects(api.verifyFloor(witness), /变量已变化/);
rows[2].data.stat_data.value--;
rows[2].message += '变化';
await assert.rejects(api.verifyFloor(witness), /变量已变化/);
rows[2].message = witness.message;
rows.push({ role: 'assistant', message_id: 4, message: '下一层' });
await assert.rejects(api.verifyFloor(witness), /变量已变化/);
rows.pop();
await assert.rejects(api.verifyFloor(structuredClone(witness)), /凭据/);
const changedWitness = await api.readFloor();
changedWitness.text = '篡改正文';
await assert.rejects(api.verifyFloor(changedWitness), /凭据/);
const branchWitness = await api.readFloor();
branch = '未选中的另一分支';
await assert.rejects(api.verifyFloor(branchWitness), /消息分支/);
branch = '';
rows[2].is_hidden = true;
await assert.rejects(api.readFloor(), /最新回合/);
delete rows[2].is_hidden;
rows.push({ role: 'user', message_id: 3, message: '下一条用户输入' });
await assert.rejects(api.readFloor(), /最新回合/);
rows.pop();
await assert.rejects(api.readFloor(0), /最新回合/);

let metadata = await api.loadPresets();
await assert.rejects(api.savePresets(metadata.presets, structuredClone(metadata.revision)), /凭据/);
entries[0].strategy = { type: 'selective', keys: [/街道/gi] };
await assert.rejects(api.verifyPresets(metadata.revision), /套装已变化/);
metadata = await api.loadPresets();
entries[0].strategy.keys[0] = /街道/g;
await assert.rejects(api.savePresets(metadata.presets, metadata.revision), /别处改变/);
metadata = await api.loadPresets();
lostResponse = true;
const recovered = await api.savePresets([{ ...metadata.presets[0], prompt: '响应丢失也要复核' }], metadata.revision);
assert.match(recovered.warning, /已保存/);
assert.equal(entries[0].strategy.keys[0].flags, 'g');
assert.equal(entries[1].content, '保留');
lostResponse = false;
failReadAfterWrite = true;
const unconfirmed = await api.savePresets([{ ...recovered.presets[0], prompt: '读回失败' }], recovered.revision);
assert.equal(unconfirmed.revision, null);
assert.match(unconfirmed.warning, /已提交.*复核失败/);
failReadAfterWrite = failRead = false;
const binding = await api.loadPresets();
additional = ['新绑定书'];
await assert.rejects(api.savePresets(binding.presets, binding.revision), /绑定已变化/);
additional = [];
bookExists = false;
const missingBook = await api.loadPresets();
const firstSave = await api.savePresets(missingBook.presets, missingBook.revision);
assert.ok(firstSave.revision);
assert.equal(entries[0].enabled, false);
assert.equal(entries[0].position.depth, 0);
bookExists = false;
const corruptBase = await api.loadPresets();
corruptCreated = true;
const corruptSave = await api.savePresets(corruptBase.presets, corruptBase.revision);
assert.equal(corruptSave.revision, null);
assert.match(corruptSave.warning, /复核失败/);
corruptCreated = false;
const baseSettings = await api.readSettings();
await assert.rejects(api.saveSettings({ timeout: 8 }, () => true, structuredClone(baseSettings)), /凭据/);
variables[settingsKey] = { ...variables[settingsKey], future: { keep: true }, apiKey: 'obsolete' };
await assert.rejects(api.saveSettings({ timeout: 8 }, () => true, baseSettings), /别处变化/);
const freshSettings = await api.readSettings();
variables.unrelated.changed = true;
lostResponse = true;
const recoveredSettings = await api.saveSettings({ timeout: 8, selected: 'default' }, () => true, freshSettings);
assert.match(recoveredSettings.warning, /已保存/);
assert.deepEqual(variables[settingsKey].future, { keep: true });
assert.equal(variables[settingsKey].apiKey, undefined);
assert.equal(variables.unrelated.changed, true);
lostResponse = false;
scriptId = 'replacement';
await assert.rejects(api.saveSettings({ timeout: 9 }, () => true, recoveredSettings.settings), /身份已变化/);
scriptId = 'test';

shared = { useCustomApi: false };
modelResponse = '<think><pic prompt="秘密分析"></think><pic prompt="可见街景"><safe><pic prompt="末尾秘密"></safe>';
assert.equal(await api.generatePrompt('规则', '正文'), '可见街景');
modelResponse = '<think><pic prompt="未闭合分析">';
await assert.rejects(api.generatePrompt('规则', '正文'), /未闭合/);
modelResponse = '<think><pic prompt="只有分析"></think>';
await assert.rejects(api.generatePrompt('规则', '正文'), /没有返回/);
modelResponse = '普通中文画面';
assert.equal(await api.generatePrompt('规则', '正文'), '普通中文画面');
modelHook = () => { shared = { useCustomApi: true, apiUrl: 'http://fixture.invalid', model: 'changed' }; };
await assert.rejects(api.generatePrompt('规则', '正文'), /副模型设置已变化/);
modelHook = null; shared = { useCustomApi: false };
const quietWitness = await api.readFloor();
lifecycle.get('start')('quiet');
lifecycle.get('start')('normal', {}, true);
await api.verifyFloor(quietWitness);
lifecycle.get('start')('normal');
await assert.rejects(api.verifyFloor(quietWitness), /已取消/);
lifecycle.get('end')();
await assert.rejects(api.verifyFloor(quietWitness), /已取消/);
let releaseSettings;
settingsGate = new Promise(resolve => { releaseSettings = resolve; });
const beforeSettingsWait = config;
const duringSettingsWait = api.generatePrompt('规则', '正文');
await new Promise(resolve => setImmediate(resolve));
lifecycle.get('chat')(); releaseSettings(); settingsGate = null;
await assert.rejects(duringSettingsWait, /已取消/);
assert.equal(config, beforeSettingsWait);
assert.deepEqual(rows[0], opening);
console.log('PASS image group 1: original parity, presets, shared API, native-floor guards');

// One protocol/lifecycle group. Fake clock exercises timeouts without long waits.
assert.equal(await api.requestImage({ prompt: '街道', width: 1024 }), 'data:image/png;base64,abc');
assert.equal(removed, 1);
assert.equal(timers.size, 0);
await assert.rejects(api.requestImage({ prompt: '街道', width: -1 }), /正整数/);
mode = 'error';
await assert.rejects(api.requestImage({ prompt: '街道' }), /后端失败/);
mode = 'throw';
await assert.rejects(api.requestImage({ prompt: '街道' }), /事件发送失败/);
assert.equal(timers.size, 0);
mode = 'hold';
const lifecyclePending = api.requestImage({ prompt: '街道' });
lifecycle.get('start')('normal');
await assert.rejects(lifecyclePending, /已取消/);
assert.equal(handler, null);
lifecycle.get('stop')();
const checkedRequest = api.requestImage({ prompt: '街道', witness: await api.readFloor(), revision: (await api.loadPresets()).revision });
await new Promise(resolve => setImmediate(resolve));
branch = '等待生图时换了未选中的分支';
// Resolve the issued protocol ID; source validation must still reject the bitmap.
handler?.({ ...lastPayload, success: true, imageData: 'data:image/png;base64,abc' });
await assert.rejects(checkedRequest, /消息分支/);
assert.equal(handler, null);
branch = '';
const controller = new AbortController();
const pending = api.requestImage({ prompt: '街道' }, controller.signal);
controller.abort();
await assert.rejects(pending, /取消/);
assert.equal(handler, null);
const timeout = api.requestImage({ prompt: '街道', timeout: 1 });
const [tickId, scheduled] = [...timers.entries()][0];
const tick = scheduled.fn;
timers.delete(tickId);
clock += 1000; tick();
await assert.rejects(timeout, /超时/);
const long = api.requestImage({ prompt: '街道', timeout: 3000000 });
assert.equal([...timers.values()][0].ms, 2147483647);
context.eventEmit = undefined;
await assert.rejects(api.requestImage({ prompt: '街道' }), /生图事件不可用/);
api.dispose();
await assert.rejects(long, /取消/);
assert.equal(handler, null);
assert.equal(timers.size, 0);
assert.equal(lifecycle.size, 0);
console.log('PASS image group 2: original event protocol, errors, cancellation, segmented timeout, disposal');
