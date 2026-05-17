# ACU Visualizer 测试版模块化重构项目

本目录用于规划 `public/acu_visualizer/acu_visualizer-test.js` 的测试版模块化拆分与内存占用优化。

> 当前原始脚本：`public/acu_visualizer/acu_visualizer-test.js`
> 当前规模：约 7,467 行，约 295 KB，单文件 IIFE 用户脚本。

## 目标

1. 将单文件插件拆分为可维护的功能模块。
2. 降低运行期 DOM、字符串、localStorage、历史快照与事件监听带来的内存占用。
3. 保持现有用户脚本使用方式兼容：测试版最终仍可打包为单个 JS 文件。
4. 建立清晰的模块边界，方便后续逐步迁移、测试与回滚。

## 当前实施策略

当前阶段采用 **模块迁移优先，内存优化冻结** 策略：

1. 先完成测试版设计占位与模块迁移规划。
2. 按模块迁移矩阵逐个迁移模块。
3. 模块迁移期间不夹带内存优化、渲染优化、事件重构或 CSS 调整。
4. 等所有模块迁移完成，并通过全量功能与 CSS 回归测试后，再创建新的内存优化实施计划。

- [模块迁移矩阵](docs/module-migration-matrix.md)
- [模块迁移登记模板](docs/module-migration-record-template.md)
- [模块迁移测试清单](docs/module-migration-test-checklist.md)

## 文档

- [模块拆分计划](docs/module-split-plan.md)
- [内存占用优化计划](docs/memory-optimization-plan.md)
- [测试版变更记录](docs/change-log.md)
- [最大化内存优化路线图](docs/memory-optimization-roadmap.md)
- [内存基线测量清单](docs/memory-baseline-checklist.md)
- [CSS 零破坏检查清单](docs/css-safety-checklist.md)

## 安全修改原则

为确保插件功能本身以及 CSS 不出现任何问题，测试版迁移遵守以下原则：

1. **原插件零触碰**：默认不修改 `public/acu_visualizer/acu_visualizer.js` 与 `public/acu_visualizer/acu_visualizer-test.js`。
2. **测试版隔离**：所有规划、占位模块、迁移验证优先放在 `public/acu_visualizer_test/`。
3. **CSS 零破坏**：CSS 拆分前只允许复制与文档化，不直接替换原注入逻辑；必须保留选择器、`!important`、注入顺序与主题变量。
4. **功能零破坏**：不改变 localStorage key、不改变数据库 API 调用、不改变用户脚本元信息、不改变原事件触发条件。
5. **先文档后实现**：每次实际迁移前必须明确风险、回滚方式与验证点。

## 文档同步规则

每次对测试版目录进行修改后，必须同步至少一个项目文档：

- README：记录当前阶段、入口、安全原则。
- 模块拆分计划：记录模块边界、迁移顺序、状态变化。
- 内存优化计划：记录性能与内存相关策略变化。
- 变更记录：记录每次修改范围、风险、回滚方式。

本规则用于保证后续每一步迁移都有可追踪记录，避免影响现有插件功能和 CSS。

## 建议目录结构

```text
public/acu_visualizer_test/
  README.md
  main.js
  docs/
    module-split-plan.md
    memory-optimization-plan.md
  core/
    constants.js
    state.js
    bridge.js
    storage.js
    lifecycle.js
    scheduler.js
  modules/
    table-data.js
    table-renderer.js
    tabs.js
    pagination.js
    cell-editor.js
    cell-history.js
    row-sort.js
    table-sort.js
    search.js
    settings-dialog.js
    shortcut-dialog.js
    theme.js
    notifications.js
    diff-highlighting.js
    database-sync.js
  styles/
    theme.css
    table.css
    dialogs.css
    shortcut-dialog.css
    search.css
    animations.css
```

## 迁移策略

采用“并行测试版目录 + 渐进迁移”的方式：

1. 保留原 `public/acu_visualizer/acu_visualizer-test.js` 不动。
2. 在本目录中先建立模块化源码。
3. 每次迁移一个功能域，并用测试版入口验证。
4. 通过构建脚本将模块源码合并为测试版单文件，例如未来输出：
   - `public/acu_visualizer_test/acu_visualizer-test.bundle.js`
5. 测试稳定后再考虑同步到正式版。
