(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'bp-panel-newvars';
  const MODULE_VERSION = '0.2.0-test-newvars-source-aligned';
  const BLOCK = {
    open: '<bp_panel>',
    close: '</bp_panel>',
  };

  const OUTER_PATTERN =
    /<bp_panel>\s*【BP战力雷达】\s*【扫描状态】\s*([\s\S]*?)\s*【已扫描目标】\s*([\s\S]*?)\s*<\/bp_panel>/i;
  const TARGET_PATTERN =
    /^\s*-\s*名称:\s*([^|\n]+?)\s*\|\s*总BP:\s*([+-]?\d+(?:\.\d+)?)\s*\|\s*战力等级:\s*([^|\n]+?)\s*\|\s*咒术评级:\s*([^\n]+?)\s*\n\s*HP:\s*([^|\n]+?)\s*\/\s*([^|\n]+?)\s*\|\s*防御:\s*([^|\n]+?)\s*\|\s*伤害补正:\s*([^\n]+?)\s*\n\s*咒力:\s*当前([^/\n]+?)\s*\/\s*有效([^/\n]+?)\s*\/\s*原始([^|\n]+?)\s*\|\s*精度([^|\n]+?)\s*\|\s*回复([^|\n]+?)\s*\|\s*消耗倍率([^\n]+?)\s*\n\s*肉体:\s*总肉体值_BPA\s*([^|\n]+?)\s*\|\s*基础([^|\n]+?)\s*\|\s*武艺([^|\n]+?)\s*\|\s*阶段([^|\n]+?)\s*\|\s*输出([^|\n]+?)\s*\|\s*防御系数([^\n]+?)\s*\n\s*术式:\s*术式强度_BPB\s*([^|\n]+?)\s*\|\s*名称([^|\n]+?)\s*\|\s*潜力([^(|\n]+?)\(([^)\n]*?)\)\s*\|\s*精通([^(|\n]+?)\(([^)\n]*?)\)\s*\|\s*基础强度([^|\n]+?)\s*\|\s*当前强度([^\n]+?)\s*\n\s*攻击:\s*咒术([^|\n]+?)\s*\|\s*物理([^|\n]+?)\s*\|\s*咒具([^\n]+?)\s*\n\s*反转:\s*掌握([^|\n]+?)\s*\|\s*等级([^|\n]+?)\s*\|\s*回复([^|\n]+?)\s*\|\s*治疗消耗([^|\n]+?)\s*\|\s*熔断修复消耗([^\n]+?)\s*\n\s*熔断:\s*状态([^|\n]+?)\s*\|\s*大脑重置([^|\n]+?)\s*\|\s*回复惩罚([^|\n]+?)\s*\|\s*强度惩罚([^\n]+?)\s*\n\s*特性备注:\s*\n((?:[ \t]*(?:-\s*)?【[^】\n]+】[:：].+(?:\n|$))*)/gm;
  const TRAIT_PATTERN = /^[ \t]*(?:-\s*)?(【[^】\n]+】)[:：]\s*(.*?)\s*$/gm;

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function clampPercent(value, max) {
    const num = Number(value);
    const maxNum = Number(max);
    if (!Number.isFinite(num) || !Number.isFinite(maxNum) || maxNum <= 0) return '0%';
    return `${Math.max(0, Math.min(100, (num / maxNum) * 100))}%`;
  }

  function parseOuter(rawText) {
    const match = String(rawText || '').match(OUTER_PATTERN);
    return {
      scanText: normalizeText(match?.[1] || ''),
      targetsRaw: normalizeText(match?.[2] || ''),
    };
  }

  function parseTraits(raw) {
    const traits = [];
    TRAIT_PATTERN.lastIndex = 0;
    let match;
    while ((match = TRAIT_PATTERN.exec(String(raw || '')))) {
      traits.push({
        name: normalizeText(match[1]),
        content: normalizeText(match[2]),
      });
    }
    return traits;
  }

  function parseTargets(targetsRaw) {
    const targets = [];
    TARGET_PATTERN.lastIndex = 0;
    let match;
    while ((match = TARGET_PATTERN.exec(String(targetsRaw || '')))) {
      targets.push({
        name: normalizeText(match[1]),
        totalBp: normalizeText(match[2]),
        battleTier: normalizeText(match[3]),
        curseTier: normalizeText(match[4]),
        hpCurrent: normalizeText(match[5]),
        hpMax: normalizeText(match[6]),
        defense: normalizeText(match[7]),
        damageFix: normalizeText(match[8]),
        ceCurrent: normalizeText(match[9]),
        ceEffective: normalizeText(match[10]),
        ceRaw: normalizeText(match[11]),
        ceAccuracy: normalizeText(match[12]),
        ceRecovery: normalizeText(match[13]),
        ceCostRate: normalizeText(match[14]),
        bodyTotal: normalizeText(match[15]),
        bodyBase: normalizeText(match[16]),
        martialValue: normalizeText(match[17]),
        martialStage: normalizeText(match[18]),
        martialOutput: normalizeText(match[19]),
        martialDefense: normalizeText(match[20]),
        techniquePower: normalizeText(match[21]),
        techniqueName: normalizeText(match[22]),
        techniquePotentialValue: normalizeText(match[23]),
        techniquePotentialTier: normalizeText(match[24]),
        techniqueMasteryValue: normalizeText(match[25]),
        techniqueStage: normalizeText(match[26]),
        techniqueBasePower: normalizeText(match[27]),
        techniqueCurrentPower: normalizeText(match[28]),
        curseAttack: normalizeText(match[29]),
        physicalAttack: normalizeText(match[30]),
        toolValue: normalizeText(match[31]),
        reverseKnown: normalizeText(match[32]),
        reverseTier: normalizeText(match[33]),
        reverseRecovery: normalizeText(match[34]),
        reverseHealCost: normalizeText(match[35]),
        reverseFixCost: normalizeText(match[36]),
        burnoutState: normalizeText(match[37]),
        burnoutReset: normalizeText(match[38]),
        burnoutRecoveryPenalty: normalizeText(match[39]),
        burnoutPowerPenalty: normalizeText(match[40]),
        traits: parseTraits(match[41]),
      });
    }
    return targets;
  }

  function renderTraitList(traits) {
    if (!traits.length) {
      return '<div class="bp-trait"><span class="bp-trait-name">【暂无特性】</span>：暂无特性备注</div>';
    }

    return traits
      .map(
        item =>
          `<div class="bp-trait"><span class="bp-trait-name" data-trait="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>：${escapeHtml(item.content)}</div>`,
      )
      .join('');
  }

  function renderTargetCard(target) {
    return `
      <div class="bp-target-card" data-rarity="${escapeHtml(target.battleTier)}">
        <div class="bp-target-top">
          <span class="bp-target-name" data-rarity="${escapeHtml(target.battleTier)}">✦ ${escapeHtml(target.name)}</span>
          <span class="bp-tier-wrap"><span class="bp-tier"><span class="bp-rarity" data-rarity="${escapeHtml(target.battleTier)}">${escapeHtml(target.battleTier)}</span></span></span>
        </div>

        <div class="bp-game-face">
          <div class="bp-face-top">
            <div class="bp-meter-row">
              <div class="bp-meter-head"><span>总BP</span><span class="bp-meter-value">${escapeHtml(target.totalBp)}</span></div>
              <div class="bp-meter-track"><span class="bp-meter-fill bp-fill-bp" style="--bp-meter:${clampPercent(target.totalBp, 3001)};"></span></div>
            </div>
          </div>

          <div class="bp-meter-row">
            <div class="bp-meter-head"><span>HP 生命值</span><span class="bp-meter-value">${escapeHtml(target.hpCurrent)} / ${escapeHtml(target.hpMax)}</span></div>
            <div class="bp-meter-track"><span class="bp-meter-fill bp-fill-hp" style="--bp-meter:${clampPercent(target.hpCurrent, target.hpMax)};"></span></div>
            <div class="bp-meter-sub">防御 ${escapeHtml(target.defense)} · 伤害补正 ${escapeHtml(target.damageFix)}</div>
          </div>

          <div class="bp-meter-row">
            <div class="bp-meter-head"><span>咒力资源</span><span class="bp-meter-value">${escapeHtml(target.ceCurrent)} / ${escapeHtml(target.ceEffective)}</span></div>
            <div class="bp-meter-track"><span class="bp-meter-fill bp-fill-ce" style="--bp-meter:${clampPercent(target.ceCurrent, target.ceEffective)};"></span></div>
            <div class="bp-meter-sub">原始 ${escapeHtml(target.ceRaw)} · 精度 ${escapeHtml(target.ceAccuracy)} · 每轮回复 +${escapeHtml(target.ceRecovery)} · 消耗倍率 ${escapeHtml(target.ceCostRate)}</div>
          </div>
        </div>

        <div class="bp-game-grid">
          <div class="bp-game-panel attack">
            <div class="bp-game-title">攻击输出</div>
            <div class="bp-game-lines">
              <div class="bp-game-line"><span>咒术攻击</span><b>${escapeHtml(target.curseAttack)}</b></div>
              <div class="bp-game-line"><span>物理攻击</span><b>${escapeHtml(target.physicalAttack)}</b></div>
              <div class="bp-game-line"><span>咒具值</span><b>${escapeHtml(target.toolValue)}</b></div>
            </div>
          </div>

          <div class="bp-game-panel">
            <div class="bp-game-title">肉体与武艺</div>
            <div class="bp-game-lines">
              <div class="bp-game-line"><span>总肉体值_BPA</span><b>${escapeHtml(target.bodyTotal)}</b></div>
              <div class="bp-game-line"><span>基础 / 武艺</span><b>${escapeHtml(target.bodyBase)} / ${escapeHtml(target.martialValue)}</b></div>
              <div class="bp-game-line"><span>阶段</span><b><span class="bp-rarity" data-rarity="${escapeHtml(target.martialStage)}">${escapeHtml(target.martialStage)}</span></b></div>
              <div class="bp-game-line"><span>输出 / 防御系数</span><b>${escapeHtml(target.martialOutput)} / ${escapeHtml(target.martialDefense)}</b></div>
            </div>
          </div>

          <div class="bp-game-panel tech">
            <div class="bp-game-title">术式强度</div>
            <div class="bp-game-lines">
              <div class="bp-game-line"><span>术式强度_BPB</span><b>${escapeHtml(target.techniquePower)}</b></div>
              <div class="bp-game-line"><span>生得术式</span><b>${escapeHtml(target.techniqueName)}</b></div>
              <div class="bp-game-line"><span>潜力</span><b>${escapeHtml(target.techniquePotentialValue)} · <span class="bp-rarity" data-rarity="${escapeHtml(target.techniquePotentialTier)}">${escapeHtml(target.techniquePotentialTier)}</span></b></div>
              <div class="bp-game-line"><span>精通 / 阶段</span><b>${escapeHtml(target.techniqueMasteryValue)} / <span class="bp-rarity" data-rarity="${escapeHtml(target.techniqueStage)}">${escapeHtml(target.techniqueStage)}</span></b></div>
              <div class="bp-game-line"><span>基础 / 当前</span><b>${escapeHtml(target.techniqueBasePower)} / ${escapeHtml(target.techniqueCurrentPower)}</b></div>
            </div>
          </div>

          <div class="bp-game-panel support">
            <div class="bp-game-title">反转术式 / 熔断</div>
            <div class="bp-game-lines">
              <div class="bp-game-line"><span>反转治疗</span><b>${escapeHtml(target.reverseKnown)} · ${escapeHtml(target.reverseTier)}</b></div>
              <div class="bp-game-line"><span>回复 / 消耗</span><b>${escapeHtml(target.reverseRecovery)} / ${escapeHtml(target.reverseHealCost)}</b></div>
              <div class="bp-game-line"><span>熔断修复</span><b>${escapeHtml(target.reverseFixCost)}</b></div>
              <div class="bp-game-line"><span>熔断状态</span><b>${escapeHtml(target.burnoutState)}</b></div>
              <div class="bp-game-line"><span>重置 / 惩罚</span><b>${escapeHtml(target.burnoutReset)} · ${escapeHtml(target.burnoutRecoveryPenalty)} / ${escapeHtml(target.burnoutPowerPenalty)}</b></div>
            </div>
          </div>
        </div>

        <div class="bp-trait-title">特性备注</div>
        <div class="bp-trait-list">
${renderTraitList(target.traits)}
        </div>
      </div>
    `;
  }

  function renderShell(rawText) {
    const data = parseOuter(rawText);
    const targets = parseTargets(data.targetsRaw);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';
    const wrapperClass = isNight ? 'bp-hsr-ui' : 'bp-cream-ui';
    const subtitle = isNight ? 'NEW VARIABLE BATTLE POINT TERMINAL · BEFORE WLOG' : '实时战力评估 · 自动嵌入';
    const footer = isNight ? '✧ NEW VARIABLE BATTLE POINT RADAR TERMINAL ✧' : '✧ NEW VARIABLE BATTLE POINT RADAR ✧';

    return `
      <div class="story-ui-root story-ui-bp story-ui-bp-newvars bp-radar-widget ${wrapperClass} bp-newvars-ui" data-story-ui-module="${MODULE_ID}">
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
                <div class="bp-scan-text">${escapeHtml(data.scanText)}</div>
              </article>

              <article class="bp-card">
                <div class="bp-card-head"><span class="bp-card-dot"></span><span class="bp-card-title">已扫描目标</span></div>
                <div class="bp-target-grid">
${targets.length ? targets.map(renderTargetCard).join('') : `<div class="bp-target-card"><div class="bp-trait">${escapeHtml(data.targetsRaw || '暂无已扫描目标')}</div></div>`}
                </div>
              </article>
            </div>

            <footer class="bp-panel-foot">${footer}</footer>
          </section>
        </details>
      </div>
    `;
  }

  function renderContentNode(content, context = {}) {
    const rawText = context?.rawText || `${BLOCK.open}${content}${BLOCK.close}`;

    const wrapper = dom.createElement('div', {
      className: 'story-ui-bp-newvars-wrapper',
      html: renderShell(rawText),
    });
    const root = wrapper.firstElementChild || null;
    if (root) root.dataset.storyUiBpRaw = rawText;
    return root;
  }

  function rerender(node) {
    const root =
      node?.querySelector?.('.story-ui-bp-newvars') || node?.querySelector?.('.story-ui-root.story-ui-bp-newvars');
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
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('bp-panel-newvars');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root =
      node?.querySelector?.('.story-ui-bp-newvars') || node?.querySelector?.('.story-ui-root.story-ui-bp-newvars');
    if (!root) return;
    if (document.documentElement.dataset.storyUiBpNewvarsThemeBound === 'true') return;
    document.documentElement.dataset.storyUiBpNewvarsThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 49,
    enabled: false,
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  });
})();
