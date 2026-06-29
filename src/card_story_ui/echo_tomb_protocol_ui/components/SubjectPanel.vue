<!-- 主体详情面板 -->
<template>
  <div v-if="!charId" class="et-empty">请选择一个主体</div>
  <div v-else-if="!profile" class="et-empty">未找到该主体的档案数据</div>
  <div v-else class="et-subject">
    <!-- 顶部：姓名 · 身份 · 阵营 -->
    <section class="et-card et-subject__head">
      <div class="et-subject__name">
        {{ profile['姓名'] || profile['游戏ID'] || charId }}
        <span class="et-subject__id">{{ profile['游戏ID'] || charId }}</span>
      </div>
      <div class="et-subject__tags">
        <span v-if="profile['种族']" class="et-chip">{{ profile['种族'] }}</span>
        <span v-if="profile['阵营']" class="et-chip">{{ profile['阵营'] }}</span>
        <span v-if="profile['表面职业']" class="et-chip">{{ profile['表面职业'] }}</span>
        <span v-if="profile['隐藏职业'] && profile['隐藏职业'] !== '未确认'" class="et-chip">
          {{ profile['隐藏职业'] }}
        </span>
      </div>
    </section>

    <!-- HP / MP / EXP 三条 -->
    <section class="et-card">
      <div class="et-card-title">状态</div>
      <div class="et-stat-row">
        <span class="et-stat-row__label">生命</span>
        <div class="et-stat-row__bar">
          <div class="et-stat-row__bar-fill et-bar-fill--hp" :style="{ width: hpRatio + '%' }" />
        </div>
        <span class="et-stat-row__num">{{ hp }}/{{ hpMax }}</span>
      </div>
      <div class="et-stat-row">
        <span class="et-stat-row__label">精神</span>
        <div class="et-stat-row__bar">
          <div class="et-stat-row__bar-fill et-bar-fill--mp" :style="{ width: mpRatio + '%' }" />
        </div>
        <span class="et-stat-row__num">{{ mp }}/{{ mpMax }}</span>
      </div>
      <div class="et-stat-row">
        <span class="et-stat-row__label">经验</span>
        <div class="et-stat-row__bar">
          <div class="et-stat-row__bar-fill et-bar-fill--exp" :style="{ width: expRatio + '%' }" />
        </div>
        <span class="et-stat-row__num">Lv.{{ level }} · {{ exp }}/{{ expMax }}</span>
      </div>
      <div v-if="paradox > 0" class="et-list-row" style="margin-top:6px">
        <span class="et-key">法则反噬</span><span class="et-val">{{ paradox }}</span>
      </div>
    </section>

    <!-- 属性雷达图 -->
    <section class="et-card">
      <div class="et-card-title">六维属性</div>
      <RadarChart :values="radarValues" :max="radarMax" />
      <div class="et-grid et-grid-3" style="margin-top:8px">
        <div
          v-for="(name, idx) in ATTR_NAMES"
          :key="name"
          class="et-slot"
          :class="{ 'et-slot-empty': radarValues[idx] === 0 }"
        >
          <span class="et-slot-key">{{ name }}</span>
          <span class="et-slot-val">
            {{ radarValues[idx] }}
            <span v-if="attrBonus[idx] > 0" style="color:var(--et-success)">
              (+{{ attrBonus[idx] }})
            </span>
          </span>
        </div>
      </div>
    </section>

    <!-- 装备槽位 -->
    <section class="et-card">
      <div class="et-card-title">
        <svg class="et-icon"><use href="#et-i-equip" /></svg>
        装备
      </div>
      <div v-if="equipmentRows.length === 0" class="et-empty" style="padding:8px">无装备槽位记录</div>
      <div v-else class="et-grid et-grid-3">
        <div
          v-for="slot in equipmentRows"
          :key="slot['装备槽位']"
          class="et-slot"
          :class="{ 'et-slot-empty': isEmptyEquip(slot) }"
          :title="slot['效果列表'] || ''"
        >
          <span class="et-slot-key">{{ slot['装备槽位'] }}</span>
          <span class="et-slot-val">{{ slot['装备名称'] || '无' }}</span>
        </div>
      </div>
    </section>

    <!-- 技能列表 -->
    <section class="et-card">
      <div class="et-card-title">
        <svg class="et-icon"><use href="#et-i-skill" /></svg>
        技能
      </div>
      <div v-if="skillRows.length === 0" class="et-empty" style="padding:8px">未记录技能</div>
      <div v-else class="et-list">
        <div v-for="sk in skillRows" :key="sk['技能ID']" class="et-list-row" :title="sk['描述']">
          <span class="et-key">
            {{ sk['技能名称'] }}
            <span style="color:var(--et-text-faint);margin-left:4px">{{ sk['技能来源'] }}</span>
          </span>
          <span class="et-val">
            <span v-if="sk['是否解锁'] === '否'" style="color:var(--et-text-faint)">未解锁</span>
            <span v-else>Lv.{{ sk['等级'] }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- 传承路径 -->
    <section v-if="lineageRows.length > 0" class="et-card">
      <div class="et-card-title">
        <svg class="et-icon"><use href="#et-i-lineage" /></svg>
        传承路径
      </div>
      <div class="et-list">
        <div v-for="path in lineageRows" :key="path['路径ID']" class="et-list-row">
          <span class="et-key">{{ path['路径名称'] }} · 阶段{{ path['阶段'] }}</span>
          <span class="et-val">{{ path['路径状态'] }}</span>
        </div>
      </div>
    </section>

    <!-- 身份 · 位置 · 关系 -->
    <section class="et-card">
      <div class="et-card-title">档案</div>
      <div class="et-list">
        <div v-if="profile['性别/年龄']" class="et-list-row">
          <span class="et-key">性别/年龄</span><span class="et-val">{{ profile['性别/年龄'] }}</span>
        </div>
        <div v-if="profile['身体特征']" class="et-list-row">
          <span class="et-key">身体特征</span><span class="et-val">{{ profile['身体特征'] }}</span>
        </div>
        <div v-if="profile['别称']" class="et-list-row">
          <span class="et-key">别称</span><span class="et-val">{{ profile['别称'] }}</span>
        </div>
        <div v-if="profile['当前位置']" class="et-list-row">
          <span class="et-key">当前位置</span><span class="et-val">{{ profile['当前位置'] }}</span>
        </div>
        <div v-if="profile['表面身份']" class="et-list-row">
          <span class="et-key">表面身份</span><span class="et-val">{{ profile['表面身份'] }}</span>
        </div>
        <div
          v-if="profile['真实身份'] && profile['真实身份'] !== '未确认'"
          class="et-list-row"
        >
          <span class="et-key">真实身份</span><span class="et-val">{{ profile['真实身份'] }}</span>
        </div>
        <div v-if="profile['角色间重要关系']" class="et-list-row">
          <span class="et-key">关系</span><span class="et-val">{{ profile['角色间重要关系'] }}</span>
        </div>
      </div>
    </section>

    <!-- 背包（当前主体拥有） -->
    <InventoryPanel :char-id="charId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTablesStore } from '../stores/useTablesStore';
import { useUiStore } from '../stores/useUiStore';
import { findRowByCharId, filterRowsByCharId } from '../core/tables';
import { ATTR_NAMES, computeRadarMax } from '../core/constants';
import RadarChart from './RadarChart.vue';
import InventoryPanel from './InventoryPanel.vue';

const tables = useTablesStore();
const ui = useUiStore();

const charId = computed(() => ui.activeCharId);

const profile = computed(() => {
  const t = tables.subjectTable;
  if (!t || !charId.value) return null;
  return findRowByCharId(t, charId.value);
});

/** 数值转换安全包装 */
function toInt(s: string | undefined, fallback = 0): number {
  if (s === undefined || s === '') return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

const hp = computed(() => toInt(profile.value?.['当前生命']));
const hpMax = computed(() => Math.max(1, toInt(profile.value?.['最大生命'], 1)));
const mp = computed(() => toInt(profile.value?.['当前精神']));
const mpMax = computed(() => Math.max(1, toInt(profile.value?.['最大精神'], 1)));
const level = computed(() => Math.max(1, toInt(profile.value?.['等级'], 1)));
const exp = computed(() => toInt(profile.value?.['当前经验']));
const expMax = computed(() => Math.max(1, toInt(profile.value?.['升级经验'], 1)));
const paradox = computed(() => toInt(profile.value?.['法则反噬']));

const hpRatio = computed(() => Math.min(100, Math.round((hp.value / hpMax.value) * 100)));
const mpRatio = computed(() => Math.min(100, Math.round((mp.value / mpMax.value) * 100)));
const expRatio = computed(() => Math.min(100, Math.round((exp.value / expMax.value) * 100)));

/** 属性表 */
const attributeRows = computed(() => {
  const t = tables.attributeTable;
  if (!t || !charId.value) return [];
  return filterRowsByCharId(t, charId.value);
});

/** 按 ATTR_NAMES 顺序对齐总值与装备加成 */
const radarValues = computed(() =>
  ATTR_NAMES.map(name => {
    const row = attributeRows.value.find(r => r['属性名称'] === name);
    return toInt(row?.['总值'], 0);
  }),
);
const attrBonus = computed(() =>
  ATTR_NAMES.map(name => {
    const row = attributeRows.value.find(r => r['属性名称'] === name);
    return toInt(row?.['装备加成'], 0);
  }),
);

/** 雷达图上限：调用 core/constants.ts::computeRadarMax 统一公式 */
const radarMax = computed(() => computeRadarMax(level.value, radarValues.value));

/** 装备表 */
const equipmentRows = computed(() => {
  const t = tables.equipmentTable;
  if (!t || !charId.value) return [];
  return filterRowsByCharId(t, charId.value);
});

function isEmptyEquip(row: Record<string, string>) {
  const name = row['装备名称'] ?? '';
  return name === '' || name === '无';
}

/** 技能表 */
const skillRows = computed(() => {
  const t = tables.skillTable;
  if (!t || !charId.value) return [];
  return filterRowsByCharId(t, charId.value);
});

/** 传承路径表 */
const lineageRows = computed(() => {
  const t = tables.lineageTable;
  if (!t || !charId.value) return [];
  return filterRowsByCharId(t, charId.value);
});
</script>

<style scoped>
.et-subject {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.et-subject__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.et-subject__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.et-subject__id {
  font-size: 11px;
  color: var(--et-text-faint);
  margin-left: 8px;
  font-weight: normal;
}
.et-subject__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
