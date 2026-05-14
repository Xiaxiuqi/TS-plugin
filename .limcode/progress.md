# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-14T18:56:23.486Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：修复 releasetest 新变量 MVU 行囊展开高度与“论外熟练”显示。
- 最新结论：已在 releasetest 新变量 MVU 中为行囊折叠内容设置最大高度，约四行半内容高度，内容少时自然显示，超过后可纵向滚动且隐藏滚动条。已在 releasetest 新变量 MVU 与 BP 新变量面板显示层增加“轮外熟练”到“论外熟练”的防呆归一化：无论获取值为轮外熟练或论外熟练，界面显示均为论外熟练。JS 已通过 node --check；正式版对…
- 下一步：在 releasetest 暗色模式实测行囊展开高度、滚动行为与论外熟练显示是否符合预期。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 计划：`.limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 检查 releasetest 新变量 MVU/BP 中行囊渲染与熟练阶段显示位置  `#inventory-scroll-1`
- [x] 为新变量 MVU 行囊展开内容设置四行半高度上限、隐藏滚动条滚动  `#inventory-scroll-2`
- [x] 在新变量 MVU 与 BP 显示层统一将“轮外熟练/论外熟练”显示为“论外熟练”  `#inventory-scroll-3`
- [x] 验证语法并确认正式版未修改  `#inventory-scroll-4`
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
- 2026-05-14T18:25:52.503Z | updated | add-newvars-missing-character-attrs | 补全 releasetest 新变量 MVU 的角色相关缺失显示项：咒力、战斗面板、基础肉体、反转术式、术式熔断。
- 2026-05-14T18:29:05.741Z | updated | newvars-innate-ct-pending-only | 新变量 MVU 生得术式待觉醒状态改为只显示待觉醒卡片，其余字段不展示。
- 2026-05-14T18:47:25.745Z | updated | newvars-meltdown-bar-bp-grade-color | 新变量 MVU：术式熔断改为身体状况上方横向栏，并新增 BP 战力等级分级上色。
- 2026-05-14T18:56:23.486Z | updated | newvars-inventory-scroll-and-lunwai-normalize | 新变量 MVU 行囊展开内容增加隐藏滚动条的高度上限；新变量 MVU/BP 显示层统一论外熟练文案。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-14T18:56:23.486Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "修复 releasetest 新变量 MVU 行囊展开高度与“论外熟练”显示。",
  "latestConclusion": "已在 releasetest 新变量 MVU 中为行囊折叠内容设置最大高度，约四行半内容高度，内容少时自然显示，超过后可纵向滚动且隐藏滚动条。已在 releasetest 新变量 MVU 与 BP 新变量面板显示层增加“轮外熟练”到“论外熟练”的防呆归一化：无论获取值为轮外熟练或论外熟练，界面显示均为论外熟练。JS 已通过 node --check；正式版对应模块无本轮差异。",
  "currentBlocker": null,
  "nextAction": "在 releasetest 暗色模式实测行囊展开高度、滚动行为与论外熟练显示是否符合预期。",
  "activeArtifacts": {
    "plan": ".limcode/plans/story-ui-regex-no-display-diagnosis-script-bootstrap-plan.md"
  },
  "todos": [
    {
      "id": "inventory-scroll-1",
      "content": "检查 releasetest 新变量 MVU/BP 中行囊渲染与熟练阶段显示位置",
      "status": "completed"
    },
    {
      "id": "inventory-scroll-2",
      "content": "为新变量 MVU 行囊展开内容设置四行半高度上限、隐藏滚动条滚动",
      "status": "completed"
    },
    {
      "id": "inventory-scroll-3",
      "content": "在新变量 MVU 与 BP 显示层统一将“轮外熟练/论外熟练”显示为“论外熟练”",
      "status": "completed"
    },
    {
      "id": "inventory-scroll-4",
      "content": "验证语法并确认正式版未修改",
      "status": "completed"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
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
    },
    {
      "at": "2026-05-14T18:25:52.503Z",
      "type": "updated",
      "refId": "add-newvars-missing-character-attrs",
      "message": "补全 releasetest 新变量 MVU 的角色相关缺失显示项：咒力、战斗面板、基础肉体、反转术式、术式熔断。"
    },
    {
      "at": "2026-05-14T18:29:05.741Z",
      "type": "updated",
      "refId": "newvars-innate-ct-pending-only",
      "message": "新变量 MVU 生得术式待觉醒状态改为只显示待觉醒卡片，其余字段不展示。"
    },
    {
      "at": "2026-05-14T18:47:25.745Z",
      "type": "updated",
      "refId": "newvars-meltdown-bar-bp-grade-color",
      "message": "新变量 MVU：术式熔断改为身体状况上方横向栏，并新增 BP 战力等级分级上色。"
    },
    {
      "at": "2026-05-14T18:56:23.486Z",
      "type": "updated",
      "refId": "newvars-inventory-scroll-and-lunwai-normalize",
      "message": "新变量 MVU 行囊展开内容增加隐藏滚动条的高度上限；新变量 MVU/BP 显示层统一论外熟练文案。"
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
    "generatedAt": "2026-05-14T18:56:23.486Z",
    "bodyHash": "sha256:a1b35e440db830abdb893ccb456027818d051d0b63fa332702c1b7d0b395cf3e"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
