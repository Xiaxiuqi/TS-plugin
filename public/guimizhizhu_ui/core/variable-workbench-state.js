(() => {
  'use strict';
  const KEY = 'cryptLord.variableWorkbenchState';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  if (!contract) throw Error('变量编辑契约尚未加载');
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const DOMAINS = ['stat_data', 'npc_data', 'world_data'];
  const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const pointer = parts => parts.length ? `/${parts.map(key => String(key).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}` : '';
  const previews = new WeakMap(), baselines = new WeakMap();
  let queue = Promise.resolve(), epoch = 0, disposed = false, generating = false;
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw Error('变量编辑操作已取消');
    if (generating) throw Error('正在生成，请等待原生楼层完成');
  }
  function safeValue(value) {
    if (value === undefined || typeof value === 'number' && !Number.isFinite(value) ||
      typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') throw Error('变量值必须是有效 JSON 数据');
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (RESERVED.has(key)) throw Error('不能新增或修改保留键');
        safeValue(value[key]);
      }
    }
  }
  function at(source, parts) {
    let value = source;
    for (const key of parts) {
      if (RESERVED.has(String(key)) || !value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
      value = value[key];
    }
    return value;
  }
  function mutate(data, domain, parts, op, value) {
    if (!DOMAINS.includes(domain) || !Array.isArray(parts) || parts.some(key => RESERVED.has(String(key))) ||
      !['add', 'replace', 'remove'].includes(op)) throw Error('变量操作或路径无效');
    if (op !== 'remove') safeValue(value);
    const next = clone(data);
    if (!parts.length) {
      if (op === 'remove' || !record(value)) throw Error('变量域根节点必须是对象，不能删除');
      next[domain] = clone(value); return next;
    }
    if (next[domain] === undefined && op === 'add' && parts.length === 1) next[domain] = {};
    const parent = at(next[domain], parts.slice(0, -1)), key = String(parts.at(-1));
    if (!record(parent) && !Array.isArray(parent)) throw Error('变量路径的父节点不是对象或列表');
    if (Array.isArray(parent)) {
      const index = key === '-' && op === 'add' ? parent.length : Number(key);
      if (!/^(0|[1-9]\d*)$/.test(key) && !(key === '-' && op === 'add') ||
        !Number.isInteger(index) || index < 0 || index > parent.length ||
        op !== 'add' && index === parent.length) throw Error('列表下标无效');
      if (op === 'remove') parent.splice(index, 1);
      else if (op === 'add') parent.splice(index, 0, clone(value));
      else parent[index] = clone(value);
    } else {
      if (op !== 'add' && !Object.hasOwn(parent, key)) throw Error('目标变量不存在');
      if (op === 'remove') delete parent[key]; else parent[key] = clone(value);
    }
    return next;
  }
  function changes(before, after) {
    const grouped = Object.fromEntries(DOMAINS.map(domain => [domain, []]));
    function visit(domain, left, right, parts) {
      if (same(left, right)) return;
      if (record(left) && record(right)) {
        for (const key of Object.keys(left)) if (!Object.hasOwn(right, key))
          grouped[domain].push({ op: 'remove', path: pointer([...parts, key]) });
        for (const key of Object.keys(right)) {
          if (!Object.hasOwn(left, key)) grouped[domain].push({ op: 'add', path: pointer([...parts, key]), value: clone(right[key]) });
          else visit(domain, left[key], right[key], [...parts, key]);
        }
      } else {
        grouped[domain].push({ op: left === undefined ? 'add' : right === undefined ? 'remove' : 'replace',
          path: pointer(parts), ...(right === undefined ? {} : { value: clone(right) }) });
      }
    }
    for (const domain of DOMAINS) visit(domain, before?.[domain], after?.[domain], []);
    return grouped;
  }
  function parsePatch(text) {
    let source = String(text || '').trim();
    const tags = [...source.matchAll(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/gi)];
    if (tags.length) source = tags.at(-1)[1].trim();
    source = source.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let parsed;
    try { parsed = JSON.parse(source || '{}'); } catch { throw Error('补丁不是有效 JSON，旧草稿已保留'); }
    if (!record(parsed) && !Array.isArray(parsed)) throw Error('补丁必须是三域对象或指令数组');
    const entries = [];
    const collect = (domain, list) => {
      if (!Array.isArray(list)) throw Error(`${domain} 补丁必须是数组`);
      for (const command of list) {
        if (!record(command) || !['add', 'replace', 'remove'].includes(command.op) ||
          typeof command.path !== 'string' || command.path && !command.path.startsWith('/') ||
          /~(?![01])/g.test(command.path)) throw Error('补丁指令或 JSON Pointer 路径无效');
        let parts = command.path ? command.path.slice(1).split('/').map(key => key.replace(/~1/g, '/').replace(/~0/g, '~')) : [];
        let actual = domain;
        if (DOMAINS.includes(parts[0])) { actual = parts[0]; parts = parts.slice(1); }
        else if (domain === 'stat_data' && parts[0] === '当前时间纪元') actual = 'world_data';
        entries.push({ ...command, domain: actual, parts });
      }
    };
    if (Array.isArray(parsed)) collect('stat_data', parsed);
    else for (const domain of Object.keys(parsed)) {
      if (!DOMAINS.includes(domain)) throw Error('只能修改三个主变量域，不能写入快照或其他插件');
      collect(domain, parsed[domain]);
    }
    return entries;
  }
  function applyPatch(data, text) {
    let next = clone(data);
    const commands = parsePatch(text);
    for (const item of commands) next = mutate(next, item.domain, item.parts, item.op, item.value);
    return { data: next, applied: commands.length };
  }
  function recovered(floor) {
    const controls = modules['cryptLord.variablePatch'].controlText(floor?.message || '');
    const body = [...controls.matchAll(/<UpdateVariable\b[^>]*>([\s\S]*?)<\/UpdateVariable>/gi)].at(-1)?.[1];
    const raw = body || floor?.data?.cryptLord?.lastUpdateVariable;
    if (!raw) throw Error('当前楼层没有可恢复的变量提取');
    const commands = parsePatch(raw);
    const grouped = Object.fromEntries(DOMAINS.map(domain => [domain, []]));
    commands.forEach(item => grouped[item.domain].push({ op: item.op, path: pointer(item.parts),
      ...(item.op === 'remove' ? {} : { value: clone(item.value) }) }));
    return JSON.stringify(grouped, null, 2);
  }
  function reason(floor, latest) {
    if (latest?.role !== 'assistant' || floor.message_id !== latest.message_id) return '历史楼层或新回合只读';
    if (floor.is_hidden) return '隐藏楼层只读';
    for (const key of ['teamBattle', 'personalBattle']) {
      const battle = floor.data.cryptLord?.[key];
      if (battle?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' &&
        battle.enemy?.npcKey && !battle.experienceClaimed) return '请先结束并结算战斗';
    }
    return '';
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    const loaded = await settlement.readFloorSource({ messageId, guard: () => { check(guard, token); return true; } });
    check(guard, token);
    if (modules['cryptLord.variableSettlementApi'] !== settlement) throw Error('变量来源服务已变化，请重新读取');
    const floor = clone(loaded.floor), latest = clone(loaded.latest);
    const readOnly = reason(floor, latest);
    const result = { floor, latest, editable: !readOnly, reason: readOnly };
    baselines.set(result, { loaded, settlement, token, store: modules['cryptLord.stateStore'],
      host: modules['cryptLord.hostApi'], after, document: after?.getHost?.()?.document, public: clone(result) });
    return result;
  }
  function captureBaseline(baseline) {
    const expected = clone(baseline);
    baselines.set(expected, baselines.get(baseline));
    return expected;
  }
  function checkBaseline(expected, guard, token) {
    check(guard, token);
    const source = baselines.get(expected);
    if (!source || !same(expected, source.public)) throw Error('变量草稿来源凭据无效或已被修改，请重新读取');
    if (source.token !== token || modules['cryptLord.variableSettlementApi'] !== source.settlement ||
      modules['cryptLord.stateStore'] !== source.store || modules['cryptLord.hostApi'] !== source.host ||
      modules['cryptLord.afterNativeHost'] !== source.after || after?.getHost?.()?.document !== source.document)
      throw Error('变量草稿来源服务已变化，请重新读取');
    if (!expected?.editable) throw Error(expected?.reason || '当前楼层不可修改');
    return source;
  }
  async function verify(expected, guard, token) {
    const source = checkBaseline(expected, guard, token);
    await source.settlement.assertFloorSource(source.loaded, () => { check(guard, token); return true; });
    checkBaseline(expected, guard, token);
  }
  function workingData(expected, working) {
    const next = clone(expected.floor.data);
    for (const domain of DOMAINS) {
      if (working[domain] !== undefined && !record(working[domain])) throw Error(`${domain} 根节点必须是对象`);
      if (working[domain] === undefined) delete next[domain]; else next[domain] = clone(working[domain]);
    }
    for (const entries of Object.values(changes(expected.floor.data, next))) for (const command of entries) {
      if (command.path.split('/').some(key => RESERVED.has(key))) throw Error('不能修改保留键');
      if (command.op !== 'remove') safeValue(command.value);
    }
    return next;
  }
  async function prepareCommit(baseline, draft, guard, variablePrepared = null) {
    const expected = captureBaseline(baseline), working = clone(draft), token = epoch;
    const valid = () => { checkBaseline(expected, guard, token); return true; };
    await verify(expected, guard, token);
    if (variablePrepared) await modules['cryptLord.variableSettlementApi'].assertResult(variablePrepared, valid);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const page = clone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true }));
    const next = workingData(expected, working);
    const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
    const result = await store.previewAssistantData(next, expected.floor.data, valid), prepared = result.worldSettlement;
    await verify(expected, guard, token);
    if (!same(page, await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })))
      throw Error('联动预览来源消息页已变化，请重新读取');
    if (result.dynamicPrepared && result.dynamicService?.assertLoaded)
      await result.dynamicService.assertLoaded(result.dynamicPrepared, valid);
    if (variablePrepared) await modules['cryptLord.variableSettlementApi'].assertResult(variablePrepared, valid);
    const preview = { summary: clone(prepared?.summary || []),
      changes: changes(next, result.data) };
    previews.set(preview, { expected, working, prepared, abilityPrepared: result.abilityDerivation,
      dynamicPrepared: result.dynamicService?.assertLoaded ? result.dynamicPrepared : null,
      variablePrepared, public: clone(preview), page, token });
    return preview;
  }
  function commit(baseline, draft, guard, response = null, preview = null, variablePrepared = null) {
    const expected = captureBaseline(baseline), working = clone(draft), token = epoch;
    const source = preview ? previews.get(preview) : null;
    const task = queue.then(async () => {
      const valid = () => { checkBaseline(expected, guard, token); return true; };
      const beforeWrite = async () => {
        await verify(expected, guard, token);
        if (source) {
          const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
          if (!same(source.page, await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })))
            throw Error('联动预览来源消息页已变化，请重新读取');
          check(guard, token);
        }
      };
      await beforeWrite();
      if (preview && (!source || source.token !== token || !same(source.expected, expected) ||
        !same(source.working, working) || !same(source.public, preview)))
        throw Error('联动预览或草稿已变化，请重新准备');
      const next = workingData(expected, working), delta = changes(expected.floor.data, next);
      if (Object.values(delta).every(entries => !entries.length) && response === null)
        return { loaded: expected, data: next, unchanged: true };
      const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
      let saved;
      if (response !== null) {
        const patch = await contract.waitGlobalInitialized('cryptLord.variablePatch', { timeoutMs: 10000 });
        const tag = patch.updateTag(response);
        if (!tag) throw Error('重新结算未返回有效变量标签');
        next.cryptLord = { ...next.cryptLord, lastUpdateVariable: tag };
        const message = patch.embedUpdate(expected.floor.message, response);
        const inspector = modules['cryptLord.responseInspector'];
        if (inspector) {
          try {
            next.cryptLord.responseInspection = await inspector.captureVariable({
              messageId: expected.floor.message_id, message, response, purpose: 'variable-retry', guard,
            });
          } catch (error) {
            check(guard, token); delete next.cryptLord.responseInspection;
            console.warn(`[${KEY}] 变量思维链显示记录未保存，不影响变量保存`, error);
          }
        } else delete next.cryptLord.responseInspection;
        saved = await store.writeAssistantMessage(expected.floor.message_id, message,
          next, { beforeWrite, nativeTarget: true, guard: valid, variablePrepared });
      } else saved = await store.writeAssistantData(expected.floor.message_id, next, 'affected', beforeWrite, valid,
        { worldPrepared: source?.prepared, abilityPrepared: source?.abilityPrepared,
          dynamicPrepared: source?.dynamicPrepared, variablePrepared: source?.variablePrepared || variablePrepared });
      if (preview) previews.delete(preview);
      try {
        check(guard, token);
        return { loaded: await load(expected.floor.message_id, guard, token), data: saved };
      } catch {
        return { loaded: null, data: saved, warning: '变量已保存，但复核失败，请重新读取' };
      }
    });
    const checked = task.catch(async error => {
      try { await verify(expected, guard, token); error.requiresReload = false; }
      catch { error.requiresReload = true; }
      throw error;
    });
    queue = checked.catch(() => {});
    return checked;
  }
  async function repair(baseline, draft, instruction, raw, guard) {
    const expected = captureBaseline(baseline), working = clone(draft), token = epoch;
    const valid = () => { checkBaseline(expected, guard, token); return true; };
    await verify(expected, guard, token);
    const service = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    const result = await service.repair({ previousData: working, instruction, rawCommands: String(raw || ''), guard: valid,
      assertInput: () => verify(expected, guard, token) });
    await verify(expected, guard, token);
    return result;
  }
  async function retry(baseline, guard) {
    const expected = captureBaseline(baseline), token = epoch;
    const valid = () => { checkBaseline(expected, guard, token); return true; };
    await verify(expected, guard, token);
    const service = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    const result = await service.retryTurn({ messageId: expected.floor.message_id, guard: valid });
    await verify(expected, guard, token);
    return commit(expected, result.data, valid, result.response, null, service.assertResult ? result : null);
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {}, subscriptions = [];
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (type !== 'quiet' && type !== 'dryRun' && !dryRun && !options?.dryRun && !options?.quiet_prompt) { epoch++; generating = true; }
  });
  bind(events.GENERATION_ENDED, () => { generating = false; });
  bind(events.GENERATION_STOPPED, () => { generating = false; });
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed }), domains: DOMAINS, pointer, at, mutate, changes, applyPatch, recovered,
    load, prepareCommit, commit, repair, retry,
    dispose() { disposed = true; epoch++; subscriptions.forEach(subscription => subscription.stop()); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
