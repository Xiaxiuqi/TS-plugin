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
  'battle-rewind', 'battle-extra-action', 'battle-hard-control', 'battle-mind-deprive',
  'battle-temp-control', 'battle-permanent-control', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const manager = modules['cryptLord.battlePermanentControl'];
const fields = modules['cryptLord.battleFieldEffects'];
const formulas = modules['cryptLord.battleFormulas'];
const plain = value => JSON.parse(JSON.stringify(value));
const routes = [
  ['序列4-占卜家', '秘偶化', '诡秘之主'],
  ['序列1-猎人', '征服', '毁灭天灾'],
  ['序列1-观众', '「心灵」权柄', '上帝'],
  ['序列1-收尸人', '奴役', '永恒之暗'],
  ['序列1-药师', '驯化', '堕落母神'],
];
const card = (sequence, speed = 20, spirit = 1000000, humanity = 2000000) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000, 灵性: spirit, 当前灵性: spirit,
  敏捷: speed, 当前敏捷: speed, 理智: 100, 当前理智: 100,
  人性: humanity, 当前人性: humanity, 神性: 1,
  序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] },
});
const bOf = data => data.cryptLord.teamBattle;
const target = data => bOf(data).units.find(unit => unit.id === '敌甲');
function start(sequence = routes[0][0], allies = [], enemies = ['敌甲', '敌乙']) {
  const out = engine.start({ stat_data: card(sequence, 200),
    npc_data: { 敌甲: card('序列5-猎人', 20, 1000, 1000),
      敌乙: card('序列5-猎人', 1, 1000, 1000), 同伴: card(sequence, 10) } },
  { enemies, allies, seed: 789 });
  assert.equal(out.ok, true, out.error); bOf(out.data).phase = 'tactic'; return out.data;
}
function cast(data, subtype = '秘偶化', id = '敌甲', random = () => .5) {
  const out = engine.permanentControl(data, { subtype, target: id }, random);
  assert.equal(out.ok, true, out.error); return out.data;
}
function endRound(data) {
  for (let i = 0; bOf(data).phase !== 'tactic' && bOf(data).status === 'active'; i++) {
    assert.ok(i < 10);
    const out = engine.action(data, { type: 'wait' });
    assert.equal(out.ok, true, out.error);
    const auto = engine.advanceAuto(out.data);
    assert.equal(auto.ok, true, auto.error); data = auto.data;
  }
  return data;
}
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31a-js-pathway-contest-advantages.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
assert.ok(generated.includes(source.slice(source.indexOf('const EnemyControlManager ='),
  source.indexOf('    // ---------- 纯前端管线')).trim()
  .replace('const EnemyControlManager =', 'const OriginalEnemyControlManager =')));
assert.ok(generated.includes(source.slice(source.indexOf('// 5. 秘偶仲裁'),
  source.indexOf('// 9. 🆕 附身仲裁')).trim()));

// All five gates, titles, fees and independent per-battle quotas; no Set enters native JSON data.
for (const [sequence, subtype, title] of routes) {
  let data = start(sequence), b = bOf(data);
  const initial = JSON.stringify(data);
  const choice = engine.permanentControlOptions(data).find(row => row.subtype === subtype);
  assert.ok(choice, sequence);
  assert.equal(JSON.stringify(data), initial);
  assert.ok(engine.permanentControlOptions(start(title)).some(row => row.subtype === subtype));
  const key = choice.stat === '人性' ? 'humanity' : 'spirit';
  const before = b.units[0][key];
  data = cast(data, subtype); b = bOf(data);
  assert.equal(b.units[0][key], before - choice.cost);
  assert.equal(data.stat_data[`当前${choice.stat}`], b.units[0][key]);
  if (subtype === '秘偶化') {
    for (const [layer, percent] of [[1, 40], [2, 80]]) {
      assert.equal(b.enemyControl.processes[0].stacks, layer);
      assert.equal(target(data).side, 'enemy');
      assert.equal(target(data).enemyControlMovePct, percent);
      assert.equal(target(data).effects.filter(effect => effect.enemyControl === 'target').length, 3);
      assert.ok(target(data).effects.filter(effect => effect.enemyControl).every(effect => effect.power === percent));
      const clean = { ...target(data), effects: [], enemyControlMovePct: 0 };
      assert.equal(formulas.attribute(b, target(data), 'attack'),
        Math.floor(formulas.attribute(b, clean, 'attack') * (1 - percent / 100)));
      assert.ok(formulas.movement(b, target(data)) < formulas.movement(b, clean));
      assert.equal(b.units[0].effects.filter(effect => effect.enemyControl === 'caster').length, 2);
      data = endRound(plain(data)); data = cast(data); b = bOf(data);
    }
    assert.equal(b.enemyControl.processes.length, 0);
    assert.deepEqual(plain(b.enemyControl.marionetteDone), ['player']);
    assert.equal(target(data).enemyControlMovePct, 0);
    assert.ok(b.units.every(unit => !unit.effects.some(effect => effect.enemyControl)));
  }
  assert.equal(target(data).side, 'ally');
  assert.equal(target(data).controller, 'player');
  const reason = engine.permanentControlOptions({ ...data, cryptLord: {
    ...data.cryptLord, teamBattle: { ...b, phase: 'tactic' } } })
    .find(row => row.subtype === subtype).reason;
  assert.match(reason, /名额已用完/u);
  assert.ok(Object.values(b.enemyControl).every(Array.isArray));
  const reloaded = plain(data);
  manager.finish(bOf(reloaded));
  assert.equal(target(reloaded).side, 'ally');
}
let data = start('序列4-占卜家/序列1-猎人/序列1-观众/序列1-收尸人/序列1-药师');
assert.equal(engine.permanentControlOptions(data).length, 5);
for (const [sequence, subtype] of routes.slice(1))
  assert.ok(!engine.permanentControlOptions(start(sequence.replace('序列1', '序列2')))
    .some(row => row.subtype === subtype));
assert.ok(!engine.permanentControlOptions(start('序列6-占卜家')).length);

// Range gate follows the original overall rank; abandoning or switching restarts, failure drops a layer.
data = start('序列5-占卜家'); let b = bOf(data);
b.units[0].x = 4; b.units[0].y = 4; target(data).x = 5; target(data).y = 5;
assert.equal(engine.permanentControlOptions(data)[0].targets.length, 1);
target(data).x = 6;
assert.equal(engine.permanentControlOptions(data)[0].targets.length, 0);
assert.equal(engine.permanentControl(data, { subtype: '秘偶化', target: '敌甲' }).ok, false);
data = cast(start()); data = endRound(data);
data = engine.tactic(data, 'skip', () => .99).data; b = bOf(data);
assert.equal(b.enemyControl.processes.length, 0);
assert.ok(b.units.every(unit => !unit.effects.some(effect => effect.enemyControl)));
data = cast(start()); data = endRound(data);
data = cast(data, '秘偶化', '敌乙'); b = bOf(data);
assert.equal(b.enemyControl.processes[0].targetId, '敌乙');
assert.equal(b.enemyControl.processes[0].stacks, 1);
assert.equal(target(data).enemyControlMovePct, 0);
data = cast(start()); data = endRound(data); data = cast(data); data = endRound(data); b = bOf(data);
b.units[0].spirit = 1000;
let draws = 0;
data = cast(data, '秘偶化', '敌甲', () => draws++ % 2 ? .999 : 0); b = bOf(data);
assert.equal(b.enemyControl.processes[0].stacks, 1);
data = endRound(data); b = bOf(data); b.units[0].spirit = 1000;
draws = 0;
data = cast(data, '秘偶化', '敌甲', () => draws++ % 2 ? .999 : 0);
assert.equal(bOf(data).enemyControl.processes.length, 0);

// Injury flags are current actual losses, consumed for this caster/target pair only.
data = start(); b = bOf(data);
manager.markDamaged(b, target(data), 0);
assert.equal(b.enemyControl.damaged.length, 0);
manager.markDamaged(b, target(data), 1);
manager.markDamaged(b, b.units[2], 1);
assert.equal(engine.permanentControlOptions(data)[0].targets.find(row => row.id === '敌甲').penalty, .5);
const prepared = manager.prepare(b, data, () => .5, [], { subtype: '秘偶化', target: '敌甲' });
assert.equal(prepared[0].penalty, .5);
assert.ok(!b.enemyControl.damaged.includes('敌甲'));
assert.ok(b.enemyControl.damaged.includes('敌乙'));
fields.withRuntime(b, data, undefined, rt => {
  const flags = rt.enemyControl.ensure(rt.bm).damaged;
  manager.markDamaged(b, b.units[0], 1);
  assert.equal(flags.has('player'), true);
  flags.add('敌甲');
  assert.deepEqual(plain(b.enemyControl.damaged).sort(), ['player', '敌乙', '敌甲'].sort());
  flags.delete('敌甲');
  assert.ok(b.enemyControl.damaged.includes('player'));
});
data = start(); b = bOf(data); b.phase = 'action';
const attacked = engine.action(data, { id: 'skill:能力:0', target: '敌甲' }, () => .5);
assert.equal(attacked.ok, true, attacked.error);
assert.ok(bOf(attacked.data).enemyControl.damaged.includes('敌甲'));

// Failed one-shot controls charge and consume only their own budget.
data = start('序列1-猎人/序列1-观众'); b = bOf(data);
const fee = engine.permanentControlOptions(data).find(row => row.subtype === '征服').cost;
b.units[0].spirit = 18000 + fee;
draws = 0;
data = cast(data, '征服', '敌甲', () => draws++ % 2 ? .999 : 0); b = bOf(data);
assert.equal(target(data).side, 'enemy');
assert.equal(b.units[0].spirit, 18000);
assert.deepEqual(plain(b.enemyControl.conquestUsed), ['player']);
assert.deepEqual(plain(b.enemyControl.mindUsed), []);
data = start('序列1-收尸人'); target(data).sequence = '序列5-收尸人'; b = bOf(data);
assert.equal(engine.permanentControlOptions(data)[0].targets.find(row => row.id === '敌甲').penalty, 1);
target(data).sequence = '序列1-收尸人';
assert.equal(engine.permanentControlOptions(data)[0].targets.find(row => row.id === '敌甲').penalty, .5);
data = start('永恒之暗'); target(data).sequence = '序列5-收尸人';
assert.equal(engine.permanentControlOptions(data)[0].targets.find(row => row.id === '敌甲').penalty, .5);
data = start('序列1-药师'); b = bOf(data);
b.units[0].humanity = b.units[0].spirit;
assert.equal(engine.permanentControlOptions(data)[0].stat, '灵性');
data = start('序列1-观众'); b = bOf(data); b.units[0].humanity = 0;
assert.match(engine.permanentControlOptions(data)[0].reason, /人性为 0/u);
const unchanged = JSON.stringify(data);
assert.equal(engine.permanentControl(data, { subtype: '「心灵」权柄', target: '敌甲' }).ok, false);
assert.equal(JSON.stringify(data), unchanged);

// Same-target arbitration: player priority, no duplicated process, permanent conversion clears old control.
data = start(undefined, ['同伴']); b = bOf(data);
const rows = manager.prepare(b, data, () => .1, [], { subtype: '秘偶化', target: '敌甲' });
assert.equal(rows.length, 2);
manager.apply(b, data, () => .5, rows);
assert.equal(b.enemyControl.processes.length, 1);
assert.equal(b.enemyControl.processes[0].casterId, 'player');
fields.withRuntime(b, data, undefined, rt => {
  const foe = rt.heroes.find(hero => hero.heroId === '敌甲');
  const ally = rt.heroes.find(hero => hero.heroId === '同伴');
  rt.tempAllegiance.begin(rt.bm, ally, foe, '「阶层」权柄',
    { casterScore: 10, targetScore: 1 }, [], []);
});
assert.equal(b.enemyControl.processes.length, 0);
assert.equal(target(data).enemyControlMovePct, 0);
fields.withRuntime(b, data, undefined, rt =>
  rt.enemyControl.convertTeam(rt.bm, rt.heroes.find(hero => hero.heroId === '敌甲'), rt.heroes[0], []));
assert.equal(b.tempAllegiance.processes.length, 0);
modules['cryptLord.battleTempControl'].finish(b);
assert.equal(target(data).side, 'ally');

// Ongoing NPC marionette is mandatory, occupies optional tactics, and invalid/hard-controlled casters stop.
data = start(); b = bOf(data); target(data).sequence = '序列4-占卜家';
target(data).spirit = 10000000;
fields.withRuntime(b, data, undefined, rt => {
  const npc = rt.heroes.find(hero => hero.heroId === '敌甲');
  rt.enemyControl.applyMarionetteWin(rt.bm, npc, rt.heroes[0],
    { casterScore: 10, targetScore: 1 }, [], []);
});
const maintained = manager.maintain(b, data, () => .99);
assert.equal(maintained.length, 1);
assert.equal(maintained[0].actor, '敌甲');
assert.equal(manager.prepare(b, data, () => .1, ['敌甲']).length, 0);
target(data).turnSkip = { reason: '昏迷', skipRound: b.round, consumed: false };
assert.equal(manager.maintain(b, data, () => .1).length, 0);
assert.equal(b.enemyControl.processes.length, 0);
data = cast(start()); b = bOf(data); target(data).hp = 0;
manager.sweep(b);
assert.equal(b.enemyControl.processes.length, 0);
data = start();
delete modules['cryptLord.battlePermanentControl'];
assert.match(engine.permanentControl(data, { subtype: '秘偶化', target: '敌甲' }).error, /模块不可用/u);
modules['cryptLord.battlePermanentControl'] = manager;
console.log('PASS: five permanent controls, original marionette lifecycle, fees/quotas, injury/range, conversion, NPC and native JSON state.');
