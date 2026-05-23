<!-- LIMCODE_SOURCE_ARTIFACT_START -->
{"type":"design","path":".limcode/design/acu-visualizer-模块迁移优先设计.md","contentHash":"sha256:46b23695dee2034e97fede127dee8bf18b3892002b7c5ab919439f769a6cba3f"}
<!-- LIMCODE_SOURCE_ARTIFACT_END -->

## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 废弃 loader 作为推荐入口，将测试版源码整体迁移到 src/acu_visualizer_test 并保留构建期内联 CSS 入口  `#single-1`
- [x] 删除自定义 webpack 配置，改用现有 pnpm build 扫描 src/acu_visualizer_test/index.js 输出单文件  `#single-2`
- [x] 执行现有 pnpm build，生成 dist/acu_visualizer_test/index.js，并同步到 public/acu_visualizer_test/index.js；public 目录仅保留构建产物  `#single-3`
- [x] 同步文档：README、迁移记录、change-log、progress，明确推荐 import index.js  `#single-4`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer 模块迁移优先实施计划

## 1. 来源设计文档

本实施计划基于已确认的设计文档：

- `.limcode/design/acu-visualizer-模块迁移优先设计.md`

设计核心结论：

> 先进行设计占位，规划模块迁移；等待模块全部迁移完成，并且测试没有问题后，再进行内存优化。

因此，本计划不会立即实施内存优化，也不会修改原插件运行文件或原 CSS。

## 2. 最高约束

整个实施过程必须遵守以下约束：

- 不修改 `public/acu_visualizer/acu_visualizer.js`。
- 不修改 `public/acu_visualizer/acu_visualizer-test.js`。
- 不修改原插件 CSS。
- 不改变原插件功能行为。
- 不改变 localStorage key。
- 不改变数据库 API 调用。
- 不改变原 DOM class、选择器、事件触发条件。
- 不夹带任何内存优化实施。
- 只在测试版目录与项目文档中做设计占位、规划、登记和同步。

## 3. 本阶段目标

本阶段只完成模块迁移前置工作：

1. 明确“模块迁移优先，优化冻结”的项目策略。
2. 建立模块迁移矩阵。
3. 建立迁移登记模板。
4. 建立模块迁移测试清单。
5. 更新测试版 README、模块拆分计划、内存优化计划与变更记录。
6. 标记内存优化路线为“等待模块迁移完成后再启动”。

## 4. 允许修改范围

### 允许修改

- `public/acu_visualizer_test/README.md`
- `public/acu_visualizer_test/docs/*.md`
- `public/acu_visualizer_test/src/**/*.js` 的占位说明，不迁移实际运行逻辑
- `public/acu_visualizer_test/src/styles/*.css` 的占位说明，不复制或替换原 CSS
- `.limcode/design/*.md`
- `.limcode/plans/*.md`
- `.limcode/progress.md`

### 禁止修改

- `public/acu_visualizer/acu_visualizer.js`
- `public/acu_visualizer/acu_visualizer-test.js`
- 当前正式插件加载的任何 JS/CSS 逻辑
- 构建配置，除非后续单独确认

## 5. 计划实施步骤

### 步骤 1：同步策略说明

更新测试版 README，新增“当前实施策略”说明：

- 当前阶段是模块迁移前置设计。
- 先设计占位和模块迁移。
- 模块全部迁移并测试通过后再启动内存优化。
- 内存优化文档保留，但状态设为冻结。

### 步骤 2：新增模块迁移矩阵

新增文档：

- `public/acu_visualizer_test/docs/module-migration-matrix.md`

内容包括：

| 字段 | 说明 |
| --- | --- |
| 阶段 | 迁移阶段 0-6 |
| 模块 | 目标模块文件 |
| 来源函数/区域 | 原脚本中对应函数或功能区域 |
| 风险级别 | 低/中/高 |
| 是否涉及 CSS | 是/否 |
| 是否涉及数据库保存 | 是/否 |
| 是否允许优化 | 当前统一为否 |
| 验证项 | 模块迁移后必须验证的功能 |
| 状态 | 未开始/占位完成/迁移中/迁移完成/测试通过 |

矩阵应覆盖设计文档中的 22 个目标模块：

1. `core/constants.js`
2. `core/state.js`
3. `core/bridge.js`
4. `core/storage.js`
5. `modules/table-data.js`
6. `modules/diff-highlighting.js`
7. `modules/notifications.js`
8. `modules/theme.js`
9. `modules/pagination.js`
10. `modules/tabs.js`
11. `modules/settings-dialog.js`
12. `modules/shortcut-dialog.js`
13. `modules/cell-history.js`
14. `modules/cell-editor.js`
15. `modules/row-sort.js`
16. `modules/table-sort.js`
17. `modules/search.js`
18. `modules/table-renderer.js`
19. `modules/database-sync.js`
20. `core/lifecycle.js`
21. `core/scheduler.js`
22. `src/main.js`

### 步骤 3：新增迁移登记模板

新增文档：

- `public/acu_visualizer_test/docs/module-migration-record-template.md`

模板用于后续每迁移一个模块时填写：

- 模块名称。
- 来源函数/行段。
- 目标文件。
- 是否影响 CSS。
- 是否影响 DOM class。
- 是否影响事件。
- 是否影响 localStorage。
- 是否影响数据库 API。
- 是否夹带优化：必须为否。
- 测试项。
- 回滚方式。
- 迁移结论。

### 步骤 4：新增模块迁移测试清单

新增文档：

- `public/acu_visualizer_test/docs/module-migration-test-checklist.md`

包含两层测试：

#### 4.1 单模块测试

每个模块迁移后测试该模块相关功能。

#### 4.2 全量回归测试

所有模块迁移完成后，必须通过：

1. 表格正常加载。
2. 标签页切换正常。
3. 分页正常。
4. 搜索正常，搜索高亮正常。
5. 单元格编辑、保存正常。
6. 历史记录查看和恢复正常。
7. 插入行、删除行、恢复删除正常。
8. 行拖拽排序正常。
9. 表格标签排序正常。
10. 设置弹窗正常。
11. 快捷选项弹窗正常。
12. 手动刷新正常。
13. 主题切换正常。
14. 夜间模式正常。
15. 所有原 CSS 视觉无异常。
16. localStorage 原数据兼容。
17. 数据库 API 保存和读取正常。

### 步骤 5：更新模块拆分计划

更新：

- `public/acu_visualizer_test/docs/module-split-plan.md`

新增内容：

- 模块迁移优先策略。
- 优化冻结说明。
- 迁移矩阵入口。
- 测试清单入口。
- 后续每次迁移必须同步矩阵和变更记录。

### 步骤 6：更新内存优化计划

更新：

- `public/acu_visualizer_test/docs/memory-optimization-plan.md`

新增或调整说明：

- 当前内存优化进入冻结状态。
- 只保留路线图和基线清单，不进入实际实施。
- 内存优化启动条件是：所有模块迁移完成 + 全量测试通过 + CSS 视觉无异常。

### 步骤 7：更新变更记录

更新：

- `public/acu_visualizer_test/docs/change-log.md`

记录本次策略变更：

- 先设计占位和模块迁移。
- 模块迁移完成且测试通过后再优化。
- 是否触碰原运行文件：否。
- 是否触碰 CSS：否。
- 功能风险：无运行风险。
- 回滚方式：回退本次新增文档和 README/计划说明。

### 步骤 8：同步项目进度

更新：

- `.limcode/progress.md`

记录当前项目焦点：

- ACU Visualizer 当前进入“模块迁移前置设计与登记”阶段。
- 内存优化暂时冻结。

## 6. 验收标准

本计划执行完成后，需要满足：

- 已新增模块迁移矩阵。
- 已新增迁移登记模板。
- 已新增模块迁移测试清单。
- README 已说明当前策略。
- 模块拆分计划已同步迁移优先策略。
- 内存优化计划已标记为冻结状态。
- change-log 已记录本次策略调整。
- 原插件运行文件未被修改。
- 原 CSS 未被修改。

## 7. 后续阶段

本计划完成后，后续应按模块迁移矩阵逐个执行迁移。

迁移期间仍然禁止内存优化。只有当所有模块状态达到“测试通过”，并完成全量回归后，才允许创建新的内存优化实施计划。
