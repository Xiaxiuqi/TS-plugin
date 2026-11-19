import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(10000);
    page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/player-progression.preview.html');
    const panel = page.getByRole('dialog', { name: '属性上限与重算', exact: true });
    const settings = page.getByRole('dialog', { name: '系统设置', exact: true });
    const notice = text => panel.getByRole('status').filter({ hasText: text }).waitFor();
    const settingsNotice = text => settings.locator('[data-progression-status]').filter({ hasText: text }).waitFor();
    const idle = () => page.waitForFunction(() => !preview.api.status().busy &&
      document.querySelector('.crypt-lord-attributes').dataset.open === 'true');
    const reload = async () => { await panel.getByRole('button', { name: '重新读取', exact: true }).click(); await idle(); };
    const repair = async () => {
      await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).click(); await notice('确认修正');
      await panel.getByRole('button', { name: '确认保存属性修正', exact: true }).click(); await idle();
    };
    const count = () => page.evaluate(() => preview.flags.writes.length);
    const stat = () => page.evaluate(() => preview.floors[2].data.stat_data);
    const layout = async target => {
      assert.equal(await target.evaluate(node => node.scrollWidth <= node.clientWidth &&
        node.querySelector('main').scrollWidth <= node.querySelector('main').clientWidth &&
        node.getBoundingClientRect().right <= innerWidth && node.getBoundingClientRect().bottom <= innerHeight &&
        [...node.querySelectorAll('button')].filter(button => button.getClientRects().length)
          .every(button => button.scrollHeight <= button.clientHeight + 1)), true);
    };
    await page.locator('#attributes').click(); await idle();
    assert.match(await panel.textContent(), /首次初始化/);
    assert.equal(await page.evaluate(() => preview.untouched), true);
    await layout(panel); await page.screenshot({ path: path.join(os.tmpdir(), `progression-first-${width}.png`) });
    await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).click(); await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false); assert.equal(await page.evaluate(() => preview.untouched), true);
    await page.locator('#attributes').click(); await idle();
    await panel.getByRole('combobox', { name: '属性楼层' }).selectOption('0'); await idle(); await notice('历史楼层只读');
    assert.equal(await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).isDisabled(), true);
    await panel.getByRole('combobox', { name: '属性楼层' }).selectOption('2'); await idle();
    await repair(); await notice('修正已保存');
    assert.equal(await count(), 1); assert.equal((await stat()).当前活力, 100); assert.equal((await stat()).initialized, true);
    await page.evaluate(() => preview.save({ 当前活力: 30 }));
    await page.evaluate(() => preview.advance({ 消化进度: 99, _lastDigestion: 99, initialized: false }));
    await idle(); assert.equal((await stat()).消化进度, 13); assert.equal((await stat()).当前活力, 30);
    await page.evaluate(() => preview.advance({ 当前序列: '序列9-占卜家', 消化进度: 99, $战斗经验: 210 }));
    await idle(); const promoted = await stat();
    assert.equal(promoted.消化进度, 0); assert.equal(promoted.基础灵性, 350);
    assert.equal(promoted.能力体系, '神秘法术系'); assert.equal(promoted.$战斗经验等级, 2);
    assert.equal(promoted.当前活力, promoted.活力); assert.equal(promoted.活力, 104);
    assert.equal((await stat()).序列能力列表['序列9-占卜家'][0].名称, '灵视');
    assert.equal(await count(), 4); await layout(panel);
    await page.evaluate(() => preview.save({ 当前活力: 10, $战斗经验: 175 }));
    await idle(); assert.equal((await stat()).当前活力, 12);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.locator('#settings').click(); await settingsNotice('已读取');
    assert.equal(await page.evaluate(() => preview.flags.configWrites.length), 0);
    const input = settings.getByRole('spinbutton', { name: '消化进度单次增幅上限', exact: true });
    const saveSetting = async value => {
      await input.fill(value); await settings.getByRole('button', { name: '保存成长设置', exact: true }).click();
    };
    const reloadSettings = async () => {
      await settings.getByRole('button', { name: '重新读取成长设置', exact: true }).click(); await settingsNotice('已读取');
    };
    await saveSetting('0'); await settingsNotice('整数'); assert.equal(await input.isEnabled(), true);
    await page.evaluate(() => { preview.flags.failConfigWrite = true; });
    await saveSetting('8'); await settingsNotice('保存失败'); assert.equal(await input.inputValue(), '8');
    await page.evaluate(() => { preview.flags.failConfigWrite = false; });
    await settings.getByRole('button', { name: '保存成长设置', exact: true }).click(); await settingsNotice('已保存');
    assert.equal(await page.evaluate(() => preview.variables['cryptLord.playerProgression'].maxDigestionDelta), 8);
    assert.equal(await page.evaluate(() => preview.variables['cryptLord.variableSettlement'].enabled), false);
    await layout(settings); await page.screenshot({ path: path.join(os.tmpdir(), `progression-settings-${width}.png`) });
    await page.evaluate(() => preview.save({ 消化进度: 99 })); assert.equal((await stat()).消化进度, 8);
    await input.fill('7');
    await page.evaluate(() => { preview.variables['cryptLord.playerProgression'].maxDigestionDelta = 6; });
    await settings.getByRole('button', { name: '保存成长设置', exact: true }).click(); await settingsNotice('已变化');
    await reloadSettings(); assert.equal(await input.inputValue(), '6');
    await page.evaluate(() => { preview.flags.afterConfigFail = true; });
    await saveSetting('9'); await settingsNotice('已保存，但复核失败');
    assert.equal(await input.isDisabled(), true);
    await page.evaluate(() => { preview.flags.afterConfigFail = false; preview.flags.failConfig = false; });
    await reloadSettings(); assert.equal(await input.inputValue(), '9');
    const configCount = await page.evaluate(() => preview.flags.configWrites.length);
    await page.evaluate(() => preview.hold('saveConfig'));
    await saveSetting('10'); await page.waitForFunction(() => preview.flags.waiting > 0);
    await settings.getByRole('button', { name: '关闭', exact: true }).click(); await page.evaluate(() => preview.release());
    await page.waitForFunction(() => !preview.flags.waiting);
    await page.locator('#settings').click(); await settingsNotice('未保存');
    assert.equal(await page.evaluate(() => preview.flags.configWrites.length), configCount);
    assert.equal(await input.inputValue(), '10');
    await reloadSettings(); assert.equal(await input.inputValue(), '9');
    await page.evaluate(() => preview.hold('saveConfig'));
    await saveSetting('10'); await page.waitForFunction(() => preview.flags.waiting > 0);
    await page.evaluate(() => { void preview.emit('CHAT_CHANGED'); preview.release(); });
    await page.waitForFunction(() => !preview.flags.waiting);
    assert.equal(await settings.isVisible(), false);
    assert.equal(await page.evaluate(() => preview.flags.configWrites.length), configCount);
    await page.locator('#attributes').click(); await idle();
    await page.evaluate(() => { preview.floors[2].data.stat_data.基础活力 = 1; });
    await reload(); const beforeConflict = await count();
    await panel.getByRole('button', { name: '修正本楼层属性', exact: true }).click();
    await page.evaluate(() => { preview.books['1源堡'][0].content = '{"10":600,"9":1100,"8":2000}'; });
    await panel.getByRole('button', { name: '确认保存属性修正', exact: true }).click(); await idle(); await notice('未保存');
    assert.equal(await count(), beforeConflict);
    await reload(); await page.evaluate(() => { preview.flags.failWrite = true; });
    await repair(); await notice('保存失败');
    await page.evaluate(() => { preview.flags.failWrite = false; }); await reload(); await repair(); await notice('修正已保存');
    await page.evaluate(() => { preview.floors[2].data.cryptLord.teamBattle = { status: 'active' }; return preview.emit('MESSAGE_UPDATED'); });
    await idle(); await notice('结束并结算战斗');
    await page.evaluate(() => { delete preview.floors[2].data.cryptLord.teamBattle; preview.flags.failBook = true; });
    await reload(); await notice('读取失败'); assert.equal(await panel.locator('main section').count(), 0);
    await page.evaluate(() => { preview.flags.failBook = false; }); await reload();
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal', {}, false)); await notice('等待完整楼层');
    await page.evaluate(() => preview.emit('GENERATION_STOPPED')); await idle();
    await page.evaluate(() => preview.hold('book')); await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await panel.getByRole('button', { name: '关闭', exact: true }).click(); await page.evaluate(() => preview.release());
    await page.waitForFunction(() => !preview.flags.waiting); assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => { preview.floors[2].data.stat_data.当前序列 = '序列8-小丑<img src=x onerror="window.bad=true">' + '长名字'.repeat(70); });
    await page.locator('#attributes').click(); await idle(); await layout(panel);
    assert.equal(await panel.locator('main img').count(), 0);
    await page.evaluate(() => { document.body.dataset.theme = 'light'; });
    const beforeDispose = await count();
    await page.evaluate(() => preview.hold('book')); await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await page.evaluate(() => { preview.dispose(); preview.release(); });
    await page.waitForFunction(() => !preview.flags.waiting);
    assert.equal(await count(), beforeDispose);
    assert.equal(await page.locator('.crypt-lord-attributes,.crypt-lord-system-settings').count(), 0);
    assert.equal(await page.evaluate(() => preview.protected), true); assert.deepEqual(errors, []);
    await page.close(); console.log(`完整玩家成长桌面/手机流程 ${width}px 通过`);
  }
} finally { await browser.close(); }
