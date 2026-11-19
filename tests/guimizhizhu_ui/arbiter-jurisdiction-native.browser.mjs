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
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let consent = true; page.on('dialog', dialog => consent ? dialog.accept() : dialog.dismiss());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/arbiter-jurisdiction-native.preview.html');
    const panel = page.locator('.crypt-lord-jurisdiction');
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-jurisdiction')?.getAttribute('aria-busy') === 'false');
    const action = async act => { await page.locator(`[data-ppw="${act}"]`).click(); await idle(); };
    const field = async (attr, value) => {
      await page.locator(`[${attr}]`).fill(value); await page.locator(`[${attr}]`).blur();
    };
    const baseFields = async name => {
      await field('data-arbiter-base-name', name); await field('data-arbiter-base-boundary', `${name}边界内`);
    };
    const record = () => page.evaluate(() => preview.data.stat_data.$专属玩法?.仲裁人途径?.设定辖区玩法);
    const writes = () => page.evaluate(() => preview.writes.length);
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    await page.locator('#open').click(); await idle();
    assert.equal(await writes(), 0);
    await baseFields('东区');
    await page.evaluate(() => { preview.reply = '<裁定>不通过</裁定><理由>仅有计划</理由>'; });
    await action('arbiter-base-certify'); assert.equal(await writes(), 0);
    await page.evaluate(() => { preview.reply = '<裁定>通过</裁定><理由>指定完成</理由>'; });
    await action('arbiter-base-certify'); assert.equal(await writes(), 1);
    assert.equal((await record()).熟悉起算时间, '');
    await field('data-arbiter-issuer', '市政厅'); await field('data-arbiter-position', '治安官');
    await field('data-arbiter-appointment-note', '正式授任东区');
    await page.locator('[data-arbiter-region-field="name"]').fill('东区');
    await page.locator('[data-arbiter-region-field="name"]').blur();
    await page.locator('[data-arbiter-region-field="boundary"]').fill('东区边界内');
    await page.locator('[data-arbiter-region-field="boundary"]').blur();
    await action('arbiter-region-add'); assert.equal(await writes(), 1);
    assert.equal(await page.locator('[data-arbiter-region-field="name"]').count(), 2);
    await page.locator('[data-ppw="arbiter-region-remove"][data-arg="1"]').click(); await idle();
    assert.equal(await page.locator('[data-arbiter-region-field="name"]').count(), 1);
    await page.evaluate(() => {
      preview.reply = '<裁定>通过</裁定><覆盖基础辖区>是</覆盖基础辖区><理由>覆盖基础辖区</理由>';
      preview.settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'local', model: 'judge' };
    });
    await action('arbiter-appointment-certify'); assert.equal(await writes(), 2);
    assert.equal((await record()).官方任命.行政区列表.length, 1);
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api.model), 'judge');
    await page.evaluate(() => { preview.reply = '格式错误'; });
    await action('arbiter-appointment-certify'); assert.equal(await writes(), 2);
    assert.ok((await record()).官方任命); assert.match(await panel.innerText(), /旧任命保持不变/);
    consent = false; await action('arbiter-appointment-clear'); assert.equal(await writes(), 2);
    consent = true;
    await page.evaluate(() => { preview.reply = '<裁定>不通过</裁定><理由>任命撤销</理由>'; });
    await action('arbiter-appointment-certify'); assert.equal(await writes(), 3);
    assert.equal((await record()).官方任命, null);
    await baseFields('新区');
    await page.evaluate(() => { preview.reply = '<裁定>通过</裁定><理由>新区指定完成</理由>'; });
    await action('arbiter-base-certify'); assert.equal(await writes(), 4);
    assert.match(await panel.innerText(), /正在熟悉新辖区/);
    await page.evaluate(() => preview.advance(11)); await reload(); assert.match(await panel.innerText(), /已熟悉/);
    await baseFields('另一区');
    for (const hook of ['history', 'variables', 'floor']) {
      await page.evaluate(value => { preview.hook = value; }, hook);
      await action('arbiter-base-certify'); assert.equal(await writes(), 4);
      assert.match(await panel.innerText(), /楼层.*变化/);
      await reload(); await baseFields('另一区');
    }
    await page.evaluate(() => { preview.writeFailure = true; });
    await action('arbiter-base-certify'); assert.equal(await writes(), 4);
    assert.equal((await record()).基础辖区.名称, '新区');
    assert.match(await panel.innerText(), /模拟写入失败/);
    await page.evaluate(() => { preview.writeFailure = false; preview.hook = 'wait'; });
    await reload();
    await baseFields('另一区');
    await page.locator('[data-ppw="arbiter-base-certify"]').click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-jurisdiction').getAttribute('aria-busy') === 'true');
    await panel.getByRole('button', { name: '关闭辖区管理' }).click();
    await page.evaluate(() => preview.release());
    await page.waitForFunction(() => document.querySelector('.crypt-lord-jurisdiction').dataset.open === 'false');
    await page.locator('#open').click(); await idle(); assert.equal(await writes(), 4);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await reload(); assert.equal(await page.locator('[data-ppw="arbiter-base-certify"]').isDisabled(), true);
    const noOverflow = await panel.evaluate(node => [...node.querySelectorAll('main,input,textarea,button')]
      .every(el => el.scrollWidth <= el.clientWidth + 2));
    assert.equal(noOverflow, true);
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.ok((await page.evaluate(() => preview.writes)).every(id => id === 2 || id === 4));
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`仲裁人辖区 ${width}px：完整管理、原生保存保护和布局通过。`);
  }
} finally { await browser.close(); }
