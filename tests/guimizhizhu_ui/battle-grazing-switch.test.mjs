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
  'audience-imagination', 'grazing-state', 'battle-formulas', 'battle-auras',
  'battle-field-effect-reference', 'battle-field-effects', 'battle-hard-control',
  'battle-temp-control', 'battle-permanent-control', 'battle-possession',
  'battle-summon', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const summon = modules['cryptLord.battleSummon'];
const pool = { pathways: { 秘祈人途径: ['序列4-黑骑士'], 占卜家途径: ['序列7-魔术师'],
  猎人途径: ['序列6-阴谋家'], 刺客途径: ['序列7-女巫'] }, abilities: {
  '占卜家途径-序列7': [{ 名称: '纸刃', power: 8, range: 'global' }],
  '猎人途径-序列6': [{ 名称: '火球', power: 10, range: 'global' },
    { 名称: '灵魂护甲', isPassive: true, effects: [{ name: '火魂护甲',
      stat: 'defense', type: 'buff', power: 10, valueType: 'percentage', battlePersistent: true }] }],
  '刺客途径-序列7': [{ 名称: '冰锥', power: 9, range: 'global' }],
} };
const card = sequence => ({ 当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: 100000, 当前灵性: 100000, 敏捷: 200, 当前敏捷: 200,
  人性: 10000, 当前人性: 10000, 理智: 10000, 当前理智: 10000, 运气: 40 });
function start() {
  const result = engine.start({ stat_data: { ...card('序列4-黑骑士'),
    $专属玩法: { 秘祈人途径: { 放牧玩法: {
      灵魂列表: { 纸魂: card('序列7-魔术师'), 火魂: card('序列6-阴谋家'),
        冰魂: card('序列7-女巫') }, 激活灵魂: ['纸魂'], 休眠灵魂: ['火魂', '冰魂'],
    } } } }, npc_data: { 敌人: card('序列9-猎人') } },
  { enemies: ['敌人'], seed: 91, pathways: pool.pathways, summonPool: pool,
    tagRules: { mapping: { 阴谋家: { tags: ['火魂标签'] } }, relations: {} } });
  assert.equal(result.ok, true, result.error);
  result.data.cryptLord.teamBattle.phase = 'tactic';
  return result.data;
}
const battle = data => data.cryptLord.teamBattle;
const active = data => data.stat_data.$专属玩法.秘祈人途径.放牧玩法.激活灵魂;
const cast = (data, names) => {
  const result = engine.switchGrazing(data, names);
  assert.equal(result.ok, true, result.error);
  return result.data;
};
let data = start();
const original = JSON.stringify(data), choice = engine.grazingSwitchOptions(data);
assert.equal(JSON.stringify(data), original);
assert.equal(choice.capacity, 1);
assert.ok(choice.cost > 0);
assert.equal(engine.switchGrazing(data, ['纸魂']).changed, false);
for (const names of [['missing'], ['__proto__'], ['$meta'], ['纸魂', '火魂'], null])
  assert.equal(engine.switchGrazing(data, names).ok, false);
assert.equal(JSON.stringify(data), original);
// Fees use the body's rank, positive but insufficient spirit is allowed, and no phase advances.
battle(data).units[0].spirit = 1;
const before = structuredClone(battle(data));
data = cast(data, ['火魂', '火魂']);
assert.deepEqual(Array.from(active(data)), ['火魂']);
assert.equal(battle(data).units[0].spirit, 0);
for (const key of ['phase', 'round', 'index', 'queue', 'formulas'])
  assert.deepEqual(battle(data)[key], before[key]);
assert.equal(engine.switchGrazing(data, ['纸魂']).ok, false);
assert.equal(data.stat_data.当前序列, '序列4-黑骑士');
assert.match(battle(data).units[0].sequence, /阴谋家/u);
assert.equal(battle(data).units[0].rank, 4);
assert.ok(battle(data).units[0].effects.some(row => row.name === '火魂护甲'));
assert.ok(battle(data).units[0].tags.some(row => row.name === '火魂标签'));
// Gates cover action phase, off-field, hard control and ongoing maintenance.
for (const change of [
  b => { b.phase = 'action'; },
  b => { b.units[0].offField = true; },
  b => { b.units[0].controller = 'enemy'; },
  b => { b.units[0].hp = 0; },
  b => { b.units[0].turnSkip = { skipRound: b.round }; },
  b => { b.enemyControl.processes = [{ casterId: 'player' }]; },
  b => { b.possession.processes = [{ casterId: 'player' }]; },
]) {
  data = start(); change(battle(data));
  const unchanged = JSON.stringify(data);
  assert.equal(engine.switchGrazing(data, ['火魂']).ok, false);
  assert.equal(JSON.stringify(data), unchanged);
}
// External souls remain active; no summon roster or quota gets rewritten.
data = start();
battle(data).summon.projections.push({ subtype: '外放灵魂', ownerId: 'player',
  origin: '纸魂', persistent: true });
assert.equal(engine.switchGrazing(data, []).ok, false);
assert.deepEqual(Array.from(engine.grazingSwitchOptions(data).locked), ['纸魂']);
// Repeated switches preserve spent life-saving uses and cooldown metadata.
data = start();
const actor = battle(data).units[0];
actor.lifeSave.strongUsed = 1; actor.lifeSave.weakUsed = 2;
const projectedKey = Object.keys(data.stat_data.序列能力列表).find(key => key.startsWith('#放牧:纸魂:'));
const projected = data.stat_data.序列能力列表[projectedKey];
assert.ok(projected?.length);
projected[0].cooldownRemaining = 3;
data = cast(data, ['火魂']);
data = cast(data, ['纸魂']);
assert.ok(battle(data).units[0].effects.every(row => row.name !== '火魂护甲'));
assert.ok(battle(data).units[0].tags.every(row => row.name !== '火魂标签'));
assert.equal(data.stat_data.序列能力列表[projectedKey][0].cooldownRemaining, 3);
assert.equal(battle(data).units[0].lifeSave.strongLeft, 0);
assert.equal(battle(data).units[0].lifeSave.weakLeft, 1);
const saved = JSON.parse(JSON.stringify(data));
assert.deepEqual(Array.from(engine.grazingSwitchOptions(saved).active), ['纸魂']);
assert.equal(JSON.stringify(saved).includes('grazingSwitchLocked'), false);
data = cast(saved, ['火魂']);
const settled = engine.tactic(data);
assert.equal(settled.ok, true, settled.error);
assert.equal(battle(settled.data).lastTactic.outcomes
  .filter(row => row.stage === 'switch-final').length, 1);
assert.deepEqual(Array.from(battle(settled.data).lastTactic.outcomes
  .find(row => row.stage === 'switch-final').names), ['火魂']);
assert.equal(battle(settled.data).grazingSwitchFinal, undefined);
// A projection failure must never leak a floor write or spent resources.
data = start();
const oldSync = summon.syncProjection;
summon.syncProjection = () => { throw Error('projection failure'); };
const snapshot = JSON.stringify(data);
const failed = engine.switchGrazing(data, ['火魂']);
assert.equal(failed.ok, false); assert.match(failed.error, /恢复/u);
assert.equal(JSON.stringify(data), snapshot);
summon.syncProjection = oldSync;
console.log('Grazing switching: original rules, atomic native state and projection lifecycle passed.');
