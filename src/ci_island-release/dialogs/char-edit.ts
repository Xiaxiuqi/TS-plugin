/**
 * 角色编辑弹窗
 * 包含 showCharEditDialog + saveCharData + deleteCharData
 *
 * 完整实现见原 src/ci_island_test/index.ts:2212 (showCharEditDialog)
 *                  src/ci_island_test/index.ts:1919 (saveCharData)
 *                  src/ci_island_test/index.ts:2166 (deleteCharData)
 */
import { ICONS, STORAGE_AVATAR_PREFIX } from '../core';
import { state } from '../core/state';
import { safeGetItem } from '../core/storage';
import { dbg } from '../core/utils';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates, saveTableDelete } from '../data/api';
import { processData } from '../data/processor';

declare const $: any;

/**
 * 显示角色编辑弹窗
 */
export function showCharEditDialog(d: any): void {
  dbg('[角色编辑弹窗] 打开角色编辑:', d.name);

  $('.ci-char-edit-overlay').remove();

  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + d.name, '');
  const avatarHtml = localImg
    ? `<img src="${localImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : d.name.charAt(0);

  const charExtra = state.cachedData.charExtraInfo?.[d.name] || {};
  let bodyStatusHtml = '';
  if (charExtra.bodyStatus && charExtra.bodyStatus.length > 0) {
    bodyStatusHtml +=
      '<div class="ci-input-group"><label>身体状态</label><div class="ci-input-row" style="flex-wrap:wrap;gap:8px;">';
    charExtra.bodyStatus.forEach((s: any, i: number) => {
      bodyStatusHtml += `
        <div class="ci-input-group" style="flex:1;min-width:80px;margin-bottom:0;" data-src-table="${s._src?.table || ''}" data-src-col="${s._src?.col || ''}">
          <label style="display:none;">${s.label}</label>
          <textarea class="ci-input-field" data-field="bodyStatus-${i}" data-label="${s.label}" rows="2">${s.value}</textarea>
        </div>`;
    });
    bodyStatusHtml += '</div></div>';
  }

  // 动态生成编辑界面
  const editFields: string[] = [];

  editFields.push(`
    <div class="ci-input-group">
      <label>姓名</label>
      <input class="ci-input-field" data-field="name" value="${d.name || ''}">
    </div>
  `);

  const basicFields: string[] = [];
  if (d.sex && d.sex.trim() !== '') {
    basicFields.push(`<div class="ci-input-group half"><label>性别</label><input class="ci-input-field" data-field="sex" value="${d.sex || ''}"></div>`);
  }
  if (d.age && d.age.trim() !== '') {
    basicFields.push(`<div class="ci-input-group half"><label>年龄</label><input class="ci-input-field" data-field="age" value="${d.age || ''}"></div>`);
  }
  if (basicFields.length > 0) {
    editFields.push(`<div class="ci-input-row">${basicFields.join('')}</div>`);
  }

  const roleFields: string[] = [];
  if (d.job && d.job.trim() !== '') {
    roleFields.push(`<div class="ci-input-group half"><label>职业</label><input class="ci-input-field" data-field="job" value="${d.job || ''}"></div>`);
  }
  if (d.identity && d.identity.trim() !== '') {
    roleFields.push(`<div class="ci-input-group half"><label>身份</label><input class="ci-input-field" data-field="identity" value="${d.identity || ''}"></div>`);
  }
  if (roleFields.length > 0) {
    editFields.push(`<div class="ci-input-row">${roleFields.join('')}</div>`);
  }

  if (state.cachedData.hasLongGoal && d.longGoal && d.longGoal.trim() !== '') {
    editFields.push(`<div class="ci-input-group"><label>长期目标</label><textarea class="ci-input-field" data-field="longGoal" rows="2">${d.longGoal || ''}</textarea></div>`);
  }

  if (bodyStatusHtml) {
    editFields.push(bodyStatusHtml);
  }

  const $overlay = $(`
    <div class="ci-char-edit-overlay ci-edit-overlay">
      <div class="ci-char-edit-card ci-edit-card" style="max-height:90vh;overflow-y:auto;max-width:95vw;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar">${avatarHtml}</div>
          <span class="ci-edit-title">编辑角色</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer">
          <button class="ci-edit-delete-btn">${ICONS.close} 删除角色</button>
          <button class="ci-edit-save-btn">${ICONS.save} 保存修改</button>
        </div>
      </div>
    </div>
  `);

  $overlay.find('.ci-edit-close').on('click', (e: any) => {
    e.stopPropagation();
    $overlay.remove();
  });

  $overlay.on('click', function (this: any, e: any) {
    e.stopPropagation();
    if (e.target === this) $overlay.remove();
  });

  $overlay.find('.ci-char-edit-card').on('click', (e: any) => e.stopPropagation());

  $overlay.find('.ci-edit-save-btn').on('click', async (e: any) => {
    e.stopPropagation();
    const newData: any = {
      name: $overlay.find('[data-field="name"]').val(),
      sex: $overlay.find('[data-field="sex"]').val(),
      age: $overlay.find('[data-field="age"]').val(),
      job: $overlay.find('[data-field="job"]').val(),
      identity: $overlay.find('[data-field="identity"]').val(),
      loc: $overlay.find('[data-field="loc"]').val(),
      longGoal: $overlay.find('[data-field="longGoal"]').val() || '',
      bodyStatus: [] as any[],
    };

    $overlay.find('[data-field^="bodyStatus-"]').each(function (this: any) {
      const $input = $(this);
      newData.bodyStatus.push({
        label: $input.data('label'),
        value: $input.val(),
      });
    });

    await saveCharData(d._src, newData);
    $overlay.remove();
  });

  $overlay.find('.ci-edit-delete-btn').on('click', async (e: any) => {
    e.stopPropagation();
    await deleteCharData(d._src);
    $overlay.remove();
  });

  $('body').append($overlay);
}

/**
 * 保存角色数据
 */
export async function saveCharData(src: any, newData: any): Promise<void> {
  const api = getApi();
  if (!api || !api.exportTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }
  if (!fullData.mate) fullData.mate = { type: 'chatSheets', version: 1 };

  let table: any = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }
  if (!table || !table.content) {
    showToast('数据表丢失: ' + src.table, 'error');
    return;
  }

  const h = table.content[0] || [];
  const getCol = (ns: string[]) =>
    h.findIndex((x: any) => x && ns.some(n => String(x).toLowerCase().includes(n.toLowerCase())));
  const cols = {
    name: getCol(['姓名', '名字', '名称']),
    sex: getCol(['性别']),
    age: getCol(['年龄', '岁数']),
    job: getCol(['职业']),
    identity: getCol(['身份']),
    loc: getCol(['地点', '位置', '所在地']),
    longGoal: getCol(['长期目标', '终极目标', '愿望']),
  };
  if (cols.name === -1) {
    showToast('找不到姓名列', 'error');
    return;
  }

  let targetRowIdx = -1;
  for (let i = 1; i < table.content.length; i++) {
    const row = table.content[i];
    if (row && row[cols.name] === src.originName) {
      targetRowIdx = i;
      break;
    }
  }
  if (targetRowIdx === -1) {
    showToast('找不到该角色: ' + src.originName, 'error');
    return;
  }
  const targetRow = table.content[targetRowIdx];

  const updates: Array<{ tableName: string; rowIndex: number; data: Record<string, any> }> = [];
  const mainData: Record<string, any> = {};

  const setField = (colIdx: number, val: any) => {
    if (colIdx > -1 && val !== undefined) {
      mainData[h[colIdx]] = val;
      targetRow[colIdx] = val;
    }
  };
  setField(cols.name, newData.name);
  setField(cols.sex, newData.sex);
  setField(cols.age, newData.age);
  setField(cols.job, newData.job);
  setField(cols.identity, newData.identity);
  setField(cols.loc, newData.loc);
  setField(cols.longGoal, newData.longGoal);

  if (Object.keys(mainData).length > 0) {
    updates.push({ tableName: src.table, rowIndex: targetRowIdx, data: mainData });
  }

  // 姓名同步：扫描所有表更新匹配的行
  if (newData.name !== src.originName) {
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;
      if (sheet.name === src.table) return;

      const headers = sheet.content[0] || [];
      const nameColIdx = headers.findIndex(
        (h: any) => h && ['角色', '姓名', '名字', '名称'].some(n => String(h).includes(n)),
      );
      if (nameColIdx === -1) return;

      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;
        const rowName = String(row[nameColIdx] || '').trim();
        if (rowName === src.originName) {
          row[nameColIdx] = newData.name;
          updates.push({
            tableName: sheet.name,
            rowIndex: i,
            data: { [headers[nameColIdx]]: newData.name },
          });
        }
      }
    });
  }

  const ok = await saveTableUpdates(api, updates, fullData);
  if (ok) {
    showToast('保存成功');
    state.cachedData = processData(api.exportTableAsJson());
    $('.ci-edit-overlay').remove();
  } else {
    showToast('保存失败', 'error');
  }
}

/**
 * 删除角色数据
 */
export async function deleteCharData(src: any): Promise<void> {
  if (!confirm(`确定要删除角色 ${src.originName} 吗？`)) return;
  const api = getApi();
  if (!api) return;
  const fullData = api.exportTableAsJson();
  if (!fullData) return;
  if (!fullData.mate) fullData.mate = { type: 'chatSheets', version: 1 };

  let table: any = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }
  if (!table) return;
  const h = table.content[0] || [];
  const nameIdx = h.findIndex((x: any) => x && String(x).includes('名'));
  let delIdx = -1;
  for (let i = 1; i < table.content.length; i++) {
    if (table.content[i][nameIdx] === src.originName) {
      delIdx = i;
      break;
    }
  }
  if (delIdx !== -1) {
    table.content.splice(delIdx, 1);
    const ok = await saveTableDelete(api, src.table, delIdx, fullData);
    if (ok) {
      showToast('删除成功');
      state.cachedData = processData(api.exportTableAsJson());
      $('.ci-edit-overlay').remove();
    } else {
      showToast('删除失败', 'error');
    }
  }
}
