import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = { 'cryptLord.industryState': {} };
const context = {
  console, Math, Date, structuredClone,
  cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {} } },
  GameDBManager: { DB: { domainConfig: {
    stages: {
      1: { 用工: [10, 20, 30], 金镑: [100, 40, 60], 工期: [10080, 20160, 30240],
        扣货: [{ 1: 10, 2: 1 }, { 1: 8 }, { 2: 3 }] },
      7: { 扣货: { 农产品: [{ 1: 4 }], 服务: [{ 2: 9 }] } },
    },
    fastBuild: { goldMult: 3, durationMin: 1440 },
    buildings: [
      { id: 'field', 主产出: '农产品', 名称: '附田', 配方: [{ '1级农产品': 15 }] },
      { id: 'market', 主产出: '服务', 名称: '市集', 配方: [{ '1级服务': 15 }] },
    ],
  } } },
};
context.window = context;
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/domain-state.js'), 'utf8'),
  context, { filename: 'domain-state.js' });
const rules = modules['cryptLord.domainState'];
const data = { stat_data: { 货币: { 鲁恩王国: { 金镑: 1000 } } } };
const domain = rules.ensureDomain({ 已建立: true, 等级: 1, 人口: 30,
  物资库: { '1级农产品': 50, '2级农产品': 5, '1级服务': 0 } });
data.stat_data.领地 = domain;
const plain = value => JSON.parse(JSON.stringify(value));

assert.deepEqual(plain(rules.goodsCost(1, 0, '农产品')), { '1级农产品': 10, '2级农产品': 1 });
assert.deepEqual(plain(rules.goodsCost(7, 0, '服务')), { '2级服务': 9 });
assert.deepEqual(plain(rules.goodsCost(7, 0, '农产品')), { '1级农产品': 4 });
assert.deepEqual(plain(rules.costOf(domain, domain.格子.格1, 'field', { fast: true }).扣货),
  { '1级农产品': 10, '2级农产品': 1 });
assert.equal(rules.beginConstruction(domain, data, '格1', 'absent', 100).ok, false);

let before = JSON.stringify(data);
data.stat_data.货币.鲁恩王国.金镑 = 99;
assert.match(rules.beginConstruction(domain, data, '格1', 'field', 100).reason, /金镑不足/);
assert.equal(domain.格子.格1.建筑, '');
data.stat_data.货币.鲁恩王国.金镑 = 1000;
assert.equal(rules.beginConstruction(domain, data, '格1', 'market', 100).ok, false);
assert.equal(JSON.stringify(data), before);
assert.equal(rules.beginConstruction(domain, data, '格1', 'field', 100).ok, true);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 900);
assert.equal(domain.物资库['1级农产品'], 40);
assert.equal(domain.格子.格1.完工时刻, 10180);
assert.equal(rules.cancelConstruction(domain, '格1').ok, true);
assert.equal(domain.格子.格1.建筑, '');
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 900);
assert.equal(domain.物资库['1级农产品'], 40);

assert.equal(rules.beginConstruction(domain, data, '格1', 'field', 100, { fast: true }).ok, true);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 600);
assert.equal(domain.格子.格1.完工时刻, 1540);
assert.equal(rules.sweepConstruction(domain, 1539), 0);
assert.equal(rules.sweepConstruction(domain, 1540), 1);
assert.equal(domain.格子.格1.等级, 1);
assert.equal(domain.格子.格1.开工, true);
assert.equal(rules.beginConstruction(domain, data, '格1', 'market', 2000).ok, false);
assert.equal(rules.toggleBuilding(domain, '格1').ok, true);
assert.equal(domain.格子.格1.开工, false);
domain.人口 = 0;
assert.equal(rules.toggleBuilding(domain, '格1').ok, false);
domain.人口 = 30;
assert.equal(rules.toggleBuilding(domain, '格1').ok, true);
assert.equal(rules.assignSteward(domain, '格1', '莎伦').ok, true);
assert.equal(rules.beginConstruction(domain, data, '格1', 'field', 2000).ok, true);
assert.equal(domain.格子.格1.施工动作, '1→2');
assert.equal(rules.demolishBuilding(domain, '格1').ok, false);
assert.equal(rules.sweepConstruction(domain, 22160), 1);
assert.equal(domain.格子.格1.等级, 2);
assert.equal(rules.demolishBuilding(domain, '格1').ok, true);
assert.equal(domain.格子.格1.总管, '');
assert.equal(domain.格子.格1.建筑, '');

assert.equal(rules.coreUpgradeCost(domain).金镑, 80);
before = JSON.stringify(data);
data.stat_data.货币.鲁恩王国.金镑 = 79;
assert.equal(rules.beginCoreUpgrade(domain, data, 500).ok, false);
assert.equal(domain.核心.施工动作, '');
data.stat_data.货币.鲁恩王国.金镑 = 500;
assert.equal(rules.beginCoreUpgrade(domain, data, 500, { fast: true }).ok, true);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 260);
assert.equal(domain.核心.完工时刻, 1940);
assert.equal(rules.cancelCoreUpgrade(domain).ok, true);
assert.equal(data.stat_data.货币.鲁恩王国.金镑, 260);
assert.equal(rules.beginCoreUpgrade(domain, data, 500).ok, true);
assert.equal(rules.sweepCoreConstruction(domain, 20660), 1);
assert.equal(rules.coreLevelOf(domain), 2);
assert.equal(rules.listGuestRoomKeys(domain).length, 3);
assert.equal(domain.$流水.some(row => row.事项.includes('超凡')), true);
console.log('domain-construction: goods, wallet, fast/normal build, cancellation, labor, steward, demolition and core OK');
