import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {}, requests = [];
let settings = { useCustomApi: false }, answer = '<裁定>通过</裁定><理由>已完成图腾仪式</理由>', hook;
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
  'battle-experience', 'personal-battle-state', 'battle-terrain-presets',
  'natural-environment', 'battlefield-painter', 'battle-formulas', 'battle-field-effects',
  'team-battle-state']) vm.runInContext(await readFile(
    new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const time = (day, minute = '00') => `第五纪1352年1月${day}日星期一12:${minute}`;
const pool = { pathways: { 萨满途径: ['序列9-萨满', '序列8-林语者', '序列5-绘梦者', '序列1-画界主宰'],
  观众途径: ['序列1-作家'], 占卜家途径: ['序列9-占卜家'] }, abilities: {} };
const card = sequence => ({ 当前序列: sequence, 活力: 100, 当前活力: 70,
  敏捷: 100, 当前敏捷: 80, 灵性: 100, 当前灵性: 80,
  理智: 100, 当前理智: 90, 人性: 100, 当前人性: 60, 运气: 100 });
const initial = { stat_data: { ...card('序列9-萨满'), 名称: '玩家',
  其他列表: { 主材: { 类型: '魔药主材料', 序列: '序列9', 数量: 3.5 },
    灵材: { 类型: '灵性材料', 序列: '序列9', 数量: 10 },
    低阶: { 类型: '灵性材料', 序列: '序列10', 数量: 10 } } },
  world_data: { 当前时间纪元: time(1) }, cryptLord: {},
  npc_data: { 敌人: { ...card('序列9-萨满'), 身份: '山林守护者',
    事件历史: { 一: '原始记录' }, 关键记忆: { 一: '固有记忆' } },
    同伴: card('序列8-林语者') } };
const service = modules['cryptLord.shamanTerritoryState'], battleService = modules['cryptLord.shamanTerritoryBattle'];
const ref = modules['cryptLord.shamanTerritoryReference'], plain = value => JSON.parse(JSON.stringify(value));
const record = data => data.stat_data.$专属玩法?.萨满途径?.设置领地图腾玩法;
let consent = true;
const options = { confirm: async () => consent, evidence: { history: '历史真实正文', recent: '近期真实正文', latest: '已经完成图腾仪式' } };
const session = service.create(initial, pool, options);
const certify = async (target = session, place = '河谷', materialQty = {}) => {
  Object.assign(target.state, { place, materialQty }); await target.action('shaman-certify');
};
// 1. Original object/prompt/calendar parity and pure reads, gates and projected qualifications.
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('const ShamanTerritoryCore =')), 99, true, ts.ScriptKind.JS);
const original = vm.runInNewContext(`${ast.statements.slice(0, 3).map(node => node.getText(ast)).join('\n')}
({core: ShamanTerritoryCore, mode: ShamanTerritoryMode, battle: ShamanTerritoryBattle})`, { window: {} });
assert.equal(session.mode.prompt('河谷'), original.mode.prompt('河谷'));
for (const rank of [-2, -1, 0, .5, 1, 5, 8, 9])
  assert.equal(session.core.radiusForRank(rank), original.core.radiusForRank(rank));
for (const distance of [0, .5, 1, 2.5, 5, 10, 100])
  assert.deepEqual(plain(ref.create({ pool }).battle.playerEffect(distance, .5)),
    plain(original.battle.playerEffect(distance, .5)));
assert.equal(ref.minutes(time(4)) - ref.minutes(time(1)), 4320);
assert.equal(ref.minutes('坏时间'), null);
assert.equal(service.gate({ stat_data: { 当前序列: '序列8-林语者' } }, pool).rank, 8);
assert.equal(service.gate({ stat_data: { 当前序列: '高维俯视者' } }, pool).unlocked, true);
const projected = { stat_data: { 当前序列: '序列1-作家', $专属玩法: {
  观众途径: { 空想玩法: { 空想栏位: { 栏位1: { 途径: '萨满途径' } } } },
} } };
assert.equal(service.gate(projected, pool).rank, 1);
session.render(); assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
// 2. Complete certification/change/radius lifecycle and shared API/evidence rules.
answer = '<裁定>不通过</裁定><理由>只有准备</理由>';
await certify(); assert.equal(record(session.data), undefined); assert.equal(session.state.result.ok, false);
answer = '格式错误'; await certify(); assert.equal(record(session.data), undefined);
answer = '<裁定>通过</裁定><理由>已完成仪式</理由>';
await certify(); assert.equal(record(session.data).领地半径公里, .5);
assert.equal(session.data.stat_data.其他列表.主材.数量, 3.5);
assert.equal(requests[0].custom_api, undefined);
assert.deepEqual(plain(requests[0].ordered_prompts.slice(0, 2)), ['world_info_before', 'world_info_after']);
assert.match(requests[0].ordered_prompts.at(-1).content, /历史真实正文[\s\S]*近期真实正文[\s\S]*已经完成图腾仪式/);
assert.match(requests[0].ordered_prompts.at(-1).content, /玩家资料/);
let count = requests.length;
await certify(session, '山顶', { 主材: 1 }); assert.equal(requests.length, count);
session.data.world_data.当前时间纪元 = time(4);
consent = false; await certify(session, '山顶', { 主材: 1 }); assert.equal(requests.length, count);
consent = true;
await assert.rejects(() => certify(session, '山顶', { 低阶: 5 }), /材料/);
settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'local', model: 'judge' };
await certify(session, '山顶', { 主材: 1 });
assert.equal(requests.at(-1).custom_api.model, 'judge');
assert.equal(record(session.data).图腾位置, '山顶');
assert.equal(session.data.stat_data.其他列表.主材.数量, 2.5);
session.data.stat_data.当前序列 = '序列5-绘梦者';
const previous = JSON.stringify(session.data); session.render();
assert.equal(JSON.stringify(session.data), previous);
await session.action('shaman-sync-radius');
assert.equal(record(session.data).领地半径公里, 10);
assert.equal(service.sync(session.data, pool), false);
session.data.stat_data.当前序列 = '序列9-萨满'; service.sync(session.data, pool);
assert.equal(record(session.data).领地半径公里, 10);
assert.equal(record(initial), undefined); assert.deepEqual(session.data.npc_data, initial.npc_data);
// 3. Missing/invalid APIs, material drift, malformed state, battle locks and history conflict rollback.
settings = { useCustomApi: true, apiUrl: '', model: '' };
const failed = service.create(initial, pool, options);
await assert.rejects(() => certify(failed), /独立 API/);
assert.equal(JSON.stringify(failed.data), JSON.stringify(initial));
settings = { useCustomApi: false };
for (const change of [
  data => { data.stat_data.$专属玩法 = []; },
  data => { data.stat_data.$专属玩法 = { 萨满途径: { 设置领地图腾玩法: { 版本: 2 } } }; },
  data => { data.cryptLord.teamBattle = { status: 'active' }; },
  data => { data.cryptLord.teamBattle = { status: 'finished' }; },
]) {
  const data = structuredClone(initial); change(data);
  const locked = service.create(data, pool, options), before = JSON.stringify(locked.data);
  await assert.rejects(() => certify(locked));
  assert.equal(JSON.stringify(locked.data), before);
}
const driftData = structuredClone(session.data); driftData.world_data.当前时间纪元 = time(7);
const drift = service.create(driftData, pool, options);
hook = () => { drift.data.stat_data.其他列表.主材.数量 = 0; };
await certify(drift, '高塔', { 主材: 1 }); hook = null;
assert.equal(record(drift.data).图腾位置, '山顶');
assert.equal(drift.state.result.ok, false);
let history = [{ 序号: 0, 正文: '已完成仪式' }];
const evidence = service.create(initial, pool, { ...options,
  evidenceList: async () => history, freshEvidenceList: async () => history });
hook = () => { history = [{ 序号: 0, 正文: '修改后的历史' }]; };
await assert.rejects(() => certify(evidence), /历史楼层已变化/); hook = null;
assert.equal(JSON.stringify(evidence.data), JSON.stringify(initial));
// 4. Shared battlefield request, strict case parsing, all six battle stats, neutral fallback and settlement.
const engine = modules['cryptLord.teamBattleState'], painter = modules['cryptLord.battlefieldPainter'];
const setup = () => engine.start(session.data, { allies: ['同伴'], enemies: ['敌人'],
  pathways: pool.pathways, summonPool: pool, seed: 911, opening: {
    玩家领地判定: [{ 编号: 'P1', 距图腾公里: 0, 理由: '领地内' }],
    NPC领地判定: [{ 编号: 'N1', 是否长期据点: false }, { 编号: 'N2', 是否长期据点: true }],
  } });
const preflight = engine.start(session.data, { allies: ['同伴'], enemies: ['敌人'], pathways: pool.pathways, summonPool: pool });
const preflightBefore = JSON.stringify(preflight.data);
const section = battleService.section(preflight.data, preflight.battle, pool);
assert.match(section, /P1[\s\S]*N1[\s\S]*N2/);
assert.match(section, /最近关键记忆/);
assert.equal(JSON.stringify(preflight.data), preflightBefore);
assert.match(painter.prompt(12, 10, '正文', [], [], [], section).system, /玩家领地判定/);
const start = setup(); assert.equal(start.ok, true, start.error);
const b = start.data.cryptLord.teamBattle, player = b.units[0], ally = b.units.find(row => row.id === '同伴'), enemy = b.units.find(row => row.id === '敌人');
assert.equal(player.maxHp, 200); assert.equal(player.hp, 140);
assert.equal(player.maxSpirit, 200); assert.equal(player.spirit, 160);
assert.equal(player.maxAgility, 200); assert.equal(player.agility, 160);
assert.equal(player.maxLuck, 200);
assert.equal(ally.maxHp, 70); assert.equal(enemy.maxHp, 200);
assert.equal(player.effects.filter(row => row.territoryEffect).length, 6);
assert.equal(battleService.applyTeam(start.data, b, pool, {}), false);
const json = JSON.parse(JSON.stringify(start.data));
assert.equal(engine.get(json).units[0].maxHp, 200);
json.cryptLord.teamBattle.status = 'finished'; json.cryptLord.teamBattle.result = 'draw';
const settled = engine.settle(json, b.id, true);
assert.equal(settled.ok, true, settled.error);
assert.equal(settled.data.stat_data.当前活力, 70);
assert.equal(settled.data.npc_data.敌人.当前活力, 70);
assert.equal(settled.data.npc_data.同伴.当前活力, 70);
assert.equal(settled.data.stat_data.活力, 100);
assert.ok(preflight.battle.log.some(row => row.territory && /中性/.test(row.message)));
const cases = battleService.collect(session.data, preflight.battle, pool);
const parsed = ref.create({ pool }).battle.parse({ 玩家领地判定: [{ 编号: 'P1', 距图腾公里: '0' }],
  NPC领地判定: [{ 编号: 'N1', 是否长期据点: 'true' }] }, cases);
assert.equal(parsed.size, 0);
const personal = modules['cryptLord.personalBattleState'].start(session.data, { npcKey: '敌人', imaginationPool: pool });
const painted = painter.apply(personal.data, { 玩家领地判定: [{ 编号: 'P1', 距图腾公里: 0 }],
  NPC领地判定: [{ 编号: 'N1', 是否长期据点: false }] });
assert.equal(painted.ok, true); assert.equal(painted.battle.player.maxHp, 200);
assert.equal(painted.battle.enemy.maxHp, 70);
assert.equal(battleService.applyPersonal(painted.data, {}), false);
const retreated = modules['cryptLord.personalBattleState'].act(painted.data, { type: 'retreat' });
assert.equal(retreated.data.stat_data.当前活力, 70);
const beforeBattleRequest = requests.length;
answer = JSON.stringify({ 玩家领地判定: [{ 编号: 'P1', 距图腾公里: 0 }],
  NPC领地判定: [{ 编号: 'N1', 是否长期据点: false }] });
const generated = await painter.generate(personal.data, '河谷的真实战斗剧情', 2);
assert.equal(generated.ok, true, generated.error);
assert.equal(requests.length, beforeBattleRequest + 1);
assert.match(requests.at(-1).ordered_prompts.find(row => row.role === 'system').content, /萨满领地判定（附加任务）/);
assert.equal(requests.at(-1).custom_api, undefined);
assert.equal(generated.battle.player.maxHp, 200);
console.log('领地图腾：原版规则、完整认证/更换、失败保护、战场共享判定与结算，4组通过。');
