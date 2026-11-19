import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
let worldbook = [];
let books = ['主库'];
let catalogs = null;
const context = { console, structuredClone, Date, Math, cryptLord: {
  __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { return modules[key]; },
  },
} };
context.window = context;
modules['cryptLord.hostApi'] = {
  async getWorldbookNames() { return books; },
  async getWorldbook(name) { return catalogs ? catalogs[name] || [] : worldbook; },
};
for (const name of ['ability-state', 'battle-experience', 'battle-life-save', 'battle-terrain-presets',
  'personal-battle-state', 'team-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, `public/guimizhizhu_ui/core/${name}.js`), 'utf8'), context);
}
const life = modules['cryptLord.battleLifeSave'];
const battle = modules['cryptLord.personalBattleState'];
const originalPath = path.join(base,
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/');
const originalSource = await readFile(path.join(originalPath, '30a2-js-battle-board-and-units.txt'), 'utf8');
const migratedSource = await readFile(path.join(base, 'public/guimizhizhu_ui/core/battle-life-save.js'), 'utf8');
const parse = text => ts.createSourceFile('rules.js', text, 99, true, ts.ScriptKind.JS);
function classText(text) {
  const source = parse(text);
  let found;
  const visit = node => {
    if (ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager') found = node.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found?.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '');
}
assert.equal(classText(migratedSource), classText(originalSource.slice(
  originalSource.indexOf('const LIFE_SAVE_TABLE'))), 'Full original manager must remain unchanged');
const config = (name, skill) => [{ comment: '【配置】保命技能',
  content: `\`\`\`jsonc\n{// configuration\n"${name}": {"weak": {"from": 7, "name": "${skill}"},},}\n\`\`\`` }];
books = ['无关库', '【源堡】玩家自建内容', '2历史孔隙', '1源堡'];
catalogs = {
  无关库: config('占卜家', '不应覆盖'),
  '【源堡】玩家自建内容': [...config('占卜家', '自建替身'), ...config('自建', '自建保命')],
  '2历史孔隙': config('占卜家', '副库替身'),
  '1源堡': [...config('占卜家', '主库旧版'), ...config('占卜家', '主库新版')],
};
const catalogSnapshot = JSON.stringify(catalogs);
assert.equal((await life.load()).占卜家.weak.name, '主库新版');
assert.equal((await life.load()).自建.weak.name, '自建保命');
assert.equal(JSON.stringify(catalogs), catalogSnapshot, 'Configuration load cannot mutate books');
catalogs['1源堡'] = [{ comment: '【配置】保命技能', content: '{broken' }];
assert.equal((await life.load()).占卜家.weak.name, '副库替身');
catalogs = null; books = ['主库'];
worldbook = [{ comment: '【配置】保命技能', content: JSON.stringify({
  占卜家: { weak: { from: 8, name: '书中替身' } },
  自建: { strong: { from: 6, name: '秘法' }, weak: null },
}) }];
const table = await life.load();
assert.equal(table.占卜家.strong.name, '纸人替身');
assert.equal(table.占卜家.weak.name, '书中替身');
assert.equal(table.自建.weak, null);
const pathways = { 占卜家途径: ['序列7-魔术师'] };
assert.equal(life.eligibility('序列7-未知称号', '占卜家', table, pathways).hasStrong, false,
  'A formal pathway library must not be bypassed by declared pathway');
const dual = { ...pathways, 猎人途径: ['序列6-阴谋家'],
  偷盗者途径: ['旧日侍者', '序列4-寄生者'] };
assert.equal(life.eligibility('【序列7-魔术师】/序列6-阴谋家', '', table, dual).weakName, '书中替身');
assert.equal(life.eligibility('旧日侍者', '', table, dual).hasStrong, true);
assert.equal(life.eligibility('序列4-寄生者', '', table, dual).strongName, '身体时之虫化');
assert.equal(life.eligibility('序列7-魔术师', '', table, pathways).hasStrong, true);
assert.equal(life.eligibility('序列7-魔术师', '', table, pathways).weakName, '书中替身');
assert.equal(life.eligibility('普通人', '占卜家', table).hasStrong, false);
assert.equal(life.eligibility('序列10-占卜家', '占卜家', table).hasStrong, false);
const actor = { hp: 100, maxHp: 100 };
life.initialize(actor, '序列7-魔术师', '占卜家', table);
assert.equal(life.absorb(actor, 30).triggered, false);
let saved = life.absorb(actor, 31);
assert.equal(saved.damage, 11);
assert.equal(actor.lifeSave.weakLeft, 2);
saved = life.absorb(actor, 100);
assert.equal(saved.damage, 0);
assert.equal(actor.lifeSave.strongLeft, 0);
actor.hp = 10;
saved = life.absorb(actor, 15);
assert.equal(saved.damage, 0);
assert.equal(actor.lifeSave.weakLeft, 1);
actor.hp = 0;
assert.equal(life.absorb(actor, 90).triggered, false);
const projection = { hp: 100, maxHp: 100, source: 'player' };
life.initialize(projection, '序列7-魔术师', '占卜家', table, null, dual);
assert.equal(projection.lifeSave.usingCustomStrategy, false);
life.absorb(projection, 100);
life.absorb(projection, 31);
const quotas = JSON.parse(JSON.stringify(projection));
life.reconcile(quotas, '普通人', '占卜家', table, dual);
assert.equal(quotas.lifeSave.weakLeft, 0);
life.reconcile(quotas, '序列7-魔术师', '占卜家', table, dual);
assert.equal(quotas.lifeSave.strongLeft, 0);
assert.equal(quotas.lifeSave.weakLeft, 2);
delete quotas.lifeSave.strongUsed;
delete quotas.lifeSave.weakUsed;
life.reconcile(quotas, '序列7-魔术师', '占卜家', table, dual);
assert.equal(quotas.lifeSave.strongUsed, 1);
assert.equal(quotas.lifeSave.weakUsed, 1);
assert.equal(life.absorb({ hp: 0, maxHp: 100, lifeSave: quotas.lifeSave }, 100).skillName, '');
assert.equal(life.absorb(null, 20).absorbPct, 0);
const threshold = { hp: 50, maxHp: 100 };
life.initialize(threshold, '序列7-魔术师', '占卜家', table);
assert.equal(life.absorb(threshold, 11).triggered, false, 'Half-health threshold is strict');
threshold.hp = 49;
assert.equal(life.absorb(threshold, 10).triggered, false, 'Damage threshold is strict');
assert.equal(life.absorb(threshold, 11).damage, 0);
const overwhelmingActor = { hp: 100, maxHp: 100 };
life.initialize(overwhelmingActor, '序列7-魔术师', '占卜家', table);
assert.equal(life.absorb(overwhelmingActor, 1000).damage, 800, 'Strong shield does not guarantee survival');
assert.equal(life.finalEffectVerdict(0, 100), '无效果');
assert.equal(life.finalEffectVerdict(1, 100), '几乎无效果');
assert.equal(life.finalEffectVerdict(10, 100), '效果微弱');
assert.equal(life.finalEffectVerdict(20, 100), '效果一般');
assert.equal(life.finalEffectVerdict(30, 100), '效果良好');
assert.equal(life.finalEffectVerdict(31, 100), '效果显著');
assert.throws(() => life.strategy({ stages: [{ damageOverMaxRatio: 1.1 }] }));
const original = { cryptLord: {}, stat_data: {} };
const changed = life.saveStrategy(original, { stages: [{ damageOverMaxRatio: .2, hpBelowRatio: .6 }] });
assert.equal(changed.ok, true);
assert.equal(original.cryptLord.lifeSaveStrategy, undefined);
assert.equal(life.storedStrategy(changed.data).stages[0].hpBelowRatio, .6);
assert.equal(life.saveStrategy(changed.data, null).data.cryptLord.lifeSaveStrategy, undefined);
worldbook = [{ comment: '【配置】保命技能', content: '{damaged' }];
assert.equal((await life.load()).占卜家.strong.name, '纸人替身');
const input = { stat_data: {
  名称: '玩家', 当前途径: '占卜家', 当前序列: '序列7-魔术师',
  活力: 100, 当前活力: 100, 灵性: 100, 当前灵性: 100,
  理智: 100, 当前理智: 100, 人性: 100, 当前人性: 100,
  敏捷: 30, 当前敏捷: 30,
}, npc_data: { 敌人: { 当前途径: '猎人', 当前序列: '序列6-阴谋家',
  活力: 100, 当前活力: 100, 当前敏捷: 10 } } };
const started = battle.start(input, { npcKey: '敌人', lifeSaveTable: table }).data;
assert.equal(started.cryptLord.personalBattle.player.lifeSave.weakLeft, 3);
assert.equal(started.cryptLord.personalBattle.enemy.lifeSave.weakLeft, 3);
assert.equal(input.cryptLord, undefined);
const updated = life.saveStrategy(started, { stages: [{ damageOverMaxRatio: .15 }] });
assert.equal(updated.data.cryptLord.personalBattle.player.lifeSave.strategy.stages[0].damageOverMaxRatio, .15);
assert.equal(started.cryptLord.personalBattle.player.lifeSave.strategy.stages[0].damageOverMaxRatio, .3);
const near = structuredClone(started);
near.cryptLord.personalBattle.enemy.x = near.cryptLord.personalBattle.player.x + 1;
near.cryptLord.personalBattle.enemy.y = near.cryptLord.personalBattle.player.y;
near.cryptLord.personalBattle.enemy.hp = 3;
const strike = battle.act(near, { type: 'basic' });
assert.equal(strike.ok, true);
assert.equal(strike.battle.enemy.lifeSave.weakLeft, 2);
assert.ok(strike.battle.log.some(entry => entry.message.includes('火焰瞬移')));
assert.equal(near.cryptLord.personalBattle.enemy.lifeSave.weakLeft, 3);
const terrain = structuredClone(started);
terrain.cryptLord.personalBattle.player.hp = 1;
terrain.cryptLord.personalBattle.board.terrain[
  `${terrain.cryptLord.personalBattle.player.x},${terrain.cryptLord.personalBattle.player.y}`] = 'fire';
const waited = battle.act(terrain, { type: 'wait' });
assert.equal(waited.battle.player.lifeSave.strongLeft, 1);
assert.equal(waited.battle.status, 'finished');
assert.equal(waited.battle.result, 'defeat');
const second = battle.start(battle.act(started, { type: 'retreat' }).data,
  { npcKey: '敌人', lifeSaveTable: table });
assert.equal(second.battle.player.lifeSave.strongLeft, 1);
const team = modules['cryptLord.teamBattleState'];
const teamInput = structuredClone(input);
teamInput.stat_data.敏捷 = teamInput.stat_data.当前敏捷 = 40;
teamInput.stat_data.序列能力列表 = { 攻击: [
  { 名称: '大击', power: 100, range: 'global' },
  { 名称: '小击', power: 31, range: 'global' },
  { 名称: '群体击', power: 100, range: 'global', targetType: 'allEnemies', aoeRadius: 2 },
] };
teamInput.npc_data.敌甲 = { ...structuredClone(input.stat_data), 名称: '敌甲',
  敏捷: 10, 当前敏捷: 10, 能力清单: [
    { 名称: '反击', power: 100, range: 'global' },
  ] };
teamInput.npc_data.敌乙 = structuredClone(input.npc_data.敌人);
teamInput.npc_data.盟友 = structuredClone(input.npc_data.敌人);
const openTeam = () => team.start(teamInput, {
  allies: ['盟友'], enemies: ['敌甲', '敌乙'], lifeSaveTable: table,
}).data;
const repeatPlayer = data => {
  const next = structuredClone(data);
  next.cryptLord.teamBattle.phase = 'action';
  next.cryptLord.teamBattle.index = next.cryptLord.teamBattle.queue.indexOf('player');
  return next;
};
const teamStart = openTeam();
const formalTeam = team.start(teamInput, { enemies: ['敌甲'], lifeSaveTable: table,
  pathways: { 猎人途径: ['序列6-阴谋家'] } });
assert.equal(formalTeam.battle.units[0].lifeSave.hasStrong, false);
assert.equal(formalTeam.battle.units[1].lifeSave.hasStrong, false);
const formalPersonal = battle.start(input, { npcKey: '敌人', lifeSaveTable: table,
  imaginationPool: { pathways: { 猎人途径: ['序列6-阴谋家'] } } });
assert.equal(formalPersonal.battle.player.lifeSave.hasStrong, false);
assert.equal(formalPersonal.battle.enemy.lifeSave.hasWeak, true);
assert.equal(formalPersonal.battle.enemy.lifeSave.usingCustomStrategy, false);
const npcDefault = { source: 'npc', hp: 100, maxHp: 100 };
life.initialize(npcDefault, '序列7-魔术师', '占卜家', table,
  { stages: [{ damageOverMaxRatio: .95 }] }, dual);
assert.equal(npcDefault.lifeSave.strategy.stages[0].damageOverMaxRatio, .3);
assert.equal(npcDefault.lifeSave.usingCustomStrategy, false);
const projectionBattle = JSON.parse(JSON.stringify(teamStart.cryptLord.teamBattle));
projectionBattle.lifeSavePathways = dual;
const projectionPlayer = projectionBattle.units[0];
life.absorb(projectionPlayer, 100);
life.absorb(projectionPlayer, 31);
projectionPlayer.sequence = '普通人';
team.refreshProjectionPassives(projectionBattle, projectionPlayer, teamInput.stat_data);
assert.equal(projectionPlayer.lifeSave.weakLeft, 0);
projectionPlayer.sequence = '序列7-魔术师';
team.refreshProjectionPassives(projectionBattle, projectionPlayer, teamInput.stat_data);
assert.equal(projectionPlayer.lifeSave.strongLeft, 0);
assert.equal(projectionPlayer.lifeSave.weakLeft, 2);
const teamSnapshot = structuredClone(teamStart);
assert.equal(teamStart.cryptLord.teamBattle.units[0].lifeSave.strongLeft, 1);
assert.equal(teamStart.cryptLord.teamBattle.units.find(row => row.id === '敌甲').lifeSave.weakName, '书中替身');
assert.equal(teamStart.cryptLord.teamBattle.units.find(row => row.id === '盟友').lifeSave.strongLeft, 0);
const strongHit = team.action(teamStart, { id: 'skill:攻击:0', target: '敌甲' });
assert.equal(strongHit.ok, true);
assert.equal(strongHit.battle.units.find(row => row.id === '敌甲').hp, 100);
assert.equal(strongHit.battle.units.find(row => row.id === '敌甲').lifeSave.strongLeft, 0);
assert.equal(strongHit.battle.units[0].damage, 0);
assert.equal(strongHit.battle.units[0].kills, 0);
const strongLog = strongHit.battle.log.find(row => row.target === '敌甲');
assert.equal(strongLog.lifeSaveMeta.absorbed, 100);
assert.equal(strongLog.damage, 0);
assert.equal(strongLog.incoming, 100);
assert.equal(JSON.stringify(teamStart), JSON.stringify(teamSnapshot));
let weakTurns = strongHit.data;
for (const remaining of [2, 1, 0]) {
  const hit = team.action(repeatPlayer(weakTurns), { id: 'skill:攻击:1', target: '敌甲' });
  assert.equal(hit.ok, true);
  assert.equal(hit.battle.units.find(row => row.id === '敌甲').lifeSave.weakLeft, remaining);
  assert.equal(hit.battle.log.filter(row => row.target === '敌甲').at(-1).damage, 11);
  weakTurns = hit.data;
}
assert.equal(team.get(weakTurns).units.find(row => row.id === '敌甲').lifeSave.weakLeft, 0);
const noMoreShield = team.action(repeatPlayer(weakTurns), { id: 'skill:攻击:1', target: '敌甲' });
assert.equal(noMoreShield.battle.units.find(row => row.id === '敌甲').hp, 36);
assert.equal(noMoreShield.battle.units[0].damage, 64);
const changedTeam = life.saveStrategy(noMoreShield.data, {
  stages: [{ damageOverMaxRatio: .1, hpBelowRatio: .8 }],
});
assert.equal(changedTeam.data.cryptLord.teamBattle.units[0].lifeSave.strategy.stages[0].damageOverMaxRatio, .1);
assert.equal(changedTeam.data.cryptLord.teamBattle.units.find(row => row.id === '敌甲')
  .lifeSave.strategy.stages[0].damageOverMaxRatio, .3);
assert.equal(changedTeam.data.cryptLord.teamBattle.units.find(row => row.id === '敌甲').lifeSave.weakLeft, 0);
assert.equal(changedTeam.data.cryptLord.teamBattle.units[0].lifeSave.strongLeft, 1);
const resetTeam = life.saveStrategy(changedTeam.data, null);
assert.equal(resetTeam.data.cryptLord.teamBattle.units[0].lifeSave.strategy.stages[0].damageOverMaxRatio, .3);
assert.equal(resetTeam.data.cryptLord.teamBattle.units.find(row => row.id === '敌甲').lifeSave.strongLeft, 0);
const npcStrike = openTeam();
npcStrike.cryptLord.teamBattle.index = npcStrike.cryptLord.teamBattle.queue.indexOf('敌甲');
const playerSaved = team.action(npcStrike, { id: 'npc-skill:0', target: 'player' });
assert.equal(playerSaved.ok, true);
assert.equal(playerSaved.data.stat_data.当前活力, 100);
assert.equal(playerSaved.battle.units[0].lifeSave.strongLeft, 0);
const preserveQuota = life.saveStrategy(playerSaved.data, null);
assert.equal(preserveQuota.data.cryptLord.teamBattle.units[0].lifeSave.strongLeft, 0);
const areaSaved = team.action(openTeam(), { id: 'skill:攻击:2', target: '敌甲' });
assert.equal(areaSaved.ok, true);
assert.equal(areaSaved.battle.units.find(row => row.id === '敌甲').hp, 100);
assert.equal(areaSaved.battle.units.find(row => row.id === '敌乙').hp, 20);
assert.equal(areaSaved.battle.units.find(row => row.id === '敌乙').lifeSave.weakLeft, 2);
assert.equal(areaSaved.battle.units[0].damage, 80);
const overwhelming = openTeam();
overwhelming.stat_data.序列能力列表.攻击[2].power = 1000;
const finishedTeam = team.action(overwhelming, { id: 'skill:攻击:2', target: '敌甲' });
assert.equal(finishedTeam.ok, true);
assert.equal(finishedTeam.battle.status, 'finished');
assert.equal(finishedTeam.battle.units[0].damage, 200);
assert.equal(finishedTeam.battle.units[0].kills, 2);
assert.equal(finishedTeam.battle.log.find(row => row.target === '敌甲').lifeSaveMeta.absorbed, 200);
assert.equal(finishedTeam.battle.log.find(row => row.target === '敌甲').incoming, 1000);
const abandoned = team.settle(finishedTeam.data, finishedTeam.battle.id, false);
assert.equal(abandoned.ok, true);
const restarted = team.start(abandoned.data, { enemies: ['敌甲'], lifeSaveTable: table });
assert.equal(restarted.ok, true);
assert.equal(restarted.battle.units.find(row => row.id === '敌甲').lifeSave.strongLeft, 1);
assert.equal(restarted.battle.units.find(row => row.id === '敌甲').lifeSave.weakLeft, 3);
const missedTeam = openTeam();
Object.assign(missedTeam.cryptLord.teamBattle.units[0], { x: 0, y: 2 });
missedTeam.stat_data.武器列表 = { 枪: { 名称: '手枪', 序列: '普通', isEquipped: true,
  $战斗分类: { 威力量级: '手枪级', 精度: '手枪级', 射程: '中距离', AOE: '无AOE' } } };
const missed = team.action(missedTeam, { id: 'weapon:枪', target: '敌甲' }, () => 1);
assert.equal(missed.ok, true);
assert.equal(missed.battle.units.find(row => row.id === '敌甲').lifeSave.weakLeft, 3);
assert.equal(missed.battle.units.find(row => row.id === '敌甲').lifeSave.strongLeft, 1);
const poisonedTeam = openTeam();
poisonedTeam.cryptLord.teamBattle.phase = 'tactic';
poisonedTeam.cryptLord.teamBattle.units.find(row => row.id === '盟友').hp = 0;
poisonedTeam.cryptLord.teamBattle.units[0].effects.push({
  name: '测试毒', type: 'poison', stat: '当前活力', power: 100, duration: 1,
});
const poisoned = team.tactic(poisonedTeam, 'skip');
assert.equal(poisoned.ok, true);
assert.equal(poisoned.battle.status, 'finished');
assert.equal(poisoned.battle.units[0].hp, 0);
assert.equal(poisoned.battle.units[0].lifeSave.strongLeft, 1);
const terrainTeam = openTeam();
terrainTeam.cryptLord.teamBattle.units[0].hp = 1;
terrainTeam.cryptLord.teamBattle.terrain = [
  { x: 0, y: 8, id: 'fireSurface', name: '火焰地表', rank: 0, tier: 0 },
];
const stepped = team.action(terrainTeam, { type: 'move', x: 0, y: 8 });
assert.equal(stepped.ok, true);
assert.equal(stepped.battle.units[0].hp, 0);
assert.equal(stepped.battle.units[0].lifeSave.strongLeft, 1);
const legacyTeam = openTeam();
delete legacyTeam.cryptLord.teamBattle.lifeSaveTable;
legacyTeam.cryptLord.teamBattle.units.forEach(row => { delete row.lifeSave; });
const legacySnapshot = structuredClone(legacyTeam);
assert.equal(team.get(legacyTeam).units[0].lifeSave.strongLeft, 1);
assert.equal(JSON.stringify(legacyTeam), JSON.stringify(legacySnapshot));
const restoredTeam = team.action(legacyTeam, { id: 'skill:攻击:0', target: '敌甲' });
assert.equal(restoredTeam.ok, true);
assert.equal(restoredTeam.battle.units.find(row => row.id === '敌甲').lifeSave.strongLeft, 0);
console.log('life save: 2 focused groups passed (exact original rules/config; personal/team lifecycle and boundaries)');
