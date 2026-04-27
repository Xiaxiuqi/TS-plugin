/**
 * 人物关系图面板
 *
 * 完整渲染逻辑：
 *  - 数据收集（角色 + 关系标签解析）
 *  - 力导向布局（来自 layout.ts）
 *  - SVG 渲染（节点 + 连线 + 标签 + 智能路由 + 防重叠）
 *  - 交互（高亮、长按、缩放、拖拽、点击详情弹窗）
 *
 * 源代码迁移自 src/ci_island_test/_backup/index.original.ts:6250-7126
 */
import { ICONS, STORAGE_AVATAR_PREFIX } from '../../core';
import { state } from '../../core/state';
import { safeGetItem } from '../../core/storage';
import { dbg, handleDrag } from '../../core/utils';
import { runForceLayout, intersectLineRect, type RelationNode } from './layout';

export { runForceLayout, intersectLineRect } from './layout';
export type { RelationNode } from './layout';

declare const $: any;

/**
 * 关系图面板回调
 *  - createCardElement: 由 panels/characters 提供，避免循环依赖
 */
export interface RelationPanelCallbacks {
  createCardElement?: (char: any) => any;
}

let callbacks: RelationPanelCallbacks = {};

export function setRelationPanelCallbacks(cb: RelationPanelCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

/**
 * 显示关系图节点点击的角色详情卡片（弹出菜单）
 */
export function showRelationCharDetail(char: any, event: any): void {
  $('.ci-popup-card-container').remove();

  if (!callbacks.createCardElement) {
    dbg('[关系图] createCardElement 回调未注入，无法显示角色详情');
    return;
  }
  const $card = callbacks.createCardElement(char);
  if (!$card || !$card.length) return;

  $card.addClass('ci-popup-card-container').css({
    position: 'fixed',
    zIndex: 10000,
    margin: 0,
    border: '1px solid var(--ci-border)',
    background: 'var(--ci-bg, #fff)',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    width: '220px',
    height: 'auto',
    opacity: 0,
    transform: 'none',
    transition: 'opacity 0.2s ease',
  });

  $card.removeClass('is-expanded');
  $card.find('.ci-card-compact').show();
  $card.find('.ci-expanded-box').hide();
  $card.find('.ci-nb-right').removeClass('full-width');

  $('body').append($card);

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const menuWidth = $card.outerWidth() || 220;
  const menuHeight = $card.outerHeight() || 150;

  const clickX = event.clientX;
  const clickY = event.clientY;

  let menuX = clickX;
  let menuY = clickY;

  if (menuX + menuWidth > winW - 10) menuX = clickX - menuWidth;
  if (menuY + menuHeight > winH - 10) menuY = clickY - menuHeight;
  if (menuX < 10) menuX = 10;
  if (menuY < 10) menuY = 10;

  $card.css({ left: menuX + 'px', top: menuY + 'px', opacity: 1 });
}

/**
 * 渲染人物关系图
 * @param $container 容器 jQuery 对象
 */
export function renderRelationGraph($container: any): void {
  dbg('[关系图] 开始渲染人物关系图 (V5.2 - 智能路由+物理引擎优化版 / 模块化迁移)');
  $container.empty();

  // 1. 准备数据
  const allChars = [
    ...state.cachedData.main,
    ...state.cachedData.side,
    ...state.cachedData.retired,
  ];
  if (allChars.length === 0) {
    $container.html(`
      <div class="ci-relation-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;color:var(--ci-text-secondary, #999);text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;opacity:0.5;">${ICONS.relation}</div>
        <div style="font-size:14px;margin-bottom:8px;">暂无角色数据</div>
        <div style="font-size:12px;opacity:0.7;">请先在角色面板中添加角色</div>
        <div style="font-size:12px;opacity:0.7;">并确保角色表存在角色间关系的列</div>
      </div>
    `);
    return;
  }

  // 找到主角
  let protagonist = allChars.find(
    (c: any) => c.name && (c.name.includes('主角') || c._src?.table === '主角信息'),
  );
  if (!protagonist && state.cachedData.main.length > 0) protagonist = state.cachedData.main[0];
  if (!protagonist) protagonist = allChars[0];

  const nodes: RelationNode[] = [];
  const nodeMap = new Map<string, RelationNode>();
  const rawLinks: { source: string; target: string; weight: number }[] = [];

  // 创建节点对象
  allChars.forEach((char: any) => {
    const isP = char.name === protagonist.name;
    const node: RelationNode = {
      id: char.name,
      data: char,
      isProtagonist: isP,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: isP ? 50 : 40,
      width: isP ? 100 : 80,
      height: isP ? 100 : 80,
      mass: isP ? 15 : 1,
    };
    nodes.push(node);
    nodeMap.set(char.name, node);
  });

  // 解析连线与分组
  const allCharNames = Array.from(nodeMap.keys()).sort((a, b) => b.length - a.length);
  // pairMap Key: "id1_id2" (sorted)
  const pairMap = new Map<string, any>();

  allChars.forEach((char: any) => {
    if (!char.relation) return;

    const parts = String(char.relation)
      .split(/[,，;；]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s);

    parts.forEach((part: string) => {
      let targetName = protagonist.name;
      let displayLabel = part;
      let foundExplicitTarget = false;

      const matchBracket = part.match(/^\[(.*?)\](.*)$/);
      if (matchBracket) {
        targetName = matchBracket[1];
        displayLabel = part.replace(/[[\]]/g, '').trim();
        foundExplicitTarget = true;
      } else {
        for (const name of allCharNames) {
          if (name === char.name) continue;
          if (part.includes(name)) {
            targetName = name;
            displayLabel = part.replace(/[[\]]/g, '');
            foundExplicitTarget = true;
            break;
          }
        }
      }

      if (!foundExplicitTarget) {
        targetName = protagonist.name;
        displayLabel = part.replace(/[[\]]/g, '');
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

        const u = nodeMap.get(char.name)!;
        const v = targetNode;
        const key = u.id < v.id ? `${u.id}_${v.id}` : `${v.id}_${u.id}`;
        if (!pairMap.has(key)) {
          pairMap.set(key, {
            u: u.id < v.id ? u : v,
            v: u.id < v.id ? v : u,
            labelsUtoV: [] as string[],
            labelsVtoU: [] as string[],
          });
        }
        const entry = pairMap.get(key);
        if (char.name === entry.u.id) {
          if (!entry.labelsUtoV.includes(displayLabel)) entry.labelsUtoV.push(displayLabel);
        } else if (!entry.labelsVtoU.includes(displayLabel)) entry.labelsVtoU.push(displayLabel);
      }
    });
  });

  // 2. 物理导向布局算法（来自 layout.ts）
  runForceLayout(nodes, rawLinks, nodeMap);

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

  // ===== 标签绘制 =====
  const drawLabel = (
    x: number,
    y: number,
    text: string,
    isVertical: boolean = false,
    offset: number = 0,
    pairId: string = '',
  ): SVGGElement => {
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
    let textW = 0;
    let textH = 0;
    if (isVertical) {
      labelText.setAttribute(
        'style',
        'writing-mode: vertical-rl; text-orientation: upright; dominant-baseline: auto;',
      );
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
    (labelGroup as any)._bbox = {
      x: finalX - textW / 2,
      y: finalY - textH / 2,
      width: textW,
      height: textH,
    };
    return labelGroup;
  };

  // ===== 智能路径计算 =====
  const getSmartPath = (
    startNode: RelationNode,
    endNode: RelationNode,
    offset: number = 0,
  ): any => {
    const x1 = startNode.x;
    const y1 = startNode.y;
    const x2 = endNode.x;
    const y2 = endNode.y;
    const checkCollision = (p1x: number, p1y: number, p2x: number, p2y: number) => {
      for (const node of nodes) {
        if (node.id === startNode.id || node.id === endNode.id) continue;
        if (intersectLineRect(p1x, p1y, p2x, p2y, node.x, node.y, node.width, node.height))
          return true;
      }
      return false;
    };

    const mkPath = (segments: any[], lx: number, ly: number, isVertical: boolean) => ({
      path: `M ${segments[0].x1} ${segments[0].y1} L ${segments
        .map((s: any) => `${s.x2} ${s.y2}`)
        .join(' L ')}`,
      segments,
      lx,
      ly,
      isVertical,
    });

    // 策略1：水平 Z 型 (中间段垂直)
    const stratH = () => {
      const mx = (x1 + x2) / 2 + offset;
      if (
        !checkCollision(x1, y1, mx, y1) &&
        !checkCollision(mx, y1, mx, y2) &&
        !checkCollision(mx, y2, x2, y2)
      ) {
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

    // 策略2：垂直 Z 型 (中间段水平)
    const stratV = () => {
      const my = (y1 + y2) / 2 + offset;
      if (
        !checkCollision(x1, y1, x1, my) &&
        !checkCollision(x1, my, x2, my) &&
        !checkCollision(x2, my, x2, y2)
      ) {
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
    const strategies = dx > dy ? [stratV, stratH, stratDetour] : [stratH, stratV, stratDetour];

    for (const s of strategies) {
      const res = s();
      if (res) return res;
    }
    const mx = (x1 + x2) / 2 + offset;
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

  const checkLabelCollision = (
    x: number,
    y: number,
    w: number,
    h: number,
    ignorePairId?: string,
  ) => {
    for (const seg of allSegments) {
      if (ignorePairId && seg.pairId === ignorePairId) continue;
      if (intersectLineRect(seg.x1, seg.y1, seg.x2, seg.y2, x, y, w, h)) return true;
    }
    for (const el of labelElements) {
      const bbox = (el as any)._bbox;
      const thisLeft = x - w / 2;
      const thisRight = x + w / 2;
      const thisTop = y - h / 2;
      const thisBottom = y + h / 2;

      const otherLeft = bbox.x;
      const otherRight = bbox.x + bbox.width;
      const otherTop = bbox.y;
      const otherBottom = bbox.y + bbox.height;

      if (
        thisLeft < otherRight &&
        thisRight > otherLeft &&
        thisTop < otherBottom &&
        thisBottom > otherTop
      ) {
        return true;
      }
    }
    return false;
  };

  const pendingLabels: any[] = [];

  // Pass 1: Draw all lines and collect segments
  pairMap.forEach((entry: any) => {
    const { u, v, labelsUtoV, labelsVtoU } = entry;
    const firstLabel = labelsUtoV[0] || labelsVtoU[0] || '关系';
    let hash = 0;
    for (let i = 0; i < firstLabel.length; i++) {
      hash = firstLabel.charCodeAt(i) + ((hash << 5) - hash);
    }
    const strokeColor = `hsl(${Math.abs(hash % 360)}, 40%, 60%)`;

    const pairId = u.id < v.id ? `${u.id}_${v.id}` : `${v.id}_${u.id}`;

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
      segments.forEach((s: any) => allSegments.push({ ...s, pairId }));
    }

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
      segments,
    });
  });

  // Pass 2: Place labels
  pendingLabels.forEach((item: any) => {
    const { labelsUtoV, labelsVtoU, lx, ly, pairId, segments } = item;

    const textUtoV = labelsUtoV.join(',');
    const textVtoU = labelsVtoU.join(',');

    const hasUtoV = textUtoV.length > 0;
    const hasVtoU = textVtoU.length > 0;

    const getPointOnPath = (ratio: number) => {
      if (!segments || segments.length === 0) return { x: lx, y: ly, isVertical: false };
      let totalLen = 0;
      const lens = segments.map((s: any) => {
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
      const ratios = [
        preferredRatio,
        preferredRatio - 0.1,
        preferredRatio + 0.1,
        preferredRatio - 0.2,
        preferredRatio + 0.2,
      ];
      const validRatios = ratios.filter(r => r >= 0.1 && r <= 0.9);

      for (const r of validRatios) {
        const pt = getPointOnPath(r);
        const finalX = pt.x;
        const finalY = pt.y;
        const localIsVertical = pt.isVertical;

        const charCount = text.length;
        let w = 0;
        let h = 0;

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

      const pt = getPointOnPath(preferredRatio);
      labelElements.push(drawLabel(pt.x, pt.y, text, pt.isVertical, 0, pairId));
    };

    if (hasUtoV && hasVtoU) {
      placeLabel(textUtoV, 0.3);
      placeLabel(textVtoU, 0.7);
    } else if (hasUtoV) {
      placeLabel(textUtoV, 0.5);
    } else if (hasVtoU) {
      placeLabel(textVtoU, 0.5);
    }
  });

  // 最后添加标签，保证在连线上层
  labelElements.forEach((el: any) => mainGroup.appendChild(el));

  // ===== 交互高亮状态管理 =====
  let stickyHighlight = false;
  let pressTimer: any = null;
  let isLongPress = false;
  let isTouchInteraction = false;

  const setHighlight = (nodeId: string | null, sticky: boolean = false) => {
    if (stickyHighlight && !sticky && nodeId !== null) return;

    if (nodeId === null) {
      if (stickyHighlight && !sticky) return;
      stickyHighlight = false;
      $container
        .find('.ci-relation-node, .ci-relation-line, .ci-relation-label-group')
        .removeClass('dimmed highlighted');
      return;
    }

    if (sticky) stickyHighlight = true;

    $container
      .find('.ci-relation-node, .ci-relation-line, .ci-relation-label-group')
      .removeClass('highlighted')
      .addClass('dimmed');

    const $currentNode = $container.find(`.ci-relation-node[data-name="${nodeId}"]`);
    $currentNode.removeClass('dimmed').addClass('highlighted');

    const relevantPairIds: string[] = [];
    pairMap.forEach((val: any, key: string) => {
      if (val.u.id === nodeId || val.v.id === nodeId) {
        relevantPairIds.push(key);
        const otherId = val.u.id === nodeId ? val.v.id : val.u.id;
        $container
          .find(`.ci-relation-node[data-name="${otherId}"]`)
          .removeClass('dimmed')
          .addClass('highlighted');
      }
    });

    relevantPairIds.forEach(pid => {
      $container
        .find(`.ci-relation-line[data-pair-id="${pid}"]`)
        .removeClass('dimmed')
        .addClass('highlighted');
      $container
        .find(`.ci-relation-label-group[data-pair-id="${pid}"]`)
        .removeClass('dimmed')
        .addClass('highlighted');
    });
  };

  // ===== 节点渲染（带交互） =====
  nodes.forEach(node => {
    const nodeSize = node.isProtagonist ? 80 : 60;
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('transform', `translate(${node.x - nodeSize / 2}, ${node.y - nodeSize / 2})`);
    g.setAttribute('class', 'ci-relation-node no-drag');
    g.setAttribute('data-name', node.id);
    g.style.cursor = 'pointer';

    g.addEventListener('mouseenter', () => {
      if (isTouchInteraction) return;
      setHighlight(node.id);
    });
    g.addEventListener('mouseleave', () => {
      if (isTouchInteraction) return;
      setHighlight(null);
    });

    g.addEventListener('touchstart', _e => {
      isTouchInteraction = true;
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        setHighlight(node.id, true);
      }, 500);
    });
    g.addEventListener('touchend', () => {
      if (pressTimer) clearTimeout(pressTimer);
      setTimeout(() => {
        isTouchInteraction = false;
      }, 500);
    });
    g.addEventListener('touchmove', () => {
      if (pressTimer) clearTimeout(pressTimer);
    });

    g.addEventListener('click', e => {
      e.stopPropagation();
      if (isLongPress) {
        isLongPress = false;
        return;
      }
      const char = allChars.find((c: any) => c.name === node.id);
      if (char) showRelationCharDetail(char, e);
      else if (node.data) showRelationCharDetail(node.data, e);
    });

    const fo = document.createElementNS(svgNS, 'foreignObject');
    fo.setAttribute('width', String(nodeSize));
    fo.setAttribute('height', String(nodeSize + 20));
    const div = document.createElementNS(xhtmlNS, 'div') as HTMLDivElement;
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
      const sex = String(node.data.sex).toLowerCase();
      if (['女', 'female', 'f', '雌性', '母', '♀'].includes(sex)) {
        nameTagStyle = 'background:#fce4ec; color:#c2185b; border:1px solid #f8bbd0;';
      } else if (['男', 'male', 'm', '雄性', '公', '♂'].includes(sex)) {
        nameTagStyle = 'background:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;';
      }
    }
    div.innerHTML = `${imgHtml}<div style="font-size:12px;margin-top:4px;white-space:nowrap;padding:1px 6px;border-radius:4px;${nameTagStyle}text-shadow:none;box-shadow:0 1px 2px rgba(0,0,0,0.05);">${node.id}</div>`;
    fo.appendChild(div);
    g.appendChild(fo);
    mainGroup.appendChild(g);
  });

  $viewport.append(svg);

  // ===== 缩放与拖拽 =====
  let scale = 1;
  let translateX = $viewport.width() / 2;
  let translateY = $viewport.height() / 2;
  const updateTransform = () => {
    mainGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
  };
  updateTransform();

  $viewport.on('wheel', function (e: any) {
    e.preventDefault();
    const delta = e.originalEvent.deltaY;
    if (delta < 0) scale *= 1.1;
    else scale /= 1.1;
    scale = Math.max(0.05, Math.min(5, scale));
    updateTransform();
  });

  let dragStartX = 0;
  let dragStartY = 0;
  let initialTranslateX = 0;
  let initialTranslateY = 0;

  handleDrag(
    $viewport,
    (startPt: any, e: any) => {
      if ($(e.target).closest('.ci-relation-node').length) return;
      state.isGlobalDragging = true;
      $viewport.css('cursor', 'grabbing');
      dragStartX = startPt.clientX;
      dragStartY = startPt.clientY;
      initialTranslateX = translateX;
      initialTranslateY = translateY;
    },
    (currPt: any, e: any) => {
      if ($(e.target).closest('.ci-relation-node').length) return;
      if (e.cancelable) e.preventDefault();
      translateX = initialTranslateX + (currPt.clientX - dragStartX);
      translateY = initialTranslateY + (currPt.clientY - dragStartY);
      updateTransform();
    },
    () => {
      $viewport.css('cursor', 'grab');
      setTimeout(() => {
        state.isGlobalDragging = false;
      }, 300);
    },
  );

  $container.find('#ci-rel-zoom-in').on('click', (e: any) => {
    e.stopPropagation();
    scale *= 1.2;
    updateTransform();
  });
  $container.find('#ci-rel-zoom-out').on('click', (e: any) => {
    e.stopPropagation();
    scale /= 1.2;
    updateTransform();
  });
  $container.find('#ci-rel-refresh').on('click', (e: any) => {
    e.stopPropagation();
    renderRelationGraph($container);
  });

  // 点击空白处清除高亮
  $viewport.on('click', (e: any) => {
    if ($(e.target).closest('.ci-relation-node').length) return;
    setHighlight(null, true);
  });
}
