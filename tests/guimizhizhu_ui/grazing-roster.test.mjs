import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {}, requests = [];
let response = '<裁定>\n通过|玩家亲手收纳灵魂且仍持有\n</裁定>', settings = { useCustomApi: false };
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const file of ['audience-imagination', 'marionette-reference', 'marionette-state',
  'grazing-reference', 'grazing-roster-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${file}.js`, import.meta.url), 'utf8'), context);
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { requests.push(config); return response; } };
const pool = {
  pathways: { 秘祈人途径: ['序列9-秘祈人', '序列5-牧羊人', '序列3-三首圣堂', '序列0-倒吊人'],
    占卜家途径: ['序列9-占卜家', '序列5-秘偶大师'],
    观众途径: ['序列1-作家'] },
  abilities: { '占卜家途径-序列9': [{ name: '占卜', power: 10 }],
    '占卜家途径-序列5': [{ name: '灵体之线', power: 100 }] },
};
const npc = name => ({ 名称: name, 当前序列: '序列5-秘偶大师', 身份: '非凡者',
  活力: 100, 敏捷: 90, 灵性: 80, 理智: 70, 人性: 60, 运气: 50,
  当前活力: 0, 性格: '谨慎', 关键记忆: { 往事: '保留NPC记录' }, 自定义字段: { 事件: [1, 2] } });
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列5-牧羊人', 活力: 200, 灵性: 300,
  人物关系列表: { 甲: { 关系: '敌人', 好感度: -50 }, 乙: { 关系: '敌人', 好感度: -20 } } },
  npc_data: { 甲: npc('甲'), 乙: npc('乙') }, cryptLord: {} };
const service = modules['cryptLord.grazingRosterState'];
const options = { confirmSync: () => true, evidence: { history: '#0 已放牧甲', recent: '', latest: '#2 仍持有灵魂' } };
const session = service.create(initial, pool, options), { core, mode, win, state } = session;
const plain = value => JSON.parse(JSON.stringify(value));
const before = JSON.stringify(initial);
assert.equal(service.gate(initial, pool).unlocked, true);
assert.equal(core.resolveOwnerSequence('上帝').rank, -2);
assert.equal(core.strongestRank('序列0.5-倒吊人/序列5-牧羊人'), .5);
assert.equal(core.strongestRank('普通人'), 10);
assert.equal(core.strongestRank('无效'), null);
const originalText = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37f-js-pathway-cores.txt', import.meta.url), 'utf8');
function original(name, methods) {
  const ast = ts.createSourceFile('original.js', originalText.slice(originalText.indexOf(`const ${name} =`)), 99, true, ts.ScriptKind.JS);
  return vm.runInNewContext(`({ ${ast.statements[0].declarationList.declarations[0].initializer.properties
    .filter(node => methods.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join(',\n')} })`);
}
const originalCore = original('GrazingCore', ['capacityOf', 'activeCapOf', 'saveActiveNames']);
const originalMode = original('GrazingMode', ['prompt', 'parseVerdict']);
for (const rank of [-2, -1, 0, .5, 1, 2, 3, 4, 5, 6]) {
  assert.equal(core.capacityOf(rank), originalCore.capacityOf(rank));
  assert.equal(core.activeCapOf(rank), originalCore.activeCapOf(rank));
}
const candidate = mode.candidates(win)[0];
assert.equal(mode.prompt(win, candidate), originalMode.prompt(win, candidate));
for (const raw of [response, '<裁定>不通过|仅击败</裁定>', 'invalid', '<裁定>通过|理由|多段</裁定>'])
  assert.deepEqual(plain(mode.parseVerdict(raw)), plain(originalMode.parseVerdict(raw)));
mode.selectedCandidate = () => mode.candidates(win).find(row => row.name === '甲');
await session.action('certify');
assert.equal(state.result.ok, true);
assert.deepEqual(plain(core.soulsOfState(session.data).甲),
  { ...plain(initial.npc_data.甲), $放牧来源: '人物认证', $放牧时间: core.soulsOfState(session.data).甲.$放牧时间 });
assert.equal(requests[0].custom_api, undefined);
assert.match(requests[0].ordered_prompts.at(-1).content, /<历史事件>[\s\S]*#0/);
mode.selectedCandidate = () => mode.candidates(win).find(row => row.name === '乙');
settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', apiKey: '', model: 'test' };
await session.action('certify');
assert.equal(requests[1].custom_api.model, 'test');
mode.activeFromDom = () => ['甲', '乙'];
await session.action('save-active');
assert.deepEqual(plain(core.storedActiveNames(session.data)), ['甲']);
assert.deepEqual(plain(core.storedDormantNames(session.data)), ['乙']);
assert.equal(session.data.stat_data.当前序列, initial.stat_data.当前序列);
assert.equal(session.data.stat_data.灵性, initial.stat_data.灵性);
assert.ok(session.data.stat_data.序列能力列表['#放牧:甲:序列9-占卜家']);
session.data.stat_data.当前序列 = '序列3-三首圣堂';
await session.action('save-active');
assert.deepEqual(plain(core.storedActiveNames(session.data)), ['甲', '乙']);
assert.deepEqual(plain(core.storedDormantNames(session.data)), []);
mode.activeFromDom = () => ['乙'];
await session.action('save-active');
assert.deepEqual(plain(core.storedActiveNames(session.data)), ['乙']);
assert.equal(Object.keys(session.data.stat_data.序列能力列表).some(key => key.startsWith('#放牧:甲:')), false);
await session.action('release', '乙');
assert.equal(core.soulsOfState(session.data).乙, undefined);
assert.deepEqual(plain(session.data.stat_data.$专属玩法.秘祈人途径.放牧玩法.激活灵魂), []);
assert.deepEqual(plain(session.data.stat_data.$专属玩法.秘祈人途径.放牧玩法.休眠灵魂), []);
assert.equal(Object.keys(session.data.stat_data.序列能力列表).some(key => key.startsWith('#放牧:')), false);
assert.deepEqual(plain(session.data.npc_data), initial.npc_data);
assert.deepEqual(plain(session.data.stat_data.人物关系列表), initial.stat_data.人物关系列表);
assert.equal(JSON.stringify(initial), before);
for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
  const data = structuredClone(initial); data.cryptLord.teamBattle = battle;
  await assert.rejects(service.create(data, pool, options).action('save-active'), /战斗/);
}
const invalid = structuredClone(session.data);
invalid.stat_data.$专属玩法.秘祈人途径.放牧玩法.版本 = 99;
await assert.rejects(service.create(invalid, pool, options).action('release', '甲'), /版本/);
assert.equal(core.saveActiveNames(session.data, ['__proto__']).ok, false);
assert.equal(core.saveActiveNames(session.data, ['甲', '甲']).ok, false);
const rejected = service.create(initial, pool, options);
rejected.mode.selectedCandidate = () => rejected.mode.candidates(rejected.win)[0];
response = '<裁定>不通过|只是击败未亲手放牧</裁定>';
await rejected.action('certify');
assert.equal(JSON.stringify(rejected.data), before);
response = 'invalid';
await rejected.action('certify');
assert.equal(rejected.state.result, null);
assert.equal(JSON.stringify(rejected.data), before);
const projected = structuredClone(initial);
projected.stat_data.当前序列 = '序列1-作家';
projected.stat_data.$专属玩法 = { 观众途径: { 空想玩法: { 空想栏位: { 栏位1: { 途径: '秘祈人途径' } } } } };
pool.pathways.秘祈人途径.push('序列1-暗天使');
assert.equal(service.gate(projected, pool).unlocked, true);
const legacy = structuredClone(session.data);
delete legacy.stat_data.$专属玩法.秘祈人途径.放牧玩法.激活灵魂;
delete legacy.stat_data.$专属玩法.秘祈人途径.放牧玩法.休眠灵魂;
const legacyBefore = JSON.stringify(legacy);
const legacySession = service.create(legacy, pool, options);
assert.equal(legacySession.core.recordsOfState(legacySession.data).length, 1);
assert.equal(JSON.stringify(legacySession.data), legacyBefore);
assert.equal(JSON.stringify(legacy), legacyBefore);
await legacySession.action('release', '甲');
assert.deepEqual(plain(legacySession.data.stat_data.$专属玩法.秘祈人途径.放牧玩法.灵魂列表), {});
const locked = service.create(session.data, pool, { ...options, locked: true });
locked.mode.activeFromDom = () => ['甲'];
await locked.action('save-active');
assert.equal(locked.data.stat_data.序列能力列表['#放牧:甲:序列9-占卜家'], undefined);
assert.ok(locked.data.stat_data.序列能力列表['#放牧:甲:序列5-秘偶大师']);
const atomic = service.create(initial, pool, options);
atomic.mode.selectedCandidate = () => atomic.mode.candidates(atomic.win)[0];
response = '<裁定>通过|仍持有</裁定>';
modules['cryptLord.readerMystic'] = { sync() { throw Error('模拟能力同步失败'); } };
await assert.rejects(atomic.action('certify'), /模拟能力同步失败/);
assert.equal(JSON.stringify(atomic.data), before);
delete modules['cryptLord.readerMystic'];
console.log('Grazing roster: original parity, certification, complete snapshots, active/dormant lifecycle, projection cleanup and native guards passed.');
