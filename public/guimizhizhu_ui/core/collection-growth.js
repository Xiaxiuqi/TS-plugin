(() => {
  'use strict';
  const KEY = 'cryptLord.collectionGrowth', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  if (!contract || !modules?.['cryptLord.afterNativeHost']) throw Error('变量增殖提醒宿主尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const targets = Object.freeze(['其他列表', '消耗品列表', '人物关系列表', 'npc_data', '_unknown']);
  const attributes = ['活力', '灵性', '理智', '人性', '敏捷', '运气', '当前活力', '当前灵性', '当前理智', '当前人性', '当前敏捷'];
  // Original _statDataBase, _NpcObjectiveBase and worldDataSchema shape keys.
  const known = Object.freeze({
    stat_data: Object.freeze([...new Set(['$meta', '名称', '性别', '当前序列', '晋升体系', '能力体系', '神性', '消化进度',
      '失控进度', '当前状态', 'initialized', '_lastSequence', '_lastDigestion', '$战斗经验', '$战斗经验等级',
      '$神话形态上次使用时间', '非凡特性列表', '扮演法列表', '辅助能力列表', '武器列表', '衣物列表', '饰品列表',
      '封印物列表', '人物关系列表', '消耗品列表', '其他列表', '货币', '稳定长期收入', '稳定长期支出',
      '序列能力列表', '当前周目', '当前区域', '当前地标', '当前坐标', '灵性聚合度', '灵魂年龄', '灵魂年龄上限',
      '身体年龄', '身体年龄上限', '剧场点数', '<User>接受的任务', '阵营', '生产力', '产业', '领地', '势力', ...attributes])]),
    npc_data: Object.freeze(['名称', '身份', '性格', '外貌', '当前序列', '神性', '模板', '能力体系', '当前状态',
      'initialized', 'isImportant', '_lastSequence', '$战斗经验', '$战斗经验等级', '能力清单', '持有物品', '所处地点',
      '正在做的事', '行为链片段', '事件历史', '长期目标', '近期打算', '关键记忆', ...attributes]),
    world_data: Object.freeze(['当前时间纪元', '世界线状态', '_lastTimeEra', '_timeTriggerState', '日报与传闻', '随机D100']),
  });
  const labels = Object.freeze({ 其他列表: '其他列表', 消耗品列表: '消耗品列表', 人物关系列表: '人物关系列表',
    npc_data: 'NPC 数据', _unknown: '第三方变量' });
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const object = value => value !== null && typeof value === 'object';
  const canonical = value => Object.prototype.toString.call(value) === '[object Date]' ? ['Date', value.toISOString()] :
    Object.prototype.toString.call(value) === '[object RegExp]' ? ['RegExp', value.source, value.flags] :
    Array.isArray(value) ? value.map(canonical) : record(value) ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const revisions = new WeakMap(), notified = new Map(), lastSeen = new Map(), listeners = new Set(), subscriptions = [];
  let disposed = false, epoch = 0, scanning = 0, queue = Promise.resolve(), lastConfiguration = null;
  let generating = false, manualEpoch = 0;
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || epoch !== token || guard && !guard())
      throw new DOMException('变量增殖提醒操作已取消', 'AbortError');
  }
  function scope(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost();
    return { host, after, document: surface?.document, window: surface?.window, script: host.getScriptId(),
      chat: surface?.window?.SillyTavern?.getCurrentChatId?.() };
  }
  function assertScope(expected, guard, token) {
    check(guard, token);
    const current = scope(modules['cryptLord.hostApi']);
    if (Object.keys(expected).some(key => expected[key] !== current[key]))
      throw Error('提醒宿主、聊天或脚本身份已变化，请重新读取');
  }
  function enqueue(run) { const task = queue.then(run); queue = task.catch(() => {}); return task; }
  function count(value) { return Array.isArray(value) ? value.length : object(value) ? Object.keys(value).filter(key => key !== '$meta').length : 0; }
  function defaults() {
    return { version: 1, targets: Object.fromEntries(targets.map(key => [key, {
      threshold: ['人物关系列表', 'npc_data'].includes(key) ? 40 : 30, permanentlyMuted: false,
    }])) };
  }
  function normalize(raw) {
    const result = defaults();
    if (raw === undefined) return result;
    if (!record(raw) || raw.version !== 1 || !record(raw.targets)) throw Error('变量增殖提醒配置损坏');
    result.targets = { ...clone(raw.targets), ...result.targets };
    for (const key of targets) {
      const value = raw.targets[key] === undefined ? result.targets[key] : raw.targets[key];
      if (!record(value) || !Number.isSafeInteger(value.threshold) || value.threshold < 1 || value.threshold > 999 ||
        typeof value.permanentlyMuted !== 'boolean') throw Error(`「${labels[key]}」配置无效，阈值须为1至999的整数`);
      result.targets[key] = clone(value);
    }
    return { ...clone(raw), targets: result.targets };
  }
  function collections(data) {
    if (!record(data)) return [];
    const rows = [];
    for (const group of targets.slice(0, 4)) {
      const value = group === 'npc_data' ? data.npc_data : data.stat_data?.[group];
      if (object(value)) rows.push({ kind: 'named', group, id: JSON.stringify(['named', group]),
        path: group === 'npc_data' ? ['npc_data'] : ['stat_data', group], pathLabel: labels[group], count: count(value) });
    }
    const scan = (value, domain, path) => {
      if (!record(value)) return;
      for (const key of Object.keys(value)) if (key !== '$meta' && !known[domain].includes(key) && object(value[key])) {
        const full = [...path, key];
        rows.push({ kind: 'unknown', group: '_unknown', id: JSON.stringify(['unknown', ...full]),
          path: full, pathLabel: full.join('.'), count: count(value[key]) });
      }
    };
    scan(data.stat_data, 'stat_data', ['stat_data']); scan(data.world_data, 'world_data', ['world_data']);
    if (record(data.npc_data)) for (const key of Object.keys(data.npc_data)) if (key !== '$meta')
      scan(data.npc_data[key], 'npc_data', ['npc_data', key]);
    return rows;
  }
  function inspect(data, config = defaults()) {
    const settings = normalize(config);
    return collections(data).filter(row => !settings.targets[row.group].permanentlyMuted &&
      row.count > settings.targets[row.group].threshold).map(row => ({ ...row, threshold: settings.targets[row.group].threshold }));
  }
  async function settings(host, guard, token) {
    check(guard, token);
    const options = { type: 'script', script_id: host.getScriptId() }, variables = await host.getVariables(options);
    check(guard, token);
    if (!record(variables) || !options.script_id || options.script_id !== host.getScriptId()) throw Error('脚本配置身份不可确认');
    return { config: normalize(variables[KEY]), options, exists: Object.hasOwn(variables, KEY), raw: clone(variables[KEY]) };
  }
  async function load(guard, token = epoch) {
    check(guard, token);
    const host = await hostApi(), identity = scope(host), reader = modules['cryptLord.nativeFloorSource'];
    const before = await reader.read(guard), config = await settings(host, guard, token);
    await reader.assert(before, guard);
    if (!same(config, await settings(host, guard, token)))
      throw Error('读取期间楼层、消息页或配置已变化，请重新读取');
    await reader.assert(before, guard);
    assertScope(identity, guard, token);
    if (lastConfiguration) resetGroups(targets.filter(key => !same(lastConfiguration.targets[key], config.config.targets[key])));
    lastConfiguration = clone(config.config);
    const latest = before.rows.at(-1), floor = latest?.role === 'assistant' && !latest.is_hidden ? latest : null;
    const rows = collections(floor?.data), alerts = inspect(floor?.data, config.config).filter(row => !notified.has(row.id));
    const result = { config: clone(config.config), floor: clone(floor), collections: clone(rows), alerts: clone(alerts),
      reason: floor ? '' : latest?.is_hidden ? '末楼已隐藏，暂不提示变量' : '末楼不是 assistant，暂不提示旧楼层的变量' };
    revisions.set(result, { config: clone(config), source: before, reader, alerts: clone(alerts), token,
      scope: identity, manual: manualEpoch });
    return result;
  }
  function resetGroups(groups) {
    for (const [id, group] of notified) if (groups.includes(group)) notified.delete(id);
    for (const [id, row] of lastSeen) if (groups.includes(row.group)) lastSeen.delete(id);
  }
  async function writeConfig(expected, next, guard, token, beforeWrite, identity, submitted) {
    assertScope(identity, guard, token);
    const host = await hostApi(), fresh = await settings(host, guard, token);
    if (!same(fresh, expected)) throw Error('变量增殖提醒配置已变化，请重新读取');
    await beforeWrite?.(host); check(guard, token);
    if (same(next, expected.config)) return false;
    let returned = false, failure;
    try { await host.updateVariablesWith(async variables => {
      assertScope(identity, guard, token);
      if (host.getScriptId() !== expected.options.script_id || Object.hasOwn(variables, KEY) !== expected.exists ||
        !same(variables[KEY], expected.raw)) throw Error('变量增殖提醒配置已变化，未覆盖');
      await beforeWrite?.(host); check(guard, token);
      if (host.getScriptId() !== expected.options.script_id ||
        !same(variables, await host.getVariables(expected.options))) throw Error('等待期间脚本变量已变化，未覆盖');
      await beforeWrite?.(host);
      assertScope(identity, guard, token);
      if (!same(variables, await host.getVariables(expected.options)))
        throw Error('等待期间脚本变量已变化，未覆盖');
      assertScope(identity, guard, token);
      returned = true;
      submitted();
      return { ...variables, [KEY]: clone(next) };
    }, expected.options); } catch (error) { if (!returned) throw error; failure = error; }
    try {
      assertScope(identity, null, token);
      const after = await settings(host, null, token);
      if (same(after.config, next)) return failure ?
        { warning: `提醒配置已保存，宿主响应丢失后已确认：${failure.message}` } : true;
      if (failure && same(after, expected)) { returned = false; throw failure; }
      return { uncertain: true, warning: '提醒配置已提交，但持久化配置不一致，请重新读取' };
    } catch (error) {
      if (!returned) throw error;
      return { uncertain: true, warning: `${failure ? '提醒配置已提交，结果尚不能确认' :
        '提醒配置已保存，但复核失败'}：${error.message}` };
    }
  }
  async function resultAfterSave(next, guard, token, saved, identity) {
    if (saved?.uncertain) return { loaded: null, warning: saved.warning };
    try {
      assertScope(identity, guard, token);
      const loaded = await load(guard, token);
      if (!same(loaded.config, next)) throw Error('提交后的配置不一致');
      return { loaded, unchanged: !saved, ...(saved?.warning ? { warning: saved.warning } : {}) };
    } catch (error) {
      if (!saved) throw error;
      return { loaded: null, warning: `提醒配置已保存，但复核失败：${error.message || error}` };
    }
  }
  function beginConfig(baseline, input, guard, resume = []) {
    const issued = revisions.get(baseline);
    if (!issued || issued.pendingTransaction) throw Error('提醒配置来源无效，请重新读取或核对原保存结果');
    const desired = normalize(clone(input));
    if (!Array.isArray(resume) || resume.some(group => !targets.includes(group))) throw Error('恢复提醒目标无效');
    const expected = clone(issued.config), resumed = [...resume];
    const next = { ...clone(expected.config), targets: clone(expected.config.targets) };
    targets.forEach(key => {
      next.targets[key] = { ...next.targets[key], threshold: desired.targets[key].threshold,
        permanentlyMuted: desired.targets[key].permanentlyMuted };
    });
    return transaction(baseline, issued, next, guard, false, () => {
      const changed = targets.filter(key => !same(next.targets[key], expected.config.targets[key]));
      resetGroups([...changed, ...resumed]);
    });
  }
  function beginAcknowledgement(baseline, mute = [], guard) {
    const issued = revisions.get(baseline);
    if (!issued || issued.pendingTransaction) throw Error('提醒来源无效，请重新读取或核对原保存结果');
    if (!Array.isArray(mute)) throw Error('静音目标无效');
    const input = issued, groups = [...mute];
    if (groups.some(group => !input.alerts.some(row => row.group === group)))
      throw Error('静音目标不属于当前提醒');
    const next = clone(input.config.config);
    groups.forEach(group => { next.targets[group].permanentlyMuted = true; });
    return transaction(baseline, issued, next, guard, true, () => {
      input.alerts.forEach(row => { notified.set(row.id, row.group); lastSeen.set(row.id, { count: row.count, group: row.group }); });
    });
  }
  function transaction(baseline, issued, next, guard, acknowledgement, finalize) {
    let phase = 'pending', running = false, result, attempted = false;
    const valid = () => !generating && issued.manual === manualEpoch && (!guard || guard());
    const verify = async () => {
      assertScope(issued.scope, valid, issued.token);
      if (revisions.get(baseline) !== issued) throw Error('提醒来源无效，请重新读取');
      if (issued.pendingTransaction && issued.pendingTransaction !== operation) throw Error('提醒来源已有待核对保存');
      if (issued.reader !== modules['cryptLord.nativeFloorSource']) throw Error('提醒来源服务已变化');
      if (acknowledgement) await issued.reader.assert(issued.source, valid);
      assertScope(issued.scope, valid, issued.token);
    };
    const confirmed = async saved => {
      await verify();
      finalize();
      if (saved || acknowledgement) revisions.delete(baseline);
      delete issued.pendingTransaction; phase = 'saved';
      try { result = await resultAfterSave(next, guard, issued.token, saved, issued.scope); }
      catch (error) {
        result = { loaded: null, unchanged: !saved, warning:
          `${acknowledgement ? '提醒已确认' : '提醒状态已恢复，配置未变化'}，但重新读取失败：${error.message}` };
      }
      return result;
    };
    const inspectSaved = async () => {
      await verify();
      const host = issued.scope.host, current = await settings(host, valid, issued.token);
      if (!same(current, await settings(host, valid, issued.token))) throw Error('核对期间提醒配置已变化');
      await verify();
      if (same(current.config, next) && (same(next, issued.config.config) || current.exists && same(current.raw, next)))
        return confirmed({ warning: '提醒配置已保存，核对后已确认' });
      if (same(current, issued.config)) {
        phase = 'pending';
        return { loaded: null, warning: '确认尚未保存，可重试保存原配置', pending: true };
      }
      phase = 'conflict';
      throw Error('提醒配置与提交结果不符，请重新读取；未覆盖外部修改');
    };
    const run = action => {
      if (running) return Promise.reject(Error('提醒保存或核对正在进行'));
      if (phase === 'saved') return Promise.resolve(result);
      if (phase === 'conflict') return Promise.reject(Error('提醒来源已失效，请重新读取'));
      running = true;
      return enqueue(async () => {
        try { return await action(); }
        catch (error) {
          if (error.name === 'AbortError' || /变化|身份|来源|损坏|不符/.test(error.message)) phase = 'conflict';
          throw error;
        } finally { running = false; }
      });
    };
    const operation = Object.freeze({
      status: () => ({ phase, running, acknowledgement }),
      save: () => run(async () => {
        if (phase === 'uncertain') throw Error('保存状态待核对，请先核对保存，不能重复提交');
        await verify(); attempted = false;
        let saved;
        try {
          saved = await writeConfig(issued.config, next, valid, issued.token,
            acknowledgement ? verify : null, issued.scope, () => {
              attempted = true; phase = 'uncertain'; issued.pendingTransaction = operation;
            });
        } catch (error) {
          phase = 'pending';
          if (issued.pendingTransaction === operation) delete issued.pendingTransaction;
          throw error;
        }
        if (saved?.uncertain) {
          phase = 'uncertain';
          return { loaded: null, warning: saved.warning, pending: true };
        }
        try { return await confirmed(saved); }
        catch (error) {
          if (!attempted) throw error;
          phase = 'uncertain';
          return { loaded: null, warning: `提醒配置已保存，但复核失败：${error.message}`, pending: true };
        }
      }),
      inspect: () => run(inspectSaved),
    });
    return operation;
  }
  async function saveConfig(baseline, input, guard, resume = []) {
    const transaction = beginConfig(baseline, input, guard, resume);
    return { ...await transaction.save(), transaction };
  }
  async function acknowledge(baseline, mute = [], guard) {
    const transaction = beginAcknowledgement(baseline, mute, guard);
    return { ...await transaction.save(), transaction };
  }
  async function observe(messageId) {
    if (generating) return { skipped: true };
    const token = epoch, scan = ++scanning, guard = () => !disposed && token === epoch && scan === scanning;
    const loaded = await load(guard, token); check(guard, token);
    if (!loaded.floor || Number.isInteger(messageId) && loaded.floor.message_id !== messageId) return { skipped: true };
    loaded.collections.forEach(row => lastSeen.set(row.id, { count: row.count, group: row.group }));
    if (loaded.alerts.length) for (const callback of listeners) callback(loaded);
    return { loaded };
  }
  const after = modules['cryptLord.afterNativeHost'], events = after.tavernEvents() || {};
  const updated = () => { void observe().catch(error => {
    if (!disposed && error.name !== 'AbortError') console.warn(`[${KEY}] 变量提醒未更新，可重新读取`, error);
  }); };
  if (events.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
    epoch++; manualEpoch++; generating = false; scanning++; notified.clear(); lastSeen.clear(); lastConfiguration = null;
  }));
  if (events.GENERATION_STARTED) subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (dryRun || options?.dryRun || options?.params?.dryRun || ['quiet', 'quiet_prompt'].includes(type) ||
      options?.quiet_prompt || options?.params?.quiet_prompt) return;
    generating = true; manualEpoch++; scanning++;
  }));
  for (const name of [events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean))
    subscriptions.push(after.bindEvent(name, () => { if (!generating) return; generating = false; updated(); }));
  for (const name of new Set([events.MESSAGE_UPDATED, events.MESSAGE_DELETED, events.MESSAGE_SWIPED].filter(Boolean)))
    subscriptions.push(after.bindEvent(name, updated));
  const view = after.getHost()?.window || window;
  view.addEventListener?.('cryptLord:variables-updated', updated);
  const api = Object.freeze({ targets, labels, known, count, defaults, collections, inspect, load, saveConfig, acknowledge,
    beginConfig, beginAcknowledgement, observe,
    subscribe(callback) {
      if (disposed || typeof callback !== 'function') throw Error('变量提醒订阅无效');
      listeners.add(callback); return { stop: () => listeners.delete(callback) };
    },
    status: () => ({ ready: !disposed, epoch, acknowledged: notified.size }),
    dispose() {
      disposed = true; epoch++; scanning++; listeners.clear(); notified.clear(); lastSeen.clear(); lastConfiguration = null;
      subscriptions.forEach(item => item?.stop()); view.removeEventListener?.('cryptLord:variables-updated', updated);
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
