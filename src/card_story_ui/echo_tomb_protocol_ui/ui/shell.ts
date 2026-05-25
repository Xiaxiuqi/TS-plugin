/**
 * UI 外壳：主题切换、Tab 导航、顶部状态栏
 */

import { getSettings, updateSettings } from '../settings';
import type { MountContext } from './mount';
import { getDatabase } from '../core/database';
import { parseTable, filterPresent, findRowByCharId } from '../core/tables';
import { SCOPED_CSS } from '../styles/scopedCss';

export type TabId = string; // 角色ID

interface ShellState {
  activeTab: TabId | null;
  tabs: { id: TabId; label: string }[];
  theme: 'day' | 'night';
  globalData: Record<string, string>;
}

let _state: ShellState = {
  activeTab: null,
  tabs: [],
  theme: 'day',
  globalData: {},
};

let _ctx: MountContext | null = null;
let _rendered = false;

/**
 * 渲染外壳
 */
export function renderShell($container: JQuery<HTMLDivElement>, ctx: MountContext): void {
  _ctx = ctx;

  // 确定主题
  const themeSetting = ctx.settings.theme;
  if (themeSetting === 'auto') {
    const hour = new Date().getHours();
    _state.theme = (hour >= 6 && hour < 18) ? 'day' : 'night';
  } else {
    _state.theme = themeSetting;
  }

  if (!_rendered) {
    // 首次渲染：注入样式和骨架
    $container.html(buildShellHTML());
    bindShellEvents($container);
    _rendered = true;
  }

  // 加载数据并更新
  loadDataAndRefresh($container);
}

function buildShellHTML(): string {
  return `
    <style>${SCOPED_CSS}</style>
    <div class="et-shell et-theme-${_state.theme}">
      <div class="et-header">
        <div class="et-global-status"></div>
        <div class="et-theme-toggle" title="切换日夜主题">◐</div>
      </div>
      <div class="et-tabs"></div>
      <div class="et-content"></div>
      <div class="et-footer">
        <button class="et-btn et-btn-map" title="地图">地图</button>
        <button class="et-btn et-btn-upgrade" title="升级">升级</button>
        <button class="et-btn et-btn-team" title="组队">组队</button>
      </div>
    </div>
  `;
}

function bindShellEvents($container: JQuery<HTMLDivElement>): void {
  // 事件委托：主题切换
  $container.on('click', '.et-theme-toggle', () => {
    _state.theme = _state.theme === 'day' ? 'night' : 'day';
    updateSettings({ theme: _state.theme });
    $container.find('.et-shell')
      .removeClass('et-theme-day et-theme-night')
      .addClass(`et-theme-${_state.theme}`);
  });

  // 事件委托：Tab 切换
  $container.on('click', '.et-tab-item', function () {
    const tabId = $(this).data('tab-id') as string;
    if (tabId && tabId !== _state.activeTab) {
      _state.activeTab = tabId;
      refreshTabs($container);
      refreshContent($container);
    }
  });
}

async function loadDataAndRefresh($container: JQuery<HTMLDivElement>): Promise<void> {
  const db = getDatabase();

  // 读取全局数据表
  const globalRaw = await db.exportTable('全局数据表');
  if (globalRaw) {
    const globalTable = parseTable('全局数据表', globalRaw);
    if (globalTable && globalTable.rows.length > 0) {
      _state.globalData = globalTable.rows[0];
    }
  }

  // 读取主体档案表
  const subjectRaw = await db.exportTable('主体档案表');
  if (subjectRaw) {
    const subjectTable = parseTable('主体档案表', subjectRaw);
    if (subjectTable) {
      const presentSubjects = filterPresent(subjectTable);
      _state.tabs = presentSubjects.map(row => ({
        id:row['角色ID'] || '',
        label: row['姓名'] || row['游戏ID'] || row['角色ID'] || '未知',
      })).filter(t => t.id !== '');

      // 默认选中第一个 Tab
      if (_state.tabs.length > 0 && !_state.activeTab) {
        _state.activeTab = _state.tabs[0].id;
      }
    }
  }

  refreshGlobalStatus($container);
  refreshTabs($container);
  refreshContent($container);
}

function refreshGlobalStatus($container: JQuery<HTMLDivElement>): void {
  const g = _state.globalData;
  const parts: string[] = [];
  if (g['当前地点']) parts.push(`📍 ${g['当前地点']}`);
  if (g['当前时间']) parts.push(`⏰ ${g['当前时间']}`);
  if (g['当前阶段']) parts.push(`▶ ${g['当前阶段']}`);
  if (g['交错等级']) parts.push(`✧ Lv.${g['交错等级']}`);
  if (g['战斗状态'] === '是') parts.push(`⚔️ 战斗中`);

  $container.find('.et-global-status').html(
    parts.map(p => `<span class="et-status-chip">${p}</span>`).join('')
  );
}

function refreshTabs($container: JQuery<HTMLDivElement>): void {
  const $tabs = $container.find('.et-tabs');
  $tabs.html(
    _state.tabs.map(tab =>
      `<div class="et-tab-item${tab.id === _state.activeTab ? ' et-tab-active' : ''}" data-tab-id="${tab.id}">${tab.label}</div>`
    ).join('')
  );
}

function refreshContent($container: JQuery<HTMLDivElement>): void {
  const $content = $container.find('.et-content');
  if (!_state.activeTab) {
    $content.html('<div class="et-empty">暂无主体数据</div>');
    return;
  }

  // 占位：后续由 subjectPanel 填充具体内容
  $content.html(`
    <div class="et-subject-panel" data-char-id="${_state.activeTab}">
      <div class="et-loading">加载中...</div>
    </div>
  `);
}

export function getShellState(): ShellState {
  return _state;
}
