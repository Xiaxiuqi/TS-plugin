<!-- 六维雷达图，轻量 SVG 实现 -->
<template>
  <svg
    class="et-radar"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    role="img"
    :aria-label="`雷达图：${labels.join(',')}`"
  >
    <!-- 底层同心环 -->
    <polygon
      v-for="(ring, i) in rings"
      :key="`r-${i}`"
      class="et-radar-grid"
      :points="polygonPoints(ring)"
    />
    <!-- 轴线 -->
    <line
      v-for="(p, i) in axisPoints"
      :key="`a-${i}`"
      class="et-radar-axis"
      :x1="center"
      :y1="center"
      :x2="p.x"
      :y2="p.y"
    />
    <!-- 数据形 -->
    <polygon class="et-radar-shape" :points="shapePoints" />
    <!-- 轴名与数值 -->
    <g v-for="(label, i) in labels" :key="`l-${i}`">
      <text class="et-radar-label" :x="labelPositions[i].x" :y="labelPositions[i].y">{{ label }}</text>
      <text
        class="et-radar-value"
        :x="labelPositions[i].x"
        :y="labelPositions[i].y + 11"
      >
        {{ values[i] }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ATTR_NAMES } from '../core/constants';

const props = withDefaults(
  defineProps<{
    /** 六项数值，对应 labels 顺序 */
    values: number[];
    /** 轴名顺序 */
    labels?: string[];
    /** SVG 边长 */
    size?: number;
    /** 数值上限（用于归一化） */
    max?: number;
  }>(),
  {
    labels: () => [...ATTR_NAMES],
    size: 200,
    max: 30,
  },
);

const center = computed(() => props.size / 2);
const radius = computed(() => props.size * 0.38);

/** 计算一个节点坐标，根据轴索引与比例 */
function pointAt(idx: number, ratio: number) {
  const angle = (Math.PI * 2 * idx) / 6 - Math.PI / 2;
  return {
    x: center.value + Math.cos(angle) * radius.value * ratio,
    y: center.value + Math.sin(angle) * radius.value * ratio,
  };
}

/** 同心环比例 */
const rings = [0.25, 0.5, 0.75, 1];

function polygonPoints(ratio: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const p = pointAt(i, ratio);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
}

const axisPoints = computed(() => Array.from({ length: 6 }, (_, i) => pointAt(i, 1)));

const shapePoints = computed(() => {
  return Array.from({ length: 6 }, (_, i) => {
    const v = Math.max(0, Math.min(props.max, props.values[i] ?? 0));
    const p = pointAt(i, v / props.max);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
});

const labelPositions = computed(() =>
  Array.from({ length: 6 }, (_, i) => {
    const p = pointAt(i, 1.18);
    return p;
  }),
);
</script>
