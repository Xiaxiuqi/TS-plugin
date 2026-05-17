// ACU Visualizer 测试版标签页模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 active tab 状态、tab HTML、徽章更新和点击切换逻辑。
// 迁移原则：保留原 class、data 属性、active/has-updates 行为，不夹带优化。

import { getCore } from '../core/bridge.js';
import { STORAGE_KEYS } from '../core/constants.js';
import { markTabAsSeen, shouldShowBadge } from './diff-highlighting.js';

export function getActiveTabState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

export function saveActiveTabState(tableName) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(tableName));
  } catch (e) {
    console.error('保存激活标签页状态失败:', e);
  }
}

export function generateTabButtonHTML(tableName, { safeId, rowCount = 0, activeTab = null } = {}) {
  const isActive = activeTab === tableName ? 'active' : '';
  const shouldShowUpdateBadge = shouldShowBadge(tableName);
  const hasUpdateClass = shouldShowUpdateBadge ? 'has-updates' : '';

  let html = `
                    <button class="acu-tab-btn ${isActive} ${hasUpdateClass}" data-table-id="${safeId}" data-table-name="${tableName}">
                        ${tableName}
                        <span style="font-size: 10px; margin-left: 5px; opacity: 0.7;">(${rowCount})</span>`;

  if (shouldShowUpdateBadge) {
    html += `<span class="acu-update-badge"></span>`;
  }

  html += `
                    </button>`;
  return html;
}

export function updateTabBadges(core = getCore()) {
  const { $ } = core;

  $('.acu-tab-btn').each(function () {
    const $tab = $(this);
    const tableName = $tab.data('table-name');

    if (tableName && shouldShowBadge(tableName)) {
      if (!$tab.find('.acu-update-badge').length) {
        $tab.append('<span class="acu-update-badge"></span>');
      }
      $tab.addClass('has-updates');
    } else {
      $tab.find('.acu-update-badge').remove();
      $tab.removeClass('has-updates');
    }
  });
}

export function clearTabBadgeOnClick(tableName) {
  markTabAsSeen(tableName);
  updateTabBadges();
}

export function activateSavedOrFirstTab(core = getCore()) {
  const { $ } = core;
  const savedActiveTab = getActiveTabState();

  if (savedActiveTab) {
    const $savedTab = $(`.acu-tab-btn[data-table-name="${savedActiveTab}"]`);
    if ($savedTab.length) {
      $savedTab.trigger('click.acu');
      return;
    }
  }

  if ($('.acu-tab-btn').length > 0 && $('.acu-tab-btn.active').length === 0) {
    $('.acu-tab-btn').first().trigger('click.acu');
  }
}

export function bindTabClickEvents({
  isEditingOrder = () => false,
  resetScrollPositionToTop,
  getTableData,
  processJsonData,
  getCurrentPageForTable,
  generatePaginationHTML,
  renderDataTable,
  bindCellEventsForSection,
  bindPaginationEvents,
  bindRowDragEvents,
  checkAndJumpToLastPageForSummary,
  core = getCore(),
} = {}) {
  const { $ } = core;

  $('.acu-tab-btn')
    .off('click.acu')
    .on('click.acu', function () {
      if (isEditingOrder()) return;

      const tableId = $(this).data('table-id');
      const tableName = $(this).data('table-name');

      $('.acu-tab-btn').removeClass('active');
      $(this).addClass('active');
      $('.acu-table-section').removeClass('active');
      $(`#acu-table-${tableId}`).addClass('active');

      if (typeof resetScrollPositionToTop === 'function') {
        resetScrollPositionToTop();
      }

      saveActiveTabState(tableName);
      clearTabBadgeOnClick(tableName);

      if (
        typeof getTableData === 'function' &&
        typeof processJsonData === 'function' &&
        typeof getCurrentPageForTable === 'function' &&
        typeof generatePaginationHTML === 'function' &&
        typeof renderDataTable === 'function'
      ) {
        const rawData = getTableData();
        const tables = processJsonData(rawData);
        if (tables && tables[tableName]) {
          const $section = $(`#acu-table-${tableId}`);
          const currentPage = getCurrentPageForTable(tableName);
          const paginationHtml = generatePaginationHTML(
            tableName,
            tables[tableName].rows ? tables[tableName].rows.length : 0,
            currentPage,
          );
          const newTableHtml = renderDataTable(tables[tableName], tableName);

          $section.find('.acu-pagination-container').remove();
          $section.find('.section-title').after(paginationHtml);
          $section.find('.data-table-wrapper').replaceWith(newTableHtml);

          if (typeof bindCellEventsForSection === 'function') {
            bindCellEventsForSection($section);
          }
          if (typeof bindPaginationEvents === 'function') {
            bindPaginationEvents($section, tableName, tables[tableName]);
          }
          if (typeof bindRowDragEvents === 'function') {
            bindRowDragEvents($section, tableName);
          }
        }
      }

      if (typeof checkAndJumpToLastPageForSummary === 'function') {
        setTimeout(() => checkAndJumpToLastPageForSummary(), 100);
      }
    });
}
