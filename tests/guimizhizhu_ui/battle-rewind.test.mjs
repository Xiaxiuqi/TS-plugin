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
  'battle-field-effects', 'battle-effect-transfer', 'battle-events',
  'battle-rewind', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], rewind = modules['cryptLord.battleRewind'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = (sequence, speed = 20) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 10000, 当前灵性: 10000, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1,
  序列能力列表: {},
});
function start(sequence = '序列3-占卜家/序列1-偷盗者', enemy = '序列5-猎人') {
  const result = engine.start({ stat_data: card(sequence, 200),
    npc_data: { 敌甲: card(enemy), 敌乙: card('序列5-猎人', 1) } },
  { enemies: ['敌甲', '敌乙'], seed: 789 });
  assert.equal(result.ok, true, result.error); return result.data;
}
const phase = data => { data.cryptLord.teamBattle.phase = 'tactic'; return data; };
const bOf = data => data.cryptLord.teamBattle;
const restore = (data, subtype, round = 1) => {
  const result = engine.rewind(phase(data), { subtype, round }, () => .9);
  assert.equal(result.ok, true, result.error); return result.data;
};

// Both original paths, title and mixed-path gates; the reference contains the entire original manager.
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b2-js-aura-and-grazing-projection.txt',
  import.meta.url), 'utf8');
const body = source.slice(source.indexOf('const RewindManager ='),
  source.indexOf("console.log('[战斗系统] RewindManager")).trim();
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
assert.ok(generated.includes(body));
for (const [sequence, count] of [['序列3-占卜家', 1], ['序列4-占卜家', 0],
  ['序列1-偷盗者', 1], ['序列2-偷盗者', 0], ['诡秘之主', 2],
  ['序列3-占卜家/序列1-偷盗者', 2]]) {
  const data = phase(start(sequence));
  assert.equal(engine.rewindOptions(data)?.choices.length || 0, count);
}
let data = start(), battle = bOf(data), actor = battle.units[0];
assert.equal(Object.keys(battle.rewind.snapshots.player).length, 1);
assert.equal(battle.rewind.snapshots.player['1'].additionalStats.当前活力, 10000);
assert.equal(battle.rewind.snapshots.player['1'].additionalStats.活力, 10000);
assert.equal(battle.rewind.snapshots.player['1'].baseStats.灵性, 10000);
assert.equal(battle.rewind.snapshots.敌甲, undefined);
assert.equal(engine.rewind(data, { subtype: '时间权柄', round: 1 }).ok, false);
phase(data);
assert.match(engine.rewindOptions(data).reason, /相同/u);
assert.equal(engine.rewind(data, { subtype: '时间权柄', round: 1 }).ok, false);

// Zero sanity/spirit is permitted; restores all own stats, base and engine mirrors, not any effects or quotas.
Object.assign(actor, { hp: 1800, spirit: 0, sanity: 0, humanity: 40, agility: 50,
  maxHp: 4000, maxSpirit: 2000, maxSanity: 40, maxHumanity: 50, maxAgility: 70,
  baseAttributes: { 活力: 4000, 灵性: 2000, 理智: 40, 人性: 50, 敏捷: 70, 运气: 20 },
  divinity: 2, luck: 20, maxLuck: 20, x: 5, y: 6,
  effects: [{ name: '外来禁锢', stat: 'attack', type: 'debuff', power: 20, duration: 3 }],
  tags: [{ name: '灼烧', stacks: 2, duration: 3 }],
  skillControl: { banned: [{ name: '能力', until: 6 }], granted: [] },
  lifeSave: { strongLeft: 0, weakLeft: 1, strongUsed: 1, weakUsed: 2 },
  mythicFormUsed: true, controller: 'player' });
const immutableKeys = ['effects', 'tags', 'skillControl', 'lifeSave', 'mythicFormUsed', 'controller', 'side', 'x', 'y'];
const immutable = Object.fromEntries(immutableKeys.map(key => [key, plain(actor[key])]));
const pristine = JSON.stringify(data);
const choices = engine.rewindOptions(data);
assert.equal(choices.rounds[0].stats.当前理智, 100);
assert.equal(choices.rounds[0].vitalityDelta, 8200);
rewind.statusLines(battle, actor);
assert.equal(JSON.stringify(data), pristine);
for (const request of [{ subtype: '__proto__', round: 1 }, { subtype: '时间权柄', round: 99 },
  { subtype: '时间权柄', round: 1.5 }, { subtype: '时间权柄', round: '1' }])
  assert.equal(engine.rewind(data, request).ok, false);
assert.equal(JSON.stringify(data), pristine);
const applied = rewind.apply(battle, actor, '借取过去的力量', 1, data);
assert.equal(applied.ok, true, applied.error);
assert.equal(actor.hp, 10000); assert.equal(actor.maxHp, 10000);
assert.equal(actor.spirit, 10000); assert.equal(actor.maxSpirit, 10000);
assert.equal(actor.sanity, 100); assert.equal(actor.humanity, 100); assert.equal(actor.agility, 200);
assert.equal(actor.divinity, 1);
assert.equal(actor.baseAttributes.活力, 10000);
for (const key of immutableKeys) assert.deepEqual(plain(actor[key]), immutable[key], key);
assert.equal(actor.lifeSave.strongLeft, 0);
assert.equal(battle.rewind.used.player.借取过去的力量, 1);
assert.equal(rewind.apply(battle, actor, '借取过去的力量', 1, data).ok, false);
actor.hp = 1000;
assert.equal(rewind.apply(battle, actor, '时间权柄', 1, data).ok, true);
assert.equal(actor.hp, 10000);
assert.equal(battle.rewind.used.player.时间权柄, 1);

// Advancing through the engine snapshots after round events and before the first actor's turn.
data = phase(start()); battle = bOf(data); actor = battle.units[0];
actor.hp = 5000; actor.spirit = 7000;
data = restore(data, '借取过去的力量');
battle = bOf(data);
assert.equal(battle.round, 2);
assert.equal(data.stat_data.当前灵性, battle.units[0].spirit);
assert.equal(battle.units[0].spirit, 10000);
assert.equal(battle.rewind.snapshots.player['2'].additionalStats.当前活力, 10000);
assert.equal(battle.rewind.used.player.借取过去的力量, 1);
assert.equal(battle.log.filter(row => /借取过去的力量.*状态回到/u.test(row.message)).length, 1);
battle.units[0].hp = 6000;
const loaded = plain(data);
const left = restore(data, '时间权柄'), right = restore(loaded, '时间权柄');
assert.deepEqual(left.cryptLord.teamBattle.units.map(row => row.hp), right.cryptLord.teamBattle.units.map(row => row.hp));
assert.equal(bOf(left).formulas.seed, bOf(right).formulas.seed);
assert.equal(engine.rewind(phase(left), { subtype: '时间权柄', round: 1 }).ok, false);

// Enemy debuffs persist and recalculate on restored base; this is not clearing combat history.
data = phase(start()); battle = bOf(data); actor = battle.units[0];
actor.hp = 1000;
actor.effects = [{ name: '削弱活力', type: 'debuff', stat: '活力', power: 50,
  valueType: 'percentage', duration: 4, battlePersistent: true }];
engine.recalculateAttributes(actor);
assert.equal(actor.maxHp, 5000);
data = restore(data, '借取过去的力量');
actor = bOf(data).units[0];
assert.equal(actor.maxHp, 5000); assert.equal(actor.hp, 5000);
assert.equal(actor.baseAttributes.活力, 10000);
assert.equal(actor.effects[0].name, '削弱活力');

// Summons/dead/off-field units cannot rewind or consume quotas; title cannot bypass these guards.
for (const patch of [{ isSummon: true }, { hp: 0 }, { activeLeaving: true },
  { offField: true }, { exiled: true }]) {
  data = phase(start('诡秘之主')); battle = bOf(data); actor = battle.units[0];
  actor.hp = 1000; Object.assign(actor, patch);
  assert.equal(engine.rewindOptions(data), null);
  assert.equal(engine.rewind(data, { subtype: '时间权柄', round: 1 }).ok, false);
}

// NPC exact <30% threshold, best vitality with later-tie rule, deterministic priority and shared occupancy.
data = phase(start(undefined, '序列3-占卜家/序列4-水手'));
battle = bOf(data); const npc = battle.units[1];
npc.hp = 8000; battle.round = 2; rewind.snapshot(battle);
npc.hp = 10000; battle.round = 3; rewind.snapshot(battle);
npc.hp = 3000; assert.equal(rewind.npc(battle, data).length, 0);
npc.hp = 2999; assert.equal(rewind.npc(battle, data, [npc.id]).length, 0);
let outcomes = rewind.npc(battle, data);
assert.equal(outcomes.length, 1);
assert.equal(outcomes[0].round, 3); assert.equal(npc.hp, 10000);
assert.equal(rewind.npc(battle, data).length, 0);
data = phase(start(undefined, '序列3-占卜家/序列4-水手'));
battle = bOf(data); battle.units[1].hp = 2000;
const progressed = engine.tactic(data, 'skip', () => 0);
assert.equal(progressed.ok, true, progressed.error);
const rows = progressed.battle.lastTactic.outcomes.filter(row => row.actor === battle.units[1].id);
assert.equal(rows.length, 1); assert.equal(rows[0].subtype, '借取过去的力量');
assert.equal(progressed.battle.battleEvent.processes.length, 0);
assert.equal(progressed.battle.rewind.used.敌甲.借取过去的力量, 1);

// Field-scope guard rejects all forbidden groups even with a malformed whitelist.
fields.withRuntime(battle, data, undefined, rt => {
  const cfg = rt.rewind.SUBTYPES.借取过去的力量;
  cfg.rewind = ['stats', 'engineMirror', 'position', 'lifeSaveQuota', 'effects'];
  const allowed = rt.rewind.fieldsFor('借取过去的力量');
  assert.deepEqual(Array.from(allowed, row => row.scope), ['self', 'self', 'self']);
});

// The snapshot is AFTER uniform battlefield damage, BEFORE the actor's personal turn-start poison.
data = phase(start()); battle = bOf(data); actor = battle.units[0];
actor.hp = 5000;
actor.effects = [{ name: '回合毒伤', type: 'poison', stat: '当前活力', power: 20,
  valueType: 'fixed', duration: 2, fieldEffect: true, triggerTiming: 'turn_start' }];
battle.battleEvent.processes = [{ casterId: battle.units[1].id, casterName: '敌甲',
  casterTeam: 'enemy', subtype: '制造雷暴', shownAs: '制造雷暴', leftRounds: 1, power: 50 }];
const uniform = engine.tactic(data, 'skip', () => .9);
assert.equal(uniform.ok, true, uniform.error);
assert.equal(uniform.battle.rewind.snapshots.player['2'].additionalStats.当前活力, 4950);
assert.equal(uniform.battle.units[0].hp, 4930);
assert.equal(uniform.battle.battleEvent.processes.length, 0);

// Restored dictionary keys cannot alias Object.prototype after JSON persistence.
data = phase(start()); battle = bOf(data); actor = battle.units[0];
actor.id = 'constructor';
battle.rewind.snapshots = {}; battle.rewind.used = {};
rewind.snapshot(battle); actor.hp = 1000;
assert.equal(rewind.apply(battle, actor, '时间权柄', 1, data).ok, true);
assert.equal(actor.hp, 10000);
assert.equal(battle.rewind.used.constructor.时间权柄, 1);
assert.equal({}.时间权柄, undefined);

data = phase(start()); battle = bOf(data); battle.units[0].hp = 5000;
const saved = modules['cryptLord.battleRewind']; delete modules['cryptLord.battleRewind'];
assert.match(engine.rewind(data, { subtype: '时间权柄', round: 1 }).error, /模块不可用/u);
modules['cryptLord.battleRewind'] = saved;
console.log('PASS: both original rewind paths, own-state restoration, snapshots, quotas, NPC priority and native transaction.');
