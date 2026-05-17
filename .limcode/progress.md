# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-17T16:40:50.236Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：ACU Visualizer 测试版迁移到 src 并支持单入口构建
- 最新结论：已将测试版源码整体迁移到 src/acu_visualizer_test，public/acu_visualizer_test 清理为发布产物目录，仅保留 index.js/index.js.map；新增 build:entry 通用脚本与 webpack --env entry 入口过滤，已验证 pnpm build:entry --env entry=s…
- 下一步：在酒馆助手中使用 import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js' 做浏览器回归，确认单文件产物加载、CSS 内联、通知/表格显示正常。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
- 计划：`.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 废弃 loader 作为推荐入口，将测试版源码整体迁移到 src/acu_visualizer_test 并保留构建期内联 CSS 入口  `#single-1`
- [x] 删除自定义 webpack 配置，改用现有 pnpm build 扫描 src/acu_visualizer_test/index.js 输出单文件  `#single-2`
- [x] 执行现有 pnpm build，生成 dist/acu_visualizer_test/index.js，并同步到 public/acu_visualizer_test/index.js；public 目录仅保留构建产物  `#single-3`
- [x] 同步文档：README、迁移记录、change-log、progress，明确推荐 import index.js  `#single-4`
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
- 2026-05-17T16:24:13.116Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T16:40:36.490Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md
- 2026-05-17T16:40:50.236Z | updated | acu-visualizer-src-single-entry-build | 完成 ACU Visualizer 测试版 src 迁移与单入口构建支持：新增 build:entry，public 仅保留 index.js 产物，推荐直接 import acu_visualizer_test/index.js。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-17T16:40:50.236Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "ACU Visualizer 测试版迁移到 src 并支持单入口构建",
  "latestConclusion": "已将测试版源码整体迁移到 src/acu_visualizer_test，public/acu_visualizer_test 清理为发布产物目录，仅保留 index.js/index.js.map；新增 build:entry 通用脚本与 webpack --env entry 入口过滤，已验证 pnpm build:entry --env entry=src/acu_visualizer_test/index.js 只构建 ACU 测试版入口，浮岛 dist 改动已回退。",
  "currentBlocker": null,
  "nextAction": "在酒馆助手中使用 import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js' 做浏览器回归，确认单文件产物加载、CSS 内联、通知/表格显示正常。",
  "activeArtifacts": {
    "design": ".limcode/design/acu-visualizer-模块迁移优先设计.md",
    "plan": ".limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md"
  },
  "todos": [
    {
      "id": "single-1",
      "content": "废弃 loader 作为推荐入口，将测试版源码整体迁移到 src/acu_visualizer_test 并保留构建期内联 CSS 入口",
      "status": "completed"
    },
    {
      "id": "single-2",
      "content": "删除自定义 webpack 配置，改用现有 pnpm build 扫描 src/acu_visualizer_test/index.js 输出单文件",
      "status": "completed"
    },
    {
      "id": "single-3",
      "content": "执行现有 pnpm build，生成 dist/acu_visualizer_test/index.js，并同步到 public/acu_visualizer_test/index.js；public 目录仅保留构建产物",
      "status": "completed"
    },
    {
      "id": "single-4",
      "content": "同步文档：README、迁移记录、change-log、progress，明确推荐 import index.js",
      "status": "completed"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
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
    "generatedAt": "2026-05-17T16:40:50.236Z",
    "bodyHash": "sha256:256371dfa910cccd113439f2d2615d14d72e11dfc85dd9acabe5c4f3fe6b6b2e"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
