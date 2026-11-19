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
  'battle-field-effects', 'battle-bribery', 'battle-punishment', 'battle-exile',
  'battle-active-leave', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], manager = modules['cryptLord.battleActiveLeave'];
const fields = modules['cryptLord.battleFieldEffects'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = (sequence, spirit = 10000, speed = 20) => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000,
  灵性: spirit, 当前灵性: spirit, 敏捷: speed, 当前敏捷: speed,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 神性: 1,
  序列能力列表: {},
});
function start(sequence = '序列5-萨满/序列3-占卜家') {
  const out = engine.start({ stat_data: card(sequence, 10000, 200),
    npc_data: { 敌甲: card('序列5-猎人'), 敌乙: card('序列5-猎人', 100, 1) } },
  { enemies: ['敌甲', '敌乙'], seed: 123 });
  assert.equal(out.ok, true, out.error); return out.data;
}
const phase = data => { data.cryptLord.teamBattle.phase = 'tactic'; return data; };
const act = (data, request) => {
  const out = engine.activeLeave(data, request, () => .5);
  assert.equal(out.ok, true, out.error); return out.data;
};
const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b2-js-aura-and-grazing-projection.txt',
  import.meta.url), 'utf8');
const fragment = source.slice(source.indexOf('const ActiveLeaveManager ='),
  source.indexOf("console.log('[战斗系统] ActiveLeaveManager"));
const oracle = vm.createContext({
  TacticCatalog: manager.defaults(),
  LifeSaveManager: {
    splitSequenceFragments: text => text.split('/'),
    resolveFragment: text => {
      const match = text.match(/序列(\d+)-(.+)/u);
      return match ? { rank: Number(match[1]), pathwayShort: match[2] } : null;
    },
  },
});
vm.runInContext(fragment + '\nthis.manager = ActiveLeaveManager;', oracle);
for (const sequence of ['序列5-萨满', '序列6-萨满', '序列3-占卜家', '序列4-占卜家',
  '高维俯视者', '诡秘之主', '序列5-萨满/序列3-占卜家']) {
  const d = start(sequence), b = d.cryptLord.teamBattle;
  const actual = fields.withRuntime(b, d, undefined,
    rt => rt.activeLeave.resolveEligibility(sequence));
  assert.deepEqual(plain(actual), plain(oracle.manager.resolveEligibility(sequence)));
}

// No entry fee, persistent away status, pure reads, mandatory maintenance and native round advancement.
let data = phase(start()), b = data.cryptLord.teamBattle;
const pristine = JSON.stringify(data), choice = engine.activeLeaveOptions(data);
assert.equal(choice.choices.length, 2);
assert.equal(choice.choices[0].rivals.length, 0);
engine.get(data); manager.statusLines(b, b.units[0]);
assert.equal(JSON.stringify(data), pristine);
data = act(data, { subtype: '维度穿越' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[0].spirit, 10000);
assert.equal(b.units[0].activeLeaving, true); assert.equal(b.units[0].x, null);
assert.equal(b.round, 2);
data = engine.advanceAuto(data).data; b = data.cryptLord.teamBattle;
assert.equal(b.phase, 'tactic'); assert.equal(b.status, 'active');
const away = engine.activeLeaveOptions(data);
assert.equal(away.away, true); assert.equal(away.canStay, true);
assert.equal(away.cost, Math.max(1, Math.round(
  modules['cryptLord.battleFieldEffectReference'].averages()['3'].灵性 * .01)));
const readAway = JSON.stringify(data);
assert.equal(engine.activeLeave(data, { subtype: '藏入历史迷雾' }).ok, false);
assert.equal(engine.tactic(data, { declaration: { action: '改变地形' }, plan: { NPC行动: [] } }).ok, false);
assert.equal(JSON.stringify(data), readAway);
data = act(data, { mode: 'stay' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[0].spirit, 10000 - away.cost);
data = engine.advanceAuto(data).data;
let out = engine.tactic(data, 'skip', () => .5);
assert.equal(out.ok, true, out.error); data = out.data;
assert.equal(data.cryptLord.teamBattle.units[0].spirit, 10000 - away.cost * 2);
data = engine.advanceAuto(data).data;
const spiritBeforeReturn = data.cryptLord.teamBattle.units[0].spirit;
data = act(data, { mode: 'return' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[0].activeLeaving, false); assert.ok(Number.isFinite(b.units[0].x));
assert.equal(b.units[0].spirit, spiritBeforeReturn);
assert.equal(b.queue[b.index], 'player'); assert.equal(b.phase, 'action');
assert.equal(b.activeLeave.processes.length, 0);

// Both pathways: ALL qualified foes resist; disqualified/off-field/skipped foes cannot resist.
data = phase(start()); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列2-窥秘人'; b.units[1].spirit = 100000;
b.units[2].sequence = '序列6-阅读者';
let options = engine.activeLeaveOptions(data);
assert.equal(options.choices.find(row => row.subtype === '维度穿越').rivals.length, 2);
assert.equal(options.choices.find(row => row.subtype === '藏入历史迷雾').rivals.length, 1);
data = act(data, { subtype: '维度穿越' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[0].activeLeaving, undefined);
assert.equal(b.units[0].spirit, 10000);
assert.equal(b.lastTactic.outcomes.find(row => row.actor === 'player').stage, 'fail');
data = phase(start()); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列3-占卜家'; b.units[1].spirit = 1000;
b.units[2].sequence = '序列6-阅读者'; b.units[2].spirit = 100000; b.units[2].turnSkip = {};
options = engine.activeLeaveOptions(data);
assert.equal(options.choices.find(row => row.subtype === '藏入历史迷雾').rivals.length, 1);
data = act(data, { subtype: '藏入历史迷雾' });
assert.equal(data.cryptLord.teamBattle.units[0].activeLeaving, true);

// Insufficient upkeep returns without spending; occupied origins search outwards; death restores bodies.
data = phase(start()); data = act(data, { subtype: '维度穿越' });
data = engine.advanceAuto(data).data; b = data.cryptLord.teamBattle;
b.units[0].spirit = 0;
const process = b.activeLeave.processes[0];
b.units[1].x = process.originX; b.units[1].y = process.originY;
out = engine.tactic(data, 'skip', () => .5); assert.equal(out.ok, true); b = out.data.cryptLord.teamBattle;
assert.equal(b.units[0].activeLeaving, false); assert.equal(b.units[0].spirit, 0);
assert.ok(b.units[0].x !== b.units[1].x || b.units[0].y !== b.units[1].y);
data = act(phase(start()), { subtype: '维度穿越' }); b = data.cryptLord.teamBattle;
b.units[0].hp = 0; manager.checkDead(b);
assert.equal(b.activeLeave.processes.length, 0); assert.equal(b.units[0].activeLeaving, false);
assert.ok(Number.isFinite(b.units[0].x));
data = act(phase(start()), { subtype: '维度穿越' }); b = data.cryptLord.teamBattle;
manager.finish(b);
assert.equal(b.activeLeave.processes.length, 0); assert.equal(b.units[0].activeLeaving, false);

// NPCs require an ACTUAL living owned summon; returned NPCs occupy this tactic slot.
data = start(); b = data.cryptLord.teamBattle;
b.units[1].sequence = '序列5-萨满/序列4-仲裁人'; b.units[1].spirit = 100000;
assert.equal(manager.npc(b, data, [], () => 0).length, 0);
b.units[2].isSummon = true;
b.summon = { projections: [{ ownerId: '敌甲', heroId: '敌乙' }] };
assert.equal(manager.npc(b, data, ['敌甲'], () => 0).length, 0);
assert.equal(manager.npc(b, data, [], () => 0).length, 1);
assert.equal(b.units[1].activeLeaving, true);
const npcSpirit = b.units[1].spirit;
const maintained = manager.prepare(b, data, () => .5);
assert.equal(maintained.find(row => row.actor === '敌甲').stage, 'upkeep');
assert.ok(b.units[1].spirit < npcSpirit);
b.units[2].hp = 0; b.phase = 'tactic';
out = engine.tactic(data, 'skip', () => 0);
assert.equal(out.ok, true, out.error); b = out.data.cryptLord.teamBattle;
const ownerOutcomes = b.lastTactic.outcomes.filter(row => row.actor === '敌甲');
assert.equal(ownerOutcomes.length, 1); assert.equal(ownerOutcomes[0].stage, 'return');
assert.equal(ownerOutcomes[0].reason, 'summons');
assert.equal(b.units[1].punishment, undefined);

// The caster's existing temporary allegiance is interrupted on entry, matching the original manager.
data = phase(start()); b = data.cryptLord.teamBattle;
b.units[1].side = 'ally';
b.tempAllegiance.processes = [{ targetId: '敌甲', casterId: 'player', subtype: '魅惑',
  originTeamType: 'enemy', originController: 'npc', expireRound: 3 }];
data = act(data, { subtype: '维度穿越' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[1].side, 'enemy'); assert.equal(b.tempAllegiance.processes.length, 0);
data = phase(start()); const beforeMissing = JSON.stringify(data);
delete modules['cryptLord.battleActiveLeave'];
assert.equal(engine.activeLeave(data, { subtype: '维度穿越' }).ok, false);
assert.equal(JSON.stringify(data), beforeMissing);
modules['cryptLord.battleActiveLeave'] = manager;

// Off-field continuous effects still tick once per action round; original origin-return triggers terrain.
data = phase(start()); b = data.cryptLord.teamBattle;
b.units[0].effects.push({ name: '持续毒伤', type: 'poison', stat: '当前活力',
  valueType: 'fixed', power: 7, duration: 2, triggerTiming: 'turn_start',
  priority: 0, skillEffect: true });
data = act(data, { subtype: '维度穿越' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[0].hp, 9993);
const beforeReadEffect = JSON.stringify(data);
engine.get(data); manager.options(b, b.units[0], data);
assert.equal(JSON.stringify(data), beforeReadEffect);
data = engine.advanceAuto(data).data;
data = act(data, { mode: 'stay' }); b = data.cryptLord.teamBattle;
assert.equal(b.units[0].hp, 9986);
assert.equal(b.units[0].effects.some(row => row.name === '持续毒伤'), false);
data = engine.advanceAuto(data).data; b = data.cryptLord.teamBattle;
const origin = b.activeLeave.processes[0];
b.terrain.push({ x: origin.originX, y: origin.originY, id: 'fireSurface', name: '火面', rank: 4 });
data = act(data, { mode: 'return' }); b = data.cryptLord.teamBattle;
assert.ok(b.units[0].hp < 9986);
assert.ok(b.log.some(row => /火面/u.test(row.message)));
console.log('PASS: original active-leave qualification, entry/maintenance/return, rivals, NPC ownership/occupancy and native lifecycle.');
