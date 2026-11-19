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
  'battle-team-conditions', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const manager = modules['cryptLord.battleBalance'];
const engine = modules['cryptLord.teamBattleState'];
const formulas = modules['cryptLord.battleFormulas'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const original = async name => readFile(new URL(
  `../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}`, import.meta.url), 'utf8');
const source = await original('31a-js-pathway-contest-advantages.txt');
const oracle = vm.createContext({ console: { log() {}, warn() {}, error() {} },
  Math: Object.assign(Object.create(Math), { random: () => .5 }),
  TacticCatalog: { BALANCE_ACTION: '平衡' }, AbilityAlias: {
    resolve: () => ({ 平衡: { ok: true, name: '平衡', rank: 2 } }),
  }, SkillRange: { normalize: skill => ({ max: skill.range }) },
  BattleBoard: { distanceBetween: (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) },
  BriberyManager: { weakenPercent: () => 0, combatContext: (_a, _b, ctx) => ctx } });
oracle.window = oracle;
vm.runInContext(source.slice(source.indexOf('const BalanceManager ='),
  source.indexOf("console.log('[战斗系统] BalanceManager")) +
  '\nthis.balance = BalanceManager;', oracle);
assert.deepEqual(plain(manager.defaults()), { config: plain(oracle.balance.CONFIG), maxPoints: 10 });
const card = (rank, speed) => ({ 当前序列: `序列${rank}-仲裁人`,
  活力: 10000, 当前活力: 10000, 敏捷: speed, 当前敏捷: speed,
  灵性: 10000, 当前灵性: 10000, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 神性: 1 });
const start = (sequence = '序列2-仲裁人') => {
  const result = engine.start({ stat_data: { ...card(2, 200), 当前序列: sequence,
    序列能力列表: { 能力: [{ 名称: '打击', power: { '1': 50, '2': 5, default: 1 },
      range: 'global', cost: { type: 'currentSpirit', amount: 2 } }] } },
    npc_data: { 敌甲: { ...card(1, 20), 当前序列: '序列1-猎人', 神性: 2 },
      敌乙: { ...card(2, 1), 当前序列: '序列2-猎人' } } },
  { enemies: ['敌甲', '敌乙'], seed: 123 });
  assert.equal(result.ok, true, result.error);
  return result.data;
};
const activate = (b, target = '敌甲', data, actor = b.units[0]) => {
  const out = manager.attempt(b, actor, target, data);
  assert.equal(out.ok, true, out.error);
  return out;
};

// Full rank curve, qualification and per-battle budget, including fractional and mythic ranks.
for (const casterRank of [10, 3, 2, 1.5, 1, .5, 0, -.5, -1, -2])
  for (const targetRank of [10, 2, 1.5, 1, 0, -1, -2]) {
    const data = start(), b = data.cryptLord.teamBattle;
    Object.assign(b.units[0], { rank: casterRank, sequence: casterRank < 0 ? '失序者' : `序列${casterRank}-仲裁人` });
    Object.assign(b.units[1], { rank: targetRank, sequence: targetRank < 0 ? '失序者' : `序列${targetRank}-猎人` });
    const left = fields.withRuntime(b, data, undefined, rt => {
      const a = rt.heroes[0], t = rt.heroes[1];
      return { a: a.sequenceRank, t: t.sequenceRank,
        cost: rt.balance.costOf(a, t), duration: rt.balance.durationOf(a, t) };
    });
    assert.equal(left.cost, oracle.balance.costOf({ sequenceRank: left.a }, { sequenceRank: left.t }));
    assert.equal(left.duration, oracle.balance.durationOf({ sequenceRank: left.a }, { sequenceRank: left.t }));
  }
assert.equal(manager.options(start('序列3-仲裁人').cryptLord.teamBattle,
  start('序列3-仲裁人').cryptLord.teamBattle.units[0]), null);
for (const sequence of ['序列2-仲裁人', '序列8-律师/序列2-仲裁人', '失序者']) {
  const d = start(sequence);
  assert.ok(manager.options(d.cryptLord.teamBattle, d.cryptLord.teamBattle.units[0], d));
}
let data = start(), b = data.cryptLord.teamBattle;
const untouched = JSON.stringify(b);
manager.options(b, b.units[0], data); manager.preview(b, b.units[0], '敌甲', data);
manager.statusLines(b, b.units[0]);
assert.equal(JSON.stringify(b), untouched);
const spirit = b.units[0].spirit, seed = b.formulas.seed;
let applied = activate(b, '敌甲', data);
assert.equal(applied.cost, 4); assert.equal(applied.duration, 4);
assert.equal(b.units[0].spirit, spirit); assert.equal(b.formulas.seed, seed);
assert.equal(manager.pair(b, b.units[0], b.units[1]), null);
b.round = 2;
assert.ok(manager.pair(b, b.units[1], b.units[0]));
assert.equal(manager.pair(b, b.units[0], b.units[2]), null);
assert.equal(activate(b, '敌甲', data).mode, 'refresh');
assert.equal(activate(b, '敌乙', data).mode, 'switch');
assert.equal(activate(b, '敌乙', data).pointsLeft, 0);
const exhausted = JSON.stringify(b);
assert.equal(manager.attempt(b, b.units[0], '敌甲', data).ok, false);
assert.equal(JSON.stringify(b), exhausted);
assert.match(manager.statusLines(b, b.units[0]).join(), /平衡点数 0\/10/u);

// Original damage/accuracy calculator parity: borrowed source includes power, divinity, tags/modifiers.
const basics = await original('30a1a-js-basics-and-attribute.txt');
vm.runInContext(basics.slice(basics.indexOf('const BattleFormulaEngine ='),
  basics.indexOf('class SkillCostManager')), oracle);
const units = await original('30a2-js-battle-board-and-units.txt');
vm.runInContext(units.slice(units.indexOf('class Move {'),
  units.indexOf("console.log('[战斗系统] 核心架构")), oracle);
const movers = await original('32a-js-battle-tags-movers-cpu.txt');
vm.runInContext(movers.slice(movers.indexOf('class WeaponAccuracy'),
  movers.indexOf("console.log('[战斗系统] WeaponAccuracy")), oracle);
vm.runInContext('this.reference = { DamageCalculator, WeaponAccuracy, Move };', oracle);
const hero = u => ({ heroId: u.id, sequenceRank: u.rank, sequenceString: u.sequence,
  effects: u.effects, tags: u.tags, x: u.x, y: u.y, additionalStats: {
    当前活力: u.hp, 活力: u.maxHp, 当前敏捷: u.agility, 敏捷: u.maxAgility,
    当前灵性: u.spirit, 灵性: u.maxSpirit, 当前理智: u.sanity, 理智: u.maxSanity,
    当前人性: u.humanity, 人性: u.maxHumanity, 运气: u.luck, 神性: u.divinity,
  } });
data = start(); b = data.cryptLord.teamBattle;
activate(b, '敌甲', data); b.round = 2;
Object.assign(b.units[0], { tags: [{ name: '火' }], divinity: 1 });
Object.assign(b.units[1], { tags: [{ name: '冰' }], divinity: 3, effects: [
  { stat: 'damageDealtIncrease', type: 'buff', valueType: 'percentage', power: 20 },
  { stat: 'damageTakenDecrease', type: 'buff', valueType: 'percentage', power: 10 },
] });
b.tagRules.damage = { 火: { 冰: .8 }, 冰: { 冰: .1, 火: -.3 } };
oracle.tagManager = { getTags: (h, skill) => [...h.tags,
  ...(skill?.skillTags || []).map(name => ({ name }))], tagDamageRelations: b.tagRules.damage };
const bm = { currentRound: b.round, fundamentalRules: { laws: [] },
  teamManager: { getAllHeroes: () => b.units.map(hero) } };
for (const [actor, target] of [[b.units[0], b.units[1]], [b.units[1], b.units[0]]]) {
  for (const type of ['physical', 'mystical', 'mental', 'mixed']) {
    for (const accuracy of [false, true]) {
      const skill = new oracle.reference.Move({ power: { '1': 50, '2': 5, default: 1 },
        damageType: type, isAccuracyWeapon: accuracy, fixedDamage: 10, accuracyTier: '步枪级', range: 3 });
      const expected = oracle.reference.DamageCalculator.calculateDamageWithDivinity(
        hero(actor), hero(target), skill, { battleManager: bm, actualAttacker: hero(actor),
          parameterAttacker: hero(target), balanceTriggered: true });
      const result = formulas.damage(b, actor, target, skill, () => .5);
      assert.equal(result.amount, expected, `${type}/${accuracy}/${actor.id}`);
      assert.equal(result.parameterAttacker, target.id);
      if (accuracy) assert.equal(formulas.accuracy(b, actor, target, skill),
        oracle.reference.WeaponAccuracy.chance(hero(actor), hero(target), skill,
          { battleManager: bm, parameterAttacker: hero(target) }));
    }
  }
}
assert.equal(formulas.damage(b, b.units[0], b.units[2], { power: 5 }, () => .5).balanceTriggered, undefined);
const heal = { healAmt: .1, healType: '灵性', healValueType: 'percentage' };
b.units[1].spirit = 9000;
const normal = formulas.healing(b, b.units[0], b.units[1], heal, () => .5);
const copy = structuredClone(b); delete copy.balanceMeta;
assert.deepEqual(plain(normal), plain(formulas.healing(copy, copy.units[0], copy.units[1], heal, () => .5)));

// Full duration incl. final action round; invalid/death cleanup without restoring spent points.
data = start(); b = data.cryptLord.teamBattle; activate(b, '敌甲', data);
b.round = 4; manager.sweep(b, true);
assert.ok(b.balanceAuthority.relations.player);
b.round = 5; assert.ok(manager.pair(b, b.units[0], b.units[1]));
manager.sweep(b, true); assert.equal(b.balanceAuthority.relations.player, undefined);
assert.equal(b.balanceAuthority.spent.player, 4);
activate(b, '敌乙', data); b.units[2].hp = 0; manager.sweep(b);
assert.equal(b.balanceAuthority.relations.player, undefined);
assert.equal(b.balanceAuthority.spent.player, 5);
b.units[2].hp = 10000; activate(b, '敌乙', data);
b.units[2].side = 'ally'; manager.sweep(b);
assert.equal(b.balanceAuthority.relations.player, undefined);
data = start(); b = data.cryptLord.teamBattle; activate(b, '敌甲', data);
b.tempAllegiance.processes.push({ casterId: 'player', targetId: '敌甲',
  originTeamType: 'enemy', originController: 'npc', until: 9 });
b.units[1].side = 'ally'; manager.sweep(b);
assert.ok(b.balanceAuthority.relations.player);
manager.finish(b);
assert.equal(Object.keys(b.balanceAuthority.relations).length, 0);
assert.equal(b.balanceAuthority.spent.player, 4);

// NPC uses strongest affordable reachable target, then lowest health ratio; outgoing target priority.
data = start(); b = data.cryptLord.teamBattle;
try {
  modules['cryptLord.teamBattleState'] = { options: () => [
    { name: '条件恢复', skill: { isHeal: true }, heal: 0, range: 3, cost: 0 },
  ] };
  assert.equal(fields.withRuntime(b, data, undefined, rt => rt.heroes[0].moveSet[0].isHeal), true);
} finally {
  modules['cryptLord.teamBattleState'] = engine;
}
data = start(); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列2-仲裁人'; b.units[1].rank = 2;
data.npc_data.敌甲.当前序列 = '序列2-仲裁人';
data.npc_data.敌甲.序列能力列表 = { 能力: [{ 名称: '远击', power: 5, range: 'global' }] };
b.units[2].side = 'ally';
b.units[2].hp = 2000; b.units[2].rank = 2;
assert.equal(manager.npc(b, data, [], () => .99).length, 0);
assert.equal(manager.npc(b, data, ['敌甲'], () => 0).length, 0);
assert.equal(manager.npc(b, data, [], () => 0).find(row => row.actor === '敌甲').target, '敌乙');
assert.ok(!b.balanceAuthority.spent.player);
b.units[1].sequence = '序列1-猎人'; b.units[1].rank = 1;
b.units[2].side = 'enemy';
activate(b, '敌乙', data);
b.queue = ['player']; b.index = 0; b.phase = 'action';
b.units[0].controller = 'npc';
assert.equal(engine.autoAction(data).target, '敌乙');

// Native transactions preserve actual caster fees/credit, rank maps and module guard; unusual ids are own keys.
data = start(); b = data.cryptLord.teamBattle;
b.phase = 'tactic';
const before = JSON.stringify(data);
const activated = engine.balance(data, { target: '敌甲' }, () => .99);
assert.equal(activated.ok, true, activated.error);
assert.equal(JSON.stringify(data), before);
const hit = engine.action(activated.data, { id: 'skill:能力:0', target: '敌甲' }, () => .5);
assert.equal(hit.ok, true, hit.error);
const row = hit.battle.log.find(row => row.calculation?.balanceTriggered);
assert.equal(row.actor, 'player');
assert.equal(row.calculation.parameterAttacker, '敌甲');
assert.equal(row.calculation.power, 50);
assert.equal(hit.battle.units[0].spirit, 9998);
assert.equal(hit.battle.units[1].spirit, 10000);
assert.equal(hit.battle.units[0].damage, row.damage);
const resumed = JSON.parse(JSON.stringify(activated.data));
assert.deepEqual(plain(engine.action(resumed, { id: 'skill:能力:0', target: '敌甲' }, () => .5).battle),
  plain(hit.battle));
const special = start().cryptLord.teamBattle;
special.units[0].id = '__proto__';
assert.equal(manager.attempt(special, special.units[0], '敌甲').ok, true);
assert.equal(JSON.parse(JSON.stringify(special)).balanceAuthority.spent.__proto__, 4);
delete modules['cryptLord.battleBalance'];
assert.equal(engine.action(activated.data, { type: 'wait' }).ok, false);
modules['cryptLord.battleBalance'] = manager;
console.log('PASS balance chain: original rank budget and formula oracle, activation/lifecycle, permanent sides, NPC priority, actual ownership and native persistence');
