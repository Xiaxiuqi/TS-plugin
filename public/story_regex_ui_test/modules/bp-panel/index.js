(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'bp-panel';
  const MODULE_VERSION = '0.1.0-test';
  const BLOCK = {
    open: '<bp_panel>',
    close: '</bp_panel>',
  };

  const OUTER_PATTERN =
    /<bp_panel>\s*【BP战力雷达】\s*【扫描状态】\s*([\s\S]*?)\s*【已扫描目标】\s*([\s\S]*?)\s*<\/bp_panel>/i;
  const TRAIT_PATTERN = /^\s*-\s*(?!-)([^|:：\n]+?)[:：]\s*(.*?)\s*$/gm;
  const TARGET_SPLIT_PATTERN = /^\s*-\s*名称:\s*/gm;
  const TARGET_BLOCK_PATTERN =
    /^名称:\s*([^|\n]+?)\s*\|\s*BP总值:\s*([+-]?\d+(?:\.\d+)?)\s*\|\s*层级:\s*([^\n]+?)\s*\n\s*操作:\s*([+-]?\d+(?:\.\d+)?)\s*\((.*?)\)\s*\n\s*肉体:\s*([+-]?\d+(?:\.\d+)?)\s*\((.*?)\)\s*\n\s*咒术:\s*([+-]?\d+(?:\.\d+)?)\s*\((.*?)\)\s*\n\s*特性备注:\s*\n([\s\S]*)$/;

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function clampMeterPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, (num / 1000) * 100));
  }

  function parseTraits(rawTraits) {
    const traits = [];
    TRAIT_PATTERN.lastIndex = 0;
    let match;
    while ((match = TRAIT_PATTERN.exec(String(rawTraits || '')))) {
      traits.push({
        name: normalizeText(match[1]),
        content: normalizeText(match[2]),
      });
    }
    return traits;
  }

  function splitTargetBlocks(targetsSource) {
    const source = String(targetsSource || '').replace(/\r\n?/g, '\n');
    const matches = Array.from(source.matchAll(TARGET_SPLIT_PATTERN));
    if (matches.length === 0) return [];

    return matches
      .map((match, index) => {
        const start = match.index ?? 0;
        const end = index + 1 < matches.length ? (matches[index + 1].index ?? source.length) : source.length;
        return source.slice(start, end).trim();
      })
      .filter(Boolean);
  }

  function parseBpPanel(rawText) {
    const match = String(rawText || '').match(OUTER_PATTERN);
    const scanText = normalizeText(match?.[1] || '');
    const targetsSource = normalizeText(match?.[2] || '');
    const targets = [];

    splitTargetBlocks(targetsSource).forEach(block => {
      const normalizedBlock = block.replace(/^\s*-\s*/, '');
      const targetMatch = normalizedBlock.match(TARGET_BLOCK_PATTERN);
      if (!targetMatch) return;

      targets.push({
        name: normalizeText(targetMatch[1]),
        total: normalizeText(targetMatch[2]),
        tier: normalizeText(targetMatch[3]),
        operation: normalizeText(targetMatch[4]),
        operationNote: normalizeText(targetMatch[5]),
        body: normalizeText(targetMatch[6]),
        bodyNote: normalizeText(targetMatch[7]),
        curse: normalizeText(targetMatch[8]),
        curseNote: normalizeText(targetMatch[9]),
        traitsRaw: normalizeText(targetMatch[10]),
        traits: parseTraits(targetMatch[10]),
        rawBlock: normalizeText(block),
      });
    });

    return {
      scanText,
      targets,
      rawTargets: targetsSource,
    };
  }

  function renderMultilineText(value) {
    return escapeHtml(normalizeText(value)).replace(/&lt;br\s*\/??&gt;/gi, '<br>');
  }

  function renderTraitList(target) {
    if (target.traits.length > 0) {
      return target.traits
        .map(
          trait =>
            `<div class="bp-trait"><span class="bp-trait-name">${escapeHtml(trait.name)}</span>：${escapeHtml(trait.content)}</div>`,
        )
        .join('');
    }

    if (target.traitsRaw) {
      return `<div class="bp-trait bp-trait-raw">${renderMultilineText(target.traitsRaw)}</div>`;
    }

    return '<div class="bp-trait bp-trait-empty">暂无特性备注</div>';
  }

  function renderTargetCard(target) {
    const meter = clampMeterPercent(target.total);
    return `
      <div class="bp-target-card">
        <div class="bp-target-top">
          <span class="bp-target-name">✦ ${escapeHtml(target.name)}</span>
          <span class="bp-tier">${escapeHtml(target.tier)}</span>
        </div>
        <div class="bp-total">
          <div class="bp-total-head"><span>BP总值</span><span class="bp-total-value">${escapeHtml(target.total)}</span></div>
          <div class="bp-total-track"><span class="bp-total-fill" style="--bp-meter:${meter}%;"></span></div>
        </div>
        <div class="bp-stat-grid">
          <div class="bp-stat"><div class="bp-stat-label">操作</div><div class="bp-stat-value">${escapeHtml(target.operation)}</div><div class="bp-stat-note">${escapeHtml(target.operationNote)}</div></div>
          <div class="bp-stat"><div class="bp-stat-label">肉体</div><div class="bp-stat-value">${escapeHtml(target.body)}</div><div class="bp-stat-note">${escapeHtml(target.bodyNote)}</div></div>
          <div class="bp-stat"><div class="bp-stat-label">咒术</div><div class="bp-stat-value">${escapeHtml(target.curse)}</div><div class="bp-stat-note">${escapeHtml(target.curseNote)}</div></div>
        </div>
        <div class="bp-trait-title">特性备注</div>
        <div class="bp-trait-list">${renderTraitList(target)}</div>
      </div>
    `;
  }

  function renderTargetGrid(data) {
    if (data.targets.length > 0) {
      return data.targets.map(renderTargetCard).join('');
    }

    if (data.rawTargets) {
      return `<div class="bp-empty bp-raw-targets">${renderMultilineText(data.rawTargets)}</div>`;
    }

    return '<div class="bp-empty">暂无已扫描目标</div>';
  }

  function renderShell(rawText) {
    const data = parseBpPanel(rawText);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';
    const subtitle = isNight ? 'BATTLE POINT TERMINAL · BEFORE WLOG' : '正文之后 · 世界报告之前';
    const footer = isNight ? '✧ BATTLE POINT RADAR TERMINAL ✧' : '✧ BATTLE POINT RADAR ✧';

    return `
      <section class="story-ui-root story-ui-bp story-ui-${theme}" data-story-ui-module="${MODULE_ID}">
        <details>
          <summary class="bp-summary" aria-label="展开或收起BP战力雷达">
            <span class="bp-toggle-icon">✦</span>
            <span class="bp-summary-text">
              <span class="bp-toggle-title">BP战力雷达</span>
              <span class="bp-toggle-subtitle">${escapeHtml(subtitle)}</span>
            </span>
            <span class="bp-toggle-state toggle-icon">▼</span>
          </summary>

          <section class="bp-panel">
            <div class="bp-body">
              <article class="bp-card">
                <div class="bp-card-head"><span class="bp-card-dot"></span><span class="bp-card-title">扫描状态</span></div>
                <div class="bp-scan-text">${renderMultilineText(data.scanText)}</div>
              </article>

              <article class="bp-card">
                <div class="bp-card-head"><span class="bp-card-dot"></span><span class="bp-card-title">已扫描目标</span></div>
                <div class="bp-target-grid">${renderTargetGrid(data)}</div>
              </article>
            </div>

            <footer class="bp-panel-foot">${footer}</footer>
          </section>
        </details>
      </section>
    `;
  }

  function renderContentNode(content, context = {}) {
    const rawText = context?.rawText || `${BLOCK.open}${content}${BLOCK.close}`;
    const wrapper = dom.createElement('div', {
      className: 'story-ui-bp-wrapper',
      html: renderShell(rawText),
    });
    const root = wrapper.firstElementChild || null;
    if (root) root.dataset.storyUiBpRaw = rawText;
    return root;
  }

  function rerender(node) {
    const root = node?.querySelector?.('.story-ui-bp') || node?.querySelector?.('.story-ui-root.story-ui-bp');
    if (!root) return;
    const rawText = root.dataset.storyUiBpRaw ?? '';
    const rerendered = ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(rawText);
      const nextRoot = fresh.firstElementChild;
      if (nextRoot) nextRoot.dataset.storyUiBpRaw = rawText;
      return nextRoot || null;
    });
    if (rerendered) return;

    const fresh = document.createElement('div');
    fresh.innerHTML = renderShell(rawText);
    const nextRoot = fresh.firstElementChild;
    if (!nextRoot) return;
    nextRoot.dataset.storyUiBpRaw = rawText;
    root.replaceWith(nextRoot);
    ui.theme?.applyThemeToRoot?.(nextRoot);
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('bp-panel');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root = node?.querySelector?.('.story-ui-bp') || node?.querySelector?.('.story-ui-root.story-ui-bp');
    if (!root) return;
    if (document.documentElement.dataset.storyUiBpThemeBound === 'true') return;
    document.documentElement.dataset.storyUiBpThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 50,
    block: BLOCK,
    display: {
      startAnchors: ['BP战力雷达', '扫描状态', '已扫描目标', 'BATTLE POINT', '<bp_panel>'],
      endAnchors: ['BATTLE POINT RADAR', 'BATTLE POINT RADAR TERMINAL', '</bp_panel>'],
    },
    renderContent: renderContentNode,
    mount,
  });

  ui.bpPanel = {
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  };
})();
