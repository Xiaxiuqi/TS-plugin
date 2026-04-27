/**
 * 世界信息面板（完整迁移版本）
 *
 * 完整迁移自原 src/ci_island_test/index.ts:4457-4812 + 10792-10872
 *
 * 包含：
 * - renderWorldInfoPanel: 主入口（滚动信息条 + 主体内容区 + 事件卡片区）
 * - renderNewsScroller: 滚动新闻条（横向跑马灯效果）
 * - renderLatestNews: 最新报道（含历史按钮、聊天气泡、对话颜色分配）
 * - renderForcesAccordion: 势力信息手风琴折叠面板
 * - renderEventsCards: 事件卡片网格
 * - showNewsHistoryModal: 往期报道历史弹窗
 *
 * 通过 setWorldInfoPanelCallbacks 注入：
 * - showWorldInfoForceEdit (待 Task E 提供)
 * - showWorldInfoEventEdit  (待 Task E 提供)
 * - showHistoryItemEditOverlay (待 Task E 提供)
 */
import { ICONS } from '../../core/icons';
import { state } from '../../core/state';
import { getProtagonistName } from '../../core/utils';
import { getApi } from '../../data/api';
import { extractWorldInfoData } from '../../data/worldinfo-extractor';
import { showToast } from '../../ui/toast';

declare const $: any;

export interface WorldInfoPanelCallbacks {
  /** 历史弹窗（默认由本模块自身实现，回调可覆盖） */
  showNewsHistoryModal?: () => void;
  /** 势力编辑弹窗（待 Task E 提供） */
  showWorldInfoForceEdit?: (forceIdx: number) => void;
  /** 事件编辑弹窗（待 Task E 提供） */
  showWorldInfoEventEdit?: (eventIdx: number) => void;
  /** 往期报道项编辑弹窗（待 Task E 提供） */
  showHistoryItemEditOverlay?: (targetIndex: any, targetTime: any) => void;
}

let callbacks: WorldInfoPanelCallbacks = {};

export function setWorldInfoPanelCallbacks(cb: WorldInfoPanelCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

/**
 * 渲染世界信息面板（主入口）
 */
export function renderWorldInfoPanel($container: any): void {
  $container.empty();

  // 获取数据源
  const api = getApi();
  let worldInfo = state.cachedData.worldInfo;

  // 如果缓存中没有数据，尝试重新提取
  if (!worldInfo || (!worldInfo.tasks.length && !worldInfo.forces.length && !worldInfo.summary)) {
    if (api && api.exportTableAsJson) {
      const rawData = api.exportTableAsJson();
      worldInfo = extractWorldInfoData(rawData);
      state.cachedData.worldInfo = worldInfo;
    }
  }

  // 检查是否有数据
  const hasData =
    worldInfo && (worldInfo.tasks.length > 0 || worldInfo.forces.length > 0 || worldInfo.summary);

  if (!hasData) {
    $container.html(`
      <div class="ci-worldinfo-empty">
        <div class="ci-worldinfo-empty-icon">${ICONS.world}</div>
        <div class="ci-worldinfo-empty-text">暂无世界信息数据</div>
        <div class="ci-worldinfo-empty-hint">请确保数据库中包含任务/事件表、组织/势力表或总结表</div>
      </div>
    `);
    return;
  }

  // ===== 滚动信息条 =====
  const $newsTicker = renderNewsScroller(worldInfo.newsItems || []);
  $container.append($newsTicker);

  // ===== 主体内容区 =====
  const $mainContent = $('<div class="ci-worldinfo-main"></div>');

  // ===== 左侧：最新信息区 =====
  const $latestNews = renderLatestNews(worldInfo);
  $mainContent.append($latestNews);

  // ===== 右侧：势力信息区 =====
  const $forcesPanel = renderForcesAccordion(worldInfo.forces);
  $mainContent.append($forcesPanel);

  $container.append($mainContent);

  // ===== 底部：事件信息区 =====
  const $eventsArea = renderEventsCards(worldInfo.tasks);
  $container.append($eventsArea);
}

/**
 * 渲染滚动新闻条
 */
function renderNewsScroller(newsItems: string[]): any {
  const newsText = newsItems.length > 0 ? newsItems.join(' ★ ') : '暂无最新消息...';

  const $ticker = $(`
    <div class="ci-news-ticker">
      <div class="ci-ticker-content">
        <span class="ci-ticker-item">${newsText}</span>
        <span class="ci-ticker-item">${newsText}</span>
      </div>
    </div>
  `);

  return $ticker;
}

/**
 * 渲染最新信息区（报纸头条风格）
 */
function renderLatestNews(worldInfo: any): any {
  const summary = worldInfo.summary;
  const outline = worldInfo.outline;
  const matchedOutline = worldInfo.matchedOutline; // 匹配的大纲内容

  let headlineTitle = '暂无最新报道';
  let headlineContent = '';
  let headlineTime = '';
  let headlineIndex = '';
  let otherDetails: Record<string, string> = {};

  if (summary) {
    headlineTitle = `最新报道!`;
    headlineIndex = summary.index ? `(${summary.index})` : '';
    headlineContent = summary.content || '暂无内容';
    headlineTime = summary.time || '';
    otherDetails = summary.details || {};
  }

  const outlineText = outline ? outline.content : '';
  const outlineLabel = outline ? outline.label || '大纲' : '大纲';
  const matchedOutlineText = matchedOutline ? matchedOutline.content : '';
  const matchedOutlineLabel = matchedOutline ? matchedOutline.label || '大纲' : '大纲';

  // 逻辑去重：如果 matchedOutlineText 存在，则摘要部分(outlineText)不再显示
  // 注意：原代码声明了 displaySummaryText 但未使用；保持一致行为，不引入未使用变量
  // const displaySummaryText = matchedOutlineText ? '' : outlineText;

  // 构建细节区域 HTML
  let detailsHtml = '';
  if (Object.keys(otherDetails).length > 0) {
    const protagonistName = getProtagonistName();
    const speakerColorMap = new Map<string, string>();
    let colorIndex = 1;

    detailsHtml = `
      <div class="ci-worldinfo-details-box">
        ${Object.entries(otherDetails)
          .map(([key, val]) => {
            // 过滤掉已经作为大纲显示的"概览"或"摘要"
            if (key === outlineLabel || key === matchedOutlineLabel || key === '摘要') return '';

            const isDialogue = key.includes('对话');
            if (isDialogue) {
              const lines = String(val)
                .split(/[;；]/)
                .filter(l => l.trim());
              const bubbleHtml = lines
                .map(line => {
                  const parts = line.split(/[:：]/);
                  let speaker = '';
                  let content = line;

                  if (parts.length > 1) {
                    speaker = parts[0].trim();
                    content = parts.slice(1).join(':').trim();
                  }

                  // 颜色分配逻辑
                  let colorClass = 'bubble-default';
                  if (speaker) {
                    if (
                      speaker === protagonistName ||
                      (protagonistName && speaker.includes(protagonistName))
                    ) {
                      colorClass = 'bubble-protagonist';
                    } else {
                      if (!speakerColorMap.has(speaker)) {
                        speakerColorMap.set(speaker, `bubble-color-${colorIndex}`);
                        colorIndex = (colorIndex % 3) + 1;
                      }
                      colorClass = speakerColorMap.get(speaker)!;
                    }
                  }

                  return `
                  <div class="ci-chat-bubble ${colorClass}">
                    ${speaker ? `<span class="speaker-name">${speaker}</span>` : ''}
                    <span class="bubble-text">${content}</span>
                  </div>
                `;
                })
                .join('');

              return `<div class="ci-chat-bubble-container">${bubbleHtml}</div>`;
            } else {
              // 过滤掉已经作为核心字段显示的列
              if (['摘要', '编码索引', outlineLabel, matchedOutlineLabel].includes(key)) return '';
              // 非对话列，维持原有的标签显示形式
              return `<div class="ci-worldinfo-detail-item">【${key}：${val}】</div>`;
            }
          })
          .join('')}
      </div>
    `;
  }

  const $latestNews = $(`
    <div class="ci-worldinfo-latest">
      <div class="ci-worldinfo-headline-header">
        <div class="ci-worldinfo-headline-title-group">
          <span class="ci-headline-main-title">${headlineTitle}</span>
          <span class="ci-worldinfo-headline-index">${headlineIndex}</span>
          <span class="ci-news-history-btn" title="往期报道">${ICONS.history}</span>
        </div>
      </div>
      <div class="ci-worldinfo-headline-scroll-area">
        ${headlineTime ? `<div class="ci-worldinfo-headline-time">时间：${headlineTime}</div>` : ''}
        ${matchedOutlineText ? `<div class="ci-worldinfo-matched-outline">${matchedOutlineLabel}：${matchedOutlineText}</div>` : ''}
        ${detailsHtml}
        ${!matchedOutlineText && outlineText ? `<div class="ci-worldinfo-headline-summary">摘要：${outlineText}</div>` : ''}
        <div class="ci-worldinfo-headline-content">${headlineContent}</div>
      </div>
    </div>
  `);

  $latestNews.find('.ci-news-history-btn').on('click', (e: any) => {
    e.stopPropagation();
    // 优先使用注入的回调，否则使用本模块自身实现
    if (callbacks.showNewsHistoryModal) {
      callbacks.showNewsHistoryModal();
    } else {
      showNewsHistoryModal();
    }
  });

  return $latestNews;
}

/**
 * 渲染势力信息区（手风琴折叠面板）
 */
function renderForcesAccordion(forces: any[]): any {
  if (!forces || forces.length === 0) {
    return $(`
      <div class="ci-worldinfo-forces">
        <div class="ci-worldinfo-section-title">势力信息</div>
        <div class="ci-worldinfo-forces-empty">暂无势力信息</div>
      </div>
    `);
  }

  const $forcesPanel = $(`
    <div class="ci-worldinfo-forces">
      <div class="ci-worldinfo-section-title">势力信息</div>
      <div class="ci-worldinfo-forces-list"></div>
    </div>
  `);

  const $list = $forcesPanel.find('.ci-worldinfo-forces-list');

  forces.forEach((force, idx) => {
    const leaderText = force.leader ? ` - ${force.leader}` : '';

    const $item = $(`
      <div class="ci-worldinfo-force-item" data-idx="${idx}">
        <div class="ci-worldinfo-force-header">
          <span class="ci-worldinfo-force-arrow">▶</span>
          <span class="ci-worldinfo-force-name">${force.name}</span>
          <span class="ci-worldinfo-force-leader">${leaderText}</span>
        </div>
        <div class="ci-worldinfo-force-content">
          ${force.purpose ? `<div class="ci-worldinfo-force-purpose">【宗旨：${force.purpose}】</div>` : ''}
          ${force.desc ? `<div class="ci-worldinfo-force-desc">【描述：${force.desc}】</div>` : ''}
          ${Object.entries(force.details || {})
            .map(([key, val]) => `<div class="ci-worldinfo-force-detail">【${key}：${val}】</div>`)
            .join('')}
        </div>
      </div>
    `);

    // 手风琴点击事件
    $item.find('.ci-worldinfo-force-header').on('click', function (this: any) {
      // 如果在编辑模式下，调用编辑功能
      if (state.isEditing) {
        const forceIdx = $(this).closest('.ci-worldinfo-force-item').data('idx');
        if (callbacks.showWorldInfoForceEdit) {
          callbacks.showWorldInfoForceEdit(forceIdx);
        } else {
          // 占位：Task E 之前先用 toast 提示
          showToast('势力编辑功能待迁移完成', 'success');
        }
        return;
      }

      // 正常模式：手风琴功能
      const $parent = $(this).closest('.ci-worldinfo-force-item');
      const isOpen = $parent.hasClass('expanded');

      // 关闭其他
      $list.find('.ci-worldinfo-force-item').removeClass('expanded');

      if (!isOpen) {
        $parent.addClass('expanded');
      }
    });

    $list.append($item);
  });

  return $forcesPanel;
}

/**
 * 渲染事件卡片区
 */
function renderEventsCards(tasks: any[]): any {
  if (!tasks || tasks.length === 0) {
    return $(`
      <div class="ci-worldinfo-events">
        <div class="ci-inv-char-box" style="border-style: dashed; border-color: rgba(var(--ci-text-rgb), 0.2); padding: 12px; border-radius: 12px;">
          <div class="ci-inv-char-header">
            <span class="ci-event-section-title">事件信息</span>
            <span class="ci-inv-char-count">0件</span>
          </div>
          <div style="text-align: center; font-size: 12px; opacity: 0.5; padding: 10px;">暂无事件信息</div>
        </div>
      </div>
    `);
  }

  const $eventsArea = $(`
    <div class="ci-worldinfo-events">
      <div class="ci-inv-char-box" style="border-style: dashed; border-color: rgba(var(--ci-text-rgb), 0.2); padding: 12px; border-radius: 12px;">
        <div class="ci-inv-char-header">
          <span class="ci-event-section-title">事件信息</span>
          <span class="ci-inv-char-count">${tasks.length}件</span>
        </div>
        <div class="ci-worldinfo-events-grid" style="display: grid; grid-template-columns: repeat(auto-fill, 180px); gap: 8px;"></div>
      </div>
    </div>
  `);

  const $grid = $eventsArea.find('.ci-worldinfo-events-grid');

  tasks.forEach(task => {
    const statusColor =
      task.status === '进行中'
        ? '#4caf50'
        : task.status === '已完成'
          ? '#9e9e9e'
          : 'var(--ci-accent)';

    // 构建标签 HTML (发布/执行合并为一行左右显示)
    let extraTagsHtml = '';
    if ((task.publisher && task.publisher.val) || (task.executor && task.executor.val)) {
      const pubHtml =
        task.publisher && task.publisher.val
          ? `<span style="padding: 1px 4px; background: #e3f2fd; color: #1976d2; border: 1px solid #bbdefb; border-radius: 4px; font-size: 9px;">${task.publisher.label}: ${task.publisher.val}</span>`
          : '<span></span>';
      const exeHtml =
        task.executor && task.executor.val
          ? `<span style="padding: 1px 4px; background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 9px;">${task.executor.label}: ${task.executor.val}</span>`
          : '<span></span>';
      extraTagsHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; width: 100%;">${pubHtml}${exeHtml}</div>`;
    }

    // 构建奖励/惩罚 Block
    let blockHtml = '';
    if (task.reward && task.reward.val) {
      blockHtml += `<div style="background: #fffde7; border-left: 3px solid #ffc107; padding: 4px 8px; font-size: 10px; color: #5d4037; margin-top: 4px; border-radius: 4px;">${task.reward.label}: ${task.reward.val}</div>`;
    }
    if (task.penalty && task.penalty.val) {
      blockHtml += `<div style="background: #ffebee; border-left: 3px solid #f44336; padding: 4px 8px; font-size: 10px; color: #b71c1c; margin-top: 4px; border-radius: 4px;">${task.penalty.label}: ${task.penalty.val}</div>`;
    }

    const $card = $(`
      <div class="ci-worldinfo-event-card" style="background: rgba(var(--ci-text-rgb), 0.03); border: 1px solid rgba(var(--ci-text-rgb), 0.08); border-radius: 10px; padding: 10px; transition: 0.2s;">
        <div class="ci-worldinfo-event-name" style="font-weight: 600; font-size: 13px; margin-bottom: 4px; color: var(--ci-text-primary); display: flex; align-items: center; justify-content: space-between; gap: 4px;">
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${task.name}</span>
          ${task.type ? `<span style="font-size: 9px; font-weight: normal; background: var(--ci-accent); color: #fff; padding: 0 4px; border-radius: 4px; opacity: 0.8; margin-left: auto; flex-shrink: 0;">${task.type}</span>` : ''}
        </div>
        ${extraTagsHtml}
        <div style="display: inline-block; font-size: 10px; padding: 1px 6px; background: ${statusColor}22; color: ${statusColor}; border-radius: 4px; margin-bottom: 2px;">${task.status || '记录'}</div>
        ${task.desc ? `<div class="ci-worldinfo-event-desc" style="font-size: 11px; opacity: 0.8; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 6px;">${task.desc}</div>` : ''}
        ${blockHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div class="ci-worldinfo-event-time" style="font-size: 9px; opacity: 0.5;">${task.time}</div>
          ${task.location ? `<div style="font-size: 9px; color: var(--ci-accent); display: flex; align-items: center; gap: 2px; opacity: 0.8;">${ICONS.location} ${task.location}</div>` : ''}
        </div>
      </div>
    `);

    // 添加点击事件
    $card.on('click', function () {
      // 如果在编辑模式下，调用编辑功能
      if (state.isEditing) {
        const taskIndex = tasks.indexOf(task);
        if (callbacks.showWorldInfoEventEdit) {
          callbacks.showWorldInfoEventEdit(taskIndex);
        } else {
          // 占位：Task E 之前先用 toast 提示
          showToast('事件编辑功能待迁移完成', 'success');
        }
        return;
      }

      // 正常模式：可以在这里添加查看详情的逻辑
      // 暂时保持为空
    });

    $grid.append($card);
  });

  return $eventsArea;
}

/**
 * 显示往期报道历史弹窗
 */
export function showNewsHistoryModal(): void {
  const worldInfo = state.cachedData.worldInfo;
  const history = (worldInfo && worldInfo.summaryHistory) || [];

  if (history.length === 0) {
    showToast('暂无往期报道数据', 'success');
    return;
  }

  const sortedHistory = [...history].reverse();

  const $overlay = $(`
    <div class="ci-news-history-overlay ci-edit-overlay">
      <div class="ci-news-history-card ci-edit-card" style="max-width: 500px; width: 90%;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.history}</div>
          <span class="ci-edit-title">往期报道</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1; max-height: 70vh;">
          <div class="ci-history-accordion" style="display: flex; flex-direction: column; gap: 8px;">
            ${sortedHistory
              .map(
                (item: any, idx: number) => `
              <div class="ci-history-item" style="border: 1px solid rgba(var(--ci-text-rgb), 0.1); border-radius: 8px; overflow: hidden;">
                <div class="ci-history-item-title" style="padding: 10px 12px; background: rgba(var(--ci-text-rgb), 0.03); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #666;">
                  <span>第 ${item.index} 报道 (${item.time})</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="ci-history-edit-btn" style="opacity: 0.7; cursor: pointer;" title="编辑" data-index="${item.index}" data-time="${item.time}">${ICONS.edit}</span>
                    <span style="opacity: 0.5;">${idx === 0 ? '最新' : ''} ${ICONS.resize}</span>
                  </div>
                </div>
                <div class="ci-history-item-content" style="padding: 12px; display: ${idx === 0 ? 'block' : 'none'}; font-size: 12px; line-height: 1.6; background: #fff; border-top: 1px solid rgba(var(--ci-text-rgb), 0.05); color: #666;">
                  ${item.matchedOutline ? `<div class="ci-worldinfo-matched-outline" style="margin-bottom: 8px;">${item.matchedOutlineLabel || '大纲'}：${item.matchedOutline}</div>` : ''}
                  <div style="white-space: pre-wrap;">${item.content}</div>
                  ${
                    Object.entries(item.details || {}).length > 0
                      ? `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.05); opacity: 0.8;">
                      ${Object.entries(item.details)
                        .map(([k, v]) => `<div>【${k}：${v}】</div>`)
                        .join('')}
                    </div>
                  `
                      : ''
                  }
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-history-item-title').on('click', function (this: any) {
    const $content = $(this).next('.ci-history-item-content');
    const isVisible = $content.is(':visible');
    $overlay.find('.ci-history-item-content').slideUp(200);
    if (!isVisible) {
      $content.slideDown(200);
    }
  });

  // 往期报道编辑按钮事件
  $overlay.find('.ci-history-edit-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    const targetIndex = $(this).data('index');
    const targetTime = $(this).data('time');
    if (callbacks.showHistoryItemEditOverlay) {
      callbacks.showHistoryItemEditOverlay(targetIndex, targetTime);
    } else {
      // 占位：Task E 之前先用 toast 提示
      showToast('往期报道编辑功能待迁移完成', 'success');
    }
  });
}
