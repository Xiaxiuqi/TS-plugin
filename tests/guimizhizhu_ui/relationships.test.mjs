import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const sourceNames = ['battle-experience', 'battle-play-reference', 'battle-play-units', 'battle-team-builder',
  'native-floor-source', 'relationship-state', 'state-store'];
const sources = await Promise.all(sourceNames.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt');
function method(name, async = false) {
  const signature = `${async ? 'async ' : ''}${name}(`;
  const start = original.indexOf(`\n${signature}`) + 1;
  assert.ok(start >= 0);
  const tree = ts.createSourceFile('original.js', `const methods={${original.slice(start)}`, 99, true, ts.ScriptKind.JS);
  return tree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(tree);
}
function oracle(data, batch = false) {
  const runtime = {structuredClone, console, GameDBManager: {resolveRelationshipPortrait: () => null},
    window: {}, _: {cloneDeep: structuredClone, get: (object, path) => path.split('.').reduce((value, key) => value?.[key], object)}};
  const originalApi = vm.runInNewContext(`({${method('renderRelationships')},${method('handleRelationshipAction')},
    ${method('batchDeleteCharacters', true)}})`, runtime);
  Object.assign(originalApi, {currentMvuState: structuredClone(data), relationshipBatchMode: batch,
    SafeGetValue: (object, key, fallback) => object[key] ?? fallback, safeEscapeHtml: value => String(value),
    unescapeHtml: value => value, showTemporaryMessage() {}, showConfirmModal(text, callback) {callback()},
    _applyRelationshipBatchUi() {}, updateAndRefreshRelationshipState(next) {this.currentMvuState = next}});
  return originalApi;
}
const plain = value => JSON.parse(JSON.stringify(value));
function sample() {
  return {stat_data: {名称: '克莱恩', 当前序列: '普通人', 人物关系列表: {
    $meta: {extensible: true},
    伦纳德: {名称: '同名', 身份: '安保职员', 当前序列: '普通人', 好感度: 80, 关系: '朋友', isImportant: true},
    克莱恩: {名称: '同名', 身份: '普通同事', 好感度: -30, 关系: '同事'},
    旧友: {名称: '旧友', 当前序列: '序列9', 灵性: 20, 当前灵性: 0, 能力清单: [{名称: '灵视'}]},
    失效记录: null,
  }}, npc_data: {
    $meta: {extensible: true}, 伦纳德: {身份: '值夜者', 当前序列: '序列7', isImportant: false,
      活力: 50, 当前活力: 0, 灵性: 60, 当前灵性: 10, 运气: 5,
      当前状态: {$meta: {}, 受伤: {程度: '轻微', 持续: 0}}, 近期打算: '调查', 长期目标: '守护',
      能力清单: [{名称: '灵视', 描述: '看见灵体\n保持换行'}], 自定义: false, 附加数值: 0,
      关键记忆: {秘密: '排除记忆'}, 事件历史: {日期: '排除历史'}},
    克莱恩: {名称: '真实名称', 身份: '隐秘身份', 当前序列: '序列8'},
    客观孤儿: {名称: '未知访客', 身份: '不能变成玩家已知资料', 当前序列: '序列4', isImportant: true},
    失效记录: [],
  }, world_data: {天气: '晴'}, otherPlugin: {keep: true}};
}
async function fixture(data = sample()) {
  const modules = {}, handlers = new Map(), writes = [], reads = [];
  const state = {floors: [
    {message_id: 0, role: 'assistant', message: '<UpdateVariable>不执行开场初始化</UpdateVariable>', data: {stat_data: {人物关系列表: {}}}},
    {message_id: 1, role: 'user', message: '行动', data: {keep: true}},
    {message_id: 2, role: 'assistant', message: '原生正文\n<UpdateVariable>保留标签</UpdateVariable>', data, swipe_id: 1},
  ], readFail: false, writeFail: false, postFail: false, acknowledgementFail: false, noWrite: false, conflict: false,
  gate: null, finalGate: null, page: 0, date: new Date('2026-10-27'), derivations: 0, script: 'relationships', chat: 'fixture'};
  modules['cryptLord.hostApi'] = {
    async getChatMessages(range, options) {
      reads.push(range); if (state.readFail) throw Error('读取失败');
      const rows = range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        range === '0-{{lastMessageId}}' ? state.floors : state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(({message, data, ...row}) => ({...row,
        page: state.page, swipe_id: row.swipe_id ?? 1, swipes: ['其他正文页', message], swipes_data: [{保留: 1}, data],
        swipes_info: [{send_date: state.date, extra: {保留: true}}, {}]})) : rows);
    },
    async setChatMessages(rows) {
      if (state.writeFail) throw Error('保存失败');
      writes.push(structuredClone(rows));
      if (state.noWrite) return;
      for (const row of rows) Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row));
      if (state.conflict) state.page++;
      if (state.acknowledgementFail) throw Error('已落盘但响应丢失');
      if (state.postFail) state.readFail = true;
    },
  };
  const events = {CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop'};
  const surface = {document: {}, window: {SillyTavern: {getCurrentChatId: () => state.chat}}};
  modules['cryptLord.hostApi'].scriptVariableOptions = () => ({type: 'script', script_id: state.script});
  modules['cryptLord.afterNativeHost'] = {tavernEvents: () => events, getHost: () => surface,
    bindEvent(name, fn) {const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set);
      return {stop() {set.delete(fn)}}}};
  modules['cryptLord.dynamicStatus'] = {async load() {if (state.gate) await state.gate(); return {rules: []}},
    async assertLoaded() {await state.finalGate?.()}, apply() {state.derivations++}};
  const runtime = {console, structuredClone, DOMException, cryptLord: {__stage1Modules: modules, contract: {
    initializeGlobal(key, api) {modules[key] = api}, releaseGlobal(key) {delete modules[key]},
    async waitGlobalInitialized(key) {assert.ok(modules[key], key); return modules[key]},
  }}};
  runtime.window = runtime; vm.createContext(runtime);
  sources.forEach(source => vm.runInContext(source, runtime));
  return {modules, state, writes, reads, runtime, api: modules['cryptLord.relationshipState'],
    emit: (event = 'CHAT_CHANGED', ...args) => handlers.get(events[event])?.forEach(fn => fn(...args))};
}
test('整个人物关系规则：原版双轨、排序、孤儿批量、重要标记、删除及造物/编队关联', async () => {
  const f = await fixture(), api = f.api, before = sample(), preserved = structuredClone(before);
  for (const batch of [false, true]) {
    const valid = structuredClone(before); delete valid.npc_data.失效记录;
    const old = oracle(valid, batch).renderRelationships(valid.stat_data.人物关系列表);
    const order = [...old.matchAll(/data-char-name="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(plain(api.list(before, batch).map(row => row.key)), order);
  }
  const ordinary = api.list(before), all = api.list(before, true);
  const leonard = ordinary.find(row => row.key === '伦纳德');
  assert.equal(leonard.subjective.find(([key]) => key === '认知身份')[1], '安保职员');
  assert.equal(leonard.objective.fields.find(([key]) => key === '真实身份')[1], '值夜者');
  assert.deepEqual(plain(leonard.objective.stats[0]), ['活力', '0 / 50']);
  assert.deepEqual(plain(leonard.objective.fields.find(([key]) => key === '自定义')), ['自定义', '否']);
  assert.equal(leonard.objective.fields.find(([key]) => key === '附加数值')[1], 0);
  assert.deepEqual(plain(leonard.objective.statuses), [['受伤', {程度: '轻微', 持续: 0}]]);
  assert.match(leonard.objective.abilities[0], /\n保持换行/);
  assert.equal(ordinary.find(row => row.key === '旧友').objective.legacy, true);
  assert.doesNotMatch(JSON.stringify(all.map(row => [row.subjective, row.objective])), /排除记忆|排除历史/);
  const orphan = all.find(row => row.orphan);
  assert.deepEqual(plain(orphan.subjective), []); assert.equal(orphan.relationship, ''); assert.equal(orphan.favorability, null);
  const old = oracle(before); old.handleRelationshipAction('toggle-important', '伦纳德');
  const marked = api.toggleImportant(before, leonard);
  assert.deepEqual(plain(marked), plain(old.currentMvuState));
  assert.equal(marked.npc_data.伦纳德.isImportant, true); // Objective false overrides stale subjective true for this action.
  const orphanMarked = api.toggleImportant(before, orphan);
  assert.equal(orphanMarked.npc_data.客观孤儿.isImportant, false);
  assert.equal(Object.hasOwn(orphanMarked.stat_data.人物关系列表, '客观孤儿'), false);
  const oldBatch = oracle(before, true); await oldBatch.batchDeleteCharacters(all.map(row => row.key));
  assert.deepEqual(plain(api.removeMany(before, all)), plain(oldBatch.currentMvuState));
  assert.deepEqual(before, preserved);
  assert.throws(() => api.removeMany(marked, [leonard, ordinary.find(row => row.key === '克莱恩')]), /变化/);
  assert.equal(marked.npc_data.克莱恩.身份, '隐秘身份');
  assert.throws(() => api.removeMany(before, [leonard, leonard]), /无效/);
  assert.throws(() => api.removeMany(before, [{key: '__proto__', original: '{}'}]), /无效/);
  const dotted = sample(); dotted.npc_data['a.b[0]'] = {名称: '同名'}; dotted.stat_data.人物关系列表['a.b[0]'] = {名称: '同名'};
  const target = api.list(dotted).find(row => row.key === 'a.b[0]');
  assert.equal(Object.hasOwn(api.removeMany(dotted, [target]).npc_data, 'a.b[0]'), false);
  assert.equal(api.list({stat_data: {}, npc_data: {客观孤儿: {名称: '访客'}}}).length, 0);
  assert.equal(api.list({stat_data: {}, npc_data: {客观孤儿: {名称: '访客'}}}, true).length, 1);
  const constructs = sample();
  constructs.npc_data.自主甲 = {$完全自主造物: true, $造物类型: '机械奇物', $成品位阶: 6};
  constructs.npc_data.自主乙 = {$完全自主造物: true, $造物类型: '魔偶', $成品位阶: 5};
  constructs.stat_data.$专属玩法 = {通识者途径: {制造玩法: {版本: 1, 造物列表: {
    自主甲: {$造物类型: '机械奇物', $成品位阶: 4, 当前活力: 30},
  }}}};
  constructs.stat_data.辅助能力列表 = {$meta: {extensible: false}, '#其他': {名称: '保留'}, '#制造造物': {描述: '旧计数'}};
  constructs.cryptLord = {teamComposition: {version: 1, allyTeam: [
    {name: '<User>', dataSource: 'player'}, {name: '自主甲', dataSource: 'npc'},
    {name: '自主甲', dataSource: 'savant-construct'}, {name: '自主甲', dataSource: 'clone'},
  ], enemyTeam: [{name: '克莱恩', dataSource: 'npc'}, {name: '自主甲', dataSource: 'puppet'}]}};
  const selected = api.list(constructs, true).filter(row => ['自主甲', '克莱恩'].includes(row.key));
  const removed = api.removeMany(constructs, selected);
  assert.match(removed.stat_data.辅助能力列表['#制造造物'].描述, /现有2具/);
  assert.equal(removed.cryptLord.teamComposition.allyTeam.length, 3);
  assert.equal(removed.cryptLord.teamComposition.enemyTeam[0].dataSource, 'puppet');
  assert.deepEqual(removed.stat_data.辅助能力列表.$meta, {extensible: false});
  assert.deepEqual(removed.stat_data.辅助能力列表['#其他'], {名称: '保留'});
  assert.deepEqual(removed.stat_data.$专属玩法, constructs.stat_data.$专属玩法);
  delete constructs.stat_data.$专属玩法;
  const allConstructs = api.list(constructs, true).filter(row => ['自主甲', '自主乙'].includes(row.key));
  assert.equal(Object.hasOwn(api.removeMany(constructs, allConstructs).stat_data.辅助能力列表, '#制造造物'), false);
  f.modules['cryptLord.battlePlayUnits'] = null;
  assert.throws(() => api.removeMany(constructs, allConstructs), /造物服务/);
  const many = sample();
  for (let index = 0; index < 151; index++) many.npc_data[`NPC-${index}`] = {名称: `NPC-${index}`};
  assert.equal(api.list(many, true).length, all.length + 151);
});
test('整个原生保存事务：单写、历史/战斗只读、最终冲突复核、失败重试与生命周期取消', async () => {
  const f = await fixture(), api = f.api;
  const opening = structuredClone(f.state.floors[0]), user = structuredClone(f.state.floors[1]), message = f.state.floors[2].message;
  let loaded = await api.load(2);
  assert.deepEqual(f.writes, []); assert.ok(f.reads.includes('0-{{lastMessageId}}'));
  assert.deepEqual(f.state.floors[0], opening);
  const history = await api.load(0); assert.equal(history.editable, false); assert.deepEqual(f.writes, []);
  await assert.rejects(api.commit(history, {type: 'remove', entries: []}), /历史/);
  const action = {type: 'important', entry: loaded.entries.find(row => row.key === '克莱恩')};
  f.state.writeFail = true; await assert.rejects(api.commit(loaded, action), /保存失败/);
  f.state.writeFail = false; await api.commit(loaded, action); assert.equal(f.writes.length, 1);
  await assert.rejects(api.commit(loaded, action), /变化|来源无效/);
  loaded = await api.load(2);
  const removed = await api.commit(loaded, {type: 'remove', entries: loaded.allEntries.filter(row => row.orphan)});
  assert.equal(removed.loaded.allEntries.some(row => row.orphan), false); assert.equal(f.writes.length, 2);
  for (const key of ['teamBattle', 'personalBattle']) {
    f.state.floors[2].data.cryptLord = {[key]: {status: 'active'}};
    await assert.rejects(api.commit(await api.load(2), action), /战斗/);
  }
  f.state.floors[2].data.cryptLord = {teamBattle: {status: 'ended', settled: false}};
  assert.equal((await api.load(2)).editable, false);
  f.state.floors[2].data.cryptLord = {personalBattle: {status: 'finished', result: 'victory', enemy: {npcKey: '克莱恩'}}};
  assert.equal((await api.load(2)).editable, false); delete f.state.floors[2].data.cryptLord;
  f.state.floors[2].data.npc_data = [];
  assert.match((await api.load(2)).reason, /格式异常/);
  f.state.floors[2].data.npc_data = sample().npc_data;
  for (const boundary of ['body', 'swipe', 'floor', 'chat', 'close', 'data', 'page', 'metadata', 'generation']) {
    loaded = await api.load(2); const count = f.writes.length; let release, entered, alive = true;
    const waiting = new Promise(resolve => entered = resolve);
    f.state.gate = async () => {entered(); await new Promise(resolve => release = resolve)};
    const pending = api.commit(loaded, {type: 'remove', entries: [loaded.entries[0]]}, () => alive);
    await waiting;
    if (boundary === 'body') f.state.floors[2].message += '\n外部编辑';
    if (boundary === 'swipe') f.state.floors[2].swipe_id++;
    if (boundary === 'data') f.state.floors[2].data.otherPlugin.new = true;
    if (boundary === 'floor') f.state.floors.push({message_id: 3, role: 'user', message: '新回合', data: {}});
    if (boundary === 'chat') f.emit();
    if (boundary === 'close') alive = false;
    if (boundary === 'page') f.state.page++;
    if (boundary === 'metadata') f.state.date.setTime(f.state.date.getTime() + 1000);
    if (boundary === 'generation') f.emit('GENERATION_STARTED', 'normal');
    f.state.gate = null; release();
    await assert.rejects(pending, /变化|取消/); assert.equal(f.writes.length, count);
    if (boundary === 'floor') f.state.floors.pop();
    if (boundary === 'swipe') f.state.floors[2].swipe_id--;
    if (boundary === 'generation') f.emit('GENERATION_STOPPED');
  }
  loaded = await api.load(2);
  const one = api.commit(loaded, {type: 'important', entry: loaded.entries[0]}),
    two = api.commit(loaded, {type: 'remove', entries: [loaded.entries[1]]});
  await one; await assert.rejects(two, /变化/);
  f.state.postFail = true;
  const postLoaded = await api.load(2), post = api.begin(postLoaded, {type: 'remove', entries: [postLoaded.entries[0]]});
  await assert.rejects(post.run(), /保存状态待核对/);
  assert.equal(post.status(), 'uncertain');
  await assert.rejects(post.inspect(), /保存状态待核对/);
  await assert.rejects(post.save(), /不能重新提交/);
  f.state.readFail = false; f.state.postFail = false;
  assert.ok((await post.inspect()).loaded); assert.equal(post.status(), 'saved');
  assert.deepEqual(f.state.floors[0], opening); assert.deepEqual(f.state.floors[1], user);
  assert.ok(f.state.floors[2].message.startsWith(message));
  assert.equal(f.state.floors[2].data.otherPlugin.keep, true);
  assert.ok(f.writes.every(rows => rows.every(row => row.message_id === 2 && !Object.hasOwn(row, 'message'))));
  loaded = await api.load(2); api.dispose();
  await assert.rejects(api.commit(loaded, {type: 'remove', entries: [loaded.entries[0]]}), /取消/);
  const loader = await read('public/guimizhizhu_ui/loader.js'), shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
  assert.match(loader, /modules\/relationships\/index\.js/); assert.match(loader, /modules\/relationships\/style\.css/);
  assert.match(shell, /relationshipsUi'\]\.open\(state\.current\?\.message_id/);
  assert.doesNotMatch(shell, /function changeRelationships|function renderRelationships/);
  for (const mutation of [
    next => {next.state.page++},
    next => {next.modules['cryptLord.stateStore'] = {...next.modules['cryptLord.stateStore']}},
    next => {next.modules['cryptLord.hostApi'] = {...next.modules['cryptLord.hostApi']}},
    next => {next.modules['cryptLord.battlePlayUnits'] = {...next.modules['cryptLord.battlePlayUnits']}},
    next => {next.emit('GENERATION_STARTED', 'normal')},
  ]) {
    const next = await fixture(), before = await next.api.load(2), count = next.writes.length;
    next.state.finalGate = () => mutation(next);
    await assert.rejects(next.api.commit(before, {type: 'remove', entries: [before.entries[0]]}), /变化|取消/);
    assert.equal(next.writes.length, count);
  }
  const protectedSource = await fixture(), real = await protectedSource.api.load(2), selected = real.entries[0];
  await assert.rejects(protectedSource.api.commit(structuredClone(real), {type: 'important', entry: selected}), /来源无效/);
  real.floor.data.otherPlugin.keep = false; real.editable = false;
  await assert.rejects(protectedSource.api.commit(real, {type: 'important', entry: selected}), /来源无效/);
  assert.equal(protectedSource.state.floors[2].data.otherPlugin.keep, true);
  const generating = await fixture();
  for (const args of [['quiet'], ['quiet_prompt'], ['normal', {quiet_prompt: true}], ['dryRun'], ['normal', {dryRun: true}], ['normal', {}, true]]) {
    generating.emit('GENERATION_STARTED', ...args);
    assert.equal((await generating.api.load(2)).editable, true);
  }
  const oldGeneration = await generating.api.load(2);
  generating.emit('GENERATION_STARTED', 'normal');
  await assert.rejects(generating.api.load(2), /取消/);
  generating.emit('GENERATION_ENDED');
  await assert.rejects(generating.api.commit(oldGeneration, {type: 'important', entry: oldGeneration.entries[0]}), /取消/);
  generating.state.floors[2].is_hidden = true;
  assert.match((await generating.api.load(2)).reason, /隐藏/);
  generating.state.floors.push({message_id: 3, role: 'user', message: '等待回复', data: {}});
  await assert.rejects(generating.api.load(), /没有角色状态/);
  // Removing an actual industry principal must update production in the same native write.
  const linked = await fixture(), initialLinked = structuredClone(linked.state.floors.slice(0, 2));
  linked.state.floors[2].data.stat_data.产业 = {工坊: {名称: '银湾工坊', 类型: '第二产业',
    当前投入资本总额: '50000 金镑', 负责人: '伦纳德', 生产分配_1级: 100}};
  linked.state.floors[2].data.npc_data.伦纳德.当前序列 = '序列5-工匠';
  Object.assign(linked.modules['cryptLord.hostApi'], {
    getCharWorldbookNames: async () => ({primary: '角色规则', additional: []}),
    getWorldbook: async name => name === '角色规则' ? [
      {name: '[神之途径]通识者', content: '{"通识者途径":["序列5-工匠"]}'},
    ] : [],
  });
  for (const name of ['domain-defaults', 'industry-state', 'cashflow', 'domain-state', 'faction-state', 'native-settlement'])
    vm.runInContext(await read(`public/guimizhizhu_ui/core/${name}.js`), linked.runtime);
  const readLinked = await linked.api.load(2);
  const savedLinked = await linked.api.commit(readLinked, {type: 'remove',
    entries: readLinked.entries.filter(row => row.key === '伦纳德')});
  assert.equal(linked.writes.length, 1);
  assert.equal(savedLinked.data.stat_data.产业.工坊.负责人, '伦纳德');
  assert.equal(savedLinked.data.stat_data.产业.工坊.运营效率, 50);
  assert.equal(savedLinked.data.stat_data.产业.工坊.技术先进指数, 0);
  assert.ok(savedLinked.data.stat_data.生产力['1级工业品'] > 0);
  assert.deepEqual(linked.state.floors.slice(0, 2), initialLinked);
  const uncertain = await fixture(), uncertainRead = await uncertain.api.load(2), uncertainAction = {
    type: 'important', entry: uncertainRead.entries.find(row => row.key === '克莱恩'),
  };
  uncertain.state.acknowledgementFail = true;
  assert.match((await uncertain.api.commit(uncertainRead, uncertainAction)).warning, /已核对/);
  assert.equal(uncertain.state.floors[2].data.npc_data.克莱恩.isImportant, true);
  uncertain.state.acknowledgementFail = false;
  await assert.rejects(uncertain.api.commit(uncertainRead, uncertainAction), /已变化/);
  assert.equal(uncertain.writes.length, 1);
  for (const mode of ['writeFail', 'noWrite', 'postFail', 'conflict']) {
    const next = await fixture(), loaded = await next.api.load(2);
    const transaction = next.api.begin(loaded, {type: 'remove', entries: [loaded.entries[0]]});
    next.state[mode] = true;
    await assert.rejects(transaction.run(), /保留|核对|已变化/);
    assert.equal(next.state.derivations, 1);
    await assert.rejects(transaction.run(), /不能重复/);
    if (mode === 'conflict') {
      assert.equal(transaction.status(), 'invalid'); await assert.rejects(transaction.save(), /不能重新提交/); continue;
    }
    next.state[mode] = false; next.state.readFail = false;
    if (mode === 'postFail') {
      await assert.rejects(transaction.save(), /不能重新提交/); await transaction.inspect();
    } else await transaction.save();
    assert.equal(transaction.status(), 'saved'); assert.equal(next.state.derivations, 1);
    assert.equal(next.state.floors[2].data.npc_data.伦纳德, undefined);
  }
  for (const mutate of [
    next => {next.state.script += 'new'},
    next => {next.state.chat += 'new'},
    next => {next.modules['cryptLord.afterNativeHost'] = {...next.modules['cryptLord.afterNativeHost']}},
    next => {next.modules['cryptLord.industryState'] = {}},
  ]) {
    const next = await fixture(), loaded = await next.api.load(2), tx = next.api.begin(loaded, {type: 'important', entry: loaded.entries[0]});
    next.state.writeFail = true; await assert.rejects(tx.run(), /保留/); mutate(next);
    await assert.rejects(tx.save(), /变化|取消/); assert.equal(next.writes.length, 0);
  }
});
