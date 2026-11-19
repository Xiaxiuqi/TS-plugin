import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {}, context = vm.createContext({ console, structuredClone, Uint32Array,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const name of ['audience-imagination', 'battle-experience', 'battle-field-effect-reference',
  'battle-play-reference', 'battle-play-units', 'savant-material', 'savant-enhancement', 'weapon-classifier',
  'marionette-reference', 'marionette-state', 'workshop-reference', 'workshop-state',
  'enhancement-reference', 'enhancement-state', 'personal-battle-state', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const api = modules['cryptLord.enhancementState'], existing = modules['cryptLord.savantEnhancement'];
const pool = { pathways: { 通识者途径: ['序列7-鉴定师', '序列6-机械专家', '序列1-文明启蒙者'],
  观众途径: ['序列1-作家'] }, pictureConfig: {}, abilities: {} };
const batch = qty => ({ 名称: '钢', 材质族: '金属', 具体材质: '钢', 等级: '序列6',
  关联途径: '无', 性质: ['坚硬'], 数量: qty, 加工结果: '成功' });
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列6-机械专家',
  活力: 100, 当前活力: 90, 武器列表: { 枪: { 名称: '枪', 序列: '序列8', 活力: -5, 敏捷: 10,
    $战斗分类: { 威力量级: '手枪级', 精度: '手枪级', 射程: '中距离', AOE: '无AOE' },
    战斗效果: { 基础效果: '法术攻击', 范围: '单体' }, isEquipped: true } },
  衣物列表: { 制服: { 名称: '制服', 活力: 100, isEquipped: true } },
  $专属玩法: { 通识者途径: { 材料加工玩法: { 版本: 1, 材料仓库: {
    a: batch(10.5), b: batch(12.25),
  } } } } }, npc_data: { 保留: { 当前序列: '普通人' } }, cryptLord: {} };
const plain = value => JSON.parse(JSON.stringify(value)), storedPlay = data =>
  data.stat_data.$专属玩法.通识者途径.装备强化玩法;
let consent = true, quantity = '20', host = encodeURIComponent(JSON.stringify(['武器列表', '枪']));
const scope = { querySelector: selector => ({ value: selector === '[data-enhance-draw-qty]' ? quantity : host }) };
const opts = { confirmSync: () => consent, random: () => .25, scope: () => scope };
const session = api.create(initial, pool, opts), mode = session.mode;
// 1. Full original catalog and random rules, isolated reads, canonical/projection gates.
const text = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', text.slice(text.indexOf('const SAVANT_MODULE_RARITIES'),
  text.indexOf('const MysteryAnalysisCore')), 99, true, ts.ScriptKind.JS);
const oracle = vm.runInNewContext(`${ast.statements.filter(node => ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) ||
  ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
  node.expression.expression.getText(ast) === 'Object.assign').map(node => node.getText(ast)).join('\n')}
  ({mode:SavantEquipmentEnhancementMode, config:SAVANT_EQUIPMENT_MODULE_CONFIG});`, {
  window: {}, SavantMaterialMode: { cloneValue: structuredClone,
    rankOfGrade: modules['cryptLord.savantMaterial'].rankOf },
});
const rules = modules['cryptLord.enhancementReference'].create();
assert.deepEqual(plain(rules.config), plain(oracle.config));
assert.equal(Object.keys(rules.config).length, 8);
assert.ok(Object.values(rules.config).every(rows => rows.length === 12));
for (const grade of modules['cryptLord.savantMaterial'].GRADES) {
  assert.equal(mode.gradeScore(grade), oracle.mode.gradeScore(grade));
  assert.deepEqual(plain(mode.probabilities(grade)), plain(oracle.mode.probabilities(grade)));
}
for (const score of [0, 2, 4, 5, 7, 9, 10, 12]) assert.equal(mode.pityFloor(score), oracle.mode.pityFloor(score));
for (const count of [1, 3, 4, 5, 9, 20]) assert.equal(mode.detachRisk(count), oracle.mode.detachRisk(count));
const snapshot = JSON.stringify(session.data); session.render(); assert.equal(JSON.stringify(session.data), snapshot);
assert.equal(api.gate(initial, pool).unlocked, true);
assert.equal(api.gate({ stat_data: { 当前序列: '序列7-鉴定师' } }, pool).unlocked, false);
assert.equal(api.gate({ stat_data: { 当前序列: '知识之妖' } }, pool).unlocked, true);
const projected = structuredClone(initial); projected.stat_data.当前序列 = '序列1-作家';
projected.stat_data.$专属玩法.观众途径 = { 空想玩法: { 空想栏位: { 栏位1: { 途径: '通识者途径' } } } };
assert.equal(api.gate(projected, pool).unlocked, true);
// 2. Entire draw/install/detach lifecycle: multi-batch consumption, pity and exact deltas.
session.state.materialSignature = JSON.stringify(['金属', '钢', '序列6', '无', ['坚硬']]);
consent = false; await session.action('enhance-draw'); assert.equal(JSON.stringify(session.data), snapshot);
consent = true; await session.action('enhance-draw');
const play = storedPlay(session.data), rows = Object.entries(play.模块仓库);
assert.equal(rows.length, 20); assert.equal(new Set(rows.map(([id]) => id)).size, 20);
assert.equal(play.抽取统计.总抽数, 20); assert.equal(play.抽取统计.周期抽数, 0);
assert.equal(rows[19][1].$保底抽取, true);
assert.equal(rows[19][1].品质, '稀有');
const materials = session.data.stat_data.$专属玩法.通识者途径.材料加工玩法.材料仓库;
assert.equal(materials.a, undefined); assert.equal(materials.b.数量, 2.75);
const id = rows[0][0], record = rows[0][1];
await session.action('enhance-open', id); await session.action('enhance-install');
assert.equal(record.安装位置.物品键, '枪');
const deltas = session.data.stat_data.武器列表.枪.$强化模块安装.属性增量;
session.data.stat_data.武器列表.枪.活力 += 3;
consent = false; const installed = JSON.stringify(session.data);
await session.action('enhance-detach'); assert.equal(JSON.stringify(session.data), installed);
consent = true; await session.action('enhance-detach');
assert.equal(session.data.stat_data.武器列表.枪.活力, -2);
assert.equal(session.data.stat_data.武器列表.枪.敏捷, 10);
assert.equal(record.卸下次数, 1); assert.equal(record.安装位置, null);
assert.ok(deltas.活力 !== 0);
record.卸下次数 = 3;
await session.action('enhance-install'); mode.random = () => 0;
await session.action('enhance-detach');
assert.equal(play.模块仓库[id], undefined);
assert.equal(session.data.stat_data.武器列表.枪.活力, -2);
assert.deepEqual(session.data.npc_data, initial.npc_data); assert.equal(initial.stat_data.武器列表.枪.活力, -5);
// 3. Original weapon build routing, production bonuses and durable orphan reconciliation.
const functional = api.create(initial, pool, opts);
const store = functional.mode.store(functional.data, true);
const config = rules.config.金属.find(row => row.weapon);
store.bag.weapon = { 名称: config.name, 品质: '传说', 六维比例: {}, 武器效果: config.weapon,
  安装位置: { 列表键: '武器列表', 物品键: '枪' }, 卸下次数: 0 };
functional.data.stat_data.武器列表.枪.$强化模块安装 = { 模块ID: 'weapon', 属性增量: {} };
const gun = functional.data.stat_data.武器列表.枪;
assert.equal(rules.buildMode(gun), 'accuracy');
const actual = existing.resolveWeapon(gun, functional.data, '武器列表', '枪');
assert.deepEqual(plain(actual), plain(functional.weapon.resolve(gun, functional.data, { 列表键: '武器列表', 物品键: '枪' })));
assert.equal(actual.战斗效果.基础效果, '法术攻击');
assert.notDeepEqual(actual.$战斗分类, gun.$战斗分类);
const moves = modules['cryptLord.personalBattleState'].weaponMoves(functional.data);
assert.equal(moves[0].mode, 'accuracy');
const bare = structuredClone(functional.data);
delete bare.stat_data.武器列表.枪.$强化模块安装;
const bareMoves = modules['cryptLord.personalBattleState'].weaponMoves(bare);
assert.ok(moves[0].accuracyTier !== bareMoves[0].accuracyTier ||
  moves[0].damage !== bareMoves[0].damage || moves[0].range !== bareMoves[0].range);
const melee = structuredClone(gun); melee.$战斗分类.射程 = '近战';
assert.equal(rules.buildMode(melee), 'legacy');
assert.equal(rules.buildMode({ ...melee, 序列: '普通' }), 'accuracy');
store.bag.factory = { 名称: '生产模块', 六维比例: {}, 卸下次数: 0,
  生产增益: { type: 'craftDiscount', value: .8 }, 安装位置: { 列表键: '衣物列表', 物品键: '制服' } };
functional.data.stat_data.衣物列表.制服.$强化模块安装 = { 模块ID: 'factory', 属性增量: { 活力: 10 } };
assert.equal(existing.productionBonuses(functional.data).craftDiscount, .24);
assert.equal(existing.discountedQty(functional.data, 10), 8);
assert.deepEqual(plain(existing.productionBonuses(functional.data)), plain(oracle.mode.productionBonuses(functional.data)));
assert.equal(existing.repairMultiplier(functional.data), oracle.mode.repairMultiplier(functional.data));
functional.data.stat_data.衣物列表.制服.isEquipped = false;
assert.equal(existing.productionBonuses(functional.data).craftDiscount, 0);
delete functional.data.stat_data.武器列表.枪;
delete store.bag.factory;
const damaged = JSON.stringify(functional.data); functional.render();
assert.equal(JSON.stringify(functional.data), damaged);
await functional.action('enhance-reconcile');
assert.equal(store.bag.weapon, undefined);
assert.equal(functional.data.stat_data.衣物列表.制服.活力, 90);
assert.equal(functional.data.stat_data.衣物列表.制服.$强化模块安装, undefined);
const repaired = JSON.stringify(functional.data);
await functional.action('enhance-reconcile'); assert.equal(JSON.stringify(functional.data), repaired);
// 4. Atomic failures, legacy format validation and battle protection.
for (const qty of ['Infinity', '1.5', '0', '100']) {
  quantity = qty; await assert.rejects(() => session.action('enhance-draw'), /数量/);
}
quantity = '1';
const locked = structuredClone(initial); locked.cryptLord.teamBattle = { status: 'finished', settled: false };
await assert.rejects(() => api.create(locked, pool, opts).action('enhance-draw'), /战斗/);
const unsupported = structuredClone(session.data); storedPlay(unsupported).版本 = 2;
await assert.rejects(() => api.create(unsupported, pool, opts).action('enhance-install'), /版本/);
const failing = api.create(initial, pool, opts);
failing.render(); failing.mode.persistAndRefresh = async () => { throw Error('模拟保存失败'); };
const beforeFailure = JSON.stringify(failing.data);
await assert.rejects(() => failing.action('enhance-draw'), /失败/);
assert.equal(JSON.stringify(failing.data), beforeFailure);
console.log('装备强化：原版目录/规则、完整抽取安装卸下、武器与生产接入/引用修复、失败保护，4组通过。');
