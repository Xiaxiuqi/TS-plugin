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
  'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const fields = modules['cryptLord.battleFieldEffects'];
const ref = modules['cryptLord.battleFieldEffectReference'];
const engine = modules['cryptLord.teamBattleState'];
const formulas = modules['cryptLord.battleFormulas'];
const plain = value => JSON.parse(JSON.stringify(value));
const unit = (id, side, sequence, rank, x) => ({ id, side, sequence, rank,
  source: id === 'player' ? 'player' : 'npc', name: id, x, y: 0,
  hp: id === 'player' ? 10000 : 1000, maxHp: 10000,
  spirit: id === 'player' ? 5000 : 20, maxSpirit: 5000,
  sanity: id === 'player' ? 1000 : 30, maxSanity: 1000,
  humanity: id === 'player' ? 2000 : 10, maxHumanity: 2000,
  agility: 100, maxAgility: 100, luck: 20, divinity: 1, effects: [] });
const battle = (sequence = '序列6-律师', rank = 6) => ({ round: 1, log: [],
  units: [unit('player', 'ally', sequence, rank, 0),
    unit('友', 'ally', '普通人', 10, 1), unit('敌', 'enemy', '普通人', 10, 2)],
  formulas: formulas.initialize(123) });

// Load the source object itself as an independent configuration oracle.
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b1-js-mystery-sleep-and-effect.txt',
  import.meta.url), 'utf8');
const oracle = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const FieldEffectManager ='),
  source.indexOf("console.log('[战斗系统] FieldEffectManager")) +
  '\nthis.rules = FieldEffectManager.SUBTYPES;', oracle);
assert.deepEqual(plain(fields.defaults()), plain(oracle.rules));
const defaults = fields.defaults();
// Cover the entire manager's ability catalog, not a single solar subtype.
for (const [subtype, cfg] of Object.entries(defaults)) {
  const rank = cfg.rankAtLeast ?? (cfg.names ? Math.max(...cfg.names.map(row => row.gate)) : 4);
  const b = battle(`序列${rank}-${cfg.pathway}`, rank), actor = b.units[0];
  const data = { stat_data: { $专属玩法: { 窥秘人途径: { 神秘再现玩法: {
    法术解锁账本: cfg.catalogId ? { [cfg.catalogId]: {} } : {},
  } } } } };
  if (cfg.catalogId) Object.assign(actor, { sequence: '序列4-窥秘人', rank: 4 });
  const choice = fields.options(b, actor, data).find(row => row.subtype === subtype);
  assert.ok(choice, subtype);
  const picked = cfg.pick === 'ally' ? '友' : cfg.pick === 'any' ? 'player' : '敌';
  const out = fields.attempt(b, actor, subtype, picked, data, () => .5);
  assert.equal(out.ok, true, subtype);
  assert.ok(out.results.length > 0, subtype);
  assert.ok(actor.spirit < 5000, subtype);
  assert.doesNotThrow(() => JSON.stringify(b));
}

// Same-channel dedup, rank bands, mixed pathways, fees and per-battle quotas.
let b = battle('序列5-歌颂者', 5);
assert.ok(fields.options(b, b.units[0]).some(row => row.subtype === '太阳光环'));
assert.ok(!fields.options(b, b.units[0]).some(row => row.subtype === '太阳歌颂'));
b = battle('序列0-律师 / 序列4-歌颂者', 0);
const hints = fields.options(b, b.units[0]);
assert.ok(!hints.some(row => row.subtype === '正义光环'));
assert.ok(hints.some(row => row.subtype === '太阳光环'));
b = battle('序列5-萨满', 5);
const cost = fields.options(b, b.units[0]).find(row => row.subtype === '画中世界降临').cost;
assert.equal(cost, Math.round(ref.averages()['5'].灵性 * .05));
assert.equal(fields.attempt(b, b.units[0], '画中世界降临', null, {}, () => .5).ok, true);
assert.ok(!fields.options(b, b.units[0]).some(row => row.subtype === '画中世界降临'));
b = battle('序列6-律师', 6);
assert.equal(fields.attempt(b, b.units[0], '扭曲：防守漏洞', '敌', {}, () => .5).ok, true);
const effect = b.units[2].effects[0];
const fee = fields.options(b, b.units[0]).find(row => row.subtype === '扭曲：防守漏洞').cost;
const before = b.units[0].spirit;
fields.attempt(b, b.units[0], '扭曲：防守漏洞', '敌', {}, () => .5);
assert.equal(b.units[0].spirit, before - fee);
assert.equal(b.units[2].effects.length, 1);
assert.equal(b.units[2].effects[0].fieldEffectId, effect.fieldEffectId);
b.round = effect.fieldEffectUntil;
fields.sweep(b);
assert.equal(b.units[2].effects.length, 1);
b.round++;
fields.sweep(b);
assert.equal(b.units[2].effects.length, 0);
b = battle('序列6-律师', 6);
b.units[0].spirit = 1;
b.units[0].humanity = 0;
b.units[2].spirit = 100000;
const lost = fields.attempt(b, b.units[0], '扭曲：攻势偏离', '敌', {}, () => .5);
assert.equal(lost.ok, true);
assert.equal(lost.results.length, 0);
assert.equal(b.units[0].spirit, 0);
b = battle('序列5-通识者', 5);
fields.attempt(b, b.units[0], '星之诅咒创伤', '敌', {}, () => .5);
const hp = b.units[2].hp;
b.round++;
fields.sweep(b);
assert.equal(b.units[2].hp, hp);
fields.turnStart(b, b.units[2]);
assert.equal(b.units[2].effects[0].duration, 1);
assert.equal(b.units[2].hp, hp - Math.round(ref.averages()['5'].活力 * .05));
fields.turnStart(b, b.units[2]);
assert.equal(b.units[2].effects.length, 0);

// Target interference survives exactly the original action/round lifecycle.
b = battle('序列5-律师', 5);
fields.attempt(b, b.units[0], '扭曲：目标错认', '敌', {}, () => .5);
assert.ok(b.targetInterference.misrecognition.敌);
const choice = { name: '打击', power: 10, heal: 0, range: 10, targetType: 'single' };
const redirect = fields.redirect(b, b.units[2], b.units[0], choice, {}, () => .5);
assert.equal(redirect.targets.length, 0);
assert.ok(!b.targetInterference.misrecognition.敌);
fields.attempt(b, b.units[0], '混乱：目标失序', '敌', {}, () => .5);
b.round++;
fields.sweep(b);
assert.ok(b.targetInterference.chaos.敌);
fields.endRound(b);
assert.ok(!b.targetInterference.chaos.敌);
b = battle('序列4-秘祈人', 4);
fields.attempt(b, b.units[0], '灵肉之刃', null);
const paid = b.units[0].spirit;
assert.equal(fields.attempt(b, b.units[0], '灵肉之刃', null).ok, false);
assert.equal(b.units[0].spirit, paid);
b.units[2].effects = [{ type: 'buff', stat: 'defense', valueType: 'percentage', power: 100 },
  { type: 'debuff', stat: 'defense', valueType: 'percentage', power: 20 }];
const originalEffects = structuredClone(b.units[2].effects);
const skill = { power: 1 };
const normal = formulas.damage(b, b.units[0], b.units[2], skill, () => .5);
const pierced = formulas.damage(b, b.units[0], b.units[2], skill, () => .5,
  { ignoreDefenseBuff: true });
assert.ok(pierced.amount > normal.amount);
assert.deepEqual(b.units[2].effects, originalEffects);
b.units[1].id = '__proto__';
b.units[0].id = 'constructor';
fields.initialize(b);
assert.equal(fields.pending(b, b.units[0]), undefined);
assert.equal(fields.attempt(b, b.units[0], '灵肉之刃', null).ok, true);
assert.equal(fields.pending(JSON.parse(JSON.stringify(b)), b.units[0]).subtype, '灵肉之刃');
assert.equal(fields.attempt(b, b.units[0], 'constructor', null).ok, false);
// Knowledge/counterpart groups and the hindrance channel retain original multipliers.
b = battle('序列4-律师', 4);
fields.attempt(b, b.units[0], '扭曲：阻碍行动', '敌', {}, () => .5);
assert.equal(fields.tacticMultiplier(b, b.units[2], b.units[0]), .85);
b.units[2].sequence = '序列4-阅读者 / 序列2-通识者';
assert.equal(fields.tacticMultiplier(b, b.units[2], b.units[0]), 1.1 * .85);
b.units[0].sequence = '序列5-歌颂者 / 序列6-战士';
b.units[2].sequence = '序列5-收尸人';
assert.equal(fields.tacticMultiplier(b, b.units[0], b.units[2]), 1.3);
// NPC actions are worthwhile, pay once, and cannot overwrite a prior tactical action.
b = battle('序列6-律师', 6);
b.units[2].sequence = '序列5-歌颂者';
b.units[2].rank = 5;
b.units[2].spirit = 1000;
assert.equal(fields.npc(b, {}, ['敌'], () => 0).length, 0);
const npcs = fields.npc(b, {}, [], () => 0);
assert.equal(npcs.length, 1);
assert.ok(b.units[2].effects.some(row => row.fieldEffect));
const storedNpc = JSON.parse(JSON.stringify(b)), beforeRead = JSON.stringify(storedNpc);
fields.options(storedNpc, storedNpc.units[0]);
assert.equal(JSON.stringify(storedNpc), beforeRead);
fields.finish(storedNpc);
assert.deepEqual(plain(storedNpc.targetInterference), { misrecognition: {}, chaos: {} });

// Native-floor operation is pure until committed, then advances one tactic stage.
const card = (sequence, speed) => ({ 当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 5000, 当前灵性: 5000, 理智: 1000, 当前理智: 1000,
  人性: 2000, 当前人性: 2000, 敏捷: speed, 当前敏捷: speed, 神性: 1 });
const input = { stat_data: card('序列5-通识者', 100),
  npc_data: { 敌: card('普通人', 1) } };
Object.assign(input.stat_data, { 灵性: 50000, 当前灵性: 50000 });
let data = engine.start(input, { enemies: ['敌'], seed: 123 }).data;
data = engine.advanceAuto(engine.action(data, { type: 'wait' }, () => .99).data).data;
assert.equal(data.cryptLord.teamBattle.phase, 'tactic');
const unchanged = JSON.stringify(data);
assert.ok(engine.fieldEffectOptions(data).length);
assert.equal(JSON.stringify(data), unchanged);
const applied = engine.fieldEffect(data, { subtype: '星之诅咒创伤', target: '敌' }, () => .5);
assert.equal(applied.ok, true);
assert.equal(applied.battle.round, 2);
assert.equal(applied.battle.phase, 'action');
assert.ok(applied.battle.units[1].effects.some(row => row.fieldEffect));
assert.equal(JSON.stringify(data), unchanged);
assert.equal(applied.battle.units[1].hp, 10000);
const resumed = JSON.parse(JSON.stringify(applied.data));
assert.deepEqual(plain(engine.get(resumed)), plain(engine.get(applied.data)));
const tick = engine.advanceAuto(engine.action(resumed, { type: 'wait' }, () => .99).data);
assert.equal(tick.battle.units[1].hp, 10000 - Math.round(ref.averages()['5'].活力 * .05));
assert.equal(tick.battle.units[1].effects.find(row => row.fieldEffect).duration, 1);
const pathwayInput = structuredClone(input);
pathwayInput.stat_data.当前序列 = '序列5-天文学家 / 序列4-黑骑士';
const named = engine.start(pathwayInput, { enemies: ['敌'], seed: 123, pathways: {
  通识者途径: ['序列5-天文学家'], 秘祈人途径: ['序列4-黑骑士'],
} }).data;
named.cryptLord.teamBattle.phase = 'tactic';
assert.ok(engine.fieldEffectOptions(named).some(row => row.subtype === '星之诅咒创伤'));
assert.ok(engine.fieldEffectOptions(named).some(row => row.subtype === '灵肉之刃'));
const namedSnapshot = JSON.parse(JSON.stringify(named));
assert.deepEqual(plain(engine.fieldEffectOptions(namedSnapshot)), plain(engine.fieldEffectOptions(named)));
const tiered = battle('序列1-歌颂者 / 序列4-律师', 1);
const hinder = fields.preview(tiered, tiered.units[0], '扭曲：阻碍行动', '敌');
assert.equal(hinder[0].power, 15);
// Redirection uses the real native attack path, including paid fizzles and missed blades.
const combatInput = structuredClone(input);
combatInput.stat_data.当前序列 = '序列4-秘祈人';
combatInput.stat_data.序列能力列表 = { 能力: [{ 名称: '攻击', power: 1, range: 'global',
  灵性消耗: 2, effects: [{ name: '不会空放', type: 'buff', stat: 'attack', power: 20,
    duration: 1, effectTarget: 'self', valueType: 'percentage' }] }] };
combatInput.npc_data.友 = card('普通人', 1);
let combat = engine.start(combatInput, { allies: ['友'], enemies: ['敌'], seed: 123 }).data;
fields.attempt(combat.cryptLord.teamBattle, combat.cryptLord.teamBattle.units[0], '灵肉之刃', null);
combat.cryptLord.teamBattle.targetInterference.misrecognition.player = { sourceId: '敌' };
const wrong = engine.action(combat, { id: 'skill:能力:0', target: '敌' }, () => .5);
assert.equal(wrong.ok, true);
assert.ok(wrong.battle.log.some(row => row.target === '友' && row.damage > 0));
assert.equal(wrong.battle.units[2].hp, 10000);
assert.equal(wrong.battle.fieldEffect.nextAttack.player, undefined);
combat = engine.start(combatInput, { enemies: ['敌'], seed: 123 }).data;
fields.attempt(combat.cryptLord.teamBattle, combat.cryptLord.teamBattle.units[0], '灵肉之刃', null);
combat.cryptLord.teamBattle.targetInterference.misrecognition.player = { sourceId: '敌' };
const fizzle = engine.action(combat, { id: 'skill:能力:0', target: '敌' }, () => .5);
assert.equal(fizzle.battle.units[0].spirit, combat.cryptLord.teamBattle.units[0].spirit - 2);
assert.equal(fizzle.battle.units[0].effects.length, 0);
assert.equal(fizzle.battle.fieldEffect.nextAttack.player.subtype, '灵肉之刃');
combat.cryptLord.teamBattle.targetInterference.misrecognition = {};
modules['cryptLord.battleFormulas'] = { ...formulas, accuracy: () => 0 };
const miss = engine.action(combat, { id: 'skill:能力:0', target: '敌' }, () => .5);
assert.equal(miss.battle.units[1].hp, 10000);
assert.equal(miss.battle.fieldEffect.nextAttack.player, undefined);
modules['cryptLord.battleFormulas'] = formulas;
// A saved marked battle must not silently continue when its effect module is absent.
delete modules['cryptLord.battleFieldEffects'];
assert.equal(engine.action(named, { type: 'wait' }).ok, false);
console.log('PASS field effects: full original catalog, fees/dedup/quotas, split timing, interference/blade, native-floor persistence');
