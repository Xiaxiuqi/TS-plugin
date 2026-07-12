// ACU Visualizer 测试版常量模块
// 来源：public/acu_visualizer/acu_visualizer-test.js
// 迁移范围：SCRIPT_ID、STORAGE_KEY_*、DEFAULT_*、THEMES、SVG 图标辅助函数、数据库设置 key。
// 迁移原则：只迁移常量与纯函数，不改变原插件运行逻辑，不夹带优化。

export const SCRIPT_ID = 'acu_visualizer_v8_96';

export const STORAGE_KEYS = Object.freeze({
  TABLE_ORDER: 'acu_table_order',
  TABLE_EXPANDED: 'acu_table_expanded',
  NIGHT_MODE: 'acu_night_mode',
  ACTIVE_TAB: 'acu_active_tab',
  INNER_SCROLL_POSITION: 'acu_table_inner_scroll_position_v2',
  UI_CONFIG: 'acu_ui_config_v8_1',
  LAST_SNAPSHOT: 'acu_data_snapshot_v8_5',
  PAGINATION: 'acu_pagination_state_v2',
  TAB_STATUS: 'acu_tab_status_v8_1',
  CELL_HISTORY: 'acu_cell_history_v8_8',
  CLEANUP_SETTINGS: 'acu_cleanup_settings_v8_9',
});

export const STORAGE_SIZE_LIMIT_MB = 4;

export const DEFAULT_CONFIG = Object.freeze({
  theme: 'retro',
  highlightNew: true,
  autoCleanup: true,
  maxHistoryItems: 30,
  keepSnapshots: false,
  horizontalTables: [],
  columnHeaderFontSize: 14,
  tabFontSize: 13,
  tableDataFontSize: 13,
});

export const DEFAULT_CLEANUP_SETTINGS = Object.freeze({
  clearSnapshots: true,
  clearHistory: true,
  clearScrollPositions: true,
  clearPagination: true,
  clearTabStatus: false,
  keepNightMode: true,
  keepThemeSettings: true,
  keepTableOrder: true,
});

export const DEFAULT_TAB_STATUS = Object.freeze({
  hasNewUpdates: false,
  userHasSeen: false,
  lastViewedHash: '',
  currentUpdateHash: '',
});

export const THEMES = Object.freeze([
  Object.freeze({ id: 'retro', name: '复古羊皮', icon: 'fas fa-scroll' }),
  Object.freeze({ id: 'dark', name: '极夜深空', icon: 'fas fa-moon' }),
  Object.freeze({ id: 'modern', name: '现代清爽', icon: 'fas fa-sun' }),
  Object.freeze({ id: 'forest', name: '森之物语', icon: 'fas fa-leaf' }),
  Object.freeze({ id: 'ocean', name: '深海幽蓝', icon: 'fas fa-water' }),
]);

export const DATABASE_SETTINGS_KEYS = Object.freeze([
  'shujuku_v80_allSettings_v2',
  'shujuku_v70_allSettings_v2',
  'shujuku_v60_allSettings_v2',
  'shujuku_v50_allSettings_v2',
  'shujuku_v36_allSettings_v2',
  'shujuku_v34_allSettings_v2',
]);

export const SVG_ICONS = Object.freeze({
  check: '<path d="M20 6 9 17l-5-5"></path>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>',
  tabs: '<path d="M4 5h8l2 3h6v11H4z"></path><path d="M4 9h16"></path>',
  rows: '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>',
  close: '<path d="M18 6 6 18"></path><path d="M6 6l12 12"></path>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path>',
  edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path><path d="M12 7v5l3 2"></path>',
  plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  trash:
    '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
  send: '<path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4Z"></path>',
});

export const acuSvgIcon = (name, className = 'acu-svg-icon') =>
  `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG_ICONS[name] || SVG_ICONS.check}</svg>`;

export const acuMenuIcon = name => `<span class="acu-menu-icon">${acuSvgIcon(name)}</span>`;

export const acuMenuItemContent = (iconName, label) =>
  `${acuMenuIcon(iconName)}<span class="acu-menu-label">${label}</span>`;

export const acuButtonIconLabel = (iconName, label) =>
  `<span class="acu-inline-svg-label">${acuSvgIcon(iconName)}<span>${label}</span></span>`;
