import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {}, requests = [];
let response = '<裁定>\n通过|序列4|无|无|已完成解析\n</裁定>', settings = { useCustomApi: false };
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
for (const name of ['attribute-recalculation', 'marionette-reference', 'marionette-state', 'mystery-analysis',
  'mystery-analysis-reference', 'mystery-analysis-state', 'state-store'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const pool = { pathways: {
  窥秘人途径: ['序列9-窥秘人', '序列6-卷轴教授', '序列5-星象师', '序列4-神秘学家', '序列3-预言大师'],
  阅读者途径: ['序列4-预言家'],
}, pictureConfig: {
  abilitySystemDB: { 预言家: '理智型' },
  abilitySystemConfig: { aliases: { 理智型: 'mind' },
    systems: { mind: { 活力: 1, 灵性: 2, 理智: 3, 人性: 4, 敏捷: 5, 运气: 6 } } },
} };
modules['cryptLord.variableSettlementApi'] = { async readSettings() { return settings; } };
modules['cryptLord.abilityState'] = { async loadPool() { return pool; } };
let latest, writes = [], failing = false;
modules['cryptLord.hostApi'] = {
  async generateRaw(config) { requests.push(config); return response; },
  async getChatMessages() { return [{ message_id: 2, role: 'assistant', message: '正文', data: latest }]; },
  async setChatMessages(rows) { if (failing) throw Error('写入失败'); latest = structuredClone(rows[0].data); writes.push(rows[0]); },
};
const initial = { stat_data: { 名称: '玩家', 当前序列: '序列5-星象师',
  其他列表: { 血样: { 数量: 1, 描述: '玩家已完成对序列4血样的解析' }, 无效: { 数量: .05 } },
  消耗品列表: { 药剂: { 数量: 2 } }, 活力: 100, 灵性: 100, 理智: 100, 人性: 100, 敏捷: 100, 运气: 100,
  当前活力: 30, 当前灵性: 40, $专属玩法: { 窥秘人途径: { 保留: { 值: 1 } } } },
  npc_data: { 保留: { 活力: 10 } }, cryptLord: {} };
const service = modules['cryptLord.mysteryAnalysisState'], legacy = modules['cryptLord.mysteryAnalysis'];
const fields = { querySelectorAll: () => [{ dataset: { maItem: '0' }, querySelector: () => ({ checked: true }) }] };
let evidence = [{ 序号: 0, 正文: '玩家在序列5时已完成对序列4血液的解析。' }];
const options = { scope: () => fields, evidenceList: async () => evidence,
  freshEvidenceList: async () => evidence, evidence: { history: '历史', recent: '近期', latest: '最新' } };
const plain = value => JSON.parse(JSON.stringify(value));
// 1. Whole original rule set: real rank, exact identity/profile and 30-70 allocation.
for (const [sequence, unlocked, active] of [
  ['序列5-星象师', true, false], ['序列4-神秘学家', true, true],
  ['序列6-卷轴教授', false, false], ['序列4-预言家', false, false], ['知识之妖', true, true],
]) {
  const data = structuredClone(initial); data.stat_data.当前序列 = sequence;
  const access = service.gate(data, pool);
  assert.equal(access.unlocked, unlocked); assert.equal(access.active, active);
}
const session = service.create(initial, pool, options), { mode, core, win } = session;
assert.equal(mode.itemRows(win).length, 2);
assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
session.render();
assert.equal(JSON.stringify(session.data), JSON.stringify(initial));
for (const [rank, total] of [['序列4', 30], ['序列3', 30], ['序列2', 40],
  ['序列1', 40], ['序列0', 50], ['旧日', 60], ['支柱', 70]]) {
  const result = mode.outcomeOf(mode.parseVerdict(`<裁定>\n通过|${rank}|无|无|完成\n</裁定>`));
  assert.equal(Math.round(Object.values(result.finalBonus).reduce((sum, value) => sum + parseFloat(value), 0) * 100), total * 100);
  assert.equal(result.usedEqualSplit, true);
}
const weighted = mode.outcomeOf({ ok: true, rankText: '序列4', pathway: '阅读者途径', sequence: '序列4-预言家' });
assert.equal(weighted.usedEqualSplit, false);
assert.deepEqual(plain(weighted.finalBonus),
  { 活力: '1.43%', 灵性: '2.86%', 理智: '4.29%', 人性: '5.71%', 敏捷: '7.14%', 运气: '8.57%' });
assert.match(mode.itemPrompt(win, mode.itemRows(win)[0]), /阅读者途径\|序列4-预言家/);
// 2. Certification is one-use, no consumption, hidden at 5 and idempotent after promotion/reversion.
await session.action('mystery-item-certify');
assert.equal(core.completed(session.data.stat_data), true);
assert.equal(session.data.stat_data.辅助能力列表, undefined);
assert.equal(session.data.stat_data.活力, 100);
assert.deepEqual(session.data.stat_data.其他列表, initial.stat_data.其他列表);
assert.deepEqual(session.data.npc_data, initial.npc_data);
await assert.rejects(() => session.action('mystery-item-certify'), /重复/);
latest = session.data;
const store = modules['cryptLord.stateStore'];
latest.stat_data.当前序列 = '序列4-神秘学家';
await store.writeAssistantData(2, latest);
assert.equal(latest.stat_data.活力, 105);
assert.ok(latest.stat_data.辅助能力列表['#神秘解析']);
assert.equal(latest.stat_data.当前活力, 30);
const once = JSON.stringify(latest);
await store.writeAssistantData(2, latest);
assert.equal(JSON.stringify(latest), once);
const beforePromotion = structuredClone(session.data);
beforePromotion.stat_data.当前序列 = '序列5-星象师';
modules['cryptLord.hostApi'].getChatMessages = async range => range === '2'
  ? [{ message_id: 2, role: 'assistant', message: '晋升正文', data: latest }]
  : [{ message_id: 0, role: 'assistant', message: '开场正文', data: beforePromotion },
    { message_id: 2, role: 'assistant', message: '晋升正文', data: latest }];
modules['cryptLord.abilityState'].synchronize = data => ({ data, added: 0, patched: 0 });
modules['cryptLord.contextBuilder'] = {};
modules['cryptLord.responseNormalizer'] = { extractActions: () => [] };
modules['cryptLord.variableSettlementApi'].settle = async () => ({ skipped: true });
modules['cryptLord.variablePatch'] = {
  apply: () => ({ applied: true, data: structuredClone(latest) }),
  updateTag: () => '', embedUpdate: message => message,
};
let notified;
modules['cryptLord.variableWorkbench'] = { notifyUpdate: detail => { notified = detail; } };
for (const name of ['native-settlement', 'generation-bridge'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const settlement = modules['cryptLord.nativeSettlement'];
const staged = structuredClone(latest);
assert.equal(settlement.apply(staged, beforePromotion).applied.includes('mystery-analysis-bonus'), false);
assert.equal(staged.stat_data.活力, 105);
await modules['cryptLord.nativeFloorBridge'].completeNarrative('晋升正文',
  { userMessageId: 1, assistantMessageId: 2, userText: '晋升', narrativeText: '晋升正文' });
assert.equal(latest.stat_data.活力, 105);
assert.equal(notified.afterData.stat_data.活力, latest.stat_data.活力);
assert.equal(notified.afterData.stat_data.当前活力, 30);
latest.stat_data.当前序列 = '序列6-卷轴教授';
await store.writeAssistantData(2, latest);
assert.equal(latest.stat_data.活力, 100);
assert.equal(latest.stat_data.辅助能力列表['#神秘解析'], undefined);
assert.ok(latest.stat_data.$专属玩法.窥秘人途径.神秘解析玩法);
latest.stat_data.当前序列 = '序列4-神秘学家';
await store.writeAssistantData(2, latest);
assert.equal(latest.stat_data.活力, 105);
let blocked = false;
await assert.rejects(() => store.writeAssistantData(2, latest, 'affected', () => {
  blocked = true; throw Error('楼层已变化');
}), /楼层已变化/);
assert.equal(blocked, true);
// 3. Supplementary certification uses an explicitly selected native floor and system API.
const promoted = structuredClone(initial); promoted.stat_data.当前序列 = '序列4-神秘学家';
const supplementary = service.create(promoted, pool, options);
await supplementary.action('mystery-open-summary');
assert.equal(supplementary.mode.selectedSummary(supplementary.win), null);
supplementary.state.source = '0';
settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', model: 'test', apiKey: '' };
await supplementary.action('mystery-summary-certify');
assert.ok(supplementary.data.stat_data.辅助能力列表['#神秘解析']);
assert.equal(requests.at(-1).custom_api.model, 'test');
assert.match(requests.at(-1).ordered_prompts.at(-1).content, /<指定剧情>[\s\S]*#0/);
assert.match(requests.at(-1).ordered_prompts.at(-2).content, /第一关的核心证据只能来自/);
const certified = structuredClone(evidence);
evidence = [{ 序号: 0, 正文: '请求之后再次变更。' }];
await assert.rejects(() => supplementary.verifyEvidence(), /已变化/);
evidence = certified;
// 4. Failed responses, changed evidence, malformed stores, battle locks and partial commit roll back.
for (const raw of ['invalid', '<裁定>不通过||||未完成</裁定>', '<裁定>通过|序列5|无|无|完成</裁定>']) {
  response = raw;
  const failed = service.create(initial, pool, options);
  await failed.action('mystery-item-certify');
  assert.equal(JSON.stringify(failed.data), JSON.stringify(initial));
}
response = '<裁定>通过|序列4|无|无|完成</裁定>';
const stale = service.create(promoted, pool, options);
await stale.action('mystery-open-summary'); stale.state.source = '0';
evidence = [{ 序号: 0, 正文: '仍在准备，未完成解析。' }];
await stale.action('mystery-summary-certify');
assert.equal(JSON.stringify(stale.data), JSON.stringify(promoted));
assert.match(stale.state.result.reason, /已变化/);
const partial = service.create(promoted, pool, options);
await partial.action('mystery-open-summary'); partial.state.source = '0';
partial.win.game.updateDisplayedAttributes = () => { throw Error('模拟属性失败'); };
await assert.rejects(() => partial.action('mystery-summary-certify'), /模拟属性失败/);
assert.equal(JSON.stringify(partial.data), JSON.stringify(promoted));
const battle = structuredClone(initial); battle.cryptLord.teamBattle = { status: 'active' };
await assert.rejects(() => service.create(battle, pool, options).action('mystery-item-certify'), /战斗/);
const invalid = structuredClone(initial);
invalid.stat_data.$专属玩法.窥秘人途径.神秘解析玩法 = { 版本: 2 };
await assert.rejects(() => service.create(invalid, pool, options).action('mystery-item-certify'), /版本/);
assert.equal(legacy.gate(promoted.stat_data, pool).active, true);
assert.equal(writes.every(row => row.message_id === 2), true);
console.log('PASS: original rules, complete lifecycle, native supplementary/API and failure safeguards (4 focused groups).');
