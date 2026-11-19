import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import lodash from 'lodash';
const read=name=>readFile(new URL(`../../${name}`,import.meta.url),'utf8');
const sources=await Promise.all(['core/native-floor-source.js','core/dynamic-status.js','prompts/context-builder.js','prompts/game-context-providers.js',
  'core/state-store.js','core/generation-bridge.js'].map(name=>read(`public/guimizhizhu_ui/${name}`)));
const fullSources=await Promise.all(['variable-patch','ai-context-config','variable-settlement-api']
  .map(name=>read(`public/guimizhizhu_ui/core/${name}.js`)));
const reference=await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const tree=ts.createSourceFile('original.js',reference,99,true,ts.ScriptKind.JS),members=new Map();
function visit(node){
  if(ts.isVariableDeclaration(node)&&['evaluateCondition','applyDynamicStatus'].includes(node.name.getText(tree)))
    members.set(node.name.getText(tree),node.initializer.getText(tree));
  if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='getDirectiveByNameAndScope')members.set('lookup',node.getText(tree));
  ts.forEachChild(node,visit);
}
visit(tree);
const game=await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35a-js-init-storage-crossfire.txt');
const gameTree=ts.createSourceFile('game.js',`const manager={${game.slice(game.indexOf('_assembleSystemDirectives(data)'))}`,99,true,ts.ScriptKind.JS);
const assembler=gameTree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(gameTree);
const rule=(name,scope='all',priority=0,conditions=[{target:'当前活力',operator:'<=',value:30,calcType:'percentage',reference:'活力'}])=>({
  name,targetScope:scope,priority,conditions,output:{type:'系统状态',description:`${name}描述`,directive:`${name}-${scope}红线`},
});
const rules=[{...rule('昏迷','player',90),group:'活力',isExclusive:true}, {...rule('虚弱','all',30),group:'活力'},
  rule('虚弱','npc',40),rule('坚韧','all',1,[{target:'当前活力',operator:'>',value:30}]),
  {...rule('禁用','all',1000),isEnabled:false}];
const data=()=>({stat_data:{活力:100,当前活力:20,当前状态:{普通状态:'保留','[旧状态]旧名':'应移除'},人物:'玩家'},
  npc_data:{艾琳:{活力:100,当前活力:20,当前状态:{普通状态:'NPC保留'},other:'保留'}},otherPlugin:{原样:true}});
const plain=value=>JSON.parse(JSON.stringify(value));
function originals(values){
  const db={DB:{dynamicRules:structuredClone(values).sort((a,b)=>(b.priority||0)-(a.priority||0)),ruleMap:new Map()}};
  db.DB.dynamicRules.forEach(item=>db.DB.ruleMap.set(`${item.name}_${item.targetScope||'all'}`,item));
  return vm.runInNewContext(`GameDBManager.getDirectiveByNameAndScope=({${members.get('lookup')}}).getDirectiveByNameAndScope.bind(GameDBManager);
    const evaluateCondition=${members.get('evaluateCondition')}; const applyDynamicStatus=${members.get('applyDynamicStatus')};
    const manager={${assembler}};({evaluate:evaluateCondition,apply:applyDynamicStatus,assemble:state=>manager._assembleSystemDirectives(state)})`,
  {GameDBManager:db,_:lodash,console:{warn(){}}});
}
async function fixture(full=false){
  const modules={},handlers=new Map(),warnings=[],writes=[],prompts=[];
  let books={'1源堡':[{name:'【动态规则】状态',content:JSON.stringify(rules)}],'2历史孔隙':[]},fail=false,held=null,hook=null;
  let floors=[{message_id:0,role:'assistant',message:'开场',data:data()},
    {message_id:1,role:'user',message:'行动',data:{}},{message_id:2,role:'assistant',message:'当前正文',data:data()}];
  const surface={document:{},window:{_:lodash,SillyTavern:{getCurrentChatId:()=>flags.chat}}},pages=new Map();
  const host={
    getCharWorldbookNames:()=>structuredClone(flags.binding),
    scriptVariableOptions:()=>({type:'script',script_id:flags.script}),
    getVariables:()=>structuredClone(flags.variables),
    async generateRaw(config){flags.requests.push(structuredClone(config));await flags.modelHook?.();return flags.response},
    async getWorldbook(name){flags.bookReads.push(name);await held?.();await hook?.(name);
      if(fail)throw Error('模拟动态规则读取失败');
      if(flags.missing.has(name))throw Error('worldbook not found');
      return structuredClone(books[name]||[])},
    async getChatMessages(range,options){
      const rows=range==='0-{{lastMessageId}}'?floors:floors.filter(row=>row.message_id===Number(range));
      const value=structuredClone(options?.include_swipes?rows.map(row=>{
        if(pages.has(row.message_id))return pages.get(row.message_id);
        const {message,data={},...metadata}=row;
        return {...metadata,swipe_id:1,swipes:['未选旧页',message],swipes_data:[{保留:'旧页'},data],
          swipes_info:[{otherPlugin:true},{otherPlugin:'当前'}]};
      }):rows.map(row=>({...row,data:row.data||{}})));
      await flags.floorHook?.(range,options);return value;
    },
    async setChatMessages(rows){if(flags.saveFail)throw Error('模拟保存失败');for(const row of rows){const target=floors.find(item=>item.message_id===row.message_id);Object.assign(target,structuredClone(row));writes.push(structuredClone(row))}},
    injectPrompts(items,options){assert.deepEqual(plain(options),{once:true});const entry={items:plain(items),active:true};prompts.push(entry);return{uninject(){entry.active=false}}},
  };
  const flags={saveFail:false,binding:{primary:'1源堡',additional:[]},
    variables:{'cryptLord.variableSettlement':{retryLimit:0}},requests:[],modelHook:null,bookReads:[],missing:new Set(),
    chat:'dynamic-chat',script:'rules-test',floorHook:null,
    response:'<UpdateVariable><JSONPatch>{"stat_data":[{"op":"replace","path":"/当前活力","value":80}],"npc_data":[],"world_data":[]}</JSONPatch></UpdateVariable>'};
  modules['cryptLord.hostApi']=host;
  modules['cryptLord.afterNativeHost']={getHost:()=>surface,
    tavernEvents:()=>({GENERATION_AFTER_COMMANDS:'start',CHAT_CHANGED:'chat',GENERATION_STOPPED:'stop',GENERATION_ENDED:'end'}),
    bindEvent(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);return{stop(){handlers.get(name).delete(fn)}}}};
  modules['cryptLord.nativeHistoryPolicy']={createInjection:()=>({content:'原生历史策略'})};
  modules['cryptLord.responseNormalizer']={extractActions:()=>[]};
  modules['cryptLord.nativeSettlement']={apply(){}};
  modules['cryptLord.variablePatch']={apply:(_text,previous)=>({applied:true,data:structuredClone(previous)}),updateTag:()=>'',embedUpdate:message=>message};
  modules['cryptLord.variableSettlementApi']={settle:async()=>({skipped:true})};
  modules['cryptLord.generationQuality']={readSnapshot:async()=>({settings:{retryLimit:0,streamTimeoutSeconds:1,noStreamTimeoutSeconds:1}})};
  const context={structuredClone,DOMException,console:{warn:(...args)=>warnings.push(args),error:(...args)=>warnings.push(args),info:(...args)=>warnings.push(args),log(){}},
    cryptLord:{__stage1Modules:modules,contract:{initializeGlobal(key,api){modules[key]=api},releaseGlobal(key){delete modules[key]},
      async waitGlobalInitialized(key){assert.ok(modules[key],key);return modules[key]}}}};
  context.window=context;vm.createContext(context);sources.forEach(source=>vm.runInContext(source,context));
  if(full){
    delete modules['cryptLord.variablePatch'];delete modules['cryptLord.variableSettlementApi'];
    fullSources.forEach(source=>vm.runInContext(source,context));
  }
  await new Promise(resolve=>setImmediate(resolve));
  return {api:modules['cryptLord.dynamicStatus'],builder:modules['cryptLord.contextBuilder'],store:modules['cryptLord.stateStore'],
    bridge:modules['cryptLord.nativeFloorBridge'],modules,writes,prompts,warnings,flags,handlers,surface,host,pages,
    get books(){return books},set books(value){books=value},
    get floors(){return floors},set floors(value){floors=value},
    set fail(value){fail=value},set hold(value){held=value},set hook(value){hook=value},
    async emit(name,...args){for(const fn of handlers.get(name)||[])await fn(...args)},
  };
}

test('整套原版条件与状态/红线对照：作用域、互斥、索引优先级、双库及只读预测',async()=>{
  const f=await fixture(),original=originals(rules);
  const stats={当前活力:20,活力:100,基础力量:12,理智:7,姓名:'艾琳',关闭:false,背包:{材料:1},空:[],布尔:true};
  for(const [target,operator,value,calcType,reference] of [
    ['无','not_exists'],['当前活力','exists'],['布尔','is_true'],['关闭','is_false'],['空','empty'],['背包','not_empty'],
    ['当前活力','==','20'],['当前活力','===',20],['当前活力','!=',21],['当前活力','!==','20'],
    ['姓名','includes','艾'],['姓名','not_includes','罗'],['姓名','startsWith','艾'],['姓名','endsWith','琳'],
    ['姓名','match','^艾'],['姓名','match','['],['背包','has_key','材料'],['力量','>=',12],['当前理智','<',8],
    ['当前活力','<=',20,'percentage','活力'],['当前活力','>',5],['当前活力','>=',19],
    ['当前活力','<',50,'percentage','无'],['关闭','<',1],['空','<',1],['当前活力','未知',1],
  ]){
    const condition={target,operator,value,calcType,reference};
    assert.equal(f.api.evaluate(stats,condition),original.evaluate(stats,condition),`${target}:${operator}`);
  }
  const expected=data(),actual=data();original.apply(expected.stat_data,false);original.apply(expected.npc_data.艾琳,true);
  assert.equal(f.api.apply(actual,rules),true);assert.deepEqual(plain(actual),expected);
  assert.equal(f.api.apply(actual,rules),false);
  assert.equal(f.api.assemble(data(),rules),original.assemble(expected));
  assert.match(f.api.assemble(data(),rules),/\[<User>\] 昏迷-player红线/);
  assert.match(f.api.assemble(data(),rules),/\[艾琳\] 虚弱-npc红线/);
  const same=[rule('重名','all',100),{...rule('重名','all',1),output:{description:'低优先描述',directive:'原版低优先索引覆盖'}}];
  assert.match(f.api.assemble(data(),same),/原版低优先索引覆盖/);
  const meta=data();meta.npc_data.$meta={当前状态:{保留:'元数据'}};meta.npc_data.空=null;
  f.api.apply(meta,rules);assert.deepEqual(meta.npc_data.$meta,{当前状态:{保留:'元数据'}});assert.equal(meta.npc_data.空,null);
  const empty=data();assert.equal(f.api.apply(empty,[]),false);assert.equal(empty.stat_data.当前状态['[旧状态]旧名'],'应移除');
  const disabled=data();f.api.apply(disabled,[{...rules[0],isEnabled:false}]);assert.deepEqual(disabled.stat_data.当前状态,{普通状态:'保留'});
  const or={...rule('或'),matchType:'OR',conditions:[{target:'无',operator:'exists'},{target:'当前活力',operator:'==',value:20}]};
  assert.match(f.api.assemble(data(),[or]),/或-all红线/);
  f.books['2历史孔隙']=[{name:'【动态规则】状态',content:'损坏但被主库整条覆盖'},{name:'【动态规则】额外',content:`// 注释\n[${JSON.stringify(rule('补充','all',5))},]`}];
  f.books['1源堡'].push({name:'其他插件规则',content:'不解析'});
  assert.equal((await f.api.load()).rules.length,rules.length+1);
  const untouched=data();const prompt=await f.api.provide({state:untouched});
  assert.deepEqual(untouched,data());assert.equal(prompt.should_scan,true);assert.equal(prompt.depth,4);
  assert.equal((await f.builder.build({state:data()})).length,2);
  const config=await f.bridge.buildGenerationConfig('原生行动');
  assert.equal(config.config.user_input,'原生行动');assert.equal(config.config.injects.filter(row=>row.content.startsWith('[系统指令]')).length,1);
  f.books['1源堡']=[{name:'【动态规则】坏',content:'{"name":"缺少条件"}'}];
  await assert.rejects(f.api.load(),/损坏/);assert.equal((await f.builder.build({state:data()})).length,1);
  assert.deepEqual(f.writes,[]);
  f.flags.binding={primary:'当前角色主库',additional:['附加库','当前角色主库']};
  f.books['附加库']=[{name:'【动态规则】状态',content:'坏附加条目由主库覆盖'}];
  f.books['当前角色主库']=[{name:'【动态规则】状态',content:JSON.stringify(rules)}];
  f.books['1源堡']=[{name:'【动态规则】旧书',content:'必须不读旧固定主书'}];
  let loaded=await f.api.load();
  assert.equal(loaded.sources.find(source=>source.name==='【动态规则】状态').book,'当前角色主库');await f.api.assertLoaded(loaded);
  f.books['当前角色主库'].push({name:'其他插件',content:'与本服务无关'});
  await f.api.assertLoaded(loaded);
  f.books['当前角色主库'][0].enabled=true;
  await assert.rejects(f.api.assertLoaded(loaded),/来源已变化/);
  loaded=await f.api.load();loaded.rules[0].output.description='篡改';
  await assert.rejects(f.api.assertLoaded(loaded),/凭据无效|修改/);
  await assert.rejects(f.api.assertLoaded({rules,epoch:0}),/凭据无效/);
  loaded=await f.api.load();f.flags.binding.additional.push('新附加库');
  await assert.rejects(f.api.assertLoaded(loaded),/来源已变化/);
  f.books['当前角色主库'][0].strategy={keys:[/原触发词/gi]};
  loaded=await f.api.load();f.books['当前角色主库'][0].strategy.keys=[/新的触发词/gi];
  await assert.rejects(f.api.assertLoaded(loaded),/来源已变化/);
  f.flags.bookReads.length=0;await f.api.load();
  assert.equal(f.flags.bookReads.filter(name=>name==='当前角色主库').length,2);
  assert.equal(f.flags.bookReads.at(-1),'当前角色主库');
  f.flags.missing.add('新附加库');await f.api.load();
  f.flags.missing.add('当前角色主库');await assert.rejects(f.api.load(),/not found/);
  f.flags.missing.clear();
  f.fail=true;await assert.rejects(f.api.load(),/读取失败/);f.fail=false;
  const validBook=structuredClone(f.books['当前角色主库']);
  f.books['当前角色主库'].push(structuredClone(validBook[0]));
  await assert.rejects(f.api.load(),/重名/);f.books['当前角色主库']=structuredClone(validBook);
  let reads=0;
  f.hook=name=>{
    if(name==='当前角色主库'&&++reads===2){f.books['当前角色主库'][0].content=JSON.stringify([rule('读取中变更')]);f.hook=null}
  };
  await assert.rejects(f.api.load(),/读取期间已变化/);f.hook=null;f.books['当前角色主库']=structuredClone(validBook);
  loaded=await f.api.load();await assert.rejects(f.api.assertLoaded(structuredClone(loaded)),/凭据无效/);
  assert.equal(f.api.assertIdentity(loaded),true);
  for(const part of ['host','after','document','window','chat','script','library','get']){
    const item=await f.api.load();let restore;
    if(part==='host'||part==='after'){
      const key=`cryptLord.${part==='host'?'hostApi':'afterNativeHost'}`,prior=f.modules[key];
      f.modules[key]={...prior};restore=()=>f.modules[key]=prior;
    }else if(part==='chat'||part==='script'){
      const prior=f.flags[part];f.flags[part]+='-changed';restore=()=>f.flags[part]=prior;
    }else if(part==='library'){
      const prior=f.surface.window._;f.surface.window._={...prior};restore=()=>f.surface.window._=prior;
    }else if(part==='get'){
      const library=f.surface.window._,prior=library.get;library.get=(...args)=>prior(...args);
      restore=()=>library.get=prior;
    }else{
      const prior=f.surface[part];f.surface[part]={...prior};restore=()=>f.surface[part]=prior;
    }
    await assert.rejects(f.api.assertLoaded(item),/已变化/);restore();
  }
  for(const change of [
    ()=>f.flags.script+='-new',
    ()=>f.surface.document={},
    ()=>f.modules['cryptLord.hostApi']={...f.host},
  ]){
    const oldScript=f.flags.script,oldDocument=f.surface.document;
    f.hook=()=>{f.hook=null;change()};
    await assert.rejects(f.api.load(),/已变化/);
    f.flags.script=oldScript;f.surface.document=oldDocument;f.modules['cryptLord.hostApi']=f.host;
  }
  const priorBinding=structuredClone(f.flags.binding);
  f.flags.binding.additional='坏绑定';await assert.rejects(f.api.load(),/绑定格式/);f.flags.binding=priorBinding;
  await assert.rejects(f.api.provide({state:{...data(),npc_data:{}}}),/来源楼层已变化/);
  await assert.rejects(f.api.provide({state:{...data(),stat_data:{活力:5}}}),/来源楼层已变化/);
  const native=await f.modules['cryptLord.nativeFloorSource'].read();
  await assert.rejects(f.api.provide({state:data(),native:structuredClone(native)}),/凭据无效/);
  f.floors[2].is_hidden=true;
  const hiddenNative=await f.modules['cryptLord.nativeFloorSource'].read();
  await assert.rejects(f.api.provide({state:hiddenNative.rows[0].data,native:hiddenNative,target:hiddenNative.rows[0]}),/已隐藏/);
  delete f.floors[2].is_hidden;
  const changing=data();
  f.hook=()=>{changing.stat_data.当前活力=99;f.hook=null};
  assert.match((await f.api.provide({state:changing})).content,/昏迷-player红线/);
  assert.equal(f.writes.length,0);
  f.api.dispose();f.modules['cryptLord.gameContextProviders'].dispose();
  f.modules['cryptLord.nativeFloorSource'].dispose();
});

test('真实楼层保存/实际生成桥与原生指令整链：零查看写入、失败保护、取消及卸载',async()=>{
  const f=await fixture(),opening=structuredClone(f.floors[0]);
  await f.emit('start','normal',{},false);assert.equal(f.prompts.length,1);assert.match(f.prompts[0].items[0].content,/昏迷-player红线/);
  for(const args of [['quiet',{},false],['quiet_prompt',{},false],['normal',{dryRun:true},false],
    ['normal',{quiet_prompt:'副请求'},false],['normal',{},true]])await f.emit('start',...args);
  assert.equal(f.prompts.length,1);assert.equal(f.prompts[0].active,true);assert.equal(f.writes.length,0);
  await f.emit('stop');assert.equal(f.prompts[0].active,false);
  f.modules['cryptLord.nativeFloor']={hasActiveTurn:()=>true};
  await f.emit('start','normal',{},false);assert.equal(f.prompts.length,1);delete f.modules['cryptLord.nativeFloor'];
  const countBefore=f.prompts.length;
  f.floors[2].data.stat_data.当前活力=80;
  for(const [type,expected] of [['regenerate','昏迷-player'],['swipe','昏迷-player'],['continue','坚韧-all'],['append','坚韧-all']]){
    await f.emit('start',type,{},false);assert.match(f.prompts.at(-1).items[0].content,new RegExp(expected));
    assert.equal(f.prompts.filter(row=>row.active).length,1);
  }
  assert.equal(f.prompts.length,countBefore+4);
  await f.emit('end');assert.equal(f.prompts.filter(row=>row.active).length,0);
  f.floors[2].data.stat_data.当前活力=20;
  for(const change of ['hidden','alternate','mismatch','reader','identity']){
    const originalDoc=f.surface.document,originalReader=f.modules['cryptLord.nativeFloorSource'];
    const before=f.prompts.length;
    if(change==='hidden')f.floors[2].is_hidden=true;
    else if(change==='mismatch')f.pages.set(2,{message_id:2,role:'assistant',swipe_id:1,swipes:['旧','错正文'],
      swipes_data:[{},f.floors[2].data],swipes_info:[{},{}]});
    else f.hook=()=>{
      f.hook=null;
      if(change==='alternate')f.pages.set(0,{message_id:0,role:'assistant',swipe_id:1,swipes:['不同的未选分支',f.floors[0].message],
        swipes_data:[{},f.floors[0].data],swipes_info:[{},{}]});
      if(change==='reader')f.modules['cryptLord.nativeFloorSource']={...originalReader};
      if(change==='identity')f.surface.document={};
    };
    await f.emit('start','normal',{},false);assert.equal(f.prompts.length,before,change);
    delete f.floors[2].is_hidden;f.pages.clear();f.surface.document=originalDoc;f.modules['cryptLord.nativeFloorSource']=originalReader;
  }
  f.floors[0].is_hidden=true;
  const beforeHidden=f.prompts.length;await f.emit('start','regenerate',{},false);
  assert.equal(f.prompts.length,beforeHidden);delete f.floors[0].is_hidden;
  const update=data();update.stat_data.当前活力=80;
  await f.store.writeAssistantData(2,update,'affected',()=>{});
  assert.deepEqual(f.floors[2].data.stat_data.当前状态,{普通状态:'保留','[系统状态]坚韧':'坚韧描述'});
  assert.equal(update.stat_data.当前状态['[旧状态]旧名'],'应移除');
  const writes=f.writes.length;f.flags.saveFail=true;
  await assert.rejects(f.store.writeAssistantData(2,data()),/保存失败/);assert.equal(f.writes.length,writes);
  f.flags.saveFail=false;f.fail=true;
  await assert.rejects(f.store.writeAssistantData(2,data()),/读取失败/);assert.equal(f.writes.length,writes);
  f.fail=false;
  for(const writer of ['data','message']){
    let calls=0;
    f.flags.floorHook=(range)=>{
      if(range==='2'&&++calls===(writer==='data'?1:2)){f.flags.floorHook=null;f.surface.document={}}
    };
    const before=f.writes.length;
    await assert.rejects(writer==='data'?f.store.writeAssistantData(2,data()):
      f.store.writeAssistantMessage(2,'不提交旧规则',data()),/已变化/);
    assert.equal(f.writes.length,before);f.flags.floorHook=null;
  }
  for(const writer of ['data','message']){
    const before=f.writes.length;
    f.flags.floorHook=()=>{
      f.flags.floorHook=null;
      f.modules['cryptLord.hostApi']={...f.host};
    };
    await assert.rejects(writer==='data'?f.store.writeAssistantData(2,data()):
      f.store.writeAssistantMessage(2,'不提交换宿主前的变量',data()),/已变化/);
    assert.equal(f.writes.length,before);f.modules['cryptLord.hostApi']=f.host;f.flags.floorHook=null;
  }
  await assert.rejects(f.store.writeAssistantData(2,data(),'affected',undefined,undefined,{
    onWriteAttempt(){f.flags.script+='-new-script'},
  }),/已变化/);
  assert.equal(f.writes.length,writes);
  f.hook=()=>{f.floors[2].message='用户外部编辑';f.hook=null};
  await assert.rejects(f.store.writeAssistantMessage(2,'不应覆盖',data()),/已变化/);
  assert.equal(f.floors[2].message,'用户外部编辑');assert.equal(f.writes.length,writes);
  f.hook=()=>{f.floors[2].data.stat_data.当前活力=5;f.hook=null};
  const count=f.prompts.length;await f.emit('start','normal',{},false);assert.equal(f.prompts.length,count);
  f.floors.push({message_id:3,role:'user',message:'正文行动'},{message_id:4,role:'assistant',message:'本次模型正文',data:{}});
  await f.bridge.completeNarrative('正文',{userMessageId:3,assistantMessageId:4,userText:'正文行动',narrativeText:'本次模型正文'});
  assert.equal(f.floors[4].message,'本次模型正文');assert.equal(f.floors[4].data.stat_data.当前状态['[系统状态]昏迷'],'昏迷描述');
  assert.deepEqual(f.floors[0],opening);
  f.fail=true;
  await f.bridge.completeNarrative('正文',{userMessageId:3,assistantMessageId:4,userText:'正文行动',narrativeText:'本次模型正文'});
  assert.equal(f.floors[4].message,'本次模型正文');assert.ok(f.warnings.some(args=>args.map(String).join(' ').includes('跳过本次派生')));
  await f.emit('start','normal',{},false);assert.equal(f.prompts.length,count);
  f.fail=false;
  {
    let release, enter;
    const ready=new Promise(resolve=>enter=resolve);
    f.hold=()=>new Promise(resolve=>{release=resolve;enter()});
    const before=f.writes.length;
    const pending=f.bridge.completeNarrative('正文',{userMessageId:3,assistantMessageId:4,userText:'正文行动',narrativeText:'本次模型正文'});
    const rejected=assert.rejects(pending,error=>error.code==='DYNAMIC_STATUS_CANCELLED');
    await ready;await f.emit('chat');f.hold=null;release();await rejected;
    assert.equal(f.writes.length,before);
    assert.equal(f.floors[4].message,'本次模型正文');
  }
  for(const event of ['stop','chat']){
    let release,enter;const ready=new Promise(resolve=>enter=resolve);
    f.hold=()=>new Promise(resolve=>{release=resolve;enter()});
    const pending=f.emit('start','normal',{},false);await ready;await f.emit(event);f.hold=null;release();await pending;
    assert.equal(f.prompts.length,count);
  }
  let release,enter;const ready=new Promise(resolve=>enter=resolve);
  f.hold=()=>new Promise(resolve=>{release=resolve;enter()});
  const pending=f.emit('start','normal',{},false);await ready;f.hold=null;
  await f.emit('start','normal',{},false);release();await pending;
  assert.equal(f.prompts.length,count+1);assert.equal(f.prompts.filter(row=>row.active).length,1);
  f.api.dispose();f.modules['cryptLord.gameContextProviders'].dispose();
  f.modules['cryptLord.nativeFloorSource'].dispose();
  assert.equal(f.prompts.filter(row=>row.active).length,0);assert.equal([...f.handlers.values()].reduce((sum,row)=>sum+row.size,0),0);
  assert.equal(f.builder.status().providerIds.length,0);
  assert.ok(f.writes.every(row=>[2,4].includes(row.message_id)));
  assert.deepEqual(f.floors[0],opening);assert.deepEqual(f.floors[2].data.otherPlugin,{原样:true});
  const all=await fixture(true);
  all.flags.binding={primary:'真实主库',additional:['附加库','真实主库']};
  all.books['真实主库']=[{name:'【动态规则】状态',content:JSON.stringify(rules)},
    {name:'【模板】提示词模板',content:JSON.stringify({variable_template:'真实主库自动模板'})}];
  all.books['附加库']=[{name:'【模板】附加提示词模板',content:JSON.stringify({fix_variable_template:'附加修复模板'})}];
  all.books['1源堡']=[{name:'【模板】提示词模板',content:'坏旧固定主书不得加载'}];
  all.floors.push({message_id:3,role:'user',message:'新行动'},{message_id:4,role:'assistant',message:'保留已提交的原生正文',data:{}});
  const tx={userMessageId:3,assistantMessageId:4,userText:'新行动',narrativeText:'保留已提交的原生正文'};
  await all.bridge.completeNarrative('<gametxt>正文：行动</gametxt>',tx);
  assert.equal(all.flags.requests[0].ordered_prompts[0].content,'真实主库自动模板');
  assert.equal(all.floors[4].data.stat_data.当前活力,80);
  assert.equal(all.floors[4].data.stat_data.当前状态['[系统状态]坚韧'],'坚韧描述');
  assert.equal(all.writes.length,1);assert.equal(all.floors[4].message,
    '保留已提交的原生正文\n\n'+all.modules['cryptLord.variablePatch'].updateTag(all.flags.response));
  const prior=structuredClone(all.floors),fullWrites=all.writes.length;
  await assert.rejects(all.bridge.completeNarrative('正文', {...tx,beforeWrite:()=>{
    all.books['真实主库'][1].content=JSON.stringify({variable_template:'保存前外部改动'});
  }}),/模板来源已变化/);
  assert.equal(all.writes.length,fullWrites);assert.deepEqual(all.floors,prior);
  await assert.rejects(all.store.writeAssistantData(4,data(),'affected',()=>{
    all.books['真实主库'][0].content=JSON.stringify([rule('改规则')]);
  }),/规则来源已变化/);
  assert.equal(all.writes.length,fullWrites);
  await all.store.writeAssistantData(4,data());
  assert.equal(all.floors[4].data.stat_data.当前状态['[系统状态]改规则'],'改规则描述');
  all.flags.modelHook=()=>{all.books['真实主库'][1].content=JSON.stringify({variable_template:'模型等待中变更'})};
  const before=all.writes.length;
  await all.bridge.completeNarrative('正文',tx);
  assert.equal(all.writes.length,before+1);
  assert.equal(all.floors[4].data.stat_data.当前活力,20);
  assert.ok(all.warnings.some(args=>args.map(String).join(' ').includes('变量结算副模型失败')));
  for(const key of ['cryptLord.variableSettlementApi','cryptLord.dynamicStatus','cryptLord.gameContextProviders'])
    all.modules[key].dispose();
});
