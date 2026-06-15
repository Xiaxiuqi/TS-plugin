# Story UI Lite Test - 项目文档

## 项目概述

`story_ui_lite_test` 是从 `story_regex_ui_releasetest` 精简而来的轻量版前端美化模块。

移除了部分功能模块，保留核心渲染能力，适用于不需要完整变量更新和旧版 MVU 状态栏的场景。

## 基于版本

- 源版本：`story_regex_ui_releasetest` (releasetest-0.1.1)
- 当前版本：`lite_test-0.1.0`

## 模块清单

| 模块 ID              | 名称                | 默认状态 | 说明                                                                                 |
| -------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------ |
| `bp-panel-newvars`   | BP战力雷达（兼容）  | 开启     | 战力面板展示                                                                         |
| `mvu-status-newvars` | MVU状态栏（新变量） | 开启     | 新版 MVU 状态栏，使用新变量体系                                                      |
| `story-engine`       | 故事引擎            | **关闭** | 故事驱动引擎渲染，默认关闭                                                           |
| `world-log`          | 世界运行报告        | 开启     | 世界状态日志展示                                                                     |
| `relation-status`    | 角色羁绊档案        | 开启     | 角色关系状态展示                                                                     |
| `manager-ui`         | 管理面板            | 开启     | 前端管理 UI（开关模块、主题切换等）                                                  |
| `db-status-bar`      | 数据库状态栏        | 开启     | 从 `AutoCardUpdaterAPI.exportTableAsJson()` 读取数据库表，渲染咒回状态栏、任务与地图 |

## 与 releasetest 版本的差异

### 已移除模块

| 模块 ID           | 名称              | 移除原因                       |
| ----------------- | ----------------- | ------------------------------ |
| `variable-update` | 变量更新          | 精简版不需要独立变量更新面板   |
| `mvu-status`      | MVU状态栏（旧版） | 已被 `mvu-status-newvars` 替代 |

### 行为变更

- `story-engine` 模块默认关闭（用户可通过管理面板手动开启）
- 互斥模块逻辑已移除（旧版 mvu-status 与 mvu-status-newvars 的互斥不再需要）

### 配置变更

- `env`: `releasetest` → `lite_test`
- `displayEnv`: `发布测试版` → `精简测试版`
- `version`: `releasetest-0.1.1` → `lite_test-0.1.0`
- `publicBaseUrl`: 指向 `story_ui_lite_test/`
- `localBasePath`: 指向 `story_ui_lite_test/`
- `managerRootId`: `jjks-story-ui-manager-releasetest` → `jjks-story-ui-manager-lite_test`

## 目录结构

```
story_ui_lite_test/
├── core/
│   ├── dom.js          # DOM 工具函数
│   ├── registry.js     # 模块注册中心
│   ├── scanner.js      # 消息扫描器
│   └── theme.js        # 主题管理
├── modules/
│   ├── bp-panel-newvars/   # BP战力雷达
│   ├── db-status-bar/      # 数据库状态栏（含地图与任务面板）
│   ├── manager-ui/         # 管理面板
│   ├── mvu-status-newvars/ # MVU状态栏（新变量）
│   ├── relation-status/    # 角色羁绊档案
│   ├── story-engine/       # 故事引擎（默认关闭）
│   └── world-log/          # 世界运行报告
├── index.js            # 主入口（正则脚本调用）
├── loader.js           # 模块加载器
├── shared.css          # 共享样式
└── PROJECT.md          # 本文档
```

## 工作流程规范

每次修改本项目时，必须遵循以下硬规则。少一条都不算完成，别再拿“看起来能跑”糊弄生产系统。

1. **开工前必须读取项目文档**：至少读取 `public/story_ui_lite_test/PROJECT.md` 与 `public/story_ui_lite_test/STATUS_BAR_PLAN.md`，确认当前目标、边界、进度、风险和未闭环事项。
2. **确认目标目录**：默认只允许修改 `public/story_ui_lite_test/**`。如果任务需要触碰其他路径，必须先说明原因、影响和回退方式，并等待明确确认。
3. **禁止目标错位**：`src/ci_island_test/**`、`src/ci_island-release/**`、`public/ci_island/**` 不是本项目目标路径。除非用户明确要求，不得修改。
4. **先证据后修改**：修改前读取目标文件；修改公共接口、事件、配置、数据流前搜索调用方；子代理结论必须由主 Agent 以文件或测试证据复核。
5. **每次修改后同步文档进度**：代码、样式、测试、文档任一文件发生修改后，必须同步更新本文件的“当前进度快照/变更日志”或 `STATUS_BAR_PLAN.md` 的对应进度、风险、验收项。
6. **每次交付前验收**：至少检查修改范围、未闭环风险、TODO 状态、可用的本地验证结果；复杂或高风险修改需要高性能模型审计闭环。

## 当前进度快照

更新时间：2026-06-15

| 项目项               | 状态                                            | 证据                                                                                                                                                                                                                                              | 下一步                                                                                                    |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 数据库状态栏基础模块 | 已实现，默认挂载恢复                            | `modules/db-status-bar/data.js`、`modules/db-status-bar/index.js`、`modules/db-status-bar/style.css`；`index.js` 已恢复 `db-status-bar` 默认挂载到最后 AI/角色消息                                                                                | 酒馆运行时复核状态栏在无 `<DbStatusBar/>` 显式标签时仍能显示                                              |
| 状态栏默认挂载位置   | 已修复，待酒馆运行时复核                        | `index.js` 使用最后 AI/角色消息判定驱动 `db-status-bar` 默认挂载；用户消息触发扫描时会刷新最后 AI 消息而不是挂到用户消息后                                                                                                                        | 在酒馆中验证用户发言后状态栏仍停留在最后 AI 消息内                                                        |
| 角色头像弹窗         | 反馈确认，待按方案修复颜色                      | 点击链路存在，但 `style.css` 头像弹窗使用 `var(--db-panel)`、`var(--db-text)` 等状态栏变量；body 级挂载后颜色可能偏离 `preview-db-status.html` 浅色参考                                                                                           | 按预览浅色契约收敛弹窗局部 CSS，不污染预览页本体和全局 body 变量                                          |
| 状态栏地图刷新按钮   | 已补运行时反馈与日志，待酒馆运行时复核          | `data-map-action="refresh"` 调用 `doMap(root, false)`；`modules/db-status-bar/index.js` 已补缓存读取/命中/清除、签名匹配、生成入口与失败 reason 的 `[db-status-bar][map-debug]` 日志                                                              | 在酒馆中触发刷新，确认缓存命中路径不重复生成且日志可定位                                                  |
| 状态栏地图重绘按钮   | 已修复即时状态，待酒馆运行时复核                | `doMap(root, true)` 进入生成分支后立即写入“正在重绘地图…”状态；无旧图时显示“正在生成地图…”占位；失败保留旧图或显示明确空状态                                                                                                                      | 在酒馆中触发有旧图/无旧图两种重绘路径，确认视觉反馈与失败状态                                             |
| 地图楼层自动重绘     | 已实现，待酒馆运行时复核                        | `registerTableUpdateCallback` 回调中 rerender 后调用 `maybeAutoMap(root, { allowGenerate: true })`；`initData` 初次加载不触发                                                                                                                     | 在酒馆中确认：首次进入聊天不自动AI生成；楼层变更后地图元素变化时自动触发AI重绘                            |
| 地图 AI 生成链路     | 已补 debug 定位，待酒馆运行时复核               | `modules/db-status-bar/index.js` 已补配置读取、自定义 API 摘要、生成器选择、返回类型/长度、SVG 提取、sanitizer 结果、缓存和 doMap 失败 reason 日志                                                                                                | 用空返回、非 SVG 返回、sanitizer 拒绝和成功 SVG 路径确认日志链完整                                        |
| 地图 AI 运行时诊断   | 已实施测试版日志策略，待酒馆运行时复核          | `modules/db-status-bar/index.js` 与 `index.js` 的 `[db-status-bar][map-debug]` 摘要现在输出完整脱敏 URL 与当前模型；API Key 仍只输出存在性与尾号，URL 中常见 key/token/secret/password 参数值会替换为 `[redacted]`；`sanitizedLog` 仅保留当前模型 | 在酒馆中分别触发主 API、custom_api、模型拉取失败/成功路径，确认 URL 可定位、模型可见且无完整 API Key 泄露 |
| 地图无缓存基础显示   | 已修复代码侧，待酒馆运行时复核                  | `modules/db-status-bar/index.js` 增加 `renderBaseMap(S)`，无缓存、AI 关闭或 AI 失败无旧图时基于 `GameState.mapElements` 渲染经 `sanitizeSVG()` 清理的基础 SVG；不写入 `mapCache`                                                                  | 硬刷新后打开地图页，确认无 AI 缓存时仍显示地图元素；普通刷新不触发 AI，不污染缓存                         |
| 管理界面地图配置分页 | 已补测试版 URL/模型 debug log，待酒馆运行时复核 | `index.js` 已补地图配置读取/保存/重置和模型拉取的 `[db-status-bar][map-debug]` 日志；测试版输出完整脱敏 URL 与当前模型，API Key 只输出存在性与尾号，后续脱敏日志结构仅保留模型                                                                    | 在管理界面保存、重置、拉取模型时确认日志不泄露完整 API Key，且 URL query 中密钥参数被替换为 `[redacted]`  |
| 样式加载安全性       | 已修复代码侧，待酒馆运行时复核                  | `loader.js` 改为优先 `fetch` CSS 并内联为 `<style data-story-ui-css>`；`index.js` 的管理面板样式加载同样改为内联，不再主动创建跨域 CSS link                                                                                                       | 点击“重载美化”后确认 `dynamic-styles.js` 不再因跨域 `cssRules` 抛出 SecurityError                         |
| 浮岛误改回滚         | 已完成                                          | `git diff --name-only -- src/ci_island_test src/ci_island-release dist/ci_island-release dist/ci_island_test dist/ci_island_map public/ci_island` 为空                                                                                            | 后续默认不碰 ci_island 路径                                                                               |

## 当前工作边界

- 本项目根目录：`public/story_ui_lite_test/`
- 状态栏模块：`public/story_ui_lite_test/modules/db-status-bar/`
- 管理界面模块：`public/story_ui_lite_test/modules/manager-ui/`
- 项目文档：`public/story_ui_lite_test/PROJECT.md`、`public/story_ui_lite_test/STATUS_BAR_PLAN.md`
- 禁止默认修改：`src/ci_island_test/**`、`src/ci_island-release/**`、`public/ci_island/**`

## 变更日志

### v1.1.12-db-default-mount-and-css-inline (2026-06-15)

**数据库状态栏默认挂载与 CSS 安全加载修复**

- 恢复 `db-status-bar` 的默认 after-native 挂载：即使最新 AI/角色消息没有显式 `<DbStatusBar/>` 标签，也会在最后 AI/角色消息后渲染数据库状态栏。
- `loader.js` 的 CSS 加载改为优先通过 `fetch(..., { mode: 'cors' })` 读取文本并注入 `<style data-story-ui-css>`，避免新增跨域 `<link>` 后被外部 `dynamic-styles.js` 遍历 `cssRules` 时触发 `SecurityError`。
- 管理面板样式加载同步改为 `ensureHostCssResource()` 内联注入，避免“打开管理面板/重载资源”路径再次创建跨域样式表。
- 已执行 `node --check public/story_ui_lite_test/index.js && node --check public/story_ui_lite_test/loader.js` 通过；浏览器直连 `http://127.0.0.1:8000/` 当前返回 401，酒馆运行时 UI 复核仍需在已登录/已授权页面完成。

### v1.1.11-map-auto-redraw-on-floor-update (2026-06-13)

**地图楼层自动重绘恢复**

- `registerTableUpdateCallback` 回调中 rerender 后调用 `maybeAutoMap(activeDataRoot, { allowGenerate: true })`，数据库表更新（楼层变更）后自动检测地图签名/缓存，需要时触发 AI 重绘。
- `initData` 初次加载保持不变，不触发自动地图生成；仅在后续数据库更新时通过回调触发。

### v1.1.10-map-ai-log-policy (2026-06-12)

**地图 AI 测试版日志策略实施**

- `index.js` 管理界面地图配置日志改为输出完整脱敏 URL 与当前模型；API Key 继续只输出存在性与尾号，不输出完整密钥。
- `modules/db-status-bar/index.js` 运行时 AI 日志在 `ai:start`、`ai:generator:selected`、`ai:result`、`ai:failed` 中补充 `currentModel`：custom_api 路径输出实际传入 `custom_api.model`；主 API 当前模型不可由本模块读取时明确标记为 `database-api-current-model-unavailable`，不把历史配置模型伪装成主 API 当前模型。
- URL 日志保留 query/hash 以便测试版定位真实请求地址，但会对常见 `key`、`api_key`、`apiKey`、`token`、`access_token`、`accessToken`、`clientSecret`、`authorization`、`auth`、`secret`、`password` 等参数值做 `[redacted]` 替换，避免 API Key 或 token 通过 URL 间接泄露。
- 地图 AI/API 相关异常日志新增文本级脱敏摘要，不再把原始 `Error` 对象直接输出到控制台；异常 message 中的 `Authorization: Bearer ...`、`apiKey=...`、`accessToken=...`、`clientSecret: ...` 等片段会先替换为 `[redacted]`。
- 新增 `sanitizedLog` 摘要结构，后续脱敏日志只保留当前模型字段；主 API 模型不可见时该字段为空，不携带 URL、Key 尾号或其他配置细节。

### v1.1.9-map-ai-runtime-diagnosis-plan (2026-06-09)

**地图 AI 运行时诊断方案文档化**

- 本轮仅完成排查与方案同步，未修改 `modules/db-status-bar/index.js`、`style.css` 或 `data.js`；业务代码修改需等待助手确认。
- 已确认 `TavernHelper.generate returned no usable map text` 的静态错误点在 `callMapAI()` 的返回值可用性检查：当前只接受非空字符串，缺少对象返回形态、截断预览和生成器绑定源的诊断信息。
- 已通过 `@types/function/generate.d.ts` 确认 `CustomApiConfig` 字段名为 `apiurl`，因此不能继续把 `apiurl` 小写字段当作主要根因；后续重点转向 `source/proxy_preset`、参数结构、返回类型、SVG 提取和 sanitizer 拒绝原因。
- 已搜索 `public/story_ui_lite_test/**` 的 `cocktail-plus`、`startup-optimizer`、`invalidate`、`/api/plugins`，无本模块调用证据；控制台 `POST /api/plugins/cocktail-plus/invalidate 404` 暂按并行浏览器噪声隔离。
- 后续确认后只允许在 `modules/db-status-bar/index.js` 增强脱敏运行时日志和必要的返回文本提取兼容；不得恢复默认地图 fallback，不得伪造地图元素，不得改变 `doMap(root, false)` 只复用缓存的策略，不得把基础 SVG 写入 `mapCache`。

### v1.1.8-map-base-svg-layout-cache (2026-06-09)

**地图基础 SVG、布局高度与缓存语义修复**

- `modules/db-status-bar/data.js` 增加表名别名归一化，支持 `sheet_MapElements`、`map_elements`、`sheet_map` 映射到“地图元素表”，避免地图元素表因 uid/name 差异无法进入 `GameState.mapElements`。
- `modules/db-status-bar/index.js` 增加 `renderBaseMap(S)`：无 AI 缓存、AI 生成关闭、普通刷新不允许生成、AI 失败且无旧图时，基于 `GameState.mapElements` 生成基础 SVG；元素为空时显示明确空状态。
- 基础 SVG 输出统一经过 `sanitizeSVG()` 后再进入 DOM；名称等文本仍使用 `esc()`，坐标缺失按索引环形排布，坐标越界夹紧到画布范围。
- 基础 SVG 不写入 `mapCache`；AI 失败保留旧图时不再用当前 signature 写旧图缓存，避免地图元素变化后缓存签名被污染。
- `modules/db-status-bar/style.css` 明确功能区 grid 行契约、地图区域 stretch、viewport 与空状态 `min-height: 200px`，修复工具栏或空状态导致地图区域退化到极小高度的问题。
- 已通过 `node --check public/story_ui_lite_test/modules/db-status-bar/index.js` 与提交前 diff 检查；剩余运行时风险是浏览器可能缓存 `style.css?v=lite_test-0.1.0`，若硬刷新后仍旧样式，需要另行确认是否修改 loader 版本号。

### v1.1.7-map-debug-redraw-feedback (2026-06-07)

**地图 AI debug 链路与重绘即时反馈修复**

- `modules/db-status-bar/index.js` 新增并扩展 `[db-status-bar][map-debug]` 日志，覆盖地图配置读取、自定义 API 构建、AI 生成器选择、返回摘要、SVG 提取、sanitizer 结果、缓存读写/清除、`doMap()` 入口、自动地图判定和失败 reason。
- `doMap(root, true)` 进入生成分支后立即写入“正在重绘地图…”状态；无旧图时才显示“正在生成地图…”占位，避免清空旧图制造闪烁或失败丢图。
- `index.js` 管理侧新增独立脱敏日志 helper，覆盖配置读取/保存/重置与模型拉取；API Key 只记录是否存在和末尾 4 位，URL 去除 query/fragment。
- 同步 `STATUS_BAR_PLAN.md` 风险与验收项：地图/API debug log 与重绘即时反馈已完成代码侧修复，仍需酒馆运行时复核真实接口返回。

### v1.1.6-feedback-doc-plan (2026-06-07)

**本轮反馈成因分析与修复方案文档化**

- 针对头像弹窗颜色变更，确认问题不是 `preview-db-status.html` 本体改色，而是 body 级头像弹窗继续消费 `modules/db-status-bar/style.css` 中的状态栏主题变量；下一步只收敛弹窗局部颜色，不新增全局变量，不污染预览页本体。
- 针对地图/API 配置缺 debug log，确认 `callMapAI()` 当前只有失败 `console.warn`，不足以定位 custom_api、TavernHelper 返回值、SVG 提取和 sanitizer 问题；下一步补统一 `[db-status-bar][map-debug]` 脱敏日志。
- 针对 `.db-sb-fn-toolbar` 高度异常，确认 CSS 允许 toolbar 和左右按钮组 `flex-wrap: wrap`，窄宽度或字体缩放会多行撑高；下一步改为单行稳定布局，按钮不换行，空间不足时采用横向滚动或收缩 gap。
- 针对重绘地图无即时反应，确认 `doMap(root, true)` 进入生成分支后只禁用按钮，没有立即写入“正在重绘地图”状态；下一步按 `数据库前端/咒回前端/regex-状态栏.json` 的地图状态/容器/缓存日志思路补运行中状态和失败可诊断路径。
- v1.1.5 只完成入口布局、fallback 策略和模型缓存方向的调整，不代表本轮反馈中的 `.db-sb-fn-toolbar` 高度、重绘即时状态、地图/API debug log 已修复。
- 本轮只修改文档，不修改业务 JS/CSS/HTML；后续代码实施必须按 `STATUS_BAR_PLAN.md` 的四项方案逐项执行并验收。

### v1.1.5-map-fallback-removal-toolbar-model-cache (2026-06-06)

**地图 fallback 删除、按钮布局与模型缓存修复**

- 删除 `db-status-bar` 地图默认生成回退策略：地图 AI 关闭、无缓存、AI 调用失败、AI 返回非 SVG 或 SVG 未通过安全检查时，不再静默写入默认地图；改为 toastr 通知、地图面板状态文本、保留旧图或显示空状态。
- 重绘地图按钮强制清当前地点缓存并调用 AI；成功后才写入 DOM 与缓存，失败时不覆盖旧图。
- 地图工具栏改为左侧任务按钮、右侧刷新/重绘按钮组，避免刷新和重绘入口挤在左侧。
- 头像点击链路复核为 `.db-sb-avatar-box` 事件委托到 `showAvatarModal()`，弹窗挂载到 `document.body` 并保留 URL、本地上传、移除和裁剪操作。
- 保存地图 API 设置时只清除其他模型列表缓存，保留当前选中的模型；管理面板说明同步为 AI 关闭后不调用 AI、不使用默认地图。

### v1.1.4-map-auto-redraw-correction (2026-06-06)

**数据库填表后的地图自动重绘修正**

- 修正上一轮“自动地图不调用 AI”的错误策略：数据库表更新回调在 300ms 防抖、重新解析并 rerender 后，会以受控自动路径触发地图重绘。
- `modules/db-status-bar/index.js` 增加地图签名与缓存条目签名，只有地点或地图元素数据变化、或当前位置缺少有效缓存时，自动路径才允许调用 `callMapAI()`；普通刷新按钮仍不无条件生成。
- 保留 `mapBusy` 防重入、`enableMapGeneration` 开关、SVG 白名单清理、AI 失败保留旧图或空状态通知的行为，避免数据库推进/召回链路被重复生成拖慢。

### v1.1.2-status-placement-avatar-modal (2026-06-06)

**状态栏挂载位置与头像弹窗修复**

- 修复 `db-status-bar` 默认挂载目标：`index.js` 不再用“最后渲染楼层”判断默认状态栏位置，而是定位最后 AI/角色消息；用户消息渲染会触发最后 AI 消息刷新，避免状态栏出现在用户输入消息后。
- 保留显式 `<DbStatusBar/>` 与模块块渲染路径，不改变 `world-log`、`bp-panel-newvars`、`relation-status`、`mvu-status-newvars` 的既有扫描机制。
- 角色头像弹窗曾尝试改为 body 级挂载并补齐独立主题变量，但该外观相关改动已在 v1.1.3 中撤销；此段为历史记录，当前挂载层级以 v1.1.5 记录为准。
- 如需再次处理头像弹窗外观问题，必须先确认授权，并提供不污染 `preview-db-status.html` 原始预览外观的方案。
- 已通过 `node --check public\\story_ui_lite_test\\index.js` 与 `node --check public\\story_ui_lite_test\\modules\\db-status-bar\\index.js`；仍需在酒馆运行时验证实际 DOM 事件与弹窗显示。

### v1.1.3-preview-css-revert (2026-06-06)

**预览外观回退与未授权 CSS 撤销**

- 经全量检查确认 `public/story_ui_lite_test/preview-db-status.html` 文件本体相对 HEAD 无改动；预览外观风险来自其引用的 `modules/db-status-bar/style.css`。
- 撤销上一轮未授权新增的 body 级头像弹窗主题变量与弹窗 font-family，不再通过额外 CSS 改变预览外观。
- 此历史版本曾将头像弹窗恢复挂载到状态栏根节点，避免为了 body 级挂载继续扩散 CSS 变量补丁；当前挂载层级以 v1.1.5 记录为准。
- 已搜索确认当前状态栏代码中没有移动端 hover 专项规则或触摸/鼠标悬停事件残留。

### v1.1.1-map-admin-validation (2026-06-05)

**地图安全与管理界面配置闭环修复**

- 加固 `db-status-bar` 地图刷新/重绘链路：缓存与 AI 输出进入 DOM 前清理；重绘失败保留旧图；按钮文本移除 emoji；地图缓存改用无原型对象。
- 补齐管理界面地图配置：`manager-ui/index.js` 提供 API URL、API Key、模型、代理预设四字段；`index.js` 使用 `db-status-map-config` 统一保存、读取、重置并接入 `data-jjks-map-action` 事件链。
- 修复管理面板样式：新增地图配置表单布局，拉平嵌套 CSS，补充移动端单列与按钮宽度规则。
- 复核 `callAI(messages, options)` 静态文档：确认 `max_tokens/maxTokens` 支持；API URL、API Key、模型与代理预设改为通过 shujuku API 预设接口桥接，不再把未文档化字段塞进 `callAI()` options。
- 当前仍需本轮语法检查、ESLint/搜索验证与高性能模型审计后，才能把 `#validate-map-admin` 标记为完成。

### v1.1.0-docs (2026-06-05)

**项目文档与地图任务进度修正**

- 明确每次开工前必须读取 `PROJECT.md` 与 `STATUS_BAR_PLAN.md`。
- 明确每次修改后必须同步项目文档进度。
- 明确 `public/story_ui_lite_test/**` 为当前任务默认边界，禁止默认触碰 ci_island 相关路径。
- 将 `db-status-bar` 补入模块清单和目录结构。
- 记录当前地图任务证据：状态栏刷新/重绘按钮和 `doMap(root, force)` 已存在。
- 记录当时冲突：管理界面地图配置分页缺少实现证据，必须复核或补实现，不能伪造为已完成；该冲突已在 v1.1.1 中补实现，仍待验证闭环。

### v0.1.0 (2026-05-27)

**初始精简版创建**

- 从 `story_regex_ui_releasetest` (releasetest-0.1.1) 复制并重命名
- 移除 `variable-update` 模块（文件夹 + 所有引用）
- 移除 `mvu-status` 旧版模块（文件夹 + 所有引用）
- 将 `story-engine` 模块默认状态设为关闭
- 清理互斥模块逻辑（`getExclusiveModuleId` 不再返回有效互斥 ID）
- 更新所有 CONFIG 标识（env、version、URL、managerRootId）
- 更新 `loader.js` 模块加载列表
- 审计修复：统一各模块 `MODULE_VERSION` 为 `lite_test-*` 风格
  - `relation-status`: `0.1.1-releasetest` → `0.1.1-lite_test`
  - `mvu-status-newvars`: `0.1.1-releasetest-newvars-inline-update` → `0.1.1-lite_test-newvars-inline-update`
  - `story-engine`: `0.3.0-prod-template-aligned` → `0.3.0-lite_test`
- 审计修复：清理 `getExclusiveModuleId` 注释中的旧模块 ID 残留

### v1.0.0 (2026-05-27)

**BP战力雷达模块完全重写**

- 适配新的 BP 数据格式：`<bp_panel_player>` / `<bp_panel_enemy>` 分区结构
- 新解析器：逐行 `key: value` 解析，支持中英文冒号，支持多 player/enemy 块
- 新UI布局：左右双栏（player 左 / enemy 右）+ 侧边竖向 tab 切换
- 单 player + 单 enemy 时隐藏 tab，多角色时显示 tab 可切换
- 完整日/夜主题支持
- 响应式布局（移动端自动切换为纵向堆叠）
- 事件委托到 document 级别，解决 after-native 挂载后事件丢失问题
- 字段映射：名称、最终BP、战力等级、行为模式、咒力量上限/当前/精度、总肉体值_BPA、基础肉体、武艺、术式名称/强度_BPB/潜力/精通、熔断状态、生理状态、特性备注
- 审计修复：
  - 缺失名称时给默认名而非丢弃整块
  - 生理状态 0% 时正确显示
  - 正则标签匹配增强（容忍属性和空格）
  - 保留 `_BPA` / `_BPB` 指标语义标签
- MODULE_VERSION: `1.0.0-lite_test-dual-panel`
