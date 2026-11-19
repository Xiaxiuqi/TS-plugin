import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const battleTest = await read('tests/guimizhizhu_ui/battle-session.test.mjs');
const battleTree = ts.createSourceFile('battle.js', battleTest, 99, true, ts.ScriptKind.JS);
const battleGraph = battleTree.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations])
  .find(row => row.name.getText(battleTree) === 'names').initializer.getText(battleTree);
export const files = [...new Set([
  'native-floor-source', 'ability-state', 'audience-imagination', 'marionette-reference', 'marionette-state',
  'audience-imagination-reference', 'audience-imagination-state', 'reader-reference', 'reader-roster-state',
  'reader-mystic', 'mystery-roster-reference', 'mystery-roster-state', 'mystery-reenactment-reference',
  'mystery-reenactment', 'scroll-workshop-reference', 'scroll-workshop-state',
  ...vm.runInNewContext(battleGraph), 'attribute-recalculation', 'player-progression',
  'native-settlement', 'variable-patch', 'response-normalizer', 'state-store', 'generation-bridge', 'variable-workbench-state',
])];
const sources = await Promise.all(files.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const fixtureSource = await read('tests/guimizhizhu_ui/ability-lifecycle.fixture.js');
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const runtime = vm.createContext({ structuredClone, DOMException, console, Math, Date });
  runtime.window = runtime;
  vm.runInContext(fixtureSource, runtime);
  const state = runtime.installAbilityLifecycleFixture();
  sources.forEach(source => vm.runInContext(source, runtime));
  return { ...state, runtime, state, api: state.modules['cryptLord.abilityState'],
    store: state.modules['cryptLord.stateStore'], data: () => state.floors[2].data };
}
const ruleRow = { 活力: 600, 敏捷: 240, 灵性: 320, 理智: 200, 人性: 100, 运气: 50 };
function configuredFixture() {
  const f = fixture();
  f.ruleEntry = { name: '【配置】消耗品配置', content: JSON.stringify({
    avgAttrByRank: Object.fromEntries([5, 6, 8, 9, 10].map(rank => [rank, ruleRow])),
  }) };
  f.books.主书.push(f.ruleEntry);
  f.pool.pathways.窥秘人途径.push('序列6-卷轴教授');
  f.books.主书.find(row => row.name.startsWith('[神之途径]')).content = JSON.stringify(f.pool.pathways);
  return f;
}
const dbText = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const dbTree = ts.createSourceFile('db.js', dbText.slice(dbText.indexOf('const GameDBManager =')), 99, true, ts.ScriptKind.JS);
const dbObject = dbTree.statements[0].declarationList.declarations[0].initializer;
const property = (object, key) => object.properties.find(row => row.name?.getText(dbTree) === key).initializer;
const originalAverages = vm.runInNewContext(`(${property(property(property(dbObject, '_fallback'),
  'consumableConfig'), 'avgAttrByRank').getText(dbTree)})`);
const originalSource = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36a-js-items-equip-relationships.txt');
const originalMethod = originalSource.slice(originalSource.indexOf('async updateAcquiredAbilities('),
  originalSource.indexOf('// =========序列能力列表结束'));
const originalTree = ts.createSourceFile('original.js', `({${originalMethod}})`, 99, true, ts.ScriptKind.JS);
let originalSync;
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(originalTree) === 'updateAcquiredAbilities')
    originalSync = node.getText(originalTree);
  ts.forEachChild(node, visit);
}
visit(originalTree); assert.ok(originalSync);
async function oracle(data, api, pool, locked) {
  const core = vm.runInNewContext(`({${originalSync}})`, {
    _: { cloneDeep: structuredClone }, localStorage: { getItem: () => String(locked) }, console,
    window: {}, BOARD_FIELDS: ['range', 'aoeRadius'], setTimeout() {},
    fetchAvailableAbilities: sequence => api.available(pool, sequence, locked),
  });
  core.SafeGetValue = (stat, key, fallback) => stat[key] ?? fallback;
  core.currentMvuState = data;
  return core.updateAcquiredAbilities(data);
}

test('完整能力派生：原版自动补全对照、字段保护、锁定及空想/放牧/秘术/再现资格联动', async () => {
  const f = fixture(), pool = await f.api.loadPool();
  assert.deepEqual(plain(pool.pictureConfig.consumableConfig.avgAttrByRank), plain(originalAverages));
  assert.equal(pool.abilities['占卜家途径-序列8'][0].name, '身体控制');
  for (const sequence of ['序列8-小丑', '序列8-小丑/序列5-牧羊人', '序列0-空想家', '普通人', '未知']) {
    for (const locked of [false, true]) {
      const input = { stat_data: { 当前序列: sequence, 序列能力锁定: locked,
        序列能力列表: { $meta: { keep: true }, '序列9-占卜家': [
          { 名称: '灵视', 描述: '用户描述', range: 77 }, { 名称: '灵视', 描述: '末项' },
        ], 手动: [{ 名称: '自建', power: 18 }] } }, otherPlugin: { keep: true } };
      const prepared = await f.api.prepare(input, { mode: 'turn' });
      const expected = await oracle(input, f.api, pool, locked);
      assert.deepEqual(plain(prepared.data.stat_data.序列能力列表), plain(expected.stat_data.序列能力列表));
      assert.equal(prepared.data.stat_data.当前序列, expected.stat_data.当前序列);
      assert.deepEqual(plain(prepared.data.otherPlugin), plain(expected.otherPlugin));
      assert.deepEqual(input.stat_data.序列能力列表['序列9-占卜家'][1], { 名称: '灵视', 描述: '末项' });
    }
  }
  let input = { stat_data: { ...f.card('序列1-作家'), $专属玩法: {
    观众途径: { 空想玩法: { 版本: 1, 空想栏位: { 栏位1: { 途径: '阅读者途径' } } } },
  } } };
  const reader = f.modules['cryptLord.readerRosterState'].create(input, pool);
  const readerConfig = reader.core.defaultConfig(1); readerConfig.名称 = '投影秘术';
  reader.core.saveConfig(input, 1, readerConfig);
  const projected = await f.api.prepare(input, { mode: 'turn' });
  assert.ok(Object.keys(projected.data.stat_data.序列能力列表).some(group => group.startsWith('#空想:')));
  assert.ok(projected.data.stat_data.序列能力列表['#秘术强化']?.some(row => row.名称 === '投影秘术'));
  assert.equal(projected.data.stat_data.当前序列, '序列1-作家');
  const downgraded = structuredClone(projected.data); downgraded.stat_data.当前序列 = '普通人';
  const removed = (await f.api.prepare(downgraded, { previous: projected.data.stat_data })).data;
  assert.equal(Object.keys(removed.stat_data.序列能力列表).some(group => group.startsWith('#空想:')), false);
  assert.equal(removed.stat_data.序列能力列表['#秘术强化'], undefined);
  assert.deepEqual(removed.stat_data.$专属玩法, projected.data.stat_data.$专属玩法);
  input = { stat_data: { ...f.card('序列4-神秘学家'), $专属玩法: {
    窥秘人途径: { 神秘再现玩法: { 版本: 1, 知识档案: {}, 法术栏位: {}, 原著法术解锁: {} } },
  }, 序列能力列表: { '#神秘再现': [{ 名称: '旧投影' }] } } };
  input.stat_data.当前序列 = '普通人';
  const stale = await f.api.prepare(input, { previous: input.stat_data });
  assert.equal(stale.data.stat_data.序列能力列表['#神秘再现'], undefined);
  assert.deepEqual(stale.data.stat_data.$专属玩法, input.stat_data.$专属玩法);
  const grazing = { stat_data: { ...f.card('序列5-牧羊人'), $专属玩法: { 秘祈人途径: {
    放牧玩法: { 版本: 1, 灵魂列表: { 学者: { 当前序列: '序列8-小丑' } },
      激活灵魂: ['学者'], 休眠灵魂: [] },
  } } } };
  const graze = await f.api.prepare(grazing, { mode: 'turn' });
  assert.ok(Object.keys(graze.data.stat_data.序列能力列表).some(group => group.startsWith('#放牧:')));
  assert.equal(graze.data.stat_data.当前序列, '序列5-牧羊人');
  const cfg = configuredFixture();
  cfg.books['2历史孔隙'].push({ name: cfg.ruleEntry.name, content: 'broken overridden config' },
    { name: '【配置】消耗品配置·类型', content: '{"治疗药":{"powerRatio":0.4,"costRatio":0,"defaultCost":"灵性"}}' });
  cfg.books['【源堡】玩家自建内容'] = [{ name: '【配置】消耗品配置·自建', content: 'must not parse' }];
  cfg.state.binding.additional.push('2历史孔隙', '主书');
  const rules = await cfg.api.loadPool();
  assert.deepEqual(plain(rules.pictureConfig.consumableConfig.avgAttrByRank['6']), ruleRow);
  assert.equal(rules.pictureConfig.consumableConfig.治疗药.powerRatio, .4);
  await cfg.api.assertPool(rules);
  const readerData = { stat_data: { ...cfg.card('序列5-秘术导师') } };
  const readerSession = cfg.modules['cryptLord.readerRosterState'].create(readerData, rules);
  const mystic = readerSession.core.defaultConfig(1); mystic.名称 = '配置秘术';
  readerSession.core.saveConfig(readerData, 1, mystic);
  const projectedReader = await cfg.api.prepare(readerData, { mode: 'turn', pool: rules });
  assert.deepEqual(plain(projectedReader.data.stat_data.序列能力列表['#秘术强化'][0]),
    plain({ ...readerSession.core.buildAbility(mystic, 1, 5), $秘术投影: '秘术强化' }));
  assert.deepEqual(plain(cfg.modules['cryptLord.readerMystic'].average(5, rules)),
    Object.fromEntries(Object.entries(ruleRow).filter(([key]) => key !== '运气')));
  assert.equal(cfg.modules['cryptLord.grazingState'].switchCost({
    stat_data: { 当前序列: '序列5-牧羊人' } }, rules), Math.round(ruleRow.灵性 * .02));
  for (const value of ['{', '[]', '{"avgAttrByRank":{"6":{"灵性":320}}}',
    JSON.stringify({ avgAttrByRank: { 6: { ...ruleRow, 灵性: -1 } } })]) {
    cfg.ruleEntry.content = value;
    await assert.rejects(cfg.api.loadPool(), /消耗品配置/);
  }
  cfg.ruleEntry.content = '{"avgAttrByRank":{}}';
  const empty = await cfg.api.loadPool();
  assert.deepEqual(plain(cfg.modules['cryptLord.readerMystic'].average(5, empty)),
    Object.fromEntries(Object.entries(originalAverages['10']).filter(([key]) => key !== '运气')));
  assert.equal(cfg.modules['cryptLord.grazingState'].switchCost({
    stat_data: { 当前序列: '序列5-牧羊人' } }, empty), 1);
});

test('整条原生流程：手动晋升预览/一次保存、显式删除、正文补全与实际开战/行动/结算', async () => {
  const f = fixture(), protectedFloors = plain(f.floors.slice(0, 2)), body = f.floors[2].message;
  const next = structuredClone(f.data()); next.stat_data.当前序列 = '序列8-小丑';
  const preview = await f.store.previewAssistantData(next, f.data());
  assert.equal(f.writes.length, 0);
  assert.ok(preview.data.stat_data.序列能力列表['序列8-小丑']);
  const saved = await f.store.writeAssistantData(2, next);
  assert.deepEqual(plain(saved), plain(preview.data)); assert.equal(f.writes.length, 1);
  const selection = f.api.view(saved).find(group => group.group === '序列8-小丑').entries[0].selection;
  await f.api.commit(await f.api.load(2), { type: 'remove', ...selection });
  assert.equal(f.data().stat_data.序列能力列表['序列8-小丑'], undefined);
  await f.store.writeAssistantData(2, f.data());
  assert.equal(f.data().stat_data.序列能力列表['序列8-小丑'], undefined);
  const raw = '<gametxt>原生正文完整保留</gametxt><UpdateVariable><JSONPatch>' +
    JSON.stringify({ stat_data: [{ op: 'replace', path: '/当前序列', value: '序列8-小丑' }] }) +
    '</JSONPatch></UpdateVariable>';
  await f.modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, {
    userMessageId: 1, assistantMessageId: 2, userText: '行动', narrativeText: '正文', guard: () => true,
  });
  assert.ok(f.data().stat_data.序列能力列表['序列8-小丑']);
  const count = f.writes.length, before = structuredClone(f.data());
  const session = f.modules['cryptLord.battleSession'];
  const opened = await session.prepare(before, { personal: true, npcKey: '对手', seed: 19,
    summonPool: { pathways: {}, abilities: { stale: [] } } });
  assert.equal(opened.ok, true, opened.error); assert.deepEqual(plain(f.data()), plain(before));
  assert.equal(f.writes.length, count); assert.ok(opened.abilityPrepared);
  assert.equal(opened.pathwayPool.abilities['占卜家途径-序列8'][0].name, '身体控制');
  await f.store.writeAssistantData(2, opened.data, 'affected', undefined, undefined,
    { abilityPrepared: opened.abilityPrepared });
  const engine = f.modules['cryptLord.teamBattleState'], battle = f.data().cryptLord.teamBattle;
  const skill = engine.options(f.data()).find(row => row.名称 === '身体控制' || row.name === '身体控制');
  assert.ok(skill);
  const action = engine.action(f.data(), { id: skill.id, target: '对手' });
  assert.equal(action.ok, true, action.error);
  assert.equal(action.data.cryptLord.teamBattle.status, 'finished');
  await f.store.writeAssistantData(2, action.data);
  assert.ok((await f.api.prepare(f.data(), { mode: 'turn' })).skipped);
  const settled = engine.settle(f.data(), battle.id, true);
  assert.equal(settled.ok, true, settled.error); await f.store.writeAssistantData(2, settled.data);
  assert.equal(f.data().cryptLord.teamBattle.settled, true);
  assert.deepEqual(plain(f.floors.slice(0, 2)), protectedFloors);
  assert.equal(f.floors[2].message.includes(body), true);
  assert.equal(f.data().otherPlugin.keep, true);
  assert.ok(f.writes.every(rows => rows.length === 1 && rows[0].message_id === 2));
  const cfg = configuredFixture(), rules = await cfg.api.loadPool(), m = cfg.modules;
  const material = { 类型: '灵性材料', 序列: '序列6', 数量: 2 };
  const source = { ...structuredClone(cfg.data()), stat_data: { ...cfg.card('序列6-卷轴教授'),
    其他列表: { 粉末: material } } };
  Object.assign(source.npc_data.对手, { 活力: 10000, 当前活力: 10000 });
  const workshop = m['cryptLord.scrollWorkshopState'].create(source, rules, { confirmSync: () => true, roll: () => 1 });
  workshop.state.draft = { name: '整链卷轴', rank: 6, description: '保留制造记录',
    baseEffect: '物理攻击', scope: '单体', extraEffect: '', enhancements: {} };
  await workshop.action('scroll-save');
  const template = workshop.mode.templates(workshop.win)[0];
  Object.assign(workshop.state, { materialKey: '粉末', materialQty: 1, allocations: { [template.id]: 1 } });
  await workshop.action('scroll-craft');
  const product = Object.entries(workshop.data.stat_data.消耗品列表).find(([, row]) => row.$卷轴制造);
  await cfg.store.writeAssistantData(2, workshop.data, 'affected', undefined, undefined, { rulePool: rules });
  assert.equal(cfg.writes.length, 1); assert.equal(cfg.data().stat_data.其他列表.粉末.数量, 1);
  const preparedBattle = await m['cryptLord.battleSession'].prepare(cfg.data(), {
    personal: true, npcKey: '对手', seed: 13,
  });
  assert.equal(preparedBattle.ok, true, preparedBattle.error);
  preparedBattle.data.cryptLord.teamBattle.units.forEach((unit, index) =>
    Object.assign(unit, { x: index + 1, y: 1 }));
  await cfg.store.writeAssistantData(2, preparedBattle.data, 'affected', undefined, undefined,
    { abilityPrepared: preparedBattle.abilityPrepared, rulePool: preparedBattle.rulePool });
  assert.deepEqual(plain(cfg.data().cryptLord.teamBattle.fieldEffectMeta.averages['6']), ruleRow);
  const engine2 = m['cryptLord.teamBattleState'];
  const choice = engine2.options(cfg.data()).find(row => row.id === `scroll:${product[0]}`);
  assert.equal(choice.power, Math.round(ruleRow.活力 * .2));
  assert.equal(choice.cost, 4);
  // A saved battle keeps its actual configuration despite later rules and old plugin globals.
  cfg.ruleEntry.content = JSON.stringify({ avgAttrByRank: { 6: { ...ruleRow, 活力: 1, 灵性: 1 } } });
  cfg.runtime.GameDBManager = { DB: { consumableConfig: { avgAttrByRank: { 6: { 活力: 1, 灵性: 1 } } } } };
  assert.equal(engine2.options(cfg.data()).find(row => row.id === choice.id).power, choice.power);
  const restored = plain(cfg.data());
  assert.equal(engine2.options(restored).find(row => row.id === choice.id).cost, choice.cost);
  m['cryptLord.battleFieldEffects'].withRuntime(restored.cryptLord.teamBattle, restored, () => .5, rt => {
    assert.equal(rt.tacticCatalog.spiritCost(6), Math.round(ruleRow.灵性 * .05));
    assert.equal(rt.tacticCatalog.controlStatCost(6, '理智'),
      Math.round(ruleRow.理智 * rt.tacticCatalog.CONTROL_SPIRIT_RATIO));
    assert.equal(rt.tacticCatalog.spiritCost(7), Math.round(ruleRow.灵性 * .05));
  });
  const cast = engine2.action(cfg.data(), { id: choice.id, target: '对手' });
  assert.equal(cast.ok, true, cast.error);
  await cfg.store.writeAssistantData(2, cast.data);
  assert.equal(cfg.data().stat_data.消耗品列表[product[0]], undefined);
  let closing = engine2.advanceAuto(cfg.data());
  assert.equal(closing.ok, true, closing.error);
  const sanity = closing.data.stat_data.当前理智;
  const denied = engine2.tactic(closing.data, {
    declaration: { action: '改变地形', means: '无依据的地形申请',
      brush: { 形状: 'cells', 格子: [[1, 1]], 地形: 'fireSurface' } },
    plan: { 玩家审计: { 可行: false, 理由: '未提供对应能力' },
      NPC行动: [{ 角色: '对手', 行动: '待命' }] },
  });
  assert.equal(denied.ok, true, denied.error);
  assert.equal(denied.data.stat_data.当前理智, sanity - Math.round(ruleRow.理智 * .05));
  closing = engine2.end(closing.data, closing.data.cryptLord.teamBattle.id);
  assert.equal(closing.ok, true, closing.error);
  const final = engine2.settle(closing.data, closing.data.cryptLord.teamBattle.id, false);
  assert.equal(final.ok, true, final.error); await cfg.store.writeAssistantData(2, final.data);
  assert.equal(cfg.data().cryptLord.teamBattle.settled, true);
  assert.equal(cfg.data().otherPlugin.keep, true);
  assert.ok(cfg.writes.every(rows => rows.length === 1 && rows[0].message_id === 2 && !('message' in rows[0])));
});

test('整链来源与故障：规则/绑定/锁定/消息页变化、取消卸载、预览篡改、失败重试及专项范围', async () => {
  for (const boundary of ['rules', 'binding', 'lock', 'pages', 'chat', 'generation', 'close', 'module']) {
    const f = fixture(), next = structuredClone(f.data()); next.stat_data.当前序列 = '序列8-小丑';
    let alive = true;
    f.state.dynamicHook = async () => {
      if (boundary === 'rules') f.books.主书.at(-1).content = JSON.stringify({
        ...f.pool.abilities, '占卜家途径-序列8': [{ name: '外部变化' }],
      });
      if (boundary === 'binding') f.state.binding.additional.push('另一本');
      if (boundary === 'lock') f.state.legacyLock = 'true';
      if (boundary === 'pages') f.state.page++;
      if (boundary === 'chat') f.emit('CHAT_CHANGED');
      if (boundary === 'generation') f.emit('GENERATION_STARTED', 'normal');
      if (boundary === 'close') alive = false;
      if (boundary === 'module') f.modules['cryptLord.readerMystic'] = {};
    };
    await assert.rejects(f.store.writeAssistantData(2, next, 'affected', undefined, () => alive), /变化|取消|卸载/);
    assert.equal(f.writes.length, 0); assert.equal(f.data().stat_data.当前序列, '序列9-占卜家');
  }
  const f = fixture(), next = structuredClone(f.data()); next.stat_data.当前序列 = '序列8-小丑';
  const pre = await f.api.prepare(next, { previous: f.data().stat_data });
  pre.data.stat_data.当前序列 = '伪造';
  await assert.rejects(f.api.assertPrepared(pre), /修改/);
  f.state.failBook = true; await assert.rejects(f.store.writeAssistantData(2, next), /读取失败/);
  f.state.failBook = false; f.state.failWrite = true;
  await assert.rejects(f.store.writeAssistantData(2, next), /保存失败/);
  f.state.failWrite = false; await f.store.writeAssistantData(2, next); assert.equal(f.writes.length, 1);
  const receipt = await f.api.prepare(f.data(), { mode: 'battle' });
  f.emit('GENERATION_STARTED', 'quiet'); f.emit('GENERATION_STARTED', 'normal', { dryRun: true });
  await f.api.assertPrepared(receipt);
  const locked = { ...structuredClone(f.data()), cryptLord: { teamBattle: { status: 'finished', settled: false } } };
  assert.equal((await f.api.prepare(locked, { mode: 'turn' })).skipped, true);
  const books = plain(f.books);
  await f.store.writeAssistantMessage(2, '编辑正文', f.data(), { preserveData: true });
  assert.deepEqual(plain(f.books), books);
  const opened = await f.modules['cryptLord.battleSession'].prepare(f.data(), { personal: true, npcKey: '对手' });
  f.books.主书.at(-1).content = JSON.stringify({ ...f.pool.abilities, '占卜家途径-序列8': [{ name: '开战迟到变更' }] });
  const count = f.writes.length;
  await assert.rejects(f.store.writeAssistantData(2, opened.data, 'affected', undefined, undefined,
    { abilityPrepared: opened.abilityPrepared }), /变化/);
  assert.equal(f.writes.length, count); assert.equal(f.data().cryptLord?.teamBattle, undefined);
  f.api.dispose(); await assert.rejects(f.api.assertPrepared(receipt), /取消/);
  for (const boundary of ['table', 'bind', 'cancel', 'chat', 'service', 'tamper', 'forged']) {
    const cfg = configuredFixture(), rules = await cfg.api.loadPool();
    let alive = true;
    cfg.state.dynamicHook = () => {
      if (boundary === 'table') cfg.ruleEntry.content = JSON.stringify({ avgAttrByRank: { 8: { ...ruleRow, 灵性: 321 } } });
      if (boundary === 'bind') cfg.state.binding.additional.push('missing optional');
      if (boundary === 'cancel') alive = false;
      if (boundary === 'chat') cfg.emit('CHAT_CHANGED');
      if (boundary === 'service') cfg.modules['cryptLord.abilityState'] = {};
      if (boundary === 'tamper') rules.pictureConfig.consumableConfig.avgAttrByRank['8'].灵性++;
    };
    await assert.rejects(cfg.store.writeAssistantData(2, cfg.data(), 'affected', undefined, () => alive,
      { rulePool: boundary === 'forged' ? structuredClone(rules) : rules }),
    boundary === 'service' ? /格式损坏|卸载|取消/ : /变化|取消|卸载|修改|来源无效/);
    assert.equal(cfg.writes.length, 0);
  }
  for (const ordinary of [false, true]) {
    const cfg = configuredFixture();
    if (ordinary) cfg.floors[2].data.stat_data.当前序列 = '普通人';
    cfg.state.battlefieldHook = () => { cfg.ruleEntry.content = '{"avgAttrByRank":{}}'; };
    await assert.rejects(cfg.modules['cryptLord.battleSession'].prepare(cfg.data(), {
      personal: true, npcKey: '对手',
    }), /变化/);
    assert.equal(cfg.writes.length, 0); assert.equal(cfg.data().cryptLord?.teamBattle, undefined);
  }
  const cfg = configuredFixture();
  cfg.floors[2].data.stat_data.当前序列 = '普通人';
  const ordinary = await cfg.modules['cryptLord.battleSession'].prepare(cfg.data(), { personal: true, npcKey: '对手' });
  assert.equal(ordinary.ok, true, ordinary.error); assert.ok(ordinary.abilityPrepared.skipped);
  cfg.state.dynamicHook = () => { cfg.ruleEntry.content = '{"avgAttrByRank":{}}'; };
  await assert.rejects(cfg.store.writeAssistantData(2, ordinary.data, 'affected', undefined, undefined,
    { abilityPrepared: ordinary.abilityPrepared, rulePool: ordinary.rulePool }), /变化/);
  assert.equal(cfg.writes.length, 0);
});
