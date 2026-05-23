/**
 * 势力编辑弹窗
 *
 * 完整实现见原 src/ci_island_test/_backup/index.original.ts:11184 (showWorldInfoForceEdit)
 *                                                       2402 (saveForceData)
 */
import { ICONS } from '../core';
import { state } from '../core/state';
import { dbg } from '../core/utils';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates } from '../data/api';
import { processData } from '../data/processor';

declare const $: any;

/**
 * 显示势力编辑弹窗
 */
export function showWorldInfoForceEdit(forceIndex: number): void {
  const forces = state.cachedData.worldInfo?.forces || [];
  const force = forces[forceIndex];

  if (!force) {
    showToast('未找到对应的势力信息', 'error');
    return;
  }

  $('.ci-force-edit-overlay').remove();

  const editFields: string[] = [];

  if (force.name && force.name.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">势力名称</label>
        <input class="ci-input-field" data-field="name" value="${force.name || ''}">
      </div>
    `);
  }

  if (force.leader && force.leader.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">领袖/首领</label>
        <input class="ci-input-field" data-field="leader" value="${force.leader || ''}">
      </div>
    `);
  }

  if (force.purpose && force.purpose.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">宗旨/理念</label>
        <textarea class="ci-input-field" data-field="purpose" rows="2">${force.purpose || ''}</textarea>
      </div>
    `);
  }

  if (force.desc && force.desc.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">描述/介绍</label>
        <textarea class="ci-input-field" data-field="desc" rows="3">${force.desc || ''}</textarea>
      </div>
    `);
  }

  if (force.details && Object.keys(force.details).length > 0) {
    const detailsFields = Object.entries(force.details)
      .filter(([_key, value]) => value && String(value).trim() !== '')
      .map(
        ([key, value]) => `
        <div class="ci-input-group" style="margin-bottom:8px;">
          <label style="font-size:12px; color:#666;">${key}</label>
          <input class="ci-input-field" data-field="detail-${key}" value="${value || ''}" style="font-size:12px;">
        </div>
      `,
      )
      .join('');

    if (detailsFields) {
      editFields.push(`
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid #eee;">
          <div style="font-size:13px; font-weight:500; margin-bottom:8px; color:#666;">其他信息</div>
          ${detailsFields}
        </div>
      `);
    }
  }

  const $overlay = $(`
    <div class="ci-force-edit-overlay ci-edit-overlay">
      <div class="ci-force-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.relation}</div>
          <span class="ci-edit-title">编辑势力信息</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1;">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer" style="padding:16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
          <button class="ci-edit-save-btn">${ICONS.save} 保存修改</button>
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
      leader: $overlay.find('[data-field="leader"]').val(),
      purpose: $overlay.find('[data-field="purpose"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      details: {},
    };

    $overlay.find('[data-field^="detail-"]').each(function (this: any) {
      const key = $(this).data('field').replace('detail-', '');
      const value = $(this).val();
      if (value) {
        newData.details[key] = value;
      }
    });

    await saveForceData(force, newData);
    $overlay.remove();
  });
}

/**
 * 保存势力数据
 */
export async function saveForceData(originalForce: any, newData: any): Promise<void> {
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

  if (!fullData.mate) {
    fullData.mate = { type: 'chatSheets', version: 1 };
  }

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => String(x).toLowerCase().includes(n.toLowerCase())));

  let targetTable: any = null;
  let targetRowIndex = -1;

  const allTables = Object.values(fullData);
  for (const table of allTables as any[]) {
    if (!table || !table.name || !table.content || !table.content[0]) continue;

    const tableName = table.name;
    const nameLower = tableName.toLowerCase();
    if (
      nameLower.includes('组织') ||
      nameLower.includes('势力') ||
      nameLower.includes('团体') ||
      nameLower.includes('阵营') ||
      nameLower.includes('faction') ||
      nameLower.includes('group')
    ) {
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      const nameIdx = getCol(h, [
        '名称',
        '名字',
        '组织',
        '势力',
        '团体',
        '阵营',
        '组织名',
        '势力名',
        '团体名',
        '阵营名',
        'Faction',
        'Group',
      ]);

      if (nameIdx > -1) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[nameIdx] === originalForce.name) {
            targetTable = table;
            targetRowIndex = i + 1;
            break;
          }
        }
      }

      if (targetTable) break;
    }
  }

  if (!targetTable || targetRowIndex === -1) {
    showToast('未找到对应的势力数据表', 'error');
    return;
  }

  const h = targetTable.content[0] || [];
  const targetRow = targetTable.content[targetRowIndex];

  if (!targetRow) {
    showToast('未找到对应的势力数据行', 'error');
    return;
  }

  const cols = {
    name: getCol(h, [
      '名称',
      '名字',
      '组织',
      '势力',
      '团体',
      '阵营',
      '组织名',
      '势力名',
      '团体名',
      '阵营名',
      'Faction',
      'Group',
    ]),
    leader: getCol(h, ['领袖', '首领', '领导', '头目', '负责人', 'Leader']),
    purpose: getCol(h, ['宗旨', '目的', '理念', '目标', 'Purpose']),
    desc: getCol(h, ['描述', '介绍', '简介', '详情', 'Description']),
  };

  const updates: Array<{ tableName: string; rowIndex: number; data: Record<string, any> }> = [];
  const mainData: Record<string, any> = {};
  if (cols.name > -1 && newData.name !== undefined) {
    mainData[h[cols.name]] = newData.name;
    targetRow[cols.name] = newData.name;
  }
  if (cols.leader > -1 && newData.leader !== undefined) {
    mainData[h[cols.leader]] = newData.leader;
    targetRow[cols.leader] = newData.leader;
  }
  if (cols.purpose > -1 && newData.purpose !== undefined) {
    mainData[h[cols.purpose]] = newData.purpose;
    targetRow[cols.purpose] = newData.purpose;
  }
  if (cols.desc > -1 && newData.desc !== undefined) {
    mainData[h[cols.desc]] = newData.desc;
    targetRow[cols.desc] = newData.desc;
  }

  if (newData.details) {
    Object.entries(newData.details).forEach(([key, value]) => {
      const detailIdx = h.findIndex(
        (header: any) => header && String(header).toLowerCase().includes(key.toLowerCase()),
      );
      if (detailIdx > -1) {
        targetRow[detailIdx] = value;
        mainData[h[detailIdx]] = value;
      }
    });
  }

  if (Object.keys(mainData).length > 0) {
    updates.push({ tableName: targetTable.name, rowIndex: targetRowIndex, data: mainData });
  }

  // 同步势力名称到其他表
  if (newData.name !== originalForce.name) {
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;
      if (sheet.name === targetTable.name) return;

      const headers = sheet.content[0] || [];
      const forceNameColIdxs: number[] = [];
      headers.forEach((header: any, idx: number) => {
        if (
          header &&
          (String(header).includes('势力') ||
            String(header).includes('组织') ||
            String(header).includes('Faction') ||
            String(header).includes('Group') ||
            String(header).includes('阵营') ||
            String(header).includes('团体'))
        ) {
          forceNameColIdxs.push(idx);
        }
      });
      if (forceNameColIdxs.length === 0) return;

      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;
        const rowUpdate: Record<string, any> = {};
        forceNameColIdxs.forEach(idx => {
          const rowValue = String(row[idx] || '').trim();
          if (rowValue === originalForce.name) {
            row[idx] = newData.name;
            rowUpdate[headers[idx]] = newData.name;
            dbg(`[势力名称同步] ${sheet.name} 第${i}行 ${headers[idx]}: ${originalForce.name} -> ${newData.name}`);
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
    showToast(`势力"${newData.name || originalForce.name}"保存成功`, 'success');
    state.cachedData = processData(api.exportTableAsJson());
    $('.ci-edit-overlay').remove();
  } else {
    showToast('保存失败', 'error');
  }
}
