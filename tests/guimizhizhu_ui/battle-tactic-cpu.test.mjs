import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
const names = ['battle-experience', 'battle-life-save', 'battle-tags',
  'audience-imagination', 'grazing-state', 'battle-formulas', 'battle-auras',
  'battle-field-effect-reference', 'battle-field-effects', 'battle-effect-transfer',
  'battle-bribery', 'battle-balance', 'battle-punishment', 'battle-mythic-form',
  'battle-exile', 'battle-active-leave', 'battle-events', 'battle-rewind',
  'battle-extra-action', 'battle-hard-control', 'battle-mind-deprive',
  'battle-temp-control', 'battle-permanent-control', 'battle-possession',
  'battle-rule-change', 'battle-environment', 'battle-fundamental', 'battle-summon',
  'battle-ability-borrow', 'battle-tactic-cpu', 'team-battle-state'];
for (const name of names)
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], cpu = modules['cryptLord.battleTacticCpu'];
const paths = ['猎人', '秘祈人', '占卜家', '偷盗者', '律师', '水手', '仲裁人',
  '观众', '通识者', '囚犯', '学徒', '入门者', '歌颂者', '刺客', '萨满'];
const pool = { pathways: Object.fromEntries(paths.map(path => [`${path}途径`,
  Array.from({ length: 10 }, (_, i) => `序列${9 - i}-${path}${9 - i}`)])), abilities: {} };
const card = (sequence, resource = 100000) => ({ 当前序列: sequence,
  活力: 100000, 当前活力: 100000, 灵性: resource, 当前灵性: resource,
  敏捷: 200, 当前敏捷: 200, 理智: resource, 当前理智: resource,
  人性: resource, 当前人性: resource, 运气: 40,
  序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] } });
function start(sequence = '序列9-猎人9', extra = {}) {
  const result = engine.start({ stat_data: { ...card('序列9-猎人9', 10000), ...extra },
    npc_data: { 敌甲: card(sequence), 敌乙: card('序列9-猎人9') } },
  { enemies: ['敌甲', '敌乙'], seed: 941, pathways: pool.pathways, summonPool: pool });
  assert.equal(result.ok, true, result.error);
  result.data.cryptLord.teamBattle.phase = 'tactic';
  return result.data;
}
const bOf = data => data.cryptLord.teamBattle;
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31a-js-pathway-contest-advantages.txt',
  import.meta.url), 'utf8');
const original = source.slice(source.indexOf('runFrontendNpcTactics(bm, opts = {}) {'),
  source.indexOf("console.log('[战斗系统] EnemyControlManager"))
  .trim().replace(/\r?\n};\s*$/, '');
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), 'utf8');
assert.ok(generated.includes(original), 'Entire original cross-ability pipeline must be extracted.');
let data = start();
let result = engine.tactic(data, 'skip', () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).round, 2);
assert.deepEqual(Array.from(bOf(result.data).tacticCpuMeta.last.actors), []);
// Exercise all eligible pools in one runtime rather than ordering independently executed modules.
for (const sequence of [
  '序列5-偷盗者5/序列5-歌颂者5',
  '序列4-秘祈人4/序列5-律师5',
  '序列3-观众3/序列5-囚犯5',
  '序列0-偷盗者0/序列0-律师0/序列0-水手0',
  '序列4-通识者4/序列1-观众1',
]) {
  data = start(sequence);
  result = engine.tactic(data, 'skip', () => .01);
  assert.equal(result.ok, true, result.error);
  const last = bOf(result.data).tacticCpuMeta.last;
  assert.equal(last.actors.filter(id => id === '敌甲').length, 1, sequence);
  assert.ok(bOf(result.data).log.length > bOf(data).log.length);
}
// Candidate hits compete for one slot, rather than the first loaded module always winning.
const picked = new Set();
for (const pick of [.01, .95]) {
  data = start('序列5-偷盗者5/序列5-水手5');
  let draw = 0;
  const outcomes = cpu.run(bOf(data), data, {}, () => ++draw === 6 ? pick : .01);
  assert.equal(outcomes.filter(row => row.actor === '敌甲').length, 1);
  picked.add(outcomes.find(row => row.actor === '敌甲').results[0]?.kind);
}
assert.equal(picked.size, 2, 'Changing the shared-pool draw must change the selected tactic.');
// Guaranteed summon outranks extra action; rewind outranks both and releases maintenance.
data = start('序列1-萨满1/序列4-通识者4/序列1-学徒1');
let rows = cpu.run(bOf(data), data, {}, () => .99);
assert.equal(rows.find(row => row.actor === '敌甲').results[0].subtype, '幻想之身');
assert.equal(bOf(data).extraAction.used.敌甲, undefined);
data = start('序列3-占卜家3/序列1-萨满1/序列1-学徒1');
bOf(data).units.find(row => row.id === '敌甲').hp = 1;
rows = cpu.run(bOf(data), data, {}, () => .99);
assert.equal(rows.find(row => row.actor === '敌甲').results[0].kind, 'rewind');
assert.equal(bOf(data).summon.projections.length, 0);
assert.equal(bOf(data).extraAction.used.敌甲, undefined);
data = start('序列0-仲裁人0');
Object.assign(bOf(data).units[0], { x: 1, y: 0 });
rows = cpu.run(bOf(data), data, {}, () => .99);
assert.equal(rows.find(row => row.actor === '敌甲').results[0].kind, 'balance');
assert.equal(bOf(data).units.find(row => row.id === '敌甲').punishment?.targetId, undefined);
// Dead, off-field and occupied NPCs cannot consume a tactical action or resources.
for (const mutate of [
  actor => { actor.hp = 0; },
  actor => { actor.offField = true; },
  actor => { actor.turnSkip = { skipRound: 1, reason: '呆滞' }; },
]) {
  data = start('序列5-偷盗者5/序列5-歌颂者5');
  const actor = bOf(data).units.find(row => row.id === '敌甲');
  mutate(actor); const spirit = actor.spirit;
  rows = cpu.run(bOf(data), data, {}, () => .01);
  assert.ok(rows.every(row => row.actor !== actor.id));
  assert.equal(actor.spirit, spirit);
}
// Native player command is validated atomically, settled once, and advances only one round.
data = start('序列9-猎人9', { 当前序列: '序列4-水手4' });
let snapshot = JSON.stringify(data), draws = 0;
result = engine.battleEvent(data, '不存在', () => { draws++; return .01; });
assert.equal(result.ok, false);
assert.equal(JSON.stringify(data), snapshot);
assert.equal(draws, 0);
result = engine.battleEvent(data, '制造雷暴', () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).round, 2);
assert.equal(bOf(result.data).lastTactic.outcomes.filter(row => row.actor === 'player').length, 1);
assert.ok(bOf(result.data).tacticCpuMeta.last.results.some(row => row.kind === 'battle-event'));
// Borrowing uses the source quota but the real caster's resources and leaves no temporary context.
data = start('序列1-学徒1', { 当前序列: '序列0-律师0', 灵性: 1000000, 当前灵性: 1000000 });
for (const unit of bOf(data).units) if (unit.source !== 'player') unit.controller = 'player';
const authority = engine.abilityBorrowOptions(data)[0];
const sourceRow = authority.sources.find(row => row.id === '敌甲');
const descriptor = sourceRow.abilities.find(row => row.id === 'extra:闪现（虚影分身）');
assert.ok(descriptor);
const borrowRequest = { authority: authority.authority, source: sourceRow.id,
  ability: descriptor.id, method: descriptor.method, request: descriptor.subtype };
result = engine.abilityBorrow(data, borrowRequest, () => .99);
assert.equal(result.ok, true, result.error);
assert.ok(bOf(result.data).extraAction.used.敌甲);
assert.equal(bOf(result.data).extraAction.used.player, undefined);
assert.equal(bOf(result.data).units.find(row => row.id === '敌甲').spirit, 100000);
assert.equal(JSON.stringify(result.data).includes('borrowScope'), false);
const messages = bOf(result.data).log.map(row => row.message);
assert.equal(messages.filter(row => /权柄费用/u.test(row)).length, 1);
result = engine.abilityBorrow(data, { authority: authority.authority, source: sourceRow.id,
  ability: 'skill-control:复制', method: 'skillControl',
  request: { mode: '复制', target: '敌甲', skill: '试探' } }, () => .99);
assert.equal(result.ok, true, result.error);
assert.ok(bOf(result.data).units[0].skillControl.granted.some(row => row.name === '试探'));
assert.equal(JSON.stringify(result.data).includes('borrowScope'), false);
const fee = authority.cost;
bOf(data).units[0].spirit = fee + 1000;
Object.assign(bOf(data).units.find(row => row.id === '敌甲'),
  { spirit: 1000, hp: 1000, sanity: 1000, humanity: 1000, agility: 100 });
let borrowDraw = 0;
result = engine.abilityBorrow(data, borrowRequest, () => ++borrowDraw % 2 ? 0 : .99);
assert.equal(result.ok, true, result.error);
assert.equal(result.battle.lastTactic.outcomes.find(row => row.actor === 'player').outcome, 'resisted');
assert.equal(bOf(result.data).units[0].spirit, 1000);
assert.equal(bOf(result.data).extraAction.used.敌甲, undefined);
const borrowingReference = modules['cryptLord.battleFieldEffectReference'];
const originalBorrowConfig = borrowingReference.borrowConfig;
borrowingReference.borrowConfig = () => ({ ...originalBorrowConfig(), BORROW_NPC_CHANCE: 100 });
try {
  data = start('序列0-偷盗者0', { 当前序列: '序列0-律师0' });
  Object.assign(bOf(data).units.find(row => row.id === '敌甲'),
    { spirit: 1000000, maxSpirit: 1000000 });
  rows = cpu.run(bOf(data), data, {}, () => .99);
  const npcBorrow = rows.find(row => row.actor === '敌甲');
  assert.equal(rows.filter(row => row.actor === '敌甲').length, 1);
  assert.ok(npcBorrow.results.some(row => row.kind === 'borrowed-tactic'));
  assert.equal(JSON.stringify(data).includes('borrowScope'), false);
} finally { borrowingReference.borrowConfig = originalBorrowConfig; }
// Permanent conversion wins before temporary allegiance, with both attempts in one phase.
data = start('序列9-猎人9', { 当前序列: '序列1-猎人1', 灵性: 1000000, 当前灵性: 1000000 });
const contender = bOf(data).units.find(row => row.id === '敌乙');
Object.assign(contender, { side: 'ally', sequence: '序列3-律师3', rank: 3 });
data.npc_data.敌乙.当前序列 = contender.sequence;
Object.assign(bOf(data).units.find(row => row.id === '敌甲'), { spirit: 1, sanity: 1, humanity: 1, hp: 1 });
bOf(data).tempControlMeta.config.TEMP_NPC_CHANCE = 100;
result = engine.permanentControl(data, { subtype: '征服', target: '敌甲' }, () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).units.find(row => row.id === '敌甲').controller, 'player');
assert.ok(!bOf(result.data).tempAllegiance.processes.length);
assert.ok(bOf(result.data).log.some(row => /抢先转化/u.test(row.message)));
assert.equal(bOf(result.data).tacticCpuMeta.last.actors.filter(id => id === '敌乙').length, 1);
// Upkeep uses the body's rank, occurs once per settlement and handles zero spirit without soul loss.
data = start('序列9-猎人9', { 当前序列: '序列4-秘祈人4',
  $专属玩法: { 秘祈人途径: { 放牧玩法: {
    灵魂列表: { 借魂: card('序列1-学徒1') }, 激活灵魂: ['借魂'], 休眠灵魂: [],
  } } } });
const initialSpirit = bOf(data).units[0].spirit;
const reference = modules['cryptLord.battleFieldEffectReference'];
const rate = reference.summonConfig().GRAZING_UPKEEP_RATE;
const upkeep = Math.max(1, Math.round(reference.averages()['4'].灵性 * rate));
result = engine.tactic(data, 'skip', () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).units[0].spirit, initialSpirit - upkeep);
assert.equal(bOf(result.data).tacticCpuMeta.last.results.filter(row => row.stage === 'upkeep').length, 1);
bOf(data).units[0].spirit = 0;
result = engine.tactic(data, 'skip', () => .99);
assert.equal(result.ok, true, result.error);
assert.deepEqual(Array.from(result.data.stat_data.$专属玩法.秘祈人途径.放牧玩法.激活灵魂), []);
assert.ok(result.data.stat_data.$专属玩法.秘祈人途径.放牧玩法.灵魂列表.借魂);
data = start('序列9-猎人9', { 当前序列: '序列4-秘祈人4',
  $专属玩法: { 秘祈人途径: { 放牧玩法: {
    灵魂列表: { 借魂: card('序列1-学徒1') }, 激活灵魂: [], 休眠灵魂: ['借魂'],
  } } } });
result = engine.switchGrazing(data, ['借魂']);
assert.equal(result.ok, true, result.error);
result = engine.tactic(result.data, 'skip', () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(result.battle.lastTactic.outcomes.filter(row => row.stage === 'switch-final').length, 1);
assert.ok(!result.battle.tacticCpuMeta.last.actors.includes('player'));
data = result.data; bOf(data).phase = 'tactic';
result = engine.tactic(data, 'skip', () => .99);
assert.ok(result.battle.lastTactic.outcomes.every(row => row.stage !== 'switch-final'));
// JSON restore preserves seeded settlement and consumed quotas; old schemas upgrade in-place.
data = start('序列5-偷盗者5/序列5-歌颂者5');
const comparable = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'at' ? 0 : item));
assert.deepEqual(comparable(engine.tactic(data, 'skip').data),
  comparable(engine.tactic(JSON.parse(JSON.stringify(data)), 'skip').data));
delete bOf(data).tacticCpuMeta;
delete bOf(data).extraActionMeta;
delete bOf(data).extraAction;
cpu.run(bOf(data), data, {}, () => .99);
assert.equal(bOf(data).extraActionMeta.version, 1);
const savedModule = modules['cryptLord.battleExile'];
delete modules['cryptLord.battleExile'];
snapshot = JSON.stringify(data);
assert.throws(() => cpu.run(bOf(data), data), /缺少 battleExile/u);
assert.equal(JSON.stringify(data), snapshot);
modules['cryptLord.battleExile'] = savedModule;
const savedCpu = modules['cryptLord.battleTacticCpu'];
delete modules['cryptLord.battleTacticCpu'];
result = engine.tactic(data, 'skip', () => .99);
assert.equal(result.ok, false);
assert.match(result.error, /统一战术/u);
assert.equal(JSON.stringify(data), snapshot);
modules['cryptLord.battleTacticCpu'] = savedCpu;
console.log('Unified tactic CPU: shared pool, priority, locks, native commands, borrowing and restore passed.');
