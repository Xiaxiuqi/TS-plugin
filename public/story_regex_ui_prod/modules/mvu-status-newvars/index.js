(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;

  const MODULE_ID = 'mvu-status-newvars';
  const MODULE_VERSION = '0.1.1-releasetest-newvars-inline-update';
  const SINGLE_TAG = '<StatusPlaceHolderImpl/>';

  function normalizeDisplayText(value) {
    return String(value ?? '').replace(/轮外熟练/g, '论外熟练');
  }

  function escapeHtml(value) {
    return dom.escapeHtml(normalizeDisplayText(value));
  }

  function getCurrentMvuDataSafe() {
    try {
      if (window.Mvu?.getMvuData) {
        const chatData = window.Mvu.getMvuData({ type: 'chat' });
        if (chatData && typeof chatData === 'object') return chatData;
      }
    } catch {
      // ignore and try other Tavern Helper APIs
    }

    try {
      if (window.getVariables) {
        const chatVariables = window.getVariables({ type: 'chat' });
        if (chatVariables && typeof chatVariables === 'object') return chatVariables;
      }
    } catch {
      // ignore and try legacy iframe helper
    }

    try {
      if (window.getAllVariables) {
        const allVariables = window.getAllVariables();
        if (allVariables && typeof allVariables === 'object') return allVariables;
      }
    } catch {
      // ignore and try latest message snapshot
    }

    try {
      if (window.Mvu?.getMvuData) {
        const latestData = window.Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        if (latestData && typeof latestData === 'object') return latestData;
      }
    } catch {
      // ignore
    }

    return {};
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

  function clampPercent(value, max = 100) {
    const numericValue = Number(value) || 0;
    const numericMax = Number(max) || 0;
    if (numericMax <= 0) return 0;
    return Math.max(0, Math.min(100, (numericValue / numericMax) * 100));
  }

  function emptyText(text = '无') {
    return `<div class="story-ui-mvu-newvars-muted-empty">${escapeHtml(text)}</div>`;
  }

  function normalizeList(value, fallback = '') {
    return (Array.isArray(value) ? value : String(value || fallback).split(/[、,，]/))
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  function safeSetText(root, selector, text) {
    const el = root?.querySelector?.(selector);
    if (!el) return;
    const str = normalizeDisplayText(text);
    if (el.textContent !== str) el.textContent = str;
  }

  function safeSetHtml(root, selector, html) {
    const el = root?.querySelector?.(selector);
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  function safeSetStyle(root, selector, property, value) {
    const el = root?.querySelector?.(selector);
    if (!el) return;
    if (el.style[property] !== value) el.style[property] = value;
  }

  function setDisplay(root, selector, value) {
    const el = root?.querySelector?.(selector);
    if (!el) return;
    if (el.style.display !== value) el.style.display = value;
  }

  function renderClothes(clothes = {}) {
    const slots = [
      ['外套', clothes.外套 || '无'],
      ['内搭', clothes.内搭 || '无'],
      ['下装', clothes.下装 || '无'],
      ['足具', clothes.足具 || '无'],
    ];
    return `<div class="story-ui-mvu-newvars-clothes-line">${slots
      .map(([slot, value]) => {
        const isEmpty = !value || value === '无';
        return `<span class="story-ui-mvu-newvars-cloth-chip ${isEmpty ? 'story-ui-mvu-newvars-cloth-empty' : ''}"><span class="story-ui-mvu-newvars-cloth-slot">${escapeHtml(slot)}</span>${escapeHtml(value)}</span>`;
      })
      .join('')}</div>`;
  }

  function renderIdentityTags(idents) {
    const deduped = [...new Set(normalizeList(idents))];
    if (deduped.length === 0) return emptyText('未知身份');
    return `<div class="story-ui-mvu-newvars-profile-tags">${deduped.map(item => `<span class="story-ui-mvu-newvars-profile-tag">${escapeHtml(item)}</span>`).join('')}</div>`;
  }

  function yesNo(value) {
    return value ? '是' : '否';
  }

  function getCombatGradeClass(value) {
    const text = String(value || 'F级');
    if (text.startsWith('S级') || text.includes('论外')) return 'grade-s';
    if (text.startsWith('AA级') || text.includes('强特级')) return 'grade-aa';
    if (text.startsWith('A级') || text.includes('特级')) return 'grade-a';
    if (text.startsWith('B级') || text.includes('一级')) return 'grade-b';
    if (text.startsWith('C级') || text.includes('准一级')) return 'grade-c';
    if (text.startsWith('D级') || text.includes('二级')) return 'grade-d';
    if (text.startsWith('E级') || text.includes('三级')) return 'grade-e';
    return 'grade-f';
  }

  function setGradeClass(root, selector, gradeClass) {
    const el = root?.querySelector?.(selector);
    if (!el) return;
    const classes = ['grade-s', 'grade-aa', 'grade-a', 'grade-b', 'grade-c', 'grade-d', 'grade-e', 'grade-f'];
    classes.forEach(item => el.classList.remove(item));
    el.classList.add(gradeClass);
  }

  function renderRarityPill(value) {
    const text = normalizeDisplayText(value || '');
    if (!text) return '';
    return `<span class="story-ui-mvu-newvars-rarity" data-rarity="${escapeHtml(text)}">${escapeHtml(text)}</span>`;
  }

  function renderMeltdownText(meltdown = {}) {
    return `重置${meltdown.大脑重置次数 || 0} · 回复×${meltdown.咒力回复惩罚系数 ?? 1} · 强度×${meltdown.术式强度惩罚系数 ?? 1} · 修复×${meltdown.熔断修复时间缩短倍率 ?? 2}`;
  }

  function renderMeltdownState(meltdown = {}) {
    const isBurnout = Boolean(meltdown.熔断中);
    return `<span class="story-ui-mvu-newvars-meltdown-state ${isBurnout ? 'is-burnout' : 'is-stable'}">熔断:${escapeHtml(yesNo(isBurnout))}</span>`;
  }

  function renderWorld(root, allVariables) {
    const sys = getVar(allVariables, 'stat_data.系统', {});
    const time = sys.时间 || {};
    const loc = sys.地点 || {};
    const timeStr = `${time.年 || 2018}年${time.月日 || ''} ${time.时分 || ''} (${time.星期 || ''})`;
    const locStr = `${loc.国家 || ''} ${loc.地域 || ''} ${loc.场所 || ''} ${loc.具体位置 || ''}`.trim() || '未知位置';
    safeSetText(root, '#world-time', timeStr);
    safeSetText(root, '#world-loc', locStr);
  }

  function buildItemList(dataObj, mark, title, renderContentFn, extraClass = '') {
    let html = `<div class="story-ui-mvu-newvars-sub-toggle-header ${extraClass}" data-story-ui-mvu-newvars-toggle-next>${escapeHtml(mark)} ${escapeHtml(title)} <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-newvars-sub-content">`;
    if (!dataObj || dataObj === '待初始化' || (typeof dataObj === 'object' && Object.keys(dataObj).length === 0)) {
      html += emptyText();
    } else {
      html += '<div class="story-ui-mvu-newvars-mini-grid">';
      Object.entries(dataObj).forEach(([k, v]) => {
        html += `<article class="story-ui-mvu-newvars-mini-card"><div class="story-ui-mvu-newvars-mini-title">${escapeHtml(k)}</div><div class="story-ui-mvu-newvars-mini-body">${renderContentFn(v)}</div></article>`;
      });
      html += '</div>';
    }
    html += `</div>`;
    return html;
  }

  function renderUser(root, allVariables) {
    const user = getVar(allVariables, 'stat_data.user', {});
    const tasksModule = getVar(allVariables, 'stat_data.任务系统', {});

    safeSetText(root, '#u-lv', user.等级 || 1);
    safeSetText(root, '#u-rank', user.战力评级 || 'F级 (四级)');
    const gradeClass = getCombatGradeClass(user.战力评级 || user.战斗面板?.战力等级);
    setGradeClass(root, '.story-ui-mvu-newvars-rank-card', gradeClass);

    const expValue = Number(user.EXP || 0);
    safeSetText(root, '#u-exp', `${expValue} / 100`);
    safeSetStyle(root, '#u-exp-bar', 'width', `${clampPercent(expValue, 100)}%`);

    const energy = user.咒力 && user.咒力 !== '待初始化' ? user.咒力 : {};
    const spValue = Number(energy.当前值 ?? energy.总量 ?? 0);
    const spMax = Number(energy.有效总量 || energy.总量 || 0);
    safeSetText(root, '#u-energy-label', '咒力 / 操纵精度');
    safeSetText(
      root,
      '#u-sp',
      `${spValue} / ${spMax} · 精度${energy.咒力操纵精度 || 1} · 回复${energy.每轮回复量 || 0}`,
    );
    safeSetStyle(root, '#u-sp-bar', 'width', `${clampPercent(spValue, spMax)}%`);
    safeSetText(root, '#u-kp', user.KP || 0);
    safeSetText(root, '#u-health', user.身体状况 || '未知');

    const bodyBase = user.基础肉体 || {};
    safeSetText(
      root,
      '#u-taijutsu',
      `肉体${bodyBase.基础肉体值 || 0} / 武艺${bodyBase.武艺值 || 0} · ${bodyBase.武艺阶段 || '未入门'}`,
    );
    safeSetText(root, '#u-scar', user.永久损伤或疤痕 || '无');
    safeSetText(root, '#u-martial-ratio', `输出${bodyBase.武艺输出比例 ?? 0} / 防御×${bodyBase.武艺防御系数 ?? 1}`);

    const battle = user.战斗面板 || {};
    const hpValue = Number(battle.当前血量 || 0);
    const hpMax = Number(battle.最大生命值 || 0);
    safeSetText(root, '#u-hp', `${hpValue} / ${hpMax}`);
    safeSetStyle(root, '#u-hp-bar', 'width', `${clampPercent(hpValue, hpMax)}%`);
    safeSetText(root, '#u-def', battle.防御 || 0);
    safeSetText(root, '#u-bpa', battle.总肉体值_BPA || 0);
    safeSetText(root, '#u-bpb', battle.术式强度_BPB || 0);
    safeSetText(root, '#u-total-bp', battle.总BP || 0);
    safeSetText(root, '#u-combat-grade', battle.战力等级 || 'F级·四级');
    setGradeClass(root, '.story-ui-mvu-newvars-rank-value', getCombatGradeClass(battle.战力等级 || user.战力评级));
    setGradeClass(root, '.story-ui-mvu-newvars-rank-overview', getCombatGradeClass(battle.战力等级 || user.战力评级));
    safeSetText(root, '#u-jatk', battle.咒术攻击 || 0);
    safeSetText(root, '#u-patk', battle.物理攻击 || 0);
    safeSetText(root, '#u-regen', energy.每轮回复量 || 0);
    const reverse = user.反转术式 || {};
    safeSetText(root, '#u-heal', reverse.常规回复量 || 0);
    safeSetText(root, '#u-ce-total', `原始${energy.总量 ?? 0} / 有效${energy.有效总量 ?? 0}`);
    safeSetText(root, '#u-ce-cost', `×${energy.消耗倍率 ?? 1}`);
    safeSetText(root, '#u-tool-bp', battle.咒具值 || 0);
    safeSetText(root, '#u-damage-bonus', `×${battle.伤害补正 ?? 1}`);

    const meltdown = user.术式熔断 || {};
    safeSetText(root, '#u-meltdown-bar', renderMeltdownText(meltdown));
    safeSetHtml(root, '#u-meltdown-state', renderMeltdownState(meltdown));

    safeSetHtml(root, '#u-clothes', renderClothes(user.当前服装 || {}));
    safeSetHtml(root, '#u-identity', renderIdentityTags(user.公开身份 || []));

    const fw = user.名望 || {};
    const pw = fw.正道 || {};
    const ew = fw.邪道 || {};
    const pTitle = Array.isArray(pw.称号) ? pw.称号.join('、') : pw.称号 || '寂寂无名的路人';
    const eTitle = Array.isArray(ew.称号) ? ew.称号.join('、') : ew.称号 || '无人知晓的普通人';
    safeSetText(root, '#u-fame-pos', `${pw.数值 || 0}，${pTitle}`);
    safeSetText(root, '#u-fame-neg', `${ew.数值 || 0}，${eTitle}`);
    safeSetText(root, '#u-money', user.持有金钱 || 0);
    safeSetText(root, '#u-home', user.居住地 || '未知');

    const vows = user.束缚 || {};
    let vowHtml = `<div class="story-ui-mvu-newvars-sub-toggle-header" data-story-ui-mvu-newvars-toggle-next>✦ 束缚 <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-newvars-sub-content">`;
    if (!vows || vows === '待初始化' || Object.keys(vows).length === 0) {
      vowHtml += emptyText();
    } else {
      vowHtml += '<div class="story-ui-mvu-newvars-mini-grid">';
      Object.entries(vows).forEach(([k, v]) => {
        const isPermanent = !v?.恢复条件 || v.恢复条件 === '无';
        const typeLabel = isPermanent ? '永久' : '临时';
        let itemContent = `<p><span class="story-ui-mvu-newvars-c-lbl">类型:</span> ${escapeHtml(typeLabel)}</p><p><span class="story-ui-mvu-newvars-c-lbl">代价:</span> ${escapeHtml(v?.代价 || '')}</p>`;
        if (!isPermanent) {
          itemContent += `<p><span class="story-ui-mvu-newvars-c-lbl">恢复条件:</span> ${escapeHtml(v?.恢复条件 || '')}</p>`;
        }
        vowHtml += `<article class="story-ui-mvu-newvars-mini-card"><div class="story-ui-mvu-newvars-mini-title">${escapeHtml(k)}</div><div class="story-ui-mvu-newvars-mini-body">${itemContent}</div></article>`;
      });
      vowHtml += '</div>';
    }
    vowHtml += `</div>`;
    safeSetHtml(root, '#list-vows', vowHtml);

    safeSetHtml(
      root,
      '#list-skills',
      buildItemList(user.战技, '✦', '战技', v => {
        return `<p><span class="story-ui-mvu-newvars-c-lbl">熟练度:</span> ${escapeHtml(v?.熟练度 || 0)} <span class="story-ui-mvu-newvars-sub-lbl">⇒</span> ${renderRarityPill(v?.阶段 || '入门')}</p><p><span class="story-ui-mvu-newvars-c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>`;
      }),
    );

    const innateCt = user.生得术式 || {};
    const extendedCts = user.扩展术式 || {};
    let allCtsItemsHtml = '';

    if (innateCt && innateCt !== '待初始化' && innateCt.名称 && innateCt.名称 !== '' && innateCt.名称 !== '无') {
      if (innateCt.名称 === '待觉醒') {
        allCtsItemsHtml += `<article class="story-ui-mvu-newvars-mini-card story-ui-mvu-newvars-innate-ct-header"><div class="story-ui-mvu-newvars-mini-title">[生得术式] 待觉醒</div><div class="story-ui-mvu-newvars-mini-body">${emptyText('待觉醒')}</div></article>`;
      } else {
        allCtsItemsHtml += `<article class="story-ui-mvu-newvars-mini-card story-ui-mvu-newvars-innate-ct-header"><div class="story-ui-mvu-newvars-mini-title">[生得术式] ${escapeHtml(innateCt.名称)}</div><div class="story-ui-mvu-newvars-mini-body">
        <p><span class="story-ui-mvu-newvars-c-lbl">属性:</span> ${escapeHtml(innateCt.属性 || '无')}</p>
        <p><span class="story-ui-mvu-newvars-c-lbl">潜力等级:</span> ${renderRarityPill(innateCt.潜力等级 || '未定型术式')}</p>
        <p><span class="story-ui-mvu-newvars-c-lbl">潜力值:</span> ${escapeHtml(innateCt.潜力值 || 0)}</p>
        <p><span class="story-ui-mvu-newvars-c-lbl">精通等级:</span> ${escapeHtml(innateCt.精通等级 || 0)} <span class="story-ui-mvu-newvars-sub-lbl">⇒</span> ${renderRarityPill(innateCt.阶段 || '未入门')}</p>
        <p><span class="story-ui-mvu-newvars-c-lbl">术式强度:</span> 基础${escapeHtml(innateCt.基础强度 || 0)} / 当前${escapeHtml(innateCt.当前强度 || 0)}</p>
        <p><span class="story-ui-mvu-newvars-c-lbl">描述:</span> ${escapeHtml(innateCt.描述 || '')}</p>
      </div></article>`;
      }
    }

    if (extendedCts && extendedCts !== '待初始化' && Object.keys(extendedCts).length > 0) {
      Object.entries(extendedCts).forEach(([k, v]) => {
        allCtsItemsHtml += `<article class="story-ui-mvu-newvars-mini-card"><div class="story-ui-mvu-newvars-mini-title">${escapeHtml(k)}</div><div class="story-ui-mvu-newvars-mini-body"><p><span class="story-ui-mvu-newvars-c-lbl">熟练度:</span> ${escapeHtml(v?.熟练度 || 0)} <span class="story-ui-mvu-newvars-sub-lbl">⇒</span> ${renderRarityPill(v?.阶段 || '入门')}</p><p><span class="story-ui-mvu-newvars-c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p></div></article>`;
      });
    }

    let finalCtHtml = `<div class="story-ui-mvu-newvars-sub-toggle-header" data-story-ui-mvu-newvars-toggle-next>✦ 术式 <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-newvars-sub-content">`;
    finalCtHtml +=
      allCtsItemsHtml !== '' ? `<div class="story-ui-mvu-newvars-mini-grid">${allCtsItemsHtml}</div>` : emptyText();
    finalCtHtml += `</div>`;
    safeSetHtml(root, '#list-all-cts', finalCtHtml);

    const reverseHtml = `<div class="story-ui-mvu-newvars-sub-toggle-header" data-story-ui-mvu-newvars-toggle-next>✧ 反转术式 <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-newvars-sub-content"><div class="story-ui-mvu-newvars-mini-grid"><article class="story-ui-mvu-newvars-mini-card story-ui-mvu-newvars-reverse-card"><div class="story-ui-mvu-newvars-mini-title">治疗 / 回复参数</div><div class="story-ui-mvu-newvars-mini-body">
      <p><span class="story-ui-mvu-newvars-c-lbl">掌握治疗:</span> ${escapeHtml(yesNo(reverse.掌握治疗))}</p>
      <p><span class="story-ui-mvu-newvars-c-lbl">熟练等级:</span> ${escapeHtml(reverse.熟练等级 || '未掌握')}</p>
      <p><span class="story-ui-mvu-newvars-c-lbl">熟练系数:</span> ${escapeHtml(reverse.熟练系数 ?? 0)}</p>
      <p><span class="story-ui-mvu-newvars-c-lbl">可外放:</span> ${escapeHtml(yesNo(reverse.可外放))}</p>
      <p><span class="story-ui-mvu-newvars-c-lbl">常规回复量:</span> ${escapeHtml(reverse.常规回复量 || 0)}</p>
      <p><span class="story-ui-mvu-newvars-c-lbl">常规治疗消耗:</span> ${escapeHtml(reverse.常规治疗消耗 || 0)}</p>
      <p><span class="story-ui-mvu-newvars-c-lbl">熔断修复消耗:</span> ${escapeHtml(reverse.熔断修复消耗 || 0)}</p>
    </div></article></div></div>`;
    safeSetHtml(root, '#list-reverse', reverseHtml);

    safeSetHtml(
      root,
      '#list-special',
      buildItemList(user.特殊体质, '✧', '特殊体质', v => `<p>${escapeHtml(v)}</p>`),
    );
    safeSetHtml(
      root,
      '#list-spirits',
      buildItemList(user.咒灵操术, '✧', '咒灵操术', v => `<p>${escapeHtml(v)}</p>`),
    );
    safeSetHtml(
      root,
      '#list-inventory',
      buildItemList(
        user.行囊,
        '✦',
        '行囊',
        v => {
          return `<p><span class="story-ui-mvu-newvars-c-lbl">数量:</span> ${escapeHtml(v?.数量 || 0)}</p><p><span class="story-ui-mvu-newvars-c-lbl">描述:</span> ${escapeHtml(v?.描述 || '')}</p>`;
        },
        'story-ui-mvu-newvars-inventory-header',
      ),
    );

    const tasks = tasksModule || {};
    let taskHtml = `<div class="story-ui-mvu-newvars-sub-toggle-header story-ui-mvu-newvars-task-header" data-story-ui-mvu-newvars-toggle-next>✦ 当前任务 <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span></div><div class="story-ui-mvu-newvars-sub-content">`;
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
            itemsHtml += `<p><span class="story-ui-mvu-newvars-c-lbl">- ${escapeHtml(itemName)}:</span> ${escapeHtml(itemNum)}</p>`;
          });
        }

        const rewardSectionHtml = `
          <div class="story-ui-mvu-newvars-reward-section">
            <div class="story-ui-mvu-newvars-reward-toggle-header" data-story-ui-mvu-newvars-toggle-next>
              <span>报酬 金钱:${escapeHtml(reward.金钱 || 0)} | 名望:+${escapeHtml(reward.名望提升值 || 0)}</span>
              <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span>
            </div>
            <div class="story-ui-mvu-newvars-reward-content">
              <p class="story-ui-mvu-newvars-c-lbl">[包含物品]</p>
              ${itemsHtml}
            </div>
          </div>
        `;

        taskHtml += `<div class="story-ui-mvu-newvars-item-toggle-header" data-story-ui-mvu-newvars-toggle-next>${escapeHtml(v?.任务名 || k)} <span class="story-ui-mvu-newvars-toggle-icon collapsed">▼</span></div>`;
        taskHtml += `<div class="story-ui-mvu-newvars-item-content"><p><span class="story-ui-mvu-newvars-c-lbl">等级:</span> ${escapeHtml(v?.任务等级 || '')}</p><p><span class="story-ui-mvu-newvars-c-lbl">类型:</span> ${escapeHtml(v?.类型 || '')}</p><p><span class="story-ui-mvu-newvars-c-lbl">委托方:</span> ${escapeHtml(v?.委托人或势力 || '')}</p><p><span class="story-ui-mvu-newvars-c-lbl">描述:</span> ${escapeHtml(v?.任务描述 || '')}</p>${rewardSectionHtml}<p><span class="story-ui-mvu-newvars-c-lbl">完成条件:</span> ${escapeHtml(v?.完成条件 || '')}</p><p><span class="story-ui-mvu-newvars-c-lbl">失败条件:</span> ${escapeHtml(v?.失败条件 || '')}</p></div>`;
      });
    }
    taskHtml += `</div>`;
    safeSetHtml(root, '#list-tasks', taskHtml);
  }

  function populateCharacterData(root, allVariables) {
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
        <div class="story-ui-mvu-newvars-character-card">
          <div class="story-ui-mvu-newvars-char-name" title="${escapeHtml(name)}">✦ ${escapeHtml(name)}</div>
          <div class="story-ui-mvu-newvars-stat-row">
            <span class="story-ui-mvu-newvars-stat-label">关系阶段</span>
            <span class="story-ui-mvu-newvars-stat-value">${escapeHtml(stage)}</span>
          </div>
          <div class="story-ui-mvu-newvars-stat-row">
            <span class="story-ui-mvu-newvars-stat-label">好感度: ${escapeHtml(affinity)}</span>
            <div class="story-ui-mvu-newvars-bar-bg">
              <div class="story-ui-mvu-newvars-bar-center"></div>
              <div class="story-ui-mvu-newvars-bar-fill" style="${affinityStyle}"></div>
            </div>
          </div>
          <div class="story-ui-mvu-newvars-stat-row">
            <span class="story-ui-mvu-newvars-stat-label">信任度: ${escapeHtml(trust)}</span>
            <div class="story-ui-mvu-newvars-bar-bg">
              <div class="story-ui-mvu-newvars-bar-center"></div>
              <div class="story-ui-mvu-newvars-bar-fill" style="${trustStyle}"></div>
            </div>
          </div>
        </div>
      `;
    });

    if (Object.keys(npcs || {}).length === 0) {
      fullHtml = emptyText('暂无羁绊数据...');
    }

    safeSetHtml(root, '#jujutsu-container', fullHtml);
  }

  function renderSexStatus(root, allVariables) {
    const sys = getVar(allVariables, 'stat_data.系统', {});
    const sex = sys.性爱状态 || {};
    const npcs = getVar(allVariables, 'stat_data.人际档案', {});

    if (sex.进行中 === true) {
      setDisplay(root, '#sex-wrapper', 'block');
      let fullHtml = '';
      const participants = Array.isArray(sex.参与者) ? sex.参与者 : [];

      if (participants.length === 0) {
        fullHtml = '<div class="story-ui-mvu-newvars-muted-empty">正在感受爱意...</div>';
      } else {
        participants.forEach(name => {
          const npcData = npcs[name] || {};
          const lust = Number(npcData.欲望值 || 0);
          fullHtml += `
            <div class="story-ui-mvu-newvars-sex-row">
              <span class="story-ui-mvu-newvars-sex-char-name">${escapeHtml(name)}</span>
              <div class="story-ui-mvu-newvars-lust-bar-bg">
                <div class="story-ui-mvu-newvars-lust-bar-fill" style="width:${Math.min(lust, 100)}%"></div>
              </div>
              <span class="story-ui-mvu-newvars-lust-value-text">${escapeHtml(lust)} / 100</span>
            </div>
          `;
        });
      }
      safeSetHtml(root, '#sex-container', fullHtml);
    } else {
      setDisplay(root, '#sex-wrapper', 'none');
      safeSetHtml(root, '#sex-container', '');
    }
  }

  function populateData(root) {
    if (!root) return;
    const allVariables = getCurrentMvuDataSafe();
    renderWorld(root, allVariables);
    renderUser(root, allVariables);
    populateCharacterData(root, allVariables);
    renderSexStatus(root, allVariables);
  }

  function renderStatusShell() {
    const theme = ui.theme?.getTheme?.() || 'day';
    const worldSubtitle = theme === 'night' ? 'ASTRAL ANCHOR' : 'GLOBAL ANCHOR';
    const sexSubtitle = theme === 'night' ? 'SIGNAL TRACE' : 'INTIMACY SIGNAL';
    const userSubtitle = theme === 'night' ? 'BP COMBAT TERMINAL' : 'BP STATUS DASHBOARD';
    const relationSubtitle = theme === 'night' ? 'RELATION LOG' : 'RELATION ARCHIVE';

    return `
      <section class="story-ui-root story-ui-mvu-newvars ${theme === 'night' ? 'theme-night' : 'theme-day'}" data-story-ui-module="${MODULE_ID}">
        <main class="story-ui-mvu-newvars-root">
          <section class="story-ui-mvu-newvars-panel">
            <div class="story-ui-mvu-newvars-header">
              <span class="story-ui-mvu-newvars-mark" data-story-ui-theme-toggle title="切换日夜主题">✦</span>
              <div>
                <div class="story-ui-mvu-newvars-title">世界状态</div>
                <div class="story-ui-mvu-newvars-subtitle">${escapeHtml(worldSubtitle)}</div>
              </div>
              <span class="story-ui-mvu-newvars-toggle-icon">✧</span>
            </div>
            <div class="story-ui-mvu-newvars-body">
              <div class="story-ui-mvu-newvars-world-grid">
                <div class="story-ui-mvu-newvars-world-card">
                  <span class="story-ui-mvu-newvars-label">当前时间</span>
                  <span class="story-ui-mvu-newvars-value" id="world-time"></span>
                </div>
                <div class="story-ui-mvu-newvars-world-card">
                  <span class="story-ui-mvu-newvars-label">当前位置</span>
                  <span class="story-ui-mvu-newvars-value" id="world-loc"></span>
                </div>
              </div>
            </div>
          </section>

          <section class="story-ui-mvu-newvars-panel story-ui-mvu-newvars-pink" id="sex-wrapper" style="display:none;">
            <div class="story-ui-mvu-newvars-header story-ui-mvu-newvars-main-toggle" data-story-ui-mvu-newvars-toggle-target="sex-container" data-story-ui-mvu-newvars-toggle-icon="sex-icon">
              <span class="story-ui-mvu-newvars-mark">✧</span>
              <div>
                <div class="story-ui-mvu-newvars-title">亲密状态</div>
                <div class="story-ui-mvu-newvars-subtitle">${escapeHtml(sexSubtitle)}</div>
              </div>
              <span class="story-ui-mvu-newvars-toggle-icon" id="sex-icon">▼</span>
            </div>
            <div class="story-ui-mvu-newvars-pink-container" id="sex-container"></div>
          </section>

          <section class="story-ui-mvu-newvars-panel">
            <div class="story-ui-mvu-newvars-header story-ui-mvu-newvars-main-toggle" data-story-ui-mvu-newvars-toggle-target="user-container" data-story-ui-mvu-newvars-toggle-icon="user-icon">
              <span class="story-ui-mvu-newvars-mark">✦</span>
              <div>
                <div class="story-ui-mvu-newvars-title">个人状态档案</div>
                <div class="story-ui-mvu-newvars-subtitle">${escapeHtml(userSubtitle)}</div>
              </div>
              <span class="story-ui-mvu-newvars-toggle-icon" id="user-icon">▼</span>
            </div>
            <div class="story-ui-mvu-newvars-body" id="user-container">
              <div class="story-ui-mvu-newvars-hero">
                <div class="story-ui-mvu-newvars-profile-card">
                  <div class="story-ui-mvu-newvars-profile-main">
                    <div class="story-ui-mvu-newvars-rank-card">
                      <div class="story-ui-mvu-newvars-rank-head">
                        <div class="story-ui-mvu-newvars-rank-summary">
                          <div class="story-ui-mvu-newvars-rank-title">等级 / 战力评级</div>
                          <div class="story-ui-mvu-newvars-rank-value"><span id="u-lv"></span> · <span id="u-rank"></span></div>
                          <div class="story-ui-mvu-newvars-rank-overview">
                            <span>总BP<strong id="u-total-bp"></strong></span>
                            <span>战力等级<strong id="u-combat-grade"></strong></span>
                          </div>
                        </div>
                        <div class="story-ui-mvu-newvars-kp-token" title="KP可通过结下束缚或升级获得，可用于提升咒力总量、基础肉体、武艺值、战技/术式精通等级等。">KP <span class="story-ui-mvu-newvars-kp-tooltip">?</span><strong id="u-kp"></strong></div>
                      </div>
                      <div class="story-ui-mvu-newvars-rank-meters">
                        <div class="story-ui-mvu-newvars-rank-meter exp">
                          <div class="story-ui-mvu-newvars-rank-meter-head"><span>EXP 经验</span><span id="u-exp"></span></div>
                          <div class="story-ui-mvu-newvars-rank-meter-track"><span class="story-ui-mvu-newvars-rank-meter-fill" id="u-exp-bar"></span></div>
                        </div>
                        <div class="story-ui-mvu-newvars-rank-meter hp">
                          <div class="story-ui-mvu-newvars-rank-meter-head"><span>HP 生命值</span><span id="u-hp"></span></div>
                          <div class="story-ui-mvu-newvars-rank-meter-track"><span class="story-ui-mvu-newvars-rank-meter-fill" id="u-hp-bar"></span></div>
                        </div>
                        <div class="story-ui-mvu-newvars-rank-meter sp">
                          <div class="story-ui-mvu-newvars-rank-meter-head"><span id="u-energy-label">咒力 / 操纵精度</span><span id="u-sp"></span></div>
                          <div class="story-ui-mvu-newvars-rank-meter-track"><span class="story-ui-mvu-newvars-rank-meter-fill" id="u-sp-bar"></span></div>
                        </div>
                      </div>
                    </div>
                    <div class="story-ui-mvu-newvars-attr-panel">
                      <div class="story-ui-mvu-newvars-attr-section">
                        <div class="story-ui-mvu-newvars-attr-toggle" data-story-ui-mvu-newvars-toggle-next>基础性能 <span class="story-ui-mvu-newvars-toggle-icon">▼</span></div>
                        <div class="story-ui-mvu-newvars-attr-content">
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">肉体 / 武艺</span><span class="story-ui-mvu-newvars-battle-value" id="u-taijutsu"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">武艺系数</span><span class="story-ui-mvu-newvars-battle-value" id="u-martial-ratio"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">防御 DEF</span><span class="story-ui-mvu-newvars-battle-value" id="u-def"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">肉体 BPA</span><span class="story-ui-mvu-newvars-battle-value" id="u-bpa"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">术式 BPB</span><span class="story-ui-mvu-newvars-battle-value" id="u-bpb"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">咒具值</span><span class="story-ui-mvu-newvars-battle-value" id="u-tool-bp"></span></div>
                        </div>
                      </div>
                      <div class="story-ui-mvu-newvars-attr-section">
                        <div class="story-ui-mvu-newvars-attr-toggle" data-story-ui-mvu-newvars-toggle-next>输出 / 回复 <span class="story-ui-mvu-newvars-toggle-icon">▼</span></div>
                        <div class="story-ui-mvu-newvars-attr-content">
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">咒术 ATK</span><span class="story-ui-mvu-newvars-battle-value" id="u-jatk"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">物理 ATK</span><span class="story-ui-mvu-newvars-battle-value" id="u-patk"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">咒力回复</span><span class="story-ui-mvu-newvars-battle-value" id="u-regen"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">反转回复</span><span class="story-ui-mvu-newvars-battle-value" id="u-heal"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">咒力总量</span><span class="story-ui-mvu-newvars-battle-value" id="u-ce-total"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">消耗倍率</span><span class="story-ui-mvu-newvars-battle-value" id="u-ce-cost"></span></div>
                          <div class="story-ui-mvu-newvars-attr-row"><span class="story-ui-mvu-newvars-battle-name">伤害补正</span><span class="story-ui-mvu-newvars-battle-value" id="u-damage-bonus"></span></div>
                        </div>
                      </div>
                    </div>
                    <div class="story-ui-mvu-newvars-stat-grid">
                      <div class="story-ui-mvu-newvars-meltdown-bar"><span class="story-ui-mvu-newvars-stat-name">术式熔断</span><span class="story-ui-mvu-newvars-meltdown-detail"><span id="u-meltdown-state"></span><span class="story-ui-mvu-newvars-stat-value" id="u-meltdown-bar"></span></span></div>
                      <div class="story-ui-mvu-newvars-stat-card sage"><span class="story-ui-mvu-newvars-stat-name">身体状况</span><span class="story-ui-mvu-newvars-stat-value" id="u-health"></span></div>
                      <div class="story-ui-mvu-newvars-stat-card rose"><span class="story-ui-mvu-newvars-stat-name">损伤 / 疤痕</span><span class="story-ui-mvu-newvars-stat-value" id="u-scar"></span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="story-ui-mvu-newvars-section-grid">
                <div id="list-vows"></div>
                <div id="list-skills"></div>
                <div id="list-all-cts"></div>
                <div id="list-reverse"></div>
                <div id="list-special"></div>
                <div id="list-spirits"></div>
              </div>

              <div class="story-ui-mvu-newvars-info-list">
                <div class="story-ui-mvu-newvars-stat-line"><span class="lbl">当前服装</span><span class="val" id="u-clothes"></span></div>
                <div class="story-ui-mvu-newvars-stat-line"><span class="lbl">身份</span><span class="val" id="u-identity"></span></div>
                <div class="story-ui-mvu-newvars-stat-line"><span class="lbl">正道名望</span><span class="val" id="u-fame-pos"></span></div>
                <div class="story-ui-mvu-newvars-stat-line"><span class="lbl">邪道名望</span><span class="val" id="u-fame-neg"></span></div>
                <div class="story-ui-mvu-newvars-stat-line"><span class="lbl">金钱</span><span class="val" id="u-money"></span></div>
                <div class="story-ui-mvu-newvars-stat-line"><span class="lbl">居住</span><span class="val" id="u-home"></span></div>
              </div>

              <div class="story-ui-mvu-newvars-section-grid">
                <div id="list-inventory"></div>
                <div id="list-tasks"></div>
              </div>
            </div>
          </section>

          <section class="story-ui-mvu-newvars-panel">
            <div class="story-ui-mvu-newvars-header story-ui-mvu-newvars-main-toggle" data-story-ui-mvu-newvars-toggle-target="jujutsu-container" data-story-ui-mvu-newvars-toggle-icon="toggle-icon">
              <span class="story-ui-mvu-newvars-mark">✦</span>
              <div>
                <div class="story-ui-mvu-newvars-title">咒术高专 · 羁绊档案</div>
                <div class="story-ui-mvu-newvars-subtitle">${escapeHtml(relationSubtitle)}</div>
              </div>
              <span class="story-ui-mvu-newvars-toggle-icon collapsed" id="toggle-icon">▼</span>
            </div>
            <div class="story-ui-mvu-newvars-jujutsu-container" id="jujutsu-container" style="display:none;"></div>
          </section>
        </main>
      </section>
    `;
  }

  function renderContentNode() {
    const wrapper = dom.createElement('div', {
      className: 'story-ui-mvu-newvars-wrapper',
      html: renderStatusShell(),
    });
    const root = wrapper.firstElementChild || null;
    if (root) {
      populateData(root);
    }
    return root;
  }

  function getExpandedDisplayValue(element) {
    if (!element) return 'block';
    if (element.classList?.contains('story-ui-mvu-newvars-sub-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-newvars-item-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-newvars-reward-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-newvars-attr-content')) return 'block';
    if (element.classList?.contains('story-ui-mvu-newvars-pink-container')) return 'flex';
    if (element.classList?.contains('story-ui-mvu-newvars-jujutsu-container')) return 'flex';
    if (element.classList?.contains('story-ui-mvu-newvars-body')) return 'block';
    return 'block';
  }

  function bindToggleHandlers(root) {
    if (!root || root.dataset.storyUiMvuNewvarsBound) return;
    root.dataset.storyUiMvuNewvarsBound = 'true';

    root.addEventListener('click', event => {
      const nextToggle = event.target?.closest?.('[data-story-ui-mvu-newvars-toggle-next]');
      if (nextToggle && root.contains(nextToggle)) {
        event.preventDefault();
        event.stopPropagation();
        const content = nextToggle.nextElementSibling;
        if (!content) return;
        const isHidden = getComputedStyle(content).display === 'none';
        content.style.display = isHidden ? getExpandedDisplayValue(content) : 'none';
        nextToggle.querySelector('.story-ui-mvu-newvars-toggle-icon')?.classList.toggle('collapsed', !isHidden);
        return;
      }

      const mainToggle = event.target?.closest?.('[data-story-ui-mvu-newvars-toggle-target]');
      if (!mainToggle || !root.contains(mainToggle)) return;
      event.preventDefault();
      const targetId = mainToggle.getAttribute('data-story-ui-mvu-newvars-toggle-target');
      const iconId = mainToggle.getAttribute('data-story-ui-mvu-newvars-toggle-icon');
      if (!targetId) return;
      const target = root.querySelector(`#${CSS.escape(targetId)}`);
      if (!target) return;
      const isHidden = getComputedStyle(target).display === 'none';
      target.style.display = isHidden ? getExpandedDisplayValue(target) : 'none';
      if (iconId) root.querySelector(`#${CSS.escape(iconId)}`)?.classList.toggle('collapsed', !isHidden);
    });
  }

  function remount(node) {
    const panel = node.querySelector?.('.story-ui-mvu-newvars');
    if (!panel) return;
    const nextPanel =
      ui.theme?.rerenderWithPreservedDetails?.(panel, () => {
        const fresh = document.createElement('div');
        fresh.innerHTML = renderStatusShell();
        const created = fresh.firstElementChild || null;
        if (created) populateData(created);
        return created;
      }) || null;
    if (nextPanel) {
      bindToggleHandlers(nextPanel);
      populateData(nextPanel);
      return;
    }
    const fresh = document.createElement('div');
    fresh.innerHTML = renderStatusShell();
    const fallbackPanel = fresh.firstElementChild;
    if (!fallbackPanel) return;
    panel.replaceWith(fallbackPanel);
    ui.theme?.applyThemeToRoot?.(fallbackPanel);
    bindToggleHandlers(fallbackPanel);
    populateData(fallbackPanel);
  }

  function remountAll() {
    const hosts = ui.theme?.getModuleHostsForThemeRerender?.('mvu-status-newvars');
    (hosts || []).forEach(host => {
      remount(host);
    });
  }

  function mount(node) {
    ui.theme?.applyTheme?.(node);
    const root =
      node.querySelector?.('.story-ui-mvu-newvars') || node.querySelector?.('.story-ui-root.story-ui-mvu-newvars');
    bindToggleHandlers(root);
    populateData(root);

    if (document.documentElement.dataset.storyUiMvuNewvarsThemeBound !== 'true') {
      document.documentElement.dataset.storyUiMvuNewvarsThemeBound = 'true';
      document.addEventListener('story-ui-theme-changed', () => remountAll());
    }

    if (window.Mvu?.events?.VARIABLE_UPDATE_ENDED && window.eventOn && !node.dataset.storyUiMvuNewvarsRefreshBound) {
      node.dataset.storyUiMvuNewvarsRefreshBound = 'true';
      window.eventOn(window.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
        const currentRoot =
          node.querySelector?.('.story-ui-mvu-newvars') || node.querySelector?.('.story-ui-root.story-ui-mvu-newvars');
        populateData(currentRoot);
      });
    }
  }

  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 79,
    enabled: false,
    singleTag: SINGLE_TAG,
    renderContent: renderContentNode,
    mount,
  });
})();
