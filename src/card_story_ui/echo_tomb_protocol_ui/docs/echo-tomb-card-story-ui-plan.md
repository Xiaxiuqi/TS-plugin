# 回响坟冢协议 · 状态栏 UI 项目文档

> 单一权威版本。本文档随项目进入 git 一同维护，过去演进过程见末尾「修订记录」。

---

## 1. 项目概览

- **目标角色卡**：`回响坟冢-私用版`
- **交付形态**：webpack 构建出单文件 JS，通过 SillyTavern 酒馆助手 import 导入运行
- **运行环境**：酒馆助手脚本（无沙盒 iframe / 父窗口可用），可访问 `window.AutoCardUpdaterAPI`、`window.TavernHelper`、`SillyTavern`
- **挂载位置**：每条 AI 消息楼层底部插入状态栏
- **核心价值**：把回响坟冢的多张数据库表（全局、主体、属性、装备、技能、传承、背包、阵营、压力、任务等）转成可读、可交互、可写回的状态面板，并提供地图、升级、组队三类高级流程

---

## 2. 技术选型

**采用 Vue 3 SFC + Pinia + scoped CSS**。

- 仓库已 all-in Vue 工具链：`vue@3.5`、`pinia`、`@vueuse/*`、`vue-final-modal`、`vue-loader`、`unplugin-vue-components`、`unplugin-auto-import` 全部就位；`webpack.config.ts` 已自动接入 VueLoaderPlugin 与自动入口 glob `src/**/index.{ts,tsx,js,jsx}`
- 内存控制依赖以下硬约束（见 §6 验收标准）：
  - 面板用 `defineAsyncComponent` 懒加载
  - 列表大数据使用 `shallowRef` + 手动 trigger，不开启全响应式
  - 主题切换只改 `:root` CSS 变量，不重建组件
  - chat 切换走 `app.unmount()` + Pinia store `$dispose`，并执行 `destroyAll()` 清理 core 层资源
- 不使用 tailwind（仓库已禁用），样式全部用 scoped CSS / 全局命名空间 `.echo-tomb-status-bar`
- 不使用 emoji，所有图标走 SVG symbol

**已弃用方案**：原生 TS + 轻量组件函数（参见修订记录 R3）

---

## 3. 工作原则

1. **生产标准**：所有代码按可上线、可维护、可复盘的标准交付，不留 TODO 黑洞
2. **先理解再修改**：改任何代码前先阅读现状、调用链、副作用
3. **单一职责边界**：core/ 只做数据与工具，store 只做状态，components 只做渲染与交互
4. **数据库写回安全**：必须走 `safeWriteback` / `batchWriteback`，禁止裸调 `importTable`
5. **AI 调用必须排队**：地图、组队等 AI 调用统一走 `enqueueAI`，并发 1~3 由设置控制
6. **按中文表头取列**：所有表格读取按 `headers` 命名定位，禁止按列序硬编码
7. **角色区分用 `角色ID`**：禁止使用姓名/游戏ID 作为关联键
8. **不显示**：性爱信息表、NSFW 表、选项表、纪要表、备忘录表

---

## 3.5 美术风格与界面规范

### 3.5.1 设计语汇

定调：**暗系科幻 / 全息 / 极简秩序感**，参考方向为崩坏：星穹铁道、原神、鸣潮的 HUD 与状态面板，但**不抄袭具体素材**。整体追求：

- **冷色调主导**：以深蓝/深紫/钢灰为基底，亮色仅用作强调色（accent）和发光（glow）
- **信息密度均衡**：状态栏在 AI 楼层底部，宽度受限，单屏呈现核心信息，详细信息走 hover/弹层
- **轻量未来感**：通过细线、渐变、微辉光、扫描线、浮空标签传递科幻感，不堆砌粒子或大面积装饰
- **可读性优先**：字号、对比度、行高都按可读性调，再叠装饰；任何装饰让步于辨识度

### 3.5.2 配色系统（CSS 变量）

所有颜色定义在 `styles/theme.scss` 中通过 CSS 变量提供，主题切换只换变量值不重建组件。

| 变量 | 用途 | 日间 | 夜间 |
|------|------|------|------|
| `--et-bg` | 外壳渐变底 | 蓝白 #EEF4FF→#DCE6F8 | 深空 #0C1020→#141830 |
| `--et-bg-card` | 卡片半透层 | rgba(255,255,255,.78) | rgba(28,34,58,.72) |
| `--et-bg-elevated` | 突出卡片 | rgba(255,255,255,.95) | rgba(34,40,68,.92) |
| `--et-text` | 主文本 | #1A2238 | #E6EAF6 |
| `--et-text-muted` | 次文本 | #5A6378 | #98A0B8 |
| `--et-text-faint` | 辅文本/标签 | #8B94A8 | #6C748A |
| `--et-border` | 普通分割 | rgba(80,110,180,.18) | rgba(120,140,200,.20) |
| `--et-border-strong` | 强调描边 | rgba(80,110,180,.35) | rgba(140,160,220,.35) |
| `--et-accent` | 主强调色 | #3A6FB5 | #6B8CCE |
| `--et-accent-bright` | 高光 | #5B8FD5 | #9AB4E8 |
| `--et-accent-glow` | 辉光 | rgba(91,143,213,.35) | rgba(107,140,206,.40) |
| `--et-success` / `--et-warning` / `--et-danger` | 状态色 | #2C8A5D / #C47A1F / #C0392B | #4FC188 / #E0A050 / #E57373 |

### 3.5.3 排版与节奏

- 字体栈：`'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif`
- 基准字号 13px，行高 1.55；标题字号最大 15px，避免在状态栏吃太多视觉空间
- 字间距：标题大写时 letter-spacing 0.04em，制造未来感金属字
- 数字使用 `font-variant-numeric: tabular-nums`，避免数字栏抖动

### 3.5.4 形状与质感

- 圆角统一三档：4px（小元件）/ 8px（卡片）/ 12px（外壳）
- 卡片底纹：半透明 + 1px 描边 + 极轻投影；不使用厚阴影
- 外壳顶部一道 1px 渐变高光线，做成"浮空舱体"开口感
- 卡片标题前置 3×12px 强调色光条 + glow，作为视觉锚点
- 进度条：渐变填充（accent → accent-bright）+ glow，HP/MP/EXP 用语义色不用同一蓝色

### 3.5.5 动效原则

- 所有过渡统一 `180ms cubic-bezier(0.4, 0, 0.2, 1)`
- 仅使用 transform 与 opacity 做动画，禁止动 width/height/top/left
- loading 用单点闪烁，不用旋转 spinner
- 战斗状态高亮使用 box-shadow glow，不用整体闪烁
- 不使用大规模 canvas 粒子，不引入 lottie，不使用 GSAP（虽然仓库装了，但本项目不需要）

### 3.5.6 图标系统

- 全部使用 SVG symbol，集中在 `components/icons/IconSprite.vue`
- viewBox 统一 `0 0 16 16`，stroke=currentColor，stroke-width=1.6，linecap/linejoin=round
- 禁用 emoji，禁用 png/jpg 图标
- 单图标尺寸：12px（chip 内联）/ 14px（按钮）/ 16px（卡片标题），从 CSS 控制不在 SVG 内固定 width

### 3.5.7 交互细节

- hover 反馈：背景透明度 +12%、边框 accent、subtle box-shadow
- active：transform translateY(1px)
- focus：accent 描边 + glow，不使用浏览器默认 outline
- Tab 选中态：渐变填充 + glow，未选中态为低对比卡片
- player_main Tab 加 4px 圆点前缀 + glow，作为主角识别符
- 按钮 hover 不使用尺寸缩放，避免布局抖动
- 滚动条：宽度 4px，颜色 `--et-border-strong`

### 3.5.8 边界与约束

- 单组件 CSS 不得超过 80 行，超过则拆 scoped 子组件
- 颜色必须取自上表 CSS 变量，禁止散写 hex
- 任何"看着很酷"的想法落地前，先问：可读性是否受损？低端机能否流畅运行？chat 切换时是否需要清理？三问全过才允许进入实现

---

## 4. 当前进度（截至本次提交）

| 阶段 | 状态 | 说明 |
|------|------|------|
| t1 工程基础（core 抽象、aiQueue、writeback、settings） | ✅ 完成 | 见 §7 接口说明 |
| t2 项目文档整理 | ✅ 完成 | 即本文档 |
| t3 表格模板结构性修改 | ✅ 完成 | 见 §5 修改记录 |
| t4 表格模板权威副本（src/.../tables/） | ✅ 完成 | commit `e0922e5` |
| t5 .gitignore 撤回项目文档忽略 | ✅ 完成 | 文档进入 git |
| t6 状态栏主体 UI（Vue 重构） | 🟡 进行中 | shell/subjectPanel/inventoryPanel/radarChart |
| t7 地图面板 | ⏳ 待开始 | core 层已就绪，UI 层走 Vue 重写 |
| t8 升级面板 | ⏳ 待开始 | 经验检测、Roll、手动分配、写回 |
| t9 组队向导 | ⏳ 待开始 | 输入 → 匹配/AI 草案 → 校验 → 写六张主体表 |
| t10 构建产物路径 / import 集成验证 | ⏳ 待开始 | webpack 输出 → public 同步 |
| t11 验证回归 | ⏳ 待开始 | 构建、模拟 API、低内存验证 |
| t12 阶段性 git 提交 | 🔁 持续 | 每阶段单独 commit |

---

## 5. 表格模板修改记录（t3 已完成）

模板权威副本：`src/card_story_ui/echo_tomb_protocol_ui/tables/table-template.json`
回写副本：`nailongwang/奶龙王一键制卡/projects/回响坟冢-私用版/tables/table-template.json`（手动同步）

| 表名 | 操作 |
|------|------|
| 全局数据表 | 新增第 9 列 `战斗状态`（DDL `combat_state TEXT NOT NULL DEFAULT '非战斗' CHECK(combat_state IN ('非战斗','遭遇','战斗中','收尾'))`），note/initNode/updateNode/header 同步；删除违反 GLOB+NOT NULL 的初始数据行 |
| 重要角色表 | 新增 `是否离场` 列（DDL `absence TEXT NOT NULL DEFAULT '否' CHECK(absence IN ('是','否'))`），note 列号重编 18/19；删除 2 行 Unknown 占位 |
| 主体档案表 | 新增 `是否离场` 列，DDL 同上；note 列号重编 22/23 |
| 主角属性表 | 修正 note 中 `智慧` → `智力`；保留 6 行六维占位 |
| 主角档案表 | 删除 `{{user}}` 初始行 |
| 区域熵值表 | 删除「哭泣矿井」占位 |
| 背包物品表 | 删除 `item_000` 碎片占位 |
| 任务与事件表 | 删除 2 行（含 `ql_001_main`） |
| 阵营声望表 | 删除 5 行阵营占位 |
| NPC 压力节点表 | 删除 4 行占位 |
| 主体技能表 | 删除 `ss_001_sample` 占位；保留 3 行剧情设定（传承感知/情报瘟疫/彼岸之眼） |
| 主体传承路径表 | `路径状态` 由 `否` → `未觉醒`；`关键节点` 由 `否` → `初始传承觉醒路径未启动` |

保留的结构性数据：
- 主角属性表 6 行六维（DDL CHECK 约束要求）
- 主体装备表 12 行 `player_main` 装备槽位（头/肩/胸/手/腿/脚/颈/手指I/手指II/饰品/主手/副手）
- 状态栏主体表 1 行 `player_main`
- 主体传承路径表 1 行 `whispering_echoes`

验证：JSON 合法、35 项断言全过、所有表列数对齐。

**字段命名权威**：
- 战斗状态：枚举 `非战斗 | 遭遇 | 战斗中 | 收尾`，DDL 列名 `combat_state`，前端读取按中文表头 `战斗状态`
- 是否离场：枚举 `是 | 否`，DDL 列名 `absence`，前端读取按中文表头 `是否离场`

---

## 6. 待办事项与验收标准

### t6 状态栏主体 UI（高优先级）

创建组件：
```
src/card_story_ui/echo_tomb_protocol_ui/
├── App.vue                    # 根组件（外壳 + 主题）
├── components/
│   ├── ShellHeader.vue        # 顶部全局状态条（地点/时间/阶段/等级/战斗状态）
│   ├── TabBar.vue             # 主体 Tab 导航
│   ├── SubjectPanel.vue       # 主体详情：档案、HP/MP、经验、装备槽、技能、传承
│   ├── RadarChart.vue         # 六维属性 SVG 雷达图
│   ├── InventoryPanel.vue     # 背包面板（按当前主体角色ID过滤）
│   ├── EnemyPanel.vue         # 战斗中显示敌方阵营/状态（条件渲染）
│   ├── ThemeToggle.vue        # 日夜切换
│   └── icons/
│       └── IconSprite.vue     # SVG symbol 集合
├── stores/
│   ├── settings.ts            # 设置 store（aiConcurrency、theme...）
│   ├── tables.ts              # 表格数据 store（懒加载 + 增量刷新）
│   └── ui.ts                  # UI 状态（activeTab、面板可见性等）
└── styles/
    └── theme.scss             # CSS 变量与主题切换
```

**验收**：
- Tab 仅显示 `是否离场 === '否'` 的主体；player_main 永远首位
- 战斗状态按四值枚举显示；`战斗中` 时 EnemyPanel 渲染
- 雷达图 6 项（力量/敏捷/体质/智力/感知/魅力），SVG，无 canvas
- 切换 Tab 不重建顶部状态条；面板按需 mount
- 切换主题只改 CSS 变量，不重建 DOM
- 不使用 emoji，全部 SVG symbol

### t7 地图面板（中优先级）

- 复用 `core/mapPrompt.ts` 内置提示词与 fallback 元素生成
- 数据库填表结束 (`onTableFillEnd`) 触发地图重建，摘要相同则命中缓存
- 缓存上限 3，按 LRU 释放
- AI 返回经 `sanitizeSvg` 净化才渲染
- SVG 容器支持鼠标滚轮缩放、拖拽平移（CSS transform 实现）
- 元素点击展示元素详情（基本字段）

**验收**：模板中无「地图元素表」时走 fallback，不报错；并发控制经过 `aiQueue`；卸载时清空缓存与监听

### t8 升级面板（中优先级）

- 监听主体表 `经验值/经验上限`，达上限提示升级
- Roll：3 次随机分配（六维加点数固定预算），可重投 1 次
- 手动模式：滑块/+- 按钮分配剩余点数，预算约束
- 确认：`safeWriteback('主角属性表', ...)`，期间数据库变化则草案作废重新打开

**验收**：经验上限即时刷新；Roll 算法可复现；写回失败回滚 UI 状态；属性 6 项严格按枚举写

### t9 组队向导（中优先级）

- 输入队友姓名 → 匹配重要角色表 / 主体档案表
- 未匹配时构造 AI 提示词请求草案（六维属性 + 装备 + 技能 + 传承）
- AI 草案进入审查 UI，校验通过后 `batchWriteback` 写入：
  - 主体档案表（新增行）
  - 主体属性表（6 行）
  - 主体装备表（12 行槽位，可全空字符串）
  - 主体技能表（按草案行数）
  - 主体传承路径表（1 行 `未觉醒`）
  - 状态栏主体表（新增主体入口）
- 任意一步失败整体回滚（写回函数自身不支持回滚，需先 dry-run 全部表）

**验收**：未输入完整字段不发起 AI 请求；AI 失败可重试且不污染数据库；写回成功后状态栏自动出现新 Tab

### t10 构建与发布（中优先级）

- webpack 自动以 `index.ts` 为入口，输出到 `dist/card_story_ui/echo_tomb_protocol_ui/`
- 同步到 `public/card_story_ui/echo_tomb_protocol_ui/index.js` 用于酒馆 import
- 不输出 latest.import.json（明确不需要）

### t11 验证（低优先级）

- `pnpm build` 通过
- 模拟 `AutoCardUpdaterAPI` 进行渲染快照
- 内存基线：mount 前 / mount 后 / 切换 chat 后三次 heap snapshot 趋势

### t12 git 提交策略（持续）

- 每个阶段独立 commit，message 形如 `feat(echo-tomb): t6 实现状态栏主体 UI`
- 表格模板修改单独 commit；前端代码与文档同 commit 合理时合并

---

## 7. 接口与模块说明（已存在 core 层）

### `core/database.ts`
- `initDatabase(): DatabaseAPI | null` 探测 `window.AutoCardUpdaterAPI`
- `DatabaseAPI`：`exportTable / importTable / callAI / onTableFillEnd / onTableUpdate / refresh / raw`
- 使用规则：UI 层只通过 `getDatabase()` 拿引用，禁止直接读 `window`

### `core/tables.ts`
- `parseTable(name, raw): ParsedTable | null` 二维数组 → 结构化
- `findRowByCharId / filterPresent / filterInventoryByOwners / serializeTable`
- **缺口**（t6 实现前补齐）：`filterRowsByCharId(table, charId): TableRow[]`，用于属性表 6 行、装备表 12 行、技能表多行的批量定位

### `core/writeback.ts`
- `safeWriteback(tableName, validate, modify)`：导出最新 → 校验 → 修改 → import → refresh
- `batchWriteback(operations[])`：顺序执行，任一失败立即中断（注意：失败前已写入的表不会自动回滚，组队流程需要 dry-run 校验后再批量执行）

### `core/aiQueue.ts`
- `enqueueAI(id, execute, dedupeKey?)` 串行/小并发；`dedupeKey` 命中即取消旧任务
- 默认并发 1，最大 3，受 `settings.aiConcurrency` 控制

### `core/svgSanitize.ts`
- `sanitizeSvg(svg): string | null` 白名单标签/属性，剥离 `on*`、`href/xlink:href`、`javascript:` 等

### `core/mapPrompt.ts`
- `MAP_GENERATION_PROMPT`、`buildMapPrompt(elements)`、`generateTempMapElements(globalData, presentChars)`
- 模板内置，**不再依赖数据库地图元素表**（即使数据库里没有也能跑）

### `core/memory.ts`
- `registerCleanup / trackedInterval / trackedTimeout / destroyAll`
- Vue 应用 unmount 时必须调一次 `destroyAll()`

### `core/tavern.ts`
- `initTavernBridge(): TavernBridge | null` 探测 `SillyTavern`
- 暴露 `getRecentMessages / getLastMessageId / getCurrentChatId`

### `settings.ts`
- 字段：`theme: 'day'|'night'|'auto'`、`aiConcurrency: 1~3`、`mapApiSource: 'database'|'custom'`、`customApiEndpoint`、`customApiModel`
- 持久化：酒馆助手脚本变量 `getVariables/insertOrAssignVariables`

### `index.ts`
- 入口骨架已就位，等待替换为 Vue 应用挂载（`createApp(App).use(pinia).mount(container)`）

---

## 8. 风险与已知问题

1. **`shell.ts:138` 旧战斗状态判断错误**（`g['战斗状态'] === '是'`），与四值枚举不符 → t6 重写时按 `非战斗 | 遭遇 | 战斗中 | 收尾` 处理
2. **旧 ui/ 用了 emoji**（📍⏰▶✧⚔️◐）→ t6 重写改 SVG symbol
3. **mapPanel.ts 仍尝试读「地图元素表」**（模板无此表）→ t7 重写时直接走 `generateTempMapElements`
4. **batchWriteback 不具备真正回滚**（写完一张就 import 一张），组队流程需自行做 dry-run 全表校验后再分阶段写
5. **TS 6 baseUrl 弃用警告**：暂不改 tsconfig，构建若失败再最小处理
6. **Vue 响应式开销**：大表（背包等）必须 `shallowRef`，避免每行对象都建 Proxy
7. **chat 切换泄漏风险**：必须严格执行 `app.unmount()` + `destroyAll()` + `pinia.state.value = {}` 的顺序

---

## 9. Git 与忽略策略

- 项目文档（本文件）**进 git 一同维护**
- `nailongwang/` 目录整体 ignore（仓库范围约定，不动）
- 表格模板权威副本在 `src/...../tables/table-template.json`，修改后**手动复制**回 `nailongwang/...../tables/table-template.json`
- 提交粒度：每阶段一个 commit；表格模板变更与代码变更不混提交
- 构建产物 `dist/card_story_ui/echo_tomb_protocol_ui/` **不进 git**（仅本项目）；其他模块 dist 行为不受影响
- `public/card_story_ui/echo_tomb_protocol_ui/` 仅在最终发布时从 dist 复制过来，平时不持续同步

---

## 9.5 进度文档管理

- 所有阶段性进度文档**统一**保存在 `src/card_story_ui/echo_tomb_protocol_ui/docs/` 下，不得放在仓库其他位置
- 索引与约定见 `docs/README.md`
- 阶段进度文件命名：`docs/progress/stage-NN-<短标识>.md`，NN 双位补零按时间递增
- 每阶段必须在结束时新建一份阶段文档，并在本主文档 §4 当前进度表与 §10 修订记录中同步状态
- 阶段文档只记录"此阶段实际做了什么、为什么、留下什么"；全局架构与 TODO 仍以本主文档为权威源

---

## 10. 修订记录

| 版本 | 时间 | 关键变化 | 触发 |
|------|------|----------|------|
| R1 | 项目立项初期 | 初版规划：Vue 3 + Pinia，使用 PROJECT_PLAN.md 形式，目录结构待定 | 立项 |
| R2 | 中期调整 | 撤换为「原生 TS 模块 + 轻量组件函数」方案，准备最小依赖；同期新增数据库地图元素表想法 | 追求最低体积、最小框架成本 |
| R3 | 选型回归 | 综合评估内存/美观/轻量/需求承载/可维护性后回归 Vue 3 SFC + Pinia；地图元素表改为前端内置不入库；战斗状态由 `是/否` 改为四值枚举 `非战斗/遭遇/战斗中/收尾`；is_absent 字段名统一为 `absence` | 仓库工具链已 all-in Vue；状态驱动 UI 用 Vue 维护成本更低；模板枚举更精细 |
| R4 | 本次（当前文档） | 文档重写为单一权威版；t1~t5 标记完成；core/ 复查通过保留，ui/ 全部 Vue 重写；项目文档撤回 .gitignore 进入 git | 用户决议：技术栈选 Vue 3 + Pinia；项目文档进 git |
| R5 | t6 骨架完成 | 新增 §3.5 美术风格与界面规范、§9.5 进度文档管理；只忽略本项目 dist；建立 `docs/` 目录并归档 stage-01 进度文档；记录 watch 调试约定 | 用户要求：dist 仅本项目不进 git、阶段进度文档管理、UI 风格细化、watch 实时调试 |

---

本文档随项目演进，每次显著调整在「修订记录」追加一行。
