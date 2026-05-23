# 奶龙工具箱

单文件级酒馆生态维护工具箱，负责酒馆助手脚本、SillyTavern 正则与资产、预设/破限、数据库模板、世界书单条目、前端片段、STscript、Tavern Card v3 单文件识别和 API 知识库的生成、校验与维护。

其中 `projects/聊天记录导出工具/` 是当前已纳入版本管理的脚本项目；根目录工具链同时服务于 examples、schemas、data、docs 与 projects 下的其他脚本或资产。

## 目录结构

```
奶龙工具箱/
├── README.md            本说明文档
├── package.json         项目元信息（含 npm script）
├── scripts/
│   ├── convert.js               JSON ↔ JS 双向转换工具
│   ├── new.js                   根据 examples 生成新文件/扩展骨架
│   ├── cli.js                   交互式生成器
│   ├── validate-examples.js     校验 examples/data/schemas 格式
│   ├── check-api-references.js  交叉引用检查：examples 中 API 名是否存在于 data/*-api.json
│   └── lib/schema-validator.js  轻量 JSON Schema 校验器
├── tests/
│   ├── fixtures/invalid/        故意写错的负例
│   ├── negative.test.js         负例测试
│   ├── tools.test.js            工具脚本闭环测试
│   └── run.js                   统一测试入口
├── examples/
│   ├── js-slash-runner/       酒馆助手脚本 JSON 样例
│   ├── sillytavern-extension/ SillyTavern 原生扩展样例
│   ├── sillytavern-assets/    快速回复/世界书/预设/主题/正则格式样例
│   ├── worldbook-entry/       世界书单条目样例
│   ├── frontend-snippets/     消息 HTML/状态栏/Regex replaceString 片段样例
│   ├── stscript/              STscript / Quick Reply 命令样例
│   ├── shujuku/               shujuku 模板/预设/UI 调用样例
│   ├── mvu/                   MVU [InitVar] 世界书 / MVU 脚本样例
│   └── zod/                   Zod schema 片段
├── schemas/                examples 格式校验用 JSON Schema
├── data/
│   ├── js-slash-runner-api.json              JS-Slash-Runner API 数据库
│   ├── sillytavern-extension-api.json        SillyTavern 扩展开发 API 数据库
│   ├── sillytavern-assets-api.json           SillyTavern 资产总知识库
│   ├── worldbook-entry-api.json              世界书单条目知识库
│   ├── sillytavern-regex-api.json            SillyTavern Regex 专项知识库
│   ├── sillytavern-preset-api.json           预设/破限知识库
│   ├── tavern-frontend-snippets-api.json     前端片段知识库
│   ├── sillytavern-stscript-api.json         STscript / Slash Commands 知识库
│   ├── tavern-card-v3-format.json            Tavern Card v3 单文件格式知识库
│   ├── sillytavern-api-connections.json      API Connections / 后端兼容知识库
│   ├── shujuku-api.json                      shujuku 外部调用 API 数据库
│   ├── mvu-api.json                          MVU（MagVarUpdate）API 数据库
│   ├── zod-api.json                          Zod API 数据库
│   └── capabilities-index.json               A~L 十二模式机读能力清单
├── docs/
│   ├── JS_SLASH_RUNNER_API.md                JS-Slash-Runner API 速查文档
│   ├── SILLYTAVERN_EXTENSION_API.md          SillyTavern 扩展开发 API 速查文档
│   ├── SILLYTAVERN_ASSETS_API.md             SillyTavern 资产总览
│   ├── WORLDBOOK_ENTRY_API.md                世界书单条目字段映射
│   ├── SILLYTAVERN_REGEX_API.md              Regex 字段与风险
│   ├── SILLYTAVERN_PRESET_API.md             预设/破限格式与兼容性
│   ├── TAVERN_FRONTEND_SNIPPETS_API.md       前端片段与 XSS 注意事项
│   ├── SILLYTAVERN_STSCRIPT_API.md           STscript / Slash Commands 速查
│   ├── TAVERN_CARD_V3_FORMAT.md              Tavern Card v3 单文件识别
│   ├── SILLYTAVERN_API_CONNECTIONS.md        API Connections / 后端兼容
│   ├── SHUJUKU_API.md                        shujuku / 神·数据库 API 调用接口文档
│   ├── MVU_API.md                            MVU 变量框架脚本 API 速查
│   ├── ZOD_API.md                            Zod 语法/校验速查
│   ├── TARGET_RUNTIME_MODES.md               目标运行方式判定与格式检查
│   └── INDEX.md                              docs 索引
├── projects/
│   └── 聊天记录导出工具/
│       ├── README.md                       脚本级总览 + 当前版本 + 完整更新日志
│       ├── latest/                         最新版（仅一个版本，只放脚本文件）
│       │   ├── 酒馆助手脚本-聊天记录导出 v6.0.2.json
│       │   └── 聊天记录导出工具 v6.0.2.js
│       └── archive/                        历史版本（v3.7 ~ v6.0.1）
│           ├── v3.7/酒馆助手脚本-聊天记录导出 v3.7.json
│           └── ...
└── AGENTS.md            AI 协作硬约束
```

> 所有脚本仓库遵守 `docs/SCRIPT_VERSIONING.md`：每个脚本一个文件夹，`projects/<脚本名>/README.md` 是唯一脚本级更新日志位置；修改前必须按本地发布流程保留上一版文件。

- `projects/<脚本名>/latest/` 中的 JSON 可直接被酒馆助手导入；同名 `.js` 是 JSON 内 `content` 字段反序列化后的纯 JS 源码，便于阅读与版本对比。
- `projects/<脚本名>/archive/v<X>/` 是只读历史版本，修改脚本时不能反向写入。
- 修改脚本的标准流程定义在 `docs/SCRIPT_VERSIONING.md`；AI 须遵守 `AGENTS.md` 的硬约束。
- `data/js-slash-runner-api.json` 与 `docs/JS_SLASH_RUNNER_API.md` 记录 JS-Slash-Runner API。
- `data/sillytavern-extension-api.json` 与 `docs/SILLYTAVERN_EXTENSION_API.md` 记录 SillyTavern 原生扩展开发 API。
- `data/sillytavern-assets-api.json` 与 `docs/SILLYTAVERN_ASSETS_API.md` 汇总 Quick Reply、Worldbook、Completion Preset、Theme、Regex 资产格式。
- `data/worldbook-entry-api.json` 与 `docs/WORLDBOOK_ENTRY_API.md` 记录单条世界书字段及 YAML/ST JSON 映射。
- `data/sillytavern-regex-api.json` 与 `docs/SILLYTAVERN_REGEX_API.md` 记录 Regex 字段边界、作用域和安全风险。
- `data/sillytavern-preset-api.json` 与 `docs/SILLYTAVERN_PRESET_API.md` 记录预设/破限格式、prompt_order 与后端差异。
- `data/tavern-frontend-snippets-api.json` 与 `docs/TAVERN_FRONTEND_SNIPPETS_API.md` 记录前端片段、scoped CSS 与 DOMPurify/XSS 注意事项。
- `data/sillytavern-stscript-api.json` 与 `docs/SILLYTAVERN_STSCRIPT_API.md` 记录 STscript / Slash Commands / Quick Reply 命令。
- `data/tavern-card-v3-format.json` 与 `docs/TAVERN_CARD_V3_FORMAT.md` 记录 Tavern Card v3 单文件识别边界。
- `data/sillytavern-api-connections.json` 与 `docs/SILLYTAVERN_API_CONNECTIONS.md` 记录 API Connections 与后端兼容性。
- `data/shujuku-api.json` 与 `docs/SHUJUKU_API.md` 记录 shujuku（神·数据库 / SP·数据库 II）的 `window.AutoCardUpdaterAPI` 外部调用接口。
- `data/mvu-api.json` 与 `docs/MVU_API.md` 记录 MagVarUpdate（MVU）变量框架的事件、运行时 API 与脚本控制变量的模式。
- `data/zod-api.json` 与 `docs/ZOD_API.md` 记录 zod 在酒馆生态中的语法、类型、组合与校验。
- `docs/TARGET_RUNTIME_MODES.md` 规定写代码前如何判定 A~L 目标运行方式，避免混用脚本、扩展、资产和整卡流程。
- `examples/` 提供可直接套用的最小样例库。
- `schemas/` 提供 `examples/` 的格式校验规则。
- `scripts/new.js` 可从样例生成新脚本、扩展或资产 JSON。
- `scripts/validate-examples.js` 可校验所有样例、schema 和 API 数据库。

## 一页交互

```powershell
npm run cli           # 交互式：选模式 → 选模板 → 输名字 → 自动校验
npm run new -- --help # 查看可生成类型
npm run validate      # 校验 examples / schemas / data
npm run check-refs    # examples 中 API 是否都能在 data 中查到
npm run test          # 运行负例与工具脚本闭环测试
npm run convert       # JSON ↔ JS
npm run help          # 转换工具帮助
```

## 转换工具

转换的本质：酒馆助手脚本 JSON 的整体结构（`type` / `name` / `id` / `info` / `button` / `data` 等）保持不变，**只在 `content` 字段与同名 `.js` 文件之间双向同步**。

### 直接调用

```powershell
# JSON → JS（解包 content 字段）
node scripts/convert.js "projects/聊天记录导出工具/latest/酒馆助手脚本-聊天记录导出 v6.0.2.json"

# JS → JSON（自动从 projects 中查同版本 metadata）
node scripts/convert.js "projects/聊天记录导出工具/latest/聊天记录导出工具 v6.0.2.js"
```

### 通过 npm script

```powershell
npm run convert -- "projects/聊天记录导出工具/latest/酒馆助手脚本-聊天记录导出 v6.0.2.json"
npm run help
```

## 模板生成器

```powershell
# 查看可生成类型
npm run new -- --help

# 生成 JS-Slash-Runner 可导入脚本 JSON
npm run new -- js-script 我的脚本

# 生成 SillyTavern 原生扩展目录
npm run new -- st-extension my-extension

# 生成 shujuku 完整模板
npm run new -- shujuku-template 战斗模板

# 生成 SillyTavern Regex 资产
npm run new -- regex 清理标签

# 生成世界书单条目
npm run new -- worldbook-entry 设定条目

# 生成前端状态面板片段
npm run new -- frontend-snippet 状态面板

# 生成 STscript Quick Reply 命令集合
npm run new -- stscript-quick-reply 快捷命令
```

默认输出到 `generated/`，可用 `--out <dir>` 指定目录，用 `--force` 覆盖已有文件。

## 格式校验

```powershell
npm run validate
```

校验内容：

- `examples/**/*.json`、`schemas/**/*.json`、`data/**/*.json` 是否能解析。
- `examples/` 是否符合 `schemas/` 中的格式规则。
- `data/` API 数据库是否符合对应 schema。
- 样例中是否残留正文/作品专名。
- JS-Slash-Runner / SillyTavern Extension / shujuku UI / MVU / Zod / 前端片段 / STscript 是否使用正确入口或安全骨架。

### 转换工具选项

| 选项 | 说明 |
| --- | --- |
| `--out <path>` | 指定输出文件或目录（缺省按方向写入 `projects/聊天记录导出工具/latest/`） |
| `--meta <ref.json>` | JS → JSON 时复用此 JSON 的 metadata（id/name/info/button/data） |
| `--no-overwrite` | 输出文件已存在时报错而非覆盖 |
| `-h`, `--help` | 打印帮助 |

### 行为细则

- **JSON → JS**：`JSON.parse` 后取 `obj.content` 写出为 `.js`，保留全部原始换行与缩进，无任何修改。
- **JS → JSON**：读取 `.js` 全文作为 `content`；metadata 来源按以下优先级选取——
  1. `--meta` 指定的 JSON 文件
  2. `projects/<脚本名>/latest/` 或 `archive/v<X>/` 下与输入文件同版本号的 JSON
  3. 默认模板（`type:"script"` + 新生成的 `randomUUID`，并打印警告）
- 输出 JSON 使用 2 空格缩进，与酒馆助手原生导出格式一致；中文字符以 UTF-8 原样保留。
- **行尾约定**：所有 `.js` / `.json` 输出统一使用 **LF + UTF-8 无 BOM**。项目根目录的编辑器配置已锁定该约定；如需在 Windows 上以 CRLF 查看，请用编辑器临时切换显示，不要直接改写源文件。

### 错误处理

| 场景 | 行为 |
| --- | --- |
| 输入文件不存在 | 退出码 1，提示具体路径 |
| JSON 解析失败 | 退出码 1，附带原始解析错误信息 |
| JSON 缺少 `content` 字段 | 退出码 1 |
| 扩展名既非 `.json` 也非 `.js` | 退出码 2 |
| 输出已存在 + `--no-overwrite` | 退出码 1 |
