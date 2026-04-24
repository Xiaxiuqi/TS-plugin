export interface FurnitureShape {
  type: string;
  svgPath?: string; // SVG path data (d attribute)
  width: number;    // Default width (relative units)
  height: number;   // Default height (relative units)
  color?: string;   // Default color
  shape?: 'rect' | 'circle' | 'path'; // Basic shape type if no complex path
}

export const FURNITURE_SHAPES: Record<string, FurnitureShape> = {
  // === 基础家具 ===
  'chair': {
    type: 'chair',
    width: 10,
    height: 10,
    shape: 'rect',
    color: '#8d6e63'
  },
  'table': {
    type: 'table',
    width: 20,
    height: 20,
    shape: 'circle',
    color: '#795548'
  },
  'bed': {
    type: 'bed',
    width: 25,
    height: 35,
    shape: 'rect',
    color: '#5d4037'
  },
  'cabinet': {
    type: 'cabinet',
    width: 15,
    height: 10,
    shape: 'rect',
    color: '#4e342e'
  },
  'sofa': {
    type: 'sofa',
    width: 30,
    height: 12,
    shape: 'rect',
    color: '#3e2723'
  },
  'door': {
    type: 'door',
    width: 20,
    height: 5,
    shape: 'rect',
    color: '#8d6e63'
  },

  // === 进阶形状 (SVG Paths) ===
  // 这里可以后续添加更复杂的SVG路径

  // === 默认回退 ===
  'default': {
    type: 'default',
    width: 15,
    height: 15,
    shape: 'rect',
    color: '#9e9e9e'
  }
};

export function getFurnitureShape(type: string): FurnitureShape {
  const normalizedType = type.toLowerCase().trim();
  // 简单的关键词匹配
  if (normalizedType.includes('椅') || normalizedType.includes('chair')) return FURNITURE_SHAPES['chair'];
  if (normalizedType.includes('桌') || normalizedType.includes('table')) return FURNITURE_SHAPES['table'];
  if (normalizedType.includes('床') || normalizedType.includes('bed')) return FURNITURE_SHAPES['bed'];
  if (normalizedType.includes('柜') || normalizedType.includes('cabinet')) return FURNITURE_SHAPES['cabinet'];
  if (normalizedType.includes('沙发') || normalizedType.includes('sofa')) return FURNITURE_SHAPES['sofa'];
  if (normalizedType.includes('门') || normalizedType.includes('door')) return FURNITURE_SHAPES['door'];

  return FURNITURE_SHAPES['default'];
}
