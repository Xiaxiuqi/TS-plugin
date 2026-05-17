// ACU Visualizer 测试版分页模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 generatePaginationHTML()、bindPaginationEvents()。
// 迁移原则：保留原 class、data 属性、分页大小与 HTML 结构，不夹带优化。

import { getCore } from '../core/bridge.js';
import { getCurrentPageForTable, savePaginationState } from '../core/storage.js';

export const PAGE_SIZE = 20;
export const MAX_DISPLAY_PAGES = 9;

export function generatePaginationHTML(tableName, totalRows, currentPage) {
  const pageSize = PAGE_SIZE;
  const totalPages = Math.ceil(totalRows / pageSize);

  if (totalPages <= 1) return '';

  const maxDisplay = MAX_DISPLAY_PAGES;
  let startPage;
  let endPage;

  if (totalPages <= maxDisplay) {
    startPage = 0;
    endPage = totalPages - 1;
  } else if (currentPage <= Math.floor(maxDisplay / 2)) {
    startPage = 0;
    endPage = maxDisplay - 1;
  } else if (currentPage >= totalPages - Math.floor(maxDisplay / 2) - 1) {
    startPage = totalPages - maxDisplay;
    endPage = totalPages - 1;
  } else {
    startPage = currentPage - Math.floor((maxDisplay - 1) / 2);
    endPage = currentPage + Math.floor(maxDisplay / 2);
  }

  let html = `<div class="acu-pagination-container" data-table="${tableName}">`;

  html += `<button class="acu-page-btn prev ${currentPage === 0 ? 'disabled' : ''}" data-page="${currentPage - 1}" title="上一页"><i class="fas fa-chevron-left"></i></button>`;

  if (startPage > 0) {
    html += `<button class="acu-page-btn" data-page="0">1</button>`;
    if (startPage > 1) {
      html += `<span style="padding: 0 5px; color: var(--acu-text); opacity: 0.5;">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="acu-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i + 1}</button>`;
  }

  if (endPage < totalPages - 1) {
    if (endPage < totalPages - 2) {
      html += `<span style="padding: 0 5px; color: var(--acu-text); opacity: 0.5;">...</span>`;
    }
    html += `<button class="acu-page-btn" data-page="${totalPages - 1}">${totalPages}</button>`;
  }

  html += `<button class="acu-page-btn next ${currentPage >= totalPages - 1 ? 'disabled' : ''}" data-page="${currentPage + 1}" title="下一页"><i class="fas fa-chevron-right"></i></button>`;
  html += `</div>`;
  return html;
}

export function bindPaginationEvents(
  $section,
  tableName,
  tableData,
  { getSafeTableId, renderDataTable, bindCellEventsForSection, bindRowDragEvents, core = getCore() } = {},
) {
  const { $ } = core;
  const $pagination = $section.find('.acu-pagination-container');

  $pagination
    .find('.acu-page-btn:not(.disabled)')
    .off('click')
    .on('click', function () {
      const page = parseInt($(this).data('page'));
      savePaginationState(tableName, page);

      if (typeof getSafeTableId !== 'function' || typeof renderDataTable !== 'function') {
        return;
      }

      const $tableSection = $(`#acu-table-${getSafeTableId(tableName)}`);
      if ($tableSection.length) {
        const currentPage = getCurrentPageForTable(tableName);
        const paginationHtml = generatePaginationHTML(
          tableName,
          tableData.rows ? tableData.rows.length : 0,
          currentPage,
        );
        const newTableHtml = renderDataTable(tableData, tableName);

        $tableSection.find('.acu-pagination-container').remove();
        $tableSection.find('.section-title').after(paginationHtml);
        $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);

        if (typeof bindCellEventsForSection === 'function') {
          bindCellEventsForSection($tableSection);
        }
        bindPaginationEvents($section, tableName, tableData, {
          getSafeTableId,
          renderDataTable,
          bindCellEventsForSection,
          bindRowDragEvents,
          core,
        });
        if (typeof bindRowDragEvents === 'function') {
          bindRowDragEvents($tableSection, tableName);
        }
      }
    });
}

export function getPageSlice(rows, currentPage, pageSize = PAGE_SIZE) {
  const start = currentPage * pageSize;
  return rows.slice(start, start + pageSize);
}
