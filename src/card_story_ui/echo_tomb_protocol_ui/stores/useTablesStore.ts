/**
 * 表格数据 store
 * 职责：
 *  - 统一从 DatabaseAPI 读取需要的表格
 *  - 以 shallowRef 存储原始行数据，避免逐行深响应
 *  - 提供主体 Tab、全局数据、在场角色等衡量抽取
 *  - 订阅数据库填表结束下发刷新信号
 */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { getDatabase } from '../core/database';
import {
  parseTable,
  filterPresent,
  type ParsedTable,
} from '../core/tables';
import { registerCleanup } from '../core/memory';

export interface SubjectTab {
  charId: string;
  label: string;
  isPlayer: boolean;
}

export const useTablesStore = defineStore('echoTomb_tables', () => {
  const globalRow = shallowRef<Record<string, string>>({});
  const subjectTable = shallowRef<ParsedTable | null>(null);
  const characterTable = shallowRef<ParsedTable | null>(null);
  const attributeTable = shallowRef<ParsedTable | null>(null);
  const equipmentTable = shallowRef<ParsedTable | null>(null);
  const skillTable = shallowRef<ParsedTable | null>(null);
  const lineageTable = shallowRef<ParsedTable | null>(null);
  const inventoryTable = shallowRef<ParsedTable | null>(null);
  const factionTable = shallowRef<ParsedTable | null>(null);
  const stressTable = shallowRef<ParsedTable | null>(null);
  const questTable = shallowRef<ParsedTable | null>(null);
  const regionTable = shallowRef<ParsedTable | null>(null);

  const isLoading = ref(false);
  const lastError = ref<string | null>(null);
  /** 填表结束计数，watch 后可触发增量刷新 */
  const tableFillEndCounter = ref(0);
  /**
   * dirty 合并标志（见 stage-01 §8.3 P2-A）：
   * `refreshAll` 进行中时再次触发刷新只置 _dirty=true 立即返回；
   * 当前刷新的 finally 里若 _dirty=true 则清标志并自递归一次，
   * 保证 nailongwang 一次填多表场景下"最后一次 fillEnd"的快照不会被丢弃。
   */
  let _dirty = false;

  /** 主体 Tab：过滤离场，player_main 优先 */
  const subjectTabs = computed<SubjectTab[]>(() => {
    const t = subjectTable.value;
    if (!t) return [];
    const present = filterPresent(t);
    const tabs = present
      .map(row => ({
        charId: row['角色ID'] ?? '',
        label: row['姓名'] || row['游戏ID'] || row['角色ID'] || '未知',
        isPlayer: (row['角色ID'] ?? '') === 'player_main',
      }))
      .filter(t => t.charId !== '');

    // player_main 置顶
    tabs.sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer));
    return tabs;
  });

  /** 战斗状态枚举 */
  const combatState = computed<'非战斗' | '遭遇' | '战斗中' | '收尾'>(() => {
    const v = globalRow.value['战斗状态'];
    if (v === '遭遇' || v === '战斗中' || v === '收尾') return v;
    return '非战斗';
  });

  /**
   * 全量刷新表格。dirty 合并语义见上方 _dirty 注释。
   * 调用方不需要关心是否会被丢弃，最后一次请求最终一定会落地。
   */
  async function refreshAll(): Promise<void> {
    if (isLoading.value) {
      _dirty = true;
      return;
    }
    isLoading.value = true;
    lastError.value = null;

    try {
      const db = getDatabase();
      const [
        global,
        subject,
        character,
        attribute,
        equipment,
        skill,
        lineage,
        inventory,
        faction,
        stress,
        quest,
        region,
      ] = await Promise.all([
        db.exportTable('全局数据表'),
        db.exportTable('主体档案表'),
        db.exportTable('重要角色表'),
        db.exportTable('主体属性表'),
        db.exportTable('主体装备表'),
        db.exportTable('主体技能表'),
        db.exportTable('主体传承路径表'),
        db.exportTable('背包物品表'),
        db.exportTable('阵营声望表'),
        db.exportTable('NPC压力节点表'),
        db.exportTable('任务与事件表'),
        db.exportTable('区域熵值表'),
      ]);

      // 全局数据表只关心首行
      if (global) {
        const t = parseTable('全局数据表', global);
        globalRow.value = t?.rows[0] ?? {};
      }
      subjectTable.value = subject ? parseTable('主体档案表', subject) : null;
      characterTable.value = character ? parseTable('重要角色表', character) : null;
      attributeTable.value = attribute ? parseTable('主体属性表', attribute) : null;
      equipmentTable.value = equipment ? parseTable('主体装备表', equipment) : null;
      skillTable.value = skill ? parseTable('主体技能表', skill) : null;
      lineageTable.value = lineage ? parseTable('主体传承路径表', lineage) : null;
      inventoryTable.value = inventory ? parseTable('背包物品表', inventory) : null;
      factionTable.value = faction ? parseTable('阵营声望表', faction) : null;
      stressTable.value = stress ? parseTable('NPC压力节点表', stress) : null;
      questTable.value = quest ? parseTable('任务与事件表', quest) : null;
      regionTable.value = region ? parseTable('区域熵值表', region) : null;
    } catch (e: any) {
      lastError.value = e?.message ?? '表格加载失败';
      console.error('[EchoTomb] refreshAll failed:', e);
    } finally {
      isLoading.value = false;
      if (_dirty) {
        _dirty = false;
        // 期间累计的 fillEnd 事件至少需要再跑一次，确保最终快照与数据库一致
        void refreshAll();
      }
    }
  }

  /**
   * 订阅数据库填表结束事件。骨架挂载后调用一次。
   *
   * AutoCardUpdaterAPI 不暴露反向 unsubscribe（见主文档 §8 第 9 条），
   * 所以这里通过 alive 标记做软解绑：cleanup 时把 _alive 置 false，
   * 闭包仍会被宿主调用，但内部立即 return，等价于解除订阅。
   */
  let _subscribed = false;
  let _alive = true;
  function subscribeFillEnd(): void {
    if (_subscribed) return;
    _subscribed = true;
    try {
      const db = getDatabase();
      db.onTableFillEnd(() => {
        if (!_alive) return;
        tableFillEndCounter.value++;
      });
    } catch (e) {
      console.error('[EchoTomb] subscribeFillEnd failed:', e);
    }
  }

  // 卸载时释放引用
  registerCleanup(() => {
    // 先关掉 fillEnd 闭包，避免后续宿主回调误触已 disposed 的 ref
    _alive = false;
    globalRow.value = {};
    subjectTable.value = null;
    characterTable.value = null;
    attributeTable.value = null;
    equipmentTable.value = null;
    skillTable.value = null;
    lineageTable.value = null;
    inventoryTable.value = null;
    factionTable.value = null;
    stressTable.value = null;
    questTable.value = null;
    regionTable.value = null;
  });

  return {
    // raw
    globalRow,
    subjectTable,
    characterTable,
    attributeTable,
    equipmentTable,
    skillTable,
    lineageTable,
    inventoryTable,
    factionTable,
    stressTable,
    questTable,
    regionTable,
    // derived
    subjectTabs,
    combatState,
    // status
    isLoading,
    lastError,
    tableFillEndCounter,
    // actions
    refreshAll,
    subscribeFillEnd,
  };
});
