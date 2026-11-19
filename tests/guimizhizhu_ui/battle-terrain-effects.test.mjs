import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
const names = ['battle-experience', 'battle-life-save', 'battle-tags',
  'audience-imagination', 'grazing-state', 'battle-terrain-presets', 'battle-formulas',
  'battle-conditional-params', 'battle-team-conditions', 'battle-auras',
  'battle-field-effect-reference', 'battle-field-effects', 'battle-effect-transfer',
  'battle-bribery', 'battle-balance', 'battle-punishment', 'battle-mythic-form',
  'battle-exile', 'battle-active-leave', 'battle-events', 'battle-rewind',
  'battle-extra-action', 'battle-hard-control', 'battle-mind-deprive',
  'battle-temp-control', 'battle-permanent-control', 'battle-possession',
  'battle-rule-change', 'battle-environment', 'battle-fundamental', 'battle-summon',
  'battle-ability-borrow', 'battle-tactic-cpu', 'battle-action-cpu',
  'battle-terrain-effects', 'team-battle-state'];
for (const name of names)
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const terrain = modules['cryptLord.battleTerrainEffects'];
const bOf = data => data.cryptLord.teamBattle;
const player = data => bOf(data).units.find(unit => unit.id === 'player');
const card = { 当前序列: '序列9-猎人', 活力: 1000, 当前活力: 1000,
  灵性: 100, 当前灵性: 100, 敏捷: 50, 当前敏捷: 50,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 运气: 10 };
function start() {
  const out = engine.start({ stat_data: structuredClone(card),
    npc_data: { 敌: structuredClone(card) } }, { enemies: ['敌'], seed: 941 });
  assert.equal(out.ok, true, out.error);
  const data = out.data, battle = bOf(data);
  Object.assign(battle, { phase: 'action', queue: ['player', '敌'], index: 0, terrain: [] });
  Object.assign(player(data), { x: 1, y: 1, moveRemaining: 5 });
  Object.assign(battle.units.find(unit => unit.id === '敌'), { x: 9, y: 8 });
  return data;
}
const add = (data, id, overrides = {}) => {
  const preset = modules['cryptLord.battleTerrainPresets'].option(id);
  bOf(data).terrain.push({ ...preset, x: 1, y: 1, rank: 8, duration: 0, ...overrides });
};
function nextTurn(data, round) {
  const next = structuredClone(data), battle = bOf(next);
  Object.assign(battle, { round, phase: 'action', queue: ['敌', 'player'], index: 0 });
  for (const unit of battle.units) unit.turnStartedRound = round - 1;
  const out = engine.action(next, { type: 'wait' });
  assert.equal(out.ok, true, out.error);
  return out.data;
}
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(source.slice(source.indexOf('processTerrainEffects(hero) {'),
  source.indexOf('processEnvironmentEffects(hero, timing')).trim().replace(/[ \t]+$/gm, '')),
  'All original terrain lifecycle methods must be extracted together.');
// Field effects do nothing on entry, tick once at turn start, use fixed amounts, and linger
// until the next own turn when the unit leaves. Reads and duplicate callbacks do not settle.
let data = start(); add(data, 'fireSurface');
engine.terrainEntry(bOf(data), player(data));
assert.equal(player(data).hp, 1000);
assert.equal(player(data).effects.filter(row => row.terrainEffect).length, 0);
data = nextTurn(data, 2);
assert.equal(player(data).hp, 996);
const defense = player(data).effects.find(row => row.terrainField);
assert.equal(defense.valueType, 'fixed');
assert.equal(defense.power, 6);
const snapshot = JSON.stringify(data);
terrain.turnStart(bOf(data), player(data));
engine.get(data); terrain.describe(bOf(data), player(data));
assert.equal(JSON.stringify(data), snapshot);
player(data).x = 2;
assert.ok(player(data).effects.some(row => row.terrainField));
data = nextTurn(data, 3);
assert.equal(player(data).hp, 996);
assert.ok(!player(data).effects.some(row => row.terrainField));
// Repeated entry stacks distinct residues; standing refreshes all; leaving/clearing retains
// two proper ticks rather than triggering again at the global round boundary.
data = start(); add(data, 'poisonSurface');
engine.terrainEntry(bOf(data), player(data));
engine.terrainEntry(bOf(data), player(data));
assert.equal(player(data).hp, 1000);
assert.equal(player(data).effects.filter(row => row.terrainSource).length, 2);
assert.equal(new Set(player(data).effects.map(row => row.name)).size, 2);
data = nextTurn(data, 2);
assert.equal(player(data).hp, 992);
assert.ok(player(data).effects.every(row => row.duration === 2));
player(data).x = 2;
bOf(data).terrain = [];
data = nextTurn(data, 3); assert.equal(player(data).hp, 984);
data = nextTurn(data, 4); assert.equal(player(data).hp, 976);
assert.ok(!player(data).effects.some(row => row.terrainSource));
data = nextTurn(data, 5); assert.equal(player(data).hp, 976);
// Adaptation reverses both channels and respects maximums; terrain duration is a global
// round-end counter, zero is permanent, and a vanished surface cannot erase residue.
data = start(); add(data, 'fireSurface');
player(data).tags = [{ name: '火焰', duration: 99, stacks: 1 }];
player(data).hp = 990;
data = nextTurn(data, 2); assert.equal(player(data).hp, 993);
assert.equal(player(data).effects.find(row => row.terrainField).type, 'buff');
data = start(); add(data, 'poisonSurface', { duration: 1 });
engine.terrainEntry(bOf(data), player(data));
terrain.endRound(bOf(data));
assert.equal(bOf(data).terrain.length, 0);
assert.equal(player(data).effects[0].duration, 2);
terrain.endRound(bOf(data)); assert.equal(player(data).effects[0].duration, 2);
data = start(); add(data, 'fireSurface', { duration: 0 });
terrain.endRound(bOf(data)); assert.equal(bOf(data).terrain.length, 1);
// Extra slots freeze existing ticks but active movement still attaches residue.
data = start(); add(data, 'poisonSurface');
const extra = modules['cryptLord.battleExtraAction'], currentSlot = extra.currentSlot;
extra.currentSlot = () => ({ extra: true, cfg: { skipTurnStart: true } });
assert.deepEqual(Array.from(terrain.turnStart(bOf(data), player(data))), []);
assert.equal(player(data).terrainStandingOn, undefined);
engine.terrainEntry(bOf(data), player(data));
assert.equal(player(data).effects.filter(row => row.terrainSource).length, 1);
extra.currentSlot = currentSlot;
// Original primary terrain loss bypasses life-save; a transferred instantaneous loss
// allows the recipient's life-save. Residue splitting occurs once at application.
data = start(); add(data, 'fireSurface', { rank: 7 });
player(data).hp = 5;
Object.assign(player(data).lifeSave, { strongLeft: 1, strongName: '测试保命', weakLeft: 0 });
data = nextTurn(data, 2);
assert.equal(player(data).hp, 0);
assert.equal(player(data).lifeSave.strongLeft, 1);
data = start(); add(data, 'fireSurface', { rank: 7 });
bOf(data).effectTransfer.relations.player = { id: 'test', casterId: 'player', targetId: '敌',
  activeFromRound: 1, expireAfterRound: 10, direction: 'bidirectional',
  shownAs: '扭曲：扭曲目标', subtype: '扭曲：扭曲目标', power: 50 };
data = nextTurn(data, 2);
assert.ok(player(data).hp > 991);
assert.ok(bOf(data).units.find(row => row.id === '敌').hp < 1000);
data = start(); add(data, 'fireSurface', { rank: 7 });
const enemy = bOf(data).units.find(row => row.id === '敌');
enemy.hp = 5;
Object.assign(enemy.lifeSave, { strongLeft: 1, strongName: '接收方保命', weakLeft: 0 });
bOf(data).effectTransfer.relations.player = { id: 'test', casterId: 'player', targetId: '敌',
  activeFromRound: 1, expireAfterRound: 10, direction: 'bidirectional',
  shownAs: '扭曲：扭曲目标', subtype: '扭曲：扭曲目标', power: 50 };
data = nextTurn(data, 2);
assert.equal(bOf(data).units.find(row => row.id === '敌').hp, 5);
assert.equal(bOf(data).units.find(row => row.id === '敌').lifeSave.strongLeft, 0);
data = start(); add(data, 'poisonSurface');
bOf(data).effectTransfer.relations.player = { id: 'test', casterId: 'player', targetId: '敌',
  activeFromRound: 1, expireAfterRound: 10, direction: 'bidirectional',
  shownAs: '扭曲：扭曲目标', subtype: '扭曲：扭曲目标', power: 50 };
engine.terrainEntry(bOf(data), player(data));
assert.equal(player(data).effects[0].power, 2);
assert.equal(bOf(data).units.find(row => row.id === '敌').effects[0].power, 2);
assert.equal(bOf(data).units.find(row => row.id === '敌').effects[0].terrainSource, undefined);
data = nextTurn(data, 2);
assert.equal(player(data).hp, 998);
Object.assign(bOf(data), { queue: ['player', '敌'], index: 0 });
let recipientTurn = engine.action(data, { type: 'wait' });
assert.equal(recipientTurn.ok, true, recipientTurn.error);
data = recipientTurn.data;
assert.equal(bOf(data).units.find(row => row.id === '敌').hp, 998,
  'A split residue tick cannot transfer its damage again.');
// Full native round transition expires terrain at round end, not immediately after
// the next tactical declaration, and does not double-process residue at nextRound.
data = start(); add(data, 'poisonSurface', { duration: 3 });
Object.assign(player(data), { agility: 200, maxAgility: 200 });
engine.recalculateAttributes(player(data));
player(data).baseAttributes.敏捷 = 200;
const npc = bOf(data).units.find(row => row.id === '敌');
npc.controller = 'player';
engine.terrainEntry(bOf(data), player(data));
let out = engine.action(data, { type: 'wait' });
assert.equal(out.ok, true, out.error);
out = engine.action(out.data, { type: 'wait' });
assert.equal(out.ok, true, out.error);
assert.equal(out.battle.phase, 'tactic');
assert.equal(out.battle.terrain[0].duration, 2);
out = engine.tactic(out.data, 'skip', () => .99);
assert.equal(out.ok, true, out.error);
assert.equal(out.battle.terrain[0].duration, 2);
assert.equal(player(out.data).hp, 996);
data = out.data;
// JSON restoration is read-only; losing the module blocks marked floors.
const restored = JSON.parse(JSON.stringify(data)), before = JSON.stringify(restored);
engine.get(restored); terrain.describe(bOf(restored), player(restored));
assert.equal(JSON.stringify(restored), before);
delete modules['cryptLord.battleTerrainEffects'];
assert.equal(engine.action(restored, { type: 'wait' }).ok, false);
modules['cryptLord.battleTerrainEffects'] = terrain;
terrain.finish(bOf(data));
assert.ok(bOf(data).units.every(unit => !unit.effects.some(row => row.terrainEffect)));
assert.ok(bOf(data).units.every(unit =>
  unit.terrainStandingOn === undefined && unit.terrainStartedRound === undefined));
console.log('Terrain lifecycle: original timing, field/residue, duration, routing and restoration passed.');
