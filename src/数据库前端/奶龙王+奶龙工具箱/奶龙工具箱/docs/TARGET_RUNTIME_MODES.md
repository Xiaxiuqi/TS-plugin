# 目标运行方式判定

本文件用于在写代码前判定目标运行环境，避免把 JS-Slash-Runner 脚本、SillyTavern 原生扩展、shujuku 外部调用 UI、ST 资产 JSON、前端片段与角色卡单文件识别任务混用。

## A. 酒馆助手脚本 JSON（JS-Slash-Runner 导入格式）

使用场景：

- 用户要求“做一个酒馆助手脚本”
- 需要输出可导入的 `.json`
- 代码应该放在 JSON 的 `content` 字段中

入口对象：

```js
window.TavernHelper
```

文件格式：

```json
{
  "type": "script",
  "enabled": true,
  "name": "脚本名",
  "id": "uuid",
  "content": "\n(function() { ... })();\n",
  "info": "说明",
  "button": {
    "enabled": false,
    "buttons": []
  },
  "data": {}
}
```

参考样例：

```text
examples/js-slash-runner/minimal-script.json
examples/js-slash-runner/multi-button-script.json
```

生成前检查：

- 是否只把 JS 放进 `content` 字段？
- JSON 是否可被 `JSON.parse`？
- `content` 是否保留换行？
- 是否检查 `window.TavernHelper` 可用性？
- 多按钮是否把可调用函数挂到 `window` 上？

---

## B. JS-Slash-Runner 纯 JS 脚本

使用场景：

- 用户只要 `.js` 源码
- 用本项目 `scripts/convert.js` 再打包成 `.json`

入口对象：

```js
window.TavernHelper
```

推荐结构：

```js
(function () {
    'use strict';

    const TH = window.TavernHelper;
    if (!TH) return;

    async function main() {
        const lastId = TH.getLastMessageId();
        const messages = TH.getChatMessages(`0-${lastId}`, { include_swipes: false });
    }

    main().catch(console.error);
})();
```

生成前检查：

- 是否能被 `scripts/convert.js` 打包？
- 是否避免依赖 SillyTavern 原生扩展专属 `manifest.json`？
- 是否避免把 shujuku 的 `window.AutoCardUpdaterAPI` 当成必然存在？

---

## C. SillyTavern 原生扩展

使用场景：

- 用户要求“写酒馆扩展 / 原生扩展”
- 需要 `manifest.json`、`index.js`、`style.css`
- 要替换 UI、主题、设置面板、Prompt Manager、Regex、Function Calling

入口对象：

```js
SillyTavern.getContext()
```

标准结构：

```text
extension-name/
├── manifest.json
├── index.js
└── style.css
```

参考样例：

```text
examples/sillytavern-extension/manifest.json
examples/sillytavern-extension/index.js
examples/sillytavern-extension/style.css
```

生成前检查：

- `manifest.json` 是否包含 `display_name`、`loading_order`、`js`、`css`、`version`？
- `index.js` 是否通过 `SillyTavern.getContext()` 获取上下文？
- 设置面板是否挂到 `#extensions_settings2` 或合理容器？
- CSS 是否带扩展前缀，避免污染全局？
- 插入 HTML 是否考虑 `DOMPurify`？
- 是否把 JS-Slash-Runner 的 `window.TavernHelper` 错当成原生扩展入口？

---

## D. shujuku 外部调用 UI

使用场景：

- 用户要求写“数据库 UI”
- 要调用神·数据库 / SP·数据库 II 的表格、模板、剧情推进、AI 调用
- 目标是依赖 shujuku 已加载的外部面板/脚本

入口对象：

```js
window.AutoCardUpdaterAPI
```

参考样例：

```text
examples/shujuku/external-ui.js
```

最小调用：

```js
const api = window.AutoCardUpdaterAPI;
if (!api) throw new Error('shujuku API 不可用');

const presets = api.getPlotPresetNames();
await api.updateRow('主角信息', 1, { 力量: 15 });
await api.refreshDataAndWorldbook();
```

生成前检查：

- 是否检查 `window.AutoCardUpdaterAPI`？
- 是否用 `async/await` 处理 Promise？
- 表格操作后是否需要 `refreshDataAndWorldbook()`？
- 是否区分表名和 `sheetKey`？
- 是否处理失败返回值：`false` / `null` / `-1` / `{ success:false }`？

---

## E. shujuku 数据文件：模板 / 剧情预设 / API 预设

使用场景：

- 用户要求生成 shujuku 模板
- 用户要求生成剧情推进预设
- 用户要求生成 API 预设

参考样例：

```text
examples/shujuku/minimal-template.json
examples/shujuku/plot-preset.json
examples/shujuku/api-preset.json
```

模板最小格式：

```json
{
  "mate": {
    "type": "chatSheets",
    "version": 1
  },
  "sheet_0": {
    "name": "角色状态",
    "content": [
      ["属性", "值"],
      ["生命值", "100"]
    ],
    "sourceData": {
      "headers": ["属性", "值"]
    }
  }
}
```

生成前检查：

- `mate.type` 是否为 `chatSheets`？
- 是否至少有一个 `sheet_*`？
- 每个 sheet 是否有 `name`、`content`、`sourceData`？
- `content[0]` 是否是表头？
- `sourceData.headers` 是否与表头一致？
- 剧情预设是否包含 `name` 和 `promptGroup`？
- API 预设是否避免写入真实密钥？

---

## F. SillyTavern 资产 JSON

使用场景：

- 用户要求维护快速回复、世界书、预设/破限、主题、Regex 等导入导出 JSON
- 用户只指定单个 SillyTavern 资产文件
- 用户要求审查 `prompts` / `prompt_order` / `regex` / `worldbook` 字段

入口：

```text
SillyTavern 资产 JSON
```

细分：

| 子类型 | 核心字段 | 参考 |
| --- | --- | --- |
| Quick Reply | `name`、`qrList`、`message` | `docs/SILLYTAVERN_ASSETS_API.md` |
| Worldbook | `entries`、`key`、`content` | `docs/SILLYTAVERN_ASSETS_API.md` |
| Worldbook Entry | `keys`、`content`、`comment` | `docs/WORLDBOOK_ENTRY_API.md` |
| Completion Preset | `prompts`、`prompt_order` | `docs/SILLYTAVERN_PRESET_API.md` |
| Theme | `name`、`theme` | `docs/SILLYTAVERN_ASSETS_API.md` |
| Regex | `scriptName`、`findRegex`、`replaceString` | `docs/SILLYTAVERN_REGEX_API.md` |

参考样例：

```text
examples/sillytavern-assets/
examples/worldbook-entry/
```

生成前检查：

- 是否只是单文件资产，而非整张角色卡项目？
- 是否保留未知字段以兼容 ST 新版本？
- 是否避免把长 prompt、第三方 CSS、真实正文写入 examples/data？
- Regex 是否存在灾难性回溯或 HTML 注入风险？

---

## G. MVU 变量控制脚本 / [InitVar] 世界书

使用场景：

- 用户要求维护 MVU / MagVarUpdate 变量脚本
- 用户要求生成 `[InitVar]` 世界书初始化条目
- 用户要求读写 `stat_data`、`display_data` 或监听 `Mvu.events`

入口对象：

```js
window.Mvu
window.TavernHelper
```

参考样例：

```text
examples/mvu/initvar-format.json
examples/mvu/mvu-script.json
examples/mvu/update-block-format.txt
```

生成前检查：

- 是否等待 `waitGlobalInitialized('Mvu')`？
- 是否区分 `stat_data` 与 `display_data`？
- 是否保留 [value, desc] 叶子结构？
- 是否避免把 MVU 当成 SillyTavern 原生扩展？

---

## H. Zod 运行时校验

使用场景：

- 用户要求为 LLM 输出、工具参数、配置加 runtime schema
- 用户要求在 JS-Slash-Runner / MVU 里校验 JSON 或变量结构

入口：

```js
z
```

参考样例：

```text
examples/zod/zod-schema-snippets.js
```

生成前检查：

- 是否优先使用 `safeParse` 避免脚本崩溃？
- 是否用 `z.object`、`z.array`、`z.enum` 等稳定 API？
- 是否不把密钥/敏感字段写入样例？

---

## I. Tavern 前端片段

使用场景：

- 用户要求消息内 HTML、状态栏 HTML、开场白 HTML
- 用户要求 Regex `replaceString` HTML
- 用户要求 scoped CSS、折叠面板、按钮组、剧情推进面板骨架

入口：

```text
HTML/CSS snippet
```

参考样例：

```text
examples/frontend-snippets/status-panel.json
examples/frontend-snippets/regex-replace-html.json
```

生成前检查：

- CSS 是否以唯一根类 scoped？
- 是否移动端适配，避免固定大宽度？
- 是否禁止 `<script>`、`onerror`、`onclick`？
- 插入真实 DOM 前是否考虑 `DOMPurify.sanitize`？

---

## J. STscript / Quick Reply 脚本

使用场景：

- 用户要求写 STscript、slash command 流程或 Quick Reply 按钮命令
- 使用 `/setvar`、`/getvar`、`/if`、`/run`、`/trigger`、`/send`、`/sys`、`/echo`

入口：

```text
Slash Commands / Quick Reply message
```

参考样例：

```text
examples/stscript/quick-reply-command.json
examples/stscript/basic-flow.stscript
```

生成前检查：

- 命令是否会发送消息、改变量或触发生成？
- pipe 传值是否只做简单逻辑？
- 复杂 DOM、异步请求、状态管理是否应改用 JS-Slash-Runner？
- Quick Reply message 是否含真实密钥或长 prompt？

---

## K. Tavern Card v3 单文件识别

使用场景：

- 用户要求判断一个 JSON 是否是角色卡
- 用户只要求审查单个 Tavern Card v3 文件的某个字段
- 文件包含 `spec: chara_card_v3`、`data`、`character_book`、`extensions` 等字段

入口：

```text
spec: chara_card_v3
```

边界：

- 单文件识别/审查 → 奶龙工具箱。
- 解包、回包、构建、发布、批量整卡修改 → 奶龙王一键制卡。
- `_inbox` 文件必须先报告判断结果并等待确认。

---

## L. API Connections / 后端兼容

使用场景：

- 用户要求审查 OpenAI-compatible、Claude、Gemini、OpenRouter、Kobold/Text Completion 兼容性
- 用户要求判断 preset 是否适配 function calling、stop strings、streaming、上下文长度

入口：

```text
SillyTavern API Connections settings
```

生成/审查前检查：

- 是否包含真实 API key、cookie、token？若有，不写入仓库。
- preset 的 role/prompt_order 是否适配目标后端？
- Function Calling 是否被目标后端支持？
- Text Completion 是否需要 Advanced Formatting 而非 Chat Completion Prompt Manager？

---

## 快速判定表

| 用户目标 | 应选模式 | 入口 |
| --- | --- | --- |
| 可导入酒馆助手脚本 JSON | A | `window.TavernHelper` |
| 只写酒馆助手 JS 源码 | B | `window.TavernHelper` |
| 写 ST 原生扩展 | C | `SillyTavern.getContext()` |
| 写神·数据库联动 UI | D | `window.AutoCardUpdaterAPI` |
| 生成 shujuku 模板/预设数据 | E | JSON 数据文件 |
| 维护 ST 资产 JSON | F | SillyTavern 资产 JSON |
| 维护 MVU 变量脚本/InitVar | G | `window.Mvu` + `window.TavernHelper` |
| 写 zod 运行时 schema | H | 全局 `z` |
| 写前端 HTML/CSS 片段 | I | HTML/CSS snippet |
| 写 STscript/Quick Reply 命令 | J | Slash Commands |
| 识别 Tavern Card v3 单文件 | K | `spec: chara_card_v3` |
| 审查 API Connections 兼容 | L | 后端连接设置 |

## 生成时必须先回答的问题

每次写代码前先确定：

1. 目标模式是 A~L 哪一个？
2. 输出文件类型是 `.json`、`.js`、`.stscript`、`manifest.json`、`style.css`、HTML/CSS 片段还是数据模板？
3. 是否只是单文件任务，还是已经触及整卡流程？
4. 是否需要同时生成人类文档和机器数据库？
5. 是否需要同步对应的人类文档、机器数据库、示例和校验规则？

未明确时，优先从用户措辞判断：

- “酒馆助手脚本 / JS-Slash-Runner / TavernHelper” → A 或 B
- “酒馆扩展 / SillyTavern 扩展 / 主题 / Prompt Manager / Regex” → C 或 F
- “数据库 UI / 神·数据库 / shujuku / AutoCardUpdaterAPI” → D
- “模板 / 剧情预设 / API 预设” → E
- “世界书单条目 / 正则 / 预设 / 破限 / 快速回复” → F
- “MVU / stat_data / display_data / [InitVar]” → G
- “zod / safeParse / schema 校验” → H
- “前端片段 / HTML / scoped CSS / 状态栏” → I
- “STscript / slash command / Quick Reply 命令” → J
- “chara_card_v3 / 角色卡单文件” → K（若要求解包/回包则转奶龙王）
- “API Connections / OpenRouter / Claude / Gemini / Text Completion” → L
