(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'story-engine';
  const MODULE_VERSION = '0.1.0-test-integrated';
  const BLOCK = {
    open: '<story_driver>',
    close: '</story_driver>',
  };

  const NPC_BLOCK_PATTERN = /<npc_driver>\s*([\s\S]*?)\s*<\/npc_driver>/gi;
  const COMBAT_BLOCK_PATTERN = /<combat_driver>\s*([\s\S]*?)\s*<\/combat_driver>/i;
  const EVENT_LINE_PATTERN = /^\s*-\s*(事件[^:：\n]+)[:：]\s*(.*?)(?:\s*(\(\d{1,3}%\)))?\s*$/gm;

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function extractSection(source, startLabel, endLabel) {
    const text = String(source || '');
    const start = text.indexOf(startLabel);
    if (start < 0) return '';
    const from = start + startLabel.length;
    const end = endLabel ? text.indexOf(endLabel, from) : -1;
    return normalizeText(end >= 0 ? text.slice(from, end) : text.slice(from));
  }

  function extractInline(source, label, nextLabels = []) {
    const text = String(source || '');
    const start = text.indexOf(label);
    if (start < 0) return '';
    const from = start + label.length;
    let end = text.length;
    nextLabels.forEach(nextLabel => {
      const index = text.indexOf(nextLabel, from);
      if (index >= 0 && index < end) end = index;
    });
    return normalizeText(text.slice(from, end));
  }

  function parseGlobalSection(content) {
    const globalSection =
      extractSection(content, '━━ 1. 全域锚定 ━━', '━━ 2. 行为逻辑锁 ━━') ||
      extractSection(content, '━━ 1、全域锚定 ━━', '━━ 2、行为逻辑锁 ━━') ||
      extractSection(content, '━━ 1．全域锚定 ━━', '━━ 2．行为逻辑锁 ━━');

    const timeAndWeather = extractInline(globalSection, '[时空]:', ['[异常拦截]:']);
    const separatorIndex = timeAndWeather.indexOf('|');
    const time =
      separatorIndex >= 0 ? normalizeText(timeAndWeather.slice(0, separatorIndex)) : normalizeText(timeAndWeather);
    const weather = separatorIndex >= 0 ? normalizeText(timeAndWeather.slice(separatorIndex + 1)) : '';

    const timelineAndEvents = extractInline(globalSection, '[变数注入]:', []);
    const fusionSplit = timelineAndEvents.split(/(?:^|\n)①/);
    const eventLogText = fusionSplit.length > 1 ? `①${fusionSplit.slice(1).join('①')}` : '';
    const timeline = fusionSplit.length > 0 ? normalizeText(fusionSplit[0]) : '';

    return {
      time,
      weather,
      abnormal: extractInline(globalSection, '[异常拦截]:', ['[NPC情报盲区]:']),
      blind: extractInline(globalSection, '[NPC情报盲区]:', ['[死亡角色]:']),
      death: extractInline(globalSection, '[死亡角色]:', ['[蝴蝶效应]:']),
      butterfly: extractInline(globalSection, '[蝴蝶效应]:', ['[故事主线]:']),
      storyline: extractInline(globalSection, '[故事主线]:', ['[原作走向]:']),
      canon: extractInline(globalSection, '[原作走向]:', ['[变数注入]:']),
      timeline,
      eventLogText,
    };
  }

  function parseEvents(eventLogText) {
    const events = [];
    const source = String(eventLogText || '');
    let match;
    while ((match = EVENT_LINE_PATTERN.exec(source))) {
      events.push({
        name: normalizeText(match[1]),
        text: normalizeText(match[2]),
        rate: normalizeText(match[3] || ''),
      });
    }
    EVENT_LINE_PATTERN.lastIndex = 0;
    return events;
  }

  function parseNpcBlocks(content) {
    const matches = [...String(content || '').matchAll(NPC_BLOCK_PATTERN)];
    return matches.map(match => {
      const block = match[1] || '';
      const statusSection =
        extractSection(block, '━━ 1. 状态读取 ━━', '━━ 2. 双轨判定 ━━') ||
        extractSection(block, '━━ 1、状态读取 ━━', '━━ 2、双轨判定 ━━') ||
        extractSection(block, '━━ 1．状态读取 ━━', '━━ 2．双轨判定 ━━');
      const resultSection = extractInline(block, '双轨结果:', []);
      return {
        name: extractInline(statusSection, '角色名称:', ['当前身份:']),
        identity: extractInline(statusSection, '当前身份:', ['数据锚定:']),
        relation: extractInline(statusSection, '- 关系:', ['- 好感:']),
        favor: extractInline(statusSection, '- 好感:', ['- 信任:']),
        trust: extractInline(statusSection, '- 信任:', ['行为底线:']),
        bottomLine: extractInline(statusSection, '行为底线:', ['核心诉求:']),
        demand: extractInline(statusSection, '核心诉求:', []),
        branch: extractInline(resultSection, '- 分支=', ['- 好感=']),
        responseFavor: extractInline(resultSection, '- 好感=', ['- 信任=']),
        responseTrust: extractInline(resultSection, '- 信任=', ['- 结果=']),
        result: extractInline(resultSection, '- 结果=', []),
      };
    });
  }

  function parseStoryDriver(content) {
    const parsedGlobal = parseGlobalSection(content);
    const action =
      extractSection(content, '━━ 2. 行为逻辑锁 ━━', '<combat_driver>') ||
      extractSection(content, '━━ 2、行为逻辑锁 ━━', '<combat_driver>') ||
      extractSection(content, '━━ 2．行为逻辑锁 ━━', '<combat_driver>');
    const combat = normalizeText((String(content || '').match(COMBAT_BLOCK_PATTERN) || [])[1] || '');
    const final =
      extractInline(content, '━━ 3. 最终修正 ━━', ['</story_driver>']) ||
      extractInline(content, '━━ 3、最终修正 ━━', ['</story_driver>']) ||
      extractInline(content, '━━ 3．最终修正 ━━', ['</story_driver>']);

    return {
      ...parsedGlobal,
      events: parseEvents(parsedGlobal.eventLogText),
      fusion: parsedGlobal.timeline,
      action,
      npcs: parseNpcBlocks(content),
      combat,
      final,
    };
  }

  function renderEventCards(events) {
    if (!events.length) return '<div class="story-ui-se-muted-empty">暂无事件记录</div>';
    return events
      .map(
        event => `
          <div class="story-ui-se-event-card">
            <div class="story-ui-se-event-top"><span class="story-ui-se-event-name">${escapeHtml(event.name)}</span><span class="story-ui-se-event-rate">${escapeHtml(event.rate)}</span></div>
            <div class="story-ui-se-event-text">${escapeHtml(event.text)}</div>
          </div>
        `,
      )
      .join('');
  }

  function renderNpcCards(npcs, theme) {
    if (!npcs.length) return '<div class="story-ui-se-muted-empty">暂无 NPC 驱动数据</div>';

    return npcs
      .map(npc => {
        const relationChip = theme === 'night' ? `REL ${npc.relation}` : `关系 ${npc.relation}`;
        const favorChip = theme === 'night' ? `FAV ${npc.responseFavor || npc.favor}` : `好感 ${npc.favor}`;
        const trustChip = theme === 'night' ? `TRUST ${npc.responseTrust || npc.trust}` : `信任 ${npc.trust}`;
        const branchLabel = theme === 'night' ? '分支' : '分支';
        const responseLabel = theme === 'night' ? '回应' : '回应';
        const trustLabel = theme === 'night' ? '托付' : '托付';
        const resultLabel = theme === 'night' ? '结果' : '结果';

        return `
          <div class="story-ui-se-npc-card">
            <div class="story-ui-se-npc-name">✦ ${escapeHtml(npc.name)}</div>
            <div class="story-ui-se-npc-sub">${escapeHtml(npc.identity)}</div>
            <div class="story-ui-se-chip-row">
              <span class="story-ui-se-chip">${escapeHtml(relationChip)}</span>
              <span class="story-ui-se-chip">${escapeHtml(favorChip)}</span>
              <span class="story-ui-se-chip">${escapeHtml(trustChip)}</span>
            </div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">底线</span> ${escapeHtml(npc.bottomLine)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">诉求</span> ${escapeHtml(npc.demand)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">${escapeHtml(branchLabel)}</span> ${escapeHtml(npc.branch)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">${escapeHtml(responseLabel)}</span> ${escapeHtml(npc.responseFavor)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">${escapeHtml(trustLabel)}</span> ${escapeHtml(npc.responseTrust)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">${escapeHtml(resultLabel)}</span> ${escapeHtml(npc.result)}</div>
          </div>
        `;
      })
      .join('');
  }

  function renderShell(content) {
    const data = parseStoryDriver(content);
    const theme = ui.theme?.getTheme?.() || 'day';
    const isNight = theme === 'night';

    return `
      <section class="story-ui-root story-ui-se story-ui-${escapeHtml(theme)}" data-story-ui-module="${MODULE_ID}">
        <div class="story-ui-se-widget ${isNight ? 'story-ui-se-hsr-ui' : 'story-ui-se-compact-ui'}">
          <details>
            <summary class="story-ui-se-orb" aria-label="展开故事引擎面板">
              <span class="story-ui-se-orb-mark">✦</span>
              <span class="story-ui-se-orb-title">${isNight ? 'STORY TERMINAL' : 'STORY ENGINE'}</span>
            </summary>
            <section class="story-ui-se-panel">
              <header class="story-ui-se-panel-head">
                <div class="story-ui-se-head-icon">✦</div>
                <div>
                  <h3 class="story-ui-se-title">${isNight ? '故事引擎调度终端' : '故事引擎调度记录'}</h3>
                  <div class="story-ui-se-subtitle">${isNight ? 'ASTRAL LOG · INTEGRATED MODULE' : '紧凑信息仪表盘 · 外置整合模块'}</div>
                </div>
                <div class="story-ui-se-corner">✦ ✧</div>
              </header>

              <div class="story-ui-se-meta-strip">
                <div class="story-ui-se-meta-item"><div class="story-ui-se-meta-label">${isNight ? 'TIME' : '时空'}</div><div class="story-ui-se-meta-value">${escapeHtml(data.time)}</div></div>
                <div class="story-ui-se-meta-item"><div class="story-ui-se-meta-label">${isNight ? 'WEATHER' : '天气'}</div><div class="story-ui-se-meta-value">${escapeHtml(data.weather)}</div></div>
                <div class="story-ui-se-meta-item"><div class="story-ui-se-meta-label">${isNight ? 'TIMELINE' : '故事主线'}</div><div class="story-ui-se-meta-value">${escapeHtml(data.storyline)}</div></div>
              </div>

              <div class="story-ui-se-grid">
                <article class="story-ui-se-card story-ui-se-card-summary">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'GLOBAL PARAMETERS' : '全域摘要'}</span></div>
                  <div class="story-ui-se-summary-grid">
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">${isNight ? '异常' : '异常'}</div><div class="story-ui-se-summary-value">${escapeHtml(data.abnormal)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">${isNight ? '盲区' : '盲区'}</div><div class="story-ui-se-summary-value">${escapeHtml(data.blind)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">${isNight ? '死亡' : '死亡'}</div><div class="story-ui-se-summary-value">${escapeHtml(data.death)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">${isNight ? '蝴蝶' : '蝴蝶'}</div><div class="story-ui-se-summary-value">${escapeHtml(data.butterfly)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">${isNight ? '原作' : '原作'}</div><div class="story-ui-se-summary-value">${escapeHtml(data.canon)}</div></div>
                  </div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-events">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'EVENT LOG' : '事件表'}</span></div>
                  <div class="story-ui-se-events-grid">${renderEventCards(data.events)}</div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-fusion">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'EVENT FUSION' : '事件融合分析'}</span></div>
                  <div class="story-ui-se-card-body">${escapeHtml(data.fusion)}</div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-action">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'ACTION LOCK' : '行为逻辑锁'}</span></div>
                  <div class="story-ui-se-card-body">${escapeHtml(data.action)}</div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-npc">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'NPC DRIVER' : 'NPC 驱动'}</span></div>
                  <div class="story-ui-se-npc-grid">${renderNpcCards(data.npcs, theme)}</div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-combat">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'COMBAT DRIVER' : '战斗驱动'}</span></div>
                  <div class="story-ui-se-card-body story-ui-se-combat-body">${escapeHtml(data.combat)}</div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-final">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'FINAL VECTOR' : '最终修正'}</span></div>
                  <div class="story-ui-se-card-body story-ui-se-final-body">${escapeHtml(data.final)}</div>
                </article>
              </div>

              <footer class="story-ui-se-panel-foot">✧ STORY DRIVER VISUALIZED ✧</footer>
            </section>
          </details>
        </div>
      </section>
    `;
  }

  function renderContentNode(content) {
    const wrapper = dom.createElement('div', {
      className: 'story-ui-se-wrapper',
      html: renderShell(content),
    });
    return wrapper.firstElementChild || null;
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 60,
    block: BLOCK,
    renderContent: renderContentNode,
  });
})();
