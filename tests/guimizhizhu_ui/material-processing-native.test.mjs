import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date, Uint32Array, DOMException,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const name of ['response-normalizer', 'audience-imagination', 'battle-experience', 'battle-field-effect-reference',
  'battle-play-reference', 'battle-play-units', 'savant-material', 'savant-enhancement', 'weapon-classifier',
  'marionette-reference', 'marionette-state', 'workshop-reference', 'workshop-state',
  'enhancement-reference', 'enhancement-state', 'material-processing-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const service = modules['cryptLord.materialProcessingState'];
const plain = value => JSON.parse(JSON.stringify(value));
const pool = { pathways: { 通识者途径: ['序列6-机械专家', '序列4-炼金术士', '序列1-文明启蒙者'],
  观众途径: ['序列1-作家'] }, pictureConfig: {}, abilities: {} };
const data = { stat_data: { 名称: '玩家', 当前序列: '序列6-机械专家',
  其他列表: { 废金属: { 名称: '废金属', 数量: 2.75 } },
  武器列表: { 强化枪: { 名称: '强化枪', $强化模块安装: { 模块ID: 'module-a' } } },
  人物关系列表: { 死者: { 名称: '死者' }, 生者: {}, 孤立: {} },
  $专属玩法: { 通识者途径: { 制造玩法: { 版本: 99 } } } },
  npc_data: { 死者: { 当前活力: 0, 当前序列: '序列6', 事件历史: { 一: '遗骸可取得' } },
    生者: { 当前活力: 1 }, 自主: { 当前活力: 0, $完全自主造物: true } },
  world_data: { 原字段: '保持' }, cryptLord: {} };
const before = JSON.stringify(data);
const candidate = { candidateIndex: 1, family: '金属', material: '钢', grade: '序列4',
  pathway: '无', traits: ['坚硬'], difficulty: 1, clue: '主体尚有杂质',
  operations: ['拆解', '分离', '精炼'], reason: '可取得金属' };
const recognized = '<材料认定>\n1|1|通过|金属|钢|序列4|无|坚硬|1|主体尚有杂质|拆解>分离>精炼|可取得金属\n</材料认定>';
function create(options = {}) { return service.create(data, pool, { confirmSync: () => true, ...options }); }
// 1. Canonical gate, original source filtering, parser/prompt/formula parity, pure opening.
const probe = create(), mode = probe.mode;
assert.equal(service.gate(data, pool).unlocked, true);
assert.equal(service.gate({ stat_data: { 当前序列: '序列7-鉴定师' } }, pool).unlocked, false);
const projected = structuredClone(data);
projected.stat_data.当前序列 = '序列1-作家';
projected.stat_data.$专属玩法.观众途径 = { 空想玩法: { 空想栏位: { 栏位1: { 途径: '通识者途径' } } } };
assert.equal(service.gate(projected, pool).unlocked, true);
assert.deepEqual(plain(mode.sources(probe.win).map(row => row.name)), ['废金属', '死者']);
probe.render(); assert.equal(JSON.stringify(probe.data), before);
assert.doesNotMatch(probe.render(), /construct-|制造工坊/);
const text = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', text.slice(text.indexOf('const SavantMaterialMode =')), 99, true, ts.ScriptKind.JS);
const properties = ast.statements[0].declarationList.declarations[0].initializer.properties;
const methods = ['prompt', 'compareOperations', 'sequenceBonus', 'chanceFor'];
const original = vm.runInNewContext(`({ ${properties.filter(node => methods.includes(node.name.getText(ast)))
  .map(node => node.getText(ast)).join(',\n')} })`, { window: {} });
assert.equal(mode.prompt('玩家', '序列6', '来源'), original.prompt('玩家', '序列6', '来源'));
for (const rank of [6, 4, 3, 2, 0, -1])
  assert.deepEqual(plain(mode.chanceFor(candidate, { kind: 'item' }, candidate.operations, rank)),
    plain(original.chanceFor(candidate, { kind: 'item' }, candidate.operations, rank)));
assert.equal(mode.parseRecognition(recognized, 1)[1].candidates.length, 1);
assert.equal(mode.parseRecognition(recognized.replace('坚硬', '凭空性质'), 1)[1].candidates.length, 0);
assert.equal(mode.parseRecognition('无格式', 1), null);
const loader = await readFile(new URL('../../public/guimizhizhu_ui/loader.js', import.meta.url), 'utf8');
assert.ok(loader.indexOf("path: 'modules/pathway-roster-window/index.js'") <
  loader.indexOf("path: 'modules/material-processing-native/index.js'"));
// 2. Original model request, malformed/rejected results, and retry without source consumption.
const requests = [];
let reply = recognized, useCustomApi = false;
modules['cryptLord.variableSettlementApi'] = { readSettings: async () => ({
  useCustomApi, apiUrl: 'https://example.invalid/v1', apiKey: 'mock', model: 'mock' }) };
modules['cryptLord.hostApi'] = { generateRaw: async config => { requests.push(config); return reply; } };
probe.mode.collectSources = () => [{ ...mode.sources(probe.win)[0], selectedQty: .75 }];
await probe.action('material-recognize');
assert.equal(probe.state.view, 'queue'); assert.equal(probe.state.queue.length, 1);
assert.equal(JSON.stringify(probe.data), before); assert.equal(requests[0].custom_api, undefined);
assert.equal(requests[0].max_chat_history, 0);
useCustomApi = true; reply = '无格式';
await probe.action('material-recognize');
assert.equal(probe.state.queue.length, 0); assert.equal(JSON.stringify(probe.data), before);
assert.equal(requests[1].custom_api.model, 'mock');
reply = recognized; await probe.action('material-recognize');
assert.equal(probe.state.queue.length, 1);
// 3. Entire queue/settlement/warehouse lifecycle; all four real outcome branches.
for (const [roll, result, output] of [[1, '大成功', .9375], [20, '成功', .75],
  [80, '普通失败', .375], [100, '大失败', 0]]) {
  const s = create({ roll: () => roll });
  s.state.queue = [{ source: { ...s.mode.sources(s.win)[0], selectedQty: .75 }, candidates: [candidate] }];
  await s.action('material-target', '0');
  s.mode.readOperations = () => candidate.operations;
  await s.action('material-settle');
  assert.equal(s.state.lastSettlement.result, result);
  assert.equal(s.state.lastSettlement.outputQty, output);
  assert.equal(s.data.stat_data.其他列表.废金属.数量, 2);
  assert.equal(s.mode.batches(s.data).length, output ? 1 : 0);
  if (output) assert.equal(s.mode.batches(s.data)[0].data.等级, result === '普通失败' ? '序列8' : '序列6');
  await assert.rejects(s.action('material-settle'), /先选择/);
  await s.action('material-next'); await s.action('material-clear-queue');
  assert.equal(s.state.view, 'main'); assert.equal(s.state.queue.length, 0);
}
const corpse = create({ roll: () => 20 });
corpse.state.queue = [{ source: { ...corpse.mode.sources(corpse.win)[1], selectedQty: 1 }, candidates: [candidate] }];
await corpse.action('material-target', '0'); corpse.mode.readOperations = () => candidate.operations;
await corpse.action('material-settle');
assert.equal(corpse.data.npc_data.死者.$材料加工.已加工, true);
assert.equal(corpse.mode.sources(corpse.win).some(row => row.name === '死者'), false);
assert.equal(corpse.data.npc_data.死者.事件历史.一, '遗骸可取得');
const boosted = structuredClone(data);
boosted.stat_data.衣物列表 = {
  工作服: { isEquipped: true, $强化模块安装: { 模块ID: 'success', 属性增量: {} } },
  手套: { isEquipped: true, $强化模块安装: { 模块ID: 'yield', 属性增量: {} } },
};
boosted.stat_data.$专属玩法.通识者途径.装备强化玩法 = { 版本: 1, 模块仓库: {
  success: { 名称: '生产模块', 生产增益: { type: 'successBonus', value: 10 },
    安装位置: { 列表键: '衣物列表', 物品键: '工作服' }, 六维比例: {}, 卸下次数: 0 },
  yield: { 名称: '生产模块', 生产增益: { type: 'yieldBonus', value: .1 },
    安装位置: { 列表键: '衣物列表', 物品键: '手套' }, 六维比例: {}, 卸下次数: 0 },
} };
const enhanced = service.create(boosted, pool, { roll: () => 20, confirmSync: () => true });
const bonuses = modules['cryptLord.savantEnhancement'].productionBonuses(enhanced.data);
assert.equal(bonuses.successBonus, 10); assert.equal(bonuses.yieldBonus, .1);
const enhancedSource = { ...enhanced.mode.sources(enhanced.win)[0], selectedQty: 1 };
assert.equal(enhanced.mode.chanceFor(candidate, enhancedSource, candidate.operations, 6, enhanced.data).chance, 80);
enhanced.state.queue = [{ source: enhancedSource, candidates: [candidate] }];
await enhanced.action('material-target', '0'); enhanced.mode.readOperations = () => candidate.operations;
await enhanced.action('material-settle'); assert.equal(enhanced.state.lastSettlement.outputQty, 1.1);
// 4. Source conflicts, real exceptions rollback, scope/versions and battle locks.
const stale = create({ roll: () => 20 });
stale.state.queue = [{ source: { ...stale.mode.sources(stale.win)[0], selectedQty: 1 }, candidates: [candidate] }];
await stale.action('material-target', '0'); stale.mode.readOperations = () => candidate.operations;
stale.data.stat_data.其他列表.废金属.数量 = 1;
await stale.action('material-settle');
assert.equal(stale.data.stat_data.其他列表.废金属.数量, 1);
assert.equal(stale.state.lastSettlement, null);
const rollback = create({ roll: () => 20 });
rollback.state.queue = [{ source: { ...rollback.mode.sources(rollback.win)[0], selectedQty: 1 }, candidates: [candidate] }];
await rollback.action('material-target', '0'); rollback.mode.readOperations = () => candidate.operations;
rollback.mode.addBatch = () => { throw Error('仓库故障'); };
await assert.rejects(rollback.action('material-settle'), /仓库故障/);
assert.equal(rollback.data.stat_data.其他列表.废金属.数量, 2.75);
assert.equal(rollback.state.view, 'process');
await assert.rejects(rollback.action('construct-create'), /不支持/);
for (const invalid of [{ 版本: 99 }, { 材料仓库: { a: { 数量: Infinity } } }]) {
  const broken = structuredClone(data);
  broken.stat_data.$专属玩法.通识者途径.材料加工玩法 = invalid;
  await assert.rejects(service.create(broken, pool).action('material-recognize'), /版本|数量/);
}
for (const status of ['active', 'finished']) {
  const locked = structuredClone(data); locked.cryptLord.teamBattle = { status, settled: false };
  await assert.rejects(service.create(locked, pool).action('material-recognize'), /战斗/);
}
const historical = create({ freshEvidenceList: async () => [{ 序号: 0, 正文: '已改写' }] });
historical.state.evidenceSnapshot = [{ 序号: 0, 正文: '原历史证据' }];
await assert.rejects(historical.action('material-settle'), /历史楼层已变化/);
// The same shared request must reject cancellation, changed settings/services, and hidden verdicts.
const request = modules['cryptLord.marionetteState'].request;
const originalHost = modules['cryptLord.hostApi'];
const count = requests.length;
await assert.rejects(request('system', 'user', '', '', { guard: () => false }), { name: 'AbortError' });
assert.equal(requests.length, count);
let valid = true, checks = 0;
modules['cryptLord.hostApi'] = { async generateRaw() { valid = false; return recognized; } };
await assert.rejects(request('system', 'user', '', '', { guard: () => valid }), { name: 'AbortError' });
modules['cryptLord.hostApi'] = { async generateRaw() { useCustomApi = !useCustomApi; return recognized; } };
await assert.rejects(request('system', 'user', '', '', { guard: () => true }), /API 设置已变化/);
modules['cryptLord.hostApi'] = { async generateRaw() { modules['cryptLord.hostApi'] = originalHost; return recognized; } };
await assert.rejects(request('system', 'user', '', '', { guard: () => true }), /服务已变化/);
modules['cryptLord.hostApi'] = { async generateRaw() { return `<think>${recognized}</think>`; } };
const hidden = await request('system', 'user', '', '', { guard: () => true, assertCurrent: async () => { checks++; } });
assert.equal(mode.parseRecognition(hidden, 1), null);
assert.equal(checks, 2);
modules['cryptLord.hostApi'] = originalHost;
assert.equal(JSON.stringify(data), before);
console.log('Material processing: 4 focused groups passed (original parity, recognition/API, full settlement chain, transaction guards).');
