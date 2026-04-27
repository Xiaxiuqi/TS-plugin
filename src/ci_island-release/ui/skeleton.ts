/**
 * 浮岛 UI 骨架构建
 * 创建浮岛容器、按钮、面板、Toast、隐藏文件输入等 DOM 元素
 *
 * 完整实现见原 src/ci_island_test/index.ts:9307 createUI
 */
import { STORAGE_MAP_SIZE_KEY, STORAGE_PANEL_SIZE_KEY, STORAGE_POS_KEY } from '../core/constants';
import { ICONS } from '../core/icons';
import { safeGetItem } from '../core/storage';
import { constrainElement } from '../core/utils';

declare const $: any;

/**
 * 创建浮岛 UI（容器、按钮、面板等所有 DOM 元素）
 * @returns 主要的 jQuery 对象引用
 */
export function createUI(): {
  $con: any;
  $pan: any;
  $mapPan: any;
  $ops: any;
  $invMenu: any;
} {
  // 清理已有 UI
  $(
    '#ci-island-container, #ci-panel, #ci-map-panel, #ci-hidden-input, #ci-map-upload, #ci-toast, .ci-options-container',
  ).remove();

  // 隐藏文件输入（用于头像上传）
  $('body').append('<input type="file" id="ci-hidden-input" accept="image/*" style="display:none">');

  // Toast 容器
  $('body').append('<div id="ci-toast">浮岛 v1.5 载入成功</div>');

  // 浮岛主容器
  const $con = $(`
    <div id="ci-island-container" style="z-index:2000; display:flex;">
      <div class="ci-drag-grip">${ICONS.grip}</div>
      <button class="ci-btn" id="ci-main-trigger" title="角色列表">${ICONS.user}</button>
      <div class="ci-sub-buttons">
        <button class="ci-btn" data-type="main" title="主要人物">${ICONS.star}</button>
        <button class="ci-btn" data-type="relation" title="人物关系">${ICONS.relation}</button>
        <button class="ci-btn" data-type="inventory" title="物品仓库">${ICONS.inventory}</button>
      </div>
      <button class="ci-btn" id="ci-world-info-btn" title="世界信息">${ICONS.world}</button>
      <button class="ci-btn" id="ci-map-btn" title="世界地图">${ICONS.map}</button>
      <button class="ci-btn" id="ci-options-btn" title="选项">${ICONS.chat}</button>
      <button class="ci-btn" id="ci-refresh-btn" title="刷新数据">${ICONS.refresh}</button>
    </div>
  `);

  // 物品菜单容器
  const $invMenu = $(`
    <div class="ci-inventory-menu">
      <button class="ci-menu-bubble-btn" data-target="inventory">
        <div class="ci-bubble-icon">${ICONS.inventory}</div>
        <div class="ci-bubble-text">物品仓库</div>
      </button>
      <button class="ci-menu-bubble-btn" data-target="skills">
        <div class="ci-bubble-icon">${ICONS.tool}</div>
        <div class="ci-bubble-text">技能面板</div>
      </button>
    </div>
  `);

  // 选项气泡容器
  const $ops = $(`<div class="ci-options-container"></div>`);
  $('body').append($ops).append($invMenu);

  // 主角色面板
  const $pan = $(`
    <div id="ci-panel">
      <div class="ci-panel-header ci-drag-handle">
        <span id="ci-panel-title">角色列表</span>
        <div style="display:flex;gap:10px;">
          <span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span>
          <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
          <span class="ci-close-btn">${ICONS.close}</span>
        </div>
      </div>
      <div class="ci-tab-bar">
        <div class="ci-tab active" data-tab="main">
          <span class="ci-tab-icon">${ICONS.star}</span>
          <span class="ci-tab-text">主要人物</span>
        </div>
        <div class="ci-tab" data-tab="side">
          <span class="ci-tab-icon">${ICONS.group}</span>
          <span class="ci-tab-text">次要人物</span>
        </div>
        <div class="ci-tab" data-tab="retired">
          <span class="ci-tab-icon">${ICONS.ghost}</span>
          <span class="ci-tab-text">已离场</span>
        </div>
      </div>
      <div class="ci-panel-content"><div class="ci-grid-view"></div></div>
      <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
      <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
    </div>
  `);

  // 地图面板
  const $mapPan = $(`
    <div id="ci-map-panel">
      <div class="ci-panel-header ci-drag-handle">
        <span>地图</span>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="ci-save-layout-btn" style="display:none; cursor:pointer;" title="保存布局">${ICONS.save}</span>
          <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
          <span class="ci-close-btn">${ICONS.close}</span>
        </div>
      </div>
      <div id="ci-map-content">
        <div class="ci-map-controls">
          <div class="ci-map-btn-circle" id="ci-zoom-in">${ICONS.plus}</div>
          <div class="ci-map-btn-circle" id="ci-zoom-out">${ICONS.minus}</div>
        </div>
        <svg id="ci-map-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
      <div class="ci-split-handle"></div>
      <div class="ci-external-areas"></div>
      <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
      <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
    </div>
  `);

  $('body').append($con).append($pan).append($mapPan);

  // Toast 显示
  setTimeout(() => {
    $('#ci-toast').addClass('show');
    setTimeout(() => $('#ci-toast').removeClass('show'), 3000);
  }, 500);

  // 恢复保存的位置和大小
  try {
    const pos = JSON.parse(safeGetItem(STORAGE_POS_KEY, 'null'));
    if (pos && typeof pos.top === 'number' && typeof pos.left === 'number' && !isNaN(pos.top) && !isNaN(pos.left)) {
      $con.css({ top: pos.top, left: pos.left, right: 'auto' });
    } else {
      $con.css({ top: '150px', right: '80px', left: 'auto' });
    }
    const size = JSON.parse(safeGetItem(STORAGE_PANEL_SIZE_KEY, 'null'));
    if (size) $pan.css({ width: size.width, height: size.height });
    const mapSize = JSON.parse(safeGetItem(STORAGE_MAP_SIZE_KEY, 'null'));
    if (mapSize) $mapPan.css({ width: mapSize.width, height: mapSize.height });
  } catch (e) {
    console.error('[浮岛] Restore position failed', e);
    $con.css({ top: '150px', right: '80px', left: 'auto' });
  }

  // 创建子面板（人物关系/物品仓库/技能/世界信息）
  createSubPanels();

  // 延迟约束位置（确保位置不超出窗口）
  setTimeout(() => {
    try {
      constrainElement($con);
    } catch (e) {
      console.error('Constrain failed', e);
      $con.css({ top: '150px', right: '80px', left: 'auto' });
    }
  }, 500);

  return { $con, $pan, $mapPan, $ops, $invMenu };
}

/**
 * 创建子面板（人物关系/物品仓库/技能/世界信息）
 */
function createSubPanels(): void {
  // 人物关系面板
  $(`
    <div id="ci-relation-panel" class="ci-panel ci-sub-panel" data-panel-type="relation">
      <div class="ci-panel-header ci-drag-handle">
        <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.relation}</span>人物关系</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
          <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
        </div>
      </div>
      <div class="ci-panel-content ci-relation-content"></div>
      <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
      <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
    </div>
  `).appendTo('body');

  // 物品仓库面板
  $(`
    <div id="ci-inventory-panel" class="ci-panel ci-sub-panel" data-panel-type="inventory">
      <div class="ci-panel-header ci-drag-handle">
        <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.inventory}</span>物品仓库</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span>
          <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
          <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
        </div>
      </div>
      <div class="ci-panel-content ci-inventory-content"></div>
      <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
      <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
    </div>
  `).appendTo('body');

  // 技能面板
  $(`
    <div id="ci-skills-panel" class="ci-panel ci-sub-panel" data-panel-type="skills">
      <div class="ci-panel-header ci-drag-handle">
        <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.tool}</span>技能面板</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span>
          <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
          <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
        </div>
      </div>
      <div class="ci-panel-content ci-skills-content"></div>
      <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
      <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
    </div>
  `).appendTo('body');

  // 世界信息面板
  $(`
    <div id="ci-worldinfo-panel" class="ci-panel ci-sub-panel" data-panel-type="worldinfo">
      <div class="ci-panel-header ci-drag-handle">
        <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.world}</span>世界信息</span>
        <div style="display:flex; gap:4px; align-items:center;">
          <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
          <span class="ci-edit-btn" title="编辑">${ICONS.edit}</span>
          <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
        </div>
      </div>
      <div class="ci-panel-content ci-worldinfo-content"></div>
      <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
      <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
    </div>
  `).appendTo('body');
}
