## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 定位为什么消息显示层无法触发故事UI外置渲染  `#diagnose-display-root-cause`
- [x] 确认测试版入口脚本、按钮注册与宿主页面调试暴露链路  `#diagnose-script-execution`
- [x] 修复测试版管理面板打开链路并增强诊断能力  `#fix-manager-open-and-debug`
- [ ] 将测试版重构为基于原始楼层信息的增量扫描架构，避免依赖显示DOM原始标签  `#redesign-scan-architecture`
- [ ] 验证首次仅最近窗口扫描、后续按楼层增量处理，避免高楼层聊天卡顿  `#validate-low-memory-behavior`
<!-- LIMCODE_TODO_LIST_END -->

# 故事 UI public 双环境酒馆助手脚本与咒回前端管理界面计划

## 最新结论

根据用户要求，本项目后续 **不再使用正则**。

新的技术路线为：

```text
public/story_regex_ui_test/index.js   # 测试版酒馆助手入口
public/story_regex_ui_prod/index.js   # 正式版酒馆助手入口
```

并且不再提供三个分散按钮：

- 故事UI重扫(test/prod)
- 故事UI诊断(test/prod)
- 故事UI重载资源(test/prod)

而是统一为一个脚本按钮：

```text
咒回前端管理
```

点击该按钮后打开一个符合当前米白/暗色视觉风格的管理设置界面。该界面包含：

1. 手动重扫。
2. 诊断信息。
3. 重载当前环境资源。
4. 日夜模式切换。
5. 当前环境状态：测试版 / 正式版。
6. 已加载模块状态。
7. 当前主题状态。

## 回答关键架构问题

### 还需要正则吗？

不需要。

旧方案中的正则只是为了把脚本插入消息：

```html
<script src=".../story_regex_ui_test/loader.js?v=test"></script>
```

但消息内 `<script>` 在酒馆显示层里可能被清理、转义或不执行，因此该路径不稳定。

新方案中，脚本加载由酒馆助手入口 `index.js` 负责：

```text
酒馆助手启用 public/story_regex_ui_test/index.js 或 public/story_regex_ui_prod/index.js
  -> index.js 加载同目录 loader.js
  -> loader.js 加载 shared.css、core、modules
  -> index.js 监听消息渲染事件并触发扫描
  -> scanner 渲染 <StatusPlaceHolderImpl/>、<bp_panel>、变量更新块
```

因此：

- 不再需要 `故事UI统一引导正则-测试版`。
- 不再需要 `故事UI统一引导正则-正式版`。
- 相关文档只保留历史说明或迁移说明，不能再指导用户导入正则。

## COAT 关联检查

### 技术上下文联想

1. 当前已有双目录资源：
   - `public/story_regex_ui_test/loader.js`
   - `public/story_regex_ui_test/shared.css`
   - `public/story_regex_ui_test/core/**`
   - `public/story_regex_ui_test/modules/**`
   - `public/story_regex_ui_prod/loader.js`
   - `public/story_regex_ui_prod/shared.css`
   - `public/story_regex_ui_prod/core/**`
   - `public/story_regex_ui_prod/modules/**`
2. 现有 `loader.js` 可通过 `document.currentScript` 推导同目录资源，适合被同目录 `index.js` 加载。
3. 酒馆助手脚本可使用：
   - `replaceScriptButtons` 或 `appendInexistentScriptButtons`
   - `getButtonEvent`
   - `eventOn`
   - `tavern_events`
   - `retrieveDisplayedMessage`
   - `toastr`
4. 现有主题键为：
   ```text
   jjks_story_ui_theme
   ```
5. 现有主题模块 `theme.js` 已支持：
   - `getTheme()`
   - `setTheme(theme)`
   - `toggleTheme()`
   - `applyTheme(scope)`
6. 管理界面需要挂载到酒馆宿主页面 DOM，而不是消息内容中。

### 功能需求联想

1. 测试版和正式版必须完全隔离。
2. 测试版入口只加载 `story_regex_ui_test/**`。
3. 正式版入口只加载 `story_regex_ui_prod/**`。
4. 单按钮“咒回前端管理”打开管理界面。
5. 管理界面视觉需要贴合故事 UI 的米白/暗色风格。
6. 日夜模式切换迁移到管理界面中，模块卡片内原有主题按钮后续可保留或逐步隐藏，但管理界面应成为主入口。
7. 管理界面不保存正文内容，只读写主题与少量 UI 设置。

### 边界情况联想

1. loader 尚未加载时打开管理界面：界面应显示“资源未就绪”，并提供加载/重载按钮。
2. loader 加载失败：显示错误提示，不破坏消息正文。
3. test/prod 同时启用：需要提示用户不要同时启用，并在界面中显示当前环境标识。
4. 消息中占位符被解析为未知元素：`mvu-status` 需要兼容元素检测。
5. 变量更新块误识别整楼：`variable-update` 需要收窄检测范围。
6. 多次打开管理界面：复用同一个 DOM，不重复创建多个面板。

## 候选方案

### 方案 1：继续正则注入脚本

```text
方案 1: 正则注入 loader
├── 实现路径:
│   - 保留原正则注入 <script>
│   - 调整 URL 或作用范围
├── 技术栈选择:
│   - 酒馆正则
│   - public loader.js
├── 开发工作量预估:
│   - 核心代码量：0-20 行
│   - 调试时间：0.5 小时
└── 风险点:
    - 消息内 script 不执行
    - 无法提供稳定管理界面
    - 与用户“不再使用正则”要求冲突
```

结论：淘汰。

### 方案 2：public 双目录 index.js + 原生 DOM 管理界面

```text
方案 2: public 双环境入口 + 原生 JS 管理界面
├── 实现路径:
│   - public/story_regex_ui_test/index.js
│   - public/story_regex_ui_prod/index.js
│   - 每个 index.js 加载同目录 loader.js
│   - 使用原生 DOM 创建“咒回前端管理”弹窗/面板
│   - 面板内提供重扫、诊断、重载资源、日夜切换
├── 技术栈选择:
│   - 原生 JavaScript
│   - 酒馆助手全局 API
│   - 现有 StoryRegexUI theme/scanner/registry
│   - 管理界面 CSS 由 index.js 注入宿主 head
├── 开发工作量预估:
│   - index.js：220-360 行/环境，可复制后改配置
│   - 样式：120-220 行，可内嵌注入
│   - 集成调试：1.5-3 小时
└── 风险点:
    - 需要确保不重复创建按钮/弹窗/style
    - 需要处理 loader 未就绪时的状态显示
    - 需要避免 test/prod 同时启用冲突
```

结论：推荐。

### 方案 3：public 双目录 index.js + Vue 管理界面

```text
方案 3: public 双环境入口 + Vue 管理界面
├── 实现路径:
│   - 使用 Vue 创建设置界面
│   - 构建输出到 public/test 与 public/prod
│   - index.js 挂载 Vue App
├── 技术栈选择:
│   - Vue
│   - webpack 构建
│   - 酒馆助手 API
├── 开发工作量预估:
│   - Vue 组件：200-400 行
│   - 构建配置：中等
│   - 集成调试：3-5 小时
└── 风险点:
    - 当前要求入口直接位于 public，构建链会增加复杂度
    - 对一个管理面板来说偏重
    - 测试版/正式版产物同步流程更复杂
```

结论：后续可升级，当前不采用。

## 评分详情

| 方案 | 架构合理性 | 实现复杂度 | 可维护性 | 性能表现 | 兼容性覆盖 | 环境隔离 | UI 可控性 | 总评 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 方案 1：正则注入脚本 | 1 | 5 | 1 | 2 | 1 | 2 | 1 | 淘汰 |
| 方案 2：public index + 原生管理界面 | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 推荐 |
| 方案 3：public index + Vue 管理界面 | 4 | 2 | 5 | 4 | 5 | 5 | 5 | 后续可选 |

## 约束检查

| 约束 | 方案 2 结果 |
|---|---|
| 符合酒馆插件开发规范 | 通过 |
| 不使用正则 | 通过 |
| 不引入外部高危依赖 | 通过 |
| 测试版/正式版隔离 | 通过 |
| 不写回聊天正文 | 通过 |
| 内存使用合理 | 通过 |
| 可维护性 | 通过 |
| 米白/暗色风格统一 | 通过 |

## 回溯记录

- 方案 1 被淘汰：与“不再使用正则”要求冲突，且消息内 script 不可靠。
- 方案 3 暂缓：Vue 管理界面适合后续复杂配置页，但当前 public 原生入口更快、更独立、更少构建链干扰。
- 最终采用方案 2。

## 最终技术方案

### 目录结构

```text
public/story_regex_ui_test/
  index.js                 # 测试版酒馆助手入口与管理界面
  loader.js
  shared.css
  core/
    dom.js
    registry.js
    scanner.js
    theme.js
  modules/
    variable-update/
    mvu-status/
    bp-panel/

public/story_regex_ui_prod/
  index.js                 # 正式版酒馆助手入口与管理界面
  loader.js
  shared.css
  core/
    dom.js
    registry.js
    scanner.js
    theme.js
  modules/
    variable-update/
    mvu-status/
    bp-panel/
```

### index.js 职责

每个环境的 `index.js` 负责：

1. 定义环境配置：
   - 测试版：`ENV = 'test'`、`VERSION = 'test'`
   - 正式版：`ENV = 'prod'`、`VERSION = '1.0.0'`
2. 推导同目录 `loader.js` 地址。
3. 加载同目录 `loader.js`。
4. 注册单个脚本按钮：`咒回前端管理`。
5. 点击按钮后打开管理界面。
6. 监听酒馆消息事件并自动扫描。
7. 管理界面中提供：
   - 当前环境状态。
   - 当前资源加载状态。
   - 当前主题状态。
   - 手动重扫。
   - 诊断刷新。
   - 重载当前环境资源。
   - 日夜模式切换。

### 管理界面设计

管理界面使用原生 DOM 创建，挂载到 `document.body`。

建议结构：

```html
<div class="jjks-manager-mask" data-open="true">
  <section class="jjks-manager-panel story-ui-day|story-ui-night">
    <header class="jjks-manager-head">
      <div>
        <span class="jjks-manager-eyebrow">Jujutsu Kaisen Frontend</span>
        <h2>咒回前端管理</h2>
      </div>
      <button data-jjks-manager-close>×</button>
    </header>

    <main class="jjks-manager-body">
      <section class="jjks-manager-card">
        <h3>运行状态</h3>
        <dl>
          <div><dt>当前环境</dt><dd>test/prod</dd></div>
          <div><dt>资源状态</dt><dd>已加载/未加载/失败</dd></div>
          <div><dt>模块数量</dt><dd>3</dd></div>
          <div><dt>主题</dt><dd>day/night</dd></div>
        </dl>
      </section>

      <section class="jjks-manager-card">
        <h3>主题</h3>
        <button data-jjks-theme="day">米白模式</button>
        <button data-jjks-theme="night">暗色模式</button>
      </section>

      <section class="jjks-manager-card">
        <h3>维护工具</h3>
        <button data-jjks-action="scan">手动重扫</button>
        <button data-jjks-action="diagnose">刷新诊断</button>
        <button data-jjks-action="reload">重载资源</button>
      </section>

      <section class="jjks-manager-card jjks-manager-log">
        <h3>诊断信息</h3>
        <pre></pre>
      </section>
    </main>
  </section>
</div>
```

### 米白 / 暗色风格要求

管理界面应复用故事 UI 的视觉语言：

#### 米白模式

- 背景：暖米白、浅金、低饱和浅棕。
- 边框：半透明金棕色。
- 阴影：柔和浅棕阴影。
- 标题：深棕 / 墨色。
- 强调：金色、琥珀色。

#### 暗色模式

- 背景：深蓝黑、暗紫黑、终端风格渐变。
- 边框：蓝紫 / 金色微光。
- 阴影：暗色辉光。
- 标题：浅金 / 冷白。
- 强调：蓝紫、金色。

管理界面主题来源：

```text
localStorage['jjks_story_ui_theme']
```

切换时调用：

```js
window.StoryRegexUI?.theme?.setTheme?.('day')
window.StoryRegexUI?.theme?.setTheme?.('night')
```

如果 `StoryRegexUI.theme` 尚未加载，则先直接写入 localStorage，待 loader 初始化后再同步。

## 数据流设计

```text
用户启用 public/story_regex_ui_test/index.js 或 public/story_regex_ui_prod/index.js
  -> index.js 注册“咒回前端管理”按钮
  -> index.js 加载同目录 loader.js
  -> loader.js 加载 core/modules/style
  -> index.js 监听消息渲染事件
  -> 新消息/编辑/swipe/加载更多触发 queueScan
  -> scanner 扫描消息 DOM
  -> 模块局部渲染故事 UI

用户点击“咒回前端管理”
  -> 打开管理面板
  -> 读取环境、loader、registry、theme、DOM 数量
  -> 显示诊断信息
  -> 用户切换日夜
  -> 写入 jjks_story_ui_theme
  -> 调用 StoryRegexUI.theme.setTheme
  -> 所有 story-ui-root 与管理面板同步主题
```

## 接口定义

### 酒馆助手按钮

只注册一个按钮：

```js
replaceScriptButtons([{ name: '咒回前端管理', visible: true }]);
eventOn(getButtonEvent('咒回前端管理'), openManager);
```

如考虑避免覆盖其他脚本按钮，可改用：

```js
appendInexistentScriptButtons([{ name: '咒回前端管理', visible: true }]);
```

### 入口内部接口

```js
ensureLoader(): Promise<void>
queueScan(scope?: Document | Element): void
openManager(): void
closeManager(): void
renderManager(): HTMLElement
refreshManagerState(): void
diagnose(): Record<string, unknown>
reloadResources(): Promise<void>
setTheme(theme: 'day' | 'night'): void
```

## 实现步骤

### 步骤 1：移除正则依赖结论

- 不再创建或维护引导正则作为启用方式。
- 将原测试版/正式版正则文档改为“历史方案/已废弃说明”或从启用说明中移除。
- 项目文档明确：启用入口是 public 双目录 `index.js`。

### 步骤 2：创建测试版入口

创建：

```text
public/story_regex_ui_test/index.js
```

配置：

```js
const ENV = 'test';
const VERSION = 'test';
const DISPLAY_ENV = '测试版';
```

加载：

```js
loader.js?v=test
```

### 步骤 3：创建正式版入口

创建：

```text
public/story_regex_ui_prod/index.js
```

配置：

```js
const ENV = 'prod';
const VERSION = '1.0.0';
const DISPLAY_ENV = '正式版';
```

加载：

```js
loader.js?v=1.0.0
```

### 步骤 4：实现资源加载与去重

- 使用 `document.currentScript.src` 推导 `baseUrl`。
- `ensureLoader()` 注入同目录 `loader.js`。
- 使用 `data-jjks-story-ui-loader="test|prod"` 标记。
- 如果检测到另一个环境已启用，在管理界面中给出警告。

### 步骤 5：实现自动扫描

监听事件：

```text
APP_READY
USER_MESSAGE_RENDERED
CHARACTER_MESSAGE_RENDERED
MESSAGE_UPDATED
MESSAGE_EDITED
MESSAGE_SWIPED
MORE_MESSAGES_LOADED
CHAT_CHANGED
```

策略：

- 有 message_id：扫描对应楼层。
- 无 message_id：扫描 document。
- 使用 `requestAnimationFrame` 合批。

### 步骤 6：注册单按钮

只注册：

```text
咒回前端管理
```

点击后：

1. 确保管理界面 DOM 已创建。
2. 刷新状态。
3. 显示面板。

### 步骤 7：实现管理界面 UI

界面包含四个区域：

1. **运行状态**
   - 环境：测试版/正式版。
   - 入口版本。
   - loader 状态。
   - 模块列表。
   - story-ui-root 数量。
2. **主题设置**
   - 米白模式。
   - 暗色模式。
   - 当前主题提示。
3. **维护工具**
   - 手动重扫。
   - 刷新诊断。
   - 重载资源。
4. **诊断详情**
   - JSON 或文本形式显示。
   - 可复制到控制台排查。

### 步骤 8：实现管理界面样式注入

- `index.js` 注入一个 `<style data-jjks-manager-style="test|prod">`。
- 类名前缀统一使用 `jjks-manager-`。
- 不使用无前缀 `.card`、`.panel`、`.content`。
- 主题类：
  - `.jjks-manager-day`
  - `.jjks-manager-night`

### 步骤 9：实现日夜切换

点击管理界面主题按钮：

1. 写入 `localStorage.setItem('jjks_story_ui_theme', theme)`。
2. 如 `window.StoryRegexUI.theme.setTheme` 可用，则调用。
3. 调用 `window.StoryRegexUI.theme.applyTheme(document)`。
4. 更新管理界面自身主题类。
5. 刷新状态文本。

### 步骤 10：实现资源重载

重载当前环境资源时：

1. 移除当前环境由 index 注入的 loader script。
2. 如可行，调用 `StoryRegexUI.scanner.destroy()`。
3. 清理当前环境加载标记。
4. 重新调用 `ensureLoader()`。
5. 重新扫描页面。
6. 刷新诊断。

注意：重载不应删除消息 DOM 中已经渲染的 UI，除非后续实现可逆渲染。首版可只重新加载未加载/新资源并重新扫描未处理节点。

### 步骤 11：补强模块兼容性

- `mvu-status` 增加未知元素 `<statusplaceholderimpl>` 检测。
- `variable-update` 收窄检测范围，避免整楼误替换。

### 步骤 12：更新文档

更新项目文档：

- `plans/故事UI统一外置渲染器项目文档.md`
- 原正则说明文件改为废弃说明或迁移说明。

说明新的启用方式：

```text
测试用户启用：public/story_regex_ui_test/index.js
正式用户启用：public/story_regex_ui_prod/index.js
```

## 关键伪代码

```js
(() => {
  const CONFIG = {
    env: 'test',
    displayEnv: '测试版',
    version: 'test',
    themeKey: 'jjks_story_ui_theme',
    globalKey: 'StoryRegexUI',
    buttonName: '咒回前端管理',
  };

  const currentScript = document.currentScript;
  const baseUrl = currentScript?.src ? new URL('.', currentScript.src).href : './';

  function toUrl(path) {
    const url = new URL(path, baseUrl);
    url.searchParams.set('v', CONFIG.version);
    return url.href;
  }

  async function ensureLoader() {
    if (window[CONFIG.globalKey]?.scanner) return;

    const src = toUrl('loader.js');
    const existed = document.querySelector(`script[data-jjks-story-ui-loader="${CONFIG.env}"]`);
    if (existed) return;

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.jjksStoryUiLoader = CONFIG.env;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`loader 加载失败: ${src}`));
      document.head.appendChild(script);
    });
  }

  let scanQueued = false;
  function queueScan(scope = document) {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(async () => {
      scanQueued = false;
      await ensureLoader();
      window[CONFIG.globalKey]?.scanner?.scan?.(scope);
      refreshManagerState();
    });
  }

  function setTheme(theme) {
    localStorage.setItem(CONFIG.themeKey, theme);
    const themeApi = window[CONFIG.globalKey]?.theme;
    if (themeApi?.setTheme) {
      themeApi.setTheme(theme);
    } else {
      document.querySelectorAll('.story-ui-root').forEach(root => {
        root.classList.toggle('story-ui-night', theme === 'night');
        root.classList.toggle('story-ui-day', theme !== 'night');
        root.dataset.storyUiTheme = theme;
      });
    }
    applyManagerTheme(theme);
    refreshManagerState();
  }

  function openManager() {
    ensureManagerDom();
    refreshManagerState();
    document.querySelector('[data-jjks-manager-root]').dataset.open = 'true';
  }

  appendInexistentScriptButtons?.([{ name: CONFIG.buttonName, visible: true }]);
  eventOn?.(getButtonEvent(CONFIG.buttonName), openManager);

  eventOn?.(tavern_events.APP_READY, () => queueScan(document));
  eventOn?.(tavern_events.CHARACTER_MESSAGE_RENDERED, id => queueScan(retrieveDisplayedMessage(id)?.[0] || document));
  eventOn?.(tavern_events.USER_MESSAGE_RENDERED, id => queueScan(retrieveDisplayedMessage(id)?.[0] || document));
  eventOn?.(tavern_events.MESSAGE_UPDATED, id => queueScan(retrieveDisplayedMessage(id)?.[0] || document));
  eventOn?.(tavern_events.MESSAGE_EDITED, id => queueScan(retrieveDisplayedMessage(id)?.[0] || document));
  eventOn?.(tavern_events.MESSAGE_SWIPED, id => queueScan(retrieveDisplayedMessage(id)?.[0] || document));
  eventOn?.(tavern_events.MORE_MESSAGES_LOADED, () => queueScan(document));
  eventOn?.(tavern_events.CHAT_CHANGED, () => setTimeout(() => queueScan(document), 300));

  ensureLoader().then(() => queueScan(document)).catch(console.error);
})();
```

## 测试策略

### 测试版验证

1. 启用 `public/story_regex_ui_test/index.js`。
2. 确认只出现一个脚本按钮：`咒回前端管理`。
3. 点击按钮后出现米白/暗色风格管理界面。
4. 确认请求路径只包含 `story_regex_ui_test/**`。
5. 点击“手动重扫”后当前楼层 UI 可重新扫描。
6. 点击“刷新诊断”后显示模块列表和 story-ui-root 数量。
7. 点击“重载资源”后测试版资源重新加载。
8. 点击“米白模式/暗色模式”后所有故事 UI 与管理面板同步主题。

### 正式版验证

1. 启用 `public/story_regex_ui_prod/index.js`。
2. 确认请求路径只包含 `story_regex_ui_prod/**`。
3. 修改测试版资源后，正式版无变化。
4. 正式版管理界面显示“正式版”。
5. 正式版版本号显示为稳定版本，例如 `1.0.0`。

### 功能验证

- `<StatusPlaceHolderImpl/>` 渲染为 MVU 状态栏。
- `<bp_panel>` 渲染为 BP 面板。
- 变量更新块渲染为变量更新卡片。
- 切换聊天、编辑消息、swipe、加载更多后自动扫描。
- 管理界面多次打开不会重复创建 DOM 或 style。
- 按 Esc 或点击遮罩可关闭界面。

### 性能测试

- 50-100 楼消息下全页扫描无明显卡顿。
- 管理界面打开/关闭不造成持续 DOM 增长。
- MutationObserver 不因管理界面自身变化触发无限扫描。

## 风险应对计划

1. **风险：test/prod 同时启用**
   - 应对：界面诊断显示另一个环境标记，提示用户只启用一个环境。
2. **风险：loader 未加载时切换主题**
   - 应对：先写入 `jjks_story_ui_theme`，loader 就绪后再 apply。
3. **风险：重载资源后旧 UI 不可逆**
   - 应对：首版重载只保证后续扫描与新楼层；如需完全重渲染，后续增加原文缓存或刷新楼层显示。
4. **风险：管理界面样式污染酒馆页面**
   - 应对：所有类名前缀 `jjks-manager-`，style 使用 data 标记去重。
5. **风险：正式版误引用测试版**
   - 应对：所有资源 URL 均由当前 `index.js` 的 `document.currentScript` 同目录推导，不硬编码另一个环境路径。

## 交付物清单

1. 测试版入口：`public/story_regex_ui_test/index.js`
2. 正式版入口：`public/story_regex_ui_prod/index.js`
3. 管理界面样式：内置于两个入口，或后续拆为：
   - `public/story_regex_ui_test/manager.css`
   - `public/story_regex_ui_prod/manager.css`
4. 模块兼容修正：`public/story_regex_ui_test/modules/mvu-status/index.js`
5. 模块兼容修正：`public/story_regex_ui_test/modules/variable-update/index.js`
6. 文档更新：项目文档与旧正则迁移说明

## 下一步行动

1. 优先实现测试版 `public/story_regex_ui_test/index.js`。
2. 实现“咒回前端管理”单按钮与管理界面。
3. 在管理界面内接入日夜切换、重扫、诊断、重载资源。
4. 验证后复制到正式版 `public/story_regex_ui_prod/index.js`，修改环境与版本配置。
5. 更新文档，删除正则启用路径。

## 自检确认

- [x] 不再使用正则
- [x] 使用酒馆助手脚本入口
- [x] 入口位于 public 测试版/正式版双目录
- [x] 测试版更新不影响正式版用户
- [x] 三个维护按钮整合为“咒回前端管理”单按钮
- [x] 日夜模式切换放入管理界面
- [x] 管理界面符合米白/暗色风格方向
- [x] 不引入外部高危依赖
- [x] 不写回聊天正文
