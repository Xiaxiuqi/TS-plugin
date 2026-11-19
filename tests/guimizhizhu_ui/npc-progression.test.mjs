import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const fixtureSource = await read('tests/guimizhizhu_ui/npc-progression.fixture.js');
const files = ['ability-state', 'battle-experience', 'attribute-recalculation', 'player-progression', 'npc-progression',
  'native-settlement', 'variable-patch', 'response-normalizer', 'state-store', 'generation-bridge'];
const sources = await Promise.all(files.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const dynamicSource = await read('public/guimizhizhu_ui/core/dynamic-status.js');
const [original, schema] = await Promise.all(['34a-js-worldbook-database-tools', '34b-js-schema-time-currency-domain']
  .map(name => read(`数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}.txt`)));
const plain = value => JSON.parse(JSON.stringify(value)), keys = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
function fixture() {
  const runtime = { console, structuredClone, DOMException }; runtime.window = runtime; vm.createContext(runtime);
  vm.runInContext(fixtureSource, runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { ...runtime.preview, preview: runtime.preview, runtime, api: runtime.preview.service, state: runtime.preview.flags };
}
function extract(source, predicate) {
  const tree = ts.createSourceFile('original.js', source, 99, true, ts.ScriptKind.JS); let text;
  function visit(node) { if (predicate(node, tree)) text = node.getText(tree); if (!text) ts.forEachChild(node, visit); }
  visit(tree); assert.ok(text); return text;
}
function random(seed = 42) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function oracle(rules, pool) {
  const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank', 'getSequenceDivinity',
    'getSequenceBaseValue', 'parseAbilitySystem', 'allocateAttributes', 'getAndFixAbilitySystem', 'getAbilitySystemFromWorldbook', 'getAndFixNpcTemplateMultiplier',
    'NPC_GENERATED_FALLBACK_ABILITY', 'generateNpcAbilities', 'BATTLE_EXP', 'normBattleRank', 'battleExpDeathXP',
    'battleExpNeedByRank', 'battleExpNeedRankForLevel', 'battleExpNeedForLevel', 'battleExpLevelCap', 'battleExpMultiplier', 'settleBattleExp'];
  const declarations = names.map(name => extract(original, node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(value => value.name.getText() === name)));
  declarations.push(extract(original, node => ts.isFunctionDeclaration(node) && node.name?.getText() === 'createNpcGeneratedFallbackAbility'));
  const transform = extract(schema, node => ts.isArrowFunction(node) &&
    node.getText().includes('[NPC序列变动]') && node.getText().includes('$完全自主造物'));
  const fakeMath = Object.create(Math); fakeMath.random = random();
  const result = vm.runInNewContext(`${declarations.join('\n')}\n({
    transform:${transform}, draw:generateNpcAbilities, template:getAndFixNpcTemplateMultiplier })`,
  { GameDBManager: { DB: rules }, Math: fakeMath, console: { log() {} }, applyDynamicStatus: npc => npc,
    BaseAttributesSchema: { shape: Object.fromEntries(keys.map(key => [key, {}])) },
    ATTR_MAP: Object.fromEntries(keys.filter(key => key !== '运气').map(key => [`当前${key}`, { max: key }])),
    fetchAvailableAbilities: () => structuredClone(pool), window: {} });
  return { ...result, reset: () => { fakeMath.random = random(); } };
}
test('完整NPC原版对照：模板、神性、经验六维、资源、加权能力和自主造物', () => {
  const { api, modules, floors, baseline, books } = fixture(), rules = api.defaults();
  const pathPool = { pathways: JSON.parse(books['1源堡'][3].content), abilities: JSON.parse(books['1源堡'][4].content) };
  const fetchDeclaration = extract(original, node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(value => value.name.getText() === 'fetchAvailableAbilities'));
  const dependencies = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'getPureName', 'buildAbilityKey'].map(name => extract(original,
    node => ts.isVariableStatement(node) && node.declarationList.declarations.some(value => value.name.getText() === name)));
  const fetchOriginal = vm.runInNewContext(`${dependencies.join('\n')}\n${fetchDeclaration}\nfetchAvailableAbilities`,
    { GameDBManager: { DB: { godPathways: pathPool.pathways, sequenceAbilities: pathPool.abilities } } });
  for (const sequence of ['普通人', '序列9-占卜家', '序列8-小丑', '序列9-占卜家/序列8-小丑', '未知'])
    assert.deepEqual(plain(modules['cryptLord.abilityState'].available(pathPool, sequence, false)), plain(fetchOriginal(sequence, false)));
  const available = { '序列9-占卜家': Array.from({ length: 12 }, (_, i) => ({ 名称: `低阶${i}`, power: i, range: 0 })),
    '序列8-小丑': Array.from({ length: 8 }, (_, i) => ({ 名称: `高阶${i}`, effects: [{ stat: '活力', value: i }] })) };
  const reference = oracle(rules, available);
  const fallback = extract(original, node => ts.isPropertyAssignment(node) && node.name?.getText() === 'npcTemplateConfig' && node.getText().includes('rankRules'));
  assert.deepEqual(plain(rules.npcTemplateConfig), plain(vm.runInNewContext(`({${fallback}})`).npcTemplateConfig));
  assert.deepEqual(plain(api.fallbackAbility()), plain(reference.draw({}, 10)[0]));
  for (const rank of [-2, -1, 0, .5, 2, 4, 5, 7, 8, 9, 10]) {
    reference.reset(); assert.deepEqual(plain(api.draw(available, rank, random())), plain(reference.draw(available, rank)));
    for (const template of ['普通', '未知', '精英（夜间）', '头目', '首领']) {
      const npc = { 模板: template }, expected = { 模板: template };
      assert.equal(api.templateMultiplier(npc, rank, rules.npcTemplateConfig), reference.template(expected, rank));
      assert.deepEqual(npc, expected);
    }
  }
  const abilitiesApi = modules['cryptLord.abilityState'];
  modules['cryptLord.abilityState'] = { ...abilitiesApi, available: () => structuredClone(available) };
  for (const scenario of [
    { 当前序列: '普通人', initialized: false },
    { 当前序列: '序列9-占卜家', initialized: false },
    { 当前序列: '序列5-星象师', initialized: true, _lastSequence: '序列6-卷轴教授' },
    { 当前序列: '支柱', initialized: false, $战斗经验: 99999 },
    { 当前序列: '序列0.5-测试', initialized: false, 模板: '首领' },
    { 当前序列: '序列9-无序列能力的测试用例', initialized: false },
    { 当前序列: '序列9-占卜家', initialized: true, _lastSequence: '序列9-占卜家', $战斗经验: 150 },
  ]) {
    const npc = { ...structuredClone(floors[2].data.npc_data.克莱恩), ...scenario };
    npc.模板 ||= '普通'; npc.能力体系 = '';
    for (const current of [null, undefined, NaN, 0, 10, -2, 99999]) {
      const input = { ...structuredClone(npc), 当前活力: current };
      reference.reset(); const expected = reference.transform(structuredClone(input));
      const actual = api.settle({ npc_data: { 人物: input } }, rules, undefined, undefined, () => random()).data.npc_data.人物;
      assert.deepEqual(plain(actual), plain(expected), `${scenario.当前序列}/${current}`);
      assert.deepEqual(actual.legacy, input.legacy);
    }
  }
  modules['cryptLord.abilityState'] = abilitiesApi;
  for (const current of [null, undefined, NaN, -2, 0, 10, 99999]) {
    const npc = { ...structuredClone(floors[2].data.npc_data.自主造物), 当前活力: current, 活力: 99999,
      当前序列: '支柱', 能力清单: [{ 名称: '伪造能力' }] };
    const expected = reference.transform(structuredClone(npc));
    const actual = api.settle({ npc_data: { 工程: npc } }, rules).data.npc_data.工程;
    assert.deepEqual(plain(actual), plain(expected));
    assert.deepEqual(plain(actual.$造物机械基准), plain(baseline));
  }
  const missing = structuredClone(floors[2].data.npc_data.自主造物); delete missing.$造物机械基准;
  assert.deepEqual(plain(api.settle({ npc_data: { 工程: missing } }, rules).data.npc_data.工程),
    plain(reference.transform(structuredClone(missing))));
  assert.throws(() => api.settle({ npc_data: { 坏: { $战斗经验: Infinity } } }), /经验/);
  assert.throws(() => api.settle({ npc_data: { 坏: { initialized: true, 能力清单: {} } } }), /能力清单/);
});
test('原生完整保存链：首次/晋升/受伤/经验/造物保护、预览确认与战斗隔离', async () => {
  const { api, floors, state, modules, baseline } = fixture(), store = modules['cryptLord.stateStore'];
  const protectedFloors = structuredClone(floors.slice(0, 2)), player = structuredClone(floors[2].data.stat_data), text = floors[2].message;
  const loaded = await api.load(2), repeat = await api.load(2);
  assert.equal(state.writes.length, 0); assert.equal(loaded.reports.length, 3);
  assert.deepEqual(loaded.reports[0].abilities, repeat.reports[0].abilities);
  const expectedDraw = plain(loaded.reports[0].abilities);
  await api.commit(loaded);
  assert.equal(state.writes.length, 1); assert.deepEqual(plain(floors[2].data.npc_data.克莱恩.能力清单), expectedDraw);
  assert.equal(floors[2].data.npc_data.克莱恩.$战斗经验等级, 2);
  assert.equal(floors[2].data.npc_data.克莱恩.当前活力, floors[2].data.npc_data.克莱恩.活力);
  assert.equal(floors[2].data.npc_data.伦纳德.当前活力, 30);
  assert.equal(floors[2].data.npc_data.自主造物.当前活力, 30);
  assert.deepEqual(floors[2].data.npc_data.$meta, { extensible: true });
  assert.deepEqual(floors[2].data.stat_data, player); assert.equal(floors[2].message, text); assert.deepEqual(plain(floors.slice(0, 2)), plain(protectedFloors));
  const consistent = await api.load(2); assert.equal(consistent.changed, false);
  await api.commit(consistent); assert.equal(state.writes.length, 1);
  const daily = structuredClone(floors[2].data);
  daily.npc_data.克莱恩.initialized = false; daily.npc_data.克莱恩.当前活力 = 10; daily.npc_data.克莱恩.$战斗经验 = 175;
  daily.npc_data.自主造物.$完全自主造物 = false; daily.npc_data.自主造物.$造物机械基准.活力 = 9999;
  await store.writeAssistantData(2, daily);
  assert.equal(floors[2].data.npc_data.克莱恩.当前活力, 10); assert.equal(floors[2].data.npc_data.克莱恩.$战斗经验等级, 3);
  assert.deepEqual(plain(floors[2].data.npc_data.克莱恩.能力清单), expectedDraw);
  assert.equal(floors[2].data.npc_data.自主造物.$完全自主造物, true);
  assert.deepEqual(plain(floors[2].data.npc_data.自主造物.$造物机械基准), plain(baseline));
  const prior = structuredClone(floors[2].data);
  floors[0].data = structuredClone(prior);
  Object.assign(floors[2].data.npc_data.克莱恩, { 当前序列: '序列8-小丑', _lastSequence: '序列8-小丑', initialized: true });
  await modules['cryptLord.nativeFloorBridge'].completeNarrative(text, { userMessageId: 1, assistantMessageId: 2,
    userText: '调查', narrativeText: '正文', floorText: text, guard: () => true });
  // Previous native floor, not forged markers on the target, remains authoritative.
  assert.equal(floors[2].data.npc_data.克莱恩.当前序列, '序列9-占卜家');
  const raw = text + '<UpdateVariable><JSONPatch>{"npc_data":[{"op":"replace","path":"/克莱恩/当前序列","value":"序列8-小丑"}]}</JSONPatch></UpdateVariable>';
  const count = state.writes.length;
  await modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, { userMessageId: 1, assistantMessageId: 2,
    userText: '调查', narrativeText: '正文', floorText: raw, guard: () => true });
  assert.equal(state.writes.length, count + 1);
  assert.equal(floors[2].data.npc_data.克莱恩._lastSequence, '序列8-小丑');
  assert.equal(floors[2].data.npc_data.克莱恩.当前活力, floors[2].data.npc_data.克莱恩.活力);
  assert.ok(floors[2].data.npc_data.克莱恩.能力清单.some(ability => ability.名称 === '身体控制'));
  const saved = structuredClone(floors[2].data);
  await store.writeAssistantMessage(2, text, {}, { preserveData: true }); assert.deepEqual(floors[2].data, saved);
  for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
    const held = structuredClone(saved); held.cryptLord.teamBattle = battle; held.npc_data.克莱恩.当前序列 = '序列7-魔术师';
    state.failBook = true; await store.writeAssistantData(2, held); state.failBook = false;
    assert.equal(floors[2].data.npc_data.克莱恩.活力, saved.npc_data.克莱恩.活力);
    assert.equal((await api.load(2)).editable, false);
  }
  floors[2].data.cryptLord.teamBattle.settled = true;
  await store.writeAssistantData(2, floors[2].data); assert.equal(floors[2].data.npc_data.克莱恩.模板, '精英');
  const history = await api.load(0); history.editable = true; history.floor.message_id = 2;
  await assert.rejects(api.commit(history), /只读/);
});
test('完整事务与故障：规则/消息页/正文/数据冲突、能力稳定、失败重试、取消与保存复核', async () => {
  const { api, floors, state, books, modules, emit } = fixture(), store = modules['cryptLord.stateStore'];
  let loaded = await api.load(2);
  state.page++; await assert.rejects(api.commit(loaded), /变化/); state.page--;
  loaded = await api.load(2); floors[2].message += '外部修改'; await assert.rejects(api.commit(loaded), /变化/);
  loaded = await api.load(2); floors[2].data.otherPlugin.keep = false; await assert.rejects(api.commit(loaded), /变化/);
  loaded = await api.load(2); books['1源堡'][0].content = '{"9":1100}'; await assert.rejects(api.commit(loaded), /变化/);
  books['1源堡'][0].content = '{"10":600,"9":1000,"8":2000,"7":4000}';
  loaded = await api.load(2); const draw = plain(loaded.reports[0].abilities);
  state.failWrite = true; await assert.rejects(api.commit(loaded), /保存失败/); state.failWrite = false;
  assert.equal(state.writes.length, 0); assert.deepEqual(plain((await api.load(2)).reports[0].abilities), draw);
  // 配置条目损坏时按原版跳过，不阻断保存；这里只确认不抛错。
  books['1源堡'][0].content = '{坏JSON}'; await assert.doesNotReject(api.prepare(structuredClone(floors[2].data)));
  assert.equal(state.writes.length, 0); books['1源堡'][0].content = '{"10":600,"9":1000}';
  await assert.rejects(store.writeAssistantData(2, floors[2].data, 'affected', () => {
    books['1源堡'][0].content = '{"10":600,"9":1001}';
  }), /变化/);
  assert.equal(state.writes.length, 0);
  loaded = await api.load(2); emit('CHAT_CHANGED'); await assert.rejects(api.commit(loaded), /取消/);
  loaded = await api.load(2); emit('GENERATION_STARTED', 'normal', {}, false); await assert.rejects(api.commit(loaded), /取消/);
  emit('GENERATION_STOPPED');
  let alive = true; state.hook = () => { alive = false; };
  await assert.rejects(api.load(2, () => alive), /取消/); state.hook = null;
  loaded = await api.load(2);
  state.afterWriteFail = true;
  const result = await api.commit(loaded); assert.match(result.warning, /已保存，但复核失败/);
  assert.equal(state.writes.length, 1); assert.equal(result.loaded, null);
  state.afterWriteFail = false; state.failRead = false;
  assert.equal((await api.load(2)).changed, false);
  const absent = structuredClone(floors[2].data); absent.npc_data = { 新人物: { 当前序列: '普通人' } };
  books['1源堡'] = [];
  assert.equal((await api.prepare(absent)).data.npc_data.新人物.能力清单[0].$系统兜底攻击, true);
  books['1源堡'] = [{ name: '[序列能力]坏', content: '{坏}' }];
  await assert.rejects(api.prepare(absent), /格式损坏/);
  loaded = { changed: true, editable: true }; await assert.rejects(api.commit(loaded), /重新读取/);
  api.dispose(); await assert.rejects(api.prepare(absent), /取消/);
  const isolated = fixture(), attributes = isolated.modules['cryptLord.attributeRecalculation'];
  Object.assign(isolated.floors[2].data.stat_data, { 当前序列: '普通人', initialized: false, 消化进度: 0 });
  const npcBefore = structuredClone(isolated.floors[2].data.npc_data);
  await attributes.commit(await attributes.load(2));
  assert.deepEqual(isolated.floors[2].data.npc_data, npcBefore);
  isolated.runtime._ = lodash; vm.runInContext(dynamicSource, isolated.runtime);
  const rule = { name: '受伤', targetScope: 'npc', conditions: [{ target: '当前活力', operator: '<', value: 35 }],
    output: { type: 'NPC', description: '需要治疗' } };
  isolated.books['1源堡'].push({ name: '【动态规则】受伤', content: JSON.stringify(rule) });
  isolated.floors[2].data.stat_data.当前状态 = { 手动: '保留玩家状态' };
  isolated.floors[2].data.npc_data.伦纳德.当前状态 = { '[NPC]过期': '旧状态', 手动: '保留NPC状态' };
  const playerBefore = structuredClone(isolated.floors[2].data.stat_data);
  let dynamicPreview = await isolated.api.load(2);
  isolated.books['1源堡'].at(-1).content = JSON.stringify({ ...rule, output: { ...rule.output, description: '规则变动' } });
  await assert.rejects(isolated.api.commit(dynamicPreview), /变化/);
  dynamicPreview = await isolated.api.load(2); await isolated.api.commit(dynamicPreview);
  assert.deepEqual(isolated.floors[2].data.stat_data, playerBefore);
  assert.deepEqual(isolated.floors[2].data.npc_data.伦纳德.当前状态, { 手动: '保留NPC状态', '[NPC]受伤': '规则变动' });
  assert.deepEqual(isolated.floors[2].data.npc_data.$meta, { extensible: true });
});
