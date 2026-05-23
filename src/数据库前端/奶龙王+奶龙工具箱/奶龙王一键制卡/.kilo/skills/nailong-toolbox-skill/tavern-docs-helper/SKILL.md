---
name: tavern-docs-helper
description: 酒馆生态文档速查 Skill。当用户需要理解奶龙王 docs 未覆盖的 JS-Slash-Runner、SillyTavern Extension、SillyTavern 资产、Regex、Preset、前端片段、STscript、Tavern Card v3、API Connections、shujuku、MVU、Zod 等工具箱文档时触发。
---

# Tavern Docs Helper

## 定位

本 skill 将奶龙工具箱的酒馆生态文档转成短结论。

奶龙王已有文档优先：

- 制卡流程看 `prompts/`；
- 建表看 `docs/建表指导/`；
- 变量看 `docs/变量语法/`；
- 图片 / 头像 / 立绘看 `docs/图片与前端知识库/`；
- 人设优化看 `docs/人设优化/`。

只有当问题涉及奶龙王 docs 未覆盖的单文件生态或格式知识时，才使用本 skill。

## 何时使用

当用户问：

- JS-Slash-Runner 和 SillyTavern Extension 有什么区别；
- Quick Reply、Worldbook、Regex、Preset、Theme 的字段规则；
- 世界书单条目与 ST JSON 条目如何映射；
- 前端片段如何 scoped、如何规避 XSS；
- STscript / Slash Commands 如何与 Quick Reply 联动；
- Tavern Card v3 单文件哪些字段需要保留；
- API Connections 后端兼容差异；
- shujuku API 或模板规则是什么；
- MVU 变量框架怎么组织；
- Zod schema 怎么组合。

## 文档索引

见：

```text
docs/docs-index.md
```

## 输出格式

```text
结论：
适用场景：
关键规则：
最小示例：
常见错误：
应回到奶龙王主流程吗：是 / 否
```

## 回答原则

1. 不输出大段文档原文。
2. 优先给结论和边界。
3. 如果用户实际在做奶龙王标准组件或整卡流程，提示回到对应奶龙王 prompt / doc。
4. 如果涉及单文件生态，给最小示例和注意事项。
5. Tavern Card v3 单文件只做识别/审查；解包、回包、构建、发布回奶龙王。
