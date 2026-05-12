(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});

  const state = {
    initialized: false,
    scanQueued: false,
    observer: null,
  };

  function normalizeMatches(matches) {
    if (!matches) return [];
    if (Array.isArray(matches)) return matches.filter(Boolean);
    return [matches];
  }

  function isInsideStoryUi(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest?.('.story-ui-root'));
  }

  function scanRoot(root) {
    const registry = ui.registry;
    if (!registry || !root || ui.dom?.isProcessed(root, 'scanner-root')) return;

    registry.list().forEach(module => {
      const matches = normalizeMatches(registry.safelyCall(module, 'detect', root));

      matches.forEach(match => {
        const target = match?.node || match;
        if (!target || ui.dom?.isProcessed(target) || isInsideStoryUi(target)) return;

        const rendered = registry.safelyCall(module, 'render', match, {
          root,
          theme: ui.theme?.getTheme?.() || 'day',
        });

        if (!rendered) return;

        const newNode = ui.dom?.replaceNode(target, rendered, module.id);
        if (!newNode) return;

        newNode.classList?.add?.('story-ui-root');
        ui.theme?.applyTheme?.(newNode);
        registry.safelyCall(module, 'mount', newNode, match);
      });
    });
  }

  function scan(scope = document) {
    const roots = ui.dom?.getMessageRoots?.(scope) || [];

    roots.forEach(root => {
      try {
        scanRoot(root);
      } catch (error) {
        console.error('[StoryRegexUI] 扫描消息节点失败。', error);
      }
    });
  }

  function queueScan(scope = document) {
    if (state.scanQueued) return;

    state.scanQueued = true;
    requestAnimationFrame(() => {
      state.scanQueued = false;
      scan(scope);
    });
  }

  function init() {
    if (state.initialized) {
      queueScan(document);
      return;
    }

    state.initialized = true;

    state.observer = new MutationObserver(mutations => {
      const shouldScan = mutations.some(mutation => {
        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) return false;

        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;
          if (isInsideStoryUi(node)) return false;
          return true;
        });
      });

      if (shouldScan) queueScan(document);
    });

    state.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    queueScan(document);
  }

  function destroy() {
    state.observer?.disconnect?.();
    state.observer = null;
    state.initialized = false;
    state.scanQueued = false;
  }

  ui.scanner = {
    init,
    scan,
    queueScan,
    destroy,
  };
})();
