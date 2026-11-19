import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptKind, isMethodDeclaration, forEachChild } from 'typescript';
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const files = ['core/native-floor-source.js', 'core/response-normalizer.js', 'core/variable-patch.js', 'core/state-store.js', 'core/response-inspector.js',
  'core/battle-prompt-mode.js', 'core/generation-bridge.js', 'modules/native-floor/index.js'];
const sources = await Promise.all(files.map(file => read(`public/guimizhizhu_ui/${file}`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt');
const [loader, shell] = await Promise.all(['public/guimizhizhu_ui/loader.js', 'public/guimizhizhu_ui/modules/game-shell/index.js'].map(read));
const plain = value => JSON.parse(JSON.stringify(value));
const names = ['【判定】战斗', '【世界】海洋环境', '【世界】神秘学基础', '【世界】灵性聚合', '【世界】简易年表（3.0版）'];
const raw = battle => `<thinking>【战斗状态表】仅推理示例</thinking><gametxt>现场：雨夜的档案室，登记记录仍在桌上。${battle ? '【战斗状态表】对峙开始。' : '调查继续。'}</gametxt>`;
function fixture() {
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: '<gametxt>开场</gametxt>', data: { stat_data: { 活力: 10 }, otherPlugin: { keep: true } } },
    { message_id: 1, role: 'user', message: '调查', data: { protected: true } },
    { message_id: 2, role: 'assistant', message: raw(false), data: { stat_data: { 活力: 10 }, otherPlugin: { keep: true } } },
  ], books: { '角色主书': [
    ...names.map((name, index) => ({ uid: index + 10, name, enabled: index > 0, content: `原提示词${index}`,
      strategy: { keys: [/角色/i], scan_depth: 8 }, position: { order: index }, custom: { keep: true } })),
    { uid: 100, name: '其他条目', content: '原样', enabled: false },
  ], '1源堡': [{ uid: 1, name: '保护主库', content: '不能改' }], '2历史孔隙': [{ uid: 2, name: '副库', content: '不能改' }] },
    variables: { otherPlugin: { keep: true } }, script: 'script-1', binding: { primary: '角色主书', additional: ['1源堡'] },
    bookWrites: [], configWrites: 0, floorWrites: [], requests: [], hook: null, page: 0, fail: false, postFail: false,
    configFail: false, configPostFail: false, modelResponse: raw(true), nativePrepare: false,
    pages: new Map(), lostBookResponse: false, lostConfigResponse: false, noBookWrite: false, noConfigWrite: false };
  const alternate = structuredClone(state.floors), surface = { document: {}, window: {} };
  const modules = {}, handlers = new Map(), warnings = [];
  const events = { CHAT_CHANGED: 'chat', GENERATION_STOPPED: 'stop', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end',
    GENERATION_AFTER_COMMANDS: 'generation' };
  const emit = async (key, ...args) => { for (const fn of handlers.get(events[key]) || []) await fn(...args); };
  const host = {
    getScriptId: () => state.script,
    scriptVariableOptions: () => ({ type: 'script', script_id: state.script }),
    getVariables(options) { assert.equal(options.type, 'script'); if (state.configFail) throw Error('配置读取失败'); return structuredClone(state.variables); },
    async updateVariablesWith(fn, options) {
      assert.equal(options.script_id, state.script); await state.hook?.('config');
      const next = await fn(structuredClone(state.variables));
      if (!state.noConfigWrite) state.variables = next;
      state.configWrites++;
      if (state.configPostFail) state.configFail = true;
      if (state.lostConfigResponse) throw Error('配置响应丢失');
    },
    getCharWorldbookNames: () => structuredClone(state.binding),
    async getWorldbook(name) { await state.hook?.('book-read'); if (state.fail) throw Error('模拟世界书失败'); return structuredClone(state.books[name]); },
    async updateWorldbookWith(name, fn) {
      await state.hook?.('book-write'); if (state.fail) throw Error('模拟世界书失败');
      const rows = await fn(structuredClone(state.books[name]));
      if (!state.noBookWrite) state.books[name] = structuredClone(rows);
      state.bookWrites.push(name);
      if (state.postFail) state.fail = true;
      if (state.lostBookResponse) throw Error('世界书响应丢失');
    },
    async getChatMessages(range, options) {
      await state.hook?.('floor-read');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        if (state.pages.has(row.message_id)) return state.pages.get(row.message_id);
        const { message, data, ...metadata } = row, old = alternate.find(item => item.message_id === row.message_id);
        const index = state.page % 2;
        return { ...metadata, swipe_id: index, swipes: index ? [old?.message || '旧分支', message] : [message, old?.message || '旧分支'],
          swipes_data: index ? [old?.data || {}, data] : [data, old?.data || {}], swipes_info: [{ keep: true }, { keep: true }] };
      }) : rows);
    },
    async setChatMessages(rows) { rows.forEach(row => {
      assert.ok(row.message_id >= 2); Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row));
      state.floorWrites.push(row.message_id);
    }); },
    async createChatMessages(rows) { rows.forEach(row => state.floors.push({ data: {}, ...structuredClone(row), message_id: (state.floors.at(-1)?.message_id ?? -1) + 1 })); },
    async generate(config) {
      state.requests.push(structuredClone(config));
      if (state.nativePrepare) await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
      await emit('GENERATION_STARTED'); await emit('GENERATION_ENDED'); return state.modelResponse;
    },
    async deleteChatMessages(ids) { state.floors = state.floors.filter(row => !ids.includes(row.message_id)); },
    generateRaw() { assert.fail('提示模式模块不得请求模型'); },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => surface, tavernEvents: () => events,
    bindEvent(name, fn) { const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set);
      return { stop: () => set.delete(fn) }; } };
  modules['cryptLord.contextBuilder'] = { build: async () => [] };
  modules['cryptLord.generationQuality'] = { readSnapshot: async () => ({ settings: { retryLimit: 0, streamTimeoutSeconds: 0, noStreamTimeoutSeconds: 0 } }),
    inspect: async text => ({ passed: true, text }) };
  modules['cryptLord.nativeSettlement'] = { apply() {} };
  modules['cryptLord.variableSettlementApi'] = { settle: async ({ previousData }) => ({ skipped: true, data: previousData, response: '' }) };
  const runtime = { console: { ...console, warn: (...args) => warnings.push(args), info() {} }, structuredClone,
    crypto: webcrypto, TextEncoder, Uint8Array, DOMException, AbortController, setTimeout, clearTimeout,
    cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, host, api: modules['cryptLord.battlePromptMode'], warnings, emit, surface };
}
function method(name) {
  const index = original.indexOf(`async ${name}(`);
  const tree = createSourceFile('original.js', `({${original.slice(index)}})`, 99, true, ScriptKind.JS);
  let result;
  const visit = node => {
    if (isMethodDeclaration(node) && node.name.getText(tree) === name) result = node.getText(tree);
    if (!result) forEachChild(node, visit);
  };
  visit(tree); assert.ok(result); return result;
}
test('完整原版模式独立对照与安全手动/设置事务：原条目开关、零写入、冲突和生命周期', async () => {
  const f = fixture(), { api, state } = f, protectedFloors = structuredClone(state.floors), originalBooks = structuredClone(state.books);
  assert.match(loader, /core\/battle-prompt-mode\.js/); assert.match(loader, /modules\/battle-prompt-mode\/style\.css/);
  assert.match(loader, /modules\/battle-prompt-mode\/index\.js/); assert.match(shell, /id: 'battle-prompt-mode', label: '战斗提示模式'/);
  const oracleBooks = structuredClone(state.books), seen = [];
  const oracle = vm.runInNewContext(`({${method('checkBattleStatusAndToggle')},${method('toggleWorldbookEntries')}})`, {
    console: { log() {}, warn() {}, error() {} }, window: { TavernHelper: {
      getCharWorldbookNames: () => state.binding,
      async updateWorldbookWith(book, update) { seen.push(book); oracleBooks[book] = update(structuredClone(oracleBooks[book])); },
    } },
  });
  let loaded = await api.load(); assert.equal(loaded.config.automatic, true); assert.equal(loaded.mode, 'normal');
  assert.equal(state.bookWrites.length, 0); assert.equal(state.configWrites, 0); assert.equal(state.floorWrites.length, 0);
  assert.equal(api.detect({ message: raw(false) }), false); assert.equal(api.detect({ message: raw(true) }), true);
  assert.equal(api.detect({ message: raw(true), data: { cryptLord: { teamBattle: { status: 'finished' } } } }), false);
  const ended = { cryptLord: { teamBattle: { status: 'finished' } } };
  assert.equal(api.detect({ message: raw(true), data: ended }, { message: raw(false), data: structuredClone(ended) }), true);
  assert.equal(api.detect({ message: raw(false), data: { cryptLord: { personalBattle: { status: 'active' } } } }), true);
  assert.throws(() => api.detect({ data: { cryptLord: { teamBattle: {} } } }), /损坏/);
  await oracle.checkBattleStatusAndToggle('【战斗状态表】');
  loaded = (await api.setMode(loaded, true)).loaded;
  assert.deepEqual(state.books, oracleBooks);
  await oracle.checkBattleStatusAndToggle('非战斗');
  loaded = (await api.setMode(loaded, false)).loaded; assert.deepEqual(state.books, oracleBooks);
  assert.equal((await api.setMode(loaded, false)).unchanged, true); assert.equal(state.bookWrites.length, 2);
  state.books['角色主书'][1].enabled = false; loaded = await api.load(); assert.equal(loaded.mode, 'mixed');
  loaded = (await api.setMode(loaded, false)).loaded;
  state.variables['cryptLord.battlePromptMode'] = { version: 1, automatic: true, future: { keep: true } };
  loaded = await api.load(); loaded = (await api.saveAutomatic(loaded, false)).loaded;
  assert.equal(loaded.config.future.keep, true); assert.equal(state.variables.otherPlugin.keep, true);
  assert.deepEqual(state.floors, protectedFloors); assert.deepEqual(state.books['1源堡'], originalBooks['1源堡']);
  assert.deepEqual(state.books['2历史孔隙'], originalBooks['2历史孔隙']);
  for (const mutate of [
    s => { s.floors[2].message += '外部正文'; }, s => { s.floors[2].data.otherPlugin.keep = false; },
    s => { s.page++; }, s => { s.floors[2].role = 'user'; }, s => { s.floors.push({ message_id: 3, role: 'user', message: '新回合', data: {} }); },
    s => { s.binding.primary = '1源堡'; }, s => { s.books['角色主书'][0].content += '外部提示词'; },
    s => { s.variables['cryptLord.battlePromptMode'] = { version: 1, automatic: false }; }, s => { s.script = '其他脚本'; },
  ]) {
    const g = fixture(), baseline = await g.api.load(); mutate(g.state);
    await assert.rejects(g.api.setMode(baseline, true), /变化|读取/); assert.equal(g.state.bookWrites.length, 0);
  }
  for (const mutate of [
    s => s.books['角色主书'].shift(),
    s => s.books['角色主书'].push(structuredClone(s.books['角色主书'][0])),
    s => { s.books['角色主书'][1].uid = 10; },
    s => { s.binding.primary = ''; },
  ]) {
    const g = fixture(); mutate(g.state); const baseline = await g.api.load();
    assert.equal(baseline.editable, false); await assert.rejects(g.api.setMode(baseline, true));
    assert.equal((await g.api.saveAutomatic(baseline, false)).loaded.config.automatic, false);
    assert.equal(g.state.bookWrites.length, 0);
  }
  {
    const g = fixture(); g.state.books['角色主书'].splice(1, 1);
    const loaded = await g.api.load();
    assert.equal(loaded.entries.length, names.length - 1);
    assert.equal(loaded.mode, 'normal');
  }
  const final = fixture(), finalBaseline = await final.api.load();
  final.state.hook = kind => { if (kind === 'book-write') final.state.books['角色主书'][0].custom.keep = false; };
  await assert.rejects(final.api.setMode(finalBaseline, true), /变化/); assert.equal(final.state.bookWrites.length, 0);
  const late = fixture(), lateBaseline = await late.api.load(); let reads = 0;
  late.state.hook = kind => {
    if (kind === 'book-write') reads = 1;
    else if (kind === 'book-read' && reads && ++reads === 4) late.state.binding.primary = '1源堡';
  };
  await assert.rejects(late.api.setMode(lateBaseline, true), /变化/); assert.equal(late.state.bookWrites.length, 0);
  const canceled = fixture(); let valid = true;
  const canceledBaseline = await canceled.api.load();
  canceled.state.hook = kind => { if (kind === 'book-write') valid = false; };
  await assert.rejects(canceled.api.setMode(canceledBaseline, true, () => valid), { name: 'AbortError' });
  for (const key of ['CHAT_CHANGED', 'GENERATION_STOPPED']) {
    const g = fixture(), baseline = await g.api.load();
    g.state.hook = kind => { if (kind === 'book-write') return g.emit(key); };
    await assert.rejects(g.api.setMode(baseline, true), { name: 'AbortError' }); assert.equal(g.state.bookWrites.length, 0);
  }
  const generating = fixture(), beforeGeneration = await generating.api.load(); await generating.emit('GENERATION_STARTED');
  await assert.rejects(generating.api.setMode(beforeGeneration, true), /生成/);
  const failure = fixture(), beforeFailure = await failure.api.load(); failure.state.fail = true;
  await assert.rejects(failure.api.setMode(beforeFailure, true));
  failure.state.fail = false; const retry = await failure.api.load(); failure.state.postFail = true;
  assert.match((await failure.api.setMode(retry, true)).warning, /无法确认.*复核失败/);
  assert.equal(failure.state.bookWrites.length, 1);
  const config = fixture(), configBaseline = await config.api.load();
  config.state.hook = kind => { if (kind === 'config') config.state.variables['cryptLord.battlePromptMode'] = { version: 1, automatic: true }; };
  await assert.rejects(config.api.saveAutomatic(configBaseline, false), /变化/); assert.equal(config.state.configWrites, 0);
  config.state.hook = null; const retryConfig = await config.api.load(); config.state.configPostFail = true;
  assert.match((await config.api.saveAutomatic(retryConfig, false)).warning, /无法确认.*复核失败/);
  const disposed = fixture(), disposedBaseline = await disposed.api.load(); disposed.api.dispose();
  await assert.rejects(disposed.api.setMode(disposedBaseline, true), { name: 'AbortError' });
  for (const kind of ['mode', 'config']) {
    const g = fixture(), baseline = await g.api.load();
    const save = value => kind === 'mode' ? g.api.setMode(value, true) : g.api.saveAutomatic(value, false);
    await assert.rejects(save(structuredClone(baseline)), /来源无效/);
    const forged = await g.api.load(); forged.config.automatic = false;
    await assert.rejects(save(forged), /来源无效/);
    for (const args of [['quiet', {}, false], ['normal', {quiet_prompt:'副请求'}, false],
      ['normal', {dryRun:true}, false], ['normal', {}, true]]) await g.emit('GENERATION_STARTED', ...args);
    assert.equal(g.api.status().generating,false);
    g.state[kind === 'mode' ? 'lostBookResponse' : 'lostConfigResponse'] = true;
    const result = await save(baseline);
    assert.match(result.warning,/已确认保存.*响应丢失/);assert.ok(result.loaded);
    await assert.rejects(save(baseline),/失效/);
    assert.equal(kind === 'mode' ? g.state.bookWrites.length : g.state.configWrites,1);
    assert.equal((await save(result.loaded)).unchanged,true);
    assert.equal(kind === 'mode' ? g.state.bookWrites.length : g.state.configWrites,1);
    const noWrite = fixture(), noWriteBaseline = await noWrite.api.load();
    noWrite.state[kind === 'mode' ? 'noBookWrite' : 'noConfigWrite'] = true;
    const noWriteSave = () => kind === 'mode' ? noWrite.api.setMode(noWriteBaseline,true) : noWrite.api.saveAutomatic(noWriteBaseline,false);
    assert.match((await noWriteSave()).warning,/无法确认.*复核失败/);
    await assert.rejects(noWriteSave(),/失效/);
    const retryable = fixture(), retryableBaseline = await retryable.api.load();
    retryable.state[kind === 'mode' ? 'noBookWrite' : 'noConfigWrite'] = true;
    retryable.state[kind === 'mode' ? 'lostBookResponse' : 'lostConfigResponse'] = true;
    const retrySave = () => kind === 'mode' ? retryable.api.setMode(retryableBaseline,true) : retryable.api.saveAutomatic(retryableBaseline,false);
    await assert.rejects(retrySave(),/响应丢失/);
    retryable.state.noBookWrite = retryable.state.noConfigWrite = false;
    assert.match((await retrySave()).warning,/已确认保存/);
  }
  for (const mutate of [
    async g=>{const page=(await g.host.getChatMessages('0-{{lastMessageId}}',{include_swipes:true}))[0];
      page.swipes[1]+='其他分支';g.state.pages.set(0,page)},
    async g=>{g.surface.document={}},
    async g=>{g.modules['cryptLord.responseInspector']={...g.modules['cryptLord.responseInspector']}},
    async g=>{g.modules['cryptLord.hostApi']={...g.host}},
  ]) {
    const g=fixture(),baseline=await g.api.load();await mutate(g);
    await assert.rejects(g.api.setMode(baseline,true),/变化|失效|读取/);
    await assert.rejects(g.api.saveAutomatic(baseline,false),/变化|失效|读取/);
    assert.equal(g.state.bookWrites.length,0);assert.equal(g.state.configWrites,0);
  }
  const epoch=fixture(),old=await epoch.api.load();
  await epoch.emit('GENERATION_STARTED','normal',{},false);await epoch.emit('GENERATION_ENDED',2);
  await assert.rejects(epoch.api.setMode(old,true),/旧手动操作已取消/);
  assert.ok((await epoch.api.setMode(await epoch.api.load(),true)).loaded);
  const hidden=fixture();hidden.state.floors[2].is_hidden=true;
  const hiddenBaseline=await hidden.api.load();assert.equal(hiddenBaseline.editable,false);
  await assert.rejects(hidden.api.setMode(hiddenBaseline,true),/隐藏/);
  const newUser=fixture();newUser.state.floors.push({message_id:3,role:'user',message:'新回合',data:{}});
  const incomplete=await newUser.api.load();assert.equal(incomplete.editable,false);
  await assert.rejects(newUser.api.setMode(incomplete,true),/user 回合/);
});
test('完整自动链路：真实原生回合保存后切换、原生重生成/续写/副请求隔离、本地战斗进入退出', async () => {
  const f = fixture(), { api, state, modules } = f, protectedOpening = structuredClone(state.floors[0]);
  state.floors[2].data.cryptLord = { teamBattle: { status: 'finished' } };
  state.nativePrepare = true;
  await modules['cryptLord.nativeFloor'].submitNativeTurn('迎战', { source: 'battle-prompt-test' });
  assert.equal(state.floors.length, 5); assert.equal(state.floors[3].role, 'user'); assert.equal(state.floors[4].role, 'assistant');
  assert.equal(state.requests.length, 1); assert.ok(state.floorWrites.includes(4)); assert.deepEqual(state.floors[0], protectedOpening);
  assert.deepEqual(state.bookWrites, ['角色主书'], f.warnings.map(row=>row.map(String).join(' ')).join('\n'));
  assert.equal((await api.load()).mode, 'battle');
  const loaded = await api.load(); await api.saveAutomatic(loaded, false);
  state.modelResponse = raw(false); await modules['cryptLord.nativeFloor'].submitNativeTurn('继续调查');
  assert.equal(state.bookWrites.length, 1); assert.equal((await api.load()).mode, 'battle');
  await api.saveAutomatic(await api.load(), true);
  state.floors.at(-1).data.cryptLord = { teamBattle: { status: 'active' } };
  await api.observe(); assert.equal(state.bookWrites.length, 1);
  state.floors.at(-1).data.cryptLord.teamBattle.status = 'finished';
  await api.observe(); assert.equal((await api.load()).mode, 'normal'); assert.equal(state.bookWrites.length, 2);
  const g = fixture();
  for (const type of ['normal', 'regenerate', 'swipe', 'continue', 'append']) {
    if (type === 'normal') g.state.floors.pop();
    await g.emit('GENERATION_AFTER_COMMANDS', type, {}, false);
    if (type === 'normal') g.state.floors.push({ message_id: 2, role: 'assistant', message: raw(true), data: {} });
    else g.state.floors[2].message = raw(!['continue', 'append'].includes(type));
    const result = await g.api.completeTurn(g.state.floors[2].message, {
      assistantMessageId: 2, userMessageId: 1, userText: '调查', guard: () => true,
    });
    assert.ok(result.loaded || result.unchanged);
  }
  assert.equal((await g.api.load()).mode, 'normal');
  const pending = fixture();
  pending.state.hook = kind => { if (kind === 'floor-read') { pending.state.hook = null; pending.api.finishTurn(); } };
  await assert.rejects(pending.api.prepareTurn(), { name: 'AbortError' });
  await g.emit('GENERATION_AFTER_COMMANDS', 'quiet', {}, false);
  assert.equal((await g.api.completeTurn(raw(true), { assistantMessageId: 2, userMessageId: 1, userText: '调查' })).skipped, true);
  for (const args of [['normal', {}, true], ['normal', { quiet_prompt: '副请求' }, false]]) {
    await g.emit('GENERATION_AFTER_COMMANDS', ...args);
    assert.equal((await g.api.completeTurn(raw(true), {})).skipped, true);
  }
  const change = fixture(); change.state.floors.pop();
  const turn = await change.api.prepareTurn();
  change.state.floors.push({ message_id: 2, role: 'assistant', message: raw(true), data: {} });
  change.state.books['角色主书'][0].content += '生成期间手改';
  await assert.rejects(change.api.completeTurn(raw(true), { assistantMessageId: 2, userMessageId: 1, userText: '调查' }, turn), /生成期间/);
  assert.equal(change.state.bookWrites.length, 0);
  const failure = fixture(), bridge = failure.modules['cryptLord.nativeFloorBridge'];
  failure.state.floors.pop();
  const prepared = await failure.api.prepareTurn(); failure.state.floors.push({ message_id: 2, role: 'assistant', message: raw(true), data: {} });
  failure.state.hook = kind => { if (kind === 'book-write') failure.state.fail = true; };
  await bridge.completeNarrative(raw(true), {
    assistantMessageId: 2, userMessageId: 1, userText: '调查', narrativeText: raw(true), battlePromptTurn: prepared, guard: () => true,
  });
  assert.ok(failure.state.floorWrites.includes(2)); assert.equal(failure.state.bookWrites.length, 0);
  assert.match(failure.state.floors[2].message, /【战斗状态表】/);
  assert.ok(failure.warnings.some(row => String(row[0]).includes('战斗提示自动切换失败')));
  failure.state.fail = false; failure.state.hook = null;
  await failure.api.setMode(await failure.api.load(), true); assert.equal(failure.state.bookWrites.length, 1);
  const stop = fixture(); stop.state.floors.pop(); const canceledTurn = await stop.api.prepareTurn();
  await stop.emit('CHAT_CHANGED');
  stop.state.floors.push({ message_id: 2, role: 'assistant', message: raw(true), data: {} });
  await assert.rejects(stop.api.completeTurn(raw(true), { assistantMessageId: 2, userMessageId: 1, userText: '调查' }, canceledTurn), /失效/);
  assert.equal(stop.state.bookWrites.length, 0);
  const tamper = fixture(); tamper.state.floors.pop(); const proof = await tamper.api.prepareTurn();
  await assert.rejects(tamper.api.completeTurn(raw(true),{},structuredClone(proof)),/失效/);
  proof.targets[0].content = '伪造';
  await assert.rejects(tamper.api.completeTurn(raw(true), {}, proof), /失效/);
  for (const type of ['normal','regenerate','swipe','continue','append']) {
    for (const id of [0,1]) {
      const g=fixture();if(type==='normal')g.state.floors.pop();
      const turn=await g.api.prepareTurn(undefined,type);
      const page=(await g.host.getChatMessages('0-{{lastMessageId}}',{include_swipes:true})).find(row=>row.message_id===id);
      page.swipes_data[1].external=true;g.state.pages.set(id,page);
      if(type==='normal')g.state.floors.push({message_id:2,role:'assistant',message:raw(true),data:{}});
      else g.state.floors[2].message=raw(true);
      await assert.rejects(g.api.completeTurn(raw(true),{assistantMessageId:2,userMessageId:1,userText:'调查'},turn),/完整分支已变化/);
      assert.equal(g.state.bookWrites.length,0);
    }
  }
  const lost=fixture();lost.state.floors.pop();const lostTurn=await lost.api.prepareTurn();
  lost.state.floors.push({message_id:2,role:'assistant',message:raw(true),data:{}});
  lost.state.lostBookResponse=true;
  assert.match((await lost.api.completeTurn(raw(true),{assistantMessageId:2,userMessageId:1,userText:'调查'},lostTurn)).warning,/已确认保存/);
  assert.equal(lost.state.bookWrites.length,1);
});
