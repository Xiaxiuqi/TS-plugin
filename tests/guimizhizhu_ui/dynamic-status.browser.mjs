import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/dynamic-status.preview.html?rules=1');
    await page.waitForFunction(()=>preview.modules['cryptLord.dynamicStatus'].status().nativeReady);
    const prompt=page.locator('#prompt'),states=page.locator('#states');
    await page.getByRole('button',{name:'只读预览'}).click();
    await prompt.filter({hasText:'昏迷-player红线'}).waitFor();
    assert.match(await prompt.innerText(),/艾琳.*虚弱-npc红线/);
    assert.deepEqual(await page.evaluate(()=>preview.writes),[]);
    assert.match(await states.innerText(),/旧名/);
    await page.getByRole('button',{name:'模拟原生请求'}).click();
    await page.waitForFunction(()=>preview.prompts.length===1);
    await page.getByRole('combobox').selectOption('quiet');
    await page.getByRole('button',{name:'模拟原生请求'}).click();
    assert.equal(await page.evaluate(()=>preview.prompts.length),1);
    await page.getByRole('button',{name:'停止生成'}).click();assert.equal(await prompt.innerText(),'');
    const helper=await page.evaluate(async()=>{
      const before=preview.prompts.length;
      preview.modules['cryptLord.nativeFloor']={hasActiveTurn:()=>true};
      const injects=await preview.modules['cryptLord.contextBuilder'].build({state:preview.floors[2].data});
      await preview.emit('start','normal',{},false);
      delete preview.modules['cryptLord.nativeFloor'];
      const stale=structuredClone(preview.floors[2].data);stale.npc_data.艾琳.当前活力=99;
      const rejected=await preview.modules['cryptLord.contextBuilder'].build({state:stale});
      return {native:preview.prompts.length-before,helper:injects.filter(row=>row.content.startsWith('[系统指令]')).length,
        rejected:rejected.length};
    });
    assert.deepEqual(helper,{native:0,helper:1,rejected:1});
    await page.getByRole('spinbutton',{name:'玩家当前活力'}).fill('80');
    await page.getByRole('button',{name:'保存模拟楼层'}).click();
    await states.filter({hasText:'坚韧描述'}).waitFor();
    assert.doesNotMatch(await states.innerText(),/旧名/);assert.match(await states.innerText(),/普通状态/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const written=await page.evaluate(()=>preview.writes.length);
    await page.getByLabel('保存失败').check();await page.getByRole('button',{name:'保存模拟楼层'}).click();
    await page.locator('#error').filter({hasText:'模拟保存失败'}).waitFor();
    assert.equal(await page.evaluate(()=>preview.writes.length),written);
    await page.getByLabel('保存失败').uncheck();await page.getByLabel('读取失败').check();
    await page.getByRole('button',{name:'保存模拟楼层'}).click();
    await page.locator('#error').filter({hasText:'模拟动态规则读取失败'}).waitFor();
    assert.equal(await page.evaluate(()=>preview.writes.length),written);
    await page.getByLabel('读取失败').uncheck();
    await page.getByRole('combobox').selectOption('normal');
    await page.getByRole('button',{name:'模拟原生请求'}).click();
    await prompt.filter({hasText:'坚韧-all红线'}).waitFor();
    const preserved=await page.evaluate(async()=>{
      const active=preview.prompts.at(-1),epoch=preview.modules['cryptLord.dynamicStatus'].status().epoch;
      for(const args of [['normal',{dryRun:true},false],['quiet_prompt',{},false],['normal',{},true]])
        await preview.emit('start',...args);
      return active.active&&preview.modules['cryptLord.dynamicStatus'].status().epoch===epoch;
    });
    assert.equal(preserved,true);
    await page.screenshot({path:path.join(os.tmpdir(),`dynamic-status-${width}.png`)});
    const count=await page.evaluate(()=>preview.prompts.length);
    await page.evaluate(()=>preview.conflict());await page.getByRole('button',{name:'模拟原生请求'}).click();
    await page.waitForFunction(()=>preview.warnings.some(text=>text.includes('本次未注入动态指令')));
    assert.equal(await page.evaluate(()=>preview.prompts.length),count);
    await page.getByRole('combobox').selectOption('regenerate');
    await page.getByRole('button',{name:'模拟原生请求'}).click();
    await prompt.filter({hasText:'昏迷-player红线'}).waitFor();
    await page.getByRole('combobox').selectOption('continue');
    await page.getByRole('button',{name:'模拟原生请求'}).click();
    await prompt.filter({hasText:'坚韧-all红线'}).waitFor();
    await page.getByRole('combobox').selectOption('append');
    await page.getByRole('button',{name:'模拟原生请求'}).click();
    await prompt.filter({hasText:'坚韧-all红线'}).waitFor();
    const hidden=await page.evaluate(async()=>{
      const before=preview.prompts.length;
      preview.floors[2].is_hidden=true;
      await preview.emit('start','normal',{},false);
      delete preview.floors[2].is_hidden;
      return {newPrompts:preview.prompts.length-before,active:preview.prompts.filter(row=>row.active).length};
    });
    assert.deepEqual(hidden,{newPrompts:0,active:0});
    const branchBefore=await page.evaluate(()=>preview.prompts.length);
    await page.evaluate(()=>{preview.hold();preview.pending=preview.emit('start','normal',{},false)});
    await page.waitForFunction(()=>preview.waiting===1);
    await page.evaluate(()=>{
      const row=preview.floors[0],{message,data,...metadata}=row;
      preview.pages.set(0,{...metadata,swipe_id:1,swipes:['被修改的未选分支',message],
        swipes_data:[{},data],swipes_info:[{changed:true},{}]});
      preview.release();
    });
    await page.waitForFunction(()=>preview.waiting===0);
    await page.evaluate(()=>preview.pending);
    assert.equal(await page.evaluate(()=>preview.prompts.length),branchBefore);
    await page.evaluate(()=>preview.pages.clear());
    await page.getByRole('button',{name:'模拟原生结算'}).click();
    await page.waitForFunction(()=>preview.floors[4]?.data.stat_data?.当前状态['[系统状态]坚韧']==='坚韧描述');
    assert.equal(await page.evaluate(()=>preview.floors[4].message),'本回合已生成正文');
    await page.getByLabel('读取失败').check();await page.getByRole('button',{name:'模拟原生结算'}).click();
    await page.waitForFunction(()=>preview.warnings.some(text=>text.includes('动态状态规则不可用')));
    assert.equal(await page.evaluate(()=>preview.floors[4].message),'本回合已生成正文');
    await page.getByLabel('读取失败').uncheck();
    const total=await page.evaluate(()=>preview.prompts.length);
    for(const stop of ['停止生成','切换聊天']){
      await page.evaluate(()=>{preview.hold();void preview.emit('start','normal',{},false)});
      await page.waitForFunction(()=>preview.waiting===1);
      await page.getByRole('button',{name:stop}).click();
      await page.evaluate(()=>preview.release());await page.waitForFunction(()=>preview.waiting===0);
      assert.equal(await page.evaluate(()=>preview.prompts.length),total);
    }
    assert.deepEqual(await page.evaluate(()=>preview.floors[0]),await page.evaluate(()=>preview.initial[0]));
    assert.deepEqual(await page.evaluate(()=>preview.floors[2].data.otherPlugin),{保留:true});
    assert.deepEqual(await page.evaluate(()=>preview.floors[2].data.npc_data.$meta),{保留:true});
    assert.ok(await page.evaluate(()=>preview.writes.every(row=>[2,4].includes(row.message_id))));
    await page.evaluate(()=>{
      preview.books['实际角色主库']=structuredClone(preview.books['1源堡']);
      preview.books['实际角色主库'].push({name:'【模板】提示词模板',content:JSON.stringify({variable_template:'实际角色结算模板'})});
      preview.books['1源堡']=[{name:'【动态规则】旧固定书',content:'坏条目，不应读旧固定主书'}];
      Object.assign(preview.binding,{primary:'实际角色主库',additional:['实际角色主库']});
      preview.variables['cryptLord.variableSettlement'].enabled=true;
    });
    await page.getByRole('button',{name:'只读预览'}).click();
    await prompt.filter({hasText:'坚韧-all红线'}).waitFor();
    const lastWrite=await page.evaluate(()=>preview.writes.length);
    await page.getByRole('button',{name:'模拟原生结算'}).click();
    await page.waitForFunction(()=>preview.floors[4].data.stat_data.当前活力===50);
    assert.equal(await page.evaluate(()=>preview.requests.at(-1).ordered_prompts[0].content),'实际角色结算模板');
    assert.equal(await page.evaluate(()=>preview.writes.length),lastWrite+1);
    assert.equal(await page.evaluate(()=>preview.floors[4].data.stat_data.当前状态['[系统状态]坚韧']),'坚韧描述');
    await page.screenshot({path:path.join(os.tmpdir(),`generation-rules-${width}.png`)});
    const ruleConflict=await page.evaluate(async()=>{
      const store=preview.modules['cryptLord.stateStore'],before=preview.writes.length;
      try{
        await store.writeAssistantData(2,preview.floors[2].data,'affected',()=>{
          preview.books['实际角色主库'][0].enabled=true;
        });
        return {failed:false};
      }catch(error){return {failed:true,error:error.message,writes:preview.writes.length-before}}
    });
    assert.equal(ruleConflict.failed,true);assert.match(ruleConflict.error,/规则来源已变化/);assert.equal(ruleConflict.writes,0);
    const lateIdentity=await page.evaluate(async()=>{
      const before=preview.writes.length;
      try{
        await preview.modules['cryptLord.stateStore'].writeAssistantData(2,preview.floors[2].data,'affected',
          undefined,undefined,{onWriteAttempt(){preview.identity.script+='-changed'}});
        return {rejected:false};
      }catch(error){return {rejected:true,error:error.message,writes:preview.writes.length-before}}
    });
    assert.equal(lateIdentity.rejected,true);assert.match(lateIdentity.error,/已变化/);assert.equal(lateIdentity.writes,0);
    await page.evaluate(()=>{preview.modules['cryptLord.dynamicStatus'].dispose();preview.modules['cryptLord.gameContextProviders'].dispose()});
    assert.equal(await page.evaluate(()=>preview.modules['cryptLord.contextBuilder'].status().providerIds.length),0);
    assert.deepEqual(errors,[]);await page.close();
    console.log(`动态状态完整流程通过：${width}px，原版派生、红线注入、真实保存桥、失败保护与跨聊天取消。`);
  }
}finally{await browser.close()}
