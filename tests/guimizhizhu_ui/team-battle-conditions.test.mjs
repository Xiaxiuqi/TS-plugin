import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const modules = {};
const context = vm.createContext({ console, structuredClone, Date, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'savant-material', 'savant-enhancement',
  'weapon-classifier', 'npc-weapon-assigner', 'battlefield-painter', 'battle-conditional-params',
  'personal-battle-state', 'battle-formulas', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-team-conditions',
  'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const conditions = modules['cryptLord.battleTeamConditions'];
const selector = modules['cryptLord.battleConditionalParams'];
const fields = modules['cryptLord.battleFieldEffects'];
const bribes = modules['cryptLord.battleBribery'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = speed => ({ 当前序列: '普通人', 活力: 10000, 当前活力: 10000,
  灵性: 10000, 当前灵性: 10000, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 敏捷: speed, 当前敏捷: speed, 神性: 1 });
const start = skill => {
  const result = engine.start({ stat_data: { ...card(200), 序列能力列表: { 能力: [skill] } },
    npc_data: { 敌甲: card(20), 敌乙: { ...card(10), 当前活力: 5000 } } },
  { enemies: ['敌甲', '敌乙'], seed: 123 });
  assert.equal(result.ok, true, result.error);
  return result.data;
};
const baseSkill = { 名称: '条件技能', power: 5, isHeal: false, healAmt: 0,
  range: 'global', targetType: 'allEnemies', damageType: 'physical', aoeRadius: 1,
  effects: [], cost: { type: 'currentSanity', amount: 2 } };
const execute = (data, target = '敌甲', random) => {
  const out = engine.action(data, { id: 'skill:能力:0', target }, random);
  assert.equal(out.ok, true, out.error);
  return out;
};

// Compare the shipped original selector, not a second implementation of its rules.
const original = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt',
  import.meta.url), 'utf8');
const oracle = vm.createContext({ console: { log() {}, warn() {}, error() {} },
  Math: Object.assign(Object.create(Math), { random: () => .39 }) });
vm.runInContext(original.slice(original.indexOf('class TagChecker'),
  original.indexOf("console.log('[战斗系统] ParameterSelector 已加载')")) +
  '\nthis.selector = new ParameterSelector();', oracle);
const sample = { power: 5, range: 3, targetType: 'single', cost: { amount: 2 },
  conditionalParams: [
    { condition: 'caster.当前灵性 === 97 && target.getTagStacks("木") === 2 && random(0,1) === 40',
      params: { power: 20, range: 'global', damageType: 'mental', aoeRadius: 5,
        cost: { amount: 0 }, targetType: 'self' } },
    { condition: 'true', params: { power: 99 } },
  ] };
const caster = { spirit: 97 }, target = { tags: [{ name: '木', stacks: 2 }] };
assert.deepEqual(plain(selector.select(sample, caster, target, .39)),
  plain(oracle.selector.selectParameters(sample, { additionalStats: { 当前灵性: 97 } },
    { additionalStats: {}, tags: target.tags })));
assert.throws(() => selector.evaluate('target.constructor.constructor("return window")()', caster, target, 0));

// All original resource costs are deducted before evaluating caster conditions.
for (const [type, key, label] of [['currentVitality', 'hp', '活力'],
  ['currentAgility', 'agility', '敏捷'], ['currentSpirit', 'spirit', '灵性'],
  ['currentSanity', 'sanity', '理智'], ['currentHumanity', 'humanity', '人性']]) {
  const skill = { ...baseSkill, targetType: 'single', cost: { type, amount: 2 },
    conditionalParams: [{ condition: `caster.当前${label} === ${key === 'agility' ? 198 :
      ['hp', 'spirit'].includes(key) ? 9998 : 98}`, params: { power: 20 } }] };
  const data = start(skill), saved = JSON.stringify(data);
  const out = execute(data);
  assert.equal(out.battle.units[0][key], data.cryptLord.teamBattle.units[0][key] - 2);
  assert.equal(out.battle.lastConditionalAction.details[0].power, 20);
  assert.equal(JSON.stringify(data), saved);
  data.cryptLord.teamBattle.units[0][key] = 1;
  const insufficient = JSON.stringify(data);
  assert.equal(engine.action(data, { id: 'skill:能力:0', target: '敌甲' }).ok, false);
  assert.equal(JSON.stringify(data), insufficient);
}

// Circle B chooses effects/tags once; target A independently chooses damage/healing.
const mark = { 名称: '中心印记', 类型: 'debuff', 属性: 'attack', 威力: 5,
  数值类型: 'percentage', 持续时间: 3, 效果目标: 'allEnemies' };
let data = start({ ...baseSkill, 条件参数集: [
  { 条件: 'target.当前活力 < target.活力 && caster.当前理智 === 98',
    参数: { isHeal: true, 治疗量: .1, 治疗数值类型: 'percentage',
      效果: [{ ...mark, 名称: '不得泄漏' }] } },
  { 条件: 'true', 参数: { 威力: 10, 伤害类型: 'mental', 范围半径: 10,
    效果: [mark], applyTags: [{ name: '圈标记', stacks: 1, duration: 3 }] } },
] });
const unchanged = JSON.stringify(data);
const preview = engine.actionPreview(data, 'skill:能力:0', '敌甲');
engine.options(data); engine.actionPreview(data, 'skill:能力:0', '敌甲');
assert.equal(JSON.stringify(data), unchanged);
let out = execute(data);
assert.deepEqual(plain(preview.targets), plain(out.battle.lastConditionalAction.details));
assert.equal(out.battle.lastConditionalAction.radius, 10);
assert.equal(out.battle.units[0].sanity, 98);
assert.equal(out.battle.units[1].hp, 10000);
assert.ok(out.battle.units[1].sanity < 100);
assert.equal(out.battle.units[2].hp, 6000);
assert.equal(out.battle.units[2].sanity, 100);
for (const unit of out.battle.units.slice(1)) {
  assert.equal(unit.effects.filter(row => row.name === '中心印记').length, 1);
  assert.ok(!unit.effects.some(row => row.name === '不得泄漏'));
  assert.equal(unit.tags.find(row => row.name === '圈标记').stacks, 1);
}

// Independent per-target rolls, cached across precheck/center/hit, deterministic after reopening.
const draws = [.09, .79]; let count = 0;
const b = data.cryptLord.teamBattle;
const choice = { ...engine.options(data)[1], cost: 2, costKey: 'sanity' };
const session = conditions.session(b, b.units[0], choice, () => { count++; return draws.shift(); });
session.select(b.units[1]); session.select(b.units[1]);
session.bind(b.units[0]); session.select(b.units[2]); session.select(b.units[1]);
assert.equal(count, 2);
assert.deepEqual(plain(session.rolls()), { 敌甲: 10, 敌乙: 80 });
data = start({ ...baseSkill, conditionalParams: [
  { condition: 'random(1,100) <= 50', params: { power: 15, aoeRadius: 10 } },
  { condition: 'true', params: { power: 5, aoeRadius: 10 } },
] });
const prediction = engine.actionPreview(data, 'skill:能力:0', '敌甲');
const resumed = JSON.parse(JSON.stringify(data));
const a = execute(data), r = execute(resumed);
assert.deepEqual(plain(prediction.targets), plain(a.battle.lastConditionalAction.details));
assert.deepEqual(plain(a.battle.lastConditionalAction), plain(r.battle.lastConditionalAction));
assert.equal(a.battle.formulas.seed, r.battle.formulas.seed);

// Charm rejects conditional attacks before cost; healing and collateral remain legal.
data = start({ ...baseSkill, range: 0, aoeRadius: 0, conditionalParams: [
  { condition: 'caster.当前理智 === 98', params: { aoeRadius: 10, power: 10 } },
] });
let battle = data.cryptLord.teamBattle;
battle.units[1].bribery = { '贿赂：魅惑': {
  player: { targetId: 'player', appliedRound: 0, until: 10, power: 0 },
} };
battle.units[2].offField = true;
const blockedSnapshot = JSON.stringify(data);
assert.equal(engine.options(data).find(row => row.id === 'skill:能力:0').targets.length, 0);
assert.match(engine.action(data, { id: 'skill:能力:0', target: 'player' }).error, /范围攻击/u);
assert.equal(JSON.stringify(data), blockedSnapshot);
battle.units[2].offField = false;
assert.equal(engine.action(data, { id: 'skill:能力:0', target: 'player' }).ok, true);
data.stat_data.序列能力列表.能力[0] = { ...baseSkill, targetType: 'single',
  conditionalParams: [{ condition: 'true', params: { isHeal: true, healAmt: 10,
    healValueType: 'fixed' } }] };
assert.equal(engine.action(data, { id: 'skill:能力:0', target: '敌甲' }).ok, true);

// Pure healing keeps the blade; mixed conditional attacks consume it, even on an accuracy miss.
data = start({ ...baseSkill, conditionalParams: [{ condition: 'true',
  params: { isHeal: true, healAmt: 10, healValueType: 'fixed',
    isAccuracyWeapon: true, accuracyTier: '步枪级' } }] });
battle = data.cryptLord.teamBattle;
battle.units[1].hp = 5000;
battle.fieldEffect.nextAttack.player = { subtype: '灵肉之刃' };
out = execute(data, '敌甲', () => .9999);
assert.ok(fields.pending(out.battle, out.battle.units[0]));
assert.ok(out.battle.units[1].hp > 5000);
data.stat_data.序列能力列表.能力[0].conditionalParams[0].params = {
  power: 0, aoeRadius: 10, isAccuracyWeapon: true, accuracyTier: '步枪级', fixedDamage: 10,
};
out = execute(data, '敌甲', () => .9999);
assert.equal(fields.pending(out.battle, out.battle.units[0]), undefined);
assert.match(out.battle.log.map(row => row.message).join(), /未命中/u);
data.stat_data.序列能力列表.能力[0].conditionalParams[0].params = {
  power: 0, effects: [{ name: '纯效果', type: 'debuff', stat: 'attack',
    power: 5, duration: 2, effectTarget: 'target' }],
};
assert.equal(fields.pending(execute(data).battle, battle.units[0]), undefined);
const redirect = fields.redirect;
try {
  fields.redirect = () => ({ targets: [], mode: '测试落空' });
  out = execute(data);
  assert.ok(fields.pending(out.battle, out.battle.units[0]));
  assert.equal(out.battle.units[0].sanity, 98);
  assert.deepEqual(plain(out.battle.lastConditionalAction.rolls), {});
  assert.deepEqual(plain(out.battle.lastConditionalAction.targets), []);
  data.stat_data.序列能力列表.能力[0].range = 0;
  fields.redirect = b => ({ targets: [b.units[1]], forceSide: 'enemy' });
  out = execute(data, 'player');
  assert.equal(out.battle.lastConditionalAction.center, 'player');
} finally {
  fields.redirect = redirect;
}

// NPC picks conditional-only recovery; borrowed abilities retain their conditional rows.
data = start({ ...baseSkill, conditionalParams: [{ condition: 'true', params: { power: 10 } }] });
battle = data.cryptLord.teamBattle;
battle.index = battle.queue.indexOf('敌甲');
battle.units[1].hp = 3000;
data.npc_data.敌甲.序列能力列表 = { 能力: [{
  名称: '条件恢复', power: 0, isHeal: false, healAmt: 0, range: 0, targetType: 'self',
  conditionalParams: [{ condition: 'target.currentHealth < target.maxHealth / 2',
    params: { isHeal: true, healAmt: .2 } }],
}] };
const npcSaved = JSON.stringify(data);
assert.deepEqual(plain(engine.autoAction(data)), { id: 'skill:能力:0', target: '敌甲' });
assert.equal(JSON.stringify(data), npcSaved);
const healed = engine.action(data, engine.autoAction(data));
assert.equal(healed.ok, true, healed.error);
assert.equal(healed.battle.units[1].hp, 5000);
battle.index = battle.queue.indexOf('player');
battle.units[0].skillControl = { banned: [], granted: [{ ability: {
  ...baseSkill, conditionalParams: [{ condition: 'true', params: { power: 17 } }],
} }] };
const borrowed = engine.action(data, { id: 'granted:0', target: '敌甲' });
assert.equal(borrowed.ok, true, borrowed.error);
assert.equal(borrowed.battle.lastConditionalAction.details[0].power, 17);
delete modules['cryptLord.battleTeamConditions'];
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
modules['cryptLord.battleTeamConditions'] = conditions;
assert.ok(bribes);
console.log('PASS conditional skill chain: original oracle, postcost resources, center/target split, cached RNG, charm/blade, NPC/borrowed and native state purity');
