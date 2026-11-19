import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../public/guimizhizhu_ui/core/custom-content.js', import.meta.url), 'utf8');
const raw = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt', import.meta.url), 'utf8');
const tree = ts.createSourceFile('original.js', `({${raw.slice(raw.indexOf('async writeCustomContentToLorebook('))}\n})`, 99, true, ts.ScriptKind.JS);
let original;
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === 'writeCustomContentToLorebook') original = node.getText(tree).replace(/,$/, '');
  ts.forEachChild(node, visit);
}
visit(tree);
const BOOK = '【源堡】玩家自建内容';
const locked = { name: '固定', prompt: '固定提示', preset: { targetBook: '1源堡', entryName: '旧条目' }, locked: true };
const plain = value => JSON.parse(JSON.stringify(value));
const write = async (api, input) => api.write({ ...input, source: input.source || await api.entriesFor(input.book) });
function setup() {
  const books = new Map([
    [BOOK, [{ uid: 1, name: '[自建提示词]', content: JSON.stringify([locked]), enabled: false }]],
    ['1源堡', [{ uid: 2, name: '旧条目', content: '旧正文', enabled: false, strategy: { type: 'constant' }, extra: { untouched: true } }]],
  ]);
  let nextUid = 10;
  const settings = { useCustomApi: false };
  const state = { writes: 0, generations: 0, beforeCommit: null, failRead: false, failAfter: false };
  const listeners = new Map(), document = {};
  const after = {
    getHost: () => ({ document }),
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return { stop() { listeners.get(name).delete(fn); } };
    },
  };
  const emit = (name, ...args) => { for (const fn of listeners.get(name) || []) fn(...args); };
  const host = {
    getCharWorldbookNames() { return { primary: state.primary || '1源堡', additional: state.additional || [] }; },
    async getWorldbook(name) {
      if (state.failRead) throw Error('模拟读取失败');
      if (!books.has(name)) throw Error('世界书不存在');
      return structuredClone(books.get(name));
    },
    async getWorldbookNames() { return [...books.keys()]; },
    async createWorldbook(name) { if (books.has(name)) throw Error('世界书已存在'); books.set(name, []); },
    async updateWorldbookWith(name, updater) {
      await state.beforeCommit?.();
      const result = await updater(structuredClone(books.get(name)));
      if (state.failCommit) throw Error('模拟提交失败');
      books.set(name, structuredClone(result).map(entry => ({ ...entry, uid: entry.uid ?? nextUid++ })));
      state.writes++;
      state.afterCommit?.(books.get(name));
      if (state.failAfter) state.failRead = true;
      if (state.lost) throw Error('提交响应丢失');
    },
    async generateRaw(config) {
      state.generated = structuredClone(config);
      state.generations++;
      await state.generateWait?.();
      return state.response ?? { content: '生成的内容' };
    },
  };
  const registered = new Map();
  const settlement = { async readSettings() { await state.settingsWait?.(); return structuredClone(settings); } };
  const ctx = {
    console, structuredClone, DOMException, cryptLord: {
      __stage1Modules: { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': after, 'cryptLord.variableSettlementApi': settlement },
      contract: {
        initializeGlobal(key, api) { registered.set(key, api); },
        releaseGlobal(key) { registered.delete(key); },
        async waitGlobalInitialized(key) {
          if (key === 'cryptLord.variableSettlementApi') return settlement;
          return host;
        },
      },
    },
  };
  ctx.window = ctx;
  vm.runInNewContext(source, ctx);
  return { api: registered.get('cryptLord.customContent'), books, host, state, settings, registered, ctx, emit, listeners, after };
}
async function originalPlan(entries, content, name, mode, config) {
  let payload;
  const bridge = {
    async getLorebookEntries() { return structuredClone(entries); },
    async setLorebookEntries(_book, value) { payload = value[0]; },
  };
  const obj = vm.runInNewContext(`({
    showTemporaryMessage() {}, closeAllModals() {},
    ${original}
  })`, {
    console, TavernHelper: bridge, getWorldbookNames: () => ['1源堡'],
    createWorldbookEntries: async (_book, value) => { payload = value[0]; },
    WorldbookManager: { _cache: { lastFetchTime: 0 } },
  });
  await obj.writeCustomContentToLorebook(content, '1源堡', name, !entries.length, mode, config);
  return plain(payload);
}
test('完整链路：原版写入规则、预设锁定与系统 API', async () => {
  const { api, books, state, settings } = setup();
  const loaded = await api.loadPresets();
  assert.deepEqual(plain(loaded.presets), [locked]);
  await assert.rejects(api.savePresets([], loaded.revision), /已锁定/);
  const presets = [...loaded.presets, { name: '新增', prompt: '提示词' }];
  const saved = await api.savePresets(presets, loaded.revision);
  assert.equal(saved.presets.length, 2);
  await assert.rejects(api.savePresets(presets, loaded.revision), /别处改变/);
  assert.equal(await api.generate(' 提示词 '), '生成的内容');
  assert.deepEqual(state.generated, { ordered_prompts: [{ role: 'user', content: '提示词' }], should_stream: false });
  Object.assign(settings, { useCustomApi: true, apiUrl: 'http://test.invalid/v1', apiKey: 'fixture', model: 'fixture-model' });
  await api.generate('副模型提示');
  assert.deepEqual(state.generated.custom_api, { apiurl: settings.apiUrl, key: 'fixture', model: 'fixture-model', source: 'openai' });
  assert.equal(state.generated.ordered_prompts.length, 1);
  const count = state.generations;
  settings.model = '';
  await assert.rejects(api.generate('配置错误'), /URL 和模型名/);
  assert.equal(state.generations, count);
  const config = api.configOf({
    enabled: false, strategy: { type: 'selective', keys: [] },
    position: { type: 'at_depth', depth: 3, order: 120 },
    recursion: { prevent_incoming: false },
  }, '新条目');
  const content = '\n  保留玩家编辑的换行\n第二行\n';
  const other = { uid: 99, name: '其他插件条目', content: '原内容', extra: { preserve: true } };
  books.get('1源堡').push(structuredClone(other));
  const planned = await originalPlan(books.get('1源堡'), content, '新条目', 'append', config);
  const created = await write(api, { book: '1源堡', name: '新条目', content, expectedEntry: null, expectedUid: null, config });
  const actual = plain(created.entry); delete actual.uid;
  assert.deepEqual(actual, planned);
  for (const mode of ['append', 'overwrite']) {
    const before = structuredClone(books.get('1源堡')[0]);
    const expected = await originalPlan([before], content, '旧条目', mode, config);
    await write(api, { book: '1源堡', name: '旧条目', content, mode, expectedEntry: before, expectedUid: before.uid, config });
    assert.deepEqual(plain(books.get('1源堡')[0]), { ...before, content: expected.content });
  }
  assert.equal(books.get('1源堡')[0].extra.untouched, true);
  assert.deepEqual(books.get('1源堡').find(entry => entry.uid === 99), other);
  books.get(BOOK)[0].content = '[/*原版注释*/{"name":"兼容","prompt":"http://example.invalid\\n正文",},]';
  assert.equal((await api.loadPresets()).presets[0].prompt, 'http://example.invalid\n正文');
});
test('保护链路：外部变更、原位创建、失败保留与关闭卸载', async () => {
  let f = setup();
  const originalEntry = structuredClone(f.books.get('1源堡')[0]);
  f.books.get('1源堡')[0].content = '其他窗口编辑';
  await assert.rejects(write(f.api, { book: '1源堡', name: '旧条目', content: '误覆盖', expectedEntry: originalEntry }), /已变化/);
  assert.equal(f.state.writes, 0);
  f.state.beforeCommit = () => { f.books.get('1源堡').push({ uid: 8, comment: '新条目', content: '竞态内容' }); };
  await assert.rejects(write(f.api, { book: '1源堡', name: '新条目', content: '误写', expectedEntry: null }), /已变化/);
  assert.equal(f.state.writes, 0);
  f = setup();
  f.books.get('1源堡').push({ uid: 2, name: '其他插件', content: '不能修改' });
  await assert.rejects(write(f.api, { book: '1源堡', name: '旧条目', content: '误写', expectedEntry: originalEntry }), /UID 不唯一/);
  f = setup();
  const loaded = await f.api.loadPresets();
  f.books.get(BOOK)[0].uid = 7;
  await assert.rejects(f.api.savePresets(loaded.presets, loaded.revision), /别处改变/);
  f.books.get(BOOK)[0].content = '{}';
  await assert.rejects(f.api.loadPresets(), /JSON 数组/);
  f.books.get(BOOK)[0].content = '坏 JSON';
  await assert.rejects(f.api.loadPresets(), /有效 JSON/);
  f = setup();
  f.books.delete(BOOK);
  const empty = await f.api.loadPresets();
  await f.api.savePresets([{ name: '第一条', prompt: '内容' }], empty.revision);
  assert.equal(f.books.get(BOOK).length, 1);
  assert.equal(f.books.get(BOOK)[0].enabled, false);
  f = setup();
  f.state.afterCommit = rows => { rows.at(-1).position.depth = 9; };
  const changedCreation = await write(f.api, { book: '1源堡', name: '新条目', content: '正文', expectedEntry: null,
    config: { position: { type: 'at_depth', depth: 3 } } });
  assert.equal(changedCreation.entry, null);
  assert.match(changedCreation.warning, /复核失败/);
  f = setup();
  f.books.delete(BOOK);
  const missing = await f.api.loadPresets();
  f.state.afterCommit = rows => { rows.at(-1).enabled = true; };
  const changedPreset = await f.api.savePresets([{ name: '第一条', prompt: '内容' }], missing.revision);
  assert.equal(changedPreset.revision, null);
  assert.match(changedPreset.warning, /复核失败/);
  f = setup();
  f.state.failCommit = true;
  await assert.rejects(write(f.api, { book: '1源堡', name: '新条目', content: '草稿', expectedEntry: null }), /提交失败/);
  assert.equal(f.books.get('1源堡').length, 1);
  f.state.failCommit = false;
  f.state.failAfter = true;
  const committed = await write(f.api, { book: '1源堡', name: '新条目', content: '草稿', expectedEntry: null });
  assert.match(committed.warning, /已提交.*复核失败/);
  assert.equal(f.state.writes, 1);
  f = setup();
  let valid = true;
  f.state.beforeCommit = () => { valid = false; };
  await assert.rejects(write(f.api, {
    book: '1源堡', name: '新条目', content: '草稿', expectedEntry: null,
    guard() { if (!valid) throw Error('窗口已关闭'); },
  }), /窗口已关闭/);
  assert.equal(f.state.writes, 0);
  f = setup();
  const source = await f.api.entriesFor('1源堡');
  await assert.rejects(f.api.write({ book: '1源堡', name: '新条目', content: '草稿', source: structuredClone(source), expectedEntry: null }), /凭据/);
  f.state.additional = ['更改绑定'];
  await assert.rejects(f.api.write({ book: '1源堡', name: '新条目', content: '草稿', source, expectedEntry: null }), /绑定已变化/);
  f.state.additional = [];
  const generation = await f.api.loadPresets();
  f.emit('start', 'quiet'); f.emit('start', 'normal', {}, true);
  await f.api.savePresets([...generation.presets, { name: '新', prompt: '文' }], generation.revision);
  const outdated = await f.api.loadPresets();
  f.emit('start', 'normal');
  await assert.rejects(f.api.generate('文'), /取消/);
  f.emit('stop');
  await assert.rejects(f.api.savePresets(outdated.presets, outdated.revision), /取消/);
  f = setup();
  f.state.lost = true;
  const recovered = await write(f.api, { book: '1源堡', name: '新条目', content: '只追加一次', expectedEntry: null });
  assert.match(recovered.warning, /未返回成功响应/);
  const presetBase = await f.api.loadPresets();
  const recoveredPreset = await f.api.savePresets([...presetBase.presets, { name: '新', prompt: '文' }], presetBase.revision);
  assert.match(recoveredPreset.warning, /已保存/);
  f.state.lost = false;
  let releaseSettings;
  f.state.settingsWait = () => new Promise(resolve => { releaseSettings = resolve; });
  const waiting = f.api.generate('不要迟到请求');
  while (!releaseSettings) await new Promise(resolve => setTimeout(resolve, 0));
  f.emit('chat'); releaseSettings();
  await assert.rejects(waiting, /取消/);
  assert.equal(f.state.generations, 0);
  f = setup();
  let release;
  f.state.generateWait = () => new Promise(resolve => { release = resolve; });
  const pending = f.api.generate('生成');
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  f.api.dispose();
  release();
  await assert.rejects(pending, /已卸载/);
  await assert.rejects(f.api.books(), /已卸载/);
  assert.equal(f.registered.size, 0);
});
