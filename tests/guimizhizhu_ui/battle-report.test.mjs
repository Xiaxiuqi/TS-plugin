import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'personal-battle-state', 'battle-terrain-presets', 'battle-formulas',
  'battle-conditional-params', 'battle-field-effect-reference', 'battle-report',
  'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], report = modules['cryptLord.battleReport'];
const bOf = data => data.cryptLord.teamBattle;
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/30b-js-battle-team-effects-config.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(original.slice(original.indexOf('class BattleReporter {'),
  original.indexOf("console.log('[战斗系统] BattleReporter 已加载');")).trim().replace(/[ \t]+$/gm, '')));
const card = { 名称: '玩家', 当前序列: '序列9-猎人',
  活力: 1000, 当前活力: 1000, 灵性: 1000, 当前灵性: 1000,
  敏捷: 100, 当前敏捷: 100, 理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100,
  序列能力列表: { 能力: [{ 名称: '终结', power: 10000, range: 'global', 灵性消耗: 2 }] },
  消耗品列表: { 药: { 名称: '灵性药', 数量: 1, 序列: '序列8',
    战斗效果: { 基础效果: '灵性恢复', 范围: '单体' } } } };
function start() {
  const out = engine.start({ stat_data: structuredClone(card), npc_data: {
    '敌[甲]': { ...structuredClone(card), 名称: '敌[甲]', 当前序列: '序列9-猎人',
      活力: 100, 当前活力: 100, 敏捷: 20, 当前敏捷: 20 },
  } }, { enemies: ['敌[甲]'], seed: 81 });
  assert.equal(out.ok, true, out.error);
  const data = out.data;
  Object.assign(bOf(data), { queue: ['player', '敌[甲]'], index: 0, turnSlots: [] });
  return data;
}
let data = start(), battle = bOf(data);
assert.equal(battle.reportState.legacy, false);
assert.equal(Object.keys(battle.log).includes('push'), false);
assert.doesNotThrow(() => structuredClone(data));
assert.equal(Object.hasOwn(structuredClone(data).cryptLord.teamBattle.log, 'push'), false);
for (let i = 0; i < 200; i++) {
  battle.log.push({ round: 1, message: `历史${i}` });
  if (battle.log.length > 160) battle.log.shift();
}
report.capture(battle);
assert.equal(battle.log.length, 160);
assert.equal(battle.reportState.simple.filter(row => row.startsWith('历史')).length, 200);
const choice = engine.options(data, true).find(row => row.name === '终结');
const before = JSON.stringify(data);
let result = engine.action(JSON.parse(before), { id: choice.id, target: '敌[甲]' }, () => .99);
assert.equal(result.ok, true, result.error);
data = result.data; battle = bOf(data);
assert.equal(battle.status, 'finished');
assert.equal(JSON.stringify(JSON.parse(before)), before);
assert.equal(battle.reportState.simple.filter(row => row.includes('使用终结攻击')).length, 1);
assert.ok(battle.reportState.detailed.some(row => row.type === 'damage_calculation'));
assert.ok(battle.reportState.detailed.some(row => row.type === 'cost_deduction' && row.costAmount === 2));
let pure = JSON.stringify(data);
let text = report.build(data).text;
assert.ok(text.includes('历史0'));
assert.ok(text.includes('敌[甲]进入【死亡】') || text.includes('恶化为【死亡】'));
assert.ok(text.includes('敌[甲]当前活力：100→0'));
for (const name of ['活力', '敏捷', '灵性', '理智', '人性']) assert.ok(text.includes(`  ${name}：`));
assert.ok(report.build(data, [], true).text.includes('回合开始时角色状态'));
assert.ok(report.build(data, [], true).text.includes('敌[甲]: 活力 100%'));
text = report.build(data, ['敌[甲]']).text;
assert.ok(text.includes('彻底失去战斗能力'));
assert.ok(text.includes('敌[甲]当前活力：100→1'));
assert.equal(JSON.stringify(data), pure, 'Report reads and mercy never change floor data.');
assert.equal(report.build(data, ['player']).ok, false);
result = engine.settle(data, battle.id, true);
assert.equal(result.ok, true, result.error);
assert.equal(result.data.npc_data['敌[甲]'].当前活力, 0);
assert.equal(engine.settle(result.data, battle.id, true).ok, false);
delete result.data.stat_data.消耗品列表.药;
assert.ok(report.build(result.data).text.includes('灵性药：0'));
const legacy = structuredClone(result.data); delete bOf(legacy).reportState;
// Legacy fixtures have no capture marks from a new reporter.
bOf(legacy).log.forEach(row => { delete row.reportCaptured; delete row.reportHandled; });
assert.equal(report.build(legacy).legacy, true);
const unsupported = structuredClone(data); bOf(unsupported).reportState.version = 9;
assert.equal(report.build(unsupported).ok, false);

data = start(); battle = bOf(data);
const actor = battle.units[0], target = battle.units[1];
const skill = { name: '射击', weapon: { mode: 'accuracy' }, skill: {} };
report.miss(battle, actor, target, skill, 4);
let line = battle.reportState.simple.at(-1);
assert.ok(line.includes('在远距离') && line.includes('未命中|攻击落空'));
assert.equal(line.includes('当前活力'), false);
report.hit(battle, actor, target, skill, { incoming: 20 }, 100, 80, 100, 2);
line = battle.reportState.simple.at(-1);
assert.ok(line.includes('在中距离') && !line.includes('未中'));
report.hit(battle, actor, target, skill, { incoming: 100,
  lifeSaveMeta: { triggered: true, skillName: '替身', absorbPct: 100 } }, 100, 100, 100, 1);
line = battle.reportState.simple.at(-1);
assert.ok(line.includes('替身抵消了100%') && !line.includes('未中'));
report.hit(battle, actor, target, { name: '治疗', healStat: '灵性' }, {},
  20, 40, 100, 0, true);
assert.ok(battle.reportState.simple.at(-1).includes('当前灵性：20→40'));
actor.tags = [{ name: '火焰', source: 'inherent' }];
target.tags = [{ name: '寒冷', source: 'inherent' }];
battle.tagRules.damage = { 火焰: { 寒冷: .2 } };
report.hit(battle, actor, target, { name: '火球', skill: {} }, {
  matchedRelations: [{ attackerTag: actor.tags[0], defenderTag: target.tags[0], modifier: .2 }],
}, 100, 90, 100, 1);
assert.ok(battle.reportState.simple.at(-1).includes('克制'));
report.effect(battle, actor, target, { name: '燃烧', duration: 2 });
assert.ok(battle.reportState.detailed.some(row => row.type === 'effect_application'));
report.effect(battle, actor, target, { name: '燃烧', duration: 0 }, 'expired');
assert.ok(battle.reportState.simple.at(-1).includes('效果已过期'));
const temporary = { ...structuredClone(target), name: '临时召唤', isSummon: true };
battle.units.push(temporary);
battle.status = 'finished';
assert.equal(report.build(data).text.includes('临时召唤（'), false);
modules['cryptLord.battleExtraAction'] = { currentSlot: () => ({ heroId: actor.id, alias: '玩家的虚影' }) };
report.miss(battle, actor, target, skill, 1);
assert.ok(battle.reportState.simple.at(-1).startsWith('玩家的虚影'));
assert.equal(actor.name, '玩家');
assert.ok(report.build(data).text.includes('玩家（序列9-猎人）'));
delete modules['cryptLord.battleExtraAction'];
data = start();
battle = bOf(data);
const expired = { name: '短效', type: 'buff', stat: 'defense', power: 1, duration: 1 };
battle.units[1].effects.push(expired);
const afterPlayer = engine.action(data, { type: 'wait' });
assert.equal(afterPlayer.ok, true, afterPlayer.error);
const afterEnemy = engine.action(afterPlayer.data, { type: 'wait' });
assert.equal(afterEnemy.ok, true, afterEnemy.error);
const nextRound = engine.tactic(afterEnemy.data, 'skip');
assert.equal(nextRound.ok, true, nextRound.error);
assert.ok(bOf(nextRound.data).reportState.simple.some(row => row.includes('【短效】效果已过期')));
console.log('Battle report: original source, full history, native action/one-time settlement, text-only mercy and read purity passed.');
