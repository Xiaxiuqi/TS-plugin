# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-18T15:38:26.747Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：1/1 个里程碑已完成；最新：acu-visualizer-l1-regression-stabilized-20260518
- 当前焦点：ACU Visualizer v9.8 正式版发布完成，等待用户在酒馆环境回归确认
- 最新结论：已按稳定优先策略发布 v9.8：保持用户原地址 public/acu_visualizer/acu_visualizer.js 不变，内部 ACUVisualizerTest 等测试命名暂不重命名；完成旧正式版备份、v9.8 源码快照、版本标识更新、构建、正式产物映射、sourcemap 修正和静态校验。
- 下一步：请使用原正式版 import 地址在酒馆内回归确认：首次加载、数据库自动更新新行/高亮、手动更新、编辑保存、删除/恢复、排序、主题与快捷选项。后续再单独规划测试版内部命名正式化。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
- 计划：`.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [ ] 后续单独规划测试版内部命名清理：ACUVisualizerTest 等测试命名改为正式命名，先在测试版验证，不夹带正式发布  `#future-naming-1`
- [x] 确认正式版发布目标：保持用户原地址 public/acu_visualizer/acu_visualizer.js 不变，内部测试命名本次不重命名  `#release-9-8-1`
- [x] 备份旧正式版 public 文件，并在 src/数据库前端/acu_visualizer/v9.8-src 中复制当前测试版源文件  `#release-9-8-2`
- [x] 仅调整用户可见版本标识到 v9.8/9.8.0，不改 ACUVisualizerTest 等内部运行态命名  `#release-9-8-3`
- [x] 使用现有 build:entry 构建 src/acu_visualizer_test/index.js，确认 dist/acu_visualizer_test/index.js 产物正常  `#release-9-8-4`
- [x] 将 dist/acu_visualizer_test/index.js 发布为 public/acu_visualizer/acu_visualizer.js，并处理 sourcemap 对应关系  `#release-9-8-5`
- [x] 保留 public/acu_visualizer/acu_visualizer-test.js，不破坏旧测试入口  `#release-9-8-6`
- [x] 执行发布后静态校验与最小回归：原地址可加载、版本显示 v9.8、核心功能无异常  `#release-9-8-7`
<!-- LIMCODE_PROGRESS_TODOS_END -->

## 项目里程碑

<!-- LIMCODE_PROGRESS_MILESTONES_START -->
### acu-visualizer-l1-regression-stabilized-20260518 · ACU Visualizer L1 回归修复完成并确认可进入下一阶段规划
- 状态：completed
- 记录时间：2026-05-18T12:53:59.477Z
- 完成时间：2026-05-18T12:10:00+08:00
- 关联 TODO：bug-1-history, bug-2-edit-save-slow, bug-3-delete-highlight, bug-4-row-position-cache, bug-5-settings-css-lost, bug-6-confirm-css-lost, bug-7-shortcut-entry, mem-l1-1, mem-l1-2, mem-l1-3
- 关联文档：
  - 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
  - 计划：`.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md`
- 摘要:
用户确认此前 L1 泄漏治理后的回归问题已可接受：历史记录、刷新菜单、快捷选项、夜间配色、设置/确认弹窗 CSS、删除高亮、row mapping 缓存等问题已完成修复和构建同步。当前状态允许进入下一阶段内存优化规划，但按用户要求暂不修改业务代码。
- 下一步：创建下一阶段 L2 常驻内存下降优化计划；仅规划，不改业务代码。
<!-- LIMCODE_PROGRESS_MILESTONES_END -->

## 风险与阻塞

<!-- LIMCODE_PROGRESS_RISKS_START -->
<!-- 暂无风险 -->
<!-- LIMCODE_PROGRESS_RISKS_END -->

## 最近更新

<!-- LIMCODE_PROGRESS_LOG_START -->
- 2026-05-17T22:50:13.524Z | updated | settings-dialog-leading-char-fix | 移除 settings-dialog.js 第 1 行误入字符“的”，修复 about:srcdoc 自动加载 import failed。
- 2026-05-17T23:36:33.660Z | updated | history-refresh-regression-fix | 补接 showHistoryMenu 依赖并修正 showRefreshMenu 作用域/嵌套声明错误，完成构建同步。
- 2026-05-18T01:04:20.783Z | updated | history-highlight-refresh-menu-fixes | 修复历史记录记录当前值的问题、用户编辑高亮被数据库高亮覆盖的问题、刷新菜单 removeWithEvents 未导入的问题，并完成构建同步。
- 2026-05-18T02:11:49.500Z | updated | diagnosed-history-refresh-import-fix | 对照正式版并诊断模块化差异，补齐 main.js import，修复历史恢复记录当前值而非恢复值。
- 2026-05-18T11:30:31.600Z | updated | shortcut-visible-history-close-fix | 补充快捷选项弹窗 CSS，并恢复单元格菜单任意选项点击后关闭行为。
- 2026-05-18T11:57:27.702Z | updated | shortcut-api-night-style-fix | 按数据库 API 文档修正快捷选项配置读写接口，并补齐夜间配色修复。
- 2026-05-18T12:53:59.477Z | milestone_recorded | acu-visualizer-l1-regression-stabilized-20260518 | 记录里程碑：ACU Visualizer L1 回归修复完成并确认可进入下一阶段规划
- 2026-05-18T12:54:06.359Z | updated | enter-l2-planning-only | 用户确认当前修复可接受，要求记录进度并开始下一阶段优化计划；当前仅进入计划阶段，不修改业务代码。
- 2026-05-18T12:55:24.041Z | artifact_changed | plan | 同步计划文档：.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md
- 2026-05-18T13:01:43.522Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md
- 2026-05-18T13:04:59.698Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md
- 2026-05-18T13:05:17.091Z | updated | l2-1-runtime-state-cleanup-implemented | 完成 L2.1 运行态状态缓存清理 helper 与接入点，实现后构建同步 public/acu_visualizer_test/index.js。
- 2026-05-18T13:58:40.238Z | updated | l2-refresh-timeliness-fix | 修复数据库更新与手动更新后的表格抓取及时性：回调与手动更新均触发强制完整刷新，避免局部更新漏新增表/行。
- 2026-05-18T15:25:45.567Z | artifact_changed | plan | 同步计划文档：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T15:32:36.592Z | artifact_changed | plan | 同步计划文档：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T15:33:56.706Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T15:35:56.208Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T15:37:14.388Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T15:38:09.133Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T15:38:26.747Z | milestone_recorded | acu-visualizer-v9-8-release | ACU Visualizer v9.8 正式版发布完成：用户地址保持不变，内部测试命名暂保留以降低发布风险。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-18T15:38:26.747Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "ACU Visualizer v9.8 正式版发布完成，等待用户在酒馆环境回归确认",
  "latestConclusion": "已按稳定优先策略发布 v9.8：保持用户原地址 public/acu_visualizer/acu_visualizer.js 不变，内部 ACUVisualizerTest 等测试命名暂不重命名；完成旧正式版备份、v9.8 源码快照、版本标识更新、构建、正式产物映射、sourcemap 修正和静态校验。",
  "currentBlocker": null,
  "nextAction": "请使用原正式版 import 地址在酒馆内回归确认：首次加载、数据库自动更新新行/高亮、手动更新、编辑保存、删除/恢复、排序、主题与快捷选项。后续再单独规划测试版内部命名正式化。",
  "activeArtifacts": {
    "design": ".limcode/design/acu-visualizer-模块迁移优先设计.md",
    "plan": ".limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
  },
  "todos": [
    {
      "id": "future-naming-1",
      "content": "后续单独规划测试版内部命名清理：ACUVisualizerTest 等测试命名改为正式命名，先在测试版验证，不夹带正式发布",
      "status": "pending"
    },
    {
      "id": "release-9-8-1",
      "content": "确认正式版发布目标：保持用户原地址 public/acu_visualizer/acu_visualizer.js 不变，内部测试命名本次不重命名",
      "status": "completed"
    },
    {
      "id": "release-9-8-2",
      "content": "备份旧正式版 public 文件，并在 src/数据库前端/acu_visualizer/v9.8-src 中复制当前测试版源文件",
      "status": "completed"
    },
    {
      "id": "release-9-8-3",
      "content": "仅调整用户可见版本标识到 v9.8/9.8.0，不改 ACUVisualizerTest 等内部运行态命名",
      "status": "completed"
    },
    {
      "id": "release-9-8-4",
      "content": "使用现有 build:entry 构建 src/acu_visualizer_test/index.js，确认 dist/acu_visualizer_test/index.js 产物正常",
      "status": "completed"
    },
    {
      "id": "release-9-8-5",
      "content": "将 dist/acu_visualizer_test/index.js 发布为 public/acu_visualizer/acu_visualizer.js，并处理 sourcemap 对应关系",
      "status": "completed"
    },
    {
      "id": "release-9-8-6",
      "content": "保留 public/acu_visualizer/acu_visualizer-test.js，不破坏旧测试入口",
      "status": "completed"
    },
    {
      "id": "release-9-8-7",
      "content": "执行发布后静态校验与最小回归：原地址可加载、版本显示 v9.8、核心功能无异常",
      "status": "completed"
    }
  ],
  "milestones": [
    {
      "id": "acu-visualizer-l1-regression-stabilized-20260518",
      "title": "ACU Visualizer L1 回归修复完成并确认可进入下一阶段规划",
      "status": "completed",
      "summary": "用户确认此前 L1 泄漏治理后的回归问题已可接受：历史记录、刷新菜单、快捷选项、夜间配色、设置/确认弹窗 CSS、删除高亮、row mapping 缓存等问题已完成修复和构建同步。当前状态允许进入下一阶段内存优化规划，但按用户要求暂不修改业务代码。",
      "relatedTodoIds": [
        "bug-1-history",
        "bug-2-edit-save-slow",
        "bug-3-delete-highlight",
        "bug-4-row-position-cache",
        "bug-5-settings-css-lost",
        "bug-6-confirm-css-lost",
        "bug-7-shortcut-entry",
        "mem-l1-1",
        "mem-l1-2",
        "mem-l1-3"
      ],
      "relatedReviewMilestoneIds": [],
      "relatedArtifacts": {
        "design": ".limcode/design/acu-visualizer-模块迁移优先设计.md",
        "plan": ".limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
      },
      "completedAt": "2026-05-18T12:10:00+08:00",
      "recordedAt": "2026-05-18T12:53:59.477Z",
      "nextAction": "创建下一阶段 L2 常驻内存下降优化计划；仅规划，不改业务代码。"
    }
  ],
  "risks": [],
  "log": [
    {
      "at": "2026-05-17T22:50:13.524Z",
      "type": "updated",
      "refId": "settings-dialog-leading-char-fix",
      "message": "移除 settings-dialog.js 第 1 行误入字符“的”，修复 about:srcdoc 自动加载 import failed。"
    },
    {
      "at": "2026-05-17T23:36:33.660Z",
      "type": "updated",
      "refId": "history-refresh-regression-fix",
      "message": "补接 showHistoryMenu 依赖并修正 showRefreshMenu 作用域/嵌套声明错误，完成构建同步。"
    },
    {
      "at": "2026-05-18T01:04:20.783Z",
      "type": "updated",
      "refId": "history-highlight-refresh-menu-fixes",
      "message": "修复历史记录记录当前值的问题、用户编辑高亮被数据库高亮覆盖的问题、刷新菜单 removeWithEvents 未导入的问题，并完成构建同步。"
    },
    {
      "at": "2026-05-18T02:11:49.500Z",
      "type": "updated",
      "refId": "diagnosed-history-refresh-import-fix",
      "message": "对照正式版并诊断模块化差异，补齐 main.js import，修复历史恢复记录当前值而非恢复值。"
    },
    {
      "at": "2026-05-18T11:30:31.600Z",
      "type": "updated",
      "refId": "shortcut-visible-history-close-fix",
      "message": "补充快捷选项弹窗 CSS，并恢复单元格菜单任意选项点击后关闭行为。"
    },
    {
      "at": "2026-05-18T11:57:27.702Z",
      "type": "updated",
      "refId": "shortcut-api-night-style-fix",
      "message": "按数据库 API 文档修正快捷选项配置读写接口，并补齐夜间配色修复。"
    },
    {
      "at": "2026-05-18T12:53:59.477Z",
      "type": "milestone_recorded",
      "refId": "acu-visualizer-l1-regression-stabilized-20260518",
      "message": "记录里程碑：ACU Visualizer L1 回归修复完成并确认可进入下一阶段规划"
    },
    {
      "at": "2026-05-18T12:54:06.359Z",
      "type": "updated",
      "refId": "enter-l2-planning-only",
      "message": "用户确认当前修复可接受，要求记录进度并开始下一阶段优化计划；当前仅进入计划阶段，不修改业务代码。"
    },
    {
      "at": "2026-05-18T12:55:24.041Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md"
    },
    {
      "at": "2026-05-18T13:01:43.522Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md"
    },
    {
      "at": "2026-05-18T13:04:59.698Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md"
    },
    {
      "at": "2026-05-18T13:05:17.091Z",
      "type": "updated",
      "refId": "l2-1-runtime-state-cleanup-implemented",
      "message": "完成 L2.1 运行态状态缓存清理 helper 与接入点，实现后构建同步 public/acu_visualizer_test/index.js。"
    },
    {
      "at": "2026-05-18T13:58:40.238Z",
      "type": "updated",
      "refId": "l2-refresh-timeliness-fix",
      "message": "修复数据库更新与手动更新后的表格抓取及时性：回调与手动更新均触发强制完整刷新，避免局部更新漏新增表/行。"
    },
    {
      "at": "2026-05-18T15:25:45.567Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T15:32:36.592Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T15:33:56.706Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T15:35:56.208Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T15:37:14.388Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T15:38:09.133Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T15:38:26.747Z",
      "type": "milestone_recorded",
      "refId": "acu-visualizer-v9-8-release",
      "message": "ACU Visualizer v9.8 正式版发布完成：用户地址保持不变，内部测试命名暂保留以降低发布风险。"
    }
  ],
  "stats": {
    "milestonesTotal": 1,
    "milestonesCompleted": 1,
    "todosTotal": 8,
    "todosCompleted": 7,
    "todosInProgress": 0,
    "todosCancelled": 0,
    "activeRisks": 0
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-18T15:38:26.747Z",
    "bodyHash": "sha256:cfd004f079f41b121d772fca093d8bd279fe3c2f42631deaf87e2164ea95e815"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
