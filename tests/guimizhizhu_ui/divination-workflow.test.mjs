import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = name => readFile(path.join(base, name), 'utf8');
const registered = new Map();
const entries = [];
const requests = [];
let settings = { useCustomApi: false };
let sourceRows = [{ message_id: 0, role: 'assistant', message: '开场', data: { keep: true } },
  { message_id: 2, role: 'assistant', message: '<think>私有推理</think><gametxt>正式剧情</gametxt><JSONPatch>隐藏命令</JSONPatch>',
    data: { stat_data: { 当前灵性: 10, 运气: 4 }, keep: true } }];
const pages = [];
const listeners = new Map();
let writeHook = null, lostResponse = false, readFailure = false;
const host = {
  async getChatMessages(_range, options) { return structuredClone([...sourceRows, ...(options?.include_swipes ? pages : [])]); },
  async getWorldbook() { if (readFailure) throw Error('复核失败'); return structuredClone(entries); },
  async createWorldbookEntries(_book, rows) { entries.push(...rows.map((row, i) => ({ ...row, uid: i + 1 }))); },
  async updateWorldbookWith(_book, update) {
    if (writeHook) { const fn = writeHook; writeHook = null; fn(); }
    entries.splice(0, entries.length, ...update(structuredClone(entries)).map((row, i) =>
      row.uid == null ? { ...row, uid: i + 1 } : row));
    if (lostResponse) throw Error('保存响应丢失');
  },
  async generateRaw(config) { requests.push(config); return '<过程>灵摆晃动</过程><启示>无</启示>'; },
};
const context = {
  console, structuredClone, Math, Date, DOMException,
  cryptLord: {
    __stage1Modules: {
      'cryptLord.hostApi': host,
      'cryptLord.variableSettlementApi': { async readSettings() { return settings; } },
      'cryptLord.afterNativeHost': {
        tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
        bindEvent(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn);
          return { stop() { listeners.get(event)?.delete(fn); } }; },
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
vm.runInNewContext(await read('public/guimizhizhu_ui/core/response-normalizer.js'), context);
vm.runInNewContext(await read('public/guimizhizhu_ui/core/divination-presets.js'), context);
context.cryptLord.__stage1Modules['cryptLord.divinationPresets'] = registered.get('cryptLord.divinationPresets');
vm.runInNewContext(await read('public/guimizhizhu_ui/core/divination-state.js'), context);
const api = registered.get('cryptLord.divinationState');
const defaultPreset = api.defaultPreset();
const originalSource = await read(
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36b-js-faction-industry-mail-save.txt');
const nativeSource = await read('public/guimizhizhu_ui/core/divination-state.js');
const ast = text => ts.createSourceFile('rules.js', text, 99, true, ts.ScriptKind.JS);
function findClass(source) {
  let found;
  const visit = node => {
    if (ts.isClassDeclaration(node) && node.name?.text === 'FastRelayWindow') found = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
const originalTree = ast(originalSource.slice(originalSource.indexOf('class FastRelayWindow')));
const originalClass = findClass(originalTree);
const nativeTree = ast(nativeSource), nativeClass = findClass(nativeTree);
const normalized = text => text.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '');
for (const member of nativeClass.members) {
  const originalMember = originalClass.members.find(row =>
    row.name?.getText(originalTree) === member.name?.getText(nativeTree));
  assert.equal(normalized(member.getText(nativeTree)), normalized(originalMember.getText(originalTree)),
    'Every migrated member must match original source');
}
let roll = .97;
const originalMath = Object.create(Math);
originalMath.random = () => roll;
const independent = { Math: originalMath };
vm.runInNewContext(`${originalClass.getText(originalTree)}; globalThis.Rules = FastRelayWindow;`, independent);
const reference = new independent.Rules({ currentMvuState: { stat_data: { 当前灵性: 0, 运气: 0 } } });
assert.equal(JSON.stringify(defaultPreset), JSON.stringify(reference.buildDefaultPresets()[0]));
assert.equal(api.normalizeQuestionType('極性'), null);
assert.equal(api.normalizeQuestionType('极性'), 'polar');
assert.equal(api.normalizePrimaryId('未知', 'which_person'), 'unknown');
assert.equal(api.normalizePrimaryId('未知', 'polar'), null);
assert.equal(api.normalizePrimaryId('集合外', 'which_set'), 'outside');
for (const value of [0, 1, 20, 100]) for (const dc of [1, 15, 80])
  assert.equal(api.calcThreshold(value * 2, dc, 4), reference.calcThreshold(value * 2, dc, 4));
for (const forced of [1, 5, 6, 80, 94, 95, 100]) {
  roll = (forced - 1) / 100;
  assert.equal(JSON.stringify(api.resolveCheck({ dc: 20, spiritCur: 0, luck: 0, roll: forced })),
    JSON.stringify(reference.resolveCheck(20)));
}
assert.throws(() => api.resolveCheck({ dc: 20, roll: 101 }), /骰点/);
assert.throws(() => api.normalizePreset({ ...defaultPreset, version: 9 }), /版本/);
assert.throws(() => api.normalizePreset({ ...defaultPreset, tags: [{ name: 'constructor' }] }), /标签/);
const customTags = { ...defaultPreset, tags: [...defaultPreset.tags, { name: '额外提示', mode: 'append' }] };
const tagBag = {};
api.extractTagsFromText('<额外提示>客观线索</额外提示><状态线索>旧</状态线索><状态线索>新</状态线索>',
  tagBag, customTags);
assert.equal(tagBag.额外提示[0], '客观线索');
assert.equal(tagBag.状态线索[0], '新');
assert.doesNotMatch(nativeSource, /generateRuleParam|generateRuleTruth|generateRuleRitual|assembleMemory|localStorage\./);
assert.equal(defaultPreset.version, 8);
assert.match(defaultPreset.promptTruthCandidates, /<表述>/);
assert.match(defaultPreset.promptParam, /<基础DC>/);
const initial = await api.loadPresets();
assert.equal(initial.presets[0].id, 'divination-pendulum');
const saved = await api.savePresets([defaultPreset], null);
assert.equal(entries[0].enabled, false);
assert.equal(saved.revision.uid, 1);
await assert.rejects(api.savePresets([defaultPreset], null), /已变化/);
entries[0].content = '{bad json';
await assert.rejects(api.loadPresets(), /JSON 损坏/);
entries[0].content = JSON.stringify([defaultPreset]);

const session = api.createSession({ statement: '今晚去码头安全吗？', method: '灵摆' });
const beforeMalformed = JSON.stringify(session);
assert.equal(api.parseAndApplyParams('<问句类型>polar</问句类型>', session).ok, false);
assert.equal(JSON.stringify(session), beforeMalformed, 'Malformed model params cannot partially mutate a session');
assert.equal(api.parseAndApplyParams(
  '<问句类型>polar</问句类型><命题摘要>今晚去码头是否安全</命题摘要><基础DC>25</基础DC><反占卜>是</反占卜><反占卜DC>40</反占卜DC>',
  session).ok, true);
assert.equal(session.baseDc, 25);
assert.equal(session.antiDc, 40);
assert.match(api.candidatePrompt(session), /true/);
assert.match(api.candidatePrompt(session), /false/);
const parsed = api.parseTruthCandidateResponse(
  '<否决清单><否决><主轴>partial</主轴><理由>不可拆</理由></否决></否决清单>' +
  '<真实候选><候选><主轴>true</主轴><表述>确实安全</表述><边界>无</边界></候选>' +
  '<候选><主轴>false</主轴><表述>并不安全</表述><边界>无</边界></候选>' +
  '<候选><主轴>partial</主轴><表述>不应入池</表述></候选></真实候选>', 'polar');
assert.deepEqual(Array.from(parsed.candidates, row => row.primary), ['true', 'false']);
session.truthPack = api.pickTruthFromCandidates(parsed.candidates, 'polar', session.statement);
assert.ok(['true', 'false'].includes(session.truthPack.primary));
const pending = api.buildPendingRitual(session, { spiritCur: 0, luck: 0 });
assert.equal(pending.push, 1);
assert.equal(pending.div.spiritCur, 0);
assert.equal(pending.div.attrSum, 0);
assert.equal(pending.div.threshold, 1);
assert.equal(session.pushCount, 0);
assert.throws(() => api.validateRitual('<过程>不动</过程><启示>敌人正在靠近</启示>',
  { div: { success: false } }), /事实性启示/);
assert.throws(() => api.validateRitual('<过程>晃动</过程><启示>无</启示>',
  { div: { success: true } }), /成功却无启示/);
assert.equal(api.validateRitual('<过程>不动</过程><启示>无</启示>',
  { div: { success: false } }).insight, '无');
assert.equal(session.pushCount, 0);
session.pendingRitual = pending;
assert.equal(api.buildPendingRitual(session, { spiritCur: 100 }), pending, 'Retry must retain identical rolls');
assert.throws(() => api.validateRitual('<过程>不动</过程><启示>无</启示><启示>另一结论</启示>',
  { div: { success: false } }), /重复/);
api.commitPendingRitual(session, pending);
assert.equal(session.pushCount, 1);
const committed = JSON.stringify(session);
assert.throws(() => api.commitPendingRitual(session, pending), /失效/);
assert.equal(JSON.stringify(session), committed);
api.extractTagsFromText('<过程>沉静</过程><启示>无</启示>', session.tagBag);
assert.doesNotMatch(api.buildExportReport(session), /确实安全|并不安全/);
assert.match(api.buildExportReport(session, { exportShell: '自定义简报前缀\n' }), /^自定义简报前缀/);
for (const forced of [.97, .01]) {
  const loop = api.createSession({ statement: '客观命题' });
  api.parseAndApplyParams('<问句类型>polar</问句类型><基础DC>100</基础DC><反占卜>是</反占卜><反占卜DC>100</反占卜DC>', loop);
  loop.truthPack = { type: 'polar', primary: 'false', proposition: '客观命题', narrative: '不成立' };
  roll = forced;
  const rules = new independent.Rules(reference.game);
  Object.assign(rules, structuredClone(loop), { game: reference.game, currentPreset: defaultPreset });
  while (loop.pushCount < 4 && loop.successCount < 2) {
    const next = api.buildPendingRitual(loop, { spiritCur: 0, luck: 0 }, () => forced);
    assert.equal(JSON.stringify(next), JSON.stringify(rules.buildPendingRitual()));
    assert.equal(next.div.spiritCur, 0);
    loop.pendingRitual = next;
    api.commitPendingRitual(loop, next);
    rules.commitPendingRitual(next);
  }
  assert.equal(api.buildPendingRitual(loop), null);
  assert.equal(api.buildExportReport(loop), rules.buildExportReport());
  assert.equal(rules.pushCount, forced === .97 ? 4 : 2);
  assert.equal(rules.successCount, forced === .97 ? 0 : 2);
  assert.equal(rules.antiFailCount, forced === .97 ? 4 : 0);
  assert.equal(JSON.stringify(rules.roundLogs.map(row => row.div.roll)),
    JSON.stringify(Array(rules.pushCount).fill(forced === .97 ? 98 : 2)));
}

assert.equal(await api.requestPhase(defaultPreset, 'param', '定参请求', [], '最新正文'),
  '<过程>灵摆晃动</过程><启示>无</启示>');
assert.equal(requests[0].custom_api, undefined);
assert.equal(requests[0].max_chat_history, 0);
assert.match(requests[0].ordered_prompts[2].content, /最新正文/);
assert.match(requests[0].ordered_prompts.at(-2).content, /基础DC/);
settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'key', model: 'divine' };
await api.requestPhase(defaultPreset, 'ritual', '继续', [{ role: 'assistant', content: '定参结果' }]);
assert.equal(requests[1].custom_api.model, 'divine');
assert.equal(requests[1].ordered_prompts.at(-2).content, '定参结果');
settings = { useCustomApi: true };
await assert.rejects(api.requestPhase(defaultPreset, 'param', '请求'), /副 API/);
settings = { useCustomApi: false };
const emit = (event, ...args) => listeners.get(event)?.forEach(fn => fn(...args));
let witness = await api.loadContext();
assert.equal(witness.story, '正式剧情');
assert.equal(witness.id, 2);
assert.doesNotMatch(witness.story, /私有|隐藏/);
await api.assertContext(witness);
pages.push({ message_id: 2, swipes: ['隐藏的另一正文页'], swipes_data: [{ stat_data: { 运气: 99 } }] });
await assert.rejects(api.assertContext(witness), /楼层正文或变量已变化/);
pages.length = 0;
await assert.rejects(api.assertContext(structuredClone(witness)), /来源无效/);
const savedRows = structuredClone(sourceRows);
sourceRows.push({ message_id: 3, role: 'user', message: '新回合', data: {} });
await assert.rejects(api.loadContext(), /等待正文完成/);
sourceRows = savedRows;
witness = await api.loadContext();
const requestCount = requests.length;
const normalSettings = context.cryptLord.__stage1Modules['cryptLord.variableSettlementApi'].readSettings;
let valid = true;
context.cryptLord.__stage1Modules['cryptLord.variableSettlementApi'].readSettings = async () => {
  valid = false; return settings;
};
await assert.rejects(api.requestPhase(defaultPreset, 'param', '请求', [], witness.story, () => valid, witness), /取消/);
assert.equal(requests.length, requestCount, 'Closing during settings must prevent a late model request');
context.cryptLord.__stage1Modules['cryptLord.variableSettlementApi'].readSettings = normalSettings;
emit('start', 'quiet'); await api.assertContext(witness);
emit('start', 'normal', {}, true); await api.assertContext(witness);
emit('start', 'normal');
await assert.rejects(api.assertContext(witness), /取消/);
emit('stop');
await assert.rejects(api.assertContext(witness), /取消/);
witness = await api.loadContext();
await api.assertContext(witness);
assert.equal(api.parseAndApplyParams('<think><问句类型>polar</问句类型><基础DC>1</基础DC></think>', api.createSession()).ok, false);
assert.equal(api.parseTruthCandidateResponse('<safe><候选><主轴>true</主轴><表述>假候选</表述></候选></safe>', 'polar').candidates.length, 0);
const hiddenTags = {};
api.extractTagsFromText('<think><风险提示>秘密</风险提示></think><过程>静止</过程>', hiddenTags);
assert.equal(hiddenTags.风险提示, undefined);
assert.throws(() => api.validateRitual('<think><过程>假</过程><启示>无</启示></think>', { div: { success: false } }), /缺少/);
let presetSource = await api.loadPresets();
lostResponse = true;
const recovered = await api.savePresets([{ ...defaultPreset, name: '保存响应丢失后的方案' }], presetSource.revision);
assert.match(recovered.warning, /已保存/);
assert.equal(recovered.presets[0].name, '保存响应丢失后的方案');
lostResponse = false;
const normalUpdate = host.updateWorldbookWith;
host.updateWorldbookWith = async (...args) => {
  const result = await normalUpdate(...args);
  readFailure = true;
  return result;
};
const savedButUnreadable = await api.savePresets([{ ...defaultPreset, name: '已落盘但复核不可读' }], recovered.revision);
assert.equal(savedButUnreadable.revision, null);
assert.match(savedButUnreadable.warning, /已保存，但复核失败/);
host.updateWorldbookWith = normalUpdate; readFailure = false;
assert.equal((await api.loadPresets()).presets[0].name, '已落盘但复核不可读');
presetSource = await api.loadPresets();
writeHook = () => { entries[0].enabled = !entries[0].enabled; };
await assert.rejects(api.savePresets([defaultPreset], presetSource.revision), /已变化/);
presetSource = await api.loadPresets();
const writesBefore = JSON.stringify(entries);
const cancelledSave = api.savePresets([defaultPreset], presetSource.revision, () => false);
await assert.rejects(cancelledSave, /取消/);
assert.equal(JSON.stringify(entries), writesBefore);
let releaseSettings;
context.cryptLord.__stage1Modules['cryptLord.variableSettlementApi'].readSettings = () => new Promise(resolve => { releaseSettings = resolve; });
const pendingRequest = api.requestPhase(defaultPreset, 'param', '卸载前的请求');
await new Promise(resolve => setImmediate(resolve));
assert.ok(releaseSettings);
api.dispose(); releaseSettings(settings);
await assert.rejects(pendingRequest, /取消/);
assert.equal(requests.length, requestCount);
assert.equal([...listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
await assert.rejects(api.loadContext(), /取消/);
console.log('divination: 2 focused groups passed (exact original rules/lifecycle; presets/API/response boundaries)');
