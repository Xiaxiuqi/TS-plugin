(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'variable-update';
  const MODULE_VERSION = '0.2.0-test-rebuild';
  const BLOCK = {
    open: '<UpdateVariable>',
    close: '</UpdateVariable>',
  };

  function renderContent(content) {
    return dom.escapeHtml(content);
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
    ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(content);
      return fresh.firstElementChild || null;
    }) ||
      (() => {
        const fresh = document.createElement('div');
        fresh.innerHTML = renderShell(content);
        const nextRoot = fresh.firstElementChild;
        if (!nextRoot) return;
        root.replaceWith(nextRoot);
        ui.theme?.applyThemeToRoot?.(nextRoot);
      })();
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    if (node?.dataset?.storyUiVuThemeBound) return;
    node.dataset.storyUiVuThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerender(node);
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 40,
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  });

  ui.variableUpdate = {
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  };
})();
