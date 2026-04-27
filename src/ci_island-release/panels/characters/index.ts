/**
 * 角色面板渲染模块
 * 包含 renderGrid (网格渲染) 和 createCardElement (角色卡创建)
 */
import { ICONS, STORAGE_AVATAR_PREFIX } from '../../core';
import { state } from '../../core/state';
import { safeGetItem } from '../../core/storage';
import { dbg } from '../../core/utils';
import { buildCharArchiveHtml } from './archive';

declare const $: any;

// 这些函数将由 dialogs/* 模块提供，暂用类型声明占位
// 后续阶段4 完成时，会在 panels/characters/index.ts 中 import
// import { showCharEditDialog } from '../../dialogs/char-edit';
// import { showArchiveEditDialog } from '../../dialogs/archive-edit';
// import { createAvatarSelectionModal } from '../../dialogs/avatar/selection';

// 弹窗回调（由主入口注入，避免循环依赖）
export interface CharPanelCallbacks {
  showCharEditDialog?: (d: any) => void;
  showArchiveEditDialog?: (d: any) => void;
  createAvatarSelectionModal?: (d: any) => void;
  renderBagContent?: ($container: any, d: any) => void;
  updateCategory?: (charName: string, newType: string) => void;
  /** 物品详情弹窗（来自 panels/inventory），用于背包内物品点击 */
  showItemDetail?: (item: any, event: any) => void;
}

let callbacks: CharPanelCallbacks = {};

/**
 * 注入回调函数（由主入口在初始化时调用）
 */
export function setCharPanelCallbacks(cb: CharPanelCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

/**
 * 创建角色卡 DOM 元素
 * 用于 renderGrid 和 showRelationCharDetail 复用
 */
export function createCardElement(d: any): any {
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
    `<div class="ci-card" id="card-${d.name}">
      <div class="ci-card-compact">
        <div class="ci-menu-trigger">${ICONS.dots}</div>
        <div class="ci-card-menu-popover">
          <div class="ci-menu-item" data-move="main">主要</div>
          <div class="ci-menu-item" data-move="side">次要</div>
          <div class="ci-menu-item" data-move="retired">离场</div>
        </div>
        <div class="ci-card-avatar">${avatarHtml}</div>
        <div class="ci-card-name">${d.name}</div>
        <div class="ci-card-role">${d.job || d.desc || '-'}</div>
        <div class="ci-card-info">${d.sex} · ${d.age}</div>
        ${tags}
      </div>
      <div class="ci-expanded-box" style="display:none;">
        <div class="ci-nb-left">
          <div class="ci-big-avatar-box">${avatarHtml}<div class="ci-upload-hint">点击上传</div></div>
          <div class="ci-info-scroll">
            <div class="ci-detail-row"><span class="ci-label">姓名</span><span class="ci-val">${d.name}</span></div>
            <div class="ci-detail-row"><span class="ci-label">性别</span><span class="ci-val">${d.sex}</span></div>
            <div class="ci-detail-row"><span class="ci-label">年龄</span><span class="ci-val">${d.age}</span></div>
            ${d.job && d.job !== '-' ? `<div class="ci-detail-row"><span class="ci-label">职业</span><span class="ci-val">${d.job}</span></div>` : ''}
            ${d.identity && d.identity !== '-' ? `<div class="ci-detail-row"><span class="ci-label">身份</span><span class="ci-val">${d.identity}</span></div>` : ''}
            ${d.loc && d.loc !== '未知' ? `<div class="ci-detail-row"><span class="ci-label">位置</span><span class="ci-val"><span style="margin-right:4px;">${ICONS.location}</span>${d.loc}</span></div>` : ''}
            ${state.cachedData.hasLongGoal && d.longGoal ? `<div class="ci-long-goal">${d.longGoal}</div>` : ''}
            ${bodyStatusHtml}
          </div>
        </div>
        ${rightSideHtml}
      </div>
    </div>`,
  );

  // 卡片点击事件
  $card.click((e: any) => {
    const $target = $(e.target);
    dbg('[角色卡] 点击事件, 目标:', e.target.className);

    // 1. 头像点击 → 打开头像选择弹窗
    if ($target.closest('.ci-big-avatar-box').length) {
      e.stopPropagation();
      dbg('[角色卡] 点击头像，触发选择弹窗');
      if (callbacks.createAvatarSelectionModal) {
        callbacks.createAvatarSelectionModal(d);
      }
      return;
    }

    // 2. 三点菜单点击 → 由专门 handler 处理
    if ($target.closest('.ci-menu-trigger, .ci-menu-item').length) {
      return;
    }

    // 3. 编辑模式 → 调用编辑弹窗
    if ($card.hasClass('is-expanded') && state.isEditing) {
      if ($target.closest('.ci-nb-left').length) {
        e.stopPropagation();
        if (callbacks.showCharEditDialog) callbacks.showCharEditDialog(d);
        return;
      }
      if ($target.closest('.ci-nb-right').length) {
        e.stopPropagation();
        if (callbacks.showArchiveEditDialog) callbacks.showArchiveEditDialog(d);
        return;
      }
    }

    // 4. 展开/收起卡片
    if ($card.hasClass('is-expanded')) {
      if ($target.closest('.ci-expanded-box').length) {
        return;
      }

      $card.find('.ci-nb-right').removeClass('full-width');
      $card.removeClass('is-expanded').find('.ci-expanded-box').hide();
      $card.find('.ci-card-compact').show();
      if (state.lastExpandedCardName === d.name) state.lastExpandedCardName = null;
    } else {
      // 收起其他已展开的卡片
      $card.siblings('.is-expanded').each(function (this: HTMLElement) {
        $(this).find('.ci-nb-right').removeClass('full-width');
        $(this).removeClass('is-expanded').find('.ci-expanded-box').hide();
        $(this).find('.ci-card-compact').show();
      });

      $card.addClass('is-expanded').find('.ci-card-compact').hide();
      $card.find('.ci-expanded-box').css('display', 'flex');
      if (callbacks.renderBagContent) {
        callbacks.renderBagContent($card.find('.ci-bag-container-inner'), d);
      }
      // 主面板中记录状态
      if ($card.closest('#ci-panel').length) {
        state.lastExpandedCardName = d.name;
      }
    }
  });

  // 三点菜单触发
  $card.find('.ci-menu-trigger').click(function (this: HTMLElement, e: any) {
    e.stopPropagation();
    $(this).toggleClass('active');
  });

  // 菜单项点击
  $card.find('.ci-menu-item').click(function (this: HTMLElement, e: any) {
    e.stopPropagation();
    const newType = $(this).data('move');
    if (callbacks.updateCategory) {
      callbacks.updateCategory(d.name, newType);
    }
  });

  return $card;
}

/**
 * 渲染角色网格
 * @param type 类型：'main' | 'side' | 'retired'
 * @param $pan 主面板 jQuery 对象
 */
export function renderGrid(type: string, $pan: any): void {
  const data = (state.cachedData as any)[type] || [];
  const titleMap: Record<string, string> = { main: '主要', side: '次要', retired: '离场' };
  $pan.find('#ci-panel-title').text(titleMap[type] + ` (${data.length})`);

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
      if (callbacks.renderBagContent) {
        callbacks.renderBagContent($card.find('.ci-bag-container-inner'), d);
      }
    }
  });

  // 点击网格空白处收起所有卡片
  $grid.off('click').on('click', function (this: HTMLElement, e: any) {
    if (e.target === this) {
      dbg('[Grid] 点击空白处，收起所有卡片');
      $grid.find('.is-expanded').each(function (this: HTMLElement) {
        const $c = $(this);
        $c.find('.ci-nb-right').removeClass('full-width');
        $c.removeClass('is-expanded').find('.ci-expanded-box').hide();
        $c.find('.ci-card-compact').show();
      });
      state.lastExpandedCardName = null;
    }
  });
}

/**
 * 渲染背包内容（默认实现，可被回调覆盖）
 */
export function renderBagContent($container: any, d: any): void {
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
    // 物品点击 → 弹出物品详情（由 inventory 模块提供 showItemDetail 回调）
    $el.on('click', (e: any) => {
      if (callbacks.showItemDetail) {
        callbacks.showItemDetail(item, e);
      }
    });
    $grid.append($el);
  });
  $container.append($grid);
}
