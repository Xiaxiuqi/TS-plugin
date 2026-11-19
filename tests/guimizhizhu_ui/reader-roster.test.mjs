import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {}, requests = [];
let response = '<裁定>\n通过|已掌握\n</裁定>', settings = { useCustomApi: false };
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const file of ['audience-imagination', 'battle-field-effect-reference', 'marionette-reference',
  'marionette-state', 'reader-reference', 'reader-roster-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${file}.js`, import.meta.url), 'utf8'), context);
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { requests.push(config); return response; } };
const pool = { pathways: {
  阅读者途径: ['序列9-阅读者', '序列5-秘术导师', '序列3-洞悉者', '序列0-白塔'],
  占卜家途径: ['序列5-秘偶大师', '序列4-诡法师'],
  学徒途径: ['序列5-旅行家', '序列3-漫游者'], 观众途径: ['序列1-作家'],
}, abilities: {} };
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列5-秘术导师',
  人物关系列表: { 甲: { 好感度: 90 }, 乙: { 好感度: 81 }, 丙: { 好感度: 80 } },
  序列能力列表: { 原有能力: [{ 名称: '解析' }] } },
  npc_data: { 甲: { 当前序列: '序列5-秘偶大师/序列5-旅行家' },
    乙: { 当前序列: '序列3-漫游者' }, 丙: { 当前序列: '序列4-诡法师' } }, cryptLord: {} };
const service = modules['cryptLord.readerRosterState'];
const options = { confirmSync: () => true, evidence: { history: '#0 传授', recent: '#1 学习', latest: '#2 已掌握' } };
const untouched = JSON.stringify(initial);
const session = service.create(initial, pool, options), { core, mode, win } = session;
const plain = value => JSON.parse(JSON.stringify(value));
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37f-js-pathway-cores.txt', import.meta.url), 'utf8');
function original(name, methods) {
  const ast = ts.createSourceFile('original.js', source.slice(source.indexOf(`const ${name} =`)), 99, true, ts.ScriptKind.JS);
  return vm.runInNewContext(`({ ${ast.statements[0].declarationList.declarations[0].initializer.properties
    .filter(node => methods.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join(',\n')} })`);
}
const originalCore = original('ReaderMysticCore', ['pointsForRank', 'slotsForRank', 'learningSlotsForRank', 'learningRewardForRank']);
const originalMode = original('ReaderMysticMode', ['learningPrompt', 'parseLearningVerdict']);
for (const rank of [-2, -1, 0, .2, .5, 1, 2, 3, 4, 5, 6])
  for (const key of ['pointsForRank', 'slotsForRank', 'learningSlotsForRank', 'learningRewardForRank'])
    assert.equal(core[key](rank), originalCore[key](rank));
assert.equal(core.resolve('上帝', initial).slots, 4);
assert.equal(core.resolve('序列9-阅读者', initial).unlocked, false);
const candidates = core.learningCandidates(session.data, mode.gate(win), 1);
assert.equal(candidates.length, 3);
assert.equal(candidates.some(row => row.目标 === '丙'), false);
mode.collectLearningPick = () => candidates.find(row => row.目标 === '甲' && row.途径 === '占卜家');
await session.action('start-learning', 1);
const pending = core.refreshPendingLearning(session.data, 1, mode.gate(win));
assert.equal(mode.learningPrompt(win, pending), originalMode.learningPrompt(win, pending));
for (const raw of [response, '<裁定>不通过|观察</裁定>', 'invalid'])
  assert.deepEqual(plain(mode.parseLearningVerdict(raw)), plain(originalMode.parseLearningVerdict(raw)));
response = '<裁定>不通过|仅尝试</裁定>';
await session.action('recognize-learning', 1);
assert.equal(core.learningEntries(session.data)[1].进行中.上次失败原因, '仅尝试');
response = 'invalid';
await session.action('recognize-learning', 1);
assert.match(core.learningEntries(session.data)[1].进行中.上次失败原因, /格式/);
response = '<裁定>通过|明确掌握</裁定>';
await session.action('recognize-learning', 1);
assert.equal(mode.gate(win).points, 7);
assert.equal(core.learningEntries(session.data)[1].进行中, null);
assert.equal(requests[0].custom_api, undefined);
assert.match(requests[0].ordered_prompts.at(-1).content, /<历史事件>[\s\S]*#0/);
assert.equal(core.learningCandidates(session.data, mode.gate(win), 2).some(row => row.目标 === '甲'), false);
assert.match(core.validateLearningTarget(session.data, 1, candidates.find(row => row.目标 === '甲'), mode.gate(win)), /严格高于/);
mode.collectLearningPick = () => core.learningCandidates(session.data, mode.gate(win), 1).find(row => row.目标 === '乙');
await session.action('start-learning', 1);
assert.equal(mode.gate(win).points, 7);
await session.action('cancel-learning', 1);
assert.equal(core.learningEntries(session.data)[1].已认定.目标, '甲');
await session.action('start-learning', 1);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', model: 'test', apiKey: '' };
await session.action('recognize-learning', 1);
assert.equal(requests.at(-1).custom_api.model, 'test');
assert.equal(mode.gate(win).points, 8);
assert.equal(core.learningEntries(session.data)[1].已认定.目标, '乙');
const config = core.defaultConfig(1);
config.名称 = '新秘术'; config.强度档 = 3;
const scope = { querySelector: () => ({}) };
mode.scope = () => scope; mode.readConfig = () => config;
await session.action('save-mystic', 1);
assert.equal(core.configs(session.data)[1].名称, '新秘术');
assert.equal(session.data.stat_data.序列能力列表['#秘术强化'][0].power,
  Math.round(core.avgAttrs(5).活力 * .4));
const saved = JSON.stringify(session.data);
config.强度档 = 4; config.消耗档 = 3;
await session.action('save-mystic', 1);
assert.equal(JSON.stringify(session.data), saved);
config.名称 = '解析'; config.强度档 = 0; config.消耗档 = 0;
await session.action('save-mystic', 1);
assert.equal(JSON.stringify(session.data), saved);
config.名称 = '__proto__';
await session.action('save-mystic', 1);
assert.equal(JSON.stringify(session.data), saved);
for (const kind of ['damage', 'heal']) for (const target of ['single', 'group']) {
  const cfg = { ...core.defaultConfig(1), 流派: kind, 目标模式: target, 施法中心: 'self',
    状态效果: [{ 类型: 'poison', 资源属性: '理智', 持续: 3, 强度档: 2 },
      { 类型: 'buff', 属性: 'attack', 目标: 'self', 持续: 2, 强度档: 1 }] };
  const ab = core.buildAbility(cfg, 1, 5);
  assert.equal(ab.effects.length, 2);
  assert.equal(ab.effects[0].stat, '当前理智');
  assert.equal(ab.effects[1].power, 20);
  assert.equal(ab.aoeRadius, target === 'group' ? 1 : 0);
}
session.data.stat_data.当前序列 = '序列9-阅读者';
core.syncPlayerProjection(session.data);
assert.equal(session.data.stat_data.序列能力列表['#秘术强化'], undefined);
assert.equal(core.configs(session.data)[1].名称, '新秘术');
session.data.stat_data.当前序列 = initial.stat_data.当前序列;
core.syncPlayerProjection(session.data);
await session.action('delete-mystic', 1);
assert.equal(core.configs(session.data)[1], undefined);
assert.equal(session.data.stat_data.序列能力列表['#秘术强化'], undefined);
assert.equal(JSON.stringify(initial), untouched);
assert.deepEqual(plain(session.data.npc_data), plain(initial.npc_data));
const legacy = structuredClone(session.data);
delete legacy.stat_data.$专属玩法.阅读者途径.秘术强化.秘术栏位;
const raw = JSON.stringify(legacy);
assert.equal(service.gate(legacy, pool).points, 8);
assert.equal(JSON.stringify(legacy), raw);
const failed = service.create(initial, pool, options);
failed.mode.collectLearningPick = () => failed.core.learningCandidates(failed.data, failed.mode.gate(failed.win), 1)[0];
await failed.action('start-learning', 1);
const failedBefore = JSON.stringify(failed.data);
modules['cryptLord.mysteryReenactment'] = { sync() { throw Error('模拟能力同步失败'); } };
await assert.rejects(failed.action('recognize-learning', 1), /同步失败/);
assert.equal(JSON.stringify(failed.data), failedBefore);
delete modules['cryptLord.mysteryReenactment'];
const missing = service.create(failed.data, pool, options);
delete missing.data.npc_data[missing.core.learningEntries(missing.data)[1].进行中.目标];
const requestCount = requests.length;
await missing.action('recognize-learning', 1);
assert.match(missing.core.learningEntries(missing.data)[1].进行中.上次失败原因, /找不到/);
assert.equal(requests.length, requestCount);
const customPool = structuredClone(pool);
customPool.pictureConfig = { consumableConfig: { avgAttrByRank: {
  5: { 活力: 1000, 敏捷: 800, 灵性: 500, 理智: 400, 人性: 300, 运气: 200 },
} } };
const projected = structuredClone(initial);
const custom = service.create(projected, customPool, options);
custom.core.saveConfig(projected, 1, { ...custom.core.defaultConfig(1), 名称: '定制平均值' });
service.sync(projected, customPool);
assert.equal(projected.stat_data.序列能力列表['#秘术强化'][0].power, 200);
assert.equal(projected.stat_data.序列能力列表['#秘术强化'][0].cost.amount, 75);
vm.runInContext(await readFile(new URL('../../public/guimizhizhu_ui/core/reader-mystic.js', import.meta.url), 'utf8'), context);
projected.stat_data.序列能力列表['#秘术强化'][0].power = 999;
modules['cryptLord.readerMystic'].sync(projected, customPool);
assert.equal(projected.stat_data.序列能力列表['#秘术强化'][0].power, 200);
const high = service.create({ ...initial, stat_data: { ...initial.stat_data, 当前序列: '序列3-洞悉者' } }, pool, options);
for (const slot of [1, 2]) high.core.saveConfig(high.data, slot,
  { ...high.core.defaultConfig(slot), 名称: `独立预算${slot}`, 强度档: 4, 消耗档: 1 });
high.core.syncPlayerProjection(high.data);
assert.equal(high.data.stat_data.序列能力列表['#秘术强化'].length, 2);
high.core.writeLearningSlot(high.data, 6, { 目标: '隐藏老师', 当前序列: '序列3-漫游者',
  学习序列: '序列3-漫游者', 途径: '学徒', 序列等级: 3 }, null);
assert.equal(high.mode.gate(high.win).learningPoints, 2);
high.data.stat_data.当前序列 = '序列5-秘术导师';
high.core.syncPlayerProjection(high.data);
assert.equal(high.mode.gate(high.win).learningPoints, 0);
assert.ok(high.core.learningEntries(high.data)[6].已认定);
assert.ok(high.core.configs(high.data)[2]);
assert.equal(high.data.stat_data.序列能力列表['#秘术强化'], undefined);
const imaginaryPool = structuredClone(pool);
imaginaryPool.pathways.阅读者途径.push('序列1-全知之眼');
const imagined = modules['cryptLord.audienceImagination'].save(
  { ...initial, stat_data: { ...initial.stat_data, 当前序列: '序列1-作家' } },
  imaginaryPool, ['阅读者途径', '']);
assert.equal(service.gate(imagined, imaginaryPool).rank, 1);
assert.equal(imagined.stat_data.当前序列, '序列1-作家');
const blocked = service.create({ ...initial, cryptLord: { teamBattle: { status: 'active' } } }, pool, options);
await assert.rejects(blocked.action('start-learning', 1), /战斗/);
await assert.rejects(session.action('save-mystic', 0), /栏位/);
await assert.rejects(session.action('recognize-learning', 99), /栏位/);
const broken = structuredClone(initial);
broken.stat_data.$专属玩法 = { 阅读者途径: { 秘术强化: { 版本: 99 } } };
await assert.rejects(service.create(broken, pool, options).action('start-learning', 1), /格式/);
console.log('Reader module: original rules, complete learning lifecycle, editor/projections and native guards passed.');
