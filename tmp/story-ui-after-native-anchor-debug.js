(() => {
  'use strict';

  const label = '[JJKS after-native anchor debug]';
  const NEEDLES = {
    'bp-panel': ['BP战力雷达', '扫描状态', '已扫描目标', 'BP总值', '总BP'],
    'story-engine': ['STORY ENGINE', '全域锚定', '最终修正', 'NPC驱动'],
    'world-log': ['世界运行报告', '世界主线', 'Time passed:', '当前地点'],
  };

  const safe = (fn, fallback = null) => {
    try {
      return fn();
    } catch (error) {
      return fallback ?? `__ERROR__ ${error?.message || error}`;
    }
  };

  const host = (() => {
    const candidates = [window];
    safe(() => {
      if (window.parent && !candidates.includes(window.parent)) candidates.push(window.parent);
    });
    safe(() => {
      if (window.top && !candidates.includes(window.top)) candidates.push(window.top);
    });
    return (
      candidates
        .map(win => ({
          win,
          score: safe(
            () =>
              (win.JJKSStoryUiManager?.test ? 80 : 0) +
              (win.StoryRegexUI ? 50 : 0) +
              (win.TavernHelper ? 20 : 0) +
              (win.document?.querySelector?.('.mes[mesid]') ? 10 : 0),
            0,
          ),
        }))
        .sort((a, b) => b.score - a.score)[0]?.win || window
    );
  })();

  const doc = host.document || document;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function compactClass(node) {
    return String(node?.className || '').replace(/\s+/g, ' ').trim();
  }

  function selectorOf(node) {
    if (!node || node.nodeType !== 1) return '';
    const parts = [];
    let current = node;
    while (current && current.nodeType === 1 && parts.length < 6) {
      const tag = current.tagName?.toLowerCase?.() || 'node';
      const id = current.id ? `#${current.id}` : '';
      const classes = compactClass(current)
        .split(' ')
        .filter(Boolean)
        .slice(0, 4)
        .map(name => `.${name}`)
        .join('');
      const mesid = current.getAttribute?.('mesid') ? `[mesid="${current.getAttribute('mesid')}"]` : '';
      parts.unshift(`${tag}${id}${classes}${mesid}`);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function getTextElement(messageId) {
    const helperResult = safe(() => {
      const fn =
        host.TavernHelper?.retrieveDisplayedMessage ||
        host.retrieveDisplayedMessage ||
        window.TavernHelper?.retrieveDisplayedMessage ||
        window.retrieveDisplayedMessage;
      return fn?.(messageId)?.[0] || null;
    });
    const domResult = doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
    return { helperResult: helperResult && typeof helperResult !== 'string' ? helperResult : null, domResult };
  }

  function getRawMessage(messageId) {
    return (
      safe(() => {
        const fn =
          host.TavernHelper?.getChatMessages ||
          host.getChatMessages ||
          window.TavernHelper?.getChatMessages ||
          window.getChatMessages;
        return fn?.(messageId)?.[0]?.message || '';
      }, '') || ''
    );
  }

  function getRecentMessageIds(limit = 5) {
    return Array.from(doc.querySelectorAll('.mes[mesid]'))
      .map(node => Number(node.getAttribute('mesid')))
      .filter(Number.isFinite)
      .slice(-limit);
  }

  function collectElementHits(root, needles) {
    return Array.from(root?.querySelectorAll?.('*') || [])
      .map(node => {
        const text = normalizeText(node.innerText || node.textContent || '');
        const hits = needles.filter(needle => text.includes(needle));
        return hits.length
          ? {
              tag: node.tagName?.toLowerCase?.() || '',
              className: compactClass(node),
              selector: selectorOf(node),
              textLength: text.length,
              hits,
              textHead: text.slice(0, 240),
              htmlHead: String(node.outerHTML || '').slice(0, 500),
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.textLength - b.textLength)
      .slice(0, 12);
  }

  function collectTextNodeHits(root, needles) {
    const NodeFilterCtor = host.NodeFilter || window.NodeFilter;
    if (!root || !NodeFilterCtor) return [];
    const walker = doc.createTreeWalker(root, NodeFilterCtor.SHOW_TEXT, {
      acceptNode(node) {
        const text = normalizeText(node.textContent || '');
        if (!text) return NodeFilterCtor.FILTER_REJECT;
        return needles.some(needle => text.includes(needle)) ? NodeFilterCtor.FILTER_ACCEPT : NodeFilterCtor.FILTER_REJECT;
      },
    });
    const hits = [];
    let node;
    while ((node = walker.nextNode()) && hits.length < 12) {
      const parent = node.parentElement;
      hits.push({
        text: normalizeText(node.textContent || '').slice(0, 240),
        parentTag: parent?.tagName?.toLowerCase?.() || '',
        parentClass: compactClass(parent),
        parentSelector: selectorOf(parent),
        previousElementText: normalizeText(parent?.previousElementSibling?.innerText || parent?.previousElementSibling?.textContent || '').slice(0, 160),
        nextElementText: normalizeText(parent?.nextElementSibling?.innerText || parent?.nextElementSibling?.textContent || '').slice(0, 160),
      });
    }
    return hits;
  }

  function summarizeTextElement(node) {
    if (!node) return null;
    return {
      tag: node.tagName?.toLowerCase?.() || '',
      className: compactClass(node),
      selector: selectorOf(node),
      textLength: normalizeText(node.innerText || node.textContent || '').length,
      textHead: normalizeText(node.innerText || node.textContent || '').slice(0, 500),
      htmlHead: String(node.innerHTML || '').slice(0, 1200),
      childCount: node.children?.length || 0,
      directChildren: Array.from(node.children || [])
        .slice(0, 25)
        .map(child => ({
          tag: child.tagName?.toLowerCase?.() || '',
          className: compactClass(child),
          textHead: normalizeText(child.innerText || child.textContent || '').slice(0, 160),
          htmlHead: String(child.outerHTML || '').slice(0, 260),
        })),
    };
  }

  function run(options = {}) {
    const ids = Array.isArray(options.messageIds)
      ? options.messageIds.map(Number).filter(Number.isFinite)
      : getRecentMessageIds(Number.isFinite(options.limit) ? options.limit : 5);
    const report = {
      ok: true,
      kind: 'after-native-anchor-debug-readonly',
      rules: ['只读', '不插入 DOM', '不调用 mount', '不刷新消息', '不写回 raw'],
      messageIds: ids,
      messages: [],
    };

    ids.forEach(messageId => {
      const raw = String(getRawMessage(messageId) || '');
      const { helperResult, domResult } = getTextElement(messageId);
      const helperSummary = summarizeTextElement(helperResult);
      const domSummary = summarizeTextElement(domResult);
      const root = helperResult || domResult;
      const moduleReports = Object.fromEntries(
        Object.entries(NEEDLES).map(([moduleId, needles]) => [
          moduleId,
          {
            rawHasLikelyBlock:
              moduleId === 'bp-panel'
                ? /<bp_panel>/i.test(raw)
                : moduleId === 'story-engine'
                  ? /<story_driver>/i.test(raw)
                  : /<wlog\b/i.test(raw),
            rootTextHasNeedle: needles.some(needle => normalizeText(root?.innerText || root?.textContent || '').includes(needle)),
            elementHits: collectElementHits(root, needles),
            textNodeHits: collectTextNodeHits(root, needles),
          },
        ]),
      );
      report.messages.push({
        messageId,
        rawLength: raw.length,
        helperSummary,
        domSummary,
        helperEqualsDom: helperResult === domResult,
        chosenSelector: selectorOf(root),
        moduleReports,
      });
    });

    console.info(label, report);
    return report;
  }

  const api = { run, host, doc };
  window.__jjksAfterNativeAnchorDebug = api;
  host.__jjksAfterNativeAnchorDebug = api;
  return run({ limit: 5 });
})();
