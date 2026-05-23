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
    console.warn('[Storage] getItem失败:', e);
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
    console.warn('[Storage] setItem失败:', e);
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
    console.warn('[Storage] removeItem失败:', e);
  }
  return false;
}

console.log(
  '%c[浮岛] 脚本加载中... (v1.2.0-20260105-024000 - Release)',
  'color: #00ff00; font-weight: bold; font-size: 16px;',
);

const ICONS = {
  grip: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 5h2v2H9V5zm4 0h2v2h-2V5zm-4 6h2v2H9v-2zm4 0h2v2h-2v-2zm-4 6h2v2H9v-2zm4 0h2v2h-2v-2z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  group: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`,
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
  history: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`,
  location: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,

  slot_head: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M12 2c-4.42 0-8 3.58-8 8v4h2v-4c0-3.31 2.69-6 6-6s6 2.69 6 6v4h2v-4c0-4.42-3.58-8-8-8z"/></svg>`,
  slot_body: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,
  slot_weapon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M7 2v11h3v9l7-12h-3V2z"/></svg>`,
  slot_acc: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,
  stickman: `<img src="https://static.wikia.nocookie.net/eldenring/images/0/00/ER_Equipment_Slot_Icon_Transparent_Body.png" style="width:100%; height:100%; opacity:0.3; object-fit:contain;">`,
  settings: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  // 人物关系图标 - 替换为原次要人物图标（3人）
  relation: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
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
  send: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
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
  { id: 'night', name: '夜间模式', color: '#000000' },
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
  storedOpacity = JSON.parse(safeGetItem(STORAGE_OPACITY_KEY, '{"main": 1, "island": 1, "map": 1}'));
} catch (e) {
  storedOpacity = { main: 1, island: 1, map: 1 };
}
if (typeof storedOpacity !== 'object' || !storedOpacity) storedOpacity = { main: 1, island: 1, map: 1 };

const state = {
  isExpanded: false,
  activeCategory: null,
  isOptionsOpen: false,
  isMapOpen: false,
  isMapPinned: false,
  isRelationOpen: false,
  isInventoryOpen: false,
  isWorldInfoOpen: false, // 世界信息面板开关
  autoRedrawRelation: safeGetItem('ci_auto_redraw_relation', 'true') === 'true', // 自动重绘人物关系图
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
      summaryHistory: [] as any[], // 总结历史记录
      outline: null as any, // 总结大纲最新条目
      matchedOutline: null as any, // 匹配的大纲内容
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
  panelSide: null as 'left' | 'right' | null, // 面板停靠方向
  panelStack: [] as string[], // 面板层级栈
};

let zIndexCounter = 2100;

function bringToFront(panelSelector: string) {
  const $panel = $(panelSelector);
  if (!$panel.length) return;

  zIndexCounter++;
  $panel.css('z-index', zIndexCounter);

  // 更新栈：移到末尾
  state.panelStack = state.panelStack.filter(id => id !== panelSelector);
  state.panelStack.push(panelSelector);
}

function openPanel(panelSelector: string) {
  const $panel = $(panelSelector);
  if (!$panel.length) return;

  // [单例显示] 如果打开的面板没有被固定，则关闭其他没有被固定的面板
  const isPanelPinned = panelSelector === '#ci-map-panel' ? state.isMapPinned : $panel.hasClass('pinned');
  if (!isPanelPinned) {
    // 关闭所有没有被固定的面板（除了当前要打开的面板）
    const pinnedPanels = [
      '#ci-panel',
      '#ci-map-panel',
      '#ci-relation-panel',
      '#ci-inventory-panel',
      '#ci-worldinfo-panel',
    ];
    pinnedPanels.forEach(selector => {
      if (selector !== panelSelector) {
        const $otherPanel = $(selector);
        if ($otherPanel.length && $otherPanel.hasClass('visible')) {
          // 检查其他面板是否被固定
          const isOtherPinned = selector === '#ci-map-panel' ? state.isMapPinned : $otherPanel.hasClass('pinned');
          if (!isOtherPinned) {
            closePanel(selector);
            // 同步移除对应浮岛按钮的激活状态
            if (selector === '#ci-panel') {
              $('.ci-btn[data-type="main"]').removeClass('active');
              state.activeCategory = null;
            } else if (selector === '#ci-map-panel') {
              $('#ci-map-btn').removeClass('active');
              state.isMapOpen = false;
            } else if (selector === '#ci-relation-panel') {
              $('.ci-btn[data-type="relation"]').removeClass('active');
              state.isRelationOpen = false;
            } else if (selector === '#ci-inventory-panel') {
              $('.ci-btn[data-type="inventory"]').removeClass('active');
              state.isInventoryOpen = false;
            } else if (selector === '#ci-worldinfo-panel') {
              $('#ci-world-info-btn').removeClass('active');
              state.isWorldInfoOpen = false;
            }
          }
        }
      }
    });
  }

  $panel.addClass('visible');
  bringToFront(panelSelector);

  // 确保位置正确 (如果是初次打开)
  const $con = $('#ci-island-container');
  const offset = $con.offset();
  syncPanelPosition($con, $panel, offset.left, offset.top);

  // 应用当前透明度设置
  applyOpacity('island', state.opacity.island);
  applyOpacity('main', state.opacity.main);
}

function closePanel(panelSelector: string) {
  const $panel = $(panelSelector);
  if (!$panel.length) return;

  $panel.removeClass('visible');
  state.panelStack = state.panelStack.filter(id => id !== panelSelector);
}

function applyOpacity(type: 'main' | 'island', val: number) {
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

function applyTheme(themeId: string) {
  state.theme = themeId;
  safeSetItem(STORAGE_THEME_KEY, themeId);
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
  } else {
    $('#ci-options-btn').removeClass('has-options').addClass('no-options');
  }

  // 显示/隐藏地图按钮（使用类控制，与选项按钮逻辑相同）
  // 地图按钮默认隐藏，有地图数据时添加 .has-map 类显示
  if (hasMap) {
    $('#ci-map-btn').addClass('has-map').removeClass('no-map');
  } else {
    $('#ci-map-btn').removeClass('has-map').addClass('no-map');
  }

  // 世界信息按钮始终显示
  $('#ci-world-info-btn').css('display', 'flex');

  // 刷新按钮始终显示
  $('#ci-refresh-btn').css('display', 'flex');

  // 不设置固定高度，使用CSS auto自适应
  // 浮岛容器的height: auto !important 会处理高度自适应
  $con.css('height', 'auto');
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
    updateOpenPanels();
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

  // 迟滞阈值：只有超过屏幕中线一定距离才切换方向
  const threshold = 50;
  const centerX = winW / 2;

  // 确定面板应该在哪一侧
  // 默认（初始）状态下，根据浮岛位置决定
  let targetSide = state.panelSide;

  if (!targetSide) {
    targetSide = islandLeft < centerX ? 'right' : 'left';
  } else {
    // 迟滞逻辑：只有当明显越过中线一定距离后才切换
    if (targetSide === 'right' && islandLeft > centerX + threshold) {
      targetSide = 'left';
    } else if (targetSide === 'left' && islandLeft < centerX - threshold) {
      targetSide = 'right';
    }
  }

  // 更新全局状态
  state.panelSide = targetSide;

  let panW = $pan.outerWidth();
  if (panW < 50) panW = 400;

  let targetLeft;
  if (targetSide === 'right') {
    // 面板在浮岛右侧 (浮岛在左)
    targetLeft = islandLeft + islandW + gap;
    if (targetLeft + panW > winW) targetLeft = winW - panW - gap;
  } else {
    // 面板在浮岛左侧 (浮岛在右)
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
  try {
    const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;

    // 步骤1: 清理当前数据中的地图表格
    if (api && api.exportTableAsJson && api.importTableAsJson) {
      const fullData = api.exportTableAsJson();
      const markedKeys = Object.keys(fullData).filter(key => {
        const table = fullData[key];
        return table && table.name && table.name.includes(MAP_TABLE_MARKER);
      });

      if (markedKeys.length > 0) {
        const cleanData: any = {};
        Object.keys(fullData).forEach(key => {
          if (!markedKeys.includes(key)) {
            cleanData[key] = fullData[key];
          }
        });

        if (!cleanData.mate) {
          cleanData.mate = { type: 'chatSheets', version: 1 };
        }

        await api.importTableAsJson(JSON.stringify(cleanData));

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

    // 步骤3: 跳过overrideWithTemplate调用（按用户要求删除）

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
      updateOpenPanels();

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
  // 处理数据隔离：参考兼容性表格9.0的逻辑
  let processedData = rawData;
  if (rawData) {
    try {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      // 检查是否启用了数据隔离
      const win = window as any;
      let ST = win.SillyTavern || (win.parent ? win.parent.SillyTavern : null);
      if (!ST && win.top && win.top.SillyTavern) ST = win.top.SillyTavern;

      if (ST && ST.chat && ST.chat.length > 0) {
        let targetMsg = null;
        // 倒序查找最新 AI 消息
        for (let i = ST.chat.length - 1; i >= 0; i--) {
          if (!ST.chat[i].is_user) {
            targetMsg = ST.chat[i];
            break;
          }
        }

        if (targetMsg && targetMsg.TavernDB_ACU_IsolatedData) {
          // 获取数据隔离Key
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
                if (settings.dataIsolationEnabled && settings.dataIsolationCode)
                  isolationKey = settings.dataIsolationCode;
              }
            }
          } catch (e) {}

          // 如果找到了隔离数据，合并到原始数据中
          if (
            isolationKey &&
            targetMsg.TavernDB_ACU_IsolatedData[isolationKey] &&
            targetMsg.TavernDB_ACU_IsolatedData[isolationKey].independentData
          ) {
            const isolatedData = targetMsg.TavernDB_ACU_IsolatedData[isolationKey].independentData;
            processedData = {
              ...parsed,
              ...isolatedData,
              mate: { type: 'chatSheets', version: 1 },
            };
            console.log('[浮岛] 使用隔离数据处理:', isolationKey);
          }
        }
      }

      // 兼容新版和旧版格式
      if (parsed.mate && parsed.mate.type === 'chatSheets') {
        processedData = parsed;
      } else if (parsed.TavernDB_ACU_IndependentData) {
        processedData = {
          ...parsed.TavernDB_ACU_IndependentData,
          mate: { type: 'chatSheets', version: 1 },
        };
      } else if (Object.keys(parsed).some(key => key.startsWith('sheet_'))) {
        processedData = {
          ...parsed,
          mate: { type: 'chatSheets', version: 1 },
        };
      }
    } catch (e) {
      console.error('[浮岛] 处理隔离数据失败:', e);
      processedData = rawData;
    }
  }

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
      summaryHistory: [] as any[], // 总结历史记录
      outline: null as any, // 总结大纲最新条目
      matchedOutline: null as any, // 匹配的大纲内容
      newsItems: [] as string[], // 滚动新闻条目
    },
    // v8.8新增：角色其他信息（按角色名索引）
    charExtraInfo: {} as Record<string, any>,
  };
  const allItems: any[] = [];
  if (!processedData) return result;
  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));
  try {
    state.optionsData = [];
    const globalTable = findTableByName(processedData, CONFIG.tables.global);
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
    Object.values(processedData).forEach((s: any) => {
      if (CONFIG.tables.protagonist === s.name) {
        const h = s.content[0] || [];
        const locIdx = getCol(h, ['主角当前所在地点', '当前位置', 'Location']);
        if (s.content[1] && locIdx > -1) {
          result.protagonistLoc = s.content[1][locIdx];
        }
      }
    });

    // 2. 从所有非地图表中搜索包含"选项"的列
    console.log('[选项提取] 开始提取选项数据...');
    Object.values(processedData).forEach((s: any) => {
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
        return;
      }

      // 搜索列名包含"选项"的列
      const h = s.content[0] || [];
      h.forEach((colName: string, colIdx: number) => {
        if (!colName) return;

        // 列名包含"选项"
        if (String(colName).includes('选项')) {
          // 遍历所有数据行提取选项内容
          s.content.slice(1).forEach((row: any) => {
            if (row && row[colIdx]) {
              const optionValue = String(row[colIdx]).trim();
              if (optionValue && !state.optionsData.includes(optionValue)) {
                state.optionsData.push(optionValue);
              }
            }
          });
        }
      });
    });

    console.log('[选项提取] 提取完成, 共', state.optionsData.length, '个选项');
    updateHeightClass($('#ci-island-container'));

    Object.values(processedData).forEach((s: any) => {
      if (!s || !s.name) return;
      // 固定表名筛选：只读取包含 '物品', '背包', '仓库', '库存' ，‘装备’的表，排除重要人物表等角色相关表格
      const isItemTable = /物品|背包|仓库|库存|装备/.test(s.name) && !/重要人物|主角信息|同伴/.test(s.name);

      const hasItemCol = s.content[0] && getCol(s.content[0], ['物品', '道具', '背包']) > -1;

      if (isItemTable || hasItemCol) {
        const h = s.content[0] || [];
        const nameIdx = getCol(h, ['名称', '名字', '物品']);
        // 关键修复：增加 '类别', '分类', 'Category'
        const typeIdx = getCol(h, ['类型', '种类', '类别', '分类', 'Category']);
        const ownerIdx = getCol(h, ['拥有者', '拥有人', '持有者', '归属', 'Owner']);
        const countIdx = getCol(h, ['数量', '个数']);
        const descIdx = getCol(h, ['描述', '效果']);

        if (nameIdx > -1) {
          s.content.slice(1).forEach((r: any, relativeIdx: number) => {
            if (!r[nameIdx]) return;
            const details: any = {};
            h.forEach((header, i) => {
              if (i !== ownerIdx && r[i]) details[header] = r[i];
            });

            // 提取原始类型字符串
            const rawType = typeIdx > -1 ? r[typeIdx] : '其他';

            allItems.push({
              name: r[nameIdx],
              owner: r[ownerIdx],
              count: countIdx > -1 ? r[countIdx] || 1 : 1,
              type: rawType, // 传递原始字符串，后续会解析分隔符
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

    Object.values(processedData).forEach((s: any) => {
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
          !['姓名', '名字', '年龄', '性别', '职业', '身份', '物品', '道具', '背包', '地点', '位置', '所在地'].some(kw =>
            col.includes(kw),
          )
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
          const colName = h[colIdx];
          if (content) {
            const parsed = parseFormattedContent(String(content));
            // 为每个提取出的条目添加来源信息
            const itemsWithSrc = parsed.labels.map(l => ({
              ...l,
              _src: { table: tableName, col: colName },
            }));
            info.bodyInfo.push(...itemsWithSrc);
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
              _src: { table: tableName, col: colName },
            });
          }
        });

        // 提取衣着信息
        clothingCols.forEach(colIdx => {
          const content = r[colIdx];
          const colName = h[colIdx];
          if (content) {
            const parsed = parseFormattedContent(String(content));
            const itemsWithSrc = parsed.labels.map(l => ({
              ...l,
              _src: { table: tableName, col: colName },
            }));
            info.clothing.push(...itemsWithSrc);
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

    Object.values(processedData).forEach((s: any) => {
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
      const isProtagTable = s.name.includes(CONFIG.tables.protagonist);
      const isImportantTable = s.name.includes(CONFIG.tables.important);
      const isCompanionTable = s.name.includes('同伴');
      if (isProtagTable || isImportantTable || isCompanionTable) {
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
          if (idx.identity > -1 && r[idx.identity] && (!identity || idx.identity !== idx.job)) {
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
            } else if (idx.sex === idx.age) {
              // 如果是同一列且没有分隔符，避免年龄显示为性别
              age = '?';
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
            else if (isCompanionTable)
              type = 'side'; // 同伴表中的角色自动归入次要人物分类
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

  // 修复：当修改姓名时，同步更新所有其他表中的姓名对应关系
  if (newData.name !== src.originName) {
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;

      const headers = sheet.content[0] || [];
      const nameColIdx = headers.findIndex(
        (h: string) => h && ['角色', '姓名', '名字', '名称'].some(n => String(h).includes(n)),
      );
      if (nameColIdx === -1) return;

      // 遍历内容行，更新所有匹配的姓名
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        const rowName = String(row[nameColIdx] || '').trim();
        if (rowName === src.originName) {
          row[nameColIdx] = newData.name;
          dbg(`[姓名同步] 更新表 ${sheet.name} 第 ${i} 行姓名: ${src.originName} -> ${newData.name}`);
        }
      }
    });
  }

  // 修复：同时保存身体状态（使用和档案编辑弹窗相同的逻辑）
  if (newData.bodyStatus && newData.bodyStatus.length > 0) {
    // 遍历所有表，找到包含该角色的所有行，更新身体状态
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;

      const tableName = sheet.name || '';
      const headers = sheet.content[0] || [];

      // 检查是否是角色相关的表（包含角色名列）
      const nameColIdx = headers.findIndex(
        (h: string) => h && ['角色', '姓名', '名字', '名称'].some(n => String(h).includes(n)),
      );
      if (nameColIdx === -1) return;

      // 遍历内容行，找到该角色的所有行
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        const rowName = String(row[nameColIdx] || '').trim();
        if (rowName !== newData.name) continue;

        dbg('[角色保存] 在表', tableName, '第', i, '行找到角色，更新身体状态');

        // 更新身体状态
        newData.bodyStatus.forEach((item: any) => {
          if (updateCellOrComposite(row, headers, item.label, item.value)) {
            dbg('[角色保存] 更新身体状态:', item.label, '->', item.value);
          }
        });
      }
    });
  }

  await performDirectInjection(fullData);
  try {
    if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
    showToast('保存成功');
    state.cachedData = processData(fullData);
    updateOpenPanels();
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

        // 更新旧版字段作为回退，确保兼容性
        if (!targetMsg.TavernDB_ACU_Data) targetMsg.TavernDB_ACU_Data = {};
        // 区分标准表和总结表 (简单起见，全部写入 Data，V5 会自行处理)
        // 这里只同步到 Data，不处理 SummaryData 的区分了，以免逻辑过于复杂

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
    updateOpenPanels();
    $('.ci-edit-overlay').remove();
  }
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
        <div class="ci-input-group" style="flex:1;min-width:80px;margin-bottom:0;" data-src-table="${s._src?.table || ''}" data-src-col="${s._src?.col || ''}">
          <label style="display:none;">${s.label}</label>
          <textarea class="ci-input-field" data-field="bodyStatus-${i}" data-label="${s.label}" rows="2">${s.value}</textarea>
        </div>`;
    });
    bodyStatusHtml += '</div></div>';
  }

  // 根据角色对象的实际字段动态生成编辑界面，只显示有内容的字段
  const editFields = [];

  // 姓名（总是显示）
  editFields.push(`
    <div class="ci-input-group">
      <label>姓名</label>
      <input class="ci-input-field" data-field="name" value="${d.name || ''}">
    </div>
  `);

  // 性别和年龄（如果有内容）
  const basicFields = [];
  if (d.sex && d.sex.trim() !== '') {
    basicFields.push(`
      <div class="ci-input-group half">
        <label>性别</label>
        <input class="ci-input-field" data-field="sex" value="${d.sex || ''}">
      </div>
    `);
  }
  if (d.age && d.age.trim() !== '') {
    basicFields.push(`
      <div class="ci-input-group half">
        <label>年龄</label>
        <input class="ci-input-field" data-field="age" value="${d.age || ''}">
      </div>
    `);
  }
  if (basicFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row">
        ${basicFields.join('')}
      </div>
    `);
  }

  // 职业和身份（如果有内容）
  const roleFields = [];
  if (d.job && d.job.trim() !== '') {
    roleFields.push(`
      <div class="ci-input-group half">
        <label>职业</label>
        <input class="ci-input-field" data-field="job" value="${d.job || ''}">
      </div>
    `);
  }
  if (d.identity && d.identity.trim() !== '') {
    roleFields.push(`
      <div class="ci-input-group half">
        <label>身份</label>
        <input class="ci-input-field" data-field="identity" value="${d.identity || ''}">
      </div>
    `);
  }
  if (roleFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row">
        ${roleFields.join('')}
      </div>
    `);
  }

  // 长期目标（如果有内容且数据存在）
  if (state.cachedData.hasLongGoal && d.longGoal && d.longGoal.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group">
        <label>长期目标</label>
        <textarea class="ci-input-field" data-field="longGoal" rows="2">${d.longGoal || ''}</textarea>
      </div>
    `);
  }

  // 身体状态（如果有内容）
  if (bodyStatusHtml) {
    editFields.push(bodyStatusHtml);
  }

  // 创建编辑弹窗
  const $overlay = $(`
    <div class="ci-char-edit-overlay ci-edit-overlay">
      <div class="ci-char-edit-card ci-edit-card" style="max-height:90vh;overflow-y:auto;max-width:95vw;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar">${avatarHtml}</div>
          <span class="ci-edit-title">编辑角色</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body">
          ${editFields.join('')}
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
    $overlay.remove();
  });

  // 点击遮罩层关闭
  $overlay.on('click', function (e: any) {
    e.stopPropagation(); // 阻止冒泡，防止触发全局点击关闭面板
    if (e.target === this) {
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
    await deleteCharData(d._src);
    $overlay.remove();
  });

  $('body').append($overlay);
}

async function saveForceData(originalForce: any, newData: any) {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }

  // 修复导入报错：确保 mate 结构存在
  if (!fullData.mate) {
    fullData.mate = { type: 'chatSheets', version: 1 };
  }

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  // 查找包含该势力的表
  let targetTable: any = null;
  let targetRowIndex = -1;

  const allTables = Object.values(fullData);
  for (const table of allTables as any[]) {
    if (!table || !table.name || !table.content || !table.content[0]) continue;

    const tableName = table.name;
    const nameLower = tableName.toLowerCase();
    if (
      nameLower.includes('组织') ||
      nameLower.includes('势力') ||
      nameLower.includes('团体') ||
      nameLower.includes('阵营') ||
      nameLower.includes('faction') ||
      nameLower.includes('group')
    ) {
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      const nameIdx = getCol(h, [
        '名称',
        '名字',
        '组织',
        '势力',
        '团体',
        '阵营',
        '组织名',
        '势力名',
        '团体名',
        '阵营名',
        'Faction',
        'Group',
      ]);

      if (nameIdx > -1) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[nameIdx] === originalForce.name) {
            targetTable = table;
            targetRowIndex = i + 1; // +1 因为rows是slice(1)后的
            break;
          }
        }
      }

      if (targetTable) break;
    }
  }

  if (!targetTable || targetRowIndex === -1) {
    showToast('未找到对应的势力数据表', 'error');
    return;
  }

  const h = targetTable.content[0] || [];
  const targetRow = targetTable.content[targetRowIndex];

  if (!targetRow) {
    showToast('未找到对应的势力数据行', 'error');
    return;
  }

  // 获取列索引
  const cols = {
    name: getCol(h, [
      '名称',
      '名字',
      '组织',
      '势力',
      '团体',
      '阵营',
      '组织名',
      '势力名',
      '团体名',
      '阵营名',
      'Faction',
      'Group',
    ]),
    leader: getCol(h, ['领袖', '首领', '领导', '头目', '负责人', 'Leader']),
    purpose: getCol(h, ['宗旨', '目的', '理念', '目标', '宗旨', 'Purpose']),
    desc: getCol(h, ['描述', '介绍', '简介', '详情', 'Description']),
  };

  // 更新基础字段
  if (cols.name > -1 && newData.name !== undefined) targetRow[cols.name] = newData.name;
  if (cols.leader > -1 && newData.leader !== undefined) targetRow[cols.leader] = newData.leader;
  if (cols.purpose > -1 && newData.purpose !== undefined) targetRow[cols.purpose] = newData.purpose;
  if (cols.desc > -1 && newData.desc !== undefined) targetRow[cols.desc] = newData.desc;

  // 更新详细信息字段
  if (newData.details) {
    Object.entries(newData.details).forEach(([key, value]) => {
      const detailIdx = h.findIndex((header: string) => header && header.toLowerCase().includes(key.toLowerCase()));
      if (detailIdx > -1) {
        targetRow[detailIdx] = value;
      }
    });
  }

  // 如果名称改变，需要同步更新所有其他表中相关的势力名称
  if (newData.name !== originalForce.name) {
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;

      const headers = sheet.content[0] || [];
      // 查找所有可能包含势力名称的列
      const forceNameCols = headers
        .map((header, idx) => ({ header, idx }))
        .filter(
          ({ header }) =>
            header &&
            (header.includes('势力') ||
              header.includes('组织') ||
              header.includes('Faction') ||
              header.includes('Group') ||
              header.includes('阵营') ||
              header.includes('团体')),
        );

      if (forceNameCols.length === 0) return;

      // 遍历内容行，更新所有匹配的势力名称
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        forceNameCols.forEach(({ header, idx }) => {
          const rowValue = String(row[idx] || '').trim();
          if (rowValue === originalForce.name) {
            row[idx] = newData.name;
            dbg(`[势力名称同步] 更新表 ${sheet.name} 第 ${i} 行 ${header}: ${originalForce.name} -> ${newData.name}`);
          }
        });
      }
    });
  }

  // 保存数据
  await performDirectInjection(fullData);
  try {
    if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
    showToast(`势力"${newData.name || originalForce.name}"保存成功`, 'success');

    // 重新提取数据并更新面板
    state.cachedData = processData(fullData);
    updateOpenPanels();
    $('.ci-edit-overlay').remove();
  } catch (e: any) {
    showToast('保存失败: ' + e.message, 'error');
    dbg('[势力保存] 保存出错:', e);
  }
}

async function saveEventData(originalTask: any, newData: any) {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }

  // 修复导入报错：确保 mate 结构存在
  if (!fullData.mate) {
    fullData.mate = { type: 'chatSheets', version: 1 };
  }

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  // 查找包含该事件的表
  let targetTable: any = null;
  let targetRowIndex = -1;

  const allTables = Object.values(fullData);
  for (const table of allTables as any[]) {
    if (!table || !table.name || !table.content || !table.content[0]) continue;

    const tableName = table.name;
    if (/任务|行程|事件|事项|事务|日志/.test(tableName)) {
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      const nameIdx = getCol(h, ['名称', '任务名', '事件名', '标题', '事项', '事务', '日志']);
      if (nameIdx > -1) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[nameIdx] === originalTask.name) {
            targetTable = table;
            targetRowIndex = i + 1; // +1 因为rows是slice(1)后的
            break;
          }
        }
      }

      if (targetTable) break;
    }
  }

  if (!targetTable || targetRowIndex === -1) {
    showToast('未找到对应的事件数据表', 'error');
    return;
  }

  const h = targetTable.content[0] || [];
  const targetRow = targetTable.content[targetRowIndex];

  if (!targetRow) {
    showToast('未找到对应的事件数据行', 'error');
    return;
  }

  // 获取列索引
  const cols = {
    name: getCol(h, ['名称', '任务名', '事件名', '标题', '事项', '事务', '日志']),
    type: getCol(h, ['类型', '种类', '分类', 'Category']),
    status: getCol(h, ['状态', '进度']),
    time: getCol(h, ['时间', '时限', '期限', '截止', '日期']),
    location: getCol(h, ['地点', '位置', '所在地', '目标地']),
    desc: getCol(h, ['描述', '内容', '详情', '说明']),
    publisher: getCol(h, ['发布', '发布人', '发布者', '发单']),
    executor: getCol(h, ['执行', '执行人', '执行者', '接单']),
    reward: getCol(h, ['奖励', '报酬', '酬劳']),
    penalty: getCol(h, ['惩罚', '惩处', '失败条件']),
  };

  // 更新基础字段
  if (cols.name > -1 && newData.name !== undefined) targetRow[cols.name] = newData.name;
  if (cols.type > -1 && newData.type !== undefined) targetRow[cols.type] = newData.type;
  if (cols.status > -1 && newData.status !== undefined) targetRow[cols.status] = newData.status;
  if (cols.time > -1 && newData.time !== undefined) targetRow[cols.time] = newData.time;
  if (cols.location > -1 && newData.location !== undefined) targetRow[cols.location] = newData.location;
  if (cols.desc > -1 && newData.desc !== undefined) targetRow[cols.desc] = newData.desc;

  // 更新可选字段
  if (cols.publisher > -1 && newData.publisher !== undefined) targetRow[cols.publisher] = newData.publisher?.val || '';
  if (cols.executor > -1 && newData.executor !== undefined) targetRow[cols.executor] = newData.executor?.val || '';
  if (cols.reward > -1 && newData.reward !== undefined) targetRow[cols.reward] = newData.reward?.val || '';
  if (cols.penalty > -1 && newData.penalty !== undefined) targetRow[cols.penalty] = newData.penalty?.val || '';

  // 保存数据
  await performDirectInjection(fullData);
  try {
    if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
    showToast(`事件"${newData.name || originalTask.name}"保存成功`, 'success');

    // 重新提取数据并更新面板
    state.cachedData = processData(fullData);
    updateOpenPanels();
    $('.ci-edit-overlay').remove();
  } catch (e: any) {
    showToast('保存失败: ' + e.message, 'error');
    dbg('[事件保存] 保存出错:', e);
  }
}

async function saveItemData(originalItem: any, newData: any) {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }

  // 修复导入报错：确保 mate 结构存在
  if (!fullData.mate) {
    fullData.mate = { type: 'chatSheets', version: 1 };
  }

  const src = originalItem._src;
  if (!src || !src.table) {
    showToast('物品源信息不完整', 'error');
    return;
  }

  // 通过表名找到对应的表对象
  let table = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }

  if (!table) {
    showToast('未找到对应的物品数据表', 'error');
    return;
  }
  const row = table.content[src.rowIdx];

  if (!row) {
    showToast('未找到对应的物品数据行', 'error');
    return;
  }

  const h = table.content[0];
  const getColIdx = (ns: string[]) => h.findIndex((x: string) => x && ns.some(n => x.includes(n)));

  const cols = {
    name: getColIdx(['名称', '名字', '物品']),
    type: getColIdx(['类型', '种类', '类别', '分类', 'Category']),
    count: getColIdx(['数量', '个数']),
    owner: getColIdx(['拥有者', '拥有人', '持有者', '归属', 'Owner']),
    desc: getColIdx(['描述', '效果']),
  };

  // 更新基础字段
  if (cols.name > -1 && newData.name !== undefined) row[cols.name] = newData.name;
  if (cols.type > -1 && newData.type !== undefined) row[cols.type] = newData.type;
  if (cols.count > -1 && newData.count !== undefined) row[cols.count] = newData.count;
  if (cols.owner > -1 && newData.owner !== undefined) row[cols.owner] = newData.owner;
  if (cols.desc > -1 && newData.desc !== undefined) row[cols.desc] = newData.desc;

  // 更新其他字段（来自details对象，排除已在上面更新的基础字段）
  if (newData.details && Object.keys(newData.details).length > 0) {
    Object.entries(newData.details).forEach(([fieldName, fieldValue]) => {
      // 为每个detail字段找到对应的列索引
      const fieldColIdx = h.findIndex((header: string) => header === fieldName);
      if (
        fieldColIdx > -1 &&
        fieldColIdx !== cols.name &&
        fieldColIdx !== cols.type &&
        fieldColIdx !== cols.count &&
        fieldColIdx !== cols.owner &&
        fieldColIdx !== cols.desc
      ) {
        row[fieldColIdx] = fieldValue;
        dbg(`[物品编辑] 更新字段 ${fieldName}: ${fieldValue}`);
      }
    });
  }

  // 如果物品名称改变，需要同步更新所有其他表中相关的物品名称
  if (newData.name !== originalItem.name) {
    Object.keys(fullData).forEach(sheetKey => {
      if (!sheetKey.startsWith('sheet_')) return;
      const sheet = fullData[sheetKey];
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;

      const headers = sheet.content[0] || [];
      // 查找所有可能包含物品名称的列
      const itemNameCols = headers
        .map((header, idx) => ({ header, idx }))
        .filter(
          ({ header }) =>
            header &&
            (header.includes('物品') ||
              header.includes('道具') ||
              header.includes('装备') ||
              header.includes('背包') ||
              header.includes('Item') ||
              header.includes('Equipment')),
        );

      if (itemNameCols.length === 0) return;

      // 遍历内容行，更新所有匹配的物品名称
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        itemNameCols.forEach(({ header, idx }) => {
          const rowValue = String(row[idx] || '').trim();
          if (rowValue === originalItem.name) {
            row[idx] = newData.name;
            dbg(`[物品名称同步] 更新表 ${sheet.name} 第 ${i} 行 ${header}: ${originalItem.name} -> ${newData.name}`);
          }
        });
      }
    });
  }

  // 保存数据
  await performDirectInjection(fullData);
  try {
    if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(fullData));
    showToast(`物品"${newData.name || originalItem.name}"保存成功`, 'success');

    // 重新提取数据并更新面板
    state.cachedData = processData(fullData);
    updateOpenPanels();
    $('.ci-edit-overlay').remove();
  } catch (e: any) {
    showToast('保存失败: ' + e.message, 'error');
    dbg('[物品保存] 保存出错:', e);
  }
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

  // 构建所有角色卡右侧内容的编辑区（除了身体状态，已移至左侧）
  let archiveEditHtml = '';

  // 身体特征编辑区
  if ((charExtra.bodyInfo && charExtra.bodyInfo.length > 0) || charExtra.bodyNotes) {
    archiveEditHtml += '<div class="ci-archive-edit-section">';
    archiveEditHtml += '<div class="ci-archive-edit-section-title">身体特征</div>';
    // 身体特征各项编辑
    archiveEditHtml += (charExtra.bodyInfo || [])
      .map(
        (item: any, idx: number) => `
        <div class="ci-archive-edit-item" data-type="bodyInfo" data-idx="${idx}" data-src-table="${item._src?.table || ''}" data-src-col="${item._src?.col || ''}">
          <input class="ci-input-field ci-archive-label-input" data-field="key" value="${item.key || ''}" placeholder="标签名">
          <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
        </div>
      `,
      )
      .join('');
    // 身体特征备注编辑（放在最后，与显示顺序一致）
    archiveEditHtml += `
      <div class="ci-archive-edit-item" data-type="bodyNotes">
        <label style="display:block; margin-bottom:4px; font-weight:bold; color:#666;">备注</label>
        <textarea class="ci-input-field ci-archive-value-input" data-field="bodyNotes" rows="3" placeholder="添加身体特征备注信息">${charExtra.bodyNotes || ''}</textarea>
      </div>
    `;
    archiveEditHtml += '</div>';
  }

  // 衣着装扮编辑区
  if (charExtra.clothing && charExtra.clothing.length > 0) {
    archiveEditHtml += '<div class="ci-archive-edit-section">';
    archiveEditHtml += '<div class="ci-archive-edit-section-title">衣着装扮</div>';
    archiveEditHtml += charExtra.clothing
      .map(
        (item: any, idx: number) => `
        <div class="ci-archive-edit-item" data-type="clothing" data-idx="${idx}" data-src-table="${item._src?.table || ''}" data-src-col="${item._src?.col || ''}">
          <input class="ci-input-field ci-archive-label-input" data-field="key" value="${item.key || ''}" placeholder="标签名">
          <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
        </div>
      `,
      )
      .join('');
    archiveEditHtml += '</div>';
  }

  // 其他信息编辑区（按表名分组）
  if (charExtra.otherInfo && charExtra.otherInfo.length > 0) {
    charExtra.otherInfo.forEach((tableInfo: any) => {
      if (tableInfo.items && tableInfo.items.length > 0) {
        archiveEditHtml += '<div class="ci-archive-edit-section">';
        archiveEditHtml += `<div class="ci-archive-edit-section-title">${tableInfo.tableName}</div>`;
        archiveEditHtml += tableInfo.items
          .map(
            (item: any, idx: number) => `
            <div class="ci-archive-edit-item" data-type="otherInfo" data-table="${tableInfo.tableName}" data-idx="${idx}" data-src-table="${item._src?.table || ''}" data-src-col="${item._src?.col || ''}">
              <input class="ci-input-field ci-archive-label-input" data-field="label" value="${item.label || ''}" placeholder="标签名">
              <textarea class="ci-input-field ci-archive-value-input" data-field="value" rows="2" placeholder="内容">${item.value || ''}</textarea>
            </div>
          `,
          )
          .join('');
        archiveEditHtml += '</div>';
      }
    });
  }

  // 创建编辑弹窗
  const $overlay = $(`
    <div class="ci-archive-edit-overlay ci-edit-overlay">
      <div class="ci-archive-edit-card ci-edit-card" style="width:90%;max-width:380px;max-height:90vh;overflow-y:auto;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar">${avatarHtml}</div>
          <span class="ci-edit-title">编辑档案 - ${d.name}</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body">
          ${
            archiveEditHtml
              ? archiveEditHtml
              : `
          <div class="ci-archive-empty-edit">
            <div style="text-align:center;color:#999;padding:30px;">
              暂无可编辑的档案信息
            </div>
          </div>
          `
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
    e.stopPropagation(); // 阻止冒泡
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
      bodyInfo: [],
      bodyNotes: '',
      clothing: [],
      otherInfo: [],
    };

    // 收集所有编辑项（按类型分组）
    $overlay.find('.ci-archive-edit-item').each(function (this: HTMLElement) {
      const $item = $(this);
      const type = $item.attr('data-type');
      const tableName = $item.attr('data-table');

      const itemData = {
        label: $item.find('[data-field="label"]').val() || $item.find('[data-field="key"]').val(),
        key: $item.find('[data-field="key"]').val() || $item.find('[data-field="label"]').val(),
        value: $item.find('[data-field="value"]').val(),
        srcTable: $item.attr('data-src-table'),
        srcCol: $item.attr('data-src-col'),
      };

      if (type === 'bodyNotes') {
        updatedData.bodyNotes = $item.find('[data-field="bodyNotes"]').val();
      } else if (type === 'bodyInfo') {
        updatedData.bodyInfo.push(itemData);
      } else if (type === 'clothing') {
        updatedData.clothing.push(itemData);
      } else if (type === 'otherInfo') {
        // 按表名分组其他信息
        let tableGroup = updatedData.otherInfo.find((t: any) => t.tableName === tableName);
        if (!tableGroup) {
          tableGroup = { tableName: tableName, items: [] };
          updatedData.otherInfo.push(tableGroup);
        }
        tableGroup.items.push(itemData);
      }
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
  const colIdx = headers.findIndex(h => h && (String(h) === key || String(h).includes(key)));
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
      // 检查 sheet.content 是否存在且有效
      if (!sheet || !sheet.content || !Array.isArray(sheet.content) || sheet.content.length < 2) return;

      const tableName = sheet.name || '';
      // 使用 content[0] 作为表头
      const headers = sheet.content[0] || [];

      // 检查是否是角色相关的表（包含角色名列）
      const nameColIdx = headers.findIndex(
        (h: string) => h && ['角色', '姓名', '名字', '名称'].some(n => String(h).includes(n)),
      );
      if (nameColIdx === -1) return;

      // 遍历内容行 (从索引1开始)
      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        const rowName = String(row[nameColIdx] || '').trim();
        if (rowName !== charName) continue;

        dbg('[档案保存] 找到角色行:', tableName, i);

        // 尝试更新所有类型的数据，不再限制表名
        // updateCellOrComposite 会自动检查列名是否匹配，如果不匹配会返回 false，不会误修改

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

        // 身体特征备注
        if (updatedData.bodyNotes && updatedData.bodyNotes.trim()) {
          // 尝试在身体特征相关的列中添加备注信息
          const bodyFeatureColIdx = headers.findIndex(
            (h: string) => h && ['特征', '身体特征', '身体部位', '部位'].some(kw => String(h).includes(kw)),
          );
          if (bodyFeatureColIdx !== -1 && row[bodyFeatureColIdx] !== undefined) {
            // 在现有内容后添加备注
            const currentContent = String(row[bodyFeatureColIdx] || '');
            const notesText = `备注：${updatedData.bodyNotes}`;
            if (currentContent && !currentContent.includes('备注：')) {
              row[bodyFeatureColIdx] = currentContent + '；' + notesText;
            } else if (!currentContent) {
              row[bodyFeatureColIdx] = notesText;
            } else {
              // 如果已有备注，替换它
              const withoutNotes = currentContent.replace(/；备注：[^；]*/, '');
              row[bodyFeatureColIdx] = withoutNotes + '；' + notesText;
            }
            dbg('[档案保存] 更新身体特征备注:', updatedData.bodyNotes);
          }
        }

        // 衣着信息
        if (updatedData.clothing && updatedData.clothing.length > 0) {
          updatedData.clothing.forEach((item: any) => {
            if (updateCellOrComposite(row, headers, item.key, item.value)) {
              dbg('[档案保存] 更新衣着信息:', item.key, '->', item.value);
            }
          });
        }

        // 其他信息
        if (updatedData.otherInfo && updatedData.otherInfo.length > 0) {
          updatedData.otherInfo.forEach((tableGroup: any) => {
            if (tableGroup.items && tableGroup.items.length > 0) {
              tableGroup.items.forEach((item: any) => {
                if (updateCellOrComposite(row, headers, item.label, item.value)) {
                  dbg('[档案保存] 更新其他信息:', item.label, '->', item.value);
                }
              });
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
      updateOpenPanels();
    }
  } catch (e) {
    console.error('[档案保存] 异常:', e);
    showToast('保存失败: ' + e, 'error');
  }
}

// ========== 赠予/拿取功能辅助函数 ==========

// --- 核心逻辑块 (V8.9.25) ---
function resetInventoryUI() {
  state.giftMode = false;
  state.takeMode = false;
  state.selectedItems = [];
  $('.ci-inv-char-box').removeClass('gift-source');
  $('.ci-inv-item-card').removeClass('selected selectable takeable');
  $('.ci-action-btn').removeClass('active');
  $('.ci-gift-middle-panel').hide();
  $('.ci-inv-content').removeClass('gift-mode take-mode');
}

function updateItemCardsForSelection($container: any, protagonistItems: any[], protagonistName: string) {
  const extractCore = (n: string) => {
    if (!n) return '';
    const m = String(n)
      .trim()
      .match(/[\(（](.+?)[\)）]/);
    return m ? m[1].trim() : String(n).trim();
  };
  const pCore = extractCore(protagonistName);

  $container.find('.ci-inv-char-box').each(function () {
    const $box = $(this);
    const ownerKey = $box.data('owner') || $box.attr('data-owner') || '';
    const isP = String(ownerKey)
      .split(';')
      .map(s => extractCore(s))
      .includes(pCore);
    const shouldApply = state.giftMode ? isP : !isP;

    if (shouldApply) {
      $box.addClass('gift-source');
      $box.find('.ci-inv-item-card').addClass('selectable');
    } else {
      $box.removeClass('gift-source');
      $box.find('.ci-inv-item-card').removeClass('selectable selected');
    }
  });
}

function createItemCard(item: any) {
  const $card = $(`
    <div class="ci-inv-item-card ${state.isEditing ? 'ci-editing' : ''}" data-item-name="${item.name}">
      <div class="ci-inv-item-icon">${getItemIcon(item.type)}</div>
      <div class="ci-inv-item-name">${item.name}</div>
      ${item.count && String(item.count) !== '1' ? `<div class="ci-inv-item-count">x${item.count}</div>` : ''}
      ${state.isEditing ? `<div class="ci-edit-overlay-small" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(76,175,80,0.2); border:2px solid #4caf50; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#2e7d32; font-size:16px; pointer-events:none;">${ICONS.edit}</div>` : ''}
    </div>
  `);

  $card.on('click', function (e: any) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    const itemName = $(this).data('item-name');

    // 1. 编辑模式
    if (state.isEditing) {
      openItemEditModal(item);
      return;
    }

    // 2. 赠予/拿取模式
    if ((state.giftMode || state.takeMode) && $(this).closest('.ci-inv-char-box').hasClass('gift-source')) {
      const idx = state.selectedItems.findIndex((i: any) => i.name === itemName);
      if (idx > -1) {
        state.selectedItems.splice(idx, 1);
        $(this).removeClass('selected');
      } else {
        const ownerKey =
          $(this).closest('.ci-inv-char-box').data('owner') || $(this).closest('.ci-inv-char-box').attr('data-owner');
        const found = (window as any).allItemsGlobal
          ? (window as any).allItemsGlobal.find(
              (i: any) => i.name === itemName && (i._normalizedOwner === ownerKey || i.owner === ownerKey),
            )
          : item;
        const targetObj = Object.assign({}, found || item);
        targetObj._confirmedOwner = ownerKey;
        state.selectedItems.push(targetObj);
        $(this).addClass('selected');
      }
      showToast(`已选择 ${state.selectedItems.length} 件物品`);
    } else {
      // 3. 正常详情模式
      showItemDetail(item, e);
    }
  });
  return $card;
}

function renderCharacterView($container: any, allItems: any[], allChars: any[]) {
  dbg('[角色持有物品视图] 开始渲染');
  (window as any).allItemsGlobal = allItems;
  $container.empty();

  const protagonistName = getProtagonistName();
  const extractCore = (n: string) => {
    const m = String(n)
      .trim()
      .match(/[\(（](.+?)[\)）]/);
    return m ? m[1].trim() : String(n).trim();
  };
  const protagonistCore = extractCore(protagonistName);

  const getNormalizedKey = (raw: string) => {
    if (!raw) return '无归属';
    const parts = raw
      .split(/[,，;；/／]/)
      .map(s => s.trim())
      .filter(s => s);
    const cores = parts.map(p => extractCore(p));
    return Array.from(new Set(cores)).sort().join(';');
  };

  const itemsByOwner: Record<string, any[]> = {};
  const noOwnerItems: any[] = [];

  allItems.forEach(item => {
    if (item.owner && item.owner.trim()) {
      const key = getNormalizedKey(item.owner);
      if (!itemsByOwner[key]) itemsByOwner[key] = [];
      if (!item._normalizedOwner) {
        Object.defineProperty(item, '_normalizedOwner', { value: key, writable: true, configurable: true });
      }
      itemsByOwner[key].push(item);
    } else {
      noOwnerItems.push(item);
    }
  });

  const protagonistItems: any[] = [];
  Object.keys(itemsByOwner).forEach(key => {
    if (key.split(';').includes(protagonistCore)) protagonistItems.push(...itemsByOwner[key]);
  });

  const $actionBar = $(`
    <div class="ci-inv-action-bar">
      <button class="ci-action-btn ci-gift-btn ${state.giftMode ? 'active' : ''}" data-action="gift">
        <span class="ci-btn-icon">${ICONS.gift}</span>
        <span class="ci-btn-text">赠予</span>
      </button>
      <div class="ci-gift-middle-panel" style="display: none; gap: 8px; align-items: center;">
        <button class="ci-tag-btn ci-gift-cancel">取消赠予</button>
        <button class="ci-tag-btn ci-gift-select">选择角色</button>
      </div>
      <button class="ci-action-btn ci-take-btn ${state.takeMode ? 'active' : ''}" data-action="take">
        <span class="ci-btn-icon">${ICONS.hand}</span>
        <span class="ci-btn-text">拿取</span>
      </button>
    </div>
  `);

  $actionBar.find('.ci-gift-btn').on('click', function (e: any) {
    e.stopPropagation();
    if (state.giftMode) {
      resetInventoryUI();
    } else {
      resetInventoryUI();
      state.giftMode = true;
      $(this).addClass('active');
      $actionBar.find('.ci-gift-middle-panel').css({ display: 'flex', opacity: 0 }).animate({ opacity: 1 }, 200);
      $container.find('.ci-inv-content').addClass('gift-mode');
      showToast('已进入赠予模式');
      updateItemCardsForSelection($container, protagonistItems, protagonistName);
    }
  });

  $actionBar.find('.ci-gift-cancel').on('click', function (e: any) {
    e.stopPropagation();
    resetInventoryUI();
  });

  $actionBar.find('.ci-gift-select').on('click', function (e: any) {
    e.stopPropagation();
    if (state.selectedItems.length === 0) {
      showToast('请先选择物品', 'error');
      return;
    }
    showCharacterSelectPopup(e, protagonistName, state.selectedItems);
  });

  $actionBar.find('.ci-take-btn').on('click', function (e: any) {
    e.stopPropagation();
    if (state.takeMode) {
      if (state.selectedItems.length > 0) {
        sendTakeActionMessage(state.selectedItems, protagonistCore);
      }
      resetInventoryUI();
    } else {
      resetInventoryUI();
      state.takeMode = true;
      $(this).addClass('active');
      // 修正：直接给容器添加类，确保 CSS 遮罩生效
      $container.addClass('take-mode');
      showToast('已进入拿取模式');
      updateItemCardsForSelection($container, [], protagonistName);
    }
  });

  $container.append($actionBar);

  // 修正：确保容器也有 ci-inv-content 类（如果原本没有）
  if (!$container.hasClass('ci-inv-content')) $container.addClass('ci-inv-content');

  const $charAreas = $('<div class="ci-inv-char-areas ci-inv-content"></div>');
  Object.keys(itemsByOwner).forEach(ownerName => {
    const items = itemsByOwner[ownerName];
    const displayName = ownerName.split(';').join('、');
    const $charBox = $(
      `<div class="ci-inv-char-box" data-owner="${ownerName}"><div class="ci-inv-char-header"><span class="ci-inv-char-name">${displayName}</span><span class="ci-inv-char-count">${items.length}件</span></div><div class="ci-inv-char-items"></div><div class="ci-inv-char-nav"><span class="ci-inv-nav-prev">◀</span><span class="ci-inv-nav-dots"></span><span class="ci-inv-nav-next">▶</span></div></div>`,
    );
    const $itemsContainer = $charBox.find('.ci-inv-char-items');
    const itemsPerPage = 15;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    let currentPage = 0;
    const renderPage = (page: number) => {
      $itemsContainer.empty();
      items
        .slice(page * itemsPerPage, (page + 1) * itemsPerPage)
        .forEach(item => $itemsContainer.append(createItemCard(item)));
      const $dots = $charBox.find('.ci-inv-nav-dots').empty();
      for (let i = 0; i < totalPages; i++)
        $dots.append(`<span class="ci-inv-dot ${i === page ? 'active' : ''}" data-page="${i}"></span>`);
    };
    renderPage(0);
    $charBox.find('.ci-inv-nav-prev').on('click', (e: any) => {
      e.stopPropagation();
      if (currentPage > 0) {
        currentPage--;
        renderPage(currentPage);
      }
    });
    $charBox.find('.ci-inv-nav-next').on('click', (e: any) => {
      e.stopPropagation();
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderPage(currentPage);
      }
    });
    $charBox.on('click', '.ci-inv-dot', function (e: any) {
      e.stopPropagation();
      currentPage = $(this).data('page');
      renderPage(currentPage);
    });
    $charAreas.append($charBox);
  });

  if (noOwnerItems.length > 0) {
    const $noOwnerBox = $(
      `<div class="ci-inv-char-box no-owner" data-owner=""><div class="ci-inv-char-header"><span class="ci-inv-char-name">无归属物品</span><span class="ci-inv-char-count">${noOwnerItems.length}件</span></div><div class="ci-inv-char-items"></div></div>`,
    );
    noOwnerItems.forEach(item => $noOwnerBox.find('.ci-inv-char-items').append(createItemCard(item)));
    $charAreas.append($noOwnerBox);
  }
  $container.append($charAreas);
}

function showItemDetail(item: any, event: any) {
  if (event) {
    if (event.stopPropagation) event.stopPropagation();
    if (event.preventDefault) event.preventDefault();
  }

  $('.ci-item-card-popup').remove();

  let tagsHtml = '';
  if (item._tags && Array.isArray(item._tags) && item._tags.length > 0) {
    tagsHtml = `<div class="ci-item-popup-tags" style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:6px;">
      ${item._tags.map((t: string) => `<span class="ci-item-tag">${t}</span>`).join('')}
    </div>`;
  }

  const $card = $(`
    <div class="ci-item-card-popup" style="
      position: fixed;
      z-index: 2147483647;
      width: 280px;
      background: #fff;
      border: 1px solid var(--ci-border);
      border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0,0,0,0.4);
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
    ">
      <div class="ci-item-popup-header">
        <div class="ci-item-popup-icon">${getItemIcon(item.type)}</div>
        <div class="ci-item-popup-title-group">
          <div class="ci-item-popup-name">${item.name}</div>
          <div class="ci-item-popup-type">${item.type || '物品'}</div>
        </div>
        <div class="ci-item-popup-close">${ICONS.close}</div>
      </div>
      <div class="ci-item-popup-body">
        ${tagsHtml}
        <div class="ci-item-popup-desc" style="white-space: pre-wrap; word-wrap: break-word;">${item.desc || '暂无描述'}</div>
        <div class="ci-item-popup-details">
          ${Object.entries(item.details || {})
            .filter(
              ([k]) =>
                !['名称', '类型', '描述', '归属', '拥有者', '数量', 'Owner', '分类', '类别', 'Category'].includes(k),
            )
            .map(
              ([k, v]) => `
              <div class="ci-item-detail-row">
                <span class="ci-item-detail-label">${k}</span>
                <span class="ci-item-detail-val" style="word-break: break-all;">${v}</span>
              </div>
            `,
            )
            .join('')}
        </div>
      </div>
      <div class="ci-item-popup-footer">
        <span>归属: ${item.owner || '未知'}</span>
        <span>数量: ${item.count || 1}</span>
      </div>
    </div>
  `);

  $('body').append($card);

  // 定位逻辑 (复刻人物关系卡片逻辑)
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const cardW = $card.outerWidth() || 280;
  const cardH = $card.outerHeight() || 300;

  // 优先使用 clientX/Y，兼容触摸
  let clientX = event.clientX;
  let clientY = event.clientY;
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length > 0) {
    clientX = event.originalEvent.touches[0].clientX;
    clientY = event.originalEvent.touches[0].clientY;
  }

  let l = clientX;
  let d = clientY;

  // 右侧溢出 -> 放左边
  if (l + cardW > winW - 10) {
    l = clientX - cardW;
  }
  // 底部溢出 -> 放上边
  if (d + cardH > winH - 10) {
    d = clientY - cardH;
  }

  // 最小边距
  if (l < 10) l = 10;
  if (d < 10) d = 10;

  $card.css({
    left: l + 'px',
    top: d + 'px',
    opacity: 1,
  });

  $card.find('.ci-item-popup-close').on('click', function (e: any) {
    e.stopPropagation();
    $card.remove();
  });
}

function openItemEditModal(item: any) {
  $('.ci-item-edit-overlay').remove();

  // 根据物品对象的实际字段动态生成编辑界面，只显示有内容的字段
  const editFields = [];

  // 物品名称（总是显示）
  editFields.push(`
    <div class="ci-input-group" style="margin-bottom:12px;">
      <label class="ci-input-label">物品名称</label>
      <input class="ci-input-field" data-field="name" value="${item.name || ''}">
    </div>
  `);

  // 类型/分类和数量（如果有内容）
  const typeCountFields = [];
  if (item.type && item.type.trim() !== '') {
    typeCountFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">类型/分类</label>
        <input class="ci-input-field" data-field="type" value="${item.type || ''}">
      </div>
    `);
  }
  if (item.count !== undefined && item.count !== null && item.count !== '') {
    typeCountFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">数量</label>
        <input class="ci-input-field" data-field="count" type="text" value="${item.count || 1}">
      </div>
    `);
  }
  if (typeCountFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row" style="display:flex; gap:12px; margin-bottom:12px;">
        ${typeCountFields.join('')}
      </div>
    `);
  }

  // 归属/拥有者（如果有内容）
  if (item.owner && item.owner.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">归属/拥有者</label>
        <input class="ci-input-field" data-field="owner" value="${item.owner || ''}">
      </div>
    `);
  }

  // 描述/效果（如果有内容）
  if (item.desc && item.desc.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">描述/效果</label>
        <textarea class="ci-input-field" data-field="desc" rows="3">${item.desc || ''}</textarea>
      </div>
    `);
  }

  // 其他字段（来自details对象，排除已在上面显示的基础字段）
  if (item.details && Object.keys(item.details).length > 0) {
    const excludeFields = [
      '名称',
      '名字',
      '物品',
      '类型',
      '种类',
      '类别',
      '分类',
      'Category',
      '描述',
      '效果',
      '归属',
      '拥有者',
      '数量',
      '个数',
      'Owner',
    ];

    Object.entries(item.details).forEach(([key, value]) => {
      if (!excludeFields.includes(key) && value !== undefined && value !== null && String(value).trim() !== '') {
        editFields.push(`
          <div class="ci-input-group" style="margin-bottom:12px;">
            <label class="ci-input-label">${key}</label>
            <textarea class="ci-input-field" data-field="detail-${key}" rows="2" placeholder="输入${key}">${value || ''}</textarea>
          </div>
        `);
      }
    });
  }

  const $overlay = $(`
    <div class="ci-item-edit-overlay ci-edit-overlay">
      <div class="ci-item-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.inventory}</div>
          <span class="ci-edit-title">编辑物品</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1;">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer" style="padding:16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
          <button class="ci-edit-save-btn">${ICONS.save} 提交修改</button>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-edit-save-btn').on('click', async () => {
    const newData: any = {
      name: $overlay.find('[data-field="name"]').val(),
      type: $overlay.find('[data-field="type"]').val(),
      count: $overlay.find('[data-field="count"]').val(),
      owner: $overlay.find('[data-field="owner"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      details: {},
    };

    // 收集所有detail字段
    $overlay.find('[data-field^="detail-"]').each(function () {
      const fieldName = $(this).data('field').replace('detail-', '');
      const fieldValue = $(this).val();
      if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
        newData.details[fieldName] = fieldValue;
      }
    });

    await saveItemData(item, newData);
    $overlay.remove();
  });
}

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

// 显示角色选择弹窗 (气泡式，V8.9 Fix)
/**
 * 获取在场角色名单
 */
function getPresentCharacterList(): Set<string> {
  const presentSet = new Set<string>();
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson) return presentSet;

  const data = api.exportTableAsJson();
  if (!data) return presentSet;

  Object.values(data).forEach((table: any) => {
    if (table && table.name && table.name.includes('全局数据')) {
      const headers = table.content[0] || [];
      const rows = table.content.slice(1);

      const colIndices = headers.reduce((acc: number[], h: string, i: number) => {
        if (h && (h.includes('姓名') || h.includes('在场角色'))) acc.push(i);
        return acc;
      }, []);

      rows.forEach((row: any) => {
        colIndices.forEach((idx: number) => {
          const val = row[idx];
          if (val) {
            val.split(/[,，;；/／]/).forEach((s: string) => {
              const name = s.trim();
              if (name) presentSet.add(name);
            });
          }
        });
      });
    }
  });
  return presentSet;
}

/**
 * 生成拿取动作的消息描述并发送到输入框
 */
function sendTakeActionMessage(items: any[], protagonistCore: string) {
  if (items.length === 0) return;
  const itemNames = items.map(i => i.name).join('、');
  const firstItem = items[0];

  // 使用点选时绑定的归属者
  const ownerKey = firstItem._confirmedOwner || firstItem._normalizedOwner || '';
  const presentNames = getPresentCharacterList();

  let message = '';
  if (ownerKey && ownerKey !== '无归属') {
    const parts = ownerKey.split(';');
    const isPresent = parts.every(n => presentNames.has(n));
    const allChars = [...state.cachedData.main, ...state.cachedData.side];

    // 寻找代表性的角色
    const ownerChar = allChars.find(c => c.name.includes(parts[0]) || parts[0].includes(c.name));
    const pronoun = ownerChar ? getPronounByChar(ownerChar) : '他';
    const location = ownerChar && ownerChar.loc && ownerChar.loc !== '未知' ? ownerChar.loc.trim() : null;

    if (isPresent) {
      message = `${protagonistCore}向${parts.join('、')}索要了${itemNames}。`;
    } else if (location) {
      message = `${protagonistCore}去${location}向${parts.join('、')}索要了${itemNames}。`;
    } else {
      message = `${protagonistCore}去找${parts.join('、')}，向${pronoun}索要了${itemNames}。`;
    }
  } else {
    let foundLocation = '';
    if (firstItem.details) {
      for (const [key, val] of Object.entries(firstItem.details)) {
        if (key.toLowerCase().includes('位置') && val) {
          foundLocation = String(val).trim();
          break;
        }
      }
    }
    message = foundLocation
      ? `${protagonistCore}拿取了${foundLocation}里的${itemNames}。`
      : `${protagonistCore}拿取了${itemNames}。`;
  }

  const $textarea = $('#send_textarea', window.parent.document);
  if ($textarea.length) {
    const currentVal = ($textarea.val() as string) || '';
    const finalVal = currentVal ? currentVal + '\n' + message : message;
    $textarea.val(finalVal).trigger('input').trigger('change');
    try {
      const ctx = (window.parent as any).SillyTavern?.getContext?.();
      if (ctx) ctx.input = finalVal;
    } catch (e) {}
  }
  showToast('已生成拿取动作描述');
}

/**
 * 辅助：获取人称代词
 */
function getPronounByChar(char: any): string {
  const sex = (char.sex || '').toLowerCase();
  if (['女', 'female', 'f', '雌性', '母', '♀'].some(s => sex.includes(s))) return '她';
  return '他';
}

function showCharacterSelectPopup(e: any, protagonistName: string, selectedItems: any[]) {
  $('.ci-popup-card-container').remove();
  const $selector = $('<div class="ci-popup-card-container"></div>');

  $selector.css({
    position: 'fixed',
    zIndex: 10001,
    margin: 0,
    border: '1px solid var(--ci-border)',
    background: 'var(--ci-bg, #fff)',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    width: '240px',
    maxHeight: '350px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  });

  const extractCore = (n: string) => {
    const m = n.trim().match(/["(（](.+?)[")）]/);
    return m ? m[1].trim() : n.trim();
  };
  const pCore = extractCore(protagonistName);
  const presentNames = getPresentCharacterList();

  const allChars = [...state.cachedData.main, ...state.cachedData.side]
    .filter(c => extractCore(c.name) !== pCore)
    .sort((a, b) => {
      const aPresent = presentNames.has(extractCore(a.name)) ? 1 : 0;
      const bPresent = presentNames.has(extractCore(b.name)) ? 1 : 0;
      return bPresent - aPresent;
    });

  if (allChars.length === 0) {
    $selector.html('<div style="text-align:center;color:#999;padding:10px;">无角色可选</div>');
  } else {
    allChars.forEach(c => {
      const cCore = extractCore(c.name);
      const isPresent = presentNames.has(cCore);
      const avatar = safeGetItem(STORAGE_AVATAR_PREFIX + c.name, '');

      const $item = $(
        `<div class=\"ci-selector-item\" style=\"display:flex;align-items:center;gap:10px;padding:6px;cursor:pointer;border-radius:4px;transition:background 0.2s;\">
            ${
              avatar
                ? `<img src=\"${avatar}\" style=\"width:32px;height:32px;border-radius:50%;object-fit:cover;\">`
                : `<div style=\"width:32px;height:32px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;\">
${c.name[0]}</div>`
            }
            <span style=\"font-size:13px;font-weight:bold;color: ${isPresent ? 'var(--ci-text)' : 'gray'};\">${c.name}</span>
            ${isPresent ? '<span style=\"font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 4px;border-radius:4px;margin-left:auto;\">在场</span>' : ''}
        </div>`,
      );

      $item.hover(
        function () {
          $(this).css('background', 'rgba(0,0,0,0.05)');
        },
        function () {
          $(this).css('background', 'transparent');
        },
      );

      $item.on('click', ev => {
        ev.stopPropagation();
        $selector.remove();

        const itemNames = selectedItems.map((i: any) => i.name).join('、');
        const firstItem = selectedItems[0];
        const ownerKey = firstItem._normalizedOwner || pCore;
        const parts = ownerKey.split(';');
        const isMulti = parts.length > 1 && parts.includes(pCore);
        const pronoun = getPronounByChar(c);

        let message = '';
        if (isPresent) {
          if (isMulti) {
            const others = parts.filter(n => n !== pCore).join('与');
            message = `${pCore}与${others}商量了一下，决定将${itemNames}赠予${c.name}。`;
          } else {
            message = `${pCore}将${itemNames}赠予了${c.name}。`;
          }
        } else if (isMulti) {
          const others = parts.filter(n => n !== pCore).join('与');
          message = `${pCore}与${others}商量了一下，决定去找${c.name}，将${itemNames}赠予${pronoun}。`;
        } else {
          message = `${pCore}去找${c.name}，将${itemNames}赠予了${pronoun}。`;
        }

        const $textarea = $('#send_textarea', window.parent.document);
        if ($textarea.length) {
          const currentVal = ($textarea.val() as string) || '';
          const finalVal = currentVal ? currentVal + '\n' + message : message;
          $textarea.val(finalVal).trigger('input').trigger('change');
          try {
            const ctx = (window.parent as any).SillyTavern?.getContext?.();
            if (ctx) ctx.input = finalVal;
          } catch (e) {}
        }

        state.giftMode = false;
        state.giftMenuExpanded = false;
        state.selectedItems = [];
        const $cancelBtn = $('.ci-gift-cancel');
        if ($cancelBtn.length) $cancelBtn.click();
        showToast('已将赠予描述添加至输入框');
      });
      $selector.append($item);
    });
  }

  $('body').append($selector);
  const winW = window.innerWidth,
    winH = window.innerHeight;
  const menuWidth = $selector.outerWidth() || 240,
    menuHeight = $selector.outerHeight() || 300;
  const clickX = e.clientX,
    clickY = e.clientY;
  let menuX = clickX,
    menuY = clickY;
  if (menuX + menuWidth > winW - 10) menuX = clickX - menuWidth;
  if (menuY + menuHeight > winH - 10) menuY = clickY - menuHeight;
  if (menuX < 10) menuX = 10;
  if (menuY < 10) menuY = 10;
  $selector.css({ left: menuX + 'px', top: menuY + 'px', opacity: 1 });
  setTimeout(() => {
    $(document).one('click.closeSelector', () => $selector.remove());
  }, 100);
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
    summaryHistory: [] as any[], // 存储完整历史总结
    outline: null as any,
    matchedOutline: null as any, // 匹配的大纲内容
    newsItems: [] as string[],
  };

  if (!rawData) return worldInfo;

  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  try {
    const allTables = Object.values(rawData);

    // [Step 1] 提取任务/行程/事件
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      if (/任务|行程|事件|事项|事务|日志/.test(tableName)) {
        const h = table.content[0] || [];
        const rows = table.content.slice(1);
        const nameIdx = getCol(h, ['名称', '任务名', '事件名', '标题', '事项', '事务', '日志']);
        const descIdx = getCol(h, ['描述', '内容', '详情', '说明']);
        const statusIdx = getCol(h, ['状态', '进度']);
        const timeIdx = getCol(h, ['时间', '时限', '期限', '截止', '日期']);
        const typeIdx = getCol(h, ['类型', '种类', '分类', 'Category']);
        const publisherIdx = getCol(h, ['发布', '发布人', '发布者', '发单']);
        const executorIdx = getCol(h, ['执行', '执行人', '执行者', '接单']);
        const rewardIdx = getCol(h, ['奖励', '报酬', '酬劳']);
        const penaltyIdx = getCol(h, ['惩罚', '惩处', '失败条件']);
        const locationIdx = getCol(h, ['地点', '位置', '所在地', '目标地']);

        rows.forEach((row: any) => {
          if (!row[nameIdx]) return;
          worldInfo.tasks.push({
            name: row[nameIdx],
            desc: descIdx > -1 ? row[descIdx] : '',
            status: statusIdx > -1 ? row[statusIdx] : '',
            time: timeIdx > -1 ? row[timeIdx] : '',
            type: typeIdx > -1 ? row[typeIdx] : '',
            publisher: publisherIdx > -1 ? { label: h[publisherIdx], val: row[publisherIdx] } : null,
            executor: executorIdx > -1 ? { label: h[executorIdx], val: row[executorIdx] } : null,
            reward: rewardIdx > -1 ? { label: h[rewardIdx], val: row[rewardIdx] } : null,
            penalty: penaltyIdx > -1 ? { label: h[penaltyIdx], val: row[penaltyIdx] } : null,
            location: locationIdx > -1 ? row[locationIdx] : '',
            _table: tableName,
          });
        });
      }
    });

    // [Step 2] 提取组织/势力 (全量扫描所有包含关键词的表)
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      const nameLower = tableName.toLowerCase();
      if (
        nameLower.includes('组织') ||
        nameLower.includes('势力') ||
        nameLower.includes('团体') ||
        nameLower.includes('阵营') ||
        nameLower.includes('faction') ||
        nameLower.includes('group')
      ) {
        dbg('[势力提取] 匹配到目标表:', tableName);
        const h = table.content[0] || [];
        const rows = table.content.slice(1);
        const nameIdx = getCol(h, [
          '名称',
          '名字',
          '组织',
          '势力',
          '团体',
          '阵营',
          '组织名',
          '势力名',
          '团体名',
          '阵营名',
          'Faction',
          'Group',
        ]);
        const leaderIdx = getCol(h, ['领袖', '首领', '领导', '头目', '负责人', 'Leader']);
        const purposeIdx = getCol(h, ['宗旨', '目的', '理念', '目标', '宗旨', 'Purpose']);
        const descIdx = getCol(h, ['描述', '介绍', '简介', '详情', 'Description']);

        rows.forEach((row: any) => {
          if (!row[nameIdx]) return;
          const forceData: any = {
            name: row[nameIdx],
            leader: leaderIdx > -1 ? row[leaderIdx] : '',
            purpose: purposeIdx > -1 ? row[purposeIdx] : '',
            desc: descIdx > -1 ? row[descIdx] : '',
            details: {} as Record<string, string>,
          };
          h.forEach((header: string, idx: number) => {
            if (idx !== nameIdx && idx !== leaderIdx && idx !== purposeIdx && idx !== descIdx && row[idx]) {
              forceData.details[header] = row[idx];
            }
          });
          worldInfo.forces.push(forceData);
        });
      }
    });

    // [Step 3] 提取总结/往期报道
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      if (tableName.includes('总结表')) {
        const summaryIdx = getCol(h, ['纪要', '总结', '内容', '摘要']);
        const timeIdx = getCol(h, ['时间', '时间跨度', '日期']);
        const indexIdx = getCol(h, ['索引', '编码', '编号']);

        rows.forEach((row: any, rIdx: number) => {
          if (!row[summaryIdx]) return;
          const item = {
            content: row[summaryIdx],
            time: timeIdx > -1 ? row[timeIdx] : '',
            index: indexIdx > -1 ? row[indexIdx] : rIdx + 1,
            details: {} as Record<string, string>,
          };
          h.forEach((header: string, idx: number) => {
            if (idx !== summaryIdx && idx !== timeIdx && idx !== indexIdx && row[idx]) {
              item.details[header] = row[idx];
            }
          });
          worldInfo.summaryHistory.push(item);
        });

        if (worldInfo.summaryHistory.length > 0) {
          worldInfo.summary = worldInfo.summaryHistory[worldInfo.summaryHistory.length - 1];

          // 查找匹配当前最新报道的大纲内容（双匹配验证）
          if (worldInfo.summary) {
            const outlineIdx = getCol(h, ['大纲', '概要', '内容']);
            const indexIdx = getCol(h, ['索引', '编码', '编号']);
            const timeIdx = getCol(h, ['时间', '时间跨度', '日期']);

            if (outlineIdx > -1) {
              rows.forEach((row: any) => {
                if (!row[outlineIdx]) return;

                // 双匹配验证：编码索引和时间跨度都要匹配
                const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
                const rowTime = timeIdx > -1 ? row[timeIdx] : '';

                if (rowIndex == worldInfo.summary.index && rowTime == worldInfo.summary.time) {
                  worldInfo.matchedOutline = {
                    content: row[outlineIdx],
                    index: rowIndex,
                    time: rowTime,
                  };
                  dbg('[大纲匹配] 找到匹配的大纲内容:', rowIndex, rowTime);
                }
              });
            }
          }
        }
      }

      if (tableName.includes('大纲')) {
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
    console.warn('[世界信息] 数据提取错误:', e);
  }

  return worldInfo;
}

/**
 * 渲染世界信息面板
 * @param $container 容器元素
 */
function renderWorldInfoPanel($container: any) {
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
  const matchedOutline = worldInfo.matchedOutline; // 新增：匹配的大纲内容

  let headlineTitle = '暂无最新报道';
  let headlineContent = '';
  let headlineTime = '';
  let headlineIndex = '';
  let otherDetails: Record<string, string> = {};

  if (summary) {
    headlineTitle = `最新报道！`;
    headlineIndex = summary.index ? `(${summary.index})` : '';
    headlineContent = summary.content || '暂无内容';
    headlineTime = summary.time || '';
    otherDetails = summary.details || {};
  }

  const outlineText = outline ? outline.content : '';
  const matchedOutlineText = matchedOutline ? matchedOutline.content : ''; // 新增：匹配的大纲内容

  // 构建细节区域 HTML
  let detailsHtml = '';
  if (Object.keys(otherDetails).length > 0) {
    const protagonistName = getProtagonistName();
    const speakerColorMap = new Map<string, string>();
    let colorIndex = 1;

    detailsHtml = `
      <div class="ci-worldinfo-details-box">
        ${Object.entries(otherDetails)
          .map(([key, val]) => {
            const isDialogue = key.includes('对话');
            if (isDialogue) {
              const lines = String(val)
                .split(/[;；]/)
                .filter(l => l.trim());
              const bubbleHtml = lines
                .map(line => {
                  const parts = line.split(/[:：]/);
                  let speaker = '';
                  let content = line;

                  if (parts.length > 1) {
                    speaker = parts[0].trim();
                    content = parts.slice(1).join(':').trim();
                  }

                  // 颜色分配逻辑
                  let colorClass = 'bubble-default';
                  if (speaker) {
                    if (speaker === protagonistName || (protagonistName && speaker.includes(protagonistName))) {
                      colorClass = 'bubble-protagonist';
                    } else {
                      if (!speakerColorMap.has(speaker)) {
                        speakerColorMap.set(speaker, `bubble-color-${colorIndex}`);
                        colorIndex = (colorIndex % 3) + 1;
                      }
                      colorClass = speakerColorMap.get(speaker)!;
                    }
                  }

                  return `
                  <div class="ci-chat-bubble ${colorClass}">
                    ${speaker ? `<span class="speaker-name">${speaker}</span>` : ''}
                    <span class="bubble-text">${content}</span>
                  </div>
                `;
                })
                .join('');

              return `<div class="ci-chat-bubble-container">${bubbleHtml}</div>`;
            } else {
              // 非对话列，维持原有的标签显示形式
              return `<div class="ci-worldinfo-detail-item">【${key}：${val}】</div>`;
            }
          })
          .join('')}
      </div>
    `;
  }

  const $latestNews = $(`
    <div class="ci-worldinfo-latest">
      <div class="ci-worldinfo-headline-header">
        <div class="ci-worldinfo-headline-title-group">
          <span class="ci-headline-main-title">${headlineTitle}</span>
          <span class="ci-worldinfo-headline-index">${headlineIndex}</span>
          <span class="ci-news-history-btn" title="往期报道">${ICONS.history}</span>
        </div>
      </div>
      <div class="ci-worldinfo-headline-scroll-area">
        ${headlineTime ? `<div class="ci-worldinfo-headline-time">时间：${headlineTime}</div>` : ''}
        ${matchedOutlineText ? `<div class="ci-worldinfo-matched-outline">大纲：${matchedOutlineText}</div>` : ''}
        ${detailsHtml}
        ${outlineText ? `<div class="ci-worldinfo-headline-summary">摘要：${outlineText}</div>` : ''}
        <div class="ci-worldinfo-headline-content">${headlineContent}</div>
      </div>
    </div>
  `);

  $latestNews.find('.ci-news-history-btn').on('click', (e: any) => {
    e.stopPropagation();
    showNewsHistoryModal();
  });

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
      // 如果在编辑模式下，调用编辑功能
      if (state.isEditing) {
        const forceIdx = $(this).closest('.ci-worldinfo-force-item').data('idx');
        showWorldInfoForceEdit(forceIdx);
        return;
      }

      // 正常模式：手风琴功能
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
        <div class="ci-inv-char-box" style="border-style: dashed; border-color: rgba(var(--ci-text-rgb), 0.2); padding: 12px; border-radius: 12px;">
          <div class="ci-inv-char-header">
            <span class="ci-event-section-title">事件信息</span>
            <span class="ci-inv-char-count">0件</span>
          </div>
          <div style="text-align: center; font-size: 12px; opacity: 0.5; padding: 10px;">暂无事件信息</div>
        </div>
      </div>
    `);
  }

  const $eventsArea = $(`
    <div class="ci-worldinfo-events">
      <div class="ci-inv-char-box" style="border-style: dashed; border-color: rgba(var(--ci-text-rgb), 0.2); padding: 12px; border-radius: 12px;">
        <div class="ci-inv-char-header">
          <span class="ci-event-section-title">事件信息</span>
          <span class="ci-inv-char-count">${tasks.length}件</span>
        </div>
        <div class="ci-worldinfo-events-grid" style="display: grid; grid-template-columns: repeat(auto-fill, 180px); gap: 8px;"></div>
      </div>
    </div>
  `);

  const $grid = $eventsArea.find('.ci-worldinfo-events-grid');

  tasks.forEach(task => {
    const statusColor =
      task.status === '进行中' ? '#4caf50' : task.status === '已完成' ? '#9e9e9e' : 'var(--ci-accent)';

    // 构建标签 HTML (发布/执行合并为一行左右显示)
    let extraTagsHtml = '';
    if ((task.publisher && task.publisher.val) || (task.executor && task.executor.val)) {
      const pubHtml =
        task.publisher && task.publisher.val
          ? `<span style="padding: 1px 4px; background: #e3f2fd; color: #1976d2; border: 1px solid #bbdefb; border-radius: 4px; font-size: 9px;">${task.publisher.label}: ${task.publisher.val}</span>`
          : '<span></span>';
      const exeHtml =
        task.executor && task.executor.val
          ? `<span style="padding: 1px 4px; background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 9px;">${task.executor.label}: ${task.executor.val}</span>`
          : '<span></span>';
      extraTagsHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; width: 100%;">${pubHtml}${exeHtml}</div>`;
    }

    // 构建奖励/惩罚 Block
    let blockHtml = '';
    if (task.reward && task.reward.val) {
      blockHtml += `<div style="background: #fffde7; border-left: 3px solid #ffc107; padding: 4px 8px; font-size: 10px; color: #5d4037; margin-top: 4px; border-radius: 4px;">${task.reward.label}: ${task.reward.val}</div>`;
    }
    if (task.penalty && task.penalty.val) {
      blockHtml += `<div style="background: #ffebee; border-left: 3px solid #f44336; padding: 4px 8px; font-size: 10px; color: #b71c1c; margin-top: 4px; border-radius: 4px;">${task.penalty.label}: ${task.penalty.val}</div>`;
    }

    const $card = $(`
      <div class="ci-worldinfo-event-card" style="background: rgba(var(--ci-text-rgb), 0.03); border: 1px solid rgba(var(--ci-text-rgb), 0.08); border-radius: 10px; padding: 10px; transition: 0.2s;">
        <div class="ci-worldinfo-event-name" style="font-weight: 600; font-size: 13px; margin-bottom: 4px; color: var(--ci-text-primary); display: flex; align-items: center; justify-content: space-between; gap: 4px;">
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${task.name}</span>
          ${task.type ? `<span style="font-size: 9px; font-weight: normal; background: var(--ci-accent); color: #fff; padding: 0 4px; border-radius: 4px; opacity: 0.8; margin-left: auto; flex-shrink: 0;">${task.type}</span>` : ''}
        </div>
        ${extraTagsHtml}
        <div style="display: inline-block; font-size: 10px; padding: 1px 6px; background: ${statusColor}22; color: ${statusColor}; border-radius: 4px; margin-bottom: 2px;">${task.status || '记录'}</div>
        ${task.desc ? `<div class="ci-worldinfo-event-desc" style="font-size: 11px; opacity: 0.8; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 6px;">${task.desc}</div>` : ''}
        ${blockHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div class="ci-worldinfo-event-time" style="font-size: 9px; opacity: 0.5;">${task.time}</div>
          ${task.location ? `<div style="font-size: 9px; color: var(--ci-accent); display: flex; align-items: center; gap: 2px; opacity: 0.8;">${ICONS.location} ${task.location}</div>` : ''}
        </div>
      </div>
    `);

    // 添加点击事件
    $card.on('click', function () {
      // 如果在编辑模式下，调用编辑功能
      if (state.isEditing) {
        const taskIndex = tasks.indexOf(task);
        showWorldInfoEventEdit(taskIndex);
        return;
      }

      // 正常模式：可以在这里添加查看详情的逻辑
      // 暂时保持为空
    });

    $grid.append($card);
  });

  return $eventsArea;
}

// ========== 物品仓库面板渲染 ==========
function renderInventoryPanel($container: any, viewMode: 'character' | 'warehouse' = 'character') {
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
    </div>
  `);

  $viewTabs.find('.ci-inv-tab').on('click', function (e: any) {
    e.stopPropagation();
    const view = $(this).data('view');
    dbg('[物品仓库] 切换视图:', view);
    renderInventoryPanel($container, view);
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
}

// 角色持有物品视图

// 仓库视图
function renderWarehouseView($container: any, allItems: any[]) {
  // 1. 数据预处理
  const categoryMap: Record<string, any[]> = { 全部: [] };
  const currencyItems: any[] = [];

  const normalizeCat = (s: string) => s.trim();

  allItems.forEach(item => {
    // 初始化 tags 数组
    item._tags = [];

    // 放入'全部'
    categoryMap['全部'].push(item);

    const rawType = item.type || '其他';

    // 货币识别 (严谨正则：避免匹配单个"金"字导致误判)
    const isCurrency =
      /(?:金|银|铜|铁|星|代|晶|魔)币|货币|金钱|钱币|信用点|现金|^G$|^Gold$/.test(item.name) ||
      /货币|金钱/.test(rawType);

    if (isCurrency) {
      currencyItems.push(item);
      item._tags.push('货币');
    }

    // 分类解析 (支持 / , ; )
    const parts = rawType.split(/[,，;；/／]/);
    let hasValidCat = false;

    parts.forEach((part: string) => {
      const cat = normalizeCat(part);
      if (!cat) return;
      hasValidCat = true;

      if (!categoryMap[cat]) categoryMap[cat] = [];

      // 避免重复添加
      if (!categoryMap[cat].includes(item)) {
        categoryMap[cat].push(item);
      }

      if (!item._tags.includes(cat)) {
        item._tags.push(cat);
      }
    });

    // 无分类归为其他
    if (!hasValidCat && !isCurrency) {
      if (!categoryMap['其他']) categoryMap['其他'] = [];
      categoryMap['其他'].push(item);
      item._tags.push('其他');
    }
  });

  // 2. 渲染 UI 结构
  $container.empty();

  // A. 货币区域
  const $currencyArea = $(
    '<div class="ci-inv-currency-area" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 0; border-bottom: 1px solid rgba(var(--ci-text-rgb), 0.05); margin-bottom: 8px;"></div>',
  );
  if (currencyItems.length > 0) {
    // [Fix] 针对货币的数量列直接显示原始字符串，不进行任何 parseInt 转换，保留逗号、加号等
    currencyItems.forEach(item => {
      $currencyArea.append(`
        <div class="ci-currency-row" style="color: #f57c00; font-weight: bold; white-space: nowrap; font-size: 13px; display: flex; align-items: center; gap: 4px;">
          <span class="ci-inv-currency-icon">${ICONS.currency}</span>
          <span class="ci-curr-name">${item.name}:</span>
          <span class="ci-curr-val">${item.count}</span>
        </div>
      `);
    });
  }

  // B. 分类标签栏
  const $categoryTabs = $('<div class="ci-inv-category-tabs"></div>');

  const sortedCats = Object.keys(categoryMap).sort((a, b) => {
    if (a === '全部') return -1;
    if (b === '全部') return 1;
    if (a === '其他') return 1;
    if (b === '其他') return -1;
    return categoryMap[b].length - categoryMap[a].length;
  });

  sortedCats.forEach((cat, i) => {
    const count = categoryMap[cat].length;
    if (count === 0) return;

    $categoryTabs.append(
      `<span class="ci-inv-cat-tab ${i === 0 ? 'active' : ''}" data-cat="${cat}">
        ${cat} <span class="count">(${count})</span>
      </span>`,
    );
  });

  // C. 物品网格区域
  const $itemsGrid = $('<div class="ci-inv-items-grid"></div>');

  function showCategory(cat: string) {
    $itemsGrid.empty();
    const items = categoryMap[cat] || [];

    if (items.length === 0) {
      $itemsGrid.html('<div class="ci-inv-empty-tip">该分类下没有物品</div>');
      return;
    }

    items.forEach(item => {
      $itemsGrid.append(createItemCard(item));
    });
  }

  if (sortedCats.length > 0) {
    showCategory(sortedCats[0]);
  }

  $categoryTabs.on('click', '.ci-inv-cat-tab', function (e: any) {
    e.stopPropagation();
    const $this = $(this);
    if ($this.hasClass('active')) return;

    $categoryTabs.find('.ci-inv-cat-tab').removeClass('active');
    $this.addClass('active');

    showCategory($this.data('cat'));
  });

  if (currencyItems.length > 0) {
    $container.append($currencyArea);
  }
  $container.append($categoryTabs);
  $container.append($itemsGrid);
}

// 创建物品卡片

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

// 统一的面板实时更新机制
function updateOpenPanels() {
  // 角色面板更新
  if (state.activeCategory) {
    renderGrid(state.activeCategory, $('#ci-panel'));
    dbg('[实时更新] 角色面板已更新');
  }

  // 人物关系面板更新
  if (state.isRelationOpen) {
    const $relPanel = $('#ci-relation-panel');
    if ($relPanel.length && $relPanel.is(':visible')) {
      renderRelationGraph($relPanel.find('.ci-relation-content'));
      dbg('[实时更新] 人物关系面板已更新');
    }
  }

  // 物品仓库面板更新
  const $invPanel = $('#ci-inventory-panel');
  if ($invPanel.length && $invPanel.is(':visible')) {
    const $invContent = $invPanel.find('.ci-inventory-content');
    const viewMode = $invContent.find('.ci-inv-tab.active').data('view') || 'warehouse';
    renderInventoryPanel($invContent, viewMode);
    dbg('[实时更新] 物品仓库面板已更新');
  }

  // 世界信息面板更新
  const $worldPanel = $('#ci-worldinfo-panel');
  if ($worldPanel.length && $worldPanel.is(':visible')) {
    renderWorldInfoPanel($worldPanel.find('.ci-worldinfo-content'));
    dbg('[实时更新] 世界信息面板已更新');
  }

  // 地图面板更新
  if (state.isMapOpen) {
    renderMap();
    dbg('[实时更新] 地图面板已更新');
  }
}

// 兼容旧的自动重绘函数
function autoRedrawRelationGraph() {
  // 现在统一使用 updateOpenPanels
  updateOpenPanels();
}

// ========== 人物关系图渲染 ==========
// ========== 人物关系图渲染 ==========
function renderRelationGraph($container: any) {
  dbg('[关系图] 开始渲染人物关系图 (V5.2 - 智能路由+物理引擎优化版)');
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

  const nodes = [];
  const nodeMap = new Map();
  const rawLinks = [];

  // 创建节点对象
  allChars.forEach((char, i) => {
    nodes.push({
      id: char.name,
      data: char,
      isProtagonist: char.name === protagonist.name,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: char.name === protagonist.name ? 50 : 40,
      width: char.name === protagonist.name ? 100 : 80,
      height: char.name === protagonist.name ? 100 : 80,
      mass: char.name === protagonist.name ? 15 : 1,
    });
    nodeMap.set(char.name, nodes[nodes.length - 1]);
  });

  // 解析连线与分组
  const allCharNames = Array.from(nodeMap.keys()).sort((a, b) => b.length - a.length);
  const pairMap = new Map(); // Key: "id1_id2" (sorted), Value: { u, v, labelsUtoV: [], labelsVtoU: [] }

  allChars.forEach(char => {
    if (!char.relation) return;

    const parts = char.relation
      .split(/[,，;；]/)
      .map(s => s.trim())
      .filter(s => s);

    parts.forEach(part => {
      let targetName = protagonist.name;
      let displayLabel = part;
      let foundExplicitTarget = false;

      const matchBracket = part.match(/^\[(.*?)\](.*)$/);
      if (matchBracket) {
        targetName = matchBracket[1];
        displayLabel = part.replace(/[\[\]]/g, '').trim();
        foundExplicitTarget = true;
      } else {
        for (const name of allCharNames) {
          if (name === char.name) continue;
          if (part.includes(name)) {
            targetName = name;
            displayLabel = part.replace(/[\[\]]/g, '');
            foundExplicitTarget = true;
            break;
          }
        }
      }

      if (!foundExplicitTarget) {
        targetName = protagonist.name;
        displayLabel = part.replace(/[\[\]]/g, '');
      }

      if (!displayLabel) displayLabel = '关系';

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
        rawLinks.push({ source: char.name, target: targetNode.id, weight: 1 });

        const u = nodeMap.get(char.name);
        const v = targetNode;
        const key = u.id < v.id ? `${u.id}_${v.id}` : `${v.id}_${u.id}`;
        if (!pairMap.has(key)) {
          pairMap.set(key, {
            u: u.id < v.id ? u : v,
            v: u.id < v.id ? v : u,
            labelsUtoV: [],
            labelsVtoU: [],
          });
        }
        const entry = pairMap.get(key);
        if (char.name === entry.u.id) {
          if (!entry.labelsUtoV.includes(displayLabel)) entry.labelsUtoV.push(displayLabel);
        } else if (!entry.labelsVtoU.includes(displayLabel)) entry.labelsVtoU.push(displayLabel);
      }
    });
  });

  // 2. 物理导向布局算法
  const runForceLayout = () => {
    const iterations = 600;
    const k = 220; // [优化] 减小理想连线长度，让节点更紧凑
    const repulsion = 1500000; // [优化] 减小斥力，避免将单一关系的节点推得太远
    const centerGravity = 0.01; // [优化] 增加中心引力，保持整体聚合

    nodes.forEach((n, i) => {
      if (n.isProtagonist) {
        n.x = 0;
        n.y = 0;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const r = 300 + Math.random() * 500;
        n.x = Math.cos(angle) * r;
        n.y = Math.sin(angle) * r;
      }
    });

    for (let i = 0; i < iterations; i++) {
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const u = nodes[a];
          const v = nodes[b];
          let dx = u.x - v.x;
          let dy = u.y - v.y;
          let distSq = dx * dx + dy * dy;
          if (distSq === 0) {
            dx = 1;
            dy = 0;
            distSq = 1;
          }
          const f = repulsion / (distSq + 1000);
          const dist = Math.sqrt(distSq);
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          if (!u.isProtagonist) {
            u.vx += fx / u.mass;
            u.vy += fy / u.mass;
          }
          if (!v.isProtagonist) {
            v.vx -= fx / v.mass;
            v.vy -= fy / v.mass;
          }
        }
      }
      rawLinks.forEach(link => {
        const u = nodeMap.get(link.source);
        const v = nodeMap.get(link.target);
        if (!u || !v) return;
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const f = (dist - k) * 0.08; // [优化] 增加连线引力系数，拉紧节点
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        if (!u.isProtagonist) {
          u.vx += fx / u.mass;
          u.vy += fy / u.mass;
        }
        if (!v.isProtagonist) {
          v.vx -= fx / v.mass;
          v.vy -= fy / v.mass;
        }
      });
      nodes.forEach(n => {
        if (!n.isProtagonist) {
          n.vx -= n.x * centerGravity;
          n.vy -= n.y * centerGravity;
        }
      });
      const t = 1.0 - i / iterations;
      nodes.forEach(n => {
        if (!n.isProtagonist) {
          const vMag = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
          const limit = 100 * t + 5; // [优化] 降低最大速度限制，使布局更稳定
          if (vMag > limit) {
            n.vx *= limit / vMag;
            n.vy *= limit / vMag;
          }
          n.x += n.vx * 0.1;
          n.y += n.vy * 0.1;
          n.vx *= 0.8;
          n.vy *= 0.8;
        }
      });
    }
    for (let pass = 0; pass < 15; pass++) {
      let moved = false;
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          const u = nodes[a];
          const v = nodes[b];
          const minD = u.radius + v.radius + 80;
          const dx = u.x - v.x;
          const dy = u.y - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minD) {
            const push = (minD - dist) / 2;
            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;
            if (!u.isProtagonist) {
              u.x += nx * push;
              u.y += ny * push;
            }
            if (!v.isProtagonist) {
              v.x -= nx * push;
              v.y -= ny * push;
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  };

  runForceLayout();

  // 3. 渲染 SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  const xhtmlNS = 'http://www.w3.org/1999/xhtml';

  $container.html(`
    <div class="ci-relation-controls" style="position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px;z-index:10;">
        <div class="ci-btn-circle" id="ci-rel-zoom-in" title="放大" style="width:28px;height:28px;font-size:14px;background:#fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;">${ICONS.plus}</div>
        <div class="ci-btn-circle" id="ci-rel-zoom-out" title="缩小" style="width:28px;height:28px;font-size:14px;background:#fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;">${ICONS.minus}</div>
        <div class="ci-btn-circle" id="ci-rel-refresh" title="重绘" style="width:28px;height:28px;font-size:14px;background:#fff;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555;">${ICONS.refresh}</div>
    </div>
    <div class="ci-relation-viewport" style="width:100%;height:100%;overflow:hidden;cursor:grab;position:relative;"></div>
  `);

  const $viewport = $container.find('.ci-relation-viewport');
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';

  const mainGroup = document.createElementNS(svgNS, 'g');
  mainGroup.setAttribute('class', 'ci-relation-main-group');
  svg.appendChild(mainGroup);

  const intersectLineRect = (x1, y1, x2, y2, rx, ry, rw, rh) => {
    const left = rx - rw / 2 - 15;
    const right = rx + rw / 2 + 15;
    const top = ry - rh / 2 - 15;
    const bottom = ry + rh / 2 + 15;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    if (maxX < left || minX > right || maxY < top || minY > bottom) return false;
    if (x1 === x2) return x1 >= left && x1 <= right && Math.max(y1, y2) >= top && Math.min(y1, y2) <= bottom;
    if (y1 === y2) return y1 >= top && y1 <= bottom && Math.max(x1, x2) >= left && Math.min(x1, x2) <= right;
    return false;
  };

  const drawLabel = (x, y, text, isVertical = false, offset = 0, pairId = '') => {
    const labelGroup = document.createElementNS(svgNS, 'g');
    labelGroup.setAttribute('class', 'ci-relation-label-group');
    if (pairId) labelGroup.setAttribute('data-pair-id', pairId);

    const labelBg = document.createElementNS(svgNS, 'rect');
    const labelText = document.createElementNS(svgNS, 'text');
    labelText.textContent = text;
    const finalX = x + (isVertical ? offset : 0);
    const finalY = y + (isVertical ? 0 : offset);
    labelText.setAttribute('x', String(finalX));
    labelText.setAttribute('y', String(finalY));
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('font-size', '10');
    labelText.setAttribute('fill', '#666');
    const charCount = text.length;
    let textW = 0,
      textH = 0;
    if (isVertical) {
      labelText.setAttribute('style', 'writing-mode: vertical-rl; text-orientation: upright; dominant-baseline: auto;');
      textW = 18;
      textH = Math.max(24, charCount * 14 + 8);
      labelBg.setAttribute('x', String(finalX - textW / 2));
      labelBg.setAttribute('y', String(finalY - textH / 2));
      labelBg.setAttribute('width', String(textW));
      labelBg.setAttribute('height', String(textH));
    } else {
      labelText.setAttribute('dy', '4');
      textW = Math.max(24, charCount * 12 + 12);
      labelBg.setAttribute('x', String(finalX - textW / 2));
      labelBg.setAttribute('y', String(finalY - 10));
      labelBg.setAttribute('width', String(textW));
      labelBg.setAttribute('height', '20');
      textH = 20;
    }
    labelBg.setAttribute('rx', '4');
    labelBg.setAttribute('fill', 'rgba(255,255,255,0.6)');
    labelBg.setAttribute('stroke', '#ddd');
    labelBg.setAttribute('stroke-width', '0.5');
    labelGroup.appendChild(labelBg);
    labelGroup.appendChild(labelText);
    // 存储尺寸信息用于后续碰撞检测
    (labelGroup as any)._bbox = { x: finalX - textW / 2, y: finalY - textH / 2, width: textW, height: textH };
    return labelGroup;
  };

  const getSmartPath = (startNode, endNode, offset = 0) => {
    const x1 = startNode.x;
    const y1 = startNode.y;
    const x2 = endNode.x;
    const y2 = endNode.y;
    const checkCollision = (p1x, p1y, p2x, p2y) => {
      for (const node of nodes) {
        if (node.id === startNode.id || node.id === endNode.id) continue;
        if (intersectLineRect(p1x, p1y, p2x, p2y, node.x, node.y, node.width, node.height)) return true;
      }
      return false;
    };
    // 辅助：生成路径对象
    const mkPath = (segments, lx, ly, isVertical) => ({
      path: `M ${segments[0].x1} ${segments[0].y1} L ${segments.map(s => `${s.x2} ${s.y2}`).join(' L ')}`,
      segments,
      lx,
      ly,
      isVertical,
    });

    // 策略1：水平 Z 型 (中间段垂直) -> 适合高瘦布局
    const stratH = () => {
      const mx = (x1 + x2) / 2 + offset;
      if (!checkCollision(x1, y1, mx, y1) && !checkCollision(mx, y1, mx, y2) && !checkCollision(mx, y2, x2, y2)) {
        return mkPath(
          [
            { x1, y1, x2: mx, y2: y1 },
            { x1: mx, y1, x2: mx, y2: y2 },
            { x1: mx, y1: y2, x2, y2 },
          ],
          mx,
          (y1 + y2) / 2,
          true,
        );
      }
      return null;
    };

    // 策略2：垂直 Z 型 (中间段水平) -> 适合矮胖布局
    const stratV = () => {
      const my = (y1 + y2) / 2 + offset;
      if (!checkCollision(x1, y1, x1, my) && !checkCollision(x1, my, x2, my) && !checkCollision(x2, my, x2, y2)) {
        return mkPath(
          [
            { x1, y1, x2: x1, y2: my },
            { x1, y1: my, x2, y2: my },
            { x1: x2, y1: my, x2, y2 },
          ],
          (x1 + x2) / 2,
          my,
          false,
        );
      }
      return null;
    };

    // 策略3：绕行
    const stratDetour = () => {
      const detours = [
        { dx: 0, dy: -150, v: false },
        { dx: 0, dy: 150, v: false },
        { dx: -150, dy: 0, v: true },
        { dx: 150, dy: 0, v: true },
      ];
      for (const det of detours) {
        const mx = det.v ? Math.max(x1, x2) + det.dx : x1;
        const my = det.v ? y1 : Math.min(y1, y2) + det.dy;
        const targetMx = det.v ? mx : x2;
        const targetMy = det.v ? y2 : my;
        if (
          !checkCollision(x1, y1, mx, my) &&
          !checkCollision(mx, my, targetMx, targetMy) &&
          !checkCollision(targetMx, targetMy, x2, y2)
        ) {
          return mkPath(
            [
              { x1, y1, x2: mx, y2: my },
              { x1: mx, y1: my, x2: targetMx, y2: targetMy },
              { x1: targetMx, y1: targetMy, x2, y2 },
            ],
            (mx + targetMx) / 2,
            (my + targetMy) / 2,
            det.v,
          );
        }
      }
      return null;
    };

    // 根据宽高比决定优先策略
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    // 如果水平距离更大，优先使用垂直Z型(中间水平)，这样标签可以水平放置
    const strategies = dx > dy ? [stratV, stratH, stratDetour] : [stratH, stratV, stratDetour];

    for (const s of strategies) {
      const res = s();
      if (res) return res;
    }
    const mx = (x1 + x2) / 2 + offset;
    // Fallback
    return mkPath(
      [
        { x1, y1, x2: mx, y2: y1 },
        { x1: mx, y1, x2: mx, y2: y2 },
        { x1: mx, y1: y2, x2, y2 },
      ],
      mx,
      (y1 + y2) / 2,
      true,
    );
  };

  const allSegments: { x1: number; y1: number; x2: number; y2: number; pairId: string }[] = [];
  const labelElements: any[] = [];

  const checkLabelCollision = (x: number, y: number, w: number, h: number, ignorePairId?: string) => {
    // 1. Check against lines (ignoring own line)
    for (const seg of allSegments) {
      if (ignorePairId && seg.pairId === ignorePairId) continue;
      if (intersectLineRect(seg.x1, seg.y1, seg.x2, seg.y2, x, y, w, h)) return true;
    }
    // 2. Check against existing labels
    for (const el of labelElements) {
      const bbox = (el as any)._bbox;
      // Simple AABB collision detection
      // bbox: top-left based (x, y, width, height)
      // current label: center based (x, y, w, h) -> convert to top-left
      const thisLeft = x - w / 2;
      const thisRight = x + w / 2;
      const thisTop = y - h / 2;
      const thisBottom = y + h / 2;

      const otherLeft = bbox.x;
      const otherRight = bbox.x + bbox.width;
      const otherTop = bbox.y;
      const otherBottom = bbox.y + bbox.height;

      if (thisLeft < otherRight && thisRight > otherLeft && thisTop < otherBottom && thisBottom > otherTop) {
        return true;
      }
    }
    return false;
  };

  const pendingLabels: any[] = [];

  // Pass 1: Draw all lines and collect segments
  pairMap.forEach(entry => {
    const { u, v, labelsUtoV, labelsVtoU } = entry;
    // 决定连线颜色：使用第一个标签的hash
    const firstLabel = labelsUtoV[0] || labelsVtoU[0] || '关系';
    let hash = 0;
    for (let i = 0; i < firstLabel.length; i++) hash = firstLabel.charCodeAt(i) + ((hash << 5) - hash);
    const strokeColor = `hsl(${Math.abs(hash % 360)}, 40%, 60%)`;

    // 记录线段用于碰撞检测
    const pairId = u.id < v.id ? `${u.id}_${v.id}` : `${v.id}_${u.id}`;

    // 绘制连线
    const { path, lx, ly, isVertical, segments } = getSmartPath(u, v, 0);
    const pathEl = document.createElementNS(svgNS, 'path');
    pathEl.setAttribute('d', path);
    pathEl.setAttribute('stroke', strokeColor);
    pathEl.setAttribute('stroke-width', '1.5');
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('class', 'ci-relation-line');
    pathEl.setAttribute('data-pair-id', pairId);
    mainGroup.appendChild(pathEl);

    if (segments) {
      segments.forEach(s => allSegments.push({ ...s, pairId }));
    }

    // Store label info for Pass 2
    pendingLabels.push({
      u,
      v,
      labelsUtoV,
      labelsVtoU,
      lx,
      ly,
      isVertical,
      strokeColor,
      pairId,
      segments, // Pass segments for calculating points on path
    });
  });

  // Pass 2: Place labels
  pendingLabels.forEach(item => {
    const { labelsUtoV, labelsVtoU, lx, ly, isVertical, pairId, segments } = item;

    // 合并标签文本
    const textUtoV = labelsUtoV.join(',');
    const textVtoU = labelsVtoU.join(',');

    const hasUtoV = textUtoV.length > 0;
    const hasVtoU = textVtoU.length > 0;

    const getPointOnPath = (ratio: number) => {
      if (!segments || segments.length === 0) return { x: lx, y: ly, isVertical: false };
      let totalLen = 0;
      const lens = segments.map(s => {
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const l = Math.sqrt(dx * dx + dy * dy);
        totalLen += l;
        return l;
      });

      let target = totalLen * ratio;
      for (let i = 0; i < segments.length; i++) {
        if (target <= lens[i]) {
          const t = target / lens[i];
          const segIsVertical = Math.abs(segments[i].x1 - segments[i].x2) < 0.1;
          return {
            x: segments[i].x1 + (segments[i].x2 - segments[i].x1) * t,
            y: segments[i].y1 + (segments[i].y2 - segments[i].y1) * t,
            isVertical: segIsVertical,
          };
        }
        target -= lens[i];
      }
      const lastSeg = segments[segments.length - 1];
      const lastSegIsVertical = Math.abs(lastSeg.x1 - lastSeg.x2) < 0.1;
      return { x: lastSeg.x2, y: lastSeg.y2, isVertical: lastSegIsVertical };
    };

    const placeLabel = (text: string, preferredRatio: number) => {
      // Try preferred ratio, then look around it along the path
      const ratios = [
        preferredRatio,
        preferredRatio - 0.1,
        preferredRatio + 0.1,
        preferredRatio - 0.2,
        preferredRatio + 0.2,
      ];

      // Filter ratios to be within [0.1, 0.9] to avoid being too close to nodes
      const validRatios = ratios.filter(r => r >= 0.1 && r <= 0.9);

      for (const r of validRatios) {
        const pt = getPointOnPath(r);
        const finalX = pt.x;
        const finalY = pt.y;
        const localIsVertical = pt.isVertical;

        const charCount = text.length;
        let w = 0,
          h = 0;

        if (localIsVertical) {
          w = 20;
          h = Math.max(24, charCount * 14 + 8);
        } else {
          w = Math.max(24, charCount * 12 + 12);
          h = 24;
        }

        if (!checkLabelCollision(finalX, finalY, w, h, pairId)) {
          labelElements.push(drawLabel(finalX, finalY, text, localIsVertical, 0, pairId));
          return;
        }
      }

      // Fallback: Use preferred ratio even if collision
      const pt = getPointOnPath(preferredRatio);
      labelElements.push(drawLabel(pt.x, pt.y, text, pt.isVertical, 0, pairId));
    };

    if (hasUtoV && hasVtoU) {
      placeLabel(textUtoV, 0.3); // Closer to U
      placeLabel(textVtoU, 0.7); // Closer to V
    } else if (hasUtoV) {
      placeLabel(textUtoV, 0.5);
    } else if (hasVtoU) {
      placeLabel(textVtoU, 0.5);
    }
  });

  // 最后添加标签，保证在连线上层
  labelElements.forEach(el => mainGroup.appendChild(el));

  // 交互高亮状态管理
  let stickyHighlight = false;
  let activeHighlightId: string | null = null;
  let pressTimer: any = null;
  let isLongPress = false;
  let isTouchInteraction = false;

  const setHighlight = (nodeId: string | null, sticky: boolean = false) => {
    if (stickyHighlight && !sticky && nodeId !== null) return; // 锁定状态下，忽略普通悬停

    if (nodeId === null) {
      if (stickyHighlight && !sticky) return; // 锁定状态下，忽略悬停离开
      stickyHighlight = false;
      activeHighlightId = null;
      $container
        .find('.ci-relation-node, .ci-relation-line, .ci-relation-label-group')
        .removeClass('dimmed highlighted');
      return;
    }

    if (sticky) {
      stickyHighlight = true;
    }
    activeHighlightId = nodeId;

    // 先全部变暗
    $container
      .find('.ci-relation-node, .ci-relation-line, .ci-relation-label-group')
      .removeClass('highlighted')
      .addClass('dimmed');

    // 高亮当前节点
    const $currentNode = $container.find(`.ci-relation-node[data-name="${nodeId}"]`);
    $currentNode.removeClass('dimmed').addClass('highlighted');

    // 查找相关连线和关联节点
    const relevantPairIds: string[] = [];
    pairMap.forEach((val, key) => {
      if (val.u.id === nodeId || val.v.id === nodeId) {
        relevantPairIds.push(key);
        // 高亮关联节点
        const otherId = val.u.id === nodeId ? val.v.id : val.u.id;
        $container.find(`.ci-relation-node[data-name="${otherId}"]`).removeClass('dimmed').addClass('highlighted');
      }
    });

    // 高亮连线和标签
    relevantPairIds.forEach(pid => {
      $container.find(`.ci-relation-line[data-pair-id="${pid}"]`).removeClass('dimmed').addClass('highlighted');
      $container.find(`.ci-relation-label-group[data-pair-id="${pid}"]`).removeClass('dimmed').addClass('highlighted');
    });
  };

  nodes.forEach(node => {
    const nodeSize = node.isProtagonist ? 80 : 60;
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('transform', `translate(${node.x - nodeSize / 2}, ${node.y - nodeSize / 2})`);
    g.setAttribute('class', 'ci-relation-node no-drag');
    g.setAttribute('data-name', node.id);
    g.style.cursor = 'pointer';

    // PC端悬停交互 (兼容移动端：如果是触摸触发的mouseenter则忽略)
    g.addEventListener('mouseenter', () => {
      if (isTouchInteraction) return;
      setHighlight(node.id);
    });
    g.addEventListener('mouseleave', () => {
      if (isTouchInteraction) return;
      setHighlight(null);
    });

    // 移动端长按交互
    g.addEventListener('touchstart', e => {
      isTouchInteraction = true;
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        setHighlight(node.id, true);
      }, 500);
    });
    g.addEventListener('touchend', () => {
      if (pressTimer) clearTimeout(pressTimer);
      // 延迟重置isTouch，防止click事件后的mouseenter干扰
      setTimeout(() => {
        isTouchInteraction = false;
      }, 500);
    });
    g.addEventListener('touchmove', () => {
      if (pressTimer) clearTimeout(pressTimer);
    });

    g.addEventListener('click', e => {
      e.stopPropagation();
      // 如果是长按触发的，则不显示角色卡
      if (isLongPress) {
        isLongPress = false;
        return;
      }
      const char = allChars.find(c => c.name === node.id);
      if (char) showRelationCharDetail(char, e);
      else if (node.data) showRelationCharDetail(node.data, e);
    });
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
    let nameTagStyle = 'background:rgba(255,255,255,0.8); color:#333;';
    if (node.data && node.data.sex) {
      const sex = node.data.sex.toLowerCase();
      if (['女', 'female', 'f', '雌性', '母', '♀'].includes(sex))
        nameTagStyle = 'background:#fce4ec; color:#c2185b; border:1px solid #f8bbd0;';
      else if (['男', 'male', 'm', '雄性', '公', '♂'].includes(sex))
        nameTagStyle = 'background:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;';
    }
    div.innerHTML = `${imgHtml}<div style="font-size:12px;margin-top:4px;white-space:nowrap;padding:1px 6px;border-radius:4px;${nameTagStyle}text-shadow:none;box-shadow:0 1px 2px rgba(0,0,0,0.05);">${node.id}</div>`;
    fo.appendChild(div);
    g.appendChild(fo);
    mainGroup.appendChild(g);
  });

  $viewport.append(svg);

  let scale = 1;
  let translateX = $viewport.width() / 2;
  let translateY = $viewport.height() / 2;
  const updateTransform = () => {
    mainGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
  };
  updateTransform();

  $viewport.on('wheel', function (e) {
    e.preventDefault();
    const delta = e.originalEvent.deltaY;
    if (delta < 0) scale *= 1.1;
    else scale /= 1.1;
    scale = Math.max(0.05, Math.min(5, scale));
    updateTransform();
  });

  let dragStartX = 0,
    dragStartY = 0,
    initialTranslateX = 0,
    initialTranslateY = 0;
  handleDrag(
    $viewport,
    (startPt, e) => {
      if ($(e.target).closest('.ci-relation-node').length) return;
      $viewport.css('cursor', 'grabbing');
      dragStartX = startPt.clientX;
      dragStartY = startPt.clientY;
      initialTranslateX = translateX;
      initialTranslateY = translateY;
    },
    (currPt, e) => {
      if ($(e.target).closest('.ci-relation-node').length) return;
      if (e.cancelable) e.preventDefault();
      translateX = initialTranslateX + (currPt.clientX - dragStartX);
      translateY = initialTranslateY + (currPt.clientY - dragStartY);
      updateTransform();
    },
    () => {
      $viewport.css('cursor', 'grab');
    },
  );

  $container.find('#ci-rel-zoom-in').on('click', e => {
    e.stopPropagation();
    scale *= 1.2;
    updateTransform();
  });
  $container.find('#ci-rel-zoom-out').on('click', e => {
    e.stopPropagation();
    scale /= 1.2;
    updateTransform();
  });
  $container.find('#ci-rel-refresh').on('click', e => {
    e.stopPropagation();
    renderRelationGraph($container);
  });

  // 点击空白处清除高亮
  $viewport.on('click', e => {
    if ($(e.target).closest('.ci-relation-node').length) return;
    // 只有在点击非节点区域时清除高亮
    setHighlight(null, true);
  });
}

function showRelationCharDetail(char: any, event: any) {
  // 1. 清理已存在的弹出卡片
  $('.ci-popup-card-container').remove();

  // 2. 生成卡片元素
  const $card = createCardElement(char);
  if (!$card || !$card.length) return;

  // 3. 样式设置：强制为弹出菜单样式，无遮罩
  $card.addClass('ci-popup-card-container').css({
    position: 'fixed',
    zIndex: 10000,
    margin: 0,
    border: '1px solid var(--ci-border)',
    background: 'var(--ci-bg, #fff)',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)', // 稍微柔和的阴影
    width: '220px', // 收起状态宽度
    height: 'auto',
    opacity: 0, // 先隐藏，定位后显示
    transform: 'none', // 移除可能的缩放
    transition: 'opacity 0.2s ease',
  });

  // 4. 初始状态：收起
  $card.removeClass('is-expanded');
  $card.find('.ci-card-compact').show();
  $card.find('.ci-expanded-box').hide();
  $card.find('.ci-nb-right').removeClass('full-width'); // 确保清除全宽状态

  $('body').append($card);

  // 5. 定位逻辑 (参考兼容性表格v9.0 Cell菜单)
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const menuWidth = $card.outerWidth() || 220;
  const menuHeight = $card.outerHeight() || 150;

  // 获取点击位置
  const clickX = event.clientX;
  const clickY = event.clientY;

  let menuX = clickX;
  let menuY = clickY;

  // 边界检测
  // 如果右侧空间不足，向左弹出
  if (menuX + menuWidth > winW - 10) {
    menuX = clickX - menuWidth;
  }

  // 如果底部空间不足，向上弹出
  if (menuY + menuHeight > winH - 10) {
    menuY = clickY - menuHeight;
  }

  // 强制不超出左上边界
  if (menuX < 10) menuX = 10;
  if (menuY < 10) menuY = 10;

  $card.css({
    left: menuX + 'px',
    top: menuY + 'px',
    opacity: 1,
  });
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
      showItemDetail(item, e);
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

/**
 * 创建角色卡片DOM元素
 * 用于renderGrid和showRelationCharDetail复用
 */
function createCardElement(d: any): any {
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

  const charExtra = state.cachedData.charExtraInfo?.[d.name] || {};
  const rightSideHtml = buildCharArchiveHtml(d, charExtra);

  let bodyStatusHtml = '';
  if (charExtra.bodyStatus && charExtra.bodyStatus.length > 0) {
    bodyStatusHtml = '<div class="ci-left-status-box">';
    charExtra.bodyStatus.forEach((status: any) => {
      bodyStatusHtml += `<div class="ci-left-status-item"><span class="ci-status-label">${status.label}</span><span class="ci-status-value">${status.value}</span></div>`;
    });
    bodyStatusHtml += '</div>';
  }

  const $card = $(
    `<div class="ci-card" id="card-${d.name}"><div class="ci-card-compact"><div class="ci-menu-trigger">${ICONS.dots}</div><div class="ci-card-menu-popover"><div class="ci-menu-item" data-move="main">主要</div><div class="ci-menu-item" data-move="side">次要</div><div class="ci-menu-item" data-move="retired">离场</div></div><div class="ci-card-avatar">${avatarHtml}</div><div class="ci-card-name">${d.name}</div><div class="ci-card-role">${d.job || d.desc || '-'}</div><div class="ci-card-info">${d.sex} · ${d.age}</div>${tags}</div><div class="ci-expanded-box" style="display:none;"><div class="ci-nb-left"><div class="ci-big-avatar-box">${avatarHtml}<div class="ci-upload-hint">点击上传</div></div><div class="ci-info-scroll"><div class="ci-detail-row"><span class="ci-label">姓名</span><span class="ci-val">${d.name}</span></div><div class="ci-detail-row"><span class="ci-label">性别</span><span class="ci-val">${d.sex}</span></div><div class="ci-detail-row"><span class="ci-label">年龄</span><span class="ci-val">${d.age}</span></div><div class="ci-detail-row"><span class="ci-label">职业</span><span class="ci-val">${d.job || '-'}</span></div><div class="ci-detail-row"><span class="ci-label">身份</span><span class="ci-val">${d.identity || '-'}</span></div>${d.loc && d.loc !== '未知' ? `<div class="ci-detail-row"><span class="ci-label">位置</span><span class="ci-val"><span style="margin-right:4px;">${ICONS.location}</span>${d.loc}</span></div>` : ''}<div class="ci-long-goal">${d.longGoal || ''}</div>${bodyStatusHtml}</div></div>${rightSideHtml}</div></div>`,
  );

  // 绑定事件
  $card.click(e => {
    const $target = $(e.target);
    dbg('[角色卡] 点击事件, 目标:', e.target.className);

    if ($target.closest('.ci-big-avatar-box').length) {
      e.stopPropagation();
      dbg('[角色卡] 点击头像，触发上传');
      state.currentUploadChar = d;
      $('#ci-hidden-input').click();
      return;
    }

    if ($target.closest('.ci-menu-trigger, .ci-menu-item').length) {
      return;
    }

    if ($card.hasClass('is-expanded') && state.isEditing) {
      if ($target.closest('.ci-nb-left').length) {
        e.stopPropagation();
        showCharEditDialog(d);
        return;
      }
      if ($target.closest('.ci-nb-right').length) {
        e.stopPropagation();
        showArchiveEditDialog(d);
        return;
      }
    }

    if ($card.hasClass('is-expanded')) {
      if ($target.closest('.ci-expanded-box').length) {
        return;
      }

      $card.find('.ci-nb-right').removeClass('full-width');
      $card.removeClass('is-expanded').find('.ci-expanded-box').hide();
      $card.find('.ci-card-compact').show();
      if (state.lastExpandedCardName === d.name) state.lastExpandedCardName = null;
    } else {
      // 收起其他已展开的卡片 (只在同一容器内)
      $card.siblings('.is-expanded').each(function () {
        $(this).find('.ci-nb-right').removeClass('full-width');
        $(this).removeClass('is-expanded').find('.ci-expanded-box').hide();
        $(this).find('.ci-card-compact').show();
      });

      $card.addClass('is-expanded').find('.ci-card-compact').hide();
      $card.find('.ci-expanded-box').css('display', 'flex');
      renderBagContent($card.find('.ci-bag-container-inner'), d);
      // 只有在主面板中才记录状态，弹出的卡片不记录
      if ($card.closest('#ci-panel').length) {
        state.lastExpandedCardName = d.name;
      }
    }
  });

  $card.find('.ci-menu-trigger').click(function (e: any) {
    e.stopPropagation();
    $(this).toggleClass('active');
  });
  $card.find('.ci-menu-item').click(function (e: any) {
    e.stopPropagation();
    updateCategory(d.name, $(this).data('move'));
  });

  return $card;
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
    const $card = createCardElement(d);
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

/*
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
*/

/*
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
*/

// ========== 地图模态弹窗功能（参考前端美化.html） ==========

// ========== 分隔条拖动逻辑 ==========

/**
 * 初始化地图面板分隔条拖动功能
 * 允许用户通过拖动分隔条来调整地图区域和外部区域的高度比例
 */

const handleDrag = ($el: any, onStart: any, onMove: any, onEnd: any) => {
  const startDrag = (e: any) => {
    const isTouch = e.type === 'touchstart';
    if (!isTouch && e.button !== 0) return;

    // Bug4修复：在阻止事件之前检查是否点击了按钮或禁止拖拽的元素
    const $target = $(e.target);
    if (
      $target.closest('.ci-close-btn, .ci-edit-btn, .ci-pin-btn, .ci-save-layout-btn, .ci-refresh-btn, .no-drag').length
    ) {
      dbg('[拖拽] 检测到按钮或禁止拖拽元素点击，不启动拖拽');
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

function constrainElement($el: any) {
  const win = window.parent || window;
  const $win = $(win);
  const winW = $win.width() || 1024;
  const winH = $win.height() || 768;
  const rect = $el[0].getBoundingClientRect();

  let left = rect.left;
  let top = rect.top;
  let width = rect.width;
  let height = rect.height;

  // 1. 处理宽度挤压
  if (width > winW) {
    width = winW - 20;
    $el.css('width', width + 'px');
  }
  if (left + width > winW) {
    left = Math.max(10, winW - width - 10);
  }
  if (left < 0) left = 10;

  // 2. 处理高度挤压
  if (height > winH) {
    height = winH - 20;
    $el.css('height', height + 'px');
  }
  if (top + height > winH) {
    top = Math.max(10, winH - height - 10);
  }
  if (top < 0) top = 10;

  $el.css({
    left: left + 'px',
    top: top + 'px',
  });

  return { left, top, width, height };
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

/**
 * [Map v9.0] 调整地图地点布局，防止标签重叠
 */
function adjustMapLayout(locations: any[]) {
  if (!locations || locations.length < 2) return locations;
  const iterations = 150;
  const forceFactor = 0.5;
  const margin = 15;

  const checkOverlap = (r1: any, r2: any) => {
    return (
      r1.x < r2.x + r2.width + margin &&
      r1.x + r1.width + margin > r2.x &&
      r1.y < r2.y + r2.height + margin &&
      r1.y + r1.height + margin > r2.y
    );
  };

  for (let i = 0; i < iterations; i++) {
    for (let j = 0; j < locations.length; j++) {
      for (let k = j + 1; k < locations.length; k++) {
        const locA = locations[j];
        const locB = locations[k];
        if (checkOverlap(locA, locB)) {
          let dx = locA.x + locA.width / 2 - (locB.x + locB.width / 2);
          let dy = locA.y + locA.height / 2 - (locB.y + locB.height / 2);
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) {
            dx = (Math.random() - 0.5) * 0.1;
            dy = (Math.random() - 0.5) * 0.1;
            distance = Math.sqrt(dx * dx + dy * dy);
          }
          const overlapX = locA.width / 2 + locB.width / 2 + margin - Math.abs(dx);
          const overlapY = locA.height / 2 + locB.height / 2 + margin - Math.abs(dy);
          if (overlapX > 0 && overlapY > 0) {
            const moveX = (dx / distance) * overlapX * forceFactor;
            const moveY = (dy / distance) * overlapY * forceFactor;
            locA.x += moveX;
            locA.y += moveY;
            locB.x -= moveX;
            locB.y -= moveY;
          }
        }
      }
    }
  }
  return locations;
}

/**
 * [Map v9.0] 打开地图地点详情卡（复刻物品详情卡风格）
 */
function openMapLocationDetail(loc: any, event: any) {
  $('.ci-item-card-popup').remove(); // 清除现有弹窗

  const $popup = $(`
    <div class="ci-item-card-popup ci-map-location-popup" style="background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); width: 280px; position: fixed; z-index: 3000; overflow: hidden; border: 1px solid rgba(0,0,0,0.05); opacity: 0; transition: opacity 0.2s ease;">
      <div class="ci-item-card-header" style="background: #555; color: #fff; padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
        <div style="font-size: 18px;">${ICONS.location || '📍'}</div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 15px; line-height: 1.2;">${loc.name}</div>
          <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">地点详情</div>
        </div>
      </div>
      <div class="ci-item-card-body" style="padding: 16px; color: #444; font-size: 13px; line-height: 1.6; max-height: 350px; overflow-y: auto;">
        ${loc.desc ? `<div style="margin-bottom: 12px; white-space: pre-wrap;">${loc.desc}</div>` : '<div style="opacity:0.5; font-style:italic; margin-bottom:12px;">暂无环境描述</div>'}

        ${
          loc.elements && loc.elements.length > 0
            ? `
          <div style="font-weight: 800; font-size: 11px; color: var(--ci-accent); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">区域元素</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${loc.elements
              .map(
                (el: any) => `
              <div class="ci-map-el-item" style="background: rgba(0,0,0,0.03); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.03);">
                <div style="font-weight: bold; font-size: 12px; display: flex; justify-content: space-between;">
                  <span>${el.name}</span>
                  <span style="font-weight: normal; opacity: 0.6; font-size: 10px;">${el.status || ''}</span>
                </div>
                ${el.desc ? `<div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${el.desc}</div>` : ''}
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                  ${(el.interactions || [])
                    .map(
                      (act: string) => `
                    <div class="ci-map-action-tag" data-element-name="${el.name}" data-action="${act}" style="background: #fff; border: 1px solid var(--ci-accent); color: var(--ci-accent); font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer;">${act}</div>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        `
            : ''
        }
      </div>
      <div class="ci-item-card-footer" style="padding: 12px 16px; background: rgba(0,0,0,0.02); border-top: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: center;">
        <button class="ci-map-go-btn" style="width: 100%; padding: 8px; background: #555; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          ${ICONS.send || '🚀'} 前往此处
        </button>
      </div>
    </div>
  `).appendTo('body');

  // 定位逻辑 (完全同步物品详情卡算法)
  const popupW = 280;
  const popupH = $popup.outerHeight() || 300;
  const padding = 15;

  // 优先使用 clientX/Y，兼容触摸
  let clientX = event.clientX;
  let clientY = event.clientY;
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length > 0) {
    clientX = event.originalEvent.touches[0].clientX;
    clientY = event.originalEvent.touches[0].clientY;
  }

  let l = clientX + padding;
  let d = clientY + padding;

  // 右侧溢出 -> 放左边
  if (l + popupW > window.innerWidth - 10) {
    l = clientX - popupW - padding;
  }
  // 底部溢出 -> 放上边
  if (d + popupH > window.innerHeight - 10) {
    d = clientY - popupH - padding;
  }

  // 最小边距
  if (l < 10) l = 10;
  if (d < 10) d = 10;

  $popup.css({
    left: l + 'px',
    top: d + 'px',
    opacity: 1,
  });

  // 绑定事件
  $popup.find('.ci-map-go-btn').on('click', e => {
    e.stopPropagation();
    sendGameActionRequest(`前往 ${loc.name}`);
    $popup.remove();
  });
  $popup.find('.ci-map-action-tag').on('click', function (e) {
    e.stopPropagation();
    const elementName = $(this).data('element-name');
    const action = $(this).data('action');
    sendGameActionRequest(`对${elementName}进行了${action}`);
    $popup.remove();
  });
}

function renderMap() {
  const $svg = $('#ci-map-svg');
  if (!$svg.length) return;
  $svg.empty();

  const locations = JSON.parse(JSON.stringify(state.cachedData.mapLocations || []));
  const elements = state.cachedData.mapElements || [];
  const protagonistLocation = state.cachedData.protagonistLoc;

  // 1. 渲染外部区域列表
  const $extList = $('.ci-external-areas-list');
  $extList.empty();
  if (state.cachedData.externalAreas && state.cachedData.externalAreas.length > 0) {
    state.cachedData.externalAreas.forEach((area: string) => {
      const $btn = $(
        `<div class="ci-ext-area-btn" style="flex-shrink:0; background:#fff; border:1px solid rgba(0,0,0,0.1); padding:6px 12px; border-radius:8px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap; transition:0.2s;">${ICONS.map || '📍'} ${area}</div>`,
      );
      $btn.on('click', () => sendGameActionRequest(`前往 ${area}`));
      $extList.append($btn);
    });
  }

  // 2. 地图渲染
  if (!locations || locations.length === 0) {
    $svg.html(
      '<text x="50%" y="50%" text-anchor="middle" style="fill:rgba(0,0,0,0.3); font-size:14px;">暂无地图数据</text>',
    );
    return;
  }

  // 关联元素
  locations.forEach((loc: any) => {
    loc.elements = elements.filter((el: any) =>
      String(loc.name)
        .trim()
        .includes(String(el.location || '').trim()),
    );
  });

  const adjustedLocs = adjustMapLayout(locations);

  // 计算范围
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
  $svg[0].setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  $svg.data('viewBox', vb);

  const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  mainGroup.setAttribute('id', 'ci-map-main-group');
  $svg[0].appendChild(mainGroup);

  adjustedLocs.forEach((loc: any) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ci-map-loc-group');
    g.style.cursor = 'pointer';
    g.addEventListener('click', e => {
      e.stopPropagation();
      openMapLocationDetail(loc, e);
    });

    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', String(loc.x));
    r.setAttribute('y', String(loc.y));
    r.setAttribute('width', String(loc.width));
    r.setAttribute('height', String(loc.height));
    r.setAttribute('fill', 'rgba(140, 110, 84, 0.1)');
    r.setAttribute('stroke', 'var(--ci-accent)');
    r.setAttribute('stroke-width', '1.5');
    r.setAttribute('rx', '8');

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(loc.x + loc.width / 2));
    t.setAttribute('y', String(loc.y + loc.height / 2));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('style', 'fill:var(--ci-text-primary); font-weight:800; font-size:16px; pointer-events:none;');
    t.textContent = loc.name;

    g.appendChild(r);
    g.appendChild(t);
    mainGroup.appendChild(g);

    if (loc.name === protagonistLocation || (protagonistLocation && loc.name.includes(protagonistLocation))) {
      const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulse.setAttribute('cx', String(loc.x + loc.width / 2));
      pulse.setAttribute('cy', String(loc.y + loc.height / 2));
      pulse.setAttribute('r', '15');
      pulse.setAttribute('class', 'ci-map-pulse-wave');
      pulse.setAttribute('style', 'fill:none; stroke:var(--ci-accent); stroke-width:2px;');
      mainGroup.appendChild(pulse);
    }
  });
}

/**
 * [Map v9.0.1] 缩放和平移绑定 (复刻关系图算法)
 */
function bindMapControls() {
  const $svg = $('#ci-map-svg');
  const $viewport = $('#ci-map-content');
  const mainGroup = document.getElementById('ci-map-main-group');
  if (!$svg.length || !$viewport.length || !mainGroup) return;

  let scale = state.mapScale || 1;
  let translateX = state.mapTranslateX || 0;
  let translateY = state.mapTranslateY || 0;

  const updateTransform = () => {
    mainGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
    state.mapScale = scale;
    state.mapTranslateX = translateX;
    state.mapTranslateY = translateY;
  };

  updateTransform();

  // 滚轮缩放 (复刻关系图算法)
  $viewport.off('wheel').on('wheel', function (e: any) {
    e.preventDefault();
    const delta = e.originalEvent.deltaY;
    const zoomFactor = 0.1;
    if (delta < 0) scale *= 1 + zoomFactor;
    else scale /= 1 + zoomFactor;
    scale = Math.max(0.1, Math.min(5, scale));
    updateTransform();
  });

  // 拖拽平移 (复刻 handleDrag 逻辑)
  let isDragging = false;
  let startX = 0,
    startY = 0;
  let initialTX = 0,
    initialTY = 0;

  $viewport.off('mousedown touchstart').on('mousedown touchstart', (e: any) => {
    if (state.isEditing) return;
    if (e.type === 'mousedown' && e.buttons !== 1) return;

    const target = $(e.target);
    if (target.closest('.ci-map-btn-circle, .ci-map-loc-group').length) return;

    isDragging = true;
    const point = e.type === 'touchstart' ? e.originalEvent.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    initialTX = translateX;
    initialTY = translateY;
    $viewport.css('cursor', 'grabbing');
  });

  $(window)
    .off('mousemove.map touchmove.map')
    .on('mousemove.map touchmove.map', (e: any) => {
      if (!isDragging) return;
      const point = e.type === 'touchmove' ? e.originalEvent.touches[0] : e;
      const dx = point.clientX - startX;
      const dy = point.clientY - startY;

      translateX = initialTX + dx;
      translateY = initialTY + dy;
      updateTransform();
    });

  $(window)
    .off('mouseup.map touchend.map')
    .on('mouseup.map touchend.map', () => {
      if (isDragging) {
        isDragging = false;
        $viewport.css('cursor', 'grab');
      }
    });

  $('#ci-zoom-in')
    .off('click')
    .on('click', e => {
      e.stopPropagation();
      scale *= 1.2;
      scale = Math.min(5, scale);
      updateTransform();
    });
  $('#ci-zoom-out')
    .off('click')
    .on('click', e => {
      e.stopPropagation();
      scale /= 1.2;
      scale = Math.max(0.1, scale);
      updateTransform();
    });
}

function bindMapSplitter() {
  const $splitter = $('.ci-map-splitter'),
    $ext = $('#ci-map-external-section');
  if (!$splitter.length || !$ext.length) return;
  let isResizing = false,
    sy = 0,
    sh = 0;
  $splitter.on('mousedown touchstart', (e: any) => {
    isResizing = true;
    const pt = e.type === 'touchstart' ? e.originalEvent.touches[0] : e;
    sy = pt.clientY;
    sh = $ext.outerHeight() || 100;
    $('body').css('cursor', 'ns-resize');
    e.preventDefault();
    e.stopPropagation();
  });
  $(window)
    .on('mousemove.split touchmove.split', (e: any) => {
      if (!isResizing) return;
      const pt = e.type === 'touchmove' ? e.originalEvent.touches[0] : e;
      $ext.css('height', Math.max(40, Math.min(400, sh + (sy - pt.clientY))) + 'px');
    })
    .on('mouseup.split touchend.split', () => {
      isResizing = false;
      $('body').css('cursor', 'default');
    });
}

function createSettingsUI() {
  try {
    dbg('Opening Settings UI...');
    $('.ci-settings-overlay').remove();
    const $overlay = $(
      `<div class="ci-settings-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2400;display:flex;align-items:center;justify-content:center;"></div>`,
    );
    const $card = $(`<div class="ci-settings-card" style="max-height:90vh;overflow-y:auto;max-width:95vw;"></div>`);
    const $header = $(
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span style="font-weight:bold;font-size:16px;">浮岛设置 <span style="font-size:10px;font-weight:normal;opacity:0.6;">v1.2.0-20260105-024000</span></span><span class="ci-close-btn">${ICONS.close}</span></div>`,
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
    const mkSlider = (label: string, key: 'main' | 'island') => {
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
    $opacitySec.append(mkSlider('浮岛透明度', 'island'));
    $opacitySec.append(mkSlider('主界面透明度', 'main'));

    // ======== 地图功能开关 ========
    const mapEnabled = isMapEnabled();
    const $mapSec = $(
      `<div class="ci-settings-section"><div class="ci-settings-title">地图功能<span class="ci-experimental-tag">实验性功能</span></div></div>`,
    );
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
        // 地图注入确认弹窗
        const confirmMessage =
          '注入地图模板为模板修改行为，需要删除数据库当前聊天的所有本地数据进行重新填表，请问您确定要开启地图功能吗？';

        if (!confirm(confirmMessage)) {
          // 用户取消，恢复开关状态
          $(this).prop('checked', false);
          $slider.css('background', '#ccc');
          return;
        }

        // 注入地图表格
        dbg('[设置] 用户确认启用地图功能');
        const success = await injectMapTables();
        if (success) {
          $slider.css('background', '#4caf50');
          updateMapStatus();

          // 注入成功后显示指导弹窗
          setTimeout(() => {
            alert(
              '地图模板已成功注入，请手动前往【数据库】——【数据管理】——【打开可视化表格编辑器】点击右上角【保存到通用模板】并在【数据管理界面，手动点击【删除所有本地数据】；并进行重新填表。',
            );
          }, 500);
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

    // ======== 人物关系自动重绘开关 ========
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

    // 开关事件
    $relationToggle.find('#ci-relation-auto-redraw').on('change', function () {
      const isChecked = $(this).prop('checked');
      const $slider = $relationToggle.find('.ci-slider');

      state.autoRedrawRelation = isChecked;
      safeSetItem('ci_auto_redraw_relation', isChecked.toString());

      $slider.css('background', isChecked ? '#4caf50' : '#ccc');

      if (isChecked) {
        showToast('已开启自动重绘人物关系图');
      } else {
        showToast('已关闭自动重绘人物关系图');
      }

      dbg(`[设置] 自动重绘人物关系图: ${isChecked ? '开启' : '关闭'}`);
    });

    $relationSec.append($relationToggle);

    // ======== 数据库可视化按钮 ========
    const $databaseBtn = $(
      `<button class="ci-btn" style="width:100%;border:1px solid var(--ci-border);border-radius:8px;margin-top:10px;">打开数据库可视化编辑器</button>`,
    );
    $databaseBtn.click(() => {
      // 调用数据库前端的可视化编辑器打开函数
      if (window.top && window.top.AutoCardUpdaterAPI && window.top.AutoCardUpdaterAPI.openVisualizer) {
        window.top.AutoCardUpdaterAPI.openVisualizer();
      } else if (window.top && typeof (window.top as any).openNewVisualizer_ACU === 'function') {
        (window.top as any).openNewVisualizer_ACU();
      } else {
        showToast('未找到数据库可视化编辑器，请确保数据库已加载');
      }
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
    // ======== 地图功能注意事项 ========
    const $mapNotice = $(`
      <div class="ci-map-notice">
        <div class="ci-notice-title">地图功能相关注意事项：</div>
        <div class="ci-notice-content">
          地图注入属于修改模板行为，操作过程需要删除当前聊天的本地数据。注入功能不会影响您的模板，但为了安全考虑，请导出自己的模板以防万一。
        </div>
        <div class="ci-notice-steps">
          <div class="ci-step">
            <span class="ci-step-number">1</span>
            <div class="ci-step-content">开启启用地图表格功能，将会自动帮您注入地图模板，受限于水平问题，还需要您进行一段手动操作：请手动前往【数据库】——【数据管理】——【打开可视化表格编辑器】点击右上角【保存到通用模板】并在【数据管理界面，手动点击【删除所有本地数据】；完成这部分操作后，您可以进行手动填表，地图功能会正常运转</div>
          </div>
          <div class="ci-step">
            <span class="ci-step-number">2</span>
            <div class="ci-step-content">当您打算关闭地图功能，当前手动关闭功能失效，您需要进入【数据库】——【数据管理】——【打开可视化表格编辑器】手动删除新增的两个地图表格，并点击【保存到通用模板】；后续是否需要删除所有本地数据，请根据当前数据库手动删表是否需要而弹性选择。</div>
          </div>
        </div>
      </div>
    `);

    $card
      .append($header)
      .append($themeSec)
      .append($opacitySec)
      .append($mapSec)
      .append($mapNotice)
      .append($relationSec)
      .append($databaseBtn)
      .append($resetBtn);
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

    // 步骤11: 跳过overrideWithTemplate调用（按用户要求删除）

    // 步骤12: 保存到通用模板
    dbg('[地图注入] 💾 保存到通用模板...');
    try {
      // 尝试直接调用数据库的可视化编辑器保存功能
      const topWin = window.parent || window;
      if (topWin.saveVisualizerChanges_ACU) {
        await topWin.saveVisualizerChanges_ACU(true);
        dbg('[地图注入] ✅ 已保存到通用模板');
      } else {
        dbg('[地图注入] ⚠️ saveVisualizerChanges_ACU函数不可用');
      }
    } catch (e) {
      dbg('[地图注入] ⚠️ 保存到通用模板失败:', e);
    }

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

    // 步骤6: 跳过overrideWithTemplate调用（按用户要求删除）

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
    console.log('[UI更新] 地图开关状态已更新:', mapEnabled);
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
                    <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
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
                <div class="ci-panel-header ci-drag-handle"><span>地图</span><div style="display:flex; gap:8px; align-items:center;"><span class="ci-save-layout-btn" style="display:none; cursor:pointer;" title="保存布局">${ICONS.save}</span><span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span><span class="ci-close-btn">${ICONS.close}</span></div></div>
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
            <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
          </div>
        </div>
        <div class="ci-panel-content ci-relation-content"></div>
        <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
        <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
      </div>
    `).appendTo('body');
    console.log('[UI] 人物关系面板已创建');

    // 物品仓库面板
    const $inventoryPanel = $(`
      <div id="ci-inventory-panel" class="ci-panel ci-sub-panel" data-panel-type="inventory">
        <div class="ci-panel-header ci-drag-handle">
          <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.inventory}</span>物品仓库</span>
          <div style="display:flex; gap:4px; align-items:center;">
            <span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span>
            <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
            <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
          </div>
        </div>
        <div class="ci-panel-content ci-inventory-content"></div>
        <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
        <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
      </div>
    `).appendTo('body');
    console.log('[UI] 物品仓库面板已创建');

    // 世界信息面板
    const $worldInfoPanel = $(`
      <div id="ci-worldinfo-panel" class="ci-panel ci-sub-panel" data-panel-type="worldinfo">
        <div class="ci-panel-header ci-drag-handle">
          <span class="ci-panel-title"><span class="ci-panel-icon">${ICONS.world}</span>世界信息</span>
          <div style="display:flex; gap:4px; align-items:center;">
            <span class="ci-pin-btn" title="固定/取消固定">${ICONS.pin}</span>
            <span class="ci-edit-btn" title="编辑">${ICONS.edit}</span>
            <span class="ci-close-btn" title="关闭">${ICONS.close}</span>
          </div>
        </div>
        <div class="ci-panel-content ci-worldinfo-content"></div>
        <div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div>
        <div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
      </div>
    `).appendTo('body');
    console.log('[UI] 世界信息面板已创建');

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

// [Fix] 封装统一的编辑模式切换函数
function toggleEditMode() {
  state.isEditing = !state.isEditing;

  // 同步所有编辑按钮状态
  $('.ci-edit-btn').toggleClass('active', state.isEditing);

  // 更新所有相关容器的编辑样式类
  $('#ci-panel, #ci-map-panel, #ci-inventory-panel, #ci-worldinfo-panel, #ci-relation-panel').toggleClass(
    'ci-editing',
    state.isEditing,
  );

  if (state.isEditing) $('.ci-save-layout-btn').show();
  else $('.ci-save-layout-btn').hide();

  showToast(state.isEditing ? '进入编辑模式' : '退出编辑模式');

  // 编辑模式切换后重绘内容以显示/隐藏遮罩
  if (state.isMapOpen) renderMap();
  if (state.isInventoryOpen) {
    const $invContent = $('#ci-inventory-panel .ci-inventory-content');
    const viewMode = $invContent.find('.ci-inv-tab.active').data('view') || 'warehouse';
    renderInventoryPanel($invContent, viewMode);
  }
}

function bindEvents($con: any, $pan: any, $ops: any, $mapPan: any) {
  // 通用面板点击置顶事件
  $(document).on('mousedown touchstart', '.ci-panel, #ci-map-panel', function (e: any) {
    // 如果点击的是面板，将其置顶
    const id = $(this).attr('id');
    if (id) {
      bringToFront('#' + id);
    }
  });

  // [Fix] 直接绑定各面板的编辑按钮
  $('.ci-edit-btn').on('click', function (e: any) {
    e.stopPropagation();
    toggleEditMode();
  });

  // 角色面板图钉按钮事件
  $('body').on('click', '#ci-panel .ci-pin-btn', function (e: any) {
    e.stopPropagation();
    const $btn = $(this);
    const $panel = $('#ci-panel');

    // 切换状态
    const newPinnedState = !$btn.hasClass('active');

    $btn.toggleClass('active', newPinnedState);
    $panel.toggleClass('pinned', newPinnedState);

    showToast(newPinnedState ? '角色面板已固定' : '角色面板取消固定');
  });

  // 通用关闭按钮事件
  $('body').on('click', '.ci-panel .ci-close-btn', function (e: any) {
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
      // 移除固定状态
      $('#ci-panel').removeClass('pinned');
      $('#ci-panel .ci-pin-btn').removeClass('active');
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
  $('body').on('click', '.ci-panel .ci-pin-btn, #ci-map-panel .ci-pin-btn', function (e: any) {
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
      // 子面板也添加无过渡类，防止拖动滞后
      $('.ci-sub-panel:not(.pinned)').addClass('no-transition');
    },
    (curr: any) => {
      if (state.drag.rafId) cancelAnimationFrame(state.drag.rafId);
      state.drag.rafId = requestAnimationFrame(() => {
        const deltaX = curr.clientX - state.drag.startX;
        const deltaY = curr.clientY - state.drag.startY;
        const newLeft = state.drag.initialLeft + deltaX;
        const newTop = state.drag.initialTop + deltaY;
        $con.css({ left: newLeft, top: newTop, right: 'auto' });

        // 1. 显式同步主面板 (如果是可见的)
        if ($pan.hasClass('visible')) {
          syncPanelPosition($con, $pan, newLeft, newTop);
        }

        // 2. 显式同步地图面板 (如果可见且未固定)
        if ($mapPan.hasClass('visible') && !state.isMapPinned) {
          syncPanelPosition($con, $mapPan, newLeft, newTop);
        }

        // 3. 同步其他所有子面板 (如果可见且未固定)
        $('.ci-sub-panel.visible:not(.pinned)').each(function () {
          syncPanelPosition($con, $(this), newLeft, newTop);
        });

        if (state.isOptionsOpen) syncOptionsPosition(newLeft, newTop);
      });
    },
    () => {
      state.drag.active = false;
      if (state.drag.rafId) cancelAnimationFrame(state.drag.rafId);
      $pan.removeClass('no-transition');
      $mapPan.removeClass('no-transition');
      $('.ci-sub-panel').removeClass('no-transition');

      const safePos = constrainElement($con);

      // 结束拖动时再次同步一次位置，确保吸附对齐
      if ($pan.hasClass('visible')) {
        syncPanelPosition($con, $pan, safePos.left, safePos.top);
      }
      if ($mapPan.hasClass('visible') && !state.isMapPinned) {
        syncPanelPosition($con, $mapPan, safePos.left, safePos.top);
      }
      $('.ci-sub-panel.visible:not(.pinned)').each(function () {
        syncPanelPosition($con, $(this), safePos.left, safePos.top);
      });

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
    if (state.activeCategory && $pan.hasClass('visible')) {
      closePanel('#ci-panel');
      $(this).removeClass('active');
      state.activeCategory = null;
      return;
    }
    state.activeCategory = 'main'; // 默认显示主要人物
    state.isExpanded = true;
    $con.addClass('expanded');
    // 不要移除其他的 active，只设置自己
    $(this).addClass('active');
    // 显示标签栏，渲染当前选中的标签内容
    $pan.find('.ci-tab-bar').show();
    $pan.find('.ci-tab').removeClass('active');
    $pan.find('.ci-tab[data-tab="main"]').addClass('active');
    renderGrid('main', $pan);
    openPanel('#ci-panel');
    updateHeightClass($con);
  });

  // 标签切换事件（主要人物/次要人物/已离场）
  $pan.find('.ci-tab').on('click', function (e: any) {
    e.stopPropagation();
    const tab = $(this).data('tab');
    $pan.find('.ci-tab').removeClass('active');
    $(this).addClass('active');
    state.activeCategory = tab;
    renderGrid(tab, $pan);
  });

  // 人物关系按钮 - 打开人物关系面板
  $con.find('.ci-btn[data-type="relation"]').on('click', function (e: any) {
    e.stopPropagation();

    const $relPanel = $('#ci-relation-panel');
    if ($relPanel.length === 0) {
      showToast('人物关系面板未初始化', 'error');
      return;
    }

    if (state.isRelationOpen) {
      closePanel('#ci-relation-panel');
      state.isRelationOpen = false;
      $(this).removeClass('active');
    } else {
      // 不关闭其他面板，允许叠加
      openPanel('#ci-relation-panel');
      state.isRelationOpen = true;
      $(this).addClass('active');

      // 渲染关系图
      renderRelationGraph($relPanel.find('.ci-relation-content'));
    }
  });

  // 物品仓库按钮 - 打开物品仓库面板
  $con.find('.ci-btn[data-type="inventory"]').on('click', function (e: any) {
    e.stopPropagation();

    const $invPanel = $('#ci-inventory-panel');
    if ($invPanel.length === 0) {
      showToast('物品仓库面板未初始化', 'error');
      return;
    }

    if (state.isInventoryOpen) {
      closePanel('#ci-inventory-panel');
      state.isInventoryOpen = false;
      $(this).removeClass('active');
    } else {
      openPanel('#ci-inventory-panel');
      state.isInventoryOpen = true;
      $(this).addClass('active');

      // 渲染物品内容
      renderInventoryPanel($invPanel.find('.ci-inventory-content'));
    }
  });

  // ========== 世界信息按钮点击事件 ==========
  $('#ci-world-info-btn').on('click', function (e: any) {
    e.stopPropagation();

    const $worldPanel = $('#ci-worldinfo-panel');
    if ($worldPanel.length === 0) {
      showToast('世界信息面板未初始化', 'error');
      return;
    }

    if (state.isWorldInfoOpen) {
      closePanel('#ci-worldinfo-panel');
      state.isWorldInfoOpen = false;
      $(this).removeClass('active');
    } else {
      openPanel('#ci-worldinfo-panel');
      state.isWorldInfoOpen = true;
      $(this).addClass('active');

      // 渲染世界信息内容
      renderWorldInfoPanel($worldPanel.find('.ci-worldinfo-content'));
    }
  });

  $('#ci-map-btn').on('click', function (e: any) {
    e.stopPropagation();
    state.isMapOpen = !state.isMapOpen;
    const $btn = $(this);
    if (state.isMapOpen) {
      $btn.addClass('active');
      openPanel('#ci-map-panel');
      renderMap();
    } else {
      $btn.removeClass('active');
      closePanel('#ci-map-panel');
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
      updateOpenPanels();
      showToast('数据已刷新');
    } else {
      showToast('无法连接数据库', 'error');
    }
  });
  $pan.find('.ci-close-btn').on('click', (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    closePanel('#ci-panel');
    state.activeCategory = null;
    $('.ci-btn[data-type="main"]').removeClass('active');
  });
  $mapPan.find('.ci-close-btn').on('click', (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    state.isMapOpen = false;
    state.isMapPinned = false;
    $mapPan.removeClass('pinned');
    $('#ci-map-btn').removeClass('active');
    closePanel('#ci-map-panel');
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

    if (state.isOptionsOpen) {
      $ops.empty();
      if (state.optionsData && state.optionsData.length) {
        state.optionsData.forEach(opt => {
          const $bubble = $(`<div class="ci-option-bubble">${opt}</div>`);
          $bubble.on('click', (ev: any) => {
            ev.stopPropagation();
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
    const $target = $(e.target);

    // [Priority 0] 功能按钮豁免逻辑：如果是点击面板头部的功能按钮，立即停止全局点击处理，允许按钮自身的处理器执行
    if ($target.closest('.ci-edit-btn, .ci-pin-btn, .ci-close-btn, .ci-refresh-btn, .ci-news-history-btn').length) {
      return;
    }

    // 1. 选项菜单处理
    if ($target.closest('.ci-options-container').length || $target.closest('#ci-options-btn').length) {
      return;
    }
    if (state.isOptionsOpen) {
      dbg('[全局点击] 点击空白处，关闭选项气泡');
      state.isOptionsOpen = false;
      $('.ci-options-container').removeClass('visible');
      setTimeout(() => $('.ci-options-container').empty(), 300);
    }

    // 2. 地图选项气泡
    if (!$target.closest('.ci-map-popup-options').length) {
      $('.ci-map-popup-options').remove();
    }

    // 3. 模态弹窗/遮罩层处理 (Edit Dialogs, Settings, etc.)
    // 如果点击的是遮罩层内部（且不是遮罩层本身，遮罩层本身的点击由各自的handler处理并stopPropagation），则不处理
    // 如果点击的是遮罩层本身，通常意味着关闭，但各自的handler会处理。
    // 这里主要是防止点击遮罩层时触发下方的面板关闭逻辑
    if (
      $target.closest(
        '.ci-edit-overlay, .ci-settings-overlay, .ci-item-detail-overlay, .ci-inv-modal, .ci-char-select-overlay, .ci-gift-confirm-overlay',
      ).length
    ) {
      return;
    }

    // 4. 角色卡弹出层 (Popup Card) 处理
    // 逻辑：点击卡片外部 -> 如果展开则收起 -> 如果收起则关闭
    const $popupCard = $('.ci-popup-card-container, .ci-item-card-popup');
    if ($popupCard.length) {
      // [Fix] 如果点击的是卡片内部，或者是功能按钮（编辑/图钉/关闭），则不执行关闭卡片的逻辑，允许事件继续传递
      if (
        $target.closest('.ci-popup-card-container, .ci-item-card-popup').length ||
        $target.closest('.ci-edit-btn, .ci-pin-btn, .ci-close-btn').length
      ) {
        return;
      } else {
        // 点击卡片外部

        // 优先处理物品卡 (直接关闭)
        if ($popupCard.hasClass('ci-item-card-popup')) {
          $popupCard.remove();
          if (e && e.stopPropagation) e.stopPropagation();
          return;
        }

        const $cardInner = $popupCard.find('.ci-card');
        if ($cardInner.hasClass('is-expanded')) {
          dbg('[全局点击] 收起弹出卡片');
          $cardInner.removeClass('is-expanded');
          $cardInner.find('.ci-expanded-box').hide();
          $cardInner.find('.ci-card-compact').show();
          $cardInner.find('.ci-nb-right').removeClass('full-width');
          if (e && e.stopPropagation) e.stopPropagation();
          return; // 仅收起，停止后续处理 (不关闭底层面板)
        } else {
          dbg('[全局点击] 关闭弹出卡片');
          $popupCard.remove();
          if (e && e.stopPropagation) e.stopPropagation();
          return; // 仅关闭卡片，停止后续处理 (不关闭底层面板)
        }
      }
    }

    if (state.isGlobalDragging || state.drag.active) return;

    // 5. 面板栈处理 (LIFO Closing)
    if (state.panelStack.length > 0) {
      const topPanelSelector = state.panelStack[state.panelStack.length - 1];
      const $topPanel = $(topPanelSelector);

      // 如果点击的是最顶层面板内部，不做处理
      if ($target.closest(topPanelSelector).length) {
        // 将该面板再次置顶（防止z-index被其他操作覆盖）
        bringToFront(topPanelSelector);
        return;
      }

      // 如果点击的是打开该面板的按钮，也不处理（交给按钮事件）
      // 这里需要硬编码一些对应关系，或者在按钮点击时阻止冒泡
      // 为简化，假设按钮点击都有 stopPropagation，所以这里不需要特殊处理按钮
      // 但为了保险，还是检查一下是否点击了浮岛上的按钮
      if ($target.closest('#ci-island-container').length) {
        return;
      }

      // 点击了最顶层面板外部 -> 关闭该面板
      // [Fix] 如果面板被固定，则忽略点击外部关闭
      if ($topPanel.hasClass('pinned')) {
        return;
      }

      dbg('[全局点击] 点击外部，关闭顶层面板:', topPanelSelector);
      closePanel(topPanelSelector);

      // 同步状态变量
      if (topPanelSelector === '#ci-relation-panel') {
        state.isRelationOpen = false;
        $('.ci-btn[data-type="relation"]').removeClass('active');
      } else if (topPanelSelector === '#ci-inventory-panel') {
        state.isInventoryOpen = false;
        $('.ci-btn[data-type="inventory"]').removeClass('active');
      } else if (topPanelSelector === '#ci-worldinfo-panel') {
        state.isWorldInfoOpen = false;
        $('#ci-world-info-btn').removeClass('active');
      } else if (topPanelSelector === '#ci-panel') {
        // 主面板关闭
        state.activeCategory = null;
        $('.ci-btn[data-type]').removeClass('active');
      } else if (topPanelSelector === '#ci-map-panel') {
        // 地图面板通常不自动关闭（除非没钉住），这里逻辑可以保留或调整
        // 假设未固定的地图面板也参与栈管理
        if (!state.isMapPinned) {
          state.isMapOpen = false;
          $('#ci-map-btn').removeClass('active');
        } else {
          // 如果是固定的，不应该被点击外部关闭，也不应该在栈顶（或者在栈顶但不关闭）
          // 但 closePanel 已经调用了。
          // 修正：如果是固定的面板，就不应该被这种逻辑关闭。
          // 但我们应该在添加到 stack 时就决定，或者在这里判断
          // 简单起见，固定面板不应受“点击外部关闭”影响
          if ($topPanel.hasClass('pinned')) {
            // 仅仅是从栈中移除？不，固定面板应该一直显示。
            // 也许固定面板不应该在 stack 中被自动关闭？
            // 重新打开它？或者 check before close.
            $topPanel.addClass('visible'); // Re-show
            // Don't remove from stack if pinned? Or remove and ignore?
            // 让它留在界面上，但不处于“待关闭栈”中？
            // 既然固定了，它就类似背景了。
          }
        }
      }
      return; // 只关闭一层，停止处理
    }

    // 6. 浮岛折叠逻辑
    // 如果没有面板打开，且点击外部
    const isPanelOpen = $('#ci-panel').hasClass('visible');
    const isMapOpen = state.isMapOpen;
    const isSubPanelOpen = state.isRelationOpen || state.isInventoryOpen || state.isWorldInfoOpen;

    if (state.isExpanded && !isPanelOpen && !isMapOpen && !isSubPanelOpen) {
      // 只有点击浮岛外部才折叠
      if (!$target.closest('#ci-island-container').length) {
        collapseIsland($con);
      }
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
    const panelId = $panel.attr('id');

    if (panelId) {
      closePanel('#' + panelId);
    } else {
      $panel.removeClass('visible');
    }

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

  // 子面板编辑按钮 - 世界信息面板专用
  $(document).on('click', '#ci-worldinfo-panel .ci-edit-btn', function (e: any) {
    e.stopPropagation();
    showWorldInfoEditOverlay();
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
  applyOpacity('island', state.opacity.island);
  applyOpacity('main', state.opacity.main);

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
          updateOpenPanels();
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
              updateOpenPanels();
              if (state.activeCategory) renderGrid(state.activeCategory, $('#ci-panel'));
            }
          });
        }
      }
    }, 500);
  }
}

function showNewsHistoryModal() {
  const worldInfo = state.cachedData.worldInfo;
  const history = worldInfo.summaryHistory || [];

  if (history.length === 0) {
    showToast('暂无往期报道数据', 'info');
    return;
  }

  const sortedHistory = [...history].reverse();

  // 为每个历史项查找匹配的大纲内容
  sortedHistory.forEach(item => {
    const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
    if (api && api.exportTableAsJson) {
      const rawData = api.exportTableAsJson();
      const allTables = Object.values(rawData);
      const getCol = (h: any[], ns: string[]) =>
        h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

      // 查找包含"大纲"的表
      allTables.forEach((table: any) => {
        if (!table || !table.name || !table.content || !table.content[0]) return;
        const tableName = table.name;
        if (tableName.includes('大纲')) {
          const h = table.content[0] || [];
          const rows = table.content.slice(1);
          const outlineIdx = getCol(h, ['大纲', '概要', '内容']);
          const indexIdx = getCol(h, ['索引', '编码', '编号']);
          const timeIdx = getCol(h, ['时间', '时间跨度', '日期']);

          if (outlineIdx > -1) {
            rows.forEach((row: any) => {
              if (!row[outlineIdx]) return;

              // 双匹配验证：编码索引和时间跨度都要匹配
              const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
              const rowTime = timeIdx > -1 ? row[timeIdx] : '';

              if (rowIndex == item.index && rowTime == item.time) {
                item.matchedOutline = row[outlineIdx];
                dbg('[往期大纲匹配] 找到匹配的大纲内容:', rowIndex, rowTime);
              }
            });
          }
        }
      });
    }
  });

  const $overlay = $(`
    <div class="ci-news-history-overlay ci-edit-overlay">
      <div class="ci-news-history-card ci-edit-card" style="max-width: 500px; width: 90%;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.history}</div>
          <span class="ci-edit-title">往期报道</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1; max-height: 70vh;">
          <div class="ci-history-accordion" style="display: flex; flex-direction: column; gap: 8px;">
            ${sortedHistory
              .map(
                (item, idx) => `
              <div class="ci-history-item" style="border: 1px solid rgba(var(--ci-text-rgb), 0.1); border-radius: 8px; overflow: hidden;">
                <div class="ci-history-item-title" style="padding: 10px 12px; background: rgba(var(--ci-text-rgb), 0.03); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #666;">
                  <span>第 ${item.index} 报道 (${item.time})</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="ci-history-edit-btn" style="opacity: 0.7; cursor: pointer;" title="编辑" data-index="${item.index}" data-time="${item.time}">${ICONS.edit}</span>
                    <span style="opacity: 0.5;">${idx === 0 ? '最新' : ''} ${ICONS.resize}</span>
                  </div>
                </div>
                <div class="ci-history-item-content" style="padding: 12px; display: ${idx === 0 ? 'block' : 'none'}; font-size: 12px; line-height: 1.6; background: #fff; border-top: 1px solid rgba(var(--ci-text-rgb), 0.05); color: #666;">
                  ${item.matchedOutline ? `<div class="ci-worldinfo-matched-outline" style="margin-bottom: 8px;">大纲：${item.matchedOutline}</div>` : ''}
                  <div style="white-space: pre-wrap;">${item.content}</div>
                  ${
                    Object.entries(item.details || {}).length > 0
                      ? `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.05); opacity: 0.8;">
                      ${Object.entries(item.details)
                        .map(([k, v]) => `<div>【${k}：${v}】</div>`)
                        .join('')}
                    </div>
                  `
                      : ''
                  }
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-history-item-title').on('click', function () {
    const $content = $(this).next('.ci-history-item-content');
    const isVisible = $content.is(':visible');
    $overlay.find('.ci-history-item-content').slideUp(200);
    if (!isVisible) {
      $content.slideDown(200);
    }
  });

  // 往期报道编辑按钮事件
  $overlay.find('.ci-history-edit-btn').on('click', function (e: any) {
    e.stopPropagation();
    const targetIndex = $(this).data('index');
    const targetTime = $(this).data('time');
    showHistoryItemEditOverlay(targetIndex, targetTime);
  });
}

// 世界信息编辑遮罩
function showWorldInfoEditOverlay() {
  // 辅助函数：查找列索引
  const getCol = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  const worldInfo = state.cachedData.worldInfo;

  const $overlay = $(`
    <div class="ci-worldinfo-edit-overlay ci-edit-overlay">
      <div class="ci-worldinfo-edit-card ci-edit-card" style="max-width: 800px; width: 90%;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.world}</div>
          <span class="ci-edit-title">编辑世界信息</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <!-- 滚动新闻条编辑区域 -->
            <div class="ci-worldinfo-edit-section" style="border: 2px solid rgba(76, 175, 80, 0.3); border-radius: 8px; padding: 12px; background: rgba(76, 175, 80, 0.05); cursor: pointer;" data-section="ticker">
              <div style="font-weight: 600; color: #4caf50; margin-bottom: 8px;">滚动新闻条</div>
              <div style="font-size: 12px; color: #666;">点击编辑滚动显示的新闻内容</div>
            </div>

            <!-- 最新信息区编辑区域 -->
            <div class="ci-worldinfo-edit-section" style="border: 2px solid rgba(33, 150, 243, 0.3); border-radius: 8px; padding: 12px; background: rgba(33, 150, 243, 0.05); cursor: pointer;" data-section="latest">
              <div style="font-weight: 600; color: #2196f3; margin-bottom: 8px;">最新信息区</div>
              <div style="font-size: 12px; color: #666;">点击编辑最新报道和总结内容</div>
            </div>

            <!-- 势力信息区编辑区域 -->
            <div class="ci-worldinfo-edit-section" style="border: 2px solid rgba(255, 152, 0, 0.3); border-radius: 8px; padding: 12px; background: rgba(255, 152, 0, 0.05); cursor: pointer;" data-section="forces">
              <div style="font-weight: 600; color: #ff9800; margin-bottom: 8px;">势力信息区</div>
              <div style="font-size: 12px; color: #666;">点击编辑组织和势力信息</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  // 绑定事件
  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  // 区域点击事件
  $overlay.find('.ci-worldinfo-edit-section').on('click', function () {
    const section = $(this).data('section');
    $overlay.remove();

    if (section === 'ticker') {
      showWorldInfoTickerEdit();
    } else if (section === 'latest') {
      showWorldInfoLatestEdit();
    } else if (section === 'forces') {
      showWorldInfoForcesEdit();
    }
  });
}

// 往期报道项编辑遮罩
function showHistoryItemEditOverlay(targetIndex: any, targetTime: any) {
  const worldInfo = state.cachedData.worldInfo;
  const historyItem = worldInfo.summaryHistory?.find(item => item.index == targetIndex && item.time == targetTime);

  if (!historyItem) {
    showToast('未找到对应的报道数据', 'error');
    return;
  }

  // 查找对应的数据行
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  let outlineRow: any = null;
  let summaryRow: any = null;
  let outlineTable: any = null;
  let summaryTable: any = null;

  // 辅助函数：查找列索引
  const getColHelper = (h: any[], ns: string[]) =>
    h.findIndex(x => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  if (api && api.exportTableAsJson) {
    const rawData = api.exportTableAsJson();
    const allTables = Object.values(rawData);

    // 查找大纲表和总结表
    allTables.forEach((table: any) => {
      if (!table || !table.name || !table.content || !table.content[0]) return;
      const tableName = table.name;
      const h = table.content[0] || [];
      const rows = table.content.slice(1);

      if (tableName.includes('大纲')) {
        outlineTable = table;
        const outlineIdx = getColHelper(h, ['大纲', '概要', '内容']);
        const indexIdx = getColHelper(h, ['索引', '编码', '编号']);
        const timeIdx = getColHelper(h, ['时间', '时间跨度', '日期']);

        if (outlineIdx > -1) {
          rows.forEach((row: any) => {
            const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
            const rowTime = timeIdx > -1 ? row[timeIdx] : '';
            if (rowIndex == targetIndex && rowTime == targetTime) {
              outlineRow = row;
            }
          });
        }
      } else if (tableName.includes('总结表') || tableName.includes('总结')) {
        summaryTable = table;
        const summaryIdx = getColHelper(h, ['纪要', '总结', '内容', '摘要']);
        const indexIdx = getColHelper(h, ['索引', '编码', '编号']);
        const timeIdx = getColHelper(h, ['时间', '时间跨度', '日期']);

        if (summaryIdx > -1) {
          rows.forEach((row: any) => {
            const rowIndex = indexIdx > -1 ? row[indexIdx] : '';
            const rowTime = timeIdx > -1 ? row[timeIdx] : '';
            if (rowIndex == targetIndex && rowTime == targetTime) {
              summaryRow = row;
            }
          });
        }
      }
    });
  }

  // 创建编辑表单
  let outlineFields = '';
  let summaryFields = '';

  // 生成大纲表字段
  if (outlineTable && outlineTable.content && outlineTable.content[0]) {
    const h = outlineTable.content[0];
    outlineFields = h
      .map((colName: string, originalIdx: number) => ({ colName, originalIdx }))
      .filter(({ colName }) => colName && colName.trim() !== '')
      .map(({ colName, originalIdx }) => {
        const value = outlineRow ? outlineRow[originalIdx] || '' : '';
        return `
        <div class="ci-input-group">
          <label>${colName}</label>
          <textarea class="ci-input-field" data-table="outline" data-col="${originalIdx}" rows="2">${value}</textarea>
        </div>
      `;
      })
      .join('');
  }

  // 生成总结表字段
  if (summaryTable && summaryTable.content && summaryTable.content[0]) {
    const h = summaryTable.content[0];
    summaryFields = h
      .map((colName: string, originalIdx: number) => ({ colName, originalIdx }))
      .filter(({ colName }) => colName && colName.trim() !== '')
      .map(({ colName, originalIdx }) => {
        const value = summaryRow ? summaryRow[originalIdx] || '' : '';
        return `
        <div class="ci-input-group">
          <label>${colName}</label>
          <textarea class="ci-input-field" data-table="summary" data-col="${originalIdx}" rows="2">${value}</textarea>
        </div>
      `;
      })
      .join('');
  }

  const $overlay = $(`
    <div class="ci-history-edit-overlay ci-edit-overlay">
      <div class="ci-history-edit-card ci-edit-card" style="max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.history}</div>
          <span class="ci-edit-title">编辑往期报道</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 20px;">
          ${
            outlineFields
              ? `
            <div style="margin-bottom: 24px; padding: 16px; background: rgba(76, 175, 80, 0.05); border: 1px solid rgba(76, 175, 80, 0.2); border-radius: 8px;">
              <h4 style="margin: 0 0 16px 0; color: #4caf50; font-size: 14px;">大纲表数据</h4>
              ${outlineFields}
            </div>
          `
              : ''
          }

          ${
            summaryFields
              ? `
            <div style="padding: 16px; background: rgba(33, 150, 243, 0.05); border: 1px solid rgba(33, 150, 243, 0.2); border-radius: 8px;">
              <h4 style="margin: 0 0 16px 0; color: #2196f3; font-size: 14px;">总结表数据</h4>
              ${summaryFields}
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

  $('body').append($overlay);

  // 绑定事件
  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  // 保存事件
  $overlay.find('.ci-edit-save-btn').on('click', async function () {
    const updates: any[] = [];

    $overlay.find('.ci-input-field').each(function () {
      const $field = $(this);
      const table = $field.data('table');
      const col = $field.data('col');
      const value = $field.val();

      updates.push({ table, col, value });
    });

    // 保存数据到对应的表格
    if (api && api.exportTableAsJson && api.importTableAsJson) {
      const rawData = api.exportTableAsJson();

      updates.forEach(update => {
        const { table, col, value } = update;
        let targetTable = null;

        if (table === 'outline' && outlineTable) {
          // 通过表名找到对应的表对象
          for (const key in rawData) {
            if (rawData[key] && rawData[key].name === outlineTable.name) {
              targetTable = rawData[key];
              break;
            }
          }
        } else if (table === 'summary' && summaryTable) {
          // 通过表名找到对应的表对象
          for (const key in rawData) {
            if (rawData[key] && rawData[key].name === summaryTable.name) {
              targetTable = rawData[key];
              break;
            }
          }
        }

        if (targetTable && targetTable.content) {
          // 找到对应的行
          for (let i = 1; i < targetTable.content.length; i++) {
            const row = targetTable.content[i];
            const indexIdx = getColHelper(targetTable.content[0], ['索引', '编码', '编号']);
            const timeIdx = getColHelper(targetTable.content[0], ['时间', '时间跨度', '日期']);

            const rowIndex =
              getColHelper(targetTable.content[0], ['索引', '编码', '编号']) > -1
                ? row[getColHelper(targetTable.content[0], ['索引', '编码', '编号'])]
                : '';
            const rowTime =
              getColHelper(targetTable.content[0], ['时间', '时间跨度', '日期']) > -1
                ? row[getColHelper(targetTable.content[0], ['时间', '时间跨度', '日期'])]
                : '';

            if (rowIndex == targetIndex && rowTime == targetTime) {
              row[col] = value;
              break;
            }
          }
        }
      });

      // 修复导入报错：确保 mate 结构存在
      if (!rawData.mate) {
        rawData.mate = { type: 'chatSheets', version: 1 };
      }

      // 保存数据
      await performDirectInjection(rawData);
      try {
        if (api.importTableAsJson) await api.importTableAsJson(JSON.stringify(rawData));
        showToast('报道数据已保存', 'success');

        // 重新提取数据并更新面板
        state.cachedData = processData(rawData);
        updateOpenPanels();
        $overlay.remove();
      } catch (e: any) {
        showToast('保存失败: ' + e.message, 'error');
        dbg('[往期报道保存] 保存出错:', e);
        return;
      }

      $overlay.remove();
    }
  });
}

// 世界信息势力编辑
function showWorldInfoForceEdit(forceIndex: number) {
  const forces = state.cachedData.worldInfo?.forces || [];
  const force = forces[forceIndex];

  if (!force) {
    showToast('未找到对应的势力信息', 'error');
    return;
  }

  $('.ci-force-edit-overlay').remove();

  // 根据force对象的实际字段动态生成编辑界面，只显示有内容的字段
  const editFields = [];

  // 势力名称（如果有内容）
  if (force.name && force.name.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">势力名称</label>
        <input class="ci-input-field" data-field="name" value="${force.name || ''}">
      </div>
    `);
  }

  // 领袖/首领（如果有内容）
  if (force.leader && force.leader.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">领袖/首领</label>
        <input class="ci-input-field" data-field="leader" value="${force.leader || ''}">
      </div>
    `);
  }

  // 宗旨/理念（如果有内容）
  if (force.purpose && force.purpose.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">宗旨/理念</label>
        <textarea class="ci-input-field" data-field="purpose" rows="2">${force.purpose || ''}</textarea>
      </div>
    `);
  }

  // 描述/介绍（如果有内容）
  if (force.desc && force.desc.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">描述/介绍</label>
        <textarea class="ci-input-field" data-field="desc" rows="3">${force.desc || ''}</textarea>
      </div>
    `);
  }

  // 其他详细信息（如果有内容）
  if (force.details && Object.keys(force.details).length > 0) {
    const detailsFields = Object.entries(force.details)
      .filter(([key, value]) => value && String(value).trim() !== '')
      .map(
        ([key, value]) => `
        <div class="ci-input-group" style="margin-bottom:8px;">
          <label style="font-size:12px; color:#666;">${key}</label>
          <input class="ci-input-field" data-field="detail-${key}" value="${value || ''}" style="font-size:12px;">
        </div>
      `,
      )
      .join('');

    if (detailsFields) {
      editFields.push(`
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid #eee;">
          <div style="font-size:13px; font-weight:500; margin-bottom:8px; color:#666;">其他信息</div>
          ${detailsFields}
        </div>
      `);
    }
  }

  const $overlay = $(`
    <div class="ci-force-edit-overlay ci-edit-overlay">
      <div class="ci-force-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.relation}</div>
          <span class="ci-edit-title">编辑势力信息</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1;">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer" style="padding:16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
          <button class="ci-edit-save-btn">${ICONS.save} 保存修改</button>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-edit-save-btn').on('click', async () => {
    const newData = {
      name: $overlay.find('[data-field="name"]').val(),
      leader: $overlay.find('[data-field="leader"]').val(),
      purpose: $overlay.find('[data-field="purpose"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      details: {} as any,
    };

    // 收集详细信息
    $overlay.find('[data-field^="detail-"]').each(function () {
      const key = $(this).data('field').replace('detail-', '');
      const value = $(this).val();
      if (value) {
        newData.details[key] = value;
      }
    });

    // 调用保存函数
    await saveForceData(force, newData);
    $overlay.remove();
  });
}

// 世界信息事件编辑
function showWorldInfoEventEdit(eventIndex: number) {
  const tasks = state.cachedData.worldInfo?.tasks || [];
  const task = tasks[eventIndex];

  if (!task) {
    showToast('未找到对应的事件信息', 'error');
    return;
  }

  $('.ci-event-edit-overlay').remove();

  // 根据task对象的实际字段动态生成编辑界面，只显示有内容的字段
  const editFields = [];

  // 事件名称（如果有内容）
  if (task.name && task.name.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">事件名称</label>
        <input class="ci-input-field" data-field="name" value="${task.name || ''}">
      </div>
    `);
  }

  // 类型和状态（如果有内容）
  const typeStatusFields = [];
  if (task.type && task.type.trim() !== '') {
    typeStatusFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">类型</label>
        <input class="ci-input-field" data-field="type" value="${task.type || ''}">
      </div>
    `);
  }
  if (task.status && task.status.trim() !== '') {
    typeStatusFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">状态</label>
        <input class="ci-input-field" data-field="status" value="${task.status || ''}">
      </div>
    `);
  }
  if (typeStatusFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row" style="display:flex; gap:12px; margin-bottom:12px;">
        ${typeStatusFields.join('')}
      </div>
    `);
  }

  // 时间和地点（如果有内容）
  const timeLocationFields = [];
  if (task.time && task.time.trim() !== '') {
    timeLocationFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">时间</label>
        <input class="ci-input-field" data-field="time" value="${task.time || ''}">
      </div>
    `);
  }
  if (task.location && task.location.trim() !== '') {
    timeLocationFields.push(`
      <div class="ci-input-group" style="flex:1;">
        <label class="ci-input-label">地点</label>
        <input class="ci-input-field" data-field="location" value="${task.location || ''}">
      </div>
    `);
  }
  if (timeLocationFields.length > 0) {
    editFields.push(`
      <div class="ci-input-row" style="display:flex; gap:12px; margin-bottom:12px;">
        ${timeLocationFields.join('')}
      </div>
    `);
  }

  // 发布者（如果有内容）
  if (task.publisher && task.publisher.val && task.publisher.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.publisher.label || '发布者'}</label>
        <input class="ci-input-field" data-field="publisher" value="${task.publisher.val || ''}">
      </div>
    `);
  }

  // 执行者（如果有内容）
  if (task.executor && task.executor.val && task.executor.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.executor.label || '执行者'}</label>
        <input class="ci-input-field" data-field="executor" value="${task.executor.val || ''}">
      </div>
    `);
  }

  // 奖励（如果有内容）
  if (task.reward && task.reward.val && task.reward.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.reward.label || '奖励'}</label>
        <textarea class="ci-input-field" data-field="reward" rows="2">${task.reward.val || ''}</textarea>
      </div>
    `);
  }

  // 惩罚（如果有内容）
  if (task.penalty && task.penalty.val && task.penalty.val.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">${task.penalty.label || '惩罚'}</label>
        <textarea class="ci-input-field" data-field="penalty" rows="2">${task.penalty.val || ''}</textarea>
      </div>
    `);
  }

  // 描述/详情（如果有内容）
  if (task.desc && task.desc.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group">
        <label class="ci-input-label">描述/详情</label>
        <textarea class="ci-input-field" data-field="desc" rows="3">${task.desc || ''}</textarea>
      </div>
    `);
  }

  const $overlay = $(`
    <div class="ci-event-edit-overlay ci-edit-overlay">
      <div class="ci-event-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.task}</div>
          <span class="ci-edit-title">编辑事件信息</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1;">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer" style="padding:16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
          <button class="ci-edit-save-btn">${ICONS.save} 保存修改</button>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-edit-save-btn').on('click', async () => {
    const newData = {
      name: $overlay.find('[data-field="name"]').val(),
      type: $overlay.find('[data-field="type"]').val(),
      status: $overlay.find('[data-field="status"]').val(),
      time: $overlay.find('[data-field="time"]').val(),
      location: $overlay.find('[data-field="location"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      publisher: task.publisher
        ? {
            label: task.publisher.label,
            val: $overlay.find('[data-field="publisher"]').val(),
          }
        : null,
      executor: task.executor
        ? {
            label: task.executor.label,
            val: $overlay.find('[data-field="executor"]').val(),
          }
        : null,
      reward: task.reward
        ? {
            label: task.reward.label,
            val: $overlay.find('[data-field="reward"]').val(),
          }
        : null,
      penalty: task.penalty
        ? {
            label: task.penalty.label,
            val: $overlay.find('[data-field="penalty"]').val(),
          }
        : null,
    };

    // 调用保存函数
    await saveEventData(task, newData);
    $overlay.remove();
  });
}

(function waitForJQuery() {
  const jq = (window as any).jQuery || (window.parent as any).jQuery || (window as any).$;
  if (jq) {
    initApp(jq);
  } else {
    setTimeout(waitForJQuery, 100);
  }
})();
