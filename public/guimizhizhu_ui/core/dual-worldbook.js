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
  let disposed = false, epoch = 0, generating = false;
  const receipts = new WeakMap(), subscriptions = [];
  const after = modules['cryptLord.afterNativeHost'];
  const usable = (guard, token = epoch) => {
    if (disposed) throw new Error('双库管理已卸载');
    if (modules[KEY] !== api || token !== epoch || generating || guard?.() === false)
      throw new DOMException('双库操作已取消，请重新读取', 'AbortError');
  };
  const nameOf = entry => String(entry?.name || entry?.comment || '').trim();
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { $regex: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const snapshot = entry => JSON.stringify(canonical(entry));
  const same = (left, right) => snapshot(left) === snapshot(right);
  function target(entries, name) {
    const found = entries.filter(entry => nameOf(entry) === name);
    if (found.length > 1) throw new Error('同名条目不唯一，请在原生世界书编辑器中整理');
    const entry = found[0] || null;
    if (entry && (entry.uid == null || entries.filter(row => row.uid === entry.uid).length !== 1)) {
      throw new Error('条目 UID 缺失或重复，请在原生世界书编辑器中整理');
    }
    return entry;
  }
  function check(source, guard) {
    usable(guard, source.token);
    if (modules['cryptLord.hostApi'] !== source.host || modules['cryptLord.afterNativeHost'] !== source.after ||
      source.after?.getHost()?.document !== source.document)
      throw Error('双库来源服务已变化，请重新读取');
  }
  async function binding(source, guard) {
    check(source, guard);
    const value = structuredClone(await source.host.getCharWorldbookNames('current'));
    check(source, guard);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('角色世界书绑定不可读取');
    if (source.binding && !same(value, source.binding)) throw Error('角色绑定的主世界书已改变，请重新读取');
    return value;
  }
  async function capture(guard, token) {
    usable(guard, token);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const source = { host, after, document: after?.getHost()?.document, token };
    const names = await binding(source, guard);
    if (typeof names.primary !== 'string' || !names.primary.trim()) throw Error('未找到当前角色绑定的主世界书');
    if (names.primary === LIBRARY) throw Error('主世界书与历史孔隙相同，无法进行双库操作');
    return { ...source, binding: names, primary: names.primary };
  }
  function validRows(entries) {
    if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry !== 'object' || Array.isArray(entry)))
      throw new Error('双库未返回有效条目列表');
    return entries;
  }
  async function read(source, guard) {
    await binding(source, guard);
    const names = [source.primary, LIBRARY];
    const rows = await Promise.all(names.map(name => source.host.getWorldbook(name)));
    check(source, guard);
    await binding(source, guard);
    return new Map(names.map((name, index) => [name, structuredClone(validRows(rows[index]))]));
  }

  // BEGIN ORIGINAL DUAL BOOKS
  function originalRules(bridge = {}) {
    const getWorldbook = bridge.getWorldbook;
    const updateWorldbookWith = bridge.updateWorldbookWith;
    const createWorldbookEntries = bridge.createWorldbookEntries;
    const deleteWorldbookEntries = bridge.deleteWorldbookEntries;
    const console = bridge.console || globalThis.console;
    const WorldbookManager = {
      PRIMARY_BOOK: bridge.primaryBook || PRIMARY, LIBRARY_BOOK: LIBRARY,
      _cache: { lastFetchTime: 0 },
async saveEntries(saveTasks, options = { backupToLibrary: false }) {
    if (!saveTasks || saveTasks.length === 0) return;

    // ✨ 内部提取出的流线型写入器 (支持给主库/备用库复用)
    const processBook = async (bookName, tasks, isBackup = false) => {
      try {
        const currentBook = await getWorldbook(bookName).catch(() => []);
        const getSafeName = (e) => (e?.name || e?.comment || "").trim();
        const existingNames = new Set(currentBook.map(e => e.name)); // 使用 name 进行判重

        const toUpdate = [];
        const toCreate = [];

        for (const task of tasks) {
          // 字段转换：把上层业务代码传来的 comment 转正为合法的 name
          const taskName = getSafeName(task);
          if (!taskName) continue; // 安全兜底：抛弃没有名字的坏账数据

          // 🎯 核心映射：将传入的任务字段转换为官方严格支持的 PartialDeep<WorldbookEntry>
          const payload = {
            name: taskName,
            enabled: isBackup ? false : (task.enabled !== undefined ? task.enabled : true),
            ...(task.content !== undefined && { content: task.content }),
            ...(task.probability !== undefined && { probability: task.probability }),
            ...(task.extra !== undefined && { extra: task.extra })
          };

          // --- 1. 组装 Strategy (激活策略) ---
          // 兼容扁平传入的 task.keys 或 完整的 task.strategy
          if (task.keys || task.strategy) {
            payload.strategy = { ...(task.strategy || {}) };

            // 如果扁平传入了 keys，覆盖进去
            if (task.keys) {
              payload.strategy.keys = task.keys;
            }

            // 智能补全 type：如果有 keys，默认给 'selective' (绿灯)，否则保持 'constant' (蓝灯)
            if (!payload.strategy.type && payload.strategy.keys && payload.strategy.keys.length > 0) {
              payload.strategy.type = 'selective';
            }
          }

          // --- 2. 组装 Position (插入位置) ---
          // 兼容扁平传入的 task.positionType / task.order 等，或完整的 task.position
          if (task.position || task.positionType || task.order !== undefined || task.depth !== undefined) {
            payload.position = { ...(task.position || {}) };

            if (task.positionType) payload.position.type = task.positionType;
            if (task.order !== undefined) payload.position.order = task.order;

            // 只有当 type 为 'at_depth' 时，role 和 depth 才有效
            if (task.depth !== undefined) payload.position.depth = task.depth;
            if (task.role !== undefined) payload.position.role = task.role;
          }

          // --- 3. 组装 Recursion (递归设置) ---
          // 默认开启 prevent_incoming (不被别人扫) 和 prevent_outgoing (不扫别人)
          payload.recursion = {
            prevent_incoming: task.recursion?.prevent_incoming ?? task.recursion?.exclude ?? true,
            prevent_outgoing: task.recursion?.prevent_outgoing ?? task.recursion?.prevent ?? true,
            delay_until: task.recursion?.delay_until ?? null,
          };

          // --- 4. 组装 Effect (效果：粘性/冷却/延迟) ---
          if (task.effect) {
            payload.effect = { ...task.effect };
          }

          // 分发到更新或创建队列
          if (existingNames.has(taskName)) {
            toUpdate.push(payload);
          } else {
            toCreate.push(payload);
          }
        }

        // 🎯 批量原子化更新
        if (toUpdate.length > 0) {
          await updateWorldbookWith(bookName, (worldbook) => {
            return worldbook.map(entry => {
              const entrySafeName = (entry.name || entry.comment || "").trim();
              const updateData = toUpdate.find(u => u.name === entrySafeName);
              if (!updateData) return entry;

              // 深度合并逻辑：保留原有的内部字段(如 uid)，同时合并嵌套对象
              return {
                ...entry,
                ...updateData,
                strategy: updateData.strategy ? { ...entry.strategy, ...updateData.strategy } : entry.strategy,
                position: updateData.position ? { ...entry.position, ...updateData.position } : entry.position,
                recursion: updateData.recursion ? { ...entry.recursion, ...updateData.recursion } : entry.recursion,
                effect: updateData.effect ? { ...entry.effect, ...updateData.effect } : entry.effect,
              };
            });
          }, { render: 'debounced' }); // 防抖渲染：性能拉满
        }

        // 🎯 批量新增 (底层自动补全缺失的系统默认字段)
        if (toCreate.length > 0) {
          await createWorldbookEntries(bookName, toCreate, { render: 'debounced' });
        }

      } catch (e) {
        console.warn(`[世界书管家] 写入 ${bookName} 时发生异常:`, e);
      }
    };

    // 1. 执行主库写入
    await processBook(this.PRIMARY_BOOK, saveTasks, false);

    // 2. 执行备用库同步
    if (options.backupToLibrary) {
      await processBook(this.LIBRARY_BOOK, saveTasks, true);
    }

    // 3. 强制清空缓存
    this._cache.lastFetchTime = 0;
  },
async compareBooks() {
    const primary = await getWorldbook(this.PRIMARY_BOOK).catch(() => []);
    const library = await getWorldbook(this.LIBRARY_BOOK).catch(() => []);

    const primaryMap = new Map(primary.map(e => [e.name, e]));
    const libraryMap = new Map(library.map(e => [e.name, e]));
    const result = [];

    // 合并所有独一无二的名字
    const allNames = new Set([...primaryMap.keys(), ...libraryMap.keys()]);

    allNames.forEach(name => {
      const pData = primaryMap.get(name);
      const lData = libraryMap.get(name);

      let status = '';
      if (pData && lData) {
        // ✨ 新增：深度比对内容和开关状态，完全一样则判定为 'identical'（已同步）
        if (pData.content === lData.content && pData.enabled === lData.enabled) {
          status = 'identical';
        } else {
          status = 'conflict';
        }
      }
      else if (pData) status = 'primary_only';
      else status = 'library_only';

      result.push({ name, status, primaryData: pData, libraryData: lData });
    });

    return result;
  },
async removeEntries(bookName, predicateFn) {
    try {
      await deleteWorldbookEntries(bookName, predicateFn, { render: 'debounced' });
      this._cache.lastFetchTime = 0; // 删完清缓存
      return true;
    } catch (e) {
      console.error(`[世界书管家] 删除条目失败 (${bookName}):`, e);
      return false;
    }
  }
    };
    const handler = {
      showTemporaryMessage() {},
      fetchAndRenderWorldbookList() {},
async handleWorldbookAction(action, itemData, domElement) {
  const name = itemData.name;
  this.showTemporaryMessage(`执行操作中...`, 1000);

  try {
    switch (action) {
      case 'toggle': {
        const isCurrentlyEnabled = domElement.dataset.enabled === "true";
        await WorldbookManager.saveEntries([{ ...itemData.primaryData, enabled: !isCurrentlyEnabled }]);
        break;
      }
      case 'promote': {
        await WorldbookManager.saveEntries([{ ...itemData.libraryData, enabled: true }]);
        await WorldbookManager.removeEntries(WorldbookManager.LIBRARY_BOOK, e => e.name === name);
        break;
      }
      case 'demote': {
        await WorldbookManager.saveEntries([{ ...itemData.primaryData }], { backupToLibrary: true });
        await WorldbookManager.removeEntries(WorldbookManager.PRIMARY_BOOK, e => e.name === name);
        break;
      }
      case 'overwrite_primary': {
        await WorldbookManager.saveEntries([{ ...itemData.libraryData }]);
        break;
      }
      case 'overwrite_library': {
        await WorldbookManager.saveEntries([{ ...itemData.primaryData }], { backupToLibrary: true });
        break;
      }
      case 'delete': {
        await WorldbookManager.removeEntries(WorldbookManager.PRIMARY_BOOK, e => e.name === name);
        await WorldbookManager.removeEntries(WorldbookManager.LIBRARY_BOOK, e => e.name === name);
        break;
      }
    }

    this.showTemporaryMessage(`操作成功！`, 2000);
    // 操作改变了底层数据，所以必须重新 fetch 报告，然后再 render
    this.fetchAndRenderWorldbookList();

  } catch (error) {
    console.error(`[世界书动作失败] ${action} - ${name}:`, error);
    this.showTemporaryMessage(`操作异常，请检查控制台。`);
  }
}
    };
    return { manager: WorldbookManager, handler };
  }
  // END ORIGINAL DUAL BOOKS

  const normalized = entries => entries.map(entry => ({ ...entry, name: nameOf(entry) }));
  async function compare(options = {}) {
    const token = epoch;
    await queue;
    const source = await capture(options.guard, token);
    const books = await read(source, options.guard);
    const primary = source.primary;
    const rules = originalRules({ primaryBook: primary, getWorldbook: async name => normalized(books.get(name)) });
    const report = await rules.manager.compareBooks();
    check(source, options.guard);
    const result = report.filter(item => item.name).map(item => {
      const p = books.get(primary).filter(entry => nameOf(entry) === item.name);
      const l = books.get(LIBRARY).filter(entry => nameOf(entry) === item.name);
      let status = item.status, reason = '';
      try { target(books.get(primary), item.name); target(books.get(LIBRARY), item.name); }
      catch (error) { status = 'ambiguous'; reason = error.message; }
      const row = { name: item.name, status, reason, primaryBook: primary, libraryBook: LIBRARY, primaryData: p[0] || null,
        libraryData: l[0] || null, primaryCount: p.length, libraryCount: l.length };
      receipts.set(row, { source, signature: snapshot(row) });
      return row;
    });
    return Object.assign(result, { primaryBook: primary });
  }
  function assertPair(books, name, expected) {
    for (const book of expected.keys()) {
      if (!same(target(books.get(book), name), expected.get(book))) {
        throw new Error(`${book}条目已变化，请刷新双库后重试`);
      }
    }
  }

  // Run the original writer on isolated copies to obtain its payloads and
  // stage order. Only the guarded commit below touches the public host API.
  async function plan(action, selected, books, primary) {
    const allowed = {
      toggle: Boolean(selected.primaryData),
      promote: Boolean(selected.libraryData && !selected.primaryData),
      demote: Boolean(selected.primaryData && ['primary_only', 'identical'].includes(selected.status)),
      overwrite_primary: Boolean(selected.primaryData && selected.libraryData),
      overwrite_library: Boolean(selected.primaryData && selected.libraryData),
      delete: Boolean(selected.primaryData || selected.libraryData),
    };
    if (!allowed[action]) throw new Error('当前条目状态不支持该操作，请刷新');
    const working = new Map([...books].map(([name, entries]) => [name, structuredClone(entries)]));
    const steps = [];
    let failure;
    const recordWrite = (book, next) => {
      const before = target(working.get(book), selected.name);
      const after = next.find(entry => nameOf(entry) === selected.name);
      if (!after) throw new Error('原版写入规则未返回目标条目');
      steps.push({ book, after: structuredClone(after), type: 'write' });
      working.set(book, before
        ? working.get(book).map(entry => entry.uid === before.uid ? after : entry)
        : [...working.get(book), after]);
    };
    const rules = originalRules({
      primaryBook: primary,
      getWorldbook: async book => normalized(structuredClone(working.get(book))),
      updateWorldbookWith: async (book, updater) => recordWrite(book, await updater(normalized(structuredClone(working.get(book))))),
      createWorldbookEntries: async (book, payloads) => recordWrite(book, [...normalized(working.get(book)), ...payloads]),
      deleteWorldbookEntries: async (book, predicate) => {
        const before = target(working.get(book), selected.name);
        const removed = normalized(working.get(book)).filter(predicate);
        if (removed.some(entry => nameOf(entry) !== selected.name)) throw new Error('原版删除规则超出选定条目');
        if (before && removed.length) {
          steps.push({ book, after: null, type: 'remove' });
          working.set(book, working.get(book).filter(entry => entry.uid !== before.uid));
        }
      },
      console: { warn(_label, error) { failure = error; }, error(_label, error) { failure = error; } },
    });
    await rules.handler.handleWorldbookAction(action, {
      ...selected,
      primaryData: selected.primaryData ? { ...selected.primaryData, name: selected.name } : null,
      libraryData: selected.libraryData ? { ...selected.libraryData, name: selected.name } : null,
    }, { dataset: { enabled: String(selected.primaryData?.enabled === true) } });
    if (failure) throw failure;
    if (!steps.length) throw new Error('原版规则未生成可执行操作');
    return steps;
  }
  function includesFields(actual, expected, ignoreUid = false) {
    if (!expected || typeof expected !== 'object' || Array.isArray(expected) ||
      Object.prototype.toString.call(expected) === '[object RegExp]') return same(actual, expected);
    return Object.entries(expected).every(([key, value]) => ignoreUid && key === 'uid' || includesFields(actual?.[key], value));
  }
  let queue = Promise.resolve();
  function act(action, selected, options = {}) {
    const receipt = receipts.get(selected);
    const input = structuredClone(selected);
    const task = queue.then(async () => {
      usable(options.guard);
      if (!receipt || receipt.signature !== snapshot(input)) throw Error('双库来源凭据无效或被修改，请重新读取');
      const source = receipt.source;
      const guard = () => check(source, options.guard);
      guard();
      if (!input?.name || input.status === 'ambiguous') throw new Error('同名条目或 UID 不唯一，无法安全操作');
      const books = await read(source, options.guard);
      const expected = new Map([[source.primary, input.primaryData || null], [LIBRARY, input.libraryData || null]]);
      assertPair(books, input.name, expected);
      const steps = await plan(action, input, books, source.primary);
      const completed = [], warnings = [];
      let pending = '';
      try {
        for (const step of steps) {
          pending = `${step.book}：${step.type === 'remove' ? '移除' : '写入'}`;
          guard();
          assertPair(await read(source, options.guard), input.name, expected);
          guard();
          let transformed = false, writeError = null, responded = false;
          try {
            await source.host.updateWorldbookWith(step.book, async entries => {
              guard();
              validRows(entries);
              assertPair(await read(source, options.guard), input.name, expected);
              guard();
              const current = target(entries, input.name);
              if (!same(current, expected.get(step.book))) throw new Error('更新中的目标条目已变化，请刷新');
              transformed = true;
              if (step.type === 'remove') return entries.filter(entry => entry.uid !== current.uid);
              const { uid: _uid, ...payload } = step.after;
              return current
                ? entries.map(entry => entry.uid === current.uid ? { ...payload, uid: current.uid } : entry)
                : [...entries, payload];
            }, { render: 'debounced' });
            responded = true;
          } catch (error) { writeError = error; }
          let actual;
          try {
            guard();
            const saved = await read(source, options.guard);
            guard();
            actual = target(saved.get(step.book), input.name);
            for (const [book, entry] of expected) {
              if (book !== step.book && !same(target(saved.get(book), input.name), entry))
                throw Error(`${book}条目已变化，请刷新双库后重试`);
            }
            const previous = expected.get(step.book);
            const wanted = step.type === 'remove' ? null : previous
              ? { ...step.after, uid: previous.uid } : step.after;
            const confirmed = transformed && (step.type === 'remove' ? actual === null :
              actual && (previous ? same(actual, wanted) : includesFields(actual, wanted, true)));
            if (!confirmed) throw writeError || Error('提交结果未能确认，请刷新核对双库');
            if (writeError) {
              if (same(actual, previous)) throw writeError;
              warnings.push(`${pending}已落盘，但宿主未返回成功响应`);
            }
          } catch (error) {
            error.requiresReload = true;
            error.submitted = responded;
            throw error;
          }
          expected.set(step.book, actual);
          completed.push(pending);
          pending = '';
        }
        return { action, name: input.name, completed, warning: warnings.join('；') };
      } catch (error) {
        error.partial = { completed, pending,
          sourceRetained: action === 'promote' ? Boolean(expected.get(LIBRARY)) :
            action === 'demote' ? Boolean(expected.get(source.primary)) : null };
        throw error;
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: !disposed, generating, epoch }),
    compare, act,
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
