
/**
 * 物品仓库面板（完整迁移版）
 *
 * 完整迁移自原 src/ci_island_test/index.ts:
 *   3234-3618（resetInventoryUI / updateItemCardsForSelection / createItemCard / renderCharacterView / showItemDetail）
 *   3837-4187（sendTakeActionMessage / handleDiscardItem / handleUseItem / showCharacterSelectPopup）
 *   4815-5106（renderInventoryPanel / renderRecycleView / resetRecycleUI）
 *   5757-6033（handleDestroyConfirm / handleSynthesizeConfirm / showRecycleModal）
 *   6038-6189（renderWarehouseView / getItemIcon）
 *
 * 包含：
 *  - renderInventoryPanel (主入口)
 *  - renderCharacterView / renderWarehouseView / renderRecycleView (3 视图)
 *  - createItemCard / showItemDetail
 *  - 赠予/拿取/销毁/合成/丢弃/使用 - 动作生成
 *  - showRecycleModal (再利用激活弹窗)
 *  - getItemIcon (内部工具)
 */
import { ICONS } from '../../core/icons';
import { state } from '../../core/state';
import {
  STORAGE_AVATAR_PREFIX,
  STORAGE_RECYCLE_NAME_KEY,
  STORAGE_RECYCLE_OPTION_KEY,
  STORAGE_RECYCLE_ACTIVE_KEY,
} from '../../core/constants';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../../core/storage';
import {
  dbg,
  isSystemColumn,
  extractCoreName,
  formatItemList,
  getPronounByChar,
  getProtagonistName,
  getPresentCharacterList,
} from '../../core/utils';
import { showToast } from '../../ui/toast';
import { openItemEditModal as defaultOpenItemEditModal } from '../../dialogs/item-edit';

declare const $: any;

// ========== 类型定义 ==========
export type InventoryViewMode = 'character' | 'warehouse' | 'recycle';

export interface InventoryPanelCallbacks {
  /** 注入物品编辑弹窗（默认走 dialogs/item-edit），保留扩展性 */
  openItemEditModal?: (item: any) => void;
}

let callbacks: InventoryPanelCallbacks = {};

export function setInventoryPanelCallbacks(cb: InventoryPanelCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

function getOpenItemEditModal(): (item: any) => void {
  return callbacks.openItemEditModal || defaultOpenItemEditModal;
}

// ========== 物品图标 ==========
export function getItemIcon(type: string): string {
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

// ========== UI 状态重置 ==========
export function resetInventoryUI(): void {
  state.giftMode = false;
  state.takeMode = false;
  state.selectedItems = [];
  $('.ci-inv-char-box').removeClass('gift-source');
  $('.ci-inv-item-card').removeClass('selected selectable takeable');
  $('.ci-action-btn').removeClass('active');
  $('.ci-gift-middle-panel').hide();
  $('.ci-inv-content').removeClass('gift-mode take-mode');
}

export function resetRecycleUI(): void {
  $('.ci-action-btn').removeClass('active');
  $('.ci-recycle-middle-panel').hide();
  $('.ci-inv-content').removeClass('destroy-mode synthesize-mode');
  $('.ci-inv-item-card').removeClass('selectable destroy-selected synthesize-selected');
  state.selectedItems = [];
}

export function updateItemCardsForSelection(
  $container: any,
  _protagonistItems: any[],
  protagonistName: string,
): void {
  const pCore = extractCoreName(protagonistName);

  $container.find('.ci-inv-char-box').each(function (this: any) {
    const $box = $(this);
    const ownerKey = $box.data('owner') || $box.attr('data-owner') || '';
    const isP = String(ownerKey)
      .split(';')
      .map((s: string) => extractCoreName(s))
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

// ========== 物品卡片 ==========
export function createItemCard(item: any): any {
  const $card = $(`
    <div class="ci-inv-item-card ${state.isEditing ? 'ci-editing' : ''}" data-item-name="${item.name}">
      <div class="ci-inv-item-icon">${getItemIcon(item.type)}</div>
      <div class="ci-inv-item-name">${item.name}</div>
      ${item.count && String(item.count) !== '1' ? `<div class="ci-inv-item-count">x${item.count}</div>` : ''}
      ${state.isEditing ? `<div class="ci-edit-overlay-small" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(76,175,80,0.2); border:2px solid #4caf50; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#2e7d32; font-size:16px; pointer-events:none;">${ICONS.edit}</div>` : ''}
    </div>
  `);

  $card.on('click', function (this: any, e: any) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    const itemName = $(this).data('item-name');

    // 1. 编辑模式
    if (state.isEditing) {
      getOpenItemEditModal()(item);
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
          $(this).closest('.ci-inv-char-box').data('owner') ||
          $(this).closest('.ci-inv-char-box').attr('data-owner');
        const found = (window as any).allItemsGlobal
          ? (window as any).allItemsGlobal.find(
              (i: any) =>
                i.name === itemName && (i._normalizedOwner === ownerKey || i.owner === ownerKey),
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

// ========== 物品详情弹窗 ==========
export function showItemDetail(item: any, event: any): void {
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
                !['名称', '类型', '描述', '归属', '拥有者', '数量', 'Owner', '分类', '类别', 'Category'].includes(k) &&
                !isSystemColumn(k),
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
      <div class="ci-item-popup-actions" style="padding: 8px 16px; background: #f8f9fa; display: flex; justify-content: flex-end; padding-top: 0; gap: 8px;">
         <button class="ci-item-discard-btn">${ICONS.trash || '🗑️'} 丢弃</button>
         <button class="ci-item-use-btn">${ICONS.tool || '🛠️'} 使用</button>
      </div>
    </div>
  `);

  $card.find('.ci-item-use-btn').on('click', function (e: any) {
    e.stopPropagation();
    handleUseItem(item);
    $card.remove();
  });

  $card.find('.ci-item-discard-btn').on('click', function (e: any) {
    e.stopPropagation();
    handleDiscardItem(item);
    $card.remove();
  });

  $('body').append($card);

  // 定位逻辑
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const cardW = $card.outerWidth() || 280;
  const cardH = $card.outerHeight() || 300;

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

  if (l + cardW > winW - 10) l = clientX - cardW;
  if (d + cardH > winH - 10) d = clientY - cardH;
  if (l < 10) l = 10;
  if (d < 10) d = 10;

  $card.css({ left: l + 'px', top: d + 'px', opacity: 1 });

  $card.find('.ci-item-popup-close').on('click', function (e: any) {
    e.stopPropagation();
    $card.remove();
  });
}

// ========== 主入口：renderInventoryPanel ==========
export function renderInventoryPanel(
  $container: any,
  viewMode: InventoryViewMode = 'character',
): void {
  $container.empty();

  // 获取所有物品
  const allItems = state.cachedData.allItems || [];
  const allChars = [...state.cachedData.main, ...state.cachedData.side];

  if (allItems.length === 0) {
    $container.html('<div class="ci-inv-empty">暂无物品数据</div>');
    return;
  }
  // 检查再利用功能状态
  const storedRecycleName = safeGetItem(STORAGE_RECYCLE_NAME_KEY, '');
  const isActive = safeGetItem(STORAGE_RECYCLE_ACTIVE_KEY, 'false') === 'true';
  const itemFound =
    storedRecycleName &&
    allItems.some(
      (i: any) => i.name.includes(storedRecycleName) || storedRecycleName.includes(i.name),
    );

  let isUnlocked = false;

  if (itemFound) {
    isUnlocked = true;
    if (!isActive) {
      safeSetItem(STORAGE_RECYCLE_ACTIVE_KEY, 'true');
    }
  } else {
    if (isActive) {
      safeRemoveItem(STORAGE_RECYCLE_NAME_KEY);
      safeRemoveItem(STORAGE_RECYCLE_OPTION_KEY);
      safeRemoveItem(STORAGE_RECYCLE_ACTIVE_KEY);
    }
  }

  const recycleBtnText = isUnlocked ? storedRecycleName : '再利用';
  const recycleBtnIcon = isUnlocked ? '' : ICONS.lock;
  const recycleBtnClass = isUnlocked ? '' : 'locked';

  // 视图切换标签
  const $viewTabs = $(`
    <div class="ci-inv-view-tabs">
      <div class="ci-inv-tab ${viewMode === 'character' ? 'active' : ''}" data-view="character">
        角色持有
      </div>
      <div class="ci-inv-tab ${viewMode === 'warehouse' ? 'active' : ''}" data-view="warehouse">
        仓库视图
      </div>
      <div class="ci-inv-tab recycle-tab ${viewMode === 'recycle' ? 'active' : ''} ${recycleBtnClass}" data-view="recycle">
        ${recycleBtnIcon ? `<span class="ci-tab-icon">${recycleBtnIcon}</span>` : ''}
        <span class="ci-tab-text">${recycleBtnText}</span>
      </div>
    </div>
  `);

  $viewTabs.find('.ci-inv-tab').on('click', function (this: any, e: any) {
    e.stopPropagation();
    const view = $(this).data('view');

    if (view === 'recycle') {
      if (!isUnlocked) {
        showRecycleModal($container);
        return;
      }
    }

    dbg('[物品仓库] 切换视图:', view);
    renderInventoryPanel($container, view);
  });

  $container.append($viewTabs);

  // 内容区域
  const $content = $('<div class="ci-inv-content"></div>');

  if (viewMode === 'character') {
    renderCharacterView($content, allItems, allChars);
  } else if (viewMode === 'warehouse') {
    renderWarehouseView($content, allItems);
  } else if (viewMode === 'recycle') {
    if (isUnlocked) {
      renderRecycleView($content, allItems, allChars);
    } else {
      $content.html(`
        <div class="ci-inv-empty" style="flex-direction: column; gap: 10px;">
          <div style="opacity: 0.3; transform: scale(1.5);">${ICONS.lock}</div>
          <div style="opacity: 0.6; font-size: 14px;">暂无设施</div>
        </div>
      `);
    }
  }

  $container.append($content);
}

// ========== 角色持有视图 ==========
function renderCharacterView($container: any, allItems: any[], _allChars: any[]): void {
  dbg('[角色持有物品视图] 开始渲染');
  (window as any).allItemsGlobal = allItems;
  $container.empty();

  const protagonistName = getProtagonistName();
  const protagonistCore = extractCoreName(protagonistName);

  const getNormalizedKey = (raw: string) => {
    if (!raw) return '无归属';
    const parts = raw
      .split(/[,，;；/／]/)
      .map(s => s.trim())
      .filter(s => s);
    const cores = parts.map(p => extractCoreName(p));
    return Array.from(new Set(cores)).sort().join(';');
  };

  const itemsByOwner: Record<string, any[]> = {};
  const noOwnerItems: any[] = [];

  allItems.forEach(item => {
    if (item.owner && item.owner.trim()) {
      const key = getNormalizedKey(item.owner);
      if (!itemsByOwner[key]) itemsByOwner[key] = [];
      if (!item._normalizedOwner) {
        Object.defineProperty(item, '_normalizedOwner', {
          value: key,
          writable: true,
          configurable: true,
        });
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

  $actionBar.find('.ci-gift-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    if (state.giftMode) {
      resetInventoryUI();
    } else {
      resetInventoryUI();
      state.giftMode = true;
      $(this).addClass('active');
      $actionBar
        .find('.ci-gift-middle-panel')
        .css({ display: 'flex', opacity: 0 })
        .animate({ opacity: 1 }, 200);
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

  $actionBar.find('.ci-take-btn').on('click', function (this: any, e: any) {
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
      $container.addClass('take-mode');
      showToast('已进入拿取模式');
      updateItemCardsForSelection($container, [], protagonistName);
    }
  });

  $container.append($actionBar);

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
        $dots.append(
          `<span class="ci-inv-dot ${i === page ? 'active' : ''}" data-page="${i}"></span>`,
        );
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
    $charBox.on('click', '.ci-inv-dot', function (this: any, e: any) {
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

// ========== 仓库视图 ==========
function renderWarehouseView($container: any, allItems: any[]): void {
  // 1. 数据预处理
  const categoryMap: Record<string, any[]> = { 全部: [] };
  const currencyItems: any[] = [];

  const normalizeCat = (s: string) => s.trim();

  allItems.forEach(item => {
    item._tags = [];
    categoryMap['全部'].push(item);

    const rawType = item.type || '其他';

    // 货币识别
    const isCurrency =
      /(?:金|银|铜|铁|星|代|晶|魔)币|货币|金钱|钱币|信用点|现金|^G$|^Gold$/.test(item.name) ||
      /货币|金钱/.test(rawType);

    if (isCurrency) {
      currencyItems.push(item);
      item._tags.push('货币');
    }

    const parts = rawType.split(/[,，;；/／]/);
    let hasValidCat = false;

    parts.forEach((part: string) => {
      const cat = normalizeCat(part);
      if (!cat) return;
      hasValidCat = true;

      if (!categoryMap[cat]) categoryMap[cat] = [];

      if (!categoryMap[cat].includes(item)) {
        categoryMap[cat].push(item);
      }

      if (!item._tags.includes(cat)) {
        item._tags.push(cat);
      }
    });

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

  // C. 物品网格
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

  $categoryTabs.on('click', '.ci-inv-cat-tab', function (this: any, e: any) {
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

// ========== 再利用视图 ==========
function renderRecycleView($container: any, allItems: any[], _allChars: any[]): void {
  const recycleOption = safeGetItem(STORAGE_RECYCLE_OPTION_KEY, 'both');
  const recycleName = safeGetItem(STORAGE_RECYCLE_NAME_KEY, '再利用设施');

  const $actionBar = $('<div class="ci-inv-action-bar"></div>');

  // 销毁按钮
  if (recycleOption === 'destroy' || recycleOption === 'both') {
    const $destroyBtn = $(`
      <button class="ci-action-btn ci-destroy-btn" data-action="destroy">
        <span class="ci-btn-icon">${ICONS.trash}</span>
        <span class="ci-btn-text">销毁</span>
      </button>
    `);
    $actionBar.append($destroyBtn);
  }

  // 中间面板
  const $middlePanel = $(`
    <div class="ci-recycle-middle-panel" style="display: none; gap: 8px; align-items: center;">
      <div class="ci-destroy-actions" style="display: none; gap: 8px;">
        <button class="ci-tag-btn ci-destroy-cancel">取消销毁</button>
        <button class="ci-tag-btn ci-destroy-confirm">确认销毁</button>
      </div>
      <div class="ci-synthesize-actions" style="display: none; gap: 8px;">
        <button class="ci-tag-btn ci-synthesize-cancel">取消合成</button>
        <button class="ci-tag-btn ci-synthesize-confirm">确认合成</button>
      </div>
    </div>
  `);
  $actionBar.append($middlePanel);

  // 合成按钮
  if (recycleOption === 'synthesize' || recycleOption === 'both') {
    const $synthesizeBtn = $(`
      <button class="ci-action-btn ci-synthesize-btn" data-action="synthesize">
        <span class="ci-btn-icon">${ICONS.tool}</span>
        <span class="ci-btn-text">合成</span>
      </button>
    `);
    $actionBar.append($synthesizeBtn);
  }

  $actionBar.find('.ci-destroy-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    if ($(this).hasClass('active')) {
      resetRecycleUI();
    } else {
      resetRecycleUI();
      $(this).addClass('active');

      const $mid = $actionBar.find('.ci-recycle-middle-panel');
      $mid.find('.ci-synthesize-actions').hide();
      $mid.find('.ci-destroy-actions').css('display', 'flex');
      $mid.css({ display: 'flex', opacity: 0 }).animate({ opacity: 1 }, 200);

      $container.find('.ci-inv-content').addClass('destroy-mode');
      showToast('已进入销毁模式，请选择物品');
      $container.find('.ci-inv-item-card').addClass('selectable');
    }
  });

  $actionBar.find('.ci-synthesize-btn').on('click', function (this: any, e: any) {
    e.stopPropagation();
    if ($(this).hasClass('active')) {
      resetRecycleUI();
    } else {
      resetRecycleUI();
      $(this).addClass('active');

      const $mid = $actionBar.find('.ci-recycle-middle-panel');
      $mid.find('.ci-destroy-actions').hide();
      $mid.find('.ci-synthesize-actions').css('display', 'flex');
      $mid.css({ display: 'flex', opacity: 0 }).animate({ opacity: 1 }, 200);

      $container.find('.ci-inv-content').addClass('synthesize-mode');
      showToast('已进入合成模式，请选择物品');
      $container.find('.ci-inv-item-card').addClass('selectable');
    }
  });

  $actionBar.find('.ci-destroy-cancel').on('click', function (e: any) {
    e.stopPropagation();
    resetRecycleUI();
  });

  $actionBar.find('.ci-destroy-confirm').on('click', function (e: any) {
    e.stopPropagation();
    if (state.selectedItems.length === 0) {
      showToast('请先选择要销毁的物品', 'error');
      return;
    }
    handleDestroyConfirm(state.selectedItems, recycleName);
    resetRecycleUI();
  });

  $actionBar.find('.ci-synthesize-cancel').on('click', function (e: any) {
    e.stopPropagation();
    resetRecycleUI();
  });

  $actionBar.find('.ci-synthesize-confirm').on('click', function (e: any) {
    e.stopPropagation();
    if (state.selectedItems.length === 0) {
      showToast('请先选择要合成的物品', 'error');
      return;
    }
    handleSynthesizeConfirm(state.selectedItems, recycleName);
    resetRecycleUI();
  });

  $container.append($actionBar);

  // 渲染仓库视图内容（复用），并劫持卡片点击事件
  const $warehouseContent = $('<div class="ci-inv-content ci-warehouse-view"></div>');
  renderWarehouseView($warehouseContent, allItems);
  $container.append($warehouseContent);

  $warehouseContent
    .find('.ci-inv-item-card')
    .off('click')
    .on('click', function (this: any, e: any) {
      e.stopPropagation();
      const $card = $(this);
      const itemName = $card.data('item-name');
      const item = allItems.find((i: any) => i.name === itemName);

      if ($('.ci-destroy-btn').hasClass('active')) {
        if ($card.hasClass('destroy-selected')) {
          $card.removeClass('destroy-selected');
          const idx = state.selectedItems.findIndex((i: any) => i.name === itemName);
          if (idx > -1) state.selectedItems.splice(idx, 1);
        } else {
          $card.addClass('destroy-selected');
          if (item) state.selectedItems.push(item);
        }
        showToast(`已选择 ${state.selectedItems.length} 件物品`);
      } else if ($('.ci-synthesize-btn').hasClass('active')) {
        if ($card.hasClass('synthesize-selected')) {
          $card.removeClass('synthesize-selected');
          const idx = state.selectedItems.findIndex((i: any) => i.name === itemName);
          if (idx > -1) state.selectedItems.splice(idx, 1);
        } else {
          $card.addClass('synthesize-selected');
          if (item) state.selectedItems.push(item);
        }
        showToast(`已选择 ${state.selectedItems.length} 件物品`);
      } else {
        if (item) showItemDetail(item, e);
      }
    });
}

// ========== 拿取动作 ==========
function sendTakeActionMessage(items: any[], protagonistCore: string): void {
  if (items.length === 0) return;
  const itemNames = items.map(i => i.name).join('、');
  const firstItem = items[0];

  const ownerKey = firstItem._confirmedOwner || firstItem._normalizedOwner || '';
  const presentNames = getPresentCharacterList();

  let message = '';
  if (ownerKey && ownerKey !== '无归属') {
    const parts = ownerKey.split(';');
    const isPresent = parts.every((n: string) => presentNames.has(n));
    const allChars = [...state.cachedData.main, ...state.cachedData.side];

    const ownerChar = allChars.find(
      (c: any) => c.name.includes(parts[0]) || parts[0].includes(c.name),
    );
    const pronoun = ownerChar ? getPronounByChar(ownerChar) : '他';
    const location =
      ownerChar && ownerChar.loc && ownerChar.loc !== '未知' ? ownerChar.loc.trim() : null;

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

  appendToTextarea(message);
  showToast('已生成拿取动作描述');
}

// ========== 丢弃动作 ==========
function handleDiscardItem(item: any): void {
  const protagonistName = getProtagonistName();
  const pCore = extractCoreName(protagonistName);

  const ownerKey = item._confirmedOwner || item.owner || '';
  const rawOwners = String(ownerKey)
    .split(/[,，;；]/)
    .map((s: string) => s.trim())
    .filter((s: string) => s && s !== '无归属');

  const otherOwners = rawOwners.filter((n: string) => extractCoreName(n) !== pCore);

  let message = '';

  if (otherOwners.length === 0) {
    message = `${pCore}将${item.name}丢弃了。`;
  } else {
    let targetNamesStr = '';
    if (otherOwners.length === 1) {
      targetNamesStr = otherOwners[0];
    } else {
      targetNamesStr = otherOwners.slice(0, -1).join('、') + '与' + otherOwners[otherOwners.length - 1];
    }

    const presentNames = getPresentCharacterList();
    const isAnyPresent = otherOwners.some((n: string) => presentNames.has(extractCoreName(n)));

    if (isAnyPresent) {
      message = `${pCore}与${targetNamesStr}商量了一下，将${item.name}丢弃了。`;
    } else {
      const firstTargetCore = extractCoreName(otherOwners[0]);
      const allChars = [
        ...state.cachedData.main,
        ...state.cachedData.side,
        ...state.cachedData.retired,
      ];
      const targetChar = allChars.find((c: any) => extractCoreName(c.name) === firstTargetCore);
      const location =
        targetChar && targetChar.loc && targetChar.loc !== '未知' ? targetChar.loc : null;

      if (location) {
        message = `${pCore}去了${location}与${targetNamesStr}商量了一下，将${item.name}丢弃了。`;
      } else {
        message = `${pCore}去找${targetNamesStr}商量了一下，将${item.name}丢弃了。`;
      }
    }
  }

  appendToTextarea(message);
  showToast('已生成丢弃动作描述');
}

// ========== 使用动作 ==========
function handleUseItem(item: any): void {
  const protagonistName = getProtagonistName();
  const pCore = extractCoreName(protagonistName);

  const ownerKey = item._confirmedOwner || item.owner || '';
  const rawOwners = String(ownerKey)
    .split(/[,，;；]/)
    .map((s: string) => s.trim())
    .filter((s: string) => s && s !== '无归属');

  const otherOwners = rawOwners.filter((n: string) => extractCoreName(n) !== pCore);

  let message = '';

  if (otherOwners.length === 0) {
    message = `${pCore}使用了${item.name}。`;
  } else {
    let targetNamesStr = '';
    if (otherOwners.length === 1) {
      targetNamesStr = otherOwners[0];
    } else {
      targetNamesStr = otherOwners.slice(0, -1).join('、') + '与' + otherOwners[otherOwners.length - 1];
    }

    const presentNames = getPresentCharacterList();
    const isAnyPresent = otherOwners.some((n: string) => presentNames.has(extractCoreName(n)));

    if (isAnyPresent) {
      message = `${pCore}和${targetNamesStr}商量了一下，使用了${item.name}。`;
    } else {
      const firstTargetCore = extractCoreName(otherOwners[0]);
      const allChars = [
        ...state.cachedData.main,
        ...state.cachedData.side,
        ...state.cachedData.retired,
      ];
      const targetChar = allChars.find((c: any) => extractCoreName(c.name) === firstTargetCore);
      const location =
        targetChar && targetChar.loc && targetChar.loc !== '未知' ? targetChar.loc : null;

      if (location) {
        message = `${pCore}去了${location}和${targetNamesStr}商量了一下，使用了${item.name}。`;
      } else {
        message = `${pCore}去找${targetNamesStr}商量了一下，使用了${item.name}。`;
      }
    }
  }

  appendToTextarea(message);
  showToast('已生成使用描述');
}

// ========== 销毁确认 ==========
function handleDestroyConfirm(items: any[], recycleName: string): void {
  const protagonistName = getProtagonistName();
  const pCore = extractCoreName(protagonistName);
  const itemNames = formatItemList(items.map(i => i.name));

  const involvedChars = new Set<string>();
  items.forEach(item => {
    const ownerKey = item.owner || '';
    const rawOwners = String(ownerKey)
      .split(/[,，;；]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s && s !== '无归属');
    rawOwners.forEach((owner: string) => {
      const coreName = extractCoreName(owner);
      if (coreName !== pCore) {
        involvedChars.add(coreName);
      }
    });
  });

  const othersList = Array.from(involvedChars);
  let message = '';

  if (othersList.length === 0) {
    message = `${pCore}用${recycleName}销毁了${itemNames}。`;
  } else {
    const presentNames = getPresentCharacterList();
    const absentOthers = othersList.filter(name => !presentNames.has(name));

    if (absentOthers.length === 0) {
      const namesStr = othersList.join('、');
      message = `${pCore}与${namesStr}商量了一下，决定用${recycleName}销毁了${itemNames}。`;
    } else {
      if (othersList.length === 1) {
        const targetName = othersList[0];
        const allChars = [
          ...state.cachedData.main,
          ...state.cachedData.side,
          ...state.cachedData.retired,
        ];
        const targetChar = allChars.find((c: any) => extractCoreName(c.name) === targetName);
        const location =
          targetChar && targetChar.loc && targetChar.loc !== '未知' ? targetChar.loc : null;

        if (location) {
          message = `${pCore}去${location}与${targetName}商量了一下，决定用${recycleName}销毁了${itemNames}。`;
        } else {
          message = `${pCore}去找${targetName}商量了一下，决定用${recycleName}销毁了${itemNames}。`;
        }
      } else {
        const namesStr = othersList.join('、');
        message = `${pCore}召集了${namesStr}商量了一下，决定用${recycleName}销毁了${itemNames}。`;
      }
    }
  }

  appendToTextarea(message);
  showToast('已生成销毁描述');
}

// ========== 合成确认 ==========
function handleSynthesizeConfirm(items: any[], recycleName: string): void {
  const protagonistName = getProtagonistName();
  const pCore = extractCoreName(protagonistName);
  const itemNames = formatItemList(items.map(i => i.name));

  const involvedChars = new Set<string>();
  items.forEach(item => {
    const ownerKey = item.owner || '';
    const rawOwners = String(ownerKey)
      .split(/[,，;；]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s && s !== '无归属');
    rawOwners.forEach((owner: string) => {
      const coreName = extractCoreName(owner);
      if (coreName !== pCore) {
        involvedChars.add(coreName);
      }
    });
  });

  const othersList = Array.from(involvedChars);
  let message = '';

  if (othersList.length === 0) {
    message = `${pCore}将${itemNames}利用${recycleName}进行了合成。`;
  } else {
    const presentNames = getPresentCharacterList();
    const absentOthers = othersList.filter(name => !presentNames.has(name));

    if (absentOthers.length === 0) {
      const namesStr = othersList.join('、');
      message = `${pCore}和${namesStr}商量了一下，将${itemNames}利用${recycleName}进行了合成。`;
    } else {
      if (othersList.length === 1) {
        const targetName = othersList[0];
        const allChars = [
          ...state.cachedData.main,
          ...state.cachedData.side,
          ...state.cachedData.retired,
        ];
        const targetChar = allChars.find((c: any) => extractCoreName(c.name) === targetName);
        const location =
          targetChar && targetChar.loc && targetChar.loc !== '未知' ? targetChar.loc : null;

        if (location) {
          message = `${pCore}前往${location}与${targetName}商量了一下，将${itemNames}利用${recycleName}进行了合成。`;
        } else {
          message = `${pCore}去找${targetName}商量了一下，将${itemNames}利用${recycleName}进行了合成。`;
        }
      } else {
        const namesStr = othersList.join('、');
        message = `${pCore}召集了${namesStr}商量了一下，将${itemNames}利用${recycleName}进行了合成。`;
      }
    }
  }

  appendToTextarea(message);
  showToast('已生成合成描述');
}

// ========== 角色选择弹窗（赠予） ==========
function showCharacterSelectPopup(e: any, protagonistName: string, selectedItems: any[]): void {
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

  const pCore = extractCoreName(protagonistName);
  const presentNames = getPresentCharacterList();

  const allChars = [...state.cachedData.main, ...state.cachedData.side]
    .filter((c: any) => extractCoreName(c.name) !== pCore)
    .sort((a: any, b: any) => {
      const aPresent = presentNames.has(extractCoreName(a.name)) ? 1 : 0;
      const bPresent = presentNames.has(extractCoreName(b.name)) ? 1 : 0;
      return bPresent - aPresent;
    });

  if (allChars.length === 0) {
    $selector.html('<div style="text-align:center;color:#999;padding:10px;">无角色可选</div>');
  } else {
    allChars.forEach((c: any) => {
      const cCore = extractCoreName(c.name);
      const isPresent = presentNames.has(cCore);
      const avatar = safeGetItem(STORAGE_AVATAR_PREFIX + c.name, '');

      const $item = $(
        `<div class="ci-selector-item" style="display:flex;align-items:center;gap:10px;padding:6px;cursor:pointer;border-radius:4px;transition:background 0.2s;">
            ${
              avatar
                ? `<img src="${avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
                : `<div style="width:32px;height:32px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;">${c.name[0]}</div>`
            }
            <span style="font-size:13px;font-weight:bold;color: ${isPresent ? 'var(--ci-text)' : 'gray'};">${c.name}</span>
            ${isPresent ? '<span style="font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 4px;border-radius:4px;margin-left:auto;">在场</span>' : ''}
        </div>`,
      );

      $item.hover(
        function (this: any) {
          $(this).css('background', 'rgba(0,0,0,0.05)');
        },
        function (this: any) {
          $(this).css('background', 'transparent');
        },
      );

      $item.on('click', (ev: any) => {
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
            const others = parts.filter((n: string) => n !== pCore).join('与');
            message = `${pCore}与${others}商量了一下，决定将${itemNames}赠予${c.name}。`;
          } else {
            message = `${pCore}将${itemNames}赠予了${c.name}。`;
          }
        } else if (isMulti) {
          const others = parts.filter((n: string) => n !== pCore).join('与');
          message = `${pCore}与${others}商量了一下，决定去找${c.name}，将${itemNames}赠予${pronoun}。`;
        } else {
          message = `${pCore}去找${c.name}，将${itemNames}赠予了${pronoun}。`;
        }

        appendToTextarea(message);

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
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const menuWidth = $selector.outerWidth() || 240;
  const menuHeight = $selector.outerHeight() || 300;
  const clickX = e.clientX;
  const clickY = e.clientY;
  let menuX = clickX;
  let menuY = clickY;
  if (menuX + menuWidth > winW - 10) menuX = clickX - menuWidth;
  if (menuY + menuHeight > winH - 10) menuY = clickY - menuHeight;
  if (menuX < 10) menuX = 10;
  if (menuY < 10) menuY = 10;
  $selector.css({ left: menuX + 'px', top: menuY + 'px', opacity: 1 });
  setTimeout(() => {
    $(document).one('click.closeSelector', () => $selector.remove());
  }, 100);
}

// ========== 再利用激活弹窗 ==========
export function showRecycleModal(_$container: any): void {
  $('.ci-recycle-modal').remove();
  const protagonistName = getProtagonistName();
  const pCore = protagonistName.replace(/[(（].*?[)）]/g, '').trim() || '主角';

  const $modal = $(`
    <div class="ci-recycle-modal ci-edit-overlay">
      <div class="ci-edit-card" style="max-width: 400px; height: auto;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: #9e9e9e; color: #fff;">${ICONS.tool}</div>
          <span class="ci-edit-title">再利用</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 20px;">
          <div style="font-size: 13px; color: var(--ci-text); line-height: 1.6; margin-bottom: 20px;">
            ${pCore}想了想，觉得这么一堆东西，扔了怪可惜的，有没有一种再利用的方法呢？
          </div>
          <div class="ci-recycle-sentence" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px;">
            <span>那么……</span>
            <select class="ci-recycle-action" style="padding: 4px; border-radius: 4px; border: 1px solid var(--ci-border-color);">
              <option value="购买">购买</option>
              <option value="制作">制作</option>
            </select>
            <span>一个</span>
            <input class="ci-recycle-input" type="text" placeholder="输入物品名称" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--ci-border-color); width: 120px;">
            <span>好了！</span>
          </div>
          <div class="ci-recycle-options" style="margin-top: 20px; display: flex; gap: 15px; font-size: 12px; color: var(--ci-text);">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="radio" name="recycle-option" value="destroy"> 只销毁
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="radio" name="recycle-option" value="synthesize"> 合成
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="radio" name="recycle-option" value="both"> 两者皆可
            </label>
          </div>
        </div>
        <div class="ci-edit-footer">
          <button class="ci-edit-save-btn disabled" style="background: #ccc; cursor: not-allowed;">
            ${ICONS.save} 确认
          </button>
        </div>
      </div>
    </div>
  `);

  $('body').append($modal);

  const $input = $modal.find('.ci-recycle-input');
  const $saveBtn = $modal.find('.ci-edit-save-btn');
  const $select = $modal.find('.ci-recycle-action');
  const $radios = $modal.find('input[name="recycle-option"]');

  const validate = () => {
    const val = ($input.val() as string).trim();
    const checked = $modal.find('input[name="recycle-option"]:checked').length > 0;

    if (val && checked) {
      $saveBtn
        .removeClass('disabled')
        .css({
          background: 'linear-gradient(135deg, #4caf50 0%, #43a047 100%)',
          cursor: 'pointer',
        });
    } else {
      $saveBtn.addClass('disabled').css({ background: '#ccc', cursor: 'not-allowed' });
    }
  };

  $input.on('input', validate);
  $radios.on('change', validate);

  $modal.find('.ci-edit-close').on('click', () => $modal.remove());
  $modal.on('click', (e: any) => {
    if (e.target === $modal[0]) $modal.remove();
  });

  $saveBtn.on('click', function (this: any) {
    if ($(this).hasClass('disabled')) return;

    const action = $select.val();
    const itemName = ($input.val() as string).trim();
    const message = `那么……${action}一个${itemName}好了！`;

    appendToTextarea(message);

    const selectedOption = $modal.find('input[name="recycle-option"]:checked').val();
    safeSetItem(STORAGE_RECYCLE_NAME_KEY, itemName);
    safeSetItem(STORAGE_RECYCLE_OPTION_KEY, selectedOption as string);
    safeRemoveItem(STORAGE_RECYCLE_ACTIVE_KEY);

    $modal.remove();

    showToast('指令已发送，等待物品出现...');
  });
}

// ========== 内部工具：消息追加到输入框 ==========
function appendToTextarea(message: string): void {
  const $textarea = $('#send_textarea', window.parent.document);
  if ($textarea.length) {
    const currentVal = ($textarea.val() as string) || '';
    const finalVal = currentVal ? currentVal + '\n' + message : message;
    $textarea.val(finalVal).trigger('input').trigger('change');
    try {
      const ctx = (window.parent as any).SillyTavern?.getContext?.();
      if (ctx) ctx.input = finalVal;
    } catch (e) {
      // Ignore
    }
  }
}
