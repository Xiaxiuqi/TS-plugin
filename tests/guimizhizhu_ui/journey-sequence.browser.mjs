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
    page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let accept = true;
    page.on('dialog', dialog => { const ok = accept; accept = true; return ok ? dialog.accept() : dialog.dismiss(); });
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/journey-sequence.preview.html');
    const panel = page.getByRole('dialog', { name: '经历序号修正' });
    const idle = () => page.waitForFunction(() => document.querySelector('.crypt-lord-sequence').getAttribute('aria-busy') === 'false');
    const command = async name => {
      try { await panel.getByRole('button', { name, exact: true }).click(); await idle(); }
      catch (error) { error.message = `${name}: ${error.message}`; throw error; }
    };
    const notice = text => panel.getByRole('status').filter({ hasText: text }).waitFor();
    const count = () => page.evaluate(() => preview.writes.length);
    await idle(); assert.equal(await count(), 0); assert.equal(await panel.locator('img').count(), 0);
    await notice('3 个问题');
    await panel.getByRole('spinbutton', { name: '序号 2', exact: true }).fill('8');
    accept = false;
    await panel.locator('[data-index="1"]').getByRole('button', { name: '应用序号' }).click(); await idle();
    assert.equal(await count(), 0);
    await command('智能修复'); await notice('已保存'); assert.equal(await count(), 1);
    assert.equal(await panel.getByRole('button', { name: '恢复原始' }).isDisabled(), false);
    await command('恢复原始'); await notice('已恢复原始序号');
    await command('修复严重问题'); await notice('已保存');
    await command('恢复原始');
    await panel.getByRole('spinbutton', { name: '起始序号', exact: true }).fill('7');
    await command('全部重排'); await notice('已保存');
    assert.deepEqual(await page.evaluate(() => preview.floors.filter(row => [2, 4].includes(row.message_id)).flatMap(row =>
      [...row.message.matchAll(/序号\|(\d+)/g)].map(match => Number(match[1]))).filter(value => value !== 999)), [7, 8, 9, 10]);
    await command('恢复原始');
    await panel.locator('[data-index="1"]').getByRole('button', { name: '采纳 2' }).click(); await idle();
    await notice('已保存'); await command('恢复原始');
    await panel.getByRole('spinbutton', { name: '序号 2', exact: true }).fill('8');
    await page.evaluate(() => { preview.flags.writeFail = true; });
    await command('智能修复'); await notice('完全未写入');
    assert.equal(await panel.getByRole('button', { name: '智能修复' }).isDisabled(), true);
    assert.equal(await panel.getByRole('spinbutton', { name: '序号 2', exact: true }).inputValue(), '8');
    assert.equal(await panel.getByRole('button', { name: '重试保存' }).isEnabled(), true);
    accept = false; await command('关闭'); assert.equal(await panel.isVisible(), true);
    await page.evaluate(() => preview.api.open()); await notice('完全未写入');
    await page.evaluate(() => { preview.flags.writeFail = false; });
    await command('重试保存'); await notice('已保存'); await command('恢复原始');
    await page.evaluate(() => preview.swipe()); await notice('请重新读取');
    await command('重新读取');
    await page.evaluate(() => { preview.flags.postFail = true; });
    const noticesBefore = await page.evaluate(() => preview.notices.length);
    await command('智能修复'); await notice('待核对');
    const uncertainAttempts = await page.evaluate(() => preview.flags.attempts);
    assert.equal(await panel.getByRole('button', { name: '重试保存' }).isVisible(), false);
    await command('核对保存'); await notice('待核对');
    assert.equal(await page.evaluate(() => preview.flags.attempts), uncertainAttempts);
    assert.equal(await page.evaluate(() => preview.notices.length), noticesBefore);
    assert.equal(await panel.getByRole('button', { name: '恢复原始' }).isDisabled(), true);
    await page.evaluate(() => { preview.flags.postFail = false; preview.flags.readFail = false; });
    await command('核对保存'); await notice('已保存');
    assert.equal(await page.evaluate(() => preview.flags.attempts), uncertainAttempts);
    assert.equal(await page.evaluate(() => preview.notices.length), noticesBefore + 2);
    await page.evaluate(() => { preview.flags.postFail = true; });
    await command('恢复原始'); await notice('待核对');
    const restoreAttempts = await page.evaluate(() => preview.flags.attempts);
    await page.evaluate(() => { preview.flags.postFail = false; preview.flags.readFail = false; });
    await command('核对保存'); await notice('已恢复原始序号');
    assert.equal(await page.evaluate(() => preview.flags.attempts), restoreAttempts);
    const before = await count();
    await page.evaluate(() => { preview.hold(); });
    const pending = command('全部重排'); await page.waitForFunction(() => preview.waiting);
    await panel.getByRole('button', { name: '关闭' }).click(); await page.evaluate(() => preview.release()); await pending;
    assert.equal(await count(), before);
    await page.evaluate(() => preview.api.open()); await idle();
    await panel.getByRole('spinbutton', { name: '起始楼层' }).fill('0'); await command('分析范围');
    assert.match(await panel.textContent(), /原生楼层 #0/);
    await panel.getByRole('spinbutton', { name: '起始楼层' }).fill('1'); await command('分析范围');
    assert.equal(await page.evaluate(() => preview.untouched), true);
    await page.evaluate(() => {
      preview.floors[2].message = preview.floors[2].message.replace('调查<img src=x onerror=alert(1)>线索', '超长标题'.repeat(50));
    });
    await command('重新读取');
    await panel.locator('details.crypt-lord-sequence__floor').first().evaluate(node => { node.open = true; });
    await panel.locator('.crypt-lord-sequence__info details').first().evaluate(node => { node.open = true; });
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.crypt-lord-sequence, .crypt-lord-sequence main, .crypt-lord-sequence__event')]
      .every(node => node.scrollWidth <= node.clientWidth + 1)), true);
    await page.evaluate(()=>{
      preview.emit('start','quiet',{},false);preview.emit('start','normal',{},true);
      preview.emit('start','quiet_prompt');preview.emit('start','normal',{options:{quiet_prompt:true}});
      preview.emit('start','normal',{options:{dryRun:true}});
    });
    assert.equal(await panel.getByRole('button',{name:'全部重排',exact:true}).isEnabled(),true);
    await page.evaluate(()=>{preview.flags.lostResponse=true});
    const lostBefore=await count();
    await command('全部重排');await notice('响应丢失后已确认');assert.equal(await count(),lostBefore+1);
    await command('恢复原始');await notice('响应丢失后已确认');assert.equal(await count(),lostBefore+2);
    await page.evaluate(()=>{preview.flags.lostResponse=false;preview.emit('start','normal',{},false)});
    await notice('生成开始');assert.equal(await panel.getByRole('button',{name:'全部重排',exact:true}).isEnabled(),false);
    await page.evaluate(()=>preview.emit('end'));await command('重新读取');
    await panel.getByRole('button',{name:'重新读取',exact:true}).focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await panel.evaluate(node=>node.contains(document.activeElement)&&document.activeElement!==node.querySelector('button')),true);
    await page.evaluate(() => { preview.flags.partialFail = true; });
    await command('智能修复'); await notice('部分写入');
    assert.equal(await panel.getByRole('button', { name: '重试保存' }).isVisible(), false);
    assert.equal(await panel.getByRole('button', { name: '核对保存' }).isVisible(), false);
    const partialAttempts = await page.evaluate(() => preview.flags.attempts);
    await command('关闭'); assert.equal(await page.evaluate(() => preview.flags.attempts), partialAttempts);
    assert.equal(await page.evaluate(() => { preview.replaceService(); return preview.api.open(); }), false);
    assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => preview.api.dispose());
    assert.equal(await page.locator('.crypt-lord-sequence').count(), 0); assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('经历序号修正：桌面/手机同一条完整功能流程通过');
} finally { await browser.close(); }
