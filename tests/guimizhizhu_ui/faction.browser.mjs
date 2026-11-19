import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280,390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/faction.preview.html');
    const panel = page.getByRole('dialog');
    const ready = () => panel.getByRole('searchbox').waitFor();
    await page.locator('#open').click(); await ready();
    assert.equal(await panel.getByRole('button').count(), 5);
    assert.equal(await panel.getByRole('button', { name: '保存更改' }).count(), 0);
    await panel.getByRole('heading', { name: '银湾联合教区' }).waitFor();
    for (const name of ['直辖半神与真神','实控区域','世俗军队','生产力需求'])
      assert.equal(await panel.getByRole('heading', { name }).count(), 1);
    assert.equal(await panel.locator('tbody tr').count(), 5);
    assert.equal(await panel.getByText('15000', { exact: true }).count(), 2);
    assert.equal(await panel.getByText('110000', { exact: true }).count(), 1);
    for (const name of ['港口护卫舰队','教区驻防军','空中侦察队'])
      assert.equal(await panel.getByText(name, { exact: true }).count(), 1);
    assert.equal(await panel.getByText('该区域类型不适用人口概念', { exact: true }).count(), 1);
    await panel.getByRole('button', { name: /星界议会/ }).click();
    await panel.getByText('现有实控区类型都不适用人口概念', { exact: true }).waitFor();
    await panel.getByText('尚待确认', { exact: true }).waitFor();
    await panel.getByRole('button', { name: /玩家领地/ }).click();
    await panel.getByRole('heading', { name: '玩家领地', exact: true }).waitFor();
    await panel.getByRole('searchbox').fill('不存在');
    await panel.getByText('没有匹配的势力', { exact: true }).waitFor();
    await panel.getByRole('searchbox').fill('银湾');
    await panel.getByRole('heading', { name: '银湾联合教区' }).waitFor();
    assert.deepEqual(await page.evaluate(() => preview.writes), []);
    assert.deepEqual(await page.evaluate(() => preview.floors), await page.evaluate(() => preview.initial));
    const box = await panel.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
    assert.equal(await panel.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    const subtitle = await panel.locator('header span').boundingBox();
    const searchBox = await panel.getByRole('searchbox').boundingBox();
    assert.ok(subtitle.y + subtitle.height <= searchBox.y, '标题状态不能遮挡搜索框');
    const icon = panel.getByRole('button', { name: '重新读取势力' }).locator('i');
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    assert.notEqual(await icon.evaluate(node => getComputedStyle(node, '::before').content), 'none');
    await panel.locator('.crypt-lord-organization-console__demand').scrollIntoViewIfNeeded();
    await panel.getByRole('searchbox').fill('');
    await page.evaluate(() => preview.external());
    await page.evaluate(() => preview.update()); await ready();
    await panel.getByRole('heading', { name: '外部修订后的教区' }).waitFor();
    if (width === 1280) {
      const header = await panel.locator('header').boundingBox(), before = await panel.boundingBox();
      await page.mouse.move(header.x + 80, header.y + 10);
      await page.mouse.down(); await page.mouse.move(header.x + 115, header.y + 30); await page.mouse.up();
      const after = await panel.boundingBox();
      assert.ok(after.x > before.x && after.y > before.y);
    }
    await page.evaluate(() => { preview.fail = true });
    await panel.getByRole('button', { name: '重新读取势力' }).click();
    await panel.getByText('读取失败：模拟只读失败').waitFor();
    assert.equal(await panel.getByRole('heading', { name: '外部修订后的教区' }).count(), 0);
    await page.evaluate(() => { preview.fail = false });
    await panel.getByRole('button', { name: '重试', exact: true }).click(); await ready();
    await page.evaluate(() => preview.open(2)); await ready();
    await panel.getByText('没有实控区', { exact: true }).waitFor();
    await page.evaluate(() => preview.open(1));
    await panel.getByText('读取失败：目标楼层不存在或不是 assistant').waitFor();
    await page.evaluate(() => { preview.hold(); void preview.open(0) });
    await page.waitForFunction(() => preview.waiting === 1);
    await panel.getByRole('button', { name: '关闭' }).click();
    await page.evaluate(() => preview.release());
    assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => { preview.hold(); void preview.open(0) });
    await page.waitForFunction(() => preview.waiting === 1);
    await page.evaluate(() => preview.change());
    await page.evaluate(() => preview.release());
    assert.equal(await panel.isVisible(), false);
    await page.locator('#open').click(); await ready();
    await panel.getByRole('searchbox').focus();
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.locator('#open').evaluate(node => node === document.activeElement), true);
    assert.deepEqual(await page.evaluate(() => preview.writes), []);
    await page.locator('#open').click(); await ready();
    await panel.getByRole('searchbox').fill('外部');
    await page.evaluate(() => preview.open(0));
    assert.equal(await panel.getByRole('searchbox').inputValue(), '外部');
    await panel.getByRole('searchbox').fill('');
    for (const args of [['quiet_prompt'], ['normal', {options:{quiet_prompt:true}}],
      ['normal', {options:{dryRun:true}}], ['normal', {}, true]]) {
      await page.evaluate(args => preview.emit('start', ...args), args);
      assert.equal(await panel.getByRole('searchbox').isEnabled(), true);
    }
    await page.evaluate(() => {preview.emit('start', 'normal');preview.emit('stop')});
    await panel.getByText('生成已结束，请重新读取势力', {exact:true}).first().waitFor();
    await panel.getByRole('button', {name:'重新读取势力',exact:true}).click(); await ready();
    await page.evaluate(() => {preview.hide(0,true)});
    await panel.getByRole('button', {name:'重新读取势力',exact:true}).click();
    await panel.getByText('读取失败：目标势力楼层已隐藏，不能读取').waitFor();
    assert.equal(await panel.getByRole('searchbox').count(), 0);
    await page.evaluate(() => preview.hide(0,false));
    await panel.getByRole('button', {name:'重试',exact:true}).click(); await ready();
    await page.evaluate(() => {
      preview.ruleHook = () => {
        preview.ruleHook = null;
        preview.external('读取途中修订的教区');
      };
    });
    await panel.getByRole('button', {name:'重新读取势力',exact:true}).click();
    await panel.getByText(/读取失败：原生楼层.*已变化/).waitFor();
    await panel.getByRole('button', {name:'重试',exact:true}).click(); await ready();
    await page.evaluate(() => {
      preview.books.set('角色规则', [{name:'【配置】势力配置',content:'{"anchorDemands":{"2":7,"4":3}}',
        extra:{date:new Date('2026-10-28')}}]);
    });
    await panel.getByRole('button', {name:'重新读取势力',exact:true}).click(); await ready();
    await panel.getByText('10', {exact:true}).waitFor();
    for (const boundary of ['chat','script','document']) {
      await panel.getByRole('button', {name:'关闭',exact:true}).click();
      await page.evaluate(() => {preview.hold();void preview.open(0)});
      await page.waitForFunction(() => preview.waiting === 1);
      await page.evaluate(boundary => {
        if(boundary==='document'){
          const host=preview.modules['cryptLord.afterNativeHost'],read=host.getHost;
          const replacement=document.implementation.createHTMLDocument('replacement');
          host.getHost=()=>({window,document:replacement});
          preview.restore=()=>{host.getHost=read};
        }else preview[boundary]=`changed-${boundary}`;
        preview.release();
      },boundary);
      if(boundary==='document'){
        await panel.waitFor({state:'hidden'});
        await page.evaluate(()=>preview.restore());
        await page.locator('#open').click();
      }else{
        await panel.getByText(/读取失败：.*变化/).waitFor();
        await panel.getByRole('button',{name:'重试',exact:true}).click();
      }
      await ready();
    }
    await page.evaluate(async () => {
      const page = (await preview.modules['cryptLord.hostApi'].getChatMessages('2',{include_swipes:true}))[0];
      preview.ruleHook=()=>{
        preview.ruleHook=null;
        page.swipes_info[0].date.setUTCDate(29);
        preview.pages[2]=page;
      };
    });
    await panel.getByRole('button',{name:'重新读取势力',exact:true}).click();
    await panel.getByText(/读取失败：原生楼层.*已变化/).waitFor();
    await page.evaluate(()=>{delete preview.pages[2]});
    await panel.getByRole('button',{name:'重试',exact:true}).click(); await ready();
    await panel.getByRole('button',{name:'关闭',exact:true}).click();
    await page.evaluate(()=>{preview.addUser();return preview.api.open('faction')});
    await panel.getByText('读取失败：目标楼层不存在或不是 assistant').waitFor();
    await page.evaluate(()=>preview.pop());
    await panel.getByRole('button',{name:'关闭',exact:true}).click();
    assert.deepEqual(await page.evaluate(() => preview.writes), []);
    await page.evaluate(() => preview.api.open('industry', 2));
    await panel.getByRole('button', { name: '新建产业' }).click();
    await panel.getByPlaceholder('产业名称').fill('回归产业');
    await panel.getByRole('button', { name: '创建', exact: true }).click();
    await panel.getByRole('button', { name: '保存更改' }).click();
    await page.waitForFunction(() => preview.writes.length === 1);
    assert.deepEqual(await page.evaluate(() => preview.writes), [2]);
    assert.equal(await page.evaluate(() => Object.values(preview.floors[2].data.stat_data.产业)
      .some(item => item.名称 === '回归产业')), true);
    assert.equal(await page.evaluate(() => preview.floors[2].message), '本回合正文');
    assert.deepEqual(errors, []);
    await page.evaluate(() => preview.api.dispose());
    assert.equal(await page.locator('.crypt-lord-organization-console').count(), 0);
    await page.close();
    console.log(`势力完整浏览器流程通过：${width}px，只读楼层/神祇区域三军需求/刷新失败恢复/聊天切换`);
  }
} finally { await browser.close(); }
