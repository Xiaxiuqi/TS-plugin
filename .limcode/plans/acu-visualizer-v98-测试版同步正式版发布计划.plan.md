## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [ ] 后续单独规划测试版内部命名清理：ACUVisualizerTest 等测试命名改为正式命名，先在测试版验证，不夹带正式发布  `#future-naming-1`
- [x] 紧急修复正式版发布入口：按用户确认方式直接从 public/acu_visualizer_test/ 复制到 public/acu_visualizer/，只修改版本号，并以 index.js 作为正式入口  `#hotfix-index-release`
- [x] 确认正式版发布目标：保持用户原地址 public/acu_visualizer/acu_visualizer.js 不变，内部测试命名本次不重命名  `#release-9-8-1`
- [x] 备份旧正式版 public 文件，并在 src/数据库前端/acu_visualizer/v9.8-src 中复制当前测试版源文件  `#release-9-8-2`
- [x] 仅调整用户可见版本标识到 v9.8/9.8.0，不改 ACUVisualizerTest 等内部运行态命名  `#release-9-8-3`
- [x] 使用现有 build:entry 构建 src/acu_visualizer_test/index.js，确认 dist/acu_visualizer_test/index.js 产物正常  `#release-9-8-4`
- [x] 将 dist/acu_visualizer_test/index.js 发布为 public/acu_visualizer/acu_visualizer.js，并处理 sourcemap 对应关系  `#release-9-8-5`
- [x] 保留 public/acu_visualizer/acu_visualizer-test.js，不破坏旧测试入口  `#release-9-8-6`
- [x] 执行发布后静态校验与最小回归：原地址可加载、版本显示 v9.8、核心功能无异常  `#release-9-8-7`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer v9.8 测试版同步正式版发布计划

## 0. 当前决策

本计划以“正式版不出问题”为最高目标。

本次 v9.8 正式版发布只保证用户原加载地址不变：

```js
import('https://ts-plugin.pages.dev/acu_visualizer/acu_visualizer.js')
```

发布后的正式版文件仍是：

```text
public/acu_visualizer/acu_visualizer.js
```

**本次不重命名内部测试命名。**

也就是说，本次允许继续保留：

```js
window.ACUVisualizerTest
__ACU_VISUALIZER_TEST_BUNDLED_CSS__
acu-visualizer-test-style-loader
bootstrapAcuVisualizerTest()
initAcuVisualizerTest()
```

理由：这些命名已经在当前测试版稳定验证过，贸然重命名会影响 destroy、重复加载清理、CSS 注入、iframe/parent window 暴露、通知防重复等链路。

后续再单独开一个“测试版内部命名正式化”阶段，先在测试版完整验证，再考虑同步正式版。

---

## 1. 本次发布目标

1. 备份当前正式版文件。
2. 将当前稳定测试版源码备份到：

```text
src/数据库前端/acu_visualizer/v9.8-src/
```

3. 使用当前测试版入口构建：

```text
src/acu_visualizer_test/index.js
```

4. 将构建产物发布为正式版文件：

```text
public/acu_visualizer/acu_visualizer.js
```

5. 用户不需要修改当前插件地址。
6. 只改必要的版本标识到 v9.8。
7. 不进行内部全局对象重命名。
8. 不删除旧测试入口。

---

## 2. 本次不做的事

本次明确不做：

- 不把 `ACUVisualizerTest` 改成 `ACUVisualizer`。
- 不把 `__ACU_VISUALIZER_TEST_BUNDLED_CSS__` 改成 `__ACU_VISUALIZER_BUNDLED_CSS__`。
- 不把 `acu-visualizer-test-style-loader` 改成 `acu-visualizer-style-loader`。
- 不改 `bootstrapAcuVisualizerTest()` / `initAcuVisualizerTest()` 名称。
- 不删除 `public/acu_visualizer/acu_visualizer-test.js`。
- 不改数据库 API。
- 不改 localStorage key。
- 不改 CSS class 和 DOM class。

这些命名清理留到后续测试版单独计划。

---

## 3. 推荐目录结构

当前 `src/数据库前端/acu_visualizer/` 已存在，里面有旧 `acu_visualizer.js`。

本次建议整理为：

```text
src/数据库前端/acu_visualizer/
  v9.8-src/
    core/
    modules/
    styles/
    docs/
    index.js
    main.js
    README.md
  legacy-public-backup/
    acu_visualizer.js
    acu_visualizer-test.js
```

说明：

- `v9.8-src/`：当前测试版源码快照，作为正式版源码备份。
- `legacy-public-backup/`：发布前旧正式版 public 文件备份，便于回滚。

---

## 4. 版本号策略

本次只更新必要版本显示，不改内部运行态命名。

最低修改：

1. 表格标题：

```text
v9.6 -> v9.8
```

位置：

```text
src/acu_visualizer_test/modules/table-renderer.js
```

2. 运行态版本值：

```js
api.version = '9.8.0'
```

位置：

```text
src/acu_visualizer_test/main.js
```

注意：

- `api.version` 的值可以改为 `9.8.0`。
- `api` 暴露对象名仍保留 `ACUVisualizerTest`。
- 这样用户和调试者能看到版本是 9.8，但不会影响运行链路。

---

## 5. 构建和发布映射

构建命令：

```bash
pnpm build:entry --env entry=src/acu_visualizer_test/index.js
```

构建产物：

```text
dist/acu_visualizer_test/index.js
dist/acu_visualizer_test/index.js.map
```

发布映射：

```text
dist/acu_visualizer_test/index.js
-> public/acu_visualizer/acu_visualizer.js
```

```text
dist/acu_visualizer_test/index.js.map
-> public/acu_visualizer/acu_visualizer.js.map
```

需要检查 `acu_visualizer.js` 末尾 sourcemap：

```js
//# sourceMappingURL=index.js.map
```

如存在，应修正为：

```js
//# sourceMappingURL=acu_visualizer.js.map
```

这只影响调试，不影响运行。

---

## 6. 为什么不重命名内部对象

内部重命名会牵涉：

- 重复 import 前的旧实例销毁：`hostWindow.ACUVisualizerTest?.destroy?.()`。
- iframe 与 parent window 之间的 CSS 字符串传递。
- style loader id 去重。
- 通知防重复标记。
- 控制台调试入口。
- 文档和基线脚本引用。

这些都是当前测试版已经验证过的链路。

本次发布目标是正式版稳定，因此只做“产物文件名映射”，不做“内部命名重构”。

---

## 7. 发布后校验

静态校验：

1. 存在：

```text
public/acu_visualizer/acu_visualizer.js
public/acu_visualizer/acu_visualizer.js.map
```

2. 原地址可加载：

```js
import('https://ts-plugin.pages.dev/acu_visualizer/acu_visualizer.js')
```

3. 不要求存在：

```text
public/acu_visualizer/index.js
```

4. 版本显示：

```text
v9.8
```

5. 控制台版本：

```js
window.ACUVisualizerTest?.version
```

应为：

```text
9.8.0
```

功能回归：

1. 进入聊天表格正常显示。
2. 数据库更新后新行和高亮自动刷新。
3. 手动更新后自动刷新。
4. 单元格编辑保存正常。
5. 历史记录查看/恢复正常。
6. 删除行、恢复删除、保存删除正常。
7. 行排序正常。
8. 标签排序正常。
9. 夜间模式和主题正常。
10. 快捷选项读取数据库 API 参数正常。
11. 控制台无运行错误。

---

## 8. 回滚方案

如果发布后正式版异常，恢复：

```text
src/数据库前端/acu_visualizer/legacy-public-backup/acu_visualizer.js
-> public/acu_visualizer/acu_visualizer.js
```

如旧测试文件也受影响，则恢复：

```text
src/数据库前端/acu_visualizer/legacy-public-backup/acu_visualizer-test.js
-> public/acu_visualizer/acu_visualizer-test.js
```

用户地址不需要改。

---

## 9. 后续单独计划：内部测试命名正式化

后续可以另开测试版阶段，专门处理内部命名正式化。

目标：

```js
ACUVisualizerTest -> ACUVisualizer
__ACU_VISUALIZER_TEST_BUNDLED_CSS__ -> __ACU_VISUALIZER_BUNDLED_CSS__
acu-visualizer-test-style-loader -> acu-visualizer-style-loader
bootstrapAcuVisualizerTest -> bootstrapAcuVisualizer
initAcuVisualizerTest -> initAcuVisualizer
```

但该阶段必须满足：

1. 只在测试版先改。
2. 保留旧 alias 一段时间：

```js
window.ACUVisualizerTest = window.ACUVisualizer
```

3. 验证重复加载 destroy 正常。
4. 验证 iframe/parent CSS 注入正常。
5. 验证通知防重复正常。
6. 验证所有调试脚本更新。
7. 测试稳定后再考虑正式版同步。

---

## 10. 当前结论

本次 v9.8 发布建议：

- 用户地址不变；
- 正式版文件名保持 `acu_visualizer.js`；
- 内部测试命名暂不改；
- 只改必要版本号；
- 发布前备份旧正式版；
- 发布后执行静态校验和最小功能回归；
- 内部命名正式化留到下一轮测试版计划。

等待用户确认后再执行。
