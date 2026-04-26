/**
 * 角色档案 HTML 构建器
 * 生成角色卡右侧的档案信息（属性雷达、身体特征、衣着、其他信息）
 */
import { generateRadarChart } from './radar';

/**
 * 构建角色档案 HTML（任务档案风格）
 * 替代原有的装备栏和物品栏，显示角色其他信息
 */
export function buildCharArchiveHtml(d: any, charExtra: any): string {
  let html = '<div class="ci-nb-right ci-archive-panel">';

  html += '<div class="ci-archive-content">';

  // 属性雷达图
  if (charExtra.stats && charExtra.stats.length > 0) {
    html += '<div class="ci-archive-section">';
    html += '<div class="ci-archive-section-title">属性信息</div>';

    if (charExtra.stats.length >= 3) {
      html += generateRadarChart(charExtra.stats);
    } else {
      // 不足3个属性显示列表
      html += '<div class="ci-archive-items ci-archive-dashed">';
      charExtra.stats.forEach((s: any) => {
        html += `
          <div class="ci-archive-item block-style radar-label-group" data-stat-name="${s.label}" style="cursor:pointer;">
            <span class="ci-archive-label">${s.label}</span>
            <span class="ci-archive-value" style="color:var(--ci-accent); font-weight:bold;">${s.value}</span>
          </div>`;
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // 身体特征区块
  if (charExtra.bodyInfoGroups && charExtra.bodyInfoGroups.length > 0) {
    charExtra.bodyInfoGroups.forEach((group: any) => {
      if (!group.items || (group.items.length === 0 && !group.notes)) return;
      html += '<div class="ci-archive-section">';
      html += `<div class="ci-archive-section-title">${group.colName}</div>`;
      html += '<div class="ci-archive-items">';
      group.items.forEach((item: any) => {
        html += `<div class="ci-archive-item block-style"><span class="ci-archive-label">${item.key}</span><span class="ci-archive-value">${item.value}</span></div>`;
      });
      html += '</div>';
      if (group.notes) {
        html += `<div class="ci-archive-notes">${group.notes}</div>`;
      }
      html += '</div>';
    });
  }

  // 衣着装扮区块
  if (charExtra.clothingGroups && charExtra.clothingGroups.length > 0) {
    charExtra.clothingGroups.forEach((group: any) => {
      if (!group.items || (group.items.length === 0 && !group.notes)) return;
      html += '<div class="ci-archive-section">';
      html += `<div class="ci-archive-section-title">${group.colName}</div>`;
      html += '<div class="ci-archive-items">';
      group.items.forEach((item: any) => {
        html += `<div class="ci-archive-item block-style"><span class="ci-archive-label">${item.key}</span><span class="ci-archive-value">${item.value}</span></div>`;
      });
      html += '</div>';
      if (group.notes) {
        html += `<div class="ci-archive-notes">${group.notes}</div>`;
      }
      html += '</div>';
    });
  }

  // 其他信息区块（按表名分组）
  if (charExtra.otherInfo && charExtra.otherInfo.length > 0) {
    const statsLabels = new Set((charExtra.stats || []).map((s: any) => s.label));

    charExtra.otherInfo.forEach((tableInfo: any) => {
      const items = (tableInfo.items || []).filter((item: any) => !statsLabels.has(item.label));

      if (items.length > 0) {
        html += '<div class="ci-archive-section">';
        html += `<div class="ci-archive-section-title">${tableInfo.tableName}</div>`;
        html += '<div class="ci-archive-items ci-archive-dashed">';
        items.forEach((item: any) => {
          html += `<div class="ci-archive-item block-style"><span class="ci-archive-label">${item.label}</span><span class="ci-archive-value">${item.value}</span></div>`;
        });
        html += '</div>';
        html += '</div>';
      }
    });
  }

  // 空状态
  if (
    (!charExtra.bodyStatus || charExtra.bodyStatus.length === 0) &&
    (!charExtra.bodyInfoGroups || charExtra.bodyInfoGroups.length === 0) &&
    (!charExtra.clothingGroups || charExtra.clothingGroups.length === 0) &&
    (!charExtra.otherInfo || charExtra.otherInfo.length === 0)
  ) {
    html += '<div class="ci-archive-empty">暂无档案信息</div>';
  }

  html += '</div>'; // .ci-archive-content
  html += '</div>'; // .ci-nb-right

  return html;
}
