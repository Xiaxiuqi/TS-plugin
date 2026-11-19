import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const sources = await Promise.all(['native-floor-source', 'battle-experience', 'equipment-state', 'character-panel-state', 'state-store', 'inventory-state']
  .map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const split = '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/';
const originals = await Promise.all(['35b-js-game-manager-core.txt', '35c-js-backup-load-restore.txt', '34a-js-worldbook-database-tools.txt']
  .map(name => read(`${split}${name}`)));
function method(source, name) {
  const start = source.search(new RegExp(`^(?:async )?${name}\\(`, 'm'));
  assert.ok(start >= 0, name);
  const tree = ts.createSourceFile('original.js', `const rules={${source.slice(start)}`, 99, true, ts.ScriptKind.JS);
  return tree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(tree);
}
const database = ts.createSourceFile('db.js', originals[2], 99, true, ts.ScriptKind.JS);
const prune = database.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations])
  .find(node => node.name.getText(database) === 'pruneEmptyStackables').initializer.getText(database);
const safeGet = (value, keys, fallback = '') => {
  for (const key of Array.isArray(keys) ? keys : [keys]) if (value?.[key] != null) return value[key];
  return fallback;
};
const oracle = vm.runInNewContext(`({${method(originals[0], 'getTierOrder')},${method(originals[0], 'sortByTier')},
  ${method(originals[1], 'renderItemDetailsForInventory')},${method(originals[1], '_inventoryCategoryToListKey')},
  ${method(originals[1], 'batchDeleteItems')}})`,
  {window: {}, pruneEmptyStackables: vm.runInNewContext(prune), getChatMessages: async () => [],
    TavernHelper: {setChatMessages: async () => {}}, console});
oracle.SafeGetValue = safeGet;
oracle.syncEquippedItemsFromBooleans = oracle.refreshEquipmentSlots = oracle.updateDisplayedAttributes =
  oracle.showTemporaryMessage = oracle.toggleInventoryBatchMode = oracle.showInventory = () => {};
const plain = value => JSON.parse(JSON.stringify(value));
function sample() {
  return {stat_data: {姓名: '克莱恩', 当前序列: '序列9', 武器列表: {
    $meta: {extensible: true, 名称: '元数据', isEquipped: true},
    first: {名称: '短剑', 序列: '序列9', 活力: 4, attributes_bonus: {活力: 2}, isEquipped: true},
    same: {名称: '短剑', 序列: '普通', 活力: 88},
    locked: {名称: '强化枪', 序列: '序列4', $强化模块安装: {模块ID: '模块1'}},
  }, 衣物列表: [{name: '长袍', tier: '普通'}],
    扮演法列表: {a: {名称: '扮演', 品阶: '史诗'}}, 辅助能力列表: {a: {名称: '辅助'}},
    饰品列表: {a: {名称: '戒指'}}, 封印物列表: {a: {名称: '封印'}},
    消耗品列表: {a: {名称: '灵性药剂', 数量: 2.5, 单位: '瓶', 序列: '普通'},
      residue: {名称: '残条', 数量: 0.05}, english: {name: '旧式药剂', quantity: 1.3}},
    杂物列表: {legacy: {名称: '旧钥匙'}, shared: {名称: '旧同键'}},
    其他列表: {shared: {名称: '新同键'}, material: {名称: '矿石', 数量: 3}}},
    npc_data: {同伴: {当前序列: '序列9', 持有物品: '银钥匙', $战斗经验: 0, $战斗经验等级: 0},
      $meta: {extensible: true}}, world_data: {天气: '晴'}, otherPlugin: {keep: true}};
}
async function fixture() {
  const modules = {}, handlers = new Map(), writes = [], reads = [];
  const state = {floors: [
    {message_id: 0, role: 'assistant', message: '<UpdateVariable>不可在读取时初始化</UpdateVariable>', data: {opening: true}},
    {message_id: 1, role: 'user', message: '行动', data: {keep: true}},
    {message_id: 2, role: 'assistant', message: '原生正文\n\n<UpdateVariable>\n保留标签\n</UpdateVariable>', data: sample(), swipe_id: 0},
  ], readFail: false, writeFail: false, postFail: false, settle: null, readHook: null,
    branch: '备用分支', metadata: 0, chat: 'inventory', script: 'inventory', lostReceipt: false, noWrite: false};
  modules['cryptLord.hostApi'] = {
    scriptVariableOptions: () => ({type: 'script', script_id: state.script}),
    async getChatMessages(range, options) {
      reads.push(range);
      if (state.readHook) { const fn = state.readHook; state.readHook = null; await fn(); }
      if (state.readFail) throw Error('读取失败');
      const rows = range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        range === '0-{{lastMessageId}}' ? state.floors : state.floors.filter(row => row.message_id === Number(range));
      return structuredClone(options?.include_swipes ? rows.map(row => ({message_id: row.message_id,
        role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: 1,
        swipes: [state.branch, row.message], swipes_data: [{alternate: true}, row.data],
        swipes_info: [{keep: true}, {timestamp: new Date('2026-10-16T00:00:00Z'), revision: state.metadata}],
      })) : rows);
    },
    async setChatMessages(rows) {
      if (state.writeFail) throw Error('保存失败');
      if (state.noWrite) return;
      writes.push(structuredClone(rows));
      for (const row of rows) Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row));
      if (state.postFail) state.readFail = true;
      if (state.conflictWrite) state.floors[2].data.otherPlugin.conflict = true;
      if (state.lostReceipt) throw Error('回执丢失');
    },
  };
  const surface = {SillyTavern: {getCurrentChatId: () => state.chat}};
  const events = {CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop'};
  modules['cryptLord.afterNativeHost'] = {getHost: () => ({window: surface}), tavernEvents: () => events,
    bindEvent(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn);
      return {stop() {handlers.get(name).delete(fn)}}; }};
  modules['cryptLord.dynamicStatus'] = {async load() {if (state.settle) await state.settle(); return {rules: []}}, apply() {}};
  const context = {console, structuredClone, DOMException, cryptLord: {__stage1Modules: modules, contract: {
    initializeGlobal(key, api) {modules[key] = api}, releaseGlobal(key) {delete modules[key]},
    async waitGlobalInitialized(key) {assert.ok(modules[key], key); return modules[key]},
  }}};
  context.window = context; vm.createContext(context); sources.forEach(source => vm.runInContext(source, context));
  return {modules, state, writes, reads, api: modules['cryptLord.inventoryState'],
    async emit(name = 'CHAT_CHANGED', ...args) {for (const fn of handlers.get(events[name] || name) || []) await fn(...args)}};
}
function entry(loaded, listKey, itemKey) {
  return loaded.groups.flatMap(group => group.entries).find(row => row.listKey === listKey && row.itemKey === itemKey).selection;
}
test('完整物品栏原版规则：八分类、排序、完整详情、六槽、删除与赠予', async () => {
  const f = await fixture(), data = sample(), before = structuredClone(data), groups = f.api.view(data);
  assert.equal(groups.length, 8); assert.deepEqual(data, before);
  const weapons = groups.find(group => group.listKey === '武器列表').entries;
  const expectedOrder = oracle.sortByTier(Object.entries(data.stat_data.武器列表).filter(([key]) => key !== '$meta'),
    ([, item]) => safeGet(item, ['品阶', 'tier', '序列', 'sequence'], '普通')).map(([key]) => key);
  assert.deepEqual(plain(weapons.map(row => row.itemKey)), plain(expectedOrder));
  assert.deepEqual(plain(groups.at(-1).entries.map(row => row.name)), ['旧钥匙', '新同键', '矿石']);
  assert.equal(groups.at(-1).entries[1].listKey, '其他列表');
  assert.equal(groups.find(row => row.label === '消耗品').entries.length, 2);
  const item = {名称: '多属性', 活力: 4, 灵性: -2, attributes_bonus: {活力: 2, 灵性: 1},
    percentage_bonus: {敏捷: '10%', 人性: '-5%'}, 目标属性: '灵性', damage_bonus: 8,
    special_effects: '第一行\n第二行\n$__META_EXTENSIBLE__$', 副作用: '失眠', 自定义字段: '保留', deep: {x: 1}};
  const detail = f.api.details(item), html = oracle.renderItemDetailsForInventory(item);
  for (const [name, value] of detail.stats) {
    const identifier = name === '作用属性' ? 'target-attr' : name === '伤害加成' ? 'dmg-bonus' : name.replace('百分比', '');
    assert.ok(html.includes(identifier), name); assert.ok(html.includes(String(value)), value);
  }
  assert.deepEqual(plain(detail.extra), [['自定义字段', '保留']]);
  assert.deepEqual(plain(detail.effects), ['第一行', '第二行']); assert.equal(detail.sideEffect, '失眠');
  assert.deepEqual(plain(detail.structured), [['deep', {x: 1}]]);
  const loaded = await f.api.load(2), equipment = f.modules['cryptLord.equipmentState'];
  for (const group of loaded.groups.filter(row => row.equipable)) {
    const target = group.entries.find(row => !row.installed);
    const next = equipment.apply(data, target.listKey, target.itemKey, target.name, true);
    assert.equal(next.stat_data[target.listKey][target.itemKey].isEquipped, true);
    const off = equipment.apply(next, target.listKey, target.itemKey, target.name, false);
    assert.equal(off.stat_data[target.listKey][target.itemKey].isEquipped, false);
  }
  const equipped = equipment.apply(data, '武器列表', 'same', '短剑', true);
  assert.equal(equipped.stat_data.武器列表.first.isEquipped, false);
  assert.deepEqual(equipped.stat_data.武器列表.$meta, data.stat_data.武器列表.$meta);
  assert.throws(() => equipment.apply(data, '武器列表', '$meta', '元数据', true), /无效/);
  const twice = structuredClone(data); twice.stat_data.武器列表.same.isEquipped = true;
  const off = equipment.apply(twice, '武器列表', 'first', '短剑', false);
  assert.equal(off.stat_data.武器列表.same.isEquipped, false);
  const selection = {...entry(loaded, '消耗品列表', 'a'), amount: 1.2, expectedQuantity: 2.5};
  oracle.currentMvuState = structuredClone(data);
  await oracle.batchDeleteItems([{category: '消耗品', item: data.stat_data.消耗品列表.a, amount: 1.2}]);
  const removed = f.api.remove(data, [selection]);
  assert.deepEqual(plain(removed.data), plain(oracle.currentMvuState));
  assert.equal(removed.data.stat_data.消耗品列表.a.数量, 1.3);
  assert.throws(() => f.api.remove(data, [selection, selection]), /重复/);
  assert.throws(() => f.api.remove(data, [{...selection, amount: 0}]), /大于零/);
  assert.throws(() => f.api.remove(data, [{...selection, amount: 3}]), /不能超过/);
  assert.throws(() => f.api.remove(data, [{...selection, expectedQuantity: 1}]), /变化/);
  assert.throws(() => f.api.remove(data, [entry(loaded, '武器列表', 'locked')]), /模块/);
  const english = f.api.remove(data, [{...entry(loaded, '消耗品列表', 'english'), amount: .2, expectedQuantity: 1.3}]);
  assert.equal(english.data.stat_data.消耗品列表.english.quantity, 1.1);
  const arrays = structuredClone(data); arrays.stat_data.其他列表 = [{名称: 'A', 数量: 1}, {名称: 'B', 数量: 1}, {名称: 'C', 数量: 1}];
  const arrayRows = f.api.view(arrays).at(-1).entries.filter(row => row.listKey === '其他列表');
  const arrayResult = f.api.remove(arrays, [arrayRows[0], arrayRows[2]].map(row => ({...row.selection, expectedQuantity: 1})));
  assert.deepEqual(arrayResult.data.stat_data.其他列表.map(row => row.名称), ['B']);
  const gifted = f.api.gift(data, entry(loaded, '武器列表', 'same'), '同伴');
  assert.ok(gifted.data.stat_data.武器列表.first); assert.equal(gifted.data.stat_data.武器列表.same, undefined);
  assert.equal(gifted.gain, 25); assert.equal(gifted.data.npc_data.同伴.持有物品, '银钥匙、短剑');
  assert.equal(gifted.data.npc_data.同伴.$战斗经验, 25);
  assert.throws(() => f.api.gift(data, entry(loaded, '武器列表', 'locked'), '同伴'), /模块/);
  assert.throws(() => f.api.gift(data, entry(loaded, '武器列表', 'same'), '$meta'), /不存在/);
  const large = {stat_data: {武器列表: Array.from({length: 151}, (_, i) => ({名称: `物品${i}`}))}};
  assert.equal(f.api.view(large).find(row => row.label === '武器').entries.length, 151);
  const legacy = f.api.view({stat_data: {武器: {a: {名称: '旧武器'}}, 其他: {a: {名称: '旧杂物'}}}});
  assert.equal(legacy.find(row => row.label === '武器').entries[0].listKey, '武器');
  assert.equal(legacy.at(-1).entries[0].listKey, '其他');
  f.modules['cryptLord.savantEnhancement'] = {resolveWeapon(raw) {raw.战斗效果 = {基础效果: '法术攻击'}; return raw}};
  const projection = f.api.view(data).find(row => row.label === '武器').entries.find(row => row.itemKey === 'first');
  assert.equal(projection.details.structured[0][1].基础效果, '法术攻击');
  assert.equal(projection.selection.snapshot.战斗效果, undefined);
  assert.deepEqual(data, before); assert.deepEqual(f.writes, []);
});
test('完整原生保存链：只读来源、精确提交、失败重试、最终复核和生命周期', async () => {
  const f = await fixture(), opening = structuredClone(f.state.floors[0]), user = structuredClone(f.state.floors[1]);
  const originalMessage = f.state.floors[2].message, originalNpc = structuredClone(f.state.floors[2].data.npc_data);
  const loaded = await f.api.load(2), operation = {type: 'equip', selection: entry(loaded, '武器列表', 'same')};
  f.state.floors[2].data.stat_data.装备 = ['纯文本装备'];
  assert.match((await f.api.load(2)).compatibility[0][1], /纯文本装备/);
  delete f.state.floors[2].data.stat_data.装备;
  await f.api.load(0); assert.deepEqual(f.writes, []);
  assert.ok(f.reads.includes('0-{{lastMessageId}}'));
  const result = await f.api.commit(loaded, operation);
  assert.equal(result.loaded.floor.data.stat_data.武器列表.same.isEquipped, true);
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0].message_id, 2);
  assert.equal(f.state.floors[2].message, originalMessage);
  assert.deepEqual(f.state.floors[0], opening); assert.deepEqual(f.state.floors[1], user);
  assert.deepEqual(f.state.floors[2].data.npc_data, originalNpc);
  await assert.rejects(f.api.commit(loaded, operation), /已变化/);
  await assert.rejects(f.api.commit(await f.api.load(0), operation), /历史/);
  let current = await f.api.load(2);
  f.state.writeFail = true;
  await assert.rejects(f.api.commit(current, {type: 'unequip', selection: entry(current, '武器列表', 'same')}), /保存失败/);
  assert.equal(f.writes.length, 1);
  f.state.writeFail = false;
  await f.api.commit(current, {type: 'unequip', selection: entry(current, '武器列表', 'same')});
  const holdCase = async reason => {
    current = await f.api.load(2);
    let release, entered;
    const waiting = new Promise(resolve => entered = resolve);
    f.state.settle = async () => {entered(); await new Promise(resolve => release = resolve)};
    const writes = f.writes.length;
    const pending = f.api.commit(current, {type: 'equip', selection: entry(current, '武器列表', 'same')});
    await waiting;
    if (reason === 'chat') await f.emit();
    else if (reason === 'new-floor') f.state.floors.push({message_id: 3, role: 'user', message: '新回合'});
    else f.state.floors[2].message += '外部修改';
    release(); f.state.settle = null;
    await assert.rejects(pending, /变化|取消/); assert.equal(f.writes.length, writes);
    if (reason === 'new-floor') f.state.floors.pop();
  };
  let alive = true;
  await holdCase('message'); await holdCase('new-floor'); await holdCase('chat');
  current = await f.api.load(2);
  let release, entered;
  const waiting = new Promise(resolve => entered = resolve);
  f.state.settle = async () => {entered(); await new Promise(resolve => release = resolve)};
  const pending = f.api.commit(current, {type: 'equip', selection: entry(current, '武器列表', 'same')}, () => alive);
  await waiting; alive = false; release(); f.state.settle = null; await assert.rejects(pending, /取消/);
  alive = true;
  f.state.floors[2].data.cryptLord = {teamBattle: {status: 'finished', settled: false}};
  assert.equal((await f.api.load(2)).editable, false);
  f.state.floors[2].data.cryptLord.teamBattle.settled = true;
  assert.equal((await f.api.load(2)).editable, true);
  delete f.state.floors[2].data.cryptLord;
  current = await f.api.load(2); f.state.postFail = true;
  const recovery = f.api.begin(current, {type: 'equip', selection: entry(current, '武器列表', 'same')});
  await assert.rejects(recovery.run(), /保存状态待核对/); assert.equal(recovery.status(), 'uncertain');
  await assert.rejects(recovery.save(), /不能重新提交/);
  f.state.readFail = false; f.state.postFail = false;
  const confirmed = f.writes.length;
  const committed = await recovery.inspect(); assert.ok(committed.loaded); assert.equal(f.writes.length, confirmed);
  const fresh = await f.api.load(2);
  const selected = entry(fresh, '消耗品列表', 'a');
  const gift = {type: 'gift', selection: entry(fresh, '武器列表', 'same'), npcName: '同伴'};
  const one = f.api.commit(fresh, gift), two = f.api.commit(fresh, {type: 'remove',
    selections: [{...selected, amount: .5, expectedQuantity: 2.5}]});
  await one; await assert.rejects(two, /变化/);
  assert.equal(f.state.floors[2].data.npc_data.同伴.持有物品, '银钥匙、短剑');
  assert.deepEqual(f.state.floors[0], opening); assert.deepEqual(f.state.floors[1], user);
  assert.equal(f.state.floors[2].data.otherPlugin.keep, true);
  for (const mode of ['retry', 'lost-receipt', 'no-write', 'different-result']) {
    const g = await fixture();
    let derivations = 0;
    g.modules['cryptLord.dynamicStatus'].apply = data => { data.otherPlugin.derived = ++derivations; };
    const baseline = await g.api.load(2);
    const action = {type: 'gift', selection: entry(baseline, '武器列表', 'same'), npcName: '同伴'};
    const transaction = g.api.begin(baseline, action);
    action.npcName = '篡改后的目标';
    if (mode === 'retry') g.state.writeFail = true;
    if (mode === 'lost-receipt') g.state.lostReceipt = true;
    if (mode === 'no-write') g.state.noWrite = true;
    if (mode === 'different-result') g.state.conflictWrite = true;
    if (mode === 'lost-receipt') {
      assert.match((await transaction.run()).warning, /回执异常/);
    } else {
      await assert.rejects(transaction.run(), /结果已保留|保存后.*已变化/);
      if (mode === 'different-result') {
        assert.equal(transaction.status(), 'invalid');
        await assert.rejects(transaction.save(), /不能重新提交/);
        assert.equal(g.state.floors[2].data.otherPlugin.conflict, true);
        continue;
      }
      assert.equal(transaction.status(), 'pending');
      await assert.rejects(transaction.run(), /不能重复计算/);
      g.state.writeFail = false; g.state.noWrite = false;
      const [saved, duplicate] = await Promise.allSettled([transaction.save(), transaction.save()]);
      assert.equal(saved.status, 'fulfilled'); assert.equal(duplicate.status, 'rejected');
    }
    assert.equal(transaction.status(), 'saved'); assert.equal(g.writes.length, 1);
    assert.equal(derivations, 1); assert.equal(g.state.floors[2].data.otherPlugin.derived, 1);
    assert.equal(g.state.floors[2].data.npc_data.同伴.$战斗经验, 25);
    assert.equal(g.state.floors[2].data.npc_data.同伴.持有物品, '银钥匙、短剑');
    await assert.rejects(transaction.save(), /不能重新提交/);
  }
  for (const boundary of ['clone', 'tamper', 'branch', 'metadata', 'chat', 'script', 'writer', 'lock', 'normal-generation']) {
    const g = await fixture(); g.state.lock = false;
    g.modules['cryptLord.abilityState'] = {locked: () => g.state.lock};
    const baseline = await g.api.load(2), action = {type: 'equip', selection: entry(baseline, '武器列表', 'same')};
    if (boundary === 'clone') {
      await assert.rejects(g.api.commit(structuredClone(baseline), action), /凭据/); continue;
    }
    if (boundary === 'tamper') {
      baseline.floor.data.otherPlugin.keep = false;
      await assert.rejects(g.api.commit(baseline, action), /凭据/); continue;
    }
    const transaction = g.api.begin(baseline, action);
    if (boundary === 'branch') g.state.branch += '外部编辑';
    if (boundary === 'metadata') g.state.metadata++;
    if (boundary === 'chat') g.state.chat += '-new';
    if (boundary === 'script') g.state.script += '-new';
    if (boundary === 'writer') g.modules['cryptLord.stateStore'] = {};
    if (boundary === 'lock') g.state.lock = true;
    if (boundary === 'normal-generation') {
      await g.emit('GENERATION_STARTED', 'normal'); await g.emit('GENERATION_ENDED');
    }
    await assert.rejects(transaction.run(), /变化|取消/); assert.equal(g.writes.length, 0);
  }
  const quiet = await fixture(), quietBase = await quiet.api.load(2);
  for (const [type, options, dryRun] of [['quiet'], ['quiet_prompt'], ['normal', {quiet_prompt: 'tool'}],
    ['normal', {dryRun: true}], ['normal', {}, true], ['dryRun']])
    await quiet.emit('GENERATION_STARTED', type, options, dryRun);
  await quiet.api.commit(quietBase, {type: 'equip', selection: entry(quietBase, '武器列表', 'same')});
  quiet.state.floors[2].is_hidden = true;
  assert.match((await quiet.api.load()).reason, /隐藏/);
  quiet.state.floors.push({message_id: 3, role: 'user', message: '待回复', data: {}});
  await assert.rejects(quiet.api.load(), /assistant/);
  current = await f.api.load(2); f.api.dispose(); await assert.rejects(f.api.commit(current, operation), /取消/);
  const loader = await read('public/guimizhizhu_ui/loader.js'), shell = await read('public/guimizhizhu_ui/modules/game-shell/index.js');
  assert.match(loader, /modules\/inventory\/index\.js/); assert.match(loader, /modules\/inventory\/style\.css/);
  assert.match(shell, /inventoryUi'\]\.open\(state\.current\?\.message_id/);
});
