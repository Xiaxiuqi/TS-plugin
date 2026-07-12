// ACU Visualizer 测试版存储模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中配置、分页、快照、存储清理、历史读写相关逻辑。
// 迁移原则：只迁移原有 localStorage 读写行为，不改变 key，不改变数据格式，不夹带内存优化。

import { DEFAULT_CLEANUP_SETTINGS, DEFAULT_CONFIG, STORAGE_KEYS, STORAGE_SIZE_LIMIT_MB, THEMES } from './constants.js';

const VALID_THEME_IDS = new Set(THEMES.map(theme => theme.id));
const MIN_TABLE_FONT_SIZE = 10;
const MAX_TABLE_FONT_SIZE = 24;

function normalizeTableFontSize(value, fallback) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    return fallback;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(MAX_TABLE_FONT_SIZE, Math.max(MIN_TABLE_FONT_SIZE, numericValue))
    : fallback;
}

export function normalizeConfig(config = DEFAULT_CONFIG) {
  const merged = { ...DEFAULT_CONFIG, ...(config && typeof config === 'object' ? config : {}) };
  const theme =
    typeof merged.theme === 'string' && VALID_THEME_IDS.has(merged.theme) ? merged.theme : DEFAULT_CONFIG.theme;
  const horizontalTables = Array.isArray(merged.horizontalTables)
    ? Array.from(
        new Set(
          merged.horizontalTables.filter(tableName => typeof tableName === 'string' && tableName.trim().length > 0),
        ),
      )
    : [];
  return {
    ...merged,
    theme,
    horizontalTables,
    columnHeaderFontSize: normalizeTableFontSize(merged.columnHeaderFontSize, DEFAULT_CONFIG.columnHeaderFontSize),
    tabFontSize: normalizeTableFontSize(merged.tabFontSize, DEFAULT_CONFIG.tabFontSize),
    tableDataFontSize: normalizeTableFontSize(merged.tableDataFontSize, DEFAULT_CONFIG.tableDataFontSize),
  };
}

export const CRITICAL_SETTINGS = Object.freeze([
  STORAGE_KEYS.NIGHT_MODE,
  STORAGE_KEYS.UI_CONFIG,
  STORAGE_KEYS.TABLE_ORDER,
  STORAGE_KEYS.TABLE_EXPANDED,
  STORAGE_KEYS.ACTIVE_TAB,
  STORAGE_KEYS.CLEANUP_SETTINGS,
]);

export function getConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.UI_CONFIG);
    return normalizeConfig(saved ? JSON.parse(saved) : DEFAULT_CONFIG);
  } catch (e) {
    return normalizeConfig(DEFAULT_CONFIG);
  }
}

export function saveConfig(newConfig, { applyThemeStyles } = {}) {
  try {
    const current = getConfig();
    const merged = normalizeConfig({ ...current, ...newConfig });
    localStorage.setItem(STORAGE_KEYS.UI_CONFIG, JSON.stringify(merged));
    if (typeof applyThemeStyles === 'function') {
      applyThemeStyles(merged.theme);
    }
  } catch (e) {
    console.error('保存配置失败:', e);
  }
}

export function getCleanupSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CLEANUP_SETTINGS);
    return saved ? { ...DEFAULT_CLEANUP_SETTINGS, ...JSON.parse(saved) } : DEFAULT_CLEANUP_SETTINGS;
  } catch (e) {
    return DEFAULT_CLEANUP_SETTINGS;
  }
}

export function saveCleanupSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.CLEANUP_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('保存清理设置失败:', e);
  }
}

export function getPaginationState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PAGINATION);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

export function savePaginationState(tableName, page) {
  try {
    const state = getPaginationState();
    state[tableName] = page;
    localStorage.setItem(STORAGE_KEYS.PAGINATION, JSON.stringify(state));
  } catch (e) {
    console.error('保存分页状态失败:', e);
  }
}

export function getCurrentPageForTable(tableName) {
  const state = getPaginationState();
  return state[tableName] || 0;
}

export function loadSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_SNAPSHOT));
  } catch (e) {
    return null;
  }
}

export function saveSnapshot(data) {
  try {
    const json = JSON.stringify(data);
    if (!safeLocalStorageSet(STORAGE_KEYS.LAST_SNAPSHOT, json)) {
      console.error('[ACU] 快照保存失败，已触发清理');
    }
  } catch (e) {
    console.error('[ACU] 保存快照失败:', e);
  }
}

export function getStorageSize() {
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024 / 1024).toFixed(2);
}

export function cleanupStorage({ showNotification, getCellHistoryAll, saveCellHistoryAll } = {}) {
  try {
    const size = parseFloat(getStorageSize());

    if (size > STORAGE_SIZE_LIMIT_MB) {
      console.warn('[ACU] 存储超限，开始清理...');

      const snapshotKey = STORAGE_KEYS.LAST_SNAPSHOT;
      const snapshot = localStorage.getItem(snapshotKey);
      if (snapshot) {
        const snapshotSize = (snapshot.length / 1024 / 1024).toFixed(2);
        console.log(`[ACU] 快照大小: ${snapshotSize} MB，准备清理`);
        localStorage.removeItem(snapshotKey);
      }

      const history = typeof getCellHistoryAll === 'function' ? getCellHistoryAll() : getCellHistoryAllDefault();
      if (history && Object.keys(history).length > 0) {
        const historyCount = Object.keys(history).length;
        if (typeof saveCellHistoryAll === 'function') {
          saveCellHistoryAll({});
        } else {
          saveCellHistoryAllDefault({});
        }
        console.log(`[ACU] 已清空所有历史记录 (${historyCount} 条)`);
      }

      const nonCriticalKeys = [STORAGE_KEYS.INNER_SCROLL_POSITION, STORAGE_KEYS.PAGINATION];
      nonCriticalKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`[ACU] 已清理非关键存储: ${key}`);
        }
      });

      const newSize = getStorageSize();
      console.log(`[ACU] 清理完成，当前大小: ${newSize} MB`);
      if (typeof showNotification === 'function') {
        showNotification(`存储已清理 (${size}MB → ${newSize}MB)`, 'info');
      }
    }
  } catch (e) {
    console.error('[ACU] 清理存储失败:', e);
    console.warn('[ACU] 触发紧急清理模式...');

    try {
      const criticalData = {};
      CRITICAL_SETTINGS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          criticalData[key] = value;
        }
      });

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('acu_')) {
          localStorage.removeItem(key);
        }
      });

      Object.entries(criticalData).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (restoreError) {
          console.error(`[ACU] 无法恢复设置: ${key}`, restoreError);
        }
      });

      console.log('[ACU] 紧急清理完成，已恢复关键设置');
      if (typeof showNotification === 'function') {
        showNotification('已执行紧急清理，您的主题设置已保留', 'warning');
      }
    } catch (e2) {
      console.error('[ACU] 紧急清理也失败了:', e2);
      alert('存储空间严重不足，请手动清理浏览器缓存');
    }
  }
}

export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[ACU] 存储配额已满，触发清理');
      cleanupStorage();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e2) {
        console.error('[ACU] 清理后仍然失败:', e2);
        return false;
      }
    }
    console.error('[ACU] 保存失败:', e);
    return false;
  }
}

export function manualCleanupStorage(
  settings = getCleanupSettings(),
  { getTableData, saveSnapshot: saveSnapshotFn = saveSnapshot } = {},
) {
  const cleanedItems = [];
  const keptItems = [];
  const originalSize = parseFloat(getStorageSize());

  try {
    const criticalData = {};
    CRITICAL_SETTINGS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        criticalData[key] = value;
      }
    });

    if (settings.clearSnapshots) {
      if (localStorage.getItem(STORAGE_KEYS.LAST_SNAPSHOT)) {
        localStorage.removeItem(STORAGE_KEYS.LAST_SNAPSHOT);
        cleanedItems.push('数据快照');
      }
    } else {
      keptItems.push('数据快照');
    }

    if (settings.clearHistory) {
      const history = getCellHistoryAllDefault();
      if (history && Object.keys(history).length > 0) {
        const historyCount = Object.keys(history).length;
        saveCellHistoryAllDefault({});
        localStorage.removeItem(STORAGE_KEYS.CELL_HISTORY);
        cleanedItems.push(`历史记录 (已清空${historyCount}条)`);

        console.log('[ACU] 清理历史记录后,重置diffMap以保持数据库更新高亮');
        const currentData = typeof getTableData === 'function' ? getTableData() : null;
        if (currentData) {
          localStorage.removeItem(STORAGE_KEYS.LAST_SNAPSHOT);
          saveSnapshotFn(currentData);
        }
      }
    } else {
      keptItems.push('历史记录');
    }

    if (settings.clearScrollPositions) {
      if (localStorage.getItem(STORAGE_KEYS.INNER_SCROLL_POSITION)) {
        localStorage.removeItem(STORAGE_KEYS.INNER_SCROLL_POSITION);
        cleanedItems.push('滚动位置');
      }
    } else {
      keptItems.push('滚动位置');
    }

    if (settings.clearPagination) {
      if (localStorage.getItem(STORAGE_KEYS.PAGINATION)) {
        localStorage.removeItem(STORAGE_KEYS.PAGINATION);
        cleanedItems.push('分页状态');
      }
    } else {
      keptItems.push('分页状态');
    }

    if (settings.clearTabStatus) {
      if (localStorage.getItem(STORAGE_KEYS.TAB_STATUS)) {
        localStorage.removeItem(STORAGE_KEYS.TAB_STATUS);
        cleanedItems.push('标签状态');
      }
    } else {
      keptItems.push('标签状态');
    }

    Object.entries(criticalData).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error(`[ACU] 无法恢复设置: ${key}`, e);
      }
    });

    const newSize = parseFloat(getStorageSize());
    const savedSpace = (originalSize - newSize).toFixed(2);
    console.log(`[ACU] 手动清理完成，节省了 ${savedSpace} MB`);

    return {
      success: true,
      cleanedItems,
      keptItems,
      originalSize,
      newSize,
      savedSpace,
    };
  } catch (e) {
    console.error('[ACU] 手动清理失败:', e);
    return {
      success: false,
      error: e.message,
      cleanedItems,
      keptItems,
      originalSize,
      newSize: parseFloat(getStorageSize()),
    };
  }
}

export function getStorageAnalysis() {
  const analysis = {
    totalSize: parseFloat(getStorageSize()),
    items: {},
    criticalItems: [],
    nonCriticalItems: [],
  };

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('acu_')) {
      const value = localStorage.getItem(key);
      const size = (value.length + key.length) / 1024;

      analysis.items[key] = {
        size: size,
        isCritical: CRITICAL_SETTINGS.includes(key),
      };

      if (CRITICAL_SETTINGS.includes(key)) {
        analysis.criticalItems.push({
          key,
          size: size.toFixed(2) + ' KB',
          description: getStorageItemDescription(key),
        });
      } else {
        analysis.nonCriticalItems.push({
          key,
          size: size.toFixed(2) + ' KB',
          description: getStorageItemDescription(key),
          canClean: true,
        });
      }
    }
  });

  return analysis;
}

export function getStorageItemDescription(key) {
  const descriptions = {
    [STORAGE_KEYS.NIGHT_MODE]: '夜间模式设置',
    [STORAGE_KEYS.UI_CONFIG]: '主题和界面配置',
    [STORAGE_KEYS.TABLE_ORDER]: '表格顺序',
    [STORAGE_KEYS.TABLE_EXPANDED]: '表格展开状态',
    [STORAGE_KEYS.ACTIVE_TAB]: '当前激活的标签',
    [STORAGE_KEYS.LAST_SNAPSHOT]: '数据快照（可重新生成）',
    [STORAGE_KEYS.CELL_HISTORY]: '单元格历史记录',
    [STORAGE_KEYS.INNER_SCROLL_POSITION]: '滚动位置',
    [STORAGE_KEYS.PAGINATION]: '分页状态',
    [STORAGE_KEYS.TAB_STATUS]: '标签更新状态',
    [STORAGE_KEYS.CLEANUP_SETTINGS]: '清理设置',
  };

  return descriptions[key] || key;
}

export function getCellHistoryAllDefault() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CELL_HISTORY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('[ACU] 读取历史失败:', e);
    return {};
  }
}

export function saveCellHistoryAllDefault(history) {
  try {
    const json = JSON.stringify(history);
    safeLocalStorageSet(STORAGE_KEYS.CELL_HISTORY, json);
  } catch (e) {
    console.error('[ACU] 保存历史失败:', e);
  }
}

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('[ACU-Test] localStorage JSON 读取失败:', key, error);
    return fallback;
  }
}

export function writeJSON(key, value) {
  return safeLocalStorageSet(key, JSON.stringify(value));
}
