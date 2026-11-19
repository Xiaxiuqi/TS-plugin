import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = {
  console,
  cryptLord: {
    __stage1Modules: modules,
    contract: { initializeGlobal() {}, releaseGlobal() {} },
  },
};
context.window = context;
for (const file of ['core/war-sim.js', 'core/war-replay.js']) {
  const source = await readFile(path.join(base, 'public/guimizhizhu_ui', file), 'utf8');
  vm.runInNewContext(source, context, { filename: file });
}
const result = modules['cryptLord.warSim'].demo(42);
const report = modules['cryptLord.warSim'].buildReport(result);
const replay = modules['cryptLord.warReplay'].create(result, report);
assert.ok(result.events.length > 0);
assert.match(report.text, /存活|战果|胜/);
assert.match(replay.digest, /【战果】[\s\S]*【战场高光】[\s\S]*【双方终局】/);
assert.ok(replay.picks.length <= 8);
assert.equal(replay.at(0).units.length, result.units.length);
for (const unit of replay.at(0).units) {
  const spawn = result.events.find(event => event.type === 'spawn' && event.id === unit.id);
  assert.equal(unit.x, spawn.x);
  assert.equal(unit.y, spawn.y);
  assert.equal(unit.hp, spawn.hp);
}
for (const unit of replay.at(replay.maxTick).units) {
  const final = result.units.find(item => item.id === unit.id);
  assert.equal(unit.alive, final.alive, unit.id);
  assert.equal(unit.hp, final.hp, unit.id);
  assert.equal(unit.x, final.x, unit.id);
  assert.equal(unit.y, final.y, unit.id);
}
const synthetic = modules['cryptLord.warReplay'].create({
  ticks: 4, winner: 'A', conf: { cols: 8, rows: 6 },
  units: [
    { id: 'a', name: '友军', team: 'A', initialHp: 100, hp: 80, x: 2, y: 2, alive: true },
    { id: 'b', name: '敌军', team: 'B', initialHp: 100, hp: 0, x: 3, y: 2, alive: false },
  ],
  events: [
    { tick: 0, type: 'spawn', id: 'a', x: 1, y: 1, hp: 100 },
    { tick: 0, type: 'spawn', id: 'b', x: 3, y: 2, hp: 100 },
    { tick: 1, type: 'move', id: 'a', to: { x: 2, y: 2 } },
    { tick: 2, type: 'hit', id: 'a', hp: 60, shield: 0 },
    { tick: 3, type: 'heal', id: 'a', hp: 80, amount: 20, sourceId: 'a' },
    { tick: 4, type: 'death', id: 'b', killerId: 'a' },
  ],
}, { settlement: { duration: '2 分' } });
assert.equal(synthetic.at(0).units[0].x, 1);
assert.equal(synthetic.at(1).units[0].x, 2);
assert.equal(synthetic.at(2).units[0].hp, 60);
assert.equal(synthetic.at(3).units[0].hp, 80);
assert.equal(synthetic.at(3).units[1].alive, true);
assert.equal(synthetic.at(4).units[1].alive, false);
assert.match(synthetic.picks.at(-1).text, /击溃/);
assert.match(synthetic.digest, /友军|敌军/);
assert.equal(synthetic.at(999).tick, 4);
assert.equal(synthetic.at(-1).tick, 0);
console.log('war-replay: WarSim demo, event snapshots, seek, highlights and final state OK');

// One complete editor scenario, with original WarWindow conversion as an independent oracle.
{
  const globals = {}, writes = [];
  const flags = { failWrite: false, failRead: false, noWrite: false, lostReceipt: false,
    afterWriteFail: false, conflictWrite: false, chat: 'sandbox', script: 'sandbox',
    branch: '保护的备用正文', date: new Date('2026-10-28T00:00:00Z') };
  const handlers = new Map();
  let derivations = 0;
  const stack = count => ({ 军种: '陆军', 兵种: 'infantry', 数量: count, 精锐等级: 2 });
  const army = { id: 'guards', 名称: '守军', 军种: '陆军', 主兵种: 'infantry', 编成: [stack(20)] };
  const peer = { id: 'neighbor', 名称: '邻境', 状态: '存续', 战场: '陆战',
    军队: [{ ...army, id: 'enemy', 编成: [stack(10)] }] };
  const floors = [{ message_id: 0, role: 'user', message: '保护', data: { untouched: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>原生正文</gametxt>', swipe_id: 0,
      data: { stat_data: { 领地: { 已建立: true, 等级: 1, 出战名单: [army.id],
        驻军: { 军队: [army], 散兵: [] }, 同级对手: [peer], 物资库: { '1级军工品': 99 }, 人口: 500 } }, world_data: {} } }];
  let entries = [{ name: '【配置】战争配置',
    content: '{"board":{"cols":3,"rows":5},"maxPiecesPerSide":3,"hardCapTicks":200}' },
  { name: '【配置】领地配置', content: JSON.stringify({ recruit: { mainTypeHpRatio: .7, troops: [
    { id: 'infantry', 名称: '步兵', 军种: '陆军', 生命: 20, 攻击: 8, 护盾: 1, 技能: 'CHARGE' },
  ] } }) }];
  globals['cryptLord.hostApi'] = {
    scriptVariableOptions: () => ({ type: 'script', script_id: flags.script }),
    async getCharWorldbookNames() { return { primary: 'bound', additional: [] }; },
    async getWorldbook(name) { return structuredClone(name === 'bound' ? entries : []); },
    async getChatMessages(range, options) {
      if (flags.failRead) throw Error('模拟楼层读取失败');
      const rows = range === '0-{{lastMessageId}}' ? floors : floors.filter(row => String(row.message_id) === range);
      return structuredClone(options?.include_swipes ? rows.map(row => ({
        message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: 1,
        swipes: [flags.branch, row.message], swipes_data: [{ keep: true }, row.data],
        swipes_info: [{ keep: true }, { timestamp: flags.date, revision: row.swipe_id || 0 }],
      })) : rows);
    },
    async setChatMessages(rows) {
      if (flags.failWrite) throw Error('模拟保存失败');
      if (flags.noWrite) return;
      writes.push(structuredClone(rows));
      rows.forEach(row => Object.assign(floors.find(f => f.message_id === row.message_id), structuredClone(row)));
      if (flags.conflictWrite) floors[1].data.external = true;
      if (flags.afterWriteFail) flags.failRead = true;
      if (flags.lostReceipt) throw Error('模拟保存回执丢失');
    },
  };
  globals['cryptLord.industryState'] = { parseWorldbookJson: JSON.parse };
  const actual = { console, Math, Date, DOMException, structuredClone, document: {}, cryptLord: { __stage1Modules: globals,
    contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { return globals[key]; } } } };
  actual.window = actual;
  actual.SillyTavern = { getCurrentChatId: () => flags.chat };
  globals['cryptLord.afterNativeHost'] = {
    getHost: () => ({ window: actual, document: actual.document }),
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(key, fn) {
      const set = handlers.get(key) || new Set(); handlers.set(key, set); set.add(fn);
      return { stop: () => set.delete(fn) };
    },
  };
  globals['cryptLord.dynamicStatus'] = {
    async load() { derivations++; return { rules: [] }; }, async assertLoaded() {}, apply() {},
  };
  for (const file of ['native-floor-source', 'domain-defaults', 'domain-state', 'war-sim', 'war-sandbox', 'state-store'])
    vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${file}.js`), 'utf8'), actual);
  globals['cryptLord.domainDefaults'].roster[1] = [structuredClone(peer)];
  const domain = globals['cryptLord.domainState'], sandbox = globals['cryptLord.warSandbox'];
  const rules = await domain.loadRules(undefined, true), use = run => domain.withWarRules(rules, run);
  const original = JSON.stringify(floors), protectedDomain = structuredClone(floors[1].data.stat_data.领地);
  let data = sandbox.create(floors[1].data);
  data = sandbox.add(data, 'A', rules);
  data = sandbox.setField(data, 'A', 'a1', '名称', '<img onerror=alert(1)>', rules);
  data = sandbox.setField(data, 'A', 'a1', '数量', 7, rules);
  data = sandbox.setField(data, 'A', 'a1', '兵种', 'infantry', rules);
  data = sandbox.add(data, 'B', rules);
  assert.throws(() => sandbox.place(data, 'A', 'a1', 0, 1, rules), /半区/);
  assert.throws(() => sandbox.setField(data, 'B', 'b1', '数量', NaN, rules), /整数/);
  assert.throws(() => sandbox.setField(data, 'B', 'b1', '兵种', 'missing', rules), /不存在/);
  const source = await readFile(path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37c-js-domain-and-war-windows.txt'), 'utf8');
  const ast = ts.createSourceFile('original-window.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const klass = ast.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'WarWindow');
  const old = { window: {}, pickWarIcon: (_name, _elite, icon) => icon || 'infantry' };
  old.window.DomainCore = {
    findTroop: id => use(() => domain.findTroop(id)),
    findArmy: (d, id) => use(() => domain.findArmy(d, id)),
    armyToPiece: (_d, army, index) => use(() => domain.armyToPiece(army, index)),
    peerPieces: (d, id) => use(() => domain.peerPieces(d, id)),
  };
  vm.runInNewContext(`${klass.getText(ast)}; window.WarWindow = WarWindow;`, old);
  const legacy = new old.window.WarWindow({ currentMvuState: structuredClone(data) });
  const teams = sandbox.validate(data, rules, '陆战', true);
  assert.deepEqual(JSON.parse(JSON.stringify(teams.A)), JSON.parse(JSON.stringify(legacy.toPieces('A'))));
  assert.deepEqual(JSON.parse(JSON.stringify(teams.B)), JSON.parse(JSON.stringify(legacy.toPieces('B'))));
  const preview = sandbox.simulate(data, rules, 42);
  assert.equal(JSON.stringify(floors), original, 'editing and simulation have no native side effects');
  const same = globals['cryptLord.warSim'].simulate({ seed: 42, config: rules.warConfig,
    teams: { A: legacy.toPieces('A'), B: legacy.toPieces('B') } });
  assert.equal(JSON.stringify(preview.result.events), JSON.stringify(same.events));
  assert.equal(JSON.stringify(preview.result.units), JSON.stringify(same.units));
  data = sandbox.sync(data, rules);
  data = sandbox.importPeer(data, peer.id, rules);
  data = sandbox.place(data, 'A', 'guards', 2, 4, rules);
  const readback = sandbox.create(JSON.parse(JSON.stringify(data)));
  legacy.game.currentMvuState = structuredClone(readback);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.validate(readback, rules).A)), JSON.parse(JSON.stringify(legacy.toPieces('A'))));
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.validate(readback, rules).B)), JSON.parse(JSON.stringify(legacy.toPieces('B'))));
  assert.throws(() => sandbox.setField(data, 'A', 'guards', '生命', 9999, rules), /编成/);
  const battle = sandbox.simulate(readback, rules, 42);
  await globals['cryptLord.stateStore'].writeAssistantData(2, battle.data, 'affected', undefined, undefined, { warfareRules: rules });
  assert.equal(writes.length, 1);
  assert.equal(JSON.stringify(floors[1].data.stat_data.领地.驻军), JSON.stringify(protectedDomain.驻军));
  assert.equal(JSON.stringify(floors[1].data.stat_data.领地.同级对手), JSON.stringify(protectedDomain.同级对手));
  assert.equal(floors[1].data.stat_data.领地.人口, 500);
  assert.equal(floors[1].message, '<gametxt>原生正文</gametxt>');
  assert.match(sandbox.exportText(floors[1].data), /种子：42/);
  assert.equal(sandbox.roster(sandbox.clear(data, 'B'), 'B').length, 0);
  assert.equal(sandbox.warOf(sandbox.clear(data, 'B')).敌方来源, '');
  const overlapping = sandbox.add(sandbox.add(sandbox.clear(data, 'A'), 'A', rules), 'A', rules);
  assert.throws(() => sandbox.place(overlapping, 'A', 'a2', 0, 2, rules), /已有/);
  const tooMany = sandbox.add(overlapping, 'A', rules);
  assert.throws(() => sandbox.add(tooMany, 'A', rules), /上限/);
  const lost = structuredClone(readback); lost.stat_data.领地.驻军.军队 = [];
  assert.throws(() => sandbox.validate(lost, rules), /不存在/);
  entries = [{ ...entries[0], content: '{"board":{"cols":4,"rows":4},"maxPiecesPerSide":3}' }];
  await assert.rejects(globals['cryptLord.stateStore'].writeAssistantData(2, battle.data, 'affected',
    undefined, undefined, { warfareRules: rules }), /已变化/);
  assert.equal(writes.length, 1);
  console.log('war-sandbox: original conversion parity, complete editor/import/simulation/report/native save, odd geometry and source rejection OK');

  // The same editor chain now uses real native receipts and retries one prepared result.
  entries = [{ name: '【配置】战争配置',
    content: '{"board":{"cols":3,"rows":5},"maxPiecesPerSide":3,"hardCapTicks":200}' },
  { name: '【配置】领地配置', content: JSON.stringify({ recruit: { mainTypeHpRatio: .7, troops: [
    { id: 'infantry', 名称: '步兵', 军种: '陆军', 生命: 20, 攻击: 8, 护盾: 1, 技能: 'CHARGE' },
  ] } }) }];
  const baseline = structuredClone(floors), engine = globals['cryptLord.warSim'].WarSim, simulate = engine.simulate;
  let simulations = 0;
  engine.simulate = input => { simulations++; return simulate(input); };
  const reset = () => {
    floors.splice(0, floors.length, ...structuredClone(baseline));
    for (const key of ['failWrite', 'failRead', 'noWrite', 'lostReceipt', 'afterWriteFail', 'conflictWrite']) flags[key] = false;
  };
  for (const mode of ['failWrite', 'noWrite', 'lostReceipt', 'afterWriteFail']) {
    reset();
    const loaded = await sandbox.loadNative(2), before = writes.length, sims = simulations, derives = derivations;
    const transaction = sandbox.beginNative(loaded, sandbox.create(loaded.floor.data), { simulate: true, seed: 43 });
    flags[mode] = true;
    let saved;
    if (mode === 'lostReceipt') saved = await transaction.run();
    else {
      await assert.rejects(transaction.run(), /保存|核对/);
      if (mode === 'afterWriteFail') {
        assert.equal(transaction.status(), 'uncertain');
        await assert.rejects(transaction.inspect(), /待核对/);
        assert.equal(writes.length, before + 1);
        flags.failRead = false; saved = await transaction.inspect();
      } else {
        assert.equal(transaction.status(), 'pending');
        flags[mode] = false; saved = await transaction.save();
      }
    }
    assert.equal(transaction.status(), 'saved');
    assert.equal(saved.loaded.editable, true);
    assert.equal(simulations, sims + 1);
    assert.equal(derivations, derives + 1);
    assert.equal(writes.length, before + 1);
    assert.equal(sandbox.warOf(saved.data).最近战报.种子, 43);
    assert.equal(JSON.stringify(saved.result.events), JSON.stringify(engine.simulate({
      seed: 43, config: loaded.rules.warConfig, teams: sandbox.validate(loaded.floor.data, loaded.rules),
    }).events));
    await assert.rejects(transaction.save(), /不能重新提交/);
  }
  reset();
  {
    const loaded = await sandbox.loadNative(2), count = writes.length;
    await assert.rejects(sandbox.assertNative(structuredClone(loaded)), /来源无效/);
    const tampered = await sandbox.loadNative(2);
    tampered.floor.data.stat_data.领地.人口++;
    await assert.rejects(sandbox.assertNative(tampered), /来源无效/);
    const tx = sandbox.beginNative(loaded, loaded.floor.data, { simulate: true, seed: 44 });
    flags.conflictWrite = true;
    await assert.rejects(tx.run(), /已变化/);
    assert.equal(tx.status(), 'invalid');
    assert.equal(writes.length, count + 1);
    await assert.rejects(tx.save(), /不能重新提交/);
  }
  for (const change of [
    () => { flags.chat += '-changed'; }, () => { flags.script += '-changed'; },
    () => { flags.branch += '-changed'; }, () => { flags.date = new Date('2026-10-29T00:00:00Z'); },
    () => { floors[1].is_hidden = true; },
    () => { actual.document = {}; },
    () => { globals['cryptLord.dynamicStatus'] = { ...globals['cryptLord.dynamicStatus'] }; },
  ]) {
    reset();
    const loaded = await sandbox.loadNative(2), count = writes.length;
    change(); await assert.rejects(sandbox.assertNative(loaded), /变化|消息页/);
    assert.equal(writes.length, count);
  }
  reset();
  floors.push({ message_id: 3, role: 'user', message: '待回复', data: {} });
  await assert.rejects(sandbox.loadNative(), /没有真实/);
  assert.equal((await sandbox.loadNative(2)).editable, false);
  floors.pop(); floors[1].is_hidden = true;
  assert.equal((await sandbox.loadNative(2)).editable, false);
  reset();
  for (const args of [['quiet_prompt'], ['normal', { options: { quiet_prompt: true } }], ['normal', {}, true]]) {
    for (const fn of handlers.get('start') || []) fn(...args);
    await sandbox.assertNative(await sandbox.loadNative(2));
  }
  const stale = await sandbox.loadNative(2);
  for (const fn of handlers.get('start') || []) fn('normal');
  await assert.rejects(sandbox.assertNative(stale), /取消|变化/);
  for (const fn of handlers.get('stop') || []) fn();
  await sandbox.assertNative(await sandbox.loadNative(2));
  console.log('war-sandbox native recovery: one simulation/derivation, lost/no-write receipts, inspect-only recovery and full source boundaries OK');
}
