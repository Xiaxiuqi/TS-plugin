/**
 * 内置地图提示词与默认表定义
 * 地图元素结构内置于前端，不强制依赖数据库模板
 */

/** 地图元素类型 */
export type MapElementType = '地点' | '角色' | '路径' | '危险区' | '安全区' | '未知';

/** 地图元素结构 */
export interface MapElement {
  name: string;
  type: MapElementType;
  description: string;
  /** 与当前场景的关系: '当前' | '相邻' | '远方' */
  proximity: '当前' | '相邻' | '远方';
  /** 可选状态标记 */
  status?: string;
}

/** 内置地图元素表字段定义 */
export const MAP_TABLE_HEADERS = ['元素名称', '类型', '描述', '与当前场景关系', '状态'] as const;

/**
 * 地图生成 AI 提示词
 * 使用时将 {elements} 替换为实际元素列表
 */
export const MAP_GENERATION_PROMPT = `你是一个场景地图生成器。根据以下元素信息，生成一个 SVG 格式的场景地图。

要求：
1. 输出纯 SVG 代码，不要包含任何解释文字
2. 尺寸: viewBox="0 0 800 600"
3. 风格: 暗色系、简洁、带有神秘感的地图风格，类似游戏小地图
4. 当前位置用高亮圆圈标记
5. 相邻地点用较亮的节点表示
6. 远方地点用暗淡节点表示
7. 角色用小图标标记在对应位置
8. 路径用虚线连接
9. 危险区用红色边框标记
10. 每个可点击元素添加 class="cm" 和 data-idx="序号" 属性
11. 不要使用 <script>、<foreignObject>、on* 事件属性
12. 不要引用外部图片或字体

当前场景元素：
{elements}

请直接输出 SVG 代码：`;

/**
 * 从数据库表格数据生成地图元素列表
 */
export function parseMapElements(rows: Record<string, string>[]): MapElement[] {
  return rows.map(row => ({
    name: row['元素名称'] || row['名称'] || '',
    type: (row['类型'] as MapElementType) || '未知',
    description: row['描述'] || '',
    proximity: (row['与当前场景关系'] || '相邻') as MapElement['proximity'],
    status: row['状态'] || undefined,
  })).filter(el => el.name !== '');
}

/**
 * 从全局数据、主体、重要角色生成临时地图元素
 * 用于数据库中无地图元素表时的 fallback
 */
export function generateTempMapElements(
  globalData: Record<string, string>,
  presentCharacters: Array<{ name: string; charId: string }>,
): MapElement[] {
  const elements: MapElement[] = [];

  // 当前地点
  const location = globalData['当前地点'];
  if (location) {
    elements.push({
      name: location,
      type: '地点',
      description: '当前所在位置',
      proximity: '当前',
    });
  }

  // 在场角色
  for (const char of presentCharacters) {
    elements.push({
      name: char.name,
      type: '角色',
      description: `角色ID: ${char.charId}`,
      proximity: '当前',
    });
  }

  return elements;
}

/**
 * 将地图元素列表格式化为提示词插入文本
 */
export function formatElementsForPrompt(elements: MapElement[]): string {
  if (elements.length === 0) return '（无元素）';

  return elements.map((el, i) =>
    `${i + 1}. [${el.type}] ${el.name} - ${el.description} (关系: ${el.proximity}${el.status ? `, 状态: ${el.status}` : ''})`
  ).join('\n');
}

/**
 * 生成完整的地图 AI 提示词
 */
export function buildMapPrompt(elements: MapElement[]): string {
  return MAP_GENERATION_PROMPT.replace('{elements}', formatElementsForPrompt(elements));
}
