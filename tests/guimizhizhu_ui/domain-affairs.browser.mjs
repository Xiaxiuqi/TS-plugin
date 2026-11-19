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
    page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/domain-affairs.preview.html');
    await page.waitForFunction(() => window.previewReady);
    const panel = page.getByRole('dialog', { name: '领地事务评定' });
    const idle = () => page.waitForFunction(() => !modules['cryptLord.domainAffairsUi'].status().busy);
    const protectedFloor = await page.evaluate(() => JSON.stringify(preview.floors[0]));
    await page.evaluate(() => {
      for (const args of [['quiet_prompt'], ['normal', { quiet_prompt: true }],
        ['normal', { options: { quiet_prompt: true } }], ['normal', {}, true]])
        preview.emit('GENERATION_STARTED', ...args);
    });
    assert.equal(await panel.locator('.crypt-lord-affairs__members input').count(), 1);
    await panel.locator('.crypt-lord-affairs__members input[value="艾琳"]').check();
    await panel.getByRole('button', { name: '发起评定', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.floors[1].data.cryptLord.domainAffairs.attendance.玩家.在场), false);
    await page.evaluate(() => { preview.failNarration = true; });
    await panel.getByRole('button', { name: '开始评定', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.floors[1].data.stat_data.货币.鲁恩王国.金镑), 50);
    assert.equal(await page.evaluate(() => preview.floors[1].data.stat_data.领地.事务.评定次数), 1);
    const openWrites = await page.evaluate(() => preview.writes.length);
    await panel.getByRole('button', { name: '重试阶段演绎', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.writes.length), openWrites);
    await page.evaluate(() => { preview.failNarration = false; });
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await idle();
    await panel.getByRole('button', { name: '重试阶段演绎', exact: true }).click();
    await idle();
    await panel.getByRole('button', { name: '转入议处', exact: true }).click();
    await idle();
    const selects = panel.locator('.crypt-lord-affairs__todo select');
    assert.equal(await selects.count(), 3);
    for (const [index, value] of [[0, '艾琳'], [1, '<User>'], [2, '暂且搁下']]) {
      await selects.nth(index).selectOption(value);
      await idle();
    }
    const beforeSettlement = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => { preview.failSave = true; });
    await panel.getByRole('button', { name: '定案散会', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.writes.length), beforeSettlement);
    assert.equal(await page.evaluate(() => modules['cryptLord.domainAffairsUi'].status().pending), true);
    await page.evaluate(() => { preview.failSave = false; preview.failNarration = true; });
    await panel.getByRole('button', { name: '保存待提交结果', exact: true }).click();
    await idle();
    const settled = await page.evaluate(() => JSON.stringify(preview.floors[1].data.stat_data));
    await panel.getByRole('button', { name: '重试阶段演绎', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.writes.length), beforeSettlement + 1);
    await page.evaluate(() => { preview.failNarration = false; });
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await idle();
    await panel.getByRole('button', { name: '重试阶段演绎', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => JSON.stringify(preview.floors[1].data.stat_data)), settled);
    const exportButton = panel.getByRole('button', { name: '写入原生输入框', exact: true });
    await exportButton.hover();
    assert.equal(await exportButton.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(236, 208, 154)');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await panel.evaluate(node => [...node.querySelectorAll('button, textarea, select')].some(control => {
      const rect = control.getBoundingClientRect(), frame = node.getBoundingClientRect();
      return rect.left < frame.left - 1 || rect.right > frame.right + 1;
    })), false);
    const closingSnapshot = await page.evaluate(() => structuredClone(preview.floors[1].data));
    await page.locator('#send_textarea').fill('保留原生草稿');
    await page.evaluate(() => { preview.failSave = true; });
    await panel.getByRole('button', { name: '写入原生输入框', exact: true }).click();
    await idle();
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留原生草稿');
    await page.evaluate(() => { preview.failSave = false; });
    await panel.getByRole('button', { name: '保存待提交结果', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.floors[1].data.cryptLord.domainAffairs), undefined);
    assert.equal(await page.evaluate(() => preview.floors[1].data.stat_data.领地.$流水.length), 0);
    await panel.getByText('最近评定纪实', { exact: true }).click();
    await panel.getByRole('button', { name: '写入原生输入框', exact: true }).click();
    await idle();
    assert.match(await page.locator('#send_textarea').inputValue(), /处置清单/);
    const ownId = await page.evaluate(() => preview.floors[1].data.stat_data.领地.事务.待办.find(todo => todo.状态 === '玩家进行中').id);
    const claimWrites = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => { preview.failSave = true; });
    await panel.getByRole('button', { name: '核验完成', exact: true }).click();
    await idle();
    const claimCalls = await page.evaluate(() => preview.calls.length);
    await page.evaluate(() => { preview.failSave = false; });
    await panel.getByRole('button', { name: '保存待提交结果', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.calls.length), claimCalls);
    assert.equal(await page.evaluate(() => preview.writes.length), claimWrites + 1);
    assert.equal(await page.evaluate(id => preview.floors[1].data.stat_data.领地.事务.待办.find(todo => todo.id === id).状态, ownId), '已完成');
    assert.equal(await page.evaluate(() => preview.updates.length), await page.evaluate(() => preview.writes.length));
    assert.equal(await page.evaluate(() => JSON.stringify(preview.floors[0])), protectedFloor);
    assert.equal(await page.evaluate(() => preview.floors[1].swipes[1]), '另一个正文页');
    assert.equal(await page.evaluate(() => preview.floors[1].data.otherPlugin.keep), true);

    // A second short boundary chain covers temporary officials and late responses.
    await page.evaluate(() => { preview.reset(); });
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await idle();
    await panel.getByRole('button', { name: '发起评定', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.floors[1].data.cryptLord.domainAffairs.passerby), true);
    await page.getByLabel('本阶段补述').fill('保留同一次演绎');
    await page.evaluate(() => { preview.noWrite = true; });
    await panel.getByRole('button', { name: '演绎补述', exact: true }).click();
    await idle();
    const once = await page.evaluate(() => ({ calls: preview.calls.length, derives: preview.derivations }));
    assert.equal(await page.evaluate(() => modules['cryptLord.domainAffairsUi'].status().phase), 'pending');
    await page.evaluate(() => { preview.confirm = false; });
    await panel.press('Escape');
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.evaluate(() => modules['cryptLord.domainAffairsUi'].open(2));
    assert.equal(await panel.isVisible(), true);
    assert.equal(await page.getByLabel('本阶段补述').inputValue(), '保留同一次演绎');
    await page.evaluate(() => { preview.confirm = true; preview.noWrite = false; preview.afterWriteFail = true; });
    await panel.getByRole('button', { name: '保存待提交结果', exact: true }).click();
    await idle();
    const uncertainWrites = await page.evaluate(() => preview.writes.length);
    assert.equal(await page.evaluate(() => modules['cryptLord.domainAffairsUi'].status().phase), 'uncertain');
    await panel.getByRole('button', { name: '核对原生保存状态', exact: true }).click();
    await idle();
    await page.evaluate(() => { preview.failRead = false; preview.afterWriteFail = false; });
    await panel.getByRole('button', { name: '核对原生保存状态', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.writes.length), uncertainWrites);
    assert.deepEqual(await page.evaluate(() => ({ calls: preview.calls.length, derives: preview.derivations })), once);
    await page.getByLabel('本阶段补述').fill('回执丢失仍只保存一次');
    await page.evaluate(() => { preview.lostReceipt = true; });
    await panel.getByRole('button', { name: '演绎补述', exact: true }).click(); await idle();
    assert.equal(await page.evaluate(() => modules['cryptLord.domainAffairsUi'].status().pending), false);
    assert.equal(await page.evaluate(() => preview.writes.length), uncertainWrites + 1);
    await page.evaluate(() => { preview.lostReceipt = false; });
    await page.getByLabel('本阶段补述').fill('请召集属吏');
    await page.evaluate(() => { preview.failNarration = true; });
    await panel.getByRole('button', { name: '演绎补述', exact: true }).click();
    await idle();
    assert.equal(await page.getByLabel('本阶段补述').inputValue(), '请召集属吏');
    await page.evaluate(() => {
      preview.failNarration = false;
      preview.waitModel = () => new Promise(resolve => { preview.releaseModel = resolve; });
    });
    const beforeClose = await page.evaluate(() => preview.writes.length);
    await panel.getByRole('button', { name: '演绎补述', exact: true }).click();
    await page.waitForFunction(() => Boolean(preview.releaseModel));
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => { preview.releaseModel(); preview.waitModel = null; });
    await page.waitForFunction(() => modules['cryptLord.domainAffairsUi'].status().busy === false);
    await page.locator('#open').click();
    await idle();
    assert.equal(await page.evaluate(() => preview.writes.length), beforeClose);
    const callsBeforeConflict = await page.evaluate(() => preview.calls.length);
    await page.evaluate(() => { preview.floors[1].swipes[1] = '外部修改消息页'; });
    await panel.getByRole('button', { name: '重新检测', exact: true }).click();
    await idle();
    assert.equal(await page.evaluate(() => preview.calls.length), callsBeforeConflict);
    assert.equal(await page.evaluate(() => modules['cryptLord.domainAffairsUi'].status().stale), true);
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await idle();
    await page.evaluate(() => { preview.emit('GENERATION_STARTED', 'normal'); });
    assert.equal(await panel.getByRole('button', { name: '重新检测', exact: true }).isDisabled(), true);
    await page.evaluate(() => { preview.emit('GENERATION_STOPPED'); });
    assert.equal(await panel.getByRole('button', { name: '重新读取', exact: true }).isEnabled(), true);
    await page.evaluate(() => { preview.emit('CHAT_CHANGED'); });
    await panel.waitFor({ state: 'hidden' });

    // Export is durable even if the native draft changes while the final save is in flight.
    await page.evaluate(data => {
      preview.floors[1].data = structuredClone(data);
      preview.floors[1].swipes_data[0] = structuredClone(data);
      preview.afterWrite = () => { document.querySelector('#send_textarea').value = '保存途中编辑的新草稿'; };
    }, closingSnapshot);
    await page.locator('#open').click(); await idle();
    await panel.getByRole('button', { name: '写入原生输入框', exact: true }).click(); await idle();
    assert.equal(await page.locator('#send_textarea').inputValue(), '保存途中编辑的新草稿');
    assert.equal(await page.evaluate(() => preview.floors[1].data.cryptLord.domainAffairs), undefined);
    assert.match(await panel.innerText(), /草稿已变化/);
    await page.evaluate(() => { preview.afterWrite = null; });
    await panel.getByText('最近评定纪实', { exact: true }).click();
    await panel.getByRole('button', { name: '写入原生输入框', exact: true }).click(); await idle();
    assert.match(await page.locator('#send_textarea').inputValue(), /处置清单/);

    // Source identity is checked before any model request, independently of page equality.
    for (const field of ['chat', 'script', 'date']) {
      await panel.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
      await panel.getByText('最近评定纪实', { exact: true }).click();
      const before = await page.evaluate(() => preview.calls.length);
      await page.evaluate(field => {
        if (field === 'date') preview.date = new Date('2026-10-29T00:00:00Z');
        else preview[field] += '-changed';
      }, field);
      await panel.getByRole('button', { name: '写入原生输入框', exact: true }).click(); await idle();
      assert.equal(await page.evaluate(() => preview.calls.length), before);
      assert.equal(await page.evaluate(() => modules['cryptLord.domainAffairsUi'].status().stale), true);
    }
    const noFallback = await page.evaluate(async () => {
      const before = preview.calls.length;
      modules['cryptLord.domainAffairsUi'].close(true);
      preview.floors.push({ message_id: 3, role: 'user', message: '等待原生回复', data: {} });
      const opened = await modules['cryptLord.domainAffairsUi'].open();
      return { opened, calls: preview.calls.length - before };
    });
    assert.deepEqual(noFallback, { opened: false, calls: 0 });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`domain-affairs browser ${width}: whole assembly, failed saves, narrative retry, own claim, composer and cancellation OK`);
  }
} finally { await browser.close(); }
