# 阶段 5 交互排序与搜索模块迁移记录

本记录覆盖第五阶段模块迁移：

- `modules/row-sort.js`
- `modules/table-sort.js`
- `modules/search.js`

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改原 CSS：否。
- 是否夹带内存优化：否。
- 是否改变 DOM class：否，保留原 class 和 data 属性。
- 是否改变 localStorage key：否。
- 是否改变数据库 API 调用语义：否。
- 当前迁移性质：测试版模块迁移，不接入正式运行脚本。
- 当前状态：迁移完成，尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。

## 1. `modules/row-sort.js`

| 项目                  | 内容                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/row-sort.js`                                                                                                     |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                                                    |
| 来源函数/行段         | `initializeRowMapping()`、`getOriginalRowIndex()`、`getDisplayRowIndex()`、`moveRow()`、`loadRowMapping()`、`bindRowDragEvents()`、行排序开关逻辑 |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                                                                                          |
| 是否影响 DOM class    | 保留 `is-sorting-rows`、`dragging`、`drag-over-before`、`drag-over-after`、`editing-row-order`                                                    |
| 是否影响事件          | 保留 `dragstart.acu`、`dragend.acu`、`dragover.acu`、`dragenter.acu`、`dragleave.acu`、`drop.acu`                                                 |
| 是否影响 localStorage | 使用原前缀 `acu_row_position_mapping_`                                                                                                            |
| 是否影响数据库 API    | 否                                                                                                                                                |
| 是否夹带优化          | 否                                                                                                                                                |

## 2. `modules/table-sort.js`

| 项目                  | 内容                                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/table-sort.js`                                                                                                                                                          |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                                                                                                           |
| 来源函数/行段         | `getSavedTableOrder()`、`saveTableOrder()`、`getOrderedTableNames()`、`initDragSort()`、`showOrderMenu()`、`startOrderEditing()`、`saveTableOrderFromUI()`、`cancelOrderEditing()`、`activateSavedTab()` |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                                                                                                                                                 |
| 是否影响 DOM class    | 保留 `acu-order-menu`、`acu-cell-menu`、`acu-cell-menu-item`、`editing-order`、`dragging`、`drag-over`                                                                                                   |
| 是否影响事件          | 保留 `.acu-drag` 事件命名空间和拖拽事件语义                                                                                                                                                              |
| 是否影响 localStorage | 使用原 key `acu_table_order`                                                                                                                                                                             |
| 是否影响数据库 API    | 否                                                                                                                                                                                                       |
| 是否夹带优化          | 否                                                                                                                                                                                                       |

## 3. `modules/search.js`

| 项目                  | 内容                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/search.js`                                                                                                                                         |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                                                                                      |
| 来源函数/行段         | 搜索状态、搜索过滤、`mark.acu-search-match-text` 高亮、搜索工具栏 HTML、搜索事件绑定                                                                                                |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                                                                                                                            |
| 是否影响 DOM class    | 保留 `acu-search-toolbar`、`acu-search-input-box`、`acu-search-field-input`、`acu-search-clear-btn`、`acu-search-execute-btn`、`acu-search-toggle-trigger`、`acu-search-match-text` |
| 是否影响事件          | 保留展开/收起、点击搜索、Enter 搜索、清空搜索、输入控制清空按钮                                                                                                                     |
| 是否影响 localStorage | 否                                                                                                                                                                                  |
| 是否影响数据库 API    | 否                                                                                                                                                                                  |
| 是否夹带优化          | 否                                                                                                                                                                                  |

## 4. 代码层验证

已执行临时 Node 脚本验证，脚本完成后已删除。

输出：

```json
{"row":true,"table":true,"search":true}
```

说明：

- 三个模块均可动态 import。
- 行位置映射初始化、行移动和原始索引读取正常。
- 表格顺序保存和合并当前表格名称顺序正常。
- 搜索过滤、高亮和工具栏 HTML 生成正常。

## 5. 原插件与 CSS 影响确认

已执行：

```powershell
git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode
```

输出未出现 `public/acu_visualizer/` 变更。

因此可以确认：

- 原插件运行文件未被修改。
- 原插件 CSS 注入逻辑未被修改。
- 当前正式插件功能与 CSS 不会被本次测试版迁移直接影响。

## 6. 回滚方式

如需回滚本次迁移：

1. 恢复以下文件到迁移前占位版本：
   - `src/acu_visualizer_test/modules/row-sort.js`
   - `src/acu_visualizer_test/modules/table-sort.js`
   - `src/acu_visualizer_test/modules/search.js`
2. 删除本迁移记录文件。
3. 回退 `module-migration-matrix.md` 中对应状态。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
