import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const modules = {};
class FixedDate extends Date { static now() { return 1790990000000; } }
const context = vm.createContext({ console, structuredClone, Date: FixedDate, Math,
  getChatMessages() { throw Error('must not write opening floor'); },
  TavernHelper: { setChatMessages() { throw Error('must not persist outside native transaction'); } },
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['shaman-territory', 'battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'savant-material', 'savant-enhancement',
  'weapon-classifier', 'npc-weapon-assigner', 'battlefield-painter', 'battle-conditional-params',
  'personal-battle-state', 'battle-formulas', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-balance',
  'battle-punishment', 'battle-mythic-form', 'battle-team-conditions', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const manager = modules['cryptLord.battleMythicForm'];
const engine = modules['cryptLord.teamBattleState'];
const formulas = modules['cryptLord.battleFormulas'];
const plain = value => JSON.parse(JSON.stringify(value));
const era = (day, time = '12:00') => `第五纪1350年10月${day}日星期六${time}`;
const pathways = { 窥秘人途径: ['序列4-神秘学家'], 观众途径: ['序列4-操纵师'],
  仲裁人途径: ['序列2-熵之公爵'], 猎人途径: ['序列4-铁血骑士'] };
const card = (sequence, speed) => ({ 当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 10000, 当前灵性: 10000, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1,
  序列能力列表: { 能力: [{ 名称: '打击', power: 20, range: 'global' }] } });
const start = (sequence = '序列4-神秘学家') => {
  const result = engine.start({ stat_data: { ...card(sequence, 200), 失控进度: 10,
    $专属玩法: { 窥秘人途径: { 神秘再现玩法: {
      法术解锁账本: { ugly_duckling: { 名称: '丑小鸭' } }, 法术运行状态: {},
    } } } }, npc_data: { 敌甲: card('序列5-猎人', 20), 敌乙: card('序列5-猎人', 1) },
    world_data: { 当前时间纪元: era(3) } },
  { enemies: ['敌甲', '敌乙'], seed: 123, pathways });
  assert.equal(result.ok, true, result.error);
  return result.data;
};
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31a-js-pathway-contest-advantages.txt',
  import.meta.url), 'utf8');
const oracle = vm.createContext({ console, Math, Date: FixedDate,
  TacticCatalog: { ...plain(manager.defaults()), mythicTier(rank) {
    if (!Number.isFinite(Number(rank)) || rank > this.MYTHIC_RANK_GATE) return null;
    return rank <= this.MYTHIC_HIGH_RANK ? this.MYTHIC_TIERS.high : this.MYTHIC_TIERS.low;
  } }, TacticResolver: { alive: hero => hero.additionalStats.当前活力 > 0 },
  LifeSaveManager: { splitSequenceFragments: text => String(text).split('/') },
  GameDBManager: { DB: { godPathways: pathways } },
  resolvePathwayFromSequence: sequence => sequence === '序列4-操纵师' ? '观众' : '',
  TimePassageEngine: { _parseEra: text => modules['cryptLord.shamanTerritory'].minutes(text),
    _toMinutes: value => value == null ? NaN : value } });
oracle.window = oracle;
vm.runInContext(source.slice(source.indexOf('const MythicFormDescriptionCatalog ='),
  source.indexOf("console.log('[战斗系统] MythicFormManager")) +
  '\nthis.mythic = MythicFormManager; this.descriptions = MythicFormDescriptionCatalog;', oracle);
oracle.mythic.persist = () => {};

// Original tier/effect and calendar-cost oracle; descriptions refuse ambiguous/unrecognized sequences.
for (const [sequence, rank] of [['序列4-神秘学家', 4], ['序列2-熵之公爵', 2], ['上帝', -1],
  ['序列4-操纵师', 4], ['序列4-神秘学家/序列2-熵之公爵', 2]]) {
  const data = start(sequence), battle = data.cryptLord.teamBattle, actor = battle.units[0];
  const expectedHero = { sequenceString: sequence, sequenceRank: rank, effects: [] };
  const expectedData = plain(data);
  oracle.mythic.apply(expectedHero, battle.round);
  const expectedCost = oracle.mythic.chargePlayer({ currentMvuState: expectedData }, expectedHero);
  const applied = manager.attempt(battle, actor, 'natural', data);
  assert.equal(applied.ok, true, applied.error);
  assert.equal(applied.corruption, expectedCost);
  assert.deepEqual(plain(actor.effects), plain(expectedHero.effects));
  assert.equal(data.stat_data.失控进度, expectedData.stat_data.失控进度);
  assert.equal(data.stat_data.$神话形态上次使用时间, expectedData.stat_data.$神话形态上次使用时间);
  assert.equal(manager.description(battle, actor, data),
    oracle.descriptions.descriptionOfSequence(sequence));
}
let data = start(), b = data.cryptLord.teamBattle;
assert.equal(manager.description(b, b.units[0], data), pathways.窥秘人途径.length &&
  oracle.descriptions.descriptionOfSequence('序列4-神秘学家'));
for (const sequence of ['序列4-窥秘人', '序列4-神秘学家/序列4-操纵师', '上帝']) {
  data = start(sequence); b = data.cryptLord.teamBattle;
  assert.equal(manager.description(b, b.units[0], data), '');
}
data = start(); b = data.cryptLord.teamBattle;
const baseline = JSON.stringify(data), seed = b.formulas.seed;
manager.options(b, b.units[0], data); manager.description(b, b.units[0], data);
assert.equal(JSON.stringify(data), baseline);
assert.equal(b.formulas.seed, seed);
data.stat_data.$神话形态上次使用时间 = era(3, '23:59');
for (const [now, left] of [[era(3, '00:01'), 10], [era(12), 1], [era(13), 0],
  [era(2), 0], ['时间无效', 0]]) {
  data.world_data.当前时间纪元 = now;
  assert.equal(manager.options(b, b.units[0], data).find(row => row.id === 'natural').cooldownLeft, left);
}
data = start(); b = data.cryptLord.teamBattle; data.stat_data.失控进度 = 95;
assert.equal(manager.attempt(b, b.units[0], 'natural', data).corruption, 5);
const after = JSON.stringify(data);
assert.equal(manager.attempt(b, b.units[0], 'ugly_duckling', data).ok, false);
assert.equal(JSON.stringify(data), after);

// Full absolute-round timing and original damage modifiers, including final action round and persistent costs.
data = start(); b = data.cryptLord.teamBattle; b.phase = 'tactic';
const input = JSON.stringify(data);
let result = engine.mythicForm(data, 'natural', () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(JSON.stringify(data), input);
data = result.data; b = data.cryptLord.teamBattle;
assert.equal(b.round, 2);
assert.equal(b.units[0].effects.filter(row => row.mythicForm).length, 2);
assert.equal(data.stat_data.失控进度, 35);
const attack = formulas.damage(b, b.units[0], b.units[1], { power: 20 }, () => .5).amount;
const defense = formulas.damage(b, b.units[1], b.units[0], { power: 20 }, () => .5).amount;
const without = structuredClone(b); without.units[0].effects = [];
assert.equal(attack, Math.floor(formulas.damage(without, without.units[0], without.units[1], { power: 20 }, () => .5).amount * 1.5));
assert.equal(defense, Math.floor(formulas.damage(without, without.units[1], without.units[0], { power: 20 }, () => .5).amount * .5));
const waitRound = () => {
  while (data.cryptLord.teamBattle.phase === 'action') {
    result = engine.action(data, { type: 'wait' }, () => .99);
    assert.equal(result.ok, true, result.error);
    data = result.data;
  }
};
waitRound();
assert.equal(data.cryptLord.teamBattle.units[0].effects[0].duration, 1);
result = engine.tactic(data, 'skip', () => .99);
assert.equal(result.ok, true, result.error); data = result.data;
assert.equal(data.cryptLord.teamBattle.round, 3);
assert.equal(data.cryptLord.teamBattle.units[0].effects.filter(row => row.mythicForm).length, 2);
waitRound();
assert.equal(data.cryptLord.teamBattle.units[0].effects.filter(row => row.mythicForm).length, 0);
assert.equal(data.cryptLord.teamBattle.log.filter(row => row.mythicForm).length, 1);
assert.equal(engine.mythicOptions(data).find(row => row.id === 'natural').cooldownLeft, 10);
result = engine.mythicForm(data, 'ugly_duckling', () => .99);
assert.equal(result.ok, true, result.error); data = result.data;
assert.equal(data.stat_data.失控进度, 35);
assert.equal(data.stat_data.$专属玩法.窥秘人途径.神秘再现玩法.法术运行状态.ugly_duckling.上次使用时间, era(3));
assert.equal(data.cryptLord.teamBattle.units[0].effects.filter(row => row.canonMythicForm).length, 2);
waitRound();
assert.equal(data.cryptLord.teamBattle.units[0].effects.filter(row => row.canonMythicForm).length, 0);
assert.equal(engine.mythicOptions(data).find(row => row.id === 'ugly_duckling').cooldownLeft, 1);
data.world_data.当前时间纪元 = era(4);
assert.equal(engine.mythicOptions(data).find(row => row.id === 'ugly_duckling').reason, '');
delete data.stat_data.$专属玩法.窥秘人途径.神秘再现玩法.法术解锁账本.ugly_duckling;
assert.ok(!engine.mythicOptions(data).some(row => row.id === 'ugly_duckling'));

// NPC fixed-X seeded probability, per-battle use limit and tactical occupancy.
data = start(); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列4-铁血骑士'; b.units[1].rank = 4;
data.npc_data.敌甲.当前序列 = '序列4-铁血骑士';
assert.equal(manager.npc(b, data, [], () => .02, 0).length, 0);
assert.equal(manager.npc(b, data, ['敌甲'], () => 0, 4).length, 0);
assert.equal(manager.npc(b, data, [], () => .9999, 4).length, 1);
assert.equal(b.units[1].mythicFormUsed, true);
b.round = 4; manager.tick(b);
assert.equal(b.units[1].effects.filter(row => row.mythicForm).length, 0);
assert.equal(manager.npc(b, data, [], () => 0, 4).length, 0);
data = start(); b = data.cryptLord.teamBattle;
for (const unit of b.units.slice(1)) { unit.sequence = '序列4'; unit.rank = 4; }
const rolls = [.005, .02];
assert.equal(manager.npc(b, data, [], () => rolls.shift(), 0).length, 1);
assert.equal(b.units[2].mythicFormUsed, undefined);
data = start(); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列4'; b.units[1].rank = 4;
data.npc_data.敌甲.当前序列 = '序列4';
b.phase = 'tactic';
const npcTurn = engine.mythicForm(data, 'natural', () => .005);
assert.equal(npcTurn.ok, true, npcTurn.error);
assert.equal(npcTurn.battle.lastTactic.outcomes.filter(row => row.actor === '敌甲').length, 1);
assert.equal(npcTurn.battle.units[1].mythicFormUsed, true);
const fieldRuntime = modules['cryptLord.battleFieldEffects'];
assert.equal(fieldRuntime.withRuntime(npcTurn.battle, npcTurn.data, undefined, rt =>
  rt.transfer.systemOwnedEffect(rt.heroes[0].effects[0])), true);
data = start(); b = data.cryptLord.teamBattle;
assert.equal(manager.attempt(b, b.units[0], 'ugly_duckling', data).ok, true);
assert.equal(fieldRuntime.withRuntime(b, data, undefined, rt =>
  rt.transfer.systemOwnedEffect(rt.heroes[0].effects[0])), true);
data = start(); b = data.cryptLord.teamBattle;
b.phase = 'tactic';
result = engine.mythicForm(data, 'natural', () => .99);
const replay = JSON.parse(JSON.stringify(result.data));
assert.deepEqual(plain(engine.action(replay, { type: 'wait' }, () => .99)),
  plain(engine.action(result.data, { type: 'wait' }, () => .99)));
const finished = result.data;
for (const unit of finished.cryptLord.teamBattle.units.slice(1)) unit.hp = 0;
result = engine.action(finished, { type: 'wait' }, () => .99);
assert.equal(result.battle.status, 'finished');
assert.ok(result.battle.units.every(unit => !unit.effects.some(row => row.mythicForm)));
const rejected = engine.settle(result.data, result.battle.id, false);
assert.equal(rejected.ok, true, rejected.error);
assert.equal(rejected.data.stat_data.失控进度, 35);
assert.equal(rejected.data.stat_data.$神话形态上次使用时间, era(3));
delete modules['cryptLord.battleMythicForm'];
assert.equal(engine.action(replay, { type: 'wait' }).ok, false);
console.log('PASS mythic forms: original tiers/effects/cost oracle, strict descriptions, game-day cooldowns, native timing/canon/NPC/lifecycle');
