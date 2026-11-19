import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const modules = {};
const context = vm.createContext({ console, structuredClone, Math, DOMException, cryptLord: {
  __stage1Modules: modules, contract: { initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal() {}, async waitGlobalInitialized(key) { return modules[key]; } },
} });
context.window = context;
for (const name of ['item-forge-reference', 'equipment-state', 'item-forge', 'ability-state',
  'item-derivation-reference', 'item-derivation'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const forge = modules['cryptLord.itemForge'], reference = modules['cryptLord.itemForgeReference'];
const plain = value => JSON.parse(JSON.stringify(value));
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('const GameDBManager =')),
  99, true, ts.ScriptKind.JS);
const declarations = ast.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations]);
const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseItemSequenceRank',
  'getSequenceBaseValue', 'generateMundaneItemStats', 'generateItemStats'];
const fragments = names.map(name => `const ${declarations.find(row => row.name.getText(ast) === name).getText(ast)};`);
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/item-forge-reference.js', import.meta.url), 'utf8');
for (const text of fragments) assert.ok(generated.includes(text.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')));
const sequence = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const config = plain(reference.defaults);
config.traitDB.空 = { M: [0, 0, 0, 0, 0, 0], A: [0, 0, 0, 0, 0, 0],
  n_bias: [], p_boost: 1, n_boost: 1 };
for (const type of ['武器', '衣物', '饰品', '封印物']) {
  for (const rank of ['普通', '序列9', '序列0', '旧日', '支柱']) {
    for (const trait of ['', '不可名状']) {
      const item = { 名称: type, 类型: type, 序列: rank, 途径: '占卜家' };
      const oracle = vm.runInNewContext(`${fragments.join('\n')};
        ({parseRank: parseItemSequenceRank, mundane: generateMundaneItemStats, extraordinary: generateItemStats})`,
      { GameDBManager: { DB: config }, Math: Object.assign(Object.create(Math), { random: sequence(42) }) });
      const expected = rank === '普通' ? oracle.mundane(item) :
        oracle.extraordinary(forge.baseValue(forge.parseRank(rank)), type, type, item.途径, trait);
      assert.deepEqual(plain(forge.roll(item, trait, sequence(42))),
        { 特质: rank === '普通' ? '' : trait, ...plain(expected) });
    }
  }
}
assert.equal(forge.parseRank(9), 10);
assert.equal(forge.parseRank('旧日侍者·序列2'), 2);
assert.equal(forge.cost({ 序列: '序列0' }, 'reroll_stats'), 547);
console.log('1/4 original functions and seeded equipment parity passed');

let books = { primary: '主库', additional: ['副库'] }, fail = false, invalid = false;
modules['cryptLord.hostApi'] = {
  async getCharWorldbookNames() { return books; },
  async getWorldbook(name) {
    if (fail) throw Error('读取失败');
    if (['【源堡】玩家自建内容', '2历史孔隙'].includes(name)) throw Error(`世界书「${name}」不存在`);
    if (!books.primary && !books.additional.length) return [];
    return name === '副库' ? [{ name: '序列基准', content: '{"9":900}' }] : [
      { name: '序列基准', content: '```jsonc\n{"9":1200, // 主库覆盖\n}\n```' },
      { name: '物品参数', content: '{"武器":{"p":[0.5,0.5],"n":[0.1,0.1],"pW":[1,1,1,1,1,1]}}' },
      { name: '特质图鉴', content: invalid ? '{"坏配置":{"M":[1]}}' :
        '{"轻巧":{"M":[0,0,0,0,1,0],"A":[0,0,0,0,0,0],"n_bias":[0],"p_boost":1.5,"n_boost":1}}' },
    ];
  },
};
await forge.loadConfigs();
assert.equal(forge.baseValue(9), 1200);
assert.ok(forge.traits().includes('轻巧'));
assert.ok(!forge.traits().includes('坏配置'));
assert.ok(Object.values(forge.roll({ 名称: '环', 类型: '饰品', 序列: '普通' }, '', () => .5)).slice(1).every(Number.isFinite));
fail = true;
await assert.rejects(forge.loadConfigs(), /读取失败/);
assert.equal(forge.baseValue(9), 1200);
fail = false; invalid = true;
await assert.rejects(forge.loadConfigs(), /特质图鉴无效/);
invalid = false;
books = { primary: null, additional: [] }; fail = false;
await forge.loadConfigs();
const originalHost = modules['cryptLord.hostApi'];
modules['cryptLord.hostApi'] = {
  async getCharWorldbookNames() { return { primary: '其他库', additional: [] }; },
  async getWorldbookNames() { return ['其他库', '1源堡', '2历史孔隙']; },
  async getWorldbook(name) {
    if (name === '【源堡】玩家自建内容') throw Error('世界书不存在');
    return name === '1源堡' ? [
      { name: '【配置】序列基准', content: '{"9":1000}' },
      { name: '【配置】序列基准', content: '{"9":1200}' },
    ] : name === '2历史孔隙' ? [
      { name: '【配置】序列基准', content: '{"9":900,"8":800}' },
      { name: '【配置】途径矩阵', content: '{"猎人":[1,2,3,4,5,6]}' },
    ] : [{ name: '【配置】序列基准', content: '{"9":999999}' }];
  },
};
await forge.loadConfigs();
assert.equal(forge.baseValue(9), 999999);
assert.equal(forge.baseValue(8), 800);
modules['cryptLord.hostApi'] = originalHost;
await forge.loadConfigs();
console.log('2/4 actual binding priority, shared JSONC and malformed/read-failure rejection passed');

const base = { stat_data: { 剧场点数: 200, 武器列表: {
  $meta: { extensible: true }, a: { 名称: '短剑', 序列: '序列9', isEquipped: false,
    描述: '保留', 活力: 1, $自定义: { x: 1 } }, b: { 名称: '短剑', 活力: 99 },
}, 衣物列表: [{ 名称: '普通衣物', 序列: '普通', 特质: '不可名状' }] },
  npc_data: { 同伴: { x: 1 } }, world_data: { 天气: '晴' } };
let result = base;
for (const [action, price] of [['reroll_stats', 10], ['add_trait', 30], ['reroll_trait', 20], ['remove_trait', 5]]) {
  const previous = result;
  result = forge.apply(result, '武器列表', 'a', '短剑', action, () => .5);
  assert.equal(result.stat_data.剧场点数, previous.stat_data.剧场点数 - price);
  assert.equal(result.stat_data.武器列表.a.特质, ['add_trait', 'reroll_trait'].includes(action) ? '不可名状' : '');
}
assert.deepEqual(plain(result.stat_data.武器列表.b), base.stat_data.武器列表.b);
assert.deepEqual(plain(result.npc_data), base.npc_data);
assert.equal(base.stat_data.武器列表.a.活力, 1);
assert.deepEqual(plain(result.stat_data.武器列表.a.$自定义), { x: 1 });
assert.equal(forge.apply(base, '衣物列表', '0', '普通衣物', 'add_trait', () => .5).stat_data.衣物列表[0].特质, '');
for (const [data, key, action, pattern] of [
  [base, '$meta', 'reroll_stats', /无效/],
  [base, 'a', 'bad', /无效/],
  [{ ...base, stat_data: { ...base.stat_data, 剧场点数: 0 } }, 'a', 'add_trait', /不足/],
  [{ ...base, stat_data: { ...base.stat_data, 装备栏: { 武器: '短剑' } } }, 'a', 'reroll_stats', /卸下/],
]) assert.throws(() => forge.apply(data, '武器列表', key, '短剑', action), pattern);
const equipped = structuredClone(base);
equipped.stat_data.武器列表.a.isEquipped = true;
equipped.stat_data.武器列表.a.已装备 = true;
equipped.stat_data.装备栏 = { 武器: { 名称: '短剑' }, 衣物: '长袍' };
const off = forge.unequip(equipped, '武器列表', 'a', '短剑');
assert.equal(forge.isEquipped(off.stat_data.武器列表.a, off.stat_data), false);
assert.equal(off.stat_data.装备栏.衣物, '长袍');
assert.equal(off.stat_data.剧场点数, 200);
assert.equal(equipped.stat_data.武器列表.a.isEquipped, true);
const installed = structuredClone(base);
installed.stat_data.武器列表.a.$强化模块安装 = { 模块ID: '安装中' };
assert.throws(() => forge.apply(installed, '武器列表', 'a', '短剑', 'reroll_stats'), /强化模块/);
console.log('3/4 all four actions, exact-key isolation, unequip and failure atomicity passed');

const fixtureText = await readFile(new URL('./item-derivation.fixture.js', import.meta.url), 'utf8');
const serviceSources = await Promise.all(['native-floor-source', 'ability-state', 'battle-experience', 'item-forge-reference',
  'item-derivation-reference', 'attribute-recalculation', 'item-derivation', 'equipment-state', 'item-forge', 'state-store']
  .map(name => readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8')));
function fixture() {
  const runtime = { console, structuredClone, DOMException, document: {} }; runtime.window = runtime;
  vm.createContext(runtime); vm.runInContext(fixtureText, runtime);
  serviceSources.forEach(text => vm.runInContext(text, runtime));
  const f = runtime.preview;
  f.floors[2].data.stat_data.剧场点数 = 1000;
  f.floors[2].data.stat_data.武器列表.last.isEquipped = false;
  f.books['1源堡'].push({ name: '物品参数',
    content: '{"武器":{"p":[0,0],"n":[0,0],"pW":[1,0,0,0,0,0]}}' });
  const dynamic = f.modules['cryptLord.dynamicStatus'], load = dynamic.load;
  f.flags.derivations = 0;
  dynamic.load = async (...args) => { f.flags.derivations++; return load(...args); };
  return { ...f, forge: f.modules['cryptLord.itemForge'], runtime };
}
{
  const f = fixture(), loaded = await f.forge.load(2);
  f.emit('GENERATION_STARTED', 'quiet', {}, false);
  f.emit('GENERATION_STARTED', 'quiet_prompt', {}, false);
  f.emit('GENERATION_STARTED', 'normal', { quiet_prompt: true }, false);
  f.emit('GENERATION_STARTED', 'normal', { dryRun: true }, false);
  f.emit('GENERATION_STARTED', 'normal', {}, true);
  let draws = 0;
  const operation = await f.forge.prepareOperation(loaded, '武器列表', 'last', '最后一把剑', 'reroll_stats',
    undefined, () => { draws++; return .5; });
  const count = draws, candidate = plain(operation.data.stat_data.武器列表.last);
  f.modules['cryptLord.itemDerivationReference'].create(loaded.rules).sealed(candidate);
  assert.ok(['活力', '灵性', '理智', '人性', '敏捷', '运气'].every(key => candidate[key] === 0));
  f.flags.failWrite = true;
  await assert.rejects(f.forge.commitOperation(operation), /模拟保存失败/);
  assert.equal(f.forge.operationStatus(operation).phase, 'pending');
  assert.equal(f.flags.derivations, 1);
  assert.equal(f.flags.writes.length, 0);
  f.flags.failWrite = false;
  operation.data.stat_data.剧场点数 = 99999;
  const saved = await f.forge.commitOperation(operation);
  assert.deepEqual(plain(saved.stat_data.武器列表.last), candidate);
  assert.equal(draws, count);
  assert.equal(saved.stat_data.剧场点数, 990);
  await assert.rejects(f.forge.commitOperation(operation), /已保存/);
  assert.equal(f.flags.writes.length, 1);
  assert.equal(f.flags.derivations, 1);
  assert.deepEqual(plain(f.floors.slice(0, 2)), plain(f.initial.slice(0, 2)));
  assert.equal(f.floors[2].message, f.initial[2].message);
  assert.deepEqual(plain(f.floors[2].data.npc_data), plain(f.initial[2].data.npc_data));
  assert.equal(f.modules['cryptLord.itemDerivation'].settle(saved, loaded.rules).changed, false);
}
for (const boundary of ['history', 'hidden', 'battle', 'same-name', 'page', 'metadata', 'branch', 'rules', 'binding',
  'generation', 'service', 'host', 'store', 'source', 'equipment', 'document', 'chat', 'script', 'close', 'late-page', 'late-rules']) {
  const f = fixture();
  if (boundary === 'battle') f.floors[2].data.cryptLord.teamBattle = { status: 'finished', settled: false };
  if (boundary === 'hidden') f.floors[2].is_hidden = true;
  const loaded = await f.forge.load(boundary === 'history' ? 0 : 2);
  if (['history', 'hidden', 'battle'].includes(boundary)) {
    await assert.rejects(f.forge.prepareOperation(loaded, '武器列表', 'last', '最后一把剑', 'reroll_stats'), /只读|结算战斗/);
    continue;
  }
  if (boundary === 'same-name') {
    f.floors[2].data.stat_data.武器列表.last.描述 = '同名的新物品';
    await assert.rejects(f.forge.prepareOperation(loaded, '武器列表', 'last', '最后一把剑', 'reroll_stats'), /已变化/);
    continue;
  }
  let open = true;
  const operation = await f.forge.prepareOperation(loaded, '武器列表', 'last', '最后一把剑', 'reroll_stats');
  f.flags.hold = true;
  const save = f.forge.commitOperation(operation, () => open);
  while (!f.flags.waiting) await new Promise(resolve => setTimeout(resolve, 0));
  if (boundary === 'page') f.flags.page++;
  if (boundary === 'metadata') f.flags.metadata++;
  if (boundary === 'branch') f.flags.branch += '外部变动';
  if (boundary === 'rules') f.books['1源堡'].push({ name: '序列基准', content: '{"9":8000}' });
  if (boundary === 'binding') f.binding.primary = '不同主库';
  if (boundary === 'generation') { f.emit('GENERATION_STARTED', 'normal', {}, false); f.emit('GENERATION_STOPPED'); }
  if (boundary === 'service') f.modules['cryptLord.itemDerivation'] = {};
  if (boundary === 'host') f.modules['cryptLord.hostApi'] = {};
  if (boundary === 'store') f.modules['cryptLord.stateStore'] = {};
  if (boundary === 'source') f.modules['cryptLord.nativeFloorSource'] = {};
  if (boundary === 'equipment') f.modules['cryptLord.equipmentState'] = {};
  if (boundary === 'document') f.runtime.document = {};
  if (boundary === 'chat') f.flags.chat = '另一个聊天';
  if (boundary === 'script') f.flags.script = '另一个脚本';
  if (boundary === 'close') open = false;
  if (boundary === 'late-page') f.modules['cryptLord.dynamicStatus'].assertLoaded = () => { f.flags.page++; };
  if (boundary === 'late-rules') f.modules['cryptLord.dynamicStatus'].assertLoaded = () => {
    f.books['1源堡'].push({ name: '序列基准', content: '{"9":8000}' });
  };
  f.release();
  await assert.rejects(save, /已变化|已取消|不存在|卸载/);
  assert.equal(f.flags.writes.length, 0);
  assert.equal(f.floors[2].data.stat_data.剧场点数, 1000);
}
for (const mode of ['lostReceipt', 'noWrite', 'afterWriteFail', 'conflictWrite']) {
  const f = fixture(), loaded = await f.forge.load(2);
  let draws = 0;
  const operation = await f.forge.prepareOperation(loaded, '武器列表', 'last', '最后一把剑', 'add_trait',
    undefined, () => { draws++; return .5; });
  const count = draws;
  f.flags[mode] = true;
  if (mode === 'lostReceipt') {
    await f.forge.commitOperation(operation);
    assert.match(f.forge.operationStatus(operation).warning, /已核对/);
  } else {
    await assert.rejects(f.forge.commitOperation(operation), /保留|待核对|已变化/);
    const phase = f.forge.operationStatus(operation).phase;
    assert.equal(phase, mode === 'noWrite' ? 'pending' : mode === 'afterWriteFail' ? 'uncertain' : 'invalid');
    if (mode === 'afterWriteFail') {
      await assert.rejects(f.forge.inspectOperation(operation), /待核对/);
      await assert.rejects(f.forge.commitOperation(operation), /不能重新提交/);
    }
    if (mode === 'conflictWrite') {
      await assert.rejects(f.forge.commitOperation(operation), /不能重新提交/);
      assert.equal(f.flags.writes.length, 1); continue;
    }
    f.flags[mode] = false; f.flags.failRead = false;
    await (phase === 'uncertain' ? f.forge.inspectOperation(operation) : f.forge.commitOperation(operation));
  }
  assert.equal(f.forge.operationStatus(operation).phase, 'saved');
  assert.equal(f.flags.writes.length, 1); assert.equal(f.flags.derivations, 1); assert.equal(draws, count);
  assert.equal(f.floors[2].data.stat_data.剧场点数, 970);
  await assert.rejects(f.forge.commitOperation(operation), /已保存/);
  await assert.rejects(f.forge.inspectOperation(operation), /已保存/);
}
{
  const f = fixture(), loaded = await f.forge.load(2);
  await assert.rejects(f.forge.prepareOperation(structuredClone(loaded), '武器列表', 'last', '最后一把剑', 'reroll_stats'), /来源无效/);
  loaded.rules.sequenceBase['9'] = 999999;
  await assert.rejects(f.forge.prepareOperation(loaded, '武器列表', 'last', '最后一把剑', 'reroll_stats'), /来源无效/);
  f.floors.push({ message_id: 3, role: 'user', message: '下一轮等待回复', data: {} });
  await assert.rejects(f.forge.load(), /没有有效角色状态/);
  assert.equal((await f.forge.load(2)).editable, false); assert.equal(f.flags.writes.length, 0);
}
console.log('4/4 genuine native pages, single derivation across recovery, lost receipts and lifecycle boundaries passed');
