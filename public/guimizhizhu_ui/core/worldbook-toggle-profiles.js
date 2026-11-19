(() => {
  'use strict';

  const KEY = 'cryptLord.worldbookToggleProfiles';
  const HOST_KEY = 'cryptLord.hostApi';
  const BOOK = '【源堡】玩家自建内容';
  const ENTRY = '[世界书开关方案]';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0, generating = false;
  const validations = new WeakMap(), revisions = new WeakMap(), subscriptions = [];
  const usable = (guard, token = epoch) => {
    if (disposed) throw Error('世界书开关方案已卸载');
    if (generating || token !== epoch || modules[KEY] !== api || guard?.() === false)
      throw new DOMException('世界书方案操作已取消，请重新读取', 'AbortError');
  };
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  const same = (left, right) => signature(left) === signature(right);
  const clone = value => structuredClone(value);
  function identity() {
    const service = modules[HOST_KEY], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { service, after, document: surface?.document, window: surface?.window,
      chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()),
      script: signature(service?.scriptVariableOptions?.()), token: epoch };
  }
  function check(scope, guard) {
    usable(guard, scope.token);
    const now = identity();
    if (Object.keys(scope).some(key => scope[key] !== now[key]))
      throw Error('世界书宿主、聊天、脚本或来源服务已变化，请重新读取');
    return true;
  }
  const conflict = text => Object.assign(Error(text), { conflict: true, requiresReload: true });

  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  // BEGIN ORIGINAL TOGGLE
  const originalRules = {
_newToggleProfileId() {
    return `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },
buildDefaultToggleProfile() {
    return {
      id: this._newToggleProfileId(),
      name: "默认方案",
      note: "",
      updatedAt: new Date().toISOString(),
      entries: [],
    };
  },
normalizeToggleProfiles(data) {
    const raw = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const profilesIn = Array.isArray(raw.profiles) ? raw.profiles : [];
    const profiles = profilesIn
      .filter((p) => p && typeof p === "object")
      .map((p, idx) => {
        const seen = new Set();
        const entries = (Array.isArray(p.entries) ? p.entries : [])
          .filter((e) => e && typeof e === "object")
          .map((e) => ({
            book: String(e.book || "").trim(),
            name: String(e.name || e.comment || "").trim(),
            enabled: e.enabled !== false,
          }))
          .filter((e) => e.book && e.name)
          .filter((e) => {
            const key = `${e.book}\0${e.name}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        return {
          id: String(p.id || this._newToggleProfileId() || `tp-${idx}`),
          name: String(p.name || "未命名方案").trim() || "未命名方案",
          note: String(p.note || ""),
          updatedAt: p.updatedAt || new Date().toISOString(),
          entries,
        };
      });

    if (profiles.length === 0) {
      profiles.push(this.buildDefaultToggleProfile());
    }

    let activeId = raw.activeId != null ? String(raw.activeId) : null;
    if (!activeId || !profiles.some((p) => p.id === activeId)) {
      activeId = profiles[0].id;
    }

    return { version: 1, activeId, profiles };
  }
  };
  // END ORIGINAL TOGGLE
  const defaultProfile = () => originalRules.buildDefaultToggleProfile();
  function normalize(value) {
    const raw = record(value) ? value : {};
    const data = originalRules.normalizeToggleProfiles({
      ...raw, profiles: (Array.isArray(raw.profiles) ? raw.profiles : []).filter(record)
        .map(profile => ({ ...profile, entries: (Array.isArray(profile.entries) ? profile.entries : []).filter(record) })),
    });
    const ids = new Set();
    data.profiles.forEach((profile, index) => {
      if (!profile.id.trim() || ids.has(profile.id)) {
        let id = `${originalRules._newToggleProfileId()}-${index}`;
        while (ids.has(id)) id += '-copy';
        profile.id = id;
      }
      ids.add(profile.id);
    });
    if (!ids.has(data.activeId)) data.activeId = data.profiles[0].id;
    return data;
  }
  const nameOf = entry => String(entry?.name || entry?.comment || '').trim();
  const matches = (entry, name) => nameOf(entry) === name || String(entry?.comment || '').trim() === name;
  function storedEntry(entries) {
    const targets = entries.filter(entry => matches(entry, ENTRY));
    if (targets.length > 1) throw new Error('世界书开关方案条目重名，请先整理世界书');
    const target = targets[0];
    if (target && (!Number.isSafeInteger(target.uid) || target.uid < 0 || entries.filter(entry => entry.uid === target.uid).length !== 1)) {
      throw new Error('世界书开关方案条目 UID 无效或重复');
    }
    return target;
  }
  async function host(guard, token = epoch) {
    usable(guard, token);
    const value = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    usable(guard, token);
    return value;
  }
  const revisionOf = stored => ({ exists: stored.exists, uid: stored.entry?.uid ?? null,
    content: stored.entry ? stored.content : null, entry: structuredClone(stored.entry || null) });
  function sameRevision(left, right) {
    return record(left) && record(right) && same(left, right);
  }
  async function readStorage(api) {
    try {
      const entries = clone(await api.getWorldbook(BOOK));
      if (!Array.isArray(entries)) throw new Error('玩家自建世界书未返回条目列表');
      const entry = storedEntry(entries);
      return { exists: true, entry, entries: clone(entries), content: String(entry?.content || '') };
    } catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
        return { exists: false, entry: null, entries: null, content: '' };
      }
      throw error;
    }
  }
  async function load(options = {}) {
    const scope = identity(), token = scope.token, service = await host(options.guard, token);
    check(scope, options.guard);
    const stored = await readStorage(service);
    check(scope, options.guard);
    if (!same(stored, await readStorage(service))) throw Error('世界书方案读取期间已变化，请重新读取');
    check(scope, options.guard);
    let parsed = {};
    if (stored.content.trim()) {
      try { parsed = JSON.parse(stored.content); }
      catch { throw new Error('世界书开关方案不是有效 JSON，请先修复原条目；不会覆盖它'); }
      if (!record(parsed) || parsed.profiles !== undefined && !Array.isArray(parsed.profiles)) {
        throw new Error('世界书开关方案结构无效；不会覆盖它');
      }
    }
    usable(options.guard, token);
    const revision = revisionOf(stored);
    revisions.set(revision, { value: clone(revision), stored, scope });
    return { data: normalize(parsed), revision };
  }
  let queue = Promise.resolve();
  function serialized(work) {
    const task = queue.then(work);
    queue = task.catch(() => {});
    return task;
  }
  // A confirmed book is never replayed. Inspection only resolves the current step.
  function transaction(scope, stages, build, extra = async () => {}) {
    let phase = 'pending', busy = false, index = 0, result, failure;
    const guards = new Set(), warnings = [];
    const valid = () => check(scope, () => [...guards].every(guard => guard() !== false));
    const read = async stage => {
      valid();
      const get = async () => {
        if (stage.book === BOOK) return (await readStorage(scope.service)).entries;
        const rows = clone(await scope.service.getWorldbook(stage.book));
        if (!Array.isArray(rows)) throw Error('世界书未返回条目列表');
        return rows;
      };
      const rows = await get(); valid();
      if (!same(rows, await get())) throw Error('核对期间世界书已变化');
      valid(); return rows;
    };
    const original = (stage, rows) => same(rows, stage.before) ||
      stage.before === null && stage.createAttempted && Array.isArray(rows) && !rows.length;
    const expected = (stage, rows) => {
      if (!stage.newEntry) return same(rows, stage.after);
      if (!Array.isArray(rows) || rows.length !== stage.after.length) return false;
      const actual = rows.at(-1), proposed = stage.newEntry;
      return same(rows.slice(0, -1), stage.after.slice(0, -1)) &&
        Number.isSafeInteger(actual?.uid) && actual.uid >= 0 &&
        rows.filter(row => row.uid === actual.uid).length === 1 &&
        Object.keys(proposed).every(key => same(actual[key], proposed[key]));
    };
    const verify = async (skip = -1) => {
      valid(); await extra(valid); valid();
      for (let i = 0; i < stages.length; i++) {
        if (i === skip) continue;
        const stage = stages[i], rows = await read(stage);
        if (i < index ? !same(rows, stage.confirmed) : !original(stage, rows))
          throw conflict(`世界书「${stage.book}」条目已变化或方案已在别处更改，请重新确认`);
      }
      valid();
    };
    const partial = () => ({ changed: stages.slice(0, index).reduce((n, stage) => n + (stage.changed || 0), 0),
      skipped: stages.slice(0, index).reduce((n, stage) => n + (stage.skipped || 0), 0),
      book: stages[index]?.book || stages.at(-1)?.book, completed: index });
    const finish = () => {
      if (index !== stages.length) { phase = 'pending'; return false; }
      phase = 'saved'; result = build(stages, warnings); return true;
    };
    const confirm = async () => {
      await verify(index);
      const stage = stages[index], rows = await read(stage);
      if (expected(stage, rows)) {
        stage.confirmed = clone(rows); index++;
        if (failure) warnings.push(`「${stage.book}」宿主未返回成功响应，已核对实际结果`);
        finish(); return;
      }
      if (original(stage, rows)) {
        phase = 'pending';
        throw Error(`${failure?.message || '保存尚未落盘'}；已核对未写入，结果已保留，可重试保存`);
      }
      throw conflict(`世界书「${stage.book}」实际结果与原始及预期不符，未覆盖，请重新读取`);
    };
    const run = action => {
      if (busy) return Promise.reject(Error('方案操作正在进行，不能重复保存或核对'));
      busy = true;
      return serialized(async () => {
        try { valid(); return await action(); }
        catch (error) {
          try { valid(); } catch (cancelled) { phase = 'conflict'; throw cancelled; }
          if (error.conflict) phase = 'conflict';
          error.partial = partial();
          throw error;
        }
      }).finally(() => { busy = false; });
    };
    const api = Object.freeze({
      status: () => ({ phase, busy, ...partial() }),
      addGuard(guard) { if (guard) guards.add(guard); return api; },
      save: () => run(async () => {
        if (phase === 'saved') return clone(result);
        if (phase !== 'pending') throw Error('当前不能重试，请先核对保存或重新读取');
        await verify();
        if (finish()) return clone(result);
        while (index < stages.length) {
          const stage = stages[index]; failure = null;
          if (same(stage.before, stage.after)) {
            stage.confirmed = clone(stage.before); index++; finish(); continue;
          }
          if (stage.before === null && !stage.created) {
            stage.createAttempted = true; phase = 'uncertain';
            try { await scope.service.createWorldbook(stage.book); } catch (error) { failure = error; }
            let rows;
            try { rows = await read(stage); }
            catch (error) { throw Error(`创建世界书状态待核对，未重复提交：${error.message}`); }
            if (!Array.isArray(rows) || rows.length) {
              if (rows === null) { phase = 'pending'; throw Error('世界书未创建，可重试保存'); }
              throw conflict('创建期间世界书内容已变化，请重新读取');
            }
            stage.created = true; phase = 'pending';
          }
          await verify(); phase = 'saving';
          let attempted = false;
          try {
            await scope.service.updateWorldbookWith(stage.book, async entries => {
              valid();
              if (!original(stage, entries)) throw conflict('世界书条目已变化，未覆盖');
              await verify(); valid();
              attempted = true; phase = 'uncertain';
              return clone(stage.after);
            }, { render: 'debounced' });
            if (!attempted) throw Error('宿主未执行保存回调，本次结果已保留');
          } catch (error) {
            if (!attempted) { phase = 'pending'; throw error; }
            failure = error;
          }
          try { await confirm(); }
          catch (error) {
            if (phase === 'uncertain' && !error.conflict)
              throw Error(`保存状态待核对，未重复提交：${error.message}`);
            throw error;
          }
        }
        return clone(result);
      }),
      inspect: () => run(async () => {
        if (phase === 'saved') return clone(result);
        if (phase !== 'uncertain') throw Error('当前无需核对保存');
        const stage = stages[index];
        if (stage.before === null && !stage.created) {
          const rows = await read(stage);
          if (Array.isArray(rows) && !rows.length) { stage.created = true; phase = 'pending'; }
          else if (rows === null) phase = 'pending';
          else throw conflict('世界书创建结果已变化，请重新读取');
        } else await confirm();
        return phase === 'saved' ? clone(result) : { pending: true, ...partial(),
          warning: '当前步骤已核对，尚有未提交步骤，请重试保存继续；已确认步骤不会重复执行。' };
      }),
    });
    return api;
  }
  function beginSave(value, revision, options = {}) {
    const receipt = revision && revisions.get(revision);
    if (!receipt || !sameRevision(revision, receipt.value)) throw Error('方案保存凭据无效或已修改，请重新读取');
    check(receipt.scope, options.guard);
    const input = signature(value), previous = receipt.operation;
    if (previous && previous.input !== input)
      throw Error('本次方案结果已固定，请先核对保存或重新读取');
    if (!previous) {
      const data = normalize(clone(value)), content = JSON.stringify(data, null, 2), stored = receipt.stored;
      const newEntry = stored.entry ? null : { name: ENTRY, content, enabled: false,
        strategy: { type: 'selective', keys: [ENTRY] },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 } };
      const after = stored.entry ? stored.entries.map(row => row.uid === stored.entry.uid ? { ...row, content } : row) :
        [...(stored.entries || []), newEntry];
      const stages = [{ book: BOOK, before: stored.entries, after, newEntry }];
      const operation = transaction(receipt.scope, stages, (stages, warnings) => {
        const entries = stages[0].confirmed, entry = storedEntry(entries);
        const next = revisionOf({ exists: true, entry, content: entry.content });
        return { data, revision: next, warning: warnings.join('；') };
      });
      const publish = result => {
        if (result.revision) {
          const entries = clone(stages[0].confirmed), entry = storedEntry(entries);
          revisions.set(result.revision, { value: clone(result.revision),
            stored: { exists: true, entry, entries, content: entry.content }, scope: receipt.scope });
        }
        return result;
      };
      const wrapped = Object.freeze({ status: operation.status,
        addGuard(guard) { operation.addGuard(guard); return wrapped; },
        async save() { return publish(await operation.save()); },
        async inspect() { return publish(await operation.inspect()); } });
      receipt.operation = { input, transaction: wrapped };
    }
    return receipt.operation.transaction.addGuard(options.guard);
  }
  async function save(value, revision, options = {}) {
    return beginSave(value, revision, options).save();
  }
  async function boundBooks(api, options = {}) {
    const scope = options.scope || identity(), token = options.token ?? scope.token;
    usable(options.guard, token);
    api ||= await host(options.guard, token);
    check(scope, options.guard);
    const names = new Set();
    const add = name => {
      if (name == null || name === '') return;
      if (typeof name !== 'string') throw Error('世界书挂载名称格式无效');
      if (name.trim()) names.add(name.trim());
    };
    const optional = async work => {
      try { return await work(); } catch (error) {
        if (/宿主 API 不可用/.test(String(error?.message || error))) return null;
        throw error;
      }
    };
    const globals = await optional(() => api.getGlobalWorldbookNames()) || [];
    check(scope, options.guard);
    if (!Array.isArray(globals)) throw Error('全局世界书挂载格式无效');
    globals.forEach(add);
    const character = await api.getCharWorldbookNames('current');
    check(scope, options.guard);
    if (!record(character) || character.additional != null && !Array.isArray(character.additional))
      throw Error('角色世界书挂载格式无效');
    add(character?.primary);
    (character?.additional || []).forEach(add);
    add(await optional(() => api.getChatWorldbookName('current')));
    check(scope, options.guard);
    if (modules[HOST_KEY] !== api) throw Error('世界书来源服务已变化，请重新读取');
    return [...names];
  }
  async function entriesFor(book, options = {}) {
    const scope = identity(), token = scope.token, api = await host(options.guard, token);
    check(scope, options.guard);
    const bound = await boundBooks(api, { guard: options.guard, token, scope });
    if (!bound.includes(book)) throw Error(`世界书「${book}」已解除挂载`);
    const entries = clone(await api.getWorldbook(book));
    check(scope, options.guard);
    if (!same(entries, await api.getWorldbook(book)) ||
      !same(bound, await boundBooks(api, { guard: options.guard, token, scope })))
      throw Error('目标条目或挂载状态已变化，请重新读取');
    check(scope, options.guard);
    if (!Array.isArray(entries)) throw new Error(`世界书「${book}」未返回条目列表`);
    return entries;
  }
  async function validate(profile, options = {}) {
    const scope = identity(), token = scope.token, input = clone(profile), api = await host(options.guard, token);
    check(scope, options.guard);
    const boundNames = await boundBooks(api, { guard: options.guard, token, scope });
    const allNames = await api.getWorldbookNames();
    check(scope, options.guard);
    if (!Array.isArray(allNames)) throw new Error('无法读取世界书列表');
    const bound = new Set(boundNames);
    const existing = new Set(allNames);
    const found = [];
    const missing = [];
    const unbound = [];
    const byBook = new Map(), snapshots = new Map();
    for (const entry of normalize({ profiles: [input] }).profiles[0].entries) {
      if (!byBook.has(entry.book)) byBook.set(entry.book, []);
      byBook.get(entry.book).push(entry);
    }
    for (const [book, targets] of byBook) {
      if (!existing.has(book)) {
        targets.forEach(target => missing.push({ ...target, reason: '世界书不存在' }));
        continue;
      }
      if (!bound.has(book)) {
        unbound.push({ book, entryCount: targets.length, reason: '未挂载到当前聊天或角色' });
        continue;
      }
      let entries;
      try {
        entries = clone(await api.getWorldbook(book)); check(scope, options.guard);
        if (!Array.isArray(entries)) throw Error('世界书未返回条目列表');
        if (!same(entries, await api.getWorldbook(book))) throw Error('世界书读取期间已变化');
        check(scope, options.guard);
      }
      catch (error) {
        if (error.name === 'AbortError') throw error;
        targets.forEach(target => missing.push({ ...target, reason: `世界书读取失败：${error?.message || error}` }));
        continue;
      }
      snapshots.set(book, clone(entries));
      for (const target of targets) {
        const candidates = entries.filter(entry => matches(entry, target.name));
        if (candidates.length !== 1 || candidates[0].uid == null) {
          missing.push({ ...target, reason: candidates.length > 1 ? '同名条目不唯一' : '条目不存在或没有 UID' });
        } else if (entries.filter(entry => entry.uid === candidates[0].uid).length !== 1) {
          missing.push({ ...target, reason: '条目 UID 重复' });
        } else {
          if (found.some(item => item.book === book && item.uid === candidates[0].uid)) {
            throw new Error(`世界书「${book}」多个方案条目指向同一条目，请合并后再应用`);
          }
          found.push({ ...target, uid: candidates[0].uid, previousEnabled: candidates[0].enabled,
            entry: structuredClone(candidates[0]) });
        }
      }
    }
    check(scope, options.guard);
    if (!same(boundNames, await boundBooks(api, { guard: options.guard, token, scope })))
      throw Error('目标条目或挂载状态已变化，请重新确认');
    for (const [book, entries] of snapshots) {
      if (!same(entries, await api.getWorldbook(book))) throw Error('世界书条目读取期间已变化，请重新确认');
      check(scope, options.guard);
    }
    const result = { found, missing, unbound };
    validations.set(result, { scope, token, api, boundNames, snapshots, source: clone(result),
      entries: normalize({ profiles: [input] }).profiles[0].entries });
    return result;
  }
  function beginApply(profile, options = {}) {
    const validation = options.validation, receipt = validation && validations.get(validation);
    if (!receipt || !same(receipt.source, validation) ||
      !same(receipt.entries, normalize({ profiles: [profile] }).profiles[0].entries))
      throw Error('目标条目或挂载状态已变化或凭据无效，请重新确认后应用');
    check(receipt.scope, options.guard);
    if (!receipt.operation) {
      const byBook = new Map();
      receipt.source.found.forEach(item => {
        if (!byBook.has(item.book)) byBook.set(item.book, []);
        byBook.get(item.book).push(item);
      });
      const stages = [...byBook].map(([book, items]) => {
        const before = clone(receipt.snapshots.get(book)), targets = new Map(items.map(item => [item.uid, item]));
        const changed = items.filter(item => item.previousEnabled !== item.enabled).length;
        return { book, before, changed, skipped: items.length - changed,
          after: before.map(row => targets.has(row.uid) ? { ...row, enabled: targets.get(row.uid).enabled } : row) };
      });
      receipt.operation = transaction(receipt.scope, stages, (_, warnings) => ({
        changed: stages.reduce((n, stage) => n + stage.changed, 0), skipped: stages.reduce((n, stage) => n + stage.skipped, 0),
        ...clone(receipt.source), warnings: clone(warnings),
      }), async guard => {
        if (!same(receipt.boundNames, await boundBooks(receipt.api, { guard, scope: receipt.scope })))
          throw conflict('世界书已解除挂载或绑定已变化，请重新确认');
      });
    }
    return receipt.operation.addGuard(options.guard);
  }
  async function apply(profile, options = {}) {
    const validation = options.validation || await validate(profile, options);
    return beginApply(profile, { ...options, validation }).save();
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !options?.quiet_prompt && !options?.dryRun &&
      !options?.options?.quiet_prompt && !options?.options?.dryRun && !dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed, generating, epoch }); },
    normalize, defaultProfile, load, beginSave, save, boundBooks, entriesFor, validate, beginApply, apply,
    dispose() {
      disposed = true;
      epoch++; subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may already have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
