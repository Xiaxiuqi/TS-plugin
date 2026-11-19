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
  'audience-imagination', 'grazing-state', 'battle-terrain-presets', 'battle-formulas',
  'battle-conditional-params', 'battle-team-conditions', 'battle-auras',
  'battle-field-effect-reference', 'battle-field-effects', 'battle-effect-transfer',
  'battle-bribery', 'battle-balance', 'battle-punishment', 'battle-mythic-form',
  'battle-exile', 'battle-active-leave', 'battle-events', 'battle-rewind',
  'battle-extra-action', 'battle-hard-control', 'battle-mind-deprive',
  'battle-temp-control', 'battle-permanent-control', 'battle-possession',
  'battle-rule-change', 'battle-environment', 'battle-fundamental', 'battle-summon',
  'battle-ability-borrow', 'battle-tactic-cpu', 'battle-action-cpu',
  'battle-terrain-effects', 'battle-resource-status', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const status = modules['cryptLord.battleResourceStatus'];
const reference = modules['cryptLord.battleFieldEffectReference'];
const formulas = modules['cryptLord.battleFormulas'];
const bOf = data => data.cryptLord.teamBattle;
const pOf = data => bOf(data).units.find(row => row.id === 'player');
const card = { 当前序列: '序列9-猎人', 活力: 1000, 当前活力: 1000,
  灵性: 100, 当前灵性: 100, 敏捷: 100, 当前敏捷: 100,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 运气: 10 };
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/30b-js-battle-team-effects-config.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(source.slice(source.indexOf('class StatusEffectManager {'),
  source.indexOf("console.log('[战斗系统] StatusEffectManager 已加载');")).trim()
  .replace(/[ \t]+$/gm, '')), 'The entire original status manager is extracted.');
function start(overrides = {}, options = {}) {
  const out = engine.start({ stat_data: { ...card, ...overrides },
    npc_data: { 敌: { ...card } } }, { enemies: ['敌'], seed: 13, ...options });
  assert.equal(out.ok, true, out.error);
  return out.data;
}
function nextTurn(data, round) {
  const next = structuredClone(data), battle = bOf(next);
  Object.assign(battle, { round, phase: 'action', queue: ['敌', 'player'], index: 0 });
  battle.turnSlots = [];
  for (const actor of battle.units) actor.turnStartedRound = round - 1;
  const out = engine.action(next, { type: 'wait' });
  assert.equal(out.ok, true, out.error);
  return out.data;
}
const defaultConfig = reference.createStatus().defaultConfig;
const keys = { vitality: ['hp', 'maxHp'], agility: ['agility', 'maxAgility'],
  spirit: ['spirit', 'maxSpirit'], sanity: ['sanity', 'maxSanity'],
  humanity: ['humanity', 'maxHumanity'] };
// One matrix checks every original tier and all five independent channels.
for (const [attribute, [key, max]] of Object.entries(keys)) {
  for (const ratio of [0, .29, .49, .79, .8, 1]) {
    const data = start(), battle = bOf(data), actor = pOf(data);
    actor.effects = []; delete actor.resourceStatusStartedRound;
    actor[key] = actor[max] * ratio;
    const originalHero = { name: actor.name, effects: [], additionalStats: {
      活力: actor.maxHp, 当前活力: actor.hp, 敏捷: actor.maxAgility, 当前敏捷: actor.agility,
      灵性: actor.maxSpirit, 当前灵性: actor.spirit, 理智: actor.maxSanity, 当前理智: actor.sanity,
      人性: actor.maxHumanity, 当前人性: actor.humanity,
    } };
    const expected = reference.createStatus().checkAndApplyEffects(originalHero);
    const applied = status.turnStart(battle, actor);
    const shape = rows => JSON.stringify(rows.map(({ name, stat, type, power, valueType, duration }) =>
      ({ name, stat, type, power, valueType, duration })));
    assert.equal(shape(applied), shape(expected), `${attribute} ${ratio}`);
    assert.ok(applied.every(row => row.statusDerived && row.resourceStatus));
    assert.equal(status.turnStart(battle, actor).length, 0, 'No duplicate callback tick/log.');
  }
}
let data = start({ 当前活力: 290, 当前敏捷: 29, 当前灵性: 29, 当前理智: 29, 当前人性: 29 });
data = nextTurn(data, 2);
let actor = pOf(data), battle = bOf(data);
assert.equal(actor.effects.filter(row => row.resourceStatus).length, 5);
assert.equal(formulas.movement(battle, actor), 1);
const cleanActor = { ...actor, effects: [] };
assert.equal(formulas.attribute(battle, actor, 'attack'),
  Math.floor(formulas.attribute(battle, cleanActor, 'attack') * .45));
assert.equal(formulas.attribute(battle, actor, 'defense'),
  Math.floor(formulas.attribute(battle, cleanActor, 'defense') * .5));
// Fixed weapon damage isolates the three damage channels from attack/defense.
const victim = { ...battle.units.find(row => row.id === '敌'), effects: [] };
const weapon = { isAccuracyWeapon: true, fixedDamage: 100, damageType: 'physical' };
assert.equal(formulas.damage(battle, actor, victim, weapon, () => .5).amount,
  Math.floor(100 * (1 - (.45 + .35))));
assert.equal(formulas.damage(battle, cleanActor, actor, weapon, () => .5).amount, 160);
// Healing during an action leaves the derived status until the next own turn.
Object.assign(actor, { hp: actor.maxHp, agility: actor.maxAgility, spirit: actor.maxSpirit,
  sanity: actor.maxSanity, humanity: actor.maxHumanity });
assert.equal(actor.effects.filter(row => row.resourceStatus).length, 5);
data = nextTurn(data, 3);
assert.equal(pOf(data).effects.filter(row => row.resourceStatus).length, 0);
assert.ok(formulas.movement(bOf(data), pOf(data)) > 2);
// Regeneration runs before the threshold check; terrain damage runs after it.
data = start(); actor = pOf(data); battle = bOf(data);
actor.hp = 790;
actor.effects.push({ name: '自愈', type: 'regen', stat: '当前活力', power: 10,
  valueType: 'fixed', duration: 1, skillEffect: true, triggerTiming: 'turn_start', priority: 0 });
data = nextTurn(data, 2);
assert.equal(pOf(data).hp, 800);
assert.ok(!pOf(data).effects.some(row => row.resourceStatus));
data = start(); actor = pOf(data); battle = bOf(data);
actor.hp = 800;
battle.terrain = [{ x: actor.x, y: actor.y, id: 'fireSurface', name: '火焰地表',
  rank: 8, tier: 1, duration: 0 }];
data = nextTurn(data, 2);
assert.equal(pOf(data).hp, 796);
assert.ok(!pOf(data).effects.some(row => row.resourceStatus));
pOf(data).hp = 790;
data = nextTurn(data, 3);
assert.ok(pOf(data).effects.some(row => row.name === '轻伤'));
// Configuration is a battle snapshot; invalid hot reload keeps it intact.
data = start(); battle = bOf(data);
const saved = JSON.stringify(battle);
assert.equal(status.configure(battle, { agility: [] }).ok, false);
assert.equal(JSON.stringify(battle), saved);
const config = structuredClone(defaultConfig);
config.agility = [config.agility[3], config.agility[1], config.agility[0], config.agility[2]];
config.agility.find(row => row.threshold === .29).threshold = .35;
assert.equal(status.configure(battle, config).ok, true);
config.agility[0].threshold = .01;
assert.deepEqual(Array.from(status.agilityThresholds(battle)), [0, .35, .49, .79]);
pOf(data).agility = 30;
assert.equal(formulas.movement(battle, pOf(data)), 1);
assert.equal(engine.start({ stat_data: card, npc_data: { 敌: card } },
  { enemies: ['敌'], statusEffects: { agility: [] } }).ok, false);
// Extra turns freeze status expiry and do not add another tier.
actor = pOf(data); status.turnStart(battle, actor);
const effectSnapshot = JSON.stringify(actor.effects);
const extra = modules['cryptLord.battleExtraAction'], originalSlot = extra.currentSlot;
extra.currentSlot = () => ({ extra: 1, cfg: { skipTurnStart: true, freezeDurations: true } });
battle.round++;
status.turnStart(battle, actor);
assert.equal(JSON.stringify(actor.effects), effectSnapshot);
extra.currentSlot = originalSlot;
// Derived effects and names reserved by the config cannot be gifted.
const fields = modules['cryptLord.battleFieldEffects'];
fields.withRuntime(battle, {}, () => .5, rt => {
  const hero = rt.heroes.find(row => row.heroId === 'player');
  assert.ok(!rt.transfer.giftableEffects(rt.bm, hero).some(row => row.statusDerived));
  assert.ok(!rt.transfer.isGiftableEffect(rt.bm, {
    name: '重伤', type: 'debuff', stat: 'defense', power: 50, duration: 1 }));
});
// Reopen/restore/description are read-only, missing modules cannot silently downgrade.
const restored = JSON.parse(JSON.stringify(data)), before = JSON.stringify(restored);
engine.get(restored); status.statusLines(bOf(restored), pOf(restored));
status.manager(bOf(restored)); status.agilityThresholds(bOf(restored));
assert.equal(JSON.stringify(restored), before);
delete modules['cryptLord.battleResourceStatus'];
assert.equal(engine.action(restored, { type: 'wait' }).ok, false);
assert.throws(() => formulas.movement(bOf(restored), pOf(restored)), /五维/);
modules['cryptLord.battleResourceStatus'] = status;
actor.effects.push({ name: '外部负效', type: 'debuff', stat: 'attack', power: 5, duration: 2 });
status.finish(battle);
assert.ok(!actor.effects.some(row => row.resourceStatus));
assert.ok(actor.effects.some(row => row.name === '外部负效'));
assert.equal(actor.resourceStatusStartedRound, undefined);
console.log('Resource status: complete original tiers, timing, numerical channels, config and persistence passed.');
