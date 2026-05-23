# shujuku（神·数据库 / SP·数据库 II）API 调用接口速查

来源：

- 仓库：<https://github.com/AlbusKen/shujuku>
- API 文档：<https://raw.githubusercontent.com/AlbusKen/shujuku/main/API_DOCUMENTATION.md>
- manifest：<https://raw.githubusercontent.com/AlbusKen/shujuku/main/manifest.json>

对应机器可检索数据库：`data/shujuku-api.json`

> 本文件只记录 shujuku 对外暴露的 `window.AutoCardUpdaterAPI` 调用接口。不要与 JS-Slash-Runner API 或 SillyTavern 原生扩展 API 混放。

---

## 0. 基本信息

manifest：

```json
{
  "display_name": "SP·数据库 II",
  "loading_order": 200,
  "js": "index.js",
  "css": "",
  "author": "Cline (AI Assisted)",
  "version": "2.0.0",
  "auto_update": false
}
```

全局 API 对象：

```js
window.AutoCardUpdaterAPI
```

调用前必须检查：

```js
if (!window.AutoCardUpdaterAPI) {
  console.warn('shujuku / AutoCardUpdaterAPI 不可用');
  return;
}

const api = window.AutoCardUpdaterAPI;
```

---

## 1. 剧情推进预设管理 API

### `getPlotPresets()`

```ts
getPlotPresets(): PlotPreset[]
```

获取所有剧情预设完整数据，返回深拷贝。

```js
const presets = window.AutoCardUpdaterAPI.getPlotPresets();
```

### `getPlotPresetNames()`

```ts
getPlotPresetNames(): string[]
```

获取预设名称列表。

```js
const names = window.AutoCardUpdaterAPI.getPlotPresetNames();
```

### `getCurrentPlotPreset()`

```ts
getCurrentPlotPreset(): string
```

获取当前使用的剧情推进预设名称；未选择时返回空字符串。

### `switchPlotPreset(presetName)`

```ts
switchPlotPreset(presetName: string): boolean
```

切换到指定预设。成功后保存设置，并在设置面板打开时同步 UI。

重要特性：切换后，剧情推进功能 `$6` 占位符只回溯读取带有当前预设名称标签的历史数据，实现不同预设之间的剧情规划隔离。

```js
const ok = api.switchPlotPreset('战斗场景');
```

### `getPlotPresetDetails(presetName)`

```ts
getPlotPresetDetails(presetName: string): PlotPreset | null
```

获取指定预设详情，未找到返回 `null`。

`PlotPreset` 常见结构：

```ts
type PlotPreset = {
  name: string;
  promptGroup: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    enabled?: boolean;
    mainSlot?: string;
  }>;
  finalSystemDirective: string;
  rateMain: number;
  ratePersonal: number;
  rateErotic: number;
  rateCuckold: number;
  extractTags: string;
  minLength: number;
  contextTurnCount: number;
  loopSettings: {
    quickReplyContent: string;
    loopTags: string;
    loopDelay: number;
    loopTotalDuration: number;
    maxRetries: number;
  };
};
```

### 前端直接导入/导出剧情预设

```ts
importPlotPresetFromData(
  presetData: object | string,
  options?: { overwrite?: boolean; switchTo?: boolean }
): Promise<{ success: boolean; message: string; presetName?: string }>;

importPlotPresetsFromData(
  presetsArray: object[],
  options?: { overwrite?: boolean }
): Promise<{ success: boolean; message: string; imported: number; failed: number; details: any[] }>;

exportAllPlotPresets(): PlotPreset[];
```

示例：

```js
const result = await api.importPlotPresetFromData({
  name: '战斗场景预设',
  promptGroup: [{ role: 'system', content: '你是战斗场景规划师...', enabled: true }],
  rateMain: 1.2,
  ratePersonal: 0.8,
  rateErotic: 0,
  rateCuckold: 0,
}, { overwrite: false, switchTo: true });
```

---

## 2. 表格数据导入导出与操作 API

### `exportTableAsJson()`

```ts
exportTableAsJson(): object
```

导出当前合并后的表格数据对象。

### `importTableAsJson(jsonString)`

```ts
importTableAsJson(jsonString: string): Promise<boolean>
```

导入并覆盖当前表格数据。

### `exportJsonData()`

```ts
exportJsonData(): Promise<void>
```

导出当前 JSON 数据到文件，会弹出保存对话框。

### `updateCell(tableName, rowIndex, colIdentifier, value)`

```ts
updateCell(
  tableName: string,
  rowIndex: number,
  colIdentifier: string | number,
  value: any
): Promise<boolean>
```

更新单个单元格。`colIdentifier` 可为列名或列索引。

```js
await api.updateCell('主角信息', 1, '自由点数', 5);
await api.updateCell('主角信息', 1, 3, 5);
```

### `updateRow(tableName, rowIndex, data)`

```ts
updateRow(tableName: string, rowIndex: number, data: Record<string, any>): Promise<boolean>
```

按列名-值映射更新整行。只更新 `data` 指定列，其他列保持不变。

说明：

- 更新后自动查找该表数据最后一次出现的楼层并保存。
- 找不到该表楼层时，保存到最新 AI 楼层。
- 保存后自动触发世界书重新写入。

```js
await api.updateRow('主角信息', 1, {
  力量: 15,
  敏捷: 12,
  自由点数: 2,
});
```

### `insertRow(tableName, data)`

```ts
insertRow(tableName: string, data: Record<string, any>): Promise<number>
```

在表尾插入新行。成功返回新行索引，失败返回 `-1`。

### `deleteRow(tableName, rowIndex)`

```ts
deleteRow(tableName: string, rowIndex: number): Promise<boolean>
```

删除指定行。不能删除表头 `rowIndex = 0`。

---

## 3. 设置、更新与世界书 API

```ts
openSettings(): Promise<void>;
openVisualizer(): void;
manualUpdate(): Promise<void>;
triggerUpdate(): Promise<void>;
setZeroTkOccupyMode(modeEnabled: boolean): Promise<void>;
setOutlineEntryEnabled(enabled: boolean): Promise<void>;
syncWorldbookEntries(options?: { createIfNeeded?: boolean }): Promise<void>;
refreshDataAndWorldbook(): Promise<boolean>;
deleteInjectedEntries(): Promise<void>;
```

重点：

- `openSettings()`：打开设置面板。
- `openVisualizer()`：打开可视化编辑器。
- `manualUpdate()`：等价于点击立即手动更新。
- `triggerUpdate()`：外部触发增量更新。
- `setZeroTkOccupyMode(true)`：世界书条目禁用；`false`：启用。
- `syncWorldbookEntries({ createIfNeeded: true })`：同步世界书注入条目。
- `refreshDataAndWorldbook()`：重新加载聊天表格、合并独立表、更新世界书、通知 UI 刷新。

示例：

```js
await api.updateRow('主角信息', 1, { 力量: 15 });
await api.refreshDataAndWorldbook();
```

---

## 4. TXT 导入链路 API

```ts
importTxtAndSplit(): Promise<void>;
injectImportedSelected(): Promise<void>;
injectImportedStandard(): Promise<void>;
injectImportedSummary(): Promise<void>;
injectImportedFull(): Promise<void>;
deleteImportedEntries(): Promise<void>;
clearImportedEntries(clearAll?: boolean): Promise<void>;
clearImportCache(clearAll?: boolean): Promise<void>;
```

用途：

- 导入 TXT 并分割
- 注入选中内容
- 标准 / 总结 / 完整方式注入
- 删除导入条目
- 清理导入缓存或 localStorage 缓存

---

## 5. 模板管理 API

### 文件/默认模板操作

```ts
importTemplate(options?: { scope?: 'global' | 'chat' }): Promise<void>;
exportTemplate(options?: { scope?: 'global' | 'chat' }): Promise<void>;
resetTemplate(options?: { scope?: 'global' | 'chat' }): Promise<void>;
resetAllDefaults(): Promise<void>;
overrideWithTemplate(): Promise<void>;
```

`scope`：

- `global`：当前 profile 的全局模板
- `chat`：当前聊天模板快照，不改动全局模板库

### 查询/切换模板预设

```ts
getTableTemplate(): object | null;
getTemplatePresetNames(): string[];
switchTemplatePreset(
  presetName: string,
  options?: { scope?: 'global' | 'chat' }
): Promise<{ success: boolean; scope: string; message: string }>;

injectTemplatePresetToCurrentChat(
  presetName: string
): Promise<{ success: boolean; scope: string; message: string }>;
```

### 直接导入模板数据

```ts
importTemplateFromData(
  templateData: object | string,
  options?: { scope?: 'global' | 'chat'; presetName?: string }
): Promise<{ success: boolean; message: string; scope?: string; presetName?: string }>;
```

模板要求：

- 必须包含 `mate` 对象。
- `mate.type` 必须为 `"chatSheets"`。
- 必须至少包含一个 `sheet_*` 键。
- 每个 sheet 必须包含 `name`、`content`、`sourceData` 字段。

示例：

```js
const template = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_0: {
    name: '角色状态',
    content: [['属性', '值'], ['生命值', '100']],
    sourceData: { headers: ['属性', '值'] },
  },
};

await api.importTemplateFromData(template, {
  scope: 'chat',
  presetName: '任务专用模板',
});
```

---

## 6. 表格锁定 API

锁定数据按“当前聊天 + 数据隔离标识”分槽存储，外部调用等价于 UI 锁定/解锁行为。

```ts
getTableLockState(sheetKey: string): { rows: number[]; cols: number[]; cells: string[] } | null;
setTableLockState(
  sheetKey: string,
  lockState: { rows: number[]; cols: number[]; cells: Array<string | [number, number]> },
  options?: { merge?: boolean }
): boolean;
clearTableLocks(sheetKey: string): boolean;
lockTableRow(sheetKey: string, rowIndex: number, locked: boolean): boolean;
lockTableCol(sheetKey: string, colIndex: number, locked: boolean): boolean;
lockTableCell(sheetKey: string, rowIndex: number, colIndex: number, locked: boolean): boolean;
toggleTableRowLock(sheetKey: string, rowIndex: number): boolean;
toggleTableColLock(sheetKey: string, colIndex: number): boolean;
toggleTableCellLock(sheetKey: string, rowIndex: number, colIndex: number): boolean;
getSpecialIndexLockEnabled(sheetKey: string): boolean | null;
setSpecialIndexLockEnabled(sheetKey: string, enabled: boolean): boolean;
```

`cells` 支持：

```js
{ cells: ['1:2', [3, 4]] }
```

---

## 7. 回调注册 API

### `registerTableUpdateCallback(callback)`

```ts
registerTableUpdateCallback(callback: (tableData: object) => void): void;
unregisterTableUpdateCallback(callback: Function): void;
```

表格数据更新时回调：

```js
function onTableUpdate(tableData) {
  console.log('表格已更新:', tableData);
}

api.registerTableUpdateCallback(onTableUpdate);
// api.unregisterTableUpdateCallback(onTableUpdate);
```

### `registerTableFillStartCallback(callback)`

```ts
registerTableFillStartCallback(callback: () => void): void;
```

填表开始时回调：

```js
api.registerTableFillStartCallback(() => {
  console.log('开始填表...');
});
```

---

## 8. 更新配置与手动更新表选择 API

### 更新配置

```ts
getUpdateConfigParams(): {
  autoUpdateThreshold: number;
  autoUpdateFrequency: number;
  updateBatchSize: number;
  autoUpdateTokenThreshold: number;
};

setUpdateConfigParams(params: {
  autoUpdateThreshold?: number;
  autoUpdateFrequency?: number;
  updateBatchSize?: number;
  autoUpdateTokenThreshold?: number;
}): boolean;
```

说明：

- `autoUpdateThreshold`：自动更新阈值，≥ 0。
- `autoUpdateFrequency`：自动更新频率，≥ 1。
- `updateBatchSize`：批处理大小，≥ 1。
- `autoUpdateTokenThreshold`：Token 阈值，≥ 0；0 表示不限制。

### 手动更新表选择

```ts
getManualSelectedTables(): { selectedTables: string[]; hasManualSelection: boolean };
setManualSelectedTables(sheetKeys: string[]): boolean;
clearManualSelectedTables(): boolean;
```

`setManualSelectedTables` 会自动过滤无效表 key，并把 `hasManualSelection` 标记为 `true`。

---

## 9. API 预设管理 API

```ts
getApiPresets(): ApiPreset[];
getTableApiPreset(): string;
setTableApiPreset(presetName: string): boolean;
getPlotApiPreset(): string;
setPlotApiPreset(presetName: string): boolean;
saveApiPreset(presetData: ApiPreset): boolean;
loadApiPreset(presetName: string): boolean;
deleteApiPreset(presetName: string): boolean;
```

`ApiPreset` 结构：

```ts
type ApiPreset = {
  name: string;
  apiMode?: string;       // 如 'custom' / 'proxy' / 'tavern'
  apiConfig?: object;
  tavernProfile?: string;
};
```

示例：

```js
api.saveApiPreset({
  name: '测试预设',
  apiMode: 'custom',
  apiConfig: {
    customApiUrl: 'https://api.example.com/v1',
    customApiKey: 'sk-xxx',
    customApiModel: 'gpt-4o',
  },
  tavernProfile: '',
});

api.setTableApiPreset('测试预设');
api.setPlotApiPreset('测试预设');
```

注意：删除正在被填表或剧情推进使用的 API 预设时，相关引用会自动清除。

---

## 10. AI 调用 API

### `callAI(messages, options)`

```ts
callAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { max_tokens?: number }
): Promise<string | null>;
```

使用 shujuku 当前配置的 API 调用 AI。

支持模式：

- `apiMode === 'tavern'`：使用酒馆 Connection Manager。
- `apiMode === 'custom'`：
  - 如果启用 `useMainApi`，使用酒馆主 API（`TavernHelper.generateRaw`）。
  - 否则使用独立配置的 API（流式传输）。

示例：

```js
const messages = [
  { role: 'system', content: '你是一个有帮助的助手。' },
  { role: 'user', content: '请生成一个奇幻场景的描述。' },
];

const response = await api.callAI(messages, { max_tokens: 2000 });

if (response) {
  console.log('AI 响应:', response);
} else {
  console.error('AI 调用失败');
}
```

### `getStoryContext(maxTurns)`

```ts
getStoryContext(maxTurns?: number): string;
```

获取最近剧情上下文：

- 从最新聊天记录向前遍历。
- 只取 AI 回复消息（`is_user === false`）。
- 返回时按时间顺序排列，旧消息在前。
- 多条消息用 `\n\n` 分隔。
- 默认 `maxTurns = 3`。

示例：

```js
const context = api.getStoryContext(5);
const analysis = await api.callAI([
  { role: 'system', content: '你是剧情分析助手。' },
  { role: 'user', content: `请分析以下剧情的发展趋势：\n\n${context}` },
]);
```

---

## 11. 其他功能 API

```ts
importCombinedSettings(): Promise<void>;
exportCombinedSettings(): Promise<void>;
mergeSummaryNow(): Promise<void>;
```

- `importCombinedSettings()`：导入组合设置，会弹出文件选择对话框。
- `exportCombinedSettings()`：导出组合设置到文件。
- `mergeSummaryNow()`：立即执行合并总结操作。

---

## 12. 完整调用示例

### 列出并切换剧情推进预设

```js
const api = window.AutoCardUpdaterAPI;

const presetNames = api.getPlotPresetNames();
const currentPreset = api.getCurrentPlotPreset();

console.log('可用预设:', presetNames);
console.log('当前预设:', currentPreset);

if (presetNames.includes('战斗场景')) {
  const success = api.switchPlotPreset('战斗场景');
  console.log('切换结果:', success ? '成功' : '失败');
}
```

### 监听表格更新

```js
const callback = data => {
  console.log('表格已更新:', data);
};

api.registerTableUpdateCallback(callback);
// api.unregisterTableUpdateCallback(callback);
```

### 从外部导入模板和预设

```js
const templateData = await (await fetch('/api/template.json')).json();
await api.importTemplateFromData(templateData, {
  scope: 'chat',
  presetName: '服务器下发模板',
});

const presetsData = await (await fetch('/api/presets.json')).json();
const result = await api.importPlotPresetsFromData(presetsData, { overwrite: false });
console.log(`预设导入：成功 ${result.imported} 个，失败 ${result.failed} 个`);
```

---

## 13. 注意事项

1. 调用前检查 `window.AutoCardUpdaterAPI` 是否存在。
2. 大多数方法返回 `Promise`，使用 `async/await`。
3. 多数失败路径返回 `false`、`null`、`-1` 或 `{ success:false, message }`，通常不抛异常。
4. `getPlotPresets()`、`getPlotPresetDetails()`、`exportAllPlotPresets()`、`getApiPresets()` 返回深拷贝，改返回值不会影响原数据。
5. `switchPlotPreset()` 与 `switchTemplatePreset()` 会自动同步已打开的设置面板 UI。
6. `importTemplateFromData()` 和 `importPlotPresetFromData()` 返回 `{ success, message }`，适合前端展示结果。
7. 模板 `scope` 分为 `global` 和 `chat`：`global` 写当前 profile 全局模板，`chat` 只写当前聊天模板快照。
8. `callAI()` 可统一使用数据库插件里的 API 配置，避免外部前端重复配置密钥和模型。
