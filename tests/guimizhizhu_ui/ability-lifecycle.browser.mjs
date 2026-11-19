import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/ability-lifecycle.preview.html');
    await page.waitForFunction(() => window.previewReady);
    const panel = page.getByRole('dialog', { name: '序列能力' }), status = panel.getByRole('status');
    const waitStatus = text => status.filter({ hasText: text }).waitFor();
    const protectedFloors = await page.evaluate(() => JSON.stringify(preview.floors.slice(0, 2)));
    await page.locator('#open').click(); await waitStatus('#2 ·');
    assert.equal(await page.evaluate(() => preview.writes.length), 0);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.locator('#promote').click(); await waitStatus('#2 ·');
    assert.match(await panel.innerText(), /身体控制/);
    assert.equal(await page.evaluate(() => preview.writes.length), 1);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.当前活力), 200);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await panel.getByRole('button', { name: '删除 身体控制', exact: true }).click(); await waitStatus('能力已删除');
    await page.evaluate(() => preview.modules['cryptLord.stateStore'].writeAssistantData(2, preview.floors[2].data));
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.序列能力列表['序列8-小丑']), undefined);
    await panel.getByRole('button', { name: '重新读取' }).click(); await waitStatus('#2 ·');
    await panel.getByRole('button', { name: '世界书同步', exact: true }).click(); await waitStatus('同步完成');
    assert.match(await panel.innerText(), /身体控制/);
    const name = panel.getByRole('textbox', { name: '能力名称', exact: true });
    await name.fill('生成期间保留草稿');
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'quiet'));
    assert.equal(await name.inputValue(), '生成期间保留草稿');
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal')); await waitStatus('正在生成');
    assert.equal(await name.inputValue(), '生成期间保留草稿'); assert.equal(await name.isEnabled(), false);
    await page.evaluate(() => preview.emit('GENERATION_ENDED'));
    await panel.getByRole('button', { name: '重新读取' }).click(); await waitStatus('#2 ·');
    const count = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => {
      preview.dynamicHook = async () => { preview.page++; };
    });
    await name.fill('分支变化拒绝保存');
    await panel.getByRole('button', { name: '添加能力', exact: true }).click(); await waitStatus('已变化');
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    assert.equal(await name.inputValue(), '分支变化拒绝保存');
    await page.evaluate(() => { preview.dynamicHook = null; });
    await panel.getByRole('button', { name: '重新读取' }).click(); await waitStatus('#2 ·');
    await page.evaluate(() => { preview.failWrite = true; });
    await name.fill('保存失败可重试');
    await panel.getByRole('button', { name: '添加能力', exact: true }).click(); await waitStatus('保存失败');
    assert.equal(await name.inputValue(), '保存失败可重试');
    await page.evaluate(() => { preview.failWrite = false; });
    await panel.getByRole('button', { name: '添加能力', exact: true }).click(); await waitStatus('能力已添加');
    await page.evaluate(() => {
      preview.failBook = true;
    });
    await panel.getByRole('button', { name: '世界书同步', exact: true }).click(); await waitStatus('读取失败');
    await page.evaluate(() => { preview.failBook = false; });
    const priorClose = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => {
      const gate = new Promise(resolve => { window.releaseAbilityBook = resolve; });
      preview.bookHook = async () => { window.waitingAbilityBook = true; await gate; };
    });
    await panel.getByRole('button', { name: '世界书同步', exact: true }).click();
    await page.waitForFunction(() => window.waitingAbilityBook);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => { preview.bookHook = null; window.releaseAbilityBook(); });
    await page.locator('#open').click(); await waitStatus('#2 ·');
    assert.equal(await page.evaluate(() => preview.writes.length), priorClose);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    // The new skill must execute in the real common battle engine, not just appear in a list.
    const result = await page.evaluate(async () => {
      const m = preview.modules, source = preview.floors[2].data;
      const started = await m['cryptLord.battleSession'].prepare(source, { personal: true, npcKey: '对手', seed: 19 });
      if (!started.ok) throw Error(started.error);
      await m['cryptLord.stateStore'].writeAssistantData(2, started.data, 'affected', undefined, undefined,
        { abilityPrepared: started.abilityPrepared, rulePool: started.rulePool });
      const engine = m['cryptLord.teamBattleState'];
      const skill = engine.options(preview.floors[2].data).find(row => row.name === '身体控制');
      const action = engine.action(preview.floors[2].data, { id: skill.id, target: '对手' });
      if (!action.ok) throw Error(action.error);
      await m['cryptLord.stateStore'].writeAssistantData(2, action.data);
      const finished = preview.floors[2].data.cryptLord.teamBattle;
      const report = engine.report(preview.floors[2].data);
      const settled = engine.settle(preview.floors[2].data, finished.id, true);
      if (!settled.ok) throw Error(settled.error);
      await m['cryptLord.stateStore'].writeAssistantData(2, settled.data);
      return { status: finished.status, settled: preview.floors[2].data.cryptLord.teamBattle.settled,
        report: report.story, calls: preview.calls.length };
    });
    assert.equal(result.status, 'finished'); assert.equal(result.settled, true); assert.equal(result.calls, 1);
    await page.locator('#open').click(); await waitStatus('#2 ·');
    await name.fill('<img src=x onerror="window.unsafe=true">' + '长名称'.repeat(30));
    await panel.getByRole('textbox', { name: '能力描述', exact: true }).fill('长说明'.repeat(140));
    await panel.getByRole('button', { name: '添加能力', exact: true }).click(); await waitStatus('能力已添加');
    assert.equal(await page.evaluate(() => window.unsafe), undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await panel.locator('main').evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留原生输入草稿');
    assert.equal(await page.evaluate(() => JSON.stringify(preview.floors.slice(0, 2))), protectedFloors);
    assert.equal(await page.evaluate(() => preview.floors[2].data.otherPlugin.keep), true);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(async () => {
      const m = preview.modules;
      const row = { 活力: 600, 敏捷: 240, 灵性: 320, 理智: 200, 人性: 100, 运气: 50 };
      preview.books.主书.push({ name: '【配置】消耗品配置',
        content: JSON.stringify({ avgAttrByRank: { 5: row, 6: row, 9: row, 10: row } }) });
      const data = structuredClone(preview.floors[2].data);
      data.stat_data = preview.card('序列5-秘术导师'); data.cryptLord = {};
      await m['cryptLord.stateStore'].writeAssistantData(2, data);
      await m['cryptLord.readerMysticUi'].open();
    });
    const reader = page.locator('.crypt-lord-reader');
    const idleReader = () => page.waitForFunction(() =>
      document.querySelector('.crypt-lord-reader')?.getAttribute('aria-busy') === 'false');
    const mysticName = reader.locator('[data-mystic-slot="1"] [data-rm-field="name"]');
    const saveMystic = reader.locator('[data-ppw="save-mystic"][data-arg="1"]');
    const openMystic = async () => {
      const summary = reader.locator('[data-mystic-slot="1"]:not([open]) > summary');
      if (await summary.count()) await summary.click();
    };
    await idleReader(); await mysticName.fill('规则驱动秘术'); await saveMystic.click(); await idleReader();
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.序列能力列表['#秘术强化'][0].power), 120);
    const beforeConflict = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => {
      const entry = preview.books.主书.find(row => row.name === '【配置】消耗品配置');
      const config = JSON.parse(entry.content); config.avgAttrByRank['5'].活力 = 1200;
      entry.content = JSON.stringify(config);
    });
    await openMystic(); await mysticName.fill('旧配置不能提交'); await saveMystic.click(); await idleReader();
    assert.match(await reader.locator('footer').innerText(), /已变化/);
    assert.equal(await page.evaluate(() => preview.writes.length), beforeConflict);
    await reader.getByRole('button', { name: '重新读取', exact: true }).click(); await idleReader();
    await openMystic(); await mysticName.fill('新规则秘术'); await saveMystic.click(); await idleReader();
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.序列能力列表['#秘术强化'][0].power), 240);
    await openMystic(); await page.screenshot({ path: path.join(os.tmpdir(), `consumable-rules-reader-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await reader.getByRole('button', { name: '关闭秘术管理', exact: true }).click();
    const rulesFlow = await page.evaluate(async () => {
      const m = preview.modules, source = structuredClone(preview.floors[2].data);
      source.stat_data = { ...preview.card('序列6-卷轴教授'),
        其他列表: { 粉末: { 类型: '灵性材料', 序列: '序列6', 数量: 2 } } };
      Object.assign(source.npc_data.对手, { 活力: 10000, 当前活力: 10000 });
      preview.pool.pathways.窥秘人途径.push('序列6-卷轴教授');
      preview.books.主书.find(row => row.name.startsWith('[神之途径]')).content = JSON.stringify(preview.pool.pathways);
      const rules = await m['cryptLord.abilityState'].loadPool();
      const workshop = m['cryptLord.scrollWorkshopState'].create(source, rules, {
        confirmSync: () => true, roll: () => 1,
      });
      workshop.state.draft = { name: '整链规则卷轴', rank: 6, description: '',
        baseEffect: '物理攻击', scope: '单体', extraEffect: '', enhancements: {} };
      await workshop.action('scroll-save');
      const template = workshop.mode.templates(workshop.win)[0];
      Object.assign(workshop.state, { materialKey: '粉末', materialQty: 1, allocations: { [template.id]: 1 } });
      await workshop.action('scroll-craft');
      const [key] = Object.entries(workshop.data.stat_data.消耗品列表).find(([, row]) => row.$卷轴制造);
      await m['cryptLord.stateStore'].writeAssistantData(2, workshop.data, 'affected', undefined, undefined, { rulePool: rules });
      const started = await m['cryptLord.battleSession'].prepare(preview.floors[2].data, {
        personal: true, npcKey: '对手', seed: 13,
      });
      if (!started.ok) throw Error(started.error);
      started.data.cryptLord.teamBattle.units.forEach((unit, index) => Object.assign(unit, { x: index + 1, y: 1 }));
      await m['cryptLord.stateStore'].writeAssistantData(2, started.data, 'affected', undefined, undefined,
        { abilityPrepared: started.abilityPrepared, rulePool: started.rulePool });
      const engine = m['cryptLord.teamBattleState'];
      const choice = engine.options(preview.floors[2].data).find(row => row.id === `scroll:${key}`);
      const entry = preview.books.主书.find(row => row.name === '【配置】消耗品配置');
      entry.content = '{"avgAttrByRank":{}}';
      const restored = JSON.parse(JSON.stringify(preview.floors[2].data));
      const stable = engine.options(restored).find(row => row.id === choice.id);
      const cast = engine.action(restored, { id: choice.id, target: '对手' });
      if (!cast.ok) throw Error(cast.error);
      await m['cryptLord.stateStore'].writeAssistantData(2, cast.data);
      let closing = engine.advanceAuto(preview.floors[2].data);
      if (!closing.ok) throw Error(closing.error);
      closing = engine.end(closing.data, closing.data.cryptLord.teamBattle.id);
      if (!closing.ok) throw Error(closing.error);
      const final = engine.settle(closing.data, closing.data.cryptLord.teamBattle.id, false);
      if (!final.ok) throw Error(final.error);
      await m['cryptLord.stateStore'].writeAssistantData(2, final.data);
      return { power: stable.power, cost: stable.cost, material: preview.floors[2].data.stat_data.其他列表.粉末.数量,
        settled: preview.floors[2].data.cryptLord.teamBattle.settled };
    });
    assert.deepEqual(rulesFlow, { power: 120, cost: 4, material: 1, settled: true });
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留原生输入草稿');
    assert.equal(await page.evaluate(() => JSON.stringify(preview.floors.slice(0, 2))), protectedFloors);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('能力与消耗品规则→秘术窗口→卷轴制造→开战快照→行动结算整链桌面/手机流程通过，真实宿主零操作。');
} finally {
  await browser.close();
}
