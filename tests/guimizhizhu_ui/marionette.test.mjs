import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
let settings = { useCustomApi: false }, requested, raw;
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const name of ['audience-imagination', 'battle-experience', 'battle-field-effect-reference',
  'battle-play-reference', 'battle-play-units', 'marionette-reference', 'marionette-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { requested = config; return raw; } };
const service = modules['cryptLord.marionetteState'], reference = modules['cryptLord.marionetteReference'];
const plain = value => JSON.parse(JSON.stringify(value));
const pool = { pathways: { 占卜家途径: ['序列5-秘偶大师', '序列1-诡秘侍者', '序列0.5-愚者'],
  猎人途径: ['序列9-猎人'], 观众途径: ['序列1-作家'] }, pictureConfig: {}, abilities: {} };
const card = { 名称: '甲', 当前序列: '序列9-猎人', 模板: '普通', 能力清单: [],
  活力: 100, 当前活力: 65, 灵性: 80, 当前灵性: 73, 敏捷: 60, 当前敏捷: 55,
  理智: 70, 当前理智: 60, 人性: 40, 当前人性: 39, 运气: 50,
  神性: 1, 能力体系: '肉身武技系', 性格: '原人格', 事件历史: { 战斗: '不能丢失' },
  关键记忆: { 入场: '人物原记忆' }, id: 'legacy', 创建时间: 'old', 来源剧情: 'old-story' };
const data = { stat_data: { 名称: '玩家', 当前序列: '序列5-秘偶大师',
  当前区域: '鲁恩', 当前地标: '廷根',
  人物关系列表: { 甲: { 名称: '甲', 性格: '主观人格', 关系: '俘虏', 好感度: 45 } } },
  npc_data: { 甲: structuredClone(card), 分身: { ...card, $寄生分身: true } },
  cryptLord: { teamComposition: { version: 1, allyTeam: [
    { name: '甲', dataSource: 'npc' }, { name: '甲', dataSource: 'clone' } ], enemyTeam: [] } } };
const before = JSON.stringify(data);
let session = service.create(data, pool, { confirm: async () => true });
const mode = session.mode;
assert.equal(mode.candidates(session.win.game).length, 1);
for (const [rank, cap] of [[5, 3], [4, 5], [.5, 11], [0, 13], [-1, 15], [-2, 17]])
  assert.equal(mode.capOf(rank), cap);
assert.equal(reference.rank('序列0.5-愚者'), .5);
assert.equal(reference.rank('序列2-旧日侍者'), 2);
assert.equal(service.gate({ stat_data: { 当前序列: '序列6-无面人', 当前途径: '占卜家' } }, pool).unlocked, false);
assert.equal(service.gate({ stat_data: { 当前序列: '支柱-诡秘之主' } }, pool).rank, -2);
const projection = structuredClone(data);
projection.stat_data.当前序列 = '序列1-作家';
projection.stat_data.$专属玩法 = { 观众途径: { 空想玩法: {
  空想栏位: { 栏位1: { 途径: '占卜家途径' } } } } };
assert.equal(service.gate(projection, pool).unlocked, true);

// Compare migrated prompts/parsers against independent extraction of the source.
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37f-js-pathway-cores.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('const MarionetteMode =')),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const properties = ast.statements[0].declarationList.declarations[0].initializer.properties;
const methods = ['promptCertify', 'promptStory', 'parseCertifyVerdicts', 'parseStoryVerdicts', 'capOf'];
const original = vm.runInNewContext(`({ BASE_CAP: 3, CAP_STEP: 2, GATE: 5,
  ${properties.filter(node => methods.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join(',\n')} })`);
original.findSeqString = mode.findSeqString.bind(mode);
assert.equal(mode.promptCertify('玩家', '序列5', '甲'), original.promptCertify('玩家', '序列5', '甲'));
assert.equal(mode.promptStory('玩家', '序列5', 'library', '甲'), original.promptStory('玩家', '序列5', 'library', '甲'));
raw = '<裁定>\n1|通过|证据成立\n2|不通过|没有证据\n</裁定>';
assert.deepEqual(plain(mode.parseCertifyVerdicts(raw, 2)), plain(original.parseCertifyVerdicts(raw, 2)));
assert.equal(mode.parseCertifyVerdicts('胡说', 1), null);
const storyRaw = '<裁定>\n通过|丙|序列9-猎人|亲手制成\n通过|丁|虚构序列|不可识别\n</裁定>';
assert.deepEqual(plain(mode.parseStoryVerdicts(storyRaw)), plain(original.parseStoryVerdicts(storyRaw)));
assert.equal(mode.parseStoryVerdicts(storyRaw).passed[1].ok, false);

mode.collectPicks = () => mode.candidates(session.win.game);
await session.action('certify');
assert.deepEqual(plain(session.data.npc_data.甲), { ...card, $秘偶: true });
assert.deepEqual(plain(session.data.stat_data.人物关系列表), data.stat_data.人物关系列表);
assert.equal(session.data.stat_data.辅助能力列表['#秘偶'].战斗效果, undefined);
assert.equal(requested.custom_api, undefined);
assert.equal(requested.max_chat_history, 0);
assert.equal(mode.occupied(session.win.game), 1);
await session.action('revert', '甲');
const bag = mode.bag(session.win.game, false);
assert.equal(bag.甲.$id, 'legacy');
assert.equal(bag.甲.id, undefined);
assert.deepEqual(plain(bag.甲.$入册快照.主观), data.stat_data.人物关系列表.甲);
assert.equal(session.data.npc_data.甲, undefined);
assert.deepEqual(plain(session.data.cryptLord.teamComposition.allyTeam), [{ name: '甲', dataSource: 'clone' }]);
await session.action('do-promote', '甲');
assert.deepEqual(plain(session.data.npc_data.甲.事件历史), card.事件历史);
assert.deepEqual(plain(session.data.npc_data.甲.关键记忆), card.关键记忆);
assert.equal(session.data.npc_data.甲.$id, 'legacy');
assert.equal(session.data.npc_data.甲.id, undefined);
await session.action('unmark', '甲');
assert.equal(session.data.npc_data.甲.$秘偶, undefined);
assert.equal(session.data.stat_data.辅助能力列表['#秘偶'], undefined);
assert.deepEqual(plain(session.data.npc_data.甲.事件历史), card.事件历史);

const rec = mode.buildRecord('丙', '序列9-猎人', '#0');
assert.equal(rec.$战斗经验, 0);
assert.equal(rec.能力清单[0].$系统兜底攻击, true);
assert.equal(rec.当前活力, rec.活力);
assert.equal(rec.当前运气, undefined);
assert.ok(rec.$id.startsWith('puppet-'));
const synthesis = modules['cryptLord.battleFieldEffectReference'].create({ Math,
  parseSequenceRank: reference.rank, GameDBManager: { DB: {
    ...modules['cryptLord.battleFieldEffectReference'].summonDefaults(),
    abilitySystemDB: {}, godPathways: pool.pathways, sequenceAbilities: {} } } }).summon;
const expected = synthesis.synthesizeRecord('序列9-猎人');
for (const key of ['神性', '能力体系', '活力', '敏捷', '灵性', '理智', '人性', '运气'])
  assert.equal(rec[key], expected[key]);
mode.bag(session.win.game, true).丙 = rec;
await session.action('reroll', '丙');
await session.action('do-promote', '丙');
assert.equal(session.data.npc_data.丙.性格, '没有自己的意志，完全听从玩家。');
assert.equal(session.data.stat_data.人物关系列表.丙.好感度, 150);
assert.equal(session.data.npc_data.丙.当前活力, rec.当前活力);
await session.action('revert', '丙');
await session.action('drop', '丙');
assert.equal(mode.bag(session.win.game, false).丙, undefined);
assert.equal(mode.nameTaken(session.win.game, '甲').length > 0, true);
assert.equal(mode.nameTaken(session.win.game, '__proto__').length > 0, true);
assert.equal(JSON.stringify(data), before);

// Story candidates are drafts until explicit confirmation; invalid rows leave no empty bags.
const row = (index, name, sequence) => ({ dataset: { mrnRow: String(index) },
  querySelector(selector) { return { value: selector === '.mrn-p-name' ? name : sequence }; } });
let draftSession = service.create(data, pool);
draftSession.state.pending = [{ reason: '通过' }];
draftSession.mode.queryAll = () => [row(0, '甲', '序列9-猎人')];
await draftSession.action('story-add');
assert.equal(draftSession.data.stat_data.$专属玩法, undefined);
draftSession = service.create(data, pool);
draftSession.state.pending = Array.from({ length: 4 }, () => ({ reason: '通过' }));
draftSession.mode.queryAll = () => ['丙', '丁', '戊', '己'].map((name, i) => row(i, name, '序列9-猎人'));
await draftSession.action('story-add');
assert.equal(draftSession.mode.occupied(draftSession.win.game), 3);
assert.match(draftSession.state.notice, /上限不足/);
assert.equal(draftSession.mode.recordOfState(draftSession.data, '己'), null);
const namespaced = structuredClone(data);
namespaced.stat_data.$专属玩法 = { 占卜家途径: { 秘偶玩法: { 秘偶列表: { 甲: rec } } } };
namespaced.cryptLord.teamComposition.allyTeam.push({ name: '甲', dataSource: 'puppet' });
const namespaceSession = service.create(namespaced, pool, { confirm: async () => true });
await namespaceSession.action('drop', '甲');
assert.deepEqual(plain(namespaceSession.data.cryptLord.teamComposition.allyTeam),
  [{ name: '甲', dataSource: 'npc' }, { name: '甲', dataSource: 'clone' }]);

settings = { useCustomApi: true, apiUrl: 'https://example.invalid/api', model: 'test-model', apiKey: 'test' };
await service.request('system', 'user', { latest: 'latest', history: 'history', recent: 'recent' });
assert.equal(requested.custom_api.model, 'test-model');
assert.match(requested.ordered_prompts.at(-1).content, /<历史事件>\nhistory/);
settings = { useCustomApi: true };
await assert.rejects(service.request('system', 'user', ''), /缺少/);
for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
  const locked = structuredClone(data);
  locked.cryptLord.teamBattle = battle;
  await assert.rejects(service.create(locked, pool).action('reroll', '甲'), /战斗/);
}
service.guard({ ...data, cryptLord: { teamBattle: { status: 'finished', settled: true } } });
const bad = structuredClone(data);
bad.stat_data.$专属玩法 = { 占卜家途径: { 秘偶玩法: { 秘偶列表: { 丙: rec } } } };
bad.stat_data.人物关系列表.丙 = { 名称: '已有关系' };
await assert.rejects(service.create(bad, pool).action('do-promote', '丙'), /不能覆盖/);
assert.throws(() => service.validateObjective({ 当前序列: '序列5' }), /六维/);
const failed = service.create(data, pool);
const originalDraft = JSON.stringify(failed.data), originalView = JSON.stringify(failed.state);
failed.mode.action = async () => {
  failed.data.npc_data.甲.$秘偶 = true;
  failed.state.view = 'broken';
  failed.effects.push({ type: 'native-input', text: '不得发布' });
  throw Error('模拟内部失败');
};
await assert.rejects(failed.action('certify'), /内部失败/);
assert.equal(JSON.stringify(failed.data), originalDraft);
assert.equal(JSON.stringify(failed.state), originalView);
assert.equal(failed.effects.length, 0);
failed.mode.action = async () => {
  failed.data.npc_data.甲.$秘偶 = true; failed.state.lastError = '原版捕获的内部失败';
};
await assert.rejects(failed.action('certify'), /本次草稿未提交/);
assert.equal(JSON.stringify(failed.data), originalDraft);
assert.equal(JSON.stringify(failed.state), originalView);
context.DOMException = DOMException;
settings = { useCustomApi: false };
const hostService = modules['cryptLord.hostApi'];
let active = true, assertions = 0;
const protectedOptions = { guard: () => active, assertCurrent: async () => { assertions++; } };
hostService.generateRaw = async () => { active = false; return '<裁定>通过</裁定>'; };
await assert.rejects(service.request('system', 'user', '', '', protectedOptions), /已取消/);
assert.equal(assertions, 1);
active = true;
hostService.generateRaw = async () => { settings = { useCustomApi: true }; return '<裁定>通过</裁定>'; };
await assert.rejects(service.request('system', 'user', '', '', protectedOptions), /设置已变化/);
console.log('Marionette: original prompts/parsers, capacity, projection, marker-only certification, original synthesis, complete lifecycle, snapshots, collisions, battle locks and unified API passed.');
