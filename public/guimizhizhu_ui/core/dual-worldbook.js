(() => {
  'use strict';
  const KEY = 'cryptLord.dualWorldbook';
  const PRIMARY = '1源堡';
  const LIBRARY = '2历史孔隙';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const nameOf = entry => String(entry?.name || entry?.comment || '').trim();
  const snapshot = entry => JSON.stringify(entry);
  function grouped(entries) {
    const groups = new Map();
    for (const entry of entries) {
      const name = nameOf(entry);
      if (!name) continue;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(entry);
    }
    return groups;
  }
  async function read(api) {
    const [primary, library] = await Promise.all([api.getWorldbook(PRIMARY), api.getWorldbook(LIBRARY)]);
    if (!Array.isArray(primary) || !Array.isArray(library)) throw new Error('双库未返回条目列表');
    return { primary: grouped(primary), library: grouped(library) };
  }
  async function compare() {
    const books = await read(await host());
    const names = new Set([...books.primary.keys(), ...books.library.keys()]);
    return [...names].map(name => {
      const p = books.primary.get(name) || [];
      const l = books.library.get(name) || [];
      const primaryData = p[0] || null;
      const libraryData = l[0] || null;
      let status;
      if (p.length > 1 || l.length > 1 || primaryData && primaryData.uid == null || libraryData && libraryData.uid == null) {
        status = 'ambiguous';
      } else if (primaryData && libraryData) {
        status = primaryData.content === libraryData.content && primaryData.enabled === libraryData.enabled ? 'identical' : 'conflict';
      } else status = primaryData ? 'primary_only' : 'library_only';
      return { name, status, primaryData, libraryData, primaryCount: p.length, libraryCount: l.length };
    });
  }
  function assertCurrent(expected, entries, label) {
    const found = entries.get(expected.name) || [];
    if (found.length !== 1 || snapshot(found[0]) !== snapshot(expected.entry)) throw new Error(`${label}条目已变化，请刷新双库后重试`);
    return found[0];
  }
  async function write(api, book, source, destination, guard) {
    guard?.();
    const { uid: _uid, ...payload } = source;
    if (destination) {
      let touched = false;
      await api.updateWorldbookWith(book, entries => {
        guard?.();
        const matches = entries.filter(entry => nameOf(entry) === nameOf(destination));
        if (matches.length !== 1 || snapshot(matches[0]) !== snapshot(destination)) throw new Error('目标条目已变化，请刷新');
        touched = true;
        return entries.map(entry => entry.uid === destination.uid ? { ...payload, uid: destination.uid } : entry);
      }, { render: 'debounced' });
      if (!touched) throw new Error('目标条目写入未执行');
    } else {
      const current = await api.getWorldbook(book);
      if (current.some(entry => nameOf(entry) === nameOf(source))) throw new Error('目标库已出现同名条目，请刷新');
      guard?.();
      await api.createWorldbookEntries(book, [payload], { render: 'debounced' });
    }
  }
  async function remove(api, book, entry, guard) {
    guard?.();
    let removed = false;
    await api.deleteWorldbookEntries(book, candidate => {
      guard?.();
      if (candidate.uid !== entry.uid) return false;
      if (snapshot(candidate) !== snapshot(entry)) throw new Error('来源条目已变化，请刷新');
      removed = true;
      return true;
    }, { render: 'debounced' });
    if (!removed) throw new Error('来源条目没有被删除，请刷新');
  }
  let queue = Promise.resolve();
  function act(action, selected, options = {}) {
    const task = queue.then(async () => {
      if (!selected || selected.status === 'ambiguous') throw new Error('同名条目不唯一，无法安全操作');
      const api = await host();
      const books = await read(api);
      const primary = selected.primaryData ? assertCurrent({ name: selected.name, entry: selected.primaryData }, books.primary, '源堡') : null;
      const library = selected.libraryData ? assertCurrent({ name: selected.name, entry: selected.libraryData }, books.library, '历史孔隙') : null;
      if (!primary && (books.primary.get(selected.name)?.length || 0) || !library && (books.library.get(selected.name)?.length || 0)) throw new Error('双库条目已变化，请刷新');
      options.guard?.();
      if (action === 'toggle' && primary) {
        await write(api, PRIMARY, { ...primary, enabled: !primary.enabled }, primary, options.guard);
      } else if (action === 'promote' && library && !primary) {
        await write(api, PRIMARY, { ...library, enabled: true }, null, options.guard);
        await remove(api, LIBRARY, library, options.guard);
      } else if (action === 'demote' && primary) {
        await write(api, LIBRARY, { ...primary, enabled: false }, library, options.guard);
        await remove(api, PRIMARY, primary, options.guard);
      } else if (action === 'overwrite_primary' && library && primary) {
        await write(api, PRIMARY, library, primary, options.guard);
      } else if (action === 'overwrite_library' && primary && library) {
        await write(api, LIBRARY, { ...primary, enabled: false }, library, options.guard);
      } else if (action === 'delete') {
        if (primary) await remove(api, PRIMARY, primary, options.guard);
        if (library) await remove(api, LIBRARY, library, options.guard);
      } else throw new Error('当前条目状态不支持该操作，请刷新');
      return { action, name: selected.name };
    });
    queue = task.catch(() => {});
    return task;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    compare, act,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
