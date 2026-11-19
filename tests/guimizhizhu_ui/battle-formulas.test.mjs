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
  'battlefield-painter', 'personal-battle-state', 'battle-formulas', 'team-battle-state']) {
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
}
const formulas = modules['cryptLord.battleFormulas'];
const engine = modules['cryptLord.teamBattleState'];
const originalRoot = '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/';
const original = async name => readFile(new URL(originalRoot + name, import.meta.url), 'utf8');
const silent = { log() {}, warn() {}, error() {} };
const oracle = vm.createContext({ console: silent, Math: Object.assign(Object.create(Math),
  { random: () => .5 }), BriberyManager: {
  weakenPercent: () => 0, combatContext: (_a, _b, ctx) => ctx,
} });
oracle.window = oracle;
const basics = await original('30a1a-js-basics-and-attribute.txt');
vm.runInContext(basics.slice(basics.indexOf('const BattleFormulaEngine ='),
  basics.indexOf('class SkillCostManager')), oracle);
const units = await original('30a2-js-battle-board-and-units.txt');
vm.runInContext(units.slice(units.indexOf('class MovementCalculator'),
  units.indexOf("console.log('[战斗系统] MovementCalculator")), oracle);
vm.runInContext(units.slice(units.indexOf('class Move {'),
  units.indexOf("console.log('[战斗系统] 核心架构")), oracle);
vm.runInContext(units.slice(units.indexOf('class LifeSaveManager'),
  units.indexOf("console.log('[战斗系统] LifeSaveManager")), oracle);
oracle.parseSequenceRank = value => Number(String(value).match(/序列(\d+)/)?.[1] ?? 10);
const movers = await original('32a-js-battle-tags-movers-cpu.txt');
vm.runInContext(movers.slice(movers.indexOf('class WeaponAccuracy'),
  movers.indexOf("console.log('[战斗系统] WeaponAccuracy")), oracle);
vm.runInContext(`this.referenceQueue = ({${
  movers.slice(movers.indexOf('    buildTurnQueue() {'),
    movers.indexOf('    /**', movers.indexOf('    buildTurnQueue() {') + 30))
}}).buildTurnQueue`, oracle);
vm.runInContext(`this.reference = { BattleFormulaEngine, AttributeCalculator,
  DamageCalculator, MovementCalculator, Move, WeaponAccuracy }`, oracle);
const ref = oracle.reference;
const catalog = formulas.catalog();
assert.deepEqual(Object.keys(catalog).sort(), Object.keys(ref.BattleFormulaEngine.atoms).sort());
for (const [id, atom] of Object.entries(catalog)) {
  const expected = ref.BattleFormulaEngine.atoms[id];
  assert.equal(atom.defaultValue, expected.defaultValue, id);
  if (atom.type === 'number') {
    assert.equal(atom.min, expected.min, id);
    assert.equal(atom.max, expected.max, id);
    assert.equal(atom.step, expected.step, id);
  } else assert.deepEqual([...atom.options].sort(), Object.keys(expected.options).sort(), id);
}
assert.throws(() => formulas.initialize(1, { 'movement.min': 8, 'movement.max': 7 }));
assert.equal(formulas.validate('movement.base', 4.5).ok, false);
assert.equal(formulas.validate('damage.powerScale', 'eval()').ok, false);

const actor = { id: 'player', hp: 80, maxHp: 150, agility: 70, maxAgility: 90,
  spirit: 110, maxSpirit: 150, sanity: 65, maxSanity: 100,
  humanity: 50, maxHumanity: 100, luck: 30, divinity: 2, rank: 4,
  x: 0, y: 0, tags: [{ name: '火' }], effects: [
    { stat: 'attack', type: 'buff', valueType: 'percentage', power: 25 },
    { stat: 'attack', type: 'debuff', valueType: 'fixed', power: 3 },
    { stat: 'damageDealtIncrease', type: 'buff', valueType: 'percentage', power: 20 },
  ] };
const target = { ...structuredClone(actor), id: 'target', hp: 40, spirit: 40,
  sanity: 40, humanity: 40, agility: 40, divinity: 1, x: 3, y: 0,
  tags: [{ name: '冰' }], effects: [
    { stat: 'defense', type: 'buff', valueType: 'fixed', power: 8 },
    { stat: 'damageTakenDecrease', type: 'buff', valueType: 'percentage', power: 10 },
  ] };
const hero = a => ({ heroId: a.id, sequenceRank: a.rank, sequenceString: a.sequence,
  x: a.x, y: a.y, tags: a.tags, effects: a.effects,
  envMoveBonus: a.envMoveBonus, enemyControlMovePct: a.enemyControlMovePct,
  mindDepriveMovePct: a.mindDepriveMovePct, picturePersonImmobile: a.picturePersonImmobile,
  additionalStats: { 当前活力: a.hp, 活力: a.maxHp, 当前敏捷: a.agility,
    敏捷: a.maxAgility, 当前灵性: a.spirit, 灵性: a.maxSpirit,
    当前理智: a.sanity, 理智: a.maxSanity, 当前人性: a.humanity,
    人性: a.maxHumanity, 运气: a.luck, 神性: a.divinity } });
const battle = { round: 1, units: [actor, target], formulas: formulas.initialize(123),
  tagRules: { damage: { 火: { 冰: .3 } }, healing: { 火: { 冰: .25 } } } };
const bm = () => ({ currentRound: battle.round,
  fundamentalRules: structuredClone(battle.fundamentalRules || { laws: [] }),
  teamManager: { getAllHeroes: () => battle.units.map(hero) } });
oracle.tagManager = {
  getTags(a, skill) { return [...a.tags, ...(skill?.skillTags || []).map(name => ({ name }))]; },
  tagDamageRelations: battle.tagRules.damage, tagHealingRelations: battle.tagRules.healing,
};
for (const type of ['physical', 'mystical', 'mental', 'mixed']) {
  for (const kind of ['attack', 'defense'])
    assert.equal(formulas.attribute(battle, actor, kind, type),
      ref.AttributeCalculator[kind === 'attack' ? 'calculateAttack' : 'calculateDefense']
        (hero(actor), type, { battleManager: bm() }), `${kind}/${type}`);
  const skill = { power: 30, damageType: type, skillTags: ['火'] };
  assert.equal(formulas.damage(battle, actor, target, skill, () => .5).amount,
    ref.DamageCalculator.calculateDamageWithDivinity(hero(actor), hero(target),
      skill, { battleManager: bm() }), type);
}
for (const isAccuracyWeapon of [false, true]) {
  const skill = { power: 30, isAccuracyWeapon, fixedDamage: 50, damageType: 'physical' };
  assert.equal(formulas.damage(battle, actor, target, skill, () => .5).amount,
    ref.DamageCalculator.calculateDamageWithDivinity(hero(actor), hero(target),
      skill, { battleManager: bm() }));
}
for (const type of ['活力', '敏捷', '灵性', '理智', '人性']) {
  for (const healValueType of ['fixed', 'percentage']) {
    const skill = { healType: type, healValueType, healAmt: healValueType === 'fixed' ? 15 : .2 };
    const move = Object.assign(Object.create(ref.Move.prototype), skill);
    assert.equal(formulas.healing(battle, actor, target, skill).amount,
      move.calculateHealing(hero(actor), hero(target), { battleManager: bm() }).amount,
      `${type}/${healValueType}`);
  }
}
oracle.SkillRange = { normalize: skill => ({ max: skill.range }) };
oracle.BattleBoard = { distanceBetween: (a, b) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) };
for (const accuracyTier of ['霰弹枪级', '手枪级', '步枪级', '狙击枪级', '近战无精度']) {
  const skill = { isAccuracyWeapon: true, accuracyTier, range: 3 };
  assert.equal(formulas.accuracy(battle, actor, target, skill),
      ref.WeaponAccuracy.chance(hero(actor), hero(target), skill, { battleManager: bm() }));
}
const pathways = { 猎人途径: ['序列9-猎人', '序列8-挑衅者'],
  阅读者途径: ['序列7-侦探', '序列8-推理学员'] };
battle.formulas.pathways = structuredClone(pathways);
oracle.GameDBManager = { DB: { godPathways: pathways } };
for (const sequence of ['序列8-挑衅者', '序列7-侦探', '序列8-推理学员',
  '序列9-猎人/序列7-侦探', '上帝', '普通人']) {
  const attacker = { ...actor, sequence };
  const skill = { isAccuracyWeapon: true, accuracyTier: '手枪级', range: 5 };
  assert.equal(formulas.accuracy(battle, attacker, target, skill),
    ref.WeaponAccuracy.chance(hero(attacker), hero(target), skill,
      { battleManager: bm() }), sequence);
}
assert.deepEqual([...formulas.initiative(battle, () => .5)],
  [...oracle.referenceQueue.call({ battleManager: bm(),
    teamManager: { getAllAliveHeroes: () => battle.units.map(hero) } })].map(row => row.heroId));
const status = { config: { agility: [0, .29, .49, .79].map(threshold => ({ threshold })) } };
for (const ratio of [0, .2, .4, .6, 1]) {
  const moving = { ...actor, agility: actor.maxAgility * ratio, envMoveBonus: 3,
    enemyControlMovePct: 20, effects: [
      { type: 'buff', stat: 'movement', power: 2, valueType: 'fixed' },
      { type: 'debuff', stat: 'movement', power: 25, valueType: 'percentage' },
    ] };
  assert.equal(formulas.movement(battle, moving), ref.MovementCalculator.calculate(
    hero(moving), battle.units.map(hero), status, bm()), `movement/${ratio}`);
}
// Atom layers are serializable; invalid latest bounds expose the previous active layer.
battle.fundamentalRules = { laws: [
  { serial: 1, sourceHeroId: 'player', startRound: 1, endRound: 2,
    mutations: [{ atomId: 'damage.randomMax', value: 1 }] },
  { serial: 2, sourceHeroId: 'player', startRound: 1, endRound: 2,
    mutations: [{ atomId: 'damage.randomMin', value: 1.5 }] },
] };
assert.equal(formulas.value(battle, 'damage.randomMin'), .9);
assert.equal(formulas.value(battle, 'damage.randomMax'), 1);
assert.equal(formulas.value(battle, 'damage.randomMin'),
  ref.BattleFormulaEngine.value(bm(), 'damage.randomMin'));
delete battle.fundamentalRules;
const mappedSkill = Object.assign(Object.create(ref.Move.prototype),
  { power: { 4: 12, default: 3 }, healAmt: { 4: .3, default: .1 }, healType: '灵性' });
assert.equal(formulas.damage(battle, actor, target, mappedSkill, () => .5).amount,
  ref.DamageCalculator.calculateDamageWithDivinity(hero(actor), hero(target),
    mappedSkill, { battleManager: bm() }));
assert.equal(formulas.healing(battle, actor, target, mappedSkill).amount,
  mappedSkill.calculateHealing(hero(actor), hero(target), { battleManager: bm() }).amount);
for (const basis of ['targetMax', 'targetMissing', 'healerMax', 'healerCurrent', 'targetCurrent']) {
  battle.formulas = formulas.initialize(123, { 'healing.basis': basis });
  ref.BattleFormulaEngine.atoms['healing.basis'].defaultValue = basis;
  assert.equal(formulas.healing(battle, actor, target, mappedSkill).amount,
    mappedSkill.calculateHealing(hero(actor), hero(target), { battleManager: bm() }).amount, basis);
}
ref.BattleFormulaEngine.atoms['healing.basis'].defaultValue = 'targetMax';
for (const mode of ['additive', 'multiplicative', 'maxAbs']) {
  const override = { 'damage.modifierMode': mode, 'healing.modifierMode': mode,
    'modifiers.attackOrder': 'fixedThenPercent', 'movement.order': 'preClamp' };
  battle.formulas = formulas.initialize(123, override);
  for (const [id, value] of Object.entries(override))
    ref.BattleFormulaEngine.atoms[id].defaultValue = value;
  const skill = { power: 30 };
  assert.equal(formulas.damage(battle, actor, target, skill, () => .5).amount,
    ref.DamageCalculator.calculateDamageWithDivinity(hero(actor), hero(target), skill,
      { battleManager: bm() }), mode);
  const healingSkill = { healType: '灵性', healAmt: .3, skillTags: ['火'] };
  const move = Object.assign(Object.create(ref.Move.prototype), healingSkill);
  assert.equal(formulas.healing(battle, actor, target, healingSkill).amount,
    move.calculateHealing(hero(actor), hero(target), { battleManager: bm() }).amount, mode);
}
const saved = JSON.parse(JSON.stringify(battle));
assert.equal(formulas.draw(battle), formulas.draw(saved));
assert.equal(battle.formulas.seed, saved.formulas.seed);

const card = speed => ({ 当前序列: '序列9', 活力: 100, 当前活力: 100,
  灵性: 80, 当前灵性: 80, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1 });
const input = { stat_data: { ...card(200), 序列能力列表: { 能力: [
  { 名称: '精神攻击', power: 20, damageType: 'mental', range: 'global' },
  { 名称: '治疗', healAmt: .2, targetType: 'self', range: 0 },
] } }, npc_data: { 敌人: card(10) } };
let data = engine.start(input, { enemies: ['敌人'], seed: 123 }).data;
assert.equal(data.cryptLord.teamBattle.formulas.version, 1);
const before = JSON.stringify(data);
assert.equal(engine.action(data, { id: 'bad', target: '敌人' }).ok, false);
engine.get(data); engine.options(data); engine.reachable(data);
assert.equal(JSON.stringify(data), before);
let landing = engine.reachable(data).find(cell => cell.x === 1 && cell.y === 9);
const weighted = structuredClone(data);
weighted.cryptLord.teamBattle.terrain = [{ x: 1, y: 9, tier: 2 }];
assert.equal(engine.reachable(weighted).find(cell => cell.x === 1 && cell.y === 9).cost, 3);
const blocked = structuredClone(data);
blocked.cryptLord.teamBattle.terrain = Array.from({ length: 10 }, (_, y) =>
  ({ x: 1, y, blocked: true })).filter(row => row.y !== 9);
Object.assign(blocked.cryptLord.teamBattle.units[1], { x: 1, y: 9 });
assert.equal(engine.reachable(blocked).some(cell => cell.x > 1), false);
const pool = data.cryptLord.teamBattle.units[0].moveRemaining;
data = engine.action(data, { type: 'move', ...landing }).data;
assert.equal(data.cryptLord.teamBattle.units[0].moveRemaining, pool - landing.cost);
landing = engine.reachable(data).find(cell => cell.x === 2 && cell.y === 9);
assert.ok(landing);
data = engine.action(data, { type: 'move', ...landing }).data;
assert.equal(data.cryptLord.teamBattle.units[0].moveRemaining, pool - 2);
const hit = engine.action(data, { id: 'skill:能力:0', target: '敌人' }, () => .5);
assert.equal(hit.ok, true);
assert.equal(hit.battle.units[1].hp, 100);
assert.ok(hit.battle.units[1].sanity < 100);
assert.equal(hit.battle.log.find(row => row.calculation)?.calculation.attribute, 'sanity');
const retry = engine.action(data, { id: 'skill:能力:0', target: '敌人' });
assert.deepEqual(retry.data, engine.action(JSON.parse(JSON.stringify(data)),
  { id: 'skill:能力:0', target: '敌人' }).data);
const wounded = structuredClone(data);
wounded.cryptLord.teamBattle.units[0].hp = 40;
const heal = engine.action(wounded, { id: 'skill:能力:1', target: 'player' });
assert.equal(heal.data.cryptLord.teamBattle.units[0].hp, 60);
const npcHealing = structuredClone(data);
const npcBattle = npcHealing.cryptLord.teamBattle;
npcBattle.index = 1;
npcBattle.units[1].hp = 20;
npcHealing.npc_data.敌人.能力清单 = [
  { 名称: '自愈', healAmt: .2, healType: '灵性', targetType: 'self', range: 0, 灵性消耗: 1 },
  { 名称: '治伤', healAmt: .2, targetType: 'self', range: 0 },
];
const npcSeed = npcBattle.formulas.seed;
assert.equal(engine.autoAction(npcHealing).id, 'npc-skill:1');
assert.equal(npcBattle.formulas.seed, npcSeed);
assert.equal(engine.action(npcHealing, engine.autoAction(npcHealing)).battle.units[1].hp, 40);
const protectedInput = structuredClone(input);
protectedInput.npc_data.敌人.当前序列 = '序列7-占卜家';
protectedInput.npc_data.敌人.当前途径 = '占卜家';
protectedInput.npc_data.敌人.当前理智 = 1;
const protectedBattle = engine.start(protectedInput, { enemies: ['敌人'], seed: 123 }).data;
const mentalHit = engine.action(protectedBattle, { id: 'skill:能力:0', target: '敌人' }, () => .5);
assert.equal(mentalHit.battle.units[1].sanity, 0);
assert.equal(mentalHit.battle.units[1].lifeSave.strongLeft, 1);
assert.equal(mentalHit.battle.units[1].hp, 100);
assert.equal(mentalHit.battle.units[0].kills, 0);
const missingMaximum = { ...target, hp: 0, maxHp: 0 };
assert.equal(formulas.healing(battle, actor, missingMaximum, { healAmt: .2 }).amount, 0);
const legacy = structuredClone(data);
delete legacy.cryptLord.teamBattle.formulas;
assert.equal(engine.options(legacy).find(row => row.id === 'basic').power,
  legacy.cryptLord.teamBattle.units[0].power);
assert.equal(engine.action(legacy, { id: 'skill:能力:0', target: '敌人' }).ok, true);
delete modules['cryptLord.battleFormulas'];
const unchanged = JSON.stringify(data);
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
assert.equal(JSON.stringify(data), unchanged);
console.log('PASS battle-formulas: original calculator parity, deterministic floor state, movement and legacy compatibility');
