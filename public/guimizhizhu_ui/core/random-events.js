(() => {
  'use strict';
  const KEY = 'cryptLord.randomEvents';
  const PRIMARY = '1源堡';
  const LIBRARY = '2历史孔隙';
  const PREFIX = '【随机】';
  const PENDING = 'cryptLord.randomEventsPending';
  const LOCAL = 'cryptLord.randomEventsLocal';
  const SHADOW = 'cryptLordRandomEvent';
  const SHADOW_PREFIX = '【随机覆写】';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const nameOf = item => String(item?.name || item?.comment || '').trim();
  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  function parseEntry(content) {
    const source = String(content || '').replace(/^\uFEFF/, '');
    let cleaned = '';
    let quoted = false;
    let escaped = false;
    for (let index = 0; index < source.length; index++) {
      const char = source[index];
      const next = source[index + 1];
      if (quoted) {
        if (char === '\n' || char === '\r') cleaned += char === '\n' ? '\\n' : '\\r';
        else cleaned += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') {
        quoted = true;
        cleaned += char;
      } else if (char === '/' && next === '/') {
        while (index < source.length && source[index] !== '\n') index++;
        cleaned += '\n';
      } else if (char === '/' && next === '*') {
        index += 2;
        while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index++;
        if (index >= source.length) throw new Error('未闭合的 JSON 块注释');
        index++;
        cleaned += ' ';
      } else cleaned += char;
    }
    let strict = '';
    quoted = false;
    escaped = false;
    for (let index = 0; index < cleaned.length; index++) {
      const char = cleaned[index];
      if (quoted) {
        strict += char;
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') {
        quoted = true;
        strict += char;
      } else if (char === ',' && /^[\s]*[\]}]/.test(cleaned.slice(index + 1))) {
        continue;
      } else strict += char;
    }
    return JSON.parse(strict);
  }
  function chatId() {
    for (const owner of [window, window.parent, window.top]) {
      try {
        const id = owner?.SillyTavern?.getCurrentChatId?.();
        if (id != null && String(id).trim()) return String(id);
      } catch { /* Cross-origin host. */ }
    }
    throw new Error('当前聊天 ID 不可用，无法排队随机事件');
  }
  function normalize(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('随机事件条目不是对象');
    const name = String(entry.name || '').trim();
    if (!name) throw new Error('随机事件条目名称不能为空');
    const probability = Number(entry.触发率 ?? 0);
    const count = Number(entry.抽取数量 ?? 1);
    const order = Number(entry.order ?? 10);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error(`「${name}」触发率必须在 0 至 1 之间`);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error(`「${name}」抽取数量必须是正整数`);
    if (!Number.isSafeInteger(order)) throw new Error(`「${name}」排序必须是整数`);
    return {
      ...entry, name, isEnabled: entry.isEnabled === true, order,
      触发率: probability, 抽取数量: count, 输出指令: String(entry.输出指令 || ''),
      事件列表: (Array.isArray(entry.事件列表) ? entry.事件列表 : []).map(item => {
        if (!item || typeof item !== 'object') throw new Error(`「${name}」包含无效事件`);
        const weight = Number(item.weight ?? 0);
        if (!Number.isFinite(weight) || weight < 0) throw new Error(`「${name}」事件权重必须是非负数`);
        return { ...item, weight, type: String(item.type || ''), name: String(item.name || ''), description: String(item.description || '') };
      }),
    };
  }
  async function books(api) {
    const [library, primary] = await Promise.all([LIBRARY, PRIMARY].map(async book => {
      let entries;
      try { entries = await api.getWorldbook(book); }
      catch (error) {
        if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) return [];
        throw error;
      }
      if (!Array.isArray(entries)) throw new Error(`${book} 未返回条目列表`);
      return entries;
    }));
    return { library, primary };
  }
  function selected(entries) {
    const matches = entries.filter(item => nameOf(item).startsWith(PREFIX));
    const seen = new Set();
    for (const item of matches) {
      const name = nameOf(item);
      if (seen.has(name)) throw new Error(`随机事件世界书条目「${name}」重名，请先修复`);
      seen.add(name);
    }
    return matches;
  }
  function localState(api) {
    const options = api.scriptVariableOptions();
    const vars = api.getVariables(options) || {};
    const raw = vars[LOCAL];
    if (raw != null && (raw.version !== 1 || !Array.isArray(raw.hidden) || !Array.isArray(raw.overrides))) {
      throw new Error('本地随机事件配置格式无效，请检查脚本变量');
    }
    return { options, vars, raw, hidden: raw?.hidden || [], overrides: raw?.overrides || [], baselines: raw?.baselines || {} };
  }
  function baseEntries(library, primary) {
    const merged = new Map();
    selected(library).forEach(item => merged.set(nameOf(item), { item, book: LIBRARY }));
    selected(primary).forEach(item => merged.set(nameOf(item), { item, book: PRIMARY }));
    return [...merged].map(([comment, { item, book }]) => {
      let parsed;
      try { parsed = parseEntry(item.content); }
      catch { throw new Error(`随机事件条目「${comment}」不是有效 JSON`); }
      return {
        comment, book, uid: item.uid, revision: String(item.content || ''),
        entry: normalize(parsed),
      };
    });
  }
  function revisionOf(library, primary, raw) {
    const snapshot = entries => entries.filter(item => nameOf(item).startsWith(PREFIX) || item.extra?.[SHADOW])
      .map(item => JSON.stringify(item));
    return JSON.stringify({ library: snapshot(library), primary: snapshot(primary), local: raw ?? null });
  }
  function baselineKey(source) { return `${source.book}\0${source.comment}`; }
  function shadowName(owner, comment) { return `${SHADOW_PREFIX}${owner}·${comment}`; }
  function entryWithoutSwitch(entry) {
    const { isEnabled: _enabled, ...content } = entry;
    return JSON.stringify(content);
  }
  function desiredProjection(current, local, proposed) {
    const owner = String(local.options.script_id || '');
    if (!owner) throw new Error('当前脚本 ID 不可用，无法管理随机事件覆盖条目');
    const defaults = baseEntries(current.library, current.primary);
    const byComment = new Map(defaults.map(source => [source.comment, source]));
    const overrides = new Map(proposed.overrides.map(source => [source.comment, source.entry]));
    const hidden = new Set(proposed.hidden);
    const baselines = { ...local.baselines };
    const switches = { [PRIMARY]: new Map(), [LIBRARY]: new Map() };
    const shadows = new Map();
    for (const [comment, snapshot] of Object.entries(local.raw?.managed || {})) {
      const existing = current.primary.find(item => item.extra?.[SHADOW]?.owner === owner && item.extra[SHADOW].comment === comment);
      if (!existing || JSON.stringify(existing) !== snapshot) {
        throw new Error(`脚本覆盖条目「${comment}」已被外部修改，请检查世界书`);
      }
    }
    for (const source of defaults) {
      const edited = overrides.get(source.comment);
      const contentChanged = edited && entryWithoutSwitch(edited) !== entryWithoutSwitch(source.entry);
      for (const book of [PRIMARY, LIBRARY]) {
        const originals = selected(current[book === PRIMARY ? 'primary' : 'library'])
          .filter(item => nameOf(item) === source.comment);
        for (const original of originals) {
          const key = baselineKey({ book, comment: source.comment });
          const saved = baselines[key];
          if (saved && (saved.uid !== original.uid || saved.content !== String(original.content || ''))) {
            throw new Error(`原版条目「${source.comment}」已被外部修改，不能覆盖或恢复`);
          }
          if (saved && saved.managedEnabled !== undefined && saved.managedEnabled !== original.enabled) {
            throw new Error(`原版条目「${source.comment}」启用状态已被外部修改，请检查世界书`);
          }
          const targetEnabled = hidden.has(source.comment) || contentChanged ? false
            : edited && book === source.book ? edited.isEnabled
              : edited && !edited.isEnabled ? false : saved ? saved.enabled : original.enabled;
          if (targetEnabled !== original.enabled) switches[book].set(original.uid, targetEnabled);
          if (!saved && (targetEnabled !== original.enabled || contentChanged)) {
            baselines[key] = { uid: original.uid, content: String(original.content || ''), enabled: original.enabled };
          }
          if (baselines[key]) baselines[key].managedEnabled = targetEnabled;
        }
      }
      if (contentChanged && !hidden.has(source.comment)) {
        const original = current[source.book === PRIMARY ? 'primary' : 'library'].find(item => item.uid === source.uid);
        shadows.set(source.comment, { entry: edited, original });
      }
    }
    for (const [comment, entry] of overrides) {
      if (!byComment.has(comment) && !hidden.has(comment)) shadows.set(comment, { entry, original: null });
    }
    return { owner, switches, shadows, baselines };
  }
  function projectedBook(book, entries, projection) {
    const { owner, switches, shadows } = projection;
    if (book === PRIMARY) {
      const reserved = new Set([...shadows.keys()].map(comment => shadowName(owner, comment)));
      if (entries.some(item => reserved.has(nameOf(item)) && item.extra?.[SHADOW]?.owner !== owner)) {
        throw new Error('世界书已有同名的非本脚本条目，不能建立随机事件覆盖');
      }
    }
    const owned = item => item.extra?.[SHADOW]?.owner === owner;
    const existing = new Map(entries.filter(owned).map(item => [item.extra[SHADOW].comment, item]));
    if (book === PRIMARY && existing.size !== entries.filter(owned).length) throw new Error('随机事件覆盖条目重复，请先检查世界书');
    let nextUid = Math.max(0, ...entries.map(item => Number(item.uid) || 0)) + 1;
    const result = entries.filter(item => book !== PRIMARY || !owned(item)).map(item => {
      const enabled = switches[book].get(item.uid);
      return enabled === undefined ? item : { ...item, enabled };
    });
    if (book === PRIMARY) for (const [comment, { entry, original }] of shadows) {
      const previous = existing.get(comment);
      const name = shadowName(owner, comment);
      const strategy = clone(original?.strategy || previous?.strategy || { type: 'constant' });
      if (strategy.type === 'selective' && (!Array.isArray(strategy.keys) || !strategy.keys.length)) {
        strategy.type = 'constant';
      }
      result.push({
        ...(previous || {}),
        uid: previous?.uid ?? nextUid++,
        name, comment: name,
        content: JSON.stringify(entry, null, 2),
        enabled: entry.isEnabled,
        strategy,
        position: clone(original?.position || previous?.position || { type: 'at_depth', role: 'system', depth: 0, order: 5000 }),
        extra: { ...(previous?.extra || {}), [SHADOW]: { owner, comment } },
      });
    }
    return result;
  }
  async function commit(api, nextRaw, revision) {
    const current = await books(api);
    const local = localState(api);
    if (revisionOf(current.library, current.primary, local.raw) !== revision) {
      throw new Error('随机事件配置或世界书已变化，请重新读取');
    }
    const projection = desiredProjection(current, local, nextRaw);
    const written = [];
    try {
      for (const book of [LIBRARY, PRIMARY]) {
        const before = current[book === PRIMARY ? 'primary' : 'library'];
        const after = projectedBook(book, before, projection);
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        const result = await api.updateWorldbookWith(book, live => {
          if (JSON.stringify(live) !== JSON.stringify(before)) throw new Error(`${book} 已变化，请重新读取`);
          return after;
        }, { render: 'debounced' });
        written.push({ book, before, after: Array.isArray(result) ? result : after });
      }
      const projectedPrimary = written.find(item => item.book === PRIMARY)?.after || current.primary;
      const managed = Object.fromEntries(projectedPrimary
        .filter(item => item.extra?.[SHADOW]?.owner === projection.owner)
        .map(item => [item.extra[SHADOW].comment, JSON.stringify(item)]));
      const raw = {
        version: 1, hidden: nextRaw.hidden, overrides: nextRaw.overrides,
        baselines: projection.baselines, managed,
      };
      api.replaceVariables({ ...local.vars, [LOCAL]: raw }, local.options);
    } catch (error) {
      const failed = [];
      for (const { book, before, after } of written.reverse()) {
        try {
          await api.updateWorldbookWith(book, live => {
            if (JSON.stringify(live) !== JSON.stringify(after)) throw new Error('回滚前世界书再次变化');
            return before;
          }, { render: 'debounced' });
        } catch (rollbackError) { failed.push(`${book}: ${rollbackError?.message || rollbackError}`); }
      }
      throw new Error(failed.length
        ? `随机事件写入失败且回滚不完整，请人工检查世界书：${failed.join('；')}`
        : `随机事件写入失败，已回滚世界书：${error?.message || error}`);
    }
    return readCurrent();
  }
  async function readCurrent() {
    const api = await host();
    const { library, primary } = await books(api);
    const local = localState(api);
    const defaults = baseEntries(library, primary);
    const merged = new Map(defaults.map(source => [source.comment, source]));
    for (const source of local.overrides) {
      if (!source || typeof source.comment !== 'string' || !source.comment.startsWith(PREFIX)) {
        throw new Error('本地随机事件条目格式无效');
      }
      const original = merged.get(source.comment);
      merged.set(source.comment, { ...original, comment: source.comment, local: true, entry: normalize(source.entry) });
    }
    const hidden = new Set(local.hidden);
    return {
      entries: [...merged.values()].filter(source => !hidden.has(source.comment)),
      revision: revisionOf(library, primary, local.raw),
    };
  }
  async function load() {
    await queue;
    const api = await host();
    const local = localState(api);
    if (local.raw && !Object.hasOwn(local.raw, 'baselines') &&
      (local.hidden.length || local.overrides.length)) {
      return serialized(async () => {
        const live = localState(api);
        if (Object.hasOwn(live.raw || {}, 'baselines')) return readCurrent();
        const { library, primary } = await books(api);
        return commit(api, { hidden: live.hidden, overrides: live.overrides },
          revisionOf(library, primary, live.raw));
      });
    }
    return readCurrent();
  }
  function draw(entry, count = entry.抽取数量 || 1, random = Math.random) {
    const pool = (entry.事件列表 || []).filter(item => String(item.name || '').trim() && Number(item.weight) > 0);
    const result = [];
    const limit = Math.min(count, pool.length);
    for (let index = 0; index < limit; index++) {
      const total = pool.reduce((sum, item) => sum + Number(item.weight), 0);
      if (total <= 0) break;
      let ticket = Math.max(0, Math.min(0.999999999999, Number(random()))) * total;
      let chosen = pool.length - 1;
      for (let at = 0; at < pool.length; at++) {
        ticket -= Number(pool[at].weight);
        if (ticket < 0) { chosen = at; break; }
      }
      const [item] = pool.splice(chosen, 1);
      const text = String(entry.输出指令 || '').replace(/\$\{([^}]+)\}/g, (match, key) =>
        Object.hasOwn(item, key) ? String(item[key] ?? '') : match);
      result.push({ entryName: entry.name, eventName: item.name, order: entry.order ?? 99, text });
    }
    return result;
  }
  function passive(entries, random = Math.random) {
    return entries.flatMap(({ entry }) =>
      entry.isEnabled && entry.触发率 > 0 && random() <= entry.触发率 ? draw(entry, entry.抽取数量, random) : []);
  }
  function format(events) {
    return [...events].sort((a, b) => a.order - b.order)
      .map((event, index) => `[随机事件${index + 1}-${event.entryName}] ${event.text}`).join('\n');
  }
  let queue = Promise.resolve();
  function serialized(work) {
    const next = queue.then(work);
    queue = next.catch(() => {});
    return next;
  }
  async function save(entries, revision) {
    return serialized(async () => {
      const api = await host();
      const { primary, library } = await books(api);
      const local = localState(api);
      if (revisionOf(library, primary, local.raw) !== revision) throw new Error('随机事件配置已变化，请重新读取');
      const defaults = new Map(baseEntries(library, primary).map(source => [source.comment, source.entry]));
      const names = new Set();
      const items = entries.map(source => {
        const entry = normalize(source.entry || source);
        const comment = String(source.comment || `${PREFIX}${entry.name}`).trim();
        if (!comment.startsWith(PREFIX) || names.has(comment)) throw new Error(`随机事件条目名无效或重复：${comment}`);
        names.add(comment);
        return { comment, entry };
      });
      const overrides = items.filter(item => JSON.stringify(defaults.get(item.comment)) !== JSON.stringify(item.entry));
      return commit(api, { hidden: local.hidden, overrides }, revision);
    });
  }
  async function remove(source, revision) {
    return serialized(async () => {
      if (!source || !String(source.comment || '').startsWith(PREFIX)) {
        throw new Error('删除目标无效，请重新读取随机事件');
      }
      const api = await host();
      const { library, primary } = await books(api);
      const local = localState(api);
      if (revisionOf(library, primary, local.raw) !== revision) throw new Error('随机事件配置已变化，请重新读取');
      const hasDefault = baseEntries(library, primary).some(item => item.comment === source.comment);
      const exists = hasDefault
        || local.overrides.some(item => item.comment === source.comment);
      if (!exists || local.hidden.includes(source.comment)) throw new Error('随机事件条目已变化，请重新读取');
      const hidden = hasDefault ? [...new Set([...local.hidden, source.comment])] : local.hidden;
      const overrides = local.overrides.filter(item => item.comment !== source.comment);
      return commit(api, { hidden, overrides }, revision);
    });
  }
  async function restore(revision) {
    return serialized(async () => {
      const api = await host();
      const { library, primary } = await books(api);
      const local = localState(api);
      if (revisionOf(library, primary, local.raw) !== revision) throw new Error('随机事件配置已变化，请重新读取');
      const restored = await commit(api, { hidden: [], overrides: [] }, revision);
      const vars = api.getVariables(local.options) || {};
      const { [LOCAL]: _discard, ...remaining } = vars;
      api.replaceVariables(remaining, local.options);
      return { ...restored, revision: (await readCurrent()).revision };
    });
  }
  async function pending() {
    const api = await host();
    const options = api.scriptVariableOptions();
    const vars = api.getVariables(options) || {};
    const id = chatId();
    return { id, events: Array.isArray(vars[PENDING]?.[id]) ? clone(vars[PENDING][id]) : [] };
  }
  async function queueManual(events) {
    return serialized(async () => {
      const api = await host();
      const options = api.scriptVariableOptions();
      const vars = api.getVariables(options) || {};
      const id = chatId();
      const state = vars[PENDING] && typeof vars[PENDING] === 'object' ? clone(vars[PENDING]) : {};
      state[id] = [...(Array.isArray(state[id]) ? state[id] : []), ...clone(events)];
      api.replaceVariables({ ...vars, [PENDING]: state }, options);
      return state[id];
    });
  }
  async function consume(events, id) {
    if (!events.length) return;
    return serialized(async () => {
      const api = await host();
      const options = api.scriptVariableOptions();
      const vars = api.getVariables(options) || {};
      const state = vars[PENDING] && typeof vars[PENDING] === 'object' ? clone(vars[PENDING]) : {};
      const previous = Array.isArray(state[id]) ? state[id] : [];
      if (JSON.stringify(previous.slice(0, events.length)) !== JSON.stringify(events)) return false;
      state[id] = previous.slice(events.length);
      api.replaceVariables({ ...vars, [PENDING]: state }, options);
      return true;
    });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    normalize, parseEntry, load, save, remove, restore, draw, passive, format, pending, queueManual, consume,
    dispose() { contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
