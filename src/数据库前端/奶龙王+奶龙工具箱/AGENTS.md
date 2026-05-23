# 奶龙任务总分流规则

本目录下存在两个协作系统。AI 接到任务后必须先判断任务类型，再路由到对应系统。

## 系统清单

| 系统 | 目录 | 职责 |
| --- | --- | --- |
| 奶龙王一键制卡 | `奶龙王一键制卡/` | 角色卡项目级流程：新建卡、修改整张卡、解包、回包、构建、批量修改世界书、发布 |
| 奶龙工具箱 | `奶龙工具箱/` | 单文件级维护：酒馆助手脚本、JS 源码、SillyTavern 资产 JSON、Quick Reply、世界书/单条条目、Regex、Completion Preset/破限、Theme、数据库模板、前端片段、STscript、Tavern Card v3 单文件识别、API Connections、MVU、Zod、API 知识库 |
| 待处理收件箱 | `_inbox/` | 用户临时投放文件的暂存区，AI 读取后判断类型并建议路由 |

两个系统各自拥有独立的 `AGENTS.md`，定义各自的专项规则。  
本文件只负责**任务分流判定**，不覆盖子系统内部规则。

---

## 收件箱规则（`_inbox/`）

当用户将文件放入 `_inbox/` 或要求 AI 处理 `_inbox/` 中的文件时，AI 必须：

1. 读取 `_inbox/` 下所有文件。
2. 逐个判断文件类型（见下方判定表）。
3. 判断任务边界是否明确。
4. 任务边界明确时，按对应系统自动完成移动、处理、解包、回包、构建、创建项目或清理文件。
5. 任务边界不明确时，向用户报告判断结果和建议处理方式，等待明确指令后再执行。

### 文件类型判定表

| 文件特征 | 判定类型 | 默认路由 |
| --- | --- | --- |
| `.png` 且包含 `chara` / `ccv3` 等 Tavern Card 文本元数据 | Tavern Card PNG / 角色卡图片文件 | 识别/提取 JSON → 奶龙工具箱；解包/回包/构建/发布 → 奶龙王一键制卡，先执行 PNG→JSON 再进入角色卡流程 |
| `.json` 且包含 `spec: chara_card_v3` | Tavern Card v3 / 角色卡单文件 | 只识别/审查/小范围字段维护 → 奶龙工具箱；解包/回包/构建/发布 → 奶龙王一键制卡 |
| `.json` 且包含 `character_book` 且用户要求整卡处理 | 整张角色卡 | 奶龙王一键制卡（解包或项目级修改） |
| `.json` 且包含 `qrList` | Quick Reply | 奶龙工具箱 |
| `.json` 且包含 `entries` | SillyTavern 世界书资产 | 奶龙工具箱；若要求批量整卡修改则转奶龙王一键制卡 |
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
| 无法判定 | 未知类型 | 向用户询问用途后再决定 |

### 收件箱行为约束

- 任务边界明确时，按对应系统流程自动完成全部必要步骤。
- 任务边界不明确时，不自动移动、解包、回包、构建、创建项目或删除 `_inbox/` 下的文件。
- 如果 `_inbox/` 中同时存在多个文件，逐个判断；边界明确的逐个处理，边界不明确的逐个报告。

---

## 分流判定流程

AI 每次接到任务时，按以下顺序逐条判定，命中即停：

```text
1. 用户是否明确指定了使用哪个系统？
   是 → 使用用户指定的系统
   否 → 下一步

2. 用户是否要求处理 _inbox/ 中的文件？
   是 → 按收件箱规则读取、判断；边界明确则自动执行，边界不明确则报告后等待明确指令
   否 → 下一步

3. 用户是否要求解包、回包、构建、发布角色卡？
   是 → 奶龙王一键制卡
   否 → 下一步

4. 用户是否要求新建角色卡项目或从零写卡？
   是 → 奶龙王一键制卡
   否 → 下一步

5. 用户是否要求批量修改多个世界书条目、批量处理角色卡资产或修改整卡风格？
   是 → 奶龙王一键制卡
   否 → 下一步

6. 用户是否指定了整个角色卡项目目录或 unpacked 目录？
   是 → 奶龙王一键制卡
   否 → 下一步

7. 用户是否只指定了单个文件？
   是 → 奶龙工具箱；若该单文件任务明确要求解包/回包/构建，则转奶龙王一键制卡
   否 → 下一步

8. 用户是否要求 Tavern Card v3 单文件识别、审查或小范围字段维护？
   是 → 奶龙工具箱
   否 → 下一步

9. 用户是否要求修改酒馆助手脚本、JS 源码、Quick Reply、Regex、预设/破限、Theme、数据库模板、单条世界书、前端片段、STscript、MVU、Zod 或 API Connections？
   是 → 奶龙工具箱
   否 → 下一步

10. 用户是否要求分析、审查、优化某个文件但不涉及整卡流程？
    是 → 奶龙工具箱
    否 → 下一步

11. 以上均不匹配 → 按最小范围处理，默认奶龙工具箱，禁止自动扩大到整卡流程。
```

---

## 分流后的行为约束

### 路由到奶龙王一键制卡时

- 读取 `奶龙王一键制卡/AGENTS.md`。
- 按任务类型读取对应提示词：
  - 写新卡 → `prompts/0-总览与启动.md`
  - 修改已有卡 → `prompts/9-修改卡启动.md`
- 遵循奶龙王的项目结构、修改记录、校验要求。

### 路由到奶龙工具箱时

- 读取 `奶龙工具箱/AGENTS.md`。
- 写代码前按 `docs/TARGET_RUNTIME_MODES.md` 与 `data/capabilities-index.json` 判断 A~L 模式。
- 如涉及脚本修改，按 `docs/SCRIPT_VERSIONING.md` 流程执行。
- 如涉及 API/格式知识库，按奶龙工具箱的同步规则执行。
- 不自动解包、不自动回包、不自动构建角色卡、不自动创建角色卡项目。

---

## 保守原则

当任务边界不明确时：

- 优先按最小范围处理。
- 不自动解包、回包、构建或创建项目。
- 不自动修改 README、current-plan、editable-summary。
- 需要扩大范围时，先说明原因并等待用户确认。

---

## 跨系统协作

当一个任务同时涉及两个系统时（例如：修改酒馆助手脚本后需要回包到角色卡），AI 应：

1. 先说明任务涉及两个系统。
2. 分别列出在每个系统中需要执行的步骤。
3. 等待用户确认后再执行。

---

## 触发关键词速查

### 命中奶龙王一键制卡

```text
解包、回包、构建、发布、新建角色卡、修改整张卡、批量修改世界书、
批量处理角色卡资产、整理项目、生成角色卡、打包、项目结构、unpacked
```

### 命中奶龙工具箱

```text
只改这个文件、单文件任务、不走角色卡流程、Tavern Card v3 单文件识别、
酒馆助手脚本、JS-Slash-Runner、TavernHelper、JS 源码、Quick Reply、快速回复、
世界书单条目、SillyTavern 世界书 JSON、Regex、正则脚本、预设、破限、Completion Preset、
Theme、主题 UI、数据库模板、前端片段、HTML、scoped CSS、STscript、Slash Commands、
API Connections、OpenAI-compatible、Claude、Gemini、OpenRouter、Kobold、Text Completion、
MVU、Zod、分析文件、审查脚本、调试正则
```

---

## 用户覆盖

用户可以随时通过以下方式覆盖分流结果：

- 明确说“使用奶龙王”或“使用奶龙工具箱”。
- 明确说“不走角色卡流程”或“走完整角色卡流程”。
- 明确说“本次是单文件任务”或“本次是项目级任务”。

用户指令优先级高于本分流规则。
