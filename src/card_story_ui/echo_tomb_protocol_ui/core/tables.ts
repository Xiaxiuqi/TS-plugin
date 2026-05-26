/**
 * 表格标准化与字段访问
 * 按中文表头定位列，禁止按列序硬编码
 */

export interface TableRow {
  [header: string]: string;
}

export interface ParsedTable {
  name: string;
  headers: string[];
  rows: TableRow[];
  /** 原始二维数组引用 */
  raw: any[][];
}

/**
 * 将二维数组表格解析为结构化对象
 * 第一行为表头，后续行为数据
 */
export function parseTable(name: string, raw: any[][]): ParsedTable | null {
  if (!raw || raw.length < 1) return null;

  const headers = raw[0].map(String);
  const rows: TableRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row: TableRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = raw[i]?.[j] != null ? String(raw[i][j]) : '';
    }
    rows.push(row);
  }

  return { name, headers, rows, raw };
}

/**
 * 按表头名获取某列的所有值
 */
export function getColumn(table: ParsedTable, header: string): string[] {
  return table.rows.map(row => row[header] ?? '');
}

/**
 * 按角色ID 查找行
 */
export function findRowByCharId(table: ParsedTable, charId: string): TableRow | null {
  return table.rows.find(row => row['角色ID'] === charId) ?? null;
}

/**
 * 按角色ID 查找所有行（属性表 6 行、装备表 12 行、技能表 N 行均按此定位）
 */
export function filterRowsByCharId(table: ParsedTable, charId: string): TableRow[] {
  return table.rows.filter(row => row['角色ID'] === charId);
}

/**
 * 过滤在场角色（是否离场 === '否'）
 */
export function filterPresent(table: ParsedTable): TableRow[] {
  return table.rows.filter(row => {
    const absent = row['是否离场'];
    // 如果字段不存在，默认在场（兼容旧表）
    if (absent === undefined || absent === '') return true;
    return absent === '否';
  });
}

/**
 * 过滤背包物品：只保留拥有人属于指定角色ID集合的行
 */
export function filterInventoryByOwners(table: ParsedTable, ownerIds: Set<string>): TableRow[] {
  return table.rows.filter(row => {
    const owner = row['拥有人'] ?? row['角色ID'] ?? '';
    return ownerIds.has(owner);
  });
}

/**
 * 将 ParsedTable 转回二维数组（用于写回）
 */
export function serializeTable(table: ParsedTable): any[][] {
  const result: any[][] = [table.headers];
  for (const row of table.rows) {
    result.push(table.headers.map(h => row[h] ?? ''));
  }
  return result;
}
