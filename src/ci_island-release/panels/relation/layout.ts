/**
 * 人物关系图物理布局算法
 * 包含力导向布局和智能路径计算
 */

export interface RelationNode {
  id: string;
  data: any;
  isProtagonist: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  width: number;
  height: number;
  mass: number;
}

/**
 * 运行力导向布局算法
 * @param nodes 节点数组
 * @param rawLinks 连线数组
 * @param nodeMap 节点映射
 */
export function runForceLayout(
  nodes: RelationNode[],
  rawLinks: { source: string; target: string; weight: number }[],
  nodeMap: Map<string, RelationNode>,
): void {
  const iterations = 600;
  const k = 220;
  const repulsion = 1500000;
  const centerGravity = 0.01;

  // 初始化节点位置
  nodes.forEach((n: RelationNode) => {
    if (n.isProtagonist) {
      n.x = 0;
      n.y = 0;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const r = 300 + Math.random() * 500;
      n.x = Math.cos(angle) * r;
      n.y = Math.sin(angle) * r;
    }
  });

  for (let i = 0; i < iterations; i++) {
    // 节点间斥力
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const u = nodes[a];
        const v = nodes[b];
        let dx = u.x - v.x;
        let dy = u.y - v.y;
        let distSq = dx * dx + dy * dy;
        if (distSq === 0) {
          dx = 1;
          dy = 0;
          distSq = 1;
        }
        const f = repulsion / (distSq + 1000);
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        if (!u.isProtagonist) {
          u.vx += fx / u.mass;
          u.vy += fy / u.mass;
        }
        if (!v.isProtagonist) {
          v.vx -= fx / v.mass;
          v.vy -= fy / v.mass;
        }
      }
    }

    // 连线引力
    rawLinks.forEach(link => {
      const u = nodeMap.get(link.source);
      const v = nodeMap.get(link.target);
      if (!u || !v) return;
      const dx = v.x - u.x;
      const dy = v.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const f = (dist - k) * 0.08;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      if (!u.isProtagonist) {
        u.vx += fx / u.mass;
        u.vy += fy / u.mass;
      }
      if (!v.isProtagonist) {
        v.vx -= fx / v.mass;
        v.vy -= fy / v.mass;
      }
    });

    // 中心引力
    nodes.forEach(n => {
      if (!n.isProtagonist) {
        n.vx -= n.x * centerGravity;
        n.vy -= n.y * centerGravity;
      }
    });

    // 速度限制和位置更新
    const t = 1.0 - i / iterations;
    nodes.forEach(n => {
      if (!n.isProtagonist) {
        const vMag = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        const limit = 100 * t + 5;
        if (vMag > limit) {
          n.vx *= limit / vMag;
          n.vy *= limit / vMag;
        }
        n.x += n.vx * 0.1;
        n.y += n.vy * 0.1;
        n.vx *= 0.8;
        n.vy *= 0.8;
      }
    });
  }

  // 防重叠后处理
  for (let pass = 0; pass < 15; pass++) {
    let moved = false;
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const u = nodes[a];
        const v = nodes[b];
        const minD = u.radius + v.radius + 80;
        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minD) {
          const push = (minD - dist) / 2;
          const nx = dist === 0 ? 1 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;
          if (!u.isProtagonist) {
            u.x += nx * push;
            u.y += ny * push;
          }
          if (!v.isProtagonist) {
            v.x -= nx * push;
            v.y -= ny * push;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

/**
 * 检测线段与矩形是否相交
 */
export function intersectLineRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const left = rx - rw / 2 - 15;
  const right = rx + rw / 2 + 15;
  const top = ry - rh / 2 - 15;
  const bottom = ry + rh / 2 + 15;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < left || minX > right || maxY < top || minY > bottom) return false;
  if (x1 === x2) return x1 >= left && x1 <= right && Math.max(y1, y2) >= top && Math.min(y1, y2) <= bottom;
  if (y1 === y2) return y1 >= top && y1 <= bottom && Math.max(x1, x2) >= left && Math.min(x1, x2) <= right;
  return false;
}
