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
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery',
  'battle-hard-control', 'battle-mind-deprive', 'battle-temp-control', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const manager = modules['cryptLord.battleTempControl'];
const mind = modules['cryptLord.battleMindDeprive'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const routes = [
  ['序列3-律师', '「阶层」权柄', '失序者'],
  ['序列0-刺客', '魅力权柄', '毁灭天灾'],
  ['序列2-水手', '恐惧之音', '上帝'],
  ['序列2-吝啬鬼', '单向爱恋诱导', '欲望母树'],
  ['序列2-秘祈人', '秽语·堕落', '上帝'],
];
const card = (sequence, speed = 20, humanity = 1000, spirit = 1000) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000, 灵性: spirit, 当前灵性: spirit,
  敏捷: speed, 当前敏捷: speed, 理智: 100, 当前理智: 100,
  人性: humanity, 当前人性: humanity, 神性: 1, 序列能力列表: {},
});
const bOf = data => data.cryptLord.teamBattle;
function start(sequence = routes[0][0], allies = []) {
  const out = engine.start({ stat_data: card(sequence, 200, 50000, 40000),
    npc_data: { 敌甲: card('序列5-猎人'), 同伴: card(sequence, 10, 60000, 40000) } },
  { enemies: ['敌甲'], allies, seed: 789 });
  assert.equal(out.ok, true, out.error); bOf(out.data).phase = 'tactic'; return out.data;
}
const target = data => bOf(data).units.find(unit => unit.id === '敌甲');
function cast(data, subtype) {
  const out = engine.tempControl(data, { subtype, target: '敌甲' }, () => .5);
  assert.equal(out.ok, true, out.error); return out.data;
}
function endRound(data) {
  for (let i = 0; bOf(data).phase !== 'tactic'; i++) {
    assert.ok(i < 10);
    const out = engine.action(data, { type: 'wait' });
    assert.equal(out.ok, true, out.error);
    const auto = engine.advanceAuto(out.data);
    assert.equal(auto.ok, true, auto.error); data = auto.data;
  }
  return data;
}
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b1-js-mystery-sleep-and-effect.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
assert.ok(generated.includes(source.slice(source.indexOf('const TempAllegianceManager ='),
  source.indexOf("console.log('[战斗系统] TempAllegianceManager")).trim()));

// All five abilities, titles, independent pathway gates and exact one-round restoration.
for (const [sequence, subtype, title] of routes) {
  let data = start(sequence), b = bOf(data), actor = b.units[0];
  const original = JSON.stringify(data);
  const choice = engine.tempControlOptions(data).find(row => row.subtype === subtype);
  assert.ok(choice, sequence);
  assert.equal(JSON.stringify(data), original);
  assert.ok(engine.tempControlOptions(start(title)).some(row => row.subtype === subtype));
  assert.equal(choice.targets.length, 1);
  const stat = subtype === '秽语·堕落' ? '灵性' : '人性';
  const field = stat === '灵性' ? 'spirit' : 'humanity';
  assert.equal(choice.stat, stat);
  assert.equal(choice.cost, Math.max(1, Math.round(b.fieldEffectMeta.averages[String(actor.rank)][stat] * .05)));
  const before = actor[field], other = actor[field === 'spirit' ? 'humanity' : 'spirit'];
  data = cast(data, subtype); b = bOf(data); actor = b.units[0];
  assert.equal(actor[field], before - choice.cost);
  assert.equal(actor[field === 'spirit' ? 'humanity' : 'spirit'], other);
  assert.equal(data.stat_data[`当前${stat}`], actor[field]);
  assert.equal(b.round, 2);
  assert.equal(b.status, 'active');
  assert.equal(b.result, null);
  assert.equal(target(data).side, 'ally');
  assert.equal(target(data).controller, 'player');
  assert.equal(b.tempAllegiance.processes.length, 1);
  assert.equal(b.tempAllegiance.processes[0].expireRound, 2);
  assert.equal(manager.originSide(b, target(data)), 'enemy');
  assert.match(engine.tempControlOptions({ ...data, cryptLord: {
    ...data.cryptLord, teamBattle: { ...b, phase: 'tactic' } } })[0].reason, /已维持/u);
  assert.equal(b.lastTactic.outcomes.find(row => row.actor === 'player').outcome, 'applied');
  data = endRound(plain(data)); b = bOf(data);
  assert.equal(target(data).side, 'enemy');
  assert.equal(target(data).controller, 'npc');
  assert.equal(b.tempAllegiance.processes.length, 0);
  assert.equal(b.log.filter(row => /恢复原阵营/u.test(row.message)).length, 1);
  assert.equal(engine.tempControlOptions(data).find(row => row.subtype === subtype).reason, '');
}
for (const [sequence, subtype] of routes) {
  const rank = Number(sequence.match(/\d+/u)[0]);
  assert.ok(!engine.tempControlOptions(start(sequence.replace(`序列${rank}`, `序列${rank + 1}`)))
    .some(row => row.subtype === subtype));
}
let data = start('序列2-秘祈人/序列3-律师');
assert.equal(engine.tempControlOptions(data).length, 2);

// Current resource max (ties spirit), zero/invalid/off-field/stale requests do not spend or roll.
data = start(); let b = bOf(data), actor = b.units[0];
actor.humanity = actor.spirit;
assert.equal(engine.tempControlOptions(data)[0].stat, '灵性');
actor.humanity = 0; actor.spirit = 0;
assert.match(engine.tempControlOptions(data)[0].reason, /为 0/u);
const unchanged = JSON.stringify(data);
assert.equal(engine.tempControl(data, { subtype: routes[0][1], target: '敌甲' }).ok, false);
assert.equal(JSON.stringify(data), unchanged);
data = start(); b = bOf(data);
for (const patch of [{ offField: true }, { hp: 0 }, { side: 'ally' }]) {
  const next = plain(data); Object.assign(target(next), patch);
  assert.equal(engine.tempControlOptions(next)[0].targets.length, 0);
  assert.equal(engine.tempControl(next, { subtype: routes[0][1], target: '敌甲' }).ok, false);
}
data = start('序列2-秘祈人');
bOf(data).units[0].spirit = 0;
assert.match(engine.tempControlOptions(data)[0].reason, /灵性为 0/u);
data = start(); b = bOf(data); actor = b.units[0];
actor.humanity = 1000 + engine.tempControlOptions(data)[0].cost; actor.spirit = 0;
let draws = 0;
const lost = manager.prepare(b, data, () => draws++ % 2 ? .999 : 0, [], { subtype: routes[0][1], target: '敌甲' });
assert.equal(actor.humanity, 1000);
assert.equal(manager.apply(b, data, () => .5, lost)[0].outcome, 'resisted');
assert.equal(target(data).side, 'enemy');

// Batch arbitration preserves every fee, gives the player priority and prevents duplicate snapshots.
data = start(undefined, ['同伴']); b = bOf(data);
const prepared = manager.prepare(b, data, () => .1, [], { subtype: routes[0][1], target: '敌甲' });
assert.equal(prepared.length, 2);
const fees = b.units.map(unit => unit.humanity);
const results = manager.apply(b, data, () => .5, prepared);
assert.equal(results.find(row => row.actor === 'player').outcome, 'applied');
assert.equal(results.find(row => row.actor === '同伴').outcome, 'superseded');
assert.equal(b.tempAllegiance.processes.length, 1);
assert.deepEqual(b.units.map(unit => unit.humanity), fees);
assert.equal(manager.prepare(b, data, () => .1, [], { subtype: routes[0][1], target: '敌甲' }).length, 0);
manager.finish(b); assert.equal(target(data).side, 'enemy');
data = start(); b = bOf(data);
const staged = manager.prepare(b, data, () => .5, [], { subtype: routes[0][1], target: '敌甲' });
target(data).side = 'ally';
assert.equal(manager.apply(b, data, () => .5, staged)[0].outcome, 'superseded');
data = start(); b = bOf(data);
const deadCaster = manager.prepare(b, data, () => .5, [], { subtype: routes[0][1], target: '敌甲' });
b.units[0].hp = 0;
assert.equal(manager.apply(b, data, () => .5, deadCaster)[0].outcome, 'superseded');

// Existing mind follow uses the same single-caster budget; later temporary control snapshots original side.
data = start(); b = bOf(data);
fields.withRuntime(b, data, undefined, rt =>
  rt.tempAllegiance.begin(rt.bm, rt.heroes[0], rt.heroes[1], '心智剥夺',
    { casterScore: 10, targetScore: 1 }, [], []));
assert.match(engine.tempControlOptions(data)[0].reason, /已维持/u);
manager.finish(b);
data = start('序列4-观众'); b = bOf(data);
fields.withRuntime(b, data, undefined, rt =>
  rt.tempAllegiance.begin(rt.bm, rt.heroes[0], rt.heroes[1], routes[0][1],
    { casterScore: 10, targetScore: 1 }, [], []));
assert.equal(mind.options(b, b.units[0], data).targets.length, 0);
manager.finish(b);
data = start('序列3-律师', ['同伴']); b = bOf(data);
fields.withRuntime(b, data, undefined, rt => {
  const player = rt.heroes.find(hero => hero.heroId === 'player');
  const enemy = rt.heroes.find(hero => hero.heroId === '敌甲');
  const ally = rt.heroes.find(hero => hero.heroId === '同伴');
  const roll = { casterScore: 10, targetScore: 1 };
  rt.tempAllegiance.begin(rt.bm, enemy, player, '恐惧之音', roll, [], []);
  assert.equal(player.teamType, 'enemy');
  rt.tempAllegiance.begin(rt.bm, ally, player, routes[0][1], roll, [], []);
  assert.equal(b.tempAllegiance.processes.length, 1);
  assert.equal(b.tempAllegiance.processes[0].originTeamType, 'ally');
  assert.equal(b.tempAllegiance.processes[0].originController, 'player');
});
manager.finish(b);
assert.equal(b.units[0].side, 'ally');
assert.equal(b.units[0].controller, 'player');

// The module owns expiry without requiring either bribery or mind deprivation to be installed.
const bribes = modules['cryptLord.battleBribery'];
delete modules['cryptLord.battleBribery'];
delete modules['cryptLord.battleMindDeprive'];
data = start();
assert.equal(bOf(data).briberyMeta, undefined);
assert.equal(bOf(data).mindDepriveMeta, undefined);
data = cast(data, routes[0][1]);
data = endRound(data);
assert.equal(target(data).side, 'enemy');
assert.equal(bOf(data).tempAllegiance.processes.length, 0);
modules['cryptLord.battleBribery'] = bribes;
modules['cryptLord.battleMindDeprive'] = mind;

// Independent NPC subtype gates, occupancy and player-control exclusion.
data = start(); b = bOf(data);
target(data).sequence = '序列3-律师/序列2-秘祈人';
target(data).humanity = 100000; target(data).spirit = 100000;
assert.equal(manager.prepare(b, data, () => .31).length, 0);
assert.equal(manager.prepare(b, data, () => .1, ['敌甲']).length, 0);
target(data).controller = 'player';
assert.equal(manager.prepare(b, data, () => .1).length, 0);
target(data).controller = 'npc';
target(data).turnSkip = { reason: '昏迷', skipRound: b.round, consumed: false };
assert.equal(manager.prepare(b, data, () => .1).length, 0);
delete target(data).turnSkip;
const npcRows = manager.prepare(b, data, () => .1);
assert.equal(npcRows.length, 1);
assert.equal(npcRows[0].subtype, routes[0][1]);
data = start();
delete modules['cryptLord.battleTempControl'];
assert.match(engine.tempControl(data, { subtype: routes[0][1], target: '敌甲' }).error, /模块不可用/u);
modules['cryptLord.battleTempControl'] = manager;
console.log('PASS: all five original temporary controls, resource rules, arbitration, restoration, shared mind budget, NPC and native-floor transactions.');
