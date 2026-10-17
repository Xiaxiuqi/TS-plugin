import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  'C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const server = createServer(async (request, response) => {
  try {
    const target = path.resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    if (!target.startsWith(root)) throw new Error('Invalid path');
    const content = await readFile(target);
    response.setHeader('Content-Type', target.endsWith('.css') ? 'text/css' : 'text/javascript');
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  for (const mobile of [true, false]) {
    const page = await browser.newPage({
      viewport: { width: mobile ? 390 : 1280, height: 844 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const contentDigest = createHash('sha256').update('手机正文').digest('hex');
    await page.addInitScript(({ contentDigest, mobile }) => {
      if (mobile) Object.defineProperty(window.crypto, 'subtle', { value: undefined });
      const ledger = {
        revision: 12, clock: { day: 18, storyTime: '2026-10-11 13:20', slot: '午后' },
        seeds: [], actors: [], guidance: { signals: [{ id: 'g1', text: '手机读取成功' }] },
      };
      const message = {
        mes: '手机正文',
        _qrf_world_simulation_state: {
          schemaVersion: 1,
          entries: { current: {
            anchor: { chatIdentity: 'mobile-test', messageKey: 'number:0', swipeId: '0', contentDigest },
            value: ledger,
          } },
        },
      };
      window.SillyTavern = {
        getCurrentChatId: () => 'mobile-test',
        getContext: () => ({ chat: [message] }),
      };
      if (!localStorage.getItem('acu_ws_panel_geometry_v1')) {
        localStorage.setItem('acu_ws_panel_geometry_v1', JSON.stringify({ left: 8, top: 50, width: 320, height: 430 }));
      }
    }, { contentDigest, mobile });
    await page.route('**/mobile-fixture.html', route => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>* { touch-action: pan-y !important; }
          #send_form { position: fixed; bottom: 0; left: 0; right: 0; }
          .qr--buttons { display: flex; gap: 5px; }
          .qr--button { padding: 5px; }</style><body>
        <form id="send_form" onsubmit="event.preventDefault(); window.testSends = (window.testSends || 0) + 1">
          <div id="qr--bar"><div class="qr--buttons"><button type="button" id="original-qr">原有 QR</button></div></div>
        </form>
        <script type="module" src="/public/acu_world_simulation/index.js"></script></body>`,
    }));
    const url = `http://127.0.0.1:${server.address().port}/mobile-fixture.html`;
    await page.goto(url);
    await page.locator('.acu-ws-orb').click();
    await page.locator('.acu-ws-body').getByText('手机读取成功', { exact: true }).waitFor();
    assert.doesNotMatch(await page.locator('.acu-ws-status').innerText(), /读取失败/);
    const panel = page.locator('.acu-ws-panel');
    const before = await panel.boundingBox();
    const header = await page.locator('.acu-ws-heading').boundingBox();
    const x = header.x + 20;
    const y = header.y + 12;
    if (mobile) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 24, y: y + 80 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 24, y + 80);
      await page.mouse.up();
    }
    const after = await panel.boundingBox();
    assert.ok(Math.abs(after.x - before.x - 24) < 2, `drag x: ${JSON.stringify({ before, after })}`);
    assert.ok(Math.abs(after.y - before.y - 80) < 2, `drag y: ${JSON.stringify({ before, after })}`);
    const resizeBy = async (dx, dy) => {
      const handle = await page.locator('.acu-ws-resize').boundingBox();
      const x = handle.x + handle.width / 2;
      const y = handle.y + handle.height / 2;
      if (mobile) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + dx, y + dy);
        await page.mouse.up();
      }
      const rect = await panel.boundingBox();
      assert.ok(Math.abs(rect.x - after.x) < 2 && Math.abs(rect.y - after.y) < 2,
        `resize must preserve top-left: ${JSON.stringify({ after, rect })}`);
      return rect;
    };
    const grown = await resizeBy(20, 50);
    assert.ok(Math.abs(grown.width - after.width - 20) < 2);
    assert.ok(Math.abs(grown.height - after.height - 50) < 2);
    const shrunk = await resizeBy(-500, -500);
    assert.ok(shrunk.width >= (mobile ? 300 : 350) && shrunk.height >= 300);
    const capped = await resizeBy(2000, 2000);
    assert.ok(capped.x + capped.width <= (mobile ? 390 : 1280) - 7);
    assert.ok(capped.y + capped.height <= 844 - 7);
    const resized = await resizeBy(grown.width - capped.width, grown.height - capped.height);
    assert.ok(Math.abs(resized.width - grown.width) < 2 && Math.abs(resized.height - grown.height) < 2);
    await page.reload();
    await page.locator('.acu-ws-orb').click();
    await page.locator('.acu-ws-body').getByText('手机读取成功', { exact: true }).waitFor();
    const restored = await panel.boundingBox();
    assert.ok(Math.abs(restored.y - after.y) < 2);
    assert.ok(Math.abs(restored.x - after.x) < 2);
    assert.ok(Math.abs(restored.width - resized.width) < 2 && Math.abs(restored.height - resized.height) < 2);
    await page.locator('.acu-ws-settings-toggle').click();
    await page.locator('[data-setting="nightTheme"]').check();
    assert.equal(await page.locator('.acu-ws-root.acu-ws-night').count(), 1);
    await page.locator('.acu-ws-minimize').click();
    assert.equal(await panel.isVisible(), false);
    await page.locator('.acu-ws-orb').click();
    assert.equal(await panel.isVisible(), true);
    if (mobile) {
      await page.locator('.acu-ws-settings-back').click();
      await page.screenshot({ path: path.join(os.tmpdir(), 'acu-world-simulation-mobile.png') });
      await page.locator('.acu-ws-settings-toggle').click();
    }
    const qr = page.locator('.acu-ws-qr-button');
    const qrSetting = page.locator('[data-setting="qrButtonEnabled"]');
    assert.equal(await qr.count(), 0);
    await qrSetting.check();
    await qr.waitFor();
    await page.locator('.acu-ws-minimize').click();
    assert.equal(await page.locator('.acu-ws-orb').isVisible(), false);
    await qr.click();
    assert.equal(await panel.isVisible(), true);
    assert.equal(await page.locator('.acu-ws-body').isVisible(), true);
    for (let toggle = 0; toggle < 3; toggle++) {
      assert.equal(await qr.getAttribute('aria-expanded'), 'true');
      await qr.click();
      assert.equal(await panel.isVisible(), false);
      assert.equal(await qr.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('.acu-ws-orb').isVisible(), false);
      await qr.click();
      assert.equal(await panel.isVisible(), true);
    }
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.locator('.acu-ws-settings-toggle').click();
      await qrSetting.uncheck();
      assert.equal(await qr.count(), 0);
      await page.locator('.acu-ws-minimize').click();
      assert.equal(await page.locator('.acu-ws-orb').isVisible(), true);
      await page.locator('.acu-ws-orb').click();
      await qrSetting.check();
      await page.locator('.acu-ws-minimize').click();
      await qr.click();
      assert.equal(await qr.count(), 1);
    }
    await page.reload();
    await qr.waitFor();
    assert.equal(await page.locator('.acu-ws-orb').isVisible(), false);
    await page.evaluate(() => document.querySelector('#qr--bar').remove());
    await page.locator('.acu-ws-orb').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      const bar = document.createElement('div');
      bar.id = 'qr--bar';
      document.querySelector('#send_form').append(bar);
    });
    await qr.waitFor();
    assert.equal(await page.locator('.acu-ws-orb').isVisible(), false);
    await page.evaluate(() => {
      document.querySelector('#qr--bar').remove();
      const popout = document.createElement('div');
      popout.id = 'qr--popout';
      popout.innerHTML = '<div class="qr--body"><div class="qr--buttons"><button type="button" id="original-qr">原有 QR</button></div></div>';
      document.querySelector('#send_form').append(popout);
    });
    await page.locator('#qr--popout .acu-ws-qr-button').waitFor();
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.evaluate(() => window.ACUWorldSimulation.destroy());
      assert.equal(await qr.count(), 0);
      assert.equal(await page.locator('.acu-ws-root').count(), 0);
      assert.equal(await page.locator('#original-qr').count(), 1);
      await page.evaluate(cycle => import(`/public/acu_world_simulation/index.js?qr-reload=${cycle}`), cycle);
      await qr.waitFor();
      assert.equal(await qr.count(), 1);
      await qr.click();
      assert.equal(await panel.isVisible(), true);
    }
    assert.equal(await page.evaluate(() => window.testSends || 0), 0);
    if (mobile) await page.screenshot({ path: path.join(os.tmpdir(), 'acu-world-simulation-qr-mobile.png') });
    assert.deepEqual(errors, []);
    console.log(`${mobile ? 'Mobile HTTP fallback + touch' : 'Desktop native crypto + mouse'}: read, drag, anchored resize, min/max, persistence, QR toggle/reload/rebuild/cleanup OK`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
