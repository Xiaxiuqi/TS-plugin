# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-14T17:00:57.237Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：正式版与 releasetest 已移除旧 BP 前端，仅保留兼容 BP 模块。
- 最新结论：已删除 public/story_regex_ui_prod 与 public/story_regex_ui_releasetest 的旧 bp-panel 模块目录，移除 loader 模块接口引用与 BP 新旧互斥逻辑，并将管理界面显示名从“BP战力雷达（新变量）”改为“BP战力雷达（兼容）”。
- 下一步：如需同步测试版 public/story_regex_ui_test，也可按同样规则移除旧 BP；当前用户仅要求 releasetest 与正式版。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 计划：`.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 定位 releasetest/prod 旧 BP 模块引用与管理界面标签  `#bpclean1`
- [x] 删除 releasetest/prod 旧 bp-panel 文件并移除 loader/接口引用  `#bpclean2`
- [x] 将新变量 BP 显示名从（新变量）改为（兼容）并验证  `#bpclean3`
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
- 2026-05-12T12:33:32.615Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T12:37:41.527Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T12:42:18.817Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T12:43:18.413Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T12:43:48.581Z | milestone_recorded | 完成故事 UI 从正则引导到 public 双环境酒馆助手入口的实现，并通过本地 JS 语法检查。
- 2026-05-12T14:48:24.499Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T15:02:38.418Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T16:24:47.041Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T16:39:24.651Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T16:53:50.057Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md
- 2026-05-12T22:35:00.389Z | updated | 记录当前 StoryRegexUI 修复进展，并开始实现世界运行报告 wlog 模块接入。
- 2026-05-12T22:51:33.225Z | updated | 新增 relation-status 模块，将状态栏·好感度米白/暗色两套多正则收敛为外置渲染模块。
- 2026-05-12T22:59:59.914Z | updated | 新增 bp-panel 模块，将 BP系统米白/暗色三条正则收敛为外置渲染模块。
- 2026-05-12T23:21:47.537Z | updated | 拆分并重构咒回前端管理界面为 manager-ui 模块，统一米白/暗色样式并加入可调宽高。
- 2026-05-13T00:15:49.307Z | updated | 重构 manager-ui 的标题/按钮/诊断布局，并为超出主渲染窗口的旧楼层增加代码块折叠占位。
- 2026-05-13T01:34:13.949Z | updated | 将 manager-ui 改为 flex-column 以修复底部诊断区裁切，并按源正则重做独立的新变量 BP 模块。
- 2026-05-13T02:03:14.562Z | updated | 新增 mvu-status-newvars 独立模块，并将其接入 loader、管理面板与旧 mvu-status 的互斥逻辑。
- 2026-05-14T16:53:47.830Z | updated | release-v1.2 | 记录正式版 v1.2 发布内容：同步 releasetest 至 prod；包含新变量 BP 正则分类渲染、等级上色、容错解析、简化战力分栏/拆分、mvu-status-newvars、管理面板与互斥逻辑。
- 2026-05-14T16:57:38.972Z | milestone_recorded | release-v1.2 | 正式版 v1.2 同步完成：prod 已由 releasetest 覆盖，入口/loader 版本改为 v1.2，并通过全部 prod JS 语法检查。
- 2026-05-14T17:00:57.237Z | updated | bp-compatible-only | releasetest/prod 移除旧 BP 前端：删除 modules/bp-panel，移除 loader 注册与 BP 新旧互斥接口，将 bp-panel-newvars 标签改为 BP战力雷达（兼容）。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-14T17:00:57.237Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "正式版与 releasetest 已移除旧 BP 前端，仅保留兼容 BP 模块。",
  "latestConclusion": "已删除 public/story_regex_ui_prod 与 public/story_regex_ui_releasetest 的旧 bp-panel 模块目录，移除 loader 模块接口引用与 BP 新旧互斥逻辑，并将管理界面显示名从“BP战力雷达（新变量）”改为“BP战力雷达（兼容）”。",
  "currentBlocker": null,
  "nextAction": "如需同步测试版 public/story_regex_ui_test，也可按同样规则移除旧 BP；当前用户仅要求 releasetest 与正式版。",
  "activeArtifacts": {
    "plan": ".limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
  },
  "todos": [
    {
      "id": "bpclean1",
      "content": "定位 releasetest/prod 旧 BP 模块引用与管理界面标签",
      "status": "completed"
    },
    {
      "id": "bpclean2",
      "content": "删除 releasetest/prod 旧 bp-panel 文件并移除 loader/接口引用",
      "status": "completed"
    },
    {
      "id": "bpclean3",
      "content": "将新变量 BP 显示名从（新变量）改为（兼容）并验证",
      "status": "completed"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
    {
      "at": "2026-05-12T12:33:32.615Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T12:37:41.527Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T12:42:18.817Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T12:43:18.413Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T12:43:48.581Z",
      "type": "milestone_recorded",
      "message": "完成故事 UI 从正则引导到 public 双环境酒馆助手入口的实现，并通过本地 JS 语法检查。"
    },
    {
      "at": "2026-05-12T14:48:24.499Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T15:02:38.418Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T16:24:47.041Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T16:39:24.651Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T16:53:50.057Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
    },
    {
      "at": "2026-05-12T22:35:00.389Z",
      "type": "updated",
      "message": "记录当前 StoryRegexUI 修复进展，并开始实现世界运行报告 wlog 模块接入。"
    },
    {
      "at": "2026-05-12T22:51:33.225Z",
      "type": "updated",
      "message": "新增 relation-status 模块，将状态栏·好感度米白/暗色两套多正则收敛为外置渲染模块。"
    },
    {
      "at": "2026-05-12T22:59:59.914Z",
      "type": "updated",
      "message": "新增 bp-panel 模块，将 BP系统米白/暗色三条正则收敛为外置渲染模块。"
    },
    {
      "at": "2026-05-12T23:21:47.537Z",
      "type": "updated",
      "message": "拆分并重构咒回前端管理界面为 manager-ui 模块，统一米白/暗色样式并加入可调宽高。"
    },
    {
      "at": "2026-05-13T00:15:49.307Z",
      "type": "updated",
      "message": "重构 manager-ui 的标题/按钮/诊断布局，并为超出主渲染窗口的旧楼层增加代码块折叠占位。"
    },
    {
      "at": "2026-05-13T01:34:13.949Z",
      "type": "updated",
      "message": "将 manager-ui 改为 flex-column 以修复底部诊断区裁切，并按源正则重做独立的新变量 BP 模块。"
    },
    {
      "at": "2026-05-13T02:03:14.562Z",
      "type": "updated",
      "message": "新增 mvu-status-newvars 独立模块，并将其接入 loader、管理面板与旧 mvu-status 的互斥逻辑。"
    },
    {
      "at": "2026-05-14T16:53:47.830Z",
      "type": "updated",
      "refId": "release-v1.2",
      "message": "记录正式版 v1.2 发布内容：同步 releasetest 至 prod；包含新变量 BP 正则分类渲染、等级上色、容错解析、简化战力分栏/拆分、mvu-status-newvars、管理面板与互斥逻辑。"
    },
    {
      "at": "2026-05-14T16:57:38.972Z",
      "type": "milestone_recorded",
      "refId": "release-v1.2",
      "message": "正式版 v1.2 同步完成：prod 已由 releasetest 覆盖，入口/loader 版本改为 v1.2，并通过全部 prod JS 语法检查。"
    },
    {
      "at": "2026-05-14T17:00:57.237Z",
      "type": "updated",
      "refId": "bp-compatible-only",
      "message": "releasetest/prod 移除旧 BP 前端：删除 modules/bp-panel，移除 loader 注册与 BP 新旧互斥接口，将 bp-panel-newvars 标签改为 BP战力雷达（兼容）。"
    }
  ],
  "stats": {
    "milestonesTotal": 0,
    "milestonesCompleted": 0,
    "todosTotal": 3,
    "todosCompleted": 3,
    "todosInProgress": 0,
    "todosCancelled": 0,
    "activeRisks": 0
  },
  "render": {
    "rendererVersion": 1,
    "generatedAt": "2026-05-14T17:00:57.237Z",
    "bodyHash": "sha256:626cb200e22b17ae1576ee255feed4f7e22c932546073d9f295c06268f85f939"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
