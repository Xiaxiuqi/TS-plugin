(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'bp-panel-newvars';
  const MODULE_VERSION = '0.2.1-flexible-newvars';
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

  function parseOuter(rawText) {
    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    const match = source.match(OUTER_PATTERN);
    if (match) {
      return {
        scanText: normalizeText(match[1]),
        targetsRaw: normalizeText(match[2]),
      };
    }

    // 兜底：只要块内有 BP 标题，就尽量切出扫描状态与目标区，避免整段原文残留。
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
      else addFieldByKey(target, key, value);
    });
  }

  function addField(target, group, label, value, options = {}) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return;
    target.groups[group] = target.groups[group] || [];
    target.groups[group].push({
      label,
      value: normalizedValue,
      rarity: options.rarity || '',
      meter: options.meter || null,
    });
  }

  function addFieldByKey(target, key, value) {
    const normalizedKey = normalizeText(key);
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return;

    if (['总BP', 'BP总值', 'BP总值'].includes(normalizedKey)) {
      target.totalBp = normalizedValue;
      addField(target, 'core', '总BP', normalizedValue, {
        meter: { type: 'bp', value: parseNumber(normalizedValue), max: 3001 },
      });
      return;
    }
    if (normalizedKey === '战力等级' || normalizedKey === '层级') {
      target.battleTier = normalizedValue;
      addField(target, 'core', normalizedKey, normalizedValue, { rarity: normalizedValue });
      return;
    }
    if (normalizedKey === '咒术评级') {
      target.curseTier = normalizedValue;
      addField(target, 'core', '咒术评级', normalizedValue);
      return;
    }

    addField(target, 'core', normalizedKey, normalizedValue);
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
        addField(target, 'resources', 'HP', `${target.hpCurrent} / ${target.hpMax}`, {
          meter: { type: 'hp', value: parseNumber(target.hpCurrent), max: parseNumber(target.hpMax) },
        });
      }
      body
        .split('|')
        .slice(1)
        .map(part => part.match(/^\s*([^:：]+)[:：]\s*([\s\S]*?)\s*$/))
        .filter(Boolean)
        .forEach(match => addField(target, 'resources', normalizeText(match[1]), normalizeText(match[2])));
      return true;
    }

    if (groupName === '咒力') {
      const ceMatch = body.match(/当前\s*([^/|]+?)\s*\/\s*有效\s*([^/|]+?)\s*\/\s*原始\s*([^|\n]+)/);
      if (ceMatch) {
        target.ceCurrent = normalizeText(ceMatch[1]);
        target.ceEffective = normalizeText(ceMatch[2]);
        addField(target, 'resources', '咒力', `${target.ceCurrent} / ${target.ceEffective}`, {
          meter: { type: 'ce', value: parseNumber(target.ceCurrent), max: parseNumber(target.ceEffective) },
        });
        addField(target, 'resources', '原始咒力', normalizeText(ceMatch[3]));
      }
      body
        .split('|')
        .slice(1)
        .forEach(part => {
          const item = normalizeText(part);
          const itemMatch = item.match(/^(精度|回复|消耗倍率)\s*([\s\S]*?)$/);
          if (itemMatch)
            addField(target, 'resources', itemMatch[1] === '回复' ? '每轮回复' : itemMatch[1], itemMatch[2]);
        });
      return true;
    }

    if (groupName === '肉体') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(总肉体值_BPA|基础|武艺|阶段|输出|防御系数)\s*([\s\S]*?)$/);
        if (itemMatch)
          addField(
            target,
            'body',
            itemMatch[1],
            itemMatch[2],
            itemMatch[1] === '阶段' ? { rarity: normalizeText(itemMatch[2]) } : {},
          );
      });
      return true;
    }

    if (groupName === '术式') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(术式强度_BPB|名称|潜力|精通|基础强度|当前强度)\s*([\s\S]*?)$/);
        if (!itemMatch) return;
        const label = itemMatch[1] === '名称' ? '生得术式' : itemMatch[1];
        const value = normalizeText(itemMatch[2]);
        const rarityMatch = value.match(/\(([^)]+)\)/);
        addField(target, 'technique', label, value, rarityMatch ? { rarity: normalizeText(rarityMatch[1]) } : {});
      });
      return true;
    }

    if (groupName === '攻击') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(咒术|物理|咒具)\s*([\s\S]*?)$/);
        if (itemMatch) addField(target, 'attack', `${itemMatch[1]}攻击`.replace('咒具攻击', '咒具值'), itemMatch[2]);
      });
      return true;
    }

    if (groupName === '反转') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(掌握|等级|回复|治疗消耗|熔断修复消耗)\s*([\s\S]*?)$/);
        if (itemMatch) addField(target, 'support', `反转${itemMatch[1]}`, itemMatch[2]);
      });
      return true;
    }

    if (groupName === '熔断') {
      body.split('|').forEach(part => {
        const item = normalizeText(part);
        const itemMatch = item.match(/^(状态|大脑重置|回复惩罚|强度惩罚)\s*([\s\S]*?)$/);
        if (itemMatch) addField(target, 'support', `熔断${itemMatch[1]}`, itemMatch[2]);
      });
      return true;
    }

    // 旧版/简化版字段，例如 “操作: 0.8 (说明)”
    addField(target, 'legacy', groupName, body);
    return true;
  }

  function parseTargetBlock(block) {
    const target = {
      name: '',
      totalBp: '',
      battleTier: '',
      curseTier: '',
      hpCurrent: '',
      hpMax: '',
      ceCurrent: '',
      ceEffective: '',
      groups: {},
      traits: [],
      rawBlock: normalizeText(block),
    };
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

  function renderGameLine(field) {
    const value = field.rarity
      ? `<span class="bp-rarity" data-rarity="${escapeHtml(field.rarity)}">${escapeHtml(field.value)}</span>`
      : escapeHtml(field.value);
    return `<div class="bp-game-line"><span>${escapeHtml(field.label)}</span><b>${value}</b></div>`;
  }

  function renderPanel(title, fields, className = '') {
    if (!fields || fields.length === 0) return '';
    return `<div class="bp-game-panel ${className}"><div class="bp-game-title">${escapeHtml(title)}</div><div class="bp-game-lines">${fields.map(renderGameLine).join('')}</div></div>`;
  }

  function renderMeter(field) {
    if (!field?.meter) return '';
    const className =
      field.meter.type === 'hp' ? 'bp-fill-hp' : field.meter.type === 'ce' ? 'bp-fill-ce' : 'bp-fill-bp';
    const percent = clampPercent(field.meter.value, field.meter.max);
    return `<div class="bp-meter-row"><div class="bp-meter-head"><span>${escapeHtml(field.label)}</span><span class="bp-meter-value">${escapeHtml(field.value)}</span></div><div class="bp-meter-track"><span class="bp-meter-fill ${className}" style="--bp-meter:${percent};"></span></div></div>`;
  }

  function renderTargetCard(target, index = 0) {
    const rarity = target.battleTier || target.groups.body?.find(item => item.rarity)?.rarity || '';
    const coreFields = target.groups.core || [];
    const meterFields = [
      ...coreFields.filter(item => item.meter),
      ...(target.groups.resources || []).filter(item => item.meter),
    ];
    const resourceFields = (target.groups.resources || []).filter(item => !item.meter);
    const traitHtml = renderTraitList(target.traits);

    return `
      <div class="bp-target-card ${index === 0 ? 'is-active' : ''}" data-rarity="${escapeHtml(rarity)}" data-bp-target-index="${index}">
        <div class="bp-target-top">
          <span class="bp-target-name" data-rarity="${escapeHtml(rarity)}">✦ ${escapeHtml(target.name)}</span>
          <span class="bp-target-count">#${index + 1}</span>
          ${rarity ? `<span class="bp-tier-wrap"><span class="bp-tier"><span class="bp-rarity" data-rarity="${escapeHtml(rarity)}">${escapeHtml(rarity)}</span></span></span>` : ''}
        </div>

        ${meterFields.length ? `<div class="bp-game-face">${meterFields.map(renderMeter).join('')}</div>` : ''}

        <div class="bp-game-grid">
          ${renderPanel(
            '核心指标',
            coreFields.filter(item => !item.meter),
          )}
          ${renderPanel('资源与防御', resourceFields)}
          ${renderPanel('攻击输出', target.groups.attack, 'attack')}
          ${renderPanel('肉体与武艺', target.groups.body)}
          ${renderPanel('术式强度', target.groups.technique, 'tech')}
          ${renderPanel('反转术式 / 熔断', target.groups.support, 'support')}
          ${renderPanel('简化战力', target.groups.legacy)}
        </div>

        ${traitHtml ? `<div class="bp-trait-title">特性备注</div><div class="bp-trait-list">${traitHtml}</div>` : ''}
      </div>
    `;
  }

  function renderTargetTabs(targets) {
    if (!targets.length) return '';
    return `<div class="bp-target-tabs" role="tablist" aria-label="切换已扫描目标">${targets
      .map(
        (target, index) =>
          `<button class="bp-target-tab ${index === 0 ? 'is-active' : ''}" type="button" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" data-bp-target-tab="${index}">${escapeHtml(target.name || `目标${index + 1}`)}</button>`,
      )
      .join('')}</div>`;
  }

  function renderTargetGrid(data, targets) {
    if (targets.length > 0) return targets.map((target, index) => renderTargetCard(target, index)).join('');
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

              <article class="bp-card bp-card-targets">
                <div class="bp-card-head bp-card-head-with-tabs">
                  <span class="bp-card-dot"></span><span class="bp-card-title">已扫描目标</span>
                  ${renderTargetTabs(targets)}
                </div>
                <div class="bp-target-grid ${targets.length ? 'is-tabbed' : ''}">${renderTargetGrid(data, targets)}</div>
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

  function bindTargetTabs(node) {
    const root =
      node?.querySelector?.('.story-ui-bp-newvars') ||
      node?.querySelector?.('.story-ui-root.story-ui-bp-newvars') ||
      node;
    if (!root || root.dataset.bpTargetTabsBound === 'true') return;
    root.dataset.bpTargetTabsBound = 'true';
    root.addEventListener('click', event => {
      const tab = event.target?.closest?.('[data-bp-target-tab]');
      if (!tab || !root.contains(tab)) return;
      const index = tab.getAttribute('data-bp-target-tab');
      root.querySelectorAll?.('[data-bp-target-tab]').forEach(button => {
        const active = button.getAttribute('data-bp-target-tab') === index;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      root.querySelectorAll?.('[data-bp-target-index]').forEach(card => {
        card.classList.toggle('is-active', card.getAttribute('data-bp-target-index') === index);
      });
    });
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
    bindTargetTabs(root);
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
