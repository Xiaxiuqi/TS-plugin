# Story UI Lite Test - 项目文档

## 项目概述

`story_ui_lite_test` 是从 `story_regex_ui_releasetest` 精简而来的轻量版前端美化模块。

移除了部分功能模块，保留核心渲染能力，适用于不需要完整变量更新和旧版 MVU 状态栏的场景。

## 基于版本

- 源版本：`story_regex_ui_releasetest` (releasetest-0.1.1)
- 当前版本：`lite_test-0.1.0`

## 模块清单

| 模块 ID | 名称 | 默认状态 | 说明 |
| --- | --- | --- | --- |
| `bp-panel-newvars` | BP战力雷达（兼容） | 开启 | 战力面板展示 |
| `mvu-status-newvars` | MVU状态栏（新变量） | 开启 | 新版 MVU 状态栏，使用新变量体系 |
| `story-engine` | 故事引擎 | **关闭** | 故事驱动引擎渲染，默认关闭 |
| `world-log` | 世界运行报告 | 开启 | 世界状态日志展示 |
| `relation-status` | 角色羁绊档案 | 开启 | 角色关系状态展示 |
| `manager-ui` | 管理面板 | 开启 | 前端管理 UI（开关模块、主题切换等） |
| `db-status-bar` | 数据库状态栏 | 开启 | 从 `AutoCardUpdaterAPI.exportTableAsJson()` 读取数据库表，渲染咒回状态栏、任务与地图 |

## 与 releasetest 版本的差异

### 已移除模块

| 模块 ID | 名称 | 移除原因 |
| --- | --- | --- |
| `variable-update` | 变量更新 | 精简版不需要独立变量更新面板 |
| `mvu-status` | MVU状态栏（旧版） | 已被 `mvu-status-newvars` 替代 |

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

更新时间：2026-06-06

| 项目项 | 状态 | 证据 | 下一步 |
| --- | --- | --- | --- |
| 数据库状态栏基础模块 | 已实现 | `modules/db-status-bar/data.js`、`modules/db-status-bar/index.js`、`modules/db-status-bar/style.css` | 继续按实际反馈修复 |
| 状态栏默认挂载位置 | 已修复，待酒馆运行时复核 | `index.js` 使用最后 AI/角色消息判定驱动 `db-status-bar` 默认挂载；用户消息触发扫描时会刷新最后 AI 消息而不是挂到用户消息后 | 在酒馆中验证用户发言后状态栏仍停留在最后 AI 消息内 |
| 角色头像弹窗 | 已回退未授权外观改动，待酒馆运行时复核 | `modules/db-status-bar/index.js` 将头像弹窗恢复挂载到状态栏根节点；`modules/db-status-bar/style.css` 已撤销 body 级弹窗主题变量，避免影响 `preview-db-status.html` 原始预览外观 | 点击主角/重要角色头像，验证弹窗显示、关闭、保存和移除头像；若仍被容器遮挡，需先征得授权再设计外观/挂载方案 |
| 状态栏地图刷新按钮 | 已修复，待本轮验证/审计 | `modules/db-status-bar/index.js` 中 `data-map-action="refresh"`、`doMap(root, false)`、SVG 清理后写入 DOM | 验证缓存命中、空数据 fallback、按钮防重入 |
| 状态栏地图重绘按钮 | 已修复，待本轮验证/审计 | `modules/db-status-bar/index.js` 中 `data-map-action="redraw"`、`doMap(root, true)`、失败保留旧图逻辑 | 验证强制重绘、AI 失败 fallback、SVG 注入风险 |
| 地图 AI 生成链路 | 已加固，待运行时验证 | `callMapAI()` 使用 `callAI(messages, { max_tokens })`，并通过 `saveApiPreset()`/`setPlotApiPreset()` 桥接 API URL、模型和代理预设 | 运行时复核临时 API 预设切换与恢复是否符合酒馆环境 |
| 管理界面地图配置分页 | 已补实现，待本轮验证/审计 | `index.js` 中地图配置读写与事件链；`modules/manager-ui/index.js` 中 `data-jjks-map-config-form` 和 `data-jjks-map-action` 按钮 | 运行语法、ESLint、emoji 搜索和高性能模型审计 |
| 浮岛误改回滚 | 已完成 | `git diff --name-only -- src/ci_island_test src/ci_island-release dist/ci_island-release dist/ci_island_test dist/ci_island_map public/ci_island` 为空 | 后续默认不碰 ci_island 路径 |

## 当前工作边界

- 本项目根目录：`public/story_ui_lite_test/`
- 状态栏模块：`public/story_ui_lite_test/modules/db-status-bar/`
- 管理界面模块：`public/story_ui_lite_test/modules/manager-ui/`
- 项目文档：`public/story_ui_lite_test/PROJECT.md`、`public/story_ui_lite_test/STATUS_BAR_PLAN.md`
- 禁止默认修改：`src/ci_island_test/**`、`src/ci_island-release/**`、`public/ci_island/**`

## 变更日志

### v1.1.2-status-placement-avatar-modal (2026-06-06)

**状态栏挂载位置与头像弹窗修复**

- 修复 `db-status-bar` 默认挂载目标：`index.js` 不再用“最后渲染楼层”判断默认状态栏位置，而是定位最后 AI/角色消息；用户消息渲染会触发最后 AI 消息刷新，避免状态栏出现在用户输入消息后。
- 保留显式 `<DbStatusBar/>` 与模块块渲染路径，不改变 `world-log`、`bp-panel-newvars`、`relation-status`、`mvu-status-newvars` 的既有扫描机制。
- 角色头像弹窗曾尝试改为 body 级挂载并补齐独立主题变量，但该外观相关改动已在 v1.1.3 中撤销；当前实现以状态栏根节点内挂载为准。
- 如需再次处理头像弹窗被容器遮挡问题，必须先确认授权，并提供不污染 `preview-db-status.html` 原始预览外观的方案。
- 已通过 `node --check public\\story_ui_lite_test\\index.js` 与 `node --check public\\story_ui_lite_test\\modules\\db-status-bar\\index.js`；仍需在酒馆运行时验证实际 DOM 事件与弹窗显示。

### v1.1.3-preview-css-revert (2026-06-06)

**预览外观回退与未授权 CSS 撤销**

- 经全量检查确认 `public/story_ui_lite_test/preview-db-status.html` 文件本体相对 HEAD 无改动；预览外观风险来自其引用的 `modules/db-status-bar/style.css`。
- 撤销上一轮未授权新增的 body 级头像弹窗主题变量与弹窗 font-family，不再通过额外 CSS 改变预览外观。
- 将头像弹窗恢复挂载到状态栏根节点，避免为了 body 级挂载继续扩散 CSS 变量补丁；头像弹窗容器遮挡风险重新标记为运行时待复核。
- 已搜索确认当前状态栏代码中没有移动端 hover 专项规则或触摸/鼠标悬停事件残留。

### v1.1.1-map-admin-validation (2026-06-05)

**地图安全与管理界面配置闭环修复**

- 加固 `db-status-bar` 地图刷新/重绘链路：缓存、AI 输出与 fallback SVG 均进入 DOM 前清理；重绘失败保留旧图；按钮文本移除 emoji；地图缓存改用无原型对象。
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
