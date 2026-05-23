<!-- LIMCODE_SOURCE_ARTIFACT_START -->
{"type":"design","path":".limcode/design/acu-visualizer-模块迁移优先设计.md","contentHash":"sha256:46b23695dee2034e97fede127dee8bf18b3892002b7c5ab919439f769a6cba3f"}
<!-- LIMCODE_SOURCE_ARTIFACT_END -->

## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 建立优化前基线：记录数据规模、localStorage 占用、DOM 节点数、Heap/Performance 基线  `#mem-l0-1`
- [x] 补齐内存优化验收表与回归表，明确每阶段通过/回滚标准  `#mem-l0-2`
- [x] 规划并实施 destroy/重复初始化清理增强，仅清理测试版 DOM、事件、计时器、观察器和临时状态  `#mem-l1-1`
- [x] 规划并实施事件生命周期登记与跨 document 监听清理，验证热重载/刷新不叠加监听  `#mem-l1-2`
- [x] 规划并实施弹窗/菜单/通知残留清理，验证打开关闭循环无 DOM 泄漏  `#mem-l1-3`
- [ ] 规划并实施状态缓存清理：不存在表格的 diff/userEdit/pendingDelete/rowMapping/pagination 清理  `#mem-l2-1`
- [ ] 规划快照轻量化兼容层：旧快照只读兼容，新 hash 快照 feature flag 试运行  `#mem-l2-2`
- [ ] 规划单元格历史容量治理：总量上限、过长值处理、旧格式读取兼容与可回滚策略  `#mem-l2-3`
- [ ] 规划当前激活 tab 懒渲染与 fallback，先只设计不直接替换完整渲染路径  `#mem-l3-1`
- [ ] 规划局部 patch 与搜索高亮 debounce/限制策略，明确保持视觉一致的验证点  `#mem-l3-2`
- [ ] 评估虚拟滚动、Worker diff、IndexedDB 历史库是否有必要，未达触发条件则暂不实施  `#mem-l4-1`
<!-- LIMCODE_TODO_LIST_END -->

# ACU Visualizer 内存优化详细逐步实施计划

## 0. 当前状态确认

当前用户已确认测试版当前功能无问题，已完成：

- 源码整体迁移到 `src/acu_visualizer_test/`。
- `public/acu_visualizer_test/` 只保留发布产物 `index.js` / `index.js.map`。
- 使用现有 webpack 构建链，并支持单入口构建：

```bash
pnpm build:entry --env entry=src/acu_visualizer_test/index.js
```

- 酒馆助手推荐加载：

```js
import('https://ts-plugin.pages.dev/acu_visualizer_test/index.js')
```

- 已修复并由用户确认：
  - iframe/about:srcdoc 自动加载环境下 CSS 注入到父页面。
  - 加载成功通知重复。
  - 行内容排序。
  - 删除行。
  - 搜索按钮。
  - 月相盒星尘/粒子 DOM 结构已按原版恢复。

当前用户要求：**先不要继续实现，先详细计划下一步优化。**

---

## 1. 已完成阶段

### L0.1 基线记录文档

已新增：

```text
src/acu_visualizer_test/docs/memory-baseline-record-20260517.md
```

用途：提供浏览器控制台基线采集脚本，记录 DOM、localStorage、表格规模和 performance.memory。

### L0.2 阶段验收表

已新增：

```text
src/acu_visualizer_test/docs/memory-optimization-stage-checklist.md
```

用途：规定每个阶段的功能回归、内存指标、回滚条件。

### L1.1 destroy/重复初始化清理增强

已完成：

- 增强 `window.ACUVisualizerTest.destroy()`。
- 清理测试版 DOM、样式、通知队列、临时状态和 `.acu` 命名空间事件。
- 增加 `clearNotifications()`。
- 已构建同步 `public/acu_visualizer_test/index.js`。

### 迁移视觉修复：月相盒结构恢复

已恢复：

```html
.acu-glow-particle.acu-p1 ~ .acu-p8
.acu-star-dust.s1 ~ .s5
```

原因：原版 CSS 仍存在，但模块化渲染 HTML 里漏掉粒子和星尘 DOM。该修复不是内存优化，不会作为优化目标删除。

---

## 2. 下一步总体策略

下一步只做 L1 低风险泄漏治理，不进入 L2/L3。

推荐顺序：

1. L1.2-A：只规划并实现事件登记能力，不替换业务事件。
2. L1.2-B：替换单元格菜单的跨 document click 监听。
3. L1.2-C：替换顺序菜单的跨 document click 监听。
4. L1.2-D：构建并做最小回归。
5. L1.3-A：只给弹窗 close/remove 增加统一清理函数，不改弹窗结构。
6. L1.3-B：逐个弹窗接入清理函数。
7. L1.3-C：构建并做完整 L1 回归。

每一步都应单独可回滚。

---

# 3. L1.2 事件生命周期登记详细计划

## 3.1 目标

清理散落的原生监听：

```js
document.addEventListener('click', handler)
window.parent.document.addEventListener('click', handler)
```

防止重复 import / 热重载后 handler 留在旧 document 上。

## 3.2 当前已发现的监听点

### 3.2.1 单元格菜单

文件：

```text
src/acu_visualizer_test/modules/cell-editor.js
```

当前代码：

```js
document.addEventListener('click', closeMenu, { once: false });
window.parent.document.addEventListener('click', closeMenu, { once: false });
```

并使用：

```js
window.acuCellMenuCloseHandler
```

风险：

- 在 iframe/about:srcdoc 环境下，`window.acuCellMenuCloseHandler` 位于 iframe window，不一定等同父页面 window。
- 重复加载后旧 handler 可能留在父 document 上。
- 点击菜单项后需要同步移除两个 document 上的 handler。

### 3.2.2 顺序菜单

文件：

```text
src/acu_visualizer_test/modules/table-sort.js
```

当前代码：

```js
document.addEventListener('click', closeOrderMenu);
window.parent.document.addEventListener('click', closeOrderMenu);
```

风险：

- 与单元格菜单类似。
- 菜单关闭逻辑必须不能影响“编辑标签顺序”和“编辑行内容顺序”的点击。

## 3.3 建议新增能力

文件：

```text
src/acu_visualizer_test/core/scheduler.js
```

在 `createSchedulerRegistry()` 中新增：

```js
const eventListeners = new Set();

addEventListener(target, type, handler, options) {
  if (!target || typeof target.addEventListener !== 'function') return null;
  target.addEventListener(type, handler, options);
  const record = { target, type, handler, options };
  eventListeners.add(record);
  return record;
},

removeEventListener(record) {
  if (!record) return;
  record.target?.removeEventListener?.(record.type, record.handler, record.options);
  eventListeners.delete(record);
},

clearAll() {
  ...
  eventListeners.forEach(record => {
    record.target?.removeEventListener?.(record.type, record.handler, record.options);
  });
  eventListeners.clear();
}
```

注意：

- 不改变 `setTimeout` 和 `observer` 原行为。
- 只增加登记能力。
- `options` 必须保存同一个引用，确保 remove 可以匹配。

## 3.4 registry 传递方式

文件：

```text
src/acu_visualizer_test/core/lifecycle.js
src/acu_visualizer_test/main.js
```

当前 `createLifecycle(deps)` 内部创建 registry：

```js
const registry = deps.schedulerRegistry || createSchedulerRegistry();
```

计划：

- 不改变这个逻辑。
- 将 registry 暴露给 deps：

```js
deps.schedulerRegistry = registry;
```

或者在 lifecycle 返回对象中暴露：

```js
return { ..., registry }
```

更推荐第一种：`deps.schedulerRegistry = registry`，因为 `cell-editor.js` / `table-sort.js` 已经接收 deps。

## 3.5 单元格菜单替换计划

文件：

```text
src/acu_visualizer_test/modules/cell-editor.js
```

### 第一步：局部 helper

新增局部函数或直接在 `showCellMenu()` 中处理：

```js
const closeRecords = [];
const addCloseListener = target => {
  const record = deps.schedulerRegistry?.addEventListener?.(target, 'click', closeMenu, { once: false });
  if (record) closeRecords.push(record);
};
const removeCloseListeners = () => {
  closeRecords.forEach(record => deps.schedulerRegistry?.removeEventListener?.(record));
  closeRecords.length = 0;
};
```

### 第二步：替代全局 handler

减少使用：

```js
window.acuCellMenuCloseHandler
```

但为了兼容旧残留，可以保留旧清理：

```js
if (window.acuCellMenuCloseHandler) { ...旧 remove... }
```

新路径使用 registry 管理。

### 第三步：关闭时统一 remove

菜单项点击、点击外部关闭时都调用：

```js
removeCloseListeners();
$menu.off('.acu').remove();
```

## 3.6 顺序菜单替换计划

文件：

```text
src/acu_visualizer_test/modules/table-sort.js
```

与单元格菜单同理，但不使用全局变量。

关闭时：

```js
removeCloseListeners();
$menu.off('.acu').remove();
```

菜单项点击后也清理。

## 3.7 L1.2 风险点

| 风险 | 影响 | 避免方式 |
| --- | --- | --- |
| 点击菜单立即关闭 | 单元格菜单无法点选 | 保留 setTimeout 延迟注册外部点击监听 |
| iframe 与 parent document 不一致 | 自动加载环境失效 | 同时监听 iframe document 与 parent document，但由 registry 统一清理 |
| removeEventListener options 不匹配 | handler 残留 | 保存 record 中的原 options 引用 |
| 菜单项点击后 handler 未清理 | 重复触发 | 菜单项点击和外部点击都调用 removeCloseListeners |
| destroy 时清掉过多事件 | 其他功能失效 | 只清理通过 registry 登记的原生事件和 `.acu` 命名空间事件 |

## 3.8 L1.2 验证项

最小回归：

1. 单元格菜单可打开。
2. 单元格菜单点击外部可关闭。
3. 单元格菜单点击“编辑”正常。
4. 单元格菜单点击“历史记录”正常。
5. 单元格菜单点击“删除整行”正常。
6. 顺序菜单可打开。
7. 顺序菜单点击外部可关闭。
8. 顺序菜单点击“编辑标签顺序”正常。
9. 顺序菜单点击“编辑行内容顺序”正常。
10. 连续 `import(...?x=1)`, `import(...?x=2)`, `import(...?x=3)` 后菜单点击不重复触发。

控制台检查：

```js
(() => {
  const root = window.parent && window.parent !== window ? window.parent : window;
  const doc = root.document;
  console.log('[ACU L1.2 CHECK]', {
    tableContainers: doc.querySelectorAll('.acu-table-container').length,
    menus: doc.querySelectorAll('.acu-cell-menu').length,
    orderMenus: doc.querySelectorAll('.acu-order-menu').length,
    hasACU: !!root.ACUVisualizerTest,
    hasRegistry: !!root.ACUVisualizerTest?.deps?.schedulerRegistry,
  });
})();
```

---

# 4. L1.3 弹窗/菜单/通知残留清理详细计划

## 4.1 目标

在不改变弹窗结构和功能的前提下，确保弹窗/菜单关闭时：

- 事件解绑。
- DOM 移除。
- 临时变量不长期残留。
- 通知队列可在 destroy 时彻底释放。

## 4.2 当前涉及文件

```text
src/acu_visualizer_test/modules/settings-dialog.js
src/acu_visualizer_test/modules/cell-history.js
src/acu_visualizer_test/modules/shortcut-dialog.js
src/acu_visualizer_test/modules/cell-editor.js
src/acu_visualizer_test/modules/table-sort.js
src/acu_visualizer_test/modules/notifications.js
```

## 4.3 建议新增轻量工具

可以新增文件：

```text
src/acu_visualizer_test/core/dom-cleanup.js
```

或者先放在 `main.js` / 各模块局部函数中。

更推荐新增小工具文件，职责明确：

```js
export function removeWithEvents($el) {
  if (!$el) return;
  try {
    $el.off?.('.acu');
    $el.find?.('*')?.off?.('.acu');
    $el.remove?.();
  } catch (error) {
    $el.remove?.();
  }
}

export function removeTransientUi($, root = document) {
  $(root)
    .find('.acu-cell-menu, .acu-order-menu, .acu-edit-overlay, .acu-settings-overlay, .acu-history-overlay, .acu-shortcut-lite-overlay')
    .each(function () {
      removeWithEvents($(this));
    });
}
```

注意：

- 不处理 `.acu-table-container`，避免误删主表格。
- 不处理 style，style 仍由 destroyRuntime 处理。
- 不改 CSS。

## 4.4 弹窗逐个接入计划

### 4.4.1 settings-dialog.js

当前关闭：

```js
$('.acu-settings-overlay').remove()
```

计划替换为：

```js
closeSettingsDialog($overlay)
```

关闭前：

```js
$overlay.off('.acu');
$overlay.find('*').off('.acu');
$overlay.remove();
```

事件绑定统一改为 `.on('click.acu', ...)`。

风险点：保存设置、重置设置、清理存储不能失效。

### 4.4.2 cell-history.js

当前关闭：

```js
$dialog.remove()
```

计划：

- 历史项点击恢复后清理事件并移除。
- 点击关闭按钮清理事件并移除。
- 点击 overlay 背景清理事件并移除。

风险点：恢复历史值后仍要保存数据库。

### 4.4.3 shortcut-dialog.js

当前关闭：

```js
const close = () => $overlay.remove();
```

计划：

```js
const close = () => removeWithEvents($overlay);
```

事件命名空间：

```js
.on('click.acu', ...)
.on('mousedown.acu', ...)
.on('mouseup.acu', ...)
```

风险点：保存配置、立即手动更新、打开可视化编辑器不能失效。

### 4.4.4 cell-editor.js

编辑弹窗：

```js
$editOverlay.remove()
```

计划改为：

```js
removeWithEvents($editOverlay)
```

风险点：保存编辑、取消编辑、ESC、Ctrl+Enter 保持原行为。

### 4.4.5 table-sort.js / 菜单

结合 L1.2，把菜单关闭统一改为：

```js
removeWithEvents($menu)
```

风险点：点击菜单项后不能提前移除导致 action 取不到。

## 4.5 L1.3 验证项

1. 设置弹窗打开关闭 10 次。
2. 设置保存正常。
3. 重新分析存储正常。
4. 清理确认弹窗正常。
5. 历史弹窗打开关闭 10 次。
6. 历史恢复正常。
7. 编辑弹窗保存/取消/ESC/Ctrl+Enter 正常。
8. 快捷选项弹窗保存配置正常。
9. 快捷选项立即更新正常。
10. 打开可视化编辑器按钮正常。
11. 通知显示/消失正常。
12. destroy 后临时 UI 数量为 0。

控制台：

```js
(() => {
  const root = window.parent && window.parent !== window ? window.parent : window;
  const doc = root.document;
  console.log('[ACU L1.3 TRANSIENT UI CHECK]', {
    cellMenus: doc.querySelectorAll('.acu-cell-menu').length,
    editOverlays: doc.querySelectorAll('.acu-edit-overlay').length,
    settingsOverlays: doc.querySelectorAll('.acu-settings-overlay').length,
    historyOverlays: doc.querySelectorAll('.acu-history-overlay').length,
    shortcutOverlays: doc.querySelectorAll('.acu-shortcut-lite-overlay').length,
    notifications: doc.querySelectorAll('.acu-notification').length,
  });
})();
```

---

# 5. 当前暂停点

当前不继续修改业务代码。

下一次如果确认开始，应从 L1.2-A 开始：

1. 在 `scheduler.js` 增加 event listener registry。
2. 在 `lifecycle.js` 或 `main.js` 将 registry 暴露给 deps。
3. 只替换 `cell-editor.js` 的外部点击监听。
4. 构建并测试单元格菜单。
5. 再替换 `table-sort.js`。

---

# 6. 明确不做的事

下一步不做：

- 不做快照格式变更。
- 不做历史记录分片。
- 不做懒渲染。
- 不做局部 patch。
- 不做 CSS 删除/压缩。
- 不删除月相盒星尘、粒子等视觉结构。
- 不修改正式版文件。
