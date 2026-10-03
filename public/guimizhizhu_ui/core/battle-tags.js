(() => {
  'use strict';
  const KEY = 'cryptLord.battleTags';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const names = ['【配置】标签映射', '【配置】标签伤害修正', '【配置】标签治疗修正'];
  const empty = () => ({ mapping: {}, damage: {}, healing: {} });
  function normalize(value) {
    return record(value) ? value : {};
  }
  async function load() {
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    if (typeof host.getWorldbookNames !== 'function' || typeof host.getWorldbook !== 'function') return empty();
    const books = await host.getWorldbookNames();
    const result = empty();
    const found = new Set();
    for (const book of Array.isArray(books) ? books : []) {
      let entries;
      try { entries = await host.getWorldbook(book); }
      catch { continue; }
      for (const entry of Array.isArray(entries) ? entries : []) {
        const index = names.indexOf(String(entry?.name || entry?.comment || '').trim());
        if (index < 0 || found.has(index)) continue;
        try {
          result[['mapping', 'damage', 'healing'][index]] = normalize(JSON.parse(entry.content));
          found.add(index);
        } catch { /* An invalid optional entry never invents combat modifiers. */ }
      }
      if (found.size === names.length) break;
    }
    return result;
  }
  function add(actor, name, duration = 1, stacks = 1, maxStacks = 99, source = 'applied') {
    name = String(name || '').trim();
    duration = Math.max(0, Math.min(99, Math.floor(Number(duration) || 0)));
    stacks = Math.max(1, Math.floor(Number(stacks) || 1));
    maxStacks = Math.max(1, Math.floor(Number(maxStacks) || 99));
    if (!actor || !name) return false;
    actor.tags = Array.isArray(actor.tags) ? actor.tags : [];
    const tag = actor.tags.find(row => row.name === name);
    if (tag) {
      const added = tag.stacks + stacks > (tag.maxStacks || maxStacks) ? 0 : stacks;
      tag.stacks += added;
      tag.duration = Math.max(tag.duration, duration);
      if (source === 'inherent') tag.$inherentStacks = (tag.$inherentStacks || 0) + added;
    } else actor.tags.push({ name, duration, stacks: Math.min(stacks, maxStacks), maxStacks,
      source, $inherentStacks: source === 'inherent' ? Math.min(stacks, maxStacks) : 0 });
    return true;
  }
  function remove(actor, name, stacks = Infinity) {
    if (!Array.isArray(actor?.tags)) return false;
    const tag = actor.tags.find(row => row.name === name);
    if (!tag) return false;
    if (Number.isFinite(stacks) && stacks > 0) {
      tag.stacks -= Math.floor(stacks);
      tag.$inherentStacks = Math.min(tag.$inherentStacks || 0, Math.max(0, tag.stacks));
      if (tag.stacks > 0) return true;
    }
    actor.tags = actor.tags.filter(row => row !== tag);
    return true;
  }
  function sync(actor, sequence, mapping) {
    if (!actor) return;
    actor.tags = Array.isArray(actor.tags) ? actor.tags : [];
    for (const tag of [...actor.tags]) {
      const inherent = Math.min(tag.stacks || 0, tag.$inherentStacks || 0);
      if (inherent) remove(actor, tag.name, inherent);
      const remaining = actor.tags.find(row => row.name === tag.name);
      if (remaining) remaining.$inherentStacks = 0;
    }
    for (const [keyword, config] of Object.entries(normalize(mapping))) {
      if (!keyword || !String(sequence || '').includes(keyword) || !Array.isArray(config?.tags)) continue;
      for (const name of config.tags) add(actor, name, config.duration || 99, 1, config.maxStacks || 99, 'inherent');
    }
  }
  function tick(actors) {
    for (const actor of actors || []) {
      actor.tags = (Array.isArray(actor.tags) ? actor.tags : []).filter(tag => {
        if (tag.duration > 0) tag.duration--;
        return tag.duration > 0;
      });
    }
  }
  function modifier(attacker, defender, skill, relations) {
    if (!record(relations)) return 0;
    const left = [...(attacker.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name),
      ...(Array.isArray(skill?.skillTags || skill?.技能标签) ? skill.skillTags || skill.技能标签 : [])];
    const right = (defender.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name);
    let total = 0;
    for (const from of left) for (const to of right) {
      if (relations[from]?.[to] == null) continue;
      const value = Number(relations[from]?.[to]);
      if (Number.isFinite(value)) total += value;
    }
    return Math.max(-.75, Math.min(1.5, total));
  }
  function applySkill(actor, target, skill, hit) {
    if (!hit || !skill) return;
    const recipient = skill.targetType === 'self' ? actor : target;
    if (!recipient) return;
    for (const row of skill.applyTags || skill.施加标签 || []) {
      const name = row?.name || row?.名称;
      if (!name) continue;
      if (row.duration !== undefined || row.stacks !== undefined)
        add(recipient, name, row.duration || 1, row.stacks || 1, row.maxStacks || 99);
      else if (row.durationChange !== undefined) {
        const tag = recipient.tags?.find(item => item.name === name);
        if (tag) tag.duration = Math.max(0, Math.min(99, tag.duration + Number(row.durationChange || 0)));
      } else if (row.stacksChange < 0) remove(recipient, name, -row.stacksChange);
      else if (row.stacksChange > 0) add(recipient, name, 0, row.stacksChange, 99);
    }
    for (const name of skill.removeTags || skill.移除标签 || []) {
      if (name === '*') recipient.tags = [];
      else remove(recipient, name);
    }
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    load, add, remove, sync, tick, modifier, applySkill,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
