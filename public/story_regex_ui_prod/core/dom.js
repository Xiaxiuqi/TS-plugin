(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) {
      element.className = options.className;
    }

    if (options.text !== undefined) {
      element.textContent = options.text;
    }

    if (options.html !== undefined) {
      element.innerHTML = options.html;
    }

    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          element.setAttribute(key, String(value));
        }
      });
    }

    if (options.dataset) {
      Object.entries(options.dataset).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          element.dataset[key] = String(value);
        }
      });
    }

    return element;
  }

  function isProcessed(node, moduleId) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    if (moduleId) return node.dataset.storyUiProcessed === moduleId;
    return Boolean(node.dataset.storyUiProcessed);
  }

  function markProcessed(node, moduleId) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    node.dataset.storyUiProcessed = moduleId || '1';
  }

  function getMessageRoots(scope = document) {
    const roots = new Set();

    scope.querySelectorAll?.('.mes_text, .custom-mes_text, [data-story-ui-scan-root]').forEach(root => {
      roots.add(root);
    });

    if (
      scope.nodeType === Node.ELEMENT_NODE &&
      scope.matches?.('.mes_text, .custom-mes_text, [data-story-ui-scan-root]')
    ) {
      roots.add(scope);
    }

    if (roots.size === 0 && scope.body) {
      roots.add(scope.body);
    }

    return Array.from(roots);
  }

  function replaceNode(oldNode, newNode, moduleId) {
    if (!oldNode?.parentNode || !newNode) return null;
    markProcessed(newNode, moduleId);
    oldNode.parentNode.replaceChild(newNode, oldNode);
    return newNode;
  }

  ui.dom = {
    escapeHtml,
    createElement,
    isProcessed,
    markProcessed,
    getMessageRoots,
    replaceNode,
  };
})();
