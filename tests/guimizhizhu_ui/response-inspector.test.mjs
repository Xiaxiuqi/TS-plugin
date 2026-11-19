import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const files = ['core/native-floor-source.js', 'core/response-normalizer.js', 'core/variable-patch.js', 'core/state-store.js', 'core/response-inspector.js',
  'core/variable-workbench-state.js', 'core/generation-bridge.js'];
const sources = await Promise.all(files.map(path => read(`public/guimizhizhu_ui/${path}`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
const tools = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const loader = await read('public/guimizhizhu_ui/loader.js'), shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
const plain = value => JSON.parse(JSON.stringify(value));
const patch = value => `<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/活力","value":${value}}],"npc_data":[],"world_data":[]}</JSONPatch></UpdateVariable>`;
const text = '<thinking>正文推演</thinking><gametxt>调查：雨夜的档案室里出现了新的线索。</gametxt><action>调查登记簿</action>';
function methods(names) {
  return names.map(name => {
    const index = original.search(new RegExp(`^${name}\\([^\\n]*\\)\\s*\\{`, 'm'));
    assert.notEqual(index, -1);
    const tree = ts.createSourceFile('original.js', `({${original.slice(index)}})`, 99, true, ts.ScriptKind.JS);
    let source;
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) source = node.getText(tree);
      if (!source) ts.forEachChild(node, visit);
    }
    visit(tree); assert.ok(source); return source;
  }).join(',\n');
}
function fixture() {
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: '开场', data: { stat_data: { 活力: 10 }, otherPlugin: { keep: true } } },
    { message_id: 1, role: 'user', message: '调查', data: {} },
    { message_id: 2, role: 'assistant', message: text, data: { stat_data: { 活力: 10 }, otherPlugin: { keep: true } }, swipe_id: 0 },
  ], pages: {}, hook: null, response: `<reasoning>变量核对</reasoning>${patch(12)}`, reads: 0, writes: [], readFail: false };
  const handlers = new Set(), modules = {}, host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: 'inspector-test' }),
    async getChatMessages(range, options) {
      state.reads++; await state.hook?.(range);
      if (state.readFail) throw Error('读取失败');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        const { message, data, extra, ...rest } = row, selected = row.swipe_id || 0;
        return { ...rest, swipe_id: selected, swipes: Array(selected + 1).fill(message),
          swipes_data: Array(selected + 1).fill(data || {}), swipes_info: Array(selected + 1).fill(extra || {}), ...state.pages[row.message_id] };
      }) : rows);
    },
    async setChatMessages(rows, options) {
      assert.equal(options.refresh, 'affected'); assert.equal(rows.length, 1);
      rows.forEach(row => {
        assert.equal(row.message_id, 2);
        Object.assign(state.floors[2], structuredClone(row)); state.writes.push(row.message_id);
      });
    },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => null, tavernEvents: () => ({ CHAT_CHANGED: 'chat' }),
    bindEvent(name, fn) { handlers.add(fn); return { stop() { handlers.delete(fn); } }; } };
  modules['cryptLord.contextBuilder'] = {};
  modules['cryptLord.nativeSettlement'] = { apply() {} };
  const floorProofs = new WeakMap();
  modules['cryptLord.variableSettlementApi'] = {
    async readFloorSource({ messageId, guard }) {
      const reader = modules['cryptLord.nativeFloorSource'], source = await reader.read(guard);
      await reader.assert(source, guard);
      const floor = messageId == null ? source.rows.filter(row => row.role === 'assistant').at(-1) :
        source.rows.find(row => row.message_id === messageId);
      const loaded = { floor: structuredClone(floor), latest: structuredClone(source.rows.at(-1)) };
      floorProofs.set(loaded, source); return loaded;
    },
    async assertFloorSource(loaded, guard) { await modules['cryptLord.nativeFloorSource'].assert(floorProofs.get(loaded), guard); },
    async settle({ previousData }) {
    return { response: state.response, data: structuredClone(previousData), skipped: false };
  } };
  const runtime = { console, structuredClone, DOMException, TextEncoder, Uint8Array, crypto: webcrypto,
    cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, runtime, api: modules['cryptLord.responseInspector'], emit: () => handlers.forEach(fn => fn()) };
}
test('原版提取与双模型分栏独立对照、隐藏区防污染、原生读取一致性和只读边界', async () => {
  for (const file of ['core/response-inspector.js', 'modules/response-inspector/index.js', 'modules/response-inspector/style.css'])
    assert.ok(loader.includes(`'${file}'`));
  assert.ok(loader.indexOf("path: 'core/response-inspector.js'") < loader.indexOf("path: 'core/generation-bridge.js'"));
  const shellTree = ts.createSourceFile('shell.js', shell, 99, true, ts.ScriptKind.JS);
  let route;
  function findRoute(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'showFeature') route = node.getText(shellTree);
    if (!route) ts.forEachChild(node, findRoute);
  }
  findRoute(shellTree); assert.ok(route);
  const opens = [], notices = [], menuState = { current: { message_id: 2 }, chatToken: 1, disposed: false };
  let release, reject;
  const show = vm.runInNewContext(`(${route})`, { state: menuState, notify: text => notices.push(text),
    contract: { waitGlobalInitialized(key) {
      assert.equal(key, 'cryptLord.responseInspectorUi');
      return new Promise((resolve, fail) => { release = () => resolve({ open(...args) { opens.push(args); } }); reject = fail; });
    } } });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  show({ id: 'extracted' }); release(); await tick(); assert.deepEqual(opens, [[2, 'variables']]);
  show({ id: 'extracted' }); menuState.chatToken++; release(); await tick(); assert.equal(opens.length, 1);
  show({ id: 'extracted' }); menuState.disposed = true; reject(Error('迟到失败')); await tick(); assert.deepEqual(notices, []);
  const menuUpdates = [], actionMenu = { current: { message_id: 2 }, chatToken: 1, disposed: false,
    modal: { dataset: { open: 'true' } }, modalTitle: { textContent: '行动选项' },
    modalBody: { appendChild() {}, replaceChildren(value) { menuUpdates.push(value); } } };
  let ready;
  const showActions = vm.runInNewContext(`(${route})`, { state: actionMenu, element: (tag, css, text) => ({ text }),
    openModal: () => true, contract: { waitGlobalInitialized(key) {
      assert.equal(key, 'cryptLord.actionOptions');
      return new Promise(resolve => { ready = () => resolve({ createList(id, guard) {
        assert.equal(id, 2); if (!guard()) throw Error('取消'); return { list: true };
      } }); });
    } } });
  showActions({ id: 'actions', label: '行动选项' }); ready(); await tick();
  assert.deepEqual(plain(menuUpdates), [{ list: true }]);
  showActions({ id: 'actions', label: '行动选项' }); actionMenu.chatToken++; ready(); await tick();
  assert.equal(menuUpdates.length, 1);
  const { api, state, emit } = fixture();
  const tree = ts.createSourceFile('tools.js', tools, 99, true, ts.ScriptKind.JS);
  let regexSource;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'createSafeRegex') regexSource = node.initializer.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(regexSource);
  const oracle = vm.runInNewContext(`({${methods(['_parseAiResponse', '_extractLastTagContent', '_extractAllTags'])}})`, {
    createSafeRegex: vm.runInNewContext(`(${regexSource})`),
  });
  Object.assign(oracle, { _parseActions: () => [], _stripForbiddenWords: value => value, _getDisplayText: value => value });
  const actionOracle = vm.runInNewContext(`({${methods(['_parseActions'])}})`);
  for (const input of ['1. 调查现场\n2. 询问值夜者', '查看登记簿\n联系同伴'])
    assert.deepEqual(plain(fixture().modules['cryptLord.responseNormalizer'].extractActions(`<action>${input}</action>`)),
      plain(actionOracle._parseActions(input)));
  for (const input of [text, `${text}${patch(12)}`, `<think>变量思考</think>${patch(12)}`,
    '<think>变量思考</think><UpdateVariable></UpdateVariable>',
    `<reasoning>正文</reasoning><think>中间</think><thinking x="1">变量</thinking>${patch(12)}`,
    `${text}<safe><当前线索>假的</当前线索></safe><本周目经历>序号|1\n大纲|调查</本周目经历><当前线索>真的</当前线索><dm>评论</dm>`,
    '<gametxt>旧</gametxt><gametxt lang="zh">新</gametxt><角色提取>角色A</角色提取><物品提取>车票</物品提取><wlog>天气</wlog>']) {
    const result = api.parse(input), reference = oracle._parseAiResponse(input);
    assert.equal(result.thinking.narrative, reference.thinkingNarrative || '');
    assert.equal(result.thinking.variable, reference.thinkingVariable || '');
    for (const key of ['variables', 'novelText', 'journey', 'characterCard', 'itemCard', 'clues', 'worldLog'])
      assert.equal(result[key], reference[key] || '');
    assert.deepEqual(plain(result.danmaku), plain(reference.danmaku));
  }
  assert.equal(api.parse('<gametxt>真</gametxt><thinking><gametxt>假</gametxt>').novelText, '真');
  assert.equal(api.parse('<safe><当前线索>假</当前线索>').clues, '');
  const normalizer = fixture().modules['cryptLord.responseNormalizer'];
  const publicText = '<gametxt>公开正文</gametxt><action>1. 调查\n2. 询问</action><本周目经历>序号|2\n大纲|调查</本周目经历>';
  for (const hidden of [
    '<thinking><thinking>内层</thinking><gametxt>假正文</gametxt><action>假行动</action></thinking>',
    '<推理><分析><角色提取>假角色</角色提取></分析><本周目经历>假经历</本周目经历></推理>',
    '<Auto><gametxt>自动化示例</gametxt><action>自动化行动</action></Auto>',
    '<!-- <gametxt>注释</gametxt><action>注释行动</action> -->',
    '<script>const s = "<gametxt>脚本</gametxt>";</script>',
    '<thinking><gametxt>未闭合示例</gametxt>',
  ]) {
    const parsed = api.parse(publicText + hidden);
    assert.equal(parsed.novelText, '公开正文'); assert.equal(parsed.actions, '1. 调查\n2. 询问');
    assert.equal(parsed.journey, '序号|2\n大纲|调查'); assert.equal(parsed.characterCard, '');
    assert.equal(normalizer.normalize(publicText + hidden).message, '公开正文');
    assert.deepEqual(plain(normalizer.extractActions(publicText + hidden)), ['调查', '询问']);
    assert.deepEqual(plain(normalizer.extractLegacyActions(hidden, { querySelectorAll() { assert.fail('不得从旧DOM恢复隐藏行动'); } })), []);
  }
  const json = JSON.stringify({ value: '</UpdateVariable><gametxt>补丁字面量</gametxt><action>伪行动</action><JSONPatch>' });
  const patched = `${publicText}<UpdateVariable><Analysis>说明</Analysis><JSONPatch>${json}</JSONPatch></UpdateVariable>`;
  assert.equal(api.parse(patched).novelText, '公开正文'); assert.equal(api.parse(patched).variables, json);
  assert.deepEqual(plain(normalizer.extractLegacyActions('<thinking>1. 假选项\n2. 假选项</thinking>')), []);
  assert.deepEqual(plain(normalizer.extractLegacyActions('<gametxt>1. 查看现场\n2. 联系值夜者</gametxt>')), ['查看现场', '联系值夜者']);
  assert.deepEqual(plain(normalizer.actionsForFloor({ role: 'assistant', message: '<thinking><action>假</action></thinking>',
    data: { cryptLord: { actions: ['旧记录'] } } })), []);
  assert.deepEqual(plain(normalizer.actionsForFloor({ role: 'assistant', message: publicText,
    data: { cryptLord: { actions: ['过期记录'] } } })), ['调查', '询问']);
  assert.deepEqual(plain(normalizer.actionsForFloor({ role: 'assistant', is_hidden: true, message: publicText })), []);
  const nodes = { 'thinking-overlay': { style: {} }, 'thinking-content': { textContent: '' },
    'thinking-tab-narrative': { classList: { toggle() {} } }, 'thinking-tab-variable': { classList: { toggle() {} } } };
  const tabs = vm.runInNewContext(`({${methods(['showThinkingOverlay', '_renderThinkingTab'])}})`,
    { document: { getElementById: name => nodes[name] } });
  for (const preferred of ['narrative', 'variable']) for (const [narrative, variable] of [['主', '副'], ['', '副'], ['主', '']]) {
    Object.assign(tabs, { thinkingActiveTab: preferred, lastExtractedThinkingNarrative: narrative, lastExtractedThinkingVariable: variable });
    tabs.showThinkingOverlay();
    assert.equal(api.chooseTab({ narrative, variable }, preferred), tabs.thinkingActiveTab);
  }
  const before = JSON.stringify(state.floors), loaded = await api.load();
  assert.equal(loaded.messageId, 2); assert.equal(loaded.userText, '调查'); assert.equal(state.writes.length, 0);
  assert.equal(JSON.stringify(state.floors), before);
  assert.equal((await api.load(0)).messageId, 0);
  await assert.rejects(api.load(1), /不存在/);
  let reads = 0;
  state.hook = () => { if (++reads === 2) state.floors[2].swipe_id++; };
  await assert.rejects(api.load(2), /已变化/);
  state.hook = () => { emit(); state.hook = null; };
  await assert.rejects(api.load(2), { name: 'AbortError' });
  state.hook = null; state.readFail = true; await assert.rejects(api.load(2), /读取失败/);
  const branches = fixture();
  branches.state.pages[2] = { swipes: [text, '未选分支'], swipes_data: [branches.state.floors[2].data, { keep: 1 }],
    swipes_info: [{}, { provider: '保留' }] };
  let readsPage = 0;
  branches.state.hook = () => { if (++readsPage === 4) branches.state.pages[2].swipes_info[1].provider = '外部变化'; };
  await assert.rejects(branches.api.load(2), /已变化/);
  const hiddenFloor = fixture(); hiddenFloor.state.floors[2].is_hidden = true;
  await assert.rejects(hiddenFloor.api.load(), /不存在/); await assert.rejects(hiddenFloor.api.load(2), /不存在/);
  assert.equal((await hiddenFloor.api.load(0)).messageId, 0);
  api.dispose(); await assert.rejects(api.load(2), { name: 'AbortError' });
});
test('完整正文与变量重算链：同一次目标楼层写入、来源指纹、不继承旧思维链和取消保护', async () => {
  const { api, state, modules } = fixture(), protected0 = structuredClone(state.floors[0]);
  const bridge = modules['cryptLord.nativeFloorBridge'], raw = text, transaction = {
    userMessageId: 1, assistantMessageId: 2, userText: '调查', narrativeText: '正文', floorText: raw, guard: () => true,
  };
  await bridge.completeNarrative(raw, transaction);
  assert.deepEqual(state.writes, [2]); assert.deepEqual(state.floors[0], protected0);
  const floor = state.floors[2], projected = await api.project(floor);
  assert.equal(projected.thinking.narrative, '正文推演'); assert.equal(projected.thinking.variable, '变量核对');
  assert.equal(projected.thinking.legacy, false);
  assert.ok(floor.message.includes('<thinking>正文推演</thinking>'));
  assert.equal(floor.message.includes('变量核对'), false);
  assert.equal(floor.data.otherPlugin.keep, true);
  const edited = structuredClone(floor); edited.message += '编辑';
  const stale = await api.project(edited);
  assert.ok(stale.warning.some(value => value.includes('不一致')));
  assert.notEqual(stale.thinking.variable, '变量核对');
  const inherited = structuredClone(floor); inherited.message_id = 4;
  assert.notEqual((await api.project(inherited)).thinking.variable, '变量核对');
  const native = await api.project({ role: 'assistant', message_id: 8, message: '正文', extra: { reasoning: '原生提供商推演' } });
  assert.equal(native.thinking.narrative, '原生提供商推演');
  state.floors[0].data.cryptLord = { responseInspection: structuredClone(floor.data.cryptLord.responseInspection) };
  state.response = ''; await bridge.completeNarrative(raw, transaction);
  assert.equal((await api.project(state.floors[2])).thinking.variable, '');
  const workbench = modules['cryptLord.variableWorkbenchState'], baseline = await workbench.load(2);
  const response = `<thinking>重新核对变量</thinking>${patch(18)}`;
  await workbench.commit(baseline, baseline.floor.data, () => true, response);
  const retry = await api.project(state.floors[2]);
  assert.equal(retry.thinking.variable, '重新核对变量'); assert.equal(retry.variableSource, 'variable-retry');
  assert.equal(retry.thinking.narrative, '正文推演');
  let active = false;
  await assert.rejects(api.captureVariable({ messageId: 2, message: raw, guard: () => active }), { name: 'AbortError' });
  const count = state.writes.length;
  await assert.rejects(bridge.completeNarrative(raw, { ...transaction, guard: () => active }), { name: 'AbortError' });
  assert.equal(state.writes.length, count);
  const replacement = fixture();
  replacement.runtime.crypto = { subtle: { async digest(...args) {
    replacement.modules['cryptLord.hostApi'] = { ...replacement.modules['cryptLord.hostApi'] };
    return webcrypto.subtle.digest(...args);
  } } };
  await assert.rejects(replacement.api.captureVariable({ messageId: 2, message: raw }), { name: 'AbortError' });
  active = true;
  const old = modules['cryptLord.responseInspector'];
  modules['cryptLord.responseInspector'] = { captureVariable: async () => { throw Error('显示记录不可用'); } };
  await bridge.completeNarrative(raw, transaction);
  assert.equal(state.floors[2].data.cryptLord.responseInspection, undefined);
  modules['cryptLord.responseInspector'] = old;
  const inheritedThoughts = state.floors[0].data.cryptLord;
  delete modules['cryptLord.responseInspector']; await bridge.completeNarrative(raw, transaction);
  assert.equal(state.floors[2].data.cryptLord.responseInspection, undefined);
  assert.ok(inheritedThoughts.responseInspection);
});
