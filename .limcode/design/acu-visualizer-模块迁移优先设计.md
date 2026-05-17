# ACU Visualizer 模块迁移优先设计

## 1. 设计结论

根据最新要求，当前策略调整为：

> 先进行设计占位，规划模块迁移；等待模块全部迁移完成，并且测试没有问题后，再进行内存优化。

这意味着此前规划的 L1-L4 内存优化不会立即实施。当前阶段只做：

1. 测试版模块结构占位。
2. 模块迁移边界设计。
3. 迁移顺序规划。
4. 测试门槛定义。
5. 优化冻结规则定义。

## 2. 不变的最高约束

- 不修改 `public/acu_visualizer/acu_visualizer.js`。
- 不修改 `public/acu_visualizer/acu_visualizer-test.js`。
- 不修改原插件 CSS。
- 不改变原插件功能行为。
- 不改变 localStorage key。
- 不改变数据库 API 调用。
- 不改变原 DOM class、选择器、事件触发条件。

## 3. 当前阶段范围

### 允许

- 新增或更新测试版文档。
- 新增设计占位文件。
- 补充模块职责说明。
- 补充迁移顺序。
- 补充测试门槛。
- 补充变更记录。

### 暂不允许

- 进行实际内存优化。
- 改造渲染路径。
- 改造事件绑定逻辑。
- 改造 localStorage 格式。
- 拆分并替换 CSS 注入。
- 启用虚拟滚动、Worker diff、IndexedDB 等优化路径。

## 4. 模块迁移原则

1. **先复制，后验证，再替换**：模块迁移初期只复制原逻辑到测试版模块，不改变行为。
2. **一模块一记录**：每迁移一个模块，必须记录来源函数、目标文件、风险、测试项和回滚方式。
3. **不夹带优化**：迁移期间不做性能优化和逻辑重构，只做结构迁移。
4. **CSS 原样保留**：CSS 只允许占位和复制，不允许调整选择器、变量、优先级和注入顺序。
5. **测试版隔离**：迁移后的模块只在测试版入口中验证，不影响正式插件。

## 5. 推荐模块迁移顺序

### 阶段 0：设计占位与登记

- README 同步。
- change-log 同步。
- 模块迁移矩阵建立。
- 测试清单建立。

### 阶段 1：纯常量与无副作用模块

1. `core/constants.js`
2. `core/state.js`
3. `core/bridge.js`

这些模块风险最低，主要是常量、状态容器和外部环境访问封装。

### 阶段 2：存储读取兼容模块

4. `core/storage.js`
5. `modules/table-data.js`
6. `modules/diff-highlighting.js`

只迁移读取、格式化、hash、状态判断逻辑，不改变存储格式。

### 阶段 3：低 UI 风险模块

7. `modules/notifications.js`
8. `modules/theme.js`
9. `modules/pagination.js`
10. `modules/tabs.js`

这些模块与 UI 相关，但边界相对清晰。迁移时必须保持原 class 和事件行为。

### 阶段 4：弹窗与菜单模块

11. `modules/settings-dialog.js`
12. `modules/shortcut-dialog.js`
13. `modules/cell-history.js`
14. `modules/cell-editor.js`

这些模块包含大量 HTML 和事件，迁移时必须逐个弹窗验证。

### 阶段 5：高风险交互模块

15. `modules/row-sort.js`
16. `modules/table-sort.js`
17. `modules/search.js`

拖拽和搜索容易影响 DOM 与事件，必须单独测试。

### 阶段 6：核心渲染与数据库同步

18. `modules/table-renderer.js`
19. `modules/database-sync.js`
20. `core/lifecycle.js`
21. `core/scheduler.js`
22. `src/main.js`

核心渲染和保存链路最后迁移，确保前面模块已稳定。

## 6. 测试门槛

模块全部迁移完成后，至少通过以下测试后，才允许进入内存优化：

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

## 7. 优化冻结规则

在模块迁移全部完成并测试通过前，以下优化冻结：

- 快照 hash 化。
- 历史记录分片。
- 当前 tab 懒渲染。
- 当前页局部 patch。
- 虚拟滚动。
- Worker diff。
- IndexedDB 历史库。
- CSS 构建期压缩。
- 事件委托重构。
- localStorage 写入节流。

允许保留这些内容在文档中，但不得进入实际运行逻辑。

## 8. 完成标准

本设计阶段完成后，应具备：

- 模块迁移优先策略文档。
- 模块迁移矩阵。
- 测试门槛。
- 优化冻结说明。
- 项目文档和 change-log 同步。
