/**
 * 浮岛设置面板
 * 包含主题切换、透明度调节、地图功能、性能设置等
 *
 * 完整实现见原 src/ci_island_test/index.ts:8421 createSettingsUI
 *
 * 注：完整实现包含约 350 行，包括手风琴交互、地图功能开关、强制删除模板等。
 * 此处提供核心入口与基础设置部分。
 */
import { ICONS } from '../core/icons';
import { THEMES } from '../core/constants';
import { state } from '../core/state';
import { safeRemoveItem, safeSetItem } from '../core/storage';
import { applyTheme, applyOpacity } from './theme';
import { showToast } from './toast';

declare const $: any;

/**
 * 创建设置 UI 弹窗
 */
export function createSettingsUI(): void {
  try {
    $('.ci-settings-overlay').remove();

    const $overlay = $(`
      <div class="ci-settings-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2400;display:flex;align-items:center;justify-content:center;"></div>
    `);

    const $card = $(`
      <div class="ci-settings-card ci-settings-card-accordion" style="max-height:80vh;overflow-y:auto;max-width:95vw;"></div>
    `);

    // 头部
    const $header = $(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-shrink:0;">
        <span style="font-weight:bold;font-size:16px;">浮岛设置 <span style="font-size:10px;font-weight:normal;opacity:0.6;">v1.5</span></span>
        <span class="ci-close-btn">${ICONS.close}</span>
      </div>
    `);
    $header.find('.ci-close-btn').click(() => $overlay.remove());

    // 手风琴容器
    const $accordion = $('<div class="ci-accordion"></div>');

    // 1. 主题设置
    const $themeSection = $(`
      <div class="ci-accordion-item active">
        <div class="ci-accordion-header">
          <span>主题设置</span>
          <span class="ci-accordion-arrow">▼</span>
        </div>
        <div class="ci-accordion-content" style="display: block;"></div>
      </div>
    `);
    const $themeContent = $themeSection.find('.ci-accordion-content');

    const $themeSec = $(`<div class="ci-settings-section"><div class="ci-settings-title">主题风格</div></div>`);
    const $dayCol = $(`
      <div style="margin-bottom:10px;">
        <div style="font-size:12px;opacity:0.7;margin-bottom:4px;">日间模式</div>
        <div class="ci-color-grid"></div>
      </div>
    `);

    THEMES.filter(t => !t.id.startsWith('night')).forEach(t => {
      const $opt = $(`<div class="ci-color-opt" style="background:${t.color}; border:1px solid #ccc;" title="${t.name}"></div>`);
      if (state.theme === t.id) $opt.addClass('active');
      $opt.click((e: any) => {
        e.stopPropagation();
        applyTheme(t.id);
        $themeSec.find('.ci-color-opt').removeClass('active');
        $opt.addClass('active');
      });
      $dayCol.find('.ci-color-grid').append($opt);
    });

    const $nightCol = $(`
      <div style="margin-bottom:10px;">
        <div style="font-size:12px;opacity:0.7;margin-bottom:4px;">夜间模式</div>
        <div class="ci-color-grid"></div>
      </div>
    `);

    THEMES.filter(t => t.id.startsWith('night')).forEach(t => {
      const $opt = $(`<div class="ci-color-opt" style="background:${t.color}; border:1px solid #555;" title="${t.name}"></div>`);
      if (state.theme === t.id) $opt.addClass('active');
      $opt.click((e: any) => {
        e.stopPropagation();
        applyTheme(t.id);
        $themeSec.find('.ci-color-opt').removeClass('active');
        $opt.addClass('active');
      });
      $nightCol.find('.ci-color-grid').append($opt);
    });

    $themeSec.append($dayCol).append($nightCol);

    // 透明度滑块
    const mkSlider = (label: string, key: 'main' | 'island') => {
      const $div = $(`<div style="margin-bottom:10px;"></div>`);
      const $label = $(`
        <div style="font-size:12px;margin-bottom:4px;display:flex;justify-content:space-between;">
          <span>${label}</span>
          <span>${state.opacity[key]}</span>
        </div>
      `);
      const $input = $(`<input type="range" min="0.1" max="1" step="0.05" value="${state.opacity[key]}" style="width:100%;">`);
      $input.on('input', (e: any) => {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        $label.find('span:last-child').text(val);
        applyOpacity(key, val);
      });
      $input.on('click', (e: any) => e.stopPropagation());
      $div.append($label).append($input);
      return $div;
    };

    const $opacitySec = $(`<div class="ci-settings-section"><div class="ci-settings-title">透明度</div></div>`);
    $opacitySec.append(mkSlider('浮岛透明度', 'island'));
    $opacitySec.append(mkSlider('主界面透明度', 'main'));

    $themeContent.append($themeSec).append($opacitySec);
    $accordion.append($themeSection);

    // 2. 性能设置
    const $perfSection = $(`
      <div class="ci-accordion-item">
        <div class="ci-accordion-header">
          <span>性能设置</span>
          <span class="ci-accordion-arrow">▼</span>
        </div>
        <div class="ci-accordion-content"></div>
      </div>
    `);
    const $perfContent = $perfSection.find('.ci-accordion-content');

    const $relationSec = $(`<div class="ci-settings-section"><div class="ci-settings-title">人物关系图</div></div>`);
    const $relationToggle = $(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;">自动重绘关系图</div>
          <div style="font-size:10px;opacity:0.6;">数据更新时自动重绘人物关系图</div>
        </div>
        <label class="ci-switch" style="position:relative;display:inline-block;width:44px;height:24px;">
          <input type="checkbox" id="ci-relation-auto-redraw" ${state.autoRedrawRelation ? 'checked' : ''} style="opacity:0;width:0;height:0;">
          <span class="ci-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${state.autoRedrawRelation ? '#4caf50' : '#ccc'};transition:.3s;border-radius:24px;"></span>
        </label>
      </div>
    `);

    $relationToggle.find('#ci-relation-auto-redraw').on('change', function (this: any, e: any) {
      e.stopPropagation();
      const isChecked = $(this).prop('checked');
      const $slider = $relationToggle.find('.ci-slider');

      state.autoRedrawRelation = isChecked;
      safeSetItem('ci_auto_redraw_relation', isChecked.toString());

      $slider.css('background', isChecked ? '#4caf50' : '#ccc');

      showToast(isChecked ? '已开启自动重绘人物关系图' : '已关闭自动重绘人物关系图');
    });
    $relationToggle.find('.ci-switch').on('click', (e: any) => e.stopPropagation());

    $relationSec.append($relationToggle);
    $perfContent.append($relationSec);

    // 调试通知开关
    const $debugSec = $(`<div class="ci-settings-section"><div class="ci-settings-title">调试通知</div></div>`);
    const $debugToggle = $(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;">静默调试模式</div>
          <div style="font-size:10px;opacity:0.6;">开启此项将仅保留基础的debug条目</div>
        </div>
        <label class="ci-switch" style="position:relative;display:inline-block;width:44px;height:24px;">
          <input type="checkbox" id="ci-silent-debug" ${state.silentDebug ? 'checked' : ''} style="opacity:0;width:0;height:0;">
          <span class="ci-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${state.silentDebug ? '#4caf50' : '#ccc'};transition:.3s;border-radius:24px;"></span>
        </label>
      </div>
    `);

    $debugToggle.find('#ci-silent-debug').on('change', function (this: any, e: any) {
      e.stopPropagation();
      const isChecked = $(this).prop('checked');
      const $slider = $debugToggle.find('.ci-slider');

      state.silentDebug = isChecked;
      safeSetItem('ci_silent_debug', isChecked.toString());
      // 同步到全局变量供 dbg 函数读取
      (globalThis as any).__ciSilentDebug = isChecked;

      $slider.css('background', isChecked ? '#4caf50' : '#ccc');

      showToast(isChecked ? '已开启静默调试模式' : '已关闭静默调试模式');
    });
    $debugToggle.find('.ci-switch').on('click', (e: any) => e.stopPropagation());

    $debugSec.append($debugToggle);
    $perfContent.append($debugSec);

    $accordion.append($perfSection);

    // 手风琴交互
    $accordion.on('click', '.ci-accordion-header', function (this: any) {
      const $header = $(this);
      const $item = $header.parent();
      const $content = $item.find('.ci-accordion-content');

      $item.toggleClass('active');
      $content.slideToggle(200);
    });

    // 数据库可视化按钮
    const $databaseBtn = $(`
      <button class="ci-btn" style="width:100%;border:1px solid var(--ci-border);border-radius:8px;margin-top:10px;">
        打开数据库可视化编辑器
      </button>
    `);
    $databaseBtn.click(() => {
      const win = window.top as any;
      if (win && win.AutoCardUpdaterAPI && win.AutoCardUpdaterAPI.openVisualizer) {
        win.AutoCardUpdaterAPI.openVisualizer();
      } else if (win && typeof win.openNewVisualizer_ACU === 'function') {
        win.openNewVisualizer_ACU();
      } else {
        showToast('未找到数据库可视化编辑器，请确保数据库已加载');
      }
    });

    // 重置按钮
    const $resetBtn = $(`
      <button class="ci-btn" style="width:100%;border:1px solid var(--ci-border);border-radius:8px;margin-top:10px;">
        重置浮岛位置
      </button>
    `);
    $resetBtn.click(() => {
      $('#ci-island-container').css({ top: '150px', right: '80px', left: 'auto', display: 'flex' });
      safeRemoveItem('ci_island_pos_v5');
      showToast('位置已重置');
    });

    $card.append($header);
    $card.append($accordion);
    $card.append($databaseBtn);
    $card.append($resetBtn);

    $overlay.append($card);
    $overlay.on('click', (e: any) => {
      if (e.target === $overlay[0]) $overlay.remove();
    });
    $('body').append($overlay);
  } catch (e) {
    console.error('Failed to create settings UI', e);
    showToast('打开设置失败: ' + e, 'error');
  }
}
