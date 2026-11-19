import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
let raw = '', settings = { useCustomApi: false }, request;
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const name of ['audience-imagination', 'battle-experience', 'battle-field-effect-reference',
  'battle-play-reference', 'battle-play-units', 'marionette-reference', 'marionette-state',
  'clone-reference', 'clone-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { request = config; return raw; } };
const service = modules['cryptLord.cloneState'];
const plain = value => JSON.parse(JSON.stringify(value));
const pool = { pathways: { 偷盗者途径: ['序列9-偷盗者', '序列4-寄生者', '序列1-时之虫', '序列0.5-错误'],
  猎人途径: ['序列9-猎人'], 观众途径: ['序列1-作家'] }, pictureConfig: {}, abilities: {} };
const card = { 名称: '甲', 当前序列: '序列9-猎人', 模板: '普通', 能力清单: [],
  活力: 100, 当前活力: 65, 灵性: 80, 当前灵性: 73, 敏捷: 60, 当前敏捷: 55,
  理智: 70, 当前理智: 60, 人性: 40, 当前人性: 39, 运气: 50, 神性: 1,
  能力体系: '肉身武技系', 性格: '原人格', 事件历史: { 战斗: '不能丢失' },
  关键记忆: { 入场: '人物原记忆' }, id: 'legacy', 创建时间: 'old' };
const data = { stat_data: { 名称: '玩家', 当前序列: '序列4-寄生者', 当前途径: '偷盗者',
  当前区域: '鲁恩', 当前地标: '廷根', 人物关系列表: {
    甲: { 名称: '甲', 性格: '主观人格', 关系: '俘虏', 好感度: 45 } },
  武器列表: { 刀: { 序列: 9, 途径: '偷盗者', isEquipped: true } },
  衣物列表: { 衣: {} }, 饰品列表: { 饰: {} }, 封印物列表: { 封: {} },
  消耗品列表: { 特性: { 名称: '特性', 数量: 3, 途径: '偷盗者', 序列: 9 } },
  其他列表: { 材: { 数量: 1 }, 安装模块: { 数量: 1, $强化模块安装: { 模块ID: 'protected' } } },
  杂物列表: { 杂: { 数量: 1 } }, 辅助能力列表: { 排除: {} } },
  npc_data: { 甲: structuredClone(card), 秘偶: { ...card, $秘偶: true } },
  cryptLord: { teamComposition: { version: 1,
    allyTeam: [{ name: '甲', dataSource: 'npc' }, { name: '甲', dataSource: 'puppet' }], enemyTeam: [] } } };
const before = JSON.stringify(data);
let session = service.create(data, pool, { confirm: async () => true });
let mode = session.mode;
for (const [rank, cap] of [[4, 3], [3, 5], [.5, 9], [0, 11], [-1, 13], [-2, 15]])
  assert.equal(mode.capOf(rank), cap);
assert.equal(service.gate(data, pool).unlocked, true);
assert.equal(service.gate({ stat_data: { 当前序列: '序列5-窃梦家' } }, pool).unlocked, false);
assert.equal(service.gate({ stat_data: { 当前序列: '支柱-诡秘之主' } }, pool).rank, -2);
const projected = structuredClone(data);
projected.stat_data.当前序列 = '序列1-作家';
projected.stat_data.$专属玩法 = { 观众途径: { 空想玩法: { 空想栏位: { 栏位1: { 途径: '偷盗者途径' } } } } };
assert.equal(service.gate(projected, pool).unlocked, true);
assert.equal(mode.materials(session.win.game).length, 7);
assert.equal(mode.candidates(session.win.game).length, 1);
const pools = service.create(data, pool);
pools.mode.bag(pools.win.game, true).袋内 = pools.mode.buildRecord('袋内', '序列9-偷盗者', '特性');
pools.data.npc_data.已转化 = { ...card, $分身转化: true };
pools.data.npc_data.已寄生 = { ...card, $寄生分身: true };
assert.equal(pools.mode.occupied(pools.win.game), 3);
assert.equal(pools.mode.nameTaken(pools.win.game, '甲').length > 0, true);
assert.equal(pools.mode.nameTaken(pools.win.game, '__proto__').length > 0, true);
// Independent extraction verifies original prompt and parser parity.
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37f-js-pathway-cores.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('const MarauderCloneMode =')), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const methods = ['prompt', 'promptCertify', 'promptStory', 'parseVerdicts', 'parseCertifyVerdicts'];
const original = vm.runInNewContext(`({ ${ast.statements[0].declarationList.declarations[0].initializer.properties
  .filter(node => methods.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join(',\n')} })`);
for (const key of ['prompt', 'promptCertify', 'promptStory'])
  assert.equal(mode[key]('玩家', '序列4', '材料', '旧分身'), original[key]('玩家', '序列4', '材料', '旧分身'));
raw = '<裁定>\n1|通过|9|材料有效\n2|不通过||凡物\n</裁定>';
assert.deepEqual(plain(mode.parseVerdicts(raw, 3)), plain(original.parseVerdicts(raw, 3)));
assert.equal(mode.parseVerdicts('invalid', 1), null);
const verdict = '<裁定>\n1|通过|亲手寄生\n2|不通过|仅为同伴\n</裁定>';
assert.deepEqual(plain(mode.parseCertifyVerdicts(verdict, 2)), plain(original.parseCertifyVerdicts(verdict, 2)));
mode.collectPicks = () => [{ ...mode.materials(session.win.game).find(row => row.itemKey === '刀'), 份数: 1 },
  { ...mode.materials(session.win.game).find(row => row.itemKey === '特性'), 份数: 1 }];
await session.action('craft');
assert.equal(session.data.stat_data.武器列表.刀, undefined);
assert.equal(session.data.stat_data.消耗品列表.特性.数量, 3);
assert.equal(mode.clones(session.win.game).length, 1);
assert.equal(session.data.stat_data.活力, undefined);
assert.equal(request.custom_api, undefined);
const name = mode.clones(session.win.game)[0].name;
assert.equal(mode.recordOfState(session.data, name).$来源材料, '刀');
assert.equal(mode.recordOfState(session.data, name).$战斗经验, 0);
assert.match(mode.uniqueName(session.win.game, name), /二/);
// One bad approved row rolls back the entire draft and consumes no materials.
session = service.create(data, pool);
mode = session.mode;
mode.collectPicks = () => [{ ...mode.materials(session.win.game).find(row => row.itemKey === '刀'), 份数: 1 },
  { ...mode.materials(session.win.game).find(row => row.itemKey === '特性'), 份数: 1 }];
raw = '<裁定>\n1|通过|9|有效\n2|通过|8|途径库缺失\n</裁定>';
await assert.rejects(session.action('craft'), /缺少/);
assert.equal(JSON.stringify(session.data), before);
const installedPick = { listKey: '其他列表', itemKey: '安装模块', 份数: 1 };
assert.throws(() => mode.consume(session.win.game, installedPick), /强化模块/);
assert.throws(() => mode.consume(session.win.game, { listKey: '消耗品列表', itemKey: '特性', 份数: 4 }), /数量/);
raw = 'malformed';
await session.action('craft');
assert.equal(JSON.stringify(session.data), before);
raw = '<裁定>\n1|通过|9|有效\n</裁定>';
mode.collectPicks = () => [{ ...mode.materials(session.win.game).find(row => row.itemKey === '特性'), 份数: 2 }];
await session.action('craft');
assert.equal(mode.clones(session.win.game).length, 2);
assert.equal(session.data.stat_data.消耗品列表.特性.数量, 1);
mode.collectPicks = () => [{ ...mode.materials(session.win.game).find(row => row.itemKey === '特性'), 份数: 2 }];
const fullBefore = JSON.stringify(session.data);
await session.action('craft');
assert.equal(JSON.stringify(session.data), fullBefore);
// NPC certification is marker-only, then snapshots preserve complete records.
session = service.create(data, pool, { confirm: async () => true });
mode = session.mode; mode.collectCandidatePicks = () => mode.candidates(session.win.game);
raw = '<裁定>\n1|通过|亲手寄生且仍有效\n</裁定>';
await session.action('certify');
assert.deepEqual(plain(session.data.npc_data.甲), { ...card, $寄生分身: true });
await session.action('revert', '甲');
assert.equal(mode.recordOfState(session.data, '甲').$id, 'legacy');
assert.equal(mode.recordOfState(session.data, '甲').id, undefined);
assert.deepEqual(plain(mode.recordOfState(session.data, '甲').$入册快照.主观), data.stat_data.人物关系列表.甲);
assert.deepEqual(plain(session.data.cryptLord.teamComposition.allyTeam), [{ name: '甲', dataSource: 'puppet' }]);
session.win.game.showPromptModal = async () => '改名甲';
await session.action('rename', '甲');
await session.action('do-promote', '改名甲');
assert.equal(session.data.npc_data.改名甲.$寄生分身, true);
assert.equal(session.data.npc_data.改名甲.名称, '改名甲');
assert.deepEqual(plain(session.data.npc_data.改名甲.关键记忆), card.关键记忆);
assert.equal(session.effects.length, 0);
await session.action('unmark', '改名甲');
assert.equal(session.data.npc_data.改名甲.$寄生分身, undefined);
assert.deepEqual(plain(session.data.npc_data.改名甲.事件历史), card.事件历史);
// Material vs parasite promotion and all narrative choices, once per clone.
for (const choice of ['create', 'custom', 'skip']) {
  let choices = 0;
  session = service.create(data, pool, { confirm: async () => true,
    chooseNarrative: async () => { choices++; return choice; },
    promptNarrativeText: async () => '在廷根广场登场' });
  mode = session.mode;
  mode.bag(session.win.game, true).乙 = mode.buildRecord('乙', '序列9-偷盗者', '特性');
  await session.action('do-promote', '乙');
  assert.equal(session.data.npc_data.乙.$分身转化, true);
  assert.equal(session.data.npc_data.乙.性格, '有独立意识，服从玩家。');
  assert.equal(session.data.npc_data.乙.外貌, '与玩家的外貌完全相同');
  assert.equal(session.effects.length, choice === 'skip' ? 0 : 1);
  if (choice === 'custom') assert.match(session.effects[0].text, /在廷根广场登场/);
  await session.action('revert', '乙');
  await session.action('do-promote', '乙');
  assert.equal(choices, 1);
  await session.action('revert', '乙');
  await session.action('drop', '乙');
  assert.equal(mode.recordOfState(session.data, '乙'), null);
}
// Story certification includes mortal hosts and requires explicit pending add.
session = service.create(data, pool);
mode = session.mode;
const parsed = mode.parseStoryVerdicts('<裁定>\n通过|丙|普通人|亲手寄生\n</裁定>');
assert.equal(parsed.passed[0].seqString, '普通人');
assert.equal(session.data.stat_data.$专属玩法, undefined);
session.state.pending = parsed.passed;
mode.queryAll = () => [{ dataset: { cloRow: '0' }, querySelector(selector) {
  return { value: selector === '.clo-p-name' ? '丙' : '普通人' };
} }];
await session.action('story-add');
assert.equal(mode.recordOfState(session.data, '丙').当前序列, '普通人');
await session.action('do-promote', '丙');
assert.equal(session.data.npc_data.丙.$寄生分身, true);
assert.equal(session.data.npc_data.丙.外貌, '与被寄生之前的形貌相同，看不出异样');
assert.equal(session.effects.length, 0);
for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
  const locked = structuredClone(data); locked.cryptLord.teamBattle = battle;
  await assert.rejects(service.create(locked, pool).action('craft'), /战斗/);
}
settings = { useCustomApi: true, apiUrl: 'https://example.invalid/api', model: 'test-model', apiKey: 'test' };
await modules['cryptLord.marionetteState'].request('system', 'user', 'evidence');
assert.equal(request.custom_api.model, 'test-model');
settings = { useCustomApi: true };
await assert.rejects(modules['cryptLord.marionetteState'].request('system', 'user', ''), /缺少/);
assert.equal(JSON.stringify(data), before);
console.log('Clone: original parity, material atomicity, capacity, marker-only certification, full snapshots/lifecycle, mortal hosts, narrative choices and native API guards passed.');
