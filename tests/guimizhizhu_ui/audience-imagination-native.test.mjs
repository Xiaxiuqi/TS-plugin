import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const modules = {};
let modelCalls = 0;
const context = vm.createContext({ console, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
modules['cryptLord.hostApi'] = { async generateRaw() { modelCalls++; throw Error('本地空想不应调用模型'); } };
for (const name of ['audience-imagination', 'marionette-reference', 'marionette-state',
  'audience-imagination-reference', 'audience-imagination-state', 'battle-experience',
  'personal-battle-state', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const pool = { pathways: {
  观众途径: ['序列9-观众', '序列1-作家', '序列0.5-半位阶观众', '序列0-空想家'],
  秘祈人途径: ['序列9-秘祈人', '序列5-牧羊人', '序列1-暗天使', '序列0-倒吊人'],
  占卜家途径: ['序列9-占卜家', '序列1-诡秘侍者', '序列0-愚者', '旧日-诡秘之主'],
  阅读者途径: ['序列9-阅读者', '序列1-全知之眼', '序列0-白塔'],
}, abilities: {
  '占卜家途径-序列9': [{ name: '基础占卜', description: '原版说明', range: 0, isPassive: false }],
  '占卜家途径-序列1': [{ name: '共用技能', power: 5, range: 'global', skillTags: [],
    conditionalParams: [{ condition: 'self', power: 8 }],
    effects: [{ name: '神秘增益', type: 'buff', valueType: 'percentage', stat: '活力', power: 10 }] }],
  '占卜家途径-序列0': Array.from({ length: 18 }, (_, i) => ({ name: `愚者能力${i}`, power: 8, range: 20, cost: { type: 'currentSpirit', amount: 4 } })),
  '秘祈人途径-序列1': [{ name: '共用技能', power: 99 }, { name: '暗影袭击', power: 10 }],
  '秘祈人途径-序列0': Array.from({ length: 18 }, (_, i) => ({ name: `倒吊人能力${i}`, power: 8, cost: { type: 'currentSpirit', amount: 4 } })),
  '阅读者途径-序列1': [{ name: '全知技能', power: 10 }],
  '阅读者途径-序列0': Array.from({ length: 18 }, (_, i) => ({ name: `白塔能力${i}`, power: 8, cost: { type: 'currentSpirit', amount: 4 } })),
} };
const card = sequence => ({ 当前序列: sequence, 活力: 100, 当前活力: 80,
  敏捷: 100, 当前敏捷: 80, 灵性: 100, 当前灵性: 80, 理智: 100, 当前理智: 80,
  人性: 100, 当前人性: 80, 运气: 100 });
const initial = { stat_data: { ...card('序列1-作家'), 名称: '玩家',
  序列能力列表: { 真实组: [{ 名称: '真实能力' }], '#秘术强化': [{ 名称: '共用技能', power: 1 }] } },
  npc_data: { 对手: { ...card('序列0-空想家'), 能力清单: [{ 名称: '固有能力', power: 8 }] } },
  world_data: { 当前时间纪元: '第五纪1352年1月1日星期一12:00' }, cryptLord: {} };
const api = modules['cryptLord.audienceImagination'], service = modules['cryptLord.audienceImaginationState'];
const reference = modules['cryptLord.audienceImaginationReference'], plain = value => JSON.parse(JSON.stringify(value));
const play = data => data.stat_data.$专属玩法?.观众途径?.空想玩法;
let consent = true;
const session = service.create(initial, pool, { confirm: async () => consent });
const originalSource = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37e-js-domain-affairs-window.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', originalSource.slice(originalSource.indexOf('const AudienceImaginationCore =')), 99, true, ts.ScriptKind.JS);
const original = vm.runInNewContext(`${ast.statements[0].getText(ast)}; AudienceImaginationCore`, { window: {} });
// 1. Original storage/trait parity, pure reads, gates and reversible ability projections.
assert.equal(service.gate(initial, pool).slots, 1);
assert.equal(api.gate(pool, '序列0.5-半位阶观众').rank, 1);
assert.equal(api.gate(pool, '上帝').slots, 2);
assert.equal(api.gate(pool, '序列9-观众').unlocked, false);
const before = JSON.stringify(session.data); session.render(); assert.equal(JSON.stringify(session.data), before);
session.state.values = ['占卜家途径', '秘祈人途径'];
await session.action('save');
assert.equal(session.data.stat_data.当前序列, '序列1-作家');
assert.equal(api.resolve(pool, session.data).imagined.length, 1);
assert.equal(play(session.data).空想栏位.栏位2.途径, '秘祈人途径');
const projected = session.data.stat_data.序列能力列表['#空想:占卜家途径:序列1-诡秘侍者'][0];
assert.equal(projected.名称, '共用技能'); assert.equal(projected.range, 'global');
assert.equal(projected.effects[0].valueType, 'percentage'); assert.equal(projected.skillTags.length, 0);
assert.deepEqual(plain(projected), {
  ...plain(reference.create({ pool }).abilities('序列1-诡秘侍者')['序列1-诡秘侍者'][0]),
  $空想来源: '占卜家途径' });
assert.ok(session.data.stat_data.辅助能力列表['#空想']);
const locked = api.save(initial, pool, ['占卜家途径', ''], true);
assert.equal(Object.keys(locked.stat_data.序列能力列表).some(key => key.endsWith('序列9-占卜家')), false);
session.data.stat_data.当前序列 = '序列0-空想家'; api.sync(session.data, pool);
assert.equal(api.resolve(pool, session.data).imagined.length, 2);
session.data.stat_data.当前序列 = '序列9-观众'; api.sync(session.data, pool);
assert.equal(Object.keys(session.data.stat_data.序列能力列表).some(key => key.startsWith('#空想:')), false);
assert.equal(play(session.data).空想栏位.栏位2.途径, '秘祈人途径');
session.data.stat_data.当前序列 = '序列0-空想家'; api.sync(session.data, pool);
assert.equal(api.resolve(pool, session.data).imagined.length, 2);
// 2. Local trait separation: cancellation, collision/merge, permanent two-use ledger and atomic failure.
consent = false; const noSeparation = JSON.stringify(session.data);
await session.action('separate-writer-trait'); assert.equal(JSON.stringify(session.data), noSeparation);
consent = true;
const expected = structuredClone(session.data);
original.separateWriterTrait(expected, { imaginationGate: { unlocked: true, projectionRank: 0 } });
await session.action('separate-writer-trait');
assert.deepEqual(plain(session.data), plain(expected));
delete session.data.stat_data.其他列表.作家特性;
await session.action('separate-writer-trait'); assert.equal(play(session.data).分离序列1特性.已使用次数, 2);
assert.equal(session.data.stat_data.其他列表.作家特性.数量, 1);
await assert.rejects(() => session.action('separate-writer-trait'), /永久额度/);
const collided = structuredClone(session.data);
play(collided).分离序列1特性.已使用次数 = 0;
collided.stat_data.其他列表 = { 作家特性: '原物品', 别名: { 名称: '作家特性', 数量: .5, 标记: '保留' } };
const merged = api.separate(collided, pool);
assert.equal(merged.stat_data.其他列表.别名.数量, 1.5); assert.equal(merged.stat_data.其他列表.别名.标记, '保留');
assert.equal(merged.stat_data.其他列表.作家特性, '原物品');
delete collided.stat_data.其他列表.别名;
assert.equal(api.separate(collided, pool).stat_data.其他列表['作家特性#2'].数量, 1);
const unknownVersion = structuredClone(session.data); play(unknownVersion).版本 = 3;
await assert.rejects(() => service.create(unknownVersion, pool).action('save'), /版本/);
const fighting = structuredClone(session.data); fighting.cryptLord.teamBattle = { status: 'active' };
await assert.rejects(() => service.create(fighting, pool).action('save'), /战斗/);
const failing = service.create(initial, pool); failing.state.values = ['占卜家途径', ''];
modules['cryptLord.readerMystic'] = { sync() { throw Error('同步中途失败'); } };
await assert.rejects(() => failing.action('save'), /中途失败/);
assert.deepEqual(failing.data, initial); delete modules['cryptLord.readerMystic'];
// 3. One-pass cross-grant, deterministic deduplication, dormancy, malformed legacy records and clear actions.
const cross = api.save(initial, pool, ['秘祈人途径', '']);
cross.stat_data.$专属玩法.秘祈人途径 = { 放牧玩法: {
  灵魂列表: { 阅读者灵魂: { 当前序列: '序列1-全知之眼' } }, 激活灵魂: ['阅读者灵魂'] } };
const snapshot = api.resolve(pool, cross);
assert.match(snapshot.effectiveSequence, /暗天使[\s\S]*全知之眼/);
assert.equal(snapshot.imagined.length, 1); assert.equal(snapshot.grazed.length, 1);
const resolver = reference.create({ pool }).resolver.resolve(cross);
assert.deepEqual(plain(snapshot.grazed), plain(resolver.grazedSelections));
api.sync(cross, pool); assert.ok(cross.stat_data.序列能力列表['#放牧:阅读者灵魂:序列1-全知之眼']);
const cleared = api.save(cross, pool, ['', '']);
assert.equal(api.resolve(pool, cleared).grazed.length, 0);
assert.equal(cleared.stat_data.辅助能力列表['#放牧'].名称, '放牧');
assert.equal(cleared.stat_data.辅助能力列表['#空想'], undefined);
const legacy = structuredClone(cross); delete legacy.stat_data.$专属玩法.秘祈人途径.放牧玩法.激活灵魂;
const legacyBefore = JSON.stringify(legacy); assert.equal(api.resolve(pool, legacy).grazed.length, 0);
assert.equal(JSON.stringify(legacy), legacyBefore);
const grazedAudience = structuredClone(cross);
grazedAudience.stat_data.当前序列 = '序列1-暗天使';
grazedAudience.stat_data.$专属玩法.秘祈人途径.放牧玩法.灵魂列表.阅读者灵魂.当前序列 = '序列0-空想家';
assert.equal(service.gate(grazedAudience, pool).projectionRank, 0);
const clearSession = service.create(session.data, pool);
await clearSession.action('clear-slot', '2');
assert.equal(play(clearSession.data).空想栏位.栏位2.途径, '');
assert.equal(play(clearSession.data).空想栏位.栏位1.途径, '占卜家途径');
// 4. Exact original weighted NPC selection, personal/team caching, ability consumption and native data isolation.
let draws = 0; const random = () => { draws++; return .25; };
const npc = api.npcProjection(pool, '序列0-空想家', random);
assert.equal(npc.imagined.length, 2);
assert.ok(npc.abilities.length > 3);
assert.equal(new Set(npc.abilities.map(row => row.名称)).size, npc.abilities.length);
const rawNpc = reference.create({ pool, random: () => .25 }).core.buildNpcBattleProjection(
  { 当前序列: '序列0-空想家' }, 'npc', new Map());
assert.deepEqual(plain(npc.abilities), plain(rawNpc.data.能力清单));
const cache = new Map(), originalRules = reference.create({ pool, random });
originalRules.core.buildNpcBattleProjection(initial.npc_data.对手, '对手', cache);
const drawCount = draws;
originalRules.core.buildNpcBattleProjection(initial.npc_data.对手, '对手', cache);
assert.equal(draws, drawCount);
const baseNpc = JSON.stringify(session.data.npc_data);
const team = modules['cryptLord.teamBattleState'];
const preflight = team.start(session.data, { enemies: ['对手'], summonPool: pool });
assert.equal(preflight.ok, true, preflight.error);
const started = team.start(session.data, { enemies: ['对手'], summonPool: pool,
  imaginationCache: preflight.battle.imaginationMeta.npcCache });
assert.deepEqual(plain(started.battle.units[1].imagination), plain(preflight.battle.units[1].imagination));
assert.ok(started.battle.units[0].sequence.includes('愚者'));
assert.equal(started.battle.units[0].maxHp, 100);
assert.equal(JSON.stringify(started.data.npc_data), baseNpc);
const reloaded = team.get(JSON.parse(JSON.stringify(started.data)));
assert.deepEqual(plain(reloaded.units[1].imagination), plain(started.battle.units[1].imagination));
const acting = JSON.parse(JSON.stringify(started.data)), live = acting.cryptLord.teamBattle;
Object.assign(live, { phase: 'action', queue: ['对手', 'player'], index: 0 });
Object.assign(live.units[0], { x: 0, y: 0 });
Object.assign(live.units[1], { x: 1, y: 0 });
const projectedChoice = team.options(acting).find(row => row.cost === 4 && row.targets.includes('player'));
assert.ok(projectedChoice, 'NPC 空想主动技能须进入实际可执行菜单');
const hit = team.action(acting, { id: projectedChoice.id, target: 'player' }, () => .5);
assert.equal(hit.ok, true, hit.error);
assert.equal(hit.battle.units[1].spirit, live.units[1].spirit - 4);
assert.ok(hit.battle.units[0].hp < live.units[0].hp);
assert.deepEqual(plain(hit.battle.units[1].imagination), plain(live.units[1].imagination));
assert.equal(JSON.stringify(hit.data.npc_data), JSON.stringify(acting.npc_data));
assert.equal(team.options(JSON.parse(JSON.stringify(acting))).find(row => row.id === projectedChoice.id).name,
  projectedChoice.name);
for (const name of ['battle-field-effect-reference', 'battle-field-effects'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
modules['cryptLord.battleFieldEffects'].withRuntime(live, acting, () => .5, rt => {
  const hero = rt.heroes.find(row => row.heroId === '对手');
  assert.equal(hero.originalData.当前序列, live.units[1].sequence);
  assert.ok(hero.originalData.能力清单.some(row => (row.名称 || row.name) === projectedChoice.name));
  assert.ok(hero.moveSet.some(row => row.name === projectedChoice.name));
  assert.ok(hero.originalData.能力清单.some(row => (row.名称 || row.name) === '固有能力'));
});
const personal = modules['cryptLord.personalBattleState'].start(session.data, { npcKey: '对手', imaginationPool: pool });
assert.equal(personal.ok, true); assert.ok(personal.battle.enemy.imagination.abilities.length > 3);
const restored = modules['cryptLord.personalBattleState'].get(JSON.parse(JSON.stringify(personal.data)));
assert.deepEqual(plain(restored.enemy.imagination), plain(personal.battle.enemy.imagination));
assert.equal(JSON.stringify(personal.data.npc_data), baseNpc);
for (const name of ['reader-mystic', 'reader-reference', 'reader-roster-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`, import.meta.url), 'utf8'), context);
const integrated = structuredClone(cross);
const reader = modules['cryptLord.readerRosterState'].create(integrated, pool).core;
integrated.stat_data.$专属玩法.阅读者途径 = { 秘术强化: { 秘术栏位: {
  栏位1: { ...reader.defaultConfig(1), 名称: '全知技能' },
  栏位2: { ...reader.defaultConfig(2), 名称: '独立秘术' },
} } };
api.sync(integrated, pool);
assert.equal(integrated.stat_data.序列能力列表['#秘术强化'].length, 1);
assert.equal(integrated.stat_data.序列能力列表['#秘术强化'][0].名称, '独立秘术');
const integratedNames = Object.values(integrated.stat_data.序列能力列表)
  .flatMap(rows => Array.isArray(rows) ? rows.map(row => row.名称 || row.name) : []);
assert.equal(integratedNames.filter(name => name === '全知技能').length, 1);
const stableProjection = JSON.stringify(integrated);
api.sync(integrated, pool); assert.equal(JSON.stringify(integrated), stableProjection);
integrated.stat_data.当前序列 = '序列9-观众'; api.sync(integrated, pool);
assert.equal(integrated.stat_data.序列能力列表['#秘术强化'], undefined);
assert.equal(integrated.stat_data.$专属玩法.阅读者途径.秘术强化.秘术栏位.栏位2.名称, '独立秘术');
assert.equal(modelCalls, 0);
console.log('观众空想：原版规则、完整栏位/特性生命周期、一次交叉授权、个人与团战缓存，4组通过。');
