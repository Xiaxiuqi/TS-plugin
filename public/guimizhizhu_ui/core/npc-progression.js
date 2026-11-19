(() => {
  'use strict';
  const KEY = 'cryptLord.npcProgression', root = window.cryptLord, contract = root?.contract;
  const modules = root?.__stage1Modules;
  if (!contract || !modules) throw Error('NPC成长契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const STATS = Object.freeze(['活力', '敏捷', '灵性', '理智', '人性', '运气']);
  const BASELINE = Object.freeze(['当前序列', '模板', '能力体系', '神性', '能力清单', ...STATS,
    '$id', '$创建时间', '$造物类型', '$成品位阶', '$强度档', '$结构配置', '$能力配置', '$能力点数']);
  const CONFIGS = { 序列基准: 'sequenceBase', NPC模板: 'npcTemplateConfig', 神性: 'divinityConfig',
    能力体系配置: 'abilitySystemConfig', 能力体系映射: 'abilitySystemDB' };
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const entries = value => record(value) ? Object.entries(value).filter(([key]) => !RESERVED.has(key)) : [];
  const math = () => modules['cryptLord.playerProgression'];
  const prepared = new WeakMap(), issued = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  const salt = Math.floor(Math.random() * 4294967296);
  function defaults() {
    return { ...math().defaults(), npcTemplateConfig: {
      multipliers: { 首领: 3, 头目: 2, 精英: 1.4, 普通: 1 },
      rankRules: [{ minRank: -2, maxRank: 2, minM: 3, maxM: 3, defaultName: '首领' },
        { minRank: 3, maxRank: 4, minM: 2, maxM: 3, defaultName: '头目' },
        { minRank: 5, maxRank: 7, minM: 1.4, maxM: 2, defaultName: '精英' }],
      defaultRule: { minM: 1, maxM: 1.4, defaultName: '普通' },
    } };
  }
  function validateRules(rules) {
    math().validateRules(rules);
    const config = rules.npcTemplateConfig;
    if (!record(config?.multipliers) || !Array.isArray(config.rankRules) || !record(config.defaultRule))
      throw Error('NPC模板数据库格式异常');
    for (const [, multiplier] of entries(config.multipliers))
      if (!Number.isFinite(multiplier) || multiplier <= 0) throw Error('NPC模板倍率无效');
    for (const row of [...config.rankRules, config.defaultRule]) {
      if (!record(row) || ![row.minM, row.maxM].every(Number.isFinite) || row.minM <= 0 ||
        row.maxM < row.minM || typeof row.defaultName !== 'string' ||
        !Object.hasOwn(config.multipliers, row.defaultName)) throw Error('NPC模板区间无效');
    }
    for (const row of config.rankRules)
      if (![row.minRank, row.maxRank].every(Number.isFinite) || row.minRank > row.maxRank) throw Error('NPC模板位阶区间无效');
    return rules;
  }
  function templateMultiplier(npc, rank, config) {
    const template = npc.模板 || '普通';
    let multiplier = 0;
    for (const [name, value] of entries(config.multipliers)) if (template.includes(name)) { multiplier = value; break; }
    const rule = config.rankRules.find(row => rank >= row.minRank && rank <= row.maxRank) || config.defaultRule;
    if (multiplier < rule.minM || multiplier > rule.maxM) { multiplier = rule.minM; npc.模板 = rule.defaultName; }
    return multiplier;
  }
  function fallbackAbility() {
    return { 名称: '攻击手段（由你根据攻击者的人设决定具体是什么手段）',
      描述: '符合角色人设的攻击手段（具体是什么，由角色人设决定）', 类型: '非凡能力', $系统兜底攻击: true,
      damageType: 'physical', targetType: 'single',
      power: { '-2': 185000, '-1': 111000, 0: 44400, '0.1': 33300, '0.3': 22200, '0.4': 20350,
        '0.5': 18500, '0.8': 14800, '0.9': 12950, 1: 11100, 2: 4440, 3: 1480, 4: 555, 5: 222,
        6: 92, 7: 37, 8: 17, 9: 11, default: 11 }, cost: { type: 'currentVitality', amount: 6 } };
  }
  function draw(available, rank, random = Math.random) {
    const pool = entries(available).flatMap(([sequence, abilities]) =>
      abilities.map(ability => ({ ...clone(ability), seqRank: math().rank(sequence),
        weight: 3 ** Math.max(0, 10 - math().rank(sequence)) })));
    if (!pool.length) return [fallbackAbility()];
    const count = Math.max(1, Math.min(pool.length, rank <= 0 ? 15 : rank >= 9 ? 5 : 15 - rank)), selected = [];
    for (let i = 0; i < count && pool.length; i++) {
      let remaining = random() * pool.reduce((sum, item) => sum + item.weight, 0), index = 0;
      for (let j = 0; j < pool.length; j++) { remaining -= pool[j].weight; if (remaining <= 0) { index = j; break; } }
      selected.push(pool.splice(index, 1)[0]);
    }
    return selected.sort((a, b) => a.seqRank - b.seqRank).map(({ seqRank: _rank, weight: _weight, ...ability }) => ability);
  }
  // A runtime seed keeps one initialization draw stable across preview, retries and the final write.
  function stableRandom(identity) {
    let seed = salt ^ epoch;
    for (const char of identity) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function settle(data, rules = defaults(), pool = { pathways: {}, abilities: {} }, previousNpc, randomFor) {
    validateRules(rules);
    const next = clone(data), reports = [];
    if (!record(next?.npc_data)) return { data: next, reports, skipped: true };
    for (const [name, npc] of entries(next.npc_data)) {
      if (!record(npc)) continue;
      const prior = record(previousNpc?.[name]) ? previousNpc[name] : npc;
      const autonomous = prior.$完全自主造物 === true || npc.$完全自主造物 === true;
      const initial = prior.initialized !== true || Boolean(prior._lastSequence) && prior._lastSequence !== (npc.当前序列 ?? '普通人');
      npc.当前序列 ??= '普通人'; npc.模板 ??= '普通'; npc.能力体系 ??= '';
      if (![npc.当前序列, npc.模板, npc.能力体系].every(value => typeof value === 'string'))
        throw Error(`NPC「${name}」序列、模板或能力体系格式异常`);
      const old = clone(npc);
      if (autonomous) {
        npc.$完全自主造物 = true;
        const engineering = prior.$完全自主造物 === true ? prior : npc;
        let baseline = clone(engineering.$造物机械基准);
        if (!record(baseline)) baseline = Object.fromEntries(BASELINE.filter(key => Object.hasOwn(engineering, key))
          .map(key => [key, clone(engineering[key])]));
        for (const key of BASELINE) if (Object.hasOwn(baseline, key)) npc[key] = clone(baseline[key]);
        npc.$造物机械基准 = baseline;
      }
      if ([npc.$战斗经验, npc.$战斗经验等级].some(value => value != null && !Number.isFinite(Number(value))))
        throw Error(`NPC「${name}」战斗经验无效`);
      const rank = math().rank(npc.当前序列), xp = modules['cryptLord.battleExperience'].settle(npc.$战斗经验, npc.$战斗经验等级, rank);
      const xpMultiplier = 1 + xp.level * .02;
      npc.$战斗经验 = xp.exp; npc.$战斗经验等级 = xp.level;
      let quota, multiplier;
      if (autonomous) {
        for (const key of STATS) {
          const base = Math.max(1, Number(npc.$造物机械基准[key]) || Number(npc[key]) || 1);
          if (!Number.isFinite(base)) throw Error(`NPC「${name}」工程基准${key}无效`);
          npc.$造物机械基准[key] = base; npc[key] = Math.max(1, Math.round(base * xpMultiplier));
        }
      } else {
        npc.神性 = rules.divinityConfig.find(row => rank >= row.min && rank <= row.max)?.val ?? 1;
        npc.能力体系 = math().abilitySystem(npc.当前序列, npc.能力体系, initial, rules);
        multiplier = templateMultiplier(npc, rank, rules.npcTemplateConfig);
        quota = Number(rules.sequenceBase[rank] || 200) * multiplier * xpMultiplier;
        if (!Number.isFinite(quota) || quota < 0 || quota > Number.MAX_SAFE_INTEGER) throw Error(`NPC「${name}」六维配额无效`);
        Object.assign(npc, math().allocate(quota, math().ratesFor(npc.能力体系, rules)));
        if (initial) {
          const available = modules['cryptLord.abilityState'].available(pool, npc.当前序列, false);
          npc.能力清单 = npc.当前序列 && !npc.当前序列.includes('无序列能力的测试用例')
            ? draw(available, rank, randomFor?.(name, npc, prior) || Math.random) : [];
        } else if (typeof npc.能力清单 === 'string') {
          npc.能力清单 = !npc.能力清单 || npc.能力清单 === '无' ? [] :
            npc.能力清单.split(/[、，]/).map(value => ({ 名称: value.trim(), 描述: '', 类型: '非凡能力' }));
        } else npc.能力清单 ??= [];
      }
      if (!Array.isArray(npc.能力清单) || npc.能力清单.some(ability => !record(ability) || typeof ability.名称 !== 'string'))
        throw Error(`NPC「${name}」能力清单格式异常`);
      for (const key of STATS) if (key !== '运气') {
        const current = `当前${key}`, value = Number(npc[current]);
        npc[current] = autonomous ? Number.isFinite(value) ? Math.max(0, Math.min(value, npc[key])) : npc[key]
          : initial || npc[current] == null || Number.isNaN(value) ? npc[key] : Math.min(value, npc[key]);
      }
      npc.initialized = true; npc._lastSequence = npc.当前序列;
      reports.push({ name, kind: autonomous ? '自主造物工程成长' : initial ? prior.initialized ? '序列变动初始化' : '首次初始化' : '日常成长',
        autonomous, sequence: npc.当前序列, template: npc.模板, system: npc.能力体系, divinity: npc.神性,
        quota, multiplier, xpMultiplier, experience: xp, initialized: initial && !autonomous,
        abilities: clone(npc.能力清单), beforeAbilities: clone(old.能力清单),
        rows: STATS.map(key => ({ key, stored: old[key], next: npc[key],
          current: key === '运气' ? undefined : old[`当前${key}`], nextCurrent: key === '运气' ? undefined : npc[`当前${key}`] })) });
    }
    return { data: next, reports };
  }
  function check(guard, token = epoch) {
    if (disposed || token !== epoch || guard && !guard()) throw new DOMException('NPC成长操作已取消', 'AbortError');
  }
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  async function source(host, guard, token) {
    const binding = clone(await host.getCharWorldbookNames('current')); check(guard, token);
    const primary = binding?.primary || '1源堡';
    const names = [...new Set(['【源堡】玩家自建内容', ...(binding?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary];
    const rules = defaults(), pool = { pathways: {}, abilities: {} }, books = [], selected = new Map();
    const parser = modules['cryptLord.abilityState'];
    for (const name of names) {
      let list;
      try { list = await host.getWorldbook(name); }
      catch (error) {
        check(guard, token);
        if (name !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error)))
          { books.push({ name, absent: true }); continue; }
        throw error;
      }
      check(guard, token);
      if (!Array.isArray(list)) throw Error(`世界书「${name}」不可读取`);
      const relevant = [];
      for (const entry of list) {
        const title = String(entry?.name || entry?.comment || '').trim();
        const kind = title.startsWith('[神之途径]') ? 'pathways' : title.startsWith('[序列能力]') ? 'abilities' : null;
        const key = Object.entries(CONFIGS).find(([label]) => title.includes(label))?.[1];
        if (!kind && !key) continue;
        relevant.push(clone(entry));
        if (kind) { selected.set(title, { entry, kind, name }); continue; }
        // Same as the original: skip unparseable or mis-shaped config entries.
        let parsed;
        try { parsed = parser.parseWorldbookJson(entry.content); } catch { continue; }
        if (key === 'divinityConfig') { if (Array.isArray(parsed)) rules[key].push(...parsed); }
        else if (record(parsed)) rules[key] = { ...rules[key], ...Object.fromEntries(entries(parsed)) };
      }
      books.push({ name, entries: relevant });
    }
    for (const { entry, kind, name } of selected.values()) {
      let parsed;
      try { parsed = parser.parseWorldbookJson(entry.content); }
      catch { throw Error(`世界书「${name}」的「${entry.name || entry.comment}」格式损坏`); }
      if (!record(parsed)) throw Error('NPC能力数据库须为字典');
      for (const [key, value] of entries(parsed)) {
        if (!Array.isArray(value) || kind === 'pathways' && value.some(item => typeof item !== 'string'))
          throw Error(`NPC能力数据库「${key}」须为列表`);
        const target = kind === 'abilities' ? key.replace(/\s+/g, '').replace(/序列0([0-9])/g, '序列$1') : key.trim();
        if (target && !RESERVED.has(target)) pool[kind][target] = clone(value);
      }
    }
    validateRules(rules); return { binding, books, rules, pool };
  }
  async function prepare(data, previousNpc, guard) {
    const token = epoch; check(guard, token);
    const input = clone(data), prior = clone(previousNpc);
    if (!entries(input?.npc_data).some(([, npc]) => record(npc)) || modules['cryptLord.attributeRecalculation']?.busyBattle(input)) {
      const result = { data: input, reports: [], skipped: true }; prepared.set(result, { token, prior }); return result;
    }
    const host = await hostApi(); check(guard, token);
    const revision = await source(host, guard, token);
    const result = settle(input, revision.rules, revision.pool, prior, (name, npc, old) =>
      stableRandom(JSON.stringify([name, npc.$id, npc.当前序列, old._lastSequence, revision.pool])));
    if (!same(revision, await source(host, guard, token))) throw Error('NPC成长数据库读取期间已变化');
    prepared.set(result, { token, source: clone(revision), prior }); return result;
  }
  async function assertPrepared(result, guard) {
    const ticket = prepared.get(result); if (!ticket) throw Error('NPC成长结算来源无效');
    check(guard, ticket.token); if (result.skipped) return;
    const host = await hostApi(); check(guard, ticket.token);
    if (!same(ticket.source, await source(host, guard, ticket.token))) throw Error('NPC成长数据库已变化，未写入');
    check(guard, ticket.token);
  }
  function adopt(data, prior, result) {
    const ticket = prepared.get(result);
    if (!ticket || !same(ticket.prior, prior) || !same(data.npc_data, result.data.npc_data))
      throw Error('NPC修正预览与保存来源不一致');
    return { data: clone(data), reports: result.reports, skipped: result.skipped, prepared: result };
  }
  async function snapshot(host, guard, token) {
    const rows = clone(await host.getChatMessages('0-{{lastMessageId}}')); check(guard, token);
    const pages = clone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })); check(guard, token);
    if (!Array.isArray(rows) || !Array.isArray(pages) || rows.some(row => !Number.isInteger(row.message_id) || row.message_id < 0) ||
      new Set(rows.map(row => row.message_id)).size !== rows.length) throw Error('原生楼层不可读取');
    return { rows: rows.sort((a, b) => a.message_id - b.message_id), pages };
  }
  async function dynamicSource(guard) {
    return modules['cryptLord.dynamicStatus'] ? modules['cryptLord.dynamicStatus'].load(guard) : null;
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token); if (generating) throw Error('正在生成，等待完整楼层');
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const host = await hostApi(); check(guard, token);
    const baseline = await snapshot(host, guard, token), floors = baseline.rows.filter(row => row.role === 'assistant' && !row.is_hidden);
    const floor = messageId === null ? floors.at(-1) : floors.find(row => row.message_id === messageId);
    if (!floor) throw Object.assign(Error('所选assistant楼层不存在'), {
      floors: floors.map(row => ({ messageId: row.message_id, name: String(row.name || '') })),
    });
    const result = await prepare(floor.data || {}, floor.data?.npc_data, guard); check(guard, token);
    const dynamic = result.skipped ? null : await dynamicSource(guard); check(guard, token);
    if (dynamic) {
      const work = { stat_data: {}, npc_data: clone(result.data.npc_data) };
      modules['cryptLord.dynamicStatus'].apply(work, dynamic.rules);
      for (const [name, npc] of entries(work.npc_data))
        if (record(result.data.npc_data[name]) && npc.当前状态 !== undefined)
          result.data.npc_data[name].当前状态 = clone(npc.当前状态);
    }
    await assertPrepared(result, guard); check(guard, token);
    if (!same(dynamic, result.skipped ? null : await dynamicSource(guard)) ||
      !same(baseline, await snapshot(host, guard, token))) throw Error('NPC预览来源已变化，请重新读取');
    const reason = floor.message_id === 0 ? '开场楼层只读' :
      baseline.rows.at(-1)?.message_id !== floor.message_id ? '历史楼层只读' :
        modules['cryptLord.attributeRecalculation']?.busyBattle(floor.data) ? '请先结束并结算战斗' : '';
    const loaded = { floor: clone(floor), floors: floors.map(row => ({ messageId: row.message_id, name: String(row.name || '') })),
      reports: result.reports, changed: !same(floor.data?.npc_data, result.data.npc_data), editable: !reason, reason };
    issued.set(loaded, { baseline, result, dynamic, token, draft: clone(result.data),
      floor: clone(floor), editable: !reason, reason, changed: loaded.changed }); return loaded;
  }
  function commit(loaded, guard) {
    const ticket = issued.get(loaded);
    if (!ticket) return Promise.reject(Error('请重新读取NPC成长'));
    const task = queue.then(async () => {
      const { token, baseline, result, dynamic, draft, floor } = ticket; check(guard, token);
      if (!ticket.editable) throw Error(ticket.reason || 'NPC楼层只读');
      const host = await hostApi(); check(guard, token);
      const assertSource = async () => {
        check(guard, token); if (generating) throw Error('正在生成，等待完整楼层');
        if (!same(baseline, await snapshot(host, guard, token)) || !same(dynamic, result.skipped ? null : await dynamicSource(guard)))
          throw Error('楼层正文、变量、消息页或动态规则已变化，未写入');
        await assertPrepared(result, guard); check(guard, token);
      };
      await assertSource();
      if (!ticket.changed) return { loaded, unchanged: true };
      const store = await contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 }); check(guard, token);
      const saved = await store.writeAssistantMessage(floor.message_id, floor.message, draft,
        { nativeTarget: true, npcOnly: true, npcPrepared: result, beforeWrite: assertSource, guard: () => { check(guard, token); return true; } });
      issued.delete(loaded);
      try { return { data: saved, loaded: await load(floor.message_id, guard, token) }; }
      catch (error) { return { data: saved, loaded: null, warning: `NPC修正已保存，但复核失败：${error.message || error}` }; }
    });
    queue = task.catch(() => {}); return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (name, fn) => { if (name) subscriptions.push(after.bindEvent(name, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (type !== 'quiet' && !dryRun && !options?.dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean))) bind(event, () => { generating = false; });
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, generating }), stats: STATS, baselineKeys: BASELINE,
    defaults, validateRules, templateMultiplier, fallbackAbility, draw, settle, prepare, assertPrepared, adopt, load, commit,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
