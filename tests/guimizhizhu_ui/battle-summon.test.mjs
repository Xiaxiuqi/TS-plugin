import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'battlefield-painter',
  'audience-imagination', 'grazing-state', 'shaman-picture',
  'personal-battle-state', 'battle-formulas', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-hard-control', 'battle-temp-control',
  'battle-permanent-control', 'battle-possession', 'battle-summon', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], manager = modules['cryptLord.battleSummon'];
const fields = modules['cryptLord.battleFieldEffects'];
const bOf = data => data.cryptLord.teamBattle;
const pool = { pathways: Object.fromEntries(['占卜家', '通识者', '萨满', '观众', '秘祈人', '猎人']
  .map(path => [`${path}途径`, Array.from({ length: 10 }, (_, i) => {
    const rank = 9 - i, direct = { 占卜家: 3, 通识者: 4, 萨满: 1, 观众: 1, 秘祈人: 4, 猎人: 4 }[path];
    return `序列${rank}-${path}${rank === direct ? '' : rank}`;
  })])),
  abilities: { '猎人途径-序列4': [{ name: '射击', power: 10, range: 'global' }] } };
const card = seq => ({ 当前序列: seq, 活力: 10000, 当前活力: 10000,
  敏捷: 200, 当前敏捷: 200, 灵性: 1000000, 当前灵性: 1000000,
  人性: 1000000, 当前人性: 1000000, 理智: 1000000, 当前理智: 1000000,
  运气: 40, 神性: 1, 序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' }] } });
const fullSequence = '序列3-占卜家/序列4-通识者/序列1-萨满/序列1-观众/序列4-秘祈人';
function start(seq = fullSequence, extra = {}) {
  const result = engine.start({ stat_data: { ...card(seq), 人物关系列表: { 旧友: { 好感度: 200 } },
    $专属玩法: { 萨满途径: { 制造画中人玩法: { 画中人列表: {
      picture: { 名称: '画中猎人', 途径: '猎人途径', 角色卡: card('序列4-猎人') },
    } } }, 秘祈人途径: { 放牧玩法: { 灵魂列表: { 猎魂: card('序列4-猎人') },
      激活灵魂: ['猎魂'], 休眠灵魂: [] } } }, ...extra },
    npc_data: { 敌甲: { ...card('序列9-猎人'), 灵性: 1000, 当前灵性: 1000,
      人性: 1000, 当前人性: 1000 }, 旧友: { ...card('序列4-猎人'), 灵性: 1000,
      当前灵性: 1000, 人性: 1000, 当前人性: 1000, 理智: 1000, 当前理智: 1000 } } },
  { enemies: ['敌甲'], seed: 911, pathways: pool.pathways, summonPool: pool });
  assert.equal(result.ok, true, result.error);
  bOf(result.data).phase = 'tactic'; return result.data;
}
const request = (data, subtype) => ({ subtype,
  target: engine.summonOptions(data).find(row => row.subtype === subtype)?.rows[0]?.name });
const cast = (data, subtype) => {
  const result = engine.summon(data, request(data, subtype), () => .99);
  assert.equal(result.ok, true, result.error); return result.data;
};
const extracted = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/31b2-js-aura-and-grazing-projection.txt', import.meta.url), 'utf8');
assert.ok(extracted.includes(source.slice(source.indexOf('const SummonManager ='),
  source.indexOf("console.log('[战斗系统] SummonManager")).trim()));
let data = start(), before = JSON.stringify(data);
assert.equal(engine.summonOptions(data).length, 6);
for (const subtype of ['历史投影', '快速炼成', '幻想之身', '召唤画中人', '真实幻象', '外放灵魂'])
  assert.equal(engine.summonPreview(data, request(data, subtype)).ok, true, subtype);
assert.equal(JSON.stringify(data), before);
assert.ok(engine.summonOptions(start('高维俯视者')).some(row => row.subtype === '幻想之身'));
assert.ok(engine.summonOptions(start('知识之妖')).some(row => row.subtype === '快速炼成'));
assert.ok(engine.summonOptions(start('上帝')).some(row => row.subtype === '真实幻象'));
assert.ok(engine.summonOptions(start('诡秘之主')).some(row => row.subtype === '历史投影'));

// Each route creates a real board actor, preserves quota/resource semantics and stays out of npc_data.
for (const subtype of ['历史投影', '快速炼成', '幻想之身', '召唤画中人', '真实幻象', '外放灵魂']) {
  data = start(); const check = engine.summonPreview(data, request(data, subtype));
  data = cast(data, subtype);
  const b = bOf(data), summoned = b.units.find(row => row.isSummon);
  assert.ok(summoned && summoned.hp > 0, subtype);
  assert.equal(summoned.controller, 'player'); assert.equal(b.round, 2);
  assert.ok(b.queue.includes(summoned.id)); assert.ok(summoned.x >= 0 && summoned.y >= 0);
  assert.equal(Object.keys(data.npc_data).length, 2);
  assert.equal(b.summon.projections.length, 1);
  assert.equal(summoned.summonSubtype, subtype);
  assert.equal(b.units[0][subtype === '真实幻象' ? 'humanity' : 'spirit'],
    1000000 - check.cost);
  if (subtype === '幻想之身') assert.equal(summoned.maxHp, 10000);
  if (subtype === '历史投影') {
    assert.equal(summoned.maxHp, 9500);
    assert.equal(b.summon.projections[0].until, 5);
  }
  if (subtype === '真实幻象') assert.match(summoned.name, /真实幻象1$/u);
  // JSON native-floor restoration must not expire no-expiry units.
  const json = JSON.parse(JSON.stringify(data));
  manager.sweep(bOf(json));
  assert.equal(bOf(json).summon.projections.length, 1);
  b.phase = 'action'; b.queue = [summoned.id]; b.index = 0;
  const options = engine.options(data);
  assert.ok(options.some(row => row.power > 0 || row.name === '普通攻击'), subtype);
  if (subtype === '召唤画中人') {
    assert.equal(modules['cryptLord.battleFormulas'].movement(b, summoned), 0);
    assert.equal(engine.reachable(data).length, 0);
  } else assert.ok(engine.reachable(data).length);
  assert.equal(manager.options(b, summoned, data).length, 0);
}
// Quotas, invalid requests and failure fees; reads must neither spend nor draw.
data = start(); bOf(data).units[0].isSummon = true;
assert.equal(engine.summonOptions(data).length, 0);
data = start(); data.stat_data.人物关系列表.旧友.好感度 = 120;
assert.equal(engine.summonPreview(data, { subtype: '历史投影', target: '旧友' }).ok, false);
before = JSON.stringify(data);
assert.equal(engine.summon(data, { subtype: '历史投影', target: '不存在' }).ok, false);
assert.equal(JSON.stringify(data), before);
data = cast(start(), '幻想之身');
bOf(data).phase = 'tactic';
assert.equal(engine.summonPreview(data, request(data, '幻想之身')).ok, false);
data = start('序列3-占卜家');
bOf(data).units[0].spirit = 10000;
data.stat_data.人物关系列表.旧友.好感度 = 121;
data.npc_data.旧友.活力 = 6500;
const failed = manager.apply(bOf(data), bOf(data).units[0],
  { subtype: '历史投影', target: '旧友' }, data,
  (() => { let n = 0; return () => ++n % 2 ? 0 : .99; })());
assert.equal(failed.ok, true); assert.equal(failed.outcome, 'failed');
assert.equal(bOf(data).summon.projections.length, 0);
assert.equal(bOf(data).units[0].spirit, 9570);

// Expiry and owner death cannot refund cumulative quotas or destroy living persistent inventory.
data = cast(start(), '历史投影');
let b = bOf(data); b.round = 5; manager.sweep(b);
assert.equal(b.summon.projections.length, 0); assert.equal(b.summon.counts.player.历史投影, 1);
for (const subtype of ['召唤画中人', '外放灵魂']) {
  data = cast(start(), subtype); b = bOf(data); b.units[0].hp = 0; manager.sweep(b); manager.flush(data);
  assert.equal(b.summon.projections.length, 0);
  assert.equal(modules['cryptLord.shamanPicture'].records(data).length, 1);
  assert.equal(grazingSoulCount(data), 1);
}
function grazingSoulCount(data) {
  return Object.keys(modules['cryptLord.grazingState'].soulsOf(data)).length;
}
data = cast(start(), '召唤画中人'); b = bOf(data);
b.units.find(row => row.isSummon).hp = 0; manager.sweep(b);
assert.equal(b.picturePersonLosses.length, 1); assert.equal(modules['cryptLord.shamanPicture'].records(data).length, 1);
b.phase = 'tactic'; assert.equal(engine.summonOptions(data).find(row => row.subtype === '召唤画中人').rows.length, 0);
b.status = 'finished'; b.result = 'victory'; manager.finish(b);
const accepted = engine.settle(data, b.id, true);
assert.equal(accepted.ok, true, accepted.error); assert.equal(modules['cryptLord.shamanPicture'].records(accepted.data).length, 0);
const declined = engine.settle(data, b.id, false);
assert.equal(declined.ok, true); assert.equal(modules['cryptLord.shamanPicture'].records(declined.data).length, 1);
assert.equal(engine.report(data).experience.recipients.length, 1);
data = cast(start(), '外放灵魂'); b = bOf(data);
b.units.find(row => row.isSummon).hp = 0; manager.sweep(b); manager.flush(data);
assert.equal(grazingSoulCount(data), 0);
assert.equal(modules['cryptLord.grazingState'].namesOf(data, '激活灵魂').length, 0);
assert.ok(!b.units[0].sequence.includes('猎人'));
data = cast(start(), '外放灵魂'); b = bOf(data); b.units[0].spirit = 1;
manager.sweep(b, true); manager.flush(data);
assert.equal(b.summon.projections.length, 0); assert.equal(grazingSoulCount(data), 1);
assert.equal(b.units[0].spirit, 0);
assert.equal(modules['cryptLord.grazingState'].namesOf(data, '激活灵魂').length, 0);

// NPC automatic priority, independent ordinary summons and control cleanup on dismissal.
data = start(); b = bOf(data); b.units[1].sequence = '序列1-萨满/序列4-通识者';
data.npc_data.敌甲.当前序列 = b.units[1].sequence;
b.units[1].spirit = 100000; b.units[1].maxSpirit = 100000;
assert.equal(manager.npc(b, data, [], () => .99, true)[0].subtype, '幻想之身');
assert.equal(manager.npc(b, data, [], () => .99, true)[0].subtype, '快速炼成');
assert.equal(b.units.filter(row => row.isSummon).length, 2);
assert.equal(manager.npc(b, data, ['敌甲'], () => 0, true).length, 0);
data = start(); b = bOf(data); b.units[1].sequence = '序列3-观众';
data.npc_data.敌甲.当前序列 = b.units[1].sequence;
assert.equal(manager.npc(b, data, [], () => 0, false)[0].subtype, '真实幻象');
data = cast(start(), '幻想之身'); b = bOf(data);
const summoned = b.units.find(row => row.isSummon);
fields.withRuntime(b, data, undefined, rt => {
  const soul = rt.heroes.find(row => row.heroId === summoned.id), foe = rt.heroes.find(row => row.heroId === '敌甲');
  rt.possession.begin(rt.bm, foe, soul, '怨魂附身',
    { win: true, casterScore: 100, targetScore: 1 }, [], []);
  assert.equal(foe.possessedHidden, true);
  rt.summon.dismiss(rt.bm, soul);
  assert.equal(soul.dismissed, true); assert.ok(foe.unit.hp > 0);
  assert.equal(foe.possessedHidden, false);
  assert.ok(Number.isFinite(foe.x)); assert.equal(b.possession.processes.length, 0);
});
assert.equal(b.summon.projections.length, 0);
// Remove the borrowed passive immediately when its soul dies; keep unrelated player passives.
pool.abilities['猎人途径-序列4'].push({ name: '灵魂护甲', isPassive: true,
  effects: [{ name: '猎魂被动', stat: 'defense', type: 'buff', power: 10,
    valueType: 'percentage', battlePersistent: true }] });
data = cast(start(), '外放灵魂'); b = bOf(data);
assert.ok(b.units[0].effects.some(row => row.name === '猎魂被动'));
b.units.find(row => row.isSummon).hp = 0; manager.sweep(b); manager.flush(data);
assert.ok(b.units[0].effects.every(row => row.name !== '猎魂被动'));
console.log('Summon module verified: six routes, native actions, quotas/fees, expiry, persistent deaths, upkeep, NPC priority and settlement.');
