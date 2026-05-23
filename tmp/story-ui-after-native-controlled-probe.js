(() => {
  'use strict';

  const PROBE_ATTR = 'data-story-ui-after-native-probe';
  const MOUNT_ATTR = 'data-story-ui-after-native-mount';
  const label = '[JJKS after-native controlled probe]';
  const TARGET_MODULES = ['bp-panel', 'story-engine', 'world-log'];
  const ANCHOR_NEEDLES = {
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

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
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

  function getMessageElement(messageId) {
    return doc.querySelector(`.mes[mesid="${messageId}"]`);
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

  function getBlockConfig(module) {
    if (!module?.block?.open || !module?.block?.close) return null;
    return module.block;
  }

  function extractModuleContent(module, rawText) {
    const block = getBlockConfig(module);
    if (!block) return null;
    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    let match = source.match(new RegExp(`${escapeRegex(block.open)}([\\s\\S]*?)${escapeRegex(block.close)}`, 'i'));
    if (!match && module?.id === 'story-engine') {
      match = source.match(
        /<story_driver>[\s\S]*?(?:<combat_driver>[\s\S]*?<\/combat_driver>[\s\S]*?)?(?:━━\s*3[.．、]\s*最终修正\s*━━[\s\S]*)?/i,
      );
    }
    if (!match) return null;
    return {
      fullMatch: match[0],
      content: String(match[1] || match[0] || '').trim(),
      block,
    };
  }

  function buildNodeForModule(module, rawText, context) {
    const extracted = extractModuleContent(module, rawText);
    if (!extracted) return null;
    return safe(() =>
      ui?.registry?.safelyCall?.(module, 'renderContent', extracted.content, {
        ...context,
        extracted,
        rawText,
      }),
    );
  }

  function toHtml(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.outerHTML) return node.outerHTML;
    const wrapper = doc.createElement('div');
    wrapper.appendChild(node.cloneNode?.(true) || node);
    return wrapper.innerHTML;
  }

  function createProbeHost(module, moduleHtml, messageId) {
    const hostNode = doc.createElement('section');
    hostNode.className = 'story-ui-after-native-probe-mount story-ui-after-native-mount';
    hostNode.setAttribute(PROBE_ATTR, 'true');
    hostNode.setAttribute(MOUNT_ATTR, 'true');
    hostNode.dataset.storyUiModule = module.id;
    hostNode.dataset.storyUiProbeMessageId = String(messageId);
    hostNode.style.margin = '0.75em 0';
    hostNode.innerHTML = moduleHtml;
    return hostNode;
  }

  function findAfterNativeAnchor(textElement, moduleId) {
    const needles = ANCHOR_NEEDLES[moduleId] || [];
    if (!textElement || needles.length === 0) return null;
    const candidates = Array.from(textElement.querySelectorAll('*')).filter(node => {
      if (node === textElement) return false;
      if (node.closest?.(`[${PROBE_ATTR}="true"], [data-story-ui-raw-mount="true"]`)) return false;
      const text = normalizeText(node.innerText || node.textContent || '');
      if (!text || text.length > 2500) return false;
      return needles.some(needle => text.includes(needle));
    });
    return (
      candidates
        .map(node => {
          const text = normalizeText(node.innerText || node.textContent || '');
          const childHits = Array.from(node.children || []).filter(child =>
            needles.some(needle => normalizeText(child.innerText || child.textContent || '').includes(needle)),
          ).length;
          return { node, score: text.length + childHits * 600 };
        })
        .sort((a, b) => a.score - b.score)[0]?.node || null
    );
  }

  function clear(scope = doc) {
    const removed = Array.from(scope.querySelectorAll?.(`[${PROBE_ATTR}="true"]`) || []);
    removed.forEach(node => node.remove());
    return { removed: removed.length };
  }

  function run(options = {}) {
    const limit = Number.isFinite(options.limit) ? Number(options.limit) : 5;
    const messageIds = Array.isArray(options.messageIds)
      ? options.messageIds.map(Number).filter(Number.isFinite)
      : getRecentMessageIds(limit);
    const moduleIds = Array.isArray(options.modules) && options.modules.length ? options.modules : TARGET_MODULES;
    const callMount = options.callMount !== false;

    clear(doc);

    const report = {
      ok: true,
      probe: 'controlled-after-native-dom-experiment',
      rules: [
        '不写回 raw message',
        '不调用 set/delete/update 聊天消息 API',
        '不调用 refreshOneMessage',
        '不安装 MutationObserver',
        '只插入可清理 data-story-ui-after-native-probe 节点',
      ],
      callMount,
      messageIds,
      mounted: [],
      skipped: [],
      errors: [],
    };

    if (!ui?.registry) {
      report.ok = false;
      report.errors.push('StoryRegexUI.registry 未就绪');
      console.warn(label, report);
      return report;
    }

    const modules = ui.registry.list?.({ includeDisabled: true }) || [];
    messageIds.forEach(messageId => {
      const messageElement = getMessageElement(messageId);
      const textElement = getTextElement(messageId);
      const rawText = getRawMessage(messageId);
      if (!messageElement || !textElement || !rawText) {
        report.skipped.push({ messageId, reason: 'missing-message-or-text-or-raw' });
        return;
      }

      moduleIds.forEach(moduleId => {
        const module = modules.find(item => item.id === moduleId);
        if (!module) {
          report.skipped.push({ messageId, moduleId, reason: 'module-not-registered' });
          return;
        }
        const rendered = buildNodeForModule(module, rawText, {
          kind: 'after-native-probe',
          mode: 'after-native-probe',
          messageId,
          messageElement,
          textElement,
          theme: ui.theme?.getTheme?.() || 'day',
        });
        const html = toHtml(rendered);
        if (!html) {
          report.skipped.push({ messageId, moduleId, reason: 'render-empty-or-raw-not-matched' });
          return;
        }
        const anchor = findAfterNativeAnchor(textElement, moduleId);
        if (!anchor) {
          report.skipped.push({ messageId, moduleId, reason: 'anchor-not-found' });
          return;
        }
        const mountHost = createProbeHost(module, html, messageId);
        anchor.insertAdjacentElement('afterend', mountHost);
        ui.theme?.applyThemeToRoot?.(mountHost.querySelector?.('.story-ui-root'));
        if (callMount) {
          safe(
            () =>
              ui.registry.safelyCall?.(module, 'mount', mountHost, {
                kind: 'after-native-probe',
                mode: 'after-native-probe',
                rawText,
                messageId,
                node: mountHost,
                messageElement,
                textElement,
              }),
            null,
          );
        }
        report.mounted.push({
          messageId,
          moduleId,
          anchorTag: anchor.tagName?.toLowerCase?.() || '',
          anchorClass: String(anchor.className || ''),
          anchorTextHead: normalizeText(anchor.innerText || anchor.textContent || '').slice(0, 160),
        });
      });
    });

    console.info(label, report);
    return report;
  }

  const api = { run, clear, host, doc };
  window.__jjksAfterNativeControlledProbe = api;
  host.__jjksAfterNativeControlledProbe = api;

  const result = run({ limit: 5, modules: TARGET_MODULES, callMount: true });
  console.info(`${label} 可调用 __jjksAfterNativeControlledProbe.clear() 清理；可调用 __jjksAfterNativeControlledProbe.run({ messageIds:[楼层], modules:['bp-panel'], callMount:false }) 重跑。`);
  return result;
})();
