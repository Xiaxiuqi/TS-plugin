# ACU Visualizer 内存占用优化计划

## 1. 优化背景

当前 `acu_visualizer-test.js` 是约 7,467 行、约 295 KB 的单文件脚本。主要内存压力来自：

1. 大量内联 CSS 字符串常驻闭包。
2. 表格渲染时一次性拼接大型 HTML 字符串。
3. 表格刷新可能重复创建 DOM、重复绑定事件。
4. `localStorage` 保存完整数据快照与单元格历史，数据量增长后占用明显。
5. `currentDiffMap`、`currentUserEditMap`、`pendingDeletes`、分页与行映射等状态长期保留。
6. 搜索高亮使用 `mark` 替换 HTML 时可能造成额外 DOM 与字符串复制。
7. 监听器和菜单关闭回调挂在 `document` / `parent.document` 上，如未清理会泄漏引用。

## 2. 总体优化目标

- 减少常驻大字符串。
- 降低完整重渲染频率。
- 控制历史、快照、映射缓存上限。
- 统一事件委托，减少每个单元格/行单独绑定。
- 建立销毁机制，避免重复初始化后内存泄漏。
- 将重计算与 DOM 更新节流到合理频率。

## 2.0 当前状态：内存优化冻结

根据最新实施策略，当前阶段 **不进行实际内存优化**。

内存优化计划暂时作为后续路线保留，但不会进入实现。必须等待以下条件全部满足后，才能创建新的内存优化实施计划：

1. 测试版模块迁移矩阵中的所有模块均达到“测试通过”。
2. 模块迁移全量回归测试通过。
3. CSS 零破坏检查通过。
4. 确认模块迁移期间没有夹带优化。
5. 确认原插件功能和 CSS 没有异常。

在此之前，以下优化全部冻结：

- 快照 hash 化。
- 历史记录分片。
- 当前 tab 懒渲染。
- 当前页局部 patch。
- 虚拟滚动。
- Worker diff。
- IndexedDB 历史库。
- CSS 构建期压缩。
- 事件委托重构。
- localStorage 写入节流。

## 2.1 零破坏实施说明

内存优化必须服务于稳定性，不能以牺牲现有功能或 CSS 表现为代价。

当前阶段不改动原插件运行逻辑，只记录优化方向。后续实际实施时必须遵守：

- CSS 优化先复制和对照，不直接替换原样式注入。
- DOM 渲染优化先在测试版入口验证，不影响正式脚本。
- localStorage 优化必须兼容旧 key 和旧数据格式。
- 事件委托改造不能改变原有点击、拖拽、编辑、保存、刷新等触发条件。
- 快照与历史优化必须提供旧格式读取兼容和回滚方案。

## 2.2 最大化内存优化分层路线

为在不影响原功能和 CSS 的前提下尽可能降低内存占用，优化分为 L0-L4 五层：

| 层级 | 名称           | 目标                                        | 风险       |
| ---- | -------------- | ------------------------------------------- | ---------- |
| L0   | 文档与检测层   | 建立基线、检查清单、回滚规则                | 无运行风险 |
| L1   | 泄漏治理层     | 清理重复监听、弹窗 DOM、跨 document 回调    | 低         |
| L2   | 常驻内存下降层 | 降低 CSS 字符串、状态缓存、快照、历史常驻量 | 中         |
| L3   | 峰值内存下降层 | 降低刷新、搜索、渲染、写入时的峰值内存      | 中高       |
| L4   | 最大收益重构层 | 虚拟滚动、Worker diff、IndexedDB 历史       | 高         |

详细路线见：`docs/memory-optimization-roadmap.md`。

### 当前阶段

当前仅进行 L0：文档、测量与安全边界建设。不会修改原插件功能，也不会修改原 CSS。

## 3. 分项优化方案

## 3.1 样式内存优化

### 问题

当前 CSS 通过多个超长模板字符串注入，字符串常驻在函数闭包中；每次构建 HTML 时也可能重复保留片段。

### 方案

1. 将 CSS 拆分到 `styles/*.css`。
2. 打包时只保留压缩后的 CSS 字符串。
3. 建立统一注入函数：

```js
function injectStyleOnce(id, cssText) {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}
```

1. 对搜索、快捷选项这类低频功能采用按需注入。
2. 销毁时可选择移除测试版样式节点。

### 预期收益

- 降低入口初始化时内存峰值。
- 避免重复样式节点。
- 提升后续维护性。

## 3.2 DOM 渲染优化

### 问题

当前表格渲染倾向一次性生成完整 HTML，数据量大时会产生：

- 大型字符串。
- 大量 DOM 节点。
- 多次刷新后的 GC 压力。

### 方案

1. 保持当前分页机制，并强制所有大表使用分页显示。
2. 只渲染当前激活 tab 的当前页内容。
3. 非激活 tab 不生成完整表格，只生成占位容器；首次点击时懒渲染。
4. 刷新时优先执行局部更新：
   - 表头不变时复用表格结构。
   - 仅更新变化的 `tbody`。
   - 当前页未变化时只更新变更单元格。
5. 后续可加入虚拟滚动：只渲染可视区域上下缓冲行。

### 建议渲染层 API

```js
renderShell(container, tableNames);
renderActiveTable(tableName, page);
patchCells(diffMap);
clearInactiveTables();
```

### 预期收益

- 大数据表下 DOM 节点显著减少。
- 刷新时内存峰值降低。
- 交互响应更稳定。

## 3.3 事件监听优化

### 问题

单元格、分页、菜单、行拖拽等功能可能绑定大量事件。完整重渲染后若未完全解绑，容易泄漏。

### 方案

1. 对表格容器使用事件委托：

```js
$container.on('click.acu', '.acu-editable-cell', handleCellClick);
$container.on('click.acu', '.acu-page-btn', handlePageClick);
```

1. 所有事件命名空间统一为 `.acu`。
2. 重新初始化前先执行：

```js
$(document).off('.acu');
$('.acu-table-container').off('.acu');
```

1. 对 `window.parent.document` 的监听统一登记到 `lifecycle` 模块。
2. 弹窗关闭时清理其内部事件和 DOM 引用。

### 预期收益

- 减少监听器数量。
- 避免重复初始化造成的闭包泄漏。
- 降低单元格数量对内存的线性影响。

## 3.4 快照与 Diff 优化

### 问题

当前 `STORAGE_KEY_LAST_SNAPSHOT` 保存完整数据快照，表格大时占用 localStorage 明显，读取和 JSON parse 也会消耗内存。

### 方案

1. 将完整快照改为轻量快照：
   - 表级 hash。
   - 行级 hash。
   - 必要时保留单元格 hash。
2. 仅在需要展示历史差异时读取完整旧值。
3. 对大型表格采用分表快照 key：

```text
acu_snapshot_meta_v1
acu_snapshot_sheet_<sheetId>_v1
```

1. 快照写入节流，避免连续刷新频繁 stringify。
2. 对 snapshot 加版本与时间戳，超过数量或天数自动清理。

### 轻量快照示例

```json
{
  "version": 1,
  "updatedAt": 1730000000000,
  "tables": {
    "人物状态": {
      "hash": "abc123",
      "rowHashes": ["r1", "r2"]
    }
  }
}
```

### 预期收益

- localStorage 占用下降。
- JSON parse/stringify 内存峰值下降。
- diff 计算更快。

## 3.5 单元格历史优化

### 问题

当前单元格历史以对象形式集中保存到一个 key，所有历史每次读取/写入都可能整体 parse/stringify。随着单元格数量增长，内存和写入成本会增大。

### 方案

1. 继续保留每个隔离 key 最多 10 条的限制。
2. 引入全局历史总量上限，例如：
   - 最多 500 个单元格有历史。
   - 最多 2,000 条历史项。
3. 改集中 key 为分片 key：

```text
acu_cell_history_index_v1
acu_cell_history_<tableHash>_<row>_<col>_v1
```

1. 历史值过长时截断或压缩：
   - 单条超过 4 KB 时只保留摘要和最近值。
2. 手动清理时只删除历史分片，不影响主题等关键设置。

### 预期收益

- 单次历史读取仅针对目标单元格。
- 避免完整历史对象反复进入内存。
- 降低 localStorage 单 key 过大的风险。

## 3.6 搜索高亮优化

### 问题

搜索若通过替换 `innerHTML` 插入 `mark`，可能造成大量字符串复制与 DOM 重建，并破坏事件绑定或原始内容。

### 方案

1. 搜索只作用于当前激活表格/当前页。
2. 输入使用 debounce，例如 200ms。
3. 清除高亮时避免整表重渲染，只处理曾高亮过的单元格列表。
4. 保存原始文本不使用 DOM 属性存大字符串，改用 WeakMap：

```js
const originalTextMap = new WeakMap();
```

1. 大表搜索时支持“最多高亮 N 项”，例如 200 项。

### 预期收益

- 搜索期间 DOM 改动减少。
- 避免大量 mark 节点长期滞留。

## 3.7 弹窗与菜单优化

### 问题

设置弹窗、历史弹窗、快捷选项弹窗包含大段 HTML。若反复打开关闭，可能保留事件闭包或未释放 DOM。

### 方案

1. 所有弹窗统一使用 `DialogManager`：
   - `open(id, renderFn)`
   - `close(id)`
   - `closeAll()`
2. 弹窗关闭时：
   - `.off('.acu')`
   - `remove()`
   - 清空临时引用。
3. 低频弹窗 HTML 按需生成，不在初始化时生成。
4. 对历史弹窗只渲染当前单元格历史，不预加载全部。

### 预期收益

- 降低长期 DOM 残留风险。
- 统一关闭逻辑，减少泄漏。

## 3.8 状态缓存优化

### 问题

`Set`、映射表、分页状态、拖拽状态长期存在，若表格切换或数据刷新后不清理，会累计无效 key。

### 方案

1. 每次完整刷新后清理不存在表格的状态：
   - diffMap
   - userEditMap
   - rowPositionMapping
   - currentPagination
2. 对 key 使用稳定结构，避免超长表名重复拼接占用：

```js
const tableNameToId = new Map();
// key: `${tableId}:${row}:${col}`
```

1. 当保存成功后清理用户编辑标记。
2. 当取消删除后清理 pendingDeletes。

### 预期收益

- 减少无效状态常驻。
- 大量表格名重复字符串减少。

## 3.9 localStorage 写入优化

### 问题

频繁 `localStorage.setItem` 会同步阻塞主线程，同时触发大字符串复制。

### 方案

1. 对滚动位置保存进行 throttle，例如 500ms。
2. 对分页、标签状态、配置保存合并批处理。
3. 写入前比较内容 hash，相同则跳过。
4. 大对象写入放到用户操作结束后执行，而不是每个小动作都写。

### 预期收益

- 减少同步阻塞。
- 降低字符串临时副本内存峰值。

## 3.10 生命周期销毁机制

### 问题

脚本重复加载、聊天切换、前端重载时，如果旧监听与 DOM 未清理，内存会持续增长。

### 方案

实现：

```js
function destroy() {
  $(document).off('.acu');
  $(window).off('.acu');
  if (window.parent?.document) {
    $(window.parent.document).off('.acu');
  }
  $('.acu-cell-menu, .acu-edit-overlay, .acu-settings-overlay, .acu-history-overlay, .acu-shortcut-lite-overlay').remove();
  state.diffMap.clear();
  state.userEditMap.clear();
  state.pendingDeletes.clear();
}
```

初始化前：

```js
window.ACUVisualizerTest?.destroy?.();
```

### 预期收益

- 防止测试版热重载造成叠加监听。
- 降低长期使用中的内存增长。

## 4. 优先级排序

| 优先级 | 优化项                      | 原因                                  |
| ------ | --------------------------- | ------------------------------------- |
| P0     | 事件委托与 destroy 机制     | 防止明显泄漏，风险最低                |
| P0     | 样式只注入一次，按需注入    | 当前已有大量 CSS 字符串               |
| P1     | 快照轻量化                  | localStorage 占用和 JSON parse 成本高 |
| P1     | 表格懒渲染与只渲染当前页    | 大表 DOM 内存收益明显                 |
| P1     | 历史记录分片与总量上限      | 避免单 key 无限增长                   |
| P2     | 搜索高亮 WeakMap + debounce | 改善交互峰值                          |
| P2     | 状态 key 压缩与过期清理     | 长期使用收益                          |
| P3     | 虚拟滚动                    | 收益高但实现复杂                      |

## 5. 测量与验证建议

### 5.1 手动测量

使用浏览器 DevTools：

1. Performance 面板记录刷新表格前后耗时。
2. Memory 面板做 Heap Snapshot：
   - 首次加载后。
   - 连续刷新 10 次后。
   - 打开/关闭设置弹窗 10 次后。
   - 搜索/清除搜索 10 次后。
3. Application 面板检查 localStorage 各 key 大小。

### 5.2 指标建议

| 指标                              | 目标          |
| --------------------------------- | ------------- |
| 连续刷新 10 次后 DOM 节点数量     | 不持续上涨    |
| 连续打开关闭弹窗后 detached nodes | 接近 0        |
| localStorage ACU 总占用           | 默认低于 4 MB |
| 大表刷新主线程阻塞                | 明显低于原版  |
| 重复初始化监听器数量              | 不增加        |

## 6. 实施顺序建议

1. 新增 `destroy()` 和事件命名空间。
2. 统一样式注入函数，拆分搜索与快捷弹窗 CSS。
3. 将通知、主题、storage 模块化。
4. 改造历史记录容量控制。
5. 改造快照为轻量 hash 快照。
6. 表格只渲染当前激活 tab 与当前页。
7. 最后评估是否需要虚拟滚动。

## 7. 兼容性注意事项

- 不要直接删除旧 localStorage key；需要做迁移或兼容读取。
- 快照格式升级要带版本号。
- 历史记录分片后仍要支持读取旧集中式历史。
- 数据库 API 调用必须保留原行为。
- CSS 拆分后必须确保注入顺序不破坏主题变量。
