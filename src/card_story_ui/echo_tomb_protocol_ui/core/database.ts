/**
 * 数据库 API 封装
 * 探测并封装 window.AutoCardUpdaterAPI
 */

export interface DatabaseAPI {
  /** 导出表格为 JSON */
  exportTable(tableName: string): Promise<any[][] | null>;
  /** 导入表格 JSON */
  importTable(tableName: string, data: any[][]): Promise<boolean>;
  /** 调用 AI */
  callAI(prompt: string, options?: { model?: string }): Promise<string | null>;
  /** 注册填表结束回调（宿主未暴露反向 unsubscribe，store 侧通过 alive 标记软解绑） */
  onTableFillEnd(callback: () => void): void;
  /**
   * 注册表更新回调
   * @deprecated t6.1 阶段未发现实际调用方；t8 地图面板若不需要，t12 验证回归阶段一并删除
   */
  onTableUpdate(callback: () => void): void;
  /** 刷新数据和世界书 */
  refresh(): Promise<void>;
  /** 原始 API 引用 */
  raw: any;
}

let _db: DatabaseAPI | null = null;

export function initDatabase(): DatabaseAPI | null {
  const api = (window as any).AutoCardUpdaterAPI;
  if (!api) return null;

  _db = {
    async exportTable(tableName: string): Promise<any[][] | null> {
      try {
        const result = await api.exportTableAsJson(tableName);
        if (!result || result === false) return null;
        return result;
      } catch (e) {
        console.error(`[EchoTomb] exportTable(${tableName}) failed:`, e);
        return null;
      }
    },

    async importTable(tableName: string, data: any[][]): Promise<boolean> {
      try {
        const result = await api.importTableAsJson(tableName, data);
        return result !== false && result !== null;
      } catch (e) {
        console.error(`[EchoTomb] importTable(${tableName}) failed:`, e);
        return false;
      }
    },

    async callAI(prompt: string, options?: { model?: string }): Promise<string | null> {
      try {
        const result = await api.callAI(prompt, options);
        if (!result || typeof result !== 'string') return null;
        return result;
      } catch (e) {
        console.error('[EchoTomb] callAI failed:', e);
        return null;
      }
    },

    onTableFillEnd(callback: () => void): void {
      if (typeof api.registerTableFillEndCallback === 'function') {
        api.registerTableFillEndCallback(callback);
      }
    },

    onTableUpdate(callback: () => void): void {
      if (typeof api.registerTableUpdateCallback === 'function') {
        api.registerTableUpdateCallback(callback);
      }
    },

    async refresh(): Promise<void> {
      try {
        await api.refreshDataAndWorldbook();
      } catch (e) {
        console.error('[EchoTomb] refresh failed:', e);
      }
    },

    raw: api,
  };

  return _db;
}

export function getDatabase(): DatabaseAPI {
  if (!_db) throw new Error('[EchoTomb] Database not initialized');
  return _db;
}
