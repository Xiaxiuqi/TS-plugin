# 咒回前端数据库状态栏 - 开发计划 v2

> 项目位置：`public/story_ui_lite_test/`  
> 数据源：`AutoCardUpdaterAPI.exportTableAsJson()` 导出的数据库表  
> UI风格：与当前BP面板、世界报告、MVU状态栏统一（Noto Serif SC + `--mvu-*` CSS变量体系）  
> 设计参考：原神/星穹铁道/鸣潮等游戏UI  
> 禁止使用任何emoji，图标使用SVG或Unicode几何符号

---

## 一、系统概述

### 1.1 目标

新增模块 `db-status-bar`，从数据库表直接读取数据渲染状态栏。不依赖 MVU 变量框架。

### 1.2 UI风格统一要求

必须与以下现有模块保持视觉一致：`bp-panel-newvars`、`world-log`、`mvu-status-newvars`

统一要素：
- 字体：`'Noto Serif SC', 'Source Han Serif SC', 'Microsoft YaHei', serif`
- 面板结构：`panel → header（可折叠）→ body → grid/card`
- 主题变量：复用 `--mvu-*` 系列或定义兼容的 `--db-*` 别名
- 交互：折叠/展开 toggle（`▼` 符号旋转）+ TAB切换面板
- 装饰：极简，不滥用 `inset box-shadow` 左侧色条，能省则省
- 图标：SVG 内联图标 或 Unicode 几何符号（`✦` `✧` `▸` `▾`）

### 1.3 与MVU状态栏的核心差异

| 维度 | MVU状态栏 | 数据库状态栏（本次） |
| --- | --- | --- |
| 数据来源 | `window.Mvu.getMvuData()` | `AutoCardUpdaterAPI.exportTableAsJson()` |
| 数据格式 | 嵌套对象 `stat_data.user.*` | 二维表格 `{ uid: { name, content } }` |
| 更新触发 | `VARIABLE_UPDATE_ENDED` 事件 | `api.registerTableUpdateCallback()` |

---

## 二、数据模型

### 2.1 数据库表映射（基于 咒术回战(SQL)_remaster.json）

| 表名 | 前端用途 | 关键列 |
| --- | --- | --- |
| 全局数据表 | 顶部信息栏（时间、地点） | 当前时间, 当前地点, 天数 |
| 主角信息表 | 主角基础信息 | 姓名, 性别年龄, 职业身份, 当前状态, 生得术式, 术式介绍, 咒具, 领域展开, 反转术式, 永久损伤 |
| 主角属性表 | 主角战斗属性 | 等级, 经验, KP, 咒力总量/当前/精度/消耗倍率, 基础肉体, 武艺, 术式潜力/潜力值/熟练度/熔断 |
| 扩展术式表 | 术式TAB | 术式名称, 术式类型, 熟练度, 效果描述, 简介 |
| 咒灵/式神表 | 式神TAB | 式神名称, 类型, 术式, 能力描述, 巅峰BP, 战力等级, 当前状态 |
| 束缚表 | 束缚TAB | 束缚名称, 缔结方, 成立条件, 代价与风险, 违约惩罚, 当前状态 |
| 重要角色表 | 角色TAB | 姓名, 性别年龄, 是否离场, 职业身份, 战力等级, 生得术式, 总BP, 关系, 好感度, 信任度, 关系阶段 |
| 重要物品表 | 背包TAB | 物品名称, 数量, 描述, 分类, 备注 |
| 任务与事件表 | 任务TAB | 任务名称, 评级, 目标情报, 委派方, 描述, 进度, 报酬 |

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
│   (选中角色的详细信息)                                 │
├─────────────────────────────────────────────────────┤
│  [功能面板 Panel] ← 可折叠                            │
│   ┌────┬────┬────┬────┬────┬────┐                   │
│   │术式│式神│束缚│背包│任务│地图│                      │  ← TAB标签栏
│   └────┴────┴────┴────┴────┴────┘                   │
│   (选中TAB的内容区)                                   │
└─────────────────────────────────────────────────────┘
```

### 3.2 顶部信息栏

- 与MVU状态栏的"世界状态"面板风格一致
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

参考MVU状态栏的 `renderUser` 布局：

**上半区 - 核心属性卡片（双栏grid）：**
- 左栏（战力卡片）：等级/战力评级/KP/EXP进度条/咒力条
- 右栏（属性面板）：基础肉体/武艺/咒力精度/术式潜力/熔断状态

**下半区 - 信息列表（toggle-next可折叠）：**
- 身份/当前状态/永久损伤
- 当前服装（如有）

#### 重要角色TAB内容

- 名称/性别年龄/身份/战力等级/总BP
- 固有术式/特殊能力
- 好感度/信任度进度条（复用MVU的双向进度条设计）
- 关系阶段
- 该角色相关的束缚（从束缚表中筛选缔结方包含该角色名的行）

### 3.4 功能面板（TAB系统）

核心设计：**术式/式神/束缚/背包/任务/地图 共用一个TAB面板**，通过标签切换显示不同功能内容。与角色面板的TAB交互方式完全一致，不使用弹窗。

#### TAB标签栏

- 6个固定TAB：`术式` | `式神` | `束缚` | `背包` | `任务` | `地图`
- 每个TAB可带SVG图标（16x16，跟随currentColor）
- 横向排列，选中态金色底部边框 + 文字加粗
- 默认选中第一个TAB（术式）

#### 术式TAB内容

- 生得术式卡片（主角信息表）：名称/术式介绍
- 领域展开 / 反转术式（简要展示）
- 扩展术式列表（扩展术式表全部行）：
  - mini-card grid 布局
  - 每张卡片：术式名称/类型/熟练度/效果描述
  - toggle-next 展开简介详情
- 参考MVU的 `buildItemList` + `mini-grid` 布局

#### 式神TAB内容

- 咒灵/式神表全部行
- mini-card grid 布局
- 每张卡片：式神名称/类型/术式/战力等级/当前状态
- toggle-next 展开：能力描述/来源/巅峰BP/备注

#### 束缚TAB内容

- 束缚表全部行（主角和重要角色共用）
- mini-card grid 布局
- 每张卡片：束缚名称/缔结方/成立条件/代价与风险/违约惩罚/当前状态
- 可用筛选标签区分：全部/主角相关/角色相关

#### 背包TAB内容

- 重要物品表全部行
- 顶部：分类筛选标签（全部 + 按 category 字段动态生成）
- mini-card grid 布局（4列）
- 每格：物品名/数量/分类标签
- toggle-next 展开：描述/备注
- 再利用操作区：支持使用/销毁/合成/赠予/索取/丢弃，确认文案注入酒馆输入框
- 赠予模式：自动限制为主角持有物品，其他拥有人分类不可点击，必须选择目标角色
- 索取模式：主角分类不可点击，主角物品不可选；按来源角色锁定可选物品，避免跨 owner 生成错误文案
- 头像设置弹窗预览尺寸与外侧头像统一为 90x120 长方形
- 主角与重要角色头部信息栏（姓名/职业/等级或战力等级）统一使用放大强调样式

#### 任务TAB内容

- 任务与事件表全部行
- 列表布局，按评级排序
- 每条任务：名称/评级标签/进度/委派方
- toggle-next 展开详情：目标情报/描述/报酬
- 参考MVU的 `item-toggle-header` + `item-content` 模式

#### 地图TAB内容（已进入实现与验收阶段）

- 当前代码已不再是纯占位：`modules/db-status-bar/index.js` 中存在 `renderMapTab(S)`、`doMap(root, force)`、`buildMapPrompt(S)`、`fbMap(S)`、`defMap(S)`。
- 工具条已包含任务、刷新地图、重绘地图三个入口；刷新触发 `doMap(root, false)`，重绘触发 `doMap(root, true)`，按钮文本已移除 emoji，并保留项目规范允许的 Unicode 几何符号。
- 地图数据来源为 `GameState.location` 与 `GameState.mapElements`，其中 `mapElements` 由 `data.js` 的 `parseMapElements()` 从“地图元素表”解析。
- AI 生成当前走 `AutoCardUpdaterAPI.callAI()`；`callMapAI()` 仅向 `callAI()` 传文档确认的 `max_tokens`，API URL/API Key/模型/代理预设通过 shujuku API 预设接口临时切换，失败时保留旧图，只有无旧图时回退到清理后的 `fbMap(S)` 或 `defMap(S)`。
- 已补实现但待验证：管理界面地图配置分页已在 `modules/manager-ui/index.js` 和主入口事件链中补齐；SVG 清理、失败路径、按钮防重入、无 emoji 与 API 预设桥接仍需本轮验证和高性能模型审计确认。

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
    version: '1.0.0-lite_test',
    priority: 80,
    enabled: true,
    singleTag: '<DbStatusBar/>',
    renderContent: renderContentNode,
    mount,
});
```

### 4.3 CSS变量体系

```css
.db-status-bar.theme-day {
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

.db-status-bar.theme-night {
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

值与 `--mvu-*` 完全对齐，前缀不同以避免冲突。

### 4.4 数据流

```
[数据库插件]
    → AutoCardUpdaterAPI.exportTableAsJson()
    → [data.js] parseTables(tables) → GameState
    → [index.js] renderAll()
        → renderHeader()         顶部信息栏
        → renderCharacterTabs()  角色TAB面板
        → renderFunctionTabs()   功能TAB面板

[数据更新]
    → api.registerTableUpdateCallback(onUpdate)
    → 防抖300ms → 重新解析 → 更新DOM
```

---

## 五、实施步骤

### Phase 1：基础骨架与数据层

| 步骤 | 任务 | 产出 |
| --- | --- | --- |
| 1.1 | 创建 `modules/db-status-bar/` 目录和文件 | 目录结构 |
| 1.2 | 编写 `data.js` | GameState定义 + parseTables + 各表解析函数 |
| 1.3 | 编写 `index.js` 模块注册和渲染壳 | 注册到registry + renderContentNode + mount |
| 1.4 | 编写 `style.css` 基础样式 | CSS变量 + panel/card/header基础类 + 日夜主题 |
| 1.5 | 实现顶部信息栏 | 时间+地点双卡片 |

### Phase 2：角色TAB面板

| 步骤 | 任务 | 产出 |
| --- | --- | --- |
| 2.1 | 实现TAB标签栏 + 切换逻辑 | 事件委托 + active状态管理 |
| 2.2 | 实现主角TAB内容 | 核心属性卡片（等级/KP/咒力/肉体/武艺/熔断） |
| 2.3 | 实现重要角色TAB内容 | 角色信息 + 好感度/信任度进度条 |
| 2.4 | TAB样式完善 | 横向滚动 + 选中高亮 + 切换动画 |

### Phase 3：功能TAB面板

| 步骤 | 任务 | 产出 |
| --- | --- | --- |
| 3.1 | 实现功能面板TAB标签栏 | 6个TAB + SVG图标 |
| 3.2 | 实现术式TAB | 生得术式 + 扩展术式 mini-grid |
| 3.3 | 实现式神TAB | 式神卡片grid + 展开详情 |
| 3.4 | 实现束缚TAB | 束缚卡片grid + 筛选 |
| 3.5 | 实现背包TAB | 网格 + 分类筛选 + 物品详情 |
| 3.6 | 实现任务TAB | 列表 + 展开详情 |
| 3.7 | 实现地图TAB基础渲染 | SVG 容器、图例、详情面板、fallback 地图 |
| 3.8 | 实现状态栏地图刷新/重绘入口 | `data-map-action="refresh"` / `data-map-action="redraw"` + `doMap(root, force)` |

### Phase 4：数据绑定与更新

| 步骤 | 任务 | 产出 |
| --- | --- | --- |
| 4.1 | 初始数据加载 | mount时调用API获取数据 |
| 4.2 | 注册更新回调 | `api.registerTableUpdateCallback()` |
| 4.3 | 防抖与防重入 | 300ms防抖 + isLoading标志 |
| 4.4 | 增量更新渲染 | 数据变化后重新填充DOM |

### Phase 5：集成与验证

| 步骤 | 任务 | 产出 |
| --- | --- | --- |
| 5.1 | 更新 `loader.js` 添加模块加载 | 加载 db-status-bar 的 css + js |
| 5.2 | 更新主入口 `index.js` | 添加模块标签和锚点 |
| 5.3 | 编写测试数据 mock | 模拟 exportTableAsJson 返回 |
| 5.4 | preview.html 本地验证 | 确认渲染效果 |
| 5.5 | 更新 PROJECT.md | 记录变更 |
| 5.6 | 管理界面地图配置分页复核/补实现 | 已补 `data-jjks-map-config-form`、四字段输入、保存/重置和每次打开回填链路；待本轮验证 |
| 5.7 | 地图 AI/SVG 安全验收 | 验证 AI 失败 fallback、旧地图保留、SVG 注入风险、按钮防重入和 API 预设桥接 |
| 5.8 | 每次修改后同步项目文档 | 更新 `PROJECT.md` 当前进度快照和本计划验收项 |

---

## 六、SVG图标规范

所有TAB图标使用内联SVG，统一规格：

```html
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- 路径 -->
</svg>
```

| TAB | SVG描述 |
| --- | --- |
| 术式 | 卷轴/书页形状 |
| 式神 | 灵体/幽灵轮廓 |
| 束缚 | 锁链/环扣 |
| 背包 | 方形背包/箱子 |
| 任务 | 旗帜/清单 |
| 地图 | 指南针/地图折叠 |

颜色跟随 `currentColor`，随主题自动切换。

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
- 主题切换时重建面板（与MVU状态栏的 `remountAll` 策略一致）
- CSS变量值与BP面板、世界报告完全对齐

---

## 九、与现有系统的集成

### 9.1 模块关系

- `db-status-bar` 与 `mvu-status-newvars` 互斥
- 通过管理面板切换，或在 loader.js 中配置默认启用哪个
- 共享 `core/` 基础设施（dom.js、registry.js、theme.js、scanner.js）

### 9.2 锚点标签

```html
<DbStatusBar/>
```

### 9.3 loader.js 模块定义

```javascript
{ id: 'db-status-bar', css: 'modules/db-status-bar/style.css', scripts: [
    'modules/db-status-bar/data.js',
    'modules/db-status-bar/index.js'
]}
```

---

## 十、风险与约束

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| API不可用 | 无数据 | 测试数据fallback + 加载提示 |
| 表名/列名变更 | 解析失败 | 容错处理，列名不存在返回默认值 |
| 重要角色过多 | TAB溢出 | 横向滚动 + 最大显示数限制 |
| 地图实现与文档不一致 | 误判进度、重复施工或遗漏验收 | 以 `modules/db-status-bar/index.js` 与 `modules/manager-ui/index.js` 的代码证据修正文档 |
| AI SVG 未清理 | XSS、外链资源加载、地图 DOM 被污染 | 代码已接入 SVG 白名单清理与原子替换，本轮需验证 |
| AI 失败路径破坏旧图 | 用户点击重绘后地图消失 | 代码已改为失败保留旧图；本轮需验证 fallback 与缓存路径 |
| 管理界面配置分页回归 | 用户无法配置地图 AI/API 参数 | 已补 UI、读写事件链与每次打开回填；本轮需用代码搜索、语法检查和审计防止回归 |
| 地图 API 预设桥接失败 | 用户填写的 API URL/API Key/模型/代理预设不生效 | 使用 `saveApiPreset()`/`setPlotApiPreset()` 临时切换并在 finally 恢复；运行时仍需验证 |
| 束缚表缔结方格式不确定 | 筛选逻辑错误 | 用 includes() 模糊匹配 |

---

## 十一、验收标准

### 功能

- [ ] 顶部信息栏正确显示时间和地点
- [ ] 角色面板TAB切换正常（主角 + 在场角色）
- [ ] 主角TAB完整显示属性和资源条
- [ ] 背包再利用支持赠予/索取的 owner 约束、目标角色选择和输入框文案注入
- [ ] 头像外侧显示与设置弹窗预览尺寸一致（90x120）
- [ ] 主角与重要角色头部信息栏强调样式一致

- [ ] 重要角色TAB显示信息+好感度/信任度
- [ ] 功能面板6个TAB全部可切换
- [ ] 术式TAB显示生得术式+扩展术式
- [ ] 式神TAB显示式神列表
- [ ] 束缚TAB显示所有束缚
- [ ] 背包TAB显示物品+分类筛选
- [ ] 任务TAB显示任务列表+详情
- [ ] 地图TAB显示当前地点、SVG 视口、图例和详情面板
- [ ] 刷新地图按钮触发 `doMap(root, false)`，缓存存在时清理后复用且不重复生成
- [ ] 重绘地图按钮触发 `doMap(root, true)`，成功后才替换缓存与 DOM
- [ ] 地图 AI 调用失败时保留旧图；无旧图时回退到清理后的 `fbMap(S)` 或 `defMap(S)`
- [ ] `.cm[data-idx]` 地图点击目标能显示对应元素详情
- [ ] 管理界面地图配置分页存在代码证据，包含 API URL、API Key、模型、代理预设、保存/读取/重置/每次打开回填链路
- [ ] 数据更新后UI自动刷新
- [ ] 日/夜主题切换正常

### 质量

- [ ] 无emoji使用
- [ ] 与BP面板/世界报告视觉风格统一
- [ ] 移动端响应式正常
- [ ] API不可用时优雅降级
- [ ] 无JS报错
- [ ] 样式不污染其他模块

---

## 十二、后续迭代

1. **地图运行时验证**：在酒馆环境确认地图临时 API 预设保存、切换、调用与恢复是否正常，并记录 shujuku API 预设接口不兼容时的适配方案。
2. **地图 AI/SVG 安全复验**：持续验证 SVG 白名单清理、原子替换、失败保留旧图、按钮防重入和历史脏缓存清理。
3. **战斗模式**：检测全局数据表模式字段，切换战斗UI布局。
4. **动画增强**：资源条变化动画、TAB切换过渡。
5. **数据缓存**：localStorage缓存上次数据，加速首屏。
