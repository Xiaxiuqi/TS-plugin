// ACU Visualizer 测试版数据库同步模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 saveDataToDatabase()。
// 迁移原则：保留精准 API 优先、全量保存后备、删除倒序、保存后状态清理语义，不夹带优化。

import { getCore } from '../core/bridge.js';
import { UpdateController, getPendingDeletions, savePendingDeletions, state } from '../core/state.js';
import { generateDataHash, generateDiffMap } from './diff-highlighting.js';

export function collectRowUpdates(currentUserEditMap = state.currentUserEditMap, updateContext = null) {
  const hasCellEdit = updateContext && updateContext.type === 'cell_edit';
  const rowUpdates = {};

  currentUserEditMap.forEach(key => {
    const match = key.match(/(.+)-(\d+)-(\d+)/);
    if (match) {
      const [, tableName, rowIdxStr] = match;
      const rowIdx = parseInt(rowIdxStr, 10);
      if (hasCellEdit && updateContext.tableName === tableName && updateContext.rowIndex === rowIdx) return;
      if (!rowUpdates[tableName]) rowUpdates[tableName] = new Set();
      rowUpdates[tableName].add(rowIdx);
    }
  });

  return rowUpdates;
}

export function applyPendingDeletesToTableData(tableData, deletions) {
  Object.keys(deletions || {}).forEach(tableName => {
    for (const sheetId in tableData) {
      if (sheetId === 'mate') continue;
      const sheet = tableData[sheetId];
      if (sheet?.name === tableName && sheet.content) {
        const indexesToDelete = deletions[tableName].map(i => parseInt(i, 10)).sort((a, b) => b - a);
        indexesToDelete.forEach(rowIndex => {
          const actualRowIndex = rowIndex + 1;
          if (sheet.content[actualRowIndex]) sheet.content.splice(actualRowIndex, 1);
        });
        break;
      }
    }
  });
}

export async function saveDataToDatabase(tableData, updateContext = null, deps = {}) {
  if (state.flags.isSaving) return false;

  return await UpdateController.runSilently(async () => {
    state.flags.isSaving = true;
    const api = deps.api || (deps.core || getCore()).getDB();
    let saveSuccessful = false;
    let usedMethod = 'none';
    let needsBulkFallback = false;

    try {
      if (api) {
        const hasCellEdit = updateContext && updateContext.type === 'cell_edit';
        const deletions = getPendingDeletions(state.pendingDeletes);
        const hasDeletes = Object.keys(deletions).length > 0;
        const rowUpdates = collectRowUpdates(state.currentUserEditMap, updateContext);
        const hasRowUpdates = Object.keys(rowUpdates).length > 0;

        if (hasCellEdit) {
          try {
            const { tableName, rowIndex, colIndex, newValue } = updateContext;
            const success = await api.updateCell(tableName, rowIndex + 1, colIndex, newValue);
            if (success) {
              saveSuccessful = true;
              usedMethod = 'api_updateCell';
            } else needsBulkFallback = true;
          } catch (e) {
            console.warn('[ACU-API] updateCell 异常:', e);
            needsBulkFallback = true;
          }
        }

        if (hasDeletes && !needsBulkFallback) {
          try {
            let allDeletesSuccess = true;
            for (const tableName of Object.keys(deletions)) {
              const sortedIndices = deletions[tableName].map(i => parseInt(i, 10)).sort((a, b) => b - a);
              for (const rowIndex of sortedIndices) {
                const success = await api.deleteRow(tableName, rowIndex + 1);
                if (!success) {
                  allDeletesSuccess = false;
                  break;
                }
              }
              if (!allDeletesSuccess) break;
            }
            if (allDeletesSuccess) {
              saveSuccessful = true;
              usedMethod = usedMethod === 'none' ? 'api_deleteRow' : `${usedMethod}+deleteRow`;
            } else {
              needsBulkFallback = true;
              saveSuccessful = false;
            }
          } catch (e) {
            console.warn('[ACU-API] deleteRow 异常:', e);
            needsBulkFallback = true;
            saveSuccessful = false;
          }
        }

        if (hasRowUpdates && !needsBulkFallback) {
          try {
            let allUpdatesSuccess = true;
            for (const tableName of Object.keys(rowUpdates)) {
              const sheet = Object.values(tableData).find(s => s?.name === tableName);
              if (!sheet?.content) continue;
              const headers = sheet.content[0] || [];
              for (const rowIndex of rowUpdates[tableName]) {
                const rowData = sheet.content[rowIndex + 1];
                if (!rowData) continue;
                const updateObj = {};
                headers.forEach((header, colIdx) => {
                  if (header) updateObj[header] = rowData[colIdx];
                });
                const success = await api.updateRow(tableName, rowIndex + 1, updateObj);
                if (!success) {
                  allUpdatesSuccess = false;
                  break;
                }
              }
              if (!allUpdatesSuccess) break;
            }
            if (allUpdatesSuccess) {
              saveSuccessful = true;
              usedMethod = usedMethod === 'none' ? 'api_updateRow' : `${usedMethod}+updateRow`;
            } else {
              needsBulkFallback = true;
              saveSuccessful = false;
            }
          } catch (e) {
            console.warn('[ACU-API] updateRow 异常:', e);
            needsBulkFallback = true;
            saveSuccessful = false;
          }
        }

        if (!hasCellEdit && !hasDeletes && !hasRowUpdates && !saveSuccessful) needsBulkFallback = true;
      } else {
        needsBulkFallback = true;
      }

      if ((!saveSuccessful || needsBulkFallback) && api && typeof api.importTableAsJson === 'function') {
        try {
          applyPendingDeletesToTableData(tableData, getPendingDeletions(state.pendingDeletes));
          const apiSuccess = await api.importTableAsJson(JSON.stringify(tableData));
          if (apiSuccess) {
            saveSuccessful = true;
            usedMethod = 'api_bulk_importTableAsJson';
          }
        } catch (bulkErr) {
          console.warn('[ACU-API] 全量保存异常:', bulkErr);
        }
      }

      if (saveSuccessful) {
        if (api && typeof api.refreshDataAndWorldbook === 'function') {
          try {
            await api.refreshDataAndWorldbook();
          } catch (refreshErr) {
            console.warn('[ACU-SAVE] 世界书刷新失败 (非致命):', refreshErr);
          }
        }

        state.pendingDeletes.clear();
        savePendingDeletions({}, state.pendingDeletes);
        state.currentUserEditMap.clear();
        state.hashes.lastTableDataHash = generateDataHash(tableData);
        deps.showNotification?.(`保存成功！(${usedMethod})`, 'success');

        setTimeout(() => {
          const { $ } = deps.core || getCore();
          if (typeof $ !== 'undefined') $('.pending-deletion').removeClass('pending-deletion');
          state.currentDiffMap = generateDiffMap(tableData);
          if (typeof deps.updateTableContentOnly === 'function') deps.updateTableContentOnly();
          else if (typeof deps.insertTableAfterLatestAIMessage === 'function') deps.insertTableAfterLatestAIMessage();
          deps.updateSaveBtnState?.();
        }, 50);
        return true;
      }

      console.error('[ACU-SAVE] ✗ 所有保存方案均失败');
      alert('保存失败：精准API和全量保存均失败。\n请检查控制台日志 (F12) 获取详细信息。');
      return false;
    } catch (e) {
      console.error('[ACU-SAVE] 保存全过程捕获异常:', e);
      alert('保存出错：' + e.message);
      return false;
    } finally {
      state.flags.isSaving = false;
    }
  });
}
