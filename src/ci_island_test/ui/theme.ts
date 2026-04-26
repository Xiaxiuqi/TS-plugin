/**
 * 主题与透明度管理
 */
import { state } from '../core/state';
import { THEMES, STORAGE_THEME_KEY, STORAGE_OPACITY_KEY } from '../core/constants';
import { safeSetItem } from '../core/storage';

declare const $: any;

/**
 * 应用主题
 */
export function applyTheme(themeId: string): void {
  state.theme = themeId;
  safeSetItem(STORAGE_THEME_KEY, themeId);
  $('body').removeClass(THEMES.map(t => `theme-${t.id}`).join(' '));
  if (themeId !== 'light') $('body').addClass(`theme-${themeId}`);
}

/**
 * 应用透明度
 * @param type main: 主界面透明度; island: 浮岛透明度
 * @param val 透明度值 (0-1)
 */
export function applyOpacity(type: 'main' | 'island', val: number): void {
  state.opacity[type] = val;
  safeSetItem(STORAGE_OPACITY_KEY, JSON.stringify(state.opacity));

  if (type === 'main') {
    // 主界面透明度：设置CSS变量，让面板在显示时使用正确的透明度
    $(':root').css('--panel-opacity', val);
    // 对于已经显示的面板元素，直接设置透明度
    const mainSelectors =
      '#ci-panel.visible, #ci-relation-panel.visible, #ci-inventory-panel.visible, #ci-worldinfo-panel.visible, .ci-options-container, .ci-settings-overlay, .ci-character-popup, .ci-item-card-popup:not(.ci-map-location-popup)';
    const $mainElements = $(mainSelectors);
    $mainElements.css('opacity', val);
  } else if (type === 'island') {
    // 浮岛透明度：只控制浮岛容器
    $('#ci-island-container').css('opacity', val);
  }
}
