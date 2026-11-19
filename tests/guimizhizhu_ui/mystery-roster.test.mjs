import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {}, requests = [];
let response, settings = { useCustomApi: false };
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const file of ['audience-imagination', 'battle-field-effect-reference', 'marionette-reference',
  'marionette-state', 'reader-reference', 'reader-mystic', 'reader-roster-state',
  'mystery-reenactment-reference', 'mystery-reenactment', 'mystery-roster-reference', 'mystery-roster-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${file}.js`, import.meta.url), 'utf8'), context);
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { requests.push(config); return response; } };
const pool = { pathways: {
  窥秘人途径: ['序列9-窥秘人', '序列4-神秘学家', '序列3-预言大师', '序列1-知识皇帝', '序列0-隐匿贤者'],
  阅读者途径: ['序列5-秘术导师'], 观众途径: ['序列1-作家'],
}, abilities: {} };
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列4-神秘学家',
  序列能力列表: { 原有能力: [{ 名称: '仪式' }] } }, npc_data: { 老师: { 当前序列: '序列3-预言大师' } }, cryptLord: {} };
const untouched = JSON.stringify(initial);
const service = modules['cryptLord.mysteryRosterState'];
const fields = { '[data-reenact-knowledge-name]': { value: '仪式原理' },
  '[data-reenact-knowledge-content]': { value: '完整的仪式原理' }, '[data-reenact-replacement]': { value: '' } };
const options = { scope: () => ({ querySelector: key => fields[key] }), confirmSync: () => true,
  evidence: { history: '#0 已完整听取', recent: '#1 阅读', latest: '#2 掌握' } };
const session = service.create(initial, pool, options), { core, mode, win, catalog } = session;
const plain = value => JSON.parse(JSON.stringify(value));
const text = (await Promise.all(['37f-js-pathway-cores.txt', '38-js-pathway-play.txt'].map(file =>
  readFile(new URL(`../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${file}`, import.meta.url), 'utf8')))).join('\n');
function object(name) {
  const ast = ts.createSourceFile('original.js', text.slice(text.indexOf(`const ${name} =`)), 99, true, ts.ScriptKind.JS);
  return ast.statements[0].getText(ast);
}
const pathwayText = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37e-js-domain-affairs-window.txt', import.meta.url), 'utf8');
const pathwayAst = ts.createSourceFile('pathways.js', pathwayText.slice(pathwayText.indexOf('const PathwaySeqUtil =')), 99, true, ts.ScriptKind.JS);
const original = vm.runInNewContext(`${pathwayAst.statements[0].getText(pathwayAst)}
${object('MysteryReenactmentCanonCatalog')}
MysteryReenactmentCanonCatalog.ENTRIES.forEach(row => row.battleName = MysteryReenactmentCanonCatalog.PREFIX + row.spellName);
${object('MysteryReenactmentCore')}
${object('MysteryReenactmentMode')}
({core: MysteryReenactmentCore, mode: MysteryReenactmentMode})`, {
  ReaderMysticCore: session.core, ReaderMysticMode: {}, window: {},
  GameDBManager: { DB: { godPathways: pool.pathways } },
});
assert.equal(catalog.ENTRIES.length, 16);
assert.equal(mode.certificationPrompt(win, '仪式', '内容', ''), original.mode.certificationPrompt(win, '仪式', '内容', ''));
for (const rank of [-2, -1, 0, .5, 1, 2, 3, 4, 5]) {
  assert.equal(core.capacityForRank(rank), original.core.capacityForRank(rank));
  assert.equal(core.slotsForRank(rank), original.core.slotsForRank(rank));
}
const verdict = (action = '新增', id = '无', match = 'boys_magic_horn', seq = '序列6至4', era = '第三纪') =>
  `<裁定>\n通过|${action}|${id}|仪式原理|完整知识内容。|${seq}|${era}|${match}|完整阅读证据|掌握理由\n</裁定>`;
for (const raw of [verdict(), 'invalid', '<裁定>不通过|拒绝|无|无|无|普通人或无法确定|第五纪当前阶段或年代无法确定|无|无|未接触</裁定>'])
  assert.deepEqual(plain(mode.parseVerdict(raw)), plain(original.mode.parseVerdict(raw)));
response = 'invalid';
await session.action('reenact-certify');
assert.equal(JSON.stringify(session.data), untouched);
response = '<裁定>不通过|拒绝|无|无|无|普通人或无法确定|第五纪当前阶段或年代无法确定|无|无|未接触</裁定>';
await session.action('reenact-certify');
assert.equal(JSON.stringify(session.data), untouched);
response = verdict();
await session.action('reenact-certify');
let row = core.knowledgeRecords(session.data)[0], id = row.ID;
assert.equal(row.总点数, 4);
assert.equal(core.hasSpellUnlock(session.data, 'boys_magic_horn'), true);
assert.equal(requests[0].custom_api, undefined);
assert.match(requests[0].ordered_prompts.at(-1).content, /<历史事件>[\s\S]*#0/);
const first = JSON.stringify(session.data), created = row.创建时间;
response = verdict('重复', id);
await session.action('reenact-certify');
assert.equal(JSON.stringify(session.data), first);
response = verdict('重复', id, 'snow_white');
await session.action('reenact-certify');
assert.equal(core.knowledgeRecords(session.data).length, 1);
assert.equal(core.hasSpellUnlock(session.data, 'snow_white'), true);
assert.ok(session.data.stat_data.辅助能力列表['#神秘再现:snow_white']);
response = verdict('合并', id, '无', '序列0', '第零纪');
settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', model: 'test', apiKey: '' };
await session.action('reenact-certify');
row = core.knowledgeRecords(session.data)[0];
assert.equal(row.ID, id); assert.equal(row.创建时间, created);
assert.equal(row.提交记录.length, 2);
assert.equal(row.总点数, 6.7);
assert.equal(requests.at(-1).custom_api.model, 'test');
for (let n = 1; n <= 4; n++) core.saveKnowledge(session.data, { ...row, ID: `existing-${n}`, 名称: `档案${n}` });
fields['[data-reenact-replacement]'].value = id;
const full = JSON.stringify(session.data);
response = verdict('重复', id, '无');
await session.action('reenact-certify');
assert.equal(JSON.stringify(session.data), full);
response = verdict('新增', '无', 'invalid-catalog');
await session.action('reenact-certify');
assert.equal(core.knowledgeRecords(session.data).length, 5);
assert.equal(core.knowledgeRecords(session.data).some(row => row.ID === id), false);
assert.equal(core.hasSpellUnlock(session.data, 'invalid-catalog'), false);
assert.equal(core.hasSpellUnlock(session.data, 'boys_magic_horn'), true);
assert.match(session.state.lastVerdict.message, /无效/);
const newest = core.knowledgeRecords(session.data).find(row => !row.ID.startsWith('existing-')).ID;
response = verdict('合并', 'missing-id');
const current = JSON.stringify(session.data);
await session.action('reenact-certify');
assert.equal(JSON.stringify(session.data), current);
// Every spell receives the whole independent archive budget.
session.data.stat_data.当前序列 = '序列3-预言大师';
let config = { ...core.defaultConfig(1), 名称: '星光法术', 强度档: 4, 消耗档: 3 };
mode.scope = () => ({ querySelector: () => ({}) });
mode.readConfig = () => config;
await session.action('reenact-save-spell', 1);
config = { ...config, 名称: '第二法术' };
await session.action('reenact-save-spell', 2);
assert.equal(session.data.stat_data.序列能力列表['#神秘再现'].filter(ab => !ab.$神秘再现来源ID).length, 2);
await session.action('reenact-delete-knowledge', newest);
assert.equal(core.hasSpellUnlock(session.data, 'boys_magic_horn'), true);
for (const existing of core.knowledgeRecords(session.data)) await session.action('reenact-delete-knowledge', existing.ID);
assert.equal(mode.gate(win).points, 0);
assert.equal(core.configs(session.data)[1].名称, '星光法术');
assert.equal(session.data.stat_data.序列能力列表['#神秘再现'].length, 1);
await session.action('reenact-delete-spell', 1);
assert.equal(core.configs(session.data)[1], undefined);
session.data.stat_data.当前序列 = '序列9-窥秘人';
service.sync(session.data, pool);
assert.equal(session.data.stat_data.序列能力列表['#神秘再现'], undefined);
assert.equal(session.data.stat_data.辅助能力列表['#神秘再现:snow_white'], undefined);
session.data.stat_data.当前序列 = '序列4-神秘学家';
modules['cryptLord.mysteryReenactment'].sync(session.data, pool);
assert.equal(session.data.stat_data.序列能力列表['#神秘再现'][0].$神秘再现来源ID, 'boys_magic_horn');
const legacy = structuredClone(session.data);
delete legacy.stat_data.$专属玩法.窥秘人途径.神秘再现玩法.法术栏位;
const legacyRaw = JSON.stringify(legacy);
assert.equal(service.create(legacy, pool).core.hasSpellUnlock(legacy, 'snow_white'), true);
assert.equal(JSON.stringify(legacy), legacyRaw);
const customPool = structuredClone(pool);
customPool.pictureConfig = { consumableConfig: { avgAttrByRank: {
  4: { 活力: 1000, 敏捷: 800, 灵性: 500, 理智: 400, 人性: 300, 运气: 200 },
} } };
const custom = service.create(session.data, customPool);
assert.equal(custom.core.buildCanonBattleAbility('boys_magic_horn', custom.data).power, 400);
assert.equal(custom.core.buildCanonBattleAbility('spear_of_longinus', custom.data).range, 'global');
assert.equal(custom.core.buildCanonBattleAbility('jack_and_beanstalk', custom.data).effects[0].priority, 0);
const high = service.create({ ...initial, stat_data: { ...initial.stat_data, 当前序列: '知识之妖' } }, pool);
for (let n = 0; n < 10; n++) high.core.saveKnowledge(high.data, {
  ID: `high-${n}`, 名称: `神秘知识${n}`, 内容: '不可拆分的知识。', 涉及位阶档: '支柱', 历史年代档: '第零纪',
});
assert.equal(high.mode.gate(high.win).points, 80);
high.data.stat_data.当前序列 = '序列4-神秘学家';
assert.equal(high.mode.gate(high.win).knowledgeCount, 5);
assert.equal(high.core.knowledgeRecords(high.data).length, 10);
assert.equal(high.mode.gate(high.win).points, 40);
const imagined = modules['cryptLord.audienceImagination'].save(
  { ...initial, stat_data: { ...initial.stat_data, 当前序列: '序列1-作家' } }, pool, ['窥秘人途径', '']);
assert.equal(service.gate(imagined, pool).rank, 1);
assert.equal(imagined.stat_data.当前序列, '序列1-作家');
const malformed = structuredClone(initial);
malformed.stat_data.$专属玩法 = { 窥秘人途径: { 神秘再现玩法: { 版本: 99 } } };
await assert.rejects(service.create(malformed, pool, options).action('reenact-certify'), /格式/);
const rollback = service.create(initial, pool, options);
fields['[data-reenact-replacement]'].value = '';
response = verdict();
const previousSync = modules['cryptLord.readerMystic'].sync;
modules['cryptLord.readerMystic'] = { sync() { throw Error('模拟投影失败'); } };
await assert.rejects(rollback.action('reenact-certify'), /投影失败/);
assert.equal(JSON.stringify(rollback.data), untouched);
modules['cryptLord.readerMystic'] = { sync: previousSync };
await assert.rejects(service.create({ ...initial, cryptLord: { teamBattle: { status: 'active' } } }, pool, options)
  .action('reenact-certify'), /战斗/);
await assert.rejects(session.action('reenact-save-spell', 0), /栏位/);
assert.deepEqual(plain(session.data.npc_data), plain(initial.npc_data));
assert.equal(JSON.stringify(initial), untouched);
console.log('Mystery management: original certification/catalog, archive lifecycle, permanent unlocks, editor and native guards passed.');
