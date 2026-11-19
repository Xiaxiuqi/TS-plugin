import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const modules = {};
const context = vm.createContext({ console, structuredClone, Date, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, value) { modules[key] = value; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'savant-material', 'savant-enhancement',
  'weapon-classifier', 'npc-weapon-assigner', 'battlefield-painter', 'personal-battle-state',
  'battle-formulas', 'battle-auras', 'battle-field-effect-reference', 'battle-field-effects',
  'battle-effect-transfer', 'battle-bribery', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const bribes = modules['cryptLord.battleBribery'];
const fields = modules['cryptLord.battleFieldEffects'];
const formulas = modules['cryptLord.battleFormulas'];
const engine = modules['cryptLord.teamBattleState'];
const plain = value => JSON.parse(JSON.stringify(value));
const unit = (id, side, sequence = '普通人') => ({
  id, name: id, side, source: id === 'player' ? 'player' : 'npc', sequence,
  rank: Number(sequence.match(/序列(\d+)/u)?.[1] || 10),
  hp: 10000, maxHp: 10000, spirit: id === 'player' ? 50000 : 100,
  maxSpirit: 50000, humanity: 100, maxHumanity: 100,
  sanity: 100, maxSanity: 100, agility: 100, maxAgility: 100,
  luck: 10, divinity: 1, x: side === 'ally' ? 0 : 2, y: 0, effects: [],
});
const battle = (sequence = '序列7-律师') => {
  const b = { round: 1, log: [], units: [unit('player', 'ally', sequence),
    unit('敌', 'enemy'), unit('友', 'ally')], formulas: formulas.initialize(123) };
  bribes.initialize(b);
  return b;
};
const cast = (b, subtype, actor = b.units[0], target = '敌', charmRoll = .5) => {
  const rolls = [.99, 0, charmRoll];
  const out = bribes.attempt(b, actor, subtype, target, {}, () => rolls.shift() ?? .5);
  assert.equal(out.ok, true, out.error);
  assert.equal(out.applied, true);
  return out;
};
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31a-js-pathway-contest-advantages.txt',
  import.meta.url), 'utf8');
const oracle = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const BriberyManager =')) +
  '\nthis.rules = BriberyManager.SUBTYPES;', oracle);
assert.deepEqual(plain(bribes.defaults()), plain(oracle.rules));

// Whole catalog, qualification, postfee contest, targeted modifiers and failure retention.
let b = battle();
assert.equal(bribes.options(b, b.units[0]).length, 3);
assert.equal(bribes.options(battle('序列8-律师'), battle('序列8-律师').units[0]).length, 0);
assert.equal(bribes.options(battle('失序者'), battle('失序者').units[0]).length, 3);
const cost = bribes.preview(b, b.units[0], '贿赂：削弱', '敌').cost;
cast(b, '贿赂：削弱');
assert.equal(b.units[0].spirit, 50000 - cost);
assert.equal(b.units[0].bribery['贿赂：削弱'].敌.power, 35);
assert.equal(bribes.weakenPercent(b, b.units[1], b.units[0], 'attack'), 35);
assert.equal(bribes.weakenPercent(b, b.units[0], b.units[1], 'defense'), 35);
assert.equal(bribes.weakenPercent(b, b.units[1], b.units[2], 'attack'), 0);
const original = plain(b.units[0].bribery);
b.units[0].spirit = 100 + cost;
const failRolls = [0, .99];
assert.equal(bribes.attempt(b, b.units[0], '贿赂：削弱', '敌', {},
  () => failRolls.shift()).applied, false);
assert.deepEqual(plain(b.units[0].bribery), original);
b.units[0].spirit = 1;
b.units[0].humanity = 0;
assert.equal(bribes.attempt(b, b.units[0], '贿赂：关联', '敌', {}, () => .5).ok, false);
b.units[0].humanity = 500;
assert.equal(bribes.attempt(b, b.units[0], '贿赂：关联', '敌', {}, () => .5).ok, true);
assert.equal(b.units[0].spirit, 0);

// Weaken is additive with ordinary percentages and only affects the actual pair.
b = battle();
const skill = { power: 10, damageType: 'physical' };
const before = formulas.damage(b, b.units[1], b.units[0], skill, () => .5);
cast(b, '贿赂：削弱');
const weakened = formulas.damage(b, b.units[1], b.units[0], skill, () => .5);
assert.equal(weakened.attack, Math.floor(before.attack * .65));
b.units[1].effects.push({ stat: 'attack', type: 'buff', power: 20, valueType: 'percentage' });
assert.equal(formulas.damage(b, b.units[1], b.units[0], skill, () => .5).attack,
  Math.floor(before.attack * .85));
const againstFriend = formulas.damage(b, b.units[1], b.units[2], skill, () => .5);
assert.equal(againstFriend.attack, Math.floor(before.attack * 1.2));
const normalDefense = formulas.damage(b, b.units[0], b.units[2], skill, () => .5).defense;
assert.equal(formulas.damage(b, b.units[0], b.units[1], skill, () => .5).defense,
  Math.floor(normalDefense * .65));
cast(b, '贿赂：关联');
assert.equal(fields.tacticMultiplier(b, b.units[0], b.units[1]), 1.2);
assert.equal(fields.tacticMultiplier(b, b.units[1], b.units[0]), 1);
assert.equal(fields.tacticMultiplier(b, b.units[0], b.units[2]), 1);

// Charm limits selections, not collateral damage; healing and unrelated opponents remain valid.
b = battle();
cast(b, '贿赂：魅惑');
const single = { power: 10, heal: 0, range: 3, targetType: 'single' };
assert.match(bribes.blockReason(b, b.units[1], single, b.units[0]), /不能直接攻击/u);
assert.equal(bribes.blockReason(b, b.units[1], single, b.units[2]), '');
assert.equal(bribes.blockReason(b, b.units[1], { ...single, heal: 10 }, b.units[0]), '');
const area = { ...single, targetType: 'all', range: 0, radius: 3 };
b.units[2].x = 20;
assert.match(bribes.blockReason(b, b.units[1], area, b.units[1]), /范围攻击/u);
b.units[2].x = 1;
assert.equal(bribes.blockReason(b, b.units[1], area, b.units[1]), '');
b.round = 2;
assert.match(bribes.statusLines(b, b.units[1]).join(), /剩余1回合/u);
bribes.sweep(b, true);
assert.equal(Object.keys(b.units[0].bribery['贿赂：魅惑']).length, 0);
b = battle();
cast(b, '贿赂：削弱'); cast(b, '贿赂：关联');
for (const round of [2, 3]) {
  b.round = round; bribes.sweep(b, true);
  assert.ok(b.units[0].bribery['贿赂：削弱'].敌);
}
b.round = 4; bribes.sweep(b, true);
assert.equal(Object.keys(b.units[0].bribery['贿赂：削弱']).length, 0);

// The 5% branch restores the exact original team/controller on expiry, death and finish.
b = battle();
b.units[1].controller = 'npc';
cast(b, '贿赂：魅惑', b.units[0], '敌', .049);
assert.equal(b.units[1].side, 'ally');
assert.equal(b.units[1].controller, 'player');
assert.equal(bribes.originSide(b, b.units[1]), 'enemy');
assert.equal(b.tempAllegiance.processes[0].expireRound, 2);
assert.equal(Object.keys(b.units[0].bribery['贿赂：魅惑']).length, 0);
b = JSON.parse(JSON.stringify(b));
b.round = 2; bribes.sweep(b, true);
assert.equal(b.units[1].side, 'enemy');
assert.equal(b.units[1].controller, 'npc');
assert.equal(b.tempAllegiance.processes.length, 0);
for (const end of ['death', 'finish']) {
  b = battle(); cast(b, '贿赂：魅惑', b.units[0], '敌', 0);
  if (end === 'death') { b.units[0].hp = 0; bribes.sweep(b); }
  else bribes.finish(b);
  assert.equal(b.units[1].side, 'enemy');
  assert.equal(b.tempAllegiance.processes.length, 0);
}
b = battle();
b.units.push({ ...unit('另一发动者', 'enemy', '序列7-律师'), spirit: 100000 });
cast(b, '贿赂：魅惑', b.units[0], '敌', 0);
cast(b, '贿赂：魅惑', b.units[3], '敌', 0);
assert.equal(b.tempAllegiance.processes.length, 1);
assert.equal(b.tempAllegiance.processes[0].originTeamType, 'enemy');
assert.equal(b.tempAllegiance.processes[0].originController, 'npc');
b.round = 2; bribes.sweep(b, true);
assert.equal(b.units[1].side, 'enemy');
assert.equal(b.units[1].controller, 'npc');

// NPC avoids redundant links/zero weaken and read-only operations preserve dice and dictionaries.
b = battle();
b.units[1].sequence = '序列7-律师';
b.units[1].spirit = 100000;
assert.equal(bribes.npc(b, {}, ['敌'], () => 0).length, 0);
assert.equal(bribes.npc(b, {}, [], () => 0).length, 1);
assert.equal(bribes.npc(b, {}, [], () => .99).length, 0);
const unchanged = JSON.stringify(b);
bribes.options(b, b.units[0]); bribes.preview(b, b.units[0], '贿赂：关联', '敌');
bribes.statusLines(b, b.units[0]);
assert.equal(JSON.stringify(b), unchanged);
const fresh = battle(), resumed = JSON.parse(JSON.stringify(fresh));
const liveRoll = bribes.attempt(fresh, fresh.units[0], '贿赂：关联', '敌');
const savedRoll = bribes.attempt(resumed, resumed.units[0], '贿赂：关联', '敌');
assert.deepEqual(plain(liveRoll), plain(savedRoll));
assert.equal(fresh.formulas.seed, resumed.formulas.seed);
const special = battle(); special.units[1].id = '__proto__';
cast(special, '贿赂：削弱', special.units[0], '__proto__');
assert.ok(JSON.parse(JSON.stringify(special)).units[0].bribery['贿赂：削弱']['__proto__']);

// Native transaction: charm does not defeat the last enemy, and controlled NPCs wait for the player.
const card = (sequence, speed) => ({ 当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 50000, 当前灵性: 50000, 理智: 100, 当前理智: 100, 人性: 100,
  当前人性: 100, 敏捷: speed, 当前敏捷: speed, 神性: 1 });
let data = engine.start({ stat_data: card('序列7-律师', 200),
  npc_data: { 敌: { ...card('普通人', 1), 灵性: 10, 当前灵性: 10,
    序列能力列表: { 能力: [{ 名称: '远击', power: 10, range: 'global' }] } } } },
{ enemies: ['敌'], seed: 123 }).data;
data = engine.advanceAuto(engine.action(data, { type: 'wait' }, () => .99).data).data;
const saved = JSON.stringify(data), charmRolls = [.5, .5, 0];
const applied = engine.bribery(data, { subtype: '贿赂：魅惑', target: '敌' },
  () => charmRolls.shift() ?? .99);
assert.equal(applied.ok, true);
assert.equal(JSON.stringify(data), saved);
assert.equal(applied.battle.status, 'active');
assert.equal(applied.battle.units[1].side, 'ally');
data = engine.advanceAuto(engine.action(applied.data, { type: 'wait' }).data).data;
assert.equal(data.cryptLord.teamBattle.queue[data.cryptLord.teamBattle.index], '敌');
assert.equal(engine.autoAction(data), null);
data = engine.advanceAuto(engine.action(data, { type: 'wait' }).data).data;
assert.equal(data.cryptLord.teamBattle.units[1].side, 'enemy');
assert.equal(data.cryptLord.teamBattle.phase, 'tactic');
assert.equal(data.cryptLord.teamBattle.status, 'active');

// Hostile charm filters targets before any fee or inventory deduction.
data.cryptLord.teamBattle.phase = 'action';
data.cryptLord.teamBattle.index = data.cryptLord.teamBattle.queue.indexOf('敌');
const currentBattle = data.cryptLord.teamBattle;
cast(currentBattle, '贿赂：魅惑');
const originalData = JSON.stringify(data);
assert.equal(engine.options(data).find(row => row.id === 'npc-skill:0'), undefined);
assert.equal(engine.options(data).find(row => row.id === 'skill:能力:0').targets.length, 0);
assert.equal(engine.action(data, { id: 'skill:能力:0', target: 'player' }).ok, false);
assert.equal(JSON.stringify(data), originalData);
delete modules['cryptLord.battleBribery'];
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
console.log('PASS bribery: catalog/fees, pair-specific weaken/link, charm/blocking, expiry/defection/restoration, NPC/read purity, native control and persistence');
