# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-23T08:36:49.543Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：3/3 个里程碑已完成；最新：PG3
- 当前焦点：Phone 下一阶段安全迁移：next-8-settings-placeholders 继续恢复 Settings 占位组件
- 最新结论：P8 静态兼容验证通过，新入口可进入人工验收阶段；生产入口 src/phone/index.js 未切换。
- 下一步：在 Tavern 环境按 compat-report 执行人工业务流验收；通过后再规划 P9/P10，仍不可切换生产入口。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 设计：`.limcode/design/memo-prompt-optimization-record.md`
- 计划：`.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 建立下一阶段基线：确认当前新入口 typecheck/lint/build 通过，记录不切换 src/phone/index.js 的安全边界  `#next-1-baseline`
- [x] 迁移 Forum 帖子详情缓存与历史读取：梳理 forum/forumPost phone_module schema、缓存 key、帖子详情/评论写回与历史恢复路径  `#next-2-forum-history`
- [x] 迁移 Dynamic 动态历史精准化：动态主页、评论、发动态、配图更新、characterName 过滤与历史合并策略  `#next-3-dynamic-history`
- [x] 迁移 Live 直播历史精准化：直播列表、直播间、streamerName 过滤、消息流/状态更新与楼层读写回退  `#next-4-live-history`
- [x] 补齐媒体资源库：音乐库、头像库、图片库、聊天图库、贴纸/角色图查找策略与 Settings 资源页一致性  `#next-5-media-library`
- [x] 细化 AI prompt/schema：按 Chat、Shopping、Forum、Dynamic、Live、Diary、Email、Browser 等业务逐个补齐 prompt、返回字段约束与解析失败提示  `#next-6-ai-schema`
- [x] 深化图片生成 provider：对照旧 bundle 验证 NovelAI/OpenAI/Gemini 请求参数、负面提示词、参考图、二进制/zip 响应处理  `#next-7-imagegen-provider`
- [x] 清理 Settings 剩余占位页：指定五页、VariablePickerModal、PresetSettings、PresetAutoFillSettings 均已恢复；复扫仅 AvatarLibrary 残留非占位空状态样式类  `#next-8-settings-placeholders`
- [x] 建立并执行 P8 兼容验证清单：静态验证已通过，compat-report 已创建；待 Tavern 环境人工业务流验收  `#next-9-compat-checklist`
- [ ] P8 人工验收通过后再规划 P9/P10：并行产物对比、灰度替换 src/phone/index.js、回滚方案、模块映射表、迁移说明与临时脚本清理  `#next-10-switchover-docs`
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

### PG2 · Settings 预设页占位恢复完成
- 状态：completed
- 记录时间：2026-05-23T08:23:11.529Z
- 完成时间：2026-05-23T08:23:11.529Z
- 关联 TODO：preset-recovery-1-audit, preset-recovery-2-contract, preset-recovery-3-preset-settings, preset-recovery-4-preset-autofill, preset-recovery-5-validation, next-8-settings-placeholders
- 关联文档：
  - 计划：`.limcode/plans/settings-preset-pages-recovery.plan.md`
- 摘要:
按安全计划恢复 `PresetSettings.vue` 与 `PresetAutoFillSettings.vue`：前者实现本地提示词预设块编辑器，后者实现预设/自动填充分页容器并复用 AutoFillSettings；同时加固自动填充预设/其他设置 composable 与 autoFill 标签解析导出。占位复扫仅 AvatarLibrary 空状态样式残留。typecheck、lint、新入口 build 均通过。
- 下一步：进入 P8 兼容验证清单准备与执行。

### PG3 · P8 静态兼容验证清单完成
- 状态：completed
- 记录时间：2026-05-23T08:36:49.543Z
- 完成时间：2026-05-23T08:36:49.543Z
- 关联 TODO：next-9-compat-checklist, p8-compat-1-scope, p8-compat-2-static, p8-compat-3-module-checklist, p8-compat-4-report, p8-compat-5-sync
- 关联文档：
  - 计划：`.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md`
- 摘要:
创建 `src/phone/docs/compat-report.md`，记录启动/UI、Settings、Chat、Dynamic、Forum、Shopping、Live、Calendar、Diary、Email、Browser、Map、Camera、Music、AI、图片生成、楼层读写与旧入口回滚等 P8 兼容检查项。已完成静态验证：typecheck、lint、新入口 build 均通过；Settings 占位复扫仅 AvatarLibrary 空状态样式命中。
- 下一步：在 Tavern 环境按 compat-report 执行人工业务流验收；通过后再规划 P9/P10，仍不可切换生产入口。
<!-- LIMCODE_PROGRESS_MILESTONES_END -->

## 风险与阻塞

<!-- LIMCODE_PROGRESS_RISKS_START -->
- acu-v98-old-entry-ambiguity | active | 正式目录旧 acu_visualizer.js 入口仍存在，可能与 index.js 最终入口混淆：当前最终用户确认方案以 public/acu_visualizer/index.js 为正式入口；但 public/acu_visualizer/acu_visualizer.js 仍存在并显示诊断问题/可能不是最新复制结果。若用户或线上仍引用旧 acu_visualizer.js，可能加载到非最终产物。需要后续明确是否保留、覆盖为 index.js、删除或改为提示重定向。
<!-- LIMCODE_PROGRESS_RISKS_END -->

## 最近更新

<!-- LIMCODE_PROGRESS_LOG_START -->
- 2026-05-23T06:41:53.145Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T06:42:11.797Z | updated | phone-safe-migration-settings-other | Settings OtherSettings 从迁移占位恢复为真实其他设置页；生产入口未切换。
- 2026-05-23T06:48:27.338Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T06:48:48.225Z | updated | phone-safe-migration-settings-auto-reply | Settings AutoReplySettings 从迁移占位恢复为真实自动回复设置页；生产入口未切换。
- 2026-05-23T06:54:32.744Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T06:54:57.172Z | updated | phone-safe-migration-settings-worldbook-manager | Settings WorldbookManager 从迁移占位恢复为真实世界书管理页；指定 Settings 五页顺序恢复完成；生产入口未切换。
- 2026-05-23T07:03:23.631Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T07:03:43.965Z | updated | phone-safe-migration-settings-placeholder-scan | 扫描 Settings 剩余占位：除 Preset 两页外无页面级完整占位；发现 VariablePickerModal 弹窗占位待后续处理。
- 2026-05-23T07:15:05.768Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T07:15:23.295Z | updated | phone-safe-migration-settings-variable-picker | Settings VariablePickerModal 从迁移占位恢复为真实变量选择弹窗；生产入口未切换。
- 2026-05-23T07:22:00.913Z | artifact_changed | plan | 同步计划文档：.limcode/plans/settings-preset-pages-recovery.plan.md
- 2026-05-23T07:40:27.785Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md
- 2026-05-23T08:01:23.668Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md
- 2026-05-23T08:14:56.874Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md
- 2026-05-23T08:17:34.072Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md
- 2026-05-23T08:22:45.673Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md
- 2026-05-23T08:23:01.591Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T08:23:11.529Z | milestone_recorded | PG2 | 记录里程碑：Settings 预设页占位恢复完成
- 2026-05-23T08:36:35.557Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md
- 2026-05-23T08:36:49.543Z | milestone_recorded | PG3 | 记录里程碑：P8 静态兼容验证清单完成
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-23T08:36:49.543Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "Phone 下一阶段安全迁移：next-8-settings-placeholders 继续恢复 Settings 占位组件",
  "latestConclusion": "P8 静态兼容验证通过，新入口可进入人工验收阶段；生产入口 src/phone/index.js 未切换。",
  "currentBlocker": null,
  "nextAction": "在 Tavern 环境按 compat-report 执行人工业务流验收；通过后再规划 P9/P10，仍不可切换生产入口。",
  "activeArtifacts": {
    "design": ".limcode/design/memo-prompt-optimization-record.md",
    "plan": ".limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
  },
  "todos": [
    {
      "id": "next-1-baseline",
      "content": "建立下一阶段基线：确认当前新入口 typecheck/lint/build 通过，记录不切换 src/phone/index.js 的安全边界",
      "status": "completed"
    },
    {
      "id": "next-2-forum-history",
      "content": "迁移 Forum 帖子详情缓存与历史读取：梳理 forum/forumPost phone_module schema、缓存 key、帖子详情/评论写回与历史恢复路径",
      "status": "completed"
    },
    {
      "id": "next-3-dynamic-history",
      "content": "迁移 Dynamic 动态历史精准化：动态主页、评论、发动态、配图更新、characterName 过滤与历史合并策略",
      "status": "completed"
    },
    {
      "id": "next-4-live-history",
      "content": "迁移 Live 直播历史精准化：直播列表、直播间、streamerName 过滤、消息流/状态更新与楼层读写回退",
      "status": "completed"
    },
    {
      "id": "next-5-media-library",
      "content": "补齐媒体资源库：音乐库、头像库、图片库、聊天图库、贴纸/角色图查找策略与 Settings 资源页一致性",
      "status": "completed"
    },
    {
      "id": "next-6-ai-schema",
      "content": "细化 AI prompt/schema：按 Chat、Shopping、Forum、Dynamic、Live、Diary、Email、Browser 等业务逐个补齐 prompt、返回字段约束与解析失败提示",
      "status": "completed"
    },
    {
      "id": "next-7-imagegen-provider",
      "content": "深化图片生成 provider：对照旧 bundle 验证 NovelAI/OpenAI/Gemini 请求参数、负面提示词、参考图、二进制/zip 响应处理",
      "status": "completed"
    },
    {
      "id": "next-8-settings-placeholders",
      "content": "清理 Settings 剩余占位页：指定五页、VariablePickerModal、PresetSettings、PresetAutoFillSettings 均已恢复；复扫仅 AvatarLibrary 残留非占位空状态样式类",
      "status": "completed"
    },
    {
      "id": "next-9-compat-checklist",
      "content": "建立并执行 P8 兼容验证清单：静态验证已通过，compat-report 已创建；待 Tavern 环境人工业务流验收",
      "status": "completed"
    },
    {
      "id": "next-10-switchover-docs",
      "content": "P8 人工验收通过后再规划 P9/P10：并行产物对比、灰度替换 src/phone/index.js、回滚方案、模块映射表、迁移说明与临时脚本清理",
      "status": "pending"
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
    },
    {
      "id": "PG2",
      "title": "Settings 预设页占位恢复完成",
      "status": "completed",
      "summary": "按安全计划恢复 `PresetSettings.vue` 与 `PresetAutoFillSettings.vue`：前者实现本地提示词预设块编辑器，后者实现预设/自动填充分页容器并复用 AutoFillSettings；同时加固自动填充预设/其他设置 composable 与 autoFill 标签解析导出。占位复扫仅 AvatarLibrary 空状态样式残留。typecheck、lint、新入口 build 均通过。",
      "relatedTodoIds": [
        "preset-recovery-1-audit",
        "preset-recovery-2-contract",
        "preset-recovery-3-preset-settings",
        "preset-recovery-4-preset-autofill",
        "preset-recovery-5-validation",
        "next-8-settings-placeholders"
      ],
      "relatedReviewMilestoneIds": [],
      "relatedArtifacts": {
        "plan": ".limcode/plans/settings-preset-pages-recovery.plan.md"
      },
      "completedAt": "2026-05-23T08:23:11.529Z",
      "recordedAt": "2026-05-23T08:23:11.529Z",
      "nextAction": "进入 P8 兼容验证清单准备与执行。"
    },
    {
      "id": "PG3",
      "title": "P8 静态兼容验证清单完成",
      "status": "completed",
      "summary": "创建 `src/phone/docs/compat-report.md`，记录启动/UI、Settings、Chat、Dynamic、Forum、Shopping、Live、Calendar、Diary、Email、Browser、Map、Camera、Music、AI、图片生成、楼层读写与旧入口回滚等 P8 兼容检查项。已完成静态验证：typecheck、lint、新入口 build 均通过；Settings 占位复扫仅 AvatarLibrary 空状态样式命中。",
      "relatedTodoIds": [
        "next-9-compat-checklist",
        "p8-compat-1-scope",
        "p8-compat-2-static",
        "p8-compat-3-module-checklist",
        "p8-compat-4-report",
        "p8-compat-5-sync"
      ],
      "relatedReviewMilestoneIds": [],
      "relatedArtifacts": {
        "plan": ".limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
      },
      "completedAt": "2026-05-23T08:36:49.543Z",
      "recordedAt": "2026-05-23T08:36:49.543Z",
      "nextAction": "在 Tavern 环境按 compat-report 执行人工业务流验收；通过后再规划 P9/P10，仍不可切换生产入口。"
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
      "at": "2026-05-23T06:41:53.145Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T06:42:11.797Z",
      "type": "updated",
      "refId": "phone-safe-migration-settings-other",
      "message": "Settings OtherSettings 从迁移占位恢复为真实其他设置页；生产入口未切换。"
    },
    {
      "at": "2026-05-23T06:48:27.338Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T06:48:48.225Z",
      "type": "updated",
      "refId": "phone-safe-migration-settings-auto-reply",
      "message": "Settings AutoReplySettings 从迁移占位恢复为真实自动回复设置页；生产入口未切换。"
    },
    {
      "at": "2026-05-23T06:54:32.744Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T06:54:57.172Z",
      "type": "updated",
      "refId": "phone-safe-migration-settings-worldbook-manager",
      "message": "Settings WorldbookManager 从迁移占位恢复为真实世界书管理页；指定 Settings 五页顺序恢复完成；生产入口未切换。"
    },
    {
      "at": "2026-05-23T07:03:23.631Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T07:03:43.965Z",
      "type": "updated",
      "refId": "phone-safe-migration-settings-placeholder-scan",
      "message": "扫描 Settings 剩余占位：除 Preset 两页外无页面级完整占位；发现 VariablePickerModal 弹窗占位待后续处理。"
    },
    {
      "at": "2026-05-23T07:15:05.768Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T07:15:23.295Z",
      "type": "updated",
      "refId": "phone-safe-migration-settings-variable-picker",
      "message": "Settings VariablePickerModal 从迁移占位恢复为真实变量选择弹窗；生产入口未切换。"
    },
    {
      "at": "2026-05-23T07:22:00.913Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/settings-preset-pages-recovery.plan.md"
    },
    {
      "at": "2026-05-23T07:40:27.785Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md"
    },
    {
      "at": "2026-05-23T08:01:23.668Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md"
    },
    {
      "at": "2026-05-23T08:14:56.874Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md"
    },
    {
      "at": "2026-05-23T08:17:34.072Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md"
    },
    {
      "at": "2026-05-23T08:22:45.673Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/settings-preset-pages-recovery.plan.md"
    },
    {
      "at": "2026-05-23T08:23:01.591Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T08:23:11.529Z",
      "type": "milestone_recorded",
      "refId": "PG2",
      "message": "记录里程碑：Settings 预设页占位恢复完成"
    },
    {
      "at": "2026-05-23T08:36:35.557Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md"
    },
    {
      "at": "2026-05-23T08:36:49.543Z",
      "type": "milestone_recorded",
      "refId": "PG3",
      "message": "记录里程碑：P8 静态兼容验证清单完成"
    }
  ],
  "stats": {
    "milestonesTotal": 3,
    "milestonesCompleted": 3,
    "todosTotal": 10,
    "todosCompleted": 9,
    "todosInProgress": 0,
    "todosCancelled": 0,
    "activeRisks": 1
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-23T08:36:49.543Z",
    "bodyHash": "sha256:3bfa0fdd6f401e7cec3b13ecde3842f0b032ff92dcb7f77a57efdb61ae6c395c"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
