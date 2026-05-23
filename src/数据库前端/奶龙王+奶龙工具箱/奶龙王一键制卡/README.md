# 奶龙王一键制卡

AI 辅助角色卡项目级创作、修改与构建系统。

## 项目定位

本项目负责角色卡项目级流程：

1. **写卡**：从零开始制作新角色卡项目。
2. **改卡**：围绕整张角色卡进行拆包、整理、批量修改、构建与回包。
3. **发布准备**：生成 release 产物并进行本地校验。

单文件级维护不在本系统内处理，应使用同级目录 `../奶龙工具箱/`。

## 快速分流

- 写卡 → 读取 `prompts/0-总览与启动.md`
- 修改整张卡 / 解包 / 回包 / 构建 / 发布 → 读取 `prompts/9-修改卡启动.md`
- 批量修改世界书、批量处理角色卡资产、整卡风格调整 → 使用本系统
- 只处理单个文件 → 使用 `../奶龙工具箱/`

奶龙工具箱负责的单文件范围包括：酒馆助手脚本、JS 源码、SillyTavern 资产 JSON、Quick Reply、世界书/单条条目、Regex、Completion Preset/破限、Theme、数据库模板、前端片段、STscript、Tavern Card v3 单文件识别、API Connections、MVU、Zod 与 API/格式知识库。

详细执行规则不写在 README 中，AI 执行时必须读取 `AGENTS.md` 和对应 `prompts/`。

## 目录结构

```text
奶龙王一键制卡/
├── README.md              项目入口说明
├── AGENTS.md              AI 执行硬约束
├── CHANGELOG.md           工具系统变更日志
├── package.json           npm 脚本
├── prompts/               制卡/改卡流程提示词
├── docs/                  知识资料
├── data/                  机器可读流程与能力索引
├── schemas/               格式校验 schema
├── templates/             空白模板
├── examples/              完整范例
├── projects/              真实卡项目
├── tools/                 构建、拆包、回包、校验工具
├── tests/                 最小测试入口
└── output/                临时产物
```

## 常用命令

```powershell
npm run new -- <卡名>       # 新建卡项目
npm run validate            # 校验项目结构与 JSON
npm run test                # 运行最小测试
npm run build -- <plan路径> # 根据 current-plan.yaml 构建角色卡
npm run png-to-json -- <角色卡PNG路径> [输出JSON路径]
npm run json-to-png -- <角色卡JSON路径> <封面PNG路径> [输出PNG路径]
npm run unpack-card -- <角色卡JSON路径>
npm run repack-card -- <解包目录>
```

PNG 角色卡需先提取为 JSON，再复用现有拆包流程：

```powershell
npm run png-to-json -- <角色卡PNG路径>
npm run unpack-card -- output/latest/<角色卡名>.json
```

如果 PNG 角色卡放在上级 `_inbox/` 且用户要求解包，按同样流程处理：先提取到 `output/latest/`，再解包到 `projects/<卡名>/unpacked/`。

回包后的 JSON 可按需封装为 Tavern Card PNG：

```powershell
npm run json-to-png -- projects/<卡名>/release/<卡名>.json projects/<卡名>/assets/cover.png projects/<卡名>/release/<卡名>.png
```

`json-to-png` 只负责读取 JSON、读取 PNG、删除旧 `chara` / `ccv3` / `card` / `character` 元数据、写入新的 `chara` tEXt chunk 并输出 PNG。

## 卡项目结构

真实卡项目统一放在：

```text
projects/<卡名>/
├── README.md
├── current-plan.md 或 current-plan.yaml
├── build-config.json
├── source-card.json
├── entries/
├── tables/
├── frontend/
├── assets/
├── release/
└── notes/
```

修改已有卡的拆包目录使用：

```text
projects/<卡名>/unpacked/
```

发布调试用 PNG 产物推荐使用：

```text
projects/<卡名>/
├── unpacked/
├── assets/
│   └── cover.png
└── release/
    ├── <卡名>.json
    └── <卡名>.png
```

临时 PNG 产物可放在 `output/latest/<卡名>.png`。

## 前端与拆包资产分工

- `frontend/`：人工维护的前端源码区，放 HTML、剧情推进配置、手写正则配置。
- `unpacked/regex_scripts/`：拆包得到的正则脚本 JSON，回包时以这里为准。
- `unpacked/tavern_helper/scripts/`：拆包得到的酒馆助手脚本 JSON，回包时以这里为准。
- `unpacked/extracted/frontend/`：从拆包资产中提取的辅助前端素材，不等同于 `frontend/`。
- 修改已有卡并准备回包时，优先改 `unpacked/`；新制卡或重构源码时，才改 `frontend/`。

## 文件分工

| 目录 | 作用 |
| --- | --- |
| `prompts/` | 流程提示词 |
| `docs/` | 知识资料 |
| `data/` | 机器可读索引 |
| `schemas/` | 格式约束 |
| `templates/` | 空白骨架 |
| `examples/` | 完整范例 |
| `projects/` | 真实业务项目 |
| `output/` | 临时产物，可清理 |

## 执行原则

- 根目录不放业务 JSON。
- 范例不放 `output/`，统一放 `examples/`。
- 真实项目不放根目录，统一放 `projects/<卡名>/`。
- 本地工作区独立维护，不依赖远端托管；需要历史留存时使用 `release/`、`notes/` 或用户指定的备份方式。
- 交付前优先运行 `npm run validate` 和 `npm run test`。
