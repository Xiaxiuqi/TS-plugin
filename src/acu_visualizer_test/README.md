# ACU Visualizer 测试版

## 当前推荐加载方式

测试版现在使用现有项目构建链路输出单文件产物。

酒馆助手推荐加载：

```js
import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js'
```

对应发布产物：

```text
public/acu_visualizer_test/index.js
public/acu_visualizer_test/index.js.map
```

## 源码位置

源码已整体迁移到：

```text
src/acu_visualizer_test/
```

目录说明：

```text
src/acu_visualizer_test/core/      核心桥接、状态、存储、生命周期、调度
src/acu_visualizer_test/modules/   表格、编辑、排序、搜索、弹窗、保存等模块
src/acu_visualizer_test/styles/    从原 addStyles()/injectSearchStyles() 等价迁移的 CSS
src/acu_visualizer_test/docs/      迁移记录、矩阵、测试清单、优化计划
src/acu_visualizer_test/main.js    测试版主装配逻辑
src/acu_visualizer_test/index.js   pnpm build 扫描的构建入口
```

## 构建方式

### 全量构建

```bash
pnpm build
```

该命令会按项目既有规则构建所有 `src/**/index.{ts,tsx,js,jsx}` 入口。

### 单入口构建

如只需要构建 ACU Visualizer 测试版，不希望同时重新生成浮岛等其他入口产物，可以使用，并且优先使用：

```bash
pnpm build:entry --env entry=src/acu_visualizer_test/index.js
```

该命令仍使用既有 `webpack.config.ts`，只是通过 `--env entry=...` 选择单个入口。

构建输出：

```text
dist/acu_visualizer_test/index.js
```

然后同步到发布目录：

```text
public/acu_visualizer_test/index.js
```

## public 目录规则

`public/acu_visualizer_test/` 现在只作为发布产物目录，不再存放源码。

允许保留：

```text
index.js
index.js.map
```

不应再放置：

```text
core/
modules/
styles/
docs/
main.js
loader.js
version.js
```

## CSS 策略

CSS 已从原脚本等价迁移：

- `injectSearchStyles()` → `src/acu_visualizer_test/styles/search.css`
- `addStyles()` → `src/acu_visualizer_test/styles/table.css`

构建入口 `src/acu_visualizer_test/index.js` 会将 CSS 作为 raw 字符串内联到单文件产物中，不再运行时 fetch CSS，也不再使用 loader/version 方案。

## 当前约束

- 不修改 `public/acu_visualizer/acu_visualizer.js`。
- 不修改 `public/acu_visualizer/acu_visualizer-test.js`。
- 不夹带内存优化。
- 不改变原 DOM class / selector。
- 不改变 localStorage key。
- 不改变数据库 API 语义。

## 神·数据库 API 调用摘要

ACU Visualizer 测试版通过全局对象 `window.AutoCardUpdaterAPI` 调用神·数据库能力。源码中实际访问入口由 `core/bridge.js` 封装为 `getDB()`，业务模块不直接拼接全局对象。

### 索引约定

- ACU Visualizer 前端表格行索引 `rowIndex` 是数据行的 0 基下标。
- 神·数据库 API 的 `rowIndex` 使用 1 表示第一行数据。
- 因此调用 `updateCell`、`updateRow`、`deleteRow` 时统一传入 `rowIndex + 1`。
- `rawData[tableKey].content[0]` 是表头；实际数据行写入位置是 `rawData[tableKey].content[rowIndex + 1]`。

### 当前使用的 API

#### `updateCell(tableName, rowIndex, colIdentifier, value)`

用于单元格编辑保存。测试版在 `cell_edit` 保存上下文中优先调用该接口，只更新当前单元格。

#### `updateRow(tableName, rowIndex, data)`

用于整行编辑保存，也用于合并用户编辑行的精准保存。`data` 是列名到单元格值的映射对象；测试版整行编辑弹窗按表格渲染规则暴露 `index > 0` 的可见列，隐藏的第 0 列不在弹窗中编辑。由于 `updateRow` 只能按列名映射保存，无表头可见列或重复表头列不能安全走精准保存，此时会强制回退到 `importTableAsJson` 全量保存。

#### `deleteRow(tableName, rowIndex)`

用于保存待删除行。测试版会将待删除行按行号倒序提交，避免删除前面的行后影响后续行号。

#### `importTableAsJson(jsonString)`

作为精准 API 保存失败或无法安全表达当前修改时的全量后备保存方案。调用前会先复制 `tableData`，再把待删除行应用到副本并序列化为 JSON 字符串提交，避免全量保存失败时污染运行态数据。

#### `refreshDataAndWorldbook()`

保存成功后如该接口存在，测试版会调用它刷新数据与世界书。该刷新失败会记录警告，但不回滚已经成功的表格保存。

### 保存策略

1. 单元格编辑优先走 `updateCell`。
2. 整行编辑优先走 `updateRow`；遇到无表头可见列或重复表头列时强制走 `importTableAsJson`。
3. 删除行优先走 `deleteRow`。
4. 精准 API 返回失败或抛出异常时，回退到 `importTableAsJson` 全量保存。
5. 保存成功后清理待删除状态、刷新 diff 状态，并重新渲染表格内容。
