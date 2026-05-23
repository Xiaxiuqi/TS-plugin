## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 制定下一项安全修改范围：不触碰原插件运行文件，仅规划测试版第一阶段迁移  `#p1`
- [x] 生成 .limcode 实施计划文档，明确功能与 CSS 零破坏约束  `#p2`
- [x] 同步 public/acu_visualizer_test 项目文档，记录本次计划与文档同步规则  `#p3`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer 测试版第一阶段安全迁移计划

## 1. 核心约束

用户明确要求：所有修改都不能让插件功能本身以及 CSS 出现任何问题。

因此本阶段采用“零侵入、文档先行、测试版隔离”的策略：

- 不修改 `public/acu_visualizer/acu_visualizer.js`。
- 不修改 `public/acu_visualizer/acu_visualizer-test.js`。
- 不改变任何现有 CSS 注入逻辑。
- 不改变任何现有 localStorage key。
- 不改变任何数据库 API 调用。
- 不改变用户脚本元信息。
- 所有新增内容仅放在 `public/acu_visualizer_test/` 与 `.limcode/` 文档中。

## 2. 本次“下一项修改”的范围

本次不直接迁移业务代码，而是建立第一阶段迁移的安全边界文档与同步规则，为后续真正拆分做准备。

### 允许修改

- `public/acu_visualizer_test/README.md`
- `public/acu_visualizer_test/docs/*.md`
- `public/acu_visualizer_test/src/**` 中的占位文件或新文档说明
- `.limcode/plans/*.md`
- `.limcode/progress.md`，如需要记录进度

### 禁止修改

- `public/acu_visualizer/acu_visualizer.js`
- `public/acu_visualizer/acu_visualizer-test.js`
- 任何会被当前正式插件加载的 CSS 或 JS
- 构建配置，除非后续单独确认

## 3. 第一阶段目标

### 3.1 建立安全迁移规则

新增或同步测试版文档，明确：

1. 原插件文件是基准，不可直接修改。
2. 测试版目录只做隔离迁移。
3. CSS 拆分前必须保持原注入顺序与选择器优先级。
4. 每次实际代码迁移都必须记录：
   - 修改文件
   - 迁移模块
   - 是否影响原插件
   - CSS 风险
   - 回滚方式

### 3.2 建立文档同步机制

每次修改后同步以下至少一处文档：

- `public/acu_visualizer_test/README.md`：记录当前阶段和入口。
- `public/acu_visualizer_test/docs/module-split-plan.md`：模块拆分变化。
- `public/acu_visualizer_test/docs/memory-optimization-plan.md`：内存优化变化。
- 后续可新增 `public/acu_visualizer_test/docs/change-log.md`：逐次变更记录。

### 3.3 建立后续迁移顺序

后续实际迁移建议按低风险顺序：

1. 文档与规则。
2. 常量模块。
3. 状态模块。
4. bridge 模块。
5. storage 工具函数。
6. notifications 模块。
7. theme 的纯配置部分。
8. 搜索 CSS 与搜索逻辑。
9. 快捷选项弹窗。
10. 表格渲染、编辑、拖拽等高风险模块。

## 4. 功能与 CSS 零破坏策略

### 4.1 原插件零触碰

在用户明确确认进入实际迁移前，不修改原插件文件。这样无论测试版目录如何变化，当前插件运行不受影响。

### 4.2 CSS 保护策略

后续拆分 CSS 时必须遵守：

- 先复制，不替换。
- 保留原选择器。
- 保留 `!important`。
- 保留注入顺序。
- 每个 CSS 文件记录来源函数，例如来自 `addStyles()` 或 `injectShortcutDialogStylesOnce()`。
- 拆分后先生成 bundle 与原 CSS 文本做差异对比，再考虑启用。

### 4.3 功能保护策略

后续每迁移一个模块，必须满足：

- 原函数行为不变。
- 输入输出兼容。
- localStorage key 不变。
- 数据库 API 调用不变。
- 事件绑定命名空间化，但不能改变触发条件。
- 新模块先在测试版入口中使用，不替换正式入口。

## 5. 验收标准

本阶段完成后应满足：

- 只新增或修改测试版文档与隔离目录。
- 原插件两个文件无改动。
- 文档中明确下一阶段迁移顺序与风险控制。
- 每次后续修改都有项目文档同步要求。

## 6. 当前计划完成后的下一步

建议下一步实际修改为：

- 新增 `public/acu_visualizer_test/docs/change-log.md`。
- 在 README 中加入“安全修改原则”和“每次修改必须同步文档”。
- 在模块拆分计划中加入“第一阶段安全迁移状态”。

这一步仍然不会影响插件功能和 CSS。
