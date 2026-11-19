import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const fixtureText = await read('tests/guimizhizhu_ui/item-derivation.fixture.js');
const names = ['native-floor-source', 'ability-state', 'battle-experience', 'item-forge-reference', 'item-derivation-reference', 'attribute-recalculation',
  'item-derivation', 'equipment-state', 'inventory-state', 'relationship-state', 'variable-patch', 'response-normalizer', 'native-settlement', 'state-store', 'generation-bridge'];
const sources = await Promise.all(names.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const growthSources = await Promise.all(['player-progression', 'npc-progression'].map(name =>
  read(`public/guimizhizhu_ui/core/${name}.js`)));
const [tools, schema] = await Promise.all(['34a-js-worldbook-database-tools', '34b-js-schema-time-currency-domain']
  .map(name => read(`数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${name}.txt`)));
const plain = value => JSON.parse(JSON.stringify(value));
const stats = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];
function fixture() {
  const runtime = { console: { ...console, log() {}, warn() {} }, structuredClone, DOMException };
  runtime.window = runtime; vm.createContext(runtime); vm.runInContext(fixtureText, runtime);
  sources.forEach(source => vm.runInContext(source, runtime));
  return { runtime, ...runtime.preview, api: runtime.preview.service };
}
function extract(text, predicate) {
  const tree = ts.createSourceFile('original.js', text, 99, true, ts.ScriptKind.JS); let result;
  function visit(node) { if (predicate(node)) result = node.getText(tree); if (!result) ts.forEachChild(node, visit); }
  visit(tree); assert.ok(result); return result;
}
function rng(seed = 31) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function oracle(rules) {
  const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank', 'parseItemSequenceRank',
    'getSequenceBaseValue', 'getMaxBonusPercent', 'parseTraitSequenceRank', 'isMeaningfulTraitSequence',
    'tierToEquivalentSeqRank', 'getTraitDefaultBonusPercent', 'generateMundaneItemStats', 'generateItemStats',
    'generateConsumableStats', 'constrainBonusPercent', 'constrainSingleEquipment', 'pruneEmptyStackables'];
  const declarations = names.map(name => extract(tools, node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(value => value.name.getText() === name)));
  declarations.push(extract(schema, node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(value => value.name.getText() === 'syncSealedItemLevelAndNumber')));
  const transform = text => extract(schema, node => ts.isArrowFunction(node) && node.getText().includes(text));
  const fakeMath = Object.create(Math); fakeMath.random = rng();
  const api = vm.runInNewContext(`${declarations.join('\n')}\n({
    equipment:${transform('[装备系统]')}, consumable:${transform('[消耗品系统]')},
    method:${transform('playMethod.百分比加成 =')}, trait:${transform('hasValidBonus')},
    sealed:syncSealedItemLevelAndNumber, bonus:constrainBonusPercent })`, {
    GameDBManager: { DB: rules }, Math: fakeMath, console: { log() {} },
  });
  return { ...api, reset() { fakeMath.random = rng(); } };
}
const withoutMarker = item => { const copy = plain(item); delete copy.$物品属性同步; return copy; };
test('完整原版规则对照：装备、消耗品、封印物、加成、特性、数量和态度', () => {
  const { api, floors, modules } = fixture(), rules = api.defaults();
  rules.consumableConfig.符咒 = { powerRatio: 1, costRatio: .5, defaultCost: '灵性' };
  const original = oracle(rules);
  for (const sequence of ['普通', '无', '序列9', '序列5', '序列0.5', '旧日侍者', '旧日', '支柱'])
    for (const type of ['武器', '衣物', '饰品', '封印物']) {
      const item = { 名称: type, 类型: type, 序列: sequence, isEquipped: false, ...Object.fromEntries(stats.map(key => [key, 0])) };
      original.reset();
      const actual = api.settle({ stat_data: { 武器列表: { item } } }, rules, () => rng()).data.stat_data.武器列表.item;
      assert.deepEqual(withoutMarker(actual), plain(original.equipment(structuredClone(item))));
    }
  for (const effect of ['攻击', '恢复', '治疗', '增益', '强化', '其他'])
    for (const target of ['', '全属性', '灵性', '未知']) {
      const item = { 名称: '符咒', 类型: '符咒', 序列: '序列8', 效果: effect, 作用属性: target, 数量: 1 };
      original.reset();
      const actual = api.settle({ stat_data: { 消耗品列表: { item } } }, rules, () => rng()).data.stat_data.消耗品列表.item;
      assert.deepEqual(withoutMarker(actual), plain(original.consumable(structuredClone(item))));
    }
  for (const sequence of ['无', '序列9', '序列5', '序列2-旧日侍者', '序列0', '旧日', '支柱']) {
    const item = { 名称: '封印物', 序列: sequence, 级别: '3级封印物', 编号: '3-12', isEquipped: false,
      ...Object.fromEntries(stats.map(key => [key, 1])) };
    assert.deepEqual(withoutMarker(api.settle({ stat_data: { 封印物列表: { item } } }, rules).data.stat_data.封印物列表.item),
      plain(original.sealed(structuredClone(item))));
  }
  for (const bonus of [null, {}, { 全部属性: 300, 灵性: '-8%', 理智: '未知', $meta: { keep: true } }]) {
    const item = { 名称: '扮演', 序列: '序列9', isEquipped: false, 百分比加成: bonus };
    assert.deepEqual(plain(api.settle({ stat_data: { 扮演法列表: { item } } }, rules).data.stat_data.扮演法列表.item),
      plain(original.method(structuredClone(item))));
  }
  for (const tier of ['普通', '非凡', '罕见', '史诗', '传说', '神话', '唯一', '旧日', '支柱', '未知'])
    for (const bonus of [null, '', 4, '8%', { $meta: true }]) {
      const input = { 名称: '特性', 等阶: tier, 百分比加成: bonus }, expected = structuredClone(input);
      if (['string', 'number'].includes(typeof bonus)) expected.百分比加成 = { 全部属性: String(bonus) };
      assert.deepEqual(plain(api.settle({ stat_data: { 非凡特性列表: { input } } }, rules).data.stat_data.非凡特性列表.input),
        plain(original.trait(expected)));
    }
  const next = api.settle(floors[2].data, rules).data;
  assert.equal(next.stat_data.武器列表.first.isEquipped, false); assert.equal(next.stat_data.武器列表.last.isEquipped, true);
  assert.equal(next.stat_data.消耗品列表.empty, undefined); assert.equal(next.stat_data.其他列表.length, 1);
  const attitude = vm.runInNewContext(`${extract(schema, node => ts.isFunctionDeclaration(node) &&
    node.name?.getText() === 'deriveAttitudeFromAffinity')}\nderiveAttitudeFromAffinity`);
  for (const affinity of [-999, -200, -70, -69, -30, -29, -10, -9, 29, 30, 69, 70, 109, 110, 149, 150, 200, 999]) {
    const npc = api.settle({ stat_data: { 人物关系列表: { npc: { 好感度: affinity } } } }).data.stat_data.人物关系列表.npc;
    assert.equal(npc.好感度, Math.max(-200, Math.min(200, affinity)));
    assert.equal(npc['对<User>的态度'], attitude(npc.好感度));
  }
  assert.ok(modules['cryptLord.relationshipState'].list(next)[0].subjective.some(([key, value]) => key === '对你的态度' && value === '知己'));
  assert.deepEqual(plain(next.stat_data.辅助能力列表['#空想']), plain(floors[2].data.stat_data.辅助能力列表['#空想']));
  assert.deepEqual(plain(next.stat_data.消耗品列表.scroll), plain(floors[2].data.stat_data.消耗品列表.scroll));
  assert.equal(next.stat_data.武器列表.installed.活力, 0);
  assert.equal(next.stat_data.序列能力列表.序列9[0].名称, '灵视');
  assert.equal(next.stat_data.序列能力列表.序列9[0].range, 3);
  assert.deepEqual(plain(next.stat_data.序列能力列表.序列9[0].效果扩展), { keep: true });
  const preprocess = vm.runInNewContext(`(${extract(schema, node => ts.isArrowFunction(node) &&
    node.getText().includes('const migrated = {}'))})`);
  const oldAbilities = floors[2].data.stat_data.序列能力列表, expectedAbilities = preprocess(structuredClone(oldAbilities));
  for (const [group, list] of Object.entries(expectedAbilities)) for (let index = 0; index < list.length; index++)
    for (const [key, value] of Object.entries(list[index]))
      assert.deepEqual(plain(next.stat_data.序列能力列表[group][index][key]), plain(value));
  const protectedAbilities = { $meta: { keep: true }, '#放牧:能力': [{ 名称: '投影', 自定义标记: true }],
    '序列9': [{ 名称: '灵视', damageType: 'magic', aoeRadius: 2, other: '保留' }] };
  assert.deepEqual(plain(api.settle({ stat_data: { 序列能力列表: protectedAbilities } }).data.stat_data.序列能力列表['#放牧:能力']),
    protectedAbilities['#放牧:能力']);
  assert.equal(api.settle(next, rules).changed, false);
  const zeroRules = api.defaults();
  zeroRules.itemConfig.武器.p = [0, 0];
  zeroRules.consumableConfig.符咒 = { powerRatio: 0, costRatio: 0, defaultCost: '灵性' };
  const zero = api.settle({ stat_data: { 武器列表: { item: { 名称: '零属性剑', 类型: '武器', 序列: '序列9' } },
    消耗品列表: { item: { 名称: '零符咒', 类型: '符咒', 效果: '攻击' } } } }, zeroRules).data;
  assert.equal(fixture().api.settle(structuredClone(zero), zeroRules).changed, false);
  assert.throws(() => api.settle({ stat_data: { 武器列表: { bad: { 活力: 'NaN' } } } }), /无效/);
  assert.throws(() => api.settle({ stat_data: { 消耗品列表: { bad: { 数量: Infinity } } } }), /数量/);
});
test('完整原生保存链：整批预览确认、装备上限、背包操作、生成落层和专用范围', async () => {
  const { api, modules, floors, initial, flags } = fixture(), store = modules['cryptLord.stateStore'];
  const loaded = await api.load(2), repeated = await api.load(2);
  assert.equal(flags.writes.length, 0); assert.deepEqual(plain(loaded.reports), plain(repeated.reports));
  const saved = await api.commit(loaded);
  assert.equal(flags.writes.length, 1); assert.equal(saved.loaded.changed, false);
  assert.deepEqual(plain(floors.slice(0, 2)), plain(initial.slice(0, 2)));
  assert.equal(floors[2].message, initial[2].message);
  for (const field of ['npc_data', 'world_data', 'otherPlugin', 'cryptLord'])
    assert.deepEqual(plain(floors[2].data[field]), plain(initial[2].data[field]));
  const repeat = await api.commit(saved.loaded); assert.equal(repeat.unchanged, true); assert.equal(flags.writes.length, 1);
  const preserved = structuredClone(floors[2].data);
  await store.writeAssistantMessage(2, floors[2].message, {}, { preserveData: true });
  assert.deepEqual(plain(floors[2].data), plain(preserved));
  const inventory = modules['cryptLord.inventoryState'], baseline = await inventory.load(2);
  const row = baseline.groups.find(group => group.listKey === '武器列表').entries.find(item => item.itemKey === 'first');
  await inventory.commit(baseline, { type: 'equip', selection: row.selection });
  assert.equal(floors[2].data.stat_data.武器列表.last.isEquipped, false);
  assert.equal(floors[2].data.stat_data.武器列表.first.isEquipped, true);
  assert.equal(floors[2].data.stat_data.当前活力, 30 + floors[2].data.stat_data.活力 - 100);
  const raw = '<gametxt>获得新的符咒。</gametxt><UpdateVariable><JSONPatch>' +
    JSON.stringify({ stat_data: [{ op: 'add', path: '/消耗品列表/new', value: { 名称: '新符咒', 序列: '序列9', 类型: '符咒', 效果: '攻击' } }] }) +
    '</JSONPatch></UpdateVariable>';
  floors[0].data = structuredClone(floors[2].data);
  const count = flags.writes.length;
  await modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, { userMessageId: 1, assistantMessageId: 2,
    userText: '调查', narrativeText: '正文', floorText: raw, guard: () => true });
  assert.equal(flags.writes.length, count + 1); assert.ok(floors[2].data.stat_data.消耗品列表.new.伤害加成 > 0);
  const kept = structuredClone(floors[2].data);
  modules['cryptLord.npcProgression'] = {
    adopt(data) { return { data, prepared: {} }; }, async assertPrepared() {},
  };
  await store.writeAssistantMessage(2, raw, { npc_data: { 伙伴: { 活力: 100 } } }, { npcOnly: true, npcPrepared: {} });
  assert.deepEqual(plain(floors[2].data.stat_data), plain(kept.stat_data));
  delete modules['cryptLord.npcProgression'];
  for (const battle of [{ status: 'active' }, { status: 'finished', settled: false }]) {
    const held = structuredClone(floors[2].data); held.cryptLord.teamBattle = battle;
    held.stat_data.武器列表.first.活力 = 0; flags.failBook = true;
    await store.writeAssistantData(2, held); flags.failBook = false;
    assert.equal(floors[2].data.stat_data.武器列表.first.活力, 0);
    assert.equal((await api.load(2)).editable, false);
  }
  const combined = fixture();
  growthSources.forEach(source => vm.runInContext(source, combined.runtime));
  Object.assign(combined.floors[2].data.stat_data, { 当前序列: '普通人', initialized: true, _lastSequence: '普通人', 消化进度: 0 });
  await combined.modules['cryptLord.stateStore'].writeAssistantData(2, combined.floors[2].data);
  assert.equal(combined.flags.writes.length, 1);
  assert.equal(combined.floors[2].data.stat_data.基准总值, 200);
  assert.equal(combined.floors[2].data.npc_data.伙伴.initialized, true);
  assert.equal(combined.floors[2].data.stat_data.序列能力列表.序列9[0].名称, '灵视');
  assert.ok(combined.floors[2].data.stat_data.消耗品列表.charm.伤害加成 > 0);
  const playerPreview = await combined.modules['cryptLord.attributeRecalculation'].load(2);
  assert.equal(playerPreview.changed, false);
});
test('整批事务：规则/楼层/消息页冲突、取消、保存失败重试、已保存警告', async () => {
  const { api, modules, floors, books, binding, flags, runtime } = fixture(), store = modules['cryptLord.stateStore'];
  for (const change of [
    () => { floors[2].message += '外部修改'; },
    () => { flags.page++; },
    () => { books['1源堡'][1].content = '{"9":4}'; },
    () => { binding.additional.push('其他书'); },
  ]) {
    const loaded = await api.load(2); change(); await assert.rejects(api.commit(loaded), /变化/);
    assert.equal(flags.writes.length, 0);
  }
  flags.failBook = true; await assert.rejects(api.load(2), /读取失败/); flags.failBook = false;
  books['1源堡'][0].content = 'broken'; await assert.rejects(api.load(2), /格式损坏/);
  books['1源堡'][0].content = '{"符咒":{"powerRatio":1,"costRatio":0.5,"defaultCost":"灵性"}}';
  const loaded = await api.load(2); flags.failWrite = true;
  await assert.rejects(api.commit(loaded), /保存失败/); assert.equal(flags.writes.length, 0);
  flags.failWrite = false; await api.commit(loaded); assert.equal(flags.writes.length, 1);
  floors[2].data = structuredClone(floors[0].data);
  let guard = true;
  const cancelled = await api.load(2); guard = false;
  await assert.rejects(api.commit(cancelled, () => guard), /取消/);
  const history = await api.load(0); history.editable = true; history.floor.message_id = 2;
  await assert.rejects(api.commit(history), /有效物品校验/);
  const pending = await api.load(2); runtime.preview.emit('CHAT_CHANGED');
  await assert.rejects(api.commit(pending), /取消/);
  const input = structuredClone(floors[2].data); flags.hold = true;
  const late = store.writeAssistantData(2, input);
  while (!flags.waiting) await new Promise(resolve => setTimeout(resolve, 1));
  books['1源堡'][1].content = '{"9":5}'; runtime.preview.release();
  await assert.rejects(late, /物品规则已变化/);
  await assert.rejects(store.writeAssistantData(2, input, 'affected', () => { flags.page++; }, () => false), /取消/);
  const post = await api.load(2); flags.afterWriteFail = true;
  const recovery = api.begin(post);
  await assert.rejects(recovery.run(), /保存状态待核对/); assert.equal(recovery.status(), 'uncertain');
  await assert.rejects(recovery.save(), /不能重新提交/);
  flags.afterWriteFail = false; flags.failRead = false;
  const count = flags.writes.length, result = await recovery.inspect();
  assert.ok(result.loaded); assert.equal(flags.writes.length, count);
  for (const mode of ['retry', 'lost-receipt', 'no-write', 'different-result']) {
    const g = fixture(), preview = await g.api.load(2);
    const transaction = g.api.begin(preview), draft = structuredClone(g.floors[2].data);
    if (mode === 'retry') g.flags.failWrite = true;
    if (mode === 'lost-receipt') g.flags.lostReceipt = true;
    if (mode === 'no-write') g.flags.noWrite = true;
    if (mode === 'different-result') g.flags.conflictWrite = true;
    if (mode === 'lost-receipt') assert.match((await transaction.run()).warning, /回执异常/);
    else {
      await assert.rejects(transaction.run(), /结果已保留|保存后.*已变化/);
      if (mode === 'different-result') { assert.equal(transaction.status(), 'invalid'); continue; }
      assert.deepEqual(g.floors[2].data, draft); await assert.rejects(transaction.run(), /不能重复计算/);
      g.flags.failWrite = false; g.flags.noWrite = false;
      await transaction.save();
    }
    assert.equal(transaction.status(), 'saved'); assert.equal(g.flags.writes.length, 1);
    assert.equal(g.floors[2].data.stat_data.封印物列表.sealed.级别, '1级封印物');
  }
  for (const boundary of ['clone', 'branch', 'metadata', 'chat', 'script', 'writer', 'pool-on-retry', 'generation']) {
    const g = fixture(), preview = await g.api.load(2);
    if (boundary === 'clone') { await assert.rejects(g.api.commit(structuredClone(preview)), /有效物品/); continue; }
    const transaction = g.api.begin(preview);
    if (boundary === 'pool-on-retry') {
      g.flags.failWrite = true; await assert.rejects(transaction.run(), /结果已保留/); g.flags.failWrite = false;
      g.books['1源堡'][1].content = '{"9":99}';
      await assert.rejects(transaction.save(), /变化/); assert.equal(g.flags.writes.length, 0); continue;
    }
    if (boundary === 'branch') g.flags.branch += '-new';
    if (boundary === 'metadata') g.flags.metadata++;
    if (boundary === 'chat') g.flags.chat += '-new';
    if (boundary === 'script') g.flags.script += '-new';
    if (boundary === 'writer') g.modules['cryptLord.stateStore'] = {};
    if (boundary === 'generation') { g.emit('GENERATION_STARTED', 'normal'); g.emit('GENERATION_ENDED'); }
    await assert.rejects(transaction.run(), /变化|取消/); assert.equal(g.flags.writes.length, 0);
  }
  assert.equal(modules['cryptLord.itemDerivation'], api);
});
