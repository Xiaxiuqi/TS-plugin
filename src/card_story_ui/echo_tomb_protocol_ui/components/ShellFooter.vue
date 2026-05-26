<!-- 底部面板切换按钮 -->
<template>
  <footer class="et-shell-footer">
    <button class="et-btn" :class="{ 'et-btn--active': ui.activePanel === 'subject' }" @click="go('subject')">
      <svg class="et-icon"><use href="#et-i-info" /></svg>
      主体
    </button>
    <button class="et-btn" :class="{ 'et-btn--active': ui.activePanel === 'map' }" @click="go('map')">
      <svg class="et-icon"><use href="#et-i-map" /></svg>
      地图
    </button>
    <button class="et-btn" :class="{ 'et-btn--active': ui.activePanel === 'upgrade' }" @click="go('upgrade')">
      <svg class="et-icon"><use href="#et-i-upgrade" /></svg>
      升级
    </button>
    <button class="et-btn" :class="{ 'et-btn--active': ui.activePanel === 'team' }" @click="go('team')">
      <svg class="et-icon"><use href="#et-i-team" /></svg>
      组队
    </button>
  </footer>
</template>

<script setup lang="ts">
import { useUiStore, type ActivePanel } from '../stores/useUiStore';

const ui = useUiStore();

function go(p: ActivePanel) {
  ui.setActivePanel(p);
}
</script>
