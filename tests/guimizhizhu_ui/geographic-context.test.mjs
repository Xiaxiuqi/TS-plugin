import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const sources = await Promise.all(['core/native-floor-source.js', 'core/world-map.js', 'prompts/context-builder.js', 'core/geographic-context.js',
  'core/generation-bridge.js'].map(name => read(`public/guimizhizhu_ui/${name}`)));
const mapText = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt');
const gameText = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35a-js-init-storage-crossfire.txt');
const tree = ts.createSourceFile('map.js', mapText.slice(mapText.indexOf('const MapEarthTool =')), 99, true, ts.ScriptKind.JS);
const areaText = tree.statements[0].declarationList.declarations[0].initializer.getText(tree);
const gameTree = ts.createSourceFile('game.js', `const manager={${gameText.slice(gameText.indexOf('_assembleMapContext(stat_data)'))}`, 99, true, ts.ScriptKind.JS);
const assemblerText = gameTree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(gameTree);
const data = {
  mainRegions: [{ name: '鲁恩', points: { outer: [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}], holes: [[{x:1,y:1},{x:2,y:1},{x:1,y:2}]] } }],
  landmarks: [{ name:'廷根',mainRegionName:'鲁恩',marker:{left:'0%',top:'10%'} }],
};
const stat = { 当前区域:'鲁恩',当前地标:'廷根',当前坐标:{x:0,y:0},保留:'原样' };
const plain = value => JSON.parse(JSON.stringify(value));
function original(size = null) {
  return vm.runInNewContext(`const MapEarthTool=${areaText}; const manager={${assemblerText}};
    ({area:MapEarthTool.calculatePolygonArea, assemble:state=>manager._assembleMapContext.call({Y_SCALE:51.35/100},state)})`,
  { document:{getElementById:()=>size}, GameDBManager:{DB:{mapData:structuredClone(data)}} });
}
async function fixture() {
  const modules = {}, handlers = new Map(), warnings = [], prompts = [], writes = [];
  let floors = [
    {message_id:0,role:'assistant',message:'开场',data:{stat_data:{...structuredClone(stat),当前地标:'开场'}}},
    {message_id:1,role:'user',message:'前往廷根',data:{stat_data:{当前地标:'不是用户位置'}}},
    {message_id:2,role:'assistant',message:'正文',data:{stat_data:structuredClone(stat),otherPlugin:{保留:true}}},
  ];
  let fail = false, hold = null, readHook = null, size = null;
  const alternate = structuredClone(floors), pages = new Map(), mapData = structuredClone(data);
  const surface = { document: { querySelector: () => size, getElementById: () => null }, window: {} };
  const host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: 'geography-test' }),
    getCharWorldbookNames:()=>({primary:null,additional:[]}),
    async getWorldbook(name) {
      await hold?.();
      await readHook?.(name);
      if (fail) throw Error('模拟世界书读取失败');
      return name==='1源堡' ? [{name:'【配置】地图数据',content:JSON.stringify(mapData)}] : [];
    },
    getChatMessages:async(range, options)=>structuredClone(options?.include_swipes ? floors.map(row => {
      if (pages.has(row.message_id)) return pages.get(row.message_id);
      const { message, data, ...metadata } = row;
      return { ...metadata, swipe_id: 0, swipes: [message, alternate.find(item => item.message_id === row.message_id)?.message || '旧分支'],
        swipes_data: [data, alternate.find(item => item.message_id === row.message_id)?.data || {}], swipes_info: [{}, { other: true }] };
    }) : floors),
    injectPrompts(items,options) {
      assert.deepEqual(plain(options),{once:true});
      const entry={items:plain(items),active:true};prompts.push(entry);
      return {uninject(){entry.active=false}};
    },
    setChatMessages(){writes.push('楼层')},
    replaceWorldbook(){writes.push('世界书')},
  };
  modules['cryptLord.hostApi']=host;
  modules['cryptLord.afterNativeHost']={
    getHost:()=>surface,
    tavernEvents:()=>({GENERATION_AFTER_COMMANDS:'start',CHAT_CHANGED:'chat',GENERATION_STOPPED:'stop',GENERATION_ENDED:'end'}),
    bindEvent(name,fn) {if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);return{stop(){handlers.get(name).delete(fn)}}},
  };
  modules['cryptLord.nativeHistoryPolicy']={createInjection:()=>({content:'原生历史策略'})};
  modules['cryptLord.stateStore']={readAssistantData:async()=>structuredClone(floors.at(-1).data)};
  modules['cryptLord.generationQuality']={readSnapshot:async()=>({settings:{retryLimit:0,streamTimeoutSeconds:0,noStreamTimeoutSeconds:0}})};
  for(const key of ['responseNormalizer','nativeSettlement','variablePatch','variableSettlementApi'])
    modules[`cryptLord.${key}`]={};
  const context={structuredClone,DOMException,console:{warn:(...args)=>warnings.push(args),error:(...args)=>warnings.push(args),log(){}},
    cryptLord:{__stage1Modules:modules,contract:{
      initializeGlobal(key,value){modules[key]=value},releaseGlobal(key){delete modules[key]},
      async waitGlobalInitialized(key){assert.ok(modules[key],key);return modules[key]},
    }}};
  context.window=context;vm.createContext(context);
  for(const source of sources)vm.runInContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {
    api:modules['cryptLord.geographicContext'],builder:modules['cryptLord.contextBuilder'],bridge:modules['cryptLord.nativeFloorBridge'],
    modules,handlers,host,prompts,writes,warnings,pages,surface,mapData,
    emit:async(name,...args)=>{for(const handler of handlers.get(name)||[])await handler(...args)},
    get floors(){return floors},set floors(value){floors=value},
    set fail(value){fail=value},set hold(value){hold=value},set hook(value){readHook=value},set size(value){size=value},
  };
}

test('整套原版地理提示和面积源码对照，真实地图来源与显式生成配置接入',async()=>{
  const f=await fixture();
  for(const size of [null,{naturalWidth:7400,naturalHeight:3800},{naturalWidth:100,naturalHeight:100}]) {
    const reference=original(size);
    assert.deepEqual(plain(f.api.assemble(stat,data,size)),plain(reference.assemble(stat)));
    for(const points of [data.mainRegions[0].points,data.mainRegions[0].points.outer,[data.mainRegions[0].points],[],
      [...data.mainRegions[0].points.outer].reverse()])assert.equal(f.api.area(points,size),reference.area(points));
  }
  assert.match(f.api.assemble(stat,data).mapOverview,/廷根（坐标：\(0.00, 5.14\)/);
  assert.match(f.api.assemble(stat,data).spatialContextBlock,/坐标: \(0.00, 0.00\)/);
  assert.match(f.api.assemble({},data).spatialContextBlock,/50.00, 50.00/);
  assert.match(f.api.assemble({当前区域:'不存在'},data).spatialContextBlock,/区域面积: 未知/);
  assert.match(f.api.assemble({...stat,当前坐标:{x:'0',y:'1.5'}},data).spatialContextBlock,/0.00, 1.50/);
  assert.throws(()=>f.api.assemble({...stat,当前坐标:{x:'NaN',y:0}},data),/坐标无效/);
  assert.throws(()=>f.api.assemble(stat,{...data,mainRegions:[{name:'坏坐标',points:{outer:[{x:Infinity,y:0}]}}]}),/无效/);
  assert.deepEqual(stat,{当前区域:'鲁恩',当前地标:'廷根',当前坐标:{x:0,y:0},保留:'原样'});
  const config=await f.bridge.buildGenerationConfig('保持原生请求');
  assert.equal(config.config.user_input,'保持原生请求');
  assert.equal(config.config.injects.filter(row=>row.content.includes('<地图地理总览>')).length,1);
  assert.match(config.config.injects.at(-1).content,/40075公里/);
  assert.equal(config.config.max_chat_history,'all');
  assert.equal(f.prompts.length,0);
  f.modules['cryptLord.nativeFloor']={hasActiveTurn:()=>true};
  await f.emit('start','normal',{},false);
  assert.equal(f.prompts.length,0);
  delete f.modules['cryptLord.nativeFloor'];
  f.fail=true;
  assert.equal((await f.builder.build({state:{stat_data:stat}})).length,1);
  f.fail=false;f.size={complete:true,naturalWidth:100,naturalHeight:100};
  const prompt=await f.api.provide({state:{stat_data:stat}});
  assert.match(prompt.content,/16,060,056.25 km²/);
  assert.equal(prompt.should_scan,false);
  assert.equal(prompt.depth,8);
  assert.ok(prompt.content.indexOf('<当前空间情景>')<prompt.content.indexOf('<地图地理总览>'));
  const changing={stat_data:structuredClone(stat)};
  f.hook=()=>{changing.stat_data.当前地标='不应混入请求';f.hook=null};
  assert.match((await f.api.provide({state:changing})).content,/区域: 鲁恩 \/ 廷根/);
  assert.equal((await f.builder.build({state:{stat_data:stat},guard:()=>false})).length,1);
  assert.deepEqual(f.writes,[]);
  const loader=await read('public/guimizhizhu_ui/loader.js');
  assert.ok(loader.indexOf("path: 'core/geographic-context.js'")<loader.indexOf("path: 'core/generation-bridge.js'"));
  assert.doesNotMatch(await read('public/guimizhizhu_ui/prompts/game-context-providers.js'),/function mapProvider|register\('map'/);
  f.api.dispose();
});

test('原生请求整链：正确楼层、一次注入、读取失败、跨请求与聊天取消、卸载；零数据写入',async()=>{
  const f=await fixture(),initial=structuredClone(f.floors);
  assert.equal(f.api.status().nativeReady,true);
  await f.emit('start','normal',{},false);
  assert.equal(f.prompts.length,1);assert.match(f.prompts.at(-1).items[0].content,/区域: 鲁恩 \/ 廷根/);
  await f.emit('start','quiet',{},false);
  await f.emit('start','normal',{quiet_prompt:'副API'},false);
  await f.emit('start','normal',{},true);
  assert.equal(f.prompts.length,1);assert.equal(f.prompts[0].active,true);
  await f.emit('start','normal',{dryRun:true},false);
  assert.equal(f.prompts.length,1);assert.equal(f.prompts[0].active,true);
  await f.emit('end',2);assert.equal(f.prompts[0].active,false);
  await f.emit('start','swipe',{},false);
  assert.match(f.prompts.at(-1).items[0].content,/区域: 鲁恩 \/ 开场/);
  await f.emit('start','regenerate',{},false);
  assert.match(f.prompts.at(-1).items[0].content,/区域: 鲁恩 \/ 开场/);
  await f.emit('start','continue',{},false);
  assert.match(f.prompts.at(-1).items[0].content,/区域: 鲁恩 \/ 廷根/);
  await f.emit('start','append',{},false);
  assert.match(f.prompts.at(-1).items[0].content,/区域: 鲁恩 \/ 廷根/);
  assert.equal(f.prompts.filter(row=>row.active).length,1);
  await f.emit('stop');assert.equal(f.prompts.filter(row=>row.active).length,0);
  f.floors.push({message_id:3,role:'user',message:'新回合',data:{stat_data:{当前地标:'不读取用户'}}});
  await f.emit('start',undefined,{},false);
  assert.match(f.prompts.at(-1).items[0].content,/区域: 鲁恩 \/ 廷根/);
  const count=f.prompts.length;f.fail=true;
  await f.emit('start','normal',{},false);assert.equal(f.prompts.length,count);
  assert.equal(f.prompts.filter(row=>row.active).length,0);
  f.fail=false;
  f.hook=()=>{f.floors[2].data.stat_data.当前地标='外部修改';f.hook=null};
  await f.emit('start','normal',{},false);assert.equal(f.prompts.length,count);
  assert.ok(f.warnings.some(args=>/原生楼层.*已变化/.test(String(args.at(-1)))));
  let release,entered;
  const ready=new Promise(resolve=>entered=resolve);
  f.hold=()=>new Promise(resolve=>{release=resolve;entered()});
  const pending=f.emit('start','normal',{},false);await ready;
  await f.emit('chat');f.hold=null;release();await pending;
  assert.equal(f.prompts.length,count);
  let releaseOld,arrived;
  const oldReady=new Promise(resolve=>arrived=resolve);
  f.hold=()=>new Promise(resolve=>{releaseOld=resolve;arrived()});
  const old=f.emit('start','normal',{},false);await oldReady;f.hold=null;
  await f.emit('start','normal',{},false);releaseOld();await old;
  assert.equal(f.prompts.length,count+1);assert.equal(f.prompts.filter(row=>row.active).length,1);
  let releaseDisposed,disposing;
  const disposeReady=new Promise(resolve=>disposing=resolve);
  f.hold=()=>new Promise(resolve=>{releaseDisposed=resolve;disposing()});
  const last=f.emit('start','normal',{},false);await disposeReady;f.api.dispose();f.hold=null;releaseDisposed();await last;
  assert.equal(f.prompts.length,count+1);assert.equal(f.prompts.filter(row=>row.active).length,0);
  assert.equal([...f.handlers.entries()].filter(([name])=>name!=='chat').reduce((sum,[,rows])=>sum+rows.size,0),0);
  assert.equal(f.builder.status().providerIds.length,0);
  assert.deepEqual(f.floors[0],initial[0]);assert.deepEqual(f.floors[2].data.otherPlugin,{保留:true});
  assert.deepEqual(f.writes,[]);
  for (const mutate of [
    async g=>{g.floors[2].is_hidden=true},
    async g=>{const page=(await g.host.getChatMessages('',{include_swipes:true}))[0];page.swipes_data[1].changed=true;g.pages.set(0,page)},
    async g=>{const page=(await g.host.getChatMessages('',{include_swipes:true}))[2];page.swipes_info[1].changed=true;g.pages.set(2,page)},
    async g=>{g.surface.document={}},
    async g=>{g.modules['cryptLord.hostApi']={...g.host}},
    async g=>{g.modules['cryptLord.worldMapState']={...g.modules['cryptLord.worldMapState']}},
  ]) {
    const g=await fixture();
    g.hook=async()=>{g.hook=null;await mutate(g)};
    await g.emit('start','normal',{},false);
    assert.equal(g.prompts.length,0);assert.deepEqual(g.writes,[]);g.api.dispose();
  }
  const hidden=await fixture();hidden.floors[2].is_hidden=true;
  await hidden.emit('start','normal',{},false);await hidden.emit('start','regenerate',{},false);
  assert.equal(hidden.prompts.length,0);hidden.api.dispose();
  const rules=await fixture();let primaryReads=0;
  rules.hook=name=>{if(name==='1源堡'&&++primaryReads===2)rules.mapData.landmarks[0].marker.left='1%'};
  await rules.emit('start','normal',{},false);
  assert.equal(rules.prompts.length,0);
  assert.ok(rules.warnings.some(args=>/地图配置.*变化/.test(String(args.at(-1)))));rules.api.dispose();
  const stale=await fixture();
  await assert.rejects(stale.api.provide({state:{stat_data:{...stat,当前地标:'过期位置'}}}),/来源楼层已变化/);
  assert.equal(stale.prompts.length,0);stale.api.dispose();
});
