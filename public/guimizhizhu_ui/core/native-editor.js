(() => {
  'use strict';
  const KEY = 'cryptLord.nativeEditor', BOOK = '1源堡';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  if (!contract) throw Error('剧情编辑契约尚未加载');
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const canonical = value => Object.prototype.toString.call(value) === '[object Date]' ? { date: value.toISOString() } :
    Object.prototype.toString.call(value) === '[object RegExp]' ? { source: value.source, flags: value.flags } :
    Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ?
      Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  const tickets = new WeakMap(), delegated = new WeakMap(), baselines = new WeakMap(), subscriptions = [];
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw Error('剧情编辑操作已取消');
  }
  // Preserve source spans instead of serializing HTML and changing untouched protocol text.
  function spans(text, tag) {
    const pattern = new RegExp(`<(/?)${tag}(?:\\s+[^>]*)?\\s*>`, 'gi'), stack = [], result = [];
    for (const match of text.matchAll(pattern)) {
      if (!match[1]) stack.push({ start: match.index, innerStart: match.index + match[0].length });
      else if (stack.length) {
        const item = stack.pop();
        if (!stack.length) result.push({ ...item, innerEnd: match.index, end: match.index + match[0].length, closed: true });
      }
    }
    if (stack.length) result.push({ ...stack[0], innerEnd: text.length, end: text.length, closed: false });
    return result;
  }
  const content = (text, span) => span ? text.slice(span.innerStart, span.innerEnd) : '';
  function replaceSpans(text, replacements) {
    let result = text;
    for (const item of [...replacements].sort((a, b) => b.start - a.start))
      result = result.slice(0, item.start) + item.value + result.slice(item.end);
    return result;
  }
  function visibleAutomatic(text) {
    const hidden = spans(text, 'Auto');
    if (hidden.some(item => !item.closed)) throw Error('Auto 标签未闭合，自动化分区不可安全编辑');
    for (const item of hidden) item.end += text.slice(item.end).match(/^\s*/)[0].length;
    for (const match of text.matchAll(/💠识别的核心活跃NPC[^\n]*\n?\s*/gi))
      if (!hidden.some(item => match.index >= item.start && match.index < item.end))
        hidden.push({ start: match.index, end: match.index + match[0].length });
    hidden.sort((a, b) => a.start - b.start);
    return { visible: replaceSpans(text, hidden.map(item => ({ ...item, value: '' }))).trim(),
      hidden: hidden.map(item => text.slice(item.start, item.end)).join('') };
  }
  function journeyRows(text) {
    return String(text).split('\n').filter(line => line.trim()).map(line => {
      const index = line.indexOf('|');
      return { key: index < 0 ? '' : line.slice(0, index), value: index < 0 ? line : line.slice(index + 1) };
    });
  }
  function layout(text) {
    const protocol = modules['cryptLord.responseNormalizer'], masked = protocol.maskHidden(text);
    const games = spans(masked, 'gametxt'), game = games.at(-1), journey = spans(masked, '本周目经历').at(-1);
    const base = content(text, game), maskedBase = content(masked, game), inside = spans(maskedBase, 'details')[0];
    const style = spans(protocol.maskHidden(base, ['style']), 'style').find(item => !inside || item.end <= inside.start || item.start >= inside.end);
    const outside = spans(masked, 'details').find(item => !games.some(parent => item.start >= parent.start && item.end <= parent.end));
    const overlaps = (a, b) => a && b && a.start < b.end && b.start < a.end;
    const conflict = overlaps(game, journey) || overlaps(game, outside) || overlaps(journey, outside) ||
      /<gametxt(?:\s|>)/i.test(base) || style && inside && overlaps(style, inside);
    const protectedContent = base !== protocol.maskHidden(base, ['style', 'Auto']);
    return { game, journey, base, inside, style, outside, conflict, protectedContent };
  }
  function sections(message) {
    const text = String(message || ''), { game, journey, base, style, inside, outside, conflict, protectedContent } = layout(text);
    const automatic = inside || outside;
    const automaticText = inside ? content(base, inside) : content(text, outside);
    let visible = { visible: '', hidden: '' }, reason = '';
    if (!game || !game.closed || journey && !journey.closed || style && !style.closed || automatic && !automatic.closed)
      reason = '剧情分区标签缺失或未闭合';
    if (conflict) reason = '剧情分区标签重叠，请使用完整原文编辑';
    if (protectedContent) reason = '剧情分区包含受保护协议，请使用完整原文编辑';
    try { visible = visibleAutomatic(automaticText); } catch (error) { reason = error.message; }
    const removed = (conflict ? [] : [style, inside]).filter(Boolean).map(item => ({ ...item, value: '' }));
    return { available: !reason, reason, narrative: replaceSpans(base, removed).trim(),
      automatic: visible.visible, hiddenAutomatic: visible.hidden, hasAutomatic: Boolean(automatic),
      journey: journeyRows(content(text, journey)), hasJourney: Boolean(journey) };
  }
  function compose(message, draft) {
    const text = String(message || ''), original = sections(text);
    if (!original.available) throw Error(original.reason);
    if (!record(draft) || typeof draft.narrative !== 'string' || typeof draft.automatic !== 'string' ||
      !Array.isArray(draft.journey) || draft.journey.some(row => !record(row) || typeof row.key !== 'string' || typeof row.value !== 'string'))
      throw Error('剧情分区草稿格式无效');
    const narrativeChanged = draft.narrative !== original.narrative;
    const automaticChanged = draft.automatic !== original.automatic;
    const journeyChanged = !same(draft.journey, original.journey);
    if (!narrativeChanged && !automaticChanged && !journeyChanged) return text;
    const { game, base, style, inside, outside } = layout(text);
    const replacements = [], automaticBody = [original.hiddenAutomatic, draft.automatic.trim()].filter(Boolean).join('\n');
    let automaticFull = inside ? base.slice(inside.start, inside.end) : '';
    if (inside && automaticChanged) automaticFull = replaceSpans(automaticFull, [{
      start: inside.innerStart - inside.start, end: inside.innerEnd - inside.start, value: `\n${automaticBody}\n`,
    }]);
    if (narrativeChanged) {
      const full = [style ? base.slice(style.start, style.end) : '', draft.narrative.trim(), automaticFull].filter(Boolean).join('\n');
      replacements.push({ start: game.innerStart, end: game.innerEnd, value: `\n${full}\n` });
    } else if (inside && automaticChanged) replacements.push({
      start: game.innerStart + inside.innerStart, end: game.innerStart + inside.innerEnd, value: `\n${automaticBody}\n`,
    });
    if (!inside && outside && automaticChanged)
      replacements.push({ start: outside.innerStart, end: outside.innerEnd, value: `\n${automaticBody}\n` });
    if (!original.hasAutomatic && automaticChanged) throw Error('原楼层没有自动化分区');
    if (journeyChanged) {
      const journey = layout(text).journey;
      if (!journey) throw Error('原楼层没有本周目经历标签');
      const lines = draft.journey.map(row => {
        if (/[\r\n|]/.test(row.key)) throw Error('经历字段名不能含换行或分隔符');
        const value = row.value.replace(/\r?\n/g, '  ').trim();
        return row.key ? `${row.key}|${value}` : value;
      }).filter(Boolean).join('\n');
      replacements.push({ start: journey.innerStart, end: journey.innerEnd, value: `\n${lines}\n` });
    }
    return replaceSpans(text, replacements);
  }
  function blocked(floor, latest) {
    if (floor.message_id !== latest.message_id) return '';
    for (const key of ['teamBattle', 'personalBattle']) {
      const battle = floor.data?.cryptLord?.[key];
      if (battle?.status === 'active' || key === 'teamBattle' && ['finished', 'ended'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' && battle.enemy?.npcKey && !battle.experienceClaimed)
        return '请先结束并结算当前战斗';
    }
    return '';
  }
  async function open(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && messageId !== undefined && (!Number.isInteger(messageId) || messageId < 0)) throw Error('剧情楼层编号无效');
    const reader = await contract.waitGlobalInitialized('cryptLord.nativeFloorSource', { timeoutMs: 10000 });
    const normalizer = modules['cryptLord.responseNormalizer'];
    const active = () => {
      check(guard, token);
      if (reader !== modules['cryptLord.nativeFloorSource'] || normalizer !== modules['cryptLord.responseNormalizer'])
        throw Error('剧情编辑来源或解析服务已变化');
      return true;
    };
    const source = await reader.read(active), rows = source.rows;
    check(guard, token);
    if (!Array.isArray(rows)) throw Error('原生楼层不可读取');
    await reader.assert(source, active);
    active();
    return publish(source, reader, messageId, token, modules['cryptLord.stateStore'], normalizer);
  }
  function publish(source, reader, messageId, token, store, normalizer) {
    const floor = clone(messageId == null ? source.rows.at(-1) : source.rows.find(row => row.message_id === messageId));
    if (!floor || floor.role !== 'assistant' || floor.is_hidden || !record(floor.data))
      throw Error('没有可编辑的可见真实 assistant 楼层；末楼不是回复时请显式选择历史楼层');
    const latest = clone(source.rows.at(-1));
    const reason = generating ? '生成期间不能编辑，请等待本回合结束' : blocked(floor, latest);
    const loaded = { messageId: floor.message_id, message: String(floor.message || ''), data: clone(floor.data),
      floor, latest, epoch: token, editable: !reason, reason, sections: sections(floor.message) };
    baselines.set(loaded, { value: clone(loaded), reader, source, store, normalizer });
    return loaded;
  }
  function authorize(baseline) {
    const proof = baseline && baselines.get(baseline);
    if (!proof || !same(proof.value, baseline)) throw Error('剧情编辑凭据无效或已修改，请重新读取');
    return proof;
  }
  function identity(proof, guard, token) {
    check(guard, token);
    if (generating || proof.store !== modules['cryptLord.stateStore'] || proof.store?.status?.().ready === false ||
      proof.reader !== modules['cryptLord.nativeFloorSource'] ||
      proof.normalizer !== modules['cryptLord.responseNormalizer']) throw Error('剧情编辑保存或解析服务、生成状态已变化');
    return proof.reader.assertIdentity(proof.source, guard);
  }
  async function verify(expected, proof, guard, token) {
    identity(proof, guard, token);
    if (!expected?.floor || expected.epoch !== token) throw Error('剧情编辑来源已失效');
    if (!expected.editable) throw Error(expected.reason || '当前楼层只读');
    const current = await proof.reader.read(() => identity(proof, guard, token));
    identity(proof, guard, token);
    if (proof.reader.signature(current) !== proof.reader.signature(proof.source))
      throw Object.assign(Error('剧情编辑楼层正文、变量、消息页或末楼已变化，请重新读取'), { conflict: true });
  }
  function enqueue(run) { const task = queue.then(run); queue = task.catch(() => {}); return task; }
  function recovery({ valid, verify, write, inspect, prefix }) {
    let phase = 'pending', busy = false, attempted = false, result, failure;
    const assertValid = () => {
      try { return valid(); } catch (error) { phase = 'conflict'; throw error; }
    };
    const confirm = async () => {
      assertValid();
      let actual;
      try { actual = await inspect(); }
      catch (error) {
        assertValid();
        phase = error.conflict ? 'conflict' : 'uncertain';
        throw Error(`${prefix}状态待核对，未重复提交：${error.message || error}`);
      }
      assertValid();
      if (actual.saved) {
        phase = 'saved'; result = { ...actual.result, recovered: Boolean(failure) };
        return result;
      }
      if (actual.unchanged) {
        phase = 'pending';
        throw Error(`${failure?.message || prefix + '尚未保存'}；已核对完全未写入，本次结果已保留，可重试保存。`);
      }
      phase = 'conflict';
      throw Error(`${prefix}实际结果与原始及预期均不一致，正文、变量、消息页或世界书条目已变化；未覆盖，请重新读取核对`);
    };
    const run = action => {
      if (busy) return Promise.reject(Error('操作正在进行，来源可能变化，不能重复保存或核对'));
      busy = true;
      return enqueue(action).finally(() => { busy = false; });
    };
    return Object.freeze({
      status: () => ({ phase, busy }),
      save: () => run(async () => {
        assertValid();
        if (phase === 'saved') return { ...result, recovered: true };
        if (phase !== 'pending') throw Error('当前不能重试保存，请先核对保存或重新读取');
        attempted = false; failure = null; phase = 'saving';
        try {
          await verify(); assertValid();
          const unchanged = await write(() => { assertValid(); attempted = true; phase = 'uncertain'; });
          if (!attempted) {
            if (!unchanged) throw Error('宿主未执行保存回调，本次结果已保留，可重试保存');
            phase = 'saved'; result = unchanged; return result;
          }
        } catch (error) {
          assertValid();
          if (!attempted) { phase = error.conflict ? 'conflict' : 'pending'; throw error; }
          failure = error;
        }
        return confirm();
      }),
      inspect: () => run(async () => {
        assertValid();
        if (phase === 'saved') return { ...result, recovered: true };
        if (phase !== 'uncertain') throw Error('当前无需核对保存');
        return confirm();
      }),
    });
  }
  function begin(baseline, message, guard) {
    const proof = authorize(baseline), expected = clone(proof.value), text = String(message ?? ''), token = expected.epoch;
    if (!text.trim()) throw Error('正文不能为空');
    const previous = proof.operation;
    if (previous && previous.text !== text) {
      const status = previous.transaction.status();
      if (status.busy || status.phase !== 'pending' && !previous.unchanged)
        throw Error('正文保存结果已固定或来源已变化，请先核对保存或重新读取');
    }
    if (!previous || previous.text !== text) {
      const issued = { text, guards: new Set(), unchanged: text === expected.message };
      const active = () => (!issued.guards.size || [...issued.guards].every(validate => validate())) && proof.operation === issued;
      const valid = () => identity(proof, active, token);
      const written = clone(proof.source), page = written.swipes.find(row => row.message_id === expected.messageId);
      written.rows.find(row => row.message_id === expected.messageId).message = text; page.swipes[page.swipe_id] = text;
      issued.transaction = recovery({
        valid, verify: () => verify(expected, proof, active, token), prefix: '正文保存',
        async write(submit) {
          if (issued.unchanged) return { loaded: baseline, unchanged: true };
          const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
          valid();
          if (store !== proof.store) throw Error('剧情编辑保存服务已变化');
          await store.writeAssistantMessage(expected.messageId, text, expected.floor.data, {
            nativeTarget: true, preserveData: true, beforeWrite: () => verify(expected, proof, active, token), guard: valid,
            async onWriteAttempt(data) {
              await verify(expected, proof, active, token);
              if (!same(data, expected.floor.data)) throw Object.assign(Error('正文保存不能改变原生变量'), { conflict: true });
              submit();
            },
          });
        },
        async inspect() {
          const current = await proof.reader.read(valid);
          await proof.reader.assert(current, valid); valid();
          if (proof.reader.signature(current) === proof.reader.signature(written))
            return { saved: true, result: { loaded: publish(current, proof.reader, expected.messageId, token, proof.store, proof.normalizer) } };
          return { unchanged: proof.reader.signature(current) === proof.reader.signature(proof.source) };
        },
      });
      proof.operation = issued;
    }
    if (guard) proof.operation.guards.add(guard);
    return proof.operation.transaction;
  }
  async function commit(baseline, message, guard) {
    const transaction = begin(baseline, message, guard);
    try { return { ...await transaction.save(), transaction }; }
    catch (error) {
      if (transaction.status().phase === 'uncertain')
        return { loaded: null, transaction, warning: `正文保存状态待核对：${error.message || error}` };
      throw error;
    }
  }
  async function save(messageId, message, data, options = {}) {
    if (!record(data)) throw TypeError('楼层 data 必须是对象');
    if (!options.baseline) throw Error('正文保存必须携带打开时的楼层修订，请重新读取');
    if (messageId !== options.baseline.messageId || !same(data, options.baseline.data))
      throw Error('正文编辑不能覆盖变量，请使用变量工作台');
    return commit(options.baseline, message, options.guard);
  }
  function select(entries, name) {
    if (!Array.isArray(entries)) throw Error('经历世界书不可读取');
    const list = entries.filter(row => (row.name ?? row.comment) === name);
    if (list.length > 1) throw Error('本周目经历条目重名');
    const target = list[0] || null;
    if (target && (!Number.isSafeInteger(target.uid) || target.uid < 0 || typeof target.content !== 'string' ||
      entries.filter(row => row.uid === target.uid).length !== 1))
      throw Error('本周目经历条目 UID 缺失或重复');
    return clone(target);
  }
  async function journeyApi() { return contract.waitGlobalInitialized('cryptLord.journeyReader', { timeoutMs: 10000 }); }
  function validateJourney(text, events) {
    if (!String(text).trim()) return;
    const aliases = { 标题: '大纲', 人物: '在场人物', 描述: '详细描述', 人物关系: '核心侧写',
      标签: '事件标签', 重要信息: '核心锚点', 暗线与伏笔: '核心锚点' };
    const keys = new Set(['日期', '时间', '大纲', '地点', '在场人物', '详细描述', '核心侧写', '事件标签', '核心锚点']);
    const blocks = String(text).trim().split(/\n*\s*序号\|/);
    if (blocks.shift()?.trim() || blocks.length !== events.length) throw Error('经历内容损坏，存在无法解析的片段，未覆盖');
    for (const block of blocks) {
      let current = false;
      const seen = new Set();
      for (const row of journeyRows(block).slice(1)) {
        const key = Object.hasOwn(aliases, row.key.trim()) ? aliases[row.key.trim()] : row.key.trim();
        if (keys.has(key)) {
          if (seen.has(key)) throw Error('经历内容损坏，字段重复，未覆盖');
          seen.add(key); current = true;
        } else if (!current) throw Error('经历内容损坏，存在无法解析的片段，未覆盖');
      }
    }
  }
  async function mergeJourney(previous, incoming) {
    const api = await journeyApi(), existing = api.parse(previous), added = api.parse(incoming);
    if (!added.length || new Set(added.map(row => row.序号)).size !== added.length) throw Error('经历缺少有效序号或序号重复');
    if (String(previous).trim() && !existing.length || new Set(existing.map(row => row.序号)).size !== existing.length)
      throw Error('世界书经历内容损坏或序号重复，未覆盖');
    validateJourney(previous, existing); validateJourney(incoming, added);
    for (const row of added) {
      const index = existing.findIndex(item => item.序号 === row.序号);
      if (index < 0) existing.push(row); else existing[index] = row;
    }
    existing.sort((a, b) => (parseInt(a.序号, 10) || 0) - (parseInt(b.序号, 10) || 0));
    return { content: existing.map(row => api.stringify(row)).join('\n\n'), serials: added.map(row => row.序号) };
  }
  async function prepareSync(baseline, index = 1, guard) {
    const proof = authorize(baseline), expected = clone(proof.value), token = epoch;
    const parser = modules['cryptLord.journeyReader'];
    if (!Number.isSafeInteger(index) || index < 1) throw Error('经历条目索引必须为正整数');
    await verify(expected, proof, guard, token);
    const archive = modules['cryptLord.storyArchive'];
    if (archive) {
      const prepared = await archive.prepare(expected.floor, ['journey'], guard, { index });
      await verify(expected, proof, guard, token);
      if (parser !== modules['cryptLord.journeyReader']) throw Error('经历解析服务已变化');
      const row = prepared.rows[0];
      const ticket = { expected, token, name: row.name, book: prepared.book, content: row.content, serials: row.serials };
      tickets.set(ticket, { value: clone(ticket), proof, parser }); delegated.set(ticket, { prepared, archive });
      return ticket;
    }
    const span = layout(expected.message).journey;
    if (!span?.closed) throw Error('当前楼层没有完整的本周目经历');
    const host = await hostApi(), name = index > 1 ? `本周目经历(${index})` : '本周目经历';
    const entries = clone(await host.getWorldbook(BOOK)), target = select(entries, name), input = content(expected.message, span);
    const merged = await mergeJourney(target?.content || '', input);
    await verify(expected, proof, guard, token);
    if (parser !== modules['cryptLord.journeyReader']) throw Error('经历解析服务已变化');
    const proposed = target ? entries.map(row => row.uid === target.uid ? { ...row, content: merged.content } : row) :
      [...entries, newEntry(entries, name, merged.content)];
    const ticket = { expected, token, target, name, input, ...merged };
    tickets.set(ticket, { value: clone(ticket), proof, entries, proposed, parser });
    return ticket;
  }
  function newEntry(entries, name, text) {
    const uid = Math.max(0, ...entries.map(row => Number.isSafeInteger(row.uid) ? row.uid : 0)) + 1;
    if (!Number.isSafeInteger(uid)) throw Error('经历世界书UID空间无效');
    return { uid,
      name, content: text, enabled: false,
      strategy: { type: 'selective', keys: [name], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 }, probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null } };
  }
  function beginSync(ticket, guard) {
    const issued = ticket && typeof ticket === 'object' ? tickets.get(ticket) : null;
    if (!issued || !same(issued.value, ticket)) throw Error('经历同步凭据无效或已修改，请重新准备');
    issued.guards ||= new Set(); if (guard) issued.guards.add(guard);
    if (issued.transaction) return issued.transaction;
    const shared = delegated.get(ticket);
    const input = clone(issued.value), proof = issued.proof, token = input.token;
    const active = () => [...issued.guards].every(validate => validate());
    const valid = () => {
      identity(proof, active, token);
      if (modules['cryptLord.storyArchive'] !== shared?.archive || issued.parser !== modules['cryptLord.journeyReader'])
        throw Error('经历归档或解析服务已变化');
      return true;
    };
    if (shared) {
      const transaction = shared.archive.begin(shared.prepared, valid);
      const adapt = result => ({ ...result, name: input.name });
      issued.transaction = Object.freeze({ status: transaction.status,
        async save() { valid(); return adapt(await transaction.save()); },
        async inspect() { valid(); return adapt(await transaction.inspect()); } });
      return issued.transaction;
    }
    let host;
    const verifySource = () => verify(input.expected, proof, valid, token);
    issued.transaction = recovery({
      valid, prefix: '经历同步',
      async verify() {
        await verifySource(); host = await hostApi(); valid();
        const entries = await host.getWorldbook(BOOK); valid();
        if (!same(entries, issued.entries))
          throw Object.assign(Error('经历世界书条目已变化，请重新读取'), { conflict: true });
      },
      async write(submit) {
        if (same(issued.entries, issued.proposed)) return { unchanged: true, name: input.name };
        await host.updateWorldbookWith(BOOK, async entries => {
          valid();
          if (!same(entries, issued.entries)) throw Object.assign(Error('经历世界书条目已变化，未覆盖'), { conflict: true });
          await verifySource();
          const fresh = await host.getWorldbook(BOOK); valid();
          if (!same(fresh, entries)) throw Object.assign(Error('经历世界书条目已变化，未覆盖异步期间的外部修改'), { conflict: true });
          submit(); return clone(issued.proposed);
        }, { render: 'debounced' });
      },
      async inspect() {
        await verifySource(); valid();
        const entries = await host.getWorldbook(BOOK);
        const fresh = await host.getWorldbook(BOOK); valid();
        if (!same(entries, fresh)) throw Error('核对期间经历世界书已变化');
        return same(entries, issued.proposed) ? { saved: true, result: { name: input.name } } :
          { unchanged: same(entries, issued.entries) };
      },
    });
    return issued.transaction;
  }
  async function syncJourney(ticket, guard) {
    const transaction = beginSync(ticket, guard);
    try { return { ...await transaction.save(), transaction }; }
    catch (error) {
      if (transaction.status().phase === 'uncertain')
        return { name: tickets.get(ticket).value.name, transaction, warning: `经历同步状态待核对：${error.message || error}` };
      throw error;
    }
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  for (const [name, callback] of [
    ['CHAT_CHANGED', () => { epoch++; generating = false; }],
    ['GENERATION_STARTED', (type, options, dryRun) => {
      if (dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.dryRun ||
        options?.options?.quiet_prompt || options?.options?.dryRun) return;
      epoch++; generating = true;
    }],
    ['GENERATION_ENDED', () => { if (generating) { epoch++; generating = false; } }],
    ['GENERATION_STOPPED', () => { if (generating) { epoch++; generating = false; } }],
  ]) if (events[name]) subscriptions.push(after.bindEvent(events[name], callback));
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, target: 'native-assistant-floor' }),
    sections, compose, journeyRows, open, begin, commit, save, prepareSync, beginSync, syncJourney, mergeJourney,
    dispose() { disposed = true; epoch++; subscriptions.forEach(item => item.stop()); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true; } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
