# CSS 迁移记录

本记录覆盖 ACU Visualizer 测试版 CSS 从原单文件脚本迁移到源码目录，并最终通过现有 `pnpm build` 内联进单文件发布产物的过程。

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改 `public/acu_visualizer/acu_visualizer-test.js`：否。
- 是否修改原插件 CSS 注入逻辑：否。
- 是否夹带内存优化：否。
- 是否改变 DOM class：否。
- 是否改变选择器：否。
- 当前源码目录：`src/acu_visualizer_test/`。
- 当前发布目录：`public/acu_visualizer_test/`。
- 当前推荐加载入口：`https://ts-plugin.pages.dev/acu_visualizer_test/index.js`。

## 1. 迁移来源

来源文件：

```text
public/acu_visualizer/acu_visualizer-test.js
```

来源区域：

1. `injectSearchStyles()` 中的 `style.textContent`。
2. `addStyles()` 中的 `const styles = \`<style id="${SCRIPT_ID}-styles">...` 样式内容。

## 2. 目标源码文件

| 目标源码文件                                         | 内容                                               |
| ---------------------------------------------------- | -------------------------------------------------- |
| `src/acu_visualizer_test/styles/search.css`          | 完整迁移 `injectSearchStyles()` 的搜索栏与高亮样式 |
| `src/acu_visualizer_test/styles/table.css`           | 完整迁移 `addStyles()` 的主样式内容                |
| `src/acu_visualizer_test/styles/theme.css`           | 保留拆分占位，不放置额外规则，避免改变原版行为     |
| `src/acu_visualizer_test/styles/animations.css`      | 保留拆分占位，不放置额外规则，避免改变原版行为     |
| `src/acu_visualizer_test/styles/dialogs.css`         | 保留拆分占位，不放置额外规则，避免改变原版行为     |
| `src/acu_visualizer_test/styles/shortcut-dialog.css` | 保留拆分占位，不放置额外规则，避免改变原版行为     |

说明：为了确保 CSS 与原版完全一致，主样式没有强行拆到多个文件，而是将原 `addStyles()` 的完整样式内容放入 `table.css`。其他 CSS 文件只保留占位说明，不新增规则，避免因拆分遗漏或顺序变化造成视觉差异。

## 3. 构建与加载方式

当前不再推荐运行时加载源码模块，也不再推荐 loader/version 方案。

当前源码入口：

```text
src/acu_visualizer_test/index.js
```

当前主装配逻辑：

```text
src/acu_visualizer_test/main.js
```

当前构建命令：

```bash
pnpm build
```

如只需要构建 ACU Visualizer 测试版，可使用单入口构建：

```bash
pnpm build:entry --env entry=src/acu_visualizer_test/index.js
```

该命令仍使用既有 `webpack.config.ts`，只选择指定入口，不会同时重新生成浮岛等其他入口产物。

构建输出：

```text
dist/acu_visualizer_test/index.js
dist/acu_visualizer_test/index.js.map
```

发布产物目录：

```text
public/acu_visualizer_test/index.js
public/acu_visualizer_test/index.js.map
```

酒馆助手推荐加载：

```js
import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js'
```

CSS 处理方式：

- `src/acu_visualizer_test/index.js` 使用 `?raw` 导入 `table.css` 与 `search.css`。
- 构建时 CSS 被内联进 `index.js`。
- 浏览器运行时不再 fetch `styles/*.css`。
- 浏览器运行时不再 import `loader.js`、`version.js` 或 `main.js`。

## 4. 一致性校验

已执行脚本从原文件重新提取 CSS，并与目标源码 CSS 文件逐字节比对。

校验结果：

```json
{
  "searchEqual": true,
  "tableEqual": true,
  "searchHash": "8f58f686c11aa16ee7f4fe9b0b6c2a49c3c4f2483d824f9e65b0089fb8cfdff8",
  "tableHash": "61d8b827eeea0595ef592ec3d9a9c9c380d623914f65bc95122058bae5d5e986",
  "searchLength": 2374,
  "tableLength": 103924,
  "tableLines": 2195,
  "searchLines": 70
}
```

结论：

- `src/acu_visualizer_test/styles/search.css` 与原 `injectSearchStyles()` 内容一致。
- `src/acu_visualizer_test/styles/table.css` 与原 `addStyles()` 中 `<style>` 内部内容一致。

## 5. 构建验证

已执行：

```bash
pnpm build
```

现有 webpack 配置成功扫描：

```text
src/acu_visualizer_test/index.js
```

并输出：

```text
dist/acu_visualizer_test/index.js
dist/acu_visualizer_test/index.js.map
```

随后已同步到：

```text
public/acu_visualizer_test/index.js
public/acu_visualizer_test/index.js.map
```

## 6. 原插件影响确认

确认未修改：

```text
public/acu_visualizer/acu_visualizer.js
public/acu_visualizer/acu_visualizer-test.js
```

因此当前正式插件不会被本次测试版迁移直接影响。

## 7. public 目录规则

`public/acu_visualizer_test/` 现在只作为发布产物目录。

允许保留：

```text
index.js
index.js.map
```

不再保留源码目录或运行时 loader：

```text
core/
modules/
styles/
docs/
main.js
loader.js
version.js
```

## 8. 回归验证建议

浏览器侧需要继续验证：

1. 使用 `import 'https://ts-plugin.pages.dev/acu_visualizer_test/index.js'` 加载。
2. 通知样式可见。
3. 表格容器主题、夜间模式、按钮、分页、搜索栏样式与原版一致。
4. 设置弹窗、快捷弹窗、单元格菜单、编辑弹窗样式与原版一致。
5. 搜索高亮 `mark.acu-search-match-text` 与原版一致。
6. 行拖拽、表格拖拽的 hover/drop 样式与原版一致。
7. 不再出现跨域 `cssRules` SecurityError。
8. 不再请求 `acu_visualizer_test/styles/*.css`。
9. 不再请求 `acu_visualizer_test/loader.js` 或 `acu_visualizer_test/version.js`。

## 9. 回滚方式

如需回滚本次单文件构建迁移：

1. 恢复 `public/acu_visualizer_test/` 下原源码目录。
2. 恢复对应源码加载说明。
3. 删除 `src/acu_visualizer_test/` 或回退到迁移前版本。
4. 删除 `public/acu_visualizer_test/index.js` 与 `index.js.map`。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
