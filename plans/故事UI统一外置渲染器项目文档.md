# 技术方案目标

将原本依赖故事引擎正则直接插入显示 HTML 的 UI，逐步重构为：

- 公共测试版与正式版外置资源。
- 酒馆助手脚本入口负责加载。
- 模块化视觉组件按标签接入。
- 不改写聊天原文，只重建当前网页显示副本。
- 后续可单独追加 / 替换模块。

---

## 目录结构约定

### 变量更新模块

测试版：

- [`index.js`](../public/story_regex_ui_test/modules/variable-update/index.js)
- [`style.css`](../public/story_regex_ui_test/modules/variable-update/style.css)

正式版：

- [`index.js`](../public/story_regex_ui_prod/modules/variable-update/index.js)
- [`style.css`](../public/story_regex_ui_prod/modules/variable-update/style.css)

视觉来源：

- [`变量更新美化正则-米白版本`](../src/数据库前端/故事引擎正则/变量更新美化正则-米白版本)
- [`变量更新美化正则-暗色版本`](../src/数据库前端/故事引擎正则/变量更新美化正则-暗色版本)

### BP 面板模块

测试版：

- [`index.js`](../public/story_regex_ui_test/modules/bp-panel/index.js)
- [`style.css`](../public/story_regex_ui_test/modules/bp-panel/style.css)

正式版：

- [`index.js`](../public/story_regex_ui_prod/modules/bp-panel/index.js)
- [`style.css`](../public/story_regex_ui_prod/modules/bp-panel/style.css)

视觉来源：

- [`BP面板美化正则-米白版本`](../src/数据库前端/故事引擎正则/BP面板美化正则-米白版本)
- [`BP面板美化正则-暗色版本`](../src/数据库前端/故事引擎正则/BP面板美化正则-暗色版本)

### 故事引擎悬浮球模块

测试版：

- [`index.js`](../public/story_regex_ui_test/modules/story-engine/index.js)
- [`style.css`](../public/story_regex_ui_test/modules/story-engine/style.css)

正式版：

- [`index.js`](../public/story_regex_ui_prod/modules/story-engine/index.js)
- [`style.css`](../public/story_regex_ui_prod/modules/story-engine/style.css)

视觉来源：

- [`故事引擎悬浮球美化正则-米白版本`](../src/数据库前端/故事引擎正则/故事引擎悬浮球美化正则-米白版本)
- [`故事引擎悬浮球美化正则-暗色版本`](../src/数据库前端/故事引擎正则/故事引擎悬浮球美化正则-暗色版本)

### 好感度模块

测试版：

- [`index.js`](../public/story_regex_ui_test/modules/relation/index.js)
- [`style.css`](../public/story_regex_ui_test/modules/relation/style.css)

正式版：

- [`index.js`](../public/story_regex_ui_prod/modules/relation/index.js)
- [`style.css`](../public/story_regex_ui_prod/modules/relation/style.css)

视觉来源：

- [`状态栏·好感度美化正则-米白版本`](../src/数据库前端/故事引擎正则/状态栏·好感度美化正则-米白版本)
- [`状态栏·好感度美化正则-暗色版本`](../src/数据库前端/故事引擎正则/状态栏·好感度美化正则-暗色版本)

### MVU 状态栏模块

测试版：

- [`index.js`](../public/story_regex_ui_test/modules/mvu-status/index.js)
- [`style.css`](../public/story_regex_ui_test/modules/mvu-status/style.css)

正式版：

- [`index.js`](../public/story_regex_ui_prod/modules/mvu-status/index.js)
- [`style.css`](../public/story_regex_ui_prod/modules/mvu-status/style.css)

视觉来源：

- [`MVU状态栏美化正则-米白版本`](../src/数据库前端/故事引擎正则/MVU状态栏美化正则-米白版本)
- [`MVU状态栏美化正则-暗色版本`](../src/数据库前端/故事引擎正则/MVU状态栏美化正则-暗色版本)

新变量版本视觉来源：

- [`MVU状态栏美化正则-新变量结构-米白版本`](../src/数据库前端/新战斗内容/MVU状态栏美化正则-新变量结构-米白版本)
- [`MVU状态栏美化正则-新变量结构-暗色版本`](../src/数据库前端/新战斗内容/MVU状态栏美化正则-新变量结构-暗色版本)

---

## 模块接口规范

每个模块注册为独立对象。

接口包含：

- 模块标识。
- 模块版本。
- 原始标签定义。
- 从已提取正文生成美化节点函数。
- 模块只负责声明自己的标签与美化结构，不负责直接改写原文。
- 核心负责根据模块声明的标签统一完成匹配、内容提取，并调用酒馆助手显示格式化方法重建当前楼层显示副本。
- 前端只改当前网页显示副本，不写回聊天原文。
- 可选挂载函数。
- 可选清理函数。

建议字段：

```text
id
version
block
renderContent
mount
cleanup
```

核心加载器与显示层只通过统一接口调用模块，不依赖模块内部实现。

---

## 当前测试版显示层挂载模型

当前测试版 [`public/story_regex_ui_test/index.js`](../public/story_regex_ui_test/index.js) 已从“整段重建显示 HTML”调整为：

```text
raw message 轻量扫描
→ 酒馆原生正则先渲染显示层
→ 核心在显示层中定位模块对应可见范围
→ 将原文显示片段 extract 到 hidden source 容器
→ 在同一位置插入模块 UI mount host
```

### 设计目标

- raw message 中的 `<story_driver>...</story_driver>`、`<bp_panel>...</bp_panel>`、`<wlog ...>...</wlog>`、`<UpdateVariable>...</UpdateVariable>`、`<StatusPlaceHolderImpl/>` 等内容继续保留。
- AI 过滤、变量处理和其他基于聊天原文的正则仍以 raw message 为输入，不读取测试版脚本改写后的显示 DOM。
- 酒馆原生正则优先运行；测试版脚本不抢先重建整楼 `.mes_text.innerHTML`。
- 显示层不直接暴露模块 raw 原文；脚本 UI 插入到核心定位到的对应显示位置。
- 模块保持热插拔边界：模块只声明标签和渲染 UI，核心负责捕获、锚定、隐藏和挂载。

### 核心职责

核心入口负责以下工作：

1. 读取 raw message：
   - 使用酒馆助手/宿主消息接口读取当前楼层原文。
   - 不写回聊天消息，不修改 raw message。
2. 收集模块声明：
   - 成对标签模块通过 `block.open / block.close` 声明范围。
   - 单标签模块通过 `singleTag` 声明占位符。
3. 按 raw message 顺序捕获模块：
   - `getRenderableMatchesInOrder()` 按模块在 raw message 中出现的顺序生成 match 列表。
   - 每个 match 保留 `module`、`start`、`end`、`fullMatch`、`content`、`singleTag` 等信息。
4. 构造显示层锚点候选：
   - `buildMatchStartCandidates()` 从当前 match 的 `content/fullMatch/singleTag` 生成可见起点候选。
   - `buildMatchEndCandidates()` 从当前 match 的尾部内容生成兜底终点候选。
   - 优先使用下一个 raw match 的可见起点作为当前模块显示范围的结束边界。
5. 隐藏显示层原文：
   - 使用 `Range.extractContents()` 将命中的显示层原文 fragment 移动到：

     ```html
     <span data-story-ui-hidden-source="true" hidden aria-hidden="true"></span>
     ```

   - 不使用 `Range.deleteContents()` 删除显示层原文。
   - 清理时通过 `hidden.replaceWith(...hidden.childNodes)` 恢复隐藏内容。
6. 挂载模块 UI：
   - 创建：

     ```html
     <section data-story-ui-raw-mount="true" data-story-ui-module="..."></section>
     ```

   - 将模块 `renderContent()` 生成的 UI 插入该 mount host。
   - 调用模块可选 `mount()` 进行事件绑定、主题应用或数据刷新。

### 模块职责

模块不负责隐藏原文，也不直接修改 `.mes_text`。

模块只负责：

- 声明 `id`、`version`。
- 声明 `block.open / block.close` 或 `singleTag`。
- 实现 `renderContent(content, context)`。
- 可选实现 `mount(node, context)`。
- 提供自身 CSS，并使用模块命名空间隔离样式。

### 酒馆助手调用边界

- `refreshOneMessage(message_id)` 只在受控入口使用：
  - 管理面板“手动重扫”：`refreshNative: true, force: true`。
  - 管理面板“重载资源”：先刷新最近窗口，再强制扫描挂载。
- 普通 `CHARACTER_MESSAGE_RENDERED`、`MESSAGE_UPDATED` 等事件触发的 `queueScan()` 不会无条件调用 `refreshOneMessage()`，避免 refresh → render event → queueScan → refresh 的循环。
- `retrieveDisplayedMessage(message_id)` 用于获取酒馆当前显示层正文容器。
- `formatAsDisplayedMessage()` 保留为历史/兼容链路，不再作为当前测试版主流程的整楼重建方式。

### 当前保证范围与限制

- 能保证：测试版脚本不写回 raw message，因此不影响基于 raw message 的 AI 过滤、变量处理和后续正则匹配。
- 能保证：受控重扫/重载流程中，酒馆原生正则先完成显示层渲染，脚本再进行 hidden source 与 mount host 插入。
- 能保证：隐藏动作不删除显示层原文 fragment，而是移动到可恢复的 hidden source 容器。
- 不能绝对保证：如果某个后续脚本读取的是当前 displayed DOM，而不是 raw message，它会看到测试版插入的 hidden source 与 mount host；这类 DOM 读取型脚本需要按显示层插件的兼容规则处理。
- 不能绝对保证：如果酒馆原生正则已经把某个模块原文完全替换为没有可匹配文本的复杂 HTML，核心可能无法精确定位原文位置，只能 fallback 到楼层尾部挂载。
- 单标签模块如果在显示层没有可见占位文本，也可能 fallback append；后续可按单标签模块增加显式锚点策略。

---

## 样式隔离规范

所有模块必须使用独立命名空间。

推荐前缀：

- 变量更新：`story-ui-vu-`
- 世界报告：`story-ui-wlog-`
- BP 面板：`story-ui-bp-`
- 故事引擎：`story-ui-se-`
- 好感度：`story-ui-rel-`
- MVU 状态栏：`story-ui-mvu-`

禁止使用无前缀通用类名：

- `.card`
- `.panel`
- `.content`
- `.header`
- `.toggle-icon`

所有模块样式必须限定在模块根类之下。

---

## 当前修改进度

已完成：

- 已创建测试版外置资源目录 [`public/story_regex_ui_test`](../public/story_regex_ui_test)。
- 已接入核心文件：[`loader.js`](../public/story_regex_ui_test/loader.js)、[`shared.css`](../public/story_regex_ui_test/shared.css)、[`dom.js`](../public/story_regex_ui_test/core/dom.js)、[`registry.js`](../public/story_regex_ui_test/core/registry.js)、[`scanner.js`](../public/story_regex_ui_test/core/scanner.js)、[`theme.js`](../public/story_regex_ui_test/core/theme.js)。
- 已完成测试版到正式版的整目录同步；当前 [`public/story_regex_ui_prod`](../public/story_regex_ui_prod) 与测试版保持同构，环境标识、资源路径、管理面板根节点 id、标题文案与模块版本号均已切换为正式版配置。
- 测试版已从只保留变量更新模块的阶段继续推进，当前重新接入 MVU 状态栏模块进入统一核心渲染链路。
- 测试版 `loader.js` 已改为模块清单驱动，当前已加载变量更新模块与 MVU 状态栏模块，不再把固定美化组合硬编码进加载链。
- 测试版变量更新模块已按提供的米白 / 暗色正则源文件重做视觉；当前测试版核心层已统一负责根据模块声明的标签完成匹配、正文提取，并调用酒馆助手 `formatAsDisplayedMessage` 处理普通正文后重建当前楼层显示副本。变量更新模块只保留标签定义与美化渲染接口，前端当前不改写原文，保证正则仍可读取 `<UpdateVariable>...</UpdateVariable>`。
- 测试版核心当前保留“成对标签由模块声明”的模式；模块通过 `block.open / block.close` 提供自身标签，核心不把某个成对标签写死在渲染器里。
- 测试版变量更新面板已移除内部“更新明细”二级容器，正文内容直接作为唯一内容块显示；标题左侧图标重新接入核心主题切换，点击后整体切换米白 / 暗色主题。
- 测试版 MVU 状态栏模块已按提供的米白 / 暗色视觉重建为占位符模块，使用唯一单标签 `<StatusPlaceHolderImpl/>` 接入当前核心显示副本重建流程。
- 测试版核心当前仅对单标签 `<StatusPlaceHolderImpl/>` 做额外支持，不扩展成通用单标签框架。
- 测试版核心已修正多模块混排顺序：当同一条原文同时包含成对标签块与 `<StatusPlaceHolderImpl/>` 时，会按原文出现顺序依次重建显示副本，不再出现只能渲染一个模块的问题。
- 测试版 MVU 状态栏当前已优先读取当前楼层 `Mvu.getMvuData({ type: 'message', message_id })`，不再错误读取全局变量副本。
- 测试版 MVU 状态栏已补回原正则的大部分结构与交互：世界状态、亲密状态、个人状态档案、束缚、战技、术式、特殊体质、咒灵操术、行囊、当前任务、羁绊档案，以及任务/奖励/子项折叠逻辑。
- 测试版 MVU 标题左侧主题切换图标已改为与变量更新一致的方形样式，且世界状态标题图标会在夜间模式下从 `✦` 切换为 `✧`。
- 测试版故事引擎模块已从最初宽松拆段版本切换为“按原始故事引擎正则捕获结构解析”的还原模式：外层 `<story_driver>` 与内部 `<npc_driver>` 均优先按原始正则字段边界取值，事件条继续沿用原始事件行正则。
- 测试版与正式版当前均已接入模块级主题热切换重渲染；监听器已从“按楼层重复绑定”收敛为“按模块单例绑定”，并统一通过 [`core/theme.js`](../public/story_regex_ui_test/core/theme.js) 的最近渲染窗口能力限制主题切换重绘范围，默认只处理最新五层/当前渲染深度。
- 当前主题切换重绘范围已统一改为优先使用最近渲染窗口；模块不再在主题切换时默认全量 `querySelectorAll('[data-story-ui-module=...]')` 扫整页实例。
- 已废弃测试版与正式版统一引导正则启用方式，旧正则说明已改为历史迁移说明。
- 已创建测试版酒馆助手入口 [`index.js`](../public/story_regex_ui_test/index.js)。
- 已将维护入口整合为脚本按钮：`咒回前端管理`；并新增独立脚本按钮 `重载资源`，点击后会先执行一次手动重扫，再执行一次资源重载。
- 管理面板首次打开前会先确保 [`modules/manager-ui/style.css`](../public/story_regex_ui_test/modules/manager-ui/style.css) 完成挂载，避免未样式化面板节点短暂插入页面文档流，导致酒馆主界面整体上移。
- 管理面板维护工具按钮顺序已调整为：手动重扫 → 重载资源 → 刷新诊断 → 旧消息折叠/旧消息未折叠；其中“旧消息折叠”开启态已取消绿色强调，恢复与“刷新诊断”一致的默认按钮视觉，未折叠态仍保留低饱和红色提醒。
- “重载资源”链路已改为：重载完成后优先调用酒馆助手 `refreshOneMessage(message_id)` 刷新当前最近渲染窗口中的已显示楼层，而不是再手动触发一次正则重放或要求用户手动开关渲染开关；用于修复重载后正文临时回退为“显示代码块 / 点击展开代码块”占位的问题。
- 当前主题储存键只使用 `jjks_story_ui_theme`。
- 已从当前外置渲染器测试版 [`theme.js`](../public/story_regex_ui_test/core/theme.js) 中删除旧键常量、旧键读取、旧键迁移、旧键清理与导出字段。
- 本项目文档已更新为：所有新增本地储存键必须使用 `jjks_story_ui` 前缀。
- 测试版核心已改为基于 raw message 的模块顺序扫描与显示层锚点挂载：模块只声明 `block.open / block.close` 或 `singleTag`，核心统一负责捕获、锚定、hidden source 隐藏与 mount host 挂载。
- 测试版核心已移除主流程中的 `Range.deleteContents()` 原文删除路径；当前隐藏使用 `Range.extractContents()` 将显示层原文 fragment 移入 `[data-story-ui-hidden-source="true"]`，清理时可通过 `replaceWith(...childNodes)` 恢复。
- 测试版核心已新增 `buildMatchStartCandidates()`、`buildMatchEndCandidates()`、`findVisibleSourceRangeForMatch()` 等通用锚点函数，优先使用 raw 中下一个模块的可见起点作为当前模块隐藏范围终点，避免每个模块在核心里硬编码专属隐藏规则。
- 测试版核心已将脚本 UI 统一插入 `[data-story-ui-raw-mount="true"]` mount host，并在 host 上记录 `data-story-ui-module`，便于诊断、清理和模块 `mount()` 调用。
- 测试版管理面板“手动重扫”当前使用 `refreshNative: true, force: true`：先调用酒馆助手刷新最近窗口，再强制扫描和挂载，避免签名缓存导致新隐藏逻辑不生效。
- 测试版“重载资源”链路当前先调用 `refreshOneMessage(message_id)` 刷新最近窗口，然后执行 `force: true` 扫描，不再通过普通 `queueScan()` 造成签名跳过。
- 普通酒馆渲染事件触发的扫描不会无条件调用 `refreshOneMessage()`，避免 refresh/render 事件循环和外部媒体资源重复请求。
- 2026-05-13 16:45-17:00 调试记录：针对 BP 战力雷达、世界运行报告与变量更新仍暴露 raw 结构的问题，已确认上一轮仅增强通用候选锚点仍不足。真实酒馆原生正则可能把标签剥离或把块内容拆为纯文本片段，导致核心无法依赖 `<bp_panel>`、`<wlog>`、`<UpdateVariable>` 标签文本定位；后续修复方向改为优先按模块原正则源文件中的可见标题/段落结构定位完整显示块。
- 2026-05-13 16:45-17:00 调试记录：已阅读故事引擎、变量更新、世界运行报告、好感度、BP、MVU 与新变量 BP/MVU 正则源文件，确认关键 raw 结构分别为 `<story_driver>...</story_driver>`、`<bp_panel>...</bp_panel>`、`<wlog time="...">...</wlog>`、`<status_relationship>...</status_relationship></>`、`<UpdateVariable>...</UpdateVariable>` 与 `<StatusPlaceHolderImpl/>`；其中 BP 需要同时兼容旧版 `BP总值/操作/肉体/咒术` 和新版 `总BP/HP/咒力/肉体/术式/攻击/反转/熔断` 两种结构。
- 2026-05-14 02:31-02:42 调试记录：本轮重新阅读项目文档与测试版核心后，确认当前测试版已不是旧的 displayed DOM 锚点替换主流程，而是 raw-token 三态互斥主流程：[`renderMessageHtmlByModules()`](../public/story_regex_ui_test/index.js:581) 只处理 `script` 模式模块，先把脚本模块替换为 token，再经 `formatAsDisplayedMessage()` 格式化，最后替换为 `[data-story-ui-raw-mount]`；[`mountModulesForMessage()`](../public/story_regex_ui_test/index.js:758) 在没有 `script` 模式 match 时会清理脚本挂载并返回，因此 `native` 模式下原生正则显示、脚本 UI 不显示是当前设计结果，不是已知挂载失败。
- 2026-05-14 02:31-02:42 调试记录：为验证用户反馈中的真实链路，新增浏览器控制台诊断脚本 [`story-ui-after-native-diagnose.js`](../tmp/story-ui-after-native-diagnose.js)。该脚本采集模块 mode、raw 标签、原生正则可见证据、`[data-story-ui-raw-mount]` 脚本挂载、`mountModulesForMessage()` 跳过证据、manager diagnosis 最近扫描统计，以及原生正则结果是否具备可稳定定位 DOM 范围的候选节点、类名、标题文本、父子/兄弟结构。
- 2026-05-14 02:31-02:42 初步诊断假设：当前三态明确覆盖 A `script` raw-token 接管和 B `native` pass-through；用户期望的“原生正则先出现，同时脚本美化再显示/替换/增强原生结果”属于 C `after-native`/`overlay`/`enhance-native` 第四模式，当前三态没有实现。需等待用户回传 [`story-ui-after-native-diagnose.js`](../tmp/story-ui-after-native-diagnose.js) 输出 JSON 后确认是否存在稳定原生 DOM 锚点可作为第四模式基础。
- 2026-05-14 02:46-02:52 浏览器回传诊断结论：用户执行 [`story-ui-after-native-diagnose.js`](../tmp/story-ui-after-native-diagnose.js) 后确认测试版资源加载正常，版本为 `test-native-skip-20260514`，`StoryRegexUI`、scanner、manager 均就绪；所有主模块均处于 `native`，新变量 BP/MVU 处于 `off`，`故事UI节点数=0`、`mountCount=0`、`最近扫描包含脚本接管模块=false`、`最近脚本重写楼层=[]`、`最近跳过原生或关闭楼层` 包含 1860/1862/1864。这证明脚本没有显示不是挂载失败，而是 [`mountModulesForMessage()`](../public/story_regex_ui_test/index.js:758) 设计内 native/off-only skip。
- 2026-05-14 02:46-02:52 浏览器回传诊断结论：message 1860/1862/1864 中 `story-engine`、`bp-panel`、`world-log`、`variable-update` 等模块普遍为 `rawPresent=true/nativePresent=true/scriptPresent=false/observedClass=native-only/modeMatchesImplementation=true`；没有出现 `nativePresent=true/scriptPresent=true` 的 after-native overlay 证据。因此当前现象不是三态实现 bug，而是需求模式缺失：若目标是“原生正则显示后脚本再显示/替换/增强”，需要新增 `after-native`/`overlay` 第四模式。
- 2026-05-14 02:46-02:52 DOM 稳定性观察：原生正则可见结果多数落在 `.mes_text` 下无专属类名的 `<p>`/`<ul>`/`<li>` 结构中，例如 BP 可由 `【BP战力雷达】`、`【扫描状态】`、`【已扫描目标】` 顺序定位，故事引擎可由 `━━ 1.全域锚定 ━━` 到 `━━ 3.最终修正 ━━` 定位，world-log 可由 `Time passed:` 与 `【世界主线】` 定位；变量更新与 MVU 证据部分混入 JSONPatch 的 `<q class="ny-dialogue custom-ny-dialogue">`，DOM 范围边界不稳定。第四模式若实施，必须按模块定义原生 DOM anchor/range 策略，不能泛化假设所有模块都有稳定容器。
- 2026-05-14 03:00-03:05 需求澄清：用户明确目标不是在 `script` 与 `native` 二选一，而是“脚本美化要能够和原生酒馆美化共存，表现形式接近正则，并能够根据楼层变动、数据变动实时更新”。这将后续目标从三态互斥升级为 `after-native`/`overlay`/`enhance-native` 共存增强模式：酒馆原生正则先完成 displayed DOM 渲染，脚本再基于 raw 数据和原生 DOM anchor 插入、替换或增强模块 UI。
- 2026-05-14 03:00-03:05 浏览器控制台尝试记录：曾新增 [`story-ui-after-native-overlay-probe.js`](../tmp/story-ui-after-native-overlay-probe.js)，用于在不写回 raw、不修改正式版、不持久化变更的前提下，在当前浏览器页面中临时把脚本模块 UI 插入到原生正则可见结果之后，并观察 BP、story-engine、world-log、variable-update、relation-status、mvu-status 等模块是否能与原生显示共存。该旧探针同时提供 `window.__jjksAfterNativeOverlayProbe.installAutoProbe()` 用于临时监听楼层 DOM 变化后重新探针挂载，以验证“楼层变动/数据变动实时更新”的可行性。
- 2026-05-14 03:08 事故记录：用户执行旧版 [`story-ui-after-native-overlay-probe.js`](../tmp/story-ui-after-native-overlay-probe.js) 后反馈最新用户楼层与最新 AI 楼层疑似丢失。用户已通过导入备份恢复，但该旧探针必须视为安全事故源废弃，不得再次复制执行。
- 2026-05-14 03:08 事故归因边界：旧探针虽然不应写回 raw，但它会在最近楼层 displayed DOM 中插入多个 `[data-story-ui-after-native-probe="true"]` 节点、调用模块 `mount()`，并可安装 `MutationObserver` 自动重跑；这些行为可能触发模块级 rerender、主题监听或 DOM Mutation 级联，导致最新楼层 displayed DOM 异常。事故后不得再以“只是浏览器临时探针”为理由提供会修改 displayed DOM 的控制台脚本。
- 2026-05-14 03:12 熔断处理：[`story-ui-after-native-overlay-probe.js`](../tmp/story-ui-after-native-overlay-probe.js) 已替换为安全熔断脚本；执行后只打印错误/警告和熔断原因，不插入 DOM、不调用模块 `mount()`、不安装 `MutationObserver`、不调用 `refreshOneMessage()`、不读写 raw、不调用任何 set/delete/update 类 API。
- 2026-05-14 03:12 硬性新规则：浏览器诊断默认只读；不得插入 DOM；不得调用模块 `mount()`；不得安装自动监听；不得对最新楼层操作；不得提供会修改 displayed DOM 的控制台探针。任何 overlay / after-native 可行性验证必须先写方案并明确隔离条件，不能直接投放到用户当前聊天页面。
- 2026-05-14 04:02-04:11 受控浏览器实验结论：在实验聊天分支中先确认 `bp-panel`、`story-engine`、`world-log` 均为 `native`，最近窗口 `rawMountCount=0`，并通过 [`story-ui-after-native-native-state-probe.js`](../tmp/story-ui-after-native-native-state-probe.js) 找到 40 个非脚本挂载候选锚点；随后执行 [`story-ui-after-native-controlled-probe.js`](../tmp/story-ui-after-native-controlled-probe.js)，成功在 message 1860/1862/1864 上为三类模块各挂载一次临时 after-native UI，`mounted=9`、`errors=[]`，1861/1863 因无目标 raw 块按预期跳过。
- 测试版已新增第一阶段 `after-native` / “共存增强”模式：[`registry.js`](../public/story_regex_ui_test/core/registry.js) 接受 `script`、`native`、`after-native`、`off` 四态；[`index.js`](../public/story_regex_ui_test/index.js) 在 `after-native` 下不重写整楼 `innerHTML`，而是在酒馆原生正则已渲染的 `.mes_text` 中按模块可见锚点插入 `[data-story-ui-after-native-mount="true"]` host，并继续通过模块 `renderContent()` / `mount()` 生成脚本 UI。
- 第一阶段 `after-native` 只定义并验证 `bp-panel`、`story-engine`、`world-log` 的可见锚点：BP 使用 `已扫描目标` / `BP战力雷达` / `扫描状态` / `BP总值`，故事引擎使用 `最终修正` / `全域锚定`，world-log 使用 `世界主线` / `Time passed:`。`variable-update`、`mvu-status`、`relation-status` 与新变量模块暂未声明稳定锚点，后续需要逐模块补充边界策略。
- 2026-05-14 04:49-04:54 隐藏策略补充：测试版 `after-native` 已新增显示层原文隐藏层。隐藏只作用于 displayed DOM：命中的原生可见提示块会被标记为 `[data-story-ui-after-native-hidden-source="true"]`、设置 `hidden` 和 `aria-hidden`，不会调用 `setChatMessages()` / `deleteChatMessages()` / `update` 类消息 API，也不会修改 raw message；清理或模式切换时会移除标记并恢复显示。该策略用于隐藏暴露在外的 `<story_driver>` / `<bp_panel>` / `<wlog>` 可见提示内容，同时保留 raw 中的标签块供后续酒馆原生 display/prompt 正则、AI 过滤与变量流程继续读取。
- 正式版未同步本轮 `after-native` 第一阶段实现与隐藏层；正式版仍需等待测试版在浏览器环境确认稳定后再同步。

待验证：

- 在酒馆环境确认测试版入口 `public/story_regex_ui_test/index.js` 可作为酒馆助手脚本加载。
- 在酒馆环境确认正式版入口 `public/story_regex_ui_prod/index.js` 可作为酒馆助手脚本加载，且标题显示 `Jujutsu Kaisen Frontend · 正式版`。
- 确认测试版当前加载变量更新模块与 MVU 状态栏模块，模块链路稳定。
- 确认测试版核心层会根据变量更新模块声明的 `<UpdateVariable>...</UpdateVariable>` 标签完成匹配与正文提取，不会再误匹配故事引擎正文。
- 确认核心层重建显示副本后，普通正文保留且变量标签块被替换为美化面板。
- 确认进入聊天与聊天切换后，测试版无需手动“重载资源”即可在最近窗口自动完成当前保留模块的显示替换。
- 确认变量更新标题左侧图标点击后可整体切换米白 / 暗色主题。
- 确认 `<StatusPlaceHolderImpl/>` 会被替换为 MVU 状态栏面板，且其折叠交互与变量更新后刷新正常。
- 确认 MVU 当前已补回的任务区、子面板、奖励区折叠在酒馆环境中交互稳定。
- 确认 `咒回前端管理` 按钮可打开管理界面。
- 确认独立脚本按钮 `重载资源` 可执行“一次手动重扫 + 一次资源重载”，并且不会再引发酒馆主界面上移。
- 确认故事引擎 `<story_driver>...</story_driver>` 在真实样本文本下字段不再缺失，事件 / NPC / combat / 最终修正与原正则显示结果一致。
- 确认管理界面可执行手动重扫、诊断刷新、资源重载、米白 / 暗色模式切换。
- 确认主题热切换时仅重绘最近渲染窗口/默认最新五层，不再随历史楼层数量增长而线性放大重绘成本。
- 确认资源重载后，酒馆正文不再停留在“显示代码块 / 点击展开代码块”占位状态，且无需手动开关酒馆助手渲染开关即可恢复正常显示。
- 确认日 / 夜主题热切换只写入 `jjks_story_ui_theme`。
- 后续从故事引擎悬浮球开始，逐个把原本多条正则模块整合进测试版单模块渲染链。
- 确认测试版手动重扫后，`story-engine`、`bp-panel`、`world-log`、`variable-update`、`mvu-status` 均能按 raw message 顺序生成 mount host。
- 确认测试版手动重扫后，显示层不再直接暴露对应模块 raw 原文；`[data-story-ui-hidden-source="true"]` 数量与实际隐藏模块数量一致。
- 确认测试版脚本 UI 插入位置与原文模块位置一致，而不是统一追加到楼层末尾；若出现 fallback，应在诊断中标记并继续增强核心锚点算法。
- 确认普通酒馆消息渲染事件不会触发 `refreshOneMessage()` 循环，不再反复请求同一媒体资源。
- 确认 `clearStoryUiInjectedNodes()` 能恢复 hidden source 中的原文 fragment，不会造成显示层内容丢失。
- 确认后续基于 raw message 的原生正则、变量处理和 AI 过滤仍可读取完整标签块。
- 确认是否存在读取 displayed DOM 的第三方脚本；若存在，需要针对 hidden source 与 mount host 做兼容评估。
- 确认单标签 `<StatusPlaceHolderImpl/>` 在没有可见文本锚点时的 fallback 行为是否可接受，必要时为单标签模块增加核心锚点声明字段。
- 已完成 [`tmp/story-ui-after-native-diagnose.js`](../tmp/story-ui-after-native-diagnose.js) 浏览器回传验证：当前 native 模式表现为设计内 `native-only` / native-off-only skip，不是脚本挂载 bug。
- 已完成测试版 `after-native` 第一阶段实现，待在酒馆环境通过管理面板切换“共存增强”后确认最近窗口可自动挂载 BP、故事引擎与世界运行报告。
- 后续若继续扩展“原生正则和脚本美化链路关系明确且可叠加”，需为变量更新、MVU、好感度/羁绊与新变量模块分别定义稳定原生 DOM anchor/range 策略。
