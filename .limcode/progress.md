# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-14T18:09:08.731Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：修正新变量 MVU 状态栏读取方式与面板高度。
- 最新结论：根据酒馆助手接口重新调整 releasetest 的新变量 MVU 状态栏：读取当前聊天变量优先使用 Mvu.getMvuData({type:'chat'})，再按 getVariables({type:'chat'})、getAllVariables()、Mvu.getMvuData({type:'message', message_id:'latest…
- 下一步：在 releasetest 启用“MVU状态栏（新变量）”实测变量读取与更新；若仍为空，优先检查当前环境中 Mvu.getMvuData({type:'chat'}) 返回结构是否包含 stat_data。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 计划：`.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 只检查并修复 releasetest 的新变量 MVU 数据读取回退逻辑  `#fix-read-1`
- [x] 恢复新变量 MVU 面板高度/滚动样式符合需求  `#fix-read-2`
- [x] 验证 releasetest 语法并更新项目文档  `#fix-read-3`
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
- 2026-05-14T17:24:13.953Z | updated | manager-mobile-mask-fix | 非正式版 manager-ui 修复：移除可见遮罩/模糊，保留透明全屏外部点击关闭层，并用 100dvh 修正手机窄屏视口高度；prod 未修改。
- 2026-05-14T17:34:52.449Z | updated | sync-releasetest-to-prod-manager-mobile-fix | 将当前 releasetest 同步到 prod，并恢复正式版环境配置与 v1.2 版本；同步内容包括 manager-ui 手机窄屏透明点击层/100dvh 修复。
- 2026-05-14T17:47:24.951Z | updated | fix-mvu-newvars-status-inline-update | 修复新变量 MVU 状态栏：改用 getAllVariables 最新数据进行 populateData 局部刷新，并解除 206px 固定高度裁切。
- 2026-05-14T18:09:08.731Z | updated | fix-releasetest-newvars-mvu-helper-api-read | 按酒馆助手接口修正 releasetest 新变量 MVU：优先 Mvu.getMvuData({type:'chat'}) 读取当前变量，恢复左卡固定高度与右侧隐藏滚动条滚动。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-14T18:09:08.731Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "修正新变量 MVU 状态栏读取方式与面板高度。",
  "latestConclusion": "根据酒馆助手接口重新调整 releasetest 的新变量 MVU 状态栏：读取当前聊天变量优先使用 Mvu.getMvuData({type:'chat'})，再按 getVariables({type:'chat'})、getAllVariables()、Mvu.getMvuData({type:'message', message_id:'latest'}) 回退，避免只依赖 getAllVariables 导致无法读取；面板样式恢复为等级/战力评级左卡固定 206px 高度，右侧属性面板固定 206px 并允许垂直滚动但隐藏滚动条。仅修改 releasetest，已确认 prod/mvu-status-newvars 无本轮差异。releasetest 新变量状态栏 JS 已通过 node --check。",
  "currentBlocker": null,
  "nextAction": "在 releasetest 启用“MVU状态栏（新变量）”实测变量读取与更新；若仍为空，优先检查当前环境中 Mvu.getMvuData({type:'chat'}) 返回结构是否包含 stat_data。",
  "activeArtifacts": {
    "plan": ".limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
  },
  "todos": [
    {
      "id": "fix-read-1",
      "content": "只检查并修复 releasetest 的新变量 MVU 数据读取回退逻辑",
      "status": "completed"
    },
    {
      "id": "fix-read-2",
      "content": "恢复新变量 MVU 面板高度/滚动样式符合需求",
      "status": "completed"
    },
    {
      "id": "fix-read-3",
      "content": "验证 releasetest 语法并更新项目文档",
      "status": "completed"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
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
    },
    {
      "at": "2026-05-14T17:24:13.953Z",
      "type": "updated",
      "refId": "manager-mobile-mask-fix",
      "message": "非正式版 manager-ui 修复：移除可见遮罩/模糊，保留透明全屏外部点击关闭层，并用 100dvh 修正手机窄屏视口高度；prod 未修改。"
    },
    {
      "at": "2026-05-14T17:34:52.449Z",
      "type": "updated",
      "refId": "sync-releasetest-to-prod-manager-mobile-fix",
      "message": "将当前 releasetest 同步到 prod，并恢复正式版环境配置与 v1.2 版本；同步内容包括 manager-ui 手机窄屏透明点击层/100dvh 修复。"
    },
    {
      "at": "2026-05-14T17:47:24.951Z",
      "type": "updated",
      "refId": "fix-mvu-newvars-status-inline-update",
      "message": "修复新变量 MVU 状态栏：改用 getAllVariables 最新数据进行 populateData 局部刷新，并解除 206px 固定高度裁切。"
    },
    {
      "at": "2026-05-14T18:09:08.731Z",
      "type": "updated",
      "refId": "fix-releasetest-newvars-mvu-helper-api-read",
      "message": "按酒馆助手接口修正 releasetest 新变量 MVU：优先 Mvu.getMvuData({type:'chat'}) 读取当前变量，恢复左卡固定高度与右侧隐藏滚动条滚动。"
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
    "generatedAt": "2026-05-14T18:09:08.731Z",
    "bodyHash": "sha256:08f0cee258b7ce839ecd9b12fd2d29d13a942208e725f682a2e027c147e3c293"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
