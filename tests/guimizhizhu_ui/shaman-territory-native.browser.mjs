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
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/shaman-territory-native.preview.html');
    const panel = page.locator('.crypt-lord-territory');
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-territory')?.getAttribute('aria-busy') === 'false');
    const certify = page.locator('[data-ppw="shaman-certify"]');
    const click = async () => { await certify.click(); await idle(); };
    const place = async value => {
      await page.locator('[data-shaman-place]').fill(value);
      await page.locator('[data-shaman-place]').blur();
    };
    const material = async (key, value) => {
      await page.locator(`[data-shaman-material="${key}"]`).fill(String(value));
      await page.locator(`[data-shaman-material="${key}"]`).blur();
    };
    const writes = () => page.evaluate(() => preview.writes.length);
    const requests = () => page.evaluate(() => preview.requests.length);
    const record = () => page.evaluate(() => preview.data.stat_data.$专属玩法?.萨满途径?.设置领地图腾玩法);
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    await page.locator('#open').click(); await idle();
    assert.equal(await writes(), 0); assert.equal(await requests(), 0);
    await place('河谷');
    await page.evaluate(() => { preview.reply = '<裁定>不通过</裁定><理由>仅有计划</理由>'; });
    await click(); assert.equal(await writes(), 0); assert.match(await panel.innerText(), /认证未通过/);
    await page.evaluate(() => { preview.reply = '格式错误'; });
    await click(); assert.equal(await writes(), 0); assert.match(await panel.innerText(), /格式无法解析/);
    await page.evaluate(() => { preview.reply = '<裁定>通过</裁定><理由>仪式完成</理由>'; });
    await click(); assert.equal(await writes(), 1);
    assert.equal((await record()).图腾位置, '河谷');
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.主材.数量), 3.5);
    assert.equal(await page.evaluate(() => preview.requests[0].custom_api), undefined);
    await place('山顶'); assert.equal(await certify.isDisabled(), true);
    assert.match(await panel.innerText(), /3天/);
    await page.evaluate(() => preview.advance(4)); await reload();
    await place('山顶'); await material('主材', 1);
    assert.equal(await page.locator('[data-shaman-material="低阶"]').count(), 0);
    consent = false; let n = await requests();
    await click(); assert.equal(await requests(), n); assert.equal(await writes(), 1);
    consent = true;
    await page.evaluate(() => { preview.settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: 'local', model: 'judge' }; });
    await click(); assert.equal(await writes(), 2);
    assert.equal((await record()).图腾位置, '山顶');
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.主材.数量), 2.5);
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api.model), 'judge');
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列5-绘梦者'; preview.data = data;
    });
    await reload();
    assert.equal((await record()).领地半径公里, .5);
    assert.equal(await writes(), 2);
    await page.locator('[data-ppw="shaman-sync-radius"]').click(); await idle();
    assert.equal((await record()).领地半径公里, 10); assert.equal(await writes(), 3);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列9-萨满'; preview.data = data; preview.advance(7);
    }); await reload();
    assert.equal((await record()).领地半径公里, 10);
    const prepare = async () => { await place('高塔'); await material('主材', 1); };
    await prepare(); await page.evaluate(() => { preview.writeFailure = true; });
    await click(); assert.equal(await writes(), 3);
    assert.equal((await record()).图腾位置, '山顶'); assert.match(await panel.innerText(), /模拟写入失败/);
    await page.evaluate(() => { preview.writeFailure = false; }); await reload(); await prepare();
    await page.evaluate(() => { preview.requestHook = 'history'; }); await click();
    assert.equal(await writes(), 3); assert.match(await panel.innerText(), /原生楼层.*已变化/);
    await reload(); await prepare();
    await page.evaluate(() => { preview.requestHook = 'variables'; }); await click();
    assert.equal(await writes(), 3); assert.match(await panel.innerText(), /原生楼层.*已变化/);
    await reload(); await prepare();
    await page.evaluate(() => { preview.requestHook = 'floor'; }); await click();
    assert.equal(await writes(), 3); assert.match(await panel.innerText(), /原生楼层.*已变化/);
    await reload(); await prepare();
    await page.evaluate(() => { preview.requestHook = 'defer'; }); await certify.click();
    await page.waitForFunction(() => preview.waiting);
    await panel.getByRole('button', { name: '关闭领地图腾管理' }).click();
    await page.evaluate(() => preview.resolve());
    await page.waitForTimeout(100);
    assert.equal(await writes(), 3);
    await page.locator('#open').click(); await idle();
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    }); await reload();
    assert.equal(await certify.isDisabled(), true);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle.status = 'finished'; preview.data = data;
    }); await reload(); assert.equal(await page.locator('[data-shaman-place]').isDisabled(), true);
    const overflow = await panel.evaluate(el => ({
      scroll: el.querySelector('main').scrollWidth, width: el.querySelector('main').clientWidth,
      right: el.getBoundingClientRect().right, viewport: innerWidth,
    }));
    assert.ok(overflow.scroll <= overflow.width + 1, JSON.stringify(overflow));
    assert.ok(overflow.right <= overflow.viewport + 1);
    assert.deepEqual(await page.evaluate(() => preview.writes), [2, 2, 2]);
    // An adjacent inventory action must accept the exact normalized commit, not report a false conflict.
    await panel.getByRole('button', { name: '关闭领地图腾管理' }).click();
    await page.evaluate(async () => {
      const data = preview.data;
      delete data.cryptLord.teamBattle;
      data.stat_data.当前序列 = '序列5-绘梦者';
      data.stat_data.$专属玩法.萨满途径.设置领地图腾玩法.领地半径公里 = .5;
      preview.data = data;
      modules['test.inventoryState'] = {
        gate: () => ({ unlocked: true }), guard: modules['cryptLord.shamanTerritoryState'].guard,
        create(data) {
          const draft = structuredClone(data);
          return { data: draft, effects: [], state: {},
            mode: { onChange() {} }, win: {}, render: () => '<button data-ppw="consume">消耗材料</button>',
            async action() { draft.stat_data.其他列表.主材.数量 -= 1; } };
        },
      };
      window.inventoryTestUi = modules['cryptLord.pathwayRosterWindow'].create({
        nativeTransactions: true,
        key: 'test.inventoryUi', serviceKey: 'test.inventoryState',
        className: 'crypt-lord-marionette inventory-test', title: '材料', label: '材料',
      });
      await inventoryTestUi.open();
    });
    await page.locator('.inventory-test [data-ppw="consume"]').click();
    await page.waitForFunction(() => document.querySelector('.inventory-test')?.getAttribute('aria-busy') === 'false');
    assert.equal(await writes(), 4);
    assert.equal((await record()).领地半径公里, 10);
    assert.equal(await page.evaluate(() => preview.data.stat_data.其他列表.主材.数量), 1.5);
    assert.doesNotMatch(await page.locator('.inventory-test').innerText(), /已变化/);
    await page.evaluate(() => inventoryTestUi.dispose());
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`领地图腾完整认证/更换/成长与原生楼层保护：${width}px通过`);
  }
} finally { await browser.close(); }
