(() => {
  'use strict';
  const KEY = 'cryptLord.journeyReader';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw Error('经历浏览依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0, generating = false;
  const subscriptions = [];
  const signature = modules['cryptLord.nativeFloorSource'].signature;
  const same = (a, b) => signature(a) === signature(b);
  function check(guard, token) {
    if (disposed || epoch !== token || modules[KEY] !== api || guard?.() === false)
      throw new DOMException('经历读取已取消', 'AbortError');
    if (generating) throw Error('正文生成中，请在结束后重新读取经历');
  }
  // BEGIN ORIGINAL JOURNEY RULES
const ChronicleCore = {
DICT: {
    // 强制输出的标准顺序（如果未来加了 people，只需在这里加一个 "在场人物"）
    STANDARD_ORDER: [
      "序号", "日期", "时间", "大纲", "地点", "在场人物",
      "详细描述", "核心侧写", "事件标签", "核心锚点"
    ],
    // 别名映射：遇到旧版或AI变异的字段，自动洗白成标准字段！
    ALIAS_MAP: {
      "标题": "大纲",         // 旧版标题 -> 新版大纲
      "人物": "在场人物",     // 旧版人物 -> 新版在场人物
      "描述": "详细描述",     // 旧版描述 -> 新版详细描述
      "人物关系": "核心侧写", // 旧版关系 -> 新版侧写
      "标签": "事件标签",     // 旧版标签 -> 新版事件标签
      "重要信息": "核心锚点", // 旧版信息 -> 新版锚点
      "暗线与伏笔": "核心锚点"
    }
  },
parseTextToEvents(contentString) {
    if (!contentString || typeof contentString !== "string") return [];
    try {
      const events = [];
      const eventBlocks = contentString.trim().split(/\n*\s*序号\|/).filter(s => s.trim() !== "");

      eventBlocks.forEach(block => {
        const firstLineEnd = block.indexOf("\n");
        const seq = block.substring(0, firstLineEnd !== -1 ? firstLineEnd : block.length).trim();
        if (!/\d+/.test(seq)) return;

        const event = { "序号": seq };
        const remainingBlock = firstLineEnd !== -1 ? block.substring(firstLineEnd).trim() : "";
        const lines = remainingBlock.split("\n");
        let currentKey = null;

        for (const line of lines) {
          const separatorIdx = line.indexOf("|");
          if (separatorIdx !== -1) {
             const rawKey = line.substring(0, separatorIdx).trim();
             // 🔴 核心机制：检查是否在标准列表或别名列表中
             const standardKey = this.DICT.ALIAS_MAP[rawKey] || rawKey;

             // 如果是我们认识的键，或者是标准顺序里有的键
             if (this.DICT.STANDARD_ORDER.includes(standardKey) || this.DICT.ALIAS_MAP[rawKey]) {
                currentKey = standardKey;
                event[currentKey] = line.substring(separatorIdx + 1).trim();
                continue;
             }
          }
          // 如果没有匹配到新键，则追加到上一行
          if (currentKey && event[currentKey] !== undefined) {
            event[currentKey] += "\n" + line;
          }
        }
        events.push(event);
      });
      return events;
    } catch (e) {
      console.error("[时空管理局] 解析本周目经历出错:", e);
      return [];
    }
  },
stringifyEventToText(event) {
    return this.DICT.STANDARD_ORDER
      .map(key => {
        if (event[key] !== undefined && event[key] !== null && event[key] !== "") {
          return `${key}|${event[key]}`;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n");
  }
};
// Prevent prototype names from being mistaken for legacy field aliases.
ChronicleCore.DICT.ALIAS_MAP = Object.assign(Object.create(null), ChronicleCore.DICT.ALIAS_MAP);
// END ORIGINAL JOURNEY RULES

  const number = value => Number.parseInt(value, 10) || 0;
  const tags = event => [...new Set(String(event.事件标签 || '').split('|').map(item => item.trim()).filter(Boolean))];
  function extract(message) {
    const normalizer = modules['cryptLord.responseNormalizer'];
    const visible = normalizer.maskHidden(String(message || ''));
    const span = normalizer.tagSpans(visible, '本周目经历').filter(item => item.closed).at(-1);
    return span ? visible.slice(span.innerStart, span.innerEnd).trim() : '';
  }
  function rows(content, source) {
    return ChronicleCore.parseTextToEvents(content).map((event, index) => ({
      id: `${source.id}:${index}`, source, event, tags: tags(event),
      text: ChronicleCore.stringifyEventToText(event),
    }));
  }
  async function native(host, messageId, guard, token = epoch) {
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const reader = modules['cryptLord.nativeFloorSource'], source = await reader.read(guard);
    check(guard, token);
    if (host !== modules['cryptLord.hostApi']) throw Error('经历宿主已变化');
    const messages = source.rows;
    const assistants = messages.filter(item => item?.role === 'assistant' && Number.isInteger(item.message_id))
      .sort((a, b) => a.message_id - b.message_id);
    const target = messageId === null ? messages.at(-1) : assistants.find(item => item.message_id === messageId);
    if (!target || target.role !== 'assistant' || target.is_hidden) throw Error('目标 assistant 楼层不存在或已隐藏，末楼不是可见回复时请显式选择历史楼层');
    const records = [], invalid = [];
    for (const message of assistants) {
      if (message.message_id > target.message_id || message.is_hidden) continue;
      const content = extract(message.message);
      if (!content) continue;
      const source = { id: `floor:${message.message_id}`, label: `原生楼层 #${message.message_id}`, messageId: message.message_id };
      const parsed = rows(content, source);
      records.push(...parsed);
      if (!parsed.length) invalid.push({ source, content });
    }
    await reader.assert(source, guard); check(guard, token);
    return { messageId: target.message_id, records, invalid };
  }
  async function books(host, guard, token = epoch) {
    const bound = structuredClone(await host.getCharWorldbookNames('current'));
    check(guard, token);
    if (!bound || typeof bound !== 'object' || Array.isArray(bound) ||
      bound.primary != null && typeof bound.primary !== 'string' ||
      bound.additional !== undefined && (!Array.isArray(bound.additional) ||
        bound.additional.some(name => typeof name !== 'string' || !name.trim())))
      throw Error('经历世界书绑定格式无效，请重新读取');
    const primary = bound?.primary;
    const names = [...new Set(['2历史孔隙', ...(bound?.additional || []), '1源堡']
      .filter(name => name && name !== primary)), primary].filter(Boolean);
    const selected = new Map();
    const revisions = [];
    for (const book of names) {
      let entries;
      try { entries = await host.getWorldbook(book); }
      catch (error) {
        if (book !== primary && !(bound?.additional || []).includes(book) &&
          /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) continue;
        throw error;
      }
      check(guard, token);
      if (!Array.isArray(entries)) throw Error(`世界书「${book}」不可读取`);
      revisions.push({ book, entries: structuredClone(entries.filter(entry => /^本周目经历(?:\(\d+\))?$/.test(String(entry?.name || entry?.comment || '').trim()))) });
      const seen = new Set();
      for (const entry of entries) {
        const name = String(entry?.name || entry?.comment || '').trim();
        if (!/^本周目经历(?:\(\d+\))?$/.test(name) || seen.has(name)) continue;
        seen.add(name);
        if (entry.content !== undefined && typeof entry.content !== 'string') throw Error(`世界书「${book}」的经历正文格式无效`);
        const source = { id: `book:${name}`, label: `${name} · ${book}`, name, book, uid: entry.uid };
        const content = String(entry.content || '');
        const records = rows(content, source);
        selected.set(name, { ...source, records, invalid: content.trim() && !records.length ? [{ source, content }] : [] });
      }
    }
    if (!same(bound, await host.getCharWorldbookNames('current'))) throw Error('经历世界书绑定已变化，请重新读取');
    for (const revision of revisions) {
      const entries = await host.getWorldbook(revision.book);
      check(guard, token);
      if (!Array.isArray(entries) || !same(revision.entries, entries.filter(entry => /^本周目经历(?:\(\d+\))?$/.test(String(entry?.name || entry?.comment || '').trim()))))
        throw Error('经历世界书条目已变化，请重新读取');
    }
    check(guard, token);
    return [...selected.values()].sort((a, b) => {
      const index = name => name === '本周目经历' ? 1 : number(name.match(/\((\d+)\)$/)?.[1]);
      return index(a.name) - index(b.name);
    });
  }
  async function load(messageId = null, guard) {
    const token = epoch;
    check(guard, token);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(guard, token);
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost();
    const dependencies = Object.fromEntries(['cryptLord.nativeFloorSource', 'cryptLord.responseNormalizer']
      .map(key => [key, modules[key]]));
    const script = signature(host.scriptVariableOptions?.()), chat = surface?.window?.SillyTavern?.getCurrentChatId?.();
    const valid = () => (!guard || guard()) && host === modules['cryptLord.hostApi'] &&
      after === modules['cryptLord.afterNativeHost'] && surface?.document === after?.getHost()?.document &&
      surface?.window === after?.getHost()?.window && script === signature(host.scriptVariableOptions?.()) &&
      Object.entries(dependencies).every(([key, value]) => modules[key] === value) &&
      chat === surface?.window?.SillyTavern?.getCurrentChatId?.();
    const [nativeResult, booksResult] = await Promise.allSettled([native(host, messageId, valid, token), books(host, valid, token)]);
    check(valid, token);
    return {
      native: nativeResult.status === 'fulfilled' ? nativeResult.value : null,
      books: booksResult.status === 'fulfilled' ? booksResult.value : [],
      nativeError: nativeResult.status === 'rejected' ? String(nativeResult.reason?.message || nativeResult.reason) : '',
      booksError: booksResult.status === 'rejected' ? String(booksResult.reason?.message || booksResult.reason) : '',
    };
  }
  function filter(records, options = {}) {
    const query = String(options.query || '').trim().toLocaleLowerCase();
    const tag = String(options.tag || '');
    const bound = value => value === '' || value === undefined || value === null ? null : Number(value);
    const minimum = bound(options.minimum), maximum = bound(options.maximum);
    if (minimum !== null && !Number.isFinite(minimum) || maximum !== null && !Number.isFinite(maximum)) return [];
    return records.filter(row => {
      const sequence = number(row.event.序号);
      return (!query || `${row.text}\n${row.source.label}`.toLocaleLowerCase().includes(query)) &&
        (!tag || row.tags.includes(tag)) && (minimum === null || sequence >= minimum) &&
        (maximum === null || sequence <= maximum);
    }).sort((a, b) => options.order === 'oldest' ? number(a.event.序号) - number(b.event.序号)
      : number(b.event.序号) - number(a.event.序号));
  }
  function page(records, index = 0, size = 40) {
    const pageSize = Number.isSafeInteger(size) && size > 0 ? size : 40;
    const count = Math.max(1, Math.ceil(records.length / pageSize));
    const current = Math.max(0, Math.min(count - 1, Math.floor(Number(index) || 0)));
    return { rows: records.slice(current * pageSize, (current + 1) * pageSize), index: current, count, total: records.length };
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents?.();
  if (events?.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; generating = false; }));
  if (events?.GENERATION_STARTED) subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt || options?.dryRun ||
      options?.options?.quiet_prompt || options?.options?.dryRun) return;
    epoch++; generating = true;
  }));
  for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
    subscriptions.push(after.bindEvent(name, () => { if (generating) { epoch++; generating = false; } }));
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed }), load, native, books, extract, filter, page,
    parse: content => ChronicleCore.parseTextToEvents(content),
    stringify: event => ChronicleCore.stringifyEventToText(event),
    dispose() { disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
