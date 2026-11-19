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
};
context.window = context;
vm.runInNewContext(await readFile(path.join(base, 'public/guimizhizhu_ui/core/domain-state.js'), 'utf8'),
  context, { filename: 'domain-state.js' });
const rules = modules['cryptLord.domainState'];
const domain = rules.ensureDomain({ 已建立: true, 等级: 1, 人口: 100, 核心: { 名称: '主宅', 等级: 1 } });
const data = { stat_data: { 领地: domain, 人物关系列表: {
  莎伦: { 好感度: 195 }, 奥黛丽: { 好感度: -199 }, 无档案: { 好感度: 10 }, $meta: { extensible: true },
} }, npc_data: { 莎伦: {}, 奥黛丽: {} } };
const rooms = rules.roomsOf(domain);
assert.deepEqual(Array.from(rules.listGuestRoomKeys(domain)), ['房1', '房2']);
assert.equal(rooms.房0.常住, true);
assert.equal(rules.assignRoom(domain, '房0', '莎伦', data.stat_data.人物关系列表).ok, false);
assert.equal(rules.clearRoom(domain, '房0').ok, false);
assert.equal(rules.assignRoom(domain, '房1', '$meta', data.stat_data.人物关系列表).ok, false);
assert.equal(rules.assignRoom(domain, '房1', '未知', data.stat_data.人物关系列表).ok, false);
assert.equal(rules.renameRoom(domain, '房0', '  观星室  ').ok, true);
assert.equal(rooms.房0.名称, '观星室');
assert.equal(rules.renameRoom(domain, '房1', '  ').ok, false);
assert.equal(rules.assignRoom(domain, '房1', '莎伦', data.stat_data.人物关系列表).ok, true);
assert.equal(rules.assignRoom(domain, '房2', '莎伦', data.stat_data.人物关系列表).ok, false);
assert.equal(rules.assignRoom(domain, '房2', '奥黛丽', data.stat_data.人物关系列表).ok, true);
assert.equal(rules.findRoomByGuest(domain, '莎伦'), '房1');
assert.equal(rules.toggleRoomResident(domain, '房2').常住, false);
assert.match(rules.buildCoreHousingOverview(domain), /「观星室」：<User>/);
assert.match(rules.buildCoreHousingOverview(domain), /奥黛丽，不常住/);
assert.equal(rules.tickCoreHousingAffinity(domain, data, 2), 2);
assert.equal(data.stat_data.人物关系列表.莎伦.好感度, 200);
assert.equal(data.stat_data.人物关系列表.奥黛丽.好感度, -189);
assert.equal(rules.clearRoom(domain, '房1').ok, true);
assert.equal(rules.toggleRoomResident(domain, '房1').ok, false);
assert.equal(rules.assignRoom(domain, '房1', '无档案', data.stat_data.人物关系列表).ok, true);
assert.equal(rules.tickCoreHousingAffinity(domain, data, 1), 1);
assert.equal(data.stat_data.人物关系列表.无档案.好感度, 10);
assert.equal(data.stat_data.人物关系列表.奥黛丽.好感度, -184);
assert.equal(rules.weeklySettle(data, 1).housed, 1);
assert.equal(data.stat_data.人物关系列表.奥黛丽.好感度, -179);
assert.equal(rules.weeklySettle(data, 1).housed, 1);
assert.equal(data.stat_data.人物关系列表.奥黛丽.好感度, -174);
domain.核心.等级 = 2;
rules.ensureRooms(domain);
assert.deepEqual(Array.from(rules.listGuestRoomKeys(domain)), ['房1', '房2', '房3']);
assert.equal(rooms.房2.住客, '奥黛丽');
domain.核心.等级 = 1;
rules.ensureRooms(domain);
assert.equal(rooms.房3.名称, '房3');
assert.equal(rules.buildCoreHousingOverview(domain).includes('房3'), true);
console.log('domain-housing: lord room, reservations, duplicates, short stay, affinity and expansion OK');
