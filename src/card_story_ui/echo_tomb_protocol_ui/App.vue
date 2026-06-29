<!-- 回响坟冢协议 · 状态栏根组件 -->
<template>
  <div class="et-shell" :class="`et-theme-${themeMode}`">
    <ShellHeader />
    <TabBar />
    <div class="et-content">
      <component :is="activePanel" />
    </div>
    <ShellFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, watch } from 'vue';
import { useSettingsStore } from './stores/useSettingsStore';
import { useTablesStore } from './stores/useTablesStore';
import { useUiStore } from './stores/useUiStore';
import ShellHeader from './components/ShellHeader.vue';
import TabBar from './components/TabBar.vue';
import ShellFooter from './components/ShellFooter.vue';

// 面板懒加载：减少首屏体积与内存
const SubjectPanel = defineAsyncComponent(() => import('./components/SubjectPanel.vue'));
const MapPanel = defineAsyncComponent(() => import('./components/MapPanel.vue'));
const UpgradePanel = defineAsyncComponent(() => import('./components/UpgradePanel.vue'));
const TeamPanel = defineAsyncComponent(() => import('./components/TeamPanel.vue'));

const settings = useSettingsStore();
const tables = useTablesStore();
const ui = useUiStore();

// 主题实际生效：auto 根据小时判定日/夜
const themeMode = computed<'day' | 'night'>(() => {
  if (settings.theme === 'auto') {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  }
  return settings.theme;
});

// 根据当前面板动态选择组件
const activePanel = computed(() => {
  switch (ui.activePanel) {
    case 'map':
      return MapPanel;
    case 'upgrade':
      return UpgradePanel;
    case 'team':
      return TeamPanel;
    case 'subject':
    default:
      return SubjectPanel;
  }
});

// 启动时加载表格
onMounted(async () => {
  // 订阅数据库填表结束事件，触发增量刷新
  tables.subscribeFillEnd();

  await tables.refreshAll();
  // 默认选中第一个在场主体 Tab（优先 player_main）
  if (!ui.activeCharId && tables.subjectTabs.length > 0) {
    ui.setActiveTab(tables.subjectTabs[0].charId);
  }
});

// 表格填充结束后增量刷新（显式依赖 tableFillEndCounter，避免 watchEffect 把无关响应源也收集进来）
// dirty 合并见 useTablesStore.refreshAll，刷新中再次触发会自动累积成尾部一次
watch(
  () => tables.tableFillEndCounter,
  count => {
    if (count > 0) tables.refreshAll();
  },
);
</script>
