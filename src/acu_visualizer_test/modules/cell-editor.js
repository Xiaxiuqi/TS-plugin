// ACU Visualizer 测试版单元格编辑模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 showCellMenu()、handleCellAction() 的编辑/插入/删除/恢复/发送输入框逻辑。
// 迁移原则：保留原菜单 class、data-action、插入占位符、pending delete 语义，不夹带优化。

import { getCore } from '../core/bridge.js';
import { acuMenuItemContent } from '../core/constants.js';
import { removeWithEvents } from '../core/dom-cleanup.js';
import { recordCellPreviousValue } from './cell-history.js';
import { formatCellHtml } from './search.js';

export function createEmptyRow(colCount) {
  const newRow = [];
  for (let i = 0; i < colCount; i++) {
    if (i === 1) {
      newRow.push('1');
    } else {
      newRow.push('');
    }
  }
  return newRow;
}

function escapeTextareaValue(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setRowPendingDeletionState($, cell, rowIndex, isPending) {
  const $cell = $(cell);
  if ($cell.closest('.acu-horizontal-data-table').length) {
    const $table = $cell.closest('.acu-horizontal-data-table');
    const $rowCells = $table.find('.acu-horizontal-data-cell').filter(function () {
      return Number($(this).attr('data-original-index')) === rowIndex;
    });
    $rowCells.toggleClass('pending-deletion-cell', isPending);
    return;
  }

  $cell.closest('tr').toggleClass('pending-deletion', isPending);
}

export function generateCellMenuHTML({ config, isNightMode, isPendingDelete, showSendToInput }) {
  return isPendingDelete
    ? `
      <div class="acu-cell-menu acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}">
          <div class="acu-cell-menu-item restore" data-action="restore">${acuMenuItemContent('restore', '恢复整行')}</div>
          <div class="acu-cell-menu-item close" data-action="close">${acuMenuItemContent('close', '关闭菜单')}</div>
      </div>
    `
    : `
      <div class="acu-cell-menu acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}">
          <div class="acu-cell-menu-item edit" data-action="edit">${acuMenuItemContent('edit', '编辑')}</div>
          <div class="acu-cell-menu-item edit" data-action="edit-row">${acuMenuItemContent('edit', '编辑整行')}</div>
          <div class="acu-cell-menu-item history" data-action="history">${acuMenuItemContent('history', '历史记录')}</div>
          <div class="acu-cell-menu-item insert" data-action="insert-above">${acuMenuItemContent('plus', '在上方插入新行')}</div>
          <div class="acu-cell-menu-item insert" data-action="insert">${acuMenuItemContent('plus', '在下方插入新行')}</div>
          <div class="acu-cell-menu-item delete" data-action="delete">${acuMenuItemContent('trash', '删除整行')}</div>
          ${showSendToInput ? `<div class="acu-cell-menu-item sendToInput" data-action="sendToInput">${acuMenuItemContent('send', '发送至输入框')}</div>` : ''}
          <div class="acu-cell-menu-item close" data-action="close">${acuMenuItemContent('close', '关闭菜单')}</div>
      </div>
    `;
}

export function generateEditDialogHTML({ tableName, cellContent, isNightMode }) {
  const escapedTableName = escapeTextareaValue(tableName);
  const dialogStyle = `
            <style>
                .acu-edit-dialog { background: var(--acu-background, #fff); color: var(--acu-text, #333); }
                .acu-edit-overlay.night-mode .acu-edit-dialog { background: #2d2d2d; color: #dbdbd6; }
                .acu-edit-header { background: var(--acu-primary, #5c9dff); color: #fff; padding: 10px 14px; border-radius: 6px 6px 0 0; font-weight: 600; font-size: 14px; }
                .acu-edit-overlay.night-mode .acu-edit-header { background: var(--acu-primary, #8479b8); }
                .acu-edit-textarea { width: 100%; min-height: 120px; padding: 10px; box-sizing: border-box; border: 1px solid var(--acu-border, #ddd); border-radius: 4px; margin: 10px 0; resize: vertical; font-family: inherit; background: #ffffff; color: #333333; }
                .acu-edit-overlay.night-mode .acu-edit-textarea { background: #3a3a3a; color: #dbdbd6; border-color: #555; }
                .acu-edit-textarea:focus { outline: none; border-color: var(--acu-primary, #5c9dff); box-shadow: 0 0 0 2px rgba(92,157,255,0.2); }
                .acu-row-edit-fields { max-height: min(65vh, 620px); overflow-y: auto; padding-right: 4px; }
                .acu-row-edit-field { margin: 10px 0; }
                .acu-row-edit-label { display: block; font-size: 12px; font-weight: 600; opacity: 0.82; margin-bottom: 4px; }
                .acu-row-edit-field .acu-edit-textarea { min-height: 72px; margin: 0; }
                .acu-edit-buttons { display: flex; justify-content: flex-end; gap: 8px; }
                .acu-edit-buttons button { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; border: 1px solid transparent; transition: all 0.2s; }
                .acu-save-btn { background: var(--acu-primary, #5c9dff); color: #fff; }
                .acu-save-btn:hover { filter: brightness(1.1); }
                .acu-cancel-btn { background: var(--acu-secondary, #f0f4f8); color: var(--acu-text, #333); border-color: var(--acu-border, #ddd); }
                .acu-edit-overlay.night-mode .acu-cancel-btn { background: #3a3a3a; color: #dbdbd6; border-color: #555; }
                .acu-cancel-btn:hover { filter: brightness(0.95); }
                .acu-edit-overlay.night-mode .acu-cancel-btn:hover { filter: brightness(1.2); }
            </style>
        `;

  return `
                    <div class="acu-edit-overlay ${isNightMode ? 'night-mode' : ''}">
                        ${dialogStyle}
                        <div class="acu-edit-dialog">
                            <div class="acu-edit-header">编辑单元格内容 - ${escapedTableName}</div>
                            <div class="acu-edit-content">
                                <textarea class="acu-edit-textarea" placeholder="请输入内容...">${escapeTextareaValue(cellContent)}</textarea>
                                <div class="acu-edit-buttons">
                                    <button class="acu-cancel-btn">取消</button>
                                    <button class="acu-save-btn">保存</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
}

export function generateRowEditDialogHTML({ tableName, rowFields, isNightMode }) {
  const escapedTableName = escapeTextareaValue(tableName);
  const baseDialog = generateEditDialogHTML({ tableName, cellContent: '', isNightMode });
  const fieldHtml = rowFields
    .map(
      field => `
        <div class="acu-row-edit-field">
          <label class="acu-row-edit-label" for="acu-row-edit-${field.colIndex}">${escapeTextareaValue(field.label)}</label>
          <textarea id="acu-row-edit-${field.colIndex}" class="acu-edit-textarea acu-row-edit-textarea" data-col-index="${field.colIndex}" placeholder="请输入内容...">${escapeTextareaValue(field.value)}</textarea>
        </div>
      `,
    )
    .join('');

  return baseDialog
    .replace(`编辑单元格内容 - ${escapedTableName}`, `编辑整行内容 - ${escapedTableName}`)
    .replace(
      /<textarea class="acu-edit-textarea" placeholder="请输入内容\.\.\."><\/textarea>/,
      `<div class="acu-row-edit-fields">${fieldHtml}</div>`,
    );
}

function bindEditOverlayCloseHandlers($editOverlay, $, saveEdit, cancelEdit) {
  $editOverlay.find('.acu-save-btn').on('click.acu', saveEdit);
  $editOverlay.find('.acu-cancel-btn').on('click.acu', cancelEdit);

  let editMouseDownOnBg = false;
  $editOverlay
    .on('mousedown.acu', e => {
      editMouseDownOnBg = $(e.target).hasClass('acu-edit-overlay');
    })
    .on('mouseup.acu', e => {
      if (editMouseDownOnBg && $(e.target).hasClass('acu-edit-overlay')) cancelEdit();
      editMouseDownOnBg = false;
    });
}

export function showCellMenu(event, cell, deps = {}) {
  const { $ } = deps.core || getCore();
  $('.acu-cell-menu, .acu-edit-overlay').each(function () {
    removeWithEvents($(this));
  });

  // 兼容清理迁移前可能残留的全局关闭监听。
  if (window.acuCellMenuCloseHandler) {
    document.removeEventListener('click', window.acuCellMenuCloseHandler);
    if (window.parent && window.parent.document) {
      window.parent.document.removeEventListener('click', window.acuCellMenuCloseHandler);
    }
  }

  const tableKey = $(cell).data('table-key');
  const tableName = $(cell).data('table-name');
  const rowIndex = parseInt($(cell).data('row'));
  const colIndex = parseInt($(cell).data('col'));
  const columnName = $(cell).data('col-name') || '';
  const cellContent = $(cell).text().replace(/<br>/g, '\n');
  const isNightMode = $('.acu-table-container').hasClass('night-mode');
  const config = deps.getConfig ? deps.getConfig() : { theme: 'retro' };
  const showSendToInput = columnName.includes('选项');
  const deleteKey = `${tableName}-row-${rowIndex}`;
  const isPendingDelete = deps.pendingDeletes?.has(deleteKey) || false;

  const $menu = $(generateCellMenuHTML({ config, isNightMode, isPendingDelete, showSendToInput }));
  $('body').append($menu);

  const clickX = event.clientX;
  const clickY = event.clientY;
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
  $menu.css({ left: `${menuX}px`, top: `${menuY}px` });
  $menu.data('clickX', clickX);
  $menu.data('clickY', clickY);

  const closeRecords = [];
  const removeCloseListeners = () => {
    closeRecords.splice(0).forEach(record => deps.schedulerRegistry?.removeEventListener?.(record));
    if (window.acuCellMenuCloseHandler) {
      document.removeEventListener('click', window.acuCellMenuCloseHandler);
      if (window.parent && window.parent.document) {
        window.parent.document.removeEventListener('click', window.acuCellMenuCloseHandler);
      }
    }
  };

  $menu.find('.acu-cell-menu-item').on('click.acu', function () {
    const action = $(this).data('action');
    const shouldCloseMenu = true;
    if (action === 'history') {
      const simulatedEvent = {
        clientX: $menu.data('clickX'),
        clientY: $menu.data('clickY'),
        pageX: $menu.data('clickX'),
        pageY: $menu.data('clickY'),
      };
      handleCellAction(action, tableKey, tableName, rowIndex, colIndex, cell, cellContent, simulatedEvent, deps);
    } else {
      handleCellAction(action, tableKey, tableName, rowIndex, colIndex, cell, cellContent, null, deps);
    }
    if (shouldCloseMenu) {
      removeCloseListeners();
      removeWithEvents($menu);
    }
  });

  const closeMenu = e => {
    if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
      removeCloseListeners();
      removeWithEvents($menu);
    }
  };

  window.acuCellMenuCloseHandler = closeMenu;
  setTimeout(() => {
    const listenerOptions = { once: false };
    const iframeRecord = deps.schedulerRegistry?.addEventListener?.(document, 'click', closeMenu, listenerOptions);
    if (iframeRecord) {
      closeRecords.push(iframeRecord);
    } else {
      document.addEventListener('click', closeMenu, listenerOptions);
    }
    if (window.parent && window.parent.document && window.parent.document !== document) {
      const parentRecord = deps.schedulerRegistry?.addEventListener?.(
        window.parent.document,
        'click',
        closeMenu,
        listenerOptions,
      );
      if (parentRecord) {
        closeRecords.push(parentRecord);
      } else {
        window.parent.document.addEventListener('click', closeMenu, listenerOptions);
      }
    }
  }, 100);

  event.stopPropagation();
  event.preventDefault();
}

export async function handleCellAction(
  action,
  tableKey,
  tableName,
  rowIndex,
  colIndex,
  cell,
  cellContent,
  event = null,
  deps = {},
) {
  const { $ } = deps.core || getCore();

  switch (action) {
    case 'history':
      deps.showHistoryMenu?.(event || window.event, cell, tableName, rowIndex, colIndex);
      return;

    case 'edit': {
      const rawData = deps.getTableData?.();
      if (!rawData?.[tableKey]) {
        alert('无法获取数据库数据，编辑失败');
        return;
      }
      const isNightMode = $('.acu-table-container').hasClass('night-mode');
      const $editOverlay = $(generateEditDialogHTML({ tableName, cellContent, isNightMode }));
      $('body').append($editOverlay);
      const $textarea = $editOverlay.find('.acu-edit-textarea');
      $textarea.focus().select();
      deps.setCellEditing?.(true);

      let isSubmitting = false;
      const saveEdit = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        const $saveBtn = $editOverlay.find('.acu-save-btn');
        $saveBtn.prop('disabled', true);
        const newContent = $textarea.val();
        const actualRowIndex = rowIndex + 1;
        const row = rawData?.[tableKey]?.content?.[actualRowIndex];
        const canWriteRawData = Array.isArray(row) && row[colIndex] !== undefined;
        const originalValue = canWriteRawData ? row[colIndex] : undefined;

        if (rawData?.[tableKey]?.content) {
          if (canWriteRawData) row[colIndex] = newContent;
        }

        let saveSuccess = false;
        try {
          saveSuccess = await deps.saveDataToDatabase?.(rawData, {
            type: 'cell_edit',
            tableName,
            rowIndex,
            colIndex,
            newValue: newContent,
          });
        } catch (saveErr) {
          console.warn('[ACU] 单元格编辑保存异常:', saveErr);
          saveSuccess = false;
        }

        if (saveSuccess) {
          removeWithEvents($editOverlay);
          deps.setCellEditing?.(false);
          $(cell).html(formatCellHtml(newContent));
          deps.currentUserEditMap?.add(`${tableName}-${rowIndex}-${colIndex}`);
          if (String(cellContent ?? '') !== String(newContent ?? '')) {
            recordCellPreviousValue(tableName, rowIndex, colIndex, cellContent);
          }
          $(cell).addClass('acu-highlight-user-edit');
        } else {
          if (canWriteRawData) row[colIndex] = originalValue;
          isSubmitting = false;
          $saveBtn.prop('disabled', false);
          deps.showNotification?.('保存失败，单元格内容未应用到本地', 'error');
        }
      };

      const cancelEdit = () => {
        removeWithEvents($editOverlay);
        deps.setCellEditing?.(false);
      };

      bindEditOverlayCloseHandlers($editOverlay, $, saveEdit, cancelEdit);
      $textarea.on('keydown.acu', function (e) {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });
      break;
    }

    case 'edit-row': {
      const rawData = deps.getTableData?.();
      if (!rawData?.[tableKey]?.content) {
        alert('无法获取数据库数据，编辑整行失败');
        return;
      }

      const headers = rawData[tableKey].content[0] || [];
      const actualRowIndex = rowIndex + 1;
      const rowData = rawData[tableKey].content[actualRowIndex];
      if (!Array.isArray(rowData)) {
        alert('无法获取行数据，编辑整行失败');
        return;
      }

      const rowFields = rowData
        .map((value, index) => ({
          header: headers[index] || '',
          label: headers[index] || `第${index}列（无表头）`,
          colIndex: index,
          value: value ?? '',
        }))
        .filter(field => field.colIndex > 0);

      if (rowFields.length === 0) {
        alert('当前行没有可编辑的可见列');
        return;
      }

      const isNightMode = $('.acu-table-container').hasClass('night-mode');
      const $editOverlay = $(generateRowEditDialogHTML({ tableName, rowFields, isNightMode }));
      $('body').append($editOverlay);
      const $textareas = $editOverlay.find('.acu-row-edit-textarea');
      $textareas.first().focus().select();
      deps.setCellEditing?.(true);

      let isSubmitting = false;
      const saveEdit = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        const $saveBtn = $editOverlay.find('.acu-save-btn');
        $saveBtn.prop('disabled', true);

        const rowUpdate = {};
        const newRowValues = new Map();
        const headerCounts = {};
        headers.forEach(header => {
          if (!header) return;
          headerCounts[header] = (headerCounts[header] || 0) + 1;
        });
        let forceBulkFallback = false;

        $textareas.each(function () {
          const fieldColIndex = parseInt($(this).data('col-index'), 10);
          const header = headers[fieldColIndex] || '';
          const newValue = $(this).val();
          newRowValues.set(fieldColIndex, newValue);
          if (!header || headerCounts[header] > 1) {
            forceBulkFallback = true;
            return;
          }
          rowUpdate[header] = newValue;
        });

        const originalRowData = rowData.slice();
        newRowValues.forEach((newValue, fieldColIndex) => {
          rowData[fieldColIndex] = newValue;
        });

        const $row = $(cell).closest('tr');
        let saveSuccess = false;
        try {
          saveSuccess = await deps.saveDataToDatabase?.(rawData, {
            type: 'row_edit',
            tableName,
            rowIndex,
            rowData: rowUpdate,
            forceBulkFallback,
          });
        } catch (saveErr) {
          console.warn('[ACU] 整行编辑保存异常:', saveErr);
          saveSuccess = false;
        }

        if (saveSuccess) {
          removeWithEvents($editOverlay);
          deps.setCellEditing?.(false);
          $row.find('.acu-editable-cell').each(function () {
            const fieldColIndex = parseInt($(this).data('col'), 10);
            if (!newRowValues.has(fieldColIndex)) return;
            $(this).html(formatCellHtml(newRowValues.get(fieldColIndex)));
          });
          newRowValues.forEach((newValue, fieldColIndex) => {
            deps.currentUserEditMap?.add(`${tableName}-${rowIndex}-${fieldColIndex}`);
          });
          $row.find('.acu-editable-cell').addClass('acu-highlight-user-edit');
        } else {
          rowData.splice(0, rowData.length, ...originalRowData);
          isSubmitting = false;
          $saveBtn.prop('disabled', false);
          deps.showNotification?.('保存失败，整行内容未应用到本地', 'error');
        }
      };

      const cancelEdit = () => {
        removeWithEvents($editOverlay);
        deps.setCellEditing?.(false);
      };

      bindEditOverlayCloseHandlers($editOverlay, $, saveEdit, cancelEdit);
      $textareas.on('keydown.acu', function (e) {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });
      break;
    }

    case 'insert-above':
    case 'insert': {
      try {
        const rawData = deps.getTableData?.();
        if (!rawData?.[tableKey]) {
          alert('无法获取表格数据');
          return;
        }
        const headers = rawData[tableKey].content[0] || [];
        const newRow = createEmptyRow(headers.length);
        const insertIndex = action === 'insert-above' ? rowIndex + 1 : rowIndex + 2;
        rawData[tableKey].content.splice(insertIndex, 0, newRow);
        const editRowIndex = action === 'insert-above' ? rowIndex : rowIndex + 1;
        deps.currentUserEditMap?.add(`${tableName}-${editRowIndex}-1`);
        const saveSuccess = await deps.saveDataToDatabase?.(rawData);
        if (saveSuccess) {
          deps.showNotification?.(
            action === 'insert-above'
              ? '已成功在上方添加新行（第一列已填入占位符"1"）'
              : '已成功在下方添加新行（第一列已填入占位符"1"）',
            'success',
          );
          deps.smartUpdateTable?.(true);
        }
      } catch (e) {
        console.error('添加新行失败:', e);
        alert('添加新行失败：' + e.message);
      }
      break;
    }

    case 'delete': {
      const deleteKey = `${tableName}-row-${rowIndex}`;
      deps.pendingDeletes?.add(deleteKey);
      setRowPendingDeletionState($, cell, rowIndex, true);
      deps.updateSaveBtnState?.();
      deps.showNotification?.(`已标记第${rowIndex + 1}行为待删除，点击保存到数据库生效`, 'warning');
      break;
    }

    case 'restore': {
      const restoreKey = `${tableName}-row-${rowIndex}`;
      deps.pendingDeletes?.delete(restoreKey);
      setRowPendingDeletionState($, cell, rowIndex, false);
      deps.updateSaveBtnState?.();
      deps.showNotification?.(`已恢复第${rowIndex + 1}行`, 'success');
      break;
    }

    case 'sendToInput':
      try {
        const textToSend = cellContent || '';
        const input = parent.document.getElementById('send_textarea');
        if (input) {
          const currentValue = input.value || '';
          const finalValue = currentValue ? `${currentValue}\n${textToSend}` : textToSend;
          input.value = finalValue;

          const host$ = parent.jQuery || window.jQuery;
          if (host$) {
            host$(input).trigger('input').trigger('change');
          } else {
            const HostEvent = parent.Event || Event;
            input.dispatchEvent(new HostEvent('input', { bubbles: true }));
            input.dispatchEvent(new HostEvent('change', { bubbles: true }));
          }

          try {
            const context = parent.SillyTavern?.getContext?.();
            if (context) {
              context.input = finalValue;
            }
          } catch {
            // SillyTavern context sync is best-effort; DOM input update already succeeded.
          }

          deps.showNotification?.('已发送至输入框', 'success');
        } else {
          deps.showNotification?.('未找到输入框元素', 'warning');
        }
      } catch (error) {
        console.error('发送至输入框失败:', error);
        deps.showNotification?.('发送失败: ' + error.message, 'error');
      }
      break;
  }
}
