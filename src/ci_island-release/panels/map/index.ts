/**
 * 地图面板模块
 *
 * 完整实现：
 * - renderMap：主地图 SVG 渲染（含外部区域、地点、元素、主角脉冲）
 * - openMapLocationDetail：地点详情弹窗
 * - bindMapControls：地图缩放/平移交互
 * - bindMapSplitter：分割条拖动
 * - adjustMapLayout：力导向布局算法（防止地点标签重叠）
 * - injectMapTables / removeMapTables / forceDeleteMapTemplate：地图模板注入与移除
 * - checkMapTablesExist / getTableCount / generateTableUid：辅助工具
 * - isMapEnabled / updateMapToggleUI：地图启用状态
 *
 * 来源：src/ci_island_test/_backup/index.original.ts:8084-9305
 */

import { state } from '../../core/state';
import { ICONS } from '../../core/icons';
import { dbg, sendGameActionRequest as utilSendGameActionRequest } from '../../core/utils';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../../core/storage';
import { MAP_TABLE_MARKER, getMapEnabledKey, STORAGE_MAP_LAYOUT_KEY } from '../../core/constants';
import { showToast } from '../../ui/toast';
import { processData } from '../../data/processor';
import { getDatabaseTemplate_ACU, saveDatabaseTemplate_ACU } from '../../data/db-template';

declare const $: any;

// ============================================================================
// 类型定义与回调注入
// ============================================================================

export interface MapPanelCallbacks {
  /** 自定义打开地图地点详情弹窗（可选，默认使用内置实现） */
  openMapLocationDetail?: (loc: any, event?: Event) => void;
  /** 自定义发送游戏行动请求（可选，默认使用 core/utils 实现） */
  sendGameActionRequest?: (action: string) => void | Promise<any>;
  /** 数据更新后回调，用于通知 app 刷新界面 */
  updateOpenPanels?: () => void;
}

let _callbacks: MapPanelCallbacks = {};

export function setMapPanelCallbacks(callbacks: MapPanelCallbacks): void {
  _callbacks = { ..._callbacks, ...callbacks };
}

function _send(msg: string): void {
  if (_callbacks.sendGameActionRequest) {
    _callbacks.sendGameActionRequest(msg);
  } else {
    utilSendGameActionRequest(msg);
  }
}

// ============================================================================
// 地图布局保存
// ============================================================================

/**
 * 保存地图布局到 localStorage
 * 由地图面板的 .ci-save-layout-btn 点击事件触发
 */
export function saveMapLayout(): void {
  if (state.cachedData.mapLayout) {
    safeSetItem(STORAGE_MAP_LAYOUT_KEY, JSON.stringify(state.cachedData.mapLayout));
    showToast('地图布局已保存');
  }
}

// ============================================================================
// 地图启用状态
// ============================================================================

/**
 * 地图是否启用：检查 localStorage 标记或数据库中是否存在地图表格
 */
export function isMapEnabled(): boolean {
  const stored = safeGetItem(getMapEnabledKey(), 'false');
  if (stored === 'true') return true;

  const existing = checkMapTablesExist();
  return existing.hasLocation || existing.hasElement;
}

/**
 * 更新地图开关 UI
 */
export function updateMapToggleUI(): void {
  const mapEnabled = isMapEnabled();
  const $toggle = $('#ci-toggle-map');
  if ($toggle.length) {
    $toggle.prop('checked', mapEnabled);
    console.log('[UI更新] 地图开关状态已更新:', mapEnabled);
  }
}

// ============================================================================
// 数据库工具
// ============================================================================

/**
 * 检查数据库中是否已有浮岛地图表格
 */
export function checkMapTablesExist(): { hasLocation: boolean; hasElement: boolean } {
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
    if (table.name.includes('主要地点表')) hasLocation = true;
    if (table.name.includes('地图元素表')) hasElement = true;
  });

  return { hasLocation, hasElement };
}

/**
 * 获取当前数据库表格数量
 */
export function getTableCount(): number {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson) return 0;

  const data = api.exportTableAsJson();
  if (!data) return 0;

  return Object.keys(data).filter(k => k.startsWith('sheet_')).length;
}

/**
 * 生成唯一的表格UID
 */
export function generateTableUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sheet_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================================
// 地图布局算法（力导向）
// ============================================================================

/**
 * 调整地图地点布局，防止标签重叠（力导向算法）
 * @param locations 地点数组（会被原地修改）
 * @returns 调整后的同一数组
 */
export function adjustMapLayout(locations: any[]): any[] {
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

// ============================================================================
// 地点详情弹窗
// ============================================================================

/**
 * 打开地图地点详情卡（复刻物品详情卡风格）
 */
export function openMapLocationDetail(loc: any, event: any): void {
  // 允许外部覆盖
  if (_callbacks.openMapLocationDetail) {
    _callbacks.openMapLocationDetail(loc, event);
    return;
  }

  $('.ci-item-card-popup').remove();

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

  // 定位逻辑（同步物品详情卡算法）
  const popupW = 280;
  const popupH = $popup.outerHeight() || 300;
  const padding = 15;

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

  if (l + popupW > window.innerWidth - 10) {
    l = clientX - popupW - padding;
  }
  if (d + popupH > window.innerHeight - 10) {
    d = clientY - popupH - padding;
  }

  if (l < 10) l = 10;
  if (d < 10) d = 10;

  $popup.css({
    left: l + 'px',
    top: d + 'px',
    opacity: 1,
  });

  // 绑定事件
  $popup.find('.ci-map-go-btn').on('click', (e: any) => {
    e.stopPropagation();
    _send(`前往 ${loc.name}`);
    $popup.remove();
  });
  $popup.find('.ci-map-action-tag').on('click', function (this: any, e: any) {
    e.stopPropagation();
    const elementName = $(this).data('element-name');
    const action = $(this).data('action');
    _send(`对${elementName}进行了${action}`);
    $popup.remove();
  });
}

// ============================================================================
// 主渲染函数
// ============================================================================

export function renderMap(): void {
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
      $btn.on('click', () => _send(`前往 ${area}`));
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
    (g as any).style.cursor = 'pointer';
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

// ============================================================================
// 地图缩放和平移交互
// ============================================================================

/**
 * 缩放和平移绑定（复刻关系图算法）
 */
export function bindMapControls(): void {
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

  // 滚轮缩放
  $viewport.off('wheel').on('wheel', function (e: any) {
    e.preventDefault();
    const delta = e.originalEvent.deltaY;
    const zoomFactor = 0.1;
    if (delta < 0) scale *= 1 + zoomFactor;
    else scale /= 1 + zoomFactor;
    scale = Math.max(0.1, Math.min(5, scale));
    updateTransform();
  });

  // 拖拽平移
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialTX = 0;
  let initialTY = 0;

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
    .on('click', (e: any) => {
      e.stopPropagation();
      scale *= 1.2;
      scale = Math.min(5, scale);
      updateTransform();
    });
  $('#ci-zoom-out')
    .off('click')
    .on('click', (e: any) => {
      e.stopPropagation();
      scale /= 1.2;
      scale = Math.max(0.1, scale);
      updateTransform();
    });
}

/**
 * 分隔条拖动：调整地图与外部区域的高度比例
 */
export function bindMapSplitter(): void {
  const $splitter = $('.ci-map-splitter');
  const $ext = $('#ci-map-external-section');
  if (!$splitter.length || !$ext.length) return;
  let isResizing = false;
  let sy = 0;
  let sh = 0;
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

// ============================================================================
// 地图模板注入
// ============================================================================

/**
 * 注入地图表格到数据库
 */
export async function injectMapTables(): Promise<boolean> {
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

    dbg('[地图注入] 生成UID:', locUid + ' / ' + elUid);

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

    // 步骤4: 查找数据库模板
    dbg('[地图注入] 🔧 查找数据库模板...');

    const templateInfo = getDatabaseTemplate_ACU();

    if (!templateInfo) {
      showToast('无法读取数据库模板', 'error');
      dbg('[地图注入] ❌ 没有找到模板');
      return false;
    }

    const { key: templateKey, content: templateStr, source } = templateInfo;
    dbg('[地图注入] ✅ 读取到模板:', templateKey + ' / ' + source);

    // 步骤5: 解析模板
    let templateData: any;
    try {
      templateData = JSON.parse(templateStr);
      const sheetCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
      dbg('[地图注入] ✅ 模板解析成功，当前表格数:', String(sheetCount));
    } catch (e) {
      showToast('模板解析失败', 'error');
      dbg('[地图注入] ❌ 模板解析失败:', e);
      return false;
    }

    // 步骤6: 添加新表格到模板（只保留表头，清空数据）
    const locationTableForTemplate = JSON.parse(JSON.stringify(locationTable));
    const elementTableForTemplate = JSON.parse(JSON.stringify(elementTable));

    if (locationTableForTemplate.content && locationTableForTemplate.content.length > 1) {
      locationTableForTemplate.content = [locationTableForTemplate.content[0]];
    }
    if (elementTableForTemplate.content && elementTableForTemplate.content.length > 1) {
      elementTableForTemplate.content = [elementTableForTemplate.content[0]];
    }

    templateData[locUid] = locationTableForTemplate;
    templateData[elUid] = elementTableForTemplate;

    const newSheetCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
    dbg('[地图注入] ✅ 已添加表格到模板，新表格数:', String(newSheetCount));

    // 步骤7: 保存模板
    const newTemplate = JSON.stringify(templateData);
    try {
      saveDatabaseTemplate_ACU(templateKey, newTemplate, source);
      dbg('[地图注入] ✅ 已保存新模板');
    } catch (e) {
      showToast('保存模板失败', 'error');
      dbg('[地图注入] ❌ 保存模板失败:', e);
      return false;
    }

    // 步骤8: 尝试更新全局TABLE_TEMPLATE_ACU变量
    try {
      const topWindow = window.parent || window;
      if ((topWindow as any).TABLE_TEMPLATE_ACU !== undefined) {
        (topWindow as any).TABLE_TEMPLATE_ACU = newTemplate;
        dbg('[地图注入] ✅ 已更新全局TABLE_TEMPLATE_ACU变量');
      }
    } catch (e) {
      dbg('[地图注入] ⚠️ 无法访问TABLE_TEMPLATE_ACU变量（非致命）');
    }

    // 步骤9: 调用importTableAsJson保存数据到消息
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

    // 步骤12: 保存到通用模板
    dbg('[地图注入] 💾 保存到通用模板...');
    try {
      const topWin: any = window.parent || window;
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
  } catch (e: any) {
    console.error('[地图注入] 异常:', e);
    console.error('[地图注入] 堆栈:', e?.stack);
    showToast('注入失败: ' + e, 'error');
    return false;
  }
}

// ============================================================================
// 地图模板移除
// ============================================================================

export async function removeMapTables(): Promise<boolean> {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return false;
  }

  dbg('[地图移除] ========== 开始移除地图表格（V9.4.2修复幽灵数据问题） ==========');

  let templateCleaned = false;

  try {
    // 步骤1: 从当前数据中找到地图表格
    const fullData = api.exportTableAsJson();

    const markedKeys = Object.keys(fullData).filter(key => {
      const table = fullData[key];
      return table && table.name && table.name.includes(MAP_TABLE_MARKER);
    });

    if (markedKeys.length === 0) {
      dbg('[地图移除] 当前数据中没有找到带标记的表格');
      const allTableNames = Object.values(fullData)
        .filter((t: any) => t?.name)
        .map((t: any) => t.name);
      dbg('[地图移除] 当前所有表格名称:', allTableNames);
      dbg('[地图移除] 继续执行清理流程以移除可能的幽灵数据');
    } else {
      dbg('[地图移除] 找到 ' + markedKeys.length + ' 个地图表格:', markedKeys);
    }

    // 步骤2: 创建cleanData
    const cleanData: any = {};
    Object.keys(fullData).forEach(key => {
      const table = fullData[key];
      if (!markedKeys.includes(key)) {
        cleanData[key] = fullData[key];
      } else {
        dbg('[地图移除] 从数据中排除:', key + ' / ' + (table?.name || ''));
      }
    });

    if (!cleanData.mate) {
      cleanData.mate = { type: 'chatSheets', version: 1 };
    }

    const beforeCount = Object.keys(fullData).filter(k => k.startsWith('sheet_')).length;
    const afterCount = Object.keys(cleanData).filter(k => k.startsWith('sheet_')).length;
    dbg('[地图移除] 表格数变化:', beforeCount + ' -> ' + afterCount);

    // 步骤3: 调用importTableAsJson清理数据
    dbg('[地图移除] 📤 调用importTableAsJson清理数据...');
    const importResult = await api.importTableAsJson(JSON.stringify(cleanData));

    if (importResult === false) {
      dbg('[地图移除] ⚠️ importTableAsJson返回false');
    } else {
      dbg('[地图移除] ✅ importTableAsJson完成');
    }

    // 步骤4: 等待
    dbg('[地图移除] ⏳ 等待2500ms让数据清理完成...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 步骤5: 从模板中删除
    dbg('[地图移除] 🔧 检查并清理模板...');

    const templateInfo = getDatabaseTemplate_ACU();

    if (!templateInfo) {
      dbg('[地图移除] ⚠️ 没有找到模板，跳过模板更新');
    } else {
      const { key: templateKey, content: templateStr, source } = templateInfo;
      dbg('[地图移除] 读取到模板:', templateKey + ' / ' + source);

      try {
        const templateData = JSON.parse(templateStr);
        const originalCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;

        const templateMarkedKeys = Object.keys(templateData).filter(key => {
          const table = templateData[key];
          return table && table.name && table.name.includes(MAP_TABLE_MARKER);
        });

        if (templateMarkedKeys.length > 0) {
          dbg('[地图移除] 模板中找到 ' + templateMarkedKeys.length + ' 个地图表格');

          templateMarkedKeys.forEach(key => {
            const tableName = templateData[key]?.name || key;
            delete templateData[key];
            dbg('[地图移除] 已从模板删除:', tableName);
          });

          const newCount = Object.keys(templateData).filter(k => k.startsWith('sheet_')).length;
          dbg('[地图移除] 模板表格数:', originalCount + ' -> ' + newCount);

          const newTemplate = JSON.stringify(templateData);
          saveDatabaseTemplate_ACU(templateKey, newTemplate, source);
          dbg('[地图移除] ✅ 已保存新模板');

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

    safeRemoveItem(getMapEnabledKey());
    state.cachedData = processData(verifyData);

    if (markedKeys.length > 0) {
      showToast(`已移除${markedKeys.length}个地图表格`);
    } else if (templateCleaned) {
      showToast('已清理模板中的残留地图配置');
    } else {
      showToast('地图功能已关闭');
    }
    dbg('[地图移除] ========== 完成 ==========');

    return true;
  } catch (e: any) {
    console.error('[地图移除] 异常:', e);
    console.error('[地图移除] 堆栈:', e?.stack);
    showToast('移除失败: ' + e, 'error');
    return false;
  }
}

// ============================================================================
// 强制删除地图模板
// ============================================================================

/**
 * 强制清理地图相关的数据与模板，并清除所有相关的开关状态
 */
export async function forceDeleteMapTemplate(): Promise<boolean> {
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
    const templateInfo = getDatabaseTemplate_ACU();

    if (templateInfo) {
      const { key: templateKey, content: templateStr, source } = templateInfo;
      dbg('[强制删除] 找到模板:', templateKey + ' / ' + source);

      try {
        const templateData = JSON.parse(templateStr);
        const allSheetKeys = Object.keys(templateData).filter(k => k.startsWith('sheet_'));
        dbg('[强制删除] 模板中共有 ' + allSheetKeys.length + ' 个表格');

        const markedKeys = allSheetKeys.filter(key => {
          const table = templateData[key];
          if (!table || !table.name) return false;
          const hasMarker = table.name.includes(MAP_TABLE_MARKER);
          if (hasMarker) {
            dbg('[强制删除] 找到带标记的表格:', key + ' - ' + table.name);
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
          saveDatabaseTemplate_ACU(templateKey, newTemplate, source);
          dbg('[强制删除] ✅ 已保存新模板');

          try {
            const topWindow = window.parent || window;
            if ((topWindow as any).TABLE_TEMPLATE_ACU !== undefined) {
              (topWindow as any).TABLE_TEMPLATE_ACU = newTemplate;
              dbg('[强制删除] ✅ 已更新全局TABLE_TEMPLATE_ACU变量');
            }
          } catch (e) {
            dbg('[强制删除] ⚠️ 无法访问TABLE_TEMPLATE_ACU变量');
          }
        } else {
          dbg('[强制删除] 模板中没有地图表格');
        }
      } catch (e) {
        dbg('[强制删除] ⚠️ 模板处理失败:', e);
      }
    }

    // 步骤4: 清除开关状态
    const keysToRemove: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('_map_enabled_')) {
          keysToRemove.push(key);
        }
      }
    } catch (e) {
      // ignore
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
      dbg('[强制删除] 已删除开关状态:', key);
    });

    // 步骤5: 刷新缓存
    if (api && api.exportTableAsJson) {
      const verifyData = api.exportTableAsJson();
      state.cachedData = processData(verifyData);
      if (_callbacks.updateOpenPanels) {
        _callbacks.updateOpenPanels();
      }

      const stillExists = Object.values(verifyData).some(
        (table: any) => table && table.name && table.name.includes(MAP_TABLE_MARKER),
      );

      if (stillExists) {
        showToast('清理不完全，请重试', 'error');
        dbg('[强制删除] ⚠️ 仍有残留数据');
        return false;
      }
    }

    showToast('已完全清理地图数据');
    dbg('[强制删除] ========== 完成 ==========');

    return true;
  } catch (e: any) {
    console.error('[强制删除] 异常:', e);
    console.error('[强制删除] 堆栈:', e?.stack);
    showToast('删除失败: ' + e, 'error');
    return false;
  }
}
