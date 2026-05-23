## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [ ] 建立内存优化基线：记录数据规模、localStorage 大小、首次加载/刷新/弹窗/搜索/拖拽场景的 DOM 与堆内存指标  `#mem-0-baseline`
- [ ] 新增内存优化安全开关与回滚约束，确保每个优化点可单独关闭并回退到当前完整渲染路径  `#mem-1-safety-flags`
- [ ] 实施 L1 泄漏治理：增强 destroy，统一清理测试版 DOM、通知队列、跨 document 监听、定时器、观察器和临时状态  `#mem-2-destroy-cleanup`
- [ ] 实施 L1 事件治理：优先将表格内点击/分页/搜索/单元格菜单改为容器级委托，减少重复绑定和重渲染后的事件泄漏  `#mem-3-event-delegation`
- [ ] 实施 L1 弹窗治理：统一设置/历史/编辑/快捷/菜单类 DOM 的关闭与事件清理，避免 detached nodes  `#mem-4-dialog-manager`
- [ ] 实施 L2 存储审计：统计 ACU localStorage 各 key 大小，先只记录不迁移，识别快照和历史的主要占用  `#mem-5-storage-audit`
- [ ] 实施 L2 状态清理：完整刷新/保存/取消删除后清理不存在表格的 diff、编辑、删除、分页、行映射等无效状态  `#mem-6-state-prune`
- [ ] 实施 L2 历史记录容量控制：在保持旧 key 兼容前提下增加总量上限、单项长度保护和清理路径  `#mem-7-history-cap`
- [ ] 设计并实现 L2 轻量快照兼容层：保留旧完整快照读取，新增表级/行级 hash 快照写入试验路径  `#mem-8-snapshot-light-plan`
- [ ] 实施 L3 渲染降峰第一步：只渲染激活 tab 的表格内容，非激活 tab 保留 section 壳和懒渲染入口，并保留完整渲染 fallback  `#mem-9-render-active-tab`
- [ ] 实施 L3 搜索降峰：增加搜索 debounce、限制当前页/当前表搜索范围，验证搜索高亮与清空行为一致  `#mem-10-search-throttle`
- [ ] 实施 L3 写入降峰：对滚动位置、分页、标签状态等 localStorage 写入做节流或相同值跳过  `#mem-11-storage-throttle`
- [ ] 执行优化后全量回归：加载、CSS、标签、分页、搜索、编辑、删除、拖拽、保存、弹窗、主题、重复初始化和连续刷新  `#mem-12-regression`
- [ ] 同步 README、memory 文档、change-log、progress，并记录各阶段指标对比和回滚方式  `#mem-13-docs-sync`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer 内存优化实施计划

## 1. 背景与进入条件

当前测试版已完成：

- 源码整体迁移到 `src/acu_visualizer_test/`。
- `public/acu_visualizer_test/` 清理为发布产物目录，仅保留 `index.js` / `index.js.map`。
- 通过 `pnpm build:entry --env entry=src/acu_visualizer_test/index.js` 支持单入口构建。
- 浏览器回归确认：iframe 自动加载、父页面 CSS 注入、加载通知、行拖拽、删除行、搜索等当前无已知问题。

因此内存优化可以从“冻结规划”进入实施规划阶段。

本计划基于以下文档：

- `src/acu_visualizer_test/docs/memory-optimization-plan.md`
- `src/acu_visualizer_test/docs/memory-optimization-roadmap.md`
- `src/acu_visualizer_test/docs/memory-baseline-checklist.md`
- `src/acu_visualizer_test/docs/module-migration-test-checklist.md`

## 2. 最高约束

整个内存优化阶段必须遵守：

1. 不修改正式插件运行文件：
   - `public/acu_visualizer/acu_visualizer.js`
   - `public/acu_visualizer/acu_visualizer-test.js`
2. 不改变现有 DOM class、选择器、按钮行为和 CSS 视觉结果。
3. 不改变 localStorage 旧 key 的读取兼容。
4. 不改变数据库 API 语义。
5. 每个优化点必须可回滚。
6. 优先在测试版源码中实施，构建后输出单文件产物。
7. 每阶段完成后必须执行对应回归测试。

## 3. 构建方式

只构建 ACU 测试版：

```bash
pnpm build:entry --env entry=src/acu_visualizer_test/index.js
```

同步发布产物：

```powershell
Copy-Item dist/acu_visualizer_test/index.js public/acu_visualizer_test/index.js
Copy-Item dist/acu_visualizer_test/index.js.map public/acu_visualizer_test/index.js.map
```

全量构建仍保留：

```bash
pnpm build
```

## 4. 分阶段实施方案

### 阶段 L0：基线与安全开关

目标：先建立可对照的内存与行为基线，不立即改变功能路径。

实施内容：

1. 按 `memory-baseline-checklist.md` 记录：
   - 表格数量。
   - 最大行列数。
   - localStorage ACU key 总大小。
   - 首次加载 JS heap / DOM 节点数。
   - 连续刷新 10 次后的 DOM 节点变化。
   - 弹窗打开关闭后的 detached nodes。
   - 搜索/清空 10 次后的 mark 残留。
2. 增加优化开关结构，例如：

```js
const MEMORY_OPT_FLAGS = {
  enhancedDestroy: true,
  delegatedEvents: false,
  dialogManager: false,
  statePrune: false,
  activeTabLazyRender: false,
  searchDebounce: false,
  storageThrottle: false,
};
```

3. 每个优化点必须能通过 flag 关闭。

验收：

- 有基线记录。
- 有开关与回滚说明。
- 不改变当前行为。

### 阶段 L1：泄漏治理

目标：优先处理重复初始化、事件监听、弹窗 DOM、菜单回调造成的长期泄漏。

#### L1.1 增强 destroy

实施内容：

- 清理 `.acu` 命名空间事件。
- 清理父页面和 iframe 可能存在的监听。
- 清理测试版 DOM：
  - 表格容器。
  - 通知。
  - 单元格菜单。
  - 编辑弹窗。
  - 设置弹窗。
  - 历史弹窗。
  - 快捷选项弹窗。
- 清理定时器和 MutationObserver。
- 清空临时状态：
  - drag 状态。
  - pendingDeletes。
  - currentUserEditMap。
  - currentDiffMap。

注意：保存相关状态不能误清 localStorage。

#### L1.2 事件委托第一步

优先改表格内部高频事件：

- `.acu-editable-cell` 点击。
- `.acu-page-btn` 点击。
- 搜索按钮点击。
- 搜索输入 Enter。
- 搜索清空。

从每次渲染后对大量节点绑定，改为：

```js
$container.off('click.acu', '.acu-editable-cell')
  .on('click.acu', '.acu-editable-cell', handler);
```

要求：

- 不改变触发条件。
- 不改变 `showCellMenu` 入参。
- 不改变分页保存逻辑。

#### L1.3 弹窗/菜单治理

实施内容：

- 统一关闭菜单/弹窗时 `.off('.acu')` 后 `remove()`。
- 关闭监听登记到 lifecycle registry。
- 避免 `window.acuCellMenuCloseHandler` 等全局残留长期引用 DOM。

验收：

- 重复加载测试版 5 次，不出现多个通知、多个 style、重复事件。
- 连续打开关闭弹窗 10 次后 DOM 无明显残留。
- 所有菜单、编辑、删除、恢复、搜索、分页行为仍正常。

### 阶段 L2：常驻内存下降

目标：降低长期持有的状态、localStorage 和缓存对象体积。

#### L2.1 localStorage 审计

先只做统计，不迁移数据：

```js
Object.keys(localStorage)
  .filter(key => key.startsWith('acu_'))
  .map(key => ({ key, bytes: new Blob([localStorage.getItem(key) || '']).size }));
```

记录重点：

- `acu_data_snapshot_v8_5`
- `acu_cell_history_v8_8`
- `acu_pagination_state_v2`
- 行映射相关 key

#### L2.2 状态过期清理

在完整刷新、保存成功、取消删除后清理：

- 不存在表格的 diffMap key。
- 不存在表格的 currentUserEditMap key。
- 不存在表格的 pendingDeletes key。
- 不存在表格的 rowPositionMapping。
- 不存在表格的分页状态。

要求：

- 不能误删当前表。
- 保存失败时不能清用户编辑状态。

#### L2.3 历史记录容量控制

在保持旧 key 兼容读取前提下：

- 增加总单元格数量上限。
- 增加总历史项上限。
- 单条历史过长时增加保护策略。
- 清理最旧项。

暂不直接改 IndexedDB。

#### L2.4 轻量快照兼容层

设计新格式：

```json
{
  "version": 1,
  "updatedAt": 0,
  "tables": {
    "表名": {
      "hash": "...",
      "rowHashes": []
    }
  }
}
```

实施策略：

- 先新增读取兼容。
- 旧完整快照仍可读。
- 新轻量快照先在测试版开关下写入。
- 不立即删除旧快照。

验收：

- localStorage 总量不增长。
- 保存、diff、高亮逻辑不回归。

### 阶段 L3：峰值内存下降

目标：降低刷新、搜索、渲染时的大字符串和 DOM 峰值。

#### L3.1 当前 tab 懒渲染

现状：可能为多个表格都生成内容。

目标：

- 只渲染激活 tab 的表格内容。
- 非激活 section 只保留壳：

```html
<section class="acu-table-section" data-table-name="...">
  <div class="section-title">...</div>
  <div class="acu-table-lazy-placeholder"></div>
</section>
```

点击 tab 时再渲染该表。

必须保留 fallback：

```js
if (!MEMORY_OPT_FLAGS.activeTabLazyRender) {
  return generateFullTableHTML(...);
}
```

#### L3.2 搜索降峰

实施内容：

- 搜索输入 debounce 200ms。
- 只搜索当前激活表。
- 优先只搜索当前页。
- 高亮数量上限，例如 200。

要求：

- 点击搜索按钮行为保持。
- Enter 搜索保持。
- 清空搜索恢复原表格。

#### L3.3 localStorage 写入节流

实施内容：

- 滚动位置保存 throttle 500ms。
- 分页状态相同值跳过写入。
- active tab 相同值跳过写入。

验收：

- 滚动恢复仍正常。
- 分页状态仍正常。
- localStorage 写入次数下降。

## 5. 暂不实施的 L4 项目

以下项目收益高但风险较高，本轮只保留设计，不进入实现：

- 虚拟滚动。
- Worker diff。
- IndexedDB 历史库。
- 大规模 CSS 按需拆包。

进入条件：

- L1-L3 稳定。
- 有明确性能瓶颈数据。
- 用户确认继续高风险优化。

## 6. 回归测试清单

每阶段必须检查：

1. 自动加载成功。
2. CSS 注入到父页面。
3. 加载成功通知只出现一次。
4. 表格正常显示。
5. 标签页切换正常。
6. 分页正常。
7. 搜索展开、执行、清空、高亮正常。
8. 单元格编辑、保存正常。
9. 历史查看和恢复正常。
10. 插入行正常。
11. 删除行、恢复删除、保存删除正常。
12. 行拖拽排序正常。
13. 表格标签排序正常。
14. 设置弹窗正常。
15. 快捷选项弹窗正常。
16. 手动刷新正常。
17. 主题切换和夜间模式正常。
18. 重复 import 不产生重复通知、重复 style、重复表格。
19. 连续刷新后 DOM 节点不持续上涨。
20. 弹窗关闭后无明显 detached nodes。

## 7. 交付物

- 优化后的 `src/acu_visualizer_test/**`。
- 构建产物：
  - `dist/acu_visualizer_test/index.js`
  - `public/acu_visualizer_test/index.js`
- 文档更新：
  - `src/acu_visualizer_test/README.md`
  - `src/acu_visualizer_test/docs/memory-optimization-plan.md`
  - `src/acu_visualizer_test/docs/memory-optimization-roadmap.md`
  - `src/acu_visualizer_test/docs/memory-baseline-checklist.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/progress.md`

## 8. 推荐执行顺序

1. L0 基线与开关。
2. L1 destroy / 事件 / 弹窗泄漏治理。
3. 小回归。
4. L2 状态与 localStorage 常驻内存治理。
5. 小回归。
6. L3 激活 tab 懒渲染、搜索与写入降峰。
7. 全量回归。
8. 决定是否进入 L4。
