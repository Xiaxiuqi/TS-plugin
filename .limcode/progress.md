# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-18T01:04:20.783Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：ACU Visualizer 历史记录、高亮优先级、刷新菜单 removeWithEvents 回归修复完成
- 最新结论：修复用户反馈：1) 历史记录改为记录变更前旧值，数据库 diff 记录 oldCell，用户编辑记录 cellContent；2) 保存后不立即清空 currentUserEditMap，并从 currentDiffMap 删除用户编辑 key，避免绿色用户高亮被蓝色数据库高亮覆盖；3) main.js 补充导入 removeWithEvents，修复刷新三…
- 下一步：请重新 import 后复测历史记录 A/B/C 逻辑、绿色高亮保存后保留、刷新菜单三项点击与外部关闭。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
- 计划：`.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 建立优化前基线：记录数据规模、localStorage 占用、DOM 节点数、Heap/Performance 基线  `#mem-l0-1`
- [x] 补齐内存优化验收表与回归表，明确每阶段通过/回滚标准  `#mem-l0-2`
- [x] 规划并实施 destroy/重复初始化清理增强，仅清理测试版 DOM、事件、计时器、观察器和临时状态  `#mem-l1-1`
- [x] 规划并实施事件生命周期登记与跨 document 监听清理，验证热重载/刷新不叠加监听  `#mem-l1-2`
- [x] 规划并实施弹窗/菜单/通知残留清理，验证打开关闭循环无 DOM 泄漏  `#mem-l1-3`
- [ ] 规划并实施状态缓存清理：不存在表格的 diff/userEdit/pendingDelete/rowMapping/pagination 清理  `#mem-l2-1`
- [ ] 规划快照轻量化兼容层：旧快照只读兼容，新 hash 快照 feature flag 试运行  `#mem-l2-2`
- [ ] 规划单元格历史容量治理：总量上限、过长值处理、旧格式读取兼容与可回滚策略  `#mem-l2-3`
- [ ] 规划当前激活 tab 懒渲染与 fallback，先只设计不直接替换完整渲染路径  `#mem-l3-1`
- [ ] 规划局部 patch 与搜索高亮 debounce/限制策略，明确保持视觉一致的验证点  `#mem-l3-2`
- [ ] 评估虚拟滚动、Worker diff、IndexedDB 历史库是否有必要，未达触发条件则暂不实施  `#mem-l4-1`
<!-- LIMCODE_PROGRESS_TODOS_END -->

## 项目里程碑

<!-- LIMCODE_PROGRESS_MILESTONES_START -->
<!-- 暂无里程碑 -->
<!-- LIMCODE_PROGRESS_MILESTONES_END -->

## 风险与阻塞

<!-- LIMCODE_PROGRESS_RISKS_START -->
<!-- 暂无风险 -->
<!-- LIMCODE_PROGRESS_RISKS_END -->

## 最近更新

<!-- LIMCODE_PROGRESS_LOG_START -->
- 2026-05-17T15:48:13.732Z | updated | acu-visualizer-test-loader | 完成测试版稳定 loader 入口：loader.js 固定导入，内部通过 version.js 控制 main.js 版本化加载，降低 ESM 裸 URL 缓存导致的旧入口复用风险。
- 2026-05-17T16:02:41.305Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T16:24:13.116Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T16:40:36.490Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T16:40:50.236Z | updated | acu-visualizer-src-single-entry-build | 完成 ACU Visualizer 测试版 src 迁移与单入口构建支持：新增 build:entry，public 仅保留 index.js 产物，推荐直接 import acu_visualizer_test/index.js。
- 2026-05-17T18:14:17.998Z | milestone_recorded | acu-visualizer-test-stable-before-memory-plan | 用户确认当前 ACU Visualizer 测试版加载、CSS、通知、行排序、删除行、搜索等问题已无异常；进入内存优化规划阶段，暂不实施代码修改。
- 2026-05-17T18:16:24.933Z | artifact_changed | plan | 同步计划文档：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T18:20:29.329Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T18:22:19.255Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
- 2026-05-17T18:35:11.785Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md
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
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-18T01:04:20.783Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "ACU Visualizer 历史记录、高亮优先级、刷新菜单 removeWithEvents 回归修复完成",
  "latestConclusion": "修复用户反馈：1) 历史记录改为记录变更前旧值，数据库 diff 记录 oldCell，用户编辑记录 cellContent；2) 保存后不立即清空 currentUserEditMap，并从 currentDiffMap 删除用户编辑 key，避免绿色用户高亮被蓝色数据库高亮覆盖；3) main.js 补充导入 removeWithEvents，修复刷新三项菜单点击/外部点击/关闭/快捷选项时报 removeWithEvents is not defined。已构建并同步 public。",
  "currentBlocker": null,
  "nextAction": "请重新 import 后复测历史记录 A/B/C 逻辑、绿色高亮保存后保留、刷新菜单三项点击与外部关闭。",
  "activeArtifacts": {
    "design": ".limcode/design/acu-visualizer-模块迁移优先设计.md",
    "plan": ".limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
  },
  "todos": [
    {
      "id": "mem-l0-1",
      "content": "建立优化前基线：记录数据规模、localStorage 占用、DOM 节点数、Heap/Performance 基线",
      "status": "completed"
    },
    {
      "id": "mem-l0-2",
      "content": "补齐内存优化验收表与回归表，明确每阶段通过/回滚标准",
      "status": "completed"
    },
    {
      "id": "mem-l1-1",
      "content": "规划并实施 destroy/重复初始化清理增强，仅清理测试版 DOM、事件、计时器、观察器和临时状态",
      "status": "completed"
    },
    {
      "id": "mem-l1-2",
      "content": "规划并实施事件生命周期登记与跨 document 监听清理，验证热重载/刷新不叠加监听",
      "status": "completed"
    },
    {
      "id": "mem-l1-3",
      "content": "规划并实施弹窗/菜单/通知残留清理，验证打开关闭循环无 DOM 泄漏",
      "status": "completed"
    },
    {
      "id": "mem-l2-1",
      "content": "规划并实施状态缓存清理：不存在表格的 diff/userEdit/pendingDelete/rowMapping/pagination 清理",
      "status": "pending"
    },
    {
      "id": "mem-l2-2",
      "content": "规划快照轻量化兼容层：旧快照只读兼容，新 hash 快照 feature flag 试运行",
      "status": "pending"
    },
    {
      "id": "mem-l2-3",
      "content": "规划单元格历史容量治理：总量上限、过长值处理、旧格式读取兼容与可回滚策略",
      "status": "pending"
    },
    {
      "id": "mem-l3-1",
      "content": "规划当前激活 tab 懒渲染与 fallback，先只设计不直接替换完整渲染路径",
      "status": "pending"
    },
    {
      "id": "mem-l3-2",
      "content": "规划局部 patch 与搜索高亮 debounce/限制策略，明确保持视觉一致的验证点",
      "status": "pending"
    },
    {
      "id": "mem-l4-1",
      "content": "评估虚拟滚动、Worker diff、IndexedDB 历史库是否有必要，未达触发条件则暂不实施",
      "status": "pending"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
    {
      "at": "2026-05-17T15:48:13.732Z",
      "type": "updated",
      "refId": "acu-visualizer-test-loader",
      "message": "完成测试版稳定 loader 入口：loader.js 固定导入，内部通过 version.js 控制 main.js 版本化加载，降低 ESM 裸 URL 缓存导致的旧入口复用风险。"
    },
    {
      "at": "2026-05-17T16:02:41.305Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T16:24:13.116Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T16:40:36.490Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T16:40:50.236Z",
      "type": "updated",
      "refId": "acu-visualizer-src-single-entry-build",
      "message": "完成 ACU Visualizer 测试版 src 迁移与单入口构建支持：新增 build:entry，public 仅保留 index.js 产物，推荐直接 import acu_visualizer_test/index.js。"
    },
    {
      "at": "2026-05-17T18:14:17.998Z",
      "type": "milestone_recorded",
      "refId": "acu-visualizer-test-stable-before-memory-plan",
      "message": "用户确认当前 ACU Visualizer 测试版加载、CSS、通知、行排序、删除行、搜索等问题已无异常；进入内存优化规划阶段，暂不实施代码修改。"
    },
    {
      "at": "2026-05-17T18:16:24.933Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T18:20:29.329Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T18:22:19.255Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
    {
      "at": "2026-05-17T18:35:11.785Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-内存优化详细逐步实施计划.plan.md"
    },
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
    }
  ],
  "stats": {
    "milestonesTotal": 0,
    "milestonesCompleted": 0,
    "todosTotal": 11,
    "todosCompleted": 5,
    "todosInProgress": 0,
    "todosCancelled": 0,
    "activeRisks": 0
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-18T01:04:20.783Z",
    "bodyHash": "sha256:84cf5ff325fa526094990702bebd98930b03b5129a32b21a8629cdce90bce183"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
