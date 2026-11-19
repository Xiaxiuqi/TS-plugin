import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const names = ['variable-patch', 'response-normalizer', 'state-store', 'ai-context-config', 'variable-settlement-api', 'variable-workbench-state'];
const sources = await Promise.all(names.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const plain = value => JSON.parse(JSON.stringify(value));
const empty = '{"stat_data":[],"npc_data":[],"world_data":[]}';
const patch = (value = 18) => `<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/活力","value":${value}}],"npc_data":[],"world_data":[]}</JSONPatch></UpdateVariable>`;
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36b-js-faction-industry-mail-save.txt');
const tree = ts.createSourceFile('original.js', original.slice(original.indexOf('class FloatingVariableEditor')), 99, true, ts.ScriptKind.JS);
const members = new Map(), wanted = ['updateRawTextarea', 'addPatch', 'handleValueChange', 'handleDeleteNode', '_syncRawToDeep'];
function visit(node) {
  if (ts.isMethodDeclaration(node) && wanted.includes(node.name.getText(tree))) members.set(node.name.getText(tree), node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree); assert.equal(members.size, wanted.length);
function sample() {
  return { stat_data: { 活力: 10, 开关: false, 地点: '廷根', 秘密: '不可外发', 列表: ['甲', '乙', '丙'], 空值: null,
    'a.b[0]/~': { 值: 7 }, $meta: { extensible: false } }, npc_data: { 伦纳德: { 好感: 3 } },
    world_data: { 当前时间纪元: '第五纪' }, stat_data_for_ai: { 原文: '只读快照' }, otherPlugin: { keep: true } };
}
async function fixture() {
  const handlers = new Map(), writes = [], reads = [], calls = [], modules = {};
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: `开场\n${patch(10)}`, data: sample() },
    { message_id: 1, role: 'user', message: '调查', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: `原生正文\n${patch(10)}`, data: sample(), swipe_id: 1 },
  ], variables: { 'cryptLord.variableSettlement': { retryLimit: 0 },
    'cryptLord.aiContextConfig': { hiddenFields: ['stat_data.秘密'], lockedFields: [] } },
    writeFail: false, responseLost: false, readFail: false, postFail: false, gate: null, modelGate: null, modelHook: null, response: patch(),
    otherPage: { message: '未选分支', data: { stat_data: { 活力: 99 } }, extra: { branch: true } }, document: {}, pageMismatch: false,
    binding: { primary: '1源堡', additional: [] }, settingsGate: null, templateHook: null,
    books: { '1源堡': [{ uid: 1, name: '【模板】提示词模板', content: JSON.stringify({
      variable_template: '原版结算模板', fix_variable_template: '原版修复模板' }), enabled: false }],
      '2历史孔隙': [{ uid: 2, name: '【模板】提示词模板', content: '坏副库，应被主库覆盖' }] } };
  modules['cryptLord.hostApi'] = {
    scriptVariableOptions: () => ({ type: 'script', script_id: 'workbench-test' }),
    async getVariables() { await state.settingsGate?.(); return structuredClone(state.variables); },
    getCharWorldbookNames: () => structuredClone(state.binding),
    getWorldbook: async book => { state.templateHook?.(); return structuredClone(state.books[book] || []); },
    async getChatMessages(range, options = {}) {
      reads.push(range); if (state.readFail) throw Error('读取失败');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(rows.map(row => {
        const { swipe_id = 0, message = '', data = {}, extra = {}, ...identity } = row;
        if (!options.include_swipes) return { ...identity, message, data, extra };
        const pages = Array.from({ length: Math.max(2, swipe_id + 1) }, () => state.otherPage);
        pages[swipe_id] = { message, data, extra };
        return { ...identity, swipe_id, swipes: pages.map((page, index) =>
          state.pageMismatch && index === swipe_id ? '与普通楼层不一致的正文' : page.message),
          swipes_data: pages.map(page => page.data), swipes_info: pages.map(page => page.extra) };
      }));
    },
    async setChatMessages(rows) {
      if (state.writeFail) throw Error('保存失败');
      writes.push(structuredClone(rows));
      for (const row of rows) Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row));
      if (state.postFail) state.readFail = true;
      if (state.responseLost) throw Error('保存响应丢失');
    },
    async generateRaw(config) { calls.push(structuredClone(config)); await state.modelGate?.(); state.modelHook?.(); return state.response; },
  };
  modules['cryptLord.afterNativeHost'] = { getHost: () => ({ document: state.document }),
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, handler) {
      const set = handlers.get(name) || new Set(); handlers.set(name, set); set.add(handler);
      return { stop() { set.delete(handler); } };
    } };
  modules['cryptLord.dynamicStatus'] = { status: () => ({ epoch: 0 }),
    async load() { await state.gate?.(); return { rules: [] }; }, apply() {} };
  const runtime = { console, structuredClone, URL, setTimeout: fn => setTimeout(fn, 0), clearTimeout,
    cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) {
      assert.ok(modules[key], key); return modules[key];
    } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, writes, reads, calls, api: modules['cryptLord.variableWorkbenchState'],
    emit: (name = 'chat', ...args) => handlers.get(name)?.forEach(fn => fn(...args)) };
}
test('完整草稿规则：原版独立对照、三域原始同步、增删改、恢复、复杂键与保留域', async () => {
  const { api, writes } = await fixture(), data = sample();
  let textarea = { value: '' };
  const oracle = vm.runInNewContext(`new (class Original {${[...members.values()].join('\n')}})`, { _: lodash });
  Object.assign(oracle, { baseState: structuredClone(data), localClone: structuredClone(data), pendingPatches: [],
    panel: { querySelector: () => textarea }, renderTree() {}, hideErrors() {}, showErrors(errors) { throw Error(errors.join('\n')); } });
  oracle.handleValueChange('/stat_data/活力', 18, { classList: { add() {}, remove() {} } });
  let next = api.mutate(data, 'stat_data', ['活力'], 'replace', 18);
  assert.deepEqual(plain(next), oracle.localClone);
  assert.deepEqual(plain(api.changes(data, next)), JSON.parse(textarea.value));
  oracle.handleDeleteNode('/stat_data/列表/1');
  next = api.mutate(next, 'stat_data', ['列表', '1'], 'remove');
  assert.deepEqual(plain(next), oracle.localClone); assert.deepEqual(plain(next.stat_data.列表), ['甲', '丙']);
  textarea.value = '{"stat_data":[{"op":"replace","path":"/开关","value":true}],"world_data":[{"op":"replace","path":"/当前时间纪元","value":"第六纪"}]}';
  oracle._syncRawToDeep();
  assert.deepEqual(plain(api.applyPatch(data, textarea.value).data), oracle.localClone);
  const complex = api.mutate(data, 'stat_data', ['a.b[0]/~', '值'], 'replace', 22);
  assert.equal(api.changes(data, complex).stat_data[0].path, '/a.b[0]~1~0/值');
  assert.deepEqual(plain(api.applyPatch(data, JSON.stringify(api.changes(data, complex))).data), plain(complex));
  const list = api.applyPatch(data, '[{"op":"add","path":"/列表/1","value":"新"},{"op":"remove","path":"/列表/2"}]').data;
  assert.deepEqual(plain(list.stat_data.列表), ['甲', '新', '丙']);
  assert.equal(api.applyPatch(data, '[{"op":"replace","path":"/当前时间纪元","value":"第六纪"}]').data.world_data.当前时间纪元, '第六纪');
  assert.deepEqual(plain(api.applyPatch(data, '').data), data);
  assert.equal(api.applyPatch({ stat_data: '损坏' }, '{"stat_data":[{"op":"replace","path":"","value":{}}]}').data.stat_data.constructor, Object);
  const extracted = api.recovered({ message: `${patch(8)}\n${patch(9)}`, data: { cryptLord: { lastUpdateVariable: patch(1) } } });
  assert.equal(JSON.parse(extracted).stat_data[0].value, 9);
  assert.equal(JSON.parse(api.recovered({ message: '普通正文', data: { cryptLord: { lastUpdateVariable: empty } } })).stat_data.length, 0);
  assert.throws(() => api.recovered({ message: '普通正文' }), /没有可恢复/);
  for (const raw of ['坏 JSON', '{"stat_data":"坏格式"}', '{"stat_data_for_ai":[]}',
    '[{"op":"replace","path":"/列表/99","value":1}]', '[{"op":"replace","path":"/未知/子项","value":1}]',
    '[{"op":"replace","path":"/__proto__/污染","value":1}]', '[{"op":"add","path":"/新增","value":{"constructor":{}}}]',
    '[{"op":"replace","path":"/活力","value":1},{"op":"move","path":"/开关"}]'])
    assert.throws(() => api.applyPatch(data, raw));
  assert.deepEqual(data, sample()); assert.deepEqual(writes, []);
});
test('完整原生事务：真实 stateStore、世界书模板、共享 AI、重新结算、冲突与生命周期', async () => {
  const f = await fixture(), { api, state, writes, calls, modules } = f;
  const opening = structuredClone(state.floors[0]), user = structuredClone(state.floors[1]);
  let loaded = await api.load(2), next = api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 12);
  assert.deepEqual(writes, []); assert.ok(f.reads.includes('0-{{lastMessageId}}'));
  const historical = await api.load(0); assert.equal(historical.editable, false);
  await assert.rejects(api.commit(historical, next), /只读/);
  assert.equal((await api.commit(loaded, loaded.floor.data)).unchanged, true); assert.deepEqual(writes, []);
  state.writeFail = true; await assert.rejects(api.commit(loaded, next), /保存失败/);
  state.writeFail = false;
  const saved = await api.commit(loaded, next); assert.equal(saved.data.stat_data.活力, 12);
  assert.equal(state.floors[2].message, loaded.floor.message); assert.equal(writes.length, 1);
  assert.equal(saved.data.otherPlugin.keep, true); assert.deepEqual(saved.data.stat_data_for_ai, sample().stat_data_for_ai);
  await assert.rejects(api.commit(loaded, next), /变化/);
  for (const boundary of ['body', 'data', 'swipe', 'floor', 'chat', 'close']) {
    loaded = await api.load(2); next = api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 13);
    let entered, release, alive = true;
    const waiting = new Promise(resolve => { entered = resolve; });
    state.gate = async () => { entered(); await new Promise(resolve => { release = resolve; }); };
    const pending = api.commit(loaded, next, () => alive); await waiting; const count = writes.length;
    if (boundary === 'body') state.floors[2].message += '\n外部修改';
    if (boundary === 'data') state.floors[2].data.otherPlugin.changed = true;
    if (boundary === 'swipe') state.floors[2].swipe_id++;
    if (boundary === 'floor') state.floors.push({ message_id: 3, role: 'user', message: '新回合' });
    if (boundary === 'chat') f.emit();
    if (boundary === 'close') alive = false;
    state.gate = null; release(); await assert.rejects(pending, /变化|取消/);
    assert.equal(writes.length, count); if (boundary === 'floor') state.floors.pop();
  }
  state.floors[2].data = sample(); loaded = await api.load(2);
  const patchService = modules['cryptLord.variablePatch'];
  assert.equal(patchService.apply(`${patch(13)}<思考><thinking>${patch(99)}</thinking></思考>`, sample()).data.stat_data.活力, 13);
  assert.equal(patchService.apply(`<思考>${patch(99)}</思考>`, sample()).applied, 0);
  assert.equal(patchService.apply(`<thinking>${patch(99)}`, sample()).applied, 0);
  assert.throws(() => patchService.controlText(`<思考>${patch(99)}`), /未闭合/);
  const taggedValue = '<details><summary>保留文本</summary>内容</details><think>';
  const valuePatch = JSON.stringify({ stat_data: [{ op: 'replace', path: '/地点', value: taggedValue }] });
  assert.equal(patchService.apply(valuePatch, sample(), { allowBare: true }).data.stat_data.地点, taggedValue);
  assert.equal(patchService.apply(`<UpdateVariable><JSONPatch>${valuePatch}</JSONPatch></UpdateVariable>`, sample()).data.stat_data.地点, taggedValue);
  state.response = `<思考>${patch(99)}</思考>`;
  const noHiddenSave = writes.length;
  await assert.rejects(api.repair(loaded, loaded.floor.data, '修复', ''), /未返回可识别/);
  assert.equal(writes.length, noHiddenSave);
  state.response = `${patch(18)}<思考>${patch(99)}</思考>`;
  const safeRepair = await api.repair(loaded, loaded.floor.data, '修复', '');
  assert.equal(safeRepair.data.stat_data.活力, 18);
  assert.match(patchService.updateTag(safeRepair.response), /18/); assert.doesNotMatch(patchService.updateTag(safeRepair.response), /99/);
  state.response = patch();
  const a = api.commit(loaded, api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 14));
  const b = api.commit(loaded, api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 15));
  loaded.floor.data = {}; await a; await assert.rejects(b, /变化/);
  state.floors[2].data.otherPlugin.changed = true;
  loaded = await api.load(2); const count = writes.length;
  const repaired = await api.repair(loaded, loaded.floor.data, '修复活力', JSON.stringify({
    stat_data: [{ op: 'replace', path: '/秘密', value: '不可外发' }] }));
  assert.equal(repaired.data.stat_data.活力, 18); assert.equal(writes.length, count);
  assert.equal(calls.at(-1).ordered_prompts[0].content, '原版修复模板'); assert.doesNotMatch(calls.at(-1).user_input, /不可外发/);
  await api.repair(loaded, loaded.floor.data, '修复', JSON.stringify({
    stat_data: [{ op: 'replace', path: '', value: { 秘密: '隐藏在父级替换中的秘密', 活力: 14 } }] }));
  assert.doesNotMatch(calls.at(-1).user_input, /隐藏在父级替换中的秘密/);
  state.books['1源堡'][0].content = '{}';
  const countModels = calls.length;
  await assert.rejects(api.repair(loaded, loaded.floor.data, '修复', ''), /缺少.*fix_variable_template/);
  assert.equal(calls.length, countModels);
  state.books['1源堡'][0].content = JSON.stringify({ variable_template: '原版结算模板', fix_variable_template: '原版修复模板' });
  state.response = empty;
  const retried = await api.retry(loaded);
  assert.equal(retried.loaded.floor.data.stat_data.活力, 10);
  assert.match(state.floors[2].message, /原生正文/); assert.match(state.floors[2].message, /<UpdateVariable>/);
  assert.equal(calls.at(-1).ordered_prompts[0].content, '原版结算模板');
  assert.doesNotMatch(calls.at(-1).user_input, /UpdateVariable|JSONPatch|未选分支/);
  assert.equal(state.floors[2].data.otherPlugin.changed, true); // Current non-variable metadata survives replay.
  loaded = await api.load(2);
  state.pageMismatch = true;
  await assert.rejects(api.load(2), /正文或变量不一致/);
  state.pageMismatch = false;
  state.binding = { primary: '真实角色主书', additional: ['附加模板', '真实角色主书'] };
  state.books['真实角色主书'] = structuredClone(state.books['1源堡']);
  state.books['1源堡'] = [{ name: '【模板】提示词模板', content: '旧固定主书禁止读取' }];
  state.books['真实角色主书'][0].content = JSON.stringify({ variable_template: '真实主书结算模板' });
  state.books['附加模板'] = [{ name: '【模板】附加提示词模板', content: JSON.stringify({ fix_variable_template: '合并保留的修复模板' }) }];
  state.response = patch(21);
  const shared = modules['cryptLord.variableSettlementApi'];
  let output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  assert.equal(calls.at(-1).ordered_prompts[0].content, '合并保留的修复模板');
  await shared.assertResult(output);
  state.books['真实角色主书'].push({ name: '其他插件', content: '不影响模板' });
  await shared.assertResult(output);
  state.books['附加模板'][0].strategy = { keys: [/原模板/i] };
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  state.books['附加模板'][0].strategy.keys = [/新模板/i];
  await assert.rejects(shared.assertResult(output), /模板来源已变化/);
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  const preview = await api.prepareCommit(loaded, output.data, undefined, output);
  state.books['附加模板'][0].enabled = true;
  const writesBefore = writes.length;
  await assert.rejects(api.commit(loaded, output.data, undefined, null, preview), /模板来源已变化/);
  assert.equal(writes.length, writesBefore);
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  const unchanged = structuredClone(output.data);output.data.stat_data.活力 = 99;
  await assert.rejects(shared.assertResult(output), /结果已被修改/);
  assert.equal(state.floors[2].data.stat_data.活力, 10);
  await assert.rejects(shared.assertResult({ ...output, data: unchanged }), /凭据无效/);
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  state.variables['cryptLord.variableSettlement'].retryLimit = 2;
  await assert.rejects(shared.assertResult(output), /设置已变化/);
  state.variables['cryptLord.variableSettlement'].retryLimit = 0;
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  state.variables['cryptLord.aiContextConfig'].lockedFields = ['stat_data.活力'];
  await assert.rejects(shared.assertResult(output), /锁定设置已变化/);
  state.variables['cryptLord.aiContextConfig'].lockedFields = [];
  state.modelHook = () => { state.books['附加模板'][0].content = JSON.stringify({ fix_variable_template: '等待中修改' }); };
  const callsBefore = calls.length;
  await assert.rejects(api.repair(loaded, loaded.floor.data, '改活力', ''), /模板来源已变化/);
  assert.equal(calls.length, callsBefore + 1);assert.equal(writes.length, writesBefore);state.modelHook = null;
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  state.binding.additional.push('新附加库');
  await assert.rejects(shared.assertResult(output), /模板来源已变化/);
  state.binding.additional.pop();
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  modules['cryptLord.variableSettlementApi'] = { ...shared };
  await assert.rejects(shared.assertResult(output), /取消/);
  modules['cryptLord.variableSettlementApi'] = shared;
  let beginSettings, finishSettings;
  const readingSettings = new Promise(resolve => { beginSettings = resolve; });
  state.settingsGate = () => { beginSettings(); return new Promise(resolve => { finishSettings = resolve; }); };
  const beforeChatRequests = calls.length;
  const changedChat = shared.settle({ previousData: loaded.floor.data, userText: '旧聊天行动', narrativeText: '旧聊天正文' });
  const cancelledChat = assert.rejects(changedChat, /取消/);
  await readingSettings; f.emit(); state.settingsGate = null; finishSettings(); await cancelledChat;
  assert.equal(calls.length, beforeChatRequests);
  loaded = await api.load(2);
  output = await api.repair(loaded, loaded.floor.data, '改活力', '');
  const acceptedPreview = await api.prepareCommit(loaded, output.data, undefined, output);
  await api.commit(loaded, output.data, undefined, null, acceptedPreview);
  assert.equal(state.floors[2].data.stat_data.活力, 21);
  loaded = await api.load(2);state.response = empty;
  loaded = await api.load(2); state.modelHook = () => { state.floors[0].data.stat_data.活力++; };
  const beforeRetry = writes.length; await assert.rejects(api.retry(loaded), /前状态已变化/);
  assert.equal(writes.length, beforeRetry); state.modelHook = null;
  state.floors[0] = structuredClone(opening);
  let release, entered, alive = true;
  const waiting = new Promise(resolve => { entered = resolve; });
  state.modelGate = async () => { entered(); await new Promise(resolve => { release = resolve; }); };
  const late = api.repair(await api.load(2), state.floors[2].data, '修复', '', () => alive);
  await waiting; alive = false; state.modelGate = null; release(); await assert.rejects(late, /取消/);
  state.floors[2].data.cryptLord = { teamBattle: { status: 'active' } };
  assert.match((await api.load(2)).reason, /战斗/); delete state.floors[2].data.cryptLord;
  loaded = await api.load(2); state.postFail = true;
  const warning = await api.commit(loaded, api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 11));
  assert.equal(warning.loaded, null); assert.match(warning.warning, /已保存/);
  state.readFail = false; state.postFail = false;
  loaded = await api.load(2);
  await assert.rejects(api.commit(structuredClone(loaded), loaded.floor.data), /凭据无效/);
  const floorSource = await modules['cryptLord.variableSettlementApi'].readFloorSource({ messageId: 2 });
  await assert.rejects(modules['cryptLord.variableSettlementApi'].assertFloorSource(structuredClone(floorSource)), /凭据无效/);
  const beforeBranches = writes.length;
  state.otherPage.extra.changed = true;
  await assert.rejects(api.commit(loaded, api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 12)), /消息页.*变化/);
  assert.equal(writes.length, beforeBranches);
  loaded = await api.load(2); const alternateBody = state.otherPage.message;
  state.modelHook = () => { state.otherPage.message += '已改'; };
  await assert.rejects(api.retry(loaded), /前状态已变化/);
  assert.equal(writes.length, beforeBranches); state.modelHook = null; state.otherPage.message = alternateBody;
  loaded = await api.load(2);
  const beforeStaleModel = calls.length;
  state.templateHook = () => { state.otherPage.message = '等待模板读取时改变的分支'; };
  await assert.rejects(api.repair(loaded, loaded.floor.data, '修复', ''), /消息页或前状态已变化/);
  assert.equal(calls.length, beforeStaleModel);
  state.templateHook = null; state.otherPage.message = alternateBody;
  loaded = await api.load(2); state.document = {};
  await assert.rejects(api.commit(loaded, loaded.floor.data), /来源服务已变化/);
  loaded = await api.load(2);
  for (const args of [['quiet'], ['dryRun'], ['normal', { dryRun: true }], ['normal', { quiet_prompt: '旁路' }], ['normal', {}, true]]) {
    f.emit('start', ...args);
    assert.equal((await api.commit(loaded, loaded.floor.data)).unchanged, true);
  }
  f.emit('start', 'normal');
  await assert.rejects(api.load(2), /正在生成/); f.emit('end');
  await assert.rejects(api.commit(loaded, loaded.floor.data), /来源服务已变化|取消/);
  loaded = await api.load(2); state.responseLost = true;
  await assert.rejects(api.commit(loaded, api.mutate(loaded.floor.data, 'stat_data', ['活力'], 'replace', 16)),
    error => /响应丢失/.test(error.message) && error.requiresReload === true);
  state.responseLost = false;
  const lostCount = writes.length;
  await assert.rejects(api.commit(loaded, loaded.floor.data), /变化/); assert.equal(writes.length, lostCount);
  state.floors[2].is_hidden = true;
  assert.equal((await api.load(2)).editable, false);
  await assert.rejects(modules['cryptLord.variableSettlementApi'].retryTurn({ messageId: 2 }), /隐藏/);
  delete state.floors[2].is_hidden;
  state.floors[0].is_hidden = true;
  await assert.rejects(modules['cryptLord.variableSettlementApi'].retryTurn({ messageId: 2 }), /前状态.*隐藏/);
  delete state.floors[0].is_hidden;
  assert.deepEqual(state.floors[0], opening); assert.deepEqual(state.floors[1], user);
  assert.equal({}.污染, undefined);
  const unsafe = modules['cryptLord.variablePatch'].apply('<UpdateVariable><JSONPatch>{"stat_data":[{"op":"add","path":"/__proto__/污染","value":true}]}</JSONPatch></UpdateVariable>', sample());
  assert.equal(unsafe.applied, 0); assert.equal({}.污染, undefined);
  api.dispose(); await assert.rejects(api.load(2), /取消/);
});
