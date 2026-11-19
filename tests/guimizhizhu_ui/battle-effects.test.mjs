import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const modules = {};
const context = vm.createContext({ console, structuredClone, Date, Math, Uint32Array,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-effect-reference', 'battle-effects', 'personal-battle-state',
  'battle-terrain-presets', 'battle-formulas', 'battle-conditional-params',
  'battle-field-effect-reference', 'battle-report', 'battle-field-effects',
  'battle-effect-transfer', 'battle-terrain-effects', 'battle-resource-status',
  'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const effects = modules['cryptLord.battleEffects'], engine = modules['cryptLord.teamBattleState'];
const silent = { log() {}, error() {}, warn() {} };
const plain = value => JSON.parse(JSON.stringify(value, (key, row) =>
  ['appliedAt', 'skillEffect', 'passive'].includes(key) ? undefined : row));
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const source = await readFile(new URL('30b-js-battle-team-effects-config.txt', base), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('class EffectManager {')),
  99, true, ts.ScriptKind.JS);
const managerText = ast.statements.find(node => ts.isClassDeclaration(node) &&
  node.name?.text === 'EffectManager').getText(ast);
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(managerText.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')));
for (const [file, className, method] of [
  ['32a-js-battle-tags-movers-cpu.txt', 'TurnManager', 'processCharacterEffects'],
  ['30a1a-js-basics-and-attribute.txt', 'AttributeCalculator', 'recalculateAllSixDimStats'],
]) {
  const text = await readFile(new URL(file, base), 'utf8');
  const tree = ts.createSourceFile(file, text.slice(text.indexOf(`class ${className} {`)),
    99, true, ts.ScriptKind.JS);
  const fragment = tree.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === className)
    .members.find(node => node.name?.getText(tree) === method).getText(tree);
  assert.ok(generated.includes(fragment.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')));
}
const oracle = vm.runInNewContext(`${managerText}; new EffectManager()`, {
  console: silent, window: {}, Date, AttributeCalculator: { recalculateAllSixDimStats() {} },
});
const actor = () => ({ id: 'player', name: '玩家', rank: 9, hp: 50, maxHp: 100,
  spirit: 40, maxSpirit: 100, sanity: 80, maxSanity: 100, humanity: 80, maxHumanity: 100,
  agility: 40, maxAgility: 100, luck: 10, maxLuck: 10, effects: [], tags: [] });
const battleOf = player => ({ round: 1, status: 'active', log: [], units: [player],
  tagRules: { mapping: {}, damage: {}, healing: {} } });
let player = actor(), battle = battleOf(player);
const originalHero = { name: player.name, heroId: player.id, sequenceRank: 9, effects: [],
  additionalStats: { 当前活力: 50, 活力: 100 } };
for (const raw of [
  { name: '攻势', type: 'buff', stat: 'attack', power: { 9: 20 }, duration: 2, triggerTiming: 'round_end' },
  { name: '攻势', type: 'buff', stat: 'attack', power: 10, duration: 9 },
  { name: '攻势', type: 'buff', stat: 'attack', power: 20, duration: 4 },
  { name: '攻势', type: 'buff', stat: 'attack', power: 30, duration: 1 },
  { name: '旧格式', type: 'debuff', stat: 'defense', modifier: .2, duration: 2 },
  { name: '再生', type: 'regen', stat: '当前活力', power: 5, duration: 2, triggerTiming: 'turn_end' },
]) {
  const native = effects.apply(battle, player, player, raw);
  const expected = oracle.applyEffect(originalHero, raw, originalHero, {});
  assert.equal(native, Boolean(expected.applied || expected.replaced || expected.refreshed));
  assert.deepEqual(plain(player.effects), plain(originalHero.effects));
}
assert.equal(player.effects.find(row => row.name === '攻势').triggerTiming, 'turn_start');
assert.equal(effects.apply(battle, player, player,
  { name: '坏类型', type: 'buff', stat: 'damageDealtIncrease', power: 10, duration: 2 }), false);
console.log('1/4 complete original extraction, resolution, legacy fields, stronger/longer precedence passed');

player = actor(); battle = battleOf(player);
for (const raw of [
  { name: '开场恢复', type: 'regen', stat: '当前活力', power: 5, duration: 2, priority: -1 },
  { name: '毒', type: 'poison', stat: '当前活力', power: 10, duration: 2 },
  { name: '结束恢复', type: 'regen', stat: '当前灵性', power: 10, duration: 2, triggerTiming: 'turn_end' },
  { name: '终轮反噬', type: 'poison', stat: '当前理智', power: 5, duration: 2, triggerTiming: 'round_end' },
  { name: '上限', type: 'buff', stat: '活力', power: 20, duration: 2 },
  { name: '常驻', type: 'buff', stat: 'speed', power: 10, duration: 1, battlePersistent: true },
]) assert.equal(effects.apply(battle, player, player, raw), true);
assert.equal(player.maxHp, 120);
effects.process(battle, player, 'turn_start');
assert.equal(player.hp, 45);
assert.equal(player.maxHp, 120);
const once = JSON.stringify(player);
effects.process(structuredClone(battle), player, 'turn_start');
assert.equal(JSON.stringify(player), once);
effects.process(battle, player, 'turn_end');
assert.equal(player.spirit, 50);
effects.process(battle, player, 'round_end');
assert.equal(player.sanity, 75);
battle.round++;
effects.process(battle, player, 'turn_start');
assert.equal(player.maxHp, 100);
assert.equal(player.effects.some(row => row.name === '上限'), false);
assert.equal(player.effects.find(row => row.name === '常驻').duration, 1);
effects.process(battle, player, 'turn_end');
effects.process(battle, player, 'round_end');
assert.equal(player.spirit, 60);
assert.equal(player.sanity, 70);
assert.deepEqual(plain(player.effects.map(row => row.name)), ['常驻']);
const frozen = structuredClone(player);
modules['cryptLord.battleExtraAction'] = { currentSlot: () => ({ extra: true, cfg: { freezeDurations: true } }) };
assert.equal(effects.process(battle, player).length, 0);
assert.deepEqual(plain(player), plain(frozen));
delete modules['cryptLord.battleExtraAction'];
console.log('2/4 priority, all trigger timings, six-stat expiry, persistent effects and frozen extra turns passed');

const card = { 名称: '玩家', 当前序列: '猎人', 活力: 1000, 当前活力: 1000,
  灵性: 1000, 当前灵性: 1000, 敏捷: 100, 当前敏捷: 100, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 运气: 10,
  序列能力列表: { 测试: [{ 名称: '点燃', power: 10, range: 'global',
    effects: [{ name: '技能毒', type: 'poison', power: 10, duration: 2,
      stat: '当前活力', effectTarget: 'target' }] }] } };
const input = { stat_data: card, npc_data: { 敌: { ...card, 名称: '敌', 当前序列: '野兽', 敏捷: 10, 当前敏捷: 10 } } };
const started = engine.start(input, { enemies: ['敌'], seed: 13,
  tagRules: { mapping: { 猎人: { tags: ['火'], duration: 99 }, 野兽: { tags: ['木'], duration: 99 } },
    damage: { 火: { 木: .5 } }, healing: { 火: { 木: .5 } } } });
assert.equal(started.ok, true, started.error);
let data = started.data;
let current = data.cryptLord.teamBattle;
Object.assign(current, { queue: ['player', '敌'], index: 0, turnSlots: [] });
const snapshot = JSON.stringify(data);
let out = engine.action(data, { id: 'skill:测试:0', target: '敌' }, () => .99);
assert.equal(out.ok, true, out.error);
const enemy = out.battle.units.find(row => row.id === '敌');
assert.equal(enemy.effects.find(row => row.name === '技能毒').power, 15);
assert.ok(out.battle.reportState.simple.some(row => row.includes('技能毒')));
assert.equal(JSON.stringify(data), snapshot);
const saved = JSON.stringify(out.data);
engine.get(out.data); engine.get(out.data);
assert.equal(JSON.stringify(out.data), saved);
// Modifiers are frozen at application; later changes must not recalculate each tick.
out.battle.tagRules.damage.火.木 = 1.5;
const hp = enemy.hp;
out.battle.round++;
effects.process(out.battle, enemy);
assert.equal(enemy.hp, hp - 15);
assert.equal(enemy.effects.some(row => row.name === '技能毒'), false);
const p = out.battle.units[0];
assert.equal(effects.apply(out.battle, p, enemy, { name: '标签恢复', type: 'regen',
  stat: '当前活力', power: 10, duration: 2 }, {}), true);
assert.equal(enemy.effects.find(row => row.name === '标签恢复').power, 15);
// Native residue, field DOT and resource statuses use the same clock, special authority timers do not.
enemy.effects.push({ name: '战术毒', type: 'poison', stat: '当前活力', power: 3,
  valueType: 'fixed', duration: 2, fieldEffect: true, triggerTiming: 'turn_start' },
{ name: '沾染', type: 'poison', stat: '当前活力', power: 2,
  valueType: 'fixed', duration: 2, terrainEffect: true, skillEffect: true, triggerTiming: 'turn_start' },
{ name: '权柄', type: 'debuff', stat: 'attack', power: 20, duration: 99, fieldEffect: true,
  triggerTiming: 'never' });
out.battle.round++;
effects.process(out.battle, enemy);
assert.equal(enemy.effects.find(row => row.name === '战术毒').duration, 1);
assert.equal(enemy.effects.find(row => row.name === '沾染').duration, 1);
assert.equal(enemy.effects.find(row => row.name === '权柄').duration, 99);
const transfer = modules['cryptLord.battleEffectTransfer'];
const linkedPlayer = { ...actor(), sequence: '序列4-律师', rank: 4, side: 'ally', source: 'player',
  hp: 1000, maxHp: 1000, spirit: 10000, maxSpirit: 10000, x: 0, y: 0 };
const linkedEnemy = { ...actor(), id: '敌', name: '敌', side: 'enemy', source: 'npc',
  sequence: '普通人', hp: 1000, maxHp: 1000, x: 2, y: 0 };
const linked = { round: 1, log: [], units: [linkedPlayer, linkedEnemy], tagRules: { damage: {}, healing: {} } };
transfer.initialize(linked);
const dice = [.99, 0];
assert.equal(transfer.attempt(linked, linkedPlayer, '扭曲：扭曲目标', '敌', {}, () => dice.shift()).applied, true);
linked.round = 2;
assert.equal(effects.apply(linked, linkedEnemy, linkedPlayer, { name: '分配毒',
  type: 'poison', stat: '当前活力', power: 11, duration: 3 }), true);
for (const recipient of linked.units) {
  assert.equal(recipient.effects.find(row => row.name === '分配毒').power, 6);
  assert.equal(recipient.effects.find(row => row.name === '分配毒').effectTransferResolved, true);
  effects.process(linked, recipient);
  assert.equal(recipient.hp, 994, 'Distributed poison must tick once without recursively dividing again.');
}
const terrainBattle = structuredClone(started.data.cryptLord.teamBattle);
const terrainActor = terrainBattle.units[0];
terrainBattle.round = 2;
terrainActor.x = terrainActor.y = 1;
terrainBattle.terrain = [{ ...modules['cryptLord.battleTerrainPresets'].option('poisonSurface'),
  x: 1, y: 1, rank: 8, duration: 3 }];
modules['cryptLord.battleTerrainEffects'].entry(terrainBattle, terrainActor);
assert.ok(terrainActor.effects.some(row => row.terrainEffect && row.skillEffect));
const beforeTick = terrainActor.hp;
effects.process(terrainBattle, terrainActor);
assert.ok(terrainActor.hp < beforeTick);
const afterTick = terrainActor.hp;
modules['cryptLord.battleFieldEffects'].turnStart(terrainBattle, terrainActor);
assert.equal(terrainActor.hp, afterTick, 'The former field clock must not repeat the unified turn-start tick.');
terrainActor.hp = 100;
modules['cryptLord.battleResourceStatus'].turnStart(terrainBattle, terrainActor);
assert.ok(terrainActor.effects.some(row => row.resourceStatus));
const beforeStatuses = terrainActor.effects.filter(row => row.resourceStatus).map(row => row.duration);
effects.process(terrainBattle, terrainActor);
assert.deepEqual(plain(terrainActor.effects.filter(row => row.resourceStatus).map(row => row.duration)),
  plain(beforeStatuses), 'Newly reapplied low-resource statuses cannot expire again in the same turn.');
console.log('3/4 native skill/report, fixed tag modifiers, residue/field clocks and pure floor reads passed');

const unknown = structuredClone(out.data);
unknown.cryptLord.teamBattle.effectLifecycle.version = 9;
assert.equal(engine.action(unknown, { type: 'wait' }).ok, false);
const absent = modules['cryptLord.battleEffects'];
delete modules['cryptLord.battleEffects'];
assert.equal(engine.action(out.data, { type: 'wait' }).ok, false);
modules['cryptLord.battleEffects'] = absent;
assert.equal(effects.apply(battle, player, player,
  { name: '无穷', type: 'poison', stat: '当前活力', power: Infinity, duration: 1 }), false);
assert.equal(effects.apply(battle, player, player,
  { name: '字典', type: 'poison', stat: '__proto__', power: 1, duration: 1 }), false);
const broken = actor(), brokenBattle = battleOf(broken);
broken.effects = [{ name: '坏存档', type: 'poison', stat: '当前活力', power: NaN,
  duration: 2, skillEffect: true }];
assert.throws(() => effects.process(brokenBattle, broken), /无效数值/);
assert.equal(broken.hp, 50);
const failed = structuredClone(started.data);
const failedBattle = failed.cryptLord.teamBattle;
Object.assign(failedBattle, { queue: ['player', '敌'], index: 0, turnSlots: [] });
const failedEnemy = failedBattle.units.find(row => row.id === '敌');
failedEnemy.effects.push({ name: '异常毒伤', type: 'poison', stat: '当前活力',
  power: 5, duration: 2, skillEffect: true, triggerTiming: 'turn_start' });
const beforeFailure = JSON.stringify(failed);
modules['cryptLord.battleEffectTransfer'] = { ...transfer, loss() { throw Error('模拟结算异常'); } };
assert.throws(() => engine.action(failed, { type: 'wait' }), /模拟结算异常/);
assert.equal(JSON.stringify(failed), beforeFailure, 'A caught original engine error must not commit a partial floor draft.');
modules['cryptLord.battleEffectTransfer'] = transfer;
console.log('4/4 finite input, corrupted state, unknown schema and missing module protection passed');
