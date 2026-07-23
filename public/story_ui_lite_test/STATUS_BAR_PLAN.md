# 咒回前端数据库状态栏 - 开发计划 v2

> 项目位置：`public/story_ui_lite_test/`
> 数据源：`AutoCardUpdaterAPI.exportTableAsJson()` 导出的数据库表
> UI风格：与当前BP面板、世界报告统一（Noto Serif SC + 统一 `story-ui-day/night` 主题入口）
> 设计参考：原神/星穹铁道/鸣潮等游戏UI
> 禁止使用任何emoji，图标使用SVG或Unicode几何符号

---

## 一、系统概述

### 1.1 目标

新增模块 `db-status-bar`，从数据库表直接读取数据渲染状态栏。不依赖 MVU 变量框架。

> 2026-06-18 边界更新：地图已拆分为独立 `db-map` 模块。`db-status-bar` 只保留世界状态、角色、术式/式神/束缚、物品、任务和数据库 API；任务位于状态栏底部独立默认折叠面板。地图的数据库解析、AI API、配置键 `db-status-map-config`、缓存、SVG sanitizer、渲染、交互和自动生成均归 `db-map`。

固定默认挂载顺序为 `bp-panel-newvars → world-log → db-status-bar → db-map`，两个数据库模块均挂到最后一条 AI 消息末尾且不使用显式标签。

### 1.2 UI风格统一要求

必须与以下现有模块保持视觉一致：`bp-panel-newvars`、`world-log`

统一要素：

- 字体：`'Noto Serif SC', 'Source Han Serif SC', 'Microsoft YaHei', serif`
- 面板结构：`panel → header（可折叠）→ body → grid/card`
- 主题入口：统一使用 `story-ui-day` / `story-ui-night` 日夜语义类，模块内部再定义 `--db-*`、`--mvu-*` 等变量别名
- 交互：折叠/展开 toggle（`▼` 符号旋转）+ TAB切换面板
- 装饰：极简，不滥用 `inset box-shadow` 左侧色条，能省则省
- 图标：SVG 内联图标 或 Unicode 几何符号（`✦` `✧` `▸` `▾`）

### 1.3 与旧 MVU 状态栏链路的核心差异

| 维度     | 旧 MVU 状态栏链路            | 数据库状态栏                             |
| -------- | ---------------------------- | ---------------------------------------- |
| 数据来源 | `window.Mvu.getMvuData()`    | `AutoCardUpdaterAPI.exportTableAsJson()` |
| 数据格式 | 嵌套对象 `stat_data.user.*`  | 二维表格 `{ uid: { name, content } }`    |
| 更新触发 | `VARIABLE_UPDATE_ENDED` 事件 | `api.registerTableUpdateCallback()`      |

---

## 二、数据模型

### 2.1 数据库表映射（基于 咒术回战(SQL)_remaster.json）

| 表名         | 前端用途                   | 关键列                                                                                       |
| ------------ | -------------------------- | -------------------------------------------------------------------------------------------- |
| 全局数据表   | 世界状态条（时间、地点）   | 当前时间, 当前地点, 天数                                                                     |
| 主角信息表   | 主角档案及右栏能力         | 姓名, 性别年龄, 职业身份, 当前状态, 生得术式, 术式介绍, 咒具, 领域展开, 反转术式, 永久损伤   |
| 主角属性表   | 主角档案战斗属性           | 等级, 经验, KP, 咒力总量/当前/精度/消耗倍率, 基础肉体, 武艺, 术式潜力/潜力值/熟练度/熔断     |
| 扩展术式表   | 当前角色右栏的术式卡片     | 术式名称, 术式类型, 熟练度, 效果描述, 简介                                                   |
| 咒灵/式神表  | 当前角色右栏的式神卡片     | 式神名称, 类型, 术式, 能力描述, 巅峰BP, 战力等级, 当前状态                                   |
| 束缚表       | 当前角色右栏的束缚卡片     | 束缚名称, 缔结方, 成立条件, 代价与风险, 违约惩罚, 当前状态                                   |
| 重要角色表   | 角色档案 TAB               | 姓名, 性别年龄, 是否离场, 职业身份, 战力等级, 生得术式, 总BP, 关系, 好感度, 信任度, 关系阶段 |
| 重要物品表   | 角色面板底部物品栏         | 物品名称, 数量, 描述, 分类, 备注                                                             |
| 任务与事件表 | 状态栏底部独立任务档案面板 | 任务名称, 评级, 目标情报, 委派方, 描述, 进度, 报酬                                           |

> 注意：主角属性表的"金钱"列为废弃列，不读取不显示。

### 2.2 数据获取与解析

```javascript
// 获取API（跨iframe兼容）
function getAutoCardAPI() {
    if (typeof parent !== 'undefined' && parent.AutoCardUpdaterAPI) return parent.AutoCardUpdaterAPI;
    if (window.AutoCardUpdaterAPI) return window.AutoCardUpdaterAPI;
    return null;
}

// 列名取值（实际列名以API返回的中文表头为准）
function get(headers, row, colName) {
    const idx = headers.indexOf(colName);
    if (idx === -1 || idx >= row.length) return undefined;
    return row[idx];
}
```

---

## 三、界面布局设计

### 3.1 整体结构（从上到下）

```
┌─────────────────────────────────────────────────────┐
│  [顶部信息栏 Panel]                                  │
│   当前时间 ─── 当前地点                               │  ← 全局数据表
├─────────────────────────────────────────────────────┤
│  [角色面板 Panel] ← 可折叠                            │
│   ┌──────┬──────────┬──────────┐                    │
│   │ 主角  │ 重要角色1 │ 重要角色2 │ ...               │  ← TAB标签栏
│   └──────┴──────────┴──────────┘                    │
│   (左栏基础信息；右栏关联术式/式神/束缚)                │
│   [物品栏] ← 角色面板底部独立折叠区                    │
├─────────────────────────────────────────────────────┤
│  [任务档案 Panel] ← 独立、默认折叠                     │
└─────────────────────────────────────────────────────┘

[独立 db-map Panel] 由另一个热插拔模块在状态栏之后挂载。
```

### 3.2 顶部信息栏

- 与 BP 面板和世界报告的面板风格一致
- 两列grid：左=当前时间，右=当前地点
- 样式：`grid-template-columns: 1fr 1fr`，两个 world-card

### 3.3 角色面板（TAB系统）

核心设计：**主角和重要角色共用一个TAB面板**，通过标签切换显示不同角色的信息。

#### TAB标签栏

- 第一个TAB固定为"主角"
- 后续TAB为重要角色表中 `是否离场 !== '是'` 的在场角色
- TAB样式：横向滚动，当前选中高亮（`--db-gold` 底部边框 + 文字加粗）
- 未选中：`--db-muted` 色

#### 主角TAB内容

当前实现采用左右分栏，且不依赖 MVU 模块：

**左栏 - 头像、身份与核心属性：**

- 等级/KP/EXP进度条/咒力条
- 基础肉体/武艺/咒力精度/术式潜力/熔断状态
- 身份/当前状态/永久损伤/当前服装

**右栏 - 角色关联能力：**

- 生得术式、独特能力、领域、反转术式和咒具
- 按 owner 筛选的扩展术式、式神，以及按缔结方筛选的束缚

#### 重要角色TAB内容

- 名称/性别年龄/身份/战力等级/总BP
- 固有术式/特殊能力
- 好感度/信任度进度条（复用MVU的双向进度条设计）
- 关系阶段
- 该角色相关的束缚（从束缚表中筛选缔结方包含该角色名的行）

### 3.4 角色能力、物品与任务布局

核心设计：不建立第二套功能 TAB。术式、式神和束缚跟随当前角色展示在角色面板右栏；物品栏位于角色面板底部；任务位于状态栏底部独立面板；地图由 `db-map` 独立渲染。

#### 角色关联能力

- 生得术式、领域、反转术式、扩展术式、式神和束缚统一放在当前角色内容的右栏。
- 扩展术式和式神按 `owner` 筛选；束缚按缔结方筛选，避免显示其他角色的数据。
- 卡片沿用现有 mini-card、mini-grid 和 toggle-next 视觉与展开模式。

#### 角色面板底部物品栏

- 展示重要物品表，保留拥有者与分类筛选、数量和分类标签。
- 卡片完整显示物品名、描述、效果和重要备注；长文本换行，列表容器保留 200px 高度和滚动条。
- 保留使用、销毁、合成、赠予、索取、丢弃操作，确认文案注入酒馆输入框。
- 赠予仅允许选择主角持有物品并要求目标角色；索取按来源角色锁定可选物品，禁止选择主角物品。

#### 角色信息视觉约束

- 头像设置弹窗预览尺寸与外侧头像统一为 90x120 长方形。
- 主角与重要角色头部信息栏（姓名、职业、等级或战力等级）统一使用放大强调样式。

#### 独立任务档案内容

- 任务与事件表全部行
- 列表布局，按评级排序
- 每条任务：名称/评级标签/进度/委派方
- toggle-next 展开详情：目标情报/描述/报酬
- 参考MVU的 `item-toggle-header` + `item-content` 模式

#### 独立地图模块（替代旧内置地图设计）

- 旧版“状态栏地图 TAB、状态栏地图工具条、状态栏调用 AI”的设计已废止，不再作为实现依据。
- `modules/db-map/data.js` 独立解析地点和地图元素；`modules/db-map/index.js` 独占地图 AI 调用、缓存、SVG sanitizer、基础地图、详情浮层、自动生成和并发调度。
- `db-status-bar` 不得调用 AI API；`db-map` 通过自身 `management` 接口向管理页提供配置、模型拉取、缓存清理和诊断。
- 两个模块在管理页独立开关；关闭地图模块时，模型拉取按钮禁用并显示模块关闭提示。
- 地图固定挂载在 `db-status-bar` 之后，视觉风格保持一致，但 CSS、DOM 和运行时状态互不依赖。

#### 历史反馈修复记录（拆分前，仅供追溯）

> 地图内置时期的实现排查记录已移除，避免失效路径和类名继续误导维护。地图问题统一以 `modules/db-map/` 的代码与验收项为准。

| 问题                  | 已确认成因                                                                                           | 当前边界                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 头像弹窗 CSS 颜色偏移 | 弹窗挂载到 `document.body`，不能依赖状态栏根节点上的主题变量                                         | 头像 portal 使用独立作用域和明确颜色；关闭、禁用、清理时销毁弹窗与 Cropper                         |

---

## 四、模块架构

### 4.1 文件结构

```
public/story_ui_lite_test/modules/db-status-bar/
├── index.js      # 模块主入口（注册、生命周期、Shell渲染、数据加载）
├── style.css     # 完整样式（日/夜双主题、TAB、面板、卡片、资源条）
└── data.js       # 数据解析层（GameState + parseTables + 各表解析函数）
```

> 不做过度拆分。三个文件足够，与现有模块（bp-panel-newvars、world-log）保持一致的粒度。TAB逻辑和渲染逻辑都在 index.js 中。

### 4.2 模块注册

```javascript
ui.registry?.register?.({
    id: 'db-status-bar',
    version: '1.1.0-lite_test',
    priority: 80,
    enabled: true,
    renderContent: renderContentNode,
    mount,
    onEnable, onDisable, cleanup,
});
```

### 4.3 CSS变量体系

```css
.db-status-bar.story-ui-day {
    --db-bg: #f7f1e6;
    --db-panel: rgba(251, 247, 238, 0.97);
    --db-card: rgba(255, 253, 247, 0.86);
    --db-text: #342f29;
    --db-muted: #756b60;
    --db-faint: #a39889;
    --db-gold: #b79a62;
    --db-blue: #748b9d;
    --db-rose: #a07e74;
    --db-line: rgba(117, 107, 96, 0.13);
    --db-shadow: 0 10px 28px rgba(71, 58, 42, 0.14);
    --db-shadow-soft: 0 5px 14px rgba(71, 58, 42, 0.08);
}

.db-status-bar.story-ui-night {
    --db-panel: rgba(29, 35, 44, 0.97);
    --db-card: rgba(255, 255, 255, 0.055);
    --db-text: #ede7dc;
    --db-muted: #b8afa1;
    --db-faint: #807d78;
    --db-gold: #c8a86c;
    --db-blue: #88aeb8;
    --db-rose: #b9877e;
    --db-line: rgba(255, 255, 255, 0.08);
    --db-shadow: 0 14px 36px rgba(0, 0, 0, 0.34);
    --db-shadow-soft: 0 6px 18px rgba(0, 0, 0, 0.22);
}
```

值与 `--mvu-*` 完全对齐；日夜模式统一由 `story-ui-day` / `story-ui-night` 驱动，避免数据库状态栏、BP、世界报告各自维护不同主题类名。测试版 CSS 已改为内联加载，因此重载资源必须同步清理旧的 `style[data-story-ui-css]`，否则旧 BP 样式可能继续留存并造成 BP 自身不随统一主题类换色。

### 4.4 数据流

```
[数据库插件 → db-status-bar]
    → AutoCardUpdaterAPI.exportTableAsJson()
    → [data.js] parseTables(tables) → GameState
    → [index.js] renderStatusShell()
        → renderWorldStrip()      世界状态条
        → renderCharacterPanel()  角色档案面板
            → 角色 TAB 切换
            → 当前角色左右分栏（右栏展示术式、式神、束缚）
            → 角色面板底部物品栏
        → renderQuestPanel()      独立任务档案

[状态栏数据更新]
    → api.registerTableUpdateCallback(onUpdate)
    → 防抖300ms
    → AutoCardUpdaterAPI.exportTableAsJson()
    → parseTables(tables) → rerender(root)

[数据库插件 → db-map]
    → exportTableAsJson() → 解析当前位置与地图元素
    → 地图数据更新回调防抖
    → rerender(root) → maybeAutoMap(root, { allowGenerate: true })
        → 地点/地图元素签名变化或有效缓存缺失时，受控调用 AI 地图生成
        → 签名未变且缓存命中时，仅清理复用缓存，不重复生成
```

---

## 五、实施步骤

### Phase 1：基础骨架与数据层

| 步骤 | 任务                                     | 产出                                         |
| ---- | ---------------------------------------- | -------------------------------------------- |
| 1.1  | 创建 `modules/db-status-bar/` 目录和文件 | 目录结构                                     |
| 1.2  | 编写 `data.js`                           | GameState定义 + parseTables + 各表解析函数   |
| 1.3  | 编写 `index.js` 模块注册和渲染壳         | 注册到registry + renderContentNode + mount   |
| 1.4  | 编写 `style.css` 基础样式                | CSS变量 + panel/card/header基础类 + 日夜主题 |
| 1.5  | 实现顶部信息栏                           | 时间+地点双卡片                              |

### Phase 2：角色TAB面板

| 步骤 | 任务                     | 产出                                        |
| ---- | ------------------------ | ------------------------------------------- |
| 2.1  | 实现TAB标签栏 + 切换逻辑 | 事件委托 + active状态管理                   |
| 2.2  | 实现主角TAB内容          | 核心属性卡片（等级/KP/咒力/肉体/武艺/熔断） |
| 2.3  | 实现重要角色TAB内容      | 角色信息 + 好感度/信任度进度条              |
| 2.4  | TAB样式完善              | 横向滚动 + 选中高亮 + 切换动画              |

### Phase 3：角色关联能力、物品栏与任务

| 步骤 | 任务                   | 产出                                         |
| ---- | ---------------------- | -------------------------------------------- |
| 3.1  | 实现角色右栏关联能力   | 按角色筛选的术式、式神、束缚卡片与折叠详情 |
| 3.2  | 实现角色面板底部物品栏 | 折叠区、owner/分类筛选、物品详情与再利用    |
| 3.3  | 实现独立任务档案       | 状态栏底部默认折叠的列表与展开详情           |

### Phase 4：数据绑定与更新

| 步骤 | 任务                 | 产出                                                                                                 |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| 4.1  | 状态栏初始数据加载   | mount 时仅调用数据库 API 获取状态栏数据                                                             |
| 4.2  | 状态栏更新回调       | `api.registerTableUpdateCallback()` + 300ms 防抖 + 重新解析和 rerender                              |
| 4.3  | 独立地图初始数据加载 | `db-map` 自行解析当前位置与地图元素                                                                 |
| 4.4  | 独立地图更新与并发   | 更新回调防抖 + `mapBusy` 防重入 + pending 自动请求只保留最后一次                                    |
| 4.5  | 独立地图成本控制     | 仅签名变化或有效缓存缺失时允许 AI；刷新优先复用缓存，重绘强制生成；禁用生成时不调用 AI              |

### Phase 5：集成与验证

| 步骤 | 任务                            | 产出                                                                                  |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------- |
| 5.1  | 更新 `loader.js` 添加模块加载   | 分别加载 db-status-bar 与 db-map 的 CSS 和 JS                                         |
| 5.2  | 更新主入口 `index.js`           | 配置最后一条 AI 消息的默认挂载列表与固定顺序，不使用显式标签                          |
| 5.3  | 编写测试数据 mock               | 模拟 exportTableAsJson 返回                                                           |
| 5.4  | preview.html 本地验证           | 确认渲染效果                                                                          |
| 5.5  | 更新 PROJECT.md                 | 记录变更                                                                              |
| 5.6  | 管理界面地图配置分页复核/补实现 | 已补 `data-jjks-map-config-form`、四字段输入、保存/重置和每次打开回填链路；待本轮验证 |
| 5.7  | 地图 AI/SVG 安全验收            | 验证 AI 失败通知、旧地图保留、空状态、SVG 注入风险、按钮防重入和 API 预设桥接         |
| 5.8  | 每次修改后同步项目文档          | 更新 `PROJECT.md` 当前进度快照和本计划验收项                                          |

---

## 六、SVG图标规范

需要图标的交互控件使用内联 SVG，统一规格：

```html
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- 路径 -->
</svg>
```

| 控件             | SVG 描述         |
| ---------------- | ---------------- |
| 角色档案 TAB     | 人物轮廓         |
| 物品栏折叠与操作 | 方形背包/箱子    |
| 任务档案折叠     | 旗帜/清单        |
| 独立地图工具栏   | 指南针/地图折叠  |

术式、式神和束缚属于角色右栏内容，不定义为功能 TAB。图标颜色跟随 `currentColor`，随主题自动切换。

---

## 七、数据更新策略

### 7.1 初始加载

```javascript
async function initData() {
    const api = getAutoCardAPI();
    if (!api) { loadTestData(); renderAll(); return; }
    const tables = await api.exportTableAsJson();
    parseTables(typeof tables === 'string' ? JSON.parse(tables) : tables);
    renderAll();
    api.registerTableUpdateCallback(onTableUpdate);
}
```

### 7.2 防抖更新

```javascript
let debounceTimer = null;
function onTableUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const api = getAutoCardAPI();
        const tables = await api.exportTableAsJson();
        parseTables(typeof tables === 'string' ? JSON.parse(tables) : tables);
        renderAll();
    }, 300);
}
```

---

## 八、主题集成

- 监听 `story-ui-theme-changed` 事件切换日/夜主题
- 使用 `ui.theme?.getTheme?.()` 获取当前主题
- 主题切换时按模块自身 rerender 策略重建面板
- CSS变量值与BP面板、世界报告完全对齐
- 所有模块统一消费 `story-ui-day` / `story-ui-night`；不得再为同一个日夜模式新增并行的 `theme-*` 或模块私有日夜类
- 测试版 `loader.js` 内联 CSS 后，入口版本号与 `loader.js` 版本号必须随主题样式变更同步提升；管理面板“重载资源”必须清理 `style[data-story-ui-css]` 与 `link[data-story-ui-css]`，避免旧样式残留造成模块间主题状态不一致
- 测试版 import 入口无法通过 `document.currentScript` 或 `document.scripts` 识别自身 `index.js` 来源时，必须回退到 `CONFIG.publicBaseUrl`，禁止拼接本地扩展目录；`loader.js` 加载失败或已有 loader 标签长时间未就绪时必须移除残留 `<script>`，避免重载被旧失败标签污染

---

## 九、与现有系统的集成

### 9.1 模块关系

- 当前精简测试版保留 `bp-panel-newvars`、`world-log`、`manager-ui`、`db-status-bar` 与 `db-map`
- `mvu-status-newvars` 与 `relation-status` 已从 loader、入口注册、管理面板模块列表和诊断注册来源中移除
- 共享 `core/` 基础设施（dom.js、registry.js、theme.js、scanner.js）

### 9.2 挂载规则

`db-status-bar` 与 `db-map` 均不使用显式标签。入口只在最后一条 AI 消息末尾创建默认挂载，固定顺序为 `bp-panel-newvars → world-log → db-status-bar → db-map`。

### 9.3 loader.js 模块定义

```javascript
{ id: 'db-status-bar', css: 'modules/db-status-bar/style.css', scripts: [
    'modules/db-status-bar/data.js',
    'modules/db-status-bar/index.js'
]},
{ id: 'db-map', css: 'modules/db-map/style.css', scripts: [
    'modules/db-map/data.js',
    'modules/db-map/index.js'
]}
```

---

## 十、风险与约束

| 风险                            | 影响                                                                                                                                   | 缓解                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API不可用                       | 无数据                                                                                                                                 | 测试数据fallback + 加载提示                                                                                                                                                                                    |
| 表名/列名变更                   | 解析失败                                                                                                                               | 容错处理，列名不存在返回默认值                                                                                                                                                                                 |
| 重要角色过多                    | TAB溢出                                                                                                                                | 横向滚动 + 最大显示数限制                                                                                                                                                                                      |
| 地图实现与文档不一致            | 误判进度、重复施工或遗漏验收                                                                                                           | 以 `modules/db-map/` 与管理页实际调用链为准，状态栏不得恢复地图职责                                                                                                                                             |
| AI SVG 未清理                   | XSS、外链资源加载、地图 DOM 被污染                                                                                                     | 代码已接入 SVG 白名单清理与原子替换，本轮需验证                                                                                                                                                                |
| AI 失败路径破坏旧图             | 用户点击重绘后地图消失                                                                                                                 | 代码已改为失败保留旧图；无旧图时显示空状态并通知，本轮需验证缓存与通知路径                                                                                                                                     |
| 管理界面配置分页回归            | 用户无法配置地图 AI/API 参数                                                                                                           | 已补 UI、读写事件链与每次打开回填；本轮需用代码搜索、语法检查和审计防止回归                                                                                                                                    |
| 自动地图 AI 干扰数据库推进/召回 | `db-map` 更新回调可能重复触发 AI 生成，干扰数据库插件生成生命周期                                                                      | 地图回调保留防抖；仅签名变化或有效缓存缺失时允许 AI，`mapBusy` 防重入，禁用生成时仅复用缓存或通知空状态                                                                                                       |
| 地图自定义 API 配置不生效       | 用户填写的 API URL/API Key/模型未用于手动地图生成                                                                                      | 当前实现通过 `TavernHelper.generate({ custom_api })` 传入自定义 API，不切换酒馆全局预设                                                                                                                        |
| 地图/API debug 信息不足         | 失败时无法判断生成器绑定源、返回对象摘要、SVG 提取或 sanitizer 拒绝原因                                                               | `db-map` 使用脱敏日志覆盖配置、生成器、返回摘要、SVG 提取和 sanitizer，不输出完整 API Key 或原始 AI 结果                                                                                                      |
| 地图重绘缺少运行中状态          | 用户点击后没有地图区域，也看不到正在重绘，误判为按钮无效                                                                               | 已在 `doMap(root, true)` 生成分支立即写入“正在重绘地图…”状态；无旧图时显示“正在生成地图…”占位，成功后替换 SVG，失败保留旧图或显示明确空状态                                                                    |
| 地图工具条或空状态高度异常      | 窄宽度下按钮换行或空内容可能挤压地图区域                                                                                               | 地图样式由 `.db-map` 独立作用域约束，工具条保持稳定布局，viewport 与空状态设置可见最小高度                                                                                                                      |
| 无缓存地图区域空白              | 普通刷新不允许生成 AI，且之前无缓存/AI失败无旧图路径只显示纯空状态                                                                     | `db-map` 基于自身 `MapState.mapElements` 生成基础 SVG；基础 SVG 经 `sanitizeSVG()` 后进入 DOM，不写入 `mapCache`，不恢复静态默认地图                                                                           |
| 地图缓存签名污染                | AI 失败保留旧图时若用当前 signature 写入 previousSvg，会把旧图伪装成新地图缓存                                                         | 已删除失败保留旧图路径的 `setMapCacheEntry()`，只有 AI 成功生成和缓存规范化路径写缓存                                                                                                                          |
| 头像弹窗颜色偏离预览            | body 级弹窗继续消费状态栏 CSS 变量，颜色不再对齐 `preview-db-status.html` 浅色预览                                                     | 收敛头像弹窗局部 CSS 颜色，不改预览页本体，不新增全局 body 变量                                                                                                                                                |
| 束缚表缔结方格式不确定          | 筛选逻辑错误                                                                                                                           | 用 includes() 模糊匹配                                                                                                                                                                                         |
| 状态栏默认挂载缺失或错位        | 用户输入后状态栏位置错乱，或最新 AI 消息没有默认状态栏                                                                                  | `index.js` 定位最后 AI 消息，并将 `db-status-bar` 加入默认 after-native 挂载列表；用户消息触发扫描时会刷新最后 AI 消息并移除其他默认状态栏实例                                                                 |
| 头像弹窗挂在消息容器内不可见    | 点击角色头像无弹窗，或被消息容器层级、overflow、状态栏 rerender 影响                                                                   | 当前点击链路已复核为 `.db-sb-avatar-box` 事件委托到 `showAvatarModal()`，弹窗挂载到 `document.body`；仍需酒馆运行时复核 URL、本地上传、移除和裁剪                                                              |
| 跨域 CSS 被外部动态样式脚本读取 | 点击重载美化后，外部 `dynamic-styles.js` 遍历 `document.styleSheets[].cssRules` 时会因为跨域 `<link>` 抛出 `SecurityError`             | `loader.js` 与管理面板样式加载改为优先 fetch CSS 文本并注入同源可读的 `<style data-story-ui-css>`；fetch 失败且资源跨域时不再主动创建跨域 link                                                                 |

---

## 十一、验收标准

### 功能

- [ ] 顶部信息栏正确显示时间和地点
- [ ] 角色面板TAB切换正常（主角 + 在场角色）
- [ ] 主角TAB完整显示属性和资源条
- [ ] 背包再利用支持赠予/索取的 owner 约束、目标角色选择和输入框文案注入
- [ ] 头像外侧显示与设置弹窗预览尺寸一致（90x120）
- [ ] 点击主角头像与重要角色头像会显示头像设置弹窗，关闭、保存、移除头像后状态栏可回刷；如需变更挂载层级必须先确认不污染预览外观
- [ ] 用户消息渲染后，数据库状态栏默认实例仍挂在最后一条 AI 消息末尾，不出现在用户输入消息后，且不依赖显式标签
- [ ] 主角与重要角色头部信息栏强调样式一致

- [ ] 头像弹窗颜色与 `preview-db-status.html` 浅色参考一致，且没有新增污染全局或预览页本体的 CSS 变量
- [x] 禁用或清理状态栏时会移除当前模块创建的 body 级头像弹窗、销毁 Cropper，并阻止迟到的异步初始化
- [ ] 重要角色TAB显示信息+好感度/信任度
- [ ] 主角与重要角色右栏显示各自关联的扩展术式、式神和束缚
- [ ] 主角右栏显示生得术式、独特能力、领域、反转术式与咒具
- [ ] 角色面板底部物品栏支持折叠、owner/分类筛选与物品详情
- [ ] 状态栏底部独立任务档案显示任务列表+详情，默认折叠
- [ ] 独立 `db-map` 显示当前地点、SVG 视口、图例和详情面板
- [ ] 独立地图刷新按钮触发 `doMap(root, false)`，缓存存在时直接复用且不重复生成
- [ ] 独立地图重绘按钮触发 `doMap(root, true)`，成功后才替换缓存与 DOM
- [x] 地图 AI 调用失败时保留旧图；无旧图时显示基础地图或明确空状态并通过通知/状态文本提示失败，不生成默认地图
- [x] 点击重绘地图后立即显示“正在重绘地图”状态和生成中占位，按钮禁用期间用户能看到反馈
- [x] 地图/API 测试版运行时诊断由 `db-map` 覆盖配置、生成器、返回摘要、SVG 提取和 sanitizer；API Key 与 URL 敏感参数保持脱敏
- [x] `db-map` 工具条保持稳定高度，窄宽度下不因按钮换行挤压地图区域
- [x] 无 AI 缓存、AI 关闭或 AI 失败无旧图时，地图页基于 `dbMapData.MapState.mapElements` 显示经清理的基础 SVG；无元素时显示明确空状态
- [x] 基础 SVG 不写入 `mapCache`，AI 失败保留旧图时不使用当前 signature 写旧图缓存
- [x] 地图 viewport 与空状态保持可见最小高度，避免空内容把地图区域压缩到极小高度
- [ ] `.cm[data-idx]` 地图点击目标能显示对应元素详情
- [ ] 数据库表更新后，地点或地图元素签名变化会自动触发受控 AI 地图重绘；签名未变且缓存命中时不重复生成
- [x] 管理界面地图配置只通过 `db-map.management` 读写；地图模块关闭时模型拉取按钮禁用并给出提示
- [x] `db-status-bar` 无 AI 调用，`db-map` 无状态栏运行时或样式依赖；两个模块可独立开关
- [x] 固定默认挂载顺序为 `bp-panel-newvars → world-log → db-status-bar → db-map`，且不使用显式标签
- [ ] 数据更新后UI自动刷新
- [x] 日/夜主题切换链路已统一到 `story-ui-day/night`，并补齐内联 CSS 旧样式清理与版本失效；酒馆运行时仍需复核管理面板、BP 图标、世界报告图标三种入口均能同步换色
- [x] 数据库状态栏 `.db-sb-mark` 已接入 `data-story-ui-theme-toggle`，点击后复用统一日夜切换链路，并监听 `story-ui-theme-changed` 重渲染以同步 `✦/✧` 图标
- [x] BP 面板与数据库状态栏日间 mark 为 `✦`、夜间 mark 为 `✧`；数据库状态栏角色关键数值字号最终层叠值为 12px
- [x] `mvu-status-newvars`、`relation-status` 与旧消息折叠功能已从代码侧清理；诊断注册来源不再包含已删除模块
- [x] 管理面板暗色模式已补齐地图 API 输入控件与启用 AI 地图生成 checkbox 的颜色覆盖，模块状态“已注册”增加间距并改为绿色

### 质量

- [ ] 无emoji使用
- [ ] 与BP面板/世界报告视觉风格统一
- [ ] 移动端响应式正常
- [ ] API不可用时优雅降级
- [ ] 无JS报错，包括点击“重载美化”后不再出现 `dynamic-styles.js` 读取跨域 `cssRules` 的 SecurityError
- [x] 代码侧 CSS 选择器已按 `.db-status-bar` / `.db-map` 收口，body 头像 portal 使用独立作用域；仍需浏览器视觉回归

---

## 十二、后续迭代

1. **地图运行时验证**：在酒馆环境确认数据库填表结束后位置/地图元素变化会自动重绘、未变化不重复生成，并确认地图临时 API 预设保存、切换、调用与恢复是否正常；同时复核 custom_api/模型拉取/异常日志中 URL 可完整定位、custom_api 模型可见、主 API 模型不可见时明确 unavailable，且无完整 API Key 泄露。
2. **地图 AI/SVG 安全复验**：持续验证 SVG 白名单清理、原子替换、失败保留旧图、按钮防重入和历史脏缓存清理。
3. **战斗模式**：检测全局数据表模式字段，切换战斗UI布局。
4. **动画增强**：资源条变化动画、TAB切换过渡。
5. **数据缓存**：localStorage缓存上次数据，加速首屏。
