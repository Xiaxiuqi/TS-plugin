import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/marionette.preview.html');
    await page.locator('#open').click();
    await page.getByRole('button', { name: '勾选人物认证' }).click();
    assert.equal(await page.locator('.mrn-cand-cb').count(), 2);
    await page.locator('.mrn-cand-cb').nth(0).check();
    await page.locator('.mrn-cand-cb').nth(1).check();
    await page.getByRole('button', { name: '开始认证', exact: true }).click();
    await page.getByText('认证通过，已记为你的秘偶').waitFor();
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data.甲),
      await page.evaluate(() => ({ ...preview.initial.npc_data.甲, $秘偶: true })));
    assert.equal(await page.evaluate(() => preview.data.npc_data.乙.$秘偶), undefined);
    assert.equal(await page.evaluate(() => preview.requests[0].custom_api), undefined);
    assert.equal(await page.evaluate(() => preview.requests[0].ordered_prompts.at(-1).content.includes('隐藏分析')), false);
    await page.getByRole('button', { name: '返回', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '退回袋内' }).click();
    await page.getByText('带入册快照 · 入册时原样还原').waitFor();
    await page.getByRole('button', { name: '入册', exact: true }).click();
    await page.getByRole('button', { name: '按原记录入册' }).click();
    await page.getByRole('button', { name: '取消认证' }).waitFor();
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data.甲.事件历史),
      await page.evaluate(() => preview.initial.npc_data.甲.事件历史));
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '取消认证' }).click();
    await page.waitForFunction(() => preview.data.npc_data.甲.$秘偶 === undefined);
    await page.getByRole('button', { name: '据剧情认证' }).click();
    await page.locator('.mrn-src-rb[data-src="0"]').check();
    await page.getByRole('button', { name: '开始判定' }).click();
    await page.getByRole('button', { name: '确认添加' }).waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), 4);
    assert.match(await page.evaluate(() => preview.requests.at(-1).ordered_prompts.at(-1).content), /玩家亲手将丙制成秘偶/);
    await page.locator('.mrn-p-name').fill('丙改');
    await page.locator('.mrn-p-pw').selectOption('猎人途径');
    assert.equal(await page.locator('.mrn-p-name').inputValue(), '丙改');
    await page.locator('.mrn-p-seq').selectOption('序列9-猎人');
    await page.getByRole('button', { name: '确认添加' }).click();
    await page.getByText('丙改', { exact: true }).waitFor();
    const savedCard = await page.evaluate(() => preview.data.stat_data.$专属玩法.占卜家途径.秘偶玩法.秘偶列表.丙改);
    assert.equal(savedCard.当前活力, savedCard.活力);
    assert.equal(savedCard.$战斗经验, 0);
    page.once('dialog', dialog => dialog.accept('新名字'));
    await page.getByRole('button', { name: '改名' }).click();
    await page.getByText('新名字', { exact: true }).waitFor();
    await page.getByRole('button', { name: '重抽能力' }).click();
    await page.getByRole('button', { name: '入册', exact: true }).click();
    await page.locator('[data-mrn-field="性格"]').fill('听从命令，习惯保持沉默');
    await page.getByRole('button', { name: '确认入册' }).click();
    await page.getByRole('button', { name: '退回袋内' }).waitFor();
    assert.equal(await page.evaluate(() => preview.data.npc_data.新名字.性格), '听从命令，习惯保持沉默');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '退回袋内' }).click();
    await page.getByRole('button', { name: '销毁' }).waitFor();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '销毁' }).click();
    assert.equal(await page.getByRole('button', { name: '销毁' }).count(), 1);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '销毁' }).click();
    await page.waitForFunction(() => !preview.data.stat_data.$专属玩法.占卜家途径.秘偶玩法.秘偶列表.新名字);
    const writeCount = await page.evaluate(() => preview.writes.length);
    await page.getByRole('button', { name: '勾选人物认证' }).click();
    await page.locator('.mrn-cand-cb').first().check();
    await page.evaluate(() => preview.hold());
    await page.getByRole('button', { name: '开始认证', exact: true }).click();
    await page.waitForFunction(() => preview.requests.length === 3);
    await page.evaluate(() => {
      const changed = preview.data; changed.npc_data.甲.当前活力 = 12; preview.data = changed;
      preview.release('<裁定>\n1|通过|已经制成\n</裁定>');
    });
    await page.locator('footer').filter({ hasText: /原生楼层.*已变化/ }).waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), writeCount);
    await page.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.getByRole('button', { name: '据剧情认证' }).click();
    await page.evaluate(() => preview.response = '<裁定>\n通过|丁|虚构序列|不可靠序列\n</裁定>');
    await page.getByRole('button', { name: '开始判定' }).click();
    await page.getByText(/不在清单内/).waitFor();
    await page.getByRole('button', { name: '确认添加' }).click();
    await page.getByText(/没有选序列名/).first().waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), writeCount);
    await page.evaluate(() => {
      const changed = preview.data;
      changed.cryptLord.teamBattle = { status: 'finished', settled: false };
      preview.data = changed;
    });
    await page.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.getByRole('button', { name: '勾选人物认证' }).click();
    await page.locator('.mrn-cand-cb').first().check();
    await page.getByRole('button', { name: '开始认证', exact: true }).click();
    await page.getByText('战斗进行中或尚未结算，不能修改秘偶').waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), writeCount);
    await page.evaluate(() => {
      const changed = preview.data; delete changed.cryptLord.teamBattle; preview.data = changed;
    });
    await page.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.getByRole('button', { name: '勾选人物认证' }).click();
    await page.locator('.mrn-cand-cb').first().check();
    await page.evaluate(() => preview.hold());
    await page.getByRole('button', { name: '开始认证', exact: true }).click();
    await page.waitForFunction(() => preview.requests.length === 5);
    await page.getByRole('button', { name: '关闭秘偶管理' }).click();
    await page.evaluate(() => preview.release('<裁定>\n1|通过|亲手制成\n</裁定>'));
    await page.locator('#open').click();
    await page.getByRole('button', { name: '据剧情认证' }).waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), writeCount);
    const panel = page.locator('.crypt-lord-marionette');
    const before = await panel.boundingBox(), header = await panel.locator('header').boundingBox();
    await page.mouse.move(header.x + 30, header.y + 17);
    await page.mouse.down();
    await page.mouse.move(header.x + 55, header.y + 40, { steps: 5 });
    await page.mouse.up();
    const after = await panel.boundingBox();
    assert.ok(Math.abs(after.y - before.y) > 4);
    assert.equal(await panel.evaluate(node => node.scrollWidth > node.clientWidth), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    await page.evaluate(() => preview.changeChat());
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.deepEqual(errors, []);
    if (width === 1280) {
      const prepare = async () => {
        await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/marionette.preview.html');
        await page.evaluate(() => localStorage.removeItem('ST_LoM_AbilityLock'));
        await page.locator('#open').click();
        await page.getByRole('button', { name: '勾选人物认证' }).click();
        await page.locator('.mrn-cand-cb').first().check();
      };
      const idle = () => page.waitForFunction(() =>
        document.querySelector('.crypt-lord-marionette')?.getAttribute('aria-busy') === 'false');
      for (const flag of ['failWrite', 'lostReceipt', 'failReadAfterWrite', 'conflictAfterWrite']) {
        await prepare();
        await page.evaluate(flag => { preview.transaction.flags[flag] = true; }, flag);
        await page.getByRole('button', { name: '开始认证', exact: true }).click(); await idle();
        assert.equal(await page.evaluate(() => preview.requests.length), 1);
        if (flag === 'failWrite') {
          assert.equal(await page.evaluate(() => preview.data.npc_data.甲.$秘偶), undefined);
          assert.equal(await page.getByRole('button', { name: '返回', exact: true }).isDisabled(), true);
          await page.evaluate(() => { preview.transaction.flags.failWrite = false; });
          await page.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
          assert.equal(await page.evaluate(() => preview.data.npc_data.甲.$秘偶), true);
        } else if (flag === 'failReadAfterWrite') {
          await page.getByRole('button', { name: '核对保存', exact: true }).waitFor();
          assert.equal(await page.getByRole('button', { name: '重试保存', exact: true }).isVisible(), false);
          await page.evaluate(() => { preview.transaction.flags.readFailure = false; });
          await page.getByRole('button', { name: '核对保存', exact: true }).click(); await idle();
          assert.match(await panel.locator('footer').innerText(), /已保存/);
        } else if (flag === 'conflictAfterWrite') {
          assert.match(await panel.locator('footer').innerText(), /未覆盖/);
          assert.equal(await page.getByRole('button', { name: '重试保存', exact: true }).isDisabled(), true);
          assert.equal(await page.evaluate(() => preview.data.stat_data.外部修改), '不得覆盖');
        } else {
          assert.match(await panel.locator('footer').innerText(), /确认保存/);
        }
        assert.equal(await page.evaluate(() => preview.requests.length), 1);
        assert.deepEqual(await page.evaluate(() => preview.writes), [2]);
        const swiped = await page.evaluate(async () =>
          (await modules['cryptLord.hostApi'].getChatMessages('2', { include_swipes: true }))[0]);
        assert.equal(swiped.swipe_id, 1);
        assert.equal(swiped.swipes[0], '保留备用分支');
        assert.deepEqual(swiped.swipes_data[0], { preserved: 'alternate' });
        assert.equal('message' in swiped || 'data' in swiped, false);
      }
      for (const change of ['branch', 'rules', 'lock', 'generation', 'cancel']) {
        await prepare(); await page.evaluate(() => preview.hold());
        await page.getByRole('button', { name: '开始认证', exact: true }).click();
        await page.waitForFunction(() => preview.requests.length === 1);
        if (change === 'cancel') {
          await panel.getByRole('button', { name: '取消', exact: true }).click();
        } else {
          await page.evaluate(change => {
            if (change === 'branch') preview.transaction.flags.branch = '外部备用分支';
            if (change === 'rules') preview.transaction.flags.revision++;
            if (change === 'lock') localStorage.setItem('ST_LoM_AbilityLock', 'true');
            if (change === 'generation') preview.transaction.emit('GENERATION_STARTED', 'normal');
          }, change);
        }
        await page.evaluate(() => preview.release('<裁定>\n1|通过|仍可使用\n</裁定>'));
        await idle();
        assert.deepEqual(await page.evaluate(() => preview.writes), []);
        assert.equal(await page.evaluate(() => preview.data.npc_data.甲.$秘偶), undefined);
        if (change === 'generation') {
          assert.equal(await page.getByRole('button', { name: '重新读取', exact: true }).isDisabled(), true);
          await page.evaluate(() => preview.transaction.emit('GENERATION_ENDED'));
        }
      }
      await page.evaluate(() => localStorage.removeItem('ST_LoM_AbilityLock'));
      const listeners = await page.evaluate(() => preview.transaction.listeners());
      await page.evaluate(() => modules['cryptLord.marionetteUi'].dispose());
      assert.equal(await page.evaluate(() => preview.transaction.listeners()), listeners - 4);
      assert.deepEqual(errors, []);
    }
    await page.close();
  }
  console.log('Marionette browser: desktop/mobile complete lifecycle, original-floor evidence, pending approval, stale requests, malformed sequences, cancel, native-only writes and drag passed.');
} finally { await browser.close(); }
