# 阶段 6 渲染、数据库同步与生命周期模块迁移记录

本记录覆盖第六阶段模块迁移：

- `modules/table-renderer.js`
- `modules/database-sync.js`
- `core/lifecycle.js`
- `core/scheduler.js`
- `main.js`

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改原 CSS：否。
- 是否夹带内存优化：否。
- 是否改变 DOM class：否，保留原表格、标签、搜索、按钮、编辑相关 class。
- 是否改变 localStorage key：否。
- 是否改变数据库 API 调用语义：否。
- 当前迁移性质：测试版模块迁移，不接入正式运行脚本。
- 当前状态：迁移完成，尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。

## 1. `modules/table-renderer.js`

| 项目                  | 内容                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 目标文件              | `src/acu_visualizer_test/modules/table-renderer.js`                                                                                                                                  |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                                                                                       |
| 来源函数/行段         | `renderDataTable()`、`generateTableHTML()`、`smartUpdateTable()`、`insertTableAfterLatestAIMessage()`、`bindTableEvents()`、`performRefreshTable()`、`checkAndUpdateTablePosition()` |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                                                                                                                             |
| 是否影响 DOM class    | 保留 `acu-table-container`、`acu-tabs-container`、`acu-tab-btn`、`acu-table-section`、`data-table-wrapper`、`acu-editable-cell`、`acu-search-*` 等                                   |
| 是否影响事件          | 保留表格按钮、保存按钮、刷新按钮、单元格点击、滚动位置保存等事件语义                                                                                                                 |
| 是否影响 localStorage | 通过已迁移模块使用原 key                                                                                                                                                             |
| 是否影响数据库 API    | 通过 database-sync 依赖保留原保存语义                                                                                                                                                |
| 是否夹带优化          | 否                                                                                                                                                                                   |

## 2. `modules/database-sync.js`

| 项目                  | 内容                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/database-sync.js`                                                             |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                 |
| 来源函数/行段         | `saveDataToDatabase()` 及保存后状态清理逻辑                                                                    |
| 是否影响 CSS          | 否                                                                                                             |
| 是否影响 DOM class    | 保存成功后仍移除 `pending-deletion`                                                                            |
| 是否影响事件          | 否                                                                                                             |
| 是否影响 localStorage | 通过状态/快照相关模块保持原格式                                                                                |
| 是否影响数据库 API    | 保留 `updateCell()`、`deleteRow()`、`updateRow()`、`importTableAsJson()`、`refreshDataAndWorldbook()` 调用语义 |
| 是否夹带优化          | 否                                                                                                             |

## 3. `core/scheduler.js`

| 项目                  | 内容                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/core/scheduler.js`                            |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                         |
| 来源函数/行段         | 初始化延迟、数据库就绪重试、AI 消息 MutationObserver、延迟检查表格位置 |
| 是否影响 CSS          | 否                                                                     |
| 是否影响 DOM class    | 监听 `.mes:not(.sys):not(.user)` 语义不变                              |
| 是否影响事件          | 保留初始化延迟、300ms AI 消息位置检查、3000ms 数据库就绪重试语义       |
| 是否影响 localStorage | 否                                                                     |
| 是否影响数据库 API    | 只检测 `exportTableAsJson()` 是否存在                                  |
| 是否夹带优化          | 否                                                                     |

## 4. `core/lifecycle.js`

| 项目                  | 内容                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/core/lifecycle.js`                                                              |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                           |
| 来源函数/行段         | `init()`、`initializeScript()`、数据库更新回调注册、表格填充开始回调、AI 消息观察                        |
| 是否影响 CSS          | 否                                                                                                       |
| 是否影响 DOM class    | destroy 时清理测试版弹窗和容器，不修改原 CSS                                                             |
| 是否影响事件          | 保留 `$(document).ready(init)` / `window.load` 初始化入口语义                                            |
| 是否影响 localStorage | 保留快照初始化和存储清理调用语义                                                                         |
| 是否影响数据库 API    | 保留 `registerTableUpdateCallback()`、`registerTableFillStartCallback()`、`exportTableAsJson()` 调用语义 |
| 是否夹带优化          | 否                                                                                                       |

## 5. `main.js`

| 项目                  | 内容                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/main.js`                                           |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js` 尾部 IIFE                    |
| 来源函数/行段         | 测试版模块化入口、生命周期初始化、`window.ACUVisualizerTest.destroy()` 暴露 |
| 是否影响 CSS          | 否                                                                          |
| 是否影响 DOM class    | 否                                                                          |
| 是否影响事件          | 保留加载后初始化结构                                                        |
| 是否影响 localStorage | 否                                                                          |
| 是否影响数据库 API    | 通过 lifecycle 间接使用                                                     |
| 是否夹带优化          | 否                                                                          |

## 6. 代码层验证

已执行临时 Node 脚本验证，脚本完成后已删除。

输出：

```json
{"renderer":true,"dbsync":true,"lifecycle":true,"scheduler":true}
```

说明：

- 表格渲染、数据库同步、生命周期、调度模块均可动态 import。
- `renderDataTable()` 能生成 `acu-editable-cell`。
- `generateTableHTML()` 能生成 `acu-table-container`。
- `applyPendingDeletesToTableData()` 能按待删除集合应用删除。
- lifecycle 能创建 `init()` / `destroy()`。
- scheduler 暴露 AI 消息观察器函数。

## 7. 原插件与 CSS 影响确认

已执行：

```powershell
git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode
```

输出未出现 `public/acu_visualizer/` 变更。

因此可以确认：

- 原插件运行文件未被修改。
- 原插件 CSS 注入逻辑未被修改。
- 当前正式插件功能与 CSS 不会被本次测试版迁移直接影响。

## 8. 回滚方式

如需回滚本次迁移：

1. 恢复以下文件到迁移前占位版本：
   - `src/acu_visualizer_test/modules/table-renderer.js`
   - `src/acu_visualizer_test/modules/database-sync.js`
   - `src/acu_visualizer_test/main.js`
2. 删除：
   - `src/acu_visualizer_test/core/lifecycle.js`
   - `src/acu_visualizer_test/core/scheduler.js`
   - 本迁移记录文件
3. 回退 `module-migration-matrix.md` 中对应状态。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
