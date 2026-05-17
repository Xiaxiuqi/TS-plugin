// ACU Visualizer 测试版快捷选项弹窗模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 openShortcutDialog()。
// 迁移原则：保留原 class、id、API 调用顺序与回退 localStorage 行为，不修改 CSS，不夹带优化。

import { getCore } from '../core/bridge.js';
import { THEMES } from '../core/constants.js';

export function getShortcutThemeClass($container) {
  return THEMES.map(t => `acu-theme-${t.id}`).find(c => $container.hasClass(c)) || 'acu-theme-modern';
}

export function getShortcutSettings(api, readDbSettings) {
  let autoUpdateThreshold = '';
  let autoUpdateFrequency = '';
  let updateBatchSize = '';
  let skipUpdateFloors = '';

  if (api && typeof api.getSettings === 'function') {
    const apiSettings = api.getSettings();
    autoUpdateThreshold = apiSettings?.autoUpdateThreshold ?? '';
    autoUpdateFrequency = apiSettings?.autoUpdateFrequency ?? '';
    updateBatchSize = apiSettings?.updateBatchSize ?? '';
    skipUpdateFloors = apiSettings?.skipUpdateFloors ?? '';
  } else if (typeof readDbSettings === 'function') {
    const { settings } = readDbSettings();
    autoUpdateThreshold = settings?.autoUpdateThreshold ?? '';
    autoUpdateFrequency = settings?.autoUpdateFrequency ?? '';
    updateBatchSize = settings?.updateBatchSize ?? '';
    skipUpdateFloors = settings?.skipUpdateFloors ?? '';
  }

  return { autoUpdateThreshold, autoUpdateFrequency, updateBatchSize, skipUpdateFloors };
}

export function generateShortcutDialogHTML({ themeClass, isNightMode, aiLayers, settings }) {
  return `
      <div class="acu-shortcut-lite-overlay ${themeClass} ${isNightMode ? 'night-mode' : ''}">
        <div class="acu-shortcut-lite-dialog">
          <div class="acu-shortcut-lite-header">
            <div class="acu-shortcut-lite-title">快捷选项</div>
            <button class="acu-shortcut-lite-close" title="关闭">×</button>
          </div>
          <div class="acu-shortcut-lite-body">
            <div class="acu-shortcut-lite-info">当前上下文总层数（仅AI楼层）：<strong>${aiLayers}</strong></div>
            <div class="acu-shortcut-lite-config-grid">
              <div class="acu-shortcut-lite-field"><label>AI读取上下文层数</label><input type="number" id="acu-sc-autoUpdateThreshold" min="0" step="1" value="${settings.autoUpdateThreshold}"></div>
              <div class="acu-shortcut-lite-field"><label>每N层自动更新一次</label><input type="number" id="acu-sc-autoUpdateFrequency" min="1" step="1" value="${settings.autoUpdateFrequency}"></div>
              <div class="acu-shortcut-lite-field"><label>每批次更新楼层数</label><input type="number" id="acu-sc-updateBatchSize" min="1" step="1" value="${settings.updateBatchSize}"></div>
              <div class="acu-shortcut-lite-field"><label>保留X层楼不更新</label><input type="number" id="acu-sc-skipUpdateFloors" min="0" step="1" value="${settings.skipUpdateFloors}"></div>
            </div>
            <div class="acu-shortcut-lite-btns">
              <button class="acu-shortcut-lite-btn" id="acu-sc-save">保存配置</button>
              <button class="acu-shortcut-lite-btn" id="acu-sc-update">立即手动更新</button>
            </div>
            <div class="acu-shortcut-lite-btns">
              <button class="acu-shortcut-lite-btn accent" id="acu-sc-open-visualizer">打开可视化编辑器</button>
            </div>
          </div>
        </div>
      </div>
    `;
}

export async function openShortcutDialog(deps = {}) {
  const { $ } = deps.core || getCore();
  const api = deps.api || (deps.core || getCore()).getDB();
  if (!api) {
    deps.showNotification?.('未检测到数据库 (AutoCardUpdaterAPI)', 'error');
    return;
  }

  const $container = $('.acu-table-container');
  const isNightMode = $container.hasClass('night-mode');
  const themeClass = getShortcutThemeClass($container);

  deps.injectShortcutDialogStylesOnce?.();
  if ($('.acu-shortcut-lite-overlay').length) return;

  const aiLayers = deps.getAiLayerCount ? deps.getAiLayerCount() : 0;
  const settings = getShortcutSettings(api, deps.readDbSettings);
  const $overlay = $(generateShortcutDialogHTML({ themeClass, isNightMode, aiLayers, settings }));
  $('body').append($overlay);

  const close = () => $overlay.remove();
  $overlay.find('.acu-shortcut-lite-close').on('click', close);

  let shortcutMouseDownOnBg = false;
  $overlay
    .on('mousedown', function (e) {
      shortcutMouseDownOnBg = $(e.target).hasClass('acu-shortcut-lite-overlay');
    })
    .on('mouseup', function (e) {
      if (shortcutMouseDownOnBg && $(e.target).hasClass('acu-shortcut-lite-overlay')) close();
      shortcutMouseDownOnBg = false;
    });

  const saveSettingsFromUi = () => {
    const autoUpdateThreshold = parseInt(String($('#acu-sc-autoUpdateThreshold').val() || '0'), 10);
    const autoUpdateFrequency = parseInt(String($('#acu-sc-autoUpdateFrequency').val() || '1'), 10);
    const updateBatchSize = parseInt(String($('#acu-sc-updateBatchSize').val() || '1'), 10);
    const skipUpdateFloors = parseInt(String($('#acu-sc-skipUpdateFloors').val() || '0'), 10);

    if (api && typeof api.updateSettings === 'function') {
      const ok = api.updateSettings({ autoUpdateThreshold, autoUpdateFrequency, updateBatchSize, skipUpdateFloors });
      if (ok) {
        deps.showNotification?.('配置已保存', 'success');
        return true;
      }
    }

    if (typeof deps.readDbSettings === 'function' && typeof deps.writeDbSettings === 'function') {
      const { key, settings } = deps.readDbSettings();
      const next = { ...(settings || {}) };
      next.autoUpdateThreshold = autoUpdateThreshold;
      next.autoUpdateFrequency = autoUpdateFrequency;
      next.updateBatchSize = updateBatchSize;
      next.skipUpdateFloors = skipUpdateFloors;
      deps.writeDbSettings(key, next);
      deps.showNotification?.('配置已保存（回退模式）', 'success');
      return true;
    }

    return false;
  };

  $('#acu-sc-save').on('click', () => saveSettingsFromUi());
  $('#acu-sc-update').on('click', async () => {
    try {
      if (typeof api.manualUpdate === 'function') {
        await api.manualUpdate();
      } else {
        deps.showNotification?.('正在触发手动更新...', 'info');
        const ok = await api.triggerUpdate();
        deps.showNotification?.(
          ok !== false ? '手动更新已完成' : '手动更新失败或被终止',
          ok !== false ? 'success' : 'error',
        );
      }
    } catch (e) {
      deps.showNotification?.('手动更新出错: ' + (e?.message || e), 'error');
    }
  });
  $('#acu-sc-open-visualizer').on('click', () => {
    try {
      api.openVisualizer();
      close();
    } catch (e) {
      deps.showNotification?.('打开可视化编辑器失败', 'error');
    }
  });
}
