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
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/enhancement-native.preview.html');
    const panel = page.locator('.crypt-lord-enhancement-native');
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-enhancement-native')?.getAttribute('aria-busy') === 'false');
    const click = async act => { await page.locator(`[data-ppw="${act}"]`).click(); await idle(); };
    const writes = () => page.evaluate(() => preview.writes.length);
    const play = () => page.evaluate(() => preview.data.stat_data.$专属玩法.通识者途径.装备强化玩法);
    const reload = async () => { await panel.getByRole('button', { name: '重新读取' }).click(); await idle(); };
    await page.locator('#open').click(); await idle();
    assert.equal(await writes(), 0); assert.equal(await play(), undefined);
    await page.locator('[data-enhance-draw-qty]').fill('20');
    consent = false; await click('enhance-draw'); assert.equal(await writes(), 0);
    consent = true;
    await page.locator('[data-enhance-draw-qty]').fill('20');
    await click('enhance-draw'); assert.equal(await writes(), 1);
    assert.equal(Object.keys((await play()).模块仓库).length, 20);
    assert.equal((await play()).抽取统计.总抽数, 20);
    assert.equal(await page.evaluate(() => preview.data.stat_data.$专属玩法.通识者途径.材料加工玩法.材料仓库.b.数量), 20.75);
    await page.locator('[data-ppw="enhance-open"]').last().click(); await idle();
    assert.equal(await writes(), 1);
    assert.match(await panel.innerText(), /稀有/);
    const host = encodeURIComponent(JSON.stringify(['武器列表', '枪']));
    await page.locator('[data-enhance-host]').selectOption(host);
    await click('enhance-install'); assert.equal(await writes(), 2);
    const moduleId = await page.evaluate(() => preview.data.stat_data.武器列表.枪.$强化模块安装.模块ID);
    assert.equal((await play()).模块仓库[moduleId].安装位置.物品键, '枪');
    consent = false; await click('enhance-detach'); assert.equal(await writes(), 2);
    consent = true;
    await page.evaluate(() => { preview.writeFailure = true; });
    await click('enhance-detach'); assert.equal(await writes(), 2);
    assert.match(await panel.innerText(), /模拟写入失败/);
    assert.ok((await play()).模块仓库[moduleId].安装位置);
    await page.evaluate(() => { preview.writeFailure = false; });
    assert.equal(await panel.getByRole('button', { name: '重试保存', exact: true }).isEnabled(), true);
    assert.equal(await panel.locator('[data-ppw]:not(:disabled)').count(), 0);
    await reload();
    for (const hook of ['variables', 'floor', 'silentChat', 'script']) {
      await page.evaluate(value => { preview.confirmHook = value; }, hook);
      await page.locator(`[data-ppw="enhance-open"][data-arg="${moduleId}"]`).click(); await idle();
      await click('enhance-detach'); assert.equal(await writes(), 2);
      assert.match(await panel.innerText(), /楼层.*变化/);
      assert.ok((await play()).模块仓库[moduleId].安装位置);
      await reload();
    }
    await page.locator(`[data-ppw="enhance-open"][data-arg="${moduleId}"]`).click(); await idle();
    await click('enhance-detach'); assert.equal(await writes(), 3);
    assert.equal((await play()).模块仓库[moduleId].卸下次数, 1);
    assert.equal(await page.evaluate(() => preview.data.stat_data.武器列表.枪.活力), 30);
    await page.evaluate(id => {
      const data = preview.data; data.stat_data.$专属玩法.通识者途径.装备强化玩法.模块仓库[id].卸下次数 = 3;
      preview.data = data; preview.random = 0;
    }, moduleId);
    await reload();
    await page.locator(`[data-ppw="enhance-open"][data-arg="${moduleId}"]`).click(); await idle();
    await page.locator('[data-enhance-host]').selectOption(host);
    await click('enhance-install'); assert.equal(await writes(), 4);
    assert.match(await panel.innerText(), /20%概率/);
    await click('enhance-detach'); assert.equal(await writes(), 5);
    assert.equal((await play()).模块仓库[moduleId], undefined);
    await page.locator('[data-ppw="enhance-open"]').first().click(); await idle();
    await page.locator('[data-enhance-host]').selectOption(host);
    await click('enhance-install'); assert.equal(await writes(), 6);
    const lostId = await page.evaluate(() => preview.data.stat_data.武器列表.枪.$强化模块安装.模块ID);
    await page.evaluate(() => { const data = preview.data; delete data.stat_data.武器列表.枪; preview.data = data; });
    await reload(); assert.equal(await writes(), 6);
    await click('enhance-reconcile'); assert.equal(await writes(), 7);
    assert.equal((await play()).模块仓库[lostId], undefined);
    await page.evaluate(() => { const data = preview.data; data.cryptLord.teamBattle = { status: 'finished', settled: false }; preview.data = data; });
    await reload(); assert.equal(await page.locator('[data-ppw="enhance-draw"]').isDisabled(), true);
    assert.equal(await panel.evaluate(node => [...node.querySelectorAll('main,select,button')].every(el => el.scrollWidth <= el.clientWidth + 2)), true);
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.equal(await page.evaluate(() => preview.models), 0);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.ok((await page.evaluate(() => preview.writes)).every(id => id === 2 || id === 4));
    // One computed draw is retained across save failures; readback never rerolls or blindly rewrites.
    await page.evaluate(() => { preview.data = preview.initial; });
    await reload();
    await page.locator('[data-enhance-draw-qty]').fill('2');
    await page.evaluate(() => { preview.writeFailure = true; });
    const beforeRetry = await writes();
    await click('enhance-draw');
    const rolls = await page.evaluate(() => preview.flags.rolls);
    assert.equal(await writes(), beforeRetry);
    assert.match(await panel.innerText(), /结果已保留/);
    await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.enhancementNativeUi'].open());
    assert.equal(await page.locator('[data-ppw="enhance-draw"]').isDisabled(), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), '重试保存');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '关闭装备强化管理');
    await page.evaluate(() => { preview.writeFailure = false; preview.random = .99; });
    await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
    assert.equal(await writes(), beforeRetry + 1);
    assert.equal(await page.evaluate(() => preview.flags.rolls), rolls);
    assert.equal((await play()).抽取统计.总抽数, 2);
    for (const mode of ['lost', 'readback', 'noop', 'tamper']) {
      await page.evaluate(value => { preview.data = preview.initial; preview.flags.writeMode = value; }, mode);
      await reload();
      await page.locator('[data-enhance-draw-qty]').fill('1');
      const n = await writes();
      await click('enhance-draw');
      assert.equal(await writes(), n + (mode === 'noop' ? 0 : 1));
      if (mode === 'lost') {
        assert.match(await panel.innerText(), /回执异常.*确认保存/);
        assert.equal(await panel.getByRole('button', { name: '重试保存', exact: true }).isVisible(), false);
      } else if (mode === 'readback') {
        assert.match(await panel.innerText(), /状态待核对/);
        const before = await page.evaluate(() => preview.flags.rolls);
        await page.evaluate(() => { preview.flags.readFailure = false; preview.flags.writeMode = ''; });
        await panel.getByRole('button', { name: '核对保存', exact: true }).click(); await idle();
        assert.equal(await writes(), n + 1);
        assert.equal(await page.evaluate(() => preview.flags.rolls), before);
        assert.match(await panel.innerText(), /已保存/);
      } else if (mode === 'noop') {
        assert.match(await panel.innerText(), /结果已保留/);
        await page.evaluate(() => { preview.flags.writeMode = ''; });
        await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
        assert.equal(await writes(), n + 1);
      } else {
        assert.match(await panel.innerText(), /保存后.*变化/);
        assert.equal(await panel.getByRole('button', { name: '重试保存', exact: true }).isDisabled(), true);
        assert.equal(await page.evaluate(() => preview.data.npc_data.老师.活力), 11);
      }
    }
    await page.evaluate(() => { preview.flags.writeMode = ''; preview.flags.pendingUser = true; });
    await reload();
    assert.match(await panel.innerText(), /末楼必须/);
    assert.equal(await panel.locator('[data-ppw]').count(), 0);
    await page.evaluate(() => { preview.flags.pendingUser = false; });
    await reload();
    await page.keyboard.press('Escape');
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open');
    await page.locator('#open').click(); await idle();
    await page.evaluate(() => preview.changeChat());
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.deepEqual(errors, []);
    await page.close(); console.log(`装备强化 ${width}px：完整原生操作、并发保护和布局通过。`);
  }
} finally { await browser.close(); }
