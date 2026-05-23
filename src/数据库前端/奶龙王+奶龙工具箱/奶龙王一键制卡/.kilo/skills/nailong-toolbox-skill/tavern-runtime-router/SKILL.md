---
name: tavern-runtime-router
description: 酒馆生态运行模式路由 Skill。当任务超出奶龙王角色卡项目级流程，并涉及 JS-Slash-Runner、SillyTavern Extension、shujuku、SillyTavern 资产、MVU、Zod、前端片段、STscript、Tavern Card v3 单文件识别或 API Connections 时触发。
---

# Tavern Runtime Router

## 定位

本 skill 只负责判断酒馆生态运行环境与分流边界。

奶龙王已有标准流程时，不接管：

- 写角色卡；
- 修改整张角色卡；
- 解包、回包、构建、发布；
- 批量修改世界书；
- 批量处理角色卡资产；
- 奶龙王项目结构与发布流程。

上述内容优先回到奶龙王 `prompts/`、`docs/`、`examples/`、`tools/`。

## 何时使用

当用户需求出现以下单文件或外部生态关键词时使用：

- JS-Slash-Runner / 酒馆助手脚本 / `window.TavernHelper`；
- SillyTavern Extension / 原生扩展 / `manifest.json` / `SillyTavern.getContext()`；
- shujuku / 神数据库 / SP·数据库 / `window.AutoCardUpdaterAPI`；
- Quick Reply / Worldbook / Worldbook Entry / Regex / Completion Preset / Theme；
- MVU / MagVarUpdate / `[InitVar]` / `window.Mvu`；
- Zod / `z.object` / `safeParse` / schema；
- 前端片段 / HTML / scoped CSS / Regex replaceString HTML；
- STscript / Slash Commands / `/setvar` / `/getvar` / `/send`；
- Tavern Card v3 / `spec: chara_card_v3` 单文件识别；
- API Connections / OpenAI-compatible / Claude / Gemini / OpenRouter / Kobold / Text Completion。

## 输出格式

必须输出：

```text
目标类型：
运行环境：
入口对象 / 文件形态：
应走奶龙王主流程还是奶龙工具箱补充：
建议调用的子 skill：
参考资料：
混用风险：
```

## 路由表

| 目标 | 模式 | 入口对象 / 文件形态 | 建议 |
| --- | --- | --- | --- |
| 写卡 / 改整张卡 / 解包 / 回包 / 构建 / 发布 | 奶龙王主流程 | `projects/<卡名>/` / `unpacked/` | 不由本 skill 接管 |
| JS-Slash-Runner 脚本 JSON | A | `window.TavernHelper`，JSON `content` 字段 | `tavern-api-lookup` / `tavern-format-examples` |
| JS-Slash-Runner 纯 JS | B | `.js` 源码，入口 `window.TavernHelper` | `tavern-api-lookup` |
| SillyTavern 原生扩展 | C | `manifest.json` + `index.js` + `style.css`，入口 `SillyTavern.getContext()` | `tavern-api-lookup` / `tavern-docs-helper` |
| shujuku UI | D | `window.AutoCardUpdaterAPI` | `tavern-api-lookup` / `tavern-format-examples` |
| shujuku 数据文件 | E | 模板 / 剧情预设 / API 预设 JSON | `tavern-format-examples` / `tavern-asset-validator` |
| SillyTavern 资产 JSON | F | Quick Reply / Worldbook / Preset / Theme / Regex | `tavern-format-examples` / `tavern-asset-validator` |
| MVU | G | `window.Mvu`、`[InitVar]` | `tavern-mvu-zod` |
| Zod | H | `z.object`、`safeParse` | `tavern-mvu-zod` |
| 前端片段 | I | HTML/CSS snippet、scoped CSS | `tavern-format-examples` / `tavern-asset-validator` |
| STscript | J | `.stscript` 或 Quick Reply `message` 中的 slash command | `tavern-docs-helper` / `tavern-format-examples` |
| Tavern Card v3 单文件识别 | K | `spec: chara_card_v3` | 只识别/审查时用工具箱；解包/回包回奶龙王 |
| API Connections | L | 后端连接配置或兼容性说明 | `tavern-api-lookup` / `tavern-docs-helper` |

## 判断原则

1. 先判断用户需求是否已经属于奶龙王主流程。
2. 如果属于奶龙王主流程，只提示回到对应 `prompts/`，不要展开外部 skill。
3. 如果只处理单文件或外部生态对象，再判断 A~L 模式。
4. 如果同一需求混入多个生态，先指出混用风险，再建议拆分。
5. Tavern Card v3 单文件只做识别/审查/小范围维护；解包、回包、构建、发布必须回到奶龙王主流程。
6. 输出要短，重点是路由，不生成完整资产正文。
