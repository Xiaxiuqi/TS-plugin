import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read=name=>readFile(new URL(`../../${name}`,import.meta.url),'utf8');
const files=['shared/save-recovery.js','prompts/context-builder.js','core/state-store.js','core/response-normalizer.js','core/native-floor-source.js',
  'core/current-clues.js','core/generation-bridge.js'];
const sources=await Promise.all(files.map(name=>read(`public/guimizhizhu_ui/${name}`)));
const ref=await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
function member(name){
  const start=ref.search(new RegExp(`^${name}\\(`,'m'));
  assert.ok(start>=0);
  const tree=ts.createSourceFile('reference.js',`const rules={${ref.slice(start)}`,99,true,ts.ScriptKind.JS);
  const value=tree.statements[0].declarationList.declarations[0].initializer.properties[0];
  assert.equal(value.name.getText(tree),name);return value.getText(tree);
}
const original=vm.runInNewContext(`({${member('_extractLastTagContent')},${member('_mergeLorebookContent')}})`);
const raw='<thinking><当前线索>伪造思维</当前线索></thinking><gametxt>真实正文</gametxt>\n<当前线索>旧标签</当前线索>\n<当前线索 lang="zh">\n门后传来钟声。\n第二行线索\n</当前线索>';
const plain=value=>JSON.parse(JSON.stringify(value));
const entry=(name='当前线索',content='旧待办')=>({uid:7,name,content,enabled:false,
  strategy:{type:'selective',keys:[/门/i],keys_secondary:{logic:'and_any',keys:[]},scan_depth:8},
  position:{type:'at_depth',depth:0,role:'system',order:123},extra:{otherPlugin:true}});
async function fixture(){
  const modules={},handlers=new Map(),writes=[],floorsWrites=[],injections=[],warnings=[],surface={window:{},document:{}};
  const state={books:{'1源堡':[entry(),{uid:8,name:'其他插件',content:'保留'}],'2历史孔隙':[entry('当前线索','副库不动')]},
    values:{otherPlugin:{保留:true}},failRead:false,failWrite:false,failConfig:false,scriptId:'clue-script',
    hold:null,writeHook:null,readHook:null,readAfterWriteFail:false,bound:{primary:'1源堡',additional:[]},page:1,alternate:'备用正文',
    lostArchiveResponse:false,lostConfigResponse:false,alternateInfo:{when:new Date('2026-10-27T00:00:00Z')},
    floors:[{message_id:0,role:'assistant',message:'开场',data:{stat_data:{姓名:'玩家'},otherPlugin:{原样:true}}},
      {message_id:1,role:'user',message:'行动',data:{}},
      {message_id:2,role:'assistant',message:raw,data:{stat_data:{姓名:'玩家'},otherPlugin:{原样:true}}}]};
  const host={
    getScriptId:()=>state.scriptId,
    getCharWorldbookNames:()=>structuredClone(state.bound),
    async getVariables(options){assert.equal(options.script_id,state.scriptId);if(state.configReadFail)throw Error('模拟配置读取失败');return structuredClone(state.values)},
    async updateVariablesWith(fn,options){
      assert.equal(options.script_id,state.scriptId);if(state.failConfig)throw Error('模拟配置保存失败');
      const next=await fn(structuredClone(state.values));state.configWrites=(state.configWrites||0)+1;
      if(!state.configNoWrite)state.values=next;
      if(state.configPostFail)state.configReadFail=true;
      if(state.lostConfigResponse)throw Error('模拟配置响应丢失');
    },
    async getWorldbook(name){
      if(state.hold)await state.hold();
      if(state.readHook){const fn=state.readHook;state.readHook=null;fn()}
      if(state.failRead)throw Error('模拟世界书读取失败');
      return structuredClone(state.books[name]);
    },
    async updateWorldbookWith(name,fn){
      if(state.failWrite)throw Error('模拟世界书保存失败');
      if(state.writeHook){const fn=state.writeHook;state.writeHook=null;await fn()}
      const next=await fn(structuredClone(state.books[name]));if(!state.bookNoWrite)state.books[name]=structuredClone(next);writes.push({name,next:structuredClone(next)});
      if(state.postHook)await state.postHook();
      if(state.readAfterWriteFail)state.failRead=true;
      if(state.lostArchiveResponse)throw Error('模拟归档响应丢失');
    },
    async getChatMessages(range,options){
      const rows=range==='0-{{lastMessageId}}'?state.floors:state.floors.filter(row=>row.message_id===Number(range));
      const plainRows=rows.map(row=>({...row,data:row.data||{}}));
      return structuredClone(options?.include_swipes?plainRows.map(row=>({
        message_id:row.message_id,role:row.role,name:row.name,is_hidden:row.is_hidden,swipe_id:state.page,
        swipes:state.page===1?[state.alternate,row.message]:[row.message,state.alternate],
        swipes_data:[row.data,row.data],swipes_info:[state.alternateInfo,{keep:'selected'}],
      })):plainRows);
    },
    async setChatMessages(rows){for(const row of rows){Object.assign(state.floors.find(item=>item.message_id===row.message_id),structuredClone(row));floorsWrites.push(structuredClone(row))}},
    injectPrompts(items,options){assert.deepEqual(plain(options),{once:true});const item={items:plain(items),active:true};injections.push(item);return{uninject(){item.active=false}}},
  };
  modules['cryptLord.hostApi']=host;
  modules['cryptLord.afterNativeHost']={getHost:()=>surface,
    tavernEvents:()=>({GENERATION_AFTER_COMMANDS:'start',GENERATION_STARTED:'generating',CHAT_CHANGED:'chat',GENERATION_STOPPED:'stop',GENERATION_ENDED:'end'}),
    bindEvent(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);return{stop(){handlers.get(name).delete(fn)}}}};
  modules['cryptLord.nativeHistoryPolicy']={createInjection:()=>({content:'无记忆策略'})};
  modules['cryptLord.nativeSettlement']={apply(){}};
  modules['cryptLord.variablePatch']={apply:(_text,data)=>({applied:true,data:structuredClone(data)}),embedUpdate:text=>text,updateTag:()=>''};
  modules['cryptLord.variableSettlementApi']={settle:async()=>({skipped:true})};
  modules['cryptLord.generationQuality']={readSnapshot:async()=>({settings:{retryLimit:0,noStreamTimeoutSeconds:60,streamTimeoutSeconds:60}})};
  const context={structuredClone,DOMException,console:{warn:(...args)=>warnings.push(args.map(String).join(' ')),info(){},error(){},log(){}},
    cryptLord:{__stage1Modules:modules,contract:{initializeGlobal(key,api){modules[key]=api},releaseGlobal(key){delete modules[key]},
      async waitGlobalInitialized(key){assert.ok(modules[key],key);return modules[key]}}}};
  context.window=context;vm.createContext(context);sources.forEach(source=>vm.runInContext(source,context));
  await new Promise(resolve=>setImmediate(resolve));
  return{state,host,modules,writes,floorsWrites,injections,warnings,api:modules['cryptLord.currentClues'],
    bridge:modules['cryptLord.nativeFloorBridge'],builder:modules['cryptLord.contextBuilder'],
    async emit(name,...args){for(const fn of handlers.get(name)||[])await fn(...args)},handlers};
}

test('整个当前线索原版规则与归档：标签净化、主库覆盖、索引及公开保存冲突保护',async()=>{
  const f=await fixture(),api=f.api,untouched=structuredClone(f.state.books['2历史孔隙']);
  for(const value of ['',null,'<当前线索>a</当前线索>','<当前线索 x="1">a\nb</当前线索><当前线索>尾</当前线索>',
    '<当前线索>未闭合','<当前线索></当前线索>'])
    assert.equal(api.extract(value),original._extractLastTagContent('当前线索',value));
  assert.equal(api.extract(raw),'门后传来钟声。\n第二行线索');
  assert.equal(api.extract('<safe><当前线索>伪</当前线索></safe>'),null);
  const expected=original._mergeLorebookContent('当前线索','旧待办',api.extract(raw)).content;
  const source=await api.readFloor(2),loaded=await api.load();
  assert.deepEqual(f.writes,[]);assert.deepEqual(f.floorsWrites,[]);
  const before=structuredClone(f.state.books['1源堡'][0]);
  await api.archive(source,loaded);
  assert.equal(f.state.books['1源堡'][0].content,expected);
  assert.deepEqual({...f.state.books['1源堡'][0],content:before.content},before);
  assert.deepEqual(f.state.books['2历史孔隙'],untouched);assert.equal(f.state.books['1源堡'][1].content,'保留');
  const saved=await api.load();await api.archive(source,saved);assert.equal(f.writes.length,1);
  const config=await api.saveConfig({version:1,automatic:false,index:3},saved.revision);
  assert.equal(config.name,'当前线索(3)');assert.deepEqual(f.state.values.otherPlugin,{保留:true});
  await api.archive(source,config);
  const created=f.state.books['1源堡'].find(row=>row.name==='当前线索(3)');
  assert.equal(created.enabled,false);assert.deepEqual(plain(created.strategy.keys),['当前线索(3)']);
  assert.deepEqual(plain(created.position),{type:'at_depth',role:'system',depth:0,order:5000});
  const configBaseline=await api.load();
  f.state.failConfig=true;
  await assert.rejects(api.saveConfig({...configBaseline.config,index:4},configBaseline.revision),/配置保存失败/);
  assert.equal(f.state.values['cryptLord.currentClues'].index,3);
  f.state.failConfig=false;
  f.state.values['cryptLord.currentClues'].automatic=true;
  await assert.rejects(api.saveConfig(configBaseline.config,configBaseline.revision),/配置已变化/);
  f.state.values['cryptLord.currentClues'].automatic=false;
  const baseline=await api.load();f.state.books['1源堡'].find(row=>row.uid===created.uid).content='外部修改';
  await assert.rejects(api.archive(source,baseline),/已变化/);
  const fresh=await api.load();f.state.writeHook=()=>{f.state.books['1源堡'].find(row=>row.uid===created.uid).extra={外部:true}};
  await assert.rejects(api.archive(source,fresh),/已变化/);
  f.state.writeHook=()=>{f.state.floors[2].message+='外部编辑'};
  await assert.rejects(api.archive(source,await api.load()),/楼层.*已变化/);
  f.state.floors[2].message=raw;
  f.state.failWrite=true;await assert.rejects(api.archive(source,await api.load()),/保存失败/);f.state.failWrite=false;
  const count=f.writes.length;f.state.failRead=true;await assert.rejects(api.load(),/读取失败/);f.state.failRead=false;
  f.state.readAfterWriteFail=true;
  const committed=await api.archive(source,await api.load());assert.match(committed.warning,/已归档.*复核失败/);
  assert.equal(committed.revision,null);assert.equal(f.writes.length,count+1);
  f.state.failRead=false;f.state.readAfterWriteFail=false;
  f.state.books['1源堡'].push({...created,uid:99});
  await assert.rejects(api.load(),/重名/);f.state.books['1源堡'].pop();
  {
    const g=await fixture(), originalBook=structuredClone(g.state.books['1源堡']);
    g.state.bound={primary:'真正角色主库',additional:['1源堡','2历史孔隙']};
    g.state.books['真正角色主库']=[entry('当前线索','真正待办')];
    const baseline=await g.api.load(),origin=await g.api.readFloor(2);
    assert.equal(baseline.book,'真正角色主库');
    await assert.rejects(g.api.archive(structuredClone(origin),baseline),/凭据/);
    await assert.rejects(g.api.archive(origin,structuredClone(baseline)),/凭据/);
    await assert.rejects(g.api.saveConfig(baseline.config,structuredClone(baseline.revision)),/凭据/);
    g.state.lostArchiveResponse=true;
    const recovered=await g.api.archive(origin,baseline);
    assert.match(recovered.warning,/响应丢失后已确认/);
    assert.equal(g.writes.length,1);
    assert.deepEqual(g.state.books['1源堡'],originalBook);
    await g.api.archive(origin,recovered);assert.equal(g.writes.length,1);
    g.state.lostConfigResponse=true;
    const configured=await g.api.saveConfig({...recovered.config,index:2},recovered.revision);
    assert.match(configured.warning,/响应丢失后已确认/);
    assert.equal(configured.name,'当前线索(2)');
    const stale=await g.api.load();g.state.bound.additional.push('绑定变化');
    await assert.rejects(g.api.archive(origin,stale),/绑定|已变化/);
    g.api.dispose();
  }
  for(const alter of [
    g=>{g.state.alternate='未选中的正文页变化'},
    g=>{g.state.alternateInfo.when=new Date('2026-10-28T00:00:00Z')},
    g=>{g.state.scriptId='另一个脚本'},
    g=>{g.state.floors[2].is_hidden=true},
    g=>{g.modules['cryptLord.hostApi']={...g.host}},
  ]){
    const g=await fixture(),baseline=await g.api.load(),origin=await g.api.readFloor(2);
    alter(g);await assert.rejects(g.api.archive(origin,baseline),/变化|隐藏/);assert.equal(g.writes.length,0);g.api.dispose();
  }
  for(const text of [
    '<分析><当前线索>分析示例</当前线索></分析>',
    '<thinking><analysis>嵌套</analysis><当前线索>仍为思考</当前线索>',
    '<JSONPatch>[{"value":"</JSONPatch><当前线索>字面量示例</当前线索>"}]</JSONPatch>',
  ])assert.equal(api.extract(text),null);
  for(const kind of ['archive','config']){
    const g=await fixture(),loaded=await g.api.load(),source=await g.api.readFloor(2);
    const operation=kind==='archive'?g.api.begin(source,loaded):
      g.api.beginConfig({...loaded.config,index:2},loaded.revision);
    const post=kind==='archive'?'readAfterWriteFail':'configPostFail',fail=kind==='archive'?'failRead':'configReadFail';
    const count=()=>kind==='archive'?g.writes.length:g.state.configWrites||0;
    g.state[post]=true;
    assert.match((await operation.save()).warning,/复核失败/);assert.equal(operation.status().phase,'uncertain');
    await assert.rejects(operation.save(),/待核对/);
    await assert.rejects(operation.inspect(),/读取失败/);await assert.rejects(operation.inspect(),/读取失败/);
    assert.equal(count(),1);g.state[post]=g.state[fail]=false;
    const result=await operation.inspect();assert.equal(operation.status().phase,'saved');
    await operation.save();await operation.inspect();assert.equal(count(),1);
    // Recovered baselines are genuine inputs to the next user command.
    await g.api.archive(source,result);g.api.dispose();
  }
  for(const kind of ['archive','config']){
    const g=await fixture(),loaded=await g.api.load(),source=await g.api.readFloor(2);
    const operation=kind==='archive'?g.api.begin(source,loaded):
      g.api.beginConfig({...loaded.config,index:2},loaded.revision);
    const flag=kind==='archive'?'bookNoWrite':'configNoWrite';
    g.state[flag]=true;assert.match((await operation.save()).warning,/尚未落盘/);
    assert.equal(operation.status().phase,'pending');g.state[flag]=false;
    await operation.save();assert.equal(operation.status().phase,'saved');
    assert.equal(kind==='archive'?g.writes.length:g.state.configWrites,2);g.api.dispose();
  }
  {
    const g=await fixture();g.state.books['1源堡'][1].changed=new Date('2026-10-27T00:00:00Z');
    const loaded=await g.api.load(),source=await g.api.readFloor(2),operation=g.api.begin(source,loaded);
    g.state.postHook=()=>{g.state.books['1源堡'][1].changed=new Date('2026-10-28T00:00:00Z')};
    assert.match((await operation.save()).warning,/不一致/);assert.equal(operation.status().phase,'conflict');
    await assert.rejects(operation.save(),/凭据/);assert.equal(g.writes.length,1);g.api.dispose();
  }
  {
    const g=await fixture();
    g.state.values['cryptLord.currentClues']={version:1,automatic:true,index:1,future:{keep:true}};
    let loaded=await g.api.load();
    const unchanged=await g.api.saveConfig({version:1,automatic:true,index:1},loaded.revision);
    assert.equal(g.state.configWrites||0,0);await g.api.archive(await g.api.readFloor(2),unchanged);
    loaded=await g.api.load();
    await g.api.saveConfig({version:1,automatic:false,index:1},loaded.revision);
    assert.deepEqual(g.state.values['cryptLord.currentClues'].future,{keep:true});
    g.state.floors.push({message_id:3,role:'user',message:'等待回复'});
    await assert.rejects(g.api.readFloor(),/没有可读取/);
    assert.equal((await g.api.readFloor(2)).floor.message_id,2);g.api.dispose();
  }
  {
    const g=await fixture(),loaded=await g.api.load(),source=await g.api.readFloor(2);
    let inside=false,changed=false;
    g.state.writeHook=()=>{inside=true};
    const original=g.host.getChatMessages;
    g.host.getChatMessages=async(...args)=>{
      if(inside&&!changed){changed=true;g.state.books['1源堡'][1].content='并发外部编辑'}
      return original(...args);
    };
    await assert.rejects(g.api.archive(source,loaded),/等待期间已变化/);
    assert.equal(g.writes.length,0);assert.equal(g.state.books['1源堡'][1].content,'并发外部编辑');g.api.dispose();
  }
  {
    const g=await fixture(),operation=g.api.begin(await g.api.readFloor(2),await g.api.load());
    let enter,release;const entered=new Promise(resolve=>{enter=resolve});
    g.state.writeHook=()=>new Promise(resolve=>{release=resolve;enter()});
    const saving=operation.save();await entered;
    await assert.rejects(operation.save(),/正在进行/);await assert.rejects(operation.inspect(),/正在进行/);
    release();await saving;assert.equal(g.writes.length,1);g.api.dispose();
  }
  f.state.values['cryptLord.currentClues']={version:2,automatic:true,index:1};
  await assert.rejects(api.load(),/版本/);
  assert.deepEqual(f.floorsWrites,[]);api.dispose();
});

test('两个生成入口与完整原生归档：正文保留、单次注入、关闭自动、取消、失败及卸载',async()=>{
  const f=await fixture(),api=f.api,opening=structuredClone(f.state.floors[0]);
  await f.emit('start','normal',{},false);assert.equal(f.injections.length,1);
  assert.equal(f.injections[0].items[0].should_scan,true);assert.equal(f.injections[0].items[0].depth,4);
  assert.match(f.injections[0].items[0].content,/<当前待办线索>\n旧待办/);
  for(const args of [['quiet',{},false],['quiet_prompt',{},false],['normal',{quiet_prompt:'副请求'},false],
    ['normal',{params:{quiet_prompt:'嵌套副请求'}},false],['normal',{params:{dryRun:true}},false],['normal',{},true]]){
    await f.emit('start',...args);await f.emit('generating',...args);await f.emit('end',...args);await f.emit('stop',...args);
  }
  assert.equal(f.injections.length,1);assert.equal(f.injections[0].active,true);
  await f.emit('end');assert.equal(f.injections[0].active,false);assert.ok(api.nativeTicket());
  f.state.floors.push({message_id:3,role:'user',message:'新行动'},{message_id:4,role:'assistant',message:'已生成正文',data:{}});
  await f.bridge.completeNarrative(raw,{userMessageId:3,assistantMessageId:4,userText:'新行动',narrativeText:'真实正文'});
  assert.match(f.state.floors[4].message,/已生成正文\n\n<当前线索>\n门后/);
  assert.equal(f.state.books['1源堡'][0].content,api.extract(raw));assert.equal(f.writes.length,1);
  assert.equal(api.nativeTicket(),null);
  assert.deepEqual(f.state.floors[0],opening);
  await f.emit('start','continue',{},false);
  await f.bridge.completeNarrative('<当前线索>续写的新线索</当前线索>',
    {userMessageId:3,assistantMessageId:4,userText:'新行动',narrativeText:'续写正文'});
  assert.equal(f.state.books['1源堡'][0].content,'续写的新线索');
  assert.equal(api.extract(f.state.floors[4].message),'续写的新线索');
  await f.emit('start','append',{},false);
  await f.bridge.completeNarrative('<当前线索>真实追加后的线索</当前线索>',
    {userMessageId:3,assistantMessageId:4,userText:'新行动',narrativeText:'追加正文'});
  assert.equal(f.state.books['1源堡'][0].content,'真实追加后的线索');
  await f.emit('start','regenerate',{},false);
  assert.equal(api.nativeTicket().source.message_id,2);
  await f.emit('start','swipe',{},false);
  assert.equal(api.nativeTicket().source.message_id,2);
  const normalizer=f.modules['cryptLord.responseNormalizer'];
  assert.equal(normalizer.normalize('正文<当前线索>内部协议</当前线索>').message,'正文');
  await f.emit('start','normal',{},false);
  const pending=api.nativeTicket();
  f.state.failWrite=true;
  f.state.floors.push({message_id:5,role:'user',message:'失败回合'},{message_id:6,role:'assistant',message:'仍需保留正文',data:{}});
  const next='<gametxt>仍需保留正文</gametxt><当前线索>新的失败线索</当前线索>';
  await f.bridge.completeNarrative(next,{userMessageId:5,assistantMessageId:6,userText:'失败回合',narrativeText:'仍需保留正文',clueTurn:pending});
  assert.match(f.state.floors[6].message,/仍需保留正文/);assert.equal(api.extract(f.state.floors[6].message),'新的失败线索');
  assert.ok(f.warnings.some(text=>text.includes('归档失败')));f.state.failWrite=false;
  await api.archive(await api.readFloor(6),await api.load());assert.equal(f.state.books['1源堡'][0].content,'新的失败线索');
  const before=f.writes.length;
  await f.bridge.completeNarrative('<当前线索>显式未准备请求</当前线索>',
    {userMessageId:5,assistantMessageId:6,userText:'失败回合',narrativeText:'仍需保留正文',clueTurn:null});
  assert.equal(f.writes.length,before);
  const settings=await api.load();await api.saveConfig({...settings.config,automatic:false},settings.revision);
  const built=await f.bridge.buildGenerationConfig('关闭自动行动');
  assert.equal(built.config.injects.filter(row=>row.content.includes('<当前待办线索>')).length,1);
  f.state.floors.push({message_id:7,role:'user',message:'关闭自动行动'},{message_id:8,role:'assistant',message:'关闭时正文',data:{}});
  await f.bridge.completeNarrative('<当前线索>不自动写库</当前线索>',{userMessageId:7,assistantMessageId:8,
    userText:'关闭自动行动',narrativeText:'关闭时正文',clueTurn:built.clueTurn});
  assert.equal(f.writes.length,before);assert.equal(api.extract(f.state.floors[8].message),'不自动写库');
  const current=await api.load();await api.saveConfig({...current.config,automatic:true},current.revision);
  const ticket=await api.prepareTurn();await f.emit('chat');
  await assert.rejects(api.completeTurn(next,{userMessageId:5,assistantMessageId:6,userText:'失败回合'},ticket),/取消/);
  {
    const validTicket=await api.prepareTurn(), beforeFloors=f.floorsWrites.length, beforeBooks=f.writes.length;
    let entered,release;const ready=new Promise(resolve=>entered=resolve);
    f.modules['cryptLord.variableSettlementApi'].settle=()=>new Promise(resolve=>{
      release=()=>resolve({skipped:true});entered();
    });
    const pending=f.bridge.completeNarrative('<当前线索>过期结算</当前线索>',
      {userMessageId:7,assistantMessageId:8,userText:'关闭自动行动',narrativeText:'关闭时正文',clueTurn:validTicket});
    const rejected=assert.rejects(pending,error=>error.code==='CURRENT_CLUES_CANCELLED');
    await ready;await f.emit('chat');release();await rejected;
    assert.equal(f.floorsWrites.length,beforeFloors);assert.equal(f.writes.length,beforeBooks);
    f.modules['cryptLord.variableSettlementApi'].settle=async()=>({skipped:true});
  }
  for(const event of ['stop','chat']){
    let entered,release;const ready=new Promise(resolve=>entered=resolve);
    f.state.hold=()=>new Promise(resolve=>{release=resolve;entered()});
    const total=f.injections.length;
    const operation=f.emit('start','normal',{},false);await ready;await f.emit(event);f.state.hold=null;release();await operation;
    assert.equal(f.injections.length,total);
  }
  const baseline=await api.load(),source=await api.readFloor(8);
  f.state.writeHook=()=>f.emit('chat');
  await assert.rejects(api.archive(source,baseline),/取消/);
  const orphanTicket=await api.prepareTurn();
  f.state.floors.push({message_id:9,role:'user',message:'后续行动'});
  await assert.rejects(api.completeTurn('<当前线索>不自动写库</当前线索>',
    {userMessageId:7,assistantMessageId:8,userText:'关闭自动行动'},orphanTicket),/来源已变化|新楼层/);
  {
    const g=await fixture(),baseline=await g.api.load(),origin=await g.api.readFloor(2);
    await g.emit('generating','quiet',{},false);
    await g.emit('generating','normal',{},true);
    await g.api.archive(origin,baseline);assert.equal(g.writes.length,1);
    const stale=await g.api.load(),floor=await g.api.readFloor(2);
    await g.emit('generating','normal',{},false);await g.emit('end');
    await assert.rejects(g.api.archive(floor,stale),/取消/);
    await assert.rejects(g.api.saveConfig(stale.config,stale.revision),/取消/);
    g.api.dispose();
  }
  {
    const g=await fixture(),turn=await g.api.prepareTurn();
    g.state.floors.push({message_id:3,role:'user',message:'自动回合',data:{}},
      {message_id:4,role:'assistant',message:'<当前线索>本轮公开线索</当前线索>',data:{}});
    g.state.alternate='生成前未选分支被编辑';
    await assert.rejects(g.api.completeTurn(g.state.floors[4].message,
      {userMessageId:3,assistantMessageId:4,userText:'自动回合'},turn),/分支已变化/);
    assert.equal(g.writes.length,0);g.api.dispose();
  }
  api.dispose();assert.equal(f.builder.status().providerIds.length,0);
  f.modules['cryptLord.nativeFloorSource'].dispose();
  assert.equal([...f.handlers.values()].reduce((sum,row)=>sum+row.size,0),0);
  assert.ok(f.floorsWrites.every(row=>[4,6,8].includes(row.message_id)));
  assert.deepEqual(f.state.floors[0],opening);
});
