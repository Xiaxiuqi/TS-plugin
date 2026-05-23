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

如只需要构建 ACU Visualizer 测试版，不希望同时重新生成浮岛等其他入口产物，可以使用：

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
