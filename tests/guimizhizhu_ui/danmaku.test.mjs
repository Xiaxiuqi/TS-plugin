import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const paths = ['core/native-floor-source.js', 'core/response-normalizer.js', 'core/danmaku.js', 'core/danmaku-engine.js'];
const sources = await Promise.all(paths.map(path => read(`public/guimizhizhu_ui/${path}`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
const optimizer = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/33b-js-performance-optimizer.txt');
const shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
const loader = await read('public/guimizhizhu_ui/loader.js');
const plain = value => JSON.parse(JSON.stringify(value));
function method(name) {
  const offset = original.search(new RegExp(`^${name}\\([^\\n]*\\)\\s*\\{`, 'm'));
  assert.notEqual(offset, -1);
  const tree = ts.createSourceFile('oracle.js', `({${original.slice(offset)}})`, 99, true, ts.ScriptKind.JS);
  let found;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) found = node.getText(tree);
    if (!found) ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(found); return vm.runInNewContext(`({${found}})`);
}
function fixture() {
  const state = { primary: '1源堡', writes: 0, hook: null, failed: false, readFailed: false, postFailed: false,
    lostResponse: false, discard: false, chat: 'a', readHook: null };
  const floors = [{ message_id: 0, role: 'assistant', message: '<dm>原生弹幕</dm>', data: {} }];
  const listeners = new Map(), surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => state.chat } } };
  const names = ['【系统】弹幕风格', '【系统】弹幕框架', '【系统】弹幕触发', '【系统】格式要求-弹幕', '【系统】格式要求'];
  const entries = names.map((name, uid) => ({ uid, name, content: `原文${uid}`, enabled: uid === 4,
    strategy: { type: 'selective', keys: [/test/gi] }, position: { type: 'at_depth', depth: 3 }, extra: { keep: uid } }));
  entries.push({ uid: 10, name: '其他条目', enabled: true, content: '保留' });
  const host = {
    getCharWorldbookNames: () => ({ primary: state.primary, additional: [] }),
    async getWorldbook() {
      if (state.readFailed) throw Error('读取失败');
      const result = structuredClone(entries); await state.readHook?.(); return result;
    },
    getChatMessages(_, options) { return structuredClone(options?.include_swipes ? floors.map(row =>
      ({ ...row, swipe_id: 0, swipes: [row.message, '旧页'], swipes_data: [row.data, {}], swipes_info: [{}, {}] })) : floors); },
    async updateWorldbookWith(book, updater) {
      assert.equal(book, '1源堡'); await state.hook?.();
      const next = await updater(structuredClone(entries));
      if (state.failed) throw Error('保存失败');
      if (!state.discard) { entries.splice(0, entries.length, ...next); state.writes++; }
      if (state.postFailed) state.readFailed = true;
      if (state.lostResponse) throw Error('响应丢失');
      return structuredClone(entries);
    },
  };
  const modules = { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': {
    getHost: () => surface,
    tavernEvents: () => Object.fromEntries(['CHAT_CHANGED', 'GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED'].map(name => [name, name])),
    bindEvent(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn);
      return { stop() { listeners.get(name).delete(fn); } }; },
  } };
  const runtime = { console, structuredClone, DOMException, cryptLord: { __stage1Modules: modules,
    contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { return modules[key]; } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, entries, modules, surface, floors, emit: (name, ...args) => listeners.get(name)?.forEach(fn => fn(...args)),
    api: modules['cryptLord.danmaku'], engineApi: modules['cryptLord.danmakuEngine'] };
}
function dom(width = 1280) {
  let now = 0, serial = 0;
  const frames = new Map(), nodes = [];
  const window = { innerWidth: width, innerHeight: 1100, performance: { now: () => now }, addEventListener() {},
    requestAnimationFrame(fn) { const id = ++serial; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); } };
  function pill() {
    const item = { style: {}, className: '', textContent: '', offsetWidth: 180, parentNode: null,
      classList: { add(...values) { item.className += ` ${values.join(' ')}`; } },
      removeAttribute() { item.style = {}; }, remove() { const i = nodes.indexOf(item); if (i >= 0) nodes.splice(i, 1); item.parentNode = null; } };
    return item;
  }
  const document = { defaultView: window, createElement: pill, getElementById: () => layer };
  const layer = { ownerDocument: document, clientWidth: width, offsetWidth: width, clientHeight: 1100,
    hidden: true, style: {}, append(item) { nodes.push(item); item.parentNode = layer; },
    appendChild(item) { layer.append(item); }, removeChild(item) { item.remove(); }, replaceChildren() { nodes.splice(0); } };
  return { window, document, layer, frames, nodes, setNow(value) { now = value; },
    step(value) { now = value; const next = [...frames.values()]; frames.clear(); next.forEach(fn => fn(value)); } };
}
test('原版弹幕提取、主题与调度独立对照：安全文本、限流、暂停、对象池和回收', () => {
  const { api, modules, engineApi } = fixture(), parser = method('_extractAllTags');
  for (const text of [null, '', '<dm> </dm>', '<DM title="x">雨夜\n调查</DM><dm>重复</dm><dm>重复</dm>',
    '<gametxt>正文</gametxt><dm><img src=x onerror=alert(1)>只是文本</dm><dm>未完成']) {
    assert.deepEqual(plain(api.extract(text)), plain(parser._extractAllTags('dm', text)));
  }
  const projected = api.project([{ role: 'user', message_id: 1, message: '<dm>不应出现</dm>' },
    { role: 'assistant', message_id: 3, message: '<dm>完整</dm><dm>未完成', swipe_id: 2 }]);
  assert.equal(projected.length, 1); assert.equal(projected[0].swipeId, 2);
  assert.deepEqual(plain(api.extract('<analysis><dm>隐藏</dm></analysis><dm>可见</dm><safe><dm>隐藏2</dm></safe>')), ['可见']);
  assert.deepEqual(plain(api.extract('<UpdateVariable>[{"value":"</UpdateVariable><dm>补丁伪造</dm>"}]</UpdateVariable><dm>真实</dm>')), ['真实']);
  assert.deepEqual(plain(api.extract('<thinking>未闭合<dm>不显示</dm>')), []);
  assert.equal(api.project([{ role: 'assistant', message_id: 0, is_hidden: true, message: '<dm>隐藏楼层</dm>' }]).length, 0);
  const raw = '正文<dm>弹幕</dm><action>调查</action>';
  const normalized = modules['cryptLord.responseNormalizer'].normalize(raw);
  assert.equal(normalized.message, '正文'); assert.equal(normalized.raw, raw);
  const rendering = method('renderDanmaku'), expectedThemes = [];
  const context = { window: { PerformanceOptimizer: { danmakuOptimizer: {
    clearAll() {}, addDanmaku(text, options) { expectedThemes.push(options.className.replace('dm-theme-', '')); },
  } } }, console: { log() {}, warn() {} }, Math: Object.create(Math) };
  let index = 0; context.Math.random = () => (index++ + .1) / 16;
  vm.runInNewContext(`(${rendering.renderDanmaku.toString().replace(/^renderDanmaku/, 'function')})`
    + '.call({lastExtractedDanmaku:Array.from({length:16},()=> "text")})', context);
  assert.deepEqual(plain(engineApi.themes), expectedThemes);
  const tree = ts.createSourceFile('original-engine.js', optimizer, 99, true, ts.ScriptKind.JS);
  let classSource, configSource;
  function visit(node) {
    if (ts.isClassDeclaration(node) && node.name?.text === 'DanmakuOptimizer') classSource = node.getText(tree);
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'PerformanceConfig') {
      configSource = node.initializer.properties.find(property => property.name.getText(tree) === 'danmaku').initializer.getText(tree);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(classSource); assert.ok(configSource);
  const danmakuConfig = vm.runInNewContext(`(${configSource})`);
  for (const width of [1280, 390]) {
    const env = dom(width), silent = { log() {} }, math = Object.create(Math); math.random = () => .5;
    env.window.PerformanceOptimizer = { isMobile: width <= 768, config: { danmaku: danmakuConfig } };
    const Original = vm.runInNewContext(`(${classSource})`, { window: env.window, document: env.document, console: silent, Math: math });
    const reference = new Original(), engine = engineApi.create(env.layer, { random: () => .5 });
    assert.equal(engine.maxDanmaku, reference.maxDanmaku); assert.equal(engine.baseDuration, reference.baseDuration);
    assert.equal(engine.laneCount, reference.laneCount); assert.equal(engine.minLaunchInterval, reference.minLaunchInterval);
    assert.equal(engine.maxLaunchInterval, reference.maxLaunchInterval);
    engine.play(Array.from({ length: 50 }, (_, n) => `弹幕${n}`));
    env.step(0); assert.equal(engine.activeDanmaku.length, 1); assert.equal(engine.activeDanmaku[0].duration, reference.baseDuration);
    assert.equal(engine.nextLaunchTime, 1400); env.step(500); assert.equal(engine.activeDanmaku.length, 1);
    assert.ok(engine.activeDanmaku[0].element.style.transform.includes('-'));
    engine.pause(); assert.equal(env.frames.size, 0);
    env.setNow(10500); engine.resume(); assert.equal(engine.activeDanmaku[0].startTime, 10000);
    env.step(11400); assert.equal(engine.activeDanmaku.length, 2);
    const last = { startTime: 0, duration: engine.baseDuration, width: 180 };
    reference.containerWidth = width; reference.lanes = new Array(reference.laneCount).fill(last);
    engine.lanes = new Array(engine.laneCount).fill(last);
    for (const time of [0, 100, engine.baseDuration * .9])
      assert.equal(engine.getBestLane(engine.baseDuration, 180, time), reference._getBestLane(engine.baseDuration, 180, time));
    engine.stop(); assert.equal(env.nodes.length, 0); assert.equal(env.frames.size, 0);
    assert.equal(engine.pendingQueue.length, 0); assert.ok(engine.domPool.every(node => !node.textContent));
    engine.play(['静态弹幕'], true); assert.equal(env.frames.size, 0); assert.equal(env.nodes[0].textContent, '静态弹幕');
    engine.dispose(); assert.equal(env.nodes.length, 0); assert.equal(engine.domPool.length, 0);
  }
});
test('世界书模式完整事务：五条联动、只改启用、冲突与绑定校验、失败和关闭保护', async () => {
  for (const key of ['core/danmaku.js', 'core/danmaku-engine.js', 'modules/danmaku/index.js', 'modules/danmaku/style.css'])
    assert.ok(loader.includes(`'${key}'`));
  assert.match(shell, /id: 'danmaku', label: '楼层弹幕'/);
  const tree = ts.createSourceFile('shell.js', shell, 99, true, ts.ScriptKind.JS);
  let route;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'showFeature') route = node.getText(tree);
    if (!route) ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(route);
  const opens = [], stateRoute = { chatToken: 1, current: { message_id: 7 }, disposed: false };
  let release;
  const context = vm.createContext({ state: stateRoute, notify() { assert.fail('unexpected notification'); },
    contract: { waitGlobalInitialized(key) {
      assert.equal(key, 'cryptLord.danmakuUi');
      return new Promise(resolve => { release = () => resolve({ open(id) { opens.push(id); } }); });
    } } });
  const show = vm.runInContext(`(${route})`, context);
  show({ id: 'danmaku' }); release(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(opens, [7]);
  show({ id: 'danmaku' }); stateRoute.chatToken++; release(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(opens, [7]);
  const { api, state, entries } = fixture();
  const before = structuredClone(entries); let snapshot = await api.readMode();
  assert.equal(snapshot.mode, 'off'); assert.equal(state.writes, 0);
  const saved = await api.setMode(true, snapshot.revision); assert.equal(saved.mode, 'on'); assert.equal(state.writes, 1);
  for (let i = 0; i < entries.length; i++)
    assert.deepEqual({ ...entries[i], enabled: before[i].enabled }, before[i]);
  await api.setMode(true, saved.revision); assert.equal(state.writes, 1);
  const disabled = await api.setMode(false, saved.revision); assert.equal(disabled.mode, 'off');
  entries[0].enabled = true; snapshot = await api.readMode(); assert.equal(snapshot.mode, 'mixed');
  const first = api.setMode(true, snapshot.revision), second = api.setMode(false, snapshot.revision);
  await first; await assert.rejects(second, /别处修改/);
  snapshot = await api.readMode(); entries[0].position.depth = 8;
  await assert.rejects(api.setMode(false, snapshot.revision), /别处修改/);
  snapshot = await api.readMode();
  state.hook = () => { entries[0].strategy.keys = [/changed/m]; };
  await assert.rejects(api.setMode(false, snapshot.revision), /条目已变化/);
  state.hook = null; snapshot = await api.readMode();
  state.hook = () => { state.primary = '其他角色'; };
  await assert.rejects(api.setMode(false, snapshot.revision), /未挂载/);
  state.primary = '1源堡'; state.hook = null; snapshot = await api.readMode();
  let active = true; state.hook = () => { active = false; };
  await assert.rejects(api.setMode(false, snapshot.revision, () => active), { name: 'AbortError' });
  state.hook = null; state.failed = true;
  await assert.rejects(api.setMode(false, snapshot.revision), /保存失败/);
  assert.equal((await api.readMode()).mode, 'on'); state.failed = false;
  state.postFailed = true;
  const committed = await api.setMode(false, snapshot.revision);
  assert.equal(committed.revision, null); assert.equal(committed.mode, null); assert.match(committed.warning, /无法确认/);
  state.postFailed = false; state.readFailed = false; snapshot = await api.readMode();
  const duplicate = structuredClone(entries[0]); duplicate.uid = 99; entries.push(duplicate);
  await assert.rejects(api.readMode(), /重名/); entries.pop();
  const missing = entries.splice(0, 1)[0]; await assert.rejects(api.readMode(), /缺失/); entries.unshift(missing);
  state.hook = () => api.dispose();
  await assert.rejects(api.setMode(true, snapshot.revision), { name: 'AbortError' });
  assert.equal(entries[0].enabled, false);
  const f = fixture();
  let current = await f.api.readMode();
  await assert.rejects(f.api.setMode(true, structuredClone(current.revision)), /凭据/);
  current.revision.entries = 'forged';
  await assert.rejects(f.api.setMode(true, current.revision), /凭据/);
  current = await f.api.readMode(); f.state.lostResponse = true;
  const recovered = await f.api.setMode(true, current.revision);
  assert.match(recovered.warning, /已确认/); assert.equal(f.state.writes, 1);
  f.state.lostResponse = false; f.state.discard = true; current = await f.api.readMode();
  const unknown = await f.api.setMode(false, current.revision);
  assert.equal(unknown.mode, null); assert.equal(unknown.revision, null);
  f.state.discard = false; current = await f.api.readMode();
  for (const args of [['quiet'], ['quiet_prompt'], ['normal', { dryRun: true }], ['normal', {}, true]]) f.emit('GENERATION_STARTED', ...args);
  assert.equal((await f.api.setMode(true, current.revision)).unchanged, true);
  f.emit('GENERATION_STARTED', 'normal'); await assert.rejects(f.api.readMode(), { name: 'AbortError' });
  f.emit('GENERATION_STOPPED');
  await assert.rejects(f.api.setMode(false, current.revision), { name: 'AbortError' });
  current = await f.api.readMode(); f.emit('CHAT_CHANGED');
  await assert.rejects(f.api.setMode(false, current.revision), { name: 'AbortError' });
  current = await f.api.readMode(); f.surface.document = {};
  await assert.rejects(f.api.setMode(false, current.revision), { name: 'AbortError' });
  f.state.readHook = () => { f.state.readHook = null; f.entries[0].content += ' changed'; };
  await assert.rejects(f.api.readMode(), /条目已变化/);
  assert.equal((await f.api.readFloors()).length, 1);
  f.floors[0].is_hidden = true; assert.equal((await f.api.readFloors()).length, 0);
});
