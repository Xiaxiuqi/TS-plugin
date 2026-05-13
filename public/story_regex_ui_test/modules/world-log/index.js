(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'world-log';
  const MODULE_VERSION = '0.1.0-test';
  const BLOCK = {
    open: '<wlog',
    close: '</wlog>',
  };

  const WLOG_PATTERN =
    /<wlog\s+time="(?:[^"]*?时间[:：]\s*)?([^"]*)">\s*【世界主线】\s*([\s\S]*?)\s*\*\*\*\s*【重要约定】(?:<br>\s*)?([\s\S]*?)\s*\*\*\*\s*【死亡角色】(?:<br>\s*)?([\s\S]*?)\s*<\/wlog>/i;

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function renderSectionText(value) {
    return escapeHtml(normalizeText(value)).replace(/&lt;br\s*\/??&gt;/gi, '<br>');
  }

  function parseWlog(rawText) {
    const match = String(rawText || '').match(WLOG_PATTERN);
    if (!match) {
      return {
        time: '',
        worldLine: '',
        convention: '',
        deaths: '',
      };
    }

    return {
      time: normalizeText(match[1]),
      worldLine: normalizeText(match[2]),
      convention: normalizeText(match[3]),
      deaths: normalizeText(match[4]),
    };
  }

  function renderShell(rawText) {
    const data = parseWlog(rawText);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';
    const footer = isNight ? '✧ WORLD LOG TERMINAL ✧' : '✧ WORLD LOG ARCHIVE ✧';

    return `
      <section class="story-ui-root story-ui-wlog story-ui-${theme}" data-story-ui-module="${MODULE_ID}">
        <details>
          <summary class="wlog-summary" aria-label="展开或收起世界运行报告">
            <span class="wlog-toggle-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M3.6 9h16.8"></path>
                <path d="M3.6 15h16.8"></path>
                <path d="M12 3a14 14 0 0 1 0 18"></path>
                <path d="M12 3a14 14 0 0 0 0 18"></path>
              </svg>
            </span>
            <span class="wlog-summary-text">
              <span class="wlog-toggle-title">世界运行报告</span>
              <span class="wlog-toggle-subtitle">${escapeHtml(data.time)}</span>
            </span>
            <span class="wlog-toggle-state toggle-icon">▼</span>
          </summary>

          <section class="wlog-panel">
            <div class="wlog-body">
              <article class="wlog-card">
                <div class="wlog-card-head"><span class="wlog-card-mark">✦</span><span class="wlog-card-title">世界主线</span></div>
                <div class="wlog-text">${renderSectionText(data.worldLine)}</div>
              </article>

              <article class="wlog-card">
                <div class="wlog-card-head"><span class="wlog-card-mark">✦</span><span class="wlog-card-title">重要约定</span></div>
                <div class="wlog-text">${renderSectionText(data.convention)}</div>
              </article>

              <article class="wlog-card">
                <div class="wlog-card-head"><span class="wlog-card-mark">✦</span><span class="wlog-card-title">死亡角色</span></div>
                <div class="wlog-text">${renderSectionText(data.deaths)}</div>
              </article>
            </div>

            <footer class="wlog-panel-foot">${footer}</footer>
          </section>
        </details>
      </section>
    `;
  }

  function renderContentNode(content, context = {}) {
    const rawText = context?.rawText || content || '';
    const wrapper = dom.createElement('div', {
      className: 'story-ui-wlog-wrapper',
      html: renderShell(rawText),
    });
    const root = wrapper.firstElementChild || null;
    if (root) root.dataset.storyUiWlogRaw = rawText;
    return root;
  }

  function rerender(node) {
    const root = node?.querySelector?.('.story-ui-wlog') || node?.querySelector?.('.story-ui-root.story-ui-wlog');
    if (!root) return;
    const rawText = root.dataset.storyUiWlogRaw ?? '';
    const rerendered = ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(rawText);
      const nextRoot = fresh.firstElementChild;
      if (nextRoot) nextRoot.dataset.storyUiWlogRaw = rawText;
      return nextRoot || null;
    });
    if (rerendered) return;

    const fresh = document.createElement('div');
    fresh.innerHTML = renderShell(rawText);
    const nextRoot = fresh.firstElementChild;
    if (!nextRoot) return;
    nextRoot.dataset.storyUiWlogRaw = rawText;
    root.replaceWith(nextRoot);
    ui.theme?.applyThemeToRoot?.(nextRoot);
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('world-log');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root = node?.querySelector?.('.story-ui-wlog') || node?.querySelector?.('.story-ui-root.story-ui-wlog');
    if (!root) return;
    if (document.documentElement.dataset.storyUiWlogThemeBound === 'true') return;
    document.documentElement.dataset.storyUiWlogThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 70,
    block: BLOCK,
    display: {
      startAnchors: ['世界运行报告', 'WORLD LOG', '世界主线', '<wlog'],
      endAnchors: ['WORLD LOG ARCHIVE', 'WORLD LOG TERMINAL', '死亡角色', '</wlog>'],
    },
    renderContent: renderContentNode,
    mount,
  });

  ui.worldLog = {
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  };
})();
