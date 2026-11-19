import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = {};
let settings = { useCustomApi: false };
let response = '<裁定>通过|已从目标掌握途径能力</裁定>';
let request;
const context = {
  console, structuredClone, Math, Date,
  cryptLord: { contract: {
    initializeGlobal() {}, releaseGlobal() {},
    async waitGlobalInitialized(key) {
      if (key === 'cryptLord.variableSettlementApi') return { readSettings: async () => settings };
      if (key === 'cryptLord.hostApi') return { generateRaw: async config => {
        request = config;
        return response;
      } };
      throw Error(key);
    },
  }, __stage1Modules: modules },
};
context.window = context;
for (const filename of ['audience-imagination.js', 'reader-mystic.js', 'grazing-state.js',
  'battle-experience.js', 'personal-battle-state.js']) {
  vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core', filename), 'utf8'),
    context, { filename });
}
const reader = modules['cryptLord.readerMystic'];
const imagination = modules['cryptLord.audienceImagination'];
const grazing = modules['cryptLord.grazingState'];
const battle = modules['cryptLord.personalBattleState'];
const pool = {
  pathways: {
    阅读者途径: ['序列9-阅读者', '序列5-秘术导师', '序列3-洞悉者', '序列1-全知之眼'],
    占卜家途径: ['序列9-占卜家', '序列5-秘偶大师', '序列3-古代学者'],
    观众途径: ['序列9-观众', '序列5-梦境行者', '序列3-织梦人', '序列1-作家'],
    秘祈人途径: ['序列9-秘祈人', '序列5-牧羊人'],
  }, abilities: {},
};
const initial = () => ({
  stat_data: {
    名称: '阿黛尔', 当前序列: '序列5-秘术导师',
    活力: 5000, 当前活力: 5000, 敏捷: 2000, 当前敏捷: 2000,
    灵性: 5000, 当前灵性: 5000, 理智: 5000, 当前理智: 5000,
    人性: 5000, 当前人性: 5000, 运气: 20,
    人物关系列表: { 甲: { 好感度: 81, 关系: '朋友' },
      乙: { 好感度: 80 }, 丙: { 好感度: 99 }, '$meta': {} },
    序列能力列表: {},
  },
  npc_data: {
    甲: { 当前序列: '序列5-秘偶大师', 能力清单: [{ 名称: '灵体之线' }] },
    乙: { 当前序列: '序列3-织梦人' },
    丙: { 当前序列: '序列9-阅读者' },
    对手: { 当前序列: '序列5-秘偶大师', 活力: 8000, 当前活力: 8000, 敏捷: 1 },
  },
});
const data = initial();
assert.equal(reader.gate(data, pool).points, 6);
assert.equal(reader.gate(data, pool).slots, 1);
assert.equal(reader.gate(data, pool).learningSlots, 4);
assert.equal(reader.candidates(data, pool, 1).length, 1);
assert.equal(reader.candidates(data, pool, 1)[0].目标, '甲');
assert.throws(() => reader.start(data, pool, 1, { 目标: '乙' }), /资料不完整|人物关系/);
const target = reader.candidates(data, pool, 1)[0];
const pending = reader.start(data, pool, 1, target);
assert.equal(data.stat_data.$专属玩法, undefined);
assert.equal(reader.entries(pending)[1].进行中.目标, '甲');
const { target: fresh, verdict } = await reader.certify(pending, pool, 1, '#2 assistant 已掌握灵体之线');
assert.equal(verdict.ok, true);
assert.equal(request.custom_api, undefined);
assert.match(request.ordered_prompts.at(-1).content, /已掌握灵体之线/);
const recognized = reader.adjudicate(pending, pool, 1, fresh, verdict);
assert.equal(reader.gate(recognized, pool).points, 7);
assert.equal(reader.entries(recognized)[1].已认定.奖励点数, 1);
assert.equal(reader.entries(recognized)[1].进行中, null);
assert.throws(() => reader.start(recognized, pool, 1, target), /严格高于/);
assert.throws(() => reader.start(recognized, pool, 2, target), /占用/);
const weaker = structuredClone(recognized);
weaker.stat_data.当前序列 = '序列9-阅读者';
assert.equal(reader.gate(weaker, pool).points, 0);
assert.equal(reader.entries(weaker)[1].已认定.目标, '甲');
const promoted = structuredClone(recognized);
promoted.stat_data.当前序列 = '序列3-洞悉者';
promoted.npc_data.甲.当前序列 = '序列3-古代学者';
const upgradedTarget = reader.candidates(promoted, pool, 1)[0];
assert.equal(upgradedTarget.序列等级, 3);
const upgraded = reader.start(promoted, pool, 1, upgradedTarget);
assert.equal(reader.entries(upgraded)[1].已认定.奖励点数, 1);
assert.equal(reader.entries(upgraded)[1].进行中.序列等级, 3);
const cancelled = reader.cancel(upgraded, 1);
assert.equal(reader.entries(cancelled)[1].进行中, null);
assert.equal(reader.entries(cancelled)[1].已认定.奖励点数, 1);
const retry = reader.start(promoted, pool, 1, upgradedTarget);
settings = { useCustomApi: true, apiUrl: 'https://example.invalid', apiKey: 'secret', model: 'secondary' };
response = '<裁定>不通过|尚未成功掌握</裁定>';
const rejected = await reader.certify(retry, pool, 1, '只是观看');
assert.equal(request.custom_api.model, 'secondary');
const failed = reader.adjudicate(retry, pool, 1, rejected.target, rejected.verdict);
assert.equal(reader.entries(failed)[1].已认定.奖励点数, 1);
assert.equal(reader.entries(failed)[1].进行中.上次失败原因, '尚未成功掌握');
assert.throws(() => reader.parseVerdict('<裁定>通过|a\n不通过|b</裁定>'), /格式/);
assert.throws(() => reader.parseVerdict('<裁定>通过|</裁定>'), /格式/);
response = '<裁定>通过|a\n不通过|b</裁定>';
const malformed = await reader.certify(failed, pool, 1, '证据');
assert.equal(malformed.verdict.ok, false);
assert.match(reader.adjudicate(failed, pool, 1, malformed.target, malformed.verdict)
  .stat_data.$专属玩法.阅读者途径.秘术强化.解析和学习.目标栏位.栏位1.进行中.上次失败原因, /格式/);
assert.equal(reader.gate(failed, pool).points, 11);

const cfg = reader.defaultConfig(1);
assert.equal(reader.points(cfg, 1), 0);
cfg.名称 = '幽蓝秘术';
cfg.强度档 = 4;
assert.throws(() => reader.save(data, pool, 1, cfg), /额度/);
cfg.强度档 = 0;
cfg.消耗档 = 3;
const saved = reader.save(data, pool, 1, cfg);
assert.equal(reader.points(cfg, 1), 6);
assert.equal(saved.stat_data.序列能力列表['#秘术强化'][0].cost.amount, 0);
assert.equal(saved.stat_data.序列能力列表['#秘术强化'][0].power, 222);
assert.throws(() => reader.save(saved, pool, 2, cfg), /不可用/);
const noProjection = structuredClone(saved);
noProjection.stat_data.当前序列 = '序列9-阅读者';
reader.sync(noProjection, pool);
assert.equal(noProjection.stat_data.序列能力列表['#秘术强化'], undefined);
assert.equal(reader.configs(noProjection)[1].名称, '幽蓝秘术');
const removed = reader.remove(saved, pool, 1);
assert.equal(reader.configs(removed)[1], undefined);
assert.equal(removed.stat_data.序列能力列表['#秘术强化'], undefined);
const legacyDuplicate = structuredClone(saved);
legacyDuplicate.stat_data.当前序列 = '序列3-洞悉者';
legacyDuplicate.stat_data.$专属玩法.阅读者途径.秘术强化.秘术栏位.栏位2 = structuredClone(cfg);
reader.sync(legacyDuplicate, pool);
assert.equal(legacyDuplicate.stat_data.序列能力列表['#秘术强化'].length, 1);

const heal = reader.defaultConfig(1);
heal.名称 = '灵性愈合';
heal.流派 = 'heal';
heal.治疗属性 = '灵性';
heal.消耗属性 = '理智';
heal.状态效果[0] = { 类型: 'regen', 资源属性: '灵性', 目标: 'self', 持续: 2, 强度档: 0 };
const healer = reader.save(data, pool, 1, heal);
const ability = healer.stat_data.序列能力列表['#秘术强化'][0];
assert.equal(ability.cost.type, 'currentSanity');
assert.equal(ability.cost.amount, 126);
assert.equal(ability.healAmt, 387);
assert.equal(ability.effects[0].stat, '当前灵性');
healer.stat_data.当前灵性 = 4000;
const started = battle.start(healer, { npcKey: '对手', imaginationPool: pool });
assert.equal(started.ok, true);
const acted = battle.act(started.data, { type: 'ability', group: '#秘术强化', index: 0 });
assert.equal(acted.ok, true, acted.error);
assert.equal(acted.data.stat_data.当前理智, 4874);
assert.ok(acted.data.stat_data.当前灵性 > 4000);
assert.ok(acted.battle.player.effects.some(row => row.stat === '当前灵性'));
assert.equal(reader.build({ ...heal, 施法中心: 'self', 目标模式: 'group', 射程: 'global' }, 1, 5).range, 0);
const damage = reader.build({ ...cfg, 消耗档: 0, 消耗属性: '活力', 射程: 'global' }, 1, 5);
assert.equal(damage.cost.type, 'currentVitality');
assert.equal(damage.range, 'global');
const speed = reader.defaultConfig(1);
speed.名称 = '迅疾秘术';
speed.流派 = 'heal';
speed.施法中心 = 'self';
speed.状态效果[0] = { 类型: 'buff', 属性: 'speed', 目标: 'self', 持续: 1, 强度档: 2 };
const swift = reader.save(data, pool, 1, speed);
swift.stat_data.敏捷 = 10;
swift.stat_data.当前敏捷 = 10;
const swiftBattle = battle.start(swift, { npcKey: '对手', imaginationPool: pool });
const moved = battle.act(swiftBattle.data, { type: 'ability', group: '#秘术强化', index: 0 });
assert.equal(moved.ok, true, moved.error);
assert.ok(moved.battle.player.effects.some(row => row.stat === 'speed'));
assert.ok(moved.battle.player.moveMax > swiftBattle.battle.player.moveMax);
const drain = reader.defaultConfig(1);
drain.名称 = '枯竭秘术';
drain.流派 = 'heal';
drain.施法中心 = 'self';
drain.状态效果[0] = { 类型: 'poison', 资源属性: '敏捷', 目标: 'self', 持续: 2, 强度档: 0 };
const drained = reader.save(data, pool, 1, drain);
const drainBattle = battle.start(drained, { npcKey: '对手', imaginationPool: pool });
const drainedTurn = battle.act(drainBattle.data, { type: 'ability', group: '#秘术强化', index: 0 });
assert.equal(drainedTurn.ok, true, drainedTurn.error);
assert.ok(drainedTurn.data.stat_data.当前敏捷 < 2000);
const spectator = initial();
spectator.stat_data.当前序列 = '序列1-作家';
const imagined = imagination.save(spectator, pool, ['阅读者途径', '']);
assert.equal(reader.gate(imagined, pool).unlocked, true);
const imaginedSpell = reader.save(imagined, pool, 1, reader.defaultConfig(1));
assert.ok(imaginedSpell.stat_data.序列能力列表['#秘术强化']);
const unimagined = imagination.save(imaginedSpell, pool, ['', '']);
assert.equal(unimagined.stat_data.序列能力列表['#秘术强化'], undefined);
const shepherd = initial();
shepherd.stat_data.当前序列 = '序列5-牧羊人';
shepherd.stat_data.$专属玩法 = { 秘祈人途径: { 放牧玩法: {
  灵魂列表: { 阅读者灵魂: { 当前序列: '序列5-秘术导师' } },
  激活灵魂: ['阅读者灵魂'], 休眠灵魂: [],
} } };
const grazingSpell = reader.save(shepherd, pool, 1, reader.defaultConfig(1));
assert.ok(grazingSpell.stat_data.序列能力列表['#秘术强化']);
const rested = grazing.save(grazingSpell, pool, []);
assert.equal(rested.stat_data.序列能力列表['#秘术强化'], undefined);
console.log('reader-mystic: learning, points, projection, typed costs, healing and battle effects OK');
