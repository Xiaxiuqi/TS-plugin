(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'story-engine';
  const MODULE_VERSION = '0.3.0-test-template-aligned';
  const BLOCK = {
    open: '<story_driver>',
    close: '</story_driver>',
  };

  const STORY_DRIVER_INNER_PATTERN =
    /━━\s*1[.．、]\s*全域锚定\s*━━\s*\[时空\]:\s*(.*?)\s*\|\s*(.*?)\s*\[异常拦截\]:\s*(.*?)\s*\[NPC情报盲区\]:\s*(.*?)\s*\[死亡角色\]:\s*(.*?)\s*\[蝴蝶效应\]:\s*(.*?)\s*\[故事主线\]:\s*(.*?)\s*\[原作走向\]:\s*(.*?)\s*\[变数注入\]:\s*([\s\S]*?)(?=\s*━━\s*2[.．、]\s*行为逻辑锁\s*━━)\s*━━\s*2[.．、]\s*行为逻辑锁\s*━━\s*([\s\S]*?)\s*((?:<npc_driver>\s*[\s\S]*?\s*<\/npc_driver>\s*)*)\s*<combat_driver>\s*([\s\S]*?)\s*<\/combat_driver>\s*━━\s*3[.．、]\s*最终修正\s*━━\s*([\s\S]*)/i;

  const NPC_BLOCK_PATTERN =
    /<npc_driver>\s*━━\s*1[.．、]\s*状态读取\s*━━\s*角色名称:\s*(.*?)\s*当前身份:\s*(.*?)\s*数据锚定:\s*-\s*关系:\s*(.*?)\s*-\s*好感:\s*(.*?)\s*-\s*信任:\s*(.*?)\s*行为底线:\s*(.*?)\s*核心诉求:\s*(.*?)\s*━━\s*2[.．、]\s*双轨判定\s*━━\s*双轨结果:\s*-\s*分支=\s*(.*?)\s*-\s*好感=\s*(.*?)\s*-\s*信任=\s*(.*?)\s*-\s*结果=\s*(.*?)\s*<\/npc_driver>/gs;

  const EVENT_LINE_PATTERN = /^\s*-\s*(事件[^:：\n]+)[:：]\s*(.*?)(?:\s*(\(\d{1,3}%\)))?\s*$/gm;

  function normalizeText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function parseEvents(source) {
    const events = [];
    const text = String(source || '');
    let match;

    while ((match = EVENT_LINE_PATTERN.exec(text))) {
      events.push({
        name: normalizeText(match[1]),
        text: normalizeText(match[2]),
        rate: normalizeText(match[3] || ''),
      });
    }

    EVENT_LINE_PATTERN.lastIndex = 0;
    return events;
  }

  function splitVariableInjection(raw) {
    const text = normalizeText(raw);
    const eventIndex = text.search(/(^|\n)\s*-\s*事件[^:：\n]+[:：]/m);

    if (eventIndex < 0) {
      return {
        fusion: text,
        eventRaw: '',
      };
    }

    return {
      fusion: normalizeText(text.slice(0, eventIndex)),
      eventRaw: normalizeText(text.slice(eventIndex)),
    };
  }

  function parseNpcBlocks(source) {
    const matches = [...String(source || '').matchAll(NPC_BLOCK_PATTERN)];
    return matches.map(match => ({
      name: normalizeText(match[1]),
      identity: normalizeText(match[2]),
      relation: normalizeText(match[3]),
      favor: normalizeText(match[4]),
      trust: normalizeText(match[5]),
      bottomLine: normalizeText(match[6]),
      demand: normalizeText(match[7]),
      branch: normalizeText(match[8]),
      responseFavor: normalizeText(match[9]),
      responseTrust: normalizeText(match[10]),
      result: normalizeText(match[11]),
    }));
  }

  function parseCombatDriver(source) {
    const text = normalizeText(source);
    if (!text || text === '无') {
      return {
        mode: 'empty',
        raw: text || '无',
      };
    }

    const structuredPattern =
      /━━\s*1[.．、]\s*初始化\s*━━\s*([\s\S]*?)\s*━━\s*2[.．、]\s*修正计算(?:\(Calc\))?\s*━━\s*([\s\S]*?)\s*━━\s*3[.．、]\s*对抗判定(?:\(Resolve\))?\s*━━\s*([\s\S]*)/i;
    const match = text.match(structuredPattern);

    if (!match) {
      return {
        mode: 'raw',
        raw: text,
      };
    }

    const initText = normalizeText(match[1]);
    const calcText = normalizeText(match[2]);
    const resolveText = normalizeText(match[3]);

    const extractField = (block, label, nextLabels = []) => {
      const startPattern = new RegExp(`${label}\\s*`, 'i');
      const startMatch = block.match(startPattern);
      if (!startMatch || startMatch.index === undefined) return '';
      const from = startMatch.index + startMatch[0].length;
      let end = block.length;
      nextLabels.forEach(nextLabel => {
        const nextPattern = new RegExp(nextLabel, 'i');
        const slice = block.slice(from);
        const nextMatch = slice.match(nextPattern);
        if (nextMatch && nextMatch.index !== undefined) {
          end = Math.min(end, from + nextMatch.index);
        }
      });
      return normalizeText(block.slice(from, end));
    };

    return {
      mode: 'structured',
      raw: text,
      initText,
      calcText,
      resolveText,
      matchup: extractField(initText, '对战双方:', ['Player_Base_BP:', 'Enemy_Base_BP:', '硬性检查:']),
      playerBaseBp: extractField(initText, 'Player_Base_BP:', ['Enemy_Base_BP:', '硬性检查:']),
      enemyBaseBp: extractField(initText, 'Enemy_Base_BP:', ['硬性检查:']),
      hardCheck: extractField(initText, '硬性检查:'),
    };
  }

  function parseStoryDriver(content) {
    const match = normalizeText(content).match(STORY_DRIVER_INNER_PATTERN);

    if (!match) {
      return {
        matched: false,
        time: '',
        weather: '',
        abnormal: '',
        blind: '',
        death: '',
        butterfly: '',
        storyline: '',
        canon: '',
        fusion: '',
        eventRaw: '',
        events: [],
        action: normalizeText(content),
        npcs: parseNpcBlocks(content),
        combat: '',
        final: '',
      };
    }

    const variableInjectionRaw = normalizeText(match[9]);
    const { fusion, eventRaw } = splitVariableInjection(variableInjectionRaw);

    return {
      matched: true,
      time: normalizeText(match[1]),
      weather: normalizeText(match[2]),
      abnormal: normalizeText(match[3]),
      blind: normalizeText(match[4]),
      death: normalizeText(match[5]),
      butterfly: normalizeText(match[6]),
      storyline: normalizeText(match[7]),
      canon: normalizeText(match[8]),
      fusion,
      eventRaw,
      events: parseEvents(eventRaw),
      action: normalizeText(match[10]),
      npcs: parseNpcBlocks(match[11]),
      combat: normalizeText(match[12]),
      final: normalizeText(match[13]),
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
        const favorChip = theme === 'night' ? `FAV ${npc.favor}` : `好感 ${npc.favor}`;
        const trustChip = theme === 'night' ? `TRUST ${npc.trust}` : `信任 ${npc.trust}`;

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
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">分支</span> ${escapeHtml(npc.branch)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">回应</span> ${escapeHtml(npc.responseFavor)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">托付</span> ${escapeHtml(npc.responseTrust)}</div>
            <div class="story-ui-se-npc-line"><span class="story-ui-se-block-label">结果</span> ${escapeHtml(npc.result)}</div>
          </div>
        `;
      })
      .join('');
  }

  function renderCombatDriver(combat, theme) {
    const parsed = parseCombatDriver(combat);

    if (parsed.mode === 'empty') {
      return '<div class="story-ui-se-combat-empty">无</div>';
    }

    if (parsed.mode === 'raw') {
      return `<div class="story-ui-se-combat-raw">${escapeHtml(parsed.raw)}</div>`;
    }

    const headLabels =
      theme === 'night'
        ? { matchup: 'MATCHUP', player: 'PLAYER BP', enemy: 'ENEMY BP', check: 'CHECK' }
        : { matchup: '对战双方', player: 'Player BP', enemy: 'Enemy BP', check: '硬性检查' };

    return `
      <div class="story-ui-se-combat-layout">
        <section class="story-ui-se-combat-section init">
          <div class="story-ui-se-combat-section-head"><span class="story-ui-se-combat-section-mark">✦</span><span class="story-ui-se-combat-section-title">初始化</span></div>
          <div class="story-ui-se-combat-matchup-card">
            <span class="story-ui-se-combat-matchup-label">${escapeHtml(headLabels.matchup)}</span>
            <span class="story-ui-se-combat-matchup-divider">：</span>
            <span class="story-ui-se-combat-matchup-value">${escapeHtml(parsed.matchup || '无')}</span>
          </div>
          <div class="story-ui-se-combat-meta-grid story-ui-se-combat-bp-grid">
            <div class="story-ui-se-combat-meta-card"><div class="story-ui-se-combat-meta-label">${escapeHtml(headLabels.player)}</div><div class="story-ui-se-combat-meta-value">${escapeHtml(parsed.playerBaseBp || '无')}</div></div>
            <div class="story-ui-se-combat-meta-card"><div class="story-ui-se-combat-meta-label">${escapeHtml(headLabels.enemy)}</div><div class="story-ui-se-combat-meta-value">${escapeHtml(parsed.enemyBaseBp || '无')}</div></div>
          </div>

          <div class="story-ui-se-combat-note"><span class="story-ui-se-combat-note-label">${escapeHtml(headLabels.check)}</span><div class="story-ui-se-combat-note-body">${escapeHtml(parsed.hardCheck || '无')}</div></div>
        </section>

        <section class="story-ui-se-combat-section calc">
          <div class="story-ui-se-combat-section-head"><span class="story-ui-se-combat-section-mark">✦</span><span class="story-ui-se-combat-section-title">修正计算 · Calc</span></div>
          <div class="story-ui-se-combat-rich-text">${escapeHtml(parsed.calcText || '无')}</div>
        </section>

        <section class="story-ui-se-combat-section resolve">
          <div class="story-ui-se-combat-section-head"><span class="story-ui-se-combat-section-mark">✦</span><span class="story-ui-se-combat-section-title">对抗判定 · Resolve</span></div>
          <div class="story-ui-se-combat-rich-text">${escapeHtml(parsed.resolveText || '无')}</div>
        </section>
      </div>
    `;
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
              <span class="story-ui-se-orb-mark">${isNight ? '✧' : '✦'}</span>
              <span class="story-ui-se-orb-title">${isNight ? 'STORY TERMINAL' : 'STORY ENGINE'}</span>
            </summary>

            <section class="story-ui-se-panel">
              <header class="story-ui-se-panel-head">
                <div class="story-ui-se-head-icon" data-story-ui-theme-toggle title="切换日夜主题">${isNight ? '✧' : '✦'}</div>
                <div>
                  <h3 class="story-ui-se-title">${isNight ? '故事引擎调度终端' : '故事引擎调度记录'}</h3>
                  <div class="story-ui-se-subtitle">${isNight ? 'ASTRAL LOG · NO SCRIPT PIPELINE' : '紧凑信息仪表盘'}</div>
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
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">异常</div><div class="story-ui-se-summary-value">${escapeHtml(data.abnormal)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">盲区</div><div class="story-ui-se-summary-value">${escapeHtml(data.blind)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">死亡</div><div class="story-ui-se-summary-value">${escapeHtml(data.death)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">蝴蝶</div><div class="story-ui-se-summary-value">${escapeHtml(data.butterfly)}</div></div>
                    <div class="story-ui-se-summary-item"><div class="story-ui-se-block-label">原作</div><div class="story-ui-se-summary-value">${escapeHtml(data.canon)}</div></div>
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
                  <div class="story-ui-se-card-body story-ui-se-combat-body">${renderCombatDriver(data.combat, theme)}</div>
                </article>

                <article class="story-ui-se-card story-ui-se-card-final">
                  <div class="story-ui-se-card-head"><span class="story-ui-se-card-dot"></span><span class="story-ui-se-card-title">${isNight ? 'FINAL VECTOR' : '最终修正'}</span></div>
                  <div class="story-ui-se-card-body story-ui-se-final-body">${escapeHtml(data.final)}</div>
                </article>
              </div>

              <footer class="story-ui-se-panel-foot">${isNight ? '✧ STORY DRIVER TERMINAL ✧' : '✧ STORY DRIVER VISUALIZED ✧'}</footer>
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
    const root = wrapper.firstElementChild || null;
    if (root) root.dataset.storyUiStoryEngineRaw = content;
    return root;
  }

  function rerender(node) {
    const root = node?.querySelector?.('.story-ui-se') || node?.querySelector?.('.story-ui-root.story-ui-se');
    if (!root) return;
    const content = root.dataset.storyUiStoryEngineRaw ?? '';
    const rerendered = ui.theme?.rerenderWithPreservedDetails?.(root, () => {
      const fresh = document.createElement('div');
      fresh.innerHTML = renderShell(content);
      const nextRoot = fresh.firstElementChild;
      if (nextRoot) nextRoot.dataset.storyUiStoryEngineRaw = content;
      return nextRoot || null;
    });
    if (rerendered) return;

    const fresh = document.createElement('div');
    fresh.innerHTML = renderShell(content);
    const nextRoot = fresh.firstElementChild;
    if (!nextRoot) return;
    nextRoot.dataset.storyUiStoryEngineRaw = content;
    root.replaceWith(nextRoot);
    ui.theme?.applyThemeToRoot?.(nextRoot);
  }

  function rerenderAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('story-engine');
    (hosts || []).forEach(host => {
      rerender(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root = node?.querySelector?.('.story-ui-se') || node?.querySelector?.('.story-ui-root.story-ui-se');
    if (!root) return;
    if (!root.dataset.storyUiStoryEngineRaw) {
      const contentHost = node?.querySelector?.('.story-ui-se-wrapper');
      if (contentHost?.dataset?.storyUiStoryEngineRaw) {
        root.dataset.storyUiStoryEngineRaw = contentHost.dataset.storyUiStoryEngineRaw;
      }
    }
    if (document.documentElement.dataset.storyUiSeThemeBound === 'true') return;
    document.documentElement.dataset.storyUiSeThemeBound = 'true';
    document.addEventListener('story-ui-theme-changed', () => {
      rerenderAll();
    });
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 60,
    block: BLOCK,
    display: {
      startAnchors: ['STORY ENGINE', 'STORY TERMINAL', '故事引擎', '全域锚定', '<story_driver>'],
      endAnchors: ['STORY DRIVER VISUALIZED', 'STORY DRIVER TERMINAL', '最终修正', '</story_driver>'],
    },
    renderContent: renderContentNode,
    mount,
  });
})();
