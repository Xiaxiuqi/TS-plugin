import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date, Uint32Array,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const name of ['audience-imagination', 'battle-experience', 'battle-field-effect-reference',
  'battle-play-reference', 'battle-play-units', 'savant-material', 'savant-enhancement',
  'marionette-reference', 'marionette-state', 'workshop-reference', 'workshop-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const service = modules['cryptLord.workshopState'], plain = value => JSON.parse(JSON.stringify(value));
const pool = { pathways: { 通识者途径: ['序列6-机械专家', '序列4-炼金术士', '序列1-文明启蒙者'],
  观众途径: ['序列1-作家'] }, pictureConfig: {}, abilities: {} };
const batch = (family, material, traits) => ({ 名称: material, 材质族: family, 具体材质: material,
  等级: '序列4', 关联途径: '无', 性质: traits, 数量: 20, 加工结果: '成功' });
const data = { stat_data: { 名称: '玩家', 当前序列: '序列4-炼金术士', 当前途径: '通识者',
  当前区域: '鲁恩', 当前地标: '廷根', 人物关系列表: {},
  $专属玩法: { 通识者途径: { 材料加工玩法: { 版本: 1, 材料仓库: {
    metal: batch('金属', '钢', ['坚硬', '导电', '韧性', '耐磨']),
    crystal: batch('晶体', '灵晶', ['导灵', '储灵', '坚硬', '耐热']),
    chemical: batch('化学', '燃料', ['易燃', '易爆', '挥发', '导热']),
  } } } } }, npc_data: {}, world_data: { 当前时间纪元: '第五纪1350年9月20日' },
  cryptLord: { teamComposition: { version: 1, allyTeam: [], enemyTeam: [] } } };
const before = JSON.stringify(data);
const options = { confirmSync: () => true, confirm: async () => true, promptSync: () => '改名造物' };
const session = service.create(data, pool, options), mode = session.mode;
assert.equal(service.gate(data, pool).unlocked, true);
assert.equal(service.gate({ stat_data: { 当前序列: '序列7-鉴定师' } }, pool).unlocked, false);
assert.equal(service.gate({ stat_data: { 当前序列: '旧日-知识之妖' } }, pool).rank, -1);
for (const [rank, cap] of [[6, 2], [4, 3], [2, 4], [0, 5], [-1, 5], [-2, 5]])
  assert.equal(mode.capacityOf(rank), cap);
const projection = structuredClone(data);
projection.stat_data.当前序列 = '序列1-作家';
projection.stat_data.$专属玩法.观众途径 = { 空想玩法: { 空想栏位: { 栏位1: { 途径: '通识者途径' } } } };
assert.equal(service.gate(projection, pool).unlocked, true);
// Original deterministic formulas and skill construction are independently compared.
const text = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', text.slice(text.indexOf('const SavantMaterialMode =')), 99, true, ts.ScriptKind.JS);
const names = ['capacityOf', 'repairEfficiency', 'allocateConstructAttributes', 'moduleMaterialError'];
const original = vm.runInNewContext(`({ STAT_KEYS: ['活力','敏捷','灵性','理智','人性','运气'],
  ${ast.statements[0].declarationList.declarations[0].initializer.properties.filter(node => names.includes(node.name.getText(ast)))
    .map(node => node.getText(ast)).join(',\n')} })`);
assert.deepEqual(plain(mode.allocateConstructAttributes(1001, mode.PROFILE_RATES.mixed)),
  plain(original.allocateConstructAttributes(1001, mode.PROFILE_RATES.mixed)));
for (const [material, rank] of [[4, 4], [3, 4], [2, 4], [5, 4]])
  assert.equal(mode.repairEfficiency(material, rank), original.repairEfficiency(material, rank));
function configure(session, type, name) {
  const mode = session.mode, draft = mode.newConstructDraft(type, service.gate(session.data, pool));
  draft.name = name;
  for (const slot of mode.constructLine(type).slots) {
    let selected;
    for (const option of slot.options) {
      const group = mode.materialGroups(session.data).find(row => !mode.moduleMaterialError(row, option, 1));
      if (group) { selected = { 模板ID: option.id, 强度档: 1, 材料签名: group.signature }; break; }
    }
    assert.ok(selected, slot.key);
    draft.structure[slot.key] = selected;
  }
  session.state.constructDraft = draft;
  mode.captureConstructDraft = () => draft;
  return draft;
}
const draft = configure(session, '机械奇物', '机械甲');
assert.equal(mode.validateConstructDraft(session.win, draft).valid, true);
await session.action('construct-create');
let rec = mode.recordOfState(session.data, '机械甲');
assert.ok(rec); assert.equal(rec.$造物类型, '机械奇物');
assert.equal(rec.能力清单[0].power > 0, true);
assert.equal(mode.STAT_KEYS.reduce((sum, key) => sum + rec[key], 0),
  mode.computeConstruct('机械奇物', rec.$结构配置, 4).total);
assert.equal(mode.materialGroups(session.data).reduce((sum, row) => sum + row.qty, 0), 56);
assert.equal(rec.当前活力, rec.活力);
assert.equal(mode.nameError(session.data, '__proto__').length > 0, true);
assert.equal(mode.nameError(session.data, '机械甲').length > 0, true);
const bad = structuredClone(draft);
bad.name = '重用材料';
for (const key of ['机体', '传动', '防护']) bad.structure[key].材料签名 = draft.structure.机体.材料签名;
const scarce = structuredClone(data); scarce.stat_data.$专属玩法.通识者途径.材料加工玩法.材料仓库.metal.数量 = 2;
const scarceSession = service.create(scarce, pool, options);
assert.equal(scarceSession.mode.structureFromDraft(scarceSession.data, bad).valid, false);
const active = mode.defaultConstructAbility(1);
assert.equal(mode.validateConstructAbilities([null, { 模式: 'passive', 名称: '被动', 状态效果: [{ 类型: 'buff' }] }], '机械奇物', 4).valid, false);
assert.equal(mode.validateConstructAbilities([active, { ...active }], '机械奇物', 4).valid, false);
const passive = { 模式: 'passive', 名称: '增益', 状态效果: [{ 类型: 'buff', 属性: 'attack', 强度档: 0 }] };
assert.equal(mode.buildConstructAbility(passive, 2, 4).effects[0].duration, 99);
// Damaged bag -> autonomy, experience, ratio-preserving revoke/regrant, rename.
rec.当前活力 = Math.round(rec.活力 * .4);
session.state.constructTarget = '机械甲';
await session.action('construct-grant-confirm', '机械甲');
assert.equal(session.data.npc_data.机械甲.$完全自主造物, true);
assert.equal(session.effects.length, 0);
assert.equal(mode.allConstructsOfState(session.data).length, 1);
session.data.npc_data.机械甲.事件历史 = { 生活: '自主生活' };
session.data.npc_data.机械甲.关键记忆.补充 = '记忆不丢失';
modules['cryptLord.battleExperience'].award(session.data.npc_data.机械甲, 5000, 4);
await session.action('construct-revoke', '机械甲');
const snapshot = mode.recordOfState(session.data, '机械甲').$自主权快照;
assert.equal(snapshot.客观.事件历史.生活, '自主生活');
await session.action('construct-rename');
rec = mode.recordOfState(session.data, '改名造物');
assert.ok(rec);
await session.action('construct-grant-confirm', '改名造物');
assert.equal(session.data.npc_data.改名造物.名称, '改名造物');
assert.equal(session.data.npc_data.改名造物.事件历史.生活, '自主生活');
assert.equal(session.data.npc_data.改名造物.关键记忆.补充, '记忆不丢失');
const base = session.data.npc_data.改名造物.$造物机械基准;
assert.equal(session.data.npc_data.改名造物.活力, Math.round(base.活力 *
  (1 + session.data.npc_data.改名造物.$战斗经验等级 * .02)));
session.state.constructTarget = '改名造物';
session.data.npc_data.改名造物.当前灵性 = 0;
await session.action('construct-repair-sync');
assert.ok(session.data.npc_data.改名造物.当前灵性 > 0);
await session.action('construct-revoke', '改名造物');
const mechanical = mode.recordOfState(session.data, '改名造物');
const ratio = mechanical.当前活力 / mechanical.活力;
const rebuilt = mode.buildConstructRecord('改名造物', '机械奇物', mechanical.$结构配置,
  mechanical.$能力配置, 4, mechanical);
assert.ok(Math.abs(rebuilt.当前活力 / rebuilt.活力 - ratio) < .001);
configure(session, '魔偶', '魔偶乙');
await session.action('construct-create');
assert.equal(mode.recordOfState(session.data, '魔偶乙').$造物类型, '魔偶');
assert.equal(mode.allConstructsOfState(session.data).length, 2);
assert.equal(mode.syncConstructDisplay(session.data), undefined);
assert.match(session.data.stat_data.辅助能力列表['#制造造物'].描述, /2具/);
session.state.constructTarget = '改名造物';
await session.action('construct-scrap');
assert.equal(mode.recordOfState(session.data, '改名造物'), null);
assert.equal(JSON.stringify(data), before);
for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
  const locked = structuredClone(data); locked.cryptLord.teamBattle = battle;
  await assert.rejects(service.create(locked, pool, options).action('construct-create'), /战斗/);
}
const version = structuredClone(data);
version.stat_data.$专属玩法.通识者途径.制造玩法 = { 版本: 99, 造物列表: {} };
await assert.rejects(service.create(version, pool).action('construct-create'), /版本/);
// A genuine processing fumble consumes its source; it is not a caught transaction exception.
const processingData = structuredClone(data);
processingData.stat_data.其他列表 = { 废金属: { 名称: '废金属', 数量: 2 } };
const processing = service.create(processingData, pool, options);
const source = { ...processing.mode.sources(processing.win)[0], selectedQty: 1 };
const candidate = { family: '金属', material: '钢', grade: '序列4', pathway: '无',
  traits: ['坚硬'], difficulty: 1, operations: ['拆解', '分离', '精炼'], reason: '测试' };
processing.mode.currentQueueRow = () => ({ source, candidates: [candidate] });
processing.state.targetIndex = 0;
processing.mode.readOperations = () => ['萃取', '合成', '淬火'];
processing.mode.rollD100 = () => 100;
await processing.action('material-settle');
assert.equal(processing.state.lastSettlement.result, '大失败');
assert.equal(processing.data.stat_data.其他列表.废金属.数量, 1);
assert.equal(processing.state.view, 'settlement');
const failed = service.create(data, pool, options);
configure(failed, '魔偶', '回滚造物');
const beforeFailed = JSON.stringify(failed.data), beforeView = JSON.stringify(failed.state);
failed.mode.action = async () => {
  failed.state.view = 'broken';
  failed.data.stat_data.名称 = '不应保存';
  failed.effects.push({ type: 'native-input', text: '不应发布' });
  throw Error('模拟工坊内部失败');
};
await assert.rejects(failed.action('construct-create'), /工坊内部失败/);
assert.equal(JSON.stringify(failed.data), beforeFailed);
assert.equal(JSON.stringify(failed.state), beforeView);
assert.equal(failed.effects.length, 0);
console.log('Workshop: original formulas, both types, material plans, skill budget, autonomy/experience/snapshots, ratios and guards passed.');
