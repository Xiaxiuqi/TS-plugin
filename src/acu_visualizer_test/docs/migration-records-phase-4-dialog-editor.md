# 阶段 4 弹窗与编辑模块迁移记录

本记录覆盖第四阶段模块迁移：

- `modules/settings-dialog.js`
- `modules/shortcut-dialog.js`
- `modules/cell-history.js`
- `modules/cell-editor.js`

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改原 CSS：否。
- 是否夹带内存优化：否。
- 是否改变 DOM class：否，保留原 class 和 id。
- 是否改变 localStorage key：否。
- 是否改变数据库 API 调用语义：否。
- 当前迁移性质：测试版模块迁移，不接入正式运行脚本。
- 当前状态：迁移完成，尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。

## 1. `modules/settings-dialog.js`

| 项目                  | 内容                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/settings-dialog.js`                                                      |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                            |
| 来源函数/行段         | `showSettingsDialog()`、`bindSettingsDialogEvents()`、`getStorageItemSize()`、`showCleanupConfirmation()` |
| 是否影响 CSS          | 使用原 class/id，不修改 CSS                                                                               |
| 是否影响 DOM class    | 保留 `acu-settings-*`、`acu-confirm-*`、`acu-cleanup-*`                                                   |
| 是否影响事件          | 保留设置页切换、保存、清理确认语义                                                                        |
| 是否影响 localStorage | 使用原设置与清理 key，不改变格式                                                                          |
| 是否影响数据库 API    | 否                                                                                                        |
| 是否夹带优化          | 否                                                                                                        |

## 2. `modules/shortcut-dialog.js`

| 项目                  | 内容                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/shortcut-dialog.js`                                                       |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                             |
| 来源函数/行段         | `openShortcutDialog()` 的快捷配置、手动更新、打开可视化编辑器逻辑                                          |
| 是否影响 CSS          | 使用原 class/id，不修改 CSS                                                                                |
| 是否影响 DOM class    | 保留 `acu-shortcut-lite-*`                                                                                 |
| 是否影响事件          | 保留保存配置、手动更新、打开编辑器语义                                                                     |
| 是否影响 localStorage | 回退模式仍由注入依赖执行原读写                                                                             |
| 是否影响数据库 API    | 保留 `getSettings()`、`updateSettings()`、`manualUpdate()`、`triggerUpdate()`、`openVisualizer()` 调用顺序 |
| 是否夹带优化          | 否                                                                                                         |

## 3. `modules/cell-history.js`

| 项目                  | 内容                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/cell-history.js`                                                          |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                             |
| 来源函数/行段         | `getCellHistoryAll()`、`saveCellHistoryAll()`、`getCellHistory()`、`addCellHistory()`、`showHistoryMenu()` |
| 是否影响 CSS          | 使用原 class/id，不修改 CSS                                                                                |
| 是否影响 DOM class    | 保留 `acu-history-*`                                                                                       |
| 是否影响事件          | 保留点击历史项恢复、关闭弹窗语义                                                                           |
| 是否影响 localStorage | 使用 `acu_cell_history_v8_8`，不改变格式                                                                   |
| 是否影响数据库 API    | 恢复历史值时保留保存调用语义                                                                               |
| 是否夹带优化          | 否                                                                                                         |

## 4. `modules/cell-editor.js`

| 项目                  | 内容                                                                            |
| --------------------- | ------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/cell-editor.js`                                |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                  |
| 来源函数/行段         | `showCellMenu()`、`handleCellAction()` 中编辑、插入、删除、恢复、发送输入框逻辑 |
| 是否影响 CSS          | 使用原 class/id，不修改 CSS                                                     |
| 是否影响 DOM class    | 保留 `acu-cell-menu`、`acu-cell-menu-item`、`acu-edit-*`、`pending-deletion`    |
| 是否影响事件          | 保留菜单项点击、编辑保存/取消、Ctrl+Enter、Esc 语义                             |
| 是否影响 localStorage | 通过历史模块使用原 key                                                          |
| 是否影响数据库 API    | 保留 `saveDataToDatabase()` 调用语义                                            |
| 是否夹带优化          | 否                                                                              |

## 5. 代码层验证

已执行临时 Node 脚本验证，脚本完成后已删除。

输出：

```json
{"history":true,"settings":true,"shortcut":true,"editor":true}
```

说明：

- 四个模块均可动态 import。
- 单元格历史写入/读取正常。
- 设置弹窗 HTML 保留 `acu-settings-overlay` 与 `acu-cleanup-now`。
- 快捷弹窗 HTML 保留 `acu-shortcut-lite-overlay` 与 `acu-sc-save`。
- 单元格菜单 HTML 保留 `acu-cell-menu-item edit`。
- 插入行占位规则仍为第二列填入 `1`。

## 6. 原插件与 CSS 影响确认

已执行：

```powershell
git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode
```

输出未出现 `public/acu_visualizer/` 变更。

因此可以确认：

- 原插件运行文件未被修改。
- 原插件 CSS 注入逻辑未被修改。
- 当前正式插件功能与 CSS 不会被本次测试版迁移直接影响。

## 7. 回滚方式

如需回滚本次迁移：

1. 恢复以下文件到迁移前占位版本：
   - `src/acu_visualizer_test/modules/settings-dialog.js`
   - `src/acu_visualizer_test/modules/shortcut-dialog.js`
   - `src/acu_visualizer_test/modules/cell-history.js`
   - `src/acu_visualizer_test/modules/cell-editor.js`
2. 删除本迁移记录文件。
3. 回退 `module-migration-matrix.md` 中对应状态。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
