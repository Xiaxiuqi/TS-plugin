(() => {
  'use strict';

  const KEY = 'cryptLord.aiContextConfig';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const STORAGE_KEY = 'cryptLord.aiContextConfig';
  const DOMAINS = Object.freeze(['stat_data', 'npc_data', 'world_data']);
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) {
    if (value === undefined) return undefined;
    return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
  }
  function normalizePath(value) {
    return String(value || '').trim().replace(/^\.+|\.+$/g, '').replace(/\[(\d+)\]/g, '.$1').replace(/\.{2,}/g, '.');
  }
  function normalizePaths(value) {
    const seen = new Set();
    return Object.freeze((Array.isArray(value) ? value : [])
      .map(normalizePath)
      .filter(path => DOMAINS.some(domain => path === domain || path.startsWith(`${domain}.`)))
      .filter(path => {
        if (!path || seen.has(path)) return false;
        seen.add(path);
        return true;
      })
      .slice(0, 600));
  }
  function normalize(value) {
    const source = record(value) ? value : {};
    return Object.freeze({
      version: 1,
      hiddenFields: normalizePaths(source.hiddenFields),
      lockedFields: normalizePaths(source.lockedFields),
    });
  }
  function pathSegments(value) { return normalizePath(value).split('.').filter(Boolean); }
  function patternMatches(pattern, path) {
    const expected = pathSegments(pattern);
    const actual = pathSegments(path);
    if (!expected.length || !actual.length) return false;
    const visit = (atExpected, atActual) => {
      while (atExpected < expected.length) {
        const part = expected[atExpected];
        if (part === '**') {
          if (atExpected === expected.length - 1) return true;
          for (let cursor = atActual; cursor <= actual.length; cursor += 1) {
            if (visit(atExpected + 1, cursor)) return true;
          }
          return false;
        }
        if (atActual >= actual.length || (part !== '*' && part !== actual[atActual])) return false;
        atExpected += 1;
        atActual += 1;
      }
      // A regular branch path covers all of its descendants, matching the
      // original tree checkbox behavior.
      return true;
    };
    return visit(0, 0);
  }
  function matches(paths, path) { return paths.some(pattern => patternMatches(pattern, path)); }
  function isLocked(config, path) { return matches(normalize(config).lockedFields, path); }
  function isHidden(config, path) {
    const normalized = normalize(config);
    return matches(normalized.hiddenFields, path) || matches(normalized.lockedFields, path);
  }
  function filterData(data, config) {
    const next = clone(record(data) ? data : {}) || {};
    const normalized = normalize(config);
    for (const domain of DOMAINS) {
      if (!record(next[domain]) && !Array.isArray(next[domain])) continue;
      const prune = (container, prefix) => {
        if (!container || typeof container !== 'object') return;
        for (const key of Object.keys(container)) {
          const path = `${prefix}.${key}`;
          if (isHidden(normalized, path)) {
            if (Array.isArray(container)) container.splice(Number(key), 1);
            else delete container[key];
            continue;
          }
          prune(container[key], path);
        }
      };
      prune(next[domain], domain);
    }
    return next;
  }
  function allPaths(data) {
    const results = [];
    const visit = (value, path) => {
      if (!value || typeof value !== 'object') return;
      for (const key of Object.keys(value)) {
        const child = `${path}.${key}`;
        results.push(child);
        visit(value[key], child);
      }
    };
    for (const domain of DOMAINS) {
      if (data?.[domain] && typeof data[domain] === 'object') visit(data[domain], domain);
    }
    return Object.freeze(results);
  }
  async function hostApi() { return contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 }); }
  function scriptOptions(host) { return host.scriptVariableOptions?.() || { type: 'script' }; }
  async function readConfig() {
    const host = await hostApi();
    try { return normalize(host.getVariables(scriptOptions(host))?.[STORAGE_KEY]); }
    catch (error) {
      console.warn(`[${KEY}] 无法读取脚本变量，使用默认可见性配置`, error);
      return normalize({});
    }
  }
  async function saveConfig(value) {
    const host = await hostApi();
    const options = scriptOptions(host);
    const variables = clone(host.getVariables(options)) || {};
    const next = normalize(value);
    variables[STORAGE_KEY] = clone(next);
    host.replaceVariables(variables, options);
    return next;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, storage: 'script-variables', domains: DOMAINS }); },
    defaults: () => normalize({}),
    normalize,
    normalizePath,
    allPaths,
    patternMatches,
    isHidden,
    isLocked,
    filterData,
    readConfig,
    saveConfig,
    dispose() { try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
