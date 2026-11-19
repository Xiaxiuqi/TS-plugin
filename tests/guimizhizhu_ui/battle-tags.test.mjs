import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
let books = {
  config: [
    { name: '【配置】标签映射', content: JSON.stringify({
      猎人: { tags: ['火'], duration: 4, maxStacks: 3 },
      野兽: { tags: ['木'], duration: 4 },
    }) },
    { name: '【配置】标签伤害修正', content: '{"火":{"木":0.5}}' },
    { name: '【配置】标签治疗修正', content: '{"火":{"火":0.5}}' },
  ],
};
const context = { console, structuredClone, Date, Math, Uint32Array, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { return modules[key]; },
  },
} };
context.window = context;
modules['cryptLord.hostApi'] = {
  async getWorldbookNames() { return Object.keys(books); },
  async getWorldbook(name) { return books[name]; },
};
for (const name of ['battle-experience', 'battle-terrain-presets', 'natural-environment',
  'battle-tags', 'personal-battle-state', 'team-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'),
    context, { filename: name });
}
const tags = modules['cryptLord.battleTags'];
const battle = modules['cryptLord.personalBattleState'];
let rules = await tags.load();
assert.equal(rules.damage.火.木, .5);
const actor = { tags: [] };
tags.add(actor, '火', 3, 2, 3);
tags.add(actor, '火', 2, 2, 99);
assert.equal(actor.tags[0].stacks, 2);
assert.equal(actor.tags[0].duration, 3);
tags.remove(actor, '火', 1);
assert.equal(actor.tags[0].stacks, 1);
tags.sync(actor, '猎人', rules.mapping);
assert.equal(actor.tags[0].stacks, 2);
assert.equal(actor.tags[0].$inherentStacks, 1);
tags.sync(actor, '普通人', rules.mapping);
assert.equal(actor.tags[0].stacks, 1);
assert.equal(tags.modifier({ tags: [{ name: '火' }] }, { tags: [{ name: '木' }] },
  null, rules.damage), .5);
assert.equal(tags.modifier({ tags: [{ name: '火' }] }, { tags: [{ name: '木' }] },
  null, { 火: { 木: 3 } }), 1.5);
assert.equal(tags.modifier({ tags: [{ name: '火' }] }, { tags: [{ name: '木' }] },
  null, { 火: { 木: -3 } }), -.75);
assert.equal(tags.modifier({ tags: [] }, { tags: [{ name: '木' }] },
  { skillTags: ['火'] }, rules.damage), .5);
tags.applySkill(actor, { tags: [] }, { targetType: 'enemy',
  applyTags: [{ name: '束缚', duration: 2, stacks: 2 }] }, true);
assert.equal(actor.tags.some(tag => tag.name === '束缚'), false);
const enemy = { tags: [] };
tags.applySkill(actor, enemy, { applyTags: [{ name: '束缚', duration: 2, stacks: 2 }] }, false);
assert.equal(enemy.tags.length, 0);
tags.applySkill(actor, enemy, { applyTags: [{ name: '束缚', duration: 2, stacks: 2 }] }, true);
tags.applySkill(actor, enemy, { applyTags: [{ name: '束缚', stacksChange: -1 }] }, true);
assert.equal(enemy.tags[0].stacks, 1);
tags.tick([enemy]);
assert.equal(enemy.tags[0].duration, 1);
tags.tick([enemy]);
assert.equal(enemy.tags.length, 0);
books = { damaged: [{ name: '【配置】标签伤害修正', content: '{invalid' }] };
assert.equal(Object.keys((await tags.load()).damage).length, 0);
books = { config: books.config || [
  { name: '【配置】标签映射', content: JSON.stringify({
    猎人: { tags: ['火'], duration: 4 }, 野兽: { tags: ['木'], duration: 4 },
  }) },
  { name: '【配置】标签伤害修正', content: '{"火":{"木":0.5}}' },
  { name: '【配置】标签治疗修正', content: '{"火":{"火":0.5}}' },
] };
rules = await tags.load();
const input = { stat_data: { 名称: '玩家', 当前序列: '猎人',
  活力: 100, 当前活力: 50, 灵性: 100, 当前灵性: 100,
  敏捷: 30, 当前敏捷: 30,
  序列能力列表: { 猎人: [
    { 名称: '治疗术', isHeal: true, healAmt: 20, targetType: 'ally',
      applyTags: [{ name: '治疗印记', duration: 3 }] },
    { 名称: '点燃', power: 10, range: 10, targetType: 'enemy',
      applyTags: [{ name: '燃烧', duration: 2 }] },
  ] } }, npc_data: { 野兽: { 当前序列: '野兽', 活力: 200, 当前活力: 200 } } };
const started = battle.start(input, { npcKey: '野兽', tagRules: rules }).data;
assert.equal(started.cryptLord.personalBattle.player.tags[0].name, '火');
assert.equal(started.cryptLord.personalBattle.enemy.tags[0].name, '木');
assert.equal(input.stat_data.当前活力, 50);
let result = battle.act(started, { type: 'ability', group: '猎人', index: 0 });
assert.equal(result.ok, true);
assert.equal(result.battle.player.hp, 80);
assert.ok(result.battle.player.tags.some(row => row.name === '治疗印记'));
assert.equal(result.battle.enemy.tags.some(row => row.name === '治疗印记'), false);
result = battle.act(started, { type: 'ability', group: '猎人', index: 1 });
assert.equal(result.ok, true);
assert.ok(result.battle.enemy.hp < 185);
assert.ok(result.battle.enemy.tags.some(tag => tag.name === '燃烧'));
const team = modules['cryptLord.teamBattleState'];
const teamInput = structuredClone(input);
teamInput.npc_data.同伴 = { 当前序列: '猎人', 活力: 100, 当前活力: 50,
  敏捷: 5, 当前敏捷: 5 };
teamInput.npc_data.野兽.敏捷 = 40;
teamInput.npc_data.野兽.当前敏捷 = 40;
teamInput.stat_data.序列能力列表 = { 测试: [
  { 名称: '常驻天赋', isPassive: true, effects: [
    { name: '先攻', type: 'buff', stat: 'speed', power: 100,
      valueType: 'percentage', duration: 1, battlePersistent: true },
    { name: '力量', type: 'buff', stat: 'attack', power: 5, duration: 2 },
    { name: '伤害提升', type: 'buff', stat: 'damageDealtIncrease',
      power: 25, valueType: 'percentage', duration: 2 },
    { name: '上限', type: 'buff', stat: '活力', power: 20, duration: 2 },
  ] },
  { 名称: '试击', power: 10, range: 'global', skillTags: ['雷'],
    applyTags: [{ name: '燃烧', duration: 2, stacks: 2 }],
    effects: [{ name: '灼伤', type: 'poison', stat: '当前活力',
      power: { default: 4 }, duration: 2, effectTarget: 'target' }] },
  { 名称: '友军恢复', healAmt: 20, range: 'global', targetType: 'ally',
    applyTags: [{ name: '庇护', duration: 2 }] },
  { 名称: '范围加护', range: 'global', targetType: 'allAllies', aoeRadius: 2,
    applyTags: [{ name: '印记', duration: 2 }],
    effects: [{ name: '自护', type: 'buff', stat: 'defense', power: 10,
      valueType: 'percentage', duration: 2, effectTarget: 'self' }] },
] };
let teamData = team.start(teamInput, { allies: ['同伴'], enemies: ['野兽'],
  tagRules: rules }).data;
assert.equal(teamData.cryptLord.teamBattle.queue[0], 'player');
assert.equal(teamData.cryptLord.teamBattle.units[0].hp, 50);
assert.equal(teamData.cryptLord.teamBattle.units[0].maxHp, 120);
assert.equal(team.options(teamData).some(choice => choice.id === 'skill:测试:0'), false);
const snapshot = JSON.stringify(teamData);
const restored = team.get(teamData);
assert.equal(restored.units[0].effects.length, 4);
assert.equal(JSON.stringify(teamData), snapshot);
assert.equal(JSON.stringify(team.get(teamData)), JSON.stringify(restored));
const bad = team.action(teamData, { id: 'skill:测试:1', target: '不存在' });
assert.equal(bad.ok, false);
assert.equal(JSON.stringify(teamData), snapshot);
const hit = team.action(teamData, { id: 'skill:测试:1', target: '野兽' });
assert.equal(hit.battle.units.find(row => row.id === '野兽').hp, 168);
assert.equal(hit.battle.units.find(row => row.id === '野兽').effects[0].power, 6);
assert.equal(hit.battle.units.find(row => row.id === '野兽').tags
  .find(row => row.name === '燃烧').stacks, 2);
function finishRound(data) {
  while (data.cryptLord.teamBattle.phase === 'action')
    data = team.action(data, { type: 'wait' }).data;
  return team.tactic(data, 'skip').data;
}
teamData = finishRound(hit.data);
assert.equal(teamData.cryptLord.teamBattle.units.find(row => row.id === '野兽').hp, 168);
assert.equal(teamData.cryptLord.teamBattle.units[0].effects
  .find(row => row.name === '先攻').duration, 1);
const healed = team.action(teamData, { id: 'skill:测试:2', target: '同伴' });
assert.equal(healed.battle.units.find(row => row.id === '同伴').hp, 80);
assert.ok(healed.battle.units.find(row => row.id === '同伴').tags
  .some(row => row.name === '庇护'));
assert.equal(healed.battle.units[0].tags.some(row => row.name === '庇护'), false);
teamData = finishRound(healed.data);
assert.equal(teamData.cryptLord.teamBattle.units[0].maxHp, 100);
assert.equal(teamData.cryptLord.teamBattle.units[0].effects.length, 1);
assert.equal(teamData.cryptLord.teamBattle.units.find(row => row.id === '野兽').tags
  .some(row => row.name === '燃烧'), false);
const area = team.action(teamData, { id: 'skill:测试:3', target: '同伴' });
assert.equal(area.ok, true);
assert.equal(area.battle.units[0].tags.find(row => row.name === '印记').stacks, 1);
assert.equal(area.battle.units.find(row => row.id === '同伴').tags
  .some(row => row.name === '印记'), false);
assert.equal(area.battle.units[0].effects.find(row => row.name === '自护').power, 10);
const legacy = structuredClone(teamData);
delete legacy.cryptLord.teamBattle.units[0].tagsAndPassivesInitialized;
const legacyBefore = JSON.stringify(legacy);
assert.ok(team.get(legacy).units[0].tagsAndPassivesInitialized);
assert.equal(JSON.stringify(legacy), legacyBefore);
const timedInput = structuredClone(input);
timedInput.stat_data.序列能力列表 = { 天赋: [{
  名称: '时序天赋', isPassive: true, effects: [
    { name: '开始恢复', type: 'regen', power: 2, duration: 2, triggerTiming: 'turn_start' },
    { name: '结束恢复', type: 'regen', power: 5, duration: 2, triggerTiming: 'turn_end' },
    { name: '回合反噬', type: 'poison', power: 3, duration: 2, triggerTiming: 'round_end' },
  ],
}] };
let timed = team.start(timedInput, { enemies: ['野兽'], tagRules: {} }).data;
assert.equal(timed.cryptLord.teamBattle.units[0].hp, 52);
const moved = team.action(timed, { type: 'move', x: 1, y: 8 });
assert.equal(moved.ok, true);
assert.equal(moved.battle.units[0].hp, 52);
assert.equal(team.get(moved.data).units[0].hp, 52);
timed = finishRound(moved.data);
assert.equal(timed.cryptLord.teamBattle.units[0].hp, 56);
assert.equal(timed.cryptLord.teamBattle.units[0].effects
  .some(row => row.name === '开始恢复'), false);
timed = finishRound(timed);
assert.equal(timed.cryptLord.teamBattle.units[0].hp, 58);
assert.equal(timed.cryptLord.teamBattle.units[0].effects.length, 0);
console.log('battle tags: personal compatibility and complete team tags/passive lifecycle passed');
