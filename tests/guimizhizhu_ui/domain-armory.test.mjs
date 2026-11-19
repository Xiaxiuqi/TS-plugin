import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = { 'cryptLord.industryState': {} };
const context = {
  console, Math, Date, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {} } },
  GameDBManager: { DB: { domainConfig: {
    stages: { 1: { 开局人口: 100 } },
    recruit: {
      goldPerUnit: [10, 25, 50, 100, 200],
      trainMinutes: [1440, 5760, 12960],
      mainTypeHpRatio: .7, maxDeploy: 1,
      troops: [
        { id: 'infantry', 名称: '步兵', 军种: '陆军', 精锐: 1, 生命: 10, 攻击: 2 },
        { id: 'archer', 名称: '弓手', 军种: '陆军', 精锐: 1, 生命: 5, 攻击: 3 },
        { id: 'sailor', 名称: '船员', 军种: '海军', 精锐: 1, 生命: 10, 攻击: 2 },
      ],
    },
  } } },
};
context.window = context;
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/domain-state.js'), 'utf8'),
  context, { filename: 'domain-state.js' });
const rules = modules['cryptLord.domainState'];
const data = { stat_data: {
  货币: { 鲁恩王国: { 金镑: 100 } },
  势力: { 白塔: { 势力名: '白塔', 世俗军队: {
    陆军: { guard: { 部队名: '白塔卫队', 部队数量: 5, 部队精锐等级: '1级' } },
  } } },
} };
const domain = rules.ensureDomain({ 已建立: true, 领地名: '测试领', 等级: 1, 人口: 100 });
data.stat_data.领地 = domain;
assert.equal(rules.recruitGold(1, 3), 30);
assert.equal(rules.recruit(domain, data, 'infantry', 11, 100).ok, false);
assert.equal(rules.recruit(domain, data, 'infantry', 1.5, 100).ok, false);
assert.equal(rules.recruit(domain, data, 'absent', 1, 100).ok, false);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 100);
assert.equal(domain.训练队列.length, 0);
assert.equal(rules.recruit(domain, data, 'infantry', 3, 100).ok, true);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 70);
assert.equal(domain.训练队列[0].完工时刻, 1540);
assert.equal(rules.cancelTraining(domain, 't1'), true);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 70);
assert.equal(rules.recruit(domain, data, 'infantry', 4, 100).ok, true);
assert.equal(rules.sweepTraining(domain, 1540), 1);
assert.equal(rules.looseCount(domain, '陆军', 'infantry', 1), 4);
rules.addLoose(domain, '陆军', 'archer', 1, 1);
const localKey = rules.looseKey(rules.listLocalLoose(domain)[0]);
const faction = rules.listFactionLoose(data, domain)[0];
const factionKey = rules.looseKey(faction);
const before = JSON.stringify(data);
assert.equal(rules.formArmy(domain, '错编', '陆军', 'infantry',
  [{ looseKey: localKey, 数量: 5 }], data).ok, false);
assert.equal(rules.formArmy(domain, '错编', '陆军', 'infantry',
  [{ looseKey: localKey, 数量: 3 }, { looseKey: localKey, 数量: 1 }], data).ok, false);
assert.equal(rules.formArmy(domain, '错编', '海军', 'infantry',
  [{ looseKey: localKey, 数量: 2 }], data).ok, false);
assert.equal(JSON.stringify(data), before);
const formed = rules.formArmy(domain, '守备队', '陆军', 'infantry', [
  { looseKey: localKey, 数量: 3 },
  { looseKey: factionKey, 数量: 2 },
], data);
assert.equal(formed.ok, true);
assert.equal(rules.armyCount(formed.army), 5);
assert.equal(rules.armyShield(formed.army), 0);
assert.equal(rules.armyQuality(formed.army).射程, 1);
assert.equal(data.stat_data.势力.白塔.世俗军队.陆军.guard.部队数量, 3);
assert.equal(rules.looseCount(domain, '陆军', 'infantry', 1), 1);
assert.equal(rules.canDeploy(domain, formed.army, '海战').ok, false);
assert.equal(rules.toggleDeploy(domain, formed.army.id, '海战').ok, false);
assert.equal(rules.toggleDeploy(domain, formed.army.id, '陆战').ok, true);
assert.equal(rules.toggleDeploy(domain, formed.army.id, '陆战').ok, true);
assert.equal(rules.toggleDeploy(domain, formed.army.id, '陆战').ok, true);
domain.归零精锐 = [1];
assert.equal(rules.canDeploy(domain, formed.army, '陆战').ok, false);
domain.归零精锐 = [];
assert.equal(rules.disbandArmy(domain, formed.army.id, data), true);
assert.equal(data.stat_data.势力.白塔.世俗军队.陆军.guard.部队数量, 5);
assert.equal(rules.looseCount(domain, '陆军', 'infantry', 1), 4);
assert.equal(domain.出战名单.length, 0);
assert.equal(rules.dischargeLoose(domain, data, factionKey, 6).ok, false);
assert.equal(rules.dischargeLoose(domain, data, factionKey, 2).ok, true);
assert.equal(data.stat_data.势力.白塔.世俗军队.陆军.guard.部队数量, 3);
assert.equal(rules.dischargeLoose(domain, data, localKey, 1).ok, true);
assert.equal(rules.looseCount(domain, '陆军', 'infantry', 1), 3);
const last = rules.formArmy(domain, '巡逻队', '陆军', 'infantry', [
  { looseKey: localKey, 数量: 2 },
], data);
assert.equal(last.ok, true);
assert.equal(rules.toggleDeploy(domain, last.army.id, '陆战').ok, true);
assert.equal(rules.dischargeArmy(domain, last.army.id), true);
assert.equal(domain.出战名单.length, 0);
assert.equal(rules.looseCount(domain, '陆军', 'infantry', 1), 1);
assert.equal(domain.$流水.some(row => row.事项.includes('出饷')), true);
console.log('domain-armory: wallet, training, faction transfer, formation, deployment, shortage, disband and discharge OK');
