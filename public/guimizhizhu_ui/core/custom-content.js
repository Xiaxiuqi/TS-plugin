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
  const after = modules['cryptLord.afterNativeHost'];
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const nameOf = item => String(item?.name || item?.comment || '').trim();
  const clone = value => structuredClone(value);
  let disposed = false, epoch = 0, generating = false;
  const receipts = new WeakMap(), subscriptions = [];
  let queue = Promise.resolve();
  function usable(guard, token = epoch) {
    if (disposed) throw Error('自建内容服务已卸载');
    if (modules[KEY] !== api || token !== epoch || generating || guard?.() === false)
      throw new DOMException('自建操作已取消，窗口或聊天已变化，请重新读取', 'AbortError');
  }
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function includesFields(actual, expected) {
    if (!record(expected) || Object.prototype.toString.call(expected) === '[object RegExp]')
      return signature(actual) === signature(expected);
    return Object.entries(expected).every(([key, value]) => includesFields(actual?.[key], value));
  }
  function check(source, guard) {
    usable(guard, source.token);
    if (modules['cryptLord.hostApi'] !== source.host || modules['cryptLord.afterNativeHost'] !== after ||
      after?.getHost()?.document !== source.document) throw Error('自建内容来源服务已变化，请重新读取');
  }
  async function capture(guard, token = epoch) {
    usable(guard, token);
    const source = { token, document: after?.getHost()?.document };
    source.host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(source, guard);
    source.binding = clone(await source.host.getCharWorldbookNames('current'));
    check(source, guard);
    if (!record(source.binding)) throw Error('角色世界书绑定不可读取');
    return source;
  }
  async function verify(source, guard) {
    check(source, guard);
    const binding = await source.host.getCharWorldbookNames('current');
    check(source, guard);
    if (signature(binding) !== signature(source.binding)) throw Error('角色世界书绑定已变化，请重新读取');
  }
  function sign(value, source, extra = {}) {
    receipts.set(value, { source, signature: signature(value), ...extra });
    return value;
  }
  function receipt(value) {
    const proof = receipts.get(value);
    if (!proof || signature(value) !== proof.signature) throw Error('自建内容来源凭据无效或被修改，请重新读取');
    return proof;
  }
  function validRows(entries) {
    if (!Array.isArray(entries) || entries.some(item => !record(item))) throw Error('世界书未返回有效条目列表');
    return entries;
  }
  function target(entries, name) {
    validRows(entries);
    const matches = entries.filter(item => nameOf(item) === name || String(item.comment || '').trim() === name);
    if (matches.length > 1) throw Error(`条目「${name}」名称不唯一`);
    const entry = matches[0] || null;
    if (entry && (entry.uid == null || entries.filter(item => item.uid === entry.uid).length !== 1)) {
      throw Error(`条目「${name}」缺少 UID 或 UID 不唯一`);
    }
    return entry;
  }
  function normalize(list) {
    if (!Array.isArray(list)) throw Error('自建提示词必须是 JSON 数组，不会覆盖原条目');
    const names = new Set();
    return list.filter(item => record(item) && (item.prompt || item.name)).map(item => {
      const next = {
        name: String(item.name || '未命名提示词').trim() || '未命名提示词',
        prompt: String(item.prompt || ''),
        preset: record(item.preset) ? clone(item.preset) : null,
        locked: item.locked === true,
      };
      if (names.has(next.name)) throw Error(`预设「${next.name}」重名，请先在世界书中修复`);
      names.add(next.name);
      return next;
    });
  }
  function parse(content) {
    if (!content.trim()) return [];
    const invalid = Symbol('invalid JSON');
    const parsed = originalWriter({ console: { warn() {}, error() {} } }).cleanAndParseJSON(content, ENTRY, invalid);
    if (parsed === invalid) throw Error('自建提示词不是有效 JSON，不会覆盖原条目');
    return normalize(parsed);
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
    const entry = target(entries, ENTRY);
    return { exists: true, entry, content: String(entry?.content || '') };
  }
  const revisionOf = stored => ({ exists: stored.exists, entry: stored.entry ? clone(stored.entry) : null });
  async function loadPresets(guard) {
    const token = epoch;
    await queue;
    const source = await capture(guard, token);
    const stored = await readStorage(source.host);
    await verify(source, guard);
    return { presets: parse(stored.content), revision: sign(revisionOf(stored), source) };
  }
  function serial(work) {
    const task = queue.then(work);
    queue = task.catch(() => {});
    return task;
  }
  function savePresets(presets, revision, guard) {
    const input = clone(presets);
    const expected = clone(revision);
    const proof = receipts.get(revision);
    return serial(async () => {
      usable(guard);
      if (!proof || signature(expected) !== proof.signature) throw Error('提示词来源凭据无效，请重新读取');
      const source = proof.source, api = source.host;
      await verify(source, guard);
      const stored = await readStorage(api);
      await verify(source, guard);
      if (signature(revisionOf(stored)) !== signature(expected)) throw Error('提示词库已在别处改变，请重新读取');
      const previous = parse(stored.content);
      const normalized = normalize(input);
      for (const item of previous.filter(item => item.locked)) {
        const next = normalized.find(candidate => candidate.name === item.name);
        if (!next || signature(next) !== signature(item)) throw Error(`预设「${item.name}」已锁定，不能修改或删除`);
      }
      const content = JSON.stringify(normalized, null, 2);
      const newEntry = {
        name: ENTRY, content, enabled: false,
        strategy: { type: 'selective', keys: [ENTRY] },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
      };
      if (!stored.exists) {
        await verify(source, guard);
        try { await api.createWorldbook(BOOK); }
        catch (error) {
          await verify(source, guard);
          if (!(await readStorage(api)).exists) throw error;
        }
      }
      let changed = false, writeError = null;
      try {
        await api.updateWorldbookWith(BOOK, async entries => {
          await verify(source, guard);
          const current = target(entries, ENTRY);
          if (signature(current) !== signature(stored.entry)) throw Error('提示词条目已变化，请重新读取');
          changed = true;
          if (current) return entries.map(entry => entry.uid === current.uid ? { ...entry, content } : entry);
          return [...entries, newEntry];
        }, { render: 'debounced' });
      } catch (error) { writeError = error; }
      try {
        await verify(source, guard);
        const verified = await readStorage(api);
        await verify(source, guard);
        if (!changed || !verified.entry || verified.content !== content ||
          (stored.entry ? signature(verified.entry) !== signature({ ...stored.entry, content }) : !includesFields(verified.entry, newEntry)))
          {
            if (writeError && signature(revisionOf(verified)) === signature({ exists: true, entry: stored.entry }))
              writeError.requiresReload = false;
            throw writeError || Error('提交后条目内容与预期不符');
          }
        if (writeError && stored.content === content) throw writeError;
        return { presets: normalized, revision: sign(revisionOf(verified), source),
          warning: writeError ? '预设已保存，但宿主未返回成功响应' : '' };
      } catch (error) {
        if (writeError) { writeError.requiresReload ??= true; throw writeError; }
        return { presets: normalized, revision: null, warning: `预设已提交，但复核失败：${error.message}` };
      }
    });
  }
  async function books(guard) {
    const source = await capture(guard);
    const names = await source.host.getWorldbookNames();
    await verify(source, guard);
    if (!Array.isArray(names)) throw Error('宿主未返回世界书列表');
    return [...new Set(names.filter(name => typeof name === 'string' && name.trim()))];
  }
  async function entriesFor(book, guard) {
    const source = await capture(guard);
    const names = await source.host.getWorldbookNames();
    check(source, guard);
    if (!Array.isArray(names) || !names.includes(book)) throw Error('目标世界书不存在，请重新读取');
    const entries = clone(await source.host.getWorldbook(book));
    validRows(entries);
    await verify(source, guard);
    return sign(entries, source, { book });
  }
  async function generate(prompt, guard) {
    const source = await capture(guard);
    const text = String(prompt || '').trim();
    if (!text) throw Error('提示词不能为空');
    const config = { ordered_prompts: [{ role: 'user', content: text }], should_stream: false };
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    await verify(source, guard);
    const settings = clone(await settlement.readSettings());
    await verify(source, guard);
    if (modules['cryptLord.variableSettlementApi'] !== settlement) throw Error('副模型设置服务已变化');
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw Error('系统副 API 需要填写 URL 和模型名');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };
    }
    const unchanged = async () => {
      await verify(source, guard);
      if (modules['cryptLord.variableSettlementApi'] !== settlement ||
        signature(await settlement.readSettings()) !== signature(settings)) throw Error('副模型设置已变化，请重新生成');
      await verify(source, guard);
    };
    await unchanged();
    const response = await source.host.generateRaw(config);
    await unchanged();
    const output = typeof response === 'string' ? response : String(response?.content || '');
    if (!output.trim()) throw Error('模型未返回内容');
    return output;
  }
  function configOf(input, name) {
    const source = record(input) ? input : {};
    const type = source.strategy?.type === 'selective' ? 'selective' : 'constant';
    const keys = (Array.isArray(source.strategy?.keys) ? source.strategy.keys : []).map(key => String(key).trim()).filter(Boolean);
    const positionType = ['before_character_definition', 'after_character_definition', 'at_depth'].includes(source.position?.type)
      ? source.position.type : 'before_character_definition';
    const order = Number.parseInt(source.position?.order, 10) || 100;
    const depth = Number(source.position?.depth);
    return {
      enabled: source.enabled !== false,
      strategy: { type, keys: type === 'selective' ? [...new Set(keys.length ? keys : [name].filter(Boolean))] : [] },
      position: {
        type: positionType, order: Number.isSafeInteger(order) ? order : 100,
        ...(positionType === 'at_depth' ? { role: 'system', depth: Number.isSafeInteger(depth) && depth >= 0 ? depth : 0 } : {}),
      },
      recursion: {
        prevent_incoming: source.recursion?.prevent_incoming !== false,
        prevent_outgoing: source.recursion?.prevent_outgoing !== false,
        delay_until: source.recursion?.delay_until ?? null,
      },
    };
  }
  // BEGIN ORIGINAL CUSTOM CONTENT
  function originalWriter(bridge) {
    const getWorldbookNames = bridge.getWorldbookNames;
    const TavernHelper = bridge;
    const createWorldbookEntries = bridge.createWorldbookEntries;
    const WorldbookManager = { _cache: { lastFetchTime: 0 } };
    const console = bridge.console || globalThis.console;
    const toastr = { error() {} };
    return {
      showTemporaryMessage: bridge.message,
      closeAllModals() {},
cleanAndParseJSON(rawContent, entryName = "未知条目", fallbackData = null) {
    if (!rawContent || !rawContent.trim()) {
      console.warn(`[DB警告] ${entryName} 内容为空，已启用兜底。`);
      return fallbackData;
    }

    try {
      // 1. 第一步：移除注释 (保持字符串内的内容不动)
      // 修正了对多行注释和单行注释的匹配，确保不会误删 URL 等
      let processed = rawContent.replace(/(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, (match, group1) => {
        return group1 ? group1 : "";
      });

      // 2. 第二步：强力移除“尾随逗号”
      // 匹配：逗号 + 任意空白/换行 + 结束括号 (] 或 })
      // 使用 g 标识符全局替换所有层级的尾随逗号
      processed = processed.replace(/,([\s\r\n]*[\]}])/g, '$1');

      // 3. 第三步：处理 JSON 字符串中非法的“真换行”
      // 只有在双引号内部的换行符才会被替换为 \n 符号
      processed = processed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/gs, (match) =>
        match.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
      );

      // 4. 第四步：最终修剪
      processed = processed.trim();

      return JSON.parse(processed);
    } catch (err) {
      // 如果解析失败，尝试最后一种方案：暴力清理掉所有非标准的控制字符
      try {
        // 这里的逻辑处理极其隐蔽的编码错误（如 BOM 头或不可见字符）
        const extremeClean = rawContent
          .replace(/\/\/.*/g, '') // 简单暴力去单行注释
          .replace(/,[\s\r\n]*([\]}])/g, '$1')
          .trim();
        return JSON.parse(extremeClean);
      } catch (finalErr) {
        console.error(`[DB解析失败] ❌ ${entryName} 格式彻底损坏。报错: ${err.message}`);
        toastr.error(`警告：数据库${entryName}解析失败，请检查你的JSON格式是否正确！`);
        return fallbackData;
      }
    }
  },
async writeCustomContentToLorebook(content, book, entryName, isNew, mode, entryConfig) {
  try {
    if (!content || !content.trim()) { this.showTemporaryMessage("内容不能为空。"); return; }
    if (!book) { this.showTemporaryMessage("请选择目标世界书。"); return; }
    if (!entryName || !entryName.trim()) { this.showTemporaryMessage("请填写/选择条目。"); return; }
    const allBooks = (typeof getWorldbookNames === "function" ? getWorldbookNames() : []) || [];
    if (!allBooks.includes(book)) { this.showTemporaryMessage(`请先导入世界书：${book}`, 4000); return; }

    this.showTemporaryMessage("正在写入世界书...");
    const allEntries = await TavernHelper.getLorebookEntries(book).catch(() => []);
    const target = (allEntries || []).find((e) => e.comment === entryName || e.name === entryName);

    if (!target) {
      const cfg = entryConfig || {};
      const payload = {
        comment: entryName,
        name: entryName,
        content: content,
        enabled: cfg.enabled !== false
      };
      if (cfg.strategy) payload.strategy = cfg.strategy;
      if (cfg.position) payload.position = cfg.position;
      if (cfg.recursion) payload.recursion = { ...cfg.recursion, delay_until: cfg.recursion.delay_until ?? null };
      await createWorldbookEntries(book, [payload], { render: 'debounced' });
    } else {
      let newContent = content;
      if (mode === "append") {
        const existing = target.content || "";
        newContent = existing.trim() ? `${existing}\n\n---\n\n${content}` : content;
      }
      await TavernHelper.setLorebookEntries(book, [{ uid: target.uid, content: newContent }]);
    }

    WorldbookManager._cache.lastFetchTime = 0;
    this.showTemporaryMessage("已写入世界书！", 3000);
    this.closeAllModals();
  } catch (e) {
    console.error("[自建内容] 写入失败:", e);
    this.showTemporaryMessage(`写入失败: ${e.message}`, 4000);
  }
}
    };
  }
  // END ORIGINAL CUSTOM CONTENT
  function write(input) {
    const proof = receipts.get(input.source);
    const sourceRows = clone(input.source), sourceSignature = signature(sourceRows);
    const request = clone({ ...input, guard: undefined, source: undefined });
    const guard = input.guard;
    return serial(async () => {
      usable(guard);
      if (!proof || proof.signature !== sourceSignature) throw Error('目标来源凭据无效，请重新读取');
      const source = proof.source;
      await verify(source, guard);
      const { book, name, content, mode = 'append', expectedUid, expectedEntry } = request;
      const targetBook = String(book || '').trim();
      const targetName = String(name || '').trim();
      const output = String(content ?? '');
      if (!targetBook || !targetName || !output.trim()) throw Error('世界书、条目名称和内容均不能为空');
      if (targetBook === BOOK && ['[自建提示词]', '[生图提示词]', '[世界书开关方案]'].includes(targetName)) throw Error('不能用生成正文覆盖系统配置条目');
      if (!['append', 'overwrite'].includes(mode)) throw Error('保存方式无效');
      if (expectedEntry === undefined) throw Error('请先读取并选择目标条目');
      if (proof.book !== targetBook || signature(target(sourceRows, targetName)) !== signature(expectedEntry))
        throw Error('目标条目已变化，请重新读取后确认');
      const api = source.host;
      const names = await api.getWorldbookNames();
      await verify(source, guard);
      if (!names.includes(targetBook)) throw Error(`目标世界书「${targetBook}」不存在`);
      let created = false;
      let finalContent;
      let plannedEntry, changed = false, writeError = null;
      try {
        await api.updateWorldbookWith(targetBook, async entries => {
        await verify(source, guard);
        if (!(await api.getWorldbookNames()).includes(targetBook)) throw Error('目标世界书已变化');
        check(source, guard);
        const existing = target(entries, targetName);
        if ((expectedUid !== undefined && (existing?.uid ?? null) !== expectedUid) ||
          signature(existing) !== signature(expectedEntry)) throw Error('目标条目已变化，请重新读取后确认');
        let planned;
        let failure;
        // Run the original writer only against this isolated snapshot; public host commits happen below.
        const writer = originalWriter({
          getWorldbookNames: () => names,
          getLorebookEntries: async () => clone(entries),
          createWorldbookEntries: async (_book, payload) => { planned = clone(payload[0]); },
          setLorebookEntries: async (_book, payload) => { planned = clone(payload[0]); },
          message: text => { if (text.startsWith('写入失败:')) failure = text; },
        });
        await writer.writeCustomContentToLorebook(output, targetBook, targetName, !existing, mode, configOf(request.config, targetName));
        await verify(source, guard);
        if (failure || !planned) throw Error(failure || '原版规则未返回写入内容');
        finalContent = planned.content;
        created = !existing;
        plannedEntry = existing ? { ...existing, content: planned.content } : planned;
        changed = true;
        return existing ? entries.map(entry => entry.uid === existing.uid ? plannedEntry : entry) : [...entries, planned];
      }, { render: 'debounced' });
      } catch (error) { writeError = error; }
      let warning = '';
      let savedEntry = null;
      try {
        await verify(source, guard);
        savedEntry = target(await api.getWorldbook(targetBook), targetName);
        await verify(source, guard);
        const createdPlan = { ...plannedEntry };
        delete createdPlan.comment;
        if (!changed || !savedEntry || savedEntry.content !== finalContent ||
          (created ? !includesFields(savedEntry, createdPlan) : signature(savedEntry) !== signature(plannedEntry))) {
          if (writeError && signature(savedEntry) === signature(expectedEntry)) writeError.requiresReload = false;
          throw writeError || Error('提交后条目内容与预期不符');
        }
        if (writeError) {
          if (signature(savedEntry) === signature(expectedEntry)) throw writeError;
          warning = '世界书已提交，但宿主未返回成功响应';
        }
      } catch (error) {
        if (writeError) { writeError.requiresReload ??= true; throw writeError; }
        savedEntry = null;
        warning = `世界书已提交，但复核失败：${error.message}`;
      }
      return { created, name: targetName, entry: savedEntry, warning };
    });
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed, epoch, generating }); },
    normalize, loadPresets, savePresets, books, entriesFor, generate, configOf, write,
    dispose() {
      disposed = true;
      epoch++;
      subscriptions.splice(0).forEach(sub => sub.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
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
