# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-17T22:04:51.362Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：ACU Visualizer L1 回归问题修复完成，等待用户复测
- 最新结论：针对用户反馈完成回归修复：历史菜单不再先移除触发节点；编辑保存先关闭弹窗再等待数据库保存；设置保存缺省 theme/nightMode 防止 acu-theme-undefined 与误关夜间模式；确认清理弹窗补充主题 class；恢复刷新按钮三项菜单和快捷选项入口；行排序回到 identity mapping 时删除 acu_row_position_ma…
- 下一步：请用户复测 7 项反馈点；确认通过后再继续 L2.1 状态缓存清理。
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
- 2026-05-17T15:42:51.788Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T15:46:27.938Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T15:48:00.618Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
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
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-17T22:04:51.362Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "ACU Visualizer L1 回归问题修复完成，等待用户复测",
  "latestConclusion": "针对用户反馈完成回归修复：历史菜单不再先移除触发节点；编辑保存先关闭弹窗再等待数据库保存；设置保存缺省 theme/nightMode 防止 acu-theme-undefined 与误关夜间模式；确认清理弹窗补充主题 class；恢复刷新按钮三项菜单和快捷选项入口；行排序回到 identity mapping 时删除 acu_row_position_mapping 缓存；待删除行渲染时压制单元格 diff/userEdit 高亮以免红色高亮被覆盖。已构建并同步 public。",
  "currentBlocker": null,
  "nextAction": "请用户复测 7 项反馈点；确认通过后再继续 L2.1 状态缓存清理。",
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
      "at": "2026-05-17T15:42:51.788Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T15:46:27.938Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T15:48:00.618Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
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
    "generatedAt": "2026-05-17T22:04:51.362Z",
    "bodyHash": "sha256:f58c8130ca133a614bd45850007a52fb7018ff38d7db5ad33a53274813375dfb"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
