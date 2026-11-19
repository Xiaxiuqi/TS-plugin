import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    page.setDefaultTimeout(8000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/mystery-analysis-native.preview.html');
    const panel = page.locator('.crypt-lord-analysis');
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-analysis')?.getAttribute('aria-busy') === 'false');
    const cmd = act => page.locator(`[data-ppw="${act}"]`);
    const click = async act => { await cmd(act).click(); await idle(); };
    const count = () => page.evaluate(() => preview.writes.length);
    const open = async () => { await page.locator('#open').click(); await idle(); };
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    const accepted = '<裁定>\n通过|序列4|无|无|完成解析\n</裁定>';
    // Whole item workflow, failures, single successful record, actual state-store promotion lifecycle.
    await open(); assert.equal(await count(), 0);
    await click('mystery-open-items');
    assert.equal(await page.locator('[data-ma-item]').count(), 2);
    await page.locator('.ma-item-radio').first().check();
    await page.evaluate(() => { preview.response = 'invalid'; });
    await click('mystery-item-certify');
    assert.equal(await count(), 0);
    await page.locator('.ma-item-radio').first().check();
    await page.evaluate(value => { preview.response = value; }, accepted);
    await click('mystery-item-certify');
    assert.equal(await count(), 1);
    let data = await page.evaluate(() => preview.data);
    assert.equal(data.stat_data.活力, 100); assert.equal(data.stat_data.辅助能力列表, undefined);
    assert.equal(data.stat_data.其他列表.血样.数量, 1);
    assert.equal(await cmd('mystery-item-certify').count(), 0);
    await page.evaluate(async () => {
      const data = preview.data; data.stat_data.当前序列 = '序列4-神秘学家';
      await modules['cryptLord.stateStore'].writeAssistantData(2, data);
    });
    await reload();
    data = await page.evaluate(() => preview.data);
    assert.equal(data.stat_data.活力, 105);
    assert.equal(data.stat_data.当前活力, 30);
    assert.ok(data.stat_data.辅助能力列表['#神秘解析']);
    const once = JSON.stringify(data);
    await page.evaluate(async () => modules['cryptLord.stateStore'].writeAssistantData(2, preview.data));
    assert.equal(JSON.stringify(await page.evaluate(() => preview.data)), once);
    assert.match(await panel.innerText(), /活力5.00%/);
    assert.equal(await panel.innerText().then(text => text.includes('<User>')), false);
    // Whole native supplementary workflow, explicit selection, historical conflict and API fallback.
    await page.evaluate(() => {
      const data = preview.initial; data.stat_data.当前序列 = '序列4-神秘学家'; preview.data = data;
    });
    await reload(); await click('mystery-open-summary');
    assert.equal(await cmd('mystery-summary-certify').isDisabled(), true);
    await page.locator('[data-ppw-change="mystery-summary"]').first().check();
    const before = await count();
    await page.evaluate(() => { preview.hold(); });
    await cmd('mystery-summary-certify').click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-analysis').getAttribute('aria-busy') === 'true');
    await page.evaluate(value => { preview.historical = '<gametxt>准备解析，还未完成。</gametxt>'; preview.release(value); }, accepted);
    await idle();
    assert.equal(await count(), before);
    assert.match(await panel.innerText(), /已变化/);
    await page.evaluate(() => {
      preview.historical = '<gametxt>玩家在序列5时已完成解析，尚未晋升序列4。</gametxt>';
      preview.settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', model: 'test', apiKey: '' };
    });
    await reload(); await click('mystery-open-summary');
    await page.locator('[data-ppw-change="mystery-summary"]').first().check();
    await click('mystery-summary-certify');
    assert.equal(await count(), before + 1);
    const request = await page.evaluate(() => preview.requests.at(-1));
    assert.equal(request.custom_api.model, 'test');
    assert.match(request.ordered_prompts.at(-1).content, /<指定剧情>[\s\S]*#0[\s\S]*尚未晋升/);
    assert.equal(request.ordered_prompts.at(-1).content.includes('隐藏分析'), false);
    // Current-floor conflict, cancelled chat, battle lock; no input, narrative, NPC or opening writes.
    const reset = async () => {
      await page.evaluate(() => { preview.data = preview.initial; preview.settings = { useCustomApi: false }; });
      await reload(); await click('mystery-open-items');
      await page.locator('.ma-item-radio').first().check();
    };
    await reset();
    const previous = await count();
    await page.evaluate(() => { preview.hold(); });
    await cmd('mystery-item-certify').click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-analysis').getAttribute('aria-busy') === 'true');
    await page.evaluate(value => {
      const data = preview.data; data.stat_data.名称 = '外部修改'; preview.data = data; preview.release(value);
    }, accepted);
    await idle(); assert.equal(await count(), previous);
    assert.match(await panel.innerText(), /原生楼层.*已变化/);
    await reset();
    await page.evaluate(() => { preview.hold(); });
    await cmd('mystery-item-certify').click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-analysis').getAttribute('aria-busy') === 'true');
    await page.evaluate(value => { preview.changeChat(); preview.release(value); }, accepted);
    await panel.waitFor({ state: 'hidden' });
    await open(); assert.equal(await count(), previous);
    await page.evaluate(() => {
      const data = preview.initial; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await reload(); await click('mystery-open-items');
    assert.equal(await cmd('mystery-item-certify').isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), { 老师: { 活力: 10 } });
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await panel.locator('main').evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.deepEqual(errors, []);
    await reset();
    const screenshot = path.join(os.tmpdir(), `crypt-lord-analysis-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    console.log(`PASS: complete certification/lifecycle and native conflict workflows at ${width}px; ${screenshot}`);
    await page.close();
  }
} finally { await browser.close(); }
