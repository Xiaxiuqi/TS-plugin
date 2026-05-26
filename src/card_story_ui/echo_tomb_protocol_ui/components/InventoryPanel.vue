<!-- 背包面板：按拥有人=角色ID过滤 -->
<template>
  <section v-if="items.length > 0" class="et-card">
    <div class="et-card-title">
      <svg class="et-icon"><use href="#et-i-bag" /></svg>
      背包·归属 {{ charId }}
    </div>
    <div class="et-grid et-grid-2">
      <div
        v-for="item in items"
        :key="item['物品ID']"
        class="et-slot"
        :title="`${item['物品类型']} · ${item['所在位置']}${item['备注'] ? '\n' + item['备注'] : ''}`"
      >
        <span class="et-slot-key">{{ item['物品类型'] }}</span>
        <span class="et-slot-val">
          {{ item['物品名称'] }}
          <span style="color:var(--et-text-faint);margin-left:4px">x{{ item['数量'] }}</span>
        </span>
      </div>
    </div>
  </section>
  <section v-else class="et-card">
    <div class="et-card-title">
      <svg class="et-icon"><use href="#et-i-bag" /></svg>
      背包
    </div>
    <div class="et-empty" style="padding:8px">该主体未拥有背包物品</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTablesStore } from '../stores/useTablesStore';
import { filterInventoryByOwners } from '../core/tables';

const props = defineProps<{ charId: string }>();
const tables = useTablesStore();

const items = computed(() => {
  const t = tables.inventoryTable;
  if (!t || !props.charId) return [];
  return filterInventoryByOwners(t, new Set([props.charId]));
});
</script>
