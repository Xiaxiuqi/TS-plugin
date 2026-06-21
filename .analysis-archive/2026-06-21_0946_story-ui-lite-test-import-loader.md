<analysis>
  <context>测试版入口 public/story_ui_lite_test/index.js:121-136 的 detectBaseUrl 在 currentScript 与 document.scripts 都无法识别 index.js 时回退 CONFIG.localBasePath；玩家 import 脚本场景会因此拼到 127.0.0.1 本地扩展目录。public/story_ui_lite_test/index.js:311-370 的 ensureLoader 在 loader 失败时不移除 script 标签，后续会被 existed 分支误判为“StoryRegexUI 未就绪”。搜索确认 public/story_ui_lite_test/index.js 中 localBasePath 仅在 CONFIG 与 detectBaseUrl fallback 使用。</context>
  <needs>只修改测试版；禁止 import 场景回退本地路径；失败 loader 标签必须清理；PROJECT.md 与 STATUS_BAR_PLAN.md 记录变更；完成语法、diff、残留和范围检查。</needs>
  <confidence>HIGH：已读取并搜索 test 入口关键代码，根因路径明确。</confidence>
  <affected_scope>public/story_ui_lite_test/index.js；public/story_ui_lite_test/PROJECT.md；public/story_ui_lite_test/STATUS_BAR_PLAN.md</affected_scope>
  <execution_plan>1 修改 test index 删除 localBasePath fallback，默认 publicBaseUrl。2 清理失败或超时残留 loader 标签。3 更新测试版文档。4 运行 node --check、git diff --check、localBasePath 搜索、git diff --name-only。5 调用高性能模型验收。</execution_plan>
</analysis>
---
<decision_point>
  <issue>用户明确要求先修改测试版文件，不要动正式版。</issue>
  <recommendation>只执行测试版 option_a：修 detectBaseUrl 默认策略并清理失败 loader 标签。</recommendation>
  <degradation_check>不修改正式版；不只修表面报错；不引入依赖或异步探测。</degradation_check>
</decision_point>

---
<decision_point>
  <issue>高性能模型验收返回 needs_changes：detectBaseUrl 对 currentScript.src 信任过宽，PROJECT.md 残留 localBasePath 过期说明。</issue>
  <recommendation>只在 public/story_ui_lite_test/** 内修复：currentScript.src 必须匹配 /story_ui_lite_test/index.js 才能用于推导 baseUrl；PROJECT.md 删除 localBasePath 配置说明并改为 publicBaseUrl fallback 说明。</recommendation>
  <degradation_check>不修改正式版；不忽略验收发现的边界漏洞；不引入异步探测或第三方依赖。</degradation_check>
</decision_point>

---
<output_quality_review>
  <task_summary>按用户要求仅修改测试版文件，修复 import 入口无法识别自身来源时错误回退本地扩展目录的问题，并清理 loader 失败残留标签。</task_summary>
  <deliverables>public/story_ui_lite_test/index.js 删除 localBasePath 配置并收紧 detectBaseUrl 自身入口识别，PROJECT.md 与 STATUS_BAR_PLAN.md 已记录加载策略修复。</deliverables>
  <metrics>total_files_modified=3；execution_plan_coverage=全部完成；edge_cases_handled=currentScript 缺失、currentScript 非自身入口、document.scripts 命中自身入口、loader 404、残留 loader 未就绪；confidence_assessment=HIGH。</metrics>
  <substance_check>实现直接命中根因：import 入口不能走本地 fallback，不是只改报错文案，也不是要求玩家补本地文件。</substance_check>
  <completeness_check>测试版 scoped diff 仅 PROJECT.md、STATUS_BAR_PLAN.md、index.js；工作区既有 public/story_ui_lite_prod/preview*.html diff 必须在提交时隔离。</completeness_check>
  <value_density_check>高价值内容为运行时代码修复与文档约束；未引入第三方依赖、异步探测状态机或无关重构。</value_density_check>
  <alignment_check>满足用户本质需求。如果这是别人交给我的，我会接受，但要求提交时只 stage 测试版三文件。</alignment_check>
</output_quality_review>
