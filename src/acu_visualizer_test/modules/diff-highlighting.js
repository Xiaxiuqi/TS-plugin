// ACU Visualizer 测试版差异与高亮模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 generateDataHash()、generateDiffMap()、高亮判断和标签状态逻辑。
// 迁移原则：只迁移判断逻辑，不改变高亮 key 格式，不改变历史记录或标签状态数据格式，不夹带优化。

import { DEFAULT_TAB_STATUS, STORAGE_KEYS } from '../core/constants.js';
import { state } from '../core/state.js';
import { loadSnapshot } from '../core/storage.js';

export function generateDataHash(data) {
  if (!data) return '';
  try {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  } catch (e) {
    return '';
  }
}

export function getTabStatus() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TAB_STATUS);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

export function saveTabStatus(status) {
  try {
    localStorage.setItem(STORAGE_KEYS.TAB_STATUS, JSON.stringify(status));
  } catch (e) {
    console.error('保存标签状态失败:', e);
  }
}

export function getSingleTabStatus(tableName) {
  const status = getTabStatus();
  return status[tableName] ? { ...DEFAULT_TAB_STATUS, ...status[tableName] } : { ...DEFAULT_TAB_STATUS };
}

export function updateTabStatus(tableName, updates) {
  const status = getTabStatus();
  if (!status[tableName]) {
    status[tableName] = { ...DEFAULT_TAB_STATUS };
  }
  status[tableName] = { ...status[tableName], ...updates };
  saveTabStatus(status);
  return status[tableName];
}

export function shouldShowBadge(tableName) {
  const tabStatus = getSingleTabStatus(tableName);
  return tabStatus.hasNewUpdates && !tabStatus.userHasSeen && tabStatus.lastViewedHash !== tabStatus.currentUpdateHash;
}

export function markTabAsSeen(tableName) {
  const status = getSingleTabStatus(tableName);
  return updateTabStatus(tableName, {
    userHasSeen: true,
    lastViewedHash: status.currentUpdateHash,
  });
}

export function resetAllTabsSeenStatus() {
  // 与原脚本一致：此函数在 diff 之前调用，不再无脑重置 userHasSeen，由 setTabUpdateStatus 接管。
}

export function setTabUpdateStatus(tableName, hasUpdates, updateHash = '') {
  const status = getSingleTabStatus(tableName);

  const updates = {
    hasNewUpdates: hasUpdates,
    currentUpdateHash: updateHash,
  };

  if (hasUpdates && updateHash && updateHash !== status.lastViewedHash) {
    updates.userHasSeen = false;
  }

  return updateTabStatus(tableName, updates);
}

export function clearAllTabUpdates() {
  const status = getTabStatus();
  Object.keys(status).forEach(tableName => {
    status[tableName].hasNewUpdates = false;
    status[tableName].userHasSeen = false;
  });
  saveTabStatus(status);
}

export function generateDiffMap(
  currentData,
  { lastData = loadSnapshot(), setTabUpdateStatusFn = setTabUpdateStatus, addCellHistory } = {},
) {
  const diffSet = new Set();
  const tableHashes = new Map();

  Object.keys(currentData || {}).forEach(sheetId => {
    const newSheet = currentData[sheetId];
    if (newSheet?.name) {
      tableHashes.set(newSheet.name, generateDataHash(newSheet.content || []));
    }
  });

  for (const sheetId in currentData) {
    const newSheet = currentData[sheetId];
    const oldSheet = lastData ? lastData[sheetId] : null;
    if (!newSheet || !newSheet.name) continue;
    const tableName = newSheet.name;

    if (!oldSheet) {
      if (newSheet.content) {
        newSheet.content.forEach((row, rIdx) => {
          if (rIdx > 0) {
            diffSet.add(`${tableName}-row-${rIdx - 1}`);
          }
        });
      }
      continue;
    }

    const newRows = newSheet.content || [];
    const oldRows = oldSheet.content || [];

    newRows.forEach((row, rIdx) => {
      if (rIdx === 0) return;
      const oldRow = oldRows[rIdx];
      if (!oldRow) {
        diffSet.add(`${tableName}-row-${rIdx - 1}`);
      } else {
        row.forEach((cell, cIdx) => {
          if (cIdx === 0) return;
          const oldCell = oldRow[cIdx];
          if (String(cell) !== String(oldCell)) {
            diffSet.add(`${tableName}-${rIdx - 1}-${cIdx}`);
          }
        });
      }
    });
  }

  tableHashes.forEach((hash, name) => {
    const hasDiff = Array.from(diffSet).some(k => k.startsWith(`${name}-`));
    setTabUpdateStatusFn(name, hasDiff, hash);
  });

  for (const sheetId in currentData) {
    const newSheet = currentData[sheetId];
    const oldSheet = lastData ? lastData[sheetId] : null;
    if (!newSheet || !newSheet.name) continue;
    const tableName = newSheet.name;

    if (oldSheet) {
      const newRows = newSheet.content || [];
      const oldRows = oldSheet.content || [];

      newRows.forEach((row, rIdx) => {
        if (rIdx === 0) return;
        const oldRow = oldRows[rIdx];
        if (oldRow) {
          row.forEach((cell, cIdx) => {
            if (cIdx === 0) return;
            const oldCell = oldRow[cIdx];
            if (String(cell) !== String(oldCell) && typeof addCellHistory === 'function') {
              addCellHistory(tableName, rIdx - 1, cIdx, String(oldCell));
            }
          });
        }
      });
    }
  }

  return diffSet;
}

export function isCellUserEdited(tableName, rowIndex, colIndex, userEditMap = state.currentUserEditMap) {
  return userEditMap.has(`${tableName}-${rowIndex}-${colIndex}`);
}

export function isCellDBUpdated(tableName, rowIndex, colIndex, diffMap = state.currentDiffMap) {
  const cellKey = `${tableName}-${rowIndex}-${colIndex}`;
  const rowKey = `${tableName}-row-${rowIndex}`;
  return diffMap.has(cellKey) || diffMap.has(rowKey);
}
