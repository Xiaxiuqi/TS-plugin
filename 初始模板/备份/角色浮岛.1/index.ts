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

const SCRIPT_ID = 'char_island_v8_5_map_inject';
const STORAGE_POS_KEY = 'ci_island_pos_v5';
const STORAGE_PANEL_SIZE_KEY = 'ci_panel_size_v5';
const STORAGE_MAP_SIZE_KEY = 'ci_map_size_v5';
const STORAGE_AVATAR_PREFIX = 'ci_avatar_img_';
const STORAGE_CUSTOM_CATEGORIES_KEY = 'ci_custom_cats_v1';
const STORAGE_MAP_LAYOUT_KEY = 'ci_map_layout_v1';
const STORAGE_THEME_KEY = 'ci_theme_v1';
const STORAGE_OPACITY_KEY = 'ci_opacity_v1';

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
  // 人物关系图标 - 网状连接（人物节点连线图）
  relation: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="4" r="2.5"/><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="8" cy="20" r="2.5"/><circle cx="16" cy="20" r="2.5"/><path d="M12 6.5v4M9.5 11l-3-1.5M14.5 11l3-1.5M10 18l-1.5-3M14 18l1.5-3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,
  // 物品仓库图标 - 宝箱
  inventory: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 8h-8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z"/></svg>`,
  // 世界信息图标 - 地球（原relation图标）
  world: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
  // 物品类型图标 - 替换emoji
  gift: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>`,
  hand: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 11V6.5a2.5 2.5 0 0 0-5 0V11h-.5a2.5 2.5 0 0 0-5 0V11H7a2.5 2.5 0 0 0-5 0v9a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5v-9h-2zm-8.5-3a.5.5 0 0 1 1 0V11h-1V8zm-4 3h1v-1a.5.5 0 0 1 1 0v1h1V8a.5.5 0 0 1 1 0v3h1v-3a.5.5 0 0 1 1 0v3H18v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9h1.5z"/></svg>`,
  weapon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6.92 5H5l-.66 1.65L2.9 5.56l-.83.83 1.09 1.43-1.65.66V10h1.11l2.44-2.44 1.57 1.57L4.41 14H2v2h3.59l2.83-2.83 2.83 2.83L14 13.17l-2.83-2.83L14 7.51l-1.78-1.78-2.83 2.83-2.47-2.56z"/></svg>`,
  armor: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
  potion: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M13 4h-2v1H9v2h6V5h-2V4zm-2 4v4.17l-4 4V20h10v-3.83l-4-4V8h-2zm6 7.17V21H7v-5.83l4-4V7h2v6.17l4 4z"/></svg>`,
  food: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05l-5 2v5.12c0 .97-.78 1.75-1.75 1.75H11.5l-6.62 8.07c-.4.48-.25 1.19.3 1.47.38.2.83.15 1.16-.14L12 18h3.5l2.56 4.99zM1 21.99h2V9H1v12.99zM6 9v10.31c.38-.06.75-.31.97-.62L12.33 11H9.5V9H6z"/></svg>`,
  material: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zM6 6h12v2H6V6zm0 4h12v2H6v-2zm0 4h8v2H6v-2z"/></svg>`,
  currency: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>`,
  tool: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`,
  clothing: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 2l3 3H7v15H5V5H3l3-3zm10 0l3 3h-2v15h-2V5h-2l3-3zm-4 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
  defaultItem: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zm-8-6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/></svg>`,
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
const getMapEnabledKey = () => 'ci_map_enabled_v1';
const MAP_TABLE_MARKER = '_浮岛地图_'; // 用于标识浮岛注入的表格

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
      customStyles: {},
    },
    sourceData: {
      note: '记录当前活动层级的具体地点。',
      initNode: '游戏初始化时,需为当前层级区域新增至少三个主要地点。在当前层级内发现新地点时添加。',
      deleteNode: '当发生地点层级深入时，原表中的地点在移至"外部区域列表"后将被删除。',
      updateNode: '地点的环境描述等信息发生变化时更新。',
      insertNode: '在当前层级内发现新地点时添加。',
    },
    content: [[null, '地点名称', '环境描述']],
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
      customStyles: {},
    },
    sourceData: {
      note: '记录场景中可交互的实体（怪物/NPC/物品）。`所属主地点`必须与主要地点表对应。',
      initNode: '新地点创建时，必须为其添加至少一个地图元素。场景中出现新的可交互实体时添加。',
      deleteNode: '实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。',
      updateNode: '实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。',
      insertNode: '场景中出现新的可交互实体时添加。',
    },
    content: [[null, '元素名称', '元素类型', '元素描述', '所属主地点', '状态', '互动选项1', '互动选项2', '互动选项3']],
  },
};

// 地图提示词模板（简化版，只包含地图相关的表格说明）
const MAP_PROMPT_TEMPLATE = `
## 地图表格填写指南（浮岛地图扩展）

### 主要地点表
【说明】记录当前活动层级的具体地点。当地点层级深入时（如从'小区'进入'公寓楼'），此表会被清空并填充新层级的子地点。
- 列0: 地点名称 - 地点的唯一名称。
- 列1: 环境描述 - 对该地点环境、氛围的简要文字描述。

【增删改触发条件】
插入：游戏初始化时，需为当前层级区域新增至少三个主要地点。在当前层级内发现新地点时添加。
更新：地点的环境描述等信息发生变化时更新。
删除：当发生地点层级深入时，原表中的地点在移至'外部区域列表'后将被删除。

### 地图元素表
【说明】记录场景中可交互的实体（怪物/NPC/物品）。\`所属主地点\`必须与主要地点表对应。
- 列0: 元素名称 - 实体的名称。
- 列1: 元素类型 - 分为"怪物"、"NPC"、"物品"、"载具"、"环境"等。
- 列2: 元素描述 - 对该实体外观、特征的简要描述。
- 列3: 所属主地点 - 该实体当前所在的"地点名称"，必须与表1中的地点对应。
- 列4: 状态 - 实体的当前状态（如："游荡"、"可调查"、"已摧毁"）。
- 列5-7: 互动选项 - 主角可以对该实体执行的3个具体动作。

【增删改触发条件】
插入：新地点创建时，必须为其添加至少一个地图元素。场景中出现新的可交互实体时添加。
更新：实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。
删除：实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。
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
  isRelationOpen: false,
  isInventoryOpen: false,
  isWorldInfoOpen: false, // 世界信息面板开关
  theme: safeGetItem(STORAGE_THEME_KEY, 'light'),
  opacity: storedOpacity,
  cachedData: {
    main: [] as any[],
    side: [] as any[],
    retired: [] as any[],
    mapLocations: [] as any[],
    mapElements: [] as any[],
    protagonistLoc: '',
    hasMapTable: false,
    hasLongGoal: false,
    externalAreas: [] as string[],
    relations: [] as any[], // 人物关系数据
    allItems: [] as any[], // 所有物品数据
    protagonistName: '', // 主角名称
    // v8.8新增：角色额外信息（按角色名索引）
    charExtraInfo: {} as Record<string, any>,
    // 世界信息数据
    worldInfo: {
      tasks: [] as any[], // 任务/行程/事件信息
      forces: [] as any[], // 组织/势力信息
      summary: null as any, // 总结表最新条目
      outline: null as any, // 总结大纲最新条目
      newsItems: [] as string[], // 滚动新闻条目
    },
    // 地图布局（从processData返回）
    mapLayout: null as any,
  },
  mapLayout: JSON.parse(safeGetItem(STORAGE_MAP_LAYOUT_KEY, '{}')),
  optionsData: [] as string[],
  customCategories: JSON.parse(safeGetItem(STORAGE_CUSTOM_CATEGORIES_KEY, '{}')),
  drag: { active: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, rafId: null as number | null },
  isGlobalDragging: false,
  resize: { active: false, mode: null, startX: 0, startY: 0, startW: 0, startH: 0, startLeft: 0 },
  currentUploadChar: null as any,
  isEditing: false,
  lastExpandedCardName: null as string | null,
  bagPagination: {} as Record<string, number>,
  // 赠予/拿取功能状态
  giftMode: false, // 是否处于赠予模式
  takeMode: false, // 是否处于拿取模式
  selectedItems: [] as any[], // 已选择的物品
  giftMenuExpanded: false, // 赠予菜单是否展开
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
  // 同时输出到console
  if (type === 'error') {
    console.error('[浮岛通知]', msg);
  } else {
    console.log('[浮岛通知]', msg);
  }

  const $t = $('#ci-toast');
  if (!$t || $t.length === 0) return;

  // 清空并重建内容
  $t.empty();

  // 消息文本（可选中复制）
  const $msg = $('<span>').addClass('ci-toast-msg').text(msg).css({
    'user-select': 'text',
    cursor: 'text',
    flex: '1',
    'padding-right': '8px',
  });

  // 关闭按钮
  const $close = $('<span>')
    .addClass('ci-toast-close')
    .html('×')
    .css({
      cursor: 'pointer',
      'font-size': '24px',
      'line-height': '1',
      opacity: '0.7',
      'margin-left': '8px',
    })
    .on('mouseover', function () {
      $(this).css('opacity', '1');
    })
    .on('mouseout', function () {
      $(this).css('opacity', '0.7');
    })
    .on('click', function () {
      $t.removeClass('show');
    });

  $t.append($msg).append($close);

  $t.css({
    background: type === 'error' ? '#f44336' : '#4caf50',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
  });

  $t.addClass('show');

  // 成功消息3秒后自动消失，错误消息5秒后自动消失
  const autoHideDelay = type === 'success' ? 3000 : 5000;
  setTimeout(() => $t.removeClass('show'), autoHideDelay);
}

function updateHeightClass($con: any) {
  const hasOpt = state.optionsData.length > 0;
  const hasMap = !!state.cachedData.hasMapTable;

  // 显示/隐藏选项按钮（使用类控制，与地图按钮逻辑相同）
  // 选项按钮默认隐藏，有选项数据时添加 .has-options 类显示
  if (hasOpt) {
    $('#ci-options-btn').addClass('has-options').removeClass('no-options');
    dbg('[按钮] 选项按钮显示, 选项数:', state.optionsData.length);
  } else {
    $('#ci-options-btn').removeClass('has-options').addClass('no-options');
    dbg('[按钮] 选项按钮隐藏');
  }

  // 显示/隐藏地图按钮（使用类控制，与选项按钮逻辑相同）
  // 地图按钮默认隐藏，有地图数据时添加 .has-map 类显示
  if (hasMap) {
    $('#ci-map-btn').addClass('has-map').removeClass('no-map');
    dbg('[按钮] 地图按钮显示');
  } else {
    $('#ci-map-btn').removeClass('has-map').addClass('no-map');
    dbg('[按钮] 地图按钮隐藏');
  }

  // 世界信息按钮始终显示
  $('#ci-world-info-btn').css('display', 'flex');

  // 刷新按钮始终显示
  $('#ci-refresh-btn').css('display', 'flex');

  // 不设置固定高度，使用CSS auto自适应
  // 浮岛容器的height: auto !important 会处理高度自适应
  $con.css('height', 'auto');

  dbg('[按钮布局] 更新完成 - 展开:', state.isExpanded, '有地图:', hasMap, '有选项:', hasOpt);
}

function closePanels($con: any, $pan: any, $mapPan: any) {
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
  if ($pan.hasClass('pinned') || ($pan.is('#ci-map-panel') && state.isMapPinned)) return;
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

async function forceDeleteMapTemplate(): Promise<boolean> {
  dbg('[强制删除] ========== 开始强制删除地图模板 ==========');

  try {
    const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;

    // 步骤1: 清理当前数据中的地图表格
    if (api && api.exportTableAsJson && api.importTableAsJson) {
      dbg('[强制删除] 📤 清理当前数据...');

      const fullData = api.exportTableAsJson();
      const markedKeys = Object.keys(fullData).filter(key => {
        const table = fullData[key];
        return table && table.name && table.name.includes(MAP_TABLE_MARKER);
      });

      if (markedKeys.length > 0) {
        dbg('[强制删除] 当前数据中找到', markedKeys.length, '个地图表格');

        const cleanData: any = {};
        Object.keys(fullData).forEach(key => {
          if (!markedKeys.includes(key)) {
            cleanData[key] = fullData[key];
          }
        });

        if (!cleanData.mate) {
          cleanData.mate = { type: 'chatSheets', version: 1 };
        }

        dbg('[强制删除] 调用importTableAsJson清理数据...');
        await api.importTableAsJson(JSON.stringify(cleanData));
        dbg('[强制删除] ✅ 数据清理完成');

        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        dbg('[强制删除] 当前数据中没有地图表格');
      }
    }

    // 步骤2: 清理模板
    const possibleKeys = [
      'shujuku_v70_customTemplate',
      'shujuku_v36_customTemplate',
      'shujuku_v7_customTemplate',
      'acu_customTemplate',
    ];

    let templateKey = '';
    let templateStr = '';

    for (const key of possibleKeys) {
      const temp = localStorage.getItem(key);
      if (temp) {
        templateKey = key;
        templateStr = temp;
        dbg('[强制删除] 从', key, '找到模板');
        break;
      }
    }

    if (!templateStr) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('customTemplate')) {
          const temp = localStorage.getItem(key);
          if (temp && temp.includes('sheet_') && temp.includes('mate')) {
            templateKey = key;
            templateStr = temp;
            dbg('[强制删除] 从', key, '找到模板');
            break;
          }
        }
      }
    }

    let deletedFromTemplate = 0;
    if (templateStr) {
      try {
        const templateData = JSON.parse(templateStr);
        const allSheetKeys = Object.keys(templateData).filter(k => k.startsWith('sheet_'));
        dbg('[强制删除] 模板中共有', allSheetKeys.length, '个表格');

        const markedKeys = allSheetKeys.filter(key => {
          const table = templateData[key];
          if (!table || !table.name) return false;
          const hasMarker = table.name.includes(MAP_TABLE_MARKER);
          if (hasMarker) {
            dbg('[强制删除] 找到带标记的表格:', key, '-', table.name);
          }
          return hasMarker;
        });

        if (markedKeys.length > 0) {
          markedKeys.forEach(key => {
            const tableName = templateData[key]?.name || key;
            delete templateData[key];
            dbg('[强制删除] 已从模板删除:', tableName);
          });

          const newTemplate = JSON.stringify(templateData);
          localStorage.setItem(templateKey, newTemplate);
          dbg('[强制删除] ✅ 已保存新模板到', templateKey);

          // 更新全局变量
          try {
            const topWindow = window.parent || window;
            if ((topWindow as any).TABLE_TEMPLATE_ACU !== undefined) {
              (topWindow as any).TABLE_TEMPLATE_ACU = newTemplate;
              dbg('[强制删除] ✅ 已更新全局TABLE_TEMPLATE_ACU变量');
            }
          } catch (e) {
            dbg('[强制删除] ⚠️ 无法访问TABLE_TEMPLATE_ACU变量');
          }

          deletedFromTemplate = markedKeys.length;
        } else {
          dbg('[强制删除] 模板中没有地图表格');
        }
      } catch (e) {
        dbg('[强制删除] ⚠️ 模板处理失败:', e);
      }
    }

    // 步骤3: 调用overrideWithTemplate
    if (api && api.overrideWithTemplate) {
      dbg('[强制删除] 🔄 调用overrideWithTemplate...');

      try {
        const originalConfirm = window.confirm;
        window.confirm = () => true;

        await api.overrideWithTemplate();

        window.confirm = originalConfirm;

        dbg('[强制删除] ✅ overrideWithTemplate完成');
      } catch (e) {
        dbg('[强制删除] ⚠️ overrideWithTemplate失败:', e);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 步骤4: 清除开关状态
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('_map_enabled_')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      dbg('[强制删除] 已删除开关状态:', key);
    });

    // 步骤5: 刷新缓存
    if (api && api.exportTableAsJson) {
      const verifyData = api.exportTableAsJson();
      state.cachedData = processData(verifyData);

      const stillExists = Object.values(verifyData).some(
        (table: any) => table && table.name && table.name.includes(MAP_TABLE_MARKER),
      );

      if (stillExists) {
        showToast('清理不完全，请重试', 'error');
        dbg('[强制删除] ⚠️ 仍有残留数据');
        return false;
      }
    }

    showToast(`已完全清理地图数据`);
    dbg('[强制删除] ========== 完成 ==========');

    return true;
  } catch (e) {
    console.error('[强制删除] 异常:', e);
    console.error('[强制删除] 堆栈:', (e as Error).stack);
    showToast('删除失败: ' + e, 'error');
    return false;
  }
}

/**
 * 解析格式化内容：识别 "XX：XXXX；" 格式
 * @param content 原始内容字符串
 * @returns { labels: {key: string, value: string}[], notes: string }
 */
function parseFormattedContent(content: string): { labels: { key: string; value: string }[]; notes: string } {
  if (!content || typeof content !== 'string') {
    return { labels: [], notes: '' };
  }

  const labels: { key: string; value: string }[] = [];
  const notesParts: string[] = [];

  // 支持中英文冒号和分号：：:；;
  // 匹配模式：标签：值；或 标签:值;
  const pattern = /([^：:；;\s]+)[：:]([^；;]+)[；;]?/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(content)) !== null) {
    // 检查是否有未匹配的前缀文本
    if (match.index > lastIndex) {
      const skipped = content.substring(lastIndex, match.index).trim();
      if (skipped) notesParts.push(skipped);
    }
    labels.push({
      key: match[1].trim(),
      value: match[2].trim(),
    });
    lastIndex = pattern.lastIndex;
  }

  // 处理剩余未匹配的内容
  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex).trim();
    if (remaining) notesParts.push(remaining);
  }

  return {
    labels,
    notes: notesParts.join(' '),
  };
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
    // 世界信息数据
    worldInfo: {
      tasks: [] as any[], // 任务/行程/事件信息
      forces: [] as any[], // 组织/势力信息
      summary: null as any, // 总结表最新条目
      outline: null as any, // 总结大纲最新条目
      newsItems: [] as string[], // 滚动新闻条目
    },
    // v8.8新增：角色其他信息（按角色名索引）
    charExtraInfo: {} as Record<string, any>,
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
    // Bug 9 修复：从非地图表中搜索包含"选项"的列名
    // 1. 首先从主角信息表获取主角位置（保留此逻辑）
    Object.values(rawData).forEach((s: any) => {
      if (CONFIG.tables.protagonist === s.name) {
        const h = s.content[0] || [];
        const locIdx = getCol(h, ['主角当前所在地点', '当前位置', 'Location']);
        if (s.content[1] && locIdx > -1) {
          result.protagonistLoc = s.content[1][locIdx];
        }
      }
    });

    // 2. 从所有非地图表中搜索包含"选项"的列
    dbg('[选项提取] 开始从非地图表中搜索选项...');
    Object.values(rawData).forEach((s: any) => {
      if (!s || !s.name || !s.content || !s.content[0]) return;

      // 排除地图表：
      // - 浮岛注入的表（包含 MAP_TABLE_MARKER）
      // - 主要地点表
      // - 地图元素表
      // - 表名包含"地图"的表
      const tableName = s.name || '';
      const isMapTable =
        tableName.includes(MAP_TABLE_MARKER) ||
        tableName.includes('主要地点') ||
        tableName.includes('地图元素') ||
        tableName.includes('地图');

      if (isMapTable) {
        dbg('[选项提取] 跳过地图表:', tableName);
        return;
      }

      // 搜索列名包含"选项"的列
      const h = s.content[0] || [];
      h.forEach((colName: string, colIdx: number) => {
        if (!colName) return;

        // 列名包含"选项"
        if (String(colName).includes('选项')) {
          dbg('[选项提取] 找到选项列:', tableName, '-', colName);

          // 遍历所有数据行提取选项内容
          s.content.slice(1).forEach((row: any) => {
            if (row && row[colIdx]) {
              const optionValue = String(row[colIdx]).trim();
              if (optionValue && !state.optionsData.includes(optionValue)) {
                state.optionsData.push(optionValue);
                dbg('[选项提取] 添加选项:', optionValue);
              }
            }
          });
        }
      });
    });

    dbg('[选项提取] 提取完成, 共', state.optionsData.length, '个选项');
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

    // v8.8修改2-5: 收集角色其他信息（排除物品表、全局数据表、任务表）
    // 用于在角色卡右侧显示角色档案信息
    const excludeTableKeywords = ['物品', '全局', '任务', '地图', '地点', '元素', '总结', '大纲'];
    const charExtraInfo: Record<string, any> = {};

    Object.values(rawData).forEach((s: any) => {
      if (!s || !s.name || !s.content || !s.content[0]) return;

      const tableName = s.name || '';
      // 排除特定表格
      if (excludeTableKeywords.some(kw => tableName.includes(kw))) return;

      const h = s.content[0] || [];
      const rows = s.content.slice(1);

      // 查找角色名/姓名列
      const nameIdx = getCol(h, ['角色名', '姓名', '名字', '名称']);
      if (nameIdx === -1) return;

      // v8.8修改3: 查找身体信息相关列
      const bodyInfoCols: number[] = [];
      const bodyStatusCols: number[] = [];
      const clothingCols: number[] = [];
      const otherInfoCols: number[] = [];

      h.forEach((colName: string, colIdx: number) => {
        if (!colName || colIdx === nameIdx) return;
        const col = String(colName);

        // 身体特征/部位列
        if (['特征', '身体特征', '身体部位', '部位'].some(kw => col.includes(kw))) {
          bodyInfoCols.push(colIdx);
        }
        // 身体状态列
        else if (col.includes('状态') && !col.includes('特殊状态')) {
          bodyStatusCols.push(colIdx);
        }
        // 衣着/服装列
        else if (['服装', '衣着', '装扮', '穿着'].some(kw => col.includes(kw))) {
          clothingCols.push(colIdx);
        }
        // 其他信息列（排除已处理的列）
        else if (
          !['姓名', '名字', '年龄', '性别', '职业', '身份', '物品', '道具', '背包'].some(kw => col.includes(kw))
        ) {
          otherInfoCols.push(colIdx);
        }
      });

      // 遍历数据行，收集角色信息
      rows.forEach((r: any) => {
        const charName = r[nameIdx];
        if (!charName) return;

        if (!charExtraInfo[charName]) {
          charExtraInfo[charName] = {
            bodyInfo: [], // 身体信息 {key, value}[]
            bodyStatus: [], // 身体状态 {label, value}[]
            clothing: [], // 衣着信息 {key, value}[]
            otherInfo: [], // 其他信息 {tableName, items: {label, value}[]}
            bodyNotes: '', // 身体信息备注
            clothingNotes: '', // 衣着备注
          };
        }

        const info = charExtraInfo[charName];

        // 提取身体信息
        bodyInfoCols.forEach(colIdx => {
          const content = r[colIdx];
          if (content) {
            const parsed = parseFormattedContent(String(content));
            info.bodyInfo.push(...parsed.labels);
            if (parsed.notes) info.bodyNotes += (info.bodyNotes ? ' ' : '') + parsed.notes;
          }
        });

        // 提取身体状态
        bodyStatusCols.forEach(colIdx => {
          const colName = h[colIdx];
          const content = r[colIdx];
          if (content) {
            info.bodyStatus.push({
              label: colName,
              value: String(content),
            });
          }
        });

        // 提取衣着信息
        clothingCols.forEach(colIdx => {
          const content = r[colIdx];
          if (content) {
            const parsed = parseFormattedContent(String(content));
            info.clothing.push(...parsed.labels);
            if (parsed.notes) info.clothingNotes += (info.clothingNotes ? ' ' : '') + parsed.notes;
          }
        });

        // 提取其他信息（按表名分组）
        const tableItems: { label: string; value: string }[] = [];
        otherInfoCols.forEach(colIdx => {
          const colName = h[colIdx];
          const content = r[colIdx];
          if (content) {
            tableItems.push({
              label: colName,
              value: String(content),
            });
          }
        });
        if (tableItems.length > 0) {
          info.otherInfo.push({
            tableName: tableName,
            items: tableItems,
          });
        }
      });
    });

    result.charExtraInfo = charExtraInfo;

    Object.values(rawData).forEach((s: any) => {
      if (!s || !s.name) return;
      const h = s.content[0] || [];
      const rows = s.content.slice(1);

      // v8.8修改5: 扩展职业/身份识别，支持"境界"、"种族"、"称号"等变体
      const jobKeywords = ['职业', '境界', '种族', '称号', '阶级', '等级'];
      const identityKeywords = ['身份', '头衔', '地位', '立场'];

      const idx = {
        name: getCol(h, ['姓名', '名字', '名称']),
        age: getCol(h, ['年龄', '岁数']),
        sex: getCol(h, ['性别']),
        loc: getCol(h, ['地点', '位置', '所在地']),
        job: h.findIndex((x: string) => x && jobKeywords.some(kw => x.includes(kw))),
        identity: h.findIndex((x: string) => x && identityKeywords.some(kw => x.includes(kw))),
        desc: getCol(h, ['关系', '描述', '简介']),
        shortGoal: h.findIndex(
          (x: string) =>
            x &&
            ['短期目标', '心声', '当前', '即时'].some(n => x.includes(n)) &&
            !['位置', '地点', '时间'].some(ex => x.includes(ex)),
        ),
        longGoal: getCol(h, ['长期目标', '终极目标', '愿望']),
        rel: h.findIndex(
          (x: string) => x && (x.includes('关系') || x.includes('与主角关系') || x.includes('角色间关系')),
        ),
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

          // v8.8修改5: 智能识别职业和身份，支持 / 分隔符
          let job = '';
          let identity = '';
          const desc = idx.desc > -1 ? r[idx.desc] : '';

          if (idx.job > -1 && r[idx.job]) {
            const jobColName = h[idx.job];
            const rawJob = String(r[idx.job]);

            // 检查列名是否包含 /，且单元格内容也包含 /
            if (jobColName.includes('/') && rawJob.includes('/')) {
              const colParts = jobColName.split('/');
              const valParts = rawJob.split('/');
              // 第一部分作为job，第二部分作为identity（如果identity列未定义）
              job = valParts[0]?.trim() || '';
              if (valParts[1] && idx.identity === -1) {
                identity = valParts[1]?.trim() || '';
              }
            } else {
              // 普通分隔符处理
              const split = rawJob.split(/[:：;；]/);
              if (split.length > 1) {
                job = split[0].trim();
                if (idx.identity === -1) identity = split[1].trim();
              } else {
                job = rawJob;
              }
            }
          }

          // 如果有独立的identity列，使用该列的值
          if (idx.identity > -1 && r[idx.identity]) {
            const identityColName = h[idx.identity];
            const rawIdentity = String(r[idx.identity]);

            // 同样处理 / 分隔符
            if (identityColName.includes('/') && rawIdentity.includes('/')) {
              const valParts = rawIdentity.split('/');
              identity = valParts.map((p: string) => p.trim()).join(' / ');
            } else {
              identity = rawIdentity;
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
            relation: idx.rel > -1 ? r[idx.rel] : '', // 人物关系
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
    result.allItems = allItems; // 保存所有物品数据
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
              width: parseInt(r[idx.w]) || 100,
              height: parseInt(r[idx.h]) || 80,
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
        // 新增：元素坐标和尺寸支持
        x: getCol(h, ['X坐标', 'X', '元素X']),
        y: getCol(h, ['Y坐标', 'Y', '元素Y']),
        w: getCol(h, ['宽度', 'Width', '元素宽度']),
        eH: getCol(h, ['高度', 'Height', '元素高度']),
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
              // 新增：元素坐标和尺寸（如果有）
              x: idx.x > -1 ? parseInt(r[idx.x]) : undefined,
              y: idx.y > -1 ? parseInt(r[idx.y]) : undefined,
              width: idx.w > -1 ? parseInt(r[idx.w]) : undefined,
              height: idx.eH > -1 ? parseInt(r[idx.eH]) : undefined,
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
  // 修复导入报错：确保 mate 结构存在
  if (!fullData.mate) {
    fullData.mate = { type: 'chatSheets', version: 1 };
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

// ========== 角色编辑弹窗（Bug 3修复） ==========
/**
 * 显示角色编辑弹窗
 * 在编辑模式下点击展开的角色卡左侧区域时调用
 * @param d 角色数据对象
 */
function showCharEditDialog(d: any) {
  dbg('[角色编辑弹窗] 打开角色编辑:', d.name);

  // 移除已存在的编辑弹窗
  $('.ci-char-edit-overlay').remove();

  // 获取角色头像
  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + d.name, '');
  const avatarHtml = localImg
    ? `<img src="${localImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : d.name.charAt(0);

  // 获取额外信息（身体状态等）
  const charExtra = state.cachedData.charExtraInfo?.[d.name] || {};
  let bodyStatusHtml = '';
  if (charExtra.bodyStatus && charExtra.bodyStatus.length > 0) {
    bodyStatusHtml +=
      '<div class="ci-input-group"><label>身体状态</label><div class="ci-input-row" style="flex-wrap:wrap;gap:8px;">';
    charExtra.bodyStatus.forEach((s: any, i: number) => {
      bodyStatusHtml += `
        <div class="ci-input-group" style="flex:1;min-width:80px;margin-bottom:0;">
          <label style="font-size:10px;color:#999;">${s.label}</label>
          <input class="ci-input-field" data-field="bodyStatus-${i}" data-label="${s.label}" value="${s.value}">
        </div>`;
    });
    bodyStatusHtml += '</div></div>';
  }

  // 创建编辑弹窗
  const $overlay = $(`
    <div class="ci-char-edit-overlay ci-edit-overlay">
      <div class="ci-char-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar">${avatarHtml}</div>
          <span class="ci-edit-title">编辑角色</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body">
          <div class="ci-input-group">
            <label>姓名</label>
            <input class="ci-input-field" data-field="name" value="${d.name || ''}">
          </div>
          <div class="ci-input-row">
            <div class="ci-input-group half">
              <label>性别</label>
              <input class="ci-input-field" data-field="sex" value="${d.sex || ''}">
            </div>
            <div class="ci-input-group half">
              <label>年龄</label>
              <input class="ci-input-field" data-field="age" value="${d.age || ''}">
            </div>
          </div>
          <div class="ci-input-row">
            <div class="ci-input-group half">
              <label>职业</label>
              <input class="ci-input-field" data-field="job" value="${d.job || ''}">
            </div>
            <div class="ci-input-group half">
              <label>身份</label>
              <input class="ci-input-field" data-field="identity" value="${d.identity || ''}">
            </div>
          </div>
          <div class="ci-input-group">
            <label>位置</label>
            <input class="ci-input-field" data-field="loc" value="${d.loc || ''}">
          </div>
          ${bodyStatusHtml}
          ${
            state.cachedData.hasLongGoal
              ? `
          <div class="ci-input-group">
            <label>长期目标</label>
            <textarea class="ci-input-field" data-field="longGoal" rows="2">${d.longGoal || ''}</textarea>
          </div>
          `
              : ''
          }
        </div>
        <div class="ci-edit-footer">
          <button class="ci-edit-delete-btn">
            ${ICONS.close} 删除角色
          </button>
          <button class="ci-edit-save-btn">
            ${ICONS.save} 保存修改
          </button>
        </div>
      </div>
    </div>
  `);

  // 绑定关闭事件
  $overlay.find('.ci-edit-close').on('click', (e: any) => {
    e.stopPropagation();
    dbg('[角色编辑弹窗] 点击关闭按钮');
    $overlay.remove();
  });

  // 点击遮罩层关闭
  $overlay.on('click', function (e: any) {
    if (e.target === this) {
      dbg('[角色编辑弹窗] 点击遮罩层关闭');
      $overlay.remove();
    }
  });

  // 阻止编辑卡片内部点击事件冒泡
  $overlay.find('.ci-char-edit-card').on('click', (e: any) => {
    e.stopPropagation();
  });

  // 绑定保存按钮
  $overlay.find('.ci-edit-save-btn').on('click', async (e: any) => {
    e.stopPropagation();
    dbg('[角色编辑弹窗] 点击保存按钮');

    const newData: any = {
      name: $overlay.find('[data-field="name"]').val() as string,
      sex: $overlay.find('[data-field="sex"]').val() as string,
      age: $overlay.find('[data-field="age"]').val() as string,
      job: $overlay.find('[data-field="job"]').val() as string,
      identity: $overlay.find('[data-field="identity"]').val() as string,
      loc: $overlay.find('[data-field="loc"]').val() as string,
      longGoal: ($overlay.find('[data-field="longGoal"]').val() as string) || '',
      bodyStatus: [] as any[],
    };

    // 收集身体状态
    $overlay.find('[data-field^="bodyStatus-"]').each(function (this: HTMLElement) {
      const $input = $(this);
      newData.bodyStatus.push({
        label: $input.data('label'),
        value: $input.val(),
      });
    });

    dbg('[角色编辑弹窗] 保存数据:', newData);

    // 调用保存函数
    await saveCharData(d._src, newData);
    $overlay.remove();
  });

  // 绑定删除按钮
  $overlay.find('.ci-edit-delete-btn').on('click', async (e: any) => {
    e.stopPropagation();
    dbg('[角色编辑弹窗] 点击删除按钮');
    await deleteCharData(d._src);
    $overlay.remove();
  });

  $('body').append($overlay);
}

/**
 * 档案信息编辑弹窗 - 用于编辑角色右侧的档案信息（身体状态、衣着装扮等）
 */
function showArchiveEditDialog(d: any) {
  dbg('[档案编辑弹窗] 打开档案编辑:', d.name);

  // 移除已存在的编辑弹窗
  $('.ci-archive-edit-overlay').remove();

  // 获取角色额外信息
  const charExtra = state.cachedData.charExtraInfo?.[d.name] || {};

  // 获取角色头像
  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + d.name, '');
  const avatarHtml = localImg
    ? `<img src="${localImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : d.name.charAt(0);

  // 构建身体状态编辑区
  let bodyStatusHtml = '';
  if (charExtra.bodyStatus && charExtra.bodyStatus.length > 0) {
    bodyStatusHtml = charExtra.bodyStatus
      .map(
        (item: any, idx: number) => `
        <div class="ci-archive-edit-item" data-type="bodyStatus" data-idx="${idx}">
          <input class="ci-input-field ci-archive-label-input" data-field="label" value="${item.label || ''}" readonly style="border:none; background:transparent; font-weight:bold; color:#666; padding-left:0; width:100%; margin-bottom:4px;">
          <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
        </div>
      `,
      )
      .join('');
  }

  // 构建身体信息编辑区
  let bodyInfoHtml = '';
  if (charExtra.bodyInfo && charExtra.bodyInfo.length > 0) {
    bodyInfoHtml = charExtra.bodyInfo
      .map(
        (item: any, idx: number) => `
        <div class="ci-archive-edit-item" data-type="bodyInfo" data-idx="${idx}">
          <input class="ci-input-field ci-archive-label-input" data-field="key" value="${item.key || ''}" placeholder="标签名">
          <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
        </div>
      `,
      )
      .join('');
  }

  // 构建衣着信息编辑区
  let clothingHtml = '';
  if (charExtra.clothing && charExtra.clothing.length > 0) {
    clothingHtml = charExtra.clothing
      .map(
        (item: any, idx: number) => `
        <div class="ci-archive-edit-item" data-type="clothing" data-idx="${idx}">
          <input class="ci-input-field ci-archive-label-input" data-field="key" value="${item.key || ''}" placeholder="标签名">
          <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
        </div>
      `,
      )
      .join('');
  }

  // 创建编辑弹窗
  const $overlay = $(`
    <div class="ci-archive-edit-overlay ci-edit-overlay">
      <div class="ci-archive-edit-card ci-edit-card" style="width: 380px; max-height: 80vh; overflow-y: auto;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar">${avatarHtml}</div>
          <span class="ci-edit-title">编辑档案 - ${d.name}</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body">
          ${
            charExtra.bodyStatus && charExtra.bodyStatus.length > 0
              ? `
          <div class="ci-archive-edit-section">
            <div class="ci-archive-edit-section-title">身体状态</div>
            <div class="ci-archive-edit-items" data-section="bodyStatus">
              ${bodyStatusHtml}
            </div>
          </div>
          `
              : ''
          }
          ${
            charExtra.bodyInfo && charExtra.bodyInfo.length > 0
              ? `
          <div class="ci-archive-edit-section">
            <div class="ci-archive-edit-section-title">身体特征</div>
            <div class="ci-archive-edit-items" data-section="bodyInfo">
              ${bodyInfoHtml}
            </div>
          </div>
          `
              : ''
          }
          ${
            charExtra.clothing && charExtra.clothing.length > 0
              ? `
          <div class="ci-archive-edit-section">
            <div class="ci-archive-edit-section-title">衣着装扮</div>
            <div class="ci-archive-edit-items" data-section="clothing">
              ${clothingHtml}
            </div>
          </div>
          `
              : ''
          }
          ${
            !charExtra.bodyStatus?.length && !charExtra.bodyInfo?.length && !charExtra.clothing?.length
              ? `
          <div class="ci-archive-empty-edit">
            <div style="text-align:center;color:#999;padding:30px;">
              暂无可编辑的档案信息
            </div>
          </div>
          `
              : ''
          }
        </div>
        <div class="ci-edit-footer">
          <button class="ci-edit-save-btn">
            ${ICONS.save} 保存修改
          </button>
        </div>
      </div>
    </div>
  `);

  // 绑定关闭事件
  $overlay.find('.ci-edit-close').on('click', (e: any) => {
    e.stopPropagation();
    dbg('[档案编辑弹窗] 点击关闭按钮');
    $overlay.remove();
  });

  // 点击遮罩层关闭
  $overlay.on('click', function (this: HTMLElement, e: any) {
    if (e.target === this) {
      dbg('[档案编辑弹窗] 点击遮罩层关闭');
      $overlay.remove();
    }
  });

  // 阻止编辑卡片内部点击事件冒泡
  $overlay.find('.ci-archive-edit-card').on('click', (e: any) => {
    e.stopPropagation();
  });

  // 绑定保存按钮
  $overlay.find('.ci-edit-save-btn').on('click', async (e: any) => {
    e.stopPropagation();
    dbg('[档案编辑弹窗] 点击保存按钮');

    // 收集编辑后的数据
    const updatedData: any = {
      bodyStatus: [],
      bodyInfo: [],
      clothing: [],
    };

    // 收集身体状态
    $overlay.find('[data-section="bodyStatus"] .ci-archive-edit-item').each(function (this: HTMLElement) {
      const $item = $(this);
      updatedData.bodyStatus.push({
        label: $item.find('[data-field="label"]').val(),
        value: $item.find('[data-field="value"]').val(),
      });
    });

    // 收集身体信息
    $overlay.find('[data-section="bodyInfo"] .ci-archive-edit-item').each(function (this: HTMLElement) {
      const $item = $(this);
      updatedData.bodyInfo.push({
        key: $item.find('[data-field="key"]').val(),
        value: $item.find('[data-field="value"]').val(),
      });
    });

    // 收集衣着信息
    $overlay.find('[data-section="clothing"] .ci-archive-edit-item').each(function (this: HTMLElement) {
      const $item = $(this);
      updatedData.clothing.push({
        key: $item.find('[data-field="key"]').val(),
        value: $item.find('[data-field="value"]').val(),
      });
    });

    dbg('[档案编辑弹窗] 收集的数据:', updatedData);

    // 调用保存函数
    await saveArchiveData(d.name, d._src, updatedData);
    $overlay.remove();
  });

  $('body').append($overlay);
}

/**
 * 辅助函数：更新单元格或复合单元格内容
 * 支持直接列匹配和 "Key:Value" 格式的复合内容匹配
 */
function updateCellOrComposite(row: any[], headers: string[], key: string, value: string): boolean {
  // 1. 尝试直接列匹配
  const colIdx = headers.findIndex(h => h === key || h.includes(key));
  if (colIdx !== -1 && row[colIdx] !== undefined) {
    row[colIdx] = value;
    return true;
  }

  // 2. 尝试复合单元格匹配 (Key:Value; Key2:Value2)
  for (let i = 0; i < row.length; i++) {
    const cell = String(row[i]);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 匹配 "Key:Value" 或 "Key：Value"，直到分号或结束
    const regex = new RegExp(`(${escapedKey}[:：]\\s*)([^;；]+)`);
    if (regex.test(cell)) {
      row[i] = cell.replace(regex, `$1${value}`);
      return true;
    }
  }
  return false;
}

/**
 * 保存档案数据到数据库
 */
/**
 * 保存档案数据到数据库
 * 修复：直接操作 content 数组，解决 rows 属性不存在导致的保存失败问题
 */
async function saveArchiveData(charName: string, srcInfo: any, updatedData: any) {
  dbg('[档案保存] 开始保存档案数据:', charName);

  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  try {
    const fullData = api.exportTableAsJson();

    // 修复保存报错：确保 mate 结构存在
    if (!fullData.mate) {
      fullData.mate = { type: 'chatSheets', version: 1 };
    }

    // 查找包含该角色档案信息的表
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      // 关键修复：检查 content 而不是 rows
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;

      const tableName = sheet.name || '';
      const headers = sheet.content[0] || [];

      // 检查是否是角色相关的表
      const nameColIdx = headers.findIndex(
        (h: string) => h && ['角色', '姓名', '名字', '名称'].some(n => String(h).includes(n))
      );
      if (nameColIdx === -1) return;

      // 遍历内容行 (从索引1开始)
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;
        
        const rowName = String(row[nameColIdx] || '').trim();
        if (rowName !== charName) continue;

        dbg('[档案保存] 找到角色行:', tableName, i);

        // 身体状态
        if (updatedData.bodyStatus && updatedData.bodyStatus.length > 0) {
          updatedData.bodyStatus.forEach((item: any) => {
            if (updateCellOrComposite(row, headers, item.label, item.value)) {
              dbg('[档案保存] 更新身体状态:', item.label, '->', item.value);
            }
          });
        }

        // 身体信息
        if (updatedData.bodyInfo && updatedData.bodyInfo.length > 0) {
          updatedData.bodyInfo.forEach((item: any) => {
            if (updateCellOrComposite(row, headers, item.key, item.value)) {
              dbg('[档案保存] 更新身体信息:', item.key, '->', item.value);
            }
          });
        }

        // 衣着信息
        if (updatedData.clothing && updatedData.clothing.length > 0) {
          updatedData.clothing.forEach((item: any) => {
            if (updateCellOrComposite(row, headers, item.key, item.value)) {
              dbg('[档案保存] 更新衣着信息:', item.key, '->', item.value);
            }
          });
        }
      }
    });

    // 关键修复：先执行直接注入，确保隔离数据被更新
    await performDirectInjection(fullData);

    // 保存更新后的数据
    const importResult = await api.importTableAsJson(JSON.stringify(fullData));
    if (importResult === false) {
      showToast('保存失败', 'error');
    } else {
      showToast('档案已保存');
      // 刷新数据
      state.cachedData = processData(api.exportTableAsJson());
      if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
    }
  } catch (e) {
    console.error('[档案保存] 异常:', e);
    showToast('保存失败: ' + e, 'error');
  }
}

// ========== 赠予/拿取功能辅助函数 ==========

// 获取主角名称
function getProtagonistName(): string {
  dbg('[赠予] 获取主角名称');

  // 优先从缓存获取
  if (state.cachedData.protagonistName) {
    return state.cachedData.protagonistName;
  }

  // 从主角信息表获取
  const mainChars = state.cachedData.main || [];
  const protagonist = mainChars.find(
    (c: any) => c._src?.table === '主角信息' || c.name?.includes('主角') || c._src?.table?.includes('主角'),
  );

  if (protagonist?.name) {
    state.cachedData.protagonistName = protagonist.name;
    return protagonist.name;
  }

  // 如果没有找到明确的主角，返回第一个主要角色
  if (mainChars.length > 0 && mainChars[0].name) {
    state.cachedData.protagonistName = mainChars[0].name;
    return mainChars[0].name;
  }

  return '';
}

// 更新物品卡片支持多选
function updateItemCardsForSelection($container: any, protagonistItems: any[], protagonistName: string) {
  dbg('[赠予] 更新物品卡片选择功能, 主角物品数:', protagonistItems.length);

  // 找到主角的物品区域
  const $protagonistBox = $container.find(`.ci-inv-char-box[data-owner="${protagonistName}"]`);
  if ($protagonistBox.length === 0) {
    dbg('[赠予] 未找到主角物品区域');
    return;
  }

  // 为主角物品添加选择功能
  $protagonistBox.find('.ci-inv-item-card').each(function () {
    const $card = $(this);
    const itemName = $card.data('item-name');
    const item = protagonistItems.find((i: any) => i.name === itemName);

    if (!item) return;

    // 添加可选择样式
    $card.addClass('selectable');

    // 检查是否已选中
    const isSelected = state.selectedItems.some((i: any) => i.name === itemName);
    if (isSelected) {
      $card.addClass('selected');
    }

    // 移除旧的点击事件，添加新的选择事件
    $card.off('click').on('click', function (e: any) {
      e.stopPropagation();

      if (state.giftMode) {
        // 赠予模式下，切换选中状态
        const idx = state.selectedItems.findIndex((i: any) => i.name === itemName);
        if (idx > -1) {
          state.selectedItems.splice(idx, 1);
          $card.removeClass('selected');
          dbg('[赠予] 取消选择物品:', itemName);
        } else {
          state.selectedItems.push(item);
          $card.addClass('selected');
          dbg('[赠予] 选择物品:', itemName);
        }
        showToast(`已选择 ${state.selectedItems.length} 件物品`);
      } else {
        // 非赠予模式，显示物品详情
        showItemDetail(item);
      }
    });
  });

  // 高亮主角物品区域
  $protagonistBox.addClass('gift-source');
}

// 退出赠予模式
function exitGiftMode($container: any, $actionBar: any) {
  dbg('[赠予] 退出赠予模式');

  state.giftMode = false;
  state.giftMenuExpanded = false;
  state.selectedItems = [];

  // 更新UI状态
  $actionBar.find('.ci-gift-btn').removeClass('active');
  $actionBar.find('.ci-gift-submenu').removeClass('expanded');
  $container.find('.ci-inv-content').removeClass('gift-mode');

  // 移除物品卡片的选择状态
  $container.find('.ci-inv-item-card').removeClass('selected selectable');
  $container.find('.ci-inv-char-box').removeClass('gift-source');

  showToast('已退出赠予模式');
}

// 显示角色选择弹窗
function showCharacterSelectPopup(protagonistName: string, selectedItems: any[]) {
  dbg('[赠予] 显示角色选择弹窗, 已选物品:', selectedItems.length);

  // 获取主角当前位置
  const protagonistLoc = state.cachedData.protagonistLoc || '';
  dbg('[赠予] 主角位置:', protagonistLoc);

  // 获取非已离场角色
  const availableChars = [
    ...state.cachedData.main.filter((c: any) => c.name !== protagonistName),
    ...state.cachedData.side,
  ];

  // 区分在场和不在场角色
  const presentChars: any[] = [];
  const absentChars: any[] = [];

  availableChars.forEach((char: any) => {
    const charLoc = char.loc || '';
    // 判断是否在场（位置匹配）
    const isPresent =
      protagonistLoc &&
      charLoc &&
      (charLoc === protagonistLoc || charLoc.includes(protagonistLoc) || protagonistLoc.includes(charLoc));

    if (isPresent) {
      presentChars.push(char);
    } else {
      absentChars.push(char);
    }
  });

  dbg('[赠予] 在场角色:', presentChars.length, '不在场角色:', absentChars.length);

  // 创建弹窗
  const $overlay = $(`
    <div class="ci-char-select-overlay">
      <div class="ci-char-select-popup">
        <div class="ci-char-select-header">
          <span class="ci-char-select-title">选择赠予对象</span>
          <span class="ci-char-select-close">${ICONS.close}</span>
        </div>
        <div class="ci-char-select-content">
          ${
            presentChars.length > 0
              ? `
            <div class="ci-char-select-section">
              <div class="ci-char-select-section-title">
                <span class="ci-present-dot"></span> 在场角色
              </div>
              <div class="ci-char-select-grid present"></div>
            </div>
          `
              : ''
          }
          ${
            absentChars.length > 0
              ? `
            <div class="ci-char-select-section">
              <div class="ci-char-select-section-title">
                <span class="ci-absent-dot"></span> 不在场角色
              </div>
              <div class="ci-char-select-grid absent"></div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `);

  // 渲染在场角色
  const $presentGrid = $overlay.find('.ci-char-select-grid.present');
  presentChars.forEach((char: any) => {
    const $charCard = createMiniCharCard(char, true);
    $charCard.on('click', () => {
      showGiftConfirmPopup(selectedItems, char, protagonistName);
      $overlay.remove();
    });
    $presentGrid.append($charCard);
  });

  // 渲染不在场角色
  const $absentGrid = $overlay.find('.ci-char-select-grid.absent');
  absentChars.forEach((char: any) => {
    const $charCard = createMiniCharCard(char, false);
    $charCard.on('click', () => {
      showGiftConfirmPopup(selectedItems, char, protagonistName);
      $overlay.remove();
    });
    $absentGrid.append($charCard);
  });

  // 关闭事件
  $overlay.find('.ci-char-select-close').on('click', () => $overlay.remove());
  $overlay.on('click', function (e: any) {
    if (e.target === this) $overlay.remove();
  });

  $('body').append($overlay);
}

// 创建迷你角色卡片
function createMiniCharCard(char: any, isPresent: boolean) {
  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + char.name, '');
  const avatarHtml = localImg
    ? `<img src="${localImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : char.name.charAt(0);

  // 性别颜色
  const isFemale = char.sex === '女' || char.sex === 'Female' || char.sex === 'F';
  const genderClass = isFemale ? 'female' : 'male';

  const $card = $(`
    <div class="ci-mini-char-card ${isPresent ? 'present' : 'absent'}" data-name="${char.name}">
      <div class="ci-mini-char-avatar ${genderClass}">${avatarHtml}</div>
      <div class="ci-mini-char-name">${char.name}</div>
      ${char.loc ? `<div class="ci-mini-char-loc">${ICONS.location} ${char.loc}</div>` : ''}
    </div>
  `);

  return $card;
}

// 显示赠予确认弹窗
function showGiftConfirmPopup(items: any[], targetChar: any, protagonistName: string) {
  dbg('[赠予] 显示确认弹窗, 目标:', targetChar.name);

  const itemNames = items.map((i: any) => i.name).join('、');

  // 性别颜色
  const isFemale = targetChar.sex === '女' || targetChar.sex === 'Female' || targetChar.sex === 'F';
  const genderClass = isFemale ? 'female' : 'male';

  const $overlay = $(`
    <div class="ci-gift-confirm-overlay">
      <div class="ci-gift-confirm-popup">
        <div class="ci-gift-confirm-header">确认赠予</div>
        <div class="ci-gift-confirm-content">
          <p>是否将以下物品赠予给 <span class="ci-gender-tag ${genderClass}">${targetChar.name}</span>？</p>
          <div class="ci-gift-confirm-items">
            ${items.map((i: any) => `<span class="ci-gift-item-tag">${i.name}</span>`).join('')}
          </div>
        </div>
        <div class="ci-gift-confirm-actions">
          <button class="ci-gift-confirm-cancel">取消</button>
          <button class="ci-gift-confirm-ok">确认赠予</button>
        </div>
      </div>
    </div>
  `);

  // 取消按钮
  $overlay.find('.ci-gift-confirm-cancel').on('click', () => $overlay.remove());

  // 确认按钮
  $overlay.find('.ci-gift-confirm-ok').on('click', () => {
    // 构建消息
    const message = `[${protagonistName}]将${itemNames}赠予了[${targetChar.name}]。`;
    dbg('[赠予] 发送消息:', message);

    // 发送到输入框
    sendGameActionRequest(message);

    // 关闭弹窗并重置状态
    $overlay.remove();

    // 重置赠予状态
    state.giftMode = false;
    state.giftMenuExpanded = false;
    state.selectedItems = [];

    showToast('已发送赠予请求');
  });

  // 点击遮罩关闭
  $overlay.on('click', function (e: any) {
    if (e.target === this) $overlay.remove();
  });

  $('body').append($overlay);
}

// ========== 世界信息面板渲染 ==========

/**
 * 提取世界信息数据
 * 从表格中提取任务/行程/事件、组织/势力、总结表等信息
 */
function extractWorldInfoData(rawData: any): any {
  const worldInfo = {
    tasks: [] as any[],
    forces: [] as any[],
    summary: null as any,
    outline: null as any,
    newsItems: [] as string[],
  };

  if (!rawData) return worldInfo;

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  try {
    // 遍历所有表格
    Object.values(rawData).forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;

      const tableName = table.name;
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      // 检测任务/行程/事件表
      if (/任务|行程|事件/.test(tableName)) {
        const nameIdx = getCol(h, ['名称', '任务名', '事件名', '标题']);
        const descIdx = getCol(h, ['描述', '内容', '详情', '说明']);
        const statusIdx = getCol(h, ['状态', '进度']);
        const timeIdx = getCol(h, ['时间', '期限', '截止']);

        rows.forEach((row: any) => {
          if (!row[nameIdx]) return;
          worldInfo.tasks.push({
            name: row[nameIdx],
            desc: descIdx > -1 ? row[descIdx] : '',
            status: statusIdx > -1 ? row[statusIdx] : '',
            time: timeIdx > -1 ? row[timeIdx] : '',
            _table: tableName,
          });
        });
      }

      // 检测组织/势力表
      if (/组织|势力/.test(tableName)) {
        const nameIdx = getCol(h, ['名称', '组织名', '势力名']);
        const leaderIdx = getCol(h, ['领袖', '首领', '领导', '头目']);
        const purposeIdx = getCol(h, ['宗旨', '目的', '理念', '目标']);
        const descIdx = getCol(h, ['描述', '介绍', '简介']);

        rows.forEach((row: any) => {
          if (!row[nameIdx]) return;
          const forceData: any = {
            name: row[nameIdx],
            leader: leaderIdx > -1 ? row[leaderIdx] : '',
            purpose: purposeIdx > -1 ? row[purposeIdx] : '',
            desc: descIdx > -1 ? row[descIdx] : '',
            details: {} as Record<string, string>,
          };
          // 收集其他列信息
          h.forEach((header: string, idx: number) => {
            if (idx !== nameIdx && idx !== leaderIdx && idx !== purposeIdx && idx !== descIdx && row[idx]) {
              forceData.details[header] = row[idx];
            }
          });
          worldInfo.forces.push(forceData);
        });
      }

      // 检测总结表
      if (tableName === '总结表' || tableName.includes('总结表')) {
        const summaryIdx = getCol(h, ['纪要', '总结', '内容', '摘要']);
        const timeIdx = getCol(h, ['时间', '时间跨度', '日期']);
        const indexIdx = getCol(h, ['索引', '编码', '编号']);

        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          worldInfo.summary = {
            content: summaryIdx > -1 ? lastRow[summaryIdx] : '',
            time: timeIdx > -1 ? lastRow[timeIdx] : '',
            index: indexIdx > -1 ? lastRow[indexIdx] : rows.length,
            details: {} as Record<string, string>,
          };
          // 收集其他列
          h.forEach((header: string, idx: number) => {
            if (idx !== summaryIdx && idx !== timeIdx && idx !== indexIdx && lastRow[idx]) {
              worldInfo.summary.details[header] = lastRow[idx];
            }
          });
        }
      }

      // 检测总结大纲表
      if (tableName === '总结大纲' || tableName.includes('总结大纲')) {
        const outlineIdx = getCol(h, ['大纲', '概要', '内容']);
        const indexIdx = getCol(h, ['索引', '编码', '编号']);

        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          worldInfo.outline = {
            content: outlineIdx > -1 ? lastRow[outlineIdx] : '',
            index: indexIdx > -1 ? lastRow[indexIdx] : rows.length,
          };
        }
      }
    });

    // 生成滚动新闻条目
    if (worldInfo.tasks.length > 0) {
      worldInfo.newsItems.push('【任务速报：出现了新的事件动态！详情请关注事件板块！】');
    }
    if (worldInfo.forces.length > 0) {
      const latestForce = worldInfo.forces[worldInfo.forces.length - 1];
      worldInfo.newsItems.push(
        `【区域势力热点：发现了新势力${latestForce.name}！${latestForce.purpose ? `其宗旨为：${latestForce.purpose}；` : ''}让我们期待他们后续的活跃！】`,
      );
    }
    if (worldInfo.outline) {
      worldInfo.newsItems.push(`【当前速报：${worldInfo.outline.content}。(${worldInfo.outline.index})】`);
    }
  } catch (e) {
    dbg('[世界信息] 数据提取错误:', e);
  }

  return worldInfo;
}

/**
 * 渲染世界信息面板
 * @param $container 容器元素
 */
function renderWorldInfoPanel($container: any) {
  dbg('[世界信息面板] 开始渲染');
  $container.empty();

  // 获取数据源
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  let worldInfo = state.cachedData.worldInfo;

  // 如果缓存中没有数据，尝试重新提取
  if (!worldInfo || (!worldInfo.tasks.length && !worldInfo.forces.length && !worldInfo.summary)) {
    if (api && api.exportTableAsJson) {
      const rawData = api.exportTableAsJson();
      worldInfo = extractWorldInfoData(rawData);
      state.cachedData.worldInfo = worldInfo;
    }
  }

  // 检查是否有数据
  const hasData = worldInfo && (worldInfo.tasks.length > 0 || worldInfo.forces.length > 0 || worldInfo.summary);

  if (!hasData) {
    $container.html(`
      <div class="ci-worldinfo-empty">
        <div class="ci-worldinfo-empty-icon">${ICONS.world}</div>
        <div class="ci-worldinfo-empty-text">暂无世界信息数据</div>
        <div class="ci-worldinfo-empty-hint">请确保数据库中包含任务/事件表、组织/势力表或总结表</div>
      </div>
    `);
    return;
  }

  // ===== 滚动信息条 =====
  const $newsTicker = renderNewsScroller(worldInfo.newsItems);
  $container.append($newsTicker);

  // ===== 主体内容区 =====
  const $mainContent = $('<div class="ci-worldinfo-main"></div>');

  // ===== 左侧：最新信息区 =====
  const $latestNews = renderLatestNews(worldInfo);
  $mainContent.append($latestNews);

  // ===== 右侧：势力信息区 =====
  const $forcesPanel = renderForcesAccordion(worldInfo.forces);
  $mainContent.append($forcesPanel);

  $container.append($mainContent);

  // ===== 底部：事件信息区 =====
  const $eventsArea = renderEventsCards(worldInfo.tasks);
  $container.append($eventsArea);

  dbg('[世界信息面板] 渲染完成');
}

/**
 * 渲染滚动新闻条
 */
function renderNewsScroller(newsItems: string[]): any {
  const newsText = newsItems.length > 0 ? newsItems.join(' ★ ') : '暂无最新消息...';

  const $ticker = $(`
    <div class="ci-news-ticker">
      <div class="ci-ticker-content">
        <span class="ci-ticker-item">${newsText}</span>
        <span class="ci-ticker-item">${newsText}</span>
      </div>
    </div>
  `);

  return $ticker;
}

/**
 * 渲染最新信息区（报纸头条风格）
 */
function renderLatestNews(worldInfo: any): any {
  const summary = worldInfo.summary;
  const outline = worldInfo.outline;

  let headlineTitle = '暂无最新报道';
  let headlineContent = '';
  let headlineTime = '';
  let headlineIndex = '';
  let otherDetails: Record<string, string> = {};

  if (summary) {
    headlineTitle = `最新报道！`;
    headlineIndex = `(${summary.index || '?'})`;
    headlineContent = summary.content || '暂无内容';
    headlineTime = summary.time || '';
    otherDetails = summary.details || {};
  }

  const outlineText = outline ? outline.content : '';

  // 构建其他列的HTML
  let detailsHtml = '';
  if (Object.keys(otherDetails).length > 0) {
    detailsHtml = `
      <div class="ci-worldinfo-details-box">
        ${Object.entries(otherDetails)
          .map(([key, val]) => `<div class="ci-worldinfo-detail-item">【${key}：${val}】</div>`)
          .join('')}
      </div>
    `;
  }

  const $latestNews = $(`
    <div class="ci-worldinfo-latest">
      <div class="ci-worldinfo-headline">
        <div class="ci-worldinfo-headline-title">
          ${headlineTitle}
          <span class="ci-worldinfo-headline-index">${headlineIndex}</span>
        </div>
        ${outlineText ? `<div class="ci-worldinfo-headline-summary">消息摘要：${outlineText}</div>` : ''}
        <div class="ci-worldinfo-headline-content">${headlineContent}</div>
        ${headlineTime ? `<div class="ci-worldinfo-headline-time">时间：${headlineTime}</div>` : ''}
        ${detailsHtml}
      </div>
    </div>
  `);

  return $latestNews;
}

/**
 * 渲染势力信息区（手风琴折叠面板）
 */
function renderForcesAccordion(forces: any[]): any {
  if (!forces || forces.length === 0) {
    return $(`
      <div class="ci-worldinfo-forces">
        <div class="ci-worldinfo-section-title">势力信息</div>
        <div class="ci-worldinfo-forces-empty">暂无势力信息</div>
      </div>
    `);
  }

  const $forcesPanel = $(`
    <div class="ci-worldinfo-forces">
      <div class="ci-worldinfo-section-title">势力信息</div>
      <div class="ci-worldinfo-forces-list"></div>
    </div>
  `);

  const $list = $forcesPanel.find('.ci-worldinfo-forces-list');

  forces.forEach((force, idx) => {
    const leaderText = force.leader ? ` - ${force.leader}` : '';

    const $item = $(`
      <div class="ci-worldinfo-force-item" data-idx="${idx}">
        <div class="ci-worldinfo-force-header">
          <span class="ci-worldinfo-force-arrow">▶</span>
          <span class="ci-worldinfo-force-name">${force.name}</span>
          <span class="ci-worldinfo-force-leader">${leaderText}</span>
        </div>
        <div class="ci-worldinfo-force-content">
          ${force.purpose ? `<div class="ci-worldinfo-force-purpose">【宗旨：${force.purpose}】</div>` : ''}
          ${force.desc ? `<div class="ci-worldinfo-force-desc">【描述：${force.desc}】</div>` : ''}
          ${Object.entries(force.details || {})
            .map(([key, val]) => `<div class="ci-worldinfo-force-detail">【${key}：${val}】</div>`)
            .join('')}
        </div>
      </div>
    `);

    // 手风琴点击事件
    $item.find('.ci-worldinfo-force-header').on('click', function () {
      const $parent = $(this).closest('.ci-worldinfo-force-item');
      const isOpen = $parent.hasClass('expanded');

      // 关闭其他
      $list.find('.ci-worldinfo-force-item').removeClass('expanded');

      if (!isOpen) {
        $parent.addClass('expanded');
      }
    });

    $list.append($item);
  });

  return $forcesPanel;
}

/**
 * 渲染事件卡片区
 */
function renderEventsCards(tasks: any[]): any {
  if (!tasks || tasks.length === 0) {
    return $(`
      <div class="ci-worldinfo-events">
        <div class="ci-worldinfo-section-title">事件信息</div>
        <div class="ci-worldinfo-events-empty">暂无事件信息</div>
      </div>
    `);
  }

  const $eventsArea = $(`
    <div class="ci-worldinfo-events">
      <div class="ci-worldinfo-section-title">事件信息</div>
      <div class="ci-worldinfo-events-list"></div>
    </div>
  `);

  const $list = $eventsArea.find('.ci-worldinfo-events-list');

  tasks.forEach(task => {
    const statusClass = task.status ? `status-${task.status.replace(/\s+/g, '-')}` : '';

    const $card = $(`
      <div class="ci-worldinfo-event-card ${statusClass}">
        <div class="ci-worldinfo-event-name">${task.name}</div>
        ${task.status ? `<div class="ci-worldinfo-event-status">${task.status}</div>` : ''}
        ${task.desc ? `<div class="ci-worldinfo-event-desc">${task.desc}</div>` : ''}
        ${task.time ? `<div class="ci-worldinfo-event-time">${task.time}</div>` : ''}
      </div>
    `);

    $list.append($card);
  });

  return $eventsArea;
}

// ========== 物品仓库面板渲染 ==========
function renderInventoryPanel($container: any, viewMode: 'character' | 'warehouse' = 'character') {
  dbg('[物品仓库] 开始渲染, 视图模式:', viewMode);
  $container.empty();

  // 获取所有物品
  const allItems = state.cachedData.allItems || [];
  const allChars = [...state.cachedData.main, ...state.cachedData.side];

  if (allItems.length === 0) {
    $container.html('<div class="ci-inv-empty">暂无物品数据</div>');
    return;
  }

  // 视图切换标签
  const $viewTabs = $(`
    <div class="ci-inv-view-tabs">
      <div class="ci-inv-tab ${viewMode === 'character' ? 'active' : ''}" data-view="character">
        角色持有
      </div>
      <div class="ci-inv-tab ${viewMode === 'warehouse' ? 'active' : ''}" data-view="warehouse">
        仓库视图
      </div>
      <div class="ci-inv-edit-toggle" title="编辑模式">
        ${ICONS.edit}
      </div>
    </div>
  `);

  $viewTabs.find('.ci-inv-tab').on('click', function () {
    const view = $(this).data('view');
    dbg('[物品仓库] 切换视图:', view);
    renderInventoryPanel($container, view);
  });

  $viewTabs.find('.ci-inv-edit-toggle').on('click', function () {
    $(this).toggleClass('active');
    $container.find('.ci-inv-content').toggleClass('edit-mode');
    const isEdit = $(this).hasClass('active');
    showToast(isEdit ? '已进入编辑模式' : '已退出编辑模式');
  });

  $container.append($viewTabs);

  // 内容区域
  const $content = $('<div class="ci-inv-content"></div>');

  if (viewMode === 'character') {
    // ===== 角色持有物品视图 =====
    renderCharacterView($content, allItems, allChars);
  } else {
    // ===== 仓库视图 =====
    renderWarehouseView($content, allItems);
  }

  $container.append($content);
  dbg('[物品仓库] 渲染完成');
}

// 角色持有物品视图
function renderCharacterView($container: any, allItems: any[], allChars: any[]) {
  dbg('[角色持有物品视图] 开始渲染');

  // 按拥有者分组物品
  const itemsByOwner: Record<string, any[]> = {};
  const noOwnerItems: any[] = [];

  allItems.forEach(item => {
    if (item.owner && item.owner.trim()) {
      const owner = item.owner.trim();
      if (!itemsByOwner[owner]) itemsByOwner[owner] = [];
      itemsByOwner[owner].push(item);
    } else {
      noOwnerItems.push(item);
    }
  });

  // 获取主角名称
  const protagonistName = getProtagonistName();
  dbg('[角色持有物品视图] 主角名称:', protagonistName);

  // 获取主角物品
  const protagonistItems = protagonistName ? itemsByOwner[protagonistName] || [] : [];
  dbg('[角色持有物品视图] 主角物品数量:', protagonistItems.length);

  // ===== 赠予/拿取功能按钮区域 =====
  const $actionBar = $(`
    <div class="ci-inv-action-bar">
      <div class="ci-gift-btn-wrapper">
        <button class="ci-action-btn ci-gift-btn ${state.giftMode ? 'active' : ''}" data-action="gift">
          <span class="ci-btn-icon">${ICONS.gift}</span>
          <span class="ci-btn-text">赠予</span>
        </button>
        <div class="ci-gift-submenu ${state.giftMenuExpanded ? 'expanded' : ''}">
          <button class="ci-submenu-btn ci-gift-cancel">取消赠予</button>
          <button class="ci-submenu-btn ci-gift-select">选择角色</button>
        </div>
      </div>
      <button class="ci-action-btn ci-take-btn ${state.takeMode ? 'active' : ''}" data-action="take">
        <span class="ci-btn-icon">${ICONS.hand}</span>
        <span class="ci-btn-text">拿取</span>
      </button>
    </div>
  `);

  // 赠予按钮点击事件
  $actionBar.find('.ci-gift-btn').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[赠予] 点击赠予按钮');

    if (!protagonistName) {
      showToast('未找到主角信息', 'error');
      return;
    }

    if (protagonistItems.length === 0) {
      showToast('主角没有可赠予的物品', 'error');
      return;
    }

    if (state.giftMode) {
      // 已在赠予模式，展开/收起子菜单
      state.giftMenuExpanded = !state.giftMenuExpanded;
      $(this).closest('.ci-gift-btn-wrapper').find('.ci-gift-submenu').toggleClass('expanded');
    } else {
      // 进入赠予模式
      state.giftMode = true;
      state.takeMode = false;
      state.giftMenuExpanded = true;
      state.selectedItems = [];
      $(this).addClass('active');
      $actionBar.find('.ci-take-btn').removeClass('active');
      $(this).closest('.ci-gift-btn-wrapper').find('.ci-gift-submenu').addClass('expanded');
      $container.find('.ci-inv-content').addClass('gift-mode');
      showToast('已进入赠予模式，请选择要赠予的物品');
    }

    // 重新渲染物品卡片，添加选择功能
    updateItemCardsForSelection($container, protagonistItems, protagonistName);
  });

  // 取消赠予按钮
  $actionBar.find('.ci-gift-cancel').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[赠予] 取消赠予');
    exitGiftMode($container, $actionBar);
  });

  // 选择角色按钮
  $actionBar.find('.ci-gift-select').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[赠予] 选择角色, 已选物品:', state.selectedItems);

    if (state.selectedItems.length === 0) {
      showToast('请先选择要赠予的物品', 'error');
      return;
    }

    showCharacterSelectPopup(protagonistName, state.selectedItems);
  });

  // 拿取按钮点击事件
  $actionBar.find('.ci-take-btn').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[拿取] 点击拿取按钮');

    if (state.takeMode) {
      // 退出拿取模式
      state.takeMode = false;
      $(this).removeClass('active');
      $container.find('.ci-inv-content').removeClass('take-mode');
      showToast('已退出拿取模式');
    } else {
      // 进入拿取模式
      state.takeMode = true;
      state.giftMode = false;
      state.giftMenuExpanded = false;
      state.selectedItems = [];
      $(this).addClass('active');
      $actionBar.find('.ci-gift-btn').removeClass('active');
      $actionBar.find('.ci-gift-submenu').removeClass('expanded');
      $container.find('.ci-inv-content').addClass('take-mode').removeClass('gift-mode');
      showToast('已进入拿取模式，点击物品进行拿取');
    }
  });

  $container.append($actionBar);

  // 创建角色物品区域
  const $charAreas = $('<div class="ci-inv-char-areas"></div>');

  // 为每个有物品的角色创建区域
  Object.keys(itemsByOwner).forEach(ownerName => {
    const items = itemsByOwner[ownerName];
    const char = allChars.find(c => c.name === ownerName || c.name.includes(ownerName) || ownerName.includes(c.name));

    const $charBox = $(`
      <div class="ci-inv-char-box" data-owner="${ownerName}">
        <div class="ci-inv-char-header">
          <span class="ci-inv-char-name">${ownerName}</span>
          <span class="ci-inv-char-count">${items.length}件</span>
        </div>
        <div class="ci-inv-char-items"></div>
        <div class="ci-inv-char-nav">
          <span class="ci-inv-nav-prev">◀</span>
          <span class="ci-inv-nav-dots"></span>
          <span class="ci-inv-nav-next">▶</span>
        </div>
      </div>
    `);

    const $itemsContainer = $charBox.find('.ci-inv-char-items');
    const itemsPerPage = 6; // 每页显示6个物品
    const totalPages = Math.ceil(items.length / itemsPerPage);
    let currentPage = 0;

    function renderPage(page: number) {
      $itemsContainer.empty();
      const start = page * itemsPerPage;
      const pageItems = items.slice(start, start + itemsPerPage);

      pageItems.forEach(item => {
        const $item = createItemCard(item);
        $itemsContainer.append($item);
      });

      // 更新导航点
      const $dots = $charBox.find('.ci-inv-nav-dots');
      $dots.empty();
      for (let i = 0; i < totalPages; i++) {
        $dots.append(`<span class="ci-inv-dot ${i === page ? 'active' : ''}" data-page="${i}"></span>`);
      }
    }

    renderPage(0);

    // 翻页事件
    $charBox.find('.ci-inv-nav-prev').on('click', () => {
      if (currentPage > 0) {
        currentPage--;
        renderPage(currentPage);
      }
    });

    $charBox.find('.ci-inv-nav-next').on('click', () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderPage(currentPage);
      }
    });

    $charBox.on('click', '.ci-inv-dot', function () {
      currentPage = $(this).data('page');
      renderPage(currentPage);
    });

    $charAreas.append($charBox);
  });

  // 无归属物品区域
  if (noOwnerItems.length > 0) {
    const $noOwnerBox = $(`
      <div class="ci-inv-char-box no-owner">
        <div class="ci-inv-char-header">
          <span class="ci-inv-char-name">无归属物品</span>
          <span class="ci-inv-char-count">${noOwnerItems.length}件</span>
        </div>
        <div class="ci-inv-char-items"></div>
      </div>
    `);

    const $itemsContainer = $noOwnerBox.find('.ci-inv-char-items');
    noOwnerItems.forEach(item => {
      $itemsContainer.append(createItemCard(item));
    });

    $charAreas.append($noOwnerBox);
  }

  $container.append($charAreas);
}

// 仓库视图
function renderWarehouseView($container: any, allItems: any[]) {
  // 提取物品分类
  const categories: Record<string, any[]> = { 全部: allItems };
  const currencyItems: any[] = [];

  allItems.forEach(item => {
    const type = item.type || '其他';

    // 检测货币类物品
    if (/金币|银币|铜币|货币|金钱|钱币|元|金/.test(item.name) || /货币|金钱/.test(type)) {
      currencyItems.push(item);
    }

    if (!categories[type]) categories[type] = [];
    categories[type].push(item);
  });

  // 分类标签
  const $categoryTabs = $('<div class="ci-inv-category-tabs"></div>');
  Object.keys(categories).forEach((cat, i) => {
    $categoryTabs.append(
      `<span class="ci-inv-cat-tab ${i === 0 ? 'active' : ''}" data-cat="${cat}">${cat} (${categories[cat].length})</span>`,
    );
  });

  // 货币显示区域
  const $currencyArea = $('<div class="ci-inv-currency-area"></div>');
  if (currencyItems.length > 0) {
    currencyItems.forEach(item => {
      $currencyArea.append(`
        <div class="ci-inv-currency-item">
          <span class="ci-inv-currency-icon">${ICONS.currency}</span>
          <span class="ci-inv-currency-name">${item.name}</span>
          <span class="ci-inv-currency-count">${item.count || 1}</span>
        </div>
      `);
    });
  }

  // 物品网格
  const $itemsGrid = $('<div class="ci-inv-items-grid"></div>');

  function showCategory(cat: string) {
    $itemsGrid.empty();
    const items = categories[cat] || [];
    items.forEach(item => {
      $itemsGrid.append(createItemCard(item));
    });
  }

  showCategory('全部');

  $categoryTabs.on('click', '.ci-inv-cat-tab', function () {
    $categoryTabs.find('.ci-inv-cat-tab').removeClass('active');
    $(this).addClass('active');
    showCategory($(this).data('cat'));
  });

  $container.append($currencyArea);
  $container.append($categoryTabs);
  $container.append($itemsGrid);
}

// 创建物品卡片
function createItemCard(item: any) {
  const $card = $(`
    <div class="ci-inv-item-card" data-item-name="${item.name}">
      <div class="ci-inv-item-icon">${getItemIcon(item.type)}</div>
      <div class="ci-inv-item-name">${item.name}</div>
      ${item.count > 1 ? `<div class="ci-inv-item-count">x${item.count}</div>` : ''}
    </div>
  `);

  $card.on('click', function (e) {
    e.stopPropagation();
    showItemDetail(item);
  });

  return $card;
}

// 获取物品图标
function getItemIcon(type: string): string {
  const icons: Record<string, string> = {
    武器: ICONS.weapon,
    防具: ICONS.armor,
    药品: ICONS.potion,
    食品: ICONS.food,
    材料: ICONS.material,
    货币: ICONS.currency,
    道具: ICONS.tool,
    装备: ICONS.clothing,
  };
  return icons[type] || ICONS.defaultItem;
}

// 显示物品详情弹窗
function showItemDetail(item: any) {
  dbg('[物品详情] 显示:', item.name);

  // 构建标签
  const tags: string[] = [];
  if (item.owner) tags.push(`所有人:${item.owner}`);
  if (item.type) tags.push(item.type);

  const $modal = $(`
    <div class="ci-item-detail-overlay">
      <div class="ci-item-detail-card">
        <div class="ci-item-detail-close">${ICONS.close}</div>
        <div class="ci-item-detail-header">
          <div class="ci-item-detail-icon">${getItemIcon(item.type)}</div>
          <div class="ci-item-detail-title">
            <span class="ci-item-detail-name">${item.name}</span>
            <div class="ci-item-detail-tags">
              ${tags.map(t => `<span class="ci-item-tag">${t}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="ci-item-detail-body">
          <div class="ci-item-detail-row">
            <span class="label">数量</span>
            <span class="value">${item.count || 1}</span>
          </div>
          ${item.desc ? `<div class="ci-item-detail-row"><span class="label">描述</span><span class="value">${item.desc}</span></div>` : ''}
          ${
            item.details
              ? Object.entries(item.details)
                  .map(
                    ([k, v]) =>
                      `<div class="ci-item-detail-row"><span class="label">${k}</span><span class="value">${v}</span></div>`,
                  )
                  .join('')
              : ''
          }
        </div>
      </div>
    </div>
  `);

  $modal.find('.ci-item-detail-close').on('click', () => $modal.remove());
  $modal.on('click', function (e) {
    if (e.target === this) $modal.remove();
  });

  $('body').append($modal);
}

// ========== 人物关系图渲染 ==========
function renderRelationGraph($container: any) {
  dbg('[关系图] 开始渲染人物关系图 (V4 - 优化版)');
  $container.empty();

  // 1. 准备数据
  const allChars = [...state.cachedData.main, ...state.cachedData.side, ...state.cachedData.retired];
  if (allChars.length === 0) {
    $container.html(`
      <div class="ci-relation-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;color:var(--ci-text-secondary, #999);text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;opacity:0.5;">${ICONS.relation}</div>
        <div style="font-size:14px;margin-bottom:8px;">暂无角色数据</div>
        <div style="font-size:12px;opacity:0.7;">请先在角色面板中添加角色</div>
      </div>
    `);
    return;
  }

  // 找到主角
  let protagonist = allChars.find(c => c.name && (c.name.includes('主角') || c._src?.table === '主角信息'));
  if (!protagonist && state.cachedData.main.length > 0) protagonist = state.cachedData.main[0];
  if (!protagonist) protagonist = allChars[0];

  const nodes: any[] = [];
  const links: any[] = [];
  const nodeMap = new Map();

  // 2. 创建节点并布局 (螺旋网格布局)
  nodes.push({ id: protagonist.name, data: protagonist, isProtagonist: true, x: 0, y: 0 });
  nodeMap.set(protagonist.name, nodes[0]);

  const otherChars = allChars.filter(c => c.name !== protagonist.name);
  const step = 160; // 节点间距

  otherChars.forEach((char, i) => {
    // 螺旋布局算法
    const angle = 0.6 * i;
    const r = step * (1 + 0.15 * i);

    // 强制对齐到网格
    let nx = Math.round((r * Math.cos(angle)) / step) * step;
    let ny = Math.round((r * Math.sin(angle)) / step) * step;

    // 简单的碰撞避免
    let attempts = 0;
    while (nodes.some(n => n.x === nx && n.y === ny) && attempts < 100) {
      nx += attempts % 2 === 0 ? step : -step;
      if (attempts > 10) ny += step;
      attempts++;
    }

    const node = { id: char.name, data: char, isProtagonist: false, x: nx, y: ny };
    nodes.push(node);
    nodeMap.set(char.name, node);
  });

  // 3. 解析连线
  allChars.forEach(char => {
    if (!char.relation) return;

    // 分割多个关系: "A, B" or "A，B"
    const parts = char.relation
      .split(/[,，]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s);

    parts.forEach((part: string) => {
      let targetName = protagonist.name;
      let label = part;

      // 解析 [Target]Label
      const match = part.match(/^\[(.*?)\](.*)$/);
      if (match) {
        targetName = match[1];
        // 任务5修复：保留 [XX] 显示
        label = part;
      }

      // 查找目标节点 (支持模糊匹配)
      let targetNode = nodeMap.get(targetName);
      if (!targetNode) {
        for (const [name, node] of nodeMap.entries()) {
          if (name.includes(targetName) || targetName.includes(name)) {
            targetNode = node;
            break;
          }
        }
      }

      if (targetNode && targetNode.id !== char.name) {
        links.push({
          source: char.name,
          target: targetNode.id,
          label: label,
          sourceNode: nodeMap.get(char.name),
          targetNode: targetNode,
        });
      }
    });
  });

  // 3.5 检测双向关系并标记
  links.forEach(link => {
    const reverseLink = links.find(l => l.source === link.target && l.target === link.source);
    if (reverseLink) {
      link.isBidirectional = true;
      // 简单的ID比较来决定偏移方向
      link.offsetDir = link.source < link.target ? 1 : -1;
    } else {
      link.isBidirectional = false;
      link.offsetDir = 0;
    }
  });

  // 4. 渲染 SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  const xhtmlNS = 'http://www.w3.org/1999/xhtml';

  // Task 2: 调整控制按钮位置到右上角，并优化样式
  $container.html(`
    <div class="ci-relation-controls" style="position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px;z-index:10;">
        <div class="ci-btn-circle" id="ci-rel-zoom-in" title="放大" style="width:28px;height:28px;font-size:14px;background:#fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;">${ICONS.plus}</div>
        <div class="ci-btn-circle" id="ci-rel-zoom-out" title="缩小" style="width:28px;height:28px;font-size:14px;background:#fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;">${ICONS.minus}</div>
        <div class="ci-btn-circle" id="ci-rel-fit" title="适配视图" style="width:28px;height:28px;font-size:14px;background:#fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;">${ICONS.refresh}</div>
    </div>
    <div class="ci-relation-viewport" style="width:100%;height:100%;overflow:hidden;cursor:grab;position:relative;"></div>
  `);

  const $viewport = $container.find('.ci-relation-viewport');
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';

  // 创建主分组用于缩放和平移
  const mainGroup = document.createElementNS(svgNS, 'g');
  mainGroup.setAttribute('class', 'ci-relation-main-group');
  svg.appendChild(mainGroup);

  // Task 4: 渲染顺序调整：先画线，后画节点，防止文字遮挡

  // 4.1 绘制连线 (智能折线)
  links.forEach(link => {
    const x1 = link.sourceNode.x;
    const y1 = link.sourceNode.y;
    const x2 = link.targetNode.x;
    const y2 = link.targetNode.y;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    // 判断主方向
    const isHorizontalLayout = dx > dy;

    // 双向关系偏移量
    const offset = link.isBidirectional ? link.offsetDir * 20 : 0;

    let pathD = '';
    let labelX = 0;
    let labelY = 0;
    let isLabelVertical = false;

    if (isHorizontalLayout) {
        // 横向布局：垂直-水平-垂直
        const midY = (y1 + y2) / 2 + offset;
        pathD = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
        labelX = (x1 + x2) / 2;
        labelY = midY;
        isLabelVertical = false; // 横向文字
    } else {
        // 纵向布局：水平-垂直-水平
        const midX = (x1 + x2) / 2 + offset;
        pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
        labelX = midX;
        labelY = (y1 + y2) / 2;
        isLabelVertical = true; // 竖向文字
    }

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', '#ccc');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    mainGroup.appendChild(path);

    // 标签背景
    const labelBg = document.createElementNS(svgNS, 'rect');
    const labelText = document.createElementNS(svgNS, 'text');
    labelText.textContent = link.label;
    labelText.setAttribute('x', String(labelX));
    labelText.setAttribute('y', String(labelY));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '10');
    labelText.setAttribute('fill', '#666');

    // 计算文字尺寸和背景
    const charCount = link.label.length;
    const charSize = 10;
    
    if (isLabelVertical) {
        labelText.setAttribute('style', 'writing-mode: vertical-rl; text-orientation: upright; dominant-baseline: auto;');
        labelText.setAttribute('dx', '-3');
        const textH = charCount * charSize + 6;
        const textW = 16;
        labelBg.setAttribute('x', String(labelX - textW / 2));
        labelBg.setAttribute('y', String(labelY - textH / 2));
        labelBg.setAttribute('width', String(textW));
        labelBg.setAttribute('height', String(textH));
    } else {
        labelText.setAttribute('dy', '4');
        const textW = charCount * charSize + 10;
        const textH = 16;
        labelBg.setAttribute('x', String(labelX - textW / 2));
        labelBg.setAttribute('y', String(labelY - textH / 2));
        labelBg.setAttribute('width', String(textW));
        labelBg.setAttribute('height', String(textH));
    }

    labelBg.setAttribute('rx', '4');
    labelBg.setAttribute('fill', '#fff');
    labelBg.setAttribute('stroke', '#eee');

    mainGroup.appendChild(labelBg);
    mainGroup.appendChild(labelText);
  });

  // 4.2 绘制节点
  nodes.forEach(node => {
    const nodeSize = node.isProtagonist ? 80 : 60;
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('transform', `translate(${node.x - nodeSize / 2}, ${node.y - nodeSize / 2})`);
    g.setAttribute('class', 'ci-relation-node');
    g.setAttribute('data-name', node.id);
    g.style.cursor = 'pointer';

    const fo = document.createElementNS(svgNS, 'foreignObject');
    fo.setAttribute('width', String(nodeSize));
    fo.setAttribute('height', String(nodeSize + 20));

    const div = document.createElementNS(xhtmlNS, 'div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';

    const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + node.id, '');
    const imgHtml = localImg
      ? `<img src="${localImg}" style="width:${nodeSize}px;height:${nodeSize}px;border-radius:50%;object-fit:cover;border:2px solid ${node.isProtagonist ? '#ff9800' : '#fff'};box-shadow:0 2px 5px rgba(0,0,0,0.1);">`
      : `<div style="width:${nodeSize}px;height:${nodeSize}px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:24px;color:#999;border:2px solid ${node.isProtagonist ? '#ff9800' : '#fff'};">${node.id.charAt(0)}</div>`;

    // Task 5: 性别样式区分
    let nameTagStyle = 'background:rgba(255,255,255,0.8); color:#333;';
    if (node.data && node.data.sex) {
        if (node.data.sex === '女' || node.data.sex === 'Female') {
            nameTagStyle = 'background:#fce4ec; color:#c2185b; border:1px solid #f8bbd0;'; // 粉色系
        } else if (node.data.sex === '男' || node.data.sex === 'Male') {
            nameTagStyle = 'background:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;'; // 蓝色系
        }
    }

    div.innerHTML = `
      ${imgHtml}
      <div style="font-size:12px;margin-top:4px;white-space:nowrap;padding:1px 6px;border-radius:4px;${nameTagStyle}text-shadow:none;box-shadow:0 1px 2px rgba(0,0,0,0.05);">${node.id}</div>
    `;

    fo.appendChild(div);
    g.appendChild(fo);
    mainGroup.appendChild(g);
  });

  $viewport.append(svg);

  // 5. 实现缩放和平移 (Task 3: 修复拖动失效问题)
  let scale = 1;
  let translateX = $viewport.width() / 2;
  let translateY = $viewport.height() / 2;
  
  const updateTransform = () => {
    mainGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
  };

  // 初始居中
  updateTransform();

  // 滚轮缩放
  $viewport.on('wheel', function (e: any) {
    e.preventDefault();
    const delta = e.originalEvent.deltaY;
    const zoomFactor = 0.1;
    if (delta < 0) scale *= 1 + zoomFactor;
    else scale /= 1 + zoomFactor;
    scale = Math.max(0.1, Math.min(5, scale));
    updateTransform();
  });

  // Task 3: 使用 handleDrag 通用函数来处理拖动，确保与地图拖动逻辑一致
  // 我们将拖动事件绑定到 viewport 上，而不是 svg 内部元素，这样可以确保拖动背景生效
  
  // 将 $viewport 作为 jQuery 对象传递
  let dragStartX = 0;
  let dragStartY = 0;
  let initialTranslateX = 0;
  let initialTranslateY = 0;

  handleDrag(
    $viewport,
    (startPt: any, e: any) => {
        // 如果点击的是节点，则不触发背景拖动
        if ($(e.target).closest('.ci-relation-node').length) return;
        
        $viewport.css('cursor', 'grabbing');
        dragStartX = startPt.clientX;
        dragStartY = startPt.clientY;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
        dbg('[关系图] 开始拖动');
    },
    (currPt: any, e: any) => {
        // 如果点击的是节点，则不触发背景拖动
        if ($(e.target).closest('.ci-relation-node').length) return;
        
        if (e.cancelable) e.preventDefault();
        
        const dx = currPt.clientX - dragStartX;
        const dy = currPt.clientY - dragStartY;
        
        translateX = initialTranslateX + dx;
        translateY = initialTranslateY + dy;
        
        updateTransform();
    },
    () => {
        $viewport.css('cursor', 'grab');
        dbg('[关系图] 结束拖动');
    }
  );

  // 按钮事件 - 绑定到 $container 范围内的按钮，避免选择器冲突
  $container.find('#ci-rel-zoom-in').on('click', (e: any) => {
    e.stopPropagation();
    scale *= 1.2;
    updateTransform();
    dbg('[关系图] 放大');
  });
  $container.find('#ci-rel-zoom-out').on('click', (e: any) => {
    e.stopPropagation();
    scale /= 1.2;
    updateTransform();
    dbg('[关系图] 缩小');
  });
  $container.find('#ci-rel-fit').on('click', (e: any) => {
    e.stopPropagation();
    scale = 1;
    translateX = $viewport.width() / 2;
    translateY = $viewport.height() / 2;
    updateTransform();
    dbg('[关系图] 适配视图');
  });

  // 节点点击
  $container.find('.ci-relation-node').on('click', function (e: any) {
    e.stopPropagation();
    const name = $(this).data('name');
    const char = allChars.find(c => c.name === name);
    if (char) showRelationCharDetail(char);
  });
}

// 显示角色详情弹窗（简化版）
function showRelationCharDetail(char: any) {
  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + char.name, '');
  const avatarHtml = localImg ? `<img src="${localImg}">` : char.name.charAt(0);

  const $modal = $(`
    <div class="ci-relation-detail-overlay">
      <div class="ci-relation-detail-card">
        <div class="ci-relation-detail-close">${ICONS.close}</div>
        <div class="ci-relation-detail-avatar">${avatarHtml}</div>
        <div class="ci-relation-detail-name">${char.name}</div>
        <div class="ci-relation-detail-info">
          <div class="ci-relation-detail-row"><span>性别</span><span>${char.sex || '?'}</span></div>
          <div class="ci-relation-detail-row"><span>年龄</span><span>${char.age || '?'}</span></div>
          <div class="ci-relation-detail-row"><span>职业</span><span>${char.job || '-'}</span></div>
          <div class="ci-relation-detail-row"><span>身份</span><span>${char.identity || '-'}</span></div>
          ${char.relation ? `<div class="ci-relation-detail-row"><span>关系</span><span class="ci-relation-tag">${char.relation}</span></div>` : ''}
          ${char.loc && char.loc !== '未知' ? `<div class="ci-relation-detail-row"><span>位置</span><span>${char.loc}</span></div>` : ''}
        </div>
      </div>
    </div>
  `);

  $modal.find('.ci-relation-detail-close').on('click', () => $modal.remove());
  $modal.on('click', function (e: any) {
    if (e.target === this) $modal.remove();
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

/**
 * v8.8修改2-4: 构建角色档案HTML（任务档案风格）
 * 替代原有的装备栏和物品栏，显示角色其他信息
 */
function buildCharArchiveHtml(d: any, charExtra: any): string {
  let html = '<div class="ci-nb-right ci-archive-panel">';

  // 档案内容区（可滚动）
  html += '<div class="ci-archive-content">';

  // 身体信息区块 - 任务1&2修复：统一使用block-style格式
  if ((charExtra.bodyInfo && charExtra.bodyInfo.length > 0) || charExtra.bodyNotes) {
    html += '<div class="ci-archive-section">';
    html += '<div class="ci-archive-section-title">身体特征</div>';
    html += '<div class="ci-archive-items">';
    if (charExtra.bodyInfo) {
      charExtra.bodyInfo.forEach((item: any) => {
        // 任务2修复：所有内容都使用block-style格式
        html += `<div class="ci-archive-item block-style"><span class="ci-archive-label">${item.key}</span><span class="ci-archive-value">${item.value}</span></div>`;
      });
    }
    html += '</div>';
    if (charExtra.bodyNotes) {
      html += `<div class="ci-archive-notes">${charExtra.bodyNotes}</div>`;
    }
    html += '</div>';
  }

  // 衣着信息区块 - 任务1&2修复：统一使用block-style格式
  if ((charExtra.clothing && charExtra.clothing.length > 0) || charExtra.clothingNotes) {
    html += '<div class="ci-archive-section">';
    html += '<div class="ci-archive-section-title">衣着装扮</div>';
    html += '<div class="ci-archive-items">';
    if (charExtra.clothing) {
      charExtra.clothing.forEach((item: any) => {
        // 任务2修复：所有内容都使用block-style格式
        html += `<div class="ci-archive-item block-style"><span class="ci-archive-label">${item.key}</span><span class="ci-archive-value">${item.value}</span></div>`;
      });
    }
    html += '</div>';
    if (charExtra.clothingNotes) {
      html += `<div class="ci-archive-notes">${charExtra.clothingNotes}</div>`;
    }
    html += '</div>';
  }

  // 其他信息区块（按表名分组）- 任务1&2修复：统一使用block-style格式
  if (charExtra.otherInfo && charExtra.otherInfo.length > 0) {
    charExtra.otherInfo.forEach((tableInfo: any) => {
      if (tableInfo.items && tableInfo.items.length > 0) {
        html += '<div class="ci-archive-section">';
        html += `<div class="ci-archive-section-title">${tableInfo.tableName}</div>`;
        html += '<div class="ci-archive-items ci-archive-dashed">';
        tableInfo.items.forEach((item: any) => {
          // 任务2修复：所有内容都使用block-style格式
          html += `<div class="ci-archive-item block-style"><span class="ci-archive-label">${item.label}</span><span class="ci-archive-value">${item.value}</span></div>`;
        });
        html += '</div>';
        html += '</div>';
      }
    });
  }

  // 如果没有任何额外信息，显示空状态
  if (
    (!charExtra.bodyStatus || charExtra.bodyStatus.length === 0) &&
    (!charExtra.bodyInfo || charExtra.bodyInfo.length === 0) &&
    (!charExtra.clothing || charExtra.clothing.length === 0) &&
    (!charExtra.otherInfo || charExtra.otherInfo.length === 0)
  ) {
    html += '<div class="ci-archive-empty">暂无档案信息</div>';
  }

  html += '</div>'; // .ci-archive-content
  html += '</div>'; // .ci-nb-right

  return html;
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

    // v8.8修改2-4: 获取角色额外信息，用于右侧档案显示
    const charExtra = state.cachedData.charExtraInfo?.[d.name] || {};
    const rightSideHtml = buildCharArchiveHtml(d, charExtra);

    // 任务1：将身体状态移到左侧下方
    let bodyStatusHtml = '';
    if (charExtra.bodyStatus && charExtra.bodyStatus.length > 0) {
      bodyStatusHtml = '<div class="ci-left-status-box">';
      charExtra.bodyStatus.forEach((status: any) => {
        bodyStatusHtml += `<div class="ci-left-status-item"><span class="ci-status-label">${status.label}</span><span class="ci-status-value">${status.value}</span></div>`;
      });
      bodyStatusHtml += '</div>';
    }

    // 任务5：将"特殊状态"用标签形式显示在角色卡收起状态下
    // 已经在tags变量中处理了，这里只需要确保tags变量被正确使用
    // 检查tags变量的生成逻辑
    // if (d.special)
    //   tags =
    //     `<div class="ci-tag-group">` +
    //     d.special
    //       .split(/[,，]/)
    //       .map((t: string) => `<span class="ci-tag">${t}</span>`)
    //       .join('') +
    //     `</div>`;
    // 已经在上方代码中实现了，这里不需要修改，只需要确认tags被包含在HTML中
    // 确认：${tags} 已经包含在 ci-card-compact 中

    const $card = $(
      `<div class="ci-card" id="card-${d.name}"><div class="ci-card-compact"><div class="ci-menu-trigger">${ICONS.dots}</div><div class="ci-card-menu-popover"><div class="ci-menu-item" data-move="main">主要</div><div class="ci-menu-item" data-move="side">次要</div><div class="ci-menu-item" data-move="retired">离场</div></div><div class="ci-card-avatar">${avatarHtml}</div><div class="ci-card-name">${d.name}</div><div class="ci-card-role">${d.job || d.desc || '-'}</div><div class="ci-card-info">${d.sex} · ${d.age}</div>${tags}</div><div class="ci-expanded-box" style="display:none;"><div class="ci-nb-left"><div class="ci-big-avatar-box">${avatarHtml}<div class="ci-upload-hint">点击上传</div></div><div class="ci-info-scroll"><div class="ci-detail-row"><span class="ci-label">姓名</span><span class="ci-val">${d.name}</span></div><div class="ci-detail-row"><span class="ci-label">性别</span><span class="ci-val">${d.sex}</span></div><div class="ci-detail-row"><span class="ci-label">年龄</span><span class="ci-val">${d.age}</span></div><div class="ci-detail-row"><span class="ci-label">职业</span><span class="ci-val">${d.job || '-'}</span></div><div class="ci-detail-row"><span class="ci-label">身份</span><span class="ci-val">${d.identity || '-'}</span></div>${d.loc && d.loc !== '未知' ? `<div class="ci-detail-row"><span class="ci-label">位置</span><span class="ci-val"><span style="margin-right:4px;">${ICONS.location}</span>${d.loc}</span></div>` : ''}<div class="ci-long-goal">${d.longGoal || ''}</div>${bodyStatusHtml}</div></div>${rightSideHtml}</div></div>`,
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

      // 2. 排除项：菜单项、档案区域的链接等
      if ($target.closest('.ci-menu-trigger, .ci-menu-item').length) {
        return;
      }

      // 4.5 编辑模式下点击展开的角色卡左侧或右侧，弹出编辑窗口
      if ($card.hasClass('is-expanded') && state.isEditing) {
        // 区分左侧（基本信息编辑）和右侧（档案信息编辑）
        if ($target.closest('.ci-nb-left').length) {
          e.stopPropagation();
          dbg('[角色卡] 编辑模式下点击左侧，弹出基本信息编辑弹窗');
          showCharEditDialog(d);
          return;
        }
        if ($target.closest('.ci-nb-right').length) {
          e.stopPropagation();
          dbg('[角色卡] 编辑模式下点击右侧，弹出档案信息编辑弹窗');
          showArchiveEditDialog(d);
          return;
        }
      }

      // 5. 点击展开后角色卡的空白区域，收起卡片
      if ($card.hasClass('is-expanded')) {
        // 任务4：修复点击panel空白处无法收起角色卡的问题
        // 只有点击卡片本身（即空白处）才收起，点击内部元素不收起
        // 但由于事件冒泡，点击内部元素也会触发这里，所以需要判断target
        // 如果点击的是ci-expanded-box或其子元素，且不是特定功能区，则不收起
        // 但用户反馈是点击panel空白处无法收起，这里是卡片点击事件
        // 实际上，点击panel空白处应该由panel的点击事件处理，或者这里处理点击卡片外部

        // 检查点击是否在expanded-box内部
        if ($target.closest('.ci-expanded-box').length) {
          // 如果是在expanded-box内部点击，且没有被前面的逻辑捕获（如编辑、上传等），则不做任何操作
          return;
        }

        dbg('[角色卡] 收起角色卡');
        // 重置物品栏扩展状态
        $card.find('.ci-nb-right').removeClass('full-width');
        $card.removeClass('is-expanded').find('.ci-expanded-box').hide();
        $card.find('.ci-card-compact').show();
        state.lastExpandedCardName = null;
      } else {
        // 6. 展开卡片
        dbg('[角色卡] 展开角色卡');
        $grid.find('.is-expanded').each(function () {
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
    $grid.append($card);

    // 恢复展开状态
    if (state.lastExpandedCardName === d.name) {
      $card.addClass('is-expanded').find('.ci-card-compact').hide();
      $card.find('.ci-expanded-box').css('display', 'flex');
      renderBagContent($card.find('.ci-bag-container-inner'), d);
    }
  });

  // 任务4：点击panel空白处收起角色卡
  // 绑定到grid容器上，当点击grid空白处时收起所有卡片
  $grid.off('click').on('click', function (e: any) {
    if (e.target === this) {
      dbg('[Grid] 点击空白处，收起所有卡片');
      $grid.find('.is-expanded').each(function () {
        const $c = $(this);
        $c.find('.ci-nb-right').removeClass('full-width');
        $c.removeClass('is-expanded').find('.ci-expanded-box').hide();
        $c.find('.ci-card-compact').show();
      });
      state.lastExpandedCardName = null;
    }
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

  dbg('[外部区域] 渲染外部区域, 数量:', areas?.length || 0);

  if (!areas || areas.length === 0) {
    $container.hide();
    $('.ci-split-handle').hide();
    return;
  }

  $container.show();
  $('.ci-split-handle').show();

  // 添加标题 - 参考前端美化
  const $title = $(`<div class="ci-external-title"><i class="fas fa-compass"></i> 外部区域</div>`);
  $container.append($title);

  // 添加按钮列表容器
  const $btnList = $(`<div class="ci-ext-btn-list"></div>`);

  areas.forEach((area: string) => {
    const $btn = $(`<button class="ci-ext-btn"><i class="fas fa-map-signs"></i> ${area}</button>`);
    $btn.on('click', (e: any) => {
      e.stopPropagation();
      dbg('[外部区域] 点击前往:', area);
      sendGameActionRequest(`前往 ${area}`);
    });
    $btnList.append($btn);
  });

  $container.append($btnList);

  // 添加拖动滚动功能 - 按住空白处拖动
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  $container.on('mousedown touchstart', function (e: any) {
    // 如果点击的是按钮，不触发拖动
    if ($(e.target).closest('.ci-ext-btn').length) return;

    isDragging = true;
    $container.css('cursor', 'grabbing');

    const isTouch = e.type === 'touchstart';
    const point = isTouch ? e.originalEvent.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    scrollLeft = $container.scrollLeft() || 0;
    scrollTop = $container.scrollTop() || 0;

    e.preventDefault();
  });

  $(document).on('mousemove touchmove', function (e: any) {
    if (!isDragging) return;

    const isTouch = e.type === 'touchmove';
    const point = isTouch ? e.originalEvent.touches[0] : e;
    const dx = startX - point.clientX;
    const dy = startY - point.clientY;

    $container.scrollLeft(scrollLeft + dx);
    $container.scrollTop(scrollTop + dy);
  });

  $(document).on('mouseup touchend', function () {
    if (isDragging) {
      isDragging = false;
      $container.css('cursor', 'grab');
    }
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

// ========== 地图模态弹窗功能（参考前端美化.html） ==========

/**
 * 打开地点详情气泡弹窗（无遮罩层，跟随点击位置）
 * @param loc 地点对象 { name, desc, elements }
 * @param clickEvent 点击事件，用于获取点击位置
 */
function openLocationModal(loc: any, clickEvent?: any) {
  dbg('[地图气泡] 打开地点弹窗:', loc.name);

  // 移除已存在的气泡弹窗
  $('.ci-map-bubble').remove();

  // 获取该地点的元素列表
  const locElements = (state.cachedData.mapElements || []).filter((e: any) => {
    const elLoc = String(e.location || '').trim();
    const locName = String(loc.name).trim();
    return locName.includes(elLoc) || elLoc.includes(locName);
  });

  // 构建元素列表HTML
  let elementsHtml = '';
  if (locElements.length > 0) {
    elementsHtml = `
      <div class="ci-bubble-section">
        <div class="ci-bubble-section-title">可互动元素</div>
        <div class="ci-bubble-elements">
          ${locElements
            .map(
              (el: any) => `
            <button class="ci-bubble-element-btn" data-element="${el.name}">
              <span class="ci-el-name">${el.name}</span>
              <span class="ci-el-status">(${el.status || '可互动'})</span>
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // 计算气泡位置（跟随点击位置）
  let bubbleX = 100;
  let bubbleY = 100;
  if (clickEvent) {
    bubbleX = clickEvent.clientX || clickEvent.pageX || 100;
    bubbleY = clickEvent.clientY || clickEvent.pageY || 100;
  }

  // 创建气泡弹窗（无遮罩层）
  const $bubble = $(`
    <div class="ci-map-bubble" style="left: ${bubbleX}px; top: ${bubbleY}px;">
      <div class="ci-bubble-arrow"></div>
      <div class="ci-bubble-header">
        <span class="ci-bubble-title">${loc.name}</span>
        <span class="ci-bubble-close">${ICONS.close}</span>
      </div>
      <div class="ci-bubble-body">
        <div class="ci-bubble-desc">${loc.desc || '暂无描述'}</div>
        ${elementsHtml}
      </div>
      <div class="ci-bubble-footer">
        <button class="ci-bubble-action-btn ci-go-here-btn">
          ${ICONS.location} 到这里去
        </button>
      </div>
    </div>
  `);

  // 绑定关闭事件
  $bubble.find('.ci-bubble-close').on('click', (e: any) => {
    e.stopPropagation();
    dbg('[地图气泡] 关闭地点弹窗');
    $bubble.remove();
  });

  // 阻止气泡内部点击冒泡
  $bubble.on('click', (e: any) => {
    e.stopPropagation();
  });

  // 绑定元素按钮点击事件
  $bubble.find('.ci-bubble-element-btn').on('click', function (e: any) {
    e.stopPropagation();
    const elementName = $(this).data('element');
    const element = locElements.find((el: any) => el.name === elementName);
    if (element) {
      $bubble.remove();
      openMapElementModal(element, e);
    }
  });

  // 绑定"到这里去"按钮
  $bubble.find('.ci-go-here-btn').on('click', (e: any) => {
    e.stopPropagation();
    dbg('[地图气泡] 前往地点:', loc.name);
    sendGameActionRequest(`前往 ${loc.name}`);
    $bubble.remove();
  });

  // 添加到body
  $('body').append($bubble);

  // 调整气泡位置，确保不超出屏幕
  const bubbleRect = $bubble[0].getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  let adjustedX = bubbleX;
  let adjustedY = bubbleY;

  // 水平方向调整
  if (bubbleX + bubbleRect.width > winWidth - 20) {
    adjustedX = bubbleX - bubbleRect.width - 20;
    $bubble.addClass('arrow-right');
  }
  if (adjustedX < 20) adjustedX = 20;

  // 垂直方向调整
  if (bubbleY + bubbleRect.height > winHeight - 20) {
    adjustedY = winHeight - bubbleRect.height - 20;
  }
  if (adjustedY < 20) adjustedY = 20;

  $bubble.css({ left: adjustedX, top: adjustedY });

  // 点击其他区域关闭气泡
  setTimeout(() => {
    $(document).one('click', () => {
      $bubble.remove();
    });
  }, 100);
}

/**
 * 打开元素详情气泡弹窗（无遮罩层，跟随点击位置）
 * @param el 元素对象 { name, type, desc, status, interactions }
 * @param clickEvent 点击事件，用于获取点击位置
 */
function openMapElementModal(el: any, clickEvent?: any) {
  dbg('[地图气泡] 打开元素弹窗:', el.name);

  // 移除已存在的气泡弹窗
  $('.ci-map-bubble').remove();

  // 构建互动选项HTML
  const interactions = el.interactions || [];
  let interactionsHtml = '';
  if (interactions.length > 0) {
    interactionsHtml = `
      <div class="ci-bubble-section">
        <div class="ci-bubble-section-title">互动选项</div>
        <div class="ci-bubble-interactions">
          ${interactions
            .map(
              (action: string) => `
            <button class="ci-bubble-interact-btn" data-action="${action}">
              ${action}
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // 计算气泡位置
  let bubbleX = 100;
  let bubbleY = 100;
  if (clickEvent) {
    bubbleX = clickEvent.clientX || clickEvent.pageX || 100;
    bubbleY = clickEvent.clientY || clickEvent.pageY || 100;
  }

  // 创建气泡弹窗
  const $bubble = $(`
    <div class="ci-map-bubble ci-element-bubble" style="left: ${bubbleX}px; top: ${bubbleY}px;">
      <div class="ci-bubble-arrow"></div>
      <div class="ci-bubble-header">
        <span class="ci-bubble-title">${el.name}</span>
        <span class="ci-bubble-type-tag">${el.type || '物品'}</span>
        <span class="ci-bubble-close">${ICONS.close}</span>
      </div>
      <div class="ci-bubble-body">
        <div class="ci-bubble-desc">${el.desc || '暂无描述'}</div>
        ${el.status ? `<div class="ci-bubble-status"><strong>状态:</strong> ${el.status}</div>` : ''}
        ${interactionsHtml}
      </div>
    </div>
  `);

  // 绑定关闭事件
  $bubble.find('.ci-bubble-close').on('click', (e: any) => {
    e.stopPropagation();
    dbg('[地图气泡] 关闭元素弹窗');
    $bubble.remove();
  });

  // 阻止气泡内部点击冒泡
  $bubble.on('click', (e: any) => {
    e.stopPropagation();
  });

  // 绑定互动按钮点击事件
  $bubble.find('.ci-bubble-interact-btn').on('click', function (e: any) {
    e.stopPropagation();
    const action = $(this).data('action');
    dbg('[地图气泡] 执行互动:', action);
    sendGameActionRequest(action);
    $bubble.remove();
  });

  // 添加到body
  $('body').append($bubble);

  // 调整气泡位置
  const bubbleRect = $bubble[0].getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  let adjustedX = bubbleX;
  let adjustedY = bubbleY;

  if (bubbleX + bubbleRect.width > winWidth - 20) {
    adjustedX = bubbleX - bubbleRect.width - 20;
    $bubble.addClass('arrow-right');
  }
  if (adjustedX < 20) adjustedX = 20;
  if (bubbleY + bubbleRect.height > winHeight - 20) {
    adjustedY = winHeight - bubbleRect.height - 20;
  }
  if (adjustedY < 20) adjustedY = 20;

  $bubble.css({ left: adjustedX, top: adjustedY });

  // 点击其他区域关闭气泡
  setTimeout(() => {
    $(document).one('click', () => {
      $bubble.remove();
    });
  }, 100);
}

// ========== 分隔条拖动逻辑 ==========

/**
 * 初始化地图面板分隔条拖动功能
 * 允许用户通过拖动分隔条来调整地图区域和外部区域的高度比例
 */
function initSplitHandleDrag() {
  const STORAGE_SPLIT_HEIGHT_KEY = 'ci_split_height_v1';

  const $handle = $('.ci-split-handle');
  const $mapContent = $('.ci-map-content');
  const $externalAreas = $('.ci-external-areas');

  if (!$handle.length || !$mapContent.length || !$externalAreas.length) {
    dbg('[分隔条] 未找到必要元素');
    return;
  }

  // 从localStorage恢复高度
  const savedHeight = safeGetItem(STORAGE_SPLIT_HEIGHT_KEY, '');
  if (savedHeight) {
    try {
      const height = parseInt(savedHeight);
      if (height > 30) {
        $externalAreas.css('height', height + 'px');
        dbg('[分隔条] 恢复外部区域高度:', height);
      }
    } catch (e) {
      dbg('[分隔条] 恢复高度失败:', e);
    }
  }

  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  $handle.on('mousedown touchstart', function (e: any) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    const point = e.type === 'touchstart' ? e.originalEvent.touches[0] : e;
    startY = point.clientY;
    startHeight = $externalAreas.outerHeight() || 60;

    $handle.addClass('active');
    $('body').css('cursor', 'ns-resize');

    dbg('[分隔条] 开始拖动, 起始高度:', startHeight);
  });

  $(document).on('mousemove touchmove', function (e: any) {
    if (!isDragging) return;

    const point = e.type === 'touchmove' ? e.originalEvent.touches[0] : e;
    const deltaY = startY - point.clientY; // 向上拖动增加高度
    let newHeight = startHeight + deltaY;

    // 限制最小和最大高度
    const minHeight = 40;
    const maxHeight = 300;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    $externalAreas.css('height', newHeight + 'px');
  });

  $(document).on('mouseup touchend', function () {
    if (isDragging) {
      isDragging = false;
      $handle.removeClass('active');
      $('body').css('cursor', '');

      // 保存高度到localStorage
      const finalHeight = $externalAreas.outerHeight() || 60;
      safeSetItem(STORAGE_SPLIT_HEIGHT_KEY, String(finalHeight));
      dbg('[分隔条] 结束拖动, 最终高度:', finalHeight);
    }
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

    // Bug4修复：在阻止事件之前检查是否点击了按钮
    // 如果点击的是面板按钮，不要阻止事件传播，让按钮正常处理点击
    const $target = $(e.target);
    if ($target.closest('.ci-close-btn, .ci-edit-btn, .ci-pin-btn, .ci-save-layout-btn, .ci-refresh-btn').length) {
      dbg('[拖拽] 检测到按钮点击，不启动拖拽');
      return; // 不阻止事件，让按钮正常响应
    }

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
      t.setAttribute('x', '50%');
      t.setAttribute('y', '50%');
      t.setAttribute('class', 'map-location-label');
      t.textContent = '暂无地图数据';
      $svg[0].appendChild(t);
      return;
    }
    const adjustedLocs = adjustLayout(locs);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    adjustedLocs.forEach((l: any) => {
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
    });
    const pad = 50;
    const vb = { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
    if (!state.isGlobalDragging) {
      $svg[0].setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    }
    $svg.data('vb', vb);
    const mapItems: any[] = [];
    adjustedLocs.forEach((l: any) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-location-group');
      g.addEventListener('click', e => {
        if (state.isGlobalDragging || state.isEditing) return; // 编辑模式下不触发选项
        e.stopPropagation();
        dbg('[地图位置] 点击地点:', l.name);
        // 使用模态弹窗替代简单的选项气泡
        openLocationModal(l);
      });
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', String(l.x));
      r.setAttribute('y', String(l.y));
      r.setAttribute('width', String(l.width));
      r.setAttribute('height', String(l.height));
      r.setAttribute('class', 'map-location-rect');
      r.setAttribute('rx', '8');
      r.setAttribute('fill', 'var(--map-bg)');
      r.setAttribute('stroke', 'var(--map-border)');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(l.x + l.width / 2));
      t.setAttribute('y', String(l.y + l.height / 2));
      t.setAttribute('class', 'map-location-label');
      t.setAttribute('style', 'font-size: 24px; font-weight: bold; pointer-events:none; fill:var(--map-text);');
      t.textContent = l.name;
      g.appendChild(r);
      g.appendChild(t);
      $svg[0].appendChild(g);
      const locElements = rawElements.filter((e: any) => {
        const elLoc = String(e.location || '').trim();
        const locName = String(l.name).trim();
        return locName.includes(elLoc) || elLoc.includes(locName);
      });
      const locChars = allChars.filter((c: any) => {
        const cLoc = String(c.loc || '').trim();
        const locName = String(l.name).trim();
        return locName.includes(cLoc) || cLoc.includes(locName);
      });
      const seedBase = stringHash(l.name);
      locElements.forEach((el: any, i: number) => {
        const isNPC = ['NPC', '人物', '角色', 'Enemy', 'Boss'].some(t => String(el.type).includes(t));
        const isItem = ['物品', '道具', 'Item', 'Chest'].some(t => String(el.type).includes(t));
        const defaultSize = isNPC ? 48 : isItem ? 36 : 40;

        // 优先级：1. 用户手动调整的布局 > 2. 数据库中的坐标 > 3. 随机生成
        let x: number, y: number, size: number;

        if (state.mapLayout[el.name]) {
          // 1. 用户手动调整过的布局（最高优先级）
          x = state.mapLayout[el.name].x;
          y = state.mapLayout[el.name].y;
          size = state.mapLayout[el.name].size || defaultSize;
        } else if (typeof el.x === 'number' && !isNaN(el.x) && typeof el.y === 'number' && !isNaN(el.y)) {
          // 2. 数据库中定义的坐标（相对于所属地点）
          x = l.x + el.x;
          y = l.y + el.y;
          size = typeof el.width === 'number' && !isNaN(el.width) ? el.width : defaultSize;
          dbg(`[地图元素] ${el.name} 使用数据库坐标: (${el.x}, ${el.y}) -> 绝对位置: (${x}, ${y})`);
        } else {
          // 3. 随机生成位置
          const rx = pseudoRandom(seedBase + i * 100);
          const ry = pseudoRandom(seedBase + i * 100 + 1);
          x = l.x + 10 + rx * (l.width - 20 - defaultSize);
          y = l.y + 10 + ry * (l.height - 20 - defaultSize);
          size = defaultSize;
        }

        mapItems.push({ type: 'element', data: el, size: size, x: x, y: y, parent: l, isNPC, isItem });
      });
      locChars.forEach((char: any, i: number) => {
        const defaultSize = 52;
        const rx = pseudoRandom(seedBase + i * 200 + 50);
        const ry = pseudoRandom(seedBase + i * 200 + 51);
        let x = l.x + 10 + rx * (l.width - 20 - defaultSize);
        let y = l.y + 10 + ry * (l.height - 20 - defaultSize);
        let size = defaultSize;
        if (state.mapLayout[char.name]) {
          x = state.mapLayout[char.name].x;
          y = state.mapLayout[char.name].y;
          if (state.mapLayout[char.name].size) size = state.mapLayout[char.name].size;
        }
        mapItems.push({ type: 'char', data: char, size: size, x: x, y: y, parent: l });
      });
      if (l.name === protLoc || l.name.includes(protLoc) || (protLoc && protLoc.includes(l.name))) {
        mapItems.push({
          type: 'protagonist',
          size: 52,
          x: l.x + l.width / 2 - 26,
          y: l.y + l.height / 2 - 26,
          parent: l,
        });
      }
    });
    // [Fix 5] Render ALL elements even in edit mode, just skip auto-resolve
    if (!state.isEditing) {
      resolveElementCollisions(mapItems);
    }
    mapItems.forEach(item => {
      if (item.type === 'element') {
        const el = item.data;
        const elG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        elG.setAttribute('class', 'map-element-group' + (state.isEditing ? ' draggable' : ''));
        elG.setAttribute('data-name', el.name);
        const renderInner = () => {
          while (elG.firstChild) elG.removeChild(elG.firstChild);
          if (item.isNPC) {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', String(item.x + item.size / 2));
            c.setAttribute('cy', String(item.y + item.size / 2));
            c.setAttribute('r', String(item.size / 2));
            c.setAttribute('fill', '#e0f7fa');
            c.setAttribute('stroke', '#006064');
            c.setAttribute('stroke-width', '1');
            elG.appendChild(c);
          } else {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(item.x));
            rect.setAttribute('y', String(item.y));
            rect.setAttribute('width', String(item.size));
            rect.setAttribute('height', String(item.size));
            rect.setAttribute('fill', item.isItem ? '#fff9c4' : '#f5f5f5');
            rect.setAttribute('stroke', item.isItem ? '#fbc02d' : '#9e9e9e');
            rect.setAttribute('rx', '4');
            elG.appendChild(rect);
          }
          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', String(item.x + item.size / 2));
          txt.setAttribute('y', String(item.y + item.size / 2));
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('dominant-baseline', 'middle');
          txt.setAttribute('class', 'map-element-label');
          txt.setAttribute('font-size', String(Math.max(10, item.size / 3)));
          txt.textContent = el.name;
          elG.appendChild(txt);
        };
        renderInner();
        let startClickX = 0,
          startClickY = 0;
        elG.addEventListener('mousedown', e => {
          startClickX = e.clientX;
          startClickY = e.clientY;
        });
        elG.addEventListener('click', e => {
          if (Math.abs(e.clientX - startClickX) > 5 || Math.abs(e.clientY - startClickY) > 5) return;
          if (!state.isEditing) {
            e.stopPropagation();
            dbg('[地图元素] 点击元素:', el.name);
            // 使用模态弹窗替代简单的选项气泡
            // 如果没有互动选项，生成默认选项
            if (!el.interactions || el.interactions.length === 0) {
              el.interactions = [];
              if (item.isNPC) {
                el.interactions.push(`交谈 ${el.name}`, `观察 ${el.name}`);
              } else if (item.isItem) {
                el.interactions.push(`拾取 ${el.name}`, `检查 ${el.name}`);
              } else {
                el.interactions.push(`互动 ${el.name}`);
              }
            }
            openMapElementModal(el);
          }
        });
        if (state.isEditing) {
          const $elG = $(elG);
          let startX = 0,
            startY = 0,
            initialX = item.x,
            initialY = item.y;
          handleDrag(
            $elG,
            (startPt: any) => {
              startX = startPt.clientX;
              startY = startPt.clientY;
              initialX = item.x;
              initialY = item.y;
            },
            (curr: any) => {
              const vbNow = $svg.data('vb') || { w: 800, h: 600 };
              const scaleX = vbNow.w / $svg.width();
              const scaleY = vbNow.h / $svg.height();
              const dx = (curr.clientX - startX) * scaleX;
              const dy = (curr.clientY - startY) * scaleY;
              item.x = initialX + dx;
              item.y = initialY + dy;
              renderInner();
            },
            () => {
              state.mapLayout[el.name] = { x: item.x, y: item.y, size: item.size };
              saveMapLayout();
            },
          );
          elG.addEventListener('wheel', e => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -2 : 2;
            item.size = Math.max(20, item.size + delta);
            renderInner();
            state.mapLayout[el.name] = { x: item.x, y: item.y, size: item.size };
            saveMapLayout();
          });
        }
        $svg[0].appendChild(elG);
      } else if (item.type === 'char') {
        const char = item.data;
        const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + char.name, '');
        const gAv = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const renderInner = () => {
          while (gAv.firstChild) gAv.removeChild(gAv.firstChild);
          const c = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          c.setAttribute('x', String(item.x));
          c.setAttribute('y', String(item.y));
          c.setAttribute('width', String(item.size));
          c.setAttribute('height', String(item.size));
          c.setAttribute('fill', '#fff');
          c.setAttribute('stroke', '#333');
          c.setAttribute('stroke-width', '1');
          c.setAttribute('rx', '4');
          gAv.appendChild(c);
          if (localImg) {
            const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            img.setAttribute('x', String(item.x));
            img.setAttribute('y', String(item.y));
            img.setAttribute('width', String(item.size));
            img.setAttribute('height', String(item.size));
            img.setAttribute('href', localImg);
            img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            gAv.appendChild(img);
          } else {
            const tAv = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tAv.setAttribute('x', String(item.x + item.size / 2));
            tAv.setAttribute('y', String(item.y + item.size / 2));
            tAv.setAttribute('font-size', '20');
            tAv.setAttribute('text-anchor', 'middle');
            tAv.setAttribute('dominant-baseline', 'middle');
            tAv.textContent = char.name[0];
            gAv.appendChild(tAv);
          }
        };
        renderInner();
        if (state.isEditing) {
          const $gAv = $(gAv);
          $gAv.css('cursor', 'grab');
          let startX = 0,
            startY = 0,
            initialX = item.x,
            initialY = item.y;
          handleDrag(
            $gAv,
            (startPt: any) => {
              startX = startPt.clientX;
              startY = startPt.clientY;
              initialX = item.x;
              initialY = item.y;
            },
            (curr: any) => {
              const vbNow = $svg.data('vb') || { w: 800, h: 600 };
              const scaleX = vbNow.w / $svg.width();
              const scaleY = vbNow.h / $svg.height();
              const dx = (curr.clientX - startX) * scaleX;
              const dy = (curr.clientY - startY) * scaleY;
              item.x = initialX + dx;
              item.y = initialY + dy;
              renderInner();
            },
            () => {
              state.mapLayout[char.name] = { x: item.x, y: item.y, size: item.size };
              saveMapLayout();
            },
          );
          gAv.addEventListener('wheel', e => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -2 : 2;
            item.size = Math.max(20, item.size + delta);
            renderInner();
            state.mapLayout[char.name] = { x: item.x, y: item.y, size: item.size };
            saveMapLayout();
          });
        }
        $svg[0].appendChild(gAv);
      } else if (item.type === 'protagonist') {
        const avatarUrl =
          safeGetItem(STORAGE_AVATAR_PREFIX + '主角', '') || safeGetItem(STORAGE_AVATAR_PREFIX + 'Player', '');
        const gAv = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gAv.setAttribute('class', 'protagonist-map-avatar');
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(item.x + 26));
        c.setAttribute('cy', String(item.y + 26));
        c.setAttribute('r', '30');
        c.setAttribute('class', 'pulse-wave');
        gAv.appendChild(c);
        if (avatarUrl) {
          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttribute('x', String(item.x));
          img.setAttribute('y', String(item.y));
          img.setAttribute('width', '52');
          img.setAttribute('height', '52');
          img.setAttribute('href', avatarUrl);
          gAv.appendChild(img);
        }
        $svg[0].appendChild(gAv);
      }
    });
  } catch (e) {
    console.error('Map Render Failed', e);
  }
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
        <div style="display:flex;gap:6px;align-items:center;">
          <label class="ci-switch" style="position:relative;display:inline-block;width:44px;height:24px;">
            <input type="checkbox" id="ci-map-toggle" ${mapEnabled ? 'checked' : ''} style="opacity:0;width:0;height:0;">
            <span class="ci-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${mapEnabled ? '#4caf50' : '#ccc'};transition:.3s;border-radius:24px;"></span>
          </label>
          <button id="ci-delete-map-btn" style="padding:4px 10px;font-size:11px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;transition:opacity 0.2s;" title="一键删除地图模板（保险功能）">删除</button>
        </div>
      </div>
    `);
    const $mapStatus = $(
      `<div class="ci-map-status" style="font-size:11px;padding:8px;background:rgba(0,0,0,0.03);border-radius:6px;margin-bottom:10px;"></div>`,
    );

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
    $mapToggle.find('#ci-map-toggle').on('change', async function () {
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
        if (
          confirm('确定要关闭地图功能吗？\\n\\n注意：这只会移除由浮岛自动注入的表格，不会影响您自己创建的地图表格。')
        ) {
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

    // 删除模板按钮事件
    $mapToggle
      .find('#ci-delete-map-btn')
      .on('click', async function () {
        if (
          !confirm(`⚠️ 确定要删除地图模板吗？

此操作将：
1. 从数据库模板中删除地图表格
2. 清除所有聊天的地图开关状态
3. 调用覆盖最新楼层生效

只会删除带"_浮岛地图_"标记的表格，不会影响您自己创建的表格。`)
        ) {
          return;
        }

        const $btn = $(this);
        const originalText = $btn.text();
        $btn.prop('disabled', true).text('删除中...');

        try {
          const success = await forceDeleteMapTemplate();
          if (success) {
            $mapToggle.find('#ci-map-toggle').prop('checked', false);
            $mapToggle.find('.ci-slider').css('background', '#ccc');
            updateMapStatus();
          }
        } catch (e) {
          console.error('[删除模板] 异常:', e);
          showToast('删除失败: ' + e, 'error');
        } finally {
          $btn.prop('disabled', false).text(originalText);
        }
      })
      .on('mouseover', function () {
        $(this).css('opacity', '0.8');
      })
      .on('mouseout', function () {
        $(this).css('opacity', '1');
      });

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

function saveMapLayout() {
  if (state.cachedData.mapLayout) {
    safeSetItem(STORAGE_MAP_LAYOUT_KEY, JSON.stringify(state.cachedData.mapLayout));
    showToast('地图布局已保存');
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
    dbg('[地图注入] API不可用');
    return false;
  }

  dbg('[地图注入] ========== 开始注入地图表格（V9.4最终版） ==========');

  try {
    // 步骤1: 检查是否已存在
    const existing = checkMapTablesExist();
    if (existing.hasLocation && existing.hasElement) {
      dbg('[地图注入] 地图表格已存在');
      showToast('地图表格已存在', 'error');
      return false;
    }

    // 步骤2: 生成UID和表格
    dbg('[地图注入] 使用默认模板');

    const locUid = generateTableUid();
    const elUid = generateTableUid();

    dbg('[地图注入] 生成UID:', locUid, elUid);

    const locationTable = {
      uid: locUid,
      name: '主要地点表_浮岛地图_',
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
        customStyles: {},
      },
      sourceData: {
        note: '记录当前活动层级的具体地点。\n- 列1: 地点名称 - 地点的唯一名称。\n- 列2: X坐标 - 地图左上角在800x600画布上的X轴位置。\n- 列3: Y坐标 - 地图左上角在800x600画布上的Y轴位置。\n- 列4: 宽度 - 地图在画布上的宽度。\n- 列5: 高度 - 地图在画布上的高度。\n- 列6: 环境描述 - 对该地点环境、氛围的简要文字描述。',
        initNode: '游戏初始化时，需为当前层级区域新增至少三个主要地点。在当前层级内发现新地点时添加。',
        deleteNode: '当发生地点层级深入时，原表中的地点在移至"外部区域列表"后将被删除。',
        updateNode: '地点的环境描述等信息发生变化时更新。',
        insertNode: '在当前层级内发现新地点时添加。',
      },
      content: [[null, '地点名称', 'X坐标', 'Y坐标', '宽度', '高度', '环境描述']],
      exportConfig: {
        enabled: false,
        splitByRow: false,
        entryName: '主要地点表',
        entryType: 'constant',
        keywords: '',
        preventRecursion: true,
        injectionTemplate: '',
      },
    };

    const elementTable = {
      uid: elUid,
      name: '地图元素表_浮岛地图_',
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
        customStyles: {},
      },
      sourceData: {
        note: '记录场景中可交互的实体（怪物/NPC/物品）`所属主地点`必须与主要地点表对应。\n- 列1: 元素名称 - 实体的名称。\n- 列2: 元素类型 - 分为"怪物"、"NPC"、"物品"、"载具"、"环境"等。\n- 列3: 元素描述 - 对该实体外观、特征的简要描述。\n- 列4: 所属主地点 - 该实体当前所在的"地点名称"，必须与表1中的地点对应。\n- 列5: 状态 - 实体的当前状态（如："游荡"、"可调查"、"已摧毁"）。\n- 列6-8: 互动选项 - 主角可以对该实体执行的3个具体动作。',
        initNode: '新地点创建时，必须为其添加至少一个地图元素。场景中出现新的可交互实体时添加。',
        deleteNode: '实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。',
        updateNode: '实体状态因交互改变时更新。',
        insertNode: '实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。',
      },
      content: [
        [null, '元素名称', '元素类型', '元素描述', '所属主地点', '状态', '互动选项1', '互动选项2', '互动选项3'],
      ],
      exportConfig: {
        enabled: false,
        splitByRow: false,
        entryName: '地图元素表',
        entryType: 'constant',
        keywords: '',
        preventRecursion: true,
        injectionTemplate: '',
      },
    };

    // 步骤4: 查找模板localStorage key
    dbg('[地图注入] 🔧 查找数据库模板...');

    const possibleKeys = [
      'shujuku_v70_customTemplate', // V7.0最新版本
      'shujuku_v36_customTemplate',
      'shujuku_v7_customTemplate',
      'acu_customTemplate',
    ];

    let templateKey = '';
    let templateStr = '';

    for (const key of possibleKeys) {
      const temp = localStorage.getItem(key);
      if (temp) {
        templateKey = key;
        templateStr = temp;
        dbg('[地图注入] ✅ 从', key, '读取到模板');
        break;
      }
    }

    if (!templateStr) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('customTemplate')) {
          const temp = localStorage.getItem(key);
          if (temp && temp.includes('sheet_') && temp.includes('mate')) {
            templateKey = key;
            templateStr = temp;
            dbg('[地图注入] ✅ 从', key, '读取到模板');
            break;
          }
        }
      }
    }

    if (!templateStr) {
      showToast('无法读取数据库模板', 'error');
      dbg('[地图注入] ❌ localStorage中没有找到模板');
      return false;
    }

    // 步骤5: 解析模板
    let templateData: any;
    try {
      templateData = JSON.parse(templateStr);
      const sheetCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
      dbg('[地图注入] ✅ 模板解析成功，当前表格数:', sheetCount);
    } catch (e) {
      showToast('模板解析失败', 'error');
      dbg('[地图注入] ❌ 模板解析失败:', e);
      return false;
    }

    // 步骤6: 添加新表格到模板（只保留表头，清空数据）
    const locationTableForTemplate = JSON.parse(JSON.stringify(locationTable));
    const elementTableForTemplate = JSON.parse(JSON.stringify(elementTable));

    // 模板中只保留表头
    if (locationTableForTemplate.content && locationTableForTemplate.content.length > 1) {
      locationTableForTemplate.content = [locationTableForTemplate.content[0]];
    }
    if (elementTableForTemplate.content && elementTableForTemplate.content.length > 1) {
      elementTableForTemplate.content = [elementTableForTemplate.content[0]];
    }

    templateData[locUid] = locationTableForTemplate;
    templateData[elUid] = elementTableForTemplate;

    const newSheetCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
    dbg('[地图注入] ✅ 已添加表格到模板，新表格数:', newSheetCount);

    // 步骤7: 保存模板到localStorage（关键！）
    const newTemplate = JSON.stringify(templateData);
    try {
      localStorage.setItem(templateKey, newTemplate);
      dbg('[地图注入] ✅ 已保存新模板到localStorage:', templateKey);
    } catch (e) {
      showToast('保存模板失败', 'error');
      dbg('[地图注入] ❌ 保存localStorage失败:', e);
      return false;
    }

    // 步骤8: 尝试更新全局TABLE_TEMPLATE_ACU变量（如果可访问）
    try {
      const topWindow = window.parent || window;
      if ((topWindow as any).TABLE_TEMPLATE_ACU !== undefined) {
        (topWindow as any).TABLE_TEMPLATE_ACU = newTemplate;
        dbg('[地图注入] ✅ 已更新全局TABLE_TEMPLATE_ACU变量');
      }
    } catch (e) {
      dbg('[地图注入] ⚠️ 无法访问TABLE_TEMPLATE_ACU变量（非致命）');
    }

    // 步骤9: 调用importTableAsJson（保存数据到消息）
    dbg('[地图注入] 📤 调用importTableAsJson保存数据到消息...');
    const fullData = api.exportTableAsJson();

    if (!fullData.mate) {
      fullData.mate = { type: 'chatSheets', version: 1 };
    }

    fullData[locUid] = locationTable;
    fullData[elUid] = elementTable;

    const importResult = await api.importTableAsJson(JSON.stringify(fullData));

    if (importResult === false) {
      showToast('importTableAsJson失败', 'error');
      dbg('[地图注入] ❌ importTableAsJson返回false');
      return false;
    }

    dbg('[地图注入] ✅ importTableAsJson完成');

    // 步骤10: 等待数据保存完成
    dbg('[地图注入] ⏳ 等待2500ms让importTableAsJson完成...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 步骤11: 调用overrideWithTemplate（用模板覆盖最新层，永久生效）
    dbg('[地图注入] 🔄 调用overrideWithTemplate覆盖最新楼层...');
    if (api.overrideWithTemplate) {
      try {
        const originalConfirm = window.confirm;
        window.confirm = () => true;

        await api.overrideWithTemplate();

        window.confirm = originalConfirm;

        dbg('[地图注入] ✅ overrideWithTemplate完成');
      } catch (e) {
        dbg('[地图注入] ⚠️ overrideWithTemplate失败:', e);
      }
    } else {
      dbg('[地图注入] ⚠️ overrideWithTemplate API不可用');
    }

    // 步骤12: 等待覆盖完成
    dbg('[地图注入] ⏳ 等待2500ms让overrideWithTemplate完成...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 步骤13: 验证
    dbg('[地图注入] 🔍 最终验证...');
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
      const allTables = Object.values(verifyData)
        .filter((t: any) => t?.name)
        .map((t: any) => t.name);
      dbg('[地图注入] 当前所有表格:', allTables);
      showToast('注入失败：请查看控制台', 'error');
      return false;
    }

    dbg('[地图注入] ✅✅✅ 验证成功!');

    safeSetItem(getMapEnabledKey(), 'true');
    state.cachedData = processData(verifyData);

    showToast('地图表格注入成功！');
    dbg('[地图注入] ========== 完成 ==========');

    return true;
  } catch (e) {
    console.error('[地图注入] 异常:', e);
    console.error('[地图注入] 堆栈:', (e as Error).stack);
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

  dbg('[地图移除] ========== 开始移除地图表格（V9.4.2修复幽灵数据问题） ==========');

  // 声明模板清理标记
  let templateCleaned = false;
  let dataTableRemoved = false;

  try {
    // 步骤1: 从当前数据中找到地图表格
    const fullData = api.exportTableAsJson();

    const markedKeys = Object.keys(fullData).filter(key => {
      const table = fullData[key];
      return table && table.name && table.name.includes(MAP_TABLE_MARKER);
    });

    if (markedKeys.length === 0) {
      // 不显示错误通知，因为可能是在清理幽灵数据（模板中有但数据中没有）
      dbg('[地图移除] 当前数据中没有找到带标记的表格');

      // 检查是否是幽灵数据情况
      dbg('[地图移除] 尝试查找可能的幽灵数据...');
      const allTableNames = Object.values(fullData)
        .filter((t: any) => t?.name)
        .map((t: any) => t.name);
      dbg('[地图移除] 当前所有表格名称:', allTableNames);

      // 即使没找到，也继续尝试清理模板
      dbg('[地图移除] 继续执行清理流程以移除可能的幽灵数据');
    } else {
      dbg('[地图移除] 找到', markedKeys.length, '个地图表格:', markedKeys);
      dataTableRemoved = true;
    }

    // 步骤2: 创建cleanData（删除地图表格）
    const cleanData: any = {};
    Object.keys(fullData).forEach(key => {
      const table = fullData[key];
      // 排除所有带标记的表格
      if (!markedKeys.includes(key)) {
        cleanData[key] = fullData[key];
      } else {
        dbg('[地图移除] 从数据中排除:', key, table?.name || '');
      }
    });

    if (!cleanData.mate) {
      cleanData.mate = { type: 'chatSheets', version: 1 };
    }

    const beforeCount = Object.keys(fullData).filter(k => k.startsWith('sheet_')).length;
    const afterCount = Object.keys(cleanData).filter(k => k.startsWith('sheet_')).length;
    dbg('[地图移除] 表格数变化:', beforeCount, '->', afterCount);

    // 步骤3: 调用importTableAsJson清理数据（关键！这会清理幽灵数据）
    dbg('[地图移除] 📤 调用importTableAsJson清理数据...');
    const importResult = await api.importTableAsJson(JSON.stringify(cleanData));

    if (importResult === false) {
      dbg('[地图移除] ⚠️ importTableAsJson返回false');
    } else {
      dbg('[地图移除] ✅ importTableAsJson完成');
    }

    // 步骤4: 等待处理完成
    dbg('[地图移除] ⏳ 等待2500ms让数据清理完成...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 步骤5: 从模板中删除（如果还在模板中）
    dbg('[地图移除] 🔧 检查并清理模板...');

    const possibleKeys = [
      'shujuku_v70_customTemplate', // V7.0最新版本
      'shujuku_v36_customTemplate',
      'shujuku_v7_customTemplate',
      'acu_customTemplate',
    ];

    let templateKey = '';
    let templateStr = '';

    for (const key of possibleKeys) {
      const temp = localStorage.getItem(key);
      if (temp) {
        templateKey = key;
        templateStr = temp;
        dbg('[地图移除] 从', key, '读取到模板');
        break;
      }
    }

    if (!templateStr) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('customTemplate')) {
          const temp = localStorage.getItem(key);
          if (temp && temp.includes('sheet_') && temp.includes('mate')) {
            templateKey = key;
            templateStr = temp;
            dbg('[地图移除] 从', key, '读取到模板');
            break;
          }
        }
      }
    }

    if (!templateStr) {
      dbg('[地图移除] ⚠️ localStorage中没有找到模板，跳过模板更新');
    } else {
      try {
        const templateData = JSON.parse(templateStr);
        const originalCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;

        // 查找模板中的地图表格
        const templateMarkedKeys = Object.keys(templateData).filter(key => {
          const table = templateData[key];
          return table && table.name && table.name.includes(MAP_TABLE_MARKER);
        });

        if (templateMarkedKeys.length > 0) {
          dbg('[地图移除] 模板中找到', templateMarkedKeys.length, '个地图表格');

          templateMarkedKeys.forEach(key => {
            const tableName = templateData[key]?.name || key;
            delete templateData[key];
            dbg('[地图移除] 已从模板删除:', tableName);
          });

          const newCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
          dbg('[地图移除] 模板表格数:', originalCount, '->', newCount);

          const newTemplate = JSON.stringify(templateData);
          localStorage.setItem(templateKey, newTemplate);
          dbg('[地图移除] ✅ 已保存新模板到', templateKey);

          // 尝试更新全局变量
          try {
            const topWindow = window.parent || window;
            if ((topWindow as any).TABLE_TEMPLATE_ACU !== undefined) {
              (topWindow as any).TABLE_TEMPLATE_ACU = newTemplate;
              dbg('[地图移除] ✅ 已更新全局TABLE_TEMPLATE_ACU变量');
            }
          } catch (e) {
            dbg('[地图移除] ⚠️ 无法访问TABLE_TEMPLATE_ACU变量');
          }

          templateCleaned = true;
        } else {
          dbg('[地图移除] 模板中没有地图表格（已是干净状态）');
        }
      } catch (e) {
        dbg('[地图移除] ⚠️ 更新模板失败:', e);
      }
    }

    // 步骤6: 调用overrideWithTemplate（确保模板生效，清理幽灵数据）
    dbg('[地图移除] 🔄 调用overrideWithTemplate清理最新层...');
    if (api.overrideWithTemplate) {
      try {
        const originalConfirm = window.confirm;
        window.confirm = () => true;

        await api.overrideWithTemplate();

        window.confirm = originalConfirm;

        dbg('[地图移除] ✅ overrideWithTemplate完成');
      } catch (e) {
        dbg('[地图移除] ⚠️ overrideWithTemplate失败:', e);
      }
    } else {
      dbg('[地图移除] ⚠️ overrideWithTemplate API不可用');
    }

    // 步骤7: 等待覆盖完成
    dbg('[地图移除] ⏳ 等待2500ms让覆盖完成...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 步骤8: 最终验证
    dbg('[地图移除] 🔍 验证...');
    const verifyData = api.exportTableAsJson();

    const verifyTableNames = Object.values(verifyData)
      .filter((t: any) => t?.name)
      .map((t: any) => t.name);

    dbg('[地图移除] 验证后的所有表格:', verifyTableNames);

    const stillExists = Object.values(verifyData).some(
      (table: any) => table && table.name && table.name.includes(MAP_TABLE_MARKER),
    );

    if (stillExists) {
      const remainingTables = Object.values(verifyData)
        .filter((t: any) => t?.name?.includes(MAP_TABLE_MARKER))
        .map((t: any) => t.name);
      dbg('[地图移除] ⚠️ 验证失败：仍存在地图表格:', remainingTables);
      showToast('移除失败：表格仍然存在', 'error');
      return false;
    }

    dbg('[地图移除] ✅✅✅ 验证成功！所有地图表格已完全移除');

    // 清除开关状态
    safeRemoveItem(getMapEnabledKey());
    state.cachedData = processData(verifyData);

    // 改进通知消息逻辑，区分三种情况
    if (markedKeys.length > 0) {
      // 情况1：从数据中删除了表格
      showToast(`已移除${markedKeys.length}个地图表格`);
    } else if (templateCleaned) {
      // 情况2：数据中无表格但从模板中清理了
      showToast('已清理模板中的残留地图配置');
    } else {
      // 情况3：数据和模板都已是干净状态
      showToast('地图功能已关闭');
    }
    dbg('[地图移除] ========== 完成 ==========');

    return true;
  } catch (e) {
    console.error('[地图移除] 异常:', e);
    console.error('[地图移除] 堆栈:', (e as Error).stack);
    showToast('移除失败: ' + e, 'error');
    return false;
  }
}

function isMapEnabled(): boolean {
  // 检查localStorage标记
  const stored = safeGetItem(getMapEnabledKey(), 'false');
  if (stored === 'true') return true;

  // 或者检查数据库中是否已有地图表格
  const existing = checkMapTablesExist();
  return existing.hasLocation || existing.hasElement;
}

function updateMapToggleUI() {
  const mapEnabled = isMapEnabled();
  const $toggle = $('#ci-toggle-map');

  if ($toggle.length) {
    $toggle.prop('checked', mapEnabled);
    dbg('[UI更新] 地图开关状态已更新:', mapEnabled);
  }
}

function createUI() {
  try {
    dbg('创建UI...');
    $(
      '#ci-island-container, #ci-panel, #ci-map-panel, #ci-hidden-input, #ci-map-upload, #ci-toast, .ci-options-container',
    ).remove();
    $('body').append('<input type="file" id="ci-hidden-input" accept="image/*" style="display:none">');
    $('body').append('<div id="ci-toast">角色浮岛载入成功</div>');
    // 按钮顺序：拖动手柄(0) -> 主按钮(1) -> 子按钮组(2-4) -> 世界信息(5) -> 地图(6) -> 选项(7) -> 刷新(8)
    const $con = $(`
            <div id="ci-island-container" style="z-index:2000; display:flex;">
                <div class="ci-drag-grip">${ICONS.grip}</div>
                <button class="ci-btn" id="ci-main-trigger" title="角色列表">${ICONS.user}</button>
                <div class="ci-sub-buttons">
                    <button class="ci-btn" data-type="main" title="主要人物">${ICONS.star}</button>
                    <button class="ci-btn" data-type="relation" title="人物关系">${ICONS.relation}</button>
                    <button class="ci-btn" data-type="inventory" title="物品仓库">${ICONS.inventory}</button>
                </div>
                <button class="ci-btn" id="ci-world-info-btn" title="世界信息">${ICONS.world}</button>
                <button class="ci-btn" id="ci-map-btn" title="世界地图">${ICONS.map}</button>
                <button class="ci-btn" id="ci-options-btn" title="选项">${ICONS.chat}</button>
                <button class="ci-btn" id="ci-refresh-btn" title="刷新数据">${ICONS.refresh}</button>
            </div>
        `);
    const $ops = $(`<div class="ci-options-container"></div>`);
    $('body').append($ops);
    const $pan = $(`
            <div id="ci-panel">
                <div class="ci-panel-header ci-drag-handle">
                  <span id="ci-panel-title">角色列表</span>
                  <div style="display:flex;gap:10px;">
                    <span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span>
                    <span class="ci-close-btn">${ICONS.close}</span>
                  </div>
                </div>
                <div class="ci-tab-bar">
                  <div class="ci-tab active" data-tab="main">
                    <span class="ci-tab-icon">${ICONS.star}</span>
                    <span class="ci-tab-text">主要人物</span>
                  </div>
                  <div class="ci-tab" data-tab="side">
                    <span class="ci-tab-icon">${ICONS.group}</span>
                    <span class="ci-tab-text">次要人物</span>
                  </div>
                  <div class="ci-tab" data-tab="retired">
                    <span class="ci-tab-icon">${ICONS.ghost}</span>
                    <span class="ci-tab-text">已离场</span>
                  </div>
                </div>
                <div class="ci-panel-content"><div class="ci-grid-view"></div></div>
                <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
                <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
            </div>
        `);
    const $mapPan = $(`
            <div id="ci-map-panel">
                <div class="ci-panel-header ci-drag-handle"><span>地图</span><div style="display:flex; gap:8px; align-items:center;"><span class="ci-save-layout-btn" style="display:none; cursor:pointer;" title="保存布局">${ICONS.save}</span><span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span><span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span><span class="ci-close-btn">${ICONS.close}</span></div></div>
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

    // ========== 创建三个子面板（复用ci-panel容器结构） ==========
    // 人物关系面板
    const $relationPanel = $(`
      <div id="ci-relation-panel" class="ci-panel ci-sub-panel" data-panel-type="relation">
        <div class="ci-panel-header ci-drag-handle">
          <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.relation}</span>人物关系</span>
          <div style="display:flex; gap:4px; align-items:center;">
            <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
            <span class="ci-refresh-btn" title="刷新">${ICONS.refresh}</span>
            <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
          </div>
        </div>
        <div class="ci-panel-content ci-relation-content"></div>
        <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
        <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
      </div>
    `).appendTo('body');
    dbg('[UI] 人物关系面板已创建（复用ci-panel结构）');

    // 物品仓库面板
    const $inventoryPanel = $(`
      <div id="ci-inventory-panel" class="ci-panel ci-sub-panel" data-panel-type="inventory">
        <div class="ci-panel-header ci-drag-handle">
          <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.inventory}</span>物品仓库</span>
          <div style="display:flex; gap:4px; align-items:center;">
            <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
            <span class="ci-refresh-btn" title="刷新">${ICONS.refresh}</span>
            <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
          </div>
        </div>
        <div class="ci-panel-content ci-inventory-content"></div>
        <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
        <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
      </div>
    `).appendTo('body');
    dbg('[UI] 物品仓库面板已创建（复用ci-panel结构）');

    // 世界信息面板
    const $worldInfoPanel = $(`
      <div id="ci-worldinfo-panel" class="ci-panel ci-sub-panel" data-panel-type="worldinfo">
        <div class="ci-panel-header ci-drag-handle">
          <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.world}</span>世界信息</span>
          <div style="display:flex; gap:4px; align-items:center;">
            <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
            <span class="ci-refresh-btn" title="刷新">${ICONS.refresh}</span>
            <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
          </div>
        </div>
        <div class="ci-panel-content ci-worldinfo-content"></div>
        <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
        <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
      </div>
    `).appendTo('body');
    dbg('[UI] 世界信息面板已创建（复用ci-panel结构）');

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
  // 通用关闭按钮事件
  $('body').on('click', '.ci-panel .ci-close-btn', function(e: any) {
    e.stopPropagation();
    const $panel = $(this).closest('.ci-panel, #ci-map-panel');
    $panel.removeClass('visible');
    
    const panelId = $panel.attr('id');
    const panelType = $panel.data('panel-type');
    
    dbg('[UI] 关闭面板:', panelId, panelType);
    
    if (panelId === 'ci-panel') {
       state.activeCategory = null;
       $('.ci-btn[data-type]').removeClass('active');
       // 主面板关闭不影响浮岛展开状态，只隐藏内容
    } else if (panelId === 'ci-map-panel') {
       state.isMapOpen = false;
       $('#ci-map-btn').removeClass('active');
    } else if (panelType === 'relation') {
       state.isRelationOpen = false;
       $('.ci-btn[data-type="relation"]').removeClass('active');
    } else if (panelType === 'inventory') {
       state.isInventoryOpen = false;
       $('.ci-btn[data-type="inventory"]').removeClass('active');
    } else if (panelType === 'worldinfo') {
       state.isWorldInfoOpen = false;
       $('#ci-world-info-btn').removeClass('active');
    }
  });

  // 通用图钉按钮事件
  $('body').on('click', '.ci-panel .ci-pin-btn, #ci-map-panel .ci-pin-btn', function(e: any) {
    e.stopPropagation();
    const $btn = $(this);
    const $panel = $btn.closest('.ci-panel, #ci-map-panel');
    $btn.toggleClass('active');
    $panel.toggleClass('pinned');
    
    if ($panel.is('#ci-map-panel')) {
        state.isMapPinned = $panel.hasClass('pinned');
    }
    
    showToast($panel.hasClass('pinned') ? '面板已固定' : '面板已解除固定');
  });

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
  // 主要角色按钮 - 打开三合一角色面板（包含主要/次要/已离场标签）
  $con.find('.ci-btn[data-type="main"]').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[角色按钮] 点击角色面板按钮');
    if (state.activeCategory && $pan.hasClass('visible')) {
      $pan.removeClass('visible');
      $('.ci-btn[data-type]').removeClass('active');
      state.activeCategory = null;
      return;
    }
    state.activeCategory = 'main'; // 默认显示主要人物
    state.isExpanded = true;
    $con.addClass('expanded');
    $('.ci-btn[data-type]').removeClass('active');
    $(this).addClass('active');
    // 显示标签栏，渲染当前选中的标签内容
    $pan.find('.ci-tab-bar').show();
    $pan.find('.ci-tab').removeClass('active');
    $pan.find('.ci-tab[data-tab="main"]').addClass('active');
    renderGrid('main', $pan);
    $pan.addClass('visible');
    updateHeightClass($con);
    const offset = $con.offset();
    syncPanelPosition($con, $pan, offset.left, offset.top);
  });

  // 标签切换事件（主要人物/次要人物/已离场）
  $pan.find('.ci-tab').on('click', function (e: any) {
    e.stopPropagation();
    const tab = $(this).data('tab');
    dbg('[标签切换] 切换到:', tab);
    $pan.find('.ci-tab').removeClass('active');
    $(this).addClass('active');
    state.activeCategory = tab;
    renderGrid(tab, $pan);
  });

  // 人物关系按钮 - 打开人物关系面板
  $con.find('.ci-btn[data-type="relation"]').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[人物关系] 按钮点击');

    // 获取人物关系面板
    const $relPanel = $('#ci-relation-panel');
    if ($relPanel.length === 0) {
      showToast('人物关系面板未初始化', 'error');
      return;
    }

    if (state.isRelationOpen) {
      // 已打开，关闭
      $relPanel.removeClass('visible');
      state.isRelationOpen = false;
      $(this).removeClass('active');
      dbg('[人物关系面板] 已关闭');
    } else {
      // 关闭其他面板
      $('#ci-inventory-panel').removeClass('visible');
      state.isInventoryOpen = false;
      $('.ci-btn[data-type="inventory"]').removeClass('active');

      // 打开人物关系面板
      $relPanel.addClass('visible');
      state.isRelationOpen = true;
      $(this).addClass('active');

      // 同步面板位置
      const $con = $('#ci-island-container');
      const islandLeft = parseInt($con.css('left')) || 50;
      const islandTop = parseInt($con.css('top')) || 50;
      syncPanelPosition($con, $relPanel, islandLeft, islandTop);

      // 渲染关系图
      renderRelationGraph($relPanel.find('.ci-relation-content'));
      dbg('[人物关系面板] 已打开');
    }
  });

  // 物品仓库按钮 - 打开物品仓库面板（第四阶段实现）
  $con.find('.ci-btn[data-type="inventory"]').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[物品仓库] 按钮点击');

    // 打开物品仓库面板
    const $invPanel = $('#ci-inventory-panel');
    if ($invPanel.length === 0) {
      showToast('物品仓库面板未初始化', 'error');
      return;
    }

    if (state.isInventoryOpen) {
      // 已打开则关闭
      $invPanel.removeClass('visible');
      state.isInventoryOpen = false;
      $(this).removeClass('active');
    } else {
      // 关闭其他面板
      $('#ci-relation-panel').removeClass('visible');
      state.isRelationOpen = false;
      $('.ci-btn[data-type="relation"]').removeClass('active');

      // 打开物品仓库面板
      $invPanel.addClass('visible');
      state.isInventoryOpen = true;
      $(this).addClass('active');

      // 同步面板位置
      const $con = $('#ci-island-container');
      const islandLeft = parseInt($con.css('left')) || 50;
      const islandTop = parseInt($con.css('top')) || 50;
      syncPanelPosition($con, $invPanel, islandLeft, islandTop);

      // 渲染物品内容
      renderInventoryPanel($invPanel.find('.ci-inventory-content'));
      dbg('[物品仓库面板] 已打开');
    }
  });

  // ========== 世界信息按钮点击事件 ==========
  $('#ci-world-info-btn').on('click', function (e: any) {
    e.stopPropagation();
    dbg('[世界信息按钮] 点击');

    const $worldPanel = $('#ci-worldinfo-panel');
    if ($worldPanel.length === 0) {
      showToast('世界信息面板未初始化', 'error');
      return;
    }

    if (state.isWorldInfoOpen) {
      // 已打开则关闭
      $worldPanel.removeClass('visible');
      state.isWorldInfoOpen = false;
      $(this).removeClass('active');
      dbg('[世界信息面板] 已关闭');
    } else {
      // 打开世界信息面板
      $worldPanel.addClass('visible');
      state.isWorldInfoOpen = true;
      $(this).addClass('active');

      // 同步面板位置
      const $con = $('#ci-island-container');
      const islandLeft = parseInt($con.css('left')) || 50;
      const islandTop = parseInt($con.css('top')) || 50;
      syncPanelPosition($con, $worldPanel, islandLeft, islandTop);

      // 渲染世界信息内容
      renderWorldInfoPanel($worldPanel.find('.ci-worldinfo-content'));
      dbg('[世界信息面板] 已打开');
    }
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
  $pan.find('.ci-close-btn').on('click', (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    dbg('[Bug4修复] 主面板关闭按钮点击');
    $pan.removeClass('visible');
    state.activeCategory = null;
    $('.ci-btn[data-type]').removeClass('active');
  });
  $mapPan.find('.ci-close-btn').on('click', (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    dbg('[Bug4修复] 地图面板关闭按钮点击');
    state.isMapOpen = false;
    state.isMapPinned = false;
    $mapPan.removeClass('pinned');
    $('#ci-map-btn').removeClass('active');
    $mapPan.removeClass('visible');
  });
  $pan
    .add($mapPan)
    .find('.ci-edit-btn')
    .on('click', function (e: any) {
      e.stopPropagation(); // 阻止事件冒泡，避免触发面板拖拽
      dbg('[编辑按钮] 点击，当前状态:', state.isEditing);
      state.isEditing = !state.isEditing;
      $('.ci-edit-btn').toggleClass('active', state.isEditing);
      $pan.toggleClass('ci-editing', state.isEditing);
      $mapPan.toggleClass('ci-editing', state.isEditing);
      if (state.isEditing) $('.ci-save-layout-btn').show();
      else $('.ci-save-layout-btn').hide();
      showToast(state.isEditing ? '进入编辑模式' : '退出编辑模式');
      // 进入编辑模式后重新渲染地图，确保所有元素显示
      if (state.isMapOpen) {
        dbg('[编辑模式] 重新渲染地图，编辑模式:', state.isEditing);
        renderMap();
      }
    });
  $mapPan.find('.ci-save-layout-btn').on('click', function () {
    saveMapLayout();
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

    // 其他UI元素不关闭（包括所有子面板）
    if (
      $(e.target).closest(
        '#ci-island-container, #ci-panel, #ci-map-panel, .ci-sub-panel, .ci-edit-overlay, .ci-map-popup-options, .ci-settings-overlay, .ci-settings-card',
      ).length
    )
      return;
    $('.ci-map-popup-options').remove();
    if (state.isGlobalDragging || state.drag.active) return;
    const isPanelOpen = $pan.hasClass('visible');
    const isMapOpen = state.isMapOpen;
    const isSubPanelOpen = state.isRelationOpen || state.isInventoryOpen || state.isWorldInfoOpen;

    // Task 6: 如果面板被固定（pinned），则不通过点击空白处关闭
    // 检查是否有任何可见的固定面板，如果有，不要关闭它们
    // 这里我们修改逻辑：只关闭那些没有被固定的面板
    
    if (isPanelOpen && !$pan.hasClass('pinned')) {
        // 主面板通常不固定，或者有专门的关闭逻辑
        // closePanels 会关闭所有，这可能不符合预期
        // 如果我们只想关闭非固定的，我们需要拆分 closePanels
    }
    
    // 简单的修复：如果点击发生在外部，且面板未固定，则关闭
    // 但是 closePanels 是统一关闭所有
    
    // 让我们修改逻辑：
    // 1. 选项气泡已在上面处理
    // 2. 地图弹窗已在上面处理
    
    if (isMapOpen && !state.isMapPinned) {
        $mapPan.removeClass('visible');
        state.isMapOpen = false;
        $('#ci-map-btn').removeClass('active');
    }
    
    if (state.isRelationOpen && !$('#ci-relation-panel').hasClass('pinned')) {
        $('#ci-relation-panel').removeClass('visible');
        state.isRelationOpen = false;
        $('.ci-btn[data-type="relation"]').removeClass('active');
    }
    
    if (state.isInventoryOpen && !$('#ci-inventory-panel').hasClass('pinned')) {
        $('#ci-inventory-panel').removeClass('visible');
        state.isInventoryOpen = false;
        $('.ci-btn[data-type="inventory"]').removeClass('active');
    }
    
    if (state.isWorldInfoOpen && !$('#ci-worldinfo-panel').hasClass('pinned')) {
        $('#ci-worldinfo-panel').removeClass('visible');
        state.isWorldInfoOpen = false;
        $('#ci-world-info-btn').removeClass('active');
    }
    
    // 主面板逻辑 (假设它没有固定功能，或者沿用之前的逻辑)
    if (isPanelOpen) {
         $pan.removeClass('visible');
         state.activeCategory = null;
         $('.ci-btn[data-type]').removeClass('active');
    }
    
    if (state.isExpanded && !isPanelOpen && !isMapOpen && !isSubPanelOpen) {
      collapseIsland($con);
    }
  };
  $(document).on('click', globalClickHandler);
  try {
    $(window.parent.document).on('click', globalClickHandler);
  } catch (e) {}

  // ========== Bug 2 修复：面板空白区域点击收起 ==========
  // 任务4修复：移除点击面板内部导致关闭的逻辑，只允许点击外部或关闭按钮关闭
  // 保留点击 .ci-grid 空白处关闭的功能（如果用户习惯），但移除 #ci-panel 和 .ci-panel-content
  // 用户反馈：点击ci-panel会关闭，这是错误的。
  // 所以我们只保留点击 .ci-grid (网格间隙) 关闭，或者完全移除此逻辑
  // 为了安全起见，完全移除“点击内部关闭”的逻辑，只依赖全局点击外部关闭
  $pan.on('click', function (e: any) {
    // 阻止冒泡，防止触发全局点击关闭
    // e.stopPropagation();
    // 不，如果阻止冒泡，全局点击就检测不到了。
    // 全局点击检测的是 e.target 是否在 panel 内。
    // 如果在 panel 内，全局点击 handler 会 return。
    // 所以这里不需要做任何事，只需要移除之前的“主动关闭”逻辑。
  });

  // ========== 统一处理所有子面板事件（复用ci-panel逻辑） ==========
  // 子面板关闭按钮 - 统一委托事件
  $(document).on('click', '.ci-sub-panel .ci-close-btn', function (e: any) {
    e.stopPropagation();
    e.preventDefault();
    const $panel = $(this).closest('.ci-sub-panel');
    const panelType = $panel.data('panel-type');
    dbg('[子面板] 关闭:', panelType);

    $panel.removeClass('visible');

    // 更新对应的状态
    if (panelType === 'relation') {
      state.isRelationOpen = false;
      $('.ci-btn[data-type="relation"]').removeClass('active');
      // 移除固定状态
      $('#ci-relation-panel').removeClass('pinned');
    } else if (panelType === 'inventory') {
      state.isInventoryOpen = false;
      $('.ci-btn[data-type="inventory"]').removeClass('active');
    } else if (panelType === 'worldinfo') {
      state.isWorldInfoOpen = false;
      $('#ci-world-info-btn').removeClass('active');
    }
  });

  // 子面板刷新按钮 - 统一委托事件
  $(document).on('click', '.ci-sub-panel .ci-refresh-btn', function (e: any) {
    e.stopPropagation();
    const $panel = $(this).closest('.ci-sub-panel');
    const panelType = $panel.data('panel-type');
    dbg('[子面板] 刷新:', panelType);

    if (panelType === 'relation') {
      renderRelationGraph($panel.find('.ci-relation-content'));
      showToast('关系图已刷新');
    } else if (panelType === 'inventory') {
      renderInventoryPanel($panel.find('.ci-inventory-content'));
      showToast('物品仓库已刷新');
    } else if (panelType === 'worldinfo') {
      renderWorldInfoPanel($panel.find('.ci-worldinfo-content'));
      showToast('世界信息已刷新');
    }
  });

  // 子面板图钉按钮 - 统一委托事件
  $(document).on('click', '.ci-sub-panel .ci-pin-btn', function (e: any) {
    e.stopPropagation();
    const $btn = $(this);
    const $panel = $btn.closest('.ci-sub-panel');
    const panelType = $panel.data('panel-type');
    // 切换状态
    const newPinnedState = !$btn.hasClass('active');

    $btn.toggleClass('active', newPinnedState);
    $panel.toggleClass('pinned', newPinnedState);

    showToast(newPinnedState ? '面板已固定' : '面板取消固定');

    $btn.toggleClass('active', !isPinned);
    $panel.toggleClass('pinned', !isPinned);

    dbg('[子面板] 图钉切换:', panelType, !isPinned ? '固定' : '取消固定');
    showToast(!isPinned ? '面板已固定' : '面板取消固定');
  });

  // 统一为所有子面板绑定拖拽和调整大小事件
  $('.ci-sub-panel').each(function () {
    const $subPanel = $(this);
    const $header = $subPanel.find('.ci-panel-header');

    // 拖拽事件
    let startX = 0,
      startY = 0,
      startLeft = 0,
      startTop = 0;
    handleDrag(
      $header,
      (start: any, e: any) => {
        if ($(e.target).closest('.ci-close-btn, .ci-refresh-btn, .ci-pin-btn').length) return;
        state.isGlobalDragging = true;
        startX = start.clientX;
        startY = start.clientY;
        startLeft = parseInt($subPanel.css('left'), 10) || 0;
        startTop = parseInt($subPanel.css('top'), 10) || 0;
        $subPanel.addClass('no-transition');
      },
      (curr: any, e: any) => {
        if (e.cancelable) e.preventDefault();
        requestAnimationFrame(() => {
          const deltaX = curr.clientX - startX;
          const deltaY = curr.clientY - startY;
          $subPanel.css({ left: startLeft + deltaX, top: startTop + deltaY });
        });
      },
      () => {
        $subPanel.removeClass('no-transition');
        setTimeout(() => {
          state.isGlobalDragging = false;
        }, 100);
      },
    );

    // 调整大小事件
    $subPanel.find('.ci-resize-handle').each(function () {
      const $handle = $(this);
      const mode = $handle.data('mode');
      let resStartX = 0,
        resStartY = 0,
        resStartW = 0,
        resStartH = 0,
        resStartLeft = 0;
      handleDrag(
        $handle,
        (start: any, e: any) => {
          e.stopPropagation();
          state.isGlobalDragging = true;
          resStartX = start.clientX;
          resStartY = start.clientY;
          resStartW = $subPanel.width() || 400;
          resStartH = $subPanel.height() || 600;
          resStartLeft = parseInt($subPanel.css('left'), 10) || 0;
          $subPanel.addClass('no-transition');
        },
        (curr: any, e: any) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          requestAnimationFrame(() => {
            const deltaX = curr.clientX - resStartX;
            const deltaY = curr.clientY - resStartY;
            const newH = Math.max(200, resStartH + deltaY);
            let newW = resStartW;
            if (mode === 'br') {
              newW = Math.max(250, resStartW + deltaX);
              $subPanel.css({ width: newW + 'px', height: newH + 'px' });
            } else {
              newW = Math.max(250, resStartW - deltaX);
              const newLeft = resStartLeft + (resStartW - newW);
              $subPanel.css({ width: newW + 'px', height: newH + 'px', left: newLeft + 'px' });
            }
          });
        },
        () => {
          $subPanel.removeClass('no-transition');
          setTimeout(() => {
            state.isGlobalDragging = false;
          }, 100);
        },
      );
    });
  });

  // ========== 任务3修复：子面板点击空白处关闭（非固定状态时） ==========
  // 为人物关系面板添加点击空白处关闭功能
  $(document).on('click', '#ci-relation-panel', function (e: any) {
    const $target = $(e.target);
    const $panel = $('#ci-relation-panel');

    // 如果面板已固定，不关闭
    if ($panel.hasClass('pinned')) return;

    // 如果点击的是面板本身或内容区域背景（不是SVG节点或按钮），则关闭
    if ($target.is('#ci-relation-panel') || $target.is('.ci-relation-content') || $target.is('.ci-panel-content')) {
      dbg('[任务3修复] 点击人物关系面板空白处，关闭面板');
      $panel.removeClass('visible');
      state.isRelationOpen = false;
      $('.ci-btn[data-type="relation"]').removeClass('active');
    }
  });

  // 为物品仓库面板添加点击空白处关闭功能
  $(document).on('click', '#ci-inventory-panel', function (e: any) {
    const $target = $(e.target);
    const $panel = $('#ci-inventory-panel');

    // 如果面板已固定，不关闭
    if ($panel.hasClass('pinned')) return;

    // 如果点击的是面板本身或内容区域背景
    if ($target.is('#ci-inventory-panel') || $target.is('.ci-inventory-content') || $target.is('.ci-panel-content')) {
      dbg('[任务3修复] 点击物品仓库面板空白处，关闭面板');
      $panel.removeClass('visible');
      state.isInventoryOpen = false;
      $('.ci-btn[data-type="inventory"]').removeClass('active');
    }
  });

  // 为世界信息面板添加点击空白处关闭功能
  $(document).on('click', '#ci-worldinfo-panel', function (e: any) {
    const $target = $(e.target);
    const $panel = $('#ci-worldinfo-panel');

    // 如果面板已固定，不关闭
    if ($panel.hasClass('pinned')) return;

    // 如果点击的是面板本身或内容区域背景
    if ($target.is('#ci-worldinfo-panel') || $target.is('.ci-worldinfo-content') || $target.is('.ci-panel-content')) {
      dbg('[任务3修复] 点击世界信息面板空白处，关闭面板');
      $panel.removeClass('visible');
      state.isWorldInfoOpen = false;
      $('#ci-world-info-btn').removeClass('active');
    }
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
