import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const paths = ['shared/save-recovery.js', 'core/native-floor-source.js', 'core/response-normalizer.js', 'core/response-inspector.js',
  'core/journey-reader.js', 'core/native-editor.js', 'core/story-archive.js',
  'core/state-store.js', 'core/variable-patch.js', 'core/generation-bridge.js', 'modules/native-floor/index.js'];
const sources = await Promise.all(paths.map(path => read(`public/guimizhizhu_ui/${path}`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
const originalSettings = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt');
const plain = value => JSON.parse(JSON.stringify(value));
const journey = (serial = 2, title = '雨夜调查') => `序号|${serial}\n日期|第五纪1349年9月1日\n大纲|${title}\n详细描述|调查档案室\n保留多行描述`;
const raw = (text = '现场：调查员在雨夜核对档案室中的登记簿。', serial = 2) =>
  `<gametxt>${text}</gametxt><本周目经历>${journey(serial)}</本周目经历><safe><gametxt>假正文</gametxt></safe>`;
function methods(text, names) {
  return names.map(name => {
    const start = text.search(new RegExp(`^(?:async )?${name}\\([^\\n]*\\)\\s*\\{`, 'm'));
    assert.notEqual(start, -1);
    const tree = ts.createSourceFile('original.js', `({${text.slice(start)}})`, 99, true, ts.ScriptKind.JS);
    let result;
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) result = node.getText(tree);
      if (!result) ts.forEachChild(node, visit);
    }
    visit(tree); assert.ok(result); return result;
  }).join(',\n');
}
function fixture() {
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: '<gametxt>开场</gametxt>', data: { stat_data: { 活力: 12 }, otherPlugin: { keep: true } } },
    { message_id: 1, role: 'user', message: '调查档案室', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: raw(), data: { stat_data: { 活力: 12 } }, swipe_id: 0 },
  ], pages: {}, books: {
    '实际主书': [{ uid: 2, name: '本周目经历', content: journey(1, '开场'), enabled: true, future: { keep: true },
      strategy: { keys: [/雨夜/i] } }, { uid: 8, name: '其他条目', content: '原文', enabled: true }],
    '1源堡': [{ uid: 2, name: '小说模式', content: '副库原文' }], '2历史孔隙': [],
  }, variables: { otherPlugin: { keep: true } }, binding: { primary: '实际主书', additional: ['1源堡'] }, script: 'script-1',
  writes: [], booksWritten: [], configWrites: 0, hook: null, bookFail: false, postFail: false,
  configFail: false, configPostFail: false, bookResponseLost: false, configResponseLost: false, requests: [], warnings: [] };
  const handlers = new Map(), modules = {}, events = Object.fromEntries(['CHAT_CHANGED', 'GENERATION_STARTED',
    'GENERATION_ENDED', 'GENERATION_STOPPED', 'GENERATION_AFTER_COMMANDS'].map(name => [name, name]));
  const host = {
    getScriptId: () => state.script,
    scriptVariableOptions: () => ({ type: 'script', script_id: state.script }),
    getVariables() { if (state.configFail) throw Error('配置读取失败'); return structuredClone(state.variables); },
    async updateVariablesWith(fn) {
      await state.hook?.('config-write'); const next = await fn(structuredClone(state.variables)); state.configWrites++;
      if (!state.configNoWrite) state.variables = next;
      await state.hook?.('config-returned');
      if (state.configPostFail) state.configFail = true;
      if (state.configResponseLost) throw Error('设置保存响应丢失');
    },
    getCharWorldbookNames: () => structuredClone(state.binding),
    async getWorldbook(name) {
      await state.hook?.('book-read'); if (state.bookFail) throw Error('世界书读取失败');
      return structuredClone(state.books[name]);
    },
    async updateWorldbookWith(name, fn) {
      await state.hook?.('book-write'); if (state.bookFail) throw Error('世界书保存失败');
      const next = structuredClone(await fn(structuredClone(state.books[name]))); state.booksWritten.push(name);
      if (!state.bookNoWrite) state.books[name] = next;
      await state.hook?.('book-returned');
      if (state.postFail) state.bookFail = true;
      if (state.bookResponseLost) throw Error('归档保存响应丢失');
    },
    async getChatMessages(range, options) {
      await state.hook?.('floor-read');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        const { message, data, extra, ...rest } = row, selected = row.swipe_id || 0;
        return { ...rest, swipe_id: selected, swipes: state.pages[row.message_id] || Array(selected + 1).fill(message),
          swipes_data: Array(selected + 1).fill(data || {}), swipes_info: state.infoPages?.[row.message_id] || Array(selected + 1).fill(extra || {}) };
      }) : rows);
    },
    async setChatMessages(rows) {
      rows.forEach(row => {
        assert.equal(row.message_id, 2);
        Object.assign(state.floors[2], structuredClone(row)); state.writes.push(row.message_id);
      });
    },
    async createChatMessages(rows) {
      rows.forEach(row => state.floors.push({ data: {}, ...structuredClone(row), message_id: (state.floors.at(-1)?.message_id ?? -1) + 1 }));
    },
    async generate(config) { state.requests.push(structuredClone(config)); return raw(); },
    async deleteChatMessages(ids) { state.floors = state.floors.filter(row => !ids.includes(row.message_id)); },
    generateRaw() { assert.fail('剧情归档不得请求模型'); },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => null, tavernEvents: () => events,
    bindEvent(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn);
      return { stop() { handlers.get(name).delete(fn); } };
    } };
  modules['cryptLord.contextBuilder'] = { build: async () => [] };
  modules['cryptLord.generationQuality'] = { readSnapshot: async () => ({ settings: { retryLimit: 0, streamTimeoutSeconds: 0, noStreamTimeoutSeconds: 0 } }),
    inspect: async text => ({ passed: true, text }) };
  modules['cryptLord.nativeSettlement'] = { apply() {} };
  modules['cryptLord.variableSettlementApi'] = { settle: async ({ previousData }) => ({ skipped: true, data: previousData, response: '' }) };
  const runtime = { console: { ...console, info() {}, warn: (...args) => state.warnings.push(args) }, structuredClone,
    DOMException, TextEncoder, Uint8Array, crypto: webcrypto, AbortController, setTimeout, clearTimeout,
    cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, api: modules['cryptLord.storyArchive'], host,
    emit: async (name, ...args) => { for (const fn of handlers.get(name) || []) await fn(...args); } };
}
test('原版归档策略独立对照及整链：主书精确写入、同批经历/小说、原生回合与重生成', async () => {
  const { api, state, modules } = fixture();
  const oracle = vm.runInNewContext(`({${methods(original, ['_mergeLorebookContent'])},
    ${methods(originalSettings, ['loadAutoWriteState', 'loadNovelModeState'])}})`, {
    AppStorage: { loadData: async (key, fallback) => fallback }, document: { getElementById: () => null },
  });
  await oracle.loadAutoWriteState(); await oracle.loadNovelModeState();
  assert.equal(api.normalize().journeyAutomatic, oracle.isAutoWriteEnabled);
  assert.equal(api.normalize().novelAutomatic, oracle.isNovelModeEnabled);
  const reader = modules['cryptLord.journeyReader'];
  oracle.parseJourneyEntry = reader.parse; oracle.stringifyJourneyEvent = reader.stringify;
  const protectedData = JSON.stringify(state.floors), protectedBooks = structuredClone([state.books['1源堡'], state.books['2历史孔隙']]);
  const originalJourney = structuredClone(state.books['实际主书'][0]);
  let ticket = await api.prepare(state.floors[2]);
  assert.equal(state.booksWritten.length, 0); assert.equal(state.configWrites, 0);
  assert.equal(ticket.rows[0].content, oracle._mergeLorebookContent('本周目经历', originalJourney.content, journey()).content);
  await api.commit(ticket); assert.deepEqual(state.booksWritten, ['实际主书']);
  assert.equal(JSON.stringify(state.floors), protectedData);
  assert.deepEqual([state.books['1源堡'], state.books['2历史孔隙']], protectedBooks);
  const entry = state.books['实际主书'][0];
  assert.deepEqual({ ...entry, content: originalJourney.content }, originalJourney);
  const novel = state.books['实际主书'].at(-1);
  assert.equal(novel.name, '小说模式'); assert.equal(novel.enabled, false);
  assert.equal(novel.position.order, 5000); assert.deepEqual(novel.strategy.keys, ['小说模式']);
  assert.equal((await api.commit(await api.prepare(state.floors[2]))).unchanged, true);
  const recovery = fixture(), recoveryTicket = await recovery.api.prepare(recovery.state.floors[2]);
  recovery.state.bookResponseLost = true;
  assert.equal((await recovery.api.commit(recoveryTicket)).recovered, true);
  assert.deepEqual(recovery.state.booksWritten, ['实际主书']);
  assert.equal((await recovery.api.commit(await recovery.api.prepare(recovery.state.floors[2]))).unchanged, true);
  assert.equal(recovery.state.booksWritten.length, 1);
  const recoveryConfig = await recovery.api.readConfig(); recovery.state.configResponseLost = true;
  assert.equal((await recovery.api.saveConfig({ ...recoveryConfig.config, novelAutomatic: true }, recoveryConfig.revision)).recovered, true);
  assert.equal(recovery.state.configWrites, 1);
  const shared = fixture(), editor = shared.modules['cryptLord.nativeEditor'];
  shared.state.books['1源堡'].push({ uid: 18, name: '本周目经历', content: journey(1, '副库过时经历') });
  assert.equal((await shared.modules['cryptLord.journeyReader'].books(shared.host))
    .find(row => row.name === '本周目经历').book, '实际主书');
  const editorTicket = await editor.prepareSync(await editor.open(2), 3);
  assert.equal(editorTicket.book, '实际主书');
  await editor.syncJourney(editorTicket);
  assert.deepEqual(shared.state.booksWritten, ['实际主书']);
  assert.equal(shared.state.books['实际主书'].at(-1).name, '本周目经历(3)');
  const delegated = fixture(), delegatedEditor = delegated.modules['cryptLord.nativeEditor'];
  const delegatedTicket = await delegatedEditor.prepareSync(await delegatedEditor.open(2), 4);
  const delegatedOperation = delegatedEditor.beginSync(delegatedTicket);
  delegated.state.postFail = true;
  const pendingSync = await delegatedOperation.save();
  assert.equal(pendingSync.pending, true); assert.equal(delegatedOperation.status().phase, 'uncertain');
  await assert.rejects(delegatedOperation.save(), /待核对/);
  await assert.rejects(delegatedOperation.inspect(), /读取失败/);
  assert.equal(delegated.state.booksWritten.length, 1);
  delegated.state.postFail = delegated.state.bookFail = false;
  assert.equal((await delegatedOperation.inspect()).name, '本周目经历(4)');
  assert.equal(delegatedOperation.status().phase, 'saved'); await delegatedOperation.save();
  assert.deepEqual(delegated.state.booksWritten, ['实际主书']);
  state.floors[2].message = raw('现场：另一个章节。');
  ticket = await api.prepare(state.floors[2]);
  assert.equal(ticket.rows[1].content, oracle._mergeLorebookContent('小说模式', novel.content, '现场：另一个章节。').content);
  await api.commit(ticket); assert.equal(state.booksWritten.length, 2);
  let config = await api.readConfig();
  await api.saveConfig({ ...config.config, novelAutomatic: true, index: 2, future: true }, config.revision);
  assert.equal(state.variables.otherPlugin.keep, true);
  config = await api.readConfig();
  await api.saveConfig({ version: 1, journeyAutomatic: true, novelAutomatic: true, index: 2 }, config.revision);
  assert.equal(state.variables['cryptLord.storyArchive'].future, true);
  await api.commit(await api.prepare(state.floors[2]));
  assert.equal(state.books['实际主书'].at(-1).name, '小说模式(2)');
  state.floors[2].message = '<safe><gametxt>假正文</gametxt></safe><thinking><本周目经历>假经历</本周目经历>';
  await assert.rejects(api.prepare(state.floors[2], ['novelText']), /没有可归档/);
  for (const kind of ['journey', 'novelText']) assert.throws(() => api.entryName(kind, 0), /无效/);
  assert.throws(() => api.normalize({ version: 1 }), /损坏/);

  const full = fixture(); full.state.floors.splice(1);
  config = await full.api.readConfig();
  await full.api.saveConfig({ ...config.config, novelAutomatic: true }, config.revision);
  await full.modules['cryptLord.nativeFloor'].submitNativeTurn('调查档案室');
  assert.deepEqual(full.state.floors.map(row => row.role), ['assistant', 'user', 'assistant']);
  assert.equal(full.state.requests.length, 1); assert.deepEqual(full.state.booksWritten, ['实际主书'], String(full.state.warnings));
  assert.equal(full.state.floors[2].data.otherPlugin.keep, true);
  full.modules['cryptLord.nativeFloor'].dispose();
  for (const type of ['continue', 'regenerate', 'swipe', 'append', 'append-existing']) {
    const variant = fixture();
    if (type === 'append') variant.state.floors.splice(2);
    const turn = await variant.api.prepareTurn(null, type === 'append-existing' ? 'append' : type);
    if (type === 'append') variant.state.floors.push({ message_id: 2, role: 'assistant', message: raw(), data: {} });
    else { variant.state.floors[2].message = raw('现场：重写后的正文。', 3); variant.state.floors[2].swipe_id++; }
    await variant.api.completeTurn(variant.state.floors[2].message,
      { assistantMessageId: 2, userMessageId: 1, userText: '调查档案室' }, turn);
    assert.equal(variant.state.booksWritten.length, 1, type); assert.equal(variant.state.writes.length, 0);
  }
  const native = fixture(); native.state.floors.splice(2);
  await native.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  native.state.floors.push({ message_id: 2, role: 'assistant', message: raw(), data: { stat_data: { 活力: 12 } } });
  await native.modules['cryptLord.nativeFloorBridge'].completeNarrative(raw(), {
    assistantMessageId: 2, userMessageId: 1, userText: '调查档案室', floorText: raw(), guard: () => true,
  });
  assert.equal(native.state.booksWritten.length, 1);
  native.api.dispose();
});
test('统一归档事务：最终消息页/条目/配置冲突、失败整批不写、生成及关窗取消、保存后警告', async () => {
  const f = fixture(), { state, api, modules, emit } = f;
  for (const change of [
    () => { state.floors[2].message += '外部'; },
    () => { state.pages[2] = ['另一页']; },
    () => { state.floors.push({ message_id: 3, role: 'user', message: '新回合' }); },
    () => { state.binding.additional.push('外部绑定'); },
    () => { state.books['实际主书'][0].strategy.keys = [/外部/i]; },
    () => { state.variables['cryptLord.storyArchive'] = { ...api.normalize(), index: 2 }; },
    () => { state.script = '另一脚本'; },
  ]) {
    const originalState = structuredClone(state), ticket = await api.prepare(state.floors[2]);
    state.hook = kind => { if (kind === 'book-write') { state.hook = null; change(); } };
    await assert.rejects(api.commit(ticket), /已变化|不可确认/);
    assert.equal(state.booksWritten.length, 0); Object.assign(state, originalState);
  }
  let ticket = await api.prepare(state.floors[2]);
  ticket.rows[0].content += '篡改'; await assert.rejects(api.commit(ticket), /凭据/);
  const configProof = await api.readConfig();
  await assert.rejects(api.saveConfig({ ...configProof.config, novelAutomatic: true }, { ...configProof.revision }), /凭据/);
  for (const replacement of ['host', 'document', 'branch']) {
    const variant = fixture(), receipt = await variant.api.prepare(variant.state.floors[2]);
    if (replacement === 'host') variant.modules['cryptLord.hostApi'] = { ...variant.host };
    if (replacement === 'document') variant.modules['cryptLord.afterNativeHost'].getHost = () => ({ document: {}, window: {} });
    if (replacement === 'branch') variant.state.pages[2] = [variant.state.floors[2].message, '未选择的外部正文'];
    await assert.rejects(variant.api.commit(receipt), /已变化/); assert.equal(variant.state.booksWritten.length, 0);
  }
  ticket = await api.prepare(state.floors[2]);
  const parser = modules['cryptLord.responseInspector']; modules['cryptLord.responseInspector'] = { ...parser };
  await assert.rejects(api.commit(ticket), /服务已变化/); modules['cryptLord.responseInspector'] = parser;
  const beforeBook = structuredClone(state.books['实际主书']);
  state.books['实际主书'][0].content = '无法解析的经历';
  await assert.rejects(api.prepare(state.floors[2]), /损坏/);
  assert.equal(state.booksWritten.length, 0); state.books['实际主书'] = structuredClone(beforeBook);
  state.books['实际主书'].push({ uid: 20, name: '小说模式', content: '' }, { uid: 21, name: '小说模式', content: '' });
  await assert.rejects(api.prepare(state.floors[2]), /重名/); state.books['实际主书'] = structuredClone(beforeBook);
  ticket = await api.prepare(state.floors[2]); state.bookFail = true;
  await assert.rejects(api.commit(ticket), /读取失败/); state.bookFail = false;
  state.hook = kind => { if (kind === 'book-write') throw Error('保存失败'); };
  await assert.rejects(api.commit(ticket), /保存失败/);
  assert.deepEqual(state.books['实际主书'], beforeBook); state.hook = null;
  let active = true; state.hook = kind => { if (kind === 'book-write') active = false; };
  await assert.rejects(api.commit(ticket, () => active), { name: 'AbortError' }); state.hook = null;
  await emit('GENERATION_STARTED', 'quiet', {}, false);
  assert.equal(api.status().generating, false);
  await emit('GENERATION_STARTED', 'normal', {}, true);
  assert.equal(api.status().generating, false);
  await emit('GENERATION_STARTED', 'normal', {}, false);
  await assert.rejects(api.commit(ticket), { name: 'AbortError' });
  await emit('GENERATION_ENDED');
  ticket = await api.prepare(state.floors[2]); state.postFail = true;
  const result = await api.commit(ticket);
  assert.match(result.warning, /已归档.*复核失败/); assert.equal(state.booksWritten.length, 1);
  state.bookFail = state.postFail = false;
  let config = await api.readConfig(); state.hook = kind => { if (kind === 'config-write') state.script = '外部脚本'; };
  await assert.rejects(api.saveConfig({ ...config.config, novelAutomatic: true }, config.revision), /已变化/);
  state.script = 'script-1'; state.hook = null; state.configPostFail = true;
  config = await api.readConfig();
  assert.match((await api.saveConfig({ ...config.config, novelAutomatic: true }, config.revision)).warning, /设置已保存/);
  state.configFail = state.configPostFail = false;

  for (const change of [
    v => { v.state.binding.primary = '1源堡'; },
    v => { v.state.books['实际主书'][0].content += '外部'; },
    v => { v.state.pages[0] = ['其他开场分支']; },
    v => { v.state.variables['cryptLord.storyArchive'] = { ...v.api.normalize(), index: 2 }; },
  ]) {
    const variant = fixture(); variant.state.floors.splice(2);
    const turn = await variant.api.prepareTurn();
    variant.state.floors.push({ message_id: 2, role: 'assistant', message: raw(), data: {} }); change(variant);
    await assert.rejects(variant.api.completeTurn(raw(), { assistantMessageId: 2, userMessageId: 1, userText: '调查档案室' }, turn), /已变化/);
    assert.equal(variant.state.booksWritten.length, 0);
  }
  const disabled = fixture(), off = await disabled.api.readConfig();
  await disabled.api.saveConfig({ ...off.config, journeyAutomatic: false }, off.revision);
  disabled.state.binding.primary = null; disabled.state.bookFail = true;
  assert.equal(await disabled.api.prepareTurn(), null);
  assert.equal(disabled.state.booksWritten.length, 0);
  for (const event of ['CHAT_CHANGED', 'GENERATION_STOPPED']) {
    const variant = fixture(), receipt = await variant.api.prepare(variant.state.floors[2]);
    variant.state.hook = async kind => { if (kind === 'book-write') await variant.emit(event); };
    await assert.rejects(variant.api.commit(receipt), { name: 'AbortError' });
    assert.equal(variant.state.booksWritten.length, 0);
  }
  const bridge = fixture(); bridge.state.floors.splice(2);
  const built = await bridge.modules['cryptLord.nativeFloorBridge'].buildGenerationConfig('调查档案室');
  bridge.state.floors.push({ message_id: 2, role: 'assistant', message: raw(), data: { stat_data: { 活力: 12 } } });
  bridge.state.hook = kind => { if (kind === 'book-write') throw Error('归档提交失败'); };
  await bridge.modules['cryptLord.nativeFloorBridge'].completeNarrative(raw(), {
    assistantMessageId: 2, userMessageId: 1, userText: '调查档案室', floorText: raw(), archiveTurn: built.archiveTurn, guard: () => true,
  });
  assert.equal(bridge.state.writes.length, 1); assert.equal(bridge.state.booksWritten.length, 0);
  assert.match(bridge.state.floors[2].message, /gametxt/); assert.ok(bridge.state.warnings.length);
  const disposed = fixture(), receipt = await disposed.api.prepare(disposed.state.floors[2]);
  disposed.state.hook = kind => { if (kind === 'book-write') disposed.api.dispose(); };
  await assert.rejects(disposed.api.commit(receipt), { name: 'AbortError' });
  assert.equal(disposed.state.booksWritten.length, 0);
  // Explicit recovery retains the same result and never treats a failed read as a failed write.
  for (const kind of ['archive', 'config']) {
    const g = fixture(), config = await g.api.readConfig();
    const operation = kind === 'archive' ? g.api.begin(await g.api.prepare(g.state.floors[2])) :
      g.api.beginConfig({ ...config.config, novelAutomatic: true }, config.revision);
    const writes = () => kind === 'archive' ? g.state.booksWritten.length : g.state.configWrites;
    const readFail = kind === 'archive' ? 'bookFail' : 'configFail';
    const postFail = kind === 'archive' ? 'postFail' : 'configPostFail';
    g.state[postFail] = true;
    assert.match((await operation.save()).warning, /复核失败/);
    assert.equal(operation.status().phase, 'uncertain'); assert.equal(writes(), 1);
    await assert.rejects(operation.save(), /待核对/);
    await assert.rejects(operation.inspect(), /读取失败/);
    await assert.rejects(operation.inspect(), /读取失败/); assert.equal(writes(), 1);
    g.state[readFail] = g.state[postFail] = false;
    await operation.inspect(); assert.equal(operation.status().phase, 'saved');
    await operation.save(); await operation.inspect(); assert.equal(writes(), 1); g.api.dispose();
  }
  for (const kind of ['archive', 'config']) {
    const g = fixture(), config = await g.api.readConfig();
    const operation = kind === 'archive' ? g.api.begin(await g.api.prepare(g.state.floors[2])) :
      g.api.beginConfig({ ...config.config, novelAutomatic: true }, config.revision);
    const flag = kind === 'archive' ? 'bookNoWrite' : 'configNoWrite';
    g.state[flag] = true;
    const pending = await operation.save();
    assert.match(pending.warning, /尚未落盘/); assert.equal(operation.status().phase, 'pending');
    if (kind === 'archive') pending.rows[0].content = '篡改公开恢复结果';
    g.state[flag] = false; await operation.save(); assert.equal(operation.status().phase, 'saved');
    if (kind === 'archive') assert.doesNotMatch(g.state.books['实际主书'][0].content, /篡改公开恢复结果/);
    assert.equal(kind === 'archive' ? g.state.booksWritten.length : g.state.configWrites, 2); g.api.dispose();
  }
  {
    const g = fixture();
    g.state.books['实际主书'][1].extra = { when: new Date('2026-10-27T00:00:00Z') };
    const ticket = await g.api.prepare(g.state.floors[2]), operation = g.api.begin(ticket);
    g.state.hook = kind => {
      if (kind === 'book-returned') g.state.books['实际主书'][1].extra = { when: new Date('2026-10-28T00:00:00Z') };
    };
    assert.match((await operation.save()).warning, /不一致/);
    assert.equal(operation.status().phase, 'conflict'); await assert.rejects(operation.save(), /凭据/);
    assert.equal(g.state.booksWritten.length, 1); g.api.dispose();
  }
  {
    const g = fixture();
    g.state.floors[2].swipe_id = 1; g.state.pages[2] = ['备用分支', g.state.floors[2].message];
    g.state.infoPages = { 2: [{ when: new Date('2026-10-27T00:00:00Z') }, { keep: true }] };
    const operation = g.api.begin(await g.api.prepare(g.state.floors[2]));
    g.state.infoPages[2][0].when = new Date('2026-10-28T00:00:00Z');
    await assert.rejects(operation.save(), /消息页已变化/); assert.equal(g.state.booksWritten.length, 0); g.api.dispose();
  }
  {
    const g = fixture(), operation = g.api.begin(await g.api.prepare(g.state.floors[2]));
    let enter, release; const entered = new Promise(resolve => { enter = resolve; });
    g.state.hook = kind => { if (kind === 'book-write') return new Promise(resolve => { release = resolve; enter(); }); };
    const saving = operation.save(); await entered;
    await assert.rejects(operation.save(), /正在进行/); await assert.rejects(operation.inspect(), /正在进行/);
    release(); await saving; assert.equal(g.state.booksWritten.length, 1); g.api.dispose();
  }
  {
    const g = fixture(), config = await g.api.readConfig();
    for (const args of [['quiet_prompt', {}, false], ['normal', { params: { quiet_prompt: '后台' } }, false],
      ['normal', { params: { dryRun: true } }, false]]) {
      await g.emit('GENERATION_STARTED', ...args); await g.emit('GENERATION_AFTER_COMMANDS', ...args);
      await g.emit('GENERATION_ENDED', ...args); await g.emit('GENERATION_STOPPED', ...args);
    }
    assert.equal(g.api.status().generating, false);
    await g.api.saveConfig({ ...config.config, novelAutomatic: true }, config.revision);
    const stale = await g.api.readConfig();
    await g.emit('GENERATION_STARTED', 'normal'); await g.emit('GENERATION_ENDED');
    await assert.rejects(g.api.saveConfig({ ...stale.config, index: 2 }, stale.revision), /取消/);
    g.api.dispose();
  }
  const loader = await read('public/guimizhizhu_ui/loader.js');
  assert.match(loader, /path: 'core\/story-archive\.js'/);
  assert.match(await read('public/guimizhizhu_ui/modules/native-floor/index.js'), /txn\.archiveTurn =/);
});
