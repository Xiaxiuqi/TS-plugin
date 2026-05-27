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

每次修改本项目时，必须遵循以下流程：

1. **获得需求** → 明确修改目标和影响范围
2. **进行计划** → 分析现有代码，制定修改方案
3. **执行实际工作** → 按计划修改代码
4. **交由子代理审计** → 审查修改的正确性、边界条件、兼容性
5. **记录到项目文档** → 将本次工作内容同步到本文档的变更日志
6. **执行 commit 流程** → 提交 commit（PUSH 由人工执行）

## 变更日志

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
