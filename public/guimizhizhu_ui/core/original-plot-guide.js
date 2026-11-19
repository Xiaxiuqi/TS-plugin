(() => {
  'use strict';
  const KEY = 'cryptLord.originalPlotGuide';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw new Error('原著剧情指引依赖 shared/contract.js');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0, generating = false;
  const subscriptions = [];
  const clone = value => structuredClone(value);
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function scope() {
    const host = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      source: modules['cryptLord.nativeFloorSource'], epoch, script: signature(host?.scriptVariableOptions?.()),
      chat: surface?.window?.SillyTavern?.getCurrentChatId?.() };
  }
  function scopedGuard(guard) {
    const expected = scope();
    return () => {
      if (guard?.() === false) return false;
      const now = scope();
      if (Object.keys(expected).some(key => expected[key] !== now[key]))
        throw new DOMException('原著剧情宿主、来源服务、聊天或脚本已变化，操作已取消，请重新检索', 'AbortError');
      return true;
    };
  }
  function check(host, guard, token) {
    if (disposed) throw Error('原著剧情指引已卸载');
    if (modules[KEY] !== api || guard?.() === false || token !== epoch || generating)
      throw new DOMException('原著剧情检索已取消，请重新检索', 'AbortError');
    if (modules['cryptLord.hostApi'] && modules['cryptLord.hostApi'] !== host) throw Error('原著剧情来源服务已变化，请重新检索');
  }
  const bookNames = names => {
    if (!Array.isArray(names)) throw Error('原著世界书目录不可读取');
    return [...new Set(names.filter(name => typeof name === 'string' && name.includes('原著') && name !== '1源堡' && name !== '2历史孔隙'))];
  };

  function dateValue(year, month, day) {
    return year * 10000 + month * 100 + day;
  }

  function parseCurrentDate(value) {
    const match = String(value || '').match(/(\d+)年(\d+)月(\d+)日/);
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    return dateValue(year, month, day);
  }

  function parseEntryDateRange(name) {
    return originalDateRules._parseEntryDateRange(String(name || ''));
  }

  // BEGIN ORIGINAL PLOT DATE
  /* eslint-disable no-useless-escape */
  const originalDateRules = {
_parseEntryDateRange(entryName) {
  // 清理掉后面跟着的备注，如 "（第一卷：起始）"
  let cleanName = entryName.replace(/[（\(].*?[）\)]/g, '').trim();

  // 以各种可能的分隔符切分区间
  let parts = cleanName.split(/[-~—至]/);

  const parsePart = (str, defaultYear, defaultMonth) => {
    let year = defaultYear;
    let month = defaultMonth;
    let day = null;
    const yMatch = str.match(/(\d+)年/);
    if (yMatch) year = parseInt(yMatch[1], 10);
    const mMatch = str.match(/(\d+)月/);
    if (mMatch) month = parseInt(mMatch[1], 10);
    const dMatch = str.match(/(\d+)日/);
    if (dMatch) day = parseInt(dMatch[1], 10);
    return { year, month, day };
  };

  let start = null;
  let end = null;

  if (parts.length === 1) {
    let d = parsePart(parts[0], null, null);
    if (!d.year || !d.month) return null; // 无法解析出年月，跳过
    // 单个日期，如果没有日，默认覆盖整月 (如 1349年6月 -> 13490601 到 13490631)
    start = d.year * 10000 + d.month * 100 + (d.day || 1);
    end = d.year * 10000 + d.month * 100 + (d.day || 31);
  } else if (parts.length >= 2) {
    let d1 = parsePart(parts[0], null, null);
    if (!d1.year && !d1.month) return null;

    // 区间的后半部分可以继承前半部分的年份和月份 (如 1349年1-5月28日)
    let d2 = parsePart(parts[1], d1.year, d1.month);

    start = d1.year * 10000 + (d1.month || 1) * 100 + (d1.day || 1);
    end = d2.year * 10000 + (d2.month || d1.month) * 100 + (d2.day || 31);
  }

  return { start, end };
}
  };
  /* eslint-enable no-useless-escape */
  // END ORIGINAL PLOT DATE

  function currentEra(data) {
    return data?.world_data?.当前时间纪元 || data?.stat_data?.当前时间纪元 || '';
  }

  async function search(era, host, options = {}) {
    const token = epoch, guard = scopedGuard(options.guard);
    check(host, guard, token);
    const date = parseCurrentDate(era);
    if (date === null) throw new Error('当前时间纪元缺少可识别的年、月、日');
    const names = await host.getWorldbookNames();
    check(host, guard, token);
    const books = bookNames(names);
    const results = await Promise.all(books.map(async book => {
      try {
        const entries = clone(await host.getWorldbook(book));
        check(host, guard, token);
        if (!Array.isArray(entries)) throw new Error('世界书返回格式无效');
        return { book, entries };
      }
      catch (error) { check(host, guard, token); return { book, failed: true, error: error.message }; }
    }));
    const entries = [];
    const failed = [];
    for (const result of results) {
      if (result.failed) { failed.push(result.book); continue; }
      for (const item of Array.isArray(result.entries) ? result.entries : []) {
        if (!item || typeof item !== 'object') continue;
        const name = item.name || item.comment || '';
        if (!name.includes('年') && !name.includes('月')) continue;
        const range = parseEntryDateRange(name);
        if (range && date >= range.start && date <= range.end) {
          entries.push({ worldbook: result.book, name, content: String(item.content || '') });
        }
      }
    }
    check(host, guard, token);
    if (signature(bookNames(await host.getWorldbookNames())) !== signature(books)) throw Error('原著世界书目录已变化，请重新检索');
    check(host, guard, token);
    for (const result of results.filter(result => !result.failed)) {
      if (signature(await host.getWorldbook(result.book)) !== signature(result.entries)) throw Error('原著世界书内容已变化，请重新检索');
      check(host, guard, token);
    }
    return { entries, books: books.length, failed };
  }
  async function lookup(messageId = null, options = {}) {
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('原著剧情楼层号无效');
    const guard = scopedGuard(options.guard);
    const token = epoch, host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(host, guard, token);
    const reader = modules['cryptLord.nativeFloorSource'];
    if (!reader?.read || !reader?.assert) throw Error('原生楼层来源服务尚未加载');
    const source = await reader.read(guard);
    check(host, guard, token);
    const floor = messageId === null ? source.rows.findLast(row => row.role === 'assistant') :
      source.rows.find(row => row.message_id === messageId && row.role === 'assistant');
    if (!floor) throw Error('当前聊天没有真实 assistant 楼层');
    if (floor.is_hidden) throw Error('隐藏楼层不用于原著剧情检索');
    const era = currentEra(floor.data);
    if (!era) throw Error('当前时间纪元未知');
    const result = await search(era, host, { guard });
    try { await reader.assert(source, guard); }
    catch (error) {
      check(host, guard, token);
      throw Error(`楼层或纪元已变化（含正文和消息分支），请重新检索：${error.message}`);
    }
    check(host, guard, token);
    return { ...result, messageId: floor.message_id, era };
  }
  async function installLifecycle() {
    const after = modules['cryptLord.afterNativeHost'];
    const events = after?.tavernEvents();
    if (!events || !after.bindEvent) return;
    const bind = (name, callback) => { if (name) { const sub = after.bindEvent(name, callback); if (sub) subscriptions.push(sub); } };
    bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
    bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      epoch++; generating = true;
    });
    bind(events.GENERATION_ENDED, () => { generating = false; });
    bind(events.GENERATION_STOPPED, () => { generating = false; });
  }

  const api = Object.freeze({
    status: () => ({ ready: !disposed, key: KEY, epoch, generating }),
    parseCurrentDate, parseEntryDateRange, currentEra, search, lookup,
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
  void installLifecycle();
})();
