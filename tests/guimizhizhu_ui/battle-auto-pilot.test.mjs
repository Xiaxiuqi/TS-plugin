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
  'battle-terrain-effects', 'battle-resource-status', 'battle-auto-pilot', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'];
const auto = modules['cryptLord.battleAutoPilot'];
const cpu = modules['cryptLord.battleActionCpu'];
const bOf = data => data.cryptLord.teamBattle;
const pOf = data => bOf(data).units.find(row => row.id === 'player');
const card = { 当前序列: '序列9-猎人', 活力: 1000, 当前活力: 1000,
  灵性: 100, 当前灵性: 100, 敏捷: 100, 当前敏捷: 100,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 运气: 10,
  序列能力列表: { 能力: [{ 名称: '远击', power: 100, range: 'global' }] } };
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt',
  import.meta.url), 'utf8');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(source.slice(source.indexOf('const AutoPilotManager = {'),
  source.indexOf("console.log('[战斗系统] AutoPilotManager 已加载');")).trim()
  .replace(/[ \t]+$/gm, '')), 'Extract the whole original manager.');
function start(overrides = {}, options = {}) {
  const out = engine.start({ stat_data: { ...structuredClone(card), ...overrides },
    npc_data: { 敌: { ...structuredClone(card), 敏捷: 20, 当前敏捷: 20 },
      友: { ...structuredClone(card), 敏捷: 10, 当前敏捷: 10 } } },
  { enemies: ['敌'], seed: 71, ...options });
  assert.equal(out.ok, true, out.error);
  const data = out.data;
  Object.assign(bOf(data), { phase: 'action', queue: ['player', '敌'], index: 0, turnSlots: [] });
  return data;
}
const enabled = data => {
  const out = auto.set(data, true);
  assert.equal(out.ok, true, out.error);
  return out.data;
};
const step = (data, random = () => .99) => {
  const out = auto.step(data, random);
  assert.equal(out.ok, true, out.error);
  return out.data;
};
let data = start();
assert.equal(auto.isOn(bOf(data)), false);
assert.equal(auto.step(data).ok, false);
const untouched = JSON.stringify(data);
assert.equal(auto.set(data, 'true').ok, false);
assert.equal(JSON.stringify(data), untouched);
data = enabled(data);
assert.equal(auto.set(data, true).changed, false);
assert.equal(auto.drives(bOf(data), pOf(data)), true);
assert.equal(auto.drives(bOf(data), { controller: 'npc', source: 'player' }), false);
assert.equal(auto.drives(bOf(data), { controller: 'player', source: 'npc', isSummon: true }), true);
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
const controlled = bOf(data).units.map(row => row.controller || row.source);
data = step(data);
assert.ok(bOf(data).units.find(row => row.id === '敌').hp < 1000);
assert.deepEqual(bOf(data).units.map(row => row.controller || row.source), controlled);
assert.equal(bOf(data).index, 1, 'One automatic step cannot consume the next actor slot.');
data = step(data);
assert.equal(bOf(data).phase, 'tactic');
assert.equal(engine.tactic(data, 'skip').ok, false);
data = step(data);
assert.equal(bOf(data).round, 2);
assert.equal(bOf(data).phase, 'action');
assert.equal(bOf(data).lastTactic.declaration.action, '待命');
data = auto.set(data, false).data;
assert.equal(auto.step(data).ok, false);
assert.equal(engine.action(data, { type: 'wait' }).ok, true);
// A player-controlled borrowed body uses its own card, without changing controller.
data = enabled(start({}, { allies: ['友'] }));
Object.assign(bOf(data), { queue: ['友', 'player', '敌'], index: 0, turnSlots: [] });
const friend = bOf(data).units.find(row => row.id === '友');
friend.controller = 'player';
data.npc_data.友.序列能力列表 = { 能力: [{ 名称: '友方远击', power: 200, range: 'global' }] };
data = step(data);
assert.equal(bOf(data).actionCpuMeta.last.actor, '友');
assert.equal(bOf(data).units.find(row => row.id === '友').controller, 'player');
// Enemy control of the original body is ordinary NPC action, not attributed to autopilot.
data = enabled(start());
pOf(data).controller = 'npc';
assert.equal(auto.drives(bOf(data), pOf(data)), false);
assert.ok(cpu.preview(data), 'The existing NPC CPU still runs.');
data = step(data);
assert.equal(pOf(data).controller, 'npc');
// Live granted skills are selected; they are not rebuilt from the character's base list.
data = enabled(start({ 序列能力列表: {} }));
pOf(data).skillControl = { banned: [], granted: [{ name: '借来远击',
  ability: { 名称: '借来远击', power: 250, range: 'global' } }] };
data = step(data);
assert.equal(bOf(data).actionCpuMeta.last.id, 'granted:0');
assert.ok(pOf(data).skillControl.granted.some(row => row.name === '借来远击'));
// An exhausted consumable is not restored by rebuilding the next automatic action.
data = enabled(start({ 当前活力: 50, 序列能力列表: {}, 消耗品列表: { 药: {
  名称: '活力药剂', 序列: '序列8', 数量: 1,
  战斗效果: { 基础效果: '活力恢复', 范围: '单体', 额外效果: '无' },
} } }));
pOf(data).skillControl = { banned: [{ name: '普通攻击' }], granted: [] };
data = step(data, () => 0);
assert.equal(bOf(data).actionCpuMeta.last.id, 'consumable:药');
assert.ok(pOf(data).hp > 50);
assert.equal(data.stat_data.消耗品列表.药, undefined);
Object.assign(bOf(data), { queue: ['player', '敌'], index: 0, round: 2, phase: 'action', turnSlots: [] });
data = step(data, () => 0);
assert.equal(data.stat_data.消耗品列表.药, undefined);
assert.equal(bOf(data).actionCpuMeta.last.id, null);
// Read-only plans keep both floor data and random sequence unchanged after JSON restore.
data = enabled(start());
const restored = JSON.parse(JSON.stringify(data)), before = JSON.stringify(restored);
auto.isOn(bOf(restored)); auto.drives(bOf(restored), pOf(restored));
cpu.preview(restored, { autoPilot: true });
assert.equal(JSON.stringify(restored), before);
assert.deepEqual(auto.step(data).data, auto.step(restored).data);
delete modules['cryptLord.battleAutoPilot'];
assert.equal(engine.action(data, { type: 'wait' }).ok, false);
modules['cryptLord.battleAutoPilot'] = auto;
const actionCpu = modules['cryptLord.battleActionCpu'];
delete modules['cryptLord.battleActionCpu'];
assert.equal(auto.step(data).ok, false);
modules['cryptLord.battleActionCpu'] = actionCpu;
// Player auras get one initial layer; off/on resumes without another initial layer.
const pathways = { 律师途径: ['序列3-狂乱法师'] };
data = start({ 当前序列: '序列3-狂乱法师' }, { pathways });
data = enabled(data);
const auras = modules['cryptLord.battleAuras'];
assert.equal(auras.options(bOf(data), pOf(data))[0].stacks, 1);
data = auto.set(data, false).data;
data = enabled(data);
assert.equal(auras.options(bOf(data), pOf(data))[0].stacks, 1);
// Automatic tactics include player abilities in the original candidate pipeline.
const balancePaths = { 水手途径: ['序列4-灾难主祭'] };
data = enabled(start({ 当前序列: '序列4-灾难主祭' }, { pathways: balancePaths }));
Object.assign(bOf(data), { phase: 'tactic', index: bOf(data).queue.length });
data = step(data, () => .01);
assert.ok(bOf(data).tacticCpuMeta.last.actors.includes('player'),
  'The player participates in the same tactical CPU, not an empty skip.');
// Active leaving keeps the original player maintenance branch, with one upkeep fee.
data = start({ 当前序列: '序列3-占卜家' },
  { pathways: { 占卜家途径: ['序列3-占卜家'] } });
bOf(data).phase = 'tactic';
let out = engine.activeLeave(data, { subtype: '藏入历史迷雾' }, () => .5);
assert.equal(out.ok, true, out.error);
data = enabled(out.data);
bOf(data).phase = 'tactic';
const upkeep = engine.activeLeaveOptions(data).cost, spirit = pOf(data).spirit;
data = step(data, () => .99);
assert.equal(pOf(data).activeLeaving, true);
assert.equal(pOf(data).spirit, spirit - upkeep);
assert.equal(bOf(data).activeLeave.processes.length, 1);
// Extra slots use the same live body without reticking end-of-turn effects.
data = start({ 当前序列: '序列4-学徒' },
  { pathways: { 学徒途径: ['序列4-学徒'] } });
bOf(data).phase = 'tactic';
out = engine.extraAction(data, '闪现（虚影分身）', () => .99);
assert.equal(out.ok, true, out.error);
data = enabled(out.data);
assert.equal(bOf(data).turnSlots[1].heroId, 'player');
pOf(data).effects.push({ name: '轮末减益', type: 'debuff', stat: 'attack',
  power: 5, duration: 3, valueType: 'percentage', triggerTiming: 'turn_end',
  skillEffect: true, priority: 0 });
data = step(data);
assert.equal(pOf(data).effects.find(row => row.name === '轮末减益').duration, 2);
data = step(data);
assert.equal(pOf(data).effects.find(row => row.name === '轮末减益').duration, 2);
// A moved player has only its remaining movement budget available to autopilot.
data = enabled(start({ 序列能力列表: { 能力: [{ 名称: '近击', power: 30, range: 1 }] } }));
pOf(data).moveRemaining = 0;
data = step(data);
assert.equal(bOf(data).actionCpuMeta.last.moveTo, null);
// A finished battle turns off the flag and never auto-confirms the report.
data = enabled(start({ 序列能力列表: { 能力: [{ 名称: '终结', power: 1000000, range: 'global' }] } }));
data = step(data);
assert.equal(bOf(data).status, 'finished');
assert.equal(auto.isOn(bOf(data)), false);
assert.equal(bOf(data).settled, false);
assert.equal(auto.set(data, true).ok, false);
assert.equal(auto.step(data).ok, false);
const settled = engine.settle(data, bOf(data).id, false);
assert.equal(settled.ok, true);
assert.equal(auto.isOn(bOf(start())), false);
console.log('Multiplayer autopilot: original ownership, live skills, tactical/action CPU, persistence and end guards passed.');
