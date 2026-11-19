(() => {
  'use strict';
  const KEY = 'cryptLord.aiContextConfig';
  const STORAGE_KEY = 'cryptLord.aiContextConfig';
  const LEGACY_NAME = '【配置】变量对AI的可见性';
  const DOMAINS = Object.freeze(['stat_data', 'npc_data', 'world_data']);
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw new Error('变量 AI 配置契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let queue = Promise.resolve(), disposed = false, epoch = 0;
  const receipts = new WeakMap(), subscriptions = [], after = modules['cryptLord.afterNativeHost'];
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const canonical = value => {
    if (Object.prototype.toString.call(value) === '[object RegExp]') return [value.source, value.flags];
    if (Array.isArray(value)) return value.map(canonical);
    if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function check(guard) {
    if (disposed || modules[KEY] !== api || guard && !guard()) throw Error('配置操作已取消。');
  }
  const scopedGuard = (guard, token = epoch) => () => token === epoch && (!guard || guard());
  function sourceFor(host) {
    return { host, token: epoch, document: after?.getHost?.()?.document, options: clone(optionsFor(host)) };
  }
  function checkSource(source, guard) {
    check(guard);
    if (source.token !== epoch || modules['cryptLord.hostApi'] !== source.host ||
      modules['cryptLord.afterNativeHost'] !== after || after?.getHost?.()?.document !== source.document)
      throw Error('配置来源已变化，请重新读取。');
    if (!same(optionsFor(source.host), source.options)) throw Error('变量 AI 配置的脚本身份已改变，请重新读取。');
  }
  function normalizePath(value) {
    return String(value || '').trim().replace(/^\.+|\.+$/g, '').replace(/\[(\d+)\]/g, '.$1').replace(/\.{2,}/g, '.');
  }
  function normalize(value) {
    const source = value === undefined ? {} : value;
    if (!record(source) || source.mode && source.mode !== 'blacklist' ||
      source.version !== undefined && ![1, '1', '1.0'].includes(source.version)) throw Error('变量 AI 配置格式或版本无效，请检查配置来源。');
    const paths = key => {
      if (source[key] !== undefined && (!Array.isArray(source[key]) || source[key].some(item => typeof item !== 'string'))) throw Error(`配置 ${key} 必须是路径字符串列表。`);
      return [...new Set((source[key] || []).map(normalizePath).filter(Boolean))];
    };
    const { revision, warning, ...fields } = source;
    return { ...clone(fields), mode: 'blacklist', version: 1, hiddenFields: paths('hiddenFields'), lockedFields: paths('lockedFields') };
  }
  function patternMatches(pattern, path) {
    const expected = normalizePath(pattern).split('.');
    const actual = normalizePath(path).split('.');
    function visit(i, j) {
      if (i === expected.length) return true;
      const part = expected[i];
      if (part === '**') {
        if (i === expected.length - 1) return true;
        for (let next = j; next <= actual.length; next++) if (visit(i + 1, next)) return true;
        return false;
      }
      const literal = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = part.includes('*')
        ? new RegExp(`^${part.split('*').map(literal).join('[^.]+')}$`).test(actual[j] || '')
        : part === actual[j];
      return j < actual.length && matches && visit(i + 1, j + 1);
    }
    return Boolean(pattern && path) && visit(0, 0);
  }
  const isLocked = (config, path) => normalize(config).lockedFields.some(pattern => patternMatches(pattern, path));
  const isHidden = (config, path) => {
    const policy = normalize(config);
    return [...policy.hiddenFields, ...policy.lockedFields].some(pattern => patternMatches(pattern, path));
  };
  function allPaths(data) {
    const paths = [];
    const visit = (value, prefix) => {
      if (!value || typeof value !== 'object') return;
      for (const key of Object.keys(value)) {
        const path = `${prefix}.${key}`;
        paths.push(path);
        visit(value[key], path);
      }
    };
    for (const domain of DOMAINS) visit(data?.[domain], domain);
    return paths;
  }
  function invalidFields(data, config) {
    const paths = allPaths(data);
    return normalize(config).hiddenFields.filter(pattern => !paths.some(path => patternMatches(pattern, path)));
  }
  function filterData(data, config) {
    const next = clone(record(data) ? data : {});
    const policy = normalize(config);
    function prune(value, path) {
      if (!value || typeof value !== 'object') return value;
      // Keep array indices stable so the model cannot address a different item.
      const keys = Object.keys(value);
      for (const key of keys) {
        const child = `${path}.${key}`;
        if (isHidden(policy, child)) {
          if (Array.isArray(value)) value[key] = null;
          else delete value[key];
        } else prune(value[key], child);
      }
      return value;
    }
    for (const domain of DOMAINS) {
      if (isHidden(policy, domain)) delete next[domain];
      else prune(next[domain], domain);
    }
    return next;
  }
  function affectsLocked(config, path, data, command = {}) {
    const policy = normalize(config);
    const normalized = normalizePath(path);
    if (isLocked(policy, normalized)) return true;
    const children = allPaths(data);
    if (children.some(child => child.startsWith(`${normalized}.`) && isLocked(policy, child))) return true;
    const containsLockedValue = (value, prefix) => value && typeof value === 'object' &&
      Object.keys(value).some(key => isLocked(policy, `${prefix}.${key}`) || containsLockedValue(value[key], `${prefix}.${key}`));
    if (containsLockedValue(command.value, normalized)) return true;
    // A parent replacement must not erase a dormant exact or wildcard lock.
    for (const pattern of policy.lockedFields) {
      const parts = normalizePath(pattern).split('.');
      const target = normalized.split('.');
      if (target.every((part, i) => parts[i] === part || parts[i] === '*' || parts[i] === '**')) return true;
    }
    if (['add', 'remove'].includes(command.op)) {
      const parts = normalized.split('.');
      let parent = data;
      for (const part of parts.slice(0, -1)) parent = parent?.[part];
      const prefix = parts.slice(0, -1).join('.');
      if (Array.isArray(parent) && children.some(child => child.startsWith(`${prefix}.`) && isLocked(policy, child))) return true;
    }
    return false;
  }
  function optionsFor(host) {
    const options = host.scriptVariableOptions?.() || { type: 'script', script_id: host.getScriptId?.() };
    if (options.type !== 'script' || !options.script_id) throw Error('变量 AI 配置未能确定 script_id，已停止读写。');
    return options;
  }
  async function legacy(host) {
    if (!host.getCharWorldbookNames || !host.getWorldbook) return null;
    const binding = clone(await host.getCharWorldbookNames('current')), book = binding?.primary;
    if (!book) return null;
    const rows = await host.getWorldbook(book);
    if (!Array.isArray(rows)) throw Error('原版配置世界书读取失败。');
    const entries = rows.filter(entry => (entry.comment ?? entry.name) === LEGACY_NAME);
    if (!same(await host.getCharWorldbookNames('current'), binding)) throw Error('原版配置的世界书绑定已改变，请重新读取。');
    if (entries.length > 1) throw Error('原版变量可见性配置重名，无法确定来源。');
    return { book, binding, entry: entries[0] ? clone(entries[0]) : null };
  }
  async function snapshot(host, guard) {
    check(guard);
    const captured = sourceFor(host);
    const options = optionsFor(host);
    const variables = await host.getVariables(options);
    check(guard);
    checkSource(captured, guard);
    if (!record(variables)) throw Error('读取脚本变量失败。');
    const exists = Object.hasOwn(variables, STORAGE_KEY);
    const source = exists ? null : await legacy(host);
    check(guard);
    checkSource(captured, guard);
    if (!same(optionsFor(host), options)) throw Error('变量 AI 配置的脚本身份已改变，请重新读取。');
    let raw = variables[STORAGE_KEY];
    if (source?.entry) {
      try { raw = JSON.parse(source.entry.content); } catch { throw Error('原版变量可见性配置 JSON 损坏。'); }
    }
    const revision = { options: clone(options), exists, raw: clone(variables[STORAGE_KEY]), source };
    receipts.set(revision, { captured, public: clone(revision) });
    return { config: normalize(raw), revision };
  }
  async function readSnapshot(guard) {
    guard = scopedGuard(guard);
    await queue;
    check(guard);
    return snapshot(await hostApi(), guard);
  }
  async function readConfig() { return (await readSnapshot()).config; }
  function saveConfig(value, revision, guard) {
    const next = normalize(value), expected = clone(revision);
    guard = scopedGuard(guard);
    const proof = revision ? receipts.get(revision) : null;
    const execute = async () => {
      check(guard);
      if (revision && (!proof || proof.revoked || !same(proof.public, expected)))
        throw Error('配置来源凭据无效或配置已被别处更改，请重新读取。');
      if (proof) checkSource(proof.captured, guard);
      const host = await hostApi();
      const current = await snapshot(host, guard);
      const baseline = expected || current.revision;
      const captured = proof?.captured || receipts.get(current.revision).captured;
      if (!same(current.revision, baseline)) throw Error('配置已被别处更改，请重新读取。');
      const saved = { ...(record(baseline.raw) ? clone(baseline.raw) : {}), ...next, lastModified: new Date().toISOString() };
      let transformed = false, writeError = null;
      try {
        await host.updateVariablesWith(async variables => {
          checkSource(captured, guard);
          if (!record(variables) || Object.hasOwn(variables, STORAGE_KEY) !== baseline.exists || !same(variables[STORAGE_KEY], baseline.raw) ||
            baseline.source && !same(await legacy(host), baseline.source)) throw Error('配置已被别处更改，请重新读取。');
          checkSource(captured, guard);
          transformed = true;
          return { ...variables, [STORAGE_KEY]: clone(saved) };
        }, baseline.options);
      } catch (error) { writeError = error; }
      if (writeError && !transformed) { writeError.requiresReload = false; throw writeError; }
      let result;
      try {
        checkSource(captured, guard);
        result = await snapshot(host, guard);
        checkSource(captured, guard);
        if (!transformed || !same(result.revision.raw, saved) || writeError && same(result.revision, baseline)) {
          if (writeError && same(result.revision, baseline)) writeError.requiresReload = false;
          throw writeError || Error('提交后配置与保存值不一致。');
        }
      } catch (error) {
        if (writeError) { writeError.requiresReload ??= true; if (writeError.requiresReload && proof) proof.revoked = true; throw writeError; }
        if (proof) proof.revoked = true;
        return { ...saved, warning: '配置已提交，但复核失败，请重新读取。', revision: null };
      }
      if (proof) proof.revoked = true;
      return { ...saved, revision: result.revision, warning: writeError ? '配置已保存，但宿主未返回成功响应。' : '' };
    };
    const task = queue.then(execute);
    queue = task.catch(() => {});
    return task;
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed, storage: 'script-variables', domains: DOMAINS }),
    defaults: () => normalize(), normalize, normalizePath, allPaths, patternMatches, isHidden, isLocked,
    invalidFields, filterData, affectsLocked, readConfig, readSnapshot, saveConfig,
    dispose() { disposed = true; epoch++; subscriptions.splice(0).forEach(item => item.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  const chat = after?.tavernEvents()?.CHAT_CHANGED;
  if (chat) subscriptions.push(after.bindEvent(chat, () => { epoch++; }));
  contract.initializeGlobal(KEY, api);
})();
