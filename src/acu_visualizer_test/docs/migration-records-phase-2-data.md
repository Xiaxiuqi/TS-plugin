# 阶段 2 数据与差异模块迁移记录

本记录覆盖第二阶段模块迁移：

- `core/storage.js`
- `modules/table-data.js`
- `modules/diff-highlighting.js`

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改原 CSS：否。
- 是否夹带内存优化：否。
- 是否改变 localStorage key：否。
- 是否改变数据库 API 调用：否。
- 当前迁移性质：测试版模块迁移，不接入正式运行脚本。
- 当前状态：迁移完成，尚未完成浏览器功能/CSS 回归，因此不标记为测试通过。

## 1. `core/storage.js`

| 项目                  | 内容                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/core/storage.js`                                                                            |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                       |
| 来源函数/行段         | `getConfig()`、`saveConfig()`、`getCleanupSettings()`、`saveCleanupSettings()`、分页状态、快照、存储清理、历史读写等 |
| 是否影响 CSS          | 否                                                                                                                   |
| 是否影响 DOM class    | 否                                                                                                                   |
| 是否影响事件          | 否                                                                                                                   |
| 是否影响 localStorage | 只使用原 key，不改变格式                                                                                             |
| 是否影响数据库 API    | 否                                                                                                                   |
| 是否夹带优化          | 否                                                                                                                   |

### 迁移内容

- 配置读取与保存。
- 清理设置读取与保存。
- 分页状态读取与保存。
- 快照读取与保存。
- localStorage 大小统计。
- 安全写入与配额异常清理。
- 手动清理存储。
- 存储分析与 key 描述。
- 单元格历史的基础读写函数。

## 2. `modules/table-data.js`

| 项目                  | 内容                                            |
| --------------------- | ----------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/table-data.js` |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`  |
| 来源函数/行段         | `getTableData()` 与新旧数据格式兼容逻辑         |
| 是否影响 CSS          | 否                                              |
| 是否影响 DOM class    | 否                                              |
| 是否影响事件          | 否                                              |
| 是否影响 localStorage | 否                                              |
| 是否影响数据库 API    | 只读取 `exportTableAsJson()`，不写入            |
| 是否夹带优化          | 否                                              |

### 迁移内容

- `normalizeTableData()`
- `parseTableData()`
- `getTableData()`
- `getSheetEntries()`
- `getSheetByName()`
- `getSheetIdByName()`

## 3. `modules/diff-highlighting.js`

| 项目                  | 内容                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/modules/diff-highlighting.js`                            |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                    |
| 来源函数/行段         | `generateDataHash()`、`generateDiffMap()`、标签状态、用户编辑高亮、数据库更新高亮 |
| 是否影响 CSS          | 否                                                                                |
| 是否影响 DOM class    | 否                                                                                |
| 是否影响事件          | 否                                                                                |
| 是否影响 localStorage | 使用原标签状态 key，不改变格式                                                    |
| 是否影响数据库 API    | 否                                                                                |
| 是否夹带优化          | 否                                                                                |

### 迁移内容

- `generateDataHash()`
- 标签状态读写。
- `shouldShowBadge()`
- `markTabAsSeen()`
- `setTabUpdateStatus()`
- `clearAllTabUpdates()`
- `generateDiffMap()`
- `isCellUserEdited()`
- `isCellDBUpdated()`

## 4. 代码层验证

已执行：

```powershell
node --input-type=module -e "const store={}; global.localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}}; global.window={localStorage,parent:null,top:null}; window.parent=window; window.top=window; Promise.all([import('./src/acu_visualizer_test/core/storage.js'),import('./src/acu_visualizer_test/modules/table-data.js'),import('./src/acu_visualizer_test/modules/diff-highlighting.js')]).then(([storage, table, diff])=>{ const raw=JSON.stringify({sheet_1:{name:'T',content:[['h','c'],['r','old']]}}); const parsed=table.parseTableData(raw); storage.saveSnapshot(parsed); const current={sheet_1:{name:'T',content:[['h','c'],['r','new'],['r2','x']]}, mate:{type:'chatSheets',version:1}}; const d=diff.generateDiffMap(current,{addCellHistory:()=>{}}); console.log(JSON.stringify({config:storage.getConfig().theme, parsedMate:parsed.mate.type, sheetId:table.getSheetIdByName(parsed,'T'), hash:!!diff.generateDataHash(parsed), diff:Array.from(d).sort()})); })"
```

输出：

```json
{"config":"retro","parsedMate":"chatSheets","sheetId":"sheet_1","hash":true,"diff":["T-0-1","T-row-1"]}
```

说明：

- 三个模块均可动态 import。
- 默认配置读取正常。
- 表格数据格式兼容转换正常。
- 表名查找正常。
- hash 生成正常。
- diff key 格式与原脚本一致。

## 5. 原插件与 CSS 影响确认

已执行：

```powershell
git status --short -- public/acu_visualizer public/acu_visualizer_test .limcode
```

输出仅包含 `public/acu_visualizer_test` 变更，未出现 `public/acu_visualizer/` 变更。

因此可以确认：

- 原插件运行文件未被修改。
- 原插件 CSS 注入逻辑未被修改。
- 当前正式插件功能与 CSS 不会被本次测试版迁移直接影响。

## 6. 回滚方式

如需回滚本次迁移：

1. 恢复以下文件到迁移前占位版本：
   - `src/acu_visualizer_test/core/storage.js`
   - `src/acu_visualizer_test/modules/table-data.js`
   - `src/acu_visualizer_test/modules/diff-highlighting.js`
2. 删除本迁移记录文件。
3. 回退 `module-migration-matrix.md` 中对应状态。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
