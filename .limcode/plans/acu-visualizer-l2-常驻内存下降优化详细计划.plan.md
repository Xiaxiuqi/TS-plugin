<!-- LIMCODE_SOURCE_ARTIFACT_START -->
{"type":"design","path":".limcode/design/acu-visualizer-模块迁移优先设计.md","contentHash":"sha256:46b23695dee2034e97fede127dee8bf18b3892002b7c5ab919439f769a6cba3f"}
<!-- LIMCODE_SOURCE_ARTIFACT_END -->

## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 实施前复测并冻结 L1 稳定基线，记录 L2 前数据规模、localStorage、状态集合大小  `#l2-plan-1`
- [x] 设计并实现状态缓存清理 helper，仅清理不存在表格/行/列对应的运行态 key，不清理持久用户数据  `#l2-plan-2`
- [x] 设计并接入状态缓存清理点：数据刷新后、保存成功后、destroy 前，逐点启用并回归验证  `#l2-plan-3`
- [ ] 设计快照轻量化兼容层：旧完整快照只读兼容，新 hash 快照 feature flag 试运行  `#l2-plan-4`
- [ ] 设计单元格历史容量治理：单格上限、全局上限、过长值策略、旧格式兼容与用户确认清理  `#l2-plan-5`
- [ ] 制定 L2 分阶段验收、回滚和暂停条件，确认通过后再进入实施  `#l2-plan-6`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer L2 常驻内存下降优化详细计划

## 0. 计划状态

本文件只制定下一阶段优化计划，**不实施代码修改**。

当前前置状态：

- L0 基线与验收文档已完成。
- L1 泄漏治理已完成。
- L1 后续回归修复已由用户确认可接受。
- 下一阶段目标是 L2：降低长期常驻内存与 localStorage 压力。

L2 不进入 L3 懒渲染、局部 patch、虚拟滚动、Worker diff、IndexedDB 等高风险路径。

---

## 1. L2 总目标

L2 只处理长期保留的数据量问题，目标包括：

1. 清理运行态中过期状态：
   - `currentDiffMap`
   - `currentUserEditMap`
   - `pendingDeletes`
   - `rowPositionMapping`
   - `currentPagination`
   - tab 更新状态相关缓存
2. 降低快照长期占用：
   - 保留旧完整快照读取兼容。
   - 新增轻量 hash 快照试运行方案。
   - 先 feature flag，默认不开启破坏性路径。
3. 控制单元格历史增长：
   - 保持旧 key 与旧格式可读。
   - 不主动删除用户数据，除非用户明确触发清理或启用治理策略。
   - 先做可观测、可回滚的容量治理。

---

## 2. 最高约束

1. 不修改正式版：
   - `public/acu_visualizer/acu_visualizer.js`
   - `public/acu_visualizer/acu_visualizer-test.js`
2. 只在测试版源码和测试版产物中规划/实施。
3. 不改变数据库 API 语义。
4. 不改变 DOM class、CSS selector、视觉结构。
5. 不直接删除用户持久数据。
6. 不改变 localStorage 旧 key 的读取兼容。
7. 每一步必须可单独回滚。
8. 实施时每个小步骤均需构建并回归，不允许一次性大改。

---

## 3. L2 阶段拆分

推荐拆成三个小阶段：

### L2.1 状态缓存清理

目标：只清理运行态 Set/Map/Object 中已经不可能对应当前表格数据的 key。

优先级最高，因为它不触碰持久数据，风险最低。

### L2.2 快照轻量化兼容层

目标：减少完整快照常驻/持久占用，但必须保持旧快照只读兼容。

该阶段风险中等，必须 feature flag。

### L2.3 单元格历史容量治理

目标：限制历史记录无限增长带来的 localStorage 占用。

该阶段涉及用户历史数据，风险最高，必须先做统计和提示，再做可选治理。

---

# 4. L2.1 状态缓存清理计划

## 4.1 当前问题

随着表格变更、行删除、表删除、排序和分页切换，运行态状态中可能残留旧 key。

典型残留：

```js
state.currentDiffMap
state.currentUserEditMap
state.pendingDeletes
state.rowPositionMapping
state.currentPagination
```

这些数据虽然单次不大，但长时间使用、重复刷新、表名变化或模板切换后会持续增长。

## 4.2 清理范围

只清理运行态状态，不清理 localStorage 持久数据。

允许清理：

- 不存在表名对应的 diff/userEdit key。
- 不存在表名对应的 pending delete key。
- 不存在表名对应的 rowPositionMapping。
- 不存在表名对应的 pagination。
- 不存在 tab 对应的更新状态。

暂不清理：

- 单元格历史 localStorage。
- 数据快照 localStorage。
- 用户设置。
- 保护设置。
- 表格顺序设置，除非能证明表已不存在并且有回滚策略。

## 4.3 建议新增 helper

候选文件：

```text
src/acu_visualizer_test/modules/state-cleanup.js
```

候选导出：

```js
export function buildLiveTableIndex(tableData) {}
export function isLiveCellKey(key, liveIndex) {}
export function cleanupRuntimeState(tableData, state, options = {}) {}
export function getRuntimeStateStats(state) {}
```

### liveIndex 建议结构

```js
{
  tableNames: Set<string>,
  tableNameToRowCount: Map<string, number>,
  tableNameToColCount: Map<string, number>,
  sheetKeys: Set<string>,
}
```

### key 兼容

需识别现有 key 格式：

```text
${tableName}-${rowIndex}-${colIndex}
${tableName}-row-${rowIndex}
```

注意：表名本身可能包含 `-`，不能简单 `split('-')`。应使用现有正则或从尾部解析数字段。

推荐规则：

- cell key：从尾部匹配 `-(\d+)-(\d+)$`。
- row key：从尾部匹配 `-row-(\d+)$`。
- 前缀剩余部分作为 tableName。

## 4.4 接入点规划

按低风险到高风险逐步接入：

1. 只新增 helper 和统计函数，不改变运行逻辑。
2. 在开发调试入口手动调用统计，不自动清理。
3. 在 `smartUpdateTable()` 重新得到 rawData 后执行清理。
4. 在 `saveDataToDatabase()` 保存成功后的 UI 更新前执行清理。
5. 在 `destroy()` 前执行一次运行态清理。

每一步必须单独构建和回归。

## 4.5 回滚方式

- 删除/禁用 `cleanupRuntimeState()` 调用点即可。
- helper 文件保留不影响运行。
- 不涉及持久数据，无需数据迁移回滚。

## 4.6 验收标准

1. 表格正常加载。
2. 标签页、分页、搜索正常。
3. 编辑后绿色高亮不丢失。
4. 数据库更新蓝色高亮不误清。
5. 删除行 pending 状态正常。
6. 行排序后 mapping 正常。
7. 切换模板/刷新后不存在表格的状态 key 减少。
8. 不出现用户可见数据丢失。

---

# 5. L2.2 快照轻量化兼容层计划

## 5.1 当前问题

当前完整快照可能保存整份表格数据。表格越大，localStorage 占用越明显。

现有快照用途主要是：

- 与当前数据对比，生成 diffMap。
- 判断标签是否有更新。
- 记录变更历史时对比 oldCell。

因此不能直接删除旧快照，也不能直接只保存 hash，否则历史旧值可能丢失。

## 5.2 分阶段策略

### 阶段 A：只读兼容层

新增统一读取函数：

```js
loadSnapshotCompat()
```

支持：

1. 旧完整快照格式。
2. 未来 hash 快照格式。
3. 格式异常时安全返回 null。

此阶段不改变写入格式。

### 阶段 B：表级/行级 hash 生成器

新增：

```js
generateTableHashSnapshot(tableData)
```

候选格式：

```js
{
  version: 2,
  mode: 'hash-v1',
  createdAt: 1234567890,
  tables: {
    [sheetId]: {
      name: '表名',
      tableHash: '...',
      rowHashes: ['...', '...'],
      headersHash: '...',
      rowCount: 10,
      colCount: 5
    }
  }
}
```

### 阶段 C：feature flag 写入

新增测试版配置 flag：

```js
ACU_TEST_FEATURE_LIGHT_SNAPSHOT
```

默认关闭。

开启后才写入新格式。

### 阶段 D：diff 路径兼容

如果只有 hash 快照：

- 可判断表/行是否变化。
- 但不能拿到 oldCell 原值。

因此需要保留旧完整快照用于历史旧值，或者采用“双轨”：

```text
完整快照：低频/必要时保留
hash 快照：高频 diff 判断使用
```

推荐 L2.2 第一轮不要完全替换完整快照，只增加 hash 快照作为辅助指标。

## 5.3 不建议第一轮做的事

- 不删除旧完整快照。
- 不把 diffMap 完全切到 hash 快照。
- 不修改历史记录旧值来源。
- 不修改 localStorage key 语义。

## 5.4 回滚方式

- 关闭 feature flag。
- 继续读取旧完整快照。
- 新 hash 快照即使残留，也不参与逻辑。

## 5.5 验收标准

1. 旧 `acu_data_snapshot_v8_5` 可读。
2. 数据库更新高亮正常。
3. 历史记录仍能记录旧值。
4. localStorage 中新 hash 快照不会导致旧逻辑异常。
5. feature flag 关闭时行为与当前完全一致。

---

# 6. L2.3 单元格历史容量治理计划

## 6.1 当前问题

单元格历史保存在 localStorage 中。随着编辑和数据库更新次数增加，历史记录可能无限增长。

虽然单格已有上限，但仍可能存在：

- 表格数量多导致全局历史大。
- 单条历史内容过长。
- 旧 isolationKey 下历史长期残留。
- 已不存在表格/行/列的历史残留。

## 6.2 治理原则

1. 默认不删除用户历史。
2. 先统计，再提示，再治理。
3. 治理策略必须可配置。
4. 清理前应保留回滚可能，例如导出或备份。
5. 旧格式读取必须兼容。

## 6.3 建议新增能力

候选文件：

```text
src/acu_visualizer_test/modules/history-governance.js
```

候选函数：

```js
analyzeCellHistoryStorage()
compactCellHistory(options)
backupCellHistoryBeforeCompact()
restoreCellHistoryBackup()
```

## 6.4 统计指标

至少统计：

- 总 key 数。
- 总条目数。
- 当前 isolationKey 条目数。
- 非当前 isolationKey 条目数。
- 超长 value 条目数。
- 估算 localStorage 字节数。
- 不存在表格对应的历史条目数。

## 6.5 可选治理策略

### 策略 A：只限制新增

不动旧历史，只在新增历史时：

- 单格最多 10 条。
- 单条 value 超过阈值时提示或截断副本。

风险最低。

### 策略 B：当前 isolationKey 内压缩

只压缩当前 isolationKey：

- 单格保留最近 N 条。
- 超长 value 保留完整内容或摘要，取决于设置。

风险中等。

### 策略 C：用户确认后全局清理

通过设置面板清理入口，用户确认后：

- 清理不存在表格的历史。
- 清理非当前 isolationKey 的旧历史。
- 清理超出全局上限的最旧历史。

风险最高，必须有备份。

## 6.6 回滚方式

- compact 前备份到单独 localStorage key。
- 提供 restore 函数或文档命令。
- 若出错，恢复原 `acu_cell_history_v8_8`。

## 6.7 验收标准

1. 历史记录查看正常。
2. 历史恢复正常。
3. A -> B -> C -> 恢复 A 的历史链正常。
4. 旧历史格式可读。
5. 清理前后 localStorage 占用可量化。
6. 没有用户确认时，不主动删除历史。

---

# 7. 推荐实施顺序

## 第一轮：只做 L2.1 运行态状态清理

理由：

- 不碰持久数据。
- 回滚简单。
- 可直接降低长时间运行中的 Set/Map 常驻引用。

步骤：

1. 新增 `state-cleanup.js` helper。
2. 新增统计函数，不接入自动清理。
3. 控制台/调试输出确认 key 解析准确。
4. 接入 `smartUpdateTable()` 后清理不存在表格状态。
5. 接入保存成功后清理。
6. 回归全部 UI 行为。

## 第二轮：快照兼容层，只读不替换

1. 新增 `loadSnapshotCompat()`。
2. 保持旧写入不变。
3. 增加 hash 生成器，仅用于统计。
4. 不影响 diff 行为。

## 第三轮：历史容量治理，仅统计和手动清理方案

1. 新增历史统计。
2. 设置面板显示历史占用和条目数。
3. 仅提供用户确认后的手动清理。
4. 不做自动删除。

---

# 8. L2 暂停条件

出现以下任何问题，立即停止并回滚当前小步骤：

1. 表格无法加载。
2. 标签页或分页状态丢失。
3. 编辑后绿色高亮丢失或误变蓝色。
4. 数据库更新蓝色高亮缺失。
5. 删除行 pending 状态异常。
6. 行排序结果丢失。
7. 历史记录丢失或恢复错误。
8. localStorage 旧快照无法读取。
9. 夜间模式或 CSS 视觉异常。
10. iframe/about:srcdoc 自动加载失效。

---

# 9. L2 通过标准

完成 L2 后应满足：

1. 运行态过期 key 可被清理，且不会清理有效状态。
2. 快照轻量化已具备兼容层和 feature flag，不影响默认逻辑。
3. 历史容量治理具备统计与手动策略，不自动删除用户数据。
4. L2 所有改动可单独回滚。
5. L0/L1/L2 回归清单全部通过。

---

# 10. 当前结论

本计划建议下一步只实施 **L2.1 状态缓存清理**，暂不进入快照替换和历史自动清理。

在用户确认本计划前，不应修改业务代码。
