/**
 * 检查两个矩形是否重叠（带边距）。
 * @param rect1 - {x, y, width, height}
 * @param rect2 - {x, y, width, height}
 * @param margin - 边距
 * @returns {boolean} - 如果重叠则返回 true。
 */
export function checkOverlap(rect1: any, rect2: any, margin: number = 10): boolean {
  return (
    rect1.x < rect2.x + rect2.width + margin &&
    rect1.x + rect1.width + margin > rect2.x &&
    rect1.y < rect2.y + rect2.height + margin &&
    rect1.y + rect1.height + margin > rect2.y
  );
}

/**
 * 使用简单的力导向算法调整布局，以最小化重叠。
 * @param locations - 地点对象数组。
 * @param iterations - 迭代次数
 * @param forceFactor - 力度因子
 * @param margin - 边距
 * @returns {Array<object>} - 修改后的地点对象数组。
 */
export function adjustMapLayout(locations: any[], iterations = 150, forceFactor = 0.5, margin = 15) {
  if (!locations || locations.length < 2) return locations;

  // 创建副本以免修改原始数据引用（虽然在这里可能没关系，但为了安全）
  const adjustedLocs = JSON.parse(JSON.stringify(locations));

  for (let i = 0; i < iterations; i++) {
    for (let j = 0; j < adjustedLocs.length; j++) {
      for (let k = j + 1; k < adjustedLocs.length; k++) {
        const locA = adjustedLocs[j];
        const locB = adjustedLocs[k];
        if (checkOverlap(locA, locB, margin)) {
          let dx = locA.x + locA.width / 2 - (locB.x + locB.width / 2);
          let dy = locA.y + locA.height / 2 - (locB.y + locB.height / 2);
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) {
            dx = (Math.random() - 0.5) * 0.1;
            dy = (Math.random() - 0.5) * 0.1;
            distance = Math.sqrt(dx * dx + dy * dy);
          }
          const overlapX = (locA.width / 2 + locB.width / 2 + margin) - Math.abs(dx);
          const overlapY = (locA.height / 2 + locB.height / 2 + margin) - Math.abs(dy);
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
  return adjustedLocs;
}

/**
 * 计算一组元素的边界框
 */
export function calculateBoundingBox(elements: any[], padding = 50) {
  if (!elements || elements.length === 0) return { x: 0, y: 0, w: 800, h: 600 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elements.forEach(l => {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + (l.width || 0));
    maxY = Math.max(maxY, l.y + (l.height || 0));
  });

  // 防止无效值
  if (!isFinite(minX)) minX = 0;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxX)) maxX = 800;
  if (!isFinite(maxY)) maxY = 600;

  return {
    x: minX - padding,
    y: minY - padding,
    w: Math.max(100, maxX - minX + padding * 2),
    h: Math.max(100, maxY - minY + padding * 2)
  };
}

/**
 * 显示地图交互弹窗
 * @param x - 屏幕X坐标
 * @param y - 屏幕Y坐标
 * @param options - 选项列表
 * @param onSelect - 选择回调
 * @param title - (可选) 标题
 * @param desc - (可选) 描述
 */
export function showMapPopup(x: number, y: number, options: string[], onSelect: (opt: string) => void, title?: string, desc?: string) {
  // Remove existing popups
  const existing = document.querySelector('.ci-map-popup-card');
  if (existing) existing.remove();

  if (!options || options.length === 0) return;

  const popup = document.createElement('div');
  popup.className = 'ci-map-popup-card';

  // 1. Header (Title)
  if (title) {
    const header = document.createElement('div');
    header.className = 'ci-map-popup-header';
    header.innerHTML = `
      <span class="ci-map-popup-title">${title}</span>
      <span class="ci-map-popup-close">×</span>
    `;
    popup.appendChild(header);

    // Bind close button
    const closeBtn = header.querySelector('.ci-map-popup-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.remove();
        });
    }
  }

  // 2. Body (Description)
  if (desc) {
    const body = document.createElement('div');
    body.className = 'ci-map-popup-body';
    body.textContent = desc;
    popup.appendChild(body);
  }

  // 3. Actions (Options)
  const actions = document.createElement('div');
  actions.className = 'ci-map-popup-actions';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'ci-map-action-btn';
    // Add icon if possible (simple heuristic)
    let icon = '';
    if (opt.includes('看') || opt.includes('查')) icon = '<i class="fas fa-eye"></i> ';
    else if (opt.includes('拿') || opt.includes('取')) icon = '<i class="fas fa-hand-paper"></i> ';
    else if (opt.includes('走') || opt.includes('去')) icon = '<i class="fas fa-walking"></i> ';
    else icon = '<i class="fas fa-circle" style="font-size:6px; vertical-align:middle;"></i> ';

    btn.innerHTML = `${icon}${opt}`;
    btn.onclick = (e) => {
      e.stopPropagation();
      onSelect(opt);
      popup.remove();
    };
    actions.appendChild(btn);
  });
  popup.appendChild(actions);

  document.body.appendChild(popup);

  // Dynamic positioning logic
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const rect = popup.getBoundingClientRect();

  let left = x + 15;
  let top = y;

  // Horizontal adjustment
  if (left + rect.width > winW - 10) {
    left = x - rect.width - 15;
  }
  if (left < 10) left = 10;

  // Vertical adjustment
  if (top + rect.height > winH - 10) {
    top = winH - rect.height - 10;
  }
  if (top < 10) top = 10;

  popup.style.left = left + 'px';
  popup.style.top = top + 'px';

  // Close on click outside
  const closeHandler = (e: MouseEvent) => {
    if (!popup.contains(e.target as Node)) {
      popup.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  // Timeout to avoid immediate trigger
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 0);
}

/**
 * 解析坐标，如果无效则使用网格布局作为兜底
 * @param rawX - 原始X坐标
 * @param rawY - 原始Y坐标
 * @param index - 索引（用于计算网格位置）
 * @param gridWidth - 网格宽度
 * @param gridHeight - 网格高度
 * @param cols - 每行列数
 */
export function parseCoordinatesWithFallback(
  rawX: any,
  rawY: any,
  index: number,
  gridWidth: number = 200,
  gridHeight: number = 150,
  cols: number = 4
): { x: number; y: number; isFallback: boolean } {
  let x = parseInt(rawX);
  let y = parseInt(rawY);
  let isFallback = false;

  if (isNaN(x) || isNaN(y)) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    x = col * gridWidth;
    y = row * gridHeight;
    isFallback = true;
  }
  return { x, y, isFallback };
}
