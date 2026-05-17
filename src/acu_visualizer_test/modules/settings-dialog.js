// ACU Visualizer 测试版设置弹窗模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 showSettingsDialog()、bindSettingsDialogEvents()、showCleanupConfirmation()。
// 迁移原则：保留原 DOM class、id、设置 key 与事件语义，不修改 CSS，不夹带优化。

import { getCore } from '../core/bridge.js';
import { DEFAULT_CLEANUP_SETTINGS, DEFAULT_CONFIG, STORAGE_KEYS, STORAGE_SIZE_LIMIT_MB } from '../core/constants.js';
import {
  getCleanupSettings,
  getConfig,
  getStorageAnalysis,
  manualCleanupStorage,
  saveCleanupSettings,
  saveConfig,
} from '../core/storage.js';
import { applyThemeStyles, saveNightModeState } from './theme.js';

export function getStorageItemSize(key) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return '0 KB';
    const size = (value.length + key.length) / 1024;
    return size.toFixed(2) + ' KB';
  } catch (e) {
    return '0 KB';
  }
}

export function showStatusMessage(message, type = 'info', core = getCore()) {
  const { $ } = core;
  const $status = $('#acu-settings-status');
  $status.text(message).removeClass('success error info').addClass(type);
}

export function generateSettingsDialogHTML({ config, cleanupSettings, storageAnalysis, isNightMode }) {
  const cleanableSize =
    storageAnalysis.nonCriticalItems.reduce((sum, item) => {
      const size = parseFloat(item.size);
      return sum + (isNaN(size) ? 0 : size);
    }, 0) / 1024;

  return `
            <div class="acu-settings-overlay ${isNightMode ? 'night-mode' : ''}">
                <div class="acu-settings-dialog acu-theme-${config.theme}">
                    <div class="acu-settings-header">
                        <h3>⚙️ ACU 设置</h3>
                        <button class="acu-settings-close" title="关闭">✕</button>
                    </div>
                    <div class="acu-settings-tabs">
                        <button class="acu-settings-tab active" data-tab="storage">📦 存储管理</button>
                        <button class="acu-settings-tab" data-tab="advanced">⚡ 高级选项</button>
                    </div>
                    <div class="acu-settings-content">
                        <div class="acu-settings-tab-content active" id="storage-tab">
                            <div class="acu-storage-info">
                                <div class="acu-storage-summary">
                                    <h4>存储使用情况</h4>
                                    <div class="acu-storage-bar">
                                        <div class="acu-storage-bar-fill" style="width: ${Math.min(100, (storageAnalysis.totalSize / STORAGE_SIZE_LIMIT_MB) * 100)}%"></div>
                                    </div>
                                    <div class="acu-storage-stats">
                                        <span>已使用: <strong>${storageAnalysis.totalSize} MB</strong> / ${STORAGE_SIZE_LIMIT_MB} MB</span>
                                        <span>可清理: <strong class="acu-cleanable">${cleanableSize.toFixed(2)} MB</strong></span>
                                    </div>
                                </div>
                                <div class="acu-warning-box">
                                    <div class="acu-warning-icon">⚠️</div>
                                    <div class="acu-warning-content">
                                        <strong>重要提示:</strong>
                                        <p>在进行清理操作前,请务必先保存数据库模板,以免数据库模板的修改回滚。</p>
                                        <p>请前往数据库,点击数据管理按钮,合并导出模板做好保存备份。</p>
                                    </div>
                                </div>
                                <div class="acu-cleanup-options">
                                    <h4>清理选项</h4>
                                    <div class="acu-option-group">
                                        <label class="acu-checkbox"><input type="checkbox" id="clearSnapshots" ${cleanupSettings.clearSnapshots ? 'checked' : ''}><span>清理数据快照 (${getStorageItemSize(STORAGE_KEYS.LAST_SNAPSHOT)})</span><small>删除历史数据快照，可重新生成</small></label>
                                        <label class="acu-checkbox"><input type="checkbox" id="clearHistory" ${cleanupSettings.clearHistory ? 'checked' : ''}><span>清理历史记录 (${getStorageItemSize(STORAGE_KEYS.CELL_HISTORY)})</span><small>完全清空所有历史记录</small></label>
                                        <label class="acu-checkbox"><input type="checkbox" id="clearScrollPositions" ${cleanupSettings.clearScrollPositions ? 'checked' : ''}><span>清理滚动位置 (${getStorageItemSize(STORAGE_KEYS.INNER_SCROLL_POSITION)})</span><small>清除表格滚动位置记忆</small></label>
                                        <label class="acu-checkbox"><input type="checkbox" id="clearPagination" ${cleanupSettings.clearPagination ? 'checked' : ''}><span>清理分页状态 (${getStorageItemSize(STORAGE_KEYS.PAGINATION)})</span><small>清除表格分页记忆</small></label>
                                        <label class="acu-checkbox"><input type="checkbox" id="clearTabStatus" ${cleanupSettings.clearTabStatus ? 'checked' : ''}><span>清理标签状态 (${getStorageItemSize(STORAGE_KEYS.TAB_STATUS)})</span><small>清除标签更新标记</small></label>
                                    </div>
                                    <div class="acu-protected-settings"><h5>始终保留的设置（推荐）</h5><div class="acu-option-group">
                                        <label class="acu-checkbox protected"><input type="checkbox" checked disabled><span>夜间模式设置</span><small>保持您的日夜偏好</small></label>
                                        <label class="acu-checkbox protected"><input type="checkbox" checked disabled><span>主题配置</span><small>保持您的界面主题</small></label>
                                        <label class="acu-checkbox protected"><input type="checkbox" checked disabled><span>表格顺序</span><small>保持您的表格排列顺序</small></label>
                                    </div></div>
                                </div>
                                <div class="acu-cleanup-actions">
                                    <button class="acu-btn acu-btn-secondary" id="acu-analyze-storage">🔍 重新分析存储</button>
                                    <button class="acu-btn acu-btn-danger" id="acu-cleanup-now">🧹 立即清理选中的项目</button>
                                </div>
                            </div>
                        </div>
                        <div class="acu-settings-tab-content" id="advanced-tab">
                            <div class="acu-advanced-options">
                                <h4>高级设置</h4>
                                <div class="acu-option-group">
                                    <label class="acu-checkbox"><input type="checkbox" id="autoCleanup" ${config.autoCleanup ? 'checked' : ''}><span>自动清理存储</span><small>当存储接近上限时自动清理</small></label>
                                    <label class="acu-checkbox"><input type="checkbox" id="keepSnapshots" ${config.keepSnapshots ? 'checked' : ''}><span>保留数据快照</span><small>不自动清理数据快照</small></label>
                                    <label class="acu-checkbox"><input type="checkbox" id="debugMode"><span>调试模式</span><small>在控制台显示详细日志</small></label>
                                </div>
                                <div class="acu-storage-details"><h5>存储详细信息</h5><div class="acu-storage-items">
                                    <div class="acu-storage-section"><h6>关键设置（始终保留）</h6>${storageAnalysis.criticalItems.map(item => `<div class="acu-storage-item critical"><span class="acu-storage-item-name">${item.description}</span><span class="acu-storage-item-size">${item.size}</span></div>`).join('')}</div>
                                    <div class="acu-storage-section"><h6>可清理项目</h6>${storageAnalysis.nonCriticalItems.map(item => `<div class="acu-storage-item cleanable"><span class="acu-storage-item-name">${item.description}</span><span class="acu-storage-item-size">${item.size}</span></div>`).join('')}</div>
                                </div></div>
                                <div class="acu-advanced-actions">
                                    <button class="acu-btn acu-btn-secondary" id="acu-reset-settings">🔄 重置为默认设置</button>
                                    <button class="acu-btn acu-btn-danger" id="acu-clear-all">🗑️ 清理所有非关键数据</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="acu-settings-footer"><div class="acu-settings-status" id="acu-settings-status">就绪</div><div class="acu-settings-buttons"><button class="acu-btn acu-btn-secondary" id="acu-settings-cancel">取消</button><button class="acu-btn acu-btn-primary" id="acu-settings-save">保存设置</button></div></div>
                </div>
            </div>
        `;
}

export function showSettingsDialog(deps = {}) {
  const { $ } = deps.core || getCore();
  $('.acu-settings-overlay').remove();
  const config = getConfig();
  const cleanupSettings = getCleanupSettings();
  const storageAnalysis = getStorageAnalysis();
  const isNightMode = $('.acu-table-container').hasClass('night-mode');
  $('body').append(generateSettingsDialogHTML({ config, cleanupSettings, storageAnalysis, isNightMode }));
  bindSettingsDialogEvents(deps);
}

export function bindSettingsDialogEvents(deps = {}) {
  const { $ } = deps.core || getCore();
  $('.acu-settings-close, #acu-settings-cancel').on('click', () => $('.acu-settings-overlay').remove());
  $('.acu-settings-tab').on('click', function () {
    const tabId = $(this).data('tab');
    $('.acu-settings-tab').removeClass('active');
    $(this).addClass('active');
    $('.acu-settings-tab-content').removeClass('active');
    $(`#${tabId}-tab`).addClass('active');
  });
  $('#maxHistoryItems').on('input', function () {
    $('#historyCountValue').text($(this).val());
  });
  $('.acu-theme-option input').on('change', function () {
    const theme = $(this).val();
    $('.acu-theme-option').removeClass('active');
    $(this).closest('.acu-theme-option').addClass('active');
    $('.acu-settings-dialog')
      .removeClass((index, className) => (className.match(/acu-theme-\w+/g) || []).join(' '))
      .addClass(`acu-theme-${theme}`);
  });
  $('#acu-analyze-storage').on('click', function () {
    const analysis = getStorageAnalysis();
    const cleanableSize = analysis.nonCriticalItems.reduce((sum, item) => sum + (parseFloat(item.size) || 0), 0) / 1024;
    $('.acu-storage-bar-fill').css('width', `${Math.min(100, (analysis.totalSize / STORAGE_SIZE_LIMIT_MB) * 100)}%`);
    $('.acu-storage-stats span:first-child').html(
      `已使用: <strong>${analysis.totalSize} MB</strong> / ${STORAGE_SIZE_LIMIT_MB} MB`,
    );
    $('.acu-cleanable').text(`${cleanableSize.toFixed(2)} MB`);
    showStatusMessage('存储分析完成', 'success', deps.core);
  });
  $('#acu-cleanup-now').on('click', async function () {
    const cleanupSettings = collectCleanupSettings($);
    if (!Object.values(cleanupSettings).some(v => v)) {
      showStatusMessage('请至少选择一个清理项目', 'error', deps.core);
      return;
    }
    const confirmed = await showCleanupConfirmation(cleanupSettings, deps.core);
    if (!confirmed) {
      showStatusMessage('清理已取消', 'info', deps.core);
      return;
    }
    const result = manualCleanupStorage(cleanupSettings, { getTableData: deps.getTableData });
    if (result.success) {
      showStatusMessage(`清理完成！节省了 ${result.savedSpace} MB 空间`, 'success', deps.core);
      $('#acu-analyze-storage').trigger('click');
      saveCleanupSettings(cleanupSettings);
      if (cleanupSettings.clearHistory || cleanupSettings.clearSnapshots) {
        deps.forceRefreshAfterCleanup?.();
      }
    } else {
      showStatusMessage(`清理失败: ${result.error}`, 'error', deps.core);
    }
  });
  $('#acu-clear-all').on('click', async function () {
    const cleanupSettings = {
      clearSnapshots: true,
      clearHistory: true,
      clearScrollPositions: true,
      clearPagination: true,
      clearTabStatus: true,
    };
    const result = manualCleanupStorage(cleanupSettings, { getTableData: deps.getTableData });
    if (result.success) {
      showStatusMessage(`已清理所有非关键数据！节省了 ${result.savedSpace} MB 空间`, 'success', deps.core);
      $('#acu-analyze-storage').trigger('click');
      saveCleanupSettings(cleanupSettings);
      deps.forceRefreshAfterCleanup?.();
    } else {
      showStatusMessage(`清理失败: ${result.error}`, 'error', deps.core);
    }
  });
  $('#acu-reset-settings').on('click', function () {
    if (confirm('确定要重置所有设置为默认值吗？')) {
      saveConfig(DEFAULT_CONFIG);
      saveCleanupSettings(DEFAULT_CLEANUP_SETTINGS);
      $('.acu-settings-overlay').remove();
      setTimeout(() => showSettingsDialog(deps), 100);
      showStatusMessage('设置已重置为默认值', 'success', deps.core);
    }
  });
  $('#acu-settings-save').on('click', function () {
    const config = getConfig();
    const newConfig = {
      ...config,
      theme: $('input[name="theme"]:checked').val(),
      highlightNew: $('#highlightNew').is(':checked'),
      maxHistoryItems: parseInt($('#maxHistoryItems').val()),
      autoCleanup: $('#autoCleanup').is(':checked'),
      keepSnapshots: $('#keepSnapshots').is(':checked'),
    };
    saveConfig(newConfig);
    saveNightModeState($('#autoNightMode').is(':checked'));
    saveCleanupSettings(collectCleanupSettings($));
    applyThemeStyles(newConfig.theme);
    if ($('#autoNightMode').is(':checked')) $('.acu-table-container').addClass('night-mode');
    else $('.acu-table-container').removeClass('night-mode');
    showStatusMessage('设置已保存', 'success', deps.core);
    setTimeout(() => $('.acu-settings-overlay').remove(), 1000);
  });
}

export function collectCleanupSettings($) {
  return {
    clearSnapshots: $('#clearSnapshots').is(':checked'),
    clearHistory: $('#clearHistory').is(':checked'),
    clearScrollPositions: $('#clearScrollPositions').is(':checked'),
    clearPagination: $('#clearPagination').is(':checked'),
    clearTabStatus: $('#clearTabStatus').is(':checked'),
  };
}

export function showCleanupConfirmation(cleanupSettings, core = getCore()) {
  return new Promise(resolve => {
    const { $ } = core;
    const isNightMode = $('.acu-table-container').hasClass('night-mode');
    const itemsToClean = [];
    if (cleanupSettings.clearSnapshots) itemsToClean.push('数据快照');
    if (cleanupSettings.clearHistory) itemsToClean.push('历史记录');
    if (cleanupSettings.clearScrollPositions) itemsToClean.push('滚动位置');
    if (cleanupSettings.clearPagination) itemsToClean.push('分页状态');
    if (cleanupSettings.clearTabStatus) itemsToClean.push('标签状态');
    if (itemsToClean.length === 0) {
      resolve(false);
      return;
    }
    const confirmationHtml = `<div class="acu-confirm-overlay ${isNightMode ? 'night-mode' : ''}"><div class="acu-confirm-dialog"><div class="acu-confirm-header"><h3>⚠️ 确认清理操作</h3></div><div class="acu-confirm-content"><div class="acu-warning-box" style="margin-bottom: 20px;"><div class="acu-warning-icon">🚨</div><div class="acu-warning-content"><strong>重要：请先备份数据库模板！</strong><p>清理操作将删除以下数据，且无法恢复：</p></div></div><ul class="acu-cleanup-list">${itemsToClean.map(item => `<li>${item}</li>`).join('')}</ul><div class="acu-confirm-question"><p>确定要执行清理吗？</p></div></div><div class="acu-confirm-buttons"><button class="acu-btn acu-btn-secondary" id="acu-confirm-cancel">取消</button><button class="acu-btn acu-btn-danger" id="acu-confirm-proceed">确定清理</button></div></div></div>`;
    $('body').append(confirmationHtml);
    $('#acu-confirm-cancel').on('click', () => {
      $('.acu-confirm-overlay').remove();
      resolve(false);
    });
    $('#acu-confirm-proceed').on('click', () => {
      $('.acu-confirm-overlay').remove();
      resolve(true);
    });
  });
}
