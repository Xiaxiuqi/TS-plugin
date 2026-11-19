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
  'battle-effect-transfer', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const transfer = modules['cryptLord.battleEffectTransfer'];
const fields = modules['cryptLord.battleFieldEffects'];
const engine = modules['cryptLord.teamBattleState'];
const plain = value => JSON.parse(JSON.stringify(value));
const unit = (id, side, sequence = '普通人') => ({
  id, name: id, side, source: id === 'player' ? 'player' : 'npc', sequence,
  rank: Number(sequence.match(/序列(\d+)/u)?.[1] || 10),
  hp: 1000, maxHp: 1000, spirit: id === 'player' ? 10000 : 100,
  maxSpirit: 10000, humanity: 100, maxHumanity: 100,
  sanity: 100, maxSanity: 100, agility: 100, maxAgility: 100,
  luck: 10, divinity: 1, x: side === 'ally' ? 0 : 2, y: 0, effects: [],
});
const battle = (sequence = '序列4-律师') => {
  const b = { round: 1, log: [], units: [unit('player', 'ally', sequence),
    unit('敌', 'enemy'), unit('敌乙', 'enemy')] };
  transfer.initialize(b);
  return b;
};
const bind = (b, subtype = '扭曲：扭曲目标', actor = b.units[0], target = '敌') => {
  const rolls = [.99, 0];
  const out = transfer.attempt(b, actor, subtype, target, {}, () => rolls.shift());
  assert.equal(out.applied, true, JSON.stringify(out));
  return out;
};
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b1-js-mystery-sleep-and-effect.txt',
  import.meta.url), 'utf8');
const oracle = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const EffectTransferManager ='),
  source.indexOf('window.EffectTransferManager =')) +
  '\nthis.rules = EffectTransferManager.SUBTYPES;', oracle);
assert.deepEqual(plain(transfer.defaults()), plain(oracle.rules));

// Full catalog, matched pathway rank, fees, failed refresh and theoretical gate.
let b = battle('序列2-律师 / 序列4-囚犯');
assert.equal(transfer.options(b, b.units[0]).length, 3);
bind(b, '诅咒之源');
assert.equal(b.effectTransfer.relations.player.direction, 'bidirectional');
b = battle('序列3-囚犯');
bind(b, '诅咒之源');
assert.equal(b.effectTransfer.relations.player.direction, 'caster-to-target');
for (const title of ['失序者', '恶魔之父'])
  assert.ok(transfer.options(battle(title), battle(title).units[0]).length > 0);
b = battle();
const fee = transfer.preview(b, b.units[0], '扭曲：扭曲目标', '敌').cost;
bind(b);
assert.equal(b.units[0].spirit, 10000 - fee);
const old = plain(b.effectTransfer.relations.player);
b.units[0].spirit = 1000 + fee;
const rolls = [0, .999];
const failure = transfer.attempt(b, b.units[0], '扭曲：扭曲目标', '敌乙', {}, () => rolls.shift());
assert.equal(failure.ok, true);
assert.equal(failure.applied, false);
assert.equal(b.units[0].spirit, 1000);
assert.deepEqual(plain(b.effectTransfer.relations.player), old);
b.units[0].spirit = 1;
b.units[0].humanity = 0;
assert.equal(transfer.attempt(b, b.units[0], '扭曲：扭曲目标', '敌', {}, () => 0).ok, false);

// Pending, all five resources, ceil split, clamp, nonrecursive links and expiry.
b = battle();
bind(b);
assert.equal(transfer.loss(b, b.units[0], '当前活力', 11).transfers.length, 0);
b.round = 2;
for (const [stat, key] of Object.entries({ 当前活力: 'hp', 当前敏捷: 'agility',
  当前灵性: 'spirit', 当前理智: 'sanity', 当前人性: 'humanity' })) {
  b.units[0][key] = 100;
  b.units[1][key] = 100;
  const loss = transfer.loss(b, b.units[0], stat, 11);
  assert.equal(loss.actualDamage, 6);
  assert.equal(loss.transfers[0].damage, 6);
}
b.units[0].hp = 5;
assert.equal(transfer.loss(b, b.units[0], '当前活力', 100).actualDamage, 3);
b.units[1].offField = true;
assert.equal(transfer.loss(b, b.units[0], '当前活力', 1).transfers.length, 1);
assert.ok(transfer.statusLines(b, b.units[0]).length);
for (const round of [2, 3]) {
  b.round = round; transfer.sweep(b, true);
  assert.ok(b.effectTransfer.relations.player);
}
b.round = 4;
assert.equal(transfer.loss(b, b.units[0], '当前理智', 1).transfers.length, 1);
transfer.sweep(b, true);
assert.equal(b.effectTransfer.relations.player, undefined);
b = battle('序列4-囚犯');
b.units[1].sequence = '序列4-囚犯';
b.units[1].spirit = 10000;
b.units[0].hp = 100;
bind(b, '诅咒之源');
bind(b, '诅咒之源', b.units[1], 'player');
b.round = 2;
b.units[1].hp = 500;
const lethal = transfer.loss(b, b.units[0], '当前活力', 1000);
assert.equal(lethal.transfers.length, 2);
assert.equal(b.units[1].hp, 300);
assert.equal(b.units[0].hp, 0);
assert.equal(Object.keys(b.effectTransfer.relations).length, 0);
b = battle('序列4-囚犯');
bind(b, '诅咒之源');
b.round = 2;
b.units[1].hp = 10;
modules['cryptLord.battleLifeSave'].initialize(b.units[1], '序列5-囚犯', '囚犯');
b.units[1].lifeSave.strongLeft = 1;
assert.equal(transfer.loss(b, b.units[0], '当前活力', 100).transfers[0].damage, 0);
assert.equal(b.units[1].hp, 10);
assert.equal(b.units[1].lifeSave.strongLeft, 0);

// External poison is distributed once; unrelated buffs/internal effects stay local.
b = battle();
bind(b);
b.round = 2;
const poison = { name: '外来毒伤', type: 'poison', stat: '当前活力', power: 11,
  duration: 3, valueType: 'fixed', terrainSource: true, fieldEffectId: 'origin',
  fieldEffectUntil: 5 };
const store = (hero, effect) => { hero.effects.push(effect); return true; };
assert.equal(transfer.routeEffect(b, b.units[0], poison, { transferableExternal: true }, store), true);
assert.equal(b.units[0].effects[0].power, 6);
assert.equal(b.units[1].effects[0].duration, 2);
assert.equal(b.units[1].effects[0].fieldEffectUntil, 4);
assert.equal(b.units[1].effects[0].terrainSource, undefined);
assert.equal(b.units[1].effects[0].fieldEffectId, undefined);
assert.equal(b.units[1].effects[0].effectTransferDerived, true);
assert.equal(b.units[0].effects[0].effectTransferResolved, true);
assert.equal(transfer.loss(b, b.units[0], '当前活力', 6,
  { derived: b.units[0].effects[0].effectTransferResolved }).transfers.length, 0);
transfer.routeEffect(b, b.units[0], { ...poison, name: '内生', type: 'debuff' }, {}, store);
assert.equal(b.units[1].effects.length, 1);
assert.ok(b.log.some(row => row.fieldEffect && /外来毒伤/u.test(row.message)));
b = battle('序列4-囚犯');
bind(b, '诅咒之源'); b.round = 2;
transfer.routeEffect(b, b.units[1], poison, { transferableExternal: true }, store);
assert.equal(b.units[0].effects[0].power, 11);

// Gift all eligible effects, preserve system state, dissipate conflicts and recalc without refill.
b = battle();
b.units[0].effects = [
  { name: '六维下降', type: 'debuff', stat: '灵性', power: 10, duration: 3, valueType: 'percentage' },
  { ...poison, name: '普通毒伤', terrainSource: false, fieldEffectId: undefined },
  { ...poison, name: '系统同名', terrainSource: false },
  { ...poison, name: '系统状态', statusDerived: true },
  { ...poison, name: '光环', auraEffect: true },
  { ...poison, name: '已分配', effectTransferResolved: true },
];
b.units[1].effects = [{ ...poison, name: '系统同名', battlePersistent: true }];
engine.recalculateAttributes(b.units[0]);
assert.equal(b.units[0].maxSpirit, 9000);
const gift = bind(b, '赠予负面效果');
assert.deepEqual(plain(gift.results[0].accepted), ['六维下降', '普通毒伤']);
assert.deepEqual(plain(gift.results[0].dissipated), ['系统同名']);
assert.equal(b.units[0].effects.length, 3);
assert.equal(b.units[0].maxSpirit, 10000);
assert.ok(b.units[0].spirit < 9000);
assert.equal(b.units[1].maxSpirit, 9000);
assert.equal(Object.keys(b.effectTransfer.relations).length, 0);
assert.doesNotThrow(() => JSON.stringify(b));
for (const [power, duration, accepted] of [[30, 1, false], [11, 1, true], [11, 5, false]]) {
  b = battle();
  b.units[0].effects = [{ ...poison, terrainSource: false, power: 11, duration: 3 }];
  b.units[1].effects = [{ ...poison, terrainSource: false, power, duration }];
  const out = bind(b, '赠予负面效果');
  assert.equal(out.results[0].accepted.length > 0, accepted);
  assert.equal(b.units[0].effects.length, 0);
}
// The field manager's original delivery sink shares the same transfer relation.
b = battle('序列4-律师 / 序列5-通识者');
bind(b); b.round = 2;
b.units[1].sequence = '序列6-律师';
b.units[1].spirit = 100000;
assert.equal(fields.attempt(b, b.units[1], '扭曲：防守漏洞', 'player', {}, () => .5).ok, true);
assert.ok(b.units[0].effects.some(row => row.fieldEffect));
assert.ok(b.units[1].effects.some(row => row.effectTransferDerived));
const father = battle('恶魔之父');
const fatherFee = fields.withRuntime(father, {}, undefined, rt =>
  rt.transfer.costOf(rt.heroes[0]));
assert.equal(fatherFee, Math.max(1, Math.round(
  modules['cryptLord.battleFieldEffectReference'].averages()['-1'].灵性 * .05)));

// NPC exclusion/no ongoing refresh; previews must not advance RNG or write data.
b = battle();
b.units[1].sequence = '序列3-囚犯';
b.units[1].spirit = 100000;
assert.equal(transfer.npc(b, {}, ['敌'], () => 0).length, 0);
assert.equal(transfer.npc(b, {}, [], () => 0).length, 1);
assert.equal(transfer.npc(b, {}, [], () => 0).length, 0);
b = JSON.parse(JSON.stringify(b));
const before = JSON.stringify(b);
transfer.options(b, b.units[0]); transfer.preview(b, b.units[0], '扭曲：扭曲目标', '敌');
transfer.statusLines(b, b.units[0]);
assert.equal(JSON.stringify(b), before);
b = battle();
const resumedBattle = JSON.parse(JSON.stringify(b));
assert.deepEqual(plain(transfer.attempt(b, b.units[0], '扭曲：扭曲目标', '敌')),
  plain(transfer.attempt(resumedBattle, resumedBattle.units[0], '扭曲：扭曲目标', '敌')));
assert.equal(b.fieldEffectMeta.seed, resumedBattle.fieldEffectMeta.seed);
const special = battle();
special.units[0].id = 'constructor';
special.units[1].id = '__proto__';
bind(special, '扭曲：扭曲目标', special.units[0], '__proto__');
assert.equal(JSON.parse(JSON.stringify(special)).effectTransfer.relations.constructor.targetId, '__proto__');

// Native-floor transaction, reload, direct damage attribution and missing-module guard.
const card = (sequence, speed) => ({ 当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 50000, 当前灵性: 50000, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 敏捷: speed, 当前敏捷: speed, 神性: 1 });
let data = engine.start({ stat_data: { ...card('序列4-囚犯', 100),
  序列能力列表: { 能力: [{ 名称: '远击', power: 100, range: 'global' }] } },
  npc_data: { 敌: { ...card('普通人', 1), 灵性: 20, 当前灵性: 20 } } },
{ enemies: ['敌'], seed: 123 }).data;
data = engine.advanceAuto(engine.action(data, { type: 'wait' }, () => .99).data).data;
const saved = JSON.stringify(data);
assert.ok(engine.effectTransferOptions(data).length);
const applied = engine.effectTransfer(data, { subtype: '诅咒之源', target: '敌' }, () => .5);
assert.equal(applied.ok, true);
assert.equal(applied.battle.round, 2);
assert.equal(JSON.stringify(data), saved);
assert.equal(applied.data.stat_data.当前灵性, applied.battle.units[0].spirit);
data = JSON.parse(JSON.stringify(applied.data));
assert.deepEqual(plain(engine.get(data)), plain(applied.battle));
const hit = engine.action(data, { id: 'skill:能力:0', target: '敌' }, () => .5);
assert.equal(hit.ok, true, hit.error);
assert.ok(hit.battle.units[0].hp < applied.battle.units[0].hp);
assert.ok(hit.battle.log.some(row => row.transferred && row.actor === 'player'));
delete modules['cryptLord.battleEffectTransfer'];
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
assert.ok(fields);
console.log('PASS effect transfer: catalog/contests, lifecycle/resources, lethal/life-save routing, external poison, gifting/recalc, NPC/read purity, native transaction');
