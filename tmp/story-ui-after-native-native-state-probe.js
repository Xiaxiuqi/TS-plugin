(() => {
  'use strict';

  const label = '[JJKS after-native native-state probe]';
  const TARGET_MODULES = ['bp-panel', 'story-engine', 'world-log'];
  const PROBE_ATTR = 'data-story-ui-after-native-probe';
  const MOUNT_ATTR = 'data-story-ui-after-native-mount';
  const RAW_MOUNT_SELECTOR = '[data-story-ui-raw-mount="true"]';
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
  const ui = host.StoryRegexUI || window.StoryRegexUI || null;

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
    const fromHelper = safe(() => {
      const fn =
        host.TavernHelper?.retrieveDisplayedMessage ||
        host.retrieveDisplayedMessage ||
        window.TavernHelper?.retrieveDisplayedMessage ||
        window.retrieveDisplayedMessage;
      return fn?.(messageId)?.[0] || null;
    });
    if (fromHelper && typeof fromHelper !== 'string') return fromHelper;
    return doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
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

  function rawHasBlock(rawText, moduleId) {
    const raw = String(rawText || '');
    if (moduleId === 'bp-panel') return /<bp_panel>/i.test(raw);
    if (moduleId === 'story-engine') return /<story_driver>/i.test(raw);
    if (moduleId === 'world-log') return /<wlog\b/i.test(raw);
    return false;
  }

  function findNativeCandidateAnchors(textElement, moduleId) {
    const needles = NEEDLES[moduleId] || [];
    if (!textElement || needles.length === 0) return [];
    return Array.from(textElement.querySelectorAll('*'))
      .filter(node => {
        if (node === textElement) return false;
        if (node.closest?.(`[${PROBE_ATTR}="true"], ${RAW_MOUNT_SELECTOR}`)) return false;
        const text = normalizeText(node.innerText || node.textContent || '');
        if (!text || text.length > 2500) return false;
        return needles.some(needle => text.includes(needle));
      })
      .map(node => {
        const text = normalizeText(node.innerText || node.textContent || '');
        const childHits = Array.from(node.children || []).filter(child =>
          needles.some(needle => normalizeText(child.innerText || child.textContent || '').includes(needle)),
        ).length;
        return {
          selector: selectorOf(node),
          tag: node.tagName?.toLowerCase?.() || '',
          className: compactClass(node),
          textLength: text.length,
          hits: needles.filter(needle => text.includes(needle)),
          score: text.length + childHits * 600,
          textHead: text.slice(0, 220),
          htmlHead: String(node.outerHTML || '').slice(0, 360),
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);
  }

  function getModes(moduleIds = TARGET_MODULES) {
    return Object.fromEntries(
      moduleIds.map(moduleId => [
        moduleId,
        safe(() => ui?.registry?.getMode?.(moduleId), '__unavailable__'),
      ]),
    );
  }

  function status(options = {}) {
    const limit = Number.isFinite(options.limit) ? Number(options.limit) : 5;
    const messageIds = Array.isArray(options.messageIds)
      ? options.messageIds.map(Number).filter(Number.isFinite)
      : getRecentMessageIds(limit);
    const moduleIds = Array.isArray(options.modules) && options.modules.length ? options.modules : TARGET_MODULES;

    const report = {
      ok: true,
      kind: 'after-native-native-state-status-readonly',
      rules: ['只读', '不插入 DOM', '不调用 mount', '不刷新消息', '不写回 raw'],
      modes: getModes(moduleIds),
      messageIds,
      messages: [],
      conclusion: '',
    };

    messageIds.forEach(messageId => {
      const rawText = getRawMessage(messageId);
      const textElement = getTextElement(messageId);
      const rawMounts = Array.from(textElement?.querySelectorAll?.(RAW_MOUNT_SELECTOR) || []).map(node => ({
        moduleId: node.getAttribute('data-story-ui-module') || '',
        selector: selectorOf(node),
        textHead: normalizeText(node.innerText || node.textContent || '').slice(0, 180),
      }));
      report.messages.push({
        messageId,
        rawLength: String(rawText || '').length,
        textSelector: selectorOf(textElement),
        textHead: normalizeText(textElement?.innerText || textElement?.textContent || '').slice(0, 220),
        rawMountCount: rawMounts.length,
        rawMounts,
        modules: Object.fromEntries(
          moduleIds.map(moduleId => [
            moduleId,
            {
              rawHasBlock: rawHasBlock(rawText, moduleId),
              nativeCandidateAnchors: findNativeCandidateAnchors(textElement, moduleId),
            },
          ]),
        ),
      });
    });

    const rawMountTotal = report.messages.reduce((sum, message) => sum + message.rawMountCount, 0);
    const nativeAnchorTotal = report.messages.reduce(
      (sum, message) =>
        sum +
        Object.values(message.modules).reduce(
          (moduleSum, moduleReport) => moduleSum + moduleReport.nativeCandidateAnchors.length,
          0,
        ),
      0,
    );
    report.conclusion = rawMountTotal
      ? `当前可见锚点仍被脚本挂载污染：检测到 ${rawMountTotal} 个 data-story-ui-raw-mount。请先切到原生显示并刷新/重载，再验证 after-native。`
      : nativeAnchorTotal
        ? `当前存在 ${nativeAnchorTotal} 个非脚本挂载候选锚点，可以继续运行受控挂载探针。`
        : '当前没有脚本挂载污染，但也没有找到非脚本挂载候选锚点；需要检查原生正则是否启用或锚点文案是否变化。';

    console.info(label, report);
    return report;
  }

  function rememberModes(moduleIds = TARGET_MODULES) {
    return getModes(moduleIds);
  }

  function setTargetModes(mode = 'native', moduleIds = TARGET_MODULES) {
    const before = rememberModes(moduleIds);
    const changed = moduleIds.map(moduleId => ({
      moduleId,
      before: before[moduleId],
      requested: mode,
      after: safe(() => {
        ui?.registry?.setMode?.(moduleId, mode);
        return ui?.registry?.getMode?.(moduleId);
      }, '__set_failed__'),
    }));
    const report = {
      ok: true,
      kind: 'after-native-set-target-modes-only',
      rules: ['只改 StoryRegexUI registry 模块显示模式', '不刷新消息', '不写回 raw', '不调用聊天消息 set/delete/update API'],
      changed,
      before,
      after: getModes(moduleIds),
      next: '请用管理面板“快捷重载/重新加载”，或手动刷新当前聊天可见楼层后，再执行 __jjksAfterNativeNativeStateProbe.status({ limit: 5 })。',
    };
    console.warn(label, report);
    return report;
  }

  function clearProbe(scope = doc) {
    const removed = Array.from(scope.querySelectorAll?.(`[${PROBE_ATTR}="true"]`) || []);
    removed.forEach(node => node.remove());
    return { removed: removed.length };
  }

  const api = {
    status,
    getModes,
    rememberModes,
    setTargetModes,
    clearProbe,
    host,
    doc,
  };

  window.__jjksAfterNativeNativeStateProbe = api;
  host.__jjksAfterNativeNativeStateProbe = api;
  return status({ limit: 5 });
})();
