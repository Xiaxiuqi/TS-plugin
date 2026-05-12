(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const STRONG_MARKERS = ['<UpdateVariable>', '<update_variable>', '</UpdateVariable>', '</update_variable>', '_.set('];
  const TITLE_MARKERS = ['变量更新', '变量变更', '变量记录'];
  const UPDATE_VARIABLE_ELEMENT_SELECTOR = 'updatevariable, UpdateVariable, update_variable';

  function hasStrongVariableMarker(text) {
    return STRONG_MARKERS.some(marker => text.includes(marker));
  }

  function hasVariableTitle(text) {
    return TITLE_MARKERS.some(marker => text.includes(marker));
  }

  function isLikelyVariableBlock(node, text) {
    if (!text || text.length < 8) return false;
    if (hasStrongVariableMarker(text)) return true;

    const tagName = node.tagName?.toLowerCase?.() || '';
    const isCodeBlock = tagName === 'pre' || tagName === 'code';
    if (isCodeBlock && hasVariableTitle(text)) return true;

    const lineCount = text.split(/\r?\n/).filter(line => line.trim()).length;
    if (isCodeBlock && text.includes('stat_data') && lineCount >= 2) return true;

    return false;
  }

  function findVariableBlocks(root) {
    const candidates = [];

    root.querySelectorAll?.('pre, code, [data-story-ui-variable-update]').forEach(node => {
      if (dom?.isProcessed(node) || node.closest?.('.story-ui-root')) return;
      const text = node.textContent || '';
      if (isLikelyVariableBlock(node, text)) {
        candidates.push({
          node,
          rawText: text,
        });
      }
    });

    root.querySelectorAll?.(UPDATE_VARIABLE_ELEMENT_SELECTOR).forEach(node => {
      if (dom?.isProcessed(node) || node.closest?.('.story-ui-root')) return;
      const text = `<UpdateVariable>\n${node.textContent || ''}\n</UpdateVariable>`;
      if (isLikelyVariableBlock(node, text)) {
        candidates.push({
          node,
          rawText: text,
          kind: 'element',
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
    version: '0.1.1-test',
    priority: 40,
    detect: findVariableBlocks,
    render,
  });
})();
