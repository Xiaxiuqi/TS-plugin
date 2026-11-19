import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// 个人战斗相关 core 的合并脚本测试（原 12 个独立文件，每段保持独立作用域）。
// ---- auxiliary-battle ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = {
  console, structuredClone, Math, Date,
  cryptLord: { contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
  }, __stage1Modules: modules },
};
context.window = context;
for (const name of ['battle-experience', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'), context);
}
const battle = modules['cryptLord.personalBattleState'];
const initial = () => ({ stat_data: {
  名称: '玩家', 当前序列: '序列8',
  活力: 100, 当前活力: 60, 灵性: 100, 当前灵性: 100,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100,
  敏捷: 30, 当前敏捷: 30,
  辅助能力列表: {
    $meta: { extensible: true },
    炎: { 名称: '炎弹', 序列: '序列8', isEquipped: false,
      战斗效果: { 基础效果: '法术攻击', 额外效果: '攻击DEBUFF', 范围: '单体' } },
    光: { 名称: '光辉', 序列: '序列8',
      战斗效果: { 基础效果: '活力恢复', 额外效果: '防御BUFF', 范围: '全体' } },
    雾: { 名称: '迷雾', 序列: '序列8',
      战斗效果: { 基础效果: '理智恢复', 额外效果: '速度DEBUFF', 范围: '全体' } },
    静: { 名称: '静息', 序列: '序列8',
      战斗效果: { 基础效果: '活力恢复', 额外效果: '攻击DEBUFF', 范围: '单体' } },
    空: { 名称: '摆设', 战斗效果: { 基础效果: '未知效果' } },
  },
} });
const near = data => {
  const next = structuredClone(data);
  next.cryptLord.personalBattle.enemy.x = next.cryptLord.personalBattle.player.x + 2;
  next.cryptLord.personalBattle.enemy.y = next.cryptLord.personalBattle.player.y;
  return next;
};
const start = data => battle.start(data, { enemyHp: 1000, enemyPower: 1 }).data;
assert.equal(battle.auxiliaryMoves({ stat_data: {} }).length, 0);
const moves = battle.auxiliaryMoves(initial());
assert.equal(moves.length, 4);
assert.equal(moves.find(row => row.key === '炎').damage, 7);
assert.equal(moves.find(row => row.key === '炎').cost, 1);
assert.equal(moves.find(row => row.key === '炎').range, 3);
assert.equal(moves.find(row => row.key === '光').healing, 7);
assert.equal(moves.find(row => row.key === '静').effects.length, 0);
assert.equal(moves.find(row => row.key === '雾').effects[0].effectTarget, 'all');
const far = start(initial());
assert.match(battle.act(far, { type: 'auxiliary', key: '炎' }).error, /射程不足/);
assert.equal(far.cryptLord.personalBattle.turns, 0);
const first = battle.act(near(start(initial())), { type: 'auxiliary', key: '炎' });
assert.equal(first.ok, true);
assert.ok(first.battle.enemy.hp < 1000);
assert.equal(first.battle.enemy.effects.some(row => row.name === '攻击DEBUFF'), true);
assert.equal(first.data.stat_data.辅助能力列表.炎.isEquipped, false);
assert.equal(first.data.stat_data.当前灵性 < 100, true);
const again = battle.act(near(first.data), { type: 'auxiliary', key: '炎' });
assert.equal(again.ok, true);
assert.equal(again.data.stat_data.辅助能力列表.炎.名称, '炎弹');
const healed = battle.act(start(initial()), { type: 'auxiliary', key: '光' });
assert.equal(healed.ok, true);
assert.ok(healed.battle.player.hp > 60);
assert.ok(healed.battle.player.effects.some(row => row.name === '防御BUFF'));
const mist = battle.act(start(initial()), { type: 'auxiliary', key: '雾' });
assert.equal(mist.ok, true);
assert.ok(mist.battle.enemy.effects.some(row => row.name === '速度DEBUFF'));
assert.equal(mist.battle.player.effects.some(row => row.name === '速度DEBUFF'), false);
const empty = start(initial());
empty.cryptLord.personalBattle.player.spirit = 0;
assert.match(battle.act(empty, { type: 'auxiliary', key: '炎' }).error, /资源不足/);
assert.equal(empty.cryptLord.personalBattle.turns, 0);
assert.equal(battle.act(start(initial()), { type: 'auxiliary', key: '空' }).ok, false);
assert.equal(initial().stat_data.辅助能力列表.炎.名称, '炎弹');
console.log('auxiliary battle: attack, recovery, targets, cost, range, repeat and invalid entries passed');
}

// ---- battle-conditional-params ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = { console, structuredClone, Math, Date, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
  },
} };
context.window = context;
for (const name of ['battle-experience', 'battle-conditional-params', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'), context);
}
const selector = modules['cryptLord.battleConditionalParams'];
const battle = modules['cryptLord.personalBattleState'];
const caster = { hp: 30, maxHp: 100, spirit: 20, tags: [{ name: '火', stacks: 2, duration: 3 }] };
const target = { hp: 20, maxHp: 100, tags: [{ name: '木', stacks: 1, duration: 2 }] };
assert.equal(selector.evaluate('caster.当前活力 < caster.活力 * 0.5 && target.hasTag("木")', caster, target, .4), true);
assert.equal(selector.evaluate('caster.getTagStacks("火") >= 2 && target.getTagDuration("木") === 2', caster, target, .4), true);
assert.equal(selector.evaluate('random(1,100) <= 40 && 随机数(1,100) === 40', caster, target, .39), true);
assert.equal(selector.evaluate('!(target.当前活力 > 50) || false', caster, target, .4), true);
for (const expression of ['target.constructor', 'target.hp', 'window.alert(1)', 'caster.hasTag("火"); true']) {
  assert.throws(() => selector.evaluate(expression, caster, target, .4));
}
const chosen = selector.select({ power: 4, cost: { spirit: 2 }, targetType: 'enemy', effects: [],
  条件参数集: [
    { 条件: 'target.当前活力 > 50', 参数: { power: 99 } },
    { 条件: 'target.hasTag("木")', 参数: { power: 20, cost: { spirit: 0 },
      targetType: 'self', effects: [{ name: '减益' }] } },
    { 条件: 'true', 参数: { power: 70 } },
  ] }, caster, target);
assert.equal(chosen.power, 20);
assert.equal(chosen.cost.spirit, 2);
assert.equal(chosen.targetType, 'enemy');
assert.equal(chosen.effects[0].name, '减益');
assert.equal(selector.select({ power: 4, conditionalParams: [
  { condition: 'target.constructor', params: { power: 999 } },
  { condition: 'false', params: { power: 100 } },
] }, caster, target).power, 4);
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列8',
  活力: 100, 当前活力: 100, 灵性: 100, 当前灵性: 100,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100,
  敏捷: 30, 当前敏捷: 30,
  序列能力列表: { 测试: [{ 名称: '条件攻击', power: 1, range: 10,
    targetType: 'enemy', cost: { spirit: 3 },
    conditionalParams: [{ condition: 'target.当前活力 >= 100 && caster.当前灵性 === 97',
      params: { power: 50, cost: { spirit: 0 }, targetType: 'self',
        effects: [{ name: '中毒', type: 'poison', power: 2, duration: 2 }] } }] }] },
} };
const start = battle.start(initial, { enemyHp: 100, enemyPower: 1 }).data;
const probe = structuredClone(start.cryptLord.personalBattle.player);
probe.spirit -= 3;
assert.equal(selector.select(initial.stat_data.序列能力列表.测试[0], probe,
  start.cryptLord.personalBattle.enemy, .4).power, 50);
const result = battle.act(start, { type: 'ability', group: '测试', index: 0 });
assert.equal(result.ok, true);
const baseline = battle.act(battle.start({
  stat_data: { ...initial.stat_data, 序列能力列表: { 测试: [
    { 名称: '条件攻击', power: 1, range: 10, targetType: 'enemy', cost: { spirit: 3 } },
  ] } },
}, { enemyHp: 100, enemyPower: 1 }).data, { type: 'ability', group: '测试', index: 0 });
assert.ok(result.battle.enemy.hp < baseline.battle.enemy.hp,
  `selected=${result.battle.enemy.hp}, default=${baseline.battle.enemy.hp}`);
assert.equal(result.battle.player.spirit < 100, true);
assert.ok(result.battle.enemy.effects.some(effect => effect.name === '中毒'));
assert.equal(initial.stat_data.当前灵性, 100);
console.log('battle conditional params: safe expressions, tags, random, first match, guarded overrides and battle settlement passed');
}

// ---- battle-terrain-presets ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = { console, structuredClone, Date, Math, cryptLord: {
  __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {} },
} };
context.window = context;
for (const name of ['battle-experience', 'battle-terrain-presets', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', `${name}.js`), 'utf8'),
    context, { filename: name });
}
const terrain = modules['cryptLord.battleTerrainPresets'];
const battle = modules['cryptLord.personalBattleState'];
const options = terrain.options();
assert.equal(options.length, 21);
assert.deepEqual([...new Set(options.map(row => row.family))].sort(), ['cloud', 'geo', 'surface']);
assert.equal(terrain.option('lavaSurface').blocked, true);
assert.equal(terrain.option('webSurface').moveCost, 3);
assert.equal(terrain.hits('poisonSurface', { tags: ['毒'], rank: 8 })[0].tier, '适应');
assert.ok(terrain.hits('poisonSurface', { tags: ['生命', '钢'], rank: 8 })[0].value < 0);
assert.equal(terrain.hits('oilSurface', { tags: [], rank: 0 }).length, 0);
assert.ok(terrain.hits('oilSurface', { tags: [], rank: 9 }).some(hit => hit.kind === 'status'));

const initial = () => ({ stat_data: { 名称: '玩家', 当前序列: '序列8',
  活力: 100, 当前活力: 100, 敏捷: 30, 当前敏捷: 30,
  灵性: 100, 当前灵性: 100, 理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100 } });
const started = battle.start(initial()).data;
assert.equal(battle.terrainOptions().length, 26);
assert.equal(battle.terrainOptions().some(row => row.id === 'lavaSurface'), false);
assert.equal(battle.paintTerrain(started, 3, 5, 'lavaSurface', 3).ok, false);
assert.equal(battle.paintTerrain(started, 3, 5, 'webSurface', 4).ok, false);
assert.equal(battle.paintTerrain(started, 3, 5, 'unknown').ok, false);
const input = structuredClone(started);
const painted = battle.paintTerrain(started, 3, 5, 'poisonSurface', 3);
assert.equal(painted.ok, true);
assert.equal(JSON.stringify(started), JSON.stringify(input));
assert.equal(battle.terrainAt(painted.data, 3, 5).moveCost, 2);
assert.equal(battle.terrainAt(painted.data, 3, 5).strength, painted.battle.player.rank);
assert.notEqual(terrain.hits('poisonSurface', { rank: 8, tags: [] }, 3)[0].value,
  terrain.hits('poisonSurface', { rank: 8, tags: [] })[0].value);
const stepped = battle.move(painted.data, 3, 5);
assert.equal(stepped.ok, true);
assert.equal(stepped.battle.player.effects.some(row => row.terrainSource === 'poisonSurface'), true);
const stacked = battle.paintTerrain(stepped.data, 4, 5, 'poisonSurface', 3);
const moved = battle.move(stacked.data, 4, 5);
assert.equal(moved.ok, true);
assert.equal(moved.battle.player.effects.filter(row => row.terrainSource === 'poisonSurface').length, 2);
const advanced = battle.act(moved.data, { type: 'wait' });
assert.equal(advanced.ok, true);
assert.ok(advanced.battle.player.hp < moved.battle.player.hp);
assert.equal(advanced.battle.player.effects.some(row => row.terrainSource === 'poisonSurface'), true);

const oil = battle.paintTerrain(started, 2, 5, 'oilSurface', 3);
const onOil = battle.act(oil.data, { type: 'wait' });
assert.equal(onOil.ok, true);
assert.equal(onOil.battle.player.effects.some(row => row.terrainSource === 'oilSurface'
  && row.stat === 'speed' && row.valueType === 'fixed'), true);
assert.equal(battle.get(onOil.data).player.effects.some(row => row.terrainSource === 'oilSurface'), true);
const cleared = battle.paintTerrain(onOil.data, 2, 5, 'plain');
const afterClear = battle.act(cleared.data, { type: 'wait' });
assert.equal(afterClear.battle.player.effects.some(row => row.terrainSource === 'oilSurface'), false);

const legacy = battle.paintTerrain(started, 3, 5, 'fire');
assert.equal(legacy.ok, true);
assert.equal(battle.move(legacy.data, 3, 5).ok, true);
console.log('battle terrain presets: 21 definitions, tiers, status, residue, UI options and legacy saves OK');
}

// ---- battlefield-painter ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const calls = [];
let response = '';
let settings = { useCustomApi: false };
const context = { console, structuredClone, Date, Math, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  },
} };
context.window = context;
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = {
  async generateRaw(config) { calls.push(config); return response; },
  async getChatMessages() { return [{ message_id: 1, role: 'assistant', message: '旧楼层码头' },
    { message_id: 9, role: 'assistant', message: '未来楼层不应出现' }]; },
};
for (const name of ['battle-experience', 'battle-terrain-presets', 'natural-environment',
  'initial-placement',
  'battlefield-painter', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', `${name}.js`), 'utf8'),
    context, { filename: name });
}
const painter = modules['cryptLord.battlefieldPainter'];
const battle = modules['cryptLord.personalBattleState'];
const initial = () => ({ stat_data: { 名称: '玩家', 当前序列: '序列8',
  活力: 10000, 当前活力: 10000, 敏捷: 30, 当前敏捷: 30,
  灵性: 100, 当前灵性: 100, 理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100 } });
const started = () => battle.start(initial()).data;
const points = painter.rasterize({ 形状: 'circle', x: 5, y: 5, r: 1 }, 12, 10);
assert.equal(points.length, 5);
assert.equal(painter.rasterize({ 形状: 'line', x1: 0, y1: 0, x2: 3, y2: 3 }, 12, 10).length, 4);
assert.equal(painter.rasterize({ 形状: 'cells', 格子: [[-1, 1], [2, 2], [2, 2]] }, 12, 10).length, 1);
assert.equal(painter.parse('```json\n{"场景":"码头"}\n```').场景, '码头');
assert.equal(painter.parse('invalid'), null);
assert.equal(painter.prompt(12, 10, '码头').system.includes('lavaSurface'), true);
const plan = {
  场景: '林间遗迹', 基底: { 名称: '湿土', 分级: 4 },
  笔刷: [
    { 形状: 'rect', x: 0, y: 0, w: 12, h: 10, 名称: '碎石', 分级: 2 },
    { 形状: 'cells', 格子: [[4, 4]], 地形: 'fireSurface', 存在回合: 3 },
    { 形状: 'circle', x: 6, y: 5, r: 1, 地形: 'poisonSurface' },
    { 形状: 'cells', 格子: [[2, 5], [0, 0], [1, 9]], 地形: 'webSurface' },
    { 形状: 'cells', 格子: [[5, 5]], 地形: 'nonsense' },
    { 形状: 'cells', 格子: [[8, 5]], 名称: '墙', 分级: 4 },
  ],
  可互动物品: [{ 名称: '灯', 描述: '树旁', 数量: 2 }, { 名称: '灯', 数量: 3 },
    { 名称: '坏', 数量: 0 }],
  自然环境: { 地貌: '森林', 天气: '乱天气', 时间: '夜晚' },
  初始站位: [{ 编号: 'P1', x: 1, y: 4 }, { 编号: 'E1', x: 10, y: 4 }],
};
const original = started();
const snapshot = JSON.stringify(original);
const result = painter.apply(original, plan);
assert.equal(result.ok, true);
assert.equal(JSON.stringify(original), snapshot);
assert.equal(result.battle.board.baseTerrain.tier, 1);
assert.equal(battle.terrainAt(result.data, 4, 4).id, 'fireSurface');
assert.equal(battle.terrainAt(result.data, 2, 5).id, 'scene');
assert.equal(battle.terrainAt(result.data, 0, 0).id, 'scene');
assert.equal(battle.terrainAt(result.data, 8, 5).blocked, true);
assert.equal(battle.terrainAt(result.data, 7, 4).moveCost, 3);
assert.equal(result.battle.board.props.length, 1);
assert.equal(result.battle.board.naturalEnv.地貌, '森林');
assert.equal(result.battle.board.naturalEnv.天气, null);
assert.equal(result.battle.player.x, 1);
assert.equal(result.battle.enemy.x, 10);
assert.equal(battle.get(result.data).board.scene, '林间遗迹');
assert.equal(battle.paintTerrain(result.data, 8, 5, 'plain').ok, true);
const blocked = painter.apply(started(), { 笔刷: [{ 形状: 'rect',
  x: 1, y: 4, w: 3, h: 3, 名称: '城墙', 分级: 4 }] });
assert.equal(Object.keys(blocked.battle.board.terrain).length, 0);
const hostile = painter.apply(started(), { 笔刷: [{ 形状: 'rect',
  x: 0, y: 1, w: 12, h: 8, 地形: 'fireSurface' }] });
assert.equal(Object.keys(hostile.battle.board.terrain).length, 0);
assert.equal(painter.apply(result.data, plan).ok, true);
const advanced = battle.act(result.data, { type: 'wait' });
assert.equal(painter.apply(advanced.data, plan).ok, false);
response = `\`\`\`json\n${JSON.stringify(plan)}\n\`\`\``;
let generated = await painter.generate(started(), '港口冲突', 2);
assert.equal(generated.ok, true);
assert.equal(calls.at(-1).custom_api, undefined);
assert.match(calls.at(-1).ordered_prompts.at(-1).content, /港口冲突/);
assert.match(calls.at(-1).ordered_prompts.at(-1).content, /旧楼层码头/);
assert.doesNotMatch(calls.at(-1).ordered_prompts.at(-1).content, /未来楼层/);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid', apiKey: 'x', model: 'secondary' };
generated = await painter.generate(started(), '港口冲突');
assert.equal(generated.ok, true);
assert.equal(calls.at(-1).custom_api.model, 'secondary');
response = 'bad json';
assert.equal((await painter.generate(started(), '港口冲突')).ok, false);
console.log('battlefield painter: prompt, model, raster, guardrails, scene, props, placement and fallback OK');
}

// ---- consumable-battle ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = { console, structuredClone, Math, Date, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
  },
} };
context.window = context;
for (const name of ['battle-experience', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'), context);
}
const battle = modules['cryptLord.personalBattleState'];
const item = (effect, extra = '', quantity = 2, scope = '单体') => ({
  名称: effect, 序列: '序列8', 数量: quantity,
  战斗效果: { 基础效果: effect, 额外效果: extra, 范围: scope },
});
const initial = () => ({ stat_data: {
  名称: '玩家', 当前序列: '序列10', 活力: 100, 当前活力: 50,
  灵性: 100, 当前灵性: 100, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100, 敏捷: 30, 当前敏捷: 30,
  消耗品列表: {
    $meta: { extensible: true },
    弹药: item('物理攻击', '攻击DEBUFF'),
    药: item('活力恢复', '防御BUFF', 1),
    无效: item('未知', '', 1),
    空: item('物理攻击', '', 0),
    伪装: item('物理攻击', '', 1.5),
    卷轴: { ...item('物理攻击', '攻击BUFF'), $卷轴制造: true },
  },
} });
const start = data => battle.start(data, { enemyHp: 1000, enemyPower: 1 }).data;
const moves = battle.consumableMoves(initial());
assert.equal(moves.length, 3);
assert.equal(battle.scrollMoves(initial()).length, 1);
assert.equal(moves.find(row => row.key === '弹药').power, 350);
assert.equal(moves.find(row => row.key === '弹药').cost, 1);
assert.equal(moves.find(row => row.key === '弹药').effects[0].effectTarget, 'target');
assert.equal(moves.find(row => row.key === '药').effects[0].effectTarget, 'self');
assert.equal(battle.act(start(initial()), { type: 'consumable', key: '卷轴' }).ok, false);
assert.equal(battle.act(start(initial()), { type: 'scroll', key: '弹药' }).ok, false);
const data = start(initial());
data.cryptLord.personalBattle.enemy.x = data.cryptLord.personalBattle.player.x + 2;
data.cryptLord.personalBattle.enemy.y = data.cryptLord.personalBattle.player.y;
const used = battle.act(data, { type: 'consumable', key: '弹药' });
assert.equal(used.ok, true);
assert.equal(used.data.stat_data.消耗品列表.弹药.数量, 1);
assert.ok(used.battle.enemy.hp < 1000);
assert.ok(used.battle.enemy.effects.some(effect => effect.name === '攻击DEBUFF'));
assert.equal(data.stat_data.消耗品列表.弹药.数量, 2);
const healed = battle.act(start(initial()), { type: 'consumable', key: '药' });
assert.equal(healed.ok, true);
assert.equal(healed.data.stat_data.消耗品列表.药, undefined);
assert.ok(healed.battle.player.hp > 50);
assert.ok(healed.battle.player.effects.some(effect => effect.name === '防御BUFF'));
assert.equal(battle.act(healed.data, { type: 'consumable', key: '药' }).ok, false);
const expensive = start(initial());
expensive.cryptLord.personalBattle.player.spirit = 0;
assert.match(battle.act(expensive, { type: 'consumable', key: '弹药' }).error, /资源不足/);
assert.equal(expensive.stat_data.消耗品列表.弹药.数量, 2);
const arrayData = initial();
arrayData.stat_data.消耗品列表 = [item('活力恢复', '', 1)];
const arrayUsed = battle.act(start(arrayData), { type: 'consumable', key: '0' });
assert.equal(arrayUsed.ok, true);
assert.equal(arrayUsed.data.stat_data.消耗品列表.length, 0);
const singleDebuff = initial();
singleDebuff.stat_data.消耗品列表.药.战斗效果.额外效果 = '速度DEBUFF';
assert.equal(battle.consumableMoves(singleDebuff).find(row => row.key === '药').effects.length, 0);
const allDebuff = initial();
allDebuff.stat_data.消耗品列表.药.战斗效果.范围 = '全体';
allDebuff.stat_data.消耗品列表.药.战斗效果.额外效果 = '速度DEBUFF';
assert.equal(battle.consumableMoves(allDebuff).find(row => row.key === '药').effects[0].effectTarget, 'target');
console.log('consumable battle: original power/cost, effects, depletion, array/object inventory and guards passed');
}

// ---- initial-placement ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = { console, structuredClone, Date, Math, Uint32Array, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
  },
} };
context.window = context;
for (const name of ['battle-experience', 'battle-terrain-presets', 'natural-environment',
  'initial-placement', 'battlefield-painter', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'),
    context, { filename: name });
}
const placement = modules['cryptLord.initialPlacement'];
const painter = modules['cryptLord.battlefieldPainter'];
const battle = modules['cryptLord.personalBattleState'];
const terrain = modules['cryptLord.battleTerrainPresets'];
const initial = () => battle.start({
  stat_data: { 名称: '旅者', 当前序列: '序列8', 身份: '侦探', 外貌: '风衣',
    活力: 100, 当前活力: 100, 灵性: 100, 当前灵性: 100,
    敏捷: 30, 当前敏捷: 30 },
  npc_data: { 巡警: { 当前序列: '普通人', 身份: '巡警', 外貌: '制服',
    活力: 80, 当前活力: 80 } },
}, { npcKey: '巡警' }).data;
const source = initial();
const actors = placement.collect(source);
assert.equal(actors.length, 2);
assert.equal(actors[0].身份, '侦探');
assert.equal(actors[1].外貌, '制服');
assert.equal(placement.section([], 12, 10), '');
assert.match(placement.section(actors, 12, 10), /x=0\.\.11/);
assert.match(painter.prompt(12, 10, '埋伏', actors).system, /初始站位/);
const plan = { 场景: '巷口',
  笔刷: [
    { 形状: 'cells', 格子: [[1, 1]], 地形: 'fireSurface' },
    { 形状: 'cells', 格子: [[2, 2]], 分级: 4, 名称: '城墙' },
  ],
  初始站位: [
    { 编号: 'P1', x: 1, y: 1 },
    { 编号: 'P1', x: 3, y: 3 },
    { 编号: 'E1', x: 2, y: 2 },
    { 编号: 'E1', x: 3, y: 3 },
    { 编号: 'E1', x: 9, y: 3 },
  ],
};
const painted = painter.apply(source, plan);
assert.equal(painted.ok, true);
assert.equal(painted.battle.player.x, 3);
assert.equal(painted.battle.enemy.x, 9);
assert.equal(source.cryptLord.personalBattle.player.x, 2);
const board = painted.battle.board;
assert.equal(placement.safe(board, { x: 1, y: 1 }, terrain), false);
assert.equal(placement.safe(board, { x: 2, y: 2 }, terrain), false);
assert.equal(placement.safe(board, { x: 1.5, y: 3 }, terrain), false);
assert.equal(placement.parse([{ 编号: 'P1', x: null, y: 0 },
  { 编号: 'E1', x: '', y: 0 }, { 编号: 'bogus', x: 0, y: 0 }], actors, board, terrain).size, 0);
const fallback = painter.apply(source, { 初始站位: [{ 编号: 'P1', x: 9, y: 5 }] });
assert.equal(fallback.battle.player.x, 9);
assert.equal(fallback.battle.enemy.x, 9);
assert.equal(fallback.battle.enemy.y, 4);
const noPositions = painter.apply(source, { 初始站位: [] });
assert.equal(noPositions.battle.player.x, 2);
assert.equal(noPositions.battle.enemy.x, 9);
const duplicate = painter.apply(source, { 初始站位: [
  { 编号: 'P1', x: 5, y: 5 }, { 编号: 'E1', x: 5, y: 5 },
] });
assert.equal(duplicate.battle.player.x, 5);
assert.notEqual(duplicate.battle.enemy.x, 5);
console.log('initial placement: roster, prompt, terrain guards, duplicate, partial and default fallback passed');
}

// ---- grazing-state ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
let settings = { useCustomApi: false };
let response = '<裁定>通过|剧情明确亲手放牧且仍持有</裁定>';
let modelConfig;
const context = {
  console, structuredClone, Math, Date,
  cryptLord: {
    contract: {
      initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) {
        if (key === 'cryptLord.variableSettlementApi') return { readSettings: async () => settings };
        if (key === 'cryptLord.hostApi') return { generateRaw: async config => {
          modelConfig = config;
          return response;
        } };
        throw Error(`Unexpected ${key}`);
      },
    },
    __stage1Modules: modules,
  },
};
context.window = context;
for (const filename of ['audience-imagination.js', 'grazing-state.js']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', filename), 'utf8'),
    context, { filename });
}
const imagination = modules['cryptLord.audienceImagination'];
const grazing = modules['cryptLord.grazingState'];
const pool = {
  pathways: {
    秘祈人途径: ['序列9-秘祈人', '序列5-牧羊人', '序列3-三首圣堂', '序列1-暗天使'],
    观众途径: ['序列9-观众', '序列5-梦境行者', '序列1-作家'],
    占卜家途径: ['序列9-占卜家', '序列5-秘偶大师', '序列1-诡秘侍者'],
  },
  abilities: {
    '占卜家途径-序列9': [{ 名称: '灵视' }],
    '占卜家途径-序列5': [{ 名称: '操控秘偶' }],
  },
};
const npc = name => ({
  名称: name, 当前序列: '序列5-秘偶大师', 活力: 100, 敏捷: 30,
  灵性: 90, 理智: 30, 人性: 30, 运气: 10, 身份: '访客',
});
const data = {
  stat_data: { 当前序列: '序列5-牧羊人', 灵性: 150, 当前灵性: 30,
    人物关系列表: { 甲: { 关系: '对手' }, 乙: { 关系: '朋友' }, '$meta': {} } },
  npc_data: { 甲: npc('甲'), 乙: npc('乙') },
};
assert.equal(grazing.capacity(5), 7);
assert.equal(grazing.capacity(4), 9);
assert.equal(grazing.capacity(3), 13);
assert.equal(grazing.capacity(2), 18);
assert.equal(grazing.capacity(1), 22);
assert.equal(grazing.activeCap(5), 1);
assert.equal(grazing.activeCap(3), 3);
assert.equal(grazing.activeCap(0), 5);
assert.equal(grazing.candidates(data, pool).length, 2);
assert.equal(grazing.parseVerdict(response).ok, true);
for (const invalid of ['通过|没标签', '<裁定>通过|a\n不通过|b</裁定>', '<裁定>通过|</裁定>']) {
  assert.throws(() => grazing.parseVerdict(invalid), /格式/);
}
assert.equal((await grazing.certify(data, pool, '甲', '#2 assistant 玩家亲手放牧甲')).ok, true);
assert.equal(modelConfig.custom_api, undefined);
assert.match(modelConfig.ordered_prompts.at(-1).content, /亲手放牧甲/);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid', apiKey: 'secret', model: 'test' };
response = '<裁定>不通过|仅击败目标</裁定>';
assert.equal((await grazing.certify(data, pool, '甲', '仅击败')).ok, false);
assert.equal(modelConfig.custom_api.model, 'test');
assert.throws(() => grazing.capture(data, pool, '甲', { ok: false }), /未通过/);
assert.equal(data.stat_data.$专属玩法, undefined);

const one = grazing.capture(data, pool, '甲', { ok: true, reason: '确认' });
assert.equal(one.stat_data.$专属玩法.秘祈人途径.放牧玩法.灵魂列表.甲.$放牧来源, '人物认证');
assert.notEqual(one.stat_data.$专属玩法.秘祈人途径.放牧玩法.灵魂列表.甲, data.npc_data.甲);
assert.throws(() => grazing.capture(one, pool, '甲', { ok: true }), /目标资料/);
const two = grazing.capture(one, pool, '乙', { ok: true });
const active = grazing.save(two, pool, ['甲']);
assert.deepEqual([...grazing.namesOf(active, '激活灵魂')], ['甲']);
assert.match(imagination.resolve(pool, active).effectiveSequence, /秘偶大师/);
assert.ok(active.stat_data.序列能力列表['#放牧:甲:序列9-占卜家']);
assert.ok(active.stat_data.序列能力列表['#放牧:甲:序列5-秘偶大师']);
assert.throws(() => grazing.save(active, pool, ['甲', '乙']), /上限/);
const swapped = grazing.save(active, pool, ['乙']);
assert.deepEqual([...grazing.namesOf(swapped, '休眠灵魂')], ['甲']);
const promoted = structuredClone(swapped);
promoted.stat_data.当前序列 = '序列3-三首圣堂';
const both = grazing.save(promoted, pool, ['甲', '乙']);
assert.equal(imagination.resolve(pool, both).grazed.length, 2);
both.stat_data.当前序列 = '序列5-牧羊人';
assert.equal(imagination.resolve(pool, both).grazed.length, 1);
assert.equal(grazing.namesOf(both, '激活灵魂').length, 2);
const downgraded = grazing.save(both, pool, ['乙']);
assert.deepEqual([...grazing.namesOf(downgraded, '休眠灵魂')], ['甲']);
const released = grazing.release(downgraded, pool, '乙');
assert.equal(grazing.soulsOf(released).乙, undefined);
assert.equal(grazing.namesOf(released, '激活灵魂').length, 0);
assert.equal(Object.keys(released.stat_data.序列能力列表).some(key => key.startsWith('#放牧:')), false);

const battle = structuredClone(active);
battle.cryptLord = { personalBattle: {
  status: 'active', currentTurn: 'player', round: 1, log: [],
  player: { spirit: 50, imagination: { grazed: [{ name: '甲' }] } },
} };
assert.throws(() => grazing.save(battle, pool, ['甲'], false, true), /没有变化/);
const switched = grazing.save(battle, pool, ['乙'], false, true);
assert.equal(grazing.switchCost(battle), 26);
assert.equal(switched.cryptLord.personalBattle.player.spirit, 24);
assert.equal(switched.stat_data.当前灵性, 24);
assert.equal(switched.cryptLord.personalBattle.player.imagination.grazed[0].name, '乙');
assert.ok(switched.stat_data.序列能力列表['#放牧:乙:序列5-秘偶大师']);
assert.equal(battle.cryptLord.personalBattle.player.spirit, 50);
assert.throws(() => grazing.release(battle, pool, '甲'), /战斗中/);
const exhausted = structuredClone(battle);
exhausted.cryptLord.personalBattle.player.spirit = 2;
assert.throws(() => grazing.save(exhausted, pool, ['乙'], false, true), /26 点灵性/);
console.log('grazing-state: certification, roster, dormancy, projection and battle switching OK');
}

// ---- natural-environment ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = { console, structuredClone, Date, Math, cryptLord: {
  __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {} },
} };
context.window = context;
for (const name of ['battle-experience', 'battle-terrain-presets', 'natural-environment',
  'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', `${name}.js`), 'utf8'),
    context, { filename: name });
}
const env = modules['cryptLord.naturalEnvironment'];
const battle = modules['cryptLord.personalBattleState'];
assert.equal(env.vocab.地貌.length, 27);
assert.equal(env.vocab.天气.length, 28);
assert.equal(env.vocab.时间.length, 7);
assert.equal(env.parse({ 地貌: '人造建筑与载具（海上）', 天气: '暴风雨', 时间: '无时间概念' }).地貌,
  '人造建筑与载具（海上）');
assert.equal(env.parse({ 地貌: '室内', 天气: '雨', 时间: '正午' }).天气, null);
assert.equal(env.sequenceRank('序列7-航海家（水手途径）', '水手'), 7);
assert.equal(env.sequenceRank('序列9-水手、序列5-水手', '水手'), 5);
assert.equal(env.sequenceRank('上帝', '水手'), -2);
assert.equal(env.sequenceRank('永恒之暗', '不眠者'), -1);
assert.equal(env.sequenceRank('序列5-占卜家', '水手'), null);
const resolve = (sequenceString, natural) => env.resolve({ sequenceString }, natural);
const sea = { 地貌: '海洋', 天气: '暴风雨', 时间: '深夜' };
assert.equal(resolve('序列7-水手', sea).effects.find(row => row.name === '海洋·攻击力').power, 30);
assert.equal(resolve('序列7-水手', sea).effects.find(row => row.name === '暴风雨·防御力').power, 15);
assert.equal(resolve('序列7-水手', sea).move, 1);
assert.equal(resolve('序列6-水手', sea).move, 2);
assert.equal(resolve('序列7-不眠者', sea).effects.find(row => row.name === '深夜·速度').power, 21);
assert.equal(resolve('序列7-不眠者', sea).move, 1);
assert.equal(resolve('序列7-占卜家', sea).effects.length, 0);
assert.equal(resolve('普通人', sea).move, 0);
assert.equal(resolve('序列9-水手', { 天气: '风暴' }).effects.length, 0);
assert.equal(resolve('序列6-水手', { 地貌: '人造建筑与载具（高空）' }).effects[0].power, 32);
assert.equal(resolve('上帝', { 地貌: '海洋' }).effects[0].power, 120);

const initial = (sequence = '序列7-水手', enemySequence = '序列9-水手') => ({
  stat_data: { 名称: '玩家', 当前序列: sequence,
    活力: 5000, 当前活力: 5000, 敏捷: 30, 当前敏捷: 30,
    灵性: 100, 当前灵性: 100, 理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100 },
  npc_data: { 对手: { 当前序列: enemySequence, 活力: 5000, 当前活力: 5000,
    当前敏捷: 30, 当前灵性: 100, 当前理智: 100, 当前人性: 100 } },
});
function inSea(source) {
  const next = structuredClone(source);
  next.cryptLord.personalBattle.board.naturalEnv = sea;
  return next;
}
const plain = battle.start(initial(), { npcKey: '对手' }).data;
const configured = inSea(plain);
const loaded = battle.get(configured);
assert.equal(loaded.player.effects.filter(row => row.environment).length, 5);
assert.equal(loaded.enemy.effects.find(row => row.name === '海洋·攻击力').power, 10);
assert.ok(loaded.player.moveMax > plain.cryptLord.personalBattle.player.moveMax);
assert.equal(battle.get(configured).player.effects.filter(row => row.environment).length, 5);
assert.equal(configured.stat_data.当前敏捷, 30);
assert.equal(battle.removeEffect(configured, 'player', '海洋·攻击力').ok, false);
const removed = structuredClone(configured);
removed.cryptLord.personalBattle.board.naturalEnv = { 地貌: '森林', 天气: '晴', 时间: '上午' };
assert.equal(battle.get(removed).player.effects.some(row => row.environment), false);
const near = structuredClone(configured);
near.cryptLord.personalBattle.enemy.x = near.cryptLord.personalBattle.player.x + 1;
near.cryptLord.personalBattle.seed = 42;
const ordinary = structuredClone(near);
ordinary.cryptLord.personalBattle.board.naturalEnv = null;
const boostedHit = battle.act(near, { type: 'basic' });
const plainHit = battle.act(ordinary, { type: 'basic' });
assert.equal(boostedHit.ok, true);
assert.ok(boostedHit.battle.enemy.hp < plainHit.battle.enemy.hp);
assert.ok(boostedHit.battle.player.effects.some(row => row.environment));
assert.equal(boostedHit.data.stat_data.当前敏捷, 30);
console.log('natural environment: vocab, pathways, gates, self-rank, dual sides, movement, damage and persistence OK');
}

// ---- npc-weapon-assigner ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const calls = [];
let response = '';
let settings = { useCustomApi: false };
const context = { console, structuredClone, Date, Math, Uint32Array, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { return modules[key]; },
  },
} };
context.window = context;
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = {
  async generateRaw(config) { calls.push(config); return response; },
  async getChatMessages() { return []; },
};
for (const name of ['battle-experience', 'battle-terrain-presets', 'natural-environment',
  'npc-weapon-assigner', 'initial-placement', 'battlefield-painter', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'),
    context, { filename: name });
}
const assigner = modules['cryptLord.npcWeaponAssigner'];
const painter = modules['cryptLord.battlefieldPainter'];
const battle = modules['cryptLord.personalBattleState'];
const npc = (name = '巡警', identity = '巡警') =>
  ({ 名称: name, 当前序列: '普通人', 身份: identity, 外貌: '穿着制服',
    活力: 200, 当前活力: 200, 敏捷: 12, 当前敏捷: 12 });
const initial = raw => ({ stat_data: { 名称: '玩家', 当前序列: '序列10',
  活力: 1000, 当前活力: 1000, 敏捷: 30, 当前敏捷: 30,
  灵性: 100, 当前灵性: 100, 理智: 100, 当前理智: 100,
  人性: 100, 当前人性: 100 }, npc_data: { 目标: raw } });
const started = raw => battle.start(initial(raw), { npcKey: '目标' }).data;
assert.equal(assigner.pools.human.length, 15);
assert.equal(assigner.pools.nonhuman.length, 10);
assert.equal(assigner.fallback(npc()).名称, '单手钝器');
assert.equal(assigner.fallback(npc('野狼', '野兽')).名称, '贴身见血');
assert.equal(assigner.fallback(npc('龙虎', '巡警')).名称, '单手钝器');
assert.equal(assigner.eligible({ ...npc(), 当前序列: '序列6' }), false);
assert.equal(assigner.eligible({ ...npc(), 辅助能力列表: {
  术: { 名称: '炎弹', 战斗效果: { 基础效果: '物理攻击' } },
} }), false);
assert.equal(assigner.eligible({ ...npc(), 能力清单: [{ 名称: '枪击', 类型: '攻击' }] }), false);
assert.equal(assigner.eligible({ ...npc(), 能力清单: [
  { 名称: '侦查被动', isPassive: true },
  { 名称: '攻击手段（由你根据攻击者的人设决定具体是什么手段）' },
] }), true);
assert.equal(assigner.collect(started(npc())).length, 1);
assert.equal(assigner.collect(battle.start(initial(npc()), { enemyName: '训练假人' }).data).length, 0);
assert.equal(assigner.section([]), '');
assert.match(assigner.section(assigner.collect(started(npc()))), /精准长枪/);
const picks = assigner.parse([
  { 角色: '目标', 类别: '伪造武器' },
  { 角色: '目标', 类别: '长管步枪', 称呼: '巡警制式旧式步枪' },
  { 角色: '目标', 类别: '短刃' },
]);
assert.equal(picks.size, 1);
assert.equal(picks.get('目标').称呼.length, 8);
const source = started(npc());
const requested = assigner.collect(source);
const snapshot = JSON.stringify(source);
const changed = assigner.apply(source, requested, picks);
assert.equal(changed.applied, 1);
assert.equal(changed.data.cryptLord.personalBattle.enemy.fallbackWeapon.名称, '长管步枪');
assert.equal(changed.data.npc_data.目标.武器列表, undefined);
assert.equal(JSON.stringify(source), snapshot);
const stale = structuredClone(source);
stale.npc_data.目标.身份 = '码头工人';
assert.equal(assigner.apply(stale, requested, picks).applied, 0);
assert.equal(assigner.apply(source, requested, assigner.parse([{ 角色: '目标', 类别: '魔法枪' }])).applied, 0);
const plan = { 场景: '街巷', 基底: { 名称: '平地', 分级: 0 },
  NPC武器: [{ 角色: '目标', 类别: '长管步枪', 称呼: '警用步枪' }] };
response = JSON.stringify(plan);
let result = await painter.generate(source, '巡警持枪');
assert.equal(result.ok, true);
assert.equal(result.npcAssigned, 1);
assert.equal(calls.length, 1);
assert.equal(calls[0].custom_api, undefined);
assert.match(calls[0].ordered_prompts.at(-2).content, /NPC武器/);
assert.equal(result.data.cryptLord.personalBattle.enemy.fallbackWeapon.显示名, '警用步枪');
const fight = structuredClone(result.data);
fight.cryptLord.personalBattle.enemy.x = fight.cryptLord.personalBattle.player.x + 4;
fight.cryptLord.personalBattle.enemy.y = fight.cryptLord.personalBattle.player.y;
const before = fight.cryptLord.personalBattle.player.hp;
const after = battle.act(fight, { type: 'wait' });
assert.equal(after.ok, true);
assert.equal(after.battle.enemy.x, fight.cryptLord.personalBattle.enemy.x);
assert.ok(after.battle.log.some(entry => entry.message.includes('警用步枪')));
assert.ok(after.battle.player.hp <= before);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid', model: 'secondary' };
await painter.generate(started(npc()), '巡警持枪');
assert.equal(calls.at(-1).custom_api.model, 'secondary');
response = JSON.stringify({ ...plan, NPC武器: [{ 角色: '目标', 类别: '不存在' }] });
result = await painter.generate(started(npc('野狼', '野兽')), '巷口野狼');
assert.equal(result.ok, true);
assert.equal(result.npcAssigned, undefined);
assert.equal(result.data.cryptLord.personalBattle.enemy.fallbackWeapon.名称, '贴身见血');
response = 'invalid';
result = await painter.generate(started(npc()), '巡警持枪');
assert.equal(result.ok, false);
assert.equal(battle.get(started(npc())).enemy.fallbackWeapon.名称, '单手钝器');
console.log('npc weapon assigner: pools, eligibility, fallback, parsing, stale guard, single model request and battle use passed');
}

// ---- savant-weapon-battle ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = {
  console, structuredClone, Date, Math, Uint32Array,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
  } },
};
context.window = context;
for (const name of ['battle-experience', 'savant-material', 'savant-enhancement', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'), context);
}
const enhancement = modules['cryptLord.savantEnhancement'];
const battle = modules['cryptLord.personalBattleState'];
const cls = (accuracy = '手枪级', range = '中距离') =>
  ({ 威力量级: '手枪级', 精度: accuracy, 射程: range, AOE: '无AOE' });
const initial = () => ({
  stat_data: {
    名称: '测试者', 当前序列: '序列10',
    活力: 100, 当前活力: 100, 灵性: 100, 当前灵性: 100,
    敏捷: 30, 当前敏捷: 30,
    武器列表: { 枪: { 名称: '左轮', 序列: '序列10', isEquipped: true, $战斗分类: cls() } },
  },
});
const atRange = (data, gap = 1) => {
  const next = structuredClone(data);
  next.cryptLord.personalBattle.player.x = 2;
  next.cryptLord.personalBattle.enemy.x = 2 + gap;
  next.cryptLord.personalBattle.enemy.y = next.cryptLord.personalBattle.player.y;
  return next;
};
const begin = data => battle.start(data, { enemyHp: 900, enemyPower: 1 }).data;
assert.equal(battle.weaponMoves(initial())[0].damage, 50);
assert.equal(battle.weaponMoves(initial())[0].range, 3);
assert.equal(battle.weaponMoves({ stat_data: {} }).length, 0);
const unarmed = initial();
unarmed.stat_data.武器列表.枪.isEquipped = false;
assert.equal(battle.weaponMoves(unarmed).length, 0);
assert.equal(battle.act(begin(unarmed), { type: 'weapon', key: '枪' }).ok, false);
const invalid = initial();
invalid.stat_data.武器列表.枪.$战斗分类.精度 = '作弊级';
assert.equal(battle.weaponMoves(invalid).length, 0);
const far = begin(initial());
assert.match(battle.act(far, { type: 'weapon', key: '枪' }).error, /射程不足/);
assert.equal(far.cryptLord.personalBattle.turns, 0);
const missed = atRange(begin(initial()), 3);
missed.cryptLord.personalBattle.enemy.highestOtherCurrent = 100000;
missed.cryptLord.personalBattle.seed = 1;
const missedResult = battle.act(missed, { type: 'weapon', key: '枪' });
assert.equal(missedResult.ok, true);
assert.equal(missedResult.data.cryptLord.personalBattle.enemy.hp, 900);
assert.match(missedResult.battle.log.find(row => row.actor === 'player').message, /未命中/);
const melee = initial();
melee.stat_data.武器列表.枪.$战斗分类 = cls('近战无精度', '近战');
const meleeResult = battle.act(atRange(begin(melee)), { type: 'weapon', key: '枪' });
assert.equal(meleeResult.ok, true);
assert.equal(meleeResult.battle.enemy.hp, 850);
assert.equal(battle.act(begin(melee), { type: 'weapon', key: '枪' }).ok, false);
assert.equal(battle.weaponMoves(melee)[0].damage, 50);

const enhanced = initial();
const weapon = enhanced.stat_data.武器列表.枪;
weapon.$强化模块安装 = { 模块ID: 'test' };
enhanced.stat_data.$专属玩法 = { 通识者途径: { 装备强化玩法: { 模块仓库: {
  test: { id: 'test', 品质: '史诗', 安装位置: { 列表键: '武器列表', 物品键: '枪' },
    武器效果: { mundane: { up: { 精度: 1, 射程: 1 } }, extraordinary: {} } },
} } } };
assert.equal(battle.weaponMoves(enhanced)[0].accuracyTier, '步枪级');
assert.equal(battle.weaponMoves(enhanced)[0].range, 5);
assert.equal(weapon.$战斗分类.精度, '手枪级');
assert.equal(battle.act(atRange(begin(enhanced), 5), { type: 'weapon', key: '枪' }).ok, true);
const detached = structuredClone(enhanced);
delete detached.stat_data.武器列表.枪.$强化模块安装;
assert.equal(battle.weaponMoves(detached)[0].range, 3);
const mismatched = structuredClone(enhanced);
mismatched.stat_data.$专属玩法.通识者途径.装备强化玩法.模块仓库.test.安装位置.物品键 = '别的';
assert.equal(battle.weaponMoves(mismatched)[0].accuracyTier, '手枪级');

const legacy = initial();
legacy.stat_data.武器列表.枪 = {
  名称: '非凡短剑', 序列: '序列8', isEquipped: true,
  $战斗分类: cls('近战无精度', '近战'),
  战斗效果: { 基础效果: '物理攻击', 额外效果: '攻击DEBUFF', 范围: '单体' },
};
assert.equal(battle.weaponMoves(legacy)[0].mode, 'legacy');
assert.equal(battle.weaponMoves(legacy)[0].effects[0].effectTarget, 'target');
const legacyResult = battle.act(atRange(begin(legacy)), { type: 'weapon', key: '枪' });
assert.equal(legacyResult.ok, true);
assert.ok(legacyResult.battle.enemy.hp < 900);
assert.ok(legacyResult.battle.enemy.effects.some(effect => effect.name === '攻击DEBUFF'));
const healed = initial();
healed.stat_data.当前活力 = 40;
healed.stat_data.武器列表.枪 = {
  名称: '疗愈杖', 序列: '序列5', isEquipped: true,
  战斗效果: { 基础效果: '活力恢复', 额外效果: '防御BUFF' },
};
const healMove = battle.weaponMoves(healed)[0];
assert.equal(healMove.mode, 'legacy');
const healResult = battle.act(begin(healed), { type: 'weapon', key: '枪' });
assert.equal(healResult.ok, true);
assert.ok(healResult.battle.player.hp > 40);
assert.ok(healResult.battle.player.effects.some(effect => effect.name === '防御BUFF'));
assert.equal(healed.stat_data.当前活力, 40);
console.log('savant weapon battle: projection, equipped gate, range, hit, miss, legacy and recovery passed');
}

// ---- weapon-classifier ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const requests = [];
let response = '';
let settings = { useCustomApi: false };
const context = { console, structuredClone, Date, Math, Uint32Array, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { return modules[key]; },
  },
} };
context.window = context;
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = {
  async generateRaw(config) { requests.push(config); return response; },
  async getChatMessages() { return []; },
};
for (const name of ['battle-experience', 'battle-terrain-presets', 'natural-environment',
  'savant-material', 'savant-enhancement', 'weapon-classifier', 'initial-placement', 'battlefield-painter',
  'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', `${name}.js`), 'utf8'),
    context, { filename: name });
}
const classifier = modules['cryptLord.weaponClassifier'];
const painter = modules['cryptLord.battlefieldPainter'];
const battle = modules['cryptLord.personalBattleState'];
const pistol = { 名称: '左轮', 序列: '序列10', 描述: '六发转轮手枪', isEquipped: true };
const classRow = (name = '左轮', accuracy = '手枪级') =>
  ({ 名称: name, 威力量级: '手枪级', 精度: accuracy, 射程: '中距离', AOE: '无AOE' });
const initial = () => ({ stat_data: {
  名称: '测试者', 当前序列: '序列10', 活力: 100, 当前活力: 100,
  灵性: 100, 当前灵性: 100, 敏捷: 30, 当前敏捷: 30,
  武器列表: { $meta: { extensible: true }, 枪: structuredClone(pistol),
    重名: structuredClone(pistol), 高阶: { 名称: '神枪', 序列: '序列6' } },
} });
const started = data => battle.start(data, { enemyHp: 900, enemyPower: 1 }).data;

assert.equal(classifier.rankOf('普通'), 10);
assert.equal(classifier.rankOf('序列8(准)'), 8);
assert.equal(classifier.rankOf('旧日'), -1);
const source = initial();
assert.equal(classifier.collect(source).map(row => row.key).join(','), '枪');
assert.equal(classifier.section([]), '');
assert.match(classifier.section(classifier.collect(source)), /左轮/);
const parsed = classifier.parse([classRow('不在清单'), classRow('左轮', '作弊级'),
  classRow(), classRow('左轮', '步枪级')]);
assert.equal(parsed.size, 2);
assert.equal(parsed.get('左轮').精度, '手枪级');
assert.equal(classifier.valid(classRow()), true);
assert.equal(classifier.valid(classRow('左轮', '作弊级')), false);
const requested = classifier.collect(source);
const snapshot = JSON.stringify(source);
const applied = classifier.apply(source, requested, parsed);
assert.equal(applied.applied, 1);
assert.equal(applied.data.stat_data.武器列表.枪.$战斗分类.精度, '手枪级');
assert.equal(applied.data.stat_data.武器列表.重名.$战斗分类, undefined);
assert.equal(JSON.stringify(source), snapshot);
assert.equal(classifier.collect(applied.data).length, 1);
const stale = initial();
stale.stat_data.武器列表.枪.描述 = '已经换枪';
assert.equal(classifier.apply(stale, requested, parsed).applied, 0);
const dirty = initial();
dirty.stat_data.武器列表.枪.$战斗分类 = classRow('左轮', '作弊级');
assert.equal(classifier.collect(dirty).length, 1);
assert.equal(classifier.apply(dirty, classifier.collect(dirty), parsed).applied, 1);

const plan = { 场景: '街巷', 基底: { 名称: '平地', 分级: 0 },
  武器分类: [classRow(), classRow('不在清单'), classRow('神枪')] };
response = JSON.stringify(plan);
let result = await painter.generate(started(initial()), '街头冲突');
assert.equal(result.ok, true);
assert.equal(result.classified, 1);
assert.equal(result.data.cryptLord.personalBattle.board.scene, '街巷');
assert.equal(battle.weaponMoves(result.data)[0].name, '左轮');
assert.equal(requests.length, 1);
assert.match(requests[0].ordered_prompts.at(-2).content, /武器分类/);
assert.equal(requests[0].custom_api, undefined);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid', apiKey: 'secret', model: 'secondary' };
result = await painter.generate(started(initial()), '街头冲突');
assert.equal(result.ok, true);
assert.equal(requests.at(-1).custom_api.model, 'secondary');
response = JSON.stringify({ 武器分类: [classRow()] });
result = await painter.generate(started(initial()), '街头冲突');
assert.equal(result.ok, true);
assert.equal(result.classified, 1);
assert.equal(result.data.cryptLord.personalBattle.board.generated, true);
response = JSON.stringify({ 场景: '街巷', 武器分类: [classRow('左轮', '作弊级')] });
result = await painter.generate(started(initial()), '街头冲突');
assert.equal(result.ok, true);
assert.equal(result.classified, undefined);
assert.equal(battle.weaponMoves(result.data).length, 0);
const cached = initial();
cached.stat_data.武器列表.枪.$战斗分类 = classifier.parse([classRow()]).get('左轮');
await painter.generate(started(cached), '街头冲突');
assert.equal(classifier.section(classifier.collect({ stat_data: {
  武器列表: { 枪: { ...pistol, $战斗分类: cached.stat_data.武器列表.枪.$战斗分类 } },
} })), '');
console.log('weapon classifier: collect, whitelist, stale guard, prompt, single request and battle move passed');
}

// ---- mystery-reenactment ----
{

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
let settings = { useCustomApi: false };
let response = '<裁定>通过|新增|无|魔豆|魔豆一夜长成巨藤|序列6至4|第五纪更早时期|jack_and_beanstalk|剧情完整阅读|符合</裁定>';
let request;
const context = {
  console, structuredClone, Date, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {},
    async waitGlobalInitialized(key) {
      if (key === 'cryptLord.variableSettlementApi') return { readSettings: async () => settings };
      if (key === 'cryptLord.hostApi') return { generateRaw: async config => {
        request = config;
        return response;
      } };
      throw Error(key);
    },
  } },
};
context.window = context;
for (const filename of ['audience-imagination.js', 'reader-mystic.js', 'mystery-reenactment-reference.js',
  'mystery-reenactment.js', 'battle-experience.js', 'personal-battle-state.js']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', filename), 'utf8'),
    context, { filename });
}
const reenact = modules['cryptLord.mysteryReenactment'];
const battle = modules['cryptLord.personalBattleState'];
const pool = { pathways: {
  窥秘人途径: ['序列9-窥秘人', '序列4-神秘学家', '序列3-预言大师', '序列1-知识皇帝'],
  观众途径: ['序列9-观众', '序列4-操纵师', '序列3-织梦人', '序列1-作家'],
}, abilities: {} };
const initial = () => ({ stat_data: {
  名称: '艾琳', 当前序列: '序列4-神秘学家', 活力: 5000, 当前活力: 5000,
  敏捷: 2000, 当前敏捷: 2000, 灵性: 5000, 当前灵性: 5000,
  理智: 5000, 当前理智: 5000, 人性: 5000, 当前人性: 5000,
  运气: 20, 序列能力列表: {},
}, npc_data: { 对手: { 当前序列: '序列4-神秘学家', 活力: 10000,
  当前活力: 10000, 敏捷: 5 } } });
const baseData = initial();
assert.equal(reenact.gate(baseData, pool).slots, 1);
assert.equal(reenact.gate(baseData, pool).capacity, 5);
assert.throws(() => reenact.save(baseData, pool, 1, reenact.defaultConfig(1)), /至少认证/);
const submission = { name: '魔豆故事', content: '阅读魔豆长成巨藤的全过程' };
const verdict = await reenact.certify(baseData, pool, submission, '#2 assistant 已完整读过杰克与魔豆');
assert.equal(verdict.action, '新增');
assert.equal(request.custom_api, undefined);
assert.match(request.ordered_prompts.at(-2).content, /真实楼层剧情/);
assert.match(request.ordered_prompts.at(-2).content, /已有档案|现有档案/);
assert.match(request.ordered_prompts.at(-2).content, /第零纪：原初混沌/);
assert.match(request.ordered_prompts.at(-2).content, /完整摘要：/);
const created = reenact.apply(baseData, pool, submission, verdict);
assert.equal(created.changed, true);
assert.equal(reenact.gate(created.data, pool).points, 3.2);
assert.equal(created.data.stat_data.序列能力列表['#神秘再现'][0].$神秘再现来源ID, 'jack_and_beanstalk');
assert.equal(reenact.knowledge(baseData).length, 0);
const id = reenact.knowledge(created.data)[0].ID;
assert.equal(reenact.ledger(created.data).jack_and_beanstalk.来源知识ID, id);
const duplicate = reenact.apply(created.data, pool, submission, {
  ...verdict, action: '重复', targetId: id,
});
assert.equal(duplicate.changed, false);
assert.equal(reenact.knowledge(duplicate.data).length, 1);
const merged = reenact.apply(created.data, pool, submission, {
  ...verdict, action: '合并', targetId: id, historyBand: '第四纪',
});
assert.equal(reenact.knowledge(merged.data)[0].总点数, 3.6);
assert.equal(reenact.knowledge(merged.data)[0].提交记录.length, 2);
assert.throws(() => reenact.apply(created.data, pool, submission, {
  ...verdict, action: '合并', targetId: 'missing',
}), /不存在/);
assert.throws(() => reenact.parseVerdict('<裁定>通过|新增|无|a|b|坏档|第四纪|无|e|r</裁定>'), /无效/);
assert.throws(() => reenact.parseVerdict('<裁定>通过|新增|无|a|b|序列6至4|第四纪|无|e|r\n恶意</裁定>'), /格式/);
assert.equal(reenact.parseVerdict('<裁定>不通过|拒绝|无|无|无|普通人或无法确定|第五纪当前阶段或年代无法确定|无|无|证据不足</裁定>').ok, false);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid', apiKey: 'secret', model: 'secondary' };
response = '<裁定>通过|重复|' + id + '|魔豆|魔豆长成巨藤|序列6至4|第四纪|无|读过|重复</裁定>';
await reenact.certify(created.data, pool, submission, '已有剧情');
assert.equal(request.custom_api.model, 'secondary');
const cfg = reenact.defaultConfig(1);
cfg.名称 = '火花';
const saved = reenact.save(created.data, pool, 1, cfg);
assert.equal(saved.stat_data.序列能力列表['#神秘再现'].length, 2);
assert.throws(() => reenact.save(saved, pool, 2, cfg), /不可用/);
const highCost = { ...cfg, 强度档: 4 };
assert.throws(() => reenact.save(created.data, pool, 1, highCost), /只有/);
const removed = reenact.removeKnowledge(saved, pool, id);
assert.equal(reenact.knowledge(removed).length, 0);
assert.equal(removed.stat_data.序列能力列表['#神秘再现'].length, 1);
assert.equal(removed.stat_data.序列能力列表['#神秘再现'][0].名称, '神秘再现·杰克与豌豆');
assert.equal(reenact.configs(removed)[1].名称, '火花');
const noGate = structuredClone(removed);
noGate.stat_data.当前序列 = '序列9-窥秘人';
reenact.sync(noGate, pool);
assert.equal(noGate.stat_data.序列能力列表['#神秘再现'], undefined);
assert.equal(reenact.ledger(noGate).jack_and_beanstalk.来源知识ID, id);
const full = structuredClone(created.data);
for (let i = 1; i < 5; i++) {
  const row = structuredClone(reenact.knowledge(full)[0]);
  row.ID = `test-${i}`; row.总点数 = 0;
  full.stat_data.$专属玩法.窥秘人途径.神秘再现玩法.知识档案[row.ID] = row;
}
assert.equal(reenact.knowledge(full).length, 5);
assert.throws(() => reenact.apply(full, pool, submission, verdict), /档案已满/);
const replaced = reenact.apply(full, pool, submission, verdict, 'test-1');
assert.equal(reenact.knowledge(replaced.data).length, 5);
assert.equal(reenact.knowledge(replaced.data).some(row => row.ID === 'test-1'), false);
const canonical = reenact.buildCanon('spear_of_longinus', created.data);
assert.equal(canonical.range, 'global');
assert.equal(reenact.buildCanon('jack_and_beanstalk', created.data).effects[0].stat, 'movement');
const mixed = structuredClone(created.data);
mixed.stat_data.当前序列 = '序列4-神秘学家/序列3-预言大师';
assert.equal(reenact.gate(mixed, pool).rank, 3);
assert.ok(reenact.buildCanon('boys_magic_horn', mixed).power >
  reenact.buildCanon('boys_magic_horn', created.data).power);
const imagined = initial();
imagined.stat_data.当前序列 = '序列1-作家';
const imagination = modules['cryptLord.audienceImagination'];
const granted = imagination.save(imagined, pool, ['窥秘人途径', '']);
assert.equal(reenact.gate(granted, pool).unlocked, true);
assert.equal(reenact.gate(imagination.save(granted, pool, ['', '']), pool).unlocked, false);
const combat = battle.start(saved, { npcKey: '对手', imaginationPool: pool });
assert.equal(combat.ok, true);
combat.data.cryptLord.personalBattle.enemy.x = 3;
const acted = battle.act(combat.data, { type: 'ability', group: '#神秘再现', index: 0 });
assert.equal(acted.ok, true, acted.error);
assert.ok(acted.battle.enemy.hp < 10000);
assert.ok(acted.battle.enemy.effects.some(effect => effect.stat === 'movement'));
console.log('mystery reenactment: knowledge, verdict, capacity, canon, custom spell and battle OK');
}
