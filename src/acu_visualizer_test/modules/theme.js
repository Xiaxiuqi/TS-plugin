// ACU Visualizer 测试版主题模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 applyThemeStyles()、夜间模式和展开状态读写逻辑。
// 迁移原则：保留原 class、localStorage key 与主题 id，不修改 CSS 内容，不夹带优化。

import { getCore } from '../core/bridge.js';
import { STORAGE_KEYS, THEMES, acuMenuItemContent } from '../core/constants.js';
import { getConfig, saveConfig } from '../core/storage.js';

export function applyThemeStyles(theme, core = getCore()) {
  const { $ } = core;
  const $container = $('.acu-table-container');
  if ($container.length) {
    THEMES.forEach(t => $container.removeClass(`acu-theme-${t.id}`));
    $container.addClass(`acu-theme-${theme}`);

    const isNightMode = $container.hasClass('night-mode');
    if (isNightMode && theme !== 'dark') {
      $container.removeClass('acu-theme-dark');
      $container.addClass(`acu-theme-${theme}`);
    }
  }
}

export function applyThemeState(core = getCore()) {
  const config = getConfig();
  applyThemeStyles(config.theme, core);
}

export function toggleNightMode(core = getCore()) {
  const { $ } = core;
  const $container = $('.acu-table-container');
  const isNightMode = $container.hasClass('night-mode');
  const newMode = !isNightMode;
  if (newMode) $container.addClass('night-mode');
  else $container.removeClass('night-mode');
  saveNightModeState(newMode);
  applyThemeState(core);
}

export function getNightModeState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.NIGHT_MODE);
    return saved ? JSON.parse(saved) : false;
  } catch (e) {
    return false;
  }
}

export function saveNightModeState(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.NIGHT_MODE, JSON.stringify(enabled));
  } catch (e) {
    console.error('保存夜间模式状态失败:', e);
  }
}

export function getTableExpandedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TABLE_EXPANDED);
    return saved ? JSON.parse(saved) : false;
  } catch (e) {
    return false;
  }
}

export function saveTableExpandedState(expanded) {
  try {
    localStorage.setItem(STORAGE_KEYS.TABLE_EXPANDED, JSON.stringify(expanded));
  } catch (e) {
    console.error('保存表格展开状态失败:', e);
  }
}

export function getInnerScrollPositionState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.INNER_SCROLL_POSITION);
    return saved ? JSON.parse(saved) : 0;
  } catch (e) {
    return 0;
  }
}

export function saveInnerScrollPositionState(position) {
  try {
    localStorage.setItem(STORAGE_KEYS.INNER_SCROLL_POSITION, JSON.stringify(position));
  } catch (e) {
    console.error('保存内部滚动位置失败:', e);
  }
}

export function getThemeById(themeId) {
  return THEMES.find(theme => theme.id === themeId) || THEMES[0];
}

export function showThemeMenu(event, deps = {}) {
  const core = deps.core || getCore();
  const { $ } = core;

  const $existingMenu = $('.acu-theme-menu');
  if ($existingMenu.length > 0) {
    $existingMenu.remove();
    return;
  }

  $('.acu-cell-menu, .acu-edit-overlay').not('.acu-theme-menu').remove();

  const isNightMode = $('.acu-table-container').hasClass('night-mode');
  const config = deps.getConfig ? deps.getConfig() : getConfig();

  let menuHtml = `
            <div class="acu-cell-menu acu-theme-menu acu-theme-${config.theme} ${isNightMode ? 'night-mode' : ''}" style="z-index: 10001; min-width: 140px; padding: 8px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">`;

  THEMES.forEach(theme => {
    const isActive = config.theme === theme.id;
    menuHtml += `
                <div class="acu-cell-menu-item theme-item ${isActive ? 'active' : ''}" data-action="theme" data-theme="${theme.id}" style="display:flex; align-items:center; padding: 10px 15px; cursor:pointer;">
                    <i class="${theme.icon}" style="margin-right: 12px; width: 16px; text-align: center; opacity: 0.7;"></i>
                    <span style="flex:1;">${theme.name}</span>
                    ${isActive ? '<i class="fas fa-check" style="font-size: 10px; opacity: 0.5;"></i>' : ''}
                </div>`;
  });

  menuHtml += `
                <div class="acu-cell-menu-item close" data-action="close" style="padding: 10px 15px; text-align:center; opacity:0.6; font-size: 12px; border-top: 1px solid rgba(128,128,128,0.1);">
                    ${acuMenuItemContent('close', '关闭菜单')}
                </div>
            </div>`;

  const $menu = $(menuHtml);
  $('body').append($menu);

  const clickX = event.clientX;
  const clickY = event.clientY;
  const menuWidth = $menu.outerWidth();
  const menuHeight = $menu.outerHeight();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let menuX = clickX + 10;
  let menuY = clickY + 10;
  if (menuX + menuWidth > viewportWidth) menuX = clickX - menuWidth - 10;
  if (menuY + menuHeight > viewportHeight) menuY = clickY - menuHeight - 10;
  menuX = Math.max(10, menuX);
  menuY = Math.max(10, menuY);
  $menu.css({ left: `${menuX}px`, top: `${menuY}px`, position: 'fixed' });

  $menu.find('.acu-cell-menu-item').on('click', function () {
    const action = $(this).data('action');
    if (action === 'theme') {
      const theme = $(this).data('theme');
      saveConfig({ theme }, { applyThemeStyles: nextTheme => applyThemeStyles(nextTheme, core) });
      deps.showNotification?.(`已切换到${getThemeById(theme).name}主题`, 'success');
    }
    $menu.remove();
  });

  event.stopPropagation();
}
