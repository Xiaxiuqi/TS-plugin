import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const calls = [];
let reply = '';
let battleCalls = 0;
const peer = { id: 'peer-1', 名称: '邻境业主', 状态: '存续', 战利品: { 名称: '密匣', 设定: '战场取得' }, 军队: [] };
const army = { id: 'army-1', 名称: '守军', 编成: [{ 兵种: '步兵', 数量: 100 }] };
modules['cryptLord.domainState'] = {
  peersOf: domain => domain.同级对手,
  deployListOf: domain => domain.出战名单,
  findArmy: (_domain, id) => id === army.id ? army : null,
  deployableArmies: () => [army],
  canDeploy: (_domain, item) => ({ ok: item === army }),
  maxDeploy: () => 4,
  runPeerBattle(domain, id, selected, _data, formation) {
    battleCalls++;
    assert.equal(id, peer.id);
    assert.equal(selected[0], army.id);
    assert.equal(formation[army.id]?.x, 3);
    assert.equal(formation[army.id]?.y, 4);
    domain.同级对手[0].状态 = '已吞并';
    domain.人口 += 10;
    return {
      ok: true, winner: 'A',
      result: { winner: 'A', units: [], events: [] },
      settlement: { settlement: { duration: '一刻' } },
      battleSettlement: { winner: 'A', casualties: ['守军-5'], annexed: true, canPromote: true, spoils: peer.战利品 },
    };
  },
};
modules['cryptLord.warReplay'] = { create: () => ({ digest: '守军获胜，敌军溃散' }) };
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return { useCustomApi: false }; } };
modules['cryptLord.hostApi'] = { async generateRaw(config) { calls.push(config); return reply; } };
const context = { console, Date, Math, cryptLord: {
  __stage1Modules: modules,
  contract: {
    initializeGlobal() {}, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  },
} };
context.window = context;
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/domain-campaign.js'), 'utf8'), context);
const flow = modules['cryptLord.domainCampaign'];
const original = { stat_data: { 领地: {
  已建立: true, 领地名: '灰雾郡', 地点: '贝克兰德', 线路: '市内', 等级: 1,
  人口: 500, 同级对手: [peer], 出战名单: [],
} }, world_data: {} };
let data = flow.start(original, peer.id);
assert.equal(flow.sessionOf(original), null);
assert.throws(() => flow.start(data, 'other'), /尚未结束/);
reply = '<裁定>未通过</裁定><理由>正在外地调查</理由>';
data = await flow.checkAbsence(data, '<gametxt>人在外地</gametxt>');
assert.equal(flow.sessionOf(data).stage, 'return');
assert.equal(calls.at(-1).custom_api, undefined);
assert.equal(calls.at(-1).ordered_prompts[0], 'world_info_before');
reply = '格式错误';
await assert.rejects(flow.checkAbsence(data, '正文'), /格式/);
assert.equal(flow.sessionOf(data).stage, 'return');
reply = '<战役正文>归途未尽。</战役正文>';
data = flow.record(data, 'return', '赶路', await flow.narrate(data, '正文', 'return', '赶路'));
for (const [stage, key, next] of [
  ['return', 'advance_return', 'muster'],
  ['muster', 'advance_depart', 'march'],
  ['march', 'advance_arrive', 'parley'],
]) {
  reply = `<战役正文>${stage}的阶段过渡。</战役正文>`;
  data = flow.record(data, stage, '', await flow.narrate(data, '正文', key), next);
}
assert.equal(flow.sessionOf(data).stage, 'parley');
assert.equal(flow.sessionOf(data).armyIds[0], army.id);
const deselected = flow.selectArmy(data, army.id, false);
assert.equal(flow.sessionOf(deselected).armyIds.length, 0);
data = flow.selectArmy(deselected, army.id, true);
assert.equal(flow.sessionOf(data).armyIds[0], army.id);
assert.throws(() => flow.position(data, army.id, 2, 1), /半区/);
data = flow.position(data, army.id, 3, 4);
assert.equal(flow.sessionOf(data).formation[army.id].x, 3);
assert.throws(() => flow.settle(data, ['unknown']), /无效/);
const pending = flow.settle(data, [army.id]);
assert.equal(flow.sessionOf(data).battle, null);
data = pending;
assert.equal(battleCalls, 1);
assert.equal(data.stat_data.领地.人口, 510);
assert.equal(flow.sessionOf(data).battle.settlement.spoils.名称, '密匣');
assert.throws(() => flow.settle(data, [army.id]), /重复/);
assert.throws(() => flow.abort(data), /不可放弃/);
reply = '无标签';
await assert.rejects(flow.narrate(data, '正文', 'advance_battle'), /标签/);
assert.equal(battleCalls, 1);
reply = '<战役正文>守军据战报获胜。</战役正文>';
data = flow.battleProse(data, await flow.narrate(data, '正文', 'advance_battle'));
assert.throws(() => flow.battleProse(data, '再写'), /已经生成/);
reply = '<战役正文>清点战场，密匣呈到领主面前。</战役正文>';
data = flow.aftermath(data, await flow.narrate(data, '正文', 'advance_aftermath_spoils'));
reply = '<战役正文>领主稍后回营。</战役正文>';
data = flow.record(data, 'aftermath', '回营', await flow.narrate(data, '正文', 'aftermath', '回营'));
assert.match(flow.exportText(data), /密匣/);
assert.match(flow.exportText(data), /归途未尽/);
assert.equal(flow.sessionOf(flow.finish(data)), null);
assert.equal(battleCalls, 1);
assert.equal(flow.sessionOf(data).stage, 'aftermath');
reply = '<裁定>通过</裁定><理由>领主在府内</理由>';
const present = await flow.checkAbsence(flow.start(original, peer.id), '领主在府内');
assert.equal(flow.sessionOf(present).stage, 'muster');
assert.equal(flow.sessionOf(present).hadReturn, false);
modules['cryptLord.variableSettlementApi'].readSettings = async () =>
  ({ useCustomApi: true, apiUrl: 'https://example.invalid/v1', apiKey: 'key', model: 'campaign-model' });
reply = '<战役正文>集结军队。</战役正文>';
await flow.narrate(present, '正文', 'muster', '点兵');
assert.equal(calls.at(-1).custom_api.model, 'campaign-model');
console.log('domain-campaign: absence, stages, army selection, atomic battle, retry, spoils and native export OK');

// Two additional integrated checks use the actual engine and native floor store.
{
  const entries = {
    extra: [{ name: '【配置】战争配置', content: JSON.stringify({ board: { cols: 2, rows: 4 }, maxPiecesPerSide: 2, weather: 'RAIN' }) }],
    bound: [{ name: '【配置】战争配置', content: JSON.stringify({
      board: { cols: 4, rows: 4 }, maxPiecesPerSide: 2, hardCapTicks: 200, reportMaxDamageSources: 1,
      defaults: { def: 3, luck: -5 }, hazards: [{ type: 'SPIKES', team: 'B' }],
    }) }, { name: '【配置】领地配置', content: JSON.stringify({ recruit: {
      mainTypeHpRatio: .7, troops: [{ id: 'infantry', 名称: '步兵', 军种: '陆军', 生命: 20,
        攻击: 8, 护盾: 1, 速度: 75, 技能: 'CHARGE', ap: 2, 暴击率: 15, attackFrames: { d: 10, t: 20 } }],
    } }) }],
  };
  let binding = { primary: 'bound', additional: ['extra'] }, hook = null;
  const writes = [], events = {}, handlers = {}, globals = {};
  const flags = { failRead: false, failWrite: false, lostReceipt: false, noWrite: false, postFail: false,
    conflict: false, page: 0, branch: '备用分支', derivations: 0, chat: 'campaign', script: 'campaign' };
  const protectedFloor = { message_id: 0, role: 'user', message: '不可修改', data: { private: true } };
  const pages = [protectedFloor, { message_id: 2, role: 'assistant', message: '<gametxt>领主在府内。</gametxt>',
    swipe_id: 0, data: { stat_data: { 领地: {
      已建立: true, 等级: 1, 人口: 500, 领地名: '灰雾郡', 地点: '贝克兰德', 线路: '市内',
      出战名单: ['guards'], 驻军: { 散兵: [], 军队: [{
        id: 'guards', 名称: '守军', 军种: '陆军', 主兵种: 'infantry',
        编成: [{ 军种: '陆军', 兵种: 'infantry', 精锐等级: 2, 数量: 20 }],
      }] }, 同级对手: [{ id: 'neighbor', 名称: '邻境', 战场: '陆战', 状态: '存续',
        战利品: { 名称: '密匣', 设定: '等待玩家处置' }, 军队: [{
          id: 'enemy', 名称: '敌军', 军种: '陆军', 主兵种: 'infantry',
          编成: [{ 军种: '陆军', 兵种: 'infantry', 精锐等级: 1, 数量: 10 }],
        }] }],
    } }, world_data: {} } }];
  const host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: flags.script }),
    async getCharWorldbookNames() { return structuredClone(binding); },
    async getWorldbook(name) {
      await hook?.(name);
      if (!entries[name]) throw Error(`worldbook ${name} not found`);
      return structuredClone(entries[name]);
    },
    async getChatMessages(range, options) {
      if (flags.failRead) throw Error('模拟楼层读取失败');
      const rows = range === '0-{{lastMessageId}}' ? pages : pages.filter(row => String(row.message_id) === range);
      return structuredClone(options?.include_swipes ? rows.map(row => ({
        message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: 1,
        swipes: [flags.branch, row.message], swipes_data: [{ keep: true }, row.data],
        swipes_info: [{ keep: true }, { date: new Date('2026-10-28T00:00:00Z'), revision: flags.page + (row.swipe_id || 0) }],
      })) : rows);
    },
    async setChatMessages(rows) {
      if (flags.failWrite) throw Error('模拟保存失败');
      if (flags.noWrite) return;
      writes.push(structuredClone(rows)); rows.forEach(row => Object.assign(pages.find(item => item.message_id === row.message_id), structuredClone(row)));
      if (flags.postFail) flags.failRead = true;
      if (flags.conflict) pages[1].data.conflict = true;
      if (flags.lostReceipt) throw Error('模拟回执丢失');
    },
    async generateRaw() { flags.modelCalls = (flags.modelCalls || 0) + 1; return '<战役正文>依照既定战果清点战场。</战役正文>'; },
  };
  globals['cryptLord.hostApi'] = host;
  globals['cryptLord.industryState'] = { parseWorldbookJson: JSON.parse };
  globals['cryptLord.afterNativeHost'] = {
    getHost: () => ({ window: actual, document: actual.document }),
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, callback) {
      const set = handlers[name] ||= new Set(); set.add(callback);
      events[name] = (...args) => { for (const fn of set) fn(...args); };
      return { stop() { set.delete(callback); } };
    },
  };
  globals['cryptLord.variableSettlementApi'] = { async readSettings() { return {}; } };
  const actual = { console, Math, structuredClone, DOMException, document: {},
    SillyTavern: { getCurrentChatId: () => flags.chat },
    Date: class extends Date { static now() { return 42; } },
    GameDBManager: { DB: { warConfig: { defaults: { def: 99999 }, weather: 'BLOODMOON', reportMaxDamageSources: 99 } } },
    cryptLord: { __stage1Modules: globals, contract: {
      initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { return globals[key]; },
    } } };
  actual.window = actual;
  for (const file of ['native-floor-source', 'response-normalizer', 'domain-defaults', 'domain-state', 'war-sim', 'war-replay', 'domain-campaign', 'state-store'])
    vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${file}.js`), 'utf8'), actual);
  const native = globals['cryptLord.stateStore'], domain = globals['cryptLord.domainState'];
  const campaign = globals['cryptLord.domainCampaign'], engine = globals['cryptLord.warSim'];
  const use = (rules, run) => domain.withWarRules(rules, run);
  const originalDB = await readFile(path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt'), 'utf8');
  const ast = ts.createSourceFile('original.js', originalDB, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let originalConfig;
  const visit = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'warConfig' && node.initializer.getText(ast).length > 1000)
      originalConfig = vm.runInNewContext(`(${node.initializer.getText(ast)})`);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(JSON.stringify(globals['cryptLord.domainDefaults'].warConfig), JSON.stringify(originalConfig));
  const rules = await domain.loadRules(undefined, true);
  assert.equal(rules.warConfig.board.cols, 4);
  assert.equal(rules.warConfig.weather, 'NEUTRAL', 'same-title primary replaces additional, not deep-merged');
  assert.equal(rules.warConfig.defaults.def, 3);
  assert.equal(rules.warConfig.defaults.luck, -5);
  const originalData = structuredClone(pages[1].data);
  const unit = use(rules, () => domain.armyToPiece(originalData.stat_data.领地.驻军.军队[0], 0));
  assert.equal(unit.ability, 'CHARGE'); assert.equal(unit.eliteLevel, 2); assert.equal(unit.count, 20);
  assert.equal(unit.speed, 75); assert.equal(unit.shield, 60); assert.equal(unit.def, 3); assert.equal(unit.ap, 2);
  const input = { seed: 42, config: rules.warConfig, teams: { A: [unit],
    B: use(rules, () => domain.peerPieces(originalData.stat_data.领地, 'neighbor')) } };
  const old = { console, window: {} };
  const warText = await readFile(path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34c-js-war-sim-and-strategies.txt'), 'utf8');
  const warAst = ts.createSourceFile('war-original.js', warText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const statement of warAst.statements) {
    if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression) &&
      ['window.WarSim', 'window.WarReport'].includes(statement.expression.left.getText(warAst)))
      vm.runInNewContext(statement.getText(warAst), old);
  }
  const originalResult = old.window.WarSim.simulate(input), result = engine.simulate(input);
  assert.equal(JSON.stringify(result.events), JSON.stringify(originalResult.events));
  assert.equal(JSON.stringify(result.units), JSON.stringify(originalResult.units));
  const stableReport = engine.buildReport(result).text;
  actual.GameDBManager.DB.warConfig.reportMaxDamageSources = 1000;
  assert.equal(engine.buildReport(result).text, stableReport);
  actual.WarSim = { simulate() { throw Error('external legacy engine must not be used'); } };
  assert.equal(JSON.stringify(engine.simulate(input).units), JSON.stringify(result.units));
  const unrecorded = engine.simulate({ ...input, config: { ...rules.warConfig, recordEvents: false, reportMaxDamageSources: 0 } });
  const finalOnly = globals['cryptLord.warReplay'].create(unrecorded, engine.buildReport(unrecorded));
  assert.equal(finalOnly.recorded, false);
  assert.equal(finalOnly.at(0).tick, unrecorded.ticks);
  assert.equal(JSON.stringify(finalOnly.at(0).units.map(unit => unit.hp)), JSON.stringify(unrecorded.units.map(unit => unit.hp)));
  const drillData = structuredClone(originalData);
  const drill = use(rules, () => domain.runDrill(drillData.stat_data.领地, ['guards']));
  assert.equal(drill.result.conf.cols, 4);
  assert.equal(JSON.stringify(drillData.stat_data.领地.驻军), JSON.stringify(originalData.stat_data.领地.驻军));
  assert.equal(drillData.stat_data.领地.同级对手[0].状态, '存续');
  await native.writeAssistantData(2, drillData, 'affected', undefined, undefined, { warfareRules: rules });
  let state = use(rules, () => campaign.start(pages[1].data, 'neighbor'));
  state = campaign.verdict(state, '<裁定>通过</裁定><理由>身在府内</理由>');
  state = campaign.record(state, 'muster', '', '出发', 'march');
  state = campaign.record(state, 'march', '', '抵达', 'parley');
  state = use(rules, () => campaign.position(state, 'guards', 3, 3));
  assert.throws(() => use(rules, () => campaign.position(state, 'guards', 4, 3)), /半区/);
  const settled = use(rules, () => campaign.settle(state, ['guards']));
  assert.equal(campaign.sessionOf(state).battle, null);
  assert.equal(settled.cryptLord.domainCampaign.battle.result.winner, 'A');
  assert.equal(settled.stat_data.领地.同级对手[0].完成方式, '战争吞并');
  await native.writeAssistantData(2, settled, 'affected', undefined, undefined, { warfareRules: rules });
  assert.throws(() => use(rules, () => campaign.settle(pages[1].data, ['guards'])), /重复/);
  const combatSnapshot = JSON.stringify(pages[1].data.stat_data.领地);
  state = campaign.battleProse(pages[1].data, await campaign.narrate(pages[1].data, '正文', 'advance_battle'));
  state = campaign.aftermath(state, await campaign.narrate(state, '正文', 'advance_aftermath_spoils'));
  assert.match(campaign.exportText(state), /密匣/);
  await native.writeAssistantData(2, campaign.finish(state), 'affected', undefined, undefined, { warfareRules: rules });
  assert.equal(JSON.stringify(pages[1].data.stat_data.领地), combatSnapshot);
  assert.equal(writes.length, 3);
  assert.equal(JSON.stringify(pages[0]), JSON.stringify(protectedFloor));
  console.log('warfare integrated: original config/engine parity, real troops, drill, formation, campaign, report, native settlement and narrative retry OK');

  globals['cryptLord.dynamicStatus'] = {
    async load() { flags.derivations++; return { rules: [] }; }, assertLoaded() {}, apply() {},
  };
  for (const mode of ['failWrite', 'lostReceipt', 'noWrite', 'postFail', 'conflict']) {
    pages[1].data = structuredClone(originalData);
    const loaded = await campaign.loadNative(2);
    assert.match(loaded.story, /领主在府内/); assert.doesNotMatch(loaded.story, /备用分支/);
    const next = use(loaded.rules, () => campaign.start(loaded.floor.data, 'neighbor'));
    const transaction = campaign.beginNative(loaded, next);
    const beforeWrites = writes.length, beforeDerivations = flags.derivations;
    flags[mode] = true;
    if (mode === 'lostReceipt') assert.match((await transaction.run()).warning, /已核对/);
    else {
      await assert.rejects(transaction.run(), /保留|待核对|已变化/);
      assert.equal(transaction.status(), mode === 'postFail' ? 'uncertain' : mode === 'conflict' ? 'invalid' : 'pending');
      await assert.rejects(transaction.run(), /不能重复/);
      if (mode === 'postFail') {
        await assert.rejects(transaction.inspect(), /待核对/);
        await assert.rejects(transaction.save(), /不能重新提交/);
      }
      flags[mode] = false; flags.failRead = false;
      if (mode === 'conflict') { await assert.rejects(transaction.save(), /不能重新提交/); continue; }
      assert.ok((await (mode === 'postFail' ? transaction.inspect() : transaction.save())).loaded);
    }
    flags[mode] = false;
    assert.equal(transaction.status(), 'saved');
    assert.equal(writes.length, beforeWrites + 1); assert.equal(flags.derivations, beforeDerivations + 1);
  }
  for (const boundary of ['body', 'data', 'page', 'branch', 'user', 'hidden', 'document', 'chat', 'script', 'generation', 'engine']) {
    pages[1].data = structuredClone(originalData);
    const loaded = await campaign.loadNative(2);
    const next = use(loaded.rules, () => campaign.start(loaded.floor.data, 'neighbor'));
    const transaction = campaign.beginNative(loaded, next), beforeWrites = writes.length;
    const oldEngine = globals['cryptLord.warSim'];
    if (boundary === 'body') pages[1].message += '\n外部新正文';
    if (boundary === 'data') pages[1].data.external = true;
    if (boundary === 'page') flags.page++;
    if (boundary === 'branch') flags.branch += '变化';
    if (boundary === 'user') pages.push({ message_id: 3, role: 'user', message: '新行动', data: {} });
    if (boundary === 'hidden') pages[1].is_hidden = true;
    if (boundary === 'document') actual.document = {};
    if (boundary === 'chat') flags.chat += '-changed';
    if (boundary === 'script') flags.script += '-changed';
    if (boundary === 'generation') { events.start('normal'); events.stop(); }
    if (boundary === 'engine') globals['cryptLord.warSim'] = { ...oldEngine };
    await assert.rejects(transaction.run(), /变化|取消/); assert.equal(writes.length, beforeWrites);
    if (boundary === 'user') pages.pop();
    if (boundary === 'hidden') delete pages[1].is_hidden;
    globals['cryptLord.warSim'] = oldEngine;
  }
  {
    const loaded = await campaign.loadNative(2);
    assert.throws(() => campaign.beginNative(structuredClone(loaded), loaded.floor.data), /来源无效/);
    loaded.story += '伪造正文';
    await assert.rejects(campaign.assertNative(loaded), /来源无效/);
    pages[1].is_hidden = true; assert.match((await campaign.loadNative(2)).reason, /隐藏/); delete pages[1].is_hidden;
    pages.push({ message_id: 3, role: 'user', message: '新一轮', data: {} });
    await assert.rejects(campaign.loadNative(), /没有真实/);
    assert.equal((await campaign.loadNative(2)).editable, false); pages.pop();
    for (const args of [['quiet'], ['quiet_prompt'], ['normal', { quiet_prompt: true }], ['dryRun'], ['normal', {}, true]]) {
      events.start(...args); await campaign.assertNative(await campaign.loadNative(2));
    }
  }
  {
    pages[1].data = use(rules, () => campaign.verdict(campaign.start(originalData, 'neighbor'),
      '<裁定>通过</裁定><理由>身在府内</理由>'));
    const loaded = await campaign.loadNative(2), settlement = globals['cryptLord.variableSettlementApi'];
    const beforeCalls = flags.modelCalls;
    settlement.readSettings = async () => { flags.page++; return {}; };
    await assert.rejects(campaign.narrate(loaded.floor.data, loaded.story, 'muster', '',
      undefined, () => campaign.assertNative(loaded)), /变化/);
    assert.equal(flags.modelCalls, beforeCalls, 'source is rechecked after async settings, before invoking the model');
    settlement.readSettings = async () => ({});
  }
  assert.ok(writes.every(rows => rows.every(row => row.message_id === 2 && !Object.hasOwn(row, 'message'))));
  assert.equal(JSON.stringify(pages[0]), JSON.stringify(protectedFloor));
  console.log('warfare native recovery: genuine swipe pages, signed baselines, one derivation, lost receipts and complete source guards OK');

  const count = writes.length;
  await assert.rejects(domain.assertWarRules(structuredClone(rules)), /来源/);
  const tampered = await domain.loadRules(undefined, true); tampered.warConfig.tickMs++;
  await assert.rejects(domain.assertWarRules(tampered), /来源/);
  const stale = await domain.loadRules(undefined, true);
  entries.bound[0].content = JSON.stringify({ board: { cols: 3, rows: 5 }, maxPiecesPerSide: 4 });
  await assert.rejects(native.writeAssistantData(2, pages[1].data, 'affected', undefined, undefined, { warfareRules: stale }), /已变化/);
  const odd = await domain.loadRules(undefined, true);
  const cells = use(odd, () => Array.from({ length: 4 }, (_, index) => domain.formationCell(index)));
  assert.equal(new Set(cells.map(cell => `${cell.x},${cell.y}`)).size, 4);
  assert.ok(cells.every(cell => cell.y >= 2 && cell.y < 5));
  const modifiedFloor = structuredClone(pages[1].data);
  hook = async () => { pages[1].swipe_id++; };
  await assert.rejects(native.writeAssistantData(2, modifiedFloor, 'affected', undefined, undefined, { warfareRules: odd }), /消息页/);
  hook = null;
  binding = { primary: 'extra', additional: ['bound'] };
  await assert.rejects(domain.assertWarRules(odd), /已变化/);
  binding = { primary: 'bound', additional: ['extra'] };
  entries.bound[0].content = '{"tickMs":0}';
  await assert.rejects(domain.loadRules(undefined, true), /正整数/);
  entries.bound[0].content = '{"defaults":{"attackFrames":{"d":30,"t":10}}}';
  await assert.rejects(domain.loadRules(undefined, true), /攻击帧/);
  entries.bound[0].content = '{"defaults":{"luck":"bad"}}';
  await assert.rejects(domain.loadRules(undefined, true), /有限数/);
  entries.bound[0].content = '{}';
  const cancelled = await domain.loadRules(undefined, true);
  events.chat();
  await assert.rejects(domain.assertWarRules(cancelled), /取消/);
  const current = await domain.loadRules(undefined, true);
  events.start('quiet'); await domain.assertWarRules(current);
  events.start('normal');
  await assert.rejects(domain.assertWarRules(current), /取消/);
  await assert.rejects(domain.loadRules(undefined, true), /取消/);
  events.end();
  const fresh = await domain.loadRules(undefined, true);
  const service = globals['cryptLord.domainState'];
  globals['cryptLord.domainState'] = { ...service };
  await assert.rejects(domain.assertWarRules(fresh), /取消/);
  globals['cryptLord.domainState'] = service;
  globals['cryptLord.warSim'] = null;
  assert.throws(() => use(current, () => domain.runDrill(structuredClone(originalData.stat_data.领地), ['guards'])), /引擎/);
  assert.equal(use(current, () => domain.runPeerBattle(structuredClone(originalData.stat_data.领地), 'neighbor', ['guards'])).ok, false);
  assert.equal(writes.length, count, 'all conflicts produce zero writes');
  domain.dispose();
  await assert.rejects(domain.assertWarRules(current), /取消/);
  console.log('warfare conflicts: forged/tampered/stale rules, switched binding/page/chat, invalid config and unavailable engine reject without writes OK');
}
