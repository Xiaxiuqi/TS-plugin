import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let confirm = true;
    page.on('dialog', dialog => confirm ? dialog.accept() : dialog.dismiss());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/grazing-roster.preview.html');
    const panel = page.locator('.crypt-lord-grazing');
    const button = name => page.getByRole('button', { name, exact: true });
    const idle = () => page.waitForFunction(() =>
      document.querySelector('.crypt-lord-grazing')?.getAttribute('aria-busy') === 'false');
    const click = async name => { await button(name).click(); await idle(); };
    const count = () => page.evaluate(() => preview.writes.length);
    const play = () => page.evaluate(() => preview.data.stat_data.$专属玩法?.秘祈人途径?.放牧玩法);
    async function certify(name) {
      await click('认证新灵魂');
      await page.locator(`input[name="grazing-candidate"][value="${name}"]`).check();
      await click('开始认证');
      await page.getByText('认证通过，已加入放牧灵魂列表。', { exact: false }).waitFor();
      await click('返回放牧界面');
    }
    await button('打开放牧名册').click(); await idle();
    await certify('甲');
    await certify('乙');
    assert.equal(await count(), 2);
    assert.equal(await page.evaluate(() => preview.requests[0].custom_api), undefined);
    assert.equal(await page.evaluate(() => preview.requests[0].ordered_prompts.at(-1).content.includes('隐藏分析')), false);
    assert.match(await page.evaluate(() => preview.requests[0].ordered_prompts.at(-1).content), /亲手放牧甲和乙/);
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    await page.locator('[data-grazing-active][value="甲"]').check();
    await page.locator('[data-grazing-active][value="乙"]').check();
    await click('保存激活组合');
    assert.deepEqual((await play()).激活灵魂, ['甲']);
    assert.deepEqual((await play()).休眠灵魂, ['乙']);
    const third = await count();
    await click('保存激活组合');
    assert.equal(await count(), third);
    assert.equal(await page.evaluate(() => preview.data.stat_data.序列能力列表['#放牧:乙:序列5-旅行家']), undefined);
    await button('关闭放牧管理').click();
    await button('打开放牧名册').click(); await idle();
    assert.equal(await page.locator('[data-grazing-active]:checked').count(), 2);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列3-三首圣堂'; preview.data = data;
    });
    await click('重新读取'); await click('保存激活组合');
    assert.deepEqual((await play()).激活灵魂, ['甲', '乙']);
    assert.deepEqual((await play()).休眠灵魂, []);
    assert.ok(await page.evaluate(() => preview.data.stat_data.序列能力列表['#放牧:乙:序列5-旅行家']));
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列5-牧羊人'; preview.data = data;
    });
    await click('重新读取'); await click('保存激活组合');
    assert.deepEqual((await play()).休眠灵魂, ['乙']);
    await page.locator('[data-grazing-active][value="甲"]').uncheck();
    await click('保存激活组合');
    assert.deepEqual((await play()).激活灵魂, ['乙']);
    assert.deepEqual((await play()).休眠灵魂, []);
    assert.equal(await page.evaluate(() => Object.keys(preview.data.stat_data.序列能力列表)
      .some(key => key.startsWith('#放牧:甲:'))), false);
    // Release cancellation and failed persistence keep the actual stored soul.
    const saved = await count();
    confirm = false;
    await page.locator('[data-ppw="release"][data-arg="乙"]').click(); await idle();
    assert.equal(await count(), saved);
    confirm = true;
    await page.evaluate(() => { preview.writeFailure = true; });
    await page.locator('[data-ppw="release"][data-arg="乙"]').click(); await idle();
    await panel.locator('footer').filter({ hasText: /模拟写入失败.*结果已保留/ }).waitFor();
    assert.ok((await play()).灵魂列表.乙);
    await page.evaluate(() => { preview.writeFailure = false; });
    await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
    assert.equal((await play()).灵魂列表.乙, undefined);
    assert.deepEqual((await play()).激活灵魂, []);
    assert.deepEqual((await play()).休眠灵魂, []);
    assert.equal(await page.evaluate(() => Object.keys(preview.data.stat_data.序列能力列表)
      .some(key => key.startsWith('#放牧:'))), false);
    await click('认证新灵魂');
    await page.locator('input[name="grazing-candidate"][value="丙"]').check();
    await page.evaluate(() => { preview.response = '<裁定>不通过|未亲手放牧</裁定>'; });
    const beforeRejected = await count();
    await click('开始认证');
    assert.equal(await count(), beforeRejected);
    await page.getByText('未亲手放牧', { exact: false }).waitFor();
    await click('返回放牧界面'); await click('认证新灵魂');
    await page.locator('input[name="grazing-candidate"][value="丙"]').check();
    await page.evaluate(() => { preview.response = 'invalid'; });
    await click('开始认证');
    await page.getByText(/认证回复格式无法解析/).waitFor();
    assert.equal(await count(), beforeRejected);
    await click('返回放牧界面'); await click('认证新灵魂');
    await page.locator('input[name="grazing-candidate"][value="丙"]').check();
    await page.evaluate(() => {
      preview.settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', apiKey: '', model: 'test' };
      preview.hold();
    });
    let requestCount = await page.evaluate(() => preview.requests.length);
    await button('开始认证').click();
    await page.waitForFunction(n => preview.requests.length > n, requestCount);
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api.model), 'test');
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前活力 = 123; preview.data = data;
      preview.release('<裁定>通过|仍持有</裁定>');
    });
    await idle();
    await panel.locator('footer').filter({ hasText: /原生楼层.*已变化/ }).waitFor();
    assert.equal(await count(), beforeRejected);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'finished', settled: false }; preview.data = data;
    });
    await click('重新读取');
    assert.equal(await button('保存激活组合').isDisabled(), true);
    assert.equal(await button('认证新灵魂').isDisabled(), true);
    await page.evaluate(() => {
      const data = preview.data; delete data.cryptLord.teamBattle; preview.data = data;
    });
    await click('重新读取');
    const beforeDrag = await panel.boundingBox(), header = await panel.locator('header').boundingBox();
    await page.mouse.move(header.x + 20, header.y + 17);
    await page.mouse.down(); await page.mouse.move(header.x + 35, header.y + 40, { steps: 5 }); await page.mouse.up();
    assert.ok(Math.abs((await panel.boundingBox()).y - beforeDrag.y) > 4);
    assert.equal(await panel.evaluate(node => node.scrollWidth > node.clientWidth), false);
    assert.equal(await panel.locator('main').evaluate(node => node.scrollWidth > node.clientWidth), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await click('认证新灵魂');
    await page.locator('input[name="grazing-candidate"][value="丙"]').check();
    await page.evaluate(() => preview.hold());
    requestCount = await page.evaluate(() => preview.requests.length);
    await button('开始认证').click();
    await page.waitForFunction(n => preview.requests.length > n, requestCount);
    await button('关闭放牧管理').click();
    await page.evaluate(() => preview.release('<裁定>通过|仍持有</裁定>'));
    await button('打开放牧名册').click(); await idle();
    assert.equal(await count(), beforeRejected);
    assert.equal((await play()).灵魂列表.丙, undefined);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.$专属玩法.秘祈人途径.放牧玩法.版本 = 99; preview.data = data;
    });
    await click('重新读取'); await click('保存激活组合');
    await page.getByText('不支持此放牧名册版本', { exact: true }).waitFor();
    assert.equal(await count(), beforeRejected);
    await page.evaluate(() => preview.changeChat());
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.equal(await page.evaluate(() => preview.inputEvents), 0);
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Grazing roster browser: desktop/mobile full certification, active/dormant persistence, rank changes, release, native conflict/cancel guards and layout passed.');
} finally { await browser.close(); }
