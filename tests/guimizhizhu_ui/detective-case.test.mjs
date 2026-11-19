import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => readFile(path.join(base, file), 'utf8');
const registered = new Map();
const requests = [];
let settings = { useCustomApi: false };
const entries = [];
let nextUid = 1;
let stored = { stat_data: { 名称: '侦探' }, world_data: {} }, writes = 0, writeFailure = false;
let branch = '原有分支', latestUser = false, onlyOpening = false, hidden = false;
let lostResponse = false, conflictOnDerivation = null, holdSettings = null;
const listeners = new Map();
const emit = (event, ...args) => listeners.get(event)?.forEach(callback => callback(...args));
const opening = { message_id: 0, role: 'assistant', message: '开场', data: { preserved: true } };
const host = {
  async generateRaw(config) { requests.push(config); return '<世界正文>雾中来客</世界正文>'; },
  async getWorldbook() { return structuredClone(entries); },
  async createWorldbookEntries(_book, rows) {
    entries.push(...rows.map(row => ({ ...structuredClone(row), uid: nextUid++ })));
  },
  async updateWorldbookWith(_book, update) {
    const next = update(structuredClone(entries));
    next.forEach(row => { row.uid ??= nextUid++; });
    entries.splice(0, entries.length, ...structuredClone(next));
  },
  async getChatMessages(range, options = {}) {
    const floor = { message_id: 2, role: 'assistant', is_hidden: hidden,
      message: '当前正文<reasoning>隐藏原生分析</reasoning>', data: structuredClone(stored), extra: { preserved: true } };
    if (range === '2') return [floor];
    if (range === '0') return [structuredClone(opening)];
    const rows = onlyOpening ? [opening] : [opening, floor];
    if (latestUser) rows.push({ message_id: 3, role: 'user', message: '新用户回合', data: {} });
    return options.include_swipes ? rows.map(({ data, message, ...row }) => ({ ...row, swipe_id: 0,
      swipes: [message, branch], swipes_data: [{ data: structuredClone(data) }, { data: { preserved: true } }] }))
      : structuredClone(rows);
  },
  async setChatMessages(rows) {
    if (writeFailure) throw Error('模拟保存失败');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].message_id, 2);
    assert.equal(Object.hasOwn(rows[0], 'message'), false);
    stored = structuredClone(rows[0].data); writes++;
    if (lostResponse) { lostResponse = false; throw Error('模拟保存响应丢失'); }
  },
};
const context = {
  console, structuredClone, Math, Date, DOMException,
  cryptLord: {
    __stage1Modules: {
      'cryptLord.variableSettlementApi': { async readSettings() {
        if (holdSettings) await holdSettings;
        return settings;
      } },
      'cryptLord.hostApi': host,
      'cryptLord.afterNativeHost': {
        tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start',
          GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
        bindEvent(event, fn) {
          const list = listeners.get(event) || new Set(); list.add(fn); listeners.set(event, list);
          return { stop() { list.delete(fn); } };
        },
      },
      'cryptLord.shamanTerritory': { syncRadius(data) {
        data.stat_data.保存派生 = writes + 1;
        conflictOnDerivation?.(); conflictOnDerivation = null;
      } },
    },
    contract: {
      initializeGlobal(key, api) { registered.set(key, api); },
      releaseGlobal(key) { registered.delete(key); },
      async waitGlobalInitialized(key) { return context.cryptLord.__stage1Modules[key]; },
    },
  },
};
context.window = context;
vm.runInNewContext(await read('public/guimizhizhu_ui/core/detective-rules.js'), context);
const rules = registered.get('cryptLord.detectiveRules');
context.cryptLord.__stage1Modules['cryptLord.detectiveRules'] = rules;
vm.runInNewContext(await read('public/guimizhizhu_ui/core/detective-state.js'), context);
vm.runInNewContext(await read('public/guimizhizhu_ui/core/state-store.js'), context);
vm.runInNewContext(await read('public/guimizhizhu_ui/core/response-normalizer.js'), context);
const service = registered.get('cryptLord.detectiveState');
const source = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37a-js-fast-romance-detective-tail.txt');
const tree = ts.createSourceFile('original.js', source.slice(source.indexOf('class DetectiveCaseWindow')), 99, true, ts.ScriptKind.JS);
const originalClass = tree.statements.find(ts.isClassDeclaration);
const nativeSource = await read('public/guimizhizhu_ui/core/detective-rules.js');
const nativeTree = ts.createSourceFile('native.js', nativeSource, 99, true, ts.ScriptKind.JS);
let nativeClass;
function visit(node) {
  if (ts.isClassDeclaration(node) && node.name.text === 'DetectiveCaseWindow') nativeClass = node;
  ts.forEachChild(node, visit);
}
visit(nativeTree);
const norm = text => text.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '');
assert.equal(nativeClass.members.length, 16);
for (const member of nativeClass.members) {
  const originalMember = originalClass.members.find(row => row.name?.getText(tree) === member.name?.getText(nativeTree));
  assert.equal(norm(member.getText(nativeTree)), norm(originalMember.getText(tree)));
}
const originalContext = {
  DCW_PROMPTS: rules.prompts, dcwFormatDraw: rules.formatDraw, dcwFormatAxes: rules.formatAxes,
  GUIMI_TAG_REASONING: 'reasoning', GUIMI_TAG_THINK: 'think',
};
vm.runInNewContext(`${originalClass.getText(tree)};globalThis.Original = DetectiveCaseWindow;`, originalContext);
const independent = new originalContext.Original(null);
assert.equal(JSON.stringify(rules.createRules().normalizeFoldTags(['<OOC>', '世界正文', 'OOC', '</think>'])),
  JSON.stringify(independent.normalizeFoldTags(['<OOC>', '世界正文', 'OOC', '</think>'])));
independent.customFoldTags = ['reasoning', 'OOC'];
const rawWorld = '<reasoning>隐藏分析</reasoning><世界正文>正文<OOC>隐藏旁白</OOC></世界正文>';
assert.equal(JSON.stringify(rules.createRules(undefined, { folds: ['reasoning', 'OOC'] }).packWorldRecord(rawWorld, false)),
  JSON.stringify(independent.packWorldRecord(rawWorld, false)));
assert.doesNotMatch(nativeSource, /assembleMemory|AppStorage\./);
assert.equal(rules.trickPool.length, 440);
assert.equal(rules.prompts.version, 5);
assert.equal(service.steps.length, 5);
assert.equal(service.rules, rules);
const original = await service.configuration();
assert.equal(JSON.stringify(original.prompts), JSON.stringify(rules.prompts));
assert.match(service.customFor({}, 'intro').after, /信息|理性人/);
assert.equal(service.customFor({ 思维链_引子: '' }, 'intro').after, '');
const saved = await service.saveConfiguration({ prompts: rules.prompts, custom: {
  生成: '生成补充', 后续: '探案补充', 折叠标签: ['reasoning', 'OOC'],
} }, structuredClone(original.revisions));
assert.equal(entries.length, 2);
assert.equal(entries[0].enabled, false);
assert.equal(saved.custom.后续, '探案补充');
assert.equal(service.customFor(saved.custom, 'turn').before, '探案补充');
assert.deepEqual(Array.from(service.customFor(saved.custom, 'turn').folds), ['reasoning', 'OOC']);
await assert.rejects(service.saveConfiguration({ prompts: rules.prompts, custom: {} },
  original.revisions), /已被修改/);
entries[0].content = 'invalid';
await assert.rejects(service.configuration(), /有效 JSON/);
const recovered = await service.configuration(true);
assert.equal(recovered.revisions['[事件真相方案]'].content, 'invalid');
assert.equal(entries[0].content, 'invalid');
entries[0].content = JSON.stringify(rules.prompts);
const preservedEntries = JSON.stringify(entries);
await assert.rejects(service.saveConfiguration({ prompts: rules.prompts, custom: { 对话条数: 0 } },
  saved.revisions), /对话条数/);
assert.equal(JSON.stringify(entries), preservedEntries);
const future = structuredClone(rules.prompts); future.version++;
await assert.rejects(service.saveConfiguration({ prompts: future, custom: {} }, saved.revisions), /版本/);
await assert.rejects(service.saveConfiguration({ prompts: rules.prompts, custom: {} },
  { ...saved.revisions, '[事件真相自定义提示词]': null }), /已被修改/);
assert.equal(JSON.stringify(entries), preservedEntries, 'Both entries remain unchanged on second-entry conflict');
entries.push({ ...entries[0], uid: 999 });
await assert.rejects(service.configuration(), /重复/);
entries.pop();
assert.equal(rules.draw(5).axes.length, 5);
assert.throws(() => service.newInvestigation({}, { roleCount: 8 }), /角色数/);

let data = { stat_data: { 名称: '侦探' }, world_data: {} };
const created = service.newInvestigation(data, { mode: '本格', roleCount: 5 });
data = created.mvuState;
const id = created.caseItem.id;
data = service.drawCase(data, id, rules.draw(5)).mvuState;
assert.match(service.promptFor(service.caseById(data, id), 0).user, /抽中二级手法/);
assert.throws(() => service.promptFor(service.caseById(data, id), 2), /上一步/);
const outputs = [
  '<事件真相_基线>基线全文</事件真相_基线>',
  '<事件真相_嫌疑>嫌疑全文</事件真相_嫌疑>',
  '<事件真相_时间轴>时间轴全文</事件真相_时间轴>',
  '<事件真相_线索><线索 编号="C1"><现象>湿纸</现象></线索><线索 编号="C3"><现象>足迹</现象></线索></事件真相_线索>',
  '<自检 通过="是">通过</自检><事件真相_成稿>成稿全文</事件真相_成稿>',
];
for (let i = 0; i < 5; i++) {
  assert.match(service.promptFor(service.caseById(data, id), i).system, /事件真相|核诡|线索/);
  data = service.applyStage(data, id, i, outputs[i]).mvuState;
}
assert.equal(service.caseById(data, id).genProgress, 5);
assert.equal(service.caseById(data, id).clues.length, 2);
assert.equal(service.caseById(data, id).checkResult, '通过');
const generationCase = structuredClone(service.caseById(data, id));
independent.currentCase = generationCase;
for (let index = 0; index < 5; index++) {
  const expectedPrompt = rules.fillPrompt(rules.prompts.user[`gen${index + 1}`], independent.buildGenVars(index));
  assert.equal(service.promptFor(generationCase, index).user, expectedPrompt);
}
const keyed = { stat_data: { 名称: '原始角色', 案件列表: { '原案件键': generationCase, $meta: { 保留: true } } } };
const keyedResult = service.applyStage(keyed, id, 4, outputs[4]).mvuState;
assert.equal(keyedResult.world_data, undefined);
assert.equal(keyedResult.stat_data.案件列表['原案件键'].id, id);
assert.equal(keyedResult.stat_data.案件列表.$meta.保留, true);
assert.equal(service.getCases(keyedResult).length, 1);
const removedKeyed = service.removeCase(keyed, id);
assert.equal(removedKeyed.stat_data.案件列表.$meta.保留, true);
assert.equal(service.getCases(removedKeyed).length, 0);
assert.throws(() => service.removeCase({ world_data: { 案件列表: [generationCase, generationCase] } }, id), /编号重复/);
assert.equal(service.caseById(keyed, id).updatedAt, generationCase.updatedAt);
assert.throws(() => service.promptFor({ ...generationCase, version: 2 }, 0), /版本/);
assert.throws(() => service.promptFor(generationCase, '0'), /阶段/);
const rewound = service.applyStage(data, id, 1, outputs[1]).caseItem;
assert.equal(rewound.genProgress, 2);
assert.equal(rewound.truth.成稿, undefined);
assert.equal(rewound.checkResult, '');
assert.equal(rewound.clues.length, 0);
assert.throws(() => service.applyStage(data, id, 'intro', '没有正文'), /世界正文/);
data = service.applyStage(data, id, 'intro', '<reasoning>秘密</reasoning><世界正文>受邀到场</世界正文>').mvuState;
assert.equal(service.caseById(data, id).status, '探案中');
assert.equal(service.caseById(data, id).records[0].foldBlocks[0].tag, 'reasoning');
assert.throws(() => service.promptFor(service.caseById(data, id), 0), /重新生成/);
const turnPrompt = service.promptFor(service.caseById(data, id), 'turn', '检查桌面');
assert.match(turnPrompt.user, /检查桌面/);
assert.match(turnPrompt.user, /成稿全文/);
assert.throws(() => service.applyStage(data, id, 'turn',
  '<世界正文>见到纸张</世界正文><解锁线索>C2</解锁线索>', '检查桌面'), /未知线索/);
assert.equal(service.caseById(data, id).records.length, 1);
data = service.applyStage(data, id, 'turn',
  '<世界正文>见到纸张</世界正文><解锁线索>C1</解锁线索>', '检查桌面').mvuState;
assert.equal(service.caseById(data, id).clues[0].unlocked, true);
assert.equal(service.caseById(data, id).clues[1].unlocked, false);
assert.match(service.promptFor(service.caseById(data, id), 'turn', '再看足迹').user, /C1｜湿纸/);
const reportOnly = service.applyStage(data, id, 'verdict', '<结案报告>真凶</结案报告>', '我已明白').caseItem;
assert.equal(reportOnly.status, '已结案');
assert.equal(reportOnly.records.filter(row => row.role === 'world').length, 2);
assert.doesNotMatch(service.exportChronicle(reportOnly), /真凶/);
data = service.applyStage(data, id, 'verdict',
  '<结案报告>真凶是甲</结案报告><世界正文>委托人支付报酬</世界正文>', '我已明白').mvuState;
const done = service.caseById(data, id);
assert.equal(done.status, '已结案');
assert.match(done.verdictReport, /真凶是甲/);
const exportText = service.exportChronicle(done);
assert.match(exportText, /受邀到场/);
assert.match(exportText, /委托人支付报酬/);
assert.doesNotMatch(exportText, /真凶是甲|成稿全文|秘密/);
assert.throws(() => service.promptFor(done, 'turn', '行动'), /已经结案/);
independent.currentCase = { ...done, records: [
  { role: 'player', text: '不回送玩家历史' }, { role: 'world', text: '第一条世界记录' },
  { role: 'report', text: '隐藏报告' }, { role: 'world', text: '（本回合演绎失败）' },
  { role: 'world', text: '最近的世界记录' },
] };
independent.dialogCount = 1;
const turnSource = { ...independent.currentCase, status: '探案中' };
const recentPrompt = service.promptFor(turnSource, 'turn', '新行动', rules.prompts, { dialogCount: 1 });
assert.match(recentPrompt.user, new RegExp(independent.wrapRecent('探案剧情')));
assert.doesNotMatch(recentPrompt.user, /第一条世界记录|不回送玩家历史|隐藏报告|演绎失败/);
const reduced = service.removeCase(data, id);
assert.equal(service.getCases(reduced).length, 0);
assert.equal(reduced.stat_data.名称, '侦探');

const prompt = service.promptFor(generationCase, 4);
assert.equal(await service.request(prompt), '<世界正文>雾中来客</世界正文>');
assert.equal(requests[0].custom_api, undefined);
assert.equal(requests[0].max_chat_history, 0);
await service.request(prompt, { before: '生成补充', after: '格式限制' });
assert.equal(requests[1].ordered_prompts[3].content, '生成补充');
assert.equal(requests[1].ordered_prompts.at(-1).content, '格式限制');
settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'key', model: 'judge' };
await service.request(prompt);
assert.equal(requests[2].custom_api.model, 'judge');
settings = { useCustomApi: true };
await assert.rejects(service.request(prompt), /副 API/);
settings = { useCustomApi: false };

// One native lifecycle: opaque source receipts, actual settlement, retry, and cancellation.
let loaded = await service.load();
assert.equal(writes, 0);
assert.doesNotMatch(loaded.story, /隐藏原生分析/);
loaded.data.stat_data.名称 = '篡改展示副本';
await assert.rejects(service.prepareOperation({ ...loaded }, { type: 'create' }), /来源无效/);
let operation = await service.prepareOperation(loaded, { type: 'create', options: { mode: '变格', roleCount: 4 } });
const nativeId = operation.caseId;
writeFailure = true;
await assert.rejects(service.commitOperation(operation), /模拟保存失败/);
assert.equal(writes, 0);
writeFailure = false;
let receipt = await service.commitOperation(operation);
loaded = receipt.loaded;
assert.equal(receipt.data.stat_data.名称, '侦探');
assert.equal(loaded.data.stat_data.保存派生, 1);
await assert.rejects(service.commitOperation(operation), /已保存/);
operation = await service.prepareOperation(loaded, { type: 'draw', id: nativeId });
receipt = await service.commitOperation(operation); loaded = receipt.loaded;
const nativeConfig = await service.configuration();
for (let index = 0; index < outputs.length; index++) {
  operation = await service.prepareOperation(loaded, {
    type: 'stage', id: nativeId, stage: index, raw: outputs[index], config: nativeConfig,
  });
  receipt = await service.commitOperation(operation); loaded = receipt.loaded;
}
operation = await service.prepareOperation(loaded, { type: 'stage', id: nativeId, stage: 'intro',
  raw: '<reasoning><世界正文>假正文</世界正文></reasoning><世界正文>真实委托</世界正文>', config: nativeConfig });
receipt = await service.commitOperation(operation); loaded = receipt.loaded;
assert.equal(service.caseById(loaded.data, nativeId).records[0].text, '真实委托');
operation = await service.prepareOperation(loaded, { type: 'stage', id: nativeId, stage: 'turn',
  raw: '<reasoning><解锁线索>C3</解锁线索></reasoning><世界正文>检查湿纸</世界正文><解锁线索>C1</解锁线索>',
  action: '检查湿纸', config: nativeConfig });
receipt = await service.commitOperation(operation); loaded = receipt.loaded;
assert.equal(service.caseById(loaded.data, nativeId).clues[1].unlocked, false);
assert.equal(writes, 9);
assert.throws(() => service.applyStage(loaded.data, nativeId, 'turn',
  '<世界正文>一</世界正文><世界正文>二</世界正文><解锁线索>无</解锁线索>', '调查'), /重复/);
operation = await service.prepareOperation(loaded, { type: 'stage', id: nativeId, stage: 'verdict',
  raw: '<结案报告>真凶</结案报告><世界正文>领取报酬</世界正文>', action: '判断结案', config: nativeConfig });
receipt = await service.commitOperation(operation); loaded = receipt.loaded;
assert.doesNotMatch(service.exportChronicle(service.caseById(loaded.data, nativeId)), /真凶|假正文/);
assert.equal(writes, 10);
assert.equal(opening.data.preserved, true);
operation = await service.prepareOperation(loaded, { type: 'remove', id: nativeId });
branch = '外部切换其他正文页';
await assert.rejects(service.commitOperation(operation), /聊天、正文或变量/);
assert.equal(writes, 10);
loaded = await service.load();
operation = await service.prepareOperation(loaded, { type: 'remove', id: nativeId });
conflictOnDerivation = () => { branch = '派生过程中消息页变化'; };
await assert.rejects(service.commitOperation(operation), /聊天、正文或变量/);
assert.equal(writes, 10);
latestUser = true;
loaded = await service.load();
assert.equal(loaded.editable, false);
await assert.rejects(service.prepareOperation(loaded, { type: 'create' }), /历史楼层只读/);
latestUser = false; hidden = true;
await assert.rejects(service.load(), /角色状态/);
hidden = false; onlyOpening = true;
await assert.rejects(service.load(), /角色状态/);
assert.equal(writes, 10);
onlyOpening = false;
loaded = await service.load();
emit('start', 'quiet');
emit('start', 'normal', {}, true);
await service.assertSource(loaded);
emit('start', 'normal');
await assert.rejects(service.assertSource(loaded), /已取消/);
emit('stop');
await assert.rejects(service.assertSource(loaded), /已取消/);
loaded = await service.load();
const waitingConfig = await service.configuration();
let releaseSettings;
holdSettings = new Promise(resolve => { releaseSettings = resolve; });
const beforeWaiting = requests.length;
let guard = true;
const waiting = service.request(prompt, {}, loaded.story, () => guard, loaded, waitingConfig);
await new Promise(resolve => setTimeout(resolve, 20));
guard = false; releaseSettings(); holdSettings = null;
await assert.rejects(waiting, /已取消/);
assert.equal(requests.length, beforeWaiting);
operation = await service.prepareOperation(loaded, { type: 'remove', id: nativeId });
lostResponse = true;
await assert.rejects(service.commitOperation(operation), /聊天、正文或变量/);
assert.equal(writes, 11);
assert.equal(service.getCases(stored).length, 0);
await assert.rejects(service.commitOperation(operation), /已保存或不可确认/);
loaded = await service.load();
const modelConfig = await service.configuration();
const originalGenerate = host.generateRaw;
let releaseModel, markStarted;
const modelStarted = new Promise(resolve => { markStarted = resolve; });
host.generateRaw = async config => {
  requests.push(config); markStarted();
  return new Promise(resolve => { releaseModel = resolve; });
};
const lateModel = service.request(prompt, {}, loaded.story, () => true, loaded, modelConfig);
await modelStarted;
branch = '等待模型时正文页变化';
releaseModel('<事件真相_成稿>迟到结果</事件真相_成稿>');
await assert.rejects(lateModel, /聊天、正文或变量/);
host.generateRaw = originalGenerate;
assert.equal(writes, 11);

// Configuration remains one atomic pair, with full metadata/UID and acknowledgement recovery.
const configSource = await service.configuration();
entries[1].enabled = true;
await assert.rejects(service.assertConfig(configSource), /已被修改/);
await assert.rejects(service.saveConfiguration(configSource, configSource.revisions), /已被修改/);
entries[1].enabled = false;
const originalUpdate = host.updateWorldbookWith;
host.updateWorldbookWith = async (...args) => { await originalUpdate(...args); throw Error('模拟配置响应丢失'); };
const ack = await service.saveConfiguration({ prompts: rules.prompts, custom: { 生成: '恢复响应' } },
  (await service.configuration()).revisions);
assert.match(ack.warning, /已保存/);
await service.assertConfig(ack);
host.updateWorldbookWith = originalUpdate;
entries.push({ uid: entries[0].uid, name: '其他插件条目', content: '保留' });
await assert.rejects(service.configuration(), /UID/);
entries.pop();
const queuedSource = await service.configuration();
const queuedA = service.saveConfiguration({ prompts: rules.prompts, custom: { 生成: '先保存' } }, queuedSource.revisions);
const queuedB = service.saveConfiguration({ prompts: rules.prompts, custom: { 生成: '不能覆盖' } }, queuedSource.revisions);
await queuedA;
await assert.rejects(queuedB, /已被修改/);
assert.equal((await service.configuration()).custom.生成, '先保存');
loaded = await service.load();
const finalConfig = await service.configuration();
operation = await service.prepareOperation(loaded, { type: 'create', config: finalConfig });
conflictOnDerivation = () => { entries[1].position.order++; };
await assert.rejects(service.commitOperation(operation), /已被修改/);
assert.equal(writes, 11);
stored.world_data.案件列表 = '损坏的案件列表';
loaded = await service.load();
assert.equal(loaded.editable, false);
await assert.rejects(service.prepareOperation(loaded, { type: 'create' }), /案件列表格式异常/);
stored.world_data.案件列表 = [];
stored.cryptLord = { teamBattle: { status: 'finished', settled: false } };
loaded = await service.load();
assert.equal(loaded.editable, false);
await assert.rejects(service.prepareOperation(loaded, { type: 'create' }), /结算战斗/);
delete stored.cryptLord;
loaded = await service.load();
operation = await service.prepareOperation(loaded, { type: 'create' });
const replacement = { ...context.cryptLord.__stage1Modules['cryptLord.stateStore'] };
context.cryptLord.__stage1Modules['cryptLord.stateStore'] = replacement;
await assert.rejects(service.commitOperation(operation), /已变化/);
assert.equal(writes, 11);
emit('chat');
await assert.rejects(service.assertSource(loaded), /已取消/);
service.dispose();
assert.equal(service.status().ready, false);
await assert.rejects(service.load(), /已取消/);
assert.equal([...listeners.values()].reduce((total, list) => total + list.size, 0), 0);
console.log('detective-case: 2 focused groups passed (original rules/full lifecycle; native data/config/API boundaries)');
