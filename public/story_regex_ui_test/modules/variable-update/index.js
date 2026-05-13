(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'variable-update';
  const MODULE_VERSION = '0.2.0-test-rebuild';
  const BLOCK = {
    open: '<UpdateVariable>',
    close: '</UpdateVariable>',
  };

  function normalizeUpdateContent(content) {
    return String(content || '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\s*<JSONPatch>\s*/i, '')
      .replace(/\s*<\/JSONPatch>\s*$/i, '')
      .trim();
  }

  function renderContent(content) {
    return dom.escapeHtml(normalizeUpdateContent(content));
  }

  function renderShell(content) {
    const safeContent = renderContent(content);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';
    const markIcon = isNight ? '✧' : '✦';
    const subtitle = isNight ? 'VARIABLE UPDATE TERMINAL' : '本回合变量变动记录';
    const footer = isNight ? '✧ VARIABLE UPDATE TERMINAL ✧' : '✧ VARIABLE UPDATE LOG ✧';

    return `
      <section class="story-ui-root story-ui-vu story-ui-${theme}" data-story-ui-module="${MODULE_ID}">
        <details>
          <summary class="vu-summary" aria-label="展开或收起变量更新">
            <span class="vu-toggle-icon" data-story-ui-theme-toggle title="切换日夜主题">${markIcon}</span>
            <span class="vu-summary-text">
              <span class="vu-toggle-title">变量更新</span>
              <span class="vu-toggle-subtitle">${subtitle}</span>
            </span>
            <span class="vu-toggle-state toggle-icon">▼</span>
          </summary>

          <section class="vu-panel">
            <div class="vu-body">
              <div class="vu-content">${safeContent}</div>
            </div>

            <footer class="vu-panel-foot">${footer}</footer>
          </section>
        </details>
      </section>
    `;
  }

  function renderContentNode(content) {
    const wrapper = dom.createElement('div', {
      className: 'story-ui-vu-wrapper',
      html: renderShell(content),
    });

    return wrapper.firstElementChild || null;
  }

  function rerender(node) {
    const root = node?.querySelector?.('.story-ui-vu') || node?.querySelector?.('.story-ui-root.story-ui-vu');
    if (!root) return;
    const content = root.querySelector('.vu-content')?.textContent || '';
    const rerendered = ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(content);
      return fresh.firstElementChild || null;
    });
    if (rerendered) return;

    const fresh = document.createElement('div');
    fresh.innerHTML = renderShell(content);
    const nextRoot = fresh.firstElementChild;
    if (!nextRoot) return;
    root.replaceWith(nextRoot);
    ui.theme?.applyThemeToRoot?.(nextRoot);
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('variable-update');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    if (document.documentElement.dataset.storyUiVuThemeBound === 'true') return;
    document.documentElement.dataset.storyUiVuThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 40,
    block: BLOCK,
    display: {
      startAnchors: ['变量更新', '本回合变量变动记录', 'VARIABLE UPDATE', '<UpdateVariable>'],
      endAnchors: ['VARIABLE UPDATE LOG', 'VARIABLE UPDATE TERMINAL', '</UpdateVariable>'],
    },
    renderContent: renderContentNode,
    mount,
  });

  ui.variableUpdate = {
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  };
})();
