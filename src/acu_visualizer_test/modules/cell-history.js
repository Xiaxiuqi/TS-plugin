// ACU Visualizer 测试版单元格历史模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 getCellHistory*、addCellHistory()、showHistoryMenu()。
// 迁移原则：保留原 key、隔离逻辑、历史条数上限、DOM class 与恢复流程，不夹带优化。

import { getCore, getIsolationKey } from '../core/bridge.js';
import { STORAGE_KEYS } from '../core/constants.js';
import { removeWithEvents } from '../core/dom-cleanup.js';
import { safeLocalStorageSet } from '../core/storage.js';

export function getCellHistoryAll() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CELL_HISTORY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('[ACU] 读取历史失败:', e);
    return {};
  }
}

export function saveCellHistoryAll(history) {
  try {
    const json = JSON.stringify(history);
    safeLocalStorageSet(STORAGE_KEYS.CELL_HISTORY, json);
  } catch (e) {
    console.error('[ACU] 保存历史失败:', e);
  }
}

export function getCellHistory(tableName, rowIndex, colIndex) {
  const allHistory = getCellHistoryAll();
  const key = `${tableName}-${rowIndex}-${colIndex}`;
  const cellHistory = allHistory[key] || [];
  const currentIsolationKey = getIsolationKey();
  return cellHistory.filter(item => {
    const itemIsolationKey = item.isolationKey || '';
    return itemIsolationKey === currentIsolationKey;
  });
}

export function addCellHistory(tableName, rowIndex, colIndex, value) {
  const allHistory = getCellHistoryAll();
  const key = `${tableName}-${rowIndex}-${colIndex}`;
  let history = allHistory[key] || [];
  const currentIsolationKey = getIsolationKey();

  history = history.filter(item => {
    const itemIsolationKey = item.isolationKey || '';
    return !(itemIsolationKey === currentIsolationKey && item.value === value);
  });

  history.unshift({
    value: value,
    timestamp: Date.now(),
    isolationKey: currentIsolationKey,
  });

  const countByIsolationKey = {};
  history = history.filter(item => {
    const itemIsolationKey = item.isolationKey || '';
    countByIsolationKey[itemIsolationKey] = (countByIsolationKey[itemIsolationKey] || 0) + 1;
    return countByIsolationKey[itemIsolationKey] <= 10;
  });

  allHistory[key] = history;
  saveCellHistoryAll(allHistory);
  return history.filter(item => (item.isolationKey || '') === currentIsolationKey);
}

export function recordCellPreviousValue(tableName, rowIndex, colIndex, previousValue) {
  return addCellHistory(tableName, rowIndex, colIndex, previousValue);
}

export function migrateCurrentValueHistoryToPreviousValue(tableName, rowIndex, colIndex, currentValue, previousValue) {
  const allHistory = getCellHistoryAll();
  const key = `${tableName}-${rowIndex}-${colIndex}`;
  const currentIsolationKey = getIsolationKey();
  const history = allHistory[key] || [];
  const currentValueText = String(currentValue ?? '');
  const previousValueText = String(previousValue ?? '');

  allHistory[key] = history.map(item =>
    (item.isolationKey || '') === currentIsolationKey && String(item.value) === currentValueText
      ? { ...item, value: previousValueText, timestamp: item.timestamp || Date.now() }
      : item,
  );
  saveCellHistoryAll(allHistory);
  return getCellHistory(tableName, rowIndex, colIndex);
}

export function escapeHistoryValue(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

export function generateHistoryDialogHTML(history, tableName, { isNightMode = false, theme = 'retro' } = {}) {
  let dialogHtml = `
      <div class="acu-history-overlay ${isNightMode ? 'night-mode' : ''} acu-theme-${theme}">
        <div class="acu-history-dialog">
          <div class="acu-history-header">
            <h3><i class="fas fa-history" style="margin-right: 8px;"></i>历史记录 - ${tableName}</h3>
            <button class="acu-history-close" title="关闭"><i class="fas fa-times"></i></button>
          </div>
                <div class="acu-history-content">
                    <div class="acu-history-info">
                        <span>共 ${history.length} 条记录</span>
                        <span>最多保留 10 条</span>
                    </div>

                    <div class="acu-history-list">`;

  history.forEach((item, idx) => {
    const date = new Date(item.timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const escapedValue = escapeHistoryValue(item.value);
    dialogHtml += `
            <div class="acu-history-item" data-value="${String(item.value).replace(/"/g, '&quot;')}" data-index="${idx}">
                <div class="acu-history-item-header">
                    <span class="acu-history-item-number">#${idx + 1}</span>
                    <span class="acu-history-item-date">${date}</span>
                </div>
                <div class="acu-history-item-content">${escapedValue}</div>
            </div>`;
  });

  dialogHtml += `
                    </div>
                </div>

                <div class="acu-history-footer">
                    <div class="acu-history-hint">点击任一记录可恢复该值</div>
                    <button class="acu-btn acu-btn-secondary acu-history-close-btn">关闭</button>
                </div>
            </div>
        </div>`;

  return dialogHtml;
}

export function showHistoryMenu(event, cell, tableName, rowIndex, colIndex, deps = {}) {
  const { $ } = deps.core || getCore();
  const history = getCellHistory(tableName, rowIndex, colIndex);

  if (!history || history.length === 0) {
    deps.showNotification?.('暂无历史记录', 'info');
    return;
  }

  const isNightMode = $('.acu-table-container').hasClass('night-mode');
  const config = deps.getConfig ? deps.getConfig() : { theme: 'retro' };
  const $dialog = $(generateHistoryDialogHTML(history, tableName, { isNightMode, theme: config.theme }));
  $('body').append($dialog);

  const closeDialog = () => removeWithEvents($dialog);

  $dialog.find('.acu-history-item').on('click.acu', async function () {
    const value = history[parseInt($(this).attr('data-index'), 10)]?.value ?? $(this).attr('data-value');
    const strValue = String(value || '');
    const currentValue = $(cell).text().replace(/<br>/g, '\n');
    $(cell).html(strValue.replace(/\n/g, '<br>'));
    deps.currentUserEditMap?.add(`${tableName}-${rowIndex}-${colIndex}`);
    if (String(currentValue ?? '') !== String(strValue ?? '')) {
      addCellHistory(tableName, rowIndex, colIndex, currentValue);
    }

    const rawData = deps.getTableData?.();
    const tableKey = $(cell).data('table-key');
    if (rawData?.[tableKey]?.content) {
      const actualRowIndex = rowIndex + 1;
      if (rawData[tableKey].content[actualRowIndex]?.[colIndex] !== undefined) {
        rawData[tableKey].content[actualRowIndex][colIndex] = strValue;
      }
    }

    await deps.saveDataToDatabase?.(rawData, {
      type: 'cell_edit',
      tableName,
      rowIndex,
      colIndex,
      newValue: strValue,
    });

    closeDialog();
    deps.showNotification?.('已恢复历史值,标记为用户编辑', 'success');
  });

  $dialog.find('.acu-history-close, .acu-history-close-btn').on('click.acu', closeDialog);
  $dialog.on('click.acu', function (e) {
    if ($(e.target).hasClass('acu-history-overlay')) {
      closeDialog();
    }
  });
}