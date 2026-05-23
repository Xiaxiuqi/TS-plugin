# 奶龙王一键制卡 AI 协作硬约束

> **分流说明**：本文件是奶龙王一键制卡的专项规则。任务分流判定规则位于上级目录 `../AGENTS.md`。如果当前任务是单文件级维护，应路由到 `../奶龙工具箱/`，而非本系统。

适用于本仓库内所有 AI 与人类协作者。

## 1. 项目定位

本项目是 AI 辅助角色卡项目级创作与修改系统。`prompts/` 负责制卡流程，`docs/` 负责知识资料，`projects/` 负责真实卡项目，`examples/` 负责范例，`templates/` 负责空白骨架，`output/` 只放临时产物。

奶龙王负责：

- 新建角色卡项目。
- 修改整张角色卡。
- 解包、回包、构建、发布。
- 批量修改世界书或批量处理角色卡资产。
- 整卡风格、结构、发布内容的项目级调整。

以下任务交给 `../奶龙工具箱/`：酒馆助手脚本、JS 源码、SillyTavern 资产 JSON、Quick Reply、世界书/单条条目、Regex、Completion Preset/破限、Theme、数据库模板、前端片段、STscript、Tavern Card v3 单文件识别、API Connections、MVU、Zod 与 API/格式知识库。

## 2. 目录边界

- 根目录只允许放项目入口文件：`README.md`、`AGENTS.md`、`CHANGELOG.md`、`package.json` 等。
- 禁止把角色卡 JSON、临时表格、缓存文件、打包产物直接放在根目录。
- 真实卡项目必须放在 `projects/<卡名>/`。
- 范例必须放在 `examples/`。
- 空白模板必须放在 `templates/`。
- 临时构建产物必须放在 `output/latest/` 或 `output/temp/`。

## 3. 制卡流程

- 写新卡：先读 `prompts/0-总览与启动.md`，再按阶段读取对应提示词。
- 修改已有卡：先读 `prompts/9-修改卡启动.md`。
- 进入任一阶段前，必须完成该阶段提示词与范例的前置阅读。
- 正式制作前必须先建立 todo list，并写明每一步的前置阅读文件。

## 4. 卡项目结构

每张卡使用以下结构：

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

发布调试用 PNG 角色卡采用以下约定：

- `projects/<卡名>/assets/cover.png`：发布用封面 PNG。
- `projects/<卡名>/release/<卡名>.json`：回包后的角色卡 JSON。
- `projects/<卡名>/release/<卡名>.png`：封装后的 Tavern Card PNG。
- `output/latest/<卡名>.png`：可选临时 PNG 产物。
- JSON 是内部维护与回包标准产物，PNG 是可选发布/调试封装产物。

## 5. 目录职责

- `frontend/`：人工维护的前端源码区，放 HTML、剧情推进配置、手写正则配置。
- `unpacked/regex_scripts/`：拆包得到的正则脚本 JSON，回包时以这里为准。
- `unpacked/tavern_helper/scripts/`：拆包得到的酒馆助手脚本 JSON，回包时以这里为准。
- `unpacked/extracted/frontend/`：从拆包资产中提取的辅助前端素材，不等同于 `frontend/`。
- 修改已有卡并准备回包时，优先改 `unpacked/` 下的文件；新制卡或重构源码时，才改 `frontend/`。

## 6. 修改记录

- 每次卡项目发生实质修改，应更新 `projects/<卡名>/README.md`。
- 修改过程中的执行计划与进度记录写入 `projects/<卡名>/current-plan.md`。
- 修改已有卡的拆包内容默认放在 `projects/<卡名>/unpacked/`。
- 文档、索引、规则类维护只保留当前有效规则，不强制生成额外过程记录。

## 7. 校验要求

交付前优先运行：

```powershell
npm run validate
npm run test
```

如只调整文档或目录结构，也至少运行 `npm run validate` 检查根目录和关键目录约束。

## 8. 记录分工

| 文件                              | 作用                |
| ------------------------------- | ----------------- |
| `CHANGELOG.md`                  | 工具系统、结构、脚本、提示词的变更 |
| `projects/<卡名>/README.md`       | 单张卡项目的版本与更新记录     |
| `projects/<卡名>/current-plan.md` | 当前卡项目执行计划与进度      |
