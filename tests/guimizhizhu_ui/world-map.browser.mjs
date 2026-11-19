import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const urls = ['https://files.catbox.moe/wpsj51.png','https://www.helloimg.com/i/2026/03/01/69a4494492705.png'];
const assets = new Map(), unavailable = [];
try {
  const probe = await browser.newContext();
  for (const url of urls) {
    const assetPage = await probe.newPage();
    try {
      const response = await assetPage.goto(url,{timeout:15000,waitUntil:'load'});
      if (!response.ok() || !/image\//.test(response.headers()['content-type'] || '')) throw Error(`HTTP ${response.status()}`);
      assert.ok(await assetPage.locator('img').evaluate(image=>image.naturalWidth>0));
      assets.set(url,{body:await response.body(),contentType:response.headers()['content-type']});
    } catch (error) { unavailable.push({url,error:error.message}); }
    finally { await assetPage.close(); }
  }
  if (unavailable.length) {
    // A conspicuous test bitmap verifies image geometry when an external image host is down.
    const fixture = await probe.newPage({viewport:{width:1000,height:514}});
    await fixture.setContent('<canvas width="1000" height="514"></canvas>');
    await fixture.locator('canvas').evaluate(canvas => {
      const context=canvas.getContext('2d');
      context.fillStyle='#adcfce';context.fillRect(0,0,1000,514);
      context.fillStyle='#648662';context.fillRect(350,50,280,270);
      context.strokeStyle='#3c565b';context.lineWidth=2;
      for(let x=0;x<1000;x+=100) {context.beginPath();context.moveTo(x,0);context.lineTo(x,514);context.stroke();}
      for(let y=0;y<514;y+=100) {context.beginPath();context.moveTo(0,y);context.lineTo(1000,y);context.stroke();}
      context.fillStyle='#162c2b';context.font='24px Arial';context.fillText('TEST BITMAP - external image unavailable',24,480);
    });
    const body=await fixture.locator('canvas').screenshot();
    for(const {url} of unavailable) assets.set(url,{body,contentType:'image/png'});
    await fixture.close();
  }
  await probe.close();
  for (const width of [1280,390]) {
    const page=await browser.newPage({viewport:{width,height:820}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    let imageFail=false;
    await page.route('https://**/*',async route=>{
      const asset=assets.get(route.request().url());
      if (!asset) return route.continue();
      if (imageFail) return route.abort('failed');
      return route.fulfill(asset);
    });
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/world-map.preview.html');
    const panel=page.getByRole('dialog',{name:'世界地图',exact:true,includeHidden:true});
    const idle=()=>page.waitForFunction(()=>document.querySelector('.crypt-lord-world-map').getAttribute('aria-busy')==='false');
    const loaded=()=>page.waitForFunction(()=>document.querySelector('.crypt-lord-world-map__image')?.naturalWidth>0);
    const refresh=async()=>{await panel.getByRole('button',{name:'刷新地图数据'}).click();await idle();};
    const stage=panel.locator('.crypt-lord-world-map__stage');
    const player=panel.locator('.crypt-lord-world-map__player');
    await idle();await loaded();
    assert.equal(await player.count(),1);
    assert.equal(await panel.locator('polygon').count(),2);
    assert.equal(await panel.locator('.crypt-lord-world-map__landmark-label').isVisible(),false);
    const aligned=await page.evaluate(()=>{
      const rect=document.querySelector('.crypt-lord-world-map__stage').getBoundingClientRect();
      const p=document.querySelector('.crypt-lord-world-map__player').getBoundingClientRect();
      const l=document.querySelector('.crypt-lord-world-map__landmark').getBoundingClientRect();
      const image=document.querySelector('.crypt-lord-world-map__image').getBoundingClientRect();
      return {x:(p.x+p.width/2-rect.x)/rect.width*100,y:(p.y+p.height/2-rect.y)/rect.height*100,
        landmarkX:l.x+l.width/2,landmarkY:l.y+l.height/2,playerX:p.x+p.width/2,playerY:p.y+p.height/2,
        ratio:rect.height/rect.width,imageWidth:image.width,stageWidth:rect.width};
    });
    assert.ok(Math.abs(aligned.x-55.36)<.02 && Math.abs(aligned.y-26.34)<.02);
    assert.ok(Math.abs(aligned.playerX-aligned.landmarkX)<.1 && Math.abs(aligned.playerY-aligned.landmarkY)<.1);
    assert.ok(Math.abs(aligned.ratio-.5135)<.0001);
    assert.equal(aligned.imageWidth,aligned.stageWidth);
    await panel.getByRole('button',{name:'放大地图'}).click();
    assert.equal(await stage.getAttribute('data-landmarks'),'true');
    const viewport=panel.locator('.crypt-lord-world-map__viewport');
    const rect=await viewport.boundingBox();
    await page.mouse.move(rect.x+rect.width*.3,rect.y+rect.height*.45);
    await page.mouse.down();await page.mouse.move(rect.x+rect.width*.3+40,rect.y+rect.height*.45+20);await page.mouse.up();
    const main=await page.evaluate(()=>preview.api.status().views.main);
    assert.equal(main.scale,1.2);assert.ok(main.x>30 && main.y>10);
    imageFail=true;
    await panel.getByRole('tab',{name:'神弃之地',exact:true}).click();
    await panel.getByText('地图图片加载失败',{exact:true}).waitFor();
    imageFail=false;
    await panel.getByRole('button',{name:'重试地图图片'}).click();await loaded();
    assert.equal(await panel.getByText('地图图片加载失败',{exact:true}).count(),0);
    assert.equal(await player.count(),0);
    assert.equal(await panel.locator('polygon').count(),0);
    assert.equal(await panel.locator('output').textContent(),'100%');
    await panel.getByRole('button',{name:'放大地图'}).click();
    await panel.getByRole('button',{name:'放大地图'}).click();
    assert.equal(await panel.locator('output').textContent(),'140%');
    await page.screenshot({path:path.join(os.tmpdir(),`world-map-shenqi-${width}.png`)});
    await panel.getByRole('tab',{name:'世界地图',exact:true}).click();await loaded();
    assert.deepEqual(await page.evaluate(()=>preview.api.status().views.main),main);
    await panel.getByRole('button',{name:'重置地图视图'}).click();
    assert.deepEqual(await page.evaluate(()=>preview.api.status().views.main),{x:0,y:0,scale:1});
    for(let i=0;i<3;i++) await panel.getByRole('button',{name:'缩小地图'}).click();
    assert.equal(await panel.locator('output').textContent(),'40%');
    assert.equal(await panel.getByRole('button',{name:'缩小地图'}).isDisabled(),true);
    assert.equal(await stage.getAttribute('data-regions'),'false');
    assert.equal(await panel.locator('.crypt-lord-world-map__player-label').isVisible(),false);
    assert.equal(await panel.locator('.crypt-lord-world-map__landmark').isVisible(),true);
    await panel.getByRole('button',{name:'重置地图视图'}).click();
    for(let i=0;i<20;i++) await panel.getByRole('button',{name:'放大地图'}).click();
    assert.equal(await panel.locator('output').textContent(),'500%');
    assert.equal(await panel.getByRole('button',{name:'放大地图'}).isDisabled(),true);
    await panel.getByRole('button',{name:'重置地图视图'}).click();
    await page.evaluate(()=>preview.update(60,15.405,'楼层更新位置'));await idle();
    assert.equal(await player.evaluate(node=>node.style.left),'60%');
    assert.ok(Math.abs(parseFloat(await player.evaluate(node=>node.style.top))-30)<.001);
    await panel.getByRole('button',{name:'放大地图'}).click();
    await page.screenshot({path:path.join(os.tmpdir(),`world-map-${width}.png`)});
    const layout=await page.evaluate(()=>{
      const dialog=document.querySelector('[role="dialog"]').getBoundingClientRect();
      return {left:dialog.left,right:dialog.right,bottom:dialog.bottom,
        overflow:document.documentElement.scrollWidth>innerWidth,
        toolbar:document.querySelector('.crypt-lord-world-map__toolbar').scrollWidth};
    });
    assert.ok(layout.left>=0 && layout.right<=width && layout.bottom<=820);
    assert.equal(layout.overflow,false);
    assert.ok(layout.toolbar<=width);
    await page.evaluate(()=>{preview.readFail=true;});await refresh();
    await panel.getByRole('status').filter({hasText:'模拟读取失败'}).waitFor();
    assert.equal(await player.count(),0);
    assert.equal(await panel.locator('polygon').count(),0);
    await page.evaluate(()=>{preview.readFail=false;});await refresh();
    assert.equal(await player.count(),1);
    await page.evaluate(()=>{preview.hidden=true;});await refresh();
    await panel.getByRole('status').filter({hasText:'已隐藏'}).waitFor();
    assert.equal(await player.count(),0);
    await page.evaluate(()=>{preview.hidden=false;preview.mismatch=true;});await refresh();
    await panel.getByRole('status').filter({hasText:'所选分支已变化'}).waitFor();
    assert.equal(await player.count(),0);
    await page.evaluate(()=>{preview.mismatch=false;});await refresh();
    for(const args of [['quiet',{},false],['dryRun',{},false],['normal',{quiet_prompt:'静默'},false],
      ['normal',{dryRun:true},false],['normal',{},true]]) {
      await page.evaluate(args=>preview.generation(...args),args);
      assert.equal(await player.count(),1);
      assert.equal(await panel.getByRole('button',{name:'刷新地图数据'}).isEnabled(),true);
    }
    await page.evaluate(()=>preview.generation());
    await panel.getByRole('status').filter({hasText:'等待完整楼层位置'}).waitFor();
    assert.equal(await player.count(),0);
    assert.equal(await panel.getByRole('button',{name:'刷新地图数据'}).isDisabled(),true);
    await page.evaluate(()=>preview.stop());await idle();
    assert.equal(await player.count(),1);
    const saved=await page.evaluate(()=>preview.api.status().views.main);
    await panel.getByRole('tab',{name:'神弃之地',exact:true}).click();await loaded();
    assert.equal(await panel.locator('output').textContent(),'140%');
    await panel.getByRole('tab',{name:'世界地图',exact:true}).click();await loaded();
    assert.deepEqual(await page.evaluate(()=>preview.api.status().views.main),saved);
    await page.evaluate(()=>preview.hold());
    await panel.getByRole('button',{name:'刷新地图数据'}).click();
    await page.waitForFunction(()=>preview.waiting>0);
    await panel.getByRole('button',{name:'关闭地图'}).click();
    await page.locator('#open').click();
    await page.evaluate(()=>{preview.update(65,10.27,'重开后的新位置');preview.release();});await idle();
    assert.equal(await player.evaluate(node=>node.style.left),'65%');
    await page.evaluate(()=>preview.hold());
    await panel.getByRole('button',{name:'刷新地图数据'}).click();
    await page.waitForFunction(()=>preview.waiting>0);
    await page.evaluate(()=>{preview.chatChanged();preview.release();});
    assert.equal(await panel.isVisible(),false);
    await page.locator('#open').click();await idle();
    assert.deepEqual(await page.evaluate(()=>preview.api.status().views),{main:{x:0,y:0,scale:1},shenqi:{x:0,y:0,scale:1}});
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(),false);
    assert.equal(await page.locator('#open').evaluate(node=>node===document.activeElement),true);
    await page.locator('#open').click();await idle();
    await page.evaluate(()=>preview.hold());
    await panel.getByRole('button',{name:'刷新地图数据'}).click();
    await page.waitForFunction(()=>preview.waiting>0);
    const preserved=await page.evaluate(()=>{
      const api=preview.api;api.dispose();preview.release();preview.update(1,1);
      return preview.writes===0 && JSON.stringify([...preview.books])===JSON.stringify([...preview.original]) && api.status().ready===false;
    });
    assert.equal(preserved,true);
    assert.equal(await panel.count(),0);
    await page.waitForFunction(()=>preview.waiting===0);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('World map: focused desktop/mobile full workflow passed; no worldbook/floor writes.');
  console.log(unavailable.length ? `External image verification unavailable (test bitmaps used): ${JSON.stringify(unavailable)}` :
    'Both original bitmap images fetched and rendered successfully.');
} finally { await browser.close(); }
