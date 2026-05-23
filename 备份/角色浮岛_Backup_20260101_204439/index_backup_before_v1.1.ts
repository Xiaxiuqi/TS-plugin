// 备份文件 - v1.0版本代码备份
// 创建时间: 2026-01-01
// 用途: 为v1.1版本更新前的代码备份

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
