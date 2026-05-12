(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'mvu-status';
  const MODULE_VERSION = '0.1.0-test-single-tag';
  const SINGLE_TAG = '<StatusPlaceHolderImpl/>';

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

  function renderMeter(label, value, max, extra = '', variant = 'exp') {
    const safeValue = asNumber(value, 0);
    const safeMax = Math.max(1, asNumber(max, 1));
    const width = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
    return `
      <div class="story-ui-mvu-rank-meter ${variant}">
        <div class="story-ui-mvu-rank-meter-head"><span>${dom.escapeHtml(label)}</span><span>${dom.escapeHtml(safeValue)} / ${dom.escapeHtml(safeMax)}${extra ? ` · ${dom.escapeHtml(extra)}` : ''}</span></div>
        <div class="story-ui-mvu-rank-meter-track"><span class="story-ui-mvu-rank-meter-fill" style="width:${width}%"></span></div>
      </div>
    `;
  }

  function renderStatusShell() {
    const user = getVar('stat_data.user', {});
    const sys = getVar('stat_data.系统', {});
    const tasksModule = getVar('stat_data.任务系统', {});
    const npcs = getVar('stat_data.人际档案', {});

    const time = sys.时间 || {};
    const loc = sys.地点 || {};
    const sex = sys.性爱状态 || {};
    const ce = user.咒力 && user.咒力 !== '待初始化' ? user.咒力 : user.能量系统 || {};
    const fw = user.名望 || {};
    const pw = fw.正道 || {};
    const ew = fw.邪道 || {};
    const body = user.基础肉体 || {};

    const worldTime = `${time.年 || 2018}年${time.月日 || ''} ${time.时分 || ''} (${time.星期 || ''})`;
    const worldLoc = `${loc.国家 || ''} ${loc.地域 || ''} ${loc.场所 || ''} ${loc.具体位置 || ''}`.trim() || '未知位置';

    const positiveTitles = (Array.isArray(pw.称号) ? pw.称号 : String(pw.称号 || '寂寂无名的路人').split(/[、,，]/)).filter(Boolean);
    const negativeTitles = (Array.isArray(ew.称号) ? ew.称号 : String(ew.称号 || '无人知晓的普通人').split(/[、,，]/)).filter(Boolean);
    const identityTags = (Array.isArray(user.公开身份) ? user.公开身份 : String(user.公开身份 || '').split(/[、,，]/)).filter(Boolean);

    const clothes = user.当前服装 || {};
    const clothesHtml = [
      ['外套', clothes.外套 || '无'],
      ['内搭', clothes.内搭 || '无'],
      ['下装', clothes.下装 || '无'],
      ['足具', clothes.足具 || '无'],
    ]
      .map(([slot, value]) => `<span class="story-ui-mvu-cloth-chip ${value === '无' ? 'is-empty' : ''}"><span class="story-ui-mvu-cloth-slot">${dom.escapeHtml(slot)}</span>${dom.escapeHtml(value)}</span>`)
      .join('');

    const participants = Array.isArray(sex.参与者) ? sex.参与者 : [];
    const sexHtml =
      sex.进行中 === true
        ? `
          <section class="story-ui-mvu-panel story-ui-mvu-pink">
            <div class="story-ui-mvu-header" data-story-ui-mvu-toggle data-target-id="story-ui-mvu-sex-${Date.now()}">
              <span class="story-ui-mvu-mark">✧</span>
              <div>
                <div class="story-ui-mvu-title">亲密状态</div>
                <div class="story-ui-mvu-subtitle">SIGNAL TRACE</div>
              </div>
              <span class="story-ui-mvu-toggle-icon">▼</span>
            </div>
            <div class="story-ui-mvu-pink-container">
              ${participants.length === 0 ? '<div class="story-ui-mvu-muted-empty">正在感受爱意...</div>' : participants
                .map(name => {
                  const npcData = npcs[name] || {};
                  const lust = Math.max(0, Math.min(100, Number(npcData.欲望值 || 0)));
                  return `
                    <div class="story-ui-mvu-sex-row">
                      <span class="story-ui-mvu-sex-char-name">${dom.escapeHtml(name)}</span>
                      <div class="story-ui-mvu-lust-bar-bg"><div class="story-ui-mvu-lust-bar-fill" style="width:${lust}%"></div></div>
                      <span class="story-ui-mvu-lust-value-text">${dom.escapeHtml(lust)} / 100</span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </section>
        `
        : '';

    const relationHtml = Object.entries(npcs || {}).length
      ? Object.entries(npcs || {})
          .map(([name, data]) => {
            const affinity = Number(data?.好感数值 || 0);
            const trust = Number(data?.信任度 || 0);
            const stage = data?.关系阶段 || '未知';
            const affinityWidth = (Math.min(Math.abs(affinity), 100) / 100) * 50;
            const trustWidth = (Math.min(Math.abs(trust), 100) / 100) * 50;
            const affinityStyle = affinity >= 0
              ? `left:50%;width:${affinityWidth}%;background:linear-gradient(90deg,#d0b8a9,#a07e74);`
              : `right:50%;width:${affinityWidth}%;background:#9a9389;`;
            const trustStyle = trust >= 0
              ? `left:50%;width:${trustWidth}%;background:linear-gradient(90deg,#cdbd8d,#b79a62);`
              : `right:50%;width:${trustWidth}%;background:#9a9389;`;
            return `
              <div class="story-ui-mvu-character-card">
                <div class="story-ui-mvu-char-name" title="${dom.escapeHtml(name)}">✦ ${dom.escapeHtml(name)}</div>
                <div class="story-ui-mvu-stat-row">
                  <span class="story-ui-mvu-stat-label">关系阶段</span>
                  <span class="story-ui-mvu-stat-value">${dom.escapeHtml(stage)}</span>
                </div>
                <div class="story-ui-mvu-stat-row">
                  <span class="story-ui-mvu-stat-label">好感度: ${dom.escapeHtml(affinity)}</span>
                  <div class="story-ui-mvu-bar-bg"><div class="story-ui-mvu-bar-center"></div><div class="story-ui-mvu-bar-fill" style="${affinityStyle}"></div></div>
                </div>
                <div class="story-ui-mvu-stat-row">
                  <span class="story-ui-mvu-stat-label">信任度: ${dom.escapeHtml(trust)}</span>
                  <div class="story-ui-mvu-bar-bg"><div class="story-ui-mvu-bar-center"></div><div class="story-ui-mvu-bar-fill" style="${trustStyle}"></div></div>
                </div>
              </div>
            `;
          })
          .join('')
      : '<div class="story-ui-mvu-muted-empty">暂无羁绊数据...</div>';

    return `
      <section class="story-ui-root story-ui-mvu story-ui-day" data-story-ui-module="${MODULE_ID}">
        <main class="story-ui-mvu-root">
          <section class="story-ui-mvu-panel">
            <div class="story-ui-mvu-header">
              <span class="story-ui-mvu-mark" data-story-ui-theme-toggle title="切换日夜主题">✦</span>
              <div>
                <div class="story-ui-mvu-title">世界状态</div>
                <div class="story-ui-mvu-subtitle">GLOBAL ANCHOR</div>
              </div>
              <span class="story-ui-mvu-toggle-icon">✧</span>
            </div>
            <div class="story-ui-mvu-body">
              <div class="story-ui-mvu-world-grid">
                <div class="story-ui-mvu-world-card">
                  <span class="story-ui-mvu-label">当前时间</span>
                  <span class="story-ui-mvu-value">${dom.escapeHtml(worldTime)}</span>
                </div>
                <div class="story-ui-mvu-world-card">
                  <span class="story-ui-mvu-label">当前位置</span>
                  <span class="story-ui-mvu-value">${dom.escapeHtml(worldLoc)}</span>
                </div>
              </div>
            </div>
          </section>

          ${sexHtml}

          <section class="story-ui-mvu-panel">
            <div class="story-ui-mvu-header" data-story-ui-mvu-toggle data-target-id="story-ui-mvu-user-panel">
              <span class="story-ui-mvu-mark">✦</span>
              <div>
                <div class="story-ui-mvu-title">个人状态档案</div>
                <div class="story-ui-mvu-subtitle">USER STATUS DASHBOARD</div>
              </div>
              <span class="story-ui-mvu-toggle-icon">▼</span>
            </div>
            <div class="story-ui-mvu-body" id="story-ui-mvu-user-panel">
              <div class="story-ui-mvu-hero">
                <div class="story-ui-mvu-profile-card">
                  <div class="story-ui-mvu-profile-main">
                    <div class="story-ui-mvu-rank-card">
                      <div class="story-ui-mvu-rank-title">等级 / 战力评级</div>
                      <div class="story-ui-mvu-rank-value">${dom.escapeHtml(user.等级 || 1)} · ${dom.escapeHtml(user.战力评级 || '普通人')}</div>
                      <div class="story-ui-mvu-rank-meters">
                        ${renderMeter('EXP 经验', user.EXP || 0, 100, '', 'exp')}
                        ${renderMeter('SP 咒力', ce.当前值 || 0, ce.最大值 || ce.有效总量 || ce.总量 || 1, '', 'sp')}
                      </div>
                    </div>
                    <div class="story-ui-mvu-stat-grid">
                      <div class="story-ui-mvu-stat-card"><span class="story-ui-mvu-stat-name">KP</span><span class="story-ui-mvu-stat-value">${dom.escapeHtml(user.KP || 0)}</span></div>
                      <div class="story-ui-mvu-stat-card rose"><span class="story-ui-mvu-stat-name">身体状况</span><span class="story-ui-mvu-stat-value">${dom.escapeHtml(user.身体状况 || '未知')}</span></div>
                      <div class="story-ui-mvu-stat-card"><span class="story-ui-mvu-stat-name">体术等级</span><span class="story-ui-mvu-stat-value">${dom.escapeHtml(user.肉搏等级 || '未入门')}</span></div>
                      <div class="story-ui-mvu-stat-card rose"><span class="story-ui-mvu-stat-name">损伤/疤痕</span><span class="story-ui-mvu-stat-value">${dom.escapeHtml(user.永久损伤或疤痕 || '无')}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="story-ui-mvu-info-list">
                <div class="story-ui-mvu-stat-line"><span class="lbl">当前服装</span><span class="val"><div class="story-ui-mvu-clothes-line">${clothesHtml}</div></span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">身份</span><span class="val">${identityTags.length ? `<div class="story-ui-mvu-profile-tags">${identityTags.map(item => `<span class="story-ui-mvu-profile-tag">${dom.escapeHtml(item)}</span>`).join('')}</div>` : '<div class="story-ui-mvu-muted-empty">未知身份</div>'}</span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">正道名望</span><span class="val"><div class="story-ui-mvu-fame-line"><span class="story-ui-mvu-fame-score">名望 ${dom.escapeHtml(Number(pw.数值 || 0))}</span><span class="story-ui-mvu-fame-tags">${positiveTitles.map(item => `<span class="story-ui-mvu-fame-tag pos">${dom.escapeHtml(item)}</span>`).join('')}</span></div></span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">邪道名望</span><span class="val"><div class="story-ui-mvu-fame-line"><span class="story-ui-mvu-fame-score">名望 ${dom.escapeHtml(Number(ew.数值 || 0))}</span><span class="story-ui-mvu-fame-tags">${negativeTitles.map(item => `<span class="story-ui-mvu-fame-tag neg">${dom.escapeHtml(item)}</span>`).join('')}</span></div></span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">金钱</span><span class="val">${dom.escapeHtml(user.持有金钱 || 0)}</span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">居住</span><span class="val">${dom.escapeHtml(user.居住地 || '未知')}</span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">基础肉体</span><span class="val">${dom.escapeHtml(body.基础肉体值 || 0)} / ${dom.escapeHtml(body.武艺值 || 0)} · ${dom.escapeHtml(body.武艺阶段 || '未入门')}</span></div>
                <div class="story-ui-mvu-stat-line"><span class="lbl">任务数</span><span class="val">${dom.escapeHtml(Object.keys(tasksModule || {}).length)}</span></div>
              </div>
            </div>
          </section>

          <section class="story-ui-mvu-panel">
            <div class="story-ui-mvu-header" data-story-ui-mvu-toggle data-target-id="story-ui-mvu-rel-panel">
              <span class="story-ui-mvu-mark">✦</span>
              <div>
                <div class="story-ui-mvu-title">咒术高专 · 羁绊档案</div>
                <div class="story-ui-mvu-subtitle">RELATION ARCHIVE</div>
              </div>
              <span class="story-ui-mvu-toggle-icon collapsed">▼</span>
            </div>
            <div class="story-ui-mvu-jujutsu-container" id="story-ui-mvu-rel-panel" style="display:none;">${relationHtml}</div>
          </section>
        </main>
      </section>
    `;
  }

  function renderContentNode() {
    const wrapper = dom.createElement('div', {
      className: 'story-ui-mvu-wrapper',
      html: renderStatusShell(),
    });

    return wrapper.firstElementChild || null;
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);

    const root = node.querySelector?.('.story-ui-mvu') || node.querySelector?.('.story-ui-root.story-ui-mvu');
    if (root && !root.dataset.storyUiMvuBound) {
      root.dataset.storyUiMvuBound = 'true';
      root.addEventListener('click', event => {
        const header = event.target?.closest?.('[data-story-ui-mvu-toggle]');
        if (!header || !root.contains(header)) return;
        event.preventDefault();
        const targetId = header.getAttribute('data-target-id');
        if (!targetId) return;
        const target = root.querySelector(`#${CSS.escape(targetId)}`);
        if (!target) return;
        const isHidden = getComputedStyle(target).display === 'none';
        target.style.display = isHidden ? '' : 'none';
        header.querySelector('.story-ui-mvu-toggle-icon')?.classList.toggle('collapsed', !isHidden);
      });
    }

    if (window.Mvu?.events?.VARIABLE_UPDATE_ENDED && window.eventOn && !node.dataset.storyUiMvuRefreshBound) {
      node.dataset.storyUiMvuRefreshBound = 'true';
      window.eventOn(window.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
        const panel = node.querySelector?.('.story-ui-mvu');
        if (!panel) return;
        const fresh = document.createElement('div');
        fresh.innerHTML = renderStatusShell();
        const nextPanel = fresh.firstElementChild;
        if (!nextPanel) return;
        panel.replaceWith(nextPanel);
        ui.theme?.applyThemeToRoot?.(nextPanel);
      });
    }
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 80,
    singleTag: SINGLE_TAG,
    renderContent: renderContentNode,
    mount,
  });

  ui.mvuStatus = {
    singleTag: SINGLE_TAG,
    renderContent: renderContentNode,
  };
})();
