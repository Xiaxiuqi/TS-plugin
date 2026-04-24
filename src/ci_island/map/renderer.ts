import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getFurnitureShape } from './shapes';
import { adjustMapLayout } from './utils';

export interface MapLocation {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  desc?: string;
  elements?: MapElement[];
  walls?: MapWall[];
  facilities?: MapFacility[];
}

export interface MapElement {
  name: string;
  type: string;
  location: string;
  desc?: string;
  status?: string;
  interactions?: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface MapWall {
  sceneId: string;
  path: string;
  type: string;
  color?: string;
}

export interface MapFacility {
  sceneId: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  interactions?: string[];
  description?: string;
}

// 宏观地图渲染器 (Leaflet)
export function renderMacroMap(
  container: HTMLElement,
  locations: MapLocation[],
  walls: MapWall[],
  protagonistLocation: string,
  onLocationClick: (loc: MapLocation, e: any) => void,
) {
  console.log('[地图渲染器] 渲染宏观地图, 地点数:', locations.length);
  // 1. 初始化或获取 Leaflet 实例
  let map = (container as any)._leaflet_map;
  if (!map) {
    console.log('[地图渲染器] 初始化 Leaflet 实例 (宏观)');
    // 简单的坐标系：使用 CRS.Simple，单位为像素
    map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 5,
      zoomControl: false, // 自定义缩放控件
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
    });
    (container as any)._leaflet_map = map;
  } else {
    // 清除所有现有图层
    map.eachLayer((layer: any) => {
      map.removeLayer(layer);
    });
    // 清除自定义控件
    const customControls = container.querySelectorAll('.ci-map-title-control');
    customControls.forEach((el: any) => el.remove());
    map.invalidateSize();
  }

  if (!locations || locations.length === 0) {
    console.warn('[地图渲染器] 没有地点数据，跳过渲染');
    // 显示空状态
    return;
  }

  // 2. 调整布局
  const adjustedLocs = adjustMapLayout(locations);

  // 3. 计算边界并适应视图
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  adjustedLocs.forEach((loc: MapLocation) => {
    minX = Math.min(minX, loc.x);
    minY = Math.min(minY, loc.y);
    maxX = Math.max(maxX, loc.x + loc.width);
    maxY = Math.max(maxY, loc.y + loc.height);
  });

  // Leaflet CRS.Simple 坐标系：y轴向上为正，但通常我们的数据y轴向下为正
  // 这里我们将 y 取反来适配，或者直接使用 xy
  // 假设 loc.x, loc.y 是左上角
  const padding = 50;
  const bounds = L.latLngBounds(
    L.latLng(-maxY - padding, minX - padding), // 南西 (左下)
    L.latLng(-minY + padding, maxX + padding), // 北东 (右上)
  );
  map.fitBounds(bounds);

  // 4. 绘制地点 (Floor Plan Mode)
  // 如果有墙壁数据，我们将绘制 SVG 路径；否则回退到矩形

  // 创建一个 SVG 容器用于绘制所有的墙壁 (Floor Plan)
  // 注意：我们需要一个足够大的 viewBox 来包含所有地点
  // 这里我们假设所有 SVG 路径都是基于全局坐标系的 (0,0) -> (maxX, maxY)
  // 或者如果它们是相对坐标，我们需要调整。目前的 prompt 指示 AI 使用全局坐标。

  // 收集所有需要绘制的墙壁
  const locsWithWalls = adjustedLocs.filter((loc: MapLocation) => walls.some(w => w.sceneId === loc.name));

  if (locsWithWalls.length > 0) {
    // 创建 SVG Overlay
    // 计算覆盖所有地点的边界 (稍微扩大一点以容纳 stroke)
    const overlayBounds = L.latLngBounds(L.latLng(-maxY - 100, minX - 100), L.latLng(-minY + 100, maxX + 100));

    const svgW = maxX + 100 - (minX - 100);
    const svgH = maxY + 100 - (minY - 100);

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // viewBox 对应实际坐标范围: minX-100, minY-100, width, height
    svgElement.setAttribute('viewBox', `${minX - 100} ${minY - 100} ${svgW} ${svgH}`);
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    // 添加到地图
    (L as any).svgOverlay(svgElement, overlayBounds, { interactive: true }).addTo(map);

    // 遍历地点绘制
    adjustedLocs.forEach((loc: MapLocation) => {
      const locWalls = walls.filter(w => w.sceneId === loc.name);
      const center = L.latLng(-(loc.y + loc.height / 2), loc.x + loc.width / 2);

      if (locWalls.length > 0) {
        // 绘制 SVG 路径
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'ci-map-location-group');
        g.style.cursor = 'pointer';

        // 点击事件 (通过 Leaflet 代理或者直接绑定 DOM)
        // Leaflet SVG Overlay interactive: true 会捕获点击，但我们可能需要手动处理
        // 由于 svgOverlay 是作为一个整体添加的，我们需要给 g 元素绑定事件
        // 但是 Leaflet 的 svgOverlay 内部机制可能比较复杂。
        // 更简单的方法：
        // 为每个地点创建一个单独的 SVG Overlay 或者 Polygon (如果路径简单)。
        // 但是 path 可能很复杂 (曲线)。

        // 方案 B: 使用 SVG 元素，但点击判定可能需要辅助。
        // 实际上，我们可以给 SVG path 添加 pointer-events: all

        // 分离墙壁和门/开口
        const solidWalls = locWalls.filter(
          w =>
            !w.type ||
            (w.type.toLowerCase() !== 'door' &&
              w.type.toLowerCase() !== 'gap' &&
              w.type !== '门' &&
              w.type !== '开口' &&
              w.type !== '门洞'),
        );
        const connections = locWalls.filter(
          w =>
            w.type &&
            (w.type.toLowerCase() === 'door' ||
              w.type.toLowerCase() === 'gap' ||
              w.type === '门' ||
              w.type === '开口' ||
              w.type === '门洞'),
        );

        // 1. 绘制房间地面 (Solid Walls)
        solidWalls.forEach(wall => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', wall.path);
          path.setAttribute('fill', 'rgba(140, 110, 84, 0.15)'); // HSR 风格填充
          path.setAttribute('stroke', 'var(--ci-accent)');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('vector-effect', 'non-scaling-stroke');
          g.appendChild(path);
        });

        // 2. 绘制门/连接 (Connections) - 覆盖在墙壁之上
        connections.forEach(conn => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', conn.path);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-width', '3');
          path.setAttribute('vector-effect', 'non-scaling-stroke');

          const type = conn.type?.toLowerCase();
          if (type === 'door' || type === '门') {
            path.setAttribute('stroke', '#4ec9b0'); // 青色门
            path.setAttribute('stroke-dasharray', '4,2');
          } else {
            // Gap/Opening
            path.setAttribute('stroke', 'rgba(140, 110, 84, 0.3)'); // 浅色连接
            path.setAttribute('stroke-dasharray', '2,2');
          }
          g.appendChild(path);
        });

        // 添加隐形点击区域 (如果 fill 是空的，可能点不到)
        // 上面的 fill 有颜色，所以应该可以点击。

        svgElement.appendChild(g);

        // 绑定点击事件到 g 元素
        // 注意：SVG 元素在 Leaflet overlay 内部，Leaflet 会处理一些事件。
        // 我们需要确保点击能穿透到这里，或者在这里被捕获。
        g.addEventListener('click', e => {
          console.log('[地图渲染器] 点击 SVG 地点:', loc.name);
          e.stopPropagation(); // 阻止冒泡到地图拖拽
          onLocationClick(loc, e);
        });

        // 悬停效果
        g.addEventListener('mouseenter', () => {
          g.querySelectorAll('path').forEach(p => {
            p.setAttribute('fill', 'rgba(140, 110, 84, 0.3)');
            p.setAttribute('stroke-width', '3');
          });
        });
        g.addEventListener('mouseleave', () => {
          g.querySelectorAll('path').forEach(p => {
            p.setAttribute('fill', 'rgba(140, 110, 84, 0.15)');
            p.setAttribute('stroke-width', '2');
          });
        });
      } else {
        // 回退：没有墙壁数据的地点，绘制矩形
        // 依然使用 Leaflet Rectangle，因为它处理交互很方便
        const rectBounds = L.latLngBounds(L.latLng(-(loc.y + loc.height), loc.x), L.latLng(-loc.y, loc.x + loc.width));

        const rect = L.rectangle(rectBounds, {
          color: 'var(--ci-accent)',
          weight: 1.5,
          fillColor: 'rgba(140, 110, 84, 0.1)',
          fillOpacity: 0.5,
        }).addTo(map);

        rect.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          onLocationClick(loc, e.originalEvent || e);
        });
      }

      // 添加标签 (通用)
      const labelIcon = L.divIcon({
        className: 'ci-map-label',
        html: `<div style="font-weight:800; font-size:16px; color:var(--ci-text-primary); text-shadow: 0 0 3px #fff; white-space:nowrap; width:max-content; transform:translate(-50%, -50%);">${loc.name}</div>`,
        iconSize: [0, 0],
      });
      L.marker(center, { icon: labelIcon, interactive: false }).addTo(map);

      // 主角标记 (通用)
      if (loc.name === protagonistLocation || (protagonistLocation && loc.name.includes(protagonistLocation))) {
        const pulseIcon = L.divIcon({
          className: 'ci-map-pulse-icon',
          html: `<div class="ci-map-pulse-wave" style="width:40px; height:40px; border:2px solid var(--ci-accent); border-radius:50%; position:absolute; top:-20px; left:-20px;"></div>`,
          iconSize: [0, 0],
        });
        L.marker(center, { icon: pulseIcon, interactive: false }).addTo(map);
      }
    });
  } else {
    // 旧模式：全是矩形
    adjustedLocs.forEach((loc: MapLocation) => {
      // 矩形区域
      const rectBounds = L.latLngBounds(L.latLng(-(loc.y + loc.height), loc.x), L.latLng(-loc.y, loc.x + loc.width));

      const rect = L.rectangle(rectBounds, {
        color: 'var(--ci-accent)',
        weight: 1.5,
        fillColor: 'rgba(140, 110, 84, 0.1)',
        fillOpacity: 0.5,
      }).addTo(map);

      // 绑定事件
      rect.on('click', (e: any) => {
        console.log('[地图渲染器] 点击地点:', loc.name);
        L.DomEvent.stopPropagation(e);
        // [Fix] 传递原始事件对象，以便正确定位弹窗
        onLocationClick(loc, e.originalEvent || e);
      });

      // 添加文字标签 (使用 DivIcon)
      const center = rectBounds.getCenter();
      const labelIcon = L.divIcon({
        className: 'ci-map-label',
        html: `<div style="font-weight:800; font-size:16px; color:var(--ci-text-primary); text-shadow: 0 0 3px #fff; white-space:nowrap; width:max-content; transform:translate(-50%, -50%);">${loc.name}</div>`,
        iconSize: [0, 0], // 让CSS控制大小
      });
      L.marker(center, { icon: labelIcon, interactive: false }).addTo(map);

      // 主角标记
      if (loc.name === protagonistLocation || (protagonistLocation && loc.name.includes(protagonistLocation))) {
        const pulseIcon = L.divIcon({
          className: 'ci-map-pulse-icon',
          html: `<div class="ci-map-pulse-wave" style="width:40px; height:40px; border:2px solid var(--ci-accent); border-radius:50%; position:absolute; top:-20px; left:-20px;"></div>`,
          iconSize: [0, 0],
        });
        L.marker(center, { icon: pulseIcon, interactive: false }).addTo(map);
      }
    });
  }
}

// 微观地图渲染器 (Leaflet)
export function renderMicroMap(
  container: HTMLElement,
  location: MapLocation,
  walls: MapWall[],
  facilities: MapFacility[],
  elements: MapElement[],
  onElementClick: (el: MapElement | MapFacility, e: any) => void,
  onBackClick: () => void,
) {
  console.log('[地图渲染器] 渲染微观地图:', location.name, {
    墙壁数: walls.length,
    设施数: facilities.length,
    元素数: elements.length,
  });

  let map = (container as any)._leaflet_map;

  // Ensure container has dimensions
  if (container.clientHeight === 0) {
    console.warn('[地图渲染器] 微观视图容器高度为0，强制设置');
    container.style.height = '100%';
  }

  if (!map) {
    console.log('[地图渲染器] 初始化 Leaflet 实例 (微观)');
    map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -5,
      maxZoom: 5,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
    });
    (container as any)._leaflet_map = map;
  } else {
    map.eachLayer((layer: any) => map.removeLayer(layer));
    // 清除自定义控件
    const customControls = container.querySelectorAll('.ci-map-title-control');
    customControls.forEach((el: any) => el.remove());
    map.invalidateSize(); // Critical for correct rendering after visibility change
  }

  // 设定房间大小 (虚拟坐标)
  const roomW = 800;
  const roomH = 600;
  const bounds = L.latLngBounds(L.latLng(-roomH, 0), L.latLng(0, roomW));
  map.fitBounds(bounds);

  // 1. 绘制房间背景
  L.rectangle(bounds, {
    color: '#333',
    weight: 0,
    fillColor: '#f5f5f5',
    fillOpacity: 1,
    interactive: false, // Fix: Allow map panning
  }).addTo(map);

  // 2. 绘制墙壁 (SVG Paths)
  if (walls && walls.length > 0) {
    console.log('[地图渲染器] 绘制墙壁:', walls.length);
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Ensure viewBox matches the coordinate system
    svgElement.setAttribute('viewBox', `0 0 ${roomW} ${roomH}`);
    // Explicitly set width/height to avoid 0x0 size issues
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    walls.forEach(wall => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', wall.path);
      path.setAttribute('fill', 'none');

      // Handle Wall Types
      if (wall.type && (wall.type.toLowerCase() === 'gap' || wall.type === '开口' || wall.type === '门洞')) {
        // Gap: Transparent (Opening)
        path.setAttribute('stroke', 'transparent');
      } else if (wall.type && (wall.type.toLowerCase() === 'door' || wall.type === '门')) {
        // Door: Visual Mark (e.g., Thinner Cyan Line)
        path.setAttribute('stroke', '#4ec9b0');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-dasharray', '4,2'); // Dashed line for door
      } else {
        // Standard Wall
        path.setAttribute('stroke', wall.color || '#333');
        path.setAttribute('stroke-width', '4');
      }

      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svgElement.appendChild(path);
    });

    // SVG Overlay needs precise bounds matching the image/svg content
    const svgBounds = L.latLngBounds(L.latLng(-roomH, 0), L.latLng(0, roomW));

    // Fix: Use L.svgOverlay with explicit bounds and options
    // Casting L to any to avoid type issues with svgOverlay if types are missing
    try {
      const overlay = (L as any)
        .svgOverlay(svgElement, svgBounds, {
          interactive: false,
        })
        .addTo(map);
      console.log('[地图渲染器] SVG Overlay 添加成功');
    } catch (e) {
      console.error('[地图渲染器] SVG Overlay 添加失败:', e);
    }
  } else {
    console.log('[地图渲染器] 无墙壁数据');
  }

  // 3. 绘制设施 (原家具) - 使用 Polygon 以支持缩放和旋转
  if (facilities && facilities.length > 0) {
    console.log('[地图渲染器] 绘制设施:', facilities.length);
    facilities.forEach(item => {
      const shapeConfig = getFurnitureShape(item.type);
      const w = item.width || shapeConfig.width * 3;
      const h = item.height || shapeConfig.height * 3;
      const color = shapeConfig.color || '#ccc';

      // 中心点
      const cx = item.x + w / 2;
      const cy = item.y + h / 2;
      const rotationRad = (item.rotation || 0) * (Math.PI / 180);

      // 计算四个顶点 (相对于中心点旋转)
      // V1: -w/2, -h/2
      // V2: +w/2, -h/2
      // V3: +w/2, +h/2
      // V4: -w/2, +h/2
      const corners = [
        { dx: -w / 2, dy: -h / 2 },
        { dx: w / 2, dy: -h / 2 },
        { dx: w / 2, dy: h / 2 },
        { dx: -w / 2, dy: h / 2 },
      ];

      const rotatedCorners = corners.map(c => {
        // 旋转矩阵:
        // x' = x*cos - y*sin
        // y' = x*sin + y*cos
        const rx = c.dx * Math.cos(rotationRad) - c.dy * Math.sin(rotationRad);
        const ry = c.dx * Math.sin(rotationRad) + c.dy * Math.cos(rotationRad);

        // 转换回 Leaflet 坐标 (y轴取反)
        // Leaflet Y = -(cy + ry)
        // Leaflet X = cx + rx
        return L.latLng(-(cy + ry), cx + rx);
      });

      const polygon = (L as any)
        .polygon(rotatedCorners, {
          color: '#666',
          weight: 1,
          fillColor: color,
          fillOpacity: 0.9,
          className: 'ci-map-facility',
        })
        .addTo(map);

      // 添加文字标签 (在中心点)
      // 使用 DivIcon 但不作为交互主体，仅用于显示文字
      // 注意：文字大小不会随地图缩放，但这是符合预期的 (类似地图标注)
      // 如果希望文字也缩放，需要使用 SVG Text
      const labelIcon = L.divIcon({
        className: 'ci-map-facility-label',
        html: `<div style="font-size:12px; color:#333; text-align:center; text-shadow:0 0 2px rgba(255,255,255,0.8); pointer-events:none;">${item.name}</div>`,
        iconSize: [w, 20], // 宽度设为物体宽，高度给个大概
        iconAnchor: [w / 2, 10],
      });
      L.marker(L.latLng(-cy, cx), { icon: labelIcon, interactive: false }).addTo(map);

      polygon.on('click', (e: any) => {
        console.log('[地图渲染器] 点击设施:', item.name, item);
        L.DomEvent.stopPropagation(e);
        onElementClick(item, e.originalEvent || e);
      });

      // 添加简单的 Tooltip
      polygon.bindTooltip(item.name, { direction: 'center', permanent: false, className: 'ci-map-tooltip' });
    });
  }

  // 4. 绘制动态元素 (NPC/Items)
  if (elements && elements.length > 0) {
    let nextX = 50;
    let nextY = 50;
    const itemGap = 100;

    // 预处理：检测重叠并分散
    const processedElements = elements.map(el => {
      const x = el.x !== undefined ? el.x : nextX;
      const y = el.y !== undefined ? el.y : nextY;

      if (el.x === undefined) {
        nextX += itemGap;
        if (nextX > roomW - 50) {
          nextX = 50;
          nextY += itemGap;
        }
      }
      return { ...el, _renderX: x, _renderY: y };
    });

    // 简单的力导向分散算法 (迭代几次)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < processedElements.length; j++) {
        for (let k = j + 1; k < processedElements.length; k++) {
          const elA = processedElements[j];
          const elB = processedElements[k];
          const dx = elA._renderX - elB._renderX;
          const dy = elA._renderY - elB._renderY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = 40; // 最小间距

          if (dist < minDist) {
            // 如果重叠或太近，推开
            const angle = Math.atan2(dy, dx);
            const force = (minDist - dist) / 2;
            // 如果完全重叠 (dist=0)，随机角度
            const moveAngle = dist === 0 ? Math.random() * Math.PI * 2 : angle;
            const moveDist = dist === 0 ? 5 : force;

            const moveX = Math.cos(moveAngle) * moveDist;
            const moveY = Math.sin(moveAngle) * moveDist;

            elA._renderX += moveX;
            elA._renderY += moveY;
            elB._renderX -= moveX;
            elB._renderY -= moveY;
          }
        }
      }
    }

    processedElements.forEach(el => {
      const x = el._renderX;
      const y = el._renderY;
      const w = el.width || 40; // 这里的 w/h 是像素单位 (在 CRS.Simple 中)

      // 使用 L.circle 代替 L.circleMarker
      // L.circle 的 radius 是地图单位 (这里就是像素)，会随缩放变化
      // L.circleMarker 的 radius 是屏幕像素，不随缩放变化
      const radius = (w / 2) * 0.8; // 稍微小一点
      const center = L.latLng(-(y + w / 2), x + w / 2); // 假设是正方形

      const layer = L.circle(center, {
        radius: radius,
        color: '#fff',
        weight: 2,
        fillColor: 'var(--ci-accent)',
        fillOpacity: 1,
        className: 'ci-map-element',
      });

      layer.addTo(map);

      // 确保元素在设施上方
      layer.bringToFront();

      // 绑定交互
      layer.on('click', (e: any) => {
        console.log('[地图渲染器] 点击元素:', el.name, el);
        L.DomEvent.stopPropagation(e);
        onElementClick(el, e.originalEvent || e);
      });

      // 添加 Tooltip (permanent: true 让名字一直显示，类似原来的效果)
      // 注意：Tooltip 默认大小固定，不随地图缩放，这通常是好的 UI 体验
      layer.bindTooltip(el.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -radius],
        className: 'ci-map-tooltip',
        interactive: false, // 防止 Tooltip 阻挡点击
      });
    });
  }

  // 5. 绘制标题和返回按钮 (使用 Control)
  const TitleControl = L.Control.extend({
    onAdd: function () {
      const div = L.DomUtil.create('div', 'ci-map-title-control');
      div.innerHTML = `
        <div style="background:rgba(255,255,255,0.9); padding:8px 12px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:10px; pointer-events:auto;">
          <button id="ci-map-back-btn" style="border:none; background:var(--ci-accent); color:white; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:4px;">
            <span style="font-size:12px;">◀</span> 返回
          </button>
          <span style="font-weight:bold; font-size:16px; color:var(--ci-text-title);">${location.name}</span>
        </div>
      `;
      // 防止地图事件穿透
      L.DomEvent.disableClickPropagation(div);
      return div;
    },
  });
  new TitleControl({ position: 'topleft' }).addTo(map);

  // 绑定返回按钮事件 (需要等待DOM添加到地图后)
  setTimeout(() => {
    const btn = container.querySelector('#ci-map-back-btn');
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        onBackClick();
      });
    }
  }, 0);
}
