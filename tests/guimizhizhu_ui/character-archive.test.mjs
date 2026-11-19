import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const sources = await Promise.all(['native-floor-source', 'character-panel-state', 'state-store', 'generation-bridge'].map(name =>
  read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt');
const schema = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34c-js-war-sim-and-strategies.txt');
function method(name, async = false) {
  const start = original.indexOf(`\n${async ? 'async ' : ''}${name}(`);
  assert.ok(start >= 0, name);
  const tree = ts.createSourceFile('original.js', `const api={${original.slice(start + 1)}`, 99, true, ts.ScriptKind.JS);
  return tree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(tree);
}
const plain = value => JSON.parse(JSON.stringify(value));
const questKey = '<User>接受的任务';
function sample() {
  return {stat_data: {名称: '克莱恩', 当前序列: '序列9-占卜家', 活力: 30, 当前活力: 31,
    灵性: 60, 当前灵性: 0, 理智: 50, 当前理智: 45, 人性: 30, 当前人性: 30, 敏捷: 20, 当前敏捷: 10,
    运气: 110, 身体年龄: 25, 灵魂年龄: 30, 消化进度: '120', 失控进度: '8',
    非凡特性列表: {$meta: {}, 普通: {等阶: '序列9', 描述: '多行\n保留', 百分比加成: {灵性: 10}},
      神性: {等阶: '支柱', 描述: '神性'}, 失效: null},
    武器列表: {$meta: {}, a: {名称: '杖剑', isEquipped: true}, b: {名称: '短剑'}},
    衣物列表: {c: {名称: '风衣'}}, 饰品列表: {d: {名称: '银戒'}}, 封印物列表: {e: {名称: '封印物'}},
    扮演法列表: {x: {名称: '不会混入四类装备'}},
    [questKey]: {$meta: {extensible: false, preserve: true},
      'a.b[0]': {任务名: '同名任务', 任务委托者: '伦纳德', 任务概述: '第一段\n第二段',
        完成条件: '调查', 任务奖励: '10金镑', 是否已完成: '是', 是否已领取奖励: 'false', 自定义: {keep: true}},
      another: {任务名: '同名任务', 是否已完成: false, 是否已领取奖励: false}}},
    npc_data: {伦纳德: {名称: '伦纳德'}}, world_data: {天气: '晴'}, otherPlugin: {keep: true}};
}
async function fixture(data = sample()) {
  const modules = {}, handlers = new Map(), writes = [], reads = [];
  const state = {floors: [
    {message_id: 0, role: 'assistant', message: '<UpdateVariable>不初始化</UpdateVariable>', data: sample()},
    {message_id: 1, role: 'user', message: '行动', data: {keep: true}},
    {message_id: 2, role: 'assistant', message: '原生正文\n<UpdateVariable>保留标签</UpdateVariable>', data, swipe_id: 1},
  ], pages: {}, readFail: false, writeFail: false, writeLost: false, postFail: false, noWrite: false,
    derivations: 0, chat: 'archive-chat', script: 'archive-script', gate: null, readHook: null};
  modules['cryptLord.hostApi'] = {
    scriptVariableOptions: () => ({type: 'script', script_id: state.script}),
    async getChatMessages(range, options) {
      reads.push(range); if (state.readFail) throw Error('读取失败');
      const rows = structuredClone(range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        range === '0-{{lastMessageId}}' ? state.floors : state.floors.filter(row => row.message_id === Number(range)));
      state.readHook?.(range);
      return options?.include_swipes ? rows.map(row => {
        const {message, data, extra, ...rest} = row, selected = row.swipe_id || 0, length = Math.max(2, selected + 1);
        return {...rest, swipe_id: selected, swipes: Array.from({length}, (_, index) => index === selected ? message : '未选分支'),
          swipes_data: Array.from({length}, (_, index) => index === selected ? data : {protected: true}),
          swipes_info: Array.from({length}, () => ({})), ...structuredClone(state.pages[row.message_id])};
      }) : rows;
    },
    async setChatMessages(rows) {
      if (state.writeFail) throw Error('保存失败');
      writes.push(structuredClone(rows));
      if (!state.noWrite)
        for (const row of rows) Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row));
      if (state.postFail) state.readFail = true;
      if (state.writeLost) throw Error('删除响应丢失');
    },
  };
  const surface = {document: {}, window: {localStorage: {getItem: () => null},
    SillyTavern: {getCurrentChatId: () => state.chat}}};
  const events = {CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop'};
  modules['cryptLord.afterNativeHost'] = {tavernEvents: () => events, getHost: () => surface,
    bindEvent(name, fn) {const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set);
      return {stop() {set.delete(fn)}}}};
  modules['cryptLord.dynamicStatus'] = {status: () => ({epoch: 0}),
    async load() {if (state.gate) await state.gate(); return {rules: []}}, async assertLoaded() {},
    apply() {state.derivations++}};
  const runtime = {console, structuredClone, DOMException, cryptLord: {__stage1Modules: modules, contract: {
    initializeGlobal(key, api) {modules[key] = api}, releaseGlobal(key) {delete modules[key]},
    async waitGlobalInitialized(key) {assert.ok(modules[key], key); return modules[key]},
  }}};
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return {modules, runtime, state, writes, reads, api: modules['cryptLord.characterPanelState'],
    emit: (event = 'CHAT_CHANGED', ...args) => {for (const fn of handlers.get(events[event]) || []) fn(...args)}};
}
test('完整档案与任务规则：原版独立对照、六维雷达、四类装备、精确删除和领奖/超额清理', async () => {
  const f = await fixture(), api = f.api, data = sample(), before = structuredClone(data);
  const old = vm.runInNewContext(`({${method('_listAcceptedQuests')}})`, {});
  old.SafeGetValue = (stat, key, fallback) => stat[key] ?? fallback;
  const list = api.quests(data.stat_data), oldList = old._listAcceptedQuests(data.stat_data);
  assert.deepEqual(plain(list.map(row => [row.key, row.name, row.commissioner, row.summary, row.condition, row.reward])),
    plain(oldList.map(row => [row.key, row.任务名, row.任务委托者, row.任务概述, row.完成条件, row.任务奖励])));
  assert.equal(list[0].completed, true); assert.equal(list[0].claimed, false);
  for (const value of [true, 1, '1', 'true', 'True', 'TRUE', '是']) {
    data.stat_data[questKey].another.是否已领取奖励 = value;
    assert.equal(api.quests(data.stat_data)[1].claimed, true);
  }
  for (const value of [false, 0, '0', 'false', '', null, undefined]) {
    data.stat_data[questKey].another.是否已领取奖励 = value;
    assert.equal(api.quests(data.stat_data)[1].claimed, false);
  }
  const view = api.archive(before.stat_data);
  let originalHtml = '', originalRadar;
  const attributeIds = ['huoli', 'lingxing', 'lizhi', 'renxing', 'minjie', 'yunqi'];
  const originalApi = vm.runInNewContext(`({${method('_listAcceptedQuests')},${method('_buildAcceptedQuestCardsHtml')},
    ${method('showCharacterDetails', true)}})`, {
    window: {}, console: {log() {}, warn() {}, error() {}},
    getCurrentMessageId: () => 2, getChatMessages: async () => [{data: before}],
    setTimeout: callback => callback(),
    document: {
      querySelector: () => ({set innerHTML(value) {originalHtml = value}}),
      getElementById: id => {
        const index = attributeIds.indexOf(id.replace('attr-', ''));
        if (index < 0) return {};
        const row = view.attributes[index]; return {innerText: index === 5 ? String(row.maximum) : `${row.current} / ${row.maximum}`};
      },
    },
  });
  Object.assign(originalApi, {openModal() {}, updateDisplayedAttributes() {}, _bindAcceptedQuestDeleteHandlers() {},
    SafeGetValue: (stat, key, fallback) => stat[key] ?? fallback,
    drawRadarChart(id, values) {originalRadar = values}});
  await originalApi.showCharacterDetails();
  assert.deepEqual(plain(view.radar), plain(originalRadar));
  assert.match(originalHtml, /扮演法详情|非凡特性|已完成/);
  assert.deepEqual(plain(view.attributes.map(row => row.label)), ['活力', '灵性', '理智', '人性', '敏捷', '运气']);
  assert.equal(view.attributes[0].percentage, 100); assert.equal(view.attributes[1].current, 0);
  assert.equal(view.radar[0].value, 30 / 110 * 100); assert.equal(view.radar[5].value, 100);
  assert.equal(view.digestion, 120); assert.equal(view.loss, 8); assert.equal(view.bodyAge, 25);
  assert.equal(view.traits[0].name, '神性');
  assert.deepEqual(plain(view.equipment.map(row => row.type)), ['武器', '武器', '衣物', '饰品', '封印物']);
  assert.equal(view.equipment[0].equipped, true);
  assert.equal(api.archive({}).equipment.length, 0); assert.equal(api.archive({活力: -10}).radar[0].value, 0);
  assert.equal(api.traits({abilities: {notATrait: {名称: '序列能力'}}}).length, 0);
  const next = api.removeQuest(before, list[0].key, list[0].original);
  assert.equal(Object.hasOwn(next.stat_data[questKey], 'a.b[0]'), false);
  assert.deepEqual(plain(next.stat_data[questKey].another), before.stat_data[questKey].another);
  assert.deepEqual(before, sample()); assert.equal(next.otherPlugin.keep, true);
  assert.throws(() => api.removeQuest(before, 'a.b[0]', '{}'), /变化/);
  for (const key of ['$meta', '__proto__', 'constructor', 'prototype'])
    assert.throws(() => api.removeQuest(before, key, '{}'), /不存在/);
  const start = schema.indexOf('const coerceQuestBool'), end = schema.indexOf('const AcceptedQuestsRecordSchema', start);
  const block = schema.slice(start, end), functionAt = block.indexOf('function pruneAcceptedQuestsRecord');
  const coerceAt = block.indexOf('const AcceptedQuestSchema');
  const oraclePrune = vm.runInNewContext(`${block.slice(0, coerceAt)}
    const ACCEPTED_QUEST_LIMIT=10; ${block.slice(functionAt)} pruneAcceptedQuestsRecord;`, {console: {log() {}}});
  const overflow = {$meta: {extensible: false, custom: 1}};
  for (let index = 0; index < 15; index++) overflow[`q-${index}`] = {任务名: `q-${index}`, 是否已领取奖励: index === 1 ? '是' : false, 其他: index};
  overflow.invalid = null;
  const clean = {stat_data: {[questKey]: structuredClone(overflow)}};
  api.normalizeQuests(clean);
  assert.deepEqual(plain(clean.stat_data[questKey]), plain(oraclePrune(overflow)));
  assert.equal(Object.hasOwn(clean.stat_data[questKey], 'q-0'), true);
  assert.equal(Object.hasOwn(clean.stat_data[questKey], 'q-11'), false);
  assert.equal(Object.hasOwn(clean.stat_data[questKey], 'q-1'), false);
  const once = structuredClone(clean); api.normalizeQuests(clean); assert.deepEqual(clean, once);
  for (const bad of ['坏字典', [], null]) {
    const malformed = {stat_data: {[questKey]: bad}}; api.normalizeQuests(malformed);
    assert.deepEqual(malformed.stat_data[questKey], bad);
  }
  const absent = {stat_data: {}}; api.normalizeQuests(absent); assert.deepEqual(absent, {stat_data: {}});
  const reserved = JSON.parse('{"stat_data":{"<User>接受的任务":{"__proto__":{"任务名":"保留键"},"constructor":{"任务名":"保留键"},"ordinary":{"任务名":"有效"}}}}');
  api.normalizeQuests(reserved);
  assert.deepEqual(plain(api.quests(reserved.stat_data).map(row => row.key)), ['ordinary']);
  assert.equal(Object.hasOwn(reserved.stat_data[questKey], '__proto__'), true);
  const many = sample();
  for (let index = 0; index < 151; index++) many.stat_data.武器列表[`item-${index}`] = {名称: `item-${index}`};
  assert.equal(api.archive(many.stat_data).equipment.length, 156);
  assert.equal(api.archive({武器列表: [{名称: '数组装备', isEquipped: true}]}).equipment[0].equipped, true);
});
test('完整原生事务与正文生成链：零写入查看、单写、最终冲突、重试、并发和生命周期取消', async () => {
  const f = await fixture(), {api, state, modules} = f;
  const opening = structuredClone(state.floors[0]), user = structuredClone(state.floors[1]);
  let loaded = await api.load(2);
  const target = loaded.view.quests[0];
  assert.deepEqual(f.writes, []); assert.ok(f.reads.includes('0-{{lastMessageId}}'));
  const history = await api.load(0); assert.equal(history.editable, false);
  await assert.rejects(api.commit(history, target), /历史/); assert.deepEqual(f.writes, []);
  state.writeFail = true; await assert.rejects(api.commit(loaded, target), /保存失败/);
  assert.deepEqual(state.floors[2].data, sample());
  state.writeFail = false;
  const returned = await api.commit(loaded, target); assert.equal(f.writes.length, 1);
  assert.equal(returned.loaded.view.quests.length, 1);
  await assert.rejects(api.commit(loaded, target), /变化|凭据/);
  assert.equal(state.floors[2].message, loaded.floor.message);
  for (const key of ['teamBattle', 'personalBattle']) {
    state.floors[2].data.cryptLord = {[key]: {status: 'active'}};
    await assert.rejects(api.commit(await api.load(2), target), /战斗/);
  }
  state.floors[2].data.cryptLord = {teamBattle: {status: 'finished', settled: false}};
  assert.match((await api.load(2)).reason, /战斗/);
  state.floors[2].data.cryptLord = {personalBattle: {status: 'finished', result: 'victory', enemy: {npcKey: '伦纳德'}}};
  assert.match((await api.load(2)).reason, /战斗/);
  delete state.floors[2].data.cryptLord;
  for (const bad of [[], '坏字典', null]) {
    state.floors[2].data.stat_data[questKey] = bad;
    assert.match((await api.load(2)).reason, /格式异常/);
  }
  state.floors[2].data = sample();
  for (const boundary of ['body', 'data', 'swipe', 'floor', 'chat', 'close']) {
    loaded = await api.load(2); const count = f.writes.length; let release, entered, alive = true;
    const waiting = new Promise(resolve => entered = resolve);
    state.gate = async () => {entered(); await new Promise(resolve => release = resolve)};
    const pending = api.commit(loaded, loaded.view.quests[0], () => alive); await waiting;
    if (boundary === 'body') state.floors[2].message += '\n外部编辑';
    if (boundary === 'data') state.floors[2].data.otherPlugin.changed = true;
    if (boundary === 'swipe') state.floors[2].swipe_id++;
    if (boundary === 'floor') state.floors.push({message_id: 3, role: 'user', message: '新回合', data: {}});
    if (boundary === 'chat') f.emit();
    if (boundary === 'close') alive = false;
    state.gate = null; release(); await assert.rejects(pending, /变化|取消/);
    assert.equal(f.writes.length, count); if (boundary === 'floor') state.floors.pop();
  }
  state.readHook = range => {if (range === '0-{{lastMessageId}}') {state.readHook = null; state.floors[2].message += '\n读取期间修改'}};
  await assert.rejects(api.load(2), /楼层.*变化/);
  state.floors.push({message_id: 3, role: 'user', message: '新回合', data: {}}, {message_id: 4, role: 'user', message: '连续user', data: {}});
  await assert.rejects(api.load(), /没有角色档案/);
  assert.equal((await api.load(2)).editable, false);
  state.floors.splice(3);
  loaded = await api.load(2);
  const one = api.commit(loaded, loaded.view.quests[0]), two = api.commit(loaded, loaded.view.quests[1]);
  loaded.floor.data = {}; loaded.view.quests[0].key = 'mutated-after-queue';
  await one; await assert.rejects(two, /变化/); // The queue captures both inputs immediately.
  state.postFail = true; loaded = await api.load(2);
  const uncertain = api.begin(loaded, loaded.view.quests[0]);
  await assert.rejects(uncertain.run(), /保存状态待核对/);
  assert.equal(uncertain.status(), 'uncertain');
  await assert.rejects(uncertain.inspect(), /保存状态待核对/);
  state.readFail = false; state.postFail = false;
  assert.ok((await uncertain.inspect()).loaded);
  state.floors[2].data = sample();
  modules['cryptLord.contextBuilder'] = {};
  modules['cryptLord.responseNormalizer'] = {extractActions: () => []};
  modules['cryptLord.nativeSettlement'] = {apply() {}};
  const overflow = structuredClone(state.floors[2].data);
  for (let index = 0; index < 14; index++) overflow.stat_data[questKey][`new-${index}`] = {任务名: `任务${index}`};
  overflow.stat_data[questKey].another.是否已领取奖励 = '是';
  modules['cryptLord.variablePatch'] = {commands: () => [], apply: () => ({applied: 1, data: structuredClone(overflow)}),
    updateTag: () => '', embedUpdate: message => message};
  modules['cryptLord.variableSettlementApi'] = {settle: async () => ({skipped: true})};
  modules['cryptLord.abilityState'] = {loadPool: async () => ({pathways: {}, abilities: {}}),
    synchronize: data => ({data, added: 0, patched: 0})};
  await modules['cryptLord.nativeFloorBridge'].completeNarrative('已有正文', {
    userMessageId: 1, assistantMessageId: 2, userText: '行动', narrativeText: '已有正文',
  });
  const quests = state.floors[2].data.stat_data[questKey];
  assert.equal(Object.hasOwn(quests, 'another'), false); assert.equal(Object.keys(quests).length, 11);
  assert.equal(Object.hasOwn(quests, 'new-8'), true); assert.equal(Object.hasOwn(quests, 'new-9'), false);
  const count = f.writes.length; const normalized = structuredClone(state.floors[2].data);
  state.writeFail = true;
  await assert.rejects(modules['cryptLord.stateStore'].writeAssistantData(2, overflow), /保存失败/);
  assert.deepEqual(state.floors[2].data, normalized); assert.equal(f.writes.length, count);
  assert.deepEqual(state.floors[0], opening); assert.deepEqual(state.floors[1], user);
  assert.equal(state.floors[2].data.otherPlugin.keep, true);
  assert.equal(state.floors[2].data.npc_data.伦纳德.名称, '伦纳德');
  assert.equal(state.floors[2].data.world_data.天气, '晴');
  assert.ok(f.writes.every(rows => rows.every(row => row.message_id === 2)));
  loaded = await api.load(2); api.dispose();
  await assert.rejects(api.commit(loaded, loaded.view.quests[0]), /取消/);
  const late = await fixture(); let release, entered;
  const waiting = new Promise(resolve => entered = resolve);
  late.state.gate = async () => {entered(); await new Promise(resolve => release = resolve)};
  const current = await late.api.load(2);
  const pending = late.api.commit(current, current.view.quests[0]); await waiting;
  late.api.dispose(); release(); await assert.rejects(pending, /取消/); assert.deepEqual(late.writes, []);
  const loader = await read('public/guimizhizhu_ui/loader.js'), shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
  assert.match(loader, /modules\/character-archive\/index\.js/); assert.match(loader, /modules\/character-archive\/style\.css/);
  assert.match(shell, /if \(feature\.id === 'archive'\) return showArchive\(\)/);
  assert.match(shell, /archive\.deleteQuest\(messageId, quest, expected\)/);
  assert.doesNotMatch(shell, /function renderArchive|function drawArchiveRadar|questBusy/);
  const exact = await fixture(), e = exact.api;
  let baseline = await e.load(2);
  await assert.rejects(e.commit(structuredClone(baseline), baseline.view.quests[0]), /凭据/);
  exact.state.pages[2] = (await exact.modules['cryptLord.hostApi'].getChatMessages('2', {include_swipes: true}))[0];
  exact.state.pages[2].swipes_info[1].external = true;
  await assert.rejects(e.commit(baseline, baseline.view.quests[0]), /变化/); assert.equal(exact.writes.length, 0);
  exact.state.pages = {}; exact.state.floors[2].is_hidden = true;
  await assert.rejects(e.load(), /隐藏/); await assert.rejects(e.load(2), /隐藏/);
  assert.equal((await e.load(0)).floor.message_id, 0); exact.state.floors[2].is_hidden = false;
  baseline = await e.load(2);
  exact.emit('GENERATION_STARTED', 'quiet', {}, false);
  exact.emit('GENERATION_STARTED', 'normal', {dryRun: true}, false);
  exact.emit('GENERATION_STARTED', 'normal', {}, true);
  assert.equal((await e.load(2)).editable, true);
  exact.emit('GENERATION_STARTED', 'normal', {}, false);
  assert.equal((await e.load(2)).editable, false);
  await assert.rejects(e.commit(baseline, baseline.view.quests[0]), /取消/);
  exact.emit('GENERATION_ENDED');
  await assert.rejects(e.commit(baseline, baseline.view.quests[0]), /取消/);
  baseline = await e.load(2); exact.state.writeLost = true;
  const recovered = await e.commit(baseline, baseline.view.quests[0]);
  assert.match(recovered.warning, /已核对.*确认保存/); assert.equal(exact.writes.length, 1);
  assert.equal(recovered.loaded.view.quests.length, 1);
  await assert.rejects(e.commit(baseline, baseline.view.quests[0]), /凭据/); assert.equal(exact.writes.length, 1);
  const identity = await fixture(), identityBaseline = await identity.api.load(2);
  identity.modules['cryptLord.hostApi'] = {...identity.modules['cryptLord.hostApi']};
  await assert.rejects(identity.api.commit(identityBaseline, identityBaseline.view.quests[0]), /变化/);
  assert.equal(identity.writes.length, 0);
  const mismatch = await fixture(), mismatchBaseline = await mismatch.api.load(2);
  mismatch.modules['cryptLord.hostApi'].setChatMessages = async () => {};
  const unconfirmed = mismatch.api.begin(mismatchBaseline, mismatchBaseline.view.quests[0]);
  await assert.rejects(unconfirmed.run(), /尚未保存/);
  assert.equal(unconfirmed.status(), 'pending');
  assert.equal(mismatch.state.floors[2].data.stat_data[questKey].another.任务名, '同名任务');
  mismatch.state.floors[2].data.otherPlugin.conflict = true;
  await assert.rejects(unconfirmed.save(), /变化/);
  assert.equal(unconfirmed.status(), 'invalid');
  for (const failure of ['writeFail', 'noWrite', 'writeLost', 'postFail']) {
    const recovery = await fixture(), base = await recovery.api.load(2);
    recovery.state[failure] = true;
    const transaction = recovery.api.begin(base, base.view.quests[0]);
    let result;
    if (failure === 'writeLost') result = await transaction.run();
    else {
      await assert.rejects(transaction.run(), /保存失败|尚未保存|待核对/);
      const writes = recovery.writes.length;
      if (failure === 'postFail') {
        await assert.rejects(transaction.inspect(), /待核对/);
        assert.equal(recovery.writes.length, writes);
      }
      recovery.state[failure] = false; recovery.state.readFail = false;
      result = await (transaction.status() === 'uncertain' ? transaction.inspect() : transaction.save());
    }
    assert.equal(recovery.state.derivations, 1, failure);
    assert.equal(result.loaded.view.quests.length, 1, failure);
    assert.equal(recovery.state.floors[2].data.stat_data[questKey].another.任务名, '同名任务');
    await assert.rejects(transaction.run(), /不能重复/);
  }
  for (const boundary of ['chat', 'script', 'document', 'service', 'metadata']) {
    const conflict = await fixture(), base = await conflict.api.load(2);
    const transaction = conflict.api.begin(base, base.view.quests[0]);
    if (boundary === 'chat' || boundary === 'script') conflict.state[boundary] += '-changed';
    if (boundary === 'document') conflict.modules['cryptLord.afterNativeHost'].getHost = () => ({document: {}, window: {}});
    if (boundary === 'service') conflict.modules['cryptLord.dynamicStatus'] = {...conflict.modules['cryptLord.dynamicStatus']};
    if (boundary === 'metadata') {
      conflict.state.pages[2] = (await conflict.modules['cryptLord.hostApi'].getChatMessages('2', {include_swipes: true}))[0];
      conflict.state.pages[2].swipes_info[0].date = new Date('2026-10-28');
    }
    await assert.rejects(transaction.run(), /变化|取消/);
    assert.equal(conflict.writes.length, 0, boundary);
  }
});
