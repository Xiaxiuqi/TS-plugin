(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'relation-status';
  const MODULE_VERSION = 'v1.2';
  const BLOCK = {
    open: '<status_relationship>',
    close: '</status_relationship>',
  };

  // 标签闭合必须写死为 `</status_relationship>`，避免额外闭合串造成跨模块误匹配。
  const OUTER_PATTERN =
    /<status_relationship>\s*【角色羁绊档案】\s*【本回合情感波动】\s*([\s\S]*?)\s*【已记录角色】\s*([\s\S]*?)\s*<\/status_relationship>/i;
  // 兼容半角/全角竖线与整数/小数好感值；显示进度条时仍会夹取到 0-100。
  const PERSON_PATTERN =
    /^\s*-\s*([^|｜\n]+?)\s*[|｜]\s*好感度[:：]\s*([+-]?\d{1,3}(?:\.\d+)?)\s*\/\s*100\s*[|｜]\s*关系阶段[:：]\s*([^\n<]+?)\s*$/gm;

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function clampPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, num));
  }

  function parseRelationship(rawText) {
    const match = String(rawText || '').match(OUTER_PATTERN);
    const wave = normalizeText(match?.[1] || '');
    const listSource = normalizeText(match?.[2] || '');

    if (!match) {
      return {
        wave: '',
        people: [],
        rawList: normalizeText(rawText),
      };
    }

    const people = [];
    let personMatch;

    PERSON_PATTERN.lastIndex = 0;
    while ((personMatch = PERSON_PATTERN.exec(listSource))) {
      people.push({
        name: normalizeText(personMatch[1]),
        fav: clampPercent(personMatch[2]),
        rawFav: normalizeText(personMatch[2]),
        stage: normalizeText(personMatch[3]),
      });
    }

    return {
      wave,
      people,
      rawList: listSource,
    };
  }

  function renderWaveText(value) {
    return escapeHtml(normalizeText(value)).replace(/&lt;br\s*\/??&gt;/gi, '<br>');
  }

  function renderPersonCard(person) {
    const favText = person.rawFav || String(person.fav);
    return `<div class="rel-person-card"><div class="rel-person-top"><span class="rel-person-name">✦ ${escapeHtml(person.name)}</span><span class="rel-stage">${escapeHtml(person.stage)}</span></div><div class="rel-fav-row"><span>好感</span><div class="rel-bar"><span class="rel-fill" style="--rel-fav:${person.fav}%;"></span></div><span>${escapeHtml(favText)} / 100</span></div></div>`;
  }

  function renderPeopleList(data) {
    if (data.people.length > 0) {
      return data.people.map(renderPersonCard).join('');
    }

    if (data.rawList) {
      return `<div class="rel-empty rel-raw-list">${renderWaveText(data.rawList)}</div>`;
    }

    return '<div class="rel-empty">暂无已记录角色</div>';
  }

  function renderShell(rawText) {
    const data = parseRelationship(rawText);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';
    const waveText = data.wave || '无';
    const subtitle = isNight ? 'SIGNAL TRACE · RELATION ARCHIVE' : '本回合情感波动 · 已记录角色';
    const footer = isNight ? '✧ RELATION SIGNAL TERMINAL ✧' : '✧ RELATION ARCHIVE ✧';

    return `
      <section class="story-ui-root story-ui-rel rel-status-widget ${isNight ? 'rel-hsr-ui' : 'rel-cream-ui'} story-ui-${theme}" data-story-ui-module="${MODULE_ID}">
        <details>
          <summary class="rel-summary" aria-label="展开或收起角色羁绊档案">
            <span class="rel-toggle-icon">♡</span>
            <span class="rel-summary-text">
              <span class="rel-toggle-title">角色羁绊档案</span>
              <span class="rel-toggle-subtitle">${escapeHtml(subtitle)}</span>
            </span>
            <span class="rel-toggle-state toggle-icon">▼</span>
          </summary>

          <section class="rel-panel">
            <div class="rel-body">
              <article class="rel-card rel-card-wave">
                <div class="rel-card-head"><span class="rel-card-dot"></span><span class="rel-card-title">本回合情感波动</span></div>
                <div class="rel-wave">${renderWaveText(waveText)}</div>
              </article>

              <article class="rel-card rel-card-list">
                <div class="rel-card-head"><span class="rel-card-dot"></span><span class="rel-card-title">已记录角色</span></div>
                <div class="rel-list">${renderPeopleList(data)}</div>
              </article>
            </div>

            <footer class="rel-panel-foot">${footer}</footer>
          </section>
        </details>
      </section>
    `;
  }

  function renderContentNode(content, context = {}) {
    const rawText = context?.rawText || `${BLOCK.open}${content}${BLOCK.close}`;
    const wrapper = dom.createElement('div', {
      className: 'story-ui-rel-wrapper',
      html: renderShell(rawText),
    });
    const root = wrapper.firstElementChild || null;
    if (root) root.dataset.storyUiRelRaw = rawText;
    return root;
  }

  function rerender(node) {
    const root = node?.querySelector?.('.story-ui-rel') || node?.querySelector?.('.story-ui-root.story-ui-rel');
    if (!root) return;
    const rawText = root.dataset.storyUiRelRaw ?? '';
    const rerendered = ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(rawText);
      const nextRoot = fresh.firstElementChild;
      if (nextRoot) nextRoot.dataset.storyUiRelRaw = rawText;
      return nextRoot || null;
    });
    if (rerendered) return;

    const fresh = document.createElement('div');
    fresh.innerHTML = renderShell(rawText);
    const nextRoot = fresh.firstElementChild;
    if (!nextRoot) return;
    nextRoot.dataset.storyUiRelRaw = rawText;
    root.replaceWith(nextRoot);
    ui.theme?.applyThemeToRoot?.(nextRoot);
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('relation-status');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root = node?.querySelector?.('.story-ui-rel') || node?.querySelector?.('.story-ui-root.story-ui-rel');
    if (!root) return;
    if (document.documentElement.dataset.storyUiRelThemeBound === 'true') return;
    document.documentElement.dataset.storyUiRelThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 75,
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  });

  ui.relationStatus = {
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  };
})();
