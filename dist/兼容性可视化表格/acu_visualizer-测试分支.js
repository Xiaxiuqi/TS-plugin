// ==UserScript==
// @name         兼容性可视化表格 v9.51
// @namespace    http://tampermonkey.net/
// @version      9.5.1
// @description  兼容性可视化表格 v9.51
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
        background: transparent !important;
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
cons
    consy {
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
                    --acu-seconry: #f0ebff;
                    nd: #f8f5ff;
                    gba(240, 235, 255, 0.8); /* 浅紫灰 */
                    7c;
                    #d4cce8;
                    ight: #958ac5;
                }
                .acu
                   --acu-primary: #5c9dff;
                    --acu-seconda: #f0f4f8;
                    nd: #ffffff;
                    gba(245, 248, 252, 0.9); /* 极致冷白 */

                    #
                    ight: #4a8ae6;
                }
                .acu
                   --acu-primary: #4a8c5c;
                    --acu-seconda: #e8f0e8;
                    nd: #ffffff;
                    gba(240, 248, 240, 0.9); /* 清爽浅绿 */
                    4
                    #
                    ight: #5a9c6c;
                }
                .acu
                   --acu-primary: #4a7ca8;
                    --acu-secondy: #e8f0f8;
                    nd: #ffffff;
                    gba(240, 245, 250, 0.9); /* 冰海浅蓝 */
                    9
                    #
                    ight: #5a8cb8;
                }

                acu-table-container.night-mode.acu-theme-dark {
                    --acu-secondary: #3a3a3a;
                    --acu-background: #2d2d2d;
                    gba(45, 45, 45, 0.9); /* 深色透明 */
                    d6;
                    #444;
                    r: #c44d4d;
                    4;
                }

                * 统一通知样式 */
                .acu-notification {
                  colorhite;
                    padding: 12px0px;
                    border-radius: 4px;
                    position: fixed;
                    top: 20px; /* 初始顶部位置 */
                    right: 20px;
                    z-ind
                    box-sh0 4px 12px rgba(0,0,0,0.15);
                    animation: acu-fadeInOut 3s ease-in-out;
                    font-family: 'Micr YaHei', sans-serif;
                    font-size: 14px;
                    transition: top 0.3s ease;
                }

                acu-notification.success {
                    background-color: #66BB6A;
                }

                acu-notification.error {
                    background-color: #EF5350;
                }

                acu-notification.warning {
                    background-color: #FFA726;
                }

                acu-notification.info {
                    background-color: #42A5F5;
                }

                * =========================================
                   [修复] 编辑单元格弹窗全局样式 (强制覆盖)
                 ========================================= */
                .acu-edit-overlay {

                    top: 0;

                    h: 100%;
                    heigh100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index2;
                    display: flex;
                    content: center;
                    align-items: center;
                }
                .acu-edit-dialog
                   width: 400px;
                    background: fffff !important; /* 日间模式强制白底 */
                     #333333 !important;      /* 日间模式强制深色字 */
                    us: 8px;
                    adow: 0 4, 0.2);

                    id
                     ex;
                    flex-direction: column;
                }
                .acu-edit-header {
                   /* 使用半透明黑底确保白色文字可见，或者直接用主色 */
                    background: r(--acu-primary);
                    lor: #ffffff !important;
                    px 15px;
                    eo
                    epx;
                    /* 增加文字阴影，防止背景色过浅导致看不清 */
                    wpx 2px rgba(0,0,0,0.3);
                }
                .acu-edit-conten{
                   padding: 15px;
                }
                .acux {
                   width: 100%;
                    height: 150px;
                    -m: 10px;
                    : 8px;
                    box-sizing: border-box;
                    1olid #ccc;
                    border-radius: 4px;
                    resize:tical;
                    nt;
                    /* 核心修复：日间模式强制白底黑字 */
                    olor: #ffffff !important;
                    lor: #333333 !imtant;
                }
                .acub{
                   display: flex;
                    justify-conte: flex-end;
                    x
                }
                .acu-edions button {
                   padding: 6px 12px;

                    adius: 4px;
                     pointer;
                    x
                }
                .acu{
                   background-color: var(--acu-primary);
                    color: whe;
                }
                .acul
                   background-color: #e0e0e0;
                    color: #333
                }

                * 夜间模式适配 */
                .acu-edit-overlay.night-mode .acu-edit-dialog {
                  backgnd-color: #2d2d2d !important;
                    color: #dbdbd6 !importa
                     #444;
                }
                .acuvahe .acu-edit-textarea {
                   background-color: #3a3a3a !important;
                t
                    5;
                }
                .acu-edit-overlay.night-mode .acu-cancel-btn {
                   background-color: #4a4a4a;

                }

                * 保留兼容性 */
                .acu-load-success-notification {
                  backund-color: #66BB6A;
                    color: white;
                    x
                    -: 4px;
                    :e

                    p
                    d999;
                    a0 4px 12px rgba(0,0,0,0.15);
                    n-fadeInOut 3s ease-in-out;
                    :'rtif;

                }

                keyframes acu-fadeInOut {
                    0% { opacity: 0; transform: translateY(-20px); }
                    15% { sform: translateY(0); }
                    85% opacity: transform: translateY(0); }
                    100% 0; translateY(-2x); }
                }

                acu-tab-btn.has-updates {
                    position: relative;
                }

                acu-tab-btn .acu-update-badge {
                    position: absolute;
                    top: 2px;
                    x;
                    h: 6px !important;
                    : !important;
                    o---acu-primary, #5c9dff);
                    ruortant;
                    lse 2s infinite;

                    : 0 0 4px var(--acu-primary, #5c9dff);
                }

                keyframes acu-pulse {
                    0% { transform: scale(1); opacity: 1; }
                t cale(1.3); opacity: 0.7; }
                    0 m: scale(1 }
                }

                acu-table-container {
                    position: relative !important;
                    margin: 15px 0 !portant;
                    pv(urgi-:rder) !important;
                    rs ant;
                    u acu-background) !
                    por
                    border-box !important
                    t se !important;
                    cocu-text)
                }
                .acucontainer.night
                    background: #2d2d2d !importt;

   6                 !im
                }
                .acu-e
                   background: var(--acu-primary) !important;
                ortant;
                     10px !important;
                     poinnt;
                    flex !im
                   -conteneeen !important;
c                    d !important;
                      !impo
                     s: 6p
x                    mily:YaHei', sans-serif !important;
                 xmtn;
                     bc2p
                 }saserf
                .acuainer.night-mode
 sr                0.2s   background: var(--acu-primary) !important;


}
.acu-i                   opacity: 0.9 !important;

                 0.9
.acuoi                   display: none !important;


.acuon                   padding: 5px !important;
               --acu-background) !im
 p
    as
     a
}
.acuarhd                   background: #2d2d2d !important;


.acuaa                   height: 60vh !important;
                !important;
                 ght:
2                    overflow: a
i                    border: 1px solid
                     dius!ant;
                    u
                     dgb (128,i128,r0.2)
                      0 !important;
                    0!个性化背景
                    i mportant;
                    t  se !important;
                    v!
                }
                .acu -table-containere-content-area {

          ,
            }
                .acut
                      0.9)     max-height: 60vh mportant;

    g2           tant;
                    ui
                }
                .acune-header {
                         display: flex !important;
                    justtween !iortant;
                  rtant;
                    p
                    rp
                    on
                }
                .aculn-tabs-title {
                          fontt;

    -            acu-text) !
                    SC', wgrift: 60;
                    :
                    colo!important;
                    n mportant;
                    import
                    :tmportant;
                    anmportant;
               }tex-lig:
                .acuaicu-tabs-title {


/* ==/
                      width: 32px !importa
               nt;
                    height: 24px !important;on: rortant;
               :x;
                  mr24mx;
                    cnimportant;
                    tp
                    s
                     m
                    !important
                     m
                     ont;
                    dwortant;
                    -webkit-or: transparent !important;
                }
                /* 锁定容器位置：取消由于 hover 或 active 引起
    的                 锁定容器位置：取消由于acu-mode-toggle.acu-moon-box:hover,
                  cle.acu-moon-box
               :act
              translateY 位移     transform: translate(0, 0) !impo }
                                    width: 14px !important;
                     height: 1
4                    -uortant;


               u#ortant; /* 精致香槟金 */
                    0p 241, 118, 0.4) !important;
                    elative
                  !
                    r05!important;
                    118,20.4)transition: all 0.6er(0.4, 0, 0.2, 1);
                    uto !important;
                    e !important;
                }0.2,1)

                     content: "" !important;
                        position: absolutcontent: !important;
                 !


                : 10t;
                    t tant;
                    o rimary) !important;
                    radiurtant;
                    r;
                    nsla
                    ion: transfoc-bezier(0.4, 0, 0.2, 1);
                    ;
                 }

                3;                .night-mode .acu-moon-orb {
                      background: #ff     box-sha
    dr
 }

       .nigumob
                     transform: translateX(-35%) !important;
                    0}5)
  缥缈流云：右侧对向滑入                .acu-moon-cloud {
               aolute !important;
                    width: 22pximportant;
                    pt22;x
              o
ient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.9) 100%) !important;
                 rportant;
                us: 10px !important;
                    %;
                    mo%,
                    i t;
                    100%)x55% : 10
                    o:ubic-bezier(0.4, 0, 0.2, 1) !important;
                    e vemportant;
                }
                .
acut                 1)night-mode .acu-moon-cloud {
                atiner-eves:
                :     0.7 !important::after
                }

            0.7* 太阳日冕动画：绝对中心锁定 */
                 content: "" !    position: absolut!important;
                     m
                     n


           h0
               t0nt;
                    -uortant;
                     s55, 241, 118, 0.6) !important;


               : r提，背
                   ng.6) border-box !important;
                     m:
                    ni提到最高层，穿透日间背景
                   e: transform, opacity
  so                }
                .acuop-co-y;le.acu-moon-box
 ,               2.5s infiniteacu-moon-orb {
                      overflow: visible !important;



      aa

                }.8


    100%
                    scale(2);
           a
     }              夜间模式：彻底隐藏日冕
  }


                * 增强版粒子特效
                 o   absolute !important;
                    width: 1.5px !portant;


                 und: ortant;


  r:

       :n
                    1
         #            3px
    }#fff,

                      .acu-p1acu-p1 { animation: acu-p-top 4s infinite linear; }
                      acu-p-lef
tse;                4s linear; .acu-p4 acu-p-right 6s
ila2}

        snin    imation-delay: 1.1 }.acu-p3 acu-p-left
                   0.5s; .acu-p6 acu-p-tl 4s in
fni5}              2s; .acu-p7 acu-p-br
                  1.5s; .acu-p8 acu-p-bl
    2.5s;
               3s; @keyfra { 0% { t
              rsa0:0; }                 @keyframes acu-p-bottom { 0% { transform: translate(0, 7px); opacity:0; } 20% { opacity:0.7; } 100% { transform: translate(0, 18px); opacity:0; } }
            t{%{:7px, 0); opacity:0} 20{ opacity:0x0

;}                 -180); o;0); opacity:0;.7
               % rr18 -); translate(17x, -12px); opacit.6y} }
             0 taanslate(-5p-18, -: translate712p0; } }
                  translate(18px,translate(15x, 125); }
                  translate(12px, 512x); translate(-15x,
-5
                d12
             color: #fffacu-twinkleff !important;

                4
                    ilw4e-heighs:infinite ease-in-out !important;

                    l
a;                    星尘g(随机错位布局): 1 !important;
                    e.atu-s!ir-dusp.s1rtant;
                    cnant;
                }
                /* 星*

             cs. { bottom: 3px !important; left: 3px !important; font-size: 3px !important; width: 3px !important; height: 3px !important; animation: acu-twinkle 4.7s infinite ease-in-out !important; animation-delay: 2.1s !important; }

   5!f4!w4!h4!aa5.9se1.2s  .acu-star-dust.s4 bottom:
  :x;:x;:x;:x;:e 7.1s 3.5s.acu-star-dust.s5 5.9s
    :x;:a%oneir:rtxease-7.1s

   }



                       0.8)  backgnd: var(--acu-primary) !important;
                p     ortant;


                  rtant;
                    :
              xm


                  ei', sans-serif !important;
                    i important;
                }
                .acuarader:hover {
                          t-1px) !important;
                }
                .acutainer.night-modegs-btn-header {


                         chm

    e
        -s
        :
        xm
              pti
                    yiei', sans-serif !important;


    i
    }
              .acuarhdr-edit-btn {


      .acuai
                     lateY(-1px) !important;
                }
      .acut-
                    portant;
              e
                -srtant;
                    : tant;

   xm
       pti
        yi
        i
               t
                  3;
                    x
                     ster;
                    margun-ntft:t: center;
                }mwdh36px
                 .acu eme-btn:hover {
                         opacity: 0.9 !important;
                   lateY(-1px) !importan
 t                }
                .acut btn {

               .acuan
                        g t
                    ortant;

    ic            ter !important;
                    pp
                }

.acutr


.acuon
                        psdvng rd6p-btn,x !impcrncalnt;
                p
                asx   ;
                     tnt;
                    xm

    i0            13mx;
                    yiei', sans-serif !important;

    a0
     }
           .acuarue    {
                         background: #5cb85c !important;
                p   ortant;
                }
                .acu-incel-order-btn {

                     solid var(--acu-bordnt;
                }
              .a
cucann

                    r!

            .acuner .tainer {
                     ant;
                    cnrt !important;
 -p                    0px !impo

 }
     .acuec
                      center;
                    eenter;

                 0
                    -wrap: wrap;
              }
                 .acutainer .acu-page-btn {
                     d var(--acu-bo
                     rer);

             nv
                 v-text);
                   us: 4px;
                   : pointer;
                    x
                      11px;t30hx;
                    :er;

                 :0.2s;
                 }.acupe-bthov

               .acuar-page-btn:hover {
                        background: var(--acu-primary);
                        cplg: bti
                    r);
                }
                .acuntive {
                        background: var(--acu-primary);
                     disbld
               r);
                e0.5 bold;
                }ntalwed
                .acuiacu-page-btn.disabled {

           w
             }
                .acucu-tab-btn {

           do
            -t
             :x!

  -p
   e3!
     rm
           :
               mo
                px,
               !t
                  :naimportant;
                }
                .acu-table-container.nmu-tab-btn {
                    n
   bo
  4                }
               .acuan.-tab-btn:hover {

                .acuainer.niu-tab-btn:hover {
                   background: #4a4a4a !important;

                .acuainer .tctive {
                     portant;
                    r: var(--acu-highlight;
               }
            .acu
na                   background: var(--acu-highlight) !important;
                h
            }
                .a
                          curs:a;

}
                .acucontainerer .acu-tab-btn {
                         border: 2px dashed var(--acu-pant;
                }

.acuca            iner.n
ir                       border-color: var(--acu-primary) !important;
                    }

.acuna

                .acuainer.niting-order .acu-tab-btn:hover {
                   background: #4a4a4a !important;

                .acuaction {

               .
acuon


.acuoe            .section-title
                    !

    -eit
           t5        18px
            gm

                      font-weight: 70
0m
                 transition: al
l3e                   !important;

                70.title {
                       i
                }
                  .acu-table-container .da
 tb                      margin-bottom: 20px !important;
                d     rgba(90,62,43,0.2)important;
                     4px
                  u  !important;


              }
                .acu-table-contnight-mode .data-table-wrapper {
                    auto;
            a
              }
                /* 行
                        curs move !important;
                        user-select: none !important;
                    :re !important;
                }move
                .acu-table-container.edi
tr              ata-table tbody tr:hover {
                     background-color: rgba(255, 165, 0, 0.1) !important;

                .acunng-ro
             wr  tbody tr {
                0.1)   cursor: default !important;
                }
                .acucontainbe tbody tr.dragging {
                         opacity: 0.5 !important;
                  (r
              no55, 215, 0, 0.3) !important;
                  abbing !impo
                }

.acuc.


.acu.edta
                         background-color: rgba(135, 206, 250, 0.2) !important;
                  sAortant;
                }
                .acu-table-contbody tr.drag-over {
                #87CEFA   background-color: rgba(135, 206, 250, 0.15) !important;


                0.15)                    width: 100% !important;
                 m
                  i1   min-width: 600px
 n                }600

  .acut           th
                      i#fpftf5


 !
     ln
     g d
       r
       o
      z1i
              a3ept
                }
                .acuarle th {

         n
      }
      .acund
                    ei
                    1lef9,43,0.2) !important;
                    c:

   ni
       rrspn
          ak
          1
                 color: var(--acu-text;
                    t0 ;
                }
                .acuner.data-table td {
                       4!a(54,54,
                    m
                }
                .acu-ele tr:nth-child(even) td {

                .acueght-mode
 al:                     background-color: rgba(58, 58, 58, 0.9) !important;


                .acu.  acu-editable
-   le                   background-color: rgba(180, 138, 92, 0.15) !important;


           .acunight-mode .acu-edi
                         b(132,
          .acu.e tr.
pnl             184,
                   b 100, 0.4) !importan
                200,
    m
       }      100,
          .acu-ee .data-table tr.pending-deletion td {
                #8b0000   background-color: rgba(139, 0, 0, 0.3) !important;
                ,!
               mportant;
           }

                    #ff9999     border: 2px solid #3D32 !important;
                   mportant;
            i:!n
                 #32CD32on: reli
                .acuhuefore {
                            position: absolute !importan
                    imp
          o

               i;
                    t t;
                    m   t;
                    on0 !important;
                    :-t;
                }-1
                .acuoamode .acu-highlight-user-edit {
                   background-color: rgba(76, 175, 80, 0.85) !important;
                 !ob(76,
                }

                          border: 2px solid 0a3e0 !important;
                    m portant;
                    i:
                    ona0p3e0ant;
                    !#15490
                }

.acuhc
                          position: absolute !importt;
                    io


    i;
         t
         m
       on
       :-
   }
   .acuoa                background-color: rgba(33, 150, 243, 0.85) !important;
                !ob(33,


                    #bbdefbacu-table-container .acu-save-db-btn-header {
                p    ortant;
                    et
                    -srtant;
                    : tant;
                    xm

  pti
         yi
             i
      }
        .acuarhd
-db-btn-header {
                     background: var(--acu-primary) !important;

                .acuabover {
                         background: #6fc86f !important;
                   lateY(-1px) !important;
               }
                .acut b-btn-header:hover {
                         background: var(--acu-highlight) !important;
                       disabld
                 .acu#ccccacabled {
                not-allowed   background: #cccccc !important;
                w
                    np

}            #666
    .acutr
                    }rfh
           .acuai337fb7h-btn-header {

              p
              et
                -srtant;
                    : tant;
                    xm
                   pti

  yi
      i
  }
          .acuarhdesh-btn-header {


      .acuab
                        ts1px) !important;
                }
                .acut h-btn-header:hover {
                         background: var(--acu-highlight) !important;
                        }mpysg

                40pxacu-table-container .empty-message {
                p
                    -ef!nm-sryle:ant;
             lt
                it
                     5, 0.7) !important;
                   i60.7)nt;

xt
       l3
   }

          .acuarhdssage {

          ,n
     }

                          backgroundwhite !important;
                    pi   -primary) !important;
                    ux;
                    d  nt;
                     p
                tant;
                  : 90v;
                    h idden
                     transition: allimportant;
             }


  .acunte
                        border-color: var(--a
 c                     2,0,0.4) !important;
                }
刷新按钮菜单（4项）-
                     rgba(255, 25    border: 1px solid rgba(0, 00, 0.12) !important;
                    ui
t
                    d
xg(01                   0.x )

    x!r;
                    h
                    -4filtlgbr(0,0,0,0.18)x);
                    a-220txr(8px);


              }
            .acu-cell-menu.acu-refresh-mode {
                         border-color: rgba(255, 255, 255, 0.14 rgba(34,)34,!important;
                        0r(0,140rtant;
             }
                .acuaesh-menu .acu-cell-me
                        border-rad
                    1!
                    xp
                    2
bp
 :k
   }
        .acuanmae   #2b2b2b nu-item {,

                .acum enu.acuu .acu-cell-menu-item:hover {
                }
                .a-u-refresh-menu.acu-cell-menu-item:hover {
                         background: rgba(255,255,255,0.07) !important;

                .acu-u-refresh-menu .acu-cm:active {
                    }
                .acu-cellefresh-menmenu-item.close {
                     }
                 padding: 12px !import;
                 }
                .autprdb-shortcut-layout .acu-layout{
                    gap: 12px !important;
                .acu-layout{}
                /* 只钮置*/
                auto-card-updater-popup.acu-db-shortcut-layout .acu-tabs-nav{
                   display: flex !import;


                 ortw
                    ir

      ea
          -u
      }

            .auttoshortcut-layout .acu-tab-button{
                   flex: 1 1 0 !important;
                    flex:

             f-ot !important;
                    ius: 1nt;
                    po

          xp
              pgpt;
                }
                 .auto-card-updater-popup
     .

                     d
                   isplay: grid;

               inmax(360px, 1fr);
                   x;
               }fr)
                @medh: 780px){
                            grid-template-col
              }

                    标记卡片：用 JS 打
            udpater-p-db-shortcut-layout #acu-tab-status .acu-sc-card-common{ grid-column: 1; grid-row: 2; }
                后做定位 #acu-tab-status .acu-sc-card-confi

             g  { grid-column; grid-ro
w3                }
                    .acu-sc-card-status{
    /
    fig{




                    :
                .autpopup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-status thead,
                auto-card-updater-popup.acu-db-shortcut-layout #acu-tab-status .acu-sc-card-status tbody tr{

                /pnmnl{
                  状态表：限制高度并可滚动，减少横向占用
                  .acu-sc-cart-bt-tusyotody{ b:ockf 240px;ixed;
                }  ead,
                .actr{u-cell; table-menu-it
                       important;
f0 !important;
                z
               pt;
                   yiei', sans-serif !important;
                    tion: baor 0.2s !important;
             }
              .a
cunee
                  t
               }
               .acumm


             .acu
mt

       .acuad
                     }
                .acumt
                         color: #626262 !impoant;
                .acumh-cell-menu-item.edit {
                   color: #ffffff !important;

                .acumm
                         color: #4a7ca8 !import
          a
           }
                .acumenu.nig-cell-menu-item.insert {
                   color: #87ceeb !important;

                .acumenu-ite
                   font-weight: 600 !important;
                    color: #cc0000 !importt;
                }

.acumh          #cc0000

                .acum enu-ite
                   font-weight: 600 !important;
                     color: #5cb85c !importa;
                }

.acumh

                .acum enu-ite
                   font-weight: 600 !important;
                  f0f0f0 !important;
                    !o

}
                .acumnacu-cell-menu-item.close {

          5
            }

                                    position: fixed !important;
                tnt;
                    ia
                    h rtant;

                t rtant;
                    ound:
          r
               : 9999
                    er
n                    ems: rtant;
                    cnimportant;

                xr
                    e!
                }


.acuad

                   .ac
ug                   background: white !important;
                s     lid var(--acu-highlight) !important;
                    ux;
                    d
                    pa
                    60tant;
                    i ghtrtant;
                    lm
                    i on: rtant;
                    :dnt;

                0.3s ent;
                }
             .ac
uaim.
                    htnt;
                     4  ,0,0.5) !important;
                }
             .acur{
                      important;
                    p
                    -s 0 !important;
                   gb!
                 xmtn;
                     m
  :                 }

  .acuaim.

                  .a
cun
           !
                -nt;
                }
                .acu -edit-texta

         0               21ix-acu-border) !important;
                    ux;
                    :p
                    nit;
                    ep  nhepiot;
                ant;
                  ;
                    sng: border-box !

    u            nd: whit;
                     ant;
                }
                .acuaixtarea {
                   background: #2d2d2d !important;
                r
                    1,tant;
                }
                .acutf
                         outline: none !important;
                          border-color: var(--u-highlight) !important;
                }
                .acu.-cus {


    .acu
                    p rtant;
                    c  onte-eed !important;
                1!rgippop:
                  podderg-top:0 !important;
                     m
                    ep
               }
             .ac
uaim.

                .acua-
                   padding: 8px 16px !important;
                      border: no
        n
        asx
                tnt;
                    xm
                    i0;
                    : important;
                     ci', sans-serif !important;
                    }
                .a
cuyt.t                   background-color: #4CAF50 !important;
                           color: white !important;

                ortant;
                    -srtant;

                : tant;
                     24,0,0.2) !important;
                  }
                .ac
ua:(ga                   background-color: #45a049 !important;
                    ,0,0.25) !important;
                    ateY(-1p
                }
                .aculay.night-mode .acu-save-btn {
                   background-color: #2E7D32 !important;
                #2E7D32
                    o
                }
                .acuvy .acu-save-btn:hover {

                .acu.night-ancel-btn {


             o
                 -
                 :
              24
           }
                ht-mode) .acu-cver {
                         b0) !important;
                    ateY(-1p
                }

.acul                background-color: #333 !important;


                }333
                .acuvatcccel-btn:hover {

          r
      }

                            font-weight: bold !important;

}
    .acun-
                     }
               .acucu
                   color: #626262 !important;

                .acu-gu-cell-menu-item {

                                .acu-table-container .acu-save-db-btn-header.has-pending-deletes {
                 background: #
e                portant;
                    acu-pulsite;
                }


            .acutht-mo
     d                   background: #c0392b !important;


                                 .acu-settings-overlay {
                     position:     top: 0 !important
 ;
      ia
          h
          t
                or, 0.5) !important;
                    :0;


         ern
                eetant;
                   cn10010important;
                    xr
                     e!

            }
                .acuvt

   background: rgba(0, 0, 0, 0.7) !important;
                }

  .acui
                         border: 2px solivar(--acu-highlight) !important;
                    u
                    d ;
                    pn
                    80i  mpor
                    i:rtant;
                    lm
                    o00mxrtant;
                    :dnt;
                     ant;
                    r-rtant;

}
                .acunt   settings-dialog {
                   border-color: var(--acu-highlight) !important;
                (
                }
                .acued
                          color: white !imrtant;
                    p
                    yx;
                    cn !important;
                    ecrtant;
                    pp
                     o
                }
                .acua
                      mrtant;
                portant;
                  ei', sans-serif !important;
                }
                .acu o
                   background: transparent !important;
                     border: none !iortant;
                    e;
                    z0nt;
                     :tnt;
                    xp
                     m
                    yet;
                 t
              cn
              s!
                gcimportant;
                }
               .acul
                    }
               .acua
                   display: flex !important;
                    background: va--acu-secondary) !important;
                    o:var(--acu-border) !important;
                    :
              }
                .acub{
                          padding: 12px5px !important;
                    rurent !important;
                   n!r
                    -!
                    z3nt;
                    :t
                    yiei', sans-serif !important;
                     i important;

             mdar
                 }

         .acuhr
                         background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.1) !important;
                      }
                .acua b.active {

                   background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.15) !important;
                    color: var(--acu-priry) !important;
                    o
ot
 ea                }

.acun                    flex-grow: 1 !important;
                         overflow-y: auto mportant;
                    0x;
                .acus-
                      }bacive {
                       }

.acuse
                        border-top: 1px lid var(--acu-border) !important;


   t:en                   rtant;
                    i
                    vc) !important;
                }
           .acut.ttigs-sus   font-size: 12px !important;
                -ext) !important;
                    .m
                    tant;
               }
               .
acutsc{
                          opacity: 1 !important;

      }
                .acuss {
                   color: var(--acu-danger) !important;
                     opacity: 1 !important;
                }
                .acuss      opacity: 1 !important
                }
                .acusb
                          gap: 10px !importt;
                }
                .acu
                   padding: 8px 16px !important;
                    bord: none !important;
                    as;
                     tnt;
                    xm
                    i0  ;

    yi           ei', sans-serif !important;
                    a0mportant;
                    im
;
             :n!r
                    ctnt;
                    p;

           }
                .acu-m
                         background: var(--acu-primary) !important;
                    color: white

}
.acur:                   opacity: 0.9 !important;
                    transform: translaY(-1px) !important;
           }
                 .acud
                          color: var(--a-text) !important;
                     ent;
                }
                    .a
cucav                   background: rgba(var(--acu-primary-rgb, 140, 110, 84), 0.1) !important;
                     }
              .acu
                         color: whit!important;
                }
                .acuah
                         transform: transleY(-1px) !important;

}
     .acul
                         cursor: not-aowed !important;

    mo           nt;
                }
                /* 存
                acu-storage-info {
                  displ flex !important;
                         flex-directio column !important;
                    xp
                }
                   background: var(--acu-secondary) !important;
                    border-radius: 8 !important;
                    p

               lvrder) !important;
                }
              .acuemh
                h4   margin-top: 0 !important;
               5 important;
                    1pt;
                    cxnt;
               }

    .acug
                        background: ba(0, 0, 0, 0.1) !important;
                    rsortant;
              im
rn

      }
      .acui
                          background: linea
               rgradient(90deg, var(--acu-primary), var(--acu-highlight)) !important;

        rs
         t          ant;
                }
                .acuats {
                   display: flex !important;
                    justify-conten space-between !important;
                    ept;
                    -a
                }
.acug{                   font-weight: bold !important;


.acu                   color: var(--acu-success) !important;
                    }样
                      back
   g                    border: 1px lid var(--acu-warning) !important;
                   us: 8px !important;
             7),
             :pp
                    !o
                    vat(--cu-waring)
                    efimportant;
                }

.acun
                         flex-shrink: !important;
                }
                .acutn
                     }
          .acuot{

              !a
              y;
               t5nt;
                }
            .acu
n                    margin: 5px 0 !important;
                !ortant;
                    ihnt;
                    (u
                .acui
                          font-weight: bold mportant;
                    ent;
                }
                /* 清 理选项样式 */
                acu-cleanup-options {
                  backgnd: var(--acu-secondary) !important;
                         border-radius: 8 !important;
                    p

    lv
     }
     .acupth
                     margin-top: 0 !important;
                5     important;
                    1pt;
                    cxnt;
                }

.acun
                          flex-directio column !important;
                    xp
                }
                .acuc
                    flex-direion: column !important;

                     t
                }
                .acuo[box"] {
                   margin-right: 8px !important;

                .-checkbox spa
                       !important;
                    (uortant;
                }
                .acub
                   font-size: 11px !important;
                 r(--ac
u                    .7 !i
                    -o
                }
                .acuoe
                   opacity: 0.7 !important;
                 }
                .acuxot[type="checkbox"] {


          .acut
                    margin-top: 20px !important;
                        padding-top: 15px !portant;
                     d-acu-border) !important;
                }
              .acusi
                   margin-top: 0 !important;
                  !iortant;
                    1pt;

                cxnt;
                    .m
                }
                /* 清
                acu-cleanup-actions {
                  displ
   a                    gap: 10px !impornt;
                    cn !important;
                    iportant;
                }
              /*
 外
                     displ     flex-direction: col
     u
          xp
          }
          .acuml
                    display: grid !important;
                        grid-template-c
o                    x!eaea;(uo-fill,
                  r

}
    .acuo           .acu-theme-option
                     :8px !important;
                    :p
                    rm
                    ol !important;

    :i
        i mm
                    ecrtant;
                    t
                }
                .acump{
                   border-color: var(--acu-primary) !important;
                    transform: translat(-2px) !important;
                }
                .acuion.active {
                         background: rgba(var-acu-highlight-rgb, 180, 138, 92), 0.1) !important;
                }

.acuo           n input {
                 92),   display: none !important;

                .acuc
                     }

.acue
                         font-weight600 !important;
                    (uortant;
                }
                .acu-    margin-botto
mx                    ex;
                    0i
                    (uortant;
                }
                .acur
                    flex-directio column !important;

                }
                .acudg
                   font-size: 13px !important;
               6iportant;
                    (uortant;
                .acurp{
                   width: 100% !important;
                 important;
                    o econdary) !important;

               ruortant;
                    n

               a:rtant;
                }
                 .acu-slider-group input
    [=                   -webkit-appearance: none !important;
               important;
                t
                    o rimary) !important;
                    rsrtant;
                    n
                }
                /* 高/
                acu-advanced-options {

    a               高级选项样式     flex-direction: cumn !important;
                    xp
                }

.acurd
                        border-radius: 8 !important;
                    p
                    lvrder) !important;
              }

  .acueth
                    5 important;
                    1pt;
                    cxnt;
                }
                .acug
                   display: flex !important;
                     flex-directioncolumn !important;
                    xp
                }
                .acurs
                        margin-bottom: 8px mportant;
                    1pt;
                    ceant;

    .m
    }
         .acu-m
                         justify-conte: space-between !important;
                    ecrtant;

               x
                    r5 0.1) !important;
                    as;
                    om
a                }

.acuci
                     }
                .acu-storage-ite
mee                     border-left: 3px solid var(--acu-warning) !important;
                    }

.acumm
                          color: var(--acu-tt) !important;
                }
                .acug
                   font-size: 11px !important;
                     font-weight: bold mportant;
                    (uortant;
                     o
                }
                .acudt
                         gap: 10px !importt;

    cn
         ip
     }
     /* 确
                      positio    top: 0 !importan
                    ia
                    h rtant;
                    t rtant;

    or
         :0
       ern
                ems: ctant;
                    cn


                }
                .acua
                   background: var(--acu-background) !important;
                     border: 2px sol var(--acu-danger) !important;
                    u
                    d
x0
      pn
      50it
               ylnt;
                    tcrtant;
                    :dnt;
                   u 500px
                }

            .acur
                    background: var(--acu-danger) !important;
                          color: white !iortant;
                    p;
                    -s 0 !important;
               }
                .acur

           m
          ih
      }
      .acut{
                         flex-grow: 1 !imrtant;
                }

.acuit
                         padding-left:0px !important;
                } -cleanup-list
                      mportant;
                    cltant;
                }
                .acur
                         padding-top: 15pximportant;
                     sacu-border) !important;
                    cr;
                }

.acuep
                     irtant;
                    ihportant;
                    (u ortant;
                }
             .ac
                      display: flex !iortant;
                    xp
                    cn !important;
                    ep var(--acu-border) !important;

    -o
     }
                    适
                acu-settings-overlay.night-mode .acu-settings-dialog {

   c                  kground: #d2d !important;


}
    .acunl

                .acuva-tabs {
                   background: #3a3a3a !important;
               m
                }
                .acugotings-tab {


       }

.acunl                   background: #3a3a3a !important;
                    r
                }
                .acu.twarning-box {
                   background: rgba(212, 161, 92, 0.15) !important;
               i
                 }

.acuru                   background: rgba(255, 255, 255, 0.05) !important;

                 .acuvhd
c-                  0.05)

                    r!
                }


               nfixed !important;
                历史记录弹窗样式     top: 0 !importan
                    ia

    h
        t
        or
        :5
              ern
                    e    ms: ctant;
                    cnimportant;


                }
                .acue-
                   background: rgba(0, 0, 0, 0.7) !important;
                  }
                .acua
                          border: 2px sol var(--acu-highlight) !important;

    u
        d x)
       pn
             70it
                    i:rtant;
                    lm
                    ic700mxrtant;


    :d           80vh
         u
                }
                .acur
                         background: var(--acu-primary) !important;
                        color: white !i
m                     ortant;
                    p
                    yx;
                    cn
p                      !important;
                    ecrtant;
                    pp
                     o

        }

          .acudr
                    margin: 0 !important;
                         font-sizeclosp
                       mortant;
                    ihportant;
                   }
                .acus
                         background: transparent !important;
                     iportant;
                    e;
                    z0nt;
                    :tnt;
                    xp

                 .ahe-higthty-close:h0v!n
                    yet;
                    t ortant;
                    cn.acu-h:steny-conter important;
                    s!
                    gcimportant;
                }
                 .acu.icu-hitr-vy-i f

                   background: rgba(255, 255, 255, 0.2) !important;

                   .ac
un                   flex-grow: 1 !important;
                          overflow-lisoimportant;

    0x
     }
     .acu-
                         justify-cotem: space-between !important;
                    o:rtant;
                    !
                    cxnt;
                    .m
                }
                .acu-t
                         display: flex !important;
                          flex-diretoem:hover column !important;
                    xp

}
                .acuti   rslaeX(4px)
                   background: var(--acu-secondary) !important;
                     border: 1px s-headerid var(--acu-border) !important;
                    u
                    :p
p

    rm
                    ol !important;
                }
                .acuhgbi(vmr(--cu-bder-rgb, 212, 196,
                    168),   background: rgba(var(--acu-highlight-rgb, 180, 138, 92), 0.15) !important;
                         border-color:-numb(-cu-highlight) !important;
                    t

    }
                .acut

          c
         ec
               p
                    o
                       .ocu-histo y-irem-dgaevar(--acu-border-rgb, 212, 196, 168), 0.5) !important;
                }
                .acune
                   font-size: 11px !important;
                         font-weight: bcoot!nt
          m
               (uimportant;
                    rv1.6imary-rgb, 140, 110, 84), 0.1) !important;
                    gp2e wiop
                     n

           u

               }
                .acud
                         font-size: 11px !important;
                         color: vafoo-tr
                           et) !important;

               .m
                }
                .acu-m
                         font-size: 13px !important;
                           color: vahrxt
)                    t6;
                    r!

                -夜间模式适配增强tant;
                    :p
                    ao
                    xo

                (55, 0.5) !important;
                    asrtant;

             }
                .acur
                         padding: 15px 20px !important;

                 o
                t:en
                    ec   rtant;
                    i

    vc           ) !important;
                }
                .acun
                         font-size: 12px !important;
                a     u-text) !important;
                    .m
                }

                * 夜间模式适配增强 */
                设置面板 -                .acu-history-overlay.night-mode .acu-history-dialog {
                     bac完整kg: #2d2d2d !important;

            }
            .acu

ra                   background: #3a3a3a !important;
                o
                }
                .acun-istory-item {
                   background: #3a3a3a !important;
                n
                }
                .aculicu-history-item:hover {
                   background: #4a4a4a !important;

                .acuegu-history-info {
                         color: #dbdbd6 !important;



          .acurae .acu-history-item-date {
                     color: #dbdbd6 !important;


            .acurae .acu-history-item-content {
                         color: #dbdbd6 !important;
                    ncl b0up-opt,,ns,
                .2) !iortaagetsumary,
                }
                .acueg-dcint {
                   color: #dbdbd6 !important;


                * 设置面板 - 夜间模式完整适配 */
                .acu-settings-overlay.night-mode .acu-settings-dialog {
                 krd2d !important;
                p,
                }
                .acunlde .acu-settings-header {
                   background: var(--acu-primary) !important;

              .acuvah4,-tabs {
                   background: #3a3a3a !important;
                mh5,
                }
                .acugotings-tab {
                   color: #dbdbd6 !important;
                8t
              }s,
                .acuvhdctover {
                   background: rgba(132, 121, 184, 0.2) !important;
                }e-stas,oraeiem-nm,
                .acuvhdctr {
                   background: #3a3a3a !important;
                r
                }

                acu-settings-overlay.night-mode .acu-cleanup-options,
                .acu-settings-overlay.night-mode .acu-storage-summary,
                 {
                n
                t
                }

                acu-settings-overlay.night-mode .acu-warning-box {
                    background: rgba(212, 161, 92, 0.15) !important;
                修复确认对话框的夜间模式     bco-firmlor: var(--acu-warn
                }
                .acuruntent p,
                acu-settings-overlay.night-mode .acu-warning-content strong {
                  o


                collapseacu-settings-overlay.night-mode .acu-cleanup-options h4,
                .acu-settings-overlay.night-mode .acu-storage-summary h4,
                visible absotgte
                 nh5 {

                 fx
elive
                acu-settings-overlay.night-mode .acu-checkbox span,
                .acu-settings-overlay.night-mode .acu-checkbox small {

                b
fex
                acu-settings-overlay.night-mode .acu-storage-stats,
                .acu-settings-overlay.night-mode .acu-storage-item-name,
                 ize {



                acu-settings-overlay.night-mode .acu-storage-item {
                    background: rgba(255, 255, 255, 0.05) !important;


                acu-settings-overlay.night-mode .acu-btn-secondary {
                    background: #3a3a3a !important;

                    r!
                }

                * 修复确认对话框的夜间模式 */
                .acu-confirm-overlay.night-mode .acu-confirm-dialog {
                  d2d2d !important;
                gdpd rid;
                }
                .acurainl.me-flexe .acu-cleanup-list li,
                transformacu-confirm-overlay.night-mode .acu-confirm-question p {
                 it li   odbd6im
                ese
        `;
ease-out
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
          align-items: cen
          justify-content: center;
        }
        .acu-shortcut-lite-overlay.night-mode{ background: rgba(0,0,0,0.55); }

        /* 弹窗主体 - 窄面板 */
        .acu-shortcut-lite-dialog{
          width: min(420px, 94vw);
           80vh;
          background: var(--acu-background, #fafafa);
          color: var(--acu-text, #333);
          border: 1px solid var(--acu-border, #ddd);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          :en;
          display: flex;
         flex-direction: column;
        }
        .a-lite-overlay.night-mode .acu-shortcut-lite-dialog{
          ound: #2d2d2d;
          color: #dbdbd6;
          r 4;
         box-shadow: 0 8px 40px rgba(0,0,0,0.45);
        }

        /* 头部 */
        .acte-header{
          x
          ter;
          justify-content: space-between;
          px 14px;
          ound: var(--acu-primary, #5c9dff);

         border-radius: 6px 6px 0 0;

        .a--mode .acu-shortcut-lite-header{
         background: var(--acu-primary, #8479b8);
        }
        .acu-shortcut-lite-title{
          font-size: 13px;
          font-weight: 600;
         letter-spacing: .3px;
        }
        .atcut-lite-close{
          e;
          orgba(255,255,255,0.18);
           #fff;
          width:

          border-radius: 4px;
          i
          font-size: 1
          line-height
          text-align: center;
         transition: background .15s;
        }
        .acu-shortcut-lite-close:hover{ background: rgba(255,255,255,0.32); }

        /* 内容区 */
        .acut-lite-body{
          16px 18px 20px;
          :;

          flextion: column;
         gap: 14px;
        }

        /* 信息行 */
        .at-lite-info{
          1
          l
          color: var(--acu-text, #444);
         opacity: .88;
        }
        .aro
          -primary, #5c9dff);
         font-weight: 600;
        }

        /* 2x2 网格布局 */
        .acut-lite-config-grid{
          display: grid;
          -template-columns: repeat(2, 1fr);
         gap: 10px;
        }
        .acte-field{

          -ction: column;

         text-align: center;
        }
        .at-lite-field label{
          e: 11px;
          y: .75;
         color: inherit; /* 修复 Label 对比度 */

        rtant 强制覆盖 */
        .artcut-lite-field input{
          00%;
          2px;
          radius
          rder: 1.5px id var(--acu-primary, #5c9dff);
          底黑字 */
          ound: #ftant;
          3important;
          3px;
          font-weight: 500;
           box;
           er;
           0 1px 4px rgba(0,0,0,0.08);
         transition: border-color .15s, box-shadow .15s;

        .acu-shortte-field input:focus{
          ;
          r a(--acu-primary, #5c9dff);
           p57,255,0.18);
         background: #ffffff !important;
        }


        .aiohortcut-lite-field input{
          r: var(-, #8479b8);
          ound: #2tant;
          00mtant;
         box-shadow: 0 1px 4px rgba(0,0,0,0.2);

        .a-ieolay.night-mode .acu-shortcut-lite-field input:focus{
           p121,184,0.25);
         background: #333333 !important;
        }

        /* 按钮组（纵向居中） */
        .acte-btns{

          omn;
          nms: center;
          gap: 8px;
         margin-top: 4px;
        }
        .arlite-btn{
          width: 100%;
          h20px;
          6
          rux
           r, #bbb);
          obund, #fff);
          v-text, #333);
          t
          t;
          1

         transition: background .12s, border-color .12s, transform .1s;

       .aite-overlay.night-mode .acu-shortcut-lite-btn{
         r: #555;
  o         color: #dbdbd6;
        }

       .a-lite-btn:hover{
         background: var(--acu-secondary, #e8ecf0);

       .a-lite-ove background: #454545;
        }
      .acu-shortcu
         t-lite-btn:active{
         transform: scale(0.97);
        }
 /* 可视化按钮：更大、渐变色、醒目 */

       .at-lite-btn.accent{
         h: 26
          2px;
          3
          i600;

          s: 6px;
          olinear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
          ;
           x 10px rgba(255,126,95,0.35);
         margin-top: 6px;

        .a-.acu-shot-lite-ent{
           irient(135deg, #e85d40 0%, #f09b5c 100%);
        }
        cu-shor
t         cut-lite-btn.accent:hover{
          gt(1.06);
         box-shadow: 0 4px 14px rgba(255,126,95,0.45);

        .a-ioy.night-mode .acu-shortcut-lite-btn.accent:hover{
         box-shadow: 0 4px 16px rgba(232,93,64,0.5);
        }
/* ===== 选择更新表区域 ===== */

.a-        -table-selector{
          ox;
          :p
          lar(--acu-border, #ddd);
          u
         background: var(--acu-secondary, #f0f4f8);

        .alite-overlay.night-mode .acu-shortcut-lite-table-selector{
          3;
        }
        te-table-selector-header{

          ece-between;
           align-items: c
            margin-bottom: 10px;
        }

.at
  2
  e         color: var(--acu-text, #333);
        }

.ac
  l         gap: 6px;
        }

        .aclable-selector-actions button{
          px;
          z1
          lar(--acu-border, #bbb);
          u
          obund, #fff);
          v-text, #333);
         n
         transition: background .12s;

        .a-rlay.night-mode .acu-shortcut-lite-table-selector-actions button{
          3;
          -555;
         color: #dbdbd6;

        .a-atton:hover{
         background: var(--acu-secondary, #e8ecf0);

.a-         background: #454545;
        }

        .acte-table-grid{

          -late-columns: repeat(auto-fill, minmax(130px, 1fr));
          max-height:
           overflow-y: au
  t         padding-right: 4px;
        }

.ar         width: 5px;
        }

       .a-lite-table-g background: transparent;
        }

       .a-lite-table-grid::-webkit-scrollbar-thumb{
         ba(12 border-radius: 3px;
        }

        .acte-table-item{
          x
          nms: center;
          ;
          :x
          lar(--acu-border, #ddd);
          u
          u--acu-background, #fff);
          n
         transition: background .12s, border-color .12s;

        .a-rlay.night-mode .acu-shortcut-lite-table-item{
          3;
        }

.a-r         background: var(--acu-secondary, #e8ecf0);

        .
a-          background: #454545;
        }

.aic
          r var(--acu-primary, #5c9dff);
         background: rgba(92, 157, 255, 0.1);

        .a-rnmode .acu-shortcut-lite-table-item.selected{
        }

        .arlite-table-item input[type="checkbox"]{
          1height: 14px;

c          cursor: poin
  t         flex-shrink: 0;
        }
     .at-table-item-name{

i          color: var(-t, #333);
          nspraprap;
           overflow: hidd
         en; text-
 o        1; flex: 1;
        }

        .a--tables{
          :er;
         i
         ar(--acu-text, #666);

         padding: 10px;
        }

        ===== 主题适配 ===== */ /* [优化] 为所有主题显式定义输入框颜色，确保高对比度 */
      .acu-shortcut-li
t         #8c6e54; --acu-primary: #
8         #f5ebdc; --acu-secondary:
#         #fdfaf5; --acu-backg
r         #5a3e2b; --acu-text: #
5         #d4c4a8; --acu-border: #
d         #ffffff; --acu-input-bg: #
  f         --acu-input-text: #5a3e2b;
        }

       .a-shortcut-lite-overlayu-theme-dark{
         的主题其实是浅紫风格 */
         8479b8;
         #f0ebff;
         round: #f8f5ff;
         5a4f7c;
          d
          f
        }

.at       e-overlay.acu-theme-modern{
          c9dff;
          #
          r #ffffff;
          44;
          d
          fffff;
        }

.at       e-overlay.acu-theme-forest{
          a8c5c;
          #
          ound: #ffffff;
          a6b4a;
          b
          fffff;
        }

.at       e-overlay.acu-theme-ocean{
          a7ca8;
          #
          ound: #ffffff;
          a6c98;
          b
         ffffff;
         --acu-input-text: #2b5070;
        }


        .a-night-mode{
          #
          rd2d2d;
          d;
         444;
         2b2b2b; --acu-input-text: #e0
          e
         --acu-input-bg-focus: #333333;
        /* 夜间模式下保持各主题的 primary 色 */
        .acu-shortcut-lite-overlay.night-mode.acu-theme-retro
       {: #a88468 .acu-shortcut-lite-overlay.night-mode.acu-theme-dark{ -
       -9d94cc; } .acu-shortcut-lite-overlay.night-mode.acu-theme-modern{
         #6aa8ff; .acu-shortcut-lite-overlay.night-mode.acu-theme-forest
       {: #5a9c6c   .acu-s
      transformhortcut-lite-overlay.night-mode.acu-theme-ocean{ --acu-primary: #5a8cb8; }
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
  cons

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

  // 【核心修复 V8.98】保存函数 - 优先使用精准 API 并支持后备机制
  const saveDataToDatabase = async (tableData, updateContext = null) => {
    if (isSaving) return false;

    // 使用控制器包裹保存过程
    return await UpdateController.runSilently(async () => {
      isSaving = true;
      const { getDB } = getCore();
      const api = getDB();
      let saveSuccessful = false;
      let usedMethod = 'none';

      try {
        // --- 方案 1: 优先尝试精准 API (内存开销最小，且维护数据库计数器) ---
        if (api) {
          try {
            // A. 处理单单元格更新 (如果提供了上下文)
            if (updateContext && updateContext.type === 'cell_edit') {
              const { tableName, rowIndex, colIndex, newValue } = updateContext;
              console.log(`[ACU-API] 尝试精准更新单元格: ${tableName}[${rowIndex}, ${colIndex}]`);

              // API 的 rowIndex 从 1 开始 (数据第一行)
              const success = await api.updateCell(tableName, rowIndex + 1, colIndex, newValue);
              if (success) {
                saveSuccessful = true;
                usedMethod = 'api_updateCell';
              }
            }

            // B. 处理行删除
            if (!saveSuccessful && pendingDeletes.size > 0) {
              let allDeletesSuccess = true;

              for (const tableName of Object.keys(deletions)) {
                // 必须从后往前删以保持索引稳定
                const sortedIndices = deletions[tableName].map(i => parseInt(i)).sort((a, b) => b - a);
                for (const rowIndex of sortedIndices) {
                  const success = await api.deleteRow(tableName, rowIndex + 1);
                  if (!success) allDeletesSuccess = false;
                }
              }

              if (allDeletesSuccess) {
                saveSuccessful = true;
                usedMethod = 'api_deleteRow';
              }
            }

            // C. 处理用户编辑的行 (基于 currentUserEditMap)
            if (!saveSuccessful && currentUserEditMap.size > 0) {
              const affectedRows = {};

              currentUserEditMap.forEach(key => {
                const match = key.match(/(.+)-(\d+)-(\d+)/);
                if (match) {
                  const [_, tableName, rowIndex, colIndex] = match;
                  if (!affectedRows[tableName]) affectedRows[tableName] = new Set();
                  affectedRows[tableName].add(parseInt(rowIndex));
                }
              });

              let allUpdatesSuccess = true;
              for (const tableName of Object.keys(affectedRows)) {
                const sheet = Object.values(tableData).find(s => s?.name === tableName);
                if (!sheet || !sheet.content) continue;

                const headers = sheet.content[0] || [];
                for (const rowIndex of affectedRows[tableName]) {
                  const rowData = sheet.content[rowIndex + 1];
                  if (!rowData) continue;

                  const updateObj = {};
                  headers.forEach((header, colIdx) => {
                    if (header) updateObj[header] = rowData[colIdx];
                  });

                  const success = await api.updateRow(tableName, rowIndex + 1, updateObj);
                  if (!success) allUpdatesSuccess = false;
                }
              }

              if (allUpdatesSuccess) {
                saveSuccessful = true;
                usedMethod = 'api_updateRow';
              }
            }
          } catch (apiErr) {
            console.warn('[ACU-API] 精准 API 调用失败，将尝试备选方案:', apiErr);
          }
        }

        // --- 方案 2: API 批量后备 (如果精准 API 失败或不适用) ---
        if (!saveSuccessful && api && api.importTableAsJson) {
          try {
            const apiSuccess = await api.importTableAsJson(JSON.stringify(tableData));
            if (apiSuccess) {
              saveSuccessful = true;
              usedMethod = 'api_bulk';
            }
          } catch (bulkErr) {
            console.warn('[ACU-API] 批量 API 更新失败:', bulkErr);
          }
        }

        // --- 方案 3: 最终手动注入后备 (ST.chat 直接注入) ---
        if (!saveSuccessful) {
          console.warn('[ACU-SAVE] 所有 API 方案均不可用或失败，退回到手动注入模式...');

          // 执行原有的删除逻辑以确保 tableData 同步
          const deletions = getPendingDeletions();
          Object.keys(deletions).forEach(tableName => {
            for (const sheetId in tableData) {
              if (sheetId === 'mate') continue;
              const sheet = tableData[sheetId];
              if (sheet?.name === tableName && sheet.content) {
                const indexesToDelete = deletions[tableName].map(i => parseInt(i)).sort((a, b) => b - a);
                indexesToDelete.forEach(rowIndex => {
                  const actualRowIndex = rowIndex + 1;
                  if (sheet.content[actualRowIndex]) sheet.content.splice(actualRowIndex, 1);
                });
                break;
              }
            }
          });

          // 执行直接注入
          try {
            let ST = window.SillyTavern || (window.parent ? window.parent.SillyTavern : null);
            if (!ST && window.top && window.top.SillyTavern) ST = window.top.SillyTavern;

            let isolationKey = getDataIsolationCode();

            if (ST && ST.chat && ST.chat.length > 0) {
              let targetMsg = null;
              for (let i = ST.chat.length - 1; i >= 0; i--) {
                if (!ST.chat[i].is_user) {
                  targetMsg = ST.chat[i];
                  break;
                }
            cons}

              if (targetMsg) {
                if (!targetMsg.TavernDB_ACU_IsolatedData) targetMsg.TavernDB_ACU_IsolatedData = {};
                if (!targetMsg.TavernDB_ACU_IsolatedData[isolationKey]) {
                  targetMsg.TavernDB_ACU_IsolatedData[isolationKey] = {
                    independentData: {},
                    modifiedKeys: [],
                    updateGroupKeys: [],
                  };
                }

                const tagData = targetMsg.TavernDB_ACU_IsolatedData[isolationKey];
                const sheetsToSave = Object.keys(tableData).filter(k => k.startsWith('sheet_'));
                sheetsToSave.forEach(k => {
                  tagData.independentData[k] = JSON.parse(JSON.stringify(tableData[k]));
                });
                tagData.modifiedKeys = [...new Set([...(tagData.modifiedKeys || []), ...sheetsToSave])];

                if (ST.saveChat) {
                  await ST.saveChat();
                  saveSuccessful = true;
                  usedMethod = 'manual_injection';
                }
              }
            }
          } catch (manualErr) {
            console.error('[ACU-SAVE] 手动注入失败:', manualErr);
          }
        }

        // --- 保存后的清理与反馈 ---
        if (saveSuccessful) {
          console.log(`[ACU-SAVE] 保存流程完成。方法: ${usedMethod}`);

          pendingDeletes.clear();
          savePendingDeletions({});
          currentUserEditMap.clear(); // 保存成功后清理编辑标记

          if (typeof generateDataHash === 'function') lastTableDataHash = generateDataHash(tableData);

          showNotification(`保存成功！(${usedMethod})`, 'success');

          setTimeout(() => {
            const { $ } = getCore();
            if (typeof $ !== 'undefined') $('.pending-deletion').removeClass('pending-deletion');

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
          alert('保存失败：尝试了所有保存方案均告失败。请检查控制台日志 (F12)。');
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
                    <span><i class="fas fa-table" style="margin-right: 8px; opacity: 0.8;"></i>数据表格 ${tables ? '(' + orderedTableNames.length + '个表格)' : ''} <span style="font-size: 0.8em;">v9.51 [标识：${getDataIsolationCode() || '无'}]</span></span>
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
    consoriginalOrder.push($(this).clone(true));
    });

    $tabs.attr('draggable', 'true');

    // 使用事件委托绑定事件，避免重复绑定和性能损耗
    $tabsContainer.off('.acu-drag');

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
    cons    <div class="acu-cell-menu-item close" data-action="close">❌ 关闭菜单</div>
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
    cons<div class="acu-cell-menu ${isNightMode ? 'night-mode' : ''}">
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

    const $latestAIMessage = $('.mes:not(.sys):not(.user)').last();

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
      const observeconsMessages = () => {
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
