/**
 * 浮岛主应用入口（模块化版本）
 * 整合 core/ui/data/panels/dialogs 等所有模块
 *
 * 完整初始化逻辑见原 src/ci_island_test/index.ts:10733 initApp
 */
import { TELEPORT_ATTR, stopWatchingStyles } from './pre-style-snapshot';
import { state } from './core/state';
import { dbg } from './core/utils';
import { safeSetItem } from './core/storage';
import { STORAGE_CUSTOM_CATEGORIES_KEY } from './core/constants';
import { showToast } from './ui/toast';

import { applyTheme, applyOpacity } from './ui/theme';
import { createUI } from './ui/skeleton';
import { addSettingsToExtensionMenu } from './ui/extension-menu';
import { createSettingsUI } from './ui/settings';
import { bindEvents } from './ui/events';

import { getApi } from './data/api';
import { processData } from './data/processor';

import {
  setCharPanelCallbacks,
  renderGrid,
  renderBagContent,
  createCardElement,
} from './panels/characters';
import { renderRelationGraph, setRelationPanelCallbacks } from './panels/relation';
import {
  renderInventoryPanel,
  setInventoryPanelCallbacks,
  showItemDetail,
} from './panels/inventory';
import {
  renderSkillsPanel,
  setSkillsPanelCallbacks,
} from './panels/skills';
import { renderWorldInfoPanel, setWorldInfoPanelCallbacks } from './panels/worldinfo';
import {
  renderMap,
  setMapPanelCallbacks,
  saveMapLayout,
  bindMapControls,
  bindMapSplitter,
} from './panels/map';

import {
  getPronounByChar,
  getProtagonistName as utilGetProtagonistName,
  getPresentCharacterList as utilGetPresentCharacterList,
} from './core/utils';

import {
  showCharEditDialog,
  createAvatarSelectionModal,
  showArchiveEditDialog,
  showWorldInfoForceEdit,
  showWorldInfoEventEdit,
  showHistoryItemEditOverlay,
  loadCropperLibrary,
  createCropperModal,
  showWorldInfoEditOverlay,
} from './dialogs';


declare const $: any;

/**
 * 通用：刷新所有打开的面板
 */
export function updateOpenPanels(): void {
  if (state.activeCategory) {
    renderGrid(state.activeCategory, $('#ci-panel'));
    dbg('[实时更新] 角色面板已更新');
  }

  if (state.isRelationOpen) {
    const $relPanel = $('#ci-relation-panel');
    if ($relPanel.length && $relPanel.is(':visible')) {
      renderRelationGraph($relPanel.find('.ci-relation-content'));
    }
  }

  const $invPanel = $('#ci-inventory-panel');
  if ($invPanel.length && $invPanel.is(':visible')) {
    const $invContent = $invPanel.find('.ci-inventory-content');
    const viewMode = $invContent.find('.ci-inv-tab.active').data('view') || 'warehouse';
    renderInventoryPanel($invContent, viewMode);
  }

  const $skillsPanel = $('#ci-skills-panel');
  if ($skillsPanel.length && $skillsPanel.is(':visible')) {
    const $content = $skillsPanel.find('.ci-skills-content');
    const viewMode = $content.find('.ci-inv-tab.active').data('view') || 'character';
    renderSkillsPanel($content, viewMode);
  }

  const $worldPanel = $('#ci-worldinfo-panel');
  if ($worldPanel.length && $worldPanel.is(':visible')) {
    renderWorldInfoPanel($worldPanel.find('.ci-worldinfo-content'));
  }

  if (state.isMapOpen) {
    renderMap();
  }
}

/**
 * 应用初始化
 * @param jQueryInstance jQuery 实例
 */
/**
 * 把脚本 iframe head 中带 TELEPORT_ATTR 标记的 <style> 传送到顶层 document.head
 *
 * - 控制台 import 模式：window.top.document === document，函数直接返回，零开销
 * - 酒馆助手脚本模式：脚本运行在 TH-script-* iframe 中，CSS 注入到 iframe head，
 *   但 DOM 添加在顶层 body（jQuery 取自 window.parent），需要把 CSS 一起传送
 *
 * 资源占用：仅 1 个 <style> 节点克隆到顶层（约 635KB CSS 文本，所有方案都需要）
 */
function teleportOwnStyles(): () => void {
  // 停止 observer，释放监听资源
  stopWatchingStyles();

  let topDoc: Document;
  try {
    topDoc = (window.top && window.top.document) || document;
  } catch (e) {
    topDoc = document; // cross-origin fallback
  }
  if (topDoc === document) {
    dbg('[CSS Teleport] 已在顶层 document，无需传送');
    return () => {};
  }

  // 启动清理：移除可能残留的旧版本（多次重载脚本时）
  topDoc.querySelectorAll(`style[${TELEPORT_ATTR}]`).forEach(s => s.remove());

  // 克隆带标记的 style 到顶层
  const ownStyles = Array.from(document.head.querySelectorAll(`style[${TELEPORT_ATTR}]`));
  const cloned: HTMLElement[] = [];
  ownStyles.forEach(s => {
    const clone = s.cloneNode(true) as HTMLElement;
    topDoc.head.appendChild(clone);
    cloned.push(clone);
  });
  dbg(`[CSS Teleport] 已传送 ${cloned.length} 个 style 到顶层 head`);

  return () => {
    cloned.forEach(c => c.remove());
  };
}

export function initApp(jQueryInstance: any): void {
  (window as any).$ = jQueryInstance;
  (window as any).jQuery = jQueryInstance;

  dbg('Script Initializing (modular version)...');

  // 关键修复：把脚本 iframe head 中的浮岛 CSS 传送到顶层 document.head
  // - 控制台 import 时：document 已是顶层，函数直接 return，零开销
  // - 酒馆助手脚本模式：必须传送，否则 CSS 在 iframe head 而 DOM 在顶层 body，错位失效
  let teleportDestroy: (() => void) | null = null;
  try {
    teleportDestroy = teleportOwnStyles();
  } catch (e) {
    console.warn('[浮岛] CSS 传送失败:', e);
  }

  // 卸载脚本时清理传送的 style，避免重复加载时样式叠加
  jQueryInstance(window).on('pagehide.ci_island_test', () => {
    if (teleportDestroy) teleportDestroy();
  });

  // 创建 UI 骨架
  const { $con, $pan, $ops, $mapPan } = createUI();

  // 绑定全局事件（注入完整回调）
  bindEvents($con, $pan, $ops, $mapPan, {
    refreshData: () => {
      const api = getApi();
      if (api && api.exportTableAsJson) {
        state.cachedData = processData(api.exportTableAsJson());
        updateOpenPanels();
      }
    },
    renderGrid: (type: string, $p: any) => renderGrid(type, $p),
    renderRelationGraph: ($container: any) => renderRelationGraph($container),
    renderInventoryPanel: ($container: any, mode?: string) =>
      renderInventoryPanel($container, mode as any),
    renderSkillsPanel: ($container: any, mode?: string) =>
      renderSkillsPanel($container, mode as any),
    renderWorldInfoPanel: ($container: any) => renderWorldInfoPanel($container),
    renderMap: () => {
      renderMap();
      // 渲染后重新绑定地图交互（缩放、平移、分割条）
      try {
        bindMapControls();
        bindMapSplitter();
      } catch (e) {
        dbg('[地图交互] 绑定失败（非致命）:', e);
      }
    },
    loadCropperLibrary,
    createCropperModal,
    showWorldInfoEditOverlay,
    saveMapLayout,
  });

  // 注入扩展菜单设置项
  addSettingsToExtensionMenu(createSettingsUI);

  // 注入角色面板回调
  setCharPanelCallbacks({
    showCharEditDialog,
    showArchiveEditDialog,
    createAvatarSelectionModal,
    renderBagContent,
    showItemDetail,
    updateCategory: (charName: string, newType: string) => {
      state.customCategories[charName] = newType;
      // 持久化分类设置到 localStorage
      safeSetItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(state.customCategories));
      const api = getApi();
      if (api && api.exportTableAsJson) {
        state.cachedData = processData(api.exportTableAsJson());
        updateOpenPanels();
        const label = newType === 'main' ? '主要' : newType === 'side' ? '次要' : '离场';
        showToast(`已将 ${charName} 移动到 ${label}`);
      }
    },
  });

  // 注入关系图面板回调（提供 createCardElement 以避免循环依赖）
  setRelationPanelCallbacks({
    createCardElement,
  });

  // 注入技能面板回调（使用 core/utils 提供的完整实现）
  setSkillsPanelCallbacks({
    updateOpenPanels,
    getProtagonistName: utilGetProtagonistName,
    getPronounByChar,
    getPresentCharacterList: utilGetPresentCharacterList,
  });

  // 注入物品仓库面板回调（默认走 dialogs/item-edit，留作扩展点）
  setInventoryPanelCallbacks({});

  // 注入世界信息面板回调（已对接 dialogs 模块的真实实现）
  setWorldInfoPanelCallbacks({
    showWorldInfoForceEdit,
    showWorldInfoEventEdit,
    showHistoryItemEditOverlay,
  });

  // 注入地图面板回调（updateOpenPanels 用于强制删除后刷新界面）
  setMapPanelCallbacks({
    updateOpenPanels,
  });

  // 同步静默调试模式开关到全局（供 dbg 函数读取）
  (globalThis as any).__ciSilentDebug = state.silentDebug;

  // 应用主题与透明度
  dbg('[主题] 应用保存的主题:', state.theme);
  applyTheme(state.theme);
  applyOpacity('island', state.opacity.island);
  applyOpacity('main', state.opacity.main);

  // 数据库 API 加载与回调注册
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

  console.log('[浮岛] 模块化版本初始化完成');
}

/**
 * 等待 jQuery 加载并初始化应用
 *
 * 关键：用 jq(() => initApp(jq)) DOM ready 包装，确保 body/head 都已就绪
 * - 酒馆助手脚本模式：脚本异步加载完成时 DOM 可能未就绪，必须等待
 * - 控制台 import 模式：DOM 已就绪时 jq(fn) 立即同步执行回调，不影响
 *
 * 参考最佳实践：示例/脚本示例/设置界面.ts、示例/前端界面示例/界面.ts
 */
export function bootstrap(): void {
  const waitForJQuery = () => {
    const jq = (window as any).jQuery || (window.parent as any).jQuery || (window as any).$;
    if (jq) {
      jq(() => initApp(jq));
    } else {
      setTimeout(waitForJQuery, 100);
    }
  };
  waitForJQuery();
}
