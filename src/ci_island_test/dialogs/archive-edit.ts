/**
 * 角色档案编辑弹窗
 *
 * 完整实现见原 src/ci_island_test/_backup/index.original.ts:2858 (showArchiveEditDialog)
 *                                                       3061 (updateCellOrComposite)
 *                                                       3087 (saveArchiveData)
 *
 * 设计要点：
 *  - 严格按 _src(table, col) 定位单元格，避免跨表混合编辑
 *  - rawColumn：直接整列原始内容覆盖（零小标题/备注污染）
 *  - 跳过系统列（row_id 等）
 */
import { ICONS, STORAGE_AVATAR_PREFIX } from '../core';
import { state } from '../core/state';
import { safeGetItem } from '../core/storage';
import { dbg, isSystemColumn } from '../core/utils';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates } from '../data/api';
import { processData } from '../data/processor';

declare const $: any;

/**
 * 显示档案编辑弹窗
 */
export function showArchiveEditDialog(d: any): void {
  dbg('[档案编辑弹窗] 打开档案编辑:', d.name);

  $('.ci-archive-edit-overlay').remove();

  const charExtra = state.cachedData.charExtraInfo?.[d.name] || {};

  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + d.name, '');
  const avatarHtml = localImg
    ? `<img src="${localImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : d.name.charAt(0);

  let archiveEditHtml = '';

  // 属性信息
  if (charExtra.stats && charExtra.stats.length > 0) {
    archiveEditHtml += '<div class="ci-archive-edit-section">';
    archiveEditHtml += '<div class="ci-archive-edit-section-title">属性信息</div>';
    archiveEditHtml += (charExtra.stats || [])
      .map(
        (stat: any, idx: number) => `
        <div class="ci-archive-edit-item" data-type="stats" data-idx="${idx}" data-src-table="${stat._src?.table || ''}" data-src-col="${stat._src?.col || ''}">
          <input class="ci-input-field ci-archive-label-input" data-field="label" value="${stat.label || ''}" placeholder="属性名">
          <input class="ci-input-field ci-archive-value-input" data-field="value" value="${stat.displayValue || stat.value || ''}" placeholder="数值">
        </div>
      `,
      )
      .join('');
    archiveEditHtml += '</div>';
  }

  // 身体特征 - 整列原始内容覆盖
  if (charExtra.bodyInfoGroups && charExtra.bodyInfoGroups.length > 0) {
    charExtra.bodyInfoGroups.forEach((group: any) => {
      if (!group.colName) return;
      archiveEditHtml += '<div class="ci-archive-edit-section">';
      archiveEditHtml += `<div class="ci-archive-edit-section-title">${group.colName}</div>`;
      archiveEditHtml += `
      <div class="ci-archive-edit-item" data-type="rawColumn" data-src-table="${group.tableName || ''}" data-src-col="${group.colName || ''}">
        <textarea class="ci-input-field ci-archive-value-input" data-field="rawValue" rows="4" placeholder="${group.colName}">${group.rawValue || ''}</textarea>
      </div>`;
      archiveEditHtml += '</div>';
    });
  }

  // 衣着装扮 - 整列原始内容覆盖
  if (charExtra.clothingGroups && charExtra.clothingGroups.length > 0) {
    charExtra.clothingGroups.forEach((group: any) => {
      if (!group.colName) return;
      archiveEditHtml += '<div class="ci-archive-edit-section">';
      archiveEditHtml += `<div class="ci-archive-edit-section-title">${group.colName}</div>`;
      archiveEditHtml += `
      <div class="ci-archive-edit-item" data-type="rawColumn" data-src-table="${group.tableName || ''}" data-src-col="${group.colName || ''}">
        <textarea class="ci-input-field ci-archive-value-input" data-field="rawValue" rows="4" placeholder="${group.colName}">${group.rawValue || ''}</textarea>
      </div>`;
      archiveEditHtml += '</div>';
    });
  }

  // 其他信息（按表名分组）
  if (charExtra.otherInfo && charExtra.otherInfo.length > 0) {
    charExtra.otherInfo.forEach((tableInfo: any) => {
      if (tableInfo.items && tableInfo.items.length > 0) {
        archiveEditHtml += '<div class="ci-archive-edit-section">';
        archiveEditHtml += `<div class="ci-archive-edit-section-title">${tableInfo.tableName}</div>`;
        archiveEditHtml += tableInfo.items
          .map(
            (item: any, idx: number) => `
            <div class="ci-archive-edit-item" data-type="otherInfo" data-table="${tableInfo.tableName}" data-idx="${idx}" data-src-table="${item._src?.table || ''}" data-src-col="${item._src?.col || ''}">
              <input class="ci-input-field ci-archive-label-input" data-field="label" value="${item.label || ''}" placeholder="标签名">
              <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
            </div>
          `,
          )
          .join('');
        archiveEditHtml += '</div>';
      }
    });
  }

  const $overlay = $(`
    <div class="ci-archive-edit-overlay ci-edit-overlay">
      <div class="ci-archive-edit-card ci-edit-card" style="width:90%;max-width:380px;max-height:90vh;overflow-y:auto;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar">${avatarHtml}</div>
          <span class="ci-edit-title">编辑档案 - ${d.name}</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body">
          ${
            archiveEditHtml
              ? archiveEditHtml
              : `
          <div class="ci-archive-empty-edit">
            <div style="text-align:center;color:#999;padding:30px;">
              暂无可编辑的档案信息
            </div>
          </div>
          `
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

  $overlay.find('.ci-edit-close').on('click', (e: any) => {
    e.stopPropagation();
    dbg('[档案编辑弹窗] 点击关闭按钮');
    $overlay.remove();
  });

  $overlay.on('click', function (this: HTMLElement, e: any) {
    e.stopPropagation();
    if (e.target === this) {
      dbg('[档案编辑弹窗] 点击遮罩层关闭');
      $overlay.remove();
    }
  });

  $overlay.find('.ci-archive-edit-card').on('click', (e: any) => {
    e.stopPropagation();
  });

  $overlay.find('.ci-edit-save-btn').on('click', async (e: any) => {
    e.stopPropagation();
    dbg('[档案编辑弹窗] 点击保存按钮');

    const updatedData: any = {
      stats: [],
      rawColumns: [],
      otherInfo: [],
    };

    $overlay.find('.ci-archive-edit-item').each(function (this: HTMLElement) {
      const $item = $(this);
      const type = $item.attr('data-type');
      const tableName = $item.attr('data-table');
      const srcTable = $item.attr('data-src-table');
      const srcCol = $item.attr('data-src-col');

      if (type === 'stats') {
        updatedData.stats.push({
          label: $item.find('[data-field="label"]').val(),
          value: $item.find('[data-field="value"]').val(),
          srcTable,
          srcCol,
        });
      } else if (type === 'rawColumn') {
        if (srcTable && srcCol) {
          updatedData.rawColumns.push({
            srcTable,
            srcCol,
            value: ($item.find('[data-field="rawValue"]').val() || '') as string,
          });
        }
      } else if (type === 'otherInfo') {
        const itemData = {
          label: $item.find('[data-field="label"]').val(),
          value: $item.find('[data-field="value"]').val(),
          srcTable,
          srcCol,
        };
        let tableGroup = updatedData.otherInfo.find((t: any) => t.tableName === tableName);
        if (!tableGroup) {
          tableGroup = { tableName: tableName, items: [] };
          updatedData.otherInfo.push(tableGroup);
        }
        tableGroup.items.push(itemData);
      }
    });

    dbg('[档案编辑弹窗] 收集的数据:', updatedData);

    await saveArchiveData(d.name, d._src, updatedData);
    $overlay.remove();
  });

  $('body').append($overlay);
}

/**
 * 辅助函数：更新单元格或复合单元格内容
 * 支持直接列匹配和 "Key:Value" 格式的复合内容匹配
 */
export function updateCellOrComposite(row: any[], headers: string[], key: string, value: string): boolean {
  // 1. 严格列名相等匹配
  const colIdx = headers.findIndex(h => h && String(h) === key);
  if (colIdx !== -1 && row[colIdx] !== undefined) {
    row[colIdx] = value;
    return true;
  }

  // 2. 复合单元格匹配 (Key:Value; Key2:Value2)
  for (let i = 0; i < row.length; i++) {
    if (isSystemColumn(headers[i])) continue;
    const cell = String(row[i]);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKey}[:：]\\s*)([^;；]+)`);
    if (regex.test(cell)) {
      row[i] = cell.replace(regex, `$1${value}`);
      return true;
    }
  }
  return false;
}

/**
 * 保存档案数据到数据库
 */
export async function saveArchiveData(charName: string, _srcInfo: any, updatedData: any): Promise<void> {
  dbg('[档案保存] 开始保存档案数据:', charName);

  const api = getApi();
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  try {
    const fullData = api.exportTableAsJson();

    if (!fullData.mate) {
      fullData.mate = { type: 'chatSheets', version: 1 };
    }

    const updates: Array<{ tableName: string; rowIndex: number; data: Record<string, any> }> = [];

    const getRowEntry = (tableName: string, rowIndex: number) => {
      let entry = updates.find(u => u.tableName === tableName && u.rowIndex === rowIndex);
      if (!entry) {
        entry = { tableName, rowIndex, data: {} };
        updates.push(entry);
      }
      return entry;
    };

    const findCharRowInTable = (
      tableName: string,
    ): { rowIndex: number; row: any[]; headers: any[] } | null => {
      const sheet = Object.values(fullData).find((s: any) => s && s.name === tableName) as any;
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return null;
      const headers = sheet.content[0] || [];
      const nameColIdx = headers.findIndex(
        (h: any) => h && ['角色', '姓名', '名字', '名称'].some(n => String(h).includes(n)),
      );
      if (nameColIdx === -1) return null;
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (row && String(row[nameColIdx] || '').trim() === charName) {
          return { rowIndex: i, row, headers };
        }
      }
      return null;
    };

    const updateBySrc = (srcTable: string, srcCol: string, key: string, value: string) => {
      if (!srcTable || !srcCol) return;
      if (isSystemColumn(srcCol)) return;
      const located = findCharRowInTable(srcTable);
      if (!located) return;
      const { row, headers, rowIndex } = located;
      const colIdx = headers.findIndex((h: any) => h && String(h) === srcCol);
      if (colIdx === -1 || isSystemColumn(headers[colIdx])) return;

      if (key === srcCol || !key) {
        row[colIdx] = value;
      } else {
        const cell = String(row[colIdx] || '');
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKey}[:：]\\s*)([^;；]+)`);
        if (regex.test(cell)) {
          row[colIdx] = cell.replace(regex, `$1${value}`);
        } else {
          return;
        }
      }
      const entry = getRowEntry(srcTable, rowIndex);
      entry.data[srcCol] = row[colIdx];
    };

    // 1. 属性信息
    if (updatedData.stats && updatedData.stats.length > 0) {
      updatedData.stats.forEach((item: any) => {
        if (item.srcTable && item.srcCol) {
          updateBySrc(item.srcTable, item.srcCol, item.label, item.value);
        }
      });
    }

    // 2. 身体状态
    if (updatedData.bodyStatus && updatedData.bodyStatus.length > 0) {
      updatedData.bodyStatus.forEach((item: any) => {
        if (item.srcTable && item.srcCol) {
          updateBySrc(item.srcTable, item.srcCol, item.label, item.value);
        }
      });
    }

    // 3. 整列原始内容覆盖
    if (updatedData.rawColumns && updatedData.rawColumns.length > 0) {
      updatedData.rawColumns.forEach((col: any) => {
        if (!col.srcTable || !col.srcCol) return;
        const located = findCharRowInTable(col.srcTable);
        if (!located) return;
        const { row, headers, rowIndex } = located;
        const colIdx = headers.findIndex((h: any) => h && String(h) === col.srcCol);
        if (colIdx === -1 || isSystemColumn(headers[colIdx])) return;

        const newValue = col.value !== undefined ? String(col.value) : '';
        if (String(row[colIdx] || '') !== newValue) {
          row[colIdx] = newValue;
          const entry = getRowEntry(col.srcTable, rowIndex);
          entry.data[headers[colIdx]] = newValue;
        }
      });
    }

    // 4. 其他信息
    if (updatedData.otherInfo && updatedData.otherInfo.length > 0) {
      updatedData.otherInfo.forEach((tableGroup: any) => {
        if (tableGroup.items && tableGroup.items.length > 0) {
          tableGroup.items.forEach((item: any) => {
            if (item.srcTable && item.srcCol) {
              updateBySrc(item.srcTable, item.srcCol, item.label, item.value);
            }
          });
        }
      });
    }

    const ok = await saveTableUpdates(api, updates, fullData);
    if (ok) {
      showToast('档案已保存');
      state.cachedData = processData(api.exportTableAsJson());
    } else {
      showToast('保存失败', 'error');
    }
  } catch (e) {
    console.error('[档案保存] 异常:', e);
    showToast('保存失败: ' + e, 'error');
  }
}
