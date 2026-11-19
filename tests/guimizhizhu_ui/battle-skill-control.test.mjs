import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {};
class TestDate extends Date { static now() { return 1791288000000; } }
const context = vm.createContext({ console, structuredClone, Math, Date: TestDate,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'personal-battle-state', 'audience-imagination', 'grazing-state',
  'battle-terrain-presets', 'battle-formulas', 'battle-conditional-params',
  'battle-team-conditions', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-balance',
  'battle-punishment', 'battle-mythic-form', 'battle-exile', 'battle-active-leave',
  'battle-events', 'battle-rewind', 'battle-extra-action', 'battle-hard-control',
  'battle-mind-deprive', 'battle-temp-control', 'battle-permanent-control',
  'battle-possession', 'battle-rule-change', 'battle-environment', 'battle-fundamental',
  'battle-summon', 'battle-ability-borrow', 'battle-tactic-cpu', 'battle-action-cpu',
  'battle-terrain-effects', 'battle-resource-status', 'battle-auto-pilot',
  'battle-skill-control', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const control = modules['cryptLord.battleSkillControl'];
const bOf = data => data.cryptLord.teamBattle;
const player = data => bOf(data).units.find(row => row.id === 'player');
const foe = data => bOf(data).units.find(row => row.id === '敌');
const card = { 当前序列: '序列6-偷盗者/序列6-学徒/序列6-仲裁人',
  活力: 1000, 当前活力: 1000, 灵性: 2000, 当前灵性: 2000,
  敏捷: 100, 当前敏捷: 100, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 运气: 10,
  序列能力列表: { 能力: [{ 名称: '远击', power: 1, range: 'global' }] } };
function start() {
  const result = engine.start({ stat_data: structuredClone(card),
    npc_data: { 敌: { ...structuredClone(card), 当前序列: '序列9-猎人',
      灵性: 100, 当前灵性: 100, 活力: 200, 当前活力: 200,
      序列能力列表: { 能力: [{ 名称: '火焰', power: 1, range: 'global' },
        { 名称: '照明', power: 1, range: 'global' }] } } } },
    { enemies: ['敌'], seed: 81 });
  assert.equal(result.ok, true, result.error);
  return result.data;
}
function tactical(data) { bOf(data).phase = 'tactic'; return data; }
function active(data) {
  Object.assign(bOf(data), { phase: 'action', queue: ['player', '敌'], index: 0, turnSlots: [] });
  return data;
}
function apply(data, mode = '复制', skill = '火焰') {
  assert.equal(control.apply(data, bOf(data), player(data), foe(data), mode, skill).applied, true);
}
function waitRound(data) {
  data = engine.action(active(data), { type: 'wait' }).data;
  const result = engine.action(data, { type: 'wait' });
  assert.equal(result.ok, true, result.error);
  return result.data;
}
let data = start();
assert.ok(bOf(data).skillControlMeta);
const before = JSON.stringify(data);
assert.deepEqual(Object.keys(control.eligibility(data, player(data))).sort(), ['偷窃', '复制', '禁止']);
assert.equal(control.skills(data, foe(data)).length, 2);
assert.equal(JSON.stringify(data), before, 'Reads never alter the stored floor or dice.');
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(original.slice(original.indexOf('skillControlContest(caster, target, mode, isLast) {'),
  original.indexOf('    // ---------- 施加 ----------')).trim().replace(/[ \t]+$/gm, '')));
for (const mode of ['禁止', '偷窃', '复制']) {
  data = start(); apply(data, mode);
  assert.equal(foe(data).skillControl.banned.length, mode === '复制' ? 0 : 1);
  assert.equal(player(data).skillControl.granted.length, mode === '禁止' ? 0 : 1);
  assert.ok(control.skills(data, foe(data)).some(row => row.name === '火焰'),
    'Banned skills remain available for duration refresh.');
  if (mode !== '复制') assert.equal(control.skills(data, foe(data)).find(row => row.name === '火焰').banned, true);
}
data = start();
apply(data, '偷窃');
const granted = player(data).skillControl.granted[0];
assert.equal(granted.choice.range, 'global');
assert.notEqual(granted.choice.skill, data.npc_data.敌.序列能力列表.能力[0]);
data.npc_data.敌.序列能力列表.能力[0].power = 99;
assert.equal(granted.choice.skill.power, 1, 'The grant has an independent snapshot.');
bOf(data).round = 2; apply(data, '偷窃');
assert.equal(player(data).skillControl.granted.length, 1);
assert.equal(player(data).skillControl.granted[0].until, 4);
assert.equal(player(data).skillControl.granted[0].choice.skill.power, 1,
  'Refresh preserves the original borrowed move and its runtime usage.');
data = JSON.parse(JSON.stringify(data));
let choice = engine.options(active(data), true).find(row => row.id === 'granted:0');
assert.ok(choice.targets.includes('敌'));
let result = engine.action(data, { id: choice.id, target: '敌' }, () => .99);
assert.equal(result.ok, true, result.error);
assert.ok(foe(result.data).hp < foe(data).hp);
assert.equal(data.npc_data.敌.序列能力列表.能力[0].power, 99);
// Two full action rounds: apply at N, retain N+1 and N+2, expire at N+2 end.
data = start(); apply(data, '偷窃');
bOf(data).round = 2;
data = waitRound(data);
assert.equal(player(data).skillControl.granted.length, 1);
data = engine.tactic(data, 'skip', () => .99).data;
assert.equal(bOf(data).round, 3);
assert.equal(player(data).skillControl.granted.length, 1);
data = waitRound(data);
assert.equal(player(data).skillControl.granted.length, 0);
assert.equal(foe(data).skillControl.banned.length, 0);
assert.ok(bOf(data).log.some(row => row.message.includes('无法使用火焰')));
// Contest charges before rolling; strict unrounded comparison, copy skips last-skill penalty.
data = start();
data.npc_data.敌.序列能力列表.能力.splice(1);
let outcome = control.attempt(data, bOf(data), player(data), foe(data), '禁止', '火焰', '禁止', () => .5);
assert.equal(outcome.last, true);
assert.equal(outcome.scores.defender, 600);
data = start();
data.npc_data.敌.序列能力列表.能力.splice(1);
outcome = control.attempt(data, bOf(data), player(data), foe(data), '复制', '火焰', '记录', () => .5);
assert.equal(outcome.last, false);
assert.equal(outcome.scores.defender, 200);
assert.ok(outcome.cost > 0);
// Player command uses the same resolver and one next-round transition.
data = tactical(start());
const saved = JSON.stringify(data);
result = engine.skillControl(data, { target: '敌', mode: '复制', skill: '火焰' }, () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).round, 2);
assert.equal(player(result.data).skillControl.granted.length, 1);
assert.equal(JSON.stringify(data), saved);
assert.equal(engine.skillControl(data, { target: '敌', mode: '坏模式', skill: '火焰' }).ok, false);
const fee = engine.skillControlOptions(data).cost;
player(data).spirit = fee;
assert.equal(engine.skillControl(data, { target: '敌', mode: '复制', skill: '火焰' },
  () => .99).ok, true, 'Admission and settlement use the same saved average-resource fee.');
player(data).controller = 'npc';
assert.equal(engine.skillControl(data, { target: '敌', mode: '复制', skill: '火焰' }).ok, false);
// NPC candidates include already banned moves; NPC and borrowed callers use the same application path.
data = start();
foe(data).spirit = foe(data).maxSpirit = 10000;
foe(data).sequence = '序列6-偷盗者';
modules['cryptLord.battleFieldEffects'].withRuntime(bOf(data), data, () => .99, rt => {
  const caster = rt.heroes.find(row => row.heroId === '敌');
  const target = rt.heroes.find(row => row.heroId === 'player');
  const pairs = rt.skillControl.npcTargets(rt.bm, caster, '偷窃');
  assert.ok(pairs.some(row => row.target === target && row.skillName === '远击'));
  const summary = [], results = [];
  assert.equal(rt.skillControl.npcAttempt(rt.bm, caster, '偷窃',
    { target, skillName: '远击' }, '窃取非凡能力', summary, results), true);
  assert.equal(results[0].mode, '偷窃');
});
assert.equal(player(data).skillControl.banned[0].name, '远击');
assert.equal(foe(data).skillControl.granted[0].name, '远击');
assert.equal(engine.applyBorrowedSkill(data, bOf(data), player(data), foe(data),
  '复制', '火焰').applied, true);
assert.equal(player(data).skillControl.granted[0].name, '火焰');
const borrowContext = { borrowId: 'test', rolls: [] };
const mathContest = control.contest({ additionalStats: { 当前灵性: 100.1 },
  $tacticContext: borrowContext },
{ additionalStats: { 当前活力: 100 } }, '复制', false, () => .5,
{ tacticMultiplier: () => 1 });
assert.equal(mathContest.win, true, 'Compare full precision, not rounded display scores.');
assert.equal(mathContest.casterScore, mathContest.targetScore);
assert.equal(borrowContext.rolls.length, 1, 'The original resolver records borrowed contest rolls.');
// JSON-compatible grants never consume the owner's real inventory.
data = start();
data.npc_data.敌.消耗品列表 = { 药: { 名称: '恢复药', 数量: 1, 序列: '序列9',
  战斗效果: { 基础效果: '活力恢复', 范围: '单体', 额外效果: '无' } } };
foe(data).cardSource = 'player';
assert.ok(control.skills(data, foe(data)).some(row => row.name === '恢复药'));
apply(data, '复制', '恢复药');
player(data).hp -= 30;
choice = engine.options(active(data), true).find(row => row.name === '恢复药');
result = engine.action(data, { id: choice.id, target: 'player' }, () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(result.data.npc_data.敌.消耗品列表.药.数量, 1);
assert.equal(player(result.data).skillControl.granted[0].choice.quantity, 0);
assert.equal(engine.options(active(result.data)).some(row => row.name === '恢复药'), false);
const frozen = JSON.stringify(result.data);
apply(result.data, '复制', '恢复药');
assert.equal(player(result.data).skillControl.granted[0].choice.quantity, 0);
assert.ok(frozen);
// A previous-version floor is upgraded only inside its next valid native transaction.
data = start(); apply(data, '偷窃');
delete bOf(data).skillControlMeta;
active(data);
const oldFloor = JSON.stringify(data);
result = engine.action(data, { type: 'wait' });
assert.equal(result.ok, true, result.error);
assert.ok(bOf(result.data).skillControlMeta);
assert.equal(player(result.data).skillControl.granted.length, 1);
assert.equal(JSON.stringify(data), oldFloor);
// Marked floors refuse silently downgraded execution; battle end removes only temporary states.
data = start(); apply(data, '偷窃');
delete modules['cryptLord.battleSkillControl'];
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
modules['cryptLord.battleSkillControl'] = control;
control.finish(bOf(data));
assert.equal(player(data).skillControl.granted.length, 0);
assert.equal(data.stat_data.序列能力列表.能力.length, 1);
console.log('Skill interference: original resolver, ownership, native execution, refresh, depletion, expiry and guards passed.');
