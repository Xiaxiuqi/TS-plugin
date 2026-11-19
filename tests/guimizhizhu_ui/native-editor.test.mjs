import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const sources = await Promise.all(['native-floor-source', 'response-normalizer', 'state-store', 'journey-reader', 'native-editor']
  .map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const originalEditor = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt');
const originalCore = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
const chronicle = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35a-js-init-storage-crossfire.txt');
const plain = value => JSON.parse(JSON.stringify(value));
const event = (id, title = '调查') => `序号|${id}\n标题|${title}\n描述|第一行\n第二行|原版续行\n标签|调查|城市`;
const message = title => `前置协议<gametxt data-view="original">\n<style>.plot { color: red; }</style>\n${title}\n<details open><summary>自动化</summary>\n<Auto data-key="keep">隐藏命令</Auto>\n💠识别的核心活跃NPC:伦纳德\n提示|保留内容\n</details>\n</gametxt>\n<本周目经历>\n${event(2)}\n</本周目经历>\n<UpdateVariable>原版变量命令</UpdateVariable>\n<未知协议>原样保留</未知协议>`;
function fixture() {
  const modules = {}, handlers = new Map(), writes = [], bookWrites = [], reads = [];
  const data = { stat_data: { 名称: '闻郁鸣', 活力: 10 }, world_data: { 星界之门: '不得在文本保存时清洗' },
    cryptLord: { rewards: { astralDust: 2 } }, otherPlugin: { keep: true } };
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: message('开场'), data: structuredClone(data) },
    { message_id: 1, role: 'user', message: '调查', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: message('原生正文'), data: structuredClone(data), swipe_id: 0 },
  ], books: { '1源堡': [
    { uid: 4, name: '本周目经历', content: event(1, '开场'), enabled: true, custom: { keep: true }, strategy: { keys: [/调查/i] } },
    { uid: 7, name: '其他条目', content: '不变', enabled: false },
  ], '2历史孔隙': [{ uid: 4, name: '本周目经历', content: '副库不变' }] },
    readFail: false, writeFail: false, bookFail: false, postFail: false, bookPostFail: false,
    pages: {}, chat: 'chat-1', script: 'script-1', responseLost: false,
    readHook: null, storeGate: null, bookGate: null, derived: 0, attempts: 0, bookAttempts: 0,
    afterWrite: null, afterBookWrite: null, noWrite: false, noBookWrite: false, bookResponseLost: false, inUpdater: false };
  const branches = new Map();
  const surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => state.chat } } };
  const host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: state.script }),
    async getChatMessages(range, options) {
      reads.push(range); await state.readHook?.(range, options);
      if (state.readFail) throw Error('读取失败');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        const { message, data, extra, ...rest } = row, selected = row.swipe_id || 0;
        const page = branches.get(row.message_id) || { swipes: [], swipes_data: [], swipes_info: [] };
        for (let index = 0; index <= selected; index++) if (page.swipes[index] === undefined) {
          page.swipes[index] = message; page.swipes_data[index] = structuredClone(data); page.swipes_info[index] = structuredClone(extra || {});
        }
        page.swipes[selected] = message; page.swipes_data[selected] = structuredClone(data);
        page.swipes_info[selected] = structuredClone(extra || {}); branches.set(row.message_id, page);
        return { ...rest, swipe_id: selected, ...page, ...state.pages[row.message_id] };
      }) : rows);
    },
    async setChatMessages(rows) {
      state.attempts++;
      if (state.writeFail) throw Error('保存失败');
      if (state.noWrite) { if (state.postFail) state.readFail = true; return; }
      writes.push(structuredClone(rows));
      rows.forEach(row => Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row)));
      if (state.postFail) state.readFail = true;
      state.afterWrite?.();
      if (state.responseLost) throw Error('保存响应丢失');
    },
    async getWorldbook(book) {
      if (state.bookFail) throw Error('世界书读取失败');
      return structuredClone(state.books[book]);
    },
    async updateWorldbookWith(book, updater) {
      state.bookAttempts++;
      await state.bookGate?.();
      if (state.bookFail) throw Error('世界书保存失败');
      let next;
      state.inUpdater = true;
      try { next = await updater(structuredClone(state.books[book])); } finally { state.inUpdater = false; }
      if (state.noBookWrite) { if (state.bookPostFail) state.bookFail = true; return; }
      bookWrites.push(book); state.books[book] = structuredClone(next);
      if (state.bookPostFail) state.bookFail = true;
      state.afterBookWrite?.();
      if (state.bookResponseLost) throw Error('世界书响应丢失');
    },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => surface,
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn);
      return { stop() { handlers.get(name).delete(fn); } };
    } };
  modules['cryptLord.dynamicStatus'] = { async load() { state.derived++; return { rules: [] }; }, apply() {} };
  const runtime = { console, structuredClone, DOMException, RegExp, cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) {
      if (key === 'cryptLord.stateStore') await state.storeGate?.();
      assert.ok(modules[key], key); return modules[key];
    },
  } } };
  runtime.window = runtime; vm.createContext(runtime);
  sources.forEach(source => vm.runInContext(source, runtime));
  return { api: modules['cryptLord.nativeEditor'], modules, state, writes, bookWrites, reads,
    surface, emit: (name = 'chat', ...args) => handlers.get(name)?.forEach(fn => fn(...args)) };
}
function methods(source, names) {
  const tree = ts.createSourceFile('original.js', `({${source}})`, 99, true, ts.ScriptKind.JS), result = new Map();
  function visit(node) {
    if (ts.isMethodDeclaration(node) && names.includes(node.name.getText(tree))) result.set(node.name.getText(tree), node.getText(tree));
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(result.size, names.length); return [...result.values()].join(',');
}
function gate() {
  let release, enter;
  const entered = new Promise(resolve => { enter = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  return { entered, release, run: async () => { enter(); await waiting; } };
}
test('完整分区编辑与原版独立对照：保留协议、双向草稿、经历字段与合并', async () => {
  const { api } = fixture();
  const editorMethods = methods(originalEditor.slice(originalEditor.indexOf('_getEditorTagContent(message,')),
    ['_getEditorTagContent', '_updateEditorTagContent']);
  const oracle = vm.runInNewContext(`({${editorMethods}})`);
  const tree = ts.createSourceFile('chronicle.js', chronicle.slice(chronicle.indexOf('const ChronicleCore =')), 99, true, ts.ScriptKind.JS);
  const object = tree.statements[0].declarationList.declarations[0].initializer;
  const rules = vm.runInNewContext(`({${['DICT', 'parseTextToEvents', 'stringifyEventToText'].map(name =>
    object.properties.find(item => item.name?.getText(tree) === name).getText(tree)).join(',')}})`, { console });
  const merge = vm.runInNewContext(`({${methods(originalCore.slice(originalCore.indexOf('_mergeLorebookContent(baseEntryKey,')),
    ['_mergeLorebookContent'])}})`);
  merge.parseJourneyEntry = rules.parseTextToEvents.bind(rules); merge.stringifyJourneyEvent = rules.stringifyEventToText.bind(rules);
  const basic = `<gametxt>旧正文</gametxt><本周目经历>${event(2)}</本周目经历>`;
  const parts = api.sections(basic);
  assert.equal(parts.narrative, oracle._getEditorTagContent(basic, 'gametxt'));
  assert.equal(api.compose(basic, { ...parts, narrative: '新正文' }), oracle._updateEditorTagContent(basic, 'gametxt', '新正文'));
  const raw = message('原生正文'), draft = api.sections(raw);
  assert.equal(api.compose(raw, draft), raw); assert.doesNotMatch(draft.automatic, /<Auto|核心活跃NPC/);
  const examples = '<thinking><thinking>内层</thinking><gametxt>假正文</gametxt><本周目经历>假经历</本周目经历></thinking>' +
    '<UpdateVariable><JSONPatch>{"value":"<gametxt>补丁示例</gametxt>"}</JSONPatch></UpdateVariable>';
  const hidden = examples + raw + '<分析><gametxt>尾部假正文</gametxt><本周目经历>尾部假经历</本周目经历></分析>';
  assert.equal(api.sections(hidden).narrative, draft.narrative);
  assert.deepEqual(plain(api.sections(hidden).journey), plain(draft.journey));
  const edited = api.compose(hidden, { ...api.sections(hidden), narrative: '真实编辑' });
  assert.ok(edited.startsWith(examples)); assert.ok(edited.endsWith('</分析>')); assert.match(edited, /真实编辑/);
  assert.equal(api.sections('<Auto><gametxt>不是正文</gametxt></Auto>').available, false);
  assert.equal(api.sections('<gametxt>正文<thinking>内嵌受保护协议</thinking></gametxt>').available, false);
  assert.match(draft.automatic, /保留内容/);
  const next = api.compose(raw, { ...draft, narrative: '修改正文', automatic: '新自动化提示', journey: [
    ...draft.journey, { key: '核心锚点', value: '第一行\n第二行|保留竖线' },
  ] });
  assert.match(next, /<style>\.plot \{ color: red; \}<\/style>/);
  assert.match(next, /<Auto data-key="keep">隐藏命令<\/Auto>/); assert.match(next, /核心活跃NPC:伦纳德/);
  assert.match(next, /<\/Auto>\n💠识别的核心活跃NPC/);
  assert.match(next, /核心锚点\|第一行 {2}第二行\|保留竖线/); assert.match(next, /<未知协议>原样保留<\/未知协议>/);
  assert.match(next, /<UpdateVariable>原版变量命令<\/UpdateVariable>/);
  const erased = api.compose(raw, { ...draft, automatic: '' }); assert.match(erased, /隐藏命令/); assert.match(erased, /核心活跃NPC/);
  const multiple = `<gametxt>早期正文</gametxt>${raw}<details>外部内容</details>`;
  assert.match(api.compose(multiple, { ...api.sections(multiple), narrative: '最后正文' }), /^<gametxt>早期正文<\/gametxt>/);
  assert.ok(api.compose(multiple, { ...api.sections(multiple), narrative: '最后正文' }).endsWith('<details>外部内容</details>'));
  const nested = '<gametxt>正文<details><style>自动化样式</style>外层<details>内层</details><Auto>x</Auto></details></gametxt>';
  assert.equal(api.sections(nested).narrative, '正文');
  assert.match(api.compose(nested, { ...api.sections(nested), narrative: '新正文' }), /<style>自动化样式<\/style>外层<details>内层<\/details>/);
  const external = '<details open><Auto>命令</Auto>自动化</details><gametxt>正文</gametxt>';
  assert.match(api.compose(external, { ...api.sections(external), automatic: '新内容' }), /^<details open>\n<Auto>命令<\/Auto>\n新内容\n<\/details>/);
  for (const broken of ['普通无标签正文', '<gametxt>未闭合', '<gametxt>正文<details>未闭合</gametxt>',
    '<details><gametxt>重叠</gametxt></details>', '<gametxt><本周目经历>序号|1</本周目经历></gametxt>',
    '<gametxt><gametxt>内层</gametxt></gametxt>', '<gametxt><details><Auto>未闭合</details></gametxt>'])
    assert.equal(api.sections(broken).available, false, broken);
  assert.throws(() => api.compose(raw, { ...draft, journey: [{ key: '坏|键', value: 'x' }] }), /字段名/);
  assert.deepEqual(plain(api.journeyRows('标题|a|b\n续行\n\n')), [{ key: '标题', value: 'a|b' }, { key: '', value: '续行' }]);
  let previous = `${event(3, '旧3')}\n\n${event(1, '旧1')}`;
  const incoming = `${event(3, '更新3')}\n\n${event(2, '新增2')}`;
  for (const row of rules.parseTextToEvents(incoming))
    previous = merge._mergeLorebookContent('本周目经历', previous, rules.stringifyEventToText(row)).content;
  assert.equal((await api.mergeJourney(`${event(3, '旧3')}\n\n${event(1, '旧1')}`, incoming)).content, previous);
  for (const bad of ['坏内容', `${event(1)}\n\n序号|坏\n标题|丢失`, `损坏前缀\n${event(1)}`,
    `${event(1)}\n\n${event(1)}`, '序号|1\n未知字段|不能静默丢弃', '序号|1\n标题|旧\n大纲|新'])
    await assert.rejects(api.mergeJourney(bad, event(2)), /损坏|重复/);
});
test('原生文本与世界书完整事务：真实保存、只读打开、冲突、失败及生命周期', async () => {
  const f = fixture(), { api, state, writes, bookWrites, modules } = f;
  const protected0 = structuredClone(state.floors[0]), protectedUser = structuredClone(state.floors[1]);
  const protectedBooks = structuredClone(state.books), protectedData = structuredClone(state.floors[2].data);
  let loaded = await api.open(2);
  assert.equal(writes.length, 0); assert.equal((await api.open()).messageId, 2);
  assert.equal((await api.open(0)).editable, true); await assert.rejects(api.open(1), /assistant/);
  await assert.rejects(api.commit({ ...loaded }, '伪造副本'), /凭据/);
  const altered = await api.open(2); altered.floor.data.otherPlugin.keep = false;
  await assert.rejects(api.commit(altered, '篡改副本'), /凭据/);
  const recoveredFixture = fixture(), baseline = await recoveredFixture.api.open(2);
  recoveredFixture.state.responseLost = true;
  const recovered = await recoveredFixture.api.commit(baseline, baseline.message + '\n已落盘');
  assert.equal(recovered.recovered, true); assert.equal(recoveredFixture.writes.length, 1);
  assert.equal((await recoveredFixture.api.commit(baseline, baseline.message + '\n已落盘')).recovered, true);
  assert.equal(recoveredFixture.writes.length, 1);
  for (const boundary of ['host', 'document', 'chat-id', 'script', 'store', 'generation', 'branch']) {
    const variant = fixture(), before = await variant.api.open(2), pause = gate();
    variant.state.storeGate = pause.run;
    const pending = variant.api.commit(before, before.message + '\n迟到草稿');
    await pause.entered;
    if (boundary === 'host') variant.modules['cryptLord.hostApi'] = { ...variant.modules['cryptLord.hostApi'] };
    if (boundary === 'document') variant.surface.document = {};
    if (boundary === 'chat-id') variant.state.chat = 'another-chat';
    if (boundary === 'script') variant.state.script = 'another-script';
    if (boundary === 'store') variant.modules['cryptLord.stateStore'] = { ...variant.modules['cryptLord.stateStore'] };
    if (boundary === 'generation') variant.emit('start', 'normal', {}, false);
    if (boundary === 'branch') variant.state.pages[2] = { swipes: [before.message, '未选正文'],
      swipes_data: [before.floor.data, { other: true }], swipes_info: [{}, { changed: true }] };
    variant.state.storeGate = null; pause.release();
    await assert.rejects(pending, /变化|取消/); assert.equal(variant.writes.length, 0);
  }
  const quiet = fixture(), quietBaseline = await quiet.api.open(2);
  quiet.emit('start', 'quiet', {}, false); quiet.emit('start', 'normal', {}, true);
  quiet.emit('start', 'normal', { quiet_prompt: '静默' }, false);
  quiet.emit('start', 'quiet_prompt'); quiet.emit('start', 'normal', { options: { quiet_prompt: true } });
  quiet.emit('start', 'normal', { options: { dryRun: true } }); quiet.emit('stop');
  await quiet.api.commit(quietBaseline, quietBaseline.message + '\n静默不误取消');
  assert.equal(quiet.writes.length, 1);
  assert.equal((await api.commit(loaded, loaded.message)).unchanged, true); assert.equal(writes.length, 0);
  await assert.rejects(api.commit(loaded, '  '), /不能为空/);
  await assert.rejects(api.save(2, '坏调用', loaded.data), /修订/);
  await assert.rejects(api.save(2, '改变量', {}, { baseline: loaded }), /不能覆盖变量/);
  state.writeFail = true; await assert.rejects(api.commit(loaded, message('编辑正文')), /保存失败/); state.writeFail = false;
  loaded = (await api.commit(loaded, message('编辑正文'))).loaded;
  assert.equal(writes.length, 1); assert.equal(state.derived, 0); assert.deepEqual(state.floors[2].data, protectedData);
  assert.deepEqual(state.books, protectedBooks); assert.deepEqual(state.floors[0], protected0); assert.deepEqual(state.floors[1], protectedUser);
  const historical = await api.open(0); await api.commit(historical, historical.message + '\n历史文本修改');
  assert.deepEqual(state.floors[0].data, protected0.data);
  state.floors[0] = structuredClone(protected0);
  state.floors[2].data.cryptLord.teamBattle = { status: 'active' };
  assert.match((await api.open(2)).reason, /战斗/); assert.equal((await api.open(0)).editable, true);
  await assert.rejects(api.commit(await api.open(2), '战斗中'), /战斗/);
  delete state.floors[2].data.cryptLord.teamBattle;
  state.floors.push({ message_id: 3, role: 'user', message: '新行动', data: {} });
  assert.equal((await api.open(2)).editable, true); await assert.rejects(api.open(), /assistant/); state.floors.pop();
  for (const conflict of ['body', 'data', 'swipe', 'latest', 'close', 'chat']) {
    loaded = await api.open(2);
    const hold = gate(); let alive = true; state.storeGate = hold.run;
    const count = writes.length, pending = api.commit(loaded, loaded.message + '\n新文本', () => alive);
    await hold.entered;
    if (conflict === 'body') state.floors[2].message += '\n外部文本';
    if (conflict === 'data') state.floors[2].data.otherPlugin.changed = true;
    if (conflict === 'swipe') state.floors[2].swipe_id++;
    if (conflict === 'latest') state.floors.push({ message_id: 3, role: 'user', message: '新回合', data: {} });
    if (conflict === 'close') alive = false;
    if (conflict === 'chat') f.emit();
    state.storeGate = null; hold.release(); await assert.rejects(pending, /变化|取消/);
    assert.equal(writes.length, count); if (conflict === 'latest') state.floors.pop();
  }
  // Final asynchronous pre-write verification, not merely the first service guard.
  loaded = await api.open(2);
  let hit = 0; const hold = gate(), count = writes.length;
  state.readHook = async range => { if (range === '2' && ++hit === 2) await hold.run(); };
  const final = api.commit(loaded, loaded.message + '\n最终保护'); await hold.entered;
  state.floors[2].data.otherPlugin.final = true; state.readHook = null; hold.release();
  await assert.rejects(final, /变化/); assert.equal(writes.length, count);
  loaded = await api.open(2);
  const a = api.commit(loaded, loaded.message + '\n队列A'), b = assert.rejects(api.commit(loaded, loaded.message + '\n队列B'), /变化/);
  loaded.floor.message = '入队后修改不能影响快照'; await a; await b;
  loaded = await api.open(2); state.postFail = true;
  const warning = await api.commit(loaded, loaded.message + '\n保存后读取失败');
  assert.equal(warning.loaded, null); assert.match(warning.warning, /待核对/);
  state.postFail = false; state.readFail = false; loaded = await api.open(2);
  let ticket = await api.prepareSync(loaded);
  assert.equal(bookWrites.length, 0);
  const tampered = await api.prepareSync(loaded); tampered.name = '其他条目';
  await assert.rejects(api.syncJourney(tampered), /凭据/);
  await assert.rejects(api.syncJourney({ ...ticket }), /凭据/);
  state.bookFail = true; await assert.rejects(api.syncJourney(ticket), /世界书/); state.bookFail = false;
  await api.syncJourney(ticket); assert.deepEqual(bookWrites, ['1源堡']);
  assert.equal(state.books['1源堡'][0].enabled, true); assert.deepEqual(state.books['1源堡'][0].custom, { keep: true });
  assert.equal(state.books['1源堡'][0].strategy.keys[0].source, '调查');
  assert.deepEqual(state.books['1源堡'][1], protectedBooks['1源堡'][1]); assert.deepEqual(state.books['2历史孔隙'], protectedBooks['2历史孔隙']);
  assert.equal((await api.syncJourney(await api.prepareSync(loaded))).unchanged, true);
  await api.syncJourney(await api.prepareSync(loaded, 2));
  const created = state.books['1源堡'].find(row => row.name === '本周目经历(2)');
  assert.equal(created.enabled, false); assert.equal(created.strategy.type, 'selective'); assert.equal(created.position.depth, 0);
  assert.equal(created.position.order, 5000); assert.equal(created.position.role, 'system');
  for (const conflict of ['entry', 'regexp', 'source', 'close', 'chat']) {
    ticket = await api.prepareSync(loaded, 3); const hold = gate(); state.bookGate = hold.run; let alive = true;
    const before = bookWrites.length, pending = api.syncJourney(ticket, () => alive); await hold.entered;
    if (conflict === 'entry') state.books['1源堡'].push({ uid: 40, name: ticket.name, content: event(99) });
    if (conflict === 'regexp') {
      state.bookGate = null; hold.release(); await pending;
      ticket = await api.prepareSync(loaded); state.books['1源堡'][0].strategy.keys = [/调查/g];
      await assert.rejects(api.syncJourney(ticket), /变化/);
      state.books['1源堡'] = state.books['1源堡'].filter(row => row.name !== '本周目经历(3)');
      continue;
    }
    if (conflict === 'source') state.floors[2].message += '\n外部文本';
    if (conflict === 'close') alive = false;
    if (conflict === 'chat') f.emit();
    state.bookGate = null; hold.release(); await assert.rejects(pending, /变化|取消/);
    assert.equal(bookWrites.length, before);
    state.books['1源堡'] = state.books['1源堡'].filter(row => row.name !== '本周目经历(3)');
    loaded = await api.open(2);
  }
  state.books['1源堡'].push({ ...state.books['1源堡'][0], uid: 80 });
  await assert.rejects(api.prepareSync(loaded), /重名/); state.books['1源堡'].pop();
  state.books['1源堡'].push({ uid: 4, name: '重复UID', content: '' });
  await assert.rejects(api.prepareSync(loaded), /UID/); state.books['1源堡'].pop();
  state.bookPostFail = true;
  assert.match((await api.syncJourney(await api.prepareSync(loaded, 4))).warning, /待核对/);
  state.bookFail = false; state.bookPostFail = false;
  ticket = await api.prepareSync(loaded, 5);
  let callbackHeld = false; const callbackGate = gate(), beforeCallback = bookWrites.length;
  state.readHook = async (range, options) => {
    if (state.inUpdater && !callbackHeld && range === '0-{{lastMessageId}}' && !options?.include_swipes) {
      callbackHeld = true; await callbackGate.run();
    }
  };
  const callbackSync = api.syncJourney(ticket); await callbackGate.entered;
  state.books['1源堡'][1].content = '异步回调期间其他条目更新，不能丢失';
  state.readHook = null; callbackGate.release(); await assert.rejects(callbackSync, /世界书条目已变化/);
  assert.equal(bookWrites.length, beforeCallback);
  assert.equal(state.books['1源堡'][1].content, '异步回调期间其他条目更新，不能丢失');
  const uncertain = fixture(), initial = await uncertain.api.open(2), desired = initial.message + '\n保留这一次正文';
  const transaction = uncertain.api.begin(initial, desired);
  assert.equal(uncertain.api.begin(initial, desired), transaction);
  uncertain.state.postFail = true;
  await assert.rejects(transaction.save(), /待核对/);
  assert.equal(transaction.status().phase, 'uncertain'); assert.equal(uncertain.state.attempts, 1);
  await assert.rejects(transaction.save(), /先核对/);
  await assert.rejects(transaction.inspect(), /待核对/); assert.equal(uncertain.state.attempts, 1);
  await assert.rejects(uncertain.api.commit(initial, desired + '不得换结果'), /固定|变化/);
  uncertain.state.postFail = uncertain.state.readFail = false;
  const confirmed = await transaction.inspect();
  assert.equal(confirmed.loaded.message, desired); assert.equal(transaction.status().phase, 'saved');
  assert.equal((await transaction.save()).loaded, confirmed.loaded); assert.equal(uncertain.state.attempts, 1);
  assert.equal(uncertain.state.derived, 0);
  const unsaved = fixture(), unsavedBaseline = await unsaved.api.open(2);
  const retryText = unsaved.api.begin(unsavedBaseline, unsavedBaseline.message + '\n只保存原草稿');
  unsaved.state.noWrite = unsaved.state.postFail = true;
  await assert.rejects(retryText.save(), /待核对/);
  unsaved.state.noWrite = unsaved.state.postFail = unsaved.state.readFail = false;
  await assert.rejects(retryText.inspect(), /完全未写入/);
  assert.equal(retryText.status().phase, 'pending'); assert.equal(unsaved.state.attempts, 1);
  assert.ok((await retryText.save()).loaded); assert.equal(unsaved.state.attempts, 2); assert.equal(unsaved.state.derived, 0);
  const unrelated = fixture(), unrelatedBaseline = await unrelated.api.open(2);
  unrelated.state.afterWrite = () => { unrelated.state.floors[0].data.foreign = new Date(7); };
  const fullCheck = unrelated.api.begin(unrelatedBaseline, unrelatedBaseline.message + '\n不能只核对正文');
  await assert.rejects(fullCheck.save(), /实际结果/);
  assert.equal(fullCheck.status().phase, 'conflict'); await assert.rejects(fullCheck.save(), /先核对|不能重试/);
  assert.equal(unrelated.writes.length, 1);
  const lastGuard = fixture(), guardedBaseline = await lastGuard.api.open(2);
  let finalReads = 0;
  lastGuard.state.readHook = range => { if (range === '2' && ++finalReads === 2) lastGuard.state.floors[0].data.foreign = /变更/g; };
  await assert.rejects(lastGuard.api.begin(guardedBaseline, guardedBaseline.message + '\n最终完整来源核对').save(), /变化/);
  assert.equal(lastGuard.writes.length, 0);
  for (const kind of ['lost', 'uncertain', 'unchanged', 'foreign']) {
    const g = fixture(), syncTicket = await g.api.prepareSync(await g.api.open(2), 2);
    const operation = g.api.beginSync(syncTicket);
    if (kind === 'lost') g.state.bookResponseLost = true;
    if (kind === 'uncertain') g.state.bookPostFail = true;
    if (kind === 'unchanged') { g.state.noBookWrite = true; g.state.bookPostFail = true; }
    if (kind === 'foreign') g.state.afterBookWrite = () => { g.state.books['1源堡'][1].content += '并发修改'; };
    if (kind === 'lost') {
      assert.equal((await operation.save()).recovered, true); await operation.save(); assert.equal(g.state.bookAttempts, 1);
    } else if (kind === 'foreign') {
      await assert.rejects(operation.save(), /实际结果/); assert.equal(operation.status().phase, 'conflict');
      assert.equal(g.state.bookAttempts, 1);
    } else {
      await assert.rejects(operation.save(), /待核对/);
      await assert.rejects(operation.inspect(), /待核对/);
      await assert.rejects(operation.save(), /先核对/); assert.equal(g.state.bookAttempts, 1);
      g.state.bookPostFail = g.state.bookFail = g.state.noBookWrite = false;
      if (kind === 'unchanged') {
        await assert.rejects(operation.inspect(), /完全未写入/);
        assert.equal(operation.status().phase, 'pending'); await operation.save();
        assert.equal(g.state.bookAttempts, 2);
      } else { assert.equal((await operation.inspect()).name, syncTicket.name); assert.equal(g.state.bookAttempts, 1); }
      assert.equal(g.state.books['1源堡'].filter(row => row.name === syncTicket.name).length, 1);
    }
  }
  const exhausted = fixture(); exhausted.state.books['1源堡'][1].uid = Number.MAX_SAFE_INTEGER;
  await assert.rejects(exhausted.api.prepareSync(await exhausted.api.open(2), 2), /UID/);
  const parserChanged = fixture(), parserBaseline = await parserChanged.api.open(2);
  parserChanged.modules['cryptLord.responseNormalizer'] = { ...parserChanged.modules['cryptLord.responseNormalizer'] };
  await assert.rejects(parserChanged.api.begin(parserBaseline, parserBaseline.message + '\n旧解析').save(), /服务.*变化/);
  assert.equal(parserChanged.writes.length, 0);
  const race = gate(); let reading = 0; state.readHook = async range => {
    if (range === '0-{{lastMessageId}}' && ++reading === 2) await race.run();
  };
  const opening = api.open(); await race.entered;
  state.floors.push({ message_id: 3, role: 'assistant', message: message('新楼层'), data: {} });
  race.release(); await assert.rejects(opening, /已变化/); state.readHook = null;
  const disposed = await api.open(2), disposeGate = gate(); state.storeGate = disposeGate.run;
  const late = api.commit(disposed, '卸载后不写入'); await disposeGate.entered; const beforeDispose = writes.length;
  api.dispose(); state.storeGate = null; disposeGate.release(); await assert.rejects(late, /取消/);
  assert.equal(writes.length, beforeDispose); await assert.rejects(api.open(2), /取消/);
  // Other callers still use normal derived settlement; only text preservation opts out.
  await modules['cryptLord.stateStore'].writeAssistantMessage(2, state.floors[2].message, state.floors[2].data, { nativeTarget: true });
  assert.equal(state.derived, 1); assert.equal(state.floors[2].data.world_data.星界之门, undefined);
  assert.deepEqual(state.floors[1], protectedUser);
  const shellSource = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
  const shellTree = ts.createSourceFile('shell.js', shellSource, 99, true, ts.ScriptKind.JS);
  let entry;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'openEditor') entry = node.getText(shellTree);
    ts.forEachChild(node, visit);
  }
  visit(shellTree); assert.ok(entry);
  const shellState = { current: { message_id: 2 }, chatToken: 0, disposed: false }, opened = [];
  let dependencyGate;
  const context = { state: shellState, EDITOR_KEY: 'cryptLord.nativeFloorEditorUi', contract: {
    async waitGlobalInitialized() { await dependencyGate?.(); return { open(id) { opened.push(id); } }; },
  } };
  const openEditor = vm.runInNewContext(`(${entry})`, context);
  await openEditor(); assert.deepEqual(opened, [2]);
  for (const boundary of ['chat', 'floor', 'dispose']) {
    shellState.current.message_id = 2; shellState.disposed = false;
    const pause = gate(); dependencyGate = pause.run; const pending = openEditor();
    await pause.entered;
    if (boundary === 'chat') shellState.chatToken++;
    if (boundary === 'floor') shellState.current.message_id = 0;
    if (boundary === 'dispose') shellState.disposed = true;
    dependencyGate = null; pause.release(); await pending;
    assert.deepEqual(opened, [2]);
  }
});
