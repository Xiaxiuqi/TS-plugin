(() => {
  'use strict';
  const KEY = 'cryptLord.journeySequence', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  if (!contract || !modules?.['cryptLord.journeyReader']) throw Error('经历序号修正依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const clone = value => structuredClone(value);
  const signature = modules['cryptLord.nativeFloorSource'].signature;
  const same = (a, b) => signature(a) === signature(b);
  const tickets = new WeakMap(), revisions = new WeakMap(), restores = new WeakMap();
  let epoch = 0, disposed = false, generating = false, queue = Promise.resolve();
  function check(guard, token) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw Error('经历序号操作已取消');
  }
  const positive = value => Number.isSafeInteger(value) && value > 0;
  // Source offsets keep every non-serial byte, including aliases and multiline fields.
  function extract(message) {
    const text = String(message || ''), blocks = [];
    const visibleText = modules['cryptLord.responseNormalizer'].maskHidden(text);
    const pattern = /<(\/?)(本周目经历)(?:\s+[^>]*)?\s*>/gi;
    let journey = null;
    for (const match of visibleText.matchAll(pattern)) {
      const closing = Boolean(match[1]);
      if (!closing) {
        if (journey) throw Error('经历标签嵌套，不能安全修正');
        journey = { start: match.index + match[0].length };
      } else {
        if (!journey) throw Error('经历标签闭合异常');
        blocks.push({ ...journey, end: match.index }); journey = null;
      }
    }
    if (journey) throw Error('经历标签未闭合');
    const rows = [];
    for (const block of blocks) {
      const body = text.slice(block.start, block.end);
      const visible = visibleText.slice(block.start, block.end);
      if (!visible.trim()) continue;
      const serials = [...visible.matchAll(/^[ \t]*序号\|([^\r\n]*)/gm)];
      if (!serials.length || visible.slice(0, serials[0].index).trim()) throw Error('经历存在无法定位的片段');
      serials.forEach((serial, index) => {
        const value = serial[1], start = block.start + serial.index + serial[0].length - value.length;
        if (text.slice(start, start + value.length) !== visibleText.slice(start, start + value.length))
          throw Error('序号字段与隐藏协议重叠，不能安全修正');
        const eventText = visible.slice(serial.index, serials[index + 1]?.index ?? body.length);
        const event = modules['cryptLord.journeyReader'].parse(eventText.replace(serial[0], '序号|1'))[0] || {};
        rows.push({ start, end: start + value.length, serial: value.trim(), parsedSeq: parseInt(value, 10),
          title: event.大纲 || '无标题', date: event.日期 || '未知日期', text: eventText });
      });
    }
    return rows;
  }
  function analyze(floors) {
    let expectedNext = 1, previous = 0;
    const events = [], groups = [];
    for (const floor of floors) {
      const group = { messageId: floor.message_id, events: [], error: '' };
      try {
        for (const raw of extract(floor.message)) {
          const seq = raw.parsedSeq;
          let problem = null;
          if (!positive(seq) || !/^\d+$/.test(raw.serial))
            problem = { type: 'invalid', severity: 'critical', message: '无效序号' };
          else if (seq === previous) problem = { type: 'duplicate', severity: 'critical', message: '重复序号' };
          else if (seq < previous) problem = { type: 'backward', severity: 'critical', message: `倒退 (${previous}→${seq})` };
          else if (seq > expectedNext + 10) problem = { type: 'jump', severity: 'high', message: `大跳跃 (+${seq - expectedNext})` };
          else if (seq > expectedNext) problem = { type: 'skip', severity: 'low', message: `跳号 (${expectedNext}→${seq})` };
          if (problem) problem.suggested = expectedNext;
          const event = { ...raw, messageId: floor.message_id, index: events.length, problem };
          events.push(event); group.events.push(event);
          expectedNext = Math.max(expectedNext, Number.isNaN(seq) ? 0 : seq) + 1;
          previous = seq;
        }
      } catch (error) { group.error = error.message; }
      groups.push(group);
    }
    return { groups, events, problems: events.filter(row => row.problem).length };
  }
  async function read(host, guard) {
    const reader = modules['cryptLord.nativeFloorSource'], native = await reader.read(guard);
    if (host !== modules['cryptLord.hostApi']) throw Error('经历宿主已变化');
    await reader.assert(native, guard);
    return { floors: native.rows, pages: native.swipes, native, reader };
  }
  function range(value, latest) {
    const from = value?.from ?? 1, to = value?.to ?? latest;
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) throw Error('楼层范围无效');
    return { from, to };
  }
  function reason(floors) {
    const latest = floors.filter(row => row.role === 'assistant').at(-1);
    for (const key of ['teamBattle', 'personalBattle']) {
      const battle = latest?.data?.cryptLord?.[key];
      if (battle?.status === 'active' || key === 'teamBattle' && ['ended', 'finished'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' && battle.enemy?.npcKey && !battle.experienceClaimed)
        return '请先结束并结算当前战斗';
    }
    return '';
  }
  async function load(options, guard, token = epoch) {
    check(guard, token);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const dependencies = Object.fromEntries(['cryptLord.journeyReader', 'cryptLord.responseNormalizer',
      'cryptLord.nativeFloorSource'].map(key => [key, modules[key]]));
    const valid = () => {
      check(guard, token);
      if (Object.entries(dependencies).some(([key, value]) => modules[key] !== value)) throw Error('经历解析或来源服务已变化');
      return true;
    };
    const source = await read(host, valid), selected = range(options, Math.max(1, source.floors.at(-1)?.message_id || 1));
    const analysis = analyze(source.floors.filter(row => row.role === 'assistant' && !row.is_hidden &&
      row.message_id >= selected.from && row.message_id <= selected.to));
    const fresh = await read(host, valid); valid();
    if (source.reader !== modules['cryptLord.nativeFloorSource']) throw Error('经历来源服务已变化');
    source.reader.assertIdentity(source.native, guard);
    if (!same(source.floors, fresh.floors) || !same(source.pages, fresh.pages)) throw Error('读取期间楼层或消息页已变化');
    const blocked = generating ? '生成进行中，暂不能修改序号' : reason(source.floors) ||
      (analysis.groups.some(group => group.error) ? '所选范围含损坏经历，请先用剧情编辑器修复' : '');
    const result = { ...analysis, range: selected, editable: !blocked, reason: blocked, epoch: token };
    revisions.set(result, { source, selected: clone(selected), analysis: clone(analysis), token,
      editable: !blocked, dependencies, signature: signature(result) });
    return result;
  }
  async function verify(input, guard) {
    const valid = () => identity(input, guard);
    valid();
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const fresh = await read(host, valid); valid();
    if (!same(fresh.floors, input.source.floors) || !same(fresh.pages, input.source.pages))
      throw Object.assign(Error('楼层正文、变量、消息页或末楼已变化，请重新读取'), { conflict: true });
    if (reason(fresh.floors)) throw Object.assign(Error(reason(fresh.floors)), { conflict: true });
    return host;
  }
  function identity(input, guard) {
    check(guard, input.token);
    if (generating) throw Error('生成进行中，暂不能修改序号');
    if (Object.entries(input.dependencies).some(([key, value]) => modules[key] !== value))
      throw Error('经历解析或来源服务已变化');
    input.source.reader.assertIdentity(input.source.native, guard);
    return true;
  }
  function replacements(analysis, action) {
    const changes = [], push = (row, value) => {
      if (!positive(value)) throw Error('序号必须为安全正整数');
      if (row.serial !== String(value)) changes.push({ ...row, value: String(value) });
    };
    if (action.type === 'single') {
      const row = analysis.events.find(item => item.index === action.index);
      if (!row) throw Error('经历条目不存在');
      push(row, action.value);
    } else if (action.type === 'renumber') {
      if (!positive(action.start)) throw Error('起始序号必须为安全正整数');
      analysis.events.forEach((row, index) => push(row, action.start + index));
    } else if (action.type === 'smart') {
      let next = 1;
      for (const row of analysis.events) {
        const seq = row.parsedSeq;
        const value = !positive(seq) || !/^\d+$/.test(row.serial) || seq < next || seq > next + 10 ? next : seq;
        push(row, value); next = value + 1;
      }
    } else if (action.type === 'critical') {
      analysis.events.filter(row => ['critical', 'high'].includes(row.problem?.severity))
        .forEach(row => push(row, row.problem.suggested));
    } else throw Error('未知序号修正操作');
    return changes;
  }
  async function prepare(baseline, operation, guard) {
    const issued = revisions.get(baseline), action = clone(operation);
    if (!issued || !issued.editable || signature(baseline) !== issued.signature) throw Error('序号分析来源无效，请重新读取');
    const input = { ...issued }; await verify(input, guard);
    const changes = replacements(input.analysis, action), rows = [];
    for (const floor of input.source.floors) {
      const local = changes.filter(row => row.messageId === floor.message_id);
      if (!local.length) continue;
      let message = floor.message;
      for (const row of local.sort((a, b) => b.start - a.start)) message = message.slice(0, row.start) + row.value + message.slice(row.end);
      rows.push({ message_id: floor.message_id, message });
    }
    const ticket = { rows: clone(rows), changes: clone(changes), type: action.type };
    tickets.set(ticket, { ...input, rows, changes, type: action.type });
    return ticket;
  }
  function enqueue(run) { const result = queue.then(run); queue = result.catch(() => {}); return result; }
  function beginCommit(ticket, previousUndo, guard) {
    const issued = tickets.get(ticket);
    if (!issued || !same(ticket.rows, issued.rows) || !same(ticket.changes, issued.changes) || ticket.type !== issued.type)
      throw Error('序号修改凭据无效');
    if (issued.transaction && issued.previousUndo !== previousUndo) throw Error('恢复原始来源已变化');
    issued.guards ||= new Set(); if (guard) issued.guards.add(guard);
    if (!issued.transaction) {
      issued.previousUndo = previousUndo;
      issued.transaction = transaction(issued, issued.rows, previousUndo, false, () => {
        for (const valid of issued.guards) if (!valid()) return false;
        return true;
      }, () => tickets.delete(ticket));
    }
    return issued.transaction;
  }
  function beginRestore(undo, guard) {
    const issued = restores.get(undo);
    if (!issued) throw Error('恢复原始凭据已失效');
    issued.guards ||= new Set(); if (guard) issued.guards.add(guard);
    issued.transaction ||= transaction(issued, issued.originals, undo, true, () => {
      for (const valid of issued.guards) if (!valid()) return false;
      return true;
    }, () => restores.delete(undo));
    return issued.transaction;
  }
  function transaction(input, rows, previousUndo, restoring, guard, consume) {
    let phase = 'pending', busy = false, result, failure;
    const prior = previousUndo ? restores.get(previousUndo) : null;
    const expected = { floors: clone(input.source.floors), pages: expectedPages(input.source.pages, rows) };
    rows.forEach(row => { expected.floors.find(floor => floor.message_id === row.message_id).message = row.message; });
    const valid = () => identity(input, guard);
    const checkPrior = () => {
      if (previousUndo && (!prior || restores.get(previousUndo) !== prior ||
        !same(prior.source.floors, input.source.floors) || !same(prior.source.pages, input.source.pages)))
        throw Error('恢复原始来源已变化');
    };
    const confirm = async () => {
      try { valid(); checkPrior(); } catch (error) { phase = 'conflict'; throw error; }
      let loaded;
      try { loaded = await load(input.selected, valid, input.token); }
      catch (error) {
        try { valid(); } catch (cancelled) { phase = 'conflict'; throw cancelled; }
        phase = 'uncertain';
        throw Error(`保存状态待核对，未重复提交：${error.message || error}`);
      }
      valid(); checkPrior();
      const saved = revisions.get(loaded).source;
      if (same(saved.floors, expected.floors) && same(saved.pages, expected.pages)) {
        let undo = null;
        if (!restoring && rows.length) {
          const originals = clone(prior?.originals || []);
          for (const row of rows) if (!originals.some(item => item.message_id === row.message_id)) {
            const original = input.source.floors.find(floor => floor.message_id === row.message_id);
            originals.push({ message_id: original.message_id, message: original.message });
          }
          undo = {};
          restores.set(undo, { ...revisions.get(loaded), originals });
        } else if (!restoring) undo = previousUndo;
        if (previousUndo && (restoring || rows.length)) restores.delete(previousUndo);
        phase = 'saved'; consume();
        result = { loaded, undo, unchanged: !rows.length, changed: input.changes?.length || 0, floors: rows.length,
          messageIds: rows.map(row => row.message_id),
          warning: failure ? `${restoring ? '原始序号已恢复' : '序号已保存'}，宿主响应丢失后已确认：${failure.message || failure}` : '' };
        return result;
      }
      if (same(saved.floors, input.source.floors) && same(saved.pages, input.source.pages)) {
        phase = 'pending';
        throw Error(`批量提交失败，已核对完全未写入；本次结果已保留，可重试保存。${failure?.message || ''}`);
      }
      phase = 'conflict';
      throw Error('批量提交实际结果与原始及预期均不一致，可能部分写入或存在外部修改；未覆盖、未回滚，请重新读取核对');
    };
    const run = action => {
      if (busy) return Promise.reject(Error('操作正在进行，不能重复提交或核对来源变化'));
      busy = true;
      return enqueue(action).finally(() => { busy = false; });
    };
    return Object.freeze({
      status: () => phase,
      save: () => run(async () => {
        if (phase === 'saved') { valid(); return result; }
        if (phase !== 'pending') throw Error('当前不能重试保存，请先核对保存或重新读取');
        let host;
        try {
          valid(); checkPrior(); host = await verify(input, guard);
          await verify(input, guard); valid(); checkPrior();
        } catch (error) {
          if (error.conflict) phase = 'conflict';
          try { valid(); checkPrior(); } catch { phase = 'conflict'; }
          throw error;
        }
        // A single message-only batch; partial persistence is never replayed or rolled back.
        phase = 'uncertain'; failure = null;
        if (rows.length) {
          try { await host.setChatMessages(clone(rows), { refresh: 'affected' }); }
          catch (error) { failure = error; }
        }
        return confirm();
      }),
      inspect: () => run(async () => {
        if (phase !== 'uncertain') throw Error('当前无需核对保存');
        return confirm();
      }),
    });
  }
  async function legacy(operation) {
    const transaction = operation();
    try { return { ...await transaction.save(), transaction }; }
    catch (error) {
      if (transaction.status() === 'uncertain')
        return { loaded: null, undo: null, transaction, warning: `序号已提交，但复核失败，保存状态待核对：${error.message || error}` };
      throw error;
    }
  }
  function commit(ticket, previousUndo, guard) {
    return legacy(() => beginCommit(ticket, previousUndo, guard));
  }
  function restore(undo, guard) {
    return legacy(() => beginRestore(undo, guard));
  }
  function expectedPages(pages, rows) {
    const expected = clone(pages);
    for (const row of rows) {
      const page = expected.find(item => item.message_id === row.message_id);
      page.swipes[page.swipe_id] = row.message;
    }
    return expected;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents();
  const subscriptions = [];
  if (events?.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; generating = false; }));
  if (events?.GENERATION_STARTED) subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.dryRun ||
      options?.options?.quiet_prompt || options?.options?.dryRun) return;
    epoch++; generating = true;
  }));
  for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
    subscriptions.push(after.bindEvent(name, () => { if (generating) { epoch++; generating = false; } }));
  const api = Object.freeze({ extract, analyze, load, prepare, beginCommit, beginRestore, commit, restore,
    cancel() { epoch++; },
    status: () => ({ ready: !disposed }),
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
