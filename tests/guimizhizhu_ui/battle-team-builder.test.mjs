import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
const context = vm.createContext({ console, structuredClone, window: { cryptLord: {
  __stage1Modules: modules, contract: { initializeGlobal(key, value) { modules[key] = value; },
    releaseGlobal() {} },
} } });
const read = file => readFile(new URL(file, import.meta.url), 'utf8');
await vm.runInContext(await read('../../public/guimizhizhu_ui/core/battle-team-builder.js'), context);
const builder = modules['cryptLord.battleTeamBuilder'];
const plain = value => JSON.parse(JSON.stringify(value));
const card = name => ({ 名称: name, 当前序列: '序列5-秘偶大师', 活力: 100, 当前活力: 50,
  敏捷: 50, 当前敏捷: 25, 灵性: 80, 当前灵性: 20, 理智: 100, 当前理智: 80,
  人性: 70, 当前人性: 60, 运气: 55 });
const data = { stat_data: { ...card('本体'), 人物关系列表: { 乙: { isImportant: true } } },
  npc_data: { 甲: card('显示名甲'), 乙: card('乙'), 丙: { ...card('丙'), 当前活力: 0 }, $meta: {} } };
const bag = { 同名: card('同名') };
modules['cryptLord.battlePlayUnits'] = { sources: () => [{ allowed: true,
  play: { BAG_SOURCE: 'clone', recordsOfState: () => Object.entries(bag).map(([name, data]) => ({ name, data })) } }] };
const before = JSON.stringify(data);
let roster = builder.roster(data);
assert.deepEqual(plain(roster.map(row => row.name)), ['本体', '乙', '显示名甲', '丙', '同名']);
assert.equal(builder.filter(roster, '甲')[0].descriptor.name, '甲');
assert.equal(builder.filter(roster, '显示名')[0].descriptor.name, '甲');
assert.equal(builder.filter(roster, '不在名单').length, 0);
assert.equal(roster.find(row => row.name === '丙').available, false);
assert.deepEqual(plain(roster[0].stats.map(row => row.percent)), [50, 50, 25, 80, 86, 100]);
const npc = { name: '甲', dataSource: 'npc' }, clone = { name: '同名', dataSource: 'clone' };
let draft = builder.edit(builder.defaults(), npc, 'enemyTeam');
draft = builder.edit(draft, clone, 'allyTeam');
assert.deepEqual(plain(builder.resolve(data, {}, draft).allies), ['play:clone:%E5%90%8C%E5%90%8D']);
draft = builder.edit(draft, npc, 'allyTeam');
assert.equal(draft.enemyTeam.length, 0);
draft = builder.edit(draft, npc, 'enemyTeam');
assert.throws(() => builder.edit(draft, { name: '<User>', dataSource: 'player' }, null));
let saved = builder.save(data, {}, draft);
assert.equal(saved.changed, true);
assert.equal(builder.save(saved.data, {}, draft).changed, false);
assert.equal(JSON.stringify(data), before, 'All reads and writes leave supplied floor unchanged.');
assert.deepEqual(plain(builder.load(JSON.parse(JSON.stringify(saved.data)))), plain(draft));
assert.equal(saved.data.cryptLord.teamComposition.allyTeam[1].data, undefined);
const missing = structuredClone(saved.data);
delete missing.npc_data.甲;
assert.equal(builder.resolve(missing).missing[0].name, '甲');
assert.equal(builder.load(missing).enemyTeam.length, 1, 'Missing members are not silently deleted.');
assert.throws(() => builder.save(missing, {}, builder.load(missing)), /不可用/);
modules['cryptLord.battlePlayUnits'].sources = () => [{ allowed: false, play: {} }];
assert.equal(builder.resolve(saved.data).missing[0].dataSource, 'clone');
modules['cryptLord.battlePlayUnits'].sources = () => [{ allowed: true,
  play: { BAG_SOURCE: 'clone', recordsOfState: () => [{ name: '同名', data: card('同名') }] } }];
const conflict = structuredClone(saved.data);
conflict.cryptLord.teamComposition.enemyTeam = [];
assert.throws(() => builder.save(conflict, {}, draft, saved.data.cryptLord.teamComposition), /发生变化/);
const invalid = structuredClone(saved.data);
invalid.cryptLord.teamComposition.version = 3;
assert.throws(() => builder.load(invalid), /版本/);
assert.equal(builder.save(invalid, {}, builder.defaults()).ok, true, 'Explicit clear repairs unknown versions.');
assert.throws(() => builder.normalize({ version: 1, allyTeam: [], enemyTeam: [npc, npc] }), /重复/);
assert.throws(() => builder.normalize({ version: 1, allyTeam: [], enemyTeam: [{ name: 'constructor', dataSource: 'npc' }] }));
assert.throws(() => builder.normalize({ version: 1, allyTeam: [], enemyTeam: [{ name: '甲', dataSource: 'unknown' }] }));
const full = { version: 1, allyTeam: Array.from({ length: 60 }, (_, i) => ({ name: `甲${i}`, dataSource: 'npc' })), enemyTeam: [] };
assert.throws(() => builder.normalize(full), /保留/);
const active = structuredClone(saved.data);
active.cryptLord.teamBattle = { status: 'active' };
assert.throws(() => builder.save(active, {}, draft), /进行中/);
assert.throws(() => builder.important(active, '甲'), /进行中/);
const marked = builder.important(data, '乙');
assert.equal(marked.data.npc_data.乙.isImportant, false);
assert.equal(marked.data.stat_data.人物关系列表.乙.isImportant, false);
const unmarked = builder.important(marked.data, '乙');
assert.equal(unmarked.data.npc_data.乙.isImportant, true);
assert.equal(unmarked.data.stat_data.人物关系列表.乙.isImportant, true);
const legacy = builder.importLegacy(JSON.stringify({ allyTeam: [clone], enemyTeam: [npc] }));
assert.equal(legacy.allyTeam[0].dataSource, 'player');
assert.deepEqual(plain(legacy.enemyTeam), [npc]);
assert.throws(() => builder.importLegacy('broken'), /JSON/);
assert.throws(() => builder.importLegacy(JSON.stringify({ allyTeam: [], enemyTeam: [{ name: '<User>', dataSource: 'player' }] })), /本体/);
const same = structuredClone(data);
same.npc_data.同名 = card('同名');
const sameDraft = builder.edit(legacy, { name: '同名', dataSource: 'npc' }, 'enemyTeam');
assert.equal(builder.resolve(same, {}, sameDraft).missing.length, 0);
assert.equal(builder.resolve(same, {}, sameDraft).enemies.length, 2, 'Same-name sources stay separate.');
same.npc_data['play:clone:%E5%90%8C%E5%90%8D'] = card('编号冲突');
assert.equal(builder.roster(same).filter(row => row.reason.includes('编号')).length, 2);

// Execute original search, ordering and serialized identity methods for direct comparison.
const source = await read('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32c-js-battle-ui.txt');
const ast = ts.createSourceFile('original.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'TeamBuilderUI');
const methods = ['getFilteredAvailableCharacters', 'isCharacterImportant', 'sortAvailableCharacters', 'saveTeamComposition'];
let originalSaved;
const original = vm.runInNewContext(`new class { ${cls.members.filter(node => methods.includes(node.name?.getText(ast)))
  .map(node => node.getText(ast)).join('\n')} }`, { localStorage: { setItem(key, value) {
    assert.equal(key, 'battle-team-composition'); originalSaved = JSON.parse(value);
  } } });
original.battleUI = { currentMvuState: data };
original.availableCharacters = Object.entries(data.npc_data).filter(([name]) => name !== '$meta')
  .map(([name, data]) => ({ name, dataSource: 'npc', data }));
original.characterSearchQuery = '显示名';
assert.deepEqual(Array.from(original.getFilteredAvailableCharacters(), row => row.name),
  plain(builder.filter(builder.roster(data), '显示名').map(row => row.descriptor.name)));
original.sortAvailableCharacters();
assert.deepEqual(Array.from(original.availableCharacters, row => row.name),
  plain(builder.roster(data).filter(row => row.descriptor.dataSource === 'npc').map(row => row.descriptor.name)));
original.allyTeam = [{ ...clone, data: bag.同名 }]; original.enemyTeam = [{ ...npc, data: data.npc_data.甲 }];
original.saveTeamComposition();
assert.deepEqual(originalSaved, { allyTeam: [clone], enemyTeam: [npc] });
assert.equal(JSON.stringify(data), before);
console.log('Team builder: original search/order/identities, six attributes, two-side drafts, native save/restore, missing sources, conflicts and legacy import passed.');
