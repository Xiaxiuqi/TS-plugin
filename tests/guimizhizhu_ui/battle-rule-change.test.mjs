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
  'battle-field-effects', 'battle-hard-control', 'battle-rule-change', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const manager = modules['cryptLord.battleRuleChange'];
const fields = modules['cryptLord.battleFieldEffects'];
const formulas = modules['cryptLord.battleFormulas'];
const plain = value => JSON.parse(JSON.stringify(value));
const sequence = '序列3-偷盗者/序列2-占卜家/序列2-窥秘人/序列3-通识者/序列3-萨满/序列4-律师/序列4-仲裁人';
const card = seq => ({ 当前序列: seq,
  活力: 10000, 当前活力: 10000, 敏捷: 100, 当前敏捷: 100,
  灵性: 100000000, 当前灵性: 100000000, 人性: 200000000, 当前人性: 200000000,
  理智: 100, 当前理智: 100, 神性: 1,
  序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] } });
const bOf = data => data.cryptLord.teamBattle;
const player = data => bOf(data).units[0];
function start(seq = sequence, count = 2) {
  const npc_data = {};
  for (let i = 0; i < count; i++) npc_data[`敌${i}`] =
    { ...card('序列5-猎人'), 人性: 1000, 当前人性: 1000, 灵性: 1000, 当前灵性: 1000 };
  const result = engine.start({ stat_data: card(seq), npc_data },
    { enemies: Object.keys(npc_data), seed: 815 });
  assert.equal(result.ok, true, result.error);
  bOf(result.data).phase = 'tactic'; return result.data;
}
const request = (subtype = '欺瞒规则', scope = '自己', param = '攻击提升') =>
  ({ subtype, scope, param, target: '敌0' });
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b1-js-mystery-sleep-and-effect.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL(
  '../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
assert.ok(generated.includes(source.slice(source.indexOf('const RuleChangeManager ='),
  source.indexOf("console.log('[战斗系统] RuleChangeManager")).trim()));

// All seven routes, real fragment aliases, pure previews and direction validation.
let data = start(), b = bOf(data), snapshot = JSON.stringify(data);
const choices = engine.ruleChangeOptions(data);
assert.equal(choices.length, 7);
assert.equal(choices.find(row => row.subtype === '占卜家规则').name, '实现愿望');
assert.equal(engine.ruleChangeOptions(start('序列1-偷盗者/序列2-占卜家'))
  .find(row => row.subtype === '占卜家规则').name, '实现愿望');
assert.equal(engine.ruleChangeOptions(start('序列1-占卜家'))[0].name, '嫁接');
assert.equal(engine.ruleChangeOptions(start('普通人')).length, 0);
assert.ok(engine.ruleChangeOptions(start('知识之妖')).some(row => row.subtype === '环境掌控者'));
for (const row of choices) {
  const req = row.presets.length ? { subtype: row.subtype, presetKey: row.presets[0].key } : request(row.subtype);
  assert.equal(engine.ruleChangePreview(data, req).ok, true);
}
assert.equal(JSON.stringify(data), snapshot);
assert.equal(engine.ruleChange(data, request('欺瞒规则', '自己', '攻击削弱')).ok, false);
assert.equal(engine.ruleChange(data, request('欺瞒规则', '敌军单体', '攻击提升')).ok, false);
assert.equal(engine.ruleChange(data, { ...request('欺瞒规则', '敌军单体', '攻击削弱'), target: 'missing' }).ok, false);
assert.equal(engine.ruleChange(data, request('篡改规则底层回退')).ok, false);
assert.equal(JSON.stringify(data), snapshot);
for (const [scope, param, power] of [
  ['自己', '攻击提升', 40], ['友军全体', '造成伤害加', 20],
  ['敌军单体', '受到伤害加', 85], ['敌军全体', '速度削弱', 20],
]) {
  const preview = engine.ruleChangePreview(data, request('欺瞒规则', scope, param));
  assert.equal(preview.ok, true);
  assert.equal(preview.parts[0].power, power);
}

// Start -> charge -> shared admission -> replace both preset parts -> native JSON -> finish.
const cost = choices[0].cost, before = player(data).spirit;
let result = engine.ruleChange(data, request(), () => .5);
assert.equal(result.ok, true, result.error); data = result.data; b = bOf(data);
assert.equal(player(data).spirit, before - cost);
assert.equal(data.stat_data.当前灵性, player(data).spirit);
assert.equal(b.ruleChange.slots.length, 1);
assert.equal(player(data).effects.find(row => row.ruleChange).power, 40);
assert.equal(player(data).effects.find(row => row.ruleChange).duration, 9999);
data = plain(data); b = bOf(data); b.phase = 'tactic';
result = engine.ruleChange(data, { subtype: '环境掌控者', presetKey: '环境攻防' }, () => .5);
assert.equal(result.ok, true, result.error); data = result.data; b = bOf(data);
assert.equal(b.ruleChange.slots.length, 1);
assert.equal(b.ruleChange.slots[0].parts.length, 2);
assert.equal(player(data).effects.filter(row => row.ruleChange).length, 1);
assert.equal(player(data).effects.find(row => row.ruleChange).power, 10);
for (const foe of b.units.slice(1))
  assert.equal(foe.effects.find(row => row.ruleChange).stat, 'defense');
assert.ok(b.log.some(row => row.message.includes('被挤了出去')));
assert.match(manager.slots(b).entries[0].description, /攻击提升.*防御削弱/u);
b.phase = 'tactic';
result = engine.ruleChange(data, request('律令制定', '敌军全体', '造成伤害减'), () => .5);
assert.equal(result.ok, true, result.error); data = result.data; b = bOf(data);
assert.equal(player(data).effects.filter(row => row.ruleChange).length, 0);
assert.ok(b.units.slice(1).every(row => row.effects.filter(e => e.ruleChange).length === 1 &&
  row.effects.find(e => e.ruleChange).stat === 'damageDealtDecrease'));
assert.equal(b.ruleChange.slots[0].power, 20);
const held = JSON.stringify(data);
manager.slots(b); manager.statusLines(b, player(data));
assert.equal(JSON.stringify(data), held);
manager.finish(b);
assert.equal(b.ruleChange.slots.length, 0);
assert.ok(b.units.every(row => row.effects.every(e => !e.ruleChange)));

// Original opponents: conscious reader rank6, rule authorities and hidden possession hosts.
data = start(); b = bOf(data);
b.units[1].sequence = '序列6-阅读者';
b.units[2].sequence = '序列4-仲裁人';
b.units[2].possessedHidden = true;
let rivals = engine.ruleChangeOptions(data)[0].rivals;
assert.deepEqual(plain(rivals.map(row => row.id)), ['敌0', '敌1']);
b.units[1].turnSkip = { skipRound: b.round };
rivals = engine.ruleChangeOptions(data)[0].rivals;
assert.deepEqual(plain(rivals.map(row => row.id)), ['敌1']);
assert.ok(!engine.ruleChangeOptions(data)[0].targets.some(row => row.id === '敌1'));
b.units[2].humanity = 10000000000;
snapshot = JSON.stringify(data);
assert.equal(engine.ruleChange(data, request()).ok, false);
assert.equal(JSON.stringify(data), snapshot);

// Possible but failed contests still charge once, no slot or effect; post-cost resource is used.
data = start('序列3-偷盗者'); b = bOf(data);
b.units[1].sequence = '序列6-阅读者';
Object.assign(player(data), { hp: 10, agility: 10, humanity: 10, sanity: 10, luck: 10, spirit: 10000 });
Object.assign(b.units[1], { hp: 10, agility: 10, humanity: 10, sanity: 10, luck: 10, spirit: 10000 });
const fee = engine.ruleChangeOptions(data)[0].cost;
const prepared = manager.prepare(b, data, (() => { const rolls = [0, .999]; return () => rolls.shift() ?? .999; })(), [], request());
assert.equal(prepared[0].contest.win, false);
assert.equal(player(data).spirit, Math.max(0, 10000 - fee));
const failed = manager.apply(b, data, () => .5, prepared);
assert.equal(failed[0].outcome, 'resisted');
assert.equal(b.ruleChange.slots.length, 0);

// Opening cap frozen, beneficiaries dynamic, enemy entries displaced before old friendly entries.
data = start(); b = bOf(data);
fields.withRuntime(b, data, () => .5, rt => {
  const m = rt.ruleChange, h = rt.heroes[0], foe = rt.heroes[1];
  m.ensure(rt.bm).cap = 2;
  const a = m.buildEntry(rt.bm, h, { ...request(), targets: [h] });
  a.side = m.sideOf(rt.bm, a); m.admit(rt.bm, a); m.applyEntry(rt.bm, a);
  const e = m.buildEntry(rt.bm, foe, { ...request(), targets: [foe] });
  e.side = m.sideOf(rt.bm, e); m.admit(rt.bm, e); m.applyEntry(rt.bm, e);
  const c = m.buildEntry(rt.bm, h, { ...request(), targets: [h] });
  c.side = m.sideOf(rt.bm, c);
  assert.equal(m.admit(rt.bm, c)[0].id, e.id); m.applyEntry(rt.bm, c);
  assert.ok(!foe.effects.some(row => row.slotId === e.id));
  h.teamType = 'enemy'; assert.equal(m.sideOf(rt.bm, a), 'enemy'); h.teamType = 'ally';
  const d = m.buildEntry(rt.bm, h, { ...request(), targets: [h] });
  d.side = 'ally'; assert.equal(m.admit(rt.bm, d)[0].id, a.id);
  assert.equal(m.npcShouldTry(rt.bm, h), false);
});
const openingCap = b.ruleChange.cap;
b.units.push({ ...plain(b.units[1]), id: 'summon', isSummon: true });
manager.initialize(b);
assert.equal(b.ruleChange.cap, openingCap);
player(data).hp = 0; manager.sweep(b);
assert.equal(b.ruleChange.slots.length, 0);
const logged = b.log.length; manager.sweep(b);
assert.equal(b.log.length, logged);

// NPC fallback-only routes, suppressed own-full rolls and serialized request arbitration.
data = start(); b = bOf(data); b.units[1].sequence = '序列3-阅读者';
fields.withRuntime(b, data, () => .5, rt => {
  const hero = rt.heroes[1];
  assert.ok(rt.ruleChange.availableNpcSubtypes(hero).includes('阅读者规律底层回退'));
  assert.equal(rt.ruleChange.availableSubtypes(hero).length, 0);
});
// With no rival across sides, an NPC-only fallback can be issued and becomes a real rule slot.
b.units[0].sequence = '普通人';
const npc = manager.prepare(b, data, () => 0);
assert.ok(npc.some(row => row.actor === '敌0'));
assert.ok(manager.apply(b, data, () => .5, plain(npc)).some(row => row.outcome === 'applied'));
assert.ok(b.ruleChange.slots.length > 0);
assert.equal(manager.prepare(b, data, () => 0).length, 0);

// Atomic preset rechecks all parts; dead/off-field targets never leave a half-applied preset.
data = start(); b = bOf(data);
const preset = manager.prepare(b, data, () => .99, [], { subtype: '环境掌控者', presetKey: '环境攻防' });
for (const unit of b.units.slice(1)) unit.offField = true;
assert.equal(manager.apply(b, data, () => .5, preset)[0].outcome, 'superseded');
assert.equal(b.ruleChange.slots.length, 0);
assert.ok(player(data).effects.every(row => !row.ruleChange));

// Effect channels use the original calculator, not display-only values.
for (const [scope, param, stat, kind, factor] of [
  ['自己', '攻击提升', 'attack', 'attack', 1.4],
  ['敌军单体', '防御削弱', 'defense', 'defense', .15],
  ['自己', '造成伤害加', 'damageDealtIncrease', 'damage', 1.4],
  ['自己', '受到伤害减', 'damageTakenDecrease', 'damage', .6],
  ['敌军单体', '造成伤害减', 'damageDealtDecrease', 'damage', .15],
  ['敌军单体', '受到伤害加', 'damageTakenIncrease', 'damage', 1.85],
]) {
  data = start(); b = bOf(data);
  const actor = scope === '自己' ? player(data) : b.units[1];
  const target = scope === '自己' ? b.units[1] : player(data);
  const skill = { power: 100000, damageType: 'physical' };
  const calc = () => kind !== 'damage' ? formulas.attribute(b, actor, kind) :
    stat.startsWith('damageTaken') ? formulas.damage(b, target, actor, skill, () => .5).amount
      : formulas.damage(b, actor, target, skill, () => .5).amount;
  const baseline = calc();
  const rows = manager.prepare(b, data, () => .99, [], request('欺瞒规则', scope, param));
  manager.apply(b, data, () => .5, rows);
  assert.ok(Math.abs(calc() - Math.round(baseline * factor)) <= 2, `${param}: ${calc()}/${baseline}`);
  if (param === '受到伤害减') assert.match(manager.statusLines(b, actor)[0], /−40%/u);
}
data = start(); b = bOf(data);
b.units[1].agility = 130;
assert.equal(formulas.initiative(b, () => .5)[0], '敌0');
manager.apply(b, data, () => .5,
  manager.prepare(b, data, () => .99, [], request('欺瞒规则', '自己', '速度提升')));
assert.equal(formulas.initiative(b, () => .5)[0], 'player');

// Whole-round arbitration locks targets, charges before conversion, then rechecks enemy identity.
data = start(); b = bOf(data);
const locked = manager.prepare(b, data, () => .99, [], request('欺瞒规则', '敌军单体', '攻击削弱'));
b.units[1].side = 'ally';
assert.equal(manager.apply(b, data, () => .5, locked)[0].outcome, 'superseded');
assert.equal(b.ruleChange.slots.length, 0);
assert.ok(player(data).spirit < card(sequence).当前灵性);

// Player enters first; a later successful NPC can still evict that entry from the shared single slot.
data = start(); b = bOf(data);
b.units[1].sequence = '序列4-仲裁人';
fields.withRuntime(b, data, () => .5, rt => {
  const m = rt.ruleChange, h = rt.heroes[0], foe = rt.heroes[1];
  const plans = [h, foe].map(hero => ({ caster: hero, subtype: '律令制定', shownAs: '律令制定',
    scope: '自己', param: '攻击提升', targets: [hero], contest: { win: true, rolls: [] } }));
  const summary = [], results = [];
  m.arbitrate(rt.bm, plans.reverse(), summary, results);
  assert.equal(results[0].actor, h.name);
  assert.equal(results[1].actor, foe.name);
  assert.equal(m.slotsOf(rt.bm)[0].casterId, foe.heroId);
  assert.ok(h.effects.every(row => !row.ruleChange));
});

// Missing modules and out-of-phase requests cannot mutate the floor or advance the RNG.
data = start(); snapshot = JSON.stringify(data);
delete modules['cryptLord.battleRuleChange'];
assert.equal(engine.ruleChange(data, request()).ok, false);
assert.equal(JSON.stringify(data), snapshot);
modules['cryptLord.battleRuleChange'] = manager;
bOf(data).phase = 'action'; snapshot = JSON.stringify(data);
assert.equal(engine.ruleChange(data, request()).ok, false);
assert.equal(JSON.stringify(data), snapshot);

console.log('Rule modification: seven routes, contests, shared slots, atomic preset and native persistence verified.');
