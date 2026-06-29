/**
 * 常量与全局计算函数
 *
 * 职责：避免「同一业务语义在组件中多处重复声明」。
 * 主要场景：
 *  - `ATTR_NAMES` 被 `RadarChart.vue` 默认 labels 与 `SubjectPanel.vue` 函数逻辑共用，
 *    顺序必须与 DDL `attribute_name IN ('力量','敏捷','体质','智力','感知','魅力')` 对齐
 *  - `computeRadarMax` 雷达图上限公式低等级不撑边、高等级随属性抬升
 */

/** 六维属性名称，顺序与 DDL CHECK 枚举严格对齐 */
export const ATTR_NAMES = ['力量', '敏捷', '体质', '智力', '感知', '魅力'] as const;

export type AttrName = (typeof ATTR_NAMES)[number];

/**
 * 雷达图上限计算。
 *
 * 设计考量（见 stage-01 §8.8）：
 *  - 低等级时（level=1）上限为 `level*5+20 = 25`，考虑到 floor 30，取 30；
 *    避免初创玩家三三五五点属性也能把雷达图边缘撑满，丢失可读性
 *  - 随等级抬升上限（`level*5+20`），对应纲要预期「每级 5 点 + 基础 20」的属性抬升设计
 *  - 若实际属性值超过公式上限（装备加成/传承加成等），以实际值为准，保证雷达图能生成超出属性提示
 */
export function computeRadarMax(level: number, values: readonly number[]): number {
  return Math.max(30, ...values, level * 5 + 20);
}
