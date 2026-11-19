import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const files = await Promise.all(['native-floor-source','state-store','industry-state','domain-defaults','domain-state','faction-state','native-settlement','generation-bridge']
  .map(async name => [name, await read(`public/guimizhizhu_ui/core/${name}.js`)]));
const sources = Object.fromEntries(files);
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34c-js-war-sim-and-strategies.txt');
const originalDB = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const modules = {}, books = new Map();
  const flags = { fail: false, writes: [], saveFail: false, floors: [], pages: {}, script: 'faction-script',
    chat: 'faction-chat', bound: { primary: '本地', additional: [] }, bookHook: null };
  const handlers = new Map(), surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => flags.chat } } };
  const context = { console: { warn() {}, info() {}, error() {} }, structuredClone, DOMException, dispatchEvent() {},
    cryptLord: { __stage1Modules: modules, contract: {
      initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal(key) { delete modules[key]; },
      async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
    } } };
  context.window = context;
  modules['cryptLord.afterNativeHost'] = { getHost: () => surface, tavernEvents: () => ({CHAT_CHANGED: 'chat'}),
    bindEvent(name, fn) {
      const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set);
      return { stop: () => set.delete(fn) };
    } };
  modules['cryptLord.hostApi'] = {
    scriptVariableOptions: () => ({type: 'script', script_id: flags.script}),
    getCharWorldbookNames: () => structuredClone(flags.bound),
    async getWorldbook(name) {
      if (flags.fail) throw Error('读取失败');
      const rows = structuredClone(books.get(name) || []);
      flags.bookHook?.(name);
      return rows;
    },
    async getChatMessages(range, options) {
      const rows = structuredClone(range === '0-{{lastMessageId}}' ? flags.floors :
        range === '{{lastMessageId}}' ? flags.floors.slice(-1) :
          flags.floors.filter(row => row.message_id === Number(range)));
      return options?.include_swipes ? rows.map(({message, data, ...row}) => ({...row, swipe_id: row.swipe_id ?? 1,
        swipes: ['备用页', message], swipes_data: [{other: true}, data],
        swipes_info: [{date: new Date('2026-10-28')}, {}], ...structuredClone(flags.pages[row.message_id])})) : rows;
    },
    async setChatMessages(rows) {
      if (flags.saveFail) throw Error('保存失败');
      for (const row of rows) {
        flags.writes.push(row.message_id);
        Object.assign(flags.floors.find(floor => floor.message_id === row.message_id), structuredClone(row));
      }
    },
  };
  vm.createContext(context);
  for (const name of ['native-floor-source','industry-state','domain-defaults','domain-state','faction-state','native-settlement','state-store'])
    vm.runInContext(sources[name], context);
  return { context, modules, books, flags, surface, api: modules['cryptLord.factionState'],
    emit: name => handlers.get(name)?.forEach(fn => fn()) };
}
const sample = () => ({
  势力名: '<测试势力>', 势力类型: '教会', '<User>的职位': '主教', 保留: { 外部: true },
  直辖的半神和真神信息: {
    神: { '半神/真神名称': '无名', 序列: '序列2-旧日侍者', 职位: '首领' },
    侍者: { 序列: '序列0.4' }, 真旧日: { 序列: '旧日' }, 支柱: { 序列: '支柱' },
  },
  实控区域: {
    $meta: { extensible: true }, 港口: { 区域名: '港口', 区域类型: '世俗领地', 区域人口: 1000, 区域面积: 12 },
    地下: { 区域类型: '地下势力实控区', 区域人口: 500, 区域面积: 3 },
    星界: { 区域类型: '星界', 区域人口: 999, 区域面积: 25 },
  },
  世俗军队: {
    海军: { 一: { 部队精锐等级: '1级', 部队数量: 10 } },
    陆军: { 三: { 部队精锐等级: '3级', 部队数量: 8 }, 五: { 部队精锐等级: '5级', 部队数量: 2 } },
    空军: { 四: { 部队精锐等级: '4级', 部队数量: 4 }, 二: { 部队精锐等级: '2级', 部队数量: 7 } },
  },
});
test('完整势力规则对照原版、配置覆盖与只读投影', async () => {
  const f = fixture();
  const at = originalDB.indexOf('    factionConfig: {', originalDB.indexOf('_fallback:'));
  const literal = originalDB.slice(at + '    factionConfig: '.length, originalDB.indexOf('    industryConfig:', at)).trim().replace(/,$/, '');
  const defaults = vm.runInNewContext(`(${literal})`);
  assert.deepEqual(plain(f.api.defaults()), plain(defaults));
  const start = original.indexOf(".transform(factions => {", original.indexOf('势力: recordWithMeta'));
  const body = original.slice(start + '.transform(factions => {'.length, original.indexOf('return factions;', start));
  const oracle = vm.runInNewContext(`(factions => {${body}return factions;})`, {
    GameDBManager: { DB: { factionConfig: defaults } },
    POPULATION_REGION_TYPES: new Set(['世俗领地','教会教区','地下势力实控区']),
    containsOldDayAttendant: s => String(s || '').includes('旧日侍者'),
  });
  const input = sample(), before = structuredClone(input);
  assert.deepEqual(plain(f.api.normalize(input)), plain(oracle({ a: structuredClone(input) }).a));
  assert.deepEqual(input, before);
  assert.equal(f.api.normalize(input).锚的需求, 8500000);
  assert.equal(f.api.normalize({ 锚的需求: '待定' }).锚的需求, '待定');
  assert.equal(f.api.normalize({ 锚的需求: 123, 直辖的半神和真神信息: { $meta: {} } }).锚的需求, 123);
  assert.equal(f.api.list({ $meta: {}, 无: {} })[0].population, '没有实控区');
  assert.equal(f.api.list({ a: { 实控区域: { x: { 区域类型: '星界', 区域人口: 100 } } } })[0].population,
    '现有实控区类型都不适用人口概念');
  f.books.set('2历史孔隙', [{ name: '【配置】势力配置', content: '{"anchorDemands":{"2":8}}' }]);
  f.books.set('本地', [{ name: '【配置】势力配置', content:
    '```jsonc\n{"anchorDemands":{"2":9,"1.5":12}, // 主库\n"productivityDemands":{"农产品":{"1级":{"pop":2,}}}}\n```' }]);
  const loaded = await f.api.load();
  await f.api.assertRules(loaded);
  await assert.rejects(f.api.assertRules(structuredClone(loaded)), /凭据/);
  assert.equal(loaded.config.anchorDemands['2'], 9);
  assert.equal(loaded.config.anchorDemands['1.5'], 12);
  assert.equal(loaded.config.anchorDemands['4'], undefined);
  assert.equal(f.api.normalize(input, loaded.config).势力生产力总需求['1级农产品需求'], 3000);
  assert.equal(f.api.normalize(input, loaded.config).势力生产力总需求['1级工业品需求'], 0);
  f.books.set('本地', [{ name: '【配置】坏势力配置', content: '{"anchorDemands":{"2":-1}}' }]);
  assert.equal((await f.api.load()).warnings.length, 1);
  f.flags.fail = true; await assert.rejects(f.api.load(), /读取失败/); f.flags.fail = false;
  const data = { stat_data: { 势力: { $meta: { extensible: true }, a: sample() },
    领地: { 已建立: true, 领地名: '我的领地', 等级: 1, 人口: 1200, 地点: '港口' } }, npc_data: { 留存: {} } };
  const originalData = structuredClone(data);
  const prepared = f.api.prepare(data);
  assert.deepEqual(data, originalData);
  assert.equal(prepared.stat_data.势力['我的领地'].$投影, true);
  assert.equal(prepared.stat_data.势力['我的领地'].锚的供给量, 1200);
  assert.equal(prepared.stat_data.势力['我的领地'].势力生产力总需求['1级农产品需求'], 1200);
  assert.deepEqual(plain(prepared.stat_data.势力.$meta), { extensible: true });
  const result = f.modules['cryptLord.nativeSettlement'].apply(data, data, { factionConfig: f.api.defaults() });
  assert.equal(result.changed, true);
  assert.ok(result.applied.includes('faction-derived-state'));
  assert.equal(f.modules['cryptLord.nativeSettlement'].apply(data, data, { factionConfig: f.api.defaults() }).changed, false);
  for (const boundary of ['chat', 'script', 'document', 'host', 'domain', 'industry']) {
    const changed = fixture(), rules = await changed.api.load();
    if (boundary === 'chat' || boundary === 'script') changed.flags[boundary] += '-changed';
    if (boundary === 'document') changed.surface.document = {};
    if (boundary === 'host') changed.modules['cryptLord.hostApi'] = {...changed.modules['cryptLord.hostApi']};
    if (boundary === 'domain') changed.modules['cryptLord.domainState'] = {...changed.modules['cryptLord.domainState']};
    if (boundary === 'industry') changed.modules['cryptLord.industryState'] = {...changed.modules['cryptLord.industryState']};
    await assert.rejects(changed.api.assertRules(rules), /变化/, boundary);
  }
  const mixed = fixture();
  mixed.books.set('2历史孔隙', [{name: '【配置】势力配置', content: '{"anchorDemands":{"2":7}}',
    extra: {date: new Date('2026-10-28')}}]);
  const issued = await mixed.api.load();
  mixed.books.get('2历史孔隙')[0].extra.date.setUTCDate(29);
  await assert.rejects(mixed.api.assertRules(issued), /变化/);
  const tampered = await mixed.api.load();
  tampered.config.anchorDemands['2'] = 999;
  await assert.rejects(mixed.api.assertRules(tampered), /凭据/);
  mixed.flags.bookHook = name => {
    if (name === '本地') {
      mixed.flags.bookHook = null;
      mixed.books.get('2历史孔隙')[0].content = '{"anchorDemands":{"2":8}}';
    }
  };
  await assert.rejects(mixed.api.load(), /读取期间.*变化/);
  mixed.flags.bound.additional = '损坏绑定';
  await assert.rejects(mixed.api.load(), /绑定格式/);
  const native = fixture(), nativeData = {stat_data: {势力: {a: sample()}}};
  native.flags.floors = [
    {message_id: 0, role: 'assistant', message: '历史', data: structuredClone(nativeData)},
    {message_id: 1, role: 'user', message: '行动', data: {}},
    {message_id: 2, role: 'assistant', message: '正文', swipe_id: 1, data: structuredClone(nativeData)},
  ];
  const originalFloors = structuredClone(native.flags.floors);
  const history = await native.api.loadNative(0);
  assert.equal(history.reason, '历史楼层只读');
  assert.equal(history.rows[0].faction.人口数量, 1500);
  await native.api.assertNative(history);
  await assert.rejects(native.api.assertNative(structuredClone(history)), /凭据/);
  const latest = await native.api.loadNative();
  native.flags.pages[2] = (await native.modules['cryptLord.hostApi'].getChatMessages('2', {include_swipes: true}))[0];
  native.flags.pages[2].swipes_info[0].date.setUTCDate(29);
  await assert.rejects(native.api.assertNative(latest), /变化/);
  native.flags.pages = {};
  native.flags.floors[0].is_hidden = true;
  await assert.rejects(native.api.loadNative(0), /隐藏/);
  delete native.flags.floors[0].is_hidden;
  native.flags.floors.push({message_id: 3, role: 'user', message: '待回复', data: {}});
  await assert.rejects(native.api.loadNative(), /不是 assistant/);
  native.flags.floors.pop();
  assert.deepEqual(native.flags.floors, originalFloors);
  assert.deepEqual(native.flags.writes, []);
  const world = native.modules['cryptLord.nativeSettlement'];
  const preparedWorld = await world.prepare(nativeData, nativeData);
  native.modules['cryptLord.factionState'] = {...native.api};
  await assert.rejects(world.assertPrepared(preparedWorld), /势力派生服务已变化/);
});
test('原生正文结算仅保存当前 assistant，失败重试不改历史或正文标签', async () => {
  const f = fixture(), initial = { stat_data: { 势力: { a: sample() } }, world_data: { 天气: '晴' } };
  const floors = [
    { message_id: 0, role: 'assistant', message: '开场', data: structuredClone(initial) },
    { message_id: 1, role: 'user', message: '查看势力', data: { 不变: true } },
    { message_id: 2, role: 'assistant', message: '正文\n<UpdateVariable>\n原标签\n</UpdateVariable>', data: {} },
  ];
  const before = structuredClone(floors);
  f.flags.floors = floors;
  Object.assign(f.modules, {
    'cryptLord.contextBuilder': { build: async () => [] },
    'cryptLord.responseNormalizer': { extractActions: () => [] },
    'cryptLord.variablePatch': { apply: () => ({ applied: false }), updateTag: () => '', embedUpdate: text => text },
    'cryptLord.variableSettlementApi': { settle: async () => ({ skipped: true }) },
  });
  vm.runInContext(sources['generation-bridge'], f.context);
  const bridge = f.modules['cryptLord.nativeFloorBridge'];
  const transaction = { userMessageId: 1, assistantMessageId: 2, userText: '查看势力', narrativeText: '正文' };
  f.flags.saveFail = true;
  await assert.rejects(bridge.completeNarrative('正文', transaction), /保存失败/);
  assert.deepEqual(floors, before);
  f.flags.saveFail = false;
  await bridge.completeNarrative('正文', transaction);
  assert.deepEqual(f.flags.writes, [2]);
  assert.deepEqual(floors.slice(0, 2), before.slice(0, 2));
  assert.equal(floors[2].message, before[2].message);
  assert.equal(floors[2].data.stat_data.势力.a.人口数量, 1500);
  const result = structuredClone(floors[2].data);
  await bridge.completeNarrative('正文', transaction);
  assert.deepEqual(floors[2].data, result);
  f.flags.fail = true;
  const confirmed = structuredClone(floors[2]);
  await assert.rejects(bridge.completeNarrative('正文', transaction), /读取失败/);
  assert.deepEqual(floors[2], confirmed);
  assert.equal(floors[2].message, before[2].message);
});
