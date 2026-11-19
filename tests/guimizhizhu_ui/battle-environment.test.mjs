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
  'personal-battle-state', 'battle-formulas', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-hard-control', 'battle-rule-change',
  'battle-environment', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const manager = modules['cryptLord.battleEnvironment'];
const fields = modules['cryptLord.battleFieldEffects'];
const formulas = modules['cryptLord.battleFormulas'];
const plain = value => JSON.parse(JSON.stringify(value));
const sequence = '序列4-歌颂者/序列5-通识者/序列3-观众/序列1-秘祈人/序列4-水手/序列4-窥秘人';
const ledger = { 窥秘人途径: { 神秘再现玩法: { 法术解锁账本: { avalon_utopia: {} } } } };
const card = seq => ({ 当前序列: seq,
  活力: 10000, 当前活力: 10000, 敏捷: 100, 当前敏捷: 100,
  灵性: 100000000, 当前灵性: 100000000, 人性: 200000000, 当前人性: 200000000,
  理智: 100, 当前理智: 100, 神性: 1,
  $专属玩法: plain(ledger),
  序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] } });
const bOf = data => data.cryptLord.teamBattle;
const player = data => bOf(data).units[0];
const natural = { 地貌: '海洋', 天气: '小雨', 时间: '深夜' };
function start(seq = sequence, weather = '小雨') {
  const npc_data = {};
  for (const [id, seq] of [['敌甲', '序列9-水手'], ['敌乙', '序列5-猎人']])
    npc_data[id] = { ...card(seq), 人性: 1000, 当前人性: 1000,
      灵性: 1000, 当前灵性: 1000 };
  const result = engine.start({ stat_data: card(seq), npc_data },
    { enemies: Object.keys(npc_data), seed: 911,
      opening: { 自然环境: { ...natural, 天气: weather },
        基底: { 名称: '平地', 分级: 0 }, 笔刷: [] } });
  assert.equal(result.ok, true, result.error);
  bOf(result.data).phase = 'tactic'; return result.data;
}
const cast = (data, subtype) => {
  const result = engine.changeEnvironment(data, { subtype }, () => .99);
  assert.equal(result.ok, true, result.error);
  result.data.cryptLord.teamBattle.phase = 'tactic';
  return result.data;
};
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b1-js-mystery-sleep-and-effect.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
for (const name of ['EnvironmentCatalog', 'EnvironmentManager'])
  assert.ok(generated.includes(source.slice(source.indexOf(`const ${name} =`),
    source.indexOf(`console.log('[战斗系统] ${name}`)).trim()));
let data = start(), b = bOf(data), snapshot = JSON.stringify(data);
const choices = engine.environmentOptions(data);
assert.equal(choices.length, 6);
assert.equal(manager.slots(b).length, 4);
assert.equal(b.environment.natural.天气, '小雨');
assert.equal(b.units[1].effects.find(row => row.name === '海洋·攻击力').power, 10);
assert.equal(b.units[1].effects.find(row => row.name === '小雨·攻击力').power, 2);
assert.equal(b.units[1].envMoveBonus, 0);
for (const choice of choices) assert.equal(engine.environmentPreview(data, choice.subtype).ok, true);
assert.equal(JSON.stringify(data), snapshot);
for (const [seq, subtype] of [['序列4-歌颂者', '无暗领域'], ['序列5-通识者', '虚假星空'],
  ['序列3-观众', '梦境迷宫'], ['序列1-秘祈人', '展开堕落领域'], ['序列4-水手', '改变天气']]) {
  assert.ok(engine.environmentOptions(start(seq)).some(row => row.subtype === subtype));
  assert.ok(engine.environmentOptions(start(seq.replace(/序列\d/, m => `序列${+m.slice(2) + 1}`)))
    .every(row => row.subtype !== subtype));
}
assert.ok(engine.environmentOptions(start('上帝')).some(row => row.subtype === '无暗领域'));
assert.ok(engine.environmentOptions(start('知识之妖')).some(row => row.subtype === '虚假星空'));
data = start(); delete data.stat_data.$专属玩法;
assert.ok(engine.environmentOptions(data).every(row => row.subtype !== '神秘再现·理想乡'));

// All six routes share fixed slots but use different resources, scopes and scaling.
for (const subtype of choices.map(row => row.subtype)) {
  data = start(); b = bOf(data);
  const choice = engine.environmentOptions(data).find(row => row.subtype === subtype);
  const key = choice.stat === '人性' ? 'humanity' : 'spirit', balance = player(data)[key];
  const prediction = engine.environmentPreview(data, subtype);
  data = cast(data, subtype); b = bOf(data);
  assert.equal(player(data)[key], balance - choice.cost);
  assert.equal(data.stat_data[`当前${choice.stat}`], player(data)[key]);
  const kinds = choice.slots.map(row => row.kind);
  assert.ok(kinds.every(kind => b.environment.slots[kind]?.subtype === subtype));
  for (const predicted of prediction.rows) {
    const unit = b.units.find(row => row.id === predicted.id);
    const effects = unit.effects.filter(row => row.environment &&
      kinds.includes(b.environment.slots[kinds[0]]?.kind) &&
      row.slotId === b.environment.slots[kinds[0]]?.id);
    assert.deepEqual(plain(effects.map(({ name, stat, type, power }) => ({ name, stat, type, power }))),
      plain(predicted.effects));
    assert.ok(effects.every(row => row.duration === 9999));
  }
  if (['梦境迷宫', '虚假星空', '展开堕落领域'].includes(subtype))
    assert.ok(player(data).effects.every(row => !row.slotId?.startsWith('env-') || row.slotId.startsWith('env-nat-')));
  if (subtype === '改变天气') {
    assert.equal(b.units[1].effects.find(row => row.name === '暴风雨·防御力').power, 5);
    assert.equal(player(data).effects.find(row => row.name === '暴风雨·攻击力').power, 30);
    assert.equal(player(data).envMoveBonus, 4); // Sea 2 + storm 2, independent of initiative.
  }
  if (subtype === '神秘再现·理想乡')
    assert.equal(player(data).effects.find(row => row.stat === 'damageTakenDecrease').power, 50);
  data = plain(data); snapshot = JSON.stringify(data);
  manager.slots(bOf(data)); engine.environmentOptions(data);
  assert.equal(JSON.stringify(data), snapshot);
}

// Only the affected slot is overwritten; next round does not reset it to the natural base.
data = cast(start(), '无暗领域');
data = cast(data, '改变天气');
const weatherId = bOf(data).environment.slots.天气.id;
data = cast(data, '梦境迷宫'); b = bOf(data);
assert.equal(b.environment.slots.天气.id, weatherId);
assert.equal(b.environment.slots.神秘学环境.envName, '梦境迷宫');
assert.ok(b.units.every(row => row.effects.every(e => !e.name.startsWith('无暗领域'))));
assert.ok(b.units[1].effects.some(row => row.name === '梦境迷宫·防御力'));
assert.ok(b.log.some(row => row.message.includes('被顶替')));

// Conversion changes recipients; being off-field does not expire an already-created environment.
player(data).side = 'enemy';
manager.sync(b);
assert.ok(b.units[1].effects.every(row => row.name !== '梦境迷宫·防御力'));
player(data).possessedHidden = true; manager.sync(b);
assert.equal(b.environment.slots.神秘学环境.envName, '梦境迷宫');
assert.equal(player(data).effects.filter(row => row.environment).length, 0);
assert.equal(player(data).envMoveBonus, 0);
player(data).possessedHidden = false; player(data).side = 'ally'; manager.sync(b);
assert.ok(b.units[1].effects.some(row => row.name === '梦境迷宫·防御力'));
player(data).hp = 0; manager.sync(b);
assert.equal(b.environment.slots.神秘学环境, null);
assert.equal(b.environment.slots.天气, null);
assert.equal(b.units[1].effects.find(row => row.name === '小雨·攻击力').power, 2);
assert.ok(b.units.every(row => row.effects.every(e => !e.name.startsWith('梦境迷宫'))));
const logged = b.log.length; manager.sync(b);
assert.equal(b.log.length, logged);

// Human-resource subtype can cast with zero spirit; legal but failed contests charge exactly once.
data = start('序列3-观众'); player(data).spirit = 0;
assert.equal(engine.environmentPreview(data, '梦境迷宫').ok, true);
assert.equal(engine.environmentOptions(data)[0].stat, '人性');
data = cast(data, '梦境迷宫');
assert.equal(player(data).spirit, 0);
data = start('序列4-歌颂者'); b = bOf(data);
b.units[1].sequence = '序列6-阅读者';
Object.assign(player(data), { hp: 10, agility: 10, humanity: 10, sanity: 10, luck: 10, spirit: 10000 });
Object.assign(b.units[1], { hp: 10, agility: 10, humanity: 10, sanity: 10, luck: 10, spirit: 10000 });
const fee = engine.environmentOptions(data)[0].cost;
const pending = manager.prepare(b, data, (() => {
  const rolls = [0, .999]; return () => rolls.shift() ?? .999;
})(), [], { subtype: '无暗领域' });
assert.equal(pending[0].contest.win, false);
assert.equal(player(data).spirit, 10000 - fee);
assert.equal(manager.apply(b, data, () => .5, plain(pending))[0].outcome, 'resisted');
assert.equal(b.environment.slots.神秘学环境, null);

// Conscious same-class enemies/reader contest; hidden host can oppose but cannot receive effects.
data = start(); b = bOf(data);
b.units[1].sequence = '序列4-水手'; b.units[1].possessedHidden = true;
assert.ok(engine.environmentOptions(data)[0].rivals.some(row => row.id === '敌甲'));
b.units[1].turnSkip = { skipRound: b.round };
assert.ok(engine.environmentOptions(data)[0].rivals.every(row => row.id !== '敌甲'));
b.units[1].turnSkip = null;
b.units[1].humanity = 10000000000;
snapshot = JSON.stringify(data);
assert.equal(engine.changeEnvironment(data, { subtype: '无暗领域' }).ok, false);
assert.equal(JSON.stringify(data), snapshot);

// NPC skips redundant storms/friendly slots, but can reclaim the same enemy-created mystical name.
data = start('普通人'); b = bOf(data); b.units[1].sequence = '序列4-水手';
assert.equal(manager.prepare(b, data, () => .99).length, 0);
const npc = manager.prepare(b, data, () => 0);
assert.equal(npc[0].subtype, '改变天气');
assert.equal(manager.apply(b, data, () => .5, plain(npc))[0].outcome, 'applied');
assert.equal(manager.prepare(b, data, () => 0).length, 0);
data = start('普通人', '暴风雨'); b = bOf(data); b.units[1].sequence = '序列4-水手';
assert.equal(manager.prepare(b, data, () => 0).length, 0);
data = start(); b = bOf(data);
fields.withRuntime(b, data, () => .5, rt => {
  const m = rt.environment, h = rt.heroes[0], foe = rt.heroes[1];
  foe.sequenceString = '序列4-歌颂者';
  foe.additionalStats.当前人性 = 1000000000000;
  m.admit(rt.bm, m.buildEntry(rt.bm, h, '无暗领域', '神秘学环境'));
  assert.ok(m.npcSubtypePool(rt.bm, foe).includes('无暗领域'));
  h.teamType = 'enemy';
  assert.ok(!m.npcSubtypePool(rt.bm, foe).includes('无暗领域'));
});

// Six-dimensional environmental effects affect formulas; storm movement survives maximum clamp.
data = start(); b = bOf(data);
const baseline = formulas.attribute(b, { ...b.units[1], effects: [] }, 'defense');
data = cast(data, '梦境迷宫'); b = bOf(data);
// Natural sea +10% and maze -60% share the additive percentage channel.
assert.equal(formulas.attribute(b, b.units[1], 'defense'), Math.round(baseline * .5));
data = cast(start(), '展开堕落领域'); b = bOf(data);
assert.ok(b.units[1].effects.some(row => row.environment && row.stat === 'speed'));
assert.equal(b.units[1].envMoveBonus, 0); // Rank9 sailor: sea floor((10-9)/3) = 0, no speed-to-move leak.
data = cast(start(), '神秘再现·理想乡'); b = bOf(data);
const withUtopia = formulas.damage(b, b.units[1], player(data), { power: 100000 }, () => .5).amount;
player(data).effects = player(data).effects.filter(e => e.stat !== 'damageTakenDecrease');
const withoutUtopia = formulas.damage(b, b.units[1], player(data), { power: 100000 }, () => .5).amount;
assert.ok(Math.abs(withUtopia * 2 - withoutUtopia) <= 1);

// Finish removes artificial/natural runtime effects, missing module and invalid requests preserve floor.
data = cast(start(), '改变天气'); b = bOf(data); manager.finish(b);
assert.ok(Object.values(b.environment.slots).every(row => row === null));
assert.ok(b.units.every(row => row.effects.every(e => !e.environment) && row.envMoveBonus === 0));
data = start(); snapshot = JSON.stringify(data);
assert.equal(engine.changeEnvironment(data, { subtype: 'unknown' }).ok, false);
delete modules['cryptLord.battleEnvironment'];
assert.equal(engine.changeEnvironment(data, { subtype: '无暗领域' }).ok, false);
assert.equal(JSON.stringify(data), snapshot);
modules['cryptLord.battleEnvironment'] = manager;
console.log('Environment: six routes, four slots, real effects, fees, contests, NPC, fallback and native lifecycle verified.');
