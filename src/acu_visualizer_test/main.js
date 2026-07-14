// ACU Visualizer 测试版模块化入口
// 来源：public/acu_visualizer/acu_visualizer-test.js 尾部 IIFE 初始化结构。
// 迁移原则：仅组装测试版生命周期入口，不接入正式插件，不夹带优化。

import { getCore, getParentWindow } from './core/bridge.js';
import { removeTransientUi, removeWithEvents } from './core/dom-cleanup.js';
import { initAcuVisualizerTest } from './core/lifecycle.js';
import { state } from './core/state.js';
import { getConfig, getCurrentPageForTable, savePaginationState } from './core/storage.js';
import { showCellMenu } from './modules/cell-editor.js';
import { showHistoryMenu } from './modules/cell-history.js';
import { saveDataToDatabase } from './modules/database-sync.js';
import { clearAllTabUpdates } from './modules/diff-highlighting.js';
import { clearNotifications, showLoadSuccessNotification, showNotification } from './modules/notifications.js';
import { bindPaginationEvents, generatePaginationHTML, replaceTableBodyHTML } from './modules/pagination.js';
import { bindRowDragEvents } from './modules/row-sort.js';
import { bindSearchEvents } from './modules/search.js';
import { showSettingsDialog } from './modules/settings-dialog.js';
import { openShortcutDialog } from './modules/shortcut-dialog.js';
import { cleanupRuntimeState, getRuntimeStateStats } from './modules/state-cleanup.js';
import { getSafeTableId, getTableData, processJsonData } from './modules/table-data.js';
import {
  bindTableEvents,
  checkAndUpdateTablePosition,
  insertTableAfterLatestAIMessage,
  performRefreshTable,
  getTableViewState,
  renderDataTable,
  smartUpdateTable,
} from './modules/table-renderer.js';
import { cancelOrderEditing, saveTableOrderFromUI, showOrderMenu } from './modules/table-sort.js';
import { bindTabClickEvents } from './modules/tabs.js';
import {
  getInnerScrollPositionState,
  saveInnerScrollPositionState,
  saveTableExpandedState,
  showThemeMenu,
  toggleNightMode,
} from './modules/theme.js';

export function bootstrapAcuVisualizerTest() {
  'use strict';

  const hostWindow = getParentWindow();
  const hostDocument = hostWindow.document || document;

  try {
    hostWindow.ACUVisualizerTest?.destroy?.();
  } catch (error) {
    console.warn('[ACU TEST] destroy previous instance failed:', error);
  }

  if (hostWindow !== window) {
    try {
      window.ACUVisualizerTest?.destroy?.();
    } catch (error) {
      console.warn('[ACU TEST] destroy previous iframe instance failed:', error);
    }
  }

  const core = getCore();
  const { $ } = core;

  const deps = {};

  const STYLE_FILES = Object.freeze(['table.css', 'search.css']);
  const STYLE_VERSION = new URL(import.meta.url).searchParams.get('v') || 'dev';

  const injectStyles = async () => {
    hostDocument.getElementById('acu-visualizer-test-style-loader')?.remove();

    const style = hostDocument.createElement('style');
    style.id = 'acu-visualizer-test-style-loader';
    style.dataset.source = 'acu_visualizer_test/styles';

    const bundledCss = window.__ACU_VISUALIZER_TEST_BUNDLED_CSS__ || hostWindow.__ACU_VISUALIZER_TEST_BUNDLED_CSS__;
    if (typeof bundledCss === 'string') {
      style.textContent = bundledCss;
      style.dataset.source = 'acu_visualizer_test/bundled';
      style.dataset.version = 'bundled';
      hostDocument.head.appendChild(style);
      return style;
    }

    const cssTexts = [];
    for (const fileName of STYLE_FILES) {
      const cssUrl = `./styles/${fileName}`;
      const versionedCssUrl = `${cssUrl}${cssUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(STYLE_VERSION)}`;
      try {
        const response = await fetch(versionedCssUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        cssTexts.push(`/* ${fileName} */\n${await response.text()}`);
      } catch (error) {
        console.error(`[ACU TEST] 加载 CSS 失败: ${versionedCssUrl}`, error);
      }
    }

    style.textContent = cssTexts.join('\n\n');
    style.dataset.version = STYLE_VERSION;
    hostDocument.head.appendChild(style);
    return style;
  };

  const updateTableContentOnly = () => {
    const rawData = getTableData(core);
    const tables = processJsonData(rawData);
    if (!tables) {
      insertTableAfterLatestAIMessage(deps);
      return;
    }

    Object.keys(tables).forEach(tableName => {
      const tableData = tables[tableName];
      const $tableSection = $(`#acu-table-${getSafeTableId(tableName)}`);
      if (!$tableSection.length) return;
      const tableViewState = getTableViewState(tableData, tableName, deps);
      const paginationHtml = generatePaginationHTML(tableName, tableViewState.filteredTotalCount, tableViewState.currentPage);
      const newTableHtml = renderDataTable(tableData, tableName, { ...deps, tableViewState });
      $tableSection.find('.acu-pagination-container').remove();
      $tableSection.find('.section-title').after(paginationHtml);
      replaceTableBodyHTML($tableSection, newTableHtml);
      bindCellEventsForSection($tableSection, tableName);
      bindPaginationEvents($tableSection, tableName, tableData, deps);
      bindRowDragEvents($tableSection, tableName, deps);
    });
  };

  const bindCellEventsForSection = ($section, tableName) => {
    $section
      .find('.acu-editable-cell')
      .off('click.acu')
      .on('click.acu', function (e) {
        showCellMenu(e, this, deps);
      });
    bindSearchEvents($section, { ...deps, updateTableContentOnly });
    bindRowDragEvents($section, tableName, deps);
  };

  const bindAllTableSectionEvents = () => {
    const rawData = getTableData(core);
    const tables = processJsonData(rawData);
    if (!tables) return;

    Object.keys(tables).forEach(tableName => {
      const $section = $(`#acu-table-${getSafeTableId(tableName)}`);
      if (!$section.length) return;
      bindCellEventsForSection($section, tableName);
      bindPaginationEvents($section, tableName, tables[tableName], deps);
      bindRowDragEvents($section, tableName, deps);
    });
  };

  const getLatestAIMessageId = () => {
    const $latestAIMessage = $('.mes:not(.sys):not(.user)').last();
    if ($latestAIMessage.length) {
      return (
        $latestAIMessage.attr('data-mid') ||
        $latestAIMessage.attr('id') ||
        $latestAIMessage.find('.mes_text').text().substring(0, 50) + Date.now()
      );
    }
    return '';
  };

  const saveCurrentScrollPosition = () => {
    const $contentArea = $('.acu-scroll-container');
    if ($contentArea.length) {
      const scrollTop = $contentArea.scrollTop();
      saveInnerScrollPositionState(scrollTop);
      state.scroll.currentTableScrollTop = scrollTop;
    }
  };

  const resetScrollPositionToTop = () => {
    const $contentArea = $('.acu-scroll-container');
    if ($contentArea.length) {
      $contentArea.scrollTop(0);
      state.scroll.currentTableScrollTop = 0;
      saveInnerScrollPositionState(0);
    }
  };

  const applySavedScrollPositionImmediately = () => {
    const $contentArea = $('.acu-scroll-container');
    if ($contentArea.length) $contentArea.scrollTop(state.scroll.currentTableScrollTop);
  };

  const showRefreshMenu = event => {
    event?.stopPropagation?.();
    event?.preventDefault?.();

    const $existing = $('.acu-refresh-menu');
    if ($existing.length) {
      $existing.each(function () {
        removeWithEvents($(this));
      });
      return;
    }

    $('.acu-refresh-menu').each(function () {
      removeWithEvents($(this));
    });

    const config = getConfig();
    const isNightMode = $('.acu-table-container').hasClass('night-mode');
    const menuHtml = `
      <div class="acu-cell-menu acu-refresh-menu acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}" style="z-index: 10001;">
        <div class="acu-cell-menu-item" data-action="refresh">刷新表格</div>
        <div class="acu-cell-menu-item" data-action="shortcut">快捷选项</div>
        <div class="acu-cell-menu-item close" data-action="close">关闭菜单</div>
      </div>
    `;

    const $menu = $(menuHtml);
    $('body').append($menu);

    const clickX = event?.clientX ?? 0;
    const clickY = event?.clientY ?? 0;
    const menuWidth = $menu.outerWidth();
    const menuHeight = $menu.outerHeight();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let menuX = clickX + 10;
    let menuY = clickY + 10;
    if (menuX + menuWidth > viewportWidth) menuX = clickX - menuWidth - 10;
    if (menuY + menuHeight > viewportHeight) menuY = clickY - menuHeight - 10;
    menuX = Math.max(10, menuX);
    menuY = Math.max(10, menuY);
    $menu.css({ left: `${menuX}px`, top: `${menuY}px`, position: 'fixed' });

    const closeRecords = [];
    const removeCloseListeners = () => {
      closeRecords.splice(0).forEach(record => deps.schedulerRegistry?.removeEventListener?.(record));
    };
    const closeMenu = () => {
      removeCloseListeners();
      removeWithEvents($menu);
    };

    $menu.find('.acu-cell-menu-item').on('click.acu', async function () {
      const action = $(this).data('action');
      closeMenu();
      if (action === 'refresh') performRefreshTable(deps);
      if (action === 'shortcut') await openShortcutDialog(deps);
    });

    const outsideClickHandler = e => {
      if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
        closeMenu();
      }
    };

    setTimeout(() => {
      const iframeRecord = deps.schedulerRegistry?.addEventListener?.(document, 'click', outsideClickHandler);
      if (iframeRecord) closeRecords.push(iframeRecord);
      else document.addEventListener('click', outsideClickHandler);

      if (window.parent?.document && window.parent.document !== document) {
        const parentRecord = deps.schedulerRegistry?.addEventListener?.(
          window.parent.document,
          'click',
          outsideClickHandler,
        );
        if (parentRecord) closeRecords.push(parentRecord);
        else window.parent.document.addEventListener('click', outsideClickHandler);
      }
    }, 100);
  };

  const bindExpandCollapseEvents = () => {
    $('.acu-table-container details')
      .off('toggle.acu')
      .on('toggle.acu', function () {
        const isOpen = $(this).attr('open') !== undefined;
        saveTableExpandedState(isOpen);
        $(this)
          .find('.acu-expand-hint')
          .text(isOpen ? '点击收起' : '点击展开');
      });
  };

  const updateSaveBtnState = () => {
    const $btn = $('#acu-save-db-btn-main');
    if (state.pendingDeletes.size > 0) $btn.addClass('has-pending-deletes');
    else $btn.removeClass('has-pending-deletes');
  };

  Object.assign(deps, {
    core,
    flags: state.flags,
    drag: state.drag,
    currentUserEditMap: state.currentUserEditMap,
    pendingDeletes: state.pendingDeletes,
    rowPositionMapping: state.rowPositionMapping,
    getConfig,
    getCurrentPageForTable,
    savePaginationState,
    getInnerScrollPositionState,
    getTableData: () => getTableData(core),
    processJsonData,
    getSafeTableId,
    getTableViewState: (tableData, tableName) => getTableViewState(tableData, tableName, deps),
    renderDataTable: (tableData, tableName, extraDeps = {}) => renderDataTable(tableData, tableName, { ...deps, ...extraDeps }),
    generatePaginationHTML,
    replaceTableBodyHTML,
    bindCellEventsForSection,
    bindPaginationEvents: ($section, tableName, tableData) =>
      bindPaginationEvents($section, tableName, tableData, deps),
    bindRowDragEvents: ($section, tableName) => bindRowDragEvents($section, tableName, deps),
    bindTabClickEvents: () =>
      bindTabClickEvents({
        ...deps,
        isEditingOrder: () => state.flags.isEditingOrder,
        resetScrollPositionToTop,
        checkAndJumpToLastPageForSummary: () => {},
      }),
    bindExpandCollapseEvents,
    bindAllTableSectionEvents,
    bindTableEvents: () => {
      bindTableEvents(deps);
      bindAllTableSectionEvents();
    },
    insertTableAfterLatestAIMessage: () => insertTableAfterLatestAIMessage(deps),
    updateTableContentOnly,
    smartUpdateTable: forceFullUpdate => smartUpdateTable(forceFullUpdate, deps),
    saveDataToDatabase: (data, updateContext = null) => saveDataToDatabase(data, updateContext, deps),
    showNotification: (message, type) => showNotification(message, type, core),
    showLoadSuccessNotification,
    showCellMenu: (e, cell) => showCellMenu(e, cell, deps),
    showHistoryMenu: (e, cell, tableName, rowIndex, colIndex) =>
      showHistoryMenu(e, cell, tableName, rowIndex, colIndex, deps),
    showSettingsDialog: () => showSettingsDialog(deps),
    showOrderMenu: e => showOrderMenu(e, deps),
    saveTableOrderFromUI: () => saveTableOrderFromUI(deps),
    cancelOrderEditing: () => cancelOrderEditing(deps),
    showThemeMenu: e => showThemeMenu(e, deps),
    toggleNightMode: () => toggleNightMode(core),
    showRefreshMenu: e => showRefreshMenu(e),
    resetScrollPositionToTop,
    saveCurrentScrollPosition,
    applySavedScrollPositionImmediately,
    getLatestAIMessageId,
    cleanupRuntimeState: tableData => cleanupRuntimeState(tableData, state),
    getRuntimeStateStats: () => getRuntimeStateStats(state),
    checkAndUpdateTablePosition: () => checkAndUpdateTablePosition(deps),
    clearAllTabUpdates,
    updateSaveBtnState,
    setCellEditing: value => {
      state.flags.isCellEditing = !!value;
    },
    addStyles: () => injectStyles(),
  });

  const lifecycle = initAcuVisualizerTest(deps);

  const destroyRuntime = () => {
    lifecycle.destroy();

    const selectors = [
      '.acu-table-container',
      '.acu-cell-menu',
      '.acu-order-menu',
      '.acu-edit-overlay',
      '.acu-settings-overlay',
      '.acu-history-overlay',
      '.acu-shortcut-lite-overlay',
      '.acu-notification',
      '#acu-visualizer-test-style-loader',
    ].join(', ');

    try {
      removeTransientUi(core.$, hostDocument);
      core.$?.(selectors)?.off?.('.acu')?.remove?.();
      core.$?.(hostDocument)?.off?.('.acu');
      core.$?.(hostWindow)?.off?.('.acu');
      if (hostWindow !== window) {
        core.$?.(document)?.off?.('.acu');
        core.$?.(window)?.off?.('.acu');
      }
    } catch (error) {
      console.warn('[ACU TEST] destroy jQuery cleanup failed:', error);
    }

    try {
      clearNotifications(core);
    } catch (error) {
      console.warn('[ACU TEST] destroy notification cleanup failed:', error);
    }

    state.flags.isInitialized = false;
    state.flags.isCellEditing = false;
    state.flags.isEditingOrder = false;
    state.flags.isEditingRowOrder = false;
    state.drag.dragStartIndex = -1;
    state.drag.dragEndIndex = -1;
    state.drag.dragInsertIndex = -1;
    state.drag.isDragging = false;
    try {
      cleanupRuntimeState(getTableData(core), state);
    } catch (error) {
      console.warn('[ACU TEST] destroy runtime state cleanup failed:', error);
    }
    state.pendingDeletes.clear();
    state.currentUserEditMap.clear();
    state.currentDiffMap.clear();
  };

  const api = hostWindow.ACUVisualizerTest || {};
  api.version = '10.1.0';
  api.lifecycle = lifecycle;
  api.deps = deps;
  api.destroy = destroyRuntime;
  hostWindow.ACUVisualizerTest = api;
  window.ACUVisualizerTest = api;

  return api;
}
