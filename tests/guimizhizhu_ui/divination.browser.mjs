import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({
  headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    const errors = [];
    let acceptDialog = true;
    page.on('dialog', dialog => acceptDialog ? dialog.accept() : dialog.dismiss());
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { Math.random = () => .97; });
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/divination.preview.html');
    await page.locator('#open').click();
    assert.equal(await page.getByRole('option', { name: '塔罗' }).count(), 1);
    await page.getByRole('textbox', { name: '占卜语句' }).fill('今晚去码头安全吗？');
    await page.evaluate(() => {
      preview.responses.push(
        '<问句类型>polar</问句类型><命题摘要>码头是否安全</命题摘要><基础DC>90</基础DC><反占卜>否</反占卜>',
        '<否决清单></否决清单><真实候选><候选><主轴>true</主轴><表述>安全</表述></候选><候选><主轴>false</主轴><表述>不安全</表述></候选></真实候选>',
      );
    });
    await page.getByRole('button', { name: '开始定参' }).click();
    await page.getByText(/定参完成/).waitFor();
    assert.equal(await page.evaluate(() => preview.requests.length), 2);
    assert.equal(await page.evaluate(() => preview.requests[0].custom_api), undefined);
    await page.evaluate(() => { preview.responses.push('<过程>摆针停滞</过程><启示>秘密结论</启示>'); });
    await page.getByRole('button', { name: '进行占卜' }).click();
    await page.getByText(/检定失败却返回事实性启示/).waitFor();
    assert.equal(await page.getByRole('button', { name: /重试本环/ }).count(), 1);
    await page.evaluate(() => { preview.responses.push('<过程>摆针停滞</过程><启示>无</启示>'); });
    await page.getByRole('button', { name: /重试本环/ }).click();
    await page.getByText(/已推进 1\/4/).waitFor();
    assert.equal(await page.getByText(/第 1 环/).count(), 1);
    acceptDialog = false;
    await page.getByRole('button', { name: /见好就收/ }).click();
    await page.waitForFunction(() => !document.querySelector('.crypt-lord-divination').hasAttribute('aria-busy'));
    assert.equal(await page.locator('#send_textarea').inputValue(), '原生输入草稿');
    acceptDialog = true;
    await page.getByRole('button', { name: /见好就收/ }).click();
    await page.getByText(/占卜简报已填入/).waitFor();
    let report = await page.locator('#send_textarea').inputValue();
    assert.match(report, /码头安全吗/);
    assert.match(report, /占卜失败，无任何启示/);
    assert.doesNotMatch(report, /秘密结论|不安全/);
    assert.match(await page.locator('.crypt-lord-divination__log').innerText(), /骰点 98/);
    assert.equal(await page.evaluate(() => preview.requests[2].ordered_prompts.at(-1).content),
      await page.evaluate(() => preview.requests[3].ordered_prompts.at(-1).content));
    for (let round = 2; round <= 4; round++) {
      await page.evaluate(() => { preview.responses.push('<过程>灵摆仍然静止</过程><启示>无</启示>'); });
      await page.getByRole('button', { name: '进行占卜' }).click();
      await page.getByText(new RegExp(`已推进 ${round}/4`)).waitFor();
    }
    assert.equal(await page.getByRole('button', { name: '进行占卜' }).isDisabled(), true);
    assert.equal(await page.locator('.crypt-lord-divination__log article').count(), 4);
    await page.getByRole('button', { name: '收手并写入输入框' }).click();
    await page.getByText(/占卜简报已填入/).waitFor();
    report = await page.locator('#send_textarea').inputValue();
    await page.evaluate(() => { preview.floor = { ...preview.floor, message: '另一个楼层' }; });
    await page.getByRole('button', { name: '收手并写入输入框' }).click();
    await page.getByText(/聊天、楼层正文或变量已变化/).waitFor();
    assert.equal(await page.locator('#send_textarea').inputValue(), report);
    await page.evaluate(() => { preview.floor = { ...preview.floor, message: '廷根的夜色安静。' }; });
    await page.getByRole('button', { name: '重新占卜' }).click();
    await page.getByRole('textbox', { name: '占卜语句' }).fill('另一次占卜');
    await page.evaluate(() => { preview.hold(); });
    const beforeHold = await page.evaluate(() => preview.requests.length);
    await page.getByRole('button', { name: '开始定参' }).click();
    await page.waitForFunction(count => preview.requests.length === count + 1, beforeHold);
    await page.evaluate(() => {
      preview.floor = { ...preview.floor, message: '新楼层正文' };
      preview.release('<问句类型>polar</问句类型><基础DC>20</基础DC>');
    });
    await page.getByText(/聊天、楼层正文或变量已变化/).waitFor();
    assert.equal(await page.getByRole('button', { name: '开始定参' }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const panel = page.locator('.crypt-lord-divination');
    const before = await panel.boundingBox();
    const header = await page.locator('.crypt-lord-divination header').boundingBox();
    await page.mouse.move(header.x + 35, header.y + 15);
    await page.mouse.down();
    await page.mouse.move(header.x + 70, header.y + 45, { steps: 5 });
    await page.mouse.up();
    const after = await panel.boundingBox();
    assert.ok(before && after);
    if (width > 600) assert.ok(Math.abs(after.x - before.x) + Math.abs(after.y - before.y) > 4);
    await page.evaluate(() => {
      preview.api.close();
      preview.entries.push({ uid: 1, name: '[快窗方案]', comment: '[快窗方案]', content: '{broken' });
    });
    await page.locator('#open').click();
    await page.getByText(/快窗方案 JSON 损坏/).waitFor();
    await page.getByRole('button', { name: '使用内置方案' }).click();
    await page.getByRole('textbox', { name: '占卜语句' }).waitFor();
    await page.evaluate(() => { preview.entries.length = 0; });
    await page.getByRole('button', { name: '方案设置' }).click();
    await page.getByRole('button', { name: '从世界书重新读取' }).click();
    await page.getByText('已重新读取快窗方案').waitFor();
    await page.getByRole('textbox', { name: '方案名称', exact: true }).fill('保留我的方案草稿');
    await page.evaluate(() => { preview.writeFailure = true; });
    await page.getByRole('button', { name: '保存方案' }).click();
    await page.getByText('模拟方案保存失败').waitFor();
    assert.equal(await page.getByRole('textbox', { name: '方案名称', exact: true }).inputValue(), '保留我的方案草稿');
    assert.equal(await page.evaluate(() => preview.entries.length), 0);
    await page.getByRole('textbox', { name: '输出标签配置' }).fill('{broken');
    await page.getByRole('button', { name: '保存方案' }).click();
    await page.getByText('输出标签配置 JSON 损坏').waitFor();
    assert.equal(await page.getByRole('textbox', { name: '输出标签配置' }).inputValue(), '{broken');
    await page.getByRole('button', { name: '恢复原版方案' }).click();
    await page.evaluate(() => { preview.writeFailure = false; });
    await page.getByRole('button', { name: '保存方案' }).click();
    await page.getByText('方案已保存到 2历史孔隙').waitFor();
    assert.equal(await page.evaluate(() => preview.bookWrites), 1);
    assert.equal(await page.evaluate(() => JSON.parse(preview.entries[0].content)[0].tags.length), 12);
    assert.equal(await page.evaluate(() => preview.entries[0].enabled), false);
    await page.getByRole('button', { name: /返回/ }).click();
    await page.getByRole('textbox', { name: '占卜语句' }).fill('是左还是右？');
    const beforeAbort = await page.evaluate(() => preview.requests.length);
    await page.evaluate(() => { preview.responses.push('<问句类型>alternative</问句类型><基础DC>20</基础DC>'); });
    await page.getByRole('button', { name: '开始定参' }).click();
    await page.waitForFunction(count => preview.requests.length === count + 1, beforeAbort);
    await page.getByRole('button', { name: '重新占卜' }).click();
    await page.getByRole('textbox', { name: '占卜语句' }).fill('关窗前的旧请求');
    await page.evaluate(() => { preview.hold(); });
    const beforeClose = await page.evaluate(() => preview.requests.length);
    await page.getByRole('button', { name: '开始定参' }).click();
    await page.waitForFunction(count => preview.requests.length === count + 1, beforeClose);
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.locator('#open').click();
    await page.getByRole('textbox', { name: '占卜语句' }).waitFor();
    await page.evaluate(() => { preview.release('<问句类型>polar</问句类型><基础DC>20</基础DC>'); });
    assert.equal(await page.getByRole('button', { name: '开始定参' }).isEnabled(), true);
    assert.equal(await page.locator('#send_textarea').inputValue(), report);
    assert.deepEqual(await page.evaluate(() => [preview.writes, preview.sends, preview.inputEvents]), [0, 0, 2]);
    assert.equal(await page.evaluate(() => preview.opening.data.preserved), '开场变量');
    // Native source, quiet events, settings cancellation and uncertain-save recovery.
    await page.getByRole('textbox', { name: '占卜语句' }).fill('完整消息页校验');
    const beforePages = await page.evaluate(() => preview.requests.length);
    await page.evaluate(() => preview.pages.push({ message_id: 2, swipes: ['另一正文页'] }));
    await page.getByRole('button', { name: '开始定参' }).click();
    await page.getByText(/聊天、楼层正文或变量已变化/).waitFor();
    assert.equal(await page.evaluate(() => preview.requests.length), beforePages);
    await page.evaluate(() => { preview.pages.length = 0; });
    await page.getByRole('button', { name: '重新占卜' }).click();
    await page.getByRole('textbox', { name: '占卜语句' }).fill('等待设置期间取消');
    await page.evaluate(() => {
      preview.emit('started', 'quiet');
      preview.emit('started', 'normal', {}, true);
      preview.holdSettings();
    });
    await page.getByRole('button', { name: '开始定参' }).click();
    await page.getByRole('button', { name: '取消', exact: true }).waitFor();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByText(/本环骰点与草稿保留/).waitFor();
    await page.evaluate(() => preview.releaseSettings());
    assert.equal(await page.evaluate(() => preview.requests.length), beforePages);
    assert.equal(await page.getByRole('textbox', { name: '占卜语句' }).inputValue(), '等待设置期间取消');
    await page.evaluate(() => preview.emit('started', 'normal'));
    assert.equal(await page.getByRole('button', { name: '开始定参' }).isDisabled(), true);
    await page.evaluate(() => preview.emit('stopped'));
    await page.getByRole('button', { name: '重新占卜' }).click();
    await page.getByRole('button', { name: '方案设置' }).click();
    await page.getByRole('textbox', { name: '方案名称', exact: true }).fill('宿主响应丢失仍成功');
    await page.evaluate(() => { preview.afterWriteFailure = true; });
    await page.getByRole('button', { name: '保存方案' }).click();
    await page.getByText(/方案已保存，但宿主未返回成功响应/).waitFor();
    const countAfterLost = await page.evaluate(() => preview.bookWrites);
    await page.getByRole('button', { name: '保存方案' }).click();
    await page.getByText(/请先重新读取方案/).waitFor();
    assert.equal(await page.evaluate(() => preview.bookWrites), countAfterLost);
    await page.evaluate(() => { preview.afterWriteFailure = false; });
    await page.getByRole('button', { name: '从世界书重新读取' }).click();
    await page.getByText('已重新读取快窗方案').waitFor();
    assert.equal(await page.getByRole('textbox', { name: '方案名称', exact: true }).inputValue(), '宿主响应丢失仍成功');
    await page.getByRole('button', { name: /返回/ }).click();
    await page.getByRole('textbox', { name: '占卜语句' }).fill('Esc 关闭');
    await page.getByRole('button', { name: '开始定参' }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: '关闭', exact: true }).evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.crypt-lord-divination').getAttribute('data-open'), 'false');
    assert.equal(await page.locator('#send_textarea').inputValue(), report);
    assert.deepEqual(errors, []);
    await page.close();
    const successPage = await browser.newPage({ viewport: { width, height: 760 } });
    successPage.on('dialog', dialog => dialog.accept());
    successPage.on('pageerror', error => errors.push(error.message));
    await successPage.addInitScript(() => { Math.random = () => .01; });
    await successPage.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/divination.preview.html');
    await successPage.evaluate(() => {
      preview.floor = { ...preview.floor, message: '<think>隐藏的原生思维</think><gametxt>正式码头剧情</gametxt><safe>隐藏配置</safe>',
        data: { stat_data: { 当前灵性: 0, 运气: 0 } } };
      preview.settings = { useCustomApi: true, apiUrl: 'https://mock.invalid/v1', model: 'shared-model' };
      preview.responses.push(
        '<问句类型>polar</问句类型><基础DC>100</基础DC><反占卜>是</反占卜><反占卜DC>100</反占卜DC>',
        '<真实候选></真实候选>',
      );
    });
    await successPage.locator('#open').click();
    await successPage.getByRole('textbox', { name: '占卜语句' }).fill('仓库是安全的吗？');
    await successPage.getByRole('combobox', { name: '占卜方法' }).selectOption('梦境');
    await successPage.getByRole('button', { name: '开始定参' }).click();
    await successPage.getByText(/模型未返回可用候选真实/).waitFor();
    await successPage.evaluate(() => {
      preview.responses.push('<真实候选><候选><主轴>false</主轴><表述>命题不成立</表述></候选></真实候选>');
    });
    await successPage.getByRole('button', { name: '重试候选生成' }).click();
    await successPage.getByText(/已锁定真实/).waitFor();
    await successPage.getByText(/当前灵性 0 ×2/).waitFor();
    assert.equal(await successPage.evaluate(() => preview.requests[0].custom_api.model), 'shared-model');
    assert.match(await successPage.evaluate(() => preview.requests[0].ordered_prompts[2].content), /正式码头剧情/);
    assert.doesNotMatch(await successPage.evaluate(() => JSON.stringify(preview.requests)), /隐藏的原生思维|隐藏配置/);
    for (let round = 1; round <= 2; round++) {
      await successPage.evaluate(() => { preview.responses.push('<过程>梦境逐渐清晰</过程><启示>命题不成立</启示>'); });
      await successPage.getByRole('button', { name: '进行占卜' }).click();
      await successPage.getByText(new RegExp(`已推进 ${round}/4 · 成功 ${round}/2`)).waitFor();
    }
    assert.equal(await successPage.getByRole('button', { name: '进行占卜' }).isDisabled(), true);
    assert.equal(await successPage.locator('.crypt-lord-divination__log article').count(), 2);
    const ritualPrompts = await successPage.evaluate(() => preview.requests.slice(3).map(row => row.ordered_prompts.at(-1).content));
    for (const prompt of ritualPrompts) assert.match(prompt, /命题不成立/);
    await successPage.getByRole('button', { name: '写入输入框', exact: true }).click();
    await successPage.getByText(/占卜简报已填入/).waitFor();
    const successReport = await successPage.locator('#send_textarea').inputValue();
    assert.match(successReport, /精确完整|已问尽/);
    assert.match(successReport, /梦境/);
    assert.doesNotMatch(successReport, /本局真实|真实表述|<主轴>/);
    assert.deepEqual(await successPage.evaluate(() => [preview.writes, preview.sends]), [0, 0]);
    assert.equal(await successPage.evaluate(() => preview.floor.data.stat_data.当前灵性), 0);
    await successPage.evaluate(() => { preview.chatChange(); });
    assert.equal(await successPage.locator('.crypt-lord-divination').getAttribute('data-open'), 'false');
    assert.deepEqual(errors, []);
    await successPage.close();
  }
  console.log('divination browser: full setup/retry/caps/export/preset/close workflow passed at 1280px and 390px');
} finally {
  await browser.close();
}
