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
  'battle-extra-action', 'battle-hard-control', 'battle-mind-deprive', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const mind = modules['cryptLord.battleMindDeprive'];
const fields = modules['cryptLord.battleFieldEffects'];
const formulas = modules['cryptLord.battleFormulas'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = (sequence, speed = 20, humanity = 1000) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000, 灵性: 1000, 当前灵性: 1000,
  敏捷: speed, 当前敏捷: speed, 理智: 100, 当前理智: 100,
  人性: humanity, 当前人性: humanity, 神性: 1, 序列能力列表: {},
});
const bOf = data => data.cryptLord.teamBattle;
function start(sequence = '序列4-观众', enemies = ['敌甲', '敌乙']) {
  const out = engine.start({ stat_data: card(sequence, 200, 50000),
    npc_data: { 敌甲: card('序列5-猎人'), 敌乙: card('序列5-猎人', 1) } },
  { enemies, seed: 789 });
  assert.equal(out.ok, true, out.error);
  const b = bOf(out.data);
  b.phase = 'tactic';
  b.units[0].x = 4; b.units[0].y = 4;
  b.units.slice(1).forEach((unit, i) => { unit.x = 5 + i; unit.y = 4; });
  return out.data;
}
function fixedOutcome(data, key) {
  bOf(data).mindDepriveMeta.config.MIND_DEPRIVE_OUTCOMES = [{ key, weight: 100 }];
  return data;
}
function cast(data) {
  const out = engine.mindDeprive(data, () => .5);
  assert.equal(out.ok, true, out.error); return out.data;
}
function finishRound(data) {
  for (let i = 0; bOf(data).phase !== 'tactic' && bOf(data).status === 'active'; i++) {
    assert.ok(i < 10);
    const action = engine.action(data, { type: 'wait' });
    assert.equal(action.ok, true, action.error);
    const auto = engine.advanceAuto(action.data);
    assert.equal(auto.ok, true, auto.error); data = auto.data;
  }
  return data;
}

// Keep the original complete managers, not a rewritten approximation of their five outcomes.
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b1-js-mystery-sleep-and-effect.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
for (const manager of ['ForcedMoveManager', 'MindDepriveManager'])
  assert.ok(generated.includes(source.slice(source.indexOf(`const ${manager} =`),
    source.indexOf(`console.log('[战斗系统] ${manager}`)).trim()));
for (const [sequence, eligible] of [
  ['序列4-观众', true], ['序列5-观众', false], ['序列1-观众', true],
  ['上帝', true], ['序列4-水手/序列4-观众', true], ['序列4-水手', false],
]) assert.equal(Boolean(engine.mindDepriveOptions(start(sequence))), eligible);
let data = start(), b = bOf(data);
const snapshot = JSON.stringify(data), option = engine.mindDepriveOptions(data);
mind.statusLines(b, b.units[1]);
assert.equal(JSON.stringify(data), snapshot);
assert.equal(option.targets.length, 2);
assert.deepEqual(plain(option.odds.map(row => row.weight)), [30, 25, 20, 15, 10]);
assert.equal(option.tremblePct, 20);
assert.equal(option.cost, Math.max(1, Math.round(b.fieldEffectMeta.averages['4'].人性 * .08)));
b.units[2].x = 7;
assert.equal(engine.mindDepriveOptions(data).targets.length, 1);
b.units[1].offField = true;
assert.match(engine.mindDepriveOptions(data).reason, /范围内/u);
assert.equal(engine.mindDeprive(data).ok, false);
b.units[1].offField = false; b.units[0].humanity = 0;
assert.match(engine.mindDepriveOptions(data).reason, /为 0/u);
assert.equal(engine.mindDeprive(data).ok, false);

// Five complete engine routes, one fee for the area, JSON reload, exact expiration.
for (const key of ['颤栗', '奔逃', '瘫软', '昏迷', '狂热追随']) {
  data = fixedOutcome(start(), key); b = bOf(data);
  const fee = engine.mindDepriveOptions(data).cost;
  const initialPositions = b.units.map(unit => [unit.x, unit.y]);
  data = cast(data); b = bOf(data);
  assert.equal(b.round, 2);
  assert.equal(b.units[0].humanity, 50000 - fee);
  assert.equal(data.stat_data.当前人性, b.units[0].humanity);
  assert.equal(b.units[0].spirit, 1000);
  const hits = b.lastTactic.outcomes.find(row => row.actor === 'player').hits;
  assert.equal(hits.length, 2);
  if (key === '颤栗') {
    assert.equal(b.units[1].effects.filter(effect => effect.mindDeprive).length, 2);
    assert.equal(b.units[1].effects[0].mindDepriveUntil, 2);
    const target = b.units[1], clean = { ...target, effects: [] };
    for (const stat of ['attack', 'defense'])
      assert.equal(formulas.attribute(b, target, stat),
        Math.round(formulas.attribute(b, clean, stat) * .8));
    fields.withRuntime(b, data, undefined, rt => rt.mindDeprive.setTremble(rt.heroes[1], 20, 2));
    assert.equal(b.units[1].effects.filter(effect => effect.mindDeprive).length, 2);
  } else if (key === '瘫软') {
    assert.equal(b.units[1].mindDepriveMovePct, 100);
    assert.equal(formulas.movement(b, b.units[1]), 0);
    b.formulas.values['movement.order'] = 'preClamp';
    b.units[1].effects.push({ name: '移动增益', stat: 'movement',
      type: 'buff', valueType: 'fixed', power: 10, duration: 1 });
    assert.equal(formulas.movement(b, b.units[1]), 0);
  } else if (key === '昏迷') {
    assert.deepEqual(plain(b.units[1].turnSkip), { reason: '昏迷', skipRound: 2, consumed: false });
  } else if (key === '奔逃') {
    assert.notDeepEqual([b.units[1].x, b.units[1].y], initialPositions[1]);
    assert.equal(Boolean(b.units[1].moved), false);
  } else {
    assert.equal(b.tempAllegiance.processes.length, 1);
    assert.equal(b.units.filter(unit => unit.side === 'ally').length, 2);
    assert.equal(hits.filter(hit => hit.outcome === '狂热追随').length, 1);
    assert.equal(hits.filter(hit => hit.downgraded).length, 1);
    assert.equal(mind.originSide(b, b.units[1]), 'enemy');
  }
  data = finishRound(plain(data)); b = bOf(data);
  assert.equal(b.round, 2);
  if (key === '昏迷') assert.equal(b.units[1].turnSkip.consumed, true);
  if (key === '狂热追随') {
    assert.equal(b.tempAllegiance.processes.length, 0);
    assert.equal(b.units[1].side, 'enemy');
    assert.equal(b.units[1].controller, 'npc');
  }
  const next = engine.tactic(data, 'skip', () => .99);
  assert.equal(next.ok, true, next.error); b = bOf(next.data);
  assert.equal(b.round, 3);
  assert.ok(b.units.every(unit => !unit.effects.some(effect => effect.mindDeprive)));
  assert.ok(b.units.every(unit => !unit.mindDepriveMovePct));
  assert.ok(b.units.every(unit => !unit.turnSkip));
}

// Failed contests charge; another conversion after preparation cannot invalidate the payment.
data = start(); b = bOf(data);
b.units[0].humanity = 1000 + engine.mindDepriveOptions(data).cost;
let draws = 0;
const prepared = mind.prepare(b, data, () => draws++ % 2 ? .999 : 0, [], true);
assert.equal(b.units[0].humanity, 1000);
assert.ok(mind.apply(b, data, () => .5, prepared)[0].hits.every(hit => hit.outcome === 'resisted'));
data = fixedOutcome(start(), '颤栗'); b = bOf(data);
const staged = mind.prepare(b, data, () => .5, [], true);
b.units[1].side = 'ally';
assert.equal(mind.apply(b, data, () => .5, staged)[0].hits[0].outcome, 'invalid');
assert.equal(b.units[1].effects.filter(effect => effect.mindDeprive).length, 0);

// Existing skip is not refreshed; follow chooses highest margin and never ends a last-enemy battle.
data = fixedOutcome(start(), '昏迷'); b = bOf(data);
b.units[1].turnSkip = { reason: '沉睡', skipRound: 2, consumed: false };
data = cast(data); b = bOf(data);
assert.equal(b.units[1].turnSkip.reason, '沉睡');
assert.equal(b.units[1].mindDepriveMovePct, 100);
data = fixedOutcome(start(), '狂热追随'); b = bOf(data);
const follow = mind.prepare(b, data, () => .5, [], true);
follow[0].attempts[1].roll.casterScore += 100000;
mind.apply(b, data, () => .5, follow);
assert.equal(b.tempAllegiance.processes[0].targetId, '敌乙');
assert.equal(b.units[1].mindDepriveMovePct, 100);
mind.finish(b);
assert.equal(b.units[2].side, 'enemy');
assert.equal(b.tempAllegiance.processes.length, 0);
data = fixedOutcome(start(), '狂热追随'); b = bOf(data);
b.tempAllegiance.processes.push({ casterId: 'player', targetId: '不存在的目标',
  subtype: '旧短控', originTeamType: 'enemy', originController: 'npc', expireRound: 2 });
const occupiedFollow = mind.prepare(b, data, () => .5, [], true);
assert.ok(mind.apply(b, data, () => .5, occupiedFollow)[0].hits.every(hit =>
  hit.outcome === '瘫软' && hit.downgraded));
data = fixedOutcome(start('序列4-观众', ['敌甲']), '狂热追随');
data = cast(data);
assert.equal(bOf(data).status, 'active');
assert.equal(bOf(data).result, null);
data = finishRound(data);
assert.equal(bOf(data).units[1].side, 'enemy');
assert.equal(bOf(data).status, 'active');

// A permanent conversion drops the pending restoration rather than undoing that conversion.
data = fixedOutcome(start('序列4-观众', ['敌甲']), '狂热追随'); data = cast(data); b = bOf(data);
fields.withRuntime(b, data, undefined, rt =>
  rt.tempAllegiance.releaseOnTarget(rt.bm, rt.heroes[1]));
assert.equal(b.tempAllegiance.processes.length, 0);
mind.finish(b); assert.equal(b.units[1].side, 'ally');

// Forced movement obeys bounds/blocked cells and never spends the actor's voluntary move.
data = start(); b = bOf(data);
fields.withRuntime(b, data, () => .5, rt => {
  const target = rt.heroes[1], caster = rt.heroes[0];
  b.terrain = [{ x: 6, y: 4, blocked: true }];
  const moved = rt.forcedMove.away(rt.bm, target, caster, '逃离');
  assert.ok(moved.moved);
  assert.ok(target.x !== 6 || target.y !== 4);
  assert.equal(Boolean(target.unit.moved), false);
  target.unit.hp = 0;
  assert.equal(rt.bm.board.place(target, 8, 4), false);
});
data = start(); b = bOf(data);
b.units[2].x = 0; b.units[2].y = 0;
b.terrain = [{ x: 6, y: 4, id: 'fireSurface', name: '火面', rank: 4 }];
b.units[1].hp = 1;
fields.withRuntime(b, data, () => .5, rt => {
  const moved = rt.forcedMove.away(rt.bm, rt.heroes[1], rt.heroes[0], '逃离');
  assert.equal(moved.steps, 1);
  assert.equal(b.units[1].hp, 0);
  assert.equal(b.units[1].x, 6);
  assert.ok(b.log.some(row => /火面/u.test(row.message)));
});
data = start(); b = bOf(data);
b.units[0].x = b.board.cols - 2; b.units[1].x = b.board.cols - 1;
b.terrain = Array.from({ length: 3 }, (_, i) =>
  ({ x: b.units[1].x, y: b.units[1].y + i - 1, blocked: true }));
fields.withRuntime(b, data, () => .5, rt =>
  assert.equal(rt.forcedMove.away(rt.bm, rt.heroes[1], rt.heroes[0], '逃离').moved, false));

// Default weights have exact intervals; incomplete sums retain the original last-entry fallback.
data = start(); b = bOf(data);
for (const [draw, expected] of [[0, '颤栗'], [.299, '颤栗'], [.3, '奔逃'],
  [.55, '瘫软'], [.75, '昏迷'], [.9, '狂热追随'], [.999, '狂热追随']])
  fields.withRuntime(b, data, () => draw, rt => assert.equal(rt.mindDeprive.rollOutcome(), expected));
b.mindDepriveMeta.config.MIND_DEPRIVE_OUTCOMES = [{ key: '颤栗', weight: 10 }, { key: '瘫软', weight: 10 }];
fields.withRuntime(b, data, () => .99, rt => assert.equal(rt.mindDeprive.rollOutcome(), '瘫软'));

// NPC gate and occupied/controlled actors: only an eligible, free NPC with a pool can request.
data = start(); b = bOf(data);
b.units[1].sequence = '序列4-观众'; b.units[1].humanity = 50000;
b.units[0].humanity = 100;
assert.equal(mind.prepare(b, data, () => .31, [], false).length, 0);
assert.equal(mind.prepare(b, data, () => .1, ['敌甲'], false).length, 0);
b.units[1].controller = 'player';
assert.equal(mind.prepare(b, data, () => .1, [], false).length, 0);
b.units[1].controller = 'npc';
assert.equal(mind.prepare(b, data, () => .1, [], false).length, 1);
data = start();
delete modules['cryptLord.battleMindDeprive'];
assert.match(engine.mindDeprive(data).error, /模块不可用/u);
modules['cryptLord.battleMindDeprive'] = mind;
console.log('PASS: original mind-deprivation outcomes, area fee, duration, forced movement, allegiance, NPC gate and native-floor transactions.');
