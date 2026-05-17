# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-17T18:35:11.785Z
- Status: active
- Phase: plan

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：ACU Visualizer 模块迁移稳定，准备进入内存优化详细规划
- 最新结论：测试版已完成 src 迁移、单文件构建、父页面样式注入修复，并修复加载通知重复、行排序、删除行、搜索事件等回归问题；当前用户确认无问题。接下来只阅读内存优化文档并制定更详细的逐步计划，暂不修改业务代码。
- 下一步：阅读 src/acu_visualizer_test/docs 内存优化相关文档，基于现有规划创建详细逐步实施计划。
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
- [ ] 规划并实施事件生命周期登记与跨 document 监听清理，验证热重载/刷新不叠加监听  `#mem-l1-2` (in_progress)
- [ ] 规划并实施弹窗/菜单/通知残留清理，验证打开关闭循环无 DOM 泄漏  `#mem-l1-3`
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
- 2026-05-17T14:18:37.448Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T14:18:49.402Z | updated | acu-visualizer-phase-6-render-sync-lifecycle-migration | 完成第六阶段渲染、数据库同步与生命周期模块迁移：table-renderer/database-sync/core/lifecycle/core/scheduler/main.js。已验证模块可 import 和基础渲染/同步/生命周期行为，未修改原插件目录。
- 2026-05-17T15:11:27.985Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T15:14:15.568Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T15:17:25.295Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T15:20:52.925Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T15:21:04.729Z | updated | acu-visualizer-css-migration | 完成测试版 CSS 完整迁移：search.css/table.css 与原脚本提取内容逐字节一致，main.js 改用 fetch + style 注入，新增 CSS 迁移记录。
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
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-17T18:35:11.785Z",
  "status": "active",
  "phase": "plan",
  "currentFocus": "ACU Visualizer 模块迁移稳定，准备进入内存优化详细规划",
  "latestConclusion": "测试版已完成 src 迁移、单文件构建、父页面样式注入修复，并修复加载通知重复、行排序、删除行、搜索事件等回归问题；当前用户确认无问题。接下来只阅读内存优化文档并制定更详细的逐步计划，暂不修改业务代码。",
  "currentBlocker": null,
  "nextAction": "阅读 src/acu_visualizer_test/docs 内存优化相关文档，基于现有规划创建详细逐步实施计划。",
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
      "status": "in_progress"
    },
    {
      "id": "mem-l1-3",
      "content": "规划并实施弹窗/菜单/通知残留清理，验证打开关闭循环无 DOM 泄漏",
      "status": "pending"
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
      "at": "2026-05-17T14:18:37.448Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T14:18:49.402Z",
      "type": "updated",
      "refId": "acu-visualizer-phase-6-render-sync-lifecycle-migration",
      "message": "完成第六阶段渲染、数据库同步与生命周期模块迁移：table-renderer/database-sync/core/lifecycle/core/scheduler/main.js。已验证模块可 import 和基础渲染/同步/生命周期行为，未修改原插件目录。"
    },
    {
      "at": "2026-05-17T15:11:27.985Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T15:14:15.568Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T15:17:25.295Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T15:20:52.925Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T15:21:04.729Z",
      "type": "updated",
      "refId": "acu-visualizer-css-migration",
      "message": "完成测试版 CSS 完整迁移：search.css/table.css 与原脚本提取内容逐字节一致，main.js 改用 fetch + style 注入，新增 CSS 迁移记录。"
    },
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
    }
  ],
  "stats": {
    "milestonesTotal": 0,
    "milestonesCompleted": 0,
    "todosTotal": 11,
    "todosCompleted": 3,
    "todosInProgress": 1,
    "todosCancelled": 0,
    "activeRisks": 0
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-17T18:35:11.785Z",
    "bodyHash": "sha256:c3ef7bc4cb2ca8f41f0186d8b7c27ce5288abe4c24a894328f47bfe2ecd5aee5"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
