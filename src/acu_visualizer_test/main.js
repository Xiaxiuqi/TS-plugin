// ACU Visualizer 测试版模块化入口
// 来源：public/acu_visualizer/acu_visualizer-test.js 尾部 IIFE 初始化结构。
// 迁移原则：仅组装测试版生命周期入口，不接入正式插件，不夹带优化。

import { getCore, getParentWindow } from './core/bridge.js';
import { initAcuVisualizerTest } from './core/lifecycle.js';
import { state } from './core/state.js';
import { getConfig } from './core/storage.js';
import { showCellMenu } from './modules/cell-editor.js';
import { saveDataToDatabase } from './modules/database-sync.js';
import { clearAllTabUpdates } from './modules/diff-highlighting.js';
import { showLoadSuccessNotification, showNotification } from './modules/notifications.js';
import { bindPaginationEvents, generatePaginationHTML } from './modules/pagination.js';
import { bindRowDragEvents } from './modules/row-sort.js';
import { bindSearchEvents } from './modules/search.js';
import { showSettingsDialog } from './modules/settings-dialog.js';
import { getSafeTableId, getTableData, processJsonData } from './modules/table-data.js';
import {
  bindTableEvents,
  checkAndUpdateTablePosition,
  insertTableAfterLatestAIMessage,
  performRefreshTable,
  renderDataTable,
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
      const currentPage = deps.getCurrentPageForTable ? deps.getCurrentPageForTable(tableName) : 0;
      const paginationHtml = generatePaginationHTML(tableName, tableData.rows ? tableData.rows.length : 0, currentPage);
      const newTableHtml = renderDataTable(tableData, tableName, deps);
      $tableSection.find('.acu-pagination-container').remove();
      $tableSection.find('.section-title').after(paginationHtml);
      $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);
      bindCellEventsForSection($tableSection, tableName);
      bindPaginationEvents($tableSection, tableName, tableData, deps);
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
    getConfig,
    getInnerScrollPositionState,
    getTableData: () => getTableData(core),
    processJsonData,
    getSafeTableId,
    renderDataTable,
    generatePaginationHTML,
    bindCellEventsForSection,
    bindPaginationEvents,
    bindRowDragEvents,
    bindTabClickEvents: () =>
      bindTabClickEvents({
        ...deps,
        isEditingOrder: () => state.flags.isEditingOrder,
        resetScrollPositionToTop,
        checkAndJumpToLastPageForSummary: () => {},
      }),
    bindExpandCollapseEvents,
    bindTableEvents: () => bindTableEvents(deps),
    insertTableAfterLatestAIMessage: () => insertTableAfterLatestAIMessage(deps),
    updateTableContentOnly,
    saveDataToDatabase: data => saveDataToDatabase(data, null, deps),
    showNotification: (message, type) => showNotification(message, type, core),
    showLoadSuccessNotification,
    showCellMenu: (e, cell) => showCellMenu(e, cell, deps),
    showSettingsDialog: () => showSettingsDialog(deps),
    showOrderMenu: e => showOrderMenu(e, deps),
    saveTableOrderFromUI: () => saveTableOrderFromUI(deps),
    cancelOrderEditing: () => cancelOrderEditing(deps),
    showThemeMenu: e => showThemeMenu(e, deps),
    toggleNightMode: () => toggleNightMode(core),
    showRefreshMenu: e => {
      e?.stopPropagation?.();
      performRefreshTable(deps);
    },
    resetScrollPositionToTop,
    saveCurrentScrollPosition,
    applySavedScrollPositionImmediately,
    getLatestAIMessageId,
    checkAndUpdateTablePosition: () => checkAndUpdateTablePosition(deps),
    clearAllTabUpdates,
    updateSaveBtnState,
    addStyles: () => injectStyles(),
  });

  const lifecycle = initAcuVisualizerTest(deps);

  const api = hostWindow.ACUVisualizerTest || {};
  api.version = 'modular-test-migration';
  api.lifecycle = lifecycle;
  api.deps = deps;
  api.destroy = function destroy() {
    lifecycle.destroy();
    hostDocument.getElementById('acu-visualizer-test-style-loader')?.remove();
  };
  hostWindow.ACUVisualizerTest = api;
  window.ACUVisualizerTest = api;

  return api;
}

if (!window.__ACU_VISUALIZER_TEST_LOADER_IMPORTING__) {
  bootstrapAcuVisualizerTest();
}
