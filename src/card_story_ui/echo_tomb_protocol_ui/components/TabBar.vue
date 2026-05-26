<!-- 主体 Tab 导航 -->
<template>
  <nav class="et-tab-bar" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.charId"
      role="tab"
      :class="['et-tab', { 'et-tab--active': tab.charId === activeId, 'et-tab--player': tab.isPlayer }]"
      :aria-selected="tab.charId === activeId"
      @click="onSelect(tab.charId)"
    >
      {{ tab.label }}
    </button>
    <span v-if="tabs.length === 0" class="et-empty">暂无主体数据</span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTablesStore } from '../stores/useTablesStore';
import { useUiStore } from '../stores/useUiStore';

const tables = useTablesStore();
const ui = useUiStore();

const tabs = computed(() => tables.subjectTabs);
const activeId = computed(() => ui.activeCharId);

function onSelect(charId: string) {
  ui.setActiveTab(charId);
  // 如果当前不在 subject 面板，点 Tab 默认跳回主体面板
  if (ui.activePanel !== 'subject') {
    ui.setActivePanel('subject');
  }
}
</script>
