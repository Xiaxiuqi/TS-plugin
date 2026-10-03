(() => {
  'use strict';

  const KEY = 'cryptLord.variablePatch';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const DOMAINS = Object.freeze(['stat_data', 'npc_data', 'world_data']);

  function clone(value) {
    if (typeof window.structuredClone === 'function') return window.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function decode(pointer) {
    return String(pointer || '').split('/').slice(1).map(key => key.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  function content(rawText, options = {}) {
    const matches = Array.from(String(rawText || '').matchAll(/<UpdateVariable\b[^>]*>([\s\S]*?)<\/UpdateVariable>/gi));
    if (matches.length) return matches[matches.length - 1][1].replace(/<\/?JSONPatch\b[^>]*>/gi, '').replace(/```(?:json)?/gi, '').trim();
    if (!options.allowBare) return '';
    const clean = String(rawText || '').replace(/<(?:thinking|reasoning|think)\b[^>]*>[\s\S]*?<\/(?:thinking|reasoning|think)>/gi, '');
    const patch = Array.from(clean.matchAll(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/gi)).at(-1)?.[1];
    const candidate = patch || clean;
    const start = candidate.search(/[\[{]/);
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
    return start >= 0 && end > start ? candidate.slice(start, end + 1).trim() : '';
  }

  function commands(raw, options = {}) {
    const source = content(raw, options);
    if (!source) return [];
    let parsed;
    try { parsed = JSON.parse(source.replace(/,\s*([}\]])/g, '$1')); } catch { return []; }
    if (Array.isArray(parsed)) return parsed.map(command => ({ domain: 'stat_data', command }));
    if (!parsed || typeof parsed !== 'object') return [];
    return DOMAINS.flatMap(domain => Array.isArray(parsed[domain]) ? parsed[domain].map(command => ({ domain, command })) : []);
  }

  function updateTag(raw) {
    const source = content(raw, { allowBare: true });
    let parsed;
    try { parsed = JSON.parse(source.replace(/,\s*([}\]])/g, '$1')); } catch { return ''; }
    if (!Array.isArray(parsed) && (!parsed || typeof parsed !== 'object' ||
      !DOMAINS.some(domain => Array.isArray(parsed[domain])))) return '';
    const grouped = { stat_data: [], npc_data: [], world_data: [] };
    commands(raw, { allowBare: true }).forEach(({ domain, command }) => {
      const target = resolveDomain(domain, command?.path);
      if (!DOMAINS.includes(target.domain) || !target.parts.length) return;
      grouped[target.domain].push({ ...command, path: `/${target.parts.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}` });
    });
    return `<UpdateVariable>\n<JSONPatch>\n${JSON.stringify(grouped, null, 2)}\n</JSONPatch>\n</UpdateVariable>`;
  }

  function embedUpdate(message, raw) {
    const tag = updateTag(raw);
    if (!tag) return String(message || '');
    const narrative = String(message || '').replace(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi, '').trimEnd();
    return `${narrative}\n\n${tag}`;
  }

  function resolveDomain(domain, path) {
    const parts = decode(path);
    if (DOMAINS.includes(parts[0])) return { domain: parts.shift(), parts };
    return { domain, parts };
  }

  function commandPath(entry) {
    const target = resolveDomain(entry?.domain, entry?.command?.path);
    return [target.domain, ...target.parts].join('.');
  }

  function parentAt(rootValue, parts, create) {
    let current = rootValue;
    for (const part of parts.slice(0, -1)) {
      if (!current || typeof current !== 'object') return null;
      if (current[part] === undefined && create) current[part] = {};
      current = current[part];
    }
    return current && typeof current === 'object' ? current : null;
  }

  function applyCommand(data, fallbackDomain, command) {
    if (!command || typeof command !== 'object') return false;
    const op = String(command.op || '').toLowerCase();
    if (!['add', 'replace', 'remove'].includes(op)) return false;
    const target = resolveDomain(fallbackDomain, command.path);
    if (!DOMAINS.includes(target.domain) || !target.parts.length) return false;
    if (!data[target.domain] || typeof data[target.domain] !== 'object' || Array.isArray(data[target.domain])) data[target.domain] = {};
    const parent = parentAt(data[target.domain], target.parts, op !== 'remove');
    if (!parent) return false;
    const key = target.parts[target.parts.length - 1];
    if (op === 'remove') {
      if (!(key in parent)) return false;
      if (Array.isArray(parent)) parent.splice(Number(key), 1); else delete parent[key];
      return true;
    }
    if (Array.isArray(parent) && key === '-') parent.push(clone(command.value));
    else parent[key] = clone(command.value);
    return true;
  }

  function apply(rawText, previousData = {}, options = {}) {
    const next = clone(previousData && typeof previousData === 'object' ? previousData : {});
    DOMAINS.forEach(domain => { if (!next[domain] || typeof next[domain] !== 'object' || Array.isArray(next[domain])) next[domain] = {}; });
    const rejected = [];
    const applied = commands(rawText, options).filter(entry => {
      const path = commandPath(entry);
      if (typeof options.shouldApply === 'function' && !options.shouldApply({ ...entry, path })) {
        rejected.push(Object.freeze({ ...entry, path }));
        return false;
      }
      return applyCommand(next, entry.domain, entry.command);
    }).length;
    return Object.freeze({ data: next, applied, rejected: Object.freeze(rejected) });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, domains: DOMAINS }); },
    commands,
    commandPath,
    apply,
    updateTag,
    embedUpdate,
    dispose() { try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
