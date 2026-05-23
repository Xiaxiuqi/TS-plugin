# Nailong Toolbox Skill

Nailong Toolbox Skill（奶龙工具箱 Skill）是奶龙王一键制卡的外部酒馆生态补充 skill 包。

它不接管奶龙王的写卡、改卡、拆包、回包、构建、发布、项目管理、项目内资料、项目内范例和项目内校验流程。

奶龙王已有能力继续由奶龙王自身负责：

- 制卡流程：`prompts/`
- 项目知识：`docs/`
- 项目样例：`examples/`
- 项目结构：`projects/`
- 项目校验：`tools/validate-project.js`、`tests/run.js`

本 skill 包只补充奶龙王主流程之外的单文件级酒馆生态能力：

- A/B：JS-Slash-Runner / 酒馆助手脚本与纯 JS 源码；
- C：SillyTavern 原生扩展；
- D/E：shujuku 外部调用 UI 与数据文件；
- F：SillyTavern 资产 JSON、Quick Reply、Worldbook、Worldbook Entry、Regex、Completion Preset、Theme；
- G/H：MVU 与 Zod；
- I：前端片段、消息 HTML、状态栏 HTML、Regex replaceString HTML、scoped CSS；
- J：STscript / Slash Commands / Quick Reply 脚本；
- K：Tavern Card v3 单文件识别与审查；
- L：API Connections / 后端兼容性。

## 子 Skill

```text
nailong-toolbox-skill/
├── README.md
├── registry.json
├── tavern-runtime-router/
│   ├── SKILL.md
│   └── data.md
├── tavern-api-lookup/
│   ├── SKILL.md
│   └── data/
│       └── api-index.md
├── tavern-mvu-zod/
│   ├── SKILL.md
│   └── data/
│       └── mvu-zod-index.md
├── tavern-format-examples/
│   ├── SKILL.md
│   └── examples/
│       └── examples-index.md
├── tavern-docs-helper/
│   ├── SKILL.md
│   └── docs/
│       └── docs-index.md
└── tavern-asset-validator/
    ├── SKILL.md
    ├── rules.md
    └── schemas/
        └── schema-index.md
```

## 使用原则

1. 用户需求属于奶龙王标准制卡流程时，优先走奶龙王自身 `prompts/`。
2. 用户需求属于单文件级维护或外部酒馆生态格式时，再调用本 skill 包。
3. Tavern Card v3 单文件只做识别/审查/小范围维护；解包、回包、构建、发布仍回到奶龙王主流程。
4. MVU 与 Zod 统一由 `tavern-mvu-zod/` 处理。
5. 本 skill 包输出应短、准、可执行，避免覆盖奶龙王主流程。
6. 本 skill 包只提供补充判断、速查、样例索引和检查建议，不替用户直接重写完整角色卡。
