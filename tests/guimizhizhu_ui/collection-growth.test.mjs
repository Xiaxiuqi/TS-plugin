import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptKind, isCallExpression, isObjectLiteralExpression, forEachChild } from 'typescript';
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const [source, storeSource, original, schema, loader, shell, settingsUi] = await Promise.all([
  'public/guimizhizhu_ui/core/collection-growth.js', 'public/guimizhizhu_ui/core/state-store.js',
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34c-js-war-sim-and-strategies.txt',
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34b-js-schema-time-currency-domain.txt',
  'public/guimizhizhu_ui/loader.js', 'public/guimizhizhu_ui/modules/game-shell/index.js',
  'public/guimizhizhu_ui/modules/system-settings/index.js',
].map(read));
const plain = value => JSON.parse(JSON.stringify(value));
const nativeSource = await read('public/guimizhizhu_ui/core/native-floor-source.js');
const list = count => Object.fromEntries([['$meta', { keep: true }], ...Array.from({ length: count }, (_, index) => [`记录${index}`, index])]);
function fixture() {
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: '<gametxt>开场</gametxt>', data: { protected: true } },
    { message_id: 1, role: 'user', message: '调查', data: { protected: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>正文不变</gametxt>', data: {
      stat_data: { 其他列表: list(31), 消耗品列表: Array.from({ length: 30 }, () => '物品'), 人物关系列表: list(41),
        武器列表: list(100), 第三方: list(31), empty: {}, number: 42 },
      npc_data: { ...list(41), 人物: { 名称: '人物', 能力清单: list(100), 补充: list(31) } },
      world_data: { 随机D100: list(100), 扩展: list(31) },
      otherPlugin: { keep: true }, cryptLord: { ignored: list(100) },
    } },
  ], variables: { otherPlugin: { keep: true } }, script: 'growth-script', page: 0,
    configWrites: 0, floorWrites: [], fail: false, postFail: false, configReadFail: false, floorFail: false, hook: null,
    chat: 'growth-chat', document: {}, view: null };
  state.view = { SillyTavern: { getCurrentChatId: () => state.chat } };
  const modules = {}, handlers = new Map(), warnings = [];
  const events = { CHAT_CHANGED: 'chat', MESSAGE_UPDATED: 'updated', MESSAGE_SWIPED: 'swipe', MESSAGE_DELETED: 'deleted',
    GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' };
  const emit = async (key, ...args) => { for (const callback of handlers.get(events[key]) || []) await callback(...args); };
  const host = {
    getScriptId: () => state.script,
    scriptVariableOptions: () => ({ type: 'script', script_id: state.script }),
    async getVariables(options) { assert.equal(options.type, 'script'); await state.hook?.('config-read');
      if (state.configReadFail) throw Error('配置读取失败'); return structuredClone(state.variables); },
    async updateVariablesWith(update, options) {
      assert.equal(options.script_id, state.script); await state.hook?.('config-write');
      if (state.fail) throw Error('模拟保存失败');
      const next = await update(structuredClone(state.variables));
      state.variables = structuredClone(next); state.configWrites++;
      if (state.postFail) state.configReadFail = true;
      if (state.lost) throw Error('提醒响应丢失');
      await state.hook?.('config-saved');
    },
    async getChatMessages(range, options) {
      await state.hook?.('floor-read'); if (state.floorFail) throw Error('模拟楼层读取失败');
      const rows = range === '0-{{lastMessageId}}' ? state.floors : state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => {
        const {message, data, extra, ...rest} = row, length = Math.max(2, state.page + 1);
        return {...rest, swipe_id: state.page, swipes: Array.from({length}, (_, index) => index === state.page ? message : '未选分支'),
          swipes_data: Array.from({length}, (_, index) => index === state.page ? data : {protected: true}),
          swipes_info: Array.from({length}, () => ({})), ...state.pages?.[row.message_id]};
      }) : rows);
    },
    async setChatMessages(rows) {
      if (state.fail) throw Error('模拟楼层保存失败');
      rows.forEach(row => {
        assert.equal(row.message_id, 2); Object.assign(state.floors[2], structuredClone(row)); state.floorWrites.push(row.message_id);
      });
    },
    generate() { assert.fail('不允许模型请求'); }, getWorldbook() { assert.fail('不允许世界书访问'); },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => ({ document: state.document, window: state.view }), tavernEvents: () => events,
    bindEvent(event, callback) { const set = handlers.get(event) || new Set(); set.add(callback); handlers.set(event, set);
      return { stop: () => set.delete(callback) }; } };
  const runtime = { console: { ...console, warn: (...args) => warnings.push(args) }, structuredClone, DOMException, setTimeout, clearTimeout,
    cryptLord: { __stage1Modules: modules, contract: {
      initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
    } } };
  runtime.window = runtime; vm.createContext(runtime); vm.runInContext(nativeSource, runtime);
  vm.runInContext(source, runtime); vm.runInContext(storeSource, runtime);
  return { state, host, modules, api: modules['cryptLord.collectionGrowth'], emit, warnings };
}
function shape(text, name) {
  const index = text.indexOf(`${name} = z.object(`); assert.ok(index >= 0, name);
  const tree = createSourceFile('schema.js', text.slice(index), 99, true, ScriptKind.JS); let keys;
  const visit = node => {
    if (keys) return;
    if (isCallExpression(node) && node.expression.getText(tree) === 'z.object' && isObjectLiteralExpression(node.arguments[0]))
      keys = node.arguments[0].properties.map(property => property.name.text);
    else forEachChild(node, visit);
  };
  visit(tree); assert.ok(keys); return keys;
}
const originalKnown = {
  stat_data: [...new Set([...shape(original, '_statDataBase'), ...shape(schema, 'BaseAttributesSchema'), ...shape(schema, 'CurrentAttributesSchema')])],
  npc_data: [...shape(schema, '_NpcObjectiveBase'), ...shape(schema, 'BaseAttributesSchema'), ...shape(schema, 'CurrentAttributesSchema')],
  world_data: shape(schema, 'window.worldDataSchema'),
};
test('完整原版计数独立对照与配置事务：已知字段、三域扫描、零写入、静音/恢复及冲突保护', async () => {
  const f = fixture(), { api, state } = f;
  assert.match(loader, /core\/collection-growth\.js/); assert.match(loader, /modules\/collection-growth\/index\.js/);
  assert.match(loader, /modules\/collection-growth\/style\.css/);
  assert.match(shell, /id: 'collection-growth', label: '变量增殖提醒'/);
  assert.match(settingsUi, /api\.open\(\{ tab: 'settings' \}\)/);
  for (const key of Object.keys(originalKnown)) assert.deepEqual(plain(api.known[key]).sort(), originalKnown[key].sort());
  const oracleWindow = { statDataKnownKeys: originalKnown.stat_data, npcObjectiveKnownKeys: originalKnown.npc_data,
    worldDataKnownKeys: originalKnown.world_data };
  const collected = [];
  vm.runInNewContext(original.slice(original.indexOf('window.growthReminderConfig ='), original.indexOf('function validateAndMigrateStatData')), {
    window: oracleWindow, console: { log() {}, warn() {} }, setTimeout: callback => callback(),
  });
  oracleWindow.showGrowthReminderModal = rows => collected.push(plain(rows));
  const initial = structuredClone(state.floors);
  let loaded = await api.load();
  assert.equal(state.configWrites, 0); assert.equal(state.floorWrites.length, 0);
  oracleWindow.checkCollectionGrowth(state.floors[2].data);
  const modern = api.inspect(state.floors[2].data).map(row => row.kind === 'named' ?
    { kind: row.kind, target: row.group, count: row.count, threshold: row.threshold } :
    { kind: row.kind, pathLabel: row.pathLabel, count: row.count, threshold: row.threshold });
  assert.deepEqual(plain(modern), collected[0]); assert.equal(api.count(list(30)), 30); assert.equal(api.count(Array(31)), 31);
  assert.equal(api.count(null), 0); assert.equal(api.count('字符串'), 0);
  assert.equal(api.inspect({ stat_data: { 其他列表: list(30) } }).length, 0);
  assert.equal(api.inspect({ stat_data: { 其他列表: list(31) } }).length, 1);
  const complex = api.collections({ npc_data: { '甲.乙': { 丙: list(31) }, 甲: { '乙.丙': list(31) } } });
  assert.equal(new Set(complex.filter(row => row.kind === 'unknown').map(row => row.id)).size, 2);
  state.variables['cryptLord.collectionGrowth'] = { version: 1, future: { keep: true }, targets: {
    其他列表: { threshold: 30, permanentlyMuted: false, future: '保留' }, extension: { keep: true },
  } };
  loaded = await api.load(); const config = structuredClone(loaded.config); config.targets.其他列表.threshold = 999;
  loaded = (await api.saveConfig(loaded, config)).loaded;
  assert.equal(loaded.config.future.keep, true); assert.equal(loaded.config.targets.其他列表.future, '保留');
  assert.equal(loaded.config.targets.extension.keep, true); assert.equal(state.variables.otherPlugin.keep, true);
  assert.deepEqual(state.floors, initial);
  const before = state.configWrites; assert.equal((await api.saveConfig(loaded, loaded.config)).unchanged, true);
  assert.equal(state.configWrites, before);
  for (const value of [0, 1000, 1.5, NaN, '30']) {
    const bad = structuredClone(loaded.config); bad.targets.其他列表.threshold = value;
    await assert.rejects(api.saveConfig(loaded, bad), /配置无效/);
  }
  for (const mutate of [
    s => { s.floors[2].message += '外部正文'; }, s => { s.floors[2].data.otherPlugin.keep = false; }, s => { s.page++; },
    s => { s.floors.push({ message_id: 3, role: 'user', message: '新回合', data: {} }); },
  ]) {
    const g = fixture(), baseline = await g.api.load(); mutate(g.state);
    await assert.rejects(g.api.acknowledge(baseline, ['其他列表']), /变化/); assert.equal(g.state.configWrites, 0);
    assert.equal(g.api.status().acknowledged, 0);
  }
  const conflict = fixture(), baseline = await conflict.api.load();
  conflict.state.hook = kind => {
    if (kind === 'config-write') conflict.state.variables['cryptLord.collectionGrowth'] = conflict.api.defaults();
  };
  await assert.rejects(conflict.api.saveConfig(baseline, { ...baseline.config, targets: { ...baseline.config.targets,
    其他列表: { threshold: 1, permanentlyMuted: false } } }), /变化/);
  assert.equal(conflict.state.configWrites, 0);
  const queued = fixture(), queuedBaseline = await queued.api.load();
  const first = structuredClone(queuedBaseline.config), second = structuredClone(queuedBaseline.config);
  first.targets.其他列表.threshold = 2; second.targets.其他列表.threshold = 3;
  const one = queued.api.saveConfig(queuedBaseline, first), two = queued.api.saveConfig(queuedBaseline, second);
  first.targets.其他列表.threshold = 999;
  const results = await Promise.allSettled([one, two]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
  assert.equal(queued.state.variables['cryptLord.collectionGrowth'].targets.其他列表.threshold, 2);
  const late = fixture(), lateBaseline = await late.api.load(); let inside = false;
  late.state.hook = kind => {
    if (kind === 'config-write') inside = true;
    if (kind === 'floor-read' && inside) late.state.variables.otherPlugin.keep = false;
  };
  await assert.rejects(late.api.acknowledge(lateBaseline, ['其他列表']), /变化/);
  assert.equal(late.state.configWrites, 0); assert.equal(late.state.variables.otherPlugin.keep, false);
  const tampered = fixture(), untrusted = await tampered.api.load(); untrusted.alerts = [];
  await tampered.api.acknowledge(untrusted); assert.ok(tampered.api.status().acknowledged > 0);
  assert.equal(tampered.state.configWrites, 0);
  const fail = fixture(), failBaseline = await fail.api.load(); fail.state.fail = true;
  await assert.rejects(fail.api.acknowledge(failBaseline, ['其他列表']), /保存失败/);
  assert.equal(fail.api.status().acknowledged, 0);
  fail.state.fail = false; fail.state.postFail = true;
  assert.match((await fail.api.acknowledge(await fail.api.load(), ['其他列表'])).warning, /已保存.*复核失败/);
  const stale = fixture(), staleBaseline = await stale.api.load();
  await stale.emit('CHAT_CHANGED');
  await assert.rejects(stale.api.acknowledge(staleBaseline), { name: 'AbortError' });
  stale.api.dispose(); await assert.rejects(stale.api.load(), { name: 'AbortError' });
  const submitted = fixture(), submittedBaseline = await submitted.api.load();
  submitted.state.hook = kind => { if (kind === 'config-saved') return submitted.emit('CHAT_CHANGED'); };
  assert.match((await submitted.api.acknowledge(submittedBaseline, ['其他列表'])).warning, /已保存/);
  assert.equal(submitted.state.configWrites, 1); assert.equal(submitted.api.status().acknowledged, 0);
});
test('完整原生保存与提醒生命周期：落盘后检测、会话去重、恢复未知路径、取消、失败不影响正文', async () => {
  const f = fixture(), { api, state, modules } = f, store = modules['cryptLord.stateStore'];
  const deliveries = []; api.subscribe(loaded => deliveries.push(loaded));
  const protectedFloors = structuredClone(state.floors.slice(0, 2));
  const tick = () => new Promise(resolve => setTimeout(resolve, 10));
  await store.writeAssistantMessage(2, state.floors[2].message, state.floors[2].data);
  await tick(); assert.equal(deliveries.length, 1); assert.deepEqual(state.floorWrites, [2]);
  await api.acknowledge(deliveries[0]);
  await store.writeAssistantData(2, state.floors[2].data); await tick(); assert.equal(deliveries.length, 1);
  state.variables['cryptLord.collectionGrowth'] = api.defaults();
  state.variables['cryptLord.collectionGrowth'].targets.其他列表.threshold = 20;
  {
    const loaded = await api.load();
    assert.deepEqual(plain(loaded.alerts.map(row => row.group)), ['其他列表']);
    await api.acknowledge(loaded);
  }
  await api.saveConfig(await api.load(), (await api.load()).config, undefined, ['_unknown']);
  await api.observe(); assert.equal(deliveries.length, 2);
  assert.ok(deliveries[1].alerts.every(row => row.kind === 'unknown'));
  await api.acknowledge(deliveries[1], ['_unknown']);
  await api.observe(); assert.equal(deliveries.length, 2);
  const loaded = await api.load(), config = structuredClone(loaded.config);
  config.targets._unknown.permanentlyMuted = false;
  await api.saveConfig(loaded, config, undefined, ['_unknown']);
  await api.observe(); assert.equal(deliveries.length, 3);
  await f.emit('CHAT_CHANGED'); await api.observe(); assert.equal(deliveries.length, 4);
  state.floors.push({ message_id: 3, role: 'user', message: '新回合', data: {} });
  assert.equal((await api.observe()).skipped, true); assert.equal((await api.load()).floor, null); state.floors.pop();
  const late = fixture(), lateBaseline = await late.api.load(); let valid = true;
  late.state.hook = kind => { if (kind === 'config-write') valid = false; };
  await assert.rejects(late.api.acknowledge(lateBaseline, ['其他列表'], () => valid), { name: 'AbortError' });
  assert.equal(late.state.configWrites, 0); assert.equal(late.api.status().acknowledged, 0);
  state.configReadFail = true;
  await store.writeAssistantMessage(2, '成功正文', state.floors[2].data); await tick();
  assert.equal(state.floors[2].message, '成功正文'); assert.ok(f.warnings.some(row => String(row[0]).includes('楼层已保存')));
  assert.deepEqual(state.floors.slice(0, 2), protectedFloors); assert.equal(state.floors[2].data.otherPlugin.keep, true);
  state.configReadFail = false; api.dispose(); await store.writeAssistantData(2, state.floors[2].data);
  assert.equal(deliveries.length, 4);
  const exact = fixture(), e = exact.api, es = exact.state;
  let baseline = await e.load();
  await assert.rejects(e.acknowledge(structuredClone(baseline)), /来源无效/);
  es.pages = {2: (await exact.host.getChatMessages('2', {include_swipes: true}))[0]};
  es.pages[2].swipes_data[1].external = true;
  await assert.rejects(e.acknowledge(baseline, ['其他列表']), /变化/); assert.equal(es.configWrites, 0);
  es.pages = {}; es.floors[2].is_hidden = true;
  assert.equal((await e.load()).floor, null); assert.match((await e.load()).reason, /隐藏/);
  es.floors[2].is_hidden = false; baseline = await e.load();
  await exact.emit('GENERATION_STARTED', 'quiet', {}, false);
  await exact.emit('GENERATION_STARTED', 'normal', {dryRun: true}, false);
  await exact.emit('GENERATION_STARTED', 'normal', {}, true);
  assert.ok((await e.observe()).loaded);
  await exact.emit('GENERATION_STARTED', 'normal', {}, false);
  assert.equal((await e.observe()).skipped, true);
  await assert.rejects(e.acknowledge(baseline, ['其他列表']), {name: 'AbortError'});
  await exact.emit('GENERATION_ENDED');
  await assert.rejects(e.acknowledge(baseline, ['其他列表']), {name: 'AbortError'});
  baseline = await e.load(); es.lost = true;
  const recovered = await e.acknowledge(baseline, ['其他列表']);
  assert.match(recovered.warning, /响应丢失后已确认/); assert.equal(es.configWrites, 1);
  assert.equal(recovered.loaded.config.targets.其他列表.permanentlyMuted, true);
  await assert.rejects(e.acknowledge(baseline), /来源无效/); assert.equal(es.configWrites, 1);
  const identity = fixture(), identityBaseline = await identity.api.load();
  identity.modules['cryptLord.hostApi'] = {...identity.host};
  await assert.rejects(identity.api.acknowledge(identityBaseline, ['其他列表']), /身份已变化/);
  assert.equal(identity.state.configWrites, 0);
  const retry = fixture(), retryBaseline = await retry.api.load(), update = retry.host.updateVariablesWith;
  retry.host.updateVariablesWith = async fn => {await fn(structuredClone(retry.state.variables)); throw Error('变换返回但没有落盘')};
  const changed = structuredClone(retryBaseline.config); changed.targets.其他列表.threshold = 20;
  await assert.rejects(retry.api.saveConfig(retryBaseline, changed), /没有落盘/);
  retry.host.updateVariablesWith = update;
  await retry.api.saveConfig(retryBaseline, changed); assert.equal(retry.state.configWrites, 1);
  const mismatch = fixture(), mismatchBaseline = await mismatch.api.load();
  mismatch.host.updateVariablesWith = async update => {await update(structuredClone(mismatch.state.variables))};
  const unconfirmed = await mismatch.api.acknowledge(mismatchBaseline, ['其他列表']);
  assert.match(unconfirmed.warning, /持久化配置不一致/); assert.equal(unconfirmed.loaded, null);
  assert.equal(mismatch.api.status().acknowledged, 0);
  await assert.rejects(mismatch.api.acknowledge(mismatchBaseline), /来源无效/);
  const tx = unconfirmed.transaction;
  await assert.rejects(tx.save(), /先核对/);
  assert.equal((await tx.inspect()).pending, true);
  assert.equal(tx.status().phase, 'pending'); assert.equal(mismatch.state.configWrites, 0);
  mismatch.host.updateVariablesWith = async update => {
    mismatch.state.variables = structuredClone(await update(structuredClone(mismatch.state.variables)));
    mismatch.state.configWrites++;
  };
  await tx.save(); assert.equal(tx.status().phase, 'saved'); assert.equal(mismatch.state.configWrites, 1);
  const ackCount = mismatch.api.status().acknowledged;
  await tx.save(); await tx.inspect();
  assert.equal(mismatch.state.configWrites, 1); assert.equal(mismatch.api.status().acknowledged, ackCount);

  const recovery = fixture(), recoveryBaseline = await recovery.api.load();
  const recoverTx = recovery.api.beginAcknowledgement(recoveryBaseline, ['其他列表']);
  recovery.state.postFail = true;
  assert.equal((await recoverTx.save()).pending, true); assert.equal(recoverTx.status().phase, 'uncertain');
  assert.equal(recovery.api.status().acknowledged, 0);
  await assert.rejects(recoverTx.save(), /先核对/);
  for (let index = 0; index < 2; index++) {
    await assert.rejects(recoverTx.inspect(), /读取失败/);
    assert.equal(recoverTx.status().phase, 'uncertain'); assert.equal(recovery.state.configWrites, 1);
  }
  recovery.state.configReadFail = false; recovery.state.variables.otherPlugin.concurrent = '保留';
  assert.match((await recoverTx.inspect()).warning, /核对后已确认/);
  assert.equal(recoverTx.status().phase, 'saved'); assert.ok(recovery.api.status().acknowledged > 0);
  assert.equal(recovery.state.configWrites, 1); assert.equal(recovery.state.variables.otherPlugin.concurrent, '保留');
  assert.equal(recovery.state.floorWrites.length, 0);

  const originalResult = fixture(), configBaseline = await originalResult.api.load();
  const desired = structuredClone(configBaseline.config); desired.targets.其他列表.threshold = 12;
  const configTx = originalResult.api.beginConfig(configBaseline, desired);
  desired.targets.其他列表.threshold = 999; originalResult.state.fail = true;
  await assert.rejects(configTx.save(), /保存失败/); assert.equal(configTx.status().phase, 'pending');
  originalResult.state.fail = false; await configTx.save();
  assert.equal(originalResult.state.variables['cryptLord.collectionGrowth'].targets.其他列表.threshold, 12);
  const resumeTx = originalResult.api.beginConfig(await originalResult.api.load(),
    (await originalResult.api.load()).config, undefined, ['其他列表']);
  await resumeTx.save(); await originalResult.api.acknowledge(await originalResult.api.load());
  await resumeTx.save(); await resumeTx.inspect();
  assert.equal((await originalResult.api.load()).alerts.length, 0); assert.equal(originalResult.state.configWrites, 1);

  for (const mutate of [
    f => { f.state.chat = 'other-chat'; }, f => { f.state.script = 'other-script'; },
    f => { f.state.document = {}; }, f => { f.state.view = {...f.state.view}; },
    f => { f.modules['cryptLord.nativeFloorSource'] = {...f.modules['cryptLord.nativeFloorSource']}; },
  ]) {
    const changed = fixture(), tx = changed.api.beginAcknowledgement(await changed.api.load(), ['其他列表']);
    mutate(changed); await assert.rejects(tx.save(), /变化|取消/);
    assert.equal(changed.state.configWrites, 0); assert.equal(tx.status().phase, 'conflict');
  }
  const external = fixture(), externalTx = external.api.beginAcknowledgement(await external.api.load(), ['其他列表']);
  external.state.postFail = true; await externalTx.save(); external.state.configReadFail = false;
  external.state.variables['cryptLord.collectionGrowth'].targets.其他列表.threshold = 22;
  await assert.rejects(externalTx.inspect(), /不符/); await assert.rejects(externalTx.save(), /失效/);
  assert.equal(external.state.configWrites, 1); assert.equal(external.api.status().acknowledged, 0);
  const dated = fixture();
  dated.state.variables.otherPlugin.date = new Date('2026-10-28T00:00:00Z');
  const datedTx = dated.api.beginAcknowledgement(await dated.api.load(), ['其他列表']); let updating = false;
  dated.state.hook = kind => {
    if (kind === 'config-write') updating = true;
    if (kind === 'floor-read' && updating) dated.state.variables.otherPlugin.date.setTime(1);
  };
  await assert.rejects(datedTx.save(), /变化/); assert.equal(dated.state.configWrites, 0);
  const refreshFailure = fixture(), noWriteAck = refreshFailure.api.beginAcknowledgement(await refreshFailure.api.load());
  refreshFailure.state.hook = kind => {
    if (kind === 'floor-read' && refreshFailure.api.status().acknowledged) refreshFailure.state.floorFail = true;
  };
  const confirmedWithoutReload = await noWriteAck.save();
  assert.match(confirmedWithoutReload.warning, /提醒已确认.*重新读取失败/);
  assert.equal(noWriteAck.status().phase, 'saved'); assert.equal(refreshFailure.state.configWrites, 0);
  assert.equal((await noWriteAck.save()).warning, confirmedWithoutReload.warning);
});
