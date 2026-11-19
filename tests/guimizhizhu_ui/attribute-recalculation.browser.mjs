import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(10000);
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/attribute-recalculation.preview.html');
    const panel = page.getByRole('dialog', { name: '属性上限与重算', exact: true });
    const bar = page.locator('.mes[mesid="2"] .crypt-lord-native-floor-status-bar');
    const idle = () => page.waitForFunction(() => preview.api.status().busy === false &&
      document.querySelector('.crypt-lord-attributes').dataset.open === 'true');
    const notice = text => panel.getByRole('status').filter({ hasText: text }).waitFor();
    const reload = async () => { await panel.getByRole('button', { name: '重新读取', exact: true }).click(); await idle(); };
    const repair = async () => {
      await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).click(); await notice('确认修正');
      await panel.getByRole('button', { name: '确认保存属性修正', exact: true }).click(); await idle();
    };
    const layout = async () => {
      assert.equal(await panel.evaluate(node => node.scrollWidth <= node.clientWidth &&
        node.querySelector('main').scrollWidth <= node.querySelector('main').clientWidth &&
        node.getBoundingClientRect().right <= innerWidth && node.getBoundingClientRect().bottom <= innerHeight), true);
    };
    await bar.getByRole('button', { name: '属性', exact: true }).click(); await idle();
    assert.equal(await panel.locator('.crypt-lord-attributes__row').count(), 6);
    assert.match(await panel.textContent(), /上限 100 → 128/); assert.match(await panel.textContent(), /当前 30 → 58/);
    assert.equal(await page.evaluate(() => preview.untouched), true);
    await layout(); await page.screenshot({ path: path.join(os.tmpdir(), `attributes-window-${width}.png`) });
    await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).click(); await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false); assert.equal(await page.evaluate(() => preview.untouched), true);
    assert.equal(await bar.getByRole('button', { name: '属性', exact: true }).evaluate(node => node === document.activeElement), true);
    await page.getByRole('button', { name: '属性上限与重算', exact: true }).click(); await idle();
    await panel.getByRole('combobox', { name: '属性楼层' }).selectOption('0'); await idle(); await notice('历史楼层只读');
    assert.equal(await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).isEnabled(), false);
    await panel.getByRole('combobox', { name: '属性楼层' }).selectOption('2'); await idle();
    await repair(); await notice('修正已保存');
    assert.equal(await page.evaluate(() => preview.flags.writes.length), 1);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.当前活力), 58);
    assert.equal(await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).isEnabled(), false);
    await page.evaluate(() => preview.equip()); await idle();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-attributes main').textContent.includes('上限 96 → 96'));
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.当前活力), 26);
    await page.evaluate(() => preview.equip()); await idle();
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.当前活力), 58);
    await page.evaluate(() => preview.advance()); await idle();
    assert.equal(await page.evaluate(() => preview.flags.writes.length), 4);
    assert.equal(await page.evaluate(() => preview.protected), true);
    await page.evaluate(() => { preview.floors[2].data.cryptLord.teamBattle = { status: 'active' }; return preview.emit('MESSAGE_UPDATED'); });
    await idle(); await notice('结束并结算战斗');
    assert.equal(await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).isEnabled(), false);
    await page.evaluate(() => { delete preview.floors[2].data.cryptLord.teamBattle; preview.floors[2].data.stat_data.基础活力++; });
    await reload(); await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).click();
    await page.evaluate(() => { preview.flags.page++; });
    await panel.getByRole('button', { name: '确认保存属性修正', exact: true }).click(); await idle(); await notice('未保存');
    assert.equal(await page.evaluate(() => preview.flags.writes.length), 4);
    await reload(); await page.evaluate(() => { preview.flags.failWrite = true; }); await repair(); await notice('保存失败');
    await page.evaluate(() => { preview.flags.failWrite = false; }); await reload(); await repair(); await notice('修正已保存');
    await page.evaluate(() => { preview.flags.failRead = true; }); await reload(); await notice('读取失败');
    assert.equal(await panel.locator('main > section').count(), 0);
    await page.evaluate(() => { preview.flags.failRead = false; }); await reload();
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'quiet', {}, false));
    assert.equal(await panel.getByRole('button', { name: '重新读取' }).isEnabled(), true);
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal', {}, false)); await notice('等待完整楼层');
    assert.equal(await panel.getByRole('button', { name: '重新读取' }).isEnabled(), false);
    await page.evaluate(() => preview.emit('GENERATION_STOPPED')); await idle();
    await page.evaluate(() => preview.hold()); await panel.getByRole('button', { name: '重新读取' }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0); await panel.getByRole('button', { name: '关闭' }).click();
    await page.evaluate(() => preview.release()); assert.equal(await panel.isVisible(), false);
    await page.getByRole('button', { name: '属性上限与重算', exact: true }).click(); await idle();
    await page.evaluate(() => {
      preview.floors[2].data.stat_data.非凡特性列表['<img src=x onerror="window.bad=true">' + '长名字'.repeat(80)] =
        { 活力加成: 5, 百分比加成: { 全部属性: '2%' } };
    });
    await reload(); await layout(); assert.equal(await panel.locator('main img').count(), 0);
    await panel.locator('main').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await page.evaluate(() => { document.body.dataset.theme = 'light'; }); await layout();
    await panel.locator('main').evaluate(node => { node.scrollTop = 0; });
    await page.evaluate(() => { preview.floors[2].is_hidden = true; return preview.emit('MESSAGE_DELETED'); });
    await idle(); await notice('读取失败');
    await panel.getByRole('combobox', { name: '属性楼层' }).selectOption('0'); await idle(); await notice('历史楼层只读');
    await page.evaluate(() => preview.hold()); await panel.getByRole('button', { name: '重新读取' }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await page.evaluate(() => preview.emit('CHAT_CHANGED')); await page.evaluate(() => preview.release());
    assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => { preview.floors[2].is_hidden = false; });
    await page.getByRole('button', { name: '属性上限与重算', exact: true }).click(); await idle();
    await page.evaluate(() => preview.dispose());
    assert.equal(await page.locator('.crypt-lord-attributes').count(), 0);
    assert.equal(await page.evaluate(() => preview.protected), true); assert.deepEqual(errors, []);
    await page.close(); console.log(`完整属性重算桌面/手机流程 ${width}px 通过`);
  }
} finally { await browser.close(); }
