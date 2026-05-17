# 阶段 3 低 UI 风险模块迁移记录

本记录覆盖第三阶段低 UI 风险模块迁移：

- `modules/notifications.js`
- `modules/theme.js`
- `modules/pagination.js`
- `modules/tabs.js`

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改原 CSS：否。
- 是否夹带内存优化：否。
- 是否改变 DOM class：否，保留原 class 名。
- 是否改变 localStorage key：否。
- 当前迁移性质：测试版模块迁移，不接入正式运行脚本。
- 当前状态：迁移完成，尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。

## 1. `modules/notifications.js`

| 项目                  | 内容                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/notifications.js`                                                             |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                 |
| 来源函数/行段         | `showNotification()`、`updateNotificationPositions()`、`removeNotification()`、`showLoadSuccessNotification()` |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                                                       |
| 是否影响 DOM class    | 保留 `acu-notification`                                                                                        |
| 是否影响事件          | 否                                                                                                             |
| 是否影响 localStorage | 否                                                                                                             |
| 是否影响数据库 API    | 否                                                                                                             |
| 是否夹带优化          | 否                                                                                                             |

## 2. `modules/theme.js`

| 项目                  | 内容                                                           |
| --------------------- | -------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/theme.js`                     |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                 |
| 来源函数/行段         | `applyThemeStyles()`、夜间模式、展开状态、内部滚动位置状态读写 |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                       |
| 是否影响 DOM class    | 保留 `acu-theme-*`、`night-mode`                               |
| 是否影响事件          | 否                                                             |
| 是否影响 localStorage | 使用原 key，不改变格式                                         |
| 是否影响数据库 API    | 否                                                             |
| 是否夹带优化          | 否                                                             |

## 3. `modules/pagination.js`

| 项目                  | 内容                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/pagination.js`                                       |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                        |
| 来源函数/行段         | `generatePaginationHTML()`、`bindPaginationEvents()`                                  |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                              |
| 是否影响 DOM class    | 保留 `acu-pagination-container`、`acu-page-btn`、`prev`、`next`、`disabled`、`active` |
| 是否影响事件          | 保留原点击分页行为语义                                                                |
| 是否影响 localStorage | 通过原分页 key 保存页码                                                               |
| 是否影响数据库 API    | 否                                                                                    |
| 是否夹带优化          | 否                                                                                    |

## 4. `modules/tabs.js`

| 项目                  | 内容                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| 目标文件              | `src/acu_visualizer_test/modules/tabs.js`                                            |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                       |
| 来源函数/行段         | active tab 状态、tab 按钮 HTML、徽章更新、tab 点击切换                               |
| 是否影响 CSS          | 使用原 class，不修改 CSS                                                             |
| 是否影响 DOM class    | 保留 `acu-tab-btn`、`active`、`has-updates`、`acu-update-badge`、`acu-table-section` |
| 是否影响事件          | 保留 `.off('click.acu').on('click.acu')` 语义                                        |
| 是否影响 localStorage | 使用原 active tab key，不改变格式                                                    |
| 是否影响数据库 API    | 否                                                                                   |
| 是否夹带优化          | 否                                                                                   |

## 5. 代码层验证

已执行临时 Node 脚本验证，脚本完成后已删除。

输出：

```json
{"notification":true,"night":true,"theme":"复古羊皮","pageHas":true,"tabHas":true}
```

说明：

- 四个模块均可动态 import。
- 通知模块函数存在。
- 夜间模式状态读写正常。
- 主题 id 查找正常。
- 分页 HTML 保留 `acu-pagination-container` 和目标 `data-page`。
- tab HTML 保留 `acu-tab-btn active`，active tab 状态读写正常。

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
   - `src/acu_visualizer_test/modules/notifications.js`
   - `src/acu_visualizer_test/modules/theme.js`
   - `src/acu_visualizer_test/modules/pagination.js`
   - `src/acu_visualizer_test/modules/tabs.js`
2. 删除本迁移记录文件。
3. 回退 `module-migration-matrix.md` 中对应状态。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
