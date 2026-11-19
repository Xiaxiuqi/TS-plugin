import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = await readFile(path.join(base, 'public/guimizhizhu_ui/core/worldbook-toggle-profiles.js'), 'utf8');
const BOOK = '【源堡】玩家自建内容';
const books = new Map([
  [BOOK, [{ uid: 1, name: '[世界书开关方案]', content: JSON.stringify({
    profiles: [{ id: 'old', name: '旧方案', entries: [
      { book: '主书', name: '入口', enabled: false },
      { book: '副书', name: '神秘', enabled: true },
      { book: '未挂载', name: '保留', enabled: true },
      { book: '主书', name: '不存在', enabled: true },
      { book: '主书', name: '重名', enabled: true },
    ] }],
  }), enabled: false }]],
  ['主书', [
    { uid: 2, name: '入口', enabled: true, content: '保留内容', strategy: { type: 'selective' } },
    { uid: 3, name: '其他', enabled: true },
    { uid: 4, name: '重名', enabled: false },
    { uid: 5, name: '重名', enabled: false },
  ]],
  ['副书', [{ uid: 6, name: '神秘', enabled: false }]],
]);
const clone = value => structuredClone(value);
const identity = { chat: 'toggle-chat', script: 'toggle-script' };
let surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => identity.chat } } };
const host = {
  attempts: [], creates: 0,
  scriptVariableOptions: () => ({ type: 'script', script_id: identity.script }),
  async getWorldbook(name) {
    await host.readHook?.(name);
    if (host.readFail) throw Error('读回失败');
    if (!books.has(name)) throw new Error('未能找到世界书');
    return clone(books.get(name));
  },
  async createWorldbook(name) {
    host.creates++;
    if (!host.noCreate) books.set(name, []);
    if (host.failReadAfterCreate) host.readFail = true;
    if (host.lostCreate) throw Error('创建回执丢失');
  },
  async createWorldbookEntries(name, entries) { books.get(name).push(...entries.map((entry, index) => ({ ...entry, uid: 100 + index }))); },
  async updateWorldbookWith(name, updater) {
    host.attempts.push(name);
    if (name === host.failBook) throw new Error('写入失败');
    await host.hook?.(name);
    host.inUpdater = true;
    let next;
    try { next = await updater(clone(books.get(name))); } finally { host.inUpdater = false; }
    if (!host.noWrite) books.set(name, clone(next).map((entry, index) => ({ ...entry, uid: entry.uid ?? 100 + index })));
    host.afterWrite?.(name);
    if (host.failReadAfterWrite === name) host.readFail = true;
    if (host.lostResponse) throw Error('响应丢失');
  },
  async getWorldbookNames() { return [...books.keys(), '未挂载']; },
  async getGlobalWorldbookNames() { return host.unbound ? [] : ['主书']; },
  async getCharWorldbookNames() { return { primary: '副书', additional: [] }; },
  async getChatWorldbookName() { return null; },
};
const registered = new Map();
const handlers = new Map();
const events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' };
const emit = (name, ...args) => { for (const fn of handlers.get(events[name]) || []) fn(...args); };
const context = {
  console, structuredClone, DOMException, cryptLord: {
    __stage1Modules: { 'cryptLord.hostApi': host, 'cryptLord.afterNativeHost': {
      getHost: () => surface,
      tavernEvents: () => events,
      bindEvent(name, fn) {
        if (!handlers.has(name)) handlers.set(name, new Set());
        handlers.get(name).add(fn);
        return { stop() { handlers.get(name)?.delete(fn); } };
      },
    } },
    contract: {
      initializeGlobal(key, api) { registered.set(key, api); },
      releaseGlobal(key) { registered.delete(key); },
      async waitGlobalInitialized(key) { assert.equal(key, 'cryptLord.hostApi'); return host; },
    },
  },
};
context.window = context;
vm.runInNewContext(script, context);
const api = registered.get('cryptLord.worldbookToggleProfiles');
assert.ok(api);
const original = await readFile(path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt'), 'utf8');
const members = [];
for (const name of ['_newToggleProfileId', 'buildDefaultToggleProfile', 'normalizeToggleProfiles']) {
  const tree = ts.createSourceFile('reference.js', `({${original.slice(original.search(new RegExp(`^\\s*${name}\\(`, 'm')))}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const normalized = member.replace(/,$/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '');
  assert.ok(script.includes(normalized));
  members.push(normalized);
}
const reference = vm.runInNewContext(`({${members.join(',')}})`);
const sample = { activeId: 'b', profiles: [
  { id: 'a', name: ' 甲 ', note: '保留', updatedAt: '时间', entries: [
    { book: ' 主书 ', comment: '入口', enabled: false }, { book: '主书', name: '入口', enabled: true }, { book: '', name: '丢弃' }] },
  { id: 'b', name: '', updatedAt: '时间', entries: [] },
] };
assert.equal(JSON.stringify(api.normalize(sample)), JSON.stringify(reference.normalizeToggleProfiles(sample)));
const malformed = api.normalize({ profiles: [{ id: 'same' }, { id: 'same' }, []] });
assert.equal(new Set(malformed.profiles.map(item => item.id)).size, 2);
assert.equal(api.defaultProfile().name, reference.buildDefaultToggleProfile().name);
console.log('worldbook profiles: exact original normalization and ID safety passed');
const { data, revision } = await api.load();
assert.equal(data.version, 1);
assert.equal(data.activeId, 'old');
assert.equal(data.profiles[0].entries.length, 5);
const profile = data.profiles[0];
const validation = await api.validate(profile);
assert.equal(validation.found.length, 2);
assert.equal(validation.missing.length, 2);
assert.equal(validation.unbound.length, 1);
const applied = await api.apply(profile);
assert.equal(applied.changed, 2);
assert.equal(books.get('主书')[0].enabled, false);
assert.equal(books.get('主书')[0].content, '保留内容');
assert.equal(books.get('主书')[1].enabled, true);
assert.equal(books.get('副书')[0].enabled, true);
assert.equal(books.get('主书')[2].enabled, false);
assert.equal((await api.apply(profile)).skipped, 2);
const saved = await api.save(data, revision);
assert.match(saved.revision.content, /"activeId": "old"/);
const afterSaved = host.attempts.length;
await api.save(data, revision);
assert.equal(host.attempts.length, afterSaved);
host.failBook = '副书';
books.get('主书')[0].enabled = true;
books.get('副书')[0].enabled = false;
await assert.rejects(api.apply(profile), error => {
  assert.equal(error.partial.changed, 1);
  assert.equal(error.partial.book, '副书');
  return true;
});
host.failBook = null;
let fresh = await api.load();
const storeRow = books.get(BOOK)[0];
storeRow.uid = 99;
await assert.rejects(api.save(fresh.data, fresh.revision), /别处更改/);
storeRow.uid = 1;
fresh = await api.load(); fresh.data.profiles[0].note = '重复目标保护';
host.hook = book => {
  if (book === BOOK) books.get(book).push({ uid: 222, comment: '[世界书开关方案]', content: '{}' });
};
await assert.rejects(api.save(fresh.data, fresh.revision), /重名|已变化/);
books.get(BOOK).pop();
fresh = await api.load(); fresh.data.profiles[0].note = '目标并发保护';
host.hook = book => { if (book === BOOK) books.get(book)[0].content += ' '; };
await assert.rejects(api.save(fresh.data, fresh.revision), /已变化/);
host.hook = null;
fresh = await api.load();
let allowed = false;
await assert.rejects(api.save(fresh.data, fresh.revision, { guard() { if (!allowed) throw Error('已关闭'); } }), /已关闭/);
const before = clone(books.get('主书'));
const preview = await api.validate(profile);
books.get('主书')[0].enabled = !books.get('主书')[0].enabled;
await assert.rejects(api.apply(profile, { validation: preview }), /重新确认/);
books.set('主书', before);
const contentPreview = await api.validate(profile);
books.get('主书')[0].content = '外部新正文';
await assert.rejects(api.apply(profile, { validation: contentPreview }), /重新确认/);
books.set('主书', clone(before));
const metadataPreview = await api.validate(profile);
books.get('主书')[0].strategy = { type: 'constant' };
await assert.rejects(api.apply(profile, { validation: metadataPreview }), /重新确认/);
books.set('主书', clone(before));
await assert.rejects(api.apply(profile, { validation: clone(await api.validate(profile)) }), /重新确认/);
host.hook = book => { if (book === '主书') host.unbound = true; };
books.get('主书')[0].enabled = true;
await assert.rejects(api.apply(profile), /解除挂载/);
host.hook = null;
host.unbound = false;
assert.equal(books.get('主书')[0].enabled, true);
books.set('主书', clone(before));
assert.deepEqual(books.get('主书'), before);
books.get('主书')[0].comment = '旧入口名';
await assert.rejects(api.validate({ entries: [
  { book: '主书', name: '入口', enabled: false }, { book: '主书', name: '旧入口名', enabled: true },
] }), /同一条目/);
delete books.get('主书')[0].comment;
const oldStore = clone(books.get(BOOK));
books.set(BOOK, []);
fresh = await api.load();
assert.equal(fresh.revision.uid, null);
host.hook = book => { if (book === BOOK) books.get(book).push({ uid: 300, name: '[世界书开关方案]', content: '外部新建' }); };
await assert.rejects(api.save(fresh.data, fresh.revision), /已变化/);
assert.equal(books.get(BOOK)[0].content, '外部新建');
host.hook = null;
books.set(BOOK, []);
fresh = await api.load();
const created = await api.save(fresh.data, fresh.revision);
assert.equal(created.revision.uid, 100);
assert.equal(books.get(BOOK)[0].enabled, false);
assert.deepEqual(books.get(BOOK)[0].strategy.keys, ['[世界书开关方案]']);
books.set(BOOK, clone(oldStore));
books.get(BOOK)[0].content = 'not JSON';
await assert.rejects(api.load(), /JSON/);
books.get(BOOK)[0].content = '{"profiles":{}}';
await assert.rejects(api.load(), /结构无效/);
books.delete(BOOK);
fresh = await api.load();
assert.equal(fresh.revision.exists, false);
await api.save(fresh.data, fresh.revision);
assert.equal(books.get(BOOK)[0].enabled, false);
books.set(BOOK, clone(oldStore));
fresh = await api.load();
host.lostResponse = true;
fresh.data.profiles[0].note = '响应丢失但已保存';
const lost = await api.save(fresh.data, fresh.revision);
assert.match(lost.warning, /未返回成功响应/);
assert.ok(lost.revision);
books.get('主书')[0].enabled = true;
const lostApply = await api.apply({ entries: [{ book: '主书', name: '入口', enabled: false }] });
assert.equal(lostApply.changed, 1);
assert.match(lostApply.warnings[0], /未返回成功响应/);
host.lostResponse = false;
fresh = await api.load();
host.hook = () => emit('GENERATION_STARTED', 'normal');
fresh.data.profiles[0].note = '生成中取消保存';
await assert.rejects(api.save(fresh.data, fresh.revision), /已取消/);
emit('GENERATION_ENDED');
host.hook = null;
await assert.rejects(api.save(fresh.data, fresh.revision, { guard: () => false }), /已取消/);
const epoch = api.status().epoch;
emit('GENERATION_STARTED', 'quiet');
emit('GENERATION_STARTED', 'quiet_prompt');
emit('GENERATION_STARTED', 'normal', { options: { quiet_prompt: true } });
emit('GENERATION_STARTED', 'normal', { options: { dryRun: true } });
emit('GENERATION_STARTED', 'normal', { dryRun: true });
emit('GENERATION_STOPPED');
assert.equal(api.status().epoch, epoch);
fresh = await api.load();
await api.save(fresh.data, fresh.revision);
const stable = clone([...books]);
const reset = () => {
  books.clear(); stable.forEach(([name, entries]) => books.set(name, clone(entries)));
  for (const key of ['readFail', 'noWrite', 'failReadAfterWrite', 'afterWrite', 'readHook', 'lostResponse',
    'hook', 'failBook', 'noCreate', 'failReadAfterCreate', 'lostCreate']) delete host[key];
  host.unbound = false;
};
for (const kind of ['persisted', 'unwritten']) {
  reset(); fresh = await api.load(); fresh.data.profiles[0].note = `固定结果-${kind}`;
  const operation = api.beginSave(fresh.data, fresh.revision);
  host.noWrite = kind === 'unwritten'; host.failReadAfterWrite = BOOK;
  const attempts = host.attempts.length;
  await assert.rejects(operation.save(), /待核对/);
  assert.equal(operation.status().phase, 'uncertain');
  await assert.rejects(operation.inspect(), /读回失败/);
  await assert.rejects(operation.save(), /先核对/);
  assert.equal(host.attempts.length, attempts + 1);
  host.readFail = false; host.noWrite = false; host.failReadAfterWrite = null;
  if (kind === 'unwritten') {
    await assert.rejects(operation.inspect(), /未写入/);
    assert.equal(operation.status().phase, 'pending');
    await operation.save(); assert.equal(host.attempts.length, attempts + 2);
  } else {
    const result = await operation.inspect();
    assert.equal(operation.status().phase, 'saved');
    result.data.profiles[0].note = '公开结果篡改';
    assert.equal((await operation.save()).data.profiles[0].note, `固定结果-${kind}`);
    assert.equal(host.attempts.length, attempts + 1);
  }
  const resumed = await operation.save();
  resumed.data.profiles[0].note = '确认后继续编辑';
  await api.save(resumed.data, resumed.revision);
  await assert.rejects(api.save(resumed.data, clone(resumed.revision)), /凭据/);
}
for (const kind of ['write-failure', 'uncertain', 'unwritten', 'metadata']) {
  reset(); books.get('主书')[0].enabled = true; books.get('副书')[0].enabled = false;
  const checked = await api.validate(profile), operation = api.beginApply(profile, { validation: checked });
  const attempts = host.attempts.length;
  if (kind === 'write-failure') host.failBook = '副书';
  else if (kind === 'metadata') host.afterWrite = book => {
    if (book === '副书') books.get('主书')[1].foreign = new Date(19);
  };
  else {
    host.afterWrite = book => {
      if (book === '主书') { host.failReadAfterWrite = '副书'; host.noWrite = kind === 'unwritten'; }
    };
  }
  await assert.rejects(operation.save(), /写入失败|待核对|变化/);
  assert.equal(operation.status().changed, 1);
  const stopped = host.attempts.length;
  assert.equal(stopped, attempts + 2);
  if (kind === 'metadata') {
    assert.equal(operation.status().phase, 'conflict');
    await assert.rejects(operation.save(), /先核对/);
    assert.equal(host.attempts.length, stopped);
    continue;
  }
  if (kind !== 'write-failure') {
    await assert.rejects(operation.inspect(), /读回失败/);
    await assert.rejects(operation.save(), /先核对/);
  }
  host.readFail = false; host.failBook = null; host.noWrite = false; host.afterWrite = null; host.failReadAfterWrite = null;
  if (kind === 'uncertain') {
    const result = await operation.inspect(); assert.equal(result.changed, 2);
    assert.equal(host.attempts.length, stopped);
  } else {
    if (kind === 'unwritten') await assert.rejects(operation.inspect(), /未写入/);
    assert.equal((await operation.save()).changed, 2);
    assert.equal(host.attempts.length, stopped + 1);
    assert.equal(host.attempts.slice(attempts).filter(name => name === '主书').length, 1);
  }
  await operation.save(); assert.equal(operation.status().phase, 'saved');
}
reset();
fresh = await api.load(); fresh.data.profiles[0].note = '最终异步保护';
const asyncGuard = api.beginSave(fresh.data, fresh.revision), beforeAsync = host.attempts.length;
host.readHook = name => {
  if (host.inUpdater && name === BOOK) books.get(BOOK)[0].foreign = /外部/g;
};
await assert.rejects(asyncGuard.save(), /变化/);
assert.equal(host.attempts.length, beforeAsync + 1);
assert.equal(books.get(BOOK)[0].content, stable.find(([name]) => name === BOOK)[1][0].content);
for (const boundary of ['chat', 'script', 'surface', 'service', 'date']) {
  reset(); fresh = await api.load(); fresh.data.profiles[0].note = '旧身份不得提交';
  const operation = api.beginSave(fresh.data, fresh.revision), before = host.attempts.length;
  const oldSurface = surface, oldService = context.cryptLord.__stage1Modules['cryptLord.hostApi'];
  if (boundary === 'chat') identity.chat += '-next';
  if (boundary === 'script') identity.script += '-next';
  if (boundary === 'surface') surface = { ...surface, document: {} };
  if (boundary === 'service') context.cryptLord.__stage1Modules['cryptLord.hostApi'] = { ...host };
  if (boundary === 'date') books.get(BOOK)[0].foreign = new Date(23);
  await assert.rejects(operation.save(), /变化|更改/);
  assert.equal(host.attempts.length, before);
  surface = oldSurface; context.cryptLord.__stage1Modules['cryptLord.hostApi'] = oldService;
}
reset(); books.delete(BOOK); fresh = await api.load();
const creating = api.beginSave(fresh.data, fresh.revision), creates = host.creates;
host.failReadAfterCreate = true;
await assert.rejects(creating.save(), /创建.*待核对/);
await assert.rejects(creating.save(), /先核对/);
host.readFail = false; host.failReadAfterCreate = false;
assert.equal((await creating.inspect()).pending, true);
assert.equal(host.creates, creates + 1);
await creating.save(); assert.equal(host.creates, creates + 1);
reset(); books.get('主书')[0].enabled = true; books.get('副书')[0].enabled = false;
const firstStep = api.beginApply(profile, { validation: await api.validate(profile) });
host.failReadAfterWrite = '主书';
const firstAttempts = host.attempts.length;
await assert.rejects(firstStep.save(), /待核对/);
assert.equal(host.attempts.length, firstAttempts + 1);
host.failReadAfterWrite = null; host.readFail = false;
assert.equal((await firstStep.inspect()).pending, true);
assert.equal(firstStep.status().phase, 'pending');
assert.equal(host.attempts.length, firstAttempts + 1);
assert.equal(books.get('副书')[0].enabled, false);
assert.equal((await firstStep.save()).changed, 2);
assert.equal(host.attempts.length, firstAttempts + 2);
reset(); books.delete(BOOK); fresh = await api.load();
const noCreation = api.beginSave(fresh.data, fresh.revision), beforeCreate = host.creates;
host.noCreate = host.failReadAfterCreate = true;
await assert.rejects(noCreation.save(), /待核对/);
host.readFail = host.failReadAfterCreate = host.noCreate = false;
assert.equal((await noCreation.inspect()).pending, true);
await noCreation.save();
assert.equal(host.creates, beforeCreate + 2);
reset(); fresh = await api.load(); fresh.data.profiles[0].note = '互斥操作';
const exclusive = api.beginSave(fresh.data, fresh.revision);
let release, entered;
const waiting = new Promise(resolve => { entered = resolve; });
host.hook = async () => { entered(); await new Promise(resolve => { release = resolve; }); };
const firstSave = exclusive.save(); await waiting;
await assert.rejects(exclusive.save(), /正在进行/);
await assert.rejects(exclusive.inspect(), /正在进行/);
host.hook = null; release(); await firstSave;
reset();
api.dispose();
await assert.rejects(api.load(), /已卸载/);
assert.equal(registered.size, 0);
console.log('worldbook profiles: storage revision, guarded apply and lifecycle passed');
