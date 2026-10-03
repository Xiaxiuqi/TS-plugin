(() => {
  'use strict';
  const KEY = 'cryptLord.originalPlotGuide';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw new Error('原著剧情指引依赖 shared/contract.js');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function dateValue(year, month, day) {
    return year * 10000 + month * 100 + day;
  }

  function parseCurrentDate(value) {
    const match = String(value || '').match(/(\d+)年(\d+)月(\d+)日/);
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return dateValue(year, month, day);
  }

  function parseEntryDateRange(name) {
    const clean = String(name || '').replace(/[（(].*?[）)]/g, '').trim();
    const parts = clean.split(/[-~—至]/);
    const parsePart = (text, defaultYear = null, defaultMonth = null) => ({
      year: Number(text.match(/(\d+)年/)?.[1] || defaultYear),
      month: Number(text.match(/(\d+)月/)?.[1] || defaultMonth),
      day: Number(text.match(/(\d+)日/)?.[1]) || null,
    });
    const first = parsePart(parts[0]);
    if (!first.year || (!first.month && parts.length === 1)) return null;
    if (parts.length === 1) return {
      start: dateValue(first.year, first.month, first.day || 1),
      end: dateValue(first.year, first.month, first.day || 31),
    };
    if (!first.month && !/(\d+)年/.test(parts[0])) return null;
    const last = parsePart(parts[1], first.year, first.month);
    const start = dateValue(first.year, first.month || 1, first.day || 1);
    const end = dateValue(last.year, last.month || first.month, last.day || 31);
    return start <= end ? { start, end } : null;
  }

  function currentEra(data) {
    return data?.world_data?.当前时间纪元 || data?.stat_data?.当前时间纪元 || '';
  }

  async function search(era, host) {
    const date = parseCurrentDate(era);
    if (date === null) throw new Error('当前时间纪元缺少可识别的年、月、日');
    const names = await host.getWorldbookNames();
    const books = (Array.isArray(names) ? names : []).filter(name =>
      typeof name === 'string' && name.includes('原著') && name !== '1源堡' && name !== '2历史孔隙');
    if (!books.length) return { entries: [], books: 0, failed: [] };
    const results = await Promise.all(books.map(async book => {
      try { return { book, entries: await host.getWorldbook(book) }; }
      catch { return { book, failed: true }; }
    }));
    const entries = [];
    const failed = [];
    for (const result of results) {
      if (result.failed) { failed.push(result.book); continue; }
      for (const item of Array.isArray(result.entries) ? result.entries : []) {
        const name = item.name || item.comment || '';
        if (!name.includes('年') && !name.includes('月')) continue;
        const range = parseEntryDateRange(name);
        if (range && date >= range.start && date <= range.end) {
          entries.push({ worldbook: result.book, name, content: String(item.content || '') });
        }
      }
    }
    return { entries, books: books.length, failed };
  }

  const api = Object.freeze({
    status: () => ({ ready: true, key: KEY }),
    parseCurrentDate, parseEntryDateRange, currentEra, search,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
