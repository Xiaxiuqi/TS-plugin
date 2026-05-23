/**
 * 面板管理器
 * 负责面板的开启、关闭、置顶、位置同步等
 */
import { state, incrementZIndex } from '../core/state';
import { applyOpacity } from './theme';

declare const $: any;

/**
 * 将面板置顶（提高 z-index）
 */
export function bringToFront(panelSelector: string): void {
  const $panel = $(panelSelector);
  if (!$panel.length) return;

  const z = incrementZIndex();
  $panel.css('z-index', z);

  // 更新栈：移到末尾
  state.panelStack = state.panelStack.filter(id => id !== panelSelector);
  state.panelStack.push(panelSelector);
}

/**
 * 打开面板
 * 单例显示：如果打开的面板没有被固定，则关闭其他没有被固定的面板
 */
export function openPanel(panelSelector: string): void {
  const $panel = $(panelSelector);
  if (!$panel.length) return;

  // [单例显示] 如果打开的面板没有被固定，则关闭其他没有被固定的面板
  const isPanelPinned = panelSelector === '#ci-map-panel' ? state.isMapPinned : $panel.hasClass('pinned');
  if (!isPanelPinned) {
    // 关闭所有没有被固定的面板（除了当前要打开的面板）
    const pinnedPanels = [
      '#ci-panel',
      '#ci-map-panel',
      '#ci-relation-panel',
      '#ci-inventory-panel',
      '#ci-skills-panel',
      '#ci-worldinfo-panel',
    ];
    pinnedPanels.forEach(selector => {
      if (selector !== panelSelector) {
        const $otherPanel = $(selector);
        if ($otherPanel.length && $otherPanel.hasClass('visible')) {
          // 检查其他面板是否被固定
          const isOtherPinned = selector === '#ci-map-panel' ? state.isMapPinned : $otherPanel.hasClass('pinned');
          if (!isOtherPinned) {
            closePanel(selector);
            // 同步移除对应浮岛按钮的激活状态
            if (selector === '#ci-panel') {
              $('.ci-btn[data-type="main"]').removeClass('active');
              state.activeCategory = null;
            } else if (selector === '#ci-map-panel') {
              $('#ci-map-btn').removeClass('active');
              state.isMapOpen = false;
            } else if (selector === '#ci-relation-panel') {
              $('.ci-btn[data-type="relation"]').removeClass('active');
              state.isRelationOpen = false;
            } else if (selector === '#ci-inventory-panel') {
              state.isInventoryOpen = false;
              if (!state.isSkillsOpen) {
                $('.ci-btn[data-type="inventory"]').removeClass('active');
              }
            } else if (selector === '#ci-skills-panel') {
              state.isSkillsOpen = false;
              if (!state.isInventoryOpen) {
                $('.ci-btn[data-type="inventory"]').removeClass('active');
              }
            } else if (selector === '#ci-worldinfo-panel') {
              $('#ci-world-info-btn').removeClass('active');
              state.isWorldInfoOpen = false;
            }
          }
        }
      }
    });
  }

  $panel.addClass('visible');
  bringToFront(panelSelector);

  // 确保位置正确 (如果是初次打开)
  const $con = $('#ci-island-container');
  const offset = $con.offset();
  syncPanelPosition($con, $panel, offset.left, offset.top);

  // 应用当前透明度设置
  applyOpacity('island', state.opacity.island);
  applyOpacity('main', state.opacity.main);
}

/**
 * 关闭面板
 */
export function closePanel(panelSelector: string): void {
  const $panel = $(panelSelector);
  if (!$panel.length) return;

  $panel.removeClass('visible');
  state.panelStack = state.panelStack.filter(id => id !== panelSelector);
}

/**
 * 同步面板位置（跟随浮岛位置自动吸附左/右侧）
 */
export function syncPanelPosition($con: any, $pan: any, islandLeft: number, islandTop: number): void {
  if ($pan.hasClass('pinned') || ($pan.is('#ci-map-panel') && state.isMapPinned)) return;
  const win = window.top || window;
  const winW = win.innerWidth || 1024;
  const winH = win.innerHeight || 768;
  const gap = 15;
  const islandW = 44;

  // 迟滞阈值：只有超过屏幕中线一定距离才切换方向
  const threshold = 50;
  const centerX = winW / 2;

  // 确定面板应该在哪一侧
  let targetSide = state.panelSide;

  if (!targetSide) {
    targetSide = islandLeft < centerX ? 'right' : 'left';
  } else if (targetSide === 'right' && islandLeft > centerX + threshold) {
    targetSide = 'left';
  } else if (targetSide === 'left' && islandLeft < centerX - threshold) {
    targetSide = 'right';
  }

  state.panelSide = targetSide;

  // 动态计算最大宽度，实现挤压效果
  let availableW;
  if (targetSide === 'right') {
    availableW = winW - (islandLeft + islandW + gap) - gap;
  } else {
    availableW = islandLeft - gap - gap;
  }

  if (availableW < 0) availableW = 0;

  $pan.css('max-width', availableW + 'px');

  if ($pan.outerWidth() > availableW) {
    $pan.css('width', availableW + 'px');
  }

  let panW = $pan.outerWidth();
  if (!panW || panW < 50) panW = availableW;

  let targetLeft;
  if (targetSide === 'right') {
    targetLeft = islandLeft + islandW + gap;
  } else {
    targetLeft = islandLeft - panW - gap;
  }

  let targetTop = islandTop;
  if (targetTop < 10) targetTop = 10;
  if (targetTop + $pan.outerHeight() > winH) targetTop = winH - $pan.outerHeight() - 10;
  $pan.css({ top: targetTop, left: targetLeft });
}

/**
 * 关闭所有面板（保留浮岛展开状态）
 */
export function closePanels($con: any, $pan: any, $mapPan: any): void {
  state.isOptionsOpen = false;
  $('.ci-options-container').removeClass('visible');

  // 关闭地图面板
  if (!state.isMapPinned) {
    $mapPan.removeClass('visible');
    state.isMapOpen = false;
    $('#ci-map-btn').removeClass('active');
  }

  // 关闭主面板
  $pan.removeClass('visible');
  state.activeCategory = null;
  $('.ci-btn[data-type]').removeClass('active');

  // 关闭所有子面板
  $('.ci-sub-panel').removeClass('visible');
  state.isRelationOpen = false;
  state.isInventoryOpen = false;
  state.isWorldInfoOpen = false;

  // 重置相关按钮状态
  $('.ci-btn[data-type="relation"]').removeClass('active');
  $('.ci-btn[data-type="inventory"]').removeClass('active');
  $('#ci-world-info-btn').removeClass('active');
}

/**
 * 收起浮岛
 */
export function collapseIsland($con: any): void {
  state.isExpanded = false;
  $con.removeClass('expanded');
  $con.css('height', '');
}

/**
 * 关闭所有面板并收起浮岛
 */
export function closeAll($con: any, $pan: any, $mapPan: any): void {
  closePanels($con, $pan, $mapPan);
  collapseIsland($con);
}

/**
 * 可选按钮配置：根据数据状态决定是否显示。
 *
 * 未来要新增类似的"按数据有无显隐"的按钮，**只需在此数组添加一项 +
 * 在 SCSS 给按钮加上 `.<showClass>` 选择器规则**。
 *
 * SCSS 规则约定：
 *   - 按钮默认 `display: none !important;` 隐藏
 *   - 加上 `.<showClass>` 类时显示
 *
 * 设计要点：
 *   - 用 `$el` 缓存 jQuery 对象，避免每次重新查询 DOM（性能优化）
 *   - 用 `toggleClass(class, bool)` 一次调用完成状态切换（比 add+remove 更快）
 *   - 不需要 hideClass：默认就是隐藏态，省一半内存与 DOM 操作
 */
interface OptionalButtonConfig {
  /** jQuery 选择器（仅首次访问时使用） */
  selector: string;
  /** 检测函数：返回 true 表示有数据 → 显示按钮 */
  hasData: () => boolean;
  /** 有数据时添加的类（SCSS 用此类设置 display: flex） */
  showClass: string;
  /** 缓存的 jQuery 对象（首次访问时填充，避免重复查询） */
  $el?: any;
}

const OPTIONAL_BUTTONS: OptionalButtonConfig[] = [
  {
    selector: '#ci-options-btn',
    hasData: () => state.optionsData.length > 0,
    showClass: 'has-options',
  },
  {
    selector: '#ci-map-btn',
    hasData: () => !!state.cachedData.hasMapTable,
    showClass: 'has-map',
  },
  {
    selector: '.ci-btn[data-type="relation"]',
    hasData: () => !!(state.cachedData as any).hasRelationData,
    showClass: 'has-relation',
  },
];

/**
 * 通用：根据数据状态批量更新可选按钮的显隐 class
 * 用 toggleClass(cls, bool) 单次操作 + 缓存 jQuery 对象避免重复查询
 */
function applyOptionalButtonsVisibility(): void {
  for (const cfg of OPTIONAL_BUTTONS) {
    if (!cfg.$el || !cfg.$el.length) cfg.$el = $(cfg.selector);
    if (!cfg.$el.length) continue;
    cfg.$el.toggleClass(cfg.showClass, cfg.hasData());
  }
}

/**
 * 更新浮岛按钮显隐状态（根据数据状态控制可选按钮的显示）
 * 调用时机：每次数据更新后（processData 完成时）。
 */
export function updateHeightClass(_$con: any): void {
  applyOptionalButtonsVisibility();
}
