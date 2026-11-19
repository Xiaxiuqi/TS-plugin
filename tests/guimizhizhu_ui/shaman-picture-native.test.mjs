import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['audience-imagination', 'marionette-reference', 'marionette-state',
  'battle-field-effect-reference', 'scroll-crafting', 'scroll-workshop-reference',
  'shaman-territory', 'shaman-picture', 'shaman-picture-reference', 'shaman-picture-state',
  'battle-experience', 'personal-battle-state', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'battlefield-painter', 'grazing-state',
  'battle-formulas', 'battle-auras', 'battle-field-effects', 'battle-hard-control',
  'battle-temp-control', 'battle-permanent-control', 'battle-possession', 'battle-summon',
  'team-battle-state']) {
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
}
const pool = { pathways: {
  萨满途径: ['序列9-萨满', '序列6-画师', '序列5-绘梦者', '序列1-画界主宰', '序列0-画神'],
  占卜家途径: ['序列9-占卜家', '序列6-无面人', '序列5-秘偶大师', '序列1-诡秘侍者', '序列0-愚者'],
  观众途径: ['序列1-作家'],
}, abilities: {
  '占卜家途径-序列5': [{ name: '灵体之线', description: '完整能力', power: 3, range: 4 }],
  '占卜家途径-序列6': [{ name: '变形', power: 2 }],
} };
const initial = { stat_data: { 当前途径: '萨满', 当前序列: '序列5-绘梦者',
  活力: 100, 当前活力: 100, 灵性: 200, 当前灵性: 200, 敏捷: 40,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 运气: 20,
  其他列表: {
    主材: { 名称: '完整主材料', 类型: '魔药主材料', 序列: '序列5', 数量: 3.5 },
    灵材: { 名称: '完整灵性材料', 类型: '灵性材料', 序列: '序列5', 数量: 20 },
  } }, world_data: { 当前时间纪元: '第五纪1352年' },
  npc_data: { 老师: { 事件历史: { 一: '保留原始记录' } } }, cryptLord: {} };
const service = modules['cryptLord.shamanPictureState'];
const legacy = modules['cryptLord.shamanPicture'];
const plain = value => JSON.parse(JSON.stringify(value));
let consent = true, notices = [];
const session = service.create(initial, pool, { confirm: async () => consent, random: () => .25,
  notice: text => notices.push(text) });
const { mode, win, state } = session;
const craft = async (quantities = { 主材: 1 }, pathway = '占卜家途径') => {
  state.pathwayKey = pathway; state.materialQty = quantities;
  await session.action('picture-craft');
};
// 1. Independently run the original mode for gates, rounded ranks, material conversion and full cards.
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('const ShamanPictureMode =')), 99, true, ts.ScriptKind.JS);
const originalDraft = structuredClone(initial);
const db = { ...modules['cryptLord.battleFieldEffectReference'].summonDefaults(),
  abilitySystemDB: {}, godPathways: pool.pathways, sequenceAbilities: pool.abilities };
const math = Object.create(Math); math.random = () => .25;
const summon = modules['cryptLord.battleFieldEffectReference'].create({
  Math: math, GameDBManager: { DB: db }, parseSequenceRank: modules['cryptLord.marionetteReference'].rank,
}).summon;
const original = vm.runInNewContext(`${ast.statements[0].getText(ast)}\nShamanPictureMode`, {
  window: { MysteryPryerScrollMode: {} }, GameDBManager: { DB: db }, SummonManager: summon,
  parseSequenceRank: modules['cryptLord.marionetteReference'].rank,
});
original.gate = () => ({ unlocked: true, rank: 5 });
original.materials = () => mode.materials(win);
original.scope = () => null;
const originalWin = { ...win, game: { currentMvuState: originalDraft, showConfirmModal: async () => true },
  sd: () => originalDraft.stat_data, _modeState: {} };
Object.assign(original.state(originalWin), { pathwayKey: '占卜家途径', materialQty: { 主材: 1 } });
assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
session.render(); assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
assert.equal(service.gate(initial, pool).rank, 5);
assert.equal(service.gate({ stat_data: { 当前序列: '序列6-画师' } }, pool).unlocked, false);
assert.equal(service.gate({ stat_data: { 当前序列: '高维俯视者' } }, pool).unlocked, true);
const projected = { stat_data: { 当前序列: '序列1-作家',
  $专属玩法: { 观众途径: { 空想玩法: { 空想栏位: { 栏位1: { 途径: '萨满途径' } } } } } } };
assert.equal(service.gate(projected, pool).unlocked, true);
assert.equal(mode.materials(win).find(row => row.key === '主材').available, 3);
for (const rank of [-2, -1, 0, .5, 1, 4.5, 5]) {
  assert.deepEqual(plain(mode.pathwayChoices({ unlocked: true, rank })),
    plain(original.pathwayChoices({ unlocked: true, rank })));
}
await original.craft(originalWin); await craft();
const made = mode.recordsOfState(session.data)[0], originalMade = original.recordsOfState(originalDraft)[0];
assert.deepEqual(plain(made.data), plain(originalMade.data));
assert.equal(made.data.能力清单.length, 2);
assert.equal(made.data.能力清单.some(row => row.名称 === '灵体之线' && row.range === 4), true);
const fallback = service.create(initial, { ...pool, abilities: {} }, { confirm: async () => true });
Object.assign(fallback.state, { pathwayKey: '占卜家途径', materialQty: { 主材: 1 } });
await fallback.action('picture-craft');
assert.equal(fallback.mode.recordsOfState(fallback.data)[0].data.能力清单[0].$系统兜底攻击, true);
const tuned = service.create(initial, { ...pool, pictureConfig: { sequenceBase: { 5: 12345 } } },
  { confirm: async () => true, random: () => .25 });
Object.assign(tuned.state, { pathwayKey: '占卜家途径', materialQty: { 主材: 1 } });
await tuned.action('picture-craft');
assert.notEqual(tuned.mode.recordsOfState(tuned.data)[0].data.活力, made.data.活力);
// 2. Entire manufacturing/library lifecycle: cancellation, excess stock, unique identities and legacy reads.
assert.equal(made.name, '占卜家画中人');
assert.equal(session.data.stat_data.其他列表.主材.数量, 2.5);
assert.equal(session.data.stat_data.当前灵性, 200);
consent = false; const saved = JSON.stringify(session.data);
await craft(); assert.equal(JSON.stringify(session.data), saved);
consent = true; await craft({ 主材: 2 });
const rows = mode.recordsOfState(session.data);
assert.equal(rows.length, 2);
assert.equal(rows.some(row => row.name === '占卜家画中人·二'), true);
assert.equal(session.data.stat_data.其他列表.主材.数量, .5);
assert.equal(new Set(rows.map(row => row.id)).size, 2);
assert.deepEqual(plain(legacy.records(session.data).map(row => row.card)), plain(rows.map(row => row.data)));
assert.deepEqual(session.data.npc_data, initial.npc_data);
assert.equal(initial.stat_data.其他列表.主材.数量, 3.5);
const old = structuredClone(session.data), list = old.stat_data.$专属玩法.萨满途径.制造画中人玩法.画中人列表;
delete list[rows[0].id].ID;
const oldSession = service.create(old, pool);
oldSession.render(); assert.equal(JSON.stringify(oldSession.data), JSON.stringify(old));
// 3. Invalid selections, malformed stores, active/unsettled battles and synthesis failures roll back completely.
await assert.rejects(() => craft({ 灵材: Infinity }), /数量无效/);
await assert.rejects(() => craft({ 不存在: 1 }), /材料选择/);
await assert.rejects(() => craft({ 灵材: .5 }), /数量无效/);
for (const patch of [
  data => { data.stat_data.其他列表 = []; },
  data => { data.stat_data.$专属玩法 = []; },
  data => { data.stat_data.$专属玩法 = { 萨满途径: { 制造画中人玩法: { 版本: 2 } } }; },
  data => { data.cryptLord.teamBattle = { status: 'active' }; },
  data => { data.cryptLord.teamBattle = { status: 'finished', settled: false }; },
]) {
  const data = structuredClone(initial); patch(data);
  const test = service.create(data, pool, { confirm: async () => true });
  Object.assign(test.state, { pathwayKey: '占卜家途径', materialQty: { 主材: 1 } });
  const before = JSON.stringify(test.data);
  await assert.rejects(() => test.action('picture-craft'));
  assert.equal(JSON.stringify(test.data), before);
}
const broken = service.create(initial, { ...pool, pictureConfig: { sequenceBase: { 5: Infinity } } },
  { confirm: async () => true });
Object.assign(broken.state, { pathwayKey: '占卜家途径', materialQty: { 主材: 1 } });
await assert.rejects(() => broken.action('picture-craft'), /六维属性|制造失败/);
assert.equal(JSON.stringify(broken.data), JSON.stringify(initial));
// 4. Manufactured cards reach native battle, stay immobile, retreat preserves them and death removes by ID.
const battle = modules['cryptLord.personalBattleState'];
const startData = structuredClone(session.data);
delete startData.stat_data.当前途径;
const started = battle.start(startData, { enemyHp: 100000, enemyPower: 99999, imaginationPool: pool }).data;
const summoned = battle.summonPicture(started, made.id);
assert.equal(summoned.ok, true, summoned.error);
assert.equal(summoned.battle.picture.moveRemaining, 0);
assert.deepEqual(plain(summoned.battle.picture.card), plain(made.data));
assert.equal(summoned.battle.player.spirit, 135);
const retreated = battle.act(summoned.data, { type: 'retreat' });
assert.equal(legacy.records(retreated.data).length, 2);
const next = structuredClone(summoned.data);
next.cryptLord.personalBattle.enemy.x = next.cryptLord.personalBattle.picture.x + 1;
next.cryptLord.personalBattle.enemy.y = next.cryptLord.personalBattle.picture.y;
next.cryptLord.personalBattle.player.x = 0;
next.cryptLord.personalBattle.player.y = 0;
next.stat_data.序列能力列表 = { 测试: [{ 名称: '远程观测', range: 10 }] };
const lost = battle.act(next, { type: 'ability', group: '测试', index: 0 });
assert.equal(lost.ok, true, lost.error);
assert.equal(legacy.records(lost.data).some(row => row.id === made.id), false);
assert.equal(legacy.records(lost.data).length, 1);
const team = modules['cryptLord.teamBattleState'], manager = modules['cryptLord.battleSummon'];
const teamData = structuredClone(startData);
teamData.stat_data.灵性 = teamData.stat_data.当前灵性 = 10000;
teamData.npc_data.敌人 = { ...structuredClone(initial.stat_data), 当前序列: '序列9-占卜家',
  活力: 10000, 当前活力: 10000 };
const teamStarted = team.start(teamData, {
  enemies: ['敌人'], seed: 911, pathways: pool.pathways, summonPool: pool,
});
assert.equal(teamStarted.ok, true, teamStarted.error);
teamStarted.data.cryptLord.teamBattle.phase = 'tactic';
const check = team.summonPreview(teamStarted.data, { subtype: '召唤画中人', target: made.id });
assert.equal(check.ok, true, check.reason);
assert.equal(check.cost, 65);
const teamSummoned = team.summon(teamStarted.data, { subtype: '召唤画中人', target: made.id }, () => .99);
assert.equal(teamSummoned.ok, true, teamSummoned.error);
const tb = teamSummoned.data.cryptLord.teamBattle, unit = tb.units.find(row => row.picturePersonId === made.id);
assert.equal(unit.maxHp, made.data.活力);
assert.equal(unit.picturePersonImmobile, true);
tb.phase = 'action'; tb.queue = [unit.id]; tb.index = 0;
assert.equal(team.reachable(teamSummoned.data).length, 0);
unit.hp = 0; manager.sweep(tb);
assert.equal(tb.picturePersonLosses[0].id, made.id);
assert.equal(legacy.records(teamSummoned.data).length, 2);
tb.status = 'finished'; tb.result = 'victory'; manager.finish(tb);
const settled = team.settle(teamSummoned.data, tb.id, true);
assert.equal(settled.ok, true, settled.error);
assert.equal(legacy.records(settled.data).some(row => row.id === made.id), false);
assert.equal(legacy.records(settled.data).length, 1);
const discarded = team.settle(teamSummoned.data, tb.id, false);
assert.equal(discarded.ok, true, discarded.error);
assert.equal(legacy.records(discarded.data).length, 2);
console.log('画中人：原版规则对照、完整制造生命周期、回滚与战斗接入，4组通过。');
