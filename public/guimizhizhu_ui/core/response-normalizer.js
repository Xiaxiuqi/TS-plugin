(() => {
  'use strict';

  const KEY = 'cryptLord.responseNormalizer';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const HIDDEN_TAGS = Object.freeze([
    'thinking',
    'reasoning',
    'think',
    'analysis',
    '思考',
    '推理',
    '分析',
    'UpdateVariable',
    'JSONPatch',
    'wlog',
    'safe',
    'EventCard',
    '事件卡片',
    'action',
    '当前线索',
    'dm',
  ]);

  function escapeTagName(tagName) {
    return String(tagName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Masking retains UTF-16 offsets so the editor can replace only genuine source spans.
  function maskHidden(rawText, preserve = []) {
    const text = String(rawText ?? ''), allowed = new Set(preserve.map(tag => tag.toLowerCase()));
    const hidden = new Set(['safe', 'thinking', 'reasoning', 'think', 'analysis', '思考', '推理', '分析',
      'style', 'script', 'auto', 'updatevariable', 'jsonpatch'].filter(tag => !allowed.has(tag)));
    const pattern = /<!--[\s\S]*?(?:-->|$)|\\[\s\S]|"|<(\/?)([a-z][\w-]*|思考|推理|分析)(?=\s|>)[^>]*>/gi;
    const stack = [], ranges = [];
    let start = 0, quoted = false, patchDepth = 0;
    for (const match of text.matchAll(pattern)) {
      if (match[0].startsWith('<!--')) {
        if (!stack.length && !patchDepth) ranges.push({ start: match.index, end: match.index + match[0].length });
        continue;
      }
      if (!match[2]) {
        if (patchDepth && match[0] === '"') quoted = !quoted;
        continue;
      }
      if (patchDepth && quoted) continue;
      const tag = match[2].toLowerCase(), closing = Boolean(match[1]);
      if (stack.length && ['style', 'script'].includes(stack.at(-1)) && tag !== stack.at(-1)) continue;
      if (['updatevariable', 'jsonpatch'].includes(tag)) patchDepth += closing ? -1 : 1;
      patchDepth = Math.max(0, patchDepth);
      if (!hidden.has(tag)) continue;
      if (!closing) {
        if (!stack.length) start = match.index;
        stack.push(tag);
      } else if (stack.at(-1) === tag) {
        stack.pop();
        if (!stack.length) ranges.push({ start, end: match.index + match[0].length });
      } else if (stack.length) {
        ranges.push({ start, end: text.length }); stack.length = 0; break;
      }
    }
    if (stack.length) ranges.push({ start, end: text.length });
    let result = text;
    for (const range of ranges.reverse())
      result = result.slice(0, range.start) + text.slice(range.start, range.end).replace(/[^\r\n]/g, ' ') + result.slice(range.end);
    return result;
  }

  function tagSpans(rawText, tagName) {
    const text = String(rawText ?? ''), tag = escapeTagName(tagName);
    const pattern = new RegExp(`\\\\[\\s\\S]|"|<(/?)${tag}(?:\\s+[^>]*)?\\s*>`, 'gi');
    const stack = [], result = [];
    let quoted = false;
    for (const match of text.matchAll(pattern)) {
      if (['updatevariable', 'jsonpatch'].includes(String(tagName).toLowerCase()) && stack.length) {
        if (match[0] === '"') { quoted = !quoted; continue; }
        if (match[0][0] === '\\' || quoted) continue;
      }
      if (match[1] === undefined) continue;
      if (!match[1]) stack.push({ start: match.index, innerStart: match.index + match[0].length });
      else if (stack.length) {
        const item = stack.pop();
        if (!stack.length) result.push({ ...item, innerEnd: match.index, end: match.index + match[0].length, closed: true });
      }
    }
    if (stack.length) result.push({ ...stack[0], innerEnd: text.length, end: text.length, closed: false });
    return result;
  }

  function removeTagBlocks(text, tagName) {
    let result = text;
    for (const span of tagSpans(text, tagName).reverse())
      result = result.slice(0, span.start) + result.slice(span.end);
    return result;
  }

  function getLastTagContent(text, tagName) {
    const span = tagSpans(text, tagName).filter(item => item.closed).at(-1);
    return span ? text.slice(span.innerStart, span.innerEnd).trim() : '';
  }

  function stripRemainingTags(text) {
    return text.replace(/<[^>]*>/g, '');
  }

  function extractActions(rawText) {
    const actionText = getLastTagContent(maskHidden(rawText), 'action');
    const unique = new Set();
    return Object.freeze(actionText.split('\n')
      .map(line => line.trim().replace(/^(?:\d+[.)]|[-*•])\s*/, '').trim())
      .filter(line => line && line.length <= 300)
      .filter(line => {
        if (unique.has(line)) return false;
        unique.add(line);
        return true;
      })
      .slice(0, 8));
  }

  function extractLegacyActions(rawText, messageElement = null) {
    const raw = String(rawText ?? ''), clean = maskHidden(raw);
    const text = clean.split(/<本周目经历(?:\s[^>]*)?>/i)[0];
    const values = [...extractActions(clean)];
    if (values.length) return values;
    const numbered = /^\s*(?:\d{1,2}[.、)、]|[①②③④⑤⑥⑦⑧⑨⑩])\s*(.{2,300}?)\s*$/gm;
    const visibleText = normalize(text).message;
    let match = numbered.exec(visibleText);
    while (match) {
      values.push(match[1].trim());
      match = numbered.exec(visibleText);
    }
    if (values.length) return [...new Set(values)].slice(0, 8);
    // A hidden-only native response must not be resurrected from stale rendered HTML.
    if (clean !== raw) return [];
    const lists = Array.from(messageElement?.querySelectorAll?.('ol, ul') || [])
      .map(list => Array.from(list.querySelectorAll(':scope > li'))
        .map(item => String(item.textContent || '').split(/<本周目经历>/i)[0].trim())
        .filter(value => value.length >= 2 && value.length <= 300))
      .filter(items => items.length >= 2 && items.length <= 8);
    if (lists.length) values.push(...lists.sort((left, right) => right.length - left.length)[0]);
    return [...new Set(values.filter(Boolean))].slice(0, 8);
  }

  function normalize(rawText) {
    const raw = String(rawText ?? '').replace(/\r\n?/g, '\n').trim();
    if (!raw) return Object.freeze({ raw, message: '', usedGameText: false });

    const clean = maskHidden(raw), gameText = getLastTagContent(clean, 'gametxt');
    let visible = gameText || clean;
    HIDDEN_TAGS.forEach(tagName => { visible = removeTagBlocks(visible, tagName); });
    visible = stripRemainingTags(visible).replace(/\n{3,}/g, '\n\n').trim();

    return Object.freeze({ raw, message: visible, usedGameText: Boolean(gameText) });
  }

  function actionsForFloor(floor) {
    if (floor?.role !== 'assistant' || floor.is_hidden) return [];
    const raw = String(floor.message ?? ''), extracted = extractLegacyActions(raw);
    if (extracted.length) return extracted;
    if (maskHidden(raw) !== raw) return [];
    const stored = floor.data?.cryptLord?.actions;
    return Array.isArray(stored) ? [...new Set(stored.map(value => String(value ?? '').trim())
      .filter(value => value && value.length <= 300))].slice(0, 8) : [];
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, hiddenTags: HIDDEN_TAGS }); },
    normalize,
    maskHidden,
    tagSpans,
    extractActions,
    extractLegacyActions,
    actionsForFloor,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
