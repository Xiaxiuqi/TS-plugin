// ACU Visualizer 测试版表格顺序模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中表格顺序存储、标签拖拽排序、顺序菜单、保存/取消逻辑。
// 迁移原则：保留原 localStorage key、DOM class、事件命名空间和保存/取消语义，不夹带优化。

import { getCore } from '../core/bridge.js';
import { acuMenuItemContent, STORAGE_KEYS } from '../core/constants.js';
import { state } from '../core/state.js';
import { startRowOrderEditing, stopRowOrderEditing } from './row-sort.js';
import { activateSavedOrFirstTab, bindTabClickEvents, getActiveTabState } from './tabs.js';

export function getSavedTableOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TABLE_ORDER);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

export function saveTableOrder(tableNames) {
  try {
    localStorage.setItem(STORAGE_KEYS.TABLE_ORDER, JSON.stringify(tableNames));
  } catch (e) {
    console.error('保存表格顺序失败:', e);
  }
}

export function getOrderedTableNames(tables) {
  if (!tables) return [];
  const savedOrder = getSavedTableOrder();
  const currentTableNames = Object.keys(tables);
  if (!savedOrder) return currentTableNames;

  const orderedNames = [];
  const usedNames = new Set();

  savedOrder.forEach(tableName => {
    if (currentTableNames.includes(tableName) && !usedNames.has(tableName)) {
      orderedNames.push(tableName);
      usedNames.add(tableName);
    }
  });

  currentTableNames.forEach(tableName => {
    if (!usedNames.has(tableName)) {
      orderedNames.push(tableName);
      usedNames.add(tableName);
    }
  });

  return orderedNames;
}

export function initDragSort(deps = {}) {
  const { $ } = deps.core || getCore();
  const $tabsContainer = $('#acu-tabs-sortable');
  if (!$tabsContainer.length) return;

  const $tabs = $tabsContainer.find('.acu-tab-btn');
  let dragStartIndex = -1;
  const originalOrder = [];

  $tabs.each(function () {
    originalOrder.push($(this).clone(true));
  });

  $tabs.attr('draggable', 'true');
  $tabsContainer.off('.acu-drag');

  $tabsContainer.on('dragstart.acu-drag', '.acu-tab-btn', function (e) {
    if (!state.flags.isEditingOrder) return;
    const $this = $(this);
    dragStartIndex = $tabsContainer.find('.acu-tab-btn').index($this);
    $this.addClass('dragging');
    if (e.originalEvent?.dataTransfer) {
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('text/plain', dragStartIndex);
    }
  });

  $tabsContainer.on('dragend.acu-drag', '.acu-tab-btn', function () {
    $('.acu-tab-btn').removeClass('dragging drag-over');
  });

  $tabsContainer.on('dragover.acu-drag', '.acu-tab-btn', function (e) {
    if (!state.flags.isEditingOrder) return;
    e.preventDefault();
    const $this = $(this);
    if (!$this.hasClass('dragging')) {
      $('.acu-tab-btn').removeClass('drag-over');
      $this.addClass('drag-over');
    }
  });

  $tabsContainer.on('drop.acu-drag', '.acu-tab-btn', function (e) {
    if (!state.flags.isEditingOrder) return;
    e.preventDefault();
    const $dropTarget = $(this);
    const $draggedItem = $tabsContainer.find('.acu-tab-btn.dragging');
    if ($dropTarget.hasClass('dragging') || !$draggedItem.length) return;

    const dragIndex = parseInt(e.originalEvent.dataTransfer.getData('text/plain'));
    const dropIndex = $tabsContainer.find('.acu-tab-btn').index($dropTarget);
    if (dragIndex !== dropIndex) {
      if (dragIndex < dropIndex) {
        $dropTarget.after($draggedItem);
      } else {
        $dropTarget.before($draggedItem);
      }
    }
    $dropTarget.removeClass('drag-over');
  });

  return originalOrder;
}

export function showOrderMenu(event, deps = {}) {
  const { $ } = deps.core || getCore();
  const $existingMenu = $('.acu-order-menu');
  if ($existingMenu.length > 0) {
    $existingMenu.remove();
    return;
  }

  $('.acu-cell-menu, .acu-edit-overlay').remove();
  const isNightMode = $('.acu-table-container').hasClass('night-mode');
  const config = deps.getConfig ? deps.getConfig() : { theme: 'retro' };

  const menuHtml = `
      <div class="acu-cell-menu acu-order-menu acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}" style="z-index: 10005;">
          <div class="acu-cell-menu-item" data-action="tab-order">${acuMenuItemContent('tabs', `编辑标签顺序${state.flags.isEditingOrder ? ' (开启中)' : ''}`)}</div>
          <div class="acu-cell-menu-item" data-action="row-order">${acuMenuItemContent('rows', `编辑行内容顺序${state.flags.isEditingRowOrder ? ' (开启中)' : ''}`)}</div>
          <div class="acu-cell-menu-item close" data-action="close">${acuMenuItemContent('close', '关闭菜单')}</div>
      </div>`;

  const $menu = $(menuHtml);
  $('body').append($menu);
  $menu.css({ left: `${event.clientX}px`, top: `${event.clientY}px`, position: 'fixed' });

  $menu.find('.acu-cell-menu-item').on('click', function () {
    const action = $(this).data('action');
    if (action === 'tab-order') {
      if (state.flags.isEditingRowOrder) stopRowOrderEditing(deps);
      if (state.flags.isEditingOrder) saveTableOrderFromUI(deps);
      else startOrderEditing(deps);
    } else if (action === 'row-order') {
      if (state.flags.isEditingOrder) cancelOrderEditing(deps);
      if (state.flags.isEditingRowOrder) stopRowOrderEditing(deps);
      else startRowOrderEditing(deps);
    }
    $menu.remove();
  });

  const closeOrderMenu = e => {
    if (!$menu.is(e.target) && $menu.has(e.target).length === 0) {
      $menu.remove();
      document.removeEventListener('click', closeOrderMenu);
      if (window.parent && window.parent.document) {
        window.parent.document.removeEventListener('click', closeOrderMenu);
      }
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeOrderMenu);
    if (window.parent && window.parent.document && window.parent.document !== document) {
      window.parent.document.addEventListener('click', closeOrderMenu);
    }
  }, 100);
  event.stopPropagation();
}

export function startOrderEditing(deps = {}) {
  const { $ } = deps.core || getCore();
  state.flags.isEditingOrder = true;
  $('.acu-table-container').addClass('editing-order');
  $('#acu-order-controls').addClass('visible');
  $('.acu-order-edit-btn').css({ opacity: '0.3', 'pointer-events': 'none' });
  window.acuOriginalOrder = initDragSort(deps);
}

export function saveTableOrderFromUI(deps = {}) {
  const { $ } = deps.core || getCore();
  const $tabs = $('#acu-tabs-sortable').find('.acu-tab-btn');
  const tableNames = [];
  $tabs.each(function () {
    const tableName = $(this).data('table-name');
    if (tableName) tableNames.push(tableName);
  });
  saveTableOrder(tableNames);
  state.flags.isEditingOrder = false;
  $('.acu-table-container').removeClass('editing-order');
  $('#acu-order-controls').removeClass('visible');
  $('.acu-order-edit-btn').css({ opacity: '1', 'pointer-events': 'auto' });
  $('.acu-tab-btn').removeAttr('draggable').off('dragstart.acu dragend.acu dragover.acu drop.acu');
  deps.showNotification?.('表格顺序已保存', 'success');
}

export function cancelOrderEditing(deps = {}) {
  const { $ } = deps.core || getCore();
  if (state.flags.isEditingRowOrder) {
    stopRowOrderEditing(deps);
    return;
  }

  if (window.acuOriginalOrder && window.acuOriginalOrder.length > 0) {
    const $tabsContainer = $('#acu-tabs-sortable');
    $tabsContainer.empty();
    window.acuOriginalOrder.forEach($tabClone => {
      $tabsContainer.append($tabClone);
    });
    bindTabClickEvents(deps);
    $('.acu-table-container').removeClass('editing-order');
    activateSavedTab(deps);
  }

  state.flags.isEditingOrder = false;
  $('.acu-table-container').removeClass('editing-order');
  $('#acu-order-controls').removeClass('visible');
  $('.acu-order-edit-btn').css({ opacity: '1', 'pointer-events': 'auto' });
  $('.acu-tab-btn').removeAttr('draggable').off('dragstart.acu dragend.acu dragover.acu drop.acu');
  deps.showNotification?.('已取消顺序编辑', 'info');
}

export function activateSavedTab(deps = {}) {
  const { $ } = deps.core || getCore();
  const savedActiveTab = getActiveTabState();
  if (savedActiveTab) {
    const $savedTab = $(`.acu-tab-btn[data-table-name="${savedActiveTab}"]`);
    if ($savedTab.length) {
      $savedTab.trigger('click.acu');
      return;
    }
  }
  if ($('.acu-tab-btn').length > 0 && $('.acu-tab-btn.active').length === 0) {
    $('.acu-tab-btn').first().trigger('click.acu');
  }
}

export { activateSavedOrFirstTab };