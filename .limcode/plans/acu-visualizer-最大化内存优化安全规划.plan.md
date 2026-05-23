## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 制定最大化内存优化规划边界：仅文档与测试版规划，不触碰原功能和 CSS  `#m1`
- [x] 创建 .limcode 最大化内存优化专项计划  `#m2`
- [x] 同步 public/acu_visualizer_test 项目文档，补充最大化内存优化路线与风险控制  `#m3`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer 最大化内存优化安全规划

## 1. 最高优先级约束

用户要求：在不影响原功能和 CSS 的情况下，需要进行最大程度的内存占用优化。

因此本专项规划采用以下约束：

- 本阶段只规划和同步文档，不修改原运行脚本。
- 不修改 `public/acu_visualizer/acu_visualizer.js`。
- 不修改 `public/acu_visualizer/acu_visualizer-test.js`。
- 不替换任何现有 CSS 注入逻辑。
- 不改变 DOM 结构、class 名、选择器、事件触发条件。
- 不改变 localStorage key、数据库 API 调用与用户脚本元信息。
- 所有优化必须先在 `public/acu_visualizer_test/` 测试版隔离目录中规划、实现、验证。

## 2. 最大化内存优化总体策略

最大化优化不是一次性重写，而是分层推进：

1. 先消除内存泄漏风险。
2. 再降低常驻内存。
3. 再降低刷新和交互时的峰值内存。
4. 最后引入高收益但高风险的虚拟化或分片机制。

为了不破坏功能和 CSS，每一层都要求“可开关、可回滚、可对照原行为”。

## 3. 优化等级划分

### L0：零风险文档与检测层

只新增检测、记录和文档，不改变运行逻辑。

目标：

- 建立内存优化路线图。
- 记录每个优化点的影响范围。
- 设计内存测量方法。
- 定义回滚条件。

风险：无运行风险。

### L1：低风险泄漏治理层

在测试版中加入不会改变 UI 的清理机制：

- 事件命名空间。
- 弹窗关闭时释放 DOM 和事件。
- 重复初始化前 destroy。
- 通知队列清理。
- 菜单关闭监听统一管理。

要求：

- 不改变 CSS。
- 不改变功能入口。
- 不改变 DOM class。
- 只减少无效引用。

### L2：常驻内存下降层

降低长期保存在闭包、状态、缓存、localStorage 中的数据：

- CSS 字符串按需注入和模块拆分。
- 状态 key 压缩。
- diffMap/userEditMap/pendingDeletes 刷新后清理无效项。
- 快照从完整数据改为 hash 元数据。
- 历史记录改为分片与容量上限。

要求：

- 旧 localStorage 数据必须兼容读取。
- CSS 拆分必须保持原文本输出一致。
- 状态清理不能清除仍可见的高亮、待删除、用户编辑标记。

### L3：峰值内存下降层

减少表格刷新、搜索、弹窗打开时的瞬时大对象：

- 表格只渲染当前 tab 与当前页。
- 非激活 tab 延迟渲染。
- 搜索只处理当前页，限制高亮数量。
- 大 HTML 字符串改为 DocumentFragment 或局部 patch。
- localStorage 写入节流和相同内容跳过。

要求：

- 视觉结果与原 CSS 结果一致。
- 分页、标签、编辑、拖拽行为一致。
- 可通过 feature flag 禁用新渲染路径。

### L4：最大收益重构层

高收益但高风险，需要最后进行：

- 表格虚拟滚动。
- 历史记录 IndexedDB 化或更细分片。
- 大表格 diff worker 化。
- CSS 构建期压缩与运行时动态加载。

要求：

- 必须有原路径 fallback。
- 必须有独立测试版 bundle。
- 必须有视觉回归或 CSS 文本对照。

## 4. 推荐实施顺序

### 阶段 A：测量与基线

1. 建立内存测量清单。
2. 记录当前脚本规模、localStorage 占用、DOM 节点数量、刷新耗时。
3. 设计测试场景：
   - 首次加载。
   - 连续刷新 10 次。
   - 打开关闭设置弹窗 10 次。
   - 搜索并清除 10 次。
   - 编辑单元格并保存。
   - 行拖拽排序。
4. 文档记录基线。

### 阶段 B：泄漏治理

1. 设计统一 `destroy()`。
2. 设计事件登记表。
3. 设计弹窗管理器。
4. 设计通知清理机制。
5. 在测试版验证重复初始化不增加监听器和 detached DOM。

### 阶段 C：存储与历史瘦身

1. 设计快照 hash 化格式。
2. 设计旧快照兼容读取。
3. 设计历史记录分片 key。
4. 设计历史总量和单元格数量上限。
5. 设计清理策略与用户确认流程。

### 阶段 D：渲染瘦身

1. 保留原 CSS 和 class。
2. 仅改变测试版内部渲染路径。
3. 只渲染当前激活 tab 与当前页。
4. 非激活 tab 使用占位容器。
5. 局部更新 tbody 或 diff cell。

### 阶段 E：高阶优化

1. 虚拟滚动可行性评估。
2. Worker diff 可行性评估。
3. IndexedDB 存储历史可行性评估。

## 5. 不破坏 CSS 的技术要求

1. 样式拆分前，先从原脚本提取 CSS 源片段。
2. 提取后生成 CSS 文本 hash。
3. 测试版注入的 CSS 文本必须与原输出一致或明确记录差异。
4. 不删除原选择器。
5. 不改变 `!important`。
6. 不改变主题变量名。
7. 不改变夜间模式 class。
8. 不改变弹窗、表格、菜单、搜索的 class 名。
9. 每次 CSS 相关修改都必须写入 `change-log.md`。

## 6. 不破坏功能的技术要求

1. 保留所有外部可见函数行为。
2. 保留所有 localStorage key 兼容读取。
3. 保留 `AutoCardUpdaterAPI` 调用方式。
4. 保留 jQuery 依赖兼容。
5. 保留原有 UI 操作路径。
6. 保留保存、刷新、快捷选项、设置、搜索、历史、拖拽排序的原行为。
7. 优化路径必须支持 feature flag 关闭。

## 7. 文档同步要求

本次规划完成后同步：

- `public/acu_visualizer_test/docs/memory-optimization-plan.md`
- `public/acu_visualizer_test/docs/module-split-plan.md`
- `public/acu_visualizer_test/docs/change-log.md`
- `public/acu_visualizer_test/README.md` 如需要
- `.limcode/progress.md`

## 8. 当前阶段交付物

本阶段只交付计划和文档同步：

- 最大化内存优化路线。
- 优化等级 L0-L4。
- 不破坏 CSS 与功能的技术要求。
- 后续实施顺序。
- 文档同步记录。

## 9. 下一步建议

下一步建议仍然不动原插件，先在测试版文档中补充：

- `docs/memory-baseline-checklist.md`：内存基线测量清单。
- `docs/memory-optimization-roadmap.md`：L0-L4 优化路线图。
- `docs/css-safety-checklist.md`：CSS 零破坏检查清单。

这些文档完成后，再考虑在测试版 `src/core/lifecycle.js` 中设计 destroy 占位实现。
