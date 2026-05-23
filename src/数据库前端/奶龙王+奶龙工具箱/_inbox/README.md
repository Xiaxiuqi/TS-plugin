# 待处理收件箱（_inbox）

本目录是用户临时投放待处理文件的暂存区。

## 使用方式

把需要 AI 处理的文件直接放进来，AI 会读取文件、判断任务类型，并按任务边界执行对应流程。

## AI 行为规则

### 任务边界明确时

- 读取本目录下的相关文件。
- 判断每个文件的类型和对应处理方式。
- 按明确任务自动移动、就地处理、解包、回包、构建、创建项目或清理文件。
- 如果任务需要跨系统协作，按根目录分流规则进入对应系统执行。
- 如果本目录中同时存在多个文件，逐个处理并汇总结果。

### 任务边界不明确时

- 读取本目录下的所有文件。
- 判断每个文件的类型和可能处理方式。
- 向用户报告判断结果和建议的目标路径。
- 在获得明确指令前，不自动移动、解包、回包、构建、创建项目或删除文件。
- 如果本目录中同时存在多个文件，逐个报告判断结果，不要批量处理。

## 文件类型判定参考

| 文件特征 | 判定类型 | 默认路由 |
| --- | --- | --- |
| `.json` 且包含 `spec: chara_card_v3` | Tavern Card v3 / 角色卡单文件 | 识别/审查/小范围字段维护 → 奶龙工具箱；解包/回包/构建/发布 → 奶龙王一键制卡 |
| `.json` 且包含 `character_book` 且任务要求整卡处理 | 整张角色卡 | 奶龙王一键制卡 |
| `.json` 且包含 `qrList` | Quick Reply | 奶龙工具箱 |
| `.json` 且包含 `entries` | SillyTavern 世界书资产 | 奶龙工具箱；批量整卡修改 → 奶龙王一键制卡 |
| `.yaml` / `.json` 且包含 `keys`、`content`、`comment` 字段 | 世界书单条目 | 奶龙工具箱 |
| `.json` 且包含 `scriptName`、`findRegex`、`replaceString` | SillyTavern Regex 脚本 | 奶龙工具箱 |
| `.json` 且包含 `type: "script"`、`content`、`name` | 酒馆助手脚本 / JS-Slash-Runner | 奶龙工具箱 |
| `.js` 文件 | 脚本源码 | 奶龙工具箱 |
| `.json` 且包含 `sheetData` 或 `sheet_` 前缀键 | 数据库模板 | 奶龙工具箱 |
| `.json` 且包含 `prompts`、`prompt_order` | Completion Preset / 预设 / 破限文件 | 奶龙工具箱 |
| `.json` 且包含 `theme`、`custom_css` 或 UI 主题字段 | Theme / UI 主题 | 奶龙工具箱 |
| `.json` 或 `.stscript` 且包含 `/setvar`、`/getvar`、`/send`、`/trigger` 等 slash command | STscript / Quick Reply 脚本 | 奶龙工具箱 |
| `.json` 且包含 `html`、`css`、`scope_class` | 前端片段 JSON | 奶龙工具箱 |
| `.html` 文件 | 前端片段 | 奶龙工具箱 |
| API Connections、OpenAI-compatible、Claude、Gemini、OpenRouter、Kobold/Text Completion 配置或兼容性审查 | 后端/API Connections 单文件或说明 | 奶龙工具箱 |
| 无法判定 | 未知类型 | 先明确用途再处理 |

## 处理完成后

任务明确且流程完成后，本目录应保持清空状态。任务边界不明确时，先保留文件并等待进一步指令。
