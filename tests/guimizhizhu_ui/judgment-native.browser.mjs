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
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/judgment-native.preview.html');
    await page.waitForFunction(() => preview.api?.status().cards === 3);
    assert.equal(await page.locator('#other-plugin .info-label').evaluate(node => getComputedStyle(node).fontWeight), '400');
    assert.equal(await page.locator('[mesid="1"] .crypt-lord-judgment-mount').count(), 0);
    assert.equal(await page.locator('[mesid="2"] .judgment-block').count(), 2);
    assert.equal(await page.locator('[mesid="4"] .judgment-block').count(), 0);
    assert.equal(await page.locator('#ability').getAttribute('data-crypt-lord-judgment-source'), '');
    const header = page.locator('[mesid="2"] .judgment-header').first();
    await header.focus();
    await header.press('Enter');
    assert.equal(await header.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('[mesid="2"] .judgment-details').first().getAttribute('aria-hidden'), 'false');
    await page.locator('[mesid="2"] .crypt-lord-judgment-raw summary').first().click();
    assert.match(await page.locator('[mesid="2"] .crypt-lord-judgment-raw pre').first().textContent(), /投骰结果: \[35\]/);
    await page.getByRole('button', { name: '全部折叠', exact: true }).first().click();
    assert.equal(await header.getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: '全部展开', exact: true }).first().click();
    assert.equal(await page.locator('[mesid="2"] .judgment-block[data-collapsed="false"]').count(), 2);
    assert.equal(await page.evaluate(() => preview.api.beautifyElement(document.querySelector('[mesid="2"] .mes_text'))), false);
    assert.equal(await header.getAttribute('aria-expanded'), 'true');
    await page.evaluate(() => document.getElementById('stream').firstChild.appendData('【判定结果: 勉力成功】'));
    await page.waitForFunction(() => preview.api.status().cards === 4);
    assert.equal(await header.getAttribute('aria-expanded'), 'true');
    await page.evaluate(() => {
      const node = document.getElementById('ability').firstChild;
      node.nodeValue = preview.ability.replace('[35]', '[42]').replace('勉力成功', '尝试失败');
    });
    await page.waitForFunction(() => document.querySelector('[mesid="2"] .judgment-block')?.classList.contains('theme-attempt-failure'));
    await page.getByRole('button', { name: '全部展开', exact: true }).first().click();
    const toggle = page.locator('[mesid="2"] .crypt-lord-judgment-controls input');
    await toggle.check();
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.crypt-lord-judgment-mount')]
      .every(node => node.classList.contains('simplified-mode'))));
    assert.equal(await page.evaluate(() => document.body.classList.contains('simplified-mode')), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.crypt-lord-judgment-mount use')]
      .every(node => document.querySelector(node.getAttribute('href') || node.getAttribute('xlink:href')))));
    await page.evaluate(() => {
      const source = document.querySelector('[mesid="6"] .mes_text');
      const think = document.createElement('think');
      think.textContent = preview.critical;
      source.append(think);
      const prose = document.createElement('blockquote');
      prose.id = 'mixed';
      prose.textContent = `${preview.ability}\n这是后续叙事，不得隐藏。`;
      source.append(prose);
    });
    await page.waitForFunction(() => preview.api.status().cards === 5);
    assert.equal(await page.locator('#mixed').getAttribute('data-crypt-lord-judgment-source'), null);
    await page.evaluate(() => {
      const old = document.querySelector('[mesid="2"] .mes_text');
      const replacement = document.createElement('div');
      replacement.className = 'mes_text';
      replacement.textContent = '已编辑为没有判定的正文。';
      old.replaceWith(replacement);
    });
    await page.waitForFunction(() => preview.api.status().cards === 3);
    assert.equal(await page.locator('[mesid="2"] .crypt-lord-judgment-mount').count(), 0);
    await page.evaluate(() => document.querySelector('[mesid="4"]').remove());
    await page.waitForFunction(() => preview.api.status().cards === 2);
    await page.evaluate(() => {
      const message = document.createElement('div');
      message.className = 'mes'; message.setAttribute('mesid', '8'); message.setAttribute('is_user', 'false');
      const text = document.createElement('div'); text.className = 'mes_text';
      text.textContent = `${preview.ability}\n${preview.ability.replace('[35]', '[66]')}`;
      message.append(text); document.getElementById('chat').append(message);
      preview.emit('MESSAGE_RECEIVED');
    });
    await page.waitForFunction(() => preview.api.status().cards === 4);
    assert.equal(await page.locator('[mesid="8"] .judgment-block').count(), 2);
    await page.evaluate(() => {
      const chat = document.createElement('div'); chat.id = 'chat';
      const message = document.createElement('div'); message.className = 'mes';
      message.setAttribute('mesid', '2'); message.setAttribute('is_user', 'false');
      const text = document.createElement('div'); text.className = 'mes_text';
      const quote = document.createElement('blockquote');
      quote.id = 'critical'; quote.textContent = preview.critical;
      text.append(quote); message.append(text); chat.append(message);
      document.getElementById('chat').replaceWith(chat);
      preview.emit('CHAT_CHANGED');
    });
    await page.waitForFunction(() => preview.api.status().cards === 1);
    await page.locator('.crypt-lord-judgment-controls input').uncheck();
    await page.locator('.judgment-header').click();
    const before = await page.locator('#critical').textContent();
    await page.evaluate(() => preview.api.dispose());
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.crypt-lord-judgment-mount').count(), 0);
    assert.equal(await page.locator('#critical').getAttribute('data-crypt-lord-judgment-source'), null);
    assert.equal(await page.locator('#critical').textContent(), before);
    assert.equal(await page.locator('#crypt-lord-judgment-svg-symbols').count(), 0);
    assert.equal(await page.locator('#other-svg #rune-seal').count(), 1);
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留原生输入');
    assert.deepEqual(await page.evaluate(() => ({
      parent: JudgmentBeautifier, instance: judgmentBeautifierInstance,
      runtime: preview.runtime.JudgmentBeautifier, runtimeInstance: preview.runtime.judgmentBeautifierInstance,
      writes: preview.writes, bodyClass: document.body.className,
      listeners: [...preview.events.values()].reduce((sum, handlers) => sum + handlers.size, 0),
    })), { parent: { otherPlugin: true }, instance: { otherPlugin: true },
      runtime: { otherIframePlugin: true }, runtimeInstance: { otherIframePlugin: true },
      writes: 0, bodyClass: 'other-plugin-class', listeners: 0 });
    assert.deepEqual(errors, []);
    console.log(`${width}px full native multi-log/stream/edit/rerender/chat-switch/interaction/dispose workflow passed`);
    await page.close();
  }
} finally { await browser.close(); }
