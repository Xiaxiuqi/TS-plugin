<!-- 顶部全局状态条 + 主题切换 -->
<template>
  <header class="et-shell-header">
    <IconSprite />
    <div class="et-status-chips">
      <span v-if="location" class="et-chip">
        <svg class="et-icon"><use href="#et-i-location" /></svg>
        {{ location }}
      </span>
      <span v-if="timeStr" class="et-chip">
        <svg class="et-icon"><use href="#et-i-clock" /></svg>
        {{ timeStr }}
      </span>
      <span v-if="stage" class="et-chip">
        <svg class="et-icon"><use href="#et-i-stage" /></svg>
        {{ stage }}
      </span>
      <span v-if="level" class="et-chip">
        <svg class="et-icon"><use href="#et-i-level" /></svg>
        Lv.{{ level }}
      </span>
      <span v-if="isCombat" class="et-chip et-chip-combat">
        <svg class="et-icon"><use href="#et-i-combat" /></svg>
        {{ tables.combatState }}
      </span>
    </div>
    <ThemeToggle />
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTablesStore } from '../stores/useTablesStore';
import ThemeToggle from './ThemeToggle.vue';
import IconSprite from './icons/IconSprite.vue';

const tables = useTablesStore();

const location = computed(() => tables.globalRow['当前地点'] ?? '');
const timeStr = computed(() => tables.globalRow['当前时间'] ?? '');
const stage = computed(() => tables.globalRow['当前阶段'] ?? '');
const level = computed(() => tables.globalRow['交错等级'] ?? '');
const isCombat = computed(() => tables.combatState !== '非战斗');
</script>
