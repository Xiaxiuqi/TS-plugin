# 项目进度
- Project: tavern_helper_template
- Updated At: 2026-05-14T20:48:01.066Z
- Status: active
- Phase: implementation

## 当前摘要

<!-- LIMCODE_PROGRESS_SUMMARY_START -->
- 当前进度：尚无里程碑记录
- 当前焦点：releasetest 共存挂载改造完成，等待用户实测 displayed DOM 锚点效果
- 最新结论：public/story_regex_ui_releasetest/index.js 已改为基于现有模块 block/singleTag 匹配结果，在原生渲染后的 displayed DOM 中按模块锚点插入 after-native mount；未修改正式版文件和模块匹配规则；node --check 通过。
- 下一步：请在酒馆中启用 releasetest 后实测所有模块的原生共存挂载位置，尤其观察各模块是否插入到期望锚点后。
<!-- LIMCODE_PROGRESS_SUMMARY_END -->

## 关联文档

<!-- LIMCODE_PROGRESS_ARTIFACTS_START -->
- 计划：`.limcode/plans/releasetest-共存挂载改造计划.plan.md`
<!-- LIMCODE_PROGRESS_ARTIFACTS_END -->

## 当前 TODO 快照

<!-- LIMCODE_PROGRESS_TODOS_START -->
- [x] 对比 releasetest 正式入口与共存候选的差异，识别仅属于挂载策略的变更点  `#releasetest-coexist-1`
- [x] 设计并确认 releasetest 的仅共存挂载流程，冻结所有模块匹配模式不变  `#releasetest-coexist-2`
- [x] 实现 releasetest 的共存挂载改造，删除 script/native/off 切换并保留 after-native 插入  `#releasetest-coexist-3`
- [x] 回归 BP、story-engine、world-log 等关键模块并完成语法/行为验证  `#releasetest-coexist-4`
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
- 2026-05-14T17:24:13.953Z | updated | manager-mobile-mask-fix | 非正式版 manager-ui 修复：移除可见遮罩/模糊，保留透明全屏外部点击关闭层，并用 100dvh 修正手机窄屏视口高度；prod 未修改。
- 2026-05-14T17:34:52.449Z | updated | sync-releasetest-to-prod-manager-mobile-fix | 将当前 releasetest 同步到 prod，并恢复正式版环境配置与 v1.2 版本；同步内容包括 manager-ui 手机窄屏透明点击层/100dvh 修复。
- 2026-05-14T17:47:24.951Z | updated | fix-mvu-newvars-status-inline-update | 修复新变量 MVU 状态栏：改用 getAllVariables 最新数据进行 populateData 局部刷新，并解除 206px 固定高度裁切。
- 2026-05-14T18:09:08.731Z | updated | fix-releasetest-newvars-mvu-helper-api-read | 按酒馆助手接口修正 releasetest 新变量 MVU：优先 Mvu.getMvuData({type:'chat'}) 读取当前变量，恢复左卡固定高度与右侧隐藏滚动条滚动。
- 2026-05-14T18:25:52.503Z | updated | add-newvars-missing-character-attrs | 补全 releasetest 新变量 MVU 的角色相关缺失显示项：咒力、战斗面板、基础肉体、反转术式、术式熔断。
- 2026-05-14T18:29:05.741Z | updated | newvars-innate-ct-pending-only | 新变量 MVU 生得术式待觉醒状态改为只显示待觉醒卡片，其余字段不展示。
- 2026-05-14T18:47:25.745Z | updated | newvars-meltdown-bar-bp-grade-color | 新变量 MVU：术式熔断改为身体状况上方横向栏，并新增 BP 战力等级分级上色。
- 2026-05-14T18:56:23.486Z | updated | newvars-inventory-scroll-and-lunwai-normalize | 新变量 MVU 行囊展开内容增加隐藏滚动条的高度上限；新变量 MVU/BP 显示层统一论外熟练文案。
- 2026-05-14T19:19:18.604Z | updated | newvars-mvu-meltdown-inventory-rarity-pills | 新变量 MVU：熔断文案改为“熔断：否/是”，行囊高度增大 1.5 倍，战技/术式熟练等级补 BP 风格胶囊上色。
- 2026-05-14T19:28:53.775Z | updated | newvars-meltdown-state-pill-sync-prod | 术式熔断状态改为“熔断 : 否/是”独立状态胶囊，并按用户要求同步到正式版。
- 2026-05-14T19:30:54.132Z | updated | newvars-meltdown-nospace-sync-prod | 术式熔断状态文案改为“熔断:否/是”，并同步正式版。
- 2026-05-14T20:03:59.686Z | updated | after-native-candidate-no-prod-change | 新建 releasetest 共存候选入口 index.after-native-candidate.js：迁移测试版 after-native/共存增强模式，保留 releasetest 当前模块清单与 BP 兼容标签；prod 未修改，releasetest 现有文件未覆盖。
- 2026-05-14T20:21:52.421Z | artifact_changed | plan | 同步计划文档：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:25:14.090Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:34:22.993Z | artifact_changed | plan | 同步计划文档：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:35:14.568Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:36:18.325Z | artifact_changed | plan | 同步计划文档：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:47:15.798Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:47:50.358Z | artifact_changed | plan | 同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md
- 2026-05-14T20:48:01.066Z | milestone_recorded | 完成 releasetest 仅共存挂载实现：核心按模块现有匹配识别所有模块，并在原生 displayed DOM 锚点后插入 after-native 增强节点。
<!-- LIMCODE_PROGRESS_LOG_END -->

<!-- LIMCODE_PROGRESS_METADATA_START -->
{
  "formatVersion": 1,
  "kind": "limcode.progress",
  "projectId": "tavern-helper-template",
  "projectName": "tavern_helper_template",
  "createdAt": "2026-05-12T11:57:09.622Z",
  "updatedAt": "2026-05-14T20:48:01.066Z",
  "status": "active",
  "phase": "implementation",
  "currentFocus": "releasetest 共存挂载改造完成，等待用户实测 displayed DOM 锚点效果",
  "latestConclusion": "public/story_regex_ui_releasetest/index.js 已改为基于现有模块 block/singleTag 匹配结果，在原生渲染后的 displayed DOM 中按模块锚点插入 after-native mount；未修改正式版文件和模块匹配规则；node --check 通过。",
  "currentBlocker": null,
  "nextAction": "请在酒馆中启用 releasetest 后实测所有模块的原生共存挂载位置，尤其观察各模块是否插入到期望锚点后。",
  "activeArtifacts": {
    "plan": ".limcode/plans/releasetest-共存挂载改造计划.plan.md"
  },
  "todos": [
    {
      "id": "releasetest-coexist-1",
      "content": "对比 releasetest 正式入口与共存候选的差异，识别仅属于挂载策略的变更点",
      "status": "completed"
    },
    {
      "id": "releasetest-coexist-2",
      "content": "设计并确认 releasetest 的仅共存挂载流程，冻结所有模块匹配模式不变",
      "status": "completed"
    },
    {
      "id": "releasetest-coexist-3",
      "content": "实现 releasetest 的共存挂载改造，删除 script/native/off 切换并保留 after-native 插入",
      "status": "completed"
    },
    {
      "id": "releasetest-coexist-4",
      "content": "回归 BP、story-engine、world-log 等关键模块并完成语法/行为验证",
      "status": "completed"
    }
  ],
  "milestones": [],
  "risks": [],
  "log": [
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
    },
    {
      "at": "2026-05-14T19:19:18.604Z",
      "type": "updated",
      "refId": "newvars-mvu-meltdown-inventory-rarity-pills",
      "message": "新变量 MVU：熔断文案改为“熔断：否/是”，行囊高度增大 1.5 倍，战技/术式熟练等级补 BP 风格胶囊上色。"
    },
    {
      "at": "2026-05-14T19:28:53.775Z",
      "type": "updated",
      "refId": "newvars-meltdown-state-pill-sync-prod",
      "message": "术式熔断状态改为“熔断 : 否/是”独立状态胶囊，并按用户要求同步到正式版。"
    },
    {
      "at": "2026-05-14T19:30:54.132Z",
      "type": "updated",
      "refId": "newvars-meltdown-nospace-sync-prod",
      "message": "术式熔断状态文案改为“熔断:否/是”，并同步正式版。"
    },
    {
      "at": "2026-05-14T20:03:59.686Z",
      "type": "updated",
      "refId": "after-native-candidate-no-prod-change",
      "message": "新建 releasetest 共存候选入口 index.after-native-candidate.js：迁移测试版 after-native/共存增强模式，保留 releasetest 当前模块清单与 BP 兼容标签；prod 未修改，releasetest 现有文件未覆盖。"
    },
    {
      "at": "2026-05-14T20:21:52.421Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:25:14.090Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:34:22.993Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:35:14.568Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:36:18.325Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划文档：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:47:15.798Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:47:50.358Z",
      "type": "artifact_changed",
      "refId": "plan",
      "message": "同步计划 TODO 快照：.limcode/plans/releasetest-共存挂载改造计划.plan.md"
    },
    {
      "at": "2026-05-14T20:48:01.066Z",
      "type": "milestone_recorded",
      "message": "完成 releasetest 仅共存挂载实现：核心按模块现有匹配识别所有模块，并在原生 displayed DOM 锚点后插入 after-native 增强节点。"
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
    "generatedAt": "2026-05-14T20:48:01.066Z",
    "bodyHash": "sha256:560ee59195149047d174e56c2183ae656ec7029723a35c14b046d35e3f91210f"
  }
}
<!-- LIMCODE_PROGRESS_METADATA_END -->
