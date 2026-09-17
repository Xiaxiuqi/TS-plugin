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
    'UpdateVariable',
    'JSONPatch',
    'wlog',
    'safe',
    'EventCard',
    '事件卡片',
  ]);

  function escapeTagName(tagName) {
    return String(tagName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function removeTagBlocks(text, tagName) {
    const tag = escapeTagName(tagName);
    const pattern = new RegExp(`<${tag}(?:\\s+[^>]*)?>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    return text.replace(pattern, '');
  }

  function getLastTagContent(text, tagName) {
    const tag = escapeTagName(tagName);
    const pattern = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi');
    const matches = Array.from(text.matchAll(pattern));
    return matches.length ? matches[matches.length - 1][1].trim() : '';
  }

  function stripRemainingTags(text) {
    return text.replace(/<[^>]*>/g, '');
  }

  function normalize(rawText) {
    const raw = String(rawText ?? '').replace(/\r\n?/g, '\n').trim();
    if (!raw) return Object.freeze({ raw, message: '', usedGameText: false });

    const gameText = getLastTagContent(raw, 'gametxt');
    let visible = gameText || raw;
    HIDDEN_TAGS.forEach(tagName => { visible = removeTagBlocks(visible, tagName); });
    visible = stripRemainingTags(visible).replace(/\n{3,}/g, '\n\n').trim();

    return Object.freeze({ raw, message: visible, usedGameText: Boolean(gameText) });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, hiddenTags: HIDDEN_TAGS }); },
    normalize,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
