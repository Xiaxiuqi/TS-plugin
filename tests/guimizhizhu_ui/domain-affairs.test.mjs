import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {
  'cryptLord.domainState': { nowMinutes: () => 100, clearLedger(domain) { domain.$流水 = []; } },
};
const calls = [];
let reply = '';
const context = {
  console, Math: Object.assign(Object.create(Math), { random: () => .99 }), Date,
  cryptLord: {
    __stage1Modules: modules,
    contract: {
      initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { return modules[key]; },
    },
  },
};
context.window = context;
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return { useCustomApi: false }; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { calls.push(config); return reply; } };
for (const file of ['core/affair-state.js', 'core/domain-affairs.js']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui', file), 'utf8'), context, { filename: file });
}
const workflow = modules['cryptLord.domainAffairs'];
const rules = modules['cryptLord.affairState'];
const type = rules.AffairCore.typesOfLevel(1)[0];
const domain = { 已建立: true, 领地名: '测试领地', 地点: '贝克兰德', 线路: '市内', 等级: 1, $流水: [{ 事项: '筹建医院' }] };
const original = { stat_data: { 领地: domain, 人物关系列表: { 艾琳: { 好感度: 150, 身份: '管家', 当前序列: '普通人' } } }, npc_data: { 艾琳: { 所处地点: '贝克兰德', 正在做的事: '清点账册' } }, world_data: {} };
const draft = workflow.start(original, 120, ['艾琳']);
assert.equal(workflow.sessionOf(original), null);
assert.throws(() => workflow.start(original, 120, ['不存在']), /好感度/);
assert.throws(() => workflow.start({ stat_data: { 领地: domain, 人物关系列表: { 艾琳: { 好感度: 100 } } } }, 120, ['艾琳']), /好感度/);
assert.equal(workflow.sessionOf(draft).stage, 'convene');
assert.equal(workflow.sessionOf(draft).roster[0].姓名, '艾琳');
assert.throws(() => workflow.advance(draft), /尚未到齐/);
reply = '<玩家><在场>否</在场><理由>正在路上</理由></玩家><成员><姓名>艾琳</姓名><在场>是</在场><理由>在府内</理由></成员>';
const checked = await workflow.checkAttendance(draft, '领主外出');
assert.equal(workflow.membersPresent(workflow.sessionOf(checked)), true);
assert.equal(workflow.sessionOf(checked).attendance.玩家.在场, false);
assert.equal(calls.at(-1).custom_api, undefined);
assert.match(calls.at(-1).ordered_prompts.at(-1).content, /筹建医院/);
assert.equal(calls.at(-1).ordered_prompts[0], 'world_info_before');
assert.throws(() => workflow.attendance(draft, '无效回复'), /无法解析/);
assert.throws(() => workflow.advance(checked), /拟事官尚未生成/);
assert.equal(rules.affairsOf(checked.stat_data.领地).评定次数, 0);
reply = `<事务><类型>${type}</类型><标题>巡防报告</标题><经过>走私船近港。</经过><来源>外部</来源><难度>2</难度><方法><名称>依法办理</名称><依据>有证据</依据></方法><收益><类别>金镑</类别><说明>追回税款</说明></收益><后果><系数>0.5</系数><类别>金镑</类别><说明>走私蔓延</说明></后果></事务>`;
const candidates = await workflow.generateCandidates(checked, '正文');
assert.equal(candidates.length, 1);
assert.equal(candidates[0].标题, '巡防报告');
reply = '格式错误';
await assert.rejects(workflow.generateCandidates(checked, '正文'), /未返回有效事务/);
assert.equal(rules.affairsOf(checked.stat_data.领地).评定次数, 0);
const second = { ...candidates[0], id: 'second', 标题: '医疗报告', $结算: { 回收率: 0, 是否失败: false, 实得: {} } };
const present = workflow.advance(checked, { candidates: [...candidates, second] });
assert.equal(workflow.sessionOf(present).stage, 'present');
assert.equal(workflow.sessionOf(present).attendance.玩家.在场, true);
assert.equal(rules.affairsOf(present.stat_data.领地).评定次数, 1);
assert.equal(rules.todosOf(present.stat_data.领地).length, 2);
assert.throws(() => workflow.abort(present), /不能抹除/);
const assignStage = workflow.advance(present);
assert.equal(workflow.sessionOf(assignStage).stage, 'assign');
assert.throws(() => workflow.advance(assignStage), /指定承办人/);
const assignedOwn = workflow.assign(assignStage, candidates[0].id, '<User>');
assert.throws(() => workflow.assign(assignedOwn, 'second', '陌生人'), /未到场/);
const assigned = workflow.assign(assignedOwn, 'second', '艾琳');
const closing = workflow.advance(assigned);
assert.equal(workflow.sessionOf(closing).stage, 'closing');
assert.equal(rules.todosOf(closing.stat_data.领地)[0].状态, '玩家进行中');
assert.notEqual(rules.todosOf(closing.stat_data.领地)[1].状态, '待指派');
assert.match(workflow.exportText(closing), /巡防报告/);
assert.equal(workflow.advance(closing).cryptLord.domainAffairs, undefined);
assert.equal(workflow.advance(closing).stat_data.领地.$流水.length, 0);
const claimed = workflow.claim(closing, candidates[0].id);
assert.equal(rules.todosOf(claimed.data.stat_data.领地)[0].状态, '已完成');
assert.throws(() => workflow.claim(claimed.data, candidates[0].id), /已经结算/);
assert.throws(() => workflow.start(workflow.advance(closing), 121), /还差/);
reply = '<裁定>未通过</裁定><理由>仍在准备</理由>';
assert.deepEqual(JSON.parse(JSON.stringify(await workflow.verifyClaim(closing, '只吩咐管家', candidates[0].id))),
  { accepted: false, reason: '仍在准备' });
reply = '<评定正文>众人入席，逐条禀报。</评定正文>';
const prose = await workflow.narrate(present, '当前原生正文', 'present');
assert.equal(prose, '众人入席，逐条禀报。');
assert.equal(workflow.sessionOf(workflow.addRecord(present, '', prose)).records.length, 1);
const empty = workflow.abort(draft);
assert.equal(workflow.sessionOf(empty), null);
assert.equal(workflow.sessionOf(draft).stage, 'convene');
modules['cryptLord.variableSettlementApi'].readSettings = async () =>
  ({ useCustomApi: true, apiUrl: 'https://example.invalid/v1', apiKey: 'test-key', model: 'affair-model' });
await workflow.narrate(present, '正文', 'present');
assert.equal(calls.at(-1).custom_api.model, 'affair-model');
assert.equal(calls.at(-1).max_chat_history, 0);
console.log('domain-affairs: cooldown, attendance, candidates, stages, assignment, settlement, claim and export OK');

// Compare the whole accounting chain with the original engine, then use the actual native store.
const actual = vm.createContext({ console, structuredClone, DOMException,
  Math: Object.assign(Object.create(Math), { random: () => .99 }), Date, document: {} });
actual.window = actual;
for (const file of [
  'tests/guimizhizhu_ui/domain-affairs.fixture.js',
  ...['domain-defaults', 'industry-state', 'cashflow', 'domain-state', 'faction-state',
    'native-settlement', 'affair-state', 'state-store', 'domain-affairs'].map(name => `public/guimizhizhu_ui/core/${name}.js`),
]) vm.runInContext(await readFile(path.join(base, file), 'utf8'), actual, { filename: file });
const services = actual.cryptLord.__stage1Modules, preview = actual.preview;
const engine = services['cryptLord.affairState'], lifecycle = services['cryptLord.domainAffairs'];
const store = services['cryptLord.stateStore'];
const receipt = await engine.loadRules(() => true);
assert.equal(receipt.pathways.通识者途径[0], '序列5-工匠');
assert.deepEqual(Array.from(engine.withRules(receipt, () => engine.AffairCore.methodsOfNpc('艾琳', preview.floors[1].data))),
  ['技艺施为', '查访取证', '舆论造势']);
assert.equal(actual.AFFAIR_CONF, undefined);
assert.equal(actual.CurrencyHelper, undefined);
assert.throws(() => engine.generateAffairs(preview.floors[1].data.stat_data.领地, {}, 1), /有效候选/);

const split = path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split');
async function originalNodes(file, wanted) {
  const text = await readFile(path.join(split, file), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), result = {};
  function visit(node) {
    if (ts.isBinaryExpression(node) && wanted.includes(node.left.getText(source)))
      result[node.left.getText(source)] = `${node.getText(source)};`;
    if (ts.isFunctionDeclaration(node) && wanted.includes(node.name?.text)) result[node.name.text] = node.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(Object.keys(result).length, wanted.length);
  return Object.values(result).join('\n');
}
const oracle = vm.createContext({ console: { log() {}, warn() {} }, Date, Math: actual.Math,
  GameDBManager: { DB: { godPathways: receipt.pathways } }, DomainCore: services['cryptLord.domainState'],
  AFFAIR_PROJ_STATUSES: new Set(['待指派', '玩家进行中', '已搁置']) });
oracle.window = oracle;
vm.runInContext(await originalNodes('37b-js-game-audio.txt', ['window.AFFAIR_CONF']), oracle);
vm.runInContext(await originalNodes('34b-js-schema-time-currency-domain.txt',
  ['resolvePathwayFromSequence', 'parsePrincipalTier', 'window.CurrencyHelper', 'window.AffairCore']), oracle);
vm.runInContext(await originalNodes('34b-js-schema-time-currency-domain.txt',
  ['affairHandlerLabel', 'buildAffairOverview']), oracle);
assert.equal(JSON.stringify(engine.AFFAIR_CONF), JSON.stringify(oracle.AFFAIR_CONF));
const todo = (id, handler, difficulty = 1) => ({
  id, 标题: id, 类型: '治安', 经过: '原生事务材料', 难度: difficulty, 状态: '待指派', 处理者: handler,
  推荐方法: ['技艺施为'], 利益关系人: '艾琳',
  $收益: { 类别: ['金镑', '物资', '人口', '好感度'], 货种: '工业品' },
  $后果: { 类别: ['金镑', '物资', '人口', '好感度'], 货种: '农产品' }, $后果系数: 1.5,
});
for (const [level, random] of [[1, .99], [8, .01]]) {
  actual.Math.random = () => random;
  const a = structuredClone(preview.initial[1].data), b = structuredClone(a);
  a.stat_data.领地.等级 = b.stat_data.领地.等级 = level;
  const roster = [{ 姓名: '艾琳' }, { 姓名: '路人', 路人: true }];
  function accounting(core, data) {
    const d = data.stat_data.领地;
    const recap = core.openAssembly(d, data, 120);
    d.事务.待办 = [todo('npc1', '艾琳'), todo('npc2', '艾琳', 5), todo('own', '<User>'),
      todo('passing', '路人'), todo('defer', '暂且搁下', 5)];
    core.settleBatch(d, data, roster);
    core.settleOwn(d, data, 'own');
    core.settleNeglect(d, data);
    core.closeAssembly(d);
    return recap;
  }
  assert.equal(engine.withRules(receipt, () => accounting(engine.AffairCore, a)), accounting(oracle.AffairCore, b));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
}
actual.Math.random = () => .99;
let current = lifecycle.start(preview.floors[1].data, 120, ['艾琳']);
current = await lifecycle.checkAttendance(current, '原生正文', { rules: receipt });
const picked = await lifecycle.generateCandidates(current, '原生正文', { rules: receipt });
current = engine.withRules(receipt, () => lifecycle.prepareAdvance(current, { candidates: picked }));
assert.equal(current.stat_data.货币.鲁恩王国.金镑, 50);
assert.equal(lifecycle.sessionOf(current).stage, 'convene');
assert.throws(() => lifecycle.advance(current), /待补/);
assert.equal(JSON.stringify(lifecycle.prepareAdvance(current)), JSON.stringify(current));
current = await store.writeAssistantData(2, current, 'affected', null, () => true, { affairRules: receipt });
preview.failNarration = true;
await assert.rejects(lifecycle.narrate(current, '正文', 'present', '', { rules: receipt }), /有效评定正文/);
assert.equal(preview.writes.length, 1);
preview.failNarration = false;
current = lifecycle.completeAdvance(current, await lifecycle.narrate(current, '正文', 'present', '', { rules: receipt }));
current = await store.writeAssistantData(2, current, 'affected', null, () => true, { affairRules: receipt });
assert.equal(current.stat_data.领地.事务.评定次数, 1);
assert.equal(current.stat_data.货币.鲁恩王国.金镑, 50);
assert.ok(current.world_data._lastTimeEra); // Adopt native time derivation, not the pre-save draft.
const projected = Object.values(current.stat_data.势力).find(faction => faction.势力名 === '灰雾郡').势力概述;
assert.equal(projected.slice(projected.lastIndexOf('【事务】')), oracle.buildAffairOverview(current.stat_data.领地));

const beforeConflict = preview.writes.length, candidate = structuredClone(current);
preview.books.bound[0].content = '{"通识者途径":["序列5-其他"]}';
await assert.rejects(store.writeAssistantData(2, candidate, 'affected', null, () => true, { affairRules: receipt }), /事务规则/);
assert.equal(preview.writes.length, beforeConflict);
preview.books.bound[0].content = '{"通识者途径":["序列5-工匠"]}';
await assert.rejects(store.writeAssistantData(2, candidate, 'affected', () => {
  preview.floors[1].swipes[1] = '外部修改另一正文页';
}, () => true, { affairRules: receipt }), /消息页/);
assert.equal(preview.writes.length, beforeConflict);
const fresh = await engine.loadRules(() => true);
preview.emit('GENERATION_STARTED', 'quiet');
await engine.assertRules(fresh, () => true);
preview.emit('GENERATION_STARTED', 'normal');
await assert.rejects(engine.assertRules(fresh, () => true), /来源已变化/);
preview.emit('GENERATION_ENDED');
const requests = preview.calls.length;
await assert.rejects(lifecycle.verifyClaim(closing, '正文', candidates[0].id, { guard: () => false }), /已取消/);
assert.equal(preview.calls.length, requests);
let alive = true;
services['cryptLord.variableSettlementApi'].readSettings = async () => { alive = false; return {}; };
await assert.rejects(lifecycle.narrate(current, '正文', 'present', '', { guard: () => alive }), /已取消/);
assert.equal(preview.calls.length, requests);
assert.equal(JSON.stringify(preview.floors[0]), JSON.stringify(preview.initial[0]));
console.log('domain-affairs: original accounting oracle + native save, once-only neglect, narrative retry and source cancellation OK');
