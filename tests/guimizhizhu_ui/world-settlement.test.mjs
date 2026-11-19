import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const names = ['domain-defaults', 'industry-state', 'cashflow', 'domain-state', 'faction-state', 'world-map',
  'native-settlement', 'state-store', 'variable-patch', 'variable-settlement-api', 'variable-workbench-state', 'response-normalizer', 'generation-bridge'];
const sources = await Promise.all(names.map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const fixtureSource = await read('tests/guimizhizhu_ui/world-settlement.fixture.js');
const plain = value => JSON.parse(JSON.stringify(value));
async function fixture() {
  const runtime = { console: { ...console, log() {}, warn() {} }, structuredClone, DOMException,
    setTimeout, clearTimeout, URL };
  runtime.window = runtime; vm.createContext(runtime);
  vm.runInContext(fixtureSource, runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { ...runtime.preview, runtime, world: runtime.preview.modules['cryptLord.nativeSettlement'],
    store: runtime.preview.modules['cryptLord.stateStore'], service: runtime.preview.service };
}
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34b-js-schema-time-currency-domain.txt');
const tree = ts.createSourceFile('original.js', original, 99, true, ts.ScriptKind.JS);
let engine, slots; const registrations = [];
function visit(node) {
  if (ts.isBinaryExpression(node) && node.left.getText(tree) === 'window.TimePassageEngine') engine = node.getText(tree);
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'D100_SLOT_COUNT') slots = Number(node.initializer.getText(tree));
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'window.TimePassageEngine.registerTrigger') {
    const id = node.arguments[0]?.properties?.find(item => item.name?.getText(tree) === 'id')?.initializer?.text;
    if (['auto_age_growth', 'auto_attribute_regen'].includes(id)) registrations.push(node.getText(tree));
  }
  ts.forEachChild(node, visit);
}
visit(tree); assert.ok(engine); assert.equal(registrations.length, 2);
function oracle() {
  const runtime = { console: { log() {}, warn() {} }, D100_SLOT_COUNT: slots,
    Math: Object.assign(Object.create(Math), { random: () => .3 }) };
  runtime.window = runtime;
  vm.runInNewContext(`${engine};${registrations.join(';')}`, runtime);
  return runtime.TimePassageEngine;
}
test('原版时间整链对照：初始化、年度/每日恢复、倒流余数、D100和独立周结算', async () => {
  const f = await fixture(), old = structuredClone(f.floors[2].data);
  for (const era of [
    '第五纪1350年1月1日星期一0:00', '第五纪1350年1月8日星期一0:00',
    '第五纪1351年1月1日星期二0:00', '第五纪1349年12月30日星期日12:00', '无法解析的时间',
  ]) {
    const before = structuredClone(old);
    delete before.stat_data.产业; delete before.stat_data.领地;
    before.world_data._timeTriggerState.auto_age_growth = { _remainder: 300 };
    before.world_data._timeTriggerState.auto_attribute_regen = { _remainder: 500 };
    const input = structuredClone(before); input.world_data.当前时间纪元 = era;
    const expected = structuredClone(input); oracle().applyTimePassage(expected);
    const actual = (await f.world.prepare(input, before)).data;
    for (const key of ['身体年龄', '灵魂年龄', '当前活力', '当前敏捷', '当前灵性', '当前理智', '当前人性'])
      assert.equal(actual.stat_data[key], expected.stat_data[key], `${era} / ${key}`);
    assert.deepEqual(plain(actual.npc_data), plain(expected.npc_data));
    assert.equal(actual.world_data._lastTimeEra, expected.world_data._lastTimeEra);
    for (const id of ['auto_age_growth', 'auto_attribute_regen'])
      assert.equal(actual.world_data._timeTriggerState?.[id]?._remainder, expected.world_data._timeTriggerState?.[id]?._remainder);
    for (const period of ['每日', '每周', '每月', '每年']) {
      assert.equal(actual.world_data.随机D100?.[period]?._lastRollKey, expected.world_data.随机D100?.[period]?._lastRollKey);
      if (actual.world_data.随机D100?.[period]) {
        assert.equal(Object.keys(actual.world_data.随机D100[period]).filter(key => key.startsWith('D100-')).length, 20);
        assert.ok(Object.values(actual.world_data.随机D100[period]).filter(value => typeof value === 'number').every(value => value >= 1 && value <= 100));
      }
    }
    assert.deepEqual(plain(input), { ...plain(before), world_data: { ...plain(before.world_data), 当前时间纪元: era } });
  }
  const first = structuredClone(old); delete first.world_data._lastTimeEra;
  const later = structuredClone(first); later.world_data.当前时间纪元 = '第五纪1351年1月1日星期二0:00';
  const boot = await f.world.prepare(later, first);
  assert.equal(boot.data.stat_data.身体年龄, 20); assert.equal(boot.data.stat_data.当前活力, 20);
  assert.equal(boot.data.stat_data.货币.鲁恩王国.金镑, 20);
  assert.equal(boot.data.world_data._lastTimeEra, later.world_data.当前时间纪元);
  const input = structuredClone(old); input.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
  const a = await f.world.prepare(input, old), b = await f.world.prepare(input, old);
  assert.deepEqual(plain(a), plain(b)); assert.ok(a.applied.includes('domain-weekly-settle'));
  assert.equal(a.data.npc_data.亡者.当前活力, 0);
  assert.equal(a.data.stat_data.产业.工坊.当前投入资本总额, '50000 金镑');
  assert.ok(a.data.stat_data.货币.鲁恩王国.金镑 > 39);
  assert.ok(a.data.stat_data.领地.物资库['1级工业品'] > 100);
  assert.ok(a.data.stat_data.势力.银湾领地.势力生产力总需求);
  const split = structuredClone(old);
  split.world_data._timeTriggerState.industry_weekly_settle = { _lastEra: input.world_data.当前时间纪元, _remainder: 0 };
  split.world_data._timeTriggerState.domain_weekly_settle = { _lastEra: old.world_data.当前时间纪元, _remainder: 0 };
  const separate = structuredClone(split); separate.world_data.当前时间纪元 = input.world_data.当前时间纪元;
  const result = await f.world.prepare(separate, split);
  assert.ok(!result.applied.includes('industry-weekly-settle')); assert.ok(result.applied.includes('domain-weekly-settle'));
  assert.equal(result.data.stat_data.产业.工坊.上次结算时间, undefined);
});
test('完整原生保存：工作台预览确认、恢复/收支/领地、生成一次落层和专项范围', async () => {
  const f = await fixture(), old = structuredClone(f.floors[2].data), loaded = await f.service.load(2);
  const next = structuredClone(old); next.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
  next.world_data._lastTimeEra = next.world_data.当前时间纪元; // A patch cannot suppress the real clock.
  next.world_data._timeTriggerState = { auto_attribute_regen: { _remainder: 0 } };
  next.stat_data.稳定长期收入.工资.上次结算时间 = next.world_data.当前时间纪元;
  const domain = f.modules['cryptLord.domainState'];
  const now = domain.nowMinutes(old);
  domain.ensureDomain(next.stat_data.领地);
  next.stat_data.领地.格子.格2 = { 建筑: 'workshop', 等级: 0, 开工: true, 施工动作: '新建', 完工时刻: now + 60 };
  next.stat_data.领地.核心.施工动作 = '1→2'; next.stat_data.领地.核心.完工时刻 = now + 60;
  next.stat_data.领地.训练队列 = [{ id: 't1', 军种: '陆军', 兵种: 'militia', 精锐等级: 1, 数量: 2, 完工时刻: now + 60 }];
  const preview = await f.service.prepareCommit(loaded, next);
  assert.equal(f.flags.writes.length, 0); assert.match(preview.summary.join('\n'), /当前活力.*90|D100/);
  f.flags.failWrite = true;
  await assert.rejects(f.service.commit(loaded, next, undefined, null, preview), /保存失败/);
  assert.deepEqual(plain(f.floors[2].data), plain(old));
  f.flags.failWrite = false;
  const saved = await f.service.commit(loaded, next, undefined, null, preview);
  assert.equal(f.flags.writes.length, 1); assert.equal(saved.data.stat_data.当前活力, 90);
  assert.equal(saved.data.stat_data.领地.格子.格2.等级, 1); assert.equal(saved.data.stat_data.领地.核心.等级, 2);
  assert.equal(saved.data.stat_data.领地.训练队列.length, 0);
  assert.equal(saved.data.stat_data.领地.驻军.散兵[0].数量, 5);
  assert.equal(saved.data.stat_data.稳定长期收入.工资.上次结算时间, next.world_data.当前时间纪元);
  assert.equal(saved.data.world_data._timeTriggerState.自定义.保留, 7);
  const stable = structuredClone(saved.data); await f.store.writeAssistantData(2, stable);
  assert.deepEqual(plain(f.floors[2].data), plain(stable));
  assert.deepEqual(plain(f.floors.slice(0, 2)), plain(f.initial.slice(0, 2)));
  assert.equal(f.floors[2].message, f.initial[2].message); assert.equal(f.floors[2].data.otherPlugin.keep, true);
  const generated = await fixture();
  const raw = '<gametxt>原生正文</gametxt><UpdateVariable><JSONPatch>{"world_data":[{"op":"replace","path":"/当前时间纪元","value":"第五纪1350年1月8日星期一0:00"}]}</JSONPatch></UpdateVariable>';
  const transaction = { userMessageId: 1, assistantMessageId: 2, userText: '经营领地',
    narrativeText: '叙事'.repeat(1000), floorText: raw };
  await generated.modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, transaction);
  assert.equal(generated.flags.writes.length, 1); assert.equal(generated.floors[2].data.stat_data.剧场点数, 1);
  assert.equal(generated.floors[2].data.stat_data.当前活力, 90);
  assert.deepEqual(plain(generated.floors.slice(0, 2)), plain(generated.initial.slice(0, 2)));
  const preserved = structuredClone(generated.floors[2].data);
  await generated.store.writeAssistantMessage(2, '仅改正文', { stat_data: {} }, { preserveData: true, nativeTarget: true });
  assert.deepEqual(plain(generated.floors[2].data), plain(preserved));
  const scoped = await fixture(), staleClock = structuredClone(scoped.floors[2].data);
  staleClock.world_data.当前时间纪元 = next.world_data.当前时间纪元;
  await scoped.store.writeAssistantData(2, staleClock, 'affected', undefined, undefined, { skipWorldSettlement: true });
  assert.equal(scoped.floors[2].data.stat_data.当前活力, 20);
  assert.equal(scoped.floors[2].data.stat_data.货币.鲁恩王国.金镑, 20);
  const active = await fixture(); active.floors[2].data.cryptLord.teamBattle = { status: 'active' };
  const battle = structuredClone(active.floors[2].data); battle.world_data.当前时间纪元 = next.world_data.当前时间纪元;
  active.flags.failBook = true; await active.store.writeAssistantData(2, battle);
  assert.equal(active.floors[2].data.stat_data.当前活力, 20); assert.equal(active.floors[2].data.world_data._lastTimeEra, active.time);
  const map = await fixture();
  const mapInput = structuredClone(map.floors[2].data);
  mapInput.stat_data.当前区域 = '廷根地区'; mapInput.stat_data.当前地标 = '廷根'; mapInput.stat_data.当前坐标 = { x: null, y: '' };
  const corrected = await map.world.prepare(mapInput, map.floors[2].data);
  assert.ok(Number.isFinite(corrected.data.stat_data.当前坐标.x)); assert.ok(corrected.applied.includes('map-location-correction'));
  const configured = await fixture();
  const config = structuredClone(configured.modules['cryptLord.domainDefaults'].config);
  config.buildings[0].配方[0]['1级农产品'] = 777;
  configured.books.角色规则.push({ name: '【配置】领地配置', content: JSON.stringify({ buildings: config.buildings }) });
  const delta = structuredClone(configured.floors[2].data); delta.world_data.当前时间纪元 = next.world_data.当前时间纪元;
  const enhanced = await configured.world.prepare(delta, configured.floors[2].data);
  assert.ok(enhanced.data.stat_data.领地.物资库['1级农产品'] > 800);
  assert.equal(configured.modules['cryptLord.domainState'].recipeOf(configured.floors[2].data.stat_data.领地, { 建筑: 'field', 等级: 1 })['1级农产品'], 15);
  const maxima = await fixture();
  vm.runInContext(await read('public/guimizhizhu_ui/core/attribute-recalculation.js'), maxima.runtime);
  const baseline = maxima.floors[2].data;
  for (const key of ['活力', '敏捷', '灵性', '理智', '人性', '运气']) baseline.stat_data[`基础${key}`] = 100;
  const equipped = structuredClone(baseline);
  equipped.stat_data.武器列表 = { shield: { 名称: '活力装备', isEquipped: true, 活力: 100 } };
  equipped.world_data.当前时间纪元 = '第五纪1350年1月2日星期二0:00';
  const shown = await maxima.service.prepareCommit(await maxima.service.load(2), equipped);
  assert.match(shown.summary.join('\n'), /当前活力：120 → 140/);
  await maxima.service.commit(await maxima.service.load(2), equipped, undefined, null, shown);
  assert.equal(maxima.floors[2].data.stat_data.活力, 200); assert.equal(maxima.floors[2].data.stat_data.当前活力, 140);
  const warfare = await fixture(), domainRules = await warfare.modules['cryptLord.domainState'].loadRules(undefined, true);
  const campaignData = structuredClone(warfare.floors[2].data);
  campaignData.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
  const expectedCampaign = await warfare.world.prepare(campaignData, warfare.floors[2].data, undefined, { warfareRules: domainRules });
  warfare.runtime.GameDBManager = { DB: { domainConfig: { stages: { 1: { 周产: [999999], 用工: [1] } } },
    warConfig: { defaults: { def: 999999 } } } };
  const savedCampaign = await warfare.store.writeAssistantData(2, campaignData, 'affected', undefined, undefined, { warfareRules: domainRules });
  assert.deepEqual(plain(savedCampaign), plain(expectedCampaign.data), 'warfare save and world derivation share the actual domain rules');
});
test('整链事务：规则与原生消息页冲突、原子准备、失败重试、取消和已保存报告', async () => {
  for (const change of [
    f => { f.books.角色规则[0].content = '{"industryInjectRetention":0.9}'; },
    f => { f.books.角色规则.push({ name: '【配置】势力配置', content: '{"anchorDemands":{"4":30000}}' }); },
    f => { f.books.角色规则.push({ name: '【配置】领地配置', content: '{"stages":false}' }); },
    f => { f.binding.additional.push('外部书'); },
    f => { f.flags.page++; },
    f => { f.floors[0].message += '外部前状态'; },
    f => { f.floors[2].data.otherPlugin.changed = true; },
    f => { f.floors.push({ message_id: 3, role: 'user', message: '新回合' }); },
  ]) {
    const f = await fixture(), loaded = await f.service.load(2), next = structuredClone(loaded.floor.data);
    next.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
    const preview = await f.service.prepareCommit(loaded, next);
    let entered, release; const waiting = new Promise(resolve => { entered = resolve; });
    f.flags.hook = async () => {
      f.flags.hook = null;
      entered(); await new Promise(resolve => { release = resolve; });
    };
    const pending = f.service.commit(loaded, next, undefined, null, preview);
    await waiting; change(f); release();
    await assert.rejects(pending, /变化|必须|无效|损坏/); assert.equal(f.flags.writes.length, 0);
  }
  for (const change of [
    f => { f.emit('CHAT_CHANGED'); }, f => { f.emit('GENERATION_STARTED', 'normal'); },
    f => { f.world.dispose(); }, f => { f.alive = false; },
  ]) {
    const f = await fixture(); f.alive = true;
    const loaded = await f.service.load(2), next = structuredClone(loaded.floor.data);
    next.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
    const preview = await f.service.prepareCommit(loaded, next);
    change(f); await assert.rejects(f.service.commit(loaded, next, () => f.alive, null, preview), /取消|变化|未加载|卸载|正在生成/);
    assert.equal(f.flags.writes.length, 0);
  }
  const partial = await fixture(), originalDomain = partial.modules['cryptLord.domainState'];
  partial.modules['cryptLord.domainState'] = { ...originalDomain,
    weeklySettle(data) { data.stat_data.货币.鲁恩王国.金镑 += 999; throw Error('模拟领地handler失败'); } };
  const next = structuredClone(partial.floors[2].data); next.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
  await assert.rejects(partial.store.writeAssistantData(2, next), /handler失败/);
  assert.deepEqual(plain(partial.floors), plain(partial.initial)); assert.equal(partial.flags.writes.length, 0);
  const invalid = await fixture(); invalid.books.角色规则.push({ name: '【配置】势力配置', content: '坏JSON' });
  await assert.rejects(invalid.store.writeAssistantData(2, invalid.floors[2].data), /规则损坏/); assert.equal(invalid.flags.writes.length, 0);
  delete invalid.books.角色规则; await assert.rejects(invalid.world.prepare(next, invalid.initial[2].data), /不存在/);
  const forged = await fixture(), loaded = await forged.service.load(2), draft = structuredClone(loaded.floor.data);
  draft.stat_data.身体年龄++;
  const preview = await forged.service.prepareCommit(loaded, draft);
  preview.summary.push('伪造确认'); await assert.rejects(forged.service.commit(loaded, draft, undefined, null, preview), /预览/);
  assert.equal(forged.flags.writes.length, 0);
  const post = await fixture(), source = await post.service.load(2), working = structuredClone(source.floor.data);
  working.world_data.当前时间纪元 = '第五纪1350年1月8日星期一0:00';
  const prepared = await post.service.prepareCommit(source, working);
  post.flags.afterWriteFail = true; const warning = await post.service.commit(source, working, undefined, null, prepared);
  assert.match(warning.warning, /已保存/); assert.equal(warning.loaded, null); assert.equal(post.flags.writes.length, 1);
  const loader = await read('public/guimizhizhu_ui/loader.js');
  assert.match(loader, /cryptLord\.nativeSettlement[\s\S]*?assertPrepared/);
});
