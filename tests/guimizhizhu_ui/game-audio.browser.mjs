import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/game-audio.preview.html');
    const war = page.locator('#war'), campaign = page.locator('#campaign'), duel = page.locator('#duel');
    await war.getByRole('button').click();
    await war.getByRole('slider', { name: '音乐' }).fill('23');
    await campaign.getByRole('button').click();
    assert.equal(await campaign.getByRole('slider', { name: '音乐' }).inputValue(), '23');
    await campaign.getByRole('checkbox', { name: '静音' }).check();
    await war.getByRole('button').click();
    assert.equal(await war.getByRole('checkbox', { name: '静音' }).isChecked(), true);
    await duel.getByRole('button').click();
    assert.equal(await duel.getByRole('checkbox', { name: '静音' }).isChecked(), false);
    assert.equal(await duel.getByRole('slider', { name: '音乐' }).inputValue(), '50');
    await duel.getByRole('slider', { name: '音效' }).fill('61');
    await page.evaluate(() => document.fonts.load('900 16px "Font Awesome 6 Free"'));
    assert.notEqual(await duel.locator('i').evaluate(node => getComputedStyle(node, '::before').content), 'none');
    const pop = duel.getByRole('group');
    const rect = await pop.boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
    await duel.getByRole('slider', { name: '音效' }).press('Escape');
    assert.equal(await pop.isVisible(), false);
    assert.equal(await duel.getByRole('button').getAttribute('aria-expanded'), 'false');
    await page.reload();
    await campaign.getByRole('button').click();
    assert.equal(await campaign.getByRole('checkbox', { name: '静音' }).isChecked(), true);
    assert.equal(await campaign.getByRole('slider', { name: '音乐' }).inputValue(), '23');

    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/war-replay.preview.html');
    await page.evaluate(() => {
      const modules = cryptLord.__stage1Modules;
      window.audioReplayFixture = { ticks: 30, winner: 'A', reason: 'elimination', conf: {
        cols: 8, rows: 6, tickMs: 100, battleSecondsPerTick: 36,
      }, units: [
        { id: 'a', name: '铁路重炮', troopId: 'railwayGun', team: 'A', initialHp: 100, hp: 90, alive: true, x: 4, y: 4 },
        { id: 'b', name: '敌方步兵', troopId: 'militia', team: 'B', initialHp: 100, hp: 0, alive: false, x: 3, y: 1 },
      ], events: [
        { tick: 0, type: 'spawn', id: 'a', hp: 100, x: 4, y: 4 },
        { tick: 0, type: 'spawn', id: 'b', hp: 100, x: 3, y: 1 },
        { tick: 2, type: 'attack_start', id: 'a', from: { x: 4, y: 4 } },
        { tick: 3, type: 'hit', id: 'b', hp: 80, amount: 20, sourceId: 'a' },
        { tick: 10, type: 'attack_start', id: 'b', from: { x: 3, y: 1 } },
        { tick: 11, type: 'hit', id: 'a', hp: 90, amount: 10, sourceId: 'b' },
        { tick: 29, type: 'attack_start', id: 'a', from: { x: 4, y: 4 } },
        { tick: 30, type: 'hit', id: 'b', hp: 0, amount: 80, sourceId: 'a' },
        { tick: 30, type: 'death', id: 'b', killerId: 'a' },
      ] };
      modules['cryptLord.warReplayUi'].open(audioReplayFixture);
    });
    const replay = page.getByRole('dialog', { name: '战争回放' });
    await replay.getByRole('button', { name: '领地战争音量' }).click();
    await replay.getByRole('checkbox', { name: '静音' }).uncheck();
    await replay.getByRole('slider', { name: '音效' }).fill('70');
    await replay.getByRole('button', { name: '领地战争音量' }).click();
    await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.gameAudio'].preload());
    await replay.getByTitle('播放', { exact: true }).click();
    await page.waitForFunction(() => audioPreview.voices.length >= 1);
    await replay.getByTitle('暂停', { exact: true }).click();
    const voiceCount = await page.evaluate(() => audioPreview.voices.length);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => audioPreview.voices.length), voiceCount);
    await replay.locator('.crypt-lord-war-replay__seek').fill('6');
    assert.equal(await page.evaluate(() => audioPreview.voices.length), voiceCount, 'seek is silent');
    await replay.getByTitle('播放速度').selectOption('4');
    await replay.getByTitle('播放', { exact: true }).click();
    await page.waitForFunction(() => audioPreview.voices.length > 1);
    await replay.getByTitle('暂停', { exact: true }).click();
    const tick = await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.warReplayUi'].status().tick);
    await page.evaluate(() => {
      window.pageHidden = true;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => pageHidden });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.evaluate(() => audioPreview.decks.every(deck => deck.paused)), true);
    await replay.getByTitle('播放', { exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.warReplayUi'].status().tick), tick);
    await page.evaluate(() => { pageHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await replay.getByTitle('直接结算', { exact: true }).click();
    assert.equal(await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.gameAudio'].status().group), 'battle',
      'original war BGM continues through paused/final replay');
    await replay.getByTitle('重头', { exact: true }).click();
    await replay.getByRole('button', { name: '领地战争音量' }).click();
    const audioPanel = replay.getByRole('group', { name: '音量设置' }), bounds = await audioPanel.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    assert.equal(await replay.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    await replay.getByRole('slider', { name: '音乐' }).press('Escape');
    assert.equal(await replay.isVisible(), true, 'first Escape dismisses only audio settings');
    await page.keyboard.press('Escape');
    await replay.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => cryptLord.__stage1Modules['cryptLord.gameAudio'].status().group === null);
    const noLate = await page.evaluate(() => audioPreview.voices.length);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => audioPreview.voices.length), noLate);
    await page.locator('#open').click();
    await page.evaluate(() => {
      const snapshot = structuredClone(audioReplayFixture);
      snapshot.conf.rules = { recordEvents: false };
      cryptLord.__stage1Modules['cryptLord.warReplayUi'].open(snapshot);
    });
    assert.equal(await replay.getByTitle('播放', { exact: true }).isEnabled(), false);
    assert.equal(await replay.locator('.crypt-lord-war-replay__seek').isEnabled(), false);
    assert.equal(await page.evaluate(() => cryptLord.__stage1Modules['cryptLord.warReplayUi'].status().tick), 30);
    await page.evaluate(() => replayPreview.change());
    await replay.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => cryptLord.__stage1Modules['cryptLord.gameAudio'].status().group === null);
    await page.evaluate(() => {
      cryptLord.__stage1Modules['cryptLord.warReplayUi'].dispose();
      cryptLord.__stage1Modules['cryptLord.gameAudioControl'].dispose();
      cryptLord.__stage1Modules['cryptLord.gameAudio'].dispose();
    });
    assert.equal(await page.locator('.crypt-lord-war-replay').count(), 0);
    assert.equal(await page.evaluate(() => audioPreview.decks.every(deck => deck.paused && !deck.src)), true);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Audio complete browser ${width}: synced settings, persisted scopes, real decode/SFX, replay timing, pause/seek/speed, visibility and teardown OK`);
  }
} finally { await browser.close(); }
