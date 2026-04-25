import { teleportStyle } from '../../util/script';
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

const SCRIPT_ID = 'char_island_v7_9_fixed';
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

console.log('%c[浮岛] 脚本加载中... (v7.9 - REWRITE 2)', 'color: #00ff00; font-weight: bold; font-size: 16px;');

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

let storedOpacity: any;
try {
  storedOpacity = JSON.parse(localStorage.getItem(STORAGE_OPACITY_KEY) || '{"main": 1, "map": 1}');
} catch (e) {
  storedOpacity = { main: 1, map: 1 };
}
if (typeof storedOpacity !== 'object' || !storedOpacity) storedOpacity = { main: 1, map: 1 };

let state = {
  isExpanded: false,
  activeCategory: null,
  isOptionsOpen: false,
  isMapOpen: false,
  isMapPinned: false,
  theme: localStorage.getItem(STORAGE_THEME_KEY) || 'light',
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
  mapLayout: JSON.parse(localStorage.getItem(STORAGE_MAP_LAYOUT_KEY) || '{}'),
  optionsData: [] as string[],
  customCategories: JSON.parse(localStorage.getItem(STORAGE_CUSTOM_CATEGORIES_KEY) || '{}'),
  drag: { active: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, rafId: null as number | null },
  isGlobalDragging: false,
  resize: { active: false, mode: null, startX: 0, startY: 0, startW: 0, startH: 0, startLeft: 0 },
  currentUploadChar: null as any,
  isEditing: false,
  lastExpandedCardName: null as string | null,
  bagPagination: {} as Record<string, number>,
};

function applyOpacity(type: 'main' | 'map', val: number) {
  state.opacity[type] = val;
  localStorage.setItem(STORAGE_OPACITY_KEY, JSON.stringify(state.opacity));
  if (type === 'main') {
    $('#ci-panel').css('opacity', val);
    $('#ci-island-container').css('opacity', val);
    $('.ci-options-container').css('opacity', val);
  } else {
    $('#ci-map-panel').css('opacity', val);
  }
}

function applyTheme(themeId: string) {
  state.theme = themeId;
  localStorage.setItem(STORAGE_THEME_KEY, themeId);
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
  localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(state.customCategories));
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
  let winW = win.innerWidth || 1024;
  let winH = win.innerHeight || 768;
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
        opt1: getCol(h, ['互动选项1', 'Option1']),
        opt2: getCol(h, ['互动选项2', 'Option2']),
        opt3: getCol(h, ['互动选项3', 'Option3']),
      };
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
      let storage = win.localStorage;
      if (!storage.getItem(STORAGE_KEY_V5_SETTINGS) && win.parent)
        try {
          storage = win.parent.localStorage;
        } catch (e) {}
      const settingsStr = storage.getItem(STORAGE_KEY_V5_SETTINGS);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.dataIsolationEnabled && settings.dataIsolationCode) isolationKey = settings.dataIsolationCode;
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
        $e.find('.ci-edit-close').click(() => $e.remove());
        $e.find('.ci-edit-save-btn').click(() => {
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
    $a.find('.ci-edit-close').click(() => $a.remove());
    $a.find('.ci-edit-save-btn').click(() => {
      const n = $a.find('[data-f="name"]').val();
      if (n) {
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
  $modal.find('.ci-inv-close').click(() => $modal.remove());
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
    const localImg = localStorage.getItem(STORAGE_AVATAR_PREFIX + d.name);
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
      `<div class="ci-card" id="card-${d.name}"><div class="ci-card-compact"><div class="ci-menu-trigger">${ICONS.dots}</div><div class="ci-card-menu-popover"><div class="ci-menu-item" data-move="main">主要</div><div class="ci-menu-item" data-move="side">次要</div><div class="ci-menu-item" data-move="retired">离场</div></div><div class="ci-card-avatar">${avatarHtml}</div><div class="ci-card-name">${d.name}</div><div class="ci-card-role">${d.job || d.desc || '-'}</div><div class="ci-card-info">${d.sex} · ${d.age}</div>${tags}</div><div class="ci-expanded-box" style="display:none;"><div class="ci-nb-left"><div class="ci-big-avatar-box">${avatarHtml}</div><div class="ci-info-scroll"><div class="ci-detail-row"><span class="ci-label">姓名</span><span class="ci-val">${d.name}</span></div><div class="ci-long-goal">${d.longGoal || ''}</div></div></div><div class="ci-nb-right"><div class="ci-equip-ui"></div><div class="ci-bag-section"><div class="ci-bag-header">物品 <span class="ci-bag-expand-btn">${ICONS.expand_box}</span></div><div class="ci-bag-container-inner"></div></div></div></div></div>`,
    );
    $card.click(e => {
      if ($(e.target).closest('.ci-menu-trigger, .ci-menu-item, .ci-bag-section').length) return;
      if ($card.hasClass('is-expanded')) {
        $card.removeClass('is-expanded').find('.ci-expanded-box').hide();
        $card.find('.ci-card-compact').show();
        state.lastExpandedCardName = null;
      } else {
        $grid.find('.is-expanded').removeClass('is-expanded').find('.ci-expanded-box').hide();
        $grid.find('.ci-card-compact').show();
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
    $card.find('.ci-bag-section').click(function (e) {
      if (state.isEditing) {
        e.stopPropagation();
        manageInventory(d.name, d.items);
      }
    });
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
    const $btn = $(`<div class="ci-ext-btn">${area}</div>`);
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
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  let left = x + 10;
  let top = y;
  if (left + 150 > winW) left = x - 160;
  if (top + 100 > winH) top = winH - 100;
  $popup.css({
    position: 'fixed',
    left: left + 'px',
    top: top + 'px',
    zIndex: 2005,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  });
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
        if (state.isGlobalDragging) return;
        e.stopPropagation();
        const rect = (e.target as Element).getBoundingClientRect();
        showMapPopup(rect.left + rect.width / 2, rect.top, [`前往 ${l.name}`]);
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
        const rx = pseudoRandom(seedBase + i * 100);
        const ry = pseudoRandom(seedBase + i * 100 + 1);
        let x = l.x + 10 + rx * (l.width - 20 - defaultSize);
        let y = l.y + 10 + ry * (l.height - 20 - defaultSize);
        let size = defaultSize;
        if (state.mapLayout[el.name]) {
          x = state.mapLayout[el.name].x;
          y = state.mapLayout[el.name].y;
          if (state.mapLayout[el.name].size) size = state.mapLayout[el.name].size;
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
            const rect = (e.target as Element).getBoundingClientRect();
            if (el.interactions && el.interactions.length > 0) {
              showMapPopup(rect.left + rect.width / 2, rect.top, el.interactions);
            } else {
              const opts = [];
              if (item.isNPC) opts.push(`交谈 ${el.name}`, `观察 ${el.name}`);
              else if (item.isItem) opts.push(`拾取 ${el.name}`, `检查 ${el.name}`);
              else opts.push(`互动 ${el.name}`);
              showMapPopup(rect.left + rect.width / 2, rect.top, opts);
            }
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
        const localImg = localStorage.getItem(STORAGE_AVATAR_PREFIX + char.name);
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
          localStorage.getItem(STORAGE_AVATAR_PREFIX + '主角') ||
          localStorage.getItem(STORAGE_AVATAR_PREFIX + 'Player');
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
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span style="font-weight:bold;font-size:16px;">浮岛设置 <span style="font-size:10px;font-weight:normal;opacity:0.6;">v7.9 (Final Fix)</span></span><span class="ci-close-btn">${ICONS.close}</span></div>`,
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
    const $resetBtn = $(
      `<button class="ci-btn" style="width:100%;border:1px solid var(--ci-border);border-radius:8px;margin-top:10px;">重置浮岛位置</button>`,
    );
    $resetBtn.click(() => {
      $('#ci-island-container').css({ top: '150px', right: '80px', left: 'auto', display: 'flex' });
      localStorage.removeItem(STORAGE_POS_KEY);
      showToast('位置已重置');
    });
    $card.append($header).append($themeSec).append($opacitySec).append($resetBtn);
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
    localStorage.setItem(STORAGE_MAP_LAYOUT_KEY, JSON.stringify(state.cachedData.mapLayout));
    showToast('地图布局已保存');
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
                <div class="ci-panel-header ci-drag-handle"><span id="ci-panel-title">角色列表</span><div style="display:flex;gap:10px;"><span class="ci-edit-btn" title="编辑模式">${ICONS.edit}</span><span class="ci-close-btn">${ICONS.close}</span></div></div>
                <div class="ci-panel-content"><div class="ci-grid-view"></div></div><div class="ci-resize-handle ci-resize-br" data-mode="br">${ICONS.resize}</div><div class="ci-resize-handle ci-resize-bl" data-mode="bl">${ICONS.resize}</div>
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
      const pos = JSON.parse(localStorage.getItem(STORAGE_POS_KEY) || 'null');
      if (pos && typeof pos.top === 'number' && typeof pos.left === 'number' && !isNaN(pos.top) && !isNaN(pos.left)) {
        $con.css({ top: pos.top, left: pos.left, right: 'auto' });
      } else {
        $con.css({ top: '150px', right: '80px', left: 'auto' });
      }
      const size = JSON.parse(localStorage.getItem(STORAGE_PANEL_SIZE_KEY) || 'null');
      if (size) $pan.css({ width: size.width, height: size.height });
      const mapSize = JSON.parse(localStorage.getItem(STORAGE_MAP_SIZE_KEY) || 'null');
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
      targetLeft = islandLeft + islandW + gap + 'px';
      align = 'flex-start';
    } else {
      targetRight = winW - islandLeft + gap + 'px';
      isFlipped = true;
    }
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
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({ top: safePos.top, left: safePos.left }));
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
          if ($(e.target).closest('.ci-close-btn, .ci-edit-btn, .ci-pin-btn').length) return;
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
            let newH = Math.max(200, startH + deltaY);
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
            localStorage.setItem(
              STORAGE_PANEL_SIZE_KEY,
              JSON.stringify({ width: $targetPanel.width(), height: $targetPanel.height() }),
            );
          } else {
            localStorage.setItem(
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
  $pan
    .add($mapPan)
    .find('.ci-edit-btn')
    .on('click', function () {
      state.isEditing = !state.isEditing;
      $('.ci-edit-btn').toggleClass('active', state.isEditing);
      $pan.toggleClass('ci-editing', state.isEditing);
      $mapPan.toggleClass('ci-editing', state.isEditing);
      if (state.isEditing) $('.ci-save-layout-btn').show();
      else $('.ci-save-layout-btn').hide();
      if ($mapPan.hasClass('visible')) {
        const offset = $('#ci-island-container').offset();
        if (offset) syncPanelPosition($('#ci-island-container'), $mapPan, offset.left, offset.top);
      }
      showToast(state.isEditing ? '进入编辑模式' : '退出编辑模式');
      if (state.isMapOpen) renderMap();
    });
  $mapPan.find('.ci-save-layout-btn').on('click', function () {
    saveMapLayout();
  });
  $mapPan.find('.ci-pin-btn').on('click', function () {
    state.isMapPinned = !state.isMapPinned;
    $(this).toggleClass('active', state.isMapPinned);
    $mapPan.toggleClass('pinned', state.isMapPinned);
    showToast(state.isMapPinned ? '地图已固定' : '地图取消固定');
  });
  $('#ci-options-btn').on('click', function (e: any) {
    e.stopPropagation();
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
          });
          $ops.append($bubble);
        });
        $ops.addClass('visible');
        const offset = $con.offset();
        syncOptionsPosition(offset.left, offset.top);
      } else {
        dbg('No options data');
      }
    } else {
      $ops.removeClass('visible');
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
        localStorage.setItem(STORAGE_AVATAR_PREFIX + charName, res);
        showToast('头像上传成功');
        if (state.activeCategory) renderGrid(state.activeCategory, $pan);
        if (state.isMapOpen) renderMap();
      }
    };
    reader.readAsDataURL(file);
    $(this).val('');
  });
  const globalClickHandler = (e: any) => {
    if (
      $(e.target).closest(
        '#ci-island-container, #ci-panel, #ci-map-panel, .ci-options-container, .ci-edit-overlay, .ci-map-popup-options, .ci-settings-overlay, .ci-settings-card',
      ).length
    )
      return;
    $('.ci-map-popup-options').remove();
    if (state.isGlobalDragging || state.drag.active) return;
    const isPanelOpen = $pan.hasClass('visible');
    const isMapOpen = state.isMapOpen;
    const isOptionsOpen = state.isOptionsOpen;
    if (isPanelOpen || isMapOpen || isOptionsOpen) {
      closePanels($con, $pan, $mapPan);
    } else if (state.isExpanded) {
      collapseIsland($con);
    }
  };
  $(document).on('click', globalClickHandler);
  try {
    $(window.parent.document).on('click', globalClickHandler);
  } catch (e) {}
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
