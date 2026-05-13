(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'mvu-status';
  const MODULE_VERSION = '0.2.0-prod-original-regex-restore';
  const SINGLE_TAG = '<StatusPlaceHolderImpl/>';

  function getMvuDataForMessage(messageId) {
    try {
      if (window.Mvu?.getMvuData && Number.isFinite(messageId)) {
        return window.Mvu.getMvuData({ type: 'message', message_id: messageId }) || {};
      }
    } catch {
      // ignore
    }

    try {
      return window.getAllVariables?.() || {};
    } catch {
      return {};
    }
  }

  function getVar(variables, path, fallback = '') {
    try {
      const parts = String(path || '').split('.');
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

  function escapeHtml(value) {
    return dom.escapeHtml(String(value ?? ''));
  }

  function asNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function clampPercent(value, max = 100) {
    const numericValue = Number(value) || 0;
    const numericMax = Number(max) || 0;
    if (numericMax <= 0) return 0;
    return Math.max(0, Math.min(100, (numericValue / numericMax) * 100));
  }

  function emptyText(text = '无') {
    return `<div class="story-ui-mvu-muted-empty">${escapeHtml(text)}</div>`;
  }

  function normalizeList(value, fallback = '') {
    return (Array.isArray(value) ? value : String(value || fallback).split(/[、,，]/))
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  function normalizeTitleList(titles, fallback) {
    return [...new Set(normalizeList(titles, fallback))];
  }

  function renderClothes(clothes = {}) {
    const slots = [
      ['外套', clothes.外套 || '无'],
      ['内搭', clothes.内搭 || '无'],
      ['下装', clothes.下装 || '无'],
      ['足具', clothes.足具 || '无'],
    ];
    return `<div class="story-ui-mvu-clothes-line">${slots
      .map(([slot, value]) => {
        const isEmpty = !value || value === '无';
        return `<span class="story-ui-mvu-cloth-chip ${isEmpty ? 'is-empty story-ui-mvu-cloth-empty' : ''}"><span class="story-ui-mvu-cloth-slot">${escapeHtml(slot)}</span>${escapeHtml(value)}</span>`;
      })
      .join('')}</div>`;
  }

  function renderIdentityTags(idents) {
    const deduped = [...new Set(normalizeList(idents))];
    if (deduped.length === 0) return emptyText('未知身份');
    return `<div class="story-ui-mvu-profile-tags">${deduped.map(item => `<span class="story-ui-mvu-profile-tag">${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  function renderFameLine(score, titles, type, fallback) {
    const list = normalizeTitleList(titles, fallback);
    const scoreText = Number(score || 0);
    const tagHtml = list.map(item => `<span class="story-ui-mvu-fame-tag ${type}">${escapeHtml(item)}</span>`).join('');
    return `<div class="story-ui-mvu-fame-line"><span class="story-ui-mvu-fame-score">名望 ${escapeHtml(scoreText)}</span><span class="story-ui-mvu-fame-tags">${tagHtml}</span></div>`;
  }

  function renderMeter(label, value, max, fillClass) {
    const safeValue = Number(value) || 0;
    const safeMax = Number(max) || 0;
    const width = clampPercent(safeValue, safeMax);
    return `
      <div class="story-ui-mvu-rank-meter ${fillClass}">
        <div class="story-ui-mvu-rank-meter-head"><span>${escapeHtml(label)}</span><span>${escapeHtml(safeValue)} / ${escapeHtml(safeMax)}</span></div>
        <div class="story-ui-mvu-rank-meter-track"><span class="story-ui-mvu-rank-meter-fill" style="width:${width}%"></span></div>
      </div>
    `;
  }

  function buildItemList(dataObj, mark, title, renderContentFn) {
    let html = `<div class="story-ui-mvu-sub-toggle-header" data-story-ui-mvu-toggle-next>${escapeHtml(mark)} ${escapeHtml(title)} <span class="story-ui-mvu-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-sub-content">`;
    if (!dataObj || dataObj === '待初始化' || (typeof dataObj === 'object' && Object.keys(dataObj).length === 0)) {
      html += emptyText();
    } else {
      html += '<div class="story-ui-mvu-mini-grid">';
      Object.entries(dataObj).forEach(([k, v]) => {
        html += `<article class="story-ui-mvu-mini-card"><div class="story-ui-mvu-mini-title">${escapeHtml(k)}</div><div class="story-ui-mvu-mini-body">${renderContentFn(v)}</div></article>`;
      });
      html += '</div>';
    }
    html += `</div>`;
    return html;
  }

  function renderWorld(allVariables, subtitle) {
    const markIcon = ui.theme?.getTheme?.() === 'night' ? '✧' : '✦';
    const sys = getVar(allVariables, 'stat_data.系统', {});
    const time = sys.时间 || {};
    const loc = sys.地点 || {};
    const timeStr = `${time.年 || 2018}年${time.月日 || ''} ${time.时分 || ''} (${time.星期 || ''})`;
    const locStr = `${loc.国家 || ''} ${loc.地域 || ''} ${loc.场所 || ''} ${loc.具体位置 || ''}`.trim() || '未知位置';

    return `
      <section class="story-ui-mvu-panel">
        <div class="story-ui-mvu-header">
          <span class="story-ui-mvu-mark" data-story-ui-theme-toggle title="切换日夜主题">${markIcon}</span>
          <div>
            <div class="story-ui-mvu-title">世界状态</div>
            <div class="story-ui-mvu-subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <span class="story-ui-mvu-toggle-icon">✧</span>
        </div>
        <div class="story-ui-mvu-body">
          <div class="story-ui-mvu-world-grid">
            <div class="story-ui-mvu-world-card">
              <span class="story-ui-mvu-label">当前时间</span>
              <span class="story-ui-mvu-value">${escapeHtml(timeStr)}</span>
            </div>
            <div class="story-ui-mvu-world-card">
              <span class="story-ui-mvu-label">当前位置</span>
              <span class="story-ui-mvu-value">${escapeHtml(locStr)}</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderSexStatus(allVariables, subtitle) {
    const sys = getVar(allVariables, 'stat_data.系统', {});
    const sex = sys.性爱状态 || {};
    const npcs = getVar(allVariables, 'stat_data.人际档案', {});

    if (sex.进行中 !== true) return '';

    const participants = Array.isArray(sex.参与者) ? sex.参与者 : [];
    let fullHtml = '';

    if (participants.length === 0) {
      fullHtml = '<div class="story-ui-mvu-muted-empty">正在感受爱意...</div>';
    } else {
      participants.forEach(name => {
        const npcData = npcs[name] || {};
        const lust = Number(npcData.欲望值 || 0);
        fullHtml += `
          <div class="story-ui-mvu-sex-row">
            <span class="story-ui-mvu-sex-char-name">${escapeHtml(name)}</span>
            <div class="story-ui-mvu-lust-bar-bg">
              <div class="story-ui-mvu-lust-bar-fill" style="width:${Math.min(Math.max(lust, 0), 100)}%"></div>
            </div>
            <span class="story-ui-mvu-lust-value-text">${escapeHtml(lust)} / 100</span>
          </div>
        `;
      });
    }

    return `
      <section class="story-ui-mvu-panel story-ui-mvu-pink" id="story-ui-mvu-sex-wrapper">
        <div class="story-ui-mvu-header story-ui-mvu-main-toggle" data-story-ui-mvu-toggle-target="story-ui-mvu-sex-container" data-story-ui-mvu-toggle-icon="story-ui-mvu-sex-icon">
          <span class="story-ui-mvu-mark">✧</span>
          <div>
            <div class="story-ui-mvu-title">亲密状态</div>
            <div class="story-ui-mvu-subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <span class="story-ui-mvu-toggle-icon" id="story-ui-mvu-sex-icon">▼</span>
        </div>
        <div class="story-ui-mvu-pink-container" id="story-ui-mvu-sex-container">${fullHtml}</div>
      </section>
    `;
  }

  function renderUser(allVariables, subtitle) {
    const theme = ui.theme?.getTheme?.() || 'day';
    const markIcon = theme === 'night' ? '✧' : '✦';
    const user = getVar(allVariables, 'stat_data.user', {});
    const tasksModule = getVar(allVariables, 'stat_data.任务系统', {});

    const level = user.等级 || 1;
    const rank = user.战力评级 || '普通人';
    const expValue = Number(user.EXP || 0);
    const ce = user.咒力 || {};
    const spValue = Number(ce.当前值 || 0);
    const spMax = Number(ce.最大值 || 0);
    const clo = user.当前服装 || {};
    const fw = user.名望 || {};
    const pw = fw.正道 || {};
    const ew = fw.邪道 || {};

    const vows = user.束缚 || {};
    let vowHtml = `<div class="story-ui-mvu-sub-toggle-header" data-story-ui-mvu-toggle-next>✦ 束缚 <span class="story-ui-mvu-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-sub-content">`;
    if (!vows || vows === '待初始化' || Object.keys(vows).length === 0) {
      vowHtml += emptyText();
    } else {
      vowHtml += '<div class="story-ui-mvu-mini-grid">';
      Object.entries(vows).forEach(([k, v]) => {
        const isPermanent = !v?.恢复条件 || v.恢复条件 === '无';
        const typeLabel = isPermanent ? '永久' : '临时';
        let itemContent = `<p><span class="story-ui-mvu-c-lbl">类型:</span> ${escapeHtml(typeLabel)}</p><p><span class="story-ui-mvu-c-lbl">代价:</span> ${escapeHtml(v?.代价 || '')}</p>`;
        if (!isPermanent)
          itemContent += `<p><span class="story-ui-mvu-c-lbl">恢复条件:</span> ${escapeHtml(v?.恢复条件 || '')}</p>`;
        vowHtml += `<article class="story-ui-mvu-mini-card"><div class="story-ui-mvu-mini-title">${escapeHtml(k)}</div><div class="story-ui-mvu-mini-body">${itemContent}</div></article>`;
      });
      vowHtml += '</div>';
    }
    vowHtml += `</div>`;

    const skillsHtml = buildItemList(user.战技, '✦', '战技', v => {
      return `<p><span class="story-ui-mvu-c-lbl">熟练度:</span> ${escapeHtml(v?.熟练度 || 0)} <span class="story-ui-mvu-sub-lbl">⇒</span> <span class="story-ui-mvu-val">${escapeHtml(v?.阶段 || '入门')}</span></p><p><span class="story-ui-mvu-c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>`;
    });

    const innateCt = user.生得术式 || {};
    const extendedCts = user.扩展术式 || {};
    let allCtsItemsHtml = '';

    if (innateCt.名称 && innateCt.名称 !== '' && innateCt.名称 !== '无' && innateCt.名称 !== '待觉醒') {
      allCtsItemsHtml += `<article class="story-ui-mvu-mini-card story-ui-mvu-innate-ct-header"><div class="story-ui-mvu-mini-title">[生得术式] ${escapeHtml(innateCt.名称)}</div><div class="story-ui-mvu-mini-body">
        <p><span class="story-ui-mvu-c-lbl">属性:</span> ${escapeHtml(innateCt.属性 || '无')}</p>
        <p><span class="story-ui-mvu-c-lbl">熟练度:</span> ${escapeHtml(innateCt.熟练度 || 0)} <span class="story-ui-mvu-sub-lbl">⇒</span> <span class="story-ui-mvu-val">${escapeHtml(innateCt.阶段 || '入门')}</span></p>
        <p><span class="story-ui-mvu-c-lbl">描述:</span> ${escapeHtml(innateCt.描述 || '')}</p>
      </div></article>`;
    }

    if (extendedCts && extendedCts !== '待初始化' && Object.keys(extendedCts).length > 0) {
      Object.entries(extendedCts).forEach(([k, v]) => {
        allCtsItemsHtml += `<article class="story-ui-mvu-mini-card"><div class="story-ui-mvu-mini-title">${escapeHtml(k)}</div><div class="story-ui-mvu-mini-body">
          <p><span class="story-ui-mvu-c-lbl">熟练度:</span> ${escapeHtml(v?.熟练度 || 0)} <span class="story-ui-mvu-sub-lbl">⇒</span> <span class="story-ui-mvu-val">${escapeHtml(v?.阶段 || '入门')}</span></p>
          <p><span class="story-ui-mvu-c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>
        </div></article>`;
      });
    }

    let finalCtHtml = `<div class="story-ui-mvu-sub-toggle-header" data-story-ui-mvu-toggle-next>✦ 术式 <span class="story-ui-mvu-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-sub-content">`;
    finalCtHtml +=
      allCtsItemsHtml !== '' ? `<div class="story-ui-mvu-mini-grid">${allCtsItemsHtml}</div>` : emptyText();
    finalCtHtml += `</div>`;

    const specialHtml = buildItemList(user.特殊体质, '✧', '特殊体质', v => `<p>${escapeHtml(v)}</p>`);
    const spiritsHtml = buildItemList(user.咒灵操术, '✧', '咒灵操术', v => `<p>${escapeHtml(v)}</p>`);
    const inventoryHtml = buildItemList(user.行囊, '✦', '行囊', v => {
      return `<p><span class="story-ui-mvu-c-lbl">数量:</span> ${escapeHtml(v?.数量 || 0)}</p><p><span class="story-ui-mvu-c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>`;
    });

    const tasks = tasksModule || {};
    let taskHtml = `<div class="story-ui-mvu-sub-toggle-header story-ui-mvu-task-header" data-story-ui-mvu-toggle-next>✦ 当前任务 <span class="story-ui-mvu-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-sub-content">`;
    if (!tasks || tasks === '待初始化' || Object.keys(tasks).length === 0) {
      taskHtml += emptyText('暂无任务');
    } else {
      Object.entries(tasks).forEach(([k, v]) => {
        const reward = v?.报酬 || {};
        const itemsObj = reward.物品 || {};
        let itemsHtml = '';
        if (!itemsObj || Object.keys(itemsObj).length === 0) {
          itemsHtml = emptyText('暂无附加物品');
        } else {
          Object.entries(itemsObj).forEach(([itemName, itemNum]) => {
            itemsHtml += `<p><span class="story-ui-mvu-c-lbl">- ${escapeHtml(itemName)}:</span> ${escapeHtml(itemNum)}</p>`;
          });
        }

        const rewardSectionHtml = `
          <div class="story-ui-mvu-reward-section">
            <div class="story-ui-mvu-reward-toggle-header" data-story-ui-mvu-toggle-next>
              <span>报酬 金钱:${escapeHtml(reward.金钱 || 0)} | 名望:+${escapeHtml(reward.名望提升值 || 0)}</span>
              <span class="story-ui-mvu-toggle-icon collapsed">▼</span>
            </div>
            <div class="story-ui-mvu-reward-content">
              <p class="story-ui-mvu-c-lbl">[包含物品]</p>
              ${itemsHtml}
            </div>
          </div>
        `;

        taskHtml += `<div class="story-ui-mvu-item-toggle-header" data-story-ui-mvu-toggle-next>${escapeHtml(v?.任务名 || k)} <span class="story-ui-mvu-toggle-icon collapsed">▼</span></div>`;
        taskHtml += `<div class="story-ui-mvu-item-content">
          <p><span class="story-ui-mvu-c-lbl">等级:</span> ${escapeHtml(v?.任务等级 || '')}</p>
          <p><span class="story-ui-mvu-c-lbl">类型:</span> ${escapeHtml(v?.类型 || '')}</p>
          <p><span class="story-ui-mvu-c-lbl">委托方:</span> ${escapeHtml(v?.委托人或势力 || '')}</p>
          <p><span class="story-ui-mvu-c-lbl">描述:</span> ${escapeHtml(v?.任务描述 || '')}</p>
          ${rewardSectionHtml}
          <p><span class="story-ui-mvu-c-lbl">完成条件:</span> ${escapeHtml(v?.完成条件 || '')}</p>
          <p><span class="story-ui-mvu-c-lbl">失败条件:</span> ${escapeHtml(v?.失败条件 || '')}</p>
        </div>`;
      });
    }
    taskHtml += `</div>`;

    return `
      <section class="story-ui-mvu-panel">
        <div class="story-ui-mvu-header story-ui-mvu-main-toggle" data-story-ui-mvu-toggle-target="story-ui-mvu-user-container" data-story-ui-mvu-toggle-icon="story-ui-mvu-user-icon">
          <span class="story-ui-mvu-mark">${markIcon}</span>
          <div>
            <div class="story-ui-mvu-title">个人状态档案</div>
            <div class="story-ui-mvu-subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <span class="story-ui-mvu-toggle-icon" id="story-ui-mvu-user-icon">▼</span>
        </div>
        <div class="story-ui-mvu-body" id="story-ui-mvu-user-container">
          <div class="story-ui-mvu-hero">
            <div class="story-ui-mvu-profile-card">
              <div class="story-ui-mvu-profile-main">
                <div class="story-ui-mvu-rank-card">
                  <div class="story-ui-mvu-rank-title">等级 / 战力评级</div>
                  <div class="story-ui-mvu-rank-value">${escapeHtml(level)} · ${escapeHtml(rank)}</div>
                  <div class="story-ui-mvu-rank-meters">
                    ${renderMeter('EXP 经验', expValue, 100, 'exp')}
                    ${renderMeter('SP 咒力', spValue, spMax, 'sp')}
                  </div>
                </div>
                <div class="story-ui-mvu-stat-grid">
                  <div class="story-ui-mvu-stat-card"><span class="story-ui-mvu-stat-name">KP <span class="story-ui-mvu-kp-tooltip" title="KP可通过结下束缚或升级获得，每次升级获得5KP。KP可用于提升咒力上限、肉搏等级、战技/术式熟练度，也可用于单次攻击必中、瞬发空间斩等等口胡效果。是原作束缚贷款与升级点的结合。">[?]</span></span><span class="story-ui-mvu-stat-value">${escapeHtml(user.KP || 0)}</span></div>
                  <div class="story-ui-mvu-stat-card rose"><span class="story-ui-mvu-stat-name">身体状况</span><span class="story-ui-mvu-stat-value">${escapeHtml(user.身体状况 || '未知')}</span></div>
                  <div class="story-ui-mvu-stat-card"><span class="story-ui-mvu-stat-name">体术等级 <span class="story-ui-mvu-kp-tooltip" title="体术等级除使用KP外不可提升，分未入门/C/B/A/S五个级别，S对应天与暴君。如果需要在开局时设置，在开局【降生】时写入肉搏等级：（你需要的等级）。">[?]</span></span><span class="story-ui-mvu-stat-value">${escapeHtml(user.肉搏等级 || '未入门')}</span></div>
                  <div class="story-ui-mvu-stat-card rose"><span class="story-ui-mvu-stat-name">损伤/疤痕</span><span class="story-ui-mvu-stat-value">${escapeHtml(user.永久损伤或疤痕 || '无')}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="story-ui-mvu-section-grid">
            <div>${vowHtml}</div>
            <div>${skillsHtml}</div>
            <div>${finalCtHtml}</div>
            <div>${specialHtml}</div>
            <div>${spiritsHtml}</div>
          </div>

          <div class="story-ui-mvu-info-list">
            <div class="story-ui-mvu-stat-line"><span class="lbl">当前服装</span><span class="val">${renderClothes(clo)}</span></div>
            <div class="story-ui-mvu-stat-line"><span class="lbl">身份</span><span class="val">${renderIdentityTags(user.公开身份 || [])}</span></div>
            <div class="story-ui-mvu-stat-line"><span class="lbl">正道名望</span><span class="val">${renderFameLine(pw.数值, pw.称号, 'pos', '寂寂无名的路人')}</span></div>
            <div class="story-ui-mvu-stat-line"><span class="lbl">邪道名望</span><span class="val">${renderFameLine(ew.数值, ew.称号, 'neg', '无人知晓的普通人')}</span></div>
            <div class="story-ui-mvu-stat-line"><span class="lbl">金钱</span><span class="val">${escapeHtml(user.持有金钱 || 0)}</span></div>
            <div class="story-ui-mvu-stat-line"><span class="lbl">居住</span><span class="val">${escapeHtml(user.居住地 || '未知')}</span></div>
          </div>

          <div class="story-ui-mvu-section-grid">
            <div>${inventoryHtml}</div>
            <div>${taskHtml}</div>
          </div>
        </div>
      </section>
    `;
  }

  function renderRelations(allVariables, subtitle) {
    const theme = ui.theme?.getTheme?.() || 'day';
    const markIcon = theme === 'night' ? '✧' : '✦';
    const npcs = getVar(allVariables, 'stat_data.人际档案', {});
    let fullHtml = '';

    Object.entries(npcs || {}).forEach(([name, data]) => {
      const affinity = Number(getVar(data, '好感数值', 0));
      const trust = Number(getVar(data, '信任度', 0));
      const stage = getVar(data, '关系阶段', '未知');

      const affinityWidth = (Math.min(Math.abs(affinity), 100) / 100) * 50;
      const trustWidth = (Math.min(Math.abs(trust), 100) / 100) * 50;

      const affinityStyle =
        affinity >= 0
          ? `left: 50%; width: ${affinityWidth}%; background: linear-gradient(90deg, #d0b8a9, #a07e74);`
          : `right: 50%; width: ${affinityWidth}%; background: #9a9389;`;

      const trustStyle =
        trust >= 0
          ? `left: 50%; width: ${trustWidth}%; background: linear-gradient(90deg, #cdbd8d, #b79a62);`
          : `right: 50%; width: ${trustWidth}%; background: #9a9389;`;

      fullHtml += `
        <div class="story-ui-mvu-character-card">
          <div class="story-ui-mvu-char-name" title="${escapeHtml(name)}">✦ ${escapeHtml(name)}</div>
          <div class="story-ui-mvu-stat-row">
            <span class="story-ui-mvu-stat-label">关系阶段</span>
            <span class="story-ui-mvu-stat-value">${escapeHtml(stage)}</span>
          </div>
          <div class="story-ui-mvu-stat-row">
            <span class="story-ui-mvu-stat-label">好感度: ${escapeHtml(affinity)}</span>
            <div class="story-ui-mvu-bar-bg">
              <div class="story-ui-mvu-bar-center"></div>
              <div class="story-ui-mvu-bar-fill" style="${affinityStyle}"></div>
            </div>
          </div>
          <div class="story-ui-mvu-stat-row">
            <span class="story-ui-mvu-stat-label">信任度: ${escapeHtml(trust)}</span>
            <div class="story-ui-mvu-bar-bg">
              <div class="story-ui-mvu-bar-center"></div>
              <div class="story-ui-mvu-bar-fill" style="${trustStyle}"></div>
            </div>
          </div>
        </div>
      `;
    });

    if (Object.keys(npcs || {}).length === 0) {
      fullHtml = emptyText('暂无羁绊数据...');
    }

    return `
      <section class="story-ui-mvu-panel">
        <div class="story-ui-mvu-header story-ui-mvu-main-toggle" data-story-ui-mvu-toggle-target="story-ui-mvu-jujutsu-container" data-story-ui-mvu-toggle-icon="story-ui-mvu-rel-icon">
          <span class="story-ui-mvu-mark">${markIcon}</span>
          <div>
            <div class="story-ui-mvu-title">咒术高专 · 羁绊档案</div>
            <div class="story-ui-mvu-subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <span class="story-ui-mvu-toggle-icon collapsed" id="story-ui-mvu-rel-icon">▼</span>
        </div>
        <div class="story-ui-mvu-jujutsu-container" id="story-ui-mvu-jujutsu-container" style="display: none;">${fullHtml}</div>
      </section>
    `;
  }

  function renderStatusShell(messageId) {
    const variables = getMvuDataForMessage(messageId);
    const theme = ui.theme?.getTheme?.() || 'day';
    const worldSubtitle = theme === 'night' ? 'ASTRAL ANCHOR' : 'GLOBAL ANCHOR';
    const sexSubtitle = theme === 'night' ? 'SIGNAL TRACE' : 'INTIMACY SIGNAL';
    const userSubtitle = theme === 'night' ? 'USER DATA TERMINAL' : 'USER STATUS DASHBOARD';
    const relationSubtitle = theme === 'night' ? 'RELATION LOG' : 'RELATION ARCHIVE';

    return `
      <section class="story-ui-root story-ui-mvu story-ui-${escapeHtml(theme)}" data-story-ui-module="${MODULE_ID}">
        <main class="story-ui-mvu-root">
          ${renderWorld(variables, worldSubtitle)}
          ${renderSexStatus(variables, sexSubtitle)}
          ${renderUser(variables, userSubtitle)}
          ${renderRelations(variables, relationSubtitle)}
        </main>
      </section>
    `;
  }

  function renderContentNode(_content, context = {}) {
    const wrapper = dom.createElement('div', {
      className: 'story-ui-mvu-wrapper',
      html: renderStatusShell(context.messageId),
    });

    return wrapper.firstElementChild || null;
  }

  function getExpandedDisplayValue(element) {
    if (!element) return '';
    if (element.classList?.contains('story-ui-mvu-sub-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-item-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-reward-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-pink-container')) return 'flex';
    if (element.classList?.contains('story-ui-mvu-jujutsu-container')) return 'flex';
    if (element.classList?.contains('story-ui-mvu-body')) return 'block';
    return 'block';
  }

  function bindToggleHandlers(root) {
    if (!root || root.dataset.storyUiMvuBound) return;
    root.dataset.storyUiMvuBound = 'true';

    root.addEventListener('click', event => {
      const nextToggle = event.target?.closest?.('[data-story-ui-mvu-toggle-next]');
      if (nextToggle && root.contains(nextToggle)) {
        event.preventDefault();
        event.stopPropagation();
        const content = nextToggle.nextElementSibling;
        if (!content) return;
        const isHidden = getComputedStyle(content).display === 'none';
        content.style.display = isHidden ? getExpandedDisplayValue(content) : 'none';
        nextToggle.querySelector('.story-ui-mvu-toggle-icon')?.classList.toggle('collapsed', !isHidden);
        return;
      }

      const mainToggle = event.target?.closest?.('[data-story-ui-mvu-toggle-target]');
      if (!mainToggle || !root.contains(mainToggle)) return;
      event.preventDefault();
      const targetId = mainToggle.getAttribute('data-story-ui-mvu-toggle-target');
      const iconId = mainToggle.getAttribute('data-story-ui-mvu-toggle-icon');
      if (!targetId) return;
      const target = root.querySelector(`#${CSS.escape(targetId)}`);
      if (!target) return;
      const isHidden = getComputedStyle(target).display === 'none';
      target.style.display = isHidden ? getExpandedDisplayValue(target) : 'none';
      if (iconId) {
        root.querySelector(`#${CSS.escape(iconId)}`)?.classList.toggle('collapsed', !isHidden);
      }
    });
  }

  function remountAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('mvu-status');
    (hosts || []).forEach(host => {
      const currentPanel = host.querySelector?.('.story-ui-mvu');
      if (!currentPanel) return;
      const messageId = Number(host.closest?.('.mes[mesid]')?.getAttribute('mesid'));
      const nextPanel =
        ui.theme?.rerenderWithPreservedDetails?.(currentPanel, () => {
          const fresh = document.createElement('div');
          fresh.innerHTML = renderStatusShell(messageId);
          return fresh.firstElementChild || null;
        }) || null;
      if (nextPanel) {
        bindToggleHandlers(nextPanel);
      }
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);

    if (
      !node.dataset.storyUiMvuInitPending &&
      typeof window.waitGlobalInitialized === 'function' &&
      !window.Mvu?.getMvuData
    ) {
      node.dataset.storyUiMvuInitPending = 'true';
      window
        .waitGlobalInitialized('Mvu')
        .then(() => {
          const panel = node.querySelector?.('.story-ui-mvu');
          if (!panel) return;
          const messageId = Number(node.closest?.('.mes[mesid]')?.getAttribute('mesid'));
          const fresh = document.createElement('div');
          fresh.innerHTML = renderStatusShell(messageId);
          const nextPanel = fresh.firstElementChild;
          if (!nextPanel) return;
          panel.replaceWith(nextPanel);
          ui.theme?.applyThemeToRoot?.(nextPanel);
          bindToggleHandlers(nextPanel);
        })
        .catch(() => {});
    }

    const root = node.querySelector?.('.story-ui-mvu') || node.querySelector?.('.story-ui-root.story-ui-mvu');
    bindToggleHandlers(root);

    if (document.documentElement.dataset.storyUiMvuThemeBound !== 'true') {
      document.documentElement.dataset.storyUiMvuThemeBound = 'true';
      document.addEventListener('story-ui-theme-changed', () => {
        remountAll();
      });
    }

    if (window.Mvu?.events?.VARIABLE_UPDATE_ENDED && window.eventOn && !node.dataset.storyUiMvuRefreshBound) {
      node.dataset.storyUiMvuRefreshBound = 'true';
      window.eventOn(window.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
        const panel = node.querySelector?.('.story-ui-mvu');
        if (!panel) return;
        const messageId = Number(node.closest?.('.mes[mesid]')?.getAttribute('mesid'));
        const fresh = document.createElement('div');
        fresh.innerHTML = renderStatusShell(messageId);
        const nextPanel = fresh.firstElementChild;
        if (!nextPanel) return;
        panel.replaceWith(nextPanel);
        ui.theme?.applyThemeToRoot?.(nextPanel);
        bindToggleHandlers(nextPanel);
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
