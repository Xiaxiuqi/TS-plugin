# Runtime Router Data

来源：奶龙工具箱 `data/capabilities-index.json` 的运行模式抽象。

## A~L 模式

| 模式 | 名称 | 入口 / 文件形态 | 建议子 skill |
| --- | --- | --- | --- |
| A | JS-Slash-Runner Script JSON | `window.TavernHelper`；可导入脚本 JSON，代码位于 `content` | `tavern-api-lookup`、`tavern-format-examples`、`tavern-asset-validator` |
| B | JS-Slash-Runner 纯 JS 脚本 | `window.TavernHelper`；`.js` 源码 | `tavern-api-lookup`、`tavern-asset-validator` |
| C | SillyTavern 原生扩展 | `SillyTavern.getContext()`；`manifest.json` + `index.js` + `style.css` | `tavern-api-lookup`、`tavern-docs-helper`、`tavern-asset-validator` |
| D | shujuku 外部调用 UI | `window.AutoCardUpdaterAPI`；外部 UI / 工具按钮 | `tavern-api-lookup`、`tavern-format-examples`、`tavern-asset-validator` |
| E | shujuku 数据文件 | JSON 数据文件；模板 / 剧情预设 / API 预设 / UI 主题 / 正文替换 | `tavern-format-examples`、`tavern-asset-validator` |
| F | SillyTavern 资产 JSON | Quick Reply / Worldbook / Worldbook Entry / Completion Preset / Theme / Regex | `tavern-format-examples`、`tavern-docs-helper`、`tavern-asset-validator` |
| G | MVU 变量控制脚本 / [InitVar] 世界书 | `window.Mvu` + `window.TavernHelper`；MVU 脚本 / `[InitVar]` / update block | `tavern-mvu-zod`、`tavern-docs-helper`、`tavern-format-examples` |
| H | Zod 运行时校验 | 全局 `z`；zod schema 片段 | `tavern-mvu-zod`、`tavern-docs-helper` |
| I | Tavern 前端片段 | HTML/CSS snippet；消息 HTML / 状态栏 HTML / Regex replaceString HTML / scoped CSS | `tavern-format-examples`、`tavern-docs-helper`、`tavern-asset-validator` |
| J | STscript / Quick Reply 脚本 | Slash Commands / Quick Reply message；`.stscript` | `tavern-format-examples`、`tavern-docs-helper`、`tavern-asset-validator` |
| K | Tavern Card v3 单文件识别 | `spec: chara_card_v3`；单个角色卡 JSON 文件识别、审查、小范围字段维护 | `tavern-docs-helper`、`tavern-asset-validator` |
| L | API Connections / 后端兼容 | API Connections settings；OpenAI-compatible / Claude / Gemini / OpenRouter / Kobold / Text Completion | `tavern-api-lookup`、`tavern-docs-helper`、`tavern-asset-validator` |

## 奶龙王负责

- 写卡。
- 修改整张角色卡。
- 新建角色卡项目。
- 奶龙王项目结构。
- 批量修改世界书。
- 批量处理角色卡资产。
- 解包 / 回包 / 构建 / 发布。

## 奶龙工具箱负责

- 单个酒馆助手脚本。
- 单个 Regex。
- 单个 preset / 破限文件。
- Quick Reply。
- Theme。
- 世界书单条目。
- 前端片段。
- STscript。
- Tavern Card v3 单文件识别。
- API Connections 兼容性审查。
- MVU / Zod。
