import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const files = ['core/response-normalizer.js', 'core/generation-quality.js', 'core/state-store.js',
  'core/generation-bridge.js', 'modules/native-floor/index.js'];
const sources = await Promise.all(files.map(path => read(`public/guimizhizhu_ui/${path}`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt');
const good = '<thinking>核对状态</thinking><gametxt>调查：你沿着廷根的街道前进，终于发现了一条新的线索。</gametxt><action>1.继续调查</action>';
const plain = value => JSON.parse(JSON.stringify(value));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  for (let count = 0; count < 100; count++) { if (check()) return; await sleep(5); }
  throw Error('等待流程超时');
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function fixture() {
  const modules = {}, handlers = new Map(), requests = [], writes = [], deletions = [], reviews = [];
  const protected0 = { message_id: 0, role: 'assistant', message: good, data: { stat_data: { 活力: 10 }, other: { keep: true } } };
  const state = { floors: [structuredClone(protected0)], variables: { otherPlugin: { keep: true } },
    scriptId: 'quality-test', replies: [], reviewReply: null, settleGate: null, settlements: 0,
    timeout: 0, retryLimit: 1, stream: false, writeFail: false, configWrites: 0,
    configFail: false, configReadFail: false, configLost: false, noConfigWrite: false, configHook: null };
  const surface = { value: null };
  const host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: state.scriptId }),
    async getVariables() { if(state.configReadFail)throw Error('模拟设置读取失败');return structuredClone(state.variables); },
    async updateVariablesWith(fn) {
      if(state.configFail)throw Error('模拟设置保存失败');
      await state.configHook?.();
      const next=await fn(structuredClone(state.variables));
      if(!state.noConfigWrite)state.variables=next;
      state.configWrites++;
      if(state.configLost)throw Error('设置响应丢失');
    },
    async getChatMessages(range) {
      return structuredClone(range === '0-{{lastMessageId}}' ? state.floors : range === '{{lastMessageId}}' ? state.floors.slice(-1) :
        state.floors.filter(row => row.message_id === Number(range)));
    },
    async createChatMessages(rows) {
      rows.forEach(row => state.floors.push({ ...structuredClone(row), message_id: (state.floors.at(-1)?.message_id ?? -1) + 1 }));
    },
    async setChatMessages(rows) {
      if (state.writeFail) throw Error('模拟保存失败');
      writes.push(structuredClone(rows));
      rows.forEach(row => Object.assign(state.floors.find(item => item.message_id === row.message_id), structuredClone(row)));
    },
    async deleteChatMessages(ids) { deletions.push(...ids); state.floors = state.floors.filter(row => !ids.includes(row.message_id)); },
    async generate(config) {
      requests.push(structuredClone(config));
      const reply = state.replies.shift();
      if (reply instanceof Error) throw reply;
      return typeof reply === 'function' ? reply(config) : reply ?? good;
    },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = { getHost: () => surface.value,
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, handler) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(handler); return { stop: () => handlers.get(name).delete(handler) };
    } };
  modules['cryptLord.contextBuilder'] = { build: async () => [] };
  modules['cryptLord.nativeSettlement'] = {
    apply(data) { state.settlements++; data.stat_data.活力++; },
    async prepare(data) {
      const next = structuredClone(data);
      this.apply(next);
      return { data: next };
    },
    async assertPrepared() {},
  };
  modules['cryptLord.variablePatch'] = {
    apply: () => ({ applied: 0 }), embedUpdate: text => text, updateTag: () => '',
  };
  modules['cryptLord.variableSettlementApi'] = { async settle({ guard }) {
    if (state.settleGate) await state.settleGate;
    if (guard && !guard()) throw new DOMException('结算取消', 'AbortError');
    return { skipped: true };
  } };
  modules['cryptLord.generationRepairUi'] = {
    async review(options) {
      reviews.push(options);
      if (typeof state.reviewReply === 'function') return state.reviewReply(options);
      return state.reviewReply;
    }, close() {},
  };
  const runtime = { console, structuredClone, DOMException, AbortController, setTimeout, clearTimeout,
    cryptLord: { __stage1Modules: modules, contract: {
      initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { assert.ok(modules[key], key); return modules[key]; },
    } } };
  runtime.window = runtime; vm.createContext(runtime);
  sources.forEach(source => vm.runInContext(source, runtime));
  const bridge = modules['cryptLord.nativeFloorBridge'], build = bridge.buildGenerationConfig;
  modules['cryptLord.nativeFloorBridge'] = { ...bridge, getRetryDelayMs: () => 0,
    async buildGenerationConfig(text) {
      const result = await build(text);
      return { ...result, retryLimit: state.retryLimit, watchdogSeconds: state.timeout,
        config: { ...result.config, should_stream: state.stream } };
    } };
  return { state, modules, requests, reviews, writes, deletions, host, protected0, surface,
    api: modules['cryptLord.nativeFloor'], quality: modules['cryptLord.generationQuality'],
    emit: name => handlers.get(name)?.forEach(fn => fn()) };
}
function oracle(name) {
  const index = original.search(new RegExp(`^${name}\\([^\\n]*\\)\\s*\\{`, 'm'));
  assert.notEqual(index, -1);
  const tree = ts.createSourceFile('original.js', `({${original.slice(index)}})`, 99, true, ts.ScriptKind.JS);
  let method;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) method = node.getText(tree);
    if (!method) ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(method, name); return vm.runInNewContext(`({${method}})`, { console });
}
test('原版质量规则、标签修复、人工接管与脚本设置独立对照', async () => {
  const { quality, state, reviews } = fixture(), validate = oracle('validateAiResponseFormat'), fix = oracle('_autoFixTags');
  for (const text of [good, '<GAMETXT lang="zh">调查：长文本足够用于结构判定</GAMETXT >',
    good.replace('</gametxt>', ''), good.replace('<thinking>', ''), '<gametxt>一</gametxt><gametxt>二</gametxt>',
    '<thinking><gametxt>重叠</thinking></gametxt>', '无标签', '<wlog>世界报告',
    '<gametxt>：长正文<action>选择</action>', '<gametxt>：</gametxt >']) {
    assert.deepEqual(plain(quality.validateFormat(text)), plain(validate.validateAiResponseFormat(text, ['thinking', 'gametxt', 'action'], ['gametxt'])));
    assert.equal(quality.autoFixTags(text), fix._autoFixTags(text, ['thinking', 'gametxt', 'action']));
  }
  for (const text of ['', 'abcd', 'abcde', 'x'.repeat(19), 'x'.repeat(20)]) {
    const result = await quality.inspect(text, { allowModal: false });
    assert.equal(result.autoRetryable, true); assert.equal(result.failureKind, 'content');
  }
  assert.equal((await quality.inspect(good)).passed, true);
  const broken = good.replace('</gametxt>', '');
  assert.equal((await quality.inspect(broken, { allowModal: false })).passed, false);
  assert.equal(reviews.length, 1); assert.equal(reviews[0].draft, quality.autoFixTags(broken));
  state.reviewReply = { text: '人工正文：明确接受这份没有协议标签的长正文。' };
  const accepted = await quality.inspect(broken, { allowModal: false });
  assert.equal(accepted.isRepaired, true); assert.equal(accepted.manualTakeover, true);
  const baseline = await quality.readSnapshot();
  assert.deepEqual(plain(baseline.settings), { retryLimit: 3, streamTimeoutSeconds: 300, noStreamTimeoutSeconds: 900 });
  await quality.saveSettings({ retryLimit: 0, streamTimeoutSeconds: 0, noStreamTimeoutSeconds: 0 }, baseline.revision);
  assert.deepEqual(state.variables.otherPlugin, { keep: true });
  assert.equal((await quality.readSnapshot()).settings.retryLimit, 0);
  await assert.rejects(quality.saveSettings({ retryLimit: 1 }, baseline.revision), /已变化/);
  assert.throws(() => quality.normalizeSettings({ retryLimit: -1 }), /范围/);
  const latest = await quality.readSnapshot(); state.scriptId = 'other-script';
  await assert.rejects(quality.saveSettings({ retryLimit: 2 }, latest.revision), /变化/);
  assert.equal(quality.retryDelayMs(100), 10000);
  quality.dispose(); await assert.rejects(quality.inspect(good), { name: 'AbortError' });
  for (const mutate of [
    g=>{g.state.scriptId='new-script'},
    g=>{g.surface.value={document:{},window:{}}},
    g=>{g.modules['cryptLord.hostApi']={...g.host}},
    g=>{g.emit('chat')},
  ]) {
    const g=fixture(),baseline=await g.quality.readSnapshot();
    mutate(g);
    await assert.rejects(g.quality.saveSettings({retryLimit:2},baseline.revision),/变化/);
    assert.equal(g.state.configWrites,0);g.api.dispose();g.quality.dispose();
  }
  const forged=fixture(),issued=await forged.quality.readSnapshot();
  await assert.rejects(forged.quality.saveSettings({retryLimit:2},structuredClone(issued.revision)),/凭据无效/);
  issued.revision.options.script_id='伪造脚本';
  await assert.rejects(forged.quality.saveSettings({retryLimit:2},issued.revision),/凭据无效/);
  forged.quality.dispose();
  for(const outcome of ['lost','no-write','failed-unchanged','late-cancel']){
    const g=fixture();
    g.state.variables['cryptLord.generationQuality']={retryLimit:3,streamTimeoutSeconds:300,noStreamTimeoutSeconds:900,future:{keep:true}};
    const baseline=await g.quality.readSnapshot();
    if(outcome==='lost')g.state.configLost=true;
    if(outcome==='no-write')g.state.noConfigWrite=true;
    if(outcome==='failed-unchanged'){g.state.noConfigWrite=true;g.state.configLost=true}
    if(outcome==='late-cancel')g.state.configHook=()=>g.emit('chat');
    const save=()=>g.quality.saveSettings({retryLimit:2},baseline.revision);
    if(outcome==='lost'){
      const result=await save();assert.match(result.warning,/已确认保存.*响应丢失/);
      assert.equal(result.settings.retryLimit,2);assert.equal(g.state.configWrites,1);
      assert.deepEqual(g.state.variables['cryptLord.generationQuality'].future,{keep:true});
      assert.equal((await g.quality.saveSettings({retryLimit:2},result.revision)).unchanged,true);
      assert.equal(g.state.configWrites,1);await assert.rejects(save(),/凭据无效/);
    }else if(outcome==='no-write'){
      const result=await save();assert.equal(result.settings,null);assert.equal(result.revision,null);
      assert.match(result.warning,/无法确认/);await assert.rejects(save(),/凭据无效/);
    }else if(outcome==='failed-unchanged'){
      await assert.rejects(save(),/响应丢失/);g.state.noConfigWrite=false;
      assert.match((await save()).warning,/已确认保存/);
    }else{
      await assert.rejects(save(),/变化/);assert.equal(g.state.configWrites,0);
    }
    assert.deepEqual(g.state.variables.otherPlugin,{keep:true});g.quality.dispose();
  }
  for (const boundary of ['chat','stop','host','ui','document','normalizer']) {
    const g=fixture(),gate=deferred();g.state.reviewReply=async()=>{await gate.promise;return{text:good}};
    const run=g.quality.inspect(broken);
    await until(()=>g.reviews.length===1);
    if(boundary==='chat')g.emit('chat');
    if(boundary==='stop')g.emit('stop');
    if(boundary==='host')g.modules['cryptLord.hostApi']={...g.host};
    if(boundary==='ui')g.modules['cryptLord.generationRepairUi']={...g.modules['cryptLord.generationRepairUi']};
    if(boundary==='document')g.surface.value={document:{},window:{}};
    if(boundary==='normalizer')g.modules['cryptLord.responseNormalizer']={...g.modules['cryptLord.responseNormalizer']};
    gate.resolve();await assert.rejects(run,/变化|取消/);
    assert.equal(g.writes.length,0);g.api.dispose();g.quality.dispose();
  }
});
test('完整原生生成事务：重试、接管、取消、故障、超时迟到、流式续期及聊天隔离', async () => {
  {
    const f = fixture(); f.state.replies = ['', '空回', good]; f.state.retryLimit = 2;
    await f.api.submitNativeTurn('调查');
    assert.equal(f.requests.length, 3); assert.equal(new Set(f.requests.map(row => row.generation_id)).size, 3);
    assert.equal(f.state.floors.length, 3); assert.equal(f.state.settlements, 1); assert.equal(f.api.hasActiveTurn(), false);
    assert.equal(f.state.floors[2].message, good); assert.deepEqual(f.state.floors[0], f.protected0);
    assert.equal(f.reviews.length, 0); assert.equal(f.deletions.length, 0); f.api.dispose();
  }
  {
    const f = fixture(); f.state.replies = [good.replace('</gametxt>', '')]; f.state.reviewReply = { text: good };
    await f.api.submitNativeTurn('调查');
    assert.equal(f.requests.length, 1); assert.equal(f.reviews.length, 1); assert.equal(f.state.settlements, 1);
    assert.equal(f.state.floors[2].message, good); f.api.dispose();
  }
  {
    const f = fixture(); f.state.retryLimit = 0; f.state.replies = [''];
    await f.api.submitNativeTurn('调查');
    assert.deepEqual(f.state.floors, [f.protected0]); assert.deepEqual(f.deletions, [1]); f.api.dispose();
  }
  {
    const f = fixture(); const original = good.replace('</gametxt>', '');
    f.state.floors.push({ message_id: 1, role: 'user', message: '原生调查', data: { keep: true } },
      { message_id: 2, role: 'assistant', message: original, data: { other: { keep: true } } });
    const baseline = structuredClone(f.state.floors);
    assert.equal(await f.api.processNativeAssistantFloor(2), false); assert.deepEqual(f.state.floors, baseline);
    assert.equal(f.deletions.length, 0); assert.equal(f.requests.length, 0);
    f.state.reviewReply = { text: good };
    assert.equal(await f.api.processNativeAssistantFloor(2), true);
    assert.equal(f.state.floors[2].message, good); assert.equal(f.state.settlements, 1);
    assert.deepEqual(f.state.floors.slice(0, 2), baseline.slice(0, 2)); f.api.dispose();
  }
  for (const boundary of ['chat', 'dispose', 'source']) {
    const f = fixture(), gate = deferred(); f.state.replies = [good.replace('</gametxt>', '')];
    f.state.reviewReply = async options => {
      await gate.promise;
      if (options.signal.aborted) throw new DOMException('取消', 'AbortError');
      return { text: good };
    };
    const run = f.api.submitNativeTurn('调查'); await until(() => f.reviews.length);
    if (boundary === 'chat') { f.emit('chat'); f.state.floors = [structuredClone(f.protected0)]; }
    if (boundary === 'dispose') f.api.dispose();
    if (boundary === 'source') f.state.floors.push({ message_id: 2, role: 'user', message: '外部回合' });
    const baseline = structuredClone(f.state.floors); gate.resolve(); await run;
    assert.deepEqual(f.state.floors, baseline); assert.equal(f.writes.length, 0); assert.equal(f.deletions.length, 0);
    f.api.dispose();
  }
  {
    const f = fixture(), late = deferred(); f.state.timeout = 0.02; f.state.replies = [() => late.promise, good];
    await f.api.submitNativeTurn('调查'); late.resolve(good.replace('调查：', '迟到：')); await sleep(10);
    assert.equal(f.requests.length, 2); assert.equal(f.state.settlements, 1); assert.equal(f.state.floors[2].message, good);
    f.api.dispose();
  }
  {
    const f = fixture(), gate = deferred(); f.state.timeout = 0.03; f.state.stream = true;
    f.state.replies = [config => {
      const timer = setInterval(() => f.api.onStreamToken('仍在生成', config.generation_id), 10);
      return gate.promise.finally(() => clearInterval(timer));
    }];
    const run = f.api.submitNativeTurn('调查'); await until(() => f.requests.length); await sleep(65);
    gate.resolve(good); await run; assert.equal(f.requests.length, 1); assert.equal(f.state.settlements, 1); f.api.dispose();
  }
  {
    const f = fixture(); f.state.replies = [Error('请求失败'), good];
    await f.api.submitNativeTurn('调查'); assert.equal(f.state.settlements, 1); assert.equal(f.requests.length, 2); f.api.dispose();
  }
  {
    const f = fixture(), gate = deferred(); f.state.settleGate = gate.promise;
    const run = f.api.submitNativeTurn('调查'); await until(() => f.state.floors.length === 3);
    await until(() => f.writes.length === 1);
    const writes = f.writes.length;
    f.emit('chat'); f.state.floors = [structuredClone(f.protected0)]; gate.resolve(); await run;
    assert.equal(f.writes.length, writes); assert.deepEqual(f.state.floors, [f.protected0]); f.api.dispose();
  }
  {
    const f = fixture(); f.state.writeFail = true;
    await assert.rejects(f.api.submitNativeTurn('调查'), /保存失败/);
    assert.equal(f.requests.length, 1); assert.equal(f.state.floors.length, 3);
    assert.equal(f.deletions.length, 0); assert.equal(f.api.hasActiveTurn(), false); f.api.dispose();
  }
  {
    const f = fixture(), gate = deferred();
    f.state.replies = [() => gate.promise];
    const old = f.api.submitNativeTurn('旧调查'); await until(() => f.requests.length === 1);
    f.emit('chat'); f.state.floors = [structuredClone(f.protected0)];
    f.state.timeout = 0.02; f.state.replies = [() => new Promise(() => {}), good];
    const next = f.api.submitNativeTurn('新调查');
    gate.resolve(good); await old; await next;
    assert.equal(f.requests.length, 3); assert.equal(f.state.settlements, 1);
    assert.equal(f.state.floors[1].message, '新调查'); f.api.dispose();
  }
  {
    const f = fixture(), gate = deferred(); let waiting = false;
    const bridge = f.modules['cryptLord.nativeFloorBridge'];
    f.modules['cryptLord.nativeFloorBridge'] = { ...bridge, async onRetry() { waiting = true; await gate.promise; } };
    f.state.replies = [''];
    const run = f.api.submitNativeTurn('调查'); await until(() => waiting);
    f.emit('stop'); gate.resolve(); await run;
    assert.equal(f.requests.length, 1); assert.equal(f.api.hasActiveTurn(), false);
    assert.deepEqual(f.state.floors, [f.protected0]); f.api.dispose();
  }
});
