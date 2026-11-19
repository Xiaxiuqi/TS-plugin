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
  'battle-ability-borrow', 'battle-tactic-cpu', 'battle-action-cpu', 'team-battle-state'];
for (const name of names)
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], cpu = modules['cryptLord.battleActionCpu'];
const fields = modules['cryptLord.battleFieldEffects'];
const bOf = data => data.cryptLord.teamBattle;
const actorOf = data => bOf(data).units.find(unit => unit.id === '敌甲');
const card = skills => ({ 当前序列: '序列9-猎人', 活力: 1000, 当前活力: 1000,
  灵性: 100, 当前灵性: 100, 敏捷: 50, 当前敏捷: 50,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 运气: 10,
  序列能力列表: { 能力: skills || [{ 名称: '近击', power: 1, range: 1 }] } });
function start(skills) {
  const result = engine.start({ stat_data: card(),
    npc_data: { 敌甲: card(skills), 敌乙: card() } },
  { enemies: ['敌甲', '敌乙'], seed: 741 });
  assert.equal(result.ok, true, result.error);
  const data = result.data, battle = bOf(data);
  battle.formulas.values['damage.powerScale'] = 2;
  Object.assign(battle, { phase: 'action', queue: ['敌甲', 'player', '敌乙'], index: 0, terrain: [] });
  for (const unit of battle.units) Object.assign(unit, { x: 10, y: 9, moveRemaining: 3 });
  Object.assign(actorOf(data), { x: 0, y: 1 });
  Object.assign(battle.units.find(unit => unit.id === 'player'), { x: 4, y: 1 });
  return data;
}
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(original.slice(original.indexOf('class CPUManager {'),
  original.indexOf("console.log('[战斗系统] CPUManager 已加载');")).trim().replace(/[ \t]+$/gm, '')),
  'Full original decision class must be reused, not a replacement heuristic.');
// One plan executes move then attack, consumes the slot once, and never mutates the source.
let data = start(), snapshot = JSON.stringify(data);
let result = cpu.step(data, () => .01);
assert.equal(result.ok, true, result.error);
assert.equal(JSON.stringify(data), snapshot);
assert.equal(engine.current(bOf(result.data)).id, 'player');
assert.ok(bOf(result.data).log.some(row => /移动到/.test(row.message)));
assert.ok(bOf(result.data).units.find(row => row.id === 'player').hp < 1000,
  JSON.stringify(bOf(result.data).log));
assert.equal(bOf(result.data).actionCpuMeta.last.intent, 'attack');
// Self healing, strict rank tiers, five-attribute ballots, and long-range fallback.
data = start([{ 名称: '自疗', isHeal: true, healAmt: 80,
  healValueType: 'fixed', targetType: 'self', range: 0 }]);
actorOf(data).hp = 100;
result = cpu.step(data, () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(actorOf(result.data).hp, 180, JSON.stringify(bOf(result.data).actionCpuMeta) +
  JSON.stringify(bOf(result.data).log));
assert.equal(bOf(result.data).actionCpuMeta.last.intent, 'heal');
fields.withRuntime(bOf(data), data, () => .5, rt => {
  const manager = new rt.punishmentCpu('easy', rt.bm);
  const hero = rt.heroes.find(row => row.heroId === '敌甲');
  const selfHeal = { isHeal: true, healType: '活力', targetType: 'self' };
  const spiritHeal = { isHeal: true, healType: '灵性', targetType: 'ally' };
  hero.additionalStats.当前灵性 = 20;
  const tiers = manager.buildSequenceTiers(hero, rt.heroes.map(unit => ({ unit, side: 'ally' })));
  assert.ok(tiers[0].members.some(row => row.unit.heroId === hero.heroId));
  const ballot = manager.buildBallot(tiers[0], [selfHeal, spiritHeal], hero)
    .filter(row => row.votes > 0);
  assert.equal(ballot.length, 2);
  assert.ok(ballot.every(row => row.votes === 7));
  assert.equal(manager.canHealTarget(selfHeal, hero, rt.heroes[0]), false);
});
data = start([{ 名称: '短距', power: 1, range: 2 },
  { 名称: '远距', power: 1, range: 'global' }]);
actorOf(data).moveRemaining = 0;
result = cpu.step(data, () => .01);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).actionCpuMeta.last.id, 'skill:能力:1');
data = start([{ 名称: '环形打击', power: 30, range: 0,
  targetType: 'allEnemies', aoeRadius: 2 }]);
result = cpu.step(data, () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).actionCpuMeta.last.target, '敌甲',
  'Native range-zero execution uses the caster as the circle center.');
assert.ok(bOf(result.data).units.find(row => row.id === 'player').hp < 1000);
// Weighted routes cross occupied intermediate cells, never land on them, and detour around walls.
data = start();
Object.assign(bOf(data).board, { rows: 1, cols: 12 });
Object.assign(actorOf(data), { y: 0 });
Object.assign(bOf(data).units.find(row => row.id === 'player'), { y: 0 });
Object.assign(bOf(data).units.find(row => row.id === '敌乙'), { x: 1, y: 0 });
const cells = engine.reachable(data);
assert.ok(cells.some(cell => cell.x === 3 && cell.cost === 3));
assert.ok(!cells.some(cell => cell.x === 1));
result = cpu.step(data, () => .01);
assert.equal(result.ok, true, result.error);
data = start();
actorOf(data).moveRemaining = 1;
Object.assign(bOf(data).units.find(row => row.id === 'player'), { x: 3 });
bOf(data).terrain = [0, 1, 2].map(y => ({ x: 1, y, blocked: true }));
result = cpu.step(data, () => .01);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).actionCpuMeta.last.intent, 'move');
assert.equal(actorOf(result.data).y, 2);
// Protected, off-field and dead targets are excluded; resource/banned restrictions still apply.
data = start([{ 名称: '耗尽', power: 5, range: 'global', 灵性消耗: 1000 }]);
actorOf(data).skillControl = { banned: [{ name: '普通攻击' }] };
result = cpu.step(data, () => .01);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).actionCpuMeta.last.intent, 'wait');
data = start();
bOf(data).units.find(row => row.id === 'player').offField = true;
assert.equal(cpu.preview(data).intent, 'wait');
data = start([{ 名称: '远击', power: 20, range: 'global' }]);
const ally = structuredClone(bOf(data).units.find(row => row.id === 'player'));
Object.assign(ally, { id: '盟友', source: 'npc', controller: 'npc', x: 5, y: 1 });
bOf(data).units.push(ally);
data.npc_data.盟友 = card();
actorOf(data).moveRemaining = 0;
bOf(data).units.find(row => row.id === 'player').rank = 5;
bOf(data).balanceAuthority.relations.敌甲 = { casterId: '敌甲', targetId: 'player',
  activeFromRound: 1, expireAfterRound: 100 };
assert.equal(cpu.preview(data).target, 'player', 'Balance takes precedence over nearer rank tiers.');
bOf(data).balanceAuthority.relations = {};
bOf(data).units.find(row => row.id === 'player').bribery =
  { '贿赂：魅惑': { 敌甲: { until: 100 } } };
assert.equal(cpu.preview(data).target, '盟友', 'Charm-protected units cannot be targeted.');
bOf(data).units.find(row => row.id === 'player').bribery = {};
bOf(data).enemyControl.processes = [{ casterId: 'player', targetId: '敌乙' }];
assert.equal(cpu.preview(data).target, 'player', 'An undamaged enemy marionette caster is prioritized.');
bOf(data).enemyControl.damaged = ['player'];
assert.equal(cpu.preview(data).target, '盟友', 'Actual damage removes special caster priority.');
// Hazard forecasts retain signed adaptation, clean firing cells win, and movement deaths
// cannot use the newly current player's attack slot.
data = start();
bOf(data).terrain = [{ x: 3, y: 0, id: 'fireSurface', name: '烈焰', rank: 0 }];
const plan = cpu.preview(data);
assert.ok(plan.moveTo.x !== 3 || plan.moveTo.y !== 0);
fields.withRuntime(bOf(data), data, () => .5, rt => {
  const hero = rt.heroes.find(row => row.heroId === '敌甲');
  const terrain = { id: 'fireSurface', rank: 8, 种类: 'hazard' };
  assert.ok(rt.terrainHazardScore(hero, terrain) < 0);
  hero.unit.tags = [{ name: '火焰', stacks: 1, duration: 99 }];
  assert.ok(rt.terrainHazardScore(hero, terrain) > 0);
  assert.equal(rt.terrainVitalityCost(hero, terrain), 0);
});
actorOf(data).hp = 500;
actorOf(data).tags = [{ name: '火焰', stacks: 1, duration: 99 }];
Object.assign(actorOf(data), { x: 3, y: 0 });
engine.terrainEntry(bOf(data), actorOf(data));
assert.ok(actorOf(data).hp > 500, 'Adapted terrain restores vitality instead of inflicting damage.');
data = start();
const tile = { id: 'fireSurface', name: '死亡地形', rank: -2 };
bOf(data).terrain = Array.from({ length: 10 }, (_, y) =>
  Array.from({ length: 12 }, (_, x) => ({ ...tile, x, y }))).flat();
actorOf(data).hp = 1;
// No firing cell offers acceptable reward, so the original fallback approaches once.
result = cpu.step(data, () => .01);
assert.equal(result.ok, true, result.error);
assert.equal(actorOf(result.data).hp, 0);
assert.equal(engine.current(bOf(result.data)).id, 'player');
assert.ok(!bOf(result.data).log.some(row => /使用「/.test(row.message)));
// Preview/JSON restore preserve RNG and data; removal of a required module cannot downgrade.
data = start(); snapshot = JSON.stringify(data);
const first = cpu.preview(data);
assert.deepEqual(cpu.preview(JSON.parse(snapshot)), first);
assert.equal(JSON.stringify(data), snapshot);
const restored = cpu.step(JSON.parse(snapshot));
const settled = cpu.step(data);
assert.equal(restored.ok, true, restored.error);
assert.deepEqual(bOf(restored.data).actionCpuMeta, bOf(settled.data).actionCpuMeta);
assert.equal(bOf(restored.data).formulas.seed, bOf(settled.data).formulas.seed);
delete modules['cryptLord.battleActionCpu'];
assert.equal(engine.advanceAuto(data).ok, false);
modules['cryptLord.battleActionCpu'] = cpu;
console.log('Original action CPU: decision, healing, routing, execution and floor restoration passed.');
