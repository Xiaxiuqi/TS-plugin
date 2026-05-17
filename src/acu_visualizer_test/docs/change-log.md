# ACU Visualizer 测试版变更记录

本文件用于记录 `public/acu_visualizer_test/` 下测试版模块化重构的每次修改。

## 记录规则

每次修改后必须同步记录以下信息：

- 修改日期或阶段。
- 修改范围。
- 是否触碰原插件运行文件。
- 是否触碰 CSS。
- 功能风险评估。
- CSS 风险评估。
- 回滚方式。
- 同步的项目文档。

## 安全原则

1. 默认不修改原插件运行文件：
   - `public/acu_visualizer/acu_visualizer.js`
   - `public/acu_visualizer/acu_visualizer-test.js`
2. 测试版目录中的修改必须先文档化，再逐步迁移。
3. CSS 拆分必须先复制、对照、验证，不允许直接替换原 CSS 注入逻辑。
4. 功能模块迁移必须保持输入输出、localStorage key、数据库 API 调用兼容。
5. 每次修改都必须同步至少一个项目文档。

## 变更记录

### 2026-05-18：整体迁移到 src 并改为现有 pnpm build 单文件产物

- 按现有项目构建标准处理，不再使用自定义 webpack 配置。
- 删除自定义 `webpack.acu-test.config.cjs`。
- 删除 `package.json` 中临时新增的 `build:acu-test` 脚本，保留原生 `pnpm build`。
- 新增通用单入口构建脚本 `build:entry`，仍使用既有 `webpack.config.ts`，通过 `--env entry=...` 选择目标入口，例如：`pnpm build:entry --env entry=src/acu_visualizer_test/index.js`。
- 将测试版源码整体迁移到：
  - `src/acu_visualizer_test/core/`
  - `src/acu_visualizer_test/modules/`
  - `src/acu_visualizer_test/styles/`
  - `src/acu_visualizer_test/docs/`
  - `src/acu_visualizer_test/main.js`
  - `src/acu_visualizer_test/index.js`
- 清理 `public/acu_visualizer_test/`，该目录现在只保留发布产物：
  - `public/acu_visualizer_test/index.js`
  - `public/acu_visualizer_test/index.js.map`
- 使用现有命令 `pnpm build` 构建，由既有 webpack 配置扫描 `src/acu_visualizer_test/index.js`。
- 如只需构建测试版表格，可使用 `pnpm build:entry --env entry=src/acu_visualizer_test/index.js`，避免同时重新生成浮岛等其他入口产物。
- 构建输出：
  - `dist/acu_visualizer_test/index.js`
  - `dist/acu_visualizer_test/index.js.map`
- 已将 dist 产物同步到 public 发布目录。
- 当前推荐酒馆助手加载方式：

  ```js
  import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js'
  ```

- 不再推荐加载：
  - `acu_visualizer_test/main.js`
  - `acu_visualizer_test/loader.js`
  - `acu_visualizer_test/version.js`
- 是否触碰原插件运行文件：否。
- 是否夹带内存优化：否。
- 是否修改现有 webpack 标准：否，使用既有 `pnpm build`。

### 2026-05-17：新增测试版稳定 loader 入口

> 历史记录：该方案已在 2026-05-18 的单文件构建迁移中废弃，不再作为推荐加载方式。

- 新增 `public/acu_visualizer_test/version.js`，集中保存测试版入口版本号。
- 新增 `public/acu_visualizer_test/loader.js`，当时曾用于稳定加载：

  ```js
  import 'https://ts-plugin.pages.dev/acu_visualizer_test/loader.js'
  ```

- loader 行为：
  - 先调用 `window.ACUVisualizerTest?.destroy?.()` 清理旧实例。
  - 读取 `ACU_VISUALIZER_TEST_VERSION`。
  - 使用 `main.js?v=<version>` 导入主入口，避免裸 `main.js` URL 命中浏览器 ESM 模块缓存导致旧入口不重新执行。
  - 挂载 `window.ACUVisualizerTestLoader` 记录版本、main URL 与加载时间。
- 当前版本号：`20260517-css-loader`。
- 缓存说明：loader 使用固定版本号，不使用 `Date.now()`；只有版本号变化时才会新增一个 main.js 模块实例。旧实例会先 destroy，避免 DOM/事件/观察器继续残留。相比每次 `Date.now()`，这种方式缓存增长可控。
- 验证结果：loader import smoke 通过，输出包含 `loader:"20260517-css-loader"`。
- 是否触碰原插件运行文件：否。
- 是否夹带内存优化：否。
- 当前状态：已废弃；请使用 `import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js'`。

### 2026-05-17：测试版 CSS 完整迁移

- 修改范围：
  - 从 `public/acu_visualizer/acu_visualizer-test.js` 的 `injectSearchStyles()` 提取搜索样式到 `src/acu_visualizer_test/styles/search.css`。
  - 从 `public/acu_visualizer/acu_visualizer-test.js` 的 `addStyles()` 提取主样式到 `src/acu_visualizer_test/styles/table.css`。
  - 保留 `theme.css`、`animations.css`、`dialogs.css`、`shortcut-dialog.css` 为拆分占位文件，不放置额外规则，避免改变原版样式行为。
  - 修改 `src/acu_visualizer_test/main.js`，改用 `fetch + <style id="acu-visualizer-test-style-loader">` 注入 CSS，避免跨域 stylesheet `cssRules` 报错。
  - 新增 `src/acu_visualizer_test/docs/migration-records-css.md`。
- 是否触碰原插件运行文件：否。
- 是否触碰原插件 CSS 注入逻辑：否。
- 是否夹带内存优化：否。
- CSS 一致性验证：
  - `styles/search.css` 与原 `injectSearchStyles()` 内容逐字节一致。
  - `styles/table.css` 与原 `addStyles()` 中 `<style>` 内部内容逐字节一致。
- 校验摘要：
  - `searchHash`: `8f58f686c11aa16ee7f4fe9b0b6c2a49c3c4f2483d824f9e65b0089fb8cfdff8`
  - `tableHash`: `61d8b827eeea0595ef592ec3d9a9c9c380d623914f65bc95122058bae5d5e986`
  - `searchLength`: `2374`
  - `tableLength`: `103924`
- 入口验证：`main.js` import smoke 通过，输出 `{"ok":true,"hasACU":true,"version":"modular-test-migration","hasDeps":true}`。
- 原插件影响确认：`git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode` 未显示 `public/acu_visualizer/` 变更。
- 当前状态：CSS 迁移完成，但浏览器视觉仍需按测试清单回归确认。
- 回滚方式：恢复测试版 styles 文件为占位版本，恢复 `main.js` 的 CSS 加载逻辑，并删除/回退本迁移记录。

### 2026-05-17：第六阶段渲染、数据库同步与生命周期模块迁移

- 修改范围：
  - 迁移 `src/acu_visualizer_test/modules/table-renderer.js`。
  - 迁移 `src/acu_visualizer_test/modules/database-sync.js`。
  - 新增 `src/acu_visualizer_test/core/lifecycle.js`。
  - 新增 `src/acu_visualizer_test/core/scheduler.js`。
  - 迁移 `src/acu_visualizer_test/main.js`。
  - 新增 `src/acu_visualizer_test/docs/migration-records-phase-6-render-sync-lifecycle.md`。
  - 更新 `src/acu_visualizer_test/docs/module-migration-matrix.md` 中第六阶段模块状态为“迁移完成”。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：高。本次迁移涉及表格整体渲染、数据库保存、初始化生命周期、数据库更新回调、AI 消息观察与测试版入口，但仅在测试版模块中迁移，未接入正式运行脚本。
- CSS 风险评估：中。模块使用原表格、标签、搜索、按钮、编辑等 class，但未修改 CSS 文件或样式注入逻辑。
- 是否夹带内存优化：否。
- 验证结果：已通过临时 Node 脚本动态 import 和基础行为验证，输出 `{"renderer":true,"dbsync":true,"lifecycle":true,"scheduler":true}`。
- 原插件影响确认：`git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode` 未显示 `public/acu_visualizer/` 变更。
- 当前状态：迁移完成，但尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。
- 回滚方式：恢复 `table-renderer.js`、`database-sync.js`、`main.js` 到占位版本，删除 `core/lifecycle.js`、`core/scheduler.js` 和本次迁移记录，并回退迁移矩阵状态。
- 同步的项目文档：
  - `src/acu_visualizer_test/docs/migration-records-phase-6-render-sync-lifecycle.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：第五阶段交互排序与搜索模块迁移

- 修改范围：
  - 迁移 `src/acu_visualizer_test/modules/row-sort.js`。
  - 迁移 `src/acu_visualizer_test/modules/table-sort.js`。
  - 迁移 `src/acu_visualizer_test/modules/search.js`。
  - 新增 `src/acu_visualizer_test/docs/migration-records-phase-5-sort-search.md`。
  - 更新 `src/acu_visualizer_test/docs/module-migration-matrix.md` 中第五阶段模块状态为“迁移完成”。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：高。本次迁移涉及行拖拽、表格标签拖拽、搜索过滤、搜索高亮和分页联动，但仅在测试版模块中迁移，未接入正式运行脚本。
- CSS 风险评估：中。模块使用原 class、data 属性和 mark 高亮结构，但未修改 CSS 文件或样式注入逻辑。
- 是否夹带内存优化：否。
- 验证结果：已通过临时 Node 脚本动态 import 和基础行为验证，输出 `{"row":true,"table":true,"search":true}`。
- 原插件影响确认：`git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode` 未显示 `public/acu_visualizer/` 变更。
- 当前状态：迁移完成，但尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。
- 回滚方式：恢复 `row-sort.js`、`table-sort.js`、`search.js` 到占位版本，删除本次迁移记录，并回退迁移矩阵状态。
- 同步的项目文档：
  - `src/acu_visualizer_test/docs/migration-records-phase-5-sort-search.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：第四阶段弹窗与编辑模块迁移

- 修改范围：
  - 迁移 `src/acu_visualizer_test/modules/settings-dialog.js`。
  - 迁移 `src/acu_visualizer_test/modules/shortcut-dialog.js`。
  - 迁移 `src/acu_visualizer_test/modules/cell-history.js`。
  - 迁移 `src/acu_visualizer_test/modules/cell-editor.js`。
  - 新增 `src/acu_visualizer_test/docs/migration-records-phase-4-dialog-editor.md`。
  - 更新 `src/acu_visualizer_test/docs/module-migration-matrix.md` 中第四阶段模块状态为“迁移完成”。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：高。本次迁移涉及设置弹窗、快捷弹窗、历史恢复、单元格编辑、插入/删除/恢复行和保存调用，但仅在测试版模块中迁移，未接入正式运行脚本。
- CSS 风险评估：中。模块使用原 class/id 和 HTML 结构，但未修改 CSS 文件或样式注入逻辑。
- 是否夹带内存优化：否。
- 验证结果：已通过临时 Node 脚本动态 import 和基础行为验证，输出 `{"history":true,"settings":true,"shortcut":true,"editor":true}`。
- 原插件影响确认：`git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode` 未显示 `public/acu_visualizer/` 变更。
- 当前状态：迁移完成，但尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。
- 回滚方式：恢复 `settings-dialog.js`、`shortcut-dialog.js`、`cell-history.js`、`cell-editor.js` 到占位版本，删除本次迁移记录，并回退迁移矩阵状态。
- 同步的项目文档：
  - `src/acu_visualizer_test/docs/migration-records-phase-4-dialog-editor.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：第三阶段低 UI 风险模块迁移

- 修改范围：
  - 迁移 `src/acu_visualizer_test/modules/notifications.js`。
  - 迁移 `src/acu_visualizer_test/modules/theme.js`。
  - 迁移 `src/acu_visualizer_test/modules/pagination.js`。
  - 迁移 `src/acu_visualizer_test/modules/tabs.js`。
  - 新增 `src/acu_visualizer_test/docs/migration-records-phase-3-ui-low-risk.md`。
  - 更新 `src/acu_visualizer_test/docs/module-migration-matrix.md` 中第三阶段模块状态为“迁移完成”。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：中。本次迁移涉及 UI class、通知、主题、分页和标签切换，但仅在测试版模块中迁移，未接入正式运行脚本。
- CSS 风险评估：低。模块使用原 class 名和 HTML 结构，但未修改 CSS 文件或样式注入逻辑。
- 是否夹带内存优化：否。
- 验证结果：已通过临时 Node 脚本动态 import 和基础行为验证，输出 `{"notification":true,"night":true,"theme":"复古羊皮","pageHas":true,"tabHas":true}`。
- 原插件影响确认：`git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode` 未显示 `public/acu_visualizer/` 变更。
- 当前状态：迁移完成，但尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。
- 回滚方式：恢复 `notifications.js`、`theme.js`、`pagination.js`、`tabs.js` 到占位版本，删除本次迁移记录，并回退迁移矩阵状态。
- 同步的项目文档：
  - `src/acu_visualizer_test/docs/migration-records-phase-3-ui-low-risk.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：第二阶段数据与差异模块迁移

- 修改范围：
  - 迁移 `src/acu_visualizer_test/core/storage.js`。
  - 迁移 `src/acu_visualizer_test/modules/table-data.js`。
  - 迁移 `src/acu_visualizer_test/modules/diff-highlighting.js`。
  - 新增 `src/acu_visualizer_test/docs/migration-records-phase-2-data.md`。
  - 更新 `src/acu_visualizer_test/docs/module-migration-matrix.md` 中第二阶段模块状态为“迁移完成”。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：中。本次迁移涉及 localStorage、表格数据读取、diff key 生成与标签状态，但仅在测试版模块中迁移，未接入正式运行脚本。
- CSS 风险评估：无。本次未修改 CSS 文件，也未修改样式注入逻辑。
- 是否夹带内存优化：否。
- 验证结果：已通过 Node 动态 import 和模拟数据验证，输出 `{"config":"retro","parsedMate":"chatSheets","sheetId":"sheet_1","hash":true,"diff":["T-0-1","T-row-1"]}`。
- 原插件影响确认：`git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode` 未显示 `public/acu_visualizer/` 变更。
- 当前状态：迁移完成，但尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。
- 回滚方式：恢复 `storage.js`、`table-data.js`、`diff-highlighting.js` 到占位版本，删除本次迁移记录，并回退迁移矩阵状态。
- 同步的项目文档：
  - `src/acu_visualizer_test/docs/migration-records-phase-2-data.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：迁移后验证说明

- 验证范围：
  - `git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode`
  - `Test-Path public/acu_visualizer_test/src`
  - 新路径下 `core/constants.js`、`core/state.js`、`core/bridge.js` 的 Node 动态 import。
- 验证结果：
  - `public/acu_visualizer/` 未出现在变更列表中，说明原插件运行文件未被修改。
  - `public/acu_visualizer_test/src` 返回 `False`，说明旧 src 目录已不存在。
  - 新路径模块解析通过，输出：`{"scriptId":"acu_visualizer_v8_96","tableOrder":"acu_table_order","themes":5,"stateOk":true,"bridgeOk":true}`。
- 功能与 CSS 结论：
  - 当前可以确认：原插件运行文件未修改，因此当前正式插件功能和原 CSS 不会因为这些测试版文件变更而被直接影响。
  - 当前不能宣称：已完成浏览器内全量功能回归或视觉回归。因为本次没有在 SillyTavern 浏览器环境中实际点击测试表格、弹窗、搜索、编辑、保存、主题和夜间模式。
  - 因此第一批模块状态仍保持“迁移完成”，不标记为“测试通过”。
- 后续要求：
  - 只有在浏览器内完成 `module-migration-test-checklist.md` 的相关测试后，才允许将模块状态提升为“测试通过”。
  - 在所有模块测试通过前，仍然禁止内存优化。

### 2026-05-17：测试版模块目录移至根目录

- 修改范围：
  - 将 `public/acu_visualizer_test/src/core/` 移动为 `src/acu_visualizer_test/core/`。
  - 将 `public/acu_visualizer_test/src/modules/` 移动为 `src/acu_visualizer_test/modules/`。
  - 将 `public/acu_visualizer_test/src/styles/` 移动为 `src/acu_visualizer_test/styles/`。
  - 将 `public/acu_visualizer_test/src/main.js` 移动为 `src/acu_visualizer_test/main.js`。
  - 删除空的 `public/acu_visualizer_test/src/`。
  - 同步 README、模块拆分计划、迁移矩阵、测试清单和阶段 1 迁移记录中的路径。
  - 修正 `core/bridge.js` 中空 `catch` 代码块，避免 eslint 空块诊断。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：未修改 CSS 内容，仅移动测试版 `styles/` 目录位置。
- 功能风险评估：低。本次只调整测试版模块目录结构，未接入正式运行脚本。
- CSS 风险评估：低。测试版 CSS 文件内容未变，原插件 CSS 未变。
- 是否夹带内存优化：否。
- 验证结果：已使用新路径通过 Node 动态 import 验证，输出包含 `acu_visualizer_v8_96 acu_table_order 5 true true`。
- 回滚方式：将 `core/`、`modules/`、`styles/` 和 `main.js` 移回 `src/`，并回退相关文档路径。
- 同步的项目文档：
  - `public/acu_visualizer_test/README.md`
  - `src/acu_visualizer_test/docs/module-split-plan.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/module-migration-test-checklist.md`
  - `src/acu_visualizer_test/docs/migration-records-phase-1-core.md`
  - `src/acu_visualizer_test/docs/change-log.md`

### 2026-05-17：第一批低风险核心模块迁移

- 修改范围：
  - 迁移 `src/acu_visualizer_test/core/constants.js`。
  - 迁移 `src/acu_visualizer_test/core/state.js`。
  - 迁移 `src/acu_visualizer_test/core/bridge.js`。
  - 新增 `src/acu_visualizer_test/docs/migration-records-phase-1-core.md`。
  - 更新 `src/acu_visualizer_test/docs/module-migration-matrix.md` 中第一批模块状态为“迁移完成”。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：低。本次只迁移测试版核心常量、状态容器和环境桥接模块，未接入正式运行脚本。
- CSS 风险评估：无。本次未修改 CSS 文件，也未修改样式注入逻辑。
- 是否夹带内存优化：否。
- 验证结果：已通过 Node 动态 import 解析验证，输出包含 `acu_visualizer_v8_96 acu_table_order 5 true true`。
- 注意事项：Node 提示项目未声明 `type: module`，本次不修改 `package.json`，避免影响项目构建行为。
- 回滚方式：恢复 `constants.js`、`state.js`、`bridge.js` 到占位版本，删除本次迁移记录，并回退迁移矩阵状态。
- 同步的项目文档：
  - `src/acu_visualizer_test/docs/migration-records-phase-1-core.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/change-log.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：策略调整为模块迁移优先，内存优化冻结

- 修改范围：
  - 新增模块迁移矩阵。
  - 新增模块迁移登记模板。
  - 新增模块迁移测试清单。
  - 同步 README 当前实施策略。
  - 同步模块拆分计划中的“模块迁移优先，优化冻结”说明。
  - 同步内存优化计划中的冻结状态与启动门槛。
  - 创建 `.limcode/design/acu-visualizer-模块迁移优先设计.md`。
  - 创建 `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：无运行风险。本次仅新增和同步测试版文档，不迁移实际运行逻辑。
- CSS 风险评估：无。本次没有修改 CSS 文件内容，也没有替换任何 CSS 注入逻辑。
- 当前结论：先完成模块迁移；所有模块迁移完成并通过全量测试后，才允许进入内存优化实施。
- 回滚方式：删除新增的模块迁移矩阵、登记模板、测试清单，并回退 README、模块拆分计划、内存优化计划和 change-log 中的本次策略说明。
- 同步的项目文档：
  - `public/acu_visualizer_test/README.md`
  - `src/acu_visualizer_test/docs/module-split-plan.md`
  - `src/acu_visualizer_test/docs/memory-optimization-plan.md`
  - `src/acu_visualizer_test/docs/module-migration-matrix.md`
  - `src/acu_visualizer_test/docs/module-migration-record-template.md`
  - `src/acu_visualizer_test/docs/module-migration-test-checklist.md`
  - `.limcode/design/acu-visualizer-模块迁移优先设计.md`
  - `.limcode/plans/acu-visualizer-模块迁移优先实施计划.plan.md`

### 2026-05-17：最大化内存优化安全规划

- 修改范围：
  - 新增最大化内存优化路线图。
  - 新增内存基线测量清单。
  - 新增 CSS 零破坏检查清单。
  - 同步 README 文档入口。
  - 同步内存优化计划中的 L0-L4 分层路线。
  - 同步 `.limcode` 最大化内存优化专项计划。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：无运行风险。本次仅新增和同步测试版文档，不修改任何运行逻辑。
- CSS 风险评估：无。本次没有修改任何 CSS 文件内容，也没有修改原插件样式注入逻辑。
- 回滚方式：删除新增的 `memory-optimization-roadmap.md`、`memory-baseline-checklist.md`、`css-safety-checklist.md`，并回退 README 与内存优化计划中的新增说明。
- 同步的项目文档：
  - `public/acu_visualizer_test/README.md`
  - `src/acu_visualizer_test/docs/memory-optimization-plan.md`
  - `src/acu_visualizer_test/docs/memory-optimization-roadmap.md`
  - `src/acu_visualizer_test/docs/memory-baseline-checklist.md`
  - `src/acu_visualizer_test/docs/css-safety-checklist.md`
  - `.limcode/plans/acu-visualizer-最大化内存优化安全规划.plan.md`

### 2026-05-17：第一阶段安全迁移规则文档化

- 修改范围：
  - 新增本变更记录文档。
  - 同步 README 中的安全修改原则与文档同步规则。
  - 同步模块拆分计划中的第一阶段安全迁移状态。
  - 同步内存优化计划中的零破坏实施说明。
- 是否触碰原插件运行文件：否。
- 是否触碰 CSS：否。
- 功能风险评估：无运行风险。本次仅修改测试版文档。
- CSS 风险评估：无。本次没有修改任何 CSS 文件，也没有修改原插件 CSS 注入逻辑。
- 回滚方式：删除或回退 `src/acu_visualizer_test/docs/change-log.md` 以及 README/计划文档中的新增说明即可。
- 同步的项目文档：
  - `public/acu_visualizer_test/README.md`
  - `src/acu_visualizer_test/docs/module-split-plan.md`
  - `src/acu_visualizer_test/docs/memory-optimization-plan.md`
  - `.limcode/plans/acu-visualizer-测试版第一阶段安全迁移计划.plan.md`
