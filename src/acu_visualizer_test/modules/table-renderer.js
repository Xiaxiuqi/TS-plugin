// ACU Visualizer 测试版表格渲染模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 generateTableHTML()、renderDataTable()、smartUpdateTable()、insertTableAfterLatestAIMessage()、bindTableEvents()。
// 迁移原则：保留原 DOM class、data 属性、分页/搜索/高亮组合逻辑，不夹带优化。

import { getCore, getDataIsolationCode } from '../core/bridge.js';
import { acuButtonIconLabel } from '../core/constants.js';
import { removeWithEvents } from '../core/dom-cleanup.js';
import { state } from '../core/state.js';
import {
  getConfig,
  getCurrentPageForTable,
  loadSnapshot,
} from '../core/storage.js';
import {
  getInnerScrollPositionState,
  getNightModeState,
  getTableExpandedState,
  saveInnerScrollPositionState,
} from './theme.js';
import {
  generateDataHash,
  generateDiffMap,
  isCellDBUpdated,
  isCellUserEdited,
  shouldShowBadge,
} from './diff-highlighting.js';
import { generatePaginationHTML } from './pagination.js';
import { getOriginalRowIndex, initializeRowMapping } from './row-sort.js';
import { filterRowDisplayIndices, generateSearchToolbarHTML, highlightSearchMatches } from './search.js';
import { getSafeTableId, getTableData, processJsonData } from './table-data.js';
import { getOrderedTableNames } from './table-sort.js';
import { getActiveTabState } from './tabs.js';

export function renderDataTable(tableData, tableName, deps = {}) {
  if (!tableData.rows || tableData.rows.length === 0) return '<div class="empty-message">暂无数据</div>';
  initializeRowMapping(tableName, tableData, state.rowPositionMapping);

  const filteredIndices = filterRowDisplayIndices(tableData, tableName, {
    getOriginalRowIndex: (name, index) => getOriginalRowIndex(name, index, state.rowPositionMapping),
    searchTerm: state.search.currentSearchTerm,
  });
  const filteredTotalCount = filteredIndices.length;
  let currentPage = deps.getCurrentPageForTable
    ? deps.getCurrentPageForTable(tableName)
    : getCurrentPageForTable(tableName);
  const pageSize = 20;
  const maxPage = Math.ceil(filteredTotalCount / pageSize) - 1;
  if (currentPage > maxPage && filteredTotalCount > 0) {
    currentPage = Math.max(0, maxPage);
    deps.savePaginationState?.(tableName, currentPage);
  }

  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTotalCount);
  const paginatedDisplayIndices = filteredIndices.slice(startIndex, endIndex);

  let html = '<div class="data-table-wrapper"><table class="data-table"><thead><tr>';
  tableData.headers.forEach((header, index) => {
    if (index > 0 && header) html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';

  if (paginatedDisplayIndices.length === 0) {
    html += `<tr><td colspan="${tableData.headers.length}" style="text-align:center; padding: 20px; opacity: 0.6;">没有匹配的结果</td></tr>`;
  }

  paginatedDisplayIndices.forEach(displayIndex => {
    const originalIndex = getOriginalRowIndex(tableName, displayIndex, state.rowPositionMapping);
    const row = tableData.rows[originalIndex];
    const deleteKey = `${tableName}-row-${originalIndex}`;
    const isPendingDelete = state.pendingDeletes.has(deleteKey);
    const rowClass = isPendingDelete ? 'pending-deletion' : '';
    html += `<tr class="${rowClass}" data-display-index="${displayIndex}" data-original-index="${originalIndex}" ${state.flags.isEditingRowOrder ? 'draggable="true"' : ''}>`;

    row.forEach((cell, index) => {
      if (index > 0) {
        const formattedContent = highlightSearchMatches(cell || '', state.search.currentSearchTerm);
        let highlightClass = '';
        if (isCellUserEdited(tableName, originalIndex, index, state.currentUserEditMap))
          highlightClass = 'acu-highlight-user-edit';
        else if (isCellDBUpdated(tableName, originalIndex, index, state.currentDiffMap))
          highlightClass = 'acu-highlight-changed';
        const columnName = tableData.headers[index] || '';
        const cellClass = isPendingDelete ? 'acu-editable-cell' : `acu-editable-cell ${highlightClass}`;
        html += `<td class="${cellClass}" data-table-key="${tableData.key}" data-table-name="${tableName}" data-row="${originalIndex}" data-col="${index}" data-col-name="${columnName}">${formattedContent}</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

export function generateTableHTML(deps = {}) {
  const rawData = deps.getTableData ? deps.getTableData() : getTableData();
  const tables = deps.processJsonData ? deps.processJsonData(rawData) : deps.tables || processJsonData(rawData);
  const isExpanded = deps.getTableExpandedState ? deps.getTableExpandedState() : getTableExpandedState();
  const isNightMode = deps.getNightModeState ? deps.getNightModeState() : getNightModeState();
  const activeTab = deps.getActiveTabState ? deps.getActiveTabState() : getActiveTabState();
  const config = deps.getConfig ? deps.getConfig() : getConfig();

  if (rawData) state.currentDiffMap = generateDiffMap(rawData);
  const orderedTableNames = tables ? getOrderedTableNames(tables) : [];
  const validActiveTab = activeTab && orderedTableNames.includes(activeTab) ? activeTab : null;

  let html = `
        <div class="acu-table-container acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}">
            <details ${isExpanded ? 'open' : ''}>
                <summary>
                    <span><i class="fas fa-table" style="margin-right: 8px; opacity: 0.8;"></i>数据表格 ${tables ? '(' + orderedTableNames.length + '个表格)' : ''} <span style="font-size: 0.8em;">v9.6 [标识：${getDataIsolationCode() || '无'}]</span></span>
                    <div style="display: flex; align-items: center; gap: 12px; height: 24px; position: relative;">
                        <span class="acu-expand-hint" style="font-size: 11px; opacity: 0.6; pointer-events: none;">${isExpanded ? '点击收起' : '点击展开'}</span>
                        <button class="acu-mode-toggle acu-moon-box" title="切换昼夜模式" type="button">
                            <div class="acu-moon-orb"></div>
                            <div class="acu-moon-cloud"></div>
                            <div class="acu-glow-particle acu-p1"></div>
                            <div class="acu-glow-particle acu-p2"></div>
                            <div class="acu-glow-particle acu-p3"></div>
                            <div class="acu-glow-particle acu-p4"></div>
                            <div class="acu-glow-particle acu-p5"></div>
                            <div class="acu-glow-particle acu-p6"></div>
                            <div class="acu-glow-particle acu-p7"></div>
                            <div class="acu-glow-particle acu-p8"></div>
                            <span class="acu-star-dust s1">✦</span>
                            <span class="acu-star-dust s2">✦</span>
                            <span class="acu-star-dust s3">✦</span>
                            <span class="acu-star-dust s4">✦</span>
                            <span class="acu-star-dust s5">✦</span>
                        </button>
                    </div>
                </summary>
                <div class="acu-content-wrapper">
                    <div class="acu-tabs-header"><div style="display: flex; align-items: center; gap: 8px;"><button class="acu-order-edit-btn"><i class="fas fa-edit" style="margin-right: 5px;"></i>顺序</button><button class="acu-theme-btn" id="acu-theme-btn" title="切换主题"><i class="fas fa-palette"></i></button></div><div style="display: flex; gap: 8px; align-items: center;"><button class="acu-settings-btn-header" id="acu-settings-btn-main" title="系统设置"><i class="fas fa-cog"></i></button><button class="acu-refresh-btn-header" id="acu-refresh-btn-main" title="刷新数据"><i class="fas fa-sync-alt"></i></button><button class="acu-save-db-btn-header" id="acu-save-db-btn-main" ${!tables ? 'disabled' : ''}><i class="fas fa-save" style="margin-right: 5px;"></i>保存</button></div></div>
                    <div class="acu-order-controls" id="acu-order-controls" style="display:none;"><button class="acu-save-order-btn"><i class="fas fa-check" style="margin-right:5px;"></i>保存顺序</button><button class="acu-cancel-order-btn"><i class="fas fa-times" style="margin-right:5px;"></i>取消</button></div>`;

  if (tables) {
    html += `<div class="acu-tabs-container" id="acu-tabs-sortable">`;
    orderedTableNames.forEach(tableName => {
      const tableData = tables[tableName];
      const safeId = deps.getSafeTableId ? deps.getSafeTableId(tableName) : getSafeTableId(tableName);
      const rowCount = tableData.rows ? tableData.rows.length : 0;
      const isActive = validActiveTab === tableName ? 'active' : '';
      const hasUpdateClass = shouldShowBadge(tableName) ? 'has-updates' : '';
      html += `<button class="acu-tab-btn ${isActive} ${hasUpdateClass}" data-table-id="${safeId}" data-table-name="${tableName}">${tableName}<span style="font-size: 10px; margin-left: 5px; opacity: 0.7;">(${rowCount})</span>${shouldShowBadge(tableName) ? '<span class="acu-update-badge"></span>' : ''}</button>`;
    });
    html += `</div><div class="table-content-area acu-scroll-container">`;
    orderedTableNames.forEach(tableName => {
      const tableData = tables[tableName];
      const safeId = deps.getSafeTableId ? deps.getSafeTableId(tableName) : getSafeTableId(tableName);
      const isActive = validActiveTab === tableName ? 'active' : '';
      const currentPage = getCurrentPageForTable(tableName);
      const paginationHtml = generatePaginationHTML(tableName, tableData.rows ? tableData.rows.length : 0, currentPage);
      html += `<section class="acu-table-section ${isActive}" id="acu-table-${safeId}"><div class="section-title" style="display:flex !important; flex-direction:row !important; align-items:center !important; justify-content:space-between !important; width:100% !important; box-sizing:border-box !important; position:relative !important;"><div class="acu-title-left-text" style="display:flex; align-items:center; flex-shrink:0;">${tableName}<span style="font-size: 11px; margin-left: 8px; color: var(--acu-primary); opacity: 0.6;">(${tableData.rows ? tableData.rows.length : 0}行)</span></div>${generateSearchToolbarHTML()}</div>${paginationHtml}${renderDataTable(tableData, tableName, deps)}</section>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="table-content-area acu-scroll-container"><div class="empty-message">无数据，请先进行对话或检查数据库连接</div></div>`;
  }

  html += `</div></details></div>`;
  return html;
}

export function smartUpdateTable(forceFullUpdate = false, deps = {}) {
  if (state.flags.isCellEditing) return;
  const { $ } = deps.core || getCore();
  const rawData = deps.getTableData ? deps.getTableData() : getTableData();
  if (!rawData || Object.keys(rawData).length === 0) {
    deps.insertTableAfterLatestAIMessage?.();
    return;
  }
  const currentHash = generateDataHash(rawData);
  if (currentHash === state.hashes.lastTableDataHash && !forceFullUpdate && !state.flags.isFirstRender) return;
  state.hashes.lastTableDataHash = currentHash;
  if (loadSnapshot() !== null || forceFullUpdate) state.currentDiffMap = generateDiffMap(rawData);
  deps.saveCurrentScrollPosition?.();
  if ($('.acu-table-container').length > 0) deps.updateTableContentOnly?.();
  else deps.insertTableAfterLatestAIMessage?.();
  state.flags.isFirstRender = false;
}

export function insertTableAfterLatestAIMessage(deps = {}) {
  const { $ } = deps.core || getCore();
  const tableHtml = generateTableHTML(deps);
  $('.acu-table-container').each(function () {
    removeWithEvents($(this));
  });
  const $latestAIMessage = $('.mes:not(.sys):not(.user)').last();
  if ($latestAIMessage.length === 0) {
    const $chatContainer = $('#chat, .chat-container').first();
    if ($chatContainer.length) $chatContainer.append(tableHtml);
    else $('body').append(tableHtml);
  } else {
    $latestAIMessage.after(tableHtml);
  }
  deps.bindTableEvents?.();
  state.hashes.lastAIMessageId = deps.getLatestAIMessageId?.() || state.hashes.lastAIMessageId;
  state.scroll.currentTableScrollTop = getInnerScrollPositionState();
  setTimeout(() => deps.applySavedScrollPositionImmediately?.(), 50);
  state.flags.isFirstRender = false;
}

export function bindTableEvents(deps = {}) {
  const { $ } = deps.core || getCore();
  deps.bindTabClickEvents?.();
  deps.bindExpandCollapseEvents?.();
  $('.acu-mode-toggle')
    .off('click.acu')
    .on('click.acu', e => {
      e.stopPropagation();
      deps.toggleNightMode?.();
    });
  $('#acu-theme-btn')
    .off('click.acu')
    .on('click.acu', e => {
      e.stopPropagation();
      deps.showThemeMenu?.(e);
    });
  $('#acu-settings-btn-main')
    .off('click.acu')
    .on('click.acu', e => {
      e.stopPropagation();
      deps.showSettingsDialog?.();
    });
  $('.acu-order-edit-btn').off('click.acu').on('click.acu', deps.showOrderMenu);
  $('.acu-save-order-btn').off('click.acu').on('click.acu', deps.saveTableOrderFromUI);
  $('.acu-cancel-order-btn').off('click.acu').on('click.acu', deps.cancelOrderEditing);
  $('#acu-save-db-btn-main')
    .off('click.acu')
    .on('click.acu', async function () {
      if (state.flags.isSaving) return;
      $(this).prop('disabled', true).html(acuButtonIconLabel('save', '保存中...'));
      const rawData = deps.getTableData ? deps.getTableData() : getTableData();
      if (rawData) {
        const saveSuccess = await deps.saveDataToDatabase?.(rawData);
        $(this).prop('disabled', false).html(acuButtonIconLabel('save', '保存到数据库'));
        if (!saveSuccess) deps.showNotification?.('保存失败，请检查数据库连接！', 'error');
      } else {
        $(this).prop('disabled', false).html(acuButtonIconLabel('save', '保存到数据库'));
        alert('无法获取数据，保存失败！');
      }
    });
  $('#acu-refresh-btn-main')
    .off('click.acu')
    .on('click.acu', e => deps.showRefreshMenu?.(e));
  $('.acu-editable-cell')
    .off('click.acu')
    .on('click.acu', function (e) {
      deps.showCellMenu?.(e, this);
    });
  $('.acu-scroll-container')
    .off('scroll.acu')
    .on('scroll.acu', function () {
      state.scroll.currentTableScrollTop = $(this).scrollTop();
      saveInnerScrollPositionState(state.scroll.currentTableScrollTop);
    });
}

export function performRefreshTable(deps = {}) {
  state.flags.isRefreshing = true;
  deps.resetScrollPositionToTop?.();
  state.hashes.lastTableDataHash = '';
  state.flags.isFirstRender = true;
  deps.clearAllTabUpdates?.();
  deps.insertTableAfterLatestAIMessage?.();
  state.flags.isRefreshing = false;
  deps.showNotification?.('表格已刷新', 'info');
}

export function checkAndUpdateTablePosition(deps = {}) {
  if (state.flags.tablePositionUpdateQueued) return;
  const currentAIMessageId = deps.getLatestAIMessageId?.();
  if (currentAIMessageId && currentAIMessageId !== state.hashes.lastAIMessageId) {
    state.hashes.lastAIMessageId = currentAIMessageId;
    state.flags.tablePositionUpdateQueued = true;
    setTimeout(() => {
      deps.insertTableAfterLatestAIMessage?.();
      state.flags.tablePositionUpdateQueued = false;
    }, 500);
  }
}