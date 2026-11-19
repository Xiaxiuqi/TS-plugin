import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/generation-quality.preview.html');
    await page.evaluate(() => document.fonts.ready);
    const repair = page.getByRole('dialog', { name: '生成检修站', exact: true });
    const draft = repair.getByRole('textbox', { name: '生成修复稿' });
    await page.getByRole('button', { name: '检修当前楼层', exact: true }).click();
    await repair.waitFor(); assert.match(await draft.inputValue(), /<\/gametxt>/);
    assert.equal(await repair.locator('img').count(), 0); assert.equal(await page.evaluate(() => window.unsafe === true), false);
    assert.equal(await page.evaluate(() => preview.state.writes.length), 0);
    await draft.fill('<thinking>只有隐藏内容</thinking>');
    await repair.getByRole('button', { name: '采用修复稿' }).click();
    await repair.getByRole('status').filter({ hasText: '没有可显示的正文' }).waitFor();
    await repair.getByRole('button', { name: '恢复修复底稿' }).click(); assert.match(await draft.inputValue(), /调查：/);
    await repair.getByRole('button', { name: '重新诊断' }).click();
    await repair.getByRole('status').filter({ hasText: '检查通过' }).waitFor();
    await repair.locator('summary').click(); assert.match(await repair.locator('pre').innerText(), /<img src=x/);
    const layout = await repair.evaluate(panel => {
      const bounds = panel.getBoundingClientRect();
      return { fits: bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight,
        overflow: panel.scrollWidth > panel.clientWidth, textarea: panel.querySelector('textarea').getBoundingClientRect().width };
    });
    assert.equal(layout.fits, true); assert.equal(layout.overflow, false); assert.ok(layout.textarea > 250);
    await page.keyboard.press('Escape'); await page.waitForFunction(() => preview.idle);
    assert.equal(await page.evaluate(() => preview.state.writes.length), 0);
    assert.equal(await page.evaluate(() => preview.state.deletions.length), 0);
    await page.getByRole('button', { name: '检修当前楼层', exact: true }).click(); await repair.waitFor();
    await draft.fill(await page.evaluate(() => preview.good));
    await repair.getByRole('button', { name: '采用修复稿' }).click(); await page.waitForFunction(() => preview.idle);
    assert.equal(await page.evaluate(() => preview.state.settlements), 1);
    assert.equal(await page.evaluate(() => preview.state.floors[2].message === preview.good), true);
    assert.equal(await page.evaluate(() => preview.untouched), true);
    await page.getByRole('button', { name: '自动重试', exact: true }).click(); await page.waitForFunction(() => preview.idle);
    assert.equal(await page.evaluate(() => preview.state.requests.length), 2);
    assert.equal(await page.evaluate(() => preview.state.settlements), 2);
    assert.equal(await page.evaluate(() => preview.state.floors.length), 5);
    await page.getByRole('button', { name: '系统设置', exact: true }).click();
    const settings = page.getByRole('dialog', { name: '系统设置', exact: true });
    const retry = settings.getByRole('spinbutton', { name: '正文重试次数', exact: true });
    await page.waitForFunction(() => !document.querySelector('[aria-label="正文重试次数"]').disabled);
    await retry.fill('0');
    await settings.getByRole('spinbutton', { name: '流式静默超时（秒）' }).fill('30');
    await settings.getByRole('button', { name: '保存正文设置', exact: true }).click();
    await settings.locator('[data-quality-status]').filter({ hasText: '已保存' }).waitFor();
    assert.equal(await page.evaluate(() => preview.state.variables['cryptLord.generationQuality'].retryLimit), 0);
    assert.equal(await page.evaluate(() => preview.state.variables.otherPlugin.keep), true);
    await page.evaluate(()=>{preview.state.configLost=true});
    await retry.fill('2');await settings.getByRole('button',{name:'保存正文设置',exact:true}).click();
    await settings.locator('[data-quality-status]').filter({hasText:'已确认保存'}).waitFor();
    assert.equal(await page.evaluate(()=>preview.state.variables['cryptLord.generationQuality'].retryLimit),2);
    const confirmedWrites=await page.evaluate(()=>preview.state.configWrites);
    assert.equal(await settings.getByRole('button',{name:'保存正文设置',exact:true}).isDisabled(),true);
    await page.evaluate(()=>{preview.state.configLost=false;preview.state.noConfigWrite=true});
    await retry.fill('7');await settings.getByRole('button',{name:'保存正文设置',exact:true}).click();
    await settings.locator('[data-quality-status]').filter({hasText:'保存结果无法确认'}).waitFor();
    assert.equal(await retry.inputValue(),'7');
    assert.equal(await page.evaluate(()=>preview.state.variables['cryptLord.generationQuality'].retryLimit),2);
    assert.equal(await page.evaluate(()=>preview.state.configWrites),confirmedWrites+1);
    assert.equal(await settings.getByRole('button',{name:'保存正文设置',exact:true}).isDisabled(),true);
    await page.evaluate(()=>{preview.state.noConfigWrite=false});
    await settings.getByRole('button',{name:'重新读取正文设置',exact:true}).click();
    await settings.locator('[data-quality-status]').filter({hasText:'已读取'}).waitFor();
    assert.equal(await retry.inputValue(),'2');
    await settings.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => { preview.state.floors.at(-1).message = preview.broken; });
    await page.getByRole('button', { name: '检修当前楼层', exact: true }).click();
    // A previously settled floor is idempotent; use a new native floor for lifecycle checks.
    await page.waitForFunction(() => preview.idle);
    await page.evaluate(() => {
      preview.state.floors.push({ message_id: 5, role: 'user', message: '新的调查' },
        { message_id: 6, role: 'assistant', message: preview.broken });
    });
    await page.getByRole('button', { name: '检修当前楼层', exact: true }).click(); await repair.waitFor();
    await repair.getByRole('button',{name:'采用修复稿',exact:true}).focus();await page.keyboard.press('Tab');
    assert.equal(await repair.locator('header button').evaluate(node=>node===document.activeElement),true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await repair.getByRole('button',{name:'采用修复稿',exact:true}).evaluate(node=>node===document.activeElement),true);
    const before = await page.evaluate(() => JSON.stringify(preview.state.floors));
    await page.evaluate(() => preview.chatChanged()); await page.waitForFunction(() => preview.idle);
    assert.equal(await page.evaluate(() => JSON.stringify(preview.state.floors)), before);
    assert.equal(await page.evaluate(() => preview.ui.status().open), false);
    const beforeCanceledReview=await page.evaluate(()=>preview.state.writes.length);
    await page.evaluate(()=>{
      const modules=window.cryptLord.__stage1Modules;
      preview.normalizer=modules['cryptLord.responseNormalizer'];preview.reviewResult=null;
      void modules['cryptLord.generationQuality'].inspect(preview.broken)
        .then(value=>preview.reviewResult=value).catch(error=>preview.reviewResult={error:error.name});
    });
    await repair.waitFor();
    await page.evaluate(()=>{window.cryptLord.__stage1Modules['cryptLord.responseNormalizer']={...preview.normalizer}});
    await repair.getByRole('button',{name:'采用修复稿',exact:true}).click();
    await page.waitForFunction(()=>preview.reviewResult?.error==='AbortError');
    assert.equal(await page.evaluate(()=>preview.ui.status().open),false);
    assert.equal(await page.evaluate(()=>preview.state.writes.length),beforeCanceledReview);
    await page.evaluate(()=>{window.cryptLord.__stage1Modules['cryptLord.responseNormalizer']=preview.normalizer});
    assert.deepEqual(errors, []); await page.close();
    console.log(`${width}px: 原生检修、人工接管、取消、自动重试、系统设置与聊天隔离通过`);
  }
} finally { await browser.close(); }
