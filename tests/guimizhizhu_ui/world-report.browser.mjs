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
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/world-report.preview.html');
    const panel = page.getByRole('dialog', { name: '世界线同步报告', exact: true });
    const inline = page.getByRole('region', { name: '楼层 #2 世界线报告', exact: true });
    const idle = () => page.waitForFunction(() => preview.api.status().busy === false &&
      document.querySelector('.crypt-lord-report-window').dataset.open === 'true');
    const reports = () => page.waitForFunction(() => preview.api.status().reports === 2);
    const command = async name => { await panel.getByRole('button', { name, exact: true }).click(); if (name !== '关闭') await idle(); };
    const notice = text => panel.getByRole('status').filter({ hasText: text }).waitFor();
    await reports(); assert.equal(await page.evaluate(() => preview.untouched), true);
    assert.equal(await page.locator('.crypt-lord-report-mount').count(), 2);
    const order = await page.evaluate(() => {
      const host = cryptLord.__stage1Modules['cryptLord.afterNativeHost'];
      for (const key of ['action-options', 'status-bar', 'status-card']) {
        const item = document.createElement('div'); item.textContent = key; host.mount(2, key, item);
      }
      return [...document.querySelector('.mes[mesid="2"] [data-crypt-lord-after-native-stack]').children]
        .map(node => node.getAttribute('data-crypt-lord-after-native-mount'));
    });
    assert.deepEqual(order, ['status-bar', 'status-card', 'world-report', 'action-options']);
    await inline.getByText('世界线同步报告', { exact: true }).click();
    assert.match(await inline.textContent(), /在场人物推演 · 1/); assert.match(await inline.textContent(), /幕后暗流涌动 · 1/);
    assert.ok(!(await inline.textContent()).includes('未修改人物'));
    await inline.getByText('世界运行报告', { exact: true }).click();
    assert.ok(!(await inline.textContent()).includes('推理中的假报告'));
    await inline.getByRole('button', { name: '在窗口查看世界线报告', exact: true }).click(); await idle();
    await notice('原生变量'); assert.match(await panel.textContent(), /Lv.2/);
    await panel.getByRole('button', { name: '重新读取', exact: true }).focus(); await page.keyboard.press('Shift+Tab');
    assert.equal(await panel.locator('summary').last().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await panel.getByRole('button', { name: '重新读取', exact: true }).evaluate(node => node === document.activeElement), true);
    await panel.getByText('事件历史记录 · 1', { exact: true }).first().click();
    await panel.getByText('关键记忆档案 · 2', { exact: true }).first().click();
    await panel.locator('main').evaluate(node => { node.scrollTop = 140; });
    await command('重新读取');
    assert.equal(await panel.getByText('关键记忆档案 · 2', { exact: true }).first().locator('..').getAttribute('open'), '');
    assert.equal(await panel.locator('main').evaluate(node => node.scrollTop), 140);
    await panel.locator('main').evaluate(node => { node.scrollTop = 0; });
    await panel.getByRole('combobox', { name: '报告楼层' }).selectOption('0'); await idle(); await notice('旧版文本');
    assert.match(await panel.textContent(), /旧版人物推演 · 1/); assert.match(await panel.textContent(), /核对签名/);
    assert.match(await panel.textContent(), /码头仓库将进行例行检查/);
    await panel.getByRole('combobox', { name: '报告楼层' }).selectOption('4'); await idle();
    assert.match(await panel.textContent(), /本楼层没有世界线报告/);
    await panel.getByRole('combobox', { name: '报告楼层' }).selectOption('2'); await idle();
    await command('关闭'); assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => preview.renderNative()); await reports();
    assert.equal(await page.locator('.crypt-lord-report-mount').count(), 2);
    assert.equal(await inline.locator('details').filter({ has: page.getByText('世界线同步报告', { exact: true }) }).first().getAttribute('open'), '');
    await page.getByRole('button', { name: '世界线同步报告', exact: true }).click(); await idle();
    await page.evaluate(() => { preview.flags.fail = true; }); await command('重新读取'); await notice('读取失败');
    assert.equal(await panel.locator('.crypt-lord-report').count(), 0);
    await page.evaluate(() => { preview.flags.fail = false; }); await command('重新读取'); await notice('原生变量');
    for(const args of [['quiet',{},false],['dryRun',{},false],['normal',{quiet_prompt:'静默'},false],
      ['normal',{dryRun:true},false],['normal',{},true]]) {
      await page.evaluate(args=>preview.emit('GENERATION_STARTED',...args),args);
      assert.equal(await panel.getByRole('button', { name: '重新读取' }).isEnabled(), true);
    }
    await page.evaluate(()=>{preview.flags.mismatch=true;});await command('重新读取');await notice('所选分支已变化');
    assert.equal(await panel.locator('.crypt-lord-report').count(),0);
    await page.evaluate(()=>{preview.flags.mismatch=false;});await command('重新读取');await notice('原生变量');
    const originalMessage=await page.evaluate(()=>preview.floors[2].message);
    await page.evaluate(async()=>{
      const sample='<analysis><analysis>内层</analysis><wlog>分析里的假日志</wlog></analysis>';
      const patch='<UpdateVariable><JSONPatch>'+JSON.stringify({npc_data:[{op:'replace',path:'/奥黛丽~1霍尔/关键记忆',
        value:'<analysis>字面量</UpdateVariable><wlog>补丁里的假日志</wlog>'}]})+'</JSONPatch></UpdateVariable>';
      preview.floors[2].message=sample+
        '<本周目经历>序号|2\n在场人物|玩家、伦纳德</本周目经历>'+patch+'<wlog>真正的运行报告</wlog>';
      await preview.emit('MESSAGE_UPDATED');
    });await idle();
    assert.match(await panel.textContent(),/真正的运行报告/);
    assert.ok(!(await panel.textContent()).includes('假日志'));
    await page.evaluate(async value=>{preview.floors[2].message=value;await preview.emit('MESSAGE_UPDATED');},originalMessage);
    await idle();await reports();
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal', {}, false)); await notice('等待完整楼层');
    assert.equal(await panel.getByRole('button', { name: '重新读取' }).isEnabled(), false);
    assert.equal(await page.locator('.crypt-lord-report-mount').count(), 0);
    await page.evaluate(() => preview.emit('GENERATION_STOPPED')); await idle(); await reports();
    await page.evaluate(() => preview.hold());
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => preview.release());
    assert.equal(await panel.isVisible(), false);
    await page.getByRole('button', { name: '世界线同步报告', exact: true }).click(); await idle();
    await page.evaluate(() => preview.hold());
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.waitForFunction(() => preview.flags.waiting > 0);
    await page.evaluate(() => preview.emit('CHAT_CHANGED'));
    await page.evaluate(() => preview.release()); await reports(); assert.equal(await panel.isVisible(), false);
    assert.equal(await page.evaluate(() => preview.untouched), true);
    await page.getByRole('button', { name: '世界线同步报告', exact: true }).click(); await idle();
    await page.evaluate(() => {
      const long = '<img src=x>' + '很长的人物名字'.repeat(28);
      preview.floors[2].data.npc_data[long] = preview.npc('HTML只作为文字', '很长的位置'.repeat(32));
      preview.floors[2].message = `<gametxt>正文</gametxt><本周目经历>序号|2\n在场人物|${long}</本周目经历><wlog>日志<img src=x onerror=alert(1)></wlog>`;
      return preview.emit('MESSAGE_UPDATED');
    });
    await idle(); await notice('原生变量'); await reports();
    assert.equal(await panel.locator('img,script,style').count(), 0);
    assert.match(await panel.textContent(), /<img src=x onerror=alert\(1\)>/);
    const fits = await panel.evaluate(node => [...node.querySelectorAll('h3,h4,dd,summary,p,pre,select')].every(item =>
      item.scrollWidth <= item.clientWidth + 2));
    assert.equal(fits, true, `文字溢出 ${width}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => { document.body.dataset.theme = 'light'; });
    if (width === 1280) {
      const header = panel.locator('header'), before = await panel.boundingBox(), rect = await header.boundingBox();
      await page.mouse.move(rect.x + 70, rect.y + 15); await page.mouse.down();
      await page.mouse.move(rect.x + 130, rect.y + 60); await page.mouse.up();
      const after = await panel.boundingBox(); assert.ok(after.x > before.x);
    }
    await panel.focus(); await page.keyboard.press('Escape'); assert.equal(await panel.isVisible(), false);
    assert.equal(await page.getByRole('button', { name: '世界线同步报告', exact: true }).evaluate(node => node === document.activeElement), true);
    await page.getByRole('button', { name: '世界线同步报告', exact: true }).click(); await idle();
    await page.evaluate(() => { preview.floors[2].is_hidden = true; preview.renderNative(); return preview.emit('MESSAGE_UPDATED'); });
    await idle(); await notice('不存在或已隐藏');
    assert.equal(await panel.getByRole('combobox', { name: '报告楼层' }).isEnabled(), true);
    await panel.getByRole('combobox', { name: '报告楼层' }).selectOption('0'); await idle(); await notice('旧版文本');
    await page.evaluate(() => { preview.floors[2].is_hidden = false; preview.floors[0].is_hidden = true;
      preview.renderNative(); return preview.emit('MESSAGE_UPDATED'); });
    await page.waitForFunction(() => preview.api.status().reports === 1);
    await page.evaluate(() => { preview.floors.splice(2); preview.renderNative(); return preview.emit('MESSAGE_DELETED'); });
    await page.waitForFunction(() => preview.api.status().reports === 0);
    await page.evaluate(() => preview.dispose());
    assert.equal(await page.locator('.crypt-lord-report-window,.crypt-lord-report-mount').count(), 0);
    assert.deepEqual(errors, []); await page.close();
    console.log(`完整世界线报告流程通过：${width}px`);
  }
} finally { await browser.close(); }
