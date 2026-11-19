(() => {
  'use strict';
  const KEY = 'cryptLord.dlcService';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.hostApi'];
  if (!host || !contract) throw new Error('DLC 服务依赖尚未加载');
  let queue = Promise.resolve();
  let disposed = false, epoch = 0, generating = false;
  const receipts = new WeakMap(), subscriptions = [];
  const after = modules['cryptLord.afterNativeHost'];
  const clone = value => structuredClone(value);
  // Legacy lorebook comments are exposed as names by the modern worldbook API.
  const name = entry => String(entry.comment ?? entry.name ?? '');
  const isDlc = entry => name(entry).includes('【DLC】');
  const preview = entry => entry.content
    ? String(entry.content).substring(0, 100).replace(/\n/g, ' ') + (String(entry.content).length > 100 ? '...' : '')
    : '(无内容)';
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { regex: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const fingerprint = entry => JSON.stringify(canonical(entry));
  function check(guard, token = epoch, source) {
    if (disposed || modules[KEY] !== api || token !== epoch || generating || guard?.() === false)
      throw new DOMException('操作已取消，请重新打开 DLC 管理器。', 'AbortError');
    if (modules['cryptLord.hostApi'] !== host || modules['cryptLord.afterNativeHost'] !== after ||
      source && after?.getHost()?.document !== source.document) throw Error('DLC 来源服务已变化，请重新读取。');
  }
  async function binding(guard, token, source) {
    check(guard, token, source);
    const names = clone(await host.getCharWorldbookNames('current'));
    check(guard, token, source);
    if (!names || typeof names !== 'object' || Array.isArray(names) ||
      names.primary != null && (typeof names.primary !== 'string' || !names.primary.trim()))
      throw Error('角色世界书绑定不可读取。');
    if (source?.binding && fingerprint(names) !== fingerprint(source.binding)) throw Error('角色绑定的主世界书已改变，请重新读取。');
    return names;
  }
  function validRows(entries) {
    if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry !== 'object' || Array.isArray(entry)))
      throw Error('DLC 世界书未返回有效条目列表。');
    return entries;
  }
  function target(entries, uid) {
    validRows(entries);
    const found = entries.filter(entry => entry.uid === uid);
    if (uid == null || found.length !== 1) throw Error('DLC 条目已被别处更改或删除，或 UID 不唯一，请重新读取。');
    return found[0];
  }
  async function read(source, guard) {
    await binding(guard, source.token, source);
    const entries = clone(validRows(await host.getWorldbook(source.binding.primary)));
    await binding(guard, source.token, source);
    return entries;
  }
  async function load(guard) {
    const token = epoch, source = { token, document: after?.getHost()?.document };
    await queue;
    const names = await binding(guard, token, source);
    const bookName = names.primary || null;
    if (!bookName) return { bookName: null, entries: [] };
    source.binding = names;
    const rows = await read(source, guard);
    const entries = rows.filter(isDlc);
    for (const entry of entries) {
      target(rows, entry.uid);
      receipts.set(entry, { source, fingerprint: fingerprint(entry) });
    }
    return { bookName, entries };
  }
  function toggle(bookName, entry, enabled, guard) {
    const receipt = receipts.get(entry);
    const snapshot = clone(entry);
    const expected = fingerprint(snapshot);
    const execute = async () => {
      check(guard);
      if (!receipt || receipt.fingerprint !== expected) throw Error('DLC 来源凭据无效或被修改，请重新读取。');
      const source = receipt.source;
      check(guard, source.token, source);
      if (typeof enabled !== 'boolean' || snapshot.uid == null || !isDlc(snapshot)) throw new Error('DLC 条目或目标状态无效。');
      if (source.binding.primary !== bookName) throw Error('角色绑定的主世界书已改变，请重新读取。');
      const current = target(await read(source, guard), snapshot.uid);
      if (fingerprint(current) !== expected) {
        const error = Error('DLC 条目已被别处更改或删除，请重新读取。');
        error.requiresReload = true;
        throw error;
      }
      if (current.enabled === enabled) return { changed: false, entry: clone(current), warning: '' };
      const wanted = { ...snapshot, enabled };
      let transformed = false, writeError = null, responded = false;
      try {
        await host.updateWorldbookWith(bookName, async entries => {
          if (fingerprint(target(await read(source, guard), snapshot.uid)) !== expected)
            throw Error('DLC 条目已被别处更改或删除，请重新读取。');
          if (fingerprint(target(entries, snapshot.uid)) !== expected) throw Error('DLC 条目已被别处更改或删除，请重新读取。');
          check(guard, source.token, source);
          transformed = true;
          return entries.map(item => item.uid === snapshot.uid ? { ...item, enabled } : item);
        }, { render: 'immediate' });
        responded = true;
      } catch (error) { writeError = error; }
      try {
        const actual = target(await read(source, guard), snapshot.uid);
        check(guard, source.token, source);
        if (!transformed || fingerprint(actual) !== fingerprint(wanted))
          throw writeError || Error('DLC 提交结果未能确认，请重新读取。');
        return { changed: true, entry: actual, warning: writeError ? '开关已保存，但宿主未返回成功响应。' : '' };
      } catch (error) {
        error.requiresReload = true;
        error.submitted = responded;
        throw error;
      }
    };
    const task = queue.then(execute);
    queue = task.catch(() => {});
    return task;
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, disposed, epoch, generating }),
    name, preview, isDlc, load, toggle,
    dispose() {
      disposed = true;
      epoch++;
      subscriptions.splice(0).forEach(sub => sub.stop());
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  const events = after?.tavernEvents();
  const bind = (name, fn) => { if (name) { const sub = after.bindEvent(name, fn); if (sub) subscriptions.push(sub); } };
  bind(events?.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
    if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
    epoch++; generating = true;
  });
  bind(events?.GENERATION_ENDED, () => { generating = false; });
  bind(events?.GENERATION_STOPPED, () => { generating = false; });
})();
