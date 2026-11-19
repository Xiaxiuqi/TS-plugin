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
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/material-processing-native.preview.html');
    const panel = page.locator('.crypt-lord-material-processing');
    const idle = () => page.waitForFunction(() =>
      document.querySelector('.crypt-lord-material-processing')?.getAttribute('aria-busy') === 'false');
    const click = async act => { await page.locator(`[data-ppw="${act}"]`).click(); await idle(); };
    const count = () => page.evaluate(() => preview.writes.length);
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    const select = async all => {
      await click('material-select');
      const boxes = page.locator('.ppw-material-source-cb');
      for (let i = 0; i < (all ? await boxes.count() : 1); i++) await boxes.nth(i).check();
      await page.locator('.ppw-material-source-qty').first().fill('0.75');
    };
    const target = async (operations = ['拆解', '分离', '精炼']) => {
      await page.locator('[data-ppw="material-target"]').first().click(); await idle();
      for (const [index, operation] of operations.entries())
        await page.locator(`[data-material-operation="${index}"]`).selectOption(operation);
    };
    await page.locator('#open').click(); await idle();
    assert.equal(await count(), 0);
    assert.doesNotMatch(await panel.innerText(), /制造工坊/);
    await select(true);
    assert.equal(await page.locator('.ppw-material-source-cb').count(), 3);
    await click('material-recognize');
    assert.equal(await count(), 0);
    assert.equal(await page.locator('[data-ppw="material-target"]').count(), 2);
    const request = await page.evaluate(() => preview.requests[0]);
    assert.equal(request.custom_api, undefined);
    assert.doesNotMatch(request.ordered_prompts.at(-1).content, /隐藏分析/);
    await target(); assert.equal(await page.locator('[data-ppw="material-settle"]').isDisabled(), false);
    consent = false; await click('material-settle'); assert.equal(await count(), 0);
    consent = true; await click('material-settle'); assert.equal(await count(), 1);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.废金属.数量), 2);
    assert.match(await panel.innerText(), /工序复盘/);
    await click('material-next'); await click('material-skip');
    await target(['分离', '精炼', '封装']); await click('material-settle');
    assert.equal(await count(), 2);
    assert.equal(await page.evaluate(() => preview.data.npc_data.死者.$材料加工.已加工), true);
    await click('material-next'); await click('material-clear-queue');
    assert.match(await panel.innerText(), /钢.*0.75份/s);
    assert.match(await panel.innerText(), /人骨/);
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    // Focused failure/retry and stale asynchronous result checks using the real state-store.
    await page.evaluate(() => { preview.response = '无效回复'; });
    await select(false); await click('material-recognize');
    assert.match(await panel.innerText(), /未通过或格式无效/); assert.equal(await count(), 2);
    await click('material-clear-queue');
    await page.evaluate(() => {
      preview.response = '<材料认定>\n1|1|通过|金属|钢|序列4|无|坚硬|1|尚有杂质|拆解>分离>精炼|可取得金属\n</材料认定>';
      preview.settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', apiKey: 'mock', model: 'mock' };
    });
    await select(false); await click('material-recognize'); await target();
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api.model), 'mock');
    await page.evaluate(() => { preview.writeFailure = true; });
    await click('material-settle'); assert.equal(await count(), 2);
    assert.match(await panel.innerText(), /模拟写入失败/);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.废金属.数量), 2);
    const rolls = await page.evaluate(() => preview.flags.rolls);
    const requests = await page.evaluate(() => preview.requests.length);
    await page.evaluate(() => { preview.writeFailure = false; preview.roll = 100; });
    await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
    assert.equal(await count(), 3);
    assert.equal(await page.evaluate(() => preview.flags.rolls), rolls);
    assert.equal(await page.evaluate(() => preview.requests.length), requests);
    assert.doesNotMatch(await panel.innerText(), /大失败/);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.废金属.数量), 1.25);
    await click('material-next'); await click('material-clear-queue');
    await select(false); await click('material-recognize'); await target();
    await page.evaluate(() => { preview.roll = 100; });
    await click('material-settle'); assert.equal(await count(), 4);
    assert.match(await panel.innerText(), /大失败/);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.废金属.数量), .5);
    await click('material-next'); await click('material-clear-queue');
    for (const conflict of ['variables', 'floor', 'close']) {
      await select(false);
      await page.evaluate(() => preview.hold());
      const n = await page.evaluate(() => preview.requests.length);
      await page.locator('[data-ppw="material-recognize"]').click();
      await page.waitForFunction(n => preview.requests.length > n, n);
      if (conflict === 'close') await panel.getByRole('button', { name: '关闭材料加工管理' }).click();
      await page.evaluate(kind => {
        if (kind === 'variables') {
          const data = preview.data; data.stat_data.当前活力 = 17; preview.data = data;
        } else if (kind === 'floor') preview.changeFloor();
        preview.release();
      }, conflict);
      if (conflict === 'close') { await page.locator('#open').click(); await idle(); }
      else { await idle(); assert.match(await panel.innerText(), /原生楼层.*变化/); await reload(); }
      assert.equal(await count(), 4);
    }
    for (const conflict of ['branch', 'metadata', 'rules', 'settings', 'cancel', 'generation', 'quiet_prompt']) {
      await select(false);
      await page.evaluate(() => preview.hold());
      const n = await page.evaluate(() => preview.requests.length);
      await page.locator('[data-ppw="material-recognize"]').click();
      await page.waitForFunction(n => preview.requests.length > n, n);
      await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.materialProcessingUi'].open());
      assert.equal(await panel.getAttribute('aria-busy'), 'true');
      assert.equal(await panel.getByRole('button', { name: '重新读取', exact: true }).isDisabled(), true);
      assert.equal(await panel.locator('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)').count(), 0);
      if (conflict === 'cancel') await panel.getByRole('button', { name: '取消', exact: true }).click();
      await page.evaluate(kind => {
        if (kind === 'branch') preview.flags.branch = '改变未选中的分支';
        if (kind === 'metadata') preview.flags.metadata++;
        if (kind === 'rules') preview.flags.ruleRevision++;
        if (kind === 'settings') preview.settings = { useCustomApi: true, apiUrl: 'https://example.invalid/changed', model: 'changed' };
        if (kind === 'generation') preview.emit('GENERATION_STARTED', 'normal');
        if (kind === 'quiet_prompt') preview.emit('GENERATION_STARTED', 'quiet_prompt');
        preview.release();
      }, conflict);
      await idle();
      if (conflict === 'quiet_prompt') {
        await page.waitForFunction(() => document.querySelector('[data-ppw="material-target"]'));
        assert.equal(await page.locator('[data-ppw="material-target"]').count(), 1);
      } else if (['settings', 'rules'].includes(conflict)) {
        const expected = conflict === 'settings' ? 'API 设置已变化' : '玩法规则或角色绑定已变化';
        await page.waitForFunction(text => document.body.textContent.includes(text), expected);
        assert.equal(await page.locator('[data-ppw="material-target"]').count(), 0);
      } else {
        assert.equal(await page.locator('[data-ppw="material-target"]').count(), 0);
        if (conflict === 'generation') {
          assert.equal(await panel.getByRole('button', { name: '重新读取', exact: true }).isDisabled(), true);
          await page.evaluate(() => preview.emit('GENERATION_ENDED'));
        }
      }
      assert.equal(await count(), 4);
      await reload();
    }
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await reload();
    assert.equal(await page.locator('[data-ppw="material-select"]').isDisabled(), true);
    for (const selector of ['.crypt-lord-material-processing', '.crypt-lord-material-processing main'])
      assert.equal(await page.locator(selector).evaluate(node => node.scrollWidth > node.clientWidth), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    assert.deepEqual(errors, []);
    await page.evaluate(() => preview.changeChat());
    assert.equal(await panel.getAttribute('data-open'), 'false');
    await page.close();
  }
  console.log('Material processing browser: desktop/mobile complete workflow, API fallback, native write/failure/conflict guards and layout passed.');
} finally { await browser.close(); }
