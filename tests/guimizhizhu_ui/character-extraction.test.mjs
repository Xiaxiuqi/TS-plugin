import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt');
const files = ['shared/save-recovery.js', 'core/native-floor-source.js', 'core/response-normalizer.js', 'core/variable-patch.js', 'core/state-store.js', 'core/response-inspector.js',
  'core/character-extraction.js', 'core/generation-bridge.js', 'modules/native-floor/index.js'];
const sources = await Promise.all(files.map(path => read(`public/guimizhizhu_ui/${path}`)));
const plain = value => JSON.parse(JSON.stringify(value));
const card = (name = '伦纳德') => `姓名|${name}\n身份|调查员\n描述|档案室里的记录`;
const raw = name => `<thinking>正文</thinking><gametxt>现场：雨夜调查档案室，发现登记记录。</gametxt><角色提取>${card(name)}</角色提取>`;
function methods(names) {
  return names.map(name => {
    const index = original.search(new RegExp(`^(?:async )?${name}\\([^\\n]*\\)\\s*\\{`, 'm')); assert.notEqual(index, -1);
    const tree = ts.createSourceFile('original.js', `({${original.slice(index)}})`, 99, true, ts.ScriptKind.JS);
    let found;
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) found = node.getText(tree);
      if (!found) ts.forEachChild(node, visit);
    }
    visit(tree); assert.ok(found); return found;
  }).join(',\n');
}
function fixture() {
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: '开场', data: { stat_data: { 活力: 12 }, otherPlugin: { keep: true } } },
    { message_id: 1, role: 'user', message: '调查档案室', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: raw(), data: { stat_data: { 活力: 12 } }, swipe_id: 0 },
  ], books: { '1源堡': [{ uid: 2, name: '其他角色', content: '保持不变', strategy: { keys: [/角色/i] } }], '2历史孔隙': [] },
  variables: { otherPlugin: { keep: true } }, binding: { primary: '1源堡', additional: [] }, script: 'script-1',
  writes: [], booksWritten: [], configWrites: 0, pages: {}, hook: null, bookFail: false, postFail: false,
    configFail: false, configPostFail: false, configLost: false, bookLost: false, requests: [] };
  const handlers = new Map(), modules = {}, host = {
    getScriptId: () => state.script,
    scriptVariableOptions: () => ({ type: 'script', script_id: state.script }),
    getVariables: () => { if (state.configFail) throw Error('配置读取失败'); return structuredClone(state.variables); },
    async updateVariablesWith(fn) { await state.hook?.('config'); state.variables = await fn(structuredClone(state.variables)); state.configWrites++;
      if (state.configPostFail) state.configFail = true;
      if (state.configLost) throw Error('设置响应丢失'); },
    getCharWorldbookNames: () => structuredClone(state.binding), getGlobalWorldbookNames: () => [], getChatWorldbookName: () => null,
    getWorldbookNames: () => Object.keys(state.books),
    async getWorldbook(name) { await state.hook?.('book-read'); if (state.bookFail) throw Error('世界书读取失败'); return structuredClone(state.books[name]); },
    async updateWorldbookWith(name, fn) {
      await state.hook?.('book-write'); if (state.bookFail) throw Error('世界书保存失败');
      state.books[name] = structuredClone(await fn(structuredClone(state.books[name]))); state.booksWritten.push(name);
      if (state.postFail) state.bookFail = true;
      if (state.bookLost) throw Error('入库响应丢失');
    },
    async getChatMessages(range, options) {
      await state.hook?.('floor-read');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        const { message, data, extra, ...rest } = row, selected = row.swipe_id || 0, length = Math.max(2, selected + 1);
        return { ...rest, swipe_id: selected, swipes: Array.from({ length }, (_, index) => index === selected ? message : '未选分支'),
          swipes_data: Array.from({ length }, (_, index) => index === selected ? data : { protected: true }),
          swipes_info: Array.from({ length }, () => ({})), ...state.pages[row.message_id] };
      }) : rows);
    },
    async setChatMessages(rows) {
      rows.forEach(row => { assert.equal(row.message_id, 2); Object.assign(state.floors[2], structuredClone(row)); state.writes.push(row.message_id); });
    },
    async createChatMessages(rows) {
      rows.forEach(row => state.floors.push({ data: {}, ...structuredClone(row), message_id: (state.floors.at(-1)?.message_id ?? -1) + 1 }));
    },
    async generate(config) { state.requests.push(structuredClone(config)); return raw(); },
    async deleteChatMessages(ids) { state.floors = state.floors.filter(row => !ids.includes(row.message_id)); },
    generateRaw() { assert.fail('角色提取不得请求模型'); },
  };
  modules['cryptLord.hostApi'] = host;
  const events = { CHAT_CHANGED: 'chat', GENERATION_STOPPED: 'stop', GENERATION_AFTER_COMMANDS: 'generation',
    GENERATION_STARTED: 'start', GENERATION_ENDED: 'end' };
  modules['cryptLord.afterNativeHost'] = { getHost: () => null, tavernEvents: () => events,
    bindEvent(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn);
      return { stop() { handlers.get(name).delete(fn); } }; } };
  modules['cryptLord.contextBuilder'] = { build: async () => [] };
  modules['cryptLord.generationQuality'] = { readSnapshot: async () => ({ settings: { retryLimit: 0, streamTimeoutSeconds: 0, noStreamTimeoutSeconds: 0 } }),
    inspect: async text => ({ passed: true, text }) };
  modules['cryptLord.nativeSettlement'] = { apply() {} };
  modules['cryptLord.variableSettlementApi'] = { settle: async ({ previousData }) => ({ skipped: true, data: previousData, response: '' }) };
  const warnings = [];
  const runtime = { console: { ...console, warn: (...args) => warnings.push(args), info() {} },
    structuredClone, DOMException, TextEncoder, Uint8Array, crypto: webcrypto, AbortController, setTimeout, clearTimeout,
    cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, api: modules['cryptLord.characterExtraction'], warnings,
    emit: async (event, ...args) => { for (const fn of handlers.get(events[event]) || []) await fn(...args); } };
}
test('原版完整角色提取规则对照：姓名格式、占位判定、主副库优先与精确入库，禁止覆盖真实设定', async () => {
  const { api, state } = fixture(), calls = [];
  const oracle = vm.runInNewContext(`({${methods(['_parseCharacterCardFields', '_resolveCharacterCardName', '_isPlaceholderCardContent',
    'writeCharacterCardToLorebook', 'writeCharacterCardToLorebookSilent', 'loadCharacterAutoWriteState'])}})`,
  { document: { getElementById: () => null }, setTimeout() {}, console: { log() {}, error() {}, warn() {} },
    AppStorage: { loadData: async (key, fallback) => fallback }, WorldbookManager: {
      fetchEntries: async name => [state.books['1源堡'].find(row => row.name.trim() === name) || state.books['2历史孔隙'].find(row => row.name.trim() === name)].filter(Boolean),
      saveEntries: async rows => calls.push(plain(rows)),
    } });
  oracle.showTemporaryMessage = () => {}; oracle.pendingCharacterCardGeneration = '';
  for (const content of [card(), 'Name: 伦纳德\nBasic:|设定', '名称：伦纳德\n备注|包含:和|字符', '名字|甲\n姓名|乙',
    '#忽略\n<ignore>\nname: Name\nNAME: 伦纳德', 'Name: 姓名', '没有名字']) {
    assert.deepEqual(plain(api.fields(content)), plain(oracle._parseCharacterCardFields(content)));
    assert.equal(api.resolveName(content), oracle._resolveCharacterCardName(content));
  }
  assert.equal(Object.getPrototypeOf(api.fields('__proto__|坏\n姓名|甲')), null);
  assert.equal(api.resolveName('__proto__|坏\n姓名|甲'), '甲');
  for (const content of ['', ' ', '正在等待AI生成角色设定', '已有真实设定'])
    assert.equal(api.placeholder(content), oracle._isPlaceholderCardContent(content));
  await oracle.loadCharacterAutoWriteState(); assert.equal((await api.readConfig()).config.automatic, oracle.isCharacterAutoWriteEnabled);
  const floors = JSON.stringify(state.floors), before = structuredClone(state.books['1源堡'][0]);
  oracle._resolveExtractedContent = () => ({ characterCard: card() }); oracle.lastExtractedCharacterCard = card();
  await oracle.writeCharacterCardToLorebookSilent(); const originalEntry = calls.pop()[0];
  const ticket = await api.prepare(state.floors[2]); assert.equal(state.booksWritten.length, 0);
  await api.commit(ticket);
  const entry = state.books['1源堡'].at(-1);
  assert.equal(entry.name, originalEntry.comment); assert.deepEqual(entry.strategy.keys, originalEntry.keys);
  assert.equal(entry.content, originalEntry.content); assert.equal(entry.enabled, originalEntry.enabled);
  assert.equal(entry.strategy.type, originalEntry.strategy.type); assert.equal(entry.position.type, originalEntry.positionType);
  assert.equal(entry.position.order, originalEntry.order);
  assert.deepEqual(state.books['1源堡'][0], before); assert.equal(JSON.stringify(state.floors), floors);
  await oracle.writeCharacterCardToLorebook(); assert.equal(calls.length, 0);
  assert.equal((await api.commit(await api.prepare(state.floors[2]))).existing, true); assert.equal(state.booksWritten.length, 1);
  state.books['1源堡'].pop();
  state.books['2历史孔隙'].push({ uid: 2, name: '伦纳德', content: '副库真实设定' });
  assert.equal((await api.prepare(state.floors[2])).action, 'existing');
  state.books['1源堡'].push({ uid: 8, name: ' 伦纳德 ', content: '正在等待AI生成角色设定', enabled: false,
    position: { type: 'at_depth', depth: 4 }, strategy: { keys: [/雨夜/i] }, other: { keep: true } });
  const library = structuredClone(state.books['2历史孔隙']), shell = structuredClone(state.books['1源堡'].at(-1));
  await api.commit(await api.prepare(state.floors[2]));
  assert.deepEqual({ ...state.books['1源堡'].at(-1), content: shell.content, enabled: shell.enabled }, shell);
  assert.deepEqual(state.books['2历史孔隙'], library);
  state.floors[2].message = '<safe><角色提取>姓名|假的</角色提取></safe>';
  await assert.rejects(api.prepare(state.floors[2]), /没有可入库/);
  state.floors[2].message = raw(); state.books['1源堡'].push({ uid: 20, name: '伦纳德', content: '重名' });
  await assert.rejects(api.prepare(state.floors[2]), /重名/); state.books['1源堡'].pop();
  state.books['1源堡'].at(-1).uid = 2;
  await assert.rejects(api.prepare(state.floors[2]), /UID/); state.books['1源堡'].at(-1).uid = 8;
  state.books['1源堡'].at(-1).content = 0;
  await assert.rejects(api.prepare(state.floors[2]), /格式损坏/);
});
test('完整原生入库事务与自动回合链：配置、来源冲突、真实桥接保存、故障、取消和只改主库', async () => {
  const full = fixture();
  full.state.floors.splice(1);
  await full.modules['cryptLord.nativeFloor'].submitNativeTurn('调查档案室');
  assert.deepEqual(full.state.floors.map(row => row.role), ['assistant', 'user', 'assistant']);
  assert.deepEqual(full.state.writes, [2, 2]); assert.deepEqual(full.state.booksWritten, ['1源堡']);
  assert.equal(full.state.requests.length, 1);
  assert.equal(full.state.floors[2].data.otherPlugin.keep, true);
  assert.equal(full.state.books['1源堡'].at(-1).name, '伦纳德');
  full.modules['cryptLord.nativeFloor'].dispose(); full.api.dispose();
  for (const type of ['continue', 'append', 'regenerate', 'swipe']) {
    const variant = fixture(), prepared = await variant.api.prepareTurn(null, type);
    variant.state.floors[2].message = raw(`${type}角色`); variant.state.floors[2].swipe_id++;
    await variant.api.completeTurn(variant.state.floors[2].message, {
      assistantMessageId: 2, userMessageId: 1, userText: '调查档案室', guard: () => true,
    }, prepared);
    assert.equal(variant.state.books['1源堡'].at(-1).name, `${type}角色`);
    assert.equal(variant.state.writes.length, 0);
    variant.modules['cryptLord.nativeFloor'].dispose(); variant.api.dispose();
  }
  const { api, state, modules, emit, warnings } = fixture();
  let config = await api.readConfig();
  await api.saveConfig({ ...config.config, automatic: false }, config.revision); assert.equal(state.configWrites, 1);
  assert.equal(state.variables.otherPlugin.keep, true);
  await assert.rejects(api.saveConfig({ automatic: true, version: 1 }, config.revision), /配置已变化|凭据/);
  config = await api.readConfig(); state.hook = kind => { if (kind === 'config') state.variables['cryptLord.characterExtraction'].extra = true; };
  await assert.rejects(api.saveConfig({ ...config.config, automatic: true }, config.revision), /配置已变化/); state.hook = null;
  config = await api.readConfig(); await api.saveConfig({ ...config.config, automatic: true }, config.revision);
  let ticket = await api.prepare(state.floors[2]);
  ticket.content += '篡改'; await assert.rejects(api.commit(ticket), /凭据/);
  ticket = await api.prepare(state.floors[2]); state.floors[2].swipe_id++;
  await assert.rejects(api.commit(ticket), /楼层.*已变化/);
  ticket = await api.prepare(state.floors[2]); state.hook = kind => { if (kind === 'book-write') state.books['2历史孔隙'].push({ uid: 9, name: '伦纳德', content: '外部角色' }); };
  await assert.rejects(api.commit(ticket), /条目.*已变化/); assert.equal(state.booksWritten.length, 0); state.hook = null;
  state.books['2历史孔隙'] = [];
  ticket = await api.prepare(state.floors[2]); state.hook = kind => { if (kind === 'book-write') state.binding.primary = '其他角色'; };
  await assert.rejects(api.commit(ticket), /未挂载/); state.binding.primary = '1源堡'; state.hook = null;
  ticket = await api.prepare(state.floors[2]); state.hook = kind => { if (kind === 'book-write') state.bookFail = true; };
  await assert.rejects(api.commit(ticket), /保存失败/); state.bookFail = false; state.hook = null;
  ticket = await api.prepare(state.floors[2]); let active = true;
  state.hook = kind => { if (kind === 'book-write') active = false; };
  await assert.rejects(api.commit(ticket, () => active), { name: 'AbortError' }); state.hook = null;
  const floor = state.floors.pop(), opening = structuredClone(state.floors[0]);
  const bridge = modules['cryptLord.nativeFloorBridge'], built = await bridge.buildGenerationConfig('调查档案室');
  assert.ok(built.characterTurn); state.floors.push(floor);
  const transaction = { userMessageId: 1, assistantMessageId: 2, userText: '调查档案室', narrativeText: '正文',
    floorText: floor.message, characterTurn: built.characterTurn, guard: () => true };
  await bridge.completeNarrative(floor.message, transaction);
  assert.deepEqual(state.writes, [2]); assert.deepEqual(state.booksWritten, ['1源堡']); assert.deepEqual(state.floors[0], opening);
  assert.equal(state.floors[2].data.otherPlugin.keep, true); assert.equal(state.books['1源堡'].at(-1).name, '伦纳德');
  state.books['1源堡'].pop();
  const actual = state.floors.pop();
  await emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false); state.floors.push(actual);
  const nativeTransaction = { ...transaction }; delete nativeTransaction.characterTurn;
  await bridge.completeNarrative(actual.message, nativeTransaction); assert.equal(state.booksWritten.length, 2);
  state.books['1源堡'].pop();
  state.floors.pop(); const turn = await api.prepareTurn(); state.floors.push(actual);
  config = await api.readConfig(); await api.saveConfig({ ...config.config, automatic: false }, config.revision);
  await assert.rejects(api.completeTurn(actual.message, { ...transaction, characterTurn: undefined }, turn), /配置已变化/);
  assert.equal(state.booksWritten.length, 2);
  state.floors.pop(); const off = await api.prepareTurn(); state.floors.push(actual);
  assert.equal((await api.completeTurn(actual.message, transaction, off)).skipped, true);
  await emit('GENERATION_AFTER_COMMANDS', 'quiet', {}, false); await emit('GENERATION_STOPPED');
  ticket = await api.prepare(state.floors[2]); await emit('CHAT_CHANGED');
  await assert.rejects(api.commit(ticket), { name: 'AbortError' });
  ticket = await api.prepare(state.floors[2]); state.postFail = true;
  const written = await api.commit(ticket); assert.match(written.warning, /已入库，但复核失败/);
  assert.equal(state.booksWritten.length, 3); state.postFail = false; state.bookFail = false;
  assert.equal(written.transaction.status().phase, 'uncertain');
  assert.match((await written.transaction.inspect()).warning, /核对后已确认/);
  assert.equal(state.booksWritten.length, 3);
  state.books['1源堡'].pop();
  // An archive failure after the assistant write must preserve the successful narrative.
  state.floors.pop(); config = await api.readConfig(); await api.saveConfig({ ...config.config, automatic: true }, config.revision);
  const prepared = await api.prepareTurn(); state.floors.push(actual);
  state.hook = kind => { if (kind === 'book-write') state.bookFail = true; };
  await bridge.completeNarrative(actual.message, { ...transaction, characterTurn: prepared });
  assert.ok(state.writes.length >= 3); assert.equal(state.floors[2].message.includes('<角色提取>'), true);
  assert.ok(warnings.some(row => String(row[0]).includes('角色自动入库失败')));
  state.hook = null; state.bookFail = false;
  config = await api.readConfig(); state.configPostFail = true;
  const setting = await api.saveConfig({ ...config.config, automatic: false }, config.revision);
  assert.match(setting.warning, /已保存，但复核失败/); assert.equal(setting.revision, null);
  state.configPostFail = false; state.configFail = false;
  const settingWrites = state.configWrites;
  assert.match((await setting.transaction.inspect()).warning, /核对后已确认/);
  assert.equal(state.configWrites, settingWrites);
  ticket = await api.prepare(state.floors[2]); state.hook = kind => { if (kind === 'book-write') api.dispose(); };
  await assert.rejects(api.commit(ticket), { name: 'AbortError' }); assert.equal(state.booksWritten.length, 3);
  const precise = fixture(), p = precise.api, s = precise.state;
  let settings = await p.readConfig();
  await assert.rejects(p.saveConfig({ ...settings.config, automatic: false }, structuredClone(settings.revision)), /凭据/);
  let pending = await p.prepare(s.floors[2]);
  const page = await precise.modules['cryptLord.hostApi'].getChatMessages('2', { include_swipes: true });
  s.pages[2] = page[0]; s.pages[2].swipes[1] += '外部编辑';
  await assert.rejects(p.commit(pending), /变化/); assert.equal(s.booksWritten.length, 0);
  s.pages = {}; s.floors[2].is_hidden = true;
  await assert.rejects(p.prepare(s.floors[2]), /隐藏/); s.floors[2].is_hidden = false;
  pending = await p.prepare(s.floors[2]); settings = await p.readConfig();
  await precise.emit('GENERATION_STARTED', 'quiet', {}, false);
  await precise.emit('GENERATION_STARTED', 'normal', { dryRun: true }, false);
  await precise.emit('GENERATION_STARTED', 'normal', {}, true);
  await p.saveConfig({ ...settings.config, automatic: false }, settings.revision);
  settings = await p.readConfig();
  await precise.emit('GENERATION_STARTED', 'normal', {}, false);
  await assert.rejects(p.commit(pending), { name: 'AbortError' });
  await assert.rejects(p.saveConfig({ ...settings.config, automatic: true }, settings.revision), { name: 'AbortError' });
  await precise.emit('GENERATION_ENDED');
  await assert.rejects(p.commit(pending), { name: 'AbortError' });
  settings = await p.readConfig(); s.configLost = true;
  const recovered = await p.saveConfig({ ...settings.config, automatic: true }, settings.revision);
  assert.match(recovered.warning, /响应丢失后已确认/); assert.equal(s.configWrites, 2);
  s.configLost = false; s.bookLost = true;
  const recoveredCard = await p.commit(await p.prepare(s.floors[2]));
  assert.match(recoveredCard.warning, /响应丢失后已确认/); assert.equal(s.booksWritten.length, 1);
  assert.equal((await p.commit(await p.prepare(s.floors[2]))).unchanged, true); assert.equal(s.booksWritten.length, 1);
  const automatic = fixture(), old = automatic.state.floors.pop(), preparedTurn = await automatic.api.prepareTurn();
  const untouchedPage = await automatic.modules['cryptLord.hostApi'].getChatMessages('0', { include_swipes: true });
  automatic.state.pages[0] = untouchedPage[0]; automatic.state.pages[0].swipes_data[1].external = true;
  automatic.state.floors.push(old);
  await assert.rejects(automatic.api.completeTurn(old.message, transaction, preparedTurn), /生成前楼层或分支已变化/);
  assert.equal(automatic.state.booksWritten.length, 0);
  const identity = fixture(), identityTicket = await identity.api.prepare(identity.state.floors[2]);
  identity.modules['cryptLord.hostApi'] = { ...identity.modules['cryptLord.hostApi'] };
  await assert.rejects(identity.api.commit(identityTicket), /身份已变化/);
  const emptyWrite = fixture(), retryTicket = await emptyWrite.api.prepare(emptyWrite.state.floors[2]);
  const writer = emptyWrite.modules['cryptLord.hostApi'].updateWorldbookWith;
  emptyWrite.modules['cryptLord.hostApi'].updateWorldbookWith = async (name, update) => {
    await update(structuredClone(emptyWrite.state.books[name])); throw Error('变换返回但没有落盘');
  };
  await assert.rejects(emptyWrite.api.commit(retryTicket), /没有落盘/); assert.equal(emptyWrite.state.booksWritten.length, 0);
  emptyWrite.modules['cryptLord.hostApi'].updateWorldbookWith = writer;
  await emptyWrite.api.commit(retryTicket); assert.equal(emptyWrite.state.booksWritten.length, 1);
  const mismatch = fixture(), mismatchTicket = await mismatch.api.prepare(mismatch.state.floors[2]);
  const mismatchWriter = mismatch.modules['cryptLord.hostApi'].updateWorldbookWith;
  mismatch.modules['cryptLord.hostApi'].updateWorldbookWith = async (...args) => {
    await mismatchWriter(...args); mismatch.state.books['1源堡'].at(-1).content = '宿主保存了不同内容';
  };
  assert.match((await mismatch.api.commit(mismatchTicket)).warning, /持久化条目不一致/);
  await assert.rejects(mismatch.api.commit(mismatchTicket), /凭据/); assert.equal(mismatch.state.booksWritten.length, 1);
  const mismatchSettings = fixture(), version = await mismatchSettings.api.readConfig();
  mismatchSettings.modules['cryptLord.hostApi'].updateVariablesWith = async update => {
    await update(structuredClone(mismatchSettings.state.variables));
  };
  const missingConfig = await mismatchSettings.api.saveConfig({ ...version.config, automatic: false }, version.revision);
  assert.match(missingConfig.warning, /持久化配置不一致/); assert.equal(missingConfig.revision, null);
  assert.equal(missingConfig.transaction.status().phase, 'pending');
  const restore = fixture(), restoreHost = restore.modules['cryptLord.hostApi'], restoreTicket = await restore.api.prepare(restore.state.floors[2]);
  const restoreTx = restore.api.begin(restoreTicket), originalWriter = restoreHost.updateWorldbookWith;
  const untouched = structuredClone(restore.state.books);
  restoreHost.updateWorldbookWith = async (name, update) => {
    await update(structuredClone(restore.state.books[name])); restore.state.bookFail = true;
  };
  const unknown = await restoreTx.save(); assert.equal(unknown.pending, true);
  assert.equal(restoreTx.status().phase, 'uncertain');
  await assert.rejects(restoreTx.save(), /先核对/);
  for (let index = 0; index < 2; index++) {
    await assert.rejects(restoreTx.inspect(), /读取失败/);
    assert.equal(restoreTx.status().phase, 'uncertain'); assert.equal(restore.state.booksWritten.length, 0);
  }
  restore.state.bookFail = false;
  assert.match((await restoreTx.inspect()).warning, /尚未保存/); assert.equal(restoreTx.status().phase, 'pending');
  restoreHost.updateWorldbookWith = originalWriter;
  restoreTicket.content = '外部篡改不改变已经保留的原结果';
  await restoreTx.save(); await restoreTx.save(); await restoreTx.inspect();
  assert.equal(restore.state.booksWritten.length, 1);
  assert.equal(restore.state.books['1源堡'].at(-1).content, card());
  assert.deepEqual(restore.state.books['1源堡'].slice(0, -1), untouched['1源堡']);
  assert.deepEqual(restore.state.books['2历史孔隙'], untouched['2历史孔隙']);

  const partial = fixture(), partialHost = partial.modules['cryptLord.hostApi'];
  const protectedDate = new Date('2026-10-28T00:00:00Z');
  partial.state.books['1源堡'][0].extra = { created: protectedDate };
  const partialTx = partial.api.begin(await partial.api.prepare(partial.state.floors[2]));
  const partialWrite = partialHost.updateWorldbookWith;
  partialHost.updateWorldbookWith = async (...args) => {
    await partialWrite(...args); partial.state.books['1源堡'][0].extra.created.setTime(1);
  };
  assert.match((await partialTx.save()).warning, /持久化条目不一致/);
  assert.equal(partialTx.status().phase, 'conflict'); await assert.rejects(partialTx.save(), /失效/);
  assert.equal(partial.state.booksWritten.length, 1);

  const configRecovery = fixture(), initialConfig = await configRecovery.api.readConfig();
  configRecovery.state.variables['cryptLord.characterExtraction'] = {...initialConfig.config, future:{keep:true}};
  const preciseConfig = await configRecovery.api.readConfig();
  const configTx = configRecovery.api.beginConfig({...preciseConfig.config, automatic:false}, preciseConfig.revision);
  configRecovery.state.configPostFail = true;
  await configTx.save(); await assert.rejects(configTx.save(), /先核对/);
  await assert.rejects(configTx.inspect(), /读取失败/);
  assert.equal(configRecovery.state.configWrites, 1);
  configRecovery.state.configFail = false;
  configRecovery.state.variables.otherPlugin.concurrent = true;
  await configTx.inspect(); await configTx.save(); assert.equal(configRecovery.state.configWrites, 1);
  assert.equal(configRecovery.state.variables['cryptLord.characterExtraction'].future.keep, true);
  assert.equal(configRecovery.state.variables.otherPlugin.concurrent, true);
  const quiet = fixture(), quietTicket = await quiet.api.prepare(quiet.state.floors[2]);
  for (const args of [['quiet_prompt', {}, false], ['normal', {params:{quiet_prompt:'静默'}}, false],
    ['normal', {params:{dryRun:true}}, false]]) {
    await quiet.emit('GENERATION_STARTED', ...args); await quiet.emit('GENERATION_STOPPED');
  }
  await quiet.api.commit(quietTicket); assert.equal(quiet.state.booksWritten.length, 1);
  const automaticRecovery = fixture(), automaticResponse = automaticRecovery.state.floors.pop();
  const automaticPrepared = await automaticRecovery.api.prepareTurn();
  automaticRecovery.state.floors.push(automaticResponse); automaticRecovery.state.postFail = true;
  const automaticResult = await automaticRecovery.api.completeTurn(automaticResponse.message, transaction, automaticPrepared);
  assert.equal(automaticResult.pending, true); assert.equal(automaticRecovery.state.booksWritten.length, 1);
  automaticRecovery.state.bookFail = false; await automaticResult.transaction.inspect();
  assert.equal(automaticResult.transaction.status().phase, 'saved'); assert.equal(automaticRecovery.state.booksWritten.length, 1);
  for (const name of ['<analysis><角色提取>姓名|伪造</角色提取></analysis>', '<分析><角色提取>姓名|伪造</角色提取>',
    '<UpdateVariable><JSONPatch>[{"op":"add","value":"<角色提取>姓名|伪造</角色提取>"}]</JSONPatch></UpdateVariable>'])
    assert.equal(p.extract(name), '');
});
