<analysis>
  <context>
    <item>正式版入口 public/story_ui_lite_prod/index.js:2-14 仍保留 CONFIG.localBasePath，值为 /scripts/extensions/third-party/tavern_helper_template/story_ui_lite_prod/。</item>
    <item>正式版 detectBaseUrl 位于 public/story_ui_lite_prod/index.js:121-136，当前逻辑对 currentScript?.src 只要能 normalize 就直接信任；document.scripts 分支匹配 /story_ui_lite_prod/index.js；两者失败后回退 CONFIG.localBasePath，再 fallback CONFIG.publicBaseUrl。</item>
    <item>正式版 ensureLoader 位于 public/story_ui_lite_prod/index.js:311-370，existed 分支 8 秒未就绪时不移除残留 script，script.onerror 也不移除失败 script。</item>
    <item>测试版已提交实现位于 public/story_ui_lite_test/index.js:120-137：新增 isOwnIndexScript，只信任包含 /story_ui_lite_test/index.js 的 currentScript 或 document.scripts，无法确认自身来源时返回 CONFIG.publicBaseUrl。</item>
    <item>当前工作区 public/story_ui_lite_prod/preview-db-status.html 与 public/story_ui_lite_prod/preview.html 处于删除态污染；它们不是本轮同步目标，commit 时必须隔离。</item>
  </context>
  <needs>同步测试版已验收的 import loader publicBaseUrl 回退策略到正式版；清理失败/残留 loader script；不提交 preview 删除态污染。</needs>
  <confidence>HIGH：已读取正式版与测试版对应代码范围，测试版实现已通过上一轮验收和 commit。</confidence>
  <affected_scope>public/story_ui_lite_prod/index.js；.analysis-cache.md；.analysis-archive/{timestamp}_story-ui-lite-prod-import-loader.md</affected_scope>
  <execution_plan>1 写入缓存。2 修改 prod index 删除 localBasePath、增加 isOwnIndexScript、默认 publicBaseUrl。3 清理 failed/existed loader script。4 node --check、git diff --check、localBasePath 搜索、范围检查。5 高性能模型验收。6 归档缓存。7 精确 stage 并 commit。</execution_plan>
</analysis>

---
<decision_point>
  <issue>用户新增正式版版本展示要求：管理界面标题需要显示 `Jujutsu Kaisen Frontend · lite · v2.1`。</issue>
  <recommendation>同步更新正式版入口版本到 v2.1，并将版本传入 manager-ui 标题渲染；同步 loader.js state.version，避免 UI 版本与资源缓存版本不一致。</recommendation>
  <degradation_check>不只改显示文案；不提交 preview 删除态污染；不修改测试版或无关模块。</degradation_check>
</decision_point>

---
<decision_point>
  <issue>用户明确确认 public/story_ui_lite_prod/preview-db-status.html 与 public/story_ui_lite_prod/preview.html 的删除态是预期同步内容，仓库也需要删除。</issue>
  <recommendation>将两个 preview 删除态纳入本轮正式版同步 commit，同时继续精确 stage，避免混入其他未跟踪文件或无关目录。</recommendation>
  <degradation_check>不再把 preview 删除态误判为污染；不使用 git add .；不混入测试版、dist、src 或历史未跟踪归档。</degradation_check>
</decision_point>

---
<output_quality_review>
  <task_summary>同步正式版 import loader publicBaseUrl fallback 修复，提升正式版版本链路到 v2.1，并按用户确认删除正式版 preview 页面。</task_summary>
  <deliverables>public/story_ui_lite_prod/index.js 删除 localBasePath、收紧自身入口识别、默认 publicBaseUrl、清理失败/残留 loader script，并将 CONFIG.version 提升到 v2.1；public/story_ui_lite_prod/loader.js state.version 提升到 v2.1；public/story_ui_lite_prod/modules/manager-ui/index.js 标题显示 displayEnv 与 version；public/story_ui_lite_prod/preview-db-status.html 与 preview.html 删除。</deliverables>
  <metrics>execution_plan_coverage=全部完成；node_check=通过；git_diff_check=通过；localBasePath_residual=0；v2.0_residual=0；independent_review=高性能模型第二轮 accepted。</metrics>
  <substance_check>实现命中根因和新增版本展示要求：正式版 import 入口无法识别自身来源时不再走本地 fallback，管理界面显示 Jujutsu Kaisen Frontend · lite · v2.1。</substance_check>
  <completeness_check>本轮正式版目标 diff 包含 3 个 JS 修改和 2 个 preview 删除；用户已明确 preview 删除需要同步到仓库。</completeness_check>
  <value_density_check>未引入第三方依赖、无关重构或额外配置层；改动集中在正式版入口加载、版本显示和用户确认的文件删除。</value_density_check>
  <alignment_check>满足用户“进行正式版同步和 commit”以及“preview 仓库也得删除”的明确要求。如果这是别人交给我的，我会接受，但提交前仍必须精确检查 cached 列表。</alignment_check>
</output_quality_review>
