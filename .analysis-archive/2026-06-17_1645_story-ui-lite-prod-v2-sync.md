<analysis>
  <context>
    <item>public/story_ui_lite_prod/**/* 的 find_files 返回 0 个文件，说明上一轮清空后复制没有形成可见目标内容；不能继续假装同步成功。</item>
    <item>public/story_ui_lite_test 当前可见 22 个文件，用户要求排除 PROJECT.md、STATUS_BAR_PLAN.md、db-status-bar-数据库状态栏重构设计.md 后同步到 prod，因此 prod 目标应有 19 个文件。</item>
    <item>.analysis-cache.md 记录的旧分析只覆盖需求和风险，缺少完整 execution_plan、edge_cases、affected_scope 等字段，需要补齐后继续。</item>
    <item>搜索 public/story_ui_lite_prod 中 story_ui_lite_test、lite_test、精简测试版、lite_test-0.1.2 没有命中，但这是因为 prod 当前为空，不是因为标识已修正。</item>
  </context>
  <needs>
    <item>重新创建 public/story_ui_lite_prod，并从 public/story_ui_lite_test 复制除三个项目文档外的全部内容。</item>
    <item>同步后修改 prod 的 index.js 与 loader.js，使 env、displayEnv、version、managerRootId、资源路径和 fallback 路径符合正式版 v2.0。</item>
    <item>确认 prod 不包含三个被排除项目文档，不残留 test 标识，不加载 story_ui_lite_test 资源。</item>
    <item>运行 node --check、git diff --check、目录对比和高性能模型只读审计，审计通过后归档并提交。</item>
  </needs>
  <key_challenges>
    <item>上一轮 robocopy 结果与 find_files 冲突，必须用 cmd 重新执行复制并立刻验证文件列表。</item>
    <item>同步会扩大 prod 功能面到 test 当前状态，风险来自遗漏路径替换而非复制本身。</item>
    <item>版本号 v2.0 需要同时影响 index.js 与 loader.js，否则缓存破坏和管理面板展示会不一致。</item>
  </key_challenges>
  <confidence>MEDIUM：需求、源目录和失败状态明确；但 prod 目标文件尚未重新生成，具体替换点必须在复制后读取实际文件确认。</confidence>
  <approach>
    <maintainability score="8">直接目录同步后做少量 prod 标识替换，保持 test 与 prod 结构一致，不引入发布脚本这种未被要求的新抽象。</maintainability>
    <robustness score="8">复制后通过残留搜索、文件列表对比、语法检查和独立审计验证发布风险。</robustness>
    <extensibility score="6">本次不设计通用发布流水线；频繁发布时再抽脚本，否则现在抽象只会制造没必要的维护面。</extensibility>
  </approach>
  <edge_cases>
    <item>prod 目录为空：重新创建并复制，复制后必须看到 19 个目标文件。</item>
    <item>被排除文档误入 prod：用文件列表和搜索确认 PROJECT.md、STATUS_BAR_PLAN.md、db-status-bar-数据库状态栏重构设计.md 不存在。</item>
    <item>prod 入口仍指向 story_ui_lite_test：搜索 story_ui_lite_test 和 lite_test，命中即修复。</item>
    <item>JS 替换破坏语法：用 node --check 验证 index.js 与 loader.js。</item>
  </edge_cases>
  <affected_scope>
    <item>public/story_ui_lite_prod/**</item>
    <item>.analysis-cache.md</item>
    <item>.analysis-archive/{timestamp}_story-ui-lite-prod-v2-sync.md</item>
  </affected_scope>
  <execution_plan>
    <step>用 cmd 删除并重建 public/story_ui_lite_prod，再用 robocopy 复制 test 内容并排除三个项目文档。</step>
    <step>列出 prod/test 文件，确认 prod 有 19 个文件且缺失项仅为三个排除文档。</step>
    <step>读取 prod/index.js 与 prod/loader.js 头部和路径相关命中位置，精确替换 prod 标识与 v2.0。</step>
    <step>搜索残留 story_ui_lite_test、lite_test、精简测试版、lite_test-0.1.2，修复所有发布标识残留。</step>
    <step>运行 node --check、git diff --check 和目录对比。</step>
    <step>调用高性能模型只读审计；若有阻塞问题，修复后复审。</step>
    <step>读取缓存输出验收，归档 .analysis-cache.md，stage prod 与归档，commit。</step>
  </execution_plan>
  <degradation_check>
    <item>YES：没有基于空 prod 继续替换；已识别上一轮复制未生效。</item>
    <item>YES：不修改 test 源和无关目录，影响面限定为 prod 同步与分析归档。</item>
    <item>YES：不使用 sed/perl/awk 修改源代码；标识替换将使用标准编辑工具。</item>
    <item>YES：不创建发布脚本；当前任务是一次同步发布，新增抽象会扩大维护面。</item>
  </degradation_check>
</analysis>

---
<decision_point>
  <issue>第二次使用 robocopy 复制后，public/story_ui_lite_prod 仍然在 find_files 中显示为空，且 read_file 无法读取 public/story_ui_lite_prod/index.js 和 loader.js。</issue>
  <impact>不能进入 prod 标识替换、语法检查或提交；如果不修复复制路径，发布目录会是空目录，正式版直接不可用。</impact>
  <context_update>
    <item>execute_command 返回 exitCode=0，但 output 为空，说明命令包装层没有暴露 robocopy 详情；这不是同步成功的证据。</item>
    <item>WORKSPACE FILES 快照中 public/story_ui_lite_prod 未列出，进一步支持 prod 目录未生成可见内容。</item>
    <item>public/story_ui_lite_test 文件列表正常，源目录存在，问题集中在删除/创建/复制命令或目标路径可见性。</item>
  </context_update>
  <options>
    <option_a>
      <description>继续使用 robocopy，但先用 cmd dir、echo %CD%、if exist 分别验证当前目录、源目录、目标目录和 robocopy 输出，再根据实际错误修正命令。</description>
      <approach_evaluation>可维护性 8：仍使用 Windows 标准复制工具；健壮性 9：先定位环境和命令结果，避免盲目重试；可扩展性 6：不引入脚本，仅修复当前发布操作。</approach_evaluation>
      <edge_cases>可捕获 cwd 不正确、目标目录创建失败、robocopy 被排除规则影响、工具输出被截断或编码导致误判。</edge_cases>
      <affected_scope_delta>不修改源代码；只读取文件系统状态。</affected_scope_delta>
    </option_a>
    <option_b>
      <description>改用专用工具 create_directory 与逐文件 read_file/write_file 复制 19 个文件。</description>
      <approach_evaluation>可维护性 5：手动复制大量文件容易漏文件；健壮性 6：可绕开 shell，但二进制或大文件处理风险更高；可扩展性 4：后续同步不可复用。</approach_evaluation>
      <edge_cases>文件较多、嵌套目录较多，逐文件写入可能引入编码、换行和遗漏风险。</edge_cases>
      <affected_scope_delta>会直接创建 public/story_ui_lite_prod/**，但操作繁琐且错误面扩大。</affected_scope_delta>
    </option_b>
    <option_c>
      <description>使用 xcopy 或 cmd for 循环复制源目录，并手动删除三个排除文档。</description>
      <approach_evaluation>可维护性 6：命令简单但排除控制较弱；健壮性 6：能绕过 robocopy 异常但仍属于未定位根因的替代；可扩展性 5：可完成当前任务但证据链不如先诊断。</approach_evaluation>
      <edge_cases>xcopy 对目录、隐藏文件、非 ASCII 文件名和已存在目标提示处理更容易出错。</edge_cases>
      <affected_scope_delta>会修改 public/story_ui_lite_prod/**，仍需后续对比确认。</affected_scope_delta>
    </option_c>
  </options>
  <recommendation>选择 option_a。它在三维评估中综合最优，因为当前不是“需要换复制工具”，而是“复制命令返回成功但无产物”的环境事实冲突。先诊断 cwd、路径和命令输出，才能避免继续对错误前提施工。</recommendation>
  <execution_plan_update>
    <step>读取 .analysis-cache.md 刷新当前计划。</step>
    <step>用单行 cmd 执行 cd、dir public、dir public\story_ui_lite_test、if exist public\story_ui_lite_prod，并直接运行 robocopy 预演输出诊断。</step>
    <step>若确认 robocopy 因命令格式或环境问题未复制，修正命令后复制；若确认工具可见性问题，改用文件系统命令进一步核对。</step>
  </execution_plan_update>
  <deviation_audit>
    <item>YES：没有在复制失败后进入版本号替换。</item>
    <item>YES：没有用 shell 修改源代码；当前 shell 仅用于文件系统诊断和目录复制。</item>
    <item>YES：没有扩大影响到 public/story_ui_lite_test 或其他目录。</item>
    <item>YES：已在连续复制异常后停止盲目重试并形成决策点。</item>
  </deviation_audit>
</decision_point>

---
<output_quality_review>
  <task_summary>已将 public/story_ui_lite_test 除 PROJECT.md、STATUS_BAR_PLAN.md、db-status-bar-数据库状态栏重构设计.md 外的 19 个文件同步到 public/story_ui_lite_prod，并将正式版入口标识调整为 lite_prod / lite / v2.0。</task_summary>
  <deliverables>
    <item>public/story_ui_lite_prod 现在包含 19 个目标文件，包含 diagnose-bp.js、preview.html、preview-db-status.html、modules/db-status-bar/** 等测试版新增内容。</item>
    <item>public/story_ui_lite_prod/index.js:3-13 使用 env='lite_prod'、displayEnv='lite'、version='v2.0'、story_ui_lite_prod 路径与 jjks-story-ui-manager-lite_prod。</item>
    <item>public/story_ui_lite_prod/loader.js:18-27 fallback 指向 /story_ui_lite_prod/loader.js，state.version='v2.0'。</item>
    <item>测试/旧版本残留搜索为 0，排除文档未进入 prod，探针目录 public/story_ui_lite_prod_probe 已确认不存在。</item>
  </deliverables>
  <metrics>
    <total_files_modified>public/story_ui_lite_prod 下 15 个文件处于修改或新增状态；另需新增 1 个本次归档文件。</total_files_modified>
    <execution_plan_coverage>7/7：清空复制、文件数验证、标识替换、残留搜索、node --check、git diff --check、目录对比、高性能只读审计均已完成。</execution_plan_coverage>
    <edge_cases_handled>prod 目录为空已修复；排除文档误入已验证不存在；prod 指向 test 资源已通过残留搜索排除；JS 语法已通过 node --check。</edge_cases_handled>
    <confidence_assessment>HIGH：本地检查通过，目录对比 sourceExpected=19/prod=19/missing=[]/extra=[]，高性能模型审计无 blocking_findings。</confidence_assessment>
  </metrics>
  <substance_check>产物不是只改版本号的表面同步；prod 目录内容已经按用户要求从 test 重建，并修正入口、loader、资源清理路径与预览标识。若实际发布加载 prod 路径，当前实现不会回落到 story_ui_lite_test。</substance_check>
  <completeness_check>未跳过 affected_scope 中的 public/story_ui_lite_prod/**；.analysis-cache.md 已准备归档；核心业务逻辑通过语法检查、残留搜索、目录对比和独立审计验证。</completeness_check>
  <value_density_check>高价值内容为目录同步、发布标识修正、残留搜索、语法检查、目录对比和提交范围控制；低价值内容仅为诊断 cmd 过程，且已通过 decision_point 记录根因，未污染产物。</value_density_check>
  <alignment_check>满足用户“同步测试版到正式版、版本号 v2.0、审计无误后提交”的本质需求。若这是别人交给我的，我会接受，但前提是提交必须精确 stage，不能把当前工作区大量无关改动一并提交。</alignment_check>
</output_quality_review>
