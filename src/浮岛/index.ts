import { teleportStyle } from '../util/script';
import './style.scss';

if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

declare global {
  interface Window {
    AutoCardUpdaterAPI: any;
    jQuery: any;
    $: any;
    SillyTavern: any;
  }
}

let $: any = null;

const SCRIPT_ID = 'char_island_v8_8_simplified';
const STORAGE_POS_KEY = 'ci_island_pos_v5';
const STORAGE_PANEL_SIZE_KEY = 'ci_panel_size_v5';
const STORAGE_MAP_SIZE_KEY = 'ci_map_size_v5';
const STORAGE_AVATAR_PREFIX = 'ci_avatar_img_';
const STORAGE_CUSTOM_CATEGORIES_KEY = 'ci_custom_cats_v1';
const STORAGE_THEME_KEY = 'ci_theme_v1';
const STORAGE_OPACITY_KEY = 'ci_opacity_v1';
const MAP_TABLE_MARKER = '[浮岛地图]'; // 标记浮岛注入的表格

function dbg(msg: string, data?: any) {
  console.log(`%c[浮岛DEBUG] ${msg}`, 'background: #d32f2f; color: #fff', data || '');
}

// 安全的localStorage封装，解决iframe/沙箱环境下localStorage不可用的问题
function safeGetItem(key: string, defaultValue: string = ''): string {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      return localStorage.getItem(key) || defaultValue;
    }
  } catch (e) {
    dbg('[Storage] getItem失败:', e);
  }
  return defaultValue;
}

function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (e) {
    dbg('[Storage] setItem失败:', e);
  }
  return false;
}

function safeRemoveItem(key: string): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.removeItem(key);
      return true;
    }
  } catch (e) {
    dbg('[Storage] removeItem失败:', e);
  }
  return false;
}

console.log('%c[浮岛] 脚本加载中... (v8.5 - Map Inject)', 'color: #00ff00; font-weight: bold; font-size: 16px;');

const ICONS = {
  grip: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 5h2v2H9V5zm4 0h2v2h-2V5zm-4 6h2v2H9v-2zm4 0h2v2h-2v-2zm-4 6h2v2H9v-2zm4 0h2v2h-2v-2z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  group: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  ghost: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12v6c0 1.1.9 2 2 2h2v2h2v-2h4v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-6c0-5.52-4.48-10-10-10zm-3 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  resize: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M22 22H2v-2h20v2zM22 18H6v-2h16v2zM22 14h-8v-2h8v2z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 14H6V8h12v10z"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
  expand_box: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
  save: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`,

  chat: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.5 3l-6 1.5-6-1.5-5.5 1.5v15l6-1.5 6 1.5 5.5-1.5v-15zm-11 13.5l-4 1v-12l4-1v12zm6-1l-4 1v-12l4-1v12z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4c0-1.1.9-2 2-2h6c1.11 0 2 .89 2 2zM9 4v7.75L7.5 14h9L15 11.75V4H9z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  location: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,

  slot_head: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M12 2c-4.42 0-8 3.58-8 8v4h2v-4c0-3.31 2.69-6 6-6s6 2.69 6 6v4h2v-4c0-4.42-3.58-8-8-8z"/></svg>`,
  slot_body: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,
  slot_weapon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M7 2v11h3v9l7-12h-3V2z"/></svg>`,
  slot_acc: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,
  stickman: `<img src="https://static.wikia.nocookie.net/eldenring/images/0/00/ER_Equipment_Slot_Icon_Transparent_Body.png" style="width:100%; height:100%; opacity:0.3; object-fit:contain;">`,
  settings: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
};

const CONFIG = {
  keywords: [
    '恋人',
    '情人',
    '爱人',
    '挚友',
    '宿敌',
    '夫妻',
    '搭档',
    '死党',
    '亲人',
    '兄妹',
    '姐弟',
    '父母',
    '核心',
    '正派',
    '反派',
    'BOSS',
    '伴侣',
    '未婚',
    '婚配',
    '主角',
    '重要',
  ],
  genericNames: [
    '妈',
    '婶',
    '伯',
    '叔',
    '姨',
    '爷',
    '奶',
    '混混',
    '路人',
    '老板',
    '小二',
    '侍卫',
    '丫鬟',
    '管家',
    '士兵',
    '司机',
    '路人',
  ],
  tables: {
    protagonist: '主角信息',
    important: '重要人物表',
    items: ['物品', '道具', '背包', '装备', '库存'],
    global: '全局数据表',
  },
};

const SVGS = {
  male: `<svg viewBox="0 0 24 24" fill="currentColor" opacity="0.2"><path d="M12 2C9.24 2 7 4.24 7 7c0 1.1.36 2.12.97 2.95C5.3 11.14 3 14.5 3 18v4h18v-4c0-3.5-2.3-6.86-4.97-8.05C16.64 9.12 17 8.1 17 7c0-2.76-2.24-5-5-5z"/></svg>`,
  female: `<svg viewBox="0 0 24 24" fill="currentColor" opacity="0.2"><path d="M12 2c-2.76 0-5 2.24-5 5 0 1.62.88 3.06 2.21 3.93-.83 1.94-3.21 5.07-3.21 8.07V22h12v-3c0-3-2.38-6.13-3.21-8.07C16.12 10.06 17 8.62 17 7c0-2.76-2.24-5-5-5z"/></svg>`,
};

const THEMES = [
  { id: 'light', name: '日间模式', color: '#ffffff' },
  { id: 'grey-warm', name: '暖灰', color: '#efebe9' },
  { id: 'night', name: '夜间模式', color: '#000000' },
  { id: 'night-purple', name: '深紫夜间', color: '#181020' },
];

// 地图模板注入相关
const STORAGE_MAP_ENABLED_KEY = 'ci_map_enabled_v1';

// 地图模板定义（用于注入到用户数据库）
const MAP_TEMPLATES = {
  // 主要地点表模板
  locationTable: {
    name: '主要地点表' + MAP_TABLE_MARKER,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    triggerSend: false,
    triggerSendDeep: 1,
    config: {
      toChat: true,
      useCustomStyle: false,
      triggerSendToChat: false,
      alternateTable: false,
      insertTable: false,
      alternateLevel: 0,
      skipTop: false,
      selectedCustomStyleKey: '',
      customStyles: {}
    },
    sourceData: {
      note: '【浮岛地图】记录当前活动层级的具体地点。',
      initNode: '游戏初始化时，需为当前层级区域新增至少三个主要地点。',
      deleteNode: '当发生地点层级深入时删除。',
      updateNode: '地点的环境描述等信息发生变化时更新。',
      insertNode: '在当前层级内发现新地点时添加。'
    },
    content: [
      [null, '地点名称', 'X坐标', 'Y坐标', '宽度', '高度', '环境描述']
    ]
  },
  // 地图元素表模板（增强版：带坐标和尺寸）
  elementTable: {
    name: '地图元素表' + MAP_TABLE_MARKER,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    triggerSend: false,
    triggerSendDeep: 1,
    config: {
      toChat: true,
      useCustomStyle: false,
      triggerSendToChat: false,
      alternateTable: false,
      insertTable: false,
      alternateLevel: 0,
      skipTop: false,
      selectedCustomStyleKey: '',
      customStyles: {}
    },
    sourceData: {
      note: '【浮岛地图】记录场景中可交互的实体（怪物/NPC/物品）。所属主地点必须与主要地点表对应。X/Y坐标和宽高用于在地图上精确定位元素。',
      initNode: '新地点创建时，必须为其添加至少一个地图元素。',
      deleteNode: '实体被消灭/摧毁/取走时删除。',
      updateNode: '实体状态因交互改变时更新。每轮必须刷新互动选项。',
      insertNode: '场景中出现新的可交互实体时添加。'
    },
    content: [
      [null, '元素名称', '元素类型', '元素描述', '所属主地点', '状态', 'X坐标', 'Y坐标', '宽度', '高度', '互动选项1', '互动选项2', '互动选项3']
    ]
  }
};

// 地图提示词模板（简化版，只包含地图相关的表格说明）
const MAP_PROMPT_TEMPLATE = `
## 地图表格填写指南（浮岛地图扩展）

### 主要地点表
【说明】记录当前活动层级的具体地点。
- 列0: 地点名称 - 地点的唯一名称。
- 列1: X坐标 - 地图左上角在800x600画布上的X轴位置。
- 列2: Y坐标 - 地图左上角在800x600画布上的Y轴位置。
- 列3: 宽度 - 地图在画布上的宽度（建议80-200）。
- 列4: 高度 - 地图在画布上的高度（建议60-150）。
- 列5: 环境描述 - 对该地点环境、氛围的简要文字描述。

### 地图元素表
【说明】记录场景中可交互的实体（怪物/NPC/物品）。
- 列0: 元素名称 - 实体的名称。
- 列1: 元素类型 - 分为"怪物"、"NPC"、"物品"、"载具"、"环境"等。
- 列2: 元素描述 - 对该实体外观、特征的简要描述。
- 列3: 所属主地点 - 该实体当前所在的地点名称，必须与主要地点表对应。
- 列4: 状态 - 实体的当前状态（如："游荡"、"可调查"、"已摧毁"）。
- 列5: X坐标 - 元素在所属地点内的相对X位置（0-100%转换为实际坐标）。
- 列6: Y坐标 - 元素在所属地点内的相对Y位置。
- 列7: 宽度 - 元素的显示宽度（建议15-40）。
- 列8: 高度 - 元素的显示高度（建议15-40）。
- 列9-11: 互动选项 - 主角可以对该实体执行的3个具体动作。

【坐标计算规则】
元素的实际显示位置 = 所属地点的坐标 + 元素的相对坐标
建议元素坐标在所属地点范围内，避免超出边界。
`;


let storedOpacity: any;
try {
  storedOpacity = JSON.parse(safeGetItem(STORAGE_OPACITY_KEY, '{"main": 1, "map": 1}'));
} catch (e) {
  storedOpacity = { main: 1, map: 1 };
}
if (typeof storedOpacity !== 'object' || !storedOpacity) storedOpacity = { main: 1, map: 1 };

const state = {
  isExpanded: false,
  activeCategory: null,
  isOptionsOpen: false,
  isMapOpen: false,
  isMapPinned: false,
  theme: safeGetItem(STORAGE_THEME_KEY, 'light'),
  opacity: storedOpacity,
  cachedData: {
    main: [],
    side: [],
    retired: [],
    mapLocations: [],
    mapElements: [],
    protagonistLoc: '',
    hasMapTable: false,
    hasLongGoal: false,
    externalAreas: [] as string[],
  },
  optionsData: [] as string[],
  customCategories: JSON.parse(safeGetItem(STORAGE_CUSTOM_CATEGORIES_KEY, '{}')),
  drag: { active: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, rafId: null as number | null },
  isGlobalDragging: false,
  resize: { active: false, mode: null, startX: 0, startY: 0, startW: 0, startH: 0, startLeft: 0 },
  currentUploadChar: null as any,
  lastExpandedCardName: null as string | null,
  bagPagination: {} as Record<string, number>,
};

function applyOpacity(type: 'main' | 'map', val: number) {
  state.opacity[type] = val;
  safeSetItem(STORAGE_OPACITY_KEY, JSON.stringify(state.opacity));
  dbg(`[透明度] 设置${type === 'main' ? '主界面' : '地图'}透明度:`, val);

  if (type === 'main') {
    // 主界面透明度：包括浮岛、角色面板、选项、设置、编辑弹窗
    $('#ci-island-container, #ci-panel, .ci-options-container, .ci-edit-overlay, .ci-settings-overlay').css(
      'opacity',
      val,
    );
  } else {
    // 地图独立控制
    $('#ci-map-panel').css('opacity', val);
  }
}

function applyTheme(themeId: string) {
  state.theme = themeId;
  safeSetItem(STORAGE_THEME_KEY, themeId);
  dbg(`[主题] 切换主题到: ${themeId}`);
  $('body').removeClass(THEMES.map(t => `theme-${t.id}`).join(' '));
  if (themeId !== 'light') $('body').addClass(`theme-${themeId}`);
}

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  const $t = $('#ci-toast');
  if (!$t || $t.length === 0) return;
  $t.text(msg);
  $t.css('background', type === 'error' ? '#f44336' : '#4caf50');
  $t.addClass('show');
  setTimeout(() => $t.removeClass('show'), 3000);
}

// ==================== 容器管理系统 ====================

// 判断元素是否为容器类型

function updateHeightClass($con: any) {
  const hasOpt = state.optionsData.length > 0;
  const hasMap = !!state.cachedData.hasMapTable;
  if (hasOpt) $('#ci-options-btn').css('display', 'flex');
  else $('#ci-options-btn').hide();
  if (hasMap) $('#ci-map-btn').css('display', 'flex');
  else $('#ci-map-btn').hide();
  let visibleButtons = 2;
  if (hasMap) visibleButtons++;
  if (hasOpt) visibleButtons++;
  if (state.isExpanded) visibleButtons += 3;
  const height = 36 + visibleButtons * 40;
  $con.css('height', height + 'px');
}

function closePanels($con: any, $pan: any, $mapPan: any) {
  state.isOptionsOpen = false;
  $('.ci-options-container').removeClass('visible');
  if (!state.isMapPinned) {
    $mapPan.removeClass('visible');
    state.isMapOpen = false;
    $('#ci-map-btn').removeClass('active');
  }
  $pan.removeClass('visible');
  state.activeCategory = null;
  $('.ci-btn[data-type]').removeClass('active');
}

function collapseIsland($con: any) {
  state.isExpanded = false;
  $con.removeClass('expanded');
  $con.css('height', '');
}
function closeAll($con: any, $pan: any, $mapPan: any) {
  closePanels($con, $pan, $mapPan);
  collapseIsland($con);
}

function updateCategory(charName: string, newType: string) {
  state.customCategories[charName] = newType;
  safeSetItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(state.customCategories));
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (api && api.exportTableAsJson) {
    state.cachedData = processData(api.exportTableAsJson());
    if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
    showToast(`已将 ${charName} 移动到 ${newType === 'main' ? '主要' : newType === 'side' ? '次要' : '离场'}`);
  }
}

function syncPanelPosition($con: any, $pan: any, islandLeft: number, islandTop: number) {
  if ($pan.is('#ci-map-panel') && state.isMapPinned) return;
  const win = window.top || window;
  const winW = win.innerWidth || 1024;
  const winH = win.innerHeight || 768;
  const gap = 15;
  const islandW = 44;
  let panW = $pan.outerWidth();
  if (panW < 50) panW = 400;
  let targetLeft;
  if (islandLeft < winW / 2) {
    targetLeft = islandLeft + islandW + gap;
    if (targetLeft + panW > winW) targetLeft = winW - panW - gap;
  } else {
    targetLeft = islandLeft - panW - gap;
    if (targetLeft < 0) targetLeft = gap;
  }
  let targetTop = islandTop;
  if (targetTop < 10) targetTop = 10;
  if (targetTop + $pan.outerHeight() > winH) targetTop = winH - $pan.outerHeight() - 10;
  $pan.css({ top: targetTop, left: targetLeft });
}

function findTableByName(data: any, name: string): any {
  if (!data) return null;
  if (data[name]) return data[name];
  const values = Object.values(data);
  for (const table of values) {
    if ((table as any).name === name) return table;
  }
  const fuzzy = values.find((t: any) => t.name && (t.name.includes(name) || name.includes(t.name)));
  return fuzzy || null;
}

function processData(rawData: any) {
  const result: any = {
    main: [],
    side: [],
    retired: [],
    mapLocations: [],
    protagonistLoc: '',
    hasMapTable: false,
    hasLongGoal: false,
    externalAreas: [],
  };
  const allItems: any[] = [];
  if (!rawData) return result;
  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));
  try {
    state.optionsData = [];
    const globalTable = findTableByName(rawData, CONFIG.tables.global);
    if (globalTable && globalTable.content) {
      const h = globalTable.content[0] || [];
      const extIdx = getCol(h, ['外部区域列表', 'ExternalAreas']);
      if (extIdx > -1 && globalTable.content[1]) {
        const rawExt = globalTable.content[1][extIdx];
        if (rawExt)
          result.externalAreas = rawExt
            .split(/[,，;；]/)
            .map((s: string) => s.trim())
            .filter((s: string) => s);
      }
    }
    Object.values(rawData).forEach((s: any) => {
      if (CONFIG.tables.protagonist === s.name) {
        const h = s.content[0] || [];
        const op1 = getCol(h, ['选项一', 'Option1']);
        const op2 = getCol(h, ['选项二', 'Option2']);
        const op3 = getCol(h, ['选项三', 'Option3']);
        const op4 = getCol(h, ['选项四', 'Option4']);
        const locIdx = getCol(h, ['主角当前所在地点', '当前位置', 'Location']);
        if (s.content[1]) {
          if (op1 > -1 && s.content[1][op1]) state.optionsData.push(s.content[1][op1]);
          if (op2 > -1 && s.content[1][op2]) state.optionsData.push(s.content[1][op2]);
          if (op3 > -1 && s.content[1][op3]) state.optionsData.push(s.content[1][op3]);
          if (op4 > -1 && s.content[1][op4]) state.optionsData.push(s.content[1][op4]);
          if (locIdx > -1) result.protagonistLoc = s.content[1][locIdx];
        }
      }
    });
    updateHeightClass($('#ci-island-container'));

    Object.values(rawData).forEach((s: any) => {
      if (!s || !s.name) return;
      const hasItemCol = s.content[0] && getCol(s.content[0], ['物品', '道具', '背包']) > -1;
      const isItemTable = CONFIG.tables.items.some(key => s.name.includes(key));
      if (isItemTable || hasItemCol) {
        const h = s.content[0] || [];
        const nameIdx = getCol(h, ['名称', '名字', '物品']);
        const ownerIdx = getCol(h, ['拥有者', '拥有人', '持有者', '归属', 'Owner']);
        const countIdx = getCol(h, ['数量', '个数']);
        const typeIdx = getCol(h, ['类型', '种类']);
        const descIdx = getCol(h, ['描述', '效果']);
        if (nameIdx > -1) {
          s.content.slice(1).forEach((r: any, relativeIdx: number) => {
            if (!r[nameIdx]) return;
            const details: any = {};
            h.forEach((header, i) => {
              if (i !== ownerIdx && r[i]) details[header] = r[i];
            });
            allItems.push({
              name: r[nameIdx],
              owner: r[ownerIdx],
              count: countIdx > -1 ? r[countIdx] || 1 : 1,
              type: typeIdx > -1 ? r[typeIdx] : '物品',
              desc: descIdx > -1 ? r[descIdx] : '',
              details: details,
              _src: { table: s.name, rowIdx: relativeIdx + 1 },
            });
          });
        }
      }
    });

    Object.values(rawData).forEach((s: any) => {
      if (!s || !s.name) return;
      const h = s.content[0] || [];
      const rows = s.content.slice(1);
      const idx = {
        name: getCol(h, ['姓名', '名字', '名称']),
        age: getCol(h, ['年龄', '岁数']),
        sex: getCol(h, ['性别']),
        loc: getCol(h, ['地点', '位置', '所在地']),
        job: getCol(h, ['职业']),
        identity: getCol(h, ['身份']),
        desc: getCol(h, ['关系', '描述', '简介']),
        shortGoal: h.findIndex(
          x =>
            x &&
            ['短期目标', '心声', '当前', '即时'].some(n => x.includes(n)) &&
            !['位置', '地点', '时间'].some(ex => x.includes(ex)),
        ),
        longGoal: getCol(h, ['长期目标', '终极目标', '愿望']),
        ret: getCol(h, ['离场', '死亡', '退场']),
        item: getCol(h, ['物品', '道具', '背包']),
        special: getCol(h, ['特殊状态', '状态', 'BUFF']),
      };
      if (idx.longGoal > -1) result.hasLongGoal = true;
      if (idx.name === -1) return;
      const isProtagTable = s.name === CONFIG.tables.protagonist;
      const isImportantTable = s.name === CONFIG.tables.important;
      if (isProtagTable || isImportantTable) {
        rows.forEach((r: any, rowIdx: number) => {
          const name = r[idx.name];
          if (!name) return;
          let job = idx.job > -1 ? r[idx.job] : '';
          let identity = idx.identity > -1 ? r[idx.identity] : '';
          const desc = idx.desc > -1 ? r[idx.desc] : '';
          if (idx.job > -1 && r[idx.job]) {
            const rawJob = String(r[idx.job]);
            const split = rawJob.split(/[:：/／;；]/);
            if (split.length > 1) {
              job = split[0].trim();
              identity = split[1].trim();
            } else {
              job = rawJob;
            }
          }
          let sex = idx.sex > -1 ? r[idx.sex] : '?';
          let age = idx.age > -1 ? r[idx.age] : '?';
          if (idx.sex > -1 && (h[idx.sex].includes('/') || h[idx.sex].includes('年龄'))) {
            const rawSex = String(r[idx.sex]);
            const split = rawSex.split(/[:：/／;；]/);
            if (split.length > 1) {
              sex = split[0].trim();
              age = split[1].trim();
            }
          }
          let loc = '未知';
          if (idx.loc > -1 && r[idx.loc]) loc = r[idx.loc];
          const charObj = {
            name,
            loc,
            job,
            identity,
            desc,
            age: age,
            sex: sex,
            shortGoal: idx.shortGoal > -1 ? r[idx.shortGoal] : '',
            longGoal: idx.longGoal > -1 ? r[idx.longGoal] : '',
            special: idx.special > -1 ? r[idx.special] : '',
            items: [] as any[],
            _src: { table: s.name, originName: name },
          };
          const globalItems = allItems.filter(i => {
            if (!i.owner) return false;
            const owner = String(i.owner).replace(/\s/g, '').toLowerCase();
            const charName = String(name).replace(/\s/g, '').toLowerCase();
            return owner.includes(charName) || charName.includes(owner);
          });
          charObj.items = [...charObj.items, ...globalItems];
          let type = 'side';
          const customCat = state.customCategories[name];
          if (customCat) type = customCat;
          else {
            const isRet = idx.ret > -1 && ['是', 'Yes', '1', '已离场'].some(x => String(r[idx.ret]).includes(x));
            const descText = job + identity + desc;
            if (isRet) type = 'retired';
            else if (isProtagTable) type = 'main';
            else if (CONFIG.keywords.some(kw => descText.includes(kw))) type = 'main';
            else if (CONFIG.genericNames.some(gn => name.includes(gn)) && name.length < 4) type = 'side';
          }
          if (type === 'main') result.main.push(charObj);
          else if (type === 'retired') result.retired.push(charObj);
          else result.side.push(charObj);
        });
      }
    });

    const mainLocTable = findTableByName(rawData, '主要地点表');
    const elementTable = findTableByName(rawData, '地图元素表');
    result.hasMapTable = !!(mainLocTable || elementTable);
    if (mainLocTable && mainLocTable.content) {
      const h = mainLocTable.content[0] || [];
      const idx = {
        name: getCol(h, ['地点名称', 'Name']),
        x: getCol(h, ['X坐标', 'X']),
        y: getCol(h, ['Y坐标', 'Y']),
        w: getCol(h, ['宽度', 'Width']),
        h: getCol(h, ['高度', 'Height']),
        desc: getCol(h, ['环境描述', 'Desc']),
      };
      if (idx.name > -1) {
        mainLocTable.content.slice(1).forEach((r: any) => {
          const x = parseInt(r[idx.x]);
          const y = parseInt(r[idx.y]);
          if (r[idx.name] && !isNaN(x)) {
            result.mapLocations.push({
              name: r[idx.name],
              x: x,
              y: y,
              width: parseInt(r[idx.w]) || 200,  // 默认宽度从100增加到200
              height: parseInt(r[idx.h]) || 150, // 默认高度从80增加到150
              desc: r[idx.desc] || '',
            });
          }
        });
      }
    }
    if (elementTable && elementTable.content) {
      result.mapElements = [];
      const h = elementTable.content[0] || [];
      const idx = {
        name: getCol(h, ['元素名称', '名称', 'Name']),
        type: getCol(h, ['元素类型', '类型', 'Type']),
        loc: getCol(h, ['所属主地点', '地点', 'Location']),
        desc: getCol(h, ['元素描述', '描述', 'Desc']),
        status: getCol(h, ['状态', 'Status']),
        opt1: getCol(h, ['互动选项1', 'Option1']),
        opt2: getCol(h, ['互动选项2', 'Option2']),
        opt3: getCol(h, ['互动选项3', 'Option3']),
      };
      dbg('[地图元素表] 列索引:', idx);
      if (idx.name > -1 && idx.loc > -1) {
        elementTable.content.slice(1).forEach((r: any) => {
          if (r[idx.name] && r[idx.loc]) {
            const interactions = [];
            if (idx.opt1 > -1 && r[idx.opt1]) interactions.push(r[idx.opt1]);
            if (idx.opt2 > -1 && r[idx.opt2]) interactions.push(r[idx.opt2]);
            if (idx.opt3 > -1 && r[idx.opt3]) interactions.push(r[idx.opt3]);
            result.mapElements.push({
              name: r[idx.name],
              type: r[idx.type] || '物品',
              location: r[idx.loc],
              desc: r[idx.desc] || '',
              status: idx.status > -1 ? r[idx.status] : '',
              interactions: interactions,
            });
          }
        });
      }
    }
  } catch (e) {
    dbg('解析错误', e);
  }
  return result;
}

async function saveCharData(src: any, newData: any) {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }
  dbg('Saving char data...', { src, newData });
  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }
  let table: any = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }
  if (!table || !table.content) {
    showToast('数据表丢失: ' + src.table, 'error');
    return;
  }
  const h = table.content[0] || [];
  const getCol = (ns: string[]) =>
    h.findIndex((x: any) => x && ns.some(n => String(x).toLowerCase().includes(n.toLowerCase())));
  const currentCols = {
    name: getCol(['姓名', '名字', '名称']),
    sex: getCol(['性别']),
    age: getCol(['年龄', '岁数']),
    job: getCol(['职业']),
    identity: getCol(['身份']),
    loc: getCol(['地点', '位置', '所在地']),
    longGoal: getCol(['长期目标', '终极目标', '愿望']),
  };
  if (currentCols.name === -1) {
    showToast('找不到姓名列', 'error');
    return;
  }
  let targetRow = null;
  for (let i = 1; i < table.content.length; i++) {
    const row = table.content[i];
    if (row && row[currentCols.name] === src.originName) {
      targetRow = row;
      break;
    }
  }
  if (!targetRow) {
    showToast('找不到该角色: ' + src.originName, 'error');
    return;
  }
  if (currentCols.name > -1) targetRow[currentCols.name] = newData.name;
  if (currentCols.sex > -1) targetRow[currentCols.sex] = newData.sex;
  if (currentCols.age > -1) targetRow[currentCols.age] = newData.age;
  if (currentCols.job > -1) targetRow[currentCols.job] = newData.job;
  if (currentCols.identity > -1) targetRow[currentCols.identity] = newData.identity;
  if (currentCols.loc > -1) targetRow[currentCols.loc] = newData.loc;
  if (currentCols.longGoal > -1) targetRow[currentCols.longGoal] = newData.longGoal;
  await performDirectInjection(fullData);
  try {
    if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
    showToast('保存成功');
    state.cachedData = processData(fullData);
    if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
    $('.ci-edit-overlay').remove();
  } catch (e: any) {
    showToast('保存失败: ' + e.message, 'error');
  }
}

async function performDirectInjection(tableData: any) {
  try {
    const win = window as any;
    let ST = win.SillyTavern || (win.parent ? win.parent.SillyTavern : null);
    if (!ST && win.top && win.top.SillyTavern) ST = win.top.SillyTavern;
    if (!ST) return;
    const STORAGE_KEY_V5_SETTINGS = 'shujuku_v34_allSettings_v2';
    let isolationKey = '';
    try {
      let storage: Storage | null = null;
      try {
        if (typeof win.localStorage !== 'undefined' && win.localStorage !== null) {
          storage = win.localStorage;
        }
      } catch (e) {}
      if (storage && !storage.getItem(STORAGE_KEY_V5_SETTINGS) && win.parent) {
        try {
          if (typeof win.parent.localStorage !== 'undefined' && win.parent.localStorage !== null) {
            storage = win.parent.localStorage;
          }
        } catch (e) {}
      }
      if (storage) {
        const settingsStr = storage.getItem(STORAGE_KEY_V5_SETTINGS);
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings.dataIsolationEnabled && settings.dataIsolationCode) isolationKey = settings.dataIsolationCode;
        }
      }
    } catch (e) {}
    if (ST.chat && ST.chat.length > 0) {
      let targetMsg = null;
      for (let i = ST.chat.length - 1; i >= 0; i--) {
        if (!ST.chat[i].is_user) {
          targetMsg = ST.chat[i];
          break;
        }
      }
      if (targetMsg) {
        if (!targetMsg.TavernDB_ACU_IsolatedData) targetMsg.TavernDB_ACU_IsolatedData = {};
        if (!targetMsg.TavernDB_ACU_IsolatedData[isolationKey])
          targetMsg.TavernDB_ACU_IsolatedData[isolationKey] = {
            independentData: {},
            modifiedKeys: [],
            updateGroupKeys: [],
          };
        const tagData = targetMsg.TavernDB_ACU_IsolatedData[isolationKey];
        if (!tagData.independentData) tagData.independentData = {};
        const sheetsToSave = Object.keys(tableData).filter(k => k.startsWith('sheet_'));
        sheetsToSave.forEach(k => {
          tagData.independentData[k] = JSON.parse(JSON.stringify(tableData[k]));
        });
        const existingKeys = tagData.modifiedKeys || [];
        tagData.modifiedKeys = [...new Set([...existingKeys, ...sheetsToSave])];
        if (!targetMsg.TavernDB_ACU_Data) targetMsg.TavernDB_ACU_Data = {};
        if (ST.saveChat) await ST.saveChat();
      }
    }
  } catch (e) {
    console.error('[浮岛] Injection error', e);
  }
}

async function deleteCharData(src: any) {
  if (!confirm(`确定要删除角色 ${src.originName} 吗？`)) return;
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api) return;
  const fullData = api.exportTableAsJson();
  let table: any = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }
  if (!table) return;
  const h = table.content[0] || [];
  const nameIdx = h.findIndex((x: any) => x && String(x).includes('名'));
  let delIdx = -1;
  for (let i = 1; i < table.content.length; i++) {
    if (table.content[i][nameIdx] === src.originName) {
      delIdx = i;
      break;
    }
  }
  if (delIdx !== -1) {
    table.content.splice(delIdx, 1);
    await performDirectInjection(fullData);
    if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
    showToast('删除成功');
    state.cachedData = processData(fullData);
    if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
    $('.ci-edit-overlay').remove();
  }
}

async function saveItemData(action: 'update' | 'delete' | 'add', data: any) {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api) return;
  const fullData = api.exportTableAsJson();
  if (action === 'add') {
    let targetTable = null;
    for (const key in fullData) {
      if (fullData[key] && CONFIG.tables.items.some(t => fullData[key].name && fullData[key].name.includes(t))) {
        targetTable = fullData[key];
        break;
      }
    }
    if (targetTable) {
      const h = targetTable.content[0] || [];
      const newRow = new Array(h.length).fill('');
      const setCol = (names: string[], val: any) => {
        const idx = h.findIndex((x: any) => x && names.some(n => String(x).includes(n)));
        if (idx > -1) newRow[idx] = val;
      };
      setCol(['名称', '名字', '物品'], data.name);
      setCol(['拥有者', 'Owner'], data.owner);
      setCol(['数量'], data.count);
      setCol(['类型'], data.type);
      setCol(['描述'], data.desc);
      targetTable.content.push(newRow);
    }
  } else {
    let targetTable = null;
    for (const key in fullData) {
      if (fullData[key] && fullData[key].name === data._src.table) {
        targetTable = fullData[key];
        break;
      }
    }
    if (targetTable && targetTable.content[data._src.rowIdx]) {
      if (action === 'delete') targetTable.content.splice(data._src.rowIdx, 1);
      else if (action === 'update') {
        const row = targetTable.content[data._src.rowIdx],
          h = targetTable.content[0];
        const setCol = (names: string[], val: any) => {
          const idx = h.findIndex((x: any) => x && names.some(n => String(x).includes(n)));
          if (idx > -1) row[idx] = val;
        };
        setCol(['名称', '名字'], data.name);
        setCol(['数量'], data.count);
        setCol(['类型'], data.type);
        setCol(['描述'], data.desc);
      }
    }
  }
  await performDirectInjection(fullData);
  if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
  showToast('操作成功');
  state.cachedData = processData(fullData);
  if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
  $('.ci-inv-modal').remove();
}

function manageInventory(charName: string, items: any[]) {
  $('.ci-inv-modal').remove();
  const $modal = $(
    `<div class="ci-inv-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2200;display:flex;align-items:center;justify-content:center;"><div class="ci-inv-card" style="width:500px;height:70%;background:#fff;border-radius:12px;padding:16px;display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;margin-bottom:10px;font-weight:bold;"><span>${charName} 背包</span><span class="ci-inv-close" style="cursor:pointer;">${ICONS.close}</span></div><div class="ci-inv-list" style="flex:1;overflow-y:auto;border:1px solid #eee;margin-bottom:10px;"></div><button class="ci-inv-add-btn" style="background:#1a73e8;color:white;border:none;padding:8px;border-radius:6px;">+ 添加</button></div></div>`,
  );
  const renderList = () => {
    const $list = $modal.find('.ci-inv-list').empty();
    items.forEach(item => {
      const $row = $(
        `<div style="display:flex;padding:8px;border-bottom:1px solid #eee;align-items:center;"><div style="flex:1;font-size:12px;"><b>${item.name}</b> x${item.count}<div style="color:#999">${item.type}</div></div><button class="ci-inv-edit">${ICONS.edit}</button><button class="ci-inv-del">${ICONS.close}</button></div>`,
      );
      $row.find('.ci-inv-edit').click(() => {
        const $e = $(
          `<div class="ci-edit-overlay" style="z-index:2300;"><div class="ci-edit-card"><div class="ci-edit-close">${ICONS.close}</div><div class="ci-input-group">名称<input class="ci-input-field" data-f="name" value="${item.name}"></div><div class="ci-input-group">数量<input class="ci-input-field" data-f="count" value="${item.count}"></div><div class="ci-input-group">类型<input class="ci-input-field" data-f="type" value="${item.type}"></div><div class="ci-input-group">描述<textarea class="ci-input-field" data-f="desc">${item.desc}</textarea></div><button class="ci-edit-save-btn">${ICONS.save} 保存</button></div></div>`,
        );
        $e.find('.ci-edit-close').click((e: any) => {
          e.stopPropagation(); // 防止触发父级面板的事件
          dbg('[编辑弹窗] 点击关闭按钮');
          $e.remove();
        });
        // 点击遮罩层（空白处）关闭弹窗，但不包括点击编辑卡片内部
        $e.on('click', function (ev: any) {
          if (ev.target === this) {
            dbg('[编辑弹窗] 点击遮罩层关闭');
            $e.remove();
          }
        });
        // 阻止编辑卡片内部点击事件冒泡
        $e.find('.ci-edit-card').on('click', (ev: any) => {
          ev.stopPropagation();
        });
        $e.find('.ci-edit-save-btn').click((e: any) => {
          e.stopPropagation(); // 防止触发父级面板的事件
          dbg('[编辑弹窗] 保存物品数据');
          saveItemData('update', {
            ...item,
            name: $e.find('[data-f="name"]').val(),
            count: $e.find('[data-f="count"]').val(),
            type: $e.find('[data-f="type"]').val(),
            desc: $e.find('[data-f="desc"]').val(),
          });
          $e.remove();
        });
        $('body').append($e);
      });
      $row.find('.ci-inv-del').click(() => {
        if (confirm('Del?')) saveItemData('delete', item);
      });
      $list.append($row);
    });
  };
  renderList();
  $modal.find('.ci-inv-add-btn').click(() => {
    const $a = $(
      `<div class="ci-edit-overlay" style="z-index:2300;"><div class="ci-edit-card"><div class="ci-edit-close">${ICONS.close}</div><div class="ci-input-group">名称<input class="ci-input-field" data-f="name"></div><div class="ci-input-group">数量<input class="ci-input-field" data-f="count" value="1"></div><div class="ci-input-group">类型<input class="ci-input-field" data-f="type" value="物品"></div><div class="ci-input-group">描述<textarea class="ci-input-field" data-f="desc"></textarea></div><button class="ci-edit-save-btn">${ICONS.plus} 添加</button></div></div>`,
    );
    $a.find('.ci-edit-close').click((e: any) => {
      e.stopPropagation(); // 防止触发父级面板的事件
      dbg('[添加物品弹窗] 点击关闭按钮');
      $a.remove();
    });
    // 点击遮罩层（空白处）关闭弹窗，但不包括点击编辑卡片内部
    $a.on('click', function (ev: any) {
      if (ev.target === this) {
        dbg('[添加物品弹窗] 点击遮罩层关闭');
        $a.remove();
      }
    });
    // 阻止编辑卡片内部点击事件冒泡
    $a.find('.ci-edit-card').on('click', (ev: any) => {
      ev.stopPropagation();
    });
    $a.find('.ci-edit-save-btn').click((e: any) => {
      e.stopPropagation(); // 防止触发父级面板的事件
      const n = $a.find('[data-f="name"]').val();
      if (n) {
        dbg('[添加物品弹窗] 添加新物品:', n);
        saveItemData('add', {
          name: n,
          count: $a.find('[data-f="count"]').val(),
          type: $a.find('[data-f="type"]').val(),
          desc: $a.find('[data-f="desc"]').val(),
          owner: charName,
        });
        $a.remove();
      }
    });
    $('body').append($a);
  });
  // BUG FIX: 点击关闭按钮只关闭当前弹窗，不关闭父级面板
  $modal.find('.ci-inv-close').click((e: any) => {
    e.stopPropagation();
    dbg('[物品管理弹窗] 点击关闭按钮');
    $modal.remove();
  });
  // BUG FIX: 点击遮罩层（空白处）关闭弹窗，但不触发父级面板
  $modal.on('click', function (ev: any) {
    if (ev.target === this) {
      ev.stopPropagation();
      dbg('[物品管理弹窗] 点击遮罩层关闭');
      $modal.remove();
    }
  });
  // 阻止内部卡片点击事件冒泡
  $modal.find('.ci-inv-card').on('click', (ev: any) => {
    ev.stopPropagation();
  });
  $('body').append($modal);
}

function renderBagContent($container: any, d: any) {
  $container.empty();
  const items = d.items;
  if (!items || !items.length) {
    $container.html('<div style="color:#aaa;text-align:center;padding:10px;font-size:10px;">空</div>');
    return;
  }
  const $grid = $(`<div class="ci-bag-grid"></div>`);
  items.forEach((item: any, idx: number) => {
    const $el = $(
      `<div class="ci-bag-item" data-idx="${idx}"><span>${item.name}</span>${item.count > 1 ? `<div class="ci-item-count">${item.count}</div>` : ''}</div>`,
    );
    $el.click(e => {
      e.stopPropagation();
      alert(`${item.name}\n${item.desc || ''}`);
    });
    $grid.append($el);
  });
  $container.append($grid);
}

function renderGrid(type: any, $pan: any) {
  const data = state.cachedData[type] || [];
  $pan.find('#ci-panel-title').text({ main: '主要', side: '次要', retired: '离场' }[type] + ` (${data.length})`);
  const $grid = $pan.find('.ci-grid-view').empty();
  if (!data.length) {
    $grid.html('<div style="color:#999;text-align:center;padding:20px;">暂无数据</div>');
    return;
  }
  data.forEach((d: any) => {
    const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + d.name, '');
    const avatarHtml = localImg ? `<img src="${localImg}">` : d.name.charAt(0);
    let tags = '';
    if (d.special)
      tags =
        `<div class="ci-tag-group">` +
        d.special
          .split(/[,，]/)
          .map((t: string) => `<span class="ci-tag">${t}</span>`)
          .join('') +
        `</div>`;
    const $card = $(
      `<div class="ci-card" id="card-${d.name}"><div class="ci-card-compact"><div class="ci-menu-trigger">${ICONS.dots}</div><div class="ci-card-menu-popover"><div class="ci-menu-item" data-move="main">主要</div><div class="ci-menu-item" data-move="side">次要</div><div class="ci-menu-item" data-move="retired">离场</div></div><div class="ci-card-avatar">${avatarHtml}</div><div class="ci-card-name">${d.name}</div><div class="ci-card-role">${d.job || d.desc || '-'}</div><div class="ci-card-info">${d.sex} · ${d.age}</div>${tags}</div><div class="ci-expanded-box" style="display:none;"><div class="ci-nb-left"><div class="ci-big-avatar-box">${avatarHtml}<div class="ci-upload-hint">点击上传</div></div><div class="ci-info-scroll"><div class="ci-detail-row"><span class="ci-label">姓名</span><span class="ci-val">${d.name}</span></div><div class="ci-detail-row"><span class="ci-label">性别</span><span class="ci-val">${d.sex}</span></div><div class="ci-detail-row"><span class="ci-label">年龄</span><span class="ci-val">${d.age}</span></div><div class="ci-detail-row"><span class="ci-label">职业</span><span class="ci-val">${d.job || '-'}</span></div><div class="ci-detail-row"><span class="ci-label">身份</span><span class="ci-val">${d.identity || '-'}</span></div>${d.loc && d.loc !== '未知' ? `<div class="ci-detail-row"><span class="ci-label">位置</span><span class="ci-val"><span style="margin-right:4px;">${ICONS.location}</span>${d.loc}</span></div>` : ''}<div class="ci-long-goal">${d.longGoal || ''}</div></div></div><div class="ci-nb-right"><div class="ci-equip-ui"><div class="ci-equip-bg-icon">${d.sex === 'Female' || d.sex === '女' ? SVGS.female : SVGS.male}</div><div class="ci-slots-container"><div class="ci-slot" title="头部">${ICONS.slot_head}</div><div class="ci-slot" title="护甲">${ICONS.slot_body}</div><div class="ci-slot" title="武器">${ICONS.slot_weapon}</div><div class="ci-slot" title="副手">${ICONS.slot_weapon}</div><div class="ci-slot" title="饰品">${ICONS.slot_acc}</div></div></div><div class="ci-bag-section"><div class="ci-bag-header">物品 <span class="ci-bag-expand-btn">${ICONS.expand_box}</span></div><div class="ci-bag-container-inner"></div></div></div></div></div>`,
    );
    $card.click(e => {
      // 检查点击目标，分离不同的功能
      const $target = $(e.target);
      dbg('[角色卡] 点击事件, 目标:', e.target.className);

      // 1. 头像上传：点击大头像框时上传头像，不收起卡片
      if ($target.closest('.ci-big-avatar-box').length) {
        e.stopPropagation();
        dbg('[角色卡] 点击头像，触发上传');
        state.currentUploadChar = d;
        $('#ci-hidden-input').click();
        return;
      }

      // 2. 物品栏扩展按钮：切换物品栏全宽模式，不收起卡片
      if ($target.closest('.ci-bag-expand-btn').length) {
        e.stopPropagation();
        dbg('[角色卡] 点击物品栏扩展按钮');
        const $nbRight = $card.find('.ci-nb-right');
        $nbRight.toggleClass('full-width');
        // 注意：CSS中已经设置left:40%和width:60%，不需要隐藏左侧
        // 物品栏扩展后只占据右半区域
        return;
      }

      // 3. 排除项：菜单项、装备槽、物品格子（这些都有自己的点击逻辑）
      if ($target.closest('.ci-menu-trigger, .ci-menu-item, .ci-slot, .ci-bag-item').length) {
        return;
      }

      // 5. 点击展开后角色卡的空白区域，收起卡片
      if ($card.hasClass('is-expanded')) {
        dbg('[角色卡] 收起角色卡');
        // 重置物品栏扩展状态
        $card.find('.ci-nb-right').removeClass('full-width');
        $card.removeClass('is-expanded').find('.ci-expanded-box').hide();
        $card.find('.ci-card-compact').show();
        state.lastExpandedCardName = null;
      } else {
        // 6. 展开卡片
        dbg('[角色卡] 展开角色卡');
        $grid.find('.is-expanded').each(function() {
          $(this).find('.ci-nb-right').removeClass('full-width');
          $(this).removeClass('is-expanded').find('.ci-expanded-box').hide();
          $(this).find('.ci-card-compact').show();
        });
        $card.addClass('is-expanded').find('.ci-card-compact').hide();
        $card.find('.ci-expanded-box').css('display', 'flex');
        renderBagContent($card.find('.ci-bag-container-inner'), d);
        state.lastExpandedCardName = d.name;
      }
    });
    $card.find('.ci-menu-trigger').click(function (e) {
      e.stopPropagation();
      $(this).toggleClass('active');
    });
    $card.find('.ci-menu-item').click(function (e) {
      e.stopPropagation();
      updateCategory(d.name, $(this).data('move'));
    });
    // 物品区编辑逻辑已在$card.click中统一处理
    $grid.append($card);
  });
}

function checkOverlap(r1: any, r2: any) {
  const m = 10;
  return (
    r1.x < r2.x + r2.width + m &&
    r1.x + r1.width + m > r2.x &&
    r1.y < r2.y + r2.height + m &&
    r1.y + r1.height + m > r2.y
  );
}

function adjustLayout(locs: any[]) {
  if (!locs || locs.length < 2) return locs;
  
  // AI自动布局,不使用保存的位置
  
  const forceFactor = 0.8;
  for (let i = 0; i < 200; i++) {
    for (let j = 0; j < locs.length; j++) {
      for (let k = j + 1; k < locs.length; k++) {
        const la = locs[j],
          lb = locs[k];
        if (checkOverlap(la, lb)) {
          let dx = la.x + la.width / 2 - (lb.x + lb.width / 2);
          let dy = la.y + la.height / 2 - (lb.y + lb.height / 2);
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            dist = 1;
          }
          const overlapX = la.width / 2 + lb.width / 2 - Math.abs(dx);
          const overlapY = la.height / 2 + lb.height / 2 - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            const moveX = (dx / dist) * overlapX * forceFactor;
            const moveY = (dy / dist) * overlapY * forceFactor;
            la.x += moveX;
            la.y += moveY;
            lb.x -= moveX;
            lb.y -= moveY;
          }
        }
      }
    }
  }
  return locs;
}

function renderExternalAreas() {
  const areas = state.cachedData.externalAreas || [];
  const $container = $('.ci-external-areas');
  $container.empty();
  if (!areas || areas.length === 0) {
    $container.hide();
    return;
  }
  $container.show();
  areas.forEach((area: string) => {
    const $btn = $(`<button class="ci-ext-btn">${area}</button>`);
    $btn.on('click', (e: any) => {
      e.stopPropagation();
      sendGameActionRequest(`前往 ${area}`);
    });
    $container.append($btn);
  });
}

function showMapPopup(x: number, y: number, options: string[]) {
  $('.ci-map-popup-options').remove();
  const $popup = $(`<div class="ci-map-popup-options"></div>`);
  options.forEach((opt: string) => {
    const $btn = $(`<div class="ci-option-bubble">${opt}</div>`);
    $btn.on('click', (ev: any) => {
      ev.stopPropagation();
      sendGameActionRequest(opt);
      $popup.remove();
    });
    $popup.append($btn);
  });
  $('body').append($popup);

  // Dynamic positioning
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const popupRect = $popup[0].getBoundingClientRect();
  let left = x + 10;
  let top = y;

  if (left + popupRect.width > winW - 10) {
    left = x - popupRect.width - 10; // Flip to left
  }
  if (left < 10) left = 10; // Hard boundary

  if (top + popupRect.height > winH - 10) {
    top = winH - popupRect.height - 10; // Shift up
  }
  if (top < 10) top = 10;

  $popup.css({
    position: 'fixed',
    left: left + 'px',
    top: top + 'px',
    zIndex: 2005,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  });
}

function resolveElementCollisions(elements: any[], padding: number = 5) {
  const iterations = 50;
  const force = 0.5;
  for (let i = 0; i < iterations; i++) {
    for (let j = 0; j < elements.length; j++) {
      for (let k = j + 1; k < elements.length; k++) {
        const a = elements[j];
        const b = elements[k];
        const dx = a.x + a.size / 2 - (b.x + b.size / 2);
        const dy = a.y + a.size / 2 - (b.y + b.size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (a.size + b.size) / 2 + padding;
        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dist === 0 ? Math.random() - 0.5 : dx / dist;
          const ny = dist === 0 ? Math.random() - 0.5 : dy / dist;
          const moveX = nx * overlap * force;
          const moveY = ny * overlap * force;
          a.x += moveX;
          a.y += moveY;
          b.x -= moveX;
          b.y -= moveY;
        }
      }
    }
    elements.forEach(el => {
      if (el.parent) {
        const p = el.parent;
        const minX = p.x + padding;
        const maxX = p.x + p.width - el.size - padding;
        const minY = p.y + padding;
        const maxY = p.y + p.height - el.size - padding;
        el.x = Math.max(minX, Math.min(maxX, el.x));
        el.y = Math.max(minY, Math.min(maxY, el.y));
      }
    });
  }
}

function stringHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function pseudoRandom(seed: number) {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const handleDrag = ($el: any, onStart: any, onMove: any, onEnd: any) => {
  const startDrag = (e: any) => {
    const isTouch = e.type === 'touchstart';
    if (!isTouch && e.button !== 0) return;
    if (!isTouch) e.preventDefault();
    e.stopPropagation();
    const point = isTouch ? e.originalEvent.touches[0] : e;
    onStart(point, e);
    const moveEvent = isTouch ? 'touchmove' : 'mousemove';
    const endEvent = isTouch ? 'touchend' : 'mouseup';
    const moveHandler = (ev: any) => {
      const p = isTouch ? ev.originalEvent.touches[0] : ev;
      onMove(p, ev);
    };
    const endHandler = (ev: any) => {
      onEnd(ev);
      $(window).off(moveEvent, moveHandler).off(endEvent, endHandler);
      try {
        $(window.parent).off(moveEvent, moveHandler).off(endEvent, endHandler);
      } catch (e) {}
    };
    $(window).on(moveEvent, moveHandler).on(endEvent, endHandler);
    try {
      $(window.parent).on(moveEvent, moveHandler).on(endEvent, endHandler);
    } catch (e) {}
  };
  $el.on('mousedown touchstart', startDrag);
};

// [Fix 6] Define constrainElement BEFORE use in bindEvents/createUI
function constrainElement($el: any) {
  const win = window.parent || window;
  const $win = $(win);
  const winW = $win.width() || 1024;
  const winH = $win.height() || 768;
  const rect = $el[0].getBoundingClientRect();
  let newLeft = rect.left;
  let newTop = rect.top;
  if (newLeft < 0) newLeft = 0;
  if (newTop < 0) newTop = 0;
  if (newLeft + rect.width > winW) newLeft = winW - rect.width;
  if (newTop + rect.height > winH) newTop = winH - rect.height;
  $el.css({ left: newLeft, top: newTop, right: 'auto' });
  return { left: newLeft, top: newTop };
}

function sendGameActionRequest(msg: string) {
  const parentWin = window.parent as any;
  if (parentWin.SillyTavern && parentWin.SillyTavern.getContext) {
    const context = parentWin.SillyTavern.getContext();
    if (context && context.setInput) {
      context.setInput(msg);
      return;
    }
  }
  const textarea = $('#send_textarea');
  if (textarea.length) {
    textarea.val(msg).trigger('input');
  } else {
    const parentTextarea = $(window.parent.document).find('#send_textarea');
    if (parentTextarea.length) {
      parentTextarea.val(msg).trigger('input');
    }
  }
}

function renderMap() {
  try {
    renderExternalAreas();
    const locs = JSON.parse(JSON.stringify(state.cachedData.mapLocations || []));
    const rawElements = state.cachedData.mapElements || [];
    const allChars = [...state.cachedData.main, ...state.cachedData.side];
    const protLoc = state.cachedData.protagonistLoc;
    const $svg = $('#ci-map-svg');
    if (!$svg.length) return;
    $svg.empty();
    
    if (!locs.length) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '400');
      t.setAttribute('y', '300');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'middle');
      t.setAttribute('class', 'map-location-label');
      t.textContent = '暂无地图数据';
      $svg[0].appendChild(t);
      $svg.attr('viewBox', '0 0 800 600');
      return;
    }
    
    // 调整布局避免重叠
    const adjustedLocs = adjustLayout(locs);
    
    // 计算viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    adjustedLocs.forEach((l: any) => {
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
    });
    
    const padding = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 50);
    const vbX = minX - padding, vbY = minY - padding;
    const vbW = (maxX - minX) + (padding * 2);
    const vbH = (maxY - minY) + (padding * 2);
    $svg.attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    $svg.data('vb', { x: vbX, y: vbY, w: vbW, h: vbH });
    
    // 渲染地点
    adjustedLocs.forEach((loc: any) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-location-group');
      
      // 地点矩形
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', String(loc.x));
      r.setAttribute('y', String(loc.y));
      r.setAttribute('width', String(loc.width));
      r.setAttribute('height', String(loc.height));
      r.setAttribute('class', 'map-location-rect');
      r.setAttribute('rx', '8');
      
      // 地点文字
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(loc.x + loc.width / 2));
      t.setAttribute('y', String(loc.y + loc.height / 2));
      t.setAttribute('class', 'map-location-label');
      t.textContent = loc.name;
      
      g.appendChild(r);
      g.appendChild(t);
      
      // 点击事件
      g.addEventListener('click', () => {
        const rect = g.getBoundingClientRect();
        showMapPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, [`前往 ${loc.name}`]);
      });
      
      $svg[0].appendChild(g);
      
      // 渲染地点内的元素
      const locElements = rawElements.filter((e: any) => {
        const elLoc = String(e.location || '').trim();
        const locName = String(loc.name).trim();
        return locName.includes(elLoc) || elLoc.includes(locName);
      });
      
      const seedBase = stringHash(loc.name);
      locElements.forEach((el: any, i: number) => {
        // 使用伪随机位置
        const rx = pseudoRandom(seedBase + i * 100);
        const ry = pseudoRandom(seedBase + i * 100 + 1);
        const x = loc.x + 20 + rx * (loc.width - 70); // 留出50px给元素
        const y = loc.y + 20 + ry * (loc.height - 70);
        
        renderElement(el, x, y, $svg[0]);
      });
      
      // 渲染地点内的角色
      const locChars = allChars.filter((c: any) => {
        const cLoc = String(c.loc || '').trim();
        const locName = String(loc.name).trim();
        return locName.includes(cLoc) || cLoc.includes(locName);
      });
      
      locChars.forEach((char: any, i: number) => {
        const rx = pseudoRandom(seedBase + i * 200 + 50);
        const ry = pseudoRandom(seedBase + i * 200 + 51);
        const x = loc.x + 20 + rx * (loc.width - 70);
        const y = loc.y + 20 + ry * (loc.height - 70);
        
        renderCharacter(char, x, y, $svg[0]);
      });
      
      // 渲染主角位置标记
      if (protLoc && String(protLoc).trim() === String(loc.name).trim()) {
        renderProtagonistMarker(loc.x + loc.width / 2, loc.y + loc.height / 2, $svg[0]);
      }
    });
    
  } catch (e) {
    console.error('[renderMap] Error:', e);
  }
}

/**
 * 渲染单个元素
 */
function renderElement(el: any, x: number, y: number, svg: SVGElement) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'map-element-group');
  
  // 30x30矩形
  const size = 30;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(size));
  rect.setAttribute('height', String(size));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', '#f5f5f5');
  rect.setAttribute('stroke', '#9e9e9e');
  rect.setAttribute('stroke-width', '1.5');
  g.appendChild(rect);
  
  // 文字在下方
  const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  txt.setAttribute('x', String(x + size / 2));
  txt.setAttribute('y', String(y + size + 12));
  txt.setAttribute('text-anchor', 'middle');
  txt.setAttribute('font-size', '12');
  txt.setAttribute('fill', 'var(--map-text)');
  txt.textContent = el.name;
  g.appendChild(txt);
  
  // 点击事件
  g.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = g.getBoundingClientRect();
    const opts: string[] = [];
    
    // 自定义互动选项
    if (el.interactions && el.interactions.length > 0) {
      el.interactions.forEach((i: string) => {
        if (i && i.trim()) opts.push(i);
      });
    }
    
    // 默认选项
    if (opts.length === 0) {
      opts.push(`查看${el.name}`, `使用${el.name}`);
    }
    
    showMapPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, opts);
  });
  
  svg.appendChild(g);
}

/**
 * 渲染角色
 */
function renderCharacter(char: any, x: number, y: number, svg: SVGElement) {
  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + char.name, '');
  const gAv = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gAv.setAttribute('class', 'map-char-avatar');
  
  if (localImg) {
    const clipId = 'clip-' + char.name.replace(/[^a-zA-Z0-9]/g, '');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', clipId);
    const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clipCircle.setAttribute('cx', String(x + 26));
    clipCircle.setAttribute('cy', String(y + 26));
    clipCircle.setAttribute('r', '24');
    clipPath.appendChild(clipCircle);
    defs.appendChild(clipPath);
    gAv.appendChild(defs);
    
    const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circ.setAttribute('cx', String(x + 26));
    circ.setAttribute('cy', String(y + 26));
    circ.setAttribute('r', '26');
    circ.setAttribute('fill', '#fff');
    circ.setAttribute('stroke', '#5a3e2b');
    circ.setAttribute('stroke-width', '2');
    gAv.appendChild(circ);
    
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('x', String(x + 2));
    img.setAttribute('y', String(y + 2));
    img.setAttribute('width', '48');
    img.setAttribute('height', '48');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', localImg);
    img.setAttribute('clip-path', `url(#${clipId})`);
    gAv.appendChild(img);
  } else {
    const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circ.setAttribute('cx', String(x + 26));
    circ.setAttribute('cy', String(y + 26));
    circ.setAttribute('r', '26');
    circ.setAttribute('fill', '#e0f7fa');
    circ.setAttribute('stroke', '#006064');
    circ.setAttribute('stroke-width', '2');
    gAv.appendChild(circ);
    
    const tAv = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tAv.setAttribute('x', String(x + 26));
    tAv.setAttribute('y', String(y + 26));
    tAv.setAttribute('font-size', '20');
    tAv.setAttribute('text-anchor', 'middle');
    tAv.setAttribute('dominant-baseline', 'middle');
    tAv.textContent = char.name[0];
    gAv.appendChild(tAv);
  }
  
  gAv.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = gAv.getBoundingClientRect();
    const opts = [`查看 ${char.name}`, `对话 ${char.name}`];
    showMapPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, opts);
  });
  
  svg.appendChild(gAv);
}

/**
 * 渲染主角位置标记
 */
function renderProtagonistMarker(x: number, y: number, svg: SVGElement) {
  const avatarGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  avatarGroup.setAttribute('class', 'protagonist-map-avatar');
  
  // 脉冲波
  const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pulseCircle.setAttribute('cx', String(x));
  pulseCircle.setAttribute('cy', String(y));
  pulseCircle.setAttribute('r', '12');
  pulseCircle.setAttribute('class', 'pulse-wave');
  
  // 头像圆圈
  const avatarCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  avatarCircle.setAttribute('cx', String(x));
  avatarCircle.setAttribute('cy', String(y));
  avatarCircle.setAttribute('r', '12');
  avatarCircle.setAttribute('fill', '#4caf50');
  avatarCircle.setAttribute('stroke', '#fff');
  avatarCircle.setAttribute('stroke-width', '2');
  
  avatarGroup.appendChild(pulseCircle);
  avatarGroup.appendChild(avatarCircle);
  svg.appendChild(avatarGroup);
}

function createSettingsUI() {
  try {
    dbg('Opening Settings UI...');
    $('.ci-settings-overlay').remove();
    const $overlay = $(
      `<div class="ci-settings-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2400;display:flex;align-items:center;justify-content:center;"></div>`,
    );
    const $card = $(`<div class="ci-settings-card"></div>`);
    const $header = $(
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span style="font-weight:bold;font-size:16px;">浮岛设置 <span style="font-size:10px;font-weight:normal;opacity:0.6;">v8.5 (Map Inject)</span></span><span class="ci-close-btn">${ICONS.close}</span></div>`,
    );
    $header.find('.ci-close-btn').click(() => $overlay.remove());
    const $themeSec = $(`<div class="ci-settings-section"><div class="ci-settings-title">主题风格</div></div>`);
    const $dayCol = $(
      `<div style="margin-bottom:10px;"><div style="font-size:12px;opacity:0.7;margin-bottom:4px;">日间模式</div><div class="ci-color-grid"></div></div>`,
    );
    THEMES.filter(t => !t.id.startsWith('night')).forEach(t => {
      const $opt = $(
        `<div class="ci-color-opt" style="background:${t.color}; border:1px solid #ccc;" title="${t.name}"></div>`,
      );
      if (state.theme === t.id) $opt.addClass('active');
      $opt.click(() => {
        applyTheme(t.id);
        $themeSec.find('.ci-color-opt').removeClass('active');
        $opt.addClass('active');
      });
      $dayCol.find('.ci-color-grid').append($opt);
    });
    const $nightCol = $(
      `<div style="margin-bottom:10px;"><div style="font-size:12px;opacity:0.7;margin-bottom:4px;">夜间模式</div><div class="ci-color-grid"></div></div>`,
    );
    THEMES.filter(t => t.id.startsWith('night')).forEach(t => {
      const $opt = $(
        `<div class="ci-color-opt" style="background:${t.color}; border:1px solid #555;" title="${t.name}"></div>`,
      );
      if (state.theme === t.id) $opt.addClass('active');
      $opt.click(() => {
        applyTheme(t.id);
        $themeSec.find('.ci-color-opt').removeClass('active');
        $opt.addClass('active');
      });
      $nightCol.find('.ci-color-grid').append($opt);
    });
    $themeSec.append($dayCol).append($nightCol);
    const mkSlider = (label: string, key: 'main' | 'map') => {
      const $div = $(`<div style="margin-bottom:10px;"></div>`);
      const $label = $(
        `<div style="font-size:12px;margin-bottom:4px;display:flex;justify-content:space-between;"><span>${label}</span><span>${state.opacity[key]}</span></div>`,
      );
      const $input = $(
        `<input type="range" min="0.1" max="1" step="0.05" value="${state.opacity[key]}" style="width:100%;">`,
      );
      $input.on('input', (e: any) => {
        const val = parseFloat(e.target.value);
        $label.find('span:last-child').text(val);
        applyOpacity(key, val);
      });
      $div.append($label).append($input);
      return $div;
    };
    const $opacitySec = $(`<div class="ci-settings-section"><div class="ci-settings-title">透明度</div></div>`);
    $opacitySec.append(mkSlider('主界面透明度', 'main'));
    $opacitySec.append(mkSlider('地图面板透明度', 'map'));
    
    // ======== 地图功能开关 ========
    const mapEnabled = isMapEnabled();
    const $mapSec = $(`<div class="ci-settings-section"><div class="ci-settings-title">地图功能</div></div>`);
    const $mapToggle = $(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;">启用地图表格</div>
          <div style="font-size:10px;opacity:0.6;">自动注入地图所需的表格模板</div>
        </div>
        <label class="ci-switch" style="position:relative;display:inline-block;width:44px;height:24px;">
          <input type="checkbox" id="ci-map-toggle" ${mapEnabled ? 'checked' : ''} style="opacity:0;width:0;height:0;">
          <span class="ci-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${mapEnabled ? '#4caf50' : '#ccc'};transition:.3s;border-radius:24px;"></span>
        </label>
      </div>
    `);
    const $mapStatus = $(`<div class="ci-map-status" style="font-size:11px;padding:8px;background:rgba(0,0,0,0.03);border-radius:6px;margin-bottom:10px;"></div>`);
    
    // 更新状态显示
    const updateMapStatus = () => {
      const existing = checkMapTablesExist();
      let statusText = '';
      if (existing.hasLocation && existing.hasElement) {
        statusText = '✅ 地图表格已就绪（主要地点表 + 地图元素表）';
      } else if (existing.hasLocation) {
        statusText = '⚠️ 仅有主要地点表，缺少地图元素表';
      } else if (existing.hasElement) {
        statusText = '⚠️ 仅有地图元素表，缺少主要地点表';
      } else {
        statusText = '❌ 未检测到地图表格';
      }
      $mapStatus.html(statusText);
    };
    updateMapStatus();
    
    // 开关事件
    $mapToggle.find('#ci-map-toggle').on('change', async function() {
      const isChecked = $(this).prop('checked');
      const $slider = $mapToggle.find('.ci-slider');
      
      if (isChecked) {
        // 注入地图表格
        dbg('[设置] 用户启用地图功能');
        const success = await injectMapTables();
        if (success) {
          $slider.css('background', '#4caf50');
          updateMapStatus();
        } else {
          // 注入失败，恢复开关状态
          $(this).prop('checked', false);
          $slider.css('background', '#ccc');
        }
      } else {
        // 提示用户：移除只会移除浮岛标记的表格
        if (confirm('确定要关闭地图功能吗？\\n\\n注意：这只会移除由浮岛自动注入的表格，不会影响您自己创建的地图表格。')) {
          dbg('[设置] 用户禁用地图功能');
          const success = await removeMapTables();
          if (success) {
            $slider.css('background', '#ccc');
            updateMapStatus();
          } else {
            // 移除失败，恢复开关状态
            $(this).prop('checked', true);
            $slider.css('background', '#4caf50');
          }
        } else {
          // 用户取消，恢复开关状态
          $(this).prop('checked', true);
        }
      }
    });
    
    $mapSec.append($mapToggle).append($mapStatus);
    
    // ======== 重置按钮 ========
    const $resetBtn = $(
      `<button class="ci-btn" style="width:100%;border:1px solid var(--ci-border);border-radius:8px;margin-top:10px;">重置浮岛位置</button>`,
    );
    $resetBtn.click(() => {
      $('#ci-island-container').css({ top: '150px', right: '80px', left: 'auto', display: 'flex' });
      safeRemoveItem(STORAGE_POS_KEY);
      showToast('位置已重置');
    });
    $card.append($header).append($themeSec).append($opacitySec).append($mapSec).append($resetBtn);
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


// ================== 地图模板热插拔功能 ==================

/**
 * 检查数据库中是否已有浮岛地图表格
 */
function checkMapTablesExist(): { hasLocation: boolean; hasElement: boolean } {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson) {
    return { hasLocation: false, hasElement: false };
  }
  
  const data = api.exportTableAsJson();
  if (!data) return { hasLocation: false, hasElement: false };
  
  let hasLocation = false;
  let hasElement = false;
  
  Object.values(data).forEach((table: any) => {
    if (!table || !table.name) return;
    // 检查是否为浮岛注入的表格（带标记）或用户原有的地图表格
    if (table.name.includes('主要地点表')) hasLocation = true;
    if (table.name.includes('地图元素表')) hasElement = true;
  });
  
  return { hasLocation, hasElement };
}

/**
 * 获取当前数据库表格数量
 */
function getTableCount(): number {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson) return 0;
  
  const data = api.exportTableAsJson();
  if (!data) return 0;
  
  // 排除mate等非表格对象
  return Object.keys(data).filter(k => k.startsWith('sheet_')).length;
}

/**
 * 生成唯一的表格UID
 */
function generateTableUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sheet_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 注入地图表格到数据库
 */
async function injectMapTables(): Promise<boolean> {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return false;
  }
  
  dbg('[地图注入] ========== 开始注入地图表格 ==========');
  
  try {
    const existing = checkMapTablesExist();
    if (existing.hasLocation && existing.hasElement) {
      dbg('[地图注入] 地图表格已存在');
      showToast('地图表格已存在', 'error');
      return false;
    }
    
    const locUid = generateTableUid();
    const elUid = generateTableUid();
    
    dbg('[地图注入] 生成UID:', locUid, elUid);
    
    const locationTable = {
      uid: locUid,
      name: '主要地点表' + MAP_TABLE_MARKER,
      domain: 'chat',
      type: 'dynamic',
      enable: true,
      required: false,
      triggerSend: false,
      triggerSendDeep: 1,
      config: {
        toChat: true,
        useCustomStyle: false,
        triggerSendToChat: false,
        alternateTable: false,
        insertTable: false,
        alternateLevel: 0,
        skipTop: false,
        selectedCustomStyleKey: '',
        customStyles: {}
      },
      sourceData: {
        note: '记录当前活动层级的具体地点。当地点层级深入时（如从"小区"进入"公寓楼"），此表会被清空并填充新层级的子地点。',
        initNode: '游戏初始化时，需为当前层级区域新增至少三个主要地点。',
        deleteNode: '当发生地点层级深入时，原表中的地点在移至"外部区域列表"后将被删除。',
        updateNode: '地点的环境描述等信息发生变化时更新。',
        insertNode: '在当前层级内发现新地点时添加。'
      },
      content: [
        [null, '地点名称', 'X坐标', 'Y坐标', '宽度', '高度', '环境描述']
      ],
      exportConfig: {}
    };
    
    const elementTable = {
      uid: elUid,
      name: '地图元素表' + MAP_TABLE_MARKER,
      domain: 'chat',
      type: 'dynamic',
      enable: true,
      required: false,
      triggerSend: false,
      triggerSendDeep: 1,
      config: {
        toChat: true,
        useCustomStyle: false,
        triggerSendToChat: false,
        alternateTable: false,
        insertTable: false,
        alternateLevel: 0,
        skipTop: false,
        selectedCustomStyleKey: '',
        customStyles: {}
      },
      sourceData: {
        note: '记录场景中可交互的实体（怪物/NPC/物品）。`所属主地点`必须与主要地点表对应。',
        initNode: '新地点创建时，必须为其添加至少一个地图元素。',
        deleteNode: '实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。',
        updateNode: '实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。',
        insertNode: '场景中出现新的可交互实体时添加。'
      },
      content: [
        [null, '元素名称', '元素类型', '元素描述', '所属主地点', '状态', '互动选项1', '互动选项2', '互动选项3']
      ],
      exportConfig: {}
    };
    
    dbg('[地图注入] 🔧 修改数据库模板...');
    
    const templateKey = 'shujuku_v36_customTemplate';
    let TABLE_TEMPLATE_ACU = localStorage.getItem(templateKey);
    
    if (!TABLE_TEMPLATE_ACU) {
      showToast('无法读取数据库模板', 'error');
      dbg('[地图注入] ❌ localStorage中没有模板');
      return false;
    }
    
    let templateData: any;
    try {
      templateData = JSON.parse(TABLE_TEMPLATE_ACU);
      dbg('[地图注入] ✅ 模板解析成功，当前表格数:', Object.keys(templateData).filter(k => k.startsWith('sheet_')).length);
    } catch (e) {
      showToast('模板解析失败', 'error');
      dbg('[地图注入] ❌ 模板解析失败:', e);
      return false;
    }
    
    templateData[locUid] = locationTable;
    templateData[elUid] = elementTable;
    
    dbg('[地图注入] ✅ 已添加表格到模板，新表格数:', Object.keys(templateData).filter(k => k.startsWith('sheet_')).length);
    
    const newTemplate = JSON.stringify(templateData);
    try {
      localStorage.setItem(templateKey, newTemplate);
      dbg('[地图注入] ✅ 已保存新模板到localStorage');
    } catch (e) {
      showToast('保存模板失败', 'error');
      dbg('[地图注入] ❌ 保存localStorage失败:', e);
      return false;
    }
    
    const fullData = api.exportTableAsJson();
    fullData[locUid] = locationTable;
    fullData[elUid] = elementTable;
    
    dbg('[地图注入] 📤 调用importTableAsJson保存数据...');
    await api.importTableAsJson(JSON.stringify(fullData));
    
    dbg('[地图注入] ✅ 数据已保存（会自动触发刷新）');
    
    dbg('[地图注入] ⏳ 等待3000ms让数据库完成处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    dbg('[地图注入] 🔍 验证...');
    const verifyData = api.exportTableAsJson();
    
    let locationExists = false;
    let elementExists = false;
    
    Object.values(verifyData).forEach((table: any) => {
      if (table && table.name) {
        if (table.name.includes('主要地点表')) {
          locationExists = true;
          dbg('[地图注入] ✅ 找到主要地点表:', table.name);
        }
        if (table.name.includes('地图元素表')) {
          elementExists = true;
          dbg('[地图注入] ✅ 找到地图元素表:', table.name);
        }
      }
    });
    
    if (!locationExists || !elementExists) {
      dbg('[地图注入] ❌ 验证失败');
      dbg('[地图注入] 当前表格:', Object.values(verifyData).filter((t: any) => t?.name).map((t: any) => t.name));
      showToast('注入失败：请查看控制台', 'error');
      return false;
    }
    
    dbg('[地图注入] ✅✅✅ 验证成功!');
    
    safeSetItem(STORAGE_MAP_ENABLED_KEY, 'true');
    state.cachedData = processData(verifyData);
    
    showToast('地图表格注入成功！模板已永久更新');
    dbg('[地图注入] ========== 完成 ==========');
    
    return true;
    
  } catch (e) {
    console.error('[地图注入] 异常:', e);
    showToast('注入失败: ' + e, 'error');
    return false;
  }
}


async function removeMapTables(): Promise<boolean> {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return false;
  }
  
  dbg('[地图移除] ========== 开始移除地图表格 ==========');
  
  try {
    const fullData = api.exportTableAsJson();
    
    const markedKeys = Object.keys(fullData).filter(key => {
      const table = fullData[key];
      return table && table.name && table.name.includes(MAP_TABLE_MARKER);
    });
    
    if (markedKeys.length === 0) {
      showToast('没有找到地图表格', 'error');
      dbg('[地图移除] 没有找到带标记的表格');
      return false;
    }
    
    dbg('[地图移除] 找到', markedKeys.length, '个地图表格:', markedKeys);
    
    const templateKey = 'shujuku_v36_customTemplate';
    let TABLE_TEMPLATE_ACU = localStorage.getItem(templateKey);
    
    if (!TABLE_TEMPLATE_ACU) {
      dbg('[地图移除] ⚠️ localStorage中没有模板');
    } else {
      try {
        const templateData = JSON.parse(TABLE_TEMPLATE_ACU);
        const originalCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
        
        markedKeys.forEach(key => {
          if (templateData[key]) {
            delete templateData[key];
            dbg('[地图移除] 已从模板删除:', key);
          }
        });
        
        const newCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
        dbg('[地图移除] 模板表格数:', originalCount, '->', newCount);
        
        const newTemplate = JSON.stringify(templateData);
        localStorage.setItem(templateKey, newTemplate);
        dbg('[地图移除] ✅ 已保存新模板到localStorage');
        
      } catch (e) {
        dbg('[地图移除] ⚠️ 更新模板失败:', e);
      }
    }
    
    const cleanData: any = {};
    Object.keys(fullData).forEach(key => {
      if (!markedKeys.includes(key)) {
        cleanData[key] = fullData[key];
      } else {
        dbg('[地图移除] 从数据中排除:', key);
      }
    });
    
    dbg('[地图移除] 清理后的表格数:', Object.keys(cleanData).filter(k => k.startsWith('sheet_')).length);
    
    dbg('[地图移除] 📤 保存清理后的数据...');
    await api.importTableAsJson(JSON.stringify(cleanData));
    
    dbg('[地图移除] ✅ 数据已保存');
    
    dbg('[地图移除] ⏳ 等待3000ms让数据库完成处理...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    dbg('[地图移除] 🔍 验证...');
    const verifyData = api.exportTableAsJson();
    
    const verifyTableNames = Object.values(verifyData)
      .filter((t: any) => t?.name)
      .map((t: any) => t.name);
    
    dbg('[地图移除] 验证后的所有表格:', verifyTableNames);
    
    const stillExists = Object.values(verifyData).some((table: any) => 
      table && table.name && table.name.includes(MAP_TABLE_MARKER)
    );
    
    if (stillExists) {
      dbg('[地图移除] ⚠️ 验证失败：表格仍然存在');
      
      const remainingTables = Object.values(verifyData)
        .filter((t: any) => t?.name?.includes(MAP_TABLE_MARKER))
        .map((t: any) => t.name);
      dbg('[地图移除] 仍存在的地图表格:', remainingTables);
      
      showToast('移除失败：表格仍然存在', 'error');
      return false;
    }
    
    dbg('[地图移除] ✅✅✅ 验证成功！表格已完全移除');
    
    safeRemoveItem(STORAGE_MAP_ENABLED_KEY);
    
    state.cachedData = processData(verifyData);
    
    showToast(`已移除${markedKeys.length}个地图表格`);
    dbg('[地图移除] ========== 完成 ==========');
    
    return true;
    
  } catch (e) {
    console.error('[地图移除] 异常:', e);
    showToast('移除失败: ' + e, 'error');
    return false;
  }
}


function isMapEnabled(): boolean {
  // 检查localStorage标记
  const stored = safeGetItem(STORAGE_MAP_ENABLED_KEY, 'false');
  if (stored === 'true') return true;
  
  // 或者检查数据库中是否已有地图表格
  const existing = checkMapTablesExist();
  return existing.hasLocation || existing.hasElement;
}

function createUI() {
  try {
    dbg('创建UI...');
    $(
      '#ci-island-container, #ci-panel, #ci-map-panel, #ci-hidden-input, #ci-map-upload, #ci-toast, .ci-options-container',
    ).remove();
    $('body').append('<input type="file" id="ci-hidden-input" accept="image/*" style="display:none">');
    $('body').append('<div id="ci-toast">角色浮岛载入成功</div>');
    const $con = $(`
            <div id="ci-island-container" style="z-index:2000; display:flex;">
                <div class="ci-drag-grip">${ICONS.grip}</div>
                <button class="ci-btn" id="ci-main-trigger" title="角色列表">${ICONS.user}</button>
                <div class="ci-sub-buttons">
                    <button class="ci-btn" data-type="main" title="主要角色">${ICONS.star}</button><button class="ci-btn" data-type="side" title="次要角色">${ICONS.group}</button><button class="ci-btn" data-type="retired" title="已离场">${ICONS.ghost}</button>
                </div>
                <button class="ci-btn" id="ci-map-btn" title="世界地图">${ICONS.map}</button><button class="ci-btn" id="ci-options-btn" style="display:none" title="选项">${ICONS.chat}</button><button class="ci-btn" id="ci-refresh-btn" title="刷新数据" style="order: 7;">${ICONS.refresh}</button>
            </div>
        `);
    const $ops = $(`<div class="ci-options-container"></div>`);
    $('body').append($ops);
    const $pan = $(`
            <div id="ci-panel">
                <div class="ci-panel-header ci-drag-handle"><span id="ci-panel-title">角色列表</span><div style="display:flex;gap:10px;"><span class="ci-close-btn">${ICONS.close}</span></div></div>
                <div class="ci-panel-content"><div class="ci-grid-view"></div></div><div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div><div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
            </div>
        `);
    const $mapPan = $(`
            <div id="ci-map-panel">
                <div class="ci-panel-header ci-drag-handle"><span>地图</span><div style="display:flex; gap:8px; align-items:center;"><span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span><span class="ci-close-btn">${ICONS.close}</span></div></div>
                <div id="ci-map-content">
                    <div class="ci-map-controls"><div class="ci-map-btn-circle" id="ci-zoom-in">${ICONS.plus}</div><div class="ci-map-btn-circle" id="ci-zoom-out">${ICONS.minus}</div></div>
                    <svg id="ci-map-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"></svg>
                </div>
                <div class="ci-split-handle"></div><div class="ci-external-areas"></div><div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div><div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
            </div>
        `);
    
    $('body').append($con).append($pan).append($mapPan);
    setTimeout(() => {
      $('#ci-toast').addClass('show');
      setTimeout(() => $('#ci-toast').removeClass('show'), 3000);
    }, 500);
    try {
      const pos = JSON.parse(safeGetItem(STORAGE_POS_KEY, 'null'));
      if (pos && typeof pos.top === 'number' && typeof pos.left === 'number' && !isNaN(pos.top) && !isNaN(pos.left)) {
        $con.css({ top: pos.top, left: pos.left, right: 'auto' });
      } else {
        $con.css({ top: '150px', right: '80px', left: 'auto' });
      }
      const size = JSON.parse(safeGetItem(STORAGE_PANEL_SIZE_KEY, 'null'));
      if (size) $pan.css({ width: size.width, height: size.height });
      const mapSize = JSON.parse(safeGetItem(STORAGE_MAP_SIZE_KEY, 'null'));
      if (mapSize) $mapPan.css({ width: mapSize.width, height: mapSize.height });
    } catch (e) {
      console.error('[浮岛] Restore position failed', e);
      $con.css({ top: '150px', right: '80px', left: 'auto' });
    }
    setTimeout(() => {
      try {
        constrainElement($con);
      } catch (e) {
        console.error('Constrain failed', e);
        $con.css({ top: '150px', right: '80px', left: 'auto' });
      }
    }, 500);
    bindEvents($con, $pan, $ops, $mapPan);
  } catch (e) {
    console.error('CreateUI Failed', e);
    alert('浮岛初始化失败: ' + e);
  }
}

function bindEvents($con: any, $pan: any, $ops: any, $mapPan: any) {
  const $grip = $con.find('.ci-drag-grip');
  const syncOptionsPosition = (islandLeft: number, islandTop: number) => {
    if (!state.isOptionsOpen) return;
    const $ops = $('.ci-options-container');
    if (!$ops.length) return;
    const win = window.top || window;
    const winW = win.innerWidth || 1024;
    const winH = win.innerHeight || 768;
    const gap = 15;
    const islandW = 44;
    const opsH = $ops.outerHeight() || 100;
    const padding = 10;
    let targetLeft = 'auto',
      targetRight = 'auto',
      align = 'flex-end',
      isFlipped = false;
    if (islandLeft < winW / 2) {
      // 浮岛在左侧，气泡在右侧显示，尾巴在左边，需要翻转
      targetLeft = islandLeft + islandW + gap + 'px';
      align = 'flex-start';
      isFlipped = true;
    } else {
      // 浮岛在右侧，气泡在左侧显示，尾巴在右边，不翻转
      targetRight = winW - islandLeft + gap + 'px';
      isFlipped = false;
    }
    dbg('[选项气泡] 同步位置 - 浮岛位置:', islandLeft, '翻转状态:', isFlipped);
    let targetTop = islandTop;
    if (targetTop + opsH > winH) targetTop = Math.max(padding, winH - opsH - padding);
    if (targetTop < padding) targetTop = padding;
    $ops.css({
      position: 'fixed',
      left: targetLeft,
      right: targetRight,
      top: targetTop + 'px',
      transform: 'none',
      alignItems: align,
      zIndex: 2147483647,
    });
    if (isFlipped) $ops.find('.ci-option-bubble').addClass('flipped');
    else $ops.find('.ci-option-bubble').removeClass('flipped');
  };
  const handleResize = () => {
    requestAnimationFrame(() => {
      const safePos = constrainElement($con);
      if ($pan.hasClass('visible')) syncPanelPosition($con, $pan, safePos.left, safePos.top);
      if ($mapPan.hasClass('visible') && !state.isMapPinned)
        syncPanelPosition($con, $mapPan, safePos.left, safePos.top);
      if (state.isOptionsOpen) syncOptionsPosition(safePos.left, safePos.top);
    });
  };
  $(window).on('resize', handleResize);
  try {
    $(window.parent).on('resize', handleResize);
  } catch (e) {}
  handleDrag(
    $grip,
    (start: any) => {
      state.drag.active = true;
      state.isGlobalDragging = true;
      state.drag.startX = start.clientX;
      state.drag.startY = start.clientY;
      const offset = $con.offset();
      state.drag.initialLeft = offset.left;
      state.drag.initialTop = offset.top;
      $pan.addClass('no-transition');
      if (!state.isMapPinned) $mapPan.addClass('no-transition');
    },
    (curr: any) => {
      if (state.drag.rafId) cancelAnimationFrame(state.drag.rafId);
      state.drag.rafId = requestAnimationFrame(() => {
        const deltaX = curr.clientX - state.drag.startX;
        const deltaY = curr.clientY - state.drag.startY;
        const newLeft = state.drag.initialLeft + deltaX;
        const newTop = state.drag.initialTop + deltaY;
        $con.css({ left: newLeft, top: newTop, right: 'auto' });
        syncPanelPosition($con, $pan, newLeft, newTop);
        if (!state.isMapPinned) syncPanelPosition($con, $mapPan, newLeft, newTop);
        if (state.isOptionsOpen) syncOptionsPosition(newLeft, newTop);
      });
    },
    () => {
      state.drag.active = false;
      if (state.drag.rafId) cancelAnimationFrame(state.drag.rafId);
      $pan.removeClass('no-transition');
      $mapPan.removeClass('no-transition');
      const safePos = constrainElement($con);
      syncPanelPosition($con, $pan, safePos.left, safePos.top);
      if (!state.isMapPinned) syncPanelPosition($con, $mapPan, safePos.left, safePos.top);
      safeSetItem(STORAGE_POS_KEY, JSON.stringify({ top: safePos.top, left: safePos.left }));
      if (state.isOptionsOpen) syncOptionsPosition(safePos.left, safePos.top);
      setTimeout(() => {
        state.isGlobalDragging = false;
      }, 100);
    },
  );
  $pan
    .add($mapPan)
    .find('.ci-drag-handle')
    .each(function () {
      const $header = $(this);
      const $targetPanel = $header.closest('#ci-panel, #ci-map-panel');
      let startX = 0,
        startY = 0,
        startLeft = 0,
        startTop = 0;
      handleDrag(
        $header,
        (start: any, e: any) => {
          if ($(e.target).closest('.ci-close-btn, .ci-edit-btn, .ci-pin-btn, .ci-save-layout-btn').length) return;
          state.isGlobalDragging = true;
          startX = start.clientX;
          startY = start.clientY;
          startLeft = parseInt($targetPanel.css('left'), 10) || 0;
          startTop = parseInt($targetPanel.css('top'), 10) || 0;
          $targetPanel.addClass('no-transition');
        },
        (curr: any, e: any) => {
          if (e.cancelable) e.preventDefault();
          requestAnimationFrame(() => {
            const deltaX = curr.clientX - startX;
            const deltaY = curr.clientY - startY;
            $targetPanel.css({ left: startLeft + deltaX, top: startTop + deltaY });
          });
        },
        () => {
          $targetPanel.removeClass('no-transition');
          setTimeout(() => {
            state.isGlobalDragging = false;
          }, 100);
        },
      );
    });
  $pan
    .add($mapPan)
    .find('.ci-resize-handle')
    .each(function () {
      const $handle = $(this);
      const mode = $handle.data('mode');
      const $targetPanel = $handle.closest('#ci-panel, #ci-map-panel');
      let startX = 0,
        startY = 0,
        startW = 0,
        startH = 0,
        startLeft = 0;
      handleDrag(
        $handle,
        (start: any, e: any) => {
          e.stopPropagation();
          state.isGlobalDragging = true;
          startX = start.clientX;
          startY = start.clientY;
          startW = $targetPanel.width();
          startH = $targetPanel.height();
          startLeft = parseInt($targetPanel.css('left'), 10) || 0;
          $targetPanel.addClass('no-transition');
        },
        (curr: any, e: any) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          requestAnimationFrame(() => {
            const deltaX = curr.clientX - startX;
            const deltaY = curr.clientY - startY;
            const newH = Math.max(200, startH + deltaY);
            let newW = startW;
            if (mode === 'br') {
              newW = Math.max(250, startW + deltaX);
              $targetPanel.css({ width: newW + 'px', height: newH + 'px' });
            } else {
              newW = Math.max(250, startW - deltaX);
              const newLeft = startLeft + (startW - newW);
              $targetPanel.css({ width: newW + 'px', height: newH + 'px', left: newLeft + 'px' });
            }
          });
        },
        () => {
          $targetPanel.removeClass('no-transition');
          setTimeout(() => {
            state.isGlobalDragging = false;
          }, 100);
          if ($targetPanel.is('#ci-panel')) {
            safeSetItem(
              STORAGE_PANEL_SIZE_KEY,
              JSON.stringify({ width: $targetPanel.width(), height: $targetPanel.height() }),
            );
          } else {
            safeSetItem(
              STORAGE_MAP_SIZE_KEY,
              JSON.stringify({ width: $targetPanel.width(), height: $targetPanel.height() }),
            );
          }
        },
      );
    });
  const $svg = $('#ci-map-svg');
  const getViewBox = () => {
    const attr = $svg[0].getAttribute('viewBox');
    if (!attr) return { x: 0, y: 0, w: 800, h: 600 };
    const parts = attr.split(' ').map(Number);
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  };
  let mapStartX = 0,
    mapStartY = 0,
    initialVB = { x: 0, y: 0, w: 0, h: 0 };
  handleDrag(
    $svg,
    (start: any, e: any) => {
      if ($(e.target).closest('.map-element-group.draggable').length) return;
      e.stopPropagation();
      if (!state.isMapOpen) return;
      state.isGlobalDragging = true;
      mapStartX = start.clientX;
      mapStartY = start.clientY;
      initialVB = getViewBox();
      $svg.css('cursor', 'grabbing');
    },
    (curr: any, e: any) => {
      if ($(e.target).closest('.map-element-group.draggable').length) return;
      if (e.cancelable) e.preventDefault();
      const scaleX = initialVB.w / $svg.width();
      const scaleY = initialVB.h / $svg.height();
      const dx = (mapStartX - curr.clientX) * scaleX;
      const dy = (mapStartY - curr.clientY) * scaleY;
      $svg[0].setAttribute('viewBox', `${initialVB.x + dx} ${initialVB.y + dy} ${initialVB.w} ${initialVB.h}`);
    },
    () => {
      $svg.css('cursor', 'grab');
      setTimeout(() => {
        state.isGlobalDragging = false;
      }, 100);
    },
  );
  const $split = $mapPan.find('.ci-split-handle');
  let splitStartH = 0;
  let splitStartY = 0;
  handleDrag(
    $split,
    (start: any, e: any) => {
      e.stopPropagation();
      splitStartH = $mapPan.find('.ci-external-areas').height() || 40;
      splitStartY = start.clientY;
      $('body').css('cursor', 'ns-resize');
    },
    (curr: any, e: any) => {
      if (e.cancelable) e.preventDefault();
      const dy = splitStartY - curr.clientY;
      const newH = Math.max(40, splitStartH + dy);
      const $ext = $mapPan.find('.ci-external-areas');
      $ext.css('height', newH + 'px');
      if (newH > 60) $ext.addClass('wrapping');
      else $ext.removeClass('wrapping');
    },
    () => {
      $('body').css('cursor', '');
    },
  );
  $svg.on('click', (e: any) => {
    if ($('.ci-map-popup-options').length) {
      $('.ci-map-popup-options').remove();
    }
  });
  $('#ci-main-trigger').on('click', function (e: any) {
    e.stopPropagation();
    if (state.isExpanded) {
      closeAll($con, $pan, $mapPan);
    } else {
      state.isExpanded = true;
      $con.addClass('expanded');
      updateHeightClass($con);
      const offset = $con.offset();
      syncPanelPosition($con, $pan, offset.left, offset.top);
    }
  });
  $con.find('.ci-btn[data-type]').on('click', function (e: any) {
    e.stopPropagation();
    const type = $(this).data('type');
    if (state.activeCategory === type && $pan.hasClass('visible')) {
      $pan.removeClass('visible');
      $('.ci-btn[data-type]').removeClass('active');
      state.activeCategory = null;
      return;
    }
    state.activeCategory = type;
    state.isExpanded = true;
    $con.addClass('expanded');
    $('.ci-btn[data-type]').removeClass('active');
    $(this).addClass('active');
    renderGrid(type, $pan);
    $pan.addClass('visible');
    updateHeightClass($con);
    const offset = $con.offset();
    syncPanelPosition($con, $pan, offset.left, offset.top);
  });
  $('#ci-map-btn').on('click', function (e: any) {
    e.stopPropagation();
    state.isMapOpen = !state.isMapOpen;
    const $btn = $(this);
    if (state.isMapOpen) {
      $btn.addClass('active');
      $mapPan.addClass('visible');
      renderMap();
      const offset = $con.offset();
      syncPanelPosition($con, $mapPan, offset.left, offset.top);
    } else {
      $btn.removeClass('active');
      $mapPan.removeClass('visible');
      state.isMapPinned = false;
      $mapPan.removeClass('pinned');
      $('.ci-pin-btn').removeClass('active');
    }
  });
  $('#ci-refresh-btn').on('click', function (e: any) {
    e.stopPropagation();
    const api = window.AutoCardUpdaterAPI || window.parent.AutoCardUpdaterAPI;
    if (api && api.exportTableAsJson) {
      state.cachedData = processData(api.exportTableAsJson());
      if (state.activeCategory) renderGrid(state.activeCategory, $pan);
      if (state.isMapOpen) renderMap();
      showToast('数据已刷新');
    } else {
      showToast('无法连接数据库', 'error');
    }
  });
  $pan.find('.ci-close-btn').on('click', () => {
    $pan.removeClass('visible');
    state.activeCategory = null;
    $('.ci-btn[data-type]').removeClass('active');
  });
  $mapPan.find('.ci-close-btn').on('click', () => {
    state.isMapOpen = false;
    state.isMapPinned = false;
    $mapPan.removeClass('pinned');
    $('#ci-map-btn').removeClass('active');
    $mapPan.removeClass('visible');
  });
  $mapPan.find('.ci-pin-btn').on('click', function (e: any) {
    e.stopPropagation(); // 阻止事件冒泡
    dbg('[图钉按钮] 点击，当前状态:', state.isMapPinned);
    state.isMapPinned = !state.isMapPinned;
    $(this).toggleClass('active', state.isMapPinned);
    $mapPan.toggleClass('pinned', state.isMapPinned);
    showToast(state.isMapPinned ? '地图已固定' : '地图取消固定');
  });
  $('#ci-options-btn').on('click', function (e: any) {
    e.stopPropagation();

    // 防抖处理：避免连续点击造成的卡顿
    const $btn = $(this);
    if ($btn.data('clicking')) {
      dbg('[选项按钮] 点击防抖中，忽略');
      return;
    }
    $btn.data('clicking', true);
    setTimeout(() => $btn.data('clicking', false), 300);

    state.isOptionsOpen = !state.isOptionsOpen;
    dbg('[选项按钮] 状态切换:', state.isOptionsOpen ? '打开' : '关闭');

    if (state.isOptionsOpen) {
      $ops.empty();
      if (state.optionsData && state.optionsData.length) {
        state.optionsData.forEach(opt => {
          const $bubble = $(`<div class="ci-option-bubble">${opt}</div>`);
          $bubble.on('click', (ev: any) => {
            ev.stopPropagation();
            dbg('[选项气泡] 点击选项:', opt);
            sendGameActionRequest(opt);
            state.isOptionsOpen = false;
            $ops.removeClass('visible');
            setTimeout(() => $ops.empty(), 300);
          });
          $ops.append($bubble);
        });
        $ops.addClass('visible');
        const offset = $con.offset();
        syncOptionsPosition(offset.left, offset.top);
      } else {
        dbg('[选项按钮] 无选项数据');
      }
    } else {
      $ops.removeClass('visible');
      setTimeout(() => $ops.empty(), 300);
    }
  });
  $('#ci-zoom-in').on('click', (e: any) => {
    e.stopPropagation();
    const vb = getViewBox();
    const newW = vb.w * 0.8;
    const newH = vb.h * 0.8;
    const newX = vb.x + (vb.w - newW) / 2;
    const newY = vb.y + (vb.h - newH) / 2;
    $svg[0].setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
  });
  $('#ci-zoom-out').on('click', (e: any) => {
    e.stopPropagation();
    const vb = getViewBox();
    const newW = vb.w * 1.2;
    const newH = vb.h * 1.2;
    const newX = vb.x + (vb.w - newW) / 2;
    const newY = vb.y + (vb.h - newH) / 2;
    $svg[0].setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
  });
  $('#ci-hidden-input').on('click', function (e: any) {
    e.stopPropagation();
  });
  $('#ci-hidden-input').on('change', function (e: any) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      const res = evt.target.result;
      if (state.currentUploadChar) {
        const charName = state.currentUploadChar.name;
        safeSetItem(STORAGE_AVATAR_PREFIX + charName, res);
        showToast('头像上传成功');
        if (state.activeCategory) renderGrid(state.activeCategory, $pan);
        if (state.isMapOpen) renderMap();
      }
    };
    reader.readAsDataURL(file);
    $(this).val('');
  });
  const globalClickHandler = (e: any) => {
    // 点击选项容器内部时不关闭
    if ($(e.target).closest('.ci-options-container').length) {
      return;
    }

    // 点击选项按钮时不关闭（由按钮自己处理）
    if ($(e.target).closest('#ci-options-btn').length) {
      return;
    }

    // 点击空白处时关闭选项气泡
    if (state.isOptionsOpen) {
      dbg('[全局点击] 点击空白处，关闭选项气泡');
      state.isOptionsOpen = false;
      $('.ci-options-container').removeClass('visible');
      setTimeout(() => $('.ci-options-container').empty(), 300);
    }

    // 其他UI元素不关闭
    if (
      $(e.target).closest(
        '#ci-island-container, #ci-panel, #ci-map-panel, .ci-edit-overlay, .ci-map-popup-options, .ci-settings-overlay, .ci-settings-card',
      ).length
    )
      return;
    $('.ci-map-popup-options').remove();
    if (state.isGlobalDragging || state.drag.active) return;
    const isPanelOpen = $pan.hasClass('visible');
    const isMapOpen = state.isMapOpen;
    if (isPanelOpen || isMapOpen) {
      closePanels($con, $pan, $mapPan);
    } else if (state.isExpanded) {
      collapseIsland($con);
    }
  };
  $(document).on('click', globalClickHandler);
  try {
    $(window.parent.document).on('click', globalClickHandler);
  } catch (e) {}
  
  // ==================== 元素侧边栏事件 ====================
  
  // 关闭侧边栏
  $('.ci-sidebar-close').on('click', () => {
    $('#ci-elements-sidebar').addClass('ci-sidebar-hidden');
  });
  
  // 搜索事件
  $('#ci-elements-search').on('input', () => {
    renderElementsSidebar();
  });
}

function addSettingsToExtensionMenu() {
  const parentDoc = (window.parent as any).document;
  if (!parentDoc) return;
  const exMenu = $(parentDoc).find('#extensionsMenu');
  if (!exMenu.length) {
    setTimeout(addSettingsToExtensionMenu, 1000);
    return;
  }
  if ($(parentDoc).find('#ci-settings-menu-item').length) return;
  const menuItemHTML = `<div class="list-group-item flex-container flexGap5 interactable" id="ci-settings-menu-item" title="浮岛设置"><div class="fa-fw fa-solid fa-cog extensionsMenuExtensionButton"></div><span>浮岛设置</span></div>`;
  const $item = $(menuItemHTML);
  $item.on('click', (e: any) => {
    createSettingsUI();
  });
  exMenu.append($item);
}

function initApp(jQueryInstance: any) {
  $ = jQueryInstance;
  (window as any).$ = $;
  (window as any).jQuery = $;
  dbg('Script Initializing (with safe jQuery)...');
  teleportStyle();
  createUI();
  addSettingsToExtensionMenu();

  // 应用保存的主题
  dbg('[主题] 应用保存的主题:', state.theme);
  applyTheme(state.theme);

  // 应用透明度设置
  applyOpacity('main', state.opacity.main);
  applyOpacity('map', state.opacity.map);

  const getApi = () => (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  const api = getApi();
  if (api) {
    dbg('API found immediately.');
    if (api.exportTableAsJson) {
      state.cachedData = processData(api.exportTableAsJson());
      if (state.isMapOpen) renderMap();
    }
    if (api.registerTableUpdateCallback) {
      api.registerTableUpdateCallback(() => {
        const updatedApi = getApi();
        if (updatedApi && updatedApi.exportTableAsJson) {
          state.cachedData = processData(updatedApi.exportTableAsJson());
          if (state.isMapOpen) renderMap();
          if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
        }
      });
    }
  } else {
    dbg('API not found immediately. Waiting...');
    const checkApi = setInterval(() => {
      const api = getApi();
      if (api) {
        clearInterval(checkApi);
        dbg('API found after wait.');
        if (api.exportTableAsJson) {
          state.cachedData = processData(api.exportTableAsJson());
        }
        if (api.registerTableUpdateCallback) {
          api.registerTableUpdateCallback(() => {
            const updatedApi = getApi();
            if (updatedApi) {
              state.cachedData = processData(updatedApi.exportTableAsJson());
              if (state.isMapOpen) renderMap();
              if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
            }
          });
        }
      }
    }, 500);
  }
}

(function waitForJQuery() {
  const jq = (window as any).jQuery || (window.parent as any).jQuery || (window as any).$;
  if (jq) {
    initApp(jq);
  } else {
    console.log('Waiting for jQuery...');
    setTimeout(waitForJQuery, 100);
  }
})();
