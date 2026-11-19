import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const files = ['attribute-recalculation', 'mystery-analysis', 'equipment-state', 'native-settlement',
  'variable-patch', 'response-normalizer', 'state-store', 'generation-bridge'];
const sources = await Promise.all(files.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const plain = value => JSON.parse(JSON.stringify(value));
const keys = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];
function initial() {
  return { stat_data: { 当前序列: '普通人', 消化进度: 0, 失控进度: 0, $战斗经验等级: 0,
    ...Object.fromEntries(keys.flatMap(key => [[`基础${key}`, 100], [key, 100], ...(key === '运气' ? [] : [[`当前${key}`, 30]])])),
    武器列表: { 短杖: { 名称: '短杖', 活力加成: 20, 百分比加成: { 全部属性: '10%' }, isEquipped: false } } },
    npc_data: { 保留: { 活力: 9 } }, world_data: {}, cryptLord: { other: { keep: true } }, otherPlugin: { keep: true } };
}
function fixture() {
  const modules = {}, handlers = new Map();
  const state = { rows: [{ message_id: 0, role: 'assistant', message: '开场', data: initial() },
    { message_id: 1, role: 'user', message: '行动', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>调查：街道安静，煤气灯已经亮了。</gametxt>', data: initial() }],
  writes: [], page: 0, hook: null, fail: false, reads: 0 };
  const events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_STOPPED: 'stop' };
  modules['cryptLord.hostApi'] = {
    async getChatMessages(range, options) {
      await state.hook?.(++state.reads);
      const rows = range === '0-{{lastMessageId}}' ? state.rows : state.rows.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => ({ ...row, swipe_id: state.page,
        swipes: [row.message, row.message], swipes_data: [row.data, row.data] })) : rows);
    },
    async setChatMessages(rows, options) {
      if (state.fail) throw Error('模拟保存失败');
      assert.equal(rows.length, 1); assert.equal(rows[0].message_id, 2); assert.equal(options.refresh, 'affected');
      Object.assign(state.rows[2], structuredClone(rows[0])); state.writes.push(2);
    },
    getVariables() { assert.fail('无配置访问'); }, getWorldbook() { assert.fail('无世界书写入'); },
    generateRaw() { assert.fail('无模型请求'); },
  };
  modules['cryptLord.afterNativeHost'] = { tavernEvents: () => events, bindEvent(name, fn) {
    const set = handlers.get(name) || new Set(); handlers.set(name, set); set.add(fn); return { stop: () => set.delete(fn) };
  } };
  modules['cryptLord.contextBuilder'] = {};
  modules['cryptLord.variableSettlementApi'] = { async settle({ previousData }) {
    return { data: structuredClone(previousData), skipped: true, response: '' };
  } };
  const runtime = { console, structuredClone, DOMException, cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
  } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, runtime, api: modules['cryptLord.attributeRecalculation'],
    emit: (key, ...args) => { for (const fn of handlers.get(events[key]) || []) fn(...args); } };
}
function extract(name) {
  const tree = ts.createSourceFile('original.js', original, 99, true, ts.ScriptKind.JS); let text;
  function visit(node) {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(value => value.name.getText() === name)) text = node.getText(tree);
    if (!text) ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(text, name); return text;
}
test('完整六维引擎与原版独立对照：所有加成入口、分段倍率、差额、负值、旧楼层与幂等', () => {
  const { api, modules } = fixture();
  const oracle = vm.runInNewContext(`${['safeGetValue', 'GLOBAL_ATTR_CONFIG', 'BATTLE_EXP', 'battleExpMultiplier', 'calculateRealMaxAttributes'].map(extract).join('\n')}
    calculateRealMaxAttributes`, { _: lodash, window: { MysteryAnalysisCore: { activeBonusOfStatData:
      stat => modules['cryptLord.mysteryAnalysis'].activeBonus(stat) } } });
  const stat = initial().stat_data;
  const lists = ['武器列表', '衣物列表', '饰品列表', '封印物列表', '扮演法列表', '辅助能力列表'];
  lists.forEach((list, index) => { stat[list] = { 已装备: { isEquipped: true, 基础活力加成: index,
    活力加成: 800, attributes_bonus: { 灵性: index + .5 }, 百分比加成: { 全部属性: `${index}%`, 运气: '-3%' } },
  未装备: { isEquipped: false, 活力加成: 999 } }; });
  stat.非凡特性列表 = { 被动: { 基础灵性加成: null, 灵性加成: 4, attributes_bonus: { 灵性: 3 },
    百分比加成: { 活力: '-120%' }, isEquipped: false } };
  stat.百分比加成 = { 全部属性: '900%' };
  for (const digest of [0, 40, 40.5, 41, 80, 80.5, 81, 100, 101])
    for (const loss of [0, 20, 20.5, 21, 50, 50.5]) {
      stat.消化进度 = digest; stat.失控进度 = loss; stat.$战斗经验等级 = 3.9;
      assert.deepEqual(plain(api.calculate(stat)), plain(oracle(stat)));
    }
  stat.衣物列表 = [{ isEquipped: true, 活力加成: 10 }]; stat.非凡特性列表 = [{ 活力加成: 3 }];
  stat.当前序列 = '序列4-窥秘人';
  stat.$专属玩法 = { 窥秘人途径: { 神秘解析玩法: { 描述: '已解析',
    最终加成: Object.fromEntries(keys.map(key => [key, '5%'])) } } };
  assert.deepEqual(plain(api.calculate(stat)), plain(oracle(stat)));
  const data = initial(); data.stat_data.武器列表.短杖.isEquipped = true;
  assert.equal(api.apply(data), true); assert.equal(data.stat_data.活力, 132); assert.equal(data.stat_data.当前活力, 62);
  assert.equal(data.stat_data.当前灵性, 40); assert.equal(data.stat_data.运气, 110);
  assert.equal(api.apply(data), false); data.stat_data.武器列表.短杖.isEquipped = false; api.apply(data);
  assert.equal(data.stat_data.当前活力, 30);
  const precise = { stat_data: { 基础活力: 1e15, 活力: 1e15 - 1, 当前活力: .1 } };
  api.apply(precise); assert.equal(precise.stat_data.当前活力, 1.1);
  data.stat_data.非凡特性列表 = { 诅咒: { 百分比加成: { 活力: '-120%' } } }; api.apply(data);
  assert.equal(data.stat_data.活力, -20); assert.equal(data.stat_data.当前活力, -90);
  delete data.stat_data.灵性; data.stat_data.当前灵性 = 12; api.apply(data);
  assert.equal(data.stat_data.灵性, 100); assert.equal(data.stat_data.当前灵性, 12);
  data.stat_data.灵性 = null; data.stat_data.当前灵性 = 11; api.apply(data); assert.equal(data.stat_data.当前灵性, 11);
  data.stat_data.当前灵性 = 900; api.apply(data); assert.equal(data.stat_data.当前灵性, 100);
  delete data.stat_data.基础理智; data.stat_data.理智 = 88; api.apply(data); assert.equal(data.stat_data.理智, 88);
  data.stat_data.基础敏捷 = Infinity; api.apply(data); assert.equal(data.stat_data.敏捷, 100);
  const legacy = structuredClone(stat); keys.forEach(key => { delete legacy[`基础${key}`]; legacy[key] = 100; });
  api.reconcileStat(legacy); assert.equal(legacy.活力, 105); assert.equal(api.reconcileStat(legacy), false);
  legacy.当前序列 = '序列5-窥秘人'; api.reconcileStat(legacy); assert.equal(legacy.活力, 100);
});
test('整条正式保存链：穿脱、补丁回合、神秘解析、经验与战斗保护同次落入原生assistant', async () => {
  const { state, api, modules } = fixture(), store = modules['cryptLord.stateStore'], equipment = modules['cryptLord.equipmentState'];
  const protectedFloors = structuredClone(state.rows.slice(0, 2)), message = state.rows[2].message;
  const equipped = equipment.apply(state.rows[2].data, '武器列表', '短杖', '短杖', true);
  await store.writeAssistantData(2, equipped);
  assert.equal(state.rows[2].data.stat_data.当前活力, 62);
  const removed = equipment.apply(state.rows[2].data, '武器列表', '短杖', '短杖', false);
  await store.writeAssistantMessage(2, message, removed); assert.equal(state.rows[2].data.stat_data.当前活力, 30);
  const preserved = structuredClone(state.rows[2].data);
  await store.writeAssistantMessage(2, message, equipped, { preserveData: true }); assert.deepEqual(state.rows[2].data, preserved);
  state.rows[0].data.stat_data.当前序列 = '普通人';
  const raw = message + '<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/武器列表/短杖/isEquipped","value":true}]}</JSONPatch></UpdateVariable>';
  const writes = state.writes.length;
  await modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, { assistantMessageId: 2, userMessageId: 1,
    userText: '行动', narrativeText: '正文', floorText: raw, guard: () => true });
  assert.equal(state.writes.length, writes + 1); assert.equal(state.rows[2].data.stat_data.当前活力, 62);
  assert.deepEqual(state.rows.slice(0, 2), protectedFloors);
  assert.deepEqual(state.rows[2].data.otherPlugin, { keep: true });
  const draft = initial(); draft.stat_data.当前序列 = '序列4-窥秘人';
  draft.stat_data.$专属玩法 = { 窥秘人途径: { 神秘解析玩法: { 描述: '已解析',
    最终加成: Object.fromEntries(keys.map(key => [key, '5%'])) } } };
  draft.stat_data.$战斗经验等级 = 1;
  await store.writeAssistantData(2, draft);
  assert.equal(state.rows[2].data.stat_data.活力, 107); assert.equal(state.rows[2].data.stat_data.当前活力, 37);
  await store.writeAssistantData(2, state.rows[2].data); assert.equal(state.rows[2].data.stat_data.当前活力, 37);
  for (const battle of [{ key: 'teamBattle', status: 'active' }, { key: 'teamBattle', status: 'finished', settled: false },
    { key: 'personalBattle', status: 'active' }, { key: 'personalBattle', status: 'finished', result: 'victory', enemy: { npcKey: '敌人' } }]) {
    const held = initial(); held.stat_data.武器列表.短杖.isEquipped = true; held.cryptLord[battle.key] = battle;
    assert.equal(api.busyBattle(held), true); await store.writeAssistantData(2, held);
    assert.equal(state.rows[2].data.stat_data.活力, 100); assert.equal(state.rows[2].data.stat_data.当前活力, 30);
    held.cryptLord[battle.key].settled = true; held.cryptLord[battle.key].experienceClaimed = true;
    held.cryptLord[battle.key].status = 'finished'; await store.writeAssistantData(2, held);
    assert.equal(state.rows[2].data.stat_data.当前活力, 62);
  }
});
test('原生楼层修正事务：只读查看、确认来源、外部冲突、排队、失败重试和取消', async () => {
  const [loader, shell] = await Promise.all(['public/guimizhizhu_ui/loader.js',
    'public/guimizhizhu_ui/modules/game-shell/index.js'].map(read));
  for (const file of ['core/attribute-recalculation.js', 'modules/attribute-recalculation/index.js',
    'modules/attribute-recalculation/style.css']) assert.ok(loader.includes(`'${file}'`));
  const tree = ts.createSourceFile('shell.js', shell, 99, true, ts.ScriptKind.JS);
  const route = tree.statements.find(node => ts.isExpressionStatement(node));
  let method;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'showFeature') method = node.getText(tree);
    if (!method) ts.forEachChild(node, visit);
  }
  visit(route); assert.ok(method);
  const menu = { current: { message_id: 2 }, chatToken: 0, disposed: false }, opened = []; let release;
  const showFeature = vm.runInNewContext(`(${method})`, { state: menu, notify() { assert.fail('菜单错误'); },
    contract: { waitGlobalInitialized(key) {
      assert.equal(key, 'cryptLord.attributeRecalculationUi');
      return new Promise(resolve => { release = () => resolve({ open: id => opened.push(id) }); });
    } } });
  showFeature({ id: 'attribute-recalculation' }); release(); await Promise.resolve(); assert.deepEqual(opened, [2]);
  showFeature({ id: 'attribute-recalculation' }); menu.chatToken++; release(); await Promise.resolve(); assert.deepEqual(opened, [2]);
  showFeature({ id: 'attribute-recalculation' }); menu.disposed = true; release(); await Promise.resolve(); assert.deepEqual(opened, [2]);
  const { state, api, modules, emit } = fixture();
  state.rows[2].data.stat_data.武器列表.短杖.isEquipped = true;
  const before = structuredClone(state.rows);
  assert.equal((await api.load(0)).reason, '历史楼层只读');
  await assert.rejects(api.commit(await api.load(0)), /历史/);
  const loaded = await api.load(); assert.equal(loaded.changed, true);
  assert.deepEqual(state.rows, before); assert.equal(state.writes.length, 0);
  state.hook = readCount => { if (readCount % 4 === 0) state.page++; };
  await assert.rejects(api.load(), /变化/); state.hook = null;
  const freshLoaded = await api.load();
  freshLoaded.floor.data.stat_data.基础活力 = 999;
  const result = await api.commit(freshLoaded); assert.equal(result.loaded.changed, false);
  assert.equal(state.rows[2].data.stat_data.活力, 132); assert.equal(state.rows[2].data.stat_data.当前活力, 62);
  assert.equal(state.writes.length, 1);
  assert.equal((await api.commit(await api.load())).unchanged, true);
  await assert.rejects(api.commit(structuredClone(result.loaded)), /重新读取/);
  async function dirty() { state.rows[2].data.stat_data.武器列表.短杖.isEquipped = false; return api.load(); }
  for (const mutate of [() => { state.page++; }, () => { state.rows[2].message += '改'; },
    () => { state.rows[2].data.otherPlugin.changed = true; }, () => { state.rows.push({ message_id: 3, role: 'user', data: {} }); }]) {
    const baseline = await dirty(); mutate(); await assert.rejects(api.commit(baseline), /变化|历史/);
    if (state.rows.length > 3) state.rows.pop();
  }
  let baseline = await dirty(); state.fail = true; await assert.rejects(api.commit(baseline), /保存失败/);
  state.fail = false; await api.commit(baseline); assert.equal(state.rows[2].data.stat_data.当前活力, 30);
  state.rows[2].data.stat_data.武器列表.短杖.isEquipped = true; baseline = await api.load();
  const a = api.commit(baseline), b = api.commit(baseline); await a; await assert.rejects(b, /变化/);
  for (const kind of ['CHAT_CHANGED', 'GENERATION_STARTED']) {
    baseline = await dirty(); const count = state.writes.length;
    emit(kind, 'normal', {}, false); await assert.rejects(api.commit(baseline), /取消|生成/);
    assert.equal(state.writes.length, count); emit('GENERATION_STOPPED');
  }
  let alive = true; baseline = await dirty(); alive = false; await assert.rejects(api.commit(baseline, () => alive), /取消/);
  const count = state.writes.length; state.rows[2].data.stat_data.武器列表.短杖.isEquipped = true;
  state.rows[2].data.stat_data.基础活力++;
  baseline = await api.load();
  modules['cryptLord.dynamicStatus'] = { status: () => ({ epoch: 0 }), async load() { state.page++; return { rules: [] }; }, apply() {} };
  await assert.rejects(api.commit(baseline), /变化/); assert.equal(state.writes.length, count);
  delete modules['cryptLord.dynamicStatus'];
  state.hook = () => { if (state.writes.length > count) throw Error('模拟保存后复核失败'); };
  const saved = await api.commit(await api.load());
  assert.equal(saved.loaded, null); assert.match(saved.warning, /已保存/);
  assert.equal(state.writes.length, count + 1); state.hook = null;
  baseline = await api.load(); api.dispose(); await assert.rejects(api.commit(baseline), /取消/);
});
