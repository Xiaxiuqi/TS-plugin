// ACU Visualizer 测试版运行态状态模块
// 来源：public/acu_visualizer/acu_visualizer-test.js lines 108-167 以及相关运行态集合。
// 迁移原则：只建立与原脚本一致的状态容器，不改变行为，不做内存优化。

export const createInitialState = () => ({
  flags: {
    isInitialized: false,
    isSaving: false,
    isEditingOrder: false,
    isEditingRowOrder: false,
    isFirstRender: true,
    isCellEditing: false,
    isRefreshing: false,
    isSearchVisible: false,
    tablePositionUpdateQueued: false,
  },

  scroll: {
    currentTableScrollTop: 0,
  },

  hashes: {
    lastTableDataHash: '',
    lastAIMessageId: '',
  },

  search: {
    currentSearchTerm: '',
  },

  drag: {
    dragStartIndex: -1,
    dragEndIndex: -1,
    dragInsertIndex: -1,
    isDragging: false,
  },

  currentPagination: {},
  currentDiffMap: new Set(),
  currentUserEditMap: new Set(),
  pendingDeletes: new Set(),
  rowPositionMapping: {},
});

export const state = createInitialState();

export const UpdateController = {
  _suppressNext: false,

  runSilently: async action => {
    UpdateController._suppressNext = true;
    try {
      return await action();
    } finally {
      setTimeout(() => {
        UpdateController._suppressNext = false;
      }, 2000);
    }
  },

  handleUpdate: ({ smartUpdateTable, insertTableAfterLatestAIMessage } = {}) => {
    if (UpdateController._suppressNext) {
      return;
    }

    if (typeof smartUpdateTable === 'function') {
      setTimeout(() => smartUpdateTable(), 100);
    } else if (typeof insertTableAfterLatestAIMessage === 'function') {
      insertTableAfterLatestAIMessage();
    }
  },
};

export const getPendingDeletions = (pendingDeletesSet = state.pendingDeletes) => {
  const deletions = {};
  pendingDeletesSet.forEach(key => {
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

export const savePendingDeletions = (deletions, pendingDeletesSet = state.pendingDeletes) => {
  pendingDeletesSet.clear();
  Object.keys(deletions || {}).forEach(tableName => {
    deletions[tableName].forEach(rowIndex => {
      pendingDeletesSet.add(`${tableName}-row-${rowIndex}`);
    });
  });
};
