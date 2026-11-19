import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    const page = await browser.newPage({ viewport: { width, height: 760 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/source-castle.preview.html');
    await page.locator('#open').click();
    await page.getByText('读取完成').waitFor();
    assert.match(await page.locator('.crypt-lord-source-castle__list').innerText(), /#8/);
    assert.match(await page.locator('.crypt-lord-source-castle__list').innerText(), /玩家自建/);
    assert.match(await page.locator('.crypt-lord-source-castle__list').innerText(), /世界书目录\s+3 本/);
    assert.match(await page.locator('.crypt-lord-source-castle__list').innerText(), /已挂载世界书\s+1 本/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const panel = page.locator('.crypt-lord-source-castle');
    await panel.focus(); await page.keyboard.press('Shift+Tab');
    assert.equal(await panel.evaluate(node => node.contains(document.activeElement)), true);
    const before = await panel.boundingBox();
    const header = await panel.locator('header').boundingBox();
    await page.mouse.move(header.x + 50, header.y + 15);
    await page.mouse.down();
    await page.mouse.move(header.x + 82, header.y + 44, { steps: 5 });
    await page.mouse.up();
    const after = await panel.boundingBox();
    if (width > 600) assert.ok(Math.abs(after.x - before.x) + Math.abs(after.y - before.y) > 4);
    await page.getByRole('button', { name: '历史日志' }).click();
    await page.getByText('模拟观测记录').waitFor();
    await page.evaluate(() => { preview.events.push({ timestamp: '无效时间', level: 'warn',
      details: '坏时间也可导出' + '长观测记录'.repeat(50) + '<img src=x onerror="window.injected=true">' }); });
    await page.getByRole('button', { name: '操作面板' }).click();
    await page.getByRole('button', { name: '重新读取状态与日志' }).click();
    await page.getByText('读取完成').waitFor();
    await page.getByRole('button', { name: '历史日志' }).click();
    await panel.locator('details summary').click();
    assert.equal(await panel.locator('details').getAttribute('open'), '');
    assert.equal(await panel.locator('details img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected || false), false);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出观测记录' }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'crypt-lord-observation.txt');
    const exported = await readFile(await download.path(), 'utf8');
    assert.match(exported, /模拟观测记录/); assert.match(exported, /时间未知/); assert.match(exported, /长观测记录/);
    assert.equal(await panel.evaluate(node => {
      const rect = node.getBoundingClientRect(), main = node.querySelector('main');
      return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && main.scrollWidth <= main.clientWidth;
    }), true);
    await page.getByRole('button', { name: '操作面板' }).click();
    await page.evaluate(() => { preview.floor = { ...preview.floor, message_id: 9 }; });
    await page.getByRole('button', { name: '重新读取状态与日志' }).click();
    await page.getByRole('button', { name: '源堡数据' }).click();
    await page.getByText('#9').waitFor();
    await page.evaluate(() => { preview.failBooks = true; preview.failFloor = true; });
    await page.getByRole('button', { name: '操作面板' }).click();
    await page.getByRole('button', { name: '重新读取状态与日志' }).click();
    await page.getByText('读取完成').waitFor();
    await page.getByRole('button', { name: '源堡数据' }).click();
    assert.equal(await page.getByText('#9', { exact: true }).count(), 0);
    await page.getByText('模拟楼层读取失败').waitFor();
    await page.getByText('读取失败：模拟目录读取失败').waitFor();
    await page.evaluate(() => { preview.failBooks = false; preview.failFloor = false; });
    await page.evaluate(() => preview.event('GENERATION_STARTED', 'quiet'));
    assert.equal(await panel.getAttribute('data-open'), 'true');
    await page.evaluate(() => preview.event('GENERATION_STARTED', 'normal'));
    await page.getByRole('button', { name: '操作面板' }).click();
    assert.equal(await page.getByRole('button', { name: '重新读取状态与日志' }).isDisabled(), true);
    await page.evaluate(() => preview.event('GENERATION_STOPPED'));
    assert.equal(await page.getByRole('button', { name: '重新读取状态与日志' }).isDisabled(), false);
    await page.evaluate(() => { preview.hold(); });
    await page.getByRole('button', { name: '操作面板' }).click();
    await page.getByRole('button', { name: '重新读取状态与日志' }).click();
    await page.evaluate(() => { preview.chatChanged(); preview.release(); });
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.equal(await page.locator('#open').evaluate(node => node === document.activeElement), true);
    await page.evaluate(() => preview.api.dispose());
    assert.equal(await page.getByRole('dialog', { name: '源堡系统', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('source castle browser: data, logs, export, reload, chat switch and layout passed');
} finally {
  await browser.close();
}
