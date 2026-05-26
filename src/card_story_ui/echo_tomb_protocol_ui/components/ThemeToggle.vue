<!-- 日夜主题切换 -->
<template>
  <button
    class="et-btn et-btn--ghost et-theme-toggle"
    :title="`当前：${labelMap[settings.theme]}，点击切换`"
    @click="toggle"
  >
    <svg class="et-icon"><use href="#et-i-theme" /></svg>
  </button>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../stores/useSettingsStore';

const settings = useSettingsStore();

const labelMap = {
  day: '日间',
  night: '夜间',
  auto: '自动',
} as const;

/** 循环：auto → day → night → auto */
function toggle() {
  const order = ['auto', 'day', 'night'] as const;
  const idx = order.indexOf(settings.theme);
  settings.setTheme(order[(idx + 1) % order.length]);
}
</script>
