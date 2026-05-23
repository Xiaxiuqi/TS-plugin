// ACU Visualizer 测试版运行态状态清理模块
// 来源：L2 常驻内存下降计划中的状态缓存清理 helper。
// 迁移原则：只清理测试版运行态中过期的 Set/Map/Object key，不清理 localStorage，不修改持久用户数据。

const CELL_KEY_RE = /^(.+)-(\d+)-(\d+)$/;
const ROW_KEY_RE = /^(.+)-row-(\d+)$/;
const PAGE_SIZE = 20;

export function parseRuntimeStateKey(key) {
  const text = String(key || '');
  const rowMatch = text.match(ROW_KEY_RE);
  if (rowMatch) {
    return {
      type: 'row',
      tableName: rowMatch[1],
      rowIndex: Number.parseInt(rowMatch[2], 10),
    };
  }

  const cellMatch = text.match(CELL_KEY_RE);
  if (cellMatch) {
    return {
      type: 'cell',
      tableName: cellMatch[1],
      rowIndex: Number.parseInt(cellMatch[2], 10),
      colIndex: Number.parseInt(cellMatch[3], 10),
    };
  }

  return null;
}

export function buildLiveTableIndex(tableData) {
  const index = {
    tableNames: new Set(),
    tableNameToRowCount: new Map(),
    tableNameToColCount: new Map(),
    sheetKeys: new Set(),
  };

  Object.entries(tableData || {}).forEach(([sheetKey, sheet]) => {
    if (sheetKey === 'mate' || !sheet) return;

    // raw table format: { name, content: [headers, ...rows] }
    if (Array.isArray(sheet.content) && sheet.name) {
      const tableName = String(sheet.name);
      const headers = Array.isArray(sheet.content[0]) ? sheet.content[0] : [];
      index.tableNames.add(tableName);
      index.tableNameToRowCount.set(tableName, Math.max(0, sheet.content.length - 1));
      index.tableNameToColCount.set(tableName, headers.length);
      index.sheetKeys.add(sheetKey);
      return;
    }

    // processed table format: { key, headers, rows }
    if (Array.isArray(sheet.rows)) {
      const tableName = String(sheet.name || sheetKey);
      const headers = Array.isArray(sheet.headers) ? sheet.headers : [];
      index.tableNames.add(tableName);
      index.tableNameToRowCount.set(tableName, sheet.rows.length);
      index.tableNameToColCount.set(tableName, headers.length);
      if (sheet.key) index.sheetKeys.add(sheet.key);
      else index.sheetKeys.add(sheetKey);
    }
  });

  return index;
}

export function isLiveRuntimeKey(key, liveIndex, { allowUnknown = true } = {}) {
  const parsed = parseRuntimeStateKey(key);
  if (!parsed) return allowUnknown;
  if (!liveIndex?.tableNames?.has(parsed.tableName)) return false;

  const rowCount = liveIndex.tableNameToRowCount.get(parsed.tableName) ?? 0;
  if (!Number.isInteger(parsed.rowIndex) || parsed.rowIndex < 0 || parsed.rowIndex >= rowCount) return false;

  if (parsed.type === 'cell') {
    const colCount = liveIndex.tableNameToColCount.get(parsed.tableName) ?? 0;
    if (!Number.isInteger(parsed.colIndex) || parsed.colIndex < 0 || parsed.colIndex >= colCount) return false;
  }

  return true;
}

export function cleanupRuntimeKeySet(keySet, liveIndex, options = {}) {
  if (!keySet || typeof keySet.forEach !== 'function' || typeof keySet.delete !== 'function') {
    return { before: 0, after: 0, removed: 0 };
  }

  const before = keySet.size || 0;
  const keysToDelete = [];
  keySet.forEach(key => {
    if (!isLiveRuntimeKey(key, liveIndex, options)) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => keySet.delete(key));

  return { before, after: keySet.size || 0, removed: keysToDelete.length };
}

export function cleanupRowPositionMapping(rowPositionMapping, liveIndex) {
  const mapping = rowPositionMapping || {};
  const tableNames = Object.keys(mapping);
  let removedTables = 0;
  let trimmedEntries = 0;

  tableNames.forEach(tableName => {
    if (!liveIndex.tableNames.has(tableName)) {
      delete mapping[tableName];
      removedTables += 1;
      return;
    }

    const rowCount = liveIndex.tableNameToRowCount.get(tableName) ?? 0;
    const current = Array.isArray(mapping[tableName]) ? mapping[tableName] : [];
    const next = current.filter(index => Number.isInteger(index) && index >= 0 && index < rowCount);
    trimmedEntries += Math.max(0, current.length - next.length);
    mapping[tableName] = next;
  });

  return { before: tableNames.length, after: Object.keys(mapping).length, removedTables, trimmedEntries };
}

export function cleanupCurrentPagination(currentPagination, liveIndex) {
  const pagination = currentPagination || {};
  const tableNames = Object.keys(pagination);
  let removedTables = 0;
  let clampedPages = 0;

  tableNames.forEach(tableName => {
    if (!liveIndex.tableNames.has(tableName)) {
      delete pagination[tableName];
      removedTables += 1;
      return;
    }

    const rowCount = liveIndex.tableNameToRowCount.get(tableName) ?? 0;
    const maxPage = Math.max(0, Math.ceil(rowCount / PAGE_SIZE) - 1);
    const currentPage = Number.parseInt(String(pagination[tableName] || 0), 10);
    if (!Number.isFinite(currentPage) || currentPage < 0) {
      pagination[tableName] = 0;
      clampedPages += 1;
    } else if (currentPage > maxPage) {
      pagination[tableName] = maxPage;
      clampedPages += 1;
    }
  });

  return { before: tableNames.length, after: Object.keys(pagination).length, removedTables, clampedPages };
}

export function getRuntimeStateStats(runtimeState) {
  const rowPositionMapping = runtimeState?.rowPositionMapping || {};
  const currentPagination = runtimeState?.currentPagination || {};

  return {
    currentDiffMapSize: runtimeState?.currentDiffMap?.size ?? 0,
    currentUserEditMapSize: runtimeState?.currentUserEditMap?.size ?? 0,
    pendingDeletesSize: runtimeState?.pendingDeletes?.size ?? 0,
    rowPositionMappingTables: Object.keys(rowPositionMapping).length,
    rowPositionMappingEntries: Object.values(rowPositionMapping).reduce(
      (sum, value) => sum + (Array.isArray(value) ? value.length : 0),
      0,
    ),
    currentPaginationTables: Object.keys(currentPagination).length,
  };
}

export function cleanupRuntimeState(tableData, runtimeState, options = {}) {
  const liveIndex = buildLiveTableIndex(tableData);
  const before = getRuntimeStateStats(runtimeState);

  const result = {
    before,
    currentDiffMap: cleanupRuntimeKeySet(runtimeState?.currentDiffMap, liveIndex, options),
    currentUserEditMap: cleanupRuntimeKeySet(runtimeState?.currentUserEditMap, liveIndex, options),
    pendingDeletes: cleanupRuntimeKeySet(runtimeState?.pendingDeletes, liveIndex, options),
    rowPositionMapping: cleanupRowPositionMapping(runtimeState?.rowPositionMapping, liveIndex),
    currentPagination: cleanupCurrentPagination(runtimeState?.currentPagination, liveIndex),
  };

  result.after = getRuntimeStateStats(runtimeState);
  result.removedTotal =
    result.currentDiffMap.removed +
    result.currentUserEditMap.removed +
    result.pendingDeletes.removed +
    result.rowPositionMapping.removedTables +
    result.rowPositionMapping.trimmedEntries +
    result.currentPagination.removedTables;

  return result;
}
