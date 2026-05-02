/**
 * 数据库 API 适配层（v9.6 更新 - 两级保存策略）
 * 封装 AutoCardUpdaterAPI 的获取与增量更新操作
 *
 * 保存流程：
 *   1. 优先调用精准 API (updateRow / insertRow / deleteRow)，维护数据库计数器
 *   2. 精准 API 失败时降级到 importTableAsJson 全量保存
 *   3. 保存成功后调用 refreshDataAndWorldbook 刷新世界书
 */
import { dbg } from '../core/utils';

declare const $: any;

/**
 * 获取 AutoCardUpdaterAPI 实例
 * 优先从 window，回退到 window.parent
 */
export function getApi(): any {
  return (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
}

/**
 * 获取 SillyTavern 实例
 */
export function getSillyTavern(): any {
  const win = window as any;
  let ST = win.SillyTavern || (win.parent ? win.parent.SillyTavern : null);
  if (!ST && win.top && win.top.SillyTavern) ST = win.top.SillyTavern;
  return ST;
}

// ========== 内部辅助 ==========

/**
 * 全量保存（importTableAsJson 后备方案）
 * 保存成功后会自动调用 refreshDataAndWorldbook 刷新世界书
 */
async function performBulkSave(api: any, fullData: any): Promise<boolean> {
  if (!api || typeof api.importTableAsJson !== 'function') {
    dbg('[全量保存] importTableAsJson 不可用');
    return false;
  }
  try {
    dbg('[全量保存] 执行 importTableAsJson...');
    const result = await api.importTableAsJson(JSON.stringify(fullData));
    if (result !== false) {
      dbg('[全量保存] ✓ 成功');
      // 全量保存后刷新世界书
      if (typeof api.refreshDataAndWorldbook === 'function') {
        try {
          await api.refreshDataAndWorldbook();
          dbg('[全量保存] ✓ 世界书已刷新');
        } catch (e) {
          dbg('[全量保存] refreshDataAndWorldbook 失败（非致命）:', e);
        }
      }
      return true;
    }
    dbg('[全量保存] ✗ importTableAsJson 返回 false');
    return false;
  } catch (e) {
    console.error('[浮岛] 全量保存异常:', e);
    return false;
  }
}

/**
 * 刷新世界书（保存成功后的统一处理）
 */
async function refreshWorldbook(api: any): Promise<void> {
  if (api && typeof api.refreshDataAndWorldbook === 'function') {
    try {
      await api.refreshDataAndWorldbook();
      dbg('[浮岛] ✓ 世界书已刷新');
    } catch (e) {
      dbg('[浮岛] refreshDataAndWorldbook 失败（非致命）:', e);
    }
  }
}

// ========== 兼容性导出（performDirectInjection 已废弃） ==========

/**
 * @deprecated 已废弃 - 旧版 STORAGE_KEY (v34) 不兼容新数据库 (v50/v60/v70/v80)
 * 现在统一使用 importTableAsJson 全量保存作为后备方案
 * 保留导出仅为向后兼容，内部不再使用
 */
export async function performDirectInjection(_tableData: any): Promise<void> {
  dbg('[浮岛] performDirectInjection 已废弃，请使用 importTableAsJson 全量保存');
}

// ========== 增量保存（两级架构：精准 API + 全量后备） ==========

/**
 * 增量保存：尝试使用 updateRow API 进行增量更新
 *
 * 流程：
 *   1. 优先调用 api.updateRow(tableName, rowIndex, data) 逐行精准更新
 *   2. 任一更新失败 → 立即降级到 importTableAsJson 全量保存
 *   3. 成功后调用 refreshDataAndWorldbook 刷新世界书
 *
 * @param api AutoCardUpdaterAPI 实例
 * @param updates 更新数组，每项包含 tableName / rowIndex / data
 *                注意：rowIndex 应该是基于 sheet.content 的索引（1 = 第一行数据）
 * @param fullDataForFallback 完整数据（已应用本地修改），用于全量保存后备
 */
export async function saveTableUpdates(
  api: any,
  updates: Array<{ tableName: string; rowIndex: number; data: Record<string, any> }>,
  fullDataForFallback: any,
): Promise<boolean> {
  // ===== 方案 1：精准 API =====
  if (api && typeof api.updateRow === 'function' && updates.length > 0) {
    try {
      let allOk = true;
      for (const upd of updates) {
        dbg(`[精准保存] updateRow: ${upd.tableName}[行${upd.rowIndex}]`);
        const ok = await api.updateRow(upd.tableName, upd.rowIndex, upd.data);
        if (ok === false) {
          dbg(`[精准保存] ✗ updateRow 失败: ${upd.tableName}[行${upd.rowIndex}]`);
          allOk = false;
          break;
        }
      }
      if (allOk) {
        dbg(`[精准保存] ✓ 全部成功，共 ${updates.length} 行`);
        await refreshWorldbook(api);
        return true;
      }
    } catch (e) {
      dbg('[精准保存] 异常，将降级到全量保存:', e);
    }
  }

  // ===== 方案 2：全量保存后备 =====
  dbg('[降级] 使用 importTableAsJson 全量保存');
  return await performBulkSave(api, fullDataForFallback);
}

/**
 * 增量插入行
 *
 * 流程：
 *   1. 优先调用 api.insertRow(tableName, data) 在表尾插入
 *   2. 失败 → 降级到 importTableAsJson 全量保存
 *   3. 成功后调用 refreshDataAndWorldbook 刷新世界书
 *
 * @param api AutoCardUpdaterAPI 实例
 * @param tableName 表格名称
 * @param data 列名->值映射对象
 * @param fullDataForFallback 完整数据（已应用本地修改），用于全量保存后备
 */
export async function saveTableInsert(
  api: any,
  tableName: string,
  data: Record<string, any>,
  fullDataForFallback: any,
): Promise<boolean> {
  // ===== 方案 1：精准 API =====
  if (api && typeof api.insertRow === 'function') {
    try {
      dbg(`[精准插入] insertRow: ${tableName}`);
      const idx = await api.insertRow(tableName, data);
      if (idx !== -1 && idx !== false) {
        dbg(`[精准插入] ✓ 成功，新行索引: ${idx}`);
        await refreshWorldbook(api);
        return true;
      }
      dbg(`[精准插入] ✗ insertRow 返回 ${idx}`);
    } catch (e) {
      dbg('[精准插入] 异常，将降级到全量保存:', e);
    }
  }

  // ===== 方案 2：全量保存后备 =====
  dbg('[降级] 使用 importTableAsJson 全量保存');
  return await performBulkSave(api, fullDataForFallback);
}

/**
 * 增量删除行
 *
 * 流程：
 *   1. 优先调用 api.deleteRow(tableName, rowIndex) 精准删除
 *   2. 失败 → 降级到 importTableAsJson 全量保存
 *   3. 成功后调用 refreshDataAndWorldbook 刷新世界书
 *
 * @param api AutoCardUpdaterAPI 实例
 * @param tableName 表格名称
 * @param rowIndex 要删除的行索引（基于 sheet.content，1 = 第一行数据）
 * @param fullDataForFallback 完整数据（已应用本地删除），用于全量保存后备
 *
 * 注意：调用方应该在调用本函数之前先在 fullDataForFallback 中应用 splice 删除，
 *       这样即使精准 API 失败，全量保存也能正确反映删除结果。
 */
export async function saveTableDelete(
  api: any,
  tableName: string,
  rowIndex: number,
  fullDataForFallback: any,
): Promise<boolean> {
  // ===== 方案 1：精准 API =====
  if (api && typeof api.deleteRow === 'function') {
    try {
      dbg(`[精准删除] deleteRow: ${tableName}[行${rowIndex}]`);
      const ok = await api.deleteRow(tableName, rowIndex);
      if (ok !== false) {
        dbg(`[精准删除] ✓ 成功`);
        await refreshWorldbook(api);
        return true;
      }
      dbg(`[精准删除] ✗ deleteRow 返回 false`);
    } catch (e) {
      dbg('[精准删除] 异常，将降级到全量保存:', e);
    }
  }

  // ===== 方案 2：全量保存后备 =====
  dbg('[降级] 使用 importTableAsJson 全量保存');
  return await performBulkSave(api, fullDataForFallback);
}
