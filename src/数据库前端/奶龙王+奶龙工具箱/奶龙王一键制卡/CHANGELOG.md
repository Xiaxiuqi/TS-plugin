# Changelog

## 2026-05-07

- 新增 `tools/png-to-json.js`，支持从 SillyTavern/Tavern Card PNG 文本元数据中提取角色卡 JSON。
- 新增 `npm run png-to-json -- <角色卡PNG路径> [输出JSON路径]` 命令，默认输出到 `output/latest/<角色卡名>.json`。
- PNG 角色卡拆包流程调整为先 `png-to-json` 提取 JSON，再复用现有 `unpack-card`。
- 新增 `tools/json-to-png.js`，支持将角色卡 JSON 写入封面 PNG 的 `chara` tEXt chunk。
- 新增 `npm run json-to-png -- <角色卡JSON路径> <封面PNG路径> [输出PNG路径]` 命令，默认输出到 `output/latest/<角色卡名>.png`。
- JSON 回包后可按需封装为 Tavern Card PNG，旧 `chara` / `ccv3` / `card` / `character` 元数据会被移除。

## 2026-05-04

- 当前工作区采用 `projects/<卡名>/` 作为角色卡项目目录。
- `new-project`、`unpack-card`、`repack-card`、`validate-project` 使用本地项目路径约定。
- 拆包/回包支持正则脚本与酒馆助手脚本独立拆分。
- 校验器检查项目结构、JSON 可解析性、工具路径约定、skill 包结构与临时残留文件。
