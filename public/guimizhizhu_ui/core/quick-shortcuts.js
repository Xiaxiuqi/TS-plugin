(() => {
  'use strict';

  const KEY = 'cryptLord.quickShortcuts';
  const HOST_KEY = 'cryptLord.hostApi';
  const CUSTOM_BOOK = '【源堡】玩家自建内容';
  const COMMAND_ENTRY = '[快捷指令]';
  const STATE_ENTRY = '[快捷指令状态]';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function parse(content) {
    const text = String(content || '').trim();
    if (!text) return [];
    if (text.includes('<cmd>')) {
      return [...text.matchAll(/<cmd>([\s\S]*?)<\/cmd>/g)].map(match => match[1].trim()).filter(Boolean);
    }
    return text.split(/\r?\n/).map(line => line.trim().replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  }

  const initialState = () => ({ version: 1, isKeepShortcutsEnabled: false, pendingSupplementary: [] });
  function normalizeState(raw) {
    let value = raw;
    try { if (typeof value === 'string') value = JSON.parse(value); } catch { value = null; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return initialState();
    return {
      version: 1,
      isKeepShortcutsEnabled: value.isKeepShortcutsEnabled === true,
      pendingSupplementary: [...new Set((Array.isArray(value.pendingSupplementary) ? value.pendingSupplementary : [])
        .filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))],
    };
  }

  function entryFor(entries, name) {
    const matches = entries?.filter(item => String(item?.comment || item?.name || '').trim() === name) || [];
    if (matches.length > 1) throw new Error(`${name} 世界书条目重名，请先整理`);
    return matches[0] || null;
  }

  function contentFor(commands) {
    return commands.map(command => `<cmd>\n${command}\n</cmd>`).join('\n\n');
  }

  let queue = Promise.resolve();
  function serialize(work) {
    const task = queue.then(work);
    queue = task.catch(() => {});
    return task;
  }

  async function readCustom(host) {
    let entries;
    try { entries = await host.getWorldbook(CUSTOM_BOOK); }
    catch (error) {
      if (/未能找到世界书|worldbook not found|lorebook not found/i.test(String(error?.message || error))) return null;
      throw error;
    }
    if (entries == null) return null;
    if (!Array.isArray(entries)) throw new Error('玩家自建世界书不可用');
    return entries;
  }

  async function writeEntry(host, name, content, expectedRevision) {
    let entries = await readCustom(host);
    if (!entries) {
      await host.createWorldbook(CUSTOM_BOOK);
      entries = await readCustom(host);
      if (!entries) throw new Error('无法创建玩家自建世界书');
    }
    const entry = entryFor(entries, name);
    const revision = entry ? String(entry.content || '') : null;
    if (expectedRevision !== undefined && revision !== expectedRevision) throw new Error(`${name} 已被外部修改，请重新读取`);
    if (entry) {
      if (entry.uid == null) throw new Error(`${name} 缺少 UID`);
      await host.updateWorldbookWith(CUSTOM_BOOK, current => {
        const currentEntry = entryFor(current, name);
        if (!currentEntry || currentEntry.uid !== entry.uid || String(currentEntry.content || '') !== revision) {
          throw new Error(`${name} 已被外部修改，请重新读取`);
        }
        return current.map(item => item.uid === entry.uid ? { ...item, content } : item);
      });
    } else {
      if (entryFor(await readCustom(host), name)) throw new Error(`${name} 已被其他操作创建，请重新读取`);
      await host.createWorldbookEntries(CUSTOM_BOOK, [{
        name, comment: name, keys: [name], content, enabled: false,
        strategy: { type: 'selective' },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
      }]);
    }
  }

  async function load() {
    const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
    const custom = await readCustom(host) || [];
    const commandEntry = entryFor(custom, COMMAND_ENTRY);
    const stateEntry = entryFor(custom, STATE_ENTRY);
    const state = normalizeState(stateEntry?.content);
    let commands = parse(commandEntry?.content);
    let source = 'custom';
    if (!commandEntry) {
      commands = parse(entryFor(await host.getWorldbook('1源堡'), COMMAND_ENTRY)?.content);
      source = commands.length ? 'primary-fallback' : '';
    }
    state.pendingSupplementary = state.pendingSupplementary.filter(command => commands.includes(command));
    return { commands, source, state, revisions: {
      commands: commandEntry ? String(commandEntry.content || '') : null,
      state: stateEntry ? String(stateEntry.content || '') : null,
    } };
  }

  async function saveCommands(commands, expectedRevision) {
    const normalized = commands.map(command => String(command ?? '').trim()).filter(Boolean);
    if (new Set(normalized).size !== normalized.length) throw new Error('快捷指令内容不能重复，否则无法区分补充勾选');
    return serialize(async () => {
      const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
      await writeEntry(host, COMMAND_ENTRY, contentFor(normalized), expectedRevision);
      return normalized;
    });
  }

  async function saveState(value, expectedRevision) {
    const state = normalizeState(value);
    return serialize(async () => {
      const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
      await writeEntry(host, STATE_ENTRY, JSON.stringify(state, null, 2), expectedRevision);
      return state;
    });
  }

  async function consumeSupplementary(snapshot, expectedRevision) {
    if (!snapshot?.length) return;
    return serialize(async () => {
      const host = await contract.waitGlobalInitialized(HOST_KEY, { timeoutMs: 10000 });
      const entry = entryFor(await readCustom(host) || [], STATE_ENTRY);
      const revision = entry ? String(entry.content || '') : null;
      if (expectedRevision !== undefined && revision !== expectedRevision) return false;
      const current = normalizeState(entry?.content);
      if (!current.isKeepShortcutsEnabled) {
        current.pendingSupplementary = current.pendingSupplementary.filter(command => !snapshot.includes(command));
        await writeEntry(host, STATE_ENTRY, JSON.stringify(current, null, 2), revision);
      }
      return current;
    });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    parse, load, saveCommands, saveState, consumeSupplementary,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
