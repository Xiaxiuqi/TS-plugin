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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let confirm = true;
    page.on('dialog', dialog => confirm ? dialog.accept() : dialog.dismiss());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/reader-roster.preview.html');
    const panel = page.locator('.crypt-lord-reader');
    const idle = () => page.waitForFunction(() =>
      document.querySelector('.crypt-lord-reader')?.getAttribute('aria-busy') === 'false');
    const command = (act, slot) => page.locator(`[data-ppw="${act}"]${slot ? `[data-arg="${slot}"]` : ''}`);
    const click = async (act, slot) => {
      const target = command(act, slot);
      const closed = target.locator('xpath=ancestor::details[not(@open)]');
      if (await closed.count()) await closed.locator('summary').click();
      await target.click(); await idle();
    };
    const count = () => page.evaluate(() => preview.writes.length);
    const play = () => page.evaluate(() => preview.data.stat_data.$专属玩法?.阅读者途径?.秘术强化);
    async function start(name, pathway) {
      await click('to-learning-select', 1);
      const row = page.locator('[data-rm-learning-row]').filter({
        has: page.locator('.ppw-mat-name').filter({ hasText: new RegExp(`${name} · [^·]*${pathway}`) }),
      });
      await row.locator('input[type="radio"]').check();
      await click('start-learning', 1);
    }
    await page.getByRole('button', { name: '打开阅读者秘术', exact: true }).click(); await idle();
    assert.equal(await count(), 0);
    assert.equal(await panel.locator('[data-mystic-slot]').count(), 1);
    await start('甲', '秘偶大师');
    assert.equal((await play()).解析和学习.目标栏位.栏位1.进行中.途径, '占卜家');
    await page.evaluate(() => { preview.response = '<裁定>不通过|尚未掌握</裁定>'; });
    await click('recognize-learning', 1);
    assert.equal((await play()).解析和学习.目标栏位.栏位1.进行中.上次失败原因, '尚未掌握');
    await page.evaluate(() => { preview.response = 'invalid'; });
    await click('recognize-learning', 1);
    assert.match((await play()).解析和学习.目标栏位.栏位1.进行中.上次失败原因, /格式/);
    await page.evaluate(() => { preview.response = '<裁定>通过|已掌握</裁定>'; });
    await click('recognize-learning', 1);
    assert.equal((await play()).解析和学习.目标栏位.栏位1.已认定.奖励点数, 1);
    assert.equal(await page.evaluate(() => preview.requests[0].custom_api), undefined);
    const prompt = await page.evaluate(() => preview.requests[0].ordered_prompts.at(-1).content);
    assert.match(prompt, /<历史事件>[\s\S]*甲向玩家传授/);
    assert.match(prompt, /<最新剧情>[\s\S]*玩家成功掌握/);
    assert.equal(prompt.includes('隐藏分析'), false);
    await start('乙', '漫游者');
    assert.equal((await play()).解析和学习.目标栏位.栏位1.已认定.目标, '甲');
    await click('cancel-learning', 1);
    assert.equal((await play()).解析和学习.目标栏位.栏位1.已认定.目标, '甲');
    assert.equal((await play()).解析和学习.目标栏位.栏位1.进行中, undefined);
    await start('乙', '漫游者');
    await page.evaluate(() => {
      preview.settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', model: 'test', apiKey: '' };
    });
    await click('recognize-learning', 1);
    assert.equal((await play()).解析和学习.目标栏位.栏位1.已认定.奖励点数, 2);
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api.model), 'test');
    const slot = page.locator('[data-mystic-slot="1"]');
    const field = name => slot.locator(`[data-rm-field="${name}"]`);
    const change = async (name, value) => { await field(name).selectOption(value); };
    await field('name').fill('星光秘术');
    await change('kind', 'heal');
    await change('scope', 'group');
    await change('center', 'self');
    await change('heal-type', '灵性');
    await slot.locator('[data-rm-effect="1"] [data-rm-effect-field="type"]').selectOption('regen');
    await slot.locator('[data-rm-effect="1"] [data-rm-effect-field="resource"]').selectOption('理智');
    await slot.locator('[data-rm-effect="2"] [data-rm-effect-field="type"]').selectOption('buff');
    await slot.locator('[data-rm-effect="2"] [data-rm-effect-field="stat"]').selectOption('defense');
    await click('save-mystic', 1);
    const ability = await page.evaluate(() => preview.data.stat_data.序列能力列表['#秘术强化'][0]);
    assert.equal(ability.targetType, 'allAlly');
    assert.equal(ability.range, 0);
    assert.equal(ability.healType, '灵性');
    assert.equal(ability.effects[0].stat, '当前理智');
    assert.equal(ability.effects[1].stat, 'defense');
    await slot.locator('summary').click();
    await change('strength', '4'); await change('cost-tier', '3');
    assert.equal(await command('save-mystic', 1).isDisabled(), true);
    await change('strength', '0'); await change('cost-tier', '0');
    await field('name').fill('解析');
    const writes = await count();
    await click('save-mystic', 1);
    assert.equal(await count(), writes);
    await slot.locator('summary').click();
    await field('name').fill('星光秘术');
    await field('name').blur();
    assert.equal(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1 &&
      node.querySelector('main').scrollWidth <= node.querySelector('main').clientWidth + 1), true);
    const fields = await slot.locator('input,select,textarea').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length)
      .every(n => { const r = n.getBoundingClientRect(), p = n.parentElement.getBoundingClientRect();
        return r.width > 0 && r.left >= p.left - 1 && r.right <= p.right + 1; }));
    assert.equal(fields, true);
    confirm = false;
    await click('delete-mystic', 1);
    assert.equal(await count(), writes);
    confirm = true;
    await page.evaluate(() => { preview.writeFailure = true; });
    await click('delete-mystic', 1);
    assert.ok((await play()).秘术栏位.栏位1);
    await panel.locator('footer').filter({ hasText: '模拟写入失败' }).waitFor();
    await page.evaluate(() => { preview.writeFailure = false; });
    await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
    assert.equal((await play()).秘术栏位.栏位1, undefined);
    // Rejected stale verdicts must not overwrite another transaction, floor or chat.
    await page.evaluate(() => { preview.data = preview.initial; preview.settings = { useCustomApi: false }; });
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    await start('甲', '秘偶大师');
    const baseline = await count();
    await page.evaluate(() => preview.hold());
    await command('recognize-learning', 1).click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-reader').getAttribute('aria-busy') === 'true');
    await page.evaluate(() => {
      const data = preview.data; data.world_data.并发修改 = '保留'; preview.data = data;
      preview.release('<裁定>通过|已掌握</裁定>');
    });
    await idle();
    assert.equal(await count(), baseline);
    assert.equal(await page.evaluate(() => preview.data.world_data.并发修改), '保留');
    await panel.locator('footer').filter({ hasText: /原生楼层.*已变化/ }).waitFor();
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    await page.evaluate(() => preview.hold());
    await command('recognize-learning', 1).click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-reader').getAttribute('aria-busy') === 'true');
    await page.evaluate(() => { preview.changeChat(); preview.release('<裁定>通过|已掌握</裁定>'); });
    await page.waitForFunction(() => document.querySelector('.crypt-lord-reader').dataset.open === 'false');
    await page.getByRole('button', { name: '打开阅读者秘术', exact: true }).click(); await idle();
    assert.equal(await count(), baseline);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    assert.equal(await command('recognize-learning', 1).isDisabled(), true);
    assert.equal(await command('save-mystic', 1).isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.equal(await page.evaluate(() => preview.inputEvents), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Reader browser: desktop/mobile complete workflow, API routing, layout and native write isolation passed.');
} finally { await browser.close(); }
