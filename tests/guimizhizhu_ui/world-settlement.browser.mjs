import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let currentPage;
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } }); currentPage = page;
    const errors = [], dialogs = []; let accept = true;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => { dialogs.push(dialog.message()); const action = accept; accept = true; return action ? dialog.accept() : dialog.dismiss(); });
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/world-settlement.preview.html');
    await page.waitForFunction(() => window.ready); await page.evaluate(() => document.fonts.ready);
    const panel = page.getByRole('dialog', { name: '变量修改器', exact: true, includeHidden: true });
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-variable-workbench').getAttribute('aria-busy') === 'false');
    const command = async name => { await panel.getByRole('button', { name, exact: true }).click(); await idle(); };
    const message = text => panel.getByRole('status').filter({ hasText: text }).waitFor();
    const count = () => page.evaluate(() => preview.flags.writes.length);
    const editTime = async era => {
      await panel.getByRole('tab', { name: '原始模式' }).click();
      await panel.getByRole('textbox', { name: '原始补丁', exact: true }).fill(JSON.stringify({
        world_data: [{ op: 'replace', path: '/当前时间纪元', value: era }],
      }));
      await command('应用补丁到草稿');
    };
    await idle(); assert.equal(await count(), 0);
    await editTime('第五纪1350年1月8日星期一0:00');
    accept = false; await command('应用'); await message('已取消');
    assert.equal(await count(), 0); assert.match(dialogs.at(-1), /当前活力.*90/); assert.match(dialogs.at(-1), /D100/);
    await command('应用'); await message('已保存');
    assert.equal(await count(), 1); assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.当前活力), 90);
    assert.ok(await page.evaluate(() => preview.floors[2].data.stat_data.货币.鲁恩王国.金镑 > 39));
    assert.ok(await page.evaluate(() => preview.floors[2].data.stat_data.领地.物资库['1级工业品'] > 100));
    await panel.getByRole('tab', { name: '深度编辑' }).click();
    await editTime('第五纪1350年1月9日星期二0:00');
    await page.evaluate(() => { preview.flags.failWrite = true; });
    await command('应用'); await message('模拟保存失败'); assert.equal(await count(), 1);
    await page.evaluate(() => { preview.flags.failWrite = false; });
    await command('应用'); await message('已保存'); assert.equal(await count(), 2);
    const stable = await page.evaluate(() => JSON.stringify(preview.floors[2].data));
    await page.evaluate(async () => { await preview.modules['cryptLord.stateStore'].writeAssistantData(2, preview.floors[2].data); });
    assert.equal(await page.evaluate(() => JSON.stringify(preview.floors[2].data)), stable);
    await command('重新读取');
    await editTime('第五纪1350年1月10日星期三0:00');
    await page.evaluate(() => { preview.flags.hold = true; });
    const delayed = panel.getByRole('button', { name: '应用', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => preview.release()); await delayed;
    await page.waitForTimeout(50);
    const before = await count();
    await page.evaluate(() => preview.ui.open(2)); await idle();
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal')); await message('正文生成已开始');
    assert.equal(await count(), before);
    await page.evaluate(() => preview.emit('GENERATION_ENDED')); await command('重新读取');
    await editTime('第五纪1350年1月10日星期三0:00');
    await page.evaluate(() => { preview.flags.afterWriteFail = true; });
    await command('应用'); await message('已保存，但复核失败'); assert.equal(await count(), before + 1);
    await page.evaluate(() => { preview.flags.failRead = false; preview.flags.afterWriteFail = false; });
    await command('重新读取');
    await command('关闭'); await page.evaluate(() => preview.ui.open(0)); await idle();
    assert.equal(await panel.getByRole('button', { name: '应用', exact: true }).isDisabled(), true);
    await command('关闭'); await page.evaluate(() => preview.ui.open(2)); await idle();
    await page.evaluate(() => {
      preview.floors[2].data.stat_data['超长变量名称'.repeat(20)] = '<img src=x onerror=alert(1)>'.repeat(12);
    });
    await command('重新读取'); await panel.getByRole('tab', { name: '深度编辑' }).click();
    await panel.getByRole('searchbox', { name: '搜索变量' }).fill('超长');
    assert.equal(await panel.locator('img').count(), 0);
    const bounds = await panel.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    const overflow = await page.evaluate(() => {
      const panel = document.querySelector('.crypt-lord-variable-workbench');
      return [...panel.querySelectorAll('input,button,textarea')].filter(node => node.getClientRects().length)
        .filter(node => node.getBoundingClientRect().right > panel.getBoundingClientRect().right + 1).length;
    });
    assert.equal(overflow, 0);
    assert.equal(await page.getByRole('textbox', { name: '原生输入草稿', exact: true }).inputValue(), '保留原生输入草稿');
    assert.ok(await page.evaluate(() => JSON.stringify(preview.floors.slice(0, 2)) === JSON.stringify(preview.initial.slice(0, 2))));
    assert.deepEqual(errors, []); await page.close();
    console.log(`${width}px：整链确认、恢复/收支/产出、失败重试、生成取消、历史与布局通过`);
  }
} catch (error) {
  await currentPage?.screenshot({ path: path.join(os.tmpdir(), 'crypt-lord-world-settlement-failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
