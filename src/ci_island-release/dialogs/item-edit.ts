/**
 * 物品编辑弹窗
 * 包含 openItemEditModal + saveItemData
 *
 * 完整实现见原 src/ci_island_test/index.ts:3620 (openItemEditModal)
 *                  src/ci_island_test/index.ts:2710 (saveItemData)
 */
import { ICONS } from '../core/icons';
import { state } from '../core/state';
import { isSystemColumn } from '../core/utils';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates } from '../data/api';
import { processData } from '../data/processor';

declare const $: any;

/**
 * 打开物品编辑模态弹窗
 */
export function openItemEditModal(item: any): void {
  $('.ci-item-edit-overlay').remove();

  const editFields: string[] = [];

  editFields.push(`
    <div class="ci-input-group" style="margin-bottom:12px;">
      <label class="ci-input-label">物品名称</label>
      <input class="ci-input-field" data-field="name" value="${item.name || ''}">
    </div>
  `);

  const typeCountFields: string[] = [];
  if (item.type && item.type.trim() !== '') {
    typeCountFields.push(`<div class="ci-input-group" style="flex:1;"><label class="ci-input-label">类型/分类</label><input class="ci-input-field" data-field="type" value="${item.type || ''}"></div>`);
  }
  if (item.count !== undefined && item.count !== null && item.count !== '') {
    typeCountFields.push(`<div class="ci-input-group" style="flex:1;"><label class="ci-input-label">数量</label><input class="ci-input-field" data-field="count" type="text" value="${item.count || 1}"></div>`);
  }
  if (typeCountFields.length > 0) {
    editFields.push(`<div class="ci-input-row" style="display:flex; gap:12px; margin-bottom:12px;">${typeCountFields.join('')}</div>`);
  }

  if (item.owner && item.owner.trim() !== '') {
    editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">归属/拥有者</label><input class="ci-input-field" data-field="owner" value="${item.owner || ''}"></div>`);
  }

  if (item.desc && item.desc.trim() !== '') {
    editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">描述/效果</label><textarea class="ci-input-field" data-field="desc" rows="3">${item.desc || ''}</textarea></div>`);
  }

  // 其他字段
  if (item.details && Object.keys(item.details).length > 0) {
    const excludeFields = ['名称', '名字', '物品', '类型', '种类', '类别', '分类', 'Category', '描述', '效果', '归属', '拥有者', '数量', '个数', 'Owner'];
    Object.entries(item.details).forEach(([key, value]) => {
      if (
        !excludeFields.includes(key) &&
        !isSystemColumn(key) &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">${key}</label><textarea class="ci-input-field" data-field="detail-${key}" rows="2" placeholder="输入${key}">${value || ''}</textarea></div>`);
      }
    });
  }

  const $overlay = $(`
    <div class="ci-item-edit-overlay ci-edit-overlay">
      <div class="ci-item-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.inventory}</div>
          <span class="ci-edit-title">编辑物品</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1;">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer" style="padding:16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
          <button class="ci-edit-save-btn">${ICONS.save} 提交修改</button>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-edit-save-btn').on('click', async () => {
    const newData: any = {
      name: $overlay.find('[data-field="name"]').val(),
      type: $overlay.find('[data-field="type"]').val(),
      count: $overlay.find('[data-field="count"]').val(),
      owner: $overlay.find('[data-field="owner"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      details: {} as Record<string, any>,
    };

    $overlay.find('[data-field^="detail-"]').each(function (this: any) {
      const fieldName = $(this).data('field').replace('detail-', '');
      const fieldValue = $(this).val();
      if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
        newData.details[fieldName] = fieldValue;
      }
    });

    await saveItemData(item, newData);
    $overlay.remove();
  });
}

/**
 * 保存物品数据
 */
export async function saveItemData(originalItem: any, newData: any): Promise<void> {
  const api = getApi();
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }
  if (!fullData.mate) fullData.mate = { type: 'chatSheets', version: 1 };

  const src = originalItem._src;
  if (!src || !src.table) {
    showToast('物品源信息不完整', 'error');
    return;
  }

  let table: any = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }
  if (!table) {
    showToast('未找到对应的物品数据表', 'error');
    return;
  }

  const row = table.content[src.rowIdx];
  if (!row) {
    showToast('未找到对应的物品数据行', 'error');
    return;
  }

  const h = table.content[0];
  const getColIdx = (ns: string[]) => h.findIndex((x: string) => x && ns.some(n => x.includes(n)));

  const cols = {
    name: getColIdx(['名称', '名字', '物品']),
    type: getColIdx(['类型', '种类', '类别', '分类', 'Category']),
    count: getColIdx(['数量', '个数']),
    owner: getColIdx(['拥有者', '拥有人', '持有者', '归属', 'Owner']),
    desc: getColIdx(['描述', '效果']),
  };

  const updates: Array<{ tableName: string; rowIndex: number; data: Record<string, any> }> = [];
  const mainData: Record<string, any> = {};
  const setField = (colIdx: number, val: any) => {
    if (colIdx > -1 && val !== undefined) {
      mainData[h[colIdx]] = val;
      row[colIdx] = val;
    }
  };
  setField(cols.name, newData.name);
  setField(cols.type, newData.type);
  setField(cols.count, newData.count);
  setField(cols.owner, newData.owner);
  setField(cols.desc, newData.desc);

  // 详情字段
  if (newData.details && Object.keys(newData.details).length > 0) {
    Object.entries(newData.details).forEach(([fieldName, fieldValue]) => {
      const fieldColIdx = h.findIndex((header: any) => header === fieldName);
      if (
        fieldColIdx > -1 &&
        fieldColIdx !== cols.name &&
        fieldColIdx !== cols.type &&
        fieldColIdx !== cols.count &&
        fieldColIdx !== cols.owner &&
        fieldColIdx !== cols.desc
      ) {
        row[fieldColIdx] = fieldValue;
        mainData[h[fieldColIdx]] = fieldValue;
      }
    });
  }

  if (Object.keys(mainData).length > 0) {
    updates.push({ tableName: src.table, rowIndex: src.rowIdx, data: mainData });
  }

  // 同步物品名称到其他表
  if (newData.name !== originalItem.name) {
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;
      if (sheet.name === src.table) return;

      const headers = sheet.content[0] || [];
      const itemNameColIdxs: number[] = [];
      headers.forEach((header: any, idx: number) => {
        if (
          header &&
          (String(header).includes('物品') ||
            String(header).includes('道具') ||
            String(header).includes('装备') ||
            String(header).includes('背包') ||
            String(header).includes('Item') ||
            String(header).includes('Equipment'))
        ) {
          itemNameColIdxs.push(idx);
        }
      });
      if (itemNameColIdxs.length === 0) return;

      for (let i = 1; i < sheet.content.length; i++) {
        const sheetRow = sheet.content[i];
        if (!sheetRow) continue;
        const rowUpdate: Record<string, any> = {};
        itemNameColIdxs.forEach(idx => {
          const rowValue = String(sheetRow[idx] || '').trim();
          if (rowValue === originalItem.name) {
            sheetRow[idx] = newData.name;
            rowUpdate[headers[idx]] = newData.name;
          }
        });
        if (Object.keys(rowUpdate).length > 0) {
          updates.push({ tableName: sheet.name, rowIndex: i, data: rowUpdate });
        }
      }
    });
  }

  const ok = await saveTableUpdates(api, updates, fullData);
  if (ok) {
    showToast(`物品"${newData.name || originalItem.name}"保存成功`, 'success');
    state.cachedData = processData(api.exportTableAsJson());
    $('.ci-edit-overlay').remove();
  } else {
    showToast('保存失败', 'error');
  }
}
