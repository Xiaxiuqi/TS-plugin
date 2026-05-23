# ACU Visualizer 模块拆分计划

## 1. 当前脚本概况

`public/acu_visualizer/acu_visualizer-test.js` 当前是一个大型单文件 IIFE 用户脚本，包含以下主要功能：

- 用户脚本元信息与初始化生命周期。
- 样式注入：主题、表格、弹窗、搜索、快捷选项、动画等大量 CSS 字符串。
- 全局状态：初始化状态、保存状态、当前高亮差异、分页、拖拽、搜索、待删除行等。
- localStorage 持久化：主题、夜间模式、表格顺序、展开状态、快照、分页、标签状态、单元格历史、清理设置。
- 数据桥接：读取 `AutoCardUpdaterAPI`、导出/保存数据库表格数据。
- 表格渲染：标签页、分页、表格 HTML、单元格事件、行拖动排序。
- 弹窗系统：设置弹窗、清理确认弹窗、历史弹窗、单元格编辑弹窗、主题菜单、刷新菜单、快捷选项弹窗。
- Diff 与高亮：数据库更新高亮、用户编辑高亮、标签更新徽章。
- 监听与刷新：消息监听、智能刷新、表格位置维护。

## 1.1 第一阶段安全迁移状态

当前阶段只建立测试版模块化规划、文档同步规则与占位目录，不迁移原插件运行代码。

### 零破坏约束

- 不修改 `public/acu_visualizer/acu_visualizer.js`。
- 不修改 `public/acu_visualizer/acu_visualizer-test.js`。
- 不替换任何现有 CSS 注入逻辑。
- 不改变 localStorage key、数据库 API 调用和用户脚本元信息。
- 所有测试版变更必须记录到 `docs/change-log.md` 或相关项目文档。

### 后续迁移门槛

真正迁移某个模块前，必须先在计划或变更记录中写明：

1. 迁移来源函数或 CSS 来源片段。
2. 目标模块文件。
3. 是否影响原插件运行文件。
4. CSS 选择器和注入顺序是否完全保持。
5. 回滚方式。

## 1.2 当前策略：模块迁移优先，优化冻结

根据最新策略，当前阶段不再推进实际内存优化，而是先完成模块迁移前置设计与登记。

### 执行顺序

1. 建立模块迁移矩阵。
2. 建立模块迁移登记模板。
3. 建立模块迁移测试清单。
4. 按矩阵逐个迁移模块。
5. 所有模块迁移完成后进行全量回归测试。
6. 全量测试通过后，才允许创建新的内存优化实施计划。

### 当前冻结事项

在所有模块迁移并测试通过前，冻结以下事项：

- 内存优化实施。
- 渲染路径优化。
- 事件委托重构。
- localStorage 格式变更。
- CSS 拆分替换。
- 虚拟滚动、Worker diff、IndexedDB 等高级优化。

### 相关文档

- `docs/module-migration-matrix.md`
- `docs/module-migration-record-template.md`
- `docs/module-migration-test-checklist.md`

## 1.3 当前目录与构建策略

测试版源码已整体迁移到：

```text
src/acu_visualizer_test/
```

`public/acu_visualizer_test/` 只作为发布产物目录，当前只保留：

```text
public/acu_visualizer_test/index.js
public/acu_visualizer_test/index.js.map
```

构建统一使用项目现有命令：

```bash
pnpm build
```

由既有 webpack 配置扫描 `src/acu_visualizer_test/index.js` 并输出 `dist/acu_visualizer_test/index.js`。发布时将 dist 产物同步到 `public/acu_visualizer_test/index.js`。

酒馆助手推荐加载：

```js
import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js'
```

## 2. 拆分目标

### 2.1 维护性目标

- 将“数据、渲染、样式、事件、存储、业务逻辑”解耦。
- 避免所有函数共享同一个巨大闭包，减少状态污染。
- 每个模块只暴露必要 API。
- 让后续功能增删能定位到单一模块。

### 2.2 兼容性目标

- 测试版源码可以使用模块文件组织。
- 最终仍支持打包成一个浏览器可直接执行的脚本。
- 不改变现有 localStorage key，除非明确做迁移层。
- 不改变 `AutoCardUpdaterAPI` 的调用方式，只在桥接层统一封装。

### 2.3 性能与内存目标

- 减少重复注入样式、重复绑定事件、重复生成大字符串。
- 将大体积 CSS 从 JS 字符串中拆出，按需注入。
- 大表格渲染支持增量更新、事件委托与可选虚拟化。
- 对快照、历史记录与 localStorage 写入做上限控制。

## 3. 建议模块结构

```text
main.js
core/
  constants.js
  state.js
  bridge.js
  storage.js
  lifecycle.js
  scheduler.js
modules/
  table-data.js
  table-renderer.js
  tabs.js
  pagination.js
  cell-editor.js
  cell-history.js
  row-sort.js
  table-sort.js
  search.js
  settings-dialog.js
  shortcut-dialog.js
  theme.js
  notifications.js
  diff-highlighting.js
  database-sync.js
styles/
  theme.css
  table.css
  dialogs.css
  shortcut-dialog.css
  search.css
  animations.css
```

## 4. 模块职责说明

### 4.1 `main.js`

入口文件，只负责：

- 用户脚本包装。
- 加载核心依赖。
- 调用 `init()`。
- 暴露测试版调试对象，例如 `window.ACUVisualizerTest`。

不应包含大段业务逻辑。

### 4.2 `core/constants.js`

存放常量：

- `SCRIPT_ID`
- localStorage key
- 默认配置
- 默认清理设置
- 主题列表
- 存储大小限制
- 分页默认值

### 4.3 `core/state.js`

集中管理运行态状态，替代散落的全局变量：

- `isInitialized`
- `isSaving`
- `isEditingOrder`
- `isEditingRowOrder`
- `currentDiffMap`
- `currentUserEditMap`
- `pendingDeletes`
- `currentSearchTerm`
- 拖拽状态
- 分页缓存

建议提供：

```js
export const state = {
  flags: {},
  diffMap: new Set(),
  userEditMap: new Set(),
  pendingDeletes: new Set(),
  pagination: Object.create(null),
};
```

### 4.4 `core/bridge.js`

封装外部环境：

- jQuery 获取。
- `AutoCardUpdaterAPI` 获取。
- SillyTavern chat / chatId 获取。
- parent/window/top 访问保护。

避免业务模块直接访问 `window.parent`。

### 4.5 `core/storage.js`

负责所有持久化：

- 配置读取与保存。
- 快照读取与保存。
- 分页状态。
- 标签状态。
- 单元格历史基础读写。
- localStorage 安全写入与清理。
- 存储分析。

建议所有写入统一走 `safeSetJSON()` / `safeSetText()`，便于限流与异常处理。

### 4.6 `core/lifecycle.js`

负责生命周期：

- 初始化。
- 样式注入。
- 事件绑定。
- 消息监听。
- 销毁/重载清理。

后续应加入 `destroy()`，用于清理事件监听和 DOM 引用。

### 4.7 `core/scheduler.js`

负责节流、防抖、批处理：

- 表格刷新防抖。
- localStorage 写入节流。
- DOM 更新合并到 `requestAnimationFrame`。
- 静默保存期间的更新抑制。

当前 `UpdateController` 可迁移至此模块。

### 4.8 `modules/table-data.js`

负责数据读取、规范化与排序：

- `getTableData()`
- `ensureProperFormat()`
- `processJsonData()`
- `getOrderedTableNames()`
- `getSafeTableId()`
- 表格名与 sheetId 映射。

### 4.9 `modules/database-sync.js`

负责保存数据库：

- `saveDataToDatabase()`
- 删除行、插入行、编辑单元格的提交上下文。
- 保存后快照更新。
- 保存期间 UI 状态。

### 4.10 `modules/table-renderer.js`

负责表格 DOM 生成与更新：

- `generateTableHTML()`
- `renderDataTable()`
- `updateTableContentOnly()`
- `updateCurrentTableOnly()`
- `smartUpdateTable()`
- `insertTableAfterLatestAIMessage()`

建议后续引入“渲染上下文对象”，减少对全局状态直接依赖。

### 4.11 `modules/tabs.js`

负责标签页：

- 标签 HTML。
- 标签切换。
- 激活标签保存。
- 更新徽章。
- 已读状态。

### 4.12 `modules/pagination.js`

负责分页：

- 当前页读写。
- 页码 HTML。
- 分页事件。
- 总结表自动跳转最后页。

### 4.13 `modules/cell-editor.js`

负责单元格交互：

- 单元格菜单。
- 编辑弹窗。
- 插入行。
- 标记删除/恢复。
- 历史恢复触发。

### 4.14 `modules/cell-history.js`

负责单元格历史：

- 获取全部历史。
- 获取单格历史。
- 添加历史。
- 历史弹窗。
- 按隔离 key 过滤。
- 历史容量控制。

### 4.15 `modules/row-sort.js`

负责行拖动排序：

- 行映射初始化。
- 原始索引与显示索引转换。
- 拖拽事件。
- 行移动。
- 保存/取消行排序。

### 4.16 `modules/table-sort.js`

负责表格标签顺序编辑：

- 表格顺序菜单。
- 拖拽标签。
- 保存表格顺序。
- 取消编辑。

### 4.17 `modules/search.js`

负责搜索：

- 搜索栏渲染。
- 搜索状态。
- 文本高亮。
- 清理高亮。
- 搜索样式注入。

### 4.18 `modules/settings-dialog.js`

负责设置与清理面板：

- 设置弹窗 HTML。
- 存储分析展示。
- 手动清理。
- 清理确认。
- 保存设置。

### 4.19 `modules/shortcut-dialog.js`

负责快捷选项弹窗：

- 读取数据库设置。
- 保存配置。
- 触发手动更新。
- 打开可视化编辑器。
- 当前 AI 楼层统计。

### 4.20 `modules/theme.js`

负责主题：

- 主题切换。
- 夜间模式。
- 主题菜单。
- 主题 class 管理。

### 4.21 `modules/notifications.js`

负责通知：

- 通知队列。
- 通知定位。
- 通知销毁。

### 4.22 `modules/diff-highlighting.js`

负责差异计算与高亮：

- 数据 hash。
- 快照对比。
- diffMap 生成。
- 用户编辑高亮。
- 数据库更新高亮。
- 标签更新状态联动。

## 5. 样式拆分计划

当前 `addStyles()` 和 `injectShortcutDialogStylesOnce()` 内部包含大量 CSS 字符串，建议拆为：

| 文件                         | 内容                            |
| ---------------------------- | ------------------------------- |
| `styles/theme.css`           | 主题变量、夜间模式变量          |
| `styles/table.css`           | 容器、标签、表格、分页、拖拽行  |
| `styles/dialogs.css`         | 设置、确认、历史、编辑弹窗      |
| `styles/shortcut-dialog.css` | 快捷选项弹窗                    |
| `styles/search.css`          | 搜索栏与搜索高亮                |
| `styles/animations.css`      | pulse、fade、月相切换、粒子动画 |

测试版可以先通过 JS 读取/内联这些 CSS，最终打包时合并为字符串注入。

## 6. 迁移阶段

### 阶段 0：准备

- 建立测试版目录与文档。
- 保留原脚本作为基准。
- 明确测试入口和回滚策略。

### 阶段 1：抽离常量与状态

- 将所有 `STORAGE_KEY_*`、`DEFAULT_*`、`THEMES` 放入 `constants.js`。
- 将运行态变量迁入 `state.js`。
- 原脚本仍可工作，通过导入/注入方式替换引用。

### 阶段 2：抽离 bridge 与 storage

- 将 `getCore()`、SillyTavern 访问、数据库 API 获取放入 `bridge.js`。
- 将 localStorage 读写与清理迁入 `storage.js`。
- 保持 key 不变。

### 阶段 3：抽离样式

- 先拆 `search.css` 与 `shortcut-dialog.css`。
- 再拆主样式 `table.css`、`dialogs.css`、`theme.css`。
- 引入统一 `injectStyle(id, cssText)`，避免重复注入。

### 阶段 4：抽离无副作用功能模块

优先迁移低风险函数：

- `notifications.js`
- `theme.js`
- `pagination.js`
- `cell-history.js`
- `diff-highlighting.js`

### 阶段 5：抽离高耦合渲染模块

迁移：

- `table-data.js`
- `table-renderer.js`
- `tabs.js`
- `cell-editor.js`
- `row-sort.js`
- `table-sort.js`

### 阶段 6：生命周期与构建

- 增加统一 `init()` / `destroy()`。
- 增加测试版 bundle 输出方案。
- 对比原版功能。

## 7. 风险点

1. 当前代码大量依赖 jQuery 选择器和全局 DOM，拆分时容易引入调用顺序问题。
2. 表格数据保存涉及数据库 API，必须保持保存上下文兼容。
3. localStorage key 不应随意更改，否则用户历史与配置丢失。
4. 样式中大量 `!important`，拆分后需保持注入顺序。
5. 事件监听可能绑定在 `document`、`window.parent.document`，迁移时必须可清理。

## 8. 验收标准

- 测试版打包后能正常加载表格。
- 主题切换、夜间模式、设置弹窗、快捷选项、搜索、分页、单元格编辑、行排序、表格排序、历史恢复均可用。
- localStorage 原有配置可读取。
- 多次刷新或重新初始化不会重复注入样式或重复绑定事件。
- 大表格场景下内存增长可控。
