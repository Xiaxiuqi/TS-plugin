(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  function findVariableBlocks(root) {
    const candidates = [];

    root.querySelectorAll?.('pre, code, div, section').forEach(node => {
      if (dom?.isProcessed(node) || node.closest?.('.story-ui-root')) return;

      const text = node.textContent || '';
      if (
        text.includes('变量更新') ||
        text.includes('<UpdateVariable>') ||
        text.includes('<update_variable>') ||
        text.includes('_.set(') ||
        text.includes('stat_data')
      ) {
        candidates.push({
          node,
          rawText: text,
        });
      }
    });

    return candidates;
  }

  function extractLines(rawText) {
    return String(rawText || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 80);
  }

  function render(match) {
    const lines = extractLines(match.rawText);
    if (lines.length === 0) return null;

    const container = dom.createElement('section', {
      className: 'story-ui-root story-ui-vu story-ui-day',
      attrs: {
        'data-story-ui-module': 'variable-update',
      },
    });

    const html = `
      <details open class="story-ui-vu-shell">
        <summary class="story-ui-vu-head">
          <span class="story-ui-vu-mark">✦</span>
          <span class="story-ui-vu-title">变量更新</span>
          <button class="story-ui-vu-theme story-ui-theme-toggle" type="button" data-story-ui-theme-toggle>日 / 夜</button>
        </summary>
        <div class="story-ui-vu-body">
          ${lines.map(line => `<div class="story-ui-vu-line">${dom.escapeHtml(line)}</div>`).join('')}
        </div>
      </details>
    `;

    container.innerHTML = html;
    return container;
  }

  ui.registry?.register?.({
    id: 'variable-update',
    version: '0.1.0-test',
    priority: 40,
    detect: findVariableBlocks,
    render,
  });
})();
