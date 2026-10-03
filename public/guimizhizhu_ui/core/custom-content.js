(() => {
  'use strict';
  const KEY = 'cryptLord.customContent';
  const BOOK = '【源堡】玩家自建内容';
  const ENTRY = '[自建提示词]';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const nameOf = item => String(item?.name || item?.comment || '').trim();
  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  function normalize(list) {
    const names = new Set();
    return (Array.isArray(list) ? list : []).filter(record).map(item => ({
      name: String(item.name || '未命名提示词').trim() || '未命名提示词',
      prompt: String(item.prompt || ''),
      preset: record(item.preset) ? clone(item.preset) : null,
      locked: item.locked === true,
    })).filter(item => {
      if (names.has(item.name)) throw new Error(`预设「${item.name}」重名，请先在世界书中修复；不会覆盖原数据`);
      names.add(item.name);
      return true;
    });
  }
  async function readStorage(api) {
    let entries;
    try { entries = await api.getWorldbook(BOOK); }
    catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
        return { exists: false, entry: null, content: '' };
      }
      throw error;
    }
    if (!Array.isArray(entries)) throw new Error('自建世界书未返回条目列表');
    const matches = entries.filter(item => nameOf(item) === ENTRY || String(item.comment || '').trim() === ENTRY);
    if (matches.length > 1) throw new Error('自建提示词条目不唯一，请先在世界书中修复');
    return { exists: true, entry: matches[0] || null, content: String(matches[0]?.content || '') };
  }
  async function loadPresets() {
    const stored = await readStorage(await host());
    let parsed = [];
    if (stored.content.trim()) {
      try { parsed = JSON.parse(stored.content); }
      catch { throw new Error('自建提示词不是有效 JSON，不会覆盖原条目'); }
    }
    return { presets: normalize(parsed), revision: stored.content };
  }
  let queue = Promise.resolve();
  function savePresets(presets, revision) {
    const task = queue.then(async () => {
      const api = await host();
      const stored = await readStorage(api);
      if (revision !== undefined && stored.content !== revision) throw new Error('提示词库已在别处改变，请重新读取');
      let previous = [];
      if (stored.content.trim()) {
        try { previous = normalize(JSON.parse(stored.content)); }
        catch { throw new Error('原提示词库已损坏，不会覆盖'); }
      }
      const normalized = normalize(presets);
      for (const item of previous.filter(item => item.locked)) {
        const next = normalized.find(candidate => candidate.name === item.name);
        if (!next || JSON.stringify(next) !== JSON.stringify(item)) throw new Error(`预设「${item.name}」已锁定，不能修改或删除`);
      }
      const content = JSON.stringify(normalized, null, 2);
      if (!stored.exists) {
        await api.createWorldbook(BOOK);
        if ((await readStorage(api)).entry) throw new Error('提示词条目已由别处创建，请重新读取');
      }
      if (stored.entry) {
        if (stored.entry.uid == null) throw new Error('预设条目缺少 UID');
        let changed = false;
        await api.updateWorldbookWith(BOOK, entries => entries.map(entry => {
          if (entry.uid !== stored.entry.uid) return entry;
          if (String(entry.content || '') !== stored.content) throw new Error('预设条目已变化，请重新读取');
          changed = true;
          return { ...entry, content };
        }), { render: 'debounced' });
        if (!changed) throw new Error('预设条目已被移除，请重新读取');
      } else {
        if ((await readStorage(api)).entry) throw new Error('预设条目已由别处创建，请重新读取');
        await api.createWorldbookEntries(BOOK, [{
          name: ENTRY, comment: ENTRY, content, enabled: false,
          strategy: { type: 'selective', keys: [ENTRY] },
          position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
        }], { render: 'debounced' });
      }
      return { presets: normalized, revision: content };
    });
    queue = task.catch(() => {});
    return task;
  }
  async function books() {
    const names = await (await host()).getWorldbookNames();
    if (!Array.isArray(names)) throw new Error('宿主未返回世界书列表');
    return names.filter(name => typeof name === 'string' && name.trim());
  }
  async function entriesFor(book) {
    const entries = await (await host()).getWorldbook(book);
    if (!Array.isArray(entries)) throw new Error('世界书未返回条目列表');
    return entries;
  }
  async function generate(prompt) {
    const text = String(prompt || '').trim();
    if (!text) throw new Error('提示词不能为空');
    const response = await (await host()).generateRaw({
      ordered_prompts: [{ role: 'user', content: text }],
      should_stream: false,
    });
    const output = typeof response === 'string' ? response : String(response?.content || '');
    if (!output.trim()) throw new Error('模型未返回内容');
    return output.trim();
  }
  function configOf(input, name) {
    const source = record(input) ? input : {};
    const type = source.strategy?.type === 'selective' ? 'selective' : 'constant';
    const keys = (Array.isArray(source.strategy?.keys) ? source.strategy.keys : [])
      .map(key => String(key).trim()).filter(Boolean);
    const positionType = ['before_character_definition', 'after_character_definition', 'at_depth'].includes(source.position?.type)
      ? source.position.type : 'before_character_definition';
    const order = Number(source.position?.order);
    const depth = Number(source.position?.depth);
    return {
      enabled: source.enabled !== false,
      strategy: { type, keys: type === 'selective' ? [...new Set(keys.length ? keys : [name])] : [] },
      position: {
        type: positionType, order: Number.isSafeInteger(order) ? order : 100,
        ...(positionType === 'at_depth' ? { role: 'system', depth: Number.isSafeInteger(depth) && depth >= 0 ? depth : 0 } : {}),
      },
      recursion: {
        prevent_incoming: source.recursion?.prevent_incoming !== false,
        prevent_outgoing: source.recursion?.prevent_outgoing !== false,
        delay_until: null,
      },
    };
  }
  async function write({ book, name, content, mode = 'append', config, expectedUid, guard }) {
    const targetBook = String(book || '').trim();
    const targetName = String(name || '').trim();
    const output = String(content || '').trim();
    if (!targetBook || !targetName || !output) throw new Error('世界书、条目名称和内容均不能为空');
    if (targetBook === BOOK && ['[自建提示词]', '[世界书开关方案]'].includes(targetName)) throw new Error('不能用生成正文覆盖系统配置条目');
    if (!['append', 'overwrite'].includes(mode)) throw new Error('保存方式无效');
    const api = await host();
    if (!(await books()).includes(targetBook)) throw new Error(`目标世界书「${targetBook}」不存在`);
    guard?.();
    const candidates = (await entriesFor(targetBook)).filter(entry => nameOf(entry) === targetName || String(entry.comment || '').trim() === targetName);
    if (candidates.length > 1) throw new Error('目标条目名称不唯一，不能安全写入');
    const existing = candidates[0];
    if (expectedUid !== undefined && (existing?.uid ?? null) !== expectedUid) throw new Error('目标条目已变化，请重新选择');
    if (existing) {
      if (existing.uid == null) throw new Error('目标条目缺少 UID');
      let changed = false;
      await api.updateWorldbookWith(targetBook, entries => {
        guard?.();
        const matches = entries.filter(entry => nameOf(entry) === targetName || String(entry.comment || '').trim() === targetName);
        if (matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(existing)) throw new Error('目标条目已变化，请重新读取');
        return entries.map(entry => {
          if (entry.uid !== existing.uid) return entry;
          changed = true;
          const previous = String(entry.content || '');
          const nextContent = mode === 'append' && previous.trim() ? `${previous}\n\n---\n\n${output}` : output;
          return { ...entry, content: nextContent };
        });
      }, { render: 'debounced' });
      if (!changed) throw new Error('目标条目没有更新');
      return { created: false, name: targetName };
    }
    if ((await entriesFor(targetBook)).some(entry => nameOf(entry) === targetName)) throw new Error('目标条目已由别处创建，请刷新');
    guard?.();
    await api.createWorldbookEntries(targetBook, [{ name: targetName, comment: targetName, content: output, ...configOf(config, targetName) }], { render: 'debounced' });
    return { created: true, name: targetName };
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    normalize, loadPresets, savePresets, books, entriesFor, generate, configOf, write,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
