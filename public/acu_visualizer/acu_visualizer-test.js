// ==UserScript==
// @name         兼容性可视化表格 v9.55
// @namespace    http://tampermonkey.net/
// @version      9.5.5
// @description  兼容性可视化表格 v9.55
// @author       Cline (Optimized)
// @match        */*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_ID = 'acu_visualizer_v8_96';

  // --- 新增：注入搜索特定样式 ---
  const injectSearchStyles = () => {
    if (document.getElementById('acu-search-styles')) return;
    const style = document.createElement('style');
    style.id = 'acu-search-styles';
    style.textContent = `
      .acu-table-section .section-title {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 5px 12px !important;
      }
      .acu-search-toolbar {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important; /* 绝不换行 */
        align-items: center !important;
        gap: 4px !important;
        margin-left: 10px !important;
      }
      .acu-search-input-box {
        display: none;
        align-items: center;
        background: transparent !important; /* 彻底去掉背景 */
        border: none !important;
        border-bottom: 1px solid var(--acu-primary, #5c9dff) !important; /* 极简下划线 */
        padding: 0 4px;
        height: 22px;
        transition: width 0.3s ease;
      }
      .acu-search-field-input {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        color: var(--acu-text) !important;
        font-size: 12px !important;
        width: 110px !important;
        padding: 0 !important;
      }
      .night-mode .acu-search-field-input::placeholder {
        color: #666 !important;
      }
      .acu-search-icon-btn {
        background: transparent !important; /* 彻底去掉大白背景 */
        border: none !important;
        box-shadow: none !important;
        color: var(--acu-primary, #5c9dff) !important;
        cursor: pointer !important;
        opacity: 0.7;
        font-size: 14px !important;
        padding: 4px !important;
        display: flex !important;
        align-items: center;
        transition: all 0.2s !important;
      }
      .acu-search-icon-btn:hover {
        opacity: 1;
        background: rgba(var(--acu-primary-rgb, 92,157,255), 0.1) !important;
        border-radius: 4px !important;
      }
      mark.acu-search-match-text {
        background: #fff176 !important;
        color: #000 !important;
        border-radius: 2px !important;
        padding: 0 !important;
        box-shadow: 0 0 2px rgba(0,0,0,0.3) !important;
        font-weight: inherit !important;
      }
      .night-mode mark.acu-search-match-text {
        background: #fbc02d !important;
        color: #000 !important;
      }
    `;
    document.head.appendChild(style);
  };
  injectSearchStyles();
  const STORAGE_KEY_TABLE_ORDER = 'acu_table_order';
  const STORAGE_KEY_TABLE_EXPANDED = 'acu_table_expanded';
  const STORAGE_KEY_NIGHT_MODE = 'acu_night_mode';
  const STORAGE_KEY_ACTIVE_TAB = 'acu_active_tab';
  const STORAGE_KEY_INNER_SCROLL_POSITION = 'acu_table_inner_scroll_position_v2';
  const STORAGE_KEY_UI_CONFIG = 'acu_ui_config_v8_1';
  const STORAGE_KEY_LAST_SNAPSHOT = 'acu_data_snapshot_v8_5';
  const STORAGE_KEY_PAGINATION = 'acu_pagination_state_v2';
  const STORAGE_KEY_TAB_STATUS = 'acu_tab_status_v8_1';
  const STORAGE_KEY_CELL_HISTORY = 'acu_cell_history_v8_8';
  const STORAGE_KEY_CLEANUP_SETTINGS = 'acu_cleanup_settings_v8_9';
  const STORAGE_SIZE_LIMIT_MB = 4; // localStorage 限制为 4MB

  let isInitialized = false;
  let isSaving = false;
  let isEditingOrder = false;
  let isEditingRowOrder = false; // 新增：行排序编辑状态
  let currentTableScrollTop = 0;
  let isFirstRender = true;
  let lastTableDataHash = '';
  let lastAIMessageId = '';
  let tablePositionUpdateQueued = false;
  let isCellEditing = false;
  let isRefreshing = false;
  let currentDiffMap = new Set();
  const currentPagination = {};
  const currentUserEditMap = new Set();

  // --- 新增：搜索功能状态 ---
  let currentSearchTerm = '';
  let isSearchVisible = false;

  // 行拖动状态管理
  let dragStartIndex = -1;
  let dragEndIndex = -1;
  let isDragging = false;
  let dragRowElement = null;

  // 行位置映射表（用于存储前端显示位置与原始数据索引的映射关系）
  const rowPositionMapping = {};

  // 使用集合管理待删除行
  const pendingDeletes = new Set();

  // [新增] 防回弹控制器
  const UpdateController = {
    _suppressNext: false,
    // 执行静默保存
    runSilently: async action => {
      UpdateController._suppressNext = true;
      try {
        return await action();
      } finally {
        // 2秒后恢复监听，给数据库一点写入时间
        setTimeout(() => {
          UpdateController._suppressNext = false;
        }, 2000);
      }
    },
    // 过滤更新信号 (需要在 init 中注册这个函数替代原来的回调)
    handleUpdate: () => {
      if (UpdateController._suppressNext) {
        return;
      }
      // 这里调用原本的刷新逻辑，比如 smartUpdateTable 或 insertTableAfterLatestAIMessage
      // 假设 v8.1 原版用的是 smartUpdateTable
      if (typeof smartUpdateTable === 'function') {
        setTimeout(() => smartUpdateTable(), 100);
      } else if (typeof insertTableAfterLatestAIMessage === 'function') {
        insertTableAfterLatestAIMessage();
      }
    },
  };

  const DEFAULT_CONFIG = {
    theme: 'retro',
    highlightNew: true,
    autoCleanup: true,
    maxHistoryItems: 30,
    keepSnapshots: false,
  };

  const DEFAULT_CLEANUP_SETTINGS = {
    clearSnapshots: true,
    clearHistory: true,
    clearScrollPositions: true,
    clearPagination: true,
    clearTabStatus: false,
    keepNightMode: true,
    keepThemeSettings: true,
    keepTableOrder: true,
  };

  const THEMES = [
    { id: 'retro', name: '复古羊皮', icon: 'fas fa-scroll' },
    { id: 'dark', name: '极夜深空', icon: 'fas fa-moon' },
    { id: 'modern', name: '现代清爽', icon: 'fas fa-sun' },
    { id: 'forest', name: '森之物语', icon: 'fas fa-leaf' },
    { id: 'ocean', name: '深海幽蓝', icon: 'fas fa-water' },
  ];

  const DEFAULT_TAB_STATUS = {
    hasNewUpdates: false,
    userHasSeen: false,
    lastViewedHash: '', // 上次查看时的内容哈希
    currentUpdateHash: '', // 当前检测到的更新哈希
  };

  const getTabStatus = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAB_STATUS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  };

  const saveTabStatus = status => {
    try {
      localStorage.setItem(STORAGE_KEY_TAB_STATUS, JSON.stringify(status));
    } catch (e) {
      console.error('保存标签状态失败:', e);
    }
  };

  const getSingleTabStatus = tableName => {
    const status = getTabStatus();
    return status[tableName] ? { ...DEFAULT_TAB_STATUS, ...status[tableName] } : { ...DEFAULT_TAB_STATUS };
  };

  const updateTabStatus = (tableName, updates) => {
    const status = getTabStatus();
    if (!status[tableName]) {
      status[tableName] = { ...DEFAULT_TAB_STATUS };
    }
    status[tableName] = { ...status[tableName], ...updates };
    saveTabStatus(status);
    return status[tableName];
  };

  const shouldShowBadge = tableName => {
    const tabStatus = getSingleTabStatus(tableName);
    // 核心逻辑：有更新 且 (用户未看 且 哈希不一致)
    return (
      tabStatus.hasNewUpdates && !tabStatus.userHasSeen && tabStatus.lastViewedHash !== tabStatus.currentUpdateHash
    );
  };

  const markTabAsSeen = tableName => {
    const status = getSingleTabStatus(tableName);
    return updateTabStatus(tableName, {
      userHasSeen: true,
      lastViewedHash: status.currentUpdateHash, // 记录当前版本为已看
    });
  };

  const resetAllTabsSeenStatus = () => {
    // 此函数在 diff 之前调用，不再无脑重置 userHasSeen，由 setTabUpdateStatus 接管
  };

  const setTabUpdateStatus = (tableName, hasUpdates, updateHash = '') => {
    const status = getSingleTabStatus(tableName);

    const updates = {
      hasNewUpdates: hasUpdates,
      currentUpdateHash: updateHash,
    };

    // 如果检测到新哈希且与已看的不同，重置 userHasSeen
    if (hasUpdates && updateHash && updateHash !== status.lastViewedHash) {
      updates.userHasSeen = false;
    }

    return updateTabStatus(tableName, updates);
  };

  const clearAllTabUpdates = () => {
    const status = getTabStatus();
    Object.keys(status).forEach(tableName => {
      status[tableName].hasNewUpdates = false;
      status[tableName].userHasSeen = false;
    });
    saveTabStatus(status);
  };

  // 获取待删除列表
  const getPendingDeletions = () => {
    const deletions = {};
    pendingDeletes.forEach(key => {
      const match = key.match(/(.+)-row-(\d+)/);
      if (match) {
        const tableName = match[1];
        const rowIndex = match[2];
        if (!deletions[tableName]) {
          deletions[tableName] = [];
        }
        deletions[tableName].push(rowIndex);
      }
    });
    return deletions;
  };

  // 保存待删除列表
  const savePendingDeletions = deletions => {
    pendingDeletes.clear();
    Object.keys(deletions).forEach(tableName => {
      deletions[tableName].forEach(rowIndex => {
        pendingDeletes.add(`${tableName}-row-${rowIndex}`);
      });
    });
  };

  const getCore = () => {
    const w = window.parent || window;
    return {
      $: window.jQuery || w.jQuery,
      getDB: () => w.AutoCardUpdaterAPI || window.AutoCardUpdaterAPI,
    };
  };

  const getConfig = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UI_CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  };

  const saveConfig = newConfig => {
    try {
      const current = getConfig();
      const merged = { ...current, ...newConfig };
      localStorage.setItem(STORAGE_KEY_UI_CONFIG, JSON.stringify(merged));
      applyThemeStyles(merged.theme);
    } catch (e) {
      console.error('保存配置失败:', e);
    }
  };

  // 获取清理设置
  const getCleanupSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLEANUP_SETTINGS);
      return saved ? { ...DEFAULT_CLEANUP_SETTINGS, ...JSON.parse(saved) } : DEFAULT_CLEANUP_SETTINGS;
    } catch (e) {
      return DEFAULT_CLEANUP_SETTINGS;
    }
  };

  // 保存清理设置
  const saveCleanupSettings = settings => {
    try {
      localStorage.setItem(STORAGE_KEY_CLEANUP_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('保存清理设置失败:', e);
    }
  };

  const getPaginationState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAGINATION);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  };

  const savePaginationState = (tableName, page) => {
    try {
      const state = getPaginationState();
      state[tableName] = page;
      localStorage.setItem(STORAGE_KEY_PAGINATION, JSON.stringify(state));
    } catch (e) {
      console.error('保存分页状态失败:', e);
    }
  };

  const getCurrentPageForTable = tableName => {
    const state = getPaginationState();
    return state[tableName] || 0;
  };

  const generateDataHash = data => {
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
  };

  const loadSnapshot = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_SNAPSHOT));
    } catch (e) {
      return null;
    }
  };

  const saveSnapshot = data => {
    try {
      const json = JSON.stringify(data);
      if (!safeLocalStorageSet(STORAGE_KEY_LAST_SNAPSHOT, json)) {
        console.error('[ACU] 快照保存失败，已触发清理');
      }
    } catch (e) {
      console.error('[ACU] 保存快照失败:', e);
    }
  };

  // 【修改3】智能存储清理函数

  // 检查 localStorage 大小
  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        tconsal += localStorage[key].length + key.length;
      }
    }
    return (total / 1024 / 1024).toFixed(2); // 返回 MB
  };

  // 关键设置白名单（不会被清理）
  const CRITICAL_SETTINGS = [
    STORAGE_KEY_NIGHT_MODE, // 夜间模式
    STORAGE_KEY_UI_CONFIG, // 主题配置
    STORAGE_KEY_TABLE_ORDER, // 表格顺序
    STORAGE_KEY_TABLE_EXPANDED, // 展开状态
    STORAGE_KEY_ACTIVE_TAB, // 当前标签
    STORAGE_KEY_CLEANUP_SETTINGS, // 清理设置
  ];

  // 清理过期存储（保留关键设置）
  const cleanupStorage = () => {
    try {
      const size = parseFloat(getStorageSize());

      if (size > STORAGE_SIZE_LIMIT_MB) {
        console.warn('[ACU] 存储超限，开始清理...');

        // 优先级 1: 清理最占空间的快照
        const snapshotKey = STORAGE_KEY_LAST_SNAPSHOT;
        const snapshot = localStorage.getItem(snapshotKey);
        if (snapshot) {
          const snapshotSize = (snapshot.length / 1024 / 1024).toFixed(2);
          console.log(`[ACU] 快照大小: ${snapshotSize} MB，准备清理`);
          localStorage.removeItem(snapshotKey);
        }

        // 优先级 2: 清理单元格历史(完全清空)
        const history = getCellHistoryAll();
        if (history && Object.keys(history).length > 0) {
          const historyCount = Object.keys(history).length;
          saveCellHistoryAll({});
          console.log(`[ACU] 已清空所有历史记录 (${historyCount} 条)`);
        }

        // 优先级 3: 清理非关键存储（如滚动位置、分页状态等）
        const nonCriticalKeys = [STORAGE_KEY_INNER_SCROLL_POSITION, STORAGE_KEY_PAGINATION];
        nonCriticalKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`[ACU] 已清理非关键存储: ${key}`);
          }
        });

        const newSize = getStorageSize();
        console.log(`[ACU] 清理完成，当前大小: ${newSize} MB`);
        showNotification(`存储已清理 (${size}MB → ${newSize}MB)`, 'info');
      }
    } catch (e) {
      console.error('[ACU] 清理存储失败:', e);

      // 紧急清理：只删除非关键存储
      console.warn('[ACU] 触发紧急清理模式...');

      try {
        // 保存关键设置到临时变量
        const criticalData = {};
        CRITICAL_SETTINGS.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            criticalData[key] = value;
          }
        });

        // 删除所有 ACU 键
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('acu_')) {
            localStorage.removeItem(key);
          }
        });

        // 恢复关键设置
        Object.entries(criticalData).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.error(`[ACU] 无法恢复设置: ${key}`, e);
          }
        });

        console.log('[ACU] 紧急清理完成，已恢复关键设置');
        showNotification('已执行紧急清理，您的主题设置已保留', 'warning');
      } catch (e2) {
        console.error('[ACU] 紧急清理也失败了:', e2);
        alert('存储空间严重不足，请手动清理浏览器缓存');
      }
    }
  };

  // 安全保存（带错误恢复）
  const safeLocalStorageSet = (key, value) => {
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
  };

  // 【新增】手动清理存储函数（用户控制）
  const manualCleanupStorage = (settings = getCleanupSettings()) => {
    const { $ } = getCore();
    let cleanedItems = [];
    let keptItems = [];
    const originalSize = parseFloat(getStorageSize());

    try {
      // 保存关键设置到临时变量
      const criticalData = {};
      CRITICAL_SETTINGS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          criticalData[key] = value;
        }
      });

      // 根据用户设置进行清理
      if (settings.clearSnapshots) {
        if (localStorage.getItem(STORAGE_KEY_LAST_SNAPSHOT)) {
          localStorage.removeItem(STORAGE_KEY_LAST_SNAPSHOT);
          cleanedItems.push('数据快照');
        }
      } else {
        keptItems.push('数据快照');
      }

      if (settings.clearHistory) {
        const history = getCellHistoryAll();
        if (history && Object.keys(history).length > 0) {
          const historyCount = Object.keys(history).length;
          // 完全清空历史记录
          saveCellHistoryAll({});
          localStorage.removeItem(STORAGE_KEY_CELL_HISTORY); // 确保彻底删除
          cleanedItems.push(`历史记录 (已清空${historyCount}条)`);

          // 【修复关键】清理后保持数据库更新高亮功能
          console.log('[ACU] 清理历史记录后,重置diffMap以保持数据库更新高亮');
          const currentData = getTableData();
          if (currentData) {
            // 清空快照以强制重新对比
            localStorage.removeItem(STORAGE_KEY_LAST_SNAPSHOT);
            // 重新保存当前数据作为新快照 (重置基准)
            saveSnapshot(currentData);

            // 注意: 这里不清除 currentDiffMap,以保留现有的高亮显示
            // 只有当下次 generateDiffMap 运行时,新的快照才会生效
          }
        }
      } else {
        keptItems.push('历史记录');
      }

      if (settings.clearScrollPositions) {
        if (localStorage.getItem(STORAGE_KEY_INNER_SCROLL_POSITION)) {
          localStorage.removeItem(STORAGE_KEY_INNER_SCROLL_POSITION);
          cleanedItems.push('滚动位置');
        }
      } else {
        keptItems.push('滚动位置');
      }

      if (settings.clearPagination) {
        if (localStorage.getItem(STORAGE_KEY_PAGINATION)) {
          localStorage.removeItem(STORAGE_KEY_PAGINATION);
          cleanedItems.push('分页状态');
        }
      } else {
        keptItems.push('分页状态');
      }

      if (settings.clearTabStatus) {
        if (localStorage.getItem(STORAGE_KEY_TAB_STATUS)) {
          localStorage.removeItem(STORAGE_KEY_TAB_STATUS);
          cleanedItems.push('标签状态');
        }
      } else {
        keptItems.push('标签状态');
      }

      // 恢复关键设置（确保不会因清理而丢失）
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
  };

  // 【新增】获取存储详细分析
  const getStorageAnalysis = () => {
    const analysis = {
      totalSize: parseFloat(getStorageSize()),
      items: {},
      criticalItems: [],
      nonCriticalItems: [],
    };

    // 分析所有ACU相关的存储项
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('acu_')) {
        const value = localStorage.getItem(key);
        const size = (value.length + key.length) / 1024; // KB

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
  };

  // 获取存储项描述
  const getStorageItemDescription = key => {
    const descriptions = {
      [STORAGE_KEY_NIGHT_MODE]: '夜间模式设置',
      [STORAGE_KEY_UI_CONFIG]: '主题和界面配置',
      [STORAGE_KEY_TABLE_ORDER]: '表格顺序',
      [STORAGE_KEY_TABLE_EXPANDED]: '表格展开状态',
      [STORAGE_KEY_ACTIVE_TAB]: '当前激活的标签',
      [STORAGE_KEY_LAST_SNAPSHOT]: '数据快照（可重新生成）',
      [STORAGE_KEY_CELL_HISTORY]: '单元格历史记录',
      [STORAGE_KEY_INNER_SCROLL_POSITION]: '滚动位置',
      [STORAGE_KEY_PAGINATION]: '分页状态',
      [STORAGE_KEY_TAB_STATUS]: '标签更新状态',
      [STORAGE_KEY_CLEANUP_SETTINGS]: '清理设置',
    };

    return descriptions[key] || key;
  };

  // 获取所有单元格历史
  const getCellHistoryAll = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CELL_HISTORY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('[ACU] 读取历史失败:', e);
      return {};
    }
  };

  // 保存所有单元格历史
  const saveCellHistoryAll = history => {
    try {
      const json = JSON.stringify(history);
      safeLocalStorageSet(STORAGE_KEY_CELL_HISTORY, json);
    } catch (e) {
      console.error('[ACU] 保存历史失败:', e);
    }
  };

  // 获取单个单元格历史 [V8.95-FIX: 支持聊天隔离]
  const getCellHistory = (tableName, rowIndex, colIndex) => {
    const allHistory = getCellHistoryAll();
    const key = `${tableName}-${rowIndex}-${colIndex}`;
    const cellHistory = allHistory[key] || [];

    // 根据当前隔离Key过滤历史记录
    const currentIsolationKey = getIsolationKey();
    return cellHistory.filter(item => {
      const itemIsolationKey = item.isolationKey || '';
      return itemIsolationKey === currentIsolationKey;
    });
  };

  // 添加单元格历史记录（去重 + 最多 10 条）[V8.95-FIX: 支持聊天隔离]
  const addCellHistory = (tableName, rowIndex, colIndex, value) => {
    const allHistory = getCellHistoryAll();
    const key = `${tableName}-${rowIndex}-${colIndex}`;
    let history = allHistory[key] || [];

    // 获取当前隔离Key
    const currentIsolationKey = getIsolationKey();

    // 去重：只在相同隔离Key内去重
    history = history.filter(item => {
      const itemIsolationKey = item.isolationKey || '';
      // 只移除相同隔离Key且相同值的记录
      return !(itemIsolationKey === currentIsolationKey && item.value === value);
    });

    // 添加新值到最前面，包含隔离Key
    history.unshift({
      value: value,
      timestamp: Date.now(),
      isolationKey: currentIsolationKey,
    });

    // 按隔离Key统计，每个隔离Key最多保留10条
    const countByIsolationKey = {};
    history = history.filter(item => {
      const itemIsolationKey = item.isolationKey || '';
      countByIsolationKey[itemIsolationKey] = (countByIsolationKey[itemIsolationKey] || 0) + 1;
      return countByIsolationKey[itemIsolationKey] <= 10;
    });

    allHistory[key] = history;
    saveCellHistoryAll(allHistory);

    // 返回过滤后的当前隔离Key的历史记录
    return history.filter(item => (item.isolationKey || '') === currentIsolationKey);
  };

  // 显示历史记录弹窗(改为对话框样式)
  const showHistoryMenu = (event, cell, tableName, rowIndex, colIndex) => {
    const { $ } = getCore();
    const history = getCellHistory(tableName, rowIndex, colIndex);

    if (!history || history.length === 0) {
      showNotification('暂无历史记录', 'info');
      return;
    }

    const isNightMode = $('.acu-table-container').hasClass('night-mode');
    const config = getConfig();

    let dialogHtml = `
      <div class="acu-history-overlay ${isNightMode ? 'night-mode' : ''} acu-theme-${config.theme}">
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

      // 转义HTML并保留换行
      const escapedValue = item.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');

      dialogHtml += `
            <div class="acu-history-item" data-value="${item.value.replace(/"/g, '&quot;')}" data-index="${idx}">
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

    const $dialog = $(dialogHtml);
    $('body').append($dialog);

    // 绑定点击历史项恢复数据
    $dialog.find('.acu-history-item').on('click', async function () {
      // 使用 attr 获取原始字符串，避免 .data() 自动将数字字符串转为数字类型导致 .replace 报错
      const value = $(this).attr('data-value');
      const strValue = String(value || ''); // 确保使用 strValue

      // 恢复该值
      $(cell).html(strValue.replace(/\n/g, '<br>'));

      // 标记为用户编辑(应用绿色高亮)
      currentUserEditMap.add(`${tableName}-${rowIndex}-${colIndex}`);

      // 记录这次恢复操作到历史记录中
      addCellHistory(tableName, rowIndex, colIndex, strValue); // 改为 strValue

      // 更新数据库
      const rawData = getTableData();
      const tableKey = $(cell).data('table-key');
      if (rawData?.[tableKey]?.content) {
        const actualRowIndex = rowIndex + 1;
        if (rawData[tableKey].content[actualRowIndex]?.[colIndex] !== undefined) {
          rawData[tableKey].content[actualRowIndex][colIndex] = strValue; // 改为 strValue
        }
      }

      await saveDataToDatabase(rawData, {
        type: 'cell_edit',
        tableName,
        rowIndex,
        colIndex,
        newValue: strValue,
      });

      $dialog.remove();
      showNotification('已恢复历史值,标记为用户编辑', 'success');
    });

    // 绑定关闭按钮
    $dialog.find('.acu-history-close, .acu-history-close-btn').on('click', () => {
      $dialog.remove();
    });

    // 点击遮罩层关闭
    $dialog.on('click', function (e) {
      if ($(e.target).hasClass('acu-history-overlay')) {
        $(this).remove();
      }
    });

    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
  };

  const generateDiffMap = currentData => {
    const lastData = loadSnapshot();
    const diffSet = new Set();
    const tableHashes = new Map(); // tableName -> currentContentHash

    // 计算当前所有表的哈希
    Object.keys(currentData || {}).forEach(sheetId => {
      const newSheet = currentData[sheetId];
      if (newSheet?.name) {
        tableHashes.set(newSheet.name, generateDataHash(newSheet.content || []));
      }
    });

    for (const sheetId in currentData) {
      const newSheet = currentData[sheetId];
      const oldSheet = lastData ? lastData[sheetId] : null; // 如果没有快照,oldSheet 将为 null
      if (!newSheet || !newSheet.name) continue;
      const tableName = newSheet.name;

      // 如果没有旧表 (或者没有快照),则将所有行标记为新
      if (!oldSheet) {
        if (newSheet.content) {
          newSheet.content.forEach((row, rIdx) => {
            if (rIdx > 0) {
              // 跳过表头
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

    // 更新各表的徽章状态
    tableHashes.forEach((hash, name) => {
      // 精确匹配：检查 diffSet 中的键是否以 "表名-" 开头
      const hasDiff = Array.from(diffSet).some(k => k.startsWith(`${name}-`));
      setTabUpdateStatus(name, hasDiff, hash);
    });

    // 将数据库更新的单元格也记录到历史
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
              if (String(cell) !== String(oldCell)) {
                // 记录数据库更新到历史
                addCellHistory(tableName, rIdx - 1, cIdx, String(cell));
              }
            });
          }
        });
      }
    }

    return diffSet;
  };

  const applyThemeStyles = theme => {
    const { $ } = getCore();
    const $container = $('.acu-table-container');
    if ($container.length) {
      THEMES.forEach(t => $container.removeClass(`acu-theme-${t.id}`));
      $container.addClass(`acu-theme-${theme}`);

      const isNightMode = $container.hasClass('night-mode');
      if (isNightMode && theme !== 'dark') {
        $container.removeClass('acu-theme-dark');
        $container.addClass(`acu-theme-${theme}`);
      }
    }
  };

  const getInnerScrollPositionState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INNER_SCROLL_POSITION);
      return saved ? JSON.parse(saved) : 0;
    } catch (e) {
      return 0;
    }
  };

  const saveInnerScrollPositionState = position => {
    try {
      localStorage.setItem(STORAGE_KEY_INNER_SCROLL_POSITION, JSON.stringify(position));
    } catch (e) {
      console.error('保存内部滚动位置失败:', e);
    }
  };

  const getNightModeState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NIGHT_MODE);
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  };

  const saveNightModeState = enabled => {
    try {
      localStorage.setItem(STORAGE_KEY_NIGHT_MODE, JSON.stringify(enabled));
    } catch (e) {
      console.error('保存夜间模式状态失败:', e);
    }
  };

  const getTableExpandedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABLE_EXPANDED);
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  };

  const saveTableExpandedState = expanded => {
    try {
      localStorage.setItem(STORAGE_KEY_TABLE_EXPANDED, JSON.stringify(expanded));
    } catch (e) {
      console.error('保存表格展开状态失败:', e);
    }
  };

  const getActiveTabState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  };

  const saveActiveTabState = tableName => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, JSON.stringify(tableName));
    } catch (e) {
      console.error('保存激活标签页状态失败:', e);
    }
  };

  // 【新增】设置界面相关函数

  const showSettingsDialog = () => {
    const { $ } = getCore();

    // 移除已有的设置对话框
    $('.acu-settings-overlay').remove();

    const config = getConfig();
    const cleanupSettings = getCleanupSettings();
    const storageAnalysis = getStorageAnalysis();
    const isNightMode = $('.acu-table-container').hasClass('night-mode');

    // 计算可清理空间
    const cleanableSize =
      storageAnalysis.nonCriticalItems.reduce((sum, item) => {
        const size = parseFloat(item.size);
        return sum + (isNaN(size) ? 0 : size);
      }, 0) / 1024; // 转换为MB

    // 创建设置对话框HTML
    const settingsHtml = `
            <div class="acu-settings-overlay ${isNightMode ? 'night-mode' : ''}">
                <div class="acu-settings-dialog acu-theme-${config.theme}">
                    <div class="acu-settings-header">
                        <h3>⚙️ ACU 设置</h3>
                        <button class="acu-settings-close" title="关闭">✕</button>
                    </div>

                    <div class="acu-settings-tabs">
                        <button class="acu-settings-tab active" data-tab="storage">📦 存储管理</button>
                        <button class="acu-settings-tab" data-tab="advanced">⚡ 高级选项</button>
                    </div>

                    <div class="acu-settings-content">
                        <!-- 存储管理标签页 -->
                        <div class="acu-settings-tab-content active" id="storage-tab">
                            <div class="acu-storage-info">
                                <div class="acu-storage-summary">
                                    <h4>存储使用情况</h4>
                                    <div class="acu-storage-bar">
                                        <div class="acu-storage-bar-fill" style="width: ${Math.min(100, (storageAnalysis.totalSize / STORAGE_SIZE_LIMIT_MB) * 100)}%"></div>
                                    </div>
                                    <div class="acu-storage-stats">
                                        <span>已使用: <strong>${storageAnalysis.totalSize} MB</strong> / ${STORAGE_SIZE_LIMIT_MB} MB</span>
                                        <span>可清理: <strong class="acu-cleanable">${cleanableSize.toFixed(2)} MB</strong></span>
                                    </div>
                                </div>

                                <div class="acu-warning-box">
                                    <div class="acu-warning-icon">⚠️</div>
                                    <div class="acu-warning-content">
                                        <strong>重要提示:</strong>
                                        <p>在进行清理操作前,请务必先保存数据库模板,以免数据库模板的修改回滚。</p>
                                        <p>请前往数据库,点击数据管理按钮,合并导出模板做好保存备份。</p>
                                    </div>
                                </div>

                                <div class="acu-cleanup-options">
                                    <h4>清理选项</h4>
                                    <div class="acu-option-group">
                                        <label class="acu-checkbox">
                                            <input type="checkbox" id="clearSnapshots" ${cleanupSettings.clearSnapshots ? 'checked' : ''}>
                                            <span>清理数据快照 (${getStorageItemSize(STORAGE_KEY_LAST_SNAPSHOT)})</span>
                                            <small>删除历史数据快照，可重新生成</small>
                                        </label>

                                        <label class="acu-checkbox">
                                            <input type="checkbox" id="clearHistory" ${cleanupSettings.clearHistory ? 'checked' : ''}>
                                            <span>清理历史记录 (${getStorageItemSize(STORAGE_KEY_CELL_HISTORY)})</span>
                                            <small>完全清空所有历史记录</small>
                                        </label>

                                        <label class="acu-checkbox">
                                            <input type="checkbox" id="clearScrollPositions" ${cleanupSettings.clearScrollPositions ? 'checked' : ''}>
                                            <span>清理滚动位置 (${getStorageItemSize(STORAGE_KEY_INNER_SCROLL_POSITION)})</span>
                                            <small>清除表格滚动位置记忆</small>
                                        </label>

                                        <label class="acu-checkbox">
                                            <input type="checkbox" id="clearPagination" ${cleanupSettings.clearPagination ? 'checked' : ''}>
                                            <span>清理分页状态 (${getStorageItemSize(STORAGE_KEY_PAGINATION)})</span>
                                            <small>清除表格分页记忆</small>
                                        </label>

                                        <label class="acu-checkbox">
                                            <input type="checkbox" id="clearTabStatus" ${cleanupSettings.clearTabStatus ? 'checked' : ''}>
                                            <span>清理标签状态 (${getStorageItemSize(STORAGE_KEY_TAB_STATUS)})</span>
                                            <small>清除标签更新标记</small>
                                        </label>
                                    </div>

                                    <div class="acu-protected-settings">
                                        <h5>始终保留的设置（推荐）</h5>
                                        <div class="acu-option-group">
                                            <label class="acu-checkbox protected">
                                                <input type="checkbox" checked disabled>
                                                <span>夜间模式设置</span>
                                                <small>保持您的日夜偏好</small>
                                            </label>

                                            <label class="acu-checkbox protected">
                                                <input type="checkbox" checked disabled>
                                                <span>主题配置</span>
                                                <small>保持您的界面主题</small>
                                            </label>

                                            <label class="acu-checkbox protected">
                                                <input type="checkbox" checked disabled>
                                                <span>表格顺序</span>
                                                <small>保持您的表格排列顺序</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div class="acu-cleanup-actions">
                                    <button class="acu-btn acu-btn-secondary" id="acu-analyze-storage">
                                        🔍 重新分析存储
                                    </button>
                                    <button class="acu-btn acu-btn-danger" id="acu-cleanup-now">
                                        🧹 立即清理选中的项目
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 高级选项标签页 -->
                        <div class="acu-settings-tab-content" id="advanced-tab">
                            <div class="acu-advanced-options">
                                <h4>高级设置</h4>

                                <div class="acu-option-group">
                                    <label class="acu-checkbox">
                                        <input type="checkbox" id="autoCleanup" ${config.autoCleanup ? 'checked' : ''}>
                                        <span>自动清理存储</span>
                                        <small>当存储接近上限时自动清理</small>
                                    </label>

                                    <label class="acu-checkbox">
                                        <input type="checkbox" id="keepSnapshots" ${config.keepSnapshots ? 'checked' : ''}>
                                        <span>保留数据快照</span>
                                        <small>不自动清理数据快照</small>
                                    </label>

                                    <label class="acu-checkbox">
                                        <input type="checkbox" id="debugMode">
                                        <span>调试模式</span>
                                        <small>在控制台显示详细日志</small>
                                    </label>
                                </div>

                                <div class="acu-storage-details">
                                    <h5>存储详细信息</h5>
                                    <div class="acu-storage-items">
                                        <div class="acu-storage-section">
                                            <h6>关键设置（始终保留）</h6>
                                            ${storageAnalysis.criticalItems
                                              .map(
                                                item => `
                                                <div class="acu-storage-item critical">
                                                    <span class="acu-storage-item-name">${item.description}</span>
                                                    <span class="acu-storage-item-size">${item.size}</span>
                                                </div>
                                            `,
                                              )
                                              .join('')}
                                        </div>

                                        <div class="acu-storage-section">
                                            <h6>可清理项目</h6>
                                            ${storageAnalysis.nonCriticalItems
                                              .map(
                                                item => `
                                                <div class="acu-storage-item cleanable">
                                                    <span class="acu-storage-item-name">${item.description}</span>
                                                    <span class="acu-storage-item-size">${item.size}</span>
                                                </div>
                                            `,
                                              )
                                              .join('')}
                                        </div>
                                    </div>
                                </div>

                                <div class="acu-advanced-actions">
                                    <button class="acu-btn acu-btn-secondary" id="acu-reset-settings">
                                        🔄 重置为默认设置
                                    </button>
                                    <button class="acu-btn acu-btn-danger" id="acu-clear-all">
                                        🗑️ 清理所有非关键数据
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="acu-settings-footer">
                        <div class="acu-settings-status" id="acu-settings-status">
                            就绪
                        </div>
                        <div class="acu-settings-buttons">
                            <button class="acu-btn acu-btn-secondary" id="acu-settings-cancel">
                                取消
                            </button>
                            <button class="acu-btn acu-btn-primary" id="acu-settings-save">
                                保存设置
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    $('body').append(settingsHtml);

    // 绑定设置对话框事件
    bindSettingsDialogEvents();
  };

  // 获取单个存储项的大小
  const getStorageItemSize = key => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return '0 KB';
      const size = (value.length + key.length) / 1024;
      return size.toFixed(2) + ' KB';
    } catch (e) {
      return '0 KB';
    }
  };

  // 绑定设置对话框事件
  const bindSettingsDialogEvents = () => {
    const { $ } = getCore();

    // 关闭按钮
    $('.acu-settings-close, #acu-settings-cancel').on('click', function () {
      $('.acu-settings-overlay').remove();
    });

    // 标签页切换
    $('.acu-settings-tab').on('click', function () {
      const tabId = $(this).data('tab');

      // 更新标签页状态
      $('.acu-settings-tab').removeClass('active');
      $(this).addClass('active');

      // 更新内容显示
      $('.acu-settings-tab-content').removeClass('active');
      $(`#${tabId}-tab`).addClass('active');
    });

    // 历史记录滑块
    $('#maxHistoryItems').on('input', function () {
      $('#historyCountValue').text($(this).val());
    });

    // 主题选择
    $('.acu-theme-option input').on('change', function () {
      const theme = $(this).val();
      $('.acu-theme-option').removeClass('active');
      $(this).closest('.acu-theme-option').addClass('active');

      // 预览主题
      $('.acu-settings-dialog')
        .removeClass((index, className) => {
          return (className.match(/acu-theme-\w+/g) || []).join(' ');
        })
        .addClass(`acu-theme-${theme}`);
    });

    // 重新分析存储
    $('#acu-analyze-storage').on('click', function () {
      const $btn = $(this);
      const originalText = $btn.html();

      $btn.prop('disabled', true).html('⏳ 分析中...');

      setTimeout(() => {
        const analysis = getStorageAnalysis();
        const cleanableSize =
          analysis.nonCriticalItems.reduce((sum, item) => {
            const size = parseFloat(item.size);
            return sum + (isNaN(size) ? 0 : size);
          }, 0) / 1024;

        // 更新存储条
        $('.acu-storage-bar-fill').css(
          'width',
          `${Math.min(100, (analysis.totalSize / STORAGE_SIZE_LIMIT_MB) * 100)}%`,
        );

        // 更新统计信息
        $('.acu-storage-stats span:first-child').html(
          `已使用: <strong>${analysis.totalSize} MB</strong> / ${STORAGE_SIZE_LIMIT_MB} MB`,
        );
        $('.acu-cleanable').text(`${cleanableSize.toFixed(2)} MB`);

        showStatusMessage('存储分析完成', 'success');
        $btn.prop('disabled', false).html(originalText);
      }, 500);
    });

    // 立即清理
    $('#acu-cleanup-now').on('click', async function () {
      const $btn = $(this);
      const originalText = $btn.html();

      // 获取用户选择的清理选项
      const cleanupSettings = {
        clearSnapshots: $('#clearSnapshots').is(':checked'),
        clearHistory: $('#clearHistory').is(':checked'),
        clearScrollPositions: $('#clearScrollPositions').is(':checked'),
        clearPagination: $('#clearPagination').is(':checked'),
        clearTabStatus: $('#clearTabStatus').is(':checked'),
      };

      // 检查是否选择了任何选项
      const anySelected = Object.values(cleanupSettings).some(v => v);
      if (!anySelected) {
        showStatusMessage('请至少选择一个清理项目', 'error');
        return;
      }

      // 显示确认对话框
      const confirmed = await showCleanupConfirmation(cleanupSettings);
      if (!confirmed) {
        showStatusMessage('清理已取消', 'info');
        return;
      }

      $btn.prop('disabled', true).html('🧹 清理中...');

      // 执行清理
      const result = manualCleanupStorage(cleanupSettings);

      if (result.success) {
        showStatusMessage(`清理完成！节省了 ${result.savedSpace} MB 空间`, 'success');

        // 更新存储显示
        $('#acu-analyze-storage').trigger('click');

        // 保存清理设置
        saveCleanupSettings(cleanupSettings);

        // 【新增】如果清理了历史记录或快照,强制刷新表格以重新应用高亮
        if (cleanupSettings.clearHistory || cleanupSettings.clearSnapshots) {
          console.log('[ACU] 清理后刷新表格');
          setTimeout(() => {
            // 强制完全刷新
            lastTableDataHash = '';
            isFirstRender = true;
            smartUpdateTable(true);
          }, 500);
        }
      } else {
        showStatusMessage(`清理失败: ${result.error}`, 'error');
      }

      $btn.prop('disabled', false).html(originalText);
    });

    // 清理所有非关键数据
    $('#acu-clear-all').on('click', async function () {
      const confirmed = confirm(
        '⚠️ 警告：这将清理所有非关键数据！\n\n' +
          '包括：数据快照、历史记录、滚动位置、分页状态等。\n\n' +
          '请确保已保存数据库模板！\n\n' +
          '确定要继续吗？',
      );

      if (!confirmed) {
        showStatusMessage('操作已取消', 'info');
        return;
      }

      const $btn = $(this);
      const originalText = $btn.html();

      $btn.prop('disabled', true).html('🗑️ 清理中...');

      // 清理所有非关键数据
      const cleanupSettings = {
        clearSnapshots: true,
        clearHistory: true,
        clearScrollPositions: true,
        clearPagination: true,
        clearTabStatus: true,
      };

      const result = manualCleanupStorage(cleanupSettings);

      if (result.success) {
        showStatusMessage(`已清理所有非关键数据！节省了 ${result.savedSpace} MB 空间`, 'success');

        // 更新存储显示
        $('#acu-analyze-storage').trigger('click');

        // 保存清理设置
        saveCleanupSettings(cleanupSettings);

        // 【新增】清理后强制刷新表格
        console.log('[ACU] 清理所有数据后刷新表格');
        setTimeout(() => {
          // 强制完全刷新
          lastTableDataHash = '';
          isFirstRender = true;
          smartUpdateTable(true);
        }, 500);
      } else {
        showStatusMessage(`清理失败: ${result.error}`, 'error');
      }

      $btn.prop('disabled', false).html(originalText);
    });

    // 重置设置
    $('#acu-reset-settings').on('click', function () {
      if (confirm('确定要重置所有设置为默认值吗？')) {
        // 重置配置
        saveConfig(DEFAULT_CONFIG);
        saveCleanupSettings(DEFAULT_CLEANUP_SETTINGS);

        // 重新加载设置界面
        $('.acu-settings-overlay').remove();
        setTimeout(showSettingsDialog, 100);

        showStatusMessage('设置已重置为默认值', 'success');
      }
    });

    // 保存设置
    $('#acu-settings-save').on('click', function () {
      // 保存外观设置
      const config = getConfig();
      const newConfig = {
        ...config,
        theme: $('input[name="theme"]:checked').val(),
        highlightNew: $('#highlightNew').is(':checked'),
        maxHistoryItems: parseInt($('#maxHistoryItems').val()),
        autoCleanup: $('#autoCleanup').is(':checked'),
        keepSnapshots: $('#keepSnapshots').is(':checked'),
      };

      saveConfig(newConfig);

      // 保存夜间模式
      saveNightModeState($('#autoNightMode').is(':checked'));

      // 保存清理设置
      const cleanupSettings = {
        clearSnapshots: $('#clearSnapshots').is(':checked'),
        clearHistory: $('#clearHistory').is(':checked'),
        clearScrollPositions: $('#clearScrollPositions').is(':checked'),
        clearPagination: $('#clearPagination').is(':checked'),
        clearTabStatus: $('#clearTabStatus').is(':checked'),
      };
      saveCleanupSettings(cleanupSettings);

      // 应用主题
      applyThemeStyles(newConfig.theme);

      // 应用夜间模式
      if ($('#autoNightMode').is(':checked')) {
        $('.acu-table-container').addClass('night-mode');
      } else {
        $('.acu-table-container').removeClass('night-mode');
      }

      showStatusMessage('设置已保存', 'success');

      // 关闭对话框
      setTimeout(() => {
        $('.acu-settings-overlay').remove();
      }, 1000);
    });

    // 点击外部关闭（防误触：mousedown+mouseup都在overlay背景才关闭）
    let settingsMouseDownOnBg = false;
    $('.acu-settings-overlay')
      .on('mousedown', function (e) {
        settingsMouseDownOnBg = $(e.target).hasClass('acu-settings-overlay');
      })
      .on('mouseup', function (e) {
        if (settingsMouseDownOnBg && $(e.target).hasClass('acu-settings-overlay')) {
          $(this).remove();
        }
        settingsMouseDownOnBg = false;
      });
  };

  // 显示清理确认对话框
  const showCleanupConfirmation = cleanupSettings => {
    return new Promise(resolve => {
      const { $ } = getCore();
      const isNightMode = $('.acu-table-container').hasClass('night-mode');

      // 计算要清理的项目
      const itemsToClean = [];
      if (cleanupSettings.clearSnapshots) itemsToClean.push('数据快照');
      if (cleanupSettings.clearHistory) itemsToClean.push('历史记录');
      if (cleanupSettings.clearScrollPositions) itemsToClean.push('滚动位置');
      if (cleanupSettings.clearPagination) itemsToClean.push('分页状态');
      if (cleanupSettings.clearTabStatus) itemsToClean.push('标签状态');

      if (itemsToClean.length === 0) {
        resolve(false);
        return;
      }

      const confirmationHtml = `
                <div class="acu-confirm-overlay ${isNightMode ? 'night-mode' : ''}">
                    <div class="acu-confirm-dialog">
                        <div class="acu-confirm-header">
                            <h3>⚠️ 确认清理操作</h3>
                        </div>

                        <div class="acu-confirm-content">
                            <div class="acu-warning-box" style="margin-bottom: 20px;">
                                <div class="acu-warning-icon">🚨</div>
                                <div class="acu-warning-content">
                                    <strong>重要：请先备份数据库模板！</strong>
                                    <p>清理操作将删除以下数据，且无法恢复：</p>
                                </div>
                            </div>

                            <ul class="acu-cleanup-list">
                                ${itemsToClean.map(item => `<li>${item}</li>`).join('')}
                            </ul>

                            <div class="acu-confirm-question">
                                <p>确定要执行清理吗？</p>
                            </div>
                        </div>

                        <div class="acu-confirm-buttons">
                            <button class="acu-btn acu-btn-secondary" id="acu-confirm-cancel">
                                取消
                            </button>
                            <button class="acu-btn acu-btn-danger" id="acu-confirm-proceed">
                                确定清理
                            </button>
                        </div>
                    </div>
                </div>
            `;

      $('body').append(confirmationHtml);

      // 绑定确认对话框事件
      $('#acu-confirm-cancel').on('click', function () {
        $('.acu-confirm-overlay').remove();
        resolve(false);
      });

      $('#acu-confirm-proceed').on('click', function () {
        $('.acu-confirm-overlay').remove();
        resolve(true);
      });

      // 点击外部关闭（防误触：mousedown+mouseup都在overlay背景才关闭）
      let confirmMouseDownOnBg = false;
      $('.acu-confirm-overlay')
        .on('mousedown', function (e) {
          confirmMouseDownOnBg = $(e.target).hasClass('acu-confirm-overlay');
        })
        .on('mouseup', function (e) {
          if (confirmMouseDownOnBg && $(e.target).hasClass('acu-confirm-overlay')) {
            $(this).remove();
            resolve(false);
          }
          confirmMouseDownOnBg = false;
        });
    });
  };

  // 显示状态消息
  const showStatusMessage = (message, type = 'info') => {
    const { $ } = getCore();
    const $status = $('#acu-settings-status');

    $status.removeClass('success error info').addClass(type).text(message);

    // 3秒后恢复默认状态
    if (type !== 'info') {
      setTimeout(() => {
        $status.removeClass('success error').addClass('info').text('就绪');
      }, 3000);
    }
  };

  const addStyles = () => {
    const { $ } = getCore();

    $(`#${SCRIPT_ID}-styles`).remove();

    const styles = `
            <style id="${SCRIPT_ID}-styles">
                .acu-theme-retro {
                    --acu-primary: #8c6e54;
                    --acu-secondary: #f5ebdc;
                    --acu-background: #fdfaf5;
                    --acu-area-bg: rgba(245, 235, 220, 0.85); /* 经典羊皮 */
                    --acu-text: #5a3e2b;
                    --acu-border: #d4c4a8;
                    --acu-highlight: #b48a5c;
                }
                .acu-theme-dark {
                    --acu-primary: #8479b8;
                    --acu-secondary: #f0ebff;
                    --acu-background: #f8f5ff;
                    --acu-area-bg: rgba(240, 235, 255, 0.8); /* 浅紫灰 */
                    --acu-text: #5a4f7c;
                    --acu-border: #d4cce8;
                    --acu-highlight: #958ac5;
                }
                .acu-theme-modern {
                    --acu-primary: #5c9dff;
                    --acu-secondary: #f0f4f8;
                    --acu-background: #ffffff;
                    --acu-area-bg: rgba(245, 248, 252, 0.9); /* 极致冷白 */
                    --acu-text: #444;
                    --acu-border: #d0d0d0;
                    --acu-highlight: #4a8ae6;
                }
                .acu-theme-forest {
                    --acu-primary: #4a8c5c;
                    --acu-secondary: #e8f0e8;
                    --acu-background: #ffffff;
                    --acu-area-bg: rgba(240, 248, 240, 0.9); /* 清爽浅绿 */
                    --acu-text: #3a6b4a;
                    --acu-border: #b8d0b8;
                    --acu-highlight: #5a9c6c;
                }
                .acu-theme-ocean {
                    --acu-primary: #4a7ca8;
                    --acu-secondary: #e8f0f8;
                    --acu-background: #ffffff;
                    --acu-area-bg: rgba(240, 245, 250, 0.9); /* 冰海浅蓝 */
                    --acu-text: #3a6c98;
                    --acu-border: #b8d0e0;
                    --acu-highlight: #5a8cb8;
                }

                .acu-table-container.night-mode.acu-theme-dark {
                    --acu-secondary: #3a3a3a;
                    --acu-background: #2d2d2d;
                    --acu-area-bg: rgba(45, 45, 45, 0.9); /* 深色透明 */
                    --acu-text: #dbdbd6;
                    --acu-border: #444;
                    --acu-danger: #c44d4d;
                    --acu-info: #4a8ca8;
                }

                /* 统一通知样式 */
                .acu-notification {
                    color: white;
                    padding: 12px 20px;
                    border-radius: 4px;
                    position: fixed;
                    top: 20px; /* 初始顶部位置 */
                    right: 20px;
                    z-index: 9999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: acu-fadeInOut 3s ease-in-out;
                    font-family: 'Microsoft YaHei', sans-serif;
                    font-size: 14px;
                    transition: top 0.3s ease;
                }

                .acu-notification.success {
                    background-color: #66BB6A;
                }

                .acu-notification.error {
                    background-color: #EF5350;
                }

                .acu-notification.warning {
                    background-color: #FFA726;
                }

                .acu-notification.info {
                    background-color: #42A5F5;
                }

                /* =========================================
                   [修复] 编辑单元格弹窗全局样式 (强制覆盖)
                   ========================================= */
                .acu-edit-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10002;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .acu-edit-dialog {
                    width: 400px;
                    background: #ffffff !important; /* 日间模式强制白底 */
                    color: #333333 !important;      /* 日间模式强制深色字 */
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    padding: 0;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .acu-edit-header {
                    /* 使用半透明黑底确保白色文字可见，或者直接用主色 */
                    background: var(--acu-primary);
                    color: #ffffff !important;
                    padding: 12px 15px;
                    font-weight: bold;
                    font-size: 14px;
                    /* 增加文字阴影，防止背景色过浅导致看不清 */
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                }
                .acu-edit-content {
                    padding: 15px;
                }
                .acu-edit-textarea {
                    width: 100%;
                    height: 150px;
                    margin-bottom: 10px;
                    padding: 8px;
                    box-sizing: border-box;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    resize: vertical;
                    font-family: inherit;
                    /* 核心修复：日间模式强制白底黑字 */
                    background-color: #ffffff !important;
                    color: #333333 !important;
                }
                .acu-edit-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                .acu-edit-buttons button {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .acu-save-btn {
                    background-color: var(--acu-primary);
                    color: white;
                }
                .acu-cancel-btn {
                    background-color: #e0e0e0;
                    color: #333;
                }

                /* 夜间模式适配 */
                .acu-edit-overlay.night-mode .acu-edit-dialog {
                    background-color: #2d2d2d !important;
                    color: #dbdbd6 !important;
                    border: 1px solid #444;
                }
                .acu-edit-overlay.night-mode .acu-edit-textarea {
                    background-color: #3a3a3a !important;
                    color: #dbdbd6 !important;
                    border-color: #555;
                }
                .acu-edit-overlay.night-mode .acu-cancel-btn {
                    background-color: #4a4a4a;
                    color: #fff;
                }

                /* 保留兼容性 */
                .acu-load-success-notification {
                    background-color: #66BB6A;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 4px;
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: acu-fadeInOut 3s ease-in-out;
                    font-family: 'Microsoft YaHei', sans-serif;
                    font-size: 14px;
                }

                @keyframes acu-fadeInOut {
                    0% { opacity: 0; transform: translateY(-20px); }
                    15% { opacity: 1; transform: translateY(0); }
                    85% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }

                .acu-tab-btn.has-updates {
                    position: relative;
                }

                .acu-tab-btn .acu-update-badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 6px !important;
                    height: 6px !important;
                    background-color: var(--acu-primary, #5c9dff);
                    border-radius: 50% !important;
                    animation: acu-pulse 2s infinite;
                    z-index: 10;
                    box-shadow: 0 0 4px var(--acu-primary, #5c9dff);
                }

                @keyframes acu-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .acu-table-container {
                    position: relative !important;
                    margin: 15px 0 !important;
                    border: 1px solid var(--acu-border) !important;
                    border-radius: 8px !important;
                    background: var(--acu-background) !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    transition: all 0.3s ease !important;
                    color: var(--acu-text) !important;
                }
                .acu-table-container.night-mode {
                    border-color: #444 !important;
                    background: #2d2d2d !important;
                    color: #dbdbd6 !important;
                }
                .acu-table-container summary {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    padding: 5px 10px !important;
                    cursor: pointer !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    font-weight: bold !important;
                    border: none !important;
                    border-radius: 6px 6px 0 0 !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    font-size: 14px !important;
                    transition: background-color 0.2s ease !important;
                }
                .acu-table-container.night-mode summary {
                    background: var(--acu-primary) !important;
                    color: white !important;
                }
                .acu-table-container summary:hover {
                    opacity: 0.9 !important;
                }
                .acu-table-container summary::-webkit-details-marker {
                    display: none !important;
                }
                .acu-table-container .acu-content-wrapper {
                    padding: 5px !important;
                    background: var(--acu-background) !important;
                    border-radius: 0 0 8px 8px !important;
                    transition: all 0.3s ease !important;
                }
                .acu-table-container.night-mode .acu-content-wrapper {
                    background: #2d2d2d !important;
                }
                .acu-table-container .table-content-area {
                    height: 60vh !important;
                    max-height: 60vh !important;
                    min-height: 200px !important;
                    overflow: auto !important;
                    border: 1px solid rgba(128, 128, 128, 0.2) !important;
                    border-radius: 4px !important;
                    background: var(--acu-area-bg) !important; /* 个性化背景 */
                    padding: 5px !important;
                    margin: 5px 0 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    transition: all 0.3s ease !important;
                    scroll-behavior: auto !important;
                }
                .acu-table-container.night-mode .table-content-area {
                    border-color: #444 !important;
                    background: rgba(45, 45, 45, 0.9) !important;
                }
                .acu-scroll-container {
                    height: 60vh !important;
                    max-height: 60vh !important;
                    min-height: 200px !important;
                    overflow: auto !important;
                }
                .acu-table-container .acu-tabs-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 5px !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                }
                .acu-table-container .acu-tabs-title {
                    font-family: 'Noto Serif SC', serif !important;
                    font-size: 16px !important;
                    color: var(--acu-text) !important;
                    font-weight: 600 !important;
                    margin: 0 !important;
                    transition: color 0.3s ease !important;
                    position: absolute !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    text-align: center !important;
                }
                .acu-table-container.night-mode .acu-tabs-title {
                    color: #dbdbd6 !important;
                }
                /* ========== 极致月相/太阳切换器 (结构化绑定版) ========== */
                .acu-mode-toggle.acu-moon-box {
                    width: 32px !important;
                    height: 24px !important;
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    cursor: pointer !important;
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    outline: none !important;
                    box-shadow: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
                /* 锁定容器位置：取消由于 hover 或 active 引起的 translateY 位移 */
                .acu-mode-toggle.acu-moon-box:hover,
                .acu-mode-toggle.acu-moon-box:active {
                    transform: translate(0, 0) !important;
                }

                .acu-moon-orb {
                    width: 14px !important;
                    height: 14px !important;
                    border-radius: 50% !important;
                    background: #fff9c4 !important; /* 精致香槟金 */
                    box-shadow: 0 0 10px rgba(255, 241, 118, 0.4) !important;
                    position: relative !important;
                    filter: blur(0.5px) !important;
                    z-index: 2;
                    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    margin: auto !important;
                    overflow: visible !important;
                }

                /* 遮罩：默认处于滑出状态 (日间状态：位于左侧隐藏) */
                .acu-moon-orb::after {
                    content: "" !important;
                    position: absolute !important;
                    top: -10% !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 120% !important;
                    background: var(--acu-primary) !important;
                    border-radius: 45% !important;
                    filter: blur(1.5px) !important;
                    transform: translateX(-110%);
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 3;
                }

                /* 夜间模式：月亮形态 (滑入遮罩) */
                .night-mode .acu-moon-orb {
                    background: #ffffff !important;
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5) !important;
                }
                .night-mode .acu-moon-orb::after {
                    transform: translateX(-35%) !important;
                }

                /* 缥缈流云：右侧对向滑入 */
                .acu-moon-cloud {
                    position: absolute !important;
                    width: 22px !important;
                    height: 6px !important;
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.9) 100%) !important;
                    filter: blur(1.5px) !important;
                    border-radius: 10px !important;
                    top: 55% !important;
                    right: -7px !important;
                    opacity: 0 !important;
                    z-index: 10 !important;
                    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    pointer-events: none !important;
                }
                .acu-moon-cloud::after { display: none !important; }
                .night-mode .acu-moon-cloud {
                    right: 2px !important;
                    opacity: 0.7 !important;
                }

                /* 太阳日冕动画：绝对中心锁定 */
                .acu-moon-orb::before {
                    content: "" !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 50% !important;
                    border: 1px solid rgba(255, 241, 118, 0.6) !important;
                    opacity: 0;
                    z-index: 15 !important; /* 提到最高层，穿透日间背景 */
                    box-sizing: border-box !important;
                    transform: translate(-50%, -50%) scale(1);
                    pointer-events: none !important;
                    will-change: transform, opacity;
                    animation: acu-sun-corona 2.5s infinite ease-out !important;
                }
                .acu-mode-toggle.acu-moon-box,
                .acu-moon-orb {
                  overflow: visible !important;
                }

                @keyframes acu-sun-corona {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.8;
                    }
                    100% {
                      transform: translate(-50%, -50%) scale(2);
                      opacity: 0;
                    }
                }

                /* 夜间模式：彻底隐藏日冕 */
                .night-mode .acu-moon-orb::before { display: none !important; }

                /* 增强版粒子特效 */
                .acu-glow-particle {
                    position: absolute !important;
                    width: 1.5px !important;
                    height: 1.5px !important;
                    background: #ffffff !important;
                    border-radius: 50% !important;
                    opacity: 0;
                    pointer-events: none !important;
                    z-index: 1 !important;
                    box-shadow: 0 0 3px #fff, 0 0 6px rgba(255,255,255,0.6) !important;
                }

                .acu-p1 { animation: acu-p-top 4s infinite linear; }
                .acu-p2 { animation: acu-p-bottom 5s infinite linear; animation-delay: 1s; }
                .acu-p3 { animation: acu-p-left 3s infinite linear; animation-delay: 0.5s; }
                .acu-p4 { animation: acu-p-right 6s infinite linear; animation-delay: 2s; }
                .acu-p5 { animation: acu-p-tr 5s infinite linear; animation-delay: 1.5s; }
                .acu-p6 { animation: acu-p-tl 4s infinite linear; animation-delay: 2.5s; }
                .acu-p7 { animation: acu-p-br 6s infinite linear; animation-delay: 3s; }
                .acu-p8 { animation: acu-p-bl 4s infinite linear; animation-delay: 0.2s; }

                @keyframes acu-p-top { 0% { transform: translate(0, -7px); opacity:0; } 20% { opacity:0.8; } 100% { transform: translate(0, -18px); opacity:0; } }
                @keyframes acu-p-bottom { 0% { transform: translate(0, 7px); opacity:0; } 20% { opacity:0.7; } 100% { transform: translate(0, 18px); opacity:0; } }
                @keyframes acu-p-left { 0% { transform: translate(-7px, 0); opacity:0; } 20% { opacity:0.6; } 100% { transform: translate(-18px, 0); opacity:0; } }
                @keyframes acu-p-right { 0% { transform: translate(7px, 0); opacity:0; } 20% { opacity:0.7; } 100% { transform: translate(18px, 0); opacity:0; } }
                @keyframes acu-p-tr { 0% { transform: translate(5px, -5px); opacity:0; } 20% { opacity:0.6; } 100% { transform: translate(12px, -12px); opacity:0; } }
                @keyframes acu-p-tl { 0% { transform: translate(-5px, -5px); opacity:0; } 20% { opacity:0.7; } 100% { transform: translate(-12px, -12px); opacity:0; } }
                @keyframes acu-p-br { 0% { transform: translate(5px, 5px); opacity:0; } 20% { opacity:0.6; } 100% { transform: translate(12px, 12px); opacity:0; } }
                @keyframes acu-p-bl { 0% { transform: translate(-5px, 5px); opacity:0; } 20% { opacity:0.7; } 100% { transform: translate(-12px, 12px); opacity:0; } }

                .acu-star-dust {
                    position: absolute !important;
                    color: #ffffff !important;
                    opacity: 0;
                    animation: acu-twinkle 4s infinite ease-in-out !important;
                    z-index: 4;
                    display: block !important;
                    line-height: 1 !important;
                    pointer-events: none !important;
                    text-align: center !important;
                }
                /* 星尘 (随机错位布局) */
                .acu-star-dust.s1 { top: 2px !important; right: 4px !important; font-size: 5px !important; width: 5px !important; height: 5px !important; animation: acu-twinkle 3.3s infinite ease-in-out !important; animation-delay: 0.5s !important; }
                .acu-star-dust.s2 { bottom: 3px !important; left: 3px !important; font-size: 3px !important; width: 3px !important; height: 3px !important; animation: acu-twinkle 4.7s infinite ease-in-out !important; animation-delay: 2.1s !important; }
                .acu-star-dust.s3 { top: 4px !important; left: 5px !important; font-size: 4px !important; width: 4px !important; height: 4px !important; animation: acu-twinkle 5.9s infinite ease-in-out !important; animation-delay: 1.2s !important; }
                .acu-star-dust.s4 { bottom: 2px !important; right: 6px !important; font-size: 2px !important; width: 2px !important; height: 2px !important; animation: acu-twinkle 7.1s infinite ease-in-out !important; animation-delay: 3.5s !important; }
                .acu-star-dust.s5 { top: 50% !important; right: 2px !important; transform: translateY(-50%) !important; font-size: 3px !important; width: 3px !important; height: 3px !important; animation: acu-twinkle 3.8s infinite ease-in-out !important; animation-delay: 0.1s !important; }


                @keyframes acu-twinkle {
                    0%, 100% { opacity: 0; transform: scale(0.3); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }

                .acu-mode-toggle:hover .acu-moon-orb {
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.8) !important;
                }

                /* 设置按钮样式 */
                .acu-table-container .acu-settings-btn-header {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.2s ease !important;
                }
                .acu-table-container .acu-settings-btn-header:hover {
                    opacity: 0.9 !important;
                    transform: translateY(-1px) !important;
                }
                .acu-table-container.night-mode .acu-settings-btn-header {
                    background: var(--acu-primary) !important;
                }

                .acu-table-container .acu-order-edit-btn {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.2s ease !important;
                }
                .acu-table-container.night-mode .acu-order-edit-btn {
                    background: var(--acu-primary) !important;
                }
                .acu-table-container .acu-order-edit-btn:hover {
                    opacity: 0.9 !important;
                    transform: translateY(-1px) !important;
                }
                .acu-table-container .acu-theme-btn {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 6px 10px !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.2s ease !important;
                    margin-left: 8px !important;
                    min-width: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .acu-table-container .acu-theme-btn:hover {
                    opacity: 0.9 !important;
                    transform: translateY(-1px) !important;
                }
                .acu-table-container.night-mode .acu-theme-btn {
                    background: var(--acu-primary) !important;
                }
                .acu-table-container .acu-order-controls {
                    display: none !important;
                    gap: 8px !important;
                    margin-bottom: 15px !important;
                    justify-content: center !important;
                    flex-wrap: wrap !important;
                }
                .acu-table-container .acu-order-controls.visible {
                    display: flex !important;
                }
                .acu-table-container .acu-save-order-btn,
                .acu-table-container .acu-cancel-order-btn {
                    padding: 8px 16px !important;
                    border: none !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.3s ease !important;
                }
                .acu-table-container .acu-save-order-btn {
                    background: #5cb85c !important;
                    color: white !important;
                }
                .acu-table-container .acu-cancel-order-btn {
                    background: var(--acu-secondary) !important;
                    color: var(--acu-text) !important;
                    border: 1px solid var(--acu-border) !important;
                }
                .acu-table-container.night-mode .acu-cancel-order-btn {
                    background: #3a3a3a !important;
                    color: #dbdbd6 !important;
                    border-color: #555 !important;
                }
                .acu-table-container .acu-tabs-container {
                    display: flex !important;
                    gap: 5px !important;
                    justify-content: flex-start !important;
                    flex-wrap: wrap !important;
                    margin-bottom: 10px !important;
                }
                .acu-table-container .acu-pagination-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                    margin: 6px 0 6px 0;
                    flex-wrap: wrap;
                }
                .acu-table-container .acu-page-btn {
                    padding: 3px 8px;
                    border: 1px solid var(--acu-border);
                    background: var(--acu-secondary);
                    color: var(--acu-text);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    min-width: 30px;
                    text-align: center;
                    transition: all 0.2s;
                }
                .acu-table-container .acu-page-btn:hover {
                    background: var(--acu-primary);
                    color: white;
                    border-color: var(--acu-primary);
                }
                .acu-table-container .acu-page-btn.active {
                    background: var(--acu-primary);
                    color: white;
                    border-color: var(--acu-primary);
                    font-weight: bold;
                }
                .acu-table-container .acu-page-btn.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .acu-table-container .acu-tab-btn {
                    background: var(--acu-secondary) !important;
                    border: 1px solid var(--acu-border) !important;
                    color: var(--acu-text) !important;
                    padding: 6px 5px !important;
                    border-radius: 6px !important;
                    font-size: 13px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease-in-out !important;
                    font-family: 'Noto Serif SC', serif !important;
                    box-shadow: 0 2px 4px rgba(62,39,26,0.1) !important;
                    margin: 2px !important;
                    white-space: nowrap !important;
                }
                .acu-table-container.night-mode .acu-tab-btn {
                    background: #3a3a3a !important;
                    border-color: #555 !important;
                    color: #dbdbd6 !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
                }
                .acu-table-container .acu-tab-btn:hover {
                    background: #e8dfd0 !important;
                }
                .acu-table-container.night-mode .acu-tab-btn:hover {
                    background: #4a4a4a !important;
                }
                .acu-table-container .acu-tab-btn.active {
                    background: var(--acu-highlight) !important;
                    color: white !important;
                    border-color: var(--acu-highlight) !important;
                }
                .acu-table-container.night-mode .acu-tab-btn.active {
                    background: var(--acu-highlight) !important;
                    border-color: var(--acu-highlight) !important;
                }
                .acu-table-container .acu-tab-btn.dragging {
                    opacity: 0.5 !important;
                    cursor: grabbing !important;
                }
                .acu-table-container.editing-order .acu-tab-btn {
                    cursor: grab !important;
                    border: 2px dashed var(--acu-primary) !important;
                }
                .acu-table-container.night-mode.editing-order .acu-tab-btn {
                    border-color: var(--acu-primary) !important;
                }
                .acu-table-container.editing-order .acu-tab-btn:hover {
                    background: #f0e6d5 !important;
                }
                .acu-table-container.night-mode.editing-order .acu-tab-btn:hover {
                    background: #4a4a4a !important;
                }
                .acu-table-container .acu-table-section {
                    display: none !important;
                }
                .acu-table-container .acu-table-section.active {
                    display: block !important;
                }
                .acu-table-container .section-title {
                    font-family: 'Noto Serif SC', serif !important;
                    font-size: 18px !important;
                    color: var(--acu-text) !important;
                    margin-bottom: 5px !important;
                    padding-bottom: 5px !important;
                    border-bottom: 2px solid rgba(90,62,43,0.3) !important;
                    font-weight: 700 !important;
                    transition: all 0.3s ease !important;
                }
                .acu-table-container.night-mode .section-title {
                    color: #dbdbd6 !important;
                    border-bottom-color: #555 !important;
                }
                .acu-table-container .data-table-wrapper {
                    margin-bottom: 20px !important;
                    border: 1px solid rgba(90,62,43,0.2) !important;
                    border-radius: 4px !important;
                    background: white !important;
                    transition: all 0.3s ease !important;
                    overflow-x: auto;
                }
                .acu-table-container.night-mode .data-table-wrapper {
                    border-color: #444 !important;
                    background: #363636 !important;
                }
                /* 行拖动样式 */
                .acu-table-container.editing-row-order .data-table tbody tr {
                    cursor: move !important;
                    user-select: none !important;
                    -webkit-user-select: none !important;
                }
                .acu-table-container.editing-row-order .data-table tbody tr:hover {
                    background-color: rgba(255, 165, 0, 0.1) !important;
                }
                .acu-table-container:not(.editing-row-order) .data-table tbody tr {
                    cursor: default !important;
                }
                .acu-table-container .data-table tbody tr.dragging {
                    opacity: 0.5 !important;
                    transform: scale(1.02) !important;
                    background-color: rgba(255, 215, 0, 0.3) !important;
                    cursor: grabbing !important;
                }
                .acu-table-container.night-mode .data-table tbody tr.dragging {
                    background-color: rgba(255, 215, 0, 0.2) !important;
                }
                .acu-table-container .data-table tbody tr.drag-over {
                    background-color: rgba(135, 206, 250, 0.2) !important;
                    border-top: 2px solid #87CEFA !important;
                }
                .acu-table-container.night-mode .data-table tbody tr.drag-over {
                    background-color: rgba(135, 206, 250, 0.15) !important;
                }

                .acu-table-container .data-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    font-size: 13px !important;
                    min-width: 600px !important;
                }
                .acu-table-container .data-table th {
                    background-color: var(--acu-primary) !important;
                    color: #fdfaf5 !important;
                    padding: 5px 5px !important;
                    text-align: center !important;
                    font-weight: bold !important;
                    border: 1px solid rgba(90,62,43,0.3) !important;
                    font-family: 'Noto Serif SC', serif !important;
                    font-size: 14px !important;
                    transition: all 0.3s ease !important;
                }
                .acu-table-container.night-mode .data-table th {
                    background-color: var(--acu-primary) !important;
                    border-color: #555 !important;
                }
                .acu-table-container .data-table td {
                    padding: 5px 5px !important;
                    text-align: left !important;
                    border: 1px solid rgba(90,62,43,0.2) !important;
                    background-color: rgba(255, 255, 255, 0.9) !important;
                    cursor: pointer !important;
                    transition: background-color 0.2s !important;
                    word-wrap: break-word !important;
                    font-size: 13px !important;
                    color: var(--acu-text) !important;
                    font-weight: 500 !important;
                }
                .acu-table-container.night-mode .data-table td {
                    background-color: rgba(54, 54, 54, 0.9) !important;
                    border-color: #444 !important;
                    color: #dbdbd6 !important;
                }
                .acu-table-container .data-table tr:nth-child(even) td {
                    background-color: rgba(250, 245, 235, 0.9) !important;
                }
                .acu-table-container.night-mode .data-table tr:nth-child(even) td {
                    background-color: rgba(58, 58, 58, 0.9) !important;
                }
                .acu-table-container .acu-editable-cell:hover {
                    background-color: rgba(180, 138, 92, 0.15) !important;
                }
                .acu-table-container.night-mode .acu-editable-cell:hover {
                    background-color: rgba(132, 121, 184, 0.2) !important;
                }
                .acu-table-container .data-table tr.pending-deletion td {
                    background-color: rgba(255, 200, 200, 0.6) !important;
                    border-color: rgba(255, 100, 100, 0.4) !important;
                    color: #8b0000 !important;
                }
                .acu-table-container.night-mode .data-table tr.pending-deletion td {
                    background-color: rgba(139, 0, 0, 0.3) !important;
                    border-color: rgba(255, 100, 100, 0.3) !important;
                    color: #ff9999 !important;
                }

                .acu-highlight-user-edit {
                    background-color: #90ee9080 !important;
                    border: 2px solid #32CD32 !important;
                    color: #2d5016 !important;
                    font-weight: 600 !important;
                    position: relative !important;
                    z-index: 10 !important;
                }
                .acu-highlight-user-edit::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: #90ee9080 !important;
                    z-index: -1 !important;
                }
                .acu-table-container.night-mode .acu-highlight-user-edit {
                    background-color: rgba(76, 175, 80, 0.85) !important;
                    color: #c8ffc8 !important;
                }

                .acu-highlight-changed {
                    background-color: #8795fa61 !important;
                    border: 2px solid #00a3e0 !important;
                    color: #1a5490 !important;
                    font-weight: 600 !important;
                    position: relative !important;
                    z-index: 10 !important;
                }
                .acu-highlight-changed::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: #8795fa61 !important;
                    z-index: -1 !important;
                }
                .acu-table-container.night-mode .acu-highlight-changed {
                    background-color: rgba(33, 150, 243, 0.85) !important;
                    color: #bbdefb !important;
                }

                .acu-table-container .acu-save-db-btn-header {
                    background: #5cb85c !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.2s ease !important;
                }
                .acu-table-container.night-mode .acu-save-db-btn-header {
                    background: var(--acu-primary) !important;
                }
                .acu-table-container .acu-save-db-btn-header:hover {
                    background: #6fc86f !important;
                    transform: translateY(-1px) !important;
                }
                .acu-table-container.night-mode .acu-save-db-btn-header:hover {
                    background: var(--acu-highlight) !important;
                }
                .acu-table-container .acu-save-db-btn-header:disabled {
                    background: #cccccc !important;
                    cursor: not-allowed !important;
                    transform: none !important;
                }
                .acu-table-container.night-mode .acu-save-db-btn-header:disabled {
                    background: #666 !important;
                }
                .acu-table-container .acu-refresh-btn-header {
                    background: #337ab7 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.2s ease !important;
                }
                .acu-table-container.night-mode .acu-refresh-btn-header {
                    background: var(--acu-primary) !important;
                }
                .acu-table-container .acu-refresh-btn-header:hover {
                    background: #286090 !important;
                    transform: translateY(-1px) !important;
                }
                .acu-table-container.night-mode .acu-refresh-btn-header:hover {
                    background: var(--acu-highlight) !important;
                }

                .acu-table-container .empty-message {
                    text-align: center !important;
                    padding: 40px 20px !important;
                    color: var(--acu-text) !important;
                    font-style: italic !important;
                    font-size: 16px !important;
                    background: rgba(255, 255, 255, 0.7) !important;
                    border-radius: 6px !important;
                    margin: 10px 0 !important;
                    transition: all 0.3s ease !important;
                }
                .acu-table-container.night-mode .empty-message {
                    color: #dbdbd6 !important;
                    background: rgba(58, 58, 58, 0.7) !important;
                }

                .acu-cell-menu {
                    position: fixed !important;
                    background: white !important;
                    border: 1px solid var(--acu-primary) !important;
                    border-radius: 6px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                    z-index: 10000 !important;
                    min-width: 150px !important;
                    max-width: 90vw !important;
                    overflow: hidden !important;
                    transition: all 0.3s ease !important;
                }
                .acu-cell-menu.night-mode {
                    background: #3a3a3a !important;
                    border-color: var(--acu-primary) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
                }

                /* 刷新按钮菜单（4项）- 高对比、非透明、跟随日夜 */
                .acu-cell-menu.acu-refresh-menu {
                    background: rgba(255, 255, 255, 0.98) !important;
                    border: 1px solid rgba(0, 0, 0, 0.12) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 18px 46px rgba(0,0,0,0.18) !important;
                    min-width: 220px !important;
                    padding: 6px !important;
                    overflow: hidden !important;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .acu-cell-menu.acu-refresh-menu.night-mode {
                    background: rgba(34, 34, 34, 0.98) !important;
                    border-color: rgba(255, 255, 255, 0.14) !important;
                    box-shadow: 0 18px 60px rgba(0,0,0,0.55) !important;
                }
                .acu-cell-menu.acu-refresh-menu .acu-cell-menu-item {
                    border-bottom: none !important;
                    border-radius: 10px !important;
                    padding: 10px 12px !important;
                    font-size: 13px !important;
                    color: #2b2b2b !important;
                    transition: background-color 0.12s ease, transform 0.12s ease !important;
                }
                .acu-cell-menu.acu-refresh-menu.night-mode .acu-cell-menu-item {
                    color: #e7e7e1 !important;
                }
                .acu-cell-menu.acu-refresh-menu .acu-cell-menu-item:hover {
                    background: rgba(0,0,0,0.05) !important;
                }
                .acu-cell-menu.acu-refresh-menu.night-mode .acu-cell-menu-item:hover {
                    background: rgba(255,255,255,0.07) !important;
                }
                .acu-cell-menu.acu-refresh-menu .acu-cell-menu-item:active {
                    transform: translateY(1px) !important;
                }
                .acu-cell-menu.acu-refresh-menu .acu-cell-menu-item.close {
                    opacity: 0.85 !important;
                }

                /* 快捷选项：托管数据库面板时的“新CSS架构” */
                .auto-card-updater-popup.acu-db-shortcut-layout{
                    padding: 12px !important;
                }
                .auto-card-updater-popup.acu-db-shortcut-layout .acu-layout{
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                }
                /* 只要三页按钮，且横排置顶（更符合快捷弹窗） */
                .auto-card-updater-popup.acu-db-shortcut-layout .acu-tabs-nav{
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 8px !important;
                    padding: 10px !important;
                    border-radius: 14px !important;
                    overflow-x: auto !important;
                }
                .auto-card-updater-popup.acu-db-shortcut-layout .acu-tab-button{
                    flex: 1 1 0 !important;
                    min-width: 140px !important;
                    justify-content: center !important;
                    border-radius: 12px !important;
                    padding: 12px 12px !important;
                    font-size: 13px !important;
                    letter-spacing: .2px !important;
                }
                .auto-card-updater-popup.acu-db-shortcut-layout .acu-tab-button::after{ display:none !important; }

                /* 仅在 status 页激活时做左右分栏，避免破坏分页 */
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status.active{
                    display: grid;
                    grid-template-columns: minmax(340px, 1fr) minmax(360px, 1fr);
                    gap: 12px;
                    align-items: start;
                }
                @media (max-width: 780px){
                    .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status.active{
                        grid-template-columns: 1fr;
                    }
                }

                /* 标记卡片：用 JS 打 class 后做定位 */
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-core{ grid-column: 1; grid-row: 1; }
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-common{ grid-column: 1; grid-row: 2; }
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-config{ grid-column: 1; grid-row: 3; }
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-status{ grid-column: 2; grid-row: 1 / span 2; }
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-manual{ grid-column: 2; grid-row: 3; }

                /* 状态表：限制高度并可滚动，减少横向占用 */
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-status tbody{
                    display: block;
                    max-height: 240px;
                    overflow: auto;
                }
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-status thead,
                .auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-status tbody tr{
                    display: table;
                    width: 100%;
                    table-layout: fixed;
                }
                .acu-cell-menu-item {
                    padding: 10px 15px !important;
                    cursor: pointer !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                    font-size: 13px !important;
                    color: #626262 !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: background-color 0.2s !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item {
                    border-bottom-color: #555 !important;
                    color: #ffffff !important;
                }
                .acu-cell-menu-item:hover {
                    background-color: var(--acu-secondary) !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item:hover {
                    background-color: #4a4a4a !important;
                }
                .acu-cell-menu-item:last-child {
                    border-bottom: none !important;
                }
                .acu-cell-menu-item.edit {
                    font-weight: 600 !important;
                    color: #626262 !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item.edit {
                    color: #ffffff !important;
                }
                .acu-cell-menu-item.insert {
                    font-weight: 600 !important;
                    color: #4a7ca8 !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item.insert {
                    color: #87ceeb !important;
                }
                .acu-cell-menu-item.delete {
                    font-weight: 600 !important;
                    color: #cc0000 !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item.delete {
                    color: #ff6666 !important;
                }
                .acu-cell-menu-item.restore {
                    font-weight: 600 !important;
                    color: #5cb85c !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item.restore {
                    color: #66cc66 !important;
                }
                .acu-cell-menu-item.close {
                    font-weight: 600 !important;
                    border-top: 1px solid #f0f0f0 !important;
                    color: #666 !important;
                }
                .acu-cell-menu.night-mode .acu-cell-menu-item.close {
                    color: #ffffff !important;
                    border-top-color: #555 !important;
                }

                .acu-edit-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(0, 0, 0, 0.4) !important;
                    z-index: 9999 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px !important;
                    box-sizing: border-box !important;
                }
                .acu-edit-overlay.night-mode {
                    background: rgba(0, 0, 0, 0.6) !important;
                }
                .acu-edit-dialog {
                    background: white !important;
                    border: 2px solid var(--acu-highlight) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
                    width: 90% !important;
                    max-width: 600px !important;
                    max-height: 85vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    transition: all 0.3s ease !important;
                }
                .acu-edit-overlay.night-mode .acu-edit-dialog {
                    background: #3a3a3a !important;
                    border-color: var(--acu-highlight) !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
                }
                .acu-edit-header {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    padding: 12px 16px !important;
                    border-radius: 6px 6px 0 0 !important;
                    font-weight: bold !important;
                    font-size: 14px !important;
                    flex-shrink: 0 !important;
                    transition: all 0.3s ease !important;
                }
                .acu-edit-overlay.night-mode .acu-edit-header {
                    background: var(--acu-primary) !important;
                }
                .acu-edit-content {
                    padding: 16px !important;
                    flex-grow: 1 !important;
                    overflow-y: auto !important;
                }
                .acu-edit-textarea {
                    width: 100% !important;
                    min-height: 120px !important;
                    border: 1px solid var(--acu-border) !important;
                    border-radius: 4px !important;
                    padding: 10px !important;
                    font-family: inherit !important;
                    font-size: 13px !important;
                    color: rgb(140, 191, 64) !important;
                    resize: vertical !important;
                    box-sizing: border-box !important;
                    background: white !important;
                    transition: all 0.3s ease !important;
                }
                .acu-edit-overlay.night-mode .acu-edit-textarea {
                    background: #2d2d2d !important;
                    border-color: #555 !important;
                    color: rgb(140, 191, 64) !important;
                }
                .acu-edit-textarea:focus {
                    outline: none !important;
                    border-color: var(--acu-highlight) !important;
                }
                .acu-edit-overlay.night-mode .acu-edit-textarea:focus {
                    border-color: var(--acu-highlight) !important;
                }
                .acu-edit-buttons {
                    display: flex !important;
                    gap: 10px !important;
                    justify-content: flex-end !important;
                    margin-top: 16px !important;
                    padding-top: 16px !important;
                    border-top: 1px solid #e8dfd0 !important;
                    flex-shrink: 0 !important;
                    transition: all 0.3s ease !important;
                }
                .acu-edit-overlay.night-mode .acu-edit-buttons {
                    border-top-color: #555 !important;
                }
                .acu-save-btn, .acu-cancel-btn {
                    padding: 8px 16px !important;
                    border: none !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    transition: all 0.3s ease !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                }
                .acu-edit-overlay:not(.night-mode) .acu-save-btn {
                    background-color: #4CAF50 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 8px 16px !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                }
                .acu-edit-overlay:not(.night-mode) .acu-save-btn:hover {
                    background-color: #45a049 !important;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.25) !important;
                    transform: translateY(-1px);
                }
                .acu-edit-overlay.night-mode .acu-save-btn {
                    background-color: #2E7D32 !important;
                    color: white !important;
                    border: none !important;
                }
                .acu-edit-overlay.night-mode .acu-save-btn:hover {
                    background-color: #1B5E20 !important;
                }
                .acu-edit-overlay:not(.night-mode) .acu-cancel-btn {
                    background-color: #f0f0f0 !important;
                    color: #626262 !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 8px 16px !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                }
                .acu-edit-overlay:not(.night-mode) .acu-cancel-btn:hover {
                    background-color: #e0e0e0 !important;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.15) !important;
                    transform: translateY(-1px);
                }
                .acu-edit-overlay.night-mode .acu-cancel-btn {
                    background-color: #333 !important;
                    color: #ccc !important;
                    border: 1px solid #555 !important;
                }
                .acu-edit-overlay.night-mode .acu-cancel-btn:hover {
                    background-color: #444 !important;
                    border-color: #666 !important;
                }

                .acu-theme-menu .acu-cell-menu-item.active {
                    background-color: var(--acu-secondary) !important;
                    font-weight: bold !important;
                }
                .acu-theme-menu.night-mode .acu-cell-menu-item.active {
                    background-color: #4a4a4a !important;
                }
                .acu-theme-menu .acu-cell-menu-item {
                    color: #626262 !important;
                }
                .acu-theme-menu.night-mode .acu-cell-menu-item {
                    color: #dbdbd6 !important;
                }

                /* 新增：保存按钮待删除状态样式 */
                .acu-table-container .acu-save-db-btn-header.has-pending-deletes {
                    background: #e74c3c !important;
                    color: white !important;
                    animation: acu-pulse 1.5s infinite;
                }
                .acu-table-container.night-mode .acu-save-db-btn-header.has-pending-deletes {
                    background: #c0392b !important;
                }

                /* 【新增】设置界面样式 */
                .acu-settings-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                    z-index: 10010 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px !important;
                    box-sizing: border-box !important;
                }
                .acu-settings-overlay.night-mode {
                    background: rgba(0, 0, 0, 0.7) !important;
                }
                .acu-settings-dialog {
                    background: var(--acu-background) !important;
                    border: 2px solid var(--acu-highlight) !important;
                    border-radius: 10px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
                    width: 90% !important;
                    max-width: 800px !important;
                    max-height: 85vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    transition: all 0.3s ease !important;
                    color: var(--acu-text) !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-dialog {
                    border-color: var(--acu-highlight) !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
                }
                .acu-settings-header {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    padding: 15px 20px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    border-radius: 8px 8px 0 0 !important;
                    flex-shrink: 0 !important;
                }
                .acu-settings-header h3 {
                    margin: 0 !important;
                    font-size: 16px !important;
                    font-weight: bold !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                }
                .acu-settings-close {
                    background: transparent !important;
                    border: none !important;
                    color: white !important;
                    font-size: 20px !important;
                    cursor: pointer !important;
                    width: 30px !important;
                    height: 30px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 4px !important;
                    transition: background-color 0.2s !important;
                }
                .acu-settings-close:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                }
                .acu-settings-tabs {
                    display: flex !important;
                    background: var(--acu-secondary) !important;
                    border-bottom: 1px solid var(--acu-border) !important;
                    flex-shrink: 0 !important;
                }
                .acu-settings-tab {
                    flex: 1 !important;
                    padding: 12px 15px !important;
                    background: transparent !important;
                    border: none !important;
                    color: var(--acu-text) !important;
                    font-size: 13px !important;
                    cursor: pointer !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.3s ease !important;
                    border-bottom: 3px solid transparent !important;
                }
                .acu-settings-tab:hover {
                    background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.1) !important;
                }
                .acu-settings-tab.active {
                    background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.15) !important;
                    color: var(--acu-primary) !important;
                    border-bottom-color: var(--acu-primary) !important;
                    font-weight: bold !important;
                }
                .acu-settings-content {
                    flex-grow: 1 !important;
                    overflow-y: auto !important;
                    padding: 20px !important;
                }
                .acu-settings-tab-content {
                    display: none !important;
                }
                .acu-settings-tab-content.active {
                    display: block !important;
                }
                .acu-settings-footer {
                    padding: 15px 20px !important;
                    border-top: 1px solid var(--acu-border) !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    flex-shrink: 0 !important;
                    background: var(--acu-secondary) !important;
                }
                .acu-settings-status {
                    font-size: 12px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.8 !important;
                    transition: all 0.3s ease !important;
                }
                .acu-settings-status.success {
                    color: var(--acu-success) !important;
                    opacity: 1 !important;
                }
                .acu-settings-status.error {
                    color: var(--acu-danger) !important;
                    opacity: 1 !important;
                }
                .acu-settings-status.info {
                    color: var(--acu-info) !important;
                    opacity: 1 !important;
                }
                .acu-settings-buttons {
                    display: flex !important;
                    gap: 10px !important;
                }
                .acu-btn {
                    padding: 8px 16px !important;
                    border: none !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    font-family: 'Microsoft YaHei', sans-serif !important;
                    transition: all 0.3s ease !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                }
                .acu-btn-primary {
                    background: var(--acu-primary) !important;
                    color: white !important;
                }
                .acu-btn-primary:hover {
                    opacity: 0.9 !important;
                    transform: translateY(-1px) !important;
                }
                .acu-btn-secondary {
                    background: var(--acu-secondary) !important;
                    color: var(--acu-text) !important;
                    border: 1px solid var(--acu-border) !important;
                }
                .acu-btn-secondary:hover {
                    background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.1) !important;
                }
                .acu-btn-danger {
                    background: var(--acu-danger) !important;
                    color: white !important;
                }
                .acu-btn-danger:hover {
                    opacity: 0.9 !important;
                    transform: translateY(-1px) !important;
                }
                .acu-btn:disabled {
                    opacity: 0.5 !important;
                    cursor: not-allowed !important;
                    transform: none !important;
                }
                /* 存储信息样式 */
                .acu-storage-info {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 20px !important;
                }
                .acu-storage-summary {
                    background: var(--acu-secondary) !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    border: 1px solid var(--acu-border) !important;
                }
                .acu-storage-summary h4 {
                    margin-top: 0 !important;
                    margin-bottom: 15px !important;
                    font-size: 14px !important;
                    color: var(--acu-text) !important;
                }
                .acu-storage-bar {
                    height: 20px !important;
                    background: rgba(0, 0, 0, 0.1) !important;
                    border-radius: 10px !important;
                    overflow: hidden !important;
                    margin-bottom: 10px !important;
                }
                .acu-storage-bar-fill {
                    height: 100% !important;
                    background: linear-gradient(90deg, var(--acu-primary), var(--acu-highlight)) !important;
                    border-radius: 10px !important;
                    transition: width 0.5s ease !important;
                }
                .acu-storage-stats {
                    display: flex !important;
                    justify-content: space-between !important;
                    font-size: 12px !important;
                    color: var(--acu-text) !important;
                }
                .acu-storage-stats strong {
                    font-weight: bold !important;
                }
                .acu-cleanable {
                    color: var(--acu-success) !important;
                }
                /* 警告框样式 */
                .acu-warning-box {
                    background: rgba(var(--acu-warning-rgb, 255, 193, 7), 0.1) !important;
                    border: 1px solid var(--acu-warning) !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    display: flex !important;
                    gap: 12px !important;
                    align-items: flex-start !important;
                }
                .acu-warning-icon {
                    font-size: 20px !important;
                    flex-shrink: 0 !important;
                }
                .acu-warning-content {
                    flex-grow: 1 !important;
                }
                .acu-warning-content strong {
                    color: var(--acu-warning) !important;
                    font-size: 13px !important;
                    display: block !important;
                    margin-bottom: 5px !important;
                }
                .acu-warning-content p {
                    margin: 5px 0 !important;
                    font-size: 12px !important;
                    line-height: 1.4 !important;
                    color: var(--acu-text) !important;
                }
                .acu-highlight-warning {
                    color: var(--acu-danger) !important;
                    font-weight: bold !important;
                    text-decoration: underline !important;
                }
                /* 清理选项样式 */
                .acu-cleanup-options {
                    background: var(--acu-secondary) !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    border: 1px solid var(--acu-border) !important;
                }
                .acu-cleanup-options h4 {
                    margin-top: 0 !important;
                    margin-bottom: 15px !important;
                    font-size: 14px !important;
                    color: var(--acu-text) !important;
                }
                .acu-option-group {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                }
                .acu-checkbox {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    cursor: pointer !important;
                }
                .acu-checkbox input[type="checkbox"] {
                    margin-right: 8px !important;
                }
                .acu-checkbox span {
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: var(--acu-text) !important;
                }
                .acu-checkbox small {
                    font-size: 11px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.7 !important;
                    margin-left: 22px !important;
                }
                .acu-checkbox.protected {
                    opacity: 0.7 !important;
                }
                .acu-checkbox.protected input[type="checkbox"] {
                    cursor: not-allowed !important;
                }
                .acu-protected-settings {
                    margin-top: 20px !important;
                    padding-top: 15px !important;
                    border-top: 1px dashed var(--acu-border) !important;
                }
                .acu-protected-settings h5 {
                    margin-top: 0 !important;
                    margin-bottom: 10px !important;
                    font-size: 13px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.8 !important;
                }
                /* 清理操作按钮 */
                .acu-cleanup-actions {
                    display: flex !important;
                    gap: 10px !important;
                    justify-content: flex-end !important;
                    margin-top: 10px !important;
                }
                /* 外观设置样式 */
                .acu-appearance-options {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 20px !important;
                }
                .acu-theme-selector {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
                    gap: 10px !important;
                    margin-top: 10px !important;
                }
                .acu-theme-option {
                    border: 2px solid var(--acu-border) !important;
                    border-radius: 8px !important;
                    padding: 10px !important;
                    cursor: pointer !important;
                    transition: all 0.3s ease !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 5px !important;
                }
                .acu-theme-option:hover {
                    border-color: var(--acu-primary) !important;
                    transform: translateY(-2px) !important;
                }
                .acu-theme-option.active {
                    border-color: var(--acu-highlight) !important;
                    background: rgba(var(--acu-highlight-rgb, 180, 138, 92), 0.1) !important;
                }
                .acu-theme-option input {
                    display: none !important;
                }
                .acu-theme-icon {
                    font-size: 24px !important;
                }
                .acu-theme-name {
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    color: var(--acu-text) !important;
                }
                .acu-radio-group span {
                    display: block !important;
                    margin-bottom: 5px !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: var(--acu-text) !important;
                }
                .acu-slider-group {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 8px !important;
                }
                .acu-slider-group span {
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: var(--acu-text) !important;
                }
                .acu-slider-group input[type="range"] {
                    width: 100% !important;
                    height: 6px !important;
                    background: var(--acu-secondary) !important;
                    border-radius: 3px !important;
                    outline: none !important;
                    -webkit-appearance: none !important;
                }
                .acu-slider-group input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none !important;
                    width: 18px !important;
                    height: 18px !important;
                    background: var(--acu-primary) !important;
                    border-radius: 50% !important;
                    cursor: pointer !important;
                }
                /* 高级选项样式 */
                .acu-advanced-options {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 20px !important;
                }
                .acu-storage-details {
                    background: var(--acu-secondary) !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    border: 1px solid var(--acu-border) !important;
                }
                .acu-storage-details h5 {
                    margin-top: 0 !important;
                    margin-bottom: 15px !important;
                    font-size: 14px !important;
                    color: var(--acu-text) !important;
                }
                .acu-storage-items {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 15px !important;
                }
                .acu-storage-section h6 {
                    margin-top: 0 !important;
                    margin-bottom: 8px !important;
                    font-size: 12px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.8 !important;
                }
                .acu-storage-item {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 8px 10px !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                    border-radius: 4px !important;
                    margin-bottom: 5px !important;
                }
                .acu-storage-item.critical {
                    border-left: 3px solid var(--acu-success) !important;
                }
                .acu-storage-item.cleanable {
                    border-left: 3px solid var(--acu-warning) !important;
                }
                .acu-storage-item-name {
                    font-size: 12px !important;
                    color: var(--acu-text) !important;
                }
                .acu-storage-item-size {
                    font-size: 11px !important;
                    font-weight: bold !important;
                    color: var(--acu-text) !important;
                    opacity: 0.8 !important;
                }
                .acu-advanced-actions {
                    display: flex !important;
                    gap: 10px !important;
                    justify-content: flex-end !important;
                    margin-top: 20px !important;
                }
                /* 确认对话框样式 */
                .acu-confirm-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(0, 0, 0, 0.6) !important;
                    z-index: 10020 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px !important;
                    box-sizing: border-box !important;
                }
                .acu-confirm-dialog {
                    background: var(--acu-background) !important;
                    border: 2px solid var(--acu-danger) !important;
                    border-radius: 10px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
                    width: 90% !important;
                    max-width: 500px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    color: var(--acu-text) !important;
                }
                .acu-confirm-header {
                    background: var(--acu-danger) !important;
                    color: white !important;
                    padding: 15px 20px !important;
                    border-radius: 8px 8px 0 0 !important;
                }
                .acu-confirm-header h3 {
                    margin: 0 !important;
                    font-size: 16px !important;
                    font-weight: bold !important;
                }
                .acu-confirm-content {
                    padding: 20px !important;
                    flex-grow: 1 !important;
                }
                .acu-cleanup-list {
                    margin: 15px 0 !important;
                    padding-left: 20px !important;
                }
                .acu-cleanup-list li {
                    margin-bottom: 5px !important;
                    font-size: 13px !important;
                    color: var(--acu-text) !important;
                }
                .acu-confirm-question {
                    margin-top: 20px !important;
                    padding-top: 15px !important;
                    border-top: 1px solid var(--acu-border) !important;
                    text-align: center !important;
                }
                .acu-confirm-question p {
                    margin: 0 !important;
                    font-size: 14px !important;
                    font-weight: bold !important;
                    color: var(--acu-text) !important;
                }
                .acu-confirm-buttons {
                    padding: 15px 20px !important;
                    display: flex !important;
                    gap: 10px !important;
                    justify-content: flex-end !important;
                    border-top: 1px solid var(--acu-border) !important;
                    background: var(--acu-secondary) !important;
                }
                    /* 设置界面夜间模式适配 */
                .acu-settings-overlay.night-mode .acu-settings-dialog {
                    background: #2d2d2d !important;
                    color: #dbdbd6 !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-header {
                    background: var(--acu-primary) !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-tabs {
                    background: #3a3a3a !important;
                    border-bottom-color: #555 !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-tab {
                    background: rgba(132, 121, 184, 0.3) !important;
                    color: #dbdbd6 !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-footer {
                    background: #3a3a3a !important;
                    border-top-color: #555 !important;
                }
                .acu-settings-overlay.night-mode .acu-warning-box {
                    background: rgba(212, 161, 92, 0.15) !important;
                    border-color: var(--acu-warning) !important;
                }
                .acu-settings-overlay.night-mode .acu-storage-item {
                    background: rgba(255, 255, 255, 0.05) !important;
                }
                .acu-settings-overlay.night-mode .acu-btn-secondary {
                    background: #3a3a3a !important;
                    color: #dbdbd6 !important;
                    border-color: #555 !important;
                }

                /* 历史记录弹窗样式 */
                .acu-history-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                    z-index: 10015 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px !important;
                    box-sizing: border-box !important;
                }
                .acu-history-overlay.night-mode {
                    background: rgba(0, 0, 0, 0.7) !important;
                }
                .acu-history-dialog {
                    background: var(--acu-background) !important;
                    border: 2px solid var(--acu-highlight) !important;
                    border-radius: 10px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
                    width: 90% !important;
                    max-width: 700px !important;
                    max-height: 80vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    color: var(--acu-text) !important;
                }
                .acu-history-header {
                    background: var(--acu-primary) !important;
                    color: white !important;
                    padding: 15px 20px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    border-radius: 8px 8px 0 0 !important;
                    flex-shrink: 0 !important;
                }
                .acu-history-header h3 {
                    margin: 0 !important;
                    font-size: 16px !important;
                    font-weight: bold !important;
                }
                .acu-history-close {
                    background: transparent !important;
                    border: none !important;
                    color: white !important;
                    font-size: 20px !important;
                    cursor: pointer !important;
                    width: 30px !important;
                    height: 30px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 4px !important;
                    transition: background-color 0.2s !important;
                }
                .acu-history-close:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                }
                .acu-history-content {
                    flex-grow: 1 !important;
                    overflow-y: auto !important;
                    padding: 20px !important;
                }
                .acu-history-info {
                    display: flex !important;
                    justify-content: space-between !important;
                    margin-bottom: 15px !important;
                    font-size: 12px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.8 !important;
                }
                .acu-history-list {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                }
                .acu-history-item {
                    background: var(--acu-secondary) !important;
                    border: 1px solid var(--acu-border) !important;
                    border-radius: 8px !important;
                    padding: 12px !important;
                    cursor: pointer !important;
                    transition: all 0.3s ease !important;
                }
                .acu-history-item:hover {
                    background: rgba(var(--acu-highlight-rgb, 180, 138, 92), 0.15) !important;
                    border-color: var(--acu-highlight) !important;
                    transform: translateX(4px) !important;
                }
                .acu-history-item-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    padding-bottom: 8px !important;
                    border-bottom: 1px solid rgba(var(--acu-border-rgb, 212, 196, 168), 0.5) !important;
                }
                .acu-history-item-number {
                    font-size: 11px !important;
                    font-weight: bold !important;
                    color: var(--acu-primary) !important;
                    background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.1) !important;
                    padding: 2px 8px !important;
                    border-radius: 4px !important;
                }
                .acu-history-item-date {
                    font-size: 11px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.7 !important;
                }
                .acu-history-item-content {
                    font-size: 13px !important;
                    color: var(--acu-text) !important;
                    line-height: 1.6 !important;
                    word-wrap: break-word !important;
                    white-space: pre-wrap !important;
                    max-height: 200px !important;
                    overflow-y: auto !important;
                    padding: 8px !important;
                    background: rgba(255, 255, 255, 0.5) !important;
                    border-radius: 4px !important;
                }
                .acu-history-footer {
                    padding: 15px 20px !important;
                    border-top: 1px solid var(--acu-border) !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    flex-shrink: 0 !important;
                    background: var(--acu-secondary) !important;
                }
                .acu-history-hint {
                    font-size: 12px !important;
                    color: var(--acu-text) !important;
                    opacity: 0.7 !important;
                }

                /* 夜间模式适配增强 */
                .acu-history-overlay.night-mode .acu-history-dialog {
                    background: #2d2d2d !important;
                    color: #dbdbd6 !important;
                }
                .acu-history-overlay.night-mode .acu-history-footer {
                    background: #3a3a3a !important;
                    border-top-color: #555 !important;
                }
                .acu-history-overlay.night-mode .acu-history-item {
                    background: #3a3a3a !important;
                    border-color: #555 !important;
                }
                .acu-history-overlay.night-mode .acu-history-item:hover {
                    background: #4a4a4a !important;
                }
                .acu-history-overlay.night-mode .acu-history-info {
                    color: #dbdbd6 !important;
                }
                .acu-history-overlay.night-mode .acu-history-item-date {
                    color: #dbdbd6 !important;
                }
                .acu-history-overlay.night-mode .acu-history-item-content {
                    color: #dbdbd6 !important;
                    background: rgba(0, 0, 0, 0.2) !important;
                }
                .acu-history-overlay.night-mode .acu-history-hint {
                    color: #dbdbd6 !important;
                }

                /* 设置面板 - 夜间模式完整适配 */
                .acu-settings-overlay.night-mode .acu-settings-dialog {
                    background: #2d2d2d !important;
                    color: #dbdbd6 !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-header {
                    background: var(--acu-primary) !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-tabs {
                    background: #3a3a3a !important;
                    border-bottom-color: #555 !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-tab {
                    color: #dbdbd6 !important;
                    background: rgba(132, 121, 184, 0.3) !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-tab:hover {
                    background: rgba(132, 121, 184, 0.2) !important;
                }
                .acu-settings-overlay.night-mode .acu-settings-footer {
                    background: #3a3a3a !important;
                    border-top-color: #555 !important;
                }

                .acu-settings-overlay.night-mode .acu-cleanup-options,
                .acu-settings-overlay.night-mode .acu-storage-summary,
                .acu-settings-overlay.night-mode .acu-storage-details {
                    background: #3a3a3a !important;
                    border-color: #555 !important;
                }

                .acu-settings-overlay.night-mode .acu-warning-box {
                    background: rgba(212, 161, 92, 0.15) !important;
                    border-color: var(--acu-warning) !important;
                }
                .acu-settings-overlay.night-mode .acu-warning-content p,
                .acu-settings-overlay.night-mode .acu-warning-content strong {
                    color: #dbdbd6 !important;
                }

                .acu-settings-overlay.night-mode .acu-cleanup-options h4,
                .acu-settings-overlay.night-mode .acu-storage-summary h4,
                .acu-settings-overlay.night-mode .acu-storage-details h5,
                .acu-settings-overlay.night-mode .acu-protected-settings h5 {
                    color: #dbdbd6 !important;
                }

                .acu-settings-overlay.night-mode .acu-checkbox span,
                .acu-settings-overlay.night-mode .acu-checkbox small {
                    color: #dbdbd6 !important;
                }

                .acu-settings-overlay.night-mode .acu-storage-stats,
                .acu-settings-overlay.night-mode .acu-storage-item-name,
                .acu-settings-overlay.night-mode .acu-storage-item-size {
                    color: #dbdbd6 !important;
                }

                .acu-settings-overlay.night-mode .acu-storage-item {
                    background: rgba(255, 255, 255, 0.05) !important;
                }

                .acu-settings-overlay.night-mode .acu-btn-secondary {
                    background: #3a3a3a !important;
                    color: #dbdbd6 !important;
                    border-color: #555 !important;
                }

                /* 修复确认对话框的夜间模式 */
                .acu-confirm-overlay.night-mode .acu-confirm-dialog {
                    background: #2d2d2d !important;
                    color: #dbdbd6 !important;
                }
                .acu-confirm-overlay.night-mode .acu-cleanup-list li,
                .acu-confirm-overlay.night-mode .acu-confirm-question p {
                    color: #dbdbd6 !important;
                }
        `;

    $('head').append(styles);
  };

  const applyNightModeState = () => {
    const { $ } = getCore();
    const isNightMode = getNightModeState();
    const $container = $('.acu-table-container');

    if (isNightMode) {
      $container.addClass('night-mode');
    } else {
      $container.removeClass('night-mode');
    }
  };

  const applyThemeState = () => {
    const config = getConfig();
    applyThemeStyles(config.theme);
  };

  const toggleNightMode = () => {
    const { $ } = getCore();
    const $container = $('.acu-table-container');
    const isNightMode = $container.hasClass('night-mode');
    const newMode = !isNightMode;

    if (newMode) {
      $container.addClass('night-mode');
    } else {
      $container.removeClass('night-mode');
    }
    saveNightModeState(newMode);

    applyThemeState();
  };

  const showThemeMenu = event => {
    const { $ } = getCore();

    const $existingMenu = $('.acu-theme-menu');
    if ($existingMenu.length > 0) {
      $existingMenu.remove();
      return;
    }

    $('.acu-cell-menu, .acu-edit-overlay').not('.acu-theme-menu').remove();

    const isNightMode = $('.acu-table-container').hasClass('night-mode');
    const config = getConfig();

    let menuHtml = `
            <div class="acu-cell-menu acu-theme-menu ${isNightMode ? 'night-mode' : ''}" style="z-index: 10001; min-width: 140px; padding: 8px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">`;

    THEMES.forEach(theme => {
      const isActive = config.theme === theme.id;
      menuHtml += `
                <div class="acu-cell-menu-item theme-item ${isActive ? 'active' : ''}" data-action="theme" data-theme="${theme.id}" style="display:flex; align-items:center; padding: 10px 15px; cursor:pointer;">
                    <i class="${theme.icon}" style="margin-right: 12px; width: 16px; text-align: center; opacity: 0.7;"></i>
                    <span style="flex:1;">${theme.name}</span>
                    ${isActive ? '<i class="fas fa-check" style="font-size: 10px; opacity: 0.5;"></i>' : ''}
                </div>`;
    });

    menuHtml += `
                <div class="acu-cell-menu-item close" data-action="close" style="padding: 10px 15px; text-align:center; opacity:0.6; font-size: 12px; border-top: 1px solid rgba(128,128,128,0.1);">
                    <i class="fas fa-times" style="margin-right:8px;"></i>关闭菜单
                </div>
            </div>`;

    const $menu = $(menuHtml);
    $('body').append($menu);

    const clickX = event.clientX;
    const clickY = event.clientY;

    const menuWidth = $menu.outerWidth();
    const menuHeight = $menu.outerHeight();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let menuX = clickX + 10;
    let menuY = clickY + 10;

    if (menuX + menuWidth > viewportWidth) {
      menuX = clickX - menuWidth - 10;
    }

    if (menuY + menuHeight > viewportHeight) {
      menuY = clickY - menuHeight - 10;
    }

    menuX = Math.max(10, menuX);
    menuY = Math.max(10, menuY);

    $menu.css({
      left: `${menuX}px`,
      top: `${menuY}px`,
      position: 'fixed',
    });

    $menu.find('.acu-cell-menu-item').on('click', function () {
      const action = $(this).data('action');
      if (action === 'theme') {
        const theme = $(this).data('theme');
        changeTheme(theme);
      }
      $menu.remove();
      window.parent.document.removeEventListener('click', window.acuThemeMenuCloseHandler);
    });

    const closeThemeMenu = e => {
      if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
        $menu.remove();
        window.parent.document.removeEventListener('click', window.acuThemeMenuCloseHandler);
      }
    };

    window.acuThemeMenuCloseHandler = closeThemeMenu;

    setTimeout(() => {
      window.parent.document.addEventListener('click', closeThemeMenu);
    }, 100);

    event.stopPropagation();
    event.preventDefault();
  };

  // 刷新菜单三项：刷新表格 / 快捷选项 / 关闭菜单
  const performRefreshTable = () => {
    isRefreshing = true;
    resetScrollPositionToTop();
    lastTableDataHash = '';
    isFirstRender = true;
    clearAllTabUpdates();
    insertTableAfterLatestAIMessage();
    isRefreshing = false;
    showNotification('表格已刷新', 'info');
  };

  const tagDbPopupCardsForShortcut = $popup => {
    const { $ } = getCore();
    if (!$popup || !$popup.length) return;

    // 清理旧标记
    $popup
      .find('.acu-card')
      .removeClass('acu-sc-card-status acu-sc-card-core acu-sc-card-manual acu-sc-card-common acu-sc-card-config');

    // 通过稳定的子元素ID后缀定位（不依赖 UNIQUE_SCRIPT_ID）
    const $statusBody = $popup.find('[id$="-granular-status-table-body"]').first();
    const $manualUpdateBtn = $popup.find('[id$="-manual-update-card"]').first();
    const $manualSelector = $popup.find('[id$="-manual-table-selector"]').first();
    const $autoThreshold = $popup.find('[id$="-auto-update-threshold"]').first();
    const $tokenSkip = $popup.find('[id$="-auto-update-token-threshold"]').first();

    const $statusCard = $statusBody.closest('.acu-card');
    const $coreCard = $manualUpdateBtn.closest('.acu-card');
    const $manualCard = $manualSelector.closest('.acu-card');
    const $configCard = $autoThreshold.closest('.acu-card');
    const $commonCard = $tokenSkip.closest('.acu-card');

    if ($statusCard.length) $statusCard.addClass('acu-sc-card-status');
    if ($coreCard.length) $coreCard.addClass('acu-sc-card-core');
    if ($manualCard.length) $manualCard.addClass('acu-sc-card-manual');
    if ($commonCard.length) $commonCard.addClass('acu-sc-card-common');
    if ($configCard.length) $configCard.addClass('acu-sc-card-config');
  };

  // 说明：用户要求“快捷选项必须是独立弹窗”。
  // 因此这里的 applyDbPopupMode 不再用于切换原生面板分页/可见性，避免破坏数据库原生分页功能。
  // 我们仅在“独立快捷弹窗”中托管三页内容（detach/restore），不改动数据库原生面板的分页逻辑。
  const applyDbPopupMode = ($popup, mode) => {
    const { $ } = getCore();
    if (!$popup || !$popup.length) return;

    // 不再触碰任何“显示/隐藏/active/display”，只清理我们可能遗留的标记样式
    $popup.removeAttr('data-acu-shortcut');
    $popup.find('#acu-shortcut-style').remove();
    $popup.find('#acu-shortcut-dialog-style').remove();
    $popup
      .find('.acu-card')
      .removeClass('acu-sc-card-status acu-sc-card-core acu-sc-card-manual acu-sc-card-common acu-sc-card-config');
  };

  // 快捷选项：真正独立弹窗（不打开/不托管数据库面板），仅使用暴露API + 数据库存储
  const injectShortcutDialogStylesOnce = () => {
    const { $ } = getCore();
    // [修复] 更改 ID 以强制刷新样式
    if ($('#acu-shortcut-lite-style-v9-fix').length) return;
    const style = `
      <style id="acu-shortcut-lite-style-v9-fix">
        /* 遮罩层 */
        .acu-shortcut-lite-overlay{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.38);
          z-index: 10050;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .acu-shortcut-lite-overlay.night-mode{ background: rgba(0,0,0,0.55); }

        /* 弹窗主体 - 窄面板 */
        .acu-shortcut-lite-dialog{
          width: min(420px, 94vw);
          max-height: 80vh;
          background: var(--acu-background, #fafafa);
          color: var(--acu-text, #333);
          border: 1px solid var(--acu-border, #ddd);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-dialog{
          background: #2d2d2d;
          color: #dbdbd6;
          border-color: #444;
          box-shadow: 0 8px 40px rgba(0,0,0,0.45);
        }

        /* 头部 */
        .acu-shortcut-lite-header{
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--acu-primary, #5c9dff);
          color: #fff;
          border-radius: 6px 6px 0 0;
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-header{
          background: var(--acu-primary, #8479b8);
        }
        .acu-shortcut-lite-title{
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .3px;
        }
        .acu-shortcut-lite-close{
          border: none;
          background: rgba(255,255,255,0.18);
          color: #fff;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          line-height: 24px;
          text-align: center;
          transition: background .15s;
        }
        .acu-shortcut-lite-close:hover{ background: rgba(255,255,255,0.32); }

        /* 内容区 */
        .acu-shortcut-lite-body{
          padding: 16px 18px 20px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* 信息行 */
        .acu-shortcut-lite-info{
          font-size: 12px;
          text-align: center;
          color: var(--acu-text, #444);
          opacity: .88;
        }
        .acu-shortcut-lite-info strong{
          color: var(--acu-primary, #5c9dff);
          font-weight: 600;
        }

        /* 2x2 网格布局 */
        .acu-shortcut-lite-config-grid{
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .acu-shortcut-lite-field{
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: center;
        }
        .acu-shortcut-lite-field label{
          font-size: 11px;
          opacity: .75;
          color: inherit; /* 修复 Label 对比度 */
        }
        /* [关键修复] 输入框样式：使用 !important 强制覆盖 */
        .acu-shortcut-lite-field input{
          width: 100%;
          padding: 9px 12px;
          border-radius: 5px;
          border: 1.5px solid var(--acu-primary, #5c9dff);
          /* 日间模式：强制白底黑字 */
          background: #ffffff !important;
          color: #333333 !important;
          font-size: 13px;
          font-weight: 500;
          box-sizing: border-box;
          text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          transition: border-color .15s, box-shadow .15s;
        }
        .acu-shortcut-lite-field input:focus{
          outline: none;
          border-color: var(--acu-primary, #5c9dff);
          box-shadow: 0 0 0 3px rgba(92,157,255,0.18);
          background: #ffffff !important;
        }

        /* 夜间模式：强制深底浅字 */
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-field input{
          border-color: var(--acu-primary, #8479b8);
          background: #2b2b2b !important;
          color: #e0e0e0 !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-field input:focus{
          box-shadow: 0 0 0 3px rgba(132,121,184,0.25);
          background: #333333 !important;
        }

        /* 按钮组（纵向居中） */
        .acu-shortcut-lite-btns{
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .acu-shortcut-lite-btn{
          width: 100%;
          max-width: 220px;
          padding: 9px 16px;
          border-radius: 4px;
          border: 1px solid var(--acu-border, #bbb);
          background: var(--acu-background, #fff);
          color: var(--acu-text, #333);
          cursor: pointer;
          font-weight: 500;
          font-size: 12px;
          text-align: center;
          transition: background .12s, border-color .12s, transform .1s;
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-btn{
          border-color: #555;
          background: #3a3a3a;
          color: #dbdbd6;
        }
        .acu-shortcut-lite-btn:hover{
          background: var(--acu-secondary, #e8ecf0);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-btn:hover{
          background: #454545;
        }
        .acu-shortcut-lite-btn:active{
          transform: scale(0.97);
        }

        /* 可视化按钮：更大、渐变色、醒目 */
        .acu-shortcut-lite-btn.accent{
          max-width: 260px;
          padding: 12px 20px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255,126,95,0.35);
          margin-top: 6px;
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-btn.accent{
          background: linear-gradient(135deg, #e85d40 0%, #f09b5c 100%);
          box-shadow: 0 3px 12px rgba(232,93,64,0.4);
        }
        .acu-shortcut-lite-btn.accent:hover{
          filter: brightness(1.06);
          box-shadow: 0 4px 14px rgba(255,126,95,0.45);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-btn.accent:hover{
          box-shadow: 0 4px 16px rgba(232,93,64,0.5);
        }

        /* ===== 选择更新表区域 ===== */
        .acu-shortcut-lite-table-selector{
          margin-top: 8px;
          padding: 12px;
          border: 1px solid var(--acu-border, #ddd);
          border-radius: 6px;
          background: var(--acu-secondary, #f0f4f8);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-table-selector{
          background: #353535;
          border-color: #444;
        }
        .acu-shortcut-lite-table-selector-header{
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .acu-shortcut-lite-table-selector-title{
          font-size: 12px;
          font-weight: 600;
          color: var(--acu-text, #333);
        }
        .acu-shortcut-lite-table-selector-actions{
          display: flex;
          gap: 6px;
        }
        .acu-shortcut-lite-table-selector-actions button{
          padding: 4px 10px;
          font-size: 11px;
          border: 1px solid var(--acu-border, #bbb);
          border-radius: 4px;
          background: var(--acu-background, #fff);
          color: var(--acu-text, #333);
          cursor: pointer;
          transition: background .12s;
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-table-selector-actions button{
          background: #3a3a3a;
          border-color: #555;
          color: #dbdbd6;
        }
        .acu-shortcut-lite-table-selector-actions button:hover{
          background: var(--acu-secondary, #e8ecf0);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-table-selector-actions button:hover{
          background: #454545;
        }
        .acu-shortcut-lite-table-grid{
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 6px;
          max-height: 150px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .acu-shortcut-lite-table-grid::-webkit-scrollbar{
          width: 5px;
        }
        .acu-shortcut-lite-table-grid::-webkit-scrollbar-track{
          background: transparent;
        }
        .acu-shortcut-lite-table-grid::-webkit-scrollbar-thumb{
          background: rgba(128,128,128,0.3);
          border-radius: 3px;
        }
        .acu-shortcut-lite-table-item{
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border: 1px solid var(--acu-border, #ddd);
          border-radius: 4px;
          background: var(--acu-background, #fff);
          cursor: pointer;
          transition: background .12s, border-color .12s;
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-table-item{
          background: #3a3a3a;
          border-color: #555;
        }
        .acu-shortcut-lite-table-item:hover{
          background: var(--acu-secondary, #e8ecf0);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-table-item:hover{
          background: #454545;
        }
        .acu-shortcut-lite-table-item.selected{
          border-color: var(--acu-primary, #5c9dff);
          background: rgba(92, 157, 255, 0.1);
        }
        .acu-shortcut-lite-overlay.night-mode .acu-shortcut-lite-table-item.selected{
          background: rgba(92, 157, 255, 0.15);
        }
        .acu-shortcut-lite-table-item input[type="checkbox"]{
          width: 14px;
          height: 14px;
          accent-color: var(--acu-primary, #5c9dff);
          cursor: pointer;
          flex-shrink: 0;
        }
        .acu-shortcut-lite-table-item-name{
          font-size: 11px;
          color: var(--acu-text, #333);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .acu-shortcut-lite-no-tables{
          text-align: center;
          font-size: 11px;
          color: var(--acu-text, #666);
          opacity: 0.7;
          padding: 10px;
        }

        /* ===== 主题适配 ===== */
        /* [优化] 为所有主题显式定义输入框颜色，确保高对比度 */
        .acu-shortcut-lite-overlay.acu-theme-retro{
          --acu-primary: #8c6e54;
          --acu-secondary: #f5ebdc;
          --acu-background: #fdfaf5;
          --acu-text: #5a3e2b;
          --acu-border: #d4c4a8;
          --acu-input-bg: #ffffff;
          --acu-input-text: #5a3e2b;
        }
        .acu-shortcut-lite-overlay.acu-theme-dark{
          /* 注意：名为 dark 的主题其实是浅紫风格 */
          --acu-primary: #8479b8;
          --acu-secondary: #f0ebff;
          --acu-background: #f8f5ff;
          --acu-text: #5a4f7c;
          --acu-border: #d4cce8;
          --acu-input-bg: #ffffff;
          --acu-input-text: #5a4f7c;
        }
        .acu-shortcut-lite-overlay.acu-theme-modern{
          --acu-primary: #5c9dff;
          --acu-secondary: #f0f4f8;
          --acu-background: #ffffff;
          --acu-text: #444;
          --acu-border: #d0d0d0;
          --acu-input-bg: #ffffff;
          --acu-input-text: #333333;
        }
        .acu-shortcut-lite-overlay.acu-theme-forest{
          --acu-primary: #4a8c5c;
          --acu-secondary: #e8f0e8;
          --acu-background: #ffffff;
          --acu-text: #3a6b4a;
          --acu-border: #b8d0b8;
          --acu-input-bg: #ffffff;
          --acu-input-text: #2d5a3a;
        }
        .acu-shortcut-lite-overlay.acu-theme-ocean{
          --acu-primary: #4a7ca8;
          --acu-secondary: #e8f0f8;
          --acu-background: #ffffff;
          --acu-text: #3a6c98;
          --acu-border: #b8d0e0;
          --acu-input-bg: #ffffff;
          --acu-input-text: #2b5070;
        }

        /* 夜间模式覆盖（所有主题共用） */
        .acu-shortcut-lite-overlay.night-mode{
          --acu-secondary: #353535;
          --acu-background: #2d2d2d;
          --acu-text: #dbdbd6;
          --acu-border: #444;
          --acu-input-bg: #2b2b2b;
          --acu-input-text: #e0e0e0;
          --acu-input-bg-focus: #333333;
        }
        /* 夜间模式下保持各主题的 primary 色 */
        .acu-shortcut-lite-overlay.night-mode.acu-theme-retro{ --acu-primary: #a88468; }
        .acu-shortcut-lite-overlay.night-mode.acu-theme-dark{ --acu-primary: #9d94cc; }
        .acu-shortcut-lite-overlay.night-mode.acu-theme-modern{ --acu-primary: #6aa8ff; }
        .acu-shortcut-lite-overlay.night-mode.acu-theme-forest{ --acu-primary: #5a9c6c; }
        .acu-shortcut-lite-overlay.night-mode.acu-theme-ocean{ --acu-primary: #5a8cb8; }
      </style>
    `;
    $('head').append(style);
  };

  const findDatabaseSettingsKey = () => {
    try {
      // 优先找 v80，其次找 v70，再找任意 shujuku_*_allSettings_v2
      const direct80 = 'shujuku_v80_allSettings_v2';
      if (localStorage.getItem(direct80)) return direct80;
      const direct70 = 'shujuku_v70_allSettings_v2';
      if (localStorage.getItem(direct70)) return direct70;
      const keys = Object.keys(localStorage || {});
      const found = keys.find(k => /^shujuku_.*_allSettings_v2$/.test(k) && localStorage.getItem(k));
      return found || direct80;
    } catch (e) {
      return 'shujuku_v80_allSettings_v2';
    }
  };

  const readDbSettings = () => {
    const key = findDatabaseSettingsKey();
    try {
      const raw = localStorage.getItem(key);
      return { key, settings: raw ? JSON.parse(raw) : {} };
    } catch (e) {
      return { key, settings: {} };
    }
  };

  const writeDbSettings = (key, next) => {
    localStorage.setItem(key, JSON.stringify(next));
  };

  const getAiLayerCount = () => {
    try {
      let ST = window.SillyTavern || (window.parent ? window.parent.SillyTavern : null);
      if (!ST && window.top && window.top.SillyTavern) ST = window.top.SillyTavern;
      const chat = ST && ST.chat ? ST.chat : [];
      return chat.filter(m => m && !m.is_user).length;
    } catch (e) {
      return 0;
    }
  };

  const openShortcutDialog = async () => {
    const { $ } = getCore();
    const api = getCore().getDB();
    if (!api) {
      showNotification('未检测到数据库 (AutoCardUpdaterAPI)', 'error');
      return;
    }

    const $container = $('.acu-table-container');
    const isNightMode = $container.hasClass('night-mode');
    // 获取当前主题类名
    const themeClass =
      ['retro', 'dark', 'modern', 'forest', 'ocean'].map(t => `acu-theme-${t}`).find(c => $container.hasClass(c)) ||
      'acu-theme-modern';

    injectShortcutDialogStylesOnce();
    if ($('.acu-shortcut-lite-overlay').length) return;

    const aiLayers = getAiLayerCount();

    // 优先从API获取设置（确保读取到内存中的最新值）
    let autoUpdateThreshold = '';
    let autoUpdateFrequency = '';
    let updateBatchSize = '';
    let skipUpdateFloors = '';

    if (api && typeof api.getSettings === 'function') {
      const apiSettings = api.getSettings();
      autoUpdateThreshold = apiSettings?.autoUpdateThreshold ?? '';
      autoUpdateFrequency = apiSettings?.autoUpdateFrequency ?? '';
      updateBatchSize = apiSettings?.updateBatchSize ?? '';
      skipUpdateFloors = apiSettings?.skipUpdateFloors ?? '';
    } else {
      // 回退到直接读取localStorage（兼容旧版数据库）
      const { settings } = readDbSettings();
      autoUpdateThreshold = settings?.autoUpdateThreshold ?? '';
      autoUpdateFrequency = settings?.autoUpdateFrequency ?? '';
      updateBatchSize = settings?.updateBatchSize ?? '';
      skipUpdateFloors = settings?.skipUpdateFloors ?? '';
    }

    const html = `
      <div class="acu-shortcut-lite-overlay ${themeClass} ${isNightMode ? 'night-mode' : ''}">
        <div class="acu-shortcut-lite-dialog">
          <div class="acu-shortcut-lite-header">
            <div class="acu-shortcut-lite-title">快捷选项</div>
            <button class="acu-shortcut-lite-close" title="关闭">×</button>
          </div>
          <div class="acu-shortcut-lite-body">
            <div class="acu-shortcut-lite-info">当前上下文总层数（仅AI楼层）：<strong>${aiLayers}</strong></div>

            <div class="acu-shortcut-lite-config-grid">
              <div class="acu-shortcut-lite-field">
                <label>AI读取上下文层数</label>
                <input type="number" id="acu-sc-autoUpdateThreshold" min="0" step="1" value="${autoUpdateThreshold}">
              </div>
              <div class="acu-shortcut-lite-field">
                <label>每N层自动更新一次</label>
                <input type="number" id="acu-sc-autoUpdateFrequency" min="1" step="1" value="${autoUpdateFrequency}">
              </div>
              <div class="acu-shortcut-lite-field">
                <label>每批次更新楼层数</label>
                <input type="number" id="acu-sc-updateBatchSize" min="1" step="1" value="${updateBatchSize}">
              </div>
              <div class="acu-shortcut-lite-field">
                <label>保留X层楼不更新</label>
                <input type="number" id="acu-sc-skipUpdateFloors" min="0" step="1" value="${skipUpdateFloors}">
              </div>
            </div>

            <div class="acu-shortcut-lite-btns">
              <button class="acu-shortcut-lite-btn" id="acu-sc-save">保存配置</button>
              <button class="acu-shortcut-lite-btn" id="acu-sc-update">立即手动更新</button>
            </div>

            <div class="acu-shortcut-lite-btns">
              <button class="acu-shortcut-lite-btn accent" id="acu-sc-open-visualizer">打开可视化编辑器</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const $overlay = $(html);

    $('body').append($overlay);

    const close = () => $overlay.remove();

    $overlay.find('.acu-shortcut-lite-close').on('click', close);

    // 点击外部关闭（防误触：mousedown+mouseup都在overlay背景才关闭）

    let shortcutMouseDownOnBg = false;

    $overlay
      .on('mousedown', function (e) {
        shortcutMouseDownOnBg = $(e.target).hasClass('acu-shortcut-lite-overlay');
      })
      .on('mouseup', function (e) {
        if (shortcutMouseDownOnBg && $(e.target).hasClass('acu-shortcut-lite-overlay')) close();

        shortcutMouseDownOnBg = false;
      });

    const saveSettingsFromUi = () => {
      const autoUpdateThreshold = parseInt(String($('#acu-sc-autoUpdateThreshold').val() || '0'), 10);

      const autoUpdateFrequency = parseInt(String($('#acu-sc-autoUpdateFrequency').val() || '1'), 10);

      const updateBatchSize = parseInt(String($('#acu-sc-updateBatchSize').val() || '1'), 10);

      const skipUpdateFloors = parseInt(String($('#acu-sc-skipUpdateFloors').val() || '0'), 10);

      // 优先使用数据库API更新设置（确保内存和localStorage同步）

      if (api && typeof api.updateSettings === 'function') {
        const ok = api.updateSettings({
          autoUpdateThreshold,

          autoUpdateFrequency,

          updateBatchSize,

          skipUpdateFloors,
        });

        if (ok) {
          showNotification('配置已保存', 'success');

          return true;
        }
      }

      // 回退到直接写localStorage（兼容旧版数据库）

      const { key, settings } = readDbSettings();

      const next = { ...(settings || {}) };

      next.autoUpdateThreshold = autoUpdateThreshold;

      next.autoUpdateFrequency = autoUpdateFrequency;

      next.updateBatchSize = updateBatchSize;

      next.skipUpdateFloors = skipUpdateFloors;

      writeDbSettings(key, next);

      showNotification('配置已保存（回退模式）', 'success');

      return true;
    };

    $('#acu-sc-save').on('click', () => saveSettingsFromUi());

    $('#acu-sc-update').on('click', async () => {
      try {
        // [修复] 使用 api.manualUpdate() 替代 api.triggerUpdate()

        // triggerUpdate 是外部触发的自动更新逻辑(单次)，而 manualUpdate 才是数据库内部的"立即手动更新"逻辑(支持分批/Loading提示)

        if (typeof api.manualUpdate === 'function') {
          await api.manualUpdate();

          // manualUpdate 内部已有 Toast 提示，这里不再重复弹窗，或者仅做简单反馈

          // showNotification('手动更新指令已发送', 'info');
        } else {
          // Fallback

          showNotification('正在触发手动更新...', 'info');

          const ok = await api.triggerUpdate();

          showNotification(
            ok !== false ? '手动更新已完成' : '手动更新失败或被终止',
            ok !== false ? 'success' : 'error',
          );
        }
      } catch (e) {
        showNotification('手动更新出错: ' + (e?.message || e), 'error');
      }
    });

    $('#acu-sc-open-visualizer').on('click', () => {
      try {
        api.openVisualizer();

        close(); // 打开可视化编辑器后自动关闭弹窗
      } catch (e) {
        showNotification('打开可视化编辑器失败', 'error');
      }
    });
  };

  const showRefreshMenu = event => {
    const { $ } = getCore();

    const $existing = $('.acu-refresh-menu');
    if ($existing.length) {
      $existing.remove();
      if (window.acuRefreshMenuCloseHandler) {
        document.removeEventListener('click', window.acuRefreshMenuCloseHandler);
        if (window.parent?.document && window.parent.document !== document) {
          window.parent.document.removeEventListener('click', window.acuRefreshMenuCloseHandler);
        }
      }
      return;
    }

    // 只关闭刷新菜单（不动单元格菜单），避免误伤
    $('.acu-refresh-menu').remove();

    const isNightMode = $('.acu-table-container').hasClass('night-mode');
    const menuHtml = `
      <div class="acu-cell-menu acu-refresh-menu ${isNightMode ? 'night-mode' : ''}" style="z-index: 10001;">
        <div class="acu-cell-menu-item" data-action="refresh">刷新表格</div>
        <div class="acu-cell-menu-item" data-action="shortcut">快捷选项</div>
        <div class="acu-cell-menu-item close" data-action="close">关闭菜单</div>
      </div>
    `;

    const $menu = $(menuHtml);
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
    $menu.css({ left: `${menuX}px`, top: `${menuY}px`, position: 'fixed' });

    $menu.find('.acu-cell-menu-item').on('click', async function () {
      const action = $(this).data('action');
      $menu.remove();
      if (window.acuRefreshMenuCloseHandler) {
        document.removeEventListener('click', window.acuRefreshMenuCloseHandler);
        if (window.parent?.document && window.parent.document !== document) {
          window.parent.document.removeEventListener('click', window.acuRefreshMenuCloseHandler);
        }
      }

      if (action === 'refresh') performRefreshTable();
      if (action === 'shortcut') await openShortcutDialog();
    });

    const closeMenu = e => {
      if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
        $menu.remove();
        if (window.acuRefreshMenuCloseHandler) {
          document.removeEventListener('click', window.acuRefreshMenuCloseHandler);
          if (window.parent?.document && window.parent.document !== document) {
            window.parent.document.removeEventListener('click', window.acuRefreshMenuCloseHandler);
          }
        }
      }
    };
    window.acuRefreshMenuCloseHandler = closeMenu;
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
      if (window.parent?.document && window.parent.document !== document) {
        window.parent.document.addEventListener('click', closeMenu);
      }
    }, 100);

    event.stopPropagation();
    event.preventDefault();
  };

  const changeTheme = themeId => {
    const { $ } = getCore();
    saveConfig({ theme: themeId });

    $('.acu-theme-btn').html('<i class="fas fa-palette"></i>');

    const $container = $('.acu-table-container');
    const isNightMode = $container.hasClass('night-mode');

    applyThemeStyles(themeId);

    if (isNightMode) {
      $container.removeClass('acu-theme-dark');
      $container.addClass(`acu-theme-${themeId}`);
    }

    showNotification(`已切换到${THEMES.find(t => t.id === themeId)?.name || themeId}主题`, 'success');
  };

  // 通知队列管理
  let notificationQueue = [];
  const NOTIFICATION_SPACING = 10; // 每个通知之间的间距

  // 统一的通知函数
  const showNotification = (message, type = 'success') => {
    const { $ } = getCore();

    // 创建通知元素
    const notification = $(`
      <div class="acu-notification ${type}">
        ${message}
      </div>
    `);

    $('body').append(notification);

    // 添加到队列
    notificationQueue.push(notification);

    // 更新所有通知的位置
    updateNotificationPositions();

    // 3秒后移除
    setTimeout(() => {
      removeNotification(notification);
    }, 3000);
  };

  // 更新通知位置
  const updateNotificationPositions = () => {
    let currentTop = 20; // 初始顶部位置
    notificationQueue.forEach((notification, index) => {
      notification.css('top', `${currentTop}px`);
      // 计算下一个通知的位置：当前通知的高度 + 间距
      const notificationHeight = notification.outerHeight() || 0;
      currentTop += notificationHeight + NOTIFICATION_SPACING;
    });
  };

  // 移除通知
  const removeNotification = notification => {
    const { $ } = getCore();

    notification.fadeOut(500, function () {
      $(this).remove();

      // 从队列中移除
      const index = notificationQueue.indexOf(notification);
      if (index > -1) {
        notificationQueue.splice(index, 1);
      }

      // 更新剩余通知的位置
      updateNotificationPositions();
    });
  };

  // 保留原有函数用于兼容
  const showLoadSuccessNotification = () => {
    console.log('[ACU] 正在触发加载成功通知...');
    showNotification('✅ 表格数据已成功加载', 'success');
  };

  const updateTabBadges = () => {
    const { $ } = getCore();

    $('.acu-tab-btn').each(function () {
      const $tab = $(this);
      const tableName = $tab.data('table-name');

      if (tableName && shouldShowBadge(tableName)) {
        if (!$tab.find('.acu-update-badge').length) {
          $tab.append('<span class="acu-update-badge"></span>');
        }
        $tab.addClass('has-updates');
      } else {
        $tab.find('.acu-update-badge').remove();
        $tab.removeClass('has-updates');
      }
    });
  };

  const clearTabBadgeOnClick = tableName => {
    markTabAsSeen(tableName);
    updateTabBadges();
  };

  // 关键功能函数

  const updateSaveBtnState = () => {
    const { $ } = getCore();
    if (!$) return;
    const $btn = $('#acu-save-db-btn-main');
    if (pendingDeletes.size > 0) {
      $btn.addClass('has-pending-deletes');
    } else {
      $btn.removeClass('has-pending-deletes');
    }
  };

  const isCellUserEdited = (tableName, rowIndex, colIndex) => {
    return currentUserEditMap.has(`${tableName}-${rowIndex}-${colIndex}`);
  };

  const isCellDBUpdated = (tableName, rowIndex, colIndex) => {
    // 强制开启高亮，不再依赖外部配置
    // 检查单元格变更或整行变更
    const cellKey = `${tableName}-${rowIndex}-${colIndex}`;
    const rowKey = `${tableName}-row-${rowIndex}`;

    return currentDiffMap.has(cellKey) || currentDiffMap.has(rowKey);
  };

  // 获取表格数据函数
  const getTableData = () => {
    const { getDB } = getCore();
    const api = getDB();
    if (!api) return null;

    try {
      const rawData = api.exportTableAsJson ? api.exportTableAsJson() : null;

      if (!rawData) return null;

      try {
        const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

        // 兼容新版和旧版格式
        if (parsed.mate && parsed.mate.type === 'chatSheets') {
          return parsed;
        } else if (parsed.TavernDB_ACU_IndependentData) {
          const converted = {
            ...parsed.TavernDB_ACU_IndependentData,
            mate: { type: 'chatSheets', version: 1 },
          };
          return converted;
        } else if (Object.keys(parsed).some(key => key.startsWith('sheet_'))) {
          return {
            ...parsed,
            mate: { type: 'chatSheets', version: 1 },
          };
        }

        return parsed;
      } catch (e) {
        console.error('解析表格数据失败:', e);
        return null;
      }
    } catch (e) {
      console.error('获取表格数据失败:', e);
      return null;
    }
  };

  // 【核心修复】保存函数 - 直接删除原始数据

  // [V8.97] 获取数据隔离代码（仅用于UI显示，不包含chatId）
  const getDataIsolationCode = () => {
    const SETTINGS_KEYS = [
      'shujuku_v80_allSettings_v2',
      'shujuku_v70_allSettings_v2',
      'shujuku_v60_allSettings_v2',
      'shujuku_v50_allSettings_v2',
      'shujuku_v36_allSettings_v2',
      'shujuku_v34_allSettings_v2',
    ];
    let dataIsolationCode = '';

    try {
      let storage = window.localStorage;
      if (
        !storage.getItem(SETTINGS_KEYS[0]) &&
        !storage.getItem(SETTINGS_KEYS[1]) &&
        !storage.getItem(SETTINGS_KEYS[2]) &&
        window.parent
      ) {
        try {
          storage = window.parent.localStorage;
        } catch (e) {}
      }

      // 首先尝试从V10版本的Tavern设置系统中获取当前标识
      try {
        const bridge = window.parent?.['__ACU_USERSCRIPT_BRIDGE__'] || window['__ACU_USERSCRIPT_BRIDGE__'];
        const tavernSettings = bridge?.extension_settings;
        if (
          tavernSettings &&
          tavernSettings.__userscripts &&
          tavernSettings.__userscripts['shujuku_v100__userscript_settings_v1']
        ) {
          const userscriptSettings = tavernSettings.__userscripts['shujuku_v100__userscript_settings_v1'];
          const v10GlobalMetaStr = userscriptSettings['shujuku_v100_globalMeta_v1'];
          if (v10GlobalMetaStr) {
            const v10GlobalMeta = JSON.parse(v10GlobalMetaStr);
            if (v10GlobalMeta && v10GlobalMeta.activeIsolationCode) {
              dataIsolationCode = v10GlobalMeta.activeIsolationCode;
              return dataIsolationCode; // 如果找到V10版本的标识，直接返回
            }
          }
        }
      } catch (e) {
        // 如果Tavern设置系统访问失败，继续尝试其他方式
      }

      // 如果没有找到V10版本的标识，则尝试从旧版本设置中获取
      for (const key of SETTINGS_KEYS) {
        const settingsStr = storage.getItem(key);
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings.dataIsolationEnabled && settings.dataIsolationCode) {
            dataIsolationCode = settings.dataIsolationCode;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[ACU] 读取数据隔离Code失败:', e);
    }
    return dataIsolationCode;
  };

  const getIsolationKey = () => {
    // 支持多个版本的数据库设置存储键 (v80最新, v70, v60, v50, v36, v34最旧)
    const SETTINGS_KEYS = [
      'shujuku_v80_allSettings_v2',
      'shujuku_v70_allSettings_v2',
      'shujuku_v60_allSettings_v2',
      'shujuku_v50_allSettings_v2',
      'shujuku_v36_allSettings_v2',
      'shujuku_v34_allSettings_v2',
    ];
    let dataIsolationCode = '';
    let chatId = '';

    try {
      let storage = window.localStorage;
      // 尝试获取父级存储
      if (
        !storage.getItem(SETTINGS_KEYS[0]) &&
        !storage.getItem(SETTINGS_KEYS[1]) &&
        !storage.getItem(SETTINGS_KEYS[2]) &&
        window.parent
      ) {
        try {
          storage = window.parent.localStorage;
        } catch (e) {}
      }

      // 按优先级顺序查找设置
      for (const key of SETTINGS_KEYS) {
        const settingsStr = storage.getItem(key);
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings.dataIsolationEnabled && settings.dataIsolationCode) {
            dataIsolationCode = settings.dataIsolationCode;
            // console.log(`[ACU] 从 ${key} 读取数据隔离Code: ${dataIsolationCode}`);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[ACU] 读取数据隔离Code失败:', e);
    }

    // [V8.97-FIX] 获取当前聊天ID，实现按聊天隔离
    try {
      // 尝试从 SillyTavern 全局对象获取 chatId
      let ST = window.SillyTavern || (window.parent ? window.parent.SillyTavern : null);
      if (!ST && window.top && window.top.SillyTavern) ST = window.top.SillyTavern;

      if (ST) {
        // 优先使用 getCurrentChatId() 方法
        if (typeof ST.getCurrentChatId === 'function') {
          chatId = ST.getCurrentChatId() || '';
        } else if (ST.chatId) {
          // 回退到 chatId 属性
          chatId = ST.chatId || '';
        }

        if (chatId) {
          // console.log(`[ACU] 获取到聊天ID: ${chatId}`);
        }
      }
    } catch (e) {
      console.warn('[ACU] 获取聊天ID失败:', e);
    }

    // 组合隔离键: dataIsolationCode + chatId
    // 格式: "dataCode_chat_chatId" 或仅 "chat_chatId" 或仅 "dataCode" 或空
    let isolationKey = '';
    if (dataIsolationCode && chatId) {
      isolationKey = `${dataIsolationCode}_chat_${chatId}`;
    } else if (dataIsolationCode) {
      isolationKey = dataIsolationCode;
    } else if (chatId) {
      isolationKey = `chat_${chatId}`;
    }

    // console.log(`[ACU] 最终隔离Key: ${isoKey || '无标签'}`);
    return isolationKey;
  };

  // 【核心修复 V9.6】保存函数 - 优先使用精准 API，失败后降级到全量保存
  // 关键修复点:
  // 1. 修复 deletions 变量未定义的BUG (原 5030 行)
  // 2. 三种操作 (cell_edit/delete/row_update) 改为并行处理而非互斥
  // 3. 任一精准API失败立即降级到全量保存 importTableAsJson
  // 4. 保存成功后调用 refreshDataAndWorldbook 刷新世界书
  const saveDataToDatabase = async (tableData, updateContext = null) => {
    if (isSaving) return false;

    // 使用控制器包裹保存过程
    return await UpdateController.runSilently(async () => {
      isSaving = true;
      const { getDB } = getCore();
      const api = getDB();
      let saveSuccessful = false;
      let usedMethod = 'none';
      let needsBulkFallback = false; // 标记是否需要降级到全量保存

      try {
        // ============================================================
        // 方案 1: 优先尝试精准 API (维护数据库计数器，开销最小)
        // ============================================================
        if (api) {
          // 收集三类操作
          const hasCellEdit = updateContext && updateContext.type === 'cell_edit';
          const deletions = getPendingDeletions(); // 获取待删除映射
          const hasDeletes = Object.keys(deletions).length > 0;

          // 收集 row_update (排除已经有 cell_edit 上下文的单元格)
          const rowUpdates = {}; // tableName -> Set<rowIndex>
          if (currentUserEditMap.size > 0) {
            currentUserEditMap.forEach(key => {
              const match = key.match(/(.+)-(\d+)-(\d+)/);
              if (match) {
                const [_, tableName, rowIdxStr] = match;
                const rowIdx = parseInt(rowIdxStr);

                // 如果当前 cell_edit 已经处理了这个单元格，跳过
                if (hasCellEdit && updateContext.tableName === tableName && updateContext.rowIndex === rowIdx) {
                  return;
                }

                if (!rowUpdates[tableName]) rowUpdates[tableName] = new Set();
                rowUpdates[tableName].add(rowIdx);
              }
            });
          }
          const hasRowUpdates = Object.keys(rowUpdates).length > 0;

          // ---------- A. 单单元格精准更新 ----------
          if (hasCellEdit) {
            try {
              const { tableName, rowIndex, colIndex, newValue } = updateContext;
              console.log(`[ACU-API] updateCell: ${tableName}[行${rowIndex + 1}, 列${colIndex}]`);
              // API 的 rowIndex 从 1 开始 (数据第一行)
              const success = await api.updateCell(tableName, rowIndex + 1, colIndex, newValue);
              if (success) {
                saveSuccessful = true;
                usedMethod = 'api_updateCell';
                console.log('[ACU-API] ✓ updateCell 成功');
              } else {
                console.warn('[ACU-API] ✗ updateCell 返回 false，触发全量后备');
                needsBulkFallback = true;
              }
            } catch (e) {
              console.warn('[ACU-API] updateCell 异常:', e);
              needsBulkFallback = true;
            }
          }

          // ---------- B. 行删除 (倒序删除以保持索引稳定) ----------
          if (hasDeletes && !needsBulkFallback) {
            try {
              let allDeletesSuccess = true;
              for (const tableName of Object.keys(deletions)) {
                // 必须从后往前删
                const sortedIndices = deletions[tableName].map(i => parseInt(i)).sort((a, b) => b - a);

                for (const rowIndex of sortedIndices) {
                  console.log(`[ACU-API] deleteRow: ${tableName}[行${rowIndex + 1}]`);
                  const success = await api.deleteRow(tableName, rowIndex + 1);
                  if (!success) {
                    console.warn(`[ACU-API] ✗ deleteRow 失败: ${tableName}[行${rowIndex + 1}]`);
                    allDeletesSuccess = false;
                    break;
                  }
                }
                if (!allDeletesSuccess) break;
              }

              if (allDeletesSuccess) {
                saveSuccessful = true;
                usedMethod = usedMethod === 'none' ? 'api_deleteRow' : usedMethod + '+deleteRow';
                console.log('[ACU-API] ✓ deleteRow 全部成功');
              } else {
                console.warn('[ACU-API] deleteRow 部分失败，触发全量后备');
                needsBulkFallback = true;
                saveSuccessful = false;
              }
            } catch (e) {
              console.warn('[ACU-API] deleteRow 异常:', e);
              needsBulkFallback = true;
              saveSuccessful = false;
            }
          }

          // ---------- C. 整行更新 (基于 currentUserEditMap) ----------
          if (hasRowUpdates && !needsBulkFallback) {
            try {
              let allUpdatesSuccess = true;
              for (const tableName of Object.keys(rowUpdates)) {
                const sheet = Object.values(tableData).find(s => s?.name === tableName);
                if (!sheet || !sheet.content) continue;

                const headers = sheet.content[0] || [];
                for (const rowIndex of rowUpdates[tableName]) {
                  const rowData = sheet.content[rowIndex + 1];
                  if (!rowData) continue;

                  // 构造列名->值映射
                  const updateObj = {};
                  headers.forEach((header, colIdx) => {
                    if (header) updateObj[header] = rowData[colIdx];
                  });

                  console.log(`[ACU-API] updateRow: ${tableName}[行${rowIndex + 1}]`);
                  const success = await api.updateRow(tableName, rowIndex + 1, updateObj);
                  if (!success) {
                    console.warn(`[ACU-API] ✗ updateRow 失败: ${tableName}[行${rowIndex + 1}]`);
                    allUpdatesSuccess = false;
                    break;
                  }
                }
                if (!allUpdatesSuccess) break;
              }

              if (allUpdatesSuccess) {
                saveSuccessful = true;
                usedMethod = usedMethod === 'none' ? 'api_updateRow' : usedMethod + '+updateRow';
                console.log('[ACU-API] ✓ updateRow 全部成功');
              } else {
                console.warn('[ACU-API] updateRow 部分失败，触发全量后备');
                needsBulkFallback = true;
                saveSuccessful = false;
              }
            } catch (e) {
              console.warn('[ACU-API] updateRow 异常:', e);
              needsBulkFallback = true;
              saveSuccessful = false;
            }
          }

          // 如果 cell_edit/delete/row_update 都没有，但是用户点击了"保存"按钮（手动保存），
          // 说明可能有快照差异需要保存，直接走全量保存
          if (!hasCellEdit && !hasDeletes && !hasRowUpdates && !saveSuccessful) {
            console.log('[ACU-API] 没有精准操作可执行，直接使用全量保存');
            needsBulkFallback = true;
          }
        } else {
          // API 不可用，直接降级
          console.warn('[ACU-SAVE] AutoCardUpdaterAPI 不可用');
          needsBulkFallback = true;
        }

        // ============================================================
        // 方案 2: 全量保存后备 (importTableAsJson)
        // ============================================================
        if ((!saveSuccessful || needsBulkFallback) && api && typeof api.importTableAsJson === 'function') {
          try {
            console.log('[ACU-API] 执行全量保存 importTableAsJson...');

            // 全量保存前，必须先在 tableData 中应用待删除的行
            const deletions = getPendingDeletions();
            if (Object.keys(deletions).length > 0) {
              Object.keys(deletions).forEach(tableName => {
                for (const sheetId in tableData) {
                  if (sheetId === 'mate') continue;
                  const sheet = tableData[sheetId];
                  if (sheet?.name === tableName && sheet.content) {
                    const indexesToDelete = deletions[tableName].map(i => parseInt(i)).sort((a, b) => b - a);
                    indexesToDelete.forEach(rowIndex => {
                      const actualRowIndex = rowIndex + 1;
                      if (sheet.content[actualRowIndex]) {
                        sheet.content.splice(actualRowIndex, 1);
                      }
                    });
                    break;
                  }
                }
              });
            }

            const apiSuccess = await api.importTableAsJson(JSON.stringify(tableData));
            if (apiSuccess) {
              saveSuccessful = true;
              usedMethod = 'api_bulk_importTableAsJson';
              console.log('[ACU-API] ✓ 全量保存成功');
            } else {
              console.warn('[ACU-API] ✗ importTableAsJson 返回 false');
            }
          } catch (bulkErr) {
            console.warn('[ACU-API] 全量保存异常:', bulkErr);
          }
        }

        // ============================================================
        // 保存后处理：刷新世界书 + UI更新 + 清理状态
        // ============================================================
        if (saveSuccessful) {
          console.log(`[ACU-SAVE] ✓ 保存完成，方法: ${usedMethod}`);

          // 调用 refreshDataAndWorldbook 强制刷新世界书 (如果可用)
          if (api && typeof api.refreshDataAndWorldbook === 'function') {
            try {
              await api.refreshDataAndWorldbook();
              console.log('[ACU-SAVE] ✓ 世界书已刷新');
            } catch (refreshErr) {
              console.warn('[ACU-SAVE] 世界书刷新失败 (非致命):', refreshErr);
            }
          }

          pendingDeletes.clear();
          savePendingDeletions({});
          currentUserEditMap.clear();

          if (typeof generateDataHash === 'function') {
            lastTableDataHash = generateDataHash(tableData);
          }

          showNotification(`保存成功！(${usedMethod})`, 'success');

          setTimeout(() => {
            const { $ } = getCore();
            if (typeof $ !== 'undefined') {
              $('.pending-deletion').removeClass('pending-deletion');
            }

            if (typeof currentDiffMap !== 'undefined' && typeof generateDiffMap === 'function') {
              currentDiffMap = generateDiffMap(tableData);
            }
            if (typeof updateTableContentOnly === 'function') {
              updateTableContentOnly();
            } else if (typeof insertTableAfterLatestAIMessage === 'function') {
              insertTableAfterLatestAIMessage();
            }
            updateSaveBtnState();
          }, 50);
          return true;
        } else {
          console.error('[ACU-SAVE] ✗ 所有保存方案均失败');
          alert('保存失败：精准API和全量保存均失败。\n请检查控制台日志 (F12) 获取详细信息。');
          return false;
        }
      } catch (e) {
        console.error('[ACU-SAVE] 保存全过程捕获异常:', e);
        alert('保存出错：' + e.message);
        return false;
      } finally {
        isSaving = false;
      }
    });
  };

  const ensureProperFormat = data => {
    if (!data) return data;

    if (data.mate && data.mate.type === 'chatSheets') {
      return data;
    }

    const result = { ...data };
    const hasSheets = Object.keys(result).some(key => key.startsWith('sheet_'));

    if (hasSheets && !result.mate) {
      result.mate = { type: 'chatSheets', version: 1 };
    }

    return result;
  };

  const getSavedTableOrder = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABLE_ORDER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  };

  const saveTableOrder = tableNames => {
    try {
      localStorage.setItem(STORAGE_KEY_TABLE_ORDER, JSON.stringify(tableNames));
    } catch (e) {
      console.error('保存表格顺序失败:', e);
    }
  };

  // 处理JSON数据函数
  const processJsonData = json => {
    const tables = {};
    if (!json || typeof json !== 'object') return null;

    const isNewFormat = json.mate && json.mate.type === 'chatSheets';

    if (isNewFormat) {
      for (const sheetId in json) {
        if (sheetId === 'mate') continue;

        const sheet = json[sheetId];
        if (sheet?.name) {
          tables[sheet.name] = {
            key: sheetId,
            headers: sheet.content[0] || [],
            rows: sheet.content.slice(1),
            rawContent: sheet.content,
          };
        }
      }
    } else {
      for (const sheetId in json) {
        if (json[sheetId]?.name) {
          const sheet = json[sheetId];
          tables[sheet.name] = {
            key: sheetId,
            headers: sheet.content[0] || [],
            rows: sheet.content.slice(1),
            rawContent: sheet.content,
          };
        }
      }
    }

    return Object.keys(tables).length > 0 ? tables : null;
  };

  const getSafeTableId = tableName => {
    return tableName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase();
  };

  const saveCurrentScrollPosition = () => {
    const { $ } = getCore();
    const $contentArea = $('.acu-scroll-container');
    if ($contentArea.length) {
      const scrollTop = $contentArea.scrollTop();
      saveInnerScrollPositionState(scrollTop);
      currentTableScrollTop = scrollTop;
    }
  };

  const resetScrollPositionToTop = () => {
    const { $ } = getCore();
    const $contentArea = $('.acu-scroll-container');
    if ($contentArea.length) {
      $contentArea.scrollTop(0);
      currentTableScrollTop = 0;
      saveInnerScrollPositionState(0);
    }
  };

  const applySavedScrollPositionImmediately = () => {
    const { $ } = getCore();
    const $contentArea = $('.acu-scroll-container');
    if ($contentArea.length) {
      $contentArea.scrollTop(currentTableScrollTop);
    }
  };

  const getLatestAIMessageId = () => {
    const { $ } = getCore();
    const $latestAIMessage = $('.mes:not(.sys):not(.user)').last();

    if ($latestAIMessage.length) {
      const mid =
        $latestAIMessage.attr('data-mid') ||
        $latestAIMessage.attr('id') ||
        $latestAIMessage.find('.mes_text').text().substring(0, 50) + Date.now();
      return mid;
    }

    return '';
  };

  const checkAndUpdateTablePosition = () => {
    const { $ } = getCore();

    if (tablePositionUpdateQueued) return;

    const currentAIMessageId = getLatestAIMessageId();

    if (currentAIMessageId && currentAIMessageId !== lastAIMessageId) {
      lastAIMessageId = currentAIMessageId;

      tablePositionUpdateQueued = true;

      setTimeout(() => {
        insertTableAfterLatestAIMessage();
        tablePositionUpdateQueued = false;
      }, 500);
    }
  };

  // 【优化】只更新当前表格函数
  const updateCurrentTableOnly = tableName => {
    const { $ } = getCore();

    const rawData = getTableData();
    const tables = processJsonData(rawData);

    if (!tables || !tables[tableName]) return;

    const tableData = tables[tableName];
    const safeId = getSafeTableId(tableName);
    const $tableSection = $(`#acu-table-${safeId}`);

    if (!$tableSection.length) return;

    // 保存当前滚动位置
    const scrollPos = $('.acu-scroll-container').scrollTop();

    // 更新行数显示
    const rowCount = tableData.rows ? tableData.rows.length : 0;
    const $tabBtn = $(`.acu-tab-btn[data-table-name="${tableName}"]`);
    if ($tabBtn.length) {
      $tabBtn.find('span').last().text(`(${rowCount})`);
    }

    // 更新表格标题中的行数
    $tableSection.find('.section-title span').text(`(${rowCount}行数据)`);

    // 更新表格内容
    const currentPage = getCurrentPageForTable(tableName);
    const paginationHtml = generatePaginationHTML(tableName, rowCount, currentPage);
    const newTableHtml = renderDataTable(tableData, tableName);

    $tableSection.find('.acu-pagination-container').remove();
    $tableSection.find('.section-title').after(paginationHtml);
    $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);

    bindCellEventsForSection($tableSection);
    bindPaginationEvents($tableSection, tableName, tableData);

    // 恢复滚动位置
    setTimeout(() => {
      $('.acu-scroll-container').scrollTop(scrollPos);
    }, 10);
  };

  const smartUpdateTable = (forceFullUpdate = false) => {
    const { $ } = getCore();

    if (isCellEditing) {
      return;
    }

    const rawData = getTableData();

    if (!rawData || Object.keys(rawData).length === 0) {
      insertTableAfterLatestAIMessage();
      return;
    }

    const currentHash = generateDataHash(rawData);

    if (currentHash === lastTableDataHash && !forceFullUpdate && !isFirstRender) {
      return;
    }

    lastTableDataHash = currentHash;

    // 【修复】只有在有快照的情况下才生成diffMap
    const hasSnapshot = loadSnapshot() !== null;
    if (hasSnapshot || forceFullUpdate) {
      currentDiffMap = generateDiffMap(rawData);
    } else {
      console.log('[ACU] 无快照,保持现有diffMap');
    }

    if (!isCellEditing && !isRefreshing) {
      saveCurrentScrollPosition();
    }

    if ($('.acu-table-container').length > 0) {
      updateTableContentOnly();
    } else {
      insertTableAfterLatestAIMessage();
    }

    isFirstRender = false;
  };

  const updateTableContentOnly = () => {
    const { $ } = getCore();

    const rawData = getTableData();

    if (!rawData || Object.keys(rawData).length === 0) {
      console.warn('表格数据为空，跳过更新');
      return;
    }

    const tables = processJsonData(rawData);

    if (!tables) {
      insertTableAfterLatestAIMessage();
      return;
    }

    const orderedTableNames = getOrderedTableNames(tables);
    const activeTab = getActiveTabState();
    const validActiveTab = activeTab && orderedTableNames.includes(activeTab) ? activeTab : null;

    updateTabBadges();

    orderedTableNames.forEach(tableName => {
      const tableData = tables[tableName];
      const rowCount = tableData.rows ? tableData.rows.length : 0;
      const $tabBtn = $(`.acu-tab-btn[data-table-name="${tableName}"]`);
      if ($tabBtn.length) {
        $tabBtn.find('span').last().text(`(${rowCount})`);
      }
    });

    orderedTableNames.forEach(tableName => {
      const tableData = tables[tableName];
      const safeId = getSafeTableId(tableName);
      const $tableSection = $(`#acu-table-${safeId}`);

      if ($tableSection.length) {
        const rowCount = tableData.rows ? tableData.rows.length : 0;

        // --- 核心：分页需要基于搜索后的行数 ---
        let filteredCount = rowCount;
        if (currentSearchTerm) {
          const term = currentSearchTerm.toLowerCase();
          filteredCount = tableData.rows.filter(row =>
            row.some(
              (cell, idx) =>
                idx > 0 &&
                String(cell || '')
                  .toLowerCase()
                  .includes(term),
            ),
          ).length;
        }

        const currentPage = getCurrentPageForTable(tableName);
        const paginationHtml = generatePaginationHTML(tableName, filteredCount, currentPage);
        const newTableHtml = renderDataTable(tableData, tableName);

        $tableSection.find('.acu-pagination-container').remove();
        $tableSection.find('.section-title').after(paginationHtml);
        $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);

        bindCellEventsForSection($tableSection, tableName);
        bindPaginationEvents($tableSection, tableName, tableData);
      }
    });

    if (!isCellEditing && !isRefreshing) {
      setTimeout(applySavedScrollPositionImmediately, 10);
    }

    checkAndUpdateTablePosition();

    // 添加这行：检查总结表格是否需要跳转
    setTimeout(() => checkAndJumpToLastPageForSummary(), 100);
  };

  const bindCellEventsForSection = ($section, tableName) => {
    const { $ } = getCore();

    // 原有的单元格点击事件
    $section
      .find('.acu-editable-cell')
      .off('click.acu')
      .on('click.acu', function (e) {
        showCellMenu(e, this);
      });

    // --- 新增：搜索功能事件绑定 ---
    const $searchInput = $section.find('.acu-search-field-input');
    const $searchBox = $section.find('.acu-search-input-box');
    const $toggleBtn = $section.find('.acu-search-toggle-trigger');
    const $clearBtn = $section.find('.acu-search-clear-btn');
    const $execBtn = $section.find('.acu-search-execute-btn');

    // 切换展开/收起 (最高优先级操作 Style)
    $toggleBtn.off('click.acu').on('click.acu', function () {
      isSearchVisible = !isSearchVisible;

      // 关键修正：这里的按钮本身就是 i 标签，直接操作 $(this)
      const $icon = $(this);

      if (isSearchVisible) {
        $searchBox.css('display', 'flex');
        // 显式、暴力切换类名
        $icon.removeClass('fa-search').addClass('fa-times');
        $icon.attr('title', '取消并收起');
        $searchInput.focus();
      } else {
        $searchBox.css('display', 'none');
        // 显式、暴力切换回搜索图标
        $icon.removeClass('fa-times').addClass('fa-search');
        $icon.attr('title', '展开搜索');

        // --- 收起时清空内容并恢复显示 ---
        if (currentSearchTerm) {
          currentSearchTerm = '';
          $searchInput.val('');
          $clearBtn.hide();
          updateTableContentOnly();
        }
      }
    });

    // 执行搜索按钮
    $execBtn.off('click.acu').on('click.acu', function () {
      currentSearchTerm = $searchInput.val().trim();
      updateTableContentOnly();
    });

    // 回车搜索
    $searchInput.off('keydown.acu').on('keydown.acu', function (e) {
      if (e.key === 'Enter') {
        currentSearchTerm = $(this).val().trim();
        updateTableContentOnly();
      }
    });

    // 清空搜索
    $clearBtn.off('click.acu').on('click.acu', function () {
      $searchInput.val('');
      currentSearchTerm = '';
      $(this).hide();
      updateTableContentOnly();
    });

    // 输入框变化动态控制清空按钮
    $searchInput.on('input.acu', function () {
      if ($(this).val()) $clearBtn.show();
      else $clearBtn.hide();
    });
  };

  const generatePaginationHTML = (tableName, totalRows, currentPage) => {
    const pageSize = 20;
    const totalPages = Math.ceil(totalRows / pageSize);

    if (totalPages <= 1) return '';

    const maxDisplay = 9;
    let startPage, endPage;

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
  };

  const bindPaginationEvents = ($section, tableName, tableData) => {
    const { $ } = getCore();
    const $pagination = $section.find('.acu-pagination-container');

    $pagination
      .find('.acu-page-btn:not(.disabled)')
      .off('click')
      .on('click', function () {
        const page = parseInt($(this).data('page'));
        savePaginationState(tableName, page);

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

          bindCellEventsForSection($tableSection);
          bindPaginationEvents($section, tableName, tableData);
        }
      });
  };

  // 在 bindPaginationEvents 函数后面添加这个新函数
  const checkAndJumpToLastPageForSummary = () => {
    const { $ } = getCore();

    // 获取当前激活的表格名称
    const activeTab = getActiveTabState();

    // 检查是否是总结表或总结大纲表格
    if (activeTab === '总结表' || activeTab === '总结大纲') {
      const rawData = getTableData();
      const tables = processJsonData(rawData);

      if (tables && tables[activeTab]) {
        const tableData = tables[activeTab];
        const totalRows = tableData.rows ? tableData.rows.length : 0;
        const pageSize = 20;
        const totalPages = Math.ceil(totalRows / pageSize);
        const lastPage = Math.max(0, totalPages - 1);

        // 获取当前页码
        const currentPage = getCurrentPageForTable(activeTab);

        // 如果不在最后一页，自动跳转
        if (currentPage !== lastPage && totalPages > 1) {
          savePaginationState(activeTab, lastPage);

          // 重新渲染表格
          const safeId = getSafeTableId(activeTab);
          const $tableSection = $(`#acu-table-${safeId}`);

          if ($tableSection.length) {
            const paginationHtml = generatePaginationHTML(activeTab, totalRows, lastPage);
            const newTableHtml = renderDataTable(tableData, activeTab);

            $tableSection.find('.acu-pagination-container').remove();
            $tableSection.find('.section-title').after(paginationHtml);
            $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);

            bindCellEventsForSection($tableSection);
            bindPaginationEvents($tableSection, activeTab, tableData);
          }

          console.log(`[ACU] 自动跳转 "${activeTab}" 到最后一页 (${lastPage + 1}/${totalPages})`);
        }
      }
    }
  };

  const generateTableHTML = () => {
    const rawData = getTableData();
    const tables = processJsonData(rawData);
    const isExpanded = getTableExpandedState();
    const isNightMode = getNightModeState();
    const activeTab = getActiveTabState();
    const config = getConfig();

    if (rawData) {
      currentDiffMap = generateDiffMap(rawData);
    }

    let orderedTableNames = [];
    if (tables) {
      orderedTableNames = getOrderedTableNames(tables);
    }

    const validActiveTab = activeTab && orderedTableNames.includes(activeTab) ? activeTab : null;

    let html = `
        <div class="acu-table-container acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}">
            <details ${isExpanded ? 'open' : ''}>
                <summary>
                    <span><i class="fas fa-table" style="margin-right: 8px; opacity: 0.8;"></i>数据表格 ${tables ? '(' + orderedTableNames.length + '个表格)' : ''} <span style="font-size: 0.8em;">v9.55 [标识：${getDataIsolationCode() || '无'}]</span></span>
                    <div style="display: flex; align-items: center; gap: 12px; height: 24px; position: relative;">
                        <span class="acu-expand-hint" style="font-size: 11px; opacity: 0.6; pointer-events: none;">${isExpanded ? '点击收起' : '点击展开'}</span>
                        <!-- 极致月相盒：重回 summary 内部实现垂直居中与结构绑定 -->
                        <button class="acu-mode-toggle acu-moon-box" title="切换昼夜模式" type="button">
                            <div class="acu-moon-orb"></div>
                            <div class="acu-moon-cloud"></div>
                            <!-- 10路恒定尺寸边缘粒子流 -->                            <div class="acu-glow-particle acu-p1"></div>
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
                    <div class="acu-tabs-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="acu-order-edit-btn"><i class="fas fa-edit" style="margin-right: 5px;"></i>顺序</button>
                            <button class="acu-theme-btn" id="acu-theme-btn" title="切换主题"><i class="fas fa-palette"></i></button>
                        </div>

                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="acu-settings-btn-header" id="acu-settings-btn-main" title="系统设置"><i class="fas fa-cog"></i></button>
                            <button class="acu-refresh-btn-header" id="acu-refresh-btn-main" title="刷新数据"><i class="fas fa-sync-alt"></i></button>
                            <button class="acu-save-db-btn-header" id="acu-save-db-btn-main" ${!tables ? 'disabled' : ''}><i class="fas fa-save" style="margin-right: 5px;"></i>保存</button>
                        </div>
                    </div>

                    <div class="acu-order-controls" id="acu-order-controls" style="display:none;">
                        <button class="acu-save-order-btn"><i class="fas fa-check" style="margin-right:5px;"></i>保存顺序</button>
                        <button class="acu-cancel-order-btn"><i class="fas fa-times" style="margin-right:5px;"></i>取消</button>
                    </div>`;

    if (tables) {
      html += `
                    <div class="acu-tabs-container" id="acu-tabs-sortable">`;

      orderedTableNames.forEach(tableName => {
        const tableData = tables[tableName];
        const safeId = getSafeTableId(tableName);
        const rowCount = tableData.rows ? tableData.rows.length : 0;
        const isActive = validActiveTab === tableName ? 'active' : '';
        const shouldShowUpdateBadge = shouldShowBadge(tableName);
        const hasUpdateClass = shouldShowUpdateBadge ? 'has-updates' : '';

        html += `
                    <button class="acu-tab-btn ${isActive} ${hasUpdateClass}" data-table-id="${safeId}" data-table-name="${tableName}">
                        ${tableName}
                        <span style="font-size: 10px; margin-left: 5px; opacity: 0.7;">(${rowCount})</span>`;

        if (shouldShowUpdateBadge) {
          html += `<span class="acu-update-badge"></span>`;
        }

        html += `
                    </button>`;
      });

      html += `
                    </div>
                    <div class="table-content-area acu-scroll-container">`;

      orderedTableNames.forEach(tableName => {
        const tableData = tables[tableName];
        const safeId = getSafeTableId(tableName);
        const isActive = validActiveTab === tableName ? 'active' : '';
        const currentPage = getCurrentPageForTable(tableName);
        const paginationHtml = generatePaginationHTML(
          tableName,
          tableData.rows ? tableData.rows.length : 0,
          currentPage,
        );

        html += `
                    <section class="acu-table-section ${isActive}" id="acu-table-${safeId}">
                        <div class="section-title" style="display:flex !important; flex-direction:row !important; align-items:center !important; justify-content:space-between !important; width:100% !important; box-sizing:border-box !important; position:relative !important;">
                            <div class="acu-title-left-text" style="display:flex; align-items:center; flex-shrink:0;">
                                ${tableName}
                                <span style="font-size: 11px; margin-left: 8px; color: var(--acu-primary); opacity: 0.6;">
                                    (${tableData.rows ? tableData.rows.length : 0}行)
                                </span>
                            </div>

                            <!-- 极简工具栏：改用 span 避开 button 样式，强制横向 -->
                            <div class="acu-search-toolbar" style="display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important; align-items:center !important; gap:5px !important; margin-left:auto !important;">
                                <div class="acu-search-input-box" style="display:${isSearchVisible ? 'flex' : 'none'}; align-items:center; background:none !important; border:none !important; border-bottom:1px solid var(--acu-primary, #5c9dff) !important; padding:0 4px; height:20px;">
                                    <input type="text" class="acu-search-field-input" placeholder="搜索..." value="${currentSearchTerm}" style="background:transparent !important; border:none !important; outline:none !important; color:var(--acu-text) !important; font-size:11px !important; width:100px !important; padding:0 !important; margin:0 !important;">
                                    <i class="fas fa-times acu-search-clear-btn" style="font-size:10px; cursor:pointer; opacity:0.4; margin-left:8px; margin-right:12px; ${currentSearchTerm ? '' : 'display:none;'}"></i>
                                    <i class="fas fa-search acu-search-execute-btn" title="点击搜索" style="color:var(--acu-primary); font-size:12px; cursor:pointer; opacity:0.6;"></i>
                                </div>
                                <i class="fas ${isSearchVisible ? 'fa-times' : 'fa-search'} acu-search-toggle-trigger"
                                   title="${isSearchVisible ? '取消并收起' : '展开搜索'}"
                                   style="color:var(--acu-primary); font-size:14px; cursor:pointer; opacity:0.6; padding:4px;"></i>
                            </div>
                        </div>`;

        html += paginationHtml;
        html += renderDataTable(tableData, tableName);

        html += `
                    </section>`;
      });

      html += `
                    </div>`;
    } else {
      html += `
                    <div class="table-content-area acu-scroll-container">
                        <div class="empty-message">无数据，请先进行对话或检查数据库连接</div>
                    </div>`;
    }

    html += `
                </div>
            </details>
        </div>`;

    return html;
  };

  // 初始化行位置映射表
  const initializeRowMapping = tableName => {
    const rawData = getTableData();
    const tables = processJsonData(rawData);

    if (!tables || !tables[tableName]) return;

    const tableData = tables[tableName];
    const rowCount = tableData.rows.length;

    if (!rowPositionMapping[tableName]) {
      rowPositionMapping[tableName] = [];
    }

    // 初始化映射表，使显示位置与原始位置一致
    if (rowPositionMapping[tableName].length === 0) {
      for (let i = 0; i < rowCount; i++) {
        rowPositionMapping[tableName].push(i);
      }
    }

    // 如果行数增加，更新映射表
    if (rowPositionMapping[tableName].length < rowCount) {
      for (let i = rowPositionMapping[tableName].length; i < rowCount; i++) {
        rowPositionMapping[tableName].push(i);
      }
    }

    // 如果行数减少，更新映射表
    if (rowPositionMapping[tableName].length > rowCount) {
      rowPositionMapping[tableName] = rowPositionMapping[tableName].filter(index => index < rowCount);
    }
  };

  // 获取显示位置对应的原始数据索引
  const getOriginalRowIndex = (tableName, displayIndex) => {
    if (!rowPositionMapping[tableName] || displayIndex >= rowPositionMapping[tableName].length) {
      return displayIndex;
    }

    return rowPositionMapping[tableName][displayIndex];
  };

  // 获取原始数据索引对应的显示位置
  const getDisplayRowIndex = (tableName, originalIndex) => {
    if (!rowPositionMapping[tableName]) {
      return originalIndex;
    }

    const displayIndex = rowPositionMapping[tableName].indexOf(originalIndex);
    return displayIndex !== -1 ? displayIndex : originalIndex;
  };

  // 交换两行的显示位置
  const swapRows = (tableName, index1, index2) => {
    if (!rowPositionMapping[tableName]) return;

    const temp = rowPositionMapping[tableName][index1];
    rowPositionMapping[tableName][index1] = rowPositionMapping[tableName][index2];
    rowPositionMapping[tableName][index2] = temp;

    // 保存映射关系到localStorage
    try {
      localStorage.setItem(`acu_row_position_mapping_${tableName}`, JSON.stringify(rowPositionMapping[tableName]));
    } catch (e) {
      console.warn('[ACU] 无法保存行位置映射:', e);
    }
  };

  // 加载行位置映射关系
  const loadRowMapping = tableName => {
    try {
      const saved = localStorage.getItem(`acu_row_position_mapping_${tableName}`);
      if (saved) {
        rowPositionMapping[tableName] = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[ACU] 无法加载行位置映射:', e);
      rowPositionMapping[tableName] = [];
    }
  };

  const renderDataTable = (tableData, tableName) => {
    if (!tableData.rows || tableData.rows.length === 0) {
      return '<div class="empty-message">暂无数据</div>';
    }

    // 初始化行位置映射
    initializeRowMapping(tableName);

    // --- 核心：搜索过滤逻辑 ---
    let filteredIndices = [];
    const totalRows = tableData.rows.length;
    for (let i = 0; i < totalRows; i++) {
      filteredIndices.push(i);
    }

    if (currentSearchTerm) {
      const term = currentSearchTerm.toLowerCase();
      filteredIndices = filteredIndices.filter(displayIndex => {
        const originalIndex = getOriginalRowIndex(tableName, displayIndex);
        const row = tableData.rows[originalIndex];
        return row.some((cell, idx) => {
          if (idx === 0) return false; // 跳过隐藏列
          return String(cell || '')
            .toLowerCase()
            .includes(term);
        });
      });
    }

    const filteredTotalCount = filteredIndices.length;
    let currentPage = getCurrentPageForTable(tableName);
    const pageSize = 20;
    const maxPage = Math.ceil(filteredTotalCount / pageSize) - 1;

    // 修正页码：如果当前页超出了实际范围（且有数据），强制跳转
    if (currentPage > maxPage && filteredTotalCount > 0) {
      currentPage = Math.max(0, maxPage);
      savePaginationState(tableName, currentPage);
    }

    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredTotalCount);

    // 获取当前页要显示的索引
    const paginatedDisplayIndices = filteredIndices.slice(startIndex, endIndex);

    let html = '<div class="data-table-wrapper"><table class="data-table"><thead><tr>';

    tableData.headers.forEach((header, index) => {
      if (index > 0 && header) {
        html += `<th>${header}</th>`;
      }
    });
    html += '</tr></thead><tbody>';

    if (paginatedDisplayIndices.length === 0) {
      html += `<tr><td colspan="${tableData.headers.length}" style="text-align:center; padding: 20px; opacity: 0.6;">没有匹配的结果</td></tr>`;
    }

    paginatedDisplayIndices.forEach((displayIndex, rIdx) => {
      const originalIndex = getOriginalRowIndex(tableName, displayIndex);
      const row = tableData.rows[originalIndex];

      // 检查是否在待删除集合中
      const deleteKey = `${tableName}-row-${originalIndex}`;
      const isPendingDelete = pendingDeletes.has(deleteKey);
      const rowClass = isPendingDelete ? 'pending-deletion' : '';
      html += `<tr class="${rowClass}" draggable="true">`;

      row.forEach((cell, index) => {
        if (index > 0) {
          const cellContent = cell || '';
          let formattedContent = cellContent.toString().replace(/\n/g, '<br>');

          // --- 核心：高亮逻辑 (CTRL+F 式匹配) ---
          if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            try {
              const term = currentSearchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(${term})`, 'gi');
              // 仅对文本内容进行高亮，避免破坏可能存在的换行符 <br>
              formattedContent = formattedContent
                .split(/(<br>)/gi)
                .map(part => {
                  if (part.toLowerCase() === '<br>') return part;
                  return part.replace(regex, '<mark class="acu-search-match-text">$1</mark>');
                })
                .join('');
            } catch (reErr) {
              console.warn('[ACU] 高亮正则生成失败:', reErr);
            }
          }

          let highlightClass = '';

          // 优先显示用户编辑高亮，其次是数据库更新高亮
          if (isCellUserEdited(tableName, originalIndex, index)) {
            highlightClass = 'acu-highlight-user-edit';
          } else if (isCellDBUpdated(tableName, originalIndex, index)) {
            highlightClass = 'acu-highlight-changed';
          }

          const columnName = tableData.headers[index] || '';
          html += `<td class="acu-editable-cell ${highlightClass}" data-table-key="${tableData.key}" data-table-name="${tableName}" data-row="${originalIndex}" data-col="${index}" data-col-name="${columnName}">${formattedContent}</td>`;
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    return html;
  };

  // 绑定行拖动事件
  const bindRowDragEvents = ($section, tableName) => {
    const { $ } = getCore();
    const $rows = $section.find('.data-table tbody tr');

    // 关键修复：如果不是编辑模式，移除所有拖拽属性和事件，允许文本选择
    if (!isEditingRowOrder) {
      $rows.removeAttr('draggable').off('dragstart.acu dragend.acu dragover.acu dragenter.acu dragleave.acu drop.acu');
      $section.find('.data-table').removeClass('is-sorting-rows');
      return;
    }

    // 开启模式：设置 draggable 并绑定事件
    $section.find('.data-table').addClass('is-sorting-rows');
    $rows.attr('draggable', 'true').off('dragstart.acu dragend.acu dragover.acu dragenter.acu dragleave.acu drop.acu');

    $rows.on('dragstart.acu', function (e) {
      if (!isEditingRowOrder) return;
      isDragging = true;
      dragStartIndex = $(this).index();
      dragRowElement = this;
      $(this).addClass('dragging');

      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('text/plain', dragStartIndex.toString());
    });

    $rows.on('dragend.acu', function () {
      isDragging = false;
      dragStartIndex = -1;
      dragEndIndex = -1;
      $(this).removeClass('dragging');
      $section.find('.drag-over').removeClass('drag-over');
    });

    $rows.on('dragover.acu', function (e) {
      if (!isDragging || !isEditingRowOrder) return;

      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';

      const $this = $(this);
      const currentIndex = $this.index();

      if (currentIndex !== dragEndIndex) {
        $section.find('.drag-over').removeClass('drag-over');
        $this.addClass('drag-over');
        dragEndIndex = currentIndex;
      }
    });

    $rows.on('dragenter.acu', function (e) {
      e.preventDefault();
    });

    $rows.on('dragleave.acu', function (e) {
      if (e.target === this || $(e.target).closest('tr')[0] === this) {
        $(this).removeClass('drag-over');
        dragEndIndex = -1;
      }
    });

    $rows.on('drop.acu', function (e) {
      if (!isEditingRowOrder) return;
      e.preventDefault();

      const dropIndex = $(this).index();

      if (dragStartIndex !== dropIndex && dragStartIndex !== -1) {
        // 交换显示位置
        swapRows(tableName, dragStartIndex, dropIndex);

        // 重新渲染表格内容区域（不触碰标签页）
        const rawData = getTableData();
        const tables = processJsonData(rawData);
        if (tables && tables[tableName]) {
          const $tableSection = $(`#acu-table-${getSafeTableId(tableName)}`);
          if ($tableSection.length) {
            const currentPage = getCurrentPageForTable(tableName);
            const paginationHtml = generatePaginationHTML(tableName, tables[tableName].rows.length, currentPage);
            const newTableHtml = renderDataTable(tables[tableName], tableName);

            $tableSection.find('.acu-pagination-container').remove();
            $tableSection.find('.section-title').after(paginationHtml);
            $tableSection.find('.data-table-wrapper').replaceWith(newTableHtml);

            // 重新绑定单元格事件，且必须再次应用拖拽模式
            bindCellEventsForSection($tableSection);
            bindPaginationEvents($tableSection, tableName, tables[tableName]);
            bindRowDragEvents($tableSection, tableName);
          }
        }

        showNotification('行顺序已调整', 'success');
      }

      $(this).removeClass('drag-over');
    });
  };

  // 重构标签排序逻辑，移除递归调用，提升性能
  const initDragSort = () => {
    const { $ } = getCore();
    const $tabsContainer = $('#acu-tabs-sortable');
    if (!$tabsContainer.length) return;

    const $tabs = $tabsContainer.find('.acu-tab-btn');
    let dragStartIndex = -1;
    let originalOrder = [];

    // 记录初始顺序用于取消
    $tabs.each(function () {
      originalOrder.push($(this).clone(true));
    });

    $tabs.attr('draggable', 'true');

    // 使用事件委托绑定事件，避免重复绑定和性能损耗
    consabsContainer.off('.acu-drag');

    $tabsContainer.on('dragstart.acu-drag', '.acu-tab-btn', function (e) {
      if (!isEditingOrder) return;
      const $this = $(this);
      dragStartIndex = $tabsContainer.find('.acu-tab-btn').index($this);
      $this.addClass('dragging');
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('text/plain', dragStartIndex);
    });

    $tabsContainer.on('dragend.acu-drag', '.acu-tab-btn', function () {
      $('.acu-tab-btn').removeClass('dragging drag-over');
    });

    $tabsContainer.on('dragover.acu-drag', '.acu-tab-btn', function (e) {
      if (!isEditingOrder) return;
      e.preventDefault();
      const $this = $(this);
      if (!$this.hasClass('dragging')) {
        $('.acu-tab-btn').removeClass('drag-over');
        $this.addClass('drag-over');
      }
    });

    $tabsContainer.on('drop.acu-drag', '.acu-tab-btn', function (e) {
      if (!isEditingOrder) return;
      e.preventDefault();
      const $dropTarget = $(this);
      const $draggedItem = $tabsContainer.find('.acu-tab-btn.dragging');

      if ($dropTarget.hasClass('dragging') || !$draggedItem.length) return;

      const dragIndex = parseInt(e.originalEvent.dataTransfer.getData('text/plain'));
      const dropIndex = $tabsContainer.find('.acu-tab-btn').index($dropTarget);

      if (dragIndex !== dropIndex) {
        if (dragIndex < dropIndex) {
          $dropTarget.after($draggedItem);
        } else {
          $dropTarget.before($draggedItem);
        }
        // 注意：这里不再调用 initDragSort() 递归，而是保持 DOM 现状
        // 视觉上已经完成移动，事件由于是委托绑定的，依然有效
      }

      $dropTarget.removeClass('drag-over');
    });

    return originalOrder;
  };

  // 新增：顺序管理菜单弹出
  const showOrderMenu = event => {
    const { $ } = getCore();

    const $existingMenu = $('.acu-order-menu');
    if ($existingMenu.length > 0) {
      $existingMenu.remove();
      return;
    }

    // 移除其他菜单
    $('.acu-cell-menu, .acu-edit-overlay').remove();

    const isNightMode = $('.acu-table-container').hasClass('night-mode');

    let menuHtml = `
      <div class="acu-cell-menu acu-order-menu ${isNightMode ? 'night-mode' : ''}" style="z-index: 10005;">
          <div class="acu-cell-menu-item" data-action="tab-order">📑 编辑标签顺序 ${isEditingOrder ? ' (开启中)' : ''}</div>
          <div class="acu-cell-menu-item" data-action="row-order">☰ 编辑行内容顺序 ${isEditingRowOrder ? ' (开启中)' : ''}</div>
          <div class="acu-cell-menu-item close" data-action="close">❌ 关闭菜单</div>
      </div>`;

    const $menu = $(menuHtml);
    $('body').append($menu);

    const clickX = event.clientX;
    const clickY = event.clientY;

    $menu.css({
      left: `${clickX}px`,
      top: `${clickY}px`,
      position: 'fixed',
    });

    $menu.find('.acu-cell-menu-item').on('click', function () {
      const action = $(this).data('action');
      if (action === 'tab-order') {
        if (isEditingRowOrder) stopRowOrderEditing();
        if (isEditingOrder) {
          saveTableOrderFromUI();
        } else {
          startOrderEditing();
        }
      } else if (action === 'row-order') {
        if (isEditingOrder) cancelOrderEditing();
        if (isEditingRowOrder) {
          stopRowOrderEditing();
        } else {
          startRowOrderEditing();
        }
      }
      $menu.remove();
    });

    // 【修复】改进的点击外部关闭逻辑，支持父窗口监听
    const closeOrderMenu = e => {
      if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
        $menu.remove();
        document.removeEventListener('click', closeOrderMenu);
        if (window.parent && window.parent.document) {
          window.parent.document.removeEventListener('click', closeOrderMenu);
        }
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeOrderMenu);
      if (window.parent && window.parent.document && window.parent.document !== document) {
        window.parent.document.addEventListener('click', closeOrderMenu);
      }
    }, 100);

    event.stopPropagation();
  };

  // 新增：开始行排序编辑
  const startRowOrderEditing = () => {
    const { $ } = getCore();
    isEditingRowOrder = true;

    $('.acu-table-container').addClass('editing-row-order');
    // 【修改】不显示保存/取消按钮，因为行排序是实时保存的
    $('#acu-order-controls').removeClass('visible');

    const activeTab = getActiveTabState();
    if (activeTab) {
      const $activeTabBtn = $(`.acu-tab-btn[data-table-name="${activeTab}"]`);
      if ($activeTabBtn.length) $activeTabBtn.trigger('click.acu');
    }

    showNotification('已开启行排序模式（实时生效，文字选择已禁用）', 'info');
  };

  // 新增：停止行排序编辑
  const stopRowOrderEditing = () => {
    const { $ } = getCore();
    isEditingRowOrder = false;

    $('.acu-table-container').removeClass('editing-row-order');
    $('#acu-order-controls').removeClass('visible');

    // 强制刷新当前显示的表格以禁用拖拽
    const activeTab = getActiveTabState();
    if (activeTab) {
      const $activeTabBtn = $(`.acu-tab-btn[data-table-name="${activeTab}"]`);
      if ($activeTabBtn.length) $activeTabBtn.trigger('click.acu');
    }

    showNotification('行排序模式已关闭', 'success');
  };

  const startOrderEditing = () => {
    const { $ } = getCore();

    isEditingOrder = true;
    $('.acu-table-container').addClass('editing-order');
    $('#acu-order-controls').addClass('visible');
    $('.acu-order-edit-btn').css({ opacity: '0.3', 'pointer-events': 'none' });

    window.acuOriginalOrder = initDragSort();
  };

  const saveTableOrderFromUI = () => {
    const { $ } = getCore();
    const $tabs = $('#acu-tabs-sortable').find('.acu-tab-btn');
    const tableNames = [];

    $tabs.each(function () {
      const tableName = $(this).data('table-name');
      if (tableName) tableNames.push(tableName);
    });

    saveTableOrder(tableNames);

    isEditingOrder = false;
    $('.acu-table-container').removeClass('editing-order');
    $('#acu-order-controls').removeClass('visible');
    $('.acu-order-edit-btn').css({ opacity: '1', 'pointer-events': 'auto' });

    $('.acu-tab-btn').removeAttr('draggable').off('dragstart.acu dragend.acu dragover.acu drop.acu');

    showNotification('表格顺序已保存', 'success');
  };

  const cancelOrderEditing = () => {
    const { $ } = getCore();

    if (isEditingRowOrder) {
      stopRowOrderEditing();
      return;
    }

    if (window.acuOriginalOrder && window.acuOriginalOrder.length > 0) {
      const $tabsContainer = $('#acu-tabs-sortable');
      $tabsContainer.empty();

      window.acuOriginalOrder.forEach($tabClone => {
        $tabsContainer.append($tabClone);
      });

      bindTabClickEvents();
      $('.acu-table-container').removeClass('editing-order');
      activateSavedTab();
    }

    isEditingOrder = false;
    $('.acu-table-container').removeClass('editing-order');
    $('#acu-order-controls').removeClass('visible');
    $('.acu-order-edit-btn').css({ opacity: '1', 'pointer-events': 'auto' });

    $('.acu-tab-btn').removeAttr('draggable').off('dragstart.acu dragend.acu dragover.acu drop.acu');

    showNotification('已取消顺序编辑', 'info');
  };

  const activateSavedTab = () => {
    const { $ } = getCore();
    const savedActiveTab = getActiveTabState();

    if (savedActiveTab) {
      const $savedTab = $(`.acu-tab-btn[data-table-name="${savedActiveTab}"]`);
      if ($savedTab.length) {
        $savedTab.trigger('click.acu');
        return;
      }
    }

    if ($('.acu-tab-btn').length > 0 && $('.acu-tab-btn.active').length === 0) {
      $('.acu-tab-btn').first().trigger('click.acu');
    }
  };

  const bindTabClickEvents = () => {
    const { $ } = getCore();

    $('.acu-tab-btn')
      .off('click.acu')
      .on('click.acu', function () {
        if (isEditingOrder) return;

        const tableId = $(this).data('table-id');
        const tableName = $(this).data('table-name');

        $('.acu-tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.acu-table-section').removeClass('active');
        $(`#acu-table-${tableId}`).addClass('active');

        resetScrollPositionToTop();

        saveActiveTabState(tableName);

        clearTabBadgeOnClick(tableName);

        const rawData = getTableData();
        const tables = processJsonData(rawData);
        if (tables && tables[tableName]) {
          const $section = $(`#acu-table-${tableId}`);
          const currentPage = getCurrentPageForTable(tableName);
          const paginationHtml = generatePaginationHTML(
            tableName,
            tables[tableName].rows ? tables[tableName].rows.length : 0,
            currentPage,
          );
          const newTableHtml = renderDataTable(tables[tableName], tableName);

          $section.find('.acu-pagination-container').remove();
          $section.find('.section-title').after(paginationHtml);
          $section.find('.data-table-wrapper').replaceWith(newTableHtml);

          bindCellEventsForSection($section);
          bindPaginationEvents($section, tableName, tables[tableName]);
          bindRowDragEvents($section, tableName);
        }

        // 添加这行：检查是否需要跳转到最后一页
        setTimeout(() => checkAndJumpToLastPageForSummary(), 100);
      });

    activateSavedTab();
  };

  const bindExpandCollapseEvents = () => {
    const { $ } = getCore();

    // 1. details 展开状态存储
    $('.acu-table-container details')
      .off('toggle.acu')
      .on('toggle.acu', function (e) {
        const isOpen = $(this).attr('open') !== undefined;
        saveTableExpandedState(isOpen);
        const $hint = $(this).find('.acu-expand-hint');
        $hint.text(isOpen ? '点击收起' : '点击展开');
      });

    // 2. 核心：月相/太阳切换按钮交互
    // 改用 button 并执行 preventDefault，这是拦截 summary 默认行为最稳固的手段
    $('.acu-mode-toggle')
      .off('click.acu')
      .on('click.acu', function (e) {
        e.preventDefault();
        e.stopPropagation();

        toggleNightMode();
        return false;
      });
  };

  const showCellMenu = (event, cell) => {
    const { $ } = getCore();

    // 先移除所有现有菜单
    $('.acu-cell-menu, .acu-edit-overlay').remove();

    // 【修复】移除旧的事件监听器
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

    // 检查列名是否包含"选项"
    const showSendToInput = columnName.includes('选项');

    // 检查是否在待删除集合中
    const deleteKey = `${tableName}-row-${rowIndex}`;
    const isPendingDelete = pendingDeletes.has(deleteKey);

    let menuHtml = isPendingDelete
      ? `
      <div class="acu-cell-menu ${isNightMode ? 'night-mode' : ''}">
          <div class="acu-cell-menu-item restore" data-action="restore">🔄 恢复整行</div>
          <div class="acu-cell-menu-item close" data-action="close">✕ 关闭菜单</div>
      </div>
    `
      : `
      <div class="acu-cell-menu ${isNightMode ? 'night-mode' : ''}">
          <div class="acu-cell-menu-item edit" data-action="edit">✏️ 编辑</div>
          <div class="acu-cell-menu-item history" data-action="history">📜 历史记录</div>
          <div class="acu-cell-menu-item insert" data-action="insert-above">➕ 在上方插入新行</div>
          <div class="acu-cell-menu-item insert" data-action="insert">➕ 在下方插入新行</div>
          <div class="acu-cell-menu-item delete" data-action="delete">🗑️ 删除整行</div>
          ${showSendToInput ? '<div class="acu-cell-menu-item sendToInput" data-action="sendToInput">📤 发送至输入框</div>' : ''}
          <div class="acu-cell-menu-item close" data-action="close">✕ 关闭菜单</div>
      </div>
    `;

    const $menu = $(menuHtml);
    $('body').append($menu);

    const clickX = event.clientX;
    const clickY = event.clientY;

    const menuWidth = $menu.outerWidth();
    const menuHeight = $menu.outerHeight();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let menuX = clickX + 10;
    let menuY = clickY + 10;

    if (menuX + menuWidth > viewportWidth) {
      menuX = clickX - menuWidth - 10;
    }

    if (menuY + menuHeight > viewportHeight) {
      menuY = clickY - menuHeight - 10;
    }

    menuX = Math.max(10, menuX);
    menuY = Math.max(10, menuY);

    $menu.css({
      left: `${menuX}px`,
      top: `${menuY}px`,
    });

    // 保存点击坐标到菜单数据中
    $menu.data('clickX', clickX);
    $menu.data('clickY', clickY);

    // 绑定菜单项点击事件
    $menu.find('.acu-cell-menu-item').on('click', function () {
      const action = $(this).data('action');
      // 对于历史记录,我们需要传递点击坐标
      if (action === 'history') {
        const clickX = $menu.data('clickX');
        const clickY = $menu.data('clickY');
        // 创建一个模拟事件对象,包含点击坐标
        const simulatedEvent = {
          clientX: clickX,
          clientY: clickY,
          pageX: clickX,
          pageY: clickY,
        };
        handleCellAction(action, tableKey, tableName, rowIndex, colIndex, cell, cellContent, simulatedEvent);
      } else {
        handleCellAction(action, tableKey, tableName, rowIndex, colIndex, cell, cellContent);
      }
      $menu.remove();

      // 【修复】移除事件监听器
      if (window.acuCellMenuCloseHandler) {
        document.removeEventListener('click', window.acuCellMenuCloseHandler);
        if (window.parent && window.parent.document) {
          window.parent.document.removeEventListener('click', window.acuCellMenuCloseHandler);
        }
      }
    });

    // 【修复关键】改进的关闭菜单逻辑
    const closeMenu = e => {
      // 检查点击是否在菜单外部
      if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
        $menu.remove();

        // 移除事件监听器
        if (window.acuCellMenuCloseHandler) {
          document.removeEventListener('click', window.acuCellMenuCloseHandler);
          if (window.parent && window.parent.document) {
            window.parent.document.removeEventListener('click', window.acuCellMenuCloseHandler);
          }
        }
      }
    };

    // 保存到全局变量
    window.acuCellMenuCloseHandler = closeMenu;

    // 【修复】使用setTimeout确保菜单已完全渲染后再绑定事件
    setTimeout(() => {
      // 同时监听当前文档和父文档的点击事件
      document.addEventListener('click', closeMenu, { once: false });

      // 如果存在父文档,也监听父文档
      if (window.parent && window.parent.document && window.parent.document !== document) {
        window.parent.document.addEventListener('click', closeMenu, { once: false });
      }
    }, 100);

    // 阻止事件冒泡,防止立即触发关闭
    event.stopPropagation();
    event.preventDefault();
  };

  // handleCellAction函数 - 修复历史记录按钮点击问题
  const handleCellAction = async (action, tableKey, tableName, rowIndex, colIndex, cell, cellContent, event = null) => {
    const { $ } = getCore();

    switch (action) {
      case 'history':
        // 传递事件对象给 showHistoryMenu
        showHistoryMenu(event || window.event, cell, tableName, rowIndex, colIndex);
        return; // 注意这里用 return，不是 break

      case 'edit':
        // 编辑逻辑
        const rawData = getTableData();
        if (!rawData?.[tableKey]) {
          alert('无法获取数据库数据，编辑失败');
          return;
        }

        const isNightMode = $('.acu-table-container').hasClass('night-mode');

        // [优化] 为编辑弹窗添加主题适配样式
        // 日间模式：强制浅色背景、深色文字
        // 夜间模式：深色背景、浅色文字
        const dialogStyle = `
            <style>
                .acu-edit-dialog {
                    background: var(--acu-background, #fff);
                    color: var(--acu-text, #333);
                }
                .acu-edit-overlay.night-mode .acu-edit-dialog {
                    background: #2d2d2d;
                    color: #dbdbd6;
                }

                .acu-edit-header {
                    /* 日间：深色背景(如蓝色) + 白色文字，或者 浅色背景 + 深色文字 */
                    /* 这里沿用主色调作为背景，文字白色，确保对比度 */
                    background: var(--acu-primary, #5c9dff);
                    color: #fff;
                    padding: 10px 14px;
                    border-radius: 6px 6px 0 0;
                    font-weight: 600;
                    font-size: 14px;
                }
                .acu-edit-overlay.night-mode .acu-edit-header {
                    background: var(--acu-primary, #8479b8); /* 夜间主色 */
                }

                .acu-edit-textarea {
                    width: 100%;
                    min-height: 120px;
                    padding: 10px;
                    box-sizing: border-box;
                    border: 1px solid var(--acu-border, #ddd);
                    border-radius: 4px;
                    margin: 10px 0;
                    resize: vertical;
                    font-family: inherit;

                    /* [核心修复] 强制日间/夜间输入框颜色 */
                    background: #ffffff;
                    color: #333333;
                }
                .acu-edit-overlay.night-mode .acu-edit-textarea {
                    background: #3a3a3a;
                    color: #dbdbd6;
                    border-color: #555;
                }
                .acu-edit-textarea:focus {
                    outline: none;
                    border-color: var(--acu-primary, #5c9dff);
                    box-shadow: 0 0 0 2px rgba(92,157,255,0.2);
                }

                .acu-edit-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .acu-edit-buttons button {
                    padding: 6px 14px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                .acu-save-btn {
                    background: var(--acu-primary, #5c9dff);
                    color: #fff;
                }
                .acu-save-btn:hover {
                    filter: brightness(1.1);
                }
                .acu-cancel-btn {
                    background: var(--acu-secondary, #f0f4f8);
                    color: var(--acu-text, #333);
                    border-color: var(--acu-border, #ddd);
                }
                .acu-edit-overlay.night-mode .acu-cancel-btn {
                    background: #3a3a3a;
                    color: #dbdbd6;
                    border-color: #555;
                }
                .acu-cancel-btn:hover {
                    filter: brightness(0.95);
                }
                .acu-edit-overlay.night-mode .acu-cancel-btn:hover {
                    filter: brightness(1.2);
                }
            </style>
        `;

        const $editOverlay = $(`
                    <div class="acu-edit-overlay ${isNightMode ? 'night-mode' : ''}">
                        ${dialogStyle}
                        <div class="acu-edit-dialog">
                            <div class="acu-edit-header">编辑单元格内容 - ${tableName}</div>
                            <div class="acu-edit-content">
                                <textarea class="acu-edit-textarea" placeholder="请输入内容...">${cellContent}</textarea>
                                <div class="acu-edit-buttons">
                                    <button class="acu-cancel-btn">取消</button>
                                    <button class="acu-save-btn">保存</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `);

        $('body').append($editOverlay);

        const $textarea = $editOverlay.find('.acu-edit-textarea');
        $textarea.focus().select();

        isCellEditing = true;

        const saveEdit = async () => {
          const newContent = $textarea.val();
          const formattedContent = newContent.replace(/\n/g, '<br>');

          // 更新单元格显示
          $(cell).html(formattedContent);

          // 标记为用户编辑
          currentUserEditMap.add(`${tableName}-${rowIndex}-${colIndex}`);

          // 修改原始数据
          const rawData = getTableData();
          if (rawData?.[tableKey]?.content) {
            const actualRowIndex = rowIndex + 1;
            if (rawData[tableKey].content[actualRowIndex]?.[colIndex] !== undefined) {
              rawData[tableKey].content[actualRowIndex][colIndex] = newContent;
            }
          }

          // 记录历史
          addCellHistory(tableName, rowIndex, colIndex, newContent);

          // 保存数据但不重新渲染
          const saveSuccess = await saveDataToDatabase(rawData, {
            type: 'cell_edit',
            tableName,
            rowIndex,
            colIndex,
            newValue: newContent,
          });
          if (saveSuccess) {
            // 标记为高亮
            $(cell).addClass('acu-highlight-user-edit');
          } else {
            console.warn('保存失败，但编辑已应用到本地');
          }

          $editOverlay.remove();
          isCellEditing = false;
        };

        const cancelEdit = () => {
          $editOverlay.remove();
          isCellEditing = false;
        };

        $editOverlay.find('.acu-save-btn').on('click', saveEdit);
        $editOverlay.find('.acu-cancel-btn').on('click', cancelEdit);

        $textarea.on('keydown', function (e) {
          if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveEdit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
          }
        });

        // 点击外部关闭（防误触：mousedown+mouseup都在overlay背景才关闭）
        let editMouseDownOnBg = false;
        $editOverlay
          .on('mousedown', function (e) {
            editMouseDownOnBg = $(e.target).hasClass('acu-edit-overlay');
          })
          .on('mouseup', function (e) {
            if (editMouseDownOnBg && $(e.target).hasClass('acu-edit-overlay')) cancelEdit();
            editMouseDownOnBg = false;
          });
        break;

      case 'insert-above':
        // 在上方插入新行
        try {
          const rawData = getTableData();
          if (!rawData?.[tableKey]) {
            alert('无法获取表格数据');
            return;
          }

          // 获取当前表格的列数
          const headers = rawData[tableKey].content[0] || [];
          const colCount = headers.length;

          // 创建新的空白行，并在第一列数据单元格（索引1）填入"1"作为占位符
          const newRow = [];
          for (let i = 0; i < colCount; i++) {
            if (i === 1) {
              // 第一列数据单元格（跳过表头列）填入"1"作为占位符
              newRow.push('1');
            } else {
              newRow.push(''); // 其他单元格保持空白
            }
          }

          // 在指定行上方插入新行
          const insertIndex = rowIndex + 1; // +1: 因为第一行是表头
          rawData[tableKey].content.splice(insertIndex, 0, newRow);

          // 标记为已编辑（标记第一列数据单元格）
          currentUserEditMap.add(`${tableName}-${rowIndex}-1`); // 标记第一个数据单元格为用户编辑

          // 保存数据
          const saveSuccess = await saveDataToDatabase(rawData);
          if (saveSuccess) {
            showNotification('已成功在上方添加新行（第一列已填入占位符"1"）', 'success');
            // 重新渲染表格
            smartUpdateTable(true);
          }
        } catch (e) {
          console.error('添加新行失败:', e);
          alert('添加新行失败：' + e.message);
        }
        break;

      case 'insert':
        // 在下方插入新行
        try {
          const rawData = getTableData();
          if (!rawData?.[tableKey]) {
            alert('无法获取表格数据');
            return;
          }

          // 获取当前表格的列数
          const headers = rawData[tableKey].content[0] || [];
          const colCount = headers.length;

          // 创建新的空白行，并在第一列数据单元格（索引1）填入"1"作为占位符
          const newRow = [];
          for (let i = 0; i < colCount; i++) {
            if (i === 1) {
              // 第一列数据单元格（跳过表头列）填入"1"作为占位符
              newRow.push('1');
            } else {
              newRow.push(''); // 其他单元格保持空白
            }
          }

          // 在指定行下方插入新行
          const insertIndex = rowIndex + 2; // +2: +1因为第一行是表头，+1因为要插入在下方
          rawData[tableKey].content.splice(insertIndex, 0, newRow);

          // 标记为已编辑（标记第一列数据单元格）
          currentUserEditMap.add(`${tableName}-${rowIndex + 1}-1`); // 标记第一个数据单元格为用户编辑

          // 保存数据
          const saveSuccess = await saveDataToDatabase(rawData);
          if (saveSuccess) {
            showNotification('已成功在下方添加新行（第一列已填入占位符"1"）', 'success');
            // 重新渲染表格
            smartUpdateTable(true);
          }
        } catch (e) {
          console.error('添加新行失败:', e);
          alert('添加新行失败：' + e.message);
        }
        break;

      case 'delete':
        // 标记删除，不实际删除
        const deleteKey = `${tableName}-row-${rowIndex}`;
        pendingDeletes.add(deleteKey);

        // 标记行为待删除（标红）
        $(cell).closest('tr').addClass('pending-deletion');

        // 更新保存按钮状态
        updateSaveBtnState();

        showNotification(`已标记第${rowIndex + 1}行为待删除，点击保存到数据库生效`, 'warning');
        break;

      case 'restore':
        // 恢复逻辑：从待删除集合中移除
        const restoreKey = `${tableName}-row-${rowIndex}`;
        pendingDeletes.delete(restoreKey);

        // 移除待删除标记（取消标红）
        $(cell).closest('tr').removeClass('pending-deletion');

        // 更新保存按钮状态
        updateSaveBtnState();

        showNotification(`已恢复第${rowIndex + 1}行`, 'success');
        break;

      case 'sendToInput':
        // 发送至输入框
        try {
          const textToSend = cellContent || '';
          const input = parent.document.getElementById('send_textarea');
          if (input) {
            input.value = textToSend;
            showNotification('已发送至输入框', 'success');
          } else {
            showNotification('未找到输入框元素', 'warning');
          }
        } catch (error) {
          console.error('发送至输入框失败:', error);
          showNotification('发送失败: ' + error.message, 'error');
        }
        break;
    }
  };

  const insertTableAfterLatestAIMessage = () => {
    const { $ } = getCore();

    const tableHtml = generateTableHTML();
    $('.acu-table-container').remove();

    let $latestAIMessage = $('.mes:not(.sys):not(.user)').last();

    if ($latestAIMessage.length === 0) {
      const $chatContainer = $('#chat, .chat-container').first();
      if ($chatContainer.length) {
        $chatContainer.append(tableHtml);
      } else {
        $('body').append(tableHtml);
      }
    } else {
      $latestAIMessage.after(tableHtml);
    }

    bindTableEvents();

    lastAIMessageId = getLatestAIMessageId();

    currentTableScrollTop = getInnerScrollPositionState();
    setTimeout(() => {
      applySavedScrollPositionImmediately();
    }, 50);

    isFirstRender = false;
  };

  const bindTableEvents = () => {
    const { $ } = getCore();

    bindTabClickEvents();
    bindExpandCollapseEvents();

    $('.acu-mode-toggle')
      .off('click.acu')
      .on('click.acu', function (e) {
        e.stopPropagation();
        toggleNightMode();
      });

    $('#acu-theme-btn')
      .off('click.acu')
      .on('click.acu', function (e) {
        e.stopPropagation();
        showThemeMenu(e);
      });

    // 【新增】设置按钮事件绑定
    $('#acu-settings-btn-main')
      .off('click.acu')
      .on('click.acu', function (e) {
        e.stopPropagation();
        showSettingsDialog();
      });

    $('.acu-order-edit-btn').off('click.acu').on('click.acu', showOrderMenu);

    $('.acu-save-order-btn').off('click.acu').on('click.acu', saveTableOrderFromUI);

    $('.acu-cancel-order-btn').off('click.acu').on('click.acu', cancelOrderEditing);

    $('#acu-save-db-btn-main')
      .off('click.acu')
      .on('click.acu', async function () {
        if (isSaving) return;

        $(this).prop('disabled', true).text('💾 保存中...');

        const rawData = getTableData();
        if (rawData) {
          // 保存数据，包含待删除的行
          const saveSuccess = await saveDataToDatabase(rawData);
          $(this).prop('disabled', false).text('💾 保存到数据库');

          if (!saveSuccess) {
            showNotification('保存失败，请检查数据库连接！', 'error');
          }
        } else {
          $(this).prop('disabled', false).text('💾 保存到数据库');
          alert('无法获取数据，保存失败！');
        }
      });

    $('#acu-refresh-btn-main')
      .off('click.acu')
      .on('click.acu', function (e) {
        // 刷新按钮 -> 4项菜单
        showRefreshMenu(e);
      });

    $('.acu-editable-cell')
      .off('click.acu')
      .on('click.acu', function (e) {
        showCellMenu(e, this);
      });

    // --- 新增：为每个表格分区绑定搜索功能 ---
    $('.acu-table-section').each(function () {
      const $section = $(this);
      const tableName = $section
        .find('.section-title')
        .contents()
        .filter(function () {
          return this.nodeType === 3; // 获取文本节点（表格名）
        })
        .text()
        .trim();
      if (tableName) {
        bindCellEventsForSection($section, tableName);
      }
    });

    $('.acu-scroll-container')
      .off('scroll.acu')
      .on('scroll.acu', function () {
        currentTableScrollTop = $(this).scrollTop();
        saveInnerScrollPositionState(currentTableScrollTop);
      });
  };

  const getOrderedTableNames = tables => {
    if (!tables) return [];

    const savedOrder = getSavedTableOrder();
    const currentTableNames = Object.keys(tables);

    if (!savedOrder) return currentTableNames;

    const orderedNames = [];
    const usedNames = new Set();

    savedOrder.forEach(tableName => {
      if (currentTableNames.includes(tableName) && !usedNames.has(tableName)) {
        orderedNames.push(tableName);
        usedNames.add(tableName);
      }
    });

    currentTableNames.forEach(tableName => {
      if (!usedNames.has(tableName)) {
        orderedNames.push(tableName);
        usedNames.add(tableName);
      }
    });

    return orderedNames;
  };

  // 初始化函数
  const init = () => {
    if (isInitialized) return;

    // 启动时检查存储
    cleanupStorage();

    const { $ } = getCore();

    addStyles();

    currentTableScrollTop = getInnerScrollPositionState();

    const initializeScript = () => {
      const api = getCore().getDB();
      if (!api || typeof api.exportTableAsJson !== 'function') {
        setTimeout(initializeScript, 3000);
        return;
      }

      try {
        insertTableAfterLatestAIMessage();
      } catch (err) {
        console.error('[ACU] insertTableAfterLatestAIMessage 出错:', err);
      }

      showLoadSuccessNotification();

      // 【新增】初始化时如果无快照,自动保存当前状态为快照
      // 这建立了对比基准,防止后续更新无法识别差异
      if (!loadSnapshot()) {
        const current = api.exportTableAsJson();
        if (current) {
          saveSnapshot(current);
          lastTableDataHash = generateDataHash(current);
        }
      }

      // 监听数据库更新
      if (api?.registerTableUpdateCallback) {
        api.registerTableUpdateCallback(UpdateController.handleUpdate);
      }

      // 监听表格填充开始
      if (api?.registerTableFillStartCallback) {
        api.registerTableFillStartCallback(() => {
          currentUserEditMap.clear();

          const current = api.exportTableAsJson();
          if (current) saveSnapshot(current);
        });
      }

      // 监听AI消息变化
      const observeAIMessages = () => {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              for (let node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                  const $node = $(node);
                  if ($node.hasClass('mes') && !$node.hasClass('sys') && !$node.hasClass('user')) {
                    setTimeout(() => {
                      checkAndUpdateTablePosition();
                    }, 300);
                    break;
                  }
                }
              }
            }
          });
        });

        const chatContainer = $('#chat, .chat-container').get(0) || document.body;
        if (chatContainer) {
          observer.observe(chatContainer, { childList: true, subtree: true });
        }
      };

      setTimeout(observeAIMessages, 1000);

      isInitialized = true;
    };

    setTimeout(initializeScript, 2000);
  };

  const { $ } = getCore();
  if ($) {
    $(document).ready(init);
  } else {
    window.addEventListener('load', init);
  }
})();
