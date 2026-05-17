# 阶段 1 核心模块迁移记录

本记录覆盖第一批低风险模块迁移：

- `core/constants.js`
- `core/state.js`
- `core/bridge.js`

## 总体结论

- 是否修改原插件运行文件：否。
- 是否修改原 CSS：否。
- 是否夹带内存优化：否。
- 是否改变原功能行为：否。
- 当前迁移性质：测试版模块复制/封装迁移，不接入正式运行脚本。

## 1. `core/constants.js`

| 项目                  | 内容                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/core/constants.js`                                                                                 |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                                                              |
| 来源函数/行段         | `SCRIPT_ID`、`STORAGE_KEY_*`、`DEFAULT_CONFIG`、`DEFAULT_CLEANUP_SETTINGS`、`DEFAULT_TAB_STATUS`、`THEMES`、`acuSvgIcon` 等 |
| 是否影响 CSS          | 否                                                                                                                          |
| 是否影响 DOM class    | 否                                                                                                                          |
| 是否影响事件          | 否                                                                                                                          |
| 是否影响 localStorage | 只复制 key，不改写格式                                                                                                      |
| 是否影响数据库 API    | 否                                                                                                                          |
| 是否夹带优化          | 否                                                                                                                          |

### 迁移内容

- `SCRIPT_ID`
- `STORAGE_KEYS`
- `STORAGE_SIZE_LIMIT_MB`
- `DEFAULT_CONFIG`
- `DEFAULT_CLEANUP_SETTINGS`
- `DEFAULT_TAB_STATUS`
- `THEMES`
- `DATABASE_SETTINGS_KEYS`
- `SVG_ICONS`
- `acuSvgIcon()`
- `acuMenuIcon()`
- `acuMenuItemContent()`
- `acuButtonIconLabel()`

### 测试结果

- [x] 模块可被 Node 动态 import 解析。
- [x] `SCRIPT_ID` 与原脚本一致。
- [x] localStorage key 与原脚本一致。
- [x] 主题数量与原脚本一致。
- [x] 未修改原插件运行文件。
- [x] 未修改 CSS。

## 2. `core/state.js`

| 项目                  | 内容                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/core/state.js`                                               |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                                        |
| 来源函数/行段         | 全局运行态变量、`UpdateController`、`getPendingDeletions()`、`savePendingDeletions()` |
| 是否影响 CSS          | 否                                                                                    |
| 是否影响 DOM class    | 否                                                                                    |
| 是否影响事件          | 否                                                                                    |
| 是否影响 localStorage | 否                                                                                    |
| 是否影响数据库 API    | 否                                                                                    |
| 是否夹带优化          | 否                                                                                    |

### 迁移内容

- `createInitialState()`
- `state`
- `UpdateController`
- `getPendingDeletions()`
- `savePendingDeletions()`

### 测试结果

- [x] 模块可被 Node 动态 import 解析。
- [x] 默认初始化状态与原脚本语义一致。
- [x] `Set`/`Map` 类状态容器可用。
- [x] 未修改原插件运行文件。
- [x] 未修改 CSS。

## 3. `core/bridge.js`

| 项目                  | 内容                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| 目标文件              | `src/acu_visualizer_test/core/bridge.js`                                    |
| 来源文件              | `public/acu_visualizer/acu_visualizer-test.js`                              |
| 来源函数/行段         | `getCore()`、`getDataIsolationCode()`、`getIsolationKey()` 中的环境访问逻辑 |
| 是否影响 CSS          | 否                                                                          |
| 是否影响 DOM class    | 否                                                                          |
| 是否影响事件          | 否                                                                          |
| 是否影响 localStorage | 只读取设置 key，不改写格式                                                  |
| 是否影响数据库 API    | 只封装获取方式，不调用写入                                                  |
| 是否夹带优化          | 否                                                                          |

### 迁移内容

- `getCore()`
- `getParentWindow()`
- `getTopWindow()`
- `getPreferredStorage()`
- `getUserscriptBridge()`
- `getSillyTavern()`
- `getCurrentChatId()`
- `getDataIsolationCode()`
- `getIsolationKey()`

### 测试结果

- [x] 模块可被 Node 动态 import 解析。
- [x] `getCore()` 函数存在。
- [x] 未修改原插件运行文件。
- [x] 未修改 CSS。

## 4. 验证命令

已执行：

```powershell
node --input-type=module -e "global.window={localStorage:{getItem(){return null}},parent:null,top:null}; window.parent=window; window.top=window; import('./src/acu_visualizer_test/core/constants.js').then(async c=>{ const s=await import('./src/acu_visualizer_test/core/state.js'); const b=await import('./src/acu_visualizer_test/core/bridge.js'); console.log(c.SCRIPT_ID, c.STORAGE_KEYS.TABLE_ORDER, c.THEMES.length, s.state.flags.isInitialized===false, typeof b.getCore==='function'); })"
```

输出包含：

```text
acu_visualizer_v8_96 acu_table_order 5 true true
```

Node 给出 `MODULE_TYPELESS_PACKAGE_JSON` 警告，原因是项目 `package.json` 未声明 `type: module`。这不影响测试版模块语法解析结果；本次不修改 `package.json`，避免影响项目构建行为。

## 5. 回滚方式

如需回滚本次迁移：

1. 恢复以下文件到迁移前占位版本：
   - `src/acu_visualizer_test/core/constants.js`
   - `src/acu_visualizer_test/core/state.js`
   - `src/acu_visualizer_test/core/bridge.js`
2. 删除本迁移记录文件。
3. 回退 `module-migration-matrix.md` 中对应状态。

由于未修改原插件运行文件，回滚不会影响当前正式插件。
