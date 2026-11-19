import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = {
  console, structuredClone, Date, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
  } },
};
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags', 'battle-terrain-presets',
  'natural-environment', 'savant-material', 'savant-enhancement', 'weapon-classifier',
  'npc-weapon-assigner', 'battlefield-painter', 'personal-battle-state', 'team-battle-state']) {
  vm.runInNewContext(await readFile(
    path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'), context);
}
const battle = modules['cryptLord.teamBattleState'];
const card = (hp, agility, skill = false) => ({
  当前序列: '序列9', 活力: hp, 当前活力: hp,
  灵性: 20, 当前灵性: 20, 敏捷: agility, 当前敏捷: agility,
  ...(skill ? { 序列能力列表: { 一: [
    { 名称: '治疗', healAmt: 8, 灵性消耗: 3, range: 2 },
    { 名称: '远击', power: 15, 灵性消耗: 4, range: 'global' },
  ] } } : {}),
});
const initial = () => ({
  stat_data: { ...card(50, 30, true), 名称: '测试者' },
  npc_data: { 盟友: card(35, 20), 敌甲: card(30, 25), 敌乙: card(30, 15) },
});
const input = initial();
assert.equal(battle.start(input, { allies: ['盟友'], enemies: ['敌甲', '敌乙'] }).ok, true);
assert.equal(input.cryptLord, undefined);
assert.equal(battle.start(input, { allies: ['盟友'], enemies: ['盟友'] }).ok, false);
assert.equal(battle.start(input, { enemies: ['$meta'] }).ok, false);
assert.equal(battle.start(input, { enemies: ['player'] }).ok, false);
assert.equal(battle.roster(input).length, 3);
let data = battle.start(input, { allies: ['盟友'], enemies: ['敌甲', '敌乙'] }).data;
assert.equal(data.cryptLord.teamBattle.units.length, 4);
assert.equal(data.cryptLord.teamBattle.queue.join(','), 'player,敌甲,盟友,敌乙');
const invalid = battle.action(data, { id: 'skill:一:1', target: '不存在' });
assert.equal(invalid.ok, false);
assert.equal(data.stat_data.当前灵性, 20);
assert.equal(battle.options(data).find(item => item.name === '远击').targets.length, 2);
const first = battle.action(data, { id: 'skill:一:1', target: '敌甲' });
assert.equal(first.ok, true);
data = battle.advanceAuto(first.data).data;
assert.equal(data.cryptLord.teamBattle.phase, 'tactic');
assert.equal(data.cryptLord.teamBattle.units.find(unit => unit.id === '敌甲').hp, 15);
assert.equal(data.stat_data.当前灵性, 16);
assert.equal(battle.tactic(data, 'not-migrated').ok, false);
data = battle.tactic(data).data;
assert.equal(data.cryptLord.teamBattle.round, 2);
assert.equal(battle.get(data).units.length, 4);
assert.equal(battle.get(data).queue[0], 'player');
const wrongCell = battle.action(data, { type: 'move', x: 12, y: 0 });
assert.equal(wrongCell.ok, false);
const landing = battle.reachable(data).find(cell => cell.x === 1 && cell.y === 8);
assert.ok(landing);
const moved = battle.action(data, { type: 'move', ...landing });
assert.equal(moved.ok, true);
assert.equal(battle.action(moved.data, { type: 'move', x: 0, y: 3 }).ok, false);
data = moved.data;
for (let round = 0; round < 20 && data.cryptLord.teamBattle.status === 'active'; round++) {
  const current = battle.get(data);
  if (current.phase === 'tactic') data = battle.tactic(data).data;
  else {
    const actor = current.queue[current.index];
    if (actor !== 'player') data = battle.advanceAuto(data).data;
    else {
      const target = current.units.find(unit => unit.side === 'enemy' && unit.hp > 0);
      data = battle.action(data, { id: 'skill:一:1', target: target.id }).data;
      data = battle.advanceAuto(data).data;
    }
  }
}
assert.equal(data.cryptLord.teamBattle.status, 'finished');
assert.equal(data.cryptLord.teamBattle.result, 'victory');
assert.ok(battle.report(data).experience.pool > 0);
assert.equal(battle.start(data, { enemies: ['敌甲'] }).ok, false);
const before = structuredClone(data);
assert.equal(battle.settle(data, 'wrong', true).ok, false);
assert.deepEqual(data, before);
const settled = battle.settle(data, data.cryptLord.teamBattle.id, true);
assert.equal(settled.ok, true);
assert.equal(settled.data.npc_data.敌甲.当前活力, 0);
assert.equal(settled.data.npc_data.敌乙.当前活力, 0);
assert.ok(settled.data.stat_data.$战斗经验 > 0);
assert.equal(battle.settle(settled.data, data.cryptLord.teamBattle.id, true).ok, false);
assert.equal(battle.start(settled.data, { enemies: ['盟友'] }).ok, true);
const changed = structuredClone(data);
changed.npc_data.敌甲.当前活力 = 1;
assert.match(battle.settle(changed, changed.cryptLord.teamBattle.id, true).error, /已变化/);
assert.equal(battle.settle(changed, changed.cryptLord.teamBattle.id, false).ok, true);
const defeated = structuredClone(input);
defeated.stat_data.当前活力 = 1;
const defeatStart = battle.start(defeated, { enemies: ['敌甲'] }).data;
defeatStart.cryptLord.teamBattle.units[0].x = 0;
defeatStart.cryptLord.teamBattle.units[0].y = 1;
const defeatTurn = battle.action(defeatStart, { type: 'wait' });
const defeatedResult = battle.advanceAuto(defeatTurn.data);
assert.equal(defeatedResult.battle.result, 'defeat');
assert.equal(battle.report(defeatedResult.data).experience.pool, 0);
const tacticalInput = initial();
tacticalInput.stat_data.理智 = tacticalInput.stat_data.当前理智 = 100;
tacticalInput.npc_data.盟友.理智 = tacticalInput.npc_data.盟友.当前理智 = 100;
tacticalInput.npc_data.盟友.能力清单 = [{ 名称: '烛火', 描述: '制造火焰' }];
tacticalInput.npc_data.敌甲.理智 = tacticalInput.npc_data.敌甲.当前理智 = 100;
tacticalInput.npc_data.敌甲.能力清单 = [{ 名称: '侵蚀', 描述: '使目标虚弱' }];
let tactical = battle.start(tacticalInput, { allies: ['盟友'], enemies: ['敌甲'] }).data;
tactical = battle.action(tactical, { type: 'wait' }).data;
tactical = battle.advanceAuto(tactical).data;
assert.equal(tactical.cryptLord.teamBattle.phase, 'tactic');
const prompt = battle.tacticPrompt(tactical, { action: '待命' });
assert.match(prompt.rules, /能力盘点/);
assert.match(prompt.situation, /侵蚀/);
const plan = battle.parsePlan('```json\n{"玩家审计":null,"NPC行动":[' +
  '{"角色":"盟友","行动":"改变地形","依据能力":"烛火","笔刷":' +
  '[{"形状":"cells","格子":[[1,6]],"地形":"fireSurface","存在回合":3}]},' +
  '{"角色":"敌甲","行动":"对角色使用战术","依据能力":"侵蚀",' +
  '"战术方案":{"目标":"player","类别":"持续伤害","档位":"克制目标",' +
  '"目标属性":"当前活力","效果名":"侵蚀"}}]}\n```');
assert.ok(plan);
const invalidPlan = structuredClone(plan);
invalidPlan.NPC行动.pop();
assert.equal(battle.tactic(tactical, { plan: invalidPlan }).ok, false);
const invalidAbility = structuredClone(plan);
invalidAbility.NPC行动[0].依据能力 = '虚构';
assert.equal(battle.tactic(tactical, { plan: invalidAbility }).ok, false);
const invalidBrush = structuredClone(plan);
invalidBrush.NPC行动[0].笔刷[0].格子 = [[1, 6], [5, 6]];
assert.equal(battle.tactic(tactical, { plan: invalidBrush }).ok, false);
assert.equal(tactical.stat_data.当前活力, 50);
const resolved = battle.tactic(tactical, { declaration: { action: '待命' }, plan }, () => .5);
assert.equal(resolved.ok, true);
assert.equal(resolved.data.cryptLord.teamBattle.terrain[0].id, 'fireSurface');
assert.equal(resolved.data.cryptLord.teamBattle.units[0].hp, 48);
assert.equal(resolved.data.cryptLord.teamBattle.units[0].effects[0].duration, 2);
assert.equal(resolved.data.cryptLord.teamBattle.units.find(unit => unit.id === '敌甲').sanity, 95);
assert.equal(resolved.data.stat_data.当前活力, 48);
assert.equal(tactical.stat_data.当前活力, 50);
const areaInput = initial();
areaInput.stat_data.序列能力列表.一.push({
  名称: '群体轰击', power: 12, range: 'global',
  targetType: 'allEnemies', aoeRadius: 2, 灵性消耗: 5,
});
const areaStart = battle.start(areaInput, { enemies: ['敌甲', '敌乙'] }).data;
const areaChoice = battle.options(areaStart).find(row => row.name === '群体轰击');
assert.deepEqual(Array.from(areaChoice.targets), ['敌甲', '敌乙']);
const areaResult = battle.action(areaStart, { id: areaChoice.id, target: '敌甲' });
assert.equal(areaResult.ok, true);
assert.equal(areaResult.data.cryptLord.teamBattle.units.find(row => row.id === '敌甲').hp, 18);
assert.equal(areaResult.data.cryptLord.teamBattle.units.find(row => row.id === '敌乙').hp, 18);
assert.equal(areaResult.data.cryptLord.teamBattle.units[0].damage, 24);
assert.equal(areaResult.data.stat_data.当前灵性, 15);
const terrainBase = structuredClone(tactical);
const playerBrush = { 形状: 'cells', 格子: [[1, 8], [2, 8]], 地形: 'fireSurface' };
const terrainPlan = { 玩家审计: { 可行: true, 依据能力: '远击',
  存在回合: 3, 笔刷: [{ 形状: 'cells', 格子: [[9, 9]], 地形: 'lavaSurface' }] },
NPC行动: [
  { 角色: '盟友', 行动: '待命' },
  { 角色: '敌甲', 行动: '待命' },
] };
const declared = { action: '改变地形', means: '远击制造火焰', brush: playerBrush };
const painted = battle.tactic(terrainBase, { declaration: declared, plan: terrainPlan });
assert.equal(painted.ok, true);
assert.deepEqual(painted.data.cryptLord.teamBattle.terrain.map(tile => [tile.x, tile.y]),
  [[1, 8], [2, 8]]);
assert.equal(painted.data.cryptLord.teamBattle.terrain[0].duration, 2);
assert.equal(painted.data.stat_data.当前理智, 95);
assert.equal(terrainBase.stat_data.当前理智, 100);
const contested = structuredClone(terrainPlan);
contested.NPC行动[0] = { 角色: '盟友', 行动: '对角色使用战术',
  依据能力: '烛火', 战术方案: { 目标: '盟友', 类别: '攻击力加强',
    档位: '相性良好', 效果名: '火势' } };
contested.NPC行动[1] = { 角色: '敌甲', 行动: '对角色使用战术',
  依据能力: '侵蚀', 战术方案: { 目标: '敌甲', 类别: '攻击力加强',
    档位: '相性良好', 效果名: '侵蚀' } };
const equalSides = structuredClone(terrainBase);
equalSides.cryptLord.teamBattle.units.find(unit => unit.id === '盟友').sanity = 0;
const blocked = battle.tactic(equalSides, { declaration: declared, plan: contested });
assert.equal(blocked.ok, true);
assert.equal(blocked.data.cryptLord.teamBattle.terrain.length, 0);
assert.equal(blocked.data.stat_data.当前理智, 95);
const rejected = structuredClone(terrainPlan);
rejected.玩家审计 = { 可行: false, 理由: '能力描述不支持造火' };
const rejectedResult = battle.tactic(terrainBase, { declaration: declared, plan: rejected });
assert.equal(rejectedResult.ok, true);
assert.equal(rejectedResult.data.cryptLord.teamBattle.terrain.length, 0);
assert.equal(rejectedResult.data.stat_data.当前理智, 95);
assert.ok(rejectedResult.battle.log.some(entry => entry.message.includes('能力描述不支持造火')));
const clearBase = structuredClone(terrainBase);
clearBase.cryptLord.teamBattle.terrain = [
  { x: 1, y: 8, id: 'fireSurface', name: '火焰地表', duration: 3 },
  { x: 2, y: 8, id: 'poisonSurface', name: '毒液地表', duration: 3 },
];
const clearResult = battle.tactic(clearBase, { declaration: { ...declared,
  brush: { 形状: 'cells', 格子: [[1, 8], [2, 8]], 清除: ['火焰地表'] } }, plan: terrainPlan });
assert.equal(clearResult.ok, true);
assert.equal(clearResult.data.cryptLord.teamBattle.terrain.length, 1);
assert.equal(clearResult.data.cryptLord.teamBattle.terrain[0].name, '毒液地表');
const passablePlan = structuredClone(terrainPlan);
passablePlan.玩家审计 = { 可行: true, 依据能力: '远击',
  通行地形: { 分级: 2, 图标: 'rock' } };
const madePassable = battle.tactic(terrainBase, { declaration: {
  ...declared, brush: { 形状: 'cells', 格子: [[1, 8]], 名称: '碎石' },
}, plan: passablePlan });
assert.equal(madePassable.ok, true);
assert.equal(madePassable.data.cryptLord.teamBattle.terrain[0].tier, 2);
assert.equal(madePassable.data.cryptLord.teamBattle.terrain[0].duration, null);
const passable = structuredClone(painted.data);
passable.cryptLord.teamBattle.terrain = [{ x: 1, y: 8, id: null,
  name: '碎石', tier: 2, duration: null }];
assert.equal(battle.reachable(passable).some(cell => cell.x === 1 && cell.y === 8), true);
passable.cryptLord.teamBattle.terrain[0].tier = 3;
assert.equal(battle.reachable(passable).some(cell => cell.x === 1 && cell.y === 8), false);
const tacticalPlan = (target, category, tier, stat = null) => ({
  玩家审计: { 可行: true, 依据能力: '远击',
    战术方案: { 目标: target, 类别: category, 档位: tier,
      目标属性: stat, 效果名: `${category}-${tier}` } },
  NPC行动: [
    { 角色: '盟友', 行动: '待命' },
    { 角色: '敌甲', 行动: '待命' },
  ],
});
const tacticRequest = target => ({
  action: '对角色使用战术', target, means: '使用远击施加效果',
});
const won = battle.tactic(tactical, {
  declaration: tacticRequest('敌甲'),
  plan: tacticalPlan('敌甲', '持续伤害', '克制目标', '当前活力'),
}, () => .5);
assert.equal(won.ok, true);
assert.equal(won.battle.lastTactic.outcomes[0].outcome, 'applied');
assert.deepEqual(Array.from(Object.values(won.battle.lastTactic.outcomes[0].roll)),
  [true, 114, 100]);
assert.equal(won.battle.units.find(unit => unit.id === '敌甲').hp, 29);
assert.equal(won.battle.units.find(unit => unit.id === '敌甲').effects[0].duration, 2);
const lost = battle.tactic(tactical, {
  declaration: tacticRequest('敌甲'),
  plan: tacticalPlan('敌甲', '持续伤害', '被目标反向克制', '当前活力'),
}, () => .5);
assert.equal(lost.battle.lastTactic.outcomes[0].outcome, 'resisted');
assert.equal(lost.battle.units.find(unit => unit.id === '敌甲').effects.length, 0);
assert.equal(lost.data.stat_data.当前理智, 95);
const friendlyPlan = tier => tacticalPlan('player', '攻击力加强', tier);
const firstBuff = battle.tactic(tactical, {
  declaration: tacticRequest('player'),
  plan: friendlyPlan('相性不佳'),
}, () => 0);
assert.equal(firstBuff.battle.lastTactic.outcomes[0].outcome, 'applied');
assert.equal(firstBuff.battle.units[0].effects[0].power, 10);
const repeatTurn = structuredClone(firstBuff.data);
repeatTurn.cryptLord.teamBattle.phase = 'tactic';
const stronger = battle.tactic(repeatTurn, {
  declaration: tacticRequest('player'),
  plan: friendlyPlan('相性良好'),
}, () => 1);
assert.equal(stronger.battle.lastTactic.outcomes[0].outcome, 'applied');
assert.equal(stronger.battle.units[0].effects.length, 1);
assert.equal(stronger.battle.units[0].effects[0].power, 20);
const anotherTurn = structuredClone(stronger.data);
anotherTurn.cryptLord.teamBattle.phase = 'tactic';
const weaker = battle.tactic(anotherTurn, {
  declaration: tacticRequest('player'),
  plan: friendlyPlan('相性不佳'),
}, () => .5);
assert.equal(weaker.battle.lastTactic.outcomes[0].outcome, 'weaker');
assert.equal(weaker.battle.units[0].effects[0].power, 20);
const ticking = structuredClone(won.data);
for (let remaining = 1; remaining >= 0; remaining--) {
  ticking.cryptLord.teamBattle.phase = 'tactic';
  const step = battle.tactic(ticking, 'skip');
  Object.assign(ticking, step.data);
  assert.equal(step.battle.units.find(unit => unit.id === '敌甲').effects[0]?.duration ?? 0,
    remaining);
}
assert.equal(ticking.cryptLord.teamBattle.units.find(unit => unit.id === '敌甲').hp, 27);
context.GameDBManager = { DB: { consumableConfig: {
  avgAttrByRank: { '9': { 理智: 200 } },
} } };
const priced = battle.tactic(tactical, {
  declaration: tacticRequest('player'),
  plan: friendlyPlan('相性良好'),
}, () => .5);
assert.equal(priced.data.stat_data.当前理智, 90);
delete context.GameDBManager;
const exhausted = structuredClone(tactical);
exhausted.cryptLord.teamBattle.units[0].sanity = 0;
const noAction = battle.tactic(exhausted, {
  declaration: tacticRequest('player'),
  plan: friendlyPlan('相性良好'),
}, () => .5);
assert.equal(noAction.ok, true);
assert.equal(noAction.battle.units[0].effects.length, 0);
assert.equal(noAction.data.stat_data.当前理智, 0);

const controlledInput = initial();
controlledInput.stat_data.当前序列 = '序列6-学徒';
controlledInput.stat_data.灵性 = controlledInput.stat_data.当前灵性 = 400;
controlledInput.npc_data.敌甲.序列能力列表 = { 一: [
  { 名称: '火球', power: 12, range: 'global' },
  { 名称: '冰锥', power: 9, range: 'global' },
  { 名称: '预知', 描述: '预知对手行动' },
] };
controlledInput.npc_data.敌甲.当前序列 = '序列6-偷盗者';
controlledInput.npc_data.敌甲.灵性 = controlledInput.npc_data.敌甲.当前灵性 = 300;
controlledInput.npc_data.盟友.序列能力列表 = { 一: [
  { 名称: '护盾', healAmt: 5, range: 'global' },
] };
const eligibility = battle.skillControlEligibility(controlledInput.stat_data);
assert.equal(eligibility.复制, '记录');
assert.deepEqual(Object.keys(battle.skillControlEligibility(card(30, 10))), []);
assert.deepEqual(Object.keys(battle.skillControlEligibility({
  当前序列: '序列5-流浪汉/序列6-学徒',
})).sort(), ['偷窃', '复制', '禁止']);
const controlBase = battle.start(controlledInput, { allies: ['盟友'], enemies: ['敌甲'] }).data;
controlBase.cryptLord.teamBattle.phase = 'tactic';
assert.equal(battle.skillControlOptions(controlBase).targets.find(row => row.id === '敌甲').skills.length, 3);
const snapshot = structuredClone(controlBase);
assert.equal(battle.skillControl(controlBase, { mode: '禁止', target: '敌甲', skill: '火球' }).ok, false);
assert.equal(battle.skillControl(controlBase, { mode: '复制', target: 'player', skill: '远击' }).ok, false);
assert.equal(JSON.stringify(controlBase), JSON.stringify(snapshot));
const copied = battle.skillControl(controlBase, {
  mode: '复制', target: '敌甲', skill: '火球',
}, () => .5);
assert.equal(copied.ok, true);
assert.equal(copied.battle.lastTactic.outcomes[0].outcome, 'applied');
assert.equal(copied.battle.units[0].skillControl.granted[0].name, '火球');
assert.equal(copied.battle.units.find(row => row.id === '敌甲').skillControl, undefined);
const copiedTurn = structuredClone(copied.data);
copiedTurn.cryptLord.teamBattle.queue = ['player'];
copiedTurn.cryptLord.teamBattle.index = 0;
assert.ok(battle.options(copiedTurn).some(row => row.id === 'granted:0' && row.name === '火球'));
assert.equal(JSON.stringify(controlBase), JSON.stringify(snapshot));

const bannedBase = structuredClone(controlBase);
bannedBase.stat_data.当前序列 = '序列6-仲裁人';
bannedBase.cryptLord.teamBattle.units.find(row => row.id === '敌甲').spirit = 0;
const banned = battle.skillControl(bannedBase, {
  mode: '禁止', target: '敌甲', skill: '火球',
}, () => .5);
assert.equal(banned.battle.lastTactic.outcomes[0].outcome, 'applied');
assert.equal(banned.battle.units.find(row => row.id === '敌甲').skillControl.banned[0].until, 3);
const banTurn = structuredClone(banned.data);
banTurn.cryptLord.teamBattle.queue = ['敌甲'];
banTurn.cryptLord.teamBattle.index = 0;
assert.equal(battle.options(banTurn).some(row => row.name === '火球'), false);
banTurn.cryptLord.teamBattle.phase = 'tactic';
const refreshed = battle.skillControl(banTurn, {
  mode: '禁止', target: '敌甲', skill: '火球',
}, () => .5);
assert.equal(refreshed.battle.units.find(row => row.id === '敌甲').skillControl.banned.length, 1);
assert.equal(refreshed.battle.units.find(row => row.id === '敌甲').skillControl.banned[0].until, 4);
let expiry = structuredClone(refreshed.data);
for (let i = 0; i < 2; i++) {
  expiry.cryptLord.teamBattle.phase = 'tactic';
  expiry = battle.tactic(expiry, 'skip', () => 1).data;
}
assert.equal(expiry.cryptLord.teamBattle.units.find(row => row.id === '敌甲').skillControl.banned.length, 0);
let grantExpiry = structuredClone(copied.data);
for (let i = 0; i < 2; i++) {
  grantExpiry.cryptLord.teamBattle.phase = 'tactic';
  grantExpiry = battle.tactic(grantExpiry, 'skip', () => 1).data;
}
assert.equal(grantExpiry.cryptLord.teamBattle.units[0].skillControl.granted.length, 0);
const single = structuredClone(bannedBase);
single.npc_data.敌甲.序列能力列表.一.splice(1);
const last = battle.skillControl(single, {
  mode: '禁止', target: '敌甲', skill: '火球',
}, () => .5);
assert.equal(last.battle.lastTactic.outcomes[0].last, true);
assert.equal(last.battle.lastTactic.outcomes[0].scores.defender, 90);
const lowSpirit = structuredClone(bannedBase);
lowSpirit.cryptLord.teamBattle.units[0].spirit = 0;
assert.equal(battle.skillControl(lowSpirit, {
  mode: '禁止', target: '敌甲', skill: '火球',
}).ok, false);
assert.equal(lowSpirit.cryptLord.teamBattle.units[0].spirit, 0);
const stolen = structuredClone(bannedBase);
stolen.stat_data.当前序列 = '序列6-偷盗者';
const theft = battle.skillControl(stolen, {
  mode: '偷窃', target: '敌甲', skill: '冰锥',
}, () => .5);
assert.equal(theft.battle.units[0].skillControl.granted[0].name, '冰锥');
assert.equal(theft.battle.units.find(row => row.id === '敌甲').skillControl.banned[0].name, '冰锥');
const npcBase = structuredClone(controlBase);
npcBase.stat_data.当前序列 = '序列9';
npcBase.cryptLord.teamBattle.units[0].spirit = 500;
npcBase.cryptLord.teamBattle.units.find(row => row.id === '敌甲').spirit = 300;
const npcSnapshot = structuredClone(npcBase);
const npcStep = battle.tactic(npcBase, 'skip', () => 0);
assert.equal(npcStep.battle.lastTactic.outcomes[0].mode, '偷窃');
assert.equal(npcStep.battle.lastTactic.outcomes[0].target, '盟友');
assert.equal(npcStep.battle.units.find(row => row.id === '盟友').skillControl.banned[0].name, '护盾');
const npcMiss = battle.tactic(npcBase, 'skip', () => 1);
assert.equal(npcMiss.battle.lastTactic.outcomes.length, 0);
assert.deepEqual(npcBase, npcSnapshot);
const npcPlan = structuredClone(npcBase);
npcPlan.npc_data.敌甲.能力清单 = [{ 名称: '侵蚀', 描述: '降低目标活力' }];
npcPlan.cryptLord.teamBattle.units.find(row => row.id === '敌甲').sanity = 100;
npcPlan.cryptLord.teamBattle.units.find(row => row.id === '敌甲').maxSanity = 100;
const overlapped = battle.tactic(npcPlan, {
  declaration: { action: '待命' },
  plan: { 玩家审计: null, NPC行动: [
    { 角色: '盟友', 行动: '待命' },
    { 角色: '敌甲', 行动: '对角色使用战术', 依据能力: '侵蚀',
      战术方案: { 目标: '盟友', 类别: '持续伤害', 档位: '克制目标',
        目标属性: '当前活力', 效果名: '侵蚀' } },
  ] },
}, () => 0);
assert.equal(overlapped.ok, true);
assert.equal(overlapped.battle.lastTactic.outcomes.length, 1);
assert.equal(overlapped.battle.lastTactic.outcomes[0].mode, '偷窃');
assert.equal(overlapped.battle.units.find(row => row.id === '敌甲').sanity, 100);
assert.equal(overlapped.battle.units.find(row => row.id === '盟友').effects.length, 0);
const props = battle.parseProps([
  { 名称: '货箱', 描述: 'a'.repeat(45), 数量: 3.9 },
  { 名称: '货箱', 数量: 100 }, { 名称: '不存在', 数量: -1 },
  { 名称: '油灯', 描述: '窗边', 数量: 1 },
]);
assert.equal(props.length, 2);
assert.equal(props[0].数量, 3);
assert.equal(props[0].初始数量, 3);
assert.equal(props[0].描述.length, 40);
const painter = modules['cryptLord.battlefieldPainter'];
assert.equal(painter.parse('```json\n{"可互动物品":[{"名称":"门锁","数量":2}]}\n```')
  .可互动物品[0].名称, '门锁');
assert.equal(painter.parse('not-json'), null);
assert.match(painter.prompt(12, 10, '废弃仓库').user, /废弃仓库/);
const propsStart = battle.start(tacticalInput, {
  allies: ['盟友'], enemies: ['敌甲'], props,
}).data;
assert.equal(propsStart.cryptLord.teamBattle.props[0].数量, 3);
const propsBase = structuredClone(tactical);
propsBase.cryptLord.teamBattle.props = structuredClone(props);
const propsSnapshot = structuredClone(propsBase);
assert.match(battle.tacticPrompt(propsBase).situation, /货箱/);
const propsPlan = structuredClone(terrainPlan);
propsPlan.玩家审计.物品消耗 = [
  { 名称: '货箱', 数量: 10 }, { 名称: '货箱', 数量: 2 },
  { 名称: '场外造物', 数量: 99 }, { 名称: '油灯', 数量: 0 },
];
const propSuccess = battle.tactic(propsBase, {
  declaration: declared, plan: propsPlan,
});
assert.equal(propSuccess.ok, true);
assert.equal(propSuccess.battle.props[0].数量, 0);
assert.equal(propSuccess.battle.props[1].数量, 1);
assert.equal(propSuccess.battle.lastTactic.outcomes.find(row => row.outcome === 'terrain').spent[0],
  '货箱 ×3');
assert.equal(JSON.stringify(propsBase), JSON.stringify(propsSnapshot));
const propRejected = structuredClone(propsPlan);
propRejected.玩家审计.可行 = false;
assert.equal(battle.tactic(propsBase, {
  declaration: declared, plan: propRejected,
}).battle.props[0].数量, 3);
const blockedProps = structuredClone(propsBase);
blockedProps.cryptLord.teamBattle.units.find(row => row.id === '盟友').sanity = 0;
const blockedPlan = structuredClone(contested);
blockedPlan.玩家审计.物品消耗 = [{ 名称: '货箱', 数量: 2 }];
assert.equal(battle.tactic(blockedProps, {
  declaration: declared, plan: blockedPlan,
}).battle.props[0].数量, 3);
const propTactic = structuredClone(propsBase);
const effectPlanWithProps = tacticalPlan('敌甲', '持续伤害', '克制目标', '当前活力');
effectPlanWithProps.玩家审计.物品消耗 = [{ 名称: '油灯', 数量: 1 }];
const propApplied = battle.tactic(propTactic, {
  declaration: tacticRequest('敌甲'), plan: effectPlanWithProps,
}, () => .5);
assert.equal(propApplied.battle.props[1].数量, 0);
assert.equal(propApplied.battle.lastTactic.outcomes.find(row => row.outcome === 'applied').spent[0],
  '油灯 ×1');
effectPlanWithProps.玩家审计.战术方案.档位 = '被目标反向克制';
assert.equal(battle.tactic(propTactic, {
  declaration: tacticRequest('敌甲'), plan: effectPlanWithProps,
}, () => .5).battle.props[1].数量, 1);
const npcPropPlan = structuredClone(plan);
npcPropPlan.NPC行动[0].物品消耗 = [{ 名称: '货箱', 数量: 2 }];
npcPropPlan.NPC行动[1].物品消耗 = [{ 名称: '货箱', 数量: 2 }];
const npcProps = battle.tactic(propsBase, { declaration: { action: '待命' },
  plan: npcPropPlan }, () => .5);
assert.equal(npcProps.ok, true);
assert.equal(npcProps.battle.props[0].数量, 0);
assert.equal(npcProps.battle.lastTactic.outcomes.find(row => row.outcome === 'terrain').spent[0],
  '货箱 ×2');
assert.equal(npcProps.battle.lastTactic.outcomes.find(row => row.outcome === 'applied').spent[0],
  '货箱 ×1');
const openingInput = initial();
openingInput.stat_data.当前序列 = '序列6-水手';
const opening = {
  场景: '港口仓库', 基底: { 名称: '石板路', 分级: 1 },
  自然环境: { 地貌: '海洋', 天气: '暴风雨', 时间: '乱时辰' },
  可互动物品: [{ 名称: '缆绳', 数量: 3 }],
  笔刷: [
    { 形状: 'rect', x: 0, y: 0, w: 12, h: 1, 地形: 'lavaSurface' },
    { 形状: 'cells', 格子: [[4, 4]], 地形: 'fireSurface', 存在回合: 3 },
    { 形状: 'line', x1: 0, y1: 4, x2: 11, y2: 4, 名称: '高墙', 分级: 4 },
    { 形状: 'cells', 格子: [[5, 5]], 地形: 'fakeHazard' },
    { 形状: 'cells', 格子: [[6, 5]], 名称: '碎石', 分级: 2 },
  ],
  初始站位: [
    { 编号: 'player', x: 1, y: 8 },
    { 编号: '敌甲', x: 10, y: 1 },
  ],
};
const opened = battle.start(openingInput, { enemies: ['敌甲'], opening });
assert.equal(opened.ok, true);
assert.equal(opened.battle.scene, '港口仓库');
assert.equal(opened.battle.board.base.tier, 1);
assert.equal(opened.battle.props[0].名称, '缆绳');
assert.equal(opened.battle.naturalEnv.地貌, '海洋');
assert.equal(opened.battle.naturalEnv.时间, null);
assert.equal(opened.battle.terrain.length, 2);
assert.equal(opened.battle.terrain.some(tile => tile.name === '高墙'), false);
assert.equal(opened.battle.units[0].x, 1);
assert.equal(opened.battle.units[0].y, 8);
assert.ok(opened.battle.units[0].effects.some(effect => effect.environment));
assert.ok(opened.battle.units[0].envMoveBonus > 0);
const openingSnapshot = structuredClone(openingInput);
assert.equal(openingInput.cryptLord, undefined);
const invalidPosition = structuredClone(opening);
invalidPosition.初始站位[0] = { 编号: 'player', x: 4, y: 4 };
const rejectedPosition = battle.start(openingInput, {
  enemies: ['敌甲'], opening: invalidPosition,
});
assert.equal(rejectedPosition.battle.units[0].x, 0);
assert.equal(rejectedPosition.battle.units[0].y, 9);
const hazardCap = structuredClone(opening);
hazardCap.笔刷 = [
  { 形状: 'rect', x: 0, y: 2, w: 6, h: 1, 地形: 'fireSurface' },
  { 形状: 'rect', x: 0, y: 3, w: 6, h: 1, 地形: 'poisonSurface' },
  { 形状: 'rect', x: 0, y: 4, w: 6, h: 1, 地形: 'smokeCloud' },
  { 形状: 'cells', 格子: [[7, 4]], 地形: 'rockfall' },
  { 形状: 'cells', 格子: [[8, 4]], 地形: 'fireSurface' },
];
const capped = battle.start(openingInput, { enemies: ['敌甲'], opening: hazardCap });
assert.equal(capped.battle.terrain.length, 18);
assert.equal(capped.battle.terrain.some(tile => tile.id === 'rockfall'), false);
assert.equal(capped.battle.terrain.some(tile => tile.x === 8 && tile.y === 4), false);
const openingRound = structuredClone(opened.data);
openingRound.cryptLord.teamBattle.phase = 'tactic';
const progressedOpening = battle.tactic(openingRound, 'skip');
assert.equal(progressedOpening.battle.terrain.find(tile => tile.id === 'fireSurface').duration, 2);
assert.ok(progressedOpening.battle.units[0].effects.some(effect => effect.environment));
assert.equal(JSON.stringify(openingInput), JSON.stringify(openingSnapshot));
const armedInput = initial();
armedInput.stat_data.武器列表 = {
  枪: { 名称: '左轮', 序列: '普通', 描述: '转轮手枪', isEquipped: true },
};
armedInput.npc_data.敌甲 = { ...card(900, 20), 当前序列: '普通人', 身份: '巡警' };
armedInput.npc_data.敌乙 = { ...card(900, 15), 当前序列: '普通人', 身份: '工人' };
const armedSnapshot = JSON.stringify(armedInput);
const armedPlan = {
  武器分类: [{ 名称: '左轮', 威力量级: '手枪级', 精度: '手枪级',
    射程: '中距离', AOE: '无AOE' }],
  NPC武器: [{ 角色: '敌甲', 类别: '长管步枪', 称呼: '警用步枪' }],
};
const armed = battle.start(armedInput, { enemies: ['敌甲', '敌乙'], opening: armedPlan });
assert.equal(armed.ok, true);
assert.equal(JSON.stringify(armedInput), armedSnapshot);
assert.equal(armed.data.stat_data.武器列表.枪.$战斗分类.威力量级, '手枪级');
assert.equal(armed.battle.units.find(row => row.id === '敌甲').fallbackWeapon.显示名, '警用步枪');
assert.equal(armed.battle.units.find(row => row.id === '敌乙').fallbackWeapon.名称, '单手钝器');
assert.equal(armed.data.npc_data.敌甲.武器列表, undefined);
assert.equal(battle.options(armed.data).find(row => row.id === 'weapon:枪').targets.length, 0);
const nearby = structuredClone(armed.data);
nearby.cryptLord.teamBattle.units[0].x = 0;
nearby.cryptLord.teamBattle.units[0].y = 2;
const hit = battle.action(nearby, { id: 'weapon:枪', target: '敌甲' }, () => 0);
assert.equal(hit.ok, true);
assert.equal(hit.battle.units.find(row => row.id === '敌甲').hp, 850);
assert.equal(hit.data.stat_data.当前灵性, nearby.stat_data.当前灵性);
const miss = battle.action(nearby, { id: 'weapon:枪', target: '敌甲' }, () => 1);
assert.equal(miss.battle.units.find(row => row.id === '敌甲').hp, 900);
assert.match(miss.battle.log.at(-1).message, /未命中/);
const unequipped = structuredClone(nearby);
unequipped.stat_data.武器列表.枪.isEquipped = false;
assert.equal(battle.action(unequipped, { id: 'weapon:枪', target: '敌甲' }).ok, false);
const enhancedWeapon = structuredClone(nearby);
enhancedWeapon.stat_data.武器列表.枪.$强化模块安装 = { 模块ID: 'test' };
enhancedWeapon.stat_data.$专属玩法 = { 通识者途径: { 装备强化玩法: { 模块仓库: {
  test: { id: 'test', 品质: '史诗', 安装位置: { 列表键: '武器列表', 物品键: '枪' },
    武器效果: { mundane: { up: { 射程: 1 } }, extraordinary: {} } },
} } } };
assert.equal(battle.options(enhancedWeapon).find(row => row.id === 'weapon:枪').range, 5);
assert.equal(enhancedWeapon.stat_data.武器列表.枪.$战斗分类.射程, '中距离');
const areaWeapon = structuredClone(nearby);
areaWeapon.stat_data.武器列表.枪.$战斗分类.AOE = '霰弹枪级';
assert.equal(battle.options(areaWeapon).find(row => row.id === 'weapon:枪').radius, 1);
const areaHit = battle.action(areaWeapon, { id: 'weapon:枪', target: '敌甲' }, () => 0);
assert.equal(areaHit.battle.units.find(row => row.id === '敌乙').hp, 850);
const diagonalWeapon = structuredClone(areaWeapon);
diagonalWeapon.cryptLord.teamBattle.units.find(row => row.id === '敌乙').y = 1;
const diagonalHit = battle.action(diagonalWeapon, { id: 'weapon:枪', target: '敌甲' }, () => 0);
assert.equal(diagonalHit.battle.units.find(row => row.id === '敌乙').hp, 900);
const npcTurn = structuredClone(nearby);
npcTurn.cryptLord.teamBattle.index = npcTurn.cryptLord.teamBattle.queue.indexOf('敌甲');
assert.equal(battle.autoAction(npcTurn).id, 'weapon:临时');
const npcShot = battle.action(npcTurn, battle.autoAction(npcTurn), () => 0);
assert.ok(npcShot.battle.units[0].hp < nearby.cryptLord.teamBattle.units[0].hp);
const invalidWeaponPlan = structuredClone(armedPlan);
invalidWeaponPlan.武器分类[0].精度 = '作弊级';
invalidWeaponPlan.NPC武器[0].类别 = '虚构类别';
const fallbackWeapon = battle.start(armedInput, {
  enemies: ['敌甲'], opening: invalidWeaponPlan,
});
assert.equal(fallbackWeapon.ok, true);
assert.equal(fallbackWeapon.data.stat_data.武器列表.枪.$战斗分类, undefined);
assert.equal(fallbackWeapon.battle.units.find(row => row.id === '敌甲').fallbackWeapon.名称,
  '单手钝器');
const legacyWeapon = structuredClone(nearby);
legacyWeapon.stat_data.武器列表.枪 = {
  名称: '非凡短剑', 序列: '序列6', isEquipped: true,
  战斗效果: { 基础效果: '物理攻击', 额外效果: '攻击DEBUFF', 范围: '单体' },
};
legacyWeapon.cryptLord.teamBattle.units[0].y = 1;
const legacyHit = battle.action(legacyWeapon, { id: 'weapon:枪', target: '敌甲' });
assert.equal(legacyHit.ok, true);
assert.ok(legacyHit.battle.units.find(row => row.id === '敌甲').effects
  .some(effect => effect.name === '攻击DEBUFF'));
const resourceShortage = structuredClone(legacyWeapon);
resourceShortage.cryptLord.teamBattle.units[0].spirit = 0;
assert.equal(battle.action(resourceShortage, { id: 'weapon:枪', target: '敌甲' }).ok, false);
const recoveryWeapon = structuredClone(nearby);
recoveryWeapon.stat_data.武器列表.枪 = {
  名称: '回灵杖', 序列: '序列6', isEquipped: true,
  战斗效果: { 基础效果: '灵性恢复', 范围: '全体' },
};
recoveryWeapon.cryptLord.teamBattle.units[0].spirit = 10;
const healedSpirit = battle.action(recoveryWeapon, { id: 'weapon:枪', target: 'player' });
assert.equal(healedSpirit.ok, true);
assert.ok(healedSpirit.data.stat_data.当前灵性 > 10);
assert.equal(healedSpirit.data.stat_data.当前活力, recoveryWeapon.stat_data.当前活力);
const supply = (effect, extra, quantity = 1, area = false, scroll = false) => ({
  名称: effect, 序列: '序列8', 数量: quantity, $卷轴制造: scroll,
  战斗效果: { 基础效果: effect, 额外效果: extra, 范围: area ? '全体' : '单体' },
});
const supplies = initial();
supplies.stat_data.当前序列 = '序列10';
for (const card of [supplies.stat_data, ...Object.values(supplies.npc_data)]) {
  card.理智 = card.当前理智 = 40;
}
supplies.stat_data.消耗品列表 = {
  $meta: { extensible: true },
  药剂: supply('活力恢复', '防御BUFF'),
  群体药: supply('理智恢复', '速度DEBUFF', 2, true),
  弹药: supply('物理攻击', '攻击DEBUFF', 2, true),
  卷轴: { ...supply('物理攻击', '攻击BUFF', 1, true, true),
    $卷轴增强: { 威力: 2, 射程: 3 } },
  空瓶: supply('物理攻击', '', 0),
};
const suppliesStart = battle.start(supplies, {
  allies: ['盟友'], enemies: ['敌甲', '敌乙'],
}).data;
const supplyOptions = battle.options(suppliesStart);
assert.equal(supplyOptions.filter(row => row.consumable).length, 4);
assert.equal(supplyOptions.find(row => row.id === 'consumable:药剂').quantity, 1);
assert.equal(supplyOptions.find(row => row.id === 'scroll:卷轴').range, 6);
assert.equal(supplyOptions.some(row => row.id === 'consumable:空瓶'), false);
assert.deepEqual(Array.from(supplyOptions.find(row => row.id === 'consumable:群体药').targets),
  ['player', '盟友']);
assert.equal(battle.action(suppliesStart, { id: 'scroll:弹药', target: '敌甲' }).ok, false);
const invalidSupply = structuredClone(suppliesStart);
invalidSupply.cryptLord.teamBattle.units[0].spirit = 0;
const invalidSnapshot = structuredClone(invalidSupply);
assert.equal(battle.action(invalidSupply, { id: 'scroll:卷轴', target: '敌甲' }).ok, false);
assert.deepEqual(invalidSupply, invalidSnapshot);
assert.equal(battle.action(suppliesStart, { id: 'consumable:弹药', target: '盟友' }).ok, false);
const outOfRange = structuredClone(suppliesStart);
outOfRange.stat_data.消耗品列表.卷轴.$卷轴增强.射程 = 1;
outOfRange.cryptLord.teamBattle.units[0].x = 0;
outOfRange.cryptLord.teamBattle.units[0].y = 9;
assert.equal(battle.options(outOfRange).find(row => row.id === 'scroll:卷轴').targets.length, 0);
assert.equal(battle.action(outOfRange, { id: 'scroll:卷轴', target: '敌甲' }).ok, false);
assert.equal(outOfRange.stat_data.消耗品列表.卷轴.数量, 1);
const scrollReady = structuredClone(suppliesStart);
scrollReady.cryptLord.teamBattle.units[0].x = 0;
scrollReady.cryptLord.teamBattle.units[0].y = 2;
const scrollOption = battle.options(scrollReady).find(row => row.id === 'scroll:卷轴');
assert.ok(scrollOption.power > battle.options(scrollReady)
  .find(row => row.id === 'consumable:弹药').power);
const firedScroll = battle.action(scrollReady, { id: 'scroll:卷轴', target: '敌甲' });
assert.equal(firedScroll.ok, true);
assert.equal(firedScroll.data.stat_data.消耗品列表.卷轴, undefined);
assert.ok(firedScroll.battle.units[0].effects.some(row => row.name === '攻击BUFF'));
assert.equal(scrollReady.stat_data.消耗品列表.卷轴.数量, 1);
const healStart = structuredClone(suppliesStart);
healStart.cryptLord.teamBattle.units[0].hp = 20;
healStart.cryptLord.teamBattle.units.find(row => row.id === '盟友').hp = 15;
const healedSupply = battle.action(healStart, { id: 'consumable:药剂', target: 'player' });
assert.equal(healedSupply.ok, true);
assert.equal(healedSupply.data.stat_data.消耗品列表.药剂, undefined);
assert.ok(healedSupply.battle.units[0].hp > 20);
assert.ok(healedSupply.battle.units[0].effects.some(row => row.name === '防御BUFF'));
assert.equal(battle.options(healedSupply.data).some(row => row.id === 'consumable:药剂'), false);
assert.equal(battle.action(healedSupply.data, { id: 'consumable:药剂', target: 'player' }).ok, false);
const ranged = structuredClone(suppliesStart);
ranged.cryptLord.teamBattle.units[0].x = 0;
ranged.cryptLord.teamBattle.units[0].y = 2;
const bomb = battle.action(ranged, { id: 'consumable:弹药', target: '敌甲' });
assert.equal(bomb.ok, true);
assert.equal(bomb.data.stat_data.消耗品列表.弹药.数量, 1);
assert.ok(bomb.battle.units.find(row => row.id === '敌甲').hp < 30);
assert.ok(bomb.battle.units.find(row => row.id === '敌乙').hp < 30);
assert.ok(bomb.battle.units.find(row => row.id === '敌甲').effects
  .some(row => row.name === '攻击DEBUFF'));
assert.equal(ranged.stat_data.消耗品列表.弹药.数量, 2);
const wideHeal = structuredClone(suppliesStart);
wideHeal.cryptLord.teamBattle.units[0].sanity = 1;
wideHeal.cryptLord.teamBattle.units.find(row => row.id === '盟友').sanity = 1;
const allHeal = battle.action(wideHeal, { id: 'consumable:群体药', target: 'player' });
assert.equal(allHeal.ok, true);
assert.ok(allHeal.battle.units[0].sanity > 1);
assert.ok(allHeal.battle.units.find(row => row.id === '盟友').sanity > 1);
assert.equal(allHeal.battle.units[0].effects.some(row => row.name === '速度DEBUFF'), false);
assert.ok(allHeal.battle.units.filter(row => row.side === 'enemy')
  .every(row => row.effects.some(effect => effect.name === '速度DEBUFF')));
assert.equal(allHeal.data.stat_data.消耗品列表.群体药.数量, 1);
const arraySupply = structuredClone(suppliesStart);
arraySupply.stat_data.消耗品列表 = [supply('活力恢复', '', 1)];
arraySupply.cryptLord.teamBattle.units[0].hp = 10;
const arrayResult = battle.action(arraySupply, { id: 'consumable:0', target: 'player' });
assert.equal(arrayResult.ok, true);
assert.equal(arrayResult.data.stat_data.消耗品列表.length, 0);
const depleted = structuredClone(suppliesStart);
depleted.stat_data.消耗品列表.卷轴.数量 = 0;
assert.equal(battle.action(depleted, { id: 'scroll:卷轴', target: '敌甲' }).ok, false);
const auxiliaryInput = initial();
auxiliaryInput.stat_data.灵性 = auxiliaryInput.stat_data.当前灵性 = 400;
auxiliaryInput.stat_data.辅助能力列表 = {
  $meta: { extensible: true },
  火: { 名称: '群体火光', 序列: '序列8', 数量: 0, isEquipped: false,
    战斗效果: { 基础效果: '法术攻击', 范围: '全体', 额外效果: '攻击BUFF' } },
  药: { 名称: '同伴治疗', 序列: '序列8',
    战斗效果: { 基础效果: '活力恢复', 范围: '单体', 额外效果: '防御BUFF' } },
  雾: { 名称: '群体回神', 序列: '序列8',
    战斗效果: { 基础效果: '理智恢复', 范围: '全体', 额外效果: '速度DEBUFF' } },
  空: { 名称: '未知辅助', 战斗效果: { 基础效果: '未知' } },
};
for (const unit of [auxiliaryInput.stat_data, ...Object.values(auxiliaryInput.npc_data)]) {
  unit.理智 = unit.当前理智 = 100;
}
const auxiliaryStart = battle.start(auxiliaryInput, {
  allies: ['盟友'], enemies: ['敌甲', '敌乙'],
}).data;
const ab = auxiliaryStart.cryptLord.teamBattle;
Object.assign(ab.units[0], { x: 0, y: 2 });
Object.assign(ab.units.find(row => row.id === '盟友'), { x: 1, y: 2, hp: 10, sanity: 10 });
Object.assign(ab.units.find(row => row.id === '敌乙'), { x: 10, y: 0 });
const auxChoices = battle.options(auxiliaryStart).filter(row => row.auxiliary);
assert.equal(auxChoices.length, 3);
assert.equal(auxChoices.find(row => row.id === 'auxiliary:火').radius, 2);
assert.deepEqual(Array.from(auxChoices.find(row => row.id === 'auxiliary:火').targets), ['敌甲']);
assert.equal(battle.action(auxiliaryStart, { id: 'auxiliary:火', target: '敌乙' }).ok, false);
assert.equal(battle.action(auxiliaryStart, { id: 'auxiliary:药', target: 'player' }).ok, false);
const auxSnapshot = structuredClone(auxiliaryStart);
const auxFire = battle.action(auxiliaryStart, { id: 'auxiliary:火', target: '敌甲' });
assert.equal(auxFire.ok, true);
assert.equal(auxFire.battle.units.find(row => row.id === '敌甲').hp, 26);
assert.equal(auxFire.battle.units.find(row => row.id === '敌乙').hp, 30);
assert.ok(auxFire.battle.units.filter(row => row.side === 'ally')
  .every(row => row.effects.some(effect => effect.name === '攻击BUFF')));
assert.equal(JSON.stringify(auxFire.data.stat_data.辅助能力列表),
  JSON.stringify(auxiliaryStart.stat_data.辅助能力列表));
assert.equal(auxFire.data.stat_data.当前灵性, 399);
assert.deepEqual(auxiliaryStart, auxSnapshot);
const healAlly = battle.action(auxiliaryStart, { id: 'auxiliary:药', target: '盟友' });
assert.equal(healAlly.ok, true);
assert.equal(healAlly.battle.units.find(row => row.id === '盟友').hp, 25);
assert.ok(healAlly.battle.units.find(row => row.id === '盟友').effects
  .some(row => row.name === '防御BUFF'));
assert.equal(healAlly.battle.units[0].effects.length, 0);
for (const [stat, key, max] of [
  ['活力', 'hp', 'maxHp'], ['灵性', 'spirit', 'maxSpirit'],
  ['理智', 'sanity', 'maxSanity'], ['人性', 'humanity', 'maxHumanity'],
  ['敏捷', 'agility', 'maxAgility'],
]) {
  const restore = structuredClone(auxiliaryStart);
  restore.stat_data.辅助能力列表.药.战斗效果.基础效果 = `${stat}恢复`;
  const friend = restore.cryptLord.teamBattle.units.find(row => row.id === '盟友');
  friend[key] = 1; friend[max] = 100;
  const healed = battle.action(restore, { id: 'auxiliary:药', target: '盟友' });
  assert.equal(healed.ok, true);
  assert.ok(healed.battle.units.find(row => row.id === '盟友')[key] > 1);
  assert.ok(healed.battle.log.some(row => row.message.includes(`点${stat}`)));
}
const areaRecovery = battle.action(auxiliaryStart, { id: 'auxiliary:雾', target: '盟友' });
assert.equal(areaRecovery.ok, true);
assert.equal(areaRecovery.battle.units.find(row => row.id === '盟友').sanity, 16);
assert.ok(areaRecovery.battle.units.find(row => row.id === '敌甲').effects
  .some(row => row.name === '速度DEBUFF'));
assert.equal(areaRecovery.battle.units.find(row => row.id === '敌乙').effects.length, 0);
assert.equal(areaRecovery.battle.units[0].effects.length, 0);
const repeatAux = structuredClone(auxFire.data);
repeatAux.cryptLord.teamBattle.index = 0;
assert.equal(battle.action(repeatAux, { id: 'auxiliary:火', target: '敌甲' }).ok, true);
const unavailableAux = structuredClone(auxiliaryStart);
unavailableAux.cryptLord.teamBattle.units[0].spirit = 0;
assert.equal(battle.action(unavailableAux, { id: 'auxiliary:火', target: '敌甲' }).ok, false);
assert.equal(unavailableAux.stat_data.辅助能力列表.火.数量, 0);
delete unavailableAux.stat_data.辅助能力列表.火;
assert.equal(battle.options(unavailableAux).some(row => row.id === 'auxiliary:火'), false);
const banAux = structuredClone(auxiliaryStart);
banAux.cryptLord.teamBattle.units[0].skillControl = { banned: [{ name: '群体火光', until: 3 }], granted: [] };
assert.equal(battle.options(banAux).some(row => row.id === 'auxiliary:火'), false);
const borrowAux = structuredClone(auxiliaryStart);
borrowAux.cryptLord.teamBattle.units.find(row => row.id === '敌甲').skillControl = {
  banned: [], granted: [{ name: '同伴治疗',
    ability: structuredClone(auxiliaryInput.stat_data.辅助能力列表.药), until: 3 }],
};
borrowAux.cryptLord.teamBattle.index = borrowAux.cryptLord.teamBattle.queue.indexOf('敌甲');
Object.assign(borrowAux.cryptLord.teamBattle.units.find(row => row.id === '敌乙'),
  { x: 1, y: 0, hp: 5 });
assert.equal(battle.autoAction(borrowAux).id, 'granted:0');
const npcRecovery = battle.action(borrowAux, battle.autoAction(borrowAux));
assert.equal(npcRecovery.ok, true);
assert.equal(npcRecovery.battle.units.find(row => row.id === '敌乙').hp, 20);
assert.ok(npcRecovery.battle.units.find(row => row.id === '敌乙').effects
  .some(row => row.name === '防御BUFF'));
const copyAux = structuredClone(borrowAux);
copyAux.cryptLord.teamBattle.phase = 'tactic';
copyAux.stat_data.当前序列 = '序列6-学徒';
const copiedAux = battle.skillControl(copyAux, {
  mode: '复制', target: '敌甲', skill: '同伴治疗',
}, () => .5);
assert.equal(copiedAux.ok, true);
assert.ok(battle.options(copiedAux.data).find(row => row.id === 'granted:0').auxiliary);
assert.equal(battle.action(copiedAux.data, { id: 'granted:0', target: '盟友' }).ok, true);
const playerTarget = structuredClone(auxiliaryStart);
playerTarget.cryptLord.teamBattle.phase = 'tactic';
playerTarget.stat_data.序列能力列表 = {};
playerTarget.stat_data.辅助能力列表 = { 药: auxiliaryInput.stat_data.辅助能力列表.药 };
playerTarget.npc_data.敌甲.当前序列 = '序列6-偷盗者';
Object.assign(playerTarget.cryptLord.teamBattle.units.find(row => row.id === '敌甲'),
  { spirit: 10000, maxSpirit: 10000 });
Object.assign(playerTarget.cryptLord.teamBattle.units.find(row => row.id === '盟友'), { hp: 0 });
Object.assign(playerTarget.cryptLord.teamBattle.units.find(row => row.id === '敌乙'),
  { x: 1, y: 0, hp: 5 });
const theftAuxResult = battle.tactic(playerTarget, 'skip', () => 0);
assert.ok(theftAuxResult.battle.lastTactic.outcomes.some(row =>
  row.mode === '偷窃' && row.skill === '同伴治疗' && row.outcome === 'applied'));
assert.equal(battle.options(theftAuxResult.data).some(row => row.id === 'auxiliary:药'), false);
const thiefTurn = structuredClone(theftAuxResult.data);
thiefTurn.cryptLord.teamBattle.index = thiefTurn.cryptLord.teamBattle.queue.indexOf('敌甲');
assert.equal(battle.options(thiefTurn).find(row => row.id === 'granted:0').auxiliary.name, '同伴治疗');
assert.equal(battle.action(thiefTurn, battle.autoAction(thiefTurn)).ok, true);
const expiredAux = structuredClone(theftAuxResult.data);
for (let round = 0; round < 2; round++) {
  expiredAux.cryptLord.teamBattle.phase = 'tactic';
  Object.assign(expiredAux, battle.tactic(expiredAux, 'skip', () => 1).data);
}
assert.equal(expiredAux.cryptLord.teamBattle.units.find(row => row.id === '敌甲')
  .skillControl.granted.length, 0);
assert.ok(battle.options(expiredAux).some(row => row.id === 'auxiliary:药'));
console.log('team battle: native turns, tactics, skill control, scene props and settlement OK');
