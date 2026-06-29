# Stage 01 · Vue 3 + Pinia 状态栏 UI 骨架

> 对应主项目文档 TODO：t1 / t2 / t3 / t4 / t5 完成，t6 骨架完成。
>
> 主项目文档：`../echo-tomb-card-story-ui-plan.md`

## 1. 阶段目标

- 推翻含糊的「双版计划」项目文档，重写为单一权威版本
- 在仓库中正式启动 Vue 3 + Pinia 技术栈，完成状态栏 UI 的能跑骨架
- 将项目文档及进度记录重新纳入 git 跟踪，指向后续持续迭代

## 2. 范围与变更清单

### 新增

- `main.ts` · Vue 应用启动入口，createApp + Pinia + 清理钩子
- `App.vue` · 根组件，负责主题、Tab、面板路由
- `components/`
  - `ShellHeader.vue` / `TabBar.vue` / `ShellFooter.vue` / `ThemeToggle.vue`
  - `SubjectPanel.vue` / `InventoryPanel.vue` / `RadarChart.vue`
  - `MapPanel.vue` / `UpgradePanel.vue` / `TeamPanel.vue`（t8~t10 占位，旧 t7~t9 因 t7 设置界面引入而顺延）
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
- `echo-tomb-card-story-ui-plan.md` · 从双版混杂重写为单一权威版，附修订记录 R1→R6
- `.gitignore` · 撤回项目文档忽略规则；**dist 产物不再单独忽略**（用户 R6 决议反转）

### 删除

- `ui/shell.ts`、`ui/mapPanel.ts`、`styles/scopedCss.ts` · 原生 TS 旧实现，被 Vue 组件化代替

## 3. 关键决策

| 决策 | 内容 | 原因 |
|------|------|------|
| 技术栈 | Vue 3 SFC + Pinia + scoped CSS | 仓库工具链全部为 Vue 配套；状态驱动 UI 下 Vue 维护成本更低 |
| 内存控制 | 面板 `defineAsyncComponent`、表格 `shallowRef`、主题仅改 CSS 变量 | 避免为响应式开销付出过多 |
| 主体识别 | 严格以 `角色ID` 为主键，不用姓名/游戏ID | 匹配表格模板约定 |
| 战斗状态 | 枚举 `非战斗 / 遭遇 / 战斗中 / 收尾` | 与模板 DDL CHECK 对齐，store 内 collapse 到允许枚举 |
| 是否离场 | `是 / 否`，Tab 默认隐藏「是」 | 与模板 DDL CHECK 对齐 |
| Tab 顺序 | player_main 永远首位 | 符合玩家主视角习惯 |
| Pinia | 走 jsdelivr ESM externals | 与仓库其他项目一致，不随意改 webpack |
| 图标 | 22 个 SVG symbol，绝不用 emoji | 项目硬约束 |
| dist 产物 | **进 git，跟随发布版本** | R6 决议：发布物可追溯，public 同步链路依赖 dist 真实存在 |

## 4. 验证证据

- `pnpm run build`（webpack production 模式，自动 glob 入口）
- 产物：`dist/card_story_ui/echo_tomb_protocol_ui/index.js`，大小 **85.3 KiB / 87 309 B**（minimized）
- 同目录附 `index.js.map` 用于 source-map 复盘
- 构建输出记录：无 error，仅有仓库其他项目（`acu_visualizer_test`、`ci_island-release`）的 asset size 警告，与本项目无关
- 表格模板权威副本与 nailongwang 工作目录 SHA-256 一致：`89A529E11638E1F83A27619BB1EBF4B6F113EBA050D8BEE0D7BB24830FE07E8F`
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
| 地图面板仅为占位 | 重接 mapPrompt + aiQueue + svgSanitize 流程 | t8 |
| 升级面板仅为占位 | 经验检测/Roll/手动分配/写回未实现 | t9 |
| 组队向导仅为占位 | AI 草案与 batchWriteback 流程未实现 | t10 |
| 背包面板仅能读不能写 | 需要后续补齐转移/丢弃交互 | 后续迭代 |
| 填表事件刷新策略 | 见 §8 P2-A，需要 dirty 合并 | t6.1 |
| Vue mount 后交互未实酒馆验证 | 仅本地静态构建调试 | t12 |
| dist 路径同步到 public | 仅在最终发布时手动复制 | t11 |

## 6. 下一阶段入口

- **t6.1 骨架加固**：先关掉 §8 列出的 P1/P2 缺陷，再进 t6 内容充实
- **t6 主体 UI 充实**：背包可交互、技能详情 popover、装备 hover 详情、loading skeleton
- **主题设计丰富化**：补充动效、背景纹理、微交互详细入主文档
- **t7 设置界面与 API 配置**（新增阶段，方案 A 排在地图前）
- **t8 地图面板实现**或后续阶段并行

## 7. 关联 commit

_这些 commit 在本阶段交付后补上，按下面顺序提交：_

1. `chore(echo-tomb): 整理 .gitignore，项目文档进 git；dist 同步进 git 跟随版本`
2. `docs(echo-tomb): 重写项目文档为单一权威版本`
3. `feat(echo-tomb): t6 状态栏 UI 骨架迁移到 Vue 3 + Pinia`
4. `docs(echo-tomb): 补充 stage-01 阶段进度文档与索引`
5. `docs(echo-tomb): 阶段后审计加固计划入 stage-01 §8`
6. `fix(echo-tomb): t6.1-P2-C initSettings 改 safeParse + 兜底回写`
7. `refactor(echo-tomb): t6.1-P1-A 拆 unmountStatusBar 与 main.ts 的 unmount 责任`
8. `fix(echo-tomb): t6.1-P2-A useTablesStore 加 dirty 合并；watchEffect 改 watch 显式依赖`
9. `fix(echo-tomb): t6.1-P2-B mount detached 状态加 console.info 提示`
10. `fix(echo-tomb): t6.1-P3-A onTableFillEnd 闭包加 alive 软解绑`
11. `refactor(echo-tomb): t6.1-P3-B/P4 抽 core/constants.ts 共享 ATTR_NAMES 与 computeRadarMax；onTableUpdate 标 deprecated`
12. `docs(echo-tomb): t6.1 加固完成，主文档 §4/§10 与 stage-01 §8/§7 同步`

---

## 8. 阶段后审计与 t6.1 加固计划

> 阶段产出后对实际代码与文档声明做了一次对照审计，发现 4 条「声明合格、实质不合格」的缺陷与 3 条改进项。本节是 t6.1 加固阶段的输入，不修改 §1~§7 的阶段事实记录。
>
> 评估前提：
> - 酒馆助手运行时通过 `util/script.ts::reloadOnChatChange` 走 `window.location.reload()`，chat 切换会硬刷整个页面；脚本卸载主要发生在 `pagehide` 与酒馆主动 disable 脚本时
> - nailongwang 工作流：表格模板双向同步、DDL CHECK 约束严格、按中文表头读取，填表事件 (`registerTableFillEndCallback`) 由 AI 完成 initNode 或后续 SQL 后触发，频率不高但事件大小不可控
> - 项目硬约束：禁止裸调 `importTable`、AI 调用走 `enqueueAI`、列名按表头、shallowRef + defineAsyncComponent

### 8.1 P1-A · 双重 unmount 设计裂缝

**现象**：`main.ts` 注册的 cleanup 链先调 `_vueApp.unmount()` + `pinia.state.value = {}`，再调 `unmountStatusBar()`；而 `ui/mount.ts:71` 内部仍持有同一 `_vueApp` 引用并再 unmount 一次，靠 try/catch 把异常吞掉。

**风险评估**：
- reload 路径下脚本不会软卸载，仅 `pagehide` 与酒馆 disable 触发；事故概率较低
- 但同一组件的 `onBeforeUnmount` / `onUnmounted` 会被执行两次，未来若加入需要副作用清理的钩子（如解绑酒馆事件、关闭定时器）会出现重复释放或释放空引用
- 这是设计层面的责任不清，不修就是埋雷

**修复方向**（t6.1）：
- 拆开两侧职责：`unmountStatusBar()` 只负责 DOM 容器与 teleport style 清理，**不持有也不调用** Vue 实例
- Vue 实例与 Pinia 生命周期集中在 `main.ts` 的 cleanup 闭包内
- `mount.ts` 内的 `_vueApp` 引用降级为 `WeakRef` 或彻底删除（仅 `_$container` 保留）

**酒馆/nailongwang 关联**：reload 模式让此问题暴雷概率低，但不能因此放任不修；nailongwang 不涉及。

**✅ 已落地**：`mount.ts` 移除 `_vueApp` 模块级引用并把 `CHARACTER_MESSAGE_RENDERED` 解绑并入 `unmountStatusBar()`；`main.ts` 的 cleanup 闭包改为「先 unmount Vue → 重置 Pinia → 再调 `unmountStatusBar` 清 DOM/样式/事件」，try/catch 保护 Vue unmount 异常路径。

---

### 8.2 P1-B · `.gitignore` 决策反转，dist 进 git

**现象**：原计划与 stage-01 §2 旧版声称「dist/card_story_ui/echo_tomb_protocol_ui/ 进忽略」，实际 `.gitignore` 27 行从未加这条。审计时确认两边声明不一致。

**R6 决议**：dist 同步进 git，跟随发布版本一起记录，**不再忽略**。

**修复动作**（已落地）：
- stage-01 §2 与 §3 对应行同步修正（本次提交）
- 主文档 §9 Git 与忽略策略改写（本次提交）
- 主文档 §10 追加 R6 修订记录（本次提交）
- `.gitignore` 不需要新增条目，保持现状

**酒馆/nailongwang 关联**：dist 是发布到酒馆 import 的最终产物，进 git 后与表格模板权威副本一样具备双向同步与版本回溯能力，更贴合 nailongwang 「发布即可追溯」的工作要求。

---

### 8.3 P2-A · `tableFillEndCounter` watchEffect 没有 dirty 合并

**现象**：
```ts
// App.vue:69
watchEffect(() => {
  if (tables.tableFillEndCounter > 0) {
    tables.refreshAll();
  }
});
```
`refreshAll` 是 12 张表的 `Promise.all` export；`isLoading` guard 期间到来的 fillEnd 事件直接被丢弃，**包括最后一次**。AI 一次性写完多张表后立即触发，第一拍刷新启动，后续拍丢失，刷新结束后再无人触发，结果就停留在「最后一次刷新启动时的快照」。

**风险评估**：
- nailongwang 模板的 initNode SQL 与 updateNode SQL 一次填表会触多张表（全局表 + 主体相关 5 张）；最后到的事件最关键，恰恰最容易被丢弃
- 是否离场 / 战斗状态变更等关键状态可能因此延后一拍才反映到 UI

**修复方向**（t6.1）：
- 在 store 内引入 `_dirty` 标志：`refreshAll` 进入时若 `isLoading=true` 仅置 `_dirty=true` 立即返回；当前刷新结束的 finally 里若 `_dirty=true` 则清标志并自递归一次
- `watchEffect` 改成 `watch(() => tableFillEndCounter, ...)` 显式声明依赖，避免 reactive 收集偶发触发
- 不引入 debounce：fillEnd 频率本就不高，引入延迟只会让 UI 看起来更迟钝

**酒馆/nailongwang 关联**：直接对齐 nailongwang 「填表完整收敛后 UI 必须反映最终状态」的隐性约定。

**✅ 已落地**：`useTablesStore` 内新增 `_dirty` 标志；`refreshAll` 进入时若 `isLoading=true` 仅置 `_dirty=true` 立即返回，finally 里若 `_dirty=true` 则清标志并 `void refreshAll()` 自递归。`App.vue` 中 `watchEffect` 改 `watch(() => tables.tableFillEndCounter, …)` 显式依赖。未引入 debounce。

---

### 8.4 P2-B · `attachToLastAiMessage` 在无 AI 楼层时静默 detached

**现象**：`ui/mount.ts:54` 在 `$('.mes[is_user="false"]').length === 0` 时直接 return；容器与 Vue 仍然挂在 detached div 上，永远不可见。

**风险评估**：
- 新建聊天、首条消息为 user 消息、AI 还没回复时，状态栏完全消失但无任何反馈
- reload 模式让常规切换场景下「reload 后必有楼层」，但「新建空聊天 + 首条 user 消息」路径仍能命中
- 没有 console 提示，调试时只会怀疑是构建或 mount 失败

**修复方向**（t6.1）：
- mount 时若无 AI 楼层，记录 `console.info('[EchoTomb] 等待首条 AI 消息后再附加状态栏')`
- 已订阅 `CHARACTER_MESSAGE_RENDERED`，在该事件下首次成功 attach 时再发一条 info，便于事后从控制台回放定位
- 不改变 mount 时机：Vue 实例提前 mount 是为了让 store/订阅就绪，attach 仅是 DOM 移动

**酒馆/nailongwang 关联**：酒馆在「新建聊天 + 写第一条用户消息」流程中没有 AI 楼层；该路径必须明确处理，不能装作不存在。

**✅ 已落地**：`attachToLastAiMessage` 改为返回 `boolean`；mount 时若首次 attach 失败，`console.info('[EchoTomb] 当前无 AI 楼层…')` 提示等待状态；`CHARACTER_MESSAGE_RENDERED` 回调比对前一帧是否 detached，首次成功 attach 时再发一条 info，便于事后定位。

---

### 8.5 P2-C · `initSettings` 对脏持久化数据无兜底

**现象**：
```ts
// settings.ts:27
const raw = getVariables({ type: 'script', script_id: getScriptId() });
_settings = SettingsSchema.parse(raw ?? {});  // 抛即 bootstrap 失败
```
旧版本写入的非法字段或类型会让 zod `parse` 抛 ZodError，整套启动链失败，状态栏直接消失。

**风险评估**：
- 项目仍在迭代，settings schema 后续会扩字段（例如新增 `mapCacheSize`），已有用户脚本变量不一定兼容
- 一次破坏性升级可能让所有老用户的状态栏一起挂

**修复方向**（t6.1）：
- 改 `safeParse`，失败时 `console.warn` 输出 `error.issues` 摘要，再用 `SettingsSchema.parse({})` 兜回默认
- 兜底成功后立即 `insertOrAssignVariables` 把规整后的设置写回，覆盖脏值
- 不静默：必须记录脏数据原貌（仅 debug，必要时遮掩敏感字段）

**酒馆/nailongwang 关联**：酒馆脚本变量是跨版本持久层，schema 兼容性是基本要求。

**✅ 已落地**：`settings.ts::initSettings` 用 `safeParse`，失败时打印 `error.issues` 摘要并兜回 `SettingsSchema.parse({})` 默认值，兜底成功后立即 `insertOrAssignVariables` 写回覆盖脏值；`updateSettings` 的写回也加 try/catch warn。`getVariables` 同样用 try/catch 包，避免宿主异常炸 bootstrap。

---

### 8.6 P3-A · reload 行为与订阅不可解绑两条风险未文档化

**现象**：
- `reloadOnChatChange()` 实质为 `window.location.reload()`，会硬刷整个酒馆主页面，影响共存脚本
- `DatabaseAPI.onTableFillEnd` 没有反向 unsubscribe；store cleanup 只释放数据 ref，订阅闭包仍持有 `tableFillEndCounter` 这个 ref

**修复方向**（已落地为文档动作 + t6.1 检查）：
- 主文档 §8 风险与已知问题加两条说明（本次提交）
- t6.1 阶段在 `useTablesStore` 加一个 `_callbackToken`：内部包一层 `let _alive = true; onTableFillEnd(() => { if (_alive) tableFillEndCounter.value++; })`，cleanup 时置 `_alive = false`，等价软解绑

**酒馆/nailongwang 关联**：reload 是仓库通用约定，但本项目共存场景需要明确告知；nailongwang 模板侧不受影响。

**✅ 已落地**：主文档 §8 第 8、9 条已落地；`useTablesStore` 加 `_alive` 标志，`subscribeFillEnd` 内部回调先判断 `if (!_alive) return` 再递增计数；store 的 `registerCleanup` 闭包先把 `_alive` 置 false，再清空各 ref，确保宿主回调即使在 cleanup 后被调用也只触发空操作。

---

### 8.7 P3-B · `onTableUpdate` 死接口与 `ATTR_NAMES` 双处定义

**现象**：
- `core/database.ts::onTableUpdate` 暴露但全项目无人调用
- `RadarChart.vue:59` 默认 labels 与 `SubjectPanel.vue:176` `ATTR_NAMES` 各定义一份，顺序必须一致才正确

**修复方向**（t6.1）：
- `onTableUpdate` 暂保留接口形态但加 JSDoc 标 `@deprecated`-候选，t8 地图面板若不需要则在 t12 一并删除
- 抽 `core/constants.ts`，导出 `ATTR_NAMES`，两处共享同一引用

**✅ 已落地**：`core/database.ts` `onTableUpdate` 接口加 JSDoc `@deprecated`-候选，明确「t8 地图面板若不需要则 t12 验证回归阶段一并删除」；新增 `core/constants.ts`，导出 `ATTR_NAMES` 与 `computeRadarMax`；`RadarChart.vue` 默认 labels 改 `[...ATTR_NAMES]`，`SubjectPanel.vue` 删除内部 `ATTR_NAMES` 改从 `core/constants` 导入。

---

### 8.8 P4 · `radarMax` 公式无解释

**现象**：`SubjectPanel.vue:228` `Math.max(30, ...radarValues, level*5+20)` 缺解释；高等级时 max 持续抬升会让低维属性视觉缩小。

**修复方向**（t6.1）：
- 把公式改为可读的封装函数，行内注释解释「随等级抬升 max 上限，避免低等级时雷达图边缘已撑满；`level*5+20` 对应每级预期满级属性 5 点 + 基础 20 的设计假设」
- 主文档 §6.t6 验收章节追加一行：「雷达图 max 公式由 `core/constants.ts::computeRadarMax(level, values)` 提供，组件不内嵌公式」

**✅ 已落地**：`core/constants.ts::computeRadarMax(level, values)` 封装公式与设计假设（floor 30、每级 +5、基础 +20、超出按实际值）；`SubjectPanel.vue` 的 `radarMax` 直接调用，组件不再内嵌公式。

---

### 8.9 t6.1 加固执行顺序与落地结果

按风险×可行性排序，每条单独 commit。✅ 全部完成。

1. ✅ **P1-B + 文档**：stage-01 §2/§3/§7/§8 修订，主文档 §8/§9/§10 同步
2. ✅ **P2-C**：`initSettings` 改 safeParse + 兜底回写（零回归，产物 +0.5 KiB）
3. ✅ **P1-A**：拆 `unmountStatusBar` / `main.ts` 的 unmount 责任（Vue 实例只在 main.ts 持有；mount.ts 不再保留 `_vueApp` 引用，事件解绑并入 `unmountStatusBar`）
4. ✅ **P2-A**：`useTablesStore` 加 `_dirty` 合并 + `watch` 显式依赖；`watchEffect` 改 `watch(() => tables.tableFillEndCounter, …)`
5. ✅ **P2-B**：`mount.ts` 在无 AI 楼层时 `console.info` 提示，首次成功 attach 时再发一条 info；`attachToLastAiMessage` 改返回 boolean
6. ✅ **P3-A**：`onTableFillEnd` 闭包加 `_alive` 软解绑，cleanup 时置 false（先于数据 ref 重置）
7. ✅ **P3-B + P4**：新增 `core/constants.ts`，导出 `ATTR_NAMES` 与 `computeRadarMax(level, values)`；`RadarChart.vue` 与 `SubjectPanel.vue` 共享同一引用；`onTableUpdate` 标 `@deprecated` 候选（t12 验证回归阶段决定是否删除）

构建数据：
- 源码模块 12 → 13（新增 `core/constants.ts`）
- bundle 源码 38 KiB → 41.1 KiB（+3.1 KiB，含全部加固代码与注释）
- minified 产物 85.3 KiB → 86.2 KiB（+0.9 KiB，预算内）
- 编译零 error，零本项目 warning

t6.1 加固完成。下一步进 t7 设置界面与 API 配置（按 R7 规划），不再回到 t6 内容充实。t6 内容充实（背包交互、技能 popover、装备 hover、loading skeleton）将在 t7~t10 功能面板齐备后另立阶段处理。
