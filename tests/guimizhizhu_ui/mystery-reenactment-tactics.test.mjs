import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
const context = {
  console, structuredClone, Date, Math,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {},
  } },
};
context.window = context;
for (const name of ['audience-imagination', 'reader-mystic', 'mystery-reenactment-reference',
  'mystery-reenactment', 'battle-experience', 'personal-battle-state']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', `${name}.js`), 'utf8'),
    context, { filename: name });
}
const tactics = modules['cryptLord.mysteryReenactment'];
const battleApi = modules['cryptLord.personalBattleState'];
const pool = { pathways: { 窥秘人途径: ['序列4-神秘学家'] }, abilities: {} };
const ids = ['little_match_girl', 'feast_of_betrayal', 'emperors_new_clothes',
  'chess_game_of_time', 'sleeping_beauty', 'peach_blossom_source', 'ugly_duckling', 'avalon_utopia'];
const initial = () => ({
  stat_data: { 名称: '玩家', 当前序列: '序列4-神秘学家',
    活力: 100, 当前活力: 100, 敏捷: 20, 当前敏捷: 20,
    灵性: 1000, 当前灵性: 1000, 理智: 50, 当前理智: 50,
    人性: 50, 当前人性: 50,
    $专属玩法: { 窥秘人途径: { 神秘再现玩法: {
      法术解锁账本: Object.fromEntries(ids.map(id => [id, { 解锁时间: 'now' }])),
    } } },
  },
  world_data: { 当前时间纪元: '第五纪1340年1月1日星期一12:00' },
  npc_data: { 对手: { 当前序列: '序列4-神秘学家', 活力: 1000, 当前活力: 1000,
    当前敏捷: 5, 当前灵性: 1, 当前理智: 1, 当前人性: 1 } },
});
function start(source = initial()) {
  const result = battleApi.start(source, { npcKey: '对手', imaginationPool: pool });
  assert.equal(result.ok, true);
  result.data.cryptLord.personalBattle.seed = 42;
  return result.data;
}
assert.equal(battleApi.canonOptions(start()).length, 8);
assert.equal(battleApi.canonOptions(start()).find(row => row.id === 'little_match_girl').cost, 258);
const unqualified = initial();
unqualified.stat_data.当前序列 = '序列9-窥秘人';
assert.equal(battleApi.canonOptions(start(unqualified)).length, 0);
const changedSequence = start();
changedSequence.stat_data.当前序列 = '序列9-窥秘人';
assert.equal(battleApi.canonOptions(changedSequence).length, 0);
const locked = initial();
delete locked.stat_data.$专属玩法.窥秘人途径.神秘再现玩法.法术解锁账本.sleeping_beauty;
assert.equal(battleApi.canonOptions(start(locked)).some(row => row.id === 'sleeping_beauty'), false);
for (const id of ids) {
  const before = start();
  const snapshot = structuredClone(before);
  const option = battleApi.canonOptions(before).find(row => row.id === id);
  const result = battleApi.useCanon(before, id);
  assert.equal(result.ok, true, `${id}: ${result.error}`);
  assert.equal(JSON.stringify(before), JSON.stringify(snapshot), `${id}: input mutated`);
  assert.equal(result.battle.player.spirit, 1000 - option.cost, id);
  assert.equal(result.battle.round, 2, id);
  assert.equal(result.data.stat_data.当前灵性, 1000 - option.cost, id);
}
let data = start();
let result = battleApi.useCanon(data, 'sleeping_beauty');
assert.match(result.battle.log.map(row => row.message).join(' '), /跳过本次行动/);
assert.equal(result.battle.canon.sleep, 0);
data = start();
result = battleApi.useCanon(data, 'chess_game_of_time');
assert.equal(result.battle.enemy.effects.some(effect => effect.stat === 'movement' && effect.duration === 1), true);
const continued = battleApi.act(result.data, { type: 'wait' });
assert.equal(continued.battle.enemy.effects.some(effect => effect.stat === 'movement'), false);
data = start();
data.cryptLord.personalBattle.enemy.hp = 100;
result = battleApi.useCanon(data, 'peach_blossom_source');
assert.equal(result.battle.canon.exile, 1);
assert.equal(result.battle.enemy.hp, 100);
assert.equal(battleApi.act(result.data, { type: 'basic' }).ok, false);
const waited = battleApi.act(result.data, { type: 'wait' });
assert.equal(waited.battle.canon.exile, 0);
assert.equal(waited.battle.enemy.x, result.battle.enemy.x);
data = start();
result = battleApi.useCanon(data, 'avalon_utopia');
assert.equal(result.battle.canon.environment, 'avalon_utopia');
assert.equal(battleApi.canonOptions(result.data).find(row => row.id === 'avalon_utopia').ready, false);
data = start();
result = battleApi.useCanon(data, 'ugly_duckling');
assert.equal(result.data.stat_data.$专属玩法.窥秘人途径.神秘再现玩法
  .法术运行状态.ugly_duckling.上次使用时间, data.world_data.当前时间纪元);
assert.equal(battleApi.canonOptions(result.data).find(row => row.id === 'ugly_duckling').ready, false);
const tomorrow = structuredClone(result.data);
tomorrow.world_data.当前时间纪元 = '第五纪1340年1月2日星期二12:00';
assert.equal(battleApi.canonOptions(tomorrow).find(row => row.id === 'ugly_duckling').ready, true);
data = start();
data.cryptLord.personalBattle.enemy.spirit = 100000;
data.cryptLord.personalBattle.enemy.sanity = 100000;
data.cryptLord.personalBattle.enemy.humanity = 100000;
result = battleApi.useCanon(data, 'sleeping_beauty');
assert.equal(result.ok, true);
assert.match(result.battle.log.map(row => row.message).join(' '), /失败/);
assert.equal(result.battle.canon.sleep, 0);
assert.ok(result.battle.player.spirit < 1000);
const old = start();
delete old.cryptLord.personalBattle.canon;
assert.equal(battleApi.canonOptions(old).length, 0);
assert.equal(battleApi.act(old, { type: 'wait' }).ok, true);
console.log('mystery reenactment tactics: eight actions, gate, cost, contest, duration, cooldown, old state OK');
