import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modules = { 'cryptLord.industryState': {} };
const buildings = [
  { id: 'farm-2', 主产出: '农产品' },
  { id: 'forge-2', 主产出: '工业品' },
  { id: 'shop-2', 主产出: '服务' },
];
const context = {
  console, Math, Date, structuredClone,
  cryptLord: {
    __stage1Modules: modules,
    contract: { initializeGlobal() {}, releaseGlobal() {} },
  },
  GameDBManager: { DB: { domainConfig: {
    stages: {
      1: { 周产: [10, 20, 30], 用工: [1, 2, 3], 开局人口: 100 },
      2: { 周产: [20, 40, 60], 用工: [2, 3, 4], 开局人口: 240 },
    },
    core: { 乡村: { 1: '旧庄园', 2: '新庄园' } },
    buildingsByStage: {
      1: { 乡村: [{ id: 'farm-1', 主产出: '农产品' }] },
      2: { 乡村: buildings },
    },
  } } },
  DOMAIN_PEER_ROSTER: {
    1: [{ id: 'old-peer', 名称: '旧邻境' }],
    2: [{ id: 'new-peer', 名称: '新邻境' }],
  },
};
context.window = context;
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/domain-state.js'), 'utf8'),
  context, { filename: 'domain-state.js' });
const rules = modules['cryptLord.domainState'];
const fresh = () => rules.ensureDomain({
  已建立: true, 领地名: '测试庄园', 线路: '乡村', 等级: 1, 人口: 700,
  物资库: { '1级农产品': 31 },
  核心: { 等级: 3, 房间: { 房1: { 名称: '贵宾室', 住客: '奥黛丽', 常住: true } } },
  格子: { 格1: { 建筑: 'farm-1', 等级: 3, 开工: true, 总管: '管家' } },
  驻军: { 散兵: [{ 军种: '陆军', 兵种: '步兵', 数量: 3 }], 军队: [] },
});
const incomplete = fresh();
assert.equal(rules.canPromote(incomplete), false);
assert.equal(rules.promote(incomplete, ['farm-2', 'forge-2', 'shop-2']).ok, false);
const domain = fresh();
domain.同级对手[0].状态 = '已吞并';
assert.equal(rules.canPromote(domain), true);
assert.equal(rules.promoteGiftCount(domain), 3);
context.DOMAIN_PEER_ROSTER[2] = [];
assert.equal(rules.canPromote(domain), false);
context.DOMAIN_PEER_ROSTER[2] = [{ id: 'new-peer', 名称: '新邻境' }];
const unchanged = JSON.stringify(domain);
for (const ids of [
  ['farm-2'], ['farm-1', 'forge-2', 'shop-2'],
  ['farm-2', 'farm-2', 'shop-2'],
]) assert.equal(rules.promote(domain, ids).ok, false);
assert.equal(JSON.stringify(domain), unchanged);
const result = rules.promote(domain, ['farm-2', 'forge-2', 'shop-2']);
assert.equal(result.ok, true);
assert.equal(result.giftCount, 3);
assert.equal(domain.等级, 2);
assert.equal(domain.人口, 240);
assert.equal(domain.核心.名称, '新庄园');
assert.equal(domain.核心.等级, 1);
assert.equal(domain.核心.房间.房1.住客, '奥黛丽');
assert.ok(domain.核心.房间.房4);
assert.equal(domain.物资库['1级农产品'], 31);
assert.equal(domain.驻军.散兵[0].数量, 3);
assert.equal(domain.格子.格1.总管, '');
assert.equal(domain.格子.格4.建筑, '');
assert.deepEqual(Array.from({ length: 3 }, (_, index) => domain.格子[`格${index + 1}`].建筑),
  ['farm-2', 'forge-2', 'shop-2']);
assert.equal(domain.同级对手[0].id, 'new-peer');
assert.equal(domain.同级对手[0].状态, '存续');
assert.equal(rules.promote(domain, ['farm-2', 'forge-2', 'shop-2']).ok, false);
const data = { stat_data: { 领地: domain, 势力: { $meta: { extensible: true } } } };
assert.equal(rules.syncProjection(data), true);
assert.equal(data.stat_data.势力.测试庄园.人口数量, 240);

const eight = fresh();
eight.同级对手[0].状态 = '已吞并';
for (let index = 1; index <= 8; index += 1) eight.格子[`格${index}`].等级 = 3;
assert.equal(rules.promoteGiftCount(eight), 8);
assert.equal(rules.promote(eight, [
  'farm-2', 'forge-2', 'shop-2', 'farm-2', 'forge-2', 'shop-2', 'farm-2', 'forge-2',
]).giftCount, 8);
assert.equal(eight.格子.格8.建筑, 'forge-2');
console.log('domain-promotion: eligibility, gifts, validation, preserved data, peers and projection OK');
