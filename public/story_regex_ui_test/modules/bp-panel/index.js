(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const BP_PANEL_PATTERN =
    /<bp_panel>\s*【BP战力雷达】\s*【扫描状态】\s*([\s\S]*?)\s*【已扫描目标】\s*([\s\S]*?)\s*<\/bp_panel>/i;
  const TARGET_PATTERN = new RegExp(
    String.raw`^\s*-\s*名称:\s*([^|\n]+?)\s*\|\s*总BP:\s*([+-]?\d+(?:\.\d+)?)\s*\|\s*战力等级:\s*([^|\n]+?)\s*\|\s*咒术评级:\s*([^\n]+?)\s*\n\s*HP:\s*([^|\n]+?)\s*/\s*([^|\n]+?)\s*\|\s*防御:\s*([^|\n]+?)\s*\|\s*伤害补正:\s*([^\n]+?)\s*\n\s*咒力:\s*当前([^/\n]+?)\s*/\s*有效([^/\n]+?)\s*/\s*原始([^|\n]+?)\s*\|\s*精度([^|\n]+?)\s*\|\s*回复([^|\n]+?)\s*\|\s*消耗倍率([^\n]+?)\s*\n\s*肉体:\s*总肉体值_BPA\s*([^|\n]+?)\s*\|\s*基础([^|\n]+?)\s*\|\s*武艺([^|\n]+?)\s*\|\s*阶段([^|\n]+?)\s*\|\s*输出([^|\n]+?)\s*\|\s*防御系数([^\n]+?)\s*\n\s*术式:\s*术式强度_BPB\s*([^|\n]+?)\s*\|\s*名称([^|\n]+?)\s*\|\s*潜力([^(|\n]+?)\(([^)\n]*?)\)\s*\|\s*精通([^(|\n]+?)\(([^)\n]*?)\)\s*\|\s*基础强度([^|\n]+?)\s*\|\s*当前强度([^\n]+?)\s*\n\s*攻击:\s*咒术([^|\n]+?)\s*\|\s*物理([^|\n]+?)\s*\|\s*咒具([^\n]+?)\s*\n\s*反转:\s*掌握([^|\n]+?)\s*\|\s*等级([^|\n]+?)\s*\|\s*回复([^|\n]+?)\s*\|\s*治疗消耗([^|\n]+?)\s*\|\s*熔断修复消耗([^\n]+?)\s*\n\s*熔断:\s*状态([^|\n]+?)\s*\|\s*大脑重置([^|\n]+?)\s*\|\s*回复惩罚([^|\n]+?)\s*\|\s*强度惩罚([^\n]+?)\s*\n\s*特性备注:\s*\n((?:[ \t]*(?:-\s*)?【[^】\n]+】[:：].+(?:\n|$))*)`,
    'gm',
  );
  const BP_PANEL_ELEMENT_SELECTOR = 'bp_panel, BP_PANEL';

  function findBpTextNodes(root) {
    const matches = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.nodeValue || '';
        if (!text.includes('<bp_panel>') || !BP_PANEL_PATTERN.test(text)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest?.('.story-ui-root')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      matches.push({
        node,
        rawText: node.nodeValue || '',
      });
      node = walker.nextNode();
    }

    return matches;
  }

  function findBpElementNodes(root) {
    const matches = [];
    root.querySelectorAll?.(BP_PANEL_ELEMENT_SELECTOR).forEach(element => {
      if (dom?.isProcessed(element) || element.closest?.('.story-ui-root')) return;
      matches.push({
        node: element,
        rawText: `<bp_panel>${element.innerHTML}</bp_panel>`,
        kind: 'element',
      });
    });
    return matches;
  }

  function findBpNodes(root) {
    return [...findBpTextNodes(root), ...findBpElementNodes(root)];
  }

  function safe(value) {
    return dom.escapeHtml(String(value ?? '').trim());
  }

  function percent(value, max) {
    const current = Number(value);
    const limit = Number(max);
    if (!Number.isFinite(current) || !Number.isFinite(limit) || limit <= 0) return 0;
    return Math.max(0, Math.min(100, (current / limit) * 100));
  }

  function renderTraitLines(rawTraits) {
    const lines = String(rawTraits || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return '<div class="story-ui-bp-empty">暂无特性备注</div>';
    }

    return lines
      .map(line => {
        const match = line.match(/^(?:-\s*)?(【[^】\n]+】)[:：]\s*(.*?)\s*$/);
        if (!match) return `<div class="story-ui-bp-trait">${safe(line)}</div>`;
        return `<div class="story-ui-bp-trait"><span data-trait="${safe(match[1])}">${safe(match[1])}</span>：${safe(match[2])}</div>`;
      })
      .join('');
  }

  function renderTargetCard(groups) {
    const [
      ,
      name,
      totalBp,
      battleGrade,
      curseGrade,
      hpCurrent,
      hpMax,
      defense,
      damageRate,
      ceCurrent,
      ceEffective,
      ceRaw,
      ceAccuracy,
      ceRegen,
      ceCostRate,
      bpa,
      baseBody,
      martial,
      martialStage,
      martialOutput,
      martialDefense,
      bpb,
      innateName,
      potentialValue,
      potentialGrade,
      masteryValue,
      masteryStage,
      basePower,
      currentPower,
      curseAttack,
      physicalAttack,
      cursedTool,
      reverseKnown,
      reverseGrade,
      reverseRecover,
      reverseCost,
      repairCost,
      burnoutState,
      brainReset,
      recoverPenalty,
      powerPenalty,
      traits,
    ] = groups;

    return `
      <article class="story-ui-bp-target" data-rarity="${safe(battleGrade)}">
        <div class="story-ui-bp-target-top">
          <strong class="story-ui-bp-target-name">${safe(name)}</strong>
          <span class="story-ui-bp-rarity">${safe(battleGrade)}</span>
        </div>

        <div class="story-ui-bp-meters">
          <div class="story-ui-bp-meter">
            <div><span>总BP</span><strong>${safe(totalBp)}</strong></div>
            <i style="width:${percent(totalBp, 3001)}%"></i>
          </div>
          <div class="story-ui-bp-meter">
            <div><span>HP</span><strong>${safe(hpCurrent)} / ${safe(hpMax)}</strong></div>
            <i style="width:${percent(hpCurrent, hpMax)}%"></i>
          </div>
          <div class="story-ui-bp-meter">
            <div><span>咒力</span><strong>${safe(ceCurrent)} / ${safe(ceEffective)}</strong></div>
            <i style="width:${percent(ceCurrent, ceEffective)}%"></i>
          </div>
        </div>

        <div class="story-ui-bp-grid">
          <section>
            <h4>防御 / 资源</h4>
            <p><span>防御</span><b>${safe(defense)}</b></p>
            <p><span>伤害补正</span><b>${safe(damageRate)}</b></p>
            <p><span>原始咒力</span><b>${safe(ceRaw)}</b></p>
            <p><span>精度 / 回复 / 消耗</span><b>${safe(ceAccuracy)} / ${safe(ceRegen)} / ${safe(ceCostRate)}</b></p>
          </section>
          <section>
            <h4>肉体与武艺</h4>
            <p><span>总肉体值_BPA</span><b>${safe(bpa)}</b></p>
            <p><span>基础 / 武艺</span><b>${safe(baseBody)} / ${safe(martial)}</b></p>
            <p><span>阶段</span><b>${safe(martialStage)}</b></p>
            <p><span>输出 / 防御系数</span><b>${safe(martialOutput)} / ${safe(martialDefense)}</b></p>
          </section>
          <section>
            <h4>术式强度</h4>
            <p><span>术式强度_BPB</span><b>${safe(bpb)}</b></p>
            <p><span>生得术式</span><b>${safe(innateName)}</b></p>
            <p><span>潜力</span><b>${safe(potentialValue)} · ${safe(potentialGrade)}</b></p>
            <p><span>精通 / 阶段</span><b>${safe(masteryValue)} / ${safe(masteryStage)}</b></p>
            <p><span>基础 / 当前</span><b>${safe(basePower)} / ${safe(currentPower)}</b></p>
          </section>
          <section>
            <h4>攻击 / 反转 / 熔断</h4>
            <p><span>咒术 / 物理 / 咒具</span><b>${safe(curseAttack)} / ${safe(physicalAttack)} / ${safe(cursedTool)}</b></p>
            <p><span>反转</span><b>${safe(reverseKnown)} · ${safe(reverseGrade)}</b></p>
            <p><span>回复 / 治疗消耗 / 修复</span><b>${safe(reverseRecover)} / ${safe(reverseCost)} / ${safe(repairCost)}</b></p>
            <p><span>熔断</span><b>${safe(burnoutState)} · ${safe(brainReset)} · ${safe(recoverPenalty)} / ${safe(powerPenalty)}</b></p>
          </section>
        </div>

        <div class="story-ui-bp-traits">
          <h4>特性备注</h4>
          ${renderTraitLines(traits)}
        </div>
      </article>
    `;
  }

  function renderTargets(rawTargets) {
    const cards = [];
    TARGET_PATTERN.lastIndex = 0;

    let match = TARGET_PATTERN.exec(rawTargets);
    while (match) {
      cards.push(renderTargetCard(match));
      match = TARGET_PATTERN.exec(rawTargets);
    }

    if (cards.length > 0) return cards.join('');

    return `<pre class="story-ui-bp-raw">${safe(rawTargets)}</pre>`;
  }

  function matchesRawText(rawText) {
    return Boolean(rawText && BP_PANEL_PATTERN.test(rawText));
  }

  function fromRawText(rawText) {
    if (!matchesRawText(rawText)) return null;
    const wrapper = dom.createElement('span', {
      className: 'story-ui-bp-fragment',
      html: renderPanel(rawText),
    });
    return wrapper.firstElementChild || wrapper;
  }

  function stripRawText(rawText) {
    return String(rawText || '')
      .replace(BP_PANEL_PATTERN, '')
      .trim();
  }

  function renderPanel(rawText) {
    const match = rawText.match(BP_PANEL_PATTERN);
    if (!match) return null;

    const scanText = match[1] || '';
    const targetsText = match[2] || '';

    return `
      <section class="story-ui-root story-ui-bp story-ui-day" data-story-ui-module="bp-panel" data-story-ui-variant="new-vars">
        <details class="story-ui-bp-shell">
          <summary class="story-ui-bp-head">
            <span class="story-ui-bp-mark">✦</span>
            <span class="story-ui-bp-title">BP战力雷达 · 新变量结构</span>
            <button class="story-ui-bp-theme story-ui-theme-toggle" type="button" data-story-ui-theme-toggle>日 / 夜</button>
          </summary>
          <div class="story-ui-bp-body">
            <article class="story-ui-bp-scan">
              <h3>扫描状态</h3>
              <p>${safe(scanText)}</p>
            </article>
            <div class="story-ui-bp-targets">
              ${renderTargets(targetsText)}
            </div>
          </div>
        </details>
      </section>
    `;
  }

  function render(match) {
    const wrapper = dom.createElement('span', {
      className: 'story-ui-bp-fragment',
      html:
        match.kind === 'element'
          ? renderPanel(match.rawText)
          : match.rawText.replace(BP_PANEL_PATTERN, renderPanel(match.rawText)),
    });

    return wrapper;
  }

  ui.registry?.register?.({
    id: 'bp-panel',
    version: '0.1.0-test-new-vars',
    priority: 60,
    detect: findBpNodes,
    render,
    matchesRawText,
    fromRawText,
    stripRawText,
  });

  ui.bpPanel = { matchesRawText, fromRawText, stripRawText };
})();
