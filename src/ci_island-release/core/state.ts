/**
 * 浮岛全局状态管理
 * 集中管理 UI 交互状态、缓存数据、拖拽状态等
 */
import {
  STORAGE_THEME_KEY,
  STORAGE_OPACITY_KEY,
  STORAGE_CUSTOM_CATEGORIES_KEY,
  STORAGE_MAP_LAYOUT_KEY,
} from './constants';
import { safeGetItem } from './storage';

// 解析存储的透明度配置
let storedOpacity: any;
try {
  storedOpacity = JSON.parse(safeGetItem(STORAGE_OPACITY_KEY, '{"main": 1, "island": 1, "map": 1}'));
} catch (e) {
  storedOpacity = { main: 1, island: 1, map: 1 };
}
if (typeof storedOpacity !== 'object' || !storedOpacity) {
  storedOpacity = { main: 1, island: 1, map: 1 };
}

export interface CachedData {
  main: any[];
  side: any[];
  retired: any[];
  mapLocations: any[];
  mapElements: any[];
  protagonistLoc: string;
  hasMapTable: boolean;
  hasSkillsTable: boolean;
  hasLongGoal: boolean;
  externalAreas: string[];
  relations: any[];
  allItems: any[];
  allSkills: any[];
  protagonistName: string;
  charExtraInfo: Record<string, any>;
  worldInfo: {
    tasks: any[];
    forces: any[];
    summary: any;
    summaryHistory: any[];
    outline: any;
    matchedOutline: any;
    newsItems: string[];
  };
  mapLayout: any;
}

export const state = {
  isExpanded: false,
  activeCategory: null as string | null,
  isOptionsOpen: false,
  isMapOpen: false,
  isMapPinned: false,
  isRelationOpen: false,
  isInventoryOpen: false,
  isSkillsOpen: false,
  isInventoryMenuOpen: false,
  isWorldInfoOpen: false,
  autoRedrawRelation: safeGetItem('ci_auto_redraw_relation', 'true') === 'true',
  /** 静默调试模式：开启时仅保留基础 debug 条目（关键错误等），不影响 toast 通知 */
  silentDebug: safeGetItem('ci_silent_debug', 'false') === 'true',
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
    hasSkillsTable: false,
    hasLongGoal: false,
    externalAreas: [],
    relations: [],
    allItems: [],
    allSkills: [],
    protagonistName: '',
    charExtraInfo: {},
    worldInfo: {
      tasks: [],
      forces: [],
      summary: null,
      summaryHistory: [],
      outline: null,
      matchedOutline: null,
      newsItems: [],
    },
    mapLayout: null,
  } as CachedData,
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
  giftMode: false,
  takeMode: false,
  selectedItems: [] as any[],
  giftMenuExpanded: false,
  panelSide: null as 'left' | 'right' | null,
  panelStack: [] as string[],
  // 地图缩放状态
  mapScale: 1 as number,
  mapTranslateX: 0 as number,
  mapTranslateY: 0 as number,
};

// z-index 计数器（用于面板置顶）
export let zIndexCounter = 2100;

export function incrementZIndex(): number {
  zIndexCounter += 1;
  return zIndexCounter;
}
