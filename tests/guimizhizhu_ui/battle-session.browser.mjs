import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({
  headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const url = 'http://127.0.0.1:8791/tests/guimizhizhu_ui/team-battle.preview.html?personal=1';
async function open(page) {
  await page.goto(url);
  await page.waitForFunction(() => window.preview?.data?.stat_data?.当前活力 === 10000);
  await page.locator('#open').click();
  await page.getByRole('button', { name: '开始个人战斗' }).waitFor();
}
async function commit(page, command) {
  const writes = await page.evaluate(() => preview.writes);
  await command();
  try { await page.waitForFunction(value => preview.writes > value, writes, { timeout: 5000 }); }
  catch (error) {
    throw Error(JSON.stringify(await page.evaluate(() => ({
      notice: document.body.dataset.notice, data: preview.data,
    }))), { cause: error });
  }
}
async function attack(page, id, target) {
  const controls = page.locator('.crypt-lord-game-shell__battle-actions select');
  await controls.first().selectOption(id);
  await controls.last().selectOption(target);
  await commit(page, () => page.getByRole('button', { name: '执行', exact: true }).click());
}
async function retryOnce(page, command, width) {
  const before = await page.evaluate(() => ({ writes: preview.writes, requests: preview.requests, data: preview.data }));
  await page.evaluate(() => { preview.writeFailure = true; });
  await command();
  const retry = page.getByRole('button', { name: '重试保存', exact: true });
  await retry.waitFor();
  assert.equal(await page.evaluate(() => preview.writes), before.writes);
  assert.deepEqual(await page.evaluate(() => preview.data), before.data);
  assert.equal(await page.locator('.crypt-lord-game-shell__dialog-body button:not([disabled])')
    .evaluateAll(nodes => nodes.every(node => node.closest('[data-battle-recovery]'))), true);
  if (width) await page.screenshot({ path: path.join(os.tmpdir(), `native-battle-pending-${width}.png`) });
  const requests = await page.evaluate(() => preview.requests);
  await page.evaluate(() => { preview.writeFailure = false; });
  await commit(page, () => retry.click());
  await retry.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => preview.requests), requests);
  assert.equal(await page.evaluate(() => preview.writes), before.writes + 1);
}
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await open(page);
    assert.equal(await page.evaluate(() => modules['cryptLord.gameAudio'].status().group), 'prep');
    const initial = await page.evaluate(() => preview.data);
    await page.locator('.crypt-lord-game-shell__battle-setup input').nth(1).fill('10000');
    await commit(page, () => page.getByRole('button', { name: '开始个人战斗' }).click());
    assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.mode), 'practice');
    assert.equal(await page.evaluate(() => preview.data.cryptLord.personalBattle), undefined);
    assert.deepEqual(await page.evaluate(() => {
      const audio = modules['cryptLord.gameAudio'].status(); return [audio.group, audio.scope];
    }), ['battle', 'duel']);
    const audioControl = page.locator('.crypt-lord-game-shell__dialog-header .crypt-lord-audio');
    await audioControl.getByRole('button').click();
    await audioControl.getByRole('slider', { name: '音效' }).fill('65');
    assert.equal(await page.evaluate(() => modules['cryptLord.gameAudio'].get('duel').sfx), .65);
    await page.evaluate(() => document.fonts.load('900 16px "Font Awesome 6 Free"'));
    assert.notEqual(await audioControl.locator('i').evaluate(node =>
      getComputedStyle(node, '::before').content), 'none');
    await audioControl.getByRole('button').click();
    assert.equal(await page.locator('.crypt-lord-game-shell__battle-cell').count(), 120);
    await page.locator('.crypt-lord-game-shell__battle-board').scrollIntoViewIfNeeded();
    const actions = page.locator('.crypt-lord-game-shell__battle-actions select');
    await actions.first().selectOption('skill:能力:0');
    await actions.last().selectOption('$practice');
    const spirit = await page.evaluate(() => preview.data.stat_data.当前灵性);
    await retryOnce(page, () => page.getByRole('button', { name: '执行', exact: true }).click(), width);
    assert.equal(await page.evaluate(() => preview.data.stat_data.当前灵性), spirit - 2);
    assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.phase), 'tactic');
    await page.evaluate(() => {
      preview.tacticalResponse = JSON.stringify({ NPC行动: [{ 角色: '$practice', 行动: '待命' }] });
    });
    await retryOnce(page, () => page.getByRole('button', { name: '请求战术裁决', exact: true }).click());
    assert.equal(await page.evaluate(() => preview.requests), 2, '战术保存重试不再次裁决');
    await attack(page, 'skill:能力:1', '$practice');
    await page.waitForFunction(() => audioPreview.voices.length > 0);
    assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.result), 'victory');
    await retryOnce(page, () => page.getByRole('button', { name: '确认战报与经验' }).click());
    assert.equal(await page.evaluate(() => preview.data.stat_data.$战斗经验), undefined);
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), initial.npc_data);
    await page.getByRole('button', { name: '填入原生输入框' }).click();
    await page.waitForFunction(() => document.getElementById('send_textarea').value.length > 0);
    assert.match(await page.locator('#send_textarea').inputValue(), /战斗|终结远击/);
    assert.equal(await page.evaluate(() => preview.sends), 0);
    const opponent = page.locator('.crypt-lord-game-shell__battle-setup select');
    await opponent.selectOption('敌甲');
    await commit(page, () => page.getByRole('button', { name: '开始个人战斗' }).click());
    assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.mode), 'duel');
    await attack(page, 'skill:能力:0', '敌甲');
    await commit(page, () => page.getByRole('button', { name: '跳过战术阶段' }).click());
    await attack(page, 'skill:能力:1', '敌甲');
    await commit(page, () => page.getByRole('button', { name: '确认战报与经验' }).click());
    assert.equal(await page.evaluate(() => preview.data.npc_data.敌甲.当前活力), 0);
    assert.ok(await page.evaluate(() => preview.data.stat_data.$战斗经验 > 0));
    assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.settled), true);
    assert.equal(await page.evaluate(() => modules['cryptLord.gameAudio'].status().group), 'prep');
    assert.equal(await page.evaluate(() => preview.sends), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('.crypt-lord-game-shell__dialog-close').last().click();
    await page.waitForFunction(() => modules['cryptLord.gameAudio'].status().group === null);
    const voices = await page.evaluate(() => audioPreview.voices.length);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => audioPreview.voices.length), voices);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
  page.on('dialog', dialog => dialog.accept());
  await open(page);
  await retryOnce(page, () => page.getByRole('button', { name: '开始个人战斗' }).click());
  assert.equal(await page.evaluate(() => preview.requests), 1, '开战失败重试不能再次请求战场');
  for (const kind of ['lostReceipt', 'failReadAfterWrite', 'noWrite', 'conflictAfterWrite']) {
    await open(page);
    await page.evaluate(key => { preview.transaction.flags[key] = true; }, kind);
    await page.getByRole('button', { name: '开始个人战斗' }).click();
    if (kind === 'lostReceipt') {
      await page.waitForFunction(() => document.body.dataset.notice?.includes('确认保存'));
      assert.equal(await page.getByRole('button', { name: '重试保存', exact: true }).isVisible(), false);
    } else if (kind === 'failReadAfterWrite') {
      const inspect = page.getByRole('button', { name: '核对保存', exact: true });
      await inspect.waitFor();
      assert.equal(await page.getByRole('button', { name: '重试保存', exact: true }).count(), 0);
      await page.evaluate(() => { preview.transaction.flags.readFailure = false; });
      await inspect.click();
      await inspect.waitFor({ state: 'hidden' });
    } else if (kind === 'noWrite') {
      await page.getByRole('button', { name: '重试保存', exact: true }).waitFor();
      await page.evaluate(() => { preview.transaction.flags.noWrite = false; });
      await commit(page, () => page.getByRole('button', { name: '重试保存', exact: true }).click());
    } else {
      await page.waitForFunction(() => document.body.dataset.notice?.includes('请重新读取'));
      assert.equal(await page.getByRole('button', { name: '重试保存', exact: true }).isVisible(), false);
      await page.getByRole('button', { name: '重新读取', exact: true }).click();
    }
    assert.equal(await page.evaluate(() => preview.writes), 1, kind);
    assert.equal(await page.evaluate(() => preview.requests), 1, kind);
  }
  for (const kind of ['branch', 'metadata', 'locked', 'settings', 'script', 'chat', 'cancel', 'quiet']) {
    await open(page);
    await page.evaluate(() => preview.holdScene());
    await page.getByRole('button', { name: '开始个人战斗' }).click();
    await page.waitForFunction(() => preview.requests === 1);
    if (kind === 'cancel') await page.getByRole('button', { name: '取消', exact: true }).click();
    else await page.evaluate(key => {
      if (['branch', 'metadata', 'locked'].includes(key)) preview.transaction.flags[key] = 'changed';
      if (key === 'settings') preview.transaction.settings({ useCustomApi: true, apiUrl: 'changed', model: 'changed' });
      if (key === 'script') preview.transaction.script('other-script');
      if (key === 'chat') preview.transaction.chat('other-chat');
      if (key === 'quiet') {
        preview.emit('start', 'quiet_prompt', {}, false);
        preview.emit('start', 'normal', { quiet_prompt: true }, false);
        preview.emit('start', 'normal', {}, true);
      }
    }, kind);
    await page.evaluate(() => preview.releaseScene());
    if (kind === 'quiet') await page.waitForFunction(() => preview.writes === 1);
    else if (kind === 'cancel') await page.waitForTimeout(150);
    else await page.waitForFunction(() => document.body.dataset.notice?.startsWith('error:'));
    assert.equal(await page.evaluate(() => preview.writes), kind === 'quiet' ? 1 : 0, kind);
    assert.equal(await page.evaluate(() => preview.requests), 1, kind);
  }
  for (const kind of ['user', 'hidden']) {
    await open(page);
    await page.evaluate(key => { preview.transaction.flags[key] = true; }, kind);
    await page.getByRole('button', { name: '开始个人战斗' }).click();
    await page.waitForFunction(() => document.body.dataset.notice?.startsWith('error:'));
    assert.equal(await page.evaluate(() => preview.requests), 0);
    assert.equal(await page.evaluate(() => preview.writes), 0);
  }
  await open(page);
  const dialog = page.locator('.crypt-lord-game-shell__dialog');
  await dialog.evaluate(node => {
    const nodes = [...node.querySelectorAll('button, input, textarea, select, summary')]
      .filter(item => !item.disabled && item.getClientRects().length);
    nodes.at(-1).focus();
  });
  await page.keyboard.press('Tab');
  assert.equal(await dialog.evaluate(node => [...node.querySelectorAll('button, input, textarea, select, summary')]
    .filter(item => !item.disabled && item.getClientRects().length)[0] === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.crypt-lord-game-shell__modal').getAttribute('data-open'), 'false');
  assert.equal(await page.locator('#open').evaluate(node => node === document.activeElement), true);
  for (const kind of ['close', 'swipe', 'generation', 'failure']) {
    await open(page);
    const before = await page.evaluate(() => preview.data);
    await page.evaluate(() => preview.holdScene());
    await page.getByRole('button', { name: '开始个人战斗' }).click();
    await page.waitForFunction(() => preview.requests === 1);
    if (kind === 'close') await page.locator('.crypt-lord-game-shell__dialog-close').last().click();
    if (kind === 'swipe') await page.evaluate(() => preview.switchSwipe());
    if (kind === 'generation') await page.evaluate(() => preview.emit('start', 'normal', {}, false));
    if (kind === 'failure') await page.evaluate(() => { preview.writeFailure = true; });
    await page.evaluate(() => preview.releaseScene());
    if (['swipe', 'failure'].includes(kind))
      await page.waitForFunction(() => document.body.dataset.notice?.startsWith('error:'));
    else {
      await page.evaluate(() => preview.emit('end'));
      await page.waitForTimeout(150);
    }
    assert.equal(await page.evaluate(() => preview.writes), 0, kind);
    assert.deepEqual(await page.evaluate(() => preview.data), before, kind);
  }
  // Adjacent team launch uses the same preparation and native-save transaction.
  await open(page);
  await page.locator('.crypt-lord-game-shell__team-pool input[data-side=enemy][value="敌甲"]').check();
  await commit(page, () => page.getByRole('button', { name: '开始多人战斗' }).click());
  assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.mode), 'team');
  assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.units.length), 2);
  await attack(page, 'skill:能力:0', '敌甲');
  await commit(page, () => page.getByRole('button', { name: '结束战斗', exact: true }).click());
  assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.result), 'draw');
  await commit(page, () => page.getByRole('button', { name: '放弃结算', exact: true }).click());
  assert.equal(await page.evaluate(() => preview.data.cryptLord.teamBattle.settled), true);
  await page.evaluate(() => preview.emit('chat'));
  await page.evaluate(() => preview.refresh());
  assert.equal(await page.locator('.crypt-lord-game-shell__modal').getAttribute('data-open'), 'false');
  assert.equal(await page.evaluate(() => modules['cryptLord.gameAudio'].status().group), null);
  await page.close();
  console.log('通过：桌面/移动端个人与训练整链、行动及战报原结果重试、回执与只读核对、来源/API/取消边界和组队入口；未操作真实酒馆。');
} finally {
  await browser.close();
}
