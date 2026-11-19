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
  'battle-rewind', 'battle-extra-action', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const extra = modules['cryptLord.battleExtraAction'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = (sequence, speed = 20) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000, 灵性: 10000, 当前灵性: 10000,
  敏捷: speed, 当前敏捷: speed, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 神性: 1, 序列能力列表: {},
});
function start(sequence = '序列1-学徒', enemy = '序列5-猎人') {
  const result = engine.start({ stat_data: card(sequence, 200),
    npc_data: { 敌甲: card(enemy), 敌乙: card('序列5-猎人', 1) } },
  { enemies: ['敌甲', '敌乙'], seed: 789 });
  assert.equal(result.ok, true, result.error); return result.data;
}
const bOf = data => data.cryptLord.teamBattle;
const phase = data => { bOf(data).phase = 'tactic'; return data; };
const act = (data, move = { type: 'wait' }) => {
  const out = engine.action(data, move);
  assert.equal(out.ok, true, out.error); return out.data;
};
const grant = data => {
  const out = engine.extraAction(phase(data), '闪现（虚影分身）', () => .9);
  assert.equal(out.ok, true, out.error); return out.data;
};

// Extract the entire original manager, not a reimplementation of the tier rules.
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b2-js-aura-and-grazing-projection.txt',
  import.meta.url), 'utf8');
const body = source.slice(source.indexOf('const ExtraActionManager ='),
  source.indexOf("console.log('[战斗系统] ExtraActionManager")).trim();
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
assert.ok(generated.includes(body));
for (const [sequence, count, uses] of [
  ['序列0-学徒', 2, 3], ['序列1-学徒', 2, 2], ['序列0.5-学徒', 2, 2],
  ['序列4-学徒', 1, 2], ['序列5-学徒', 0, 0], ['诡秘之主', 2, 3],
  ['序列1-偷盗者/序列3-学徒', 1, 2],
]) {
  const data = phase(start(sequence)), rows = engine.extraActionOptions(data);
  assert.equal(rows[0]?.count || 0, count, sequence);
  assert.equal(rows[0]?.uses || 0, uses, sequence);
}
let data = phase(start()), battle = bOf(data), actor = battle.units[0];
const pristine = JSON.stringify(data), choice = engine.extraActionOptions(data)[0];
extra.statusLines(battle, actor);
assert.equal(JSON.stringify(data), pristine);
assert.equal(engine.extraAction(data, '__proto__').ok, false);
assert.equal(JSON.stringify(data), pristine);
const mixed = engine.extraActionOptions(phase(start('序列1-偷盗者/序列3-学徒')))[0];
assert.equal(mixed.cost, choice.cost);
actor.spirit = 1;
data = grant(data); battle = bOf(data); actor = battle.units[0];
assert.equal(actor.spirit, 0);
assert.equal(data.stat_data.当前灵性, 0);
assert.equal(battle.extraAction.used.player['闪现（虚影分身）'], 1);
assert.equal(engine.extraAction(phase(plain(data)), choice.subtype).ok, false);
for (const patch of [{ isSummon: true }, { playSource: true }, { hp: 0 },
  { offField: true }, { exiled: true }, { activeLeaving: true }, { stunned: true }]) {
  const invalid = phase(start()); Object.assign(bOf(invalid).units[0], patch);
  assert.equal(engine.extraActionOptions(invalid).length, 0, JSON.stringify(patch));
  assert.equal(engine.extraAction(invalid, choice.subtype).ok, false);
}

// Consecutive shared-body slots survive serialization, drain grants once, refresh movement once.
data = grant(start()); battle = bOf(data); actor = battle.units[0];
assert.equal(battle.units.length, 3);
assert.deepEqual(plain(battle.queue.slice(0, 3)), ['player', 'player', 'player']);
assert.equal(battle.turnSlots[1].alias, `${actor.name}的第一个虚影`);
assert.equal(Object.keys(battle.extraAction.pending).length, 0);
const bodyMove = engine.reachable(data)[0];
assert.ok(bodyMove);
data = act(data, { type: 'move', x: bodyMove.x, y: bodyMove.y });
assert.ok(bOf(data).units[0].moveRemaining < bOf(data).units[0].movement);
data = act(data); battle = bOf(data); actor = battle.units[0];
assert.equal(battle.index, 1); assert.equal(actor.moves, 0);
assert.equal(actor.moveRemaining, actor.movement);
const pos = [actor.x, actor.y], firstMove = engine.reachable(data)[0];
data = act(data, { type: 'move', x: firstMove.x, y: firstMove.y });
assert.notDeepEqual([bOf(data).units[0].x, bOf(data).units[0].y], pos);
const saved = plain(data), remaining = bOf(saved).units[0].moveRemaining;
extra.enter(bOf(saved), bOf(saved).units[0]);
assert.equal(bOf(saved).units[0].moveRemaining, remaining);
data = act(saved); battle = bOf(data);
assert.equal(battle.index, 2);
assert.equal(battle.units[0].moveRemaining, battle.units[0].movement);
assert.ok(battle.log.some(row => row.message.includes('第一个虚影 移动')));
data = act(data); assert.equal(bOf(data).index, 3);
assert.deepEqual(plain(extra.expand(bOf(data), ['player', '敌甲'])), ['player', '敌甲']);

// An extra action never repeats start poison or end durations; round-end still runs once.
data = start(); battle = bOf(data); actor = battle.units[0];
actor.effects = [
  { name: '持续侵蚀', type: 'poison', stat: '当前活力',
    power: 10, valueType: 'fixed', duration: 4, skillEffect: true, triggerTiming: 'turn_start' },
  { name: '行动结束侵蚀', type: 'poison', stat: '当前活力',
    power: 5, valueType: 'fixed', duration: 4, skillEffect: true, triggerTiming: 'turn_end' },
  { name: '回合结束侵蚀', type: 'poison', stat: '当前活力',
    power: 7, valueType: 'fixed', duration: 4, skillEffect: true, triggerTiming: 'round_end' },
];
data = grant(data);
assert.equal(bOf(data).units[0].hp, 9990);
data = act(data); battle = bOf(data);
const frozen = plain(battle.units[0].effects), hp = battle.units[0].hp;
assert.equal(hp, 9985);
data = act(data); assert.equal(bOf(data).units[0].hp, hp);
assert.deepEqual(plain(bOf(data).units[0].effects), frozen);
data = act(data); assert.equal(bOf(data).units[0].hp, hp);
assert.deepEqual(plain(bOf(data).units[0].effects), frozen);
data = engine.advanceAuto(data).data;
assert.equal(bOf(data).phase, 'tactic');
assert.equal(bOf(data).units[0].effects.find(row => row.name === '回合结束侵蚀').duration, 3);

// Terrain-entry damage still applies to a phantom's move; death skips remaining phantom slots.
data = grant(start()); data = act(data); battle = bOf(data); actor = battle.units[0];
const landing = engine.reachable(data)[0];
assert.ok(landing);
const friend = { ...plain(battle.units[2]), id: '援军', name: '援军',
  side: 'ally', x: 8, y: 8 };
battle.units.push(friend);
actor.hp = 1;
if (actor.lifeSave) Object.assign(actor.lifeSave, { strongLeft: 0, weakLeft: 0 });
battle.terrain.push({ id: 'fireSurface', name: '火焰地表', rank: -2,
  x: landing.x, y: landing.y, moveCost: 1 });
data = act(data, { type: 'move', x: landing.x, y: landing.y });
battle = bOf(data);
assert.equal(battle.units[0].hp, 0);
assert.ok(battle.index >= 3);
assert.ok(battle.turnSlots[1].voided && battle.turnSlots[2].voided);
assert.equal(battle.status, 'active');
assert.ok(battle.log.some(row => /火焰地表/u.test(row.message)));

// Loss of action eligibility voids all unplayed slots once, without resource/quota refunds.
for (const patch of [{ hp: 0 }, { offField: true }, { exiled: true }, { stunned: true }]) {
  data = grant(start()); battle = bOf(data); actor = battle.units[0];
  const spirit = actor.spirit;
  Object.assign(actor, patch);
  assert.equal(extra.check(battle, actor), true);
  assert.equal(battle.turnSlots.filter(slot => slot.extra && slot.voided).length, 2);
  const logs = battle.log.length;
  extra.check(battle, actor); assert.equal(battle.log.length, logs);
  assert.equal(actor.spirit, spirit);
  assert.equal(battle.extraAction.used.player[choice.subtype], 1);
}

// NPC grants are deterministic, obey occupancy/exclusion and quota; battle teardown clears extras.
data = phase(start(undefined, '序列4-学徒')); battle = bOf(data);
assert.equal(extra.npc(battle, data, ['敌甲']).length, 0);
assert.equal(extra.npc(battle, data).length, 1);
assert.equal(extra.npc(battle, data).length, 1);
assert.equal(extra.npc(battle, data).length, 0);
data = phase(start(undefined, '序列3-占卜家/序列4-学徒')); battle = bOf(data);
battle.units[1].hp = 2000;
assert.equal(extra.npc(battle, data).length, 0);
assert.equal(modules['cryptLord.battleRewind'].npc(battle, data).length, 1);
data = grant(start()); battle = bOf(data);
extra.finish(battle);
assert.equal(Object.keys(battle.extraAction.pending).length, 0);
assert.ok(battle.turnSlots.filter(slot => slot.extra).every(slot => slot.voided));
data = phase(start()); delete modules['cryptLord.battleExtraAction'];
assert.equal(engine.extraAction(data, choice.subtype).ok, false);
console.log('PASS: original extra-action tiers, shared queue/movement, duration freeze, voiding, quotas and serialization.');
