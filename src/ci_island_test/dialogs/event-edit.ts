/**
 * 事件编辑弹窗
 *
 * 完整实现见原 src/ci_island_test/_backup/index.original.ts:11312 (showWorldInfoEventEdit)
 *                                                       2598 (saveEventData)
 *
 * 注：原代码使用 ICONS.task（icons.ts 未定义），这里改为 ICONS.star 作为视觉替代
 */
import { ICONS } from '../core';
import { state } from '../core/state';
import { showToast } from '../ui/toast';
import { getApi, saveTableUpdates } from '../data/api';
import { processData } from '../data/processor';

declare const $: any;

/**
 * 显示事件编辑弹窗
 */
export function showWorldInfoEventEdit(eventIndex: number): void {
  const tasks = state.cachedData.worldInfo?.tasks || [];
  const task = tasks[eventIndex];

  if (!task) {
    showToast('未找到对应的事件信息', 'error');
    return;
  }

  $('.ci-event-edit-overlay').remove();

  const editFields: string[] = [];

  if (task.name && task.name.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">事件名称</label>
        <input class="ci-input-field" data-field="name" value="${task.name || ''}">
      </div>
    `);
  }

  // 类型 + 状态
  const typeStatusFields: string[] = [];
  if (task.type && task.type.trim() !== '') {
    typeStatusFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">类型</label>
        <input class="ci-input-field" data-field="type" value="${task.type || ''}">
      </div>
    `);
  }
  if (task.status && task.status.trim() !== '') {
    typeStatusFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">状态</label>
        <input class="ci-input-field" data-field="status" value="${task.status || ''}">
      </div>
    `);
  }
  if (typeStatusFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row" style="display:flex; gap:12px; margin-bottom:12px;">
        ${typeStatusFields.join('')}
      </div>
    `);
  }

  // 时间 + 地点
  const timeLocationFields: string[] = [];
  if (task.time && task.time.trim() !== '') {
    timeLocationFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">时间</label>
        <input class="ci-input-field" data-field="time" value="${task.time || ''}">
      </div>
    `);
  }
  if (task.location && task.location.trim() !== '') {
    timeLocationFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">地点</label>
        <input class="ci-input-field" data-field="location" value="${task.location || ''}">
      </div>
    `);
  }
  if (timeLocationFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row" style="display:flex; gap:12px; margin-bottom:12px;">
        ${timeLocationFields.join('')}
      </div>
    `);
  }

  if (task.publisher && task.publisher.val && task.publisher.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.publisher.label || '发布者'}</label>
        <input class="ci-input-field" data-field="publisher" value="${task.publisher.val || ''}">
      </div>
    `);
  }

  if (task.executor && task.executor.val && task.executor.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.executor.label || '执行者'}</label>
        <input class="ci-input-field" data-field="executor" value="${task.executor.val || ''}">
      </div>
    `);
  }

  if (task.reward && task.reward.val && task.reward.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.reward.label || '奖励'}</label>
        <textarea class="ci-input-field" data-field="reward" rows="2">${task.reward.val || ''}</textarea>
      </div>
    `);
  }

  if (task.penalty && task.penalty.val && task.penalty.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.penalty.label || '惩罚'}</label>
        <textarea class="ci-input-field" data-field="penalty" rows="2">${task.penalty.val || ''}</textarea>
      </div>
    `);
  }

  if (task.desc && task.desc.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group">
        <label class="ci-input-label">描述/详情</label>
        <textarea class="ci-input-field" data-field="desc" rows="3">${task.desc || ''}</textarea>
      </div>
    `);
  }

  const taskIcon = ICONS.task || ICONS.star;

  const $overlay = $(`
    <div class="ci-event-edit-overlay ci-edit-overlay">
      <div class="ci-event-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${taskIcon}</div>
          <span class="ci-edit-title">编辑事件信息</span>
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
      type: $overlay.find('[data-field="type"]').val(),
      status: $overlay.find('[data-field="status"]').val(),
      time: $overlay.find('[data-field="time"]').val(),
      location: $overlay.find('[data-field="location"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      publisher: task.publisher
        ? {
            label: task.publisher.label,
            val: $overlay.find('[data-field="publisher"]').val(),
          }
        : null,
      executor: task.executor
        ? {
            label: task.executor.label,
            val: $overlay.find('[data-field="executor"]').val(),
          }
        : null,
      reward: task.reward
        ? {
            label: task.reward.label,
            val: $overlay.find('[data-field="reward"]').val(),
          }
        : null,
      penalty: task.penalty
        ? {
            label: task.penalty.label,
            val: $overlay.find('[data-field="penalty"]').val(),
          }
        : null,
    };

    await saveEventData(task, newData);
    $overlay.remove();
  });
}

/**
 * 保存事件数据
 */
export async function saveEventData(originalTask: any, newData: any): Promise<void> {
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
    if (/任务|行程|事件|事项|事务|日志/.test(tableName)) {
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      const nameIdx = getCol(h, ['名称', '任务名', '事件名', '标题', '事项', '事务', '日志']);
      if (nameIdx > -1) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[nameIdx] === originalTask.name) {
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
    showToast('未找到对应的事件数据表', 'error');
    return;
  }

  const h = targetTable.content[0] || [];
  const targetRow = targetTable.content[targetRowIndex];

  if (!targetRow) {
    showToast('未找到对应的事件数据行', 'error');
    return;
  }

  const cols = {
    name: getCol(h, ['名称', '任务名', '事件名', '标题', '事项', '事务', '日志']),
    type: getCol(h, ['类型', '种类', '分类', 'Category']),
    status: getCol(h, ['状态', '进度']),
    time: getCol(h, ['时间', '时限', '期限', '截止', '日期']),
    location: getCol(h, ['地点', '位置', '所在地', '目标地']),
    desc: getCol(h, ['描述', '内容', '详情', '说明']),
    publisher: getCol(h, ['发布', '发布人', '发布者', '发单']),
    executor: getCol(h, ['执行', '执行人', '执行者', '接单']),
    reward: getCol(h, ['奖励', '报酬', '酬劳']),
    penalty: getCol(h, ['惩罚', '惩处', '失败条件']),
  };

  const rowData: Record<string, any> = {};
  const setField = (colIdx: number, val: any) => {
    if (colIdx > -1 && val !== undefined) {
      rowData[h[colIdx]] = val;
      targetRow[colIdx] = val;
    }
  };
  setField(cols.name, newData.name);
  setField(cols.type, newData.type);
  setField(cols.status, newData.status);
  setField(cols.time, newData.time);
  setField(cols.location, newData.location);
  setField(cols.desc, newData.desc);
  setField(cols.publisher, newData.publisher?.val || '');
  setField(cols.executor, newData.executor?.val || '');
  setField(cols.reward, newData.reward?.val || '');
  setField(cols.penalty, newData.penalty?.val || '');

  const updates =
    Object.keys(rowData).length > 0
      ? [{ tableName: targetTable.name, rowIndex: targetRowIndex, data: rowData }]
      : [];

  const ok = await saveTableUpdates(api, updates, fullData);
  if (ok) {
    showToast(`事件"${newData.name || originalTask.name}"保存成功`, 'success');
    state.cachedData = processData(api.exportTableAsJson());
    $('.ci-edit-overlay').remove();
  } else {
    showToast('保存失败', 'error');
  }
}
