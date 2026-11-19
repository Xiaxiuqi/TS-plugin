import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
const source = await read('public/guimizhizhu_ui/core/world-map.js');
const sourceReader = await read('public/guimizhizhu_ui/core/native-floor-source.js');
const storeSource = await read('public/guimizhizhu_ui/core/state-store.js');
const settlementSource = await read('public/guimizhizhu_ui/core/native-settlement.js');
const reference = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt');
const db = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt');
const plain = value => JSON.parse(JSON.stringify(value));
const data = {
  mainRegions: [{name:'鲁恩',points:{outer:[{x:10,y:10},{x:30,y:10},{x:30,y:30},{x:10,y:30}]}}],
  landmarks: [{name:'廷根',marker:{left:'20%',top:'38.95%'},mainRegionName:'鲁恩',description:'文本,}保持原样'}],
};
function originals() {
  const tree = ts.createSourceFile('original.js', reference.slice(reference.indexOf('const GameMapManager =')), 99, true, ts.ScriptKind.JS);
  const declarations = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ['GameMapManager','GeometryHelper'].includes(node.name.getText(tree)))
      declarations.set(node.name.getText(tree),node.initializer);
    ts.forEachChild(node,visit);
  }
  visit(tree);
  const manager = declarations.get('GameMapManager');
  const member = name => manager.properties.find(node => node.name?.getText(tree) === name);
  const location = member('LocationEngine').initializer.getText(tree);
  const geometry = declarations.get('GeometryHelper').getText(tree);
  const dbTree = ts.createSourceFile('db.js', db, 99, true, ts.ScriptKind.JS);
  let defaults;
  function find(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(dbTree) === '_fallback')
      defaults = node.initializer.properties.find(item => item.name?.getText(dbTree) === 'mapData')?.initializer.getText(dbTree);
    ts.forEachChild(node, find);
  }
  find(dbTree);
  return {
    defaults: vm.runInNewContext(`(${defaults})`),
    centers: vm.runInNewContext(`({${['getCenterX','getCenterY'].map(name => member(name).getText(tree)).join(',')}})`),
    correct(stat) {
      const original = vm.runInNewContext(`const GeometryHelper=${geometry}; (${location})`, {
        console: { log() {} }, GameDBManager:{DB:{mapData:structuredClone(data)}},
      });
      return original.validateAndCorrectLocation(stat);
    },
  };
}
function fixture() {
  let bound = {primary:'角色书',additional:['额外书']};
  const books = new Map([['2历史孔隙',[]],['额外书',[]],['角色书',[]],['1源堡',[]]]);
  const flags = {fail:false,readHook:null,writes:[],page:0,pageHook:null,rowHook:null};
  const rows=[{message_id:0,role:'assistant',message:'开场',data:{stat_data:{当前地标:'开场'}}},
    {message_id:2,role:'assistant',message:'最新正文',data:{stat_data:{当前地标:'最新'}}},
    {message_id:3,role:'user',message:'待回复',data:{stat_data:{当前地标:'不是这里'}}}];
  const modules = {};
  const host = {
    async getChatMessages(range,options) {
      await flags.rowHook?.();
      const selected=range==='0-{{lastMessageId}}' ? rows : rows.filter(row=>row.message_id===Number(range));
      const pages=selected.map(row=>({message_id:row.message_id,name:row.name,role:row.role,is_hidden:row.is_hidden,
        swipe_id:flags.page,swipes:[row.message,row.message],swipes_data:[row.data,row.data],swipes_info:[{},{}]}));
      if(options?.include_swipes)await flags.pageHook?.(pages);
      return structuredClone(options?.include_swipes ? pages : selected);
    },
    async setChatMessages(values) {
      flags.writes.push(...values.map(value=>value.message_id));
      values.forEach(value=>Object.assign(rows.find(row=>row.message_id===value.message_id),structuredClone(value)));
    },
    async getCharWorldbookNames() { return structuredClone(bound); },
    async getWorldbook(name) {
      if (flags.fail) throw Error('模拟读取失败');
      await flags.readHook?.(name);
      if (!books.has(name)) throw Error('世界书不存在');
      return structuredClone(books.get(name));
    },
  };
  modules['cryptLord.hostApi']=host;
  const context = { console:{ log() {}, info() {}, warn() {}, error() {} },structuredClone,DOMException,cryptLord:{
    __stage1Modules:modules,contract:{
      initializeGlobal(key,api) {modules[key]=api;},
      releaseGlobal(key) {delete modules[key];},
      async waitGlobalInitialized(key) { assert.ok(modules[key],key); return modules[key]; },
    },
  }};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(sourceReader,context);
  vm.runInContext(source,context);
  return { api:modules['cryptLord.worldMapState'],context,modules,books,flags,rows,setBound:value=>{bound=value;} };
}
test('双地图原版规则、坐标比例与配置读取保护', async () => {
  const original = originals(), f = fixture();
  assert.deepEqual(plain(f.api.defaults()),plain(original.defaults));
  assert.deepEqual(plain((await f.api.load()).data),plain(original.defaults));
  for (const stat of [
    {当前区域:'鲁恩',当前地标:'廷根',当前坐标:{x:20,y:20}},
    {当前区域:'鲁恩',当前地标:'廷根',当前坐标:{x:90,y:20}},
    {当前区域:'未知',当前地标:'廷根',当前坐标:{x:20,y:20}},
    {当前区域:'异世界',当前地标:'未知',当前坐标:{x:120,y:-1}},
    {当前区域:'鲁恩'},
    {当前区域:'未知',当前地标:'未知',当前坐标:{x:20,y:20}},
  ]) {
    const expected=structuredClone(stat),actual=structuredClone(stat);
    assert.equal(f.api.correct(actual,data),original.correct(expected));
    assert.deepEqual(plain(actual),plain(expected));
  }
  const points=data.mainRegions[0].points.outer;
  assert.equal(f.api.centerX(points),original.centers.getCenterX(points));
  assert.equal(f.api.centerY(points),original.centers.getCenterY(points));
  assert.ok(Math.abs(f.api.marker({当前坐标:{x:20,y:25.675},当前地标:'廷根'}).y-50)<1e-10);
  for (const invalid of [null,{x:null,y:2},{x:'',y:2},{x:2,y:'坏值'}])
    assert.equal(f.api.marker({当前坐标:invalid}).valid,false);
  const invalidStat={当前坐标:{x:NaN,y:Infinity}};
  f.api.correct(invalidStat,data);
  assert.deepEqual(plain(invalidStat.当前坐标),{x:50,y:50});
  assert.equal((await f.api.readPosition()).stat_data.当前地标,'最新');
  await assert.rejects(f.api.readPosition(()=>false),/已取消/);
  assert.deepEqual(plain(f.api.lod(.4)),{regions:false,dots:true,landmarks:false,playerLabel:false,inverseScale:2.5});
  assert.equal(f.api.lod(1.2).landmarks,true);
  assert.equal(f.api.lod(.5).regions,true);
  assert.equal(f.api.zoom(.4,-.2),.4);
  assert.equal(f.api.zoom(5,.2),5);
  assert.equal(f.api.zoom(1,.2),1.2);
  const entry=(value)=>({name:'【配置】地图数据',content:JSON.stringify(value)});
  f.books.get('2历史孔隙').push(entry({...data,landmarks:[]}));
  f.books.get('角色书').push(entry(data));
  f.books.get('1源堡').push(entry({...data,landmarks:[{...data.landmarks[0],name:'源堡优先'}]}));
  let loaded=await f.api.load();
  assert.equal(loaded.data.landmarks[0].name,'廷根');
  f.setBound({primary:'角色书',additional:['1源堡','额外书']});
  assert.equal((await f.api.load()).data.landmarks[0].name,'廷根');
  f.books.get('1源堡').length=0;
  loaded=await f.api.load();
  assert.equal(loaded.data.landmarks[0].description,'文本,}保持原样');
  assert.match(loaded.source,/角色书/);
  f.books.get('角色书')[0].content='```json\n{ "landmarks": [], // 原版配置支持注释\n}\n```';
  const partial=await f.api.load();
  assert.deepEqual(plain(partial.data.mainRegions),plain(original.defaults.mainRegions));
  assert.deepEqual(plain(partial.data.landmarks),[]);
  f.books.get('角色书').unshift({name:'【配置】地图数据基础',content:JSON.stringify({mainRegions:data.mainRegions})});
  assert.deepEqual(plain((await f.api.load()).data.mainRegions),data.mainRegions);
  f.books.get('角色书').shift();
  f.books.get('角色书')[0].content='{broken';
  await assert.rejects(f.api.load(),/JSON 损坏/);
  f.books.get('角色书')[0]=entry({mainRegions:[{name:'坏区域',points:{outer:[]}}],landmarks:[]});
  await assert.rejects(f.api.load(),/多边形坐标无效/);
  f.books.get('角色书')[0]=entry(data);
  await assert.rejects(f.api.load(()=>false),/已取消/);
  f.flags.readHook=()=>f.setBound({primary:'新角色书',additional:[]});
  await assert.rejects(f.api.load(),/绑定已改变/);
  f.flags.readHook=null;
  f.flags.fail=true;
  await assert.rejects(f.api.load(),/模拟读取失败/);
  f.api.dispose();
  await assert.rejects(f.api.load(),/已取消/);
});
test('完整地图读取与实际原生保存：配置/分支复核、隐藏保护、只读及整批失败重试', async () => {
  const f=fixture();
  f.books.get('角色书').push({name:'【配置】地图数据',content:JSON.stringify(data)});
  const initial={stat_data:{当前区域:'鲁恩',当前地标:'廷根',当前坐标:{x:20,y:20},其他插件:{保留:true}}};
  f.rows[2]={message_id:3,role:'user',message:'行动',data:{other:'user'}};
  f.rows[1].data=structuredClone(initial);
  const before=structuredClone(f.rows);
  const view=await f.api.loadView();
  assert.equal(view.position.stat_data.当前地标,'廷根');
  assert.deepEqual(f.rows,before);assert.deepEqual(f.flags.writes,[]);
  f.rows[1].is_hidden=true;
  await assert.rejects(f.api.loadView(),/已隐藏/);delete f.rows[1].is_hidden;
  f.flags.pageHook=pages=>{pages[1].swipes_data[0]={stat_data:{当前地标:'别的分支'}};};
  await assert.rejects(f.api.loadView(),/所选分支已变化/);f.flags.pageHook=null;
  let count=0;
  f.flags.readHook=()=>{if(++count===4)f.rows[1].data.stat_data.当前地标='外部变化';};
  await assert.rejects(f.api.loadView(),/已变化/);f.flags.readHook=null;
  f.rows[1].data=structuredClone(initial);
  count=0;
  f.flags.readHook=()=>{if(++count===4)f.flags.page=1;};
  await assert.rejects(f.api.loadView(),/已变化/);f.flags.readHook=null;f.flags.page=0;
  count=0;
  f.flags.readHook=()=>{if(++count===5)f.books.get('角色书')[0].content=JSON.stringify({...data,landmarks:[]});};
  await assert.rejects(f.api.loadView(),/配置.*变化/);f.flags.readHook=null;
  f.books.get('角色书')[0].content=JSON.stringify(data);
  const reader=f.modules['cryptLord.nativeFloorSource'],issued=await reader.read();
  await assert.rejects(reader.assert(structuredClone(issued)),/凭据无效/);
  const service=f.modules['cryptLord.hostApi'];
  f.modules['cryptLord.hostApi']={...service};
  await assert.rejects(reader.assert(issued),/宿主/);f.modules['cryptLord.hostApi']=service;
  assert.equal((await f.api.loadView()).position.stat_data.当前地标,'廷根');
  let document={},scriptId='isolated-map';
  f.modules['cryptLord.afterNativeHost']={getHost:()=>({document,window:f.context})};
  service.scriptVariableOptions=()=>({type:'script',script_id:scriptId});
  for(const change of [
    ()=>{document={};},()=>{scriptId+='-changed';},
    ()=>{f.modules['cryptLord.afterNativeHost']={...f.modules['cryptLord.afterNativeHost']};},
  ]) {
    const owned=await reader.read();change();
    await assert.rejects(reader.assert(owned),/宿主、聊天或脚本已变化/);
  }
  delete service.scriptVariableOptions;delete f.modules['cryptLord.afterNativeHost'];
  vm.runInContext(settlementSource,f.context);
  vm.runInContext(storeSource,f.context);
  const store=f.modules['cryptLord.stateStore'],next=structuredClone(initial);
  next.stat_data.当前坐标={x:90,y:20};
  await store.writeAssistantData(2,next);
  assert.deepEqual(f.rows[1].data.stat_data.当前坐标,{x:30,y:20});
  assert.deepEqual(f.rows[1].data.stat_data.其他插件,{保留:true});
  assert.deepEqual(f.rows[0],before[0]);assert.deepEqual(f.rows[2],before[2]);
  assert.equal(f.rows[1].message,before[1].message);
  assert.deepEqual(f.flags.writes,[2]);
  assert.equal(f.modules['cryptLord.nativeSettlement'].status().handlers.includes('map-location-correction'),true);
  f.flags.fail=true;
  await assert.rejects(store.writeAssistantData(2,next),/模拟读取失败/);
  assert.deepEqual(f.flags.writes,[2]);
  f.flags.fail=false;
  await store.writeAssistantData(2,next);assert.deepEqual(f.flags.writes,[2,2]);
  assert.deepEqual(f.rows[0],before[0]);assert.deepEqual(f.rows[2],before[2]);
});
