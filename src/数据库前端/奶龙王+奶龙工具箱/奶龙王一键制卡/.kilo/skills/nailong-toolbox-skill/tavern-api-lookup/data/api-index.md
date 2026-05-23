# API Index

来源：奶龙工具箱 `data/*` 与 `docs/*` 的索引化摘要。

| ID | 名称 | 入口 | 源文件 | 用途关键词 |
| --- | --- | --- | --- | --- |
| `js-slash-runner` | JS-Slash-Runner / TavernHelper API | `window.TavernHelper` | `data/js-slash-runner-api.json`；`docs/JS_SLASH_RUNNER_API.md` | TavernHelper、getChatMessages、triggerSlash、eventOn、generate、变量读写 |
| `sillytavern-extension` | SillyTavern Extension API | `SillyTavern.getContext()` | `data/sillytavern-extension-api.json`；`docs/SILLYTAVERN_EXTENSION_API.md` | eventSource、event_types、Popup、renderExtensionTemplateAsync、registerFunctionTool、manifest.json |
| `shujuku` | shujuku / SP·数据库 II API | `window.AutoCardUpdaterAPI` | `data/shujuku-api.json`；`docs/SHUJUKU_API.md` | AutoCardUpdaterAPI、getPlotPresets、switchPlotPreset、exportTableAsJson、importTableAsJson |
| `sillytavern-assets` | SillyTavern Assets Format | SillyTavern 资产 JSON | `data/sillytavern-assets-api.json`；`docs/SILLYTAVERN_ASSETS_API.md` | Quick Reply、Worldbook、Completion Preset、Theme、Regex |
| `worldbook-entry` | Worldbook Entry Format | `keys` / `content` / `comment` | `data/worldbook-entry-api.json`；`docs/WORLDBOOK_ENTRY_API.md` | keys、secondary_keys、constant、selective、position、depth、sticky、cooldown |
| `sillytavern-regex` | SillyTavern Regex Format | `scriptName` / `findRegex` / `replaceString` | `data/sillytavern-regex-api.json`；`docs/SILLYTAVERN_REGEX_API.md` | placement、markdownOnly、promptOnly、runOnEdit、substituteRegex |
| `sillytavern-preset` | SillyTavern Completion Preset Format | `prompts` / `prompt_order` | `data/sillytavern-preset-api.json`；`docs/SILLYTAVERN_PRESET_API.md` | role、depth、jailbreak、nsfw、continue、impersonate、quiet |
| `frontend-snippets` | Tavern Frontend Snippets | HTML/CSS snippet | `data/tavern-frontend-snippets-api.json`；`docs/TAVERN_FRONTEND_SNIPPETS_API.md` | html、css、scope_class、scoped CSS、DOMPurify、replaceString HTML |
| `stscript` | SillyTavern STscript / Slash Commands | Slash Commands / Quick Reply message | `data/sillytavern-stscript-api.json`；`docs/SILLYTAVERN_STSCRIPT_API.md` | /setvar、/getvar、/if、/run、/trigger、/send、/sys、/echo、pipe |
| `tavern-card-v3` | Tavern Card v3 Single File Format | `spec: chara_card_v3` | `data/tavern-card-v3-format.json`；`docs/TAVERN_CARD_V3_FORMAT.md` | spec_version、data、character_book、extensions、regex_scripts、tavern_helper |
| `api-connections` | SillyTavern API Connections | API Connections settings | `data/sillytavern-api-connections.json`；`docs/SILLYTAVERN_API_CONNECTIONS.md` | OpenAI-compatible、Claude、Gemini、OpenRouter、Kobold、Text Completion、Function Calling |
| `mvu` | MVU / MagVarUpdate | `window.Mvu` + `window.TavernHelper` | `data/mvu-api.json`；`docs/MVU_API.md` | Mvu.events、stat_data、display_data、[InitVar] |
| `zod` | Zod runtime schema | `z` | `data/zod-api.json`；`docs/ZOD_API.md` | z.object、z.array、safeParse、discriminatedUnion、z.enum |
