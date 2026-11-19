import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const names = ['battle-experience', 'battle-life-save', 'battle-tags', 'battle-terrain-presets',
  'natural-environment', 'battlefield-painter', 'audience-imagination', 'grazing-state',
  'shaman-picture', 'battle-conditional-params', 'personal-battle-state', 'battle-formulas', 'battle-auras',
  'battle-field-effect-reference', 'battle-effect-reference', 'battle-effects',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-balance',
  'battle-punishment', 'battle-mythic-form', 'battle-exile', 'battle-active-leave',
  'battle-events', 'battle-rewind', 'battle-extra-action', 'battle-hard-control',
  'battle-mind-deprive', 'battle-temp-control', 'battle-permanent-control', 'battle-possession',
  'battle-rule-change', 'battle-environment', 'battle-fundamental', 'battle-summon',
  'battle-ability-borrow', 'battle-tactic-cpu', 'battle-team-conditions', 'battle-action-cpu',
  'battle-terrain-effects', 'battle-resource-status', 'battle-auto-pilot', 'battle-skill-control',
  'battle-report', 'team-battle-state', 'battle-session'];
const sources = await Promise.all(names.map(name => readFile(
  new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8')));
const shellSource = await readFile(
  new URL('../../public/guimizhizhu_ui/modules/game-shell/index.js', import.meta.url), 'utf8');
const nativeSources = await Promise.all(['native-floor-source', 'state-store'].map(name => readFile(
  new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8')));
const shellTree = ts.createSourceFile('shell.js', shellSource, 99, true, ts.ScriptKind.JS);
let lockSource;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'battleLocked') lockSource = node.getText(shellTree);
  ts.forEachChild(node, visit);
}
visit(shellTree);
assert.ok(lockSource);
const locked = vm.runInNewContext(`(${lockSource})`);
const plain = value => JSON.parse(JSON.stringify(value));
const pool = { pathways: { 占卜家途径: ['序列3-古代学者'], 猎人途径: ['序列9-猎人'] } };
const card = sequence => ({
  当前序列: sequence, 活力: 10000, 当前活力: 10000, 敏捷: 200, 当前敏捷: 200,
  灵性: 100000, 当前灵性: 100000, 人性: 100000, 当前人性: 100000,
  理智: 100000, 当前理智: 100000, 运气: 40,
  序列能力列表: { 能力: [
    { 名称: '试探', power: 1, range: 'global', cost: { type: 'currentSpirit', amount: 2 } },
    { 名称: '终结', power: 1000000, range: 'global', cost: { type: 'currentSpirit', amount: 2 } },
  ] },
});
const initial = () => ({
  stat_data: { ...card('序列3-古代学者'), 名称: '测试者', 人物关系列表: { 旧友: { 好感度: 200 } } },
  npc_data: { 敌甲: { ...card('序列9-猎人'), 敏捷: 10, 当前敏捷: 10,
    序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] } },
    旧友: { ...card('序列9-猎人'), 敏捷: 10, 当前敏捷: 10 } },
  preserved: { untouched: true },
});
function fixture() {
  const modules = {}, state = { requests: 0, notices: [], response: '{}', hook: null };
  const runtime = vm.createContext({ structuredClone, DOMException, Math, Date,
    console: { ...console, log() {}, warn() {} },
    cryptLord: { __stage1Modules: modules, contract: {
      initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
      async waitGlobalInitialized(key) { return modules[key]; },
    } },
  });
  runtime.window = runtime;
  sources.forEach(source => vm.runInContext(source, runtime));
  modules['cryptLord.abilityState'] = { loadPool: async () => structuredClone(pool) };
  modules['cryptLord.hostApi'] = { async generateRaw(config) {
    state.requests++;
    assert.equal(config.should_silence, true);
    assert.equal(config.max_chat_history, 0);
    assert.ok(config.ordered_prompts[0].content.includes('战场设计师'));
    await state.hook?.(); return state.response;
  } };
  modules['cryptLord.variableSettlementApi'] = { readSettings: async () => ({ useCustomApi: false }) };
  return { modules, state, runtime, engine: modules['cryptLord.teamBattleState'],
    session: modules['cryptLord.battleSession'],
    context: { notify: (...args) => state.notices.push(args) } };
}
function success(result) { assert.equal(result?.ok, true, result?.error); return result.data; }
const active = data => data.cryptLord.teamBattle;

test('统一个人整链：原版公式、移动/成本、NPC CPU、战术、召唤和完整战报', async () => {
  const f = fixture(), input = initial(), before = plain(input);
  let data = success(await f.session.prepare(input, { personal: true, npcKey: '敌甲', seed: 911 }, f.context));
  assert.deepEqual(plain(input), before);
  assert.equal(active(data).mode, 'duel'); assert.equal(active(data).units.length, 2);
  for (const key of ['formulas', 'summonMeta', 'actionCpuMeta', 'autoPilotMeta', 'skillControlMeta',
    'reportState', 'terrainEffectMeta', 'resourceStatusMeta']) assert.ok(active(data)[key], key);
  const engine = f.engine, cell = engine.reachable(data)[0];
  assert.ok(cell);
  data = success(engine.action(data, { type: 'move', x: cell.x, y: cell.y }));
  assert.ok(active(data).units[0].moves > 0);
  const spirit = data.stat_data.当前灵性;
  data = success(engine.action(data, { id: 'skill:能力:0', target: '敌甲' }));
  assert.equal(data.stat_data.当前灵性, spirit - 2);
  data = success(engine.advanceAuto(data));
  assert.equal(active(data).phase, 'tactic');
  const choices = engine.summonOptions(data);
  const projection = choices.find(row => row.subtype === '历史投影');
  assert.ok(projection?.rows.some(row => row.name === '旧友'));
  data = success(engine.summon(data, { subtype: '历史投影', target: '旧友' }, () => .99));
  assert.equal(active(data).round, 2);
  const summoned = active(data).units.find(row => row.isSummon);
  assert.ok(summoned && summoned.controller === 'player');
  assert.deepEqual(Object.keys(data.npc_data), Object.keys(before.npc_data));
  data = success(engine.action(data, { id: 'skill:能力:1', target: '敌甲' }));
  assert.equal(active(data).result, 'victory');
  const report = f.modules['cryptLord.battleReport'].build(data);
  assert.equal(report.ok, true, report.error); assert.match(report.text, /测试者|终结/);
  assert.ok(engine.report(data).experience.pool > 0);
  data = success(engine.settle(data, active(data).id, true));
  assert.equal(data.npc_data.敌甲.当前活力, 0);
  assert.ok(data.stat_data.$战斗经验 > 0);
  assert.deepEqual(plain(data.preserved), before.preserved);
});

test('结算及兼容边界：训练不造NPC/不给经验、重复/冲突拦截、旧对局保留、多人相邻路径', async () => {
  const f = fixture(), engine = f.engine, input = initial();
  let training = success(engine.startDuel(input, { enemyName: '敌甲', enemyHp: 30,
    enemyAgility: 0, seed: 11, summonPool: pool }));
  assert.equal(active(training).mode, 'practice');
  assert.equal(locked(training), true);
  training = success(engine.action(training, { id: 'skill:能力:1', target: '$practice' }));
  assert.equal(active(training).result, 'victory');
  assert.equal(locked(training), true);
  assert.equal(engine.report(training).experience.pool, 0);
  assert.deepEqual(plain(training.npc_data), plain(input.npc_data));
  const id = active(training).id;
  training = success(engine.settle(training, id, true));
  assert.equal(locked(training), false);
  assert.deepEqual(plain(training.npc_data), plain(input.npc_data));
  assert.equal(training.stat_data.$战斗经验, undefined);
  assert.equal(engine.settle(training, id, true).ok, false);
  assert.equal(engine.startDuel(input, { enemyHp: 'bad' }).ok, false);
  assert.equal(engine.startDuel({ ...input, npc_data: { $practice: card('普通人') } }).ok, false);
  let duel = success(engine.startDuel(input, { npcKey: '敌甲', summonPool: pool, seed: 11 }));
  assert.throws(() => f.modules['cryptLord.personalBattleState'].start(duel), /原版战斗/);
  duel = success(engine.action(duel, { id: 'skill:能力:1', target: '敌甲' }));
  const changed = structuredClone(duel); changed.npc_data.敌甲.当前灵性--;
  assert.equal(engine.settle(changed, active(changed).id, true).ok, false);
  assert.equal(engine.settle(changed, active(changed).id, false).ok, true);
  const old = f.modules['cryptLord.personalBattleState'];
  const legacy = old.start(input, { npcKey: '敌甲' }).data;
  assert.equal(engine.startDuel(legacy, { npcKey: '旧友' }).ok, false);
  const legacyRetreated = success(old.act(legacy, { type: 'retreat' }));
  assert.equal(old.get(legacyRetreated).status, 'finished');
  legacyRetreated.cryptLord.personalBattle.result = 'victory';
  assert.equal(engine.start(legacyRetreated, { enemies: ['旧友'] }).ok, false);
  legacyRetreated.cryptLord.personalBattle.experienceClaimed = true;
  const team = success(engine.start(legacyRetreated, { allies: ['旧友'], enemies: ['敌甲'],
    summonPool: pool, seed: 11 }));
  assert.equal(active(team).units.length, 3); assert.equal(active(team).mode, 'team');
  const won = success(engine.action(team, { id: 'skill:能力:1', target: '敌甲' }));
  assert.equal(active(won).result, 'victory');
  assert.equal(engine.report(won).experience.recipients.length, 2);
  assert.equal(success(engine.settle(won, active(won).id, true)).npc_data.敌甲.当前活力, 0);
  let stopped = success(engine.startDuel(input, { npcKey: '敌甲', summonPool: pool, seed: 11 }));
  const stoppedId = active(stopped).id;
  assert.equal(engine.end(stopped, stoppedId).ok, false);
  stopped = success(engine.action(stopped, { type: 'wait' }));
  stopped = success(engine.advanceAuto(stopped));
  assert.equal(active(stopped).phase, 'tactic');
  assert.equal(engine.end(stopped, 'stale').ok, false);
  stopped = success(engine.end(stopped, stoppedId));
  assert.equal(active(stopped).result, 'draw');
  assert.equal(active(stopped).autoPilot.on, false);
  assert.equal(Object.keys(active(stopped).summon.projections).length, 0);
  const stoppedSettlement = success(engine.settle(stopped, stoppedId, false));
  assert.deepEqual(plain(stoppedSettlement.npc_data), plain(input.npc_data));
  assert.equal(stoppedSettlement.stat_data.$战斗经验, undefined);
  assert.equal(old.weaponMoves(input).length, 0);
});

test('异步准备事务：关闭/服务卸载取消、途径库失败不降级、战场失败可回退且不改输入', async () => {
  const f = fixture(), input = initial(), before = plain(input);
  let valid = true;
  f.state.hook = () => { valid = false; };
  await assert.rejects(f.session.prepare(input, { personal: true, npcKey: '敌甲' },
    { ...f.context, guard: () => valid }), { name: 'AbortError' });
  assert.equal(f.state.notices.length, 0);
  assert.deepEqual(plain(input), before);
  const other = fixture();
  other.modules['cryptLord.abilityState'].loadPool = async () => { throw Error('途径库读取失败'); };
  await assert.rejects(other.session.prepare(input, { personal: true, npcKey: '敌甲' }), /途径库读取失败/);
  assert.equal(other.state.requests, 0);
  f.state.hook = null; f.state.response = 'not-json';
  const fallback = success(await f.session.prepare(input, { personal: true, npcKey: '敌甲' }, f.context));
  assert.equal(active(fallback).terrain.length, 0); assert.equal(f.state.notices.length, 1);
  assert.deepEqual(plain(input), before);
  f.state.hook = () => f.session.dispose();
  await assert.rejects(f.session.prepare(input, { personal: true, npcKey: '敌甲' }), { name: 'AbortError' });
  const changed = fixture();
  let settings = { useCustomApi: false };
  changed.modules['cryptLord.variableSettlementApi'].readSettings = async () => structuredClone(settings);
  changed.state.hook = () => { settings = { useCustomApi: true, model: 'changed' }; };
  await assert.rejects(changed.session.prepare(input, { personal: true, npcKey: '敌甲' }), /API 设置已变化/);
  assert.equal(changed.state.notices.length, 0);
});

test('整场原生保存：原结果重试、回执核对、只读恢复及完整消息页冲突', async () => {
  function nativeFixture() {
    const f = fixture(), flags = {};
    let data = initial(), writes = 0, operations = 0;
    const doc = {}, view = { SillyTavern: { getCurrentChatId: () => 'fixture-chat' } };
    const message = () => ({ message_id: 2, role: 'assistant', message: '正文', data: structuredClone(data) });
    const host = f.modules['cryptLord.hostApi'];
    host.scriptVariableOptions = () => ({ type: 'script', script_id: 'fixture-script' });
    host.getChatMessages = async (range, options = {}) => {
      if (flags.readFailure) throw Error('回读失败');
      const rows = range === '2' ? [message()] : [
        { message_id: 0, role: 'assistant', message: '开场', data: { preserved: true } }, message(),
      ];
      return options.include_swipes ? rows.map(row => {
        const { message, data, ...rest } = row;
        return { ...rest, swipe_id: 1, swipes: ['未选正文', message],
          swipes_data: [{ keep: flags.branch || '保留' }, data],
          swipes_info: [{ date: new Date('2026-10-16'), revision: flags.metadata || 0 }, {}] };
      }) : rows;
    };
    host.setChatMessages = async rows => {
      assert.deepEqual(Object.keys(rows[0]).sort(), ['data', 'message_id']);
      if (flags.failWrite) throw Error('写入失败');
      if (flags.noWrite) return;
      data = structuredClone(rows[0].data); writes++;
      if (flags.conflict) data.external = true;
      if (flags.failReadAfterWrite) flags.readFailure = true;
      if (flags.lostReceipt) throw Error('回执丢失');
    };
    f.modules['cryptLord.afterNativeHost'] = {
      getHost: () => ({ document: doc, window: view }), tavernEvents: () => ({}),
    };
    nativeSources.forEach(source => vm.runInContext(source, f.runtime));
    return { ...f, flags, message,
      writes: () => writes, operations: () => operations,
      async begin() { return f.session.transaction(message()); },
      operation(draft) { operations++; draft.stat_data.当前灵性 -= 7; return { ok: true, data: draft }; } };
  }
  const f = nativeFixture(), tx = await f.begin();
  f.flags.failWrite = true;
  await assert.rejects(tx.run(f.operation), /结果已保留/);
  assert.equal(tx.status(), 'pending'); assert.equal(f.operations(), 1);
  await assert.rejects(tx.run(f.operation), /不能重复计算/);
  f.flags.failWrite = false;
  const saving = tx.save();
  await assert.rejects(tx.save(), /不能重新提交/);
  const saved = await saving;
  assert.equal(saved.data.stat_data.当前灵性, initial().stat_data.当前灵性 - 7);
  assert.equal(f.writes(), 1); assert.equal(f.operations(), 1);
  await assert.rejects(tx.save(), /不能重新提交/);
  for (const kind of ['lostReceipt', 'failReadAfterWrite', 'noWrite', 'conflict']) {
    const g = nativeFixture(), current = await g.begin(); g.flags[kind] = true;
    if (kind === 'lostReceipt') {
      assert.match((await current.run(g.operation)).warning, /确认保存/);
      assert.equal(current.status(), 'saved');
    } else {
      await assert.rejects(current.run(g.operation), /待核对|结果已保留|请重新读取/);
      if (kind === 'failReadAfterWrite') {
        assert.equal(current.status(), 'uncertain');
        await assert.rejects(current.save(), /不能重新提交/);
        g.flags.readFailure = false;
        assert.equal((await current.inspect()).data.stat_data.当前灵性, initial().stat_data.当前灵性 - 7);
      }
      if (kind === 'noWrite') {
        g.flags.noWrite = false;
        await current.save();
      }
      if (kind === 'conflict') {
        assert.equal(current.status(), 'invalid');
        await assert.rejects(current.save(), /不能重新提交/);
      }
    }
    assert.equal(g.writes(), 1, kind); assert.equal(g.operations(), 1, kind);
  }
  for (const kind of ['branch', 'metadata', 'service']) {
    const g = nativeFixture(), current = await g.begin();
    g.flags.failWrite = true;
    await assert.rejects(current.run(g.operation), /结果已保留/);
    g.flags.failWrite = false;
    if (kind === 'service') g.modules['cryptLord.battleEffects'] = {};
    else g.flags[kind] = 'changed';
    await assert.rejects(current.save(), /已变化/);
    assert.equal(current.status(), 'invalid');
    assert.equal(g.writes(), 0); assert.equal(g.operations(), 1);
  }
});
