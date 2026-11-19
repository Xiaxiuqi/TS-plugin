import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const url = 'http://127.0.0.1:8791/tests/guimizhizhu_ui/reader-mystic.preview.html';
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('#open').click();
    const section = page.locator('.crypt-lord-game-shell__reader');
    await section.waitFor();
    await section.locator('select').nth(1).selectOption('0');
    await section.getByRole('button', { name: '开始解析和学习' }).click();
    await page.waitForFunction(() => preview.writes === 1);
    assert.equal(await page.evaluate(() => preview.data.stat_data.$专属玩法.阅读者途径.秘术强化.解析和学习.目标栏位.栏位1.进行中.目标), '莫里斯');
    await section.getByRole('button', { name: '认定已完成学习' }).click();
    await page.waitForFunction(() => preview.writes === 2);
    await section.getByText(/每个秘术额度7点/).waitFor();
    await section.locator('[data-reader-field="名称"] input').fill('幽蓝秘术');
    await section.locator('[data-reader-field="强度档"] select').selectOption('1');
    await section.locator('[data-reader-field="消耗档"] select').selectOption('2');
    await section.locator('.crypt-lord-game-shell__reader-effect').first()
      .locator('[data-reader-effect-field="类型"] select').selectOption('buff');
    await section.getByText(/秘术点 7\/7/).waitFor();
    await section.getByRole('button', { name: '保存并同步' }).click();
    await page.waitForFunction(() => preview.writes === 3);
    assert.equal(await page.evaluate(() => preview.data.stat_data.序列能力列表['#秘术强化'][0].名称), '幽蓝秘术');
    await section.getByRole('button', { name: '删除此秘术' }).click();
    await page.waitForFunction(() => preview.writes === 4);
    assert.equal(await page.evaluate(() => preview.data.stat_data.序列能力列表['#秘术强化']), undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px 横向溢出`);
    assert.deepEqual(errors, [], `${width}px 页面异常`);
    await page.close();
  }
  console.log('reader mystic browser: desktop/mobile learning, verdict, points, editor and projection OK');
} finally {
  await browser.close();
}
