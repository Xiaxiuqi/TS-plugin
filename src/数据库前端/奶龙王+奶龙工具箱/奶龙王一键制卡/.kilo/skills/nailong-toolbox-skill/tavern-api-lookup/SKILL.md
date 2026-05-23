---
name: tavern-api-lookup
description: 酒馆生态 API / 格式速查 Skill。当用户需要查询 JS-Slash-Runner、SillyTavern Extension、shujuku、SillyTavern 资产格式、Regex、Preset、前端片段、STscript、Tavern Card v3 或 API Connections 知识库时触发。MVU / Zod 相关问题也可转交 tavern-mvu-zod。
---

# Tavern API Lookup

## 定位

本 skill 补充奶龙王未专门维护的单文件级酒馆生态 API 与格式知识。

它不替代奶龙王的：

- `docs/图片与前端知识库/`；
- `docs/变量语法/`；
- `docs/建表指导/`；
- `prompts/7-*` 前端制作流程；
- 解包、回包、构建、发布流程。

如果问题只涉及奶龙王整卡流程或项目组件，应优先读取奶龙王已有文档。

## 何时使用

当用户问：

- `SillyTavern.getContext()` 怎么用；
- `window.TavernHelper` 属于什么环境；
- shujuku 的 `window.AutoCardUpdaterAPI` 有哪些接口；
- Quick Reply、Worldbook、Regex、Preset、Theme 的字段含义；
- 前端片段、STscript、API Connections 的格式或兼容性；
- Tavern Card v3 单文件字段边界；
- 某个 API 能不能在当前文件 / 当前环境使用。

## 数据索引

见：

```text
data/api-index.md
```

索引覆盖 JS-Slash-Runner、SillyTavern Extension、shujuku、SillyTavern 资产、世界书单条目、Regex、Preset、前端片段、STscript、Tavern Card v3、API Connections、MVU 与 Zod。

## 输出格式

```text
API / 能力名称：
所属生态：
入口对象 / 文件形态：
用途：
最小用法：
注意事项：
不适用场景：
建议后续调用：
```

## 生态边界

| 生态 | 入口对象 / 关键对象 | 典型用途 |
| --- | --- | --- |
| JS-Slash-Runner | `window.TavernHelper` | 酒馆助手脚本、楼层消息、变量、slash 调用 |
| SillyTavern Extension | `SillyTavern.getContext()` | 原生扩展、事件、弹窗、设置 UI、函数工具 |
| shujuku | `window.AutoCardUpdaterAPI` | 神数据库 / SP·数据库 II 外部调用 |
| SillyTavern 资产 | JSON 字段 | Quick Reply、Worldbook、Regex、Preset、Theme |
| 前端片段 | HTML/CSS snippet | 消息 HTML、状态栏、Regex replaceString HTML |
| STscript | Slash Commands | Quick Reply 命令链、变量命令、发送消息 |
| API Connections | 后端连接配置 | 后端兼容、Function Calling、stop strings、streaming |

MVU / Zod 深入问题请调用 `tavern-mvu-zod`。

## 回答原则

1. 先说明 API 或字段属于哪个生态。
2. 再说明入口对象和适用位置。
3. 给最小示例，不生成整套业务文件。
4. 如果用户实际需求属于奶龙王主流程，提示回到奶龙王 docs / prompts。
5. 如存在生态混用风险，先指出风险。
