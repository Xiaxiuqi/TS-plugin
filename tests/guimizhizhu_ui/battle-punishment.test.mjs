import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const modules = {};
class FixedDate extends Date { static now() { return 1790990000000; } }
const context = vm.createContext({ console, structuredClone, Date: FixedDate, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'savant-material', 'savant-enhancement',
  'weapon-classifier', 'npc-weapon-assigner', 'battlefield-painter', 'battle-conditional-params',
  'personal-battle-state', 'battle-formulas', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-balance',
  'battle-punishment', 'battle-team-conditions', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const manager = modules['cryptLord.battlePunishment'];
const engine = modules['cryptLord.teamBattleState'];
const formulas = modules['cryptLord.battleFormulas'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const original = async name => readFile(new URL(
  `../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}`, import.meta.url), 'utf8');
const source = await original('31a-js-pathway-contest-advantages.txt');
const oracle = vm.createContext({ console: { log() {}, warn() {}, error() {} },
  Math: Object.assign(Object.create(Math), { random: () => .5 }),
  BriberyManager: { weakenPercent: () => 0, combatContext: (_a, _b, ctx) => ctx } });
oracle.window = oracle;
vm.runInContext(source.slice(source.indexOf('const PunishmentManager ='),
  source.indexOf("console.log('[战斗系统] PunishmentManager")) +
  '\nthis.punishment = PunishmentManager;', oracle);
assert.deepEqual(plain(manager.defaults()), { config: plain(oracle.punishment.CONFIG), multiplier: 1.5 });
const card = (rank, speed, pathway = '仲裁人') => ({
  当前序列: `序列${rank}-${pathway}`, 活力: 10000, 当前活力: 10000,
  灵性: 10000, 当前灵性: 10000, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1,
  序列能力列表: { 能力: [{ 名称: '打击', power: 20, range: 'global' }] },
});
const start = (sequence = '序列5-仲裁人') => {
  const result = engine.start({ stat_data: { ...card(5, 200), 当前序列: sequence },
    npc_data: { 敌甲: card(5, 20, '猎人'), 敌乙: card(5, 1, '猎人') } },
  { enemies: ['敌甲', '敌乙'], seed: 123 });
  assert.equal(result.ok, true, result.error);
  return result.data;
};
const activate = (data, target = '敌甲', actor = data.cryptLord.teamBattle.units[0]) => {
  const out = manager.attempt(data.cryptLord.teamBattle, actor, target, data);
  assert.equal(out.ok, true, out.error);
  return out;
};

// Qualification, positive-but-insufficient fee, unique target/switching and read purity.
for (const sequence of ['序列5-仲裁人', '序列8-律师/序列5-仲裁人', '失序者', '序列1-仲裁人']) {
  const data = start(sequence), b = data.cryptLord.teamBattle;
  assert.ok(manager.options(b, b.units[0], data));
}
for (const sequence of ['序列6-仲裁人', '序列5-猎人', '普通人']) {
  const data = start(sequence), b = data.cryptLord.teamBattle;
  assert.equal(manager.options(b, b.units[0], data), null);
}
let data = start(), b = data.cryptLord.teamBattle;
const pristine = JSON.stringify(data);
manager.options(b, b.units[0], data); manager.preview(b, b.units[0], '敌甲', data);
manager.statusLines(b, b.units[0]); manager.priorityTarget(b, b.units[0]);
assert.equal(JSON.stringify(data), pristine);
b.units[0].spirit = 1;
assert.ok(activate(data).cost > 1);
assert.equal(b.units[0].spirit, 0);
let unchanged = JSON.stringify(b);
assert.equal(manager.attempt(b, b.units[0], '敌乙', data).ok, false);
assert.equal(JSON.stringify(b), unchanged);
b.units[0].spirit = 10000;
unchanged = JSON.stringify(b);
assert.equal(manager.attempt(b, b.units[0], '敌甲', data).ok, false);
assert.equal(JSON.stringify(b), unchanged);
assert.equal(activate(data, '敌乙').switched, true);
assert.equal(manager.multiplier(b, b.units[0], b.units[1]), 1);
assert.equal(manager.multiplier(b, b.units[0], b.units[2]), 1.5);
assert.equal(manager.multiplier(b, b.units[2], b.units[0]), 1);
assert.equal(manager.multiplier(b, b.units[1], b.units[2]), 1);

// Original calculator oracle: final/merged/ignore, four damage types, precision and Balance ownership.
const basics = await original('30a1a-js-basics-and-attribute.txt');
vm.runInContext(basics.slice(basics.indexOf('const BattleFormulaEngine ='),
  basics.indexOf('class SkillCostManager')), oracle);
const units = await original('30a2-js-battle-board-and-units.txt');
vm.runInContext(units.slice(units.indexOf('class Move {'),
  units.indexOf("console.log('[战斗系统] 核心架构")), oracle);
vm.runInContext('this.reference = { DamageCalculator, Move, BattleFormulaEngine };', oracle);
const hero = u => ({ heroId: u.id, teamType: u.side, punishment: u.punishment,
  sequenceRank: u.rank, sequenceString: u.sequence, effects: u.effects, tags: u.tags,
  additionalStats: { 当前活力: u.hp, 活力: u.maxHp, 当前敏捷: u.agility, 敏捷: u.maxAgility,
    当前灵性: u.spirit, 灵性: u.maxSpirit, 当前理智: u.sanity, 理智: u.maxSanity,
    当前人性: u.humanity, 人性: u.maxHumanity, 运气: u.luck, 神性: u.divinity } });
data = start(); b = data.cryptLord.teamBattle; activate(data);
b.units[0].effects.push({ stat: 'damageDealtIncrease', type: 'buff', valueType: 'percentage', power: 20 });
const bm = { fundamentalRules: { laws: [] }, formulaValues: {} };
for (const mode of ['final', 'merged', 'ignore']) {
  bm.formulaValues = { 'damage.punishmentMode': mode, 'accuracyDamage.punishmentMode': mode };
  for (const id of Object.keys(bm.formulaValues))
    oracle.reference.BattleFormulaEngine.atoms[id].defaultValue = mode;
  b.formulas.values = { ...b.formulas.values, ...bm.formulaValues };
  for (const damageType of ['physical', 'mystical', 'mental', 'mixed'])
    for (const isAccuracyWeapon of [false, true])
      for (const balance of [false, true]) {
        if (balance) {
          b.balanceAuthority.relations.player = { casterId: 'player', targetId: '敌甲',
            activeFromRound: 1, expireAfterRound: 99 };
        } else b.balanceAuthority.relations = {};
        const actor = b.units[0], target = b.units[1];
        const skill = new oracle.reference.Move({ power: 20, damageType,
          isAccuracyWeapon, fixedDamage: 100 });
        const expected = oracle.reference.DamageCalculator.calculateDamageWithDivinity(
          hero(actor), hero(target), skill, { battleManager: bm, actualAttacker: hero(actor),
            parameterAttacker: hero(balance ? target : actor), balanceTriggered: balance });
        const result = formulas.damage(b, actor, target, skill, () => .5);
        assert.equal(result.amount, expected, `${mode}/${damageType}/${isAccuracyWeapon}/${balance}`);
        assert.equal(result.punishmentTriggered, mode !== 'ignore');
      }
}
const healing = { healAmt: .1, healType: '灵性', healValueType: 'percentage' };
b.units[1].spirit = 100;
const healed = formulas.healing(b, b.units[0], b.units[1], healing, () => .5);
b.units[0].punishment = null;
assert.deepEqual(plain(healed), plain(formulas.healing(b, b.units[0], b.units[1], healing, () => .5)));

// No timed expiry, off-field retains binding, same-side/death clears, NPC priority and tactical exclusivity.
data = start(); b = data.cryptLord.teamBattle; activate(data);
b.round = 50; b.units[1].offField = true; manager.sweep(b);
assert.ok(b.units[0].punishment);
assert.equal(manager.priorityTarget(b, b.units[0]), null);
b.units[1].offField = false;
assert.equal(manager.priorityTarget(b, b.units[0]), '敌甲');
b.units[1].side = 'ally'; manager.sweep(b);
assert.equal(b.units[0].punishment, null);
b.units[1].side = 'enemy'; activate(data);
b.units[1].hp = 0; manager.sweep(b);
assert.equal(b.units[0].punishment, null);
activate(data, '敌乙'); b.units[0].hp = 0; manager.sweep(b);
assert.equal(b.units[0].punishment, null);
data = start(); b = data.cryptLord.teamBattle;
b.units[0].controller = 'npc';
b.units[1].hp = 2000;
const seedBefore = b.formulas.seed;
manager.options(b, b.units[0], data);
assert.equal(b.formulas.seed, seedBefore);
assert.equal(manager.npc(b, data, () => .8)[0].target, '敌甲');
const spiritAfter = b.units[0].spirit;
assert.equal(manager.npc(b, data, () => 0).length, 0);
assert.equal(b.units[0].spirit, spiritAfter);
b.phase = 'action'; b.queue = ['player']; b.index = 0;
assert.equal(engine.autoAction(data).target, '敌甲');
// Equal-rank wounded enemy gets 7 votes; stronger/distant tiers don't override sequence proximity.
const votes = fields.withRuntime(b, data, () => .8, rt => {
  const tiers = rt.bm.cpuManager.buildSequenceTiers(rt.heroes[0],
    rt.heroes.slice(1).map(unit => ({ unit, side: 'enemy' })));
  return rt.bm.cpuManager.buildBallot(tiers[0], [], rt.heroes[0]).map(row => row.votes);
});
assert.deepEqual(plain(votes), [7, 1]);
// The original ballot pre-applies one signed terrain tick, rather than treating regen as damage.
b.units[1].hp = 4000;
b.terrain = [{ x: b.units[1].x, y: b.units[1].y, id: 'fireSurface', rank: 2 }];
const terrainBallot = fields.withRuntime(b, data, undefined, rt => {
  const tier = { members: [{ unit: rt.heroes[1], side: 'enemy' }] };
  return { ratio: rt.bm.cpuManager.effectiveVitalityRatio(rt.heroes[1]),
    votes: rt.bm.cpuManager.buildBallot(tier, [], rt.heroes[0])[0].votes };
});
assert.equal(terrainBallot.ratio, .4 - .111);
assert.equal(terrainBallot.votes, 7);
data = start(); b = data.cryptLord.teamBattle;
activate(data, '敌乙');
b.units[0].controller = 'npc';
b.units[2].x = 11;
data.stat_data.序列能力列表.能力[0].range = 1;
const movement = engine.autoAction(data);
assert.equal(movement.type, 'move');
assert.ok(Math.max(Math.abs(movement.x - 11), Math.abs(movement.y)) < 11);
// AOE applies the multiplier per victim; the caster's target marker does not boost other enemies.
data = start(); b = data.cryptLord.teamBattle;
activate(data);
Object.assign(data.stat_data.序列能力列表.能力[0], { targetType: 'all', aoeRadius: 12 });
const area = engine.action(data, { id: 'skill:能力:0', target: '敌甲' }, () => .5);
assert.equal(area.ok, true, area.error);
const areaHits = area.battle.log.filter(row => row.actor === 'player' && row.calculation?.kind === 'damage');
assert.deepEqual(areaHits.map(row => [row.target, row.calculation.punishmentTriggered]),
  [['敌甲', true], ['敌乙', false]]);
data = start(); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列5-仲裁人';
data.npc_data.敌甲.当前序列 = '序列5-仲裁人';
b.phase = 'tactic';
const before = JSON.stringify(data);
const outcome = engine.punishment(data, { target: '敌甲' }, () => .99);
assert.equal(outcome.ok, true, outcome.error);
assert.equal(JSON.stringify(data), before);
assert.equal(outcome.battle.lastTactic.outcomes.filter(row => row.actor === '敌甲').length, 1);
assert.equal(outcome.battle.units[1].punishment.targetId, 'player');
const replay = JSON.parse(JSON.stringify(outcome.data));
assert.deepEqual(plain(engine.action(replay, { id: 'skill:能力:0', target: '敌甲' }, () => .5).battle),
  plain(engine.action(outcome.data, { id: 'skill:能力:0', target: '敌甲' }, () => .5).battle));
const hit = engine.action(outcome.data, { id: 'skill:能力:0', target: '敌甲' }, () => .5);
assert.equal(hit.ok, true, hit.error);
assert.ok(hit.battle.log.some(row => row.calculation?.punishmentTriggered));
manager.finish(hit.data.cryptLord.teamBattle);
assert.ok(hit.data.cryptLord.teamBattle.units.every(unit => !unit.punishment));
delete modules['cryptLord.battlePunishment'];
assert.equal(engine.action(outcome.data, { type: 'wait' }).ok, false);
modules['cryptLord.battlePunishment'] = manager;
console.log('PASS punishment: original directional formula oracle, full targeting/fees/lifecycle, NPC weighted priority and native persistence');
