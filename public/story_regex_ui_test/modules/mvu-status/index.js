(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const PLACEHOLDER_PATTERN = /<StatusPlaceHolderImpl\s*\/>/i;
  const PLACEHOLDER_ELEMENT_SELECTOR = 'statusplaceholderimpl, StatusPlaceHolderImpl, status-placeholder-impl';

  function findPlaceholderNodes(root) {
    const matches = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!PLACEHOLDER_PATTERN.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest?.('.story-ui-root')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      matches.push({
        node,
        rawText: node.nodeValue || '',
        kind: 'text',
      });
      node = walker.nextNode();
    }

    root.querySelectorAll?.(PLACEHOLDER_ELEMENT_SELECTOR).forEach(element => {
      if (dom?.isProcessed(element) || element.closest?.('.story-ui-root')) return;
      matches.push({
        node: element,
        rawText: '<StatusPlaceHolderImpl/>',
        kind: 'element',
      });
    });

    return matches;
  }

  function getVar(path, fallback = '') {
    try {
      const variables = window.getAllVariables?.() || {};
      const parts = path.split('.');
      let current = variables;
      for (const part of parts) {
        current = current?.[part];
        if (current === undefined || current === null) return fallback;
      }
      return current;
    } catch {
      return fallback;
    }
  }

  function asNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function renderMeter(label, value, max, extra = '') {
    const safeValue = asNumber(value, 0);
    const safeMax = Math.max(1, asNumber(max, 1));
    const width = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
    return `
      <div class="story-ui-mvu-meter">
        <div class="story-ui-mvu-meter-head"><span>${dom.escapeHtml(label)}</span><strong>${dom.escapeHtml(safeValue)} / ${dom.escapeHtml(safeMax)}${extra ? ` · ${dom.escapeHtml(extra)}` : ''}</strong></div>
        <div class="story-ui-mvu-meter-track"><span class="story-ui-mvu-meter-fill" style="width:${width}%"></span></div>
      </div>
    `;
  }

  function renderStatusShell() {
    const user = getVar('stat_data.user', {});
    const sys = getVar('stat_data.系统', {});
    const battle = user.战斗面板 || {};
    const energy = user.咒力 && user.咒力 !== '待初始化' ? user.咒力 : user.能量系统 || {};
    const body = user.基础肉体 || {};

    const level = user.等级 || 1;
    const rank = user.战力评级 || battle.战力等级 || '未知';
    const bp = battle.总BP || 0;
    const grade = battle.战力等级 || rank;
    const exp = user.EXP || 0;

    const hpCurrent = battle.当前血量 ?? 0;
    const hpMax = battle.最大生命值 ?? 1;
    const spCurrent = energy.当前值 ?? energy.总量 ?? 0;
    const spMax = energy.有效总量 || energy.总量 || 1;

    const time = sys.时间 || {};
    const loc = sys.地点 || {};

    return `
      <section class="story-ui-root story-ui-mvu story-ui-day" data-story-ui-module="mvu-status" data-story-ui-variant="new-vars">
        <details open class="story-ui-mvu-shell">
          <summary class="story-ui-mvu-head">
            <span class="story-ui-mvu-mark">✦</span>
            <span class="story-ui-mvu-title">新变量状态栏 · MVU / BP 热切换</span>
          </summary>

          <div class="story-ui-mvu-body">
            <div class="story-ui-mvu-world">
              <article><span>时间</span><strong>${dom.escapeHtml(`${time.年 || 2018}年${time.月日 || ''} ${time.时分 || ''} (${time.星期 || ''})`)}</strong></article>
              <article><span>地点</span><strong>${dom.escapeHtml(`${loc.国家 || ''} ${loc.地域 || ''} ${loc.场所 || ''} ${loc.具体位置 || ''}`.trim() || '未知位置')}</strong></article>
            </div>

            <div class="story-ui-mvu-profile">
              <article class="story-ui-mvu-rank">
                <span class="story-ui-mvu-label">等级 / 战力评级</span>
                <strong class="story-ui-mvu-big">${dom.escapeHtml(level)} · ${dom.escapeHtml(rank)}</strong>
                <div class="story-ui-mvu-tags">
                  <span>总BP ${dom.escapeHtml(bp)}</span>
                  <span>${dom.escapeHtml(grade)}</span>
                  <span>KP ${dom.escapeHtml(user.KP || 0)}</span>
                </div>
                ${renderMeter('EXP', exp, 100)}
                ${renderMeter('HP', hpCurrent, hpMax)}
                ${renderMeter('咒力', spCurrent, spMax, `精度${energy.咒力操纵精度 || 1}`)}
              </article>

              <article class="story-ui-mvu-combat">
                <div><span>防御</span><strong>${dom.escapeHtml(battle.防御 || 0)}</strong></div>
                <div><span>肉体 BPA</span><strong>${dom.escapeHtml(battle.总肉体值_BPA || 0)}</strong></div>
                <div><span>术式 BPB</span><strong>${dom.escapeHtml(battle.术式强度_BPB || 0)}</strong></div>
                <div><span>咒术攻击</span><strong>${dom.escapeHtml(battle.咒术攻击 || 0)}</strong></div>
                <div><span>物理攻击</span><strong>${dom.escapeHtml(battle.物理攻击 || 0)}</strong></div>
                <div><span>肉体 / 武艺</span><strong>${dom.escapeHtml(`${body.基础肉体值 || 0} / ${body.武艺值 || 0} · ${body.武艺阶段 || '未入门'}`)}</strong></div>
              </article>
            </div>
          </div>
        </details>
      </section>
    `;
  }

  function matchesRawText(rawText) {
    return PLACEHOLDER_PATTERN.test(String(rawText || ''));
  }

  function fromRawText(rawText) {
    if (!matchesRawText(rawText)) return null;
    const wrapper = dom.createElement('span', {
      className: 'story-ui-mvu-fragment',
      html: renderStatusShell(),
    });
    return wrapper.firstElementChild || wrapper;
  }

  function render(match) {
    const wrapper = dom.createElement('span', {
      className: 'story-ui-mvu-fragment',
      html:
        match.kind === 'element'
          ? renderStatusShell()
          : match.rawText.replace(PLACEHOLDER_PATTERN, renderStatusShell()),
    });

    return wrapper;
  }

  function stripRawText(rawText) {
    return String(rawText || '')
      .replace(PLACEHOLDER_PATTERN, '')
      .trim();
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);

    if (window.Mvu?.events?.VARIABLE_UPDATE_ENDED && window.eventOn) {
      window.eventOn(window.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
        const panel = node.querySelector?.('.story-ui-mvu');
        if (!panel) return;
        const fresh = document.createElement('span');
        fresh.innerHTML = renderStatusShell();
        const nextPanel = fresh.firstElementChild;
        if (!nextPanel) return;
        panel.replaceWith(nextPanel);
        ui.theme?.applyThemeToRoot?.(nextPanel);
      });
    }
  }

  ui.registry?.register?.({
    id: 'mvu-status',
    version: '0.1.1-test-new-vars',
    priority: 80,
    detect: findPlaceholderNodes,
    render,
    mount,
    matchesRawText,
    fromRawText,
    stripRawText,
  });

  ui.mvuStatus = { matchesRawText, fromRawText, stripRawText };
})();
