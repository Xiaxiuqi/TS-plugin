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
    return `
      <section class="story-ui-root story-ui-vu story-ui-day" data-story-ui-module="${MODULE_ID}">
        <details>
          <summary class="vu-summary" aria-label="展开或收起变量更新">
            <span class="vu-toggle-icon">✦</span>
            <span class="vu-summary-text">
              <span class="vu-toggle-title">变量更新</span>
              <span class="vu-toggle-subtitle">本回合变量变动记录</span>
            </span>
            <span class="vu-toggle-state toggle-icon">▼</span>
          </summary>

          <section class="vu-panel">
            <div class="vu-body">
              <article class="vu-card">
                <div class="vu-card-head"><span class="vu-card-dot"></span><span class="vu-card-title">更新明细</span></div>
                <div class="vu-content">${safeContent}</div>
              </article>
            </div>

            <footer class="vu-panel-foot">✧ VARIABLE UPDATE LOG ✧</footer>
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

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 40,
    block: BLOCK,
    renderContent: renderContentNode,
  });

  ui.variableUpdate = {
    block: BLOCK,
    renderContent: renderContentNode,
  };
})();
