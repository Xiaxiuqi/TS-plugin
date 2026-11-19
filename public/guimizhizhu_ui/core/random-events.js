(() => {
  'use strict';
  const KEY = 'cryptLord.randomEvents';
  const LEGACY_PRIMARY = '1源堡';
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
  let queue = Promise.resolve(), disposed = false, epoch = 0, adminEpoch = 0, generating = false;
  let nativeTicket = null, injection = null, nativeReady = false, recovery = null;
  const subscriptions = [], turns = new WeakMap();
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function usable(guard) {
    if (disposed || modules[KEY] !== api || guard?.() === false) throw new DOMException('随机事件操作已取消', 'AbortError');
  }
  function checkHost(service, guard) {
    usable(guard);
    if (modules['cryptLord.hostApi'] !== service) throw Error('随机事件来源服务已变化，请重新读取');
  }
  function scope() {
    const service = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { service, after, document: surface?.document, window: surface?.window, epoch,
      script: signature(service?.scriptVariableOptions()), chat: chatId() };
  }
  function scopedGuard(guard) {
    const expected = scope();
    return () => {
      usable(guard);
      const current = scope();
      if (Object.keys(expected).some(key => expected[key] !== current[key]))
        throw new DOMException('随机事件宿主、来源服务、聊天或脚本已变化，请重新读取', 'AbortError');
      return true;
    };
  }
  function adminGuard(guard) {
    guard = scopedGuard(guard);
    const token = adminEpoch, id = chatId(), service = modules['cryptLord.hostApi'];
    const options = signature(service?.scriptVariableOptions());
    return () => {
      usable(guard);
      if (generating || token !== adminEpoch || id !== chatId()) throw new DOMException('生成或聊天已变化，请重新读取随机事件', 'AbortError');
      if (service !== modules['cryptLord.hostApi'] || signature(service?.scriptVariableOptions()) !== options)
        throw Error('随机事件来源服务或脚本已变化，请重新读取');
      return true;
    };
  }
  async function bindingOf(service, guard) {
    const binding = clone(await service.getCharWorldbookNames('current'));
    checkHost(service, guard);
    const book = String(binding?.primary || '').trim();
    if (!book || book === LIBRARY) throw Error('当前角色未绑定有效主世界书，无法管理随机事件');
    return { binding, book };
  }
  async function checkSource(service, current, options, guard) {
    checkHost(service, guard);
    if (signature(await bindingOf(service, guard)) !== signature({ book: current.book, binding: current.binding }) ||
      signature(service.scriptVariableOptions()) !== signature(options)) throw Error('角色世界书绑定或脚本已变化，请重新读取');
    checkHost(service, guard);
  }
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
        const st = owner?.SillyTavern;
        const id = st?.getCurrentChatId?.() ?? st?.getContext?.()?.getCurrentChatId?.();
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
  async function readBook(api, book) {
    let entries;
    try { entries = await api.getWorldbook(book); }
    catch (error) {
      if (book === LIBRARY && /未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) return [];
      throw error;
    }
    if (!Array.isArray(entries)) throw Error(`${book} 未返回条目列表`);
    return entries;
  }
  async function books(api, guard) {
    const source = await bindingOf(api, guard);
    const [library, primary] = await Promise.all([LIBRARY, source.book].map(book => readBook(api, book)));
    checkHost(api, guard);
    if (signature(source) !== signature(await bindingOf(api, guard))) throw Error('角色世界书绑定已变化，请重新读取');
    return { library, primary, ...source };
  }
  function selected(entries) {
    const matches = entries.filter(item => nameOf(item).startsWith(PREFIX));
    const seen = new Set();
    for (const item of matches) {
      const name = nameOf(item);
      if (seen.has(name)) throw new Error(`随机事件世界书条目「${name}」重名，请先修复`);
      if (item.uid == null || entries.filter(entry => entry.uid === item.uid).length !== 1) throw Error(`随机事件条目「${name}」缺少 UID 或 UID 重复`);
      seen.add(name);
    }
    return matches;
  }
  function localState(api, book) {
    const options = api.scriptVariableOptions();
    const vars = api.getVariables(options) || {};
    const stored = vars[LOCAL];
    if (stored != null && (typeof stored !== 'object' || Array.isArray(stored) ||
      ![1, 2].includes(stored.version) || stored.version === 2 && (!stored.scopes || typeof stored.scopes !== 'object' || Array.isArray(stored.scopes)))) {
      throw new Error('本地随机事件配置格式无效，请检查脚本变量');
    }
    const raw = stored?.version === 2 ? stored.scopes[book] : book === LEGACY_PRIMARY ? stored : null;
    if (raw != null && (!Array.isArray(raw.hidden) || !Array.isArray(raw.overrides) ||
      raw.baselines != null && (typeof raw.baselines !== 'object' || Array.isArray(raw.baselines)) ||
      raw.managed != null && (typeof raw.managed !== 'object' || Array.isArray(raw.managed)))) throw Error('本地随机事件配置格式无效，请检查脚本变量');
    return { options, vars, stored, raw, hidden: raw?.hidden || [], overrides: raw?.overrides || [], baselines: raw?.baselines || {} };
  }
  function baseEntries(library, primary, book) {
    const merged = new Map();
    selected(library).forEach(item => merged.set(nameOf(item), { item, book: LIBRARY }));
    selected(primary).forEach(item => merged.set(nameOf(item), { item, book }));
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
  function revisionOf(current, local) {
    return signature({ ...current, local: local.stored ?? null, options: local.options, adminEpoch });
  }
  function baselineKey(source) { return `${source.book}\0${source.comment}`; }
  function shadowName(owner, comment) { return `${SHADOW_PREFIX}${owner}·${comment}`; }
  function entryWithoutSwitch(entry) {
    const { isEnabled: _enabled, ...content } = entry;
    return JSON.stringify(content);
  }
  function desiredProjection(current, local, proposed) {
    const PRIMARY = current.book;
    const owner = String(local.options.script_id || '');
    if (!owner) throw new Error('当前脚本 ID 不可用，无法管理随机事件覆盖条目');
    const defaults = baseEntries(current.library, current.primary, PRIMARY);
    const byComment = new Map(defaults.map(source => [source.comment, source]));
    const overrides = new Map(proposed.overrides.map(source => [source.comment, source.entry]));
    const hidden = new Set(proposed.hidden);
    const baselines = clone(local.baselines);
    const switches = { [PRIMARY]: new Map(), [LIBRARY]: new Map() };
    const shadows = new Map();
    for (const [key, saved] of Object.entries(baselines)) {
      const [book, comment] = key.split('\0');
      const original = current[book === PRIMARY ? 'primary' : 'library'].find(item => nameOf(item) === comment);
      if (!original || original.uid !== saved.uid || String(original.content || '') !== saved.content ||
        saved.entry && signature({ ...original, enabled: saved.entry.enabled }) !== signature(saved.entry))
        throw Error(`原版条目「${comment}」已被外部修改，不能覆盖或恢复`);
    }
    for (const [comment, snapshot] of Object.entries(local.raw?.managed || {})) {
      const existing = current.primary.find(item => item.extra?.[SHADOW]?.owner === owner && item.extra[SHADOW].comment === comment);
      if (!existing || JSON.stringify(existing) !== snapshot) {
        throw new Error(`脚本覆盖条目「${comment}」已被外部修改，请检查世界书`);
      }
    }
    if (local.raw?.managed && current.primary.some(item => item.extra?.[SHADOW]?.owner === owner &&
      !Object.hasOwn(local.raw.managed, item.extra[SHADOW].comment))) throw Error('出现未登记的随机事件覆盖条目，请检查世界书');
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
            baselines[key] = { uid: original.uid, content: String(original.content || ''), enabled: original.enabled, entry: clone(original) };
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
    return { owner, switches, shadows, baselines, primaryBook: PRIMARY };
  }
  function projectedBook(book, entries, projection) {
    const PRIMARY = projection.primaryBook;
    const { owner, switches, shadows } = projection;
    if (book === PRIMARY) {
      const reserved = new Set([...shadows.keys()].map(comment => shadowName(owner, comment)));
      if (entries.some(item => reserved.has(nameOf(item)) && item.extra?.[SHADOW]?.owner !== owner)) {
        throw new Error('世界书已有同名的非本脚本条目，不能建立随机事件覆盖');
      }
    }
    const owned = item => item.extra?.[SHADOW]?.owner === owner;
    const existing = new Map(entries.filter(owned).map(item => [item.extra[SHADOW].comment, item]));
    if (book === PRIMARY && (existing.size !== entries.filter(owned).length ||
      entries.filter(owned).some(item => item.uid == null || entries.filter(row => row.uid === item.uid).length !== 1)))
      throw new Error('随机事件覆盖条目或 UID 重复，请先检查世界书');
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
  function scopedConfig(local, book, raw) {
    const scopes = clone(local.stored?.version === 2 ? local.stored.scopes : local.stored ? { [LEGACY_PRIMARY]: local.stored } : {});
    if (raw) scopes[book] = raw;
    else delete scopes[book];
    return Object.keys(scopes).length ? { version: 2, scopes } : null;
  }
  async function writeBook(service, plan, source, options, guard) {
    await checkSource(service, source, options, guard);
    let transformed = false, warning = '';
    try {
      await service.updateWorldbookWith(plan.book, async live => {
        await checkSource(service, source, options, guard);
        if (signature(live) !== signature(plan.before)) throw Error(`${plan.book} 已变化，请重新读取`);
        if (signature(await service.getWorldbook(plan.book)) !== signature(live)) throw Error(`${plan.book} 已变化，请重新读取`);
        checkHost(service, guard);
        transformed = true;
        return clone(plan.after);
      }, { render: 'debounced' });
    } catch (error) {
      await checkSource(service, source, options, guard);
      if (!transformed || signature(await service.getWorldbook(plan.book)) !== signature(plan.after)) throw error;
      warning = '世界书已提交，但宿主未返回成功响应';
    }
    await checkSource(service, source, options, guard);
    if (signature(await service.getWorldbook(plan.book)) !== signature(plan.after)) throw Error('世界书提交后复核失败');
    checkHost(service, guard);
    return warning;
  }
  async function applyPlan(receipt, guard) {
    const { service, current, local, plans, nextStored } = receipt;
    await checkSource(service, current, local.options, guard);
    for (const plan of plans) {
      const live = await readBook(service, plan.book);
      checkHost(service, guard);
      if (signature(live) !== signature(plan.before) && signature(live) !== signature(plan.after)) throw Error(`${plan.book} 已被外部修改，不能恢复未完成提交`);
    }
    const actual = service.getVariables(local.options) || {};
    if (signature(actual[LOCAL] ?? null) !== signature(local.stored ?? null) &&
      signature(actual[LOCAL] ?? null) !== signature(nextStored)) throw Error('本地随机事件配置已被外部修改，不能恢复未完成提交');
    let warning = '';
    for (const plan of plans) {
      if (signature(await readBook(service, plan.book)) !== signature(plan.after))
        warning = await writeBook(service, plan, current, local.options, guard) || warning;
    }
    await checkSource(service, current, local.options, guard);
    for (const plan of plans) {
      if (signature(await readBook(service, plan.book)) !== signature(plan.after)) throw Error(`${plan.book} 已变化，配置尚未完成`);
    }
    await checkSource(service, current, local.options, guard);
    const vars = service.getVariables(local.options) || {};
    if (signature(vars[LOCAL] ?? null) === signature(nextStored)) return warning;
    if (signature(vars[LOCAL] ?? null) !== signature(local.stored ?? null)) throw Error('本地随机事件配置已变化');
    try { await service.updateVariablesWith(async () => {
      await checkSource(service, current, local.options, guard);
      const live = service.getVariables(local.options) || {};
      if (signature(live[LOCAL] ?? null) !== signature(local.stored ?? null)) throw Error('本地随机事件配置已变化');
      const next = { ...live };
      if (nextStored) next[LOCAL] = clone(nextStored);
      else delete next[LOCAL];
      checkHost(service, guard);
      receipt.variablesAttempted = true;
      return next;
    }, local.options); }
    catch (error) {
      await checkSource(service, current, local.options, guard);
      if (signature(service.getVariables(local.options)?.[LOCAL] ?? null) !== signature(nextStored)) throw error;
      warning = '随机事件配置已提交，但宿主未返回成功响应';
    }
    await checkSource(service, current, local.options, guard);
    if (signature(service.getVariables(local.options)?.[LOCAL] ?? null) !== signature(nextStored)) throw Error('本地随机事件配置提交后复核失败');
    return warning;
  }
  async function commit(service, nextRaw, revision, guard, restoring = false) {
    if (recovery) throw Error('上次提交未完成，请先确认并恢复未完成提交');
    const current = await books(service, guard), local = localState(service, current.book);
    if (revisionOf(current, local) !== revision) throw Error('随机事件配置或世界书已变化，请重新读取');
    const projection = desiredProjection(current, local, nextRaw);
    const plans = [LIBRARY, current.book].map(book => {
      const before = current[book === current.book ? 'primary' : 'library'];
      return { book, before: clone(before), after: projectedBook(book, before, projection) };
    });
    const raw = {
      version: 1, hidden: nextRaw.hidden, overrides: nextRaw.overrides, baselines: projection.baselines,
      managed: Object.fromEntries(plans[1].after.filter(item => item.extra?.[SHADOW]?.owner === projection.owner)
        .map(item => [item.extra[SHADOW].comment, JSON.stringify(item)])),
    };
    const receipt = { service, current, local, plans, nextStored: scopedConfig(local, current.book, restoring ? null : raw), chat: chatId() };
    let warning;
    try { warning = await applyPlan(receipt, guard); }
    catch (error) {
      let untouched = false;
      try {
        untouched = !receipt.variablesAttempted && (await Promise.all(plans.map(async plan =>
          signature(await readBook(service, plan.book)) === signature(plan.before)))).every(Boolean);
      } catch { /* Unconfirmed writes keep their recovery receipt. */ }
      if (untouched) throw error;
      // A changed chat/binding must never trigger further compensating writes.
      const failed = [];
      try {
        await checkSource(service, current, local.options, guard);
        if (receipt.variablesAttempted && signature(service.getVariables(local.options)?.[LOCAL] ?? null) !== signature(local.stored ?? null))
          throw Error('脚本配置提交状态未确认');
        for (const plan of [...plans].reverse()) {
          if (signature(plan.before) === signature(plan.after)) continue;
          const live = await service.getWorldbook(plan.book);
          checkHost(service, guard);
          if (signature(live) === signature(plan.before)) continue;
          if (signature(live) !== signature(plan.after)) throw Error(`${plan.book} 已被外部修改，不能回滚`);
          await writeBook(service, { ...plan, before: plan.after, after: plan.before }, current, local.options, guard);
        }
      } catch (rollbackError) { failed.push(rollbackError.message); }
      if (failed.length) {
        recovery = receipt;
        throw Error(`随机事件提交未完成，已保留恢复凭据；请重新打开并确认恢复：${error.message}；${failed.join('；')}`);
      }
      throw Error(`随机事件写入失败，已回滚世界书：${error.message}`);
    }
    try { return { ...await readCurrent(guard), warning }; }
    catch (error) { return { entries: null, revision: null, book: current.book, warning: `随机事件已提交，但复核失败，请重新读取：${error.message}` }; }
  }
  async function recover(guard) {
    guard = adminGuard(guard);
    return serialized(async () => {
      usable(guard);
      const receipt = recovery;
      if (!receipt) throw Error('没有未完成的随机事件提交');
      if (receipt.chat !== chatId()) throw Error('请返回原聊天后恢复未完成提交');
      const warning = await applyPlan(receipt, guard);
      recovery = null;
      return { ...await readCurrent(guard), warning: warning || '已恢复未完成提交' };
    });
  }
  async function readCurrent(guard) {
    const api = await host();
    checkHost(api, guard);
    const current = await books(api, guard);
    const { library, primary, book } = current;
    const local = localState(api, book);
    const defaults = baseEntries(library, primary, book);
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
      revision: revisionOf(current, local), book,
      recovery: Boolean(recovery), legacy: Boolean(local.raw && !Object.hasOwn(local.raw, 'baselines')),
    };
  }
  async function load(options = {}) {
    options = { ...options, guard: scopedGuard(options.guard) };
    usable(options.guard);
    await queue;
    return readCurrent(options.guard);
  }
  // Original executeRandomDraw; only the random source is injectable for parity tests.
  function draw(entry, count = entry?.抽取数量 || 1, random = Math.random) {
    if (!entry || !entry.事件列表 || entry.事件列表.length === 0) return [];
    const validItems = entry.事件列表.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) return [];
    const results = [], itemsPool = [...validItems], limit = Math.min(count, itemsPool.length);
    let totalWeight = itemsPool.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
    for (let i = 0; i < limit; i++) {
      if (totalWeight <= 0) break;
      const randomVal = random() * totalWeight;
      let currentSum = 0, foundIdx = -1;
      for (let j = 0; j < itemsPool.length; j++) {
        currentSum += Math.max(0, Number(itemsPool[j].weight) || 0);
        if (randomVal <= currentSum) { foundIdx = j; break; }
      }
      if (foundIdx !== -1) {
        const match = itemsPool[foundIdx], weight = Math.max(0, Number(match.weight) || 0);
        let text = entry.输出指令 || '';
        Object.keys(match).forEach(key => { text = text.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), match[key] || ''); });
        results.push({ entryName: entry.name, eventName: match.name, order: entry.order || 99, text });
        totalWeight -= weight;
        itemsPool.splice(foundIdx, 1);
      }
    }
    return results;
  }
  function passive(entries, random = Math.random) {
    return entries.flatMap(({ entry }) =>
      entry.isEnabled && entry.触发率 > 0 && random() <= entry.触发率 ? draw(entry, entry.抽取数量, random) : []);
  }
  function format(events) {
    return [...events].sort((a, b) => a.order - b.order)
      .map((event, index) => `[随机事件${index + 1}-${event.entryName}] ${event.text}`).join('\n');
  }
  function serialized(work) {
    const next = queue.then(work);
    queue = next.catch(() => {});
    return next;
  }
  async function save(entries, revision, guard) {
    const input = clone(entries);
    guard = adminGuard(guard);
    return serialized(async () => {
      usable(guard);
      const api = await host();
      const current = await books(api, guard);
      const local = localState(api, current.book);
      if (revisionOf(current, local) !== revision) throw new Error('随机事件配置已变化，请重新读取');
      const defaults = new Map(baseEntries(current.library, current.primary, current.book).map(source => [source.comment, source.entry]));
      const names = new Set();
      const items = input.map(source => {
        const entry = normalize(source.entry || source);
        const comment = String(source.comment || `${PREFIX}${entry.name}`).trim();
        if (!comment.startsWith(PREFIX) || names.has(comment)) throw new Error(`随机事件条目名无效或重复：${comment}`);
        names.add(comment);
        return { comment, entry };
      });
      const overrides = items.filter(item => JSON.stringify(defaults.get(item.comment)) !== JSON.stringify(item.entry));
      return commit(api, { hidden: local.hidden, overrides }, revision, guard);
    });
  }
  async function remove(source, revision, guard) {
    source = clone(source);
    guard = adminGuard(guard);
    return serialized(async () => {
      usable(guard);
      if (!source || !String(source.comment || '').startsWith(PREFIX)) {
        throw new Error('删除目标无效，请重新读取随机事件');
      }
      const api = await host();
      const current = await books(api, guard);
      const local = localState(api, current.book);
      if (revisionOf(current, local) !== revision) throw new Error('随机事件配置已变化，请重新读取');
      const hasDefault = baseEntries(current.library, current.primary, current.book).some(item => item.comment === source.comment);
      const exists = hasDefault
        || local.overrides.some(item => item.comment === source.comment);
      if (!exists || local.hidden.includes(source.comment)) throw new Error('随机事件条目已变化，请重新读取');
      const hidden = hasDefault ? [...new Set([...local.hidden, source.comment])] : local.hidden;
      const overrides = local.overrides.filter(item => item.comment !== source.comment);
      return commit(api, { hidden, overrides }, revision, guard);
    });
  }
  async function restore(revision, guard) {
    guard = adminGuard(guard);
    return serialized(async () => {
      usable(guard);
      const api = await host();
      return commit(api, { hidden: [], overrides: [] }, revision, guard, true);
    });
  }
  async function pending(guard) {
    guard = scopedGuard(guard);
    const api = await host();
    checkHost(api, guard);
    const options = api.scriptVariableOptions();
    const vars = api.getVariables(options) || {};
    const id = chatId();
    const state = pendingState(vars);
    return { id, events: clone(state[id] || []) };
  }
  function pendingState(vars) {
    const state = vars[PENDING] ?? {};
    if (!state || typeof state !== 'object' || Array.isArray(state) ||
      Object.values(state).some(events => !Array.isArray(events) || events.some(event => !event || typeof event.text !== 'string' ||
        typeof event.entryName !== 'string' || typeof event.eventName !== 'string' || !Number.isFinite(event.order))))
      throw Error('手动随机事件队列格式无效，请检查脚本变量');
    return clone(state);
  }
  async function updatePending(service, id, transform, guard, beforeWrite) {
    const options = clone(service.scriptVariableOptions());
    let expected = null, transformed = false, changed = false;
    try { await service.updateVariablesWith(async () => {
      await beforeWrite?.();
      checkHost(service, guard);
      const live = service.getVariables(options) || {}, state = pendingState(live);
      const previous = state[id] || [];
      expected = transform(previous);
      if (expected === null) return live;
      changed = signature(previous) !== signature(expected);
      state[id] = clone(expected);
      transformed = true;
      return { ...live, [PENDING]: state };
    }, options); }
    catch (error) {
      checkHost(service, guard);
      if (!transformed || !changed || signature(pendingState(service.getVariables(options) || {})[id] || []) !== signature(expected)) throw error;
    }
    checkHost(service, guard);
    if (expected !== null && signature(pendingState(service.getVariables(options) || {})[id] || []) !== signature(expected))
      throw Error('手动随机事件提交结果未确认，请重新读取');
    return expected;
  }
  async function queueManual(events, guard) {
    events = clone(events);
    guard = adminGuard(guard);
    return serialized(async () => {
      usable(guard);
      const api = await host();
      checkHost(api, guard);
      const id = chatId();
      if (!Array.isArray(events) || events.some(event => !event || typeof event.text !== 'string' ||
        typeof event.entryName !== 'string' || typeof event.eventName !== 'string' || !Number.isFinite(event.order))) throw Error('手动随机事件队列格式无效');
      return updatePending(api, id, previous => [...previous, ...events], guard);
    });
  }
  async function readPages(service, guard) {
    checkHost(service, guard);
    const reader = modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('原生楼层来源服务不可用');
    const source = await reader.read(guard);
    checkHost(service, guard);
    return { rows: source.rows, pages: source.swipes, source, reader };
  }
  function sourceGuard(source, guard) {
    return () => {
      usable(guard);
      if (modules['cryptLord.nativeFloorSource'] !== source.reader) throw Error('原生楼层来源服务已变化');
      source.reader.assertIdentity(source.source, guard);
      return true;
    };
  }
  function assertPendingFloor(before, current, transaction) {
    const baseline = before.rows.at(-1)?.message_id ?? -1, user = current.rows.at(-1);
    if (!user || user.role !== 'user' || user.is_hidden || user.message_id !== transaction.userMessageId ||
      user.message !== transaction.userText || user.message_id <= baseline || current.rows.length !== before.rows.length + 1 ||
      signature(current.rows.slice(0, -1)) !== signature(before.rows) ||
      signature(current.pages.slice(0, -1)) !== signature(before.pages) ||
      current.pages.at(-1)?.swipes.length !== 1 || current.pages.at(-1)?.swipe_id !== 0)
      throw Error('生成前原生楼层或行动已变化，请重新准备回合');
  }
  async function prepareTurn(options = {}) {
    const guard = scopedGuard(options.guard), token = epoch, id = chatId(), service = await host();
    guard();
    const loaded = await load({ guard });
    if (loaded.recovery) throw Error('随机事件提交尚未恢复，本轮不注入');
    const source = await readPages(service, guard);
    const latest = source.rows.at(-1), previous = source.rows.filter(row => row.role === 'assistant').at(-1);
    if (latest?.is_hidden || previous?.is_hidden || latest && !['user', 'assistant'].includes(latest.role))
      throw Error('最新原生来源已隐藏或不是可用正文回合');
    const queued = await pending(guard);
    const current = await books(service, guard), local = localState(service, current.book);
    if (revisionOf(current, local) !== loaded.revision) throw Error('随机事件配置已变化，请重新准备回合');
    const result = { id, events: clone(queued.events), text: format([...queued.events, ...passive(loaded.entries, options.random || Math.random)]), epoch: token };
    turns.set(result, { service, token, id, source, current, local, guard, result: clone(result) });
    await assertTurn(result);
    return result;
  }
  async function assertTurn(ticket, transaction = {}) {
    const receipt = turns.get(ticket);
    if (!receipt || signature(receipt.result) !== signature(ticket)) throw Error('随机事件回合凭据无效，请重新准备');
    const guard = sourceGuard(receipt.source, () => { receipt.guard(); usable(transaction.guard); return true; });
    guard();
    const current = await books(receipt.service, guard), local = localState(receipt.service, current.book);
    if (signature(current) !== signature(receipt.current) || signature(local.stored ?? null) !== signature(receipt.local.stored ?? null) ||
      signature((await pending(guard)).events) !== signature(ticket.events))
      throw Error('随机事件配置或队列已变化，请重新准备回合');
    if (Number.isInteger(transaction.userMessageId))
      assertPendingFloor(receipt.source, await readPages(receipt.service, guard), transaction);
    else await receipt.source.reader.assert(receipt.source.source, guard);
    const valid = () => {
      guard();
      const vars = receipt.service.getVariables(receipt.local.options) || {};
      if (signature(vars[LOCAL] ?? null) !== signature(receipt.local.stored ?? null) ||
        signature(pendingState(vars)[ticket.id] || []) !== signature(ticket.events))
        throw Error('随机事件配置或队列已变化，请重新准备回合');
      return true;
    };
    valid();
    return valid;
  }
  async function consumeTurn(transaction, ticket, savedMessage) {
    const receipt = turns.get(ticket);
    if (!receipt || signature(receipt.result) !== signature(ticket) || !ticket.events.length) return false;
    const guard = () => {
      receipt.guard();
      sourceGuard(receipt.source)();
      usable(transaction.guard);
      if (receipt.token !== epoch || receipt.id !== chatId()) throw Error('聊天或生成已变化，保留随机事件队列');
      checkHost(receipt.service);
      if (signature(receipt.service.scriptVariableOptions()) !== signature(receipt.local.options)) throw Error('脚本已变化，保留随机事件队列');
      return true;
    };
    const verify = async () => {
      await checkSource(receipt.service, receipt.current, receipt.local.options, guard);
      const liveBooks = await books(receipt.service, guard), local = localState(receipt.service, liveBooks.book);
      if (signature(liveBooks) !== signature(receipt.current) ||
        signature(local.stored ?? null) !== signature(receipt.local.stored ?? null)) throw Error('随机事件配置或世界书已变化，保留队列');
      const current = await readPages(receipt.service, guard);
      const before = receipt.source, baseline = before.rows.at(-1)?.message_id ?? -1;
      const userId = Number(transaction.userMessageId), assistantId = Number(transaction.assistantMessageId);
      const assistant = current.rows.at(-1), user = current.rows.find(row => row.message_id === userId);
      const isNative = before.rows.at(-1)?.role === 'user', added = current.rows.filter(row => row.message_id > baseline);
      if (!assistant || assistant.role !== 'assistant' || assistant.is_hidden || !String(savedMessage || '').trim() ||
        assistant.message_id !== assistantId || assistantId <= baseline || assistant.message !== savedMessage ||
        !user || user.role !== 'user' || user.is_hidden || user.message !== transaction.userText ||
        (isNative ? userId !== baseline || added.length !== 1 : userId <= baseline || added.length !== 2) ||
        current.rows.at(-2)?.message_id !== userId ||
        signature(current.rows.filter(row => row.message_id <= baseline)) !== signature(before.rows) ||
        signature(current.pages.filter(row => row.message_id <= baseline)) !== signature(before.pages))
        throw Error('真实楼层、正文或消息页已变化，保留随机事件队列');
      for (const id of [userId, assistantId]) {
        const page = current.pages.find(row => row.message_id === id);
        if (!page || page.swipes.length !== 1 || page.swipe_id !== 0) throw Error('本轮消息页不唯一，保留随机事件队列');
      }
      await checkSource(receipt.service, receipt.current, receipt.local.options, guard);
    };
    return serialized(async () => {
      if (turns.get(ticket) !== receipt) return false;
      await verify();
      const result = await updatePending(receipt.service, ticket.id, previous => {
        if (signature(previous.slice(0, ticket.events.length)) !== signature(ticket.events)) return null;
        // Once a removal is offered to the host, this ticket cannot remove an identical suffix on retry.
        turns.delete(ticket);
        return previous.slice(ticket.events.length);
      },
      guard, verify);
      if (result === null) return false;
      await verify();
      turns.delete(ticket);
      return true;
    });
  }
  function resetNative() {
    epoch++;
    nativeTicket = null;
    const previous = injection;
    injection = null;
    try { previous?.uninject(); } catch (error) { console.warn(`[${KEY}] 注入清理失败`, error); }
  }
  async function installNative() {
    const after = await contract.waitGlobalInitialized('cryptLord.afterNativeHost', { timeoutMs: 10000 });
    usable();
    const events = after?.tavernEvents();
    if (!events?.GENERATION_AFTER_COMMANDS || !events.CHAT_CHANGED || !events.GENERATION_STOPPED || !after.bindEvent) return;
    const bind = (name, callback) => {
      if (!name) return null;
      const sub = after.bindEvent(name, callback);
      if (sub) subscriptions.push(sub);
      return sub;
    };
    const start = bind(events.GENERATION_AFTER_COMMANDS, async (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      // Frontend requests already carry their own immutable event draw.
      if (modules['cryptLord.nativeFloor']?.hasActiveTurn?.()) return;
      resetNative();
      if (!['normal', '', undefined, null].includes(type)) return;
      const token = epoch;
      try {
        const ticket = await prepareTurn();
        if (token !== epoch || turns.get(ticket)?.source.rows.at(-1)?.role !== 'user' || !ticket.text) return;
        const service = await host();
        usable();
        if (token !== epoch) return;
        const valid = await assertTurn(ticket);
        valid();
        injection = service.injectPrompts([{
          id: 'cryptLord.randomEvents.native', role: 'user', position: 'in_chat', depth: 0, should_scan: true, content: ticket.text,
        }], { once: true });
        nativeTicket = ticket;
      } catch (error) {
        console.warn(`[${KEY}] 原生随机事件注入失败，未清理队列`, error);
        if (token === epoch) resetNative();
      }
    });
    const stop = bind(events.GENERATION_STOPPED, () => { generating = false; resetNative(); });
    const chat = bind(events.CHAT_CHANGED, () => { adminEpoch++; generating = false; resetNative(); });
    bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      adminEpoch++; generating = true;
    });
    bind(events.GENERATION_ENDED, () => { generating = false; });
    if (!start || !stop || !chat) { subscriptions.splice(0).forEach(sub => sub.stop()); return; }
    nativeReady = true;
  }
  async function consumeNative(transaction, savedMessage) {
    const ticket = nativeTicket;
    if (!ticket || !String(transaction.generationId || '').startsWith('native-host-') || ticket.epoch !== epoch) return false;
    const result = await consumeTurn(transaction, ticket, savedMessage);
    if (nativeTicket === ticket) resetNative();
    return result;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: !disposed, nativeReady, epoch, adminEpoch, generating, recovery: Boolean(recovery) }),
    normalize, parseEntry, load, save, remove, restore, recover, draw, passive, format, pending, queueManual, prepareTurn, assertTurn, consumeTurn, consumeNative,
    dispose() {
      disposed = true;
      nativeReady = false;
      generating = false;
      resetNative();
      subscriptions.splice(0).forEach(sub => sub.stop());
      recovery = null;
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  void installNative().catch(error => {
    subscriptions.splice(0).forEach(subscription => subscription.stop());
    nativeReady = false;
    if (!disposed) console.warn(`[${KEY}] 原生随机事件监听不可用`, error);
  });
})();
