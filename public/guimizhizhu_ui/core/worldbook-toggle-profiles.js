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

  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const newId = () => `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = () => new Date().toISOString();
  function defaultProfile() { return { id: newId(), name: '默认方案', note: '', updatedAt: timestamp(), entries: [] }; }
  function normalize(value) {
    const raw = record(value) ? value : {};
    const ids = new Set();
    const profiles = (Array.isArray(raw.profiles) ? raw.profiles : []).filter(record).map(profile => {
      const seen = new Set();
      const entries = (Array.isArray(profile.entries) ? profile.entries : []).filter(record).map(entry => ({
        book: String(entry.book || '').trim(),
        name: String(entry.name || entry.comment || '').trim(),
        enabled: entry.enabled !== false,
      })).filter(entry => {
        const key = `${entry.book}\0${entry.name}`;
        if (!entry.book || !entry.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      let id = String(profile.id || '').trim();
      if (!id || ids.has(id)) id = newId();
      ids.add(id);
      return {
        id, name: String(profile.name || '').trim() || '未命名方案',
        note: String(profile.note || ''), updatedAt: profile.updatedAt || timestamp(), entries,
      };
    });
    if (!profiles.length) profiles.push(defaultProfile());
    const activeId = profiles.some(profile => profile.id === String(raw.activeId)) ? String(raw.activeId) : profiles[0].id;
    return { version: 1, activeId, profiles };
  }
  const nameOf = entry => String(entry?.name || entry?.comment || '').trim();
  const matches = (entry, name) => nameOf(entry) === name || String(entry?.comment || '').trim() === name;
  function storedEntry(entries) {
    return entries.find(entry => matches(entry, ENTRY));
  }
  async function host() { return contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 }); }
  async function readStorage(api) {
    try {
      const entries = await api.getWorldbook(BOOK);
      if (!Array.isArray(entries)) throw new Error('玩家自建世界书未返回条目列表');
      const entry = storedEntry(entries);
      return { exists: true, entry, content: String(entry?.content || '') };
    } catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
        return { exists: false, entry: null, content: '' };
      }
      throw error;
    }
  }
  async function load() {
    const stored = await readStorage(await host());
    let parsed = {};
    if (stored.content.trim()) {
      try { parsed = JSON.parse(stored.content); }
      catch { throw new Error('世界书开关方案不是有效 JSON，请先修复原条目；不会覆盖它'); }
    }
    return { data: normalize(parsed), revision: stored.content };
  }
  let queue = Promise.resolve();
  function serialized(work) {
    const task = queue.then(work);
    queue = task.catch(() => {});
    return task;
  }
  async function save(value, revision) {
    return serialized(async () => {
      const api = await host();
      const stored = await readStorage(api);
      if (revision !== undefined && stored.content !== revision) throw new Error('方案已在别处更改，请重新读取后再保存');
      const data = normalize(value);
      const content = JSON.stringify(data, null, 2);
      if (!stored.exists) {
        await api.createWorldbook(BOOK);
        const current = await readStorage(api);
        if (current.entry || current.content) throw new Error('方案世界书已被其他操作修改，请重新读取');
      }
      if (stored.entry) {
        if (stored.entry.uid === undefined) throw new Error('方案条目没有 UID，无法安全更新');
        let updated = false;
        await api.updateWorldbookWith(BOOK, entries => entries.map(entry => {
          if (entry.uid !== stored.entry.uid) return entry;
          updated = true;
          if (String(entry.content || '') !== stored.content) throw new Error('方案条目已变化，请重新读取');
          return { ...entry, content };
        }), { render: 'debounced' });
        if (!updated) throw new Error('方案条目已被移除，请重新读取');
      } else {
        const latest = await readStorage(api);
        if (latest.entry) throw new Error('方案条目已由其他操作创建，请重新读取');
        await api.createWorldbookEntries(BOOK, [{
          name: ENTRY, comment: ENTRY, keys: [ENTRY], content, enabled: false,
          strategy: { type: 'selective' },
          position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
        }]);
      }
      return { data, revision: content };
    });
  }
  async function boundBooks(api) {
    api ||= await host();
    const names = new Set();
    const add = name => { if (String(name || '').trim()) names.add(String(name).trim()); };
    const optional = async work => {
      try { return await work(); } catch (error) {
        if (/宿主 API 不可用/.test(String(error?.message || error))) return null;
        throw error;
      }
    };
    (await optional(() => api.getGlobalWorldbookNames()) || []).forEach(add);
    const character = await api.getCharWorldbookNames('current');
    add(character?.primary);
    (character?.additional || []).forEach(add);
    add(await optional(() => api.getChatWorldbookName('current')));
    return [...names];
  }
  async function entriesFor(book) {
    const entries = await (await host()).getWorldbook(book);
    if (!Array.isArray(entries)) throw new Error(`世界书「${book}」未返回条目列表`);
    return entries;
  }
  async function validate(profile) {
    const bound = new Set(await boundBooks());
    const found = [];
    const missing = [];
    const unbound = [];
    const byBook = new Map();
    for (const entry of normalize({ profiles: [profile] }).profiles[0].entries) {
      if (!byBook.has(entry.book)) byBook.set(entry.book, []);
      byBook.get(entry.book).push(entry);
    }
    for (const [book, targets] of byBook) {
      if (!bound.has(book)) {
        unbound.push({ book, entryCount: targets.length, reason: '未挂载到当前聊天或角色' });
        continue;
      }
      let entries;
      try { entries = await entriesFor(book); }
      catch (error) {
        targets.forEach(target => missing.push({ ...target, reason: `世界书读取失败：${error?.message || error}` }));
        continue;
      }
      for (const target of targets) {
        const candidates = entries.filter(entry => matches(entry, target.name));
        if (candidates.length !== 1 || candidates[0].uid === undefined) {
          missing.push({ ...target, reason: candidates.length > 1 ? '同名条目不唯一' : '条目不存在或没有 UID' });
        } else found.push({ ...target, uid: candidates[0].uid });
      }
    }
    return { found, missing, unbound };
  }
  async function apply(profile, options = {}) {
    const api = await host();
    const validation = await validate(profile);
    if (!validation.found.length) return { changed: 0, skipped: 0, ...validation };
    const byBook = new Map();
    validation.found.forEach(item => {
      if (!byBook.has(item.book)) byBook.set(item.book, []);
      byBook.get(item.book).push(item);
    });
    const result = { changed: 0, skipped: 0, ...validation };
    for (const [book, items] of byBook) {
      try {
        options.guard?.();
        const targets = new Map(items.map(item => [item.uid, item]));
        let changed = 0;
        let skipped = 0;
        await api.updateWorldbookWith(book, entries => {
          options.guard?.();
          const seen = new Set();
          changed = 0;
          skipped = 0;
          const next = entries.map(entry => {
            const target = targets.get(entry.uid);
            if (!target) return entry;
            if (!matches(entry, target.name)) throw new Error(`条目「${target.name}」已变化`);
            if (entries.filter(candidate => matches(candidate, target.name)).length !== 1) throw new Error(`条目「${target.name}」不再唯一`);
            seen.add(entry.uid);
            if (Boolean(entry.enabled) === target.enabled) { skipped++; return entry; }
            changed++;
            return { ...entry, enabled: target.enabled };
          });
          if (seen.size !== targets.size) throw new Error(`世界书「${book}」的条目已变化`);
          return next;
        }, { render: 'debounced' });
        result.changed += changed;
        result.skipped += skipped;
      } catch (error) {
        error.partial = { changed: result.changed, skipped: result.skipped, book };
        throw error;
      }
    }
    return result;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    normalize, load, save, boundBooks, entriesFor, validate, apply,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may already have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
