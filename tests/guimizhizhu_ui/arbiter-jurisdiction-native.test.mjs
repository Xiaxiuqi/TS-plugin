import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {}, requests = [];
let settings = { useCustomApi: false }, answer = '<裁定>通过</裁定><理由>已有明确证据</理由>', hook;
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
modules['cryptLord.variableSettlementApi'] = { readSettings: async () => settings };
modules['cryptLord.hostApi'] = { async generateRaw(config) {
  requests.push(config); await hook?.(); return answer;
} };
for (const name of ['audience-imagination', 'marionette-reference', 'marionette-state',
  'battle-field-effect-reference', 'scroll-crafting', 'scroll-workshop-reference',
  'shaman-territory', 'shaman-territory-reference', 'shaman-territory-state', 'shaman-territory-battle',
  'arbiter-jurisdiction', 'arbiter-jurisdiction-reference', 'arbiter-jurisdiction-state', 'arbiter-jurisdiction-battle',
  'battle-experience', 'personal-battle-state', 'battle-terrain-presets', 'natural-environment',
  'battlefield-painter', 'battle-formulas', 'battle-field-effects', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const time = day => `第五纪1352年1月${day}日星期一12:00`;
const pool = { pathways: { 仲裁人途径: ['序列9-仲裁人', '序列8-治安官', '序列6-法官', '序列1-秩序之手'],
  观众途径: ['序列1-作家'], 萨满途径: ['序列9-萨满'] }, abilities: {} };
const card = sequence => ({ 当前序列: sequence, 活力: 100, 当前活力: 80,
  敏捷: 100, 当前敏捷: 80, 灵性: 100, 当前灵性: 80,
  理智: 100, 当前理智: 80, 人性: 100, 当前人性: 80, 运气: 100 });
const initial = { stat_data: { ...card('序列6-法官'), 名称: '玩家' },
  world_data: { 当前时间纪元: time(1) }, cryptLord: {},
  npc_data: { 敌人: { ...card('序列8-治安官'), 身份: '正式任命的守卫',
    事件历史: { 一: '原记录' }, 关键记忆: { 一: '旧记忆' } } } };
const service = modules['cryptLord.arbiterJurisdictionState'], battleService = modules['cryptLord.arbiterJurisdictionBattle'];
const ref = modules['cryptLord.arbiterJurisdictionReference'], plain = value => JSON.parse(JSON.stringify(value));
const record = data => data.stat_data.$专属玩法?.仲裁人途径?.设定辖区玩法;
let consent = true;
const options = { confirm: async () => consent,
  evidence: { history: '历史真实正文', recent: '近期真实正文', latest: '已经实际指定辖区' } };
const session = service.create(initial, pool, options);
const base = async (target = session, name = '东区') => {
  Object.assign(target.state, { baseName: name, baseBoundary: `${name}边界内` });
  await target.action('arbiter-base-certify');
};
const appoint = async (target = session) => {
  Object.assign(target.state, { issuer: '市政厅', position: '治安官', appointmentNote: '正式授任',
    regions: [{ name: '东区', boundary: '东区边界内' }, { name: '西区', boundary: '西区边界内' }] });
  await target.action('arbiter-appointment-certify');
};
// 1. Complete original prompts/rules and read-only rendering, including effective pathway projections.
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('const ArbiterJurisdictionCore =')), 99, true, ts.ScriptKind.JS);
const original = vm.runInNewContext(`${ast.statements.slice(0, 3).map(node => node.getText(ast)).join('\n')}
({core: ArbiterJurisdictionCore, mode: ArbiterJurisdictionMode, battle: ArbiterJurisdictionBattle})`, { window: {} });
assert.equal(session.mode.basePrompt('东区', '边界', '区'), original.mode.basePrompt('东区', '边界', '区'));
for (const rank of [-2, -1, 0, .5, 1, 6, 8, 9])
  assert.equal(session.core.scopeForRank(rank), original.core.scopeForRank(rank));
assert.equal(service.gate(initial, pool).rank, 6);
assert.equal(service.gate({ stat_data: card('序列9-仲裁人') }, pool).unlocked, false);
assert.equal(service.gate({ stat_data: card('失序者') }, pool).rank, -1);
assert.equal(service.gate({ stat_data: { 当前序列: '序列1-作家', $专属玩法: {
  观众途径: { 空想玩法: { 空想栏位: { 栏位1: { 途径: '仲裁人途径' } } } } } } }, pool).rank, 1);
session.render(); assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
// 2. First setting, appointment, rejection/malformed distinction, clearing and ten-day familiarity.
answer = '<裁定>不通过</裁定><理由>仅有计划</理由>'; await base();
assert.equal(record(session.data), undefined);
answer = '格式错误'; await base(); assert.equal(record(session.data), undefined);
answer = '<裁定>通过</裁定><理由>指定完成</理由>'; await base();
assert.equal(record(session.data).基础辖区.范围档, '区');
assert.equal(record(session.data).熟悉起算时间, '');
assert.equal(session.core.familiarity(session.data, record(session.data)).ready, true);
answer = '<裁定>通过</裁定><覆盖基础辖区>是</覆盖基础辖区><理由>任命覆盖</理由>';
await appoint(); assert.equal(record(session.data).官方任命.行政区列表.length, 2);
assert.equal(session.core.appointmentAllowed(record(session.data), '序列6-法官'), true);
const appointed = structuredClone(session.data);
answer = '格式错误'; await appoint(); assert.deepEqual(plain(session.data), plain(appointed));
answer = '<裁定>通过</裁定><覆盖基础辖区>否</覆盖基础辖区><理由>未覆盖</理由>';
await appoint(); assert.equal(record(session.data).官方任命, null);
answer = '<裁定>通过</裁定><覆盖基础辖区>是</覆盖基础辖区><理由>任命覆盖</理由>';
await appoint(); consent = false; await session.action('arbiter-appointment-clear');
assert.ok(record(session.data).官方任命);
consent = true; await session.action('arbiter-appointment-clear'); assert.equal(record(session.data).官方任命, null);
await appoint();
session.data.world_data.当前时间纪元 = time(2);
answer = '<裁定>通过</裁定><理由>新指定完成</理由>'; await base(session, '新区');
assert.equal(record(session.data).官方任命, null);
assert.equal(record(session.data).熟悉起算时间, time(2));
session.data.world_data.当前时间纪元 = time(11);
assert.equal(session.core.familiarity(session.data, record(session.data)).remaining, 1440);
session.data.world_data.当前时间纪元 = time(12);
assert.equal(session.core.familiarity(session.data, record(session.data)).ready, true);
assert.equal(session.core.baseAllowed(record(session.data), '序列8-治安官'), false);
// 3. Shared API fallback/configuration, evidence drift, version/battle guards and region limits.
assert.equal(requests[0].custom_api, undefined);
assert.deepEqual(plain(requests[0].ordered_prompts.slice(0, 2)), ['world_info_before', 'world_info_after']);
assert.match(requests[0].ordered_prompts.at(-1).content, /历史真实正文[\s\S]*近期真实正文[\s\S]*已经实际指定辖区[\s\S]*玩家资料/);
settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'local', model: 'judge' };
await base(); assert.equal(requests.at(-1).custom_api.model, 'judge');
settings = { useCustomApi: true };
const before = JSON.stringify(session.data);
await assert.rejects(() => base(), /URL/); assert.equal(JSON.stringify(session.data), before);
settings = { useCustomApi: false };
let evidence = [{ 序号: 0, 正文: '原证据' }];
const stale = service.create(initial, pool, { ...options,
  evidenceList: async () => evidence, freshEvidenceList: async () => evidence });
hook = () => { evidence = [{ 序号: 0, 正文: '变更证据' }]; };
await assert.rejects(() => base(stale), /历史楼层已变化/);
assert.deepEqual(stale.data, initial); hook = null;
const invalid = structuredClone(session.data); record(invalid).版本 = 2;
await assert.rejects(() => service.create(invalid, pool).action('arbiter-base-certify'), /版本/);
const active = structuredClone(session.data); active.cryptLord.teamBattle = { status: 'active' };
await assert.rejects(() => service.create(active, pool).action('arbiter-base-certify'), /战斗/);
const regions = service.create(initial, pool);
for (let i = 0; i < 8; i++) await regions.action('arbiter-region-add');
assert.equal(regions.state.regions.length, 5);
await assert.rejects(() => regions.action('arbiter-region-remove', '-1'), /编号/);
await regions.action('arbiter-region-remove', '4'); assert.equal(regions.state.regions.length, 4);
// 4. One battlefield request, exact original case IDs and six stats, idempotence and native settlement.
const engine = modules['cryptLord.teamBattleState'], painter = modules['cryptLord.battlefieldPainter'];
const start = engine.start(appointed, { enemies: ['敌人'], pathways: pool.pathways, summonPool: pool,
  opening: { 仲裁人辖区判定: [{ 编号: 'J1', 归属: '正式任命辖区' }, { 编号: 'J2', 归属: '基础辖区' }] } });
assert.equal(start.ok, true, start.error);
const battle = start.battle, player = battle.units[0], enemy = battle.units.find(row => row.id === '敌人');
assert.equal(player.maxHp, 150); assert.equal(player.hp, 120); assert.equal(player.maxAgility, 150);
assert.equal(player.maxLuck, 150); assert.equal(enemy.maxHp, 125);
assert.equal(player.effects.filter(row => row.jurisdictionEffect).length, 6);
assert.equal(battleService.applyTeam(start.data, battle, pool, {}), false);
const readBefore = JSON.stringify(start.data);
assert.match(battleService.section(appointed, battle, pool), /仲裁人辖区判定[\s\S]*J1[\s\S]*J2/);
assert.equal(JSON.stringify(start.data), readBefore);
const json = structuredClone(start.data); json.cryptLord.teamBattle.status = 'finished'; json.cryptLord.teamBattle.result = 'draw';
const settled = engine.settle(json, battle.id, true);
assert.equal(settled.ok, true, settled.error);
assert.equal(settled.data.stat_data.当前活力, 80); assert.equal(settled.data.stat_data.活力, 100);
assert.equal(settled.data.npc_data.敌人.当前活力, 80);
const missing = engine.start(appointed, { enemies: ['敌人'], pathways: pool.pathways, summonPool: pool });
assert.equal(missing.battle.units[0].maxHp, 100);
const cooling = structuredClone(appointed); record(cooling).熟悉起算时间 = time(1);
const coolingBattle = engine.start(cooling, { enemies: ['敌人'], pathways: pool.pathways, summonPool: pool,
  opening: { 仲裁人辖区判定: [{ 编号: 'J1', 归属: '基础辖区' }] } });
assert.equal(coolingBattle.battle.units[0].maxHp, 100);
assert.ok(coolingBattle.battle.log.some(row => row.jurisdiction && /熟悉/.test(row.message)));
const invalidPlan = engine.start(appointed, { enemies: ['敌人'], pathways: pool.pathways, summonPool: pool,
  opening: { 仲裁人辖区判定: [{ 编号: '未知', 归属: '正式任命辖区' }, { 编号: 'J1', 归属: '造假归属' }] } });
assert.equal(invalidPlan.battle.units[0].maxHp, 100);
const lostModule = modules['cryptLord.arbiterJurisdictionBattle'];
delete modules['cryptLord.arbiterJurisdictionBattle'];
assert.equal(engine.settle(json, battle.id, true).ok, false);
modules['cryptLord.arbiterJurisdictionBattle'] = lostModule;
const dual = structuredClone(appointed); dual.stat_data.当前序列 = '序列6-法官/序列9-萨满';
dual.stat_data.$专属玩法.萨满途径 = { 设置领地图腾玩法: {
  版本: 1, 图腾位置: '东区', 领地半径公里: .5, 上次设置时间: time(1) } };
const combined = engine.start(dual, { enemies: ['敌人'], pathways: pool.pathways, summonPool: pool,
  opening: { 玩家领地判定: [{ 编号: 'P1', 距图腾公里: 0 }],
    仲裁人辖区判定: [{ 编号: 'J1', 归属: '正式任命辖区' }, { 编号: 'J2', 归属: '辖区外' }] } });
assert.equal(combined.battle.units[0].maxHp, 250);
assert.equal(combined.battle.units[0].hp, 200);
combined.data.cryptLord.teamBattle.status = 'finished'; combined.data.cryptLord.teamBattle.result = 'draw';
const combinedSettled = engine.settle(combined.data, combined.battle.id, true);
assert.equal(combinedSettled.ok, true, combinedSettled.error);
assert.equal(combinedSettled.data.stat_data.当前活力, 80);
const personal = modules['cryptLord.personalBattleState'].start(appointed, { npcKey: '敌人', imaginationPool: pool });
const count = requests.length;
answer = JSON.stringify({ 仲裁人辖区判定: [{ 编号: 'J1', 归属: '正式任命辖区' }, { 编号: 'J2', 归属: '基础辖区' }] });
const generated = await painter.generate(personal.data, '东区战斗正文', 2);
assert.equal(generated.ok, true, generated.error);
assert.equal(requests.length, count + 1);
assert.match(requests.at(-1).ordered_prompts.find(row => row.role === 'system').content, /仲裁人辖区判定（附加任务）/);
assert.equal(generated.battle.player.maxHp, 150); assert.equal(generated.battle.enemy.maxHp, 125);
assert.equal(battleService.applyPersonal(generated.data, {}), false);
const retreated = modules['cryptLord.personalBattleState'].act(generated.data, { type: 'retreat' });
assert.equal(retreated.data.stat_data.当前活力, 80);
console.log('仲裁人辖区：原版规则、完整管理生命周期、API/证据保护、共享战场判定与结算，4组通过。');
