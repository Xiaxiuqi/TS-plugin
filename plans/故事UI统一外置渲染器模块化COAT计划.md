# 故事 UI 统一外置渲染器模块化 COAT 计划

## 目标

将当前分散在 [`src/数据库前端/故事引擎正则`](../src/数据库前端/故事引擎正则) 下的多套日夜切换正则，重构为：

- 一条酒馆内使用的统一引导正则。
- 两套外置资源目录：测试版与正式版。
- 模块化外置渲染器。
- 每个模块可单独维护，例如只修改 MVU 状态栏模块而不影响变量更新、世界运行报告或 BP 面板。
- 米白版本与暗色版本作为视觉来源。
- 普通正文保持原样，非连续美化块可局部渲染。
- 浏览器本地储存只保存主题与少量配置，不保存消息正文。

---

## 1. 关联检查

### 当前问题

- 当前日夜切换版本把大量样式、模板和同步逻辑内联进每条正则替换内容。
- 多个模块同时出现在同一条消息时，酒馆需要反复解析大量重复样式与脚本。
- 当前日夜切换文件中存在多套重复主题逻辑，增加卡顿与维护成本。
- 变量更新主题保存曾出现不稳定，说明继续依赖消息片段内的脚本并不理想。

### 已完成前置整理

- 已将原“星铁版本/星铁终端风格”文件重命名为“暗色版本”。
- 当前视觉来源应改为：
  - [`变量更新美化正则-米白版本`](../src/数据库前端/故事引擎正则/变量更新美化正则-米白版本)
  - [`变量更新美化正则-暗色版本`](../src/数据库前端/故事引擎正则/变量更新美化正则-暗色版本)
  - [`故事引擎悬浮球美化正则-米白版本`](../src/数据库前端/故事引擎正则/故事引擎悬浮球美化正则-米白版本)
  - [`故事引擎悬浮球美化正则-暗色版本`](../src/数据库前端/故事引擎正则/故事引擎悬浮球美化正则-暗色版本)
  - [`世界运行报告美化正则-米白版本`](../src/数据库前端/故事引擎正则/世界运行报告美化正则-米白版本)
  - [`世界运行报告美化正则-暗色版本`](../src/数据库前端/故事引擎正则/世界运行报告美化正则-暗色版本)
  - [`状态栏·好感度美化正则-米白版本`](../src/数据库前端/故事引擎正则/状态栏·好感度美化正则-米白版本)
  - [`状态栏·好感度美化正则-暗色版本`](../src/数据库前端/故事引擎正则/状态栏·好感度美化正则-暗色版本)
  - [`BP系统美化正则-米白版本`](../src/数据库前端/故事引擎正则/BP系统美化正则-米白版本)
  - [`BP系统美化正则-暗色版本`](../src/数据库前端/故事引擎正则/BP系统美化正则-暗色版本)
  - [`MVU状态栏美化正则-米白版本`](../src/数据库前端/故事引擎正则/MVU状态栏美化正则-米白版本)
  - [`MVU状态栏美化正则-暗色版本`](../src/数据库前端/故事引擎正则/MVU状态栏美化正则-暗色版本)

### 新增用户要求

- 在 [`public`](../public) 下建立两个外置资源目录：
  - 测试版目录：用于日常开发、调试、试验更新。
  - 正式版目录：用于酒馆实际稳定引用。
- 后续更新先改测试版，验证完成后同步到正式版。
- 外置资源必须模块化，能够单独修改某个模块，不影响其他模块。
- 计划需要以项目文档形式保存，本文件即为该计划文档。

---

## 2. 候选方案

### 方案 A：一个正式目录，一个测试目录，每个目录内使用单文件资源

结构：

- [`public/story_regex_ui_test/story-regex-ui.js`](../public/story_regex_ui_test/story-regex-ui.js)
- [`public/story_regex_ui_test/story-regex-ui.css`](../public/story_regex_ui_test/story-regex-ui.css)
- [`public/story_regex_ui_prod/story-regex-ui.js`](../public/story_regex_ui_prod/story-regex-ui.js)
- [`public/story_regex_ui_prod/story-regex-ui.css`](../public/story_regex_ui_prod/story-regex-ui.css)

优点：

- 文件数量少。
- 引导正则简单。
- 初始实现快。

缺点：

- 模块不独立。
- 修改 MVU 状态栏也要改整体文件。
- 样式容易互相污染。
- 不符合“单独修改某个模块”的长期要求。

评分：

- 架构合理性：3
- 实现复杂度：5
- 可维护性：2
- 性能表现：4
- 模块独立性：1
- 测试发布流程：3

结论：不推荐。

---

### 方案 B：测试版/正式版双目录，目录内模块化

测试版目录：

- [`public/story_regex_ui_test/loader.js`](../public/story_regex_ui_test/loader.js)
- [`public/story_regex_ui_test/shared.css`](../public/story_regex_ui_test/shared.css)
- [`public/story_regex_ui_test/core/theme.js`](../public/story_regex_ui_test/core/theme.js)
- [`public/story_regex_ui_test/core/registry.js`](../public/story_regex_ui_test/core/registry.js)
- [`public/story_regex_ui_test/core/scanner.js`](../public/story_regex_ui_test/core/scanner.js)
- [`public/story_regex_ui_test/core/dom.js`](../public/story_regex_ui_test/core/dom.js)
- [`public/story_regex_ui_test/modules/variable-update/index.js`](../public/story_regex_ui_test/modules/variable-update/index.js)
- [`public/story_regex_ui_test/modules/variable-update/style.css`](../public/story_regex_ui_test/modules/variable-update/style.css)
- [`public/story_regex_ui_test/modules/world-log/index.js`](../public/story_regex_ui_test/modules/world-log/index.js)
- [`public/story_regex_ui_test/modules/world-log/style.css`](../public/story_regex_ui_test/modules/world-log/style.css)
- [`public/story_regex_ui_test/modules/bp-panel/index.js`](../public/story_regex_ui_test/modules/bp-panel/index.js)
- [`public/story_regex_ui_test/modules/bp-panel/style.css`](../public/story_regex_ui_test/modules/bp-panel/style.css)
- [`public/story_regex_ui_test/modules/story-engine/index.js`](../public/story_regex_ui_test/modules/story-engine/index.js)
- [`public/story_regex_ui_test/modules/story-engine/style.css`](../public/story_regex_ui_test/modules/story-engine/style.css)
- [`public/story_regex_ui_test/modules/relation/index.js`](../public/story_regex_ui_test/modules/relation/index.js)
- [`public/story_regex_ui_test/modules/relation/style.css`](../public/story_regex_ui_test/modules/relation/style.css)
- [`public/story_regex_ui_test/modules/mvu-status/index.js`](../public/story_regex_ui_test/modules/mvu-status/index.js)
- [`public/story_regex_ui_test/modules/mvu-status/style.css`](../public/story_regex_ui_test/modules/mvu-status/style.css)

正式版目录：

- [`public/story_regex_ui_prod/loader.js`](../public/story_regex_ui_prod/loader.js)
- [`public/story_regex_ui_prod/shared.css`](../public/story_regex_ui_prod/shared.css)
- [`public/story_regex_ui_prod/core/theme.js`](../public/story_regex_ui_prod/core/theme.js)
- [`public/story_regex_ui_prod/core/registry.js`](../public/story_regex_ui_prod/core/registry.js)
- [`public/story_regex_ui_prod/core/scanner.js`](../public/story_regex_ui_prod/core/scanner.js)
- [`public/story_regex_ui_prod/core/dom.js`](../public/story_regex_ui_prod/core/dom.js)
- [`public/story_regex_ui_prod/modules/variable-update/index.js`](../public/story_regex_ui_prod/modules/variable-update/index.js)
- [`public/story_regex_ui_prod/modules/variable-update/style.css`](../public/story_regex_ui_prod/modules/variable-update/style.css)
- [`public/story_regex_ui_prod/modules/world-log/index.js`](../public/story_regex_ui_prod/modules/world-log/index.js)
- [`public/story_regex_ui_prod/modules/world-log/style.css`](../public/story_regex_ui_prod/modules/world-log/style.css)
- [`public/story_regex_ui_prod/modules/bp-panel/index.js`](../public/story_regex_ui_prod/modules/bp-panel/index.js)
- [`public/story_regex_ui_prod/modules/bp-panel/style.css`](../public/story_regex_ui_prod/modules/bp-panel/style.css)
- [`public/story_regex_ui_prod/modules/story-engine/index.js`](../public/story_regex_ui_prod/modules/story-engine/index.js)
- [`public/story_regex_ui_prod/modules/story-engine/style.css`](../public/story_regex_ui_prod/modules/story-engine/style.css)
- [`public/story_regex_ui_prod/modules/relation/index.js`](../public/story_regex_ui_prod/modules/relation/index.js)
- [`public/story_regex_ui_prod/modules/relation/style.css`](../public/story_regex_ui_prod/modules/relation/style.css)
- [`public/story_regex_ui_prod/modules/mvu-status/index.js`](../public/story_regex_ui_prod/modules/mvu-status/index.js)
- [`public/story_regex_ui_prod/modules/mvu-status/style.css`](../public/story_regex_ui_prod/modules/mvu-status/style.css)

优点：

- 符合“测试版先改，正式版后同步”的流程。
- 模块可以单独修改。
- 修改 MVU 状态栏时只动 [`modules/mvu-status`](../public/story_regex_ui_test/modules/mvu-status)。
- 每个模块样式与脚本独立。
- 便于逐步迁移，不需要一次性完成所有模块。
- 后续可按模块刷新缓存。

缺点：

- 文件数量多。
- 需要加载器负责顺序和容错。
- 首次实现比单文件方案复杂。

评分：

- 架构合理性：5
- 实现复杂度：4
- 可维护性：5
- 性能表现：4
- 模块独立性：5
- 测试发布流程：5

结论：推荐。

---

### 方案 C：测试版/正式版双目录，再增加模块清单配置

在方案 B 基础上增加：

- [`public/story_regex_ui_test/manifest.json`](../public/story_regex_ui_test/manifest.json)
- [`public/story_regex_ui_prod/manifest.json`](../public/story_regex_ui_prod/manifest.json)

优点：

- 可以通过配置启用或禁用模块。
- 可以指定每个模块的版本。
- 可以让加载器不写死模块列表。

缺点：

- 初始实现复杂度更高。
- 需要处理清单加载失败。
- 若酒馆或浏览器跨域策略影响 JSON 读取，会增加调试成本。

评分：

- 架构合理性：5
- 实现复杂度：3
- 可维护性：5
- 性能表现：4
- 模块独立性：5
- 测试发布流程：5

结论：作为第二阶段升级目标，不作为第一阶段必选。

---

## 3. 测试与评分结论

推荐采用方案 B：

> 测试版/正式版双目录 + 核心加载器 + 独立业务模块 + 独立模块样式。

第一阶段不强制引入清单配置，降低启动风险。等模块加载、扫描、渲染、主题保存全部稳定后，再升级方案 C。

---

## 4. 回溯记录

放弃单文件外置方案，原因：

- 不满足模块独立修改。
- 不利于单独维护 MVU 状态栏。
- 模块之间容易互相影响。

暂缓清单配置方案，原因：

- 首版需要先验证外部加载与模块注册稳定性。
- 清单方案可以在第二阶段自然引入，不影响当前架构。

---

## 5. 最终技术方案

### 5.1 顶层目录

测试版：

- [`public/story_regex_ui_test`](../public/story_regex_ui_test)

正式版：

- [`public/story_regex_ui_prod`](../public/story_regex_ui_prod)

### 5.2 开发流程

1. 所有新功能先在 [`public/story_regex_ui_test`](../public/story_regex_ui_test) 修改。
2. 酒馆测试正则引用测试版加载器。
3. 验证稳定后，将测试版同步到 [`public/story_regex_ui_prod`](../public/story_regex_ui_prod)。
4. 酒馆正式正则引用正式版加载器。
5. 若只修改一个模块，只同步该模块及必要版本配置。

### 5.3 两条引导正则

建议创建两个文档，方便复制：

- [`src/数据库前端/故事引擎正则/故事UI统一引导正则-测试版`](../src/数据库前端/故事引擎正则/故事UI统一引导正则-测试版)
- [`src/数据库前端/故事引擎正则/故事UI统一引导正则-正式版`](../src/数据库前端/故事引擎正则/故事UI统一引导正则-正式版)

测试版引用：

- [`public/story_regex_ui_test/loader.js`](../public/story_regex_ui_test/loader.js)

正式版引用：

- [`public/story_regex_ui_prod/loader.js`](../public/story_regex_ui_prod/loader.js)

---

## 6. 模块职责

### 6.1 加载器

文件：

- [`public/story_regex_ui_test/loader.js`](../public/story_regex_ui_test/loader.js)
- [`public/story_regex_ui_prod/loader.js`](../public/story_regex_ui_prod/loader.js)

职责：

- 防止重复初始化。
- 加载公共样式。
- 按顺序加载核心文件。
- 按顺序加载业务模块。
- 所有模块加载完成后启动扫描器。
- 失败时给出控制台错误，但不破坏原正文。

### 6.2 公共样式

文件：

- [`public/story_regex_ui_test/shared.css`](../public/story_regex_ui_test/shared.css)
- [`public/story_regex_ui_prod/shared.css`](../public/story_regex_ui_prod/shared.css)

职责：

- 全局主题变量。
- 公共折叠按钮基础样式。
- 公共字体和滚动条基础样式。
- 只放真正共享的样式。
- 不写具体模块卡片布局。

### 6.3 主题模块

文件：

- [`public/story_regex_ui_test/core/theme.js`](../public/story_regex_ui_test/core/theme.js)
- [`public/story_regex_ui_prod/core/theme.js`](../public/story_regex_ui_prod/core/theme.js)

职责：

- 保存主题。
- 读取主题。
- 切换主题。
- 对所有故事 UI 根节点同步主题类。
- 只保存主题值，不保存正文内容。

建议主题键：

- `jjks_story_ui_theme`

当前项目外置渲染器所有新增本地储存键必须使用 `jjks_story_ui` 前缀；不再读取、迁移或清理旧主题键。

### 6.4 注册中心

文件：

- [`public/story_regex_ui_test/core/registry.js`](../public/story_regex_ui_test/core/registry.js)
- [`public/story_regex_ui_prod/core/registry.js`](../public/story_regex_ui_prod/core/registry.js)

职责：

- 提供模块注册。
- 保存模块列表。
- 模块报错时隔离错误，不影响其他模块。

### 6.5 扫描器

文件：

- [`public/story_regex_ui_test/core/scanner.js`](../public/story_regex_ui_test/core/scanner.js)
- [`public/story_regex_ui_prod/core/scanner.js`](../public/story_regex_ui_prod/core/scanner.js)

职责：

- 扫描消息容器。
- 调用各模块识别逻辑。
- 对命中片段局部渲染。
- 未命中正文保持原样。
- 已处理节点打标记。
- 使用合批策略避免频繁扫描。

### 6.6 DOM 工具

文件：

- [`public/story_regex_ui_test/core/dom.js`](../public/story_regex_ui_test/core/dom.js)
- [`public/story_regex_ui_prod/core/dom.js`](../public/story_regex_ui_prod/core/dom.js)

职责：

- 文本转义。
- 安全创建节点。
- 局部替换。
- 找到消息根。
- 判断节点是否已处理。

---

## 7. 业务模块

### 7.1 变量更新模块

文件：

- [`public/story_regex_ui_test/modules/variable-update/index.js`](../public/story_regex_ui_test/modules/variable-update/index.js)
- [`public/story_regex_ui_test/modules/variable-update/style.css`](../public/story_regex_ui_test/modules/variable-update/style.css)
- [`public/story_regex_ui_prod/modules/variable-update/index.js`](../public/story_regex_ui_prod/modules/variable-update/index.js)
- [`public/story_regex_ui_prod/modules/variable-update/style.css`](../public/story_regex_ui_prod/modules/variable-update/style.css)

视觉来源：

- [`变量更新美化正则-米白版本`](../src/数据库前端/故事引擎正则/变量更新美化正则-米白版本)
- [`变量更新美化正则-暗色版本`](../src/数据库前端/故事引擎正则/变量更新美化正则-暗色版本)

### 7.2 世界运行报告模块

文件：

- [`public/story_regex_ui_test/modules/world-log/index.js`](../public/story_regex_ui_test/modules/world-log/index.js)
- [`public/story_regex_ui_test/modules/world-log/style.css`](../public/story_regex_ui_test/modules/world-log/style.css)
- [`public/story_regex_ui_prod/modules/world-log/index.js`](../public/story_regex_ui_prod/modules/world-log/index.js)
- [`public/story_regex_ui_prod/modules/world-log/style.css`](../public/story_regex_ui_prod/modules/world-log/style.css)

视觉来源：

- [`世界运行报告美化正则-米白版本`](../src/数据库前端/故事引擎正则/世界运行报告美化正则-米白版本)
- [`世界运行报告美化正则-暗色版本`](../src/数据库前端/故事引擎正则/世界运行报告美化正则-暗色版本)

### 7.3 BP 面板模块

文件：

- [`public/story_regex_ui_test/modules/bp-panel/index.js`](../public/story_regex_ui_test/modules/bp-panel/index.js)
- [`public/story_regex_ui_test/modules/bp-panel/style.css`](../public/story_regex_ui_test/modules/bp-panel/style.css)
- [`public/story_regex_ui_prod/modules/bp-panel/index.js`](../public/story_regex_ui_prod/modules/bp-panel/index.js)
- [`public/story_regex_ui_prod/modules/bp-panel/style.css`](../public/story_regex_ui_prod/modules/bp-panel/style.css)

视觉来源：

- [`BP系统美化正则-米白版本`](../src/数据库前端/故事引擎正则/BP系统美化正则-米白版本)
- [`BP系统美化正则-暗色版本`](../src/数据库前端/故事引擎正则/BP系统美化正则-暗色版本)

### 7.4 故事引擎模块

文件：

- [`public/story_regex_ui_test/modules/story-engine/index.js`](../public/story_regex_ui_test/modules/story-engine/index.js)
- [`public/story_regex_ui_test/modules/story-engine/style.css`](../public/story_regex_ui_test/modules/story-engine/style.css)
- [`public/story_regex_ui_prod/modules/story-engine/index.js`](../public/story_regex_ui_prod/modules/story-engine/index.js)
- [`public/story_regex_ui_prod/modules/story-engine/style.css`](../public/story_regex_ui_prod/modules/story-engine/style.css)

视觉来源：

- [`故事引擎悬浮球美化正则-米白版本`](../src/数据库前端/故事引擎正则/故事引擎悬浮球美化正则-米白版本)
- [`故事引擎悬浮球美化正则-暗色版本`](../src/数据库前端/故事引擎正则/故事引擎悬浮球美化正则-暗色版本)

### 7.5 好感度模块

文件：

- [`public/story_regex_ui_test/modules/relation/index.js`](../public/story_regex_ui_test/modules/relation/index.js)
- [`public/story_regex_ui_test/modules/relation/style.css`](../public/story_regex_ui_test/modules/relation/style.css)
- [`public/story_regex_ui_prod/modules/relation/index.js`](../public/story_regex_ui_prod/modules/relation/index.js)
- [`public/story_regex_ui_prod/modules/relation/style.css`](../public/story_regex_ui_prod/modules/relation/style.css)

视觉来源：

- [`状态栏·好感度美化正则-米白版本`](../src/数据库前端/故事引擎正则/状态栏·好感度美化正则-米白版本)
- [`状态栏·好感度美化正则-暗色版本`](../src/数据库前端/故事引擎正则/状态栏·好感度美化正则-暗色版本)

### 7.6 MVU 状态栏模块

文件：

- [`public/story_regex_ui_test/modules/mvu-status/index.js`](../public/story_regex_ui_test/modules/mvu-status/index.js)
- [`public/story_regex_ui_test/modules/mvu-status/style.css`](../public/story_regex_ui_test/modules/mvu-status/style.css)
- [`public/story_regex_ui_prod/modules/mvu-status/index.js`](../public/story_regex_ui_prod/modules/mvu-status/index.js)
- [`public/story_regex_ui_prod/modules/mvu-status/style.css`](../public/story_regex_ui_prod/modules/mvu-status/style.css)

视觉来源：

- [`MVU状态栏美化正则-米白版本`](../src/数据库前端/故事引擎正则/MVU状态栏美化正则-米白版本)
- [`MVU状态栏美化正则-暗色版本`](../src/数据库前端/故事引擎正则/MVU状态栏美化正则-暗色版本)

单独修改 MVU 时：

- 只修改 [`public/story_regex_ui_test/modules/mvu-status/index.js`](../public/story_regex_ui_test/modules/mvu-status/index.js)
- 只修改 [`public/story_regex_ui_test/modules/mvu-status/style.css`](../public/story_regex_ui_test/modules/mvu-status/style.css)
- 测试通过后只同步到 [`public/story_regex_ui_prod/modules/mvu-status`](../public/story_regex_ui_prod/modules/mvu-status)

---

## 8. 样式隔离规范

所有模块必须使用独立命名空间。

推荐前缀：

- 变量更新：`story-ui-vu-`
- 世界报告：`story-ui-wlog-`
- BP 面板：`story-ui-bp-`
- 故事引擎：`story-ui-se-`
- 好感度：`story-ui-rel-`
- MVU 状态栏：`story-ui-mvu-`

禁止使用宽泛类名：

- `.card`
- `.panel`
- `.toggle-icon`
- `.content`
- `.header`

如果必须使用通用概念，也必须加模块前缀。

---

## 9. 模块接口规范

每个业务模块对外暴露统一对象：

- 模块编号。
- 模块版本。
- 识别逻辑。
- 渲染逻辑。
- 挂载逻辑。
- 清理逻辑。

建议接口字段：

- `id`
- `version`
- `detect`
- `render`
- `mount`
- `cleanup`

核心扫描器只调用这些接口，不知道模块内部实现。

---

## 10. 非连续渲染支持

目标消息示例：

- 故事引擎块
- 普通正文第一段
- 变量更新块
- 普通正文第二段
- 世界运行报告块
- BP 面板块

扫描器处理策略：

1. 按消息 DOM 原顺序扫描。
2. 命中某个模块边界时，只替换对应片段。
3. 未命中的文本节点保持原样。
4. 每个已处理片段打上 `data-story-ui-processed`。
5. 后续新增消息只处理新增部分。

---

## 11. 测试版到正式版同步策略

### 开发阶段

只修改：

- [`public/story_regex_ui_test`](../public/story_regex_ui_test)

酒馆启用：

- [`故事UI统一引导正则-测试版`](../src/数据库前端/故事引擎正则/故事UI统一引导正则-测试版)

### 发布阶段

将测试版稳定内容同步到：

- [`public/story_regex_ui_prod`](../public/story_regex_ui_prod)

酒馆正式使用：

- [`故事UI统一引导正则-正式版`](../src/数据库前端/故事引擎正则/故事UI统一引导正则-正式版)

### 单模块同步

例如只发布 MVU：

从：

- [`public/story_regex_ui_test/modules/mvu-status`](../public/story_regex_ui_test/modules/mvu-status)

同步到：

- [`public/story_regex_ui_prod/modules/mvu-status`](../public/story_regex_ui_prod/modules/mvu-status)

其他模块不动。

---

## 12. 缓存策略

测试版建议使用固定测试参数：

- `loader.js?v=test`

正式版建议使用语义版本参数：

- `loader.js?v=1.0.0`

如果只修改 MVU 模块，后续 Manifest 阶段可只升级 MVU 模块版本。

第一阶段未引入 Manifest 时，可通过更新正式版加载器内的模块版本参数刷新对应模块。

---

## 13. 风险应对

### 外部脚本加载失败

应对：

- 原始正文保留。
- 控制台提示错误。
- 不删除原始内容。

### 某个模块报错

应对：

- 注册中心或扫描器对每个模块调用做错误隔离。
- 模块失败不影响其他模块。

### 样式污染

应对：

- 所有样式必须模块前缀。
- 公共样式只放基础变量和工具类。
- 模块样式不得使用无前缀选择器。

### 重复渲染

应对：

- 渲染后打标记。
- 扫描器跳过已处理片段。

### 浏览器缓存没有刷新

应对：

- 测试版使用测试入口。
- 正式版使用版本参数。
- 后续引入 Manifest 后支持模块级版本。

---

## 14. 实施 TODO

- [ ] 创建测试版目录 [`public/story_regex_ui_test`](../public/story_regex_ui_test)。
- [ ] 创建正式版目录 [`public/story_regex_ui_prod`](../public/story_regex_ui_prod)。
- [ ] 在测试版目录创建 [`loader.js`](../public/story_regex_ui_test/loader.js)。
- [ ] 在测试版目录创建 [`shared.css`](../public/story_regex_ui_test/shared.css)。
- [ ] 在测试版目录创建核心模块目录 [`core`](../public/story_regex_ui_test/core)。
- [ ] 创建测试版主题模块 [`core/theme.js`](../public/story_regex_ui_test/core/theme.js)。
- [ ] 创建测试版注册模块 [`core/registry.js`](../public/story_regex_ui_test/core/registry.js)。
- [ ] 创建测试版扫描模块 [`core/scanner.js`](../public/story_regex_ui_test/core/scanner.js)。
- [ ] 创建测试版 DOM 工具模块 [`core/dom.js`](../public/story_regex_ui_test/core/dom.js)。
- [ ] 创建测试版变量更新模块 [`modules/variable-update`](../public/story_regex_ui_test/modules/variable-update)。
- [ ] 创建测试版 MVU 状态栏模块 [`modules/mvu-status`](../public/story_regex_ui_test/modules/mvu-status)。
- [ ] 创建测试版引导正则文档 [`故事UI统一引导正则-测试版`](../src/数据库前端/故事引擎正则/故事UI统一引导正则-测试版)。
- [ ] 首先只验证外部资源能加载。
- [ ] 再验证主题能保存。
- [ ] 再验证变量更新模块能局部渲染。
- [ ] 再验证 MVU 模块可以单独修改。
- [ ] 逐步迁移世界运行报告、BP、故事引擎、好感度。
- [ ] 测试版稳定后同步到正式版目录。
- [ ] 创建正式版引导正则文档 [`故事UI统一引导正则-正式版`](../src/数据库前端/故事引擎正则/故事UI统一引导正则-正式版)。
- [ ] 新方案稳定后删除旧日夜切换文件。
- [ ] 更新 [`日夜切换统一规范.md`](../src/数据库前端/故事引擎正则/日夜切换统一规范.md)。

---

## 15. 最终结论

推荐正式采用：

- [`public/story_regex_ui_test`](../public/story_regex_ui_test) 作为测试版资源目录。
- [`public/story_regex_ui_prod`](../public/story_regex_ui_prod) 作为正式版资源目录。
- 单引导正则加载外部资源。
- 外部核心层负责主题、注册、扫描、DOM 工具。
- 每个业务模块独立文件夹。
- 每个模块独立样式。
- 后续修改某个模块时只改对应模块，不影响其他模块。

该架构满足当前性能优化、模块化维护、测试到正式发布、非连续内容局部美化和主题统一保存的全部要求。
