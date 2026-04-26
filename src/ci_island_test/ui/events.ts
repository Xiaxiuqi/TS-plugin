
/**
 * 浮岛全局事件绑定（完整迁移版）
 *
 * 完整迁移自原 src/ci_island_test/_backup/index.original.ts:9524-10713 (bindEvents 函数)
 *
 * 包含：
 * - 浮岛主按钮点击 / 拖动 / 调整大小
 * - 6 大面板触发按钮
 * - 物品仓库菜单（双视图切换）
 * - 选项气泡按钮 + 刷新按钮
 * - 标签栏切换
 * - 各面板的 close/edit/pin 按钮
 * - 全局点击外部关闭逻辑（含子面板栈管理）
 * - 隐藏文件输入（avatar 上传）
 * - 地图缩放按钮 + 主角属性气泡
 * - 子面板点击空白处关闭
 * - 拖动 + 调整大小（主面板 + 地图 + 子面板）
 *
 * 注：模块化的 panels/map 模块自带 bindMapControls/bindMapSplitter，
 * SVG 拖拽/缩放/分割条事件由 map 模块自身管理，本文件不重复绑定。
 */
import { state } from '../core/state';
import {
  dbg,
  handleDrag,
  constrainElement,
  sendGameActionRequest,
  getProtagonistName,
} from '../core/utils';
import { STORAGE_POS_KEY, STORAGE_PANEL_SIZE_KEY, STORAGE_MAP_SIZE_KEY } from '../core/constants';
import { safeSetItem } from '../core/storage';
import { showToast } from './toast';
import {
  openPanel,
  closePanel,
  closeAll,
  collapseIsland,
  syncPanelPosition,
  updateHeightClass,
  bringToFront,
} from './panel-manager';

declare const $: any;

// ============================================================================
// 事件回调接口
// ============================================================================

export interface EventCallbacks {
  refreshData?: () => void;
  renderGrid?: (type: string, $pan: any) => void;
  renderRelationGraph?: ($container: any) => void;
  renderInventoryPanel?: ($container: any, mode?: string) => void;
  renderSkillsPanel?: ($container: any, mode?: string) => void;
  renderWorldInfoPanel?: ($container: any) => void;
  renderMap?: () => void;
  /** 加载头像裁剪库 + 创建裁剪弹窗（来自 dialogs/avatar/cropper） */
  loadCropperLibrary?: (cb: () => void) => void;
  createCropperModal?: (imgData: string, char: any) => void;
  /** 世界信息编辑入口弹窗（来自 dialogs/worldinfo-edit） */
  showWorldInfoEditOverlay?: () => void;
  /** 保存地图布局（来自 panels/map） */
  saveMapLayout?: () => void;
}

// ============================================================================
// 编辑模式切换
// ============================================================================

/**
 * 切换编辑模式
 */
export function toggleEditMode(callbacks: EventCallbacks = {}): void {
  state.isEditing = !state.isEditing;

  // 同步所有编辑按钮状态
  $('.ci-edit-btn').toggleClass('active', state.isEditing);

  // 更新所有相关容器的编辑样式类
  $(
    '#ci-panel, #ci-map-panel, #ci-inventory-panel, #ci-skills-panel, #ci-worldinfo-panel, #ci-relation-panel',
  ).toggleClass('ci-editing', state.isEditing);

  if (state.isEditing) $('.ci-save-layout-btn').show();
  else $('.ci-save-layout-btn').hide();

  showToast(state.isEditing ? '进入编辑模式' : '退出编辑模式');

  // 编辑模式切换后重绘内容以显示/隐藏遮罩
  if (state.isMapOpen && callbacks.renderMap) callbacks.renderMap();
  if (state.isInventoryOpen && callbacks.renderInventoryPanel) {
    const $invContent = $('#ci-inventory-panel .ci-inventory-content');
    const viewMode = $invContent.find('.ci-inv-tab.active').data('view') || 'warehouse';
    callbacks.renderInventoryPanel($invContent, viewMode);
  }
  if (state.isSkillsOpen && callbacks.renderSkillsPanel) {
    const $skillsContent = $('#ci-skills-panel .ci-skills-content');
    const viewMode = $skillsContent.find('.ci-inv-tab.active').data('view') || 'character';
    callbacks.renderSkillsPanel($skillsContent, viewMode);
  }
}

// ============================================================================
// 辅助：选项气泡 / 物品菜单 位置同步
// ============================================================================

function syncOptionsPosition(islandLeft: number, _islandTop: number): void {
  if (!state.isOptionsOpen) return;
  const $ops = $('.ci-options-container');
  if (!$ops.length) return;
  const win = window.top || window;
  const winW = win.innerWidth || 1024;
  const winH = win.innerHeight || 768;
  const gap = 15;
  const islandW = 44;
  const opsH = $ops.outerHeight() || 100;
  const padding = 10;

  let targetLeft: any = 'auto';
  let targetRight: any = 'auto';
  let align = 'flex-end';
  let isFlipped = false;

  if (islandLeft < winW / 2) {
    targetLeft = islandLeft + islandW + gap + 'px';
    align = 'flex-start';
    isFlipped = true;
  } else {
    targetRight = winW - islandLeft + gap + 'px';
    isFlipped = false;
  }

  let targetTop = _islandTop;
  if (targetTop + opsH > winH) targetTop = Math.max(padding, winH - opsH - padding);
  if (targetTop < padding) targetTop = padding;

  $ops.css({
    position: 'fixed',
    left: targetLeft,
    right: targetRight,
    top: targetTop + 'px',
    transform: 'none',
    alignItems: align,
    zIndex: 2147483647,
  });
  if (isFlipped) $ops.find('.ci-option-bubble').addClass('flipped');
  else $ops.find('.ci-option-bubble').removeClass('flipped');
}

function syncInventoryMenuPosition(islandLeft: number, _islandTop: number): void {
  if (!state.isInventoryMenuOpen) return;
  const $menu = $('.ci-inventory-menu');
  if (!$menu.length) return;

  const $invBtn = $('.ci-btn[data-type="inventory"]');
  if (!$invBtn.length) return;

  const win = window.top || window;
  const winW = win.innerWidth || 1024;
  const winH = win.innerHeight || 768;
  const gap = 15;
  const islandW = 44;
  const menuH = $menu.outerHeight() || 100;
  const padding = 10;

  // 关键修复：直接用 getBoundingClientRect()(视口坐标) 计算按钮中心
  // 之前的 islandTop + relativeY 在 jQuery .offset() 与 rect 的滚动差异下会产生偏差，
  // 导致菜单被错位到浮岛顶部。菜单是 position: fixed，自然就该用视口坐标。
  const btnRect = $invBtn[0].getBoundingClientRect();
  const btnCenterY = btnRect.top + btnRect.height / 2;
  let targetTop = btnCenterY - menuH / 2;

  let targetLeft: any = 'auto';
  let targetRight: any = 'auto';
  let align = 'flex-end';
  let isFlipped = false;

  if (islandLeft < winW / 2) {
    // 浮岛在左侧：菜单在右侧显示
    targetLeft = islandLeft + islandW + gap + 'px';
    align = 'flex-start';
    isFlipped = true;
  } else {
    // 浮岛在右侧：菜单在左侧显示
    targetRight = winW - islandLeft + gap + 'px';
    isFlipped = false;
  }

  if (targetTop + menuH > winH) targetTop = Math.max(padding, winH - menuH - padding);
  if (targetTop < padding) targetTop = padding;

  $menu.css({
    position: 'fixed',
    left: targetLeft,
    right: targetRight,
    top: targetTop + 'px',
    alignItems: align,
    zIndex: 2147483647,
  });

  if (isFlipped) $menu.addClass('flipped');
  else $menu.removeClass('flipped');
}

// ============================================================================
// 主入口：bindEvents
// ============================================================================

export function bindEvents(
  $con: any,
  $pan: any,
  $ops: any,
  $mapPan: any,
  callbacks: EventCallbacks = {},
): void {
  // ---------------- 通用面板点击置顶 ----------------
  $(document).on('mousedown touchstart', '.ci-panel, #ci-map-panel', function (this: any) {
    const id = $(this).attr('id');
    if (id) {
      bringToFront('#' + id);
    }
  });

  // ---------------- 编辑按钮 ----------------
  $('.ci-edit-btn').on('click', function (e: any) {
    e.stopPropagation();
    toggleEditMode(callbacks);
  });

  // 世界信息面板专用编辑按钮（事件委托）
  $(document)
    .off('click.ci_world_edit')
    .on('click.ci_world_edit', '#ci-worldinfo-panel .ci-edit-btn', function (e: any) {
      e.stopPropagation();
      if (callbacks.showWorldInfoEditOverlay) {
        callbacks.showWorldInfoEditOverlay();
      }
    });

  // ---------------- 角色面板图钉按钮 ----------------
  $('body').on('click', '#ci-panel .ci-pin-btn', function (this: any, e: any) {
    e.stopPropagation();
    const $btn = $(this);
    const $panel = $('#ci-panel');
    const newPinnedState = !$btn.hasClass('active');

    $btn.toggleClass('active', newPinnedState);
    $panel.toggleClass('pinned', newPinnedState);

    if (newPinnedState) {
      $panel.css('max-width', '');
    }

    showToast(newPinnedState ? '角色面板已固定' : '角色面板取消固定');
  });

  // ---------------- 通用关闭按钮 ----------------
  $('body').on('click', '.ci-panel .ci-close-btn', function (this: any, e: any) {
    e.stopPropagation();
    const $panel = $(this).closest('.ci-panel, #ci-map-panel');
    $panel.removeClass('visible');

    const panelId = $panel.attr('id');
    const panelType = $panel.data('panel-type');

    dbg('[UI] 关闭面板: ' + panelId + ' ' + panelType);

    if (panelId === 'ci-panel') {
      state.activeCategory = null;
      $('.ci-btn[data-type]').removeClass('active');
      $('#ci-panel').removeClass('pinned');
      $('#ci-panel .ci-pin-btn').removeClass('active');
    } else if (panelId === 'ci-map-panel') {
      state.isMapOpen = false;
      $('#ci-map-btn').removeClass('active');
    } else if (panelType === 'relation') {
      state.isRelationOpen = false;
      $('.ci-btn[data-type="relation"]').removeClass('active');
    } else if (panelType === 'inventory') {
      state.isInventoryOpen = false;
      $('.ci-btn[data-type="inventory"]').removeClass('active');
    } else if (panelType === 'skills') {
      state.isSkillsOpen = false;
      if (!state.isInventoryOpen) {
        $('.ci-btn[data-type="inventory"]').removeClass('active');
      }
    } else if (panelType === 'worldinfo') {
      state.isWorldInfoOpen = false;
      $('#ci-world-info-btn').removeClass('active');
    }
  });

  // ---------------- 通用图钉按钮 ----------------
  $('body').on(
    'click',
    '.ci-panel .ci-pin-btn, #ci-map-panel .ci-pin-btn',
    function (this: any, e: any) {
      e.stopPropagation();
      const $btn = $(this);
      const $panel = $btn.closest('.ci-panel, #ci-map-panel');
      $btn.toggleClass('active');
      $panel.toggleClass('pinned');

      if ($panel.is('#ci-map-panel')) {
        state.isMapPinned = $panel.hasClass('pinned');
      }

      if ($panel.hasClass('pinned')) {
        $panel.css('max-width', '');
      }

      showToast($panel.hasClass('pinned') ? '面板已固定' : '面板已解除固定');
    },
  );

  // ---------------- 浮岛拖动 ----------------
  const $grip = $con.find('.ci-drag-grip');
  bindIslandDrag($con, $pan, $mapPan, $grip);

  // ---------------- 窗口大小调整 ----------------
  const handleResize = () => {
    requestAnimationFrame(() => {
      const safePos = constrainElement($con);
      if ($pan.hasClass('visible')) syncPanelPosition($con, $pan, safePos.left, safePos.top);
      if ($mapPan.hasClass('visible') && !state.isMapPinned)
        syncPanelPosition($con, $mapPan, safePos.left, safePos.top);
      $('.ci-sub-panel.visible:not(.pinned)').each(function (this: any) {
        syncPanelPosition($con, $(this), safePos.left, safePos.top);
      });
      if (state.isOptionsOpen) syncOptionsPosition(safePos.left, safePos.top);
      if (state.isInventoryMenuOpen) syncInventoryMenuPosition(safePos.left, safePos.top);
    });
  };
  $(window).on('resize', handleResize);
  try {
    $(window.parent).on('resize', handleResize);
  } catch (e) {
    // Ignore cross-origin errors
  }

  // ---------------- 面板拖动（主面板 + 地图面板） ----------------
  $pan
    .add($mapPan)
    .find('.ci-drag-handle')
    .each(function (this: any) {
      const $header = $(this);
      const $targetPanel = $header.closest('#ci-panel, #ci-map-panel');
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;
      handleDrag(
        $header,
        (start: any, e: any) => {
          if (
            $(e.target).closest('.ci-close-btn, .ci-edit-btn, .ci-pin-btn, .ci-save-layout-btn')
              .length
          )
            return;
          state.isGlobalDragging = true;
          startX = start.clientX;
          startY = start.clientY;
          startLeft = parseInt($targetPanel.css('left'), 10) || 0;
          startTop = parseInt($targetPanel.css('top'), 10) || 0;
          $targetPanel.addClass('no-transition');
          $targetPanel.css('max-width', '');
        },
        (curr: any, e: any) => {
          if (e.cancelable) e.preventDefault();
          requestAnimationFrame(() => {
            const deltaX = curr.clientX - startX;
            const deltaY = curr.clientY - startY;
            $targetPanel.css({ left: startLeft + deltaX, top: startTop + deltaY });
          });
        },
        () => {
          $targetPanel.removeClass('no-transition');
          setTimeout(() => {
            state.isGlobalDragging = false;
          }, 300);
        },
      );
    });

  // ---------------- 面板调整大小（主面板 + 地图面板） ----------------
  $pan
    .add($mapPan)
    .find('.ci-resize-handle')
    .each(function (this: any) {
      const $handle = $(this);
      const mode = $handle.data('mode');
      const $targetPanel = $handle.closest('#ci-panel, #ci-map-panel');
      let startX = 0;
      let startY = 0;
      let startW = 0;
      let startH = 0;
      let startLeft = 0;

      handleDrag(
        $handle,
        (start: any, e: any) => {
          e.stopPropagation();
          state.isGlobalDragging = true;
          startX = start.clientX;
          startY = start.clientY;
          startW = $targetPanel.width();
          startH = $targetPanel.height();
          startLeft = parseInt($targetPanel.css('left'), 10) || 0;
          $targetPanel.addClass('no-transition');
        },
        (curr: any, e: any) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          requestAnimationFrame(() => {
            const deltaX = curr.clientX - startX;
            const deltaY = curr.clientY - startY;
            const newH = Math.max(200, startH + deltaY);
            let newW = startW;
            if (mode === 'br') {
              newW = Math.max(250, startW + deltaX);
              $targetPanel.css({ width: newW + 'px', height: newH + 'px' });
            } else {
              newW = Math.max(250, startW - deltaX);
              const newLeft = startLeft + (startW - newW);
              $targetPanel.css({
                width: newW + 'px',
                height: newH + 'px',
                left: newLeft + 'px',
              });
            }
          });
        },
        () => {
          $targetPanel.removeClass('no-transition');
          setTimeout(() => {
            state.isGlobalDragging = false;
          }, 100);
          if ($targetPanel.is('#ci-panel')) {
            safeSetItem(
              STORAGE_PANEL_SIZE_KEY,
              JSON.stringify({
                width: $targetPanel.width(),
                height: $targetPanel.height(),
              }),
            );
          } else {
            safeSetItem(
              STORAGE_MAP_SIZE_KEY,
              JSON.stringify({
                width: $targetPanel.width(),
                height: $targetPanel.height(),
              }),
            );
          }
        },
      );
    });

  // ---------------- 主触发按钮 ----------------
  $('#ci-main-trigger').on('click', function (e: any) {
    e.stopPropagation();
    if (state.isExpanded) {
      closeAll($con, $pan, $mapPan);
    } else {
      state.isExpanded = true;
      $con.addClass('expanded');
      updateHeightClass($con);
      const offset = $con.offset();
      syncPanelPosition($con, $pan, offset.left, offset.top);
    }
  });

  // ---------------- 主要角色按钮（角色面板） ----------------
  $con.find('.ci-btn[data-type="main"]').on('click', function (this: any, e: any) {
    e.stopPropagation();
    if (state.activeCategory && $pan.hasClass('visible')) {
      closePanel('#ci-panel');
      $(this).removeClass('active');
      state.activeCategory = null;
      return;
    }
    state.activeCategory = 'main';
    state.isExpanded = true;
    $con.addClass('expanded');
    $(this).addClass('active');
    $pan.find('.ci-tab-bar').show();
    $pan.find('.ci-tab').removeClass('active');
    $pan.find('.ci-tab[data-tab="main"]').addClass('active');
    if (callbacks.renderGrid) {
      callbacks.renderGrid('main', $pan);
    }
    openPanel('#ci-panel');
    updateHeightClass($con);
  });

  // ---------------- 标签切换（主要/次要/已离场） ----------------
  $pan.find('.ci-tab').on('click', function (this: any, e: any) {
    e.stopPropagation();
    const tab = $(this).data('tab');
    $pan.find('.ci-tab').removeClass('active');
    $(this).addClass('active');
    state.activeCategory = tab;
    if (callbacks.renderGrid) {
      callbacks.renderGrid(tab, $pan);
    }
  });

  // ---------------- 人物关系按钮 ----------------
  $con.find('.ci-btn[data-type="relation"]').on('click', function (this: any, e: any) {
    e.stopPropagation();

    const $relPanel = $('#ci-relation-panel');
    if ($relPanel.length === 0) {
      showToast('人物关系面板未初始化', 'error');
      return;
    }

    if (state.isRelationOpen) {
      closePanel('#ci-relation-panel');
      state.isRelationOpen = false;
      $(this).removeClass('active');
    } else {
      openPanel('#ci-relation-panel');
      state.isRelationOpen = true;
      $(this).addClass('active');
      if (callbacks.renderRelationGraph) {
        callbacks.renderRelationGraph($relPanel.find('.ci-relation-content'));
      }
    }
  });

  // ---------------- 物品仓库按钮（双视图菜单 / 直接打开） ----------------
  $con.find('.ci-btn[data-type="inventory"]').on('click', function (this: any, e: any) {
    e.stopPropagation();

    if (state.cachedData.hasSkillsTable) {
      state.isInventoryMenuOpen = !state.isInventoryMenuOpen;
      const $menu = $('.ci-inventory-menu');

      if (state.isInventoryMenuOpen) {
        // 先定位再显示（避免菜单在没有 left/top 时短暂出现在浮岛顶部）
        const offset = $con.offset();
        $menu.addClass('visible');
        // syncInventoryMenuPosition 内部使用 getBoundingClientRect 计算按钮中心
        // 不再依赖 offset.top（保留 islandLeft 用于左/右侧判断）
        syncInventoryMenuPosition(offset.left, offset.top);
        $(this).addClass('active');
      } else {
        $menu.removeClass('visible');
        if (!state.isInventoryOpen && !state.isSkillsOpen) {
          $(this).removeClass('active');
        }
      }
      return;
    }

    // 没有技能表：直接打开物品仓库
    const $invPanel = $('#ci-inventory-panel');
    if ($invPanel.length === 0) {
      showToast('物品仓库面板未初始化', 'error');
      return;
    }

    if (state.isInventoryOpen) {
      closePanel('#ci-inventory-panel');
      state.isInventoryOpen = false;
      $(this).removeClass('active');
    } else {
      openPanel('#ci-inventory-panel');
      state.isInventoryOpen = true;
      $(this).addClass('active');
      if (callbacks.renderInventoryPanel) {
        callbacks.renderInventoryPanel($invPanel.find('.ci-inventory-content'));
      }
    }
  });

  // ---------------- 物品菜单按钮（仓库/技能） ----------------
  $('.ci-menu-bubble-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    const target = $(this).data('target');
    const $menu = $('.ci-inventory-menu');

    state.isInventoryMenuOpen = false;
    $menu.removeClass('visible');

    if (target === 'inventory') {
      const $invPanel = $('#ci-inventory-panel');
      if (!state.isInventoryOpen) {
        openPanel('#ci-inventory-panel');
        state.isInventoryOpen = true;
        $('.ci-btn[data-type="inventory"]').addClass('active');
        if (callbacks.renderInventoryPanel) {
          callbacks.renderInventoryPanel($invPanel.find('.ci-inventory-content'));
        }
      }
    } else if (target === 'skills') {
      if (!state.isSkillsOpen) {
        openPanel('#ci-skills-panel');
        state.isSkillsOpen = true;
        $('.ci-btn[data-type="inventory"]').addClass('active');
        if (callbacks.renderSkillsPanel) {
          callbacks.renderSkillsPanel($('#ci-skills-panel .ci-skills-content'));
        }
      }
    }
  });

  // ---------------- 世界信息按钮 ----------------
  $('#ci-world-info-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();

    const $worldPanel = $('#ci-worldinfo-panel');
    if ($worldPanel.length === 0) {
      showToast('世界信息面板未初始化', 'error');
      return;
    }

    if (state.isWorldInfoOpen) {
      closePanel('#ci-worldinfo-panel');
      state.isWorldInfoOpen = false;
      $(this).removeClass('active');
    } else {
      openPanel('#ci-worldinfo-panel');
      state.isWorldInfoOpen = true;
      $(this).addClass('active');
      if (callbacks.renderWorldInfoPanel) {
        callbacks.renderWorldInfoPanel($worldPanel.find('.ci-worldinfo-content'));
      }
    }
  });

  // ---------------- 地图按钮 ----------------
  $('#ci-map-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    state.isMapOpen = !state.isMapOpen;
    const $btn = $(this);
    if (state.isMapOpen) {
      $btn.addClass('active');
      openPanel('#ci-map-panel');
      if (callbacks.renderMap) callbacks.renderMap();
    } else {
      $btn.removeClass('active');
      closePanel('#ci-map-panel');
      state.isMapPinned = false;
      $mapPan.removeClass('pinned');
      $('.ci-pin-btn').removeClass('active');
    }
  });

  // ---------------- 刷新按钮 ----------------
  $('#ci-refresh-btn').on('click', function (e: any) {
    e.stopPropagation();
    if (callbacks.refreshData) {
      callbacks.refreshData();
      showToast('数据已刷新');
    } else {
      showToast('无法连接数据库', 'error');
    }
  });

  // ---------------- 主面板关闭按钮（特殊处理：active 复位） ----------------
  $pan.find('.ci-close-btn').on('click', (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    closePanel('#ci-panel');
    state.activeCategory = null;
    $('.ci-btn[data-type="main"]').removeClass('active');
  });

  // ---------------- 地图面板关闭按钮 ----------------
  $mapPan.find('.ci-close-btn').on('click', (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    state.isMapOpen = false;
    state.isMapPinned = false;
    $mapPan.removeClass('pinned');
    $('#ci-map-btn').removeClass('active');
    closePanel('#ci-map-panel');
  });

  // 地图面板：保存布局按钮
  $mapPan.find('.ci-save-layout-btn').on('click', function (e: any) {
    e.stopPropagation();
    if (callbacks.saveMapLayout) {
      callbacks.saveMapLayout();
    }
  });

  // 地图面板的图钉按钮（独立 active 状态同步）
  $mapPan.find('.ci-pin-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    state.isMapPinned = !state.isMapPinned;
    $(this).toggleClass('active', state.isMapPinned);
    $mapPan.toggleClass('pinned', state.isMapPinned);
    showToast(state.isMapPinned ? '地图已固定' : '地图取消固定');
  });

  // ---------------- 主角属性气泡（雷达图标签） ----------------
  $('body').on('click', '.radar-label-group', function (this: any, e: any) {
    e.stopPropagation();
    const $this = $(this);
    const statName = $this.data('stat-name');
    const $card = $this.closest('.ci-card');
    const charName = $card.find('.ci-card-name').text();
    const protagonistName = getProtagonistName();

    $('.ci-stat-bubble').remove();

    const $bubble = $(`<div class="ci-stat-bubble">锻炼</div>`);
    $('body').append($bubble);

    const rect = (this as HTMLElement).getBoundingClientRect();
    $bubble.css({
      top: rect.top - 30 + 'px',
      left: rect.left + rect.width / 2 - 20 + 'px',
    });

    $bubble.on('click', function (ev: any) {
      ev.stopPropagation();
      let message = '';
      const isProtagonist = charName === protagonistName || charName.includes('主角');

      if (isProtagonist) {
        message = `主角决定锻炼一下自己，提升一下自己的${statName}`;
      } else {
        message = `${charName}在主角的劝说下，决定锻炼一下自己，提升一下自己的${statName}`;
      }

      sendGameActionRequest(message);
      $bubble.remove();
    });
  });

  // ---------------- 选项气泡按钮 ----------------
  $('#ci-options-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();

    const $btn = $(this);
    if ($btn.data('clicking')) {
      dbg('[选项按钮] 点击防抖中，忽略');
      return;
    }
    $btn.data('clicking', true);
    setTimeout(() => $btn.data('clicking', false), 300);

    state.isOptionsOpen = !state.isOptionsOpen;

    if (state.isOptionsOpen) {
      $ops.empty();
      if (state.optionsData && state.optionsData.length) {
        state.optionsData.forEach((opt: string) => {
          const $bubble = $(`<div class="ci-option-bubble">${opt}</div>`);
          $bubble.on('click', (ev: any) => {
            ev.stopPropagation();
            sendGameActionRequest(opt);
            state.isOptionsOpen = false;
            $ops.removeClass('visible');
            setTimeout(() => $ops.empty(), 300);
          });
          $ops.append($bubble);
        });
        $ops.addClass('visible');
        const offset = $con.offset();
        syncOptionsPosition(offset.left, offset.top);
      }
    } else {
      $ops.removeClass('visible');
      setTimeout(() => $ops.empty(), 300);
    }
  });

  // ---------------- 地图缩放按钮（备用：map 模块也会自己绑定） ----------------
  // 这里保留以兼容，但 panels/map/bindMapControls 会用 .off('click').on('click') 覆盖
  // 不重复绑定 SVG 拖动 / 分割条等地图内部交互（已由 map 模块处理）

  // ---------------- 隐藏文件输入（avatar 上传） ----------------
  $('#ci-hidden-input').on('click', function (this: any, e: any) {
    e.stopPropagation();
  });
  $('#ci-hidden-input').on('change', function (this: any, e: any) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      $(this).val('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt: any) => {
      const res = evt.target.result;
      if (state.currentUploadChar) {
        $('.ci-avatar-selection-modal').remove();
        if (callbacks.loadCropperLibrary && callbacks.createCropperModal) {
          callbacks.loadCropperLibrary(() => {
            callbacks.createCropperModal!(res, state.currentUploadChar);
          });
        }
      }
    };
    reader.readAsDataURL(file);
    $(this).val('');
  });

  // ---------------- 全局点击外部关闭 ----------------
  bindGlobalClickHandler($con);

  // ---------------- 子面板统一关闭/图钉/拖拽/调整大小 ----------------
  bindSubPanelEvents();

  // ---------------- 子面板点击空白处关闭 ----------------
  bindSubPanelBackgroundClose();
}

// ============================================================================
// 浮岛拖动
// ============================================================================

function bindIslandDrag($con: any, $pan: any, $mapPan: any, $grip: any): void {
  handleDrag(
    $grip,
    (start: any) => {
      state.drag.active = true;
      state.isGlobalDragging = true;
      state.drag.startX = start.clientX;
      state.drag.startY = start.clientY;
      const offset = $con.offset();
      state.drag.initialLeft = offset.left;
      state.drag.initialTop = offset.top;
      $pan.addClass('no-transition');
      if (!state.isMapPinned) $mapPan.addClass('no-transition');
      $('.ci-sub-panel:not(.pinned)').addClass('no-transition');
    },
    (curr: any) => {
      if (state.drag.rafId) cancelAnimationFrame(state.drag.rafId);
      state.drag.rafId = requestAnimationFrame(() => {
        const deltaX = curr.clientX - state.drag.startX;
        const deltaY = curr.clientY - state.drag.startY;
        const newLeft = state.drag.initialLeft + deltaX;
        const newTop = state.drag.initialTop + deltaY;
        $con.css({ left: newLeft, top: newTop, right: 'auto' });

        if ($pan.hasClass('visible')) {
          syncPanelPosition($con, $pan, newLeft, newTop);
        }
        if ($mapPan.hasClass('visible') && !state.isMapPinned) {
          syncPanelPosition($con, $mapPan, newLeft, newTop);
        }
        $('.ci-sub-panel.visible:not(.pinned)').each(function (this: any) {
          syncPanelPosition($con, $(this), newLeft, newTop);
        });

        if (state.isOptionsOpen) syncOptionsPosition(newLeft, newTop);
        if (state.isInventoryMenuOpen) syncInventoryMenuPosition(newLeft, newTop);
      });
    },
    () => {
      state.drag.active = false;
      if (state.drag.rafId) cancelAnimationFrame(state.drag.rafId);
      $pan.removeClass('no-transition');
      $mapPan.removeClass('no-transition');
      $('.ci-sub-panel').removeClass('no-transition');

      const safePos = constrainElement($con);

      if ($pan.hasClass('visible')) {
        syncPanelPosition($con, $pan, safePos.left, safePos.top);
      }
      if ($mapPan.hasClass('visible') && !state.isMapPinned) {
        syncPanelPosition($con, $mapPan, safePos.left, safePos.top);
      }
      $('.ci-sub-panel.visible:not(.pinned)').each(function (this: any) {
        syncPanelPosition($con, $(this), safePos.left, safePos.top);
      });

      safeSetItem(STORAGE_POS_KEY, JSON.stringify({ top: safePos.top, left: safePos.left }));
      if (state.isOptionsOpen) syncOptionsPosition(safePos.left, safePos.top);
      if (state.isInventoryMenuOpen) syncInventoryMenuPosition(safePos.left, safePos.top);
      setTimeout(() => {
        state.isGlobalDragging = false;
      }, 300);
    },
  );
}

// ============================================================================
// 全局点击外部关闭逻辑
// ============================================================================

function bindGlobalClickHandler($con: any): void {
  const globalClickHandler = (e: any) => {
    if (state.isGlobalDragging || state.drag.active) return;

    const $target = $(e.target);

    // [Priority 0] 功能按钮豁免
    if (
      $target.closest(
        '.ci-edit-btn, .ci-pin-btn, .ci-close-btn, .ci-refresh-btn, .ci-news-history-btn',
      ).length
    ) {
      return;
    }

    // 1. 选项菜单
    if ($target.closest('.ci-options-container').length || $target.closest('#ci-options-btn').length) {
      return;
    }
    if (state.isOptionsOpen) {
      dbg('[全局点击] 点击空白处，关闭选项气泡');
      state.isOptionsOpen = false;
      $('.ci-options-container').removeClass('visible');
      setTimeout(() => $('.ci-options-container').empty(), 300);
      if (e && e.stopPropagation) e.stopPropagation();
      return;
    }

    // 1.5 物品菜单
    if (
      $target.closest('.ci-inventory-menu').length ||
      $target.closest('.ci-btn[data-type="inventory"]').length
    ) {
      return;
    }
    if (state.isInventoryMenuOpen) {
      state.isInventoryMenuOpen = false;
      $('.ci-inventory-menu').removeClass('visible');
      if (!state.isInventoryOpen && !state.isSkillsOpen) {
        $('.ci-btn[data-type="inventory"]').removeClass('active');
      }
      return;
    }

    // 2. 地图选项气泡
    if (!$target.closest('.ci-map-popup-options').length) {
      $('.ci-map-popup-options').remove();
    }

    // 2.1 属性锻炼气泡
    if (!$target.closest('.ci-stat-bubble').length) {
      $('.ci-stat-bubble').remove();
    }

    // 3. 模态弹窗/遮罩层
    if (
      $target.closest(
        '.ci-edit-overlay, .ci-settings-overlay, .ci-item-detail-overlay, .ci-inv-modal, .ci-char-select-overlay, .ci-gift-confirm-overlay',
      ).length
    ) {
      return;
    }

    // 4. 角色卡弹出层
    const $popupCard = $('.ci-popup-card-container, .ci-item-card-popup');
    if ($popupCard.length) {
      if (
        $target.closest('.ci-popup-card-container, .ci-item-card-popup').length ||
        $target.closest('.ci-edit-btn, .ci-pin-btn, .ci-close-btn').length
      ) {
        return;
      }

      // 物品卡 → 直接关闭
      if ($popupCard.hasClass('ci-item-card-popup')) {
        $popupCard.remove();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      }

      const $cardInner = $popupCard.find('.ci-card');
      if ($cardInner.hasClass('is-expanded')) {
        dbg('[全局点击] 收起弹出卡片');
        $cardInner.removeClass('is-expanded');
        $cardInner.find('.ci-expanded-box').hide();
        $cardInner.find('.ci-card-compact').show();
        $cardInner.find('.ci-nb-right').removeClass('full-width');
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      } else {
        dbg('[全局点击] 关闭弹出卡片');
        $popupCard.remove();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      }
    }

    // 5. 面板栈处理（LIFO）
    if (state.panelStack.length > 0) {
      const topPanelSelector = state.panelStack[state.panelStack.length - 1];
      const $topPanel = $(topPanelSelector);

      if ($target.closest(topPanelSelector).length) {
        bringToFront(topPanelSelector);
        return;
      }

      if ($target.closest('#ci-island-container').length) {
        return;
      }

      if ($topPanel.hasClass('pinned')) {
        return;
      }

      dbg('[全局点击] 点击外部，关闭顶层面板:', topPanelSelector);
      closePanel(topPanelSelector);

      // 同步状态变量
      if (topPanelSelector === '#ci-relation-panel') {
        state.isRelationOpen = false;
        $('.ci-btn[data-type="relation"]').removeClass('active');
      } else if (topPanelSelector === '#ci-inventory-panel') {
        state.isInventoryOpen = false;
        $('.ci-btn[data-type="inventory"]').removeClass('active');
      } else if (topPanelSelector === '#ci-skills-panel') {
        state.isSkillsOpen = false;
        if (!state.isInventoryOpen) {
          $('.ci-btn[data-type="inventory"]').removeClass('active');
        }
      } else if (topPanelSelector === '#ci-worldinfo-panel') {
        state.isWorldInfoOpen = false;
        $('#ci-world-info-btn').removeClass('active');
      } else if (topPanelSelector === '#ci-panel') {
        state.activeCategory = null;
        $('.ci-btn[data-type]').removeClass('active');
      } else if (topPanelSelector === '#ci-map-panel') {
        if (!state.isMapPinned) {
          state.isMapOpen = false;
          $('#ci-map-btn').removeClass('active');
        } else if ($topPanel.hasClass('pinned')) {
          $topPanel.addClass('visible');
        }
      }
      return;
    }

    // 6. 浮岛折叠
    const isPanelOpen = $('#ci-panel').hasClass('visible');
    const isMapOpen = state.isMapOpen;
    const isSubPanelOpen =
      state.isRelationOpen || state.isInventoryOpen || state.isWorldInfoOpen || state.isSkillsOpen;

    if (state.isExpanded && !isPanelOpen && !isMapOpen && !isSubPanelOpen) {
      if (!$target.closest('#ci-island-container').length) {
        collapseIsland($con);
      }
    }
  };

  $(document).off('click.ci_global').on('click.ci_global', globalClickHandler);
  try {
    $(window.parent.document).off('click.ci_global').on('click.ci_global', globalClickHandler);
  } catch (e) {
    // Ignore cross-origin errors
  }
}

// ============================================================================
// 子面板事件统一绑定
// ============================================================================

function bindSubPanelEvents(): void {
  // 子面板关闭按钮（事件委托）
  $(document)
    .off('click.ci_sub_close')
    .on('click.ci_sub_close', '.ci-sub-panel .ci-close-btn', function (this: any, e: any) {
      e.stopPropagation();
      e.preventDefault();
      const $panel = $(this).closest('.ci-sub-panel');
      const panelType = $panel.data('panel-type');
      const panelId = $panel.attr('id');

      if (panelId) {
        closePanel('#' + panelId);
      } else {
        $panel.removeClass('visible');
      }

      if (panelType === 'relation') {
        state.isRelationOpen = false;
        $('.ci-btn[data-type="relation"]').removeClass('active');
        $('#ci-relation-panel').removeClass('pinned');
      } else if (panelType === 'inventory') {
        state.isInventoryOpen = false;
        $('.ci-btn[data-type="inventory"]').removeClass('active');
      } else if (panelType === 'skills') {
        state.isSkillsOpen = false;
        if (!state.isInventoryOpen) {
          $('.ci-btn[data-type="inventory"]').removeClass('active');
        }
      } else if (panelType === 'worldinfo') {
        state.isWorldInfoOpen = false;
        $('#ci-world-info-btn').removeClass('active');
      }
    });

  // 子面板图钉按钮（事件委托）
  $(document)
    .off('click.ci_sub_pin')
    .on('click.ci_sub_pin', '.ci-sub-panel .ci-pin-btn', function (this: any, e: any) {
      e.stopPropagation();
      const $btn = $(this);
      const $panel = $btn.closest('.ci-sub-panel');
      const newPinnedState = !$btn.hasClass('active');

      $btn.toggleClass('active', newPinnedState);
      $panel.toggleClass('pinned', newPinnedState);

      if (newPinnedState) {
        $panel.css('max-width', '');
      }

      showToast(newPinnedState ? '面板已固定' : '面板取消固定');
    });

  // 子面板拖拽和调整大小
  $('.ci-sub-panel').each(function (this: any) {
    const $subPanel = $(this);
    const $header = $subPanel.find('.ci-panel-header');

    // 拖拽
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    handleDrag(
      $header,
      (start: any, e: any) => {
        if ($(e.target).closest('.ci-close-btn, .ci-refresh-btn, .ci-pin-btn').length) return;
        state.isGlobalDragging = true;
        startX = start.clientX;
        startY = start.clientY;
        startLeft = parseInt($subPanel.css('left'), 10) || 0;
        startTop = parseInt($subPanel.css('top'), 10) || 0;
        $subPanel.addClass('no-transition');
        $subPanel.css('max-width', '');
      },
      (curr: any, e: any) => {
        if (e.cancelable) e.preventDefault();
        requestAnimationFrame(() => {
          const deltaX = curr.clientX - startX;
          const deltaY = curr.clientY - startY;
          $subPanel.css({ left: startLeft + deltaX, top: startTop + deltaY });
        });
      },
      () => {
        $subPanel.removeClass('no-transition');
        setTimeout(() => {
          state.isGlobalDragging = false;
        }, 100);
      },
    );

    // 调整大小
    $subPanel.find('.ci-resize-handle').each(function (this: any) {
      const $handle = $(this);
      const mode = $handle.data('mode');
      let resStartX = 0;
      let resStartY = 0;
      let resStartW = 0;
      let resStartH = 0;
      let resStartLeft = 0;
      handleDrag(
        $handle,
        (start: any, e: any) => {
          e.stopPropagation();
          state.isGlobalDragging = true;
          resStartX = start.clientX;
          resStartY = start.clientY;
          resStartW = $subPanel.width() || 400;
          resStartH = $subPanel.height() || 600;
          resStartLeft = parseInt($subPanel.css('left'), 10) || 0;
          $subPanel.addClass('no-transition');
        },
        (curr: any, e: any) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          requestAnimationFrame(() => {
            const deltaX = curr.clientX - resStartX;
            const deltaY = curr.clientY - resStartY;
            const newH = Math.max(200, resStartH + deltaY);
            let newW = resStartW;
            if (mode === 'br') {
              newW = Math.max(250, resStartW + deltaX);
              $subPanel.css({ width: newW + 'px', height: newH + 'px' });
            } else {
              newW = Math.max(250, resStartW - deltaX);
              const newLeft = resStartLeft + (resStartW - newW);
              $subPanel.css({
                width: newW + 'px',
                height: newH + 'px',
                left: newLeft + 'px',
              });
            }
          });
        },
        () => {
          $subPanel.removeClass('no-transition');
          setTimeout(() => {
            state.isGlobalDragging = false;
          }, 100);
        },
      );
    });
  });
}

// ============================================================================
// 子面板点击空白处关闭
// ============================================================================

function bindSubPanelBackgroundClose(): void {
  // 人物关系面板
  $(document)
    .off('click.ci_rel_bg')
    .on('click.ci_rel_bg', '#ci-relation-panel', function (this: any, e: any) {
      const $target = $(e.target);
      const $panel = $('#ci-relation-panel');

      if ($panel.hasClass('pinned')) return;
      if (state.isGlobalDragging) return;

      if (
        $target.is('#ci-relation-panel') ||
        $target.is('.ci-relation-content') ||
        $target.is('.ci-panel-content')
      ) {
        dbg('[子面板背景关闭] 关闭人物关系面板');
        $panel.removeClass('visible');
        state.isRelationOpen = false;
        $('.ci-btn[data-type="relation"]').removeClass('active');
      }
    });

  // 物品仓库面板
  $(document)
    .off('click.ci_inv_bg')
    .on('click.ci_inv_bg', '#ci-inventory-panel', function (this: any, e: any) {
      const $target = $(e.target);
      const $panel = $('#ci-inventory-panel');

      if ($panel.hasClass('pinned')) return;

      if (
        $target.is('#ci-inventory-panel') ||
        $target.is('.ci-inventory-content') ||
        $target.is('.ci-panel-content')
      ) {
        $panel.removeClass('visible');
        state.isInventoryOpen = false;
        $('.ci-btn[data-type="inventory"]').removeClass('active');
      }
    });

  // 技能面板
  $(document)
    .off('click.ci_skills_bg')
    .on('click.ci_skills_bg', '#ci-skills-panel', function (this: any, e: any) {
      const $target = $(e.target);
      const $panel = $('#ci-skills-panel');

      if ($panel.hasClass('pinned')) return;
      if (state.isGlobalDragging) return;

      if (
        $target.is('#ci-skills-panel') ||
        $target.is('.ci-skills-content') ||
        $target.is('.ci-panel-content')
      ) {
        $panel.removeClass('visible');
        state.isSkillsOpen = false;
        if (!state.isInventoryOpen) {
          $('.ci-btn[data-type="inventory"]').removeClass('active');
        }
      }
    });

  // 世界信息面板
  $(document)
    .off('click.ci_world_bg')
    .on('click.ci_world_bg', '#ci-worldinfo-panel', function (this: any, e: any) {
      const $target = $(e.target);
      const $panel = $('#ci-worldinfo-panel');

      if ($panel.hasClass('pinned')) return;

      if (
        $target.is('#ci-worldinfo-panel') ||
        $target.is('.ci-worldinfo-content') ||
        $target.is('.ci-panel-content')
      ) {
        $panel.removeClass('visible');
        state.isWorldInfoOpen = false;
        $('#ci-world-info-btn').removeClass('active');
      }
    });
}
