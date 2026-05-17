// ACU Visualizer 测试版主题模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 applyThemeStyles()、夜间模式和展开状态读写逻辑。
// 迁移原则：保留原 class、localStorage key 与主题 id，不修改 CSS 内容，不夹带优化。

import { getCore } from '../core/bridge.js';
import { STORAGE_KEYS, THEMES } from '../core/constants.js';

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
