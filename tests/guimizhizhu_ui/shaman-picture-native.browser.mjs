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
    let accept = true; page.on('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/shaman-picture-native.preview.html');
    const panel = page.locator('.crypt-lord-picture');
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-picture')?.getAttribute('aria-busy') === 'false');
    const craft = page.locator('[data-ppw="picture-craft"]');
    const fill = async (key, quantity) => {
      const input = page.locator(`[data-picture-material="${key}"]`);
      await input.fill(String(quantity)); await input.blur();
    };
    const click = async () => { await craft.click(); await idle(); };
    const writes = () => page.evaluate(() => preview.writes.length);
    const list = () => page.evaluate(() => preview.data.stat_data.$专属玩法?.萨满途径?.制造画中人玩法?.画中人列表 || {});
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    const select = async () => {
      await page.locator('[data-picture-pathway]').selectOption('占卜家途径');
      await fill('主材', 1);
    };
    await page.locator('#open').click(); await idle();
    assert.equal(await writes(), 0);
    assert.equal(await craft.isDisabled(), true);
    assert.equal(await page.locator('[data-picture-material="主材"]').getAttribute('max'), '4');
    await select();
    accept = false; await click(); assert.equal(await writes(), 0);
    accept = true; await click();
    assert.equal(await writes(), 1);
    let rows = Object.values(await list());
    assert.equal(rows.length, 1); assert.equal(rows[0].名称, '占卜家画中人');
    assert.equal(rows[0].角色卡.能力清单.length, 2);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.主材.数量), 3.5);
    assert.equal(await page.evaluate(() => preview.data.stat_data.当前灵性), 200);
    await fill('主材', 2);
    await click();
    assert.equal(await writes(), 2);
    rows = Object.values(await list());
    assert.equal(rows.length, 2); assert.equal(rows.some(row => row.名称 === '占卜家画中人·二'), true);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.主材.数量), 1.5);
    await reload();
    assert.equal((await panel.innerText()).includes('战斗实力100%'), true);
    // Current-floor-only transactions, save rollback and all three native confirmation conflicts.
    await select(); await page.evaluate(() => { preview.writeFailure = true; });
    await click();
    assert.equal(await writes(), 2); assert.equal(Object.keys(await list()).length, 2);
    assert.match(await panel.innerText(), /模拟写入失败/);
    assert.equal(await craft.isDisabled(), true);
    await page.evaluate(() => { preview.writeFailure = false; }); await reload(); await select();
    await page.evaluate(() => { preview.confirmHook = 'variables'; }); await click();
    assert.equal(await writes(), 2);
    assert.equal(await page.evaluate(() => preview.data.stat_data.当前灵性), 55);
    assert.match(await panel.innerText(), /原生楼层.*已变化/);
    await reload(); await select();
    await page.evaluate(() => { preview.confirmHook = 'floor'; }); await click();
    assert.equal(await writes(), 2); assert.match(await panel.innerText(), /原生楼层.*已变化/);
    await reload(); await select();
    await page.evaluate(() => { preview.confirmHook = 'chat'; }); await craft.click();
    await panel.waitFor({ state: 'hidden' });
    assert.equal(await writes(), 2);
    await page.locator('#open').click(); await idle();
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列6-画师'; preview.data = data;
    });
    await reload(); assert.equal(await craft.isDisabled(), true);
    assert.equal(Object.keys(await list()).length, 2);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列5-绘梦者';
      data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await reload(); assert.equal(await craft.isDisabled(), true);
    assert.match(await panel.innerText(), /战斗进行中或尚未结算/);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle.status = 'finished'; preview.data = data;
    });
    await reload(); assert.equal(await page.locator('[data-picture-material="主材"]').isDisabled(), true);
    const overflow = await panel.evaluate(el => ({
      width: el.clientWidth, scroll: el.querySelector('main').scrollWidth,
      body: el.querySelector('main').clientWidth,
      right: el.getBoundingClientRect().right, viewport: innerWidth,
    }));
    assert.ok(overflow.scroll <= overflow.body + 1, JSON.stringify(overflow));
    assert.ok(overflow.right <= overflow.viewport + 1);
    assert.deepEqual(await page.evaluate(() => preview.writes), [2, 2]);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.equal(await page.evaluate(() => preview.requests), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`画中人完整界面及原生楼层写入链路：${width}px通过`);
  }
} finally { await browser.close(); }
