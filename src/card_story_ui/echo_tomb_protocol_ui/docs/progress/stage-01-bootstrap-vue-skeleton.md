# Stage 01 · Vue 3 + Pinia 状态栏 UI 骨架

> 对应主项目文档 TODO：t1 / t2 / t3 / t4 / t5 完成，t6 骨架完成。
>
> 主项目文档：`../echo-tomb-card-story-ui-plan.md`

## 1. 阶段目标

- 推翻什么都含糊的「双版计划」项目文档，重写为单一权威版本
- 在仓库中正式启动 Vue 3 + Pinia 技术栈，完成状态栏 UI 的能跑骨架
- 将项目文档及进度记录重新纳入 git 跟踪，出发指向后续持续迭代

## 2. 范围与变更清单

### 新增

- `main.ts` · Vue 应用启动入口，createApp + Pinia + 清理钩子
- `App.vue` · 根组件，负责主题、Tab、面板路由
- `components/`
  - `ShellHeader.vue` / `TabBar.vue` / `ShellFooter.vue` / `ThemeToggle.vue`
  - `SubjectPanel.vue` / `InventoryPanel.vue` / `RadarChart.vue`
  - `MapPanel.vue` / `UpgradePanel.vue` / `TeamPanel.vue`（t7~t9 占位）
  - `icons/IconSprite.vue` · 22 个 SVG symbol，绝不使用 emoji
- `stores/`
  - `useSettingsStore.ts` · 设置持久化
  - `useTablesStore.ts` · 表格读取/缓存/填表结束订阅
  - `useUiStore.ts` · activePanel + activeCharId + 面板可见性
- `styles/theme.scss` · 暗系未来感 CSS 变量与原子
- `core/tables.ts::filterRowsByCharId(table, charId)` · 多行定位缺口补齐
- `docs/README.md` · 进度文档索引与约定
- `docs/progress/stage-01-bootstrap-vue-skeleton.md` · 本文件

### 修改

- `index.ts` · 改为包装 main.ts 启动逻辑，卸载时调 destroyAll
- `ui/mount.ts` · 重写为 Vue mount + teleportStyle + 按需 attach
- `echo-tomb-card-story-ui-plan.md` · 从双版混杂重写为单一权威版，附修订记录 R1→R4
- `.gitignore` · 撤回项目文档忽略规则；加入 `dist/card_story_ui/echo_tomb_protocol_ui/` 仅限本项目产物

### 删除

- `ui/shell.ts`、`ui/mapPanel.ts`、`styles/scopedCss.ts` · 原生 TS 旧实现，被 Vue 组件化代替

## 3. 关键决策

| 决策 | 内容 | 原因 |
|------|------|------|
| 技术栈 | Vue 3 SFC + Pinia + scoped CSS | 仓库工具链全部为 Vue 配套；状态驱动 UI 下 Vue 维护成本更低 |
| 内存控制 | 面板 `defineAsyncComponent`、表格 `shallowRef`、主题仅改 CSS 变量 | 避免为响应式开销付出过多 |
| 主体识别 | 严格以 `角色ID` 为主键，不用姓名/游戏ID | 匹配表格模板约定 |
| 战斗状态 | 枚举 `非战斗 / 遭遇 / 战斗中 / 收尾` | 与模板 DDL 对齐，同时在 store 里 collapse 到允许枚举 |
| 是否离场 | `是 / 否`，Tab 默认隐藏「是」 | 与模板 DDL 对齐 |
| Tab 顺序 | player_main 永远首位 | 符合玩家主视角习惯 |
| Pinia | 走 jsdelivr ESM externals | 与仓库其他项目一致，不随意改 webpack |
| 图标 | 22 个 SVG symbol，绝不用 emoji | 项目硬约束 |

## 4. 验证证据

- `pnpm build --env entry=src/card_story_ui/echo_tomb_protocol_ui/index.ts`
- 产物：`dist/card_story_ui/echo_tomb_protocol_ui/index.js`，大小 **85.3 KiB**（minimized）
- 构建输出记录：无 warning 无 error，编译耗时 ~1.4s（二次构建）
- 运行时依赖：`Vue` 走全局变量，`pinia` 走 `https://testingcf.jsdelivr.net/npm/pinia/+esm`

### 手动检查点

- [x] index.ts 不再直接处理 DOM，全部委托 main.ts
- [x] mount.ts 重写后由 Vue mount，teleportStyle 仍被正确调用
- [x] subjectTabs computed 依赖 `是否离场` 字段，player_main 置顶
- [x] combatState computed 对未知值回退到 `非战斗`
- [x] watchEffect + tableFillEndCounter 需要 `subscribeFillEnd` 才能工作，已在 onMounted 中调用

## 5. 遗留问题与风险

| 项 | 描述 | 计划处理阶段 |
|----|------|------------|
| 地图面板仅为占位 | t7 需重接 mapPrompt + aiQueue + svgSanitize 流程 | t7 |
| 升级面板仅为占位 | 经验检测/Roll/手动分配/写回未实现 | t8 |
| 组队向导仅为占位 | AI 草案与 batchWriteback 流程未实现 | t9 |
| 背包面板仅能读不能写 | 需要后续补齐转移/丢弃交互 | 后续迭代 |
| 背景填表中动表重刷 | watchEffect 依赖计数器，已能跳起；但需要真实酒馆环境验证事件名 | t11 |
| Vue mount 后交互未实酒馆验证 | 仅本地静态构建调试 | t11 |
| dist 路径可能需同步到 public | 完成后发布阶段才从 dist 复制过去 | t10 |

## 6. 下一阶段入口

- **t6 主体 UI 充实**：背包可交互、技能详情 popover、装备 hover 详情、loading skeleton
- **主题设计丰富化**：补充动效、背景纹理、微交互详细入主文档
- **t7 地图面板实现**或后续阶段并行

## 7. 关联 commit

_这些 commit 在本阶段交付后补上，按下面顺序提交：_

1. `chore(echo-tomb): 整理 .gitignore，项目文档进 git、dist 中本项目产物不跟踪`
2. `docs(echo-tomb): 重写项目文档为单一权威版本`
3. `feat(echo-tomb): t6 状态栏 UI 骨架迁移到 Vue 3 + Pinia`
4. `docs(echo-tomb): 补充 stage-01 阶段进度文档与索引`
