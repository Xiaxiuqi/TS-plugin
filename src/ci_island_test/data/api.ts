/**
 * 数据库 API 适配层
 * 封装 AutoCardUpdaterAPI 的获取与增量更新操作
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

// ========== 增量保存辅助 ==========

/**
 * 直接消息注入（更新隔离数据）
 */
export async function performDirectInjection(tableData: any): Promise<void> {
  try {
    const win = window as any;
    const ST = getSillyTavern();
    if (!ST) return;

    const STORAGE_KEY_V5_SETTINGS = 'shujuku_v34_allSettings_v2';
    let isolationKey = '';
    try {
      let storage: Storage | null = null;
      try {
        if (typeof win.localStorage !== 'undefined' && win.localStorage !== null) {
          storage = win.localStorage;
        }
      } catch (e) {}
      if (storage && !storage.getItem(STORAGE_KEY_V5_SETTINGS) && win.parent) {
        try {
          if (typeof win.parent.localStorage !== 'undefined' && win.parent.localStorage !== null) {
            storage = win.parent.localStorage;
          }
        } catch (e) {}
      }
      if (storage) {
        const settingsStr = storage.getItem(STORAGE_KEY_V5_SETTINGS);
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings.dataIsolationEnabled && settings.dataIsolationCode)
            isolationKey = settings.dataIsolationCode;
        }
      }
    } catch (e) {}

    if (ST.chat && ST.chat.length > 0) {
      let targetMsg = null;
      for (let i = ST.chat.length - 1; i >= 0; i--) {
        if (!ST.chat[i].is_user) {
          targetMsg = ST.chat[i];
          break;
        }
      }
      if (targetMsg) {
        if (!targetMsg.TavernDB_ACU_IsolatedData) targetMsg.TavernDB_ACU_IsolatedData = {};
        if (!targetMsg.TavernDB_ACU_IsolatedData[isolationKey])
          targetMsg.TavernDB_ACU_IsolatedData[isolationKey] = {
            independentData: {},
            modifiedKeys: [],
            updateGroupKeys: [],
          };
        const tagData = targetMsg.TavernDB_ACU_IsolatedData[isolationKey];
        if (!tagData.independentData) tagData.independentData = {};
        const sheetsToSave = Object.keys(tableData).filter(k => k.startsWith('sheet_'));
        sheetsToSave.forEach(k => {
          tagData.independentData[k] = JSON.parse(JSON.stringify(tableData[k]));
        });
        const existingKeys = tagData.modifiedKeys || [];
        tagData.modifiedKeys = [...new Set([...existingKeys, ...sheetsToSave])];

        if (!targetMsg.TavernDB_ACU_Data) targetMsg.TavernDB_ACU_Data = {};

        if (ST.saveChat) await ST.saveChat();
      }
    }
  } catch (e) {
    console.error('[浮岛] Injection error', e);
  }
}

/**
 * 增量保存：尝试使用 updateRow API 进行增量更新，失败时回退到 importTableAsJson 全量保存
 */
export async function saveTableUpdates(
  api: any,
  updates: Array<{ tableName: string; rowIndex: number; data: Record<string, any> }>,
  fullDataForFallback: any,
): Promise<boolean> {
  if (api && typeof api.updateRow === 'function' && updates.length > 0) {
    try {
      let allOk = true;
      for (const upd of updates) {
        const ok = await api.updateRow(upd.tableName, upd.rowIndex, upd.data);
        if (ok === false) {
          allOk = false;
          break;
        }
      }
      if (allOk) {
        dbg('[增量保存] 成功更新行数据: ' + updates.length);
        if (typeof api.refreshDataAndWorldbook === 'function') {
          try {
            await api.refreshDataAndWorldbook();
          } catch (e) {
            dbg('[增量保存] refreshDataAndWorldbook 失败（非致命）:', e);
          }
        }
        return true;
      }
    } catch (e) {
      dbg('[增量保存] 异常，回退到全量保存:', e);
    }
  }

  // 回退：全量保存
  dbg('[全量保存] 回退使用 importTableAsJson');
  await performDirectInjection(fullDataForFallback);
  if (api && typeof api.importTableAsJson === 'function') {
    const result = await api.importTableAsJson(JSON.stringify(fullDataForFallback));
    return result !== false;
  }
  return false;
}

/**
 * 增量插入行
 */
export async function saveTableInsert(
  api: any,
  tableName: string,
  data: Record<string, any>,
  fullDataForFallback: any,
): Promise<boolean> {
  if (api && typeof api.insertRow === 'function') {
    try {
      const idx = await api.insertRow(tableName, data);
      if (idx !== -1 && idx !== false) {
        dbg('[增量插入] 成功，新行索引: ' + idx);
        if (typeof api.refreshDataAndWorldbook === 'function') {
          try {
            await api.refreshDataAndWorldbook();
          } catch (e) {}
        }
        return true;
      }
    } catch (e) {
      dbg('[增量插入] 异常，回退到全量保存:', e);
    }
  }
  await performDirectInjection(fullDataForFallback);
  if (api && typeof api.importTableAsJson === 'function') {
    const result = await api.importTableAsJson(JSON.stringify(fullDataForFallback));
    return result !== false;
  }
  return false;
}

/**
 * 增量删除行
 */
export async function saveTableDelete(
  api: any,
  tableName: string,
  rowIndex: number,
  fullDataForFallback: any,
): Promise<boolean> {
  if (api && typeof api.deleteRow === 'function') {
    try {
      const ok = await api.deleteRow(tableName, rowIndex);
      if (ok !== false) {
        dbg('[增量删除] 成功');
        if (typeof api.refreshDataAndWorldbook === 'function') {
          try {
            await api.refreshDataAndWorldbook();
          } catch (e) {}
        }
        return true;
      }
    } catch (e) {
      dbg('[增量删除] 异常，回退到全量保存:', e);
    }
  }
  await performDirectInjection(fullDataForFallback);
  if (api && typeof api.importTableAsJson === 'function') {
    const result = await api.importTableAsJson(JSON.stringify(fullDataForFallback));
    return result !== false;
  }
  return false;
}
