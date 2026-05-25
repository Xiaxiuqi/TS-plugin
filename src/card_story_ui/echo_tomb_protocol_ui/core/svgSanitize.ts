/**
 * SVG 净化
 * 白名单过滤，防止 XSS 注入
 */

/** 允许的 SVG 元素标签 */
const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline',
  'polygon', 'text', 'tspan', 'defs', 'clipPath', 'mask', 'use',
  'symbol', 'marker', 'pattern', 'linearGradient', 'radialGradient',
  'stop', 'filter', 'feGaussianBlur', 'feOffset', 'feBlend',
  'feMerge', 'feMergeNode', 'feColorMatrix', 'feComposite',
  'title', 'desc', 'animate', 'animateTransform',
]);

/** 禁止的属性前缀/名称 */
const BLOCKED_ATTR_PATTERNS = [
  /^on/i,           // 事件属性
  /^xlink:href$/i,  // 可能的 javascript: 链接
  /^href$/i,        // 同上
  /^formaction$/i,
];

/** 禁止的属性值模式 */
const BLOCKED_VALUE_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
];

/**
 * 净化 SVG 字符串，移除危险元素和属性
 * @returns 净化后的 SVG 字符串，或 null 表示无法解析
 */
export function sanitizeSvg(svgString: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    // 检查解析错误
    const parseError = doc.querySelector('parsererror');
    if (parseError) return null;

    const svg = doc.documentElement;
    if (svg.tagName.toLowerCase() !== 'svg') return null;

    sanitizeNode(svg);

    return new XMLSerializer().serializeToString(svg);
  } catch {
    return null;
  }
}

function sanitizeNode(node: Element): void {
  // 移除禁止的子元素
  const children = Array.from(node.children);
  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    // 清理属性
    sanitizeAttributes(child);
    // 递归处理子节点
    sanitizeNode(child);
  }

  // 清理当前节点属性
  sanitizeAttributes(node);
}

function sanitizeAttributes(el: Element): void {
  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();

    // 检查属性名是否被禁止
    if (BLOCKED_ATTR_PATTERNS.some(p => p.test(name))) {
      el.removeAttribute(attr.name);
      continue;
    }

    // 检查属性值是否包含危险模式
    if (BLOCKED_VALUE_PATTERNS.some(p => p.test(attr.value))) {
      el.removeAttribute(attr.name);
      continue;
    }
  }
}
