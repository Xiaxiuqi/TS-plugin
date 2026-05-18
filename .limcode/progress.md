# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-18T13:58:40.238Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：1/1 个里程碑已完成；最新：acu-visualizer-l1-regression-stabilized-20260518
- 当前焦点：ACU Visualizer 数据抓取及时性修复完成，等待回归复测
- 最新结论：针对进入聊天偶发无数据、数据库/手动更新后表格不及时显示新内容和高亮的问题，诊断为数据库更新回调走非强制 smartUpdateTable，已有容器时局部更新只替换既有 section，无法补新增表/新增 tab。已改为数据库更新回调强制刷新，forceFullUpdate 时完整重建表格；手动更新完成后主动 smartUpdateTable(true)。同…
- 下一步：请重新 import 后复测：进入聊天首次显示、数据库自动更新后新行/高亮、快捷选项手动更新后表格是否自动刷新且无需点击刷新表格。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
- 计划：`.limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 实施前复测并冻结 L1 稳定基线，记录 L2 前数据规模、localStorage、状态集合大小  `#l2-plan-1`
- [x] 设计并实现状态缓存清理 helper，仅清理不存在表格/行/列对应的运行态 key，不清理持久用户数据  `#l2-plan-2`
- [x] 设计并接入状态缓存清理点：数据刷新后、保存成功后、destroy 前，逐点启用并回归验证  `#l2-plan-3`
- [ ] 设计快照轻量化兼容层：旧完整快照只读兼容，新 hash 快照 feature flag 试运行  `#l2-plan-4`
- [ ] 设计单元格历史容量治理：单格上限、全局上限、过长值策略、旧格式兼容与用户确认清理  `#l2-plan-5`
- [ ] 制定 L2 分阶段验收、回滚和暂停条件，确认通过后再进入实施  `#l2-plan-6` (in_progress)
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
- 2026-05-17T20:52:41.245Z | updated | acu-moonbox-structure-restored | 恢复月相盒原版星尘与粒子 DOM 结构，重新构建并同步 public/acu_visualizer_test/index.js；随后暂停实现，进入下一步优化详细计划。
- 2026-05-17T20:54:15.724Z | artifact_changed | plan | 同步计划文档：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T21:00:51.292Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T21:10:09.845Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T21:18:34.333Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T21:18:43.381Z | milestone_recorded | memory-l1-leak-cleanup-completed | 完成内存优化 L1 泄漏治理：事件生命周期登记、跨 document 菜单监听清理、弹窗/菜单/通知临时 UI 清理，并完成构建同步。
- 2026-05-17T22:04:51.362Z | updated | l1-regression-fixes | 修复 L1 优化后的 7 项回归问题并完成构建同步：历史、编辑保存、删除高亮、row mapping 缓存、设置 CSS、确认弹窗 CSS、快捷选项入口。
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
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-18T13:58:40.238Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "ACU Visualizer 数据抓取及时性修复完成，等待回归复测",
  "latestConclusion": "针对进入聊天偶发无数据、数据库/手动更新后表格不及时显示新内容和高亮的问题，诊断为数据库更新回调走非强制 smartUpdateTable，已有容器时局部更新只替换既有 section，无法补新增表/新增 tab。已改为数据库更新回调强制刷新，forceFullUpdate 时完整重建表格；手动更新完成后主动 smartUpdateTable(true)。同时修正 rawData 仅 mate 时的无数据判断。已构建并同步 public。",
  "currentBlocker": null,
  "nextAction": "请重新 import 后复测：进入聊天首次显示、数据库自动更新后新行/高亮、快捷选项手动更新后表格是否自动刷新且无需点击刷新表格。",
  "activeArtifacts": {
    "design": ".limcode/design/acu-visualizer-模块迁移优先设计.md",
    "plan": ".limcode/plans/acu-visualizer-l2-常驻内存下降优化详细计划.plan.md"
  },
  "todos": [
    {
      "id": "l2-plan-1",
      "content": "实施前复测并冻结 L1 稳定基线，记录 L2 前数据规模、localStorage、状态集合大小",
      "status": "completed"
    },
    {
      "id": "l2-plan-2",
      "content": "设计并实现状态缓存清理 helper，仅清理不存在表格/行/列对应的运行态 key，不清理持久用户数据",
      "status": "completed"
    },
    {
      "id": "l2-plan-3",
      "content": "设计并接入状态缓存清理点：数据刷新后、保存成功后、destroy 前，逐点启用并回归验证",
      "status": "completed"
    },
    {
      "id": "l2-plan-4",
      "content": "设计快照轻量化兼容层：旧完整快照只读兼容，新 hash 快照 feature flag 试运行",
      "status": "pending"
    },
    {
      "id": "l2-plan-5",
      "content": "设计单元格历史容量治理：单格上限、全局上限、过长值策略、旧格式兼容与用户确认清理",
      "status": "pending"
    },
    {
      "id": "l2-plan-6",
      "content": "制定 L2 分阶段验收、回滚和暂停条件，确认通过后再进入实施",
      "status": "in_progress"
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
      "at": "2026-05-17T20:52:41.245Z",
      "type": "updated",
      "refId": "acu-moonbox-structure-restored",
      "message": "恢复月相盒原版星尘与粒子 DOM 结构，重新构建并同步 public/acu_visualizer_test/index.js；随后暂停实现，进入下一步优化详细计划。"
    },
    {
      "at": "2026-05-17T20:54:15.724Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T21:00:51.292Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T21:10:09.845Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T21:18:34.333Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T21:18:43.381Z",
      "type": "milestone_recorded",
      "refId": "memory-l1-leak-cleanup-completed",
      "message": "完成内存优化 L1 泄漏治理：事件生命周期登记、跨 document 菜单监听清理、弹窗/菜单/通知临时 UI 清理，并完成构建同步。"
    },
    {
      "at": "2026-05-17T22:04:51.362Z",
      "type": "updated",
      "refId": "l1-regression-fixes",
      "message": "修复 L1 优化后的 7 项回归问题并完成构建同步：历史、编辑保存、删除高亮、row mapping 缓存、设置 CSS、确认弹窗 CSS、快捷选项入口。"
    },
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
    }
  ],
  "stats": {
    "milestonesTotal": 1,
    "milestonesCompleted": 1,
    "todosTotal": 6,
    "todosCompleted": 3,
    "todosInProgress": 1,
    "todosCancelled": 0,
    "activeRisks": 0
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-18T13:58:40.238Z",
    "bodyHash": "sha256:3b597634e5ea8d0a24fc96e4a296c36a87619733b26eeafb03fcb126c0657ab4"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
