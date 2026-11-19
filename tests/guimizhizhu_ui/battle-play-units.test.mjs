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
  'personal-battle-state', 'audience-imagination', 'grazing-state',
  'battle-terrain-presets', 'battle-formulas', 'battle-conditional-params',
  'battle-team-conditions', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-balance',
  'battle-punishment', 'battle-mythic-form', 'battle-exile', 'battle-active-leave',
  'battle-events', 'battle-rewind', 'battle-extra-action', 'battle-hard-control',
  'battle-mind-deprive', 'battle-temp-control', 'battle-permanent-control',
  'battle-possession', 'battle-rule-change', 'battle-environment', 'battle-fundamental',
  'battle-summon', 'battle-ability-borrow', 'battle-tactic-cpu', 'battle-action-cpu',
  'battle-terrain-effects', 'battle-resource-status', 'battle-auto-pilot',
  'battle-skill-control', 'battle-play-reference', 'battle-play-units', 'battle-report',
  'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const bridge = modules['cryptLord.battlePlayUnits'], engine = modules['cryptLord.teamBattleState'];
const paths = { 偷盗者途径: ['序列4-寄生者', '序列1-时之虫'], 占卜家途径: ['序列5-秘偶大师'],
  通识者途径: ['序列6-机械专家'], 观众途径: ['序列1-作家'], 猎人途径: ['序列9-猎人'] };
const card = { 当前序列: '序列9-猎人', 活力: 1000, 当前活力: 1000,
  灵性: 1000, 当前灵性: 1000, 敏捷: 100, 当前敏捷: 100,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100,
  能力清单: [{ 名称: '远击', power: 10000, range: 'global' }] };
const fixture = () => ({
  stat_data: { ...structuredClone(card), 名称: '玩家',
    当前序列: '序列4-寄生者/序列5-秘偶大师/序列6-机械专家',
    $专属玩法: {
      偷盗者途径: { 分身玩法: { 分身列表: { 同名: structuredClone(card), $meta: { extensible: true } } } },
      占卜家途径: { 秘偶玩法: { 秘偶列表: { 同名: structuredClone(card) } } },
      通识者途径: { 制造玩法: { 造物列表: { 机巧: {
        ...structuredClone(card), $造物类型: '魔偶', $成品位阶: 6 } } } },
    } },
  npc_data: { 同名: { ...structuredClone(card), 当前活力: 100, 活力: 100 },
    已入册: { ...structuredClone(card), $秘偶: true } },
});
const bOf = data => data.cryptLord.teamBattle;
const bag = (data, source) => data.stat_data.$专属玩法[
  source === 'clone' ? '偷盗者途径' : source === 'puppet' ? '占卜家途径' : '通识者途径'][
  source === 'clone' ? '分身玩法' : source === 'puppet' ? '秘偶玩法' : '制造玩法'][
  source === 'clone' ? '分身列表' : source === 'puppet' ? '秘偶列表' : '造物列表'];
let data = fixture();
const pristine = JSON.stringify(data);
const rows = bridge.roster(data, paths);
assert.equal(rows.length, 3);
assert.equal(new Set(rows.map(row => row.key)).size, 3);
assert.equal(JSON.stringify(data), pristine);
assert.equal(bridge.roster({ stat_data: { 当前序列: '序列1-观众' } }, paths).length, 0);
data.stat_data.当前序列 = '序列5-寄生者/序列5-秘偶大师/序列7-机械专家';
assert.deepEqual([...bridge.roster(data, paths).map(row => row.source)], ['puppet']);
data.stat_data.当前序列 = '诡秘之主/知识之妖';
assert.equal(bridge.roster(data, paths).length, 3);
data = fixture();
data.stat_data.当前序列 = '序列1-作家';
data.stat_data.$专属玩法.观众途径 = { 空想玩法: { 空想栏位: { 栏位1: { 途径: '偷盗者途径' } } } };
assert.equal(bridge.roster(data, paths).some(row => row.source === 'clone'), true);
data.stat_data.$专属玩法.观众途径.空想玩法.空想栏位.栏位1.途径 = '';
assert.equal(bridge.roster(data, paths).length, 0);
data = fixture();
const choices = bridge.roster(data, paths);
const key = source => choices.find(row => row.source === source).key;
function start(enemy = '同名', allies = choices.map(row => row.key)) {
  const out = engine.start(fixture(), { allies, enemies: [enemy], pathways: paths,
    summonPool: { pathways: paths }, seed: 71 });
  assert.equal(out.ok, true, out.error);
  return out.data;
}
data = start('同名', [...choices.map(row => row.key), '已入册']);
let battle = bOf(data);
assert.equal(battle.units.find(row => row.id === '已入册').controller, 'player');
assert.equal(battle.units.find(row => row.id === key('clone')).name, '同名');
assert.equal(battle.units.find(row => row.id === key('puppet')).playSource, 'diviner-marionette');
for (const unit of battle.units.filter(row => row.playRecord)) assert.equal(unit.controller, 'player');
const saved = JSON.stringify(data);
Object.assign(battle, { phase: 'action', queue: [key('clone'), '同名'], index: 0, turnSlots: [] });
const move = engine.options(data, true).find(row => row.name === '远击');
assert.ok(move, 'Bag records load original NPC ability lists.');
modules['cryptLord.battleFieldEffects'].withRuntime(structuredClone(battle), data, () => .99,
  rt => assert.equal(rt.heroes.find(row => row.heroId === key('clone')).originalData.能力清单[0].名称, '远击'));
const result = engine.action(data, { id: move.id, target: '同名' }, () => .99);
assert.equal(result.ok, true, result.error);
assert.equal(bOf(result.data).status, 'finished');
assert.equal(JSON.stringify(bag(result.data, 'clone')), JSON.stringify(bag(JSON.parse(saved), 'clone')));
data = result.data; battle = bOf(data);
battle.units.find(row => row.id === key('clone')).hp = 0;
battle.units.find(row => row.id === key('puppet')).hp = 0;
const construct = battle.units.find(row => row.id === key('savant-construct'));
construct.hp = 37; construct.spirit = 1; construct.agility = 2; construct.sanity = 3; construct.humanity = 4;
let before = JSON.stringify(data);
const summary = engine.report(data);
assert.equal(summary.experience.recipients.some(row => row.name === '机巧'), false);
assert.equal(summary.experience.recipients.filter(row => row.name === '同名').length, 0);
assert.equal(modules['cryptLord.battleReport'].build(data).text.includes('机巧（'), false);
assert.equal(bridge.preview(battle).find(row => row.source === 'clone').outcome, '阵亡删除');
assert.equal(JSON.stringify(data), before);
let accepted = engine.settle(JSON.parse(before), battle.id, true);
assert.equal(accepted.ok, true, accepted.error);
assert.equal(Object.hasOwn(bag(accepted.data, 'clone'), '同名'), false);
assert.equal(Object.hasOwn(bag(accepted.data, 'puppet'), '同名'), false);
assert.equal(accepted.data.npc_data.同名.当前活力, 0, 'The actual NPC is settled separately.');
assert.equal(accepted.data.npc_data.已入册.$秘偶, true);
assert.equal(bag(accepted.data, 'savant-construct').机巧.当前活力, 37);
for (const stat of ['敏捷', '灵性', '理智', '人性'])
  assert.equal(bag(accepted.data, 'savant-construct').机巧[`当前${stat}`], card[stat]);
assert.equal(accepted.data.stat_data.辅助能力列表['#制作分身'], undefined);
assert.ok(accepted.data.stat_data.辅助能力列表['#秘偶'].描述.includes('1具秘偶'));
assert.equal(engine.settle(accepted.data, battle.id, true).ok, false);
assert.equal(JSON.stringify(data), before);
const abandoned = engine.settle(data, battle.id, false);
assert.equal(abandoned.ok, true, abandoned.error);
assert.equal(JSON.stringify(abandoned.data.stat_data.$专属玩法), JSON.stringify(data.stat_data.$专属玩法));
const conflict = JSON.parse(before);
bag(conflict, 'puppet').同名.描述 = '外部修改不可覆盖';
const conflictSaved = JSON.stringify(conflict);
assert.equal(engine.settle(conflict, battle.id, true).ok, false);
assert.equal(JSON.stringify(conflict), conflictSaved);
const zero = JSON.parse(before);
bOf(zero).units.find(row => row.id === key('savant-construct')).hp = 0;
const repairedLater = engine.settle(zero, battle.id, true);
assert.equal(repairedLater.ok, true, repairedLater.error);
assert.equal(bag(repairedLater.data, 'savant-construct').机巧.当前活力, 0);
assert.equal(bridge.roster(repairedLater.data, paths).some(row => row.name === '机巧'), false);
const opposing = start(key('clone'), []);
assert.equal(bOf(opposing).units.find(row => row.id === key('clone')).controller, undefined);
const unsupported = start(); bOf(unsupported).playUnitMeta.version = 7;
assert.equal(engine.action(unsupported, { type: 'wait' }).ok, false);
const originalBridge = modules['cryptLord.battlePlayUnits']; delete modules['cryptLord.battlePlayUnits'];
assert.equal(engine.action(start('同名', []), { type: 'wait' }).ok, true);
assert.equal(engine.settle(data, battle.id, true).ok, false);
modules['cryptLord.battlePlayUnits'] = originalBridge;
console.log('Bag battle units: original admission, source isolation, actual action, unique settlement/abandon, losses and conflict protection passed.');
