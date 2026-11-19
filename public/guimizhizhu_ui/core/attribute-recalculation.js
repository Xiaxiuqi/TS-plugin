(() => {
  'use strict';
  const KEY = 'cryptLord.attributeRecalculation', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('属性重算契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const STATS = Object.freeze(['活力', '灵性', '理智', '人性', '敏捷', '运气']);
  const LISTS = Object.freeze(['武器列表', '衣物列表', '饰品列表', '封印物列表', '扮演法列表', '辅助能力列表']);
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const numeric = value => ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value));
  const entries = value => value && typeof value === 'object' ? Object.entries(value).filter(([key]) => !RESERVED.has(key)) : [];
  const issued = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  function progress(stat) {
    const digestion = Number(stat?.消化进度) || 0, loss = Number(stat?.失控进度) || 0;
    const digestionBonus = digestion >= 81 && digestion <= 100 ? .1 : digestion >= 41 && digestion <= 80 ? .05 : 0;
    const lossPenalty = loss > 50 ? -.2 : loss >= 21 ? -.1 : 0;
    const level = Math.max(0, Math.floor(Number(stat?.$战斗经验等级) || 0));
    return { digestion, loss, digestionBonus, lossPenalty, level, multiplier: 1 + digestionBonus + lossPenalty,
      experienceMultiplier: 1 + level * .02 };
  }
  function details(stat = {}, pool) {
    const factors = progress(stat), bonuses = [], warnings = [];
    const add = (group, name, source) => {
      if (!source || typeof source !== 'object') return;
      const flat = {}, percent = {};
      for (const key of STATS) {
        const value = [source[`基础${key}加成`], source[`${key}加成`], source[`基础${key.replace('值', '')}加成`], source[key]]
          .find(raw => raw !== undefined && raw !== null);
        const sum = Number(value ?? 0) + Number(source.attributes_bonus?.[key] ?? 0);
        flat[key] = Number.isNaN(sum) ? 0 : sum;
        percent[key] = (Number.parseFloat(source.百分比加成?.全部属性) || 0) +
          (Number.parseFloat(source.百分比加成?.[key]) || 0);
      }
      bonuses.push({ group, name, flat, percent });
    };
    for (const list of LISTS) {
      if (stat[list] !== undefined && !record(stat[list]) && !Array.isArray(stat[list])) warnings.push(`${list}格式异常，未计入`);
      for (const [name, item] of entries(stat[list])) if (item?.isEquipped === true) add(list, name, item);
    }
    if (stat.非凡特性列表 !== undefined && !record(stat.非凡特性列表) && !Array.isArray(stat.非凡特性列表))
      warnings.push('非凡特性列表格式异常，未计入');
    for (const [name, item] of entries(stat.非凡特性列表)) add('非凡特性列表', name, item);
    const active = modules['cryptLord.mysteryAnalysis']?.activeBonus(stat, pool);
    if (active) add('神秘解析', '最终加成', { 百分比加成: active });
    const rows = STATS.map(key => {
      const base = Number(stat[`基础${key}`] ?? 0), validBase = numeric(stat[`基础${key}`]);
      const adjusted = Math.floor(base * factors.multiplier * factors.experienceMultiplier);
      const flat = bonuses.reduce((sum, item) => sum + item.flat[key], 0);
      const percent = bonuses.reduce((sum, item) => sum + item.percent[key], 0);
      const computed = Math.round(((adjusted || 0) + (flat || 0)) * (1 + (percent / 100 || 0)));
      const result = Number.isNaN(computed) ? adjusted || 0 : computed;
      if (!validBase) warnings.push(`${key}缺少有效基础值，保留楼层上限`);
      else if (!Number.isFinite(result)) warnings.push(`${key}计算结果无效，保留楼层上限`);
      return { key, base, validBase, adjusted, flat, percent, result, stored: stat[key], current: key === '运气' ? stat[key] : stat[`当前${key}`] };
    });
    return { factors, bonuses, rows, warnings, active };
  }
  function calculate(stat, pool) {
    return Object.fromEntries(details(stat, pool).rows.map(row => [row.key, row.result]));
  }
  function reconcileStat(stat, pool) {
    if (!record(stat)) return false;
    const report = details(stat, pool), prior = record(stat.$神秘解析上限同步) ? stat.$神秘解析上限同步 : {};
    const next = {}; let changed = false;
    for (const row of report.rows) {
      const { key } = row;
      // Old native floors without base fields keep their established mystery-only fallback.
      if (!row.validBase) {
        const current = Number(stat[key]), previous = prior[key];
        if (!numeric(stat[key]) || current < 0) continue;
        const baseline = record(previous) && current === previous.result ? previous.baseline : current;
        const result = report.active ? Math.round(baseline * (1 + Number.parseFloat(report.active[key]) / 100)) : baseline;
        if (!Number.isFinite(result)) continue;
        if (report.active) next[key] = { baseline, result };
        if ((report.active || record(previous)) && stat[key] !== result) { stat[key] = result; changed = true; }
        continue;
      }
      const result = row.result, oldMax = Number(stat[key]), currKey = `当前${key}`;
      if (!Number.isFinite(result)) continue;
      if (key !== '运气' && numeric(stat[key]) && oldMax !== result && stat[currKey] !== undefined) {
        const current = Number(stat[currKey] || 0);
        const nextCurrent = current + (result - oldMax);
        if (Number.isFinite(nextCurrent)) { stat[currKey] = nextCurrent; changed = true; }
      }
      if (stat[key] !== result) { stat[key] = result; changed = true; }
      if (key !== '运气' && numeric(stat[currKey]) && Number(stat[currKey]) > result) {
        stat[currKey] = result; changed = true;
      }
    }
    if (Object.keys(next).length) {
      if (!same(stat.$神秘解析上限同步, next)) { stat.$神秘解析上限同步 = next; changed = true; }
    } else if (Object.hasOwn(stat, '$神秘解析上限同步')) { delete stat.$神秘解析上限同步; changed = true; }
    return changed;
  }
  function busyBattle(data) {
    return ['teamBattle', 'personalBattle'].some(key => {
      const battle = data?.cryptLord?.[key];
      return battle?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' &&
          battle.enemy?.npcKey && !battle.experienceClaimed;
    });
  }
  function apply(data, pool) {
    return !busyBattle(data) && reconcileStat(data?.stat_data, pool);
  }
  function needsPool(data) {
    const stat = data?.stat_data;
    return Boolean(modules['cryptLord.mysteryAnalysisState'] &&
      (stat?.$专属玩法?.窥秘人途径?.神秘解析玩法 || stat?.$神秘解析上限同步 || stat?.辅助能力列表?.['#神秘解析']));
  }
  function check(guard, token) {
    if (disposed || token !== epoch || guard && !guard()) throw new DOMException('属性重算已取消', 'AbortError');
    if (generating) throw Error('正在生成，等待完整楼层');
  }
  async function snapshot(host, guard, token) {
    check(guard, token);
    const rows = structuredClone(await host.getChatMessages('0-{{lastMessageId}}')); check(guard, token);
    const pages = structuredClone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })); check(guard, token);
    if (!Array.isArray(rows) || !Array.isArray(pages) ||
      rows.some(row => !Number.isInteger(row.message_id) || row.message_id < 0) ||
      new Set(rows.map(row => row.message_id)).size !== rows.length) throw Error('原生楼层不可读取');
    return { rows: rows.sort((a, b) => a.message_id - b.message_id), pages };
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 }); check(guard, token);
    const first = await snapshot(host, guard, token), floors = first.rows.filter(row => row.role === 'assistant' && !row.is_hidden);
    const floor = messageId === null ? floors.at(-1) : floors.find(row => row.message_id === messageId);
    if (!floor || !record(floor.data?.stat_data)) throw Object.assign(Error('所选 assistant 楼层没有有效角色状态'), {
      floors: floors.map(row => ({ messageId: row.message_id, name: String(row.name || '') })),
    });
    const abilities = modules['cryptLord.abilityState'];
    check(guard, token);
    let draft = structuredClone(floor.data);
    const items = modules['cryptLord.itemDerivation'];
    const itemPrepared = items ? await items.prepare(draft, guard) : null; check(guard, token);
    if (itemPrepared) draft = itemPrepared.data;
    const growth = modules['cryptLord.playerProgression'];
    const progression = growth ? await growth.prepare(draft, floor.data.stat_data, guard) : null; check(guard, token);
    if (progression) draft = progression.data;
    const abilityPrepared = abilities?.prepare ? await abilities.prepare(draft, {
      previous: floor.data.stat_data, guard }) : null; check(guard, token);
    if (abilityPrepared) draft = structuredClone(abilityPrepared.data);
    const pool = abilityPrepared?.pool || (needsPool(floor.data) ? await abilities.loadPool() : undefined); check(guard, token);
    if (progression && !progression.skipped) {
      progression.data = draft;
      growth.finalize(progression, pool); draft = progression.data;
    }
    const report = details(draft.stat_data, pool);
    if (progression?.report) report.progression = progression.report;
    const battle = busyBattle(draft);
    if (!progression || progression.skipped) apply(draft, pool);
    const changed = !same(draft, floor.data);
    for (const row of report.rows) {
      row.stored = floor.data.stat_data[row.key];
      row.current = row.key === '运气' ? row.stored : floor.data.stat_data[`当前${row.key}`];
      row.next = draft.stat_data[row.key];
      row.nextCurrent = row.key === '运气' ? row.next : draft.stat_data[`当前${row.key}`];
    }
    if (!same(first, await snapshot(host, guard, token))) throw Error('楼层正文、变量或消息页已变化，请重新读取');
    const reason = first.rows.at(-1)?.message_id !== floor.message_id ? '历史楼层只读' : battle ? '请先结束并结算战斗' : '';
    const result = { floor, floors: floors.map(row => ({ messageId: row.message_id, name: String(row.name || '') })),
      report, changed, editable: !reason, reason };
    if (progression) await growth.assertPrepared(progression, guard); check(guard, token);
    if (itemPrepared) await items.assertPrepared(itemPrepared, guard); check(guard, token);
    if (abilityPrepared) await abilities.assertPrepared(abilityPrepared, guard); check(guard, token);
    if ((progression || itemPrepared) && !same(first, await snapshot(host, guard, token)))
      throw Error('成长或物品规则复核期间楼层已变化，请重新读取');
    issued.set(result, { snapshot: structuredClone(first), pool: structuredClone(pool),
      progression: growth?.signature(progression), items: items?.signature(itemPrepared),
      abilities: abilities?.signature?.(abilityPrepared), abilityPrepared, token, messageId: floor.message_id, draft });
    return result;
  }
  function commit(loaded, guard) {
    const baseline = issued.get(loaded);
    if (!baseline) return Promise.reject(Error('请先重新读取属性'));
    const task = queue.then(async () => {
      const { token, messageId } = baseline; check(guard, token);
      const fresh = await load(messageId, guard, token), revision = issued.get(fresh);
      const assertSource = async () => {
        check(guard, token);
        const latest = await load(messageId, guard, token), value = issued.get(latest);
        if (!latest.editable || !same(baseline.snapshot, value.snapshot) || !same(baseline.pool, value.pool) ||
          !same(baseline.progression, value.progression) || !same(baseline.items, value.items) ||
          !same(baseline.abilities, value.abilities))
          throw Error('楼层正文、变量、消息页或神秘解析数据库已变化，未写入');
      };
      if (!fresh.editable || !same(baseline.snapshot, revision.snapshot) || !same(baseline.pool, revision.pool) ||
        !same(baseline.progression, revision.progression) || !same(baseline.items, revision.items) ||
        !same(baseline.abilities, revision.abilities))
        throw Error(fresh.reason || '原生楼层来源已变化，未写入');
      if (!fresh.changed) return { loaded: fresh, unchanged: true };
      await assertSource();
      const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 }); check(guard, token);
      const saved = await store.writeAssistantData(messageId, revision.draft, 'affected', assertSource, () => {
        check(guard, token); return true;
      }, { skipNpcProgression: true, skipWorldSettlement: true, abilityPrepared: revision.abilityPrepared });
      issued.delete(loaded);
      try { return { data: saved, loaded: await load(messageId, guard, token) }; }
      catch (error) { return { data: saved, loaded: null, warning: `已保存，但复核失败：${error.message || error}` }; }
    });
    queue = task.catch(() => {}); return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (type !== 'quiet' && !dryRun && !options?.dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean))) bind(event, () => { generating = false; });
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, generating }), stats: STATS,
    progress, details, calculate, reconcileStat, busyBattle, needsPool, apply, load, commit,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
