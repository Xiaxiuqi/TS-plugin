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

| 维度     | MVU状态栏                    | 数据库状态栏（本次）                     |
| -------- | ---------------------------- | ---------------------------------------- |
| 数据来源 | `window.Mvu.getMvuData()`    | `AutoCardUpdaterAPI.exportTableAsJson()` |
| 数据格式 | 嵌套对象 `stat_data.user.*`  | 二维表格 `{ uid: { name, content } }`    |
| 更新触发 | `VARIABLE_UPDATE_ENDED` 事件 | `api.registerTableUpdateCallback()`      |

---

## 二、数据模型

### 2.1 数据库表映射（基于 咒术回战(SQL)_remaster.json）

| 表名         | 前端用途                 | 关键列                                                                                       |
| ------------ | ------------------------ | -------------------------------------------------------------------------------------------- |
| 全局数据表   | 顶部信息栏（时间、地点） | 当前时间, 当前地点, 天数                                                                     |
| 主角信息表   | 主角基础信息             | 姓名, 性别年龄, 职业身份, 当前状态, 生得术式, 术式介绍, 咒具, 领域展开, 反转术式, 永久损伤   |
| 主角属性表   | 主角战斗属性             | 等级, 经验, KP, 咒力总量/当前/精度/消耗倍率, 基础肉体, 武艺, 术式潜力/潜力值/熟练度/熔断     |
| 扩展术式表   | 术式TAB                  | 术式名称, 术式类型, 熟练度, 效果描述, 简介                                                   |
| 咒灵/式神表  | 式神TAB                  | 式神名称, 类型, 术式, 能力描述, 巅峰BP, 战力等级, 当前状态                                   |
| 束缚表       | 束缚TAB                  | 束缚名称, 缔结方, 成立条件, 代价与风险, 违约惩罚, 当前状态                                   |
| 重要角色表   | 角色TAB                  | 姓名, 性别年龄, 是否离场, 职业身份, 战力等级, 生得术式, 总BP, 关系, 好感度, 信任度, 关系阶段 |
| 重要物品表   | 背包TAB                  | 物品名称, 数量, 描述, 分类, 备注                                                             |
| 任务与事件表 | 任务TAB                  | 任务名称, 评级, 目标情报, 委派方, 描述, 进度, 报酬                                           |

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

- 当前代码已不再是纯占位：`modules/db-status-bar/index.js` 中存在 `renderMapTab(S)`、`doMap(root, force)`、`buildMapPrompt(S)`、`callMapAI()` 与失败通知链路，不再维护默认地图生成函数。
- 工具条已包含任务、刷新地图、重绘地图三个入口；任务按钮在左，刷新/重绘地图按钮组在右；刷新触发 `doMap(root, false)`，重绘触发 `doMap(root, true)`，按钮文本保留项目规范允许的 Unicode 几何符号；工具条已改为单行稳定布局，右侧按钮组空间不足时横向滚动，不再靠换行撑高地图页。
- 地图数据来源为 `GameState.location` 与 `GameState.mapElements`，其中 `mapElements` 由 `data.js` 的 `parseMapElements()` 从“地图元素表”解析；`data.js` 已支持 `sheet_MapElements`、`map_elements`、`sheet_map` 表名/uid 别名归一化。
- 自动地图路径已改为受控生成：`registerTableUpdateCallback()` 在 300ms 防抖、重新解析数据库表并 rerender 后调用 `maybeAutoMap(root, { allowGenerate: true })`。
- `doMap(root, false, options)` 会基于地点与地图元素签名复用缓存；只有签名变化或当前位置缺少有效签名缓存且 `allowGenerate` 为 true 时，才允许 `callMapAI()` 调用 `TavernHelper.generate()` 或 `AutoCardUpdaterAPI.callAI()`。
- 普通刷新按钮仍触发 `doMap(root, false)`，只复用缓存，不无条件生成；显式重绘按钮触发 `doMap(root, true)`，会清当前地点缓存并强制 AI 生成，失败时通知用户并保留旧图；无 AI 缓存、AI 关闭或 AI 失败且无旧图时，`renderBaseMap(S)` 会基于 `GameState.mapElements` 渲染经 `sanitizeSVG()` 清理的基础 SVG，但不写入 `mapCache`。

#### 本轮反馈修复方案（先文档确认，后代码实施）

| 问题                                  | 已确认成因                                                                                                                                                                                                                                                                                                                                                                                       | 修改方案                                                                                                                                                                                                                                                                                                                | 影响范围                                                                                                                                                            | 验收方式                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 头像弹窗 CSS 颜色变了                 | `preview-db-status.html` 本体只加载 `modules/db-status-bar/style.css`；头像弹窗样式在 `style.css` 中使用 `var(--db-panel)`、`var(--db-text)`、`var(--db-muted)`、`var(--db-rose)`，弹窗又由 `showAvatarModal()` 挂到 `document.body`。这会让弹窗颜色跟随状态栏主题变量或 body 级变量，而不是固定复刻预览页浅色弹窗。之前把“点击链路已复核”当成“外观已复核”，判断维度错了。                       | 按 `preview-db-status.html` 的浅色预览契约修正头像弹窗局部样式：只收敛 `.db-sb-avatar-modal-body`、`.db-sb-avatar-preview`、输入框、URL/上传/移除/关闭按钮的背景、文字、边框、hover 色；不改预览页本体，不新增污染全局的 body 变量，不改变 90x120 头像比例和 body 级挂载。                                              | `public/story_ui_lite_test/modules/db-status-bar/style.css`；必要时只检查 `showAvatarModal()` 挂载点，不改业务逻辑。                                                | 打开 `public/story_ui_lite_test/preview-db-status.html`，点击主角和重要角色头像；日/夜主题下弹窗颜色都应与预览浅色契约一致，URL 输入、本地上传、移除按钮可见且不被状态栏主题污染。 |
| 地图和 API 配置缺 debug log           | `callMapAI()` 目前只在失败时输出 `console.warn`，没有记录使用 TavernHelper 还是数据库 `callAI`、是否启用 custom_api、模型/API URL 脱敏摘要、prompt 长度、返回类型/长度、SVG 提取和 sanitizer 结果。参考 `数据库前端/咒回前端/regex-状态栏.json` 的地图系统在缓存、状态、刷新、角色 marker 绑定处有连续日志。                                                                                     | 增加统一前缀 `[db-status-bar][map-debug]` 的 debug 日志：读取配置、保存配置、重置配置、进入 `doMap()`、缓存命中/清除、调用 `TavernHelper.generate` 或 `AutoCardUpdaterAPI.callAI`、返回值类型和长度、`extractSvgMarkup` 是否命中、`sanitizeSVG` 是否通过、失败 reason。API Key 只记录是否存在和脱敏尾号，禁止完整输出。 | `public/story_ui_lite_test/index.js` 的管理页配置读写；`public/story_ui_lite_test/modules/db-status-bar/index.js` 的 `getMapAiConfig()`、`callMapAI()`、`doMap()`。 | 保存地图 API 设置、清空设置、点击刷新、点击重绘各触发一组可读日志；失败时日志能定位“接口不可用/返回空/非 SVG/sanitizer 拒绝/custom_api 参数问题”，且不泄露完整 key。               |
| `.db-sb-fn-toolbar` 高度异常到 131.56 | `.db-sb-fn-toolbar` 当前 `flex-wrap: wrap`，左右按钮组也 `flex-wrap: wrap`，只要容器宽度不足、字体缩放或按钮文本无法压缩，就会跨多行撑高；现有 CSS 没有约束工具条行高、最小高度、按钮不换行或溢出策略。131.56 需要浏览器 computed style 复核，但从代码看“允许多行换行”是直接风险。                                                                                                               | 工具条改为单行稳定布局：`.db-sb-fn-toolbar` 禁止换行并限制垂直 padding；按钮使用 `white-space: nowrap`；右侧按钮组不足时横向滚动或压缩 gap，不把面板撑高；保留左任务、右刷新/重绘的视觉结构。                                                                                                                           | `public/story_ui_lite_test/modules/db-status-bar/style.css`；只在必要时调整 `renderFunctionPanel()` 按钮文案长度。                                                  | 浏览器检查 `.db-sb-fn-toolbar` computed height，目标为一行按钮高度加固定 padding，不再出现 131.56；窄宽度下按钮仍可点击，不覆盖地图区域。                                          |
| 点击重绘地图没有即时反应且失败        | `doMap(root, true)` 进入生成后只禁用按钮，没有立即设置 `[data-map-status]` 或 viewport 的“正在重绘地图”；若 `TavernHelper.generate` 返回空/非字符串，会走 `TavernHelper.generate returned no usable map text`，最后在无旧图时显示失败空状态。参考 `数据库前端/咒回前端/regex-状态栏.json` 有固定 `mapContainer`、`mapStatusText` 和缓存/显示更新日志，当前状态栏缺少等价的运行中状态和足够日志。 | 重绘入口进入生成前立即更新状态文本为“正在重绘地图...”，viewport 无旧图时显示生成中占位；成功后先通过 `sanitizeSVG()`，再原子替换 DOM 和缓存；失败时保留旧图，无旧图显示明确空状态。同步补 debug log，记录 force、loc、signature、cache、generator、result、svg/sanitizer。不得恢复默认地图 fallback。                   | `public/story_ui_lite_test/modules/db-status-bar/index.js` 的 `doMap()`、`callMapAI()`、`notifyMap()`/`setMapViewportMarkup()`。                                    | 点击“重绘地图”后立即看到按钮禁用和“正在重绘地图”；AI 成功时显示 SVG 地图区域；AI 空返回、非 SVG 或失败时有可见状态和脱敏日志，不写入默认地图，不静默吞错。                         |

##### 与阿斯特里亚成功项目的地图/API 链路对比

本轮地图问题不能只按“按钮没触发”处理。对照 `nailongwang/奶龙王一键制卡/projects/阿斯特里亚王国/王国卡状态栏场景地图实现说明.md` 和实际源码 `nailongwang/奶龙王一键制卡/projects/阿斯特里亚王国/frontend/status-bar.html`，当前链路失败点如下：

| 对比项          | 阿斯特里亚成功链路                                                                                                                                                                               | 当前 `story_ui_lite_test` 链路                                                                                                                                                                                                              | 结论与后续修法                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 生成器入口      | `frontend/status-bar.html` 第668-681行直接使用 `api.callAI([{ role:'user', content: prompt }], { max_tokens:4000 })`，成功项目说明第547-557行也记录为 `api.callAI` 后正则提取 `<svg>...</svg>`。 | `public/story_ui_lite_test/modules/db-status-bar/index.js` 第130-139行在自定义 API 分支改走 `TavernHelper.generate({ user_input, custom_api })`；返回值必须是非空字符串，否则报 `TavernHelper.generate returned no usable map text`。       | 当前报错说明已经进入 `TavernHelper.generate` 分支，但返回值不满足字符串检查。后续代码实施必须记录生成器类型、返回类型、返回长度和 custom_api 脱敏摘要，并验证 `TavernHelper.generate` 是否支持该参数结构；不能只假设 API Key 或模型错了。 |
| 自定义 API 参数 | 阿斯特里亚源码没有 `custom_api` 分支，跟随数据库插件当前 `api.callAI` 配置。                                                                                                                     | 当前通过 `buildMapCustomApi()` 组装 `custom_api` 后交给 `TavernHelper.generate`；`@types/function/generate.d.ts` 已确认 `CustomApiConfig` 字段名包含 `apiurl`、`key`、`model`、`source`、`proxy_preset`，所以 `apiurl` 小写不是已证实根因。 | API 配置“看起来填了”不等于运行时调用链正确。后续必须在 debug log 中输出 custom_api 的字段存在性、API URL 脱敏域名/路径摘要、模型名、source/proxy_preset 是否存在、key 尾号和返回形态；禁止输出完整 key。                                  |
| 运行中反馈      | 阿斯特里亚 `doMap(force)` 第668行进入生成后立即 `mapBusy=true`、显示 `#mapLoading`、禁用 `#btnR/#btnD`。说明文档第366-395行也把 `mapBusy` 定义为并发锁。                                         | 当前 `doMap()` 第808-812行只禁用按钮，没有立即更新 `[data-map-status]`，也没有在无旧图时写入生成中占位。                                                                                                                                    | 用户点击重绘后“无反应”的直接原因是可见反馈缺失。后续必须在 AI 调用前立即写“正在重绘地图...”，并在无旧图时显示生成中占位。                                                                                                                 |
| SVG 提取与写入  | 阿斯特里亚说明第547-573行：`String(result).match(/<svg[\s\S]*<\/svg>/i)` 提取 SVG，成功后写入 `mapCache[D.loc]` 和 `#mapBox`，再 `bindMC()`。                                                    | 当前第821-828行会 `extractSvgMarkup(result.text)` 后再 `sanitizeSVG(rawSvg)`；这是更安全的方向，但缺少“返回文本是否包含 SVG、sanitizer 为什么拒绝”的日志。                                                                                  | 当前链路不应恢复阿斯特里亚的裸 `innerHTML` 注入，也不得恢复默认地图 fallback；正确修法是在保留 sanitizer 的同时补足提取/拒绝原因日志。                                                                                                    |
| 失败处理        | 阿斯特里亚说明第559-563行有 `fbMap()`/`defMap()` 两级 fallback；第805-807行把 fallback 写入一句话复现标准。                                                                                      | 当前第851-865行失败时保留旧图，无旧图时显示失败空状态，并明确“未写入默认地图”。这是本项目已定边界。                                                                                                                                         | 阿斯特里亚 fallback 只能作为“成功项目如何保证有图”的差异说明，不能照搬。本轮修法必须保持“不恢复默认地图 fallback”，否则会掩盖 API 链路错误。                                                                                              |
| 数据与点击协议  | 阿斯特里亚说明第236-279行使用 `sheet_MapElements` 中文表头，点击协议为 `.cm[data-idx]` 对应 `D.mapEls` 下标；第621-658行说明 `bindMC()` 绑定规则。                                               | 当前地图数据来自 `GameState.location` 与 `GameState.mapElements`，并经过 `sanitizeSVG()` 和 `normalizeMapClickTargets(root)`，字段命名与阿斯特里亚中文表头并不完全一致。                                                                    | 后续 prompt/debug 需要记录地图元素数量、签名和索引协议，避免 AI 输出的 `data-idx` 与当前数据顺序错位。                                                                                                                                    |

因此，`TavernHelper.generate returned no usable map text` 不是“地图按钮坏了”这么幼稚的结论。它至少说明：生成器函数可达，但 `TavernHelper.generate` 的参数结构、custom_api 字段、返回类型、返回文本中的 SVG 提取或 sanitizer 任一环节可能不符合当前检查。文档确认后的代码实施必须按这些节点逐项打日志、逐项验收；否则只是把错误从屏幕上挪到控制台里，毫无价值。

##### 地图 AI 运行时诊断方案（待助手确认后实施）

本节只记录排查结论与拟修改方案，尚未修改业务代码。实施前需要助手确认；确认后修改范围仍限定为 `public/story_ui_lite_test/modules/db-status-bar/index.js`。

| 诊断点                         | 已确认事实                                                                                                                                                                            | 待补日志/处理                                                                                                                                                 | 验收口径                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `TavernHelper.generate` 绑定源 | 当前 `getTavernHelperGenerate()` 会依次检查 `window.TavernHelper`、`parent.TavernHelper`、`globalThis.TavernHelper`、`window`、`parent`，但日志只说明是否选择生成器，不说明来源对象。 | 增加 `generator:resolved` 日志，记录命中来源与是否来自 TavernHelper；如果落到 `window.generate` 或 `parent.generate`，必须能在日志中识别。                    | 点击重绘后能看到生成器来源，避免被其他脚本注入的同名 `generate` 误导。               |
| custom_api 参数                | `CustomApiConfig` 类型声明确认 `apiurl` 字段名正确；当前 `buildMapCustomApi()` 未显式设置 `source` 或 `proxy_preset`。                                                                | 记录 custom_api 脱敏摘要：apiurl 的 origin/path、key 是否存在与尾号、model、source/proxy_preset 是否存在、max_tokens；禁止完整 API Key、query、fragment。     | custom_api 模式下能判断请求参数是否完整，但日志不会泄露敏感配置。                    |
| `generate()` 返回形态          | 当前 `callMapAI()` 只接受非空字符串；用户报错说明返回值未通过该检查，但无法区分 undefined、空字符串、对象或异常包装。                                                                 | 在 `ai:result` 后补充 rawType、object keys、字符串化截断预览（最多 200 字符）；如果返回对象含 `text`、`message`、`content` 等文本字段，后续可按证据兼容提取。 | 失败时日志能直接说明“返回为空/对象无文本/对象有文本但无 SVG/文本被 sanitizer 拒绝”。 |
| 主 API `api.callAI()` 路径     | 跟随数据库主 API 时走 `api.callAI(messages, options)`；当前需确认其返回是否为字符串或对象。                                                                                           | 记录 `api.callAI` 返回摘要：rawType、keys、截断预览、是否包含 `<svg`；不输出完整响应体。                                                                      | followDatabaseApi 模式与 custom_api 模式能分别定位，不再混成同一个“无可用文本”。     |
| SVG 提取与安全清理             | 当前设计必须保留 `extractSvgMarkup()` 与 `sanitizeSVG()`，不得恢复裸 `innerHTML` 或默认静态地图 fallback。                                                                            | 记录 extract 是否命中、提取 SVG 长度、sanitize 通过/拒绝原因；失败时继续保留旧图或显示基础地图/明确空状态，不写默认地图。                                     | 成功 SVG 才写 DOM 与 AI 缓存；失败不会伪造地图、不会污染 `mapCache`。                |
| 无关浏览器 404                 | 已搜索 `public/story_ui_lite_test/**`，没有 `cocktail-plus`、`startup-optimizer`、`invalidate`、`/api/plugins` 调用证据。                                                             | 浏览器复现时把 `POST /api/plugins/cocktail-plus/invalidate 404` 标记为并行噪声；除非找到本模块调用栈，否则不纳入地图链路根因。                                | 控制台同时出现 404 不会干扰地图 AI 链路判断。                                        |

浏览器诊断步骤：打开 F12 控制台，过滤 `[db-status-bar][map-debug]`，点击“重绘地图”，按顺序检查 `config:read:ok`、`ai:start`、`ai:generator:selected`、`generator:resolved`、`ai:result`、`ai:extract`、`ai:sanitize`、`ai:failed` 或成功缓存写入日志。现有日志不足以区分返回对象时，先实施本节日志增强，再根据真实返回形态决定是否补对象文本提取兼容。

##### 状态栏重绘地图参考工作流核对点

后续代码实施必须按 `数据库前端/咒回前端/regex-状态栏.json` 的地图面板工作流拆解，而不是只把按钮接到 AI 调用上：

1. 点击重绘后立即进入 running 状态，禁用刷新/重绘按钮，避免重复触发。
2. 立即更新地图状态文本为“正在重绘地图...”，让用户看见操作已经开始。
3. 若当前没有旧地图，先在地图 viewport 显示生成中占位，不能让地图区域消失。
4. 基于当前位置、地图元素和当前签名构造地图 prompt，并记录 prompt 长度与地点摘要。
5. 调用 `TavernHelper.generate()` 或 `AutoCardUpdaterAPI.callAI()`，日志记录生成器类型和 custom_api 脱敏摘要。
6. 对返回值先做可用性检查，记录返回类型、字符串长度和空返回原因。
7. 从返回文本提取 `<svg>...</svg>`，记录是否命中 SVG。
8. 对 SVG 执行 `sanitizeSVG()`，记录通过或拒绝原因。
9. 只有成功通过安全检查后，才原子替换地图 DOM 和缓存。
10. 失败时保留旧图；没有旧图时显示明确失败空状态和状态文本。
11. 全链路输出 `[db-status-bar][map-debug]` 脱敏日志，禁止泄露完整 API Key。

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
    → 防抖300ms
    → AutoCardUpdaterAPI.exportTableAsJson()
    → parseTables(tables) → rerender(root)
    → maybeAutoMap(root, { allowGenerate: true })
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

### Phase 3：功能TAB面板

| 步骤 | 任务                        | 产出                                                                            |
| ---- | --------------------------- | ------------------------------------------------------------------------------- |
| 3.1  | 实现功能面板TAB标签栏       | 6个TAB + SVG图标                                                                |
| 3.2  | 实现术式TAB                 | 生得术式 + 扩展术式 mini-grid                                                   |
| 3.3  | 实现式神TAB                 | 式神卡片grid + 展开详情                                                         |
| 3.4  | 实现束缚TAB                 | 束缚卡片grid + 筛选                                                             |
| 3.5  | 实现背包TAB                 | 网格 + 分类筛选 + 物品详情                                                      |
| 3.6  | 实现任务TAB                 | 列表 + 展开详情                                                                 |
| 3.7  | 实现地图TAB基础渲染         | SVG 容器、图例、详情面板、空状态与状态文本                                      |
| 3.8  | 实现状态栏地图刷新/重绘入口 | `data-map-action="refresh"` / `data-map-action="redraw"` + `doMap(root, force)` |

### Phase 4：数据绑定与更新

| 步骤 | 任务             | 产出                                                                                                                                              |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | 初始数据加载     | mount时调用API获取数据                                                                                                                            |
| 4.2  | 注册更新回调     | `api.registerTableUpdateCallback()`                                                                                                               |
| 4.3  | 防抖与防重入     | 300ms防抖 + `mapBusy` 防重入 + pending 自动地图请求只保留最后一次                                                                                 |
| 4.4  | 增量更新渲染     | 数据变化后重新解析、rerender，并通过 `maybeAutoMap(root, { allowGenerate: true })` 执行签名/缓存判断                                              |
| 4.5  | 自动地图成本控制 | 地点/地图元素签名变化或有效缓存缺失时才允许 AI；普通刷新不无条件生成，重绘按钮强制生成；`enableMapGeneration=false` 时只复用缓存或显示通知/空状态 |

### Phase 5：集成与验证

| 步骤 | 任务                            | 产出                                                                                  |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------- |
| 5.1  | 更新 `loader.js` 添加模块加载   | 加载 db-status-bar 的 css + js                                                        |
| 5.2  | 更新主入口 `index.js`           | 添加模块标签和锚点                                                                    |
| 5.3  | 编写测试数据 mock               | 模拟 exportTableAsJson 返回                                                           |
| 5.4  | preview.html 本地验证           | 确认渲染效果                                                                          |
| 5.5  | 更新 PROJECT.md                 | 记录变更                                                                              |
| 5.6  | 管理界面地图配置分页复核/补实现 | 已补 `data-jjks-map-config-form`、四字段输入、保存/重置和每次打开回填链路；待本轮验证 |
| 5.7  | 地图 AI/SVG 安全验收            | 验证 AI 失败通知、旧地图保留、空状态、SVG 注入风险、按钮防重入和 API 预设桥接         |
| 5.8  | 每次修改后同步项目文档          | 更新 `PROJECT.md` 当前进度快照和本计划验收项                                          |

---

## 六、SVG图标规范

所有TAB图标使用内联SVG，统一规格：

```html
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- 路径 -->
</svg>
```

| TAB  | SVG描述         |
| ---- | --------------- |
| 术式 | 卷轴/书页形状   |
| 式神 | 灵体/幽灵轮廓   |
| 束缚 | 锁链/环扣       |
| 背包 | 方形背包/箱子   |
| 任务 | 旗帜/清单       |
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

| 风险                            | 影响                                                                                                                                   | 缓解                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API不可用                       | 无数据                                                                                                                                 | 测试数据fallback + 加载提示                                                                                                                                                                                    |
| 表名/列名变更                   | 解析失败                                                                                                                               | 容错处理，列名不存在返回默认值                                                                                                                                                                                 |
| 重要角色过多                    | TAB溢出                                                                                                                                | 横向滚动 + 最大显示数限制                                                                                                                                                                                      |
| 地图实现与文档不一致            | 误判进度、重复施工或遗漏验收                                                                                                           | 以 `modules/db-status-bar/index.js` 与 `modules/manager-ui/index.js` 的代码证据修正文档                                                                                                                        |
| AI SVG 未清理                   | XSS、外链资源加载、地图 DOM 被污染                                                                                                     | 代码已接入 SVG 白名单清理与原子替换，本轮需验证                                                                                                                                                                |
| AI 失败路径破坏旧图             | 用户点击重绘后地图消失                                                                                                                 | 代码已改为失败保留旧图；无旧图时显示空状态并通知，本轮需验证缓存与通知路径                                                                                                                                     |
| 管理界面配置分页回归            | 用户无法配置地图 AI/API 参数                                                                                                           | 已补 UI、读写事件链与每次打开回填；本轮需用代码搜索、语法检查和审计防止回归                                                                                                                                    |
| 自动地图 AI 干扰数据库推进/召回 | 发送消息后状态栏刷新可能重复触发 AI 生成，干扰数据库插件生成生命周期                                                                   | 表更新回调保留 300ms 防抖；自动路径只在地点/地图元素签名变化或有效缓存缺失时允许 AI，`mapBusy` 防重入，`enableMapGeneration=false` 时仅复用缓存或通知空状态；刷新按钮不无条件生成                              |
| 地图自定义 API 配置不生效       | 用户填写的 API URL/API Key/模型未用于手动地图生成                                                                                      | 当前实现通过 `TavernHelper.generate({ custom_api })` 传入自定义 API，不切换酒馆全局预设                                                                                                                        |
| 地图/API debug 信息不足         | 失败时仍可能只能看到“returned no usable map text”，无法判断生成器绑定源、返回对象 keys、截断预览、主 API 返回摘要或 sanitizer 拒绝细节 | 已补上一轮通用 `[db-status-bar][map-debug]` 日志；本轮需在助手确认后继续增强运行时诊断，覆盖生成器来源、custom_api source/proxy_preset、对象返回 keys、最多 200 字符预览、主 API 返回摘要和 sanitizer 拒绝原因 |
| 地图重绘缺少运行中状态          | 用户点击后没有地图区域，也看不到正在重绘，误判为按钮无效                                                                               | 已在 `doMap(root, true)` 生成分支立即写入“正在重绘地图…”状态；无旧图时显示“正在生成地图…”占位，成功后替换 SVG，失败保留旧图或显示明确空状态                                                                    |
| 工具条高度异常                  | `.db-sb-fn-toolbar` 和左右按钮组允许 wrap，窄宽度会多行撑高；地图 viewport 缺少最小高度时空状态会退化到极小高度                        | 已改为单行稳定布局，按钮 `white-space: nowrap`，右侧按钮组不足时横向滚动或收缩 gap；`.db-sb-map-viewport` 与 `.db-sb-map-empty` 已设 `min-height: 200px`                                                       |
| 无缓存地图区域空白              | 普通刷新不允许生成 AI，且之前无缓存/AI失败无旧图路径只显示纯空状态                                                                     | 已增加 `renderBaseMap(S)`，基于 `GameState.mapElements` 生成基础 SVG；基础 SVG 经 `sanitizeSVG()` 后进入 DOM，不写入 `mapCache`，不恢复静态默认地图                                                            |
| 地图缓存签名污染                | AI 失败保留旧图时若用当前 signature 写入 previousSvg，会把旧图伪装成新地图缓存                                                         | 已删除失败保留旧图路径的 `setMapCacheEntry()`，只有 AI 成功生成和缓存规范化路径写缓存                                                                                                                          |
| 头像弹窗颜色偏离预览            | body 级弹窗继续消费状态栏 CSS 变量，颜色不再对齐 `preview-db-status.html` 浅色预览                                                     | 收敛头像弹窗局部 CSS 颜色，不改预览页本体，不新增全局 body 变量                                                                                                                                                |
| 束缚表缔结方格式不确定          | 筛选逻辑错误                                                                                                                           | 用 includes() 模糊匹配                                                                                                                                                                                         |
| 状态栏默认挂载缺失或错位        | 用户输入后状态栏位置错乱，或最新 AI/角色消息没有显式 `<DbStatusBar/>` 时数据库状态栏完全不显示                                         | `index.js` 定位最后 AI/角色消息，并将 `db-status-bar` 加入默认 after-native 挂载列表；用户消息触发扫描时会刷新最后 AI 消息并移除其他默认状态栏实例                                                             |
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
- [ ] 用户消息渲染后，数据库状态栏默认实例仍挂在最后 AI/角色消息内，不出现在用户输入消息后；最新 AI/角色消息无显式 `<DbStatusBar/>` 时也能默认显示
- [ ] 主角与重要角色头部信息栏强调样式一致

- [ ] 头像弹窗颜色与 `preview-db-status.html` 浅色参考一致，且没有新增污染全局或预览页本体的 CSS 变量
- [ ] 重要角色TAB显示信息+好感度/信任度
- [ ] 功能面板6个TAB全部可切换
- [ ] 术式TAB显示生得术式+扩展术式
- [ ] 式神TAB显示式神列表
- [ ] 束缚TAB显示所有束缚
- [ ] 背包TAB显示物品+分类筛选
- [ ] 任务TAB显示任务列表+详情
- [ ] 地图TAB显示当前地点、SVG 视口、图例和详情面板
- [ ] 刷新地图按钮触发 `doMap(root, false)`，缓存存在时直接复用且不重复生成
- [ ] 重绘地图按钮触发 `doMap(root, true)`，成功后才替换缓存与 DOM
- [x] 地图 AI 调用失败时保留旧图；无旧图时显示基础地图或明确空状态并通过通知/状态文本提示失败，不生成默认地图
- [x] 点击重绘地图后立即显示“正在重绘地图”状态和生成中占位，按钮禁用期间用户能看到反馈
- [x] 地图/API 测试版运行时诊断 log 覆盖配置读取/保存、生成器绑定源、custom_api 摘要、主 API 返回摘要、SVG 提取和 sanitizer 拒绝原因；日志输出完整脱敏 URL 与可观测模型，custom_api 显示实际传入模型，主 API 模型不可见时标记 unavailable；API Key 不完整输出，异常 message 先脱敏后记录，后续 `sanitizedLog` 仅保留模型
- [x] `.db-sb-fn-toolbar` 保持单行稳定高度，窄宽度不再因按钮换行撑到 131.56 一类异常高度
- [x] 无 AI 缓存、AI 关闭或 AI 失败无旧图时，地图页基于 `GameState.mapElements` 显示经清理的基础 SVG；`mapElements` 为空时显示“暂无地图元素”空状态
- [x] 基础 SVG 不写入 `mapCache`，AI 失败保留旧图时不使用当前 signature 写旧图缓存
- [x] 地图 viewport 与空状态保持可见最小高度，避免空内容把地图区域压缩到极小高度
- [ ] `.cm[data-idx]` 地图点击目标能显示对应元素详情
- [ ] 数据库表更新后，地点或地图元素签名变化会自动触发受控 AI 地图重绘；签名未变且缓存命中时不重复生成
- [x] 管理界面地图配置分页存在代码证据，包含 API URL、API Key、模型、启用开关、保存/读取/重置/每次打开回填链路；保存时保留当前模型并清除其他模型列表缓存；测试版日志输出完整脱敏 URL 与当前模型且不输出完整 API Key
- [ ] 数据更新后UI自动刷新
- [ ] 日/夜主题切换正常

### 质量

- [ ] 无emoji使用
- [ ] 与BP面板/世界报告视觉风格统一
- [ ] 移动端响应式正常
- [ ] API不可用时优雅降级
- [ ] 无JS报错，包括点击“重载美化”后不再出现 `dynamic-styles.js` 读取跨域 `cssRules` 的 SecurityError
- [ ] 样式不污染其他模块

---

## 十二、后续迭代

1. **地图运行时验证**：在酒馆环境确认数据库填表结束后位置/地图元素变化会自动重绘、未变化不重复生成，并确认地图临时 API 预设保存、切换、调用与恢复是否正常；同时复核 custom_api/模型拉取/异常日志中 URL 可完整定位、custom_api 模型可见、主 API 模型不可见时明确 unavailable，且无完整 API Key 泄露。
2. **地图 AI/SVG 安全复验**：持续验证 SVG 白名单清理、原子替换、失败保留旧图、按钮防重入和历史脏缓存清理。
3. **战斗模式**：检测全局数据表模式字段，切换战斗UI布局。
4. **动画增强**：资源条变化动画、TAB切换过渡。
5. **数据缓存**：localStorage缓存上次数据，加速首屏。
