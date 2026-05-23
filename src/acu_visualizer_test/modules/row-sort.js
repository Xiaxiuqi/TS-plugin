// ACU Visualizer 测试版行排序模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中行位置映射、moveRow()、bindRowDragEvents()、行排序开关逻辑。
// 迁移原则：保留原 localStorage key 前缀、data-display-index/data-original-index、拖拽 class 与实时生效语义，不夹带优化。

import { getCore } from '../core/bridge.js';
import { state } from '../core/state.js';
import { generatePaginationHTML } from './pagination.js';
import { getActiveTabState } from './tabs.js';

export const ROW_MAPPING_KEY_PREFIX = 'acu_row_position_mapping_';

export function initializeRowMapping(tableName, tableData, rowPositionMapping = state.rowPositionMapping) {
  if (!tableData?.rows) return;
  const rowCount = tableData.rows.length;

  if (!rowPositionMapping[tableName]) {
    rowPositionMapping[tableName] = [];
  }

  if (rowPositionMapping[tableName].length === 0) {
    for (let i = 0; i < rowCount; i++) {
      rowPositionMapping[tableName].push(i);
    }
  }

  if (rowPositionMapping[tableName].length < rowCount) {
    for (let i = rowPositionMapping[tableName].length; i < rowCount; i++) {
      rowPositionMapping[tableName].push(i);
    }
  }

  if (rowPositionMapping[tableName].length > rowCount) {
    rowPositionMapping[tableName] = rowPositionMapping[tableName].filter(index => index < rowCount);
  }
}

export function getOriginalRowIndex(tableName, displayIndex, rowPositionMapping = state.rowPositionMapping) {
  if (!rowPositionMapping[tableName] || displayIndex >= rowPositionMapping[tableName].length) {
    return displayIndex;
  }
  return rowPositionMapping[tableName][displayIndex];
}

export function getDisplayRowIndex(tableName, originalIndex, rowPositionMapping = state.rowPositionMapping) {
  if (!rowPositionMapping[tableName]) return originalIndex;
  const displayIndex = rowPositionMapping[tableName].indexOf(originalIndex);
  return displayIndex !== -1 ? displayIndex : originalIndex;
}

export function moveRow(tableName, fromIndex, insertIndex, rowPositionMapping = state.rowPositionMapping) {
  if (!rowPositionMapping[tableName]) return false;
  const mapping = rowPositionMapping[tableName];
  if (fromIndex < 0 || insertIndex < 0 || fromIndex >= mapping.length || insertIndex > mapping.length) {
    return false;
  }
  if (insertIndex === fromIndex || insertIndex === fromIndex + 1) {
    return false;
  }

  const [movedRow] = mapping.splice(fromIndex, 1);
  const adjustedInsertIndex = Math.max(
    0,
    Math.min(fromIndex < insertIndex ? insertIndex - 1 : insertIndex, mapping.length),
  );
  mapping.splice(adjustedInsertIndex, 0, movedRow);

  const isIdentityMapping = mapping.every((originalIndex, displayIndex) => originalIndex === displayIndex);
  if (isIdentityMapping) {
    localStorage.removeItem(`${ROW_MAPPING_KEY_PREFIX}${tableName}`);
    return true;
  }

  try {
    localStorage.setItem(`${ROW_MAPPING_KEY_PREFIX}${tableName}`, JSON.stringify(mapping));
  } catch (e) {
    console.warn('[ACU] 无法保存行位置映射:', e);
  }
  return true;
}

export function loadRowMapping(tableName, rowPositionMapping = state.rowPositionMapping) {
  try {
    const saved = localStorage.getItem(`${ROW_MAPPING_KEY_PREFIX}${tableName}`);
    if (saved) {
      rowPositionMapping[tableName] = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('[ACU] 无法加载行位置映射:', e);
    rowPositionMapping[tableName] = [];
  }
}

export function bindRowDragEvents($section, tableName, deps = {}) {
  const { $ } = deps.core || getCore();
  const flags = deps.flags || state.flags;
  const drag = deps.drag || state.drag;
  const $rows = $section.find('.data-table tbody tr');

  if (!flags.isEditingRowOrder) {
    $rows
      .removeAttr('draggable')
      .removeClass('dragging drag-over-before drag-over-after')
      .off('dragstart.acu dragend.acu dragover.acu dragenter.acu dragleave.acu drop.acu');
    $section.find('.data-table').removeClass('is-sorting-rows');
    return;
  }

  $section.find('.data-table').addClass('is-sorting-rows');
  $rows
    .attr('draggable', 'true')
    .removeClass('drag-over-before drag-over-after')
    .off('dragstart.acu dragend.acu dragover.acu dragenter.acu dragleave.acu drop.acu');

  $rows.on('dragstart.acu', function (e) {
    if (!flags.isEditingRowOrder) return;
    drag.isDragging = true;
    drag.dragStartIndex = parseInt($(this).attr('data-display-index'), 10);
    if (Number.isNaN(drag.dragStartIndex)) drag.dragStartIndex = $(this).index();
    $(this).addClass('dragging');
    if (e.originalEvent?.dataTransfer) {
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('text/plain', drag.dragStartIndex.toString());
    }
  });

  $rows.on('dragend.acu', function () {
    drag.isDragging = false;
    drag.dragStartIndex = -1;
    drag.dragEndIndex = -1;
    drag.dragInsertIndex = -1;
    $(this).removeClass('dragging');
    $section.find('.drag-over-before, .drag-over-after').removeClass('drag-over-before drag-over-after');
  });

  $rows.on('dragover.acu', function (e) {
    if (!drag.isDragging || !flags.isEditingRowOrder) return;
    e.preventDefault();
    if (e.originalEvent?.dataTransfer) e.originalEvent.dataTransfer.dropEffect = 'move';
    const $this = $(this);
    const currentIndex = parseInt($this.attr('data-display-index'), 10);
    const safeCurrentIndex = Number.isNaN(currentIndex) ? $this.index() : currentIndex;
    const rect = this.getBoundingClientRect();
    const pointerY = e.originalEvent?.clientY ?? rect.top;
    const insertAfterCurrentRow = pointerY > rect.top + rect.height / 2;
    const nextInsertIndex = safeCurrentIndex + (insertAfterCurrentRow ? 1 : 0);

    if (safeCurrentIndex !== drag.dragEndIndex || nextInsertIndex !== drag.dragInsertIndex) {
      $section.find('.drag-over-before, .drag-over-after').removeClass('drag-over-before drag-over-after');
      $this.addClass(insertAfterCurrentRow ? 'drag-over-after' : 'drag-over-before');
      drag.dragEndIndex = safeCurrentIndex;
      drag.dragInsertIndex = nextInsertIndex;
    }
  });

  $rows.on('dragenter.acu', e => e.preventDefault());
  $rows.on('dragleave.acu', function (e) {
    if (e.target === this || $(e.target).closest('tr')[0] === this) {
      $(this).removeClass('drag-over-before drag-over-after');
    }
  });

  $rows.on('drop.acu', function (e) {
    if (!flags.isEditingRowOrder) return;
    e.preventDefault();
    let dropIndex = drag.dragInsertIndex;
    const $highlightedRow = $section.find('.drag-over-before, .drag-over-after').first();
    if ($highlightedRow.length) {
      const highlightedIndex = parseInt($highlightedRow.attr('data-display-index'), 10);
      if (!Number.isNaN(highlightedIndex)) {
        dropIndex = highlightedIndex + ($highlightedRow.hasClass('drag-over-after') ? 1 : 0);
      }
    }

    if (dropIndex < 0 || Number.isNaN(dropIndex)) {
      const currentIndex = parseInt($(this).attr('data-display-index'), 10);
      const safeCurrentIndex = Number.isNaN(currentIndex) ? $(this).index() : currentIndex;
      const rect = this.getBoundingClientRect();
      const pointerY = e.originalEvent?.clientY ?? rect.top;
      dropIndex = safeCurrentIndex + (pointerY > rect.top + rect.height / 2 ? 1 : 0);
    }

    if (drag.dragStartIndex !== -1) {
      const moved = moveRow(
        tableName,
        drag.dragStartIndex,
        dropIndex,
        deps.rowPositionMapping || state.rowPositionMapping,
      );
      if (!moved) {
        $(this).removeClass('drag-over-before drag-over-after');
        return;
      }

      const rawData = deps.getTableData?.();
      const tables = deps.processJsonData?.(rawData);
      if (tables && tables[tableName] && typeof deps.renderDataTable === 'function') {
        const $tableSection = $(`#acu-table-${deps.getSafeTableId?.(tableName)}`);
        if ($tableSection.length) {
          const currentPage = deps.getCurrentPageForTable?.(tableName) || 0;
          const paginationHtml = generatePaginationHTML(tableName, tables[tableName].rows.length, currentPage);
          const newTableHtml = deps.renderDataTable(tables[tableName], tableName);
          $tableSection.find('.acu-pagination-container').remove();
          $tableSection.find('.section-title').after(paginationHtml);
          $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);
          deps.bindCellEventsForSection?.($tableSection);
          deps.bindPaginationEvents?.($tableSection, tableName, tables[tableName]);
          bindRowDragEvents($tableSection, tableName, deps);
        }
      }
      deps.showNotification?.('行顺序已调整', 'success');
    }
    $section.find('.drag-over-before, .drag-over-after').removeClass('drag-over-before drag-over-after');
  });
}

export function startRowOrderEditing(deps = {}) {
  const { $ } = deps.core || getCore();
  state.flags.isEditingRowOrder = true;
  $('.acu-table-container').addClass('editing-row-order');
  $('#acu-order-controls').removeClass('visible');
  const activeTab = getActiveTabState();
  if (activeTab) {
    const $activeTabBtn = $(`.acu-tab-btn[data-table-name="${activeTab}"]`);
    if ($activeTabBtn.length) $activeTabBtn.trigger('click.acu');
  }
  deps.showNotification?.('已开启行排序模式（实时生效，文字选择已禁用）', 'info');
}

export function stopRowOrderEditing(deps = {}) {
  const { $ } = deps.core || getCore();
  state.flags.isEditingRowOrder = false;
  $('.acu-table-container').removeClass('editing-row-order');
  $('#acu-order-controls').removeClass('visible');
  const activeTab = getActiveTabState();
  if (activeTab) {
    const $activeTabBtn = $(`.acu-tab-btn[data-table-name="${activeTab}"]`);
    if ($activeTabBtn.length) $activeTabBtn.trigger('click.acu');
  }
  deps.showNotification?.('行排序模式已关闭', 'success');
}
