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
    let promptValue = '';
    page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? promptValue : undefined));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/workshop.preview.html');
    const button = name => page.getByRole('button', { name, exact: true });
    const command = act => page.locator(`[data-ppw="${act}"]`);
    const idle = () => page.waitForFunction(() =>
      document.querySelector('.crypt-lord-workshop')?.getAttribute('aria-busy') === 'false');
    const click = async name => { await button(name).click(); await idle(); };
    const quantity = () => page.evaluate(() => Object.values(preview.data.stat_data.$专属玩法.通识者途径.材料加工玩法.材料仓库)
      .reduce((sum, row) => sum + row.数量, 0));
    const record = name => page.evaluate(name => preview.data.stat_data.$专属玩法.通识者途径.制造玩法?.造物列表[name], name);
    const firstOption = async selector => {
      const field = page.locator(selector);
      const value = await field.locator('option').evaluateAll(rows => rows.find(row => row.value)?.value);
      assert.ok(value, selector); await field.selectOption(value);
    };
    async function manufacture(type, name, passive = false) {
      await click(`制造${type}`);
      await page.locator('[data-construct-name]').fill(name);
      await page.locator('[data-construct-name]').dispatchEvent('change');
      const slots = await page.locator('[data-construct-module]').evaluateAll(rows => rows.map(row => row.dataset.constructModule));
      for (const slot of slots) {
        const prefix = `[data-construct-module="${slot}"]`;
        const templates = await page.locator(`${prefix} [data-construct-template] option`)
          .evaluateAll(rows => rows.map(row => row.value));
        for (const template of templates) {
          await page.locator(`${prefix} [data-construct-template]`).selectOption(template);
          if (await page.locator(`${prefix} [data-construct-material] option`).count() > 1) break;
        }
        await firstOption(`${prefix} [data-construct-material]`);
      }
      if (passive) {
        const field = '[data-construct-ability="2"]';
        await page.locator(`${field} [data-ca="enabled"]`).check();
        await page.locator(`${field} [data-ca="mode"]`).selectOption('passive');
        await page.locator(`${field} [data-ca-passive-effect="1"] [data-cpe="type"]`).selectOption('buff');
      }
      await click('确认扣料并制造');
      assert.equal(await page.locator('.crypt-lord-workshop footer[data-error="true"]').count(), 0,
        await page.locator('.crypt-lord-workshop footer').textContent());
      assert.ok(await record(name), await page.locator('.crypt-lord-workshop footer').textContent());
      assert.equal((await record(name)).$造物类型, type);
    }
    await button('打开制造工坊').click(); await idle();
    await manufacture('机械奇物', '机械甲', true);
    assert.equal(await quantity(), 56);
    assert.equal((await record('机械甲')).能力清单.some(row => row.effects?.some(effect => effect.duration === 99)), true);
    await command('construct-open').click(); await idle();
    await command('construct-module-open').first().click(); await idle();
    await firstOption('[data-refit-material]');
    await click('确认全额重做此槽');
    assert.equal(await quantity(), 55);
    await command('construct-ability-open').first().click(); await idle();
    await page.locator('[data-ca="description"]').fill('准确瞄准目标');
    await click('保存能力栏');
    assert.equal(await quantity(), 55);
    await command('construct-ability-open').first().click(); await idle();
    await page.locator('[data-ca="damage-type"]').selectOption('physical');
    await firstOption('[data-ability-material]');
    await click('保存能力栏');
    assert.ok(await quantity() < 55);
    await page.evaluate(() => {
      const data = preview.data, rec = data.stat_data.$专属玩法.通识者途径.制造玩法.造物列表.机械甲;
      rec.当前活力 = Math.round(rec.活力 * .5); preview.data = data;
    });
    await click('重新读取');
    await command('construct-open').click(); await idle();
    await click('维修');
    const beforeRepair = await quantity();
    await page.locator('[data-repair-material]').first().fill('2');
    await click('确认材料维修');
    const repaired = await record('机械甲');
    assert.equal(repaired.当前活力, repaired.活力);
    assert.ok(await quantity() < beforeRepair);
    await click('授予完全自主权');
    await page.locator('[data-construct-autonomy-field="性格"]').fill('自主守护工坊');
    await button('确认授予完全自主权').click();
    await button('演绎制造并觉醒').waitFor();
    assert.equal(await page.evaluate(() => preview.data.npc_data.机械甲), undefined);
    await button('演绎制造并觉醒').click(); await idle();
    assert.equal(await page.evaluate(() => preview.data.npc_data.机械甲.$完全自主造物), true);
    await page.waitForFunction(() => preview.inputEvents === 1);
    assert.match(await page.locator('#send_textarea').inputValue(), /机械甲/);
    await page.evaluate(() => {
      const data = preview.data;
      data.npc_data.机械甲.事件历史 = { 工坊: '守护成功' };
      data.npc_data.机械甲.关键记忆.测试 = '保留自主经历';
      preview.data = data;
    });
    await click('重新读取');
    await command('construct-open').click(); await idle();
    await click('收回完全自主权');
    await click('授予完全自主权');
    await click('确认授予完全自主权');
    assert.equal(await page.evaluate(() => preview.data.npc_data.机械甲.关键记忆.测试), '保留自主经历');
    assert.equal(await page.evaluate(() => preview.data.npc_data.机械甲.事件历史.工坊), '守护成功');
    assert.equal(await page.evaluate(() => preview.inputEvents), 1);
    promptValue = '工坊守卫';
    await click('改名');
    assert.equal(await page.evaluate(() => preview.data.npc_data.工坊守卫.名称), '工坊守卫');
    await click('报废');
    assert.equal(await page.evaluate(() => preview.data.npc_data.工坊守卫), undefined);
    await manufacture('魔偶', '魔偶乙');
    assert.equal(await page.evaluate(() => preview.requests.length), 0);
    await click('选择来源加工');
    await page.locator('.ppw-material-source-cb').first().check();
    await page.locator('.ppw-material-source-qty').first().fill('1');
    await click('批量认定');
    assert.equal(await page.evaluate(() => preview.requests[0].custom_api), undefined);
    assert.equal(await page.evaluate(() => preview.requests[0].ordered_prompts.at(-1).content.includes('隐藏分析')), false);
    await click('选择这种材质');
    for (const [index, operation] of ['拆解', '分离', '精炼'].entries())
      await page.locator(`[data-material-operation="${index}"]`).selectOption(operation);
    await click('开始加工');
    assert.equal(await page.locator('.crypt-lord-workshop footer[data-error="true"]').count(), 0,
      await page.locator('.crypt-lord-workshop footer').textContent());
    await click('处理下一项');
    await click('返回材料仓库');
    const panel = page.locator('.crypt-lord-workshop');
    assert.equal(await panel.evaluate(node => node.scrollWidth > node.clientWidth), false);
    assert.equal(await panel.locator('main').evaluate(node => node.scrollWidth > node.clientWidth), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const before = await panel.boundingBox(), header = await panel.locator('header').boundingBox();
    await page.mouse.move(header.x + 20, header.y + 17);
    await page.mouse.down(); await page.mouse.move(header.x + 35, header.y + 42, { steps: 5 }); await page.mouse.up();
    if (width === 1280) assert.ok(Math.abs((await panel.boundingBox()).y - before.y) > 4);
    else {
      const moved = await panel.boundingBox();
      assert.ok(moved.y >= 8 && moved.y + moved.height <= 792);
    }
    // Native failure, stale verdict, battle guard and close cancellation never commit.
    const count = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => { preview.writeFailure = true; });
    await command('construct-open').click(); await idle();
    promptValue = '不能保存';
    await click('改名');
    await page.getByText(/模拟写入失败.*结果已保留/).waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    assert.ok(await record('魔偶乙'));
    await page.evaluate(() => { preview.writeFailure = false; });
    assert.equal(await button('重试保存').isEnabled(), true);
    assert.equal(await panel.locator('[data-ppw]:not(:disabled)').count(), 0);
    await click('重新读取');
    await click('选择来源加工');
    await page.locator('.ppw-material-source-cb').first().check();
    await page.evaluate(() => preview.hold());
    const requests = await page.evaluate(() => preview.requests.length);
    await button('批量认定').click();
    await page.waitForFunction(n => preview.requests.length > n, requests);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前活力 = 17; preview.data = data;
      preview.release('<材料认定>\n1|1|通过|金属|钢|序列4|无|坚硬,耐磨|1|线索|拆解>分离>精炼|结果\n</材料认定>');
    });
    await idle();
    await page.getByText(/原生楼层.*变化.*重新读取/).waitFor();
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await click('重新读取');
    assert.equal(await button('制造魔偶').isDisabled(), true);
    await page.evaluate(() => {
      const data = preview.data; delete data.cryptLord.teamBattle; preview.data = data;
    });
    await click('重新读取');
    await click('选择来源加工');
    await page.locator('.ppw-material-source-cb').first().check();
    await page.evaluate(() => preview.hold());
    const held = await page.evaluate(() => preview.requests.length);
    await button('批量认定').click();
    await page.waitForFunction(n => preview.requests.length > n, held);
    await button('关闭造物管理').click();
    await page.evaluate(() => preview.release('malformed'));
    await button('打开制造工坊').click(); await idle();
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    if (width === 1280) {
      await command('construct-open').click(); await idle();
      await click('授予完全自主权');
      await button('确认授予完全自主权').click();
      await button('不演绎').waitFor();
      await button('关闭造物管理').click();
      await button('打开制造工坊').click(); await idle();
      assert.equal(await page.evaluate(() => preview.writes.length), count);
      assert.equal(await page.evaluate(() => preview.data.npc_data.魔偶乙), undefined);
      await command('construct-open').click(); await idle();
      await click('授予完全自主权');
      await page.evaluate(() => { preview.writeFailure = true; });
      await button('确认授予完全自主权').click();
      await button('演绎制造并觉醒').waitFor();
      await button('演绎制造并觉醒').click(); await idle();
      await page.getByText(/模拟写入失败.*结果已保留/).waitFor();
      assert.equal(await page.evaluate(() => preview.inputEvents), 1);
      assert.equal(await page.evaluate(() => preview.data.npc_data.魔偶乙), undefined);
      const modelCount = await page.evaluate(() => preview.requests.length);
      await page.evaluate(() => { preview.writeFailure = false; });
      await click('重试保存');
      assert.equal(await page.evaluate(() => preview.writes.length), count + 1);
      assert.equal(await page.evaluate(() => preview.data.npc_data.魔偶乙.$完全自主造物), true);
      assert.equal(await page.evaluate(() => preview.inputEvents), 2);
      assert.equal(await page.evaluate(() => preview.requests.length), modelCount);
      await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.workshopUi'].open());
      assert.equal(await page.evaluate(() => preview.inputEvents), 2);
      await page.evaluate(() => {
        preview.writeFailure = false;
        const data = preview.data;
        data.stat_data.$专属玩法.通识者途径.制造玩法 ||= { 版本: 1, 造物列表: {} };
        data.stat_data.$专属玩法.通识者途径.制造玩法.版本 = 99;
        preview.data = data;
      });
      await click('重新读取');
      await command('construct-open').click(); await idle();
      await page.getByText('不支持此制造工坊版本', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => preview.writes.length), count + 1);
    }
    await page.evaluate(() => preview.changeChat());
    assert.equal(await panel.getAttribute('data-open'), 'false');
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Workshop browser: desktop/mobile manufacture, refits, repair, autonomy, native input, processing, transaction guards and layout passed.');
} finally { await browser.close(); }
