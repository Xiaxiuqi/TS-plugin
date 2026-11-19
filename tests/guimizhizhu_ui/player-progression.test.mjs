import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const files = ['ability-state', 'battle-experience', 'attribute-recalculation', 'player-progression', 'mystery-analysis',
  'native-settlement', 'variable-patch', 'response-normalizer', 'state-store', 'generation-bridge'];
const sources = await Promise.all(files.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const [original, schemaSource] = await Promise.all(['34a-js-worldbook-database-tools', '34c-js-war-sim-and-strategies']
  .map(name => read(`数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}.txt`)));
const keys = ['活力', '敏捷', '灵性', '理智', '人性', '运气'], plain = value => JSON.parse(JSON.stringify(value));
const profile = Object.fromEntries(keys.map(key => [key, 1 / 6]));
function data() {
  return { stat_data: { 当前序列: '普通人', initialized: true, _lastSequence: '普通人', _lastDigestion: 10,
    消化进度: 10, 失控进度: 0, 能力体系: '均衡', 神性: 1, 基准总值: 600, $战斗经验: 0, $战斗经验等级: 0,
    ...Object.fromEntries(keys.flatMap(key => [[`基础${key}`, 100], [key, 100], ...(key === '运气' ? [] : [[`当前${key}`, 30]])])),
    非凡特性列表: {}, legacy: { keep: true } }, npc_data: { 保留: { 活力: 8 } },
    world_data: {}, cryptLord: { keep: true }, otherPlugin: { keep: true } };
}
function fixture() {
  const modules = {}, handlers = new Map(), events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_STOPPED: 'stop' };
  const state = { rows: [{ message_id: 0, role: 'assistant', message: '开场', data: data() },
    { message_id: 1, role: 'user', message: '晋升', data: { protected: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>调查：街道上的灯已经点亮。</gametxt>', data: data() }],
  variables: { otherPlugin: { keep: true } }, writes: [], configWrites: [], page: 0, script: 'progression-test',
  binding: { primary: '1源堡', additional: [] }, failRead: false, failWrite: false, failConfig: false, hook: null, configHook: null,
  books: { '1源堡': [
    { uid: 1, name: '序列基准', content: '{"10":600,"9":1000,"8":2000}' },
    { uid: 2, name: '能力体系配置', content: JSON.stringify({ systems: { 均衡: profile,
      神秘法术系: { 活力: .1, 敏捷: .2, 灵性: .35, 理智: .2, 人性: .1, 运气: .05 } },
      aliases: { 自定义均衡: '均衡' }, defaultSystem: '均衡' }) },
    { uid: 3, name: '能力体系映射', content: '{"占卜家":"神秘法术系","小丑":"均衡"}' },
    { uid: 4, name: '[神之途径]占卜家', content: '{"占卜家":["序列9-占卜家","序列8-小丑"]}' },
    { uid: 5, name: '[序列能力]序列9-占卜家', content: '{"占卜家-序列9":[{"name":"灵视"}],"占卜家-序列8":[{"name":"身体控制"}]}' },
  ] } };
  modules['cryptLord.hostApi'] = {
    getScriptId() { return state.script; },
    async getVariables(options) {
      assert.equal(options.type, 'script'); assert.equal(options.script_id, state.script);
      if (state.failConfig) throw Error('模拟配置失败'); return structuredClone(state.variables);
    },
    async updateVariablesWith(fn, options) {
      assert.equal(options.script_id, state.script); await state.configHook?.();
      state.variables = structuredClone(await fn(structuredClone(state.variables))); state.configWrites.push(1);
    },
    async getCharWorldbookNames() { return structuredClone(state.binding); },
    async getWorldbook(name) {
      await state.hook?.(name);
      if (state.failRead) throw Error('模拟数据库读取失败');
      if (!state.books[name]) throw Error(`世界书「${name}」不存在`);
      return structuredClone(state.books[name]);
    },
    async getChatMessages(range, options) {
      const rows = range === '0-{{lastMessageId}}' ? state.rows : state.rows.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => ({ ...row, swipe_id: state.page, swipes: [row.message, row.message] })) : rows);
    },
    async setChatMessages(rows, options) {
      if (state.failWrite) throw Error('模拟楼层保存失败');
      assert.equal(rows.length, 1); assert.equal(rows[0].message_id, 2); assert.equal(options.refresh, 'affected');
      Object.assign(state.rows[2], structuredClone(rows[0])); state.writes.push(2);
    },
    generateRaw() { assert.fail('成长不请求模型'); },
  };
  modules['cryptLord.afterNativeHost'] = { getHost: () => ({ window: runtime }), tavernEvents: () => events, bindEvent(name, fn) {
    const set = handlers.get(name) || new Set(); handlers.set(name, set); set.add(fn); return { stop: () => set.delete(fn) };
  } };
  modules['cryptLord.contextBuilder'] = {};
  modules['cryptLord.variableSettlementApi'] = { async settle({ previousData }) {
    return { skipped: true, data: structuredClone(previousData), response: '' };
  } };
  const runtime = { console, structuredClone, DOMException, cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
  } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, runtime, api: modules['cryptLord.playerProgression'],
    emit: (key, ...args) => { for (const fn of handlers.get(events[key]) || []) fn(...args); } };
}
function extract(source, predicate) {
  const tree = ts.createSourceFile('original.js', source, 99, true, ts.ScriptKind.JS); let text;
  function visit(node) { if (predicate(node, tree)) text = node.getText(tree); if (!text) ts.forEachChild(node, visit); }
  visit(tree); assert.ok(text); return text;
}
function oracle(rules) {
  const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank', 'getSequenceDivinity',
    'getSequenceBaseValue', 'parseAbilitySystem', 'allocateAttributes', 'getAndFixAbilitySystem', 'getAbilitySystemFromWorldbook',
    'safeGetValue', 'GLOBAL_ATTR_CONFIG', 'calculateRealMaxAttributes', 'BATTLE_EXP', 'normBattleRank',
    'battleExpDeathXP', 'battleExpNeedByRank', 'battleExpNeedRankForLevel', 'battleExpNeedForLevel',
    'battleExpLevelCap', 'battleExpMultiplier', 'settleBattleExp'];
  const declarations = names.map(name => extract(original, node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(value => value.name.getText() === name)));
  const transform = extract(schemaSource, node => ts.isArrowFunction(node) && node.getText().includes('[玩家序列变动]'));
  const reference = vm.runInNewContext(`${declarations.join('\n')}\n({
    transform: ${transform}, rank: parseSequenceRank, system: getAbilitySystemFromWorldbook, allocate: allocateAttributes })`,
  { _: lodash, GameDBManager: { DB: rules }, window: {}, console: { log() {}, warn() {} }, applyDynamicStatus: stat => stat });
  return reference;
}
test('整项成长规则原版独立对照：序列、体系、配额、神性、消化、经验与初始化', () => {
  const { api } = fixture(), rules = api.defaults(), reference = oracle(rules);
  for (const sequence of ['普通人', '9', '0.5', '序列9-占卜家', '序列: 4.5', '旧日', '支柱', '旧日侍者', '序列2-旧日侍者'])
    assert.equal(api.rank(sequence), reference.rank(sequence));
  const fallback = extract(original, node => ts.isPropertyAssignment(node) && node.name?.getText() === '_fallback');
  const fields = ['sequenceBase', 'abilitySystemConfig', 'abilitySystemDB', 'divinityConfig'];
  const relevant = fields.map(field => extract(`({${fallback}})`, node =>
    ts.isPropertyAssignment(node) && node.name?.getText() === field));
  const originalDefaults = vm.runInNewContext(`({${relevant.join(',')}})`);
  for (const field of ['sequenceBase', 'abilitySystemConfig', 'abilitySystemDB', 'divinityConfig'])
    assert.deepEqual(plain(rules[field]), plain(originalDefaults[field]));
  for (const quota of [200, 300, 1000, 15000, 3000000]) for (const system of Object.keys(rules.abilitySystemConfig.systems)) {
    assert.deepEqual(plain(api.allocate(quota, api.ratesFor(system, rules))), plain(reference.allocate(quota, system)));
    assert.equal(Object.values(api.allocate(quota, api.ratesFor(system, rules))).reduce((a, b) => a + b), quota);
  }
  for (const scenario of [
    { 当前序列: '普通人', initialized: false, 消化进度: 0 },
    { 当前序列: '序列9-占卜家', initialized: false, 消化进度: 45 },
    { 当前序列: '序列4-神秘学家', initialized: true, _lastSequence: '序列5-星象师', _lastDigestion: 99, 消化进度: 99 },
    { 当前序列: '旧日侍者', initialized: false, 消化进度: 100, $战斗经验: 99999 },
  ]) {
    const input = data(); Object.assign(input.stat_data, scenario);
    input.stat_data.能力体系 = ''; keys.forEach(key => { if (key !== '运气') input.stat_data[`当前${key}`] = null; });
    const expected = reference.transform(structuredClone(input.stat_data)), result = api.finalize(api.settle(input, rules));
    for (const key of ['当前序列', '能力体系', '神性', '基准总值', '消化进度', 'initialized', '_lastSequence', '_lastDigestion',
      '$战斗经验', '$战斗经验等级', ...keys.flatMap(key => [`基础${key}`, key, ...(key === '运气' ? [] : [`当前${key}`])])])
      assert.equal(result.data.stat_data[key], expected[key], `${scenario.当前序列}/${key}`);
    assert.deepEqual(result.data.otherPlugin, input.otherPlugin); assert.deepEqual(result.data.stat_data.legacy, { keep: true });
  }
  for (const digestion of [0, 8, 10, 12, 90]) {
    const input = data(); input.stat_data.消化进度 = digestion;
    const expected = reference.transform(structuredClone(input.stat_data)), result = api.settle(input, rules);
    assert.equal(result.data.stat_data.消化进度, expected.消化进度);
  }
  const aliased = api.defaults(); aliased.abilitySystemConfig.aliases = { 法术: '神秘法术系' };
  aliased.abilitySystemDB = { 占卜家: '法术' };
  assert.equal(api.abilitySystem('序列9-占卜家', '物理突击系', true, aliased), '法术');
  assert.equal(api.abilitySystem('序列9-占卜家', '物理突击系', false, aliased), '物理突击系');
  assert.deepEqual(api.ratesFor('法术', aliased), aliased.abilitySystemConfig.systems.神秘法术系);
  assert.throws(() => api.validateRules({ ...rules, abilitySystemConfig: { ...rules.abilitySystemConfig, systems: { 坏: profile }, defaultSystem: '不存在' } }));
  assert.throws(() => api.settle({ stat_data: { 当前序列: '9', 消化进度: Infinity } }), /消化/);
  assert.throws(() => api.settle({ stat_data: { 当前序列: '9', 消化进度: {} } }), /消化/);
  for (const current of [null, undefined, '坏值', {}]) {
    const input = data(); input.stat_data.当前活力 = current; input.stat_data.活力 = 90;
    const result = api.finalize(api.settle(input, rules));
    assert.equal(result.data.stat_data.当前活力, result.data.stat_data.活力);
  }
});
test('完整正式保存与预览修正：原生回合晋升、资源、日常限制、经验与战斗隔离', async () => {
  const { state, modules, api } = fixture(), store = modules['cryptLord.stateStore'], attributes = modules['cryptLord.attributeRecalculation'];
  const protectedFloors = structuredClone(state.rows.slice(0, 2)), originalMessage = state.rows[2].message;
  const loaded = await attributes.load(2);
  assert.equal(loaded.changed, false); assert.equal(loaded.report.progression.kind, '日常成长');
  assert.equal(state.writes.length, 0); assert.equal(state.configWrites.length, 0);
  const daily = structuredClone(state.rows[2].data);
  daily.stat_data.消化进度 = 90; daily.stat_data._lastDigestion = 90; daily.stat_data.initialized = false;
  await store.writeAssistantData(2, daily);
  assert.equal(state.rows[2].data.stat_data.消化进度, 13); assert.equal(state.rows[2].data.stat_data.当前活力, 30);
  const repeated = structuredClone(state.rows[2].data); await store.writeAssistantData(2, repeated); assert.deepEqual(state.rows[2].data, repeated);
  const raw = originalMessage + '<UpdateVariable><JSONPatch>{"stat_data":[' +
    '{"op":"replace","path":"/当前序列","value":"序列9-占卜家"},' +
    '{"op":"replace","path":"/消化进度","value":99},{"op":"replace","path":"/$战斗经验","value":210}]}</JSONPatch></UpdateVariable>';
  const count = state.writes.length;
  await modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, { assistantMessageId: 2, userMessageId: 1,
    userText: '晋升', narrativeText: '正文', floorText: raw, guard: () => true });
  const stat = state.rows[2].data.stat_data;
  assert.equal(state.writes.length, count + 1); assert.equal(stat.消化进度, 0);
  assert.equal(stat.能力体系, '神秘法术系'); assert.equal(stat.基准总值, 1000);
  assert.equal(stat.基础灵性, 350); assert.equal(stat.$战斗经验等级, 2); assert.equal(stat.$战斗经验, 60);
  assert.equal(stat.当前活力, stat.活力); assert.equal(stat.活力, 104);
  assert.deepEqual(state.rows.slice(0, 2), protectedFloors); assert.deepEqual(state.rows[2].data.otherPlugin, { keep: true });
  const injured = structuredClone(state.rows[2].data); injured.stat_data.当前活力 = 10;
  injured.stat_data.$战斗经验 = 175; await store.writeAssistantData(2, injured);
  assert.equal(state.rows[2].data.stat_data.$战斗经验等级, 3); assert.equal(state.rows[2].data.stat_data.当前活力, 12);
  const preserve = structuredClone(state.rows[2].data);
  await store.writeAssistantMessage(2, state.rows[2].message, data(), { preserveData: true }); assert.deepEqual(state.rows[2].data, preserve);
  for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
    const held = structuredClone(state.rows[2].data); held.cryptLord.teamBattle = battle; held.stat_data.当前序列 = '序列8-小丑';
    state.failConfig = true; await store.writeAssistantData(2, held); state.failConfig = false;
    assert.equal(state.rows[2].data.stat_data.基础灵性, 350); assert.equal(state.rows[2].data.stat_data.当前活力, 12);
  }
  const ended = structuredClone(state.rows[2].data); ended.cryptLord.teamBattle.settled = true;
  await store.writeAssistantData(2, ended); assert.equal(state.rows[2].data.stat_data.能力体系, '均衡');
  assert.equal(state.rows[2].data.stat_data.当前活力, state.rows[2].data.stat_data.活力);
  assert.equal((await attributes.load(0)).editable, false);
  const draft = structuredClone(state.rows[2].data); draft.stat_data.基础活力 = 1;
  state.rows[2].data = draft; const repair = await attributes.load(2);
  assert.equal(repair.changed, true); await attributes.commit(repair);
  assert.equal(state.rows[2].data.stat_data.基础活力, 334);
  assert.equal(api.status().ready, true);
});
test('设置及世界书事务：显式脚本身份、优先级、完整修订、错误保护与取消', async () => {
  const { state, modules, api, emit } = fixture();
  const defaults = await api.readSettings(); assert.equal(defaults.settings.maxDigestionDelta, 3); assert.equal(state.configWrites.length, 0);
  const saved = await api.saveSettings(8, defaults.revision);
  assert.equal(saved.settings.maxDigestionDelta, 8); assert.deepEqual(state.variables.otherPlugin, { keep: true });
  state.variables['cryptLord.playerProgression'].future = { keep: true };
  const fresh = await api.readSettings(); await api.saveSettings(4, fresh.revision);
  assert.deepEqual(state.variables['cryptLord.playerProgression'].future, { keep: true });
  for (const value of [0, 101, 2.5, Infinity, NaN]) await assert.rejects(api.saveSettings(value, (await api.readSettings()).revision), /整数/);
  let baseline = await api.readSettings(); state.variables['cryptLord.playerProgression'].maxDigestionDelta = 5;
  await assert.rejects(api.saveSettings(6, baseline.revision), /变化/);
  baseline = await api.readSettings();
  state.configHook = () => { state.variables['cryptLord.playerProgression'].maxDigestionDelta = 7; };
  await assert.rejects(api.saveSettings(6, baseline.revision), /变化/); state.configHook = null;
  baseline = await api.readSettings(); emit('CHAT_CHANGED'); await assert.rejects(api.saveSettings(6, baseline.revision), /取消/);
  baseline = await api.readSettings(); const a = api.saveSettings(9, baseline.revision), b = api.saveSettings(10, baseline.revision);
  await a; await assert.rejects(b, /变化/);
  const source = await api.prepare(data(), data().stat_data);
  state.books['1源堡'][0].content = '{"10":900}'; await assert.rejects(api.assertPrepared(source), /变化/);
  const before = structuredClone(state.rows);
  state.books['1源堡'][0].content = '{坏JSON}';
  await assert.rejects(modules['cryptLord.stateStore'].writeAssistantData(2, data()), /格式损坏/);
  assert.deepEqual(state.rows, before);
  state.books['1源堡'][0].content = '{"10":600}';
  const count = state.writes.length;
  let reads = 0, canSave = true;
  state.hook = name => { if (name === '1源堡' && ++reads === 3) canSave = false; };
  await assert.rejects(modules['cryptLord.stateStore'].writeAssistantData(2, data(), 'affected', undefined, () => canSave), /取消/);
  assert.equal(state.writes.length, count); state.hook = null;
  state.books['【源堡】玩家自建内容'] = [{ uid: 10, name: '序列基准', content: '{"10":777}' }];
  state.binding.additional = ['1源堡', '【源堡】玩家自建内容'];
  assert.equal((await api.prepare(data(), data().stat_data)).report.quota, 600);
  state.books['1源堡'].push({ uid: 4, name: '神性', content: '[{"min":10,"max":10,"val":1.1}]' });
  assert.equal((await api.prepare(data(), data().stat_data)).report.divinity, 1.1);
  state.hook = name => { if (name === '1源堡') emit('GENERATION_STARTED', 'normal', {}, false); };
  await assert.rejects(api.prepare(data(), data().stat_data), /取消/); state.hook = null;
  let alive = true; state.hook = () => { alive = false; };
  await assert.rejects(api.prepare(data(), data().stat_data, () => alive), /取消/); state.hook = null;
  modules['cryptLord.dynamicStatus'] = { status: () => ({ epoch: 0 }), async load() {
    state.books['1源堡'][0].content = '{"10":800}'; return { rules: [] };
  }, apply() {} };
  await assert.rejects(modules['cryptLord.stateStore'].writeAssistantData(2, data()), /变化/);
  assert.equal(state.writes.length, count); delete modules['cryptLord.dynamicStatus'];
  await assert.rejects(modules['cryptLord.stateStore'].writeAssistantData(2, data(), 'affected', () => {
    state.books['1源堡'][0].content = '{"10":900}';
  }), /变化/);
  assert.equal(state.writes.length, count);
  state.books['1源堡'][0].content = '{"10":600}';
  baseline = await api.readSettings();
  const originalUpdate = modules['cryptLord.hostApi'].updateVariablesWith;
  modules['cryptLord.hostApi'].updateVariablesWith = async (...args) => { await originalUpdate(...args); state.failConfig = true; };
  const warned = await api.saveSettings(11, baseline.revision); assert.match(warned.warning, /已保存/); assert.equal(warned.revision, null);
  state.failConfig = false; baseline = await api.readSettings(); api.dispose(); await assert.rejects(api.saveSettings(12, baseline.revision), /取消/);
});
