/**
 * 数据库写回安全层
 * 写回前必须：导出最新 → 校验 → 修改内存副本 → import → refresh
 */

import { getDatabase } from './database';
import { parseTable, serializeTable, type ParsedTable } from './tables';

export interface WritebackResult {
  success: boolean;
  error?: string;
}

/**
 * 安全写回流程
 * 1. 导出当前表格最新数据
 * 2. 执行校验函数（确认无并发变化）
 * 3. 在内存副本上执行修改
 * 4. 导入修改后的数据
 * 5. 刷新数据和世界书
 */
export async function safeWriteback(
  tableName: string,
  validate: (current: ParsedTable) => string | null,
  modify: (current: ParsedTable) => ParsedTable,
): Promise<WritebackResult> {
  const db = getDatabase();

  // Step 1: 导出最新
  const raw = await db.exportTable(tableName);
  if (!raw) {
    return { success: false, error: `无法导出表格「${tableName}」` };
  }

  const current = parseTable(tableName, raw);
  if (!current) {
    return { success: false, error: `表格「${tableName}」解析失败` };
  }

  // Step 2: 校验
  const validationError = validate(current);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Step 3: 修改内存副本
  const modified = modify(current);

  // Step 4: 导入
  const serialized = serializeTable(modified);
  const importResult = await db.importTable(tableName, serialized);
  if (!importResult) {
    return { success: false, error: `导入表格「${tableName}」失败` };
  }

  // Step 5: 刷新
  await db.refresh();

  return { success: true };
}

/**
 * 批量写回多张表（组队流程用）
 * 任一失败则中断并报告
 */
export async function batchWriteback(
  operations: Array<{
    tableName: string;
    validate: (current: ParsedTable) => string | null;
    modify: (current: ParsedTable) => ParsedTable;
  }>,
): Promise<WritebackResult> {
  for (const op of operations) {
    const result = await safeWriteback(op.tableName, op.validate, op.modify);
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
}
