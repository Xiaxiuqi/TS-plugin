import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = await read('public/guimizhizhu_ui/core/journey-reader.js');
const dependencies = await Promise.all(['response-normalizer', 'native-floor-source'].map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35a-js-init-storage-crossfire.txt');
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const modules = {}, calls = [], flags = { nativeFail: false, booksFail: false, readHook: null, bookHook: null, binding: {primary:'角色书',additional:[]} }, books = new Map();
  const event = (serial, title) => `序号|${serial}\n日期|第五纪1349年9月1日\n时间|12:00\n标题|${title}\n地点|银湾港\n人物|艾琳\n描述|第一行\n第二行|保留竖线\n标签|调查|港口\n重要信息|港口线索`;
  const floors = [
    { message_id: 0, role: 'assistant', message: `<本周目经历>${event(1, '抵达港口')}</本周目经历>`, data: {} },
    { message_id: 1, role: 'user', message: `<本周目经历>${event(99, '不能读用户')}</本周目经历>` },
    { message_id: 2, role: 'assistant', message: `正文<本周目经历>${event(2, '废弃重复块')}</本周目经历>\n<本周目经历>${event(2, '港口调查')}\n\n${event(3, '发现线索')}</本周目经历>` },
    { message_id: 3, role: 'system', message: `<本周目经历>${event(99, '系统')}</本周目经历>` },
    { message_id: 4, role: 'assistant', message: '没有经历正文', data: { meta: { journey_full_text: event(99, '旧快照不得读') } } },
    { message_id: 6, role: 'assistant', message: `<本周目经历>${event(4, '未来事件')}</本周目经历>` },
  ];
  floors.forEach(row => { row.data ||= {}; });
  const before = structuredClone(floors), surface = { window: {}, document: {} }, handlers = new Map();
  const host = {
    async getChatMessages(range, options) {
      calls.push(range); if (flags.nativeFail) throw Error('楼层失败');
      await flags.readHook?.(options);
      return structuredClone(options?.include_swipes ? floors.map(row => ({
        message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: 1,
        swipes: ['备用页', row.message], swipes_data: [{}, row.data], swipes_info: [{}, {}],
      })) : floors);
    },
    getCharWorldbookNames: () => structuredClone(flags.binding),
    async getWorldbook(name) { if (flags.booksFail) throw Error('世界书失败'); await flags.bookHook?.(name); return structuredClone(books.get(name) || []); },
    setChatMessages() { throw Error('禁止写楼层'); }, replaceWorldbook() { throw Error('禁止写世界书'); },
    getVariables() { throw Error('禁止读取私有状态'); },
  };
  const context = { console, structuredClone, DOMException, cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
  } } };
  context.window = context; modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => surface,
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, fn) { const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set); return { stop: () => set.delete(fn) }; },
  };
  Object.defineProperty(context, 'AppStorage', { get() { throw Error('禁止读取历史缓存'); } });
  vm.createContext(context); dependencies.forEach(code => vm.runInContext(code, context)); vm.runInContext(source, context);
  return { api: modules['cryptLord.journeyReader'], modules, floors, before, books, flags, event, surface,
    emit: (name, ...args) => handlers.get(name)?.forEach(fn => fn(...args)) };
}
test('完整原版解析/字段别名与多行、排序筛选和无截断分页', () => {
  const f = fixture();
  const tree = ts.createSourceFile('original.js', original.slice(original.indexOf('const ChronicleCore =')), 99, true, ts.ScriptKind.JS);
  const object = tree.statements[0].declarationList.declarations[0].initializer;
  const names = ['DICT', 'parseTextToEvents', 'stringifyEventToText'];
  const body = names.map(name => object.properties.find(item => item.name?.getText(tree) === name).getText(tree)).join(',');
  const oracle = vm.runInNewContext(`({${body}})`, { console });
  for (const text of ['', '格式损坏', f.event(3, '<script>不执行</script>'),
    `${f.event(1,'开场')}\n人物关系|信任\n暗线与伏笔|下一步\n\n${f.event(2,'继续')}`,
    '序号|无效\n标题|无标题', '序号|第5条\n标题|特殊序号', '序号|8\n大纲|新标题\n详细描述|a\n自动化系统|原版续行\nb']) {
    assert.deepEqual(plain(f.api.parse(text)), plain(oracle.parseTextToEvents(text)));
    for (const event of f.api.parse(text)) assert.equal(f.api.stringify(event), oracle.stringifyEventToText(event));
  }
  assert.equal(f.api.parse(f.event(1, '多行'))[0].详细描述, '第一行\n第二行|保留竖线');
  assert.equal(f.api.extract('<本周目经历 属性="支持">序号|1</本周目经历>'), '序号|1');
  assert.equal(f.api.extract('<本周目经历>序号|1'), '');
  assert.equal(f.api.extract(`<分析><本周目经历>${f.event(9,'隐藏示例')}</本周目经历></分析>`),'');
  assert.equal(f.api.extract(`<JSONPatch>[{"value":"</JSONPatch><本周目经历>${f.event(9,'字面标签')}</本周目经历>"}]</JSONPatch>`),'');
  const records = Array.from({ length: 95 }, (_, i) => ({ id: String(i), event: { 序号: String(i + 1) }, text: `事件${i+1}`,
    tags: i % 2 ? ['调查'] : ['旅行'], source: { label: '原生楼层 #0' } }));
  const sorted = f.api.filter(records);
  assert.equal(sorted[0].event.序号, '95');
  assert.equal(f.api.filter(records, { order: 'oldest' })[0].event.序号, '1');
  assert.equal(f.api.filter(records, { tag: '调查', minimum: '2', maximum: '4' }).length, 2);
  assert.equal(f.api.filter(records, { query: '事件95' }).length, 1);
  assert.equal(f.api.filter(records, { query: '楼层 #0' }).length, 95);
  assert.equal(f.api.filter(records, { minimum: 'abc' }).length, 0);
  assert.equal(f.api.filter(records, { minimum: 5, maximum: 1 }).length, 0);
  assert.equal(f.api.page(sorted, 0).rows.length, 40);
  assert.equal(f.api.page(sorted, 2).rows.length, 15);
  assert.equal(f.api.page(sorted, 999).index, 2);
  assert.deepEqual([0,1,2].flatMap(index => plain(f.api.page(sorted,index).rows)), plain(sorted));
});
test('真实楼层截止、世界书周目隔离与失败恢复；注册及壳入口不碰存档', async () => {
  const f = fixture();
  f.books.set('2历史孔隙', [{ name: '本周目经历', content: f.event(1, '旧库记录') }]);
  f.books.set('角色书', [{ name: '本周目经历(2)', content: f.event(1, '另一周目') },
    { name: '本周目核心记忆', content: f.event(999,'不得读取') }]);
  f.books.set('1源堡', [{ uid: 1, name: '本周目经历', content: f.event(1, '源堡记录') },
    { uid: 2, name: '本周目经历(3)', content: '坏格式' }]);
  const result = await f.api.load(4);
  assert.equal(result.native.records.length, 3);
  assert.deepEqual(plain(result.native.records.map(row => row.event.大纲)), ['抵达港口','港口调查','发现线索']);
  assert.equal(result.native.messageId, 4);
  assert.equal(result.books.length, 3);
  assert.equal(result.books[0].book, '1源堡');
  assert.equal(result.books[0].records[0].event.大纲, '源堡记录');
  assert.equal(result.books[1].records[0].event.大纲, '另一周目');
  assert.equal(result.books[2].invalid.length, 1);
  assert.equal((await f.api.load()).native.records.length, 4);
  f.flags.booksFail = true;
  const partial = await f.api.load(4);
  assert.match(partial.booksError, /世界书失败/);
  assert.equal(partial.books.length, 0);
  assert.equal(partial.native.records.length, 3);
  f.flags.booksFail = false; f.flags.nativeFail = true;
  assert.equal((await f.api.load(4)).books.length, 3);
  f.flags.nativeFail = false;
  assert.match((await f.api.load(1)).nativeError, /不存在/);
  f.floors[2].message = `<本周目经历>${f.event(2,'切页后正文')}</本周目经历>`;
  assert.equal((await f.api.load(4)).native.records[1].event.大纲, '切页后正文');
  f.floors.at(-1).is_hidden=true;
  assert.match((await f.api.load()).nativeError,/隐藏/);
  assert.equal((await f.api.load(4)).native.records.length,2);
  f.floors.at(-1).is_hidden=false;
  let reads=0;
  f.flags.readHook=options=>{if(options?.include_swipes&&++reads===2)f.floors[2].data.changed=true};
  assert.match((await f.api.load(4)).nativeError,/变化/);f.flags.readHook=null;
  f.flags.bookHook=name=>{if(name==='1源堡')f.flags.binding.additional=['突然绑定']};
  assert.match((await f.api.load(4)).booksError,/绑定/);f.flags.bookHook=null;
  await assert.rejects(f.api.load(4,()=>false),/取消/);
  const lastUser = fixture();
  lastUser.floors.push({ message_id: 7, role: 'user', message: '待回复', data: {} });
  assert.match((await lastUser.api.load()).nativeError, /末楼/);
  assert.equal((await lastUser.api.load(6)).native.messageId, 6);
  const changing = fixture();
  changing.flags.bookHook = () => { changing.modules['cryptLord.responseNormalizer'] = { ...changing.modules['cryptLord.responseNormalizer'] }; };
  await assert.rejects(changing.api.load(4), /取消/);
  const malformed = fixture(); malformed.flags.binding.additional = '错误的书名列表';
  const malformedResult = await malformed.api.load(4);
  assert.match(malformedResult.booksError, /绑定格式/); assert.ok(malformedResult.native);
  const lifecycle = fixture();
  for (const args of [['quiet_prompt'], ['normal', { options: { quiet_prompt: true } }], ['normal', { options: { dryRun: true } }]]) {
    lifecycle.emit('start', ...args); assert.ok((await lifecycle.api.load(4)).native);
  }
  let started = false;
  lifecycle.flags.readHook = () => { if (!started) { started = true; lifecycle.emit('start', 'normal'); } };
  await assert.rejects(lifecycle.api.load(4), /取消|生成中/);
  await assert.rejects(lifecycle.api.load(4), /生成中/);
  lifecycle.flags.readHook = null; lifecycle.emit('stop');
  assert.ok((await lifecycle.api.load(4)).native);
  assert.deepEqual(f.floors[0], f.before[0]);
  const loader = await read('public/guimizhizhu_ui/loader.js');
  const shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
  assert.match(loader, /core\/journey-reader\.js/); assert.match(loader, /modules\/journey-reader\/index\.js/);
  assert.match(loader, /modules\/journey-reader\/style\.css/);
  assert.match(shell, /feature\.id === 'journey'.*waitGlobalInitialized\(JOURNEY_READER_KEY/);
  const ui = await read('public/guimizhizhu_ui/modules/journey-reader/index.js');
  assert.doesNotMatch(source + ui, /chatHistoryCache|historyViewIndex|AppStorage|setChatMessages|writeAssistant|replaceWorldbook|injectPrompts|generateRaw/);
});
