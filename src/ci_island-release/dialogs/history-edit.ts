/**
 * 往期报道项编辑弹窗
 *
 * 完整实现见原 src/ci_island_test/_backup/index.original.ts:10939 (showHistoryItemEditOverlay)
 *
 * 同时编辑大纲表 + 总结表/纪要表，按 (索引, 时间) 定位行
 * 保存后会重新打开 showNewsHistoryModal 以刷新列表
 */
import { ICONS } from '../core';
import { state } from '../core/state';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates } from '../data/api';
import { processData } from '../data/processor';
import { showNewsHistoryModal } from '../panels/worldinfo';
import { filterSystemColumns } from '../core/utils';

declare const $: any;

/**
 * 显示往期报道项编辑弹窗
 */
export function showHistoryItemEditOverlay(targetIndex: any, targetTime: any): void {
  const worldInfo = state.cachedData.worldInfo;
  const historyItem = worldInfo.summaryHistory?.find(
    (item: any) => item.index == targetIndex && item.time == targetTime,
  );

  if (!historyItem) {
    showToast('未找到对应的报道数据', 'error');
    return;
  }

  // 查找对应的数据行
  const api = getApi();
  let outlineRow: any = null;
  let summaryRow: any = null;
  let outlineTable: any = null;
  let summaryTable: any = null;

  const getColHelper = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => String(x).toLowerCase().includes(n.toLowerCase())));

  if (api && api.exportTableAsJson) {
    const rawData = api.exportTableAsJson();
    const allTables = Object.values(rawData);

    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      const isOutlineTable = tableName.includes('大纲') && !tableName.includes('纪要');
      const isSummaryOrMinutesTable =
        tableName.includes('总结表') || tableName.includes('总结') || tableName.includes('纪要表');

      if (isOutlineTable) {
        const outlineIdx = getColHelper(h, ['大纲', '概要', '内容']);
        const indexIdx = getColHelper(h, ['索引', '编码', '编号', '编码索引']);
        const timeIdx = getColHelper(h, ['时间', '时间跨度', '日期']);

        if (outlineIdx > -1) {
          rows.forEach((row: any) => {
            const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
            const rowTime = timeIdx > -1 ? row[timeIdx] : '';
            if (rowIndex == targetIndex && rowTime == targetTime) {
              outlineTable = table;
              outlineRow = row;
            }
          });
        }
      } else if (isSummaryOrMinutesTable) {
        const summaryIdx = getColHelper(h, ['纪要', '总结', '内容', '摘要']);
        const outlineIdx2 = getColHelper(h, ['概览', '大纲', '概要', '计划']);
        const indexIdx = getColHelper(h, ['索引', '编码', '编号', '编码索引']);
        const timeIdx = getColHelper(h, ['时间', '时间跨度', '日期']);

        if (summaryIdx > -1) {
          rows.forEach((row: any) => {
            const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
            const rowTime = timeIdx > -1 ? row[timeIdx] : '';
            if (rowIndex == targetIndex && rowTime == targetTime) {
              summaryTable = table;
              summaryRow = row;
              if (outlineIdx2 > -1 && row[outlineIdx2] && !outlineRow) {
                outlineTable = table;
                outlineRow = row;
              }
            }
          });
        }
      }
    });
  }

  // 创建编辑表单
  let outlineFields = '';
  let summaryFields = '';

  const isSameTable = outlineTable && summaryTable && outlineTable.name === summaryTable.name;

  if (outlineTable && outlineTable.content && outlineTable.content[0] && !isSameTable) {
    // 使用统一过滤函数：自动跳过 row_id 等系统列
    const { visibleHeaders, indexMap } = filterSystemColumns(outlineTable.content[0]);
    outlineFields = visibleHeaders
      .filter(colName => colName && colName.trim() !== '')
      .map((colName, i) => {
        const originalIdx = indexMap[visibleHeaders.indexOf(colName)];
        const value = outlineRow ? outlineRow[originalIdx] || '' : '';
        return `
        <div class="ci-input-group">
          <label>${colName}</label>
          <textarea class="ci-input-field" data-table="outline" data-col="${originalIdx}" rows="2">${value}</textarea>
        </div>
      `;
      })
      .join('');
  }

  const summaryTitle = summaryTable && summaryTable.name.includes('纪要') ? '纪要表数据' : '总结表数据';
  if (summaryTable && summaryTable.content && summaryTable.content[0]) {
    // 使用统一过滤函数：自动跳过 row_id 等系统列
    const { visibleHeaders, indexMap } = filterSystemColumns(summaryTable.content[0]);
    summaryFields = visibleHeaders
      .filter(colName => colName && colName.trim() !== '')
      .map((colName, i) => {
        const originalIdx = indexMap[visibleHeaders.indexOf(colName)];
        const value = summaryRow ? summaryRow[originalIdx] || '' : '';
        return `
        <div class="ci-input-group">
          <label>${colName}</label>
          <textarea class="ci-input-field" data-table="summary" data-col="${originalIdx}" rows="2">${value}</textarea>
        </div>
      `;
      })
      .join('');
  }

  const $overlay = $(`
    <div class="ci-history-edit-overlay ci-edit-overlay">
      <div class="ci-history-edit-card ci-edit-card" style="max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.history}</div>
          <span class="ci-edit-title">编辑往期报道</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 20px;">
          ${
            outlineFields
              ? `
            <div style="margin-bottom: 24px; padding: 16px; background: rgba(76, 175, 80, 0.05); border: 1px solid rgba(76, 175, 80, 0.2); border-radius: 8px;">
              <h4 style="margin: 0 0 16px 0; color: #4caf50; font-size: 14px;">大纲表数据</h4>
              ${outlineFields}
            </div>
          `
              : ''
          }

          ${
            summaryFields
              ? `
            <div style="padding: 16px; background: rgba(33, 150, 243, 0.05); border: 1px solid rgba(33, 150, 243, 0.2); border-radius: 8px;">
              <h4 style="margin: 0 0 16px 0; color: #2196f3; font-size: 14px;">${summaryTitle}</h4>
              ${summaryFields}
            </div>
          `
              : ''
          }
        </div>
        <div class="ci-edit-footer">
          <button class="ci-edit-save-btn">
            ${ICONS.save} 保存修改
          </button>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  // 保存
  $overlay.find('.ci-edit-save-btn').on('click', async function () {
    const updates: Array<{ table: string; col: number; value: any }> = [];

    $overlay.find('.ci-input-field').each(function (this: any) {
      const $field = $(this);
      const table = $field.data('table');
      const col = $field.data('col');
      const value = $field.val();
      updates.push({ table, col, value });
    });

    if (api && api.exportTableAsJson && api.importTableAsJson) {
      const rawData = api.exportTableAsJson();
      if (!rawData.mate) {
        rawData.mate = { type: 'chatSheets', version: 1 };
      }

      type RowAgg = { tableName: string; rowIndex: number; data: Record<string, any> };
      const aggMap = new Map<string, RowAgg>();

      updates.forEach(update => {
        const { table, col, value } = update;
        const currentRefTable = table === 'outline' ? outlineTable : summaryTable;
        if (!currentRefTable) return;

        let targetTable: any = null;
        for (const key in rawData) {
          if (rawData[key] && rawData[key].name === currentRefTable.name) {
            targetTable = rawData[key];
            break;
          }
        }
        if (!targetTable || !targetTable.content) return;

        const headers = targetTable.content[0];
        const indexIdx = getColHelper(headers, ['索引', '编码', '编号', '编码索引']);
        const timeIdx = getColHelper(headers, ['时间', '时间跨度', '日期']);

        for (let i = 1; i < targetTable.content.length; i++) {
          const row = targetTable.content[i];
          const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
          const rowTime = timeIdx > -1 ? row[timeIdx] : '';

          if (rowIndex == targetIndex && rowTime == targetTime) {
            row[col] = value;
            const colName = headers[col];
            const aggKey = `${targetTable.name}@${i}`;
            if (!aggMap.has(aggKey)) {
              aggMap.set(aggKey, { tableName: targetTable.name, rowIndex: i, data: {} });
            }
            if (colName) aggMap.get(aggKey)!.data[colName] = value;
            break;
          }
        }
      });

      const incUpdates = Array.from(aggMap.values());
      const ok = await saveTableUpdates(api, incUpdates, rawData);
      if (ok) {
        showToast('报道数据已保存', 'success');
        state.cachedData = processData(api.exportTableAsJson());
        $('.ci-news-history-overlay').remove();
        showNewsHistoryModal();
        $overlay.remove();
      } else {
        showToast('保存失败', 'error');
      }
    }
  });
}
