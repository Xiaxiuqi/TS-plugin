(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'bp-panel-newvars';
  const MODULE_VERSION = '1.0.0-lite_test-dual-panel';
  const BLOCK = {
    open: '<bp_panel>',
    close: '</bp_panel>',
  };

  // ─── 工具函数 ───

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function normalizeText(value) {
    return String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function parseNumber(value) {
    const match = String(value || '').match(/[+-]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function clampPercent(value, max) {
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  }

  // ─── 解析器 ───

  const PLAYER_PATTERN = /<bp_panel_player\b[^>]*>([\s\S]*?)<\/bp_panel_player>/gi;
  const ENEMY_PATTERN = /<bp_panel_enemy\b[^>]*>([\s\S]*?)<\/bp_panel_enemy>/gi;

  function parseBlock(blockContent) {
    const lines = normalizeText(blockContent).split('\n');
    const target = {
      name: '',
      totalBp: '',
      battleTier: '',
      actionMode: '',
      ceMax: '',
      ceCurrent: '',
      ceAccuracy: '',
      bodyTotal: '',
      bodyBase: '',
      martialValue: '',
      techniqueName: '',
      techniquePower: '',
      techniquePotential: '',
      techniqueMastery: '',
      burnoutState: '',
      physicalState: '',
      traitNote: '',
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colonIndex = trimmed.indexOf(':');
      const colonIndexCn = trimmed.indexOf('：');
      let sepIndex = -1;
      if (colonIndex >= 0 && colonIndexCn >= 0) {
        sepIndex = Math.min(colonIndex, colonIndexCn);
      } else if (colonIndex >= 0) {
        sepIndex = colonIndex;
      } else if (colonIndexCn >= 0) {
        sepIndex = colonIndexCn;
      }
      if (sepIndex < 0) continue;

      const key = trimmed.slice(0, sepIndex).trim();
      const value = trimmed.slice(sepIndex + 1).trim();

      switch (key) {
        case '名称':
          target.name = value;
          break;
        case '最终BP':
          target.totalBp = value;
          break;
        case '战力等级':
          target.battleTier = value;
          break;
        case '行为模式':
          target.actionMode = value;
          break;
        case '咒力量上限':
          target.ceMax = value;
          break;
        case '咒力量当前':
          target.ceCurrent = value;
          break;
        case '咒力操纵精度':
          target.ceAccuracy = value;
          break;
        case '总肉体值_BPA':
          target.bodyTotal = value;
          break;
        case '基础肉体':
          target.bodyBase = value;
          break;
        case '武艺':
          target.martialValue = value;
          break;
        case '术式名称':
          target.techniqueName = value;
          break;
        case '术式强度_BPB':
          target.techniquePower = value;
          break;
        case '术式潜力':
          target.techniquePotential = value;
          break;
        case '术式精通':
          target.techniqueMastery = value;
          break;
        case '熔断状态':
          target.burnoutState = value;
          break;
        case '生理状态':
          target.physicalState = value;
          break;
        case '特性备注':
          target.traitNote = value;
          break;
        default:
          break;
      }
    }

    const hasAnyValue = Object.values(target).some(v => typeof v === 'string' && v.trim() !== '');
    if (!hasAnyValue) return null;
    if (!target.name) target.name = '未命名目标';
    return target;
  }

  function parseAllBlocks(rawText) {
    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    const players = [];
    const enemies = [];

    PLAYER_PATTERN.lastIndex = 0;
    let match;
    while ((match = PLAYER_PATTERN.exec(source)) !== null) {
      const parsed = parseBlock(match[1]);
      if (parsed) players.push(parsed);
    }

    ENEMY_PATTERN.lastIndex = 0;
    while ((match = ENEMY_PATTERN.exec(source)) !== null) {
      const parsed = parseBlock(match[1]);
      if (parsed) enemies.push(parsed);
    }

    return { players, enemies };
  }

  // ─── 渲染器 ───

  function renderMeter(label, value, max, fillClass) {
    const numValue = parseNumber(value);
    const numMax = parseNumber(max);
    const percent = clampPercent(numValue, numMax || 1);
    return `
      <div class="bp-meter-row">
        <div class="bp-meter-head">
          <span>${escapeHtml(label)}</span>
          <span class="bp-meter-value">${escapeHtml(value)}${max ? ' / ' + escapeHtml(max) : ''}</span>
        </div>
        <div class="bp-meter-track">
          <span class="bp-meter-fill ${fillClass}" style="--bp-meter:${percent}%"></span>
        </div>
      </div>
    `;
  }

  function renderStatLine(label, value) {
    if (!value && value !== 0) return '';
    const text = String(value);
    if (!text) return '';
    return `<div class="bp-stat-line"><span class="bp-stat-label">${escapeHtml(label)}</span><span class="bp-stat-value">${escapeHtml(text)}</span></div>`;
  }

  function renderTargetCard(target, role) {
    const roleClass = role === 'player' ? 'bp-role-player' : 'bp-role-enemy';
    const roleIcon = role === 'player' ? '◈' : '◆';
    const bpNum = parseNumber(target.totalBp);
    const bpMax = 3001;
    const bpPercent = clampPercent(bpNum, bpMax);

    const ceNum = parseNumber(target.ceCurrent);
    const ceMaxNum = parseNumber(target.ceMax);

    const hasPhysicalState = String(target.physicalState || '').trim() !== '';

    return `
      <div class="bp-target-card ${roleClass}">
        <div class="bp-target-header">
          <span class="bp-role-icon">${roleIcon}</span>
          <span class="bp-target-name">${escapeHtml(target.name)}</span>
          ${target.battleTier ? `<span class="bp-target-tier" data-tier="${escapeHtml(target.battleTier)}">${escapeHtml(target.battleTier)}</span>` : ''}
        </div>

        ${target.totalBp ? `<div class="bp-target-bp-row">
          <div class="bp-bp-number">${escapeHtml(target.totalBp)}</div>
          <div class="bp-bp-label">最终BP</div>
          <div class="bp-meter-track bp-bp-track">
            <span class="bp-meter-fill bp-fill-bp" style="--bp-meter:${bpPercent}%"></span>
          </div>
        </div>` : ''}

        ${target.actionMode ? `<div class="bp-action-mode"><span class="bp-action-label">行为模式</span>${escapeHtml(target.actionMode)}</div>` : ''}

        <div class="bp-meters-section">
          ${target.ceCurrent || target.ceMax ? renderMeter('咒力', target.ceCurrent || '0', target.ceMax || '0', 'bp-fill-ce') : ''}
          ${hasPhysicalState ? renderMeter('生理状态', String(parseNumber(target.physicalState)), '100', 'bp-fill-hp') : ''}
        </div>

        <div class="bp-stats-grid">
          <div class="bp-stats-group">
            <div class="bp-group-title">肉体</div>
            ${renderStatLine('总肉体值_BPA', target.bodyTotal)}
            ${renderStatLine('基础肉体', target.bodyBase)}
            ${renderStatLine('武艺', target.martialValue)}
          </div>
          <div class="bp-stats-group">
            <div class="bp-group-title">术式</div>
            ${renderStatLine('名称', target.techniqueName)}
            ${renderStatLine('术式强度_BPB', target.techniquePower)}
            ${renderStatLine('潜力', target.techniquePotential)}
            ${renderStatLine('精通', target.techniqueMastery)}
          </div>
        </div>

        <div class="bp-bottom-stats">
          ${renderStatLine('咒力操纵精度', target.ceAccuracy)}
          ${renderStatLine('熔断状态', target.burnoutState)}
          ${target.traitNote ? `<div class="bp-trait-note"><span class="bp-trait-label">特性备注</span><span class="bp-trait-content">${escapeHtml(target.traitNote)}</span></div>` : ''}
        </div>
      </div>
    `;
  }

  function renderSideTab(targets, role, activeIndex) {
    if (targets.length <= 1) return '';
    const items = targets
      .map(
        (target, index) =>
          `<button class="bp-tab-item ${index === activeIndex ? 'active' : ''}" data-bp-tab-role="${role}" data-bp-tab-index="${index}" type="button" title="${escapeHtml(target.name)}">${escapeHtml(target.name)}</button>`,
      )
      .join('');
    return `<div class="bp-side-tabs bp-tabs-${role}">${items}</div>`;
  }

  function renderDualPanel(data) {
    const playerIndex = 0;
    const enemyIndex = 0;
    const player = data.players[playerIndex] || null;
    const enemy = data.enemies[enemyIndex] || null;

    const leftTab = renderSideTab(data.players, 'player', playerIndex);
    const rightTab = renderSideTab(data.enemies, 'enemy', enemyIndex);

    const leftCard = player
      ? renderTargetCard(player, 'player')
      : '<div class="bp-empty-slot">暂无 Player 数据</div>';
    const rightCard = enemy
      ? renderTargetCard(enemy, 'enemy')
      : '<div class="bp-empty-slot">暂无 Enemy 数据</div>';

    return `
      <div class="bp-dual-layout" data-player-count="${data.players.length}" data-enemy-count="${data.enemies.length}" data-player-active="0" data-enemy-active="0">
        ${leftTab}
        <div class="bp-dual-main">
          <div class="bp-dual-col bp-col-player">${leftCard}</div>
          <div class="bp-dual-divider"></div>
          <div class="bp-dual-col bp-col-enemy">${rightCard}</div>
        </div>
        ${rightTab}
      </div>
    `;
  }

  function renderShell(rawText) {
    const data = parseAllBlocks(rawText);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';
    const wrapperClass = isNight ? 'story-ui-night' : 'story-ui-day';
    const subtitle = isNight ? 'BATTLE POINT RADAR · DUAL SCAN' : '实时战力评估 · 双面板';
    const markIcon = isNight ? '✧' : '✦';
    const footer = isNight ? '✧ BATTLE POINT RADAR TERMINAL ✧' : '✧ BP 战力雷达 ✧';

    const hasData = data.players.length > 0 || data.enemies.length > 0;
    const bodyHtml = hasData
      ? renderDualPanel(data)
      : '<div class="bp-empty-slot">暂无战力数据</div>';

    return `
      <div class="story-ui-root story-ui-bp story-ui-bp-newvars bp-radar-widget ${wrapperClass}" data-story-ui-module="${MODULE_ID}">
        <details>
          <summary class="bp-summary" aria-label="展开或收起BP战力雷达">
            <span class="bp-toggle-icon" data-story-ui-theme-toggle title="切换日夜主题">${markIcon}</span>
            <span class="bp-summary-text">
              <span class="bp-toggle-title">BP战力雷达</span>
              <span class="bp-toggle-subtitle">${escapeHtml(subtitle)}</span>
            </span>
            <span class="bp-toggle-state toggle-icon">▼</span>
          </summary>

          <section class="bp-panel">
            <div class="bp-body">
              ${bodyHtml}
            </div>
            <footer class="bp-panel-foot">${footer}</footer>
          </section>
        </details>
      </div>
    `;
  }

  // ─── Tab 切换交互 ───

  function handleTabClick(event) {
    const button = event.target.closest('[data-bp-tab-role]');
    if (!button) return;

    const role = button.dataset.bpTabRole;
    const index = Number(button.dataset.bpTabIndex);
    if (!Number.isFinite(index)) return;

    const widget = button.closest('.bp-radar-widget');
    if (!widget) return;

    const layout = widget.querySelector('.bp-dual-layout');
    if (!layout) return;

    const rawText = widget.dataset.storyUiBpRaw || '';
    const data = parseAllBlocks(rawText);

    if (role === 'player') {
      layout.dataset.playerActive = String(index);
      const col = layout.querySelector('.bp-col-player');
      const target = data.players[index];
      if (col && target) col.innerHTML = renderTargetCard(target, 'player');
    } else {
      layout.dataset.enemyActive = String(index);
      const col = layout.querySelector('.bp-col-enemy');
      const target = data.enemies[index];
      if (col && target) col.innerHTML = renderTargetCard(target, 'enemy');
    }

    // 更新 tab active 状态
    const tabs = widget.querySelectorAll(`[data-bp-tab-role="${role}"]`);
    tabs.forEach(tab => {
      tab.classList.toggle('active', Number(tab.dataset.bpTabIndex) === index);
    });
  }

  // ─── 模块接口 ───

  function renderContentNode(content, context = {}) {
    const rawText = context?.rawText || `${BLOCK.open}${content}${BLOCK.close}`;

    const wrapper = dom.createElement('div', {
      className: 'story-ui-bp-newvars-wrapper',
      html: renderShell(rawText),
    });
    const root = wrapper.firstElementChild || null;
    if (root) {
      root.dataset.storyUiBpRaw = rawText;
    }
    return root;
  }

  function rerender(node) {
    const root =
      node?.querySelector?.('.story-ui-bp-newvars') || node?.querySelector?.('.story-ui-root.story-ui-bp-newvars') || node?.querySelector?.('.bp-radar-widget');
    if (!root) return;
    const rawText = root.dataset.storyUiBpRaw ?? '';
    const rerendered = ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(rawText);
      const nextRoot = fresh.firstElementChild;
      if (nextRoot) {
        nextRoot.dataset.storyUiBpRaw = rawText;
      }
      return nextRoot || null;
    });
    if (rerendered) return;
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('bp-panel-newvars');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root = node?.querySelector?.('.bp-radar-widget');
    if (!root) return;
    if (document.documentElement.dataset.storyUiBpNewvarsThemeBound === 'true') return;
    document.documentElement.dataset.storyUiBpNewvarsThemeBound = 'true';

    // 事件委托到 document 级别，避免 innerHTML 挂载后事件丢失
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-bp-tab-role]')) {
        handleTabClick(event);
      }
    });

    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 60,
    enabled: true,
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  });
})();
