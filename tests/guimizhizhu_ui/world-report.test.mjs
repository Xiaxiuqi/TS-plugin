import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptKind, isMethodDeclaration, isFunctionDeclaration, forEachChild } from 'typescript';
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const sources = await Promise.all(['core/native-floor-source.js', 'core/variable-patch.js', 'core/journey-reader.js', 'core/battle-experience.js', 'core/world-report.js']
  .map(file => read(`public/guimizhizhu_ui/${file}`)));
const [original, loader, shell, hostSource] = await Promise.all([
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt',
  'public/guimizhizhu_ui/loader.js', 'public/guimizhizhu_ui/modules/game-shell/index.js', 'public/guimizhizhu_ui/shared/after-native-host.js',
].map(read));
const plain = value => JSON.parse(JSON.stringify(value));
const names = '<本周目经历>序号|1\n在场人物|玩家、甲（在场）,甲，乙</本周目经历>';
const raw = patch => `<gametxt>正文</gametxt>${names}<UpdateVariable><JSONPatch>${JSON.stringify(patch)}</JSONPatch></UpdateVariable>`;
function fixture() {
  const state = { rows: [
    { message_id: 0, role: 'assistant', message: '<gametxt>开场</gametxt>', data: { npc_data: { 幕后: { 长期目标: '调查' } } } },
    { message_id: 1, role: 'user', message: '调查', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: raw({ npc_data: [{ op: 'replace', path: '/幕后/所处地点', value: '码头' }] }),
      data: { stat_data: { 名称: '玩家' }, npc_data: { 甲: { 身份: '值夜者', 当前序列: '序列7', $战斗经验等级: 2, $战斗经验: 35,
        行为链片段: '调查→返回', 当前状态: { 情绪: '警惕', $meta: {} }, 正在做的事: '检查档案', 所处地点: '教堂',
        外貌: '外套', 长期目标: '调查', 近期打算: ['调查|进行中|今晚'], 事件历史: { 一: '离开' }, 关键记忆: ['记录'] },
        乙: { 名称: '乙' }, 幕后: { 长期目标: '调查', 所处地点: '码头' }, 未修改: { 长期目标: '休息' } },
        world_data: { 日报与传闻: { '[1349年6月21日]-1': '新闻', '(1349年6月21日)-2': ['新闻甲', '新闻乙'], $meta: {} } },
        otherPlugin: { keep: true } } },
  ], page: 0, hook: null, reads: 0, pageHook: null };
  const modules = {}, handlers = new Map(), events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start' };
  modules['cryptLord.hostApi'] = {
    async getChatMessages(range, options) {
      assert.equal(range, '0-{{lastMessageId}}'); state.reads++; await state.hook?.(state.reads);
      const pages=state.rows.map(row => ({
        message_id: row.message_id, name:row.name,is_hidden:row.is_hidden,swipe_id: state.page, role: row.role,
        swipes: [row.message, row.message], swipes_data: [row.data, row.data],swipes_info:[{},{}],
      }));
      if(options?.include_swipes) await state.pageHook?.(pages);
      return structuredClone(options?.include_swipes ? pages : state.rows);
    },
    getVariables() { assert.fail('禁止配置访问'); }, setChatMessages() { assert.fail('禁止保存楼层'); },
    getWorldbook() { assert.fail('禁止读取世界书'); }, generateRaw() { assert.fail('禁止生成'); },
  };
  const document={};
  modules['cryptLord.afterNativeHost'] = { tavernEvents: () => events,getHost:()=>({document,window:runtime}),
    bindEvent(name, callback) { const set = handlers.get(name) || new Set(); set.add(callback); handlers.set(name, set);
      return { stop: () => set.delete(callback) }; } };
  const runtime = { console, structuredClone, DOMException, cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
  } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { state, modules, api: modules['cryptLord.worldReport'],
    emit: (name,...args) => { for (const fn of [...(handlers.get(events[name]) || [])]) fn(...args); } };
}
function oracle() {
  const start = original.indexOf('_buildWorldLogPanelHtml(worldLog)'), end = original.indexOf('// 重新绑定判定块的交互事件');
  const tree = createSourceFile('oracle.js', `const Original = {${original.slice(start, end)}}`, 99, true, ScriptKind.JS);
  const methods = new Map();
  const visit = node => { if (isMethodDeclaration(node)) methods.set(node.name.text, node.getText(tree)); else forEachChild(node, visit); };
  visit(tree);
  assert.ok(methods.has('_generateDynamicNpcCard')); assert.ok(methods.has('_generateDynamicNewspaper'));
  return vm.runInNewContext(`({${[...methods.values()].join(',')},
    SafeGetValue(object, key, fallback) { return object[key] ?? fallback; },
    safeEscapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  })`, { console, parseSequenceRank: () => 7, battleExpNeedForLevel: () => 175, battleExpLevelCap: () => 5 });
}
test('原版报告整项规则独立对照：在场/幕后、人物字段、经验、日报、日志及旧版兼容', () => {
  const { api, state } = fixture(), originalApi = oracle(), floor = state.rows[2];
  let report = api.project(floor, state.rows[0]);
  assert.deepEqual(plain(report.active.map(item => item.name)), ['甲', '乙']);
  assert.deepEqual(plain(report.offscreen.map(item => item.name)), ['幕后']);
  assert.equal(report.active[0].experience.need, 175);
  assert.equal(report.active[0].experience.percentage, 20);
  const cardHtml = originalApi._generateDynamicNpcCard('甲', floor.data.npc_data.甲);
  for (const value of ['值夜者', '检查档案', '教堂', '外套', '调查', '进行中', '今晚', '[一] 离开', '记录', 'Lv.2', '35/175'])
    assert.ok(cardHtml.includes(value), value);
  assert.deepEqual(plain(report.active[0].plans), [{ content: '调查', status: '进行中', time: '今晚' }]);
  assert.deepEqual(plain(report.active[0].history), ['[一] 离开']);
  const newsHtml = originalApi._generateDynamicNewspaper(floor.data.world_data.日报与传闻);
  const expectedNews = [...newsHtml.matchAll(/<div class="news-date">([^<]*)<\/div>\s*<div class="news-content">([^<]*)<\/div>/g)]
    .map(match => ({ date: match[1], content: match[2] }));
  assert.deepEqual(plain(report.news), expectedNews);
  const log = '🕒 1349年6月21日\n<!-- 指令 -->世界运行\n\n\n第二行';
  assert.deepEqual(plain(api.worldLog(`<wlog>${log}</wlog>`)), { time: '1349年6月21日', body: '世界运行\n\n第二行' });
  assert.ok(originalApi._buildWorldLogPanelHtml(log).includes('1349年6月21日'));
  assert.ok(!originalApi._buildWorldLogPanelHtml(log).includes('指令'));
  const snapshot = { data: floor.data, meta: { people: '玩家、甲（在场）、乙', world_info: { offscreen_npcs: ['幕后'] } } };
  assert.ok(originalApi._buildAutomationPanelHtml(snapshot).includes('幕后'));
  const legacy = '<details open><summary>自动化系统</summary><Auto>删除人物，不展示</Auto>\n💠甲（值夜者）\n行为链片段：检查→离开\n当前状态：警惕/疲惫|核对签名|教堂|返回\n长期目标：调查\n近期打算：调查|进行中|今晚\n关键记忆更新：记录\n💠日报与传闻\n[1349年] 新闻内容</details>';
  report = api.project({ ...floor, message: legacy, data: {} });
  assert.equal(report.source, 'legacy-text'); assert.equal(report.legacy[0].name, '甲');
  assert.equal(report.legacy[0].identity, '值夜者'); assert.equal(report.legacy[0].action, '返回');
  assert.deepEqual(plain(report.legacy[0].statuses), ['警惕', '疲惫']);
  assert.deepEqual(plain(report.news), [{ date: '1349年', content: '新闻内容' }]);
  const oldHtml = originalApi.renderAutoSystemPanel(legacy.replace(/^<details[^>]*>|<\/details>$/g, ''));
  for (const value of ['值夜者', '核对', '教堂', '返回', '进行中', '今晚', '记录', '1349年', '新闻内容'])
    assert.ok(oldHtml.includes(value), value);
  const nested = legacy.replace('关键记忆更新：记录', '关键记忆更新：记录\n<details><summary>附录</summary>附录内容</details>');
  assert.equal(api.project({ ...floor, message: nested, data: {} }).news[0].content, '新闻内容');
  const mixed = structuredClone(floor); mixed.message += legacy;
  assert.equal(api.project(mixed).legacy.length, 0);
  const hidden = `<safe>${names}<wlog>隐藏日志</wlog>${legacy}</safe><thinking>${legacy}</thinking><gametxt>正文</gametxt>`;
  assert.equal(api.project({ ...floor, message: hidden, data: {} }).hasContent, false);
  assert.equal(api.project({ ...floor, message: '<think><wlog>未闭合推理</wlog>', data: {} }).hasContent, false);
  for(const tag of ['analysis','思考','推理','分析']) {
    const sample=`<${tag}><${tag}>内层</${tag}>${names}${legacy}<wlog>假日志</wlog></${tag}>`;
    assert.equal(api.project({...floor,message:sample,data:{}}).hasContent,false);
    assert.equal(api.project({...floor,message:sample+'<wlog>真实日志</wlog>',data:{}}).worldLog.body,'真实日志');
  }
  const quoted=`<UpdateVariable><JSONPatch>${JSON.stringify({npc_data:[{
    op:'replace',path:'/幕后/事件历史',value:'<analysis>引号中的字面量</UpdateVariable><wlog>补丁值假日志</wlog>'+names,
  }]})}</JSONPatch></UpdateVariable><wlog>真实运行</wlog>`;
  assert.equal(api.project({...floor,message:quoted,data:{}}).worldLog.body,'真实运行');
  assert.equal(api.project({...floor,message:quoted,data:{}}).active.length,0);
  const complex = structuredClone(floor), name = '甲.乙/丙~丁';
  complex.data.npc_data[name] = { 关键记忆: [42, { 文本: '记录' }], 近期打算: { '$meta': {}, 一: '行动|状态|时间' } };
  complex.message = raw({ stat_data: [{ op: 'replace', path: '/npc_data/甲.乙~1丙~0丁/关键记忆', value: [] }] });
  report = api.project(complex); assert.equal(report.offscreen[0].name, name);
  assert.deepEqual(plain(report.offscreen[0].memories), ['42', '{\n  "文本": "记录"\n}']);
  complex.message = names;
  report = api.project(complex, state.rows[0]); assert.ok(report.offscreen.some(item => item.name === name));
  assert.equal(api.project({ ...floor, message: '', data: floor.data }).offscreen.length, 0);
  assert.equal(api.project({ ...floor, message: names, data: { stat_data: { 名称: '玩家' }, npc_data: [] } }).warning.length, 3);
  assert.equal(api.newspaper({ 一: { '$meta': {}, 正文: '<img onerror=alert(1)>' } })[0].content, '<img onerror=alert(1)>');
  assert.throws(() => api.project({ role: 'user' }), /assistant/);
  const many = Object.fromEntries(Array.from({ length: 121 }, (_, index) => [`日期${index}`, `新闻${index}`]));
  assert.equal(api.newspaper(many).length, 121);
});
test('公开原生读取与完整生命周期：零写入、历史归属、切页/正文冲突、重试与取消', async () => {
  assert.match(loader, /core\/world-report\.js/); assert.match(loader, /modules\/world-report\/index\.js/);
  assert.match(loader, /modules\/world-report\/style\.css/); assert.match(shell, /id: 'world-report', label: '世界线同步报告'/);
  assert.match(hostSource, /'status-card', 'world-report', 'action-options'/);
  const tree = createSourceFile('shell.js', shell, 99, true, ScriptKind.JS); let routeSource;
  const visit = node => {
    if (isFunctionDeclaration(node) && node.name?.text === 'showFeature') routeSource = node.getText(tree);
    else forEachChild(node, visit);
  };
  visit(tree); assert.ok(routeSource);
  const routed = [], routeState = { chatToken: 1, current: { message_id: 2 }, disposed: false }; let resolve;
  const route = vm.runInNewContext(`(${routeSource})`, { state: routeState,
    contract: { waitGlobalInitialized(key) {
      assert.equal(key, 'cryptLord.worldReportUi'); return new Promise(done => { resolve = done; });
    } }, notify() { assert.fail('正常入口不应报错'); } });
  route({ id: 'world-report' }); resolve({ open: id => routed.push(id) }); await Promise.resolve();
  assert.deepEqual(routed, [2]);
  route({ id: 'world-report' }); routeState.chatToken++; resolve({ open: id => routed.push(id) }); await Promise.resolve();
  assert.deepEqual(routed, [2]);
  route({ id: 'world-report' }); routeState.disposed = true; resolve({ open: id => routed.push(id) }); await Promise.resolve();
  assert.deepEqual(routed, [2]);
  const { api, state, emit, modules } = fixture(), baseline = structuredClone(state.rows);
  const loaded = await api.load(); assert.equal(loaded.report.messageId, 2); assert.deepEqual(state.rows, baseline);
  loaded.report.active[0].name = '篡改'; assert.equal((await api.load()).report.active[0].name, '甲');
  assert.equal((await api.load(0)).report.messageId, 0);
  await assert.rejects(api.load(1), /assistant/); await assert.rejects(api.load(-1), /编号/);
  state.rows[2].is_hidden = true; assert.equal((await api.load()).report.messageId, 0); state.rows[2].is_hidden = false;
  for (const change of [
    () => { state.page++; }, () => { state.rows[2].message += '外部正文'; },
    () => { state.rows[2].data.stat_data.名称 = '新玩家'; },
    () => { state.rows.push({ message_id: 3, role: 'user', message: '新回合',data:{} }); },
  ]) {
    const before = state.reads;
    state.hook = count => { if (count === before + 3) change(); };
    await assert.rejects(api.load(), /变化/);
    state.hook = null; state.rows = structuredClone(baseline); state.page = 0;
  }
  state.hook = () => { throw Error('模拟失败'); }; await assert.rejects(api.load(), /模拟失败/);
  state.hook = null; assert.equal((await api.load()).report.messageId, 2);
  state.pageHook=pages=>{pages[2].swipes_data[0]={npc_data:{另一分支:{}}};};
  await assert.rejects(api.load(),/所选分支已变化/);state.pageHook=null;
  for(const args of [['quiet',{},false],['dryRun',{},false],['normal',{quiet_prompt:'静默'},false],
    ['normal',{dryRun:true},false],['normal',{},true]]) {
    const before=state.reads;state.hook=count=>{if(count===before+2)emit('GENERATION_STARTED',...args);};
    assert.equal((await api.load()).report.messageId,2);state.hook=null;
  }
  const savedHost=modules['cryptLord.hostApi'];
  const beforeHost=state.reads;state.hook=count=>{if(count===beforeHost+2)modules['cryptLord.hostApi']={...savedHost};};
  await assert.rejects(api.load(),/宿主|服务/);
  modules['cryptLord.hostApi']=savedHost;state.hook=null;
  for (const event of ['CHAT_CHANGED', 'GENERATION_STARTED']) {
    const before = state.reads; state.hook = count => { if (count === before + 2) emit(event); };
    await assert.rejects(api.load(), error => error.name === 'AbortError'); state.hook = null;
  }
  let valid = true; const before = state.reads; state.hook = count => { if (count === before + 1) valid = false; };
  await assert.rejects(api.load(null, () => valid), error => error.name === 'AbortError'); state.hook = null;
  state.rows.push(structuredClone(state.rows[2])); await assert.rejects(api.scan(), /编号/); state.rows.pop();
  api.dispose(); await assert.rejects(api.load(), error => error.name === 'AbortError');
  assert.deepEqual(state.rows, baseline);
});
