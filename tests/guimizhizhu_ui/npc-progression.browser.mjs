import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(10000);
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/npc-progression.preview.html');
    const panel = page.getByRole('dialog', { name: 'NPC成长与初始化', exact: true });
    const notice = text => panel.getByRole('status').filter({ hasText: text }).waitFor();
    const idle = () => page.waitForFunction(() => !preview.api.status().busy &&
      document.querySelector('.crypt-lord-npc-growth').dataset.open === 'true');
    const reload = async () => { await panel.getByRole('button', { name: '重新读取', exact: true }).click(); await idle(); };
    const repair = async () => {
      await panel.getByRole('button', { name: '修正本楼层NPC', exact: true }).click(); await notice('确认修正');
      await panel.getByRole('button', { name: '确认保存整楼NPC修正', exact: true }).click(); await idle();
    };
    const count = () => page.evaluate(() => preview.flags.writes.length);
    const layout = async () => assert.equal(await panel.evaluate(node => node.scrollWidth <= node.clientWidth &&
      node.querySelector('main').scrollWidth <= node.querySelector('main').clientWidth &&
      node.getBoundingClientRect().right <= innerWidth && node.getBoundingClientRect().bottom <= innerHeight), true);
    await page.locator('#open').click(); await idle();
    await notice('3名NPC'); assert.match(await panel.textContent(), /首次初始化/);
    assert.equal(await page.evaluate(() => preview.untouched), true);
    const initialAbilities = await panel.locator('main article').allTextContents(); await reload();
    assert.deepEqual(await panel.locator('main article').allTextContents(), initialAbilities);
    await layout(); await page.screenshot({ path: path.join(os.tmpdir(), `npc-growth-first-${width}.png`) });
    await panel.getByRole('combobox', { name: 'NPC角色', exact: true }).selectOption('自主造物');
    assert.match(await panel.textContent(), /工程基准 × 1.04/); assert.match(await panel.textContent(), /冲击钻/);
    await panel.getByRole('combobox', { name: 'NPC楼层', exact: true }).selectOption('0'); await idle(); await notice('开场楼层只读');
    assert.equal(await panel.getByRole('button', { name: '修正本楼层NPC', exact: true }).isDisabled(), true);
    await panel.getByRole('combobox', { name: 'NPC楼层', exact: true }).selectOption('2'); await idle();
    await panel.getByRole('button', { name: '修正本楼层NPC', exact: true }).click(); await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false); assert.equal(await count(), 0);
    await page.locator('#open').click(); await idle();
    await page.evaluate(() => { preview.flags.failWrite = true; }); await repair(); await notice('保存失败');
    assert.equal(await count(), 0); await page.evaluate(() => { preview.flags.failWrite = false; }); await reload(); await repair();
    await notice('整楼NPC修正已保存'); assert.equal(await count(), 1);
    const initialized = await page.evaluate(() => preview.floors[2].data);
    assert.equal(initialized.npc_data.克莱恩.initialized, true); assert.equal(initialized.npc_data.克莱恩.$战斗经验等级, 2);
    assert.equal(initialized.npc_data.伦纳德.当前活力, 30); assert.equal(initialized.npc_data.自主造物.当前活力, 30);
    assert.deepEqual(initialized.stat_data, { 备注: '本轮不修改玩家' });
    assert.deepEqual(initialized.npc_data.$meta, { extensible: true });
    assert.equal(await panel.getByRole('button', { name: '修正本楼层NPC', exact: true }).isDisabled(), true);
    await page.evaluate(async () => {
      const draft = structuredClone(preview.floors[2].data);
      Object.assign(draft.npc_data.克莱恩, { 当前活力: 10, $战斗经验: 175, initialized: false });
      Object.assign(draft.npc_data.自主造物, { 当前序列: '支柱', 能力清单: [{ 名称: '伪造能力' }], $完全自主造物: false });
      draft.npc_data.自主造物.$造物机械基准.活力 = 99999;
      await preview.modules['cryptLord.stateStore'].writeAssistantData(2, draft); preview.emit('MESSAGE_UPDATED');
    });
    await idle();
    const daily = await page.evaluate(() => preview.floors[2].data.npc_data);
    assert.equal(daily.克莱恩.当前活力, 10); assert.equal(daily.克莱恩.$战斗经验等级, 3);
    assert.equal(daily.自主造物.$完全自主造物, true); assert.equal(daily.自主造物.$造物机械基准.活力, 120);
    await page.evaluate(async () => { await preview.advance('克莱恩', { 当前序列: '序列8-小丑' }); preview.emit('MESSAGE_UPDATED'); });
    await idle(); const promoted = await page.evaluate(() => preview.floors[2].data.npc_data.克莱恩);
    assert.equal(promoted.当前活力, promoted.活力); assert.equal(promoted.能力清单.length, 7);
    assert.ok(promoted.能力清单.some(ability => ability.名称 === '身体控制'));
    await panel.getByRole('combobox', { name: 'NPC角色', exact: true }).selectOption('克莱恩'); await layout();
    await page.evaluate(() => { preview.floors[2].data.npc_data.克莱恩.活力 = 1; }); await reload();
    const beforeConflict = await count();
    await panel.getByRole('button', { name: '修正本楼层NPC', exact: true }).click();
    await page.evaluate(() => { preview.flags.page++; });
    await panel.getByRole('button', { name: '确认保存整楼NPC修正', exact: true }).click(); await idle(); await notice('未保存');
    assert.equal(await count(), beforeConflict); await reload();
    await page.evaluate(() => { preview.books['1源堡'][0].content = '{坏JSON}'; }); await reload(); await notice('读取失败');
    assert.equal(await panel.locator('main section').count(), 0);
    await page.evaluate(() => { preview.books['1源堡'][0].content = '{"10":600,"9":1000,"8":2000}'; }); await reload(); await repair();
    await notice('整楼NPC修正已保存');
    await page.evaluate(() => { preview.floors[2].data.cryptLord.teamBattle = { status: 'finished', settled: false }; preview.emit('MESSAGE_UPDATED'); });
    await idle(); await notice('结束并结算战斗');
    await page.evaluate(() => { delete preview.floors[2].data.cryptLord.teamBattle; preview.emit('MESSAGE_UPDATED'); }); await idle();
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal', {}, false)); await notice('等待完整楼层');
    await page.evaluate(() => preview.emit('GENERATION_STOPPED')); await idle();
    await page.evaluate(() => { preview.flags.hold = 'book'; }); await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await panel.getByRole('button', { name: '关闭', exact: true }).click(); await page.evaluate(() => preview.release());
    await page.waitForFunction(() => !preview.flags.waiting); assert.equal(await panel.isVisible(), false);
    await page.locator('#open').click(); await idle();
    await page.evaluate(() => { preview.flags.hold = 'book'; }); await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await page.evaluate(() => { preview.emit('CHAT_CHANGED'); preview.release(); });
    await page.waitForFunction(() => !preview.flags.waiting); assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => {
      const name = '<img src=x onerror="window.bad=true">' + '长名字'.repeat(70);
      preview.floors[2].data.npc_data[name] = { 当前序列: '普通人', 能力清单: [] }; document.body.dataset.theme = 'light';
    });
    await page.locator('#open').click(); await idle();
    const longName = await page.evaluate(() => Object.keys(preview.floors[2].data.npc_data).at(-1));
    await panel.getByRole('combobox', { name: 'NPC角色', exact: true }).selectOption(longName); await layout();
    assert.equal(await panel.locator('main img').count(), 0);
    assert.equal(await page.evaluate(() => preview.protected), true);
    const beforeDispose = await count();
    await page.evaluate(() => { preview.flags.hold = 'book'; }); await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await page.evaluate(() => { preview.api.dispose(); preview.service.dispose(); preview.release(); });
    await page.waitForFunction(() => !preview.flags.waiting); assert.equal(await count(), beforeDispose);
    assert.equal(await page.locator('.crypt-lord-npc-growth').count(), 0);
    assert.deepEqual(errors, []); await page.close(); console.log(`完整NPC成长桌面/手机流程 ${width}px 通过`);
  }
} finally { await browser.close(); }
