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
  'battle-fundamental', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], manager = modules['cryptLord.battleFundamental'];
const formulas = modules['cryptLord.battleFormulas'], fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const bOf = data => data.cryptLord.teamBattle;
const sequence = '序列0-律师/序列0-仲裁人/序列1-占卜家/序列0-偷盗者/序列1-阅读者/序列2-窥秘人/序列2-通识者/序列3-萨满';
const card = seq => ({ 当前序列: seq, 活力: 10000, 当前活力: 10000,
  敏捷: 200, 当前敏捷: 200, 灵性: 100000000, 当前灵性: 100000000,
  人性: 100000000, 当前人性: 100000000, 理智: 100000000, 当前理智: 100000000,
  运气: 40, 神性: 1, 序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] } });
function start(seq = sequence) {
  const result = engine.start({ stat_data: card(seq),
    npc_data: { 敌甲: { ...card('序列5-猎人'), 灵性: 1000, 当前灵性: 1000,
      人性: 1000, 当前人性: 1000, 理智: 1000, 当前理智: 1000 } } },
  { enemies: ['敌甲'], seed: 911 });
  assert.equal(result.ok, true, result.error);
  bOf(result.data).phase = 'tactic'; return result.data;
}
const request = (subtype = '篡改规则', atomId = 'attack.specificWeight', value = 1) =>
  ({ subtype, mutations: [{ atomId, value }], reportText: '全场的计算改变了' });
const cast = (data, req = request()) => {
  const result = engine.fundamentalRule(data, req, () => .99);
  assert.equal(result.ok, true, result.error);
  return result.data;
};
const extracted = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
for (const [file, name] of [['31a-js-pathway-contest-advantages.txt', 'FundamentalRuleManager'],
  ['30a1a-js-basics-and-attribute.txt', 'BattleFormulaEngine']]) {
  const source = await readFile(new URL(`../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${file}`, import.meta.url), 'utf8');
  assert.ok(extracted.includes(source.slice(source.indexOf(`const ${name} =`), source.indexOf(`window.${name} =`)).trim()));
}
let data = start(), b = bOf(data), snapshot = JSON.stringify(data);
const choices = engine.fundamentalOptions(data);
assert.equal(choices.length, 8);
fields.withRuntime(b, data, undefined, rt => {
  for (const [id, def] of Object.entries(rt.formulaEngine.atoms)) {
    const native = formulas.catalog()[id];
    assert.ok(native, id);
    assert.equal(native.defaultValue, def.defaultValue, id);
    assert.deepEqual(plain(native.type === 'enum' ? [...native.options].sort() : [native.min, native.max, native.step]),
      plain(def.type === 'number' ? [def.min, def.max, def.step] : Object.keys(def.options).sort()), id);
  }
});
engine.fundamentalPreview(data, request()); manager.rows(b); formulas.value(b, 'damage.powerScale');
assert.equal(JSON.stringify(data), snapshot);
for (const [seq, subtype, max] of [['序列4-律师', '篡改规则', 2],
  ['序列4-仲裁人', '仲裁人律令', 1], ['序列1-占卜家', '嫁接', 1],
  ['序列0-偷盗者', '欺诈权柄', 2], ['序列3-阅读者', '阅读者规律', 1],
  ['序列2-窥秘人', '修改权柄', 1], ['序列2-通识者', '规律权柄', 3],
  ['序列3-萨满', '规则之弦', 1]]) {
  const choice = engine.fundamentalOptions(start(seq)).find(row => row.subtype === subtype);
  assert.equal(choice.maxAtoms, max);
  assert.ok(engine.fundamentalOptions(start(seq.replace(/序列\d/, m => `序列${+m.slice(2) + 1}`)))
    .every(row => row.subtype !== subtype));
}
assert.equal(engine.fundamentalOptions(start('失序者')).find(row => row.subtype === '仲裁人律令').maxAtoms, 4);
assert.ok(engine.fundamentalOptions(start('知识之妖')).some(row => row.subtype === '规律权柄'));
assert.ok(engine.fundamentalOptions(start('诡秘之主')).some(row => row.subtype === '嫁接'));
const reader = choices.find(row => row.subtype === '阅读者规律').atoms;
assert.ok(reader.every(row => !row.id.includes('.random') && !row.id.endsWith('.rounding')));
assert.ok(reader.every(row => !['initiative', 'modifiers'].includes(row.family) || row.family === 'modifiers'));
const savant = choices.find(row => row.subtype === '规律权柄').atoms;
assert.ok(savant.every(row => ['accuracyDamage', 'accuracy', 'initiative', 'movement'].includes(row.family) ||
  ['physicalSource', 'referenceSource', 'specificWeight', 'referenceWeight', 'combine', 'rounding'].includes(row.id.split('.')[1])));

// All routes, resource profiles, real global formula changes and original next-round activation.
for (const choice of choices) {
  data = start(); b = bOf(data);
  const req = request(choice.subtype), check = engine.fundamentalPreview(data, req);
  assert.equal(check.ok, true, check.reason);
  const actor = b.units[0], resource = choice.stat === '理智' ? 'sanity' : 'spirit', before = actor[resource];
  const direct = manager.apply(b, actor, req, data, () => .99);
  assert.equal(direct.ok, true);
  assert.equal(formulas.value(b, 'attack.specificWeight'), .4);
  assert.equal(manager.rows(b)[0].pending, true);
  b.round++;
  assert.equal(formulas.value(b, 'attack.specificWeight'), 1);
  assert.equal(actor[resource], before - check.cost);
  assert.equal(b.fundamentalRules.laws[0].endRound - b.fundamentalRules.laws[0].startRound + 1, check.duration);
  assert.equal(b.fundamentalRules.laws[0].duration, check.duration);
  for (const unit of b.units) assert.ok(formulas.attribute(b, unit, 'attack') >= 0);
  const serial = b.fundamentalRules.serial;
  manager.rows(plain(b)); formulas.value(b, 'attack.specificWeight');
  assert.equal(b.fundamentalRules.serial, serial);
}
data = cast(start()); b = bOf(data);
assert.equal(b.round, 2); assert.equal(formulas.value(b, 'attack.specificWeight'), 1);
assert.equal(data.stat_data.当前灵性, b.units[0].spirit);
assert.equal(b.lastTactic.outcomes[0].outcome, 'applied');

// Replacement, overlays from other actors, suppression and automatic resurfacing.
data = start(); b = bOf(data);
manager.apply(b, b.units[0], request(), data, () => .99); b.round++;
const first = b.fundamentalRules.laws[0];
b.units[1].sequence = '序列0-律师';
b.units[1].spirit = 50000000; b.units[1].maxSpirit = 50000000;
b.units[1].humanity = 1000000000;
const rival = manager.apply(b, b.units[1], request('篡改规则', 'attack.specificWeight', .8), data, () => .99);
assert.equal(rival.outcome, 'applied');
b.round++;
assert.equal(formulas.value(b, 'attack.specificWeight'), .8);
assert.equal(manager.rows(b).find(row => row.id === first.id).effective, false);
b.units[1].hp = 0; manager.sweep(b);
assert.equal(formulas.value(b, 'attack.specificWeight'), 1);
const logged = b.log.length; manager.sweep(b); assert.equal(b.log.length, logged);
b.units[0].offField = true; manager.sweep(b);
assert.equal(formulas.value(b, 'attack.specificWeight'), 1);
b.units[0].offField = false;
const replacement = manager.apply(b, b.units[0], request('篡改规则', 'damage.powerScale', .5), data, () => .99);
assert.equal(replacement.outcome, 'applied'); assert.equal(first.removed, true);
assert.equal(formulas.value(b, 'attack.specificWeight'), .4);
b.round++; assert.equal(formulas.value(b, 'damage.powerScale'), .5);
const law = b.fundamentalRules.laws.at(-1);
b.round = law.endRound; assert.equal(formulas.value(b, 'damage.powerScale'), .5);
manager.sweep(b, true); assert.equal(formulas.value(b, 'damage.powerScale'), 1);

data = start(); b = bOf(data);
for (const req of [request('嫁接', 'damage.randomMin', 1.2),
  request('阅读者规律', 'initiative.direction', 'lowFirst'),
  request('规律权柄', 'damage.powerScale', 1),
  { subtype: '篡改规则', mutations: [{ atomId: 'attack.specificWeight', value: .43 }] },
  { subtype: '篡改规则', mutations: [{ atomId: 'movement.base', value: 5 }, { atomId: 'movement.base', value: 6 }] }]) {
  snapshot = JSON.stringify(data);
  assert.equal(engine.fundamentalRule(data, req).ok, false);
  assert.equal(JSON.stringify(data), snapshot);
}
const paired = { subtype: '篡改规则', mutations: [
  { atomId: 'damage.randomMin', value: 1.2 }, { atomId: 'damage.randomMax', value: 1.5 }] };
data = cast(data, paired); b = bOf(data);
assert.equal(formulas.value(b, 'damage.randomMin'), 1.2);
assert.equal(formulas.value(b, 'damage.randomMax'), 1.5);
// An individually expired upper bound suppresses the conflicting lower layer instead of violating bounds.
b.fundamentalRules.laws[0].mutations.pop();
assert.equal(formulas.value(b, 'damage.randomMin'), .9);
assert.equal(manager.rows(b)[0].suppressed, true);
b.fundamentalRules.laws[0].removed = true;
b.formulas.values['damage.randomMax'] = 1.6;
const updated = manager.apply(b, b.units[0], request('篡改规则', 'damage.randomMin', 1.2), data, () => .99);
assert.equal(updated.ok, true); b.round++;
assert.equal(formulas.value(b, 'damage.randomMin'), 1.2);

// Same original atoms actually reach each numeric channel; no effects are used to fake laws.
for (const [id, value, compare] of [
  ['attack.specificWeight', 0, (b, a, t) => formulas.attribute(b, a, 'attack')],
  ['damage.powerScale', .5, (b, a, t) => formulas.damage(b, a, t, { power: 100 }, () => .5).amount],
  ['accuracyDamage.fixedScale', .5, (b, a, t) => formulas.damage(b, a, t, { isAccuracyWeapon: true, fixedDamage: 100 }, () => .5).amount],
  ['accuracy.maxChance', .05, (b, a, t) => formulas.accuracy(b, a, t, { isAccuracyWeapon: true, accuracyTier: '步枪级', range: 20 })],
  ['healing.scale', 0, (b, a, t) => formulas.healing(b, a, t, { healAmt: .1 }, () => .5).amount],
  ['movement.base', 0, (b, a, t) => formulas.movement(b, a)],
]) {
  data = start(); b = bOf(data); const [a, t] = b.units; t.hp = 5000;
  const before = compare(b, a, t);
  data = cast(data, request('篡改规则', id, value)); b = bOf(data);
  const after = compare(b, b.units[0], b.units[1]);
  assert.ok(after < before, `${id}: ${before} -> ${after}`);
  assert.ok(b.units.every(row => row.effects.every(e => !e.fundamental)));
}
data = start(); b = bOf(data);
b.units[0].effects.push({ name: '测试速度', stat: 'speed', type: 'buff', valueType: 'percentage', power: 50, duration: 100 });
data = cast(data, request('篡改规则', 'modifiers.speedPercentage', 'reversed')); b = bOf(data);
assert.equal(formulas.modified(b, b.units[0], 'speed', 200), 100);
fields.withRuntime(b, data, undefined, rt => assert.equal(rt.enemyControl.speedOf(rt.heroes[0]), 100));
data = cast(start(), request('篡改规则', 'initiative.direction', 'lowFirst')); b = bOf(data);
b.units[0].agility = 1000; b.units[1].agility = 1;
assert.equal(formulas.initiative(b, () => .5)[0], b.units[1].id);

// Conscious rivals and failed contests: failure spends once but leaves an old law intact.
data = cast(start('序列4-律师')); b = bOf(data); b.phase = 'tactic';
const oldLawId = b.fundamentalRules.laws[0].id;
b.units[1].sequence = '序列6-阅读者';
for (const unit of b.units) Object.assign(unit, { hp: 10000, agility: 10000, spirit: 10000, sanity: 10000, humanity: 10000, luck: 10000 });
let turn = 0;
const failed = engine.fundamentalRule(data, request('篡改规则', 'damage.powerScale', .5),
  () => turn++ === 0 ? 0 : .999);
assert.equal(failed.ok, true, failed.error);
assert.equal(failed.battle.lastTactic.outcomes[0].outcome, 'resisted');
assert.equal(failed.battle.fundamentalRules.laws.length, 1);
assert.equal(failed.battle.fundamentalRules.laws[0].id, oldLawId);
assert.equal(failed.battle.fundamentalRules.laws[0].removed, false);
const failedCost = failed.battle.lastTactic.outcomes[0].cost;
assert.equal(failed.battle.units[0].spirit, 10000 - failedCost);
b.units[1].humanity = 1e12;
snapshot = JSON.stringify(data); assert.equal(engine.fundamentalRule(data, request()).ok, false);
assert.equal(JSON.stringify(data), snapshot);
b.units[0].turnSkip = { skipRound: b.round };
assert.equal(engine.fundamentalOptions(data).length, 0);
assert.equal(engine.fundamentalRule(data, request()).ok, false);
delete b.units[0].turnSkip;
delete modules['cryptLord.battleFundamental'];
snapshot = JSON.stringify(data); assert.equal(engine.fundamentalRule(data, request()).ok, false);
assert.equal(JSON.stringify(data), snapshot);
modules['cryptLord.battleFundamental'] = manager;
data = cast(start()); b = bOf(data); manager.finish(b);
assert.ok(b.fundamentalRules.laws.every(row => row.removed));
assert.equal(formulas.value(b, 'attack.specificWeight'), .4);
assert.doesNotThrow(() => JSON.stringify(data));
// The native round-end hook expires a law only after its last full action round.
data = cast(start()); b = bOf(data);
b.round = b.fundamentalRules.laws[0].endRound;
b.phase = 'action'; b.queue = [b.units[0].id]; b.index = 0;
const endedRound = engine.action(data, { type: 'wait' });
assert.equal(endedRound.ok, true, endedRound.error);
assert.equal(endedRound.battle.phase, 'tactic');
assert.equal(endedRound.battle.fundamentalRules.laws[0].removed, true);
assert.equal(formulas.value(endedRound.battle, 'attack.specificWeight'), .4);
// NPCs retain the original ordinary-rule downgrade, not arbitrary player formula drafts.
data = start(); b = bOf(data);
Object.assign(b.units[1], { sequence: '序列3-阅读者', humanity: 1e12, spirit: 1e9 });
const npcTurn = engine.tactic(data, undefined, () => .01);
assert.equal(npcTurn.ok, true, npcTurn.error);
assert.equal(npcTurn.battle.fundamentalRules.laws.length, 0);
assert.ok(npcTurn.battle.lastTactic.outcomes.some(row => row.subtype === '阅读者规律底层回退'));
console.log('Fundamental rules: eight routes, exact atoms, fees/contests, real formulas, constraints, overlays and native lifecycle verified.');
