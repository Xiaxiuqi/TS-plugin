# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-18T17:49:39.448Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：1/1 个里程碑已完成；最新：acu-visualizer-l1-regression-stabilized-20260518
- 当前焦点：修复 MVU 状态栏新变量版读取旧快照，导致世界状态与羁绊档案不同步的问题
- 最新结论：已记录按钮改名修复，并修正 mvu-status-newvars 的变量读取顺序：优先按当前消息楼层 messageId 读取 Mvu/getVariables 的 message 变量，再回退 latest message，最后才回退 chat/getAllVariables，避免当前时间、当前位置、咒术高专羁绊档案读取到旧的聊天级快照。
- 下一步：在酒馆内刷新/开关美化脚本后验证 MVU 状态栏当前时间、当前位置、咒术高专羁绊档案是否随变量更新。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/acu-visualizer-模块迁移优先设计.md`
- 计划：`.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [ ] 后续单独规划测试版内部命名清理：ACUVisualizerTest 等测试命名改为正式命名，先在测试版验证，不夹带正式发布  `#future-naming-1`
- [x] 紧急修复正式版发布入口：按用户确认方式直接从 public/acu_visualizer_test/ 复制到 public/acu_visualizer/，只修改版本号，并以 index.js 作为正式入口  `#hotfix-index-release`
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
- acu-v98-old-entry-ambiguity | active | 正式目录旧 acu_visualizer.js 入口仍存在，可能与 index.js 最终入口混淆：当前最终用户确认方案以 public/acu_visualizer/index.js 为正式入口；但 public/acu_visualizer/acu_visualizer.js 仍存在并显示诊断问题/可能不是最新复制结果。若用户或线上仍引用旧 acu_visualizer.js，可能加载到非最终产物。需要后续明确是否保留、覆盖为 index.js、删除或改为提示重定向。
<!-- LIMCODE_PROGRESS_RISKS_END -->

## 最近更新

<!-- LIMCODE_PROGRESS_LOG_START -->
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
- 2026-05-18T17:41:21.534Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md
- 2026-05-18T17:41:43.912Z | updated | acu-v98-direct-public-copy-finalized | 整理当前修改：最终发布修正改为直接复制 public/acu_visualizer_test/ 到 public/acu_visualizer/，只替换版本号，并以 public/acu_visualizer/index.js 为确认入口；node --check 已通过。
- 2026-05-18T17:46:47.495Z | updated | story-regex-ui-reload-button-rename | story_regex_ui_prod 与 story_regex_ui_releasetest：外部按钮“重载资源”改名为“重载美化”；管理面板内部按钮恢复为“重载资源”；注册逻辑改为优先 replaceScriptButtons 以替换旧外部按钮；loader 残留未就绪报错增加刷新/开关脚本提示。
- 2026-05-18T17:49:39.448Z | updated | mvu-status-newvars-message-scope-read | story_regex_ui_prod 与 story_regex_ui_releasetest：mvu-status-newvars 现在保存并使用当前消息楼层 messageId，优先读取 message 级 MVU/变量数据；修复当前时间、当前位置、咒术高专羁绊档案显示未随变量更新的问题。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-18T17:49:39.448Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "修复 MVU 状态栏新变量版读取旧快照，导致世界状态与羁绊档案不同步的问题",
  "latestConclusion": "已记录按钮改名修复，并修正 mvu-status-newvars 的变量读取顺序：优先按当前消息楼层 messageId 读取 Mvu/getVariables 的 message 变量，再回退 latest message，最后才回退 chat/getAllVariables，避免当前时间、当前位置、咒术高专羁绊档案读取到旧的聊天级快照。",
  "currentBlocker": null,
  "nextAction": "在酒馆内刷新/开关美化脚本后验证 MVU 状态栏当前时间、当前位置、咒术高专羁绊档案是否随变量更新。",
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
      "id": "hotfix-index-release",
      "content": "紧急修复正式版发布入口：按用户确认方式直接从 public/acu_visualizer_test/ 复制到 public/acu_visualizer/，只修改版本号，并以 index.js 作为正式入口",
      "status": "completed"
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
  "risks": [
    {
      "id": "acu-v98-old-entry-ambiguity",
      "title": "正式目录旧 acu_visualizer.js 入口仍存在，可能与 index.js 最终入口混淆",
      "description": "当前最终用户确认方案以 public/acu_visualizer/index.js 为正式入口；但 public/acu_visualizer/acu_visualizer.js 仍存在并显示诊断问题/可能不是最新复制结果。若用户或线上仍引用旧 acu_visualizer.js，可能加载到非最终产物。需要后续明确是否保留、覆盖为 index.js、删除或改为提示重定向。",
      "status": "active"
    }
  ],
  "log": [
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
    },
    {
      "at": "2026-05-18T17:41:21.534Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/acu-visualizer-v98-测试版同步正式版发布计划.plan.md"
    },
    {
      "at": "2026-05-18T17:41:43.912Z",
      "type": "updated",
      "refId": "acu-v98-direct-public-copy-finalized",
      "message": "整理当前修改：最终发布修正改为直接复制 public/acu_visualizer_test/ 到 public/acu_visualizer/，只替换版本号，并以 public/acu_visualizer/index.js 为确认入口；node --check 已通过。"
    },
    {
      "at": "2026-05-18T17:46:47.495Z",
      "type": "updated",
      "refId": "story-regex-ui-reload-button-rename",
      "message": "story_regex_ui_prod 与 story_regex_ui_releasetest：外部按钮“重载资源”改名为“重载美化”；管理面板内部按钮恢复为“重载资源”；注册逻辑改为优先 replaceScriptButtons 以替换旧外部按钮；loader 残留未就绪报错增加刷新/开关脚本提示。"
    },
    {
      "at": "2026-05-18T17:49:39.448Z",
      "type": "updated",
      "refId": "mvu-status-newvars-message-scope-read",
      "message": "story_regex_ui_prod 与 story_regex_ui_releasetest：mvu-status-newvars 现在保存并使用当前消息楼层 messageId，优先读取 message 级 MVU/变量数据；修复当前时间、当前位置、咒术高专羁绊档案显示未随变量更新的问题。"
    }
  ],
  "stats": {
    "milestonesTotal": 1,
    "milestonesCompleted": 1,
    "todosTotal": 9,
    "todosCompleted": 8,
    "todosInProgress": 0,
    "todosCancelled": 0,
    "activeRisks": 1
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-18T17:49:39.448Z",
    "bodyHash": "sha256:ab86c6d090298bd1b51c7f6ef250566696f53f8d3a4e0406544796134f74e42a"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
