(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'bp-panel-newvars';
  const MODULE_VERSION = '0.2.2-regex-layout-aligned';
  const BLOCK = {
    open: '<bp_panel>',
    close: '</bp_panel>',
  };

  const OUTER_PATTERN =
    /<bp_panel>\s*【BP战力雷达】\s*【扫描状态】\s*([\s\S]*?)\s*【已扫描目标】\s*([\s\S]*?)\s*<\/bp_panel>/i;
  const TRAIT_PATTERN = /^[ \t]*(?:-\s*)?(【[^】\n]+】)[:：]\s*(.*?)\s*$/gm;
  const TARGET_SPLIT_PATTERN = /^\s*-\s*名称\s*[:：]\s*/gm;

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

  function parseNumber(value) {
    const match = String(value || '').match(/[+-]?\d+(?:\.\d+)?/);
    return match ? match[0] : '';
  }

  function splitValueAndTier(value) {
    const text = normalizeText(value);
    const match = text.match(/^([\s\S]*?)\s*\(([^)]+)\)\s*$/);
    if (!match) return { value: text, tier: '' };
    return { value: normalizeText(match[1]), tier: normalizeText(match[2]) };
  }

  function parseOuter(rawText) {
    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    const match = source.match(OUTER_PATTERN);
    if (match) {
      return {
        scanText: normalizeText(match[1]),
        targetsRaw: normalizeText(match[2]),
      };
    }

    const contentMatch = source.match(/<bp_panel>([\s\S]*?)<\/bp_panel>/i);
    const content = contentMatch ? contentMatch[1] : source;
    const scanIndex = content.search(/【扫描状态】/);
    const targetIndex = content.search(/【已扫描目标】/);
    if (scanIndex < 0 && targetIndex < 0) {
      return { scanText: '', targetsRaw: normalizeText(content) };
    }

    const scanStart = scanIndex >= 0 ? scanIndex + '【扫描状态】'.length : 0;
    const scanEnd = targetIndex >= 0 ? targetIndex : content.length;
    const targetStart = targetIndex >= 0 ? targetIndex + '【已扫描目标】'.length : content.length;
    return {
      scanText: normalizeText(content.slice(scanStart, scanEnd).replace(/【BP战力雷达】/g, '')),
      targetsRaw: normalizeText(content.slice(targetStart)),
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

  function splitTargetBlocks(targetsSource) {
    const source = String(targetsSource || '')
      .replace(/\r\n?/g, '\n')
      .trim();
    if (!source || /^无[。.]?$/.test(source) || /^暂无/.test(source)) return [];
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

  function addLegacyField(target, label, value) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return;
    target.legacy.push({ label, value: normalizedValue });
  }

  function parseHeaderLine(line, target) {
    const normalized = normalizeText(line).replace(/^\s*-\s*/, '');
    const parts = normalized
      .split('|')
      .map(part => normalizeText(part))
      .filter(Boolean);
    parts.forEach((part, index) => {
      const pair = part.match(/^([^:：]+)[:：]\s*([\s\S]*?)$/);
      if (!pair) return;
      const key = normalizeText(pair[1]);
      const value = normalizeText(pair[2]);
      if (index === 0 && key === '名称') target.name = value;
      else if (key === '总BP' || key === 'BP总值') target.totalBp = value;
      else if (key === '战力等级' || key === '层级') target.battleTier = value;
      else if (key === '咒术评级' || key === '战力评级') target.curseTier = value;
      else addLegacyField(target, key, value);
    });
  }

  function parsePipeLine(line, target) {
    const text = normalizeText(line);
    const pair = text.match(/^([^:：]+)[:：]\s*([\s\S]*?)$/);
    if (!pair) return false;

    const groupName = normalizeText(pair[1]);
    const body = normalizeText(pair[2]);
    if (!body) return true;

    if (groupName === 'HP') {
      const hpPair = body.match(/^([^|/\n]+?)\s*\/\s*([^|\n]+?)(?:\s*\||$)/);
      if (hpPair) {
        target.hpCurrent = normalizeText(hpPair[1]);
        target.hpMax = normalizeText(hpPair[2]);
      }
      body
        .split('|')
        .slice(1)
        .forEach(part => {
          const item = normalizeText(part);
          const itemMatch = item.match(/^(防御|伤害补正)\s*[:：]?\s*([\s\S]*?)$/);
          if (!itemMatch) return;
          if (itemMatch[1] === '防御') target.defense = normalizeText(itemMatch[2]);
          if (itemMatch[1] === '伤害补正') target.damageFix = normalizeText(itemMatch[2]);
        });
      return true;
    }

    if (groupName === '咒力') {
      const ceMatch = body.match(/当前\s*([^/|]+?)\s*\/\s*有效\s*([^/|]+?)\s*\/\s*原始\s*([^|\n]+)/);
      if (ceMatch) {
        target.ceCurrent = normalizeText(ceMatch[1]);
        target.ceEffective = normalizeText(ceMatch[2]);
        target.ceRaw = normalizeText(ceMatch[3]);
      }
      body
        .split('|')
        .slice(1)
        .forEach(part => {
          const item = normalizeText(part);
          const itemMatch = item.match(/^(精度|回复|消耗倍率)\s*([\s\S]*?)$/);
          if (!itemMatch) return;
          if (itemMatch[1] === '精度') target.ceAccuracy = normalizeText(itemMatch[2]);
          if (itemMatch[1] === '回复') target.ceRecovery = normalizeText(itemMatch[2]);
          if (itemMatch[1] === '消耗倍率') target.ceCostRate = normalizeText(itemMatch[2]);
        });
      return true;
    }

    if (groupName === '肉体') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(总肉体值_BPA|基础|武艺|阶段|输出|防御系数)\s*([\s\S]*?)$/);
        if (!itemMatch) return;
        const value = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '总肉体值_BPA') target.bodyTotal = value;
        if (itemMatch[1] === '基础') target.bodyBase = value;
        if (itemMatch[1] === '武艺') target.martialValue = value;
        if (itemMatch[1] === '阶段') target.martialStage = value;
        if (itemMatch[1] === '输出') target.martialOutput = value;
        if (itemMatch[1] === '防御系数') target.martialDefense = value;
      });
      return true;
    }

    if (groupName === '术式') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(术式强度_BPB|名称|潜力|精通|基础强度|当前强度)\s*([\s\S]*?)$/);
        if (!itemMatch) return;
        const value = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '术式强度_BPB') target.techniquePower = value;
        if (itemMatch[1] === '名称') target.techniqueName = value;
        if (itemMatch[1] === '潜力') {
          const parsed = splitValueAndTier(value);
          target.techniquePotentialValue = parsed.value;
          target.techniquePotentialTier = parsed.tier;
        }
        if (itemMatch[1] === '精通') {
          const parsed = splitValueAndTier(value);
          target.techniqueMasteryValue = parsed.value;
          target.techniqueStage = parsed.tier;
        }
        if (itemMatch[1] === '基础强度') target.techniqueBasePower = value;
        if (itemMatch[1] === '当前强度') target.techniqueCurrentPower = value;
      });
      return true;
    }

    if (groupName === '攻击') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(咒术|物理|咒具)\s*([\s\S]*?)$/);
        if (!itemMatch) return;
        if (itemMatch[1] === '咒术') target.curseAttack = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '物理') target.physicalAttack = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '咒具') target.toolValue = normalizeText(itemMatch[2]);
      });
      return true;
    }

    if (groupName === '反转') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(掌握|等级|回复|治疗消耗|熔断修复消耗)\s*([\s\S]*?)$/);
        if (!itemMatch) return;
        if (itemMatch[1] === '掌握') target.reverseKnown = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '等级') target.reverseTier = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '回复') target.reverseRecovery = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '治疗消耗') target.reverseHealCost = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '熔断修复消耗') target.reverseFixCost = normalizeText(itemMatch[2]);
      });
      return true;
    }

    if (groupName === '熔断') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(状态|大脑重置|回复惩罚|强度惩罚)\s*([\s\S]*?)$/);
        if (!itemMatch) return;
        if (itemMatch[1] === '状态') target.burnoutState = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '大脑重置') target.burnoutReset = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '回复惩罚') target.burnoutRecoveryPenalty = normalizeText(itemMatch[2]);
        if (itemMatch[1] === '强度惩罚') target.burnoutPowerPenalty = normalizeText(itemMatch[2]);
      });
      return true;
    }

    addLegacyField(target, groupName, body);
    return true;
  }

  function createEmptyTarget() {
    return {
      name: '',
      totalBp: '',
      battleTier: '',
      curseTier: '',
      hpCurrent: '',
      hpMax: '',
      defense: '',
      damageFix: '',
      ceCurrent: '',
      ceEffective: '',
      ceRaw: '',
      ceAccuracy: '',
      ceRecovery: '',
      ceCostRate: '',
      bodyTotal: '',
      bodyBase: '',
      martialValue: '',
      martialStage: '',
      martialOutput: '',
      martialDefense: '',
      techniquePower: '',
      techniqueName: '',
      techniquePotentialValue: '',
      techniquePotentialTier: '',
      techniqueMasteryValue: '',
      techniqueStage: '',
      techniqueBasePower: '',
      techniqueCurrentPower: '',
      curseAttack: '',
      physicalAttack: '',
      toolValue: '',
      reverseKnown: '',
      reverseTier: '',
      reverseRecovery: '',
      reverseHealCost: '',
      reverseFixCost: '',
      burnoutState: '',
      burnoutReset: '',
      burnoutRecoveryPenalty: '',
      burnoutPowerPenalty: '',
      traits: [],
      legacy: [],
      rawBlock: '',
    };
  }

  function parseTargetBlock(block) {
    const target = createEmptyTarget();
    target.rawBlock = normalizeText(block);
    const lines = String(block || '')
      .replace(/\r\n?/g, '\n')
      .split('\n');
    const traitLines = [];
    let inTraits = false;

    lines.forEach((line, index) => {
      const text = normalizeText(line);
      if (!text) return;
      if (index === 0 || /^\s*-\s*名称\s*[:：]/.test(line)) {
        parseHeaderLine(line, target);
        return;
      }
      if (/^特性备注\s*[:：]?\s*$/.test(text)) {
        inTraits = true;
        return;
      }
      if (inTraits) {
        traitLines.push(line);
        return;
      }
      parsePipeLine(line, target);
    });

    target.traits = parseTraits(traitLines.join('\n'));
    if (!target.name) return null;
    return target;
  }

  function parseTargets(targetsRaw) {
    return splitTargetBlocks(targetsRaw).map(parseTargetBlock).filter(Boolean);
  }

  function renderMultilineText(value) {
    return escapeHtml(normalizeText(value)).replace(/&lt;br\s*\/??&gt;/gi, '<br>');
  }

  function renderTraitList(traits) {
    if (!traits.length) return '';
    return traits
      .map(
        item =>
          `<div class="bp-trait"><span class="bp-trait-name" data-trait="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>：${escapeHtml(item.content)}</div>`,
      )
      .join('');
  }

  function rarityPill(value) {
    const text = normalizeText(value);
    if (!text) return '';
    return `<span class="bp-rarity" data-rarity="${escapeHtml(text)}">${escapeHtml(text)}</span>`;
  }

  function renderGameLine(label, value, options = {}) {
    const text = normalizeText(value);
    if (!text) return '';
    const renderedValue = options.rarity ? rarityPill(text) : escapeHtml(text);
    return `<div class="bp-game-line"><span>${escapeHtml(label)}</span><b>${renderedValue}</b></div>`;
  }

  function renderCombinedLine(label, left, right, separator = ' / ') {
    const lhs = normalizeText(left);
    const rhs = normalizeText(right);
    if (!lhs && !rhs) return '';
    return renderGameLine(label, [lhs, rhs].filter(Boolean).join(separator));
  }

  function renderPanel(title, lines, className = '') {
    const html = lines.filter(Boolean).join('');
    if (!html) return '';
    return `<div class="bp-game-panel ${className}"><div class="bp-game-title">${escapeHtml(title)}</div><div class="bp-game-lines">${html}</div></div>`;
  }

  function renderMeter(label, value, meterType, max, sub = '') {
    const text = normalizeText(value);
    if (!text) return '';
    const className = meterType === 'hp' ? 'bp-fill-hp' : meterType === 'ce' ? 'bp-fill-ce' : 'bp-fill-bp';
    const percent = clampPercent(parseNumber(text), parseNumber(max));
    return `<div class="bp-meter-row"><div class="bp-meter-head"><span>${escapeHtml(label)}</span><span class="bp-meter-value">${escapeHtml(text)}</span></div><div class="bp-meter-track"><span class="bp-meter-fill ${className}" style="--bp-meter:${percent};"></span></div>${sub ? `<div class="bp-meter-sub">${escapeHtml(sub)}</div>` : ''}</div>`;
  }

  function renderLegacyPanel(target) {
    if (!target.legacy.length) return '';
    return renderPanel(
      '简化战力',
      target.legacy.map(item => renderGameLine(item.label, item.value)),
    );
  }

  function renderTargetCard(target) {
    const rarity = target.battleTier || target.martialStage || '';
    const traitHtml = renderTraitList(target.traits);
    const hpValue = target.hpCurrent || target.hpMax ? `${target.hpCurrent || '?'} / ${target.hpMax || '?'}` : '';
    const ceValue =
      target.ceCurrent || target.ceEffective ? `${target.ceCurrent || '?'} / ${target.ceEffective || '?'}` : '';
    const hpSub = [
      target.defense ? `防御 ${target.defense}` : '',
      target.damageFix ? `伤害补正 ${target.damageFix}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const ceSub = [
      target.ceRaw ? `原始 ${target.ceRaw}` : '',
      target.ceAccuracy ? `精度 ${target.ceAccuracy}` : '',
      target.ceRecovery ? `每轮回复 +${target.ceRecovery}` : '',
      target.ceCostRate ? `消耗倍率 ${target.ceCostRate}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    return `
      <div class="bp-target-card" data-rarity="${escapeHtml(rarity)}">
        <div class="bp-target-top">
          <span class="bp-target-name" data-rarity="${escapeHtml(rarity)}">✦ ${escapeHtml(target.name)}</span>
          <span class="bp-tier-wrap">
            ${target.battleTier ? `<span class="bp-tier">${rarityPill(target.battleTier)}</span>` : ''}
            ${target.curseTier ? `<span class="bp-tier">${rarityPill(target.curseTier)}</span>` : ''}
          </span>
        </div>

        <div class="bp-game-face">
          ${renderMeter('总BP', target.totalBp, 'bp', 3001)}
          ${renderMeter('HP 生命值', hpValue, 'hp', target.hpMax, hpSub)}
          ${renderMeter('咒力资源', ceValue, 'ce', target.ceEffective, ceSub)}
        </div>

        <div class="bp-game-grid">
          ${renderPanel(
            '攻击输出',
            [
              renderGameLine('咒术攻击', target.curseAttack),
              renderGameLine('物理攻击', target.physicalAttack),
              renderGameLine('咒具值', target.toolValue),
            ],
            'attack',
          )}
          ${renderPanel('肉体与武艺', [
            renderGameLine('总肉体值_BPA', target.bodyTotal),
            renderCombinedLine('基础 / 武艺', target.bodyBase, target.martialValue),
            renderGameLine('阶段', target.martialStage, { rarity: true }),
            renderCombinedLine('输出 / 防御系数', target.martialOutput, target.martialDefense),
          ])}
          ${renderPanel(
            '术式强度',
            [
              renderGameLine('术式强度_BPB', target.techniquePower),
              renderGameLine('生得术式', target.techniqueName),
              target.techniquePotentialValue || target.techniquePotentialTier
                ? `<div class="bp-game-line"><span>潜力</span><b>${escapeHtml(target.techniquePotentialValue)}${target.techniquePotentialTier ? ` · ${rarityPill(target.techniquePotentialTier)}` : ''}</b></div>`
                : '',
              target.techniqueMasteryValue || target.techniqueStage
                ? `<div class="bp-game-line"><span>精通 / 阶段</span><b>${escapeHtml(target.techniqueMasteryValue)}${target.techniqueStage ? ` / ${rarityPill(target.techniqueStage)}` : ''}</b></div>`
                : '',
              renderCombinedLine('基础 / 当前', target.techniqueBasePower, target.techniqueCurrentPower),
            ],
            'tech',
          )}
          ${renderPanel(
            '反转术式 / 熔断',
            [
              renderCombinedLine('反转治疗', target.reverseKnown, target.reverseTier, ' · '),
              renderCombinedLine('回复 / 消耗', target.reverseRecovery, target.reverseHealCost),
              renderGameLine('熔断修复', target.reverseFixCost),
              renderGameLine('熔断状态', target.burnoutState),
              target.burnoutReset || target.burnoutRecoveryPenalty || target.burnoutPowerPenalty
                ? renderGameLine(
                    '重置 / 惩罚',
                    `${target.burnoutReset || '?'} · ${target.burnoutRecoveryPenalty || '?'} / ${target.burnoutPowerPenalty || '?'}`,
                  )
                : '',
            ],
            'support',
          )}
          ${renderLegacyPanel(target)}
        </div>

        ${traitHtml ? `<div class="bp-trait-title">特性备注</div><div class="bp-trait-list">${traitHtml}</div>` : ''}
      </div>
    `;
  }

  function renderTargetGrid(data, targets) {
    if (targets.length > 0) return targets.map(renderTargetCard).join('');
    const raw = normalizeText(data.targetsRaw);
    if (!raw || /^无[。.]?$/.test(raw))
      return '<div class="bp-target-card"><div class="bp-trait">暂无已扫描目标</div></div>';
    return `<div class="bp-target-card"><div class="bp-trait bp-trait-raw">${renderMultilineText(raw)}</div></div>`;
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
                <div class="bp-scan-text">${renderMultilineText(data.scanText || '暂无扫描数据。')}</div>
              </article>

              <article class="bp-card">
                <div class="bp-card-head"><span class="bp-card-dot"></span><span class="bp-card-title">已扫描目标</span></div>
                <div class="bp-target-grid">${renderTargetGrid(data, targets)}</div>
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
    if (!/【BP战力雷达】/.test(rawText)) return null;

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
    priority: 60,
    enabled: true,
    block: BLOCK,
    renderContent: renderContentNode,
    mount,
  });
})();
