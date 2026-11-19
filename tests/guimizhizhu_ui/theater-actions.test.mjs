import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const source = await read('public/guimizhizhu_ui/core/theater-actions.js');
const sourceReader = await read('public/guimizhizhu_ui/core/native-floor-source.js');
const bridgeSource = await read('public/guimizhizhu_ui/core/generation-bridge.js');
const settlementSource = await read('public/guimizhizhu_ui/core/native-settlement.js');
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36a-js-items-equip-relationships.txt');
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const floors = [
    {message_id:0,role:'assistant',message:'开场',data:{stat_data:{剧场点数:200,保留:'原样'},npc_data:{同伴:{活力:8}}}},
  ];
  const initial=structuredClone(floors);
  const flags={input:'保留输入',inputFail:false,readsFail:false,writeFail:false,writes:[],injects:[],uninjects:0,
    readHook:null,modelPoints:1,page:0,pageHook:null,beforeWrite:null,finalGuard:null,responseLost:false};
  const events={GENERATION_AFTER_COMMANDS:'before',CHAT_CHANGED:'chat',GENERATION_STOPPED:'stop'};
  const handlers=new Map(),modules={};
  const host={
    async getChatMessages(range,options) {
      await flags.readHook?.();
      if(flags.readsFail) throw Error('模拟读取失败');
      const rows=range==='0-{{lastMessageId}}' ? floors :
        range===-1 ? floors.slice(-1) : floors.filter(item=>item.message_id===Number(range));
      if(!options?.include_swipes) return structuredClone(rows);
      const pages=rows.map(row=>({message_id:row.message_id,role:row.role,name:row.name,is_hidden:row.is_hidden,
        swipe_id:flags.page,swipes:[row.message,row.message],swipes_data:[row.data,row.data],swipes_info:[{},{}]}));
      await flags.pageHook?.(pages);
      return structuredClone(pages);
    },
    injectPrompts(items,options) { flags.injects.push({items:structuredClone(items),options});return {uninject(){flags.uninjects++;}}; },
  };
  modules['cryptLord.hostApi']=host;
  modules['cryptLord.inputAdapter']={submit(text){if(flags.inputFail) throw Error('输入框失败');flags.input=text;return true;}};
  modules['cryptLord.inputAdapter'].setInputText=text=>{flags.input=text;return true;};
  const document={querySelector:()=>({get value(){return flags.input;}})};
  modules['cryptLord.afterNativeHost']={
    getHost(){return {window:context,document};},
    tavernEvents:()=>events,bindEvent(name,fn){const list=handlers.get(name)||new Set();list.add(fn);handlers.set(name,list);
      return {stop(){list.delete(fn);}};},
  };
  const context={console:{log(){},warn(){},info(){},error(){}},structuredClone,DOMException,Event:class {constructor(type){this.type=type;}},
    dispatchEvent(){},cryptLord:{__stage1Modules:modules,contract:{
      initializeGlobal(key,api){modules[key]=api;},releaseGlobal(key){delete modules[key];},
      async waitGlobalInitialized(key){assert.ok(modules[key],key);return modules[key];},
    }}};
  context.window=context;
  vm.createContext(context);vm.runInContext(sourceReader,context);vm.runInContext(source,context);
  const api=modules['cryptLord.theaterActions'];
  const emit=async(name,...args)=>{for(const fn of [...(handlers.get(events[name])||[])])await fn(...args);};
  const queue=async id=>{const snap=await api.snapshot(0);return api.queue(id,0,snap.revision);};
  const start=async id=>{
    await queue(id);
    await emit('GENERATION_AFTER_COMMANDS','normal',{},false);
    assert.equal(floors.length,1);
    floors.push({message_id:1,role:'user',message:flags.input,data:{user:'保留'}});
    floors.push({message_id:2,role:'assistant',message:'原生正文',data:{}});
  };
  const transaction={userMessageId:1,assistantMessageId:2,generationId:'native-host-2',userText:'寻找幕后工作人员',narrativeText:'正文'};
  const bridge=()=>{
    modules['cryptLord.stateStore']={
      async readAssistantData(){return structuredClone(floors[0].data);},
      async readMessage(id){return structuredClone(floors.find(item=>item.message_id===id));},
      async writeAssistantMessage(id,message,data,options={}){
        await flags.beforeWrite?.();
        await options.beforeWrite?.();
        await flags.finalGuard?.();options.guard?.();
        if(flags.writeFail) throw Error('模拟楼层提交失败');
        data=structuredClone(data);
        modules['cryptLord.nativeSettlement'].apply(data,floors[0].data,options.settlementContext);
        flags.writes.push(id);Object.assign(floors.find(item=>item.message_id===id),{message,data:structuredClone(data)});
        if(flags.responseLost) throw Error('提交响应丢失');
        return structuredClone(data);
      },
    };
    modules['cryptLord.contextBuilder']={build:async()=>[]};
    modules['cryptLord.responseNormalizer']={extractActions:()=>[]};
    modules['cryptLord.variablePatch']={apply(){const data=structuredClone(floors[0].data);data.stat_data.剧场点数=flags.modelPoints;data.world_data={天气:'新天气'};return {applied:true,data};},
      updateTag:()=>'',embedUpdate:text=>text};
    modules['cryptLord.variableSettlementApi']={settle:async()=>({skipped:true})};
    vm.runInContext(settlementSource,context);vm.runInContext(bridgeSource,context);
    return modules['cryptLord.nativeFloorBridge'];
  };
  return {api,floors,initial,flags,emit,queue,start,transaction,bridge,modules};
}
test('原版剧场全行动/价格对照与只读准备、取消、冲突保护',async()=>{
  const f=fixture();
  const at=original.indexOf('renderTheaterTab() {');
  const tree=ts.createSourceFile('original.js',`({${original.slice(at)}\n})`,99,true,ts.ScriptKind.JS);
  const calls=[];
  function visit(node) {
    if(ts.isCallExpression(node) && node.expression.getText(tree)==='handleTheaterAction')
      calls.push([node.arguments[0].text,Number(node.arguments[1].getText(tree))]);
    ts.forEachChild(node,visit);
  }
  visit(tree);
  assert.deepEqual(plain(f.api.actions().slice(0,3).map(item=>[item.label,item.cost])),calls);
  assert.match(original,/handleAction\("寻找角斗场工作人员", false\)/);
  assert.equal(f.api.actions()[3].cost,0);
  const snapshot=await f.api.snapshot();
  assert.equal(snapshot.message.message_id,0);
  await f.queue('staff');
  assert.equal(f.flags.input,'寻找幕后工作人员');
  assert.deepEqual(f.floors,f.initial);
  assert.equal(f.flags.writes.length,0);
  f.api.cancel();assert.equal(f.api.status().pending,null);
  assert.deepEqual(f.floors,f.initial);
  f.flags.inputFail=true;
  await assert.rejects(f.queue('staff'),/输入框失败/);
  assert.equal(f.api.status().pending,null);
  f.flags.inputFail=false;
  f.floors[0].data.stat_data.剧场点数=49;
  await assert.rejects(f.queue('tickets'),/不足 50/);
  const old=await f.api.snapshot(0);
  f.floors[0].message='外部修改';
  await assert.rejects(f.api.queue('events',0,old.revision),/已变化/);
  await assert.rejects(f.api.queue('events',0,structuredClone(old.revision)),/凭据无效/);
  f.floors.push({message_id:2,role:'assistant',message:'新楼层',data:{}});
  const historical=await f.api.snapshot(0);
  await assert.rejects(f.api.queue('events',0,historical.revision),/最新 assistant/);
  f.floors.pop();
  await assert.rejects(f.api.queue('events',0,historical.revision,()=>false),/已取消/);
  await f.queue('events');
  await f.emit('GENERATION_AFTER_COMMANDS','quiet',{quiet_prompt:'变量请求'},false);
  assert.equal(f.flags.injects.length,0);
  await f.emit('GENERATION_AFTER_COMMANDS','normal',{},true);
  assert.equal(f.flags.injects.length,0);
  await f.emit('GENERATION_AFTER_COMMANDS','dryRun',{},false);
  await f.emit('GENERATION_AFTER_COMMANDS','normal',{dryRun:true},false);
  assert.equal(f.flags.injects.length,0);
  f.flags.input='修改后的普通行动';
  f.floors.push({message_id:1,role:'user',message:'修改后的普通行动',data:{}});
  await f.emit('GENERATION_AFTER_COMMANDS','normal',{},false);
  assert.equal(f.api.status().pending,null);
  assert.equal(f.flags.injects.length,0);
  f.flags.readsFail=true;
  await assert.rejects(f.api.snapshot(),/模拟读取失败/);
  f.flags.readsFail=false;
  f.floors.splice(1);
  const stable=await f.api.snapshot(0);
  f.flags.page=1;
  await assert.rejects(f.api.queue('events',0,stable.revision),/已变化/);
  f.flags.page=0;f.flags.pageHook=pages=>{pages[0].swipes_data[0]={stat_data:{剧场点数:999}};};
  await assert.rejects(f.api.snapshot(),/所选分支已变化/);
  f.flags.pageHook=null;
  f.floors[0].is_hidden=true;
  await assert.rejects(f.api.snapshot(),/已隐藏/);
  delete f.floors[0].is_hidden;
  f.floors.push({message_id:1,role:'user',message:'新的回合',data:{}});
  const withUser=await f.api.snapshot(0);
  assert.equal(withUser.editable,false);
  await assert.rejects(f.api.queue('events',0,withUser.revision),/新的用户回合/);
  f.api.dispose();
  await assert.rejects(f.api.snapshot(),/已取消/);
});
test('实际原生桥一次结算、停止/改写/保存失败保护和免费角斗场链',async()=>{
  let f=fixture();await f.start('staff');
  assert.equal(f.flags.injects.length,1);
  assert.equal(f.flags.injects[0].options.once,true);
  assert.equal(f.flags.injects[0].items[0].should_scan,false);
  assert.match(f.flags.injects[0].items[0].content,/基础余额：120/);
  const run=f.bridge();
  f.flags.writeFail=true;
  await assert.rejects(run.completeNarrative('正文',f.transaction),/楼层提交失败/);
  assert.equal(f.floors[0].data.stat_data.剧场点数,200);
  assert.equal(f.api.status().busy,true);
  f.flags.writeFail=false;
  await run.completeNarrative('正文',f.transaction);
  assert.equal(f.floors[2].data.stat_data.剧场点数,120);
  assert.equal(f.floors[2].data.world_data.天气,'新天气');
  assert.deepEqual(f.floors[0],f.initial[0]);
  assert.deepEqual(f.floors[1].data,{user:'保留'});
  assert.equal(f.floors[2].message,'原生正文');
  assert.equal(f.floors[2].data.cryptLord.theaterAction.cost,80);
  assert.equal('revision' in f.floors[2].data.cryptLord.theaterAction,false);
  assert.equal(f.api.status().pending,null);
  await run.completeNarrative('正文',f.transaction);
  assert.equal(f.floors[2].data.stat_data.剧场点数,120);
  assert.deepEqual(f.flags.writes,[2,2]);
  f=fixture();await f.start('tickets');
  await f.emit('GENERATION_STOPPED');
  const untouched=structuredClone(f.floors[0].data);
  assert.equal((await f.api.settle(untouched,{...f.transaction,userText:'寻找售票工作人员'})).applied,false);
  assert.deepEqual(untouched,f.floors[0].data);
  assert.equal(f.flags.writes.length,0);
  f=fixture();await f.start('staff');
  await f.emit('GENERATION_AFTER_COMMANDS','quiet',{quiet_prompt:'副API'},false);
  assert.equal(f.api.status().busy,true);
  f.floors[0].data.stat_data.其他插件='外部变更';
  const rejected=structuredClone(f.floors[0].data);
  assert.match((await f.api.settle(rejected,f.transaction)).warning,/来源楼层已变化/);
  assert.equal(rejected.stat_data.剧场点数,200);
  f=fixture();await f.start('staff');
  f.floors[1].message='改写用户行动';
  assert.equal((await f.api.settle(structuredClone(f.floors[0].data),f.transaction)).applied,false);
  f=fixture();await f.start('staff');
  await f.emit('CHAT_CHANGED');
  assert.equal((await f.api.settle(structuredClone(f.floors[0].data),f.transaction)).applied,false);
  f=fixture();await f.queue('staff');
  f.floors.push({message_id:1,role:'user',message:f.flags.input,data:{}});
  await f.emit('GENERATION_AFTER_COMMANDS','normal',{},false);
  f.floors.push({message_id:2,role:'assistant',message:'之前请求的迟到响应',data:{}});
  assert.equal((await f.api.settle(structuredClone(f.floors[0].data),f.transaction)).applied,false);
  assert.equal(f.floors[0].data.stat_data.剧场点数,200);
  f=fixture();await f.start('arena');
  f.flags.modelPoints=250;
  await f.bridge().completeNarrative('正文',{...f.transaction,userText:'寻找角斗场工作人员'});
  assert.equal(f.floors[2].data.stat_data.剧场点数,250);
  assert.equal(f.floors[2].data.cryptLord.theaterAction.cost,0);
  f=fixture();await f.start('tickets');
  const rewardBridge=f.bridge();
  const rewardTransaction={...f.transaction,userText:'寻找售票工作人员',narrativeText:'文'.repeat(2000)};
  await rewardBridge.completeNarrative('正文',rewardTransaction);
  assert.equal(f.floors[2].data.stat_data.剧场点数,151);
  assert.equal(f.floors[0].data.stat_data.剧场点数,200);
  await rewardBridge.completeNarrative('正文',rewardTransaction);
  assert.equal(f.floors[2].data.stat_data.剧场点数,151);
  for(const change of [
    f=>{f.flags.page=1;}, f=>{f.floors[1].message='保存前改写用户';},
    f=>{f.floors[0].data.stat_data.其他插件='保存前变更';},
    f=>{f.modules['cryptLord.theaterActions']={};},
    f=>{f.modules['cryptLord.nativeFloorSource']={};},
  ]) {
    const changed=fixture();await changed.start('staff');
    changed.flags.beforeWrite=()=>change(changed);
    await assert.rejects(changed.bridge().completeNarrative('正文',changed.transaction),/变化|卸载|凭据|取消/);
    assert.equal(changed.flags.writes.length,0);
    assert.deepEqual(changed.floors[2].data,{});
  }
  const lost=fixture();await lost.start('staff');const lostBridge=lost.bridge();
  lost.flags.responseLost=true;
  await assert.rejects(lostBridge.completeNarrative('正文',lost.transaction),/响应丢失/);
  assert.equal(lost.floors[2].data.stat_data.剧场点数,120);
  const late=fixture();await late.start('staff');
  late.flags.finalGuard=()=>late.emit('GENERATION_STOPPED');
  await assert.rejects(late.bridge().completeNarrative('正文',late.transaction),/凭据已变化/);
  assert.equal(late.flags.writes.length,0);
  await lost.emit('GENERATION_STOPPED');
  lost.flags.responseLost=false;
  await lostBridge.completeNarrative('正文',lost.transaction);
  assert.equal(lost.floors[2].data.stat_data.剧场点数,120);
  assert.equal(lost.api.status().pending,null);
  const savedWrites=lost.flags.writes.length;
  lost.flags.pageHook=pages=>{pages[1].swipes_info[0].external='原生用户元数据变化';};
  await assert.rejects(lostBridge.completeNarrative('正文',lost.transaction),/用户回合或消息分支已变化/);
  assert.equal(lost.flags.writes.length,savedWrites);
  assert.equal(lost.floors[2].data.stat_data.剧场点数,120);
  const forged=fixture();
  forged.floors.push({message_id:1,role:'user',message:forged.transaction.userText,data:{}},
    {message_id:2,role:'assistant',message:'伪造凭据',data:{cryptLord:{theaterAction:{
      actionId:'staff',label:forged.transaction.userText,cost:80,points:200,sourceId:0,userId:1,assistantId:2}}}});
  assert.equal((await forged.api.settle(structuredClone(forged.initial[0].data),forged.transaction)).applied,false);
});
