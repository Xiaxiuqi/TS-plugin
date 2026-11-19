import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const modules = {};
class TestDate extends Date { static now() { return 1790990000000; } }
const context = vm.createContext({ console, structuredClone, Date: TestDate, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'savant-material',
  'savant-enhancement', 'weapon-classifier', 'npc-weapon-assigner',
  'battlefield-painter', 'personal-battle-state', 'battle-formulas', 'battle-auras', 'team-battle-state']) {
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
}
const aura = modules['cryptLord.battleAuras'];
const engine = modules['cryptLord.teamBattleState'];
const formulas = modules['cryptLord.battleFormulas'];
const pathways = { 律师途径: ['序列4-堕落伯爵', '序列3-狂乱法师', '序列0-黑皇帝'] };
context.GameDBManager = { DB: { godPathways: pathways } };
const source = async name => readFile(new URL(
  `../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}`, import.meta.url), 'utf8');
let dice = .05;
const oracle = vm.createContext({ console: { log() {}, warn() {}, error() {} }, Date: TestDate,
  Math: Object.assign(Object.create(Math), { random: () => dice }),
  GameDBManager: context.GameDBManager,
  OffFieldManager: { isOff: hero => hero.offField === true },
  BattleBoard: { distanceBetween: (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) },
  parseSequenceRank: text => Number(String(text).match(/序列(\d+)/)?.[1] ?? 10),
});
oracle.window = oracle;
const unitSource = await source('30a2-js-battle-board-and-units.txt');
vm.runInContext(unitSource.slice(unitSource.indexOf('class LifeSaveManager'),
  unitSource.indexOf("console.log('[战斗系统] LifeSaveManager")), oracle);
const aliases = await source('31a-js-pathway-contest-advantages.txt');
vm.runInContext(aliases.slice(aliases.indexOf('const AbilityAlias ='),
  aliases.indexOf("console.log('[战斗系统] AbilityAlias")), oracle);
const auraSource = await source('31b1-js-mystery-sleep-and-effect.txt');
vm.runInContext(auraSource.slice(auraSource.indexOf('const AuraManager =')) +
  '\nthis.originalAura = AuraManager;', oracle);
const ref = oracle.originalAura;
const plain = value => JSON.parse(JSON.stringify(value));
const cfg = aura.defaults().混乱权柄;
for (const key of ['names', 'radius', 'activation', 'stacking', 'selfPool', 'enemyPool'])
  assert.deepEqual(plain(cfg[key]), plain(ref.SUBTYPES.混乱权柄[key]), key);
const unit = (id, side, sequence, x) => ({
  id, name: id, side, source: id === 'player' ? 'player' : 'npc', sequence,
  hp: 100, effects: [], x, y: 0,
});
const actual = { round: 1, units: [
  unit('player', 'ally', '序列3-狂乱法师', 0),
  unit('敌', 'enemy', '序列3-狂乱法师', 1),
  unit('远敌', 'enemy', '序列4-堕落伯爵', 8),
  unit('友', 'ally', '普通人', 1),
], log: [], formulas: formulas.initialize(123) };
const expected = structuredClone(actual);
const heroes = expected.units.map(actor => {
  const hero = { heroId: actor.id, name: actor.name, sequenceString: actor.sequence,
    dataSource: actor.source, additionalStats: {} };
  for (const [key, field] of [['effects', 'effects'], ['teamType', 'side'],
    ['x', 'x'], ['y', 'y'], ['offField', 'offField']])
    Object.defineProperty(hero, key, { get: () => actor[field], set: value => { actor[field] = value; } });
  Object.defineProperty(hero.additionalStats, '当前活力', { get: () => actor.hp });
  return hero;
});
const bm = { teamManager: { getAllHeroes: () => heroes }, battleLogger: { log() {} } };
Object.defineProperty(bm, 'currentRound', { get: () => expected.round });
const compare = () => {
  const instances = state => Object.values(state.instances).flatMap(bucket => Object.values(bucket));
  assert.deepEqual(plain(instances(actual.auraState)), plain(instances(bm.auraState)));
  const effectFields = ['type', 'stat', 'power', 'auraId', 'auraRole', 'auraChannelStacks', 'auraTotalStacks'];
  const effects = units => units.map(actor => actor.effects.map(effect =>
    Object.fromEntries(effectFields.map(key => [key, effect[key]]))));
  assert.deepEqual(plain(effects(actual.units)), plain(effects(expected.units)));
};
aura.initialize(actual, () => dice);
ref.initializeBattle(bm);
compare();
assert.equal(aura.eligibility(actual, actual.units[0], '混乱权柄').radius, 2);
assert.equal(aura.eligibility(actual, { sequence: '序列4-堕落伯爵' }, '混乱权柄'), null);
assert.equal(aura.eligibility(actual, { sequence: '失序者' }, '混乱权柄').radius, 5);
assert.equal(aura.eligibility(actual, { sequence: '序列0-黑皇帝' }, '混乱权柄').radius, 4);
aura.activate(actual, actual.units[0], '混乱权柄', () => dice);
ref.activate(bm, heroes[0], '混乱权柄');
compare();
assert.equal(actual.units[3].effects.filter(effect => effect.auraSourceId === 'player').length, 0);
const advance = () => {
  actual.round++; expected.round++;
  aura.tick(actual, () => dice); ref.tick(bm); compare();
};
dice = .95; advance();
const sameRound = JSON.stringify(actual);
aura.tick(actual, () => dice);
assert.equal(JSON.stringify(actual), sameRound);
actual.units[1].x = expected.units[1].x = 9;
advance();
assert.equal(actual.auraState.instances.player.混乱权柄.records.敌.history.join(), 'attack');
aura.deactivate(actual, actual.units[0], '混乱权柄');
ref.deactivate(bm, heroes[0], '混乱权柄');
compare();
const history = JSON.stringify(actual.auraState.instances.player.混乱权柄.records);
aura.activate(actual, actual.units[0], '混乱权柄', () => dice);
ref.activate(bm, heroes[0], '混乱权柄');
assert.equal(JSON.stringify(actual.auraState.instances.player.混乱权柄.records), history);
compare();
actual.units[0].offField = expected.units[0].offField = true;
advance();
actual.units[0].offField = expected.units[0].offField = false;
advance();
actual.units[0].hp = expected.units[0].hp = 0;
aura.sweepDead(actual); ref.sweepDeadCasters(bm); compare();
advance();
assert.equal(actual.auraState.instances.player.混乱权柄.active, false);
assert.match(aura.statusLines(actual, actual.units[0]).join(), /衰减中/);
for (let i = 0; i < 8; i++) advance();
assert.equal(Object.keys(actual.auraState.instances.player.混乱权柄.records).length, 0);
assert.equal(actual.units.some(actor => actor.effects.some(effect => effect.auraSourceId === 'player')), false);
const legacyAura = { round: 1, log: [], units: [
  unit('__proto__', 'enemy', '序列3-律师', 0),
  unit('constructor', 'ally', '序列3-律师', 1),
] };
aura.initialize(legacyAura, () => .5);
assert.equal(aura.eligibility(legacyAura, legacyAura.units[0], 'constructor'), null);
assert.equal(Object.hasOwn(Object.prototype, '混乱权柄'), false);
assert.deepEqual(Object.keys(legacyAura.auraState.instances).sort(), ['__proto__', 'constructor']);
legacyAura.round++;
const loadedLegacy = JSON.parse(JSON.stringify(legacyAura));
aura.tick(legacyAura); aura.tick(loadedLegacy);
assert.deepEqual(plain(legacyAura), plain(loadedLegacy));

const card = (sequence, speed) => ({ 当前序列: sequence, 活力: 100, 当前活力: 100,
  灵性: 100, 当前灵性: 100, 理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100,
  敏捷: speed, 当前敏捷: speed, 神性: 1 });
const input = { stat_data: { ...card('序列3-狂乱法师', 200),
  序列能力列表: { 能力: [{ 名称: '终结', power: 10000, range: 'global' }] } },
  npc_data: { 敌: card('序列3-狂乱法师', 1) } };
let data = engine.start(input, { enemies: ['敌'], seed: 123 }).data;
assert.equal(data.cryptLord.teamBattle.auraState.instances.敌.混乱权柄.active, true);
assert.equal(engine.aura(data, '混乱权柄', true).ok, false);
data = engine.advanceAuto(engine.action(data, { type: 'wait' }).data).data;
assert.equal(data.cryptLord.teamBattle.phase, 'tactic');
const before = structuredClone(data.cryptLord.teamBattle);
const activated = engine.aura(data, '混乱权柄', true);
assert.equal(activated.ok, true);
data = activated.data;
const after = data.cryptLord.teamBattle;
assert.equal(after.index, before.index);
assert.equal(after.phase, before.phase);
assert.equal(after.round, before.round);
assert.equal(after.units[0].spirit, before.units[0].spirit);
assert.equal(after.units[0].sanity, before.units[0].sanity);
const unchanged = JSON.stringify(data);
engine.get(data); engine.auraOptions(data); aura.statusLines(after, after.units[0]);
assert.equal(JSON.stringify(data), unchanged);
assert.equal(engine.aura(data, '混乱权柄', true).changed, false);
assert.equal(JSON.stringify(engine.aura(data, '混乱权柄', true).data), unchanged);
const resumed = JSON.parse(JSON.stringify(data));
const next = engine.tactic(data);
assert.deepEqual(next.data, engine.tactic(resumed).data);
assert.equal(next.battle.auraState.instances.player.混乱权柄.records.player.history.length, 2);
const ending = structuredClone(next.data);
const endingBattle = ending.cryptLord.teamBattle;
endingBattle.queue = ['敌', 'player'];
endingBattle.index = 1;
endingBattle.units[0].hp = 1;
endingBattle.units[0].effects.push({ name: '回合毒伤', type: 'poison', stat: '当前活力',
  valueType: 'fixed', power: 10, duration: 1, skillEffect: true, triggerTiming: 'round_end' });
const endingResult = engine.action(ending, { type: 'wait' });
assert.equal(endingResult.battle.result, 'defeat');
assert.equal(endingResult.battle.auraState.instances.player.混乱权柄.active, false);
assert.equal(endingResult.battle.auraState.instances.player.混乱权柄.records.player.history.length, 2);
const kill = engine.action(next.data, { id: 'skill:能力:0', target: '敌' }, () => .5);
assert.equal(kill.battle.result, 'victory');
assert.equal(kill.battle.auraState.instances.敌.混乱权柄.active, false);
const settled = engine.settle(kill.data, kill.battle.id, true);
assert.equal(settled.ok, true);
assert.equal(settled.data.npc_data.敌.当前活力, 0);
const restartInput = structuredClone(settled.data);
restartInput.npc_data.敌.当前活力 = 100;
const restarted = engine.start(restartInput, { enemies: ['敌'], seed: 123 });
assert.equal(restarted.battle.auraState.instances.player, undefined);
assert.equal(restarted.battle.auraState.instances.敌.混乱权柄.records.敌.history.length, 1);
delete modules['cryptLord.battleAuras'];
assert.equal(engine.action(next.data, { type: 'wait' }).ok, false);
console.log('PASS battle-auras: original lifecycle parity, eligibility, stacking, LIFO decay, death, native tactics, persistence and settlement');
