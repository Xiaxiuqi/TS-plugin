import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(8000);
    let consent = true; page.on('dialog', dialog => consent ? dialog.accept() : dialog.dismiss());
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/audience-imagination-native.preview.html');
    const panel = page.locator('.crypt-lord-imagination');
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-imagination')?.getAttribute('aria-busy') === 'false');
    const click = async act => { await page.locator(`[data-ppw="${act}"]`).click(); await idle(); };
    const writes = () => page.evaluate(() => preview.writes.length);
    const play = () => page.evaluate(() => preview.data.stat_data.$专属玩法.观众途径.空想玩法);
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    await page.locator('#open').click(); await idle();
    assert.equal(await writes(), 0);
    assert.equal(await page.locator('[data-imagination-slot="2"]').isDisabled(), true);
    assert.equal(await page.locator('[data-imagination-slot="2"]').inputValue(), '秘祈人途径');
    assert.equal(await page.locator('[data-imagination-slot="1"] option[value="缺阶途径"]').evaluate(node => node.disabled), true);
    await page.locator('[data-imagination-slot="1"]').selectOption('占卜家途径');
    assert.match(await page.locator('[data-imagination-preview]').innerText(), /诡秘侍者/);
    assert.equal(await writes(), 0);
    await click('save'); assert.equal(await writes(), 1);
    assert.equal((await play()).空想栏位.栏位1.途径, '占卜家途径');
    assert.equal(await page.evaluate(() => preview.data.stat_data.当前序列), '序列1-作家');
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列0-空想家'; preview.data = data;
    });
    await reload();
    assert.equal(await page.locator('[data-imagination-slot="2"]').isDisabled(), false);
    await click('save'); assert.equal(await writes(), 2);
    assert.equal(await page.evaluate(() => Object.keys(preview.data.stat_data.序列能力列表).filter(key => key.startsWith('#空想:')).length), 5);
    await page.locator('[data-imagination-slot="1"]').selectOption('秘祈人途径');
    await click('save'); assert.equal(await writes(), 2);
    assert.match(await panel.innerText(), /同一途径/);
    await reload();
    consent = false; await click('separate-writer-trait'); assert.equal(await writes(), 2);
    consent = true;
    await click('separate-writer-trait'); assert.equal(await writes(), 3);
    assert.equal((await play()).分离序列1特性.已使用次数, 1);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表['作家特性#2'].数量), 1);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.作家特性), '保留原有同名物品');
    await page.evaluate(() => { const data = preview.data; delete data.stat_data.其他列表['作家特性#2']; preview.data = data; });
    await reload();
    for (const hook of ['variables', 'floor']) {
      await page.evaluate(value => { preview.confirmHook = value; }, hook);
      await click('separate-writer-trait'); assert.equal(await writes(), 3);
      assert.equal((await play()).分离序列1特性.已使用次数, 1);
      assert.match(await panel.innerText(), /楼层.*变化/);
      await reload();
    }
    await page.evaluate(() => {
      const abilities = cryptLord.__stage1Modules['cryptLord.abilityState'], assert = abilities.assertPool;
      abilities.assertPool = async (...args) => {
        const data = preview.data; data.stat_data.当前灵性 = 44; preview.data = data;
        abilities.assertPool = assert; return assert(...args);
      };
    });
    await click('separate-writer-trait'); assert.equal(await writes(), 3);
    assert.equal((await play()).分离序列1特性.已使用次数, 1);
    await reload();
    await page.evaluate(() => { preview.writeFailure = true; });
    await click('separate-writer-trait'); assert.equal(await writes(), 3);
    assert.equal((await play()).分离序列1特性.已使用次数, 1);
    assert.match(await panel.innerText(), /模拟写入失败/);
    await page.evaluate(() => { preview.writeFailure = false; });
    assert.equal(await page.locator('[data-ppw="separate-writer-trait"]').isDisabled(), true);
    await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
    assert.equal(await writes(), 4);
    assert.equal((await play()).分离序列1特性.已使用次数, 2);
    assert.equal(await page.locator('[data-ppw="separate-writer-trait"]').isDisabled(), true);
    await page.locator('[data-ppw="clear-slot"][data-arg="2"]').click(); await idle();
    assert.equal(await writes(), 5); assert.equal((await play()).空想栏位.栏位2.途径, '');
    await page.evaluate(() => preview.normalizeSave('序列9-观众'));
    await reload();
    assert.equal(await page.evaluate(() => Object.keys(preview.data.stat_data.序列能力列表).some(key => key.startsWith('#空想:'))), false);
    assert.equal((await play()).空想栏位.栏位1.途径, '占卜家途径');
    await page.evaluate(() => preview.normalizeSave('序列0-空想家'));
    await reload();
    assert.ok(await page.evaluate(() => preview.data.stat_data.辅助能力列表['#空想']));
    assert.equal((await play()).分离序列1特性.已使用次数, 2);
    await page.evaluate(() => { const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data; });
    await reload(); assert.equal(await page.locator('[data-ppw="save"]').isDisabled(), true);
    assert.equal(await panel.evaluate(node => [...node.querySelectorAll('main,select,button')].every(el => el.scrollWidth <= el.clientWidth + 2)), true);
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.equal(await page.evaluate(() => preview.models), 0);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.ok((await page.evaluate(() => preview.writes)).every(id => id === 2 || id === 4));
    assert.deepEqual(errors, []);
    await page.close(); console.log(`观众空想 ${width}px：完整原生管理、并发保护和布局通过。`);
  }
} finally { await browser.close(); }
