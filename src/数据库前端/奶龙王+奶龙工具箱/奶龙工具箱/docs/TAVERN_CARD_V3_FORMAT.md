# Tavern Card v3 单文件格式速查

对应机器可检索数据库：`data/tavern-card-v3-format.json`

本文件用于奶龙工具箱识别和审查 Tavern Card v3 单文件结构。

> 边界：工具箱只做单文件识别/审查/小范围维护；解包、回包、构建、发布角色卡属于奶龙王一键制卡。

## 1. 顶层字段

| 字段 | 说明 |
| --- | --- |
| `spec` | 规范标识，v3 常见为 `chara_card_v3` |
| `spec_version` | 规范版本 |
| `data` | 角色卡主体数据 |

## 2. 常见 `data` 字段

| 字段 | 说明 |
| --- | --- |
| `name` | 角色名 |
| `description` | 角色描述 |
| `personality` | 性格 |
| `scenario` | 场景 |
| `first_mes` | 默认开场白 |
| `alternate_greetings` | 额外开场白数组 |
| `creator_notes` | 作者说明 |
| `character_book` | 内置世界书 |
| `extensions` | 扩展字段容器 |

## 3. 内嵌资产字段

| 字段 | 可能位置 | 说明 |
| --- | --- | --- |
| `character_book` | `data.character_book` | 内置世界书 |
| `regex_scripts` | `data.extensions` 或 ST 私有字段 | 角色卡内 Regex |
| `tavern_helper` | `data.extensions` | 酒馆助手脚本或相关元数据 |
| `alternate_greetings` | `data` | 多开场白 |
| `creator_notes` | `data` | 作者说明，不等同系统 prompt |

## 4. Asset preservation

审查或小改时：

- 保留未知 `extensions` 字段。
- 不因当前 schema 未列出就删除资产字段。
- 不把 `examples/` 占位内容当作真实角色卡正文。
- 不自动移动 `_inbox` 文件，不自动解包。

## 5. 与奶龙王流程边界

| 用户目标 | 路由 |
| --- | --- |
| 判断一个 JSON 是否像角色卡 | 奶龙工具箱 |
| 审查单个字段/单条 Regex/单条世界书 | 奶龙工具箱 |
| 解包角色卡 | 奶龙王一键制卡 |
| 回包/构建/发布 | 奶龙王一键制卡 |
| 批量修改世界书或整卡风格 | 奶龙王一键制卡 |
