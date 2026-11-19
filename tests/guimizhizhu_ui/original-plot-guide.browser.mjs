import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({
  headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/original-plot-guide.preview.html');
    await page.getByRole('button', { name: '查阅楼层 #0 原著剧情' }).click();
    await page.getByText('1 条匹配', { exact: false }).waitFor();
    assert.equal(await page.locator('.crypt-lord-original-plot__entry').count(), 1);
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.getByRole('button', { name: '查阅楼层 #2 原著剧情' }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('2 条匹配', { exact: false }).waitFor();
    assert.equal(await page.locator('.crypt-lord-original-plot__entry').count(), 2);
    assert.equal(await page.locator('.crypt-lord-original-plot__text img').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const panel = page.locator('.crypt-lord-original-plot');
    assert.ok(await panel.getByRole('button', { name: '重新检索' }).textContent());
    const before = await panel.boundingBox();
    const header = await panel.locator('header').boundingBox();
    await page.mouse.move(header.x + 50, header.y + 15);
    await page.mouse.down();
    await page.mouse.move(header.x + 88, header.y + 44, { steps: 5 });
    await page.mouse.up();
    const after = await panel.boundingBox();
    if (width > 600) assert.ok(Math.abs(after.x - before.x) + Math.abs(after.y - before.y) > 4);
    await page.keyboard.press('Escape');
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.equal(await page.getByRole('button', { name: '查阅楼层 #2 原著剧情' }).evaluate(node => document.activeElement === node), true);
    await page.locator('#open').click();
    await page.getByText('2 条匹配', { exact: false }).waitFor();
    await page.evaluate(() => { preview.hold(); });
    const beforeReads = await page.evaluate(() => preview.reads);
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.waitForFunction(count => preview.reads > count, beforeReads);
    assert.equal(await page.getByRole('button', { name: '重新检索' }).isDisabled(), true);
    await page.evaluate(() => {
      preview.floor = { message_id: 4, role: 'assistant', data: { world_data: { 当前时间纪元: '1349年7月1日' } } };
      preview.release();
    });
    await page.getByText(/楼层或纪元已变化/).waitFor();
    assert.equal(await page.locator('.crypt-lord-original-plot__entry').count(), 0);
    await page.evaluate(() => {
      preview.floor = { message_id: 2, role: 'assistant', message: '当前正文', data: { world_data: { 当前时间纪元: '1349年6月28日' } } };
      preview.hold();
    });
    let conflictReads = await page.evaluate(() => preview.reads);
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.waitForFunction(count => preview.reads > count, conflictReads);
    await page.evaluate(() => { preview.branch = true; preview.release(); });
    await page.getByText(/消息分支/).waitFor();
    await page.evaluate(() => { preview.branch = false; preview.hold(); });
    conflictReads = await page.evaluate(() => preview.reads);
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.waitForFunction(count => preview.reads > count, conflictReads);
    await page.evaluate(async () => {
      await preview.emit('start', 'normal', {}, false);
      preview.release();
      await preview.emit('stop');
    });
    assert.equal(await panel.getAttribute('data-open'), 'false');
    await page.locator('#open').click();
    await page.getByText('2 条匹配', { exact: false }).waitFor();
    await page.evaluate(async () => {
      await preview.emit('start', 'quiet', { quiet_prompt: '副模型' }, false);
      await preview.emit('start', 'quiet_prompt', {}, false);
      await preview.emit('start', 'normal', { quiet_prompt: '副模型' }, false);
      await preview.emit('start', 'normal', {}, true);
    });
    assert.equal(await panel.getAttribute('data-open'), 'true');
    await page.getByRole('button', { name: '重新检索' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.getByRole('button', { name: '关闭', exact: true }).evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: '重新检索' }).evaluate(node => node === document.activeElement), true);
    await page.evaluate(() => { preview.badPage = true; });
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.getByRole('status').filter({ hasText: '原生楼层' }).waitFor();
    assert.equal(await page.locator('.crypt-lord-original-plot__entry').count(), 0);
    await page.evaluate(() => { preview.badPage = false; preview.hold(); });
    conflictReads = await page.evaluate(() => preview.reads);
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.waitForFunction(count => preview.reads > count, conflictReads);
    await page.evaluate(() => { preview.chat = 'silent-chat-switch'; preview.release(); });
    await page.getByRole('status').filter({ hasText: '聊天或脚本已变化' }).waitFor();
    assert.equal(await page.locator('.crypt-lord-original-plot__entry').count(), 0);
    await page.evaluate(() => { preview.chat = 'plot-chat'; });
    await page.evaluate(() => {
      preview.floor = { message_id: 2, role: 'assistant', is_hidden: true, data: { world_data: { 当前时间纪元: '1349年6月28日' } } };
    });
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.getByText(/隐藏楼层/).waitFor();
    await page.evaluate(() => {
      preview.floor = { message_id: 2, role: 'assistant', data: { world_data: { 当前时间纪元: '1349年6月28日' } } };
      preview.fail = true;
    });
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.getByText('原著世界书读取失败，请重新检索。', { exact: true }).waitFor();
    await page.evaluate(() => { preview.fail = false; });
    await page.evaluate(() => { preview.entries.splice(0, preview.entries.length); });
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.getByText(/当前日期没有匹配/).waitFor();
    await page.evaluate(() => {
      preview.entries.push({ name: '1349年6月28日', content: '迟到的结果' });
      preview.hold();
    });
    const reads = await page.evaluate(() => preview.reads);
    await page.getByRole('button', { name: '重新检索' }).click();
    await page.waitForFunction(count => preview.reads > count, reads);
    await page.evaluate(() => { preview.chatChanged(); preview.release(); });
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.equal(await page.getByText('迟到的结果').count(), 0);
    await page.evaluate(() => preview.api.dispose());
    assert.equal(await panel.count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('original plot guide browser: match, text safety, refresh, stale read and layout passed');
} finally {
  await browser.close();
}
