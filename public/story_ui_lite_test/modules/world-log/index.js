(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'world-log';
  const MODULE_VERSION = '0.2.0-lite_test-flexible-sections';
  let themeListenerBound = false;
  const handleThemeChanged = () => rerenderAll();
  const BLOCK = {
    open: '<wlog',
    close: '</wlog>',
  };

  const TIME_PATTERN = /<wlog\s+time="(?:[^"]*?时间[:：]\s*)?([^"]*)"/i;
  const SECTION_NAMES = ['世界主线', '重要约定', '死亡角色'];

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function renderSectionText(value) {
    return escapeHtml(normalizeText(value)).replace(/&lt;br\s*\/?\s*&gt;/gi, '<br>');
  }

  function extractSection(source, sectionName) {
    const startPattern = new RegExp(`【${sectionName}】(?:<br>\\s*)?`, 'i');
    const startMatch = source.match(startPattern);
    if (!startMatch) return '';
    const startPos = startMatch.index + startMatch[0].length;
    const remaining = source.slice(startPos);
    const endMatch = remaining.match(/(?:\s*\*\*\*\s*)?(?:【[^】]+】|<\/wlog>)/i);
    const content = endMatch ? remaining.slice(0, endMatch.index) : remaining;
    return normalizeText(content);
  }

  function parseWlog(rawText) {
    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    const timeMatch = source.match(TIME_PATTERN);
    const time = timeMatch ? normalizeText(timeMatch[1]) : '';

    const sections = {};
    SECTION_NAMES.forEach(name => {
      const content = extractSection(source, name);
      if (content) sections[name] = content;
    });

    return { time, sections };
  }

  function renderSectionCard(title, content) {
    if (!content) return '';
    return `
      <article class="wlog-card">
        <div class="wlog-card-head"><span class="wlog-card-mark">✦</span><span class="wlog-card-title">${escapeHtml(title)}</span></div>
        <div class="wlog-text">${renderSectionText(content)}</div>
      </article>
    `;
  }

  function renderCards(sections) {
    const cards = SECTION_NAMES
      .map(name => renderSectionCard(name, sections[name]))
      .filter(Boolean)
      .join('');
    return cards || '<article class="wlog-card"><div class="wlog-text">暂无数据</div></article>';
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
            <span class="wlog-toggle-icon" data-story-ui-theme-toggle title="切换日夜主题">
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
              ${renderCards(data.sections)}
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
    if (themeListenerBound) return;
    themeListenerBound = true;
    document.documentElement.dataset.storyUiWlogThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', handleThemeChanged);
  }

  function cleanup() {
    if (!themeListenerBound) return;
    document.removeEventListener('story-ui-theme-changed', handleThemeChanged);
    themeListenerBound = false;
    delete document.documentElement.dataset.storyUiWlogThemeBound;
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 70,
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
    cleanup,
  });

  ui.worldLog = {
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  };
})();
