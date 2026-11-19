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
  'battle-field-effects', 'battle-effect-transfer', 'battle-exile', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], manager = modules['cryptLord.battleExile'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = (sequence, spirit, speed) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: spirit, 当前灵性: spirit, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1,
  序列能力列表: { 能力: [{ 名称: '终结', power: 5000000, range: 'global' }] },
});
const start = (sequence = '序列4-学徒', spirit = 100000) => {
  const result = engine.start({ stat_data: card(sequence, spirit, 200),
    npc_data: { 敌甲: { ...card('序列5-猎人', 100, 20), 序列能力列表: {} },
      敌乙: { ...card('序列5-猎人', 100, 1), 序列能力列表: {} } } },
  { enemies: ['敌甲', '敌乙'], seed: 123 });
  assert.equal(result.ok, true, result.error); return result.data;
};
const cast = (data, subtype = '放逐', target = '敌甲') => {
  const b = data.cryptLord.teamBattle;
  const result = manager.resolve(b, data, () => .5, { actor: 'player', subtype, target });
  assert.equal(result.ok, true, result.error); return result;
};
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b2-js-aura-and-grazing-projection.txt',
  import.meta.url), 'utf8');
const oracle = vm.createContext({ TacticCatalog: manager.defaults() });
vm.runInContext(source.slice(source.indexOf('const ExileManager ='),
  source.indexOf("console.log('[战斗系统] ExileManager")) + '\nthis.manager = ExileManager;', oracle);
const rt = fields.withRuntime(start().cryptLord.teamBattle, {}, () => .5, value => value);
assert.deepEqual(plain(rt.exile.SUBTYPES), plain(oracle.manager.SUBTYPES));

// Qualification, pure reads, canonical unlock, fee and two complete absent rounds.
for (const [sequence, subtype] of [['序列4-学徒', '放逐'], ['诡秘之主', '放逐'],
  ['序列4-仲裁人', '宣判：放逐'], ['失序者', '宣判：放逐']]) {
  const d = start(sequence), b = d.cryptLord.teamBattle;
  assert.ok(manager.options(b, b.units[0], d).some(row => row.subtype === subtype));
}
assert.equal(manager.options(start('序列5-学徒').cryptLord.teamBattle,
  start('序列5-学徒').cryptLord.teamBattle.units[0], {}).length, 0);
let data = start(), b = data.cryptLord.teamBattle;
const beforeRead = JSON.stringify(data);
const choice = manager.options(b, b.units[0], data)[0];
manager.statusLines(b, b.units[1]); engine.get(data);
assert.equal(JSON.stringify(data), beforeRead);
const out = cast(data);
assert.equal(out.outcomes[0].cost, choice.cost);
assert.equal(b.units[0].spirit, 100000 - choice.cost);
assert.equal(b.units[1].exiled, true);
assert.equal(b.units[1].x, null);
assert.equal(b.exile.processes[0].returnRound, b.round + 2);
assert.equal(b.units[1].effects.find(e => e.exilePoison).power, choice.poison);
b.phase = 'tactic';
assert.equal(engine.exileOptions(data)[0].targets.some(row => row.id === '敌甲'), false);
const invalid = JSON.stringify(data);
assert.equal(engine.exile(data, { subtype: '放逐', target: '敌甲' }).ok, false);
assert.equal(JSON.stringify(data), invalid);
b.round = 2; manager.endRound(b);
assert.equal(b.units[1].exiled, true);
b.round = 3; manager.endRound(b);
assert.equal(b.units[1].exiled, false);
assert.ok(Math.max(Math.abs(b.units[1].x - b.units[0].x),
  Math.abs(b.units[1].y - b.units[0].y)) <= 1);

// Native engine: off-field poison ticks once per action slot, not per read/round transition.
data = start(); b = data.cryptLord.teamBattle; b.phase = 'tactic';
let result = engine.exile(data, { subtype: '放逐', target: '敌甲' }, () => .5);
assert.equal(result.ok, true, result.error);
data = result.data; b = data.cryptLord.teamBattle;
const poison = b.units[1].effects.find(row => row.exilePoison);
assert.equal(poison.duration, 2);
result = engine.action(data, { type: 'wait' }, () => .5);
data = result.data; b = data.cryptLord.teamBattle;
assert.equal(b.units[1].hp, 10000 - choice.poison);
assert.equal(b.units[1].effects.find(row => row.exilePoison).duration, 1);
assert.equal(b.phase, 'action');
assert.equal(b.units[b.units.findIndex(unit => unit.id === b.queue[b.index])].id, '敌乙');
result = engine.advanceAuto(data); assert.equal(result.ok, true, result.error); data = result.data;
result = engine.tactic(data); assert.equal(result.ok, true, result.error); data = result.data;
result = engine.action(data, { type: 'wait' }, () => .5); assert.equal(result.ok, true, result.error); data = result.data;
result = engine.advanceAuto(data); assert.equal(result.ok, true, result.error); data = result.data; b = data.cryptLord.teamBattle;
assert.equal(b.units[1].hp, 10000 - choice.poison * 2);
assert.equal(b.units[1].exiled, false);
assert.equal(b.exile.processes.length, 0);
assert.equal(b.units[1].effects.some(row => row.exilePoison), false);

// Canon has no poison; occupied origin searches outward; death and early finish release coordinates.
data = start('序列4-窥秘人');
data.stat_data.$专属玩法 = { 窥秘人途径: { 神秘再现玩法: {
  法术解锁账本: { peach_blossom_source: {} },
} } };
b = data.cryptLord.teamBattle;
cast(data, '神秘再现·桃花的源头');
assert.equal(b.units[1].effects.some(row => row.exilePoison), false);
const process = b.exile.processes[0];
b.units[2].x = process.originX; b.units[2].y = process.originY;
b.round = process.returnRound; manager.endRound(b);
assert.ok(b.units[1].x !== b.units[2].x || b.units[1].y !== b.units[2].y);
data = start(); b = data.cryptLord.teamBattle; cast(data);
b.units[1].hp = 0; manager.checkDead(b);
assert.equal(b.exile.processes.length, 0); assert.equal(b.units[1].exiled, false);
assert.ok(Number.isFinite(b.units[1].x));
cast(data, '放逐', '敌乙'); manager.finish(b);
assert.equal(b.exile.processes.length, 0);
assert.ok(b.units.every(unit => Number.isFinite(unit.x) && !unit.exiled));

// Success and failed contests both charge; impossible target never charges or advances dice.
data = start('序列4-学徒', 11000); b = data.cryptLord.teamBattle;
const failed = manager.resolve(b, data, (() => {
  const rolls = [0, .999999]; return () => rolls.shift() ?? .5;
})(), { actor: 'player', subtype: '放逐', target: '敌甲' });
assert.equal(failed.ok, true); assert.equal(failed.outcomes[0].applied, false);
assert.ok(b.units[0].spirit < 11000); assert.equal(b.units[1].exiled, undefined);
data = start('序列4-学徒', 1); b = data.cryptLord.teamBattle;
const noChange = JSON.stringify(data);
assert.equal(manager.resolve(b, data, () => { throw Error('unexpected draw'); },
  { actor: 'player', subtype: '放逐', target: '敌甲' }).ok, false);
assert.equal(JSON.stringify(data), noChange);

// Exiling the final living opponent cannot grant victory; flagged module absence blocks commands.
data = start(); b = data.cryptLord.teamBattle; b.units[2].hp = 0; b.phase = 'tactic';
result = engine.exile(data, { subtype: '放逐', target: '敌甲' }, () => .5);
assert.equal(result.ok, true); data = result.data;
assert.equal(data.cryptLord.teamBattle.status, 'active');
delete modules['cryptLord.battleExile'];
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
modules['cryptLord.battleExile'] = manager;
// Simultaneous contenders charge independently; the player wins the original arbitration.
const composed = { stat_data: card('序列4-学徒', 100000, 200),
  npc_data: { 同伴: card('序列4-学徒', 100000, 400),
    敌甲: { ...card('序列5-猎人', 100, 20), 序列能力列表: {} } } };
data = engine.start(composed, { allies: ['同伴'], enemies: ['敌甲'], seed: 123 }).data;
b = data.cryptLord.teamBattle;
const contenders = manager.resolve(b, data, () => .1,
  { actor: 'player', subtype: '放逐', target: '敌甲' });
assert.equal(contenders.outcomes.length, 2);
assert.equal(b.exile.processes.length, 1);
assert.equal(b.exile.processes[0].casterId, 'player');
assert.ok(b.units.find(row => row.id === '同伴').spirit < 100000);
assert.equal(contenders.outcomes.find(row => row.actor === '同伴').applied, false);
manager.finish(b);
assert.equal(manager.resolve(b, data, () => .1, null, ['同伴']).length, 0);

// Origin-return invokes the existing terrain hook; poison deaths bypass life-save and restore bodies.
data = start('序列4-仲裁人'); b = data.cryptLord.teamBattle;
cast(data, '宣判：放逐');
const p = b.exile.processes[0];
b.terrain = [{ x: p.originX, y: p.originY, id: 'fireSurface', name: '火面', rank: 4 }];
b.round = p.returnRound;
manager.endRound(b);
assert.ok(b.units[1].hp < 10000);
assert.ok(b.log.some(row => /火面/u.test(row.message)));
data = start(); b = data.cryptLord.teamBattle; b.phase = 'tactic';
result = engine.exile(data, { subtype: '放逐', target: '敌甲' }, () => .5);
data = result.data; b = data.cryptLord.teamBattle;
b.units[1].hp = 1;
const lifeBefore = JSON.stringify(b.units[1].lifeSave);
result = engine.action(data, { type: 'wait' }, () => .5);
assert.equal(result.ok, true); b = result.data.cryptLord.teamBattle;
assert.equal(b.units[1].hp, 0); assert.equal(b.units[1].exiled, false);
assert.equal(JSON.stringify(b.units[1].lifeSave), lifeBefore);
assert.ok(Number.isFinite(b.units[1].x));
console.log('PASS: original exile rules, native lifecycle, fees, targets, return/death and read purity.');
