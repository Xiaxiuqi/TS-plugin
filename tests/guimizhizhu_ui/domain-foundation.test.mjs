import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = { 'cryptLord.industryState': {} };
let reply = '';
const calls = [];
modules['cryptLord.hostApi'] = { async generateRaw(config) { calls.push(config); return reply; } };
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return { useCustomApi: false }; } };
const context = {
  console, Math, Date, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } },
  DOMAIN_PEER_ROSTER: { 1: [{ id: 'first', 名称: '第一邻境' }], 2: [{ id: 'second' }] },
  GameDBManager: { DB: { domainConfig: {
    stages: { 1: { 开局人口: 120, 用工: [2] }, 2: { 开局人口: 400, 用工: [3] } },
    core: { 乡村: { 1: '庄园', 2: '城堡' } },
    buildingsByStage: {
      1: { 乡村: [{ id: 'farm', 主产出: '农产品' }, { id: 'forge', 主产出: '工业品' }, { id: 'shop', 主产出: '服务' }] },
      2: { 乡村: [{ id: 'farm-2', 主产出: '农产品' }, { id: 'forge-2', 主产出: '工业品' }, { id: 'shop-2', 主产出: '服务' }] },
    },
  } } },
};
context.window = context;
for (const file of ['core/domain-state.js', 'core/domain-foundation.js']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui', file), 'utf8'),
    context, { filename: file });
}
const rules = modules['cryptLord.domainState'];
const claim = modules['cryptLord.domainFoundation'];
const domain = rules.ensureDomain({ 已建立: false });
assert.equal(rules.setFoundationTarget(domain, '', '乡村').ok, false);
assert.equal(rules.setFoundationTarget(domain, '廷根', '未知').ok, false);
assert.equal(rules.setFoundationTarget(domain, '廷根', '乡村').ok, true);
assert.deepEqual(Array.from(rules.foundationLevels()), [1, 2]);
const before = JSON.stringify(domain);
for (const proposal of [
  { 等级: 3, 名称: '新庄园', 建筑: ['farm', 'forge', 'shop'] },
  { 等级: 1, 名称: '', 建筑: ['farm', 'forge', 'shop'] },
  { 等级: 1, 名称: '新庄园', 建筑: ['farm-2', 'forge', 'shop'] },
  { 等级: 1, 名称: '新庄园', 建筑: ['farm', 'farm', 'shop'] },
  { 等级: 1, 名称: '新庄园', 建筑: ['farm', 'forge'] },
]) assert.equal(rules.foundDomain(domain, proposal).ok, false);
assert.equal(JSON.stringify(domain), before);
const messages = [
  { message_id: 0, role: 'assistant', message: '<gametxt>开局。</gametxt><UpdateVariable>无关</UpdateVariable>' },
  { message_id: 1, role: 'user', message: '取得庄园' },
  { message_id: 2, role: 'assistant', message: '<thinking>秘密推理</thinking><gametxt>领主正式授予廷根地产。</gametxt>' },
  { message_id: 3, role: 'assistant', message: '<gametxt>此楼不应读取。</gametxt>' },
];
const evidence = claim.evidence(messages, 2);
assert.match(evidence, /领主正式授予廷根地产/);
assert.doesNotMatch(evidence, /秘密推理|无关|此楼不应读取|取得庄园/);
assert.throws(() => claim.parseVerdict('无标签'), /格式/);
assert.throws(() => claim.parseVerdict('<裁定>不通过</裁定><理由>无</理由>'), /格式/);
reply = '<裁定>未通过</裁定><理由>只是临时占据</理由>';
assert.equal((await claim.verify('廷根', messages, 2)).ok, false);
assert.equal(calls.at(-1).custom_api, undefined);
assert.match(calls.at(-1).ordered_prompts.at(-1).content, /领主正式授予廷根地产/);
reply = '<裁定>通过</裁定><理由>所有权已转让</理由>';
assert.equal((await claim.verify('廷根', messages, 2)).ok, true);
modules['cryptLord.variableSettlementApi'].readSettings = async () =>
  ({ useCustomApi: true, apiUrl: 'https://example.invalid/v1', apiKey: 'key', model: 'domain-model' });
await claim.verify('廷根', messages, 2);
assert.equal(calls.at(-1).custom_api.model, 'domain-model');
await assert.rejects(claim.verify('廷根', [], 2), /没有可供验收/);
context.DOMAIN_PEER_ROSTER[2] = [];
assert.deepEqual(Array.from(rules.foundationLevels()), [1]);
const result = rules.foundDomain(domain, { 等级: 1, 名称: '新庄园', 建筑: ['farm', 'forge', 'shop'] });
assert.equal(result.ok, true);
assert.equal(domain.人口, 120);
assert.equal(domain.核心.名称, '庄园');
assert.equal(domain.核心.房间.房2.名称, '房2');
assert.equal(domain.格子.格3.建筑, 'shop');
assert.equal(domain.格子.格4.建筑, '');
assert.equal(domain.同级对手[0].id, 'first');
assert.equal(domain.待建目标.地点, '');
assert.equal(domain.$流水.length, 1);
assert.equal(rules.foundDomain(domain, { 等级: 1, 名称: '重复', 建筑: ['farm', 'forge', 'shop'] }).ok, false);
const fallbackModules = { 'cryptLord.industryState': {} };
const fallback = {
  console, Math, Date, structuredClone,
  cryptLord: { __stage1Modules: fallbackModules, contract: { initializeGlobal() {}, releaseGlobal() {} } },
};
fallback.window = fallback;
for (const file of ['core/domain-defaults.js', 'core/domain-state.js']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui', file), 'utf8'),
    fallback, { filename: file });
}
const original = fallbackModules['cryptLord.domainState'];
assert.equal(original.foundationLevels().length, 8);
assert.ok(original.missedFoundationSpoils(2).length > 0);
assert.equal(original.missedFoundationSpoils(1).length, 0);
assert.equal(original.stageConfig(1).开局人口, 288);
assert.equal(original.stageConfig(8).开局人口, 91000000);
assert.equal(original.buildingLabel(original.buildingDefs({ 等级: 1, 线路: '市内' })[0], '市内'), '租田');
const originalDomain = original.ensureDomain({ 已建立: false });
assert.equal(original.setFoundationTarget(originalDomain, '贝克兰德', '市内').ok, true);
const originalDefs = original.buildingDefs({ 等级: 1, 线路: '市内' });
const originalPicks = ['农产品', '工业品', '服务'].map(type =>
  originalDefs.find(item => item.主产出 === type).id);
assert.equal(original.foundDomain(originalDomain,
  { 等级: 1, 名称: '贝克兰德宅院', 建筑: originalPicks }).ok, true);
assert.equal(originalDomain.同级对手.length, 5);
assert.equal(originalDomain.核心.名称, '宅院');
assert.equal(originalDomain.人口, 288);
console.log('domain-foundation: intent, claim, model fallback, staged validation, creation and repeat guard OK');

// One original-rule oracle plus the actual native save/settlement chain.
const actual = vm.createContext({ console, Math, Date, structuredClone, DOMException, document: {} });
actual.window = actual;
for (const file of ['tests/guimizhizhu_ui/world-settlement.fixture.js',
  ...['domain-defaults', 'industry-state', 'cashflow', 'domain-state', 'faction-state',
    'native-settlement', 'state-store', 'domain-foundation', 'domain-recognition']
    .map(name => `public/guimizhizhu_ui/core/${name}.js`)])
  vm.runInContext(await readFile(path.join(base, file), 'utf8'), actual, { filename: file });
const services = actual.cryptLord.__stage1Modules, preview = actual.preview, engine = services['cryptLord.domainState'];
services['cryptLord.variableSettlementApi'] = { async readSettings() { return { useCustomApi: false }; } };
let modelCalls = 0;
services['cryptLord.hostApi'].generateRaw = async () => {
  modelCalls++; return '<裁定>通过</裁定><理由>正式所有权</理由>';
};
const rulesTicket = await engine.loadRules(() => true, true);
const inside = run => engine.withWarRules(rulesTicket, run);
const text = await readFile(path.join(base,
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34b-js-schema-time-currency-domain.txt'), 'utf8');
const tree = ts.createSourceFile('original.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let coreSource;
function visit(node) {
  if (ts.isBinaryExpression(node) && node.left.getText(tree) === 'window.DomainCore') coreSource = node.getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree); assert.ok(coreSource);
const oracle = vm.createContext({ console: { log() {}, warn() {} }, Math, Date, structuredClone,
  GameDBManager: { DB: { domainConfig: rulesTicket.config, factionConfig: rulesTicket.factionConfig } },
  DOMAIN_PEER_ROSTER: rulesTicket.roster });
oracle.window = oracle;
vm.runInContext(`${coreSource};`, oracle);
const oracleCore = oracle.DomainCore;
const originalMinutes = ((5 * 10000 + 1350) * 365 + 30 + 1) * 1440;
assert.equal(engine.nowMinutes({ world_data: { 当前时间纪元: preview.time } }), originalMinutes);
inside(() => {
  for (const population of [0, 288]) {
    const completed = engine.ensureDomain({ 已建立: true, 等级: 1, 人口: population });
    completed.格子.格1 = { 建筑: 'field', 等级: 0, 开工: false, 施工动作: '新建', 完工时刻: 100 };
    completed.格子.格2 = { 建筑: 'field', 等级: 1, 开工: false, 施工动作: '1→2', 完工时刻: 100 };
    completed.格子.格3 = { 建筑: 'field', 等级: 2, 开工: false, 施工动作: '2→3', 完工时刻: 100 };
    completed.格子.格4 = { 建筑: 'field', 等级: 0, 开工: false, 施工动作: '新建', 完工时刻: 0 };
    const expected = structuredClone(completed);
    assert.equal(engine.sweepConstruction(completed, 99), oracleCore.sweepConstruction(expected, 99));
    assert.equal(engine.sweepConstruction(completed, 100), oracleCore.sweepConstruction(expected, 100));
    assert.equal(JSON.stringify(completed.格子), JSON.stringify(expected.格子));
    assert.equal(completed.格子.格1.开工, population > 0);
    assert.equal(completed.格子.格4.施工动作, '新建');
    assert.equal(engine.sweepConstruction(completed, 100), 0);
    assert.equal(completed.$流水.length, 3);
    assert.equal(engine.buildRegionOverview(completed), oracleCore.buildRegionOverview(expected));
  }
  for (const level of [4, 5, 6, 7, 8]) {
    const high = engine.ensureDomain({ 已建立: true, 等级: level, 线路: '乡村' });
    engine.ensurePeers(high);
    high.同级对手[0].状态 = '已吞并';
    high.同级对手[0].完成方式 = '正文结盟';
    high.同级对手[1].状态 = '已吞并';
    high.同级对手[1].完成方式 = '正文吞并';
    assert.equal(engine.buildFactionOverview(high), oracleCore.buildFactionOverview(structuredClone(high)));
  }
});
const staged = structuredClone(preview.floors[2].data);
const initialDomain = inside(() => engine.ensureDomain(staged.stat_data.领地));
initialDomain.驻军.散兵 = [{ 军种: '陆军', 兵种: 'militia', 精锐等级: 1, 数量: 3 }];
initialDomain.驻军.军队 = [{ id: 'guards', 军种: '陆军', 主兵种: 'militia',
  编成: [{ 军种: '陆军', 兵种: 'militia', 精锐等级: 1, 数量: 2 }] }];
staged.stat_data.势力 = { 银湾领地: { $投影: true, 直辖的半神和真神信息: { $meta: { keep: true } },
  锚的需求: 800, 自定义: '保留', 实控区域: { $meta: { keep: true } }, 世俗军队: { 陆军: { $meta: { keep: true } } } },
  其他势力: { 自定义: '不删除' }, $meta: { keep: true } };
inside(() => engine.syncProjection(staged));
const oracleData = structuredClone(staged);
oracleCore.syncDomainFactionProjection(oracleData);
for (const key of ['世俗军队', '实控区域', '直辖的半神和真神信息', '锚的需求', '人口数量'])
  assert.equal(JSON.stringify(staged.stat_data.势力.银湾领地[key]), JSON.stringify(oracleData.stat_data.势力.银湾领地[key]), key);
const beforeRename = JSON.stringify(staged);
assert.equal(inside(() => engine.renameDomain(staged, '其他势力')).ok, false);
assert.equal(JSON.stringify(staged), beforeRename);
assert.equal(inside(() => engine.renameDomain(staged, '新银湾')).ok, true);
assert.equal(staged.stat_data.势力.银湾领地, undefined);
assert.equal(staged.stat_data.势力.新银湾.锚的需求, 800);
assert.equal(staged.stat_data.势力.新银湾.直辖的半神和真神信息.$meta.keep, true);
assert.equal(staged.stat_data.势力.其他势力.自定义, '不删除');
const saved = await services['cryptLord.stateStore'].writeAssistantData(2, staged, 'affected', undefined,
  () => true, { warfareRules: rulesTicket });
assert.equal(saved.stat_data.势力.新银湾.世俗军队.陆军.民兵.部队数量, 5);
assert.equal(preview.flags.writes.length, 1);
const beforeRuleConflict = JSON.stringify(preview.floors);
preview.books.角色规则.push({ name: '【配置】势力配置', content: '{"productivityDemands":{"农产品":{"1级":{"c1":7}}}}' });
await assert.rejects(services['cryptLord.stateStore'].writeAssistantData(2, saved, 'affected', undefined,
  () => true, { warfareRules: rulesTicket }), /规则|已变化/);
assert.equal(JSON.stringify(preview.floors), beforeRuleConflict);
const fresh = await engine.loadRules(() => true, true);
assert.equal(engine.withWarRules(fresh, () => engine.unitUpkeep(1)['1级农产品']), 7);
actual.GameDBManager = { DB: { factionConfig: { productivityDemands: { 农产品: { '1级': { c1: 999 } } } } } };
assert.equal(engine.withWarRules(fresh, () => engine.unitUpkeep(1)['1级农产品']), 7);
const settingsApi = services['cryptLord.variableSettlementApi'];
let releaseSettings, active = true;
settingsApi.readSettings = () => new Promise(resolve => { releaseSettings = () => resolve({ useCustomApi: false }); });
const waiting = services['cryptLord.domainFoundation'].verify('银湾', preview.floors, 2, { guard: () => active });
await new Promise(resolve => setImmediate(resolve));
active = false; releaseSettings();
await assert.rejects(waiting, /取消/);
assert.equal(modelCalls, 0);
settingsApi.readSettings = async () => ({ useCustomApi: false });
await assert.rejects(services['cryptLord.domainRecognition'].verify(saved.stat_data.领地,
  saved.stat_data.领地.同级对手[0].id, '正文结盟', preview.floors, 2,
  { beforeRequest() { throw Error('正文已变化'); } }), /正文已变化/);
assert.equal(modelCalls, 0);
console.log('domain management: original projection/time oracle, merged troops, rename/native settlement, bound upkeep, rules and request cancellation OK');
