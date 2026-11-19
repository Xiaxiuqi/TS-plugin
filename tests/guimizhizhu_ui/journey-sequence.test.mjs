import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptKind } from 'typescript';
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const sources = await Promise.all(['response-normalizer', 'native-floor-source', 'journey-reader', 'journey-sequence'].map(name => read(`public/guimizhizhu_ui/core/${name}.js`)));
const original = await read('数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35a-js-init-storage-crossfire.txt');
const [adapterSource, loaderSource, shellSource] = await Promise.all([
  'public/guimizhizhu_ui/shared/host-api.js', 'public/guimizhizhu_ui/loader.js', 'public/guimizhizhu_ui/modules/game-shell/index.js',
].map(read));
const plain = value => JSON.parse(JSON.stringify(value));
const event = (seq, title = '调查') => `序号|${seq}\r\n标题|${title}\r\n描述|详情第一行\r\n自定义|续行保持\r\n标签|调查|城市`;
const message = values => `<thinking><本周目经历>${event(999)}</本周目经历></thinking>\n<gametxt>正文不变</gametxt>\n<本周目经历>\r\n${values.map(value => event(value)).join('\r\n\r\n')}\r\n</本周目经历>\n<UpdateVariable>原文不变</UpdateVariable>`;
function fixture() {
  const modules = {}, handlers = new Map(), writes = [], surface = { window: {}, document: {} };
  const data = { stat_data: { 名称: '测试' }, otherPlugin: { keep: true }, stat_data_for_ai: { keep: '非编辑快照' } };
  const state = { floors: [
    { message_id: 0, role: 'assistant', message: message([1]), data: structuredClone(data), extra: { keep: true } },
    { message_id: 1, role: 'user', message: '原生玩家输入', data: {} },
    { message_id: 2, role: 'assistant', message: message([1, 1]), data: structuredClone(data), extra: { keep: true } },
    { message_id: 3, role: 'user', message: '第二轮', data: {} },
    { message_id: 4, role: 'assistant', message: message([50, 4]), data: structuredClone(data), extra: { keep: true } },
  ], page: 0, gate: null, readHook: null, writeFail: false, postFail: false, readFail: false, partialFail: false,
    lostResponse: false, attempts: 0, afterWrite: null, noWrite: false, chatId: 'sequence-chat', scriptId: 'sequence-script' };
  state.alternates = state.floors.map(row => row.message);
  surface.window.SillyTavern = { getCurrentChatId: () => state.chatId };
  const host = {
    scriptVariableOptions: () => ({ type: 'script', script_id: state.scriptId }),
    async getChatMessages(range, options) {
      await state.readHook?.(range, options);
      if (state.readFail) throw Error('模拟读取失败');
      return structuredClone(options?.include_swipes ? state.floors.map(row => ({
        message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: state.page,
        swipes: state.page === 0 ? [row.message, state.alternates[row.message_id]] : [state.alternates[row.message_id], row.message],
        swipes_data: [row.data, row.data], swipes_info: [{ keep: true }, { keep: true }],
      })) : state.floors);
    },
    async setChatMessages(rows, options) {
      state.attempts++;
      if (state.noWrite) { state.readFail = true; throw Error('模拟未写入且回执不可读'); }
      if (state.writeFail) throw Error('模拟保存失败');
      assert.deepEqual(plain(options), { refresh: 'affected' });
      rows.forEach(row => assert.deepEqual(Object.keys(row).sort(), ['message', 'message_id']));
      writes.push(structuredClone(rows));
      for (const row of rows) {
        state.floors.find(floor => floor.message_id === row.message_id).message = row.message;
        if (state.partialFail) throw Error('模拟宿主部分写入');
      }
      if (state.postFail) state.readFail = true;
      state.afterWrite?.();
      if (state.lostResponse) throw Error('模拟批量成功响应丢失');
    },
    getWorldbook() { throw Error('不得读世界书'); }, generateRaw() { throw Error('不得请求模型'); },
  };
  modules['cryptLord.hostApi'] = host;
  modules['cryptLord.afterNativeHost'] = {
    getHost: () => surface,
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(name, fn) { const set = handlers.get(name) || new Set(); set.add(fn); handlers.set(name, set); return { stop: () => set.delete(fn) }; },
  };
  const runtime = { console, structuredClone, DOMException, cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {},
    async waitGlobalInitialized(key) { await state.gate?.(); return modules[key]; },
  } } };
  runtime.window = runtime; vm.createContext(runtime); sources.forEach(source => vm.runInContext(source, runtime));
  return { api: modules['cryptLord.journeySequence'], modules, state, writes, emit: (name,...args) => handlers.get(name)?.forEach(fn => fn(...args)) };
}
function gate() {
  let release, enter;
  const entered = new Promise(resolve => { enter = resolve; }), waiting = new Promise(resolve => { release = resolve; });
  return { entered, release, run: async () => { enter(); await waiting; } };
}
test('原版序号规则独立对照与完整修正：全部/智能/严重/单条、原文定位、安全格式', async () => {
  const f = fixture(), { api } = f;
  assert.match(loaderSource, /modules\/journey-sequence\/style\.css/);
  assert.ok(loaderSource.indexOf("path: 'core/journey-reader.js'") < loaderSource.indexOf("path: 'core/journey-sequence.js'"));
  assert.match(loaderSource, /modules\/journey-sequence\/index\.js/);
  assert.match(shellSource, /id: 'journey-sequence', label: '经历序号修正'/);
  assert.match(shellSource, /token === state\.chatToken && !state\.disposed && api\.open\(\)/);
  const calls = [], adapterRuntime = { console, cryptLord: { __stage1Modules: {}, contract: { initializeGlobal() {} } },
    getChatMessages(range, options) { calls.push([range, options]); return []; } };
  adapterRuntime.window = adapterRuntime; vm.createContext(adapterRuntime); vm.runInContext(adapterSource, adapterRuntime);
  await adapterRuntime.cryptLord.__stage1Modules['cryptLord.hostApi'].getChatMessages('0-4', { include_swipes: true });
  assert.deepEqual(calls, [['0-4', { include_swipes: true }]]);
  const source = original.slice(original.indexOf('const ChronicleCore ='));
  const tree = createSourceFile('original.js', source, 99, true, ScriptKind.JS);
  const object = tree.statements[0].declarationList.declarations[0].initializer;
  const names = ['DICT', 'parseTextToEvents', 'analyzeSequences', 'fixEventSequenceInText', 'stringifyEventToText'];
  const oracle = vm.runInNewContext(`({${names.map(name => object.properties.find(item =>
    item.name?.getText(tree) === name).getText(tree)).join(',')}})`, { console });
  const raw = [1, 1, 50, 4], floors = raw.map((seq, message_id) => ({ message_id, message: `<本周目经历>${event(seq)}</本周目经历>` }));
  const expected = oracle.analyzeSequences(floors, floor => floor.message.match(/<本周目经历>([\s\S]*)<\/本周目经历>/)[1]);
  const actual = api.analyze(floors);
  assert.deepEqual(plain(actual.events.map(row => ({ serial: row.serial, type: row.problem?.type || '', suggested: row.problem?.suggested }))),
    plain(expected.allEvents.map(row => ({ serial: row.序号, type: row.problems[0]?.type || '', suggested: row.problems[0]?.suggested }))));
  assert.equal(actual.problems, 3);
  for (const [type, result] of [['renumber', ['7', '8', '9', '10']], ['smart', ['1', '2', '3', '4']],
    ['critical', ['1', '2', '3', '51']], ['single', ['1', '9', '50', '4']]]) {
    const g = fixture(), loaded = await g.api.load();
    const ticket = await g.api.prepare(loaded, { type, start: 7, index: 1, value: 9 });
    const outcome = await g.api.commit(ticket);
    assert.deepEqual(plain(outcome.loaded.events.map(row => row.serial)), result);
    for (const row of g.state.floors.filter(row => row.role === 'assistant')) {
      assert.match(row.message, /自定义\|续行保持/); assert.match(row.message, /\r\n标题\|调查/);
      assert.match(row.message, /<thinking><本周目经历>序号\|999/);
      assert.match(row.message, /<UpdateVariable>原文不变/);
    }
  }
  assert.equal(api.extract(`<thinking><本周目经历>${event(9)}</本周目经历>`).length, 0);
  assert.equal(api.extract(`<分析><本周目经历>${event(9)}</本周目经历></分析>`).length,0);
  assert.equal(api.extract(`<JSONPatch>[{"value":"</JSONPatch><本周目经历>${event(9)}</本周目经历>"}]</JSONPatch>`).length,0);
  const hidden = `<本周目经历><safe>序号|99\n例子</safe>\n${event(2)}\n<thinking>\n序号|777\n</thinking>\n${event(3)}</本周目经历>`;
  assert.deepEqual(plain(api.extract(hidden).map(row => row.serial)), ['2', '3']);
  assert.doesNotMatch(api.extract(hidden).map(row=>row.text).join(''),/序号\|777|序号\|99/);
  assert.throws(() => api.extract('<本周目经历>序号|1<thinking>隐文</thinking>\n标题|调查</本周目经历>'), /重叠/);
  assert.equal(api.extract(`<本周目经历>${event('坏')}</本周目经历>`)[0].serial, '坏');
  assert.equal(api.analyze([{ message_id: 2, message: `<本周目经历>${event('2坏')}</本周目经历>` }]).events[0].problem.severity, 'critical');
  for (const text of ['<本周目经历>未闭合', '<本周目经历><本周目经历>序号|1</本周目经历></本周目经历>',
    '<本周目经历>损坏前缀\n序号|1</本周目经历>', '</本周目经历>'])
    assert.throws(() => api.extract(text), /经历/);
  const loaded = await api.load();
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    await assert.rejects(api.prepare(loaded, { type: 'single', index: 0, value }), /正整数/);
  await assert.rejects(api.prepare(loaded, { type: 'renumber', start: Number.MAX_SAFE_INTEGER }), /正整数/);
  await assert.rejects(api.load({ from: -1, to: 4 }), /范围/);
  assert.equal(f.writes.length, 0);
});
test('完整原生事务：零写入分析、批量和恢复、冲突/失败/排队/生命周期保护', async () => {
  const f = fixture(), { api, state, writes } = f, originals = structuredClone(state.floors);
  let loaded = await api.load();
  const ticket = await api.prepare(loaded, { type: 'smart' });
  assert.equal(writes.length, 0); assert.deepEqual(plain(loaded.groups.map(group => group.messageId)), [2, 4]);
  assert.equal((await api.commit(await api.prepare(loaded, { type: 'single', index: 0, value: 1 }))).unchanged, true);
  const result = await api.commit(ticket);
  assert.equal(writes.length, 1); assert.equal(writes[0].length, 2);
  assert.deepEqual(state.floors[0], originals[0]); assert.deepEqual(state.floors[1], originals[1]);
  state.floors.forEach((row, index) => assert.deepEqual(row.data, originals[index].data));
  loaded = result.loaded;
  const second = await api.commit(await api.prepare(loaded, { type: 'single', index: 0, value: 9 }), result.undo);
  const restored = await api.restore(second.undo);
  assert.ok(restored.loaded); assert.deepEqual(state.floors, originals);
  await assert.rejects(api.restore(second.undo), /失效/);
  await assert.rejects(api.commit(ticket), /凭据/);
  const all = await api.load({ from: 0, to: 4 });
  assert.equal(all.events.length, 5);
  const zero = await api.prepare(all, { type: 'single', index: 0, value: 3 }); assert.equal(zero.rows[0].message_id, 0);
  for (const mutate of [
    s => { s.floors[2].message += '外部正文'; },
    s => { s.floors[2].data.otherPlugin.keep = false; },
    s => { s.page++; },
    s => { s.floors[1].role = 'assistant'; },
    s => { s.floors.pop(); },
    s => { s.floors.push({ message_id: 5, role: 'user', message: '新回合', data: {} }); },
    s => { s.floors[2].data.stamp.setTime(7); },
    s => { s.floors[2].data.matcher = /changed/i; },
    s => { s.scriptId = 'other-script'; },
    s => { s.chatId = 'other-chat'; },
  ]) {
    const g = fixture();
    g.state.floors[2].data.stamp = new Date(0); g.state.floors[2].data.matcher = /original/g;
    const baseline = await g.api.load(), proof = await g.api.prepare(baseline, { type: 'smart' });
    mutate(g.state); await assert.rejects(g.api.commit(proof), /变化/); assert.equal(g.writes.length, 0);
  }
  const edited = await api.load(); edited.events[0].start = 0;
  await assert.rejects(api.prepare(edited, { type: 'smart' }), /来源/);
  await assert.rejects(api.commit({ rows: [], changes: [] }), /凭据/);
  const bad = fixture(); bad.state.floors[4].message = '<本周目经历>坏格式';
  const readonly = await bad.api.load(); readonly.editable = true;
  await assert.rejects(bad.api.prepare(readonly, { type: 'smart' }), /来源/);
  const battle = fixture(); battle.state.floors[4].data.cryptLord = { teamBattle: { status: 'active' } };
  assert.equal((await battle.api.load()).editable, false);
  const lifecycle = fixture();
  for (const command of [() => lifecycle.api.cancel(), () => lifecycle.emit('chat'), () => lifecycle.emit('start')]) {
    const baseline = await lifecycle.api.load(), proof = await lifecycle.api.prepare(baseline, { type: 'smart' });
    const block = gate(); lifecycle.state.gate = block.run;
    const pending = lifecycle.api.commit(proof); await block.entered; command(); block.release();
    await assert.rejects(pending, /取消/); lifecycle.state.gate = null;
    lifecycle.emit('end'); assert.equal(lifecycle.writes.length, 0);
  }
  lifecycle.emit('start'); assert.equal((await lifecycle.api.load()).editable, false); lifecycle.emit('end');
  const end = await lifecycle.api.prepare(await lifecycle.api.load(), { type: 'smart' });
  lifecycle.api.dispose(); await assert.rejects(lifecycle.api.commit(end), /取消/);
  const queue = fixture(), baseline = await queue.api.load(), proof = await queue.api.prepare(baseline, { type: 'smart' });
  const block = gate(); queue.state.gate = block.run;
  const first = queue.api.commit(proof), later = queue.api.commit(proof);
  await block.entered; block.release(); queue.state.gate = null;
  await first; await assert.rejects(later, /变化/); assert.equal(queue.writes.length, 1);
  const lastConflict = fixture(), lastProof = await lastConflict.api.prepare(await lastConflict.api.load(), { type: 'smart' });
  let reads = 0;
  lastConflict.state.readHook = () => { if (++reads === 3) lastConflict.state.floors[4].message += '最终异步冲突'; };
  await assert.rejects(lastConflict.api.commit(lastProof), /变化/); assert.equal(lastConflict.writes.length, 0);
  const fail = fixture(), failProof = await fail.api.prepare(await fail.api.load(), { type: 'smart' });
  fail.state.writeFail = true;
  await assert.rejects(fail.api.commit(failProof), /提交失败/); assert.equal(fail.writes.length, 0);
  fail.state.writeFail = false;
  const retry = await fail.api.prepare(await fail.api.load(), { type: 'smart' }); fail.state.postFail = true;
  const warning = await fail.api.commit(retry); assert.match(warning.warning, /已提交.*复核失败/); assert.equal(warning.loaded, null);
  const partial = fixture(), partialProof = await partial.api.prepare(await partial.api.load(), { type: 'smart' });
  partial.state.partialFail = true; await assert.rejects(partial.api.commit(partialProof), /实际结果/);
  assert.notEqual(partial.state.floors[2].message, originals[2].message); assert.equal(partial.state.floors[4].message, originals[4].message);
  const undoConflict = fixture(), saved = await undoConflict.api.commit(await undoConflict.api.prepare(await undoConflict.api.load(), { type: 'smart' }));
  undoConflict.state.floors[2].message += '外部修改';
  await assert.rejects(undoConflict.api.restore(saved.undo), /变化/);
  assert.equal(undoConflict.writes.length, 1);
  const lost=fixture(),lostProof=await lost.api.prepare(await lost.api.load(),{type:'smart'});
  lost.state.lostResponse=true;
  const confirmed=await lost.api.commit(lostProof);
  assert.match(confirmed.warning,/响应丢失后已确认/);
  assert.equal(lost.writes.length,1);
  const restoredLost=await lost.api.restore(confirmed.undo);
  assert.match(restoredLost.warning,/响应丢失后已确认/);assert.equal(lost.writes.length,2);
  assert.deepEqual(lost.state.floors,originals);
  const quiet=fixture(),quietProof=await quiet.api.prepare(await quiet.api.load(),{type:'smart'});
  quiet.emit('start','quiet',{},false);quiet.emit('start','normal',{},true);
  assert.ok((await quiet.api.commit(quietProof)).loaded);
  const hidden=fixture();hidden.state.floors[2].is_hidden=true;
  assert.deepEqual(plain((await hidden.api.load()).groups.map(row=>row.messageId)),[4]);
  const replaced=fixture(),replacedProof=await replaced.api.prepare(await replaced.api.load(),{type:'smart'});
  replaced.modules['cryptLord.hostApi']={...replaced.modules['cryptLord.hostApi']};
  await assert.rejects(replaced.api.commit(replacedProof),/宿主|变化/);assert.equal(replaced.writes.length,0);

  // One prepared result survives uncertain persistence; inspection never submits a batch.
  const recovery = fixture(), recoveryOriginals = structuredClone(recovery.state.floors);
  const pendingTicket = await recovery.api.prepare(await recovery.api.load(), { type: 'smart' });
  const transaction = recovery.api.beginCommit(pendingTicket);
  assert.equal(recovery.api.beginCommit(pendingTicket), transaction);
  recovery.state.postFail = true;
  await assert.rejects(transaction.save(), /待核对/);
  assert.equal(transaction.status(), 'uncertain'); assert.equal(recovery.state.attempts, 1);
  await assert.rejects(transaction.save(), /先核对/); assert.equal(recovery.state.attempts, 1);
  await assert.rejects(transaction.inspect(), /待核对/); assert.equal(recovery.state.attempts, 1);
  recovery.state.postFail = recovery.state.readFail = false;
  const recovered = await transaction.inspect(); assert.ok(recovered.undo);
  assert.equal(transaction.status(), 'saved'); assert.equal(recovery.state.attempts, 1);
  assert.equal((await transaction.save()).undo, recovered.undo);
  const again = await recovery.api.prepare(recovered.loaded, { type: 'single', index: 0, value: 8 });
  const savedAgain = await recovery.api.beginCommit(again, recovered.undo).save();
  const restoring = recovery.api.beginRestore(savedAgain.undo);
  recovery.state.postFail = true;
  await assert.rejects(restoring.save(), /待核对/); assert.equal(restoring.status(), 'uncertain');
  const attempts = recovery.state.attempts;
  recovery.state.postFail = recovery.state.readFail = false;
  assert.equal((await restoring.inspect()).undo, null);
  assert.equal(recovery.state.attempts, attempts); assert.deepEqual(recovery.state.floors, recoveryOriginals);
  const retryUndo = fixture(), undoOriginals = structuredClone(retryUndo.state.floors);
  const undoResult = await retryUndo.api.commit(await retryUndo.api.prepare(await retryUndo.api.load(), { type: 'smart' }));
  const undoTransaction = retryUndo.api.beginRestore(undoResult.undo);
  retryUndo.state.writeFail = true;
  await assert.rejects(undoTransaction.save(), /完全未写入/);
  assert.equal(undoTransaction.status(), 'pending');
  retryUndo.state.writeFail = false; await undoTransaction.save();
  assert.deepEqual(retryUndo.state.floors, undoOriginals);

  const unsaved = fixture(), unsavedTicket = await unsaved.api.prepare(await unsaved.api.load(), { type: 'smart' });
  const retryTransaction = unsaved.api.beginCommit(unsavedTicket);
  unsaved.state.noWrite = true;
  await assert.rejects(retryTransaction.save(), /待核对/);
  unsaved.state.noWrite = unsaved.state.readFail = false;
  await assert.rejects(retryTransaction.inspect(), /完全未写入/);
  assert.equal(retryTransaction.status(), 'pending'); assert.equal(unsaved.state.attempts, 1);
  unsavedTicket.rows[0].message = '不得提交篡改后的公开预览';
  assert.ok((await retryTransaction.save()).undo);
  assert.match(unsaved.state.floors[2].message, /正文不变/);
  assert.equal(unsaved.state.attempts, 2);
  const partialRecovery = fixture();
  const partialTransaction = partialRecovery.api.beginCommit(await partialRecovery.api.prepare(await partialRecovery.api.load(), { type: 'smart' }));
  partialRecovery.state.partialFail = true;
  await assert.rejects(partialTransaction.save(), /部分写入/);
  assert.equal(partialTransaction.status(), 'conflict');
  await assert.rejects(partialTransaction.save(), /不能重试/);
  assert.equal(partialRecovery.state.attempts, 1);
  const changed = fixture();
  const changedTransaction = changed.api.beginCommit(await changed.api.prepare(await changed.api.load(), { type: 'smart' }));
  changed.state.afterWrite = () => { changed.state.floors[0].data.unrelated = '不得忽略未编辑楼层'; };
  await assert.rejects(changedTransaction.save(), /外部修改/);
  assert.equal(changedTransaction.status(), 'conflict'); assert.equal(changed.writes.length, 1);
  const swapped = fixture();
  const swapping = swapped.api.beginCommit(await swapped.api.prepare(await swapped.api.load(), { type: 'smart' }));
  swapped.modules['cryptLord.responseNormalizer'] = { ...swapped.modules['cryptLord.responseNormalizer'] };
  await assert.rejects(swapping.save(), /服务已变化/); assert.equal(swapped.writes.length, 0);
  for (const args of [['quiet_prompt'], ['normal', { options: { quiet_prompt: true } }],
    ['normal', { options: { dryRun: true } }]]) {
    const q = fixture(), prepared = await q.api.prepare(await q.api.load(), { type: 'smart' });
    q.emit('start', ...args); q.emit('stop'); assert.ok((await q.api.commit(prepared)).loaded);
  }
  const stopped = fixture(), stopProof = await stopped.api.prepare(await stopped.api.load(), { type: 'smart' });
  stopped.emit('start', 'normal'); stopped.emit('stop');
  await assert.rejects(stopped.api.commit(stopProof), /取消/); assert.equal(stopped.writes.length, 0);
  const publicProof = fixture(), publicBaseline = await publicProof.api.load();
  publicBaseline.range.from = 0;
  await assert.rejects(publicProof.api.prepare(publicBaseline, { type: 'smart' }), /来源/);
});
