// ACU Visualizer 测试版表格数据模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 getTableData() 及相关数据格式兼容逻辑。
// 迁移原则：只迁移读取与格式兼容逻辑，不改变数据库 API 调用，不改变数据结构，不夹带优化。

import { getCore } from '../core/bridge.js';

export function normalizeTableData(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  if (parsed.mate && parsed.mate.type === 'chatSheets') {
    return parsed;
  }

  if (parsed.TavernDB_ACU_IndependentData) {
    return {
      ...parsed.TavernDB_ACU_IndependentData,
      mate: { type: 'chatSheets', version: 1 },
    };
  }

  if (Object.keys(parsed).some(key => key.startsWith('sheet_'))) {
    return {
      ...parsed,
      mate: { type: 'chatSheets', version: 1 },
    };
  }

  return parsed;
}

export function parseTableData(rawData) {
  if (!rawData) return null;
  const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  return normalizeTableData(parsed);
}

export function getTableData(core = getCore()) {
  const { getDB } = core;
  const api = getDB();
  if (!api) return null;

  try {
    const rawData = api.exportTableAsJson ? api.exportTableAsJson() : null;

    if (!rawData) return null;

    try {
      return parseTableData(rawData);
    } catch (e) {
      console.error('解析表格数据失败:', e);
      return null;
    }
  } catch (e) {
    console.error('获取表格数据失败:', e);
    return null;
  }
}

export function getSheetEntries(tableData) {
  return Object.entries(tableData || {}).filter(([, sheet]) => sheet && sheet.name && Array.isArray(sheet.content));
}

export function getSheetByName(tableData, tableName) {
  const entries = getSheetEntries(tableData);
  const found = entries.find(([, sheet]) => sheet.name === tableName);
  return found ? found[1] : null;
}

export function getSheetIdByName(tableData, tableName) {
  const entries = getSheetEntries(tableData);
  const found = entries.find(([, sheet]) => sheet.name === tableName);
  return found ? found[0] : null;
}

export function processJsonData(json) {
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
}

export function getSafeTableId(tableName) {
  return tableName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').toLowerCase();
}
