import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    const errors = [];
    let accept = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/item-forge.preview.html');
    const initial = await page.evaluate(() => preview.floors);
    await page.locator('#open').click();
    await page.waitForFunction(() => !preview.api.status().busy);
    await page.locator('[data-theater-tab="reforge"]').click();
    await page.evaluate(() => {
      preview.emit('GENERATION_STARTED', 'quiet', {}, false);
      preview.emit('GENERATION_STARTED', 'quiet_prompt', {}, false);
      preview.emit('GENERATION_STARTED', 'normal', { quiet_prompt: true }, false);
      preview.emit('GENERATION_STARTED', 'normal', {}, true);
    });
    const items = page.locator('.crypt-lord-theater-console__equipment');
    assert.equal(await items.count(), 3);
    await items.nth(0).click();
    await page.getByRole('button', { name: '卸下装备', exact: true }).click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), 0);
    assert.deepEqual(await page.evaluate(() => preview.floors), initial);
    accept = true;
    await page.getByRole('button', { name: '卸下装备', exact: true }).click();
    await page.waitForFunction(() => preview.writes.length === 1 && !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.剧场点数), 200);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.活力), 100);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.当前活力), 40);
    for (const [label, count] of [['刷新属性', 2], ['赋予特质', 3], ['重塑特质', 4], ['洗去特质', 5]]) {
      await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
      await page.waitForFunction(expected => preview.writes.length === expected && !preview.api.status().busy, count);
    }
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.剧场点数), 135);
    assert.equal(await page.evaluate(() => {
      const item = preview.floors[2].data.stat_data.武器列表.a;
      return item.$物品属性同步 === preview.modules['cryptLord.itemDerivation'].itemSignature(item);
    }), true);
    await items.nth(2).click();
    assert.equal(await page.getByRole('button', { name: /^赋予特质/ }).count(), 0);
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => preview.writes.length === 6 && !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.衣物列表[0].特质), '');
    await items.nth(0).click();
    const bounds = await page.locator('.crypt-lord-theater-console__dialog').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const before = await page.evaluate(() => preview.floors);
    await page.evaluate(() => {
      preview.fail = true; preview.draws = 0;
      Math.random = () => { preview.draws++; return .5; };
    });
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy && preview.notices.at(-1)?.text.includes('模拟保存失败'));
    assert.deepEqual(await page.evaluate(() => preview.floors), before);
    const draws = await page.evaluate(() => preview.draws);
    const derivations = await page.evaluate(() => preview.flags.derivations);
    assert.equal(await page.getByRole('button', { name: /^刷新属性/ }).isDisabled(), true);
    await page.getByText(/特质：无 · 待保存/).waitFor();
    accept = false;
    await page.getByRole('button', { name: '重新读取剧场' }).click();
    await page.getByRole('button', { name: '关闭剧场' }).click();
    await page.evaluate(() => preview.api.open(2));
    assert.equal(await page.getByRole('button', { name: '重试保存本次结果' }).count(), 1);
    assert.equal(await page.locator('[data-theater-tab="theater"]').isDisabled(), true);
    accept = true;
    await page.evaluate(() => { preview.fail = false; });
    await page.getByRole('button', { name: '重试保存本次结果' }).click();
    await page.waitForFunction(() => preview.writes.length === 7 && !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.draws), draws);
    assert.equal(await page.evaluate(() => preview.flags.derivations), derivations);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.剧场点数), before[2].data.stat_data.剧场点数 - 10);
    assert.deepEqual(await page.evaluate(() => preview.floors[2].data.stat_data.武器列表.a),
      before[2].data.stat_data.武器列表.a);
    const refresh = async () => {
      await page.getByRole('button', { name: '重新读取剧场' }).click();
      await page.waitForFunction(() => !preview.api.status().busy);
    };
    await page.evaluate(() => {
      const rows = preview.floors; rows[2].data.stat_data.武器列表.a.描述 = '同名装备已变化'; preview.floors = rows;
    });
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy && preview.notices.at(-1)?.text.includes('已变化'));
    assert.equal(await page.evaluate(() => preview.writes.length), 7);
    await refresh();
    for (const boundary of ['page', 'rules', 'generation', 'close']) {
      await page.evaluate(() => { preview.flags.hold = true; });
      await page.getByRole('button', { name: /^刷新属性/ }).click();
      await page.waitForFunction(() => preview.flags.waiting);
      await page.evaluate(name => {
        if (name === 'page') preview.flags.page++;
        if (name === 'rules') preview.books['本角色规则'][0].content = '{"9":500}';
        if (name === 'generation') {
          preview.emit('GENERATION_STARTED', 'normal', {}, false);
          preview.emit('GENERATION_STOPPED');
        }
        if (name === 'close') preview.api.close();
        preview.release();
      }, boundary);
      await page.waitForFunction(() => !preview.api.status().busy && !preview.flags.waiting);
      assert.equal(await page.evaluate(() => preview.writes.length), 7);
      if (boundary === 'close') {
        await page.locator('#open').click();
        await page.waitForFunction(() => !preview.api.status().busy);
        await page.locator('[data-theater-tab="reforge"]').click();
        await items.nth(0).click();
      } else {
        if (boundary === 'generation') assert.equal(await page.getByRole('button', { name: /^刷新属性/ }).isDisabled(), true);
        await refresh();
      }
    }
    await page.evaluate(() => { preview.flags.failBook = true; });
    await refresh();
    assert.equal(await page.getByRole('button', { name: /^刷新属性/ }).isDisabled(), true);
    await page.getByRole('status').filter({ hasText: '模拟规则读取失败' }).waitFor();
    await page.evaluate(() => { preview.flags.failBook = false; });
    await refresh();
    await page.evaluate(() => preview.api.open(0));
    await page.waitForFunction(() => !preview.api.status().busy);
    await page.locator('[data-theater-tab="reforge"]').click();
    await page.getByRole('status').filter({ hasText: '历史楼层只读' }).waitFor();
    await page.evaluate(async () => {
      const rows = preview.floors; rows[0].data = {};
      preview.floors = rows;
      await preview.api.refresh();
    });
    await page.locator('[data-theater-tab="reforge"]').click();
    await page.getByRole('status').filter({ hasText: '没有有效角色状态' }).waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), 7);
    await page.evaluate(value => {
      const rows = preview.floors; rows[0] = value; preview.floors = rows;
    }, initial[0]);
    await page.evaluate(() => preview.api.open(2));
    await page.waitForFunction(() => !preview.api.status().busy);
    await page.locator('[data-theater-tab="reforge"]').click();
    await items.nth(0).click();
    // A lost receipt is confirmed from real native pages, never submitted twice.
    let count = await page.evaluate(() => preview.writes.length);
    let updates = await page.evaluate(() => preview.updates.length);
    await page.evaluate(() => { preview.flags.lostReceipt = true; });
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), ++count);
    assert.equal(await page.evaluate(() => preview.updates.length), ++updates);
    await page.getByRole('status').filter({ hasText: '已核对' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '重试保存本次结果' }).count(), 0);
    await page.evaluate(() => { preview.flags.lostReceipt = false; preview.flags.afterWriteFail = true; });
    const beforeUncertain = await page.evaluate(() => preview.floors);
    const uncertainCost = Number((await page.getByRole('button', { name: /^刷新属性/ }).textContent()).match(/(\d+) 点/)[1]);
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), ++count);
    assert.equal(await page.evaluate(() => preview.updates.length), updates);
    const pendingDerivations = await page.evaluate(() => preview.flags.derivations);
    const inspect = page.getByRole('button', { name: '核对原生保存状态' });
    await inspect.click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    assert.equal(await page.getByRole('button', { name: '重试保存本次结果' }).count(), 0);
    await page.evaluate(() => { preview.flags.afterWriteFail = false; preview.flags.failRead = false; });
    await inspect.click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    assert.equal(await page.evaluate(() => preview.updates.length), ++updates);
    assert.equal(await page.evaluate(() => preview.flags.derivations), pendingDerivations);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.剧场点数),
      beforeUncertain[2].data.stat_data.剧场点数 - uncertainCost);
    await page.evaluate(() => { preview.flags.noWrite = true; });
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy);
    const noWriteDerivations = await page.evaluate(() => preview.flags.derivations);
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    await page.evaluate(() => { preview.flags.noWrite = false; });
    await page.getByRole('button', { name: '重试保存本次结果' }).click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), ++count);
    assert.equal(await page.evaluate(() => preview.updates.length), ++updates);
    assert.equal(await page.evaluate(() => preview.flags.derivations), noWriteDerivations);
    await page.evaluate(() => { preview.flags.conflictWrite = true; });
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy);
    assert.equal(await page.evaluate(() => preview.writes.length), ++count);
    assert.equal(await page.getByRole('button', { name: '重试保存本次结果' }).isDisabled(), true);
    await page.evaluate(() => { preview.flags.conflictWrite = false; });
    await refresh();
    await page.evaluate(() => { preview.readHook = () => { preview.readHook = null; preview.chatChanged(); }; });
    await page.getByRole('button', { name: /^刷新属性/ }).click();
    await page.waitForFunction(() => !preview.api.status().busy && !preview.api.status().open);
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    const final = await page.evaluate(() => preview.floors);
    assert.deepEqual(final[0], initial[0]);
    assert.deepEqual(final[1], initial[1]);
    assert.equal(final[2].message, initial[2].message);
    assert.deepEqual(final[2].data.npc_data, initial[2].data.npc_data);
    assert.deepEqual(final[2].data.stat_data.武器列表.b, initial[2].data.stat_data.武器列表.b);
    assert.ok(await page.evaluate(() => preview.writes.every(rows => rows.every(row => row.message_id === 2 && !('message' in row)))));
    assert.equal(await page.locator('#native-input').inputValue(), '保留输入');
    assert.deepEqual(errors, []);
    console.log(`${width}px full reforge/unequip workflow and write-failure/floor-change/chat-change guards passed`);
    await page.close();
  }
} finally { await browser.close(); }
