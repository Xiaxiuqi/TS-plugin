import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const names = ['domain-defaults', 'native-floor-source', 'industry-state', 'cashflow', 'domain-state', 'faction-state', 'state-store', 'native-settlement'];
const sources = await Promise.all(names.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36a-js-items-equip-relationships.txt');
function method(name) {
  const start = original.indexOf(`\n  ${name}(`);
  assert.ok(start >= 0, name);
  const tree = ts.createSourceFile('original.js', `const methods={${original.slice(start)}`, 99, true, ts.ScriptKind.JS);
  return tree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(tree);
}
const plain = value => JSON.parse(JSON.stringify(value));
const time = '第五纪1349年1月1日星期一0:00';
function sample() {
  return {stat_data: {名称: '克莱恩', 产业: {
    $meta: {extensible: true, 总估值: '旧估值', 自定义: '保留'},
    '港.a[0]': {名称: '银湾工坊', 类型: '第二产业', 当前投入资本总额: '50000 金镑', 负责人: '诺兰',
      利润倍率: 1.5, 生产分配_1级: 60, 生产分配_2级: 40, 资产: '船坞\n运输机械', 自定义: {保留: true}},
    商行: {名称: '银湾工坊', 类型: '第三产业', 当前投入资本总额: '5000 铜便士', 负责人: '诺兰',
      利润倍率: 1, '$轻负荷运营': true},
  }, 人物关系列表: {诺兰: {好感度: 80}}, 货币: {鲁恩王国: {金镑: 20, 银苏勒: 0, 铜便士: 10}, 其他: {}},
  生产力: {$meta: {extensible: true}, 剧情生产力: 13}, 领地: {已建立: true, 物资库: {保留物资: 3}}},
  npc_data: {诺兰: {当前序列: '序列5-工匠'}}, world_data: {当前时间纪元: time, _lastTimeEra: time}, otherPlugin: {保留: true}};
}
async function fixture(data = sample()) {
  const modules = {}, handlers = new Map(), writes = [], reads = [], warnings = [];
  const state = {floors: [
    {message_id: 0, role: 'assistant', message: '<UpdateVariable>绝不初始化</UpdateVariable>', data: {stat_data: {}}},
    {message_id: 1, role: 'user', message: '行动', data: {keep: true}},
    {message_id: 2, role: 'assistant', message: '原生正文\n<UpdateVariable>保留标签</UpdateVariable>', data, swipe_id: 1},
  ], fail: false, postFail: false, acknowledgementFail: false, readFail: false, gate: null, finalGate: null, page: 0,
  noWrite: false, conflict: false, date: new Date('2026-10-27'), derivations: 0, chat: 'industry', script: 'industry',
  bound: {primary: '角色书', additional: ['角色书']}, books: {
    '2历史孔隙': [{name: '【配置】产业配置', content: '{"scaleThresholds":{"medium":100,"large":1000}}'}],
    角色书: [
      {name: '【配置】产业配置', content: '```jsonc\n{"scaleThresholds":{"medium":5000,"large":50000},\n"industryInjectRetention":0.5, // 主库\n}\n```'},
      {name: '[神之途径]通识者', content: '{"通识者途径":["序列5-工匠"]}'},
    ],
    '1源堡': [{name: '【配置】产业配置', content: '{"industryInjectRetention":0.9}'}],
  }};
  modules['cryptLord.hostApi'] = {
    getCharWorldbookNames: async () => structuredClone(state.bound),
    async getWorldbook(name) {if (state.readFail) throw Error('模拟读取失败'); return structuredClone(state.books[name] || [])},
    async getChatMessages(id, options) {
      reads.push(id); if (state.readFail) throw Error('模拟读取失败');
      const rows = id === '{{lastMessageId}}' ? state.floors.slice(-1) :
        id === '0-{{lastMessageId}}' ? state.floors : state.floors.filter(row => row.message_id === Number(id));
      return structuredClone(options?.include_swipes ? rows.map(({message, data, ...row}) => ({...row, page: state.page,
        swipe_id: row.swipe_id ?? 1, swipes: ['另一正文页', message], swipes_data: [{stat_data: {保留: 7}}, data],
        swipes_info: [{send_date: state.date, extra: {保留: true}}, {}]})) : rows);
    },
    async setChatMessages(rows) {
      if (state.fail) throw Error('模拟保存失败');
      writes.push(structuredClone(rows)); if (state.noWrite) return;
      rows.forEach(row => Object.assign(state.floors[row.message_id], structuredClone(row)));
      if (state.conflict) state.page++;
      if (state.acknowledgementFail) throw Error('已落盘但响应丢失');
      if (state.postFail) state.readFail = true;
    },
  };
  const events = {CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop'};
  const surface = {document: {}, window: {SillyTavern: {getCurrentChatId: () => state.chat}}};
  modules['cryptLord.hostApi'].scriptVariableOptions = () => ({type: 'script', script_id: state.script});
  modules['cryptLord.afterNativeHost'] = {tavernEvents: () => events, getHost: () => surface,
    bindEvent(name, fn) {const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set);
      return {stop() {set.delete(fn)}}}};
  modules['cryptLord.dynamicStatus'] = {status: () => ({epoch: 0}), async load() {await state.gate?.(); return {rules: []}},
    async assertLoaded() {await state.finalGate?.()}, apply() {state.derivations++}};
  const deterministicMath = Object.create(Math); deterministicMath.random = () => 0.37;
  const runtime = {console: {...console, warn: (...values) => warnings.push(values)}, Math: deterministicMath, DOMException,
    structuredClone, cryptLord: {__stage1Modules: modules, contract: {
    initializeGlobal(key, api) {modules[key] = api}, releaseGlobal(key) {delete modules[key]},
    async waitGlobalInitialized(key) {assert.ok(modules[key], key); return modules[key]},
  }}};
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return {api: modules['cryptLord.industryState'], settlement: modules['cryptLord.nativeSettlement'],
    runtime, modules, state, writes, reads, warnings,
    emit: (event = 'CHAT_CHANGED', ...args) => handlers.get(events[event])?.forEach(fn => fn(...args))};
}
test('完整产业规则：原版财务AST对照、负责人/分配、元数据与生产力、自动周结算', async () => {
  const f = await fixture(), {api} = f, rules = await api.loadRules();
  assert.equal(rules.config.scaleThresholds.medium, 5000);
  assert.equal(rules.config.scaleThresholds.large, 50000);
  assert.equal(rules.source, '世界书配置');
  assert.equal(rules.config.industryInjectRetention, .5);
  assert.equal((await api.loadConfigs()).accepted, rules.accepted);
  assert.equal(api.evaluate({当前投入资本总额: '1000 金镑'}).scale, '小型');
  assert.deepEqual(plain(await api.loadPathways()), plain(rules.pathways));
  await api.assertRules(rules);
  await assert.rejects(api.assertRules(structuredClone(rules)), /来源无效/);
  const oracle = vm.runInNewContext(`({${method('parseCurrency')},${method('formatCurrency')},
    ${method('evaluateMonthlyPerformance')},${method('calculateIndustryReturn')}})`, {
    console, GameDBManager: {DB: {industryConfig: plain(rules.config)}},
  });
  for (const capital of [100, 5000, 50000, 1000000]) {
    for (const rate of [-30, 0, 22]) {
      for (const tech of [-200, 50, 1000]) {
        const item = {当前投入资本总额: `${capital} 金镑`, 月均资本回报率: rate,
          技术先进指数: tech, 市场饱和度: 22, 运营效率: 70, 固定成本率: 4};
        const expected = oracle.evaluateMonthlyPerformance({...item}), actual = api.evaluate(item, rules.config);
        for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, key);
      }
    }
  }
  const before = sample(), untouched = structuredClone(before);
  const principal = api.principal(before.stat_data.产业['港.a[0]'], before, rules.pathways);
  assert.equal(principal.baseTier, 6); assert.equal(principal.tier, 8);
  assert.equal(principal.specialty, 'matched'); assert.equal(principal.fields.运营效率, 67.5);
  assert.equal(principal.totalDeduction, 4);
  const draft = structuredClone(before.stat_data.产业);
  draft['港.a[0]'].生产分配_1级 = 40; draft['港.a[0]'].生产分配_3级 = 20;
  const next = api.prepare(before, draft, rules);
  assert.deepEqual(before, untouched);
  assert.equal(next.stat_data.产业['港.a[0]'].规模, '大型');
  assert.equal(next.stat_data.产业['港.a[0]'].创建时间, time);
  assert.equal(next.stat_data.产业.$meta.自定义, '保留');
  assert.equal(next.stat_data.产业.$meta.总估值, '50000 金镑、5000 铜便士');
  assert.equal(next.stat_data.生产力.剧情生产力, 13);
  assert.deepEqual(plain(next.stat_data.生产力.$meta), {extensible: true});
  assert.ok(next.stat_data.生产力['3级工业品'] > 0);
  assert.deepEqual(plain(next.stat_data.货币), before.stat_data.货币);
  assert.deepEqual(plain(next.stat_data.领地), before.stat_data.领地);
  assert.throws(() => api.allocation(draft['港.a[0]'], 2, 90, rules.config), /超过/);
  assert.throws(() => api.allocation(draft['港.a[0]'], 2, 1.5, rules.config), /整数/);
  assert.throws(() => api.allocation({...draft['港.a[0]'], 当前投入资本总额: '100 金镑'}, 5, 1), /尚未解锁/);
  for (const patch of [
    {当前投入资本总额: '-1 金镑'}, {当前投入资本总额: '1.2.3 金镑'}, {利润倍率: 'NaN'},
    {生产分配_1级: 101}, {生产分配_1级: 1.5}, {类型: '__proto__'}, {'$轻负荷运营': 'false'},
  ]) assert.throws(() => api.prepare(before, {...draft, '港.a[0]': {...draft['港.a[0]'], ...patch}}, rules));
  const small = {...draft['港.a[0]'], 当前投入资本总额: '100 金镑'};
  assert.throws(() => api.prepare(before, {small}, rules), /尚未解锁/);
  const cleared = api.allocation(small, 3, 0, rules.config);
  assert.equal(api.prepare(before, {small: cleared}, rules).stat_data.产业.small.规模, '小型');
  const removed = api.prepare(before, {$meta: draft.$meta}, rules);
  assert.equal(removed.stat_data.生产力['1级工业品'], 0); assert.equal(removed.stat_data.产业.$meta.总估值, '0');
  const goods = api.industryWeeklyGoods(next.stat_data.产业, rules.config);
  for (const [name, amount] of Object.entries(goods))
    assert.equal(amount, Math.floor(Math.floor(next.stat_data.生产力[name] / 4) * 0.5));
  const normal = structuredClone(next), light = structuredClone(next);
  light.stat_data.产业['港.a[0]']['$轻负荷运营'] = true;
  assert.deepEqual(plain(api.industryWeeklyGoods(normal.stat_data.产业, rules.config)),
    plain(api.industryWeeklyGoods(light.stat_data.产业, rules.config)));
  const industry = normal.stat_data.产业['港.a[0]'];
  const derived = {...industry, ...api.principal(industry, normal, rules.pathways).fields};
  const oldWeekly = oracle.parseCurrency(oracle.calculateIndustryReturn(derived.当前投入资本总额,
    derived.月均资本回报率 / 4, 1, derived)).value - 50000;
  api.settleWeekly(normal, 1, rules.pathways); api.settleWeekly(light, 1, rules.pathways);
  assert.equal(normal.stat_data.货币.鲁恩王国.金镑 - 20, Math.round(oldWeekly * 1.5));
  assert.equal(light.stat_data.货币.鲁恩王国.金镑 - 20, Math.round(Math.round(oldWeekly * 1.5) * .5));
  assert.equal(normal.stat_data.人物关系列表.诺兰.好感度, 76);
  assert.equal(light.stat_data.人物关系列表.诺兰.好感度, 80);
  assert.equal(normal.stat_data.产业['港.a[0]'].利润倍率, 1.45);
  f.modules['cryptLord.cashflow'].normalize(normal);
  const turn = structuredClone(next); turn.world_data.当前时间纪元 = '第五纪1349年1月8日星期一0:00';
  f.settlement.apply(turn, next, {industryPathways: rules.pathways, industryRules: rules});
  assert.equal(turn.stat_data.货币.鲁恩王国.金镑, normal.stat_data.货币.鲁恩王国.金镑);
  assert.equal(turn.stat_data.产业['港.a[0]'].当前投入资本总额, '50000 金镑');
  assert.equal(turn.stat_data.领地.物资库['3级工业品'], goods['3级工业品']);
  const replay = structuredClone(turn); replay.stat_data.天气 = '晴';
  f.settlement.apply(replay, turn, {industryPathways: rules.pathways, industryRules: rules});
  assert.deepEqual(plain(replay.stat_data.货币), plain(turn.stat_data.货币));
  assert.deepEqual(plain(replay.stat_data.领地.物资库), plain(turn.stat_data.领地.物资库));
  const deferred = structuredClone(next); deferred.world_data.当前时间纪元 = turn.world_data.当前时间纪元;
  f.settlement.apply(deferred, next, {industryPathways: null});
  assert.deepEqual(plain(deferred.stat_data.货币), next.stat_data.货币);
  f.state.books.角色书[0].content = '{"productionConversion":{"1级":0}}';
  assert.equal((await api.load(2)).editable, false);
  await assert.rejects(api.loadConfigs(), /配置异常/);
  await assert.rejects(api.loadPathways(), /配置异常/);
  assert.equal(api.status().source, '世界书配置');
  assert.equal(api.evaluate({当前投入资本总额: '1000 金镑'}).scale, '小型');
});
test('原生楼层事务：无初始化、完整保存、失败草稿、最终冲突、串行提交与生命周期', async () => {
  const f = await fixture(), {api, state} = f, initial = structuredClone(state.floors);
  const loaded = await api.load(2), draft = structuredClone(loaded.source.value);
  assert.deepEqual(f.writes, []); assert.equal(f.reads.includes('0-{{lastMessageId}}'), true);
  assert.deepEqual(state.floors, initial);
  assert.equal((await api.load(0)).editable, false);
  assert.equal((await api.commit(loaded, draft)).unchanged, true); assert.deepEqual(f.writes, []);
  const emptyData = sample(); delete emptyData.stat_data.产业;
  const empty = await fixture(emptyData), emptyLoaded = await empty.api.load(2);
  const emptyValue = {$meta: {extensible: true, 总估值: '0', 上次计算时间: ''}};
  assert.equal((await empty.api.commit(emptyLoaded, emptyValue)).unchanged, true);
  assert.deepEqual(empty.writes, []);
  draft['港.a[0]'].名称 = '修改后工坊'; delete draft.商行;
  state.fail = true; await assert.rejects(api.commit(loaded, draft), /保存失败/);
  assert.deepEqual(state.floors, initial); assert.equal(draft['港.a[0]'].名称, '修改后工坊');
  state.fail = false;
  const saved = await api.commit(loaded, draft);
  assert.equal(f.writes.length, 1); assert.equal(saved.loaded.source.value['港.a[0]'].名称, '修改后工坊');
  assert.deepEqual(state.floors.slice(0, 2), initial.slice(0, 2));
  assert.equal(state.floors[2].message, initial[2].message);
  assert.deepEqual(state.floors[2].data.otherPlugin, initial[2].data.otherPlugin);
  assert.deepEqual(state.floors[2].data.stat_data.货币, initial[2].data.stat_data.货币);
  await assert.rejects(api.commit(loaded, draft), /已变化|来源无效/);
  for (const mutate of [
    s => {s.floors[2].message += '外部正文'},
    s => {s.floors[2].data.stat_data.货币.鲁恩王国.金镑++},
    s => {s.floors[2].swipe_id++},
    s => {s.floors.push({message_id: 3, role: 'user', message: '新回合'})},
    s => {s.books.角色书[0].content = '{}'},
    s => {s.bound.additional.push('外部书')},
    s => {s.page++},
    s => {s.date.setTime(s.date.getTime() + 1000)},
    s => {s.floors[0].message += '另一楼层修订'},
    s => {s.floors[2].is_hidden = true},
  ]) {
    const fresh = await fixture(), old = await fresh.api.load(2), change = structuredClone(old.source.value);
    change['港.a[0]'].名称 = '新名称';
    fresh.state.gate = async () => {mutate(fresh.state)};
    await assert.rejects(fresh.api.commit(old, change), /已变化/);
    assert.deepEqual(fresh.writes, []);
  }
  const reading = await fixture(), readBook = reading.modules['cryptLord.hostApi'].getWorldbook;
  let changed = false;
  reading.modules['cryptLord.hostApi'].getWorldbook = async name => {
    if (!changed) {changed = true; reading.state.floors[2].swipe_id++}
    return readBook(name);
  };
  await assert.rejects(reading.api.load(2), /已变化/);
  assert.deepEqual(reading.writes, []);
  for (const operation of ['guard', 'chat', 'dispose', 'generation', 'service', 'host']) {
    const fresh = await fixture(), old = await fresh.api.load(2), change = structuredClone(old.source.value);
    change['港.a[0]'].名称 = '新名称'; let active = true;
    fresh.state.gate = async () => {
      if (operation === 'guard') active = false;
      if (operation === 'chat') fresh.emit();
      if (operation === 'dispose') fresh.api.dispose();
      if (operation === 'generation') fresh.emit('GENERATION_STARTED', 'normal');
      if (operation === 'service') fresh.modules['cryptLord.stateStore'] = {...fresh.modules['cryptLord.stateStore']};
      if (operation === 'host') fresh.modules['cryptLord.hostApi'] = {...fresh.modules['cryptLord.hostApi']};
    };
    await assert.rejects(fresh.api.commit(old, change, () => active), /取消|已变化/); assert.deepEqual(fresh.writes, []);
  }
  const concurrent = await fixture(), old = await concurrent.api.load(2);
  const a = structuredClone(old.source.value), b = structuredClone(a);
  a['港.a[0]'].名称 = '第一个'; b['港.a[0]'].名称 = '第二个';
  const pending = concurrent.api.commit(old, a); a['港.a[0]'].名称 = '调用后污染';
  const late = concurrent.api.commit(old, b);
  await pending; await assert.rejects(late, /已变化/);
  assert.equal(concurrent.writes.length, 1);
  assert.equal(concurrent.state.floors[2].data.stat_data.产业['港.a[0]'].名称, '第一个');
  const post = await fixture(), postOld = await post.api.load(2), value = structuredClone(postOld.source.value);
  value['港.a[0]'].名称 = '实际已保存'; post.state.postFail = true;
  const postTransaction = post.api.begin(postOld, value);
  await assert.rejects(postTransaction.run(), /保存状态待核对/);
  assert.equal(postTransaction.status(), 'uncertain'); assert.equal(post.writes.length, 1);
  await assert.rejects(postTransaction.inspect(), /保存状态待核对/);
  await assert.rejects(postTransaction.save(), /不能重新提交/);
  post.state.readFail = false; post.state.postFail = false;
  assert.ok((await postTransaction.inspect()).loaded); assert.equal(post.writes.length, 1);
  for (const data of [
    {...sample(), cryptLord: {teamBattle: {status: 'active'}}},
    {...sample(), cryptLord: {teamBattle: {status: 'finished', settled: false}}},
    {...sample(), stat_data: {...sample().stat_data, 产业: {坏条目: null}}},
    {...sample(), stat_data: {...sample().stat_data, 产业: '坏字典'}},
  ]) assert.equal((await (await fixture(data)).api.load(2)).editable, false);
  const array = sample(); array.stat_data.产业 = [array.stat_data.产业['港.a[0]']];
  const af = await fixture(array), al = await af.api.load(2), av = structuredClone(al.source.value);
  av[0].名称 = '数组产业'; await af.api.commit(al, av);
  assert.equal(Array.isArray(af.state.floors[2].data.stat_data.产业), true);
  // Exercise the actual narrative bridge with in-memory public host APIs, not a model call.
  const bridgeFixture = await fixture(), initialData = sample();
  bridgeFixture.state.floors[0].data = structuredClone(initialData);
  bridgeFixture.state.floors[0].message = '已有原生开场';
  const floorBefore = structuredClone(bridgeFixture.state.floors.slice(0, 2));
  Object.assign(bridgeFixture.modules, {
    'cryptLord.contextBuilder': {build: async () => []},
    'cryptLord.responseNormalizer': {extractActions: () => []},
    'cryptLord.variablePatch': {
      apply() {const data = structuredClone(initialData); data.world_data.当前时间纪元 = '第五纪1349年1月8日星期一0:00';
        return {applied: true, data}},
      updateTag: () => '', embedUpdate: message => message,
    },
    'cryptLord.variableSettlementApi': {settle: async () => ({skipped: true})},
  });
  vm.runInContext(await read('public/guimizhizhu_ui/core/generation-bridge.js'), bridgeFixture.runtime);
  const bridge = bridgeFixture.modules['cryptLord.nativeFloorBridge'];
  const transaction = {userMessageId: 1, assistantMessageId: 2, userText: '经营产业', narrativeText: '正文'};
  bridgeFixture.emit('GENERATION_STARTED', 'normal');
  bridgeFixture.state.fail = true;
  await assert.rejects(bridge.completeNarrative('正文', transaction), /保存失败/);
  assert.deepEqual(bridgeFixture.state.floors.slice(0, 2), floorBefore);
  bridgeFixture.state.fail = false;
  await bridge.completeNarrative('正文', transaction);
  const settled = structuredClone(bridgeFixture.state.floors[2]);
  assert.ok(settled.data.stat_data.货币.鲁恩王国.金镑 > 20);
  assert.equal(settled.data.stat_data.产业.$meta.总估值, '50000 金镑、5000 铜便士');
  assert.ok(settled.data.stat_data.生产力['1级工业品'] > 0);
  assert.ok(settled.data.stat_data.领地.物资库['1级工业品'] > 0);
  assert.deepEqual(bridgeFixture.state.floors.slice(0, 2), floorBefore);
  await bridge.completeNarrative('正文', transaction);
  assert.deepEqual(bridgeFixture.state.floors[2], settled);
  bridgeFixture.emit('GENERATION_ENDED');
  bridgeFixture.state.books.角色书[0].content = '{"productionConversion":{"1级":0}}';
  await assert.rejects(bridge.completeNarrative('正文', transaction), /规则损坏/);
  assert.deepEqual(bridgeFixture.state.floors[2], settled);
  const forged = await fixture(), actual = await forged.api.load(2), changedDraft = structuredClone(actual.source.value);
  changedDraft['港.a[0]'].名称 = '正常草稿';
  await assert.rejects(forged.api.commit(structuredClone(actual), changedDraft), /来源无效/);
  actual.floor.data.otherPlugin = {污染: true}; actual.rules.config.industryInjectRetention = .99;
  await assert.rejects(forged.api.commit(actual, changedDraft), /来源无效/);
  assert.deepEqual(forged.state.floors[2].data.otherPlugin, {保留: true});
  assert.equal(forged.writes.length, 0);
  for (const mutation of [
    next => {next.state.page++},
    next => {next.state.books.角色书[0].content = '{}'},
    next => {next.emit('GENERATION_STARTED', 'normal')},
  ]) {
    const next = await fixture(), before = await next.api.load(2), value = structuredClone(before.source.value);
    value['港.a[0]'].名称 = '最终派生之后冲突';
    next.state.finalGate = () => mutation(next);
    await assert.rejects(next.api.commit(before, value), /已变化|取消/);
    assert.deepEqual(next.writes, []);
  }
  const generation = await fixture(), readBefore = await generation.api.load(2), valueBefore = structuredClone(readBefore.source.value);
  valueBefore['港.a[0]'].名称 = '取消草稿';
  for (const args of [['quiet'], ['quiet_prompt'], ['normal', {quiet_prompt: true}], ['dryRun'], ['normal', {dryRun: true}], ['normal', {}, true]]) {
    generation.emit('GENERATION_STARTED', ...args);
    await generation.api.assertRules(await generation.api.loadRules());
    assert.equal((await generation.api.load(2)).editable, true);
    const quiet = await fixture(), quietLoaded = await quiet.api.load(2), quietDraft = structuredClone(quietLoaded.source.value);
    quietDraft['港.a[0]'].名称 = '非正文事件不取消保存';
    quiet.state.gate = () => quiet.emit('GENERATION_STARTED', ...args);
    await quiet.api.commit(quietLoaded, quietDraft);
    assert.equal(quiet.writes.length, 1);
  }
  generation.emit('GENERATION_STARTED', 'normal');
  await assert.rejects(generation.api.load(2), /取消/);
  // Rule loading remains available to the native narrative settlement while the editor is locked.
  await generation.api.assertRules(await generation.api.loadRules());
  generation.emit('GENERATION_STOPPED');
  await assert.rejects(generation.api.commit(readBefore, valueBefore), /取消/);
  await generation.api.load(2);
  const uncertain = await fixture(), uncertainty = await uncertain.api.load(2), uncertainDraft = structuredClone(uncertainty.source.value);
  uncertainDraft['港.a[0]'].名称 = '已落盘但未确认';
  uncertain.state.acknowledgementFail = true;
  assert.match((await uncertain.api.commit(uncertainty, uncertainDraft)).warning, /已核对/);
  assert.equal(uncertain.writes.length, 1);
  assert.equal(uncertain.state.floors[2].data.stat_data.产业['港.a[0]'].名称, '已落盘但未确认');
  uncertain.state.acknowledgementFail = false;
  await assert.rejects(uncertain.api.commit(uncertainty, uncertainDraft), /已变化/);
  assert.equal(uncertain.writes.length, 1);
  for (const mode of ['fail', 'noWrite', 'postFail', 'conflict']) {
    const next = await fixture(), loaded = await next.api.load(2), draft = structuredClone(loaded.source.value);
    draft['港.a[0]'].名称 = '只派生一次'; delete draft.商行;
    const transaction = next.api.begin(loaded, draft); next.state[mode] = true;
    await assert.rejects(transaction.run(), /保留|核对|已变化/);
    assert.equal(next.state.derivations, 1); await assert.rejects(transaction.run(), /不能重复/);
    if (mode === 'conflict') { assert.equal(transaction.status(), 'invalid'); continue; }
    next.state[mode] = false; next.state.readFail = false;
    if (mode === 'postFail') { await assert.rejects(transaction.save(), /不能重新提交/); await transaction.inspect(); }
    else await transaction.save();
    assert.equal(transaction.status(), 'saved'); assert.equal(next.state.derivations, 1);
    assert.equal(next.state.floors[2].data.stat_data.产业['港.a[0]'].名称, '只派生一次');
    assert.equal(next.state.floors[2].data.stat_data.产业.商行, undefined);
  }
  for (const mutate of [
    next => {next.state.books.角色书[0].content = '{}'},
    next => {next.state.chat += 'new'},
    next => {next.state.script += 'new'},
  ]) {
    const next = await fixture(), loaded = await next.api.load(2), draft = structuredClone(loaded.source.value);
    draft['港.a[0]'].名称 = '不得覆盖'; const tx = next.api.begin(loaded, draft);
    next.state.fail = true; await assert.rejects(tx.run(), /保留/); mutate(next);
    await assert.rejects(tx.save(), /变化|取消/); assert.equal(next.writes.length, 0);
  }
  const waitingUser = await fixture();
  waitingUser.state.floors.push({message_id: 3, role: 'user', message: '等待回复', data: {}});
  await assert.rejects(waitingUser.api.load(), /没有角色状态/);
  waitingUser.state.floors.pop(); waitingUser.state.floors[2].is_hidden = true;
  assert.match((await waitingUser.api.load()).reason, /隐藏/);
});
