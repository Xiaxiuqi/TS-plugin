# ACU Visualizer 模块迁移矩阵

本矩阵用于登记 `acu_visualizer-test.js` 向测试版模块目录迁移的顺序、风险和验证要求。

## 当前策略

- 当前阶段：模块迁移前置设计与登记。
- 实施顺序：先模块迁移，后内存优化。
- 优化状态：冻结。任何模块迁移都不得夹带内存优化、渲染优化、事件重构或 CSS 调整。
- 原插件运行文件：不得修改。
- 原 CSS：不得修改。

## 状态枚举

- 未开始
- 占位完成
- 迁移中
- 迁移完成
- 测试通过
- 暂停

## 迁移矩阵

| 阶段 | 模块                           | 来源函数/区域                                                                  | 风险 | 涉及 CSS | 涉及数据库保存 | 是否允许优化 | 验证项                                    | 状态     |
| ---- | ------------------------------ | ------------------------------------------------------------------------------ | ---- | -------- | -------------- | ------------ | ----------------------------------------- | -------- |
| 1    | `core/constants.js`            | `SCRIPT_ID`、`STORAGE_KEY_*`、`DEFAULT_*`、`THEMES`                            | 低   | 否       | 否             | 否           | 常量值与原脚本一致                        | 迁移完成 |
| 1    | `core/state.js`                | 全局运行态变量、Set/Map、分页、拖拽、搜索状态                                  | 低   | 否       | 否             | 否           | 状态字段完整，未改变默认值                | 迁移完成 |
| 1    | `core/bridge.js`               | `getCore()`、外部 API 访问                                                     | 低   | 否       | 否             | 否           | jQuery 与 AutoCardUpdaterAPI 获取方式一致 | 迁移完成 |
| 2    | `core/storage.js`              | localStorage 读写、配置、快照、清理相关函数                                    | 中   | 否       | 否             | 否           | key 不变，旧数据可读，不改写格式          | 迁移完成 |
| 2    | `modules/table-data.js`        | `getTableData()`、`ensureProperFormat()`、`processJsonData()`、排序数据        | 中   | 否       | 否             | 否           | 数据读取和格式兼容                        | 迁移完成 |
| 2    | `modules/diff-highlighting.js` | `generateDataHash()`、`generateDiffMap()`、高亮判断、标签更新状态              | 中   | 否       | 否             | 否           | diff 与高亮结果一致                       | 迁移完成 |
| 3    | `modules/notifications.js`     | `showNotification()`、通知队列、位置更新                                       | 低   | 是       | 否             | 否           | 通知样式与消失逻辑一致                    | 迁移完成 |
| 3    | `modules/theme.js`             | `THEMES`、`applyThemeStyles()`、夜间模式、主题菜单                             | 中   | 是       | 否             | 否           | 主题和夜间模式视觉一致                    | 迁移完成 |
| 3    | `modules/pagination.js`        | 分页状态、`generatePaginationHTML()`、分页事件                                 | 中   | 是       | 否             | 否           | 页码、跳转、保存页状态一致                | 迁移完成 |
| 3    | `modules/tabs.js`              | 标签生成、切换、更新徽章、已读状态                                             | 中   | 是       | 否             | 否           | 标签切换和徽章一致                        | 迁移完成 |
| 4    | `modules/settings-dialog.js`   | 设置弹窗、清理弹窗、存储分析、清理设置                                         | 高   | 是       | 否             | 否           | 设置保存、清理确认、夜间样式一致          | 迁移完成 |
| 4    | `modules/shortcut-dialog.js`   | 快捷选项弹窗、数据库设置读写、手动更新、打开编辑器                             | 高   | 是       | 是             | 否           | 配置保存、手动更新、打开编辑器一致        | 迁移完成 |
| 4    | `modules/cell-history.js`      | 历史记录读写、历史弹窗、历史恢复                                               | 高   | 是       | 是             | 否           | 历史显示、恢复、隔离 key 一致             | 迁移完成 |
| 4    | `modules/cell-editor.js`       | 单元格菜单、编辑弹窗、插入/删除/恢复、保存编辑                                 | 高   | 是       | 是             | 否           | 编辑、删除、恢复、保存一致                | 迁移完成 |
| 5    | `modules/row-sort.js`          | 行映射、行拖拽、行顺序保存/取消                                                | 高   | 是       | 是             | 否           | 行拖拽和保存一致                          | 迁移完成 |
| 5    | `modules/table-sort.js`        | 表格标签排序菜单、拖拽排序、保存顺序                                           | 高   | 是       | 否             | 否           | 表格顺序编辑一致                          | 迁移完成 |
| 5    | `modules/search.js`            | 搜索栏、搜索状态、mark 高亮、清除高亮                                          | 高   | 是       | 否             | 否           | 搜索结果和高亮视觉一致                    | 迁移完成 |
| 6    | `modules/table-renderer.js`    | `generateTableHTML()`、`renderDataTable()`、`smartUpdateTable()`、局部更新函数 | 高   | 是       | 否             | 否           | 表格完整渲染与原版一致                    | 迁移完成 |
| 6    | `modules/database-sync.js`     | `saveDataToDatabase()`、保存上下文、删除提交、快照保存                         | 高   | 否       | 是             | 否           | 保存链路和数据库写入一致                  | 迁移完成 |
| 6    | `core/lifecycle.js`            | `init()`、`initializeScript()`、`observeAIMessages()`、事件绑定入口            | 高   | 否       | 否             | 否           | 初始化、监听、刷新入口一致                | 迁移完成 |
| 6    | `core/scheduler.js`            | `UpdateController`、刷新调度、静默保存抑制                                     | 中   | 否       | 否             | 否           | 静默保存和刷新抑制一致                    | 迁移完成 |
| 6    | `main.js`                      | 用户脚本入口、模块装配、测试版调试对象                                         | 高   | 否       | 否             | 否           | 测试版入口可加载且不影响原插件            | 迁移完成 |

## 迁移要求

每个模块从“占位完成”进入“迁移中”前，必须填写迁移登记记录。

每个模块从“迁移完成”进入“测试通过”前，必须完成模块相关测试。

所有模块测试通过前，禁止启动内存优化实施。
