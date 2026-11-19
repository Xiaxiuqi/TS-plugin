import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const sources = await Promise.all(['native-floor-source', 'ability-state', 'state-store', 'generation-bridge'].map(name =>
  read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const tree = ts.createSourceFile('original.js', original, 99, true, ts.ScriptKind.JS);
const definitions = Object.fromEntries(tree.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations])
  .map(node => [node.name.getText(tree), node.initializer?.getText(tree)]));
const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank', 'getPureName', 'buildAbilityKey', 'fetchAvailableAbilities'];
const oracleCode = names.map(name => `const ${name}=${definitions[name]};`).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
const pool = {
  pathways: {'占卜家途径': ['序列9-占卜家', '序列8-小丑', '序列2-奇迹师', '序列0.5-半神', '序列0-愚者', '旧日-诡秘之主', '支柱-天尊'],
    '学徒途径': ['序列9-学徒', '序列8-戏法大师'], '秘祈人途径': ['序列9-秘祈人', '序列2-旧日侍者']},
  abilities: {
    '占卜家途径-序列9': [{name: '灵视', description: '第一行\n第二行', range: 0, aoeRadius: 0, cost: {type: 'spirituality', amount: 0},
      isPassive: false, priority: 0, effects: [{type: 'Buff', stat: '灵性', valueType: 'percentage', value: 5}],
      skillTags: [], applyTags: ['灵视'], removeTags: [], conditionalParams: {condition: '夜晚'}}],
    '占卜家途径-序列8': [{name: '巧手', power: 8, 射程: 'global', 爆炸半径: 2, targetType: 'single'}],
    '占卜家途径-序列2': [{name: '奇迹'}], '占卜家途径-序列0.5': [{name: '半神力量'}],
    '占卜家途径-序列0': [{name: '愚弄'}], '占卜家途径-旧日': [{name: '诡秘权柄'}],
    '占卜家途径-支柱': [{name: '支柱象征'}], '学徒途径-序列9': [{name: '开门'}],
    '学徒途径-序列8': [{name: '戏法'}], '秘祈人途径-序列9': [{name: '祈祷'}],
    '秘祈人途径-序列2': [{name: '侍奉'}],
  },
};
function oracle(sequence, locked = false) {
  return vm.runInNewContext(`${oracleCode}\nfetchAvailableAbilities(sequence, locked)`,
    {GameDBManager: {DB: {godPathways: pool.pathways, sequenceAbilities: pool.abilities}}, sequence, locked});
}
function sample() {
  return {stat_data: {姓名: '克莱恩', 当前序列: '序列8-小丑', 序列能力列表: {
    $meta: {extensible: true}, '序列9-占卜家': [{名称: '灵视', 描述: '用户修改', range: 77}],
    '手动分组': [{名称: '同名', 描述: '甲'}, {名称: '同名', 描述: '乙'}, null, {}, '旧坏条目'],
    '#秘术强化': [{名称: '专属秘术'}], '#神秘再现': [{名称: '再现'}],
    '#空想:学徒': [{名称: '空想能力'}], '#放牧:灵魂': [{名称: '放牧能力'}, null],
  }}, npc_data: {同伴: {keep: true}}, world_data: {天气: '晴'}, otherPlugin: {keep: true}};
}
async function fixture() {
  const modules = {}, handlers = new Map(), writes = [], reads = [], bookReads = [], storage = new Map();
  const data = sample();
  const state = {floors: [{message_id: 0, role: 'assistant', message: '<UpdateVariable>开场不可自动初始化</UpdateVariable>', data: {opening: true}},
    {message_id: 1, role: 'user', message: '行动', data: {keep: true}},
    {message_id: 2, role: 'assistant', message: '原生正文\n\n<UpdateVariable>\n保留原样\n</UpdateVariable>', data, swipe_id: 0}],
    readFail: false, writeFail: false, postFail: false, gate: null, bookGate: null, bookFail: false,
    branch: '备用分支', metadata: 0, chat: 'abilities', script: 'abilities', lostReceipt: false, noWrite: false};
  const books = {'1源堡': [
    {name: '[神之途径]默认', content: JSON.stringify(pool.pathways)},
    {name: '[序列能力]默认', content: JSON.stringify(pool.abilities)},
  ]};
  modules['cryptLord.hostApi'] = {
    async getCharWorldbookNames() {return {primary: '1源堡', additional: []}},
    async getWorldbook(name) {
      bookReads.push(name); if (state.bookGate) await state.bookGate();
      if (state.bookFail) throw Error('能力库读取失败');
      if (!books[name]) throw Error('世界书不存在');
      return structuredClone(books[name]);
    },
    scriptVariableOptions: () => ({type: 'script', script_id: state.script}),
    async getChatMessages(range, options) {
      reads.push(range); if (state.readFail) throw Error('读取失败');
      const rows = range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        range === '0-{{lastMessageId}}' ? state.floors : state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        const selected = (row.swipe_id ?? 1) % 2;
        return {message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: selected,
          swipes: selected ? [state.branch, row.message] : [row.message, state.branch],
          swipes_data: selected ? [{alternate: true}, row.data] : [row.data, {alternate: true}],
          swipes_info: [{keep: true}, {timestamp: new Date('2026-10-16T00:00:00Z'), revision: state.metadata}]};
      }) : rows);
    },
    async setChatMessages(rows) {
      if (state.writeFail) throw Error('保存失败');
      if (state.noWrite) return;
      writes.push(structuredClone(rows));
      for (const row of rows) Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row));
      if (state.postFail) state.readFail = true;
      if (state.lostReceipt) throw Error('回执丢失');
    },
  };
  state.floors.forEach(row => {row.swipe_id = 1});
  const legacyWindow = {localStorage: {getItem: key => storage.get(key) ?? null}, SillyTavern: {getCurrentChatId: () => state.chat}};
  const events = {CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop'};
  modules['cryptLord.afterNativeHost'] = {getHost: () => ({window: legacyWindow}), tavernEvents: () => events,
    bindEvent(name, fn) {if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn);
      return {stop() {handlers.get(name).delete(fn)}}}};
  modules['cryptLord.dynamicStatus'] = {status: () => ({epoch: 0}),
    async load() {if (state.gate) await state.gate(); return {rules: []}}, async assertLoaded() {}, apply() {}};
  modules['cryptLord.variablePatch'] = {commands: () => [], apply: () => ({applied: true, data: structuredClone(state.generationData)}),
    updateTag: () => '', embedUpdate: message => message};
  modules['cryptLord.contextBuilder'] = {};
  modules['cryptLord.variableSettlementApi'] = {settle: async () => ({skipped: true})};
  modules['cryptLord.responseNormalizer'] = {extractActions: () => []};
  modules['cryptLord.nativeSettlement'] = {apply() {}};
  const runtime = {console, structuredClone, DOMException, cryptLord: {__stage1Modules: modules, contract: {
    initializeGlobal(key, api) {modules[key] = api}, releaseGlobal(key) {delete modules[key]},
    async waitGlobalInitialized(key) {assert.ok(modules[key], key); return modules[key]},
  }}};
  runtime.window = runtime; vm.createContext(runtime);
  sources.forEach(source => vm.runInContext(source, runtime));
  return {modules, state, writes, reads, books, bookReads, storage, api: modules['cryptLord.abilityState'],
    async emit(name = 'CHAT_CHANGED', ...args) {for (const fn of handlers.get(events[name] || name) || []) await fn(...args)}};
}
test('整个能力管理原版规则：多途径/序列之上、全字段、锁定、精确删除和清理', async () => {
  const f = await fixture(), api = f.api;
  for (const sequence of ['序列8-小丑', '序列8-小丑/序列9-占卜家与序列8-戏法大师', '序列0.5-半神',
    '旧日-诡秘之主', '支柱-天尊', '序列2-旧日侍者']) {
    for (const locked of [false, true]) {
      const result = api.synchronize({stat_data: {当前序列: sequence}}, pool, locked);
      assert.deepEqual(plain(result.data.stat_data.序列能力列表), plain(oracle(sequence, locked)));
    }
  }
  const before = sample(), copy = structuredClone(before), sync = api.synchronize(before, pool);
  assert.deepEqual(before, copy); assert.equal(sync.added, 1); assert.equal(sync.patched, 1);
  assert.equal(sync.data.stat_data.序列能力列表['序列9-占卜家'][0].range, 77);
  assert.equal(sync.data.stat_data.序列能力列表['序列9-占卜家'][0].描述, '用户修改');
  assert.equal(sync.data.stat_data.序列能力列表['序列9-占卜家'][0].aoeRadius, 0);
  assert.equal(api.synchronize(sync.data, pool).added, 0);
  const duplicate = {stat_data: {当前序列: '序列8-小丑', 序列能力列表: {
    '序列9-占卜家': [{名称: '灵视', 描述: '第一项'}, {名称: '灵视', 描述: '末项'}],
  }}};
  const duplicateSync = api.synchronize(duplicate, pool);
  assert.equal(duplicateSync.data.stat_data.序列能力列表['序列9-占卜家'][0].range, undefined);
  assert.equal(duplicateSync.data.stat_data.序列能力列表['序列9-占卜家'][1].range, 0);
  const locked = api.synchronize(before, pool, true); assert.ok(locked.data.stat_data.序列能力列表['序列9-占卜家']);
  assert.deepEqual(plain(locked.data.stat_data.序列能力列表['序列8-小丑']), plain(oracle('序列8-小丑', true)['序列8-小丑']));
  assert.throws(() => api.synchronize({stat_data: {当前序列: '普通人'}}, pool), /尚无/);
  assert.throws(() => api.synchronize({stat_data: {当前序列: '未知'}}, pool), /找不到/);
  const mixed = {'支柱-天尊': [], '旧日-诡秘之主': [], '序列0.5-半神': [], '序列2-旧日侍者': [],
    '序列9-占卜家': [], '未知': [], $meta: []};
  const rank = vm.runInNewContext(`${oracleCode}\nparseSequenceRank`, {GameDBManager: {}});
  assert.deepEqual(plain(api.groups({stat_data: {序列能力列表: mixed}}).map(([name]) => name)),
    Object.keys(mixed).filter(name => name !== '$meta').sort((a, b) => rank(b) - rank(a)));
  for (const abilityType of ['非凡能力', '被动特性', '神之权柄', '旧日象征']) {
    const added = api.change(before, {type: 'add', name: `自建-${abilityType}`, description: '多行\n完整说明', abilityType});
    assert.equal(added.stat_data.序列能力列表['序列8-小丑'][0].描述, '多行\n完整说明');
  }
  assert.throws(() => api.change(before, {type: 'add', name: ' 同名 '}), /同名/);
  assert.throws(() => api.change(before, {type: 'add', name: '自建', abilityType: '无效'}), /类型/);
  const row = api.view(before).find(row => row.group === '手动分组').entries[1].selection;
  const removed = api.change(before, {type: 'remove', ...row});
  assert.equal(removed.stat_data.序列能力列表.手动分组[0].描述, '甲');
  assert.equal(removed.stat_data.序列能力列表.手动分组.length, 4);
  assert.throws(() => api.change(before, {type: 'remove', ...row, snapshot: {名称: '同名', 描述: '外部改动'}}), /变化/);
  for (const group of ['#秘术强化', '#神秘再现', '#空想:学徒', '#放牧:灵魂']) {
    assert.ok(api.managed(group));
    assert.throws(() => api.change(before, {type: 'remove', group, index: 0}), /专属/);
  }
  const cleaned = api.change(before, {type: 'cleanup'});
  assert.equal(cleaned.stat_data.序列能力列表.手动分组.length, 2);
  assert.deepEqual(cleaned.stat_data.序列能力列表['#放牧:灵魂'], before.stat_data.序列能力列表['#放牧:灵魂']);
  assert.deepEqual(cleaned.stat_data.序列能力列表.$meta, before.stat_data.序列能力列表.$meta);
  f.storage.set('ST_LoM_AbilityLock', 'true'); assert.equal(api.locked(before), true);
  const unlocked = api.change(before, {type: 'lock', locked: false}); assert.equal(api.locked(unlocked), false);
  assert.equal(f.storage.get('ST_LoM_AbilityLock'), 'true');
  const booksBefore = structuredClone(f.books);
  const loadedPool = await api.loadPool(); assert.deepEqual(plain(loadedPool.pathways), pool.pathways);
  f.books['【源堡】玩家自建内容'] = [{name: '[序列能力]默认', content: JSON.stringify({'占卜家途径-序列8': [{name: '低优先级'}]})}];
  assert.equal((await api.loadPool()).abilities['占卜家途径-序列8'][0].name, '巧手');
  assert.deepEqual(f.books['1源堡'], booksBefore['1源堡']);
  f.books['1源堡'][1].content = '```jsonc\n{ // 中文别名与尾逗号\n"占卜家途径-序列08": [{"名称":"中文能力","描述":"说明","射程":0,}],}\n```';
  const chinese = api.synchronize({stat_data: {当前序列: '序列8-小丑'}}, await api.loadPool(), true);
  assert.equal(chinese.data.stat_data.序列能力列表['序列8-小丑'][0].名称, '中文能力');
  assert.equal(chinese.data.stat_data.序列能力列表['序列8-小丑'][0].range, 0);
  f.books['1源堡'][1].content = '坏JSON'; await assert.rejects(api.loadPool(), /有效 JSON/);
  f.state.bookFail = true; await assert.rejects(api.loadPool(), /读取失败/);
  f.state.bookFail = false; f.books['1源堡'] = booksBefore['1源堡'];
  const projectionOrder = [];
  for (const [key, group] of [['audienceImagination', '#空想:学徒'], ['readerMystic', '#秘术强化'],
    ['mysteryReenactment', '#神秘再现']]) {
    f.modules[`cryptLord.${key}`] = {sync(data) {
      projectionOrder.push(key); data.stat_data.序列能力列表[group] = [{名称: `重建-${key}`}];
    }};
  }
  const source = await api.load(2), projected = await api.project(source);
  assert.deepEqual(projectionOrder, ['audienceImagination', 'readerMystic', 'mysteryReenactment']);
  assert.equal(projected.groups.find(row => row.group === '#秘术强化').entries[0].name, '重建-readerMystic');
  assert.deepEqual(projected.floor.data, source.floor.data); assert.deepEqual(f.state.floors[2].data, before);
  f.modules['cryptLord.readerMystic'].sync = data => {data.stat_data.序列能力列表 = {}; throw Error('中途异常')};
  const rejectedProjection = await api.project(source);
  assert.match(rejectedProjection.warning, /投影重建失败/); assert.deepEqual(plain(rejectedProjection.groups), plain(source.groups));
  await assert.rejects(api.commit(source, {type: 'sync'}), /中途异常/);
  assert.deepEqual(f.state.floors[2].data, before);
  f.state.bookFail = true;
  assert.match((await api.project(source)).warning, /读取失败/);
  assert.deepEqual(f.writes, []);
});
test('完整原生事务与生成补全：单次保存、历史/战斗限制、失败重试、取消和终检', async () => {
  const f = await fixture(), api = f.api, opening = structuredClone(f.state.floors[0]), user = structuredClone(f.state.floors[1]);
  const originalText = f.state.floors[2].message, books = structuredClone(f.books);
  await api.load(2); assert.deepEqual(f.writes, []); assert.ok(f.reads.includes('0-{{lastMessageId}}'));
  // Historical ability records are view-only and reading #0 never runs initialization.
  f.state.floors[0].data.stat_data = {当前序列: '普通人'};
  const history = await api.load(0); assert.equal(history.editable, false); assert.deepEqual(f.writes, []);
  f.state.floors[0] = structuredClone(opening);
  const add = {type: 'add', name: '自定义', description: '完整\n描述', abilityType: '被动特性'};
  let baseline = await api.load(2);
  f.state.writeFail = true; await assert.rejects(api.commit(baseline, add), /保存失败/); assert.equal(f.writes.length, 0);
  f.state.writeFail = false; await api.commit(baseline, add); assert.equal(f.writes.length, 1);
  await assert.rejects(api.commit(baseline, add), /变化/);
  baseline = await api.load(2); await api.commit(baseline, {type: 'lock', locked: true});
  assert.equal(f.state.floors[2].data.stat_data.序列能力锁定, true);
  assert.equal(f.storage.has('ST_LoM_AbilityLock'), false);
  baseline = await api.load(2); const writes = f.writes.length;
  const unchanged = await api.commit(baseline, {type: 'lock', locked: true}); assert.equal(unchanged.unchanged, true);
  assert.equal(f.writes.length, writes);
  const synced = await api.commit(await api.load(2), {type: 'sync'}); assert.equal(synced.added, 1);
  const repeated = await api.commit(await api.load(2), {type: 'sync'}); assert.equal(repeated.unchanged, true);
  const cleanup = await api.commit(await api.load(2), {type: 'cleanup'}); assert.equal(cleanup.removed, 3);
  assert.equal(f.state.floors[2].message, originalText);
  assert.deepEqual(f.state.floors[0], opening); assert.deepEqual(f.state.floors[1], user); assert.deepEqual(f.books, books);
  f.state.floors[2].data.stat_data.序列能力列表.坏分组 = {名称: '不应覆盖'};
  assert.match((await api.load(2)).reason, /格式异常/);
  delete f.state.floors[2].data.stat_data.序列能力列表.坏分组;
  for (const key of ['teamBattle', 'personalBattle']) {
    f.state.floors[2].data.cryptLord = {[key]: {status: 'active'}};
    await assert.rejects(api.commit(await api.load(2), add), /战斗/);
  }
  f.state.floors[2].data.cryptLord = {teamBattle: {status: 'finished', settled: false}};
  assert.equal((await api.load(2)).editable, false); delete f.state.floors[2].data.cryptLord;
  for (const boundary of ['body', 'swipe', 'floor', 'chat', 'close', 'pool']) {
    baseline = await api.load(2);
    let release, entered, alive = true;
    const waiting = new Promise(resolve => entered = resolve);
    const hold = async () => {entered(); await new Promise(resolve => release = resolve)};
    if (boundary === 'pool') f.state.bookGate = hold; else f.state.gate = hold;
    const count = f.writes.length;
    const operation = boundary === 'pool' ? {type: 'sync'} : {type: 'add', name: `边界-${boundary}`};
    const pending = api.commit(baseline, operation, () => alive);
    await waiting;
    if (boundary === 'body' || boundary === 'pool') f.state.floors[2].message += '外部编辑';
    if (boundary === 'swipe') f.state.floors[2].swipe_id++;
    if (boundary === 'floor') f.state.floors.push({message_id: 3, role: 'user', message: '新回合'});
    if (boundary === 'chat') await f.emit();
    if (boundary === 'close') alive = false;
    f.state.gate = null; f.state.bookGate = null; release();
    await assert.rejects(pending, /变化|取消/); assert.equal(f.writes.length, count);
    if (boundary === 'floor') f.state.floors.pop();
  }
  baseline = await api.load(2);
  const one = api.commit(baseline, {type: 'add', name: '并发甲'}), two = api.commit(baseline, {type: 'add', name: '并发乙'});
  await one; await assert.rejects(two, /变化/);
  f.state.postFail = true;
  const recovery = api.begin(await api.load(2), {type: 'add', name: '复核失败'});
  await assert.rejects(recovery.run(), /保存状态待核对/); assert.equal(recovery.status(), 'uncertain');
  await assert.rejects(recovery.save(), /不能重新提交/);
  f.state.readFail = false; f.state.postFail = false;
  const confirmed = f.writes.length;
  const saved = await recovery.inspect(); assert.ok(saved.loaded); assert.equal(f.writes.length, confirmed);
  for (const operation of [{type: 'sync'}, {type: 'lock', locked: true}, {type: 'cleanup'}, {type: 'add', name: '重试能力'},
    {type: 'remove', ...f.api.view(sample()).find(group => group.group === '手动分组').entries[1].selection}]) {
    const g = await fixture(), baseline = await g.api.load(2), transaction = g.api.begin(baseline, operation);
    g.state.writeFail = true;
    await assert.rejects(transaction.run(), /结果已保留/);
    await assert.rejects(transaction.run(), /不能重复计算/);
    g.state.writeFail = false;
    const [result, duplicate] = await Promise.allSettled([transaction.save(), transaction.save()]);
    assert.equal(result.status, 'fulfilled'); assert.equal(duplicate.status, 'rejected');
    assert.equal(transaction.status(), 'saved'); assert.equal(g.writes.length, 1);
    if (operation.type === 'add') assert.equal(g.state.floors[2].data.stat_data.序列能力列表['序列8-小丑'].length, 1);
    if (operation.type === 'sync') assert.equal(result.value.added, 1);
  }
  for (const boundary of ['clone', 'tamper', 'branch', 'metadata', 'chat', 'script', 'writer', 'lock', 'generation', 'pool-on-retry']) {
    const g = await fixture(), baseline = await g.api.project(await g.api.load(2));
    const operation = boundary === 'pool-on-retry' ? {type: 'sync'} : {type: 'add', name: '冲突保护'};
    if (boundary === 'clone') { await assert.rejects(g.api.commit(structuredClone(baseline), operation), /凭据/); continue; }
    if (boundary === 'tamper') { baseline.locked = true; await assert.rejects(g.api.commit(baseline, operation), /凭据/); continue; }
    const transaction = g.api.begin(baseline, operation);
    if (boundary === 'pool-on-retry') {
      g.state.writeFail = true; await assert.rejects(transaction.run(), /结果已保留/); g.state.writeFail = false;
      g.books['1源堡'][1].content = JSON.stringify({'占卜家途径-序列8': [{name: '不同规则'}]});
      await assert.rejects(transaction.save(), /变化/); assert.equal(g.writes.length, 0); continue;
    }
    if (boundary === 'branch') g.state.branch += '-new';
    if (boundary === 'metadata') g.state.metadata++;
    if (boundary === 'chat') g.state.chat += '-new';
    if (boundary === 'script') g.state.script += '-new';
    if (boundary === 'writer') g.modules['cryptLord.stateStore'] = {};
    if (boundary === 'lock') g.storage.set('ST_LoM_AbilityLock', 'true');
    if (boundary === 'generation') { await g.emit('GENERATION_STARTED', 'normal'); await g.emit('GENERATION_ENDED'); }
    await assert.rejects(transaction.run(), /变化|取消/); assert.equal(g.writes.length, 0);
  }
  for (const mode of ['lost-receipt', 'no-write']) {
    const g = await fixture(), baseline = await g.api.load(2), transaction = g.api.begin(baseline, {type: 'add', name: mode});
    if (mode === 'lost-receipt') { g.state.lostReceipt = true; assert.match((await transaction.run()).warning, /回执异常/); }
    else {
      g.state.noWrite = true; await assert.rejects(transaction.run(), /结果已保留/);
      g.state.noWrite = false; await transaction.save();
    }
    assert.equal(g.writes.length, 1); assert.equal(g.state.floors[2].data.stat_data.序列能力列表['序列8-小丑'].length, 1);
  }
  const quiet = await fixture(), quietBase = await quiet.api.load(2);
  for (const [type, options, dryRun] of [['quiet'], ['quiet_prompt'], ['normal', {quiet_prompt: 'tool'}],
    ['normal', {dryRun: true}], ['normal', {}, true], ['dryRun']])
    await quiet.emit('GENERATION_STARTED', type, options, dryRun);
  await quiet.api.commit(quietBase, {type: 'add', name: '静默工具'});
  quiet.state.floors[2].is_hidden = true; assert.match((await quiet.api.load()).reason, /隐藏/);
  quiet.state.floors.push({message_id: 3, role: 'user', message: '待回复', data: {}});
  await assert.rejects(quiet.api.load(), /assistant/);
  // The real narrative bridge shares the same native lock, with no model/worldbook writes.
  f.storage.set('ST_LoM_AbilityLock', 'false');
  f.state.generationData = {stat_data: {当前序列: '序列8-小丑', 序列能力锁定: true, 序列能力列表: {}}, otherPlugin: {keep: true}};
  await f.modules['cryptLord.nativeFloorBridge'].completeNarrative('正文', {
    userMessageId: 1, assistantMessageId: 2, userText: '行动', narrativeText: '正文',
  });
  assert.deepEqual(Object.keys(f.state.floors[2].data.stat_data.序列能力列表), ['序列8-小丑']);
  assert.equal(f.state.floors[2].data.otherPlugin.keep, true);
  assert.deepEqual(f.state.floors[0], opening); assert.deepEqual(f.state.floors[1], user);
  assert.ok(f.writes.every(rows => rows.every(row => row.message_id === 2)));
  baseline = await api.load(2); api.dispose(); await assert.rejects(api.commit(baseline, add), /取消/);
  const loader = await read('public/guimizhizhu_ui/loader.js'), shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
  assert.match(loader, /modules\/abilities\/(?:index\.js|style\.css)/);
  assert.match(shell, /abilitiesUi'\]\.open\(state\.current\?\.message_id/);
});
