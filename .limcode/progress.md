# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-17T16:02:41.305Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：ACU Visualizer 测试版稳定 loader 入口完成
- 最新结论：已新增 public/acu_visualizer_test/loader.js 与 version.js；酒馆助手可固定 import loader.js，loader 会先 destroy 旧实例，再以固定版本 main.js?v=20260517-css-loader 导入主入口，避免裸 main.js ESM 缓存导致旧入口不执行。loader sm…
- 下一步：在酒馆助手中改用 import 'https://ts-plugin.pages.dev/acu_visualizer_test/loader.js' 进行浏览器回归，确认 CSS 正常注入、通知/表格可见、无 cssRules SecurityError。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
- 计划：`.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 重构 main.js：导出 bootstrapAcuVisualizerTest()，支持被 loader 显式重复启动，并保持直接 import main.js 仍可自动启动  `#bootstrap-1`
- [x] 修改 loader.js：设置 loader 导入标记，导入固定版本 main 后显式调用 bootstrapAcuVisualizerTest()，避免 cached module 不重启  `#bootstrap-2`
- [x] 修正 lifecycle：等待 CSS 注入完成后再进入初始化调度，避免通知/表格先于样式出现  `#bootstrap-3`
- [x] 执行 smoke 验证并同步文档/进度  `#bootstrap-4`
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
- 2026-05-17T13:39:52.545Z | updated | acu-visualizer-phase-3-ui-low-risk-migration | 完成第三阶段低 UI 风险模块迁移：notifications/theme/pagination/tabs。已验证模块可 import 和基础 HTML/class/state 行为，未修改原插件目录。
- 2026-05-17T13:50:49.856Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T13:52:43.500Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T13:52:53.226Z | updated | acu-visualizer-phase-4-dialog-editor-migration | 完成第四阶段弹窗与编辑模块迁移：settings-dialog/shortcut-dialog/cell-history/cell-editor。已验证模块可 import 和基础 HTML/class/state 行为，未修改原插件目录。
- 2026-05-17T14:03:54.329Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T14:05:14.871Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T14:05:26.486Z | updated | acu-visualizer-phase-5-sort-search-migration | 完成第五阶段交互排序与搜索模块迁移：row-sort/table-sort/search。已验证模块可 import 和基础排序/搜索行为，未修改原插件目录。
- 2026-05-17T14:16:30.970Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
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
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-17T16:02:41.305Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "ACU Visualizer 测试版稳定 loader 入口完成",
  "latestConclusion": "已新增 public/acu_visualizer_test/loader.js 与 version.js；酒馆助手可固定 import loader.js，loader 会先 destroy 旧实例，再以固定版本 main.js?v=20260517-css-loader 导入主入口，避免裸 main.js ESM 缓存导致旧入口不执行。loader smoke 验证通过，未触碰 public/acu_visualizer 原插件目录。",
  "currentBlocker": null,
  "nextAction": "在酒馆助手中改用 import 'https://ts-plugin.pages.dev/acu_visualizer_test/loader.js' 进行浏览器回归，确认 CSS 正常注入、通知/表格可见、无 cssRules SecurityError。",
  "activeArtifacts": {
    "design": ".limcode/design/acu-visualizer-模块迁移优先设计.md",
    "plan": ".limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
  },
  "todos": [
    {
      "id": "bootstrap-1",
      "content": "重构 main.js：导出 bootstrapAcuVisualizerTest()，支持被 loader 显式重复启动，并保持直接 import main.js 仍可自动启动",
      "status": "completed"
    },
    {
      "id": "bootstrap-2",
      "content": "修改 loader.js：设置 loader 导入标记，导入固定版本 main 后显式调用 bootstrapAcuVisualizerTest()，避免 cached module 不重启",
      "status": "completed"
    },
    {
      "id": "bootstrap-3",
      "content": "修正 lifecycle：等待 CSS 注入完成后再进入初始化调度，避免通知/表格先于样式出现",
      "status": "completed"
    },
    {
      "id": "bootstrap-4",
      "content": "执行 smoke 验证并同步文档/进度",
      "status": "completed"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
    {
      "at": "2026-05-17T13:39:52.545Z",
      "type": "updated",
      "refId": "acu-visualizer-phase-3-ui-low-risk-migration",
      "message": "完成第三阶段低 UI 风险模块迁移：notifications/theme/pagination/tabs。已验证模块可 import 和基础 HTML/class/state 行为，未修改原插件目录。"
    },
    {
      "at": "2026-05-17T13:50:49.856Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T13:52:43.500Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T13:52:53.226Z",
      "type": "updated",
      "refId": "acu-visualizer-phase-4-dialog-editor-migration",
      "message": "完成第四阶段弹窗与编辑模块迁移：settings-dialog/shortcut-dialog/cell-history/cell-editor。已验证模块可 import 和基础 HTML/class/state 行为，未修改原插件目录。"
    },
    {
      "at": "2026-05-17T14:03:54.329Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T14:05:14.871Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
    {
      "at": "2026-05-17T14:05:26.486Z",
      "type": "updated",
      "refId": "acu-visualizer-phase-5-sort-search-migration",
      "message": "完成第五阶段交互排序与搜索模块迁移：row-sort/table-sort/search。已验证模块可 import 和基础排序/搜索行为，未修改原插件目录。"
    },
    {
      "at": "2026-05-17T14:16:30.970Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
    },
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
    }
  ],
  "stats": {
    "milestonesTotal": 0,
    "milestonesCompleted": 0,
    "todosTotal": 4,
    "todosCompleted": 4,
    "todosInProgress": 0,
    "todosCancelled": 0,
    "activeRisks": 0
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-17T16:02:41.305Z",
    "bodyHash": "sha256:dda50166cabdd0fe70d7039fb567bccad3c69e220376c6a4ccc2b0c2afe2e2d0"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
