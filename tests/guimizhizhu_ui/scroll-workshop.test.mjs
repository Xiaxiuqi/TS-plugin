import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
const load = async name => vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
for (const name of ['audience-imagination', 'marionette-reference', 'marionette-state',
  'scroll-crafting', 'scroll-workshop-reference', 'scroll-workshop-state',
  'battle-experience', 'personal-battle-state', 'team-battle-state']) await load(name);
const pool = { pathways: {
  窥秘人途径: ['序列9-窥秘人', '序列7-巫师', '序列6-卷轴教授', '序列5-星象师',
    '序列1-知识皇帝', '序列0-隐匿贤者'],
  观众途径: ['序列1-作家'], 阅读者途径: ['序列4-预言家'],
} };
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列6-卷轴教授',
  灵性: 100, 当前灵性: 100, 活力: 100, 当前活力: 70,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100, 敏捷: 100, 当前敏捷: 100,
  其他列表: {
    一: { 名称: '灵性粉末', 类型: '灵性材料', 序列: '序列6', 数量: 3.5 },
    二: { 名称: '魔药辅材', 类型: '魔药辅助材料', 序列: '序列6', 数量: 2 },
    低阶: { 类型: '灵性材料', 序列: '序列9', 数量: 10 },
  } }, npc_data: { 老师: { 当前序列: '序列4-预言家', 事件历史: { 一: '保留' } } }, cryptLord: {} };
const service = modules['cryptLord.scrollWorkshopState'], reference = modules['cryptLord.scrollWorkshopReference'];
const plain = value => JSON.parse(JSON.stringify(value));
let consent = true, rolls = [], notices = [];
const options = { confirmSync: () => consent, roll: () => rolls.shift(),
  notice: text => notices.push(text) };
const session = service.create(initial, pool, options), { mode, win, state } = session;
const draft = (name, enhancements = {}) => ({ name, rank: 6, description: '完整描述',
  baseEffect: '物理攻击', scope: '单体', extraEffect: '攻击BUFF', enhancements });
const save = async (config, id = '') => {
  state.draft = config; state.editId = id; await session.action('scroll-save');
  return mode.templates(win).find(row => row.data.名称 === config.name)?.id;
};
const craft = async (key, count, allocation) => {
  Object.assign(state, { materialKey: key, materialQty: count, allocations: allocation });
  return session.action('scroll-craft');
};
// 1. Independently execute the original mode and move builder for exact rule/formula parity.
const originalText = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const originalAst = ts.createSourceFile('original.js', originalText.slice(originalText.indexOf('const MysteryPryerScrollMode =')), 99, true, ts.ScriptKind.JS);
const effectText = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt', import.meta.url), 'utf8');
const effectAst = ts.createSourceFile('effects.js', effectText, 99, true, ts.ScriptKind.JS);
const builder = effectAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'ConsumableMoveBuilder');
const averages = { 6: { 活力: 100, 灵性: 100, 理智: 100, 人性: 100, 敏捷: 100 } };
const original = vm.runInNewContext(`${builder.getText(effectAst)}
${originalAst.statements[0].getText(originalAst)}
({mode: MysteryPryerScrollMode, builder: ConsumableMoveBuilder})`, {
  window: {}, GameDBManager: { DB: { consumableConfig: { avgAttrByRank: averages } } },
  parseSequenceRank: modules['cryptLord.marionetteReference'].rank,
  SkillRange: { isAllType: type => ['all', 'allAlly', 'allEnemies', 'allAllies'].includes(type) },
  Move: class { constructor(config) { Object.assign(this, config); } },
});
original.mode.gate = () => mode.gate(win);
for (const rank of [-2, -1, 0, .2, .5, 1, 6, 7]) {
  assert.deepEqual(plain(mode.selectableRanks(rank)), plain(original.mode.selectableRanks(rank)));
}
for (const base of mode.BASE_EFFECTS) for (const scope of ['单体', '全体']) {
  assert.deepEqual(plain(mode.validExtras(base, scope)), plain(original.mode.validExtras(base, scope)));
}
assert.equal(service.gate(initial, pool).unlocked, true);
assert.equal(service.gate({ stat_data: { 当前序列: '序列7-巫师' } }, pool).unlocked, false);
const projected = { stat_data: { 当前序列: '序列1-作家',
  $专属玩法: { 观众途径: { 空想玩法: { 空想栏位: { 栏位1: { 途径: '窥秘人途径' } } } } } } };
assert.equal(service.gate(projected, pool).unlocked, true);
assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
session.render(); assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
assert.equal(mode.materials(win).find(row => row.key === '一').available, 3);
// 2. Whole editor/library/stock lifecycle: exact versions, independent rolls and old products immutable.
const id = await save(draft('燃焰卷轴', { 威力: 2 }));
const template = mode.template(win, id);
assert.equal(template.版本, 1);
assert.equal(mode.chanceFor(win, template), original.mode.chanceFor(win, template));
await save(draft('燃焰卷轴', { 威力: 2 }), id);
assert.equal(mode.template(win, id).版本, 1);
await save(draft('燃焰卷轴', { 威力: 3 }), id);
assert.equal(mode.template(win, id).版本, 2);
rolls = [1, 100];
await craft('二', 1, { [id]: 2 });
assert.equal(session.data.stat_data.其他列表.二.数量, 1);
let products = Object.values(session.data.stat_data.消耗品列表).filter(row => row?.$卷轴制造);
assert.equal(products.length, 2);
assert.equal(products.find(row => row.$卷轴增强).数量, 1);
assert.equal(products.find(row => !row.$卷轴增强).数量, 1);
assert.equal(session.data.stat_data.当前灵性, 100);
const oldProducts = JSON.stringify(session.data.stat_data.消耗品列表);
await save(draft('燃焰卷轴', { 威力: 1 }), id);
assert.equal(mode.template(win, id).增强档位.威力, 3);
assert.match(notices.at(-1), /新名称/);
await save(draft('雷霆卷轴', { 威力: 1 }), id);
assert.equal(mode.template(win, id).版本, 3);
assert.equal(JSON.stringify(session.data.stat_data.消耗品列表), oldProducts);
const basicId = await save(draft('普通卷轴'));
await craft('一', 1, { [basicId]: 1 });
await craft('一', 1, { [basicId]: 1 });
assert.equal(session.data.stat_data.其他列表.一.数量, 1.5);
assert.equal(session.data.stat_data.消耗品列表[`#卷轴:${basicId}:v1:普通`].数量, 2);
await session.action('scroll-delete', basicId);
assert.equal(mode.template(win, basicId), null);
assert.equal(session.data.stat_data.消耗品列表[`#卷轴:${basicId}:v1:普通`].数量, 2);
assert.deepEqual(session.data.npc_data, initial.npc_data);
// 3. Original built consumables: real rank, all enhancement fields and bounded team AOE/effects.
context.GameDBManager = { DB: { consumableConfig: { avgAttrByRank: averages } } };
const healTemplate = mode.recordFromDraft({ ...draft('疗愈卷轴', {
  恢复量: 3, 附加效果幅度: 2, 持续回合: 3, 使用灵性消耗: 2, 射程: 1, 全体半径: 3,
}), baseEffect: '活力恢复', scope: '全体', extraEffect: '防御BUFF' }, 'heal', 1);
const heal = mode.productRecord(healTemplate, true, 2);
for (const item of [...products, heal]) {
  assert.deepEqual(plain(reference.build(item, 'test', 6, averages)),
    plain(original.builder.build(item, 'test', 6)));
}
const battleData = structuredClone(initial);
battleData.stat_data.消耗品列表 = { 疗愈: heal };
const personal = modules['cryptLord.personalBattleState'];
const attackData = structuredClone(initial);
attackData.stat_data.消耗品列表 = { 火焰: products.find(row => row.$卷轴增强) };
assert.equal(personal.scrollMoves(attackData)[0].power, 40);
attackData.stat_data.当前序列 = '序列4-预言家';
assert.equal(personal.scrollMoves(attackData)[0].power, 40);
const move = personal.scrollMoves(battleData)[0];
assert.equal(move.cost, 1); assert.equal(move.healAmt, 40);
assert.equal(move.range, 4); assert.equal(move.radius, 5);
assert.equal(move.effects[0].effectTarget, 'allAlly');
assert.equal(move.effects[0].duration, 6);
const friend = { 当前序列: '序列9-窥秘人', 活力: 100, 当前活力: 40,
  灵性: 100, 当前灵性: 100, 敏捷: 10, 理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100 };
battleData.npc_data = { 近友: structuredClone(friend), 远友: structuredClone(friend), 敌人: structuredClone(friend) };
const team = modules['cryptLord.teamBattleState'];
let started = team.start(battleData, { allies: ['近友', '远友'], enemies: ['敌人'] }).data;
assert.ok(started);
const units = started.cryptLord.teamBattle.units;
Object.assign(units[0], { x: 1, y: 1 });
Object.assign(units.find(row => row.id === '近友'), { x: 2, y: 1 });
Object.assign(units.find(row => row.id === '远友'), { x: 10, y: 10 });
Object.assign(units.find(row => row.id === '敌人'), { x: 8, y: 8 });
const choice = team.options(started).find(row => row.id === 'scroll:疗愈');
assert.equal(choice.radius, 5);
assert.equal(choice.targets.includes('远友'), false);
const used = team.action(started, { id: choice.id, target: '近友' }, () => .5);
assert.equal(used.ok, true);
assert.equal(used.data.stat_data.消耗品列表.疗愈.数量, 1);
assert.equal(started.stat_data.消耗品列表.疗愈.数量, 2);
assert.equal(used.battle.units.find(row => row.id === '近友').hp, 80);
assert.equal(used.battle.units.find(row => row.id === '远友').hp, 40);
assert.equal(used.battle.units[0].effects.some(effect => effect.stat === 'defense'), true);
assert.equal(used.battle.units.find(row => row.id === '近友').effects.some(effect => effect.stat === 'defense'), true);
assert.equal(used.battle.units.find(row => row.id === '远友').effects.length, 0);
const enemyDebuffTemplate = { ...healTemplate,
  战斗效果: { ...healTemplate.战斗效果, 额外效果: '攻击DEBUFF' } };
const debuff = mode.productRecord(enemyDebuffTemplate, true, 1);
battleData.stat_data.消耗品列表 = { 疗愈: debuff };
started = team.start(battleData, { allies: ['近友', '远友'], enemies: ['敌人'] }).data;
Object.assign(started.cryptLord.teamBattle.units[0], { x: 1, y: 1 });
Object.assign(started.cryptLord.teamBattle.units.find(row => row.id === '近友'), { x: 2, y: 1 });
Object.assign(started.cryptLord.teamBattle.units.find(row => row.id === '远友'), { x: 10, y: 10 });
Object.assign(started.cryptLord.teamBattle.units.find(row => row.id === '敌人'), { x: 3, y: 1 });
const debuffed = team.action(started, { id: 'scroll:疗愈', target: '近友' }, () => .5);
assert.equal(debuffed.ok, true);
assert.equal(debuffed.data.stat_data.消耗品列表.疗愈, undefined);
assert.equal(debuffed.battle.units.find(row => row.id === '敌人').effects.some(effect => effect.stat === 'attack'), true);
assert.equal(debuffed.battle.units.find(row => row.id === '近友').effects.some(effect => effect.stat === 'attack'), false);
const old = structuredClone(session.data);
delete old.stat_data.$专属玩法.窥秘人途径.卷轴制造玩法.卷轴样式[id].ID;
old.stat_data.其他列表.坏材料 = { 类型: '灵性材料', 数量: Infinity, 序列: '序列6' };
const compatible = service.create(old, pool, options);
compatible.render();
assert.equal(compatible.data.stat_data.$专属玩法.窥秘人途径.卷轴制造玩法.卷轴样式[id].ID, undefined);
assert.equal(compatible.mode.templates(compatible.win)[0].data.ID, id);
assert.equal(compatible.mode.materials(compatible.win).some(row => row.key === '坏材料'), false);
// 4. Cancel, rank/material/allocation/version/name protection and whole-batch exception rollback.
let before = JSON.stringify(session.data);
consent = false;
await session.action('scroll-delete', id);
await craft('一', 1, { [id]: 1 });
assert.equal(JSON.stringify(session.data), before);
consent = true;
await craft('低阶', 1, { [id]: 1 });
assert.equal(JSON.stringify(session.data), before);
await craft('一', 1, {});
assert.equal(JSON.stringify(session.data), before);
rolls = [101];
await assert.rejects(() => craft('一', 1, { [id]: 1 }), /D100/);
assert.equal(JSON.stringify(session.data), before);
rolls = [1, 101];
await assert.rejects(() => craft('二', 1, { [id]: 2 }), /D100/);
assert.equal(JSON.stringify(session.data), before);
await save(draft('__proto__'));
assert.equal(JSON.stringify(session.data), before);
await assert.rejects(() => craft('一', 1, { missing: 1 }), /不存在/);
const invalid = structuredClone(session.data);
invalid.stat_data.$专属玩法.窥秘人途径.卷轴制造玩法.版本 = 2;
await assert.rejects(() => service.create(invalid, pool, options).action('scroll-delete', id), /版本/);
const locked = structuredClone(session.data); locked.cryptLord.teamBattle = { status: 'finished', settled: false };
await assert.rejects(() => service.create(locked, pool, options).action('scroll-delete', id), /战斗/);
const malformed = structuredClone(session.data); malformed.stat_data.$专属玩法 = [];
await assert.rejects(() => service.create(malformed, pool, options).action('scroll-delete', id), /格式/);
const arrayStock = structuredClone(session.data); arrayStock.stat_data.消耗品列表 = products;
const preserved = service.create(arrayStock, pool, options);
await assert.rejects(() => preserved.action('scroll-craft'), /消耗品列表变量格式/);
assert.deepEqual(plain(preserved.data), plain(arrayStock));
const freshFailure = service.create(initial, pool, options);
freshFailure.state.draft = draft('原子批量', { 威力: 1 });
await freshFailure.action('scroll-save');
const freshId = freshFailure.mode.templates(freshFailure.win)[0].id;
Object.assign(freshFailure.state, { materialKey: '二', materialQty: 1, allocations: { [freshId]: 2 } });
const pristine = JSON.stringify(freshFailure.data);
rolls = [1, 101];
await assert.rejects(() => freshFailure.action('scroll-craft'), /D100/);
assert.equal(JSON.stringify(freshFailure.data), pristine);
assert.equal(freshFailure.data.stat_data.消耗品列表, undefined);
console.log('PASS: original rules, whole stock/editor lifecycle, product-to-team battle and atomic safeguards (4 focused groups).');
