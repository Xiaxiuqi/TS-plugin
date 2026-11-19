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
  'battle-terrain-presets', 'natural-environment', 'battlefield-painter',
  'personal-battle-state', 'battle-formulas', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-events', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], events = modules['cryptLord.battleEvents'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = (sequence, speed = 20) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 10000, 当前灵性: 10000, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1, 序列能力列表: {},
});
function start(sequence = '序列4-水手') {
  const result = engine.start({ stat_data: card(sequence, 200),
    npc_data: { 敌甲: card('序列5-猎人'), 敌乙: card('序列5-猎人', 1) } },
  { enemies: ['敌甲', '敌乙'], seed: 456 });
  assert.equal(result.ok, true, result.error); return result.data;
}
const phase = data => { data.cryptLord.teamBattle.phase = 'tactic'; return data; };
const bOf = data => data.cryptLord.teamBattle;
const cast = (data, subtype) => {
  const result = engine.battleEvent(phase(data), subtype, () => .9);
  assert.equal(result.ok, true, result.error); return result.data;
};

// Verify the generated manager remains a literal extraction of the entire original manager.
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b2-js-aura-and-grazing-projection.txt',
  import.meta.url), 'utf8');
const body = source.slice(source.indexOf('const BattleEventManager ='),
  source.indexOf("console.log('[战斗系统] BattleEventManager")).trim();
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
assert.ok(generated.includes(body));
for (const [sequence, count] of [['序列4-水手', 2], ['序列5-水手', 0],
  ['序列2-水手', 2], ['序列4-猎人', 0]]) {
  const data = phase(start(sequence));
  assert.equal(engine.battleEventOptions(data).length, count);
}
let data = phase(start()), battle = bOf(data);
const pristine = JSON.stringify(data), options = engine.battleEventOptions(data);
assert.equal(options.length, 2);
const averages = modules['cryptLord.battleFieldEffectReference'].averages()['4'];
assert.equal(options[0].cost, Math.round(averages.灵性 * .05));
assert.equal(options[1].cost, Math.round(averages.灵性 * .1));
assert.equal(options[0].power, Math.round(averages.活力 * .05));
assert.equal(options[1].power, Math.round(averages.活力 * .1));
events.statusLines(battle); engine.get(data);
assert.equal(JSON.stringify(data), pristine);
assert.equal(engine.battleEvent(data, '__proto__').ok, false);
assert.equal(JSON.stringify(data), pristine);

// Registration is free of damage, engine round-start ticks exactly once, reloads preserve quota and RNG.
const player = battle.units[0];
let registered = events.attempt(battle, player, '制造雷暴', data);
assert.equal(registered.ok, true);
assert.equal(battle.units[1].hp, 10000);
assert.equal(battle.battleEvent.processes[0].leftRounds, 3);
assert.equal(player.spirit, 10000 - options[0].cost);
assert.equal(events.attempt(battle, player, '制造雷暴', data).ok, false);
let reloaded = plain(data);
const next = engine.tactic(data, 'skip', () => .9);
const restored = engine.tactic(reloaded, 'skip', () => .9);
assert.equal(next.ok, true, next.error); assert.equal(restored.ok, true, restored.error);
assert.deepEqual(next.battle.units.map(row => row.hp), restored.battle.units.map(row => row.hp));
assert.equal(next.battle.formulas.seed, restored.battle.formulas.seed);
assert.equal(next.battle.battleEvent.processes[0].leftRounds, 2);
assert.equal(next.battle.units.slice(1).reduce((sum, row) => sum + row.hp, 0),
  20000 - options[0].power);
data = next.data;
for (let i = 0; i < 2; i++) {
  phase(data);
  const result = engine.tactic(data, 'skip', () => .9);
  assert.equal(result.ok, true, result.error); data = result.data;
}
assert.equal(bOf(data).battleEvent.processes.length, 0);
assert.equal(bOf(data).units.slice(1).reduce((sum, row) => sum + row.hp, 0),
  20000 - options[0].power * 3);
assert.equal(bOf(data).log.filter(row => /雷云散去了/u.test(row.message)).length, 1);
assert.equal(engine.battleEvent(phase(data), '制造雷暴').ok, false);
data = cast(data, '制造地震');
assert.equal(bOf(data).battleEvent.processes[0].leftRounds, 1);

// Positive spirit suffices even below fee, zero spirit / away actors / wrong phase are rejected.
data = phase(start()); battle = bOf(data); battle.units[0].spirit = 1;
data = cast(data, '制造雷暴'); assert.equal(bOf(data).units[0].spirit, 0);
assert.equal(engine.battleEvent(phase(data), '制造地震').ok, false);
data = phase(start()); battle = bOf(data); battle.units[0].activeLeaving = true;
assert.equal(engine.battleEvent(data, '制造雷暴').ok, false);
assert.equal(engine.battleEvent(start(), '制造雷暴').ok, false);

// Frozen source strength/team survives death and conversion; live victim allegiance and absence are current.
data = phase(start()); battle = bOf(data);
events.attempt(battle, battle.units[0], '制造雷暴', data);
const power = battle.battleEvent.processes[0].power;
battle.units[0].hp = 0; battle.units[0].side = 'enemy'; battle.units[0].sequence = '普通人';
battle.units[1].side = 'ally';
events.tick(battle, () => .5);
assert.equal(battle.units[1].hp, 10000); assert.equal(battle.units[2].hp, 10000 - power);
battle.units[2].offField = true;
events.tick(battle, () => .5); events.tick(battle, () => .5);
assert.equal(battle.battleEvent.processes.length, 0);
assert.equal(battle.units[2].hp, 10000 - power);
assert.equal(battle.log.filter(row => /没有找到/u.test(row.message)).length, 2);

// Earthquake center uses two RNG draws, Chebyshev radius includes boundary and self, excludes absent.
data = phase(start()); battle = bOf(data);
events.attempt(battle, battle.units[0], '制造地震', data);
const quakePower = battle.battleEvent.processes[0].power;
Object.assign(battle.units[0], { x: 6, y: 5 });
Object.assign(battle.units[1], { x: 9, y: 8 });
Object.assign(battle.units[2], { x: 10, y: 9 });
let draws = 0;
events.tick(battle, () => { draws++; return .5; });
assert.equal(draws, 2);
assert.equal(battle.units[0].hp, 10000 - quakePower);
assert.equal(battle.units[1].hp, 10000 - quakePower);
assert.equal(battle.units[2].hp, 10000);
assert.equal(battle.units[0].lastDamagedRound, battle.round);
const last = battle.log.slice(-4).map(row => row.message);
assert.match(last[0], /大地.*卷了进去/u); assert.match(last[1], /中心 \(6, 5\)/u);
assert.ok(!battle.log.some(row => /undefined/u.test(row.message)));
Object.assign(battle.units[0], { activeLeaving: true });
Object.assign(battle.units[1], { exiled: true });
events.tick(battle, () => .5);
assert.equal(battle.battleEvent.processes.length, 0);
assert.equal(battle.units[0].hp, 10000 - quakePower);

// Full life-save precedes effect-transfer; no defense, critical, or attack-tag calculations.
data = phase(start()); battle = bOf(data);
const victim = battle.units[1];
Object.assign(victim, { hp: 10, maxHp: 1000,
  lifeSave: { strongLeft: 1, weakLeft: 0, strongUsed: 0, strongName: '屏障' } });
const damage = amount => fields.withRuntime(battle, data, () => .5, rt =>
  rt.battleEvent.hurt(rt.bm, rt.heroes[1], amount));
let hit = damage(500);
assert.equal(hit.dealt, 0); assert.equal(hit.ls.triggered, true);
assert.equal(victim.hp, 10); assert.equal(victim.lifeSave.strongLeft, 0);
assert.equal(victim.lastDamagedRound, undefined);
Object.assign(victim, { hp: 1000, maxHp: 1000,
  lifeSave: { strongLeft: 0, weakLeft: 1, strategy: { stages: [{ damageOverMaxRatio: .1 }] } } });
hit = damage(300); assert.equal(hit.dealt, 100); assert.equal(victim.hp, 900);
assert.equal(victim.lifeSave.weakLeft, 0);
assert.equal(victim.lastDamagedRound, battle.round);
victim.hp = 10000; victim.maxHp = 10000;
battle.effectTransfer.relations[victim.id] = { id: 'test', casterId: victim.id,
  targetId: battle.units[2].id, subtype: '诅咒之源', shownAs: '诅咒之源',
  direction: 'outgoing', activeFromRound: battle.round, expireAfterRound: battle.round + 3 };
const transferred = damage(100);
assert.equal(transferred.dealt, 100);
assert.equal(battle.units[2].hp, 9900);

// NPC shares legal subtype/quota and occupancy; dead/off-field/controlled units never launch.
data = phase(start()); battle = bOf(data);
battle.units[1].sequence = '序列4-水手'; battle.units[2].sequence = '序列4-水手';
battle.units[2].activeLeaving = true;
let outcomes = events.npc(battle, data, [battle.units[1].id], () => 0);
assert.equal(outcomes.length, 0);
outcomes = events.npc(battle, data, [], () => 0);
assert.equal(outcomes.length, 1);
assert.equal(outcomes[0].actor, battle.units[1].id);
assert.equal(battle.battleEvent.processes.length, 1);
assert.equal(events.npc(battle, data, [], () => .9).length, 0);

// Lethal first tick ends the battle before action queue; native snapshot costs and cleanup are durable.
data = phase(start()); battle = bOf(data);
battle.units[1].hp = 1; battle.units[2].hp = 0;
data = cast(data, '制造雷暴'); battle = bOf(data);
assert.equal(battle.status, 'finished'); assert.equal(battle.result, 'victory');
assert.equal(battle.battleEvent.processes.length, 0);
assert.equal(data.stat_data.当前灵性, battle.units[0].spirit);
assert.ok(engine.report(data).battle.log.some(row => /雷/u.test(row.message)));
const settled = engine.settle(data, battle.id, false);
assert.equal(settled.ok, true, settled.error);
data = phase(start());
const savedModule = modules['cryptLord.battleEvents']; delete modules['cryptLord.battleEvents'];
assert.match(engine.battleEvent(data, '制造雷暴').error, /模块不可用/u);
modules['cryptLord.battleEvents'] = savedModule;
console.log('PASS: complete original thunderstorm/earthquake rules, lifecycle, NPC, protections and native-state transaction.');
