import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const sources = await Promise.all(['core/native-floor-source.js', 'core/ability-state.js', 'core/appearance.js'].map(path => read(`public/guimizhizhu_ui/${path}`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
const KEY = 'cryptLord.appearance', plain = value => JSON.parse(JSON.stringify(value));
function oracle(name) {
  const offset = original.search(new RegExp(`^${name}\\([^\\n]*\\)\\s*\\{`, 'm'));
  assert.notEqual(offset, -1);
  const tree = ts.createSourceFile('original.js', `({${original.slice(offset)}})`, 99, true, ts.ScriptKind.JS);
  let method;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) method = node.getText(tree);
    if (!method) ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(method); return vm.runInNewContext(`({${method}})`);
}
function fixture() {
  const state = { variables: { otherPlugin: { keep: true } }, scriptId: 'appearance-test', writes: 0,
    hook: null, failed: false, readFail: false, postFail: false, lostResponse: false, discard: false,
    bookHook: null, additional: [], primary: '1源堡', chat: 'a' };
  const floors = [{ message_id: 0, role: 'assistant', message: '原生正文', data: { keep: true } }];
  const pages = new Map(), listeners = new Map(), surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => state.chat } } };
  const books = {
    '2历史孔隙': [{ name: '【配置】字体配置', content: '{"font-test":{"name":"备用","css":"serif"}}' }],
    '1源堡': [
      { name: '【配置】字体配置', content: '{// 来源主库\n"font-test":{"name":"正本","css":"sans-serif","isArt":false},}' },
      { name: '【配置】背景图库', content: '["https://example.test/one.png","https://example.test/two.png",]' },
    ],
  };
  const protectedBooks = JSON.stringify(books);
  const host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: state.scriptId }),
    async getVariables(options) {
      assert.equal(options.type, 'script'); assert.equal(options.script_id, state.scriptId);
      if (state.readFail) throw Error('读取失败'); return structuredClone(state.variables);
    },
    async updateVariablesWith(updater, options) {
      await state.hook?.();
      assert.equal(options.type, 'script');
      const next = await updater(structuredClone(state.variables));
      if (state.failed) throw Error('保存失败');
      if (!state.discard) { state.variables = next; state.writes++; }
      if (state.postFail) state.readFail = true;
      if (state.lostResponse) throw Error('响应丢失');
    },
    async getCharWorldbookNames() { return { primary: state.primary, additional: state.additional }; },
    async getWorldbook(name) { const result = structuredClone(books[name] || []); await state.bookHook?.(name); return result; },
    getChatMessages(_, options) { return structuredClone(options?.include_swipes ? floors.map(row =>
      pages.get(row.message_id) || { ...row, swipe_id: 0, swipes: [row.message, '旧分支'],
        swipes_data: [row.data, {}], swipes_info: [{}, { keep: true }] }) : floors); },
  };
  const modules = { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': {
    getHost: () => surface, tavernEvents: () => ({ CHAT_CHANGED: 'chat' }),
    bindEvent(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn);
      return { stop() { listeners.get(name).delete(fn); } }; },
  } };
  const runtime = { console, URL, structuredClone, DOMException, cryptLord: { __stage1Modules: modules,
    contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { return modules[key]; } } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, books, modules, floors, pages, surface, emit: name => listeners.get(name)?.forEach(fn => fn()),
    api: modules[KEY], untouched: () => JSON.stringify(books) === protectedBooks };
}
test('原版外观默认值、缩放和随机规则独立对照，图库与字体只读及安全边界', async () => {
  const { api, books, state, untouched } = fixture(), reference = oracle('clampMainUiScale');
  for (const input of [undefined, null, '', 59, 61, 72, 77, 100, 123, '65', 'broken', Infinity])
    assert.equal(api.clampMainUiScale(input), reference.clampMainUiScale(input));
  const initial = await api.readSnapshot();
  assert.equal(initial.settings.fontSize, 14); assert.equal(initial.settings.opacity, .5);
  assert.equal(initial.settings.blur, 3); assert.equal(initial.settings.interval, 10);
  assert.equal(initial.settings.width, 900); assert.equal(initial.settings.height, 600);
  assert.equal(initial.settings.mobileScale, 75); assert.equal(state.writes, 0);
  const catalog = await api.loadCatalog(); assert.equal(catalog.fonts['font-test'].name, '正本');
  assert.equal(catalog.backgrounds.length, 2); assert.equal(state.writes, 0); assert.equal(untouched(), true);
  const pool = catalog.backgrounds;
  assert.equal(api.randomBackground([], ''), null);
  assert.equal(api.randomBackground(pool, pool[0].id, () => .75).id, pool[1].id);
  let draws = 0;
  assert.equal(api.randomBackground(pool, pool[0].id, () => { draws++; return 0; }).id, pool[0].id); assert.equal(draws, 5);
  const data = 'data:image/png;base64,AQID';
  const settings = api.normalizeSettings({ customBackgrounds: [{ id: 'bg_1', name: '<img>', data }], background: 'bg_1' });
  assert.equal(api.backgroundPool(settings, catalog).length, 3);
  const removed = api.deleteBackground(settings, 'bg_1'); assert.equal(removed.background, 'default');
  assert.equal(removed.customBackgrounds.length, 0);
  assert.throws(() => api.deleteBackground(settings, pool[0].id), /只能删除/);
  for (const value of ['javascript:alert(1)', 'file:///private.png', 'https://user:pass@example.test/a'])
    assert.throws(() => api.imageUrl(value));
  assert.throws(() => api.imageUrl('data:image/svg+xml;base64,AQID', true), /位图/);
  for (const bad of [{ fontSize: 41 }, { opacity: 1.1 }, { blur: -1 }, { interval: 0 }, { width: 799 },
    { height: 599 }, { font: 'a;b' }, { theme: 'foreign' }, { autoRandom: 'true' }, { opacity: '' }])
    assert.throws(() => api.normalizeSettings(bad));
  books['1源堡'][0].content = '{"bad":{"css":"serif; color:red"},"safe":{"name":"<img src=x>","css":"serif","customCSS":"body{display:none}"}}';
  const safe = await api.loadCatalog(); assert.equal(safe.fonts.bad, undefined);
  assert.equal(safe.fonts.safe.name, '<img src=x>'); assert.ok(safe.warnings.length);
  books['1源堡'][1].content = 'damaged'; assert.ok((await api.loadCatalog()).warnings.some(text => text.includes('背景图库')));
  books.extra = [{ name: '【配置】字体配置', content: '{"font-test":{"css":"serif","name":"附加库"}}' }];
  state.additional = ['1源堡', 'extra'];
  books['1源堡'][0].content = '{"font-test":{"css":"sans-serif","name":"主库"}}';
  assert.equal((await api.loadCatalog()).fonts['font-test'].name, '主库');
  state.bookHook = name => { if (name === '1源堡') { state.bookHook = null; books[name][0].content += ' '; } };
  await assert.rejects(api.loadCatalog(), /已变化/);
  const f = fixture();
  assert.equal((await f.api.readFloors()).length, 1);
  f.floors[0].is_hidden = true; assert.equal((await f.api.readFloors()).length, 0);
  f.floors[0].is_hidden = false;
  f.pages.set(0, { ...f.floors[0], swipe_id: 0, swipes: ['不同正文'], swipes_data: [{}], swipes_info: [{}] });
  await assert.rejects(f.api.readFloors(), /分支已变化/);
});
test('完整脚本配置事务：冲突、串行快照、失败重试、显式恢复、关闭及卸载保护', async () => {
  const { api, state, untouched } = fixture();
  let loaded = await api.readSnapshot();
  state.variables[KEY] = { ...loaded.settings, futureOption: { keep: true } };
  loaded = await api.readSnapshot();
  const draft = { ...loaded.settings, fontSize: 20 };
  const task = api.saveSettings(draft, loaded.revision); draft.fontSize = 40;
  const saved = await task; assert.equal(saved.settings.fontSize, 20);
  assert.equal(state.variables.otherPlugin.keep, true); assert.equal(state.variables[KEY].futureOption.keep, true);
  assert.equal(untouched(), true);
  await assert.rejects(api.saveSettings({ ...saved.settings, fontSize: 18 }, loaded.revision), /修改/);
  state.failed = true;
  await assert.rejects(api.saveSettings({ ...saved.settings, fontSize: 19 }, saved.revision), /保存失败/);
  assert.equal(state.variables[KEY].fontSize, 20); state.failed = false;
  let active = true;
  state.hook = () => { active = false; };
  await assert.rejects(api.saveSettings({ ...saved.settings, fontSize: 19 }, saved.revision, () => active), { name: 'AbortError' });
  state.hook = () => { state.variables[KEY].fontSize = 21; };
  await assert.rejects(api.saveSettings({ ...saved.settings, fontSize: 19 }, saved.revision), /变化/);
  state.hook = null; loaded = await api.readSnapshot();
  state.hook = () => { state.scriptId = 'different'; };
  await assert.rejects(api.saveSettings({ ...loaded.settings, fontSize: 22 }, loaded.revision), /身份/);
  state.hook = null; loaded = await api.readSnapshot();
  const first = api.saveSettings({ ...loaded.settings, fontSize: 22 }, loaded.revision);
  const second = api.saveSettings({ ...loaded.settings, fontSize: 23 }, loaded.revision);
  await first; await assert.rejects(second, /修改/);
  state.variables[KEY] = 'damaged';
  await assert.rejects(api.readSnapshot(), /损坏/);
  const repair = await api.readSnapshot(undefined, true); assert.ok(repair.warning);
  await api.saveSettings(api.defaults(), repair.revision); assert.equal(state.variables[KEY].fontSize, 14);
  loaded = await api.readSnapshot(); state.postFail = true;
  const committed = await api.saveSettings({ ...loaded.settings, fontSize: 24 }, loaded.revision);
  assert.equal(committed.revision, null); assert.equal(committed.settings, null);
  assert.match(committed.warning, /无法确认/); assert.equal(state.variables[KEY].fontSize, 24);
  state.readFail = false; state.postFail = false; loaded = await api.readSnapshot();
  state.hook = () => api.dispose();
  await assert.rejects(api.saveSettings({ ...loaded.settings, fontSize: 25 }, loaded.revision), { name: 'AbortError' });
  assert.equal(state.variables[KEY].fontSize, 24); assert.equal(untouched(), true);
  const f = fixture(), fresh = await f.api.readSnapshot();
  await assert.rejects(f.api.saveSettings(fresh.settings, structuredClone(fresh.revision)), /凭据/);
  fresh.revision.raw = { forged: true };
  await assert.rejects(f.api.saveSettings(fresh.settings, fresh.revision), /凭据/);
  let current = await f.api.readSnapshot();
  f.state.lostResponse = true;
  const recovered = await f.api.saveSettings({ ...current.settings, fontSize: 21 }, current.revision);
  assert.match(recovered.warning, /已确认/); assert.equal(f.state.writes, 1);
  f.state.lostResponse = false;
  const unchanged = await f.api.saveSettings(recovered.settings, recovered.revision);
  assert.equal(unchanged.unchanged, true); assert.equal(f.state.writes, 1);
  current = await f.api.readSnapshot(); f.state.discard = true;
  const unknown = await f.api.saveSettings({ ...current.settings, fontSize: 22 }, current.revision);
  assert.equal(unknown.settings, null); assert.equal(unknown.revision, null);
  await assert.rejects(f.api.saveSettings(current.settings, current.revision), /凭据/);
  f.state.discard = false; current = await f.api.readSnapshot();
  f.emit('chat');
  await assert.rejects(f.api.saveSettings(current.settings, current.revision), { name: 'AbortError' });
  current = await f.api.readSnapshot(); f.surface.document = {};
  await assert.rejects(f.api.saveSettings(current.settings, current.revision), { name: 'AbortError' });
  current = await f.api.readSnapshot();
  f.modules['cryptLord.hostApi'] = { ...f.modules['cryptLord.hostApi'] };
  await assert.rejects(f.api.saveSettings(current.settings, current.revision), { name: 'AbortError' });
});
