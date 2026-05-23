/**
 * 技能编辑弹窗
 * 包含 openSkillEditModal + saveSkillData
 *
 * 完整实现见原 src/ci_island_test/index.ts:5466 (openSkillEditModal)
 *                  src/ci_island_test/index.ts:5598 (saveSkillData)
 */
import { ICONS } from '../core/icons';
import { state } from '../core/state';
import { isSystemColumn } from '../core/utils';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates } from '../data/api';
import { processData } from '../data/processor';

declare const $: any;

/**
 * 打开技能编辑模态弹窗
 */
export function openSkillEditModal(skill: any): void {
  $('.ci-skill-edit-overlay').remove();

  const editFields: string[] = [];

  editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">技能名称</label><input class="ci-input-field" data-field="name" value="${skill.name || ''}"></div>`);

  if (skill.type && skill.type.trim() !== '') {
    editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">类型/分类</label><input class="ci-input-field" data-field="type" value="${skill.type || ''}"></div>`);
  }

  if (skill.owner && skill.owner.trim() !== '') {
    editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">归属/拥有者</label><input class="ci-input-field" data-field="owner" value="${skill.owner || ''}"></div>`);
  }

  if (skill.desc && skill.desc.trim() !== '') {
    editFields.push(`<div class="ci-input-group" style="margin-bottom:12px;"><label class="ci-input-label">描述/效果</label><textarea class="ci-input-field" data-field="desc" rows="3">${skill.desc || ''}</textarea></div>`);
  }

  if (skill.details && Object.keys(skill.details).length > 0) {
    const excludeFields = ['名称', '技能名称', '技能名', 'Name', '类型', '技能类型', 'Type', '种类', 'Category', '描述', '效果', '说明', 'Desc', '拥有人', '持有者', '角色名', '姓名', '角色名称', 'Owner'];
    Object.entries(skill.details).forEach(([key, value]) => {
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
    <div class="ci-skill-edit-overlay ci-edit-overlay">
      <div class="ci-item-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.tool}</div>
          <span class="ci-edit-title">编辑技能</span>
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

    await saveSkillData(skill, newData);
    $overlay.remove();
  });
}

/**
 * 保存技能数据
 */
export async function saveSkillData(originalSkill: any, newData: any): Promise<void> {
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

  const src = originalSkill._src;
  if (!src || !src.table) {
    showToast('技能源信息不完整', 'error');
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
    showToast('未找到对应的技能数据表', 'error');
    return;
  }

  let row: any = null;
  if (src.rowIdx && table.content[src.rowIdx]) {
    row = table.content[src.rowIdx];
  }
  if (!row) {
    showToast('未找到对应的技能数据行', 'error');
    return;
  }

  const h = table.content[0];
  const getColIdx = (ns: string[]) =>
    h.findIndex((x: string) => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  const cols = {
    name: getColIdx(['技能名', '技能名称', '名称', 'Name']),
    type: getColIdx(['类型', '技能类型', 'Type', '种类', 'Category']),
    owner: getColIdx(['拥有人', '持有者', '角色名', '姓名', '角色名称', 'Owner']),
    desc: getColIdx(['描述', '效果', '说明', 'Desc']),
  };

  const rowData: Record<string, any> = {};
  const setField = (colIdx: number, val: any) => {
    if (colIdx > -1 && val !== undefined) {
      rowData[h[colIdx]] = val;
      row[colIdx] = val;
    }
  };
  setField(cols.name, newData.name);
  setField(cols.type, newData.type);
  setField(cols.owner, newData.owner);
  setField(cols.desc, newData.desc);

  if (newData.details && Object.keys(newData.details).length > 0) {
    Object.entries(newData.details).forEach(([fieldName, fieldValue]) => {
      const fieldColIdx = h.findIndex((header: any) => header === fieldName);
      if (
        fieldColIdx > -1 &&
        fieldColIdx !== cols.name &&
        fieldColIdx !== cols.type &&
        fieldColIdx !== cols.owner &&
        fieldColIdx !== cols.desc
      ) {
        row[fieldColIdx] = fieldValue;
        rowData[h[fieldColIdx]] = fieldValue;
      }
    });
  }

  const updates =
    Object.keys(rowData).length > 0
      ? [{ tableName: src.table, rowIndex: src.rowIdx, data: rowData }]
      : [];

  const ok = await saveTableUpdates(api, updates, fullData);
  if (ok) {
    showToast(`技能"${newData.name || originalSkill.name}"保存成功`, 'success');
    state.cachedData = processData(api.exportTableAsJson());
    $('.ci-edit-overlay').remove();
  } else {
    showToast('保存失败', 'error');
  }
}
