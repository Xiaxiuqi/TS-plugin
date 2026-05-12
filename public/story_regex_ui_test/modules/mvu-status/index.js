(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'mvu-status';
  const MODULE_VERSION = '0.2.0-test-rebuild';
  const PLACEHOLDER = '<StatusPlaceHolderImpl/>';

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

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function emptyText(text = '无') {
    return `<div class="muted-empty">${escapeHtml(text)}</div>`;
  }

  function clampPercent(value, max = 100) {
    const numericValue = Number(value) || 0;
    const numericMax = Number(max) || 0;
    if (numericMax <= 0) return 0;
    return Math.max(0, Math.min(100, (numericValue / numericMax) * 100));
  }

  function renderClothes(clothes = {}) {
    const slots = [
      ['外套', clothes.外套 || '无'],
      ['内搭', clothes.内搭 || '无'],
      ['下装', clothes.下装 || '无'],
      ['足具', clothes.足具 || '无'],
    ];
    return `<div class="clothes-line">${slots
      .map(([slot, value]) => {
        const isEmpty = !value || value === '无';
        return `<span class="cloth-chip ${isEmpty ? 'cloth-empty' : ''}"><span class="cloth-slot">${escapeHtml(slot)}</span>${escapeHtml(value)}</span>`;
      })
      .join('')}</div>`;
  }

  function renderIdentityTags(idents) {
    const list = (Array.isArray(idents) ? idents : String(idents || '').split(/[、,，]/))
      .map(item => String(item).trim())
      .filter(Boolean);
    const deduped = [...new Set(list)];
    if (deduped.length === 0) return emptyText('未知身份');
    return `<div class="profile-tags">${deduped.map(item => `<span class="profile-tag">${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  function normalizeTitleList(titles, fallback) {
    const list = (Array.isArray(titles) ? titles : String(titles || fallback || '').split(/[、,，]/))
      .map(item => String(item).trim())
      .filter(Boolean);
    return [...new Set(list)];
  }

  function renderFameLine(score, titles, type, fallback) {
    const list = normalizeTitleList(titles, fallback);
    const scoreText = Number(score || 0);
    const tagHtml = list.map(item => `<span class="fame-tag ${type}">${escapeHtml(item)}</span>`).join('');
    return `<div class="fame-line"><span class="fame-score">名望 ${escapeHtml(scoreText)}</span><span class="fame-tags">${tagHtml}</span></div>`;
  }

  function buildItemList(dataObj, mark, title, renderContentFn) {
    let html = `<div class="sub-toggle-header">${escapeHtml(mark)} ${escapeHtml(title)} <span class="toggle-icon">▼</span></div><div class="sub-content">`;
    if (!dataObj || dataObj === '待初始化' || (typeof dataObj === 'object' && Object.keys(dataObj).length === 0)) {
      html += emptyText();
    } else {
      html += '<div class="mvu-mini-grid">';
      Object.entries(dataObj).forEach(([k, v]) => {
        html += `<article class="mvu-mini-card"><div class="mvu-mini-title">${escapeHtml(k)}</div><div class="mvu-mini-body">${renderContentFn(v)}</div></article>`;
      });
      html += '</div>';
    }
    html += `</div>`;
    return html;
  }

  function renderWorld() {
    const sys = getVar('stat_data.系统', {});
    const time = sys.时间 || {};
    const loc = sys.地点 || {};
    const timeStr = `${time.年 || 2018}年${time.月日 || ''} ${time.时分 || ''} (${time.星期 || ''})`;
    const locStr = `${loc.国家 || ''} ${loc.地域 || ''} ${loc.场所 || ''} ${loc.具体位置 || ''}`.trim() || '未知位置';

    return `
      <div class="mvu-world-grid">
        <div class="mvu-world-card">
          <span class="mvu-label">当前时间</span>
          <span class="mvu-value">${escapeHtml(timeStr)}</span>
        </div>
        <div class="mvu-world-card">
          <span class="mvu-label">当前位置</span>
          <span class="mvu-value">${escapeHtml(locStr)}</span>
        </div>
      </div>
    `;
  }

  function renderUser() {
    const user = getVar('stat_data.user', {});
    const tasksModule = getVar('stat_data.任务系统', {});
    const expValue = Number(user.EXP || 0);
    const ce = user.咒力 || {};
    const spValue = Number(ce.当前值 || 0);
    const spMax = Number(ce.最大值 || 0);

    const vows = user.束缚 || {};
    let vowHtml = `<div class="sub-toggle-header">✦ 束缚 <span class="toggle-icon">▼</span></div><div class="sub-content">`;
    if (!vows || vows === '待初始化' || Object.keys(vows).length === 0) {
      vowHtml += emptyText();
    } else {
      vowHtml += '<div class="mvu-mini-grid">';
      Object.entries(vows).forEach(([k, v]) => {
        const isPermanent = !v?.恢复条件 || v.恢复条件 === '无';
        const typeLabel = isPermanent ? '永久' : '临时';
        let itemContent = `<p><span class="c-lbl">类型:</span> ${escapeHtml(typeLabel)}</p><p><span class="c-lbl">代价:</span> ${escapeHtml(v?.代价 || '')}</p>`;
        if (!isPermanent) itemContent += `<p><span class="c-lbl">恢复条件:</span> ${escapeHtml(v?.恢复条件 || '')}</p>`;
        vowHtml += `<article class="mvu-mini-card"><div class="mvu-mini-title">${escapeHtml(k)}</div><div class="mvu-mini-body">${itemContent}</div></article>`;
      });
      vowHtml += '</div>';
    }
    vowHtml += `</div>`;

    const innateCt = user.生得术式 || {};
    const extendedCts = user.扩展术式 || {};
    let allCtsItemsHtml = '';

    if (innateCt.名称 && innateCt.名称 !== '无' && innateCt.名称 !== '待觉醒') {
      allCtsItemsHtml += `<article class="mvu-mini-card innate-ct-header"><div class="mvu-mini-title">[生得术式] ${escapeHtml(innateCt.名称)}</div><div class="mvu-mini-body">
        <p><span class="c-lbl">属性:</span> ${escapeHtml(innateCt.属性 || '无')}</p>
        <p><span class="c-lbl">熟练度:</span> ${escapeHtml(innateCt.熟练度 || 0)} <span class="sub-lbl">⇒</span> <span class="val">${escapeHtml(innateCt.阶段 || '入门')}</span></p>
        <p><span class="c-lbl">描述:</span> ${escapeHtml(innateCt.描述 || '')}</p>
      </div></article>`;
    }

    if (extendedCts && extendedCts !== '待初始化' && Object.keys(extendedCts).length > 0) {
      Object.entries(extendedCts).forEach(([k, v]) => {
        allCtsItemsHtml += `<article class="mvu-mini-card"><div class="mvu-mini-title">${escapeHtml(k)}</div><div class="mvu-mini-body">
          <p><span class="c-lbl">熟练度:</span> ${escapeHtml(v?.熟练度 || 0)} <span class="sub-lbl">⇒</span> <span class="val">${escapeHtml(v?.阶段 || '入门')}</span></p>
          <p><span class="c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>
        </div></article>`;
      });
    }

    let finalCtHtml = `<div class="sub-toggle-header">✦ 术式 <span class="toggle-icon">▼</span></div><div class="sub-content">`;
    finalCtHtml += allCtsItemsHtml ? `<div class="mvu-mini-grid">${allCtsItemsHtml}</div>` : emptyText();
    finalCtHtml += `</div>`;

    const tasks = tasksModule || {};
    let taskHtml = `<div class="sub-toggle-header mvu-task-header">✦ 当前任务 <span class="toggle-icon">▼</span></div><div class="sub-content">`;
    if (!tasks || tasks === '待初始化' || Object.keys(tasks).length === 0) {
      taskHtml += emptyText('暂无任务');
    } else {
      Object.entries(tasks).forEach(([k, v]) => {
        const reward = v?.报酬 || {};
        const itemsObj = reward.物品 || {};
        let itemsHtml = '';
        if (Object.keys(itemsObj).length === 0) {
          itemsHtml = emptyText('暂无附加物品');
        } else {
          Object.entries(itemsObj).forEach(([itemName, itemNum]) => {
            itemsHtml += `<p><span class="c-lbl">- ${escapeHtml(itemName)}:</span> ${escapeHtml(itemNum)}</p>`;
          });
        }

        const rewardSectionHtml = `
          <div class="reward-section">
            <div class="reward-toggle-header">
              <span>报酬 金钱:${escapeHtml(reward.金钱 || 0)} | 名望:+${escapeHtml(reward.名望提升值 || 0)}</span>
              <span class="toggle-icon collapsed">▼</span>
            </div>
            <div class="reward-content">
              <p class="c-lbl">[包含物品]</p>
              ${itemsHtml}
            </div>
          </div>
        `;

        taskHtml += `<div class="item-toggle-header">${escapeHtml(v?.任务名 || k)} <span class="toggle-icon collapsed">▼</span></div>`;
        taskHtml += `<div class="item-content">
          <p><span class="c-lbl">等级:</span> ${escapeHtml(v?.任务等级 || '')}</p>
          <p><span class="c-lbl">类型:</span> ${escapeHtml(v?.类型 || '')}</p>
          <p><span class="c-lbl">委托方:</span> ${escapeHtml(v?.委托人或势力 || '')}</p>
          <p><span class="c-lbl">描述:</span> ${escapeHtml(v?.任务描述 || '')}</p>
          ${rewardSectionHtml}
          <p><span class="c-lbl">完成条件:</span> ${escapeHtml(v?.完成条件 || '')}</p>
          <p><span class="c-lbl">失败条件:</span> ${escapeHtml(v?.失败条件 || '')}</p>
        </div>`;
      });
    }
    taskHtml += `</div>`;

    return `
      <div class="mvu-body" id="user-container">
        <div class="mvu-hero">
          <div class="mvu-profile-card">
            <div class="mvu-profile-main">
              <div class="mvu-rank-card">
                <div class="mvu-rank-title">等级 / 战力评级</div>
                <div class="mvu-rank-value"><span>${escapeHtml(user.等级 || 1)}</span> · <span>${escapeHtml(user.战力评级 || '普通人')}</span></div>
                <div class="mvu-rank-meters">
                  <div class="mvu-rank-meter exp">
                    <div class="mvu-rank-meter-head"><span>EXP 经验</span><span>${escapeHtml(`${expValue} / 100`)}</span></div>
                    <div class="mvu-rank-meter-track"><span class="mvu-rank-meter-fill" style="width:${clampPercent(expValue, 100)}%"></span></div>
                  </div>
                  <div class="mvu-rank-meter sp">
                    <div class="mvu-rank-meter-head"><span>SP 咒力</span><span>${escapeHtml(`${spValue} / ${spMax}`)}</span></div>
                    <div class="mvu-rank-meter-track"><span class="mvu-rank-meter-fill" style="width:${clampPercent(spValue, spMax)}%"></span></div>
                  </div>
                </div>
              </div>
              <div class="mvu-stat-grid">
                <div class="mvu-stat-card"><span class="mvu-stat-name">KP</span><span class="mvu-stat-value">${escapeHtml(user.KP || 0)}</span></div>
                <div class="mvu-stat-card rose"><span class="mvu-stat-name">身体状况</span><span class="mvu-stat-value">${escapeHtml(user.身体状况 || '未知')}</span></div>
                <div class="mvu-stat-card"><span class="mvu-stat-name">体术等级</span><span class="mvu-stat-value">${escapeHtml(user.肉搏等级 || '未入门')}</span></div>
                <div class="mvu-stat-card rose"><span class="mvu-stat-name">损伤/疤痕</span><span class="mvu-stat-value">${escapeHtml(user.永久损伤或疤痕 || '无')}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mvu-section-grid">
          ${vowHtml}
          ${buildItemList(user.战技, '✦', '战技', v => `<p><span class="c-lbl">熟练度:</span> ${escapeHtml(v?.熟练度 || 0)} <span class="sub-lbl">⇒</span> <span class="val">${escapeHtml(v?.阶段 || '入门')}</span></p><p><span class="c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>`)}
          ${finalCtHtml}
          ${buildItemList(user.特殊体质, '✧', '特殊体质', v => `<p>${escapeHtml(v)}</p>`)}
          ${buildItemList(user.咒灵操术, '✧', '咒灵操术', v => `<p>${escapeHtml(v)}</p>`)}
        </div>

        <div class="mvu-info-list">
          <div class="stat-line"><span class="lbl">当前服装</span><span class="val">${renderClothes(user.当前服装 || {})}</span></div>
          <div class="stat-line"><span class="lbl">身份</span><span class="val">${renderIdentityTags(user.公开身份 || [])}</span></div>
          <div class="stat-line"><span class="lbl">正道名望</span><span class="val">${renderFameLine(user?.名望?.正道?.数值, user?.名望?.正道?.称号, 'pos', '寂寂无名的路人')}</span></div>
          <div class="stat-line"><span class="lbl">邪道名望</span><span class="val">${renderFameLine(user?.名望?.邪道?.数值, user?.名望?.邪道?.称号, 'neg', '无人知晓的普通人')}</span></div>
          <div class="stat-line"><span class="lbl">金钱</span><span class="val">${escapeHtml(user.持有金钱 || 0)}</span></div>
          <div class="stat-line"><span class="lbl">居住</span><span class="val">${escapeHtml(user.居住地 || '未知')}</span></div>
        </div>

        <div class="mvu-section-grid">
          ${buildItemList(user.行囊, '✦', '行囊', v => `<p><span class="c-lbl">数量:</span> ${escapeHtml(v?.数量 || 0)}</p><p><span class="c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>`)}
          ${taskHtml}
        </div>
      </div>
    `;
  }

  function renderCharacterData() {
    const npcs = getVar('stat_data.人际档案', {});
    let fullHtml = '';

    Object.entries(npcs || {}).forEach(([name, data]) => {
      const affinity = Number(data?.好感数值 || 0);
      const trust = Number(data?.信任度 || 0);
      const stage = data?.关系阶段 || '未知';
      const affinityWidth = (Math.min(Math.abs(affinity), 100) / 100) * 50;
      const trustWidth = (Math.min(Math.abs(trust), 100) / 100) * 50;
      const affinityStyle = affinity >= 0
        ? `left: 50%; width: ${affinityWidth}%; background: linear-gradient(90deg, #d0b8a9, #a07e74);`
        : `right: 50%; width: ${affinityWidth}%; background: #9a9389;`;
      const trustStyle = trust >= 0
        ? `left: 50%; width: ${trustWidth}%; background: linear-gradient(90deg, #cdbd8d, #b79a62);`
        : `right: 50%; width: ${trustWidth}%; background: #9a9389;`;

      fullHtml += `
        <div class="character-card">
          <div class="char-name" title="${escapeHtml(name)}">✦ ${escapeHtml(name)}</div>
          <div class="stat-row">
            <span class="stat-label">关系阶段</span>
            <span class="stat-value">${escapeHtml(stage)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">好感度: ${escapeHtml(affinity)}</span>
            <div class="bar-bg"><div class="bar-center"></div><div class="bar-fill" style="${affinityStyle}"></div></div>
          </div>
          <div class="stat-row">
            <span class="stat-label">信任度: ${escapeHtml(trust)}</span>
            <div class="bar-bg"><div class="bar-center"></div><div class="bar-fill" style="${trustStyle}"></div></div>
          </div>
        </div>
      `;
    });

    return fullHtml || emptyText('暂无羁绊数据...');
  }

  function renderSexStatus() {
    const sys = getVar('stat_data.系统', {});
    const sex = sys.性爱状态 || {};
    const npcs = getVar('stat_data.人际档案', {});

    if (sex.进行中 !== true) return '';
    const participants = sex.参与者 || [];
    let fullHtml = '';

    if (participants.length === 0) {
      fullHtml = '<div class="muted-empty">正在感受爱意...</div>';
    } else {
      participants.forEach(name => {
        const npcData = npcs[name] || {};
        const lust = Number(npcData.欲望值 || 0);
        fullHtml += `
          <div class="sex-row">
            <span class="sex-char-name">${escapeHtml(name)}</span>
            <div class="lust-bar-bg"><div class="lust-bar-fill" style="width: ${Math.min(lust, 100)}%;"></div></div>
            <span class="lust-value-text">${escapeHtml(lust)} / 100</span>
          </div>
        `;
      });
    }

    return `
      <section class="mvu-panel pink-wrapper" id="sex-wrapper" style="display:block;">
        <div class="mvu-header main-toggle" data-target="sex-container" data-icon="sex-icon">
          <span class="mvu-mark">✧</span>
          <div>
            <div class="mvu-title">亲密状态</div>
            <div class="mvu-subtitle">INTIMACY SIGNAL</div>
          </div>
          <span class="toggle-icon" id="sex-icon">▼</span>
        </div>
        <div class="pink-container" id="sex-container">${fullHtml}</div>
      </section>
    `;
  }

  function renderShell() {
    return `
      <section class="story-ui-root story-ui-mvu story-ui-day" data-story-ui-module="${MODULE_ID}">
        <main class="mvu-root">
          <section class="mvu-panel">
            <div class="mvu-header">
              <span class="mvu-mark" data-story-ui-theme-toggle title="切换日夜主题">✦</span>
              <div>
                <div class="mvu-title">世界状态</div>
                <div class="mvu-subtitle">GLOBAL ANCHOR</div>
              </div>
              <span class="toggle-icon">✧</span>
            </div>
            <div class="mvu-body">${renderWorld()}</div>
          </section>

          ${renderSexStatus()}

          <section class="mvu-panel">
            <div class="mvu-header main-toggle" data-target="user-container" data-icon="user-icon">
              <span class="mvu-mark">✦</span>
              <div>
                <div class="mvu-title">个人状态档案</div>
                <div class="mvu-subtitle">USER STATUS DASHBOARD</div>
              </div>
              <span class="toggle-icon" id="user-icon">▼</span>
            </div>
            ${renderUser()}
          </section>

          <section class="mvu-panel">
            <div class="mvu-header main-toggle" data-target="jujutsu-container" data-icon="toggle-icon">
              <span class="mvu-mark">✦</span>
              <div>
                <div class="mvu-title">咒术高专 · 羁绊档案</div>
                <div class="mvu-subtitle">RELATION ARCHIVE</div>
              </div>
              <span class="toggle-icon collapsed" id="toggle-icon">▼</span>
            </div>
            <div class="jujutsu-container" id="jujutsu-container" style="display: none;">${renderCharacterData()}</div>
          </section>
        </main>
      </section>
    `;
  }

  function renderContentNode() {
    const wrapper = dom.createElement('div', {
      className: 'story-ui-mvu-wrapper',
      html: renderShell(),
    });

    return wrapper.firstElementChild || null;
  }

  function bindToggleInteractions(root) {
    if (!root || root.dataset.storyUiMvuBound === 'true') return;
    root.dataset.storyUiMvuBound = 'true';

    root.addEventListener('click', event => {
      const header = event.target?.closest?.('.main-toggle');
      if (!header || !root.contains(header)) return;
      event.preventDefault();
      const targetId = header.dataset.target;
      const iconId = header.dataset.icon;
      const target = targetId ? root.querySelector(`#${targetId}`) : null;
      const icon = iconId ? root.querySelector(`#${iconId}`) : header.querySelector('.toggle-icon');
      if (!target) return;
      const hidden = getComputedStyle(target).display === 'none';
      target.style.display = hidden ? '' : 'none';
      icon?.classList.toggle('collapsed', !hidden);
    });

    root.addEventListener('click', event => {
      const header = event.target?.closest?.('.sub-toggle-header, .item-toggle-header, .reward-toggle-header');
      if (!header || !root.contains(header)) return;
      event.preventDefault();
      event.stopPropagation();
      const next = header.nextElementSibling;
      if (!next || !next.matches('.sub-content, .item-content, .reward-content')) return;
      const hidden = getComputedStyle(next).display === 'none';
      next.style.display = hidden ? 'block' : 'none';
      header.querySelector('.toggle-icon')?.classList.toggle('collapsed', !hidden);
    });
  }

  function mount(root) {
    bindToggleInteractions(root);
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 80,
    placeholder: PLACEHOLDER,
    renderContent: renderContentNode,
    mount,
  });

  ui.mvuStatus = {
    placeholder: PLACEHOLDER,
    renderContent: renderContentNode,
    mount,
  };
})();
